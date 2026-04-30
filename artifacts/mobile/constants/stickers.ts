/**
 * Sticker library — emoji-based for zero-asset cost.
 * Categories: faces, arrows, badges, hindi/hype text decorators.
 */

export interface StickerCategory {
  id: string;
  label: string;
  items: string[];
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: "reactions",
    label: "Faces",
    items: [
      "😱", "🤯", "😂", "🥹", "😍", "🔥", "👀", "💀",
      "🤔", "😎", "🤩", "😡", "🥺", "😏", "🙃", "😈",
    ],
  },
  {
    id: "arrows",
    label: "Arrows",
    items: ["⬅️", "➡️", "⬆️", "⬇️", "↗️", "↖️", "↘️", "↙️", "👉", "👈", "👆", "👇"],
  },
  {
    id: "badges",
    label: "Badges",
    items: ["✅", "❌", "⭐", "💯", "🆕", "🔴", "🟢", "🏆", "🎯", "💎", "👑", "⚡"],
  },
  {
    id: "hype",
    label: "Hype",
    items: ["🚀", "💥", "🎉", "🤑", "💸", "💰", "🎊", "🎁", "🎬", "🎥", "📈", "📊"],
  },
  {
    id: "tech",
    label: "Tech",
    items: ["📱", "💻", "🎮", "🕹️", "📷", "🎙️", "🎧", "⌨️", "🖥️", "💡", "⚙️", "🔧"],
  },
];

export const ALL_STICKERS = STICKER_CATEGORIES.flatMap((c) => c.items);
