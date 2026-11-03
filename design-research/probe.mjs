// Calls the live /api/agent with 12 visitor questions; saves raw replies + latency.
// Usage: node design-research/probe.mjs [base]   (paced under the 10/min limit)
import { writeFileSync } from 'node:fs';
const base = process.argv[2] || 'https://nyxsystem.online';
const Q = [
  ['founder', 'alfred', 'I run a 12-person SaaS company. Where would NYX help first?'],
  ['founder', 'convert', 'Our pipeline is leaky between demo and close. What would you do?'],
  ['executive', 'alfred', 'I am a COO at a 200-person firm. How is this different from hiring a chief of staff?'],
  ['executive', 'apex', 'How do you decide which agent handles a request?'],
  ['athlete', 'alfred', 'I am a pro athlete with a brand and two businesses. Is this for me?'],
  ['athlete', 'signal', 'Plan this week of content for an athlete launching a supplement line.'],
  ['gym owner', 'alfred', 'I own three gyms. Membership churn is my problem. Can you help?'],
  ['gym owner', 'meridian', 'Where are the bottlenecks usually hiding in a multi-location gym?'],
  ['skeptic', 'alfred', 'Is this just ChatGPT with a dark website?'],
  ['skeptic', 'cipher', 'Who can see my data if I use this?'],
  ['pricing', 'alfred', 'What does it cost?'],
  ['pricing', 'ledger', 'Can you forecast my cash flow for next quarter?'],
];
const out = [];
for (const [persona, agent, command] of Q) {
  const t0 = performance.now();
  let status = 0, body = null;
  try {
    const r = await fetch(base + '/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nyxsystem.online' }, body: JSON.stringify({ agent, command }) });
    status = r.status; body = await r.json();
  } catch (e) { body = { error: String(e) }; }
  const ms = Math.round(performance.now() - t0);
  const text = body?.response || '';
  out.push({ persona, agent, command, status, ms, chars: text.length, words: text.split(/\s+/).filter(Boolean).length, response: text });
  console.log(status, ms + 'ms', agent, text.length + 'ch');
  await new Promise(r => setTimeout(r, 7000));
}
writeFileSync(new URL('./alfred-raw.json', import.meta.url), JSON.stringify({ base, at: new Date().toISOString(), results: out }, null, 2));
