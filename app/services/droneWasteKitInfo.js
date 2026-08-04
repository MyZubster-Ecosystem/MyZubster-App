// Static descriptor for the waste-collection drone kit (issue #51). Kept in a
// tiny standalone module so the service and the screen can both import it and
// the unit tests stay free of React Native / hardware dependencies.
export const DRONE_KIT_INFO = {
  name: 'myzubster-drone-waste-kit',
  issue: 51,
  maxPayloadKg: 1.0,
  flightBudgetMin: 30,
  geofenceRadiusKm: 5,
  recharge: 'solar',
  visionModel: 'yolov8s-waste-detect',
};
