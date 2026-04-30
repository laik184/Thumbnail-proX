import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Google Mobile Ads (AdMob) safe wrapper.
 *
 * Why this exists:
 *   - `react-native-google-mobile-ads` requires native code linked via EAS dev/prod build.
 *   - In Expo Go, web preview, and tests, the native module is NOT available — importing
 *     it directly would crash the bundle.
 *
 * What it does:
 *   - Lazily resolves the package only when running in a real native build.
 *   - Exposes a single `isAdsAvailable` flag used by UI components to decide whether
 *     to render real ads or a placeholder.
 *   - Provides `initializeAds()` which, when called once at app startup, kicks off the
 *     SDK + UMP consent flow + iOS App Tracking Transparency request.
 *
 * Test ad unit IDs and the test App IDs in app.json are Google's official sandbox IDs
 * (https://developers.google.com/admob/android/test-ads). Replace with your real
 * AdMob App IDs and ad unit IDs before production.
 */

const isExpoGo = Constants.appOwnership === "expo";
const isWeb = Platform.OS === "web";

export const isAdsAvailable = !isExpoGo && !isWeb;

type AdsModule = {
  default: () => {
    initialize: () => Promise<unknown>;
    setRequestConfiguration: (cfg: unknown) => Promise<unknown>;
  };
  BannerAd: React.ComponentType<any>;
  BannerAdSize: Record<string, string>;
  TestIds: Record<string, string>;
  InterstitialAd?: {
    createForAdRequest: (unitId: string, options?: any) => any;
  };
  RewardedAd?: {
    createForAdRequest: (unitId: string, options?: any) => any;
  };
  AppOpenAd?: {
    createForAdRequest: (unitId: string, options?: any) => any;
  };
  AdEventType?: Record<string, string>;
  RewardedAdEventType?: Record<string, string>;
  AdsConsent?: {
    requestInfoUpdate: (params?: any) => Promise<any>;
    loadAndShowConsentFormIfRequired: () => Promise<any>;
  };
  MaxAdContentRating?: Record<string, string>;
};

let cached: AdsModule | null = null;
function loadAds(): AdsModule | null {
  if (!isAdsAvailable) return null;
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-google-mobile-ads") as AdsModule;
    return cached;
  } catch (e) {
    console.warn("[ads] react-native-google-mobile-ads not available:", e);
    return null;
  }
}

/** Production banner unit IDs — replace these with your own before publishing. */
const PROD_BANNER_UNIT_ID = Platform.select({
  android: "ca-app-pub-1232347342673028/2766687183",
  ios: "ca-app-pub-3940256099942544/2934735716",
  default: "",
});

/** Production interstitial unit IDs. */
const PROD_INTERSTITIAL_UNIT_ID = Platform.select({
  android: "ca-app-pub-1232347342673028/5475687564",
  ios: "ca-app-pub-3940256099942544/4411468910",
  default: "",
});

/** Production rewarded unit IDs. */
const PROD_REWARDED_UNIT_ID = Platform.select({
  android: "ca-app-pub-1232347342673028/5663389824",
  ios: "ca-app-pub-3940256099942544/1712485313",
  default: "",
});

/** Production app open unit IDs. */
const PROD_APP_OPEN_UNIT_ID = Platform.select({
  android: "ca-app-pub-1232347342673028/9196364165",
  ios: "ca-app-pub-3940256099942544/5575463023",
  default: "",
});

export function getBannerUnitId(): string {
  const mod = loadAds();
  if (!mod) return "";
  // Use Google's TestIds in dev for safety; switch to PROD_BANNER_UNIT_ID for release.
  if (__DEV__) return mod.TestIds.BANNER;
  return PROD_BANNER_UNIT_ID ?? mod.TestIds.BANNER;
}

export function getInterstitialUnitId(): string {
  const mod = loadAds();
  if (!mod) return "";
  if (__DEV__) return mod.TestIds.INTERSTITIAL;
  return PROD_INTERSTITIAL_UNIT_ID ?? mod.TestIds.INTERSTITIAL;
}

export function getRewardedUnitId(): string {
  const mod = loadAds();
  if (!mod) return "";
  if (__DEV__) return mod.TestIds.REWARDED;
  return PROD_REWARDED_UNIT_ID ?? mod.TestIds.REWARDED;
}

export function getAppOpenUnitId(): string {
  const mod = loadAds();
  if (!mod) return "";
  if (__DEV__) return mod.TestIds.APP_OPEN;
  return PROD_APP_OPEN_UNIT_ID ?? mod.TestIds.APP_OPEN;
}

export function getBannerComponent(): React.ComponentType<any> | null {
  const mod = loadAds();
  return mod?.BannerAd ?? null;
}

export function getBannerSize(): string | undefined {
  const mod = loadAds();
  return mod?.BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? mod?.BannerAdSize?.BANNER;
}

