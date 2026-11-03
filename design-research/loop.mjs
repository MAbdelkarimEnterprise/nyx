// Drives the Agent Network command loop through every state and records it.
// Usage: node design-research/loop.mjs <url> <out-dir> [--live] [--gif]
//   default stubs /api/agent with a real recorded reply (alfred-raw.json) at the measured median latency;
//   --live uses the real API (preview/prod only). Writes PNG frames per state, GIFs with --gif, and checks.json.
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from './cdp.mjs';

const [url = 'http://127.0.0.1:8765/', out = 'design-research/loop'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LIVE = process.argv.includes('--live'), GIF = process.argv.includes('--gif');
mkdirSync(out, { recursive: true });
const raw = JSON.parse(readFileSync(new URL('./alfred-raw.json', import.meta.url))).results;
const reply = raw.find((r) => r.agent === 'convert').response;

// Stub: same contract as api/agent.js. mode = ok | limited | error.
const STUB = (mode) => `(()=>{const f0=window.__f0||(window.__f0=fetch);window.fetch=(u,o)=>{if(!String(u).includes('/api/agent'))return f0(u,o);
const r={ok:[200,{response:${JSON.stringify(reply)},agent:'CONVERT'}],limited:[429,{response:'The line is busy. Try again in a minute.'}],error:[502,{response:'The intelligence layer is offline. Try again shortly.'}]}['${mode}'];
return new Promise(res=>setTimeout(()=>res(new Response(JSON.stringify(r[1]),{status:r[0],headers:{'Content-Type':'application/json'}})),1450))};return 1})()`;
const OBS = `(()=>{window.__cls=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)__cls+=e.value})).observe({type:'layout-shift',buffered:false});
window.__inp=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>e.interactionId&&__inp.push(e.duration))).observe({type:'event',durationThreshold:16});
window.__live=[];new MutationObserver(()=>{const t=document.getElementById('n-cmd-live').textContent;t&&__live.push(t)}).observe(document.getElementById('n-cmd-live'),{childList:true,characterData:true,subtree:true});return 1})()`;

const checks = {};
async function run(width, { rm = false } = {}) {
  const b = await launch();
  await b.viewport(width);
  if (rm) await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await b.send('Page.navigate', { url }); await sleep(1200);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url }); await sleep(2500);
  const tag = `${width}${rm ? '-rm' : ''}`;
  let frames = [], rec = false;
  const shot = async (name) => writeFileSync(`${out}/${tag}-${name}.png`, Buffer.from((await b.send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const recorder = async () => { while (rec) { const d = (await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 })).result.data; frames.push({ t: Date.now(), d }); await sleep(60); } };
  // Frame the section: on desktop the map + panel; on mobile the docked panel over the list.
  await b.evalJs(`(async()=>{const h=document.getElementById('hub');scrollTo(0,h.getBoundingClientRect().top+scrollY-(innerWidth<900?120:40));await new Promise(r=>setTimeout(r,800));return 1})()`);
  await b.evalJs(OBS);
  const click = async (sel, i = 0) => {
    const p = await b.evalJs(`(()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${i}];e.scrollIntoView({block:e.closest('.n-cmd')?'nearest':'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1] });
    await sleep(150);
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0], y: p[1], button: 'left', clickCount: 1 });
  };
  const state = () => b.evalJs("document.getElementById('n-cmd').dataset.state");
  const waitState = async (want, ms = 8000) => { const t0 = Date.now(); while (!want.includes(await state()) && Date.now() - t0 < ms) await sleep(50); return state(); };
  const r = { width, rm };
  await shot('1-rest');
  if (GIF) { rec = true; recorder(); }
  // Select CONVERT, then send its first preset (success).
  await click('#hub .n-node-btn[data-agent="convert"]'); await sleep(400);
  await shot('2-selected');
  if (!LIVE) await b.evalJs(STUB('ok'));
  const t0 = Date.now();
  await click('.n-cmd-preset', 0);
  await sleep(rm ? 100 : 300); await shot('3-sent');
  r.routingState = await waitState(['routing']); await sleep(300); await shot('4-routing');
  r.final = await waitState(['done', 'error', 'limited', 'offline'], 25000); r.replyMs = Date.now() - t0;
  await sleep(200); await shot('5-done');
  r.replyChars = (await b.evalJs("document.querySelector('.n-cmd-text').textContent")).length;
  r.replyFits = await b.evalJs("(()=>{const e=document.querySelector('.n-cmd-reply');return e.scrollHeight<=e.clientHeight+1})()");
  r.inquireVisible = await b.evalJs("!!document.querySelector('.n-cmd-inquire').offsetParent");
  if (!LIVE) {
    for (const mode of ['limited', 'error']) {
      await b.evalJs(STUB(mode)); await click('.n-cmd-preset', 1);
      r[mode] = await waitState([mode]); await sleep(150); await shot(`6-${mode}`);
    }
    await b.send('Network.enable'); await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await click('.n-cmd-preset', 2); r.offline = await waitState(['offline']); await sleep(150); await shot('7-offline');
    await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }
  if (GIF) { await sleep(600); rec = false; await sleep(200); }
  // Keyboard: focus APEX, arrow to the next agent, Enter selects, Esc backs out.
  const key = async (k, code = k) => { await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: { ArrowRight: 39, Enter: 13, Escape: 27 }[k], ...(k === 'Enter' ? { text: '\r' } : {}) }); await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }); await sleep(120); };
  await b.evalJs("document.querySelector('#hub [data-agent=apex]').focus();1");
  await key('ArrowRight'); r.kbArrow = await b.evalJs('document.activeElement.dataset.agent');
  await key('Enter'); r.kbSelected = await b.evalJs("document.querySelector('#hub [aria-pressed=true]').dataset.agent");
  await b.evalJs("document.querySelector('.n-cmd-preset').focus();1"); await key('Escape'); r.kbEscFocus = await b.evalJs('document.activeElement.dataset.agent');
  await key('Escape'); r.kbEscReset = await b.evalJs("document.querySelector('#hub [aria-pressed=true]').dataset.agent");
  r.live = await b.evalJs('__live'); r.cls = +(await b.evalJs('__cls')).toFixed(4); r.inpMax = Math.max(0, ...(await b.evalJs('__inp')));
  r.pinkAtRestBeforeAction = 'see pixelshare';
  if (GIF && frames.length) {
    const fd = `${out}/frames-${tag}`; rmSync(fd, { recursive: true, force: true }); mkdirSync(fd);
    let list = '';
    frames.forEach((f, i) => { writeFileSync(`${fd}/${String(i).padStart(4, '0')}.jpg`, Buffer.from(f.d, 'base64')); const dt = ((frames[i + 1]?.t ?? f.t + 100) - f.t) / 1000; list += `file '${String(i).padStart(4, '0')}.jpg'\nduration ${dt.toFixed(3)}\n`; });
    writeFileSync(`${fd}/list.txt`, list);
    const scale = width > 800 ? 960 : 390;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${fd}/list.txt`, '-vf', `fps=12,scale=${scale}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer`, `${out}/loop-${tag}.gif`]);
    rmSync(fd, { recursive: true, force: true });
  }
  b.close();
  checks[tag] = r; console.log(tag, JSON.stringify(r));
}
await run(1440); await run(390); await run(1440, { rm: true }); await run(390, { rm: true });
writeFileSync(`${out}/checks.json`, JSON.stringify({ url, live: LIVE, at: new Date().toISOString(), checks }, null, 2));
