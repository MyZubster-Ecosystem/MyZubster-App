// Collection coordinator for the waste-collection drone kit.
// Pure control logic over a 1 kg payload ceiling: scheme-safe dispatch
// drives a tiny state machine (IDLE -> APPROACHING -> COLLECTING -> LOADED),
// so it can be unit-tested without any actuator hardware.

export const MAX_PAYLOAD_KG = 1.0;
export const COLLECTOR_STATES = ['IDLE', 'APPROACHING', 'COLLECTING', 'LOADED'];

// True when a scaled payload is within the safe load window.
export function isPayloadAcceptable(scaleReadingKg, max = MAX_PAYLOAD_KG) {
  const kg = Number(scaleReadingKg);
  if (!Number.isFinite(kg) || kg < 0) return false;
  return kg <= max && kg >= 0;
}

// Remaining capacity given an already-loaded mass.
export function remainingCapacityKg(loadedKg, max = MAX_PAYLOAD_KG) {
  return Math.max(0, max - Math.max(0, Number(loadedKg)));
}

// Geometry of the grab: the scoop approaches from above and needs to clear
// the target width with a safety margin. Returns the required arm opening.
export function planScoopAngle(detectedWidthM, droneArmLengthM, margin = 0.1) {
  const w = Number(detectedWidthM);
  const arm = Number(droneArmLengthM);
  if (w <= 0 || arm <= 0) return { openM: 0, angleRad: 0, feasible: false };
  const openM = w + margin;
  // half-opening / arm ratio -> half angle, capped at 90 degrees.
  const ratio = Math.min(1, openM / 2 / arm);
  const angleRad = Math.asin(ratio);
  return { openM, angleRad, feasible: ratio < 1 };
}

// One collector state transition. `reading` is a { scaleKg, detection } from
// the sensor layer. `hooks` are optional side-effect callbacks (kept here so
// the pure transition is spyable/tests deterministic); nothing is executed
// for real in this mock path.
export function stepCollector(state, reading, hooks = {}) {
  const payload = Number(reading?.scaleKg ?? 0);
  const detection = reading?.detection ?? null;
  const next = { ...state };
  switch (state.name) {
    case 'IDLE':
      if (detection) { next.name = 'APPROACHING'; next.target = detection; hooks.onApproach?.(next); }
      break;
    case 'APPROACHING':
      if (detection && Number(detection.distanceM) <= 0.4) {
        // Gripper closes: register the first weighed mass of the capture.
        const safe = Number.isFinite(payload) && payload >= 0 && payload <= MAX_PAYLOAD_KG ? payload : 0;
        next.accumulatedKg = (state.accumulatedKg || 0) + safe;
        if (next.accumulatedKg >= MAX_PAYLOAD_KG) { next.name = 'LOADED'; next.accumulatedKg = MAX_PAYLOAD_KG; hooks.onLoaded?.(next); }
        else { next.name = 'COLLECTING'; hooks.onGrab?.(next); }
      } else if (!detection) { next.name = 'IDLE'; next.target = null; }
      break;
    case 'COLLECTING': {
      if (!Number.isFinite(payload) || payload < 0 || payload > MAX_PAYLOAD_KG) {
        next.name = 'IDLE'; next.target = null; hooks.onAbort?.(next); break;
      }
      next.accumulatedKg = (state.accumulatedKg || 0) + payload;
      if (next.accumulatedKg >= MAX_PAYLOAD_KG) {
        next.name = 'LOADED'; next.accumulatedKg = MAX_PAYLOAD_KG; hooks.onLoaded?.(next);
      } else { hooks.onCollect?.(next); }
      break;
    }
    case 'LOADED':
      // Remain loaded until the mission runner directs a return/release.
      break;
    default:
      next.name = 'IDLE';
  }
  return next;
}

export function createCollector(initial = { name: 'IDLE', accumulatedKg: 0, target: null }) {
  let state = { name: initial.name || 'IDLE', accumulatedKg: initial.accumulatedKg || 0, target: initial.target || null };
  return {
    getState() { return { ...state }; },
    transition(reading, hooks) { const n = stepCollector(state, reading, hooks); state = n; return n; },
    reset() { state = { name: 'IDLE', accumulatedKg: 0, target: null }; return state; },
    isLoaded() { return state.name === 'LOADED' || state.accumulatedKg >= MAX_PAYLOAD_KG; },
    remaining: () => remainingCapacityKg(state.accumulatedKg),
  };
}
