import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEmail, isValidPassword, normalizeWalletAddress } from '../utils/validators';
import { isBiometricEnabled, setBiometricEnabled, isBiometricUnlocked, setBiometricUnlocked, clearBiometricData } from '../services/biometricService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('auth contracts', () => {
  describe('validators', () => {
    test('validates correct email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    test('rejects invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });

    test('validates password length', () => {
      expect(isValidPassword('123456')).toBe(true);
      expect(isValidPassword('12345')).toBe(false);
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword(null)).toBe(false);
    });

    test('normalizes wallet address', () => {
      expect(normalizeWalletAddress(' 4A123... ')).toBe('4A123...');
      expect(normalizeWalletAddress('')).toBe('');
      expect(normalizeWalletAddress(null)).toBe('');
    });
  });

  describe('biometricService', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('reads biometric enabled preference', async () => {
      AsyncStorage.getItem.mockResolvedValue('true');
      const result = await isBiometricEnabled();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@MyZubster:biometricEnabled');
      expect(result).toBe(true);
    });

    test('writes biometric enabled preference', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await setBiometricEnabled(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@MyZubster:biometricEnabled', 'true');
    });

    test('reads biometric unlocked state', async () => {
      AsyncStorage.getItem.mockResolvedValue('true');
      const result = await isBiometricUnlocked();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@MyZubster:biometricUnlocked');
      expect(result).toBe(true);
    });

    test('writes biometric unlocked state', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await setBiometricUnlocked(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@MyZubster:biometricUnlocked', 'false');
    });

    test('clears biometric data', async () => {
      AsyncStorage.removeItem.mockResolvedValue();
      await clearBiometricData();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MyZubster:biometricEnabled');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MyZubster:biometricUnlocked');
    });
  });
});
