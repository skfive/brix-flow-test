// 슈퍼마리오 1-1 단위 테스트 (BF-1878)
// 물리(중력/점프/낙하 상한), 충돌(축 분리·관통 없음), 상태 전이(ready→playing→cleared/gameover→ready)
// 실행: node --test supermario/tests/game.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame,
  startGame,
  stepGame,
  resetGame,
  setInput,
  parseLevel,
  isSolid,
  formatScore,
  GRAVITY,
  MOVE_SPEED,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  TILE,
  COLORS,
} from '../src/game.js';
import { LEVEL_1_1, LEGEND } from '../src/level-1-1.js';

// ── 상수/토큰 ──────────────────────────────────────────────────────────────
test('물리 상수는 설계 값과 일치한다', () => {
  assert.equal(GRAVITY, 0.5);
  assert.equal(MOVE_SPEED, 2.0);
  assert.equal(JUMP_VELOCITY, -8.0);
  assert.equal(MAX_FALL_SPEED, 10);
  assert.equal(TILE, 16);
});

test('색상 토큰은 계약 값과 일치한다', () => {
  assert.equal(COLORS.sky, '#5c94fc');
  assert.equal(COLORS.ground, '#c84c0c');
  assert.equal(COLORS.brick, '#e45c10');
  assert.equal(COLORS.mario, '#d82800');
});

// ── 레벨 파싱 ──────────────────────────────────────────────────────────────
test('parseLevel: 모든 행의 폭이 동일하다', () => {
  const width = LEVEL_1_1.rows[0].length;
  for (const row of LEVEL_1_1.rows) {
    assert.equal(row.length, width, `행 폭 불일치: "${row}"`);
  }
  const parsed = parseLevel(LEVEL_1_1);
  assert.equal(parsed.width, width);
  assert.equal(parsed.height, LEVEL_1_1.rows.length);
  assert.equal(parsed.pixelWidth, width * TILE);
});

test('parseLevel: 폭 불일치 행은 예외를 던진다', () => {
  assert.throws(() => parseLevel({ tileSize: 16, spawn: { x: 0, y: 0 }, rows: ['GG', 'G'] }));
});

test('isSolid: ground/brick/block 만 solid', () => {
  assert.equal(isSolid('ground'), true);
  assert.equal(isSolid('brick'), true);
  assert.equal(isSolid('block'), true);
  assert.equal(isSolid('empty'), false);
  assert.equal(isSolid('flag'), false);
});

test('LEGEND 범례에 필요한 타일 종류가 있다', () => {
  assert.equal(LEGEND['G'], 'ground');
  assert.equal(LEGEND['F'], 'flag');
});

// ── 초기 상태 ──────────────────────────────────────────────────────────────
test('createGame: 초기 상태는 ready, 점수 0, 스폰 위치', () => {
  const g = createGame(LEVEL_1_1);
  assert.equal(g.state, 'ready');
  assert.equal(g.score, 0);
  assert.equal(g.mario.x, LEVEL_1_1.spawn.x * TILE);
  assert.equal(g.mario.y, LEVEL_1_1.spawn.y * TILE);
});

test('ready 상태에서 stepGame 은 물리를 적분하지 않는다', () => {
  const g = createGame(LEVEL_1_1);
  const y0 = g.mario.y;
  stepGame(g);
  assert.equal(g.mario.y, y0);
  assert.equal(g.state, 'ready');
});

// ── 물리: 중력 ─────────────────────────────────────────────────────────────
test('중력: 공중에서 vy 가 증가하고 MAX_FALL_SPEED 로 clamp 된다', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  // 지면에서 멀리 떨어진 상단 공중에 배치
  g.mario.x = 5 * TILE;
  g.mario.y = 0;
  g.mario.vy = 0;
  g.mario.onGround = false;
  stepGame(g);
  assert.ok(g.mario.vy > 0, '낙하 중 vy 는 양수여야 한다');
  // 여러 프레임 후 상한 확인
  for (let i = 0; i < 60; i++) {
    g.mario.y = 0; // 낙사/충돌 방지: 계속 공중 유지
    stepGame(g);
  }
  assert.ok(g.mario.vy <= MAX_FALL_SPEED);
});

// ── 물리: 점프 ─────────────────────────────────────────────────────────────
test('점프: 접지 상태에서만 발동하고 공중 재점프는 무시된다', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  // 지면 위에 안착시키기: 스폰에서 몇 프레임 낙하 후 착지
  for (let i = 0; i < 30; i++) stepGame(g);
  assert.equal(g.mario.onGround, true, '낙하 후 지면에 접지되어야 한다');

  setInput(g, { jump: true });
  stepGame(g);
  assert.ok(g.mario.vy < 0, '점프 직후 vy 는 음수(상승)여야 한다');
  assert.equal(g.mario.onGround, false);

  // 공중에서 계속 jump 를 눌러도 재점프 없음 → vy 는 중력으로 증가만
  const vyAir = g.mario.vy;
  stepGame(g);
  assert.ok(g.mario.vy > vyAir, '공중 재점프 없이 중력만 작용해야 한다');
});

