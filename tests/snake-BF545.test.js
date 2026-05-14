// BF-545 · 지렁이게임 아이템 시스템 구현 — 단위 테스트
//
// AC 매핑:
//   AC-1: 즉시발동 아이템 효과 발동 + 지속시간 후 원복
//   AC-2: 보유형 아이템 획득 → Z 키 발동 → HUD 업데이트 + 이팩트
//   AC-3: ITEMS_ENABLED=false(spawn=0) 시 기존 동작 회귀 없음
//   AC-4: KPI 이벤트 명세된 형식으로 로깅
//
// 실행: node --test tests/snake-BF545.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const html = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const css  = readFileSync(path.join(SNAKE_DIR, "styles.css"), "utf-8");
const js   = readFileSync(path.join(SNAKE_DIR, "game.js"), "utf-8");

// ── logic.js ES module import ─────────────────────────────────
import {
  ITEMS_ENABLED,
  ITEM_SPAWN_RATE,
  ITEM_WEIGHTS,
  ITEM_CATEGORY,
  ITEM_DURATION_MS,
  ITEM_LIFESPAN_MS,
  pickItemType,
  spawnItemCell,
  createItemStats,
  useHeldItem,
  updateItemTimers,
  createInitialState,
  tickWithItems,
} from "../snake/logic.js";

// ─────────────────────────────────────────────────────────────
// §1. Feature Flag (AC-3)
// ─────────────────────────────────────────────────────────────

test("BF-545 §1-1 (AC3): ITEMS_ENABLED 기본값 false — 기존 사용자 영향 0", () => {
  assert.strictEqual(ITEMS_ENABLED, false, "ITEMS_ENABLED 기본값은 false 이어야 함 (명세 §9-1)");
});

test("BF-545 §1-2 (AC3): ITEM_SPAWN_RATE 기본값 0 — 스폰 비활성", () => {
  assert.strictEqual(ITEM_SPAWN_RATE, 0, "ITEM_SPAWN_RATE 기본값은 0 이어야 함 (명세 §9-1)");
});

// ─────────────────────────────────────────────────────────────
// §2. 아이템 상수 (명세 §2)
// ─────────────────────────────────────────────────────────────

test("BF-545 §2-1: ITEM_WEIGHTS — 5종 × 합계 100", () => {
  assert.ok(Array.isArray(ITEM_WEIGHTS), "ITEM_WEIGHTS 배열 아님");
  assert.strictEqual(ITEM_WEIGHTS.length, 5, "5종 아이템이어야 함");
  const total = ITEM_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  assert.strictEqual(total, 100, "가중치 합계 100이어야 함");
});

test("BF-545 §2-2: ITEM_CATEGORY — INSTANT/HOLDABLE 매핑", () => {
  assert.strictEqual(ITEM_CATEGORY.SPEED_UP,     "INSTANT",  "SPEED_UP은 INSTANT");
  assert.strictEqual(ITEM_CATEGORY.SLOW_DOWN,    "INSTANT",  "SLOW_DOWN은 INSTANT");
  assert.strictEqual(ITEM_CATEGORY.LENGTH_BURST, "INSTANT",  "LENGTH_BURST는 INSTANT");
  assert.strictEqual(ITEM_CATEGORY.SHIELD,       "HOLDABLE", "SHIELD는 HOLDABLE");
  assert.strictEqual(ITEM_CATEGORY.REVERSE,      "HOLDABLE", "REVERSE는 HOLDABLE");
});

test("BF-545 §2-3: ITEM_DURATION_MS — 명세 지속 시간 일치", () => {
  assert.strictEqual(ITEM_DURATION_MS.SPEED_UP,     5000, "SPEED_UP 5000ms");
  assert.strictEqual(ITEM_DURATION_MS.SLOW_DOWN,    5000, "SLOW_DOWN 5000ms");
  assert.strictEqual(ITEM_DURATION_MS.LENGTH_BURST, 5000, "LENGTH_BURST 5000ms");
  assert.strictEqual(ITEM_DURATION_MS.SHIELD,       30000, "SHIELD 30000ms (보유)");
  assert.strictEqual(ITEM_DURATION_MS.REVERSE,      3000,  "REVERSE 3000ms (발동)");
});

