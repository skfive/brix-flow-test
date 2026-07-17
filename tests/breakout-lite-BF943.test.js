// BF-943 · 브레이크아웃 라이트(Breakout Lite) 단위 테스트 (focused scope · module: breakout-lite)
// - 대상: phase18-games/breakout-lite/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/breakout-lite-BF943.test.js
// - 기획 SSOT: docs/plan/breakout-lite-BF-941.md (§3~§7 규칙·상태·엣지케이스)
// - 디자인 SSOT: docs/design/breakout-lite-BF-942.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축:
//   ① 상수·초기 상태(§3.1·§6.1)  ② 벽돌 4×6=24 배치(§3.2)
//   ③ 벽 반사(§3.4)  ④ 벽돌 충돌·점수(§3.4·§4.1)  ⑤ 패들 단순 대칭 반사(§3.4·§8)
//   ⑥ 발사 벡터 고정 속도(§3.6, rand 주입)  ⑦ 상태 전이(idle/serve/playing/paused/win/lose §6.2)
//   ⑧ 생명 손실·재부착·패배(§4.2·§4.3·§7-7)  ⑨ 동시 키 상쇄(§5.2·§7-1)
//   ⑩ 재시작 리셋(§6.3)  ⑪ 정적 가드(§8/§9 외부 의존성 0건) + 마크업 계약

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "breakout-lite");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─── logic.js 를 샌드박스에서 로드해 BreakoutLiteLogic 추출 ───
function loadLogic() {
  const ctx = { globalThis: undefined, module: { exports: {} }, Math: Math };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, { filename: "phase18-games/breakout-lite/logic.js" });
  const api = ctx.module.exports;
  assert.ok(api && api.createInitialState, "logic.js 가 BreakoutLiteLogic API 를 노출하지 않음");
  return api;
}

const L = loadLogic();

// 결정론 rand 헬퍼: 미리 정한 시퀀스를 순서대로 반환
function seqRand(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// ══════════════════════════════════════════════════════════
// ⑪-a) vanilla-static file:// 안전 가드 (planner §9)
// ══════════════════════════════════════════════════════════
test("가드: <script type=module> 미사용 (file:// CORS 안전)", () => {
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS]]) {
    assert.ok(!/type\s*=\s*["']module["']/.test(src), `${name} 에 type="module" 존재`);
  }
});

test("가드: import/export 구문 미사용", () => {
  for (const [name, src] of [["logic.js", LOGIC_JS], ["main.js", MAIN_JS]]) {
    assert.ok(!/\bimport\s|\bexport\s|\bexport\{/.test(src), `${name} 에 import/export 존재`);
  }
});

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건 (§8·§9)", () => {
  const re = /fetch\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\/|localStorage|sessionStorage/;
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS], ["styles.css", CSS]]) {
    assert.ok(!re.test(src), `${name} 에 외부 의존성/영속저장 흔적 존재`);
  }
});

