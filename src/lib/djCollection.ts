/**
 * DJ Collection (consignment) products are tagged by the kolektt hub sync:
 *   - "DJ Collection"  → umbrella tag on every consigned record
 *   - "DJ: <name>"     → which DJ it belongs to
 * The product vendor carries the DJ's name as well.
 */
import type { VinylRecord } from '../types/shopify';

export const DJ_COLLECTION_TAG = 'DJ Collection';

export const isDjCollection = (p: Pick<VinylRecord, 'tags'>): boolean =>
  (p.tags ?? []).some((t) => t.trim().toLowerCase() === DJ_COLLECTION_TAG.toLowerCase());

/** DJ name from the "DJ: <name>" tag, or null when absent. */
export const djNameOf = (p: Pick<VinylRecord, 'tags'>): string | null => {
  const tag = (p.tags ?? []).find((t) => /^dj:\s*\S/i.test(t.trim()));
  return tag ? tag.trim().replace(/^dj:\s*/i, '') : null;
};
