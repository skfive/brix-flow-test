// BF-553 · 지렁이게임 HOLD 아이템 미등장 버그 재현 및 수정 테스트
//
// 버그 요약:
//   index.html 인라인 스크립트에서 ITEMS_ENABLED=false, ITEM_SPAWN_RATE=0 으로
//   하드코딩되어 있어 아이템 스폰 타이머가 절대 활성화되지 않음.
//   배율 먹이(food: 1x/2x/4x/8x)는 별도 food 시스템으로 항상 스폰되지만,
//   HOLD 계열 아이템(SHIELD, REVERSE)은 item 스폰 시스템에 의존하므로 등장 불가.
//
// AC 매핑:
//   AC-1: 게임 시작 후 충분한 시간 경과 시 배율 아이템과 HOLD 아이템 모두 등장
//   AC-2: 수정 전 재현 테스트 실패, 수정 후 통과
//   AC-3: HOLD 아이템 등장 후 Z 키 사용 시 정상 발동
//
// 실행: node --test tests/snake-BF553.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

// ── logic.js ES module import ─────────────────────────────────
import {
  pickItemType,
  ITEM_CATEGORY,
  ITEM_WEIGHTS,
  ITEM_TOTAL_WEIGHT,
  createInitialState,
  tickWithItems,
  useHeldItem,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// §1. 재현 테스트 — 인라인 스크립트 ITEMS_ENABLED / ITEM_SPAWN_RATE (AC-2)
//
// 수정 전: §1-1, §1-2 FAIL (false/0 이 기재되어 있음)
// 수정 후: §1-1, §1-2 PASS (true/1 이 기재됨)
// ─────────────────────────────────────────────────────────────

test("BF-553 §1-1 (AC2) 재현: index.html 인라인 스크립트에서 ITEMS_ENABLED=true 여야 함", () => {
  // ITEMS_ENABLED=false 이면 game.js 의 아이템 스폰 조건이 절대 충족되지 않음
  // → SHIELD, REVERSE 등 모든 아이템이 보드에 등장 불가
  const hasTrueFlag =
    html.includes("ITEMS_ENABLED   = true") ||
    html.includes("ITEMS_ENABLED = true");
  assert.ok(
    hasTrueFlag,
    "index.html 인라인 스크립트의 ITEMS_ENABLED 가 false 로 설정되어 있음 (버그)" +
    " — HOLD 아이템(SHIELD, REVERSE)이 스폰되지 않는 원인"
  );
});

test("BF-553 §1-2 (AC2) 재현: index.html 인라인 스크립트에서 ITEM_SPAWN_RATE > 0 여야 함", () => {
  // ITEM_SPAWN_RATE=0 이면 game.js 아이템 스폰 조건 불충족 → 모든 아이템 미등장
  const hasPositiveRate =
    html.includes("ITEM_SPAWN_RATE = 1") ||
    /ITEM_SPAWN_RATE\s*=\s*[1-9]/.test(html);
  assert.ok(
    hasPositiveRate,
    "index.html 인라인 스크립트의 ITEM_SPAWN_RATE 가 0 으로 설정되어 있음 (버그)" +
    " — 스폰 타이머가 활성화되지 않아 HOLD 아이템이 등장하지 않음"
  );
});

// ─────────────────────────────────────────────────────────────
// §2. 확률 테이블 검증 — pickItemType() HOLDABLE 타입 포함 (AC-1)
// ─────────────────────────────────────────────────────────────

test("BF-553 §2-1 (AC1): pickItemType() — 500회 호출 시 SHIELD 출현", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(pickItemType());
  assert.ok(seen.has("SHIELD"), "SHIELD 타입이 pickItemType() 에서 반환되어야 함 (가중치 20%)");
});

test("BF-553 §2-2 (AC1): pickItemType() — 500회 호출 시 REVERSE 출현", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(pickItemType());
  assert.ok(seen.has("REVERSE"), "REVERSE 타입이 pickItemType() 에서 반환되어야 함 (가중치 15%)");
});

test("BF-553 §2-3 (AC1): 확률 테이블 — HOLDABLE 타입 가중치 합 35 확인", () => {
  const holdableWeight = ITEM_WEIGHTS
    .filter(({ type }) => ITEM_CATEGORY[type] === "HOLDABLE")
    .reduce((sum, { weight }) => sum + weight, 0);
  assert.strictEqual(holdableWeight, 35, "HOLDABLE 가중치 합이 35 여야 함 (SHIELD:20 + REVERSE:15)");
});

test("BF-553 §2-4 (AC1): 확률 테이블 — 전체 가중치 합이 ITEM_TOTAL_WEIGHT 와 일치", () => {
  const total = ITEM_WEIGHTS.reduce((sum, { weight }) => sum + weight, 0);
  assert.strictEqual(total, ITEM_TOTAL_WEIGHT, `가중치 합(${total})이 ITEM_TOTAL_WEIGHT(${ITEM_TOTAL_WEIGHT})와 달라 확률 분포 오류`);
});

// ─────────────────────────────────────────────────────────────
// §3. 아이템 타입 분기 — HOLDABLE 아이템 수집 처리 (AC-1)
// tickWithItems 가 HOLDABLE 아이템을 heldItem 슬롯에 정상 보관하는지 확인
// ─────────────────────────────────────────────────────────────

