import api from './api';

// Drone wallet endpoints for the automatic payment system.
// Each drone has a unique Monero wallet managed by the Gateway.

export async function getDroneWallet() {
  const { data } = await api.get('/drone/wallet');
  return data;
}

export async function getDroneTransactions() {
  const { data } = await api.get('/drone/wallet/transactions');
  return Array.isArray(data) ? data : data.transactions || [];
}

export async function verifyTaskCompletion({ taskId, droneId, proof }) {
  const { data } = await api.post('/drone/tasks/verify', {
    taskId,
    droneId,
    proof,
  });
  return data;
}

export async function triggerAutoPayment({ taskId, droneId, amount }) {
  const { data } = await api.post('/drone/payments/auto', {
    taskId,
    droneId,
    amount: Number(amount),
  });
  return data;
}

export async function getEarningsSummary() {
  const { data } = await api.get('/drone/earnings');
  return data;
}

export async function listDroneTasks({ status } = {}) {
  const { data } = await api.get('/drone/tasks', { params: { status } });
  return Array.isArray(data) ? data : data.tasks || [];
}

export function isDroneEndpointError(error) {
  return [404, 501].includes(error?.response?.status);
}
