import { getGoodsEditorial } from '../data/goodsEditorial';
import type { VinylRecord } from '../types/shopify';

// Goods = tagged "goods" or typed "Goods" in Shopify, or has an editorial entry.
export const isGoodsProduct = (r: VinylRecord): boolean =>
  r.productType?.trim().toLowerCase() === 'goods' ||
  r.tags.some((t) => t.trim().toLowerCase() === 'goods') ||
  getGoodsEditorial(r.handle) !== null;
