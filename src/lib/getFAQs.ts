import { shopifyFetch, isShopifyConfigured } from './shopify';
import { FAQS_QUERY } from './queries';
import type { FAQ } from '../types/shopify';

const METAOBJECT_TYPE =
  import.meta.env.VITE_SHOPIFY_FAQ_METAOBJECT_TYPE || 'faq';

interface RawMetaobjectNode {
  id: string;
  handle: string;
  fields: { key: string; value: string }[];
}

function fieldValue(node: RawMetaobjectNode, key: string): string {
  return node.fields.find((f) => f.key === key)?.value ?? '';
}

function toFAQ(node: RawMetaobjectNode): FAQ {
  const sortRaw = fieldValue(node, 'sort_order');
  const sortOrder = Number.parseInt(sortRaw, 10);
  return {
    id: node.id,
    question: fieldValue(node, 'question'),
    answer: fieldValue(node, 'answer'),
    category: fieldValue(node, 'category') || 'General',
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function getFAQs(): Promise<FAQ[]> {
  if (!isShopifyConfigured) return [];

  const data = await shopifyFetch<{
    metaobjects: { edges: { node: RawMetaobjectNode }[] };
  }>(FAQS_QUERY, { type: METAOBJECT_TYPE, first: 100 });

  return data.metaobjects.edges
    .map((e) => toFAQ(e.node))
    .filter((f) => f.question && f.answer)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
