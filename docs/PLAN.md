# ElectriKa mobile: build plan

The mobile app is for **everyone**: customers, engineers and every office role, each with their own dashboard. The Program Manager is the super admin and also gets the admin console. Nobody is sent to the website.

- **Backend:** the existing Django app at `../total-care-plan-app`, live at https://electrika.ng. The mobile app talks only to `/api/` (`docs/mobile-api.md` there).
- **This app:** Expo SDK 58, React Native 0.88, expo-router (file-based routes in `src/app/`), TypeScript, **Redux Toolkit** for state, **NativeWind (Tailwind)** for styling, **sonner-native** for toasts, expo-secure-store for the sign-in token. Package manager: pnpm 10, pinned in `package.json` (run it as `corepack pnpm`).

## Where things stand (19 Nov 2026)

**Built: the whole app, 93 screens.**

- **How it's put together**
  - `src/store/`: Redux Toolkit slices with thunks and selectors. `session` (sign-in, sign-up, profile, photo), `settings` (language), `resources` (server data cached by API path; `fetchResource`, `performAction`), `cart` (kept on the phone), `journey` (duty, on my way, arrived), `console` (the PM's lock). A listener middleware keeps the language in step, saves the cart, and signs the phone out on any 401.
  - `src/store/hooks.ts`: `useResource(path)` for screen data (refetches on focus, on language change, after actions, and polls where asked); `useAction()` for changes, with success and error toasts.
  - `src/components/ui/`: the Tailwind UI kit (buttons, fields, chips, cards, hero card, skeletons, empty states, banners, photo strip, sheets). Quick tasks use sheets (`Sheet`, `ConfirmSheet`) instead of extra screens.
  - `src/types/api.ts`: the API's shapes.
- **Customers:** home, activity, Shop (catalogue, product, quote, cart, checkout with Paystack, orders), emergency (plan or one-off, GPS address, guest code), repair booking in 3 steps, request status, live tracking, plans and the free assessment, design and partner enquiries, places with map pins, visits and reports, invoices (Paystack or transfer), care (logbook, monthly check, "I noticed something", guides, safety), protections and concerns, power reports, account (details, photo, password, phones, notifications, download data, close account).
- **Engineers:** my jobs with the duty switch, job page (on my way with a one-time location consent, background location sharing, arrived with site pin, directions, call), job report (findings, parts, photos, first-time fix), done, ID card and working days.
- **Dispatch:** board with filters, assign and cancel sheets, review timing, resend tracking, log a job, report sign-off (the four checks, approve, send back), Shop orders.
- **Account Managers:** today (renewals, owing, concerns, follow-ups, late responses), new requests (take, close), client page, partners, quotes, products, power reports (take, move on, updates, evidence pack).
- **Accounts:** money in today, confirming transfers, invoices and reminders, orders.
- **Program Manager:** today (KPIs, plan mix, plans ending, scheduler health), everything above, the team's month, and the console (records, people, audit, system) behind its per-phone lock.
- **English and Igbo** across the app. Igbo comes from the website's catalogue where the words match (`src/i18n/screens.ig.ts`); anything else shows in English until translated.
- **Checks:** `pnpm check` (typecheck, lint, 62 Jest tests), `pnpm doctor` 20/20, iOS and Android bundles build.

**Still to do**
- **On a real phone:** `eas init` (push needs its project id), then a development build. Push, background location and Paystack's return to the app can only be proven there.
- **Maps:** tracking shows ETA, distance and "see on map" (opens Google Maps). An in-app map needs `expo-maps` and a Google Maps key for Android.
- **Igbo review:** a native speaker should check the newer text, and translate what still shows in English.
- **Release (Phase 4 below).**

## Phase 0: backend API (Django repo, `apps/api`)

**Auth.** Add `rest_framework.authtoken` and these endpoints:
- `POST /api/auth/token/`: phone or email plus password, returns `{token, user}`. Reuse the web's sign-in throttling.
- `POST /api/auth/logout/`: deletes the token.
- `POST /api/auth/signup/`, `POST /api/auth/verify/`: the same flow as `front:signup`, including the text or email code.
- `POST /api/auth/forgot/`: the same as `forgot_password`.
- `GET/PATCH /api/me/`: name, email, `preferred_channel`. `POST/DELETE /api/me/photo/` reuses `apps/accounts/avatars.py`.
- `POST /api/me/push-token/`: saves the Expo push token. `apps/notifications` must also send Expo push alongside web push.

**Rules for every endpoint:**
- Reuse the existing services and models, never copy their logic. For example, `apps.shop.services`, dispatch status changes and `apps.sites.pins`.
- Apply the same permission as the matching web view. For example, `role_required(CLIENT)` becomes a DRF permission class.
- Tests go next to the existing ones.

**Customer endpoints**, each matching a web page:

| Mobile | Web today |
|---|---|
| Home summary: plan, next visit, open jobs | `clients:portal_home`, `front:account` |
| Emergency request, with location and address autofill | `front:emergency`, `clients:portal_raise_emergency`, `/geo/reverse/`, `/geo/suggest/` |
| Book a repair (details, review) | `front:repair*` |
| Design and build, partners, plans and join | `front:design_build`, `front:partners`, `front:plans`, `front:plan_request` |
| Live tracking of the engineer | `clients:portal_track(+live)`, `track_public` |
| Activity, visits and reports (PDF) | `front:activity`, `clients:portal_visits`, `report_public_pdf` |
| Invoices and payments (Paystack) | `clients:portal_invoices`, `apps/billing` |
| Notifications | `front:notifications` |
| Places: add, pin on map, edit | `front:add_place`, `front:pin_place` |
| Care: self-check, noticed, before a visit, guides, emergency card, stay safe | `apps/care` |
| Protections and concerns | `apps/protection` |
| Power reports (Voice): report, track, confirm | `apps/voice` (public side) |
| Shop: catalogue, product, quote, cart, checkout, order status, pay | `apps/shop` |
| Account: details, password, language (en/ig), download data, close account | `front:edit_details`, `front:change_password`, `front:download_data`, `front:delete_account` |

**Engineer endpoints:**

| Mobile | Web today |
|---|---|
| My jobs and on-duty switch | `dispatch:my_jobs`, `dispatch:toggle_duty` |
| Job detail, on my way, arrived | `dispatch:job_detail`, `job_on_my_way`, `job_arrived` |
| Live location while on the way | `dispatch:job_location` |
| Job report: photos, parts, sign-off; fixing a sent-back report | `apps/reports` |
| Done this month | `dispatch:my_done` |
| Me: ID card, working days, stats, profile | `dispatch:me`, `profile` |

## Phase 1: app foundations

- Sign-up with code, forgot password, and the profile screens.
- Shared UI kit, built on `src/components/ui.tsx`: list rows, status pills, empty states, skeleton loading, toasts and haptics.
- English and Igbo strings. The web's `locale/ig` catalogue is the source of truth.
- Push notifications. This needs an EAS project ID and a development build, because Expo Go has no push support on Android.
- Deep links (`electrika://`, and https links to electrika.ng) for tracking and report links sent by text.

## Phase 2: customer app

Emergency first. Then booking, tracking, activity and reports, invoices and payment, places, care and protections, Voice, Shop, then account.

## Phase 3: engineer app

My jobs, then job flow and live location, then reports with photos, then Done and Me.

Background location while "on my way" needs the `expo-location` background permission, configured in `app.json`.

## Phase 4: release

- EAS project, app icons at 1024 px, store listings.
- Builds with `eas build`: an internal test track first, then Play Store and App Store.
- OTA updates with `eas update`.

## Fixes, 20 Nov 2026

- Brand: the PWA's logo as app icon, native splash (#0051A2 with the mark) and an
  in-app launch animation matching templates/pwa/_splash.html; hero cards in flat
  #0051A2 (no glass or gradient); the logo on the sign-in screens.
- "Couldn't find a LinkingContext context": a selected pill added Tailwind's
  shadow-sm (CSS variables), making NativeWind upgrade the component; its dev
  warning walked the props into React internals and hit the router's context.
  Selected pills now use the `raised` style instead.
- Forgotten password by 6-digit code (Django apps/accounts/reset.py), with a
  6-box CodeInput on every code screen.
- Forms: Screen and Sheet pad for the keyboard and scroll the focused field into
  view; checks before sending (src/lib/validate.ts) with errors under fields;
  action results as toasts. Sheets are sized to their content.
- Status bar follows the screen (useStatusBarStyle). Profile photos: JPEG from
  the iOS picker, shown with the app's token (the server's /files/ view now
  accepts it), and a new file name for each new photo.
- Development: EXPO_PUBLIC_API_URL points the app at a local server.

## Rules for building

- Read `AGENTS.md`. Check the SDK 58 docs before using any Expo API.
- Add packages with `corepack pnpm expo install <pkg>`, never `pnpm add`, for native modules.
- Style with Tailwind classes (`className`), never new StyleSheets. Server data goes through `useResource` / `useAction`; app state through a Redux slice.
- Before calling anything done, run `corepack pnpm check` and `corepack pnpm doctor`.
- No secrets in the app. The only key it holds is the user's own token, in secure storage.
