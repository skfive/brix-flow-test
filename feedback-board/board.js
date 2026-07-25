// 고객 피드백 우선순위 보드 — DOM 배선 (docs/design/feedback-board-BF-1167.md §7)
// 순수 로직은 logic.js, 데이터는 fixtures.js. 본 파일은 렌더/이벤트/저장 어댑터만 담당.
import { loadFixture } from './fixtures.js';
import {
  getVisibleFeedback,
  computeKpis,
  validateFeedbackForm,
  canTransition,
  applyTransition,
  nextStatusOf,
  nextFeedbackId,
  createFeedbackRecord,
  SEVERITY_LABEL,
  STATUS_LABEL,
  CHANNEL_LABEL,
} from './logic.js';

/**
 * 저장 어댑터 계약 (기획 §5.5). 기본은 즉시 성공.
 * tester/dev 는 window.__feedbackBoard.setSaveAdapter 로 실패를 주입해 오류/재시도 UX 검증.
 * @type {(action:{type:string, payload:object}) => Promise<void>}
 */
let saveAdapter = () => Promise.resolve();

const state = {
  all: [],
  loading: true,
  filter: { query: '', selected: { status: [], severity: [], channel: [] } },
  saving: false,           // 등록 진행 중
  registerError: false,    // 등록 저장 실패
  lastRegisterPayload: null,
  transitioning: new Set(), // 전환 진행 중 id
  itemErrors: new Map(),    // id -> {to} 전환 실패 재시도용
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : '');
const announce = (id, msg) => { const n = $(id); if (n) n.textContent = msg; };

/* ===== KPI 렌더 (§5.1) — 항상 전체 fixture 기준 ===== */
function renderKpis() {
  const kpi = computeKpis(state.all);
  const root = $('kpi-summary');
  root.innerHTML = '';

  const total = el('div', 'kpi-card');
  total.append(el('p', 'kpi-card__label', '전체 피드백'), el('div', 'kpi-card__value', String(kpi.total)));
  root.append(total);

  const st = el('div', 'kpi-card');
  st.append(el('p', 'kpi-card__label', '상태별 건수'));
  st.append(el('div', 'kpi-card__value', `${kpi.byStatus.pending_review} · ${kpi.byStatus.planned} · ${kpi.byStatus.done}`));
  const stSplit = el('div', 'kpi-split');
  stSplit.append(
    el('span', null, `검토 대기 ${kpi.byStatus.pending_review}`),
    el('span', null, `계획됨 ${kpi.byStatus.planned}`),
    el('span', null, `처리 완료 ${kpi.byStatus.done}`),
  );
  st.append(stSplit);
  root.append(st);

  const dist = el('div', 'kpi-card');
  dist.append(el('p', 'kpi-card__label', '심각도 분포'));
  const distRow = el('div', 'kpi-dist');
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    const b = el('span', `badge badge--sev-${sev}`, `${SEVERITY_LABEL[sev]} ${kpi.bySeverity[sev].count}`);
    distRow.append(b);
  }
  dist.append(distRow);
  const distSplit = el('div', 'kpi-split');
  distSplit.append(el('span', null,
    ['critical', 'high', 'medium', 'low'].map((s) => `${SEVERITY_LABEL[s]} ${kpi.bySeverity[s].pct}%`).join(' · ')));
  dist.append(distSplit);
  root.append(dist);

  const lead = el('div', 'kpi-card');
  lead.append(el('p', 'kpi-card__label', '평균 처리 리드타임'));
  const leadVal = el('div', 'kpi-card__value');
  if (kpi.leadTimeAvg == null) {
    leadVal.textContent = '데이터 없음';
  } else {
    leadVal.append(document.createTextNode(String(kpi.leadTimeAvg)), el('span', 'unit', '일'));
  }
  lead.append(leadVal, el('div', 'caption', `처리 완료 ${kpi.doneCount}건 기준`));
  root.append(lead);
}

