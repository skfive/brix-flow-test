// BF-417 · 스톱워치 순수 로직 단위 테스트
// - 명세: docs/design/stopwatch-BF-415.md §5.1 (포맷), §6.4 (랩 추가), §7.7 (포맷 helper)
// - DOM 의존성 없음 → node:test 단위 실행 가능

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  pad2,
  formatStopwatchMs,
  formatStopwatchMsStr,
  clampElapsed,
  isMaxCap,
  addLap,
  findFastestSlowest,
  MAX_ELAPSED_MS,
  MAX_LAPS,
} from "../stopwatch/stopwatch.js";

// ─────────── pad2 ───────────
test("pad2: 한 자리 정수는 0 으로 zero-pad", () => {
  assert.equal(pad2(0), "00");
  assert.equal(pad2(5), "05");
  assert.equal(pad2(9), "09");
  assert.equal(pad2(10), "10");
  assert.equal(pad2(99), "99");
});

// ─────────── formatStopwatchMs (§5.1, §7.7) ───────────
test("formatStopwatchMs: 0ms → mm=00 ss=00 xx=00", () => {
  assert.deepEqual(formatStopwatchMs(0), { mm: "00", ss: "00", xx: "00" });
});

test("formatStopwatchMs: 10ms → xx=01 (1/100 초 단위)", () => {
  assert.deepEqual(formatStopwatchMs(10), { mm: "00", ss: "00", xx: "01" });
});

test("formatStopwatchMs: 1000ms → ss=01, xx=00", () => {
  assert.deepEqual(formatStopwatchMs(1000), { mm: "00", ss: "01", xx: "00" });
});

test("formatStopwatchMs: 60_000ms → mm=01, ss=00, xx=00", () => {
  assert.deepEqual(formatStopwatchMs(60_000), {
    mm: "01",
    ss: "00",
    xx: "00",
  });
});

test("formatStopwatchMs: 24_730ms → mm=00, ss=24, xx=73 (명세 §4.3 예시)", () => {
  assert.deepEqual(formatStopwatchMs(24_730), {
    mm: "00",
    ss: "24",
    xx: "73",
  });
});

test("formatStopwatchMs: 5_999_999ms (max cap) → mm=99 ss=59 xx=99", () => {
  assert.deepEqual(formatStopwatchMs(MAX_ELAPSED_MS), {
    mm: "99",
    ss: "59",
    xx: "99",
  });
});

test("formatStopwatchMs: 음수·NaN 은 0 으로 clamp", () => {
  assert.deepEqual(formatStopwatchMs(-1), { mm: "00", ss: "00", xx: "00" });
  assert.deepEqual(formatStopwatchMs(NaN), { mm: "00", ss: "00", xx: "00" });
});

test("formatStopwatchMs: max 초과 입력은 99:59.99 로 cap", () => {
  assert.deepEqual(formatStopwatchMs(MAX_ELAPSED_MS + 1000), {
    mm: "99",
    ss: "59",
    xx: "99",
  });
});

// ─────────── formatStopwatchMsStr ───────────
test("formatStopwatchMsStr: 'mm:ss.xx' 단일 문자열", () => {
  assert.equal(formatStopwatchMsStr(0), "00:00.00");
  assert.equal(formatStopwatchMsStr(24_730), "00:24.73");
  assert.equal(formatStopwatchMsStr(72_490), "01:12.49");
  assert.equal(formatStopwatchMsStr(MAX_ELAPSED_MS), "99:59.99");
});

// ─────────── clampElapsed ───────────
test("clampElapsed: [0, MAX_ELAPSED_MS] 으로 강제", () => {
  assert.equal(clampElapsed(0), 0);
  assert.equal(clampElapsed(500), 500);
  assert.equal(clampElapsed(MAX_ELAPSED_MS), MAX_ELAPSED_MS);
  assert.equal(clampElapsed(MAX_ELAPSED_MS + 1), MAX_ELAPSED_MS);
  assert.equal(clampElapsed(-100), 0);
  assert.equal(clampElapsed(NaN), 0);
  assert.equal(clampElapsed("abc"), 0);
});

// ─────────── isMaxCap ───────────
test("isMaxCap: MAX_ELAPSED_MS 이상에서 true", () => {
  assert.equal(isMaxCap(0), false);
  assert.equal(isMaxCap(MAX_ELAPSED_MS - 1), false);
  assert.equal(isMaxCap(MAX_ELAPSED_MS), true);
  assert.equal(isMaxCap(MAX_ELAPSED_MS + 1000), true);
});

// ─────────── addLap (§6.4) ───────────
test("addLap: 빈 배열에 첫 랩 추가 — index=1, cumulative=elapsed, delta=elapsed", () => {
  const laps = addLap([], 12_210);
  assert.equal(laps.length, 1);
  assert.deepEqual(laps[0], {
    index: 1,
    cumulativeMs: 12_210,
    deltaMs: 12_210,
  });
});

