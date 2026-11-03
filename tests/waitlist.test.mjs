import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const sends = [];
require.cache[require.resolve('resend')] = {
  exports: { Resend: class { constructor() { this.emails = { send: async (m) => { sends.push(m); return mode.sendFails ? { error: { message: 'down' } } : { data: { id: 'x' } }; } }; } } },
};
const mode = { sendFails: false };
const handler = require('../api/waitlist.js');

let n = 0;
function call(body) {
  const req = { method: 'POST', headers: { 'x-forwarded-for': `10.50.${++n}.1` }, body };
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
  return handler(req, res).then(() => res);
}
const valid = { email: 'a@b.co', role: 'Founder', goal: 'Revenue', challenge: 'Too many decisions', outcome: 'Clarity', tier: 'Full System' };

beforeEach(() => {
  sends.length = 0; mode.sendFails = false;
  process.env.RESEND_API_KEY = 'test';
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  vi.restoreAllMocks();
});

describe('/api/waitlist', () => {
  it('notifies the owner with the tier and auto-replies with the confirmation copy', async () => {
    const res = await call(valid);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Received. Your operation is under review. Expect a response within 48 hours.');
    expect(sends[0].subject).toContain('Full System');
    expect(sends[0].html).toContain('Full System');
    expect(sends[1].to).toBe('a@b.co');
    expect(sends[1].html).toContain('Expect a response within 48 hours');
  });

  it('persists every field to Supabase when configured', async () => {
    process.env.SUPABASE_URL = 'https://db.example'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 201 });
    const res = await call(valid);
    expect(res.body.stored).toBe(true);
    const row = JSON.parse(fetchSpy.mock.calls[0][1].body)[0];
    expect(row).toMatchObject({ email: 'a@b.co', role: 'Founder', goal: 'Revenue', tier: 'Full System' });
  });

  it('refuses to report success when nothing was stored and the owner was not notified', async () => {
    mode.sendFails = true;
    const res = await call(valid);
    expect(res.statusCode).toBe(503);
  });

  it('validates email and required steps; unknown tiers become "Not sure yet"', async () => {
    expect((await call({ ...valid, email: 'nope' })).body.field).toBe('email');
    expect((await call({ ...valid, challenge: '' })).body.field).toBe('challenge');
    await call({ ...valid, tier: 'Platinum' });
    expect(sends[0].subject).toContain('Not sure yet');
  });

  it('silently drops honeypot submissions', async () => {
    const res = await call({ ...valid, company: 'Spam Inc' });
    expect(res.statusCode).toBe(200);
    expect(sends.length).toBe(0);
  });
});
