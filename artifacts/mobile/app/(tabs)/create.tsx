import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  Share,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";

import { useColors } from "@/hooks/useColors";
import { useRecentActivity } from "@/contexts/RecentActivityContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AdBanner } from "@/components/AdBanner";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type Template,
  type BackgroundFill,
} from "@/constants/templates";
import { STICKER_CATEGORIES } from "@/constants/stickers";

type LayerKind = "text" | "sticker" | "image";

interface BaseLayer {
  id: string;
  kind: LayerKind;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface TextLayer extends BaseLayer {
  kind: "text";
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  align: "left" | "center" | "right";
  outlineColor: string;
  outlineWidth: number;
}

interface StickerLayer extends BaseLayer {
  kind: "sticker";
  emoji: string;
  fontSize: number;
}

interface ImageLayer extends BaseLayer {
  kind: "image";
  uri: string;
  width: number;
  height: number;
}

type Layer = TextLayer | StickerLayer | ImageLayer;

interface EditorState {
  bg: BackgroundFill | null;
  layers: Layer[];
}

const FONTS = ["Anton_400Regular", "BebasNeue_400Regular", "Poppins_700Bold", "Inter_700Bold"];

const COLORS = [
  "#FFFFFF", "#000000", "#FF3366", "#FF6B00", "#FFD700",
  "#00FF88", "#00F0FF", "#1F8FFF", "#8A2BE2", "#FF00B8",
];

const SOLID_BGS = [
  "#0B0B12", "#1F1F2E", "#FFFFFF", "#FF3366",
  "#00F0FF", "#8A2BE2", "#FFD700", "#1F8FFF",
];

const GRADIENT_BGS: [string, string][] = [
  ["#FF3366", "#8A2BE2"],
  ["#00F0FF", "#1F8FFF"],
  ["#FFD700", "#FF6B00"],
  ["#0B0B12", "#8A2BE2"],
  ["#00FF88", "#00F0FF"],
];

type ExportQualityKey = "maxres" | "hd" | "sd";
const EXPORT_QUALITIES: {
  key: ExportQualityKey;
  label: string;
  resolution: string;
  width: number;
  height: number;
}[] = [
  { key: "maxres", label: "Max HD", resolution: "1280 x 720", width: 1280, height: 720 },
  { key: "hd", label: "HD", resolution: "854 x 480", width: 854, height: 480 },
  { key: "sd", label: "Standard", resolution: "640 x 360", width: 640, height: 360 },
];

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

function applyTemplateToState(tpl: Template): EditorState {
  return {
    bg: tpl.bg,
    layers: tpl.layers.map<TextLayer>((l) => ({
      id: makeId(),
      kind: "text",
      text: l.text,
      color: l.color,
      fontFamily: l.fontFamily,
      fontSize: l.fontSize,
      x: l.x,
      y: l.y,
      rotation: l.rotation,
      scale: l.scale,
      align: l.align,
      outlineColor: l.outlineColor,
      outlineWidth: l.outlineWidth,
    })),
  };
}

function DraggableLayer({
  layer,
  updateLayer,
  isSelected,
  onSelect,
}: {
  layer: Layer;
  updateLayer: (id: string, changes: Partial<Layer>, commit?: boolean) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const translateX = useSharedValue(layer.x);
  const translateY = useSharedValue(layer.y);
  const scale = useSharedValue(layer.scale);
  const savedScale = useSharedValue(layer.scale);
  const rotation = useSharedValue(layer.rotation);
  const savedRotation = useSharedValue(layer.rotation);

  useEffect(() => {
    translateX.value = layer.x;
    translateY.value = layer.y;
    scale.value = layer.scale;
    savedScale.value = layer.scale;
    rotation.value = layer.rotation;
    savedRotation.value = layer.rotation;
  }, [layer.id, layer.x, layer.y, layer.scale, layer.rotation]); // eslint-disable-line

  const commitTransform = () => {
    updateLayer(
      layer.id,
      {
        x: translateX.value,
        y: translateY.value,
        scale: scale.value,
        rotation: rotation.value,
      } as Partial<Layer>,
      true
    );
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      runOnJS(onSelect)(layer.id);
    })
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    })
    .onEnd(() => {
      runOnJS(commitTransform)();
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      runOnJS(onSelect)(layer.id);
    })
    .onChange((event) => {
      scale.value = Math.max(0.2, Math.min(6, savedScale.value * event.scale));
    })
    .onEnd(() => {
      runOnJS(commitTransform)();
    });

  const rotate = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
      runOnJS(onSelect)(layer.id);
    })
    .onChange((event) => {
      rotation.value = savedRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      runOnJS(commitTransform)();
    });

  const composed = Gesture.Simultaneous(pan, pinch, rotate);

  const rStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.draggableItem, rStyle, isSelected && styles.selectedLayer]}>
        {layer.kind === "text" ? <TextLayerView layer={layer} /> : null}
        {layer.kind === "sticker" ? (
          <Text
            style={{ fontSize: layer.fontSize }}
            allowFontScaling={false}
          >
            {layer.emoji}
          </Text>
        ) : null}
        {layer.kind === "image" ? (
          <Image
            source={{ uri: layer.uri }}
            style={{ width: layer.width, height: layer.height }}
            resizeMode="contain"
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

function TextLayerView({ layer }: { layer: TextLayer }) {
  const baseTextStyle = {
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    color: layer.color,
    textAlign: layer.align,
  } as const;
  return (
    <>
      {layer.outlineWidth > 0 && layer.outlineColor !== "transparent" ? (
        <Text
          style={[
            baseTextStyle,
            styles.outlineText,
            {
              color: layer.outlineColor,
              textShadowColor: layer.outlineColor,
              textShadowRadius: layer.outlineWidth,
              ...(Platform.OS === "web"
                ? ({ WebkitTextStroke: `${layer.outlineWidth}px ${layer.outlineColor}` } as object)
                : null),
            } as any,
          ]}
        >
          {layer.text}
        </Text>
      ) : null}
      <Text
        style={[
          baseTextStyle,
          layer.outlineWidth > 0 ? styles.absText : null,
          {
            textShadowColor: "rgba(0,0,0,0.45)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4,
          },
        ]}
      >
        {layer.text}
      </Text>
    </>
  );
}

type ToolKey = "templates" | "bg" | "stickers" | "images" | "filter" | null;

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ template?: string }>();
  const { addEntry } = useRecentActivity();
  const { shouldWatermark, incrementExportCount } = useSettings();
  const viewShotRef = useRef<ViewShot>(null);

  const [state, setState] = useState<EditorState>({ bg: null, layers: [] });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [exportQuality, setExportQuality] = useState<ExportQualityKey>("maxres");
  const [activeTool, setActiveTool] = useState<ToolKey>(null);
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<TemplateCategory>("Gaming");
  const [activeStickerCategory, setActiveStickerCategory] = useState(STICKER_CATEGORIES[0].id);
  const [editTipDismissed, setEditTipDismissed] = useState(false);

  const undoStackRef = useRef<EditorState[]>([]);
  const redoStackRef = useRef<EditorState[]>([]);
  const [, forceUpdate] = useState(0);
  const dirtyRef = useRef(false);
  const appliedTemplateRef = useRef(false);

  const pushHistory = (prev: EditorState) => {
    undoStackRef.current.push(prev);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    dirtyRef.current = true;
    forceUpdate((n) => n + 1);
  };

  const setStateWithHistory = (next: EditorState) => {
    pushHistory(state);
    setState(next);
  };

  // Apply template from query param on first mount
  useEffect(() => {
    if (appliedTemplateRef.current) return;
    if (params.template) {
      const tpl = TEMPLATES.find((t) => t.id === params.template);
      if (tpl) {
        appliedTemplateRef.current = true;
        setState(applyTemplateToState(tpl));
      }
    }
  }, [params.template]);

  const undo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(state);
    setState(prev);
    Haptics.selectionAsync();
    forceUpdate((n) => n + 1);
  };

  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(state);
    setState(next);
    Haptics.selectionAsync();
    forceUpdate((n) => n + 1);
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const sub = (navigation as any).addListener?.("beforeRemove", (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      Alert.alert("Discard changes?", "You have unsaved changes. Leave and lose them?", [
        { text: "Keep editing", style: "cancel", onPress: () => {} },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            dirtyRef.current = false;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return sub;
  }, [navigation]);

  const pickBgImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });
    if (!result.canceled) {
      setStateWithHistory({
        ...state,
        bg: { type: "image", imageUri: result.assets[0].uri },
      });
    }
  };

  const pickImageLayer = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const maxDim = 180;
    const aspect = (asset.width ?? 1) / (asset.height ?? 1);
    let w = maxDim;
    let h = maxDim;
    if (aspect > 1) h = maxDim / aspect;
    else w = maxDim * aspect;
    const newLayer: ImageLayer = {
      id: makeId(),
      kind: "image",
      uri: asset.uri,
      width: w,
      height: h,
      x: 60,
      y: 60,
      rotation: 0,
      scale: 1,
    };
    setStateWithHistory({ ...state, layers: [...state.layers, newLayer] });
    setSelectedLayerId(newLayer.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cropImageLayer = async () => {
    if (!selectedLayer || selectedLayer.kind !== "image") return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      updateLayer(
        selectedLayer.id,
        { uri: asset.uri } as Partial<ImageLayer>,
        true
      );
    } catch {}
  };

  const setSolidBg = (color: string) => {
    setStateWithHistory({ ...state, bg: { type: "color", color } });
  };

  const setGradientBg = (gradient: [string, string]) => {
    setStateWithHistory({ ...state, bg: { type: "gradient", gradient } });
  };

  const applyTemplate = (tpl: Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStateWithHistory(applyTemplateToState(tpl));
    setActiveTool(null);
  };

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: makeId(),
      kind: "text",
      text: "NEW TEXT",
      color: "#FFFFFF",
      fontFamily: "Anton_400Regular",
      fontSize: 48,
      x: 80,
      y: 80,
      rotation: 0,
      scale: 1,
      align: "left",
      outlineColor: "#000000",
      outlineWidth: 2,
    };
    setStateWithHistory({ ...state, layers: [...state.layers, newLayer] });
    setSelectedLayerId(newLayer.id);
    setEditingText(newLayer.text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addStickerLayer = (emoji: string) => {
    const newLayer: StickerLayer = {
      id: makeId(),
      kind: "sticker",
      emoji,
      fontSize: 80,
      x: 100,
      y: 100,
      rotation: 0,
      scale: 1,
    };
    setStateWithHistory({ ...state, layers: [...state.layers, newLayer] });
    setSelectedLayerId(newLayer.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateLayer = (id: string, changes: Partial<Layer>, commit = false) => {
    if (commit) {
      setStateWithHistory({
        ...state,
        layers: state.layers.map((l) => (l.id === id ? ({ ...l, ...changes } as Layer) : l)),
      });
    } else {
      setState((s) => ({
        ...s,
        layers: s.layers.map((l) => (l.id === id ? ({ ...l, ...changes } as Layer) : l)),
      }));
      dirtyRef.current = true;
    }
  };

  const updateTextLayer = (id: string, changes: Partial<TextLayer>, commit = true) => {
    updateLayer(id, changes as Partial<Layer>, commit);
  };

  const updateStickerLayer = (id: string, changes: Partial<StickerLayer>, commit = true) => {
    updateLayer(id, changes as Partial<Layer>, commit);
  };

  const deleteSelected = () => {
    if (!selectedLayerId) return;
    setStateWithHistory({
      ...state,
      layers: state.layers.filter((l) => l.id !== selectedLayerId),
    });
    setSelectedLayerId(null);
  };

  const moveLayer = (direction: "up" | "down") => {
    if (!selectedLayerId) return;
    const idx = state.layers.findIndex((l) => l.id === selectedLayerId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= state.layers.length) return;
    const next = [...state.layers];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setStateWithHistory({ ...state, layers: next });
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    setSelectedLayerId(null);
    setTimeout(async () => {
      try {
        if (Platform.OS !== "web") {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Please grant permission to save images.");
            return;
          }
        }
        if (viewShotRef.current) {
          const quality = EXPORT_QUALITIES.find((q) => q.key === exportQuality)!;
          const uri = await captureRef(viewShotRef, {
            format: "png",
            quality: 1.0,
            width: quality.width,
            height: quality.height,
          });
          if (Platform.OS !== "web") {
            await MediaLibrary.saveToLibraryAsync(uri);
          }
          dirtyRef.current = false;
          await incrementExportCount();
          await addEntry({
            type: "create",
            thumbnailUri: uri,
            title: `Custom Thumbnail · ${quality.label}`,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Saved", `Thumbnail saved at ${quality.resolution}.`, [
            {
              text: "Share",
              onPress: async () => {
                try {
                  if (Platform.OS === "web") {
                    await Share.share({ url: uri, message: "My thumbnail" });
                  } else if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                      mimeType: "image/png",
                      dialogTitle: "Share thumbnail",
                    });
                  }
                } catch {}
              },
            },
            { text: "Done", onPress: () => router.back(), style: "cancel" },
          ]);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to save image.");
      }
    }, 80);
  };

  const selectedLayer = state.layers.find((l) => l.id === selectedLayerId);
  const selectedText = selectedLayer?.kind === "text" ? selectedLayer : undefined;
  const selectedSticker = selectedLayer?.kind === "sticker" ? selectedLayer : undefined;
  const selectedImage = selectedLayer?.kind === "image" ? selectedLayer : undefined;

  const filteredTemplates = useMemo(
    () => TEMPLATES.filter((t) => t.category === activeTemplateCategory),
    [activeTemplateCategory]
  );

  const renderBackground = () => {
    if (!state.bg) {
      return (
        <View style={styles.emptyCanvas}>
          <Feather name="image" size={48} color={colors.border} />
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            Pick a background or template
          </Text>
        </View>
      );
    }
    if (state.bg.type === "image" && state.bg.imageUri) {
      return <Image source={{ uri: state.bg.imageUri }} style={styles.bgImage} />;
    }
    if (state.bg.type === "color") {
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: state.bg.color }]} />;
    }
    if (state.bg.type === "gradient" && state.bg.gradient) {
      return (
        <LinearGradient
          colors={state.bg.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.canvasContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1.0 }}
          style={[styles.canvas, { backgroundColor: colors.card }]}
        >
          {renderBackground()}
          {state.layers.map((layer) => (
            <DraggableLayer
              key={layer.id}
              layer={layer}
              updateLayer={updateLayer}
              isSelected={layer.id === selectedLayerId}
              onSelect={(id) => {
                setSelectedLayerId(id);
                setEditTipDismissed(true);
                const l = state.layers.find((x) => x.id === id);
                if (l && l.kind === "text") setEditingText(l.text);
              }}
            />
          ))}
          {shouldWatermark ? (
            <View style={styles.watermark} pointerEvents="none">
              <Text style={styles.watermarkText}>Pro Thumbnail Master</Text>
            </View>
          ) : null}
        </ViewShot>
        {/* First-touch tip — appears when a template with text is loaded but
            the user hasn't selected anything yet. Teaches the Canva-style
            tap-to-edit gesture; vanishes the moment they engage. */}
        {!editTipDismissed &&
        !selectedLayerId &&
        state.layers.some((l) => l.kind === "text") ? (
          <Pressable
            onPress={() => setEditTipDismissed(true)}
            style={[styles.editTip, { backgroundColor: colors.foreground + "EE" }]}
            accessibilityLabel="Tip: tap any text to edit"
          >
            <Feather name="edit-2" size={12} color={colors.background} />
            <Text style={[styles.editTipText, { color: colors.background }]}>
              Tap any text to edit · long-press the trash icon to delete
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Top toolbar: undo/redo + selected-layer ops */}
      <View style={styles.topBar}>
        <Pressable
          onPress={undo}
          disabled={undoStackRef.current.length === 0}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, opacity: undoStackRef.current.length === 0 ? 0.4 : 1 },
          ]}
          accessibilityLabel="Undo"
        >
          <Feather name="rotate-ccw" size={18} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={redo}
          disabled={redoStackRef.current.length === 0}
          style={[
            styles.iconBtn,
            { backgroundColor: colors.card, opacity: redoStackRef.current.length === 0 ? 0.4 : 1 },
          ]}
          accessibilityLabel="Redo"
        >
          <Feather name="rotate-cw" size={18} color={colors.foreground} />
        </Pressable>
        {selectedLayerId ? (
          <>
            <Pressable
              onPress={() => moveLayer("down")}
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              accessibilityLabel="Send back"
            >
              <Feather name="chevrons-down" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => moveLayer("up")}
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              accessibilityLabel="Bring forward"
            >
              <Feather name="chevrons-up" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={deleteSelected}
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              accessibilityLabel="Delete layer"
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          </>
        ) : null}
      </View>

      <ScrollView
        style={styles.toolsPanel}
        contentContainerStyle={[styles.toolsContent, { paddingBottom: 16 }]}
      >
        <View style={styles.mainTools}>
          <ToolBtn icon="grid" label="Templates" onPress={() => setActiveTool(activeTool === "templates" ? null : "templates")} active={activeTool === "templates"} c={colors} />
          <ToolBtn icon="image" label="Background" onPress={() => setActiveTool(activeTool === "bg" ? null : "bg")} active={activeTool === "bg"} c={colors} />
          <ToolBtn icon="type" label="Add Text" onPress={addTextLayer} active={false} c={colors} />
          <ToolBtn icon="smile" label="Stickers" onPress={() => setActiveTool(activeTool === "stickers" ? null : "stickers")} active={activeTool === "stickers"} c={colors} />
          <ToolBtn icon="user" label="Photo" onPress={pickImageLayer} active={false} c={colors} />
        </View>

        {/* Templates panel */}
        {activeTool === "templates" ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.foreground, marginBottom: 12 }]}>
              Templates ({TEMPLATES.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {TEMPLATE_CATEGORIES.map((cat) => {
                const active = cat === activeTemplateCategory;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveTemplateCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? colors.primary : colors.input,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityLabel={`Template category ${cat}`}
                  >
                    <Text style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: active ? colors.primaryForeground : colors.foreground,
                    }}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {filteredTemplates.map((tpl) => (
                <Pressable key={tpl.id} onPress={() => applyTemplate(tpl)} style={[styles.tplCard, { borderColor: colors.border }]}>
                  {tpl.bg.type === "gradient" && tpl.bg.gradient ? (
                    <LinearGradient colors={tpl.bg.gradient} style={StyleSheet.absoluteFill} />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: tpl.bg.color ?? "#222" }]} />
                  )}
                  {tpl.layers[0] ? (
                    <Text numberOfLines={2} style={{
                      fontFamily: tpl.layers[0].fontFamily,
                      color: tpl.layers[0].color,
                      fontSize: 18,
                      textAlign: "center",
                      paddingHorizontal: 6,
                    }}>{tpl.layers[0].text}</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Background panel */}
        {activeTool === "bg" ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.foreground, marginBottom: 12 }]}>Background</Text>
            <View style={styles.bgGroup}>
              <Pressable
                style={[styles.bgButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={pickBgImage}
                accessibilityLabel="Pick image background"
              >
                <Feather name="upload" size={18} color={colors.foreground} />
                <Text style={[styles.bgButtonText, { color: colors.foreground }]}>Upload image</Text>
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Solid colors</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {SOLID_BGS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSolidBg(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: state.bg?.type === "color" && state.bg.color === c ? "#8A2BE2" : colors.border,
                      borderWidth: state.bg?.type === "color" && state.bg.color === c ? 3 : 1,
                    },
                  ]}
                  accessibilityLabel={`Color ${c}`}
                />
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Gradients</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {GRADIENT_BGS.map((g, i) => (
                <Pressable key={i} onPress={() => setGradientBg(g)} style={[styles.gradSwatch, { borderColor: colors.border }]}>
                  <LinearGradient colors={g} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Stickers panel */}
        {activeTool === "stickers" ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.foreground, marginBottom: 12 }]}>Stickers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              {STICKER_CATEGORIES.map((cat) => {
                const active = cat.id === activeStickerCategory;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setActiveStickerCategory(cat.id)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? colors.primary : colors.input,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    accessibilityLabel={`Sticker category ${cat.label}`}
                  >
                    <Text style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: active ? colors.primaryForeground : colors.foreground,
                    }}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.stickerGrid}>
              {STICKER_CATEGORIES.find((c) => c.id === activeStickerCategory)?.items.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => addStickerLayer(emoji)}
                  style={[styles.stickerCell, { backgroundColor: colors.input, borderColor: colors.border }]}
                  accessibilityLabel={`Add sticker ${emoji}`}
                >
                  <Text style={{ fontSize: 30 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Selected text layer editor */}
        {selectedText ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit text</Text>
              <Pressable onPress={() => setSelectedLayerId(null)} hitSlop={8} accessibilityLabel="Close text editor">
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              value={editingText}
              onChangeText={(v) => {
                setEditingText(v);
                updateTextLayer(selectedText.id, { text: v }, false);
              }}
              onEndEditing={() => updateTextLayer(selectedText.id, { text: editingText }, true)}
              placeholder="Type your text..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => updateTextLayer(selectedText.id, { color: c })}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: selectedText.color === c ? "#8A2BE2" : colors.border,
                      borderWidth: selectedText.color === c ? 3 : 1,
                    },
                  ]}
                  accessibilityLabel={`Color ${c}`}
                />
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.foreground }]}>Outline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {["transparent", ...COLORS].map((c) => (
                <Pressable
                  key={c}
                  onPress={() =>
                    updateTextLayer(selectedText.id, {
                      outlineColor: c,
                      outlineWidth: c === "transparent" ? 0 : Math.max(2, selectedText.outlineWidth),
                    })
                  }
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c === "transparent" ? colors.input : c,
                      borderColor: selectedText.outlineColor === c ? "#8A2BE2" : colors.border,
                      borderWidth: selectedText.outlineColor === c ? 3 : 1,
                    },
                  ]}
                  accessibilityLabel={`Outline ${c}`}
                >
                  {c === "transparent" ? (
                    <Feather name="x" size={16} color={colors.mutedForeground} style={{ alignSelf: "center", marginTop: 8 }} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.foreground }]}>Font size · {Math.round(selectedText.fontSize)}</Text>
            <Slider
              minimumValue={16}
              maximumValue={120}
              step={2}
              value={selectedText.fontSize}
              onValueChange={(v) => updateTextLayer(selectedText.id, { fontSize: v }, false)}
              onSlidingComplete={(v) => updateTextLayer(selectedText.id, { fontSize: v }, true)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Alignment</Text>
            <View style={styles.alignRow}>
              {(["left", "center", "right"] as const).map((a) => (
                <Pressable
                  key={a}
                  onPress={() => updateTextLayer(selectedText.id, { align: a })}
                  style={[
                    styles.alignBtn,
                    {
                      backgroundColor: selectedText.align === a ? colors.primary + "22" : colors.input,
                      borderColor: selectedText.align === a ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Align ${a}`}
                >
                  <Feather name={a === "left" ? "align-left" : a === "center" ? "align-center" : "align-right"} size={18} color={colors.foreground} />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Font</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontScroll}>
              {FONTS.map((f) => (
                <Pressable
                  key={f}
                  style={[
                    styles.fontSwatch,
                    {
                      backgroundColor: colors.input,
                      borderColor: selectedText.fontFamily === f ? colors.primary : colors.border,
                    },
                    selectedText.fontFamily === f && { backgroundColor: colors.primary + "22" },
                  ]}
                  onPress={() => updateTextLayer(selectedText.id, { fontFamily: f })}
                  accessibilityLabel={`Font ${f}`}
                >
                  <Text style={[styles.fontSwatchText, { fontFamily: f, color: colors.foreground }]}>Aa</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Tip: pinch to scale, twist with two fingers to rotate.
            </Text>
          </View>
        ) : null}

        {/* Selected sticker editor */}
        {selectedSticker ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit sticker</Text>
              <Pressable onPress={() => setSelectedLayerId(null)} hitSlop={8} accessibilityLabel="Close sticker editor">
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>Size · {Math.round(selectedSticker.fontSize)}</Text>
            <Slider
              minimumValue={32}
              maximumValue={220}
              step={4}
              value={selectedSticker.fontSize}
              onValueChange={(v) => updateStickerLayer(selectedSticker.id, { fontSize: v }, false)}
              onSlidingComplete={(v) => updateStickerLayer(selectedSticker.id, { fontSize: v }, true)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
            />
          </View>
        ) : null}

        {/* Selected image editor */}
        {selectedImage ? (
          <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.editHeader}>
              <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit photo</Text>
              <Pressable onPress={() => setSelectedLayerId(null)} hitSlop={8} accessibilityLabel="Close photo editor">
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.imageOpsRow}>
              <Pressable
                style={[styles.imageOpBtn, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={cropImageLayer}
                accessibilityLabel="Crop photo"
              >
                <Feather name="crop" size={18} color={colors.foreground} />
                <Text style={[styles.imageOpText, { color: colors.foreground }]}>Crop</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.qualityHeading, { color: colors.mutedForeground }]}>Export Quality</Text>
        <View style={styles.qualityRow}>
          {EXPORT_QUALITIES.map((q) => {
            const active = q.key === exportQuality;
            return (
              <Pressable
                key={q.key}
                onPress={() => {
                  setExportQuality(q.key);
                  Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.qualityChip,
                  {
                    backgroundColor: active ? "transparent" : colors.input,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityLabel={`Export ${q.label}`}
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
                  {q.resolution}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityLabel="Export thumbnail">
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.saveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.saveBtnText}>
              Export · {EXPORT_QUALITIES.find((q) => q.key === exportQuality)!.label}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
      <AdBanner />
    </View>
  );
}

function ToolBtn({
  icon,
  label,
  onPress,
  active,
  c,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  active: boolean;
  c: any;
}) {
  return (
    <Pressable
      style={[
        styles.toolButton,
        {
          backgroundColor: active ? c.primary + "22" : c.card,
          borderColor: active ? c.primary : "transparent",
        },
      ]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Feather name={icon} size={18} color={c.foreground} />
      <Text style={[styles.toolText, { color: c.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvasContainer: { width: "100%", aspectRatio: 16 / 9, marginTop: 16, paddingHorizontal: 16 },
  editTip: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    maxWidth: "92%",
  },
  editTipText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  canvas: { flex: 1, borderRadius: 8, overflow: "hidden" },
  bgImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  emptyCanvas: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyHint: { fontFamily: "Inter_500Medium", fontSize: 12 },
  draggableItem: { position: "absolute", padding: 4 },
  selectedLayer: {
    borderWidth: 2,
    borderColor: "#00F0FF",
    borderStyle: "dashed",
  },
  outlineText: { position: "absolute", left: 4, top: 4 },
  absText: { position: "relative" },
  watermark: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  watermarkText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  topBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toolsPanel: { flex: 1 },
  toolsContent: { padding: 16 },
  mainTools: { flexDirection: "row", gap: 6, marginBottom: 20, flexWrap: "wrap" },
  toolButton: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
  },
  toolText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  editPanel: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  editTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    marginBottom: 8,
  },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8, marginTop: 6 },
  alignRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  alignBtn: {
    flex: 0,
    minWidth: 56,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  bgGroup: { flexDirection: "row", gap: 10 },
  bgButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  bgButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  colorScroll: { flexDirection: "row" },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
  },
  gradSwatch: {
    width: 56,
    height: 36,
    borderRadius: 8,
    marginRight: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  fontScroll: { flexDirection: "row" },
  fontSwatch: {
    width: 56,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fontSwatchText: { fontSize: 18 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: "center",
  },
  tplCard: {
    width: 130,
    aspectRatio: 16 / 9,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  stickerCell: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageOpsRow: { flexDirection: "row", gap: 10 },
  imageOpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  imageOpText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 12, fontStyle: "italic" },
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  qualityHeading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  qualityRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  qualityChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  qualityLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  qualityRes: { fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 2 },
  saveBtn: { height: 56, borderRadius: 12, overflow: "hidden" },
  saveGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 16 },
  watermarkHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});

void ImageManipulator;
