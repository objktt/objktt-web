/**
 * 적립금(포인트) 원장 — 고객 메타필드 기반.
 *
 * 왜 Shopify 스토어 크레딧이 아니라 메타필드인가:
 *  - 스토어 크레딧 쓰기는 새 스코프 + 체크아웃 앱 재인증이 필요하고, 그 과정에서
 *    운영 중인 결제 토큰(SHOPIFY_ADMIN_TOKEN)이 회전될 위험이 있다.
 *  - 우리는 PortOne 커스텀 체크아웃이라 스토어 크레딧의 "체크아웃 자동 사용"
 *    이점도 못 쓴다. 적립금은 잔액 원장으로만 쓰고 차감은 우리가 직접 계산한다.
 *  - 메타필드는 이미 가진 write_customers 권한으로 충분하다.
 *
 * 저장 위치 (고객 메타필드, namespace = "kolektt"):
 *  - points_ledger (json)         : 거래 내역 배열 (source of truth)
 *  - points_balance (number_integer): 가용 잔액 (표시용 비정규화 값, 변경 시 재계산)
 *
 * 만료는 적립 엔트리의 expiresAt로 기록하고, 잔액 계산 시 FIFO + 만료를 함께
 * 적용한다(lazy expiry — 별도 cron 불필요). 정책값은 src/data/rewards.ts와 동기화.
 */

import crypto from 'node:crypto';

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const ADMIN_DOMAIN =
  process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

// Keep in sync with src/data/rewards.ts
export const EARN_RATE = 0.03; // 결제(상품) 금액의 3%
export const EXPIRY_MONTHS = 12; // 적립일로부터 1년
export const SIGNUP_BONUS = 3000; // 회원가입 보너스
export const REVIEW_BONUS = 300; // 리뷰 작성 보너스
export const MIN_USE_KRW = 1000; // 사용 최소 금액

const NS = 'kolektt';
const LEDGER_KEY = 'points_ledger';
const BALANCE_KEY = 'points_balance';

export type LedgerType = 'earn' | 'signup' | 'review' | 'spend' | 'clawback' | 'restore' | 'adjust';

export interface LedgerEntry {
  id: string;
  ts: string; // ISO
  type: LedgerType;
  amount: number; // +적립 / -사용·회수
  expiresAt?: string; // 적립 엔트리만 (ISO)
  reason?: string;
  orderId?: string; // gid 또는 숫자 id
}