test("BF-545 §2-4: ITEM_LIFESPAN_MS — 10초", () => {
  assert.strictEqual(ITEM_LIFESPAN_MS, 10000, "아이템 보드 수명 10000ms");
});

// ─────────────────────────────────────────────────────────────
// §3. pickItemType (명세 §6-2)
// ─────────────────────────────────────────────────────────────

test("BF-545 §3-1: pickItemType — 유효한 타입 반환", () => {
  const validTypes = new Set(["SPEED_UP", "SLOW_DOWN", "LENGTH_BURST", "SHIELD", "REVERSE"]);
  for (let i = 0; i < 50; i++) {
    const t = pickItemType();
    assert.ok(validTypes.has(t), `유효하지 않은 타입: ${t}`);
  }
});

test("BF-545 §3-2: pickItemType — 50회 호출 시 5종 모두 출현", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(pickItemType());
  assert.ok(seen.has("SPEED_UP"),     "SPEED_UP 미출현");
  assert.ok(seen.has("SLOW_DOWN"),    "SLOW_DOWN 미출현");
  assert.ok(seen.has("LENGTH_BURST"), "LENGTH_BURST 미출현");
  assert.ok(seen.has("SHIELD"),       "SHIELD 미출현");
  assert.ok(seen.has("REVERSE"),      "REVERSE 미출현");
});

// ─────────────────────────────────────────────────────────────
// §4. spawnItemCell (명세 §6-1)
// ─────────────────────────────────────────────────────────────

test("BF-545 §4-1: spawnItemCell — snake 셀 제외", () => {
  const snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }];
  const cpu   = [{ x: 5, y: 5 }];
  const food  = { x: 3, y: 3 };
  const cell  = spawnItemCell(5, 5, snake, cpu, food);
  assert.ok(cell !== null, "빈 셀 없어서는 안 됨");
  assert.ok(!snake.some(s => s.x === cell.x && s.y === cell.y), "snake 셀에 스폰됨");
  assert.ok(!cpu.some(s   => s.x === cell.x && s.y === cell.y), "cpu 셀에 스폰됨");
  assert.ok(!(cell.x === food.x && cell.y === food.y), "food 셀에 스폰됨");
});

test("BF-545 §4-2: spawnItemCell — 보드 꽉 참 → null", () => {
  const occupied = [];
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 2; x++)
      occupied.push({ x, y });
  const result = spawnItemCell(2, 2, occupied, [], null);
  assert.strictEqual(result, null, "꽉 찬 보드에서 null 반환 안 함");
});

test("BF-545 §4-3: spawnItemCell — food가 null이어도 동작", () => {
  const snake = [{ x: 0, y: 0 }];
  const cell = spawnItemCell(3, 3, snake, [], null);
  assert.ok(cell !== null, "food=null일 때 null 반환됨");
});

// ─────────────────────────────────────────────────────────────
// §5. createItemStats (명세 §10-1)
// ─────────────────────────────────────────────────────────────

test("BF-545 §5-1: createItemStats — INSTANT 아이템 구조", () => {
  const stats = createItemStats();
  for (const t of ["SPEED_UP", "SLOW_DOWN", "LENGTH_BURST"]) {
    assert.ok("spawned"           in stats[t], `${t}.spawned 없음`);
    assert.ok("acquired"          in stats[t], `${t}.acquired 없음`);
    assert.ok("expired"           in stats[t], `${t}.expired 없음`);
    assert.ok("durationCompleted" in stats[t], `${t}.durationCompleted 없음`);
  }
  assert.ok("selfDeathDuringBurst" in stats.LENGTH_BURST, "selfDeathDuringBurst 없음");
});

test("BF-545 §5-2: createItemStats — HOLDABLE 아이템 구조", () => {
  const stats = createItemStats();
  for (const t of ["SHIELD", "REVERSE"]) {
    assert.ok("spawned"  in stats[t], `${t}.spawned 없음`);
    assert.ok("acquired" in stats[t], `${t}.acquired 없음`);
    assert.ok("expired"  in stats[t], `${t}.expired 없음`);
    assert.ok("used"     in stats[t], `${t}.used 없음`);
    assert.ok("dropped"  in stats[t], `${t}.dropped 없음`);
  }
  assert.ok("shieldTriggered" in stats.SHIELD,      "shieldTriggered 없음");
  assert.ok("cpuConsumed"     in stats.REVERSE,     "cpuConsumed 없음");
});

