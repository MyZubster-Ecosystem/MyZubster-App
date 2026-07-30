# Bounty #5 — Push Notifications

## What was implemented

- `app/services/notificationService.js`
  - Permission request
  - Android notification channels (`orders`, `default`)
  - Expo push token registration (FCM-backed on Android when project configured)
  - Foreground/background-style handlers
  - Per-type enable/disable settings
  - Notification history + unread badge count helpers
  - Deep-link payload fields (`orderId`, `deepLink`)
- `app/screens/NotificationSettingsScreen.js`
- `app/screens/NotificationHistoryScreen.js`
- Wired into `App.js` navigation + listener lifecycle
- Dashboard shortcuts to history/settings
- Fixed corrupted `AuthContext.js` (repo previously contained pasted chat text and would not parse)

## Notification types covered

- Order Confirmed
- Order Completed
- Order Cancelled
- Payment Reminder
- Dividend Received
- Token Listing
- Price Alert

## Notes

- Uses `expo-notifications` (standard for Expo SDK 51 apps). This provides the FCM integration path on Android through Expo's push service / credentials.
- If you later add `@react-native-firebase/messaging`, the service already exposes FCM-shaped helpers (`setupNotifications`, background handler shim) so migration is straightforward.

## Test

```bash
node --test app/__tests__/notificationService.test.js
```
