// BF-407 · 타이머 순수 로직 단위 테스트
// - format(ms) → "MM:SS"
// - clampMinutes / clampSeconds (입력 정규화)
// - toTotalMs / msToMmSs (변환)
// - tick(remainingMs, elapsed) — drift-correction 친화 헬퍼

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatMmSs,
  clampMinutes,
  clampSeconds,
  toTotalMs,
  msToMmSs,
} from "../timer/timer.js";

test("formatMmSs: 5분 = 5:00, 0초 = 0:00, 1분 1초 = 1:01", () => {
  assert.equal(formatMmSs(0, 0), "0:00");
  assert.equal(formatMmSs(5, 0), "5:00");
  assert.equal(formatMmSs(1, 1), "1:01");
  assert.equal(formatMmSs(99, 59), "99:59");
});

test("formatMmSs: 초만 2자리 zero-pad, 분은 그대로", () => {
  // 명세 §4.3: MM:SS 항상 2자리 zero-pad — 단 mockup 은 분도 1자리 OK (예: 5:00)
  // 본 구현은 운영자 명세대로 SS 만 zero-pad, MM 은 자연수 그대로
  assert.equal(formatMmSs(0, 5), "0:05");
  assert.equal(formatMmSs(12, 7), "12:07");
});

test("clampMinutes: 0~99 범위로 clamp, NaN → 0", () => {
  assert.equal(clampMinutes(0), 0);
  assert.equal(clampMinutes(99), 99);
  assert.equal(clampMinutes(100), 99);
  assert.equal(clampMinutes(-5), 0);
  assert.equal(clampMinutes(NaN), 0);
  assert.equal(clampMinutes("5"), 5); // 문자열 숫자도 정규화
  assert.equal(clampMinutes("abc"), 0);
});

test("clampSeconds: 0~59 범위로 clamp, NaN → 0", () => {
  assert.equal(clampSeconds(0), 0);
  assert.equal(clampSeconds(59), 59);
  assert.equal(clampSeconds(60), 59);
  assert.equal(clampSeconds(-1), 0);
  assert.equal(clampSeconds(NaN), 0);
  assert.equal(clampSeconds("30"), 30);
});

test("toTotalMs: 분/초 → 총 밀리초 변환", () => {
  assert.equal(toTotalMs(0, 0), 0);
  assert.equal(toTotalMs(0, 1), 1000);
  assert.equal(toTotalMs(1, 0), 60_000);
  assert.equal(toTotalMs(5, 0), 300_000);
  assert.equal(toTotalMs(1, 30), 90_000);
});

test("msToMmSs: 밀리초 → 분/초 변환 (ceil 표시 — 1ms 남아도 1초로 표시)", () => {
  // 사용자 UX: 0.001s 남았어도 화면에는 1초 표시 (마지막 1초가 "사라지는" 인상을 피함)
  assert.deepEqual(msToMmSs(0), { minutes: 0, seconds: 0 });
  assert.deepEqual(msToMmSs(1), { minutes: 0, seconds: 1 });
  assert.deepEqual(msToMmSs(1000), { minutes: 0, seconds: 1 });
  assert.deepEqual(msToMmSs(1001), { minutes: 0, seconds: 2 });
  assert.deepEqual(msToMmSs(60_000), { minutes: 1, seconds: 0 });
  assert.deepEqual(msToMmSs(300_000), { minutes: 5, seconds: 0 });
  // 5분 + 1초 경과 = 4분 59초 남음
  assert.deepEqual(msToMmSs(300_000 - 1000), { minutes: 4, seconds: 59 });
});

test("AC2 시나리오: 5분 설정 → 1초 경과 → 4:59 표시", () => {
  const total = toTotalMs(5, 0);
  const after1s = total - 1000;
  const { minutes, seconds } = msToMmSs(after1s);
  assert.equal(formatMmSs(minutes, seconds), "4:59");
});

test("AC1 시나리오: 빈 상태 0:00 (분 0, 초 0)", () => {
  assert.equal(formatMmSs(0, 0), "0:00");
});

test("음수 밀리초는 0:00 으로 처리 (방어)", () => {
  assert.deepEqual(msToMmSs(-1000), { minutes: 0, seconds: 0 });
  assert.deepEqual(msToMmSs(-1), { minutes: 0, seconds: 0 });
});
