/**
 * Web stub for `lib/analytics.ts`.
 *
 * Metro picks this file automatically on web thanks to the `.web.ts` extension,
 * so `@react-native-firebase/analytics` (native-only) never enters the web bundle.
 *
 * This file MUST mirror every export in `analytics.ts` — otherwise web bundles
 * crash at runtime with "x is not a function".
 */

export const isAnalyticsAvailable = false;

export async function initializeAnalytics(): Promise<void> {
  // no-op on web
}

export async function logEvent(
  _name: string,
  _params?: Record<string, unknown>,
): Promise<void> {
  // no-op on web
}

export async function logScreenView(
  _screenName: string,
  _screenClass?: string,
): Promise<void> {
  // no-op on web
}

export async function setUserId(_id: string | null): Promise<void> {
  // no-op on web
}

export async function setUserProperty(_name: string, _value: string | null): Promise<void> {
  // no-op on web
}

export async function setAnalyticsEnabled(_enabled: boolean): Promise<void> {
  // no-op on web
}
