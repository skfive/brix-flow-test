'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_CONFIG,
  createInitialState,
  formatTime,
  nextPhase,
  displayPhase,
  phaseLabel,
  startPauseAriaLabel,
  computeElapsedTicks,
} = require('../timer.js');

// ---- formatTime ----

test('formatTime: 1500초 -> "25:00" (work 기본값)', () => {
  assert.equal(formatTime(1500), '25:00');
});

test('formatTime: 300초 -> "05:00" (rest 기본값)', () => {
  assert.equal(formatTime(300), '05:00');
});

test('formatTime: 65초 -> "01:05"', () => {
  assert.equal(formatTime(65), '01:05');
});

test('formatTime: 59초 -> "00:59"', () => {
  assert.equal(formatTime(59), '00:59');
});

test('formatTime: 0초 -> "00:00"', () => {
  assert.equal(formatTime(0), '00:00');
});

test('formatTime: 음수/NaN은 00:00으로 방어', () => {
  assert.equal(formatTime(-5), '00:00');
  assert.equal(formatTime(NaN), '00:00');
});

// ---- createInitialState ----

test('createInitialState: idle, work 초기 잔여시간, 1라운드', () => {
  const state = createInitialState();
  assert.equal(state.phase, 'idle');
  assert.equal(state.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(state.round, 1);
  assert.equal(state.totalRounds, DEFAULT_CONFIG.totalRounds);
  assert.equal(state.pausedFrom, null);
});

// ---- AC1: idle -> START_PAUSE -> work ----

test('AC1: idle 상태에서 START_PAUSE -> work 상태, work 초기 잔여시간부터 시작', () => {
  const idle = createInitialState();
  const next = nextPhase(idle, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'work');
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(phaseLabel(next), '작업');
  assert.equal(startPauseAriaLabel(next), '일시정지');
  assert.equal(displayPhase(next), 'work');
});

// ---- AC2: work 잔여시간 00:00 도달 -> rest ----

test('AC2: work 잔여시간이 0에 도달하면 rest로 전환되고 라운드는 유지된다', () => {
  const working = Object.assign({}, createInitialState(), { phase: 'work', remaining: 1, round: 2 });
  const next = nextPhase(working, { type: 'TICK' });

  assert.equal(next.phase, 'rest');
  assert.equal(next.remaining, DEFAULT_CONFIG.restDuration);
  assert.equal(next.round, 2);
  assert.equal(phaseLabel(next), '휴식');
});

// ---- AC3: rest 종료, 라운드 < 총 라운드 -> work (라운드 +1) ----

test('AC3: rest 잔여시간이 0에 도달하고 라운드가 남아있으면 work로 전환되고 라운드가 증가한다', () => {
  const resting = Object.assign({}, createInitialState(), {
    phase: 'rest',
    remaining: 1,
    round: 1,
    totalRounds: 4,
  });
  const next = nextPhase(resting, { type: 'TICK' });

  assert.equal(next.phase, 'work');
  assert.equal(next.round, 2);
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
});

// ---- AC4: rest 종료, 마지막 라운드 -> idle (세션 완료) ----

test('AC4: 마지막 라운드의 rest가 종료되면 idle로 돌아가고 완료 안내가 노출된다', () => {
  const lastResting = Object.assign({}, createInitialState(), {
    phase: 'rest',
    remaining: 1,
    round: 4,
    totalRounds: 4,
  });
  const next = nextPhase(lastResting, { type: 'TICK' });

  assert.equal(next.phase, 'idle');
  assert.equal(next.round, 1);
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(next.announcement, '모든 라운드를 완료했습니다');
});

// ---- AC5: work/rest -> START_PAUSE -> paused ----

test('AC5: work 상태에서 START_PAUSE -> paused, 직전 phase 기억, 버튼 라벨은 시작', () => {
  const working = Object.assign({}, createInitialState(), { phase: 'work', remaining: 900 });
  const next = nextPhase(working, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'paused');
  assert.equal(next.pausedFrom, 'work');
  assert.equal(next.remaining, 900, '일시정지 시 잔여시간은 멈춘 값 그대로');
  assert.equal(phaseLabel(next), '일시정지');
  assert.equal(startPauseAriaLabel(next), '시작');
  assert.equal(displayPhase(next), 'work', '색상/클래스는 직전 phase 유지');
});

test('AC5: rest 상태에서 START_PAUSE -> paused, 직전 phase(rest) 기억', () => {
  const resting = Object.assign({}, createInitialState(), { phase: 'rest', remaining: 120 });
  const next = nextPhase(resting, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'paused');
  assert.equal(next.pausedFrom, 'rest');
  assert.equal(displayPhase(next), 'rest');
});

// ---- AC6: paused -> START_PAUSE -> 기억된 phase로 복귀 ----

test('AC6: paused(work 기억) 상태에서 START_PAUSE -> work로 복귀, 남은시간 유지', () => {
  const paused = Object.assign({}, createInitialState(), {
    phase: 'paused',
    pausedFrom: 'work',
    remaining: 700,
  });
  const next = nextPhase(paused, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'work');
  assert.equal(next.pausedFrom, null);
  assert.equal(next.remaining, 700);
  assert.equal(startPauseAriaLabel(next), '일시정지');
});

test('AC6: paused(rest 기억) 상태에서 START_PAUSE -> rest로 복귀', () => {
  const paused = Object.assign({}, createInitialState(), {
    phase: 'paused',
    pausedFrom: 'rest',
    remaining: 50,
  });
  const next = nextPhase(paused, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'rest');
  assert.equal(next.remaining, 50);
});

// ---- AC7: work/rest/paused -> RESET -> idle ----

test('AC7: work 상태에서 RESET -> idle, 표시값/라운드/phase 초기화', () => {
  const working = Object.assign({}, createInitialState(), { phase: 'work', remaining: 42, round: 3 });
  const next = nextPhase(working, { type: 'RESET' });

  assert.equal(next.phase, 'idle');
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(next.round, 1);
  assert.equal(next.pausedFrom, null);
  assert.equal(startPauseAriaLabel(next), '시작');
});

test('AC7: paused 상태에서 RESET -> idle로 완전 초기화', () => {
  const paused = Object.assign({}, createInitialState(), {
    phase: 'paused',
    pausedFrom: 'rest',
    remaining: 10,
    round: 4,
  });
  const next = nextPhase(paused, { type: 'RESET' });

  assert.equal(next.phase, 'idle');
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(next.round, 1);
  assert.equal(next.pausedFrom, null);
});

// ---- AC8: idle -> RESET -> no-op ----

test('AC8: idle 상태에서 RESET은 아무 변화가 없다', () => {
  const idle = createInitialState();
  const next = nextPhase(idle, { type: 'RESET' });

  assert.deepEqual(next, idle);
});

// ---- AC9: 상태 전환마다 표시 텍스트가 변경된다 (aria-live 콘텐츠 소스) ----

test('AC9: 상태 전환 시 phaseLabel/formatTime 표시 내용이 매번 달라진다', () => {
  const idle = createInitialState();
  const work = nextPhase(idle, { type: 'START_PAUSE' });
  const paused = nextPhase(work, { type: 'START_PAUSE' });

  assert.notEqual(phaseLabel(idle), phaseLabel(work));
  assert.notEqual(phaseLabel(work), phaseLabel(paused));
});

// ---- 방어: idle/paused 상태에서 TICK은 no-op ----

test('idle 상태에서 TICK은 아무 변화가 없다 (타이머 미동작)', () => {
  const idle = createInitialState();
  const next = nextPhase(idle, { type: 'TICK' });
  assert.deepEqual(next, idle);
});

test('paused 상태에서 TICK은 카운트다운을 멈춘다 (잔여시간 불변)', () => {
  const paused = Object.assign({}, createInitialState(), {
    phase: 'paused',
    pausedFrom: 'work',
    remaining: 300,
  });
  const next = nextPhase(paused, { type: 'TICK' });
  assert.deepEqual(next, paused);
});

// ---- 연속 클릭: work <-> paused 토글만 가능 (Edge Case 4) ----

test('연속 START_PAUSE 토글은 work <-> paused 범위를 벗어나지 않는다', () => {
  const idle = createInitialState();
  const work = nextPhase(idle, { type: 'START_PAUSE' });
  const paused1 = nextPhase(work, { type: 'START_PAUSE' });
  const work2 = nextPhase(paused1, { type: 'START_PAUSE' });
  const paused2 = nextPhase(work2, { type: 'START_PAUSE' });

  assert.equal(work.phase, 'work');
  assert.equal(paused1.phase, 'paused');
  assert.equal(work2.phase, 'work');
  assert.equal(paused2.phase, 'paused');
});

// ---- 세션 완료 후 재시작 (Edge Case 5) ----

test('세션 완료(idle) 후 다시 START_PAUSE를 누르면 1라운드부터 정상 재시작된다', () => {
  const completed = Object.assign({}, createInitialState(), {
    phase: 'idle',
    round: 1,
    announcement: '모든 라운드를 완료했습니다',
  });
  const next = nextPhase(completed, { type: 'START_PAUSE' });

  assert.equal(next.phase, 'work');
  assert.equal(next.round, 1);
  assert.equal(next.remaining, DEFAULT_CONFIG.workDuration);
  assert.equal(next.announcement, null);
});

// ---- 경계: 총 라운드 1회 세션 ----

test('총 라운드가 1인 세션은 첫 rest 종료 시 바로 세션 완료(idle)된다', () => {
  const resting = Object.assign({}, createInitialState({ workDuration: 10, restDuration: 5, totalRounds: 1 }), {
    phase: 'rest',
    remaining: 1,
    round: 1,
  });
  const next = nextPhase(resting, { type: 'TICK' });

  assert.equal(next.phase, 'idle');
  assert.equal(next.round, 1);
  assert.equal(next.announcement, '모든 라운드를 완료했습니다');
});

// ---- displayPhase(idle) ----

test('displayPhase: idle 상태는 idle을 그대로 반환한다', () => {
  const idle = createInitialState();
  assert.equal(displayPhase(idle), 'idle');
});

// ---- createInitialState 커스텀 config ----

test('createInitialState: 커스텀 config를 그대로 반영한다', () => {
  const state = createInitialState({ workDuration: 20, restDuration: 10, totalRounds: 2 });
  assert.equal(state.remaining, 20);
  assert.equal(state.workDuration, 20);
  assert.equal(state.restDuration, 10);
  assert.equal(state.totalRounds, 2);
});

// ---- computeElapsedTicks (drift 보정, Edge Case 3) ----

test('computeElapsedTicks: 직전 tick이 없으면 1을 반환한다 (최초 1회)', () => {
  assert.equal(computeElapsedTicks(null, 1000), 1);
});

test('computeElapsedTicks: 정확히 1초 경과 시 1을 반환한다', () => {
  assert.equal(computeElapsedTicks(1000, 2000), 1);
});

test('computeElapsedTicks: 탭 비활성화 등으로 여러 초가 밀렸으면 그만큼 반환한다 (drift 보정)', () => {
  assert.equal(computeElapsedTicks(1000, 4700), 4);
});

test('computeElapsedTicks: 타이머 해상도 오차로 경과가 1초 미만이어도 최소 1을 반환한다', () => {
  assert.equal(computeElapsedTicks(1000, 1300), 1);
});
