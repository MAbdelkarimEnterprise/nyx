// axe-core (test-time only, loaded from the CDN into the page) across the loop's states at 1440 and 390.
// Usage: node design-research/axe.mjs <url>  → design-research/axe.json
import { writeFileSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8765/';
const AXE = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';
const run = `(async()=>{if(!window.axe){await new Promise((r,j)=>{const s=document.createElement('script');s.src='${AXE}';s.onload=r;s.onerror=j;document.head.appendChild(s)})}
const r=await axe.run(document,{resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(x=>x.target.join(' '))}))})()`;
const stub = (status, msg) => `window.fetch=()=>Promise.resolve(new Response(JSON.stringify({response:${JSON.stringify('')}+${JSON.stringify(msg)}}),{status:${status}}));1`;
const out = {};
for (const width of [1440, 390]) {
  const b = await launch(); await b.viewport(width);
  await b.send('Page.navigate', { url }); await sleep(1000);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url }); await sleep(3000);
  out[`${width}-rest`] = await b.evalJs(run);
  await b.evalJs("document.getElementById('hub').scrollIntoView({behavior:'instant'});document.querySelector('#hub .n-node-btn[data-agent=signal]').click();1");
  await b.evalJs(stub(200, 'A real-length reply. '.repeat(25))); await b.evalJs("document.querySelector('.n-cmd-preset').click();1"); await sleep(4000);
  out[`${width}-reply`] = await b.evalJs(run);
  await b.evalJs(stub(502, 'The intelligence layer is offline. Try again shortly.')); await b.evalJs("document.querySelectorAll('.n-cmd-preset')[1].click();1"); await sleep(3000);
  out[`${width}-error`] = await b.evalJs(run);
  b.close();
}
const total = Object.values(out).reduce((a, v) => a + v.length, 0);
writeFileSync(new URL('./axe.json', import.meta.url), JSON.stringify({ url, at: new Date().toISOString(), axe: '4.10.2', violations: total, states: out }, null, 2));
console.log('violations:', total); for (const [k, v] of Object.entries(out)) if (v.length) console.log(k, JSON.stringify(v));
