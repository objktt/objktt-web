const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;

export interface UnsplashPhoto {
  id: string;
  url: string;
  alt: string;
  user: string;
  link: string;
}

interface RawPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { regular: string; small: string };
  links: { html: string };
  user: { name: string };
}

/**
 * Fetch N random photos for the BlueDot slideshow.
 * Cached in sessionStorage so repeat visits in the same tab skip the API call.
 */
export async function fetchRandomPhotos(count = 30, query = 'music,vinyl,record,abstract'): Promise<UnsplashPhoto[]> {
  if (!ACCESS_KEY) return [];

  const cacheKey = `unsplash:${query}:${count}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as UnsplashPhoto[]; } catch { /* ignore */ }
  }

  const url = `https://api.unsplash.com/photos/random?count=${count}&query=${encodeURIComponent(query)}&orientation=squarish`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
  if (!res.ok) return [];
  const raw = (await res.json()) as RawPhoto[];
  const photos: UnsplashPhoto[] = raw.map((p) => ({
    id: p.id,
    url: `${p.urls.small}&w=512&q=80`,
    alt: p.alt_description ?? p.description ?? 'Unsplash',
    user: p.user.name,
    link: p.links.html,
  }));
  try { sessionStorage.setItem(cacheKey, JSON.stringify(photos)); } catch { /* quota */ }
  return photos;
}
