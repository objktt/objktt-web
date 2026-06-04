import { useEffect } from 'react';

/**
 * Dependency-free per-page SEO. Overrides document head (title, description,
 * Open Graph, Twitter, canonical) and injects a JSON-LD block, restoring the
 * previous values on unmount so SPA navigation stays clean.
 *
 * Note: this is client-side. Google renders JS and indexes these, but
 * non-JS scrapers (Naver, social OG previews) need prerendering/SSR to see
 * them — a separate follow-up. The tags here are reused as-is once prerendered.
 */
export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: string; // og:type — 'website' | 'product' | ...
  jsonLd?: object | null;
}

export function useSeo(opts: SeoOptions): void {
  const { title, description, image, url, type, jsonLd } = opts;

  useEffect(() => {
    const restores: Array<() => void> = [];

    if (title) {
      const prev = document.title;
      document.title = title;
      restores.push(() => {
        document.title = prev;
      });
    }

    const setTag = (selector: string, make: () => HTMLElement, value?: string | null) => {
      if (value == null || value === '') return;
      let el = document.head.querySelector(selector) as HTMLElement | null;
      let created = false;
      if (!el) {
        el = make();
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', value);
      restores.push(() => {
        if (created) el!.remove();
        else if (prev != null) el!.setAttribute('content', prev);
      });
    };

    const named = (name: string, value?: string | null) =>
      setTag(`meta[name="${name}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('name', name);
        return m;
      }, value);

    const prop = (property: string, value?: string | null) =>
      setTag(`meta[property="${property}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('property', property);
        return m;
      }, value);

    named('description', description);
    prop('og:title', title);
    prop('og:description', description);
    prop('og:type', type ?? 'website');
    prop('og:url', url);
    prop('og:image', image);
    prop('twitter:title', title);
    prop('twitter:description', description);
    prop('twitter:image', image);

    if (url) {
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      let created = false;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
        created = true;
      }
      const prev = link.getAttribute('href');
      link.setAttribute('href', url);
      restores.push(() => {
        if (created) link!.remove();
        else if (prev != null) link!.setAttribute('href', prev);
      });
    }

    let ld: HTMLScriptElement | null = null;
    if (jsonLd) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.setAttribute('data-seo', 'page');
      ld.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(ld);
    }

    return () => {
      restores.reverse().forEach((fn) => fn());
      if (ld) ld.remove();
    };
  }, [title, description, image, url, type, JSON.stringify(jsonLd ?? null)]);
}
