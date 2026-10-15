/**
 * Product-page copy for Goods, keyed by Shopify product handle.
 * Price / options / stock / photos come from Shopify; this file holds the
 * words around them. A goods product with no entry here falls back to its
 * Shopify title + description, so a page is never blank.
 */

export interface L10n {
  en: string;
  ko: string;
}

export interface SizeChart {
  cols: string[]; // e.g. ['M', 'L']
  rows: { label: L10n; values: string[] }[];
  note?: L10n;
}

export interface GoodsEditorial {
  /** "01" — position within the campaign, shown as "Goods 01 / 03". */
  no: string;
  campaign: string; // "Objktt Grown — October with Basil"
  nameEn?: string;
  /** Label for the variant picker. */
  optionLabel?: string;
  /** One line under the title, in the buy panel. */
  deck: L10n;
  /** Longer description, paragraphs separated by a blank line. */
  about?: L10n;
  details?: { label: string; value: L10n }[];
  sizeChart?: SizeChart;
  care?: L10n;
}

const CAMPAIGN = 'Objktt Grown — October with Basil';

export const goodsEditorial: Record<string, GoodsEditorial> = {
  'basil-long-sleeve': {
    no: '01',
    campaign: CAMPAIGN,
    nameEn: 'Objktt Basil Long Sleeve',
    optionLabel: 'Size',
    deck: {
      en: 'A white long sleeve with basil growing down the back.',
      ko: '등 뒤로 바질이 자라는 화이트 롱슬리브.',
    },
    about: {
      en: 'The October campaign, basil. A green “Basil” lettering and a hand-and-sprout illustration run down the back; the front carries a small “Objktt with Basil” mark on the chest.\n\nA true-to-size long sleeve in a soft, thick cotton blend. One colour, white, in M and L.',
      ko: 'Objktt Grown 10월 캠페인, 바질. 등에는 초록색 “Basil” 레터링과 손에서 새싹이 자라는 일러스트를, 앞면 가슴에는 “Objktt with Basil” 로고를 작게 넣었습니다.\n\n부드럽고 도톰한 면 혼방 원단의 정사이즈 롱슬리브입니다. 화이트 단일 컬러, M·L 두 가지 사이즈.',
    },
    details: [
      { label: 'Material', value: { en: 'Cotton 80% · Polyester 20%', ko: '코튼 80% · 폴리에스터 20%' } },
      { label: 'Color', value: { en: 'White', ko: '화이트' } },
      { label: 'Fit', value: { en: 'True to size · thick, soft hand', ko: '정사이즈 · 도톰하고 부드러운 촉감' } },
      { label: 'Made in', value: { en: 'China', ko: '중국' } },
    ],
    sizeChart: {
      cols: ['M', 'L'],
      rows: [
        { label: { en: 'Length', ko: '총기장' }, values: ['69', '73'] },
        { label: { en: 'Shoulder', ko: '어깨너비' }, values: ['47', '49'] },
        { label: { en: 'Chest', ko: '가슴너비' }, values: ['51', '54'] },
        { label: { en: 'Sleeve', ko: '소매길이' }, values: ['56', '58'] },
      ],
      note: {
        en: 'Flat measurements in cm. May vary by 1–3 cm.',
        ko: '단위 cm. 측정 방법에 따라 1~3cm 오차가 있을 수 있습니다.',
      },
    },
    care: {
      en: 'Hand wash alone in cold water, inside out. No bleach, no soaking over 30 minutes, no dryer. Dry in the shade.',
      ko: '찬물에 뒤집어서 단독 손세탁. 표백제 사용 및 30분 이상 담가두기 금지, 건조기 사용 불가. 그늘에서 건조해 주세요.',
    },
  },

  'basil-tote-bag': {
    no: '02',
    campaign: CAMPAIGN,
    nameEn: 'Basil Tote Bag',
    deck: {
      en: 'A canvas tote with a single basil leaf.',
      ko: '바질 잎 하나를 얹은 캔버스 토트백.',
    },
    about: {
      en: 'The October campaign, basil. A large basil-leaf print and the campaign line on the front; the back is left blank.\n\nThick, sturdy 100% canvas with a gusseted base, roomy enough for records and everything else you carry.',
      ko: 'Objktt Grown 10월 캠페인, 바질. 큼직한 바질 잎 프린트와 캠페인 문구를 앞면에 넣고 뒷면은 비워 두었습니다.\n\n두껍고 튼튼한 캔버스 100% 소재에 바닥 마치가 있어 음반과 소지품을 넉넉하게 담을 수 있습니다.',
    },
    details: [
      { label: 'Material', value: { en: 'Canvas 100%', ko: '캔버스 100%' } },
      { label: 'Color', value: { en: 'Ivory', ko: '아이보리' } },
      { label: 'Size', value: { en: '35.5 W × 37 H cm', ko: '가로 35.5 × 세로 37cm' } },
      { label: 'Base', value: { en: '24.5 × 11.5 cm', ko: '24.5 × 11.5cm' } },
      { label: 'Strap', value: { en: '18 cm long · 2.5 cm wide', ko: '길이 18cm · 너비 2.5cm' } },
      { label: 'Made in', value: { en: 'Cambodia', ko: '캄보디아' } },
    ],
    care: {
      en: 'Wash alone in cold water, inside out. Iron with a cloth over the print.',
      ko: '찬물에 뒤집어서 단독 물세탁. 다림질은 천을 올린 상태에서 해 주세요.',
    },
  },

  'basil-sticker-seed-set': {
    no: '03',
    campaign: CAMPAIGN,
    nameEn: 'Basil Sticker & Seed Set',
    deck: {
      en: 'A sticker sheet, a basil postcard, and the seeds.',
      ko: '스티커 시트, 바질 엽서, 그리고 씨앗.',
    },
    about: {
      en: 'The October campaign, basil. A sheet of basil-character stickers, a basil postcard, and basil seeds in a small clear pouch.',
      ko: 'Objktt Grown 10월 캠페인, 바질. 바질 캐릭터 스티커 시트와 바질 엽서, 바질 씨앗이 들어 있습니다. 씨앗은 엽서와 함께 투명 봉투에 담겨 있습니다.',
    },
    details: [
      { label: 'Contents', value: { en: 'Sticker sheet · Basil postcard · Basil seeds', ko: '스티커 시트 · 바질 엽서 · 바질 씨앗' } },
    ],
  },
};

export const getGoodsEditorial = (handle: string): GoodsEditorial | null =>
  goodsEditorial[handle] ?? null;
