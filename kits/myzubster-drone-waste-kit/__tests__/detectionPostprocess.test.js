import { iou, nms, mapClassIds, estimateDistance, selectPrimaryTarget, WASTE_CLASSES } from '../vision/detectionPostprocess';

describe('detectionPostprocess', () => {
  test('iou of identical boxes is 1 and disjoint is 0', () => {
    const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
    expect(iou(a, a)).toBe(1);
    expect(iou(a, { x1: 20, y1: 20, x2: 30, y2: 30 })).toBe(0);
  });
  test('nms drops low-confidence and suppresses overlaps', () => {
    const dets = [
      { score: 0.9, bbox: { x1: 0, y1: 0, x2: 10, y2: 10 } },
      { score: 0.8, bbox: { x1: 1, y1: 1, x2: 11, y2: 11 } }, // heavy overlap
      { score: 0.2, bbox: { x1: 50, y1: 50, x2: 60, y2: 60 } }, // low conf
      { score: 0.7, bbox: { x1: 40, y1: 40, x2: 50, y2: 50 } }, // separate
    ];
    const kept = nms(dets, { confThreshold: 0.4, iouThreshold: 0.45 });
    expect(kept.find((d) => d.score === 0.9)).toBeTruthy();
    expect(kept.find((d) => d.score === 0.8)).toBeUndefined();
    expect(kept.find((d) => d.score === 0.2)).toBeUndefined();
    expect(kept.find((d) => d.score === 0.7)).toBeTruthy();
  });
  test('mapClassIds labels detections', () => {
    const out = mapClassIds([{ classId: 0 }, { classId: 3 }]);
    expect(out[0].label).toBe('plastic');
    expect(out[1].label).toBe('organic');
    expect(WASTE_CLASSES).toContain('e-waste');
  });
  test('estimateDistance uses pinhole geometry', () => {
    expect(estimateDistance(100, 0.1, 1063)).toBeCloseTo(1.063, 3);
    expect(estimateDistance(0, 0.1, 1063)).toBe(0);
  });
  test('selectPrimaryTarget picks nearest inside range', () => {
    const dets = [
      { label: 'glass', distanceM: 5 },
      { label: 'plastic', distanceM: 2 },
      { label: 'metal', distanceM: 50 },
    ];
    const t = selectPrimaryTarget(dets, { maxDistanceM: 30 });
    expect(t.label).toBe('plastic');
    expect(selectPrimaryTarget([], {})).toBeNull();
  });
});
