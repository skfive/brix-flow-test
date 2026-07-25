// 리뷰 증거 히트맵 — DOM 상호작용 (BF-1190)
// 브라우저 로컬 상태만 사용. 외부 API 없음.
import {
  FILES, RISK_META, VERIFY_META, LOG_STATUS_META, RISK_ORDER, VERIFY_ORDER,
} from './data.js';
import {
  filterFiles, computeStats, cellAriaLabel, countLabel,
} from './filters.js';

const state = {
  risks: new Set(),   // 비어 있으면 전체
  verify: new Set(),  // 비어 있으면 전체
  selectedId: null,
  lastFocusedCellId: null,
};

const els = {};

function q(sel) { return document.querySelector(sel); }

function init() {
  els.grid = q('#reh-grid');
  els.detail = q('#reh-detail');
  els.count = q('#reh-count');
  els.riskPills = q('#reh-risk-pills');
  els.verifyChecks = q('#reh-verify-checks');
  els.resetBtn = q('#reh-reset');
  els.dataResetBtn = q('#reh-data-reset');

  renderStats();
  bindFilters();
  bindGlobalKeys();
  render();
  renderDetail(null);
}

function renderStats() {
  const s = computeStats(FILES);
  q('#reh-stat-total').textContent = String(s.total);
  q('#reh-stat-critical').textContent = String(s.critical);
  q('#reh-stat-high').textContent = String(s.high);
  q('#reh-stat-unverified').textContent = String(s.unverified);
}

function bindFilters() {
  // 위험도 pill (다중 OR, "전체" 포함)
  els.riskPills.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter-risk]');
    if (!btn) return;
    const val = btn.dataset.filterRisk;
    if (val === 'all') {
      state.risks.clear();
    } else if (state.risks.has(val)) {
      state.risks.delete(val);
    } else {
      state.risks.add(val);
    }
    syncRiskPills();
    render();
  });

  // 검증 체크박스 (다중)
  els.verifyChecks.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-filter-verify]');
    if (!input) return;
    const val = input.dataset.filterVerify;
    if (input.checked) state.verify.add(val); else state.verify.delete(val);
    render();
  });

  els.resetBtn.addEventListener('click', resetFilters);
  els.dataResetBtn.addEventListener('click', () => {
    resetFilters();
    clearSelection(false);
  });

  syncRiskPills();
}

function resetFilters() {
  state.risks.clear();
  state.verify.clear();
  syncRiskPills();
  for (const input of els.verifyChecks.querySelectorAll('input[data-filter-verify]')) {
    input.checked = false;
  }
  render();
}

function syncRiskPills() {
  for (const btn of els.riskPills.querySelectorAll('button[data-filter-risk]')) {
    const val = btn.dataset.filterRisk;
    const active = val === 'all' ? state.risks.size === 0 : state.risks.has(val);
    btn.setAttribute('aria-pressed', String(active));
  }
}

function render() {
  const shown = filterFiles(FILES, { risks: state.risks, verify: state.verify });
  els.grid.textContent = '';
  for (const f of shown) {
    els.grid.appendChild(buildCell(f));
  }
  els.count.textContent = countLabel(shown.length, FILES.length);

  // 선택된 셀이 필터로 사라지면 상세 해제
  if (state.selectedId && !shown.some((f) => f.id === state.selectedId)) {
    clearSelection(false);
  }
}

function buildCell(f) {
  const rm = RISK_META[f.risk];
  const vm = VERIFY_META[f.verify];
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'reh-cell';
  btn.dataset.risk = f.risk;
  btn.dataset.verify = f.verify;
  btn.dataset.id = f.id;
  btn.setAttribute('aria-pressed', String(state.selectedId === f.id));
  btn.setAttribute('aria-label', cellAriaLabel(f));

  const top = document.createElement('div');
  top.className = 'reh-cell__top';
  const icon = document.createElement('span');
  icon.className = 'reh-cell__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = rm.icon;
  const vf = document.createElement('span');
  vf.className = `reh-vf reh-vf--${f.verify}`;
  vf.setAttribute('aria-hidden', 'true');
  vf.textContent = `${vm.icon} ${vm.short}`;
  top.append(icon, vf);

  const path = document.createElement('div');
  path.className = 'reh-cell__path';
  path.textContent = f.path;

  const meta = document.createElement('div');
  meta.className = 'reh-cell__meta';
  const label = document.createElement('span');
  label.className = 'reh-cell__label';
  label.setAttribute('aria-hidden', 'true');
  label.textContent = rm.label;
  const findings = document.createElement('span');
  findings.className = 'reh-cell__findings';
  findings.setAttribute('aria-hidden', 'true');
  findings.textContent = `${f.findings}건`;
  meta.append(label, findings);

  btn.append(top, path, meta);
  btn.addEventListener('click', () => selectCell(f.id));
  return btn;
}

function selectCell(id) {
  const wasSelected = state.selectedId === id;
  state.lastFocusedCellId = id;
  if (wasSelected) {
    clearSelection(true);
    return;
  }
  state.selectedId = id;
  for (const btn of els.grid.querySelectorAll('.reh-cell')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.id === id));
  }
  const file = FILES.find((f) => f.id === id);
  renderDetail(file);
  // 상세 패널로 포커스 이동
  els.detail.focus();
}

