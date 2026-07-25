// 고객 피드백 우선순위 보드 — 순수 로직 (docs/plan/feedback-board-BF-1167.md)
// 부수효과·DOM·Date.now/Math.random 없음. node --test 로 결정론 검증 가능.

/** 심각도 정렬 랭크 (기획 §3.1) */
export const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/** 표시 레이블 (디자인 §2.2 / §2.3 / 기획 §2) */
export const SEVERITY_LABEL = { critical: '치명적', high: '높음', medium: '보통', low: '낮음' };
export const STATUS_LABEL = { pending_review: '검토 대기', planned: '계획됨', done: '처리 완료' };
export const CHANNEL_LABEL = { in_app: '앱 내 문의', web_form: '웹 문의 폼', email: '이메일', social: 'SNS' };

/** 선형 상태 전이 순서 (기획 §4.1) */
const NEXT_STATUS = { pending_review: 'planned', planned: 'done', done: null };

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'];
export const STATUS_ORDER = ['pending_review', 'planned', 'done'];
export const CHANNEL_ORDER = ['in_app', 'web_form', 'email', 'social'];

/**
 * 목록 정렬 (기획 §5.1): severity 랭크 내림차순 → createdAt 오름차순 → id 오름차순.
 * 원본 배열 불변, 새 배열 반환.
 */
export function sortFeedback(list) {
  return [...list].sort((a, b) => {
    const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (rank !== 0) return rank;
    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * 필터 매칭 (기획 §5.3): 카테고리 내 OR, 카테고리 간 AND, 미선택 카테고리는 전체 통과.
 * @param {{status:string[],severity:string[],channel:string[]}} selected
 */
export function matchesFilters(fb, selected) {
  const cats = ['status', 'severity', 'channel'];
  return cats.every((cat) => {
    const chosen = selected[cat] || [];
    return chosen.length === 0 || chosen.includes(fb[cat]);
  });
}

/**
 * 검색 매칭 (기획 §5.3): trim + 소문자, id/title/description substring OR.
 * 공백만 입력 시 전체 통과(EC-04).
 */
export function matchesQuery(fb, query) {
  const q = (query || '').trim().toLowerCase();
  if (q === '') return true;
  return [fb.id, fb.title, fb.description].some((field) => String(field).toLowerCase().includes(q));
}

/**
 * 필터+검색 적용 후 정렬된 목록 반환 (필터 먼저 AND 검색).
 * @param {{selected:object, query:string}} filterState
 */
export function getVisibleFeedback(list, filterState) {
  const selected = (filterState && filterState.selected) || { status: [], severity: [], channel: [] };
  const query = (filterState && filterState.query) || '';
  const filtered = list.filter((fb) => matchesFilters(fb, selected) && matchesQuery(fb, query));
  return sortFeedback(filtered);
}

/** round(x, 1) — 소수 1자리 반올림 */
function round1(x) {
  return Math.round(x * 10) / 10;
}

/** ISO8601 두 시각 간 일수 차 (createdAt → completedAt) */
function diffDays(fromIso, toIso) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return ms / 86400000;
}

/**
 * KPI 집계 (기획 §5.4): 항상 전체 fixture 기준.
 * leadTimeAvg 는 done 0건이면 null(EC-10).
 */
export function computeKpis(list) {
  const total = list.length;
  const byStatus = { pending_review: 0, planned: 0, done: 0 };
  const bySeverity = {
    critical: { count: 0, pct: 0 },
    high: { count: 0, pct: 0 },
    medium: { count: 0, pct: 0 },
    low: { count: 0, pct: 0 },
  };
  for (const fb of list) {
    if (byStatus[fb.status] !== undefined) byStatus[fb.status] += 1;
    if (bySeverity[fb.severity]) bySeverity[fb.severity].count += 1;
  }
  for (const sev of SEVERITY_ORDER) {
    bySeverity[sev].pct = total === 0 ? 0 : round1((bySeverity[sev].count / total) * 100);
  }
  const doneItems = list.filter((fb) => fb.status === 'done' && fb.completedAt);
  const leadTimeAvg = doneItems.length === 0
    ? null
    : round1(doneItems.reduce((sum, fb) => sum + diffDays(fb.createdAt, fb.completedAt), 0) / doneItems.length);
  return { total, byStatus, bySeverity, leadTimeAvg, doneCount: doneItems.length };
}

/**
 * 등록 폼 유효성 검증 (기획 §3.3).
 * @returns {{valid:boolean, errors:Record<string,string>}}
 */
export function validateFeedbackForm(input) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (title.length === 0) errors.title = '제목을 입력해 주세요.';
  else if (title.length > 100) errors.title = '제목은 100자 이내로 입력해 주세요.';
  if (description.length === 0) errors.description = '설명을 입력해 주세요.';
  else if (description.length > 1000) errors.description = '설명은 1000자 이내로 입력해 주세요.';
  if (!SEVERITY_ORDER.includes(input.severity)) errors.severity = '심각도를 선택해 주세요.';
  if (!CHANNEL_ORDER.includes(input.channel)) errors.channel = '유입 채널을 선택해 주세요.';
  return { valid: Object.keys(errors).length === 0, errors };
}

/** 다음 허용 상태 (없으면 null) */
export function nextStatusOf(status) {
  return NEXT_STATUS[status] ?? null;
}

/**
 * 상태 전이 판정 (기획 §4.1 / §4.2 가드).
 * @returns {{ok:boolean, noop?:boolean, reason?:string}}
 */
export function canTransition(from, to) {
  if (from === to) return { ok: false, noop: true }; // EC-01 no-op
  if (nextStatusOf(from) === to) return { ok: true };
  // pending_review → done: 계획 단계 생략(G1)
  if (from === 'pending_review' && to === 'done') {
    return { ok: false, reason: '계획 단계를 먼저 거쳐야 합니다.' };
  }
  // 그 외(역방향 등): G2
  return { ok: false, reason: '이미 진행된 단계는 되돌릴 수 없습니다.' };
}

/**
 * 상태 전이 적용 — 새 피드백 객체 반환(불변). 허용되지 않으면 예외.
 * @param {object} fb
 * @param {string} to
 * @param {{atIso:string, eventId:string}} meta
 */
export function applyTransition(fb, to, meta) {
  const verdict = canTransition(fb.status, to);
  if (!verdict.ok) {
    throw new Error(verdict.reason || '허용되지 않는 상태 전환입니다.');
  }
  const event = {
    id: meta.eventId,
    feedbackId: fb.id,
    type: 'STATUS_CHANGED',
    at: meta.atIso,
    from: fb.status,
    to,
    note: null,
  };
  return {
    ...fb,
    status: to,
    updatedAt: meta.atIso,
    completedAt: to === 'done' ? meta.atIso : fb.completedAt,
    history: [...fb.history, event],
  };
}

/** 다음 피드백 id 생성 — 기존 최대 숫자 +1, FB-#### 패턴 */
export function nextFeedbackId(list) {
  const max = list.reduce((m, fb) => {
    const n = parseInt(String(fb.id).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 6000);
  return `FB-${max + 1}`;
}

/**
 * 신규 피드백 레코드 생성 (기획 §3.3). status=pending_review 고정.
 * 타임스탬프는 주입(atIso) — 순수 함수 유지.
 */
export function createFeedbackRecord(input, meta) {
  return {
    id: meta.id,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    channel: input.channel,
    status: 'pending_review',
    createdAt: meta.atIso,
    updatedAt: meta.atIso,
    completedAt: null,
    history: [],
  };
}
