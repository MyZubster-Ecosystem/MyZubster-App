// Mocked sensor abstraction for the waste-collection drone kit.
// No hardware: readings come from a scripted sequence so the mission
// simulator and unit tests are fully deterministic. Replace the getters
// with real driver calls when wiring onto a Jetson Nano / flight controller.

// A normalised GPS reading.
export function parseGps(raw = {}) {
  return {
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    alt: Number(raw.alt ?? 0),
    fix: raw.fix === true || raw.fix === '3d' ? '3d' : raw.fix === '2d' ? '2d' : 'none',
  };
}

// Build a deterministic scripted sensor. `script` is an array of snapshots:
// { battery: 0..1, gps, lidarM, scaleKg, detection }. `read()` advances and
// replays the last snapshot when the script is exhausted (steady-state sims).
export function createMockSensor({ script = [], batteryStart = 1.0, position } = {}) {
  let idx = 0;
  let battery = batteryStart;
  const at = () => Math.min(script.length - 1, Math.max(0, idx));
  const snap = () => {
    if (!script.length) return { battery, gps: position, lidarM: 0, scaleKg: 0, detection: null };
    const s = script[at()];
    idx += 1;
    return s;
  };
  return {
    readBattery() { return snap().battery ?? battery; },
    readPosition() { const s = snap(); return parseGps(s.gps ?? position); },
    readLidar() { return Number(snap().lidarM ?? 0); },
    readScale() { return Number(snap().scaleKg ?? 0); },
    readDetection() { return snap().detection ?? null; },
    readAll() {
      const s = snap();
      return {
        battery: s.battery ?? battery,
        gps: parseGps(s.gps ?? position),
        lidarM: Number(s.lidarM ?? 0),
        scaleKg: Number(s.scaleKg ?? 0),
        detection: s.detection ?? null,
      };
    },
    progress() { return Math.min(1, idx / Math.max(1, script.length)); },
  };
}

// Battery bookkeeping helpers shared by the planner and the power budget.
export function batteryPct({ batteryWh, capacityWh }) {
  if (!capacityWh) return 0;
  return Math.min(1, Math.max(0, batteryWh / capacityWh));
}

export function lowBattery(value, threshold = 0.2) {
  return Number(value) <= threshold;
}

// Map a detection snapshot to a normalised target descriptor.
export function normalizeDetection(det = {}) {
  if (!det) return null;
  return {
    label: String(det.label || det.class || 'unknown'),
    confidence: Number(det.confidence ?? det.score ?? 0),
    widthM: Number(det.widthM ?? det.width_m ?? 0),
    distanceM: Number(det.distanceM ?? det.distance_m ?? 0),
    bbox: det.bbox || null,
  };
}
