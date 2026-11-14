# AtlasFoot Sandbox

Android football prediction MVP with **virtual credits only**. It is not a real-money betting product: there are no deposits, withdrawals, payment providers, cash prizes, or real-money wagers.

## Included

- Native Android experience built with Expo/React Native and Expo Router
- Fastify/TypeScript backend with persistent SQLite storage for the local sandbox
- Live and upcoming seeded football fixtures, 1/X/2 odds, and bet slips
- Atomic wallet debits, idempotent bets, transaction history, and pending bet history
- Secure Store session persistence; hashed opaque API tokens, Helmet, rate limiting, and Zod server validation
- Oracle Cloud production direction documented below; local development does not require OCI

## Project layout

```text
backend/   Fastify API + local SQLite sandbox database
mobile/    Android application (Expo SDK 58)
deploy/    Oracle Cloud production deployment notes
```

## Quick start

### 1. Start the API

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens at `http://localhost:3000`; health check: `GET /health`.

### 2. Start Android

Keep the API running, then from another terminal:

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npm run android
```

For an Android emulator, the mobile app uses `http://10.0.2.2:3000/api/v1` by default. For a physical device, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to your development machine's LAN address, for example `http://192.168.1.20:3000/api/v1`, set `HOST=0.0.0.0` in `backend/.env`, allow the local development port through your host firewall, and ensure the device is on the same trusted network. Restart both services after changing environment variables.

The backend seeds demo fixtures. A sports-data/odds provider and an administrative settlement workflow must be integrated before real competitions can be supported reliably.

### Local web preview

```powershell
cd mobile
npm run web
```

Open `http://localhost:8081`. The API allows this local development origin through `CORS_ORIGINS`. Web preview sessions use browser localStorage; Android sessions continue to use encrypted SecureStore. The web preview is for the sandbox, not production authentication.

## Security and scope

The backend—not the Android client—is authoritative for odds, balance checks, wallet mutations, and idempotency. Local HTTP is for development only; production must use HTTPS. No software can truthfully guarantee zero bugs or zero intrusions. Before any production handling of users, add managed secrets, backups, monitoring, audit review, dependency scanning, integration/end-to-end testing, and an independent penetration test.

## Real-money boundary

Real-money functionality remains deliberately out of this repository. Launching it in Morocco requires prior specialist legal review, the necessary authorization/licensing or an authorized operating partner, age and identity controls, AML controls, responsible-gambling mechanisms, approved payment providers, and an external security assessment. Do not activate real-money operations simply by changing the sandbox wallet.

## Oracle Cloud direction

The intended production target is Oracle Cloud Infrastructure (OCI): private application networking, OCI Load Balancer and Web Application Firewall, OCI Vault, Oracle-managed database, private Object Storage backups, and OCI Monitoring/Logging. See `deploy/oci/README.md`. No cloud resources are created automatically.

## Verification

```powershell
cd backend; npm test; npm run typecheck; npm run build
cd ..\mobile; npx tsc --noEmit; npx expo lint; npx expo-doctor
```
