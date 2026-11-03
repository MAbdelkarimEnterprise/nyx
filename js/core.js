'use strict';
gsap.registerPlugin(ScrollTrigger);
// Palette for canvas drawing, read from the CSS tokens (no colors defined in JS).
const nyxColor = (name, a = 1) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseInt(v.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
const nyxHex = (name) => parseInt(getComputedStyle(document.documentElement).getPropertyValue(name).trim().slice(1), 16);
const _touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const _pRM   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
// One switch for every ticker, clock and feed: reduced motion or the Pause button.
const nyxPaused = () => _pRM || document.documentElement.classList.contains('motion-paused');
// Reduced motion: GSAP tweens finish instantly, so content is never left hidden.
if (_pRM) gsap.globalTimeline.timeScale(100);

/* ── LOOP HELPER ────────────────────────────────────────
   Runs step() every frame only while el is near the viewport and the tab is
   visible. Under reduced motion it draws a single frame. */
function nyxLoop(el, step){
  if (!el) return;
  if (_pRM) { requestAnimationFrame(step); return; }
  let on = false, raf = 0;
  const run = () => { if (!on || document.hidden) { raf = 0; return; } step(); raf = requestAnimationFrame(run); };
  new IntersectionObserver(es => { on = es.some(e => e.isIntersecting); if (on && !raf) run(); }, { rootMargin:'200px' }).observe(el);
  document.addEventListener('visibilitychange', () => { if (on && !raf) run(); });
}

/* ── GRAIN TEXTURE ──────────────────────────────────── */
(function(){
  const S  = 200;
  const el = document.getElementById('grain');
  const pRM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function makeGrain(alpha){
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for(let i = 0; i < img.data.length; i += 4){
      const v = Math.random() * 255 | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = alpha;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  el.style.backgroundImage = `url(${makeGrain(18)})`;
})();
/* ── LIVE CLOCK ─────────────────────────────────────── */
(function(){
  const T0 = Date.now();
  function pad(n){ return String(n).padStart(2,'0'); }
  function tick(){
    const d = new Date();
    const utc = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    const date = `${d.getUTCFullYear()}.${pad(d.getUTCMonth()+1)}.${pad(d.getUTCDate())}`;
    const lc = document.getElementById('loader-clock');
    const ht = document.getElementById('hero-time');
    const st = document.getElementById('stat-time');
    const hd = document.getElementById('hero-date');
    if(lc) lc.textContent = utc + ' UTC';
    if(ht) ht.textContent = utc + ' UTC';
    if(st) st.textContent = utc;
    if(hd) hd.textContent = date;
    const hs = document.getElementById('hero-session');
    if(hs){ const t = Math.floor((Date.now() - T0)/1000); hs.textContent = `${pad(Math.floor(t/3600))}:${pad(Math.floor(t/60)%60)}:${pad(t%60)}`; }
  }
  tick(); setInterval(() => { if (!nyxPaused()) tick(); }, 1000);
})();
/* ── HERO SCAN LINE ─────────────────────────────────── */
function startScanLine(){
  const scan = document.querySelector('.hero-scan');
  const hero = document.getElementById('hero');
  if(!scan || !hero) return;
  (function loop(){
    const h = hero.offsetHeight;
    gsap.timeline({ onComplete: () => setTimeout(loop, 3200) })
      .set(scan,  { top:0, opacity:0 })
      .to(scan,   { opacity:0.5, duration:0.3, ease:'none' })
      .to(scan,   { top:h, duration:4.2, ease:'none' }, 0)
      .to(scan,   { opacity:0, duration:0.45 }, '-=0.5');
  })();
}

/* ── NAV SCROLL ─────────────────────────────────────── */
(function(){
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, {passive:true});
})();

/* ── HERO PARALLAX (multi-layer, scrub) ─────────────── */
(function(){
  if (_pRM) return;
  const tl = gsap.timeline({
    scrollTrigger:{
      trigger:'#hero', start:'top top', end:'bottom top', scrub:true
    }
  });
  tl.to('#hero-canvas',  { y:120, ease:'none' }, 0)
    .to('.hero-glow',    { y:90,  ease:'none' }, 0)
    .to('.hero-grid',    { y:60,  ease:'none' }, 0)
    .to('.hero-content', { y:-140, opacity:0,  ease:'none' }, 0)
    .to('.hero-hud',     { y:50,  opacity:0,   ease:'none' }, 0)
    .to('.hero-status',  { y:-40, opacity:0,   ease:'none' }, 0)
    .to('.hero-access',  { y:-40, opacity:0,   ease:'none' }, 0)
    .to('.hero-coords',  { y:40,  opacity:0,   ease:'none' }, 0)
    .to('.hero-scroll',  { y:30,  opacity:0,   ease:'none' }, 0)
    .to('#hero-intel-panel', { y:30, opacity:0, ease:'none' }, 0);
})();

/* ── MISSION LOGS ACCORDION ─────────────────────────── */
(function(){
  const list = document.getElementById('missions-list');
  if(!list) return;
  list.querySelectorAll('.mission-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const mission = bar.closest('.mission');
      const isOpen = mission.classList.contains('open');
      list.querySelectorAll('.mission.open').forEach(m => {
        m.classList.remove('open');
        m.querySelector('.mission-bar')?.setAttribute('aria-expanded','false');
      });
      if(!isOpen){
        mission.classList.add('open');
        bar.setAttribute('aria-expanded','true');
      }
    });
  });
})();