/* ===== 목록 렌더 (§5.4 / 상태 대체 §5.6·§5.7) ===== */
function buildItem(fb) {
  const item = el('article', 'feedback-item');
  item.dataset.id = fb.id;

  const head = el('div', 'feedback-item__head');
  head.append(el('h3', null, fb.title), el('span', 'mono', fb.id));
  item.append(head);

  const badges = el('div', 'feedback-item__badges');
  badges.append(
    el('span', `badge badge--sev-${fb.severity}`, SEVERITY_LABEL[fb.severity]),
    el('span', `badge badge--status-${fb.status}`, STATUS_LABEL[fb.status]),
  );
  item.append(badges);

  const meta = el('div', 'feedback-item__meta');
  meta.append(el('span', 'caption', `채널: ${CHANNEL_LABEL[fb.channel]}`));
  meta.append(el('span', 'caption', fb.status === 'done'
    ? `완료: ${dateOnly(fb.completedAt)}`
    : `수정: ${dateOnly(fb.updatedAt)}`));
  meta.append(el('span', 'spacer'));

  const to = nextStatusOf(fb.status);
  if (to == null) {
    meta.append(el('span', 'caption', '전환 완료 — 다음 단계 없음'));
  } else {
    const btn = el('button', 'btn btn--primary btn--sm', `${STATUS_LABEL[to]}으로`);
    btn.type = 'button';
    btn.dataset.action = 'transition';
    btn.dataset.to = to;
    if (state.transitioning.has(fb.id)) {
      btn.disabled = true;
      btn.textContent = '저장 중...';
    }
    meta.append(btn);
  }
  item.append(meta);

  // 항목 인라인 오류 + 재시도 (§5.5)
  if (state.itemErrors.has(fb.id)) {
    const errWrap = el('div', 'feedback-item__error');
    errWrap.append(document.createTextNode('저장에 실패했습니다. '));
    const retry = el('button', 'btn btn--ghost btn--sm', '다시 시도');
    retry.type = 'button';
    retry.dataset.action = 'retry-transition';
    errWrap.append(retry);
    meta.append(errWrap);
  }
  return item;
}

function renderList() {
  const region = $('list-region');
  const countNode = $('result-count');
  region.innerHTML = '';

  if (state.loading) {
    countNode.textContent = '';
    const wrap = el('div', 'state-loading');
    for (let i = 0; i < 3; i += 1) wrap.append(el('div', 'skeleton'));
    wrap.append(el('p', 'caption', '불러오는 중...'));
    region.append(wrap);
    return;
  }

  if (state.all.length === 0) {
    countNode.textContent = '0건 표시';
    const wrap = el('div', 'state-empty');
    wrap.append(el('p', null, '등록된 피드백이 없습니다.'), el('p', 'caption', '왼쪽 등록 폼에서 새 피드백을 추가해 주세요.'));
    region.append(wrap);
    return;
  }

  const visible = getVisibleFeedback(state.all, state.filter);
  countNode.textContent = `${visible.length}건 표시 · 심각도 내림차순 정렬`;
  announce('live-result', `${visible.length}건 표시`);

  if (visible.length === 0) {
    const wrap = el('div', 'state-empty');
    wrap.append(el('p', null, '조건에 맞는 피드백이 없습니다.'));
    const reset = el('button', 'btn btn--ghost btn--sm', '필터 초기화');
    reset.type = 'button';
    reset.dataset.action = 'reset-empty';
    wrap.append(reset);
    region.append(wrap);
    return;
  }

  const list = el('div', 'feedback-list');
  for (const fb of visible) list.append(buildItem(fb));
  region.append(list);
}

function renderAll() {
  renderKpis();
  renderList();
}

/* ===== 등록 폼 (§5.2) ===== */
function setFieldError(field, msg) {
  const map = { title: ['f-title', 'f-title-err'], description: ['f-desc', 'f-desc-err'], severity: ['f-sev', 'f-sev-err'], channel: ['f-ch', 'f-ch-err'] };
  const [inputId, errId] = map[field];
  const input = $(inputId);
  const err = $(errId);
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    err.textContent = msg;
    err.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    err.textContent = '';
    err.hidden = true;
  }
}

function readForm() {
  return {
    title: $('f-title').value,
    description: $('f-desc').value,
    severity: $('f-sev').value,
    channel: $('f-ch').value,
  };
}

function resetForm() {
  $('register-form').reset();
  for (const f of ['title', 'description', 'severity', 'channel']) setFieldError(f, '');
}

async function submitRegister(payload) {
  state.saving = true;
  state.registerError = false;
  $('register-error').hidden = true;
  $('register-success').hidden = true;
  const btn = $('register-submit');
  btn.disabled = true;
  btn.textContent = '저장 중...';
  announce('live-loading', '저장 중입니다');

  try {
    await saveAdapter({ type: 'create', payload });
    const record = createFeedbackRecord(payload, {
      id: nextFeedbackId(state.all),
      atIso: new Date().toISOString(), // 실사용 등록 시각(로직/픽스처는 결정론 유지, UI 이벤트에서만 현재시각 사용)
    });
    state.all.push(record);
    state.saving = false;
    state.lastRegisterPayload = null;
    resetForm();
    $('register-success').hidden = false;
    announce('live-save', '피드백이 등록되었습니다');
    announce('live-loading', '');
    renderAll();
  } catch {
    state.saving = false;
    state.registerError = true;
    state.lastRegisterPayload = payload;
    $('register-error').hidden = false;
    announce('live-save', '저장에 실패했습니다. 다시 시도해 주세요');
    announce('live-loading', '');
  } finally {
    btn.disabled = false;
    btn.textContent = '피드백 등록';
  }
}

