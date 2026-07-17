// BF-961 · Pong 키보드 조작·일시정지 단위 테스트 (focused scope · module: phase18-games/pong)
// - 대상: phase18-games/pong/{index.html, styles.css, main.js}
// - 실행: node --test tests/pong-BF961.test.js
// - 디자인 SSOT: docs/design/pong-maintenance-BF-960.md (§5 포커스 링·문구·§6 dev 가이드)
//
// 검증 축 (BF-961 수용 기준):
//   AC1) 키보드만으로 시작·이동·일시정지·재개·재시작이 동작한다.
//   AC2) 일시정지 상태가 유지되는 동안 점수와 공 상태가 변하지 않는다(동결).
//   AC3) 기존 터치(Pointer) 조작·게임 규칙·무관 요소가 보존된다.
//   + 디자인: 오버레이 타이틀 포커스 링 CSS·조작 안내 문구(키 세트 완전성).
//
// 전략: jsdom 미의존(vanilla-static). 경량 DOM 하니스를 node:vm 로 구성해
//       실제 main.js(IIFE)를 구동하고, keydown 이벤트를 dispatch 해 상태를 관찰한다.
//       공 좌표는 render()의 ctx.arc(ballX, ballY, ...) 호출을, 패들 y 는 roundRect()
//       호출을 하니스 ctx 가 기록하는 방식으로 canvas 를 통하지 않고 관찰한다.

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

// ══════════════════════════════════════════════════════════
// DOM 하니스 — main.js 를 실제 구동하기 위한 최소 mock
// ══════════════════════════════════════════════════════════
function makeElement(id) {
  var attrs = {};
  var listeners = {};
  return {
    id: id,
    textContent: "",
    hidden: false,
    disabled: false,
    _attrs: attrs,
    _listeners: listeners,
    setAttribute: function (k, v) {
      attrs[k] = String(v);
    },
    getAttribute: function (k) {
      return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
    },
    removeAttribute: function (k) {
      delete attrs[k];
    },
    addEventListener: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    focus: function () {
      this._focused = true;
    },
    // canvas 전용 stub (court 에만 실제로 쓰임)
    getContext: null,
    getBoundingClientRect: function () {
      return { top: 0, left: 0, width: 800, height: 400 };
    },
    setPointerCapture: function () {},
    releasePointerCapture: function () {},
  };
}

// render() 관찰용 ctx — 공(arc)·패들(roundRect) 좌표를 기록
function makeCtx(record) {
  var noop = function () {};
  return {
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    setLineDash: noop,
    save: noop,
    restore: noop,
    fill: noop,
    closePath: noop,
    arcTo: function (x1, y1) {
      // roundRect() 는 arcTo 로 사각형을 그림 — 첫 arcTo 의 시작점 근사 대신
      // roundRect 진입 시점을 별도로 기록하므로 여기선 무시
    },
    // 공: main.js render() 의 유일한 arc 호출
    arc: function (x, y) {
      record.ballArcs.push({ x: x, y: y });
    },
    // 값 프로퍼티 (setter 무시)
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
  };
}

