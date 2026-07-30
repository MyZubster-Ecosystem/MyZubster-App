import api from './api';

// The mobile client deliberately keeps spend keys out of AsyncStorage. These
// endpoints are a gateway contract and may be backed by a remote-node wallet
// or a native Monero wallet in a development build.
export async function getWallet() {
  const { data } = await api.get('/wallet');
  return data;
}

export async function getWalletTransactions() {
  const { data } = await api.get('/wallet/transactions');
  return Array.isArray(data) ? data : data.transactions || [];
}

export async function createReceiveAddress(label) {
  const { data } = await api.post('/wallet/address', { label });
  return data;
}

export async function sendPayment({ address, amount, paymentId }) {
  const { data } = await api.post('/wallet/transfer', {
    address,
    amount: Number(amount),
    ...(paymentId ? { paymentId } : {}),
  });
  return data;
}

export function isWalletEndpointError(error) {
  return [404, 501].includes(error?.response?.status);
}
