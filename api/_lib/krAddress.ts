/**
 * 한국 주소를 Shopify가 받아들이는 형태로 바꾸는 helper들.
 *
 * Shopify는 배송지에서 **lastName과 province를 필수로 검증**하고, 우편번호가
 * 그 시·도와 맞는지까지 확인한다. 둘 중 하나라도 빠지면 `orderCreate`는
 * userErrors 없이 **배송지 전체를 조용히 버린다** — 2026-09-02까지 만들어진
 * 웹 주문(#1006~#1011)의 배송지가 전부 사라진 원인이다. (`orderUpdate`는 같은
 * 입력에 "Enter a last name" / "Select a province" userErrors를 돌려준다.)
 */

/** 시·도 → Shopify province code (ISO 3166-2:KR).
 *  강원·전북 특별자치도는 아직 KR-42/KR-45만 유효하다 (KR-51/KR-52는 거부). */
const KR_PROVINCES: [RegExp, string][] = [
  [/^서울/, 'KR-11'],
  [/^부산/, 'KR-26'],
  [/^대구/, 'KR-27'],
  [/^인천/, 'KR-28'],
  [/^광주/, 'KR-29'],
  [/^대전/, 'KR-30'],
  [/^울산/, 'KR-31'],
  [/^세종/, 'KR-50'],
  [/^경기/, 'KR-41'],
  [/^강원/, 'KR-42'],
  [/^(충북|충청북도)/, 'KR-43'],
  [/^(충남|충청남도)/, 'KR-44'],
  [/^(전북|전라북도)/, 'KR-45'],
  [/^(전남|전라남도)/, 'KR-46'],
  [/^(경북|경상북도)/, 'KR-47'],
  [/^(경남|경상남도)/, 'KR-48'],
  [/^제주/, 'KR-49'],
];

export function krProvinceCode(address1?: string): string | undefined {
  const s = (address1 || '').trim();
  for (const [re, code] of KR_PROVINCES) if (re.test(s)) return code;
  return undefined;
}

/** 도로명 주소의 시·군·구: "서울 서대문구 수색로8길 8" → "서대문구". */
export function krCity(address1?: string): string | undefined {
  const t = (address1 || '').trim().split(/\s+/).filter(Boolean);
  return t.find((w, i) => i > 0 && /(시|군|구)$/.test(w)) || t[0] || undefined;
}

/** Shopify는 성·이름을 따로 요구한다. "황효상" → { lastName: '황', firstName: '효상' }. */
const KR_COMPOUND_SURNAMES = ['남궁', '황보', '제갈', '사공', '선우', '서문', '독고', '동방'];
export function splitName(full?: string): { firstName: string; lastName: string } {
  const n = (full || '').trim().replace(/\s+/g, ' ');
  if (!n) return { firstName: '고객', lastName: '-' };
  if (/^[가-힣]{2,6}$/.test(n)) {
    const compound = n.length > 2 ? KR_COMPOUND_SURNAMES.find((s) => n.startsWith(s)) : undefined;
    const lastName = compound || n[0];
    return { lastName, firstName: n.slice(lastName.length) };
  }
  const parts = n.split(' ');
  if (parts.length > 1) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  return { firstName: n, lastName: '-' };
}