// main.js 를 vm 에서 구동하고 제어 핸들을 반환
function bootGame() {
  var record = { ballArcs: [], paddleRects: [] };
  var ctx = makeCtx(record);

  // roundRect 는 main.js 내부 함수라 ctx 로 안 잡힘 → beginPath 직후 moveTo(x+r,y)
  // 패턴을 잡기 위해 moveTo 를 후킹해 패들 좌표를 근사 기록
  var origMoveTo = ctx.moveTo;
  ctx.moveTo = function (x, y) {
    record.paddleRects.push({ x: x, y: y });
    return origMoveTo(x, y);
  };

  var elements = {};
  function el(id) {
    if (!elements[id]) elements[id] = makeElement(id);
    return elements[id];
  }
  var court = el("court");
  court.getContext = function () {
    return ctx;
  };

  var docListeners = {};
  var rafQueue = [];
  var sandbox = {
    Math: Math,
    console: console,
    requestAnimationFrame: function (cb) {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    getComputedStyle: function () {
      return { getPropertyValue: function () { return ""; } };
    },
    document: {
      documentElement: el("__html__"),
      getElementById: function (id) {
        return el(id);
      },
      querySelector: function (sel) {
        if (sel === ".pong-scoreboard") return el("__scoreboard__");
        if (sel === '[data-role="player-score"]') return el("__pscore__");
        if (sel === '[data-role="cpu-score"]') return el("__cscore__");
        return null;
      },
      addEventListener: function (type, fn) {
        (docListeners[type] = docListeners[type] || []).push(fn);
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // logic.js → globalThis.PongLogic, 이어서 main.js(IIFE) 구동
  vm.runInContext(LOGIC_JS, sandbox, { filename: "phase18-games/pong/logic.js" });
  vm.runInContext(MAIN_JS, sandbox, { filename: "phase18-games/pong/main.js" });

  function dispatchKey(type, key) {
    var prevented = false;
    var ev = {
      key: key,
      preventDefault: function () {
        prevented = true;
      },
    };
    (docListeners[type] || []).forEach(function (fn) {
      fn(ev);
    });
    return prevented;
  }

  // 대기 중인 rAF 콜백을 주어진 timestamp 로 1프레임 실행
  function frame(now) {
    var cbs = rafQueue.splice(0);
    cbs.forEach(function (cb) {
      cb(now);
    });
  }

  function status() {
    // overlay.hidden 이면 playing, 아니면 data-state
    var overlay = el("overlay");
    if (overlay.hidden) return "playing";
    return overlay.getAttribute("data-state");
  }

  function score() {
    return {
      player: Number(el("__pscore__").textContent),
      cpu: Number(el("__cscore__").textContent),
    };
  }

  function lastBall() {
    return record.ballArcs[record.ballArcs.length - 1] || null;
  }

  // 플레이어 패들(x≈PLAYER_X=24)의 최신 y — roundRect 진입 시 moveTo(x+r, y)
  // r=3 → x=27 이 플레이어 패들. 프레임마다 마지막 것을 취함.
  function playerPaddleY() {
    var hit = null;
    record.paddleRects.forEach(function (p) {
      if (p.x === 27) hit = p.y; // PLAYER_X(24) + r(3)
    });
    return hit;
  }

  return {
    el: el,
    dispatchKey: dispatchKey,
    frame: frame,
    status: status,
    score: score,
    lastBall: lastBall,
    playerPaddleY: playerPaddleY,
    record: record,
  };
}

// ══════════════════════════════════════════════════════════
// AC1 — 키보드만으로 시작·이동·일시정지·재개·재시작 동작
// ══════════════════════════════════════════════════════════
test("AC1: 초기 status=start, Enter 키로 시작 → playing", () => {
  const g = bootGame();
  assert.equal(g.status(), "start");
  const prevented = g.dispatchKey("keydown", "Enter");
  assert.equal(g.status(), "playing", "Enter 로 게임이 시작되어야 함");
  assert.equal(prevented, true, "start 에서 Enter 는 기본동작 차단");
});

test("AC1: Space 키로도 시작된다", () => {
  const g = bootGame();
  g.dispatchKey("keydown", " ");
  assert.equal(g.status(), "playing");
});

test("AC1: ↑ 키 홀드 → 플레이어 패들이 위로 이동", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter"); // playing
  g.frame(1000); // lastTime 초기화 (dt=0)
  const y0 = g.playerPaddleY();
  assert.equal(y0, 160, "시작 시 패들 중앙(160)");
  g.dispatchKey("keydown", "ArrowUp");
  for (let t = 1016; t <= 1096; t += 16) g.frame(t); // ~80ms 홀드
  const y1 = g.playerPaddleY();
  assert.ok(y1 < y0, `↑ 홀드로 패들 y 감소해야 함 (y0=${y0}, y1=${y1})`);
  assert.ok(y1 >= 0, "패들 y 하한 0 클램프");
});

test("AC1: ↓ 키 홀드 → 플레이어 패들이 아래로 이동", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  g.frame(1000);
  const y0 = g.playerPaddleY();
  g.dispatchKey("keydown", "ArrowDown");
  for (let t = 1016; t <= 1096; t += 16) g.frame(t);
  const y1 = g.playerPaddleY();
  assert.ok(y1 > y0, `↓ 홀드로 패들 y 증가해야 함 (y0=${y0}, y1=${y1})`);
  assert.ok(y1 <= 320, "패들 y 상한 320 클램프");
});

test("AC1: P 키로 일시정지 → 재개(playing 복귀)", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  assert.equal(g.status(), "playing");
  g.dispatchKey("keydown", "P");
  assert.equal(g.status(), "paused", "P 로 일시정지");
  g.dispatchKey("keydown", "P");
  assert.equal(g.status(), "playing", "P 로 재개");
});

test("AC1: Esc 키로도 일시정지·재개 토글", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  g.dispatchKey("keydown", "Escape");
  assert.equal(g.status(), "paused", "Esc 로 일시정지");
  g.dispatchKey("keydown", "Escape");
  assert.equal(g.status(), "playing", "Esc 로 재개");
});