function onSubmit(e) {
  e.preventDefault();
  if (state.saving) return;
  const payload = readForm();
  const { valid, errors } = validateFeedbackForm(payload);
  for (const f of ['title', 'description', 'severity', 'channel']) setFieldError(f, errors[f] || '');
  if (!valid) {
    // 첫 오류 필드로 포커스 이동 (EC-07)
    const order = [['title', 'f-title'], ['description', 'f-desc'], ['severity', 'f-sev'], ['channel', 'f-ch']];
    const first = order.find(([f]) => errors[f]);
    if (first) $(first[1]).focus();
    return;
  }
  submitRegister(payload);
}

/* ===== 상태 전환 (§4 / §5.4) ===== */
async function doTransition(id, to) {
  const fb = state.all.find((f) => f.id === id);
  if (!fb) return;
  const verdict = canTransition(fb.status, to);
  if (!verdict.ok) {
    if (verdict.noop) return; // EC-01
    announce('live-save', verdict.reason || '허용되지 않는 상태 전환입니다');
    return;
  }
  state.transitioning.add(id);
  state.itemErrors.delete(id);
  announce('live-loading', '저장 중입니다');
  renderList();

  try {
    await saveAdapter({ type: 'transition', payload: { id, to } });
    const updated = applyTransition(fb, to, {
      atIso: new Date().toISOString(),
      eventId: `EVT-${900000 + fb.history.length + 1}`,
    });
    const idx = state.all.findIndex((f) => f.id === id);
    state.all[idx] = updated;
    state.transitioning.delete(id);
    announce('live-save', '상태가 변경되었습니다');
    announce('live-loading', '');
    renderAll();
  } catch {
    state.transitioning.delete(id);
    state.itemErrors.set(id, { to });
    announce('live-save', '저장에 실패했습니다. 다시 시도해 주세요');
    announce('live-loading', '');
    renderList();
  }
}

/* ===== 이벤트 배선 ===== */
function collectSelected() {
  const selected = { status: [], severity: [], channel: [] };
  document.querySelectorAll('.filter-group').forEach((fs) => {
    const cat = fs.dataset.cat;
    fs.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => selected[cat].push(cb.value));
  });
  return selected;
}

function onFilterChange() {
  state.filter.query = $('q').value;
  state.filter.selected = collectSelected();
  renderList();
}

function resetFilters() {
  $('q').value = '';
  document.querySelectorAll('.filter-group input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
  state.filter = { query: '', selected: { status: [], severity: [], channel: [] } };
  renderList();
}

function wireEvents() {
  $('register-form').addEventListener('submit', onSubmit);
  $('register-retry').addEventListener('click', () => {
    if (state.lastRegisterPayload) submitRegister(state.lastRegisterPayload);
  });
  $('q').addEventListener('input', onFilterChange);
  document.querySelectorAll('.filter-group input[type="checkbox"]').forEach((cb) => cb.addEventListener('change', onFilterChange));
  $('filter-reset').addEventListener('click', resetFilters);

  // 목록/빈 상태 내 위임 클릭
  $('list-region').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'reset-empty') { resetFilters(); return; }
    const item = btn.closest('.feedback-item');
    if (!item) return;
    const id = item.dataset.id;
    if (action === 'transition') doTransition(id, btn.dataset.to);
    else if (action === 'retry-transition') {
      const pending = state.itemErrors.get(id);
      if (pending) doTransition(id, pending.to);
    }
  });
}

/* ===== 초기화 (§5.7 로딩 → 로드) ===== */
function init() {
  wireEvents();
  state.loading = true;
  renderList();
  announce('live-loading', '불러오는 중입니다');
  // 로컬 fixture 이나 최초 로딩 상태를 관찰 가능하게 microtask 이후 로드
  Promise.resolve().then(() => {
    state.all = loadFixture();
    state.loading = false;
    announce('live-loading', '');
    renderAll();
  });

  // tester/dev 용 저장 어댑터 주입 훅 (기획 §5.5)
  window.__feedbackBoard = {
    setSaveAdapter(fn) { saveAdapter = typeof fn === 'function' ? fn : (() => Promise.resolve()); },
    resetSaveAdapter() { saveAdapter = () => Promise.resolve(); },
    getState() { return state; },
  };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
