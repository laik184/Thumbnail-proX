export interface YouTubeOembed {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  provider_name: string;
}

const oembedCache = new Map<string, YouTubeOembed>();

/**
 * Fetch public video info (title + channel) using YouTube's free oEmbed
 * endpoint. No API key required. Returns null on failure.
 */
export async function fetchVideoInfo(videoId: string): Promise<YouTubeOembed | null> {
  if (!videoId) return null;
  const cached = oembedCache.get(videoId);
  if (cached) return cached;
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as YouTubeOembed;
    oembedCache.set(videoId, data);
    return data;
  } catch {
    return null;
  }
}

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}
