// NYX scenes: Paper GrainGradient backgrounds + the three.js engine instrument. Loaded as a module, so it runs
// after the classic scripts (core.js globals).
// three.js is fetched only on capable devices, only when a scene nears the
// viewport. Phones, ≤4-core devices and reduced motion get the static fallback.
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 768px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const capable = !reduced && !small;   // the engine instrument stays desktop-only

let threeP;
const loadThree = () => (threeP ||= import(THREE_URL));
function whenNear(el, fn){
  if (!el) return;
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: '200px' });
  io.observe(el);
}
const afterLoad = (fn) => document.readyState === 'complete' ? fn() : addEventListener('load', fn, { once: true });
const idle = (fn) => (window.requestIdleCallback || setTimeout)(fn, { timeout: 1500 });

if (!capable) document.documentElement.classList.add('static-scenes');
else whenNear(document.getElementById('engine-canvas'), () => loadThree().then(engineScene));

/* ── PAPER GRAINGRADIENT: the hero background, reused behind Agents and Options ──
   Paper Design's GrainGradient (not a custom shader), recolored to NYX: blue leads
   (#1058FF + #0A3BB8), hot pink is the third colour, midnight is the base.
   Mounted after load, only once a host nears the viewport; ShaderMount itself
   pauses off-screen and in hidden tabs. Reduced motion: speed 0 (one still frame). */
// Only the modules GrainGradient needs (about 28 KB gzipped, against 64 KB for the whole bundle).
const PAPER = 'https://cdn.jsdelivr.net/npm/@paper-design/shaders@0.0.82/dist/';
const loadPaper = () => Promise.all([import(PAPER + 'shader-mount.js'), import(PAPER + 'shaders/grain-gradient.js'), import(PAPER + 'get-shader-noise-texture.js'), import(PAPER + 'get-shader-color-from-string.js'), import(PAPER + 'shader-sizing.js')])
  .then(mods => Object.assign({}, ...mods));
const NYX_GRAIN = { colorBack:'#02070A', colors:['#1058FF', '#0A3BB8', '#D83995'], softness:0.76, intensity:0.45, noise:0.12, shape:'corners', scale:1, rotation:0, speed:0.6 };
// Small devices wait 2.5 s after load so the module's parse and shader compile never land in the first interaction window.
afterLoad(() => setTimeout(() => idle(() => document.querySelectorAll('[data-paper]').forEach(host => whenNear(host, () => loadPaper().then(P => paperField(P, host))))), small ? 2500 : 0));

async function paperField(P, host){
  try{
    const noise = P.getShaderNoiseTexture();
    await noise.decode();                                       // the mount needs the texture fully loaded
    const band = host.dataset.paper !== 'hero';                 // Agents/Options: a quieter band
    const p = { ...NYX_GRAIN, intensity: band ? 0.25 : NYX_GRAIN.intensity };
    const uniforms = {
      u_colorBack: P.getShaderColorFromString(p.colorBack), u_colors: p.colors.map(P.getShaderColorFromString), u_colorsCount: p.colors.length,
      u_softness: p.softness, u_intensity: p.intensity, u_noise: p.noise, u_shape: P.GrainGradientShapes[p.shape], u_noiseTexture: noise,
      u_fit: P.ShaderFitOptions[P.defaultObjectSizing.fit], u_scale: p.scale, u_rotation: p.rotation, u_offsetX: 0, u_offsetY: 0,
      u_originX: P.defaultObjectSizing.originX, u_originY: P.defaultObjectSizing.originY, u_worldWidth: 0, u_worldHeight: 0,
    };
    const base = reduced ? 0 : p.speed;
    // Small screens render fewer pixels: 1x density, capped at roughly a 1080p frame.
    const mount = new P.ShaderMount(host, P.grainGradientFragmentShader, uniforms, undefined, base, 0, small ? 1 : 2, small ? 1920 * 1080 : undefined);
    host.classList.add('on');
    if (reduced || band) return;
    // Hero only: the field leans toward the cursor (±0.05, eased) and a click briefly quickens it.
    let tx = 0, ty = 0, x = 0, y = 0, boost = 0, raf = 0;
    const tick = () => {
      raf = 0;
      if (nyxPaused()) { mount.setSpeed(0); return; }
      x += (tx - x) * 0.06; y += (ty - y) * 0.06; boost *= 0.94;
      mount.setUniforms({ u_offsetX: x, u_offsetY: y });
      mount.setSpeed(base + boost);
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 || boost > 0.01) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const hero = host.closest('section');
    hero.addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - 0.5) * 0.1; ty = -(e.clientY / innerHeight - 0.5) * 0.1; kick(); }, { passive:true });
    hero.addEventListener('pointerdown', () => { boost = 2.4; kick(); }, { passive:true });
    document.getElementById('motion-toggle')?.addEventListener('click', () => { mount.setSpeed(nyxPaused() ? 0 : base); });
  } catch(e){ console.warn('NYX shader unavailable', e); }
}

