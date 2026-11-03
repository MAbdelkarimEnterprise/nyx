// One section at 1440 and 390 for the build loop. Usage: node design-review/look.mjs <selector> <out-prefix> [wait-ms] [offset-px]
import { writeFileSync } from 'node:fs';
import { launch, sleep } from '../design-research/cdp.mjs';
const [sel = '#hero', out = 'look', wait = '4500', off = '0'] = process.argv.slice(2);
const b = await launch(['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
for (const w of [1440, 390]) {
  await b.viewport(w); await b.send('Page.navigate', { url: 'http://127.0.0.1:8765/' }); await sleep(800);
  await b.evalJs("localStorage.setItem('nyx_seen', Date.now()); true");
  await b.send('Page.navigate', { url: 'http://127.0.0.1:8765/' }); await sleep(1500);
  await b.evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});scrollTo({top:e.getBoundingClientRect().top+scrollY+${+off},behavior:'instant'});return 1})()`);
  await sleep(+wait);
  writeFileSync(`${out}-${w}.jpg`, Buffer.from((await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })).result.data, 'base64'));
}
console.log(await b.evalJs("JSON.stringify({field:document.getElementById('night-field')?.className, err:window.__err||null})"));
b.close();
