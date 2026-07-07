import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isProvider, providerConfigured, exchangeCode, fetchProfile } from '../../_lib/oauth.js';
import {
  readOAuthStateCookie,
  clearOAuthStateCookie,
  createToken,
  setSessionCookie,
  isSessionConfigured,
} from '../../_lib/session.js';
import { findOrCreateCustomer } from '../../_lib/customer.js';
import { creditSignupBonusOnce } from '../../_lib/points.js';

/** OAuth redirect target: verify state, exchange code, bridge to a Shopify customer, set our session. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const provider = req.query.provider;
  if (!isProvider(provider)) return res.status(404).json({ error: 'unknown provider' });

  const fail = (msg: string) => res.redirect(302, `/account?error=${encodeURIComponent(msg)}`);

  if (!providerConfigured(provider) || !isSessionConfigured()) {
    return fail('소셜 로그인이 아직 설정되지 않았습니다.');
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const saved = readOAuthStateCookie(req);
  clearOAuthStateCookie(res);

  if (!code || !state || !saved || saved.state !== state) {
    console.error('[auth callback] state check failed', {
      provider,
      hasCode: !!code,
      hasState: !!state,
      hasSavedCookie: !!saved,
      stateMatch: saved?.state === state,
    });
    return fail('세션이 만료되었거나 잘못된 요청입니다. 다시 시도해 주세요.');
  }

  try {
    const accessToken = await exchangeCode(provider, code, state);
    const profile = await fetchProfile(provider, accessToken);
    if (!profile.email) {
      return fail('이메일 제공에 동의해야 로그인할 수 있습니다.');
    }
    const customerId = await findOrCreateCustomer(profile.email, profile.name);
    await creditSignupBonusOnce(customerId); // 멱등 — 최초 1회만 적립.
    const token = createToken({ sub: customerId, email: profile.email, name: profile.name, provider });
    setSessionCookie(res, token);
    const dest = saved.redirect && saved.redirect.startsWith('/') ? saved.redirect : '/';
    return res.redirect(302, dest);
  } catch (e) {
    console.error('[auth callback]', provider, e);
    return fail('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
