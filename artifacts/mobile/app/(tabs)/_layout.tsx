import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";

/**
 * Bottom tab bar.
 *
 * Order: Home · Create · **Download** (elevated center) · History · Settings
 *
 * Download is the elevated centre action because the app's primary purpose is
 * downloading YouTube thumbnails — the most important action belongs in the
 * thumb-friendliest spot and gets the strongest visual treatment.
 */
export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => <Feather name="edit-3" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="download"
        options={{
          title: "Download",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                marginTop: -18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.card,
                shadowColor: "#FF3366",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: focused ? 0.55 : 0.4,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <LinearGradient
                colors={["#8A2BE2", "#FF3366", "#FF8C00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 15,
                    backgroundColor: focused ? "transparent" : colors.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {focused ? (
                    <Feather name="download" size={26} color="#FFFFFF" />
                  ) : (
                    <LinearGradient
                      colors={["#8A2BE2", "#FF3366", "#FF8C00"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="download" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  )}
                </View>
              </LinearGradient>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Feather name="image" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
