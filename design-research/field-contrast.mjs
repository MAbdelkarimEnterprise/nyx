// Worst-case text contrast over the live shader. Glyphs are hidden (halos kept), the background is
// captured, and each visible text element's color is compared against the 95th-percentile brightest
// background pixel behind it. Usage: node design-research/field-contrast.mjs <url> → field-contrast.json
import { writeFileSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';
const url = process.argv[2] || 'http://127.0.0.1:8765/';
const SECTIONS = ['#hero', '#about', '#engine', '#agents', '#alfred', '#system', '#access', '#outcomes', '#mission-logs', '#architect', '#waitlist', 'footer'];
const HIDE = `(()=>{const s=document.createElement('style');s.id='__hide';s.textContent='html body *:not(#_a):not(#_b):not(#_c){color:transparent!important;-webkit-text-fill-color:transparent!important;caret-color:transparent!important}[data-__c]{background:none!important}';document.head.appendChild(s);return 1})()`;
const MEASURE = (b64) => `(async()=>{const img=new Image();img.src='data:image/png;base64,${b64}';await img.decode();
const cv=new OffscreenCanvas(img.width,img.height),x=cv.getContext('2d');x.drawImage(img,0,0);
const L=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4},Y=(r,g,b)=>0.2126*L(r)+0.7152*L(g)+0.0722*L(b);
const parse=c=>{const m=c.match(/[\\d.]+/g).map(Number);return m};
const out=[];const seen=new Set();
for(const el of document.querySelectorAll('body *')){
  if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')continue;
  const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity===0)continue;
  const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<=1||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  if(el.closest('[aria-hidden="true"]')&&!el.closest('#hero'))continue;
  const top=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,10));if(!top||!(el===top||el.contains(top)||top.contains(el)))continue;   // covered or clipped: not what the visitor sees
  const fill=cs.webkitTextFillColor&&!/rgba\\(0, 0, 0, 0\\)/.test(cs.webkitTextFillColor)?cs.webkitTextFillColor:el.dataset.__c;
  const col=parse(el.dataset.__c||cs.color);if(col[3]===0)continue;
  const bw=(parseFloat(cs.borderLeftWidth)||0)+2,bh=(parseFloat(cs.borderTopWidth)||0)+2;const x0=Math.max(0,(r.left+bw)|0),y0=Math.max(0,(r.top+bh)|0),w=Math.min(img.width-x0,(r.width-2*bw)|0),h=Math.min(img.height-y0,(r.height-2*bh)|0);if(w<1||h<1)continue;
  const d=x.getImageData(x0,y0,w,h).data;const ys=[];for(let i=0;i<d.length;i+=16)ys.push(Y(d[i],d[i+1],d[i+2]));ys.sort((a,b)=>a-b);
  const bg=ys[Math.floor(ys.length*0.95)];const fg=Y(col[0],col[1],col[2]);const ratio=(Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
  const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=size>=24||(size>=18.66&&bold);
  const key=el.tagName+el.className+el.textContent.trim().slice(0,30);if(seen.has(key))continue;seen.add(key);
  out.push({t:el.textContent.trim().slice(0,40),cls:String(el.className).slice(0,40),size,ratio:+ratio.toFixed(2),need:large?3:4.5,pass:ratio>=(large?3:4.5)});
}
return out})()`;
const res = {};
for (const w of [1440, 390]) {
  const b = await launch(['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
  await b.viewport(w); await b.send('Page.navigate', { url }); await sleep(800);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url }); await sleep(2000);
  for (const sel of SECTIONS) {
    await b.evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});scrollTo({top:e.getBoundingClientRect().top+scrollY,behavior:'instant'});return 1})()`);
    await sleep(2600);
    // Gradient-clipped text has no measurable color: record it via the gradient's first stop instead.
    await b.evalJs(`document.querySelectorAll('*').forEach(e=>{const c=getComputedStyle(e);if(/transparent|rgba\\(0, 0, 0, 0\\)/.test(c.webkitTextFillColor)&&c.backgroundImage.includes('gradient')){e.dataset.__c='rgb(146,183,255)';e.style.setProperty('background','none','important')}});1`);
    await b.evalJs(HIDE); await sleep(120);
    const png = (await b.send('Page.captureScreenshot', { format: 'png' })).result.data;
    await b.evalJs("document.getElementById('__hide').remove();1");
    res[`${sel}-${w}`] = await b.evalJs(MEASURE(png));
  }
  b.close();
}
const all = Object.entries(res).flatMap(([k, v]) => v.map((x) => ({ screen: k, ...x })));
const fails = all.filter((x) => !x.pass);
writeFileSync(new URL('./field-contrast.json', import.meta.url), JSON.stringify({ url, at: new Date().toISOString(), checked: all.length, fails }, null, 2));
console.log('checked', all.length, 'fails', fails.length);
fails.slice(0, 40).forEach((f) => console.log(f.screen, f.ratio, '<', f.need, f.size + 'px', JSON.stringify(f.t), f.cls));
