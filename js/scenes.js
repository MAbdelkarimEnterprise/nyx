// NYX three.js scenes (night-field shader + engine). Loaded as a module, so it runs
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

// The night field runs everywhere (a lighter shader on small devices, one still frame under reduced motion).
afterLoad(() => idle(() => loadThree().then(nightField)));
if (!capable) document.documentElement.classList.add('static-scenes');
else whenNear(document.getElementById('engine-canvas'), () => loadThree().then(engineScene));

/* ── NIGHT FIELD: the site's one environment ────────────
   A fixed full-screen quad behind everything. Domain-warped fbm noise:
   black → deep blue → royal blue, hot pink only at the brightest peaks and on
   the leading edge of a click ripple. The cursor bends the field; scroll moves
   its hue. Brightness follows the section in view ([data-field] on sections):
   full behind the hero, a band behind Agents and Options, dark elsewhere (and
   then it stops rendering). Internal resolution 0.5–0.6× DPR. */
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uLevel; uniform float uScroll;
uniform vec4 uRip[3];
// 2D simplex noise (Ashima Arts, MIT)
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);
vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;
vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<OCT;i++){v+=a*snoise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 m=(uMouse-0.5)*vec2(uRes.x/uRes.y,1.0);
  vec2 d=m-p; p+=d*exp(-dot(d,d)*2.5)*0.16;                 // the field leans toward the cursor
  float t=uTime*0.03;
  vec2 q=vec2(fbm(p*0.7+vec2(0.0,t)),fbm(p*0.7+vec2(5.2,1.3)-t));
#ifdef WARP2
  vec2 r=vec2(fbm(p*0.9+1.5*q+vec2(1.7,9.2)+t*1.4),fbm(p*0.9+1.5*q+vec2(8.3,2.8)-t));
#else
  vec2 r=q;
#endif
  float n=fbm(p*0.6+1.7*r+vec2(0.0,uScroll*0.8))*0.5+0.5;  // scroll drifts the currents
  float rip=0.0,edge=0.0;
  for(int i=0;i<3;i++){ vec4 R=uRip[i]; if(R.w<0.5) continue;
    float age=uTime-R.z; vec2 c=(R.xy-0.5)*vec2(uRes.x/uRes.y,1.0);
    float dist=length(p-c), rad=age*0.28, fade=exp(-age*0.45);
    edge+=exp(-pow((dist-rad)*22.0,2.0))*fade;                // leading edge: pink
    rip+=exp(-pow((dist-rad+0.06)*9.0,2.0))*fade; }           // the wake: blue
  vec3 black=vec3(0.008,0.027,0.039), deep=vec3(0.0,0.09,0.36), blue=vec3(0.063,0.345,1.0), pink=vec3(0.847,0.224,0.584);
  blue=mix(blue,vec3(0.16,0.28,1.0),uScroll*0.6);            // hue moves toward violet as you go down
  float body=smoothstep(0.32,0.7,n), band=smoothstep(0.56,0.9,n);
  vec3 col=mix(black,deep,body);
  col=mix(col,blue,band*band*0.9);
  float vein=smoothstep(0.86,0.97,n+0.08*length(r));
  col=mix(col,pink,vein*0.55);
  col+=blue*rip*0.35+pink*edge*0.6;
  float vig=smoothstep(1.15,0.2,length((uv-0.5)*vec2(1.25,1.0)));
  col=mix(black,col,uLevel*mix(0.45,1.0,vig));
  float g=fract(sin(dot(gl_FragCoord.xy+fract(uTime)*100.0,vec2(12.9898,78.233)))*43758.5453);
  col+=(g-0.5)*0.03*uLevel;                                    // film grain
  gl_FragColor=vec4(col,1.0);
}`;

function nightField(THREE){
  try{
    const canvas = document.getElementById('night-field');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, alpha:false, powerPreference:'low-power' });
    const scale = small ? 0.5 : 0.6;
    const size = () => { renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * scale); renderer.setSize(innerWidth, innerHeight, false); u.uRes.value.set(canvas.width, canvas.height); };
    const u = {
      uRes:{ value:new THREE.Vector2() }, uTime:{ value:0 }, uMouse:{ value:new THREE.Vector2(0.5, 0.55) },
      uLevel:{ value:0 }, uScroll:{ value:0 }, uRip:{ value:[0,1,2].map(() => new THREE.Vector4(0,0,0,0)) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms:u, fragmentShader:FRAG,
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
      defines: small ? { OCT:3 } : { OCT:4, WARP2:1 }, depthTest:false, depthWrite:false });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const cam = new THREE.Camera();
    size(); addEventListener('resize', size, { passive:true });

    // Brightness follows the section at the viewport's middle.
    const levelAt = () => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('[data-field]'); return el ? +el.dataset.field : 0; };
    let mouse = { x:0.5, y:0.55 }, rip = 0, raf = 0, last = 0;
    u.uLevel.value = levelAt();
    const kick = () => { if (!raf && !document.hidden && !reduced) raf = requestAnimationFrame(tick); };
    addEventListener('pointermove', e => { mouse = { x:e.clientX / innerWidth, y:1 - e.clientY / innerHeight }; kick(); }, { passive:true });
    addEventListener('pointerdown', e => {
      if (reduced || u.uLevel.value < 0.2) return;
      u.uRip.value[rip++ % 3].set(e.clientX / innerWidth, 1 - e.clientY / innerHeight, u.uTime.value, 1); kick();
    }, { passive:true });
    // Reduced motion: still frames only, re-lit to match the section in view.
    addEventListener('scroll', () => { if (reduced) { u.uLevel.value = levelAt(); renderer.render(scene, cam); } else kick(); }, { passive:true });
    document.addEventListener('visibilitychange', kick);
    document.getElementById('motion-toggle')?.addEventListener('click', kick);

    function tick(now){
      raf = 0;
      const dt = Math.min(64, now - (last || now)); last = now;
      const paused = nyxPaused();
      if (!paused) u.uTime.value += dt / 1000;
      const target = levelAt();
      u.uLevel.value += (target - u.uLevel.value) * 0.05;
      const um = u.uMouse.value; um.x += (mouse.x - um.x) * 0.04; um.y += (mouse.y - um.y) * 0.04;
      const max = document.documentElement.scrollHeight - innerHeight;
      u.uScroll.value += ((max > 0 ? scrollY / max : 0) - u.uScroll.value) * 0.05;
      renderer.render(scene, cam);
      const settled = Math.abs(target - u.uLevel.value) < 0.004;
      // Keep running while the field is visible and moving; stop when dark, paused or hidden.
      if (!document.hidden && !(paused && settled) && !(target === 0 && settled)) raf = requestAnimationFrame(tick);
      else last = 0;
    }
    renderer.render(scene, cam);           // one still frame: reduced motion stops here
    canvas.classList.add('show');
    kick();
  } catch(e){ console.warn('NYX field unavailable', e); }
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
