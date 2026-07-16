// BF-842 · /demo/clock 순수 로직 단위 테스트 (focused scope · module: clock)
// - 대상: src/app/demo/clock/clock.js (표시/형식 순수 함수), storage.js (형식 영속화)
// - 실행: node --test tests/clock-BF842.test.js
// - 기획 SSOT: docs/planning/clock-BF-839.md (§3 표시, §5 12/24)
//
// DOM/네트워크 미의존 로직만 검증한다. 실제 화면 tick·키보드·타이머 정리는
// e2e-runner 브라우저 스모크로 별도 검증(PR 참조).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  pad2,
  formatDate,
  to12Hour,
  formatTime,
  normalizeHourFormat,
  toggleHourFormat,
  WEEKDAYS_KO,
  HOUR_FORMAT_12,
  HOUR_FORMAT_24,
} from "../src/app/demo/clock/clock.js";
import {
  createClockStore,
  createMemoryStorage,
  CLOCK_HOUR_FORMAT_KEY,
} from "../src/app/demo/clock/storage.js";

// ─────────── pad2 ───────────
test("pad2 는 1자리 수를 2자리 zero-pad 한다", () => {
  assert.equal(pad2(0), "00");
  assert.equal(pad2(3), "03");
  assert.equal(pad2(9), "09");
  assert.equal(pad2(10), "10");
  assert.equal(pad2(23), "23");
});

// ─────────── formatDate (기획 §3.1) ───────────
test("formatDate 는 YYYY-MM-DD (요일) 고정 포맷을 만든다", () => {
  // 2026-07-16 은 목요일
  const d = new Date(2026, 6, 16, 8, 3, 7);
  assert.equal(formatDate(d), "2026-07-16 (목)");
});

test("formatDate 는 월/일을 2자리 zero-pad 한다", () => {
  // 2026-01-05 는 월요일
  const d = new Date(2026, 0, 5, 0, 0, 0);
  assert.equal(formatDate(d), "2026-01-05 (월)");
});

test("WEEKDAYS_KO 는 일요일부터 시작하는 7요일 배열", () => {
  assert.deepEqual(WEEKDAYS_KO, ["일", "월", "화", "수", "목", "금", "토"]);
  // getDay(): 0=일 ~ 6=토
  const sunday = new Date(2026, 6, 12); // 2026-07-12 일요일
  assert.equal(formatDate(sunday), "2026-07-12 (일)");
});

// ─────────── to12Hour (기획 §5.2 SSOT — 경계값) ───────────
test("to12Hour: 자정 00시는 오전 12", () => {
  assert.deepEqual(to12Hour(0), { period: "오전", hour12: 12 });
});

test("to12Hour: 정오 12시는 오후 12", () => {
  assert.deepEqual(to12Hour(12), { period: "오후", hour12: 12 });
});

test("to12Hour: 오전 1~11시", () => {
  assert.deepEqual(to12Hour(1), { period: "오전", hour12: 1 });
  assert.deepEqual(to12Hour(11), { period: "오전", hour12: 11 });
});

test("to12Hour: 오후 13~23시는 값-12", () => {
  assert.deepEqual(to12Hour(13), { period: "오후", hour12: 1 });
  assert.deepEqual(to12Hour(23), { period: "오후", hour12: 11 });
});

// ─────────── formatTime (기획 §3.2 / §5.2) ───────────
test("formatTime 기본(24) 은 prefix 없이 HH:MM:SS 파트", () => {
  const d = new Date(2026, 6, 16, 8, 3, 7);
  assert.deepEqual(formatTime(d), {
    prefix: null,
    hh: "08",
    mm: "03",
    ss: "07",
  });
});

test("formatTime 24: 23:59:59 경계", () => {
  const d = new Date(2026, 6, 16, 23, 59, 59);
  assert.deepEqual(formatTime(d, HOUR_FORMAT_24), {
    prefix: null,
    hh: "23",
    mm: "59",
    ss: "59",
  });
});

test("formatTime 12: 자정은 오전 12:00:00", () => {
  const d = new Date(2026, 6, 16, 0, 0, 0);
  assert.deepEqual(formatTime(d, HOUR_FORMAT_12), {
    prefix: "오전",
    hh: "12",
    mm: "00",
    ss: "00",
  });
});

test("formatTime 12: 오후 8시 3분 7초는 오후 08:03:07", () => {
  const d = new Date(2026, 6, 16, 20, 3, 7);
  assert.deepEqual(formatTime(d, HOUR_FORMAT_12), {
    prefix: "오후",
    hh: "08",
    mm: "03",
    ss: "07",
  });
});

// ─────────── normalizeHourFormat / toggleHourFormat (기획 §5.3/§5.1) ───────────
test("normalizeHourFormat: 유효한 '12'/'24' 는 그대로", () => {
  assert.equal(normalizeHourFormat("12"), "12");
  assert.equal(normalizeHourFormat("24"), "24");
});

test("normalizeHourFormat: 손상/미지정 값은 기본 '24'", () => {
  assert.equal(normalizeHourFormat(null), "24");
  assert.equal(normalizeHourFormat(undefined), "24");
  assert.equal(normalizeHourFormat("garbage"), "24");
  assert.equal(normalizeHourFormat(12), "24"); // 숫자 12 는 문자열 아님 → 기본
});

test("toggleHourFormat 은 24↔12 를 뒤집는다", () => {
  assert.equal(toggleHourFormat("24"), "12");
  assert.equal(toggleHourFormat("12"), "24");
});

// ─────────── storage (기획 §5.3) ───────────
test("createClockStore: 저장 없으면 기본 '24' 복원", () => {
  const store = createClockStore(createMemoryStorage());
  assert.equal(store.loadFormat(), "24");
});

test("createClockStore: 저장 후 복원 라운드트립", () => {
  const mem = createMemoryStorage();
  const store = createClockStore(mem);
  store.saveFormat("12");
  assert.equal(mem.getItem(CLOCK_HOUR_FORMAT_KEY), "12");
  assert.equal(store.loadFormat(), "12");
});

test("createClockStore: 손상된 저장값은 기본 '24' 로 복원", () => {
  const mem = createMemoryStorage();
  mem.setItem(CLOCK_HOUR_FORMAT_KEY, "not-a-format");
  const store = createClockStore(mem);
  assert.equal(store.loadFormat(), "24");
});

test("createClockStore: 유효하지 않은 저장 시도는 정규화되어 저장", () => {
  const mem = createMemoryStorage();
  const store = createClockStore(mem);
  store.saveFormat("garbage");
  assert.equal(mem.getItem(CLOCK_HOUR_FORMAT_KEY), "24");
});

test("createClockStore: localStorage 접근 예외 시에도 안전(기본 복원)", () => {
  const throwing = {
    getItem() {
      throw new Error("SecurityError: private mode");
    },
    setItem() {
      throw new Error("SecurityError: private mode");
    },
  };
  const store = createClockStore(throwing);
  // 예외를 삼키고 기본값 반환, 저장도 조용히 실패
  assert.equal(store.loadFormat(), "24");
  assert.doesNotThrow(() => store.saveFormat("12"));
});
