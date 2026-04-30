import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/contexts/SettingsContext";
import {
  fetchProducts,
  purchase,
  restorePurchases,
  isIAPAvailable,
  PRODUCT_LIFETIME,
  PRODUCT_MONTHLY,
} from "@/lib/iap";

const FREE_FEATURES = [
  "Download YouTube thumbnails up to Max HD",
  "All editor tools (text, fonts, colors)",
  "30+ ready-made templates",
  "100+ stickers and emojis",
  "Save to gallery",
];

const PRO_FEATURES = [
  "Everything in Free, plus:",
  "Remove watermark from exports",
  "Remove all banner ads",
  "Background removal (50/month)",
  "Priority customer support",
  "Early access to new features",
];

export default function PricingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { removeAds, setRemoveAds } = useSettings();

  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const [lifetimePrice, setLifetimePrice] = useState("₹99");
  const [monthlyPrice, setMonthlyPrice] = useState("₹49");
  const [busyPlan, setBusyPlan] = useState<"lifetime" | "monthly" | "restore" | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProducts()
      .then((products) => {
        if (!alive) return;
        const lifetime = products.find((p) => p.productId === PRODUCT_LIFETIME);
        const monthly = products.find((p) => p.productId === PRODUCT_MONTHLY);
        if (lifetime?.localizedPrice) setLifetimePrice(lifetime.localizedPrice);
        if (monthly?.localizedPrice) setMonthlyPrice(monthly.localizedPrice);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleUpgrade = async (plan: "lifetime" | "monthly") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isIAPAvailable) {
      Alert.alert(
        `Activate ${plan === "lifetime" ? "PRO Lifetime" : "PRO Monthly"}`,
        "Real in-app purchase requires a development build (it will work automatically once you publish to the Play Store). For now, we'll activate a local trial so you can test the PRO experience.",
        [
          { text: "Maybe later", style: "cancel" },
          {
            text: "Activate trial",
            onPress: async () => {
              await setRemoveAds(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            },
          },
        ]
      );
      return;
    }

    setBusyPlan(plan);
    try {
      const productId = plan === "lifetime" ? PRODUCT_LIFETIME : PRODUCT_MONTHLY;
      const type = plan === "lifetime" ? "inapp" : "subs";
      const result = await purchase(productId, type);
      if (result.success) {
        await setRemoveAds(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("You're on PRO", "Thank you! Watermark and ads are now disabled.");
        router.back();
      } else if (result.reason === "cancelled") {
        // Silent — user just dismissed.
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Purchase failed", result.message ?? "Please try again later.");
      }
    } finally {
      setBusyPlan(null);
    }
  };

  const handleRestore = async () => {
    Haptics.selectionAsync();
    if (!isIAPAvailable) {
      Alert.alert(
        "Restore unavailable",
        "Restore purchases works on a release build of the app from the Play Store."
      );
      return;
    }
    setBusyPlan("restore");
    try {
      const restored = await restorePurchases();
      if (restored.includes(PRODUCT_LIFETIME) || restored.includes(PRODUCT_MONTHLY)) {
        await setRemoveAds(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Restored", "Your PRO access has been restored.");
      } else {
        Alert.alert("Nothing to restore", "We couldn't find any past purchases for this account.");
      }
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: padBottom + 24 }]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.crownBadge}>
            <Feather name="award" size={14} color="#0B0B12" />
            <Text style={styles.crownText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock the Pro experience</Text>
          <Text style={styles.heroSub}>
            No watermark. No ads. Background removal. One-time payment.
          </Text>
        </LinearGradient>

        {removeAds ? (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Feather name="check-circle" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>You&apos;re on PRO</Text>
              <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                Watermark and ads are disabled.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.premium }]}>
          <View style={styles.bestBadge}>
            <Text style={styles.bestBadgeText}>BEST VALUE · SAVE 75%</Text>
          </View>
          <View style={styles.planNameRow}>
            <Feather name="award" size={18} color={colors.premium} />
            <Text style={[styles.planName, { color: colors.foreground }]}>PRO Lifetime</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>{lifetimePrice}</Text>
            <Text style={[styles.priceMeta, { color: colors.mutedForeground }]}>once</Text>
          </View>
          <Text style={[styles.priceCompare, { color: colors.mutedForeground }]}>
            Pay once · use forever
          </Text>
          <Pressable
            onPress={() => handleUpgrade("lifetime")}
            style={styles.ctaWrap}
            accessibilityLabel="Upgrade to PRO Lifetime"
            disabled={removeAds || busyPlan !== null}
          >
            <LinearGradient
              colors={[colors.premiumGradientStart, colors.premiumGradientEnd]}
              style={[styles.cta, (removeAds || busyPlan === "lifetime") && { opacity: 0.6 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {busyPlan === "lifetime" ? (
                <ActivityIndicator color={colors.premiumForeground} />
              ) : (
                <Text style={[styles.ctaText, { color: colors.premiumForeground }]}>
                  {removeAds ? "Already PRO" : "Upgrade now"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <View style={[styles.planCardLite, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.planName, { color: colors.foreground }]}>PRO Monthly</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>{monthlyPrice}</Text>
            <Text style={[styles.priceMeta, { color: colors.mutedForeground }]}>/month</Text>
          </View>
          <Pressable
            onPress={() => handleUpgrade("monthly")}
            style={[styles.ctaWrapAlt, { borderColor: colors.primary, opacity: busyPlan === "monthly" ? 0.6 : 1 }]}
            accessibilityLabel="Upgrade to PRO Monthly"
            disabled={removeAds || busyPlan !== null}
          >
            {busyPlan === "monthly" ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.ctaTextAlt, { color: colors.primary }]}>
                {removeAds ? "Already PRO" : "Subscribe"}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={handleRestore}
          style={styles.restoreBtn}
          accessibilityLabel="Restore previous purchases"
          disabled={busyPlan !== null}
        >
          {busyPlan === "restore" ? (
            <ActivityIndicator color={colors.mutedForeground} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
              Restore purchases
            </Text>
          )}
        </Pressable>

        <View style={styles.compareRow}>
          <View style={[styles.compareCol, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.compareTitle, { color: colors.mutedForeground }]}>FREE</Text>
            {FREE_FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Feather name="check" size={14} color={colors.mutedForeground} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.compareCol,
              { backgroundColor: colors.card, borderColor: colors.premium, borderWidth: 2 },
            ]}
          >
            <Text style={[styles.compareTitle, { color: colors.premium }]}>PRO</Text>
            {PRO_FEATURES.map((f, i) => (
              <View key={f} style={styles.featureRow}>
                <Feather
                  name={i === 0 ? "star" : "check"}
                  size={14}
                  color={i === 0 ? colors.premium : colors.success}
                />
                <Text
                  style={[
                    styles.featureText,
                    { color: colors.foreground, fontFamily: i === 0 ? "Inter_700Bold" : "Inter_500Medium" },
                  ]}
                >
                  {f}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          Payments are processed securely via Google Play. Subscriptions auto-renew unless cancelled
          24 hours before the end of the current period. Cancel anytime in Play Store settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  hero: { borderRadius: 18, padding: 22, marginBottom: 18 },
  crownBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 12,
  },
  crownText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#0B0B12", letterSpacing: 1 },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Anton_400Regular",
    fontSize: 24,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  heroSub: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 18,
  },
  statusTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  statusSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  planCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 14,
  },
  planCardLite: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  bestBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  bestBadgeText: {
    color: "#0B0B12",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontFamily: "Inter_700Bold", fontSize: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  priceCurrency: { fontFamily: "Anton_400Regular", fontSize: 22, marginRight: 2 },
  price: { fontFamily: "Anton_400Regular", fontSize: 48, letterSpacing: 0.5 },
  priceMeta: { fontFamily: "Inter_500Medium", fontSize: 14, marginLeft: 6 },
  priceCompare: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  ctaWrap: { marginTop: 14, height: 50, borderRadius: 12, overflow: "hidden" },
  cta: { flex: 1, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
  ctaWrapAlt: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTextAlt: { fontFamily: "Inter_700Bold", fontSize: 14 },
  restoreBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  restoreText: { fontFamily: "Inter_600SemiBold", fontSize: 13, textDecorationLine: "underline" },
  compareRow: { flexDirection: "row", gap: 10 },
  compareCol: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1 },
  compareTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 10,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  featureText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 18,
    textAlign: "center",
  },
});
