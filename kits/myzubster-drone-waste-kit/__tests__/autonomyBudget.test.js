import { estimateFlightTimeMin, planFlightMinutes, usableBudgetMin, canCompleteMission, rechargeHours, powerSummary, FLIGHT_BUDGET_MIN } from '../power/autonomyBudget';

describe('autonomyBudget', () => {
  test('estimateFlightTimeMin converts Wh/drawW to minutes', () => {
    expect(estimateFlightTimeMin({ batteryWh: 26.6, drawW: 60 })).toBeCloseTo(26.6, 0);
  });
  test('planFlightMinutes scales with distance', () => {
    expect(planFlightMinutes(5, 18)).toBeCloseTo(16.666, 1);
    expect(planFlightMinutes(0, 18)).toBe(0);
  });
  test('usableBudgetMin reserves 15% for return', () => {
    expect(usableBudgetMin(30)).toBeCloseTo(25.5, 1);
  });
  test('canCompleteMission true inside budget, false outside', () => {
    expect(canCompleteMission(5, { budgetMin: 30, cruiseSpeedKmh: 18 })).toBe(true);
    expect(canCompleteMission(50, { budgetMin: 30, cruiseSpeedKmh: 18 })).toBe(false);
  });
  test('rechargeHours = energy / (solar * efficiency)', () => {
    expect(rechargeHours({ targetWh: 26.6, solarW: 12, efficiency: 0.85 })).toBeGreaterThan(2.5);
    expect(rechargeHours({ targetWh: 26.6, solarW: 0 })).toBe(Infinity);
  });
  test('powerSummary reports margin when a plan fits', () => {
    const s = powerSummary({ distanceKm: 4, budgetMin: 30, cruiseSpeedKmh: 18 });
    expect(s.fitsBudget).toBe(true);
    expect(s.marginMin).toBeGreaterThan(0);
    expect(s.rechargeHours).toBeGreaterThan(0);
  });
});
