// BF-417 · 스톱워치 통합 시나리오 (storage + 순수 로직 합성)
// AC 매핑:
//   AC1 — 시작 후 display 10ms 단위 mm:ss.xx 변환 (포맷 합성 정합)
//   AC2 — 랩 추가 → 리스트 상단(역순)에 (번호+누적+차이) + localStorage 영구화
//   AC3 — 정지 후 새로고침 → 마지막 랩 리스트 복원
//   AC4 — 리셋 → display·랩·localStorage 모두 초기화

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STOPWATCH_LAPS_KEY,
  STOPWATCH_ELAPSED_KEY,
  createMemoryStorage,
  createStopwatchStore,
} from "../stopwatch/storage.js";
import {
  addLap,
  formatStopwatchMs,
  formatStopwatchMsStr,
  findFastestSlowest,
  MAX_ELAPSED_MS,
} from "../stopwatch/stopwatch.js";

test("AC1: 0~73ms 사이 10ms 변화 → xx 자리 0~07 변동", () => {
  // 10ms 단위 표시 — rAF tick 으로 매 frame 갱신되지만 표시 자체는 1/100 초 단위
  for (let ms = 0; ms <= 70; ms += 10) {
    const expected = String(Math.floor(ms / 10)).padStart(2, "0");
    assert.equal(formatStopwatchMs(ms).xx, expected);
  }
  // 73ms → 7 자리 (소수 둘째 자리)
  assert.equal(formatStopwatchMs(73).xx, "07");
});

test("AC1: 시작 → 24.73초 경과 시점 → display 문자열 '00:24.73'", () => {
  assert.equal(formatStopwatchMsStr(24_730), "00:24.73");
});

test("AC2: 4 개 랩 → 명세 §4.5 예시값으로 변환 후 localStorage 영구화", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);

  let laps = [];
  // 명세 §4.5 예시: 누적 12.21 / 15.31 / 19.61 / 24.73
  laps = addLap(laps, 12_210);
  store.saveLaps(laps);
  laps = addLap(laps, 15_310);
  store.saveLaps(laps);
  laps = addLap(laps, 19_610);
  store.saveLaps(laps);
  laps = addLap(laps, 24_730);
  store.saveLaps(laps);

  assert.equal(laps.length, 4);
  assert.deepEqual(
    laps.map((l) => ({
      index: l.index,
      cum: formatStopwatchMsStr(l.cumulativeMs),
      delta: formatStopwatchMsStr(l.deltaMs),
    })),
    [
      { index: 1, cum: "00:12.21", delta: "00:12.21" },
      { index: 2, cum: "00:15.31", delta: "00:03.10" },
      { index: 3, cum: "00:19.61", delta: "00:04.30" },
      { index: 4, cum: "00:24.73", delta: "00:05.12" },
    ],
  );

  // localStorage 영속 검증 — 동일 객체 round-trip
  const restored = store.loadLaps();
  assert.deepEqual(restored, laps);
});

test("AC2: 최단/최장 강조 (4 개 랩) — fastest=index 2, slowest=index 1", () => {
  // delta: [12.21, 3.10, 4.30, 5.12] → fastest=#2, slowest=#1
  const cumulative = [12_210, 15_310, 19_610, 24_730];
  const laps = cumulative.reduce((acc, ms) => addLap(acc, ms), []);
  const fs = findFastestSlowest(laps);
  assert.deepEqual(fs, { fastestIndex: 2, slowestIndex: 1 });
});

test("AC3: 정지 후 새로고침 시나리오 — laps + elapsed round-trip", () => {
  // 첫 인스턴스: 랩 4 개 + 정지 시점 elapsed 영구화
  const mem = createMemoryStorage();
  const writer = createStopwatchStore(mem);
  let laps = [];
  for (const ms of [12_210, 15_310, 19_610, 24_730]) {
    laps = addLap(laps, ms);
  }
  writer.saveLaps(laps);
  writer.saveElapsed(72_490); // 1:12.49

  // 새로고침 — 같은 storage 로 새 인스턴스
  const reader = createStopwatchStore(mem);
  const restoredLaps = reader.loadLaps();
  const restoredElapsed = reader.loadElapsed();

  assert.equal(restoredLaps.length, 4);
  assert.deepEqual(restoredLaps[0], {
    index: 1,
    cumulativeMs: 12_210,
    deltaMs: 12_210,
  });
  assert.deepEqual(restoredLaps[3], {
    index: 4,
    cumulativeMs: 24_730,
    deltaMs: 5_120,
  });
  assert.equal(restoredElapsed, 72_490);
});

