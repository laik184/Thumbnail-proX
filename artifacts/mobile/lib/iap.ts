import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * In-App Purchase safe wrapper around `react-native-iap`.
 *
 * Why this exists:
 *   - `react-native-iap` requires native code (Google Play Billing / StoreKit) linked
 *     via an EAS dev/prod build. In Expo Go and on web, the native module is missing.
 *   - We ship a clean async API that "just works" and falls back to a deterministic
 *     mock in non-native environments so the rest of the app doesn't have to know.
 *
 * Production setup checklist:
 *   1. Create the products below in Google Play Console (and App Store Connect for iOS):
 *        - SKU: `pro_lifetime`  (Non-consumable / one-time)
 *        - SKU: `pro_monthly`   (Auto-renewing subscription)
 *   2. Update the SKU constants here if you use different IDs.
 *   3. Run an EAS build (`eas build --profile preview --platform android`) — IAP will
 *      not function in Expo Go.
 *   4. Test purchases using a Google Play "Closed testing" track + licensed tester.
 */

export const PRODUCT_LIFETIME = "pro_lifetime";
export const PRODUCT_MONTHLY = "pro_monthly";

const isExpoGo = Constants.appOwnership === "expo";
const isWeb = Platform.OS === "web";

export const isIAPAvailable = !isExpoGo && !isWeb;

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

type IAPModule = {
  initConnection: () => Promise<unknown>;
  endConnection: () => Promise<unknown>;
  getProducts: (opts: { skus: string[] }) => Promise<any[]>;
  getSubscriptions: (opts: { skus: string[] }) => Promise<any[]>;
  requestPurchase: (opts: any) => Promise<any>;
  requestSubscription: (opts: any) => Promise<any>;
  finishTransaction: (opts: any) => Promise<unknown>;
  getAvailablePurchases: () => Promise<any[]>;
};

let cached: IAPModule | null = null;
function loadIAP(): IAPModule | null {
  if (!isIAPAvailable) return null;
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-iap") as IAPModule;
    return cached;
  } catch (e) {
    console.warn("[iap] react-native-iap not available:", e);
    return null;
  }
}

let connectionPromise: Promise<boolean> | null = null;
export async function ensureIAPConnection(): Promise<boolean> {
  if (!isIAPAvailable) return false;
  if (connectionPromise) return connectionPromise;
  const mod = loadIAP();
  if (!mod) return false;
  connectionPromise = (async () => {
    try {
      await mod.initConnection();
      return true;
    } catch (e) {
      console.warn("[iap] initConnection failed:", e);
      return false;
    }
  })();
  return connectionPromise;
}

export async function fetchProducts(): Promise<IAPProduct[]> {
  const ok = await ensureIAPConnection();
  const mod = loadIAP();
  if (!ok || !mod) {
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
  try {
    const [prods, subs] = await Promise.all([
      mod.getProducts({ skus: [PRODUCT_LIFETIME] }),
      mod.getSubscriptions({ skus: [PRODUCT_MONTHLY] }),
    ]);
    return [
      ...prods.map((p) => ({
        productId: p.productId ?? p.id,
        title: p.title ?? "",
        description: p.description ?? "",
        localizedPrice: p.localizedPrice ?? p.price ?? "",
        currency: p.currency ?? "",
        type: "inapp" as const,
      })),
      ...subs.map((p) => ({
        productId: p.productId ?? p.id,
        title: p.title ?? "",
        description: p.description ?? "",
        localizedPrice: p.localizedPrice ?? p.price ?? "",
        currency: p.currency ?? "",
        type: "subs" as const,
      })),
    ];
  } catch (e) {
    console.warn("[iap] fetchProducts failed:", e);
    return [];
  }
}

export async function purchase(
  productId: string,
  type: "inapp" | "subs"
): Promise<PurchaseResult> {
  const ok = await ensureIAPConnection();
  const mod = loadIAP();
  if (!ok || !mod) {
    return { success: false, reason: "unavailable" };
  }
  try {
    const result =
      type === "subs"
        ? await mod.requestSubscription({ sku: productId })
        : await mod.requestPurchase({ sku: productId });
    const tx = Array.isArray(result) ? result[0] : result;
    try {
      if (tx) {
        await mod.finishTransaction({ purchase: tx, isConsumable: false });
      }
    } catch {}
    return {
      success: true,
      productId,
      transactionId: tx?.transactionId ?? tx?.purchaseToken,
    };
  } catch (e: any) {
    const code = String(e?.code ?? "");
    const msg = String(e?.message ?? "");
    if (/cancel/i.test(code) || /cancel/i.test(msg)) {
      return { success: false, reason: "cancelled" };
    }
    console.warn("[iap] purchase failed:", e);
    return { success: false, reason: "error", message: msg };
  }
}

export async function restorePurchases(): Promise<string[]> {
  const ok = await ensureIAPConnection();
  const mod = loadIAP();
  if (!ok || !mod) return [];
  try {
    const purchases = await mod.getAvailablePurchases();
    return purchases.map((p) => p.productId);
  } catch (e) {
    console.warn("[iap] restorePurchases failed:", e);
    return [];
  }
}
