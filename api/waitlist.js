/**
 * NYX — Access Review API (Vercel)
 * POST /api/waitlist
 * Body: { email, role, goal, challenge, outcome, tier, company (honeypot) }
 *
 * A submission is accepted only once it is stored (Supabase) or the owner has
 * been emailed (Resend) — otherwise the visitor is told to retry, so no
 * inquiry is silently lost. The visitor gets an auto-reply either way.
 */

const { Resend } = require('resend');
const {
  checkRateLimit,
  logError,
  persistSignup,
  EMAIL_RE,
  CONFIRMATION_TEXT,
  TIERS,
  clean,
  confirmationEmailHtml,
  inquiryEmailHtml,
} = require('../lib/shared');

const INQUIRY_TO = process.env.INQUIRY_TO || 'labs@nyxsystem.online';
const FROM = 'NYX <labs@nyxsystem.online>';

async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (await checkRateLimit(ip, { max: 5, windowMs: 60_000, prefix: 'waitlist' })
   || await checkRateLimit(ip, { max: 20, windowMs: 86_400_000, prefix: 'waitlist-day' })) {
    return res.status(429).json({ error: 'Too many submissions. Wait a moment and try again.' });
  }

  const body = req.body || {};

  // Honeypot: real visitors never see this field. Pretend success, store nothing.
  if (body.company) return res.status(200).json({ ok: true, message: CONFIRMATION_TEXT });

  const email = String(body.email || '').trim().slice(0, 254);
  const fields = {
    role: clean(body.role, 80),
    goal: clean(body.goal, 80),
    challenge: clean(body.challenge, 2000),
    outcome: clean(body.outcome, 2000),
    tier: TIERS.includes(body.tier) ? body.tier : 'Not sure yet',
  };
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.', field: 'email' });
  for (const k of ['role', 'goal', 'challenge', 'outcome']) {
    if (!fields[k]) return res.status(400).json({ error: 'A step is missing an answer.', field: k });
  }

  const persisted = await persistSignup({
    email, ip, ...fields,
    userAgent: req.headers['user-agent'] || null,
    referrer: req.headers['referer'] || null,
  });
  if (!persisted.stored) await logError('waitlist-store', new Error(persisted.reason || `status ${persisted.status}`), { tier: fields.tier });

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  let notified = false;
  if (resend) {
    try {
      const r = await resend.emails.send({
        from: FROM, to: INQUIRY_TO, replyTo: email,
        subject: `Access Review — ${fields.tier} — ${fields.role}`,
        html: inquiryEmailHtml({ email, ...fields, ip }),
      });
      notified = !r?.error;
      if (r?.error) await logError('waitlist-notify', new Error(r.error.message || 'send failed'));
    } catch (err) { await logError('waitlist-notify', err); }
  }

  if (!persisted.stored && !notified) {
    return res.status(503).json({ error: 'The review could not be recorded. Your answers are saved here. Try again.' });
  }

  if (resend) {
    try {
      await resend.emails.send({ from: FROM, to: email, subject: 'Received.', html: confirmationEmailHtml() });
    } catch (err) { await logError('waitlist-autoreply', err); }
  }

  return res.status(200).json({ ok: true, stored: persisted.stored, notified, message: CONFIRMATION_TEXT });
}

module.exports = handler;
