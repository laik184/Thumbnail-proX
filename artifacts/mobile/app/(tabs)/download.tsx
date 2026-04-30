import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  ScrollView,
  Share,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useRecentActivity } from "@/contexts/RecentActivityContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AdBanner } from "@/components/AdBanner";
import { isAdsAvailable, maybeShowInterstitial, showRewarded } from "@/lib/ads";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { extractVideoId, fetchVideoInfo, type YouTubeOembed } from "@/lib/youtube";
import { TRENDING_VIDEOS } from "@/constants/trending";

type QualityKey = "maxres" | "sd" | "hq" | "mq";

const QUALITY_OPTIONS: { key: QualityKey; label: string; resolution: string; file: string }[] = [
  { key: "maxres", label: "Max HD", resolution: "1280 x 720", file: "maxresdefault.jpg" },
  { key: "sd", label: "HD", resolution: "640 x 480", file: "sddefault.jpg" },
  { key: "hq", label: "Standard", resolution: "480 x 360", file: "hqdefault.jpg" },
  { key: "mq", label: "Low", resolution: "320 x 180", file: "mqdefault.jpg" },
];

const NOTIFS_PROMPTED_KEY = "@notifs_prompted_after_download_v1";

function buildThumbUrl(videoId: string, file: string) {
  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

export default function DownloadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addEntry } = useRecentActivity();
  const params = useLocalSearchParams<{ url?: string }>();
  const {
    autoSave,
    incrementExportCount,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useSettings();

  const [url, setUrl] = useState(params.url ?? "");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YouTubeOembed | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<QualityKey>("maxres");
  const [error, setError] = useState("");
  const [imageBroken, setImageBroken] = useState(false);
  const [maxResUnavailable, setMaxResUnavailable] = useState(false);
  const [autoFellBack, setAutoFellBack] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /**
   * Tracks the videoId+quality combinations we've already auto-saved during
   * this session, so we don't re-save the same thumbnail every time the
   * preview re-renders. Resets whenever the videoId changes.
   */
  const autoSavedRef = useRef<Set<string>>(new Set());
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Auto-fetch when URL changes
  useEffect(() => {
    const id = extractVideoId(url);
    if (id && id !== videoId && !fetching) {
      setVideoId(id);
      setSelectedQuality("maxres");
      setMaxResUnavailable(false);
      setAutoFellBack(false);
      setImageBroken(false);
      setError("");
      setVideoInfo(null);
      autoSavedRef.current = new Set();
      fetchVideoInfo(id).then((info) => setVideoInfo(info));
    }
  }, [url]); // eslint-disable-line

  // Apply param URL on mount (also handles deep links from share intent)
  useEffect(() => {
    if (params.url && params.url !== url) {
      setUrl(params.url);
    }
  }, [params.url]); // eslint-disable-line

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setUrl(text);
        Haptics.selectionAsync();
        setError("");
      }
    } catch (e) {
      console.error("Failed to read clipboard", e);
    }
  };

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }
    const id = extractVideoId(url);
    if (!id) {
      setError("Invalid YouTube URL. Paste a full link from youtube.com or youtu.be");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError("");
    setFetching(true);
    setImageBroken(false);
    setMaxResUnavailable(false);
    setAutoFellBack(false);
    setVideoInfo(null);
    autoSavedRef.current = new Set();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideoId(id);
    setSelectedQuality("maxres");
    fetchVideoInfo(id).then((info) => setVideoInfo(info));
    setTimeout(() => {
      setFetching(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Show interstitial after the thumbnail is fetched (frequency-capped).
      maybeShowInterstitial();
    }, 200);
  };

  const handleSelectQuality = (key: QualityKey) => {
    setSelectedQuality(key);
    setImageBroken(false);
    setAutoFellBack(false);
    Haptics.selectionAsync();
  };

  const handleImageLoad = (event: {
    nativeEvent?: { source?: { width?: number; height?: number } };
  }) => {
    const src = event?.nativeEvent?.source;
    const w = src?.width ?? 0;
    const h = src?.height ?? 0;
    if (selectedQuality === "maxres" && w > 0 && w <= 120 && h <= 90) {
      setMaxResUnavailable(true);
      setSelectedQuality("sd");
      setAutoFellBack(true);
      setImageBroken(false);
      // Don't auto-save the placeholder — wait for the next quality to render.
      return;
    }
    // Successfully rendered a real preview → auto-save if enabled.
    if (autoSave && Platform.OS !== "web" && videoId) {
      const key = `${videoId}|${selectedQuality}`;
      if (!autoSavedRef.current.has(key) && !saving) {
        autoSavedRef.current.add(key);
        // Defer slightly so the UI has a moment to settle before saving.
        setTimeout(() => handleSave({ silent: true }), 150);
      }
    }
  };

  const currentThumbUrl = videoId
    ? buildThumbUrl(videoId, QUALITY_OPTIONS.find((q) => q.key === selectedQuality)!.file)
    : null;

  const friendlyError = (err: any): string => {
    const msg = String(err?.message ?? err ?? "");
    if (/network|fetch|TypeError/i.test(msg)) {
      return "No internet connection. Please check your network and try again.";
    }
    if (/HTTP 4|HTTP 5/.test(msg)) {
      return "YouTube didn't return this thumbnail. Try a different quality.";
    }
    return "Could not save the thumbnail. Try a different quality or try again later.";
  };

  /**
   * One-time prompt right after the user's first successful download to invite
   * them to enable notifications. We only ask once (tracked in AsyncStorage)
   * and never on web. The "Yes" path delegates to the existing settings setter
   * which handles the system permission flow.
   */
  const maybePromptNotificationsAfterFirstSave = async () => {
    if (Platform.OS === "web") return;
    if (notificationsEnabled) return;
    try {
      const already = await AsyncStorage.getItem(NOTIFS_PROMPTED_KEY);
      if (already === "1") return;
      await AsyncStorage.setItem(NOTIFS_PROMPTED_KEY, "1");
      // Delay slightly so the toast finishes appearing first.
      setTimeout(() => {
        Alert.alert(
          "Get notified about updates?",
          "We'll send you a friendly reminder if you forget about the app, and ping you when fresh templates drop. No spam.",
          [
            { text: "No thanks", style: "cancel" },
            {
              text: "Yes, notify me",
              onPress: () => {
                setNotificationsEnabled(true).catch(() => {});
              },
            },
          ]
        );
      }, 600);
    } catch {}
  };

  /**
   * Wrap the save action behind a rewarded ad. Per AdMob policy the user
   * must opt-in to viewing the ad and must receive value (the save) for
   * watching it to completion. We only gate manual saves — auto-saves
   * (`silent: true`) and dev/Expo Go (no native ads SDK) bypass the ad.
   */
  const handleSavePress = async () => {
    if (!videoId || !currentThumbUrl || saving || imageBroken) return;

    if (!isAdsAvailable) {
      handleSave();
      return;
    }

    Alert.alert(
      "Save Thumbnail",
      "Watch a short ad to save this thumbnail to your gallery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Watch Ad & Save",
          onPress: async () => {
            const earned = await showRewarded();
            if (earned) {
              handleSave();
            } else {
              // Ad wasn't ready or user closed early — save anyway so the
              // user is never blocked from the action they tapped Save for.
              handleSave();
            }
          },
        },
      ]
    );
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (!videoId || !currentThumbUrl) return;
    if (saving) return;
    const silent = opts?.silent === true;
    setSaving(true);
    setProgress(0);
    try {
      if (Platform.OS === "web") {
        const filename = `thumbnail_${videoId}_${selectedQuality}.jpg`;
        let downloaded = false;
        try {
          const res = await fetch(currentThumbUrl, { mode: "cors", cache: "no-store" });
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            downloaded = true;
          }
        } catch {}
        if (!downloaded) {
          const a = document.createElement("a");
          a.href = currentThumbUrl;
          a.target = "_blank";
          a.rel = "noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          if (!silent) {
            Alert.alert(
              "Opened in a new tab",
              'Right-click (or long-press) the image and choose "Save image as…" to download it.'
            );
          }
        } else if (!silent) {
          showToast("Downloaded ✓");
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          if (!silent) {
            Alert.alert(
              "Permission needed",
              "Please grant permission to save images to your gallery."
            );
          }
          setSaving(false);
          return;
        }
        const fileUri = `${FileSystem.cacheDirectory}thumbnail_${videoId}_${selectedQuality}_${Date.now()}.jpg`;
        const dl = FileSystem.createDownloadResumable(currentThumbUrl, fileUri, {}, (p) => {
          if (p.totalBytesExpectedToWrite > 0) {
            setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
          }
        });
        const downloadRes = await dl.downloadAsync();
        if (!downloadRes || downloadRes.status !== 200) {
          throw new Error(`HTTP ${downloadRes?.status ?? "unknown"}`);
        }
        const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
        try {
          const album = await MediaLibrary.getAlbumAsync("Pro Thumbnail Master");
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync("Pro Thumbnail Master", asset, false);
          }
        } catch {}
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("Saved to Gallery ✓");
      }
      await addEntry({
        type: "download",
        thumbnailUri: currentThumbUrl,
        title:
          videoInfo?.title ??
          `Thumbnail · ${QUALITY_OPTIONS.find((q) => q.key === selectedQuality)!.label}`,
      });
      await incrementExportCount();
      maybePromptNotificationsAfterFirstSave();
    } catch (e) {
      console.error("Save failed", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!silent) {
        Alert.alert("Save failed", friendlyError(e));
      } else {
        showToast("Couldn't save — tap Save to retry");
      }
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  const handleShare = async () => {
    if (!currentThumbUrl) return;
    try {
      if (Platform.OS === "web") {
        await Share.share({ message: currentThumbUrl });
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}share_${videoId}_${selectedQuality}.jpg`;
      const res = await FileSystem.downloadAsync(currentThumbUrl, fileUri);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(res.uri, { mimeType: "image/jpeg", dialogTitle: "Share thumbnail" });
      } else {
        await Share.share({ url: res.uri, message: "Thumbnail" });
      }
    } catch (e) {
      console.error("Share failed", e);
      Alert.alert("Share failed", friendlyError(e));
    }
  };

  const handleTrendingTap = (id: string) => {
    Haptics.selectionAsync();
    setUrl(`https://youtu.be/${id}`);
  };

  const saveButtonLabel = autoSave && Platform.OS !== "web" ? "Save again" : "Save";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 34) + 24 },
        ]}
      >
        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.foreground }]}>Video URL</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Feather name="link" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Paste YouTube link here..."
              placeholderTextColor={colors.mutedForeground}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="YouTube video URL"
            />
            {url.length > 0 ? (
              <Pressable
                onPress={() => {
                  setUrl("");
                  setVideoId(null);
                  setVideoInfo(null);
                }}
                style={styles.clearButton}
                hitSlop={8}
                accessibilityLabel="Clear URL"
              >
                <Feather name="x-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            ) : (
              <Pressable
                onPress={handlePaste}
                style={styles.pasteButton}
                hitSlop={8}
                accessibilityLabel="Paste from clipboard"
              >
                <Text style={[styles.pasteText, { color: colors.primary }]}>Paste</Text>
              </Pressable>
            )}
          </View>
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          {autoSave && Platform.OS !== "web" ? (
            <View style={styles.autoSaveHint}>
              <Feather name="zap" size={12} color={colors.mutedForeground} />
              <Text style={[styles.autoSaveHintText, { color: colors.mutedForeground }]}>
                Auto-save is on — your thumbnail goes straight to the gallery
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.fetchButton, { opacity: pressed ? 0.9 : 1 }]}
            onPress={handleFetch}
            disabled={fetching}
            accessibilityLabel="Get thumbnail"
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.fetchGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {fetching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.fetchButtonText}>Get Thumbnail</Text>}
            </LinearGradient>
          </Pressable>
        </View>

        {videoId && currentThumbUrl ? (
          <View style={styles.previewSection}>
            <Text style={[styles.label, { color: colors.foreground }]}>Preview</Text>

            {videoInfo ? (
              <View style={[styles.videoInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="youtube" size={18} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={[styles.videoTitle, { color: colors.foreground }]}>
                    {videoInfo.title}
                  </Text>
                  <Text numberOfLines={1} style={[styles.videoChannel, { color: colors.mutedForeground }]}>
                    {videoInfo.author_name}
                  </Text>
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.previewContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {imageBroken ? (
                <View style={styles.brokenContainer}>
                  <Feather name="image" size={32} color={colors.mutedForeground} />
                  <Text style={[styles.brokenText, { color: colors.mutedForeground }]}>
                    This quality isn&apos;t available for this video.
                  </Text>
                  <Text style={[styles.brokenHint, { color: colors.mutedForeground }]}>
                    Try a different quality below.
                  </Text>
                </View>
              ) : (
                <Image
                  key={currentThumbUrl}
                  source={{ uri: currentThumbUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
                  onError={() => setImageBroken(true)}
                  accessibilityLabel="Thumbnail preview"
                />
              )}
            </View>

            {autoFellBack && !imageBroken ? (
              <Text style={[styles.fallbackNote, { color: colors.mutedForeground }]}>
                Max HD isn&apos;t available for this video — showing HD instead.
              </Text>
            ) : null}

            <Text style={[styles.label, { color: colors.foreground, marginTop: 8 }]}>Quality</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qualityRow}>
              {QUALITY_OPTIONS.map((q) => {
                const active = q.key === selectedQuality;
                const unavailable = q.key === "maxres" && maxResUnavailable;
                return (
                  <Pressable
                    key={q.key}
                    onPress={() => {
                      if (unavailable) return;
                      handleSelectQuality(q.key);
                    }}
                    disabled={unavailable}
                    style={({ pressed }) => [
                      styles.qualityChip,
                      {
                        backgroundColor: active ? "transparent" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                        opacity: unavailable ? 0.45 : pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityLabel={`${q.label} quality`}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    ) : null}
                    <Text style={[styles.qualityLabel, { color: active ? "#FFFFFF" : colors.foreground }]}>
                      {q.label}
                    </Text>
                    <Text
                      style={[
                        styles.qualityRes,
                        { color: active ? "rgba(255,255,255,0.85)" : colors.mutedForeground },
                      ]}
                    >
                      {unavailable ? "Unavailable" : q.resolution}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {saving && progress > 0 ? (
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed || saving || imageBroken ? 0.6 : 1,
                  },
                ]}
                onPress={handleSavePress}
                disabled={saving || imageBroken}
                accessibilityLabel="Save to gallery"
              >
                {saving ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <>
                    <Feather name="download" size={20} color={colors.foreground} />
                    <Text style={[styles.saveButtonText, { color: colors.foreground }]}>
                      {saveButtonLabel}
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed || saving || imageBroken ? 0.6 : 1,
                  },
                ]}
                onPress={handleShare}
                disabled={saving || imageBroken}
                accessibilityLabel="Share thumbnail"
              >
                <Feather name="share-2" size={20} color={colors.foreground} />
                <Text style={[styles.saveButtonText, { color: colors.foreground }]}>Share</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Trending picks */}
        <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>Trending picks</Text>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          Tap to load a trending video&apos;s thumbnail
        </Text>
        <FlatList
          data={TRENDING_VIDEOS.slice(0, 8)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingTop: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleTrendingTap(item.id)}
              style={[styles.trendCard, { borderColor: colors.border }]}
              accessibilityLabel={`Trending ${item.category}`}
            >
              <Image
                source={{ uri: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <View style={[styles.trendOverlay, { backgroundColor: colors.background + "AA" }]}>
                <Text style={styles.trendCategoryText}>{item.category}</Text>
              </View>
            </Pressable>
          )}
        />
      </KeyboardAwareScrollViewCompat>
      <AdBanner />

      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: Math.max(insets.bottom, 34) + 80,
              backgroundColor: colors.success,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Feather name="check-circle" size={16} color={colors.successForeground} />
          <Text style={[styles.toastText, { color: colors.successForeground }]}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  inputSection: { marginBottom: 24 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 },
  subLabel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: -4, marginBottom: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 8,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, height: "100%" },
  clearButton: { padding: 8, minWidth: 36, alignItems: "center" },
  pasteButton: { padding: 8, minWidth: 48, alignItems: "center" },
  pasteText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 8 },
  autoSaveHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  autoSaveHintText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  fetchButton: { height: 56, borderRadius: 12, overflow: "hidden", marginTop: 16 },
  fetchGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  fetchButtonText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFFFFF" },
  previewSection: { marginTop: 8 },
  videoInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  videoTitle: { fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 18 },
  videoChannel: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  previewContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 20,
  },
  previewImage: { width: "100%", height: "100%" },
  brokenContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  brokenText: { fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" },
  brokenHint: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  fallbackNote: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  qualityRow: { gap: 10, paddingVertical: 4, paddingRight: 4 },
  qualityChip: {
    minWidth: 110,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "flex-start",
  },
  qualityLabel: { fontFamily: "Inter_700Bold", fontSize: 14 },
  qualityRes: { fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 12 },
  progressFill: { height: "100%" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  trendCard: {
    width: 140,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  trendOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendCategoryText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#FFFFFF" },
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 320,
  },
  toastText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
