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

export async function listAddresses() {
  try {
    const { data } = await api.get('/wallet/addresses');
    const raw = Array.isArray(data) ? data : data.addresses || [];
    return raw.map(item => ({
      address: item.address || item.moneroAddress || '',
      label: item.label || '',
      primary: item.primary || item.main || false,
    }));
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getNetworkStatus() {
  try {
    const { data } = await api.get('/wallet/network');
    return { online: true, network: data.network || 'mainnet', height: data.height || data.blockchainHeight || data.syncedHeight || null, source: 'wallet/network' };
  } catch (error) {
    try {
      const { data } = await api.get('/wallet/status');
      return { online: true, network: data.network || 'mainnet', height: data.height || data.blockchainHeight || data.syncedHeight || null, source: 'wallet/status' };
    } catch (statusError) {
      try {
        const wallet = await getWallet();
        const height = wallet.height || wallet.blockchainHeight || wallet.syncedHeight || wallet.networkHeight || null;
        return { online: Boolean(wallet?.connected || wallet?.online || wallet?.daemonConnected), network: wallet?.network || 'unknown', height, source: 'getWallet' };
      } catch {
        return { online: false, network: 'unknown', height: null, source: 'fallback' };
      }
    }
  }
}

export function isWalletEndpointError(error) {
  return [404, 501].includes(error?.response?.status);
}
