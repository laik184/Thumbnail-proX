/**
 * Web stub for `lib/ads.ts`.
 *
 * Metro picks this file automatically on the web platform thanks to the `.web.ts`
 * extension, so the native `react-native-google-mobile-ads` package never gets
 * pulled into the web bundle (it imports native-only modules and would crash
 * the bundler).
 *
 * AdMob has no web SDK in this package, so all functions are no-ops here.
 * This file MUST mirror every export in `ads.ts` — otherwise web bundles crash
 * at runtime with "x is not a function".
 */

export const isAdsAvailable = false;

export function getBannerUnitId(): string {
  return "";
}

export function getInterstitialUnitId(): string {
  return "";
}

export function getRewardedUnitId(): string {
  return "";
}

export function getAppOpenUnitId(): string {
  return "";
}

export function getBannerComponent(): React.ComponentType<any> | null {
  return null;
}

export function getBannerSize(): string | undefined {
  return undefined;
}

export async function initializeAds(): Promise<void> {
  // no-op on web
}

export function preloadInterstitial(): void {
  // no-op
}

export function maybeShowInterstitial(): boolean {
  return false;
}

export function preloadRewarded(): void {
  // no-op
}

export function showRewarded(): Promise<boolean> {
  return Promise.resolve(false);
}

export function preloadAppOpen(): void {
  // no-op
}

export function maybeShowAppOpen(): boolean {
  return false;
}
