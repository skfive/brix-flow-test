// BF-919 · 메모리 매치 단위 테스트 (focused scope · module: memory-match)
// - 대상: phase18-games/memory-match/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/memory-match-BF919.test.js
// - 기획 SSOT: docs/plan/memory-match-BF-916.md (§2~§6 규칙·contract, §8 테스트 케이스)
// - 디자인 SSOT: docs/design/memory-match-BF-916.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·type="module"·fetch·외부 URL·localStorage 0건
//   2) 마크업 계약 — main.js 가 의존하는 id/클래스 + <title>/<h1> 고정
//   3) 순수 로직 — logic.js 를 node:vm 샌드박스에서 로드해 셔플·뒤집기·판정 검증(planner §8.3 TC)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "phase18-games", "memory-match");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 샌드박스에서 로드해 MemoryMatchLogic 추출 ───────────
function loadLogic() {
  const ctx = { globalThis: undefined, module: { exports: {} }, Math: Math, Date: Date };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, { filename: "phase18-games/memory-match/logic.js" });
  const api = ctx.module.exports;
  assert.ok(api && api.createInitialState, "logic.js 가 MemoryMatchLogic API 를 노출하지 않음");
  return api;
}

const L = loadLogic();

// 결정적 rng — planner §8.4 참조 템플릿
function deterministicRng(seedSeq) {
  let i = 0;
  return () => seedSeq[i++ % seedSeq.length];
}

// pairId 가 동일한 두 카드 id 를 찾는 헬퍼
function idsForPair(deck, pairId) {
  return deck.filter((c) => c.pairId === pairId).map((c) => c.id);
}

// ══════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드 (외부 의존성 0건 · AC-09)
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

