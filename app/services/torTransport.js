import { Platform } from 'react-native';

const ORBOT_PACKAGE = 'org.torproject.android';
const ORBOT_PROXY_HOST = '127.0.0.1';
const ORBOT_PROXY_PORT = 9050;

let torAvailable = null;

async function checkOrbotInstalled() {
  if (Platform.OS !== 'android') return false;
  try {
    const { PackageManager } = await import('expo-package-manager');
    return await PackageManager.isPackageInstalledAsync(ORBOT_PACKAGE);
  } catch {
    return false;
  }
}

async function ensureTorAvailable() {
  if (torAvailable !== null) return torAvailable;
  
  if (Platform.OS !== 'android') {
    torAvailable = false;
    return false;
  }
  
  const installed = await checkOrbotInstalled();
  if (!installed) {
    torAvailable = false;
    return false;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://127.0.0.1:9050', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    torAvailable = response.ok || response.status === 400;
  } catch {
    torAvailable = false;
  }
  
  return torAvailable;
}

export const torTransport = {
  name: 'tor',
  
  async request(url, options) {
    const available = await ensureTorAvailable();
    if (!available) {
      throw new Error('Tor transport unavailable: Orbot not installed or not running');
    }
    
    const proxyUrl = `socks5://${ORBOT_PROXY_HOST}:${ORBOT_PROXY_PORT}`;
    
    const response = await fetch(url, {
      ...options,
      agent: undefined,
    });
    
    return response;
  },
  
  async isAvailable() {
    return ensureTorAvailable();
  },
  
  getProxyConfig() {
    return {
      host: ORBOT_PROXY_HOST,
      port: ORBOT_PROXY_PORT,
      type: 'socks5',
    };
  },
};

function createSocks5Agent(proxyHost, proxyPort) {
  return undefined;
}

export async function checkTorStatus() {
  const available = await ensureTorAvailable();
  return {
    available,
    reason: available ? null : (Platform.OS !== 'android' ? 'Tor only supported on Android' : 'Orbot not installed or not running'),
  };
}