async function adminGraphql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${ADMIN_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Shopify Admin API error: ${JSON.stringify(j.errors || j)}`);
  return j.data as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Cheap unique id without crypto/random deps. */
let _seq = 0;
function genId(): string {
  _seq = (_seq + 1) % 100000;
  return `${Date.now().toString(36)}-${_seq.toString(36)}`;
}

/**
 * 가용 잔액 = FIFO 소비 + 만료를 반영해 살아있는 적립 lot의 잔량 합.
 *  - 적립(양수)은 만료일을 가진 lot이 된다.
 *  - 사용·회수(음수)는 오래된(만료 임박) lot부터 차감한다. clawback에 orderId가
 *    있으면 해당 주문의 lot을 우선 차감한다.
 *  - now 시점에 만료된 lot의 잔량은 잔액에서 제외된다.
 */
export function computeBalance(ledger: LedgerEntry[], now: string = nowIso()): number {
  const sorted = [...ledger].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  interface Lot {
    expiresAt: string | null;
    remaining: number;
    orderId?: string;
  }
  const lots: Lot[] = [];

  const consume = (entry: LedgerEntry, atTs: string) => {
    let need = -entry.amount; // positive
    // 만료되지 않은 lot만, 만료 임박 순으로.
    const order = (a: Lot, b: Lot) => {
      const ax = a.expiresAt ?? '9999';
      const bx = b.expiresAt ?? '9999';
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    };
    const live = lots.filter((l) => l.remaining > 0 && (!l.expiresAt || l.expiresAt > atTs));
    // clawback: 같은 주문 lot 우선.
    if (entry.type === 'clawback' && entry.orderId) {
      const same = live.filter((l) => l.orderId === entry.orderId).sort(order);
      for (const l of same) {
        if (need <= 0) break;
        const take = Math.min(l.remaining, need);
        l.remaining -= take;
        need -= take;
      }
    }
    const rest = live.filter((l) => l.remaining > 0).sort(order);
    for (const l of rest) {
      if (need <= 0) break;
      const take = Math.min(l.remaining, need);
      l.remaining -= take;
      need -= take;
    }
  };

  for (const e of sorted) {
    if (e.amount > 0) {
      lots.push({ expiresAt: e.expiresAt ?? null, remaining: e.amount, orderId: e.orderId });
    } else if (e.amount < 0) {
      consume(e, e.ts);
    }
  }

  return lots
    .filter((l) => l.remaining > 0 && (!l.expiresAt || l.expiresAt > now))
    .reduce((s, l) => s + l.remaining, 0);
}

interface RawMetafields {
  customer: { metafields: { edges: { node: { namespace: string; key: string; value: string } }[] } } | null;
}

/** Read the customer's ledger (parsed) by GID. Returns [] when unset. */
export async function readLedger(customerId: string): Promise<LedgerEntry[]> {
  const data = await adminGraphql<RawMetafields>(
    `query Ledger($id: ID!) {
      customer(id: $id) {
        metafields(first: 2, namespace: "${NS}") { edges { node { namespace key value } } }
      }
    }`,
    { id: customerId }
  );
  const node = data.customer?.metafields.edges.find((e) => e.node.key === LEDGER_KEY)?.node;
  if (!node?.value) return [];
  try {
    const arr = JSON.parse(node.value);
    return Array.isArray(arr) ? (arr as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist the ledger + recomputed balance metafields. */
async function writeLedger(customerId: string, ledger: LedgerEntry[]): Promise<void> {
  const balance = computeBalance(ledger);
  const r = await adminGraphql<{ metafieldsSet: { userErrors: { field: string[]; message: string }[] } }>(
    `mutation SetPoints($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { userErrors { field message } }
    }`,
    {
      metafields: [
        { ownerId: customerId, namespace: NS, key: LEDGER_KEY, type: 'json', value: JSON.stringify(ledger) },
        { ownerId: customerId, namespace: NS, key: BALANCE_KEY, type: 'number_integer', value: String(balance) },
      ],
    }
  );
  const errs = r.metafieldsSet.userErrors;
  if (errs?.length) throw new Error(`metafieldsSet(points): ${JSON.stringify(errs)}`);
}

export interface CreditOptions {
  type?: Extract<LedgerType, 'earn' | 'signup' | 'review' | 'restore' | 'adjust'>;
  reason?: string;
  orderId?: string;
  expiryMonths?: number; // 기본 EXPIRY_MONTHS
}

/** 적립. amount는 양수. 새 잔액을 반환. */
export async function creditPoints(customerId: string, amount: number, opts: CreditOptions = {}): Promise<number> {
  if (amount <= 0) return computeBalance(await readLedger(customerId));
  const ledger = await readLedger(customerId);
  const ts = nowIso();
  ledger.push({
    id: genId(),
    ts,
    type: opts.type ?? 'earn',
    amount: Math.floor(amount),
    expiresAt: addMonths(ts, opts.expiryMonths ?? EXPIRY_MONTHS),
    reason: opts.reason,
    orderId: opts.orderId,
  });
  await writeLedger(customerId, ledger);
  return computeBalance(ledger);
}

/** 차감(사용). amount는 양수로 받아 음수 엔트리를 기록. */
export async function debitPoints(
  customerId: string,
  amount: number,
  opts: { type?: Extract<LedgerType, 'spend' | 'clawback' | 'adjust'>; reason?: string; orderId?: string } = {}
): Promise<number> {
  if (amount <= 0) return computeBalance(await readLedger(customerId));
  const ledger = await readLedger(customerId);
  ledger.push({
    id: genId(),
    ts: nowIso(),
    type: opts.type ?? 'spend',
    amount: -Math.floor(amount),
    reason: opts.reason,
    orderId: opts.orderId,
  });
  await writeLedger(customerId, ledger);
  return computeBalance(ledger);
}

/** 회원가입 보너스 — 고객당 한 번만(원장에 signup 엔트리 없을 때). */
export async function creditSignupBonusOnce(customerId: string): Promise<void> {
  try {
    const ledger = await readLedger(customerId);
    if (ledger.some((e) => e.type === 'signup')) return;
    ledger.push({
      id: genId(),
      ts: nowIso(),
      type: 'signup',
      amount: SIGNUP_BONUS,
      expiresAt: addMonths(nowIso(), EXPIRY_MONTHS),
      reason: '회원가입 적립',
    });
    await writeLedger(customerId, ledger);
  } catch (e) {
    // 적립 실패가 로그인/가입을 막아선 안 된다.
    console.error('[points] signup bonus failed:', e);
  }
}

/** 현재 가용 잔액(만료 반영). */
export async function getBalance(customerId: string): Promise<number> {
  return computeBalance(await readLedger(customerId));
}

/* ───────────────── 적립금 사용(redeem) ─────────────────
 * 사용은 결제 금액에 직접 영향을 주므로, 서버가 사용자 인증 + 잔액을 검증한 뒤
 * (customerId, points)를 HMAC 서명한 토큰을 발급한다. 클라이언트는 이 토큰을
 * PortOne customData로 전달하고, 결제 확정(processPaidPayment) 시 서버가 서명을
 * 검증해 금액을 재계산·차감한다 → 클라이언트가 사용 포인트를 위조할 수 없다.   */

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const rsign = (data: string) => b64url(crypto.createHmac('sha256', SESSION_SECRET).update(data).digest());

/** (customerId, points)에 대한 서명 토큰 발급. */
export function signRedemption(customerId: string, points: number): string {
  const body = b64url(JSON.stringify({ k: 'redeem', cid: customerId, p: Math.floor(points), iat: Date.now() }));
  return `${body}.${rsign(body)}`;
}

/** 서명 토큰 검증. 30분 유효. 위조/만료면 null. */
export function verifyRedemption(token: string | undefined, maxAgeMs = 30 * 60 * 1000): { cid: string; p: number } | null {
  if (!token || SESSION_SECRET.length < 16) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(rsign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const v = JSON.parse(fromB64url(body).toString('utf8'));
    if (v.k !== 'redeem' || !v.cid || typeof v.p !== 'number') return null;
    if (!v.iat || Date.now() - v.iat > maxAgeMs) return null;
    return { cid: String(v.cid), p: Math.floor(v.p) };
  } catch {
    return null;
  }
}

/**
 * 주문 단위로 적립금을 차감(사용). 같은 주문에 대해 이미 차감된 spend 엔트리가
 * 있으면 멱등하게 건너뛴다(브라우저 확인 경로와 웹훅이 모두 호출할 수 있음).
 */
export async function spendForOrder(customerId: string, amount: number, orderId: string): Promise<number> {
  const ledger = await readLedger(customerId);
  if (amount <= 0) return computeBalance(ledger);
  if (ledger.some((e) => e.type === 'spend' && e.orderId === orderId)) return computeBalance(ledger);
  const available = computeBalance(ledger);
  if (available < amount) {
    // prepare 시점에 검증됐으므로 정상적으로는 발생하지 않음. 일관성 위해 기록하되 경고.
    console.error(`[points] spendForOrder ${customerId} amount ${amount} > available ${available} (order ${orderId})`);
  }
  ledger.push({ id: genId(), ts: nowIso(), type: 'spend', amount: -Math.floor(amount), reason: `적립금 사용 (주문 ${orderId})`, orderId });
  await writeLedger(customerId, ledger);
  return computeBalance(ledger);
}
