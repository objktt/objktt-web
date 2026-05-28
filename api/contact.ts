import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ContactBody {
  name?: string;
  email?: string;
  message?: string;
  honeypot?: string;
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'object' ? req.body : {}) as ContactBody;
  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim();
  const message = (body.message ?? '').trim();
  const honeypot = (body.honeypot ?? '').trim();

  // Honeypot — bots fill hidden fields; humans don't.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL ?? 'hello@objktt.kr';
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'hello@objktt.kr';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.55;">
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:1rem 0" />
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(message)}</pre>
    </div>
  `;

  const payload = {
    sender: { email: fromEmail, name: 'Objktt Contact' },
    to: [{ email: toEmail }],
    replyTo: { email, name },
    subject: `[Objktt] Message from ${name}`,
    htmlContent: html,
    textContent: `From: ${name} <${email}>\n\n${message}`,
  };

  try {
    const r = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      console.error('Brevo error', r.status, text);
      return res.status(502).json({ error: 'Email delivery failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
