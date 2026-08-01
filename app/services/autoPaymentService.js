import api from './api';

/**
 * Auto-payment service for POI verification and urban report resolution.
 *
 * These endpoints notify the Gateway to trigger XMR payments on behalf of the
 * platform. The Gateway backend (MyZubsterGateway) owns the Monero wallet and
 * executes the actual transactions; this client only signals verified events.
 *
 * Amounts are defined in XMR and can be overridden by the Gateway response.
 * Idempotency is achieved via (referenceType + referenceId) – the Gateway
 * deduplicates repeated triggers for the same reference.
 */

/** Default POI (skill / map contribution) verification reward. */
const POI_REWARD_XMR = 0.005;

/** Default urban report resolution reward. */
const REPORT_REWARD_XMR = 0.002;

/**
 * Return the default XMR amount for a reference type.
 * @param {'poi'|'report'} referenceType
 * @returns {number}
 */
export function getDefaultAutoPaymentAmount(referenceType) {
  switch (referenceType) {
    case 'poi':
      return POI_REWARD_XMR;
    case 'report':
      return REPORT_REWARD_XMR;
    default:
      return 0;
  }
}

/**
 * Build the request payload for an auto-payment trigger.
 * Idempotent: same (type + id) always yields the same payload.
 */
function buildPayload(referenceType, referenceId, options = {}) {
  return {
    referenceType,
    referenceId,
    amount: options.amount ?? getDefaultAutoPaymentAmount(referenceType),
    ...(options.recipientAddress ? { recipientAddress: options.recipientAddress } : {}),
  };
}

/**
 * Trigger an auto-payment reward when a POI (map contribution) is verified.
 *
 * @param {string} poiId        – Verified POI / skill identifier.
 * @param {object} [options]
 * @param {number} [options.amount] – XMR amount (defaults to POI_REWARD_XMR).
 * @param {string} [options.recipientAddress] – Override recipient Monero address.
 * @returns {Promise<{success: boolean, txid?: string, amount: number, status: string}>}
 */
export async function triggerPoiPayment(poiId, options = {}) {
  const payload = buildPayload('poi', poiId, options);
  const { data } = await api.post('/payments/auto', payload);
  return data;
}

/**
 * Trigger an auto-payment reward when an urban report is resolved/verified.
 *
 * @param {string} reportId     – Resolved urban report identifier.
 * @param {object} [options]
 * @param {number} [options.amount] – XMR amount (defaults to REPORT_REWARD_XMR).
 * @param {string} [options.recipientAddress] – Override recipient Monero address.
 * @returns {Promise<{success: boolean, txid?: string, amount: number, status: string}>}
 */
export async function triggerReportPayment(reportId, options = {}) {
  const payload = buildPayload('report', reportId, options);
  const { data } = await api.post('/payments/auto', payload);
  return data;
}

/**
 * Query the status of a previously triggered auto-payment.
 *
 * @param {'poi'|'report'} referenceType
 * @param {string} referenceId
 * @returns {Promise<{referenceType, referenceId, status, amount, txid?, createdAt?}>}
 */
export async function getAutoPaymentStatus(referenceType, referenceId) {
  const encodedType = encodeURIComponent(referenceType);
  const encodedId = encodeURIComponent(referenceId);
  const { data } = await api.get(`/payments/auto/${encodedType}/${encodedId}`);
  return data;
}

/**
 * Convenience: fetch all auto-payment history for the current user.
 * @returns {Promise<Array>}
 */
export async function getAutoPaymentHistory() {
  const { data } = await api.get('/payments/auto/history');
  return Array.isArray(data) ? data : data.payments || [];
}

/**
 * Check whether an error indicates the auto-payment endpoint is not deployed.
 * @param {Error} error
 * @returns {boolean}
 */
export function isAutoPaymentEndpointError(error) {
  return [404, 501].includes(error?.response?.status);
}