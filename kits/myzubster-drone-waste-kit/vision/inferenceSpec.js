// On-device inference wiring spec for the Jetson Nano target (issue #51).
// This module only describes and validates the configuration; it performs no
// inference and controls no hardware — the runtime wiring is documented in
// docs/OperationGuide and is implemented by the integrator on the device.

export const INFERENCE_TARGET = {
  board: 'NVIDIA Jetson Nano (4GB)',
  runtime: 'TensorRT 8 (FP16)',
  accelerator: 'GPU (Maxwell, 128 CUDA cores)',
};

export const DEFAULT_INFERENCE_SPEC = {
  model: 'yolov8s',
  weights: 'yolov8s-waste.engine',
  inputSize: [640, 640],
  inputLayer: 'images',
  outputLayer: 'output0',
  precision: 'fp16',
  maxBatchSize: 1,
  expected: { latencyMs: 45, fps: 21 },
  workspaceMb: 1024,
};

// Validate a spec object against the required shape and sensible bounds.
export function validateSpec(spec = DEFAULT_INFERENCE_SPEC) {
  const errors = [];
  if (!spec.model) errors.push('model is required');
  if (!Array.isArray(spec.inputSize) || spec.inputSize.length !== 2 ||
      !spec.inputSize.every((n) => Number.isFinite(n) && n > 0)) {
    errors.push('inputSize must be [w,h] of positive numbers');
  }
  if (typeof spec.precision !== 'string' || !['fp32', 'fp16', 'int8'].includes(spec.precision)) {
    errors.push('precision must be fp32|fp16|int8');
  }
  const lat = spec.expected && Number(spec.expected.latencyMs);
  if (!Number.isFinite(lat) || lat <= 0) errors.push('expected.latencyMs must be positive');
  if (spec.maxBatchSize != null && (!Number.isFinite(Number(spec.maxBatchSize)) || Number(spec.maxBatchSize) < 1)) {
    errors.push('maxBatchSize must be a positive integer');
  }
  return { ok: errors.length === 0, errors };
}

// Loose estimate of achievable FPS from a measured latency in milliseconds.
export function latencyToFps(latencyMs) {
  if (!Number.isFinite(Number(latencyMs)) || Number(latencyMs) <= 0) return 0;
  return 1000 / Number(latencyMs);
}
