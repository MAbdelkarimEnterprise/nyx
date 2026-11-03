/**
 * NYX — Agent API (Vercel)
 * POST /api/agent   Body: { agent, command, history?: [{role, content}] }
 *
 * Public endpoint backed by a paid model, so: same-origin only, per-IP rate
 * limits (10/min, 50/day), 500-char input, 300-token output, answers grounded
 * in lib/nyx-knowledge.js. Logs usage, never message content.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { checkRateLimit } = require('../lib/shared');
const { PERSONAS, systemPrompt } = require('../lib/nyx-knowledge');

const MODEL = 'claude-haiku-5-5';
const MAX_INPUT = 500;
const MAX_TOKENS = 300;

const PROD_ORIGINS = new Set(['https://nyxsystem.online', 'https://www.nyxsystem.online']);
const PREVIEW_RE = /^https:\/\/nyx-site-3[a-z0-9-]*\.vercel\.app$/;
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Brand-voice errors. Never a stack trace.
const MSG = {
  origin: 'Not available here.',
  method: 'Method not allowed.',
  missing: 'Ask a question first.',
  long: `Keep it under ${MAX_INPUT} characters.`,
  agent: 'No agent by that name.',
  minute: 'The line is busy. Try again in a minute.',
  day: 'That is enough for today. The access review is the next step.',
  offline: 'The intelligence layer is offline. Try again shortly.',
  refusal: 'That is outside what I can discuss. The access review is the right place for it.',
};

function originOf(req) {
  const h = req.headers || {};
  if (h.origin) return h.origin;
  try { return new URL(h.referer || h.referrer).origin; } catch { return ''; }
}

function allowedOrigin(origin) {
  if (PROD_ORIGINS.has(origin) || PREVIEW_RE.test(origin)) return true;
  return process.env.VERCEL_ENV !== 'production' && LOCAL_RE.test(origin);
}

// Keep the last 6 well-formed turns, starting on a user turn, each capped.
function cleanHistory(history) {
  const turns = (Array.isArray(history) ? history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-6)
    .map(m => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? MAX_INPUT : 1500) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

function usage(fields) {
  console.log(JSON.stringify({ evt: 'agent_call', ...fields }));
}

async function handler(req, res) {
  const t0 = Date.now();
  const origin = originOf(req);
  const log = (status, extra = {}) => usage({ status, ms: Date.now() - t0, ...extra });

  if (!allowedOrigin(origin)) { log(403); return res.status(403).json({ response: MSG.origin }); }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ response: MSG.method });

  const { agent, command, history } = req.body || {};
  const key = String(agent || '').toLowerCase();
  const text = typeof command === 'string' ? command.trim() : '';
  if (!text) { log(400); return res.status(400).json({ response: MSG.missing }); }
  if (text.length > MAX_INPUT) { log(413, { agent: key, in_len: text.length }); return res.status(413).json({ response: MSG.long }); }
  if (!PERSONAS[key]) { log(400); return res.status(400).json({ response: MSG.agent }); }

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (await checkRateLimit(ip, { max: 10, windowMs: 60_000, prefix: 'agent-min' })) {
    log(429, { agent: key }); return res.status(429).json({ response: MSG.minute });
  }
  if (await checkRateLimit(ip, { max: 50, windowMs: 86_400_000, prefix: 'agent-day' })) {
    log(429, { agent: key }); return res.status(429).json({ response: MSG.day });
  }

  if (!process.env.ANTHROPIC_API_KEY) { log(503, { agent: key }); return res.status(503).json({ response: MSG.offline }); }

  try {
    const client = handler.client || new Anthropic({ maxRetries: 1, timeout: 20_000 });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      system: systemPrompt(key),
      messages: [...cleanHistory(history), { role: 'user', content: text }],
    });
    if (msg.stop_reason === 'refusal') {
      log(200, { agent: key, in_len: text.length, refusal: true });
      return res.status(200).json({ response: MSG.refusal, agent: PERSONAS[key].name });
    }
    const reply = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim() || MSG.offline;
    log(200, { agent: key, in_len: text.length, out_tokens: msg.usage?.output_tokens, cached: msg.usage?.cache_read_input_tokens || 0 });
    return res.status(200).json({ response: reply, agent: PERSONAS[key].name });
  } catch (err) {
    log(502, { agent: key, err: err?.status || err?.name || 'error' });
    return res.status(502).json({ response: MSG.offline });
  }
}

module.exports = handler;
module.exports.cleanHistory = cleanHistory;
module.exports.allowedOrigin = allowedOrigin;
