// BF-937 · Simon Says 단위 테스트 (focused scope · module: simon-says)
// - 대상: phase18-games/simon-says/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/simon-says-BF937.test.js
// - 디자인 SSOT: docs/design/simon-says-BF-936.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type=module>·
//      fetch/외부 URL/localStorage 0건.
//   2) 마크업 계약 — main.js 가 의존하는 클래스/data 속성 + <title>/<h1> 고정.
//   3) 순수 상태 전이 로직 — logic.js 를 샌드박스 로드해 시작·정답 진행·라운드 증가·
//      시퀀스 확장·오답 종료·재시작을 결정론 rand 로 검증 (AC1·AC2·AC3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "simon-says");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 같은 realm 에서 로드해 SimonLogic 추출 ───────────
// UMD(module.exports) 패턴을 현재 realm 의 Function 으로 평가해 로드한다.
// 같은 realm 이므로 반환 객체 prototype 이 테스트와 일치 → deepStrictEqual 정상 동작.
function loadLogic() {
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "globalThis", LOGIC_JS);
  fn(mod, mod.exports, {});
  return mod.exports;
}

const L = loadLogic();
assert.ok(L && L.createInitialState, "logic.js 가 SimonLogic API 를 노출하지 않음");

// 결정론 rand 헬퍼: 지정한 [0,1) 값 시퀀스를 순환 반환.
function seqRand(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// 패드 인덱스(0~3) → rand 값. PADS=[green,red,yellow,blue], idx=floor(r*4).
// idx 를 안정적으로 뽑도록 중앙값(예: (idx+0.5)/4) 사용.
function randForPadIndex(idx) {
  return (idx + 0.5) / 4;
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드
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

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건", () => {
  const re = /fetch\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\/|localStorage|sessionStorage/;
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS], ["styles.css", CSS]]) {
    assert.ok(!re.test(src), `${name} 에 외부 의존성/영속저장 흔적 존재`);
  }
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 (main.js 가 의존하는 셀렉터 · 타이틀)
// ══════════════════════════════════════════════════════════
test("마크업: <title> 과 <h1> 존재", () => {
  assert.match(HTML, /<title>[^<]*Simon Says[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*class="app__title"[^>]*>\s*Simon Says\s*<\/h1>/);
});

test("마크업: 4색 패드 버튼(data-pad·data-key·aria-label) 존재", () => {
  const pads = [
    ["green", "1"],
    ["red", "2"],
    ["yellow", "3"],
    ["blue", "4"],
  ];
  for (const [pad, key] of pads) {
    assert.match(HTML, new RegExp(`data-pad="${pad}"`), `data-pad="${pad}" 누락`);
    const re = new RegExp(`data-pad="${pad}"[^>]*data-key="${key}"|data-key="${key}"[^>]*data-pad="${pad}"`);
    assert.match(HTML, re, `${pad} 패드의 data-key="${key}" 매핑 누락`);
  }
  // 접근성: 각 패드 aria-label
  assert.match(HTML, /aria-label="초록 패드 \(숫자 1\)"/);
  assert.match(HTML, /aria-label="파랑 패드 \(숫자 4\)"/);
});

test("마크업: status/round-badge/controls/hint 골격 존재", () => {
  assert.match(HTML, /class="status"[^>]*role="status"[^>]*aria-live="polite"|role="status"[^>]*aria-live="polite"[^>]*class="status"/);
  assert.match(HTML, /class="round-badge"[^>]*role="img"/);
  assert.match(HTML, /class="round-badge__value"/);
  assert.match(HTML, /id="btn-start"/);
  assert.match(HTML, /id="btn-restart"/);
  assert.match(HTML, /class="hint"/);
});

test("마크업: logic.js·main.js 를 비-module script 로 로드", () => {
  assert.match(HTML, /<script src="\.\/logic\.js"><\/script>/);
  assert.match(HTML, /<script src="\.\/main\.js"><\/script>/);
});

test("스타일: 명세 토큰(:root) 및 핵심 클래스 존재", () => {
  assert.match(CSS, /--pad-green-lit:\s*#38F58A/);
  assert.match(CSS, /--pad-blue-dim:\s*#1E4E8E/);
  assert.match(CSS, /\.pad\.is-lit/);
  assert.match(CSS, /prefers-reduced-motion/);
});

// ══════════════════════════════════════════════════════════
// 3) 순수 상태 전이 로직
// ══════════════════════════════════════════════════════════
test("상수: PADS 는 green/red/yellow/blue 4색", () => {
  assert.deepEqual(L.PADS, ["green", "red", "yellow", "blue"]);
});

test("createInitialState: idle·빈 시퀀스·round 0", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "idle");
  assert.deepEqual(s.sequence, []);
  assert.equal(s.round, 0);
  assert.equal(s.inputIndex, 0);
});

test("randomPad: 주입 rand 로 결정론적 선택", () => {
  assert.equal(L.randomPad(seqRand([randForPadIndex(0)])), "green");
  assert.equal(L.randomPad(seqRand([randForPadIndex(1)])), "red");
  assert.equal(L.randomPad(seqRand([randForPadIndex(2)])), "yellow");
  assert.equal(L.randomPad(seqRand([randForPadIndex(3)])), "blue");
  // r()===1 근접(경계) 방어 — 인덱스 초과 없이 마지막 패드
  assert.equal(L.randomPad(() => 0.999999), "blue");
});

test("startGame: idle → watch, 시퀀스 길이 1, round 1", () => {
  const s0 = L.createInitialState();
  const s1 = L.startGame(s0, seqRand([randForPadIndex(1)]));
  assert.equal(s1.status, "watch");
  assert.deepEqual(s1.sequence, ["red"]);
  assert.equal(s1.round, 1);
  assert.equal(s1.inputIndex, 0);
});

test("beginInput: watch → input (재생 완료 후 입력 대기)", () => {
  const watch = L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)]));
  const input = L.beginInput(watch);
  assert.equal(input.status, "input");
  assert.equal(input.inputIndex, 0);
  assert.deepEqual(input.sequence, watch.sequence);
});

