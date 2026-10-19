// Shared helpers for NYX serverless functions — imported by both the Vercel
// function (../api/waitlist.js) and the Netlify function (../netlify/functions/waitlist.js)
// so the two platforms never drift apart again. Lives outside both functions
// directories; esbuild (Netlify) and Vercel's bundler both resolve relative
// requires at build time, so no duplication is needed.

const memBuckets = new Map();

function memoryLimited(key, max, windowMs) {
  const now = Date.now();
  const arr = (memBuckets.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memBuckets.set(key, arr);
  if (memBuckets.size > 5000) memBuckets.clear();
  return arr.length > max;
}

// Durable, cross-instance rate limit when Upstash is configured; otherwise a
// best-effort per-instance fallback. Never throws — a limiter outage must not
// take down the endpoint.
async function checkRateLimit(ip, { max = 20, windowMs = 60_000, prefix = 'rl' } = {}) {
  const key = `${prefix}:${ip}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return memoryLimited(key, max, windowMs);

  try {
    const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
    const ttl = Math.ceil(windowMs / 1000);
    // Pipeline: INCR then EXPIRE (idempotent) in one round-trip.
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', windowKey], ['EXPIRE', windowKey, String(ttl)]]),
    });
    if (!res.ok) return memoryLimited(key, max, windowMs);
    const out = await res.json();
    const count = Number(out?.[0]?.result ?? 0);
    return count > max;
  } catch (err) {
    console.error('rate-limit error, falling back to memory:', err.message);
    return memoryLimited(key, max, windowMs);
  }
}

// Structured error logging. Forwards to ERROR_WEBHOOK_URL (Sentry-compatible or
// Slack/Discord) when configured; always logs to the function console.
async function logError(scope, err, meta = {}) {
  const payload = {
    scope,
    message: err?.message || String(err),
    ...meta,
    ts: new Date().toISOString(),
  };
  console.error(`[NYX:${scope}]`, payload.message, meta);
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[NYX:${scope}] ${payload.message}`, ...payload }),
    });
  } catch { /* swallow — logging must never throw */ }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Trims, caps length, and HTML-escapes free-text form fields before they are
// ever interpolated into an email template or stored.
function clean(str, max = 2000) {
  return escapeHtml(String(str || '').trim().slice(0, max));
}

