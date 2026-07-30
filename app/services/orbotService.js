import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ORBOT_URI = 'orbot://';
const ORBOT_STATE_KEY = '@MyZubster:orbot_requested';

export async function isOrbotInstalled() {
  if (Platform.OS !== 'android') return false;
  try { return await Linking.canOpenURL(ORBOT_URI); } catch { return false; }
}

export async function getOrbotStatus() {
  const installed = await isOrbotInstalled();
  const requested = (await AsyncStorage.getItem(ORBOT_STATE_KEY)) === 'true';
  return {
    installed,
    requested,
    // Starting Orbot does not make React Native sockets use SOCKS5. A native
    // proxy module is still required before this can be reported as tunneled.
    trafficTunneled: false,
    nativeProxyAvailable: false,
  };
}

export async function connectOrbot() {
  if (!(await isOrbotInstalled())) return { installed: false, requested: false };
  await Linking.openURL('orbot://connect');
  await AsyncStorage.setItem(ORBOT_STATE_KEY, 'true');
  return getOrbotStatus();
}

export async function disconnectOrbot() {
  try { await Linking.openURL('orbot://disconnect'); } catch { /* best effort */ }
  await AsyncStorage.removeItem(ORBOT_STATE_KEY);
  return getOrbotStatus();
}

export async function verifyAnonymousIp() {
  const response = await fetch('https://check.torproject.org/api/ip');
  if (!response.ok) throw new Error(`Tor check failed (${response.status})`);
  const data = await response.json();
  return { ip: data.IP || data.ip || null, isTor: data.IsTor === true || data.istor === true };
}

// Backwards-compatible helpers for existing dashboard code.
export async function isOrbotConnected() {
  const status = await getOrbotStatus();
  return status.requested && status.trafficTunneled;
}
