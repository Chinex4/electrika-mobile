# ElectriKa mobile

The ElectriKa app for customers and engineers, built with Expo and React Native. It uses the Django backend in `../total-care-plan-app`, which is live at https://electrika.ng.

## Run it

```bash
corepack pnpm install
corepack pnpm start
```

Then open the app in Expo Go: scan the QR code, or press `i` for the iOS simulator or `a` for Android. Push notifications and background location need a development build: `corepack pnpm expo run:ios` or `run:android`.

The backend address is in `app.json` under `expo.extra.apiUrl`. To test against a local Django server, point it at your computer's LAN address, for example `http://192.168.x.x:8000/api`.

## Checks

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm doctor
```

## Layout

- `src/app/`: screens (expo-router). `(customer)` holds the customer tabs and `(tech)` the engineer tabs.
- `src/api/client.ts`: talks to `/api/`, with the token kept in secure storage.
- `src/auth/session.tsx`: sign in, sign out, and who's signed in.
- `src/theme/tokens.ts`: ElectriKa colours and spacing.
- `docs/PLAN.md`: what's built and what's next.
