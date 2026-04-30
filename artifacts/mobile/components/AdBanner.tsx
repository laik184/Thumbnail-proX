import React from "react";
import { View, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/contexts/SettingsContext";
import {
  isAdsAvailable,
  getBannerComponent,
  getBannerUnitId,
  getBannerSize,
} from "@/lib/ads";

/**
 * Ad slot for the bottom of screens.
 *
 * Behaviour:
 *   - PRO users (`removeAds`) → renders nothing.
 *   - First 24h after install → renders nothing (clean first-run impression).
 *   - Native build with AdMob available → renders a real Google `<BannerAd />`.
 *   - Otherwise (Expo Go / web) → renders nothing.
 */
export function AdBanner() {
  const colors = useColors();
  const { removeAds, isInGracePeriod } = useSettings();

  if (removeAds || isInGracePeriod) return null;

  const BannerAd = getBannerComponent();
  const unitId = getBannerUnitId();
  const size = getBannerSize();

  if (isAdsAvailable && BannerAd && unitId && size) {
    return (
      <View
        style={[
          styles.adContainer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
        accessibilityLabel="Advertisement"
      >
        <BannerAd
          unitId={unitId}
          size={size}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  adContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderTopWidth: 1,
    width: "100%",
  },
});