// Persist the signup via Supabase REST (no SDK dependency). Idempotent on email
// thanks to the unique index; conflicts are ignored. Never throws — a storage
// hiccup must not block the confirmation email.
async function persistSignup({ email, ip, userAgent, referrer }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { stored: false, reason: 'supabase-not-configured' };
  try {
    const res = await fetch(`${url}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify([{ email, source: 'landing', ip, user_agent: userAgent, referrer }]),
    });
    return { stored: res.ok || res.status === 409, status: res.status };
  } catch (err) {
    console.error('waitlist persist error:', err.message);
    return { stored: false, reason: err.message };
  }
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────────────────
// NYX blue (#1E5BFF) on black, shared by both platforms so the two never
// show the client a different brand than the one in app.

const EMAIL_WRAPPER_OPEN = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NYX</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Courier New',monospace;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" style="padding:60px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#000000;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#1E5BFF,transparent);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:48px 48px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 24px;font-size:9px;letter-spacing:0.45em;text-transform:uppercase;color:rgba(30,91,255,0.75);font-family:'Courier New',monospace;">Autonomous AI Operating System</p>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:64px;font-weight:300;letter-spacing:0.25em;color:#f0ede8;text-transform:uppercase;line-height:1;">NYX</h1>
            </td>
          </tr>`;

const EMAIL_WRAPPER_CLOSE = `
          <tr>
            <td style="padding:28px 48px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:14px;font-weight:300;letter-spacing:0.3em;text-transform:uppercase;color:rgba(240,237,232,0.2);">NYX</p>
              <p style="margin:0;font-size:9px;letter-spacing:0.15em;color:rgba(240,237,232,0.15);font-family:'Courier New',monospace;">This message was sent because access was requested at nyxsystem.online.</p>
            </td>
          </tr>
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,rgba(30,91,255,0.45),transparent);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function confirmationEmailHtml() {
  return `${EMAIL_WRAPPER_OPEN}
          <tr>
            <td style="padding:56px 48px 48px;">
              <p style="margin:0 0 8px;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:#1E5BFF;font-family:'Courier New',monospace;">Access Requested</p>
              <h2 style="margin:0 0 32px;font-family:Georgia,serif;font-size:36px;font-weight:300;color:#f0ede8;line-height:1.15;">You are on the list.</h2>
              <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:rgba(240,237,232,0.5);letter-spacing:0.03em;font-family:'Courier New',monospace;">Your request has been received and logged. NYX access is reviewed manually — not granted by algorithm, not issued by default.</p>
              <p style="margin:0 0 20px;font-size:12px;line-height:1.9;color:rgba(240,237,232,0.5);letter-spacing:0.03em;font-family:'Courier New',monospace;">When the time is right, you will hear from us. Until then, the system is already watching.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.06);font-size:0;">&nbsp;</td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#1E5BFF;font-family:'Courier New',monospace;">01 — OBSERVE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">Every signal captured. Nothing lost.</p>
                </td></tr>
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#1E5BFF;font-family:'Courier New',monospace;">02 — ANALYZE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">AI processes performance across every domain simultaneously.</p>
                </td></tr>
                <tr><td style="padding:0 0 24px;">
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#1E5BFF;font-family:'Courier New',monospace;">03 — OPTIMIZE</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">Precision recommendations. Automated actions. Compounding results.</p>
                </td></tr>
                <tr><td>
                  <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#1E5BFF;font-family:'Courier New',monospace;">04 — COMPOUND</p>
                  <p style="margin:0;font-size:11px;color:rgba(240,237,232,0.35);letter-spacing:0.03em;line-height:1.6;font-family:'Courier New',monospace;">The longer you operate within NYX, the stronger the system becomes.</p>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:40px 0;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.06);font-size:0;">&nbsp;</td></tr>
              </table>
              <p style="margin:0;font-family:Georgia,serif;font-size:18px;font-weight:300;font-style:italic;color:rgba(240,237,232,0.4);letter-spacing:0.05em;line-height:1.6;">
                "What operates in the dark<br>controls what happens in the light."
              </p>
            </td>
          </tr>${EMAIL_WRAPPER_CLOSE}`;
}

function inquiryRow(label, value) {
  return `<tr><td style="padding:0 0 22px;">
    <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.3em;color:#1E5BFF;font-family:'Courier New',monospace;">${label}</p>
    <p style="margin:0;font-size:13px;color:#f0ede8;letter-spacing:0.02em;line-height:1.6;font-family:'Courier New',monospace;white-space:pre-wrap;">${value || '—'}</p>
  </td></tr>`;
}

function inquiryEmailHtml({ email, role, goal, challenge, outcome, ip }) {
  return `${EMAIL_WRAPPER_OPEN}
          <tr>
            <td style="padding:56px 48px 48px;">
              <p style="margin:0 0 8px;font-size:9px;letter-spacing:0.4em;text-transform:uppercase;color:#1E5BFF;font-family:'Courier New',monospace;">New Access Review</p>
              <h2 style="margin:0 0 32px;font-family:Georgia,serif;font-size:32px;font-weight:300;color:#f0ede8;line-height:1.15;">Inquiry received.</h2>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${inquiryRow('IDENTITY', role)}
                ${inquiryRow('OBJECTIVE', goal)}
                ${inquiryRow('CHALLENGE', challenge)}
                ${inquiryRow('DESIRED OUTCOME', outcome)}
                ${inquiryRow('EMAIL', email)}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                <tr><td style="height:1px;background:rgba(255,255,255,0.06);font-size:0;">&nbsp;</td></tr>
              </table>
              <p style="margin:24px 0 0;font-size:10px;color:rgba(240,237,232,0.3);letter-spacing:0.05em;font-family:'Courier New',monospace;">IP ${ip || 'unknown'} · ${new Date().toISOString()}</p>
            </td>
          </tr>${EMAIL_WRAPPER_CLOSE}`;
}

module.exports = {
  checkRateLimit,
  logError,
  persistSignup,
  EMAIL_RE,
  clean,
  confirmationEmailHtml,
  inquiryEmailHtml,
};