test("beginInput: input 이 아니면 무시(원본 그대로)", () => {
  const s0 = L.createInitialState();
  assert.equal(L.beginInput(s0).status, "idle");
});

test("handleInput: input 상태가 아니면 무시", () => {
  const watch = L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)]));
  const after = L.handleInput(watch, "green", seqRand([0]));
  assert.equal(after.status, "watch"); // 재생 중 입력은 반영되지 않음
});

// ── AC1: 정답 입력 → 라운드 1 증가 + 다음 시퀀스 확장 ──
test("AC1: 시퀀스 전체 정답 입력 시 round +1, 시퀀스 1개 확장, watch 복귀", () => {
  // 시작 시퀀스 = [green] (round 1)
  const watch = L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)]));
  const input = L.beginInput(watch);
  // green 정답 입력 → 라운드 완료 → 확장 (다음 확장 패드 = red)
  const next = L.handleInput(input, "green", seqRand([randForPadIndex(1)]));
  assert.equal(next.status, "watch", "라운드 완료 후 재생 상태로 복귀");
  assert.equal(next.round, 2, "라운드가 1 증가");
  assert.deepEqual(next.sequence, ["green", "red"], "시퀀스가 1개 확장");
  assert.equal(next.inputIndex, 0, "입력 인덱스 리셋");
});

test("AC1: 시퀀스 중간까지 정답이면 input 유지·inputIndex 전진 (라운드 미증가)", () => {
  // 2단계 시퀀스 [green, red] 를 직접 구성해 input 진입
  let s = L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)])); // [green]
  s = L.handleInput(L.beginInput(s), "green", seqRand([randForPadIndex(1)])); // → watch [green,red] round2
  s = L.beginInput(s); // input
  const step1 = L.handleInput(s, "green", seqRand([0])); // 첫 입력 정답
  assert.equal(step1.status, "input", "시퀀스 미완이면 입력 대기 유지");
  assert.equal(step1.inputIndex, 1, "inputIndex 전진");
  assert.equal(step1.round, 2, "라운드 유지");
  assert.deepEqual(step1.sequence, ["green", "red"], "시퀀스 불변");
});

test("AC1: 원본 상태 불변(순수 함수) — handleInput 이 입력 state 를 변형하지 않음", () => {
  const input = L.beginInput(L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)])));
  const snapshot = JSON.parse(JSON.stringify(input));
  L.handleInput(input, "green", seqRand([randForPadIndex(1)]));
  assert.deepEqual(input, snapshot, "handleInput 호출 후 원본 state 가 변형됨");
});

// ── AC2: 오답 입력 → 종료 상태 전이 + 재시작 가능 ──
test("AC2: 오답 입력 시 gameover 로 전이", () => {
  const input = L.beginInput(L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)]))); // [green]
  const over = L.handleInput(input, "red", seqRand([0])); // 정답 green 인데 red → 오답
  assert.equal(over.status, "gameover");
  assert.equal(over.round, 1, "종료 시점 라운드 보존");
});

test("AC2: 시퀀스 중간 오답도 gameover", () => {
  let s = L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)])); // [green]
  s = L.handleInput(L.beginInput(s), "green", seqRand([randForPadIndex(1)])); // watch [green,red]
  s = L.beginInput(s);
  s = L.handleInput(s, "green", seqRand([0])); // 첫 입력 정답 (inputIndex=1)
  const over = L.handleInput(s, "green", seqRand([0])); // 두번째 정답은 red 인데 green → 오답
  assert.equal(over.status, "gameover");
});

test("AC2: gameover 상태에서 handleInput 은 무시", () => {
  const input = L.beginInput(L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)])));
  const over = L.handleInput(input, "red", seqRand([0]));
  const still = L.handleInput(over, "green", seqRand([0]));
  assert.equal(still.status, "gameover");
});

test("AC2: gameover → startGame 으로 재시작 가능 (새 게임 초기화)", () => {
  const input = L.beginInput(L.startGame(L.createInitialState(), seqRand([randForPadIndex(0)])));
  const over = L.handleInput(input, "red", seqRand([0]));
  const restarted = L.startGame(over, seqRand([randForPadIndex(2)]));
  assert.equal(restarted.status, "watch");
  assert.equal(restarted.round, 1, "재시작 시 라운드 1 리셋");
  assert.deepEqual(restarted.sequence, ["yellow"], "재시작 시 새 시퀀스 1개");
  assert.equal(restarted.inputIndex, 0);
});

// ── 여러 라운드 누적 시나리오 (통합) ──
test("통합: 3라운드 연속 성공 시 시퀀스 길이·라운드 누적", () => {
  // 확장 패드가 매번 green(idx0) 이 되도록 rand 고정
  const R = () => randForPadIndex(0);
  let s = L.startGame(L.createInitialState(), R); // [green] round1
  for (let round = 1; round <= 3; round++) {
    s = L.beginInput(s);
    // 현재 시퀀스 전부 정답 입력 (모두 green)
    for (let i = 0; i < s.sequence.length; i++) {
      s = L.handleInput(s, "green", R);
    }
    // 라운드 완료 → watch, round+1, 시퀀스 +1
    assert.equal(s.status, "watch");
    assert.equal(s.round, round + 1);
    assert.equal(s.sequence.length, round + 1);
  }
});
