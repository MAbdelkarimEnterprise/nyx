import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const handler = require('../api/agent.js');
const { KNOWLEDGE } = require('../lib/nyx-knowledge.js');

let ipSeq = 0;
function call(body, { origin = 'https://nyxsystem.online', ip } = {}) {
  const req = {
    method: 'POST',
    headers: { origin, 'x-forwarded-for': ip || `10.9.${ipSeq}.${++ipSeq % 250}` },
    body,
  };
  const res = {
    statusCode: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; },
  };
  return handler(req, res).then(() => res);
}

let sent;
beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test';
  sent = null;
  handler.client = { messages: { create: async (p) => { sent = p; return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Grounded answer.' }], usage: { output_tokens: 5 } }; } } };
});

describe('/api/agent', () => {
  it('serves alfred, grounded in the shared knowledge, with capped output', async () => {
    const res = await call({ agent: 'alfred', command: 'What does NYX cost?' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ response: 'Grounded answer.', agent: 'ALFRED' });
    expect(sent.max_tokens).toBe(300);
    expect(sent.system[0].text).toContain(KNOWLEDGE);
    expect(sent.system[0].text).toContain('Never invent prices');
  });

  it('grounds every agent', async () => {
    for (const a of ['apex', 'oracle', 'signal', 'convert', 'ledger', 'meridian', 'cipher', 'forge']) {
      await call({ agent: a, command: 'hi' });
      expect(sent.system[0].text).toContain(KNOWLEDGE);
    }
  });

  it('rejects foreign origins and missing origins', async () => {
    expect((await call({ agent: 'alfred', command: 'hi' }, { origin: 'https://evil.example' })).statusCode).toBe(403);
    expect((await call({ agent: 'alfred', command: 'hi' }, { origin: '' })).statusCode).toBe(403);
    expect((await call({ agent: 'alfred', command: 'hi' }, { origin: 'https://nyx-site-3-abc123-team.vercel.app' })).statusCode).toBe(200);
  });

  it('caps input at 500 characters and rejects unknown agents', async () => {
    expect((await call({ agent: 'alfred', command: 'x'.repeat(501) })).statusCode).toBe(413);
    expect((await call({ agent: 'nobody', command: 'hi' })).statusCode).toBe(400);
    expect(sent).toBeNull();
  });

  it('rate-limits at 10 per minute per IP', async () => {
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await call({ agent: 'alfred', command: 'hi' }, { ip: '10.77.0.1' })).statusCode);
    expect(codes.slice(0, 10).every(c => c === 200)).toBe(true);
    expect(codes[10]).toBe(429);
  });

  it('hides upstream errors behind a brand-voice message', async () => {
    handler.client = { messages: { create: async () => { throw new Error('boom: secret stack'); } } };
    const res = await call({ agent: 'alfred', command: 'hi' });
    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/boom|stack/);
  });

  it('drops leading assistant turns and caps history', () => {
    const h = handler.cleanHistory([{ role: 'assistant', content: 'a' }, { role: 'user', content: 'u'.repeat(900) }, { role: 'system', content: 'x' }]);
    expect(h).toEqual([{ role: 'user', content: 'u'.repeat(500) }]);
  });
});