test("가드: fetch/XHR/WebSocket/외부 URL/localStorage 0건 (AC-09)", () => {
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
// 2) 마크업 계약 (design §5·§6.2 — main.js 의존 DOM)
// ══════════════════════════════════════════════════════════
test("마크업: 타이틀·h1 = '메모리 매치'", () => {
  assert.match(HTML, /<title>[^<]*메모리 매치[^<]*<\/title>/);
  assert.match(HTML, /<h1[^>]*>[\s\S]*메모리 매치[\s\S]*<\/h1>/);
});

test("마크업: 보드 컨테이너 #board + HUD 슬롯(#move-count, #timer)", () => {
  assert.match(HTML, /id=["']board["']/);
  assert.match(HTML, /id=["']move-count["']/);
  assert.match(HTML, /id=["']timer["']/);
});

test("마크업: 재시작 버튼 + 완료 배너 + 라이브 리전", () => {
  assert.match(HTML, /id=["']restart-btn["']/);
  assert.match(HTML, /id=["']win-banner["'][^>]*hidden/);
  assert.match(HTML, /id=["']win-restart-btn["']/);
  assert.match(HTML, /id=["']announce["'][^>]*aria-live=["']polite["']/);
});

test("마크업: 타이머 aria-live 없음(매초 안내 방해 방지, planner §7.3)", () => {
  // #timer output 태그에 aria-live 가 붙어있지 않아야 함
  const m = HTML.match(/<output[^>]*id=["']timer["'][^>]*>/);
  assert.ok(m, "#timer output 요소 없음");
  assert.ok(!/aria-live/.test(m[0]), "#timer 에 aria-live 존재 (매초 안내 방해)");
});

test("마크업: <noscript> 폴백 존재", () => {
  assert.match(HTML, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test("스타일: 4열 그리드 + 카드 정사각 + 핵심 토큰 정의", () => {
  assert.match(CSS, /grid-template-columns\s*:\s*repeat\(\s*4\s*,\s*1fr\s*\)/);
  assert.match(CSS, /aspect-ratio\s*:\s*1\s*\/\s*1/);
  for (const tok of ["--card-back-top", "--card-matched-border", "--color-accent", "--pair-0", "--pair-7"]) {
    assert.ok(CSS.includes(tok), `토큰 ${tok} 미정의`);
  }
});

test("스타일: :focus-visible 포커스 링 존재 · outline:none 단독 없음", () => {
  assert.match(CSS, /:focus-visible/);
  assert.match(CSS, /outline\s*:\s*3px\s+solid\s+var\(--color-focus-ring\)/);
});

// ══════════════════════════════════════════════════════════
// 3) 순수 로직 (planner §8.3 TC-01~TC-11)
// ══════════════════════════════════════════════════════════
test("TC-01: createDeck(8) — 16장, pairId 0~7 각 2회", () => {
  const deck = L.createDeck(8, deterministicRng([0.1, 0.9, 0.3, 0.5]));
  assert.equal(deck.length, 16);
  const counts = {};
  for (const c of deck) counts[c.pairId] = (counts[c.pairId] || 0) + 1;
  assert.deepStrictEqual(Object.values(counts).sort(), Array(8).fill(2));
  // 전부 hidden, id 0~15 유일 (spread 로 test-realm 배열 복사 후 비교)
  assert.ok(deck.every((c) => c.state === "hidden"));
  const ids = [...deck].map((c) => c.id).sort((a, b) => a - b);
  assert.deepStrictEqual(ids, Array.from({ length: 16 }, (_, i) => i));
});

test("TC-02: shuffle — 원본 불변, 새 배열 반환", () => {
  const src = [1, 2, 3, 4, 5];
  const snapshot = src.slice();
  const out = L.shuffle(src, deterministicRng([0.2, 0.7, 0.4, 0.9]));
  assert.notEqual(out, src, "새 배열이어야 함(참조 다름)");
  assert.deepStrictEqual(src, snapshot, "원본 배열이 변경됨");
  assert.deepStrictEqual(out.slice().sort(), snapshot.slice().sort(), "원소 보존");
});

test("TC-03: createInitialState — idle/moves=0/matchedPairs=0/startedAt=null", () => {
  const state = L.createInitialState(L.createDeck(8, deterministicRng([0])));
  assert.equal(state.status, "idle");
  assert.equal(state.moves, 0);
  assert.equal(state.matchedPairs, 0);
  assert.equal(state.startedAt, null);
  assert.equal(state.revealedIds.length, 0);
});

test("TC-04: flipCard — idle 에서 1장 클릭 시 revealed/playing/startedAt 기록", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  const s0 = L.createInitialState(deck);
  const s1 = L.flipCard(s0, deck[0].id, 1000);
  assert.equal(s1.status, "playing");
  assert.equal(s1.startedAt, 1000);
  assert.equal(s1.moves, 0);
  assert.equal(s1.deck.find((c) => c.id === deck[0].id).state, "revealed");
  // 불변 — 원본 미변경
  assert.equal(s0.status, "idle");
  assert.equal(s0.deck.find((c) => c.id === deck[0].id).state, "hidden");
});

test("TC-05: flipCard — 2번째 클릭 시 revealedIds 2·moves 1·checking", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  let s = L.createInitialState(deck);
  s = L.flipCard(s, deck[0].id, 1000);
  s = L.flipCard(s, deck[1].id, 1200);
  assert.equal(s.revealedIds.length, 2);
  assert.equal(s.moves, 1);
  assert.equal(s.status, "checking");
});

test("TC-06: flipCard — checking 에서 3번째 클릭은 no-op (EC-02)", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  let s = L.createInitialState(deck);
  s = L.flipCard(s, deck[0].id, 1000);
  s = L.flipCard(s, deck[1].id, 1200);
  const before = JSON.stringify(s);
  const after = L.flipCard(s, deck[2].id, 1300);
  assert.equal(JSON.stringify(after), before, "checking 중 상태 변화 없어야 함");
});

test("TC-07: flipCard — 이미 revealed 카드 재클릭 no-op (EC-01)", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  let s = L.createInitialState(deck);
  s = L.flipCard(s, deck[0].id, 1000);
  const before = JSON.stringify(s);
  const after = L.flipCard(s, deck[0].id, 1100);
  assert.equal(JSON.stringify(after), before, "revealed 재클릭 시 변화 없어야 함");
  assert.equal(after.moves, 0);
});

test("TC-08: evaluateCheck — 일치 시 matched/matchedPairs+1/playing", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  const [a, b] = idsForPair(deck, 0);
  let s = L.createInitialState(deck);
  s = L.flipCard(s, a, 1000);
  s = L.flipCard(s, b, 1200);
  s = L.evaluateCheck(s, 1300);
  assert.equal(s.matchedPairs, 1);
  assert.equal(s.status, "playing");
  assert.equal(s.revealedIds.length, 0);
  assert.equal(s.deck.find((c) => c.id === a).state, "matched");
  assert.equal(s.deck.find((c) => c.id === b).state, "matched");
});

test("TC-09: evaluateCheck — 불일치 시 hidden 복귀/moves 불변", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  // pairId 가 서로 다른 두 카드 선택
  const a = deck.find((c) => c.pairId === 0).id;
  const b = deck.find((c) => c.pairId === 1).id;
  let s = L.createInitialState(deck);
  s = L.flipCard(s, a, 1000);
  s = L.flipCard(s, b, 1200);
  assert.equal(s.moves, 1);
  s = L.evaluateCheck(s, 1300);
  assert.equal(s.matchedPairs, 0);
  assert.equal(s.status, "playing");
  assert.equal(s.moves, 1, "판정 후 moves 불변");
  assert.equal(s.deck.find((c) => c.id === a).state, "hidden");
  assert.equal(s.deck.find((c) => c.id === b).state, "hidden");
});

test("TC-10: evaluateCheck — 마지막 8번째 쌍 일치 시 won/finishedAt 기록", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  let s = L.createInitialState(deck);
  let t = 1000;
  // 7쌍을 순서대로 매치
  for (let p = 0; p < 7; p++) {
    const [a, b] = idsForPair(deck, p);
    s = L.flipCard(s, a, t++);
    s = L.flipCard(s, b, t++);
    s = L.evaluateCheck(s, t++);
  }
  assert.equal(s.matchedPairs, 7);
  assert.equal(s.status, "playing");
  // 마지막 8번째 쌍
  const [la, lb] = idsForPair(deck, 7);
  s = L.flipCard(s, la, t++);
  s = L.flipCard(s, lb, t++);
  s = L.evaluateCheck(s, 9999);
  assert.equal(s.matchedPairs, 8);
  assert.equal(s.status, "won");
  assert.equal(s.finishedAt, 9999);
});

test("TC-11: 통합 흐름 — 불일치→일치 순차, moves=2·matchedPairs=1", () => {
  const deck = L.createDeck(8, deterministicRng([0]));
  let s = L.createInitialState(deck);
  // 불일치 라운드
  const m0 = deck.find((c) => c.pairId === 0).id;
  const m1 = deck.find((c) => c.pairId === 1).id;
  s = L.flipCard(s, m0, 1000);
  s = L.flipCard(s, m1, 1100);
  assert.equal(s.status, "checking");
  s = L.evaluateCheck(s, 1200);
  assert.equal(s.status, "playing");
  // 일치 라운드
  const [pa, pb] = idsForPair(deck, 2);
  s = L.flipCard(s, pa, 1300);
  s = L.flipCard(s, pb, 1400);
  s = L.evaluateCheck(s, 1500);
  assert.equal(s.moves, 2);
  assert.equal(s.matchedPairs, 1);
});
