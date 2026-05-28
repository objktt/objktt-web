import { shopifyFetch, isShopifyConfigured } from './shopify';
import { NOTICES_QUERY, NOTICE_BY_HANDLE_QUERY } from './queries';
import type { Notice, ShopifyImage } from '../types/shopify';

const BLOG_HANDLE =
  import.meta.env.VITE_SHOPIFY_NOTICES_BLOG_HANDLE || 'notices';

interface RawArticleNode {
  id: string;
  handle: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  publishedAt: string;
  image: ShopifyImage | null;
}

function toNotice(node: RawArticleNode): Notice {
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    excerpt: node.excerpt,
    contentHtml: node.contentHtml,
    publishedAt: node.publishedAt,
    image: node.image,
  };
}

export async function getNotices(): Promise<Notice[]> {
  if (!isShopifyConfigured) return [];

  const data = await shopifyFetch<{
    blog: { articles: { edges: { node: RawArticleNode }[] } } | null;
  }>(NOTICES_QUERY, { blogHandle: BLOG_HANDLE, first: 30 });

  if (!data.blog) return [];
  return data.blog.articles.edges.map((e) => toNotice(e.node));
}

export async function getNoticeByHandle(handle: string): Promise<Notice | null> {
  if (!isShopifyConfigured) return null;

  const data = await shopifyFetch<{
    blog: { articleByHandle: RawArticleNode | null } | null;
  }>(NOTICE_BY_HANDLE_QUERY, { blogHandle: BLOG_HANDLE, articleHandle: handle });

  if (!data.blog?.articleByHandle) return null;
  return toNotice(data.blog.articleByHandle);
}
