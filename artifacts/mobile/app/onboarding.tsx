import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useT } from "@/hooks/useT";

const { width } = Dimensions.get("window");

export const ONBOARDING_KEY = "@onboarding_complete";

interface SlideMockProps {
  variant: "download" | "create" | "share";
  colors: any;
}

function SlideMock({ variant, colors }: SlideMockProps) {
  if (variant === "download") {
    return (
      <View style={[styles.mockPhone, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.mockUrl, { backgroundColor: colors.input }]}>
          <Feather name="link" size={11} color={colors.mutedForeground} />
          <Text numberOfLines={1} style={[styles.mockUrlText, { color: colors.foreground }]}>
            youtu.be/dQw4w9WgXcQ
          </Text>
        </View>
        <Image
          source={{ uri: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg" }}
          style={styles.mockThumb}
          resizeMode="cover"
        />
        <View style={styles.mockButtonRow}>
          <View style={[styles.mockBtn, { backgroundColor: colors.primary }]}>
            <Feather name="download" size={11} color={colors.primaryForeground} />
            <Text style={[styles.mockBtnText, { color: colors.primaryForeground }]}>Save</Text>
          </View>
          <View style={[styles.mockBtnSecondary, { borderColor: colors.border }]}>
            <Feather name="share-2" size={11} color={colors.foreground} />
          </View>
        </View>
      </View>
    );
  }
  if (variant === "create") {
    return (
      <View style={[styles.mockPhone, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <LinearGradient colors={["#FF3366", "#8A2BE2"]} style={styles.mockCanvas}>
          <Text style={[styles.mockCanvasText, { color: "#FFD700" }]}>VIRAL!</Text>
          <Text style={[styles.mockCanvasEmoji]}>🔥</Text>
        </LinearGradient>
        <View style={styles.mockToolRow}>
          {(["type", "image", "smile", "user"] as const).map((icon) => (
            <View key={icon} style={[styles.mockTool, { backgroundColor: colors.input }]}>
              <Feather name={icon} size={12} color={colors.foreground} />
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.mockPhone, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.mockSavedRow}>
        <View style={[styles.mockSavedThumb, { backgroundColor: colors.input }]}>
          <Image
            source={{ uri: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg" }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </View>
        <View style={[styles.mockSavedThumb, { backgroundColor: colors.input }]}>
          <Image
            source={{ uri: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg" }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </View>
      </View>
      <View style={[styles.mockShareCard, { backgroundColor: colors.input }]}>
        <Feather name="share-2" size={14} color={colors.primary} />
        <Text style={[styles.mockShareText, { color: colors.foreground }]}>Share to WhatsApp</Text>
      </View>
      <View style={[styles.mockShareCard, { backgroundColor: colors.input }]}>
        <Feather name="image" size={14} color={colors.primary} />
        <Text style={[styles.mockShareText, { color: colors.foreground }]}>Saved to Gallery</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const slides = [
    { variant: "download" as const, title: t("onb_t1"), body: t("onb_d1") },
    { variant: "create" as const, title: t("onb_t2"), body: t("onb_d2") },
    { variant: "share" as const, title: t("onb_t3"), body: t("onb_d3") },
  ];

  const finish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/home");
  };

  const next = () => {
    if (page >= slides.length - 1) {
      finish();
      return;
    }
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={finish} style={styles.skip} hitSlop={12} accessibilityLabel="Skip onboarding">
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{t("onb_skip")}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <SlideMock variant={s.variant} colors={colors} />
            <Text style={[styles.slideTitle, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.slideBody, { color: colors.mutedForeground }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? colors.primary : colors.border,
                width: i === page ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable onPress={next} style={styles.cta} accessibilityLabel="Next">
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>
              {page === slides.length - 1 ? t("onb_get_started") : t("onb_next")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 8 },
  skip: { padding: 10 },
  skipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  slide: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "web" ? 40 : 0,
  },
  mockPhone: {
    width: 240,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 28,
    gap: 10,
  },
  mockUrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mockUrlText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  mockThumb: { width: "100%", aspectRatio: 16 / 9, borderRadius: 6 },
  mockButtonRow: { flexDirection: "row", gap: 6 },
  mockBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
  },
  mockBtnText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  mockBtnSecondary: {
    width: 36,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  mockCanvas: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mockCanvasText: { fontFamily: "Anton_400Regular", fontSize: 32 },
  mockCanvasEmoji: { fontSize: 32 },
  mockToolRow: { flexDirection: "row", gap: 6 },
  mockTool: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  mockSavedRow: { flexDirection: "row", gap: 6 },
  mockSavedThumb: {
    flex: 1,
    aspectRatio: 16 / 9,
    borderRadius: 6,
    overflow: "hidden",
  },
  mockShareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  mockShareText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  slideTitle: {
    fontFamily: "Anton_400Regular",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  slideBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginVertical: 16,
  },
  dot: { height: 8, borderRadius: 4 },
  bottom: { paddingHorizontal: 20, paddingTop: 8 },
  cta: { height: 56, borderRadius: 12, overflow: "hidden" },
  ctaGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.5 },
});
