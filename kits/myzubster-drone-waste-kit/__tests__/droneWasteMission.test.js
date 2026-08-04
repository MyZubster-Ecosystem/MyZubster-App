import { runMissionSequence, resolveTarget, transition, MISSION_STATES } from '../index';

const BASE = { lat: 45.4642, lng: 9.19 };

describe('DroneWasteMission orchestrator', () => {
  test('MISSION_STATES follows the documented lifecycle', () => {
    expect(MISSION_STATES[0]).toBe('IDLE');
    expect(MISSION_STATES).toContain('RECHARGE');
  });
  test('resolveTarget maps a single detection to its nearest target', () => {
    const t = resolveTarget([{ score: 0.9, label: 'plastic', distanceM: 0.3 }]);
    expect(t).toBeTruthy();
    expect(t.label).toBe('plastic');
  });
  test('transition advances IDLE -> TAKEOFF', () => {
    const next = transition({ name: 'IDLE' }, {}, { plan: { distanceKm: 1 }, budget: { budgetMin: 30, cruiseSpeedKmh: 18 } });
    expect(next.name).toBe('TAKEOFF');
  });
  test('runMissionSequence completes a detect->collect->return->recharge cycle', () => {
    const script = [
      { battery: 0.95, lidarM: 2, detection: null },
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
    const result = runMissionSequence({
      base: BASE,
      geofence: { center: BASE, radiusKm: 5 },
      targets: [{ lat: 45.465, lng: 9.195 }],
      script,
    });
    expect(result.summary.completed).toBe(true);
    expect(result.summary.finalState).toBe('RECHARGE');
    expect(result.summary.collectedKg).toBeCloseTo(1.0, 3);
    expect(result.summary.collectEvents).toBeGreaterThanOrEqual(1);
    expect(result.summary.waypoints).toBe(1);
    expect(result.summary.distanceKm).toBeGreaterThan(0);
    // Mission path traversed the key phases.
    const names = result.log.map((e) => e.to);
    expect(names).toContain('COLLECT');
    expect(names).toContain('RETURN');
    expect(names).toContain('RECHARGE');
  });
});
