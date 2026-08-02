import {
  buildMoneroPaymentUri,
  calculateOrderTotals,
  formatCountdown,
  getRemainingPaymentSeconds,
  normalizeOrder,
  normalizeOrderList,
  normalizeOrderStatus,
} from '../services/orderUtils';

describe('orderUtils', () => {
  test('calculates token totals in XMR', () => {
    expect(calculateOrderTotals({ unitPriceXmr: 0.015 }, '2')).toEqual({
      tokenAmount: 2,
      unitPriceXmr: 0.015,
      moneroAmount: 0.03,
    });
  });

  test('builds Monero payment URI with amount and label', () => {
    expect(buildMoneroPaymentUri('4abc', 0.12, 'Order #1')).toBe(
      'monero:4abc?amount=0.12000000&tx_description=Order%20%231'
    );
  });

  test('normalizes API order shapes and statuses', () => {
    const order = normalizeOrder({
      id: 42,
      token: { symbol: 'ZUB', name: 'MyZubster token' },
      token_amount: '3',
      unit_price_xmr: '0.02',
      xmrAmount: '0.06',
      payment: {
        address: '48XMRSubaddress',
        confirmations: '2',
      },
      paymentStatus: 'paid',
    });

    expect(order).toMatchObject({
      id: 42,
      tokenSymbol: 'ZUB',
      tokenName: 'MyZubster token',
      tokenAmount: 3,
      unitPriceXmr: 0.02,
      moneroAmount: 0.06,
      moneroAddress: '48XMRSubaddress',
      confirmations: 2,
      status: 'completed',
    });
  });

  test('handles countdown and order list helpers', () => {
    const now = new Date('2026-01-01T00:00:00.000Z').getTime();

    expect(
      getRemainingPaymentSeconds(
        { paymentExpiresAt: '2026-01-01T00:01:30.000Z' },
        now
      )
    ).toBe(90);
    expect(formatCountdown(90)).toBe('1:30');
    expect(normalizeOrderStatus('payment_pending')).toBe('pending');
    expect(normalizeOrderList({ orders: [{ id: 'abc', status: 'confirmed' }] })).toHaveLength(1);
  });
});