/* ── GSAP SCROLL REVEALS ────────────────────────────── */
(function(){
  // Section labels
  gsap.utils.toArray('.sec-label').forEach(el => {
    gsap.fromTo(el,
      { opacity:0, x:-20 },
      { opacity:1, x:0, duration:0.8, ease:'power3.out',
        scrollTrigger:{ trigger:el, start:'top 80%' }
      }
    );
  });

  // Manifesto headline — clip-path wipe reveal
  gsap.to('.manifesto-headline', {
    clipPath:'inset(0 0 0% 0)', duration:1.2, ease:'power4.out',
    scrollTrigger:{ trigger:'.manifesto-headline', start:'top 78%' }
  });

  // Manifesto body
  gsap.fromTo('.manifesto-body',
    { opacity:0, y:30 },
    { opacity:1, y:0, duration:0.9, ease:'power3.out',
      scrollTrigger:{ trigger:'.manifesto-body', start:'top 78%' }
    }
  );

  // Orrery
  gsap.to('.orrery-wrap', {
    opacity:0.88, duration:1.4, ease:'power2.out',
    scrollTrigger:{ trigger:'.orrery-wrap', start:'top 80%' }
  });

  // System headline — clip-path wipe
  gsap.to('.system-headline', {
    clipPath:'inset(0 0 0% 0)', duration:1.1, ease:'power4.out',
    scrollTrigger:{ trigger:'.system-headline', start:'top 78%' }
  });

  // Pillars — clip-path stagger reveal
  gsap.to('.pillar', {
    clipPath:'inset(0% 0% 0% 0%)',
    duration:1.1, stagger:0.13, ease:'power3.inOut',
    scrollTrigger:{ trigger:'.pillars', start:'top 68%' }
  });

  // Pillar inner content
  gsap.fromTo('.pillar-title, .pillar-desc, .pillar-num, .pillar-icon',
    { opacity:0, y:16 },
    { opacity:1, y:0, duration:0.7, stagger:0.05,
      scrollTrigger:{ trigger:'.pillars', start:'top 60%' }
    }
  );

  // Pillar progress bars
  const barWidths = ['68%','83%','76%','91%'];
  ScrollTrigger.create({
    trigger:'.pillars', start:'top 58%', once:true,
    onEnter:() => {
      document.querySelectorAll('.pillar-bar-fill').forEach((bar,i) => {
        gsap.to(bar, {
          width: barWidths[i] || '75%',
          duration:1.6, ease:'power3.out', delay:0.18 + i*0.18
        });
      });
    }
  });

  // Agent network headline — clip-path wipe
  gsap.to('.agents-headline', {
    clipPath:'inset(0 0 0% 0)', duration:1.1, ease:'power4.out',
    scrollTrigger:{ trigger:'.agents-headline', start:'top 78%' }
  });

  // Agent cards stagger
  gsap.fromTo('.agent-card',
    { opacity:0, y:24 },
    { opacity:1, y:0, stagger:0.1, duration:0.8, ease:'power3.out',
      scrollTrigger:{ trigger:'.agents-grid', start:'top 72%' }
    }
  );

  // Access headline — clip-path wipe
  gsap.to('.access-headline', {
    clipPath:'inset(0 0 0% 0)', duration:1.1, ease:'power4.out',
    scrollTrigger:{ trigger:'.access-headline', start:'top 78%' }
  });
  gsap.fromTo('.access-sub',
    { opacity:0, y:24 },
    { opacity:1, y:0, duration:0.8, ease:'power3.out',
      scrollTrigger:{ trigger:'.access-sub', start:'top 80%' }
    }
  );

  // Tier rows
  gsap.fromTo('.tier-row',
    { opacity:0, y:20 },
    { opacity:1, y:0, stagger:0.1, duration:0.8, ease:'power3.out',
      scrollTrigger:{ trigger:'.tiers-list', start:'top 75%' }
    }
  );

  // Intel stats
  gsap.fromTo('.intel-stat',
    { opacity:0, y:30 },
    { opacity:1, y:0, stagger:0.1, duration:0.9, ease:'power3.out',
      scrollTrigger:{ trigger:'.intel', start:'top 75%' }
    }
  );

  // Waitlist — single fromTo, includes rule
  gsap.fromTo(
    ['.waitlist-rule','.waitlist-eyebrow','.waitlist-headline','.waitlist-sub','.waitlist-form'],
    { opacity:0, y:44 },
    { opacity:1, y:0, stagger:0.14, duration:1.1, ease:'power3.out',
      scrollTrigger:{ trigger:'.waitlist', start:'top 70%' }
    }
  );

  // Footer
  gsap.fromTo('.footer-logo, .footer-copy, .footer-status',
    { opacity:0, y:14 },
    { opacity:1, y:0, stagger:0.1, duration:0.7, ease:'power3.out',
      scrollTrigger:{ trigger:'footer', start:'top 94%' }
    }
  );
})();

