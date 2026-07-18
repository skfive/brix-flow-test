// 릴리스 변경 승인 큐 — DOM 렌더 + 로컬 상태 영속 (BF-1063)
// 순수 로직은 state.js, 초기 데이터는 fixtures.js 에서 가져온다.
// 외부 네트워크 호출·서버 저장소 없음 — 브라우저 localStorage 로만 상태를 유지한다(기획 §1.1).

import { releaseApprovalFixture } from './fixtures.js';
import {
  loadInitialState,
  selectQueue,
  decide,
  countByStatus,
  riskBand,
} from './state.js';

const STORAGE_KEY = 'bf:release-approval-canary:v1';
const ACTOR = 'ops-operator'; // 실 인증 없음 — fixture 상 고정 운영자 식별자(기획 §3.3).

const STATUS_LABEL = { pending_review: '검토 대기', held: '보류', approved: '승인 완료' };
const STATUS_GLYPH = { pending_review: '◔', held: '▮▮', approved: '✓' };
const STATUS_MODIFIER = { pending_review: 'pending', held: 'held', approved: 'approved' };
const RISK_LABEL = { high: '고위험', mid: '중위험', low: '저위험' };
const RISK_GLYPH = { high: '▲', mid: '◆', low: '●' };

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'pending_review', label: '검토 대기' },
  { key: 'held', label: '보류' },
  { key: 'approved', label: '승인 완료' },
];

// 결정 액션 버튼 정의 (디자인 §5.6 = 기획 §3.2 전이표).
// enabledFor: 해당 상태에서만 활성. approved 는 모두 비활성(T5).
const ACTION_BUTTONS = [
  { action: 'approve', label: '승인', variant: 'primary', enabledFor: ['pending_review', 'held'] },
  { action: 'hold', label: '보류', variant: 'secondary', enabledFor: ['pending_review'] },
  { action: 'reopen', label: '재검토 요청', variant: 'tertiary', enabledFor: ['held'] },
];

/** @type {{ candidates: import('./fixtures.js').ReleaseCandidate[], activeFilter: string, selectedId: string | null }} */
const appState = {
  candidates: [],
  activeFilter: 'pending_review',
  selectedId: null,
};

// ---------- 로컬 상태 영속 ----------

/**
 * localStorage 에서 상태 복원. 없거나 fixtureVersion 불일치 시 fixture 초기값(기획 §6).
 * @returns {import('./fixtures.js').ReleaseCandidate[]}
 */
function loadPersistedState() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return loadInitialState(releaseApprovalFixture);
    const parsed = JSON.parse(raw);
    if (parsed?.fixtureVersion !== releaseApprovalFixture.fixtureVersion || !Array.isArray(parsed.candidates)) {
      // 버전 불일치 → 저장 상태 무시, fixture 재시작(마이그레이션 신설 금지, 기획 §6).
      return loadInitialState(releaseApprovalFixture);
    }
    return parsed.candidates;
  } catch {
    return loadInitialState(releaseApprovalFixture);
  }
}

/** @param {import('./fixtures.js').ReleaseCandidate[]} candidates */
function persistState(candidates) {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ fixtureVersion: releaseApprovalFixture.fixtureVersion, candidates }),
    );
  } catch {
    // 저장소 접근 불가(프라이빗 모드 등) — 메모리 상태로만 계속 동작.
  }
}

// ---------- 렌더 헬퍼 ----------

/** @param {string} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** @param {string} submittedAt ISO 문자열 → 사람이 읽는 표기(결정적, 로케일 비의존) */
function formatSubmittedAt(submittedAt) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(submittedAt);
  if (!match) return submittedAt;
  const [, y, mo, d, h, mi] = match;
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function riskBadgeHtml(c) {
  const band = riskBand(c.riskScore);
  return `<span class="badge risk-badge--${band}" aria-label="위험도 ${c.riskScore}점, ${RISK_LABEL[band]}"><span class="glyph" aria-hidden="true">${RISK_GLYPH[band]}</span> ${RISK_LABEL[band]} ${c.riskScore}</span>`;
}