/* ── NYX ENGINE — 3D PRECISION INSTRUMENT ───────────── */
function engineScene(THREE){
  const canvas = document.getElementById('engine-canvas');
  if (!canvas) return;

  const wrap = canvas.parentElement;
  let W = wrap.clientWidth, H = wrap.clientHeight;

  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(nyxHex('--night'), 0);   // transparent; color irrelevant

  // ── MATERIALS ─────────────────────────────────────────
  const gold     = new THREE.LineBasicMaterial({ color: nyxHex('--indigo'), transparent: true, opacity: 0.75 });
  const goldDim  = new THREE.LineBasicMaterial({ color: nyxHex('--indigo'), transparent: true, opacity: 0.25 });
  const goldFade = new THREE.LineBasicMaterial({ color: nyxHex('--indigo'), transparent: true, opacity: 0.12 });
  const white    = new THREE.LineBasicMaterial({ color: nyxHex('--mist'), transparent: true, opacity: 0.18 });
  const steel    = new THREE.LineBasicMaterial({ color: nyxHex('--text-3'), transparent: true, opacity: 0.62 });
  const steelDim = new THREE.LineBasicMaterial({ color: nyxHex('--text-3'), transparent: true, opacity: 0.34 });

  // ── HELPER: edges from geometry ───────────────────────
  function edges(geo, mat) {
    return new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
  }
  function wireframe(geo, mat) {
    return new THREE.LineSegments(new THREE.WireframeGeometry(geo), mat);
  }

  // ── ENGINE GROUP ──────────────────────────────────────
  const engine = new THREE.Group();

  // Outer gimbal — large ring, tilted 15°
  const ring1 = new THREE.Group();
  const r1 = edges(new THREE.TorusGeometry(2.8, 0.018, 6, 160), gold);
  ring1.add(r1);
  // Tick marks on outer ring
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const len = i % 6 === 0 ? 0.14 : 0.07;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0),
      new THREE.Vector3(Math.cos(a) * (2.8 + len), Math.sin(a) * (2.8 + len), 0),
    ]);
    ring1.add(new THREE.Line(g, i % 6 === 0 ? goldDim : goldFade));
  }
  ring1.rotation.x = 0.26;
  engine.add(ring1);

  // Middle gimbal — medium ring, perpendicular axis
  const ring2 = new THREE.Group();
  const r2 = edges(new THREE.TorusGeometry(2.1, 0.014, 6, 128), goldDim);
  ring2.add(r2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, Math.cos(a) * 2.1, Math.sin(a) * 2.1),
      new THREE.Vector3(0, Math.cos(a) * (2.1 + 0.08), Math.sin(a) * (2.1 + 0.08)),
    ]);
    ring2.add(new THREE.Line(g, goldFade));
  }
  engine.add(ring2);

  // Inner gimbal — smaller ring, diagonal axis
  const ring3 = new THREE.Group();
  const r3 = edges(new THREE.TorusGeometry(1.4, 0.012, 6, 96), goldDim);
  ring3.add(r3);
  ring3.rotation.z = Math.PI / 4;
  ring3.rotation.x = Math.PI / 6;
  engine.add(ring3);

  // Structural cross-axle lines
  const axleGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.1, 0, 0), new THREE.Vector3(3.1, 0, 0)
  ]);
  const axle1 = new THREE.Line(axleGeo, goldFade);
  const axle2 = axle1.clone(); axle2.rotation.z = Math.PI / 2;
  const axle3 = axle1.clone(); axle3.rotation.y = Math.PI / 2;
  engine.add(axle1, axle2, axle3);

  // Axis end caps (small spheres at axle tips)
  [[-3.1,0,0],[3.1,0,0],[0,-3.1,0],[0,3.1,0],[0,0,-3.1],[0,0,3.1]].forEach(([x,y,z]) => {
    const cap = edges(new THREE.SphereGeometry(0.06, 8, 6), goldDim);
    cap.position.set(x, y, z);
    engine.add(cap);
  });

  // Core sphere — latitude/longitude wireframe
  const core = wireframe(new THREE.SphereGeometry(0.55, 16, 12), goldDim);
  engine.add(core);

  // Inner core glow ring
  const coreRing = edges(new THREE.TorusGeometry(0.55, 0.008, 4, 64), gold);
  engine.add(coreRing);

  // Equatorial detail band
  const equator = edges(new THREE.TorusGeometry(0.72, 0.005, 4, 80), goldDim);
  engine.add(equator);

  // Node spheres at ring intersections (8 agents)
  const nodePositions = [
    [2.8, 0, 0], [-2.8, 0, 0],
    [0, 2.1, 0], [0, -2.1, 0],
    [0, 0, 1.4], [0, 0, -1.4],
    [1.98, 1.48, 0], [-1.98, -1.48, 0],
  ];
  nodePositions.forEach(([x,y,z]) => {
    const node = edges(new THREE.SphereGeometry(0.1, 10, 8), gold);
    node.position.set(x, y, z);
    engine.add(node);
  });

  // Outer ghost sphere (steel — deep-reflection shell)
  const ghost = wireframe(new THREE.SphereGeometry(3.0, 24, 16), steelDim);
  engine.add(ghost);

  // ── DETAIL LAYER (structure tone) ───────────
  // Graduated outer measurement scale
  const scaleRing = new THREE.Group();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const len = i % 10 === 0 ? 0.13 : (i % 5 === 0 ? 0.07 : 0.035);
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 3.06, Math.sin(a) * 3.06, 0),
      new THREE.Vector3(Math.cos(a) * (3.06 + len), Math.sin(a) * (3.06 + len), 0),
    ]);
    scaleRing.add(new THREE.Line(g, i % 10 === 0 ? steel : steelDim));
  }
  scaleRing.rotation.x = 0.26;
  engine.add(scaleRing);

  // Octahedral structural cage
  const cage = edges(new THREE.OctahedronGeometry(3.0, 0), steelDim);
  engine.add(cage);

  // Radial structural spokes (mid band)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0),
      new THREE.Vector3(Math.cos(a) * 1.30, Math.sin(a) * 1.30, 0),
    ]);
    engine.add(new THREE.Line(g, steelDim));
  }

  // Center reticle — blue crosshair + steel micro-ring
  [[-0.30,0,0,-0.13,0,0],[0.13,0,0,0.30,0,0],[0,-0.30,0,0,-0.13,0],[0,0.13,0,0,0.30,0]].forEach(c => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(c[0],c[1],c[2]), new THREE.Vector3(c[3],c[4],c[5])]);
    engine.add(new THREE.Line(g, gold));
  });
  engine.add(edges(new THREE.TorusGeometry(0.16, 0.004, 4, 48), steel));

  engine.scale.setScalar(0.8);   // fits the frame; the old scale-in tween no longer runs
  scene.add(engine);

  // ── SCROLL REACTIVITY ─────────────────────────────────
  let scrollSpeed = 0;
  let baseRotY = 0, baseRotX = 0;
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const dy = scrollY - lastY; lastY = scrollY;
    if (!visible || nyxPaused()) return;
    scrollSpeed = Math.max(-0.02, Math.min(0.02, dy * 0.0004));
    if (!rafId) tick();
  }, { passive: true });

  // ── RENDER LOOP ───────────────────────────────────────
  let rafId;
  let visible = false;
  const obs = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) renderer.render(scene, camera);   // still frame
  }, { threshold: 0.01 });
  obs.observe(canvas);

  let t = 0;
  function tick() {
    // Moves only in response to scrolling; settles to a still frame.
    if (!visible || Math.abs(scrollSpeed) < 0.0004) { rafId = null; renderer.render(scene, camera); return; }
    rafId = requestAnimationFrame(tick);
    t += 0.008;

    // Independent ring rotations
    ring1.rotation.y += scrollSpeed;
    ring2.rotation.x += scrollSpeed * 0.8;
    ring3.rotation.z += scrollSpeed * 1.2;
    core.rotation.y  -= scrollSpeed * 0.6;
    core.rotation.x  += scrollSpeed * 0.4;
    coreRing.rotation.z += scrollSpeed;
    ghost.rotation.y -= scrollSpeed * 0.2;
    ghost.rotation.x += scrollSpeed * 0.3;
    scaleRing.rotation.z -= scrollSpeed * 0.25;
    cage.rotation.y += scrollSpeed * 0.2;
    cage.rotation.x += scrollSpeed * 0.12;

    // Gentle overall drift

    scrollSpeed *= 0.92; // dampen
    renderer.render(scene, camera);
  }

  // ── RESIZE ────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    W = wrap.clientWidth; H = wrap.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });
  ro.observe(wrap);
}