// ─────────────────────────────────────────────────────────────
// §6. createInitialState — 아이템 필드 (부록 A)
// ─────────────────────────────────────────────────────────────

test("BF-545 §6-1: createInitialState — 아이템 필드 포함", () => {
  const s = createInitialState(20, 20, 0);
  assert.strictEqual(s.item,                null,  "item 초기값 null");
  assert.strictEqual(s.heldItem,            null,  "heldItem 초기값 null");
  assert.strictEqual(s.shieldActive,        false, "shieldActive 초기값 false");
  assert.strictEqual(s.cpuReverseTicksLeft, 0,     "cpuReverseTicksLeft 초기값 0");
  assert.ok(Array.isArray(s.speedStack),           "speedStack 배열이어야 함");
  assert.strictEqual(s.lengthBurstActive,   false, "lengthBurstActive 초기값 false");
  assert.ok("itemStats" in s,                      "itemStats 필드 없음");
});

// ─────────────────────────────────────────────────────────────
// §7. useHeldItem (명세 §5-3)
// ─────────────────────────────────────────────────────────────

test("BF-545 §7-1: useHeldItem SHIELD → shieldActive=true, heldItem=null", () => {
  const s = createInitialState(20, 20, 0);
  const withShield = {
    ...s,
    heldItem: { type: "SHIELD", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(withShield);
  assert.strictEqual(ns.shieldActive, true,  "shieldActive가 true여야 함");
  assert.strictEqual(ns.heldItem,     null,  "heldItem이 null이어야 함 (사용 후)");
});

test("BF-545 §7-2: useHeldItem REVERSE → cpuReverseTicksLeft=25, heldItem=null", () => {
  const s = createInitialState(20, 20, 0);
  const withReverse = {
    ...s,
    heldItem: { type: "REVERSE", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(withReverse);
  assert.strictEqual(ns.cpuReverseTicksLeft, 25,   "cpuReverseTicksLeft=25이어야 함");
  assert.strictEqual(ns.heldItem,            null,  "heldItem이 null이어야 함 (사용 후)");
});

test("BF-545 §7-3: useHeldItem — 슬롯 비어있으면 상태 변화 없음", () => {
  const s = createInitialState(20, 20, 0);
  const ns = useHeldItem(s);
  assert.strictEqual(ns.shieldActive,        false, "shieldActive 변경되면 안 됨");
  assert.strictEqual(ns.cpuReverseTicksLeft, 0,     "cpuReverseTicksLeft 변경되면 안 됨");
});

test("BF-545 §7-4: useHeldItem — SHIELD KPI used++ 카운트", () => {
  const s = createInitialState(20, 20, 0);
  const withShield = {
    ...s,
    heldItem: { type: "SHIELD", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(withShield);
  assert.strictEqual(ns.itemStats.SHIELD.used, 1, "SHIELD.used 카운트 안 됨");
});

test("BF-545 §7-5: useHeldItem — REVERSE KPI used++ 카운트", () => {
  const s = createInitialState(20, 20, 0);
  const withReverse = {
    ...s,
    heldItem: { type: "REVERSE", acquiredAt: Date.now(), expiresAt: Date.now() + 30000 },
  };
  const ns = useHeldItem(withReverse);
  assert.strictEqual(ns.itemStats.REVERSE.used, 1, "REVERSE.used 카운트 안 됨");
});

// ─────────────────────────────────────────────────────────────
// §8. updateItemTimers (명세 §5-4, §6)
// ─────────────────────────────────────────────────────────────

test("BF-545 §8-1: updateItemTimers — speedStack 만료 항목 제거", () => {
  const nowMs = Date.now();
  const s = {
    ...createInitialState(20, 20, 0),
    speedStack: [
      { type: "SPEED_UP", target: "player", expiresAtMs: nowMs - 1 }, // 이미 만료
      { type: "SLOW_DOWN", target: "player", expiresAtMs: nowMs + 5000 }, // 아직 유효
    ],
  };
  const ns = updateItemTimers(s, nowMs);
  assert.strictEqual(ns.speedStack.length, 1, "만료된 speedStack 항목 제거 안 됨");
  assert.strictEqual(ns.speedStack[0].type, "SLOW_DOWN", "유효 항목이 남아야 함");
});

test("BF-545 §8-2: updateItemTimers — heldItem 만료 시 null + expired KPI", () => {
  const nowMs = Date.now();
  const s = {
    ...createInitialState(20, 20, 0),
    heldItem: { type: "SHIELD", acquiredAt: nowMs - 31000, expiresAt: nowMs - 1 }, // 만료
  };
  const ns = updateItemTimers(s, nowMs);
  assert.strictEqual(ns.heldItem, null, "만료된 heldItem이 null이어야 함");
  assert.strictEqual(ns.itemStats.SHIELD.expired, 1, "SHIELD.expired 카운트 안 됨");
});

test("BF-545 §8-3: updateItemTimers — lengthBurst 만료 시 길이 복원", () => {
  const nowMs = Date.now();
  const baseState = createInitialState(20, 20, 0);
  // 폭발 전 길이 3, 현재 길이 30 (폭발 중)
  const extraSegs = Array.from({ length: 27 }, () => ({ x: 0, y: 0 }));
  const s = {
    ...baseState,
    snake: [...baseState.snake, ...extraSegs],
    lengthBurstActive: true,
    lengthBeforeBurst: 3,
    lengthBurstEndMs: nowMs - 1,  // 만료
  };
  const ns = updateItemTimers(s, nowMs);
  assert.strictEqual(ns.snake.length,        3,     "길이 복원 안 됨 (3이어야 함)");
  assert.strictEqual(ns.lengthBurstActive,   false, "lengthBurstActive가 false여야 함");
});

test("BF-545 §8-4: updateItemTimers — cpuReverseTicksLeft 감소", () => {
  const s = {
    ...createInitialState(20, 20, 0),
    cpuReverseTicksLeft: 5,
  };
  const ns = updateItemTimers(s, Date.now());
  assert.strictEqual(ns.cpuReverseTicksLeft, 4, "cpuReverseTicksLeft 감소 안 됨");
});

test("BF-545 §8-5: updateItemTimers — 보드 위 아이템 만료 시 null + expired KPI", () => {
  const nowMs = Date.now();
  const s = {
    ...createInitialState(20, 20, 0),
    item: { type: "SPEED_UP", x: 5, y: 5, spawnedAt: nowMs - 11000, expiresAt: nowMs - 1 },
  };
  const ns = updateItemTimers(s, nowMs);
  assert.strictEqual(ns.item, null, "만료된 보드 아이템이 null이어야 함");
  assert.strictEqual(ns.itemStats.SPEED_UP.expired, 1, "SPEED_UP.expired 카운트 안 됨");
});

// ─────────────────────────────────────────────────────────────
// §9. tickWithItems — 아이템 획득 (AC-1)
// ─────────────────────────────────────────────────────────────

test("BF-545 §9-1: tickWithItems — player가 SPEED_UP 밟으면 speedStack에 추가", () => {
  const nowMs = Date.now();
  const base = createInitialState(20, 20, 0);
  // snake 헤드 바로 앞에 SPEED_UP 배치
  const head = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };
  const s = {
    ...base,
    item: { type: "SPEED_UP", x: nextHead.x, y: nextHead.y, spawnedAt: nowMs, expiresAt: nowMs + 10000 },
  };
  const ns = tickWithItems(s, nowMs, true, true);
  assert.ok(ns.speedStack.length > 0, "SPEED_UP 획득 후 speedStack에 추가 안 됨");
  assert.ok(ns.speedStack.some(e => e.type === "SPEED_UP"), "speedStack에 SPEED_UP 없음");
  assert.strictEqual(ns.item, null, "획득 후 아이템이 null이어야 함");
  assert.strictEqual(ns.itemStats.SPEED_UP.acquired, 1, "acquired 카운트 안 됨");
});

test("BF-545 §9-2: tickWithItems — player가 LENGTH_BURST 밟으면 길이 10배", () => {
  const nowMs = Date.now();
  const base = createInitialState(20, 20, 0);
  const originalLen = base.snake.length;
  const head = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };
  const s = {
    ...base,
    item: { type: "LENGTH_BURST", x: nextHead.x, y: nextHead.y, spawnedAt: nowMs, expiresAt: nowMs + 10000 },
  };
  const ns = tickWithItems(s, nowMs, true, true);
  assert.ok(ns.snake.length >= originalLen * 10, `길이 10배 미달: ${ns.snake.length} < ${originalLen * 10}`);
  assert.strictEqual(ns.lengthBurstActive, true, "lengthBurstActive가 true여야 함");
  assert.strictEqual(ns.lengthBeforeBurst, originalLen, "lengthBeforeBurst 설정 안 됨");
  assert.strictEqual(ns.item, null, "획득 후 아이템 null이어야 함");
});

test("BF-545 §9-3: tickWithItems — player가 SHIELD 밟으면 heldItem에 보관", () => {
  const nowMs = Date.now();
  const base = createInitialState(20, 20, 0);
  const head = base.snake[0];
  const nextHead = { x: head.x + base.dir.x, y: head.y + base.dir.y };
  const s = {
    ...base,
    item: { type: "SHIELD", x: nextHead.x, y: nextHead.y, spawnedAt: nowMs, expiresAt: nowMs + 10000 },
  };
  const ns = tickWithItems(s, nowMs, true, true);
  assert.ok(ns.heldItem !== null, "SHIELD 획득 후 heldItem이 null임");
  assert.strictEqual(ns.heldItem.type, "SHIELD", "heldItem.type이 SHIELD가 아님");
  assert.strictEqual(ns.item, null, "획득 후 보드 아이템 null이어야 함");
  assert.strictEqual(ns.itemStats.SHIELD.acquired, 1, "SHIELD.acquired 카운트 안 됨");
});

test("BF-545 §9-4: tickWithItems — SHIELD 발동 중 충돌 → 방패 소멸 + 생존", () => {
  const nowMs = Date.now();
  const base = createInitialState(20, 20, 0);
  // 벽으로 머리 이동 → 충돌
  const headAtEdge = {
    ...base,
    snake: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    dir:     { x: -1, y: 0 },  // 왼쪽 벽으로
    nextDir: { x: -1, y: 0 },
    shieldActive: true,
    item: null,
  };
  const ns = tickWithItems(headAtEdge, nowMs, true, true);
  assert.strictEqual(ns.status, "playing",  "방패로 생존해야 함 (gameover 아님)");
  assert.strictEqual(ns.shieldActive, false, "방패가 소멸되어야 함");
  // KPI shieldTriggered
  assert.strictEqual(ns.itemStats.SHIELD.shieldTriggered, 1, "shieldTriggered KPI 안 됨");
});

test("BF-545 §9-5: tickWithItems — item=null 이면 아이템 관련 상태 변화 없음 (회귀 가드)", () => {
  const nowMs = Date.now();
  const s = createInitialState(20, 20, 0);
  const ns = tickWithItems({ ...s, item: null }, nowMs, true, true);
  assert.strictEqual(ns.heldItem,      null,  "item=null 시 heldItem 변경 안 됨");
  assert.strictEqual(ns.shieldActive,  false, "item=null 시 shieldActive 변경 안 됨");
  assert.strictEqual(ns.speedStack.length, 0, "item=null 시 speedStack 변경 안 됨");
});

// ─────────────────────────────────────────────────────────────
// §10. HTML 구조 검사 (명세 §6-2, AC-2)
// ─────────────────────────────────────────────────────────────

test("BF-545 §10-1 (AC2): index.html — #buff-bar 존재 (명세 §6-2)", () => {
  assert.ok(html.includes('id="buff-bar"'), "#buff-bar 없음 (명세 §6-2)");
});

test("BF-545 §10-2 (AC2): index.html — #item-slot-hud 존재 (명세 §6-2)", () => {
  assert.ok(html.includes('id="item-slot-hud"'), "#item-slot-hud 없음 (명세 §6-2)");
});

test("BF-545 §10-3 (AC2): index.html — #toast-container 존재 (명세 §6-2)", () => {
  assert.ok(html.includes('id="toast-container"'), "#toast-container 없음 (명세 §6-2)");
});

test("BF-545 §10-4 (AC2): index.html — .slot-box 존재 (명세 §5-3)", () => {
  assert.ok(html.includes('class="slot-box"'), ".slot-box 없음 (명세 §5-3)");
});

test("BF-545 §10-5 (AC2): index.html — .slot-icon 존재 (명세 §5-3)", () => {
  assert.ok(html.includes('slot-icon'), ".slot-icon 없음 (명세 §5-3)");
});

test("BF-545 §10-6 (AC2): index.html — .slot-key-hint [Z] 존재 (명세 §5-3)", () => {
  assert.ok(html.includes('slot-key-hint'), ".slot-key-hint 없음 (명세 §5-3)");
});

test("BF-545 §10-7 (AC2): index.html — #buff-bar 가 #effect-layer 뒤에 위치", () => {
  const effectLayerIdx = html.indexOf('id="effect-layer"');
  const buffBarIdx     = html.indexOf('id="buff-bar"');
  assert.ok(effectLayerIdx !== -1, "#effect-layer 없음");
  assert.ok(buffBarIdx     !== -1, "#buff-bar 없음");
  assert.ok(buffBarIdx > effectLayerIdx, "#buff-bar가 #effect-layer 뒤에 있어야 함 (명세 §4-1)");
});

test("BF-545 §10-8: index.html — 기존 #hud 보존 (회귀 가드)", () => {
  assert.ok(html.includes('id="hud"'),         "#hud 없음 — 기존 요소 회귀");
  assert.ok(html.includes('id="game-canvas"'), "#game-canvas 없음 — 기존 요소 회귀");
  assert.ok(html.includes('id="effect-layer"'),"#effect-layer 없음 — 기존 요소 회귀");
});

// ─────────────────────────────────────────────────────────────
// §11. CSS 검사 (명세 §6-1, §5-2, §5-3, §5-5)
// ─────────────────────────────────────────────────────────────

test("BF-545 §11-1 (AC2): styles.css — 아이템 컬러 토큰 존재 (명세 §6-1)", () => {
  assert.ok(css.includes("--item-speed-primary"),   "--item-speed-primary 없음");
  assert.ok(css.includes("--item-slow-primary"),    "--item-slow-primary 없음");
  assert.ok(css.includes("--item-burst-primary"),   "--item-burst-primary 없음");
  assert.ok(css.includes("--item-shield-primary"),  "--item-shield-primary 없음");
  assert.ok(css.includes("--item-reverse-primary"), "--item-reverse-primary 없음");
});

test("BF-545 §11-2 (AC2): styles.css — #buff-bar 스타일 존재 (명세 §5-2)", () => {
  assert.ok(css.includes("#buff-bar"), "#buff-bar CSS 없음 (명세 §5-2)");
});

test("BF-545 §11-3 (AC2): styles.css — .buff-item 스타일 존재 (명세 §5-2)", () => {
  assert.ok(css.includes(".buff-item"), ".buff-item CSS 없음 (명세 §5-2)");
});

test("BF-545 §11-4 (AC2): styles.css — #item-slot-hud 스타일 존재 (명세 §5-3)", () => {
  assert.ok(css.includes("#item-slot-hud"), "#item-slot-hud CSS 없음 (명세 §5-3)");
});

test("BF-545 §11-5 (AC2): styles.css — #toast-container 스타일 존재 (명세 §5-5)", () => {
  assert.ok(css.includes("#toast-container"), "#toast-container CSS 없음 (명세 §5-5)");
});

test("BF-545 §11-6 (AC2): styles.css — .toast 스타일 존재 (명세 §5-5)", () => {
  assert.ok(css.includes(".toast"), ".toast CSS 없음 (명세 §5-5)");
});

test("BF-545 §11-7 (AC2): styles.css — --hud-slot-bg 토큰 존재 (명세 §6-1)", () => {
  assert.ok(css.includes("--hud-slot-bg"), "--hud-slot-bg 토큰 없음");
});

test("BF-545 §11-8 (AC2): styles.css — --toast-bg 토큰 존재 (명세 §6-1)", () => {
  assert.ok(css.includes("--toast-bg"), "--toast-bg 토큰 없음");
});

// ─────────────────────────────────────────────────────────────
// §12. game.js 정적 분석 (KPI, Z 키, 이팩트)
// ─────────────────────────────────────────────────────────────

test("BF-545 §12-1 (AC4): game.js — bf-snake-item-stats KPI 키 존재", () => {
  assert.ok(
    js.includes("bf-snake-item-stats"),
    "bf-snake-item-stats KPI 키 없음 (명세 §10-1)"
  );
});

test("BF-545 §12-2 (AC4): game.js — bf-snake-item-kpi KPI 키 존재", () => {
  assert.ok(
    js.includes("bf-snake-item-kpi"),
    "bf-snake-item-kpi KPI 키 없음 (명세 §10-2)"
  );
});

test("BF-545 §12-3 (AC4): game.js — Z 키 핸들러 존재 (명세 §8-2)", () => {
  const hasZ = js.includes('"z"') || js.includes("'z'") || js.includes('"Z"') || js.includes("'Z'");
  assert.ok(hasZ, "Z 키 핸들러 없음 (명세 §8-2)");
});

test("BF-545 §12-4 (AC2): game.js — drawItem 함수 존재 (명세 §6-3)", () => {
  assert.ok(js.includes("drawItem"), "drawItem 함수 없음 (명세 §6-3)");
});

test("BF-545 §12-5 (AC2): game.js — ITEM_COLORS 상수 존재 (명세 §6-3)", () => {
  assert.ok(js.includes("ITEM_COLORS"), "ITEM_COLORS 상수 없음 (명세 §6-3)");
});

test("BF-545 §12-6 (AC2): game.js — triggerItemEffect 함수 존재 (명세 §6-6)", () => {
  assert.ok(js.includes("triggerItemEffect"), "triggerItemEffect 없음 (명세 §6-6)");
});

test("BF-545 §12-7 (AC2): game.js — showToast 함수 존재 (명세 §5-5)", () => {
  assert.ok(js.includes("showToast"), "showToast 없음 (명세 §5-5)");
});

test("BF-545 §12-8 (AC4): game.js — logItemKPI 또는 item kpi 로깅 코드 존재", () => {
  const hasKpi = js.includes("logItemKPI") || js.includes("ITEM_KPI_KEY");
  assert.ok(hasKpi, "아이템 KPI 로깅 코드 없음 (명세 §10)");
});

test("BF-545 §12-9 (AC3): game.js — ITEMS_ENABLED 체크 코드 존재", () => {
  assert.ok(js.includes("ITEMS_ENABLED"), "ITEMS_ENABLED 체크 없음 (명세 §9-1)");
});

// ─────────────────────────────────────────────────────────────
// §13. 회귀 가드 — 기존 logic.js 하위 호환 (AC-3)
// ─────────────────────────────────────────────────────────────

import {
  tick,
  tickFull,
  createInitialState as cis2,
  changeDirection,
  isWallCollision,
  isSelfCollision,
  restartGame,
  CELL,
  DIR,
} from "../snake/logic.js";

test("BF-545 §13-1 (AC3): tick — 기존 wall 충돌 gameover 회귀", () => {
  let s = cis2(5, 5, 0);
  // 왼쪽 벽으로 이동 (head.x=2 → dir=LEFT → 1→0→-1)
  s = { ...s, snake: [{ x: 0, y: 2 }, { x: 1, y: 2 }], dir: DIR.LEFT, nextDir: DIR.LEFT };
  const ns = tick(s);
  assert.strictEqual(ns.status, "gameover", "벽 충돌 gameover 회귀");
});

test("BF-545 §13-2 (AC3): tickFull — 기존 경쟁 게임 동작 회귀", () => {
  const s = cis2(20, 20, 0);
  const ns = tickFull(s);
  assert.strictEqual(ns.status, "playing", "tickFull 기본 상태 playing 회귀");
  assert.ok(ns.snake.length > 0, "tickFull snake 배열 비어 있음 회귀");
});

test("BF-545 §13-3 (AC3): restartGame — 아이템 상태 초기화", () => {
  let s = cis2(20, 20, 0);
  // 아이템 상태 임의 설정
  s = {
    ...s,
    shieldActive: true,
    heldItem: { type: "SHIELD", acquiredAt: 0, expiresAt: 99999 },
    speedStack: [{ type: "SPEED_UP", target: "player", expiresAtMs: 99999 }],
    lengthBurstActive: true,
  };
  const ns = restartGame(s);
  assert.strictEqual(ns.shieldActive,      false, "restartGame shieldActive 초기화 안 됨");
  assert.strictEqual(ns.heldItem,          null,  "restartGame heldItem 초기화 안 됨");
  assert.strictEqual(ns.speedStack.length, 0,     "restartGame speedStack 초기화 안 됨");
  assert.strictEqual(ns.lengthBurstActive, false, "restartGame lengthBurstActive 초기화 안 됨");
});
