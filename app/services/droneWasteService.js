// Bridge service that exposes the drone-waste-collection kit (issue #51) to
// the MyZubster-App UI layer. Pure logic only: it re-exports kit helpers and
// adds thin, mock-friendly wrappers. No network, no hardware, no wallets.
import {
  runMissionSequence,
  planMission,
  powerSummary,
  MISSION_STATES,
} from '../../kits/myzubster-drone-waste-kit';
import { DRONE_KIT_INFO } from '../services/droneWasteKitInfo';
import { DEFAULT_INFERENCE_SPEC, INFERENCE_TARGET } from '../../kits/myzubster-drone-waste-kit/vision/inferenceSpec';

// Static kit info mirrored from the spec, for the dashboard/screen.
export { DRONE_KIT_INFO };

export const DRONE_INFERENCE = {
  target: INFERENCE_TARGET,
  spec: DEFAULT_INFERENCE_SPEC,
  states: MISSION_STATES,
};

// Read-only status payload for the DroneKit screen.
export function getDroneKitStatus() {
  return {
    info: DRONE_KIT_INFO,
    inference: DRONE_INFERENCE,
  };
}

// Plan a geofence-safe waypoint route for a given set of targets.
export function planDroneRoute({ base, targets = [], geofence } = {}) {
  return planMission({ base, targets, geofence });
}

// Power summary for a planned tour distance.
export function estimateDronePower({ distanceKm, budgetMin, cruiseSpeedKmh } = {}) {
  return powerSummary({ distanceKm, budgetMin, cruiseSpeedKmh });
}

// Run the deterministic mission simulation (detect -> approach -> collect
// up to 1 kg -> return -> recharge) against a scripted sensor and return a
// UI-friendly summary plus a trimmed event log.
export function runDroneMissionSimulation(config = {}) {
  const result = runMissionSequence(config);
  return {
    summary: result.summary,
    plan: { waypoints: result.plan.waypoints.length, distanceKm: result.plan.distanceKm, clampedCount: result.plan.clampedCount },
    log: result.log.map((e) => ({ from: e.from, to: e.to, battery: e.battery, collectedKg: e.collectedKg })),
  };
}
