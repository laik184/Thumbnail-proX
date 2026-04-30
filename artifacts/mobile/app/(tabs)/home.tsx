import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  Alert,
  RefreshControl,
  Share,
  FlatList,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useRecentActivity } from "@/contexts/RecentActivityContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AdBanner } from "@/components/AdBanner";
import { useT } from "@/hooks/useT";
import { TEMPLATES } from "@/constants/templates";
import { TRENDING_VIDEOS } from "@/constants/trending";
import { extractVideoId } from "@/lib/youtube";

const FEATURED_TEMPLATES = TEMPLATES.slice(0, 6);
const QUALITY_BADGES = ["4K", "Max HD", "1080p", "720p", "480p"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, removeEntry } = useRecentActivity();
  const { exportCount, removeAds } = useSettings();
  const t = useT();

  const [refreshing, setRefreshing] = useState(false);
  const [trendingShuffle, setTrendingShuffle] = useState(0);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [clipboardHint, setClipboardHint] = useState(false);

  // Track which clipboard string we've already auto-filled, so we don't keep
  // re-prompting the user with the same link every time the screen focuses.
  const lastAutoFilledRef = useRef<string>("");

  // Subtle pulse on the "Get Thumbnail" CTA when a clipboard URL is auto-filled.
  const ctaPulse = useSharedValue(1);
  const ctaPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

  /**
   * Clipboard auto-detect — the single biggest first-launch retention win.
   * If the user just copied a YouTube link (likely — they came from YouTube),
   * pre-fill the URL field and pulse the CTA so they download in 1 tap.
   *
   * Runs every time Home gains focus, but only when the input is empty and the
   * clipboard contents are different from what we've already auto-filled.
   * `Clipboard.getStringAsync()` is a no-op without user gesture on web — that's
   * fine, the rest of the screen still works.
   */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (url.trim().length > 0) return;
          const clip = (await Clipboard.getStringAsync()).trim();
          if (cancelled || !clip) return;
          if (clip === lastAutoFilledRef.current) return;
          if (!extractVideoId(clip)) return;

          lastAutoFilledRef.current = clip;
          setUrl(clip);
          setUrlError("");
          setClipboardHint(true);
          Haptics.selectionAsync();

          ctaPulse.value = withRepeat(
            withSequence(
              withTiming(1.04, { duration: 450 }),
              withTiming(1, { duration: 450 })
            ),
            6,
            false
          );
        } catch {
          // Web without gesture, or clipboard permission denied — silent.
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Auto-hide the green hint once the user starts typing/clearing.
  useEffect(() => {
    if (clipboardHint && url !== lastAutoFilledRef.current) {
      setClipboardHint(false);
    }
  }, [url, clipboardHint]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrendingShuffle((s) => s + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setUrl(text);
        setUrlError("");
        Haptics.selectionAsync();
      }
    } catch (e) {
      console.error("Failed to read clipboard", e);
    }
  };

  const handleGetThumbnail = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("Paste a YouTube link first");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const id = extractVideoId(trimmed);
    if (!id) {
      setUrlError("That doesn't look like a valid YouTube link");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setUrlError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/download", params: { url: trimmed } });
  };

  const handleDeleteEntry = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      removeEntry(id);
      return;
    }
    Alert.alert("Remove from recent?", "This only removes it from the list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          removeEntry(id);
        },
      },
    ]);
  };

  const handleEntryPress = (uri: string, title: string) => {
    Haptics.selectionAsync();
    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = uri;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    Alert.alert(title, "What would you like to do?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Share",
        onPress: async () => {
          try {
            await Share.share({ url: uri, message: title });
          } catch {}
        },
      },
    ]);
  };

  const handleTrendingTap = (videoId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/download", params: { url: `https://youtu.be/${videoId}` } });
  };

  const handleTemplateTap = (templateId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/create", params: { template: templateId } });
  };

  // Shuffle trending list for "feels new" pull-to-refresh
  const trendingShuffled = React.useMemo(() => {
    const arr = [...TRENDING_VIDEOS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [trendingShuffle]);

  const webInsets =
    Platform.OS === "web"
      ? { paddingTop: Math.max(insets.top, 67) }
      : { paddingTop: insets.top };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, webInsets]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Compact header — premium gradient brand mark with play badge */}
        <View style={styles.compactHeader}>
          <View style={styles.brandRow}>
            <LinearGradient
              colors={["#8A2BE2", "#FF3366", "#FF8C00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandIcon}
            >
              <Feather name="play" size={11} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.compactBrand, { color: colors.foreground }]}>
              Pro Thumbnail
            </Text>
            <View style={styles.masterPillWrap}>
              <LinearGradient
                colors={["#8A2BE2", "#FF3366", "#FF8C00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.masterPill}
              >
                <Text style={styles.masterPillText}>MASTER</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Hero — vertically-centred, large, dominant. The download bar is the
            app's primary action so it gets the visual centre of the first
            viewport. Everything else (templates, trending, recent) lives
            below the fold. */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={["#7C3AED", "#FF3366", "#00C2FF"]}
            style={styles.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Glossy top highlight — premium glass sheen */}
            <View pointerEvents="none" style={styles.heroSheen} />
            <Text style={styles.heroEyebrow}>YOUTUBE THUMBNAIL DOWNLOADER</Text>
            <Text style={styles.heroTitle}>Paste a link.{"\n"}Get the thumbnail.</Text>
            <Text style={styles.heroSub}>
              Original quality — 4K, HD, 1080p. Free, no watermark on downloads.
            </Text>

            <View style={styles.qualityChipsRow}>
              {QUALITY_BADGES.map((q) => (
                <View key={q} style={styles.qualityChip}>
                  <Text style={styles.qualityChipText}>{q}</Text>
                </View>
              ))}
            </View>

            {/* URL paste field — large, prominent, centred. */}
            <View style={styles.inputWrap}>
              <Feather
                name="link"
                size={20}
                color="rgba(255,255,255,0.9)"
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Paste YouTube link…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (urlError) setUrlError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleGetThumbnail}
                accessibilityLabel="YouTube video URL"
              />
              {url.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setUrl("");
                    setUrlError("");
                  }}
                  hitSlop={8}
                  style={styles.clearBtn}
                  accessibilityLabel="Clear URL"
                >
                  <Feather name="x-circle" size={20} color="rgba(255,255,255,0.9)" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handlePaste}
                  hitSlop={8}
                  style={styles.pasteBtn}
                  accessibilityLabel="Paste from clipboard"
                >
                  <Text style={styles.pasteText}>PASTE</Text>
                </Pressable>
              )}
            </View>

            {urlError ? <Text style={styles.errorText}>{urlError}</Text> : null}

            {clipboardHint ? (
              <Animated.View entering={FadeInDown.springify()} style={styles.clipboardHint}>
                <Feather name="check-circle" size={14} color="#0B0B12" />
                <Text style={styles.clipboardHintText}>
                  Found a YouTube link in your clipboard — tap to download
                </Text>
              </Animated.View>
            ) : null}

            <Animated.View style={ctaPulseStyle}>
              <Pressable
                onPress={handleGetThumbnail}
                style={({ pressed }) => [
                  styles.heroCta,
                  {
                    backgroundColor: colors.action,
                    shadowColor: colors.action,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
                accessibilityLabel="Get thumbnail"
              >
                <Feather name="download" size={20} color={colors.actionForeground} />
                <Text style={[styles.heroCtaText, { color: colors.actionForeground }]}>
                  Get Thumbnail
                </Text>
              </Pressable>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* Secondary action: Create */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/create");
          }}
          style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel="Design a new thumbnail"
        >
          <View style={[styles.createIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="edit-3" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>
              Design your own thumbnail
            </Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>
              30+ templates · text · stickers · backgrounds
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Featured templates */}
        <SectionHeader
          title="Featured templates"
          actionLabel="See all"
          onAction={() => router.push("/create")}
          colors={colors}
        />
        <FlatList
          horizontal
          data={FEATURED_TEMPLATES}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tplCarousel}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleTemplateTap(item.id)}
              style={[styles.tplCard, { borderColor: colors.border }]}
              accessibilityLabel={`Use template ${item.name}`}
            >
              {item.bg.type === "gradient" && item.bg.gradient ? (
                <LinearGradient colors={item.bg.gradient} style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bg.color ?? "#222" }]} />
              )}
              {item.layers[0] ? (
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: item.layers[0].fontFamily,
                    color: item.layers[0].color,
                    fontSize: 22,
                    textAlign: "center",
                    paddingHorizontal: 8,
                  }}
                >
                  {item.layers[0].text}
                </Text>
              ) : null}
              <View style={[styles.tplCategoryBadge, { backgroundColor: colors.background + "DD" }]}>
                <Text style={[styles.tplCategoryText, { color: colors.foreground }]}>
                  {item.category}
                </Text>
              </View>
            </Pressable>
          )}
        />

        {/* Trending YouTube */}
        <SectionHeader
          title="Trending — tap to download"
          actionLabel="Refresh"
          onAction={onRefresh}
          colors={colors}
        />
        <FlatList
          horizontal
          data={trendingShuffled.slice(0, 8)}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendCarousel}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleTrendingTap(item.id)}
              style={[styles.trendCard, { borderColor: colors.border }]}
              accessibilityLabel={`Grab thumbnail for ${item.category} trend`}
            >
              <Image
                source={{ uri: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <View style={[styles.trendOverlay, { backgroundColor: colors.background + "AA" }]}>
                <Feather name="download" size={14} color="#FFFFFF" />
                <Text style={styles.trendCategoryText}>{item.category}</Text>
              </View>
            </Pressable>
          )}
        />

        {/* Tutorial / Tip card */}
        {!removeAds && exportCount === 0 ? (
          <Pressable
            onPress={() => router.push("/onboarding")}
            style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityLabel="See quick tour"
          >
            <View style={[styles.tipIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="play-circle" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>New here?</Text>
              <Text style={[styles.tipSub, { color: colors.mutedForeground }]}>
                Take a 30-second tour of all features
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        {/* Recent activity */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("home_recent")}</Text>
            {entries.length > 0 ? (
              <Pressable
                onPress={() => router.push("/history")}
                hitSlop={8}
                accessibilityLabel="View all history"
              >
                <Text style={[styles.viewAll, { color: colors.primary }]}>{t("home_view_all")}</Text>
              </Pressable>
            ) : null}
          </View>

          {entries.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="link" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
                Paste a YouTube link above to grab your first thumbnail.
              </Text>
            </View>
          ) : (
            <View style={styles.recentGrid}>
              {entries.slice(0, 6).map((entry, index) => (
                <Animated.View
                  key={entry.id}
                  entering={FadeInUp.delay(index * 100).springify()}
                  style={styles.recentItemContainer}
                >
                  <Pressable
                    style={styles.recentItem}
                    onPress={() => handleEntryPress(entry.thumbnailUri, entry.title)}
                    accessibilityLabel={entry.title}
                  >
                    <Image source={{ uri: entry.thumbnailUri }} style={styles.recentImage} />
                    <View
                      style={[
                        styles.recentBadge,
                        { backgroundColor: colors.background + "CC" },
                      ]}
                    >
                      <Feather
                        name={entry.type === "download" ? "download" : "edit-3"}
                        size={12}
                        color={colors.foreground}
                      />
                    </View>
                    <Pressable
                      onPress={() => handleDeleteEntry(entry.id)}
                      hitSlop={12}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        {
                          backgroundColor: "rgba(0,0,0,0.65)",
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      accessibilityLabel="Remove from recent"
                    >
                      <Feather name="x" size={14} color="#FFFFFF" />
                    </Pressable>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <AdBanner />
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
  colors,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityLabel={actionLabel}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  compactHeader: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
  compactBrand: {
    fontFamily: "Anton_400Regular",
    fontSize: 22,
    letterSpacing: 1,
  },
  masterPillWrap: {
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  masterPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  masterPillText: {
    color: "#FFFFFF",
    fontFamily: "Anton_400Regular",
    fontSize: 16,
    letterSpacing: 1.4,
  },
  heroWrap: {
    marginBottom: 24,
    marginTop: 8,
  },
  hero: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    // Stronger pink/violet glow — Instagram-style premium card lift
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  heroSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.8,
    textAlign: "center",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "Anton_400Regular",
    fontSize: 28,
    letterSpacing: 0.5,
    lineHeight: 34,
    textAlign: "center",
  },
  heroSub: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
    textAlign: "center",
  },
  qualityChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    marginBottom: 18,
    justifyContent: "center",
  },
  qualityChip: {
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  qualityChipText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(11,11,18,0.45)",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    // Inner glass highlight at the top edge
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    height: "100%",
    paddingVertical: 0,
  },
  clearBtn: { padding: 6 },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  pasteText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.6 },
  errorText: {
    color: "#FFE0E0",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 8,
  },
  clipboardHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  clipboardHintText: {
    color: "#0B0B12",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    flex: 1,
  },
  heroCta: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    // Subtle lift to make the CTA feel tactile and primary
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  heroCtaText: { fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.3 },
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 22,
    gap: 12,
  },
  createIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  createSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  viewAll: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tplCarousel: { gap: 10, paddingRight: 4, marginBottom: 18 },
  tplCard: {
    width: 150,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tplCategoryBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tplCategoryText: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.4 },
  trendCarousel: { gap: 10, paddingRight: 4, marginBottom: 18 },
  trendCard: {
    width: 160,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  trendOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  trendCategoryText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
    gap: 12,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  tipSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  recentSection: { marginBottom: 24 },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 10,
  },
  emptyStateText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  recentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  recentItemContainer: { width: "48.5%", aspectRatio: 16 / 9 },
  recentItem: { flex: 1, borderRadius: 10, overflow: "hidden" },
  recentImage: { width: "100%", height: "100%" },
  recentBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    padding: 4,
    borderRadius: 6,
  },
  deleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
