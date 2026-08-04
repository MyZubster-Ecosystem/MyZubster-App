// Power and autonomy budget for the waste-collection drone kit.
// Issue #51 spec: 30 minute flight budget, 5 km operating radius, solar
// recharge. All pure math so the planner and unit tests are deterministic.

export const FLIGHT_BUDGET_MIN = 30;
export const GEOFENCE_RADIUS_KM = 5;
export const SOLAR_RECHARGE_W = 12; // small panel, conservative
export const BATTERY_CAPACITY_WH = 26.6; // ~ 4S 1800mAh LiPo class
export const CRUISE_DRAW_W = 60;
export const CRUISE_SPEED_KMH = 18; // moderate mapping cruise speed

// Expected flight time (minutes) for a battery whose Wh is x% of capacity.
export function estimateFlightTimeMin({ batteryWh = BATTERY_CAPACITY_WH, drawW = CRUISE_DRAW_W } = {}) {
  if (drawW <= 0) return 0;
  const hours = batteryWh / drawW;
  return hours * 60;
}

// Time required to fly a plan of `distanceKm` at `cruiseSpeedKmh` (minutes),
// including return leg already counted inside tourLengthKm.
export function planFlightMinutes(distanceKm, cruiseSpeedKmh = CRUISE_SPEED_KMH) {
  if (cruiseSpeedKmh <= 0) return Infinity;
  return (Number(distanceKm) / cruiseSpeedKmh) * 60;
}

// Reserve policy: keep 15% battery for safe return. Effective usable budget.
export const RETURN_RESERVE = 0.15;

export function usableBudgetMin(budgetMin = FLIGHT_BUDGET_MIN, reserve = RETURN_RESERVE) {
  return budgetMin * (1 - reserve);
}

// True when the planned flight fits inside the usable budget window.
export function canCompleteMission(distanceKm, { budgetMin = FLIGHT_BUDGET_MIN, cruiseSpeedKmh = CRUISE_SPEED_KMH, reserve = RETURN_RESERVE } = {}) {
  const usable = usableBudgetMin(budgetMin, reserve);
  const needed = planFlightMinutes(distanceKm, cruiseSpeedKmh);
  return Number.isFinite(needed) && needed <= usable;
}

// Hours of solar recharge to restore `targetWh` at `solarW` of input.
export function rechargeHours({ targetWh = BATTERY_CAPACITY_WH, solarW = SOLAR_RECHARGE_W, efficiency = 0.85 } = {}) {
  if (solarW <= 0 || targetWh <= 0) return Infinity;
  return targetWh / (solarW * efficiency);
}

// Build a per-mission power summary used by the planner and the screen.
export function powerSummary({ distanceKm, budgetMin = FLIGHT_BUDGET_MIN, cruiseSpeedKmh = CRUISE_SPEED_KMH } = {}) {
  const flightMin = planFlightMinutes(distanceKm, cruiseSpeedKmh);
  const fits = canCompleteMission(distanceKm, { budgetMin, cruiseSpeedKmh });
  const usable = usableBudgetMin(budgetMin);
  return {
    flightMin,
    usableBudgetMin: usable,
    reserveMin: budgetMin - usable,
    fitsBudget: fits,
    rechargeHours: rechargeHours({}),
    marginMin: fits ? usable - flightMin : 0,
  };
}

// Pick the next solar recharge window descriptor (pure: returns the planned
// duration only; real scheduling would align to local sunrise/sunset).
export function planRechargeWindow({ targetWh = BATTERY_CAPACITY_WH, solarW = SOLAR_RECHARGE_W } = {}) {
  const hours = rechargeHours({ targetWh, solarW });
  return { rechargeHours: hours, source: 'solar', targetWh, solarW };
}