/* ── CINEMATIC BOOT SEQUENCE ────────────────────────── */
(function(){
  const log = document.getElementById('loader-init-log');
  if (!log) return;
  const lines = [
    ['NEURAL TOPOLOGY', 'LOADED'],
    ['AGENT NETWORK [08]', 'SYNCHRONIZED'],
    ['MEMORY LAYER', 'ACTIVE'],
    ['INFERENCE ENGINE', 'RUNNING'],
    ['ALFRED ONLINE', 'STANDING BY'],
  ];
  lines.forEach(([label, status], i) => {
    const el = document.createElement('div');
    el.className = 'loader-init-line';
    el.innerHTML = `<span>${label.padEnd(26,'.')}</span><span class="loader-init-ok">[${status}]</span>`;
    log.appendChild(el);
    setTimeout(() => el.classList.add('show'), 80 + i * 110);
  });
})();

/* ── TELEMETRY BAR ──────────────────────────────────── */
(function(){
  const tbar = document.getElementById('tbar');
  const ticker = document.getElementById('tbar-ticker');
  const timeEl = document.getElementById('tbar-time');
  if (!tbar || !ticker) return;

  const events = [
    'APEX — Re-routed 3 workflows — 14 min ago',
    'ORACLE — Detected competitor pricing shift in SaaS vertical — 22 min ago',
    'CONVERT — High-value lead pattern identified: Series A founders — 41 min ago',
    'SIGNAL — Content distribution window optimized — 58 min ago',
    'LEDGER — Q2 burn variance flagged — 1.1 hrs ago',
    'CIPHER — Access anomaly resolved — 1.4 hrs ago',
    'MERIDIAN — Operational bottleneck cleared: onboarding flow — 2.1 hrs ago',
    'FORGE — Stack health nominal — 2.8 hrs ago',
    'APEX — Morning briefing delivered — 6 hrs ago',
    'ORACLE — 14 competitive signals processed overnight — 8 hrs ago',
    'CONVERT — Pipeline scored and prioritized — 9 hrs ago',
    'SIGNAL — Weekly content calendar finalized — 10 hrs ago',
  ];

  ticker.textContent = events.join('   ·   ') + '   ·   ';

  // Sync UTC clock
  function tick(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    if (timeEl) timeEl.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  tick(); setInterval(() => { if (!nyxPaused()) tick(); }, 1000);

  // Show after loader exits
  setTimeout(() => tbar.classList.add('show'), 3200);
})();
/* ── COUNTER ANIMATION ──────────────────────────────── */
(function(){
  function countTo(el, target, suffix, dur){
    gsap.to({v:0}, {
      v: target, duration: dur, ease:'power2.out',
      onUpdate: function(){ el.textContent = Math.round(this.targets()[0].v).toLocaleString() + (suffix||''); }
    });
  }

  ScrollTrigger.create({
    trigger: '.intel',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      const enrolled = document.getElementById('stat-enrolled');
      const signals  = document.getElementById('stat-signals');
      if(enrolled) countTo(enrolled, 1247, '', 2.5);
      if(signals){
        countTo(signals, 14200000, '', 2.5);
        setTimeout(() => { signals.textContent = '14.2M'; }, 2600);
      }
    }
  });
})();
/* ── MAGNETIC BUTTONS ───────────────────────────────── */
(function(){
  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top  - r.height/2;
      gsap.to(btn, { x:x*0.38, y:y*0.38, duration:0.35, ease:'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x:0, y:0, duration:0.7, ease:'elastic.out(1,0.4)' });
    });
  });
})();