/* ---------------------------------------------------------------------- */
/* Interstitial ad controller                                             */
/* ---------------------------------------------------------------------- */

let interstitialInstance: any = null;
let interstitialLoaded = false;
let interstitialLoading = false;
let lastInterstitialShownAt = 0;
const INTERSTITIAL_MIN_INTERVAL_MS = 60_000; // Google recommends ≥ 1 min between interstitials

function ensureInterstitialLoaded(): void {
  const mod = loadAds();
  if (!mod || !mod.InterstitialAd || !mod.AdEventType) return;
  if (interstitialLoaded || interstitialLoading) return;

  const unitId = getInterstitialUnitId();
  if (!unitId) return;

  try {
    interstitialLoading = true;
    interstitialInstance = mod.InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const { LOADED, ERROR, CLOSED } = mod.AdEventType;

    interstitialInstance.addAdEventListener(LOADED, () => {
      interstitialLoaded = true;
      interstitialLoading = false;
    });
    interstitialInstance.addAdEventListener(ERROR, (err: unknown) => {
      console.warn("[ads] interstitial load error:", err);
      interstitialLoaded = false;
      interstitialLoading = false;
    });
    interstitialInstance.addAdEventListener(CLOSED, () => {
      interstitialLoaded = false;
      interstitialInstance = null;
      // Preload the next one immediately for the next user action.
      ensureInterstitialLoaded();
    });

    interstitialInstance.load();
  } catch (e) {
    console.warn("[ads] interstitial create failed:", e);
    interstitialLoading = false;
  }
}

/** Call once after `initializeAds()` to start preloading the first interstitial. */
export function preloadInterstitial(): void {
  ensureInterstitialLoaded();
}

/**
 * Show the interstitial if it's loaded AND enough time has passed since the
 * last one. Returns `true` if shown, `false` otherwise. Always safe to call —
 * never throws and never blocks UI.
 */
export function maybeShowInterstitial(): boolean {
  if (!isAdsAvailable) return false;
  const now = Date.now();
  if (now - lastInterstitialShownAt < INTERSTITIAL_MIN_INTERVAL_MS) {
    return false;
  }
  if (!interstitialLoaded || !interstitialInstance) {
    ensureInterstitialLoaded();
    return false;
  }
  try {
    interstitialInstance.show();
    lastInterstitialShownAt = now;
    return true;
  } catch (e) {
    console.warn("[ads] interstitial show failed:", e);
    return false;
  }
}

/* ---------------------------------------------------------------------- */
/* Rewarded ad controller                                                 */
/* ---------------------------------------------------------------------- */

let rewardedInstance: any = null;
let rewardedLoaded = false;
let rewardedLoading = false;

function ensureRewardedLoaded(): void {
  const mod = loadAds();
  if (!mod || !mod.RewardedAd || !mod.RewardedAdEventType || !mod.AdEventType) return;
  if (rewardedLoaded || rewardedLoading) return;

  const unitId = getRewardedUnitId();
  if (!unitId) return;

  try {
    rewardedLoading = true;
    rewardedInstance = mod.RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const { LOADED, ERROR, CLOSED } = mod.AdEventType;

    rewardedInstance.addAdEventListener(LOADED, () => {
      rewardedLoaded = true;
      rewardedLoading = false;
    });
    rewardedInstance.addAdEventListener(ERROR, (err: unknown) => {
      console.warn("[ads] rewarded load error:", err);
      rewardedLoaded = false;
      rewardedLoading = false;
    });
    rewardedInstance.addAdEventListener(CLOSED, () => {
      rewardedLoaded = false;
      rewardedInstance = null;
      ensureRewardedLoaded();
    });

    rewardedInstance.load();
  } catch (e) {
    console.warn("[ads] rewarded create failed:", e);
    rewardedLoading = false;
  }
}

/**
 * Show the rewarded ad and resolve with `true` ONLY if the user earned the
 * reward (i.e. watched the ad to completion). Resolves `false` if the ad
 * isn't ready, fails to load, or the user closed it before completion.
 */
export function showRewarded(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isAdsAvailable) {
      resolve(false);
      return;
    }
    const mod = loadAds();
    if (!mod || !mod.RewardedAdEventType || !mod.AdEventType) {
      resolve(false);
      return;
    }
    if (!rewardedLoaded || !rewardedInstance) {
      ensureRewardedLoaded();
      resolve(false);
      return;
    }

    const ad = rewardedInstance;
    let earned = false;

    const earnedListener = ad.addAdEventListener(
      mod.RewardedAdEventType.EARNED_REWARD,
      () => {
        earned = true;
      }
    );
    const closedListener = ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
      try {
        earnedListener?.();
      } catch {}
      try {
        closedListener?.();
      } catch {}
      resolve(earned);
    });

    try {
      ad.show();
    } catch (e) {
      console.warn("[ads] rewarded show failed:", e);
      resolve(false);
    }
  });
}

