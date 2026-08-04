import { isPayloadAcceptable, remainingCapacityKg, planScoopAngle, createCollector, MAX_PAYLOAD_KG } from '../firmware/collector';

describe('collector', () => {
  test('isPayloadAcceptable honours the 1kg ceiling', () => {
    expect(isPayloadAcceptable(0.5)).toBe(true);
    expect(isPayloadAcceptable(MAX_PAYLOAD_KG)).toBe(true);
    expect(isPayloadAcceptable(1.1)).toBe(false);
    expect(isPayloadAcceptable(-0.2)).toBe(false);
  });
  test('remainingCapacityKg subtracts loaded', () => {
    expect(remainingCapacityKg(0.4)).toBeCloseTo(0.6, 5);
    expect(remainingCapacityKg(2)).toBe(0);
  });
  test('planScoopAngle computes an arm opening and half-angle', () => {
    const out = planScoopAngle(0.2, 0.3, 0.1);
    expect(out.openM).toBeCloseTo(0.3, 5);
    expect(out.angleRad).toBeCloseTo(Math.asin(0.5), 3);
    expect(out.feasible).toBe(true);
  });
  test('collector state machine reaches LOADED within the 1kg ceiling', () => {
    const c = createCollector();
    expect(c.getState().name).toBe('IDLE');
    c.transition({ detection: { label: 'plastic', distanceM: 0.3 } }); // IDLE -> APPROACHING
    expect(c.getState().name).toBe('APPROACHING');
    c.transition({ detection: { label: 'plastic', distanceM: 0.3 }, scaleKg: 0.5 }); // -> COLLECTING, 0.5
    expect(c.getState().name).toBe('COLLECTING');
    c.transition({ detection: { label: 'plastic', distanceM: 0.3 }, scaleKg: 0.5 }); // -> LOADED
    expect(c.getState().name).toBe('LOADED');
    expect(c.isLoaded()).toBe(true);
    expect(c.remaining()).toBe(0);
    expect(c.getState().accumulatedKg).toBe(MAX_PAYLOAD_KG);
    c.reset();
    expect(c.getState().name).toBe('IDLE');
  });
  test('collector aborts when payload is invalid', () => {
    const c = createCollector();
    c.transition({ detection: { label: 'plastic', distanceM: 0.3 } }); // APPROACHING
    c.transition({ detection: { label: 'plastic', distanceM: 0.3 }, scaleKg: 0.5 }); // COLLECTING
    c.transition({ detection: null, scaleKg: 99 }); // payload > MAX -> IDLE
    expect(c.getState().name).toBe('IDLE');
  });
});
