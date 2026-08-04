// Geometric path planning for the waste-collection drone kit.
// Pure functions, no I/O, no hardware, no randomness: results are
// deterministic so the mission simulator and unit tests stay reproducible.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Haversine great-circle distance in kilometres between two {lat,lng} points.
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

// True when a point lies inside a circular geofence {center:{lat,lng}, radiusKm}.
export function withinGeofence(point, geofence = {}) {
  if (!geofence || !geofence.center) return true;
  return distanceKm(point, geofence.center) <= geofence.radiusKm;
}

// Greedy nearest-first ordering starting from `base`. Deterministic:
// ties (equal distance) resolve to original index order for stability.
export function orderNearestFirst(base, targets = []) {
  const remaining = targets.map((t, i) => ({ t, i }));
  const ordered = [];
  let cursor = base;
  while (remaining.length) {
    remaining.sort((p, q) => {
      const dp = distanceKm(cursor, p.t);
      const dq = distanceKm(cursor, q.t);
      if (Math.abs(dp - dq) < 1e-9) return p.i - q.i;
      return dp - dq;
    });
    const next = remaining.shift();
    ordered.push(next.t);
    cursor = next.t;
  }
  return ordered;
}

// Total outbound length of a closed tour base -> [p0..pn] -> base, in km.
export function tourLengthKm(base, ordered = []) {
  if (!ordered.length) return 0;
  let total = distanceKm(base, ordered[0]);
  for (let i = 1; i < ordered.length; i++) total += distanceKm(ordered[i - 1], ordered[i]);
  total += distanceKm(ordered[ordered.length - 1], base);
  return total;
}

// Initial bearing (radians) from a to b along the great circle.
export function bearingRad(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

// Destination point reached by travelling radiusKm from center along a bearing.
export function destinationPoint(center, bearingRadVal, radiusKm) {
  const d = radiusKm / EARTH_RADIUS_KM;
  const lat1 = toRad(center.lat);
  const lng1 = toRad(center.lng);
  const sinDLat = Math.sin(d);
  const cosDLat = Math.cos(d);
  const lat2 = Math.asin(Math.sin(lat1) * cosDLat + Math.cos(lat1) * sinDLat * Math.cos(bearingRadVal));
  const lng2 = lng1 + Math.atan2(Math.sin(bearingRadVal) * sinDLat * Math.cos(lat1), cosDLat - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

// Clamp a point onto the geofence boundary along its great-circle bearing,
// so the returned point sits exactly radiusKm from the geofence centre.
export function clampToGeofence(point, geofence = {}) {
  if (withinGeofence(point, geofence)) return point;
  const { center, radiusKm } = geofence;
  return destinationPoint(center, bearingRad(center, point), radiusKm);
}

// Build a mission plan: an ordered, geofence-safe waypoint list with a
// distance estimate. Out-of-geofence targets are clamped to the boundary
// (and flagged `clamped: true`) rather than silently dropped.
export function planMission({ base, targets = [], geofence = null, maxWaypoints = 64 } = {}) {
  if (!base) throw new Error('planMission: base is required');
  const safe = (targets || [])
    .slice(0, maxWaypoints)
    .map((t) => {
      const clamped = !withinGeofence(t, geofence);
      return { point: clamped ? clampToGeofence(t, geofence) : t, original: t, clamped };
    });
  const ordered = orderNearestFirst(base, safe.map((s, i) => ({ ...s.point, _i: i })));
  const waypoints = ordered.map((o) => {
    const src = safe[o._i];
    return { lat: o.lat, lng: o.lng, clamped: src.clamped, original: src.original };
  });
  return {
    base,
    waypoints,
    distanceKm: tourLengthKm(base, waypoints),
    clampedCount: waypoints.filter((w) => w.clamped).length,
  };
}
