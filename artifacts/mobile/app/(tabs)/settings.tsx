import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  Alert,
  Share,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as StoreReview from "expo-store-review";

import { useColors } from "@/hooks/useColors";
import { useSettings, type AppLanguage } from "@/contexts/SettingsContext";
import { AdBanner } from "@/components/AdBanner";
import { useT } from "@/hooks/useT";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.prothumbnailmaster.app";

const LANG_OPTIONS: { key: AppLanguage; label: string }[] = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिंदी (Hindi)" },
  { key: "es", label: "Español" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const {
    darkMode,
    setDarkMode,
    notificationsEnabled,
    setNotificationsEnabled,
    language,
    setLanguage,
    autoSave,
    setAutoSave,
  } = useSettings();
  const [langOpen, setLangOpen] = useState(false);

  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleSupport = () => {
    Linking.openURL("mailto:support@prothumbnailmaster.com").catch(() =>
      Alert.alert("Email not available", "support@prothumbnailmaster.com")
    );
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `Check out Pro Thumbnail Master — the fastest way to grab and design YouTube thumbnails!\n${PLAY_STORE_URL}`,
      });
    } catch {}
  };

  const handleRate = async () => {
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
      } else {
        Linking.openURL(PLAY_STORE_URL);
      }
    } catch {
      Linking.openURL(PLAY_STORE_URL);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: padBottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Section title={t("set_preferences")} c={colors}>
          <Row icon="moon" label={t("set_dark")} c={colors}>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle dark mode"
            />
          </Row>
          <Divider c={colors} />
          <Row icon="bell" label={t("set_notifs")} c={colors}>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle notifications"
            />
          </Row>
          <Divider c={colors} />
          <Row
            icon="download"
            label="Auto-save to gallery"
            sub="Skip the extra tap — downloads land in your gallery instantly"
            c={colors}
          >
            <Switch
              value={autoSave}
              onValueChange={setAutoSave}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFF"
              accessibilityLabel="Toggle auto-save to gallery"
            />
          </Row>
          <Divider c={colors} />
          <Pressable style={styles.row} onPress={() => setLangOpen(true)} accessibilityLabel="Change language">
            <View style={styles.rowIcon}>
              <Feather name="globe" size={20} color={colors.foreground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{t("set_lang")}</Text>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
              {LANG_OPTIONS.find((l) => l.key === language)?.label ?? "English"}
            </Text>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>
        </Section>

        <Section title={t("set_about_title")} c={colors}>
          <NavRow icon="info" label={t("set_about")} onPress={() => router.push("/about")} c={colors} />
          <Divider c={colors} />
          <NavRow icon="mail" label={t("set_support")} onPress={handleSupport} c={colors} />
          <Divider c={colors} />
          <NavRow icon="share-2" label={t("set_share_app")} onPress={handleShareApp} c={colors} />
          <Divider c={colors} />
          <NavRow icon="star" label={t("set_rate")} onPress={handleRate} c={colors} />
          <Divider c={colors} />
          <NavRow icon="shield" label={t("set_privacy")} onPress={() => router.push("/privacy")} c={colors} />
          <Divider c={colors} />
          <NavRow icon="file-text" label={t("set_terms")} onPress={() => router.push("/terms")} c={colors} />
        </Section>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Version 1.0.0</Text>
      </ScrollView>

      {/* Language picker */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t("set_lang")}</Text>
            {LANG_OPTIONS.map((opt) => {
              const active = opt.key === language;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.modalRow, active && { backgroundColor: colors.muted }]}
                  onPress={() => {
                    setLanguage(opt.key);
                    setLangOpen(false);
                  }}
                  accessibilityLabel={`Select ${opt.label}`}
                >
                  <Text style={[styles.modalRowText, { color: colors.foreground }]}>{opt.label}</Text>
                  {active ? <Feather name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <AdBanner />
    </View>
  );
}

function Section({ title, c, children }: { title: string; c: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.primary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  c,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sub?: string;
  c: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={20} color={c.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: c.foreground }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: c.mutedForeground }]}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function NavRow({
  icon,
  label,
  onPress,
  c,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  c: any;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={20} color={c.foreground} />
      </View>
      <Text style={[styles.rowLabel, { color: c.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={20} color={c.mutedForeground} />
    </Pressable>
  );
}

function Divider({ c }: { c: any }) {
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 60,
    gap: 8,
  },
  rowIcon: { width: 32, alignItems: "flex-start" },
  rowLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 16 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  divider: { height: 1, marginLeft: 48 },
  version: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 16, padding: 12 },
  modalBody: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginBottom: 14 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    minHeight: 48,
  },
  modalRowText: { fontFamily: "Inter_500Medium", fontSize: 15 },
});
