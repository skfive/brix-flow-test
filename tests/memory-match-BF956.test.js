// BF-956 · 메모리 매치 방향키 조작·재시작 초기화 단위 테스트 (focused scope · module: memory-match)
// - 대상: phase18-games/memory-match/{logic.js, main.js, index.html, styles.css}
// - 실행: node --test tests/memory-match-BF956.test.js
// - 기획 SSOT: docs/plan/memory-match-BF-954.md (방향키/포커스/재시작 계약)
// - 디자인 SSOT: docs/design/memory-match-BF-955.md (§4.2 포커스 공간 모델·§6.1 dev 가이드)
//
// 검증 축:
//   1) 순수 로직 — logic.js 의 nextIndex(4x4 그리드 방향키 이동·경계 클램프)
//   2) 마크업/스타일 가드 — 포커스 링 보존(outline-offset:2px)·방향키 안내 hint
//   3) main.js 배선 가드 — roving tabindex·keydown·preventDefault·.focus()·재시작 activeIndex 리셋
//   4) 재시작 초기화 로직 — createInitialState 로 카드/시도횟수/완료상태 원점 복귀

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
  assert.ok(api && api.nextIndex, "logic.js 가 nextIndex API 를 노출하지 않음");
  return api;
}

const L = loadLogic();

// ══════════════════════════════════════════════════════════
// 1) nextIndex — 4x4 그리드 방향키 이동 (경계 클램프, design §4.2)
//     인덱스 배치:
//       0  1  2  3
//       4  5  6  7
//       8  9 10 11
//      12 13 14 15
// ══════════════════════════════════════════════════════════
test("K-01: 중앙(5)에서 4방향 정상 이동", () => {
  assert.equal(L.nextIndex(5, "right"), 6);
  assert.equal(L.nextIndex(5, "left"), 4);
  assert.equal(L.nextIndex(5, "down"), 9);
  assert.equal(L.nextIndex(5, "up"), 1);
});

test("K-02: 좌상 모서리(0) — 위/왼쪽은 클램프(불변)", () => {
  assert.equal(L.nextIndex(0, "up"), 0);
  assert.equal(L.nextIndex(0, "left"), 0);
  assert.equal(L.nextIndex(0, "right"), 1);
  assert.equal(L.nextIndex(0, "down"), 4);
});

test("K-03: 우상 모서리(3) — 위/오른쪽은 클램프", () => {
  assert.equal(L.nextIndex(3, "up"), 3);
  assert.equal(L.nextIndex(3, "right"), 3);
  assert.equal(L.nextIndex(3, "left"), 2);
  assert.equal(L.nextIndex(3, "down"), 7);
});

test("K-04: 좌하 모서리(12) — 아래/왼쪽은 클램프", () => {
  assert.equal(L.nextIndex(12, "down"), 12);
  assert.equal(L.nextIndex(12, "left"), 12);
  assert.equal(L.nextIndex(12, "right"), 13);
  assert.equal(L.nextIndex(12, "up"), 8);
});

test("K-05: 우하 모서리(15) — 아래/오른쪽은 클램프", () => {
  assert.equal(L.nextIndex(15, "down"), 15);
  assert.equal(L.nextIndex(15, "right"), 15);
  assert.equal(L.nextIndex(15, "left"), 14);
  assert.equal(L.nextIndex(15, "up"), 11);
});

test("K-06: 행 경계에서 좌우 이동은 행을 넘지 않음(래핑 아님)", () => {
  // 3(row0 끝)에서 right 는 4(row1 시작)로 래핑하지 않고 3 유지
  assert.equal(L.nextIndex(3, "right"), 3);
  // 4(row1 시작)에서 left 는 3(row0 끝)로 래핑하지 않고 4 유지
  assert.equal(L.nextIndex(4, "left"), 4);
});

test("K-07: 알 수 없는 방향 / 범위 밖 인덱스는 원 인덱스 유지(안전)", () => {
  assert.equal(L.nextIndex(5, "diagonal"), 5);
  assert.equal(L.nextIndex(5, undefined), 5);
});

