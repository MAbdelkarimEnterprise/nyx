'use strict';
/* ── INTELLIGENCE ASSESSMENT ─────────────────────────── */
(function(){
  let role = '', goal = '';
  const steps = ['as-step-1','as-step-2','as-step-3','as-step-4','as-step-5'];
  let currentStep = 0;


  function setStep(idx){
    document.querySelectorAll('.assessment-step').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    // Update progress dots
    ['ap-dot-1','ap-dot-2','ap-dot-3','ap-dot-4','ap-dot-5'].forEach((id, i) => {
      const d = document.getElementById(id);
      if(!d) return;
      d.classList.toggle('active', i === idx);
      d.classList.toggle('done', i < idx);
    });
    currentStep = idx;
    const pt = document.getElementById('as-progress');
    if(pt) pt.textContent = `Step ${idx + 1} of 5`;
    const pb = document.getElementById('n-progress-bar');
    if(pb) pb.style.transform = `scaleX(${(idx + 1) / 5})`;
    if(window.nyxTrack) window.nyxTrack('access_step_' + (idx + 1));
  }

  // Step 1 options
  document.querySelectorAll('#as-opts-1 .assessment-option').forEach(btn => {
    btn.addEventListener('click', () => {
      role = btn.dataset.val;
      try{ localStorage.setItem('nyx_role', role); }catch(e){}
      document.querySelectorAll('#as-opts-1 .assessment-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setTimeout(() => setStep(1), 350);
    });
  });

  // Step 2 options
  document.querySelectorAll('#as-opts-2 .assessment-option').forEach(btn => {
    btn.addEventListener('click', () => {
      goal = btn.dataset.val;
      try{ localStorage.setItem('nyx_goal', goal); }catch(e){}
      document.querySelectorAll('#as-opts-2 .assessment-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      setTimeout(() => setStep(2), 350);
    });
  });

  // Steps 3 & 4 — long-form fields, manual advance with Back / Continue
  const challengeEl = document.getElementById('as-challenge');
  const outcomeEl   = document.getElementById('as-outcome');
  function saveField(k, el){ if(el){ try{ localStorage.setItem(k, el.value.trim()); }catch(e){} } }
  function requireText(el, errId){
    const err = document.getElementById(errId);
    const ok = !!(el && el.value.trim());
    if(err) err.textContent = ok ? '' : 'Add a sentence or two before continuing.';
    if(!ok && el) el.focus();
    return ok;
  }
  document.querySelectorAll('#as-step-3 [data-next]').forEach(b => b.addEventListener('click', () => { if(!requireText(challengeEl, 'as-err-3')) return; saveField('nyx_challenge', challengeEl); setStep(3); }));
  document.querySelectorAll('#as-step-4 [data-next]').forEach(b => b.addEventListener('click', () => { if(!requireText(outcomeEl, 'as-err-4')) return; saveField('nyx_outcome', outcomeEl); buildProfile(); setStep(4); }));

  // Option choice (step 5). INQUIRE buttons elsewhere pre-select it.
  function selectTier(val){
    document.querySelectorAll('#as-tier .assessment-option').forEach(b => {
      const on = b.dataset.val === val;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    try{ localStorage.setItem('nyx_tier', val); }catch(e){}
  }
  document.querySelectorAll('#as-tier .assessment-option').forEach(b => b.addEventListener('click', () => selectTier(b.dataset.val)));
  window.__nyxAssessment = { setStep, selectTier, get role(){ return role; }, get goal(){ return goal; } };

  // Restore answers from an earlier visit or a failed submit, so nothing is lost.
  (function restore(){
    const ls = k => { try { return localStorage.getItem(k) || ''; } catch(_) { return ''; } };
    role = ls('nyx_role'); goal = ls('nyx_goal');
    if(role) document.querySelectorAll('#as-opts-1 .assessment-option').forEach(b => b.classList.toggle('selected', b.dataset.val === role));
    if(goal) document.querySelectorAll('#as-opts-2 .assessment-option').forEach(b => b.classList.toggle('selected', b.dataset.val === goal));
    if(challengeEl && ls('nyx_challenge')) challengeEl.value = ls('nyx_challenge');
    if(outcomeEl && ls('nyx_outcome')) outcomeEl.value = ls('nyx_outcome');
    if(ls('nyx_tier')) selectTier(ls('nyx_tier'));
  })();
  document.querySelectorAll('.assessment-back').forEach(b => b.addEventListener('click', () => setStep(Math.max(0, currentStep - 1))));

  // Final step: one-screen summary of the visitor's own answers, each editable.
  function esc(t){ return String(t || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function buildProfile(){
    const el = document.getElementById('as-profile');
    if(!el) return;
    const rows = [
      ['Identity', role, 0], ['Objective', goal, 1],
      ['Constraint', challengeEl && challengeEl.value.trim(), 2],
      ['Resolved looks like', outcomeEl && outcomeEl.value.trim(), 3],
    ];
    el.innerHTML = '<div class="ap-title">Your review</div><dl class="ap-summary">' + rows.map(([k, v, step]) =>
      `<div class="ap-row"><dt>${k}</dt><dd>${esc(v) || '—'}</dd><dd><button type="button" class="ap-edit" data-goto="${step}">Edit</button></dd></div>`
    ).join('') + '</dl>';
    el.querySelectorAll('.ap-edit').forEach(b => b.addEventListener('click', () => setStep(+b.dataset.goto)));
  }

})();
/* ── INQUIRE → ACCESS REVIEW ─────────────────────────── */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-inquire]');
  if(!b) return;
  e.preventDefault();
  const a = window.__nyxAssessment;
  if(a && b.dataset.inquire) a.selectTier(b.dataset.inquire);
  const t = document.getElementById('waitlist');
  if(t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  if(window.nyxTrack) window.nyxTrack('inquire_click', { tier: b.dataset.inquire || 'none' });
});

/* ── WAITLIST FORM ──────────────────────────────────── */
(function(){
  const btn  = document.getElementById('submit-btn');
  const inp  = document.getElementById('email-input');
  const err  = document.getElementById('error-msg');
  const wrap = document.getElementById('form-wrap');
  const succ = document.getElementById('success-wrap');
  const re   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function submit(){
    const email = inp.value.trim();
    if(!re.test(email)){
      err.textContent = 'Please enter a valid email address.';
      err.style.display = 'block'; return;
    }
    btn.disabled = true; btn.textContent = 'Submitting…';
    err.style.display = 'none';
    const ls = k => { try { return localStorage.getItem(k) || ''; } catch(_) { return ''; } };
    try{ localStorage.setItem('nyx_email', email); }catch(e){}
    const payload = {
      email, role: ls('nyx_role'), goal: ls('nyx_goal'), challenge: ls('nyx_challenge'),
      outcome: ls('nyx_outcome'), tier: ls('nyx_tier') || 'Not sure yet',
      company: (document.getElementById('hp-company') || {}).value || '',
    };
    const fail = (msg) => {
      err.textContent = msg; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Try again';
    };
    try{
      const res = await fetch('/api/waitlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      let data = {}; try { data = await res.json(); } catch(_) {}
      if(res.ok){
        ['nyx_challenge','nyx_outcome'].forEach(k => { try{ localStorage.removeItem(k); }catch(_){} });
        if(window.nyxTrack) window.nyxTrack('access_submit', { tier: payload.tier });
        wrap.style.display = 'none';
        succ.style.display = 'block';
        succ.setAttribute('tabindex', '-1'); succ.focus();
        return;
      }
      const stepFor = { role:0, goal:1, challenge:2, outcome:3 };
      if(data.field in stepFor && window.__nyxAssessment){ window.__nyxAssessment.setStep(stepFor[data.field]); }
      fail(data.error || 'Something went wrong. Your answers are saved. Try again.');
    } catch {
      fail('Network error. Your answers are saved. Try again.');
    }
  }

  if(btn) btn.addEventListener('click', submit);
  if(inp) inp.addEventListener('keydown', e => { if(e.key==='Enter') submit(); });
})();

/* ── ACCESS REVIEW KEYBOARD ─────────────────────────────
   Arrow keys move between options in a step; Enter on a choice selects it
   (native button). In the text steps Enter continues, Shift+Enter adds a line. */
(function(){
  document.querySelectorAll('.assessment-options').forEach(group => {
    group.addEventListener('keydown', e => {
      const opts = [...group.querySelectorAll('.assessment-option')];
      const i = opts.indexOf(document.activeElement);
      if (i < 0) return;
      const k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: opts.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      opts[(k + opts.length) % opts.length].focus();
    });
  });
  ['as-challenge', 'as-outcome'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      const next = el.closest('.assessment-step').querySelector('[data-next]');
      if (next) next.click();
    });
  });
  // Moving between steps puts focus on the new step's first control.
  new MutationObserver(muts => muts.forEach(m => {
    const step = m.target;
    if (step.classList.contains('active') && !step.contains(document.activeElement) && document.activeElement && document.activeElement.closest('#assessment-steps')) {
      const f = step.querySelector('.assessment-option.selected, .assessment-option, textarea, input:not(.hp), button');
      if (f) f.focus();
    }
  })).observe(document.getElementById('assessment-steps') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();
