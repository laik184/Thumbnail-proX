/**
 * Curated trending YouTube video IDs across categories.
 * Used as quick-grab options on the Download / Explore screen.
 * Update periodically. No external API call needed.
 */
export interface TrendingVideo {
  id: string;
  category: string;
}

export const TRENDING_VIDEOS: TrendingVideo[] = [
  // Music / Global hits
  { id: "kJQP7kiw5Fk", category: "Music" },
  { id: "9bZkp7q19f0", category: "Music" },
  { id: "JGwWNGJdvx8", category: "Music" },
  { id: "RgKAFK5djSk", category: "Music" },
  // Tech
  { id: "rokGy0huYEA", category: "Tech" },
  { id: "8s9Bv4WSeBk", category: "Tech" },
  // Gaming
  { id: "8X2kIfS6fb8", category: "Gaming" },
  { id: "8pT_0FZmRTo", category: "Gaming" },
  // Education / TED
  { id: "ZSt9tm3RoUU", category: "Education" },
  { id: "iG9CE55wbtY", category: "Education" },
  // Vlog / Lifestyle
  { id: "fLexgOxsZu0", category: "Vlog" },
  { id: "CevxZvSJLk8", category: "Vlog" },
];

export const TRENDING_CATEGORIES = ["All", "Music", "Tech", "Gaming", "Education", "Vlog"] as const;
