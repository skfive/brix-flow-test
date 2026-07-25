// 리뷰 head 전환 타임라인 — 로직/데이터 계층 (BF-1185)
// 명세: docs/design/review-head-timeline-BF-1184.md
// 외부 API 호출 없이 로컬 고정 상태만으로 결정론적으로 동작한다.
// (UI 는 이 모듈이 계산한 state·steps 값만 받아 렌더 — 명세 §6.3)

// ── 상태 메타 (색+아이콘+라벨 3중 코드 — 명세 §5.1) ──────────────
export const STATE_META = {
  same: { icon: '✓', label: '동일 세대' },
  new: { icon: '↑', label: '새 세대' },
  review: { icon: '⚠', label: '검토 필요' },
};

// ── 상태 문구 (명세 §1 고정 문안 — 배지/카드/상세/aria-live 공유) ──
const STATE_PHRASE = {
  same: '직전 세대와 동일 — 재검토 불필요',
  new: '새 head로 전환됨 — 새 세대 시작',
  review: 'head 전환 + 미해결 존재 — 사람 확인 필요',
};

export function statusPhrase(state) {
  return STATE_PHRASE[state];
}

// ── 전환 단계 메타 (명세 §1 전환 단계 정의) ─────────────────────
export const STEP_LABEL = {
  detected: 'head 감지',
  diffed: '변경 계산',
  judged: '세대 판정',
  applied: '세대 반영',
};

// 단계 완료 상태 표기 (done=✓, current=●, blocked=⚠, pending=○ — 명세 §1)
export const STEP_STATUS_META = {
  done: { icon: '✓', srLabel: '완료' },
  current: { icon: '●', srLabel: '진행 중' },
  blocked: { icon: '⚠', srLabel: '사람 확인 대기' },
  pending: { icon: '○', srLabel: '대기' },
};

// ── 기준 시각 & 로컬 고정 세대 데이터 (외부 API 금지 — 명세 §1 결정론) ──
export const REFERENCE_NOW = '2026-07-25T12:00:00Z';

// 각 세대(head)의 원시 레코드. state 는 이전 세대와의 비교로 계산(§6.3).
export const SAMPLE_GENERATIONS = [
  // G0 — 기준 세대(origin). 이전 head 없음.
  { gen: 0, sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345670', author: '김리뷰', offsetMinutes: -320, additions: 0, deletions: 0, filesChanged: 0, unresolvedThreads: 0 },
  // G1 — 새 head 로 전환(미해결 없음) → new
  { gen: 1, sha: 'b2c3d4e5f60718293a4b5c6d7e8f90123456781a', author: '박작성', offsetMinutes: -215, additions: 312, deletions: 201, filesChanged: 14, unresolvedThreads: 0 },
  // G2 — SHA 변화 없음(직전과 동일) → same
  { gen: 2, sha: 'b2c3d4e5f60718293a4b5c6d7e8f90123456781a', author: '박작성', offsetMinutes: -96, additions: 0, deletions: 0, filesChanged: 0, unresolvedThreads: 0 },
  // G3 — 새 head + 미해결 스레드 존재 → review (현재 head)
  { gen: 3, sha: 'd4e5f60718293a4b5c6d7e8f901234567812a3b4', author: '이머지', offsetMinutes: -7, additions: 58, deletions: 24, filesChanged: 6, unresolvedThreads: 4 },
];

// ── 세대 상태 판정 (명세 §1 state semantics) ────────────────────
export function judgeState(record, prevRecord) {
  if (!prevRecord) return 'new'; // origin: 첫 head → 새 세대
  if (prevRecord.sha === record.sha) return 'same';
  if (record.unresolvedThreads > 0) return 'review';
  return 'new';
}

// ── 상대 시각(결정론) — 기준 시각과의 차로 계산 (명세 §6.3) ────────
export function formatRelative(deltaMs) {
  const min = Math.round(deltaMs / 60000);
  if (min <= 0) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hours = Math.round(min / 60);
  return `${hours}시간 전`;
}

// ── 타임라인 노드 구성 ──────────────────────────────────────────
export function buildTimeline(records, nowMs) {
  return records.map((rec, i) => {
    const prev = i > 0 ? records[i - 1] : null;
    const state = judgeState(rec, prev);
    const timestampMs = nowMs + rec.offsetMinutes * 60000;
    return {
      gen: rec.gen,
      sha: rec.sha,
      shortSha: rec.sha.slice(0, 7), // 7자 축약 표시(full 은 aria-label — §6.3)
      timestamp: new Date(timestampMs).toISOString(),
      relative: formatRelative(nowMs - timestampMs),
      isHead: i === records.length - 1,
      state,
      author: rec.author,
      filesChanged: rec.filesChanged,
      additions: rec.additions,
      deletions: rec.deletions,
      unresolvedThreads: rec.unresolvedThreads,
    };
  });
}

// ── 세대 연결 구간 (변경 지점 강조 — 명세 §5.3) ─────────────────
export function computeSegments(nodes) {
  const segs = [];
  for (let i = 1; i < nodes.length; i++) {
    const state = nodes[i].state;
    const changed = state === 'new' || state === 'review';
    segs.push({
      fromGen: nodes[i - 1].gen,
      toGen: nodes[i].gen,
      changeState: changed ? state : null,
    });
  }
  return segs;
}

// ── 전환 단계 트랙 데이터 (명세 §5.5 · "단계별") ────────────────
// 선택 세대(curr)로의 전환이 감지→계산→판정→반영 4단계를 어떻게 거쳤는지.
export function buildTransitionSteps(currNode, prevNode) {
  if (!prevNode) {
    // 기준 세대(G0): 이전 head 가 없어 전환이 성립하지 않음 → 전 단계 pending.
    return [
      { index: 1, stepKey: 'detected', label: STEP_LABEL.detected, status: 'pending', detail: '기준 세대 — 이전 head 없음' },
      { index: 2, stepKey: 'diffed', label: STEP_LABEL.diffed, status: 'pending', detail: '' },
      { index: 3, stepKey: 'judged', label: STEP_LABEL.judged, status: 'pending', detail: '' },
      { index: 4, stepKey: 'applied', label: STEP_LABEL.applied, status: 'pending', detail: '' },
    ];
  }
  const state = currNode.state;
  const blocked = state === 'review'; // 검토 필요 → 반영 단계가 사람 확인 대기로 멈춤(§1)
  const appliedDetail = blocked
    ? '사람 확인 대기'
    : state === 'same'
      ? '세대 유지'
      : '새 세대 반영';
  return [
    { index: 1, stepKey: 'detected', label: STEP_LABEL.detected, status: 'done', detail: `${prevNode.shortSha} → ${currNode.shortSha}` },
    { index: 2, stepKey: 'diffed', label: STEP_LABEL.diffed, status: 'done', detail: `+${currNode.additions} / −${currNode.deletions} · ${currNode.filesChanged}파일` },
    { index: 3, stepKey: 'judged', label: STEP_LABEL.judged, status: 'done', detail: STATE_META[state].label },
    { index: 4, stepKey: 'applied', label: STEP_LABEL.applied, status: blocked ? 'blocked' : 'done', detail: appliedDetail },
  ];
}

// ── 타임라인 키보드 이동 (roving tabindex — 명세 §6.4) ──────────
export function moveSelection(current, key, length) {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(length - 1, current + 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(0, current - 1);
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    default:
      return current;
  }
}
