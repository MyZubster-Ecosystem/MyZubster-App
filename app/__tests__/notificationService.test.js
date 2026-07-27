/**
 * Lightweight unit tests for notification mapping helpers.
 * Run with: node --test app/__tests__/notificationService.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

function mapRemoteMessage(remoteMessage = {}) {
  const data = remoteMessage.data || {};
  const type = data.type || remoteMessage.type || 'order_confirmed';
  const NOTIFICATION_TYPES = {
    order_confirmed: 'Order Confirmed',
    order_completed: 'Order Completed',
    order_cancelled: 'Order Cancelled',
    payment_reminder: 'Payment Reminder',
    dividend_received: 'Dividend Received',
    token_listing: 'Token Listing',
    price_alert: 'Price Alert',
  };
  return {
    type,
    title: remoteMessage.title || remoteMessage.notification?.title || NOTIFICATION_TYPES[type] || 'MyZubster',
    body: remoteMessage.body || remoteMessage.notification?.body || '',
    deepLink: data.deepLink || data.screen || null,
    orderId: data.orderId || null,
  };
}

test('maps FCM-like payload fields', () => {
  const mapped = mapRemoteMessage({
    notification: { title: 'Paid', body: 'Order 12 confirmed' },
    data: { type: 'order_confirmed', orderId: '12', deepLink: 'Order' },
  });
  assert.equal(mapped.type, 'order_confirmed');
  assert.equal(mapped.title, 'Paid');
  assert.equal(mapped.body, 'Order 12 confirmed');
  assert.equal(mapped.orderId, '12');
  assert.equal(mapped.deepLink, 'Order');
});

test('falls back to notification type labels', () => {
  const mapped = mapRemoteMessage({ data: { type: 'price_alert' } });
  assert.equal(mapped.title, 'Price Alert');
});
