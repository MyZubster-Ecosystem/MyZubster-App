// Detection post-processing for the YOLOv8s waste-detection stream.
// Pure helpers (NMS, class mapping, distance estimation, target selection)
// that operate on already-decoded detections, so they are unit-testable
// without an inference runtime.

// Standard wastes classes used by the on-device model.
export const WASTE_CLASSES = [
  'plastic', 'glass', 'metal', 'organic', 'paper', 'e-waste',
];

export const DEFAULT_CLASS_MAP = {
  0: 'plastic', 1: 'glass', 2: 'metal', 3: 'organic', 4: 'paper', 5: 'e-waste',
};

// Intersection-over-union between two axis-aligned boxes {x1,y1,x2,y2}.
export function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const uni = areaA + areaB - inter;
  return uni <= 0 ? 0 : inter / uni;
}

// Non-maximum suppression. Detections with score < confThreshold are dropped;
// overlapping detections above iouThreshold are suppressed by score. Stable.
export function nms(detections = [], { confThreshold = 0.4, iouThreshold = 0.45 } = {}) {
  const kept = detections.filter((d) => Number(d.score ?? d.confidence ?? 0) >= confThreshold);
  kept.sort((p, q) => (Number(q.score ?? q.confidence ?? 0)) - (Number(p.score ?? p.confidence ?? 0)));
  const out = [];
  for (const d of kept) {
    if (out.some((o) => iou(o.bbox || o, d.bbox || d) > iouThreshold)) continue;
    out.push(d);
  }
  return out;
}

// Attach human-readable labels via a configurable class map.
export function mapClassIds(detections = [], classMap = DEFAULT_CLASS_MAP) {
  return detections.map((d) => ({
    ...d,
    label: d.label || classMap[d.classId] || 'unknown',
  }));
}

// Pinhole distance estimate from the detected box height, a known target
// height in metres and the focal length in pixels -> distance in metres.
export function estimateDistance(bboxHeightPx, knownHeightM, focalLengthPx) {
  const h = Number(bboxHeightPx);
  const kh = Number(knownHeightM);
  const f = Number(focalLengthPx);
  if (h <= 0 || kh <= 0 || f <= 0) return 0;
  return (kh * f) / h;
}

// Pick the primary target: nearest (smallest estimated distance) among the
// post-NMS, label-mapped detections falling inside the geofence radius.
export function selectPrimaryTarget(detections = [], { maxDistanceM = Infinity } = {}) {
  const viable = detections
    .filter((d) => Number(d.distanceM ?? 0) > 0 && Number(d.distanceM) <= maxDistanceM);
  if (!viable.length) return null;
  viable.sort((a, b) => Number(a.distanceM) - Number(b.distanceM));
  return viable[0];
}
