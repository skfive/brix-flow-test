/* BF-994 · 벽돌깨기 canary — 순수 로직 단위 + 정적 가드 테스트
 * 실행: node --test demo/breakout-canary/logic.test.js
 * 대상: demo/breakout-canary/{index.html, styles.css, logic.js, main.js}
 * SSOT 승계: docs/planning/breakout-BF-988.md · docs/design/breakout-BF-988.md
 * AC 매핑:
 *   AC1(정상 렌더·무의존): 정적 가드(외부 요청 0건·module script/fetch/import 0건) + 초기 상태 계약
 *   AC2(입력·충돌·점수·승패): 패들 이동·벽/벽돌/패들 반사·점수·승리/패배 전이
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─── logic.js 를 샌드박스에서 로드해 BreakoutLogic 추출 ───
function loadLogic() {
  const ctx = { module: { exports: {} }, globalThis: {} };
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, {
    filename: "demo/breakout-canary/logic.js",
  });
  const api = ctx.module.exports;
  assert.ok(
    api && api.createInitialState,
    "logic.js 가 BreakoutLogic API 를 노출하지 않음"
  );
  return api;
}
const L = loadLogic();

// ─── 정적 가드: file:// 호환 (AC1·AC3 무의존) ────────────
test("가드: fetch/XMLHttpRequest/외부 CDN 미사용", () => {
  for (const [name, src] of [
    ["index.html", HTML],
    ["logic.js", LOGIC_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.ok(!/\bfetch\s*\(/.test(src), `${name} 에 fetch 존재`);
    assert.ok(!/XMLHttpRequest/.test(src), `${name} 에 XMLHttpRequest 존재`);
    assert.ok(!/https?:\/\//.test(src), `${name} 에 외부 URL 존재`);
  }
});

test("가드: import/export/module script 미사용 (IIFE 전역)", () => {
  for (const [name, src] of [
    ["logic.js", LOGIC_JS],
    ["main.js", MAIN_JS],
  ]) {
    assert.ok(
      !/\bimport\s|\bexport\s|\bexport\{/.test(src),
      `${name} 에 import/export 존재`
    );
  }
  assert.ok(
    !/type\s*=\s*["']module["']/.test(HTML),
    "index.html 에 type=module script 존재"
  );
});

test("가드: index.html 마크업 계약 (canvas·HUD·오버레이·버튼 식별자)", () => {
  assert.ok(/id="board"[\s\S]*width="360"[\s\S]*height="480"/.test(HTML));
  assert.ok(/data-role="score"/.test(HTML));
  assert.ok(/data-role="lives"/.test(HTML));
  assert.ok(/id="overlay"/.test(HTML));
  assert.ok(/id="serve-hint"/.test(HTML));
  for (const id of [
    "btn-start",
    "btn-resume",
    "btn-again",
    "btn-menu",
    "btn-start-bar",
    "btn-pause",
    "btn-restart",
  ]) {
    assert.ok(new RegExp(`id="${id}"`).test(HTML), `${id} 누락`);
  }
  // 라우트 반영
  assert.ok(/breakout-canary/.test(HTML), "canary 라우트 타이틀 누락");
  // logic.js·main.js 를 일반 script 로 로드
  assert.ok(/<script src="\.\/logic\.js"><\/script>/.test(HTML));
  assert.ok(/<script src="\.\/main\.js"><\/script>/.test(HTML));
});

test("가드: styles.css 하드코딩 색상 없이 토큰 참조 (design §7.4)", () => {
  assert.ok(/--board-bg:/.test(CSS));
  assert.ok(/--paddle-fill:/.test(CSS));
  assert.ok(/--brick-row-1:/.test(CSS));
  // 캔버스 논리 해상도·터치 대응
  assert.ok(/aspect-ratio:\s*3\s*\/\s*4/.test(CSS));
  assert.ok(/touch-action:\s*none/.test(CSS));
});

// ─── 순수 로직 (AC2) ────────────────────────────────────
test("createInitialState — start·점수0·생명3·벽돌40", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "start");
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.bricksAlive, 40);
  assert.equal(s.bricks.length, 40);
  assert.equal(s.bricks.every((b) => b.alive), true);
  assert.equal(s.gameoverReason, null);
});

test("createBricks — 5행×8열 행 우선 배치", () => {
  const bricks = L.createBricks();
  assert.equal(bricks.length, 40);
  assert.equal(bricks[0].x, L.BRICK_SIDE_MARGIN);
  assert.equal(bricks[0].y, L.BRICK_TOP_MARGIN);
  assert.equal(bricks[8].row, 1);
  assert.equal(bricks[8].col, 0);
});

test("clamp / degToRad — 유틸 순수 함수", () => {
  assert.equal(L.clamp(5, 0, 10), 5);
  assert.equal(L.clamp(-3, 0, 10), 0);
  assert.equal(L.clamp(99, 0, 10), 10);
  assert.ok(Math.abs(L.degToRad(180) - Math.PI) < 1e-9);
});

test("clampDt — 음수/NaN 0 처리·상한 클램프", () => {
  assert.equal(L.clampDt(-1), 0);
  assert.equal(L.clampDt(NaN), 0);
  assert.equal(L.clampDt(0), 0);
  assert.equal(L.clampDt(0.01), 0.01);
  assert.equal(L.clampDt(10), L.MAX_DT);
});

test("keyboardInputVX — 좌우 방향·동시입력 상쇄", () => {
  assert.equal(L.keyboardInputVX(false, false), 0);
  assert.equal(L.keyboardInputVX(true, false), -L.PADDLE_SPEED_KEYBOARD);
  assert.equal(L.keyboardInputVX(false, true), L.PADDLE_SPEED_KEYBOARD);
  assert.equal(L.keyboardInputVX(true, true), 0);
});

test("launchVector — 결정론·항상 위쪽·속력 고정", () => {
  const seq = [0.0, 0.0];
  const rand = () => seq.shift();
  const v = L.launchVector(rand);
  assert.ok(v.vy < 0);
  assert.ok(Math.abs(Math.hypot(v.vx, v.vy) - L.BALL_SPEED) < 1e-6);
  assert.ok(v.vx < 0);
});

test("launch — serve→playing 전이·정지 상태 무변화", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  assert.equal(s.status, "serve");
  L.launch(s, () => 0.5);
  assert.equal(s.status, "playing");
  assert.ok(s.ball.vy < 0);
  const s2 = L.createInitialState();
  L.launch(s2, () => 0.5);
  assert.equal(s2.status, "start");
});

test("reflectWalls — 좌/우/상 벽 반사, 하단 미반사", () => {
  let r = L.reflectWalls({ x: 0, y: 100, vx: -100, vy: 50 });
  assert.equal(r.vx, 100);
  r = L.reflectWalls({ x: L.BOARD_WIDTH, y: 100, vx: 100, vy: 50 });
  assert.equal(r.vx, -100);
  r = L.reflectWalls({ x: 100, y: 0, vx: 20, vy: -100 });
  assert.equal(r.vy, 100);
  r = L.reflectWalls({ x: 100, y: L.BOARD_HEIGHT, vx: 20, vy: 100 });
  assert.equal(r.vy, 100);
});

test("resolveBrickHit — 겹침 시 반사, 미겹침 시 null", () => {
  const brick = { x: 100, y: 100, width: 40, height: 16 };
  const ball = { x: 120, y: 116 + L.BALL_RADIUS - 1, vx: 10, vy: -50 };
  const hit = L.resolveBrickHit(ball, brick);
  assert.ok(hit && hit.hit);
  assert.equal(ball.vy, 50);
  const far = { x: 300, y: 300, vx: 1, vy: 1 };
  assert.equal(L.resolveBrickHit(far, brick), null);
});

test("ballHitsPaddle / paddleBounce — 패들 충돌·중앙 반사·속력 보존", () => {
  const paddleX = L.PADDLE_START_X;
  const ball = { x: paddleX + L.PADDLE_WIDTH / 2, y: L.PADDLE_Y, vx: 0, vy: 100 };
  assert.equal(L.ballHitsPaddle(ball, paddleX), true);
  const b = L.paddleBounce(ball, paddleX);
  assert.ok(Math.abs(b.vx) < 1e-6);
  assert.ok(b.vy < 0);
  assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - L.BALL_SPEED) < 1e-6);
});

test("update — paused/start/gameover/win 은 no-op", () => {
  for (const st of ["paused", "start", "gameover", "win"]) {
    const s = L.createInitialState();
    s.status = st;
    const px = s.paddle.x;
    L.update(s, 0.016, 300, () => 0.5);
    assert.equal(s.paddle.x, px, `${st} 패들 정지`);
    assert.equal(s.status, st);
  }
});

test("update — serve 중 패들 이동 + 공 추종", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  L.update(s, 0.1, 300, undefined);
  assert.ok(s.paddle.x > L.PADDLE_START_X);
  assert.equal(s.ball.x, s.paddle.x + L.PADDLE_WIDTH / 2);
});

test("update — 벽돌 파괴 시 점수 +10·bricksAlive 감소", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  s.status = "playing";
  const brick = s.bricks[0];
  s.ball.x = brick.x + brick.width / 2;
  s.ball.y = brick.y + brick.height + L.BALL_RADIUS - 1;
  s.ball.vx = 0;
  s.ball.vy = -10;
  const before = s.bricksAlive;
  L.update(s, 0.001, 0, () => 0.5);
  assert.equal(s.score, 10);
  assert.equal(s.bricksAlive, before - 1);
  assert.equal(s.bricks[0].alive, false);
});

test("update — 마지막 벽돌 파괴 시 win 전이", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  s.status = "playing";
  for (let i = 1; i < s.bricks.length; i += 1) s.bricks[i].alive = false;
  s.bricksAlive = 1;
  const brick = s.bricks[0];
  s.ball.x = brick.x + brick.width / 2;
  s.ball.y = brick.y + brick.height + L.BALL_RADIUS - 1;
  s.ball.vx = 0;
  s.ball.vy = -10;
  L.update(s, 0.001, 0, () => 0.5);
  assert.equal(s.status, "win");
  assert.equal(s.bricksAlive, 0);
});

test("update — 하단 이탈 시 생명 감소·재serve, 소진 시 gameover", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  s.status = "playing";
  s.lives = 2;
  s.ball.x = 180;
  s.ball.y = L.BOARD_HEIGHT + L.BALL_RADIUS + 5;
  s.ball.vx = 0;
  s.ball.vy = 50;
  L.update(s, 0.001, 0, () => 0.5);
  assert.equal(s.lives, 1);
  assert.equal(s.status, "serve");

  s.status = "playing";
  s.lives = 1;
  s.ball.y = L.BOARD_HEIGHT + L.BALL_RADIUS + 5;
  s.ball.vy = 50;
  L.update(s, 0.001, 0, () => 0.5);
  assert.equal(s.lives, 0);
  assert.equal(s.status, "gameover");
  assert.equal(s.gameoverReason, "out-of-lives");
});

test("update — playing 중 패들 좌우 이동·경계 클램프", () => {
  const s = L.createInitialState();
  L.resetToServe(s);
  s.status = "playing";
  s.ball.y = 200;
  s.ball.vx = 0;
  s.ball.vy = -10;
  L.update(s, 1, -1000, () => 0.5);
  assert.equal(s.paddle.x, 0);
  L.update(s, 1, 1000, () => 0.5);
  assert.equal(s.paddle.x, L.BOARD_WIDTH - L.PADDLE_WIDTH);
});
