# Operation guide — Drone Waste-Collection Kit (EN)

This guide covers running the control software and the demo mission for the
waste-collection drone kit (issue #51). The kit is the software layer; the
physical prototype and real field tests are performed separately by the
integrator.

## Mission lifecycle

The `DroneWasteMission` state machine in `index.js` drives the lifecycle:

IDLE -> TAKEOFF -> SURVEY -> DETECTED -> APPROACH -> COLLECT -> LOADED
-> RETURN -> LAND -> RECHARGE

- **SURVEY** scans waypoints; YOLOv8s detections are post-processed (NMS,
  class map, pinhole distance) and the nearest viable target is selected.
- **APPROACH** closes in; once the target is within the approach threshold,
  the collector grabs.
- **COLLECT** weighs the capture (1 kg ceiling). Reaching the ceiling moves
  to **LOADED**.
- **RETURN** flies to base; on arrival it lands and plans a solar recharge.
- A low battery mid-survey aborts to **RETURN**.

## Running the demo

From the app, open the **DroneKit** screen and tap "Run demo mission". The
screen calls `runDroneMissionSimulation` with a scripted sensor that walks the
full lifecycle and reports collected mass, distance and the final state.

In code:

```js
import { runMissionSequence } from './index';

const result = runMissionSequence({
  base: { lat: 45.4642, lng: 9.19 },
  geofence: { center: { lat: 45.4642, lng: 9.19 }, radiusKm: 5 },
  targets: [/* GPS points */],
  script: [/* sensor snapshots */],
});
// result.summary.completed, result.summary.collectedKg ...
```

## Power and autonomy

`power/autonomyBudget.js` enforces the 30-minute budget, the 5 km geofence
and a 15 % return reserve, and estimates the solar recharge duration. Use
`canCompleteMission(distanceKm)` before launch to confirm the planned tour
fits the usable budget.

## Safety

- Never exceed the 1 kg payload (`firmware/collector.abort` on over-payload).
- Keep the geofence <= 5 km; out-of-range targets are clamped to the boundary.
- A low battery aborts the survey and returns home.
- Field testing is the integrator's responsibility; this kit ships software only.
