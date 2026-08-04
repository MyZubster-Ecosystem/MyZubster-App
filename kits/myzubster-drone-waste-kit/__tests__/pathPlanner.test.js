import { distanceKm, withinGeofence, orderNearestFirst, tourLengthKm, clampToGeofence, planMission } from '../firmware/pathPlanner';

describe('pathPlanner geometry', () => {
  test('distance between identical points is zero', () => {
    expect(distanceKm({ lat: 45.46, lng: 9.19 }, { lat: 45.46, lng: 9.19 })).toBe(0);
  });
  test('Rome to Milan is roughly 470-480 km', () => {
    const d = distanceKm({ lat: 41.9028, lng: 12.4964 }, { lat: 45.4642, lng: 9.19 });
    expect(d).toBeGreaterThan(470);
    expect(d).toBeLessThan(480);
  });
  test('withinGeofence true inside, false outside', () => {
    const gf = { center: { lat: 45.46, lng: 9.19 }, radiusKm: 5 };
    expect(withinGeofence({ lat: 45.46, lng: 9.19 }, gf)).toBe(true);
    expect(withinGeofence({ lat: 45.7, lng: 9.6 }, gf)).toBe(false);
  });
  test('nearest-first is deterministic and tie-stable', () => {
    const base = { lat: 45.46, lng: 9.19 };
    const targets = [
      { lat: 45.50, lng: 9.22 },
      { lat: 45.47, lng: 9.20 },
    ];
    const out = orderNearestFirst(base, targets);
    expect(out[0]).toEqual(targets[1]); // 9.20,9.22 closer first
    expect(orderNearestFirst(base, targets)).toEqual(out); // stable
  });
  test('tourLengthKm is base+targets+base', () => {
    const base = { lat: 45.46, lng: 9.19 };
    expect(tourLengthKm(base, [])).toBe(0);
    const len = tourLengthKm(base, [{ lat: 45.47, lng: 9.20 }]);
    expect(len).toBeGreaterThan(0);
  });
  test('clampToGeofence projects an out-of-bound point onto the boundary', () => {
    const gf = { center: { lat: 45.46, lng: 9.19 }, radiusKm: 5 };
    const far = { lat: 46.0, lng: 10.0 };
    const clamped = clampToGeofence(far, gf);
    expect(withinGeofence(clamped, gf)).toBe(true);
    expect(Math.abs(distanceKm(clamped, gf.center) - 5)).toBeLessThan(0.01);
  });
  test('planMission clamps out-of-geofence targets and flags them', () => {
    const gf = { center: { lat: 45.46, lng: 9.19 }, radiusKm: 5 };
    const plan = planMission({ base: gf.center, targets: [{ lat: 46.0, lng: 10.0 }], geofence: gf });
    expect(plan.clampedCount).toBe(1);
    expect(plan.waypoints[0].clamped).toBe(true);
    expect(plan.distanceKm).toBeGreaterThan(0);
  });
});
