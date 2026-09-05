import AsyncStorage from '@react-native-async-storage/async-storage';
import { gatewayTransport } from './gatewayTransportService';

const PRIVACY_PREF_KEY = '@MyZubster:privacy_preferences';

const DEFAULT_PRIVACY_PREFS = {
  useTorProxy: false,
};

export async function getPrivacyPreferences() {
  const raw = await AsyncStorage.getItem(PRIVACY_PREF_KEY);
  if (!raw) return DEFAULT_PRIVACY_PREFS;
  try {
    return { ...DEFAULT_PRIVACY_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRIVACY_PREFS;
  }
}

export async function setUseTorProxy(enabled) {
  const prefs = await getPrivacyPreferences();
  const transport = enabled
    ? await gatewayTransport.enableTor()
    : gatewayTransport.useDirect();
  const next = { ...prefs, useTorProxy: transport.mode === 'tor' };
  await AsyncStorage.setItem(PRIVACY_PREF_KEY, JSON.stringify(next));
  return { ...next, transport };
}

export async function initPrivacyPreferences() {
  const prefs = await getPrivacyPreferences();
  if (!prefs.useTorProxy) {
    gatewayTransport.useDirect();
    return prefs;
  }
  try {
    await gatewayTransport.enableTor();
    return prefs;
  } catch {
    const next = { ...prefs, useTorProxy: false };
    await AsyncStorage.setItem(PRIVACY_PREF_KEY, JSON.stringify(next));
    return next;
  }
}

export function getGatewayTransportStatus() {
  return gatewayTransport.snapshot();
}
