/**
 * 사업자 정보 (전자상거래법 표시 의무 + PG 심사 필수).
 * ⚠️ [ ] 로 표시된 값은 실제 등록 정보로 교체해야 합니다.
 * 한 곳에서 관리 — 푸터·이용약관·환불정책 페이지가 모두 여기를 참조합니다.
 */
export const BUSINESS = {
  companyName: '주식회사 오브젝트앤드타임', // 상호 (법인명)
  companyNameEn: 'Objktt&Time Co., Ltd.', // 상호 (영문)
  brandName: 'OBJKTT (오브옉트)',
  brandNameEn: 'Objktt Record Coffee & Bar',
  representative: '황효상', // 대표자 성명 (국문)
  representativeEn: 'Hwang Hyosang', // 대표자 성명 (영문)
  registrationNumber: '555-87-04282', // 사업자등록번호
  mailOrderNumber: '제2026-서울중구-911호', // 통신판매업 신고번호
  address: '서울특별시 중구 명동8가길 58, 4층', // 사업장 소재지 (국문)
  addressEn: 'Myeongdong 8ga-gil 58, 4F, Jung-gu, Seoul', // 영문 주소
  email: 'hello@objktt.kr',
  phone: '0507-1410-7913', // 고객센터 전화번호
  kakaoChannelUrl: 'https://pf.kakao.com/_xcpxdqn', // 카카오톡 채널 홈
  kakaoChatUrl: 'https://pf.kakao.com/_xcpxdqn/chat', // 카카오톡 채널 1:1 채팅 (문의)
  privacyOfficer: '[개인정보 보호책임자]', // 개인정보 보호책임자
} as const;

/** 채워지지 않은 플레이스홀더 값인지 판별 (UI에서 흐리게 처리용). */
export const isPlaceholder = (v: string) => v.startsWith('[');
