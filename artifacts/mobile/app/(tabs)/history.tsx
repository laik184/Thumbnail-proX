import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Platform,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useRecentActivity } from "@/contexts/RecentActivityContext";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, removeEntry } = useRecentActivity();

  const padBottom = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      removeEntry(id);
      return;
    }
    Alert.alert("Remove?", "Remove this from history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeEntry(id) },
    ]);
  };

  const handleShare = async (uri: string, title: string) => {
    try {
      await Share.share({ url: uri, message: title });
    } catch {
      // User cancelled
    }
  };

  if (entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Feather name="image" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No history yet. Download or create a thumbnail to see it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: padBottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Image source={{ uri: item.thumbnailUri }} style={styles.thumb} />
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleShare(item.thumbnailUri, item.title)}
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  accessibilityLabel="Share thumbnail"
                  hitSlop={6}
                >
                  <Feather name="share-2" size={14} color={colors.foreground} />
                  <Text style={[styles.actionText, { color: colors.foreground }]}>Share</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item.id)}
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  accessibilityLabel="Remove from history"
                  hitSlop={6}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.actionText, { color: colors.destructive }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  row: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 12,
    alignItems: "center",
  },
  thumb: { width: 110, aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: "#000" },
  info: { flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 14 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
  },
  actionText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" },
});
