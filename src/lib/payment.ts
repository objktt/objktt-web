/**
 * PortOne (포트원) V2 public client config. storeId + channelKey are public
 * values (safe to ship). The PG channel is KG이니시스(inicis_v2), 결제창 일반결제,
 * live MID MOIobjkt69. Server-only secrets (V2_API_SECRET, V2_WEBHOOK_SECRET)
 * live in Vercel env and are never imported here.
 *
 * LIVE — real charges. KG이니시스 PC payments require buyer name/phone/email,
 * which Checkout already sends. To go fully live, ALLOW_TEST_PAYMENTS must be
 * removed from Vercel env so test-mode payments are rejected.
 */
export const PORTONE_STORE_ID = 'store-9bbba9c4-9a51-42bc-8269-a32893e4c4f9';
export const PORTONE_CHANNEL_KEY = 'channel-key-e014150f-ec4b-4b79-ae02-0dd1ad495df3';
