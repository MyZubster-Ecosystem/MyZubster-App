import axios from 'axios';
import Constants from 'expo-constants';
import { normalizeOrder, normalizeOrderList } from './orderUtils';

const env = typeof process !== 'undefined' && process.env ? process.env : {};
const configuredUrl =
  Constants.expoConfig?.extra?.apiUrl ||
  env.EXPO_PUBLIC_API_URL ||
  env.API_URL;

export const API_URL = (configuredUrl || 'http://192.168.1.10:3000/api').replace(/\/$/, '');
export const API_BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export function setTorProxyRequested(enabled) {
  if (enabled) api.defaults.headers.common['X-Tor-Requested'] = 'true';
  else delete api.defaults.headers.common['X-Tor-Requested'];
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

function authConfig(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

async function requestWithFallback(requests) {
  const errors = [];

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      errors.push(error);
      const status = error.response?.status;

      if (status && ![404, 405, 501].includes(status)) {
        throw error;
      }
    }
  }

  throw errors[errors.length - 1];
}

export async function createOrder(payload, token, fallbackOrder) {
  const response = await api.post('/orders', payload, authConfig(token));
  return normalizeOrder(response.data, fallbackOrder);
}

export async function getOrders(token) {
  const response = await requestWithFallback([
    () => api.get('/orders', authConfig(token)),
    () => api.get('/orders/my-orders', authConfig(token)),
  ]);

  return normalizeOrderList(response.data);
}

export async function getOrder(orderId, token, fallbackOrder) {
  const response = await requestWithFallback([
    () => api.get(`/orders/${orderId}`, authConfig(token)),
    () => api.get(`/orders/${orderId}/payment-status`, authConfig(token)),
  ]);

  return normalizeOrder(response.data, fallbackOrder);
}

export async function cancelOrder(orderId, token, fallbackOrder) {
  const response = await api.put(`/orders/${orderId}/cancel`, {}, authConfig(token));
  return normalizeOrder(response.data, { ...fallbackOrder, status: 'cancelled' });
}

export function buildOrderWebSocketUrl(orderId, token) {
  const wsBase = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  const url = `${wsBase}/orders/${encodeURIComponent(orderId)}/status`;

  if (!token) {
    return url;
  }

  return `${url}?token=${encodeURIComponent(token)}`;
}

export function subscribeToOrderStatus(orderId, token, onUpdate, onError) {
  if (!orderId || typeof WebSocket === 'undefined') {
    return () => {};
  }

  const socket = new WebSocket(buildOrderWebSocketUrl(orderId, token));

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onUpdate(normalizeOrder(payload));
    } catch (error) {
      onError?.(error);
    }
  };

  socket.onerror = (event) => {
    onError?.(event);
  };

  return () => {
    socket.close();
  };
}

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      delete api.defaults.headers.common.Authorization;
    }
    return Promise.reject(error);
  },
);

export default api;
