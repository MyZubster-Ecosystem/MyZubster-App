import appConfig from '../../app.json';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../services/notificationPreferences';

describe('new mobile issue contracts', () => {
  test('native permissions and deep-link scheme are declared', () => {
    expect(appConfig.expo.scheme).toBe('myzubster');
    expect(appConfig.expo.android.permissions).toEqual(expect.arrayContaining([
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'POST_NOTIFICATIONS',
    ]));
    expect(appConfig.expo.plugins).toEqual(expect.arrayContaining(['expo-notifications', 'expo-location', 'expo-secure-store']));
  });

  test('notification preferences default to all marketplace event types enabled', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({ orders: true, payments: true, messages: true, reviews: true });
  });
});
