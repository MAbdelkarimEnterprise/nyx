'use strict';
/* ── LIVE INTELLIGENCE FEED ─────────────────────────── */
(function(){
  const terminal = document.getElementById('feed-terminal');
  const countEl  = document.getElementById('feed-count');
  if (!terminal) return;

  const pool = [
    { agent:'APEX',     text:'Strategic routing re-calibrated — CONVERT priority elevated after pipeline stall detected.' },
    { agent:'ORACLE',   text:'Competitive intelligence update: 2 direct competitors altered pricing within 48h window.' },
    { agent:'ORACLE',   text:'Emerging signal: AI infrastructure spend up 34% QoQ across your target vertical.' },
    { agent:'CONVERT',  text:'High-conversion lead segment identified: bootstrapped founders entering growth phase.' },
    { agent:'CONVERT',  text:'Funnel analysis complete — friction point isolated at step 3. Recommendation queued for APEX.' },
    { agent:'SIGNAL',   text:'Audience intelligence update: engagement velocity up 2.4x on founder-focused content.' },
    { agent:'SIGNAL',   text:'Optimal send window computed. Next campaign queued for 07:30 UTC.' },
    { agent:'FORGE',    text:'Infrastructure auto-scaling event resolved. No degradation recorded.' },
    { agent:'FORGE',    text:'Dependency audit complete. 3 packages flagged for rotation — CIPHER notified.' },
    { agent:'LEDGER',   text:'Burn variance detected — Q2 cloud infrastructure 8% over model. Alert dispatched.' },
    { agent:'LEDGER',   text:'Revenue recognition event logged. Monthly recurring updated.' },
    { agent:'CIPHER',   text:'Unauthorized access attempt blocked — origin classified. Incident report generated.' },
    { agent:'CIPHER',   text:'Compliance audit cycle completed. All systems nominal. Next cycle in 30 days.' },
    { agent:'MERIDIAN', text:'Operational throughput increased 18% after workflow restructure recommendation applied.' },
    { agent:'MERIDIAN', text:'Cross-functional dependency map updated. 2 latent bottlenecks surfaced for review.' },
    { agent:'APEX',     text:'Daily intelligence briefing compiled and delivered. Next scheduled: 06:00 UTC.' },
    { agent:'ORACLE',   text:'Market sentiment shift detected in your sector — analysis report generated.' },
    { agent:'CONVERT',  text:'Churn risk pattern identified across 3 accounts. Retention sequence initiated.' },
  ];

  const times = ['just now','2 min ago','5 min ago','11 min ago','18 min ago','27 min ago',
                  '34 min ago','42 min ago','51 min ago','1.1 hr ago','1.4 hr ago','2.2 hr ago',
                  '3.0 hr ago','4.5 hr ago','5.8 hr ago','7.1 hr ago','9.4 hr ago','11.2 hr ago'];

  let count = 0;

  function addEvent(item, timeStr, prepend) {
    const row = document.createElement('div');
    row.className = 'feed-event';
    row.innerHTML = `
      <span class="feed-agent-id">${item.agent}</span>
      <span class="feed-event-text">${item.text}</span>
      <span class="feed-event-time">${timeStr}</span>
    `;
    if (prepend && terminal.firstChild) {
      terminal.insertBefore(row, terminal.firstChild);
    } else {
      terminal.appendChild(row);
    }
    count++;
    if (countEl) countEl.textContent = count + ' events';
    // cap at 22 rows
    while (terminal.children.length > 22) {
      terminal.removeChild(terminal.lastChild);
    }
  }

  // seed initial events
  const shuffled = [...pool].sort(() => Math.random()-0.5).slice(0, 12);
  shuffled.forEach((item, i) => addEvent(item, times[i + 4] || '12+ hr ago', false));

  // drip new events live
  function dripEvent() {
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (nyxPaused()) { setTimeout(dripEvent, 4000); return; }
    addEvent(item, 'just now', true);
    // update the previous "just now" to "2 min ago"
    const rows = terminal.querySelectorAll('.feed-event-time');
    if (rows[1]) rows[1].textContent = '1 min ago';
    if (rows[2]) rows[2].textContent = '3 min ago';
    const delay = 8000 + Math.random() * 14000;
    setTimeout(dripEvent, delay);
  }
  setTimeout(dripEvent, 6000);

  // scroll reveal
  ScrollTrigger.create({
    trigger: '#alfred',
    start: 'top 78%',
    once: true,
    onEnter: () => {
      gsap.to('.feed-headline', { clipPath:'inset(0 0 0% 0)', duration:1.1, ease:'power4.out' });
      gsap.fromTo('.feed-caption', { opacity:0, y:16 }, { opacity:1, y:0, duration:0.8, ease:'power3.out', delay:0.2 });
      gsap.fromTo('.feed-terminal', { opacity:0, y:24 }, { opacity:1, y:0, duration:0.9, ease:'power3.out', delay:0.35 });
    }
  });
})();
/* ── AGENT ACTIVITY PULSE BARS ──────────────────────── */
(function(){
  document.querySelectorAll('.agent-card').forEach(card => {
    // inject pulse bar
    const bar = document.createElement('div');
    bar.className = 'agent-pulse-bar';
    const cvs = document.createElement('canvas');
    cvs.className = 'agent-pulse-canvas';
    bar.appendChild(cvs);
    card.appendChild(bar);

    const ctx = cvs.getContext('2d');
    let W = 0, H = 0;
    const data = Array.from({length:60}, () => 0.1 + Math.random()*0.5);
    let frame = 0;

    function resize(){
      W = cvs.width  = cvs.offsetWidth;
      H = cvs.height = cvs.offsetHeight;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    resize();

    function draw(){
      if (!W || !H) return;
      frame++;
      if (frame % 6 === 0) {
        data.shift();
        data.push(0.05 + Math.random()*0.7 + Math.sin(frame*0.04)*0.2);
      }
      ctx.clearRect(0,0,W,H);
      ctx.beginPath();
      data.forEach((v,i) => {
        const x = (i / (data.length-1)) * W;
        const y = H - v * H;
        i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.strokeStyle = nyxColor('--indigo', 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
      // fill area
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
      ctx.fillStyle = nyxColor('--indigo', 0.04);
      ctx.fill();
    }
    nyxLoop(card, draw);
  });
})();
/* ── ALFRED DEMO ────────────────────────────────────── */
(function(){
  const BRIEFS = {
    briefing: {
      title: 'ALFRED — DAILY EXECUTIVE BRIEFING',
      prompt: 'Alfred, give me my morning briefing.',
      mode: 'EXECUTIVE BRIEFING',
      sources: '8 agents',
      time: '06:00 UTC',
      text: `Good morning. It is Monday. You have three high-leverage actions today and two decisions that cannot wait.\n\nORACLE flagged a competitor funding round overnight — $22M Series B, direct positioning overlap in your primary segment. This accelerates your timeline by one quarter. I recommend reviewing your distribution strategy with APEX before noon.\n\nLEDGER confirms runway has extended to 18 months following last week's close. Cash efficiency ratio is up 14% month-over-month. You are ahead of plan.\n\nCONVERT reports three enterprise deals entered final stage. Combined value: $1.4M. Projected close probability is 78%. Your presence on the 11am call will increase that by an estimated 12 points.\n\nThe system is running. The rest is yours.`
    },
    opportunity: {
      title: 'ALFRED — OPPORTUNITY ALERT',
      prompt: 'Alfred, what opportunities should I know about?',
      mode: 'OPPORTUNITY DETECTION',
      sources: 'ORACLE + CONVERT',
      time: 'live',
      text: `Three opportunities require your attention. I have ranked them by expected return.\n\nFirst: A strategic partnership window with a tier-one distribution partner. ORACLE detected their outbound signals two days ago. The window is approximately 3 weeks before their Q4 roadmap locks. Expected revenue impact: $400K in year one.\n\nSecond: Your highest-intent inbound lead from last week has gone quiet. CONVERT analysis suggests they are evaluating a competitor. A direct founder-to-founder message in the next 48 hours has an 84% probability of re-engagement.\n\nThird: A speaking slot at a category-defining event opened. SIGNAL assessed audience alignment at 91%. Your competitors have not been invited. Confirmation deadline is Thursday.\n\nWhich do you want to action first?`
    },
    strategy: {
      title: 'ALFRED — STRATEGIC INTELLIGENCE REPORT',
      prompt: 'Alfred, give me a strategic report.',
      mode: 'STRATEGIC ANALYSIS',
      sources: 'APEX + ORACLE + LEDGER',
      time: 'weekly',
      text: `This is your weekly strategic summary. Three observations that will shape next quarter.\n\nThe market is consolidating faster than your model assumed. Two of the five independents in your segment have initiated acquisition conversations. Your positioning as the category premium creates protection, but only if you establish distribution before the consolidation window closes — approximately 6 months.\n\nYour unit economics are outperforming the cohort model by 19%. This is not noise. LEDGER traced it to a single product decision made in March. The implication: you have a repeatable advantage that competitors have not identified. Protect it. Do not publish it. Scale it.\n\nTeam velocity has increased 34% since the Q2 restructure. APEX models suggest one more targeted hire in the next 60 days would compound output disproportionately. The profile is specific: a senior operator with enterprise distribution experience.\n\nThe window to dominate this category is 18 months. The system agrees.`
    },
    market: {
      title: 'ALFRED — MARKET INTELLIGENCE UPDATE',
      prompt: 'Alfred, what is happening in the market?',
      mode: 'MARKET INTELLIGENCE',
      sources: 'ORACLE + SIGNAL',
      time: 'real-time',
      text: `ORACLE processed 14 market signals in the last 24 hours. Here is what matters.\n\nMacro: risk capital is rotating back into B2B SaaS. Three major funds have revised their deployment timelines forward. If you are considering a raise, the next 90 days are more favorable than the following 9 months.\n\nCompetitive: your primary competitor shipped a feature that overlaps with your Q3 roadmap at 40%. It is underdeveloped — they moved fast and it shows. Your execution depth remains the differentiator. Do not rush to match; execute your original vision better.\n\nAudience: your target segment's search behavior shifted last week. Two new intent signals appeared that were not in your model. SIGNAL has already updated the distribution strategy. Content calendar adjusted.\n\nSentiment: three Tier-1 publications are running category coverage in the next 30 days. ORACLE has identified the reporters. I recommend a targeted briefing campaign this week.`
    },
    performance: {
      title: 'ALFRED — PERFORMANCE REVIEW',
      prompt: 'Alfred, how am I performing this quarter?',
      mode: 'PERFORMANCE ANALYSIS',
      sources: 'ALL AGENTS',
      time: 'Q3 2026',
      text: `Quarter three is tracking at 118% of plan across the metrics that matter.\n\nRevenue: $284K MRR, up 18% month-over-month. Pipeline coverage ratio is 3.2x, which means you have enough in funnel to close the quarter above target even with a 30% loss rate.\n\nOperations: MERIDIAN reports SLA compliance at 98.4%, up from 91% last quarter. The friction point in your fulfillment process was resolved. Overhead efficiency improved.\n\nTeam: APEX models output velocity at a 7-year high for a team of this size. Decision latency — the time between identifying a problem and acting on it — dropped by 40% since you began using the system daily.\n\nOne flag: you have delayed the enterprise pricing decision four times. LEDGER and CONVERT both indicate this is costing you approximately $60K per month in leave-on-the-table revenue. This is the decision you should make today.\n\nYou are performing. The system is performing. One call to action remains.`
    }
  };

  let currentBrief = 'briefing';
  let typewriterTimer = null;
  let initiated = false;

  function typewrite(el, text, speed, onDone){
    if(typewriterTimer) clearTimeout(typewriterTimer);
    el.innerHTML = '';
    let i = 0;
    const cursor = '<span class="alfred-blink-cursor"></span>';
    function next(){
      if(i <= text.length){
        const chunk = text.slice(0, i).replace(/\n/g,'<br>');
        el.innerHTML = chunk + cursor;
        i++;
        typewriterTimer = setTimeout(next, i < 60 ? speed * 0.5 : speed);
      } else {
        el.innerHTML = text.replace(/\n/g,'<br>');
        if(onDone) onDone();
      }
    }
    next();
  }

  function showBrief(key, onDone){
    const b = BRIEFS[key];
    if(!b) return;
    document.getElementById('alfred-term-title').textContent = b.title;
    document.getElementById('alfred-prompt-text').textContent = b.prompt;
    document.getElementById('alfred-meta-mode').textContent = b.mode;
    document.getElementById('alfred-meta-sources').textContent = b.sources;
    document.getElementById('alfred-meta-time').textContent = b.time;
    typewrite(document.getElementById('alfred-response-text'), b.text, 18, onDone);
  }

  // Tabs
  document.querySelectorAll('.alfred-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.alfred-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentBrief = tab.dataset.brief;
      currentIdx = briefKeys.indexOf(currentBrief);
      if(enterPrompt) enterPrompt.classList.remove('visible');
      showBrief(currentBrief, () => showEnterPrompt());
    });
  });

  // ScrollTrigger reveal + auto-start
  ScrollTrigger.create({
    trigger: '#alfred-demo',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      if(!initiated){
        initiated = true;
        gsap.to('.alfred-demo-headline', {
          clipPath:'inset(0 0 0% 0)', duration:1, ease:'power3.out'
        });
        setTimeout(() => showBrief('briefing', () => showEnterPrompt()), 600);
      }
    }
  });

  // Enter key / click advances to next brief
  const briefKeys = Object.keys(BRIEFS);
  let currentIdx = 0;
  const enterPrompt = document.getElementById('alfred-enter-prompt');

  function showEnterPrompt(){ if(enterPrompt) enterPrompt.classList.add('visible'); }

  function advanceBrief(){
    currentIdx = (currentIdx + 1) % briefKeys.length;
    const key = briefKeys[currentIdx];
    document.querySelectorAll('.alfred-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.alfred-tab[data-brief="${key}"]`);
    if(activeTab) activeTab.classList.add('active');
    if(enterPrompt) enterPrompt.classList.remove('visible');
    showBrief(key, () => showEnterPrompt());
  }

  if(enterPrompt) enterPrompt.addEventListener('click', advanceBrief);


})();
/* ── VHUD PREVIEW CANVAS (Voice OS section background) ── */
(function(){
  const canvas = document.getElementById('vhud-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, raf;

  function resize(){
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let spokeAngle = 0;
  const PCNT = 55;
  const pts = Array.from({length: PCNT}, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random()-0.5)*0.00014,
    vy: (Math.random()-0.5)*0.00014,
    r: 0.5 + Math.random()*0.7,
    a: 0.04 + Math.random()*0.08,
  }));

  function draw(){
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2, R=Math.min(W,H)*0.5;
    spokeAngle += 0.0007;

    // rotating spokes
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(spokeAngle);
    for(let i=0;i<24;i++){
      const a=(i/24)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(a)*R*1.1, Math.sin(a)*R*1.1);
      ctx.strokeStyle=nyxColor('--indigo', 0.028);
      ctx.lineWidth=0.5; ctx.stroke();
    }
    ctx.restore();

    // counter-rotating ghost rings
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(-spokeAngle*0.5);
    [0.88,1.02,1.16].forEach((f,i)=>{
      ctx.beginPath(); ctx.arc(0,0,R*f,0,Math.PI*2);
      ctx.setLineDash(i===1?[5,16]:[]);
      ctx.strokeStyle=nyxColor('--indigo', 0.018);
      ctx.lineWidth=0.5; ctx.stroke();
    });
    ctx.setLineDash([]); ctx.restore();

    // drifting particles
    for(const p of pts){
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=1; if(p.x>1)p.x=0;
      if(p.y<0)p.y=1; if(p.y>1)p.y=0;
      ctx.beginPath(); ctx.arc(p.x*W, p.y*H, p.r, 0, Math.PI*2);
      ctx.fillStyle=nyxColor('--indigo', p.a); ctx.fill();
    }
  }
  nyxLoop(canvas, draw);
})();
/* ── ALFRED MODE ──────────────────────────────────── */
(function(){
  if (document.getElementById('alfred-overlay')) return;

  const GREETING = "I'm Alfred. Tell me what you run, and I'll tell you which part of NYX fits.";
  const history = [];

  async function getReply(query){
    try{
      const res = await fetch('/api/agent', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ agent:'alfred', command: query.slice(0, 500), history: history.slice(-6) }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.response || 'The line is quiet. Try again in a moment.';
      if(res.ok){ history.push({ role:'user', content: query.slice(0, 500) }, { role:'assistant', content: reply }); }
      return reply;
    } catch { return 'The line is quiet. Try again in a moment.'; }
  }

  // ── STYLES ────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #alfred-overlay{
      position:fixed;inset:0;z-index:99998;
      background:var(--night);
      opacity:0;pointer-events:none;
      transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1);
      overflow:hidden;
    }
    #alfred-overlay.active{opacity:1;pointer-events:all}

    /* scan-line overlay */
    #alfred-overlay::before{
      content:'';position:absolute;inset:0;z-index:2;pointer-events:none;
      background:repeating-linear-gradient(
        0deg,transparent,transparent 2px,color-mix(in srgb,var(--night) 8%,transparent) 2px,color-mix(in srgb,var(--night) 8%,transparent) 4px
      );
    }

    /* full-screen ring canvas */
    #af-ring-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}

    /* HUD corners */
    .af-corner{position:absolute;width:48px;height:48px;border-color:color-mix(in srgb,var(--indigo) 25%,transparent);border-style:solid;z-index:5}
    .af-corner.tl{top:20px;left:20px;border-width:1px 0 0 1px}
    .af-corner.tr{top:20px;right:20px;border-width:1px 1px 0 0}
    .af-corner.bl{bottom:20px;left:20px;border-width:0 0 1px 1px}
    .af-corner.br{bottom:20px;right:20px;border-width:0 1px 1px 0}
    /* corner inner dots */
    .af-corner::after{content:'';position:absolute;width:3px;height:3px;background:color-mix(in srgb,var(--indigo) 50%,transparent);border-radius:50%}
    .af-corner.tl::after{top:-1px;left:-1px}
    .af-corner.tr::after{top:-1px;right:-1px}
    .af-corner.bl::after{bottom:-1px;left:-1px}
    .af-corner.br::after{bottom:-1px;right:-1px}

    /* header */
    .af-header{
      position:absolute;top:0;left:0;right:0;z-index:6;
      display:flex;align-items:center;justify-content:space-between;
      padding:20px 36px;
      border-bottom:1px solid color-mix(in srgb,var(--indigo) 6%,transparent);
    }
    .af-logo{font-family:var(--mono);font-size:12px;letter-spacing:0.55em;color:var(--gold-text);text-transform:uppercase}
    .af-header-mid{font-family:var(--mono);font-size:12px;letter-spacing:0.32em;color:var(--gold-text);text-transform:uppercase;display:flex;align-items:center;gap:8px}
    .af-status-dot{width:5px;height:5px;border-radius:50%;background:var(--indigo);animation:af-dot-pulse 1.8s ease-in-out infinite;flex-shrink:0}
    @keyframes af-dot-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.25;transform:scale(0.5)}}
    .af-close-btn{font-family:var(--mono);font-size:12px;letter-spacing:0.25em;color:var(--text-2);text-transform:uppercase;cursor:pointer;transition:color .2s;user-select:none;background:none;border:none;padding:4px 0}
    .af-close-btn:hover{color:var(--gold-text)}

    /* ── LEFT HUD PANEL ────────────────────────────────────── */
    .af-panel{
      position:absolute;top:50%;transform:translateY(-50%);
      z-index:5;width:200px;
      border:1px solid color-mix(in srgb,var(--indigo) 10%,transparent);
      background:color-mix(in srgb,var(--night) 55%,transparent);
      backdrop-filter:blur(8px);
      padding:18px 16px;
      display:flex;flex-direction:column;gap:14px;
      opacity:0;transition:opacity 0.6s ease 0.4s;
    }
    #alfred-overlay.active .af-panel{opacity:1}
    .af-panel.left{left:32px}
    .af-panel.right{right:32px}
    .af-panel-title{
      font-family:var(--mono);font-size:12px;letter-spacing:0.45em;
      color:var(--gold-text);text-transform:uppercase;
      padding-bottom:10px;border-bottom:1px solid color-mix(in srgb,var(--indigo) 8%,transparent);
    }
    .af-panel-row{display:flex;flex-direction:column;gap:4px}
    .af-panel-label{font-family:var(--mono);font-size:12px;letter-spacing:0.2em;color:var(--gold-text);text-transform:uppercase}
    .af-panel-val{font-family:var(--mono);font-size:12px;letter-spacing:0.12em;color:var(--text-2);text-transform:uppercase}
    .af-panel-val.live{color:var(--gold-text)}
    .af-agent-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
    .af-agent-name{font-family:var(--mono);font-size:12px;letter-spacing:0.12em;color:var(--gold-text);text-transform:uppercase;flex-shrink:0}
    .af-agent-bar{flex:1;height:2px;background:color-mix(in srgb,var(--indigo) 10%,transparent);border-radius:1px;overflow:hidden}
    .af-agent-bar-fill{height:100%;background:color-mix(in srgb,var(--indigo) 60%,transparent);border-radius:1px;transition:width 2s ease}
    .af-agent-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}
    .af-agent-dot.active{background:var(--indigo);box-shadow:none}
    .af-agent-dot.idle{background:color-mix(in srgb,var(--indigo) 20%,transparent)}

    /* intel rows in right panel */
    .af-intel-row{padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--indigo) 6%,transparent);display:flex;flex-direction:column;gap:3px}
    .af-intel-row:last-child{border-bottom:none}
    .af-intel-agent{font-family:var(--mono);font-size:12px;letter-spacing:0.25em;color:var(--gold-text);text-transform:uppercase}
    .af-intel-text{font-family:var(--mono);font-size:12px;letter-spacing:0.06em;color:var(--text-2);line-height:1.5}

    /* center UI */
    .af-center{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:4;display:flex;flex-direction:column;align-items:center;
      width:min(560px,60vw);text-align:center;pointer-events:none;
    }
    .af-system-label{
      font-family:var(--mono);font-size:12px;letter-spacing:0.5em;
      color:var(--gold-text);text-transform:uppercase;margin-bottom:6px;
    }
    .af-orb-label{
      font-family:var(--mono);font-size:12px;letter-spacing:0.38em;
      color:var(--gold-text);text-transform:uppercase;
      transition:color .3s;min-height:14px;
    }
    .af-orb-label.on{color:var(--gold-text)}
    .af-response{
      font-family:var(--serif);
      font-size:clamp(17px,2.2vw,26px);font-weight:300;font-style:italic;
      color:var(--text-1);line-height:1.7;letter-spacing:0.02em;
      opacity:0;transition:opacity 0.6s ease;min-height:56px;padding:0 12px;
      margin-top:16px;
    }
    .af-response.show{opacity:1}
    .af-transcript{
      font-family:var(--mono);font-size:12px;letter-spacing:0.12em;
      color:var(--gold-text);text-transform:uppercase;
      margin-top:16px;min-height:14px;max-width:400px;line-height:1.5;
    }

    /* bottom */
    .af-bottom{
      position:absolute;bottom:52px;left:50%;transform:translateX(-50%);
      z-index:6;display:flex;flex-direction:column;align-items:center;gap:12px;
      width:min(480px,60vw);
    }
    .af-status{
      font-family:var(--mono);font-size:12px;letter-spacing:0.38em;
      color:var(--gold-text);text-transform:uppercase;text-align:center;
      transition:color .3s;
    }
    .af-status.on{color:var(--gold-text)}
    .af-input-row{display:flex;gap:0;width:100%;border:1px solid color-mix(in srgb,var(--indigo) 14%,transparent)}
    .af-text-in{
      flex:1;background:color-mix(in srgb,var(--night) 70%,transparent);border:none;
      color:var(--text-2);font-family:var(--mono);font-size:12px;
      letter-spacing:0.1em;text-transform:uppercase;padding:12px 16px;
      outline:none;transition:background .2s;pointer-events:all;
    }
    .af-text-in::placeholder{color:var(--gold-text)}
    .af-text-in:focus{background:color-mix(in srgb,var(--indigo) 4%,transparent)}
    .af-send{
      background:color-mix(in srgb,var(--indigo) 7%,transparent);border:none;border-left:1px solid color-mix(in srgb,var(--indigo) 14%,transparent);
      color:var(--gold-text);font-family:var(--mono);font-size:12px;
      letter-spacing:0.22em;text-transform:uppercase;padding:0 20px;
      cursor:pointer;transition:background .2s,color .2s;white-space:nowrap;pointer-events:all;
    }
    .af-send:hover{background:color-mix(in srgb,var(--indigo) 14%,transparent);color:var(--gold-text)}

    .af-hint{
      position:absolute;bottom:22px;left:50%;transform:translateX(-50%);
      font-family:var(--mono);font-size:12px;letter-spacing:0.28em;
      color:var(--text-2);text-transform:uppercase;white-space:nowrap;z-index:6;
    }

    /* crosshair reticle */
    .af-reticle{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:2;pointer-events:none;
    }
    .af-reticle-h,.af-reticle-v{position:absolute;background:color-mix(in srgb,var(--indigo) 4%,transparent)}
    .af-reticle-h{width:100vw;height:1px;top:0;left:50%;transform:translateX(-50%)}
    .af-reticle-v{height:100vh;width:1px;left:0;top:50%;transform:translateY(-50%)}

    @media(max-width:900px){
      .af-panel{display:none}
      .af-center{width:min(560px,90vw)}
      .af-bottom{width:min(480px,90vw)}
    }
    @media(max-width:600px){
      .af-response{font-size:15px}
      .af-header{padding:14px 20px}
      .af-bottom{bottom:44px}
    }
  `;
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'alfred-overlay';
  overlay.innerHTML = `
    <canvas id="af-ring-canvas"></canvas>
    <div class="af-reticle"><div class="af-reticle-h"></div><div class="af-reticle-v"></div></div>
    <div class="af-corner tl"></div><div class="af-corner tr"></div>
    <div class="af-corner bl"></div><div class="af-corner br"></div>

    <div class="af-header">
      <div class="af-logo">NYX / ALFRED</div>
      <div class="af-header-mid"><span class="af-status-dot"></span>STRATEGIC ADVISORY SYSTEM — ACTIVE</div>
      <button class="af-close-btn" id="af-close">ESC — DISMISS</button>
    </div>

    <!-- LEFT PANEL: System Status -->
    <div class="af-panel left" id="af-panel-left">
      <div class="af-panel-title">System Status</div>
      <div class="af-panel-row">
        <div class="af-panel-label">Mode</div>
        <div class="af-panel-val live" id="af-mode-val">ADVISORY</div>
      </div>
      <div class="af-panel-row">
        <div class="af-panel-label">Memory Layer</div>
        <div class="af-panel-val live">ACTIVE</div>
      </div>
      <div class="af-panel-row">
        <div class="af-panel-label">Inference Engine</div>
        <div class="af-panel-val live">RUNNING</div>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:8px">
        <div class="af-panel-label" style="margin-bottom:2px">Agent Network</div>
        <div class="af-agent-row"><span class="af-agent-name">APEX</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:94%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">ORACLE</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:81%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">SIGNAL</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:67%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">CONVERT</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:73%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">FORGE</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:55%"></div></div><div class="af-agent-dot idle"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">LEDGER</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:88%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">CIPHER</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:100%"></div></div><div class="af-agent-dot active"></div></div>
        <div class="af-agent-row"><span class="af-agent-name">MERIDIAN</span><div class="af-agent-bar"><div class="af-agent-bar-fill" style="width:62%"></div></div><div class="af-agent-dot active"></div></div>
      </div>
    </div>

    <!-- RIGHT PANEL: Live Intelligence -->
    <div class="af-panel right" id="af-panel-right">
      <div class="af-panel-title">Sample Intelligence</div>
      <div id="af-intel-rows"></div>
      <div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--line)">
        <div class="af-panel-label" style="margin-bottom:6px">Session Clock</div>
        <div class="af-panel-val live" id="af-session-time">00:00:00</div>
      </div>
    </div>

    <div class="af-center">
      <div class="af-system-label">ALFRED — EXECUTIVE INTELLIGENCE</div>
      <div class="af-orb-label" id="af-orb-label">STANDBY</div>
      <div class="af-response" id="af-response"></div>
      <div class="af-transcript" id="af-transcript"></div>
    </div>

    <div class="af-bottom">
      <div class="af-status" id="af-status">INITIALISING</div>
      <div class="af-input-row">
        <input id="af-text-in" class="af-text-in" type="text" maxlength="500" placeholder="Ask Alfred anything..." aria-label="Ask Alfred" autocomplete="off" spellcheck="false"/>
        <button class="af-mic" id="af-mic" type="button" aria-pressed="false" aria-label="Microphone">Mic</button>
        <button class="af-send" id="af-send">SEND</button>
      </div>
    </div>
    <div class="af-hint">TYPE, OR TAP MIC TO SPEAK</div>
  `;
  document.body.appendChild(overlay);

  // ── RIGHT PANEL: live intel feed ──────────────────────────
  (function initIntelPanel(){
    const intelPool = [
      {agent:'APEX',   text:'Pipeline reordered — highest-value path prioritised'},
      {agent:'ORACLE', text:'3 decision-critical signals detected in market data'},
      {agent:'SIGNAL', text:'Competitor movement flagged in target segment'},
      {agent:'CONVERT',text:'Conversion bottleneck isolated — recommendation ready'},
      {agent:'FORGE',  text:'Asset generation batch completed — 4 outputs staged'},
      {agent:'LEDGER', text:'Burn rate anomaly resolved — runway extended 6 weeks'},
      {agent:'CIPHER', text:'Access audit complete — no anomalies detected'},
      {agent:'MERIDIAN',text:'Operational throughput up 12% vs prior week'},
      {agent:'APEX',   text:'Strategic window identified — brief available on request'},
      {agent:'ORACLE', text:'Macro signal shift — portfolio exposure updated'},
    ];
    const container = document.getElementById('af-intel-rows');
    if(!container) return;
    let idx = Math.floor(Math.random()*intelPool.length);
    function addIntel(){
      if(!container) return;
      const item = intelPool[idx % intelPool.length]; idx++;
      const row = document.createElement('div');
      row.className = 'af-intel-row';
      const now = new Date();
      const t = now.toTimeString().slice(0,8);
      row.innerHTML = `<span class="af-intel-agent">${item.agent}</span><span class="af-intel-text">${item.text}</span><span style="font-family:var(--mono);font-size:12px;color:var(--gold-text);letter-spacing:0.15em">${t}</span>`;
      container.insertBefore(row, container.firstChild);
      while(container.children.length > 4) container.removeChild(container.lastChild);
    }
    // Seed 3 entries
    addIntel(); addIntel(); addIntel();
    // Drip new intel every 14-28s
    function scheduleNext(){ setTimeout(()=>{ addIntel(); scheduleNext(); }, 14000+Math.random()*14000); }
    scheduleNext();
  })();

  // ── SESSION CLOCK ─────────────────────────────────────────
  let _alfredOpenTime = null;
  const _sessionEl = document.getElementById('af-session-time');
  function _updateSessionClock(){
    if(!_alfredOpenTime || !_sessionEl) return;
    const s = Math.floor((Date.now()-_alfredOpenTime)/1000);
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sc = String(s%60).padStart(2,'0');
    _sessionEl.textContent = `${h}:${m}:${sc}`;
  }
  setInterval(_updateSessionClock, 1000);

  const statusEl     = document.getElementById('af-status');
  const transcriptEl = document.getElementById('af-transcript');
  const responseEl   = document.getElementById('af-response');
  const orbLabel     = document.getElementById('af-orb-label');
  const textIn       = document.getElementById('af-text-in');

  let recognition = null, listening = false, alfredOpen = false, speaking = false;
  let netState = 'standby'; // 'standby' | 'listening' | 'speaking'

  // ── BIG RING CANVAS (hero fullscreen animation) ──────────
  (function initRing(){
    const canvas = document.getElementById('af-ring-canvas');
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize(){
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Wave rings emitted on word boundaries
    const waves = []; // {r, maxR, alpha}

    // Expose emitter so speak() can trigger it
    window._alfredEmitWave = function() {
      const R = Math.min(W, H) * 0.5;
      waves.push({ r: R * 0.18, maxR: R * 0.9, alpha: 0.7 });
    };

    let angle1 = 0, angle2 = 0, angle3 = 0;
    let pulse = 0;
    let smoothPulse = 0;
    let spokeAngle = 0; // slow rotation for background spokes

    // ── drifting background particles ─────────────────────
    const PARTICLE_COUNT = 80;
    const particles = Array.from({length: PARTICLE_COUNT}, () => ({
      x: Math.random(),        // 0–1 normalised
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      r: 0.4 + Math.random() * 0.8,
      a: 0.03 + Math.random() * 0.07,
    }));

    let ringRaf = 0;
    function tick(){
      if(!alfredOpen){ ringRaf = 0; return; }
      ctx.clearRect(0,0,W,H);

      const cx = W/2, cy = H/2;
      const R = Math.min(W, H) * 0.5; // base radius unit

      // ── animated background ───────────────────────────────
      spokeAngle += 0.0008; // very slow rotation

      // slowly rotating radial spokes
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(spokeAngle);
      for(let i=0;i<24;i++){
        const a = (i/24)*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(Math.cos(a)*R*1.1, Math.sin(a)*R*1.1);
        ctx.strokeStyle=nyxColor('--indigo', 0.022);
        ctx.lineWidth=0.5; ctx.stroke();
      }
      ctx.restore();

      // ghost concentric rings (counter-rotate slowly)
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(-spokeAngle*0.4);
      [0.90, 1.04, 1.18].forEach((f,i) => {
        ctx.beginPath(); ctx.arc(0,0,R*f,0,Math.PI*2);
        ctx.setLineDash(i===1 ? [6,18] : []);
        ctx.strokeStyle=nyxColor('--indigo', 0.016);
        ctx.lineWidth=0.5; ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // drifting particles
      for(const p of particles){
        p.x += p.vx; p.y += p.vy;
        if(p.x<0) p.x=1; if(p.x>1) p.x=0;
        if(p.y<0) p.y=1; if(p.y>1) p.y=0;
        const px=p.x*W, py=p.y*H;
        const dist=Math.hypot(px-cx,py-cy);
        if(dist<R*1.2){
          ctx.beginPath(); ctx.arc(px,py,p.r,0,Math.PI*2);
          ctx.fillStyle=nyxColor('--indigo', p.a);
          ctx.fill();
        }
      }

      // decay pulse
      orbPulse *= 0.75;
      smoothPulse += (orbPulse - smoothPulse) * 0.22;

      const isSpeaking  = netState === 'speaking';
      const isListening = netState === 'listening';

      pulse += 0.04;
      const spinBase = isSpeaking ? 0.012 : isListening ? 0.009 : 0.004;
      const spinBoost = smoothPulse * 0.035;
      angle1 +=  spinBase + spinBoost;
      angle2 -= (spinBase * 0.7) + spinBoost * 0.8;
      angle3 +=  spinBase * 0.4;

      const baseGlow = isListening ? 0.9 : isSpeaking ? 0.75 : 0.45;
      const glow = Math.min(1.0, baseGlow + smoothPulse * 0.4);

      // ── radial glow at center ─────────────────────────────
      const glowR = R * (0.45 + smoothPulse * 0.25 + (isSpeaking ? Math.sin(pulse*2)*0.03 : 0));
      const radGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,glowR);
      radGrad.addColorStop(0,   nyxColor('--indigo', 0.06 * glow));
      radGrad.addColorStop(0.5, nyxColor('--indigo', 0.03 * glow));
      radGrad.addColorStop(1,   nyxColor('--indigo', 0));
      ctx.beginPath(); ctx.arc(cx,cy,glowR,0,Math.PI*2);
      ctx.fillStyle = radGrad; ctx.fill();

      // ── outermost ghost ring ──────────────────────────────
      const r0 = R * (0.78 + smoothPulse * 0.06);
      ctx.beginPath(); ctx.arc(cx,cy,r0,0,Math.PI*2);
      ctx.strokeStyle = nyxColor('--indigo', 0.06 * glow);
      ctx.lineWidth = 0.8; ctx.stroke();

      // ── large rotating dashed ring ────────────────────────
      const r1 = R * (0.65 + smoothPulse * 0.08 + (isSpeaking ? Math.sin(pulse*1.5)*0.015 : 0));
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle1);
      ctx.beginPath(); ctx.arc(0,0,r1,0,Math.PI*2);
      ctx.setLineDash([8,22]); ctx.lineWidth = 1;
      ctx.strokeStyle = nyxColor('--indigo', 0.22 * glow); ctx.stroke();
      ctx.restore();

      // ── medium counter-rotating dashed ring ───────────────
      const r2 = R * (0.50 + smoothPulse * 0.10 + (isListening ? Math.sin(pulse*2)*0.012 : 0));
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle2);
      ctx.beginPath(); ctx.arc(0,0,r2,0,Math.PI*2);
      ctx.setLineDash([5,14]); ctx.lineWidth = 1.2;
      ctx.strokeStyle = nyxColor('--indigo', 0.32 * glow); ctx.stroke();
      ctx.restore();

      // ── solid breathing ring — the main hero ring ─────────
      const breathe = isSpeaking  ? Math.sin(pulse * 2.8) * R * 0.025
                    : isListening ? Math.sin(pulse * 1.8) * R * 0.015
                    : Math.sin(pulse * 0.9) * R * 0.008;
      const r3 = R * 0.36 + breathe + smoothPulse * R * 0.10;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle3);
      ctx.beginPath(); ctx.arc(0,0,r3,0,Math.PI*2);
      ctx.setLineDash([]); ctx.lineWidth = 1.5;
      ctx.strokeStyle = nyxColor('--indigo', 0.55 * glow); ctx.stroke();
      // tick marks on this ring
      for(let i=0;i<12;i++){
        const a = (i/12)*Math.PI*2;
        const x1 = Math.cos(a)*r3, y1 = Math.sin(a)*r3;
        const x2 = Math.cos(a)*(r3+8), y2 = Math.sin(a)*(r3+8);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
        ctx.strokeStyle = nyxColor('--indigo', (i%3===0 ? 0.5 : 0.2) * glow);
        ctx.lineWidth = i%3===0 ? 1 : 0.5; ctx.stroke();
      }
      ctx.restore();

      // ── inner solid ring ──────────────────────────────────
      const r4 = R * (0.22 + smoothPulse * 0.06 + (isSpeaking ? Math.sin(pulse*3)*0.01 : 0));
      ctx.beginPath(); ctx.arc(cx,cy,r4,0,Math.PI*2);
      ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.strokeStyle = nyxColor('--indigo', 0.38 * glow); ctx.stroke();

      // ── core dot with halo ────────────────────────────────
      const coreBaseR = R * 0.04;
      const coreR = coreBaseR + smoothPulse * R * 0.07 +
                    (isSpeaking ? Math.sin(pulse*4)*coreBaseR*0.5 : 0);
      const coreGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,coreR*3.5);
      coreGrad.addColorStop(0,   nyxColor('--indigo', Math.min(1,0.95*glow)));
      coreGrad.addColorStop(0.4, nyxColor('--indigo', 0.3*glow));
      coreGrad.addColorStop(1,   nyxColor('--indigo', 0));
      ctx.beginPath(); ctx.arc(cx,cy,coreR*3.5,0,Math.PI*2);
      ctx.fillStyle=coreGrad; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,coreR,0,Math.PI*2);
      ctx.fillStyle=nyxColor('--indigo', Math.min(1,glow)); ctx.fill();

      // ── axis lines ────────────────────────────────────────
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
        const inner = R * 0.38, outer = R * 0.42;
        ctx.beginPath();
        ctx.moveTo(cx+dx*inner,cy+dy*inner);
        ctx.lineTo(cx+dx*outer,cy+dy*outer);
        ctx.strokeStyle=nyxColor('--indigo', 0.25*glow);
        ctx.lineWidth=0.8; ctx.stroke();
      });

      // ── outward wave rings (word boundary pulse) ──────────
      ctx.setLineDash([]);
      for(let i=waves.length-1;i>=0;i--){
        const w = waves[i];
        w.r += 4.5;
        w.alpha *= 0.93;
        if(w.r > w.maxR || w.alpha < 0.01){ waves.splice(i,1); continue; }
        ctx.beginPath(); ctx.arc(cx,cy,w.r,0,Math.PI*2);
        ctx.strokeStyle=nyxColor('--indigo', w.alpha * glow);
        ctx.lineWidth=1.5; ctx.stroke();
      }

      ringRaf = _pRM ? 0 : requestAnimationFrame(tick);
    }
    window._alfredRingKick = () => { if(!ringRaf) tick(); };
  })();

  // ── VOICE-REACTIVE STATE ───────────────────────────────────
  // orbPulse drives the orb animation on word boundaries
  let orbPulse = 0; // 0–1, decays each frame

  // ── VOICE ─────────────────────────────────────────────────
  function speak(text, onDone) {
    if (!window.speechSynthesis) { onDone && onDone(); return; }
    speaking = true;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    // More natural: slightly faster, less robotic pitch
    utt.rate = 0.88; utt.pitch = 0.82; utt.volume = 1;
    utt.onend  = () => { speaking = false; orbPulse = 0; mutedUntil = Date.now() + SPEAK_MUTE_MS; onDone && onDone(); };
    utt.onerror= () => { speaking = false; orbPulse = 0; mutedUntil = Date.now() + SPEAK_MUTE_MS; onDone && onDone(); };
    // Fire pulse + outward wave on every word boundary
    utt.onboundary = (e) => {
      if (e.name === 'word') {
        orbPulse = 0.85 + Math.random() * 0.15;
        if (window._alfredEmitWave) window._alfredEmitWave();
      }
    };
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      // Priority order: Daniel (most natural UK male), Arthur, Google UK Male, any UK male
      const v = voices.find(v => v.name === 'Daniel')
             || voices.find(v => v.name === 'Arthur')
             || voices.find(v => v.name === 'Google UK English Male')
             || voices.find(v => v.name === 'Thomas')
             || voices.find(v => v.lang === 'en-GB' && !v.name.match(/female|woman|Moira|Fiona/i))
             || voices.find(v => v.lang && v.lang.startsWith('en') && !v.name.match(/female|woman|Moira|Fiona|Karen|Samantha/i));
      if (v) utt.voice = v;
      window.speechSynthesis.speak(utt);
    };
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.addEventListener('voiceschanged', trySpeak, {once:true});
    } else { trySpeak(); }
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.classList.toggle('on', state === 'on');
    orbLabel.textContent = state === 'on' ? 'LISTENING' : text === 'PROCESSING' ? 'PROCESSING' : text === 'SPEAKING' ? 'SPEAKING' : 'STANDBY';
    orbLabel.classList.toggle('on', state === 'on');
    netState = state === 'on' ? 'listening' : text === 'SPEAKING' ? 'speaking' : 'standby';
    const modeEl = document.getElementById('af-mode-val');
    if(modeEl) modeEl.textContent = netState === 'listening' ? 'LISTENING' : netState === 'speaking' ? 'RESPONDING' : 'ADVISORY';
  }

  function showResponse(text) {
    responseEl.classList.remove('show');
    setTimeout(() => { responseEl.textContent = text; responseEl.classList.add('show'); }, 100);
  }

  let busyQuery = false;
  async function processQuery(query) {
    if (busyQuery) return;
    busyQuery = true;
    transcriptEl.textContent = query;
    setStatus('PROCESSING', '');
    if (window.nyxTrack) window.nyxTrack('alfred_message');
    const reply = await getReply(query);
    busyQuery = false;
    if (!alfredOpen) return;
    showResponse(reply);
    setStatus('SPEAKING', '');
    speak(reply, () => {
      if (alfredOpen && micOn) setStatus('LISTENING', 'on');
      else setStatus('STANDBY', '');
    });
  }

  // ── RECOGNITION — continuous duplex mode ──────────────────
  function stopAllRecognition() {
    if (recognition) { try { recognition.abort(); } catch(e){} recognition = null; }
  }

  // ── DUPLEX: mic runs continuously; processQuery gated by speaking flag ──
  // Alfred's own voice is captured but ignored because speaking=true during speech.
  // A brief mute window (SPEAK_MUTE_MS) after speech ends prevents the tail
  // of Alfred's voice from triggering a false query.
  const SPEAK_MUTE_MS = 600;
  let mutedUntil = 0;

  function startListening() {
    if (recognition) return; // already running
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('USE CHROME OR SAFARI', ''); return; }

    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;   // duplex — stays open
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      listening = true;
      setStatus('LISTENING', 'on');
    };

    recognition.onresult = (e) => {
      let interim = '', finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const best = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += best;
        else interim += best;
      }
      // Show interim even while speaking so transcript stays live
      if (interim && !finalText) transcriptEl.textContent = interim.toUpperCase();
      if (finalText) {
        // Suppress Alfred's own voice for SPEAK_MUTE_MS after he finishes
        if (speaking || Date.now() < mutedUntil) return;
        transcriptEl.textContent = finalText.toUpperCase();
        processQuery(finalText);
      }
    };

    // continuous mode rarely fires onend — restart if it does
    recognition.onend = () => {
      listening = false;
      recognition = null;
      if (alfredOpen && micOn) setTimeout(startListening, 80);
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') { setStatus('ALLOW MICROPHONE ACCESS', ''); recognition=null; return; }
      if (e.error === 'no-speech') return; // continuous mode — just keep going
      // any other error: restart
      recognition = null;
      if (alfredOpen && micOn) setTimeout(startListening, 200);
    };

    try { recognition.start(); } catch(err) {}
  }

  // ── MIC (opt-in) ──────────────────────────────────────────
  let micOn = false;
  const micBtn = document.getElementById('af-mic');
  function setMic(on){
    micOn = on;
    if (micBtn) micBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) startListening(); else { stopAllRecognition(); setStatus('STANDBY', ''); }
  }
  if (micBtn) micBtn.addEventListener('click', () => setMic(!micOn));

  // ── TEXT INPUT ─────────────────────────────────────────────
  document.getElementById('af-send').addEventListener('click', () => {
    const q = textIn.value.trim();
    if (!q) return;
    textIn.value = '';
    processQuery(q);
  });
  textIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = textIn.value.trim();
      if (!q) return;
      textIn.value = '';
      processQuery(q);
    }
    e.stopPropagation();
  });

  // ── OPEN / CLOSE ──────────────────────────────────────────
  function openAlfred() {
    if (alfredOpen) return;
    alfredOpen = true;
    _alfredOpenTime = Date.now();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window._alfredRingKick) window._alfredRingKick();
    transcriptEl.textContent = '';
    responseEl.textContent = ''; responseEl.classList.remove('show');
    setStatus('INITIALISING', '');
    setTimeout(() => {
      showResponse(GREETING);
      setStatus('STANDBY', '');
      textIn.focus();
    }, 400);
    if (window.nyxTrack) window.nyxTrack('alfred_open');
  }

  function closeAlfred() {
    alfredOpen = false;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setMic(false);
    window.speechSynthesis && window.speechSynthesis.cancel();
    listening = false; speaking = false;
    netState = 'standby';
    setStatus('STANDBY', '');
  }

  document.getElementById('af-close').addEventListener('click', closeAlfred);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && alfredOpen) closeAlfred(); });

  // ── EXPOSE & TRIGGERS ────────────────────────────────────
  window._openAlfred = openAlfred; // expose for external buttons

  const hudFrame = document.querySelector('.vhud-frame');
  if (hudFrame) { hudFrame.addEventListener('click', openAlfred); hudFrame.style.cursor = 'pointer'; }

  // Wire jarvis-activate-main to Alfred
  const mainBtn = document.getElementById('jarvis-activate-main');
  if (mainBtn) { mainBtn.addEventListener('click', openAlfred); }

  // No dynamic button needed — the HTML button #jarvis-activate-main is already wired above
})();

/* ── ALFRED HUB TABS (Morning Briefing / Live Feed / Voice) ──
   WAI-ARIA tabs: click, or Left/Right/Home/End when a tab has focus. */
(function(){
  const tabs = [...document.querySelectorAll('.hub-tab')];
  if (!tabs.length) return;
  function select(tab, focus){
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      select(tabs[(k + tabs.length) % tabs.length], true);
    });
  });
})();

/* ── ALFRED OVERLAY: focus trap, Esc, focus return ── */
(function(){
  const overlay = document.getElementById('alfred-overlay');
  if (!overlay) return;
  let opener = null;
  const focusables = () => [...overlay.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
  new MutationObserver(() => {
    if (overlay.classList.contains('active')) {
      opener = opener || document.activeElement;
    } else if (opener) {
      const o = opener; opener = null;
      if (o && o.focus) o.focus();
    }
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  overlay.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

/* ── ASK ALFRED LAUNCHER ── */
(function(){
  const b = document.getElementById('ask-alfred');
  if (b) b.addEventListener('click', () => { if (window._openAlfred) window._openAlfred(); });
})();
