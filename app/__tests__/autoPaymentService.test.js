import {
  getDefaultAutoPaymentAmount,
  getAutoPaymentHistory,
  getAutoPaymentStatus,
  isAutoPaymentEndpointError,
  triggerPoiPayment,
  triggerReportPayment,
} from '../services/autoPaymentService';
import api from '../services/api';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('autoPaymentService contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports the expected API functions', () => {
    expect(typeof triggerPoiPayment).toBe('function');
    expect(typeof triggerReportPayment).toBe('function');
    expect(typeof getAutoPaymentStatus).toBe('function');
    expect(typeof getAutoPaymentHistory).toBe('function');
    expect(typeof getDefaultAutoPaymentAmount).toBe('function');
    expect(typeof isAutoPaymentEndpointError).toBe('function');
  });

  test('getDefaultAutoPaymentAmount returns known values', () => {
    expect(getDefaultAutoPaymentAmount('poi')).toBe(0.005);
    expect(getDefaultAutoPaymentAmount('report')).toBe(0.002);
    expect(getDefaultAutoPaymentAmount('unknown')).toBe(0);
  });

  test('triggerPoiPayment posts to /payments/auto with correct payload', async () => {
    const mockResponse = { success: true, txid: 'abc123', amount: 0.005, status: 'pending' };
    api.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await triggerPoiPayment('poi-42');

    expect(result).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith('/payments/auto', {
      referenceType: 'poi',
      referenceId: 'poi-42',
      amount: 0.005,
    });
  });

  test('triggerPoiPayment accepts custom amount and recipient', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });

    await triggerPoiPayment('poi-7', {
      amount: 0.01,
      recipientAddress: '4A...XYZ',
    });

    expect(api.post).toHaveBeenCalledWith('/payments/auto', {
      referenceType: 'poi',
      referenceId: 'poi-7',
      amount: 0.01,
      recipientAddress: '4A...XYZ',
    });
  });

  test('triggerReportPayment posts to /payments/auto with correct payload', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true, status: 'completed' } });

    const result = await triggerReportPayment('report-99');

    expect(result).toEqual({ success: true, status: 'completed' });
    expect(api.post).toHaveBeenCalledWith('/payments/auto', {
      referenceType: 'report',
      referenceId: 'report-99',
      amount: 0.002,
    });
  });

  test('getAutoPaymentStatus fetches payment status by reference', async () => {
    const mockStatus = {
      referenceType: 'report',
      referenceId: 'report-99',
      status: 'completed',
      amount: 0.002,
      txid: 'deadbeef',
      createdAt: '2026-08-01T12:00:00Z',
    };
    api.get.mockResolvedValueOnce({ data: mockStatus });

    const result = await getAutoPaymentStatus('report', 'report-99');

    expect(result).toEqual(mockStatus);
    expect(api.get).toHaveBeenCalledWith('/payments/auto/report/report-99');
  });

  test('getAutoPaymentHistory fetches payment history array', async () => {
    const mockHistory = [
      { referenceType: 'poi', referenceId: 'poi-1', status: 'completed', amount: 0.005 },
      { referenceType: 'report', referenceId: 'report-2', status: 'pending', amount: 0.002 },
    ];
    api.get.mockResolvedValueOnce({ data: { payments: mockHistory } });

    const result = await getAutoPaymentHistory();

    expect(result).toEqual(mockHistory);
    expect(api.get).toHaveBeenCalledWith('/payments/auto/history');
  });

  test('getAutoPaymentHistory handles direct array response', async () => {
    const mockHistory = [{ referenceType: 'poi', referenceId: 'poi-1', status: 'completed' }];
    api.get.mockResolvedValueOnce({ data: mockHistory });

    const result = await getAutoPaymentHistory();

    expect(result).toEqual(mockHistory);
  });

  test('isAutoPaymentEndpointError detects missing endpoint', () => {
    const notFound = { response: { status: 404 } };
    const notImplemented = { response: { status: 501 } };
    const serverError = { response: { status: 500 } };
    const networkError = new Error('Network Error');

    expect(isAutoPaymentEndpointError(notFound)).toBe(true);
    expect(isAutoPaymentEndpointError(notImplemented)).toBe(true);
    expect(isAutoPaymentEndpointError(serverError)).toBe(false);
    expect(isAutoPaymentEndpointError(networkError)).toBe(false);
  });
});