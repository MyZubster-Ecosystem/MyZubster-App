# MyZubster App

React Native / Expo client for the MyZubster ecosystem.

## Status

**Development / active validation.** The app contains client flows for authentication, orders, payment QR/wallet-facing contracts and privacy/Orbot experiments. Backend capabilities must be verified against the configured Gateway before a UI flow is treated as operational.

## Development

```bash
npm ci
npx expo start
```

Configure the Gateway URL in `app.json` (`expo.extra.apiUrl`) or through `EXPO_PUBLIC_API_URL` where supported.

## Gateway contracts

The client uses Gateway API contracts for authentication/orders and wallet-facing operations. The wallet UI may expect endpoints such as:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/wallet` | balance/current address |
| GET | `/api/wallet/transactions` | transaction history |
| POST | `/api/wallet/address` | create receive address |
| POST | `/api/wallet/transfer` | submit transfer request |

A client screen or API request does **not** prove that a real payment rail is available or that a transaction was externally settled. Gateway/verifier state is authoritative for external settlement.

## Native build

QR scanning/rendering and Orbot-related functionality may require a development/native build rather than Expo Go.

```bash
npx expo prebuild --clean
npx expo run:android
```

Starting Orbot alone is not proof that all application traffic is tunnelled through Tor. Proxy routing must be verified independently.

## Checks

```bash
npm test -- --runInBand
npx expo export --platform android --no-bytecode --output-dir /tmp/myzubster-export
```

A production Android release additionally requires a supported Android SDK/Gradle environment and correctly configured backend services.

## Bounties

Work in this repository may be associated with a MyZubster bounty only when the issue defines the deliverable, evidence, review and reward terms.

- [Canonical Bounty System](https://github.com/MyZubster-Ecosystem/myzubster/blob/main/BOUNTIES.md)
- [Ecosystem Architecture](https://github.com/MyZubster-Ecosystem/myzubster/blob/main/docs/ECOSYSTEM.md)

MYZ in the current core platform is an internal reward/accounting ledger. Issue closure or PR merge is not proof of an external XMR/token payment.

See `BOUNTIES.md` for repository-specific scope.

## Security and privacy

- Never store wallet seed phrases/private keys in AsyncStorage or source control.
- Treat authentication tokens as secrets.
- Do not represent testnet/simulation state as production settlement.
- Verify Tor/proxy behavior rather than inferring it from an installed/running app.

## Related projects

- [myzubster](https://github.com/MyZubster-Ecosystem/myzubster)
- [MyZubster Gateway](https://github.com/MyZubster-Ecosystem/MyZubsterGateway)
- [MyZubster Marketplace](https://github.com/MyZubster-Ecosystem/MyZubster-Marketplace)
- [myzubster-docs](https://github.com/MyZubster-Ecosystem/myzubster-docs)

## Transparency

Automation may assist with issue/PR/bounty workflows, but sensitive changes, bounty verification and settlement decisions require appropriate human/independent review.
