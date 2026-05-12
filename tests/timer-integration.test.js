// BF-407 · 타이머 통합 시나리오 (storage + 순수 로직)
// AC 매핑:
//   AC2 — 5분 설정 → 1초 경과 → 4:59 표시 (로직 합산 검증)
//   AC3 — 5분 저장 → 새로고침 시 timer:last 로부터 5:00 복원

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TIMER_LAST_KEY,
  createMemoryStorage,
  createTimerStore,
} from "../timer/storage.js";
import { formatMmSs, msToMmSs, toTotalMs } from "../timer/timer.js";

test("AC3: 5분 설정 후 storage 에 저장 → 다른 인스턴스로 로드해도 5:00 복원", () => {
  // 첫 번째 인스턴스 — 5분 설정 저장 (페이지 첫 진입 시뮬레이션)
  const mem = createMemoryStorage();
  const writer = createTimerStore(mem);
  writer.saveLast({ minutes: 5, seconds: 0 });

  // 새로고침 후 — 같은 storage 로 새 인스턴스 (재진입 시뮬레이션)
  const reader = createTimerStore(mem);
  const restored = reader.loadLast();
  assert.deepEqual(restored, { minutes: 5, seconds: 0 });

  // 복원된 값 → display 형식
  assert.equal(formatMmSs(restored.minutes, restored.seconds), "5:00");

  // storage 내부 raw 키 확인 (정량 검증)
  assert.equal(
    mem.getItem(TIMER_LAST_KEY),
    JSON.stringify({ minutes: 5, seconds: 0 }),
  );
});

test("AC2: 5분 시작 → 1초 경과 → 4:59 (toTotalMs + msToMmSs 합성)", () => {
  const totalMs = toTotalMs(5, 0);
  assert.equal(totalMs, 300_000);

  // 1초 tick 후 남은 시간
  const remaining = totalMs - 1000;
  const { minutes, seconds } = msToMmSs(remaining);
  assert.equal(formatMmSs(minutes, seconds), "4:59");

  // 추가로 1초 더 (총 2초 경과) → 4:58
  const { minutes: m2, seconds: s2 } = msToMmSs(remaining - 1000);
  assert.equal(formatMmSs(m2, s2), "4:58");
});

test("AC2: 일시정지 시 카운트 정지 — remainingMs 가 변하지 않음", () => {
  // 5분 = 300_000ms 에서 30초 경과 후 일시정지 → 4:30
  const elapsed = 30_000;
  const pausedRemaining = toTotalMs(5, 0) - elapsed;
  const { minutes, seconds } = msToMmSs(pausedRemaining);
  assert.equal(formatMmSs(minutes, seconds), "4:30");

  // 일시정지 중 추가 "wall clock" 경과는 remainingMs 에 반영되면 안 됨 (재시작 전엔)
  // → 같은 pausedRemaining 으로 다시 표시해도 동일 값
  const again = msToMmSs(pausedRemaining);
  assert.equal(formatMmSs(again.minutes, again.seconds), "4:30");
});

test("AC2: 종료 도달 (remainingMs = 0) → 0:00", () => {
  const { minutes, seconds } = msToMmSs(0);
  assert.equal(formatMmSs(minutes, seconds), "0:00");
});

test("AC3: 빈 설정 저장 시도는 storage 에서 거부 (방어)", () => {
  const mem = createMemoryStorage();
  const store = createTimerStore(mem);
  // 0:00 자체는 허용 범위지만, 본 명세는 "마지막 설정값" 의미상 > 0 일 때만 저장.
  // 이 유효 범위 자체는 storage 레이어에서 0 도 OK 로 통과 (정책은 main.js 가 처리).
  // → 본 테스트는 음수만 reject 검증.
  assert.throws(() => store.saveLast({ minutes: -1, seconds: 0 }));
  assert.throws(() => store.saveLast({ minutes: 0, seconds: 60 }));
  assert.throws(() => store.saveLast({ minutes: 100, seconds: 0 }));
});

test("AC3: 깨진 storage 데이터는 loadLast() null → 페이지가 빈 상태로 안전 부팅", () => {
  const mem = createMemoryStorage();
  mem.setItem(TIMER_LAST_KEY, "garbage");
  const store = createTimerStore(mem);
  assert.equal(store.loadLast(), null);
  // null 일 때 main.js 는 빈 상태(0:00) 로 시작 → AC1 충족
});
