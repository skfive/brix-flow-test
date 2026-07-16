// BF-862 · /demo/counter 순수 로직 단위 + 정적 계약 가드 (focused scope · module: counter)
// - 대상: src/app/demo/counter/counter.js (증감/리셋 순수 함수)
//         src/app/demo/counter/index.html (기획 §6.3 마크업 계약 정적 검증)
// - 실행: node --test tests/counter-BF862.test.js
// - 기획 SSOT: docs/plan/counter-BF-859.md (§2 연산, §6 접근성, §8 AC)
//
// DOM/네트워크 미의존 로직 + 정적 마크업 계약만 검증한다. 실제 클릭·키보드·즉시 반영은
// e2e-runner 브라우저 스모크로 별도 검증(PR 참조).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  INITIAL_VALUE,
  increment,
  decrement,
  reset,
} from "../src/app/demo/counter/counter.js";

const counterDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "app",
  "demo",
  "counter",
);

// ─────────── INITIAL_VALUE (AC-01) ───────────
test("INITIAL_VALUE 는 0 (초기 표시값)", () => {
  assert.equal(INITIAL_VALUE, 0);
});

// ─────────── increment (기획 §2 TC-01/02, AC-02) ───────────
test("increment: 0 → 1", () => {
  assert.equal(increment(0), 1);
});

test("increment: 임의 값 +1 (상한 없음, EC-06)", () => {
  assert.equal(increment(41), 42);
  assert.equal(increment(9999), 10000);
});

test("increment 는 원본을 변형하지 않고 새 값을 반환한다(순수 함수)", () => {
  const v = 5;
  const next = increment(v);
  assert.equal(v, 5);
  assert.equal(next, 6);
});

// ─────────── decrement (기획 §2 TC-03/05, AC-03 · 0-플로어) ───────────
test("decrement: 5 → 4", () => {
  assert.equal(decrement(5), 4);
});

test("decrement: 1 → 0 (경계)", () => {
  assert.equal(decrement(1), 0);
});

test("decrement: 0 → 0 (0-플로어 클램프, 기획 §2.2)", () => {
  assert.equal(decrement(0), 0);
});

test("decrement 는 여러 번 눌러도 0 아래로 내려가지 않는다", () => {
  let v = 2;
  v = decrement(v); // 1
  v = decrement(v); // 0
  v = decrement(v); // 0 (클램프)
  v = decrement(v); // 0 (클램프)
  assert.equal(v, 0);
});

// ─────────── reset (기획 §2 TC-04, AC-04) ───────────
test("reset: 상태 무관 항상 0 반환", () => {
  assert.equal(reset(), 0);
  assert.equal(reset(), INITIAL_VALUE);
});

// ─────────── 증감 라운드트립 시퀀스 (즉시 반영 로직 무결성) ───────────
test("증감 시퀀스: +1 +1 +1 -1 초기화 → 0", () => {
  let v = INITIAL_VALUE;
  v = increment(v); // 1
  v = increment(v); // 2
  v = increment(v); // 3
  v = decrement(v); // 2
  v = reset(); // 0
  assert.equal(v, 0);
});

// ─────────── DOM 계약 정적 가드 (기획 §6.3 — id/태그/aria-live 고정) ───────────
test("index.html 은 기획 §6.3 접근성 마크업 계약을 만족한다", () => {
  const html = readFileSync(join(counterDir, "index.html"), "utf8");

  // 값 표시: <output id="counter-value" aria-live="polite">0</output>
  assert.match(
    html,
    /<output[^>]*id="counter-value"[^>]*aria-live="polite"[^>]*>/,
    "counter-value output(aria-live=polite) 누락",
  );

  // 세 버튼 네이티브 <button type="button"> + 고정 id (기획 §6.1 · §6.3)
  for (const id of ["btn-increment", "btn-decrement", "btn-reset"]) {
    assert.match(
      html,
      new RegExp(`<button[^>]*type="button"[^>]*id="${id}"|<button[^>]*id="${id}"[^>]*type="button"`),
      `${id} 네이티브 button 누락`,
    );
  }

  // 라벨 문구 계약 (기획 §6.3)
  assert.match(html, />\s*\+1\s*</, "+1 라벨 누락");
  assert.match(html, />\s*-1\s*</, "-1 라벨 누락");
  assert.match(html, />\s*초기화\s*</, "초기화 라벨 누락");
});

test("index.html DOM(Tab) 순서는 +1 → -1 → 초기화 (기획 §6.3 고정)", () => {
  const html = readFileSync(join(counterDir, "index.html"), "utf8");
  const iInc = html.indexOf('id="btn-increment"');
  const iDec = html.indexOf('id="btn-decrement"');
  const iReset = html.indexOf('id="btn-reset"');
  assert.ok(iInc >= 0 && iDec >= 0 && iReset >= 0, "세 버튼 id 존재");
  assert.ok(
    iInc < iDec && iDec < iReset,
    "DOM 순서가 +1 → -1 → 초기화 여야 한다",
  );
});

test("초기 표시값은 0 (AC-01 — output 초기 콘텐츠)", () => {
  const html = readFileSync(join(counterDir, "index.html"), "utf8");
  assert.match(
    html,
    /<output[^>]*id="counter-value"[^>]*>\s*0\s*<\/output\s*>/,
    "counter-value 초기 콘텐츠가 0 이어야 한다",
  );
});

// ─────────── AC-06 네트워크/외부 의존 0건 자동 가드 (기획 §8 AC-06) ───────────
test("counter 소스에 외부 네트워크/원격 호출 API 가 존재하지 않는다(기획 AC-06)", () => {
  const forbidden =
    /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|https?:\/\//;
  const sources = readdirSync(counterDir).filter(
    (f) => f.endsWith(".js") || f.endsWith(".html"),
  );
  assert.ok(sources.length > 0, "counter 소스 파일이 존재해야 한다");
  for (const file of sources) {
    const content = readFileSync(join(counterDir, file), "utf8");
    // stylesheet/module 로컬 상대경로만 허용 — 절대 URL(스킴) 금지
    const match = content.match(forbidden);
    assert.equal(
      match,
      null,
      `${file} 에 금지된 네트워크 호출 패턴 발견: ${match?.[0]}`,
    );
  }
});
