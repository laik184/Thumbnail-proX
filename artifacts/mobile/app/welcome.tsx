import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

/**
 * First-launch landing page — swipeable, premium feel.
 *
 * Shown **once** on the very first app launch (gated by `WELCOME_SEEN_KEY`).
 * Four slides, each with an animated UI mock that previews a real feature:
 *   1. Brand intro + swipe hint
 *   2. Download in 4K (URL → thumbnail mock)
 *   3. Edit like a pro (canvas mock with template text)
 *   4. Free forever + final CTA
 *
 * Skip link is always available top-right; the user can also tap "Get Started"
 * any time and we still mark the flag so they never see this screen again.
 */
export const WELCOME_SEEN_KEY = "@welcome_seen_v1";

type SlideId = "intro" | "download" | "edit" | "ready";
interface SlideDef {
  id: SlideId;
  eyebrow: string;
  title: string;
  body: string;
  // Per-slide gradient gives each page its own visual identity while staying
  // on-brand. Picked from the existing brand palette extremes.
  gradient: [string, string];
}

const SLIDES: SlideDef[] = [
  {
    id: "intro",
    eyebrow: "WELCOME",
    title: "Pro Thumbnail\nMaster",
    body: "The fastest way to download, edit and share YouTube thumbnails.",
    gradient: ["#7C3AED", "#00F0FF"],
  },
  {
    id: "download",
    eyebrow: "STEP 1",
    title: "Download in\n4K or HD",
    body: "Paste any YouTube link. Get the original thumbnail in 4K, 1080p or 720p — instantly, no watermark.",
    gradient: ["#FF3366", "#7C3AED"],
  },
  {
    id: "edit",
    eyebrow: "STEP 2",
    title: "Edit like\na pro",
    body: "30+ ready-made templates. Tap any text to edit. Add stickers, change backgrounds — no design skills needed.",
    gradient: ["#FF8C00", "#FF3366"],
  },
  {
    id: "ready",
    eyebrow: "READY?",
    title: "Free forever.\nNo signup.",
    body: "Works offline after the first download. No watermark. No account. Just paste and go.",
    gradient: ["#00C896", "#7C3AED"],
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const isLast = page >= SLIDES.length - 1;

  const finish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Non-fatal — worst case the user sees this screen one more time.
    }
    router.replace("/home");
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  const skip = async () => {
    Haptics.selectionAsync();
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {}
    router.replace("/home");
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) {
      setPage(p);
      Haptics.selectionAsync();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip — always available, low-emphasis */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={skip} hitSlop={12} style={styles.skipBtn} accessibilityLabel="Skip welcome">
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {SLIDES.map((s, i) => (
          <Slide key={s.id} slide={s} active={i === page} colors={colors} />
        ))}
      </ScrollView>

      {/* Page dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? colors.primary : colors.border,
                width: i === page ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom CTA — gradient on last slide, secondary on earlier slides */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={next}
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.92 : 1 }]}
          accessibilityLabel={isLast ? "Get started" : "Next"}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>{isLast ? "Get Started — Free" : "Next"}</Text>
            <Feather
              name={isLast ? "arrow-right-circle" : "arrow-right"}
              size={20}
              color="#FFFFFF"
            />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Slide                                                                      */
/* -------------------------------------------------------------------------- */

interface SlideProps {
  slide: SlideDef;
  active: boolean;
  colors: ReturnType<typeof useColors>;
}

