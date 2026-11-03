// Pink-follows-the-visitor checks outside the hub: hero glow, chosen tier, access progress, Alfred message.
// Usage: node design-research/propagate.mjs <url> <out-dir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';
const [url = 'http://127.0.0.1:8765/', out = 'design-research/propagate'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await launch(); await b.viewport(1440);
await b.send('Page.navigate', { url }); await sleep(1200);
await b.evalJs("localStorage.clear(); localStorage.setItem('nyx_seen', Date.now()); true");
await b.send('Page.navigate', { url }); await sleep(2500);
const shot = async (n) => writeFileSync(`${out}/${n}.png`, Buffer.from((await b.send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
const center = (sel) => b.evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`);
const move = (x, y) => b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const click = async (sel) => { const [x, y] = await center(sel); await move(x, y); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
const r = {};
// Hero: glow off at rest and over empty space; on while moving over a button; off again 0.7 s after stopping.
await b.evalJs('scrollTo(0,0);1'); await move(200, 600); await sleep(300);
r.heroRestGlow = await b.evalJs("document.getElementById('hero').classList.contains('glow-on')");
const [hx, hy] = await center('#hero .hero-btn');
for (let k = 0; k < 8; k++) { await move(hx - 20 + k * 5, hy); await sleep(40); }
r.heroOverButtonGlow = await b.evalJs("document.getElementById('hero').classList.contains('glow-on')");
await shot('hero-glow'); await sleep(1100);
r.heroAfterStopGlow = await b.evalJs("document.getElementById('hero').classList.contains('glow-on')");
// Options: no card chosen at rest; clicking a card's Inquire marks it.
r.cardsChosenAtRest = await b.evalJs("document.querySelectorAll('.n-card.is-chosen').length");
await click('.n-card [data-inquire="Agents"]'); await sleep(900);
r.chosenCard = await b.evalJs("[...document.querySelectorAll('.n-card.is-chosen')].map(c=>c.querySelector('.n-card-name').textContent)");
await center('.n-cards'); await sleep(300); await shot('options-chosen');
// Access review: progress is empty before any answer and grows (pink) with each answer.
r.progressBefore = await b.evalJs("getComputedStyle(document.getElementById('n-progress-bar')).transform");
await b.evalJs("document.querySelector('#as-step-1 .assessment-option').click();1"); await sleep(900);
r.progressAfterOne = await b.evalJs("getComputedStyle(document.getElementById('n-progress-bar')).transform");
await shot('access-answered');
// Alfred: the visitor's words get a pink edge; the working state is blue.
await b.evalJs("document.querySelector('.ask-alfred').click();1"); await sleep(1500);
await b.evalJs("window.fetch=()=>new Promise(r=>setTimeout(()=>r(new Response(JSON.stringify({response:'Stubbed reply.'}),{status:200})),1400));1");
await b.evalJs("const i=document.getElementById('af-text-in');i.value='What does it cost?';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.getElementById('af-send')?.click();1");
await sleep(400);
r.alfredWorking = await b.evalJs("JSON.stringify({status:document.getElementById('af-status').textContent,work:document.getElementById('af-status').dataset.work,edge:getComputedStyle(document.getElementById('af-transcript')).borderLeftColor})");
await shot('alfred-working');
b.close();
writeFileSync(`${out}/checks.json`, JSON.stringify(r, null, 2)); console.log(r);
