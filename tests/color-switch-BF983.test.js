// BF-983 · 컬러 스위치 반응 게임 단위 테스트 (focused scope · module: color-switch)
// - 대상: color-switch/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/color-switch-BF983.test.js
// - 디자인 SSOT: docs/design/color-switch-BF-979.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·<script type=module>·
//      fetch/외부 URL/localStorage 0건 (게임 상태는 메모리 전용).
//   2) 마크업 계약 — main.js 가 의존하는 클래스/data 속성 + <title>/<h1> 고정.
//   3) 순수 상태 전이 로직 — logic.js 를 샌드박스 로드해 시작·라운드 생성·정답/오답 판정·
//      점수/연속/최고연속·시간 카운트다운·게임오버를 결정론 rand 로 검증 (AC1·AC2·AC3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "color-switch");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 같은 realm 에서 로드해 ColorSwitchLogic 추출 ───────────
function loadLogic() {
  const mod = { exports: {} };
  const fn = new Function("module", "exports", "globalThis", LOGIC_JS);
  fn(mod, mod.exports, {});
  return mod.exports;
}

const L = loadLogic();
assert.ok(L && L.createInitialState, "logic.js 가 ColorSwitchLogic API 를 노출하지 않음");

// 결정론 rand 헬퍼: 지정한 [0,1) 값 시퀀스를 순환 반환.
function seqRand(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

// 색 인덱스(0~3) → rand 값. COLORS=[red,green,yellow,blue], idx=floor(r*4).
function randForColorIndex(idx) {
  return (idx + 0.5) / 4;
}

// 규칙 인덱스(0~1) → rand 값. RULES=[ink,word], idx=floor(r*2).
function randForRuleIndex(idx) {
  return (idx + 0.5) / 2;
}

// generateRound 는 [rule, word, ink] 순으로 rand 를 소비한다(구현 계약).
// 지정한 rule/word/ink 를 만드는 rand 시퀀스 헬퍼.
function randForRound(ruleIdx, wordIdx, inkIdx) {
  return seqRand([
    randForRuleIndex(ruleIdx),
    randForColorIndex(wordIdx),
    randForColorIndex(inkIdx),
  ]);
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

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건 (메모리 전용)", () => {
  const re = /fetch\(|XMLHttpRequest|WebSocket|EventSource|https?:\/\/|localStorage|sessionStorage/;
  for (const [name, src] of [["index.html", HTML], ["logic.js", LOGIC_JS], ["main.js", MAIN_JS], ["styles.css", CSS]]) {
    assert.ok(!re.test(src), `${name} 에 외부 의존성/영속저장 흔적 존재`);
  }
});

// ══════════════════════════════════════════════════════════
// 2) 마크업 계약 (main.js 가 의존하는 셀렉터 · 타이틀)
// ══════════════════════════════════════════════════════════
test("마크업: <title> 과 <h1 class=app__title> 존재", () => {
  assert.match(HTML, /<title>[^<]*컬러 스위치[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*class="app__title"[^>]*>\s*컬러 스위치\s*<\/h1>/);
});

test("마크업: 4색 응답 버튼(data-color·data-key·aria-label) 존재", () => {
  const answers = [
    ["red", "1"],
    ["green", "2"],
    ["yellow", "3"],
    ["blue", "4"],
  ];
  for (const [color, key] of answers) {
    assert.match(HTML, new RegExp(`data-color="${color}"`), `data-color="${color}" 누락`);
    const re = new RegExp(`data-color="${color}"[^>]*data-key="${key}"|data-key="${key}"[^>]*data-color="${color}"`);
    assert.match(HTML, re, `${color} 버튼의 data-key="${key}" 매핑 누락`);
  }
  // 접근성: 각 버튼 aria-label (도형·숫자 병기)
  assert.match(HTML, /aria-label="빨강 \(도형 원, 숫자 1\)"/);
  assert.match(HTML, /aria-label="파랑 \(도형 마름모, 숫자 4\)"/);
});

test("마크업: HUD(점수·연속·시간) data-role 존재", () => {
  assert.match(HTML, /data-role="score"/);
  assert.match(HTML, /data-role="streak"/);
  assert.match(HTML, /data-role="time"/);
});

test("마크업: 규칙 배너/자극 존/피드백 골격 + aria-live", () => {
  assert.match(HTML, /class="rule-banner"[^>]*role="status"[^>]*aria-live="polite"|role="status"[^>]*aria-live="polite"[^>]*class="rule-banner"/);
  assert.match(HTML, /class="stimulus"/);
  assert.match(HTML, /class="stimulus__word"/);
  assert.match(HTML, /class="feedback[^"]*"[^>]*aria-live="assertive"|aria-live="assertive"[^>]*class="feedback[^"]*"/);
});

test("마크업: 컨트롤(시작/다시하기)·hint·answer-grid 존재", () => {
  assert.match(HTML, /id="btn-start"/);
  assert.match(HTML, /id="btn-restart"/);
  assert.match(HTML, /class="answer-grid"/);
  assert.match(HTML, /class="hint"/);
});

test("마크업: logic.js·main.js 를 비-module script 로 로드", () => {
  assert.match(HTML, /<script src="\.\/logic\.js"><\/script>/);
  assert.match(HTML, /<script src="\.\/main\.js"><\/script>/);
});

test("스타일: 명세 토큰(:root) 및 핵심 클래스 존재", () => {
  assert.match(CSS, /--sw-green-lit:\s*#38F58A/);
  assert.match(CSS, /--sw-blue-dim:\s*#1E4E8E/);
  assert.match(CSS, /--color-success:\s*#4ADE80/);
  assert.match(CSS, /\.answer-btn/);
  assert.match(CSS, /\.rule-banner/);
  assert.match(CSS, /\.stimulus/);
  assert.match(CSS, /prefers-reduced-motion/);
});

// ══════════════════════════════════════════════════════════
// 3) 순수 상태 전이 로직
// ══════════════════════════════════════════════════════════
test("상수: COLORS 는 red/green/yellow/blue, RULES 는 ink/word", () => {
  assert.deepEqual(L.COLORS, ["red", "green", "yellow", "blue"]);
  assert.deepEqual(L.RULES, ["ink", "word"]);
});

test("createInitialState: idle·score 0·streak 0·round null", () => {
  const s = L.createInitialState();
  assert.equal(s.status, "idle");
  assert.equal(s.score, 0);
  assert.equal(s.streak, 0);
  assert.equal(s.bestStreak, 0);
  assert.equal(s.round, null);
  assert.equal(s.locked, false);
  assert.equal(s.lastResult, null);
});

test("generateRound: 주입 rand 로 결정론적 rule/word/ink 생성", () => {
  // rule=ink(0), word=red(0), ink=blue(3)
  const r = L.generateRound(randForRound(0, 0, 3));
  assert.equal(r.rule, "ink");
  assert.equal(r.word, "red");
  assert.equal(r.ink, "blue");
});

test("getCorrectAnswer: rule=ink → 잉크색, rule=word → 단어 뜻", () => {
  assert.equal(L.getCorrectAnswer({ rule: "ink", word: "red", ink: "blue" }), "blue");
  assert.equal(L.getCorrectAnswer({ rule: "word", word: "red", ink: "blue" }), "red");
});

test("startGame: idle → playing, 점수/연속 리셋, 시간 = ROUND_TIME, round 생성", () => {
  const s0 = L.createInitialState();
  const s1 = L.startGame(s0, randForRound(0, 0, 3));
  assert.equal(s1.status, "playing");
  assert.equal(s1.score, 0);
  assert.equal(s1.streak, 0);
  assert.equal(s1.timeLeft, L.ROUND_TIME);
  assert.ok(s1.round && s1.round.rule, "첫 라운드가 생성됨");
  assert.equal(s1.locked, false);
});

// ── AC1/AC2: 정답/오답 판정 → 점수·연속·피드백 ──
test("AC1: 정답 입력 → score 증가·streak +1·locked·lastResult=correct", () => {
  // rule=ink, word=red, ink=blue → 정답은 blue
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const after = L.answer(s1, "blue", 500, randForRound(1, 1, 1));
  assert.equal(after.lastResult, "correct");
  assert.ok(after.score > 0, "정답 시 점수 증가");
  assert.equal(after.streak, 1, "연속 +1");
  assert.equal(after.locked, true, "판정 후 입력 잠금");
  assert.ok(after.lastGained > 0, "획득 점수 기록");
  assert.equal(after.correctAnswer, "blue");
});

test("AC2: 오답 입력 → score 불변·streak 0·lastResult=wrong·정답 안내", () => {
  // rule=ink, word=red, ink=blue → 정답 blue, 그런데 red 선택
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const after = L.answer(s1, "red", 500, randForRound(1, 1, 1));
  assert.equal(after.lastResult, "wrong");
  assert.equal(after.score, 0, "오답 시 점수 불변");
  assert.equal(after.streak, 0, "연속 리셋");
  assert.equal(after.lastGained, 0);
  assert.equal(after.correctAnswer, "blue", "정답 색 안내 제공");
  assert.equal(after.lastAnswer, "red", "선택 색 기록");
});

test("AC1: 빠른 반응이 느린 반응보다 더 높은 점수", () => {
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const fast = L.answer(s1, "blue", 100, randForRound(1, 1, 1));
  const slow = L.answer(s1, "blue", 1800, randForRound(1, 1, 1));
  assert.ok(fast.lastGained > slow.lastGained, "빠를수록 점수 높음");
});

test("연속 정답으로 bestStreak 갱신", () => {
  // rule=word, word=green, ink=green → 정답 green (매 라운드 동일 rand 로 green 정답 유지)
  let s = L.startGame(L.createInitialState(), randForRound(1, 1, 1));
  for (let i = 0; i < 3; i++) {
    s = L.answer(s, "green", 500, randForRound(1, 1, 1));
    s = L.nextRound(s, randForRound(1, 1, 1));
  }
  assert.equal(s.streak, 3);
  assert.equal(s.bestStreak, 3);
  // 오답 1회 → streak 0 이지만 bestStreak 는 3 유지
  s = L.answer(s, "red", 500, randForRound(1, 1, 1));
  assert.equal(s.streak, 0);
  assert.equal(s.bestStreak, 3, "최고 연속은 보존");
});

test("answer: playing 이 아니거나 locked 면 무시(원본 그대로)", () => {
  const idle = L.createInitialState();
  assert.equal(L.answer(idle, "red", 500, randForRound(0, 0, 0)).status, "idle");
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const answered = L.answer(s1, "blue", 500, randForRound(1, 1, 1));
  // 이미 locked → 두 번째 입력 무시
  const again = L.answer(answered, "red", 500, randForRound(1, 1, 1));
  assert.deepEqual(again, answered, "locked 상태에서 재입력은 무시");
});

test("answer: 원본 상태 불변(순수 함수)", () => {
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const snapshot = JSON.parse(JSON.stringify(s1));
  L.answer(s1, "blue", 500, randForRound(1, 1, 1));
  assert.deepEqual(s1, snapshot, "answer 호출 후 원본 state 변형됨");
});

test("nextRound: locked → 해제, 새 라운드 생성, lastResult 초기화", () => {
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const answered = L.answer(s1, "blue", 500, randForRound(1, 1, 1));
  // 다음 라운드: rule=word, word=yellow, ink=green
  const nxt = L.nextRound(answered, randForRound(1, 2, 1));
  assert.equal(nxt.locked, false);
  assert.equal(nxt.lastResult, null);
  assert.equal(nxt.round.word, "yellow");
  assert.equal(nxt.round.ink, "green");
  assert.equal(nxt.status, "playing");
});

test("nextRound: locked 가 아니면 무시", () => {
  const s1 = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  assert.deepEqual(L.nextRound(s1, randForRound(0, 0, 0)), s1);
});

test("tick: 시간 1 감소, 0 도달 시 gameover 전이", () => {
  let s = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  const t0 = s.timeLeft;
  s = L.tick(s);
  assert.equal(s.timeLeft, t0 - 1);
  assert.equal(s.status, "playing");
  // 시간을 0 까지 소모
  while (s.timeLeft > 0) s = L.tick(s);
  assert.equal(s.timeLeft, 0);
  assert.equal(s.status, "gameover", "시간 종료 시 게임오버");
});

test("tick: playing 이 아니면 무시", () => {
  const idle = L.createInitialState();
  assert.deepEqual(L.tick(idle), idle);
});

test("AC2: gameover → startGame 으로 재시작 가능(새 게임 초기화)", () => {
  let s = L.startGame(L.createInitialState(), randForRound(0, 0, 3));
  while (s.timeLeft > 0) s = L.tick(s);
  assert.equal(s.status, "gameover");
  const restarted = L.startGame(s, randForRound(1, 2, 2));
  assert.equal(restarted.status, "playing");
  assert.equal(restarted.score, 0, "재시작 시 점수 리셋");
  assert.equal(restarted.streak, 0);
  assert.equal(restarted.timeLeft, L.ROUND_TIME);
});

test("정답률 집계: correctCount/totalAnswers 로 accuracy 계산 가능", () => {
  let s = L.startGame(L.createInitialState(), randForRound(1, 1, 1)); // 정답 green
  s = L.answer(s, "green", 500, randForRound(1, 1, 1)); // 정답
  s = L.nextRound(s, randForRound(1, 1, 1));
  s = L.answer(s, "red", 500, randForRound(1, 1, 1)); // 오답
  assert.equal(s.totalAnswers, 2);
  assert.equal(s.correctCount, 1);
  assert.equal(L.accuracy(s), 50);
});
