import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PROVIDERS, providerConfigured } from '../_lib/oauth.js';
import { isSessionConfigured } from '../_lib/session.js';

/** Which social providers are wired (creds present). UI shows only enabled buttons. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const ready = isSessionConfigured();
  const out: Record<string, boolean> = {};
  for (const p of PROVIDERS) out[p] = ready && providerConfigured(p);
  res.status(200).json(out);
}