/* ── TIER ACCORDION ─────────────────────────────────── */
(function(){
  const headers = document.querySelectorAll('.tier-header');
  headers.forEach(h => {
    h.setAttribute('role','button');
    h.setAttribute('tabindex','0');
    h.setAttribute('aria-expanded','false');
  });

  function toggleTier(header){
    const row   = header.closest('.tier-row');
    const body  = row.querySelector('.tier-body');
    const inner = body.querySelector('.tier-body-inner');
    const isOpen = row.classList.contains('open');

    document.querySelectorAll('.tier-row.open').forEach(r => {
      r.classList.remove('open');
      r.querySelector('.tier-header').setAttribute('aria-expanded','false');
      gsap.to(r.querySelector('.tier-body'), { height:0, duration:0.4, ease:'power3.inOut' });
    });

    if(!isOpen){
      row.classList.add('open');
      header.setAttribute('aria-expanded','true');
      gsap.fromTo(body, { height:0 }, { height:inner.scrollHeight, duration:0.55, ease:'power3.inOut' });
    }
  }

  headers.forEach(header => {
    header.addEventListener('click', () => toggleTier(header));
    header.addEventListener('keydown', e => {
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleTier(header); }
    });
  });
})();

/* ── BOOT + HERO REVEAL ─────────────────────────────────
   First visit only: ≤1.2 s, skippable with any click, tap or key. Return visits
   (7 days) and reduced motion skip it (class set by the inline head script).
   The hero is visible in CSS; the reveal only replays it under the loader. */
(function(){
  const loader = document.getElementById('loader');
  const heroCanvas = document.getElementById('hero-canvas');
  function settle(){
    if (loader) loader.style.display = 'none';
    if (heroCanvas) heroCanvas.classList.add('show');
    startScanLine();
  }
  // If the CSS fallback already cleared the loader before this script ran, don't replay the hero.
  if (!loader || document.documentElement.classList.contains('no-boot') || getComputedStyle(loader).visibility === 'hidden') { settle(); return; }

  const reveal = gsap.timeline({ paused:true })
    .fromTo('.hero-eyebrow', { opacity:0, y:14 }, { opacity:1, y:0, duration:0.6, ease:'power3.out' }, 0)
    // Title and statement move but never fade: hidden text would hold back LCP.
    .fromTo('.hero-char', { y:'40%' }, { y:'0%', stagger:{ amount:0.24 }, duration:1.1, ease:'expo.out' }, 0.08)
    .fromTo('.hero-rule', { scaleX:0 }, { scaleX:1, duration:0.6, ease:'power3.out' }, 0.5)
    .fromTo('.hero-statement', { y:16 }, { y:0, duration:0.7, ease:'power3.out' }, 0.55)
    .fromTo('.hero-cta', { opacity:0, y:16 }, { opacity:1, y:0, duration:0.7, ease:'power3.out' }, 0.65)
    .fromTo(['.hero-status','.hero-access','.hero-coords','.hero-scroll','#hero-intel-panel'], { opacity:0 }, { opacity:1, stagger:0.06, duration:0.5 }, 0.7);

  const bar = document.getElementById('loader-bar');
  const pct = document.getElementById('loader-pct');
  const boot = gsap.timeline({ onComplete: finish })
    .to('#loader-logo', { scale:1, duration:0.5, ease:'power3.out' }, 0)
    .to('#loader-sub', { opacity:1, duration:0.4 }, 0.1)
    .to(bar, { scaleX:1, duration:0.55, ease:'power2.inOut',
      onUpdate(){ if (pct) pct.textContent = Math.round(this.progress() * 100) + '%'; } }, 0)
    .to(loader, { opacity:0, duration:0.25, ease:'power2.inOut' }, 0.55);

  const EVENTS = ['pointerdown', 'keydown', 'touchstart'];
  function skip(){ boot.progress(1); }
  EVENTS.forEach(e => window.addEventListener(e, skip, { passive:true }));
  function finish(){
    EVENTS.forEach(e => window.removeEventListener(e, skip));
    settle();
    reveal.play();
    document.getElementById('hero-intel-panel')?.classList.add('reveal');
  }
})();

