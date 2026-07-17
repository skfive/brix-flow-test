// BF-931 · 벽돌깨기(Breakout) 단위 테스트 (focused scope · module: breakout)
// - 대상: phase18-games/breakout/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/breakout-BF931.test.js
// - 기획 SSOT: docs/plan/breakout-BF-928.md (§3~§6 물리·상태·§12 테스트 방침)
// - 디자인 SSOT: docs/design/breakout-BF-928.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축 (planner §12):
//   ① 공 이동/벽 반사(§3.4)  ② 패들 반사각(§3.5, vy>0 가드)
//   ③ 벽돌 충돌·스캔 순서·점수(§3.6)  ④ 발사 벡터 범위(§3.6, rand 주입)
//   ⑤ 생명 손실/게임오버/승리 전이(§3.7 step7·§3.8)  ⑥ 동시 키 상쇄(§10.12)
//   ⑦ 정적 가드(§8 외부 의존성 0건) + 마크업 계약

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "breakout");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─── logic.js 를 샌드박스에서 로드해 BreakoutLogic 추출 ───
function loadLogic() {
  const ctx = { globalThis: undefined, module: { exports: {} }, Math: Math };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, { filename: "phase18-games/breakout/logic.js" });
  const api = ctx.module.exports;
  assert.ok(api && api.createInitialState, "logic.js 가 BreakoutLogic API 를 노출하지 않음");
  return api;
}

const L = loadLogic();