function clearSelection(returnFocus) {
  const prevId = state.selectedId ?? state.lastFocusedCellId;
  state.selectedId = null;
  for (const btn of els.grid.querySelectorAll('.reh-cell')) {
    btn.setAttribute('aria-pressed', 'false');
  }
  renderDetail(null);
  if (returnFocus && prevId) {
    const cell = els.grid.querySelector(`.reh-cell[data-id="${prevId}"]`);
    if (cell) cell.focus();
  }
}

function renderDetail(file) {
  els.detail.textContent = '';
  els.detail.dataset.open = String(Boolean(file));

  if (!file) {
    const ph = document.createElement('p');
    ph.className = 'reh-detail__placeholder';
    ph.textContent = '좌측 히트맵에서 파일을 선택하세요.';
    els.detail.appendChild(ph);
    return;
  }

  const rm = RISK_META[file.risk];
  const vm = VERIFY_META[file.verify];

  // head
  const head = document.createElement('div');
  head.className = 'reh-detail__head';
  const headInfo = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'reh-detail__title';
  title.id = 'reh-detail-title';
  title.textContent = file.path;
  const badges = document.createElement('div');
  badges.className = 'reh-detail__badges';
  const riskBadge = document.createElement('span');
  riskBadge.className = `reh-badge reh-badge--${file.risk}`;
  riskBadge.textContent = `${rm.icon} ${rm.label}`;
  const vfBadge = document.createElement('span');
  vfBadge.className = `reh-vf reh-vf--${file.verify}`;
  vfBadge.textContent = `${vm.icon} ${vm.label}`;
  badges.append(riskBadge, vfBadge);
  headInfo.append(title, badges);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'reh-close';
  close.textContent = '✕ 닫기';
  close.setAttribute('aria-label', '상세 패널 닫기');
  close.addEventListener('click', () => clearSelection(true));
  head.append(headInfo, close);

  // metrics
  const metrics = document.createElement('div');
  metrics.className = 'reh-metrics';
  metrics.append(
    metricSpan('변경 라인', file.changedLines),
    metricSpan('발견 이슈', file.findings),
    metricSpan('마지막 검증', file.lastVerified),
  );

  els.detail.append(head, metrics);

  // issues
  const issuesTitle = document.createElement('h4');
  issuesTitle.textContent = `발견 이슈 (${file.findings})`;
  els.detail.appendChild(issuesTitle);
  if (file.issues.length === 0) {
    const none = document.createElement('p');
    none.className = 'reh-issue__note';
    none.textContent = '발견된 이슈가 없습니다.';
    els.detail.appendChild(none);
  } else {
    for (const iss of file.issues) {
      els.detail.appendChild(buildIssue(iss));
    }
  }

  // verify log
  const logTitle = document.createElement('h4');
  logTitle.textContent = '검증 로그';
  els.detail.appendChild(logTitle);
  const log = document.createElement('ul');
  log.className = 'reh-log';
  for (const entry of file.verifyLog) {
    log.appendChild(buildLogItem(entry));
  }
  els.detail.appendChild(log);
}

function metricSpan(label, value) {
  const span = document.createElement('span');
  const b = document.createElement('b');
  b.textContent = String(value);
  span.append(`${label} `, b);
  return span;
}

function buildIssue(iss) {
  const im = RISK_META[iss.severity] ?? { icon: '•', label: iss.severity };
  const box = document.createElement('div');
  box.className = 'reh-issue';
  const h = document.createElement('div');
  h.className = 'reh-issue__head';
  const ic = document.createElement('span');
  ic.className = `reh-issue__sev reh-issue__sev--${iss.severity}`;
  ic.setAttribute('aria-hidden', 'true');
  ic.textContent = im.icon;
  const sev = document.createElement('span');
  sev.className = 'reh-issue__sevlabel';
  sev.textContent = `[${im.label}]`;
  const t = document.createElement('span');
  t.textContent = ` ${iss.title} `;
  const line = document.createElement('span');
  line.className = 'reh-issue__line';
  line.textContent = iss.lineStart === iss.lineEnd ? `L${iss.lineStart}` : `L${iss.lineStart}–L${iss.lineEnd}`;
  h.append(ic, sev, t, line);
  const note = document.createElement('p');
  note.className = 'reh-issue__note';
  note.textContent = iss.note;
  box.append(h, note);
  return box;
}

function buildLogItem(entry) {
  const sm = LOG_STATUS_META[entry.status] ?? { icon: '•', label: entry.status };
  const li = document.createElement('li');
  const st = document.createElement('span');
  st.className = `reh-log__st reh-log__st--${entry.status}`;
  st.setAttribute('aria-hidden', 'true');
  st.textContent = sm.icon;
  const text = document.createElement('span');
  text.textContent = `${entry.step} — ${entry.note} (${sm.label})`;
  li.append(st, text);
  return li;
}

function bindGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedId) {
      e.preventDefault();
      clearSelection(true);
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export { state, init };
