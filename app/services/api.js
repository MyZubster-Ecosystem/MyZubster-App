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
  error => {
    if (error.response?.status === 401) {
      delete api.defaults.headers.common.Authorization;
    }
    return Promise.reject(error);
  },
);

export default api;
