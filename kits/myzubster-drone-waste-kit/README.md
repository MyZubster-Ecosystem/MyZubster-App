# myzubster-drone-waste-kit

Software, vision and autonomy control kit for a low-cost waste-collection
drone (issue #51). This is the **control-software and documentation**
deliverable: pure JavaScript modules, a deterministic mission simulator and
Jest unit tests, plus build/operation documentation. It contains **no
hardware drivers, no network calls, no wallets and no blockchain code**.

## Specs implemented (issue #51)

- Board: Jetson Nano (4GB) running YOLOv8s waste detection
- Payload capacity: up to **1 kg**
- Flight budget: **30 min**
- Operating radius: **5 km** geofence
- Recharge: solar (automatic)

## Scope

In scope (shipped here): control-software layer (path planning + collection
state machine + power budget), computer-vision postprocessing, on-device
inference wiring specs, Jest-covered mission simulation, EN/IT operation
guides and build/assembly documentation.

Out of scope (intentionally not shipped here): the physical prototype
hardware and any real flight / field test. Those are left to the maintainer or
a hardware-integration partner using this kit as the reference software.

## Layout

```
kits/myzubster-drone-waste-kit/
  index.js                 DroneWasteMission FSM + runMissionSequence simulator
  firmware/
    pathPlanner.js         geofence-safe waypoint planning (haversine)
    sensors.js             deterministic mocked sensor abstraction
    collector.js           1 kg collection coordinator state machine
  vision/
    yolov8s-detect.json   YOLOv8s waste-detection config + class heights
    detectionPostprocess.js NMS, class mapping, pinhole distance, target select
    inferenceSpec.js       on-device inference wiring spec + validation
  power/
    autonomyBudget.js      30min / 5km / solar recharge budgeting
  docs/
    OperationGuide.en.md   operator guide (English)
    OperationGuide.it.md   operator guide (Italian)
    BUILD.md               assembly, components, wiring, safety checklist
  __tests__/               Jest unit tests (pure, mocked)
```

## Tests

From the repository root:

```bash
npx jest kits/myzubster-drone-waste-kit
```

All modules are pure and deterministic; tests run with mocked sensors and no
network access.

## App integration

A thin bridge (`app/services/droneWasteService.js`) and screen
(`app/screens/DroneKitScreen.js`) wire the kit into the MyZubster-App
navigation so operators can inspect the kit status and run the demo mission
from the app.
