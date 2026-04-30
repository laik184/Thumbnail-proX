import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: padBottom + 24 }]}>
        <Text style={[styles.h1, { color: colors.foreground }]}>Privacy Policy</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Last updated: April 28, 2026</Text>

        <Section c={colors} title="Overview">
          Pro Thumbnail Master (&quot;we&quot;, &quot;the app&quot;) respects your privacy. This policy explains what data we collect, how it&apos;s used, and the choices you have.
        </Section>

        <Section c={colors} title="Information We Collect">
          • Anonymous usage events (screen views, feature taps) to improve the app.{"\n"}
          • Crash diagnostics to fix bugs.{"\n"}
          • Locally stored content: thumbnails you download or create, recent activity, and your settings. This data stays on your device and is not transmitted to us.
        </Section>

        <Section c={colors} title="What We Do NOT Collect">
          • We do not collect your name, email, phone number, location, or contacts.{"\n"}
          • We do not sell or share personal data with third parties.
        </Section>

        <Section c={colors} title="Permissions">
          • Photos / Media Library — required to save thumbnails to your gallery and pick background images.{"\n"}
          • Notifications (optional) — used only to notify you about new features. You can turn this off any time in Settings.
        </Section>

        <Section c={colors} title="YouTube Content">
          The app fetches publicly available thumbnail images directly from YouTube&apos;s CDN. We are not affiliated with YouTube or Google LLC. Use of downloaded thumbnails is your responsibility and must comply with YouTube&apos;s Terms of Service and applicable copyright law.
        </Section>

        <Section c={colors} title="Advertising">
          The app may display banner advertisements. Ad partners may collect device identifiers for ad personalization. You can opt out via your device settings or upgrade to remove ads.
        </Section>

        <Section c={colors} title="Children">
          The app is not directed to children under 13.
        </Section>

        <Section c={colors} title="Contact">
          Questions? Email us at support@prothumbnailmaster.com.
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ c, title, children }: { c: any; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.h2, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: c.mutedForeground }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  h1: { fontFamily: "Anton_400Regular", fontSize: 28, letterSpacing: 0.5 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  h2: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 6 },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
});
