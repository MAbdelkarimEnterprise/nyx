'use strict';
/* ════════════════════════════════════════════════════════════
   PHASE 2 — LIVE AGENT CARDS + CLAUDE API
   ════════════════════════════════════════════════════════════ */
(function(){
  const modal     = document.getElementById('agent-modal');
  const backdrop  = document.getElementById('agent-modal-backdrop');
  const closeBtn  = document.getElementById('agent-modal-close');
  const agentIdEl = document.getElementById('modal-agent-id');
  const roleEl    = document.getElementById('modal-agent-role');
  const laText    = document.getElementById('modal-la-text');
  const responseEl= document.getElementById('modal-response');
  const cmdInput  = document.getElementById('modal-command-input');
  const sendBtn   = document.getElementById('modal-send-btn');
  if(!modal) return;

  let currentAgent = null;
  let history      = [];   // [{role, content}] — last 6 entries
  let busy         = false;

  const LAST_ACTIONS = {
    apex:    'Monitoring network-wide strategic objectives.',
    oracle:  'Running competitive signal scan.',
    signal:  'Analyzing audience engagement patterns.',
    convert: 'Processing pipeline conversion metrics.',
    forge:   'Infrastructure health check completed.',
    ledger:  'Cash flow projection updated.',
  };

  function openModal(agentKey, role) {
    currentAgent = agentKey;
    history = [];
    if(agentIdEl) agentIdEl.textContent = agentKey.toUpperCase();
    if(roleEl)    roleEl.textContent    = role;
    if(laText)    laText.textContent    = LAST_ACTIONS[agentKey] || 'Standing by.';
    if(responseEl) responseEl.innerHTML = '';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => cmdInput && cmdInput.focus(), 50);
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    currentAgent = null;
    history = [];
    busy = false;
  }

  function logLine(text, type) {
    if(!responseEl) return;
    const row = document.createElement('div');
    row.className = 'modal-log-line modal-log-' + type;
    row.innerHTML = '<span class="modal-log-prefix">' + (type==='user'?'>':'◈') + '</span>'
      + '<span class="modal-log-text">' + text + '</span>';
    responseEl.appendChild(row);
    responseEl.scrollTop = responseEl.scrollHeight;
  }

  function showThinking() {
    const el = document.createElement('div');
    el.className = 'agent-modal-thinking';
    el.id = 'modal-thinking';
    el.innerHTML = '<span></span><span></span><span></span>';
    responseEl.appendChild(el);
    responseEl.scrollTop = responseEl.scrollHeight;
    return el;
  }

  function typeOut(el, text, cb) {
    let i = 0;
    el.textContent = '';
    const tick = () => {
      el.textContent += text[i++];
      responseEl.scrollTop = responseEl.scrollHeight;
      if(i < text.length) setTimeout(tick, 14);
      else if(cb) cb();
    };
    tick();
  }

  async function sendCommand() {
    if(busy || !currentAgent) return;
    const cmd = cmdInput && cmdInput.value.trim();
    if(!cmd) return;
    cmdInput.value = '';
    busy = true;
    sendBtn && (sendBtn.disabled = true);

    logLine(cmd, 'user');
    history.push({ role: 'user', content: cmd });

    const thinking = showThinking();

    try {
      const res = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agent: currentAgent, command: cmd, history: history.slice(-6) }),
      });

      thinking.remove();

      const data = await res.json().catch(() => ({}));
      if(!res.ok) throw new Error(data.response || 'The line is quiet. Try again in a moment.');
      const text = data.response || 'No response.';

      history.push({ role: 'assistant', content: text });
      if(laText) laText.textContent = cmd.substring(0,80) + (cmd.length > 80 ? '…' : '');

      // add row then type into it
      const row = document.createElement('div');
      row.className = 'modal-log-line modal-log-system';
      const prefix = document.createElement('span');
      prefix.className = 'modal-log-prefix';
      prefix.textContent = '◈';
      const textSpan = document.createElement('span');
      textSpan.className = 'modal-log-text';
      row.appendChild(prefix);
      row.appendChild(textSpan);
      responseEl.appendChild(row);

      typeOut(textSpan, text, () => { busy = false; sendBtn && (sendBtn.disabled = false); });

    } catch(err) {
      thinking.remove();
      logLine(err.message || 'The line is quiet. Try again in a moment.', 'system');
      busy = false;
      sendBtn && (sendBtn.disabled = false);
    }
  }

  // wire agent cards
  document.querySelectorAll('.agent-card[data-agent]').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.agent, card.dataset.role));
    card.addEventListener('keydown', e => {
      if(e.key==='Enter'||e.key===' ') { e.preventDefault(); openModal(card.dataset.agent, card.dataset.role); }
    });
  });

  if(closeBtn)  closeBtn.addEventListener('click', closeModal);
  if(backdrop)  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && modal.classList.contains('active')) closeModal(); });
  if(sendBtn)   sendBtn.addEventListener('click', sendCommand);
  if(cmdInput)  cmdInput.addEventListener('keydown', e => { if(e.key==='Enter') sendCommand(); });
})();

(function(){
  var SEL = '.agent-card[data-agent], a[href*="command"]';
  function toInquiry(){
    var t = document.getElementById('waitlist');
    if(t) t.scrollIntoView({behavior:'smooth', block:'start'});
  }
  function intercept(e){
    if(e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target && e.target.closest && e.target.closest(SEL);
    if(!el) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    toInquiry();
  }
  document.addEventListener('click', intercept, true);
  document.addEventListener('keydown', intercept, true);
  // Close anything that somehow opened
  ['agent-modal'].forEach(function(id){ var el=document.getElementById(id); if(el){ el.classList.remove('active'); el.setAttribute('aria-hidden','true'); }});
  // Relabel triggers
  document.querySelectorAll('.vhud-frame').forEach(function(el){ el.setAttribute('aria-label','Ask Alfred'); });
  document.querySelectorAll('.vhud-status').forEach(function(el){ el.textContent = 'ASK ALFRED'; });
  document.querySelectorAll('.agent-card[data-agent]').forEach(function(el){ el.setAttribute('aria-label', (el.dataset.agent||'Agent') + ' — request access'); });
})();
