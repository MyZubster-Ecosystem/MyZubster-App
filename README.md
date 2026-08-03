# MyZubster App

React Native/Expo 51 Android client for the MyZubster Gateway. The app provides authentication, order tracking, Monero payment QR codes, a Gateway-backed wallet screen, and Orbot privacy controls.

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

## Native build requirements

QR scanning uses `expo-camera` and QR rendering uses `react-native-svg`; use a development build after installing native dependencies:

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

---

## 🔍 Project Status (Real)

| Feature | Status | Note |
|---------|--------|------|
| Robot DNA Schema | ✅ Complete | Production ready |
| x402 Micropayments | 🔄 In Progress | Testnet only |
| Monero Escrow | 🔄 In Progress | Testnet only |
| Self-Replication | 🧪 Simulation | Software simulation only |
| FCMP++ Integration | 🔄 In Progress | `FCMP_ENABLED=false` |
| Geolocation | 🔄 In Progress | 50-100m accuracy |
| Animal Registry | ✅ Complete | Production ready |

## 🤖 Transparency Note

This project uses automation (bots) to help manage issues, PRs, and bounties. All automated actions are reviewed by human maintainers before final decisions are made.

- **Bot account:** @myzubster-bot (coming soon)
- **Automated tasks:** Issue triage, PR validation, bounty tracking
- **Human review:** Every PR is reviewed by at least one maintainer

## ⚠️ Known Limitations

- FCMP++ is currently disabled (`FCMP_ENABLED=false`)
- x402 features are on testnet only
- Self-replication is software simulation, not hardware
- Geolocation accuracy is 50-100m (improvement planned)

