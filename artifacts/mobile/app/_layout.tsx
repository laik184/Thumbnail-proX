import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Anton_400Regular } from "@expo-google-fonts/anton";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppState, type AppStateStatus, Platform } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { RecentActivityProvider } from "@/contexts/RecentActivityContext";
import { useColors } from "@/hooks/useColors";
import { initializeAds, maybeShowAppOpen } from "@/lib/ads";
import { initializeAnalytics, logScreenView } from "@/lib/analytics";
import { ensureIAPConnection } from "@/lib/iap";
import { scheduleD3Reengagement } from "@/lib/reengagement";
import { extractVideoId } from "@/lib/youtube";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

if (Platform.OS !== "web") {
  // Show banners and play sound even when the app is in the foreground.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Handles inbound deep links and shared YouTube URLs. When the app is opened
 * from another app (Share → Pro Thumbnail Master, or a tapped YouTube link),
 * we extract the video ID and forward the user straight to the download screen
 * with the URL pre-filled.
 */
function DeepLinkHandler() {
  const lastHandledRef = useRef<string | null>(null);
  const initialURL = Linking.useURL();

  useEffect(() => {
    const handleURL = (raw: string | null) => {
      if (!raw || raw === lastHandledRef.current) return;
      const id = extractVideoId(raw);
      if (!id) return;
      lastHandledRef.current = raw;
      router.push({ pathname: "/(tabs)/download", params: { url: raw } });
    };

    handleURL(initialURL);

    const sub = Linking.addEventListener("url", (event) => handleURL(event.url));
    return () => sub.remove();
  }, [initialURL]);

  // Also forward notification taps that include a route in their data payload.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { route?: string } | undefined;
      if (data?.route && typeof data.route === "string") {
        router.push(data.route as never);
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

/**
 * Schedules the D3 re-engagement notification once the user's settings are
 * available. Re-runs only when the relevant inputs change so we don't spam
 * scheduling work on every render.
 */
function RetentionScheduler() {
  const { isLoaded, installedAt, exportCount, notificationsEnabled } = useSettings();
  useEffect(() => {
    if (!isLoaded) return;
    scheduleD3Reengagement({ installedAt, exportCount, notificationsEnabled }).catch(() => {});
  }, [isLoaded, installedAt, exportCount, notificationsEnabled]);
  return null;
}

function RootLayoutNav() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy" }} />
      <Stack.Screen name="terms" options={{ title: "Terms of Service" }} />
      <Stack.Screen name="pricing" options={{ title: "Upgrade to PRO" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    BebasNeue_400Regular,
    Poppins_700Bold,
    Anton_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Fire and forget — all wrappers no-op gracefully in Expo Go / web.
    initializeAds().catch(() => {});
    initializeAnalytics().catch(() => {});
    ensureIAPConnection().catch(() => {});
  }, []);

  // Auto-log screen views to Google Analytics on every route change.
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const name = pathname === "/" ? "splash" : pathname.replace(/^\//, "").replace(/\//g, "_");
    logScreenView(name).catch(() => {});
  }, [pathname]);

  // App-Open ad: show when user brings the app back to foreground.
  // First cold-start ad will be shown the next time they leave & return,
  // not on the very first install — keeps first impression clean.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      // Only fire when transitioning from background → active.
      if ((prev === "background" || prev === "inactive") && next === "active") {
        maybeShowAppOpen();
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <RecentActivityProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <DeepLinkHandler />
                  <RetentionScheduler />
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </RecentActivityProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