test("BF-553 §3-1 (AC1): tickWithItems — SHIELD 아이템 밟으면 heldItem 슬롯에 보관", () => {
  const nowMs = Date.now();
  const base  = createInitialState(20, 20, 0);
  const head  = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };

  const s = {
    ...base,
    item: {
      type:      "SHIELD",
      x:         nextHead.x,
      y:         nextHead.y,
      spawnedAt: nowMs,
      expiresAt: nowMs + 10000,
    },
  };

  const ns = tickWithItems(s, nowMs, true, true);
  assert.ok(ns.heldItem !== null,            "SHIELD 수집 후 heldItem 이 null 이면 안 됨");
  assert.strictEqual(ns.heldItem.type, "SHIELD", "heldItem.type 이 SHIELD 여야 함");
  assert.strictEqual(ns.item,          null,      "수집 후 보드 위 아이템 null 여야 함");
  assert.strictEqual(ns.itemStats.SHIELD.acquired, 1, "SHIELD.acquired KPI 카운트 안 됨");
});

test("BF-553 §3-2 (AC1): tickWithItems — REVERSE 아이템 밟으면 heldItem 슬롯에 보관", () => {
  const nowMs = Date.now();
  const base  = createInitialState(20, 20, 0);
  const head  = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };

  const s = {
    ...base,
    item: {
      type:      "REVERSE",
      x:         nextHead.x,
      y:         nextHead.y,
      spawnedAt: nowMs,
      expiresAt: nowMs + 10000,
    },
  };

  const ns = tickWithItems(s, nowMs, true, true);
  assert.ok(ns.heldItem !== null,             "REVERSE 수집 후 heldItem 이 null 이면 안 됨");
  assert.strictEqual(ns.heldItem.type, "REVERSE", "heldItem.type 이 REVERSE 여야 함");
  assert.strictEqual(ns.item,          null,       "수집 후 보드 위 아이템 null 여야 함");
  assert.strictEqual(ns.itemStats.REVERSE.acquired, 1, "REVERSE.acquired KPI 카운트 안 됨");
});

test("BF-553 §3-3 (AC1): tickWithItems — INSTANT 아이템(SPEED_UP)은 heldItem 에 저장 안 됨", () => {
  const nowMs = Date.now();
  const base  = createInitialState(20, 20, 0);
  const head  = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };

  const s = {
    ...base,
    item: {
      type:      "SPEED_UP",
      x:         nextHead.x,
      y:         nextHead.y,
      spawnedAt: nowMs,
      expiresAt: nowMs + 10000,
    },
  };

  const ns = tickWithItems(s, nowMs, true, true);
  assert.strictEqual(ns.heldItem, null, "INSTANT 아이템은 heldItem 에 저장되지 않아야 함");
  assert.ok(ns.speedStack.length > 0,  "SPEED_UP 은 speedStack 에 추가되어야 함");
});

// ─────────────────────────────────────────────────────────────
// §4. HOLD 아이템 발동 (Z 키 동작 검증) — AC-3
// ─────────────────────────────────────────────────────────────

test("BF-553 §4-1 (AC3): useHeldItem — SHIELD 발동 시 shieldActive=true, heldItem=null", () => {
  const s = {
    ...createInitialState(20, 20, 0),
    heldItem: { type: "SHIELD", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(s);
  assert.strictEqual(ns.shieldActive, true, "SHIELD 발동 후 shieldActive=true 여야 함");
  assert.strictEqual(ns.heldItem,     null, "SHIELD 발동 후 heldItem=null 여야 함");
  assert.strictEqual(ns.itemStats.SHIELD.used, 1, "SHIELD.used KPI 카운트 안 됨");
});

test("BF-553 §4-2 (AC3): useHeldItem — REVERSE 발동 시 cpuReverseTicksLeft=25, heldItem=null", () => {
  const s = {
    ...createInitialState(20, 20, 0),
    heldItem: { type: "REVERSE", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(s);
  assert.strictEqual(ns.cpuReverseTicksLeft, 25,   "REVERSE 발동 후 cpuReverseTicksLeft=25 여야 함");
  assert.strictEqual(ns.heldItem,            null,  "REVERSE 발동 후 heldItem=null 여야 함");
  assert.strictEqual(ns.itemStats.REVERSE.used, 1, "REVERSE.used KPI 카운트 안 됨");
});

test("BF-553 §4-3 (AC3): useHeldItem — heldItem 없으면 상태 변화 없음", () => {
  const s  = createInitialState(20, 20, 0);
  const ns = useHeldItem(s);
  assert.strictEqual(ns.shieldActive,        false, "heldItem 없을 때 shieldActive 변경 안 됨");
  assert.strictEqual(ns.cpuReverseTicksLeft, 0,     "heldItem 없을 때 cpuReverseTicksLeft 변경 안 됨");
});

// ─────────────────────────────────────────────────────────────
// §5. 카테고리 매핑 확인 — HOLDABLE 분기 정확성 (AC-1)
// ─────────────────────────────────────────────────────────────

test("BF-553 §5-1 (AC1): ITEM_CATEGORY — SHIELD, REVERSE 가 HOLDABLE 이어야 함", () => {
  assert.strictEqual(ITEM_CATEGORY.SHIELD,  "HOLDABLE", "SHIELD 카테고리가 HOLDABLE 이어야 함");
  assert.strictEqual(ITEM_CATEGORY.REVERSE, "HOLDABLE", "REVERSE 카테고리가 HOLDABLE 이어야 함");
});

test("BF-553 §5-2 (AC1): ITEM_CATEGORY — INSTANT 아이템 카테고리 올바름", () => {
  assert.strictEqual(ITEM_CATEGORY.SPEED_UP,     "INSTANT", "SPEED_UP 카테고리가 INSTANT 여야 함");
  assert.strictEqual(ITEM_CATEGORY.SLOW_DOWN,    "INSTANT", "SLOW_DOWN 카테고리가 INSTANT 여야 함");
  assert.strictEqual(ITEM_CATEGORY.LENGTH_BURST, "INSTANT", "LENGTH_BURST 카테고리가 INSTANT 여야 함");
});