/** Preload rewarded ad — call after init. */
export function preloadRewarded(): void {
  ensureRewardedLoaded();
}

/* ---------------------------------------------------------------------- */
/* App Open ad controller                                                 */
/* ---------------------------------------------------------------------- */

let appOpenInstance: any = null;
let appOpenLoaded = false;
let appOpenLoading = false;
let appOpenLoadedAt = 0;
let lastAppOpenShownAt = 0;
let appOpenIsShowing = false;
// AdMob expires app-open ads after 4 hours. Refresh proactively at 3 hours.
const APP_OPEN_MAX_AGE_MS = 3 * 60 * 60 * 1000;
// Don't show another app-open ad more than once every 4 minutes (industry norm).
const APP_OPEN_MIN_INTERVAL_MS = 4 * 60 * 1000;

function ensureAppOpenLoaded(): void {
  const mod = loadAds();
  if (!mod || !mod.AppOpenAd || !mod.AdEventType) return;
  if (appOpenLoading) return;
  if (appOpenLoaded && Date.now() - appOpenLoadedAt < APP_OPEN_MAX_AGE_MS) return;

  const unitId = getAppOpenUnitId();
  if (!unitId) return;

  try {
    appOpenLoading = true;
    appOpenLoaded = false;
    appOpenInstance = mod.AppOpenAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const { LOADED, ERROR, CLOSED } = mod.AdEventType;

    appOpenInstance.addAdEventListener(LOADED, () => {
      appOpenLoaded = true;
      appOpenLoading = false;
      appOpenLoadedAt = Date.now();
    });
    appOpenInstance.addAdEventListener(ERROR, (err: unknown) => {
      console.warn("[ads] app open load error:", err);
      appOpenLoaded = false;
      appOpenLoading = false;
    });
    appOpenInstance.addAdEventListener(CLOSED, () => {
      appOpenIsShowing = false;
      appOpenLoaded = false;
      appOpenInstance = null;
      ensureAppOpenLoaded();
    });

    appOpenInstance.load();
  } catch (e) {
    console.warn("[ads] app open create failed:", e);
    appOpenLoading = false;
  }
}

/**
 * Show the app-open ad if it's loaded, fresh, and we haven't shown one
 * recently. Returns `true` if shown. Safe to call from AppState change
 * handlers — never throws.
 */
export function maybeShowAppOpen(): boolean {
  if (!isAdsAvailable) return false;
  if (appOpenIsShowing) return false;

  const now = Date.now();
  if (now - lastAppOpenShownAt < APP_OPEN_MIN_INTERVAL_MS) return false;

  // Refresh stale ads.
  if (appOpenLoaded && now - appOpenLoadedAt >= APP_OPEN_MAX_AGE_MS) {
    appOpenLoaded = false;
    appOpenInstance = null;
    ensureAppOpenLoaded();
    return false;
  }

  if (!appOpenLoaded || !appOpenInstance) {
    ensureAppOpenLoaded();
    return false;
  }

  try {
    appOpenIsShowing = true;
    appOpenInstance.show();
    lastAppOpenShownAt = now;
    return true;
  } catch (e) {
    console.warn("[ads] app open show failed:", e);
    appOpenIsShowing = false;
    return false;
  }
}

/** Preload app open ad — call after init. */
export function preloadAppOpen(): void {
  ensureAppOpenLoaded();
}

let initialized = false;
export async function initializeAds(): Promise<void> {
  if (initialized || !isAdsAvailable) return;
  initialized = true;
  const mod = loadAds();
  if (!mod) return;
  try {
    // 1) iOS App Tracking Transparency request — required by Apple before personalised ads.
    if (Platform.OS === "ios") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const tt = require("expo-tracking-transparency");
        const { status } = await tt.getTrackingPermissionsAsync();
        if (status === "undetermined") {
          await tt.requestTrackingPermissionsAsync();
        }
      } catch (e) {
        console.warn("[ads] tracking transparency unavailable:", e);
      }
    }

    // 2) UMP consent (GDPR / EU users).
    try {
      const consent = mod.AdsConsent;
      if (consent) {
        await consent.requestInfoUpdate();
        await consent.loadAndShowConsentFormIfRequired();
      }
    } catch (e) {
      console.warn("[ads] UMP consent flow failed:", e);
    }

    // 3) Initialize the SDK.
    await mod.default().initialize();

    // 4) Preload first interstitial + rewarded + app-open so they're ready
    //    for user actions / next foreground transition.
    ensureInterstitialLoaded();
    ensureRewardedLoaded();
    ensureAppOpenLoaded();
  } catch (e) {
    console.warn("[ads] initialization failed:", e);
  }
}
