/**
 * NYX — Access Review API (Vercel)
 * POST /api/waitlist  Body: { email, role, goal, challenge, outcome }
 * Sends a confirmation email to the client and the full inquiry to labs@nyxsystem.online.
 * Requires RESEND_API_KEY.
 */

const { Resend } = require('resend');
const {
  checkRateLimit,
  logError,
  persistSignup,
  EMAIL_RE,
  clean,
  confirmationEmailHtml,
  inquiryEmailHtml,
} = require('../lib/shared');

const INQUIRY_TO = 'labs@nyxsystem.online';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.nyxsystem.online');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();
  if (await checkRateLimit(ip, { max: 5, windowMs: 60_000, prefix: 'waitlist' })) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const body = req.body || {};
  const email = (body.email || '').trim();
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const role = clean(body.role, 80);
  const goal = clean(body.goal, 80);
  const challenge = clean(body.challenge, 2000);
  const outcome = clean(body.outcome, 2000);

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const userAgent = req.headers['user-agent'] || null;
  const referrer = req.headers['referer'] || req.headers['referrer'] || null;

  // Persist first (best-effort) so the lead is never lost, even if delivery fails.
  const persisted = await persistSignup({ email, ip, userAgent, referrer });

  // The inquiry to labs@ is the business-critical message; send it, but a
  // failure here must not be reported to the client as their own error —
  // it's logged for follow-up instead.
  try {
    await resend.emails.send({
      from: 'NYX <labs@nyxsystem.online>',
      to: INQUIRY_TO,
      replyTo: email,
      subject: `Access Review — ${role || 'new'} inquiry`,
      html: inquiryEmailHtml({ email, role, goal, challenge, outcome, ip }),
    });
  } catch (err) {
    await logError('waitlist-inquiry', err, { email });
  }

  try {
    await resend.emails.send({
      from: 'NYX <labs@nyxsystem.online>',
      to: email,
      subject: 'You are on the list.',
      html: confirmationEmailHtml(),
    });
    return res.status(200).json({ ok: true, stored: persisted.stored });
  } catch (err) {
    await logError('waitlist-confirmation', err, { email });
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
