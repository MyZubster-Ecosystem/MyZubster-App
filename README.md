# MyZubster App

React Native/Expo 51 Android client for the MyZubster Gateway. The app provides unified and anonymous authentication, profiles, marketplace orders, Monero payment QR codes, reviews, geolocated skills, push notifications, a Gateway-backed wallet screen, and Orbot privacy controls.

## Development

```bash
npm ci
npx expo start
```

Set the Gateway URL in `app.json` (`expo.extra.apiUrl`) or with `EXPO_PUBLIC_API_URL`. The current client expects the Gateway under `/api` and uses `/auth/login`, `/auth/register`, `/orders`, and the wallet contract below.

## Gateway contracts

The order API creates a payment subaddress and returns `moneroAddress`, `moneroAmount`, `status`, `confirmations`, and `amountReceived`. The wallet screen expects:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/wallet` | balance and current address |
| GET | `/api/wallet/transactions` | wallet transaction history |
| POST | `/api/wallet/address` | create a receive address (`label`) |
| POST | `/api/wallet/transfer` | send XMR (`address`, `amount`, optional `paymentId`) |

Wallet endpoints must be implemented and authenticated by the Gateway before the mobile wallet can send funds. The app never stores spend keys in AsyncStorage.

The additional mobile flows use these Gateway contracts:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/monero/challenge` | Return a one-time message for a wallet address |
| POST | `/api/auth/monero/verify` | Verify `{ walletAddress, nickname, message, signature }` and return a JWT/user |
| GET | `/api/auth/me` or `/api/users/me` | Restore the authenticated profile |
| PUT | `/api/users/me` or `/api/users/:id` | Update name, username, email, and public wallet address |
| GET | `/api/reviews/target/:id` | Review history for a user/skill |
| GET | `/api/reviews/stats/:id` | Average, count, and rating distribution |
| POST | `/api/reviews` | Create a review after a completed order |
| GET | `/api/skills` | Skills/offers; accepts category, latitude, longitude, and radiusKm filters |
| GET | `/api/notifications` | Notification inbox |
| PUT | `/api/notifications/:id/read` | Mark one notification read |
| PUT | `/api/notifications/read-all` | Mark all notifications read |
| POST | `/api/notifications/devices` | Register an Expo/FCM device token |
| PUT | `/api/notifications/preferences` | Persist notification preferences |

Anonymous authentication intentionally requires the wallet to sign the server-issued challenge. The client never receives or stores a private key and never fabricates a signature.

## Native build requirements

QR scanning uses `expo-camera`, maps use `react-native-maps` plus `expo-location`, notifications use `expo-notifications`, and secure token storage uses `expo-secure-store`; use a development build after installing native dependencies:

```bash
npx expo prebuild --clean
npx expo run:android
```

The Orbot screen can detect and start Orbot, but reporting an anonymous API connection requires a native SOCKS5 proxy module and a development build. Starting Orbot alone is not treated as full traffic tunnelling.

## Checks

```bash
npm test -- --runInBand
npx expo export --platform android --no-bytecode --output-dir /tmp/myzubster-export
```

The `--no-bytecode` export is a Metro/Expo smoke check. A release Android build must be run on a machine with Android SDK/Gradle and a configured Gateway/Monero wallet RPC.

## Related projects

- [MyZubster Gateway](https://github.com/MyZubster-Ecosystem/MyZubsterGateway)
- [MyZubster Marketplace](https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace)
