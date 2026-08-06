// Beat Tap — engine 순수 로직 단위 테스트 (BF-1757)
// 설계 계약 §8: judge 경계 / applyJudgment 산식 / advance 자동 miss / transition 리셋 / generatePattern 결정론
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  LANE_KEYS,
  createInitialState,
  generatePattern,
  judge,
  applyJudgment,
  accuracy,
  resolveHit,
  advance,
  transition,
} from '../src/engine.js';

// 시드 고정 RNG: 결정론 검증용(§8 주입 RNG)
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    // 선형 합동 생성기(LCG) — 순수·결정론
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

test('createInitialState: 초기값(status=start, 점수·콤보·판정 0)', () => {
  const s = createInitialState();
  assert.equal(s.status, 'start');
  assert.equal(s.score, 0);
  assert.equal(s.combo, 0);
  assert.equal(s.maxCombo, 0);
  assert.equal(s.judged, 0);
  assert.equal(s.hits, 0);
  assert.deepEqual(s.counts, { perfect: 0, good: 0, miss: 0 });
  assert.deepEqual(s.notes, []);
});

// ── §8.1 judge: Perfect/Good/Miss 경계값 ─────────────────────────────
test('judge: 경계값(d=PERFECT_WINDOW → perfect, d=GOOD_WINDOW → good, 초과 → miss)', () => {
  const note = { time: 1000 };
  const c = DEFAULT_CONFIG;
  // d = 0 → perfect
  assert.equal(judge(note, 1000, c), 'perfect');
  // d = PERFECT_WINDOW(50) 폐구간 → perfect
  assert.equal(judge(note, 1000 + c.PERFECT_WINDOW, c), 'perfect');
  assert.equal(judge(note, 1000 - c.PERFECT_WINDOW, c), 'perfect');
  // d = PERFECT_WINDOW + 1 → good
  assert.equal(judge(note, 1000 + c.PERFECT_WINDOW + 1, c), 'good');
  // d = GOOD_WINDOW(120) 폐구간 → good
  assert.equal(judge(note, 1000 + c.GOOD_WINDOW, c), 'good');
  // d = GOOD_WINDOW + 1 → miss
  assert.equal(judge(note, 1000 + c.GOOD_WINDOW + 1, c), 'miss');
});

test('judge: config 주입으로 window 조정 가능', () => {
  const note = { time: 500 };
  const c = { ...DEFAULT_CONFIG, PERFECT_WINDOW: 10, GOOD_WINDOW: 20 };
  assert.equal(judge(note, 510, c), 'perfect');
  assert.equal(judge(note, 515, c), 'good');
  assert.equal(judge(note, 525, c), 'miss');
});

// ── §8.2 applyJudgment: 점수·콤보·정확도 ─────────────────────────────
test('applyJudgment: 점수 가산(perfect+300, good+100, miss+0)', () => {
  let s = createInitialState();
  s = applyJudgment(s, 'perfect');
  assert.equal(s.score, 300);
  s = applyJudgment(s, 'good');
  assert.equal(s.score, 400);
  s = applyJudgment(s, 'miss');
  assert.equal(s.score, 400);
});

test('applyJudgment: 콤보 누적 및 Miss 초기화, maxCombo 유지', () => {
  let s = createInitialState();
  s = applyJudgment(s, 'perfect'); // combo 1
  s = applyJudgment(s, 'good'); // combo 2
  s = applyJudgment(s, 'perfect'); // combo 3
  assert.equal(s.combo, 3);
  assert.equal(s.maxCombo, 3);
  s = applyJudgment(s, 'miss'); // combo 0
  assert.equal(s.combo, 0);
  assert.equal(s.maxCombo, 3); // 최대 콤보는 유지
  s = applyJudgment(s, 'perfect'); // combo 1
  assert.equal(s.combo, 1);
  assert.equal(s.maxCombo, 3);
});

