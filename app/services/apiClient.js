import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { torTransport } from './torTransport';
import { directTransport } from './directTransport';

const EXTRA = Constants.expoConfig?.extra || {};
const DEFAULT_API_URL = EXTRA.apiUrl || 'https://gateway.myzubster.example/api';
const DEFAULT_ONION_ENDPOINTS = EXTRA.onionEndpoints || [];

let currentTransport = 'direct';
let transportInstance = directTransport;
let endpointIndex = 0;
let endpoints = [DEFAULT_API_URL];
let isTorEnabled = false;

function buildEndpointList() {
  if (isTorEnabled && DEFAULT_ONION_ENDPOINTS.length > 0) {
    return [...DEFAULT_ONION_ENDPOINTS];
  }
  return [DEFAULT_API_URL];
}

function selectTransport() {
  if (isTorEnabled) {
    currentTransport = 'tor';
    transportInstance = torTransport;
  } else {
    currentTransport = 'direct';
    transportInstance = directTransport;
  }
  endpoints = buildEndpointList();
  endpointIndex = 0;
}

async function getAuthToken() {
  return SecureStore.getItemAsync('auth_token');
}

function sanitizeForLogs(data) {
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['token', 'password', 'secret', 'privateKey', 'seed', 'mnemonic', 'authorization'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

async function request(method, path, body, options = {}) {
  const { retries = 3, timeout = isTorEnabled ? 60000 : 15000, signal } = options;
  
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (endpointIndex >= endpoints.length) {
      endpointIndex = 0;
    }
    
    const baseUrl = endpoints[endpointIndex];
    const url = `${baseUrl}${path}`;
    
    try {
      const token = await getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const combinedSignal = signal ? 
        AbortSignal.any([signal, controller.signal]) : 
        controller.signal;
      
      const response = await transportInstance.request(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, errorData.error || response.statusText, errorData);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.warn(`[apiClient] Request timeout on ${endpoints[endpointIndex]} (attempt ${attempt + 1}/${retries + 1})`);
      } else if (error instanceof ApiError && error.status >= 500) {
        console.warn(`[apiClient] Server error ${error.status} on ${endpoints[endpointIndex]}`);
      } else if (error instanceof ApiError && error.status === 401) {
        throw error;
      } else {
        console.warn(`[apiClient] Network error on ${endpoints[endpointIndex]}: ${error.message}`);
      }
      
      endpointIndex = (endpointIndex + 1) % endpoints.length;
      
      if (attempt < retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), isTorEnabled ? 30000 : 5000);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }
  
  throw lastError;
}

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const apiClient = {
  get: (path, options) => request('GET', path, null, options),
  post: (path, body, options) => request('POST', path, body, options),
  put: (path, body, options) => request('PUT', path, body, options),
  patch: (path, body, options) => request('PATCH', path, body, options),
  delete: (path, options) => request('DELETE', path, null, options),
  
  setTorEnabled: async (enabled) => {
    isTorEnabled = enabled;
    selectTransport();
    try {
      await SecureStore.setItemAsync('tor_enabled', JSON.stringify(enabled));
    } catch (e) {
      console.warn('[apiClient] Failed to persist tor setting:', e.message);
    }
  },
  
  isTorEnabled: () => isTorEnabled,
  
  getCurrentEndpoint: () => endpoints[endpointIndex] || null,
  
  getTransportMode: () => currentTransport,
  
  getAvailableEndpoints: () => [...endpoints],
  
  initialize: async () => {
    try {
      const stored = await SecureStore.getItemAsync('tor_enabled');
      if (stored !== null) {
        isTorEnabled = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[apiClient] Failed to load tor setting:', e.message);
    }
    selectTransport();
  },
  
  diagnose: () => ({
    transport: currentTransport,
    torEnabled: isTorEnabled,
    currentEndpoint: endpoints[endpointIndex] || null,
    availableEndpoints: endpoints.map(e => e.replace(/://[^:@]+:[^@]+@/, '://[REDACTED]@')),
    endpointIndex,
  }),
};

apiClient.initialize();