test('좌+우 동시 입력은 vx 를 상쇄한다', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  for (let i = 0; i < 30; i++) stepGame(g); // 착지
  const x0 = g.mario.x;
  setInput(g, { left: true, right: true });
  stepGame(g);
  assert.equal(g.mario.x, x0, '좌우 상쇄로 수평 이동이 없어야 한다');
});

// ── 물리: 충돌 (관통 없음) ─────────────────────────────────────────────────
test('수직 충돌: 낙하 후 지면 상단에 정렬되고 onGround=true (관통 없음)', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  for (let i = 0; i < 40; i++) stepGame(g);
  assert.equal(g.mario.onGround, true);
  // 지면 최상단 행(13행)의 top = 13*16 = 208, 마리오 높이 16 → y = 192
  const groundTop = 13 * TILE;
  assert.equal(g.mario.y, groundTop - g.mario.h, '마리오 발이 지면 상단에 맞아야 한다');
  assert.ok(g.mario.y + g.mario.h <= groundTop, '지면 관통 없음');
});

test('수평 충돌: solid 블록을 향해 이동하면 경계에서 멈춘다 (관통 없음)', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  // 5행(공중 블록 cols 20~24) 높이에 마리오를 두고 오른쪽으로 이동시켜 벽에 충돌
  g.mario.x = 18 * TILE;
  g.mario.y = 5 * TILE; // 블록과 같은 행
  g.mario.vy = 0;
  g.mario.onGround = true;
  setInput(g, { right: true });
  for (let i = 0; i < 20; i++) {
    g.mario.y = 5 * TILE; // 낙하로 행이 바뀌지 않게 고정(수평 충돌만 검증)
    g.mario.vy = 0;
    stepGame(g);
    if (g.state !== 'playing') break;
  }
  // 블록 좌측 경계(col 20)에서 멈춰야 한다 → x + w <= 20*16
  assert.ok(g.mario.x + g.mario.w <= 20 * TILE, `블록 관통: x=${g.mario.x}`);
});

// ── 상태 전이 ──────────────────────────────────────────────────────────────
test('startGame: ready → playing 전이 + 점수/스폰 초기화', () => {
  const g = createGame(LEVEL_1_1);
  const s = startGame(g);
  assert.equal(s, 'playing');
  assert.equal(g.state, 'playing');
  assert.equal(g.score, 0);
});

test('playing 중 startGame 재조작은 무시된다(중복 초기화 없음)', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  for (let i = 0; i < 30; i++) stepGame(g);
  g.score = 500;
  const x = g.mario.x;
  startGame(g); // playing 중 → 무시
  assert.equal(g.score, 500, '진행 중 재시작으로 점수가 초기화되면 안 된다');
  assert.equal(g.mario.x, x);
});

test('낙사: 구멍으로 떨어지면 gameover', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  // 지면 구멍(cols 14~16) 위에 배치 후 낙하
  g.mario.x = 15 * TILE;
  g.mario.y = 12 * TILE;
  g.mario.vy = 0;
  g.mario.onGround = false;
  for (let i = 0; i < 120; i++) {
    stepGame(g);
    if (g.state === 'gameover') break;
  }
  assert.equal(g.state, 'gameover');
});

test('클리어: 깃대에 도달하면 cleared', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  // 깃대(col 37) 앞에 배치 후 오른쪽 이동
  g.mario.x = 35 * TILE;
  g.mario.y = 12 * TILE;
  g.mario.onGround = true;
  setInput(g, { right: true });
  for (let i = 0; i < 60; i++) {
    g.mario.y = 12 * TILE;
    g.mario.vy = 0;
    stepGame(g);
    if (g.state === 'cleared') break;
  }
  assert.equal(g.state, 'cleared');
});

test('gameover 후 startGame: 상태·점수가 초기값으로 복구되고 재시작된다', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  g.state = 'gameover';
  g.score = 1234;
  const s = startGame(g); // gameover → playing 재진입
  assert.equal(s, 'playing');
  assert.equal(g.score, 0, 'SCORE 가 000000 으로 초기화되어야 한다');
  assert.equal(g.mario.x, LEVEL_1_1.spawn.x * TILE);
  assert.equal(g.mario.y, LEVEL_1_1.spawn.y * TILE);
});

test('resetGame: ready/000000 으로 되돌린다', () => {
  const g = createGame(LEVEL_1_1);
  startGame(g);
  g.score = 999;
  resetGame(g);
  assert.equal(g.state, 'ready');
  assert.equal(g.score, 0);
  assert.equal(formatScore(g.score), '000000');
});

// ── HUD 표기 ───────────────────────────────────────────────────────────────
test('formatScore: 6자리 zero-pad', () => {
  assert.equal(formatScore(0), '000000');
  assert.equal(formatScore(42), '000042');
  assert.equal(formatScore(123456), '123456');
});
