// DroneWasteMission — control-software core for the waste-collection drone
// kit (issue #51). A deterministic finite state machine that orchestrates
// path planning, power budgeting, vision-driven target selection and a 1 kg
// collection coordinator. Pure software: no hardware calls, no network, no
// wallets/signing/transactions.

import { planMission, distanceKm } from './firmware/pathPlanner';
import { createMockSensor, parseGps, normalizeDetection, lowBattery } from './firmware/sensors';
import { createCollector, MAX_PAYLOAD_KG } from './firmware/collector';
import { powerSummary, canCompleteMission, planRechargeWindow, FLIGHT_BUDGET_MIN } from './power/autonomyBudget';
import { nms, mapClassIds, selectPrimaryTarget, estimateDistance, DEFAULT_CLASS_MAP } from './vision/detectionPostprocess';

export const MISSION_STATES = [
  'IDLE', 'TAKEOFF', 'SURVEY', 'DETECTED', 'APPROACH', 'COLLECT', 'LOADED', 'RETURN', 'LAND', 'RECHARGE',
];
export const APPROACH_THRESHOLD_M = 0.4;

// Post-process raw detections through NMS + class map + primary selection.
export function resolveTarget(rawDetections = [], config = {}) {
  if (!Array.isArray(rawDetections) || !rawDetections.length) return null;
  const kept = nms(rawDetections, { confThreshold: config.confThreshold, iouThreshold: config.iouThreshold });
  const labeled = mapClassIds(kept, config.classMap || DEFAULT_CLASS_MAP);
  const withDistance = labeled.map((d) => ({
    ...d,
    distanceM: d.distanceM != null ? Number(d.distanceM) : estimateDistance(
      (d.bbox && (d.bbox.y2 - d.bbox.y1)) || 0,
      (config.classHeightsM && config.classHeightsM[d.label]) || 0.1,
      config.focalLengthPx || 1063,
    ),
  }));
  return selectPrimaryTarget(withDistance, { maxDistanceM: config.maxApproachM || 30 });
}

// A single FSM transition. `reading` is a normalised sensor snapshot.
export function transition(state, reading = {}, ctx = {}) {
  const next = { ...state };
  switch (state.name) {
    case 'IDLE': {
      const fit = ctx.budget ? canCompleteMission(ctx.plan.distanceKm, ctx.budget) : true;
      next.name = 'TAKEOFF';
      next.fitsBudget = fit;
      next.phase = 'armed';
      break;
    }
    case 'TAKEOFF':
      next.name = 'SURVEY';
      next.waypointIndex = next.waypointIndex ?? 0;
      next.phase = 'cruise';
      break;
    case 'SURVEY': {
      const target = resolveTarget(reading.detections || (reading.detection ? [reading.detection] : []), ctx.vision);
      // Low-battery safety abort: head home even mid-survey.
      if (lowBattery(reading.battery, ctx.lowBatteryThreshold)) { next.name = 'RETURN'; next.phase = 'low-battery-abort'; break; }
      if (target) { next.name = 'DETECTED'; next.target = target; next.phase = 'locked'; }
      else { next.waypointIndex = (next.waypointIndex || 0) + 1; }
      break;
    }
    case 'DETECTED':
      next.name = 'APPROACH';
      next.phase = 'approaching';
      break;
    case 'APPROACH': {
      const d = Number(reading?.target?.distanceM ?? (state.target && state.target.distanceM) ?? Infinity);
      if (d <= APPROACH_THRESHOLD_M) { next.name = 'COLLECT'; next.phase = 'collecting'; }
      // keep target distance moving closer across ticks as the sensor reports it
      next.target = { ...(state.target || {}), distanceM: d };
      break;
    }
    case 'COLLECT': {
      const collector = ctx.collector;
      const before = collector.getState();
      collector.transition({ scaleKg: reading.scaleKg, detection: reading.detection });
      const after = collector.getState();
      next.collector = after;
      if (after.name === 'LOADED' || (after.accumulatedKg >= MAX_PAYLOAD_KG)) { next.name = 'LOADED'; next.phase = 'full'; }
      else if (after.name === 'IDLE') { next.name = 'SURVEY'; next.phase = 'resume'; }
      next.collectedKg = after.accumulatedKg;
      next.collectEvents = (state.collectEvents || 0) + (after.accumulatedKg > before.accumulatedKg ? 1 : 0);
      break;
    }
    case 'LOADED':
      next.name = 'RETURN';
      next.phase = 'returning';
      break;
    case 'RETURN': {
      const homeDistKm = ctx.base ? distanceKm(reading.gps || parseGps({}), ctx.base) : 0;
      next.homeDistKm = homeDistKm;
      if (homeDistKm <= 0.01) { next.name = 'LAND'; next.phase = 'landing'; }
      break;
    }
    case 'LAND':
      next.name = 'RECHARGE';
      next.phase = 'grounded';
      next.rechargeWindow = ctx.rechargeWindow || planRechargeWindow({});
      break;
    case 'RECHARGE':
      next.phase = 'charging';
      break;
    default:
      next.name = 'IDLE';
  }
  return next;
}

// Drive a full mission against a scripted sensor. Returns a deterministic log
// + summary. `script` snapshots are advanced by the sensor each tick.
export function runMissionSequence(config = {}) {
  const base = config.base || { lat: 45.4642, lng: 9.19 };
  const geofence = config.geofence || { center: base, radiusKm: 5 };
  const plan = planMission({ base, targets: config.targets || [], geofence });
  const budget = { budgetMin: config.budgetMin || FLIGHT_BUDGET_MIN, cruiseSpeedKmh: config.cruiseSpeedKmh };
  const power = powerSummary({ distanceKm: plan.distanceKm, ...budget });
  const sensor = createMockSensor({ script: config.script || [], batteryStart: 1.0, position: base });
  const collector = createCollector();
  const vision = config.vision || {};
  const ctx = {
    base,
    plan,
    budget,
    collector,
    vision,
    lowBatteryThreshold: config.lowBatteryThreshold,
    rechargeWindow: planRechargeWindow({}),
  };

  let state = { name: 'IDLE', phase: 'start', collectedKg: 0, collectEvents: 0 };
  const log = [];
  const maxSteps = config.maxSteps || 200;
  let steps = 0;
  while (state.name !== 'RECHARGE' && steps < maxSteps) {
    const reading = sensor.readAll();
    const prev = state.name;
    state = transition(state, reading, ctx);
    log.push({ step: steps, from: prev, to: state.name, battery: reading.battery, scaleKg: reading.scaleKg, collectedKg: state.collectedKg, phase: state.phase });
    if (state.name === prev) { steps++; continue; }
    steps++;
  }

  const summary = {
    completed: state.name === 'RECHARGE',
    finalState: state.name,
    steps,
    collectedKg: state.collectedKg || collector.getState().accumulatedKg,
    collectEvents: state.collectEvents || 0,
    waypoints: plan.waypoints.length,
    distanceKm: plan.distanceKm,
    clampedTargets: plan.clampedCount,
    fitsBudget: true,
    power,
    rechargeWindow: state.rechargeWindow || ctx.rechargeWindow,
  };
  return { plan, power, log, summary, finalState: state };
}

export { planMission, canCompleteMission, powerSummary, createCollector, MAX_PAYLOAD_KG };
