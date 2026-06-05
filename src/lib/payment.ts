/**
 * PortOne (포트원) V2 public client config. storeId + channelKey are public
 * values (safe to ship). The PG channel is KG이니시스(inicis_v2), channel name
 * "오브젝트앤드타임웹_01". Server-only secrets (V2_API_SECRET, V2_WEBHOOK_SECRET)
 * live in Vercel env and are never imported here.
 *
 * Currently the channel uses INIpayTest credentials → test mode (no real
 * charges) until the live KG이니시스 contract is activated in the PortOne console.
 */
export const PORTONE_STORE_ID = 'store-9bbba9c4-9a51-42bc-8269-a32893e4c4f9';
export const PORTONE_CHANNEL_KEY = 'channel-key-92ac283a-1777-4345-9259-3cce586df4c0';
