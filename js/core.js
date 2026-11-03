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

/* ── HERO: WORDMARK LIGHT ── the cursor pulls a light across the NYX letters.
   (The restored crest seal is static SVG in index.html, drawn in currentColor.) */
(function(){
  const title = document.querySelector('.n-hero .hero-title');
  if (!title || _pRM || !matchMedia('(pointer:fine)').matches) return;
  let tx = 50, ty = 50, x = 50, y = 50, raf = 0;
  addEventListener('pointermove', e => {
    const r = title.getBoundingClientRect();
    if (r.bottom < 0) return;
    tx = (e.clientX - r.left) / r.width * 100; ty = (e.clientY - r.top) / r.height * 100;
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive:true });
  function step(){
    x += (tx - x) * 0.08; y += (ty - y) * 0.08;
    title.style.setProperty('--lx', x.toFixed(1) + '%'); title.style.setProperty('--ly', y.toFixed(1) + '%');
    raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.2 && !nyxPaused()) ? requestAnimationFrame(step) : 0;
  }
})();

/* ── AGENT NETWORK: COMMAND LOOP (signature) ─────────────
   Blue is the system, pink is you. At rest the network pulses on its own.
   Hover/focus previews an agent; click/Enter selects it; a preset or typed
   command sends a pink pulse to APEX, APEX routes it in blue, and a real
   /api/agent reply is revealed. States live on #n-cmd[data-state]:
   rest → sent → routing → reveal → done | limited | error | offline.
   Reduced motion (or Pause): no pulses or travel, same states and text. */
