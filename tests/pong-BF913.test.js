// BF-913 · Pong 아케이드 단위 테스트 (focused scope · module: pong)
// - 대상: phase18-games/pong/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/pong-BF913.test.js
// - 기획 SSOT: docs/planning/pong-BF-910.md (§3~§4 물리·§6 상태·§12 테스트 방침)
// - 디자인 SSOT: docs/design/pong-BF-910.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축 (planner §12):
//   1) vanilla-static file:// 안전 가드 — import/export·<script type="module">·
//      fetch/외부 URL·localStorage 가 없어야 함(§8 외부 의존성 0건).
//   2) 마크업 계약 — main.js 가 의존하는 id/클래스 + <title>/<h1> 고정.
//   3) 순수 로직 — logic.js 를 node:vm 샌드박스에서 로드해 물리·AI·득점·승리·서브 검증.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "pong");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 샌드박스에서 로드해 PongLogic 추출 ───────────
function loadLogic() {
  const ctx = { globalThis: undefined, module: { exports: {} }, Math: Math };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, { filename: "phase18-games/pong/logic.js" });
  const api = ctx.module.exports;
  assert.ok(api && api.createInitialState, "logic.js 가 PongLogic API 를 노출하지 않음");
  return api;
}

const L = loadLogic();

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (planner §8 — 외부 의존성 0건)
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
// 2) 마크업 계약 (design §4.1·§6.3 — main.js 의존 DOM)
// ══════════════════════════════════════════════════════════
test("마크업: 타이틀·h1 = 'Pong 아케이드'", () => {
  assert.match(HTML, /<title>[^<]*Pong[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*>[\s\S]*Pong 아케이드[\s\S]*<\/h1>/);
});

test("마크업: canvas#court 논리 해상도 800x400 + touch-action none", () => {
  assert.match(HTML, /<canvas[^>]*id=["']court["'][^>]*>/);
  assert.match(HTML, /width=["']800["']/);
  assert.match(HTML, /height=["']400["']/);
  // touch-action:none 은 인라인 style 또는 css 어느 쪽이든 존재해야 함
  assert.ok(
    /touch-action\s*:\s*none/.test(HTML) || /touch-action\s*:\s*none/.test(CSS),
    "touch-action:none 미지정 (드래그 중 스크롤 차단 필요, §5.3)"
  );
});

test("마크업: 스코어보드 aria-live + data-role 점수 슬롯", () => {
  assert.match(HTML, /aria-live=["']polite["']/);
  assert.match(HTML, /data-role=["']player-score["']/);
  assert.match(HTML, /data-role=["']cpu-score["']/);
});

test("마크업: 오버레이 data-state 컨테이너 + 버튼 3종 존재", () => {
  assert.match(HTML, /class=["'][^"']*pong-overlay[^"']*["']/);
  // main.js 가 조작하는 핵심 버튼 id
  for (const id of ["btn-start", "btn-pause", "btn-restart"]) {
    assert.ok(HTML.includes(id), `버튼 id=${id} 누락`);
  }
});

test("마크업: <noscript> 폴백 존재 (§7.4)", () => {
  assert.match(HTML, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test("스타일: 코트 반응형 aspect-ratio 2/1 + 핵심 토큰 정의", () => {
  assert.match(CSS, /aspect-ratio\s*:\s*2\s*\/\s*1/);
  for (const tok of ["--court-bg", "--paddle-player", "--paddle-cpu", "--ball-color", "--color-accent"]) {
    assert.ok(CSS.includes(tok), `토큰 ${tok} 미정의`);
  }
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 — 상수 (planner §3.1)
// ══════════════════════════════════════════════════════════
test("상수: planner §3.1 값 일치", () => {
  assert.equal(L.COURT_WIDTH, 800);
  assert.equal(L.COURT_HEIGHT, 400);
  assert.equal(L.PADDLE_WIDTH, 12);
  assert.equal(L.PADDLE_HEIGHT, 80);
  assert.equal(L.PADDLE_MARGIN_X, 24);
  assert.equal(L.PADDLE_SPEED_KEYBOARD, 480);
  assert.equal(L.CPU_SPEED, 360);
  assert.equal(L.CPU_RETURN_SPEED, 180);
  assert.equal(L.BALL_RADIUS, 8);
  assert.equal(L.BALL_SPEED_INIT, 300);
  assert.equal(L.BALL_SPEED_INCREMENT, 1.05);
  assert.equal(L.BALL_SPEED_MAX, 600);
  assert.equal(L.WIN_SCORE, 11);
  assert.equal(L.POINT_PAUSE_MS, 800);
  assert.equal(L.MIN_VX_RATIO, 0.4);
  // 파생 좌표
  assert.equal(L.PLAYER_X, 24);
  assert.equal(L.CPU_X, 764);
  assert.equal(L.PADDLE_Y_MAX, 320);
  assert.equal(L.PADDLE_CENTER_Y, 160);
});

test("초기 상태: planner §6.1 형태", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "start");
  assert.equal(s.score.player, 0);
  assert.equal(s.score.cpu, 0);
  assert.equal(s.ball.x, 400);
  assert.equal(s.ball.y, 200);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.vy, 0);
  assert.equal(s.paddles.player.y, 160);
  assert.equal(s.paddles.cpu.y, 160);
  assert.equal(s.winner, null);
  assert.equal(s.pointPausedAt, null);
});

// ── clamp / moveTowards ──
test("clamp: 범위 밖 값 절단", () => {
  assert.equal(L.clamp(-5, 0, 320), 0);
  assert.equal(L.clamp(400, 0, 320), 320);
  assert.equal(L.clamp(160, 0, 320), 160);
});

test("moveTowards: maxDelta 초과분은 부분 이동, 이내는 스냅 (결정론)", () => {
  assert.equal(L.moveTowards(100, 200, 30), 130); // 위로 30
  assert.equal(L.moveTowards(200, 100, 30), 170); // 아래로 30
  assert.equal(L.moveTowards(100, 110, 30), 110); // 스냅
  assert.equal(L.moveTowards(100, 100, 30), 100); // 이미 도달
});

// ══════════════════════════════════════════════════════════
// 3-a) 벽 반사 (planner §3.3 · AC-RULE-01)
// ══════════════════════════════════════════════════════════
test("AC-RULE-01: 상단 벽 반사 — vy 부호 반전 + 벽 안쪽 보정", () => {
  const r = L.reflectWall({ x: 400, y: 4, vx: 100, vy: -200 });
  assert.equal(r.y, L.BALL_RADIUS); // 8 로 보정
  assert.ok(r.vy > 0, "상단 반사 후 vy 는 양수여야 함");
  assert.equal(r.vx, 100, "vx 는 벽 반사에서 불변");
});

test("AC-RULE-01: 하단 벽 반사 — vy 음수화", () => {
  const r = L.reflectWall({ x: 400, y: 398, vx: 100, vy: 200 });
  assert.equal(r.y, L.COURT_HEIGHT - L.BALL_RADIUS); // 392
  assert.ok(r.vy < 0, "하단 반사 후 vy 는 음수여야 함");
});

test("AC-RULE-01: 벽에 닿지 않으면 그대로", () => {
  const r = L.reflectWall({ x: 400, y: 200, vx: 100, vy: 150 });
  assert.equal(r.x, 400);
  assert.equal(r.y, 200);
  assert.equal(r.vx, 100);
  assert.equal(r.vy, 150);
});

// ══════════════════════════════════════════════════════════
// 3-b) 패들 충돌·반사각 (planner §3.4 · AC-RULE-02)
// ══════════════════════════════════════════════════════════
test("ballHitsPaddle: X·Y 겹침 판정", () => {
  const paddle = { y: 160 };
  // CPU 패들 근처 (x=764~776), 공 y=200 (패들 160~240 안)
  assert.equal(L.ballHitsPaddle({ x: 766, y: 200 }, L.CPU_X, paddle), true);
  // Y 벗어남
  assert.equal(L.ballHitsPaddle({ x: 766, y: 100 }, L.CPU_X, paddle), false);
  // X 벗어남
  assert.equal(L.ballHitsPaddle({ x: 400, y: 200 }, L.CPU_X, paddle), false);
});

test("AC-RULE-02: 패들 정중앙 충돌 → 거의 수평 반사 + vx 부호 반전", () => {
  const paddle = { y: 160 }; // 중심 y=200
  const ball = { x: 766, y: 200, vx: 300, vy: 0 }; // 정중앙 (rel=0)
  const out = L.paddleBounce(ball, paddle);
  assert.ok(out.vx < 0, "vx>0 로 진입 → 반사 후 음수");
  assert.ok(Math.abs(out.vy) < 1e-6, "정중앙 → vy≈0 (수평)");
  // 속력 = 300*1.05 = 315
  const speed = Math.hypot(out.vx, out.vy);
  assert.ok(Math.abs(speed - 315) < 1e-6, `속력 315 기대, 실제 ${speed}`);
});

test("AC-RULE-02: 패들 끝단 충돌 → 큰 각도 + MIN_VX_RATIO 하한 보장", () => {
  const paddle = { y: 160 }; // 하단 끝 y=240 (rel=+1)
  const ball = { x: 766, y: 240, vx: 300, vy: 0 };
  const out = L.paddleBounce(ball, paddle);
  const speed = Math.hypot(out.vx, out.vy);
  // rel=1 → cos(60°)=0.5 > 0.4 → vx = -315*0.5, vy = 315*sin(60°)
  assert.ok(out.vx < 0);
  assert.ok(out.vy > 0, "하단 끝단 → vy 양수(아래로)");
  // vx 성분이 전체의 40% 이상 유지
  assert.ok(Math.abs(out.vx) >= 0.4 * speed - 1e-6, "MIN_VX_RATIO 하한 위반");
});

test("AC-RULE-02·10.3: 속력 상한 BALL_SPEED_MAX(600) 캡", () => {
  const paddle = { y: 160 };
  // 이미 매우 빠른 공 → 1.05 배 후에도 600 초과 금지
  const ball = { x: 766, y: 200, vx: 590, vy: 0 };
  const out = L.paddleBounce(ball, paddle);
  const speed = Math.hypot(out.vx, out.vy);
  assert.ok(speed <= 600 + 1e-6, `속력 상한 초과: ${speed}`);
});

test("AC-RULE-02·10.2: 플레이어 패들 반사 시 vx 양수화 (우측으로)", () => {
  const paddle = { y: 160 };
  const ball = { x: 34, y: 200, vx: -300, vy: 0 }; // 좌측 진입
  const out = L.paddleBounce(ball, paddle);
  assert.ok(out.vx > 0, "vx<0 진입 → 반사 후 양수 (우측으로)");
});

// ══════════════════════════════════════════════════════════
// 3-c) CPU AI 결정론 (planner §3.5 · AC-RULE-05)
// ══════════════════════════════════════════════════════════
test("AC-RULE-05: CPU AI 동일 입력 → 동일 출력 (결정론)", () => {
  const ball = { x: 500, y: 300, vx: 200, vy: 50 };
  const a = L.updateCpu(160, ball, 1 / 60);
  const b = L.updateCpu(160, ball, 1 / 60);
  assert.equal(a, b);
});

test("AC-RULE-05: 공이 CPU 쪽(vx>0) → 공 y 추적", () => {
  const ball = { x: 500, y: 300, vx: 200, vy: 0 };
  const next = L.updateCpu(160, ball, 1 / 60);
  // targetY = 300 - 40 = 260, 최대이동 = 360/60 = 6 → 160+6=166
  assert.ok(next > 160, "공 아래쪽 추적 → cpu.y 증가");
  assert.equal(next, 166);
});

test("AC-RULE-05: 공이 플레이어 쪽(vx<0) → 중앙 복귀", () => {
  const ball = { x: 300, y: 50, vx: -200, vy: 0 };
  const next = L.updateCpu(200, ball, 1 / 60);
  // centerY=160, 200에서 복귀 최대이동=180/60=3 → 197
  assert.equal(next, 197);
});

test("AC-RULE-05: CPU y 범위 [0,320] 클램프", () => {
  const ball = { x: 500, y: 0, vx: 200, vy: 0 };
  const next = L.updateCpu(2, ball, 5); // 큰 dt → target=-40 이지만 클램프
  assert.ok(next >= 0 && next <= 320);
});

// ══════════════════════════════════════════════════════════
// 3-d) 득점·승리 (planner §4 · AC-RULE-03/04 · AC-STATE-03)
// ══════════════════════════════════════════════════════════
test("AC-RULE-03: 득점 판정 — 좌측 out=cpu, 우측 out=player", () => {
  assert.equal(L.checkScore({ x: -1, y: 200 }), "cpu");
  assert.equal(L.checkScore({ x: 801, y: 200 }), "player");
  assert.equal(L.checkScore({ x: 400, y: 200 }), null);
  assert.equal(L.checkScore({ x: 0, y: 200 }), null); // 경계 완전 이탈 아님
  assert.equal(L.checkScore({ x: 800, y: 200 }), null);
});

test("AC-RULE-04·AC-STATE-03: 11점 선취 승리, 미만은 null", () => {
  assert.equal(L.checkWinner({ player: 11, cpu: 9 }), "player");
  assert.equal(L.checkWinner({ player: 5, cpu: 11 }), "cpu");
  assert.equal(L.checkWinner({ player: 10, cpu: 10 }), null);
  assert.equal(L.checkWinner({ player: 0, cpu: 0 }), null);
});

test("AC-RULE-04: deuce 없음 — 11:10 도 즉시 승리", () => {
  assert.equal(L.checkWinner({ player: 11, cpu: 10 }), "player");
});

// ══════════════════════════════════════════════════════════
// 3-e) 서브 각도/방향 범위 (planner §3.1·§10.1 · 대량 반복 범위 검증)
// ══════════════════════════════════════════════════════════
test("서브: 방향/각도가 SERVE_ANGLE_RANGE(10~45°) 내, 속력=300 (1000회)", () => {
  let leftCount = 0;
  let upCount = 0;
  for (let i = 0; i < 1000; i += 1) {
    const v = L.makeServe(Math.random);
    const speed = Math.hypot(v.vx, v.vy);
    assert.ok(Math.abs(speed - 300) < 1e-6, `서브 속력 300 기대, 실제 ${speed}`);
    const angleDeg = (Math.atan2(Math.abs(v.vy), Math.abs(v.vx)) * 180) / Math.PI;
    assert.ok(angleDeg >= 10 - 1e-6 && angleDeg <= 45 + 1e-6, `각도 범위 이탈: ${angleDeg}`);
    if (v.vx < 0) leftCount += 1;
    if (v.vy < 0) upCount += 1;
  }
  // 양방향이 모두 출현해야 함 (완전 편향 아님)
  assert.ok(leftCount > 0 && leftCount < 1000, "좌/우 방향 모두 출현해야 함");
  assert.ok(upCount > 0 && upCount < 1000, "상/하 방향 모두 출현해야 함");
});

test("서브: rand 주입 결정론 — 동일 시퀀스 → 동일 벡터", () => {
  const seq = [0.2, 0.8, 0.5]; // dirX=좌, dirY=하, angle=중간
  const mk = () => {
    let i = 0;
    return () => seq[i++];
  };
  const a = L.makeServe(mk());
  const b = L.makeServe(mk());
  assert.deepEqual(a, b);
  assert.ok(a.vx < 0, "rand<0.5 → dirX 좌(-)");
  assert.ok(a.vy > 0, "rand≥0.5 → dirY 하(+)");
});

test("serveBall: 중앙 리셋 + 서브 벡터", () => {
  const b = L.serveBall(() => 0.5);
  assert.equal(b.x, 400);
  assert.equal(b.y, 200);
  assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 300) < 1e-6);
});

// ══════════════════════════════════════════════════════════
// 3-f) 델타타임 클램프 (planner §10.5)
// ══════════════════════════════════════════════════════════
test("clampDt: 상한 1/30 클램프 + 비정상값 방어", () => {
  assert.equal(L.clampDt(1 / 60), 1 / 60);
  assert.equal(L.clampDt(1), 1 / 30); // 백그라운드 복귀 폭주 방지
  assert.equal(L.clampDt(0), 0);
  assert.equal(L.clampDt(-5), 0);
  assert.equal(L.clampDt(NaN), 0);
});