test("AC1: R 키로 재시작 → 점수 0:0, playing 유지", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  g.el("__pscore__").textContent = "5"; // 점수 오염 시뮬레이션
  g.dispatchKey("keydown", "R");
  assert.equal(g.status(), "playing", "R 재시작 후 playing");
  assert.deepEqual(g.score(), { player: 0, cpu: 0 }, "재시작 시 점수 초기화");
});

// ══════════════════════════════════════════════════════════
// AC2 — 일시정지 유지 동안 점수·공 동결 (핵심)
// ══════════════════════════════════════════════════════════
test("AC2: 일시정지 유지 동안 공 좌표가 프레임마다 불변(동결)", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter"); // playing, 공 서브
  // 몇 프레임 진행해 공을 실제로 움직인다
  let t = 1000;
  g.frame(t);
  for (let i = 0; i < 4; i += 1) {
    t += 16;
    g.frame(t);
  }
  const movingBall = g.lastBall();
  assert.ok(movingBall, "playing 중 공이 렌더되어야 함");

  // 일시정지
  g.dispatchKey("keydown", "P");
  assert.equal(g.status(), "paused");
  g.record.ballArcs.length = 0; // 관찰 버퍼 초기화
  g.frame((t += 16));
  const frozen = g.lastBall();
  assert.ok(frozen, "일시정지 중에도 공은 계속 보여야 함(§5.4 동결 시각)");

  // 이후 여러 프레임 — 공 좌표 불변이어야 함
  for (let i = 0; i < 10; i += 1) {
    t += 16;
    g.frame(t);
    const b = g.lastBall();
    assert.equal(b.x, frozen.x, `일시정지 중 공 x 불변 (frame ${i})`);
    assert.equal(b.y, frozen.y, `일시정지 중 공 y 불변 (frame ${i})`);
  }
});

test("AC2: 일시정지 유지 동안 점수 불변(동결)", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  let t = 1000;
  g.frame(t);
  g.dispatchKey("keydown", "P");
  const before = g.score();
  for (let i = 0; i < 60; i += 1) {
    t += 16;
    g.frame(t);
  }
  assert.deepEqual(g.score(), before, "일시정지 중 점수는 변하지 않아야 함");
});

test("AC2: 재개 후 공이 다시 움직인다(동결 해제 확인)", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter");
  let t = 1000;
  g.frame(t);
  g.frame((t += 16));
  g.dispatchKey("keydown", "P"); // paused
  g.frame((t += 16));
  const paused = g.lastBall();
  g.dispatchKey("keydown", "P"); // resume → playing
  g.record.ballArcs.length = 0;
  // 재개 후 dt 를 확보하기 위해 두 프레임(첫 프레임은 lastTime 재설정 성격)
  g.frame((t += 16));
  g.frame((t += 16));
  const resumed = g.lastBall();
  assert.ok(resumed, "재개 후 공 렌더");
  assert.ok(
    resumed.x !== paused.x || resumed.y !== paused.y,
    "재개하면 공이 다시 움직여야 함"
  );
});

// ══════════════════════════════════════════════════════════
// AC3 — 기존 터치(Pointer) 조작·무관 요소 보존
// ══════════════════════════════════════════════════════════
test("AC3: canvas 에 pointer 이벤트 리스너가 그대로 바인딩됨", () => {
  const g = bootGame();
  const court = g.el("court");
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
    assert.ok(
      (court._listeners[type] || []).length > 0,
      `canvas 에 ${type} 핸들러가 보존되어야 함(터치 조작 회귀 금지)`
    );
  }
});

test("AC3: playing 중 pointerdown 드래그로 패들 이동(터치 경로 보존)", () => {
  const g = bootGame();
  g.dispatchKey("keydown", "Enter"); // playing
  const court = g.el("court");
  const down = (court._listeners["pointerdown"] || [])[0];
  assert.ok(down, "pointerdown 핸들러 존재");
  // 코트 상단(clientY=40) 을 누르면 패들이 위쪽으로 이동
  down({ pointerId: 1, clientY: 40, preventDefault: function () {} });
  g.frame(1000);
  const y = g.playerPaddleY();
  assert.ok(y < 160, `상단 드래그로 패들이 위로 이동해야 함 (y=${y})`);
});

