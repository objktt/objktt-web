/**
 * PortOne (포트원) V2 public client config. storeId + channelKey are public
 * values (safe to ship). Server-only secrets (V2_API_SECRET, V2_WEBHOOK_SECRET)
 * live in Vercel env and are never imported here.
 *
 * PG channel selection: VITE_PORTONE_CHANNEL_KEY (build-time, set in Vercel +
 * redeploy) overrides the fallback below. Fallback = KG이니시스(inicis_v2)
 * 결제창 일반결제, live MID MOIobjkt69. 토스페이먼츠 전환 시 PortOne 콘솔에서
 * 발급받은 토스 채널 키를 VITE_PORTONE_CHANNEL_KEY로 넣으면 코드 변경 없이
 * 채널이 바뀐다 (requestPayment 파라미터는 PG 공통).
 *
 * To go fully live, ALLOW_TEST_PAYMENTS must also be removed from Vercel env
 * so test-mode payments are rejected.
 */
export const PORTONE_STORE_ID = 'store-9bbba9c4-9a51-42bc-8269-a32893e4c4f9';
export const PORTONE_CHANNEL_KEY =
  (import.meta.env.VITE_PORTONE_CHANNEL_KEY as string | undefined) ||
  'channel-key-e014150f-ec4b-4b79-ae02-0dd1ad495df3';

/**
 * 토스페이먼츠 직연동 (PG 전환 진행중, 2026-07). VITE_PAYMENT_PROVIDER=toss 로
 * 켜면 Checkout이 토스 결제창(API 개별 연동, MID objktti75v)을 사용한다.
 * 기본값은 portone — 프로드는 env를 바꾸기 전까지 기존 경로 그대로.
 * 서버 짝: TOSS_SECRET_KEY (Vercel env, server-only) + /api/checkout/toss-confirm.
 */
export const PAYMENT_PROVIDER: 'portone' | 'toss' =
  (import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined) === 'toss' ? 'toss' : 'portone';
export const TOSS_CLIENT_KEY = (import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined) || '';
