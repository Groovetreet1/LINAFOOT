# AtlasFoot Android Sandbox

Expo SDK 58 Android app using Expo Router. All balances and bets are virtual demo credits.

```powershell
Copy-Item .env.example .env
npm install
npm run android
```

- Emulator default API: `http://10.0.2.2:3000/api/v1`.
- Physical device: set `EXPO_PUBLIC_API_URL` to the backend LAN address for local development.
- Restart Expo after changing `.env`.
- Production requires HTTPS; no real payment or wagering feature is present.

Local web preview: `npm run web`, then open `http://localhost:8081`. Browser sessions use localStorage for this sandbox preview only; Android uses SecureStore.

Validation: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
