import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../_lib/session.js';

/** Clears the social-login session cookie. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