/* NYX hero emblem crest — luxury intelligence seal */
(function(){
  var el=document.getElementById('nyx-crest'); if(!el) return;
  var C=400, G='30,91,255', s='';
  for(var i=0;i<72;i++){var a=i*5*Math.PI/180,lng=(i%6===0),r1=lng?348:356,r2=372;
    s+='<line x1="'+(C+r1*Math.cos(a)).toFixed(1)+'" y1="'+(C+r1*Math.sin(a)).toFixed(1)+'" x2="'+(C+r2*Math.cos(a)).toFixed(1)+'" y2="'+(C+r2*Math.sin(a)).toFixed(1)+'" stroke="rgba('+G+','+(lng?0.55:0.28)+')" stroke-width="'+(lng?1.4:0.8)+'"/>';}
  var star='',tips=[];
  for(var j=0;j<8;j++){var b=(j*45-90)*Math.PI/180,r=j%2===0?140:120,x=C+r*Math.cos(b),y=C+r*Math.sin(b);tips.push([x,y]);
    star+='<line x1="'+C+'" y1="'+C+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="rgba('+G+',0.32)" stroke-width="0.9"/>';
    star+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(j%2===0?3.2:2)+'" fill="rgba('+G+',0.7)"/>';}
  var out='M';tips.forEach(function(t,i){out+=(i?'L':'')+t[0].toFixed(1)+','+t[1].toFixed(1)+' ';});out+='Z';
  var cross='';[[0,-1],[1,0],[0,1],[-1,0]].forEach(function(d){cross+='<line x1="'+(C+d[0]*200)+'" y1="'+(C+d[1]*200)+'" x2="'+(C+d[0]*238)+'" y2="'+(C+d[1]*238)+'" stroke="rgba('+G+',0.4)" stroke-width="1"/>';});
  el.innerHTML='<svg viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
    +'<defs><path id="nyxCirc" d="M '+C+','+C+' m -322,0 a 322,322 0 1,1 644,0 a 322,322 0 1,1 -644,0"/></defs>'
    +'<g class="nyx-rot-cw">'+s+'<circle cx="'+C+'" cy="'+C+'" r="372" fill="none" stroke="rgba('+G+',0.18)" stroke-width="0.8"/></g>'
    +'<g class="nyx-rot-ccw"><text font-family="Inter,sans-serif" font-size="13" letter-spacing="6" fill="rgba('+G+',0.5)"><textPath href="#nyxCirc" startOffset="0%">AUTONOMOUS · INTELLIGENCE · SYSTEM · NYX · MMXXVI · WHAT OPERATES IN THE DARK · </textPath></text></g>'
    +'<circle cx="'+C+'" cy="'+C+'" r="300" fill="none" stroke="rgba('+G+',0.13)" stroke-width="0.8"/>'
    +'<circle cx="'+C+'" cy="'+C+'" r="238" fill="none" stroke="rgba('+G+',0.22)" stroke-width="0.8" stroke-dasharray="2 7"/>'
    +cross
    +'<g class="nyx-rot-cw-slow">'+star+'<path d="'+out+'" fill="none" stroke="rgba('+G+',0.18)" stroke-width="0.8"/></g>'
    +'<circle cx="'+C+'" cy="'+C+'" r="64" fill="none" stroke="rgba('+G+',0.3)" stroke-width="0.8"/>'
    +'<circle cx="'+C+'" cy="'+C+'" r="2.4" fill="rgba('+G+',0.85)"/></svg>';
})();

