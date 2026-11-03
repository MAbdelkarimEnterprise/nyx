// Motion budget: frame times + INP for the hero and Agent Network under 4x CPU throttle.
// Usage: node design-research/trace.mjs <url> <label>   → design-research/traces/<label>.json (+ raw .trace.json.gz)
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { launch, sleep } from './cdp.mjs';

const [url = 'https://nyxsystem.online/', label = 'baseline'] = process.argv.slice(2);
const dir = new URL('./traces/', import.meta.url); mkdirSync(dir, { recursive: true });

// In-page collectors: rAF intervals and Event Timing (INP = worst interaction duration).
const COLLECT = `(()=>{window.__f=[];let l=performance.now();(function t(n){__f.push(n-l);l=n;requestAnimationFrame(t)})(l);
window.__inp=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>e.interactionId&&__inp.push({n:e.name,d:e.duration,proc:+(e.processingEnd-e.processingStart).toFixed(1),delay:+(e.processingStart-e.startTime).toFixed(1),t:e.target?.className||''}))).observe({type:'event',durationThreshold:16,buffered:true});
window.__cls=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)__cls+=e.value})).observe({type:'layout-shift',buffered:true});return 1})()`;
const stats = (f) => {
  f = f.slice(2).filter((x) => x > 0).sort((a, b) => a - b);
  const mean = f.reduce((a, b) => a + b, 0) / f.length;
  return { frames: f.length, fps: +(1000 / mean).toFixed(1), p50: +f[Math.floor(f.length * 0.5)].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), max: +f.at(-1).toFixed(1), long: f.filter((x) => x > 25).length };
};

const result = { url, at: new Date().toISOString(), cpu: '4x', runs: {} };
for (const width of (process.env.WIDTHS || "1440,390").split(",").map(Number)) {
  const b = await launch();
  await b.viewport(width);
  await b.send('Page.navigate', { url });
  await sleep(1500);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const chunks = [];
  b.on('Tracing.dataCollected', (p) => chunks.push(...p.value));
  const done = new Promise((r) => b.on('Tracing.tracingComplete', r));
  await b.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,loading', transferMode: 'ReportEvents' });
  await b.send('Page.navigate', { url });
  await sleep(4000);
  await b.evalJs(COLLECT);
  await sleep(5000);
  const hero = stats(await b.evalJs('__f'));
  // Agent Network: scroll in, then hover/tap each agent like a visitor.
  await b.evalJs("document.querySelector('#agents').scrollIntoView();true");
  await sleep(1500);
  await b.evalJs('__f=[];true');
  const pts = await b.evalJs(`[...document.querySelectorAll('#agents [data-agent]')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}).filter(p=>p[1]>0&&p[1]<innerHeight)`) || [];
  for (const [x, y] of pts) {
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await sleep(250);
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(450);
  }
  await sleep(2000);
  const agents = stats(await b.evalJs('__f'));
  // Command loop (if present): one preset command, reply stubbed at the measured median latency.
  let loop = null;
  if (await b.evalJs("!!document.querySelector('.n-cmd-preset')")) {
    await b.evalJs(`window.fetch=()=>new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify({response:${JSON.stringify('x '.repeat(260))}}),{status:200})),1450));__f=[];1`);
    const p = await b.evalJs("(()=>{const e=document.querySelector('.n-cmd-preset');e.scrollIntoView({block:'nearest',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()");
    await sleep(500); await b.evalJs('__f=[];1');
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p[0], y: p[1], button: 'left', clickCount: 1 });
    await sleep(3500);
    loop = { ...stats(await b.evalJs('__f')), state: await b.evalJs("document.getElementById('n-cmd').dataset.state") };
  }
  const inp = await b.evalJs('__inp');
  const cls = await b.evalJs('__cls');
  await b.send('Tracing.end');
  await done;
  writeFileSync(new URL(`${label}-${width}.trace.json.gz`, dir), gzipSync(JSON.stringify({ traceEvents: chunks })));
  result.runs[width] = { hero, agents, loop, interactions: pts.length, inp_ms: Math.max(0, ...inp.map((e) => e.d)), slow_events: inp.length, worst: inp.sort((a, c) => c.d - a.d).slice(0, 3), cls: +cls.toFixed(4) };
  console.log(width, JSON.stringify(result.runs[width]));
  b.close();
}
writeFileSync(new URL(`${label}.json`, dir), JSON.stringify(result, null, 2));
