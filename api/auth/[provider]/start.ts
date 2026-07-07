import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';
import { isProvider, providerConfigured, authorizeUrl } from '../../_lib/oauth.js';
import { setOAuthStateCookie } from '../../_lib/session.js';

/** Kick off social login: set a signed state cookie (CSRF) and redirect to the provider. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const provider = req.query.provider;
  if (!isProvider(provider)) return res.status(404).json({ error: 'unknown provider' });
  if (!providerConfigured(provider)) {
    return res.status(503).json({ error: `${provider} 로그인이 아직 설정되지 않았습니다.` });
  }

  const redirectParam = req.query.redirect;
  const redirect =
    typeof redirectParam === 'string' && redirectParam.startsWith('/') ? redirectParam : '/';

  const state = crypto.randomUUID();
  setOAuthStateCookie(res, state, redirect);
  return res.redirect(302, authorizeUrl(provider, state));
}
