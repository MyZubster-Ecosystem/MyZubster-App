# Build and assembly notes (issue #51)

This document describes the physical integration reference for the
waste-collection drone. The shipped code is the control-software layer;
this file is the **assembly reference** for whoever builds the prototype on
top of that software. It does **not** include the physical prototype itself.

## Compute stack (reference bill of materials)

- Jetson Nano 4GB (module + dev board)
- Camera: IMX219 (Raspberry Pi V2) or USB webcam compatible with the YOLOv8s TensorRT engine
- Flight controller: a PX4-compatible board flashed with stable firmware
- Companion link: serial over USB between Jetson and the flight controller
- Load cell (1 kg rated) + HX711 amplifier on the gripper
- GPS: u-blox NEO-M8N class
- LiPo: 4S 1800 mAh (`power/autonomyBudget.js` defaults assume ~26.6 Wh)
- Solar panel: small 12 W panel with an MPPT-style charge controller
- Gripper/scoop: a light scoop mount (see OpenSCAD notes below)

## On-device software wiring

- Convert `yolov8s` to a TensorRT FP16 engine using the standard U-Net-free
  export, aligned with `vision/yolov8s-detect.json` (input 640x640, classes in
  the JSON, conf/iou thresholds from the `postprocess` block).
- Pinhole distance uses `vision/detectionPostprocess.estimateDistance`
  with `focalLengthPx` from the calibrated camera intrinsics and the
  `classHeightsM` table in the JSON. Calibrate on the field for accuracy.
- Implement the sensor getters named in `firmware/sensors.js` against the
  real drivers (GPS, load cell, lidar); the mocked script API there is the
  contract the mission simulator expects.

## OpenSCAD / mechanical references

- `scoop-mount`: a clip that mounts a 3D-printed scoop to one arm so the
  gripper can close over debris up to the modelled width per
  `firmware/collector.planScoopAngle`.
- `tray`: a detachable under-belly tray sized for the 1 kg ceiling so the
  load cell sits at the tray pivot.

(STL/SCAD files are left to the integrator; the geometry helper
`planScoopAngle(detectedWidthM, droneArmLengthM)` defines the required arm
opening and feasibility so the mount can be parametrised in OpenSCAD.)

## Pre-flight safety checklist

1. Geofence centred on the base, radius <= 5 km (`power/autonomyBudget` default).
2. Battery above the low-battery abort threshold and the 15 % return reserve is honoured.
3. Payload ceiling 1 kg enforced by `firmware/collector`; an over-payload
   reading sends the collector back to IDLE.
4. Solar charge controller connected; recharge window planned before launch.
5. Camera intrinsics/focal length calibrated for the distance estimator.
6. Confirm the field test is performed by the integrator — this kit ships no
   hardware and is the software reference only.
