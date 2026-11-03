// Screen recording: the night field (cursor bend, click ripple, scroll) and the Agent Network command loop.
// Reply is a real recorded /api/agent reply (design-research/alfred-raw.json) at the measured latency.
// Usage: node design-review/record.mjs <url> <out-dir>   → bold-<width>.mp4
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { launch, sleep } from '../design-research/cdp.mjs';
const [url = 'http://127.0.0.1:8765/', out = 'design-review/bold'] = process.argv.slice(2);
const reply = JSON.parse(readFileSync(new URL('../design-research/alfred-raw.json', import.meta.url))).results.find((r) => r.agent === 'convert').response;
for (const width of [1440, 390]) {
  const b = await launch(process.env.HEADED ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  await b.viewport(width);
  await b.send('Page.navigate', { url }); await sleep(800);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url }); await sleep(3500);
  await b.evalJs(`window.fetch=(u,o)=>String(u).includes('/api/agent')?new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify({response:${JSON.stringify(reply)}}),{status:200})),1450)):fetch(u,o);1`);
  // Screencast: the compositor's own frames, far cheaper than repeated screenshots.
  const frames = []; let rec = true;
  b.on('Page.screencastFrame', (f) => { if (rec) frames.push({ t: f.metadata.timestamp * 1000, d: f.data }); b.send('Page.screencastFrameAck', { sessionId: f.sessionId }); });
  await b.send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: width, maxHeight: width < 768 ? 844 : 900, everyNthFrame: 1 });
  const move = (x, y) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  const tap = async (x, y) => { await move(x, y); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
  const W = width, H = width < 768 ? 844 : 900;
  // The field: the cursor drifts across the wordmark, then a click sends a ripple.
  for (let k = 0; k <= 30; k++) { await move(W * (0.2 + 0.6 * k / 30), H * (0.45 + 0.1 * Math.sin(k / 5))); await sleep(60); }
  await tap(W * 0.72, H * 0.3); await sleep(2200);
  await tap(W * 0.3, H * 0.7); await sleep(1800);
  // Scroll into the Agent Network.
  const y = await b.evalJs(`document.getElementById('hub').getBoundingClientRect().top+scrollY-${width < 768 ? 120 : 40}`);
  for (let k = 1; k <= 20; k++) { await b.evalJs(`scrollTo(0,${Math.round(y * k / 20)});1`); await sleep(50); }
  await sleep(1200);
  const pt = async (sel, i = 0) => b.evalJs(`(()=>{const e=document.querySelectorAll(${JSON.stringify(sel)})[${i}];e.scrollIntoView({block:'nearest',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
  const [cx, cy] = await pt('#hub .n-node-btn[data-agent="convert"]'); await move(cx, cy); await sleep(700); await tap(cx, cy); await sleep(900);
  const [px, py] = await pt('.n-cmd-preset'); await move(px, py); await sleep(400); await tap(px, py);
  await sleep(5200);
  rec = false; await b.send('Page.stopScreencast'); await sleep(300); b.close();
  const fd = `${out}/frames-${width}`; rmSync(fd, { recursive: true, force: true }); mkdirSync(fd, { recursive: true });
  let list = '';
  frames.forEach((f, i) => { const n = String(i).padStart(4, '0'); writeFileSync(`${fd}/${n}.jpg`, Buffer.from(f.d, 'base64')); list += `file '${n}.jpg'\nduration ${(((frames[i + 1]?.t ?? f.t + 80) - f.t) / 1000).toFixed(3)}\n`; });
  writeFileSync(`${fd}/list.txt`, list);
  const scale = width > 800 ? 1280 : 390;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${fd}/list.txt`, '-vf', `fps=24,scale=${scale}:-2:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '24', '-movflags', '+faststart', `${out}/bold-${width}.mp4`]);
  rmSync(fd, { recursive: true, force: true });
  console.log(width, frames.length, 'frames');
}
