/* 전 페이지 공용 로직 — 해당 요소가 없는 페이지에서는 조용히 건너뜁니다 */

const store = {
  _m: {},
  get(k, d){ try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
             catch(e){ return this._m[k] !== undefined ? this._m[k] : d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }
             catch(e){ this._m[k] = v; } }
};

let plan = store.get('bali_plan', 'A');
let doneMap = store.get('bali_tasks', {});
let preMap  = store.get('bali_pre', {});
let dayIdx = store.get('bali_day', 1);
let blockKey = null;

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const has = s => !!document.querySelector(s);

const pct = h => ((h - T0) / (T1 - T0)) * 100;
const fmt = h => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round((h % 1) * 60)).padStart(2, '0');
const visible = b => !b.plan || b.plan === 'AB' || b.plan === plan;

const HINTS = {
  A: '<b>A안 활성 · 짐바란.</b> 9/4는 차로 3분 Sunset Beach Bar, 9/7은 Locca 오션뷰 좌석. 둘 다 입장료·미니멈 없이 주문한 만큼만 냅니다. 공항 25분.',
  B: '<b>B안 활성 · 스미냑까지.</b> 9/4는 오션뷰 풀이 있는 Locca, 9/7은 르기안·꾸따 — Warung Cahaya 늦은 점심(약 4,400원), 비치워크 쇼핑, 꾸따 비치 선셋. 공항 15분이라 버퍼가 가장 넉넉합니다.'
};

/* ── D-day ────────────────────────────────── */
if (has('#dday')) {
  const diff = Math.ceil((new Date('2026-09-03T15:40:00+09:00') - new Date()) / 86400000);
  $('#dday').textContent = diff > 0 ? ('D-' + diff) : (diff === 0 ? 'D-DAY' : '여행 종료');
}

/* ── 타임라인 ─────────────────────────────── */
function renderDays(){
  const el = $('#days'); if (!el) return;
  el.innerHTML = DAYS.map((d, i) => `
    <button class="day" role="tab" aria-selected="${i === dayIdx}" data-i="${i}">
      <div class="dnum">${d.d}</div><div class="dwk">${d.wk}</div><div class="dtag">${d.tag}</div>
    </button>`).join('');
  el.querySelectorAll('.day').forEach(b => b.onclick = () => {
    dayIdx = +b.dataset.i; store.set('bali_day', dayIdx); blockKey = null;
    renderDays(); renderRail();
  });
}

function renderRail(){
  const rail = $('#rail'); if (!rail) return;
  let h = '';
  for (let t = T0; t <= T1; t++){
    if (t % 2 === 0 || t === T0)
      h += `<div class="hr" style="top:${pct(t)}%"><span>${String(t % 24).padStart(2,'0')}:00</span></div>`;
  }
  h += `<div class="sunline" style="top:${pct(SUNSET)}%"></div>`;

  DAYS[dayIdx].blocks.filter(visible).forEach((b, i) => {
    const key = dayIdx + '-' + b.n;
    if (blockKey === null && i === 0) blockKey = key;
    const short = (b.e - b.s) < 0.85;
    h += `<button class="blk ${b.k || ''} ${short ? 'short' : ''}" aria-current="${blockKey === key}"
        style="top:${pct(b.s)}%;height:${Math.max(pct(b.e) - pct(b.s), 2.2)}%" data-k="${key}">
        <div class="t">${fmt(b.s)}–${fmt(b.e)}</div>
        <div class="n">${b.n}</div>
        ${b.p ? `<div class="p">${b.p}</div>` : ''}
        ${b.plan === 'A' ? '<span class="badge">A</span>' : b.plan === 'B' ? '<span class="badge">B</span>' : ''}
      </button>`;
  });
  rail.innerHTML = h;
  rail.querySelectorAll('.blk').forEach(el => el.onclick = () => { blockKey = el.dataset.k; renderRail(); });
  renderDetail();
}

