/**
 * Web stub for `lib/iap.ts`.
 *
 * `react-native-iap` is a native-only module (Google Play Billing / StoreKit) and
 * has no web equivalent in this app. This stub gives the rest of the codebase a
 * consistent API so pricing screens render and "purchase" gracefully degrades to
 * a "not available" path on web.
 */

export const PRODUCT_LIFETIME = "pro_lifetime";
export const PRODUCT_MONTHLY = "pro_monthly";

export const isIAPAvailable = false;

type IAPProduct = {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
  type: "inapp" | "subs";
};

export type PurchaseResult =
  | { success: true; productId: string; transactionId?: string }
  | { success: false; reason: "cancelled" | "error" | "unavailable"; message?: string };

export async function ensureIAPConnection(): Promise<boolean> {
  return false;
}

export async function fetchProducts(): Promise<IAPProduct[]> {
  return [
    {
      productId: PRODUCT_LIFETIME,
      title: "PRO Lifetime",
      description: "One-time payment, lifetime access.",
      localizedPrice: "₹99",
      currency: "INR",
      type: "inapp",
    },
    {
      productId: PRODUCT_MONTHLY,
      title: "PRO Monthly",
      description: "Renews monthly. Cancel anytime.",
      localizedPrice: "₹49",
      currency: "INR",
      type: "subs",
    },
  ];
}

export async function purchase(): Promise<PurchaseResult> {
  return { success: false, reason: "unavailable" };
}

export async function restorePurchases(): Promise<string[]> {
  return [];
}
