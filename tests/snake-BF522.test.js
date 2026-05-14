// BF-522 · snake 모듈 CORS 오류 수정 (file:// 호환 game.js 로드) — 회귀 가드
//
// 수용 기준 매핑:
//   AC §1 — file:// 환경에서 game.js CORS 오류 없음
//             → game.js 에 import 구문 없음 확인 (type=module 제거로 import() 불필요)
//   AC §2 — snake/ HTML 파일들의 script 태그 file:// 호환성 검증
//             → type="module" / import 미사용 확인
//   AC §3 — 영향 받은 다른 모듈 회귀 없음 (kanban, notepad, pomodoro, stopwatch, timer)
//             → 각 모듈 HTML 의 script 태그가 BF-522 변경 전후 동일하게 유지됨
//
// 실행: node --test tests/snake-BF522.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

// ─────────────────────────────────────────────────────────────
// AC §1 — game.js file:// CORS 호환성 (import 구문 없음)
// ─────────────────────────────────────────────────────────────

test("BF-522 AC1: game.js — import 구문 없음 (static + dynamic 모두)", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

  // static import 없음
  const hasStaticImport = /^\s*import\s+/m.test(js);
  assert.ok(
    !hasStaticImport,
    "game.js 에 static import 존재 — file:// 환경에서 CORS 오류 발생 원인",
  );

  // dynamic import() 없음
  assert.ok(
    !js.includes("import("),
    "game.js 에 dynamic import() 존재 — type=module 제거 후 불필요, CORS 오류 원인",
  );
});

test("BF-522 AC1: game.js — globalThis 구조 분해로 로직 변수 참조", () => {
  const js = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

  // globalThis 참조 존재
  assert.ok(
    js.includes("globalThis"),
    "game.js 에 globalThis 참조 없음 — index.html 인라인 IIFE 변수를 구조 분해해야 함",
  );

  // 핵심 로직 변수가 여전히 참조됨 (렌더링·게임 루프에서 사용)
  assert.ok(js.includes("CELL"),              "game.js 에 CELL 참조 없음");
  assert.ok(js.includes("createInitialState"), "game.js 에 createInitialState 참조 없음");
  assert.ok(js.includes("tick"),              "game.js 에 tick 참조 없음");
  assert.ok(js.includes("changeDirection"),   "game.js 에 changeDirection 참조 없음");
});

test("BF-522 AC1: index.html — game.js script 태그에 type=module 없음", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

  // type=module 없음
  assert.ok(
    !html.includes('<script type="module" src="./game.js"'),
    'index.html game.js 스크립트에 type="module" 존재 — file:// CORS 오류 발생 원인',
  );

  // game.js 참조는 유지
  assert.ok(
    html.includes('src="./game.js"') || html.includes("src='./game.js'"),
    "index.html 에서 game.js 참조가 제거됨",
  );
});

// ─────────────────────────────────────────────────────────────
// AC §2 — snake/ 디렉토리 HTML 파일 file:// 호환성 회귀 가드
// ─────────────────────────────────────────────────────────────

test("BF-522 AC2: snake/index.html — 모든 외부 script 태그에 type=module 없음", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

  // <script type="module" src=...> 패턴 없음 (외부 파일 로드 태그)
  const moduleExternalScript = /<script[^>]+type=["']module["'][^>]+src=/gi;
  const matches = html.match(moduleExternalScript);
  assert.ok(
    !matches,
    `snake/index.html 에 type="module" 외부 script 태그 발견: ${JSON.stringify(matches)} — file:// CORS 차단 원인`,
  );
});

test("BF-522 AC2: snake/index.html — 인라인 스크립트에 import 구문 없음", () => {
  const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

  // 인라인 스크립트 추출 (type=module 아닌 것 포함)
  const inlineScripts = [...html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);

  for (const code of inlineScripts) {
    const hasImport = /^\s*import\s+/m.test(code) || code.includes("import(");
    assert.ok(
      !hasImport,
      "snake/index.html 인라인 스크립트에 import 구문 존재 — file:// CORS 오류 원인",
    );
  }
});

// ─────────────────────────────────────────────────────────────
// AC §3 — 다른 모듈 회귀 없음 (BF-522 변경 범위: snake/ 만)
// ─────────────────────────────────────────────────────────────

// kanban, pomodoro, timer: 이미 일반 <script> 사용 — BF-522 후에도 유지 확인
test("BF-522 AC3: kanban/index.html — 외부 script 태그에 type=module 없음 (회귀 없음)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "kanban", "index.html"), "utf-8");
  const moduleExternalScript = /<script[^>]+type=["']module["'][^>]+src=/gi;
  const matches = html.match(moduleExternalScript);
  assert.ok(
    !matches,
    `kanban/index.html — type=module 외부 script 태그 예상치 않게 추가됨: ${JSON.stringify(matches)}`,
  );
  // 기존 스크립트 파일들이 여전히 로드됨
  assert.ok(html.includes("storage.js"), "kanban/index.html — storage.js 참조 없음 (회귀)");
  assert.ok(html.includes("main.js"),    "kanban/index.html — main.js 참조 없음 (회귀)");
});

test("BF-522 AC3: pomodoro/index.html — 외부 script 태그에 type=module 없음 (회귀 없음)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "pomodoro", "index.html"), "utf-8");
  const moduleExternalScript = /<script[^>]+type=["']module["'][^>]+src=/gi;
  const matches = html.match(moduleExternalScript);
  assert.ok(
    !matches,
    `pomodoro/index.html — type=module 외부 script 태그 예상치 않게 추가됨: ${JSON.stringify(matches)}`,
  );
  assert.ok(html.includes("main.js"), "pomodoro/index.html — main.js 참조 없음 (회귀)");
});

test("BF-522 AC3: timer/index.html — 외부 script 태그에 type=module 없음 (회귀 없음)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "timer", "index.html"), "utf-8");
  const moduleExternalScript = /<script[^>]+type=["']module["'][^>]+src=/gi;
  const matches = html.match(moduleExternalScript);
  assert.ok(
    !matches,
    `timer/index.html — type=module 외부 script 태그 예상치 않게 추가됨: ${JSON.stringify(matches)}`,
  );
  assert.ok(html.includes("app.js"), "timer/index.html — app.js 참조 없음 (회귀)");
});

// notepad, stopwatch: type=module 사용 중이나 BF-522 변경 범위 밖 — 파일 무수정 확인
// (두 모듈은 snake 와 다른 아키텍처; BF-522 는 snake/ 파일만 수정)

test("BF-522 AC3: notepad/index.html — BF-522 미수정 확인 (main.js 참조 유지)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "notepad", "index.html"), "utf-8");
  // notepad 는 원래 type=module 사용 — BF-522 가 손대지 않았으므로 그대로여야 함
  assert.ok(
    html.includes("main.js"),
    "notepad/index.html — main.js 참조 없음 (예상치 않은 변경)",
  );
});

test("BF-522 AC3: stopwatch/index.html — BF-522 미수정 확인 (main.js 참조 유지)", () => {
  const html = readFileSync(path.join(REPO_ROOT, "stopwatch", "index.html"), "utf-8");
  // stopwatch 는 원래 type=module 사용 — BF-522 가 손대지 않았으므로 그대로여야 함
  assert.ok(
    html.includes("main.js"),
    "stopwatch/index.html — main.js 참조 없음 (예상치 않은 변경)",
  );
});
