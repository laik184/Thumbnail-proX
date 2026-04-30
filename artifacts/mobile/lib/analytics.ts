import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Firebase / Google Analytics safe wrapper.
 *
 * Same pattern as `lib/ads.ts`:
 *   - `@react-native-firebase/analytics` is a NATIVE module — needs an EAS dev/prod
 *     build. In Expo Go, web preview, and tests it's not present, so we lazily
 *     require it and silently no-op when it's not available.
 *   - Web platform uses `lib/analytics.web.ts` (Metro picks the `.web.ts` variant
 *     automatically), so the native package never enters the web bundle.
 *
 * Setup checklist (Android):
 *   1. Drop `google-services.json` from Firebase Console into `artifacts/mobile/`
 *   2. `app.json` already references it via `android.googleServicesFile`
 *   3. Run `eas build --profile development --platform android` (or production)
 *
 * Setup checklist (iOS):
 *   1. Drop `GoogleService-Info.plist` into `artifacts/mobile/`
 *   2. `app.json` references it via `ios.googleServicesFile`
 *   3. Run `eas build --profile development --platform ios` (or production)
 */

const isExpoGo = Constants.appOwnership === "expo";
const isWeb = Platform.OS === "web";

export const isAnalyticsAvailable = !isExpoGo && !isWeb;

type AnalyticsModule = {
  default: () => {
    logEvent: (name: string, params?: Record<string, unknown>) => Promise<void>;
    logScreenView: (params: { screen_name: string; screen_class?: string }) => Promise<void>;
    setUserId: (id: string | null) => Promise<void>;
    setUserProperty: (name: string, value: string | null) => Promise<void>;
    setAnalyticsCollectionEnabled: (enabled: boolean) => Promise<void>;
  };
};

let cached: AnalyticsModule | null = null;
function load(): AnalyticsModule | null {
  if (!isAnalyticsAvailable) return null;
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("@react-native-firebase/analytics") as AnalyticsModule;
    return cached;
  } catch (e) {
    console.warn("[analytics] @react-native-firebase/analytics not available:", e);
    return null;
  }
}

let initialized = false;

/** Call once at app startup. Enables collection. Safe to call multiple times. */
export async function initializeAnalytics(): Promise<void> {
  if (initialized || !isAnalyticsAvailable) return;
  initialized = true;
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().setAnalyticsCollectionEnabled(true);
  } catch (e) {
    console.warn("[analytics] enable failed:", e);
  }
}

/** Log a custom event. `name` must be ≤ 40 chars, alphanumeric + underscores. */
export async function logEvent(
  name: string,
  params?: Record<string, unknown>,
): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().logEvent(name, params);
  } catch (e) {
    console.warn("[analytics] logEvent failed:", name, e);
  }
}

/** Log a screen view — call from your router on every navigation. */
export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch (e) {
    console.warn("[analytics] logScreenView failed:", screenName, e);
  }
}

export async function setUserId(id: string | null): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().setUserId(id);
  } catch (e) {
    console.warn("[analytics] setUserId failed:", e);
  }
}

export async function setUserProperty(name: string, value: string | null): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().setUserProperty(name, value);
  } catch (e) {
    console.warn("[analytics] setUserProperty failed:", name, e);
  }
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  const mod = load();
  if (!mod) return;
  try {
    await mod.default().setAnalyticsCollectionEnabled(enabled);
  } catch (e) {
    console.warn("[analytics] setAnalyticsEnabled failed:", e);
  }
}
