import api from './api';

const unwrap = data => data?.data ?? data;

async function postWithFallback(paths, payload) {
  let lastError;
  for (const path of paths) {
    try {
      const response = await api.post(path, payload);
      return unwrap(response.data);
    } catch (error) {
      lastError = error;
      if (![404, 405, 501].includes(error.response?.status)) throw error;
    }
  }
  throw lastError;
}

export function requestMoneroChallenge(walletAddress) {
  return postWithFallback(['/auth/monero/challenge', '/auth/anonymous/challenge'], { walletAddress });
}

export function verifyMoneroSignature({ walletAddress, nickname, message, signature }) {
  return postWithFallback(['/auth/monero/verify', '/auth/anonymous/verify'], {
    walletAddress,
    nickname,
    message,
    signature,
  });
}

export async function getProfile() {
  try {
    const { data } = await api.get('/auth/me');
    return unwrap(data)?.user || unwrap(data);
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    const { data } = await api.get('/users/me');
    return unwrap(data)?.user || unwrap(data);
  }
}

export async function updateProfile(profile) {
  const payload = {
    name: profile.name,
    email: profile.email,
    username: profile.username,
    walletAddress: profile.walletAddress || profile.moneroAddress,
  };
  try {
    const { data } = await api.put('/users/me', payload);
    return unwrap(data)?.user || unwrap(data);
  } catch (error) {
    if (error.response?.status !== 404 && error.response?.status !== 405) throw error;
    const { data } = await api.put(`/users/${encodeURIComponent(profile.id)}`, payload);
    return unwrap(data)?.user || unwrap(data);
  }
}
