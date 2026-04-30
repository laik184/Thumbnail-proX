# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Mobile artifact (`artifacts/mobile`) — Pro Thumbnail Master

Expo SDK 54 React Native app using `expo-router` (typed routes). Routes are grouped:

- `app/index.tsx` — splash (~700ms). On first launch it routes to `/welcome`; on every subsequent launch it routes straight to `/home`. Decision is gated by `WELCOME_SEEN_KEY` in AsyncStorage.
- `app/welcome.tsx` — **first-launch landing page**, swipeable 4-slide carousel with a premium feel. Each slide has its own gradient hue + animated UI mock previewing a real feature:
  1. Intro — pulsing brand mark with "Swipe to explore" hint
  2. Download — mock URL bar + 4K thumbnail preview + quality chips (uses a real YouTube thumbnail image)
  3. Edit — mock canvas with selection handles + tools row + "Tap any text to edit" hint chip
  4. Ready — benefits checklist + "Get Started — Free" CTA
  Page dots animate (active dot expands to 24px). "Skip" link top-right and the "Next/Get Started" CTA both set `WELCOME_SEEN_KEY` so the screen is seen exactly once.
- `app/onboarding.tsx` — opt-in 3-page tour (still triggered from the home "New here?" tip card; not part of the first-launch path)
- `app/(tabs)/_layout.tsx` — bottom tab bar (Home · Create · **Download (elevated centre)** · History · Settings). Download is the elevated centre action because downloading thumbnails is the app's primary purpose.
  - `home.tsx`, `download.tsx`, `create.tsx`, `history.tsx`, `settings.tsx`
- `app/pricing.tsx` — IAP upgrade screen
- `app/about.tsx`, `app/privacy.tsx`, `app/terms.tsx` — static info pages

The `(tabs)` group is a route group, so the public paths stay flat (`/home`, `/download`, etc).

### Ads (Google Mobile Ads / AdMob)

- Package: `react-native-google-mobile-ads` (native — needs an EAS build, not Expo Go)
- Wrapper: `lib/ads.ts` (native) + `lib/ads.web.ts` (web stub). Metro picks the `.web.ts`
  variant on web automatically, so the native package never enters the web bundle.
- `app.json` ships **Google's official sandbox AdMob App IDs**
  (`ca-app-pub-3940256099942544~3347511713` Android, `~1458002511` iOS) so the SDK does
  not crash a release build. Replace these with your real AdMob App IDs before publishing.
- In dev (`__DEV__`), banners use `TestIds.BANNER` automatically. In release, swap
  `PROD_BANNER_UNIT_ID` in `lib/ads.ts` for your real ad unit IDs.
- iOS App Tracking Transparency (ATT) and UMP consent are wired into `initializeAds()`
  in `app/_layout.tsx` and run once at app start.

### In-App Purchases (Google Play Billing / StoreKit)

- Package: `react-native-iap` (native — needs an EAS build, not Expo Go)
- Wrapper: `lib/iap.ts` (native) + `lib/iap.web.ts` (web stub).
- SKUs (matched in Play Console & App Store Connect):
  - `pro_lifetime` — non-consumable / one-time purchase
  - `pro_monthly` — auto-renewing subscription
- `app/pricing.tsx` fetches localised prices via `fetchProducts()`, calls `purchase()`
  for the selected plan, and exposes a "Restore purchases" link via `restorePurchases()`.
- In Expo Go / web, purchase falls back to a local "trial" alert that simply flips
  `removeAds = true` so the PRO experience can be tested.

### Retention features

- **Auto-save to gallery** (default ON, toggle in Settings → Preferences). Once a YouTube
  thumbnail loads in `download.tsx`, it's saved silently and a non-blocking toast is
  shown. Same flow runs for the centre Download tab.
- **D3 re-engagement notification** (`lib/reengagement.ts`). On first launch we schedule
  a single local notification 3 days out — only if the user has granted notification
  permission AND has not exported anything yet. Idempotent via `@reengagement_scheduled_v1`.
- **Notification opt-in prompt** in `download.tsx` fires once after the user's first
  successful save, gated by `@notifs_prompted_after_download_v1`. Uses the existing
  `setNotificationsEnabled()` flow which handles the system permission dialog.
- **Deep-link / share-intent handler** (`DeepLinkHandler` in `app/_layout.tsx`). When
  the OS opens our app with a URL (Android intent VIEW filter — already configured for
  YouTube domains), we extract the video ID and forward to `/(tabs)/download?url=…`.
  Handles both cold-start (`Linking.useURL`) and warm-app (`Linking.addEventListener("url")`).
- **Tap-to-edit hint** in `create.tsx`. Floating chip ("Tap any text to edit · long-press
  the trash icon to delete") appears over the canvas when a template is loaded with text
  layers but nothing is selected; vanishes the moment the user taps anything.
- **Notification handler** (`Notifications.setNotificationHandler` in `app/_layout.tsx`)
  shows banners + plays sound even when the app is in foreground, and routes notification
  taps to the `route` field in their `data` payload.

### Color psychology tokens

`constants/colors.ts` carries semantic tokens beyond the cyan/violet brand pair, applied
where research-backed psychology lifts the metric:

- `action` (`#FF8C00` dark / `#EA580C` light) + `actionGradient*` — warm orange used for
  the primary "Get Thumbnail" CTA on `home.tsx`. Warm CTAs lift CTR vs. cool ones in
  conversion testing.
- `success` (`#00C896` dark / `#00A878` light) — green save/download confirmation toast
  in `download.tsx`. Universal success signal (WhatsApp/banking apps).
- `premium` (`#FFD700` dark / `#D4A300` light) + `premiumGradient*` — gold styling on the
  PRO Lifetime card and PRO comparison column in `pricing.tsx` (border, gradient CTA,
  award icon, comparison heading). Gold = luxury/exclusivity → IAP conversion lift.

Cyan (`primary`) + Violet (`accent`) remain the brand identity for navigation, hero
gradients, headers, and creative tools (Twitch/Adobe-style creator vibe). Hot pink
(`destructive`) stays for delete/error.

> Note: Android `SEND` text/plain share intent is registered in `app.json` but Expo's
> `Linking` module only surfaces `VIEW` intents. To capture cross-app shares from the
> YouTube app's "Share → Pro Thumbnail Master" flow, we'd need `expo-share-intent` (a
> native config plugin). Tracked as a future enhancement.

### Publishing checklist (mobile)

1. Replace AdMob app IDs and ad unit IDs (`app.json` + `lib/ads.ts`).
2. Create the `pro_lifetime` and `pro_monthly` products in Play Console & App Store Connect.
3. Run `pnpm --filter @workspace/mobile exec eas build --profile preview --platform android`
   to test ads + IAP on a real device (Expo Go cannot load the native modules).
4. Use a Play Console "Closed testing" track + licensed tester for IAP testing.
