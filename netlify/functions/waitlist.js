/**
 * NYX — Access Review API (Netlify)
 * POST /.netlify/functions/waitlist  Body: { email, role, goal, challenge, outcome }
 * Mirrors ../../api/waitlist.js (the live Vercel function) so the two never
 * drift apart. Requires RESEND_API_KEY.
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
} = require('../../lib/shared');

const INQUIRY_TO = 'labs@nyxsystem.online';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = event.headers || {};
  const ip = (headers['x-nf-client-connection-ip']
    || headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (await checkRateLimit(ip, { max: 5, windowMs: 60_000, prefix: 'waitlist' })) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Please wait a moment.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const email = (body.email || '').trim();
  if (!email || !EMAIL_RE.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  const role = clean(body.role, 80);
  const goal = clean(body.goal, 80);
  const challenge = clean(body.challenge, 2000);
  const outcome = clean(body.outcome, 2000);

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const userAgent = headers['user-agent'] || null;
  const referrer = headers['referer'] || headers['referrer'] || null;

  // Persist first so the lead is never lost, even if email delivery fails.
  const persisted = await persistSignup({ email, ip, userAgent, referrer });

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

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, stored: persisted.stored }),
    };
  } catch (err) {
    await logError('waitlist-confirmation', err, { email });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
