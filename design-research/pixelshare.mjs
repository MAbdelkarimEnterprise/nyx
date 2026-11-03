// 90/8/2 audit: share of blue (system) and pink (command) pixels per section at rest.
// Usage: node design-research/pixelshare.mjs <url> <label>  → design-research/pixels/<label>.json + PNGs
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';

const [url = 'http://127.0.0.1:8765/', label = 'rest'] = process.argv.slice(2);
const SECTIONS = [['hero', '#hero'], ['system', '#about'], ['engine', '#engine'], ['agents', '#agents'], ['alfred', '#alfred'],
  ['how', '#system'], ['options', '#access'], ['outcomes', '#outcomes'], ['missions', '#mission-logs'], ['architect', '#architect'],
  ['access', '#waitlist'], ['footer', 'footer']];
const dir = new URL(`./pixels/${label}/`, import.meta.url); mkdirSync(dir, { recursive: true });

// Classifies each pixel by OKLCH hue: chroma ≥ 0.05 and hue 225–295° = blue, hue ≥ 320° or ≤ 20° = pink.
const COUNT = (b64) => `(async()=>{const i=new Image();i.src='data:image/png;base64,${b64}';await i.decode();
const c=new OffscreenCanvas(i.width,i.height),x=c.getContext('2d');x.drawImage(i,0,0);const d=x.getImageData(0,0,i.width,i.height).data;
const L=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4};let bl=0,pk=0,n=d.length/4;
for(let k=0;k<d.length;k+=4){const r=L(d[k]),g=L(d[k+1]),b=L(d[k+2]);
const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
const A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;if(Math.hypot(A,B)<0.05)continue;
const h=(Math.atan2(B,A)*180/Math.PI+360)%360;if(h>=225&&h<=295)bl++;else if(h>=320||h<=20)pk++}
return {blue:+(100*bl/n).toFixed(2),pink:+(100*pk/n).toFixed(2)}})()`;

const out = { url, at: new Date().toISOString(), rule: 'bold pass: blue is the main color on every screen; pink ~10–15% of the color presence', screens: {} };
const b = await launch(['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
for (const width of [1440, 390]) {
  await b.viewport(width);
  await b.send('Page.navigate', { url }); await sleep(1200);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url }); await sleep(2500);
  for (const [name, sel] of SECTIONS) {
    const y = await b.evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});return e?Math.round(e.getBoundingClientRect().top+scrollY):null})()`);
    if (y == null) continue;
    await b.evalJs(`(async()=>{scrollTo(0,${y});await new Promise(r=>setTimeout(r,900));return 1})()`);
    const png = (await b.send('Page.captureScreenshot', { format: 'png' })).result.data;
    writeFileSync(new URL(`${name}-${width}.png`, dir), Buffer.from(png, 'base64'));
    out.screens[`${name}-${width}`] = await b.evalJs(COUNT(png));
  }
}
b.close();
const worst = Object.entries(out.screens).sort((a, c) => c[1].pink - a[1].pink)[0];
out.maxPink = { screen: worst[0], ...worst[1] };
const sum = (k) => Object.values(out.screens).reduce((a, v) => a + v[k], 0);
out.pinkShareOfColor = +(100 * sum('pink') / (sum('pink') + sum('blue'))).toFixed(1);
writeFileSync(new URL(`../${label}.json`, dir), JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out.screens)) console.log(k.padEnd(16), 'blue', String(v.blue).padStart(6), ' pink', v.pink);
console.log('max pink', out.maxPink, 'pink share of colour', out.pinkShareOfColor + '%');
