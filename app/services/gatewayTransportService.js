import Constants from 'expo-constants';
import { API_URL, applyGatewayTransport, setGatewayTransportFailureHandler } from './api';

export const DIRECT_MODE = 'direct';
export const TOR_MODE = 'tor';

const env = typeof process !== 'undefined' && process.env ? process.env : {};
const configuredTorEndpoints =
  Constants.expoConfig?.extra?.trustedTorGatewayUrls ||
  env.EXPO_PUBLIC_TRUSTED_TOR_GATEWAY_URLS ||
  [];

function asEndpointList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',');
  return [];
}

export function normalizeTrustedTorEndpoints(value) {
  return [...new Set(asEndpointList(value).map(item => item.trim()).filter(Boolean).map(item => {
    const url = new URL(item);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.endsWith('.onion')) {
      throw new Error('Trusted Tor Gateway endpoints must use an http(s) .onion URL');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('Trusted Tor Gateway endpoints cannot contain credentials, query strings, or fragments');
    }
    return url.toString().replace(/\/$/, '');
  }))];
}

export function redactTransportDiagnostic(value) {
  return String(value || '')
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:token|access_token|auth|key)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/(https?:\/\/)[^/@\s]+@/gi, '$1[REDACTED]@');
}

async function defaultProbe(endpoint, timeoutMs) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller?.signal,
    });
    return response.ok;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createGatewayTransportController({
  directEndpoint = API_URL,
  torEndpoints = configuredTorEndpoints,
  probe = defaultProbe,
  apply = applyGatewayTransport,
  probeTimeoutMs = 12000,
} = {}) {
  const trustedTorEndpoints = normalizeTrustedTorEndpoints(torEndpoints);
  let mode = DIRECT_MODE;
  let activeEndpoint = directEndpoint;
  let lastError = null;

  const snapshot = () => ({
    mode,
    activeEndpoint,
    trustedEndpointCount: trustedTorEndpoints.length,
    connectionState: mode === TOR_MODE ? 'connected' : 'direct',
    lastError,
  });

  const useDirect = () => {
    mode = DIRECT_MODE;
    activeEndpoint = directEndpoint;
    lastError = null;
    apply({ mode, endpoint: activeEndpoint });
    return snapshot();
  };

  const enableTor = async () => {
    if (!trustedTorEndpoints.length) {
      useDirect();
      throw new Error('No trusted Tor Gateway endpoints are configured');
    }

    for (const endpoint of trustedTorEndpoints) {
      try {
        if (await probe(endpoint, probeTimeoutMs)) {
          mode = TOR_MODE;
          activeEndpoint = endpoint;
          lastError = null;
          apply({ mode, endpoint: activeEndpoint });
          return snapshot();
        }
      } catch (error) {
        lastError = redactTransportDiagnostic(error?.message || error);
      }
    }

    const failure = lastError || 'No trusted Tor Gateway endpoint passed its health check';
    useDirect();
    lastError = failure;
    throw new Error(failure);
  };

  const failover = async () => {
    if (mode !== TOR_MODE) return snapshot();
    const remaining = trustedTorEndpoints.filter(endpoint => endpoint !== activeEndpoint);
    for (const endpoint of remaining) {
      try {
        if (await probe(endpoint, probeTimeoutMs)) {
          activeEndpoint = endpoint;
          lastError = null;
          apply({ mode, endpoint: activeEndpoint });
          return snapshot();
        }
      } catch (error) {
        lastError = redactTransportDiagnostic(error?.message || error);
      }
    }
    return useDirect();
  };

  return { enableTor, failover, snapshot, useDirect };
}

export const gatewayTransport = createGatewayTransportController();

setGatewayTransportFailureHandler(async () => {
  const before = gatewayTransport.snapshot();
  if (before.mode !== TOR_MODE) return false;
  const after = await gatewayTransport.failover();
  return after.mode === TOR_MODE && after.activeEndpoint !== before.activeEndpoint;
});