test('applyJudgment: 정확도 = hits/judged, judged===0 → 100%', () => {
  let s = createInitialState();
  assert.equal(accuracy(s), 100); // 판정 전 100%
  s = applyJudgment(s, 'perfect');
  s = applyJudgment(s, 'good');
  s = applyJudgment(s, 'miss');
  assert.equal(s.judged, 3);
  assert.equal(s.hits, 2);
  assert.ok(Math.abs(accuracy(s) - (2 / 3) * 100) < 1e-9);
});

test('applyJudgment: 입력 상태를 변형하지 않는다(불변)', () => {
  const s = createInitialState();
  const next = applyJudgment(s, 'perfect');
  assert.equal(s.score, 0);
  assert.equal(s.combo, 0);
  assert.notEqual(next, s);
});

// ── resolveHit: 레인별 가장 가까운 노트 판정 ─────────────────────────
test('resolveHit: 해당 레인 가장 가까운 pending 노트 판정 + 노트 상태 갱신', () => {
  const state = {
    ...createInitialState(),
    status: 'playing',
    notes: [
      { id: 1, lane: 0, time: 1000, status: 'pending' },
      { id: 2, lane: 0, time: 2000, status: 'pending' },
      { id: 3, lane: 1, time: 1000, status: 'pending' },
    ],
  };
  const { state: next, result, noteId } = resolveHit(state, 0, 1010);
  assert.equal(result, 'perfect');
  assert.equal(noteId, 1);
  assert.equal(next.notes[0].status, 'perfect');
  assert.equal(next.notes[1].status, 'pending'); // 다른 노트는 유지
  assert.equal(next.score, 300);
});

test('resolveHit: 근처 노트 없으면(GOOD_WINDOW 초과) 무시 — 콤보/점수 불변', () => {
  const state = {
    ...createInitialState(),
    status: 'playing',
    combo: 5,
    notes: [{ id: 1, lane: 2, time: 1000, status: 'pending' }],
  };
  const { state: next, result, noteId } = resolveHit(state, 2, 5000);
  assert.equal(result, null);
  assert.equal(noteId, null);
  assert.equal(next.combo, 5);
  assert.equal(next.score, 0);
  assert.equal(next.notes[0].status, 'pending');
});

// ── §8.3 advance: 지나친 노트 자동 miss ──────────────────────────────
test('advance: 판정선을 GOOD_WINDOW 넘게 지나친 pending 노트 자동 miss', () => {
  const state = {
    ...createInitialState(),
    status: 'playing',
    combo: 3,
    notes: [
      { id: 1, lane: 0, time: 1000, status: 'pending' },
      { id: 2, lane: 1, time: 3000, status: 'pending' },
    ],
  };
  // now=1200 > 1000 + 120 → 노트1 miss, 노트2는 아직
  const next = advance(state, 1200);
  assert.equal(next.notes[0].status, 'miss');
  assert.equal(next.notes[1].status, 'pending');
  assert.equal(next.combo, 0); // miss로 콤보 초기화
  assert.equal(next.counts.miss, 1);
  assert.equal(next.status, 'playing'); // 아직 pending 남음
});

test('advance: 모든 노트 판정 완료 시 gameover 전이', () => {
  const state = {
    ...createInitialState(),
    status: 'playing',
    notes: [
      { id: 1, lane: 0, time: 1000, status: 'perfect' },
      { id: 2, lane: 1, time: 2000, status: 'pending' },
    ],
  };
  const next = advance(state, 5000); // 노트2도 miss 처리 → 모두 판정
  assert.equal(next.notes[1].status, 'miss');
  assert.equal(next.status, 'gameover');
});

test('advance: 아직 도달 전 노트는 건드리지 않는다', () => {
  const state = {
    ...createInitialState(),
    status: 'playing',
    notes: [{ id: 1, lane: 0, time: 1000, status: 'pending' }],
  };
  const next = advance(state, 900);
  assert.equal(next.notes[0].status, 'pending');
  assert.equal(next.status, 'playing');
});

// ── §8.4 transition: 상태 전이 + 리셋 ───────────────────────────────
test('transition: start→playing→paused→playing', () => {
  let s = createInitialState();
  s = transition(s, 'start');
  assert.equal(s.status, 'playing');
  s = transition(s, 'pause');
  assert.equal(s.status, 'paused');
  s = transition(s, 'resume');
  assert.equal(s.status, 'playing');
});

