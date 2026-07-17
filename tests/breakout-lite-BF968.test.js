// BF-968 · 브레이크아웃 라이트 키보드 일시정지·재개·재시작 최소 보강 (focused scope · module: breakout-lite)
// - 대상: phase18-games/breakout-lite/{index.html, styles.css, main.js} (logic.js 미변경)
// - 실행: node --test tests/breakout-lite-BF968.test.js
// - 명세 SSOT: docs/design/breakout-lite-BF-967.md §5·§6 (포커스 표시·일시정지 UI·재시작 흐름)
//
// 검증 축 (BF-968 AC):
//   AC-1 키보드 시작·패들 이동·일시정지·재개·재시작 동작 (logic 전이 + main.js 핸들러 계약)
//   AC-2 일시정지 동안 공·점수·벽돌 상태 동결 (logic.update no-op)
//   AC-3 회귀 가드: 일시정지 상태 동결 검증 + 명세 §6 보강(포커스 링·tabindex·paused 문구)

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
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");

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

// ══════════════════════════════════════════════════════════
// AC-2) 일시정지 상태 동결 — 시간 경과·입력에도 공·점수·벽돌 불변 (핵심 회귀 가드)
// ══════════════════════════════════════════════════════════
test("일시정지 동결: dt·입력 반복 적용에도 공 위치/속도 불변", () => {
  const s = L.createInitialState();
  s.phase = "paused";
  s.ball = { x: 123, y: 234, vx: 150, vy: -90 };
  const snap = { x: s.ball.x, y: s.ball.y, vx: s.ball.vx, vy: s.ball.vy };
  const paddleBefore = s.paddleX;
  // 여러 프레임 경과 + 좌/우 입력을 줘도 동결
  for (let i = 0; i < 30; i += 1) {
    L.update(s, L.MAX_DT, i % 2 === 0 ? 300 : -300);
  }
  assert.equal(s.phase, "paused", "일시정지 유지");
  assert.deepEqual(
    { x: s.ball.x, y: s.ball.y, vx: s.ball.vx, vy: s.ball.vy },
    snap,
    "일시정지 중 공 상태 동결"
  );
  assert.equal(s.paddleX, paddleBefore, "일시정지 중 패들 이동 없음");
});

test("일시정지 동결: 점수·벽돌 alive 상태 불변", () => {
  const s = L.createInitialState();
  s.phase = "paused";
  s.score = 70;
  s.bricksRemaining = 17;
  s.bricks[0].alive = false; // 이미 깬 벽돌
  // 살아있는 벽돌 한복판에 공을 두어도 충돌 처리되면 안 됨 (동결)
  const live = s.bricks[10];
  s.ball = { x: live.x + live.width / 2, y: live.y + live.height / 2, vx: 200, vy: 200 };
  const aliveBefore = s.bricks.map((b) => b.alive);
  for (let i = 0; i < 20; i += 1) {
    L.update(s, L.MAX_DT, 0);
  }
  assert.equal(s.score, 70, "일시정지 중 점수 불변");
  assert.equal(s.bricksRemaining, 17, "일시정지 중 잔여 벽돌 수 불변");
  assert.deepEqual(s.bricks.map((b) => b.alive), aliveBefore, "일시정지 중 벽돌 alive 상태 동결");
});

// ══════════════════════════════════════════════════════════
// AC-1) 키보드 시작·일시정지·재개·재시작 전이 (logic 계약)
// ══════════════════════════════════════════════════════════
test("전이: 재개 — paused → playing (togglePause)", () => {
  const s = L.createInitialState();
  s.phase = "playing";
  L.togglePause(s); // playing → paused
  assert.equal(s.phase, "paused");
  L.togglePause(s); // paused → playing (재개)
  assert.equal(s.phase, "playing", "재개로 playing 복귀");
});

test("전이: 재시작 — 임의 phase → idle 전체 초기화", () => {
  const s = L.createInitialState();
  s.phase = "paused";
  s.score = 120;
  s.bricks[0].alive = false;
  L.restart(s);
  assert.equal(s.phase, "idle");
  assert.equal(s.score, 0);
  assert.equal(s.bricksRemaining, 24);
  assert.ok(s.bricks.every((b) => b.alive === true), "재시작 시 벽돌 전량 부활");
});

test("전이: 시작 — idle → serve (startGame)", () => {
  const s = L.createInitialState();
  L.startGame(s);
  assert.equal(s.phase, "serve", "시작 시 serve 진입");
});

// ══════════════════════════════════════════════════════════
// main.js 키보드 핸들러 계약 — 시작·패들 이동·일시정지·재개·재시작 (§0 전제 4 보존)
// ══════════════════════════════════════════════════════════
test("main.js: 키보드 핸들러 — 좌/우·Space·R 처리 보존", () => {
  // 좌우 패들 이동
  assert.match(MAIN_JS, /ArrowLeft/, "ArrowLeft 처리 누락");
  assert.match(MAIN_JS, /ArrowRight/, "ArrowRight 처리 누락");
  assert.match(MAIN_JS, /"a"\s*\|\|\s*k\s*===\s*"A"/, "A 키 처리 누락");
  assert.match(MAIN_JS, /"d"\s*\|\|\s*k\s*===\s*"D"/, "D 키 처리 누락");
  // Space: 발사/일시정지 토글
  assert.match(MAIN_JS, /togglePause\(\)/, "Space 일시정지 토글 누락");
  // R: 재시작
  assert.match(MAIN_JS, /"r"\s*\|\|\s*k\s*===\s*"R"/, "R 재시작 키 처리 누락");
});