test("가드: 외부 CDN link/script src 없음 (상대경로만)", () => {
  const srcs = [...HTML.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const s of srcs) {
    assert.ok(!/^https?:\/\//.test(s), `외부 URL 리소스 발견: ${s}`);
  }
});

// ══════════════════════════════════════════════════════════
// ⑪-b) 마크업 계약 (design §4.1·§6.8 — main.js 의존 DOM)
// ══════════════════════════════════════════════════════════
test("마크업: 타이틀·h1 = '브레이크아웃 라이트'", () => {
  assert.match(HTML, /<title>[^<]*브레이크아웃 라이트[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*>[\s\S]*브레이크아웃 라이트[\s\S]*<\/h1>/);
});

test("마크업: canvas#board 논리 해상도 360x480 + touch-action none", () => {
  assert.match(HTML, /<canvas[^>]*id=["']board["'][^>]*>/);
  assert.match(HTML, /width=["']360["']/);
  assert.match(HTML, /height=["']480["']/);
  assert.ok(
    /touch-action\s*:\s*none/.test(HTML) || /touch-action\s*:\s*none/.test(CSS),
    "touch-action:none 미지정 (드래그 중 스크롤 차단 필요, §5.3)"
  );
});

test("마크업: HUD 점수/생명 슬롯 + aria-live", () => {
  assert.match(HTML, /aria-live=["']polite["']/);
  assert.match(HTML, /data-role=["']score["']/);
  assert.match(HTML, /data-role=["']lives["']/);
});

test("마크업: 오버레이 + serve 힌트 + 컨트롤 버튼 존재", () => {
  assert.match(HTML, /class=["'][^"']*board-overlay[^"']*["']/);
  assert.match(HTML, /class=["'][^"']*serve-hint[^"']*["']/);
  for (const id of ["btn-start", "btn-pause", "btn-restart"]) {
    assert.ok(HTML.includes(id), `버튼 id=${id} 누락`);
  }
});

test("마크업: <noscript> 폴백 존재", () => {
  assert.match(HTML, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test("스타일: 보드 aspect-ratio 3/4 + 핵심 토큰(4행 벽돌 색) 정의", () => {
  assert.match(CSS, /aspect-ratio\s*:\s*3\s*\/\s*4/);
  for (const tok of [
    "--board-bg", "--paddle-fill", "--ball-fill",
    "--brick-row-1", "--brick-row-4", "--color-accent",
    "--lose-tint", "--win-tint",
  ]) {
    assert.ok(CSS.includes(tok), `토큰 ${tok} 미정의`);
  }
  // Lite 는 5행 색(앰버) 을 쓰지 않는다 — brick-row-5 부재 확인
  assert.ok(!CSS.includes("--brick-row-5"), "Lite 는 4행 색만 사용해야 함(--brick-row-5 존재)");
});

// ══════════════════════════════════════════════════════════
// ① 상수·초기 상태 (planner §3.1·§6.1)
// ══════════════════════════════════════════════════════════
test("상수: planner §3.1 / designer §5.1 값 일치", () => {
  assert.equal(L.BOARD_WIDTH, 360);
  assert.equal(L.BOARD_HEIGHT, 480);
  assert.equal(L.BRICK_ROWS, 4);
  assert.equal(L.BRICK_COLS, 6);
  assert.equal(L.BRICK_WIDTH, 50);
  assert.equal(L.BRICK_HEIGHT, 16);
  assert.equal(L.BRICK_GAP, 4);
  assert.equal(L.BRICK_SIDE_MARGIN, 18);
  assert.equal(L.BRICK_TOP_MARGIN, 48);
  assert.equal(L.BRICK_TOTAL, 24);
  assert.equal(L.PADDLE_WIDTH, 64);
  assert.equal(L.PADDLE_HEIGHT, 10);
  assert.equal(L.PADDLE_Y, 440);
  assert.equal(L.PADDLE_SPEED_KEYBOARD, 300);
  assert.equal(L.PADDLE_START_X, 148);
  assert.equal(L.BALL_RADIUS, 6);
  assert.equal(L.BALL_SPEED, 240);
  assert.equal(L.BALL_START_X, 180);
  assert.equal(L.BALL_START_Y, 434);
  assert.equal(L.LIVES_INITIAL, 3);
  assert.equal(L.SCORE_PER_BRICK, 10);
  assert.equal(L.MAX_DT, 1 / 30);
});

test("초기 상태: planner §6.1 형태 (phase=idle, 벽돌 24개 alive)", () => {
  const s = L.createInitialState();
  assert.equal(s.phase, "idle");
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.bricksRemaining, 24);
  assert.equal(s.paddleX, 148);
  assert.equal(s.ball.x, 180);
  assert.equal(s.ball.y, 434);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.vy, 0);
  assert.equal(s.bricks.length, 24);
  assert.equal(s.loseReason, null);
  assert.ok(s.bricks.every((b) => b.alive === true));
});

// ══════════════════════════════════════════════════════════
// ② 벽돌 4×6=24 배치 (planner §3.2 · designer §5.1)
// ══════════════════════════════════════════════════════════
test("벽돌 배치: 4행×6열=24개, 행 우선 순서 + 행별 색상 인덱스", () => {
  const bricks = L.createBricks();
  assert.equal(bricks.length, 24);
  // 첫 벽돌 (row0,col0): x=18, y=48
  assert.equal(bricks[0].x, 18);
  assert.equal(bricks[0].y, 48);
  assert.equal(bricks[0].row, 0);
  assert.equal(bricks[0].col, 0);
  // 배열 순서 = row-major: 7번째(index 6) = 2행 첫 열
  assert.equal(bricks[6].row, 1);
  assert.equal(bricks[6].col, 0);
  // 마지막 벽돌 (row3,col5)
  const last = bricks[23];
  assert.equal(last.row, 3);
  assert.equal(last.col, 5);
  // 가로 격자 폭이 보드(360) 를 넘지 않음
  assert.ok(last.x + last.width <= 360, "벽돌 격자가 보드 폭을 초과");
  // 세로 격자 하단(124) 이 패들(440) 과 분리
  assert.ok(last.y + last.height < L.PADDLE_Y, "벽돌이 패들 영역과 겹침");
});

test("clamp: 범위 밖 값 절단", () => {
  assert.equal(L.clamp(-5, 0, 296), 0);
  assert.equal(L.clamp(400, 0, 296), 296);
  assert.equal(L.clamp(148, 0, 296), 148);
});

// ══════════════════════════════════════════════════════════
// ③ 벽 반사 (planner §3.4)
// ══════════════════════════════════════════════════════════
test("벽 반사: 좌측 벽 — vx 양수화 + 안쪽 보정", () => {
  const r = L.reflectWalls({ x: 4, y: 200, vx: -120, vy: 200 });
  assert.equal(r.x, L.BALL_RADIUS);
  assert.ok(r.vx > 0, "좌벽 반사 후 vx 양수");
  assert.equal(r.vy, 200, "vy 불변");
});

test("벽 반사: 우측 벽 — vx 음수화", () => {
  const r = L.reflectWalls({ x: 358, y: 200, vx: 120, vy: 200 });
  assert.equal(r.x, L.BOARD_WIDTH - L.BALL_RADIUS);
  assert.ok(r.vx < 0, "우벽 반사 후 vx 음수");
});

test("벽 반사: 상단 벽 — vy 양수화(아래로)", () => {
  const r = L.reflectWalls({ x: 180, y: 4, vx: 60, vy: -200 });
  assert.equal(r.y, L.BALL_RADIUS);
  assert.ok(r.vy > 0, "상단 반사 후 vy 양수");
});

test("벽 반사: 하단은 반사하지 않음 (생명 손실 대상)", () => {
  const r = L.reflectWalls({ x: 180, y: 476, vx: 60, vy: 200 });
  assert.equal(r.vy, 200, "하단은 반사 없이 vy 유지");
});

// ══════════════════════════════════════════════════════════
// ④ 벽돌 충돌·점수 (planner §3.4·§4.1)
// ══════════════════════════════════════════════════════════
test("벽돌 충돌: 하단 면 접근 시 vy 반전", () => {
  const brick = { x: 100, y: 100, width: 50, height: 16 };
  // 공이 벽돌 아래에서 위로 접근(상하 겹침 우세)
  const ball = { x: 125, y: 118, vx: 0, vy: -200 };
  const hit = L.resolveBrickHit(ball, brick);
  assert.ok(hit && hit.hit, "충돌 미검출");
  assert.ok(ball.vy > 0, "상/하 면 충돌 후 vy 반전");
});

test("벽돌 충돌: 겹치지 않으면 null", () => {
  const brick = { x: 100, y: 100, width: 50, height: 16 };
  const ball = { x: 300, y: 300, vx: 0, vy: -200 };
  assert.equal(L.resolveBrickHit(ball, brick), null);
});

test("update: 벽돌 파괴 시 점수 +10, bricksRemaining -1, 반사", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  // 첫 벽돌(18,48,50x16) 하단 면으로 공을 배치, 위로 이동
  const target = s.bricks[0];
  s.ball = { x: target.x + 25, y: target.y + target.height + 4, vx: 0, vy: -200 };
  L.update(s, 0.0001, 0);
  assert.equal(s.score, 10);
  assert.equal(s.bricksRemaining, 23);
  assert.equal(s.bricks[0].alive, false);
  assert.ok(s.ball.vy > 0, "벽돌 반사 후 하강 전환");
});

// ══════════════════════════════════════════════════════════
// ⑤ 패들 단순 대칭 반사 (planner §3.4·§8 — 각도 보정 없음)
// ══════════════════════════════════════════════════════════
test("패들 반사: 단순 대칭 — vy 만 위쪽 반전, vx 보존", () => {
  // 패들 좌측 끝에 맞아도 vx 는 그대로(각도 보정 없음, Lite)
  const b1 = L.paddleBounce({ x: 150, y: 434, vx: 90, vy: 200 });
  assert.equal(b1.vx, 90, "vx 보존(각도 보정 없음)");
  assert.ok(b1.vy < 0, "vy 위쪽 반전");
  const b2 = L.paddleBounce({ x: 210, y: 434, vx: -90, vy: 200 });
  assert.equal(b2.vx, -90, "우측이어도 vx 부호 보존");
  assert.ok(b2.vy < 0);
  // 속도 크기 보존(고정 속도)
  const speed = Math.hypot(b1.vx, b1.vy);
  assert.ok(Math.abs(speed - Math.hypot(90, 200)) < 1e-9, "반사 후 속도 크기 보존");
});

test("update: 하강 중 패들 충돌 시 위로 반사", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  s.paddleX = 148;
  s.ball = { x: 180, y: L.PADDLE_Y - 2, vx: 40, vy: 200 };
  L.update(s, 0.0001, 0);
  assert.ok(s.ball.vy < 0, "패들 반사 후 공이 위로");
  assert.equal(s.ball.vx, 40, "패들 반사 vx 보존(단순 대칭)");
});

// ══════════════════════════════════════════════════════════
// ⑥ 발사 벡터 (planner §3.6 — 고정 속도, rand 로 좌/우)
// ══════════════════════════════════════════════════════════
test("발사 벡터: 고정 속도(크기=BALL_SPEED) + 항상 위쪽", () => {
  const left = L.launchVector(seqRand([0.0])); // dirX = -1
  const right = L.launchVector(seqRand([0.9])); // dirX = +1
  assert.ok(left.vx < 0 && right.vx > 0, "좌/우 방향 결정론");
  for (const v of [left, right]) {
    assert.ok(v.vy < 0, "발사 시 항상 위쪽(vy<0)");
    const speed = Math.hypot(v.vx, v.vy);
    assert.ok(Math.abs(speed - L.BALL_SPEED) < 1e-9, "발사 속도 크기 = BALL_SPEED 고정");
  }
});

test("launch: serve 에서만 발사되고 playing 으로 전이", () => {
  const s = L.createInitialState();
  L.startGame(s); // idle → serve
  assert.equal(s.phase, "serve");
  L.launch(s, seqRand([0.9]));
  assert.equal(s.phase, "playing");
  assert.ok(s.ball.vy < 0);
  // playing 에서 재발사 무효
  const vy = s.ball.vy;
  L.launch(s, seqRand([0.0]));
  assert.equal(s.ball.vy, vy, "playing 에서 재발사는 무시");
});

// ══════════════════════════════════════════════════════════
// ⑦ 상태 전이 (planner §6.2)
// ══════════════════════════════════════════════════════════
test("전이: idle → serve (startGame) — 공 부착", () => {
  const s = L.createInitialState();
  L.startGame(s);
  assert.equal(s.phase, "serve");
  assert.equal(s.ball.x, s.paddleX + L.PADDLE_WIDTH / 2);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.vy, 0);
});

test("전이: startGame 은 idle 에서만 유효", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  L.startGame(s);
  assert.equal(s.phase, "playing", "playing 에서 startGame no-op");
});

test("전이: 일시정지 토글 playing ↔ paused (planner §7-3)", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  L.togglePause(s);
  assert.equal(s.phase, "paused");
  L.togglePause(s);
  assert.equal(s.phase, "playing");
  // serve 에서는 토글 무효(Space=발사 전용)
  s.phase = "serve";
  L.togglePause(s);
  assert.equal(s.phase, "serve", "serve 에서 togglePause no-op");
});

test("update: paused/idle/win/lose 는 no-op (planner §6.3)", () => {
  for (const phase of ["paused", "idle", "win", "lose"]) {
    const s = L.createInitialState();
    s.phase = phase;
    s.ball = { x: 180, y: 200, vx: 100, vy: 100 };
    const beforeX = s.ball.x;
    const beforePaddle = s.paddleX;
    L.update(s, 0.1, 300); // 입력을 줘도
    assert.equal(s.ball.x, beforeX, `${phase} 에서 공 이동 없음`);
    assert.equal(s.paddleX, beforePaddle, `${phase} 에서 패들 이동 없음`);
    assert.equal(s.phase, phase, `${phase} 유지`);
  }
});

test("update: serve 중 공은 패들을 추종(물리 없음)", () => {
  const s = L.createInitialState();
  L.startGame(s); // serve
  L.update(s, 0.1, 300); // 오른쪽 이동
  assert.ok(s.paddleX > 148, "serve 중 패들 이동");
  assert.equal(s.ball.x, s.paddleX + L.PADDLE_WIDTH / 2, "공이 패들 중앙 추종");
  assert.equal(s.ball.y, L.BALL_START_Y);
});

// ══════════════════════════════════════════════════════════
// ⑧ 생명 손실·재부착·패배 / 승리 (planner §4.2·§4.3·§7-7)
// ══════════════════════════════════════════════════════════
test("생명 손실: 하단 이탈 시 lives-1 + serve 복귀 + 패들 위치 유지", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  s.paddleX = 60; // 특정 위치
  s.ball = { x: 60, y: L.BOARD_HEIGHT + 10, vx: 40, vy: 200 };
  L.update(s, 0.0001, 0);
  assert.equal(s.lives, 2, "생명 1 차감");
  assert.equal(s.phase, "serve", "serve 로 복귀");
  assert.equal(s.paddleX, 60, "패들 위치 유지(planner §7-7)");
  assert.equal(s.ball.x, 60 + L.PADDLE_WIDTH / 2, "공만 서브 위치로 재부착");
  assert.equal(s.ball.vx, 0);
});

test("패배: 마지막 생명 소진 시 phase=lose (planner §4.3·§6.3)", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  s.lives = 1;
  s.ball = { x: 180, y: L.BOARD_HEIGHT + 10, vx: 40, vy: 200 };
  L.update(s, 0.0001, 0);
  assert.equal(s.lives, 0);
  assert.equal(s.phase, "lose");
  assert.equal(s.loseReason, "out-of-lives");
});

test("승리: 마지막 벽돌 파괴 시 즉시 phase=win (planner §4.3 우선순위)", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  // 벽돌 1개만 남기고 모두 파괴 상태로 만듦
  for (const b of s.bricks) b.alive = false;
  s.bricks[0].alive = true;
  s.bricksRemaining = 1;
  const target = s.bricks[0];
  s.ball = { x: target.x + 25, y: target.y + target.height + 4, vx: 0, vy: -200 };
  L.update(s, 0.0001, 0);
  assert.equal(s.bricksRemaining, 0);
  assert.equal(s.phase, "win", "마지막 벽돌 파괴 즉시 승리");
});

// ══════════════════════════════════════════════════════════
// ⑨ 동시 키 상쇄 (planner §5.2·§7-1)
// ══════════════════════════════════════════════════════════
test("키 입력: 좌/우 동시 → 순 이동 0(상쇄)", () => {
  assert.equal(L.keyboardInputVX(false, false), 0);
  assert.equal(L.keyboardInputVX(true, false), -L.PADDLE_SPEED_KEYBOARD);
  assert.equal(L.keyboardInputVX(false, true), L.PADDLE_SPEED_KEYBOARD);
  assert.equal(L.keyboardInputVX(true, true), 0, "좌우 동시 상쇄");
});

test("패들 이동: 좌우 벽 클램프 (planner §3.3)", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  s.ball = { x: 180, y: 200, vx: 0, vy: -1 }; // 충돌 무관 위치
  s.paddleX = 0;
  L.update(s, 1, -300); // 왼쪽으로 크게
  assert.equal(s.paddleX, 0, "좌측 벽 클램프");
  s.paddleX = L.BOARD_WIDTH - L.PADDLE_WIDTH;
  L.update(s, 1, 300); // 오른쪽으로 크게
  assert.equal(s.paddleX, L.BOARD_WIDTH - L.PADDLE_WIDTH, "우측 벽 클램프");
});

// ══════════════════════════════════════════════════════════
// ⑩ 재시작 리셋 + 델타 클램프 (planner §6.3·§7-8)
// ══════════════════════════════════════════════════════════
test("재시작: 임의 phase → idle + 전체 초기화 (planner §6.3)", () => {
  const s = L.createInitialState();
  s.phase = "lose";
  s.score = 170;
  s.lives = 0;
  s.bricksRemaining = 5;
  s.paddleX = 300;
  s.loseReason = "out-of-lives";
  s.bricks[0].alive = false;
  L.restart(s);
  assert.equal(s.phase, "idle");
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.bricksRemaining, 24);
  assert.equal(s.paddleX, 148);
  assert.equal(s.loseReason, null);
  assert.ok(s.bricks.every((b) => b.alive === true), "벽돌 전량 부활");
});

test("델타 클램프: 상한 MAX_DT, 음수/NaN 방어", () => {
  assert.equal(L.clampDt(0.5), L.MAX_DT, "큰 dt 는 상한으로");
  assert.equal(L.clampDt(0.01), 0.01, "정상 dt 통과");
  assert.equal(L.clampDt(-1), 0, "음수 방어");
  assert.equal(L.clampDt(NaN), 0, "NaN 방어");
  assert.equal(L.clampDt(0), 0, "0 방어");
});

test("공 이동: playing 중 vx·vy 로 위치 갱신", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  s.ball = { x: 180, y: 200, vx: 100, vy: -100 };
  L.update(s, 0.1, 0);
  assert.ok(Math.abs(s.ball.x - 190) < 1e-6, "x = 180 + 100*0.1");
  assert.ok(Math.abs(s.ball.y - 190) < 1e-6, "y = 200 - 100*0.1");
});
