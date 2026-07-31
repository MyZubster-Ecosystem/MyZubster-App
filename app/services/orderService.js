import api from './api';

export async function listOrders() {
  const { data } = await api.get('/orders');
  return Array.isArray(data) ? data : data.orders || [];
}

export async function getOrder(orderId) {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}`);
  return data;
}

export async function createOrder({ skillId, amount, currency, customerEmail }) {
  // The current Gateway API creates a payment subaddress as part of order
  // creation. Keep both naming styles until the Marketplace/Gateway contract
  // is unified, while sending the contract used by the deployed Gateway.
  const { data } = await api.post('/orders', {
    amount: Number(amount),
    currency,
    customerEmail,
    ...(skillId ? { skill_id: Number(skillId), skillId: Number(skillId) } : {}),
  });
  return data;
}

export async function getOrderPaymentStatus(orderId) {
  try {
    const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}/payment-status`);
    return data;
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    return getOrder(orderId);
  }
}

export async function cancelOrder(orderId) {
  const { data } = await api.put(`/orders/${encodeURIComponent(orderId)}/cancel`);
  return data;
}