// ══════════════════════════════════════════════════════════
// 2) 마크업/스타일 가드 — 포커스 링 보존 + 방향키 안내
// ══════════════════════════════════════════════════════════
test("스타일: 포커스 링 outline-offset:2px 보존(§6.1-6 revealed 시인성)", () => {
  assert.match(CSS, /:focus-visible/);
  assert.match(CSS, /outline\s*:\s*3px\s+solid\s+var\(--color-focus-ring\)/);
  assert.match(CSS, /outline-offset\s*:\s*2px/);
});

test("스타일: outline:none 단독 규칙 없음(포커스 링 제거 방지, §6.1-1)", () => {
  assert.ok(!/outline\s*:\s*none\s*;/.test(CSS), "outline:none 단독 규칙 발견");
});

test("마크업: 방향키 조작 안내 hint 추가(§5.4 discoverability)", () => {
  assert.match(HTML, /방향키/);
  assert.match(HTML, /Enter|Space/);
});

// ══════════════════════════════════════════════════════════
// 3) main.js 배선 가드 — roving tabindex·방향키·포커스·재시작
// ══════════════════════════════════════════════════════════
test("배선: 방향키 keydown 리스너 존재 + 4방향 키 처리", () => {
  assert.match(MAIN_JS, /keydown/);
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    assert.ok(MAIN_JS.includes(key), `${key} 처리 누락`);
  }
});

test("배선: 방향키 스크롤 억제 preventDefault(§6.1-4)", () => {
  assert.match(MAIN_JS, /preventDefault/);
});

test("배선: nextIndex 순수 로직 사용(§6.1-3 상태 불변 분리)", () => {
  assert.match(MAIN_JS, /nextIndex/);
});

test("배선: 목표 카드 .focus() 호출로 포커스 링 이동(§6.1-2)", () => {
  assert.match(MAIN_JS, /\.focus\(\)/);
});

test("배선: roving tabindex 토글(§6.1-5)", () => {
  assert.match(MAIN_JS, /tabIndex|tabindex/i);
});

// ══════════════════════════════════════════════════════════
// 4) 재시작 초기화 로직 — 카드/시도횟수/완료상태 원점 복귀
// ══════════════════════════════════════════════════════════
test("R-01: createInitialState — 재시작 시 카드 전체 hidden·moves 0·matchedPairs 0·idle", () => {
  const deck = L.createDeck(8);
  const s = L.createInitialState(deck);
  assert.equal(s.status, "idle");
  assert.equal(s.moves, 0);
  assert.equal(s.matchedPairs, 0);
  assert.equal(s.revealedIds.length, 0);
  assert.equal(s.finishedAt, null);
  assert.ok(s.deck.every((c) => c.state === "hidden"), "재시작 후 모든 카드 hidden");
  assert.equal(s.deck.length, 16);
});

test("R-02: 진행 중 상태에서 재시작해도 원본 불변(순수) + 새 초기 상태 독립", () => {
  const deck = L.createDeck(8);
  let s = L.createInitialState(deck);
  s = L.flipCard(s, deck[0].id, 1000);
  s = L.flipCard(s, deck[1].id, 1100); // moves 1, checking
  const restarted = L.createInitialState(L.createDeck(8));
  assert.equal(restarted.moves, 0, "재시작 상태 moves 0");
  assert.equal(restarted.status, "idle");
  // 진행 상태는 그대로(재시작이 원본을 오염시키지 않음)
  assert.equal(s.moves, 1);
  assert.equal(s.status, "checking");
});

test("배선: 재시작 시 활성 인덱스 원점 리셋(§5.3 activeIndex=0)", () => {
  // restart 경로에서 활성 인덱스가 0 으로 되돌아가는 배선이 있어야 함
  assert.match(MAIN_JS, /setActiveCard\(\s*0\s*\)|activeIndex\s*=\s*0/);
});