test("addLap: 두 번째 랩 — delta = elapsed - 직전 cumulative", () => {
  const after1 = addLap([], 12_210);
  const after2 = addLap(after1, 15_310);
  assert.equal(after2.length, 2);
  assert.deepEqual(after2[1], {
    index: 2,
    cumulativeMs: 15_310,
    deltaMs: 3_100, // 15_310 - 12_210
  });
});

test("addLap: 명세 §4.5 예시 — 4 개 랩 누적·차이", () => {
  // 누적: 12.21, 15.31, 19.61, 24.73
  // 차이: 12.21, 3.10, 4.30, 5.12
  const laps = [12_210, 15_310, 19_610, 24_730].reduce(
    (acc, ms) => addLap(acc, ms),
    [],
  );
  assert.equal(laps.length, 4);
  assert.deepEqual(
    laps.map((l) => [l.index, l.cumulativeMs, l.deltaMs]),
    [
      [1, 12_210, 12_210],
      [2, 15_310, 3_100],
      [3, 19_610, 4_300],
      [4, 24_730, 5_120],
    ],
  );
});

test("addLap: 불변성 — 원본 배열 변경 안 함", () => {
  const before = addLap([], 1000);
  const after = addLap(before, 2000);
  assert.equal(before.length, 1);
  assert.equal(after.length, 2);
  assert.notStrictEqual(before, after);
});

test("addLap: MAX_LAPS 초과 시 가장 오래된 항목 제거 (FIFO cap)", () => {
  // 명세 §4.5: 200 개 cap. 본 구현은 push 시점에 가장 오래된 항목 drop.
  let laps = [];
  for (let i = 0; i < MAX_LAPS + 5; i++) {
    laps = addLap(laps, (i + 1) * 1000);
  }
  assert.equal(laps.length, MAX_LAPS);
  // 가장 오래된 항목(index 1~5) 이 잘려나갔으므로 첫 항목 index 는 6
  assert.equal(laps[0].index, 6);
  assert.equal(laps[laps.length - 1].index, MAX_LAPS + 5);
});

// ─────────── findFastestSlowest (§5.3) ───────────
test("findFastestSlowest: 0 개 랩 → null", () => {
  assert.equal(findFastestSlowest([]), null);
});

test("findFastestSlowest: 1 개 랩 → null (비교 대상 없음)", () => {
  const laps = addLap([], 1000);
  assert.equal(findFastestSlowest(laps), null);
});

test("findFastestSlowest: 2 개 이상 — fastestIndex / slowestIndex 반환", () => {
  // 차이: [12_210, 3_100, 4_300, 5_120] → fastest=index 2 (delta 3_100), slowest=index 1 (delta 12_210)
  const laps = [12_210, 15_310, 19_610, 24_730].reduce(
    (acc, ms) => addLap(acc, ms),
    [],
  );
  const result = findFastestSlowest(laps);
  assert.deepEqual(result, { fastestIndex: 2, slowestIndex: 1 });
});

test("findFastestSlowest: 동일 delta tie 시 가장 최근(index 큰) 항목 우선", () => {
  // delta: [5000, 5000] → 둘 다 동일. 명세 §5.3: 가장 최근(높은 index) 랩 우선.
  // 그러나 동일 row 가 fastest·slowest 동시일 수 없으므로 v1 은 라벨 표시 X 처리.
  // 본 구현은 fastest/slowest 가 같은 index 인 경우 둘 다 null 반환.
  const laps = [5000, 10_000].reduce((acc, ms) => addLap(acc, ms), []);
  const result = findFastestSlowest(laps);
  // delta: 5000, 5000 → tie → 라벨 X
  assert.equal(result, null);
});

test("findFastestSlowest: 명세 §4.5 6개 랩 시나리오 — fastest != slowest 확실 분리", () => {
  // delta: [10_000, 3_000, 8_000, 5_000, 7_000, 12_000]
  // fastest=index 2 (3000), slowest=index 6 (12_000)
  const cumulative = [10_000, 13_000, 21_000, 26_000, 33_000, 45_000];
  const laps = cumulative.reduce((acc, ms) => addLap(acc, ms), []);
  const result = findFastestSlowest(laps);
  assert.deepEqual(result, { fastestIndex: 2, slowestIndex: 6 });
});

// ─────────── AC 시나리오 ───────────
test("AC1 시나리오: 시작 후 10ms 단위 mm:ss.xx 변화 — 73ms → 00:00.07", () => {
  // 10ms 단위 (1/100 초) 표현 — 73ms 는 07 자리
  assert.equal(formatStopwatchMsStr(73), "00:00.07");
});

test("AC2 시나리오: 랩 4 개 추가 — 누적·차이 정합", () => {
  const laps = [12_210, 15_310, 19_610, 24_730].reduce(
    (acc, ms) => addLap(acc, ms),
    [],
  );
  // 명세 §4.5 의 mockup 값 매핑
  assert.equal(formatStopwatchMsStr(laps[3].cumulativeMs), "00:24.73");
  assert.equal(formatStopwatchMsStr(laps[3].deltaMs), "00:05.12");
});