test('transition: finish → gameover', () => {
  let s = { ...createInitialState(), status: 'playing' };
  s = transition(s, 'finish');
  assert.equal(s.status, 'gameover');
});

test('transition: restart(gameover) → 초기값 완전 리셋', () => {
  const dirty = {
    ...createInitialState(),
    status: 'gameover',
    score: 1200,
    combo: 4,
    maxCombo: 9,
    judged: 10,
    hits: 8,
    counts: { perfect: 5, good: 3, miss: 2 },
    notes: [{ id: 1, lane: 0, time: 1000, status: 'perfect' }],
  };
  const reset = transition(dirty, 'restart');
  assert.deepEqual(reset, createInitialState());
  assert.equal(reset.status, 'start');
  assert.equal(reset.score, 0);
  assert.equal(reset.combo, 0);
});

test('transition: restart(paused) → 취소 경로도 초기값 복귀', () => {
  const s = { ...createInitialState(), status: 'paused', score: 500, combo: 2 };
  assert.deepEqual(transition(s, 'restart'), createInitialState());
});

test('transition: 유효하지 않은 전이는 상태 유지(no-op)', () => {
  const s = { ...createInitialState(), status: 'start' };
  assert.equal(transition(s, 'pause'), s); // start에서 pause 불가
  assert.equal(transition(s, 'resume'), s);
  assert.equal(transition(s, 'finish'), s);
  assert.equal(transition(s, 'unknown'), s);
});

// ── §8.5 generatePattern: 결정론 + 정렬 + lane 범위 ─────────────────
test('generatePattern: 동일 시드 RNG → 동일 패턴(결정론)', () => {
  const a = generatePattern(seededRng(42));
  const b = generatePattern(seededRng(42));
  assert.deepEqual(a, b);
});

test('generatePattern: 다른 시드 → 다른 패턴', () => {
  const a = generatePattern(seededRng(1));
  const b = generatePattern(seededRng(2));
  assert.notDeepEqual(a, b);
});

test('generatePattern: time 오름차순, lane 0~3 범위, status=pending, 고유 id', () => {
  const notes = generatePattern(seededRng(7), { count: 20 });
  assert.equal(notes.length, 20);
  const ids = new Set();
  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i];
    assert.ok(n.lane >= 0 && n.lane < 4, `lane 범위: ${n.lane}`);
    assert.equal(n.status, 'pending');
    ids.add(n.id);
    if (i > 0) assert.ok(n.time > notes[i - 1].time, 'time 오름차순');
  }
  assert.equal(ids.size, 20, 'id 고유');
});

test('generatePattern: rng()가 상한(1 근처)이어도 lane 범위 clamp', () => {
  const notes = generatePattern(() => 0.999999, { count: 4 });
  for (const n of notes) assert.ok(n.lane <= 3);
});

test('LANE_KEYS: 레인 인덱스 → D·F·J·K 매핑(§4)', () => {
  assert.deepEqual(LANE_KEYS, ['D', 'F', 'J', 'K']);
});

// ── 통합 시나리오: 게임오버 후 재시작 초기 복원(AC) ─────────────────
test('통합: 플레이 → 판정 누적 → 재시작 시 점수·콤보·정확도 초기 복원', () => {
  let s = transition(createInitialState(), 'start');
  s = { ...s, notes: generatePattern(seededRng(3), { count: 3 }) };
  // 임의 판정 누적
  const r1 = resolveHit(s, s.notes[0].lane, s.notes[0].time + 10);
  s = r1.state;
  assert.ok(s.score > 0);
  s = transition({ ...s, status: 'playing' }, 'finish');
  assert.equal(s.status, 'gameover');
  const reset = transition(s, 'restart');
  assert.equal(reset.score, 0);
  assert.equal(reset.combo, 0);
  assert.equal(accuracy(reset), 100);
  assert.equal(reset.status, 'start');
});
