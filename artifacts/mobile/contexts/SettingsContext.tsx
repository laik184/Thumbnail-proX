import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type AppLanguage = "en" | "es" | "hi";

interface SettingsState {
  darkMode: boolean;
  notificationsEnabled: boolean;
  language: AppLanguage;
  removeAds: boolean;
  removeBgApiKey: string;
  installedAt: number; // ms timestamp of first launch
  exportCount: number;
  /**
   * When true, downloaded thumbnails are saved to the gallery automatically
   * without showing the blocking "Saved" alert (a non-modal toast appears
   * instead). Default is `true` because download apps that require an extra
   * tap to save lose ~15–25% of users at the save step.
   */
  autoSave: boolean;
}

interface SettingsContextType extends SettingsState {
  setDarkMode: (value: boolean) => Promise<void>;
  setNotificationsEnabled: (value: boolean) => Promise<void>;
  setLanguage: (value: AppLanguage) => Promise<void>;
  setRemoveAds: (value: boolean) => Promise<void>;
  setRemoveBgApiKey: (value: string) => Promise<void>;
  setAutoSave: (value: boolean) => Promise<void>;
  incrementExportCount: () => Promise<void>;
  isLoaded: boolean;
  /** True for the first 24h after install — ads are hidden during this grace period */
  isInGracePeriod: boolean;
  /** True if free user should see watermark on exports */
  shouldWatermark: boolean;
}

const defaultSettings: SettingsState = {
  darkMode: true,
  notificationsEnabled: false,
  language: "en",
  removeAds: false,
  removeBgApiKey: "",
  installedAt: 0,
  exportCount: 0,
  autoSave: true,
};

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem("@settings");
      let merged: SettingsState = { ...defaultSettings };
      if (stored) {
        merged = { ...merged, ...JSON.parse(stored) };
      }
      if (!merged.installedAt) {
        merged.installedAt = Date.now();
        await AsyncStorage.setItem("@settings", JSON.stringify(merged));
      }
      setSettings(merged);
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const persist = async (newSettings: SettingsState) => {
    try {
      await AsyncStorage.setItem("@settings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  const setDarkMode = async (darkMode: boolean) => {
    await persist({ ...settings, darkMode });
  };

  const setNotificationsEnabled = async (notificationsEnabled: boolean) => {
    if (notificationsEnabled && Platform.OS !== "web") {
      try {
        const current = await Notifications.getPermissionsAsync();
        let status = current.status;
        if (status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== "granted") {
          Alert.alert(
            "Notifications blocked",
            "Notifications are disabled in your system settings. Open settings to enable them?",
            [
              { text: "Not now", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          await persist({ ...settings, notificationsEnabled: false });
          return;
        }
      } catch (e) {
        console.error("Notification permission failed", e);
        await persist({ ...settings, notificationsEnabled: false });
        return;
      }
    }
    await persist({ ...settings, notificationsEnabled });
  };

  const setLanguage = async (language: AppLanguage) => {
    await persist({ ...settings, language });
  };

  const setRemoveAds = async (removeAds: boolean) => {
    await persist({ ...settings, removeAds });
  };

  const setRemoveBgApiKey = async (removeBgApiKey: string) => {
    await persist({ ...settings, removeBgApiKey: removeBgApiKey.trim() });
  };

  const setAutoSave = async (autoSave: boolean) => {
    await persist({ ...settings, autoSave });
  };

  const incrementExportCount = async () => {
    await persist({ ...settings, exportCount: settings.exportCount + 1 });
  };

  const isInGracePeriod =
    settings.installedAt > 0 && Date.now() - settings.installedAt < GRACE_PERIOD_MS;
  const shouldWatermark = !settings.removeAds;

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setDarkMode,
        setNotificationsEnabled,
        setLanguage,
        setRemoveAds,
        setRemoveBgApiKey,
        setAutoSave,
        incrementExportCount,
        isLoaded,
        isInGracePeriod,
        shouldWatermark,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
