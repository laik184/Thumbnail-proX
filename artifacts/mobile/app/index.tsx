import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { WELCOME_SEEN_KEY } from "./welcome";

/**
 * Splash screen.
 *
 * Retention design notes (utility-first app):
 *   - Auto-advances after ~700ms — no "tap to continue" gate. Every extra second
 *     here costs a measurable % of first-launch retention.
 *   - On the very first launch we route to `/welcome` (one-screen landing page).
 *     On every subsequent launch we route straight to `/home`.
 *   - Tap-anywhere still skips the splash wait, but the destination is decided
 *     by the same AsyncStorage flag so the user sees the landing page exactly
 *     once.
 */
export default function SplashScreen() {
  const colors = useColors();
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const navigated = useRef(false);

  const goNext = async () => {
    if (navigated.current) return;
    navigated.current = true;
    let dest: "/welcome" | "/home" = "/home";
    try {
      const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
      if (!seen) dest = "/welcome";
    } catch {
      // If storage fails, fall back to /home — never block the app on this.
    }
    router.replace(dest);
  };

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 350, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 150 })
    );
    opacity.value = withTiming(1, { duration: 350 });

    const timer = setTimeout(goNext, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={goNext}
      accessibilityLabel="Skip splash screen"
    >
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.playIcon, { borderLeftColor: colors.background }]} />
        </LinearGradient>
        <Text
          allowFontScaling={false}
          style={[styles.title, { color: colors.foreground }]}
        >
          PRO THUMBNAIL
        </Text>
        <Text
          allowFontScaling={false}
          style={[styles.subtitle, { color: colors.primary }]}
        >
          MASTER
        </Text>
        <View style={styles.taglineContainer}>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Download YouTube thumbnails in seconds
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoContainer: { alignItems: "center" },
  logoGradient: {
    width: 100,
    height: 70,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#00F0FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 24,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 8,
  },
  title: {
    fontFamily: "Anton_400Regular",
    fontSize: 38,
    letterSpacing: 1.5,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: "Anton_400Regular",
    fontSize: 38,
    letterSpacing: 1.5,
    lineHeight: 44,
    marginTop: -6,
  },
  taglineContainer: { marginTop: 20 },
  tagline: { fontFamily: "Inter_500Medium", fontSize: 14, letterSpacing: 0.5 },
});
