import { test } from "node:test";
import assert from "node:assert/strict";
import { formatElapsed, lapStats } from "../stopwatch.js";

test('formatElapsed(0) -> "00:00.00"', () => {
  assert.equal(formatElapsed(0), "00:00.00");
});

test('formatElapsed(9) -> "00:00.00" (10ms 미만은 센티초 0)', () => {
  assert.equal(formatElapsed(9), "00:00.00");
});

test('formatElapsed(10) -> "00:00.01" (센티초 자리올림 경계)', () => {
  assert.equal(formatElapsed(10), "00:00.01");
});

test('formatElapsed(999) -> "00:00.99" (초 자리올림 직전)', () => {
  assert.equal(formatElapsed(999), "00:00.99");
});

test('formatElapsed(1000) -> "00:01.00" (초 자리올림)', () => {
  assert.equal(formatElapsed(1000), "00:01.00");
});

test('formatElapsed(59999) -> "00:59.99" (분 자리올림 직전)', () => {
  assert.equal(formatElapsed(59999), "00:59.99");
});

test('formatElapsed(60000) -> "01:00.00" (분 자리올림)', () => {
  assert.equal(formatElapsed(60000), "01:00.00");
});

test('formatElapsed(6000000) -> "100:00.00" (분 3자리 확장)', () => {
  assert.equal(formatElapsed(6000000), "100:00.00");
});

test('formatElapsed(-1) -> "00:00.00" (음수 방어, throw 없음)', () => {
  assert.equal(formatElapsed(-1), "00:00.00");
});

test('formatElapsed(NaN) -> "00:00.00" (NaN 방어, throw 없음)', () => {
  assert.equal(formatElapsed(NaN), "00:00.00");
});

test("lapStats([]) -> {bestId:null, worstId:null} (빈 배열)", () => {
  assert.deepEqual(lapStats([]), { bestId: null, worstId: null });
});

test("lapStats 단일 랩 -> {bestId:null, worstId:null} (비교 불가)", () => {
  assert.deepEqual(lapStats([{ id: 1, lapMs: 1000, totalMs: 1000 }]), {
    bestId: null,
    worstId: null,
  });
});

test("lapStats 정상 계산", () => {
  assert.deepEqual(
    lapStats([
      { id: 1, lapMs: 1000, totalMs: 1000 },
      { id: 2, lapMs: 800, totalMs: 1800 },
    ]),
    { bestId: 2, worstId: 1 },
  );
});

test("lapStats 전체 동률 -> {bestId:null, worstId:null}", () => {
  assert.deepEqual(
    lapStats([
      { id: 1, lapMs: 500, totalMs: 500 },
      { id: 2, lapMs: 500, totalMs: 1000 },
    ]),
    { bestId: null, worstId: null },
  );
});

test("lapStats 최솟값 tie -> 먼저 기록된 id 채택", () => {
  assert.deepEqual(
    lapStats([
      { id: 1, lapMs: 500, totalMs: 500 },
      { id: 2, lapMs: 300, totalMs: 800 },
      { id: 3, lapMs: 300, totalMs: 1100 },
    ]),
    { bestId: 2, worstId: 1 },
  );
});

test("lapStats 최댓값 tie -> 먼저 기록된 id 채택", () => {
  assert.deepEqual(
    lapStats([
      { id: 1, lapMs: 300, totalMs: 300 },
      { id: 2, lapMs: 900, totalMs: 1200 },
      { id: 3, lapMs: 900, totalMs: 2100 },
    ]),
    { bestId: 1, worstId: 2 },
  );
});

test("lapStats lapMs=0 도 유효한 최솟값", () => {
  assert.deepEqual(
    lapStats([
      { id: 1, lapMs: 0, totalMs: 0 },
      { id: 2, lapMs: 200, totalMs: 200 },
    ]),
    { bestId: 1, worstId: 2 },
  );
});

test("lapStats(null) / lapStats(undefined) -> {bestId:null, worstId:null}", () => {
  assert.deepEqual(lapStats(null), { bestId: null, worstId: null });
  assert.deepEqual(lapStats(undefined), { bestId: null, worstId: null });
});

test("lapStats laps가 배열이 아니면 -> {bestId:null, worstId:null}", () => {
  assert.deepEqual(lapStats("not-an-array"), { bestId: null, worstId: null });
});

test("lapStats 랩 200개 (서로 다른 lapMs) -> 정상 계산 (cap 로직과 무관)", () => {
  const laps = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    lapMs: (i + 1) * 10,
    totalMs: 0,
  }));
  assert.deepEqual(lapStats(laps), { bestId: 1, worstId: 200 });
});
