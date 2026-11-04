// Section screenshots for design review. No dependencies: drives headless Chrome over CDP.
// Usage: node design-review/shoot.mjs <base-url> <out-dir> [widths=360,390,768,1440]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base = 'http://127.0.0.1:8765/', out = 'design-review/after', w = '360,390,768,1440'] = process.argv.slice(2);
const widths = w.split(',').map(Number);
const SECTIONS = [
  ['hero', '#hero'], ['system', '#about'], ['engine', '#engine'], ['agents', '#agents'],
  ['alfred', '#alfred'], ['how', '#system'], ['options', '#access'], ['outcomes', '#outcomes'],
  ['missions', '#mission-logs'], ['architect', '#architect'], ['access', '#waitlist'], ['footer', 'footer'],
];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nyxshot-'))}`, '--hide-scrollbars', '--no-first-run', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { await sleep(200); }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable');
mkdirSync(out, { recursive: true });
for (const width of widths) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: width < 768 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Page.navigate', { url: base });
  await sleep(1500);
  await evalJs("localStorage.setItem('nyx_seen', Date.now()); localStorage.setItem('nyx_motion',''); true");
  await send('Page.navigate', { url: base });
  await sleep(2500);
  const vh = 900;
  for (const [name, sel] of SECTIONS) {
    const r = await evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return {y:b.top+scrollY,h:b.height}})()`);
    if (!r || !r.h) continue;
    // What a visitor sees: the section scrolled into the real viewport, one screen per slice (max 3).
    for (let k = 0; k * vh < r.h && k < 3; k++) {
      await evalJs(`(async()=>{scrollTo(0,${Math.round(r.y + k * vh)});await new Promise(r=>setTimeout(r,1700));return 1})()`);   // long enough for entry reveals to finish
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
      writeFileSync(join(out, `${name}-${width}${k ? '-' + (k + 1) : ''}.jpg`), Buffer.from(shot.result.data, 'base64'));
    }
  }
  console.log(`${width}px done`);
}
ws.close(); chrome.kill();