test("AC3: logic.js 게임 규칙 상수 보존 (무변경 확인)", () => {
  // logic.js 는 본 task 에서 손대지 않음 — 핵심 상수 회귀 없음 확인
  assert.match(LOGIC_JS, /WIN_SCORE\s*=\s*11/);
  assert.match(LOGIC_JS, /PADDLE_SPEED_KEYBOARD\s*=\s*480/);
  assert.match(LOGIC_JS, /POINT_PAUSE_MS\s*=\s*800/);
});

// ══════════════════════════════════════════════════════════
// 디자인 — 포커스 링 CSS (§5.1 / AC-F1·F3)
// ══════════════════════════════════════════════════════════
test("디자인: 오버레이 타이틀에서 outline:none 제거됨", () => {
  // .pong-overlay__title 블록에 outline: none 이 남아있지 않아야 함(GAP-1)
  const block = CSS.match(/\.pong-overlay__title\s*\{[^}]*\}/);
  assert.ok(block, ".pong-overlay__title 규칙 존재");
  assert.ok(
    !/outline\s*:\s*none/.test(block[0]),
    ".pong-overlay__title 에 outline:none 이 남아있으면 포커스 표시가 사라짐"
  );
});

test("디자인: 타이틀 :focus-visible 포커스 링 = 버튼과 동일 토큰·값(AC-F3)", () => {
  assert.match(
    CSS,
    /\.pong-overlay__title:focus-visible\s*\{[^}]*outline\s*:\s*3px\s+solid\s+var\(--color-focus-ring\)[^}]*outline-offset\s*:\s*2px/,
    "타이틀 :focus-visible 링(3px solid --color-focus-ring, offset 2px) 필요"
  );
  // 버튼 링도 동일 값으로 보존(AC-F2)
  assert.match(
    CSS,
    /\.pong-btn:focus-visible\s*\{[^}]*outline\s*:\s*3px\s+solid\s+var\(--color-focus-ring\)/,
    "버튼 포커스 링 보존(회귀 금지)"
  );
});

test("디자인: 신규 색 리터럴 도입 없음 — --color-focus-ring 재사용", () => {
  assert.match(CSS, /--color-focus-ring\s*:\s*rgba\(91,\s*130,\s*240,\s*0\.55\)/);
});

// ══════════════════════════════════════════════════════════
// 디자인 — 조작 안내 문구 (§5.2·§5.3·§5.4 / AC-H1·H2)
// ══════════════════════════════════════════════════════════
test("문구: 하단 hint 에 이동·일시정지/재개·재시작 키 세트 완전 포함", () => {
  const hint = HTML.match(/<p class="pong-hint">([\s\S]*?)<\/p>/);
  assert.ok(hint, ".pong-hint 존재");
  const t = hint[1];
  assert.match(t, /↑/);
  assert.match(t, /↓/);
  assert.match(t, /드래그/, "드래그(터치) 안내 유지 — 기존 요소 보존");
  assert.match(t, /P/);
  assert.match(t, /Esc/);
  assert.match(t, /R/);
});

test("문구: start 오버레이 본문에 시작 키(Enter/Space)+이동 안내 포함", () => {
  const start = MAIN_JS.match(/status[\s\S]*?===\s*"start"[\s\S]*?overlayBody\.textContent\s*=\s*([^;]*);/);
  assert.ok(start, "start 분기 overlayBody 할당 존재");
  const t = start[1];
  assert.match(t, /Enter/);
  assert.match(t, /Space/);
  assert.match(t, /↑/);
});

test("문구: paused 오버레이 본문에 재개 키(P/Esc) 안내 포함", () => {
  // "일시정지" 타이틀 직후의 overlayBody 할당(paused 분기 고유 지점)에 앵커
  const paused = MAIN_JS.match(/"일시정지"\s*;[\s\S]*?overlayBody\.textContent\s*=\s*([^;]*);/);
  assert.ok(paused, "paused 분기 overlayBody 할당 존재");
  const t = paused[1];
  assert.match(t, /P/);
  assert.match(t, /Esc/);
});