/** @param {import('./fixtures.js').CandidateStatus} status */
function statusBadgeHtml(status) {
  return `<span class="badge status-badge--${STATUS_MODIFIER[status]}" aria-label="상태: ${STATUS_LABEL[status]}"><span class="glyph" aria-hidden="true">${STATUS_GLYPH[status]}</span> ${STATUS_LABEL[status]}</span>`;
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function envBadgeHtml(c) {
  const prod = c.targetEnvironment === 'production';
  return `<span class="badge env-badge${prod ? ' env-badge--production' : ''}">${escapeHtml(c.targetEnvironment)}</span>`;
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function riskFactorsHtml(c) {
  if (!c.riskFactors.length) {
    return '<span class="risk-factors--empty">위험 요인 기록 없음</span>';
  }
  return c.riskFactors.map((f) => `<span class="chip">${escapeHtml(f)}</span>`).join('');
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function cardHtml(c) {
  const band = riskBand(c.riskScore);
  const classes = ['candidate-card'];
  if (band === 'high') classes.push('candidate-card--high-risk');
  if (c.id === appState.selectedId) classes.push('candidate-card--selected');
  const factors = c.riskFactors.length
    ? `<div class="card-row risk-factors">${riskFactorsHtml(c)}</div>`
    : `<div class="card-row"><span class="risk-factors--empty">위험 요인 기록 없음</span></div>`;
  return `
    <button type="button" class="${classes.join(' ')}" data-card-id="${escapeHtml(c.id)}" aria-pressed="${c.id === appState.selectedId}">
      <div class="card-row">
        <h2 class="card-title">${escapeHtml(c.name)}</h2>
        <span class="card-version">v${escapeHtml(c.version)}</span>
        ${envBadgeHtml(c)}
      </div>
      <div class="card-row">
        ${riskBadgeHtml(c)}
        ${statusBadgeHtml(c.status)}
      </div>
      ${factors}
      <div class="card-row">
        <span class="card-meta">제출: ${escapeHtml(c.requestedBy)} · ${formatSubmittedAt(c.submittedAt)}</span>
      </div>
    </button>`;
}

/** @param {import('./fixtures.js').DecisionHistoryEntry[]} entries */
function historyHtml(entries) {
  if (!entries.length) {
    return '<p class="decision-history__empty">아직 결정 이력이 없습니다.</p>';
  }
  // 최신순(역순) 노출.
  const items = [...entries]
    .reverse()
    .map((e, idx) => {
      const seq = entries.length - idx;
      const note = e.note ? ` · "${escapeHtml(e.note)}"` : '';
      return `
      <li class="decision-history__item">
        <span class="decision-history__transition">${STATUS_LABEL[e.from]} → ${STATUS_LABEL[e.to]}</span>
        <div class="decision-history__meta">${escapeHtml(e.action)} · ${escapeHtml(e.actor)} · 결정 #${seq}${note}</div>
      </li>`;
    })
    .join('');
  return `<ol class="decision-history">${items}</ol>`;
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function decisionActionsHtml(c) {
  const terminal = c.status === 'approved';
  const buttons = ACTION_BUTTONS.map((b) => {
    const disabled = terminal || !b.enabledFor.includes(c.status);
    const attrs = disabled ? 'disabled aria-disabled="true"' : `data-action="${b.action}" data-action-id="${escapeHtml(c.id)}"`;
    return `<button type="button" class="btn btn--${b.variant}" ${attrs}>${b.label}</button>`;
  }).join('');
  const note = terminal
    ? '<p class="terminal-note">승인 완료된 후보입니다. 추가 결정을 내릴 수 없습니다.</p>'
    : '';
  return `
    <div class="decision-actions" role="group" aria-label="결정 액션">${buttons}</div>
    ${note}`;
}

/** @param {import('./fixtures.js').ReleaseCandidate} c */
function detailPanelHtml(c) {
  if (!c) {
    return `
      <div class="panel">
        <p class="decision-history__empty">큐에서 후보를 선택하면 상세와 결정 이력이 표시됩니다.</p>
      </div>`;
  }
  return `
    <div class="panel">
      <h2>${escapeHtml(c.name)} <span class="card-version">v${escapeHtml(c.version)}</span></h2>
      <div class="card-row">
        ${riskBadgeHtml(c)}
        ${statusBadgeHtml(c.status)}
        ${envBadgeHtml(c)}
      </div>

      <div class="section-label">위험 요인</div>
      <div class="risk-factors">${riskFactorsHtml(c)}</div>

      <div class="section-label">결정 이력</div>
      ${historyHtml(c.decisionHistory)}

      <div class="section-label">결정 액션</div>
      ${decisionActionsHtml(c)}
    </div>`;
}

function tabsHtml() {
  const counts = countByStatus(appState.candidates);
  return FILTERS.map(
    (f) => `<button type="button" class="filter-tab" role="tab" data-filter="${f.key}" aria-selected="${f.key === appState.activeFilter}">${f.label} <span class="count">${counts[f.key]}</span></button>`,
  ).join('');
}

function queueHtml() {
  const queue = selectQueue(appState.candidates, appState.activeFilter);
  if (!queue.length) {
    return `
      <div class="empty-queue">
        <strong>검토할 릴리스 후보 없음</strong>
        현재 이 필터에 해당하는 릴리스 후보가 없습니다. 새 후보가 큐에 들어오면 여기에 표시됩니다.
      </div>`;
  }
  return queue.map(cardHtml).join('');
}

function selectedCandidate() {
  return appState.candidates.find((c) => c.id === appState.selectedId) || null;
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = `
    <div class="page">
      <header class="queue-header">
        <h1>릴리스 변경 승인 큐</h1>
        <p>위험도가 높은 배포 후보를 검토하고 승인 · 보류 · 재검토를 결정합니다.</p>
        <div class="filter-tabs" role="tablist" aria-label="상태 필터">${tabsHtml()}</div>
      </header>
      <div class="layout">
        <section class="queue-list" aria-label="승인 큐">${queueHtml()}</section>
        <aside class="detail-panel" aria-label="후보 상세">${detailPanelHtml(selectedCandidate())}</aside>
      </div>
    </div>`;
}

// ---------- 이벤트 바인딩 (위임) ----------

function applyDecision(candidateId, action) {
  const next = decide(appState.candidates, candidateId, action, ACTOR);
  appState.candidates = next;
  appState.selectedId = candidateId;
  persistState(next);
  render();
}

function onClick(event) {
  const filterEl = event.target.closest('[data-filter]');
  if (filterEl) {
    appState.activeFilter = filterEl.getAttribute('data-filter');
    render();
    return;
  }

  const actionEl = event.target.closest('[data-action]');
  if (actionEl) {
    applyDecision(actionEl.getAttribute('data-action-id'), actionEl.getAttribute('data-action'));
    return;
  }

  const cardEl = event.target.closest('[data-card-id]');
  if (cardEl) {
    appState.selectedId = cardEl.getAttribute('data-card-id');
    render();
  }
}

export function init() {
  appState.candidates = loadPersistedState();
  render();
  document.getElementById('app')?.addEventListener('click', onClick);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
