'use strict';
// Palette for canvas drawing, read from the CSS tokens (no colors defined in JS).
const nyxColor = (name, a = 1) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseInt(v.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};
const nyxHex = (name) => parseInt(getComputedStyle(document.documentElement).getPropertyValue(name).trim().slice(1), 16);
const _touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const _pRM   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
// One switch for the remaining motion: reduced motion or the Pause button.
const nyxPaused = () => _pRM || document.documentElement.classList.contains('motion-paused');

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

/* ── BOOT → HERO (signature moment 1) ───────────────────
   CSS runs the boot (≤1 s) and the hero arrival. JS only lets a click, tap or
   key skip it, and shows the night field once the hero is in view. */
(function(){
  const root = document.documentElement;
  const loader = document.getElementById('loader');
  const canvas = document.getElementById('hero-canvas');
  const settle = () => { root.classList.add('booted'); if (canvas) canvas.classList.add('show'); };
  if (!loader || root.classList.contains('no-boot') || getComputedStyle(loader).visibility === 'hidden') { settle(); return; }
  const EVENTS = ['pointerdown', 'keydown', 'touchstart'];
  const skip = () => { root.classList.add('boot-skipped'); done(); };
  const done = () => { EVENTS.forEach(e => removeEventListener(e, skip)); settle(); };
  EVENTS.forEach(e => addEventListener(e, skip, { passive:true }));
  setTimeout(done, 1000);
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


/* ── CLOCK (rail readout + boot readout) ── */
(function(){
  const pad = n => String(n).padStart(2,'0');
  const els = [document.getElementById('rail-time'), document.getElementById('loader-clock')].filter(Boolean);
  function tick(){
    const d = new Date();
    const t = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    els.forEach(el => el.textContent = el.id === 'loader-clock' ? t + ' UTC' : t);
  }
  tick(); setInterval(() => { if (!nyxPaused()) tick(); }, 1000);
})();

/* ── NAV: hides on the way down, returns on the way up ── */
(function(){
  const nav = document.getElementById('nav');
  if (!nav) return;
  let lastY = scrollY, ticking = false;
  function update(){
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    if (!nav.contains(document.activeElement)) nav.classList.toggle('is-hidden', y > 120 && y > lastY);
    lastY = y;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive:true });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
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


/* ── MOTION TOGGLE (in the rail) ─────────────────────────
   Pauses the night field, the agent pulses and the clocks. Remembered. */
(function(){
  const btn = document.getElementById('motion-toggle');
  let paused = false;
  try { paused = localStorage.getItem('nyx_motion') === 'paused'; } catch(e) {}
  function apply(v){
    paused = v;
    document.documentElement.classList.toggle('motion-paused', v);
    if (btn) { btn.setAttribute('aria-pressed', v ? 'true' : 'false'); btn.textContent = v ? 'Play motion' : 'Pause motion'; }
    try { localStorage.setItem('nyx_motion', v ? 'paused' : ''); } catch(e) {}
  }
  apply(paused);
  if (btn) btn.addEventListener('click', () => apply(!paused));
  if (btn && _pRM) btn.hidden = true;           // nothing moves, nothing to pause
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
