import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: padBottom + 24 }]}>
        <Text style={[styles.h1, { color: colors.foreground }]}>Terms of Service</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Last updated: April 28, 2026</Text>

        <Section c={colors} title="Acceptance">
          By installing and using Pro Thumbnail Master, you agree to these Terms.
        </Section>

        <Section c={colors} title="License">
          We grant you a personal, non-transferable, revocable license to use the app for personal and commercial creative work, subject to these Terms and applicable law.
        </Section>

        <Section c={colors} title="User Responsibility">
          You are solely responsible for the content you create or download. Do not use the app to download or redistribute thumbnails or images you do not have rights to. Respect copyright and YouTube&apos;s Terms of Service.
        </Section>

        <Section c={colors} title="No Affiliation">
          Pro Thumbnail Master is an independent product. It is not affiliated with, endorsed by, or sponsored by YouTube, Google LLC, or any other third party.
        </Section>

        <Section c={colors} title="Disclaimer">
          The app is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that every thumbnail will be available at every quality, that the app will be uninterrupted, or that all features will work on every device.
        </Section>

        <Section c={colors} title="Limitation of Liability">
          To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app.
        </Section>

        <Section c={colors} title="Changes">
          We may update these Terms from time to time. Continued use of the app constitutes acceptance of the updated Terms.
        </Section>

        <Section c={colors} title="Contact">
          For any questions, email support@prothumbnailmaster.com.
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
