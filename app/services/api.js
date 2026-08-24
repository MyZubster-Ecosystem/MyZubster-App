import axios from 'axios';
import Constants from 'expo-constants';

const configuredUrl = Constants.expoConfig?.extra?.apiUrl ||
  (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined);

export const API_URL = (configuredUrl || 'http://192.168.1.10:3000/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let gatewayTransportFailureHandler = null;

export function setGatewayTransportFailureHandler(handler) {
  gatewayTransportFailureHandler = typeof handler === 'function' ? handler : null;
}

export function applyGatewayTransport({ mode, endpoint }) {
  api.defaults.baseURL = endpoint;
  api.defaults.timeout = mode === 'tor' ? 60000 : 30000;
  setTorProxyRequested(mode === 'tor');
}

export function setTorProxyRequested(enabled) {
  if (enabled) api.defaults.headers.common['X-Tor-Requested'] = 'true';
  else delete api.defaults.headers.common['X-Tor-Requested'];
}

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

api.interceptors.response.use(
  response => response,
  async error => {
    if (!error.response && !error.config?.__gatewayTransportRetried && gatewayTransportFailureHandler) {
      try {
        if (await gatewayTransportFailureHandler()) {
          return api.request({ ...error.config, __gatewayTransportRetried: true });
        }
      } catch {
        // Preserve the original network failure after a failed failover attempt.
      }
    }
    if (error.response?.status === 401) {
      delete api.defaults.headers.common.Authorization;
    }
    return Promise.reject(error);
  },
);

export default api;
