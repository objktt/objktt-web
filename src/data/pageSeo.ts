import { useLanguage } from '../contexts/LanguageContext';
import { useSeo } from '../lib/seo';

/**
 * Per-route SEO copy (en/ko). Gives each static page a unique title,
 * description and canonical so they aren't all duplicates of the homepage.
 * Client-side (Google renders JS); product pages are additionally server
 * prerendered in api/og. og:image falls back to the default in index.html.
 */
type Loc = { en: string; ko: string };
interface PageSeoEntry {
  path: string;
  title: Loc;
  description: Loc;
}

export const PAGE_SEO = {
  home: {
    path: '/',
    title: {
      en: 'Objktt Record Coffee & Bar - Myeongdong, Seoul',
      ko: '오브옉트 레코드 커피 & 바 - 명동',
    },
    description: {
      en: 'Objktt Record Coffee & Bar in Myeongdong, Seoul. Hand-picked new & used vinyl, shop online with nationwide shipping or in store, over coffee, cocktails, and listening sessions.',
      ko: '명동 4층, 오브옉트 레코드 커피 & 바입니다. 직접 선별한 신보·중고 바이닐을 온라인(전국 배송)과 매장에서 모두 구입할 수 있습니다. 커피와 칵테일, 리스닝 세션이 함께합니다.',
    },
  },
  about: {
    path: '/about',
    title: { en: 'About | Objktt', ko: '소개 | 오브옉트' },
    description: {
      en: 'We have time, air, and objects. Objktt Record Coffee & Bar in Myeongdong, Seoul, built around vinyl and human connection, curated vinyl available both online (nationwide shipping) and in store.',
      ko: '오브옉트는 명동에 자리한 레코드 커피 & 바입니다. 바이닐과 소리, 그리고 사람 사이의 연결에 집중하며, 큐레이션한 바이닐을 온라인(전국 배송)과 매장에서 모두 구입할 수 있습니다.',
    },
  },
  menu: {
    path: '/menu',
    title: { en: 'Menu | Objktt', ko: '메뉴 | 오브옉트' },
    description: {
      en: 'Signature cocktails, single-origin coffee, natural wine, whiskey, and small plates at Objktt, Myeongdong.',
      ko: '오브옉트의 시그니처 칵테일, 싱글 오리진 커피, 와인, 위스키와 안주 메뉴를 소개합니다.',
    },
  },
  music: {
    path: '/music',
    title: { en: 'Music | Objktt', ko: '뮤직 | 오브옉트' },
    description: {
      en: 'The sound of Objktt, curated vinyl, genres, and listening sessions that shape the space.',
      ko: '오브옉트의 사운드, 큐레이션된 바이닐과 장르, 그리고 공간을 채우는 리스닝 세션.',
    },
  },
  shop: {
    path: '/shop',
    title: { en: 'Shop - Vinyl Records | Objktt', ko: '샵 - 바이닐 레코드 | 오브옉트' },
    description: {
      en: 'Hand-picked new and used vinyl records, jazz, soul, ambient, and more. Curated and shipped from Objktt, Seoul.',
      ko: '직접 선별한 신보·중고 바이닐 레코드. 재즈, 소울, 앰비언트 등 오브옉트가 큐레이션해 배송합니다.',
    },
  },
  events: {
    path: '/events',
    title: { en: 'Events | Objktt', ko: '이벤트 | 오브옉트' },
    description: {
      en: 'DJ nights, listening sessions, and gatherings at Objktt, Myeongdong, Seoul.',
      ko: '오브옉트의 DJ 나이트, 리스닝 세션 그리고 모임 일정을 확인하세요.',
    },
  },
  faq: {
    path: '/faq',
    title: { en: 'FAQ | Objktt', ko: '자주 묻는 질문 | 오브옉트' },
    description: {
      en: 'Frequently asked questions about orders, shipping, returns, record condition, and visiting Objktt.',
      ko: '주문·결제, 배송, 교환·환불, 음반 컨디션, 매장 방문에 대한 자주 묻는 질문을 모았습니다.',
    },
  },
  contact: {
    path: '/contact',
    title: { en: 'Contact | Objktt', ko: '문의 | 오브옉트' },
    description: {
      en: 'Get in touch with Objktt, email or KakaoTalk. Myeongdong, Seoul.',
      ko: '오브옉트에 문의하기, 이메일 또는 카카오톡. 서울 명동.',
    },
  },
  notices: {
    path: '/notices',
    title: { en: 'Notices | Objktt', ko: '공지사항 | 오브옉트' },
    description: {
      en: 'News and announcements from Objktt, new arrivals, store hours, and shipping notices.',
      ko: '오브옉트의 소식과 공지, 신보 입고, 영업시간, 배송 안내.',
    },
  },
} satisfies Record<string, PageSeoEntry>;

export type PageKey = keyof typeof PAGE_SEO;

/** Apply per-page SEO for a known route. Pass jsonLd to add structured data. */
export function usePageSeo(key: PageKey, jsonLd?: object | null): void {
  const { language } = useLanguage();
  const e = PAGE_SEO[key];
  useSeo({
    title: e.title[language],
    description: e.description[language],
    url: `https://objktt.kr${e.path}`,
    jsonLd: jsonLd ?? null,
  });
}
