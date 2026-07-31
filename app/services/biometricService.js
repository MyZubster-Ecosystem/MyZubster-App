import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@MyZubster:biometricEnabled';
const BIOMETRIC_UNLOCKED_KEY = '@MyZubster:biometricUnlocked';

const unlockListeners = new Set();

export function onBiometricUnlocked(listener) {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

export async function isBiometricEnabled() {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Unable to read biometric preference:', error?.message || error);
    return false;
  }
}

export async function setBiometricEnabled(enabled) {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, String(!!enabled));
  } catch (error) {
    console.warn('Unable to save biometric preference:', error?.message || error);
    throw error;
  }
}

export async function isBiometricUnlocked() {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_UNLOCKED_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Unable to read biometric unlock state:', error?.message || error);
    return false;
  }
}

export async function setBiometricUnlocked(unlocked) {
  try {
    await AsyncStorage.setItem(BIOMETRIC_UNLOCKED_KEY, String(!!unlocked));
    if (unlocked) {
      unlockListeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.warn('Biometric unlock listener failed:', error?.message || error);
        }
      });
    }
  } catch (error) {
    console.warn('Unable to save biometric unlock state:', error?.message || error);
    throw error;
  }
}

export async function clearBiometricData() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY),
      AsyncStorage.removeItem(BIOMETRIC_UNLOCKED_KEY),
    ]);
  } catch (error) {
    console.warn('Unable to clear biometric data:', error?.message || error);
  }
}
