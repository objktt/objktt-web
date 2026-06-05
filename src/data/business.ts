/**
 * 사업자 정보 (전자상거래법 표시 의무 + PG 심사 필수).
 * ⚠️ [ ] 로 표시된 값은 실제 등록 정보로 교체해야 합니다.
 * 한 곳에서 관리 — 푸터·이용약관·환불정책 페이지가 모두 여기를 참조합니다.
 */
export const BUSINESS = {
  companyName: '주식회사 오브젝트앤드타임', // 상호 (법인명)
  brandName: 'OBJKTT (오브옉트)',
  representative: '[대표자명]', // 대표자 성명
  registrationNumber: '555-87-04282', // 사업자등록번호
  mailOrderNumber: '[통신판매업 신고번호]', // 통신판매업 신고번호
  address: '서울특별시 중구 명동8가길 58, 4층', // 사업장 소재지
  email: 'hello@objktt.kr',
  phone: '010-6575-7892', // 고객센터 전화
  privacyOfficer: '[개인정보 보호책임자]', // 개인정보 보호책임자
} as const;

/** 채워지지 않은 플레이스홀더 값인지 판별 (UI에서 흐리게 처리용). */
export const isPlaceholder = (v: string) => v.startsWith('[');
