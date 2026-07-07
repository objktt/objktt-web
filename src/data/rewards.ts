/**
 * 적립금(포인트) 정책 — 한 곳에서 관리. 정책 안내 페이지(/points)와
 * 향후 적립/사용 로직이 모두 이 값을 참조합니다.
 */
export const REWARDS = {
  earnRate: 0.03, // 구매 금액의 3% 적립 (배송 완료 시점)
  pointValueKrw: 1, // 1 포인트 = 1원
  minUseKrw: 1000, // 1,000원 이상부터 사용 가능 (1회 한도 없음)
  expiryMonths: 12, // 적립일로부터 1년 후 소멸
  signupBonus: 3000, // 회원가입 적립 포인트
  reviewBonus: 300, // 리뷰 작성 적립 포인트
} as const;