function renderDetail(){
  const box = $('#detail'); if (!box) return;
  const list = DAYS[dayIdx].blocks.filter(visible);
  const b = list.find(x => (dayIdx + '-' + x.n) === blockKey) || list[0];
  if (!b){ box.innerHTML = ''; return; }
  const acts = (b.links || []).map(([t, u]) => `<a class="act" href="${u}" target="_blank" rel="noopener">${t} ↗</a>`);
  if (b.tel) acts.push(`<a class="act warm" href="tel:${b.tel}">전화 ${b.tel}</a>`);
  box.innerHTML = `
    <div class="dt">${DAYS[dayIdx].d} ${DAYS[dayIdx].wk} · ${fmt(b.s)}–${fmt(b.e)}</div>
    <h3>${b.n}</h3>
    ${b.p ? `<div class="place">${b.p}</div>` : ''}
    ${b.note ? `<p>${b.note}</p>` : '<p style="color:var(--muted)">추가 메모 없음. 이동·버퍼용 블록입니다.</p>'}
    ${acts.length ? `<div class="acts">${acts.join('')}</div>` : ''}
    ${b.tags ? `<div class="tags">${b.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}`;
}

/* ── 예약 보드 ─────────────────────────────── */
function renderBoard(){
  const board = $('#board');
  const left = TASKS.filter(t => !doneMap[t.id]).length;
  if ($('#leftCount')) $('#leftCount').textContent = left;
  if (!board) return;
  board.innerHTML = TASKS.map(t => {
    const done = !!doneMap[t.id];
    const links = (t.links || []).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(' · ');
    return `<div class="row ${done ? 'done' : ''} ${t.now ? '' : 'soft'}">
      <button class="chk" role="checkbox" aria-checked="${done}" data-id="${t.id}" aria-label="${t.t}">${done ? '✓' : ''}</button>
      <div><div class="rt">${t.t}</div><div class="rm">${t.m}${links ? ' · ' + links : ''}</div></div>
      <span class="due ${t.now && !done ? 'now' : ''}">${t.due}</span>
    </div>`;
  }).join('');
  board.querySelectorAll('.chk').forEach(c => c.onclick = () => {
    doneMap[c.dataset.id] = !doneMap[c.dataset.id]; store.set('bali_tasks', doneMap); renderBoard();
  });
  if ($('#prog')) $('#prog').innerHTML = `완료 <b>${TASKS.length - left}</b> / ${TASKS.length} · 남은 <b>${left}</b>건`;
}

/* ── 출국 전 체크리스트 ────────────────────── */
function renderPre(){
  const box = $('#preList'); if (!box) return;
  box.innerHTML = PRE.map(([id, t, d]) => {
    const done = !!preMap[id];
    return `<div class="prow ${done ? 'done' : ''}">
      <button class="chk" role="checkbox" aria-checked="${done}" data-p="${id}" aria-label="${t}">${done ? '✓' : ''}</button>
      <div><div class="pt">${t}</div><div class="pd">${d}</div></div></div>`;
  }).join('');
  box.querySelectorAll('.chk').forEach(c => c.onclick = () => {
    preMap[c.dataset.p] = !preMap[c.dataset.p]; store.set('bali_pre', preMap); renderPre();
  });
}

/* ── 플랜 스위치 (전 페이지 동기화) ─────────── */
function setPlan(p){
  plan = p; store.set('bali_plan', p); blockKey = null;
  if ($('#btnA')) $('#btnA').setAttribute('aria-pressed', p === 'A');
  if ($('#btnB')) $('#btnB').setAttribute('aria-pressed', p === 'B');
  if ($('#planhint')) $('#planhint').innerHTML = HINTS[p];
  $$('.cmp .pick').forEach(el => el.classList.remove('pick'));
  $$('.cmp tr').forEach(tr => { const c = tr.children[p === 'A' ? 1 : 2]; if (c) c.classList.add('pick'); });
  renderRail(); renderBoard();
}
if ($('#btnA')) $('#btnA').onclick = () => setPlan('A');
if ($('#btnB')) $('#btnB').onclick = () => setPlan('B');

/* ── 브리핑 탭 ─────────────────────────────── */
$$('#btabs .bt').forEach(t => {
  t.onclick = () => {
    $$('#btabs .bt').forEach(x => x.setAttribute('aria-selected', x === t));
    $$('.bpane').forEach(p => p.classList.toggle('on', p.id === t.dataset.p));
    store.set('bali_pane', t.dataset.p);
    window.scrollTo({ top: $('#btabs').offsetTop - 70, behavior: 'smooth' });
  };
});
if (has('#btabs')) {
  const saved = store.get('bali_pane', 'p1');
  const t = $(`#btabs .bt[data-p="${saved}"]`);
  if (t && saved !== 'p1') {
    $$('#btabs .bt').forEach(x => x.setAttribute('aria-selected', x === t));
    $$('.bpane').forEach(p => p.classList.toggle('on', p.id === saved));
  }
}

