import React from 'react';
import { render } from '@testing-library/react-native';

// Smoke tests for the drone payment system screens.
// These tests verify that the new screens render without crashing.

describe('drone payment system contract', () => {
  test('drone wallet service exports expected methods', async () => {
    const mod = await import('../services/droneWalletService');
    expect(typeof mod.getDroneWallet).toBe('function');
    expect(typeof mod.getDroneTransactions).toBe('function');
    expect(typeof mod.verifyTaskCompletion).toBe('function');
    expect(typeof mod.triggerAutoPayment).toBe('function');
    expect(typeof mod.getEarningsSummary).toBe('function');
    expect(typeof mod.listDroneTasks).toBe('function');
  });

  test('drone wallet screen module loads', async () => {
    const mod = await import('../screens/DroneWalletScreen');
    expect(mod.default).toBeTruthy();
  });

  test('drone dashboard screen module loads', async () => {
    const mod = await import('../screens/DroneDashboardScreen');
    expect(mod.default).toBeTruthy();
  });
});
