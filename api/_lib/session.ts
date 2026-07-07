import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * First-party session for social-login (Google/Naver/Kakao) users. These users
 * have no Shopify password, so we can't mint a Storefront customerAccessToken
 * for them — instead we issue our own HMAC-signed, HttpOnly cookie that carries
 * the bridged Shopify customer id. Email/password users keep using the existing
 * Storefront-token flow in src/lib/account.ts.
 *
 * Token format: base64url(payload).base64url(HMAC-SHA256(payload)). Server-only
 * secret SESSION_SECRET. Stateless — no DB needed.
 */

const SESSION_SECRET = process.env.SESSION_SECRET || '';
export const SESSION_COOKIE = 'objktt_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  sub: string; // Shopify customer GID
  email: string;
  name?: string;
  provider: 'google' | 'naver' | 'kakao';
  exp: number; // epoch seconds
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', SESSION_SECRET).update(data).digest());
}

export function isSessionConfigured(): boolean {
  return SESSION_SECRET.length >= 16;
}

export function createToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token || !isSessionConfigured()) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  // Constant-time compare.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (!payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req: VercelRequest): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function cookieAttrs(maxAgeSec: number): string {
  return [`Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=${maxAgeSec}`].join('; ');
}

/** Append a Set-Cookie without clobbering any existing ones. */
function appendSetCookie(res: VercelResponse, value: string) {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) res.setHeader('Set-Cookie', value);
  else if (Array.isArray(prev)) res.setHeader('Set-Cookie', [...prev, value]);
  else res.setHeader('Set-Cookie', [prev as string, value]);
}

export function setSessionCookie(res: VercelResponse, token: string) {
  appendSetCookie(res, `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttrs(MAX_AGE_SEC)}`);
}

export function clearSessionCookie(res: VercelResponse) {
  appendSetCookie(res, `${SESSION_COOKIE}=; ${cookieAttrs(0)}`);
}

/** Short-lived, signed cookie holding the OAuth `state` (CSRF) + post-login redirect. */
const OAUTH_COOKIE = 'objktt_oauth';
export function setOAuthStateCookie(res: VercelResponse, state: string, redirect: string) {
  const body = b64url(JSON.stringify({ state, redirect, exp: Math.floor(Date.now() / 1000) + 600 }));
  const token = `${body}.${sign(body)}`;
  // SameSite=None (Secure) so the cookie survives the cross-site redirect back
  // from the OAuth provider (Google/Naver/Kakao) to our callback.
  appendSetCookie(res, `${OAUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`);
}
export function readOAuthStateCookie(req: VercelRequest): { state: string; redirect: string } | null {
  const token = parseCookies(req)[OAUTH_COOKIE];
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const v = JSON.parse(fromB64url(body).toString('utf8'));
    if (!v.exp || v.exp * 1000 <= Date.now()) return null;
    return { state: v.state, redirect: v.redirect };
  } catch {
    return null;
  }
}
export function clearOAuthStateCookie(res: VercelResponse) {
  appendSetCookie(res, `${OAUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