/* ── 이미지 라이트박스 ─────────────────────── */
if (has('#lb')) {
  const lb = $('#lb'), lbimg = $('#lbimg');
  $$('figure img').forEach(im => im.onclick = () => { lbimg.src = im.src; lbimg.alt = im.alt; lb.classList.add('on'); });
  const close = () => lb.classList.remove('on');
  lb.onclick = close; $('#lbx').onclick = close;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

renderDays(); renderPre(); setPlan(plan);

/* ── 채팅 ─────────────────────────────────── */
if (has('#panel')) {
  const panel = $('#panel'), msgs = $('#msgs');
  const keyInput = $('#apikey'), modelInput = $('#model');
  $('#fab').onclick = () => { panel.classList.add('open'); $('#input').focus(); };
  $('#close').onclick = () => panel.classList.remove('open');

  keyInput.value = store.get('bali_key', '');
  modelInput.value = store.get('bali_model', 'claude-sonnet-4-6');
  $('#modelLbl').textContent = modelInput.value;
  $('#savekey').onclick = () => {
    store.set('bali_key', keyInput.value.trim());
    store.set('bali_model', modelInput.value.trim() || 'claude-sonnet-4-6');
    $('#modelLbl').textContent = modelInput.value.trim();
    add('sys', '키와 모델을 이 브라우저에 저장했습니다.');
  };

  const CHIPS = ['9/7 공항 버퍼 다시 계산해줘', 'A안 B안 중 뭐가 나아?', '비치클럽 예약 문구 영어로',
                 '고젝 배달 되는 와룽 정리해줘', '기사님 안 오면 어떻게 해?', '9/4 하루 어떻게 보내?'];
  $('#chips').innerHTML = CHIPS.map(c => `<button class="chip">${c}</button>`).join('');
  $$('.chip').forEach(c => c.onclick = () => { $('#input').value = c.textContent; send(); });

  function add(role, text){
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'me' : role === 'assistant' ? 'ai' : 'sys');
    d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  add('sys', '일정과 투어 브리핑 전문을 알고 있는 도우미입니다. API 키를 넣고 질문하세요.');

  const history = [];
  async function send(){
    const inp = $('#input'), text = inp.value.trim();
    if (!text) return;
    const key = keyInput.value.trim();
    if (!key){ add('sys', '먼저 위에 Anthropic API 키(sk-ant-...)를 넣고 저장을 누르세요.'); return; }
    inp.value = ''; add('user', text); history.push({ role: 'user', content: text });
    const btn = $('#send'); btn.disabled = true;
    const ph = add('assistant', '생각 중…');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: (modelInput.value.trim() || 'claude-sonnet-4-6'),
          max_tokens: 1400,
          system: systemPrompt(),
          messages: history.slice(-12)
        })
      });
      if (!res.ok){
        const t = await res.text();
        ph.remove(); add('sys', '요청 실패 (' + res.status + '). ' + t.slice(0, 220));
        btn.disabled = false; return;
      }
      const data = await res.json();
      const out = (data.content || []).map(c => c.type === 'text' ? c.text : '').filter(Boolean).join('\n').trim();
      ph.textContent = out || '(빈 응답)';
      history.push({ role: 'assistant', content: out });
    } catch (e){
      ph.remove();
      add('sys', '네트워크 오류: ' + e.message + ' — 키가 맞는지, 브라우저 확장이 요청을 막지 않는지 확인하세요.');
    }
    btn.disabled = false;
  }
  $('#send').onclick = send;
  $('#input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });
  window.__send = send;
}
