import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const PRIVACY_PREF_KEY = '@MyZubster:privacy_preferences';

const DEFAULT_PRIVACY_PREFS = {
  useTorProxy: false,
};

function applyTorPreference(enabled) {
  if (enabled) api.defaults.headers.common['X-Tor-Requested'] = 'true';
  else delete api.defaults.headers.common['X-Tor-Requested'];
}

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
  const next = { ...prefs, useTorProxy: Boolean(enabled) };
  await AsyncStorage.setItem(PRIVACY_PREF_KEY, JSON.stringify(next));
  applyTorPreference(next.useTorProxy);
  return next;
}

export async function initPrivacyPreferences() {
  const prefs = await getPrivacyPreferences();
  applyTorPreference(prefs.useTorProxy);
  return prefs;
}
