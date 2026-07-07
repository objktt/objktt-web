import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, parseCookies, SESSION_COOKIE } from '../_lib/session.js';
import { getCustomerById } from '../_lib/customer.js';

/** Returns the social-session customer (or null). AuthContext calls this on load. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(parseCookies(req)[SESSION_COOKIE]);
  if (!payload) return res.status(200).json({ customer: null });
  try {
    const customer = await getCustomerById(payload.sub);
    return res.status(200).json({ customer, provider: payload.provider });
  } catch (e) {
    console.error('[auth me]', e);
    return res.status(200).json({ customer: null });
  }
}