function Slide({ slide, active, colors }: SlideProps) {
  return (
    <View style={[styles.slide, { width }]}>
      {/* Hero visual — different mock per slide */}
      <Animated.View
        entering={FadeIn.duration(450)}
        style={styles.heroArea}
        // Re-mount key forces the entering animation to replay each time the
        // slide becomes active (after a swipe), making the screen feel alive.
        key={active ? `${slide.id}-active` : slide.id}
      >
        {slide.id === "intro" ? (
          <IntroVisual gradient={slide.gradient} />
        ) : slide.id === "download" ? (
          <DownloadVisual gradient={slide.gradient} colors={colors} />
        ) : slide.id === "edit" ? (
          <EditVisual gradient={slide.gradient} colors={colors} />
        ) : (
          <ReadyVisual gradient={slide.gradient} colors={colors} />
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(120).duration(420)} style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{slide.eyebrow}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{slide.title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Per-slide hero visuals — built from primitives, no extra image assets      */
/* -------------------------------------------------------------------------- */

function IntroVisual({ gradient }: { gradient: [string, string] }) {
  // Pulsing brand mark — sets the "alive, premium" tone for the whole flow.
  const pulse = useSharedValue(0.92);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.94, { duration: 1300, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.heroCenter}>
      <Animated.View style={pulseStyle}>
        <LinearGradient
          colors={gradient}
          style={styles.brandMark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="download" size={56} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <View style={styles.swipeHintRow}>
        <Text style={styles.swipeHintText}>Swipe to explore</Text>
        <Feather name="chevrons-right" size={16} color="#FFFFFF" />
      </View>
    </View>
  );
}

function DownloadVisual({
  gradient,
  colors,
}: {
  gradient: [string, string];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.heroCenter}>
      <LinearGradient colors={gradient} style={styles.featureCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Mock URL bar */}
        <View style={styles.mockUrlBar}>
          <Feather name="link" size={12} color="rgba(255,255,255,0.85)" />
          <Text numberOfLines={1} style={styles.mockUrlText}>
            youtu.be/dQw4w9WgXcQ
          </Text>
        </View>

        {/* Thumbnail preview with quality badge */}
        <View style={styles.mockThumbWrap}>
          <Image
            source={{ uri: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" }}
            style={styles.mockThumb}
            resizeMode="cover"
          />
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityBadgeText}>4K</Text>
          </View>
        </View>

        {/* Quality chips */}
        <View style={styles.mockChipsRow}>
          {(["4K", "HD", "1080p", "720p"] as const).map((q, i) => (
            <View
              key={q}
              style={[
                styles.mockChip,
                i === 0 ? { backgroundColor: "#FFFFFF" } : null,
              ]}
            >
              <Text
                style={[
                  styles.mockChipText,
                  i === 0 ? { color: "#0B0B12" } : { color: "#FFFFFF" },
                ]}
              >
                {q}
              </Text>
            </View>
          ))}
        </View>

        {/* Download button */}
        <View style={styles.mockDownloadBtn}>
          <Feather name="download" size={14} color={colors.primary} />
          <Text style={[styles.mockDownloadText, { color: colors.primary }]}>Download</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function EditVisual({
  gradient,
  colors,
}: {
  gradient: [string, string];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.heroCenter}>
      <LinearGradient colors={gradient} style={styles.featureCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Mock canvas with editable text + sticker */}
        <View style={styles.mockCanvas}>
          <LinearGradient
            colors={["#1A0B2E", "#7C3AED"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.mockCanvasText}>VIRAL</Text>
          <Text style={styles.mockCanvasEmoji}>🔥</Text>
          {/* selection handles to imply "tap to edit" */}
          <View style={[styles.handle, { top: -4, left: -4 }]} />
          <View style={[styles.handle, { top: -4, right: -4 }]} />
          <View style={[styles.handle, { bottom: -4, left: -4 }]} />
          <View style={[styles.handle, { bottom: -4, right: -4 }]} />
        </View>

        {/* Tools row */}
        <View style={styles.mockToolsRow}>
          {(["type", "image", "smile", "droplet", "edit-3"] as const).map((icon, i) => (
            <View
              key={icon}
              style={[
                styles.mockTool,
                i === 0 ? { backgroundColor: "#FFFFFF" } : null,
              ]}
            >
              <Feather name={icon} size={14} color={i === 0 ? colors.primary : "#FFFFFF"} />
            </View>
          ))}
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Feather name="edit-2" size={11} color="#0B0B12" />
          <Text style={styles.tapHintText}>Tap any text to edit</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function ReadyVisual({
  gradient,
  colors,
}: {
  gradient: [string, string];
  colors: ReturnType<typeof useColors>;
}) {
  const benefits: Array<{ icon: keyof typeof Feather.glyphMap; label: string }> = [
    { icon: "check-circle", label: "Free forever" },
    { icon: "check-circle", label: "No signup or login" },
    { icon: "check-circle", label: "No watermark on downloads" },
    { icon: "check-circle", label: "Works offline after first use" },
  ];
  return (
    <View style={styles.heroCenter}>
      <LinearGradient colors={gradient} style={styles.featureCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.readyHeader}>
          <Feather name="award" size={36} color="#FFFFFF" />
          <Text style={styles.readyHeaderText}>You're all set</Text>
        </View>
        <View style={{ gap: 10 }}>
          {benefits.map((b, i) => (
            <Animated.View
              key={b.label}
              entering={FadeInDown.delay(150 + i * 80).duration(380)}
              style={styles.benefitRow}
            >
              <Feather name={b.icon} size={16} color="#FFFFFF" />
              <Text style={styles.benefitText}>{b.label}</Text>
            </Animated.View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  skipBtn: { padding: 10 },
  skipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  slide: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    paddingTop: Platform.OS === "web" ? 24 : 0,
  },

  heroArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxHeight: 360,
  },
  heroCenter: { alignItems: "center", justifyContent: "center" },

  brandMark: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
  swipeHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  swipeHintText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  /* Feature card (used by download / edit / ready slides) */
  featureCard: {
    width: 280,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },

  /* Download mock */
  mockUrlBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.32)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mockUrlText: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    flex: 1,
  },
  mockThumbWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  mockThumb: { width: "100%", height: "100%" },
  qualityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qualityBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#0B0B12", letterSpacing: 0.5 },
  mockChipsRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  mockChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  mockChipText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  mockDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
  },
  mockDownloadText: { fontFamily: "Inter_700Bold", fontSize: 14 },

  /* Edit mock */
  mockCanvas: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    position: "relative",
  },
  mockCanvasText: {
    fontFamily: "Anton_400Regular",
    color: "#FFD700",
    fontSize: 38,
    letterSpacing: 1.5,
  },
  mockCanvasEmoji: { fontSize: 36 },
  handle: {
    position: "absolute",
    width: 8,
    height: 8,
    backgroundColor: "#00F0FF",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  mockToolsRow: { flexDirection: "row", gap: 6 },
  mockTool: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "center",
  },
  tapHintText: { color: "#0B0B12", fontFamily: "Inter_700Bold", fontSize: 11 },

  /* Ready mock */
  readyHeader: { alignItems: "center", gap: 6, marginBottom: 6 },
  readyHeaderText: {
    color: "#FFFFFF",
    fontFamily: "Anton_400Regular",
    fontSize: 22,
    letterSpacing: 0.8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  benefitText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },

  /* Copy block (eyebrow + title + body) */
  copy: { alignItems: "center", marginTop: 24 },
  eyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Anton_400Regular",
    fontSize: 32,
    letterSpacing: 0.5,
    lineHeight: 36,
    textAlign: "center",
  },
  body: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
    maxWidth: 320,
  },

  /* Page dots */
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginVertical: 18,
  },
  dot: { height: 8, borderRadius: 4 },

  /* Bottom CTA */
  bottom: { paddingHorizontal: 20, paddingTop: 4 },
  cta: {
    height: 58,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.4,
  },
});
