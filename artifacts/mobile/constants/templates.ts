/**
 * Thumbnail templates organized by category.
 * 30+ ready-made designs covering Gaming, Vlog, Tech, News, Education,
 * Lifestyle, plus Hindi/Indian creator styles.
 */

export type BackgroundFill = {
  type: "image" | "color" | "gradient";
  imageUri?: string;
  color?: string;
  gradient?: [string, string];
};

export interface TemplateLayer {
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  align: "left" | "center" | "right";
  outlineColor: string;
  outlineWidth: number;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  bg: BackgroundFill;
  layers: TemplateLayer[];
}

export type TemplateCategory =
  | "Gaming"
  | "Vlog"
  | "Tech"
  | "News"
  | "Education"
  | "Lifestyle"
  | "Hindi"
  | "Reaction";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Gaming",
  "Vlog",
  "Tech",
  "News",
  "Education",
  "Lifestyle",
  "Hindi",
  "Reaction",
];

const ANTON = "Anton_400Regular";
const BEBAS = "BebasNeue_400Regular";
const POPPINS = "Poppins_700Bold";
const INTER = "Inter_700Bold";

export const TEMPLATES: Template[] = [
  // ===== GAMING =====
  {
    id: "g1",
    name: "EPIC WIN",
    category: "Gaming",
    bg: { type: "gradient", gradient: ["#0B0B12", "#8A2BE2"] },
    layers: [
      { text: "EPIC", color: "#FFD700", fontFamily: ANTON, fontSize: 84, x: 40, y: 40, rotation: -6, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
      { text: "WIN!", color: "#FFFFFF", fontFamily: ANTON, fontSize: 84, x: 40, y: 130, rotation: -6, scale: 1, align: "left", outlineColor: "#FF3366", outlineWidth: 4 },
    ],
  },
  {
    id: "g2",
    name: "GAME OVER",
    category: "Gaming",
    bg: { type: "color", color: "#0B0B12" },
    layers: [
      { text: "GAME", color: "#FF3366", fontFamily: ANTON, fontSize: 72, x: 50, y: 60, rotation: 0, scale: 1, align: "left", outlineColor: "#FFFFFF", outlineWidth: 3 },
      { text: "OVER", color: "#FF3366", fontFamily: ANTON, fontSize: 72, x: 50, y: 140, rotation: 0, scale: 1, align: "left", outlineColor: "#FFFFFF", outlineWidth: 3 },
    ],
  },
  {
    id: "g3",
    name: "WORLD RECORD",
    category: "Gaming",
    bg: { type: "gradient", gradient: ["#FF6B00", "#FFD700"] },
    layers: [
      { text: "WORLD RECORD", color: "#FFFFFF", fontFamily: BEBAS, fontSize: 48, x: 30, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "FINALLY!", color: "#0B0B12", fontFamily: ANTON, fontSize: 76, x: 30, y: 110, rotation: -3, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },
  {
    id: "g4",
    name: "BOSS FIGHT",
    category: "Gaming",
    bg: { type: "gradient", gradient: ["#FF3366", "#0B0B12"] },
    layers: [
      { text: "FINAL", color: "#FFD700", fontFamily: ANTON, fontSize: 64, x: 40, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "BOSS", color: "#FFFFFF", fontFamily: ANTON, fontSize: 96, x: 40, y: 110, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
    ],
  },

  // ===== VLOG =====
  {
    id: "v1",
    name: "MY DAY",
    category: "Vlog",
    bg: { type: "gradient", gradient: ["#00FF88", "#00F0FF"] },
    layers: [
      { text: "MY DAY", color: "#0B0B12", fontFamily: POPPINS, fontSize: 72, x: 50, y: 80, rotation: -3, scale: 1, align: "left", outlineColor: "#FFFFFF", outlineWidth: 2 },
    ],
  },
  {
    id: "v2",
    name: "STORY TIME",
    category: "Vlog",
    bg: { type: "gradient", gradient: ["#FF3366", "#FF6B00"] },
    layers: [
      { text: "STORY", color: "#FFFFFF", fontFamily: ANTON, fontSize: 72, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "TIME!", color: "#FFD700", fontFamily: ANTON, fontSize: 84, x: 50, y: 130, rotation: -4, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "v3",
    name: "CHAOS DAY",
    category: "Vlog",
    bg: { type: "color", color: "#1F1F2E" },
    layers: [
      { text: "WORST DAY", color: "#FF3366", fontFamily: BEBAS, fontSize: 56, x: 40, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#FFFFFF", outlineWidth: 2 },
      { text: "EVER 😭", color: "#FFFFFF", fontFamily: ANTON, fontSize: 76, x: 40, y: 120, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "v4",
    name: "TRAVEL",
    category: "Vlog",
    bg: { type: "gradient", gradient: ["#1F8FFF", "#00F0FF"] },
    layers: [
      { text: "I FLEW TO", color: "#FFFFFF", fontFamily: BEBAS, fontSize: 42, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
      { text: "DUBAI 🛫", color: "#FFD700", fontFamily: ANTON, fontSize: 72, x: 50, y: 100, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },

  // ===== TECH =====
  {
    id: "t1",
    name: "iPhone Review",
    category: "Tech",
    bg: { type: "color", color: "#0B0B12" },
    layers: [
      { text: "iPhone 17", color: "#00F0FF", fontFamily: POPPINS, fontSize: 56, x: 40, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
      { text: "HONEST REVIEW", color: "#FFFFFF", fontFamily: BEBAS, fontSize: 42, x: 40, y: 130, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },
  {
    id: "t2",
    name: "VS COMPARE",
    category: "Tech",
    bg: { type: "gradient", gradient: ["#1F8FFF", "#8A2BE2"] },
    layers: [
      { text: "ANDROID", color: "#FFFFFF", fontFamily: ANTON, fontSize: 56, x: 30, y: 80, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
      { text: "VS", color: "#FFD700", fontFamily: ANTON, fontSize: 72, x: 30, y: 140, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "t3",
    name: "Don't Buy",
    category: "Tech",
    bg: { type: "color", color: "#FF3366" },
    layers: [
      { text: "DON'T BUY!", color: "#FFFFFF", fontFamily: ANTON, fontSize: 88, x: 30, y: 90, rotation: -4, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
    ],
  },
  {
    id: "t4",
    name: "AI EXPOSED",
    category: "Tech",
    bg: { type: "gradient", gradient: ["#00F0FF", "#8A2BE2"] },
    layers: [
      { text: "AI", color: "#FFFFFF", fontFamily: ANTON, fontSize: 120, x: 50, y: 30, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
      { text: "EXPOSED 🤯", color: "#FFD700", fontFamily: BEBAS, fontSize: 48, x: 50, y: 150, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
    ],
  },

  // ===== NEWS =====
  {
    id: "n1",
    name: "BREAKING",
    category: "News",
    bg: { type: "color", color: "#FF3366" },
    layers: [
      { text: "BREAKING", color: "#FFFFFF", fontFamily: ANTON, fontSize: 72, x: 40, y: 80, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "n2",
    name: "EXPOSED",
    category: "News",
    bg: { type: "gradient", gradient: ["#0B0B12", "#FF3366"] },
    layers: [
      { text: "TRUTH", color: "#FFD700", fontFamily: ANTON, fontSize: 56, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
      { text: "EXPOSED!", color: "#FFFFFF", fontFamily: ANTON, fontSize: 84, x: 50, y: 120, rotation: -3, scale: 1, align: "left", outlineColor: "#FF3366", outlineWidth: 3 },
    ],
  },
  {
    id: "n3",
    name: "SHOCK NEWS",
    category: "News",
    bg: { type: "gradient", gradient: ["#FF6B00", "#FF3366"] },
    layers: [
      { text: "WAIT WHAT?", color: "#FFFFFF", fontFamily: ANTON, fontSize: 72, x: 40, y: 100, rotation: -2, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
    ],
  },

  // ===== EDUCATION =====
  {
    id: "e1",
    name: "HOW TO",
    category: "Education",
    bg: { type: "color", color: "#0B0B12" },
    layers: [
      { text: "HOW TO", color: "#00F0FF", fontFamily: BEBAS, fontSize: 48, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
      { text: "MASTER IT", color: "#FFFFFF", fontFamily: ANTON, fontSize: 64, x: 50, y: 110, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },
  {
    id: "e2",
    name: "STEP BY STEP",
    category: "Education",
    bg: { type: "gradient", gradient: ["#00F0FF", "#1F8FFF"] },
    layers: [
      { text: "STEP BY STEP", color: "#FFFFFF", fontFamily: BEBAS, fontSize: 36, x: 40, y: 40, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
      { text: "TUTORIAL", color: "#FFD700", fontFamily: ANTON, fontSize: 76, x: 40, y: 100, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "e3",
    name: "FREE COURSE",
    category: "Education",
    bg: { type: "gradient", gradient: ["#00FF88", "#1F8FFF"] },
    layers: [
      { text: "100% FREE", color: "#FFFFFF", fontFamily: ANTON, fontSize: 56, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "COURSE 🎓", color: "#0B0B12", fontFamily: POPPINS, fontSize: 56, x: 50, y: 120, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },

  // ===== LIFESTYLE =====
  {
    id: "l1",
    name: "Minimal",
    category: "Lifestyle",
    bg: { type: "color", color: "#FFFFFF" },
    layers: [
      { text: "Episode 01", color: "#0B0B12", fontFamily: INTER, fontSize: 42, x: 60, y: 100, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },
  {
    id: "l2",
    name: "Aesthetic",
    category: "Lifestyle",
    bg: { type: "gradient", gradient: ["#FFD700", "#FF6B00"] },
    layers: [
      { text: "morning", color: "#FFFFFF", fontFamily: POPPINS, fontSize: 56, x: 50, y: 80, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
      { text: "routine ☕", color: "#0B0B12", fontFamily: POPPINS, fontSize: 56, x: 50, y: 140, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },
  {
    id: "l3",
    name: "Recipe",
    category: "Lifestyle",
    bg: { type: "gradient", gradient: ["#FF6B00", "#FFD700"] },
    layers: [
      { text: "EASY", color: "#FFFFFF", fontFamily: ANTON, fontSize: 64, x: 50, y: 60, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
      { text: "5-MIN RECIPE", color: "#0B0B12", fontFamily: ANTON, fontSize: 56, x: 50, y: 130, rotation: 0, scale: 1, align: "left", outlineColor: "#FFFFFF", outlineWidth: 2 },
    ],
  },

  // ===== HINDI =====
  {
    id: "h1",
    name: "धमाका",
    category: "Hindi",
    bg: { type: "gradient", gradient: ["#FF3366", "#FFD700"] },
    layers: [
      { text: "धमाका!", color: "#FFFFFF", fontFamily: POPPINS, fontSize: 80, x: 40, y: 100, rotation: -4, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
    ],
  },
  {
    id: "h2",
    name: "VIRAL VIDEO",
    category: "Hindi",
    bg: { type: "color", color: "#FF3366" },
    layers: [
      { text: "VIRAL", color: "#FFD700", fontFamily: ANTON, fontSize: 72, x: 40, y: 60, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "वीडियो 🔥", color: "#FFFFFF", fontFamily: POPPINS, fontSize: 56, x: 40, y: 140, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
    ],
  },
  {
    id: "h3",
    name: "SHOCKED!",
    category: "Hindi",
    bg: { type: "gradient", gradient: ["#8A2BE2", "#FF3366"] },
    layers: [
      { text: "OMG 😱", color: "#FFD700", fontFamily: ANTON, fontSize: 64, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "क्या हुआ?", color: "#FFFFFF", fontFamily: POPPINS, fontSize: 56, x: 50, y: 130, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
    ],
  },
  {
    id: "h4",
    name: "Bhai Bhai",
    category: "Hindi",
    bg: { type: "gradient", gradient: ["#0B0B12", "#FF6B00"] },
    layers: [
      { text: "भाई-भाई", color: "#FFD700", fontFamily: POPPINS, fontSize: 64, x: 40, y: 80, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
      { text: "VLOG", color: "#FFFFFF", fontFamily: ANTON, fontSize: 80, x: 40, y: 150, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
    ],
  },

  // ===== REACTION =====
  {
    id: "r1",
    name: "REACTION",
    category: "Reaction",
    bg: { type: "color", color: "#FF3366" },
    layers: [
      { text: "MY", color: "#FFFFFF", fontFamily: ANTON, fontSize: 56, x: 50, y: 40, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
      { text: "REACTION", color: "#FFD700", fontFamily: ANTON, fontSize: 76, x: 50, y: 110, rotation: -3, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
  {
    id: "r2",
    name: "I CAN'T",
    category: "Reaction",
    bg: { type: "gradient", gradient: ["#FF6B00", "#FF3366"] },
    layers: [
      { text: "I CAN'T", color: "#FFFFFF", fontFamily: ANTON, fontSize: 84, x: 50, y: 60, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 4 },
      { text: "EVEN... 💀", color: "#FFD700", fontFamily: ANTON, fontSize: 56, x: 50, y: 150, rotation: -3, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 2 },
    ],
  },
  {
    id: "r3",
    name: "HONEST",
    category: "Reaction",
    bg: { type: "gradient", gradient: ["#1F8FFF", "#8A2BE2"] },
    layers: [
      { text: "MY HONEST", color: "#FFFFFF", fontFamily: BEBAS, fontSize: 42, x: 50, y: 50, rotation: 0, scale: 1, align: "left", outlineColor: "transparent", outlineWidth: 0 },
      { text: "REACTION", color: "#FFD700", fontFamily: ANTON, fontSize: 80, x: 50, y: 110, rotation: 0, scale: 1, align: "left", outlineColor: "#000000", outlineWidth: 3 },
    ],
  },
];

export function getTemplatesByCategory(cat: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === cat);
}
