import {
  getDroneKitStatus,
  planDroneRoute,
  estimateDronePower,
  runDroneMissionSimulation,
} from '../services/droneWasteService';

const BASE = { lat: 45.4642, lng: 9.19 };

describe('droneWasteService bridge', () => {
  test('getDroneKitStatus exposes kit info and mission states', () => {
    const s = getDroneKitStatus();
    expect(s.info.maxPayloadKg).toBe(1.0);
    expect(s.info.flightBudgetMin).toBe(30);
    expect(s.info.geofenceRadiusKm).toBe(5);
    expect(s.inference.states).toContain('RECHARGE');
    expect(s.inference.target.board).toMatch(/Jetson/);
  });

  test('planDroneRoute plans a geofence-safe route', () => {
    const plan = planDroneRoute({ base: BASE, targets: [{ lat: 45.465, lng: 9.195 }], geofence: { center: BASE, radiusKm: 5 } });
    expect(plan.waypoints.length).toBe(1);
    expect(plan.distanceKm).toBeGreaterThan(0);
  });

  test('estimateDronePower reports a budget summary', () => {
    const p = estimateDronePower({ distanceKm: 3, budgetMin: 30, cruiseSpeedKmh: 18 });
    expect(p.fitsBudget).toBe(true);
    expect(p.marginMin).toBeGreaterThan(0);
  });

  test('runDroneMissionSimulation completes a collect cycle', () => {
    const script = [
      { battery: 0.95, detection: null },
      { battery: 0.92, detection: null },
      { battery: 0.9, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
      { battery: 0.88, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
      { battery: 0.86, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
      { battery: 0.84, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0 },
      { battery: 0.82, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0.5 },
      { battery: 0.8, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0.6 },
      { battery: 0.78, detection: null },
      { battery: 0.76, gps: BASE },
      { battery: 0.74, detection: null },
    ];
    const out = runDroneMissionSimulation({ base: BASE, geofence: { center: BASE, radiusKm: 5 }, targets: [{ lat: 45.465, lng: 9.195 }], script });
    expect(out.summary.completed).toBe(true);
    expect(out.summary.finalState).toBe('RECHARGE');
    expect(out.summary.collectedKg).toBeCloseTo(1.0, 3);
    expect(out.log.some((e) => e.to === 'COLLECT')).toBe(true);
  });
});
