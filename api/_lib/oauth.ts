/**
 * OAuth 2.0 (authorization-code) config + helpers for Google, Naver, Kakao.
 * All client secrets are server-only env vars; nothing here ships to the client.
 * The redirect URI is fixed (PUBLIC_BASE_URL) so it matches what's registered in
 * each provider console exactly.
 */

export type Provider = 'google' | 'naver' | 'kakao';
export const PROVIDERS: Provider[] = ['google', 'naver', 'kakao'];

const BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://objktt.kr').replace(/\/$/, '');

export interface OAuthProfile {
  email: string;
  name?: string;
}

interface ProviderConfig {
  clientId?: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope?: string;
}

function configFor(p: Provider): ProviderConfig {
  switch (p) {
    case 'google':
      return {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scope: 'openid email profile',
      };
    case 'naver':
      return {
        clientId: process.env.NAVER_OAUTH_CLIENT_ID,
        clientSecret: process.env.NAVER_OAUTH_CLIENT_SECRET,
        authorizeUrl: 'https://nid.naver.com/oauth2.0/authorize',
        tokenUrl: 'https://nid.naver.com/oauth2.0/token',
        userInfoUrl: 'https://openapi.naver.com/v1/nid/me',
      };
    case 'kakao':
      return {
        clientId: process.env.KAKAO_REST_API_KEY,
        clientSecret: process.env.KAKAO_OAUTH_CLIENT_SECRET, // optional (if enabled in console)
        authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
        tokenUrl: 'https://kauth.kakao.com/oauth/token',
        userInfoUrl: 'https://kapi.kakao.com/v2/user/me',
        scope: 'account_email profile_nickname',
      };
  }
}

export function isProvider(x: unknown): x is Provider {
  return typeof x === 'string' && (PROVIDERS as string[]).includes(x);
}

export function redirectUri(p: Provider): string {
  return `${BASE_URL}/api/auth/${p}/callback`;
}

export function providerConfigured(p: Provider): boolean {
  const c = configFor(p);
  // Kakao secret is optional; Google/Naver require both id + secret.
  if (p === 'kakao') return Boolean(c.clientId);
  return Boolean(c.clientId && c.clientSecret);
}

export function authorizeUrl(p: Provider, state: string): string {
  const c = configFor(p);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: c.clientId || '',
    redirect_uri: redirectUri(p),
    state,
  });
  if (c.scope) params.set('scope', c.scope);
  if (p === 'google') {
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  }
  return `${c.authorizeUrl}?${params.toString()}`;
}

/** Exchange the authorization code for an access token. */
export async function exchangeCode(p: Provider, code: string, state: string): Promise<string> {
  const c = configFor(p);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: c.clientId || '',
    redirect_uri: redirectUri(p),
    code,
  });
  if (c.clientSecret) body.set('client_secret', c.clientSecret);
  if (p === 'naver') body.set('state', state);

  const r = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error(`token exchange failed (${p}): ${JSON.stringify(j)}`);
  }
  return j.access_token as string;
}

/** Fetch the user's email + name from the provider. */
export async function fetchProfile(p: Provider, accessToken: string): Promise<OAuthProfile> {
  const c = configFor(p);
  const r = await fetch(c.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`userinfo failed (${p}): ${JSON.stringify(j)}`);

  if (p === 'google') {
    return { email: (j.email || '').toLowerCase(), name: j.name };
  }
  if (p === 'naver') {
    const res = j.response || {};
    return { email: (res.email || '').toLowerCase(), name: res.name || res.nickname };
  }
  // kakao
  const acct = j.kakao_account || {};
  return { email: (acct.email || '').toLowerCase(), name: acct.profile?.nickname };
}