/* ── MOTION TOGGLE ──────────────────────────────────────
   Pauses tickers, clocks, the feed and SVG motion. Remembered per visitor. */
(function(){
  const btn = document.getElementById('motion-toggle');
  let paused = false;
  try { paused = localStorage.getItem('nyx_motion') === 'paused'; } catch(e) {}
  function apply(v){
    paused = v;
    document.documentElement.classList.toggle('motion-paused', v);
    if (btn) { btn.setAttribute('aria-pressed', v ? 'true' : 'false'); btn.textContent = v ? 'Play' : 'Pause'; }
    document.querySelectorAll('svg').forEach(svg => { try { (v || _pRM) ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch(e) {} });
    try { localStorage.setItem('nyx_motion', v ? 'paused' : ''); } catch(e) {}
  }
  apply(paused);
  if (btn) btn.addEventListener('click', () => apply(!paused));
})();

/* ── RAIL ───────────────────────────────────────────────
   Marks the section in view and fills with scroll progress. */
(function(){
  const rail = document.getElementById('rail');
  if (!rail) return;
  const links = [...rail.querySelectorAll('.rail-list a')];
  const byId = new Map(links.map(a => [a.hash.slice(1), a]));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.removeAttribute('aria-current'));
    const a = byId.get(e.target.id);
    if (a) a.setAttribute('aria-current', 'location');
  }), { rootMargin: '-45% 0px -50% 0px' });
  byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  let ticking = false;
  const fill = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    rail.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(fill); } }, { passive: true });
  fill();
})();

/* ── HERO MOONGLOW ── one soft light that follows a fine pointer, slowly. */
(function(){
  const hero = document.getElementById('hero');
  if (!hero || _pRM || !matchMedia('(pointer:fine)').matches) return;
  let tx = 50, ty = 42, x = 50, y = 42, raf = 0;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width * 100; ty = (e.clientY - r.top) / r.height * 100;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive:true });
  function step(){
    x += (tx - x) * 0.06; y += (ty - y) * 0.06;
    hero.style.setProperty('--mx', x.toFixed(2) + '%'); hero.style.setProperty('--my', y.toFixed(2) + '%');
    raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.1 && !nyxPaused()) ? requestAnimationFrame(step) : 0;
  }
})();

/* ── AGENT HUB ── focus/hover shows an agent's link to APEX and its detail;
   one pulse travels one line every few seconds, never two at once. */
(function(){
  const hub = document.getElementById('hub');
  if (!hub) return;
  const nameEl = hub.querySelector('.n-hub-detail-name');
  const descEl = hub.querySelector('.n-hub-detail-desc');
  const btns = [...hub.querySelectorAll('.n-node-btn')];
  function show(btn){
    const k = btn.dataset.agent;
    hub.dataset.active = k;
    hub.querySelectorAll('.n-link').forEach(l => l.classList.toggle('is-on', k === 'apex' || l.dataset.agent === k));
    btns.forEach(b => b.classList.toggle('is-on', b === btn));
    nameEl.textContent = btn.querySelector('.n-node-name').textContent + ' · ' + btn.querySelector('.n-node-role').textContent;
    descEl.textContent = document.getElementById('desc-' + k).textContent;
  }
  btns.forEach(b => { b.addEventListener('mouseenter', () => show(b)); b.addEventListener('focus', () => show(b)); b.addEventListener('click', () => show(b)); });
  show(btns[0]);

  const pulses = [...hub.querySelectorAll('.n-pulse')];
  if (_pRM || !pulses.length || !pulses[0].animate) return;
  let visible = false, timer = 0, last = -1;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !timer) schedule(); }).observe(hub);
  function schedule(){ timer = setTimeout(fire, 3500); }
  function fire(){
    timer = 0;
    if (!visible || document.hidden || nyxPaused()) { if (visible) schedule(); return; }
    let i; do { i = Math.floor(Math.random() * pulses.length); } while (i === last && pulses.length > 1);
    last = i;
    const p = pulses[i], out = Math.random() < 0.5;
    p.animate([{ strokeDashoffset: out ? 100 : 0, opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { strokeDashoffset: out ? 0 : 100, opacity: 0 }],
              { duration: 1400, easing: 'linear' });
    schedule();
  }
})();