// ══════════════════════════════════════════════════════════
// 명세 §6 STEP 1 — 오버레이 타이틀 포커스 링 (결함 B)
// ══════════════════════════════════════════════════════════
test("§6.1 결함 B: .overlay__title:focus-visible 포커스 링 — 기존 토큰 재사용", () => {
  const m = CSS.match(/\.overlay__title:focus-visible\s*\{([^}]*)\}/);
  assert.ok(m, ".overlay__title:focus-visible 규칙 누락");
  const body = m[1];
  assert.match(body, /outline\s*:\s*2px\s+solid\s+var\(--color-accent\)/, "outline 토큰 미사용");
  assert.match(body, /box-shadow\s*:[^;]*var\(--color-focus-ring\)/, "box-shadow 글로우 토큰 미사용");
  // 하드코딩 색 금지 — 반드시 var() 참조
  assert.ok(!/#[0-9a-fA-F]{3,8}/.test(body), "포커스 링에 하드코딩 색 존재(토큰 재사용 위반)");
});

test("§5.1 base 유지: .overlay__title { outline: none } 보존", () => {
  assert.match(CSS, /\.overlay__title\s*\{[^}]*outline\s*:\s*none[^}]*\}/, "타이틀 base outline:none 제거됨");
});

// ══════════════════════════════════════════════════════════
// 명세 §6 STEP 2 — 포커스 목적지 이동 (결함 A, 권장안 ① 보드 컨테이너)
// ══════════════════════════════════════════════════════════
test("§6.2 결함 A: .board-wrap 에 tabindex=-1 (프로그램 포커스 목적지)", () => {
  assert.match(
    HTML,
    /<div[^>]*class=["'][^"']*board-wrap[^"']*["'][^>]*tabindex=["']-1["']/,
    ".board-wrap tabindex=\"-1\" 누락"
  );
});

test("§6.2 결함 A: .board-wrap:focus-visible 포커스 링 + :focus base 억제", () => {
  const fv = CSS.match(/\.board-wrap:focus-visible\s*\{([^}]*)\}/);
  assert.ok(fv, ".board-wrap:focus-visible 규칙 누락");
  assert.match(fv[1], /outline\s*:\s*2px\s+solid\s+var\(--color-accent\)/, "board-wrap outline 토큰 미사용");
  assert.match(fv[1], /box-shadow\s*:[^;]*var\(--color-focus-ring\)/, "board-wrap 글로우 토큰 미사용");
  // 비키보드 포커스 링 억제
  assert.match(CSS, /\.board-wrap:focus\s*\{[^}]*outline\s*:\s*none[^}]*\}/, "board-wrap:focus outline:none 누락");
});

test("§6.2 결함 A: main.js 가 오버레이 숨김(playing/serve) 시 보드로 포커스 이동", () => {
  assert.match(MAIN_JS, /board-wrap/, "boardWrap DOM 참조 누락");
  // playing/serve 진입 분기에서 boardWrap.focus() 호출
  assert.match(MAIN_JS, /boardWrap[\s\S]{0,40}\.focus\(\)/, "boardWrap.focus() 이동 로직 누락");
});

test("§6.2 보존: 오버레이 진입 시 overlayTitle.focus() 유지 (스크린리더 회귀 방지)", () => {
  assert.match(MAIN_JS, /overlayTitle\.focus\(\)/, "오버레이 진입 타이틀 포커스 제거됨");
});

// ══════════════════════════════════════════════════════════
// 명세 §6 STEP 3 — 일시정지 안내 문구 정제 (§5.3)
// ══════════════════════════════════════════════════════════
test("§6.3 paused 안내 문구 — 재개(Space/계속하기)·재시작(R/다시하기) 두 경로 안내", () => {
  assert.match(
    MAIN_JS,
    /계속하려면 Space 또는 계속하기, 다시 시작하려면 R 또는 다시하기를 누르세요/,
    "paused 안내 문구 미정제"
  );
});

// ══════════════════════════════════════════════════════════
// §2 토큰 보존 — 신규 토큰 0건, :root 값 불변 확인
// ══════════════════════════════════════════════════════════
test("§2 토큰 보존: 포커스 링 2토큰 정의 유지 + 신규 벽돌색 토큰 미추가", () => {
  assert.match(CSS, /--color-accent\s*:\s*#5b82f0/i, "--color-accent 값 변경됨");
  assert.match(CSS, /--color-focus-ring\s*:\s*rgba\(91,\s*130,\s*240,\s*0?\.55\)/, "--color-focus-ring 값 변경됨");
  assert.ok(!CSS.includes("--brick-row-5"), "Lite 는 4행 색만 사용해야 함");
});

test("가드: file:// 안전 — type=module·외부 URL 미도입", () => {
  for (const [name, src] of [["index.html", HTML], ["main.js", MAIN_JS], ["styles.css", CSS]]) {
    assert.ok(!/type\s*=\s*["']module["']/.test(src), `${name} 에 type="module" 존재`);
    assert.ok(!/https?:\/\//.test(src), `${name} 에 외부 URL 존재`);
  }
});
