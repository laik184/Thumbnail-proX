import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: padBottom + 24 }]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>Pro Thumbnail Master</Text>
          <Text style={styles.heroSub}>Version 1.0.0</Text>
        </LinearGradient>

        <Text style={[styles.body, { color: colors.foreground }]}>
          Pro Thumbnail Master is the fastest way to grab high-resolution YouTube thumbnails and design eye-catching custom thumbnails right on your phone.
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 12 }]}>
          Built with React Native and Expo. We&apos;re a small independent team focused on giving creators powerful tools without the bloat.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>WHAT&apos;S NEW</Text>
          <Text style={[styles.cardText, { color: colors.foreground }]}>
            • Smart Max HD fallback{"\n"}
            • Custom export quality (Max HD / HD / Standard){"\n"}
            • Editable text layers with fonts, colors and outlines{"\n"}
            • Built-in templates and pinch / rotate gestures{"\n"}
            • Pull-to-refresh and full activity history
          </Text>
        </View>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} Pro Thumbnail Master. All rights reserved.{"\n"}
          Pro Thumbnail Master is not affiliated with, endorsed by, or sponsored by YouTube or Google LLC.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  hero: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  heroTitle: {
    fontFamily: "Anton_400Regular",
    fontSize: 28,
    color: "#FFF",
    letterSpacing: 1,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 28,
    textAlign: "center",
    lineHeight: 18,
  },
});