(function(){
  const hub = document.getElementById('hub');
  const cmd = document.getElementById('n-cmd');
  if (!hub || !cmd) return;
  const $ = s => cmd.querySelector(s);
  const btns = [...hub.querySelectorAll('.n-node-btn')];
  const links = [...hub.querySelectorAll('.n-link')];
  const pulses = new Map([...hub.querySelectorAll('.n-pulse')].map(p => [p.dataset.agent, p]));
  const dot = hub.querySelector('.n-cmd-dot');
  const live = document.getElementById('n-cmd-live');
  const presetsEl = $('.n-cmd-presets'), input = $('.n-cmd-input'), form = $('.n-cmd-form');
  const youEl = $('.n-cmd-you'), statusEl = $('.n-cmd-status'), textEl = $('.n-cmd-text'), descEl = $('.n-cmd-desc');
  const still = () => nyxPaused() || !dot.animate;
  const name = b => b.querySelector('.n-node-name').textContent;
  const role = b => b.querySelector('.n-node-role').textContent;
  const btnOf = k => btns.find(b => b.dataset.agent === k);

  // Questions each agent answers well. Asking an agent to *do* the work, or for general facts, gets a polite
  // refusal; asking how it would act does not (design-research/presets-*.json, live-tested).
  const PRESETS = {
    apex: ['How do you decide which agent handles a request?', 'What stays with me, and what do you run?', 'What does a founder usually hand off first?'],
    oracle: ['How would you watch my market without being asked?', 'What would you flag first for a new brand?', 'How would you tell noise from a real shift?'],
    signal: ['How would you plan a week of content?', 'How would you keep an audience from drifting?', "How would you keep an athlete's voice intact?"],
    convert: ['My deals leak between demo and close. What would you do?', 'What would you watch in my pipeline every morning?', 'How would you decide which lead comes first?'],
    ledger: ["How would you forecast cash once you're connected?", 'What would you flag before it becomes a cash problem?', 'How would you track burn across two businesses?'],
    meridian: ['How do you find a bottleneck?', 'How would you map a process end to end?', 'How would you run three locations as one?'],
    cipher: ['What do you watch while the rest of the system works?', 'What happens when someone leaves the team?', 'What would compliance tracking look like for me?'],
    forge: ['How would you know something broke before I do?', 'How would you keep the system healthy overnight?', 'What does a healthy system look like to you?'],
  };

  let selected = 'apex', busy = false, last = null;
  const say = t => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };
  const setState = s => { cmd.dataset.state = s; hub.dataset.cmd = s; };

  // Preview: light the agent and its line to APEX (hover, focus).
  function preview(k){
    hub.dataset.active = k;
    links.forEach(l => l.classList.toggle('is-on', k === 'apex' || l.dataset.agent === k));
    btns.forEach(b => b.classList.toggle('is-on', b.dataset.agent === k));
  }
  // Select: the panel now commands this agent.
  function select(k, announce){
    selected = k;
    const b = btnOf(k);
    btns.forEach(x => { x.setAttribute('aria-pressed', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
    $('.n-cmd-name').textContent = name(b);
    $('.n-cmd-role').textContent = role(b);
    descEl.textContent = document.getElementById('desc-' + k).textContent;
    presetsEl.setAttribute('aria-label', 'Commands for ' + name(b));
    input.setAttribute('aria-label', 'Your command to ' + name(b));
    presetsEl.replaceChildren(...PRESETS[k].map(q => {
      const p = document.createElement('button'); p.type = 'button'; p.className = 'n-cmd-preset'; p.textContent = q; return p;
    }));
    if (!busy) { setState('rest'); youEl.textContent = statusEl.textContent = textEl.textContent = ''; }
    preview(k);
    if (announce) say(`${name(b)}, ${role(b)}. Three commands below, or type your own.`);
  }

  btns.forEach((b, i) => {
    b.addEventListener('mouseenter', () => preview(b.dataset.agent));
    b.addEventListener('focus', () => preview(b.dataset.agent));
    b.addEventListener('click', () => select(b.dataset.agent, true));
    b.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let j = step ? (i + step + btns.length) % btns.length : e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); btns.forEach(x => x.tabIndex = -1); btns[j].tabIndex = 0; btns[j].focus();
    });
  });
  hub.querySelector('.n-hub-map').addEventListener('mouseleave', () => preview(selected));
  hub.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (cmd.contains(document.activeElement)) { btnOf(selected).focus(); return; }
    if (selected !== 'apex') { select('apex', true); btnOf('apex').focus(); }
  });
  $('.n-cmd-close').addEventListener('click', () => { if (!busy) { setState('rest'); btnOf(selected).focus(); } });

  presetsEl.addEventListener('click', e => { const p = e.target.closest('.n-cmd-preset'); if (p) send(p.textContent, p, 'preset'); });
  form.addEventListener('submit', e => { e.preventDefault(); const t = input.value.trim(); if (t) send(t, input, 'typed'); else input.focus(); });
  $('.n-cmd-retry').addEventListener('click', () => { if (last) send(last.text, $('.n-cmd-retry'), 'retry'); });

  // Pink: the visitor's command travels from where it was given to APEX.
  function travel(from){
    const apex = btnOf('apex');
    if (still() || !apex.offsetParent) return Promise.resolve();
    const h = hub.getBoundingClientRect(), f = from.getBoundingClientRect(), t = apex.getBoundingClientRect();
    const x0 = f.left + f.width / 2 - h.left, y0 = f.top + f.height / 2 - h.top;
    const x1 = t.left + t.width / 2 - h.left, y1 = t.top + t.height / 2 - h.top;
    return dot.animate([{ transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 }, { opacity: 1, offset: .15 },
      { transform: `translate(${x1}px,${y1}px) scale(1)`, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' }).finished.catch(() => {});
  }
  // Blue: APEX routes the command out to the agent(s), repeating until the reply lands.
  function route(k){
    if (still()) return () => {};
    let on = true, n = 0;
    const others = [...pulses.keys()];
    const target = btnOf(k).closest('.n-node');
    target.classList.add('is-routing');
    (function tick(){
      if (!on) return;
      const keys = k === 'apex' ? [others[n++ % others.length], others[(n + 3) % others.length]] : [k];
      keys.forEach(a => pulses.get(a)?.animate([{ strokeDashoffset: 100, opacity: 0 }, { opacity: 1, offset: .2 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 700, easing: 'linear' }));
      setTimeout(tick, 720);
    })();
    return () => { on = false; target.classList.remove('is-routing'); };
  }
  // Reveal the reply in word groups inside the reserved box (no layout shift).
  function reveal(text){
    const words = text.split(/(\s+)/);
    if (still()) { textEl.textContent = text; return Promise.resolve(); }
    const dur = Math.min(900, Math.max(400, words.length * 8)), t0 = performance.now();
    return new Promise(done => (function f(now){
      const n = Math.ceil(words.length * Math.min(1, (now - t0) / dur));
      textEl.textContent = words.slice(0, n).join('');
      n < words.length ? requestAnimationFrame(f) : done();
    })(t0));
  }

  async function send(text, from, source){
    if (busy) return;
    busy = true; last = { text };
    const k = selected, agent = name(btnOf(k));
    presetsEl.querySelectorAll('.n-cmd-preset').forEach(p => p.classList.toggle('is-cmd', p.textContent === text));
    youEl.textContent = text; statusEl.textContent = ''; textEl.textContent = '';
    if (window.nyxTrack) window.nyxTrack('agent_command', { agent: k, source });
    if (!navigator.onLine) { busy = false; setState('offline'); statusEl.textContent = 'No connection. Your command is still here. Send it again once you are back online.'; say(statusEl.textContent); return; }
    if (from === input) input.value = '';
    setState('sent'); say('Sent to APEX.');
    hub.querySelector('.n-node--apex').classList.add('is-cmd');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    const req = fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ agent: k, command: text.slice(0, 500) }) })
      .then(async r => ({ status: r.status, data: await r.json().catch(() => ({})) }), e => ({ status: e.name === 'AbortError' ? 0 : -1, data: {} }));   // network failure reads as offline; timeout as error
    await travel(from);
    hub.querySelector('.n-node--apex').classList.remove('is-cmd');
    setState('routing');
    statusEl.textContent = k === 'apex' ? 'APEX is coordinating the network.' : `APEX routed this to ${agent}.`;
    say(statusEl.textContent);
    const stop = route(k);
    const { status, data } = await req;
    clearTimeout(timer); stop();
    const msg = data.response;
    if (status === 200 && msg) {
      setState('reveal'); statusEl.textContent = agent;
      await reveal(msg);
      setState('done'); say(`${agent}: ${msg}`);
    } else if (status === 429) {
      setState('limited'); statusEl.textContent = msg || 'The line is busy. Try again in a minute.'; say(statusEl.textContent);
    } else if (status === -1) {
      setState('offline'); statusEl.textContent = 'No connection. Your command is still here. Send it again once you are back online.'; say(statusEl.textContent);
    } else {
      setState('error'); statusEl.textContent = msg || 'The intelligence layer is offline. Try again shortly.'; say(statusEl.textContent);
    }
    busy = false;
  }

  select('apex', false);
  // Mobile: the command panel docks at the bottom, so the Ask Alfred launcher steps aside while it's in view.
  new IntersectionObserver(es => document.documentElement.classList.toggle('hub-in-view', es[0].isIntersecting)).observe(hub);

  // At rest: one quiet blue pulse every 3.5 s, never during a command.
  if (_pRM || !dot.animate) return;
  const all = [...pulses.values()];
  let visible = false, timer = 0, prev = -1;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !timer) schedule(); }).observe(hub);
  function schedule(){ timer = setTimeout(fire, 3500); }
  function fire(){
    timer = 0;
    if (!visible || document.hidden || nyxPaused() || busy) { if (visible) schedule(); return; }
    let i; do { i = Math.floor(Math.random() * all.length); } while (i === prev && all.length > 1);
    prev = i;
    const out = Math.random() < 0.5;
    all[i].animate([{ strokeDashoffset: out ? 100 : 0, opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { strokeDashoffset: out ? 0 : 100, opacity: 0 }],
                   { duration: 1400, easing: 'linear' });
    schedule();
  }
})();

/* ── LIGHT ON ENTRY ── key phrases (.lit) light up once as they scroll into view. */
(function(){
  const els = document.querySelectorAll('.lit');
  if (!els.length) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-lit'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -20% 0px' });
  els.forEach(el => io.observe(el));
})();