test("AC3: 저장값 없으면 빈 배열·null — 페이지가 빈 상태로 안전 부팅", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  assert.deepEqual(store.loadLaps(), []);
  assert.equal(store.loadElapsed(), null);
});

test("AC4: 리셋 → clearAll() 호출 시 storage 모두 비워짐", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  store.saveLaps([{ index: 1, cumulativeMs: 1000, deltaMs: 1000 }]);
  store.saveElapsed(5000);
  store.clearAll();

  // storage 직접 확인 (계약 잠금)
  assert.equal(mem.getItem(STOPWATCH_LAPS_KEY), null);
  assert.equal(mem.getItem(STOPWATCH_ELAPSED_KEY), null);

  // 호출 측이 비어 있다고 인식
  assert.deepEqual(store.loadLaps(), []);
  assert.equal(store.loadElapsed(), null);
});

test("AC4: 리셋이 다른 prefix(timer:/notepad:/bf-theme) 키를 침범하지 않음", () => {
  const mem = createMemoryStorage();
  mem.setItem("notepad:foo", JSON.stringify({ x: 1 }));
  mem.setItem("timer:last", JSON.stringify({ minutes: 5, seconds: 0 }));
  mem.setItem("bf-theme", "dark");
  const store = createStopwatchStore(mem);
  store.saveLaps([{ index: 1, cumulativeMs: 1000, deltaMs: 1000 }]);
  store.saveElapsed(1000);
  store.clearAll();

  assert.equal(mem.getItem("notepad:foo"), JSON.stringify({ x: 1 }));
  assert.equal(
    mem.getItem("timer:last"),
    JSON.stringify({ minutes: 5, seconds: 0 }),
  );
  assert.equal(mem.getItem("bf-theme"), "dark");
});

test("AC4 시나리오: 랩 5 개 + elapsed 저장 → 리셋 후 모두 0/빈 상태", () => {
  const mem = createMemoryStorage();
  const store = createStopwatchStore(mem);
  let laps = [];
  for (const ms of [1000, 2000, 3000, 4000, 5000]) {
    laps = addLap(laps, ms);
  }
  store.saveLaps(laps);
  store.saveElapsed(5000);

  // 리셋
  store.clearAll();

  // 새로 마운트한 reader 가 빈 상태로 부팅
  const reader = createStopwatchStore(mem);
  assert.deepEqual(reader.loadLaps(), []);
  assert.equal(reader.loadElapsed(), null);
});

test("max-cap 도달: 99:59.99 (5_999_999ms) 이상은 cap", () => {
  // 99:59.99 + 1ms → 99:59.99 로 clamp 표시
  assert.equal(formatStopwatchMsStr(MAX_ELAPSED_MS), "99:59.99");
  assert.equal(formatStopwatchMsStr(MAX_ELAPSED_MS + 1000), "99:59.99");
});

test("랩 데이터 무결성: storage 깨진 데이터에서도 valid 항목만 복원", () => {
  const mem = createMemoryStorage();
  // 정상 1 개 + 깨진 1 개 섞임
  mem.setItem(
    STOPWATCH_LAPS_KEY,
    JSON.stringify([
      { index: 1, cumulativeMs: 1000, deltaMs: 1000 },
      { bogus: true },
      { index: 2, cumulativeMs: 3000, deltaMs: 2000 },
    ]),
  );
  const store = createStopwatchStore(mem);
  const restored = store.loadLaps();
  // 깨진 1 개 제거되고 2 개만 복원
  assert.equal(restored.length, 2);
  assert.equal(restored[0].index, 1);
  assert.equal(restored[1].index, 2);
});
