/** Free shipping threshold in KRW (store currency). */
export const FREE_SHIPPING_THRESHOLD = 50000;

/** Format a KRW amount, e.g. 50000 → "₩50,000". */
export const won = (n: number) => `₩${Math.max(0, Math.round(n)).toLocaleString('ko-KR')}`;
