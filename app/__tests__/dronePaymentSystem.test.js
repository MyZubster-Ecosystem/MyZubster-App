import { getDroneWallet, getDroneTransactions, verifyTaskCompletion, triggerAutoPayment, getEarningsSummary, listDroneTasks, isDroneEndpointError } from '../services/droneWalletService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('drone payment system contract', () => {
  test('exports drone automatic payment API functions', () => {
    expect(typeof getDroneWallet).toBe('function');
    expect(typeof getDroneTransactions).toBe('function');
    expect(typeof verifyTaskCompletion).toBe('function');
    expect(typeof triggerAutoPayment).toBe('function');
    expect(typeof getEarningsSummary).toBe('function');
    expect(typeof listDroneTasks).toBe('function');
    expect(typeof isDroneEndpointError).toBe('function');
  });

  test('verifyTaskCompletion posts to /drone/tasks/verify with taskId, droneId, proof', async () => {
    const api = require('../services/api').default;
    api.post.mockResolvedValueOnce({ data: { ok: true } });
    const result = await verifyTaskCompletion({ taskId: 't1', droneId: 'd1', proof: 'photo' });
    expect(result).toEqual({ ok: true });
    expect(api.post).toHaveBeenCalledWith('/drone/tasks/verify', expect.objectContaining({ taskId: 't1', droneId: 'd1', proof: 'photo' }));
  });

  test('triggerAutoPayment posts to /drone/payments/auto with numeric amount', async () => {
    const api = require('../services/api').default;
    api.post.mockResolvedValueOnce({ data: { txid: 'abc' } });
    const result = await triggerAutoPayment({ taskId: 't1', droneId: 'd1', amount: '0.05' });
    expect(result).toEqual({ txid: 'abc' });
    expect(api.post).toHaveBeenCalledWith('/drone/payments/auto', expect.objectContaining({ taskId: 't1', droneId: 'd1', amount: 0.05 }));
  });

  test('isDroneEndpointError identifies 404 and 501', () => {
    expect(isDroneEndpointError({ response: { status: 404 } })).toBe(true);
    expect(isDroneEndpointError({ response: { status: 501 } })).toBe(true);
    expect(isDroneEndpointError({ response: { status: 500 } })).toBe(false);
    expect(isDroneEndpointError({})).toBe(false);
  });
});
