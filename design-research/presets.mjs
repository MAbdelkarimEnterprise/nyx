// Sends every preset command to the live API and flags replies that decline instead of answering.
// Usage: node design-research/presets.mjs  → design-research/presets.json
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
const PRESETS = Function(`return ${src.match(/const PRESETS = (\{[\s\S]*?\n  \});/)[1]}`)();
const DECLINE = /\b(can't|cannot|won't|unable|not able|don't have|I'm not|aren't covered|rather not|covered in the access review)\b/i;
const out = [];
for (const [agent, qs] of Object.entries(PRESETS)) for (const command of qs) {
  const t0 = performance.now();
  const r = await fetch('https://nyxsystem.online/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://nyxsystem.online' }, body: JSON.stringify({ agent, command }) });
  const { response = '' } = await r.json().catch(() => ({}));
  const firstSentence = response.split(/(?<=\.)\s/)[0];
  const declines = DECLINE.test(response.split(/(?<=\.)\s/).slice(0, 2).join(' '));   // first two sentences
  out.push({ agent, command, status: r.status, ms: Math.round(performance.now() - t0), chars: response.length, declines, response });
  console.log(r.status, declines ? 'DECLINES' : 'answers ', agent.padEnd(9), command, '|', firstSentence.slice(0, 90));
  await new Promise((res) => setTimeout(res, 6500));
}
writeFileSync(new URL(`./presets-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`, import.meta.url), JSON.stringify({ at: new Date().toISOString(), rule: 'first sentence must not decline', results: out }, null, 2));
console.log(`${out.filter((r) => !r.declines && r.status === 200).length}/${out.length} answer`);