// ══════════════════════════════════════════════════════════
// ⑦-a) vanilla-static file:// 안전 가드 (planner §8)
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

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건 (§8)", () => {
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
// ⑦-b) 마크업 계약 (design §4.1·§6.8 — main.js 의존 DOM)
// ══════════════════════════════════════════════════════════
test("마크업: 타이틀·h1 = '벽돌깨기'", () => {
  assert.match(HTML, /<title>[^<]*벽돌깨기[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*>[\s\S]*벽돌깨기[\s\S]*<\/h1>/);
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

test("마크업: 오버레이 data-state + serve 힌트 + 버튼 존재", () => {
  assert.match(HTML, /class=["'][^"']*board-overlay[^"']*["']/);
  assert.match(HTML, /class=["'][^"']*serve-hint[^"']*["']/);
  for (const id of ["btn-start", "btn-pause", "btn-menu"]) {
    assert.ok(HTML.includes(id), `버튼 id=${id} 누락`);
  }
});

test("마크업: <noscript> 폴백 존재 (§7.5)", () => {
  assert.match(HTML, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test("스타일: 보드 aspect-ratio 3/4 + 핵심 토큰 정의", () => {
  assert.match(CSS, /aspect-ratio\s*:\s*3\s*\/\s*4/);
  for (const tok of ["--board-bg", "--paddle-fill", "--ball-fill", "--brick-row-1", "--brick-row-5", "--color-accent"]) {
    assert.ok(CSS.includes(tok), `토큰 ${tok} 미정의`);
  }
});

// ══════════════════════════════════════════════════════════
// 상수·초기 상태 (planner §3.1·§6.1)
// ══════════════════════════════════════════════════════════
test("상수: planner §3.1 값 일치", () => {
  assert.equal(L.BOARD_WIDTH, 360);
  assert.equal(L.BOARD_HEIGHT, 480);
  assert.equal(L.BRICK_ROWS, 5);
  assert.equal(L.BRICK_COLS, 8);
  assert.equal(L.BRICK_WIDTH, 40);
  assert.equal(L.BRICK_HEIGHT, 16);
  assert.equal(L.BRICK_GAP, 4);
  assert.equal(L.BRICK_SIDE_MARGIN, 6);
  assert.equal(L.BRICK_TOP_MARGIN, 40);
  assert.equal(L.BRICK_TOTAL, 40);
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

test("초기 상태: planner §6.1 형태 (status=start, 벽돌 40개 alive)", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "start");
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.paddle.x, 148);
  assert.equal(s.ball.x, 180);
  assert.equal(s.ball.y, 434);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.vy, 0);
  assert.equal(s.bricks.length, 40);
  assert.equal(s.bricksAlive, 40);
  assert.equal(s.gameoverReason, null);
  assert.ok(s.bricks.every((b) => b.alive === true));
});

test("벽돌 배치: 행 우선 순서 + 대칭 여백 (planner §3.2)", () => {
  const bricks = L.createBricks();
  // 첫 벽돌 (row0,col0)
  assert.equal(bricks[0].x, 6);
  assert.equal(bricks[0].y, 40);
  // 배열 순서 = row-major
  assert.equal(bricks[0].row, 0);
  assert.equal(bricks[0].col, 0);
  assert.equal(bricks[8].row, 1); // 9번째 = 2행 첫 열
  assert.equal(bricks[8].col, 0);
  // 마지막 열 우측 여백이 좌측과 동일(6px)
  const last = bricks[7]; // row0,col7
  assert.equal(last.x + last.width, 354);
  assert.equal(L.BOARD_WIDTH - (last.x + last.width), 6);
});

test("clamp: 범위 밖 값 절단", () => {
  assert.equal(L.clamp(-5, 0, 296), 0);
  assert.equal(L.clamp(400, 0, 296), 296);
  assert.equal(L.clamp(148, 0, 296), 148);
});

// ══════════════════════════════════════════════════════════
// ① 벽 반사 (planner §3.4 · AC-RULE-01)
// ══════════════════════════════════════════════════════════
test("AC-RULE-01: 좌측 벽 반사 — vx 양수화 + 안쪽 보정", () => {
  const r = L.reflectWalls({ x: 4, y: 200, vx: -120, vy: 200 });
  assert.equal(r.x, L.BALL_RADIUS);
  assert.ok(r.vx > 0, "좌벽 반사 후 vx 양수");
  assert.equal(r.vy, 200, "vy 불변");
});

test("AC-RULE-01: 우측 벽 반사 — vx 음수화", () => {
  const r = L.reflectWalls({ x: 356, y: 200, vx: 120, vy: 200 });
  assert.equal(r.x, L.BOARD_WIDTH - L.BALL_RADIUS);
  assert.ok(r.vx < 0);
});

test("AC-RULE-01: 상단 벽 반사 — vy 양수화", () => {
  const r = L.reflectWalls({ x: 180, y: 4, vx: 100, vy: -200 });
  assert.equal(r.y, L.BALL_RADIUS);
  assert.ok(r.vy > 0);
});

test("AC-RULE-01: 하단은 반사하지 않음 (생명 판정 대상)", () => {
  const r = L.reflectWalls({ x: 180, y: 478, vx: 100, vy: 200 });
  assert.equal(r.vy, 200, "하단은 반사 없음");
});

test("AC-RULE-01: 벽에 닿지 않으면 그대로", () => {
  const r = L.reflectWalls({ x: 180, y: 240, vx: 100, vy: 150 });
  // vm 샌드박스 realm 차이로 deepEqual(전체 객체) 대신 필드별 비교
  assert.equal(r.x, 180);
  assert.equal(r.y, 240);
  assert.equal(r.vx, 100);
  assert.equal(r.vy, 150);
});

// ══════════════════════════════════════════════════════════
// ② 패들 반사각 (planner §3.5 · AC-RULE-02)
// ══════════════════════════════════════════════════════════
test("ballHitsPaddle: X·Y 겹침 판정 (paddleX=148)", () => {
  assert.equal(L.ballHitsPaddle({ x: 180, y: 440 }, 148), true); // 중앙
  assert.equal(L.ballHitsPaddle({ x: 180, y: 300 }, 148), false); // Y 벗어남
  assert.equal(L.ballHitsPaddle({ x: 50, y: 440 }, 148), false); // X 벗어남
});

test("AC-RULE-02: 패들 정중앙 충돌 → 거의 수직 반사, 속력 240 고정", () => {
  const out = L.paddleBounce({ x: 180, y: 440, vx: 0, vy: 200 }, 148); // rel=0
  assert.ok(Math.abs(out.vx) < 1e-6, "정중앙 → vx≈0 (수직)");
  assert.ok(out.vy < 0, "항상 위쪽(음수)");
  assert.ok(Math.abs(Math.hypot(out.vx, out.vy) - 240) < 1e-6, "속력 240 고정");
});

test("AC-RULE-02: 패들 우측 끝단 충돌 → vx 양수, 큰 각도, 속력 240", () => {
  // paddleX=148, 중심 180, 우측 끝 x=212 → rel=+1
  const out = L.paddleBounce({ x: 212, y: 440, vx: 0, vy: 200 }, 148);
  assert.ok(out.vx > 0, "우측 끝단 → vx 우측(+)");
  assert.ok(out.vy < 0, "항상 위쪽");
  assert.ok(Math.abs(Math.hypot(out.vx, out.vy) - 240) < 1e-6, "속력 240 고정");
  // rel=1 → bounceAngle=60°(수직 기준): vx=240*sin60, vy=-240*cos60
  assert.ok(Math.abs(out.vx - 240 * Math.sin(L.degToRad(60))) < 1e-6);
});

test("AC-RULE-02·§10.2: 상승 중(vy<=0) 공은 update 에서 패들 충돌 미처리", () => {
  const s = L.createInitialState();
  s.status = "playing";
  s.paddle.x = 148;
  // 패들과 겹치지만 상승 중(vy<0) — 반사되면 안 됨
  s.ball = { x: 180, y: 440, vx: 0, vy: -240 };
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.ok(s.ball.vy < 0, "상승 중 공은 패들 반사 미적용 (vy 음수 유지)");
});

// ══════════════════════════════════════════════════════════
// ③ 벽돌 충돌·스캔·점수 (planner §3.6 · AC-RULE-03)
// ══════════════════════════════════════════════════════════
test("resolveBrickHit: 하단 면 충돌 → vy 반전", () => {
  const brick = { x: 100, y: 40, width: 40, height: 16 };
  // 공이 벽돌 아래에서 위로 접근(하단 면), 수평 중앙
  const ball = { x: 120, y: 60, vx: 0, vy: -240 };
  const r = L.resolveBrickHit(ball, brick);
  assert.ok(r && r.hit);
  assert.equal(ball.vy, 240, "상/하 면 → vy 반전");
  assert.equal(ball.vx, 0, "vx 불변");
});

test("resolveBrickHit: 좌/우 면 충돌 → vx 반전", () => {
  const brick = { x: 100, y: 40, width: 40, height: 16 };
  // 공이 벽돌 좌측에서 접근(좌우 겹침이 상하보다 작음)
  const ball = { x: 96, y: 48, vx: 240, vy: 0 };
  const r = L.resolveBrickHit(ball, brick);
  assert.ok(r && r.hit);
  assert.equal(ball.vx, -240, "좌/우 면 → vx 반전");
});

test("resolveBrickHit: 겹치지 않으면 null + 속도 불변", () => {
  const brick = { x: 100, y: 40, width: 40, height: 16 };
  const ball = { x: 200, y: 200, vx: 240, vy: 240 };
  assert.equal(L.resolveBrickHit(ball, brick), null);
  assert.equal(ball.vx, 240);
  assert.equal(ball.vy, 240);
});

test("AC-RULE-03: update 벽돌 파괴 → alive=false, score+10, playing 유지", () => {
  const s = L.createInitialState();
  s.status = "playing";
  // (row4, col0) 벽돌: x=6, y=40+4*20=120, 40x16 → 중심 아래에서 접근
  const target = s.bricks.find((b) => b.row === 4 && b.col === 0);
  s.ball = { x: target.x + 20, y: target.y + target.height + 4, vx: 0, vy: -240 };
  s.paddle.x = 148;
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.equal(target.alive, false, "벽돌 파괴");
  assert.equal(s.score, 10, "점수 +10");
  assert.equal(s.bricksAlive, 39);
  assert.equal(s.status, "playing");
});

test("AC-RULE-03·§10.3: 한 프레임에 첫 번째 벽돌 1개만 파괴 (스캔 순서)", () => {
  const s = L.createInitialState();
  s.status = "playing";
  // 두 벽돌 경계에 동시에 겹치도록 배치 — 스캔 첫 벽돌만 파괴
  const b0 = s.bricks[0]; // row0 col0
  // 공을 b0 하단 근처에 둠
  s.ball = { x: b0.x + 20, y: b0.y + b0.height + 4, vx: 0, vy: -240 };
  const before = s.bricksAlive;
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.equal(before - s.bricksAlive, 1, "한 프레임에 정확히 1개만 감소");
});

// ══════════════════════════════════════════════════════════
// ④ 발사 벡터 (planner §3.6 · AC-RULE-06)
// ══════════════════════════════════════════════════════════
test("AC-RULE-06: launchVector 각도 60~80°·속력 240·항상 위쪽 (1000회)", () => {
  let leftCount = 0;
  for (let i = 0; i < 1000; i += 1) {
    const v = L.launchVector(Math.random);
    const speed = Math.hypot(v.vx, v.vy);
    assert.ok(Math.abs(speed - 240) < 1e-6, `속력 240 기대, 실제 ${speed}`);
    assert.ok(v.vy < 0, "발사는 항상 위쪽(vy<0)");
    const angleDeg = (Math.atan2(Math.abs(v.vy), Math.abs(v.vx)) * 180) / Math.PI;
    assert.ok(angleDeg >= 60 - 1e-6 && angleDeg <= 80 + 1e-6, `각도 범위 이탈: ${angleDeg}`);
    if (v.vx < 0) leftCount += 1;
  }
  assert.ok(leftCount > 0 && leftCount < 1000, "좌/우 방향 모두 출현해야 함");
});

test("AC-RULE-06: rand 주입 결정론 — 동일 시퀀스 → 동일 벡터", () => {
  const mk = () => {
    const seq = [0.2, 0.5];
    let i = 0;
    return () => seq[i++];
  };
  const a = L.launchVector(mk());
  const b = L.launchVector(mk());
  assert.deepEqual(a, b);
  assert.ok(a.vx < 0, "rand<0.5 → dirX 좌(-)");
});

test("AC-STATE-02: launch — serve→playing 전이 + 속도 부여", () => {
  const s = L.createInitialState();
  L.resetToServe(s); // status=serve
  assert.equal(s.status, "serve");
  L.launch(s, () => 0.5);
  assert.equal(s.status, "playing");
  assert.ok(Math.abs(Math.hypot(s.ball.vx, s.ball.vy) - 240) < 1e-6);
});

test("launch: serve 아닐 때 no-op", () => {
  const s = L.createInitialState(); // status=start
  L.launch(s, () => 0.5);
  assert.equal(s.status, "start");
  assert.equal(s.ball.vx, 0);
});

// ══════════════════════════════════════════════════════════
// ⑤ 생명 손실·게임오버·승리 전이 (planner §3.7 step7·§3.8)
// ══════════════════════════════════════════════════════════
test("AC-STATE-04: 하단 이탈 & lives>1 → serve 재부착 + 생명 감소", () => {
  const s = L.createInitialState();
  s.status = "playing";
  s.lives = 3;
  s.paddle.x = 0; // 패들을 왼쪽 끝에 둠(공이 패들 없이 하단 통과)
  s.ball = { x: 300, y: 490, vx: 0, vy: 240 }; // 이미 하단 밖
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.equal(s.lives, 2, "생명 1 감소");
  assert.equal(s.status, "serve", "serve 재부착");
  assert.equal(s.ball.vx, 0, "재부착 공 정지");
});

test("AC-STATE-05: 하단 이탈 & lives===1 → gameover", () => {
  const s = L.createInitialState();
  s.status = "playing";
  s.lives = 1;
  s.paddle.x = 0;
  s.ball = { x: 300, y: 490, vx: 0, vy: 240 };
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.equal(s.lives, 0);
  assert.equal(s.status, "gameover");
  assert.equal(s.gameoverReason, "out-of-lives");
});

test("AC-STATE-06·§3.8: 마지막 벽돌 파괴 → win (하단 이탈 판정 미실행)", () => {
  const s = L.createInitialState();
  s.status = "playing";
  // 벽돌 1개만 남김
  s.bricks.forEach((b) => { b.alive = false; });
  const target = s.bricks[0];
  target.alive = true;
  s.bricksAlive = 1;
  s.lives = 1;
  s.ball = { x: target.x + 20, y: target.y + target.height + 4, vx: 0, vy: -240 };
  L.update(s, 1 / 240, 0, () => 0.5);
  assert.equal(s.bricksAlive, 0);
  assert.equal(s.status, "win");
  assert.equal(s.lives, 1, "승리 프레임에 생명 손실 없음");
});

test("AC-STATE-08: resetToServe — 새 라운드 전체 초기화", () => {
  const s = L.createInitialState();
  s.status = "gameover";
  s.score = 250;
  s.lives = 0;
  s.bricks.forEach((b) => { b.alive = false; });
  s.bricksAlive = 0;
  L.resetToServe(s);
  assert.equal(s.status, "serve");
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.bricksAlive, 40);
  assert.equal(s.paddle.x, 148);
  assert.ok(s.bricks.every((b) => b.alive === true));
});

// ══════════════════════════════════════════════════════════
// step1 no-op 가드 (planner §3.7 · §10.8)
// ══════════════════════════════════════════════════════════
test("AC-STATE-07·§10.8: paused/start/gameover/win 은 update no-op", () => {
  for (const status of ["paused", "start", "gameover", "win"]) {
    const s = L.createInitialState();
    s.status = status;
    s.paddle.x = 148;
    s.ball = { x: 100, y: 100, vx: 240, vy: 240 };
    L.update(s, 1 / 60, 300, () => 0.5); // 이동 입력 있어도
    assert.equal(s.paddle.x, 148, `${status}: 패들 정지`);
    assert.equal(s.ball.x, 100, `${status}: 공 정지`);
  }
});

test("serve: 공이 패들 중앙 추종 (물리 없음)", () => {
  const s = L.createInitialState();
  L.resetToServe(s); // serve
  L.update(s, 1 / 60, 300, () => 0.5); // 오른쪽 이동
  assert.ok(s.paddle.x > 148, "패들 우측 이동");
  assert.equal(s.ball.x, s.paddle.x + L.PADDLE_WIDTH / 2, "공이 패들 중앙 추종");
  assert.equal(s.ball.y, L.BALL_START_Y);
});

// ══════════════════════════════════════════════════════════
// 패들 이동·클램프 (planner §3.3 · AC-INPUT-01)
// ══════════════════════════════════════════════════════════
test("AC-INPUT-01: 키보드 이동 + 경계 클램프", () => {
  const s = L.createInitialState();
  s.status = "playing";
  s.ball = { x: 180, y: 200, vx: 0, vy: -240 }; // 위로(패들 충돌·이탈 회피)
  s.paddle.x = 148;
  L.update(s, 0.1, 300, () => 0.5); // +30px
  assert.ok(Math.abs(s.paddle.x - 178) < 1e-6, "우측 이동 30px");
  // 좌측 경계
  s.paddle.x = 10;
  s.ball = { x: 180, y: 200, vx: 0, vy: -240 };
  L.update(s, 1, -300, () => 0.5);
  assert.equal(s.paddle.x, 0, "좌측 경계 클램프");
  // 우측 경계
  s.paddle.x = 290;
  s.ball = { x: 180, y: 200, vx: 0, vy: -240 };
  L.update(s, 1, 300, () => 0.5);
  assert.equal(s.paddle.x, L.BOARD_WIDTH - L.PADDLE_WIDTH, "우측 경계 클램프(296)");
});

// ══════════════════════════════════════════════════════════
// ⑥ 동시 키 상쇄 (planner §5.2 · §10.12)
// ══════════════════════════════════════════════════════════
test("§10.12: 좌우 동시 키 → 순이동 0 (상쇄)", () => {
  assert.equal(L.keyboardInputVX(true, true), 0);
  assert.equal(L.keyboardInputVX(false, false), 0);
  assert.equal(L.keyboardInputVX(true, false), -300);
  assert.equal(L.keyboardInputVX(false, true), 300);
});

// ══════════════════════════════════════════════════════════
// 델타타임 클램프 (planner §10.5)
// ══════════════════════════════════════════════════════════
test("clampDt: 상한 1/30 + 비정상값 방어", () => {
  assert.equal(L.clampDt(1 / 60), 1 / 60);
  assert.equal(L.clampDt(1), 1 / 30);
  assert.equal(L.clampDt(0), 0);
  assert.equal(L.clampDt(-5), 0);
  assert.equal(L.clampDt(NaN), 0);
});

// ══════════════════════════════════════════════════════════
// 결정론 — 동일 입력 → 동일 결과 (planner §3.7)
// ══════════════════════════════════════════════════════════
test("결정론: 동일 (state,dt,inputVX) → 동일 newState", () => {
  function run() {
    const s = L.createInitialState();
    s.status = "playing";
    s.ball = { x: 100, y: 200, vx: 150, vy: 180 };
    s.paddle.x = 148;
    for (let i = 0; i < 60; i += 1) L.update(s, 1 / 60, 0, () => 0.5);
    return s;
  }
  const a = run();
  const b = run();
  assert.deepEqual(
    { x: a.ball.x, y: a.ball.y, vx: a.ball.vx, vy: a.ball.vy, score: a.score },
    { x: b.ball.x, y: b.ball.y, vx: b.ball.vx, vy: b.ball.vy, score: b.score }
  );
});
