/* tests/team-reservation-canary-BF1006.test.js
 * BF-1006 developer 단위 테스트 — planner 명세 §8.3 필수 케이스 전부 구현
 * SSOT: docs/plan/team-reservation-canary/reservation-approval-spec-BF-1002.md
 * 실행: node --test tests/team-reservation-canary-BF1006.test.js
 * 로딩: 루트 package.json 이 "type":"module" 이므로 ESM 테스트 + vm 샌드박스로 UMD 로드
 *       (레포 breakout 테스트 관례 계승 — reservation.js 는 CommonJS-UMD)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "team-reservation-canary");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "style.css"), "utf8");
const RESERVATION_JS = readFileSync(join(MODULE_DIR, "reservation.js"), "utf8");
const APP_JS = readFileSync(join(MODULE_DIR, "app.js"), "utf8");

// 주석(라인/블록) 제거 — file:// 안전 가드가 산문(예: "import/export 0건")에 오탐하지 않도록
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ─── reservation.js(UMD)를 테스트와 동일 realm 에서 로드해 API 추출 ───
// new Function 로 실행하면 반환 객체/배열이 테스트 realm 소속 → deepStrictEqual prototype 일치.
function loadApi() {
  const module = { exports: {} };
  const fn = new Function("module", "globalThis", RESERVATION_JS);
  fn(module, globalThis);
  const api = module.exports;
  assert.ok(api && api.decideReservation, "reservation.js 가 TeamReservation API 를 노출하지 않음");
  return api;
}

const TR = loadApi();
const {
  hasTimeOverlap,
  findApprovedConflicts,
  decideReservation,
  createReservation,
  loadReservationState,
  saveReservationState,
} = TR;

// ── in-memory storage mock (window.localStorage 동일 인터페이스) ──
function makeStorage(initial) {
  const map = new Map();
  if (initial && typeof initial === "object") {
    for (const k of Object.keys(initial)) map.set(k, initial[k]);
  }
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

function seedRsv(id) {
  const state = loadReservationState(makeStorage());
  return state.reservations.find((r) => r.id === id);
}

const ISO = (s) => `2026-07-20T${s}:00.000Z`;

// ══════════════════════════════════════════════════════════
// vanilla-static / file:// 안전 가드 (planner §11)
// ══════════════════════════════════════════════════════════
describe("file:// 안전 가드 (§11)", () => {
  const files = [
    ["index.html", HTML],
    ["style.css", CSS],
    ["reservation.js", RESERVATION_JS],
    ["app.js", APP_JS],
  ];
  it('<script type="module"> 미사용', () => {
    for (const [name, src] of files) assert.ok(!/type\s*=\s*["']module["']/.test(src), `${name}`);
  });
  it("ESM import/export 구문 미사용", () => {
    for (const [name, src] of files) {
      const code = stripComments(src);
      assert.ok(!/\bimport\s+[^;]*\bfrom\b/.test(code), `${name} 에 import ... from`);
      assert.ok(!/\bimport\s*\(/.test(code), `${name} 에 dynamic import`);
      assert.ok(!/\bexport\s+(default|const|let|var|function|class|\{|\*)/.test(code), `${name} 에 export`);
    }
  });
  it("fetch / XMLHttpRequest 미사용", () => {
    for (const [name, src] of files) assert.ok(!/\bfetch\s*\(|XMLHttpRequest/.test(stripComments(src)), `${name} 에 네트워크 호출`);
  });
  it("외부 CDN link/script src 미사용", () => {
    assert.ok(!/https?:\/\//.test(HTML.replace(/lang="ko"/g, "")), "index.html 에 외부 URL");
  });
});

// ══════════════════════════════════════════════════════════
describe("hasTimeOverlap (§4.1)", () => {
  it("TC-OV-01: 경계만 맞닿으면 겹침 아님", () => {
    assert.strictEqual(hasTimeOverlap(ISO("01:00"), ISO("02:00"), ISO("02:00"), ISO("03:00")), false);
  });
  it("TC-OV-02: 부분 겹침 → true", () => {
    assert.strictEqual(hasTimeOverlap(ISO("01:00"), ISO("02:00"), ISO("01:30"), ISO("02:30")), true);
  });
  it("TC-OV-03: 완전 포함 → true", () => {
    assert.strictEqual(hasTimeOverlap(ISO("01:00"), ISO("03:00"), ISO("01:30"), ISO("02:00")), true);
  });
  it("TC-OV-04: 완전 동일 → true", () => {
    assert.strictEqual(hasTimeOverlap(ISO("01:00"), ISO("02:00"), ISO("01:00"), ISO("02:00")), true);
  });
  it("TC-OV-05: 완전 분리 → false", () => {
    assert.strictEqual(hasTimeOverlap(ISO("01:00"), ISO("02:00"), ISO("03:00"), ISO("04:00")), false);
  });
  it("TC-OV-06: 역전 구간(aStart>=aEnd) → RangeError", () => {
    assert.throws(() => hasTimeOverlap(ISO("02:00"), ISO("01:00"), ISO("03:00"), ISO("04:00")), RangeError);
  });
  it("TC-OV-06b: b 구간 역전 → RangeError", () => {
    assert.throws(() => hasTimeOverlap(ISO("01:00"), ISO("02:00"), ISO("04:00"), ISO("03:00")), RangeError);
  });
  it("파싱 불가/비문자열 인자 → TypeError", () => {
    assert.throws(() => hasTimeOverlap("not-a-date", ISO("02:00"), ISO("03:00"), ISO("04:00")), TypeError);
    assert.throws(() => hasTimeOverlap(123, ISO("02:00"), ISO("03:00"), ISO("04:00")), TypeError);
  });
});

// ══════════════════════════════════════════════════════════
describe("findApprovedConflicts (§4.2 / §6.2)", () => {
  it("TC-FC-01: res-01 01:30~02:30 신규 pending → [rsv-01], rejected rsv-03 제외", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const target = { id: "rsv-new", resourceId: "res-01", requesterName: "테스터", startAt: "2026-07-20T01:30:00.000Z", endAt: "2026-07-20T02:30:00.000Z", status: "pending", createdAt: "2026-07-17T00:00:00.000Z", decidedAt: null, reason: null };
    assert.deepStrictEqual(findApprovedConflicts(target, all).map((r) => r.id), ["rsv-01"]);
  });

  it("TC-FC-02: res-02 05:00~06:00 → [] (다른 자원 rsv-05 제외, pending rsv-04 제외)", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const target = { id: "rsv-new2", resourceId: "res-02", requesterName: "테스터", startAt: "2026-07-21T05:00:00.000Z", endAt: "2026-07-21T06:00:00.000Z", status: "pending", createdAt: "2026-07-17T00:00:00.000Z", decidedAt: null, reason: null };
    assert.deepStrictEqual(findApprovedConflicts(target, all), []);
  });

  it("TC-FC-03: 자기 자신(rsv-01)은 결과에서 제외", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const self = all.find((r) => r.id === "rsv-01");
    assert.strictEqual(findApprovedConflicts(self, all).some((r) => r.id === "rsv-01"), false);
  });

  it("EC-10: 여러 approved 와 동시 겹침 시 전부 반환", () => {
    const all = [
      { id: "a1", resourceId: "res-01", requesterName: "x", startAt: ISO("01:00"), endAt: ISO("02:00"), status: "approved", createdAt: ISO("00:00"), decidedAt: ISO("00:00"), reason: null },
      { id: "a2", resourceId: "res-01", requesterName: "y", startAt: ISO("01:30"), endAt: ISO("02:30"), status: "approved", createdAt: ISO("00:00"), decidedAt: ISO("00:00"), reason: null },
    ];
    const target = { id: "t", resourceId: "res-01", requesterName: "z", startAt: ISO("01:15"), endAt: ISO("02:15"), status: "pending", createdAt: ISO("00:00"), decidedAt: null, reason: null };
    assert.deepStrictEqual(findApprovedConflicts(target, all).map((r) => r.id), ["a1", "a2"]);
  });

  it("잘못된 인자 → TypeError", () => {
    assert.throws(() => findApprovedConflicts(null, []), TypeError);
    assert.throws(() => findApprovedConflicts(seedRsv("rsv-01"), "not-array"), TypeError);
  });
});

// ══════════════════════════════════════════════════════════
describe("decideReservation (§5.2)", () => {
  it("TC-DR-01: rsv-02 approve → ok, approved (rsv-01 은 경계만 닿아 충돌 아님)", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const res = decideReservation(all.find((r) => r.id === "rsv-02"), "approve", all, "2026-07-18T00:00:00.000Z");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.reservation.status, "approved");
    assert.strictEqual(res.reservation.decidedAt, "2026-07-18T00:00:00.000Z");
    assert.strictEqual(res.reservation.reason, null);
  });

  it("TC-DR-02: rsv-01 과 겹치는 신규 pending approve → CONFLICT, pending 유지", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const target = { id: "rsv-conf", resourceId: "res-01", requesterName: "테스터", startAt: "2026-07-20T01:00:00.000Z", endAt: "2026-07-20T01:30:00.000Z", status: "pending", createdAt: "2026-07-17T00:00:00.000Z", decidedAt: null, reason: null };
    const res = decideReservation(target, "approve", all, "2026-07-18T00:00:00.000Z");
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "CONFLICT");
    assert.strictEqual(res.reservation.status, "pending");
  });

  it("TC-DR-03: reject + reason 기록", () => {
    const res = decideReservation(seedRsv("rsv-02"), "reject", [], "2026-07-18T00:00:00.000Z", "회의 취소됨");
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.reservation.status, "rejected");
    assert.strictEqual(res.reservation.reason, "회의 취소됨");
    assert.strictEqual(res.reservation.decidedAt, "2026-07-18T00:00:00.000Z");
  });

  it("TC-DR-03b: reject reason 미제공 → 빈 문자열", () => {
    const res = decideReservation(seedRsv("rsv-02"), "reject", [], "2026-07-18T00:00:00.000Z");
    assert.strictEqual(res.reservation.reason, "");
  });

  it("TC-DR-04: 이미 approved(rsv-01) approve → ALREADY_DECIDED", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const res = decideReservation(all.find((r) => r.id === "rsv-01"), "approve", all, "2026-07-18T00:00:00.000Z");
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, "ALREADY_DECIDED");
    assert.strictEqual(res.reservation.status, "approved");
  });

  it("TC-DR-05: 허용 안 된 action → TypeError", () => {
    assert.throws(() => decideReservation(seedRsv("rsv-02"), "cancel", [], "2026-07-18T00:00:00.000Z"), TypeError);
  });

  it("불변성: 입력 객체를 변경하지 않는다", () => {
    const rsv02 = seedRsv("rsv-02");
    const snapshot = JSON.stringify(rsv02);
    decideReservation(rsv02, "reject", [], "2026-07-18T00:00:00.000Z", "x");
    assert.strictEqual(JSON.stringify(rsv02), snapshot);
  });
});

// ══════════════════════════════════════════════════════════
describe("createReservation (§6.4)", () => {
  const validInput = { id: "rsv-99", resourceId: "res-01", requesterName: "신규신청자", startAt: "2026-07-25T01:00:00.000Z", endAt: "2026-07-25T02:00:00.000Z" };

  it("TC-CR-01: 유효 입력 → pending/decidedAt null/reason null", () => {
    const r = createReservation(validInput, [], "2026-07-17T09:00:00.000Z");
    assert.strictEqual(r.status, "pending");
    assert.strictEqual(r.decidedAt, null);
    assert.strictEqual(r.reason, null);
    assert.strictEqual(r.createdAt, "2026-07-17T09:00:00.000Z");
    assert.strictEqual(r.id, "rsv-99");
  });

  it("TC-CR-02: id 중복 → Error(TypeError/RangeError 아님)", () => {
    const existing = loadReservationState(makeStorage()).reservations;
    const dup = { ...validInput, id: "rsv-01" };
    assert.throws(() => createReservation(dup, existing, "2026-07-17T09:00:00.000Z"), (e) => e instanceof Error && !(e instanceof TypeError) && !(e instanceof RangeError));
  });

  it("TC-CR-03: resourceId 누락 → TypeError", () => {
    const bad = { ...validInput };
    delete bad.resourceId;
    assert.throws(() => createReservation(bad, [], "2026-07-17T09:00:00.000Z"), TypeError);
  });

  it("TC-CR-04: startAt === endAt (0-구간) → RangeError", () => {
    const zero = { ...validInput, startAt: "2026-07-25T01:00:00.000Z", endAt: "2026-07-25T01:00:00.000Z" };
    assert.throws(() => createReservation(zero, [], "2026-07-17T09:00:00.000Z"), RangeError);
  });

  it("불변성: existingReservations 를 변경하지 않는다", () => {
    const existing = loadReservationState(makeStorage()).reservations;
    const len = existing.length;
    createReservation(validInput, existing, "2026-07-17T09:00:00.000Z");
    assert.strictEqual(existing.length, len);
  });
});

// ══════════════════════════════════════════════════════════
describe("loadReservationState / saveReservationState (§7)", () => {
  it("TC-LS-01: getItem null → seed(resources 3, reservations 5)", () => {
    const state = loadReservationState(makeStorage());
    assert.strictEqual(state.schemaVersion, 1);
    assert.strictEqual(state.resources.length, 3);
    assert.strictEqual(state.reservations.length, 5);
  });

  it("TC-LS-02: 손상된 JSON → 예외 없이 seed 폴백", () => {
    const state = loadReservationState(makeStorage({ "team-reservation-canary:v1": "{broken json" }));
    assert.strictEqual(state.reservations.length, 5);
  });

  it("TC-LS-03: schemaVersion 2 → seed 대체", () => {
    const state = loadReservationState(makeStorage({ "team-reservation-canary:v1": JSON.stringify({ schemaVersion: 2, resources: [], reservations: [] }) }));
    assert.strictEqual(state.schemaVersion, 1);
    assert.strictEqual(state.reservations.length, 5);
  });

  it("TC-LS-04: save 후 load round-trip 동일", () => {
    const storage = makeStorage();
    const custom = {
      schemaVersion: 1,
      resources: [{ id: "res-01", name: "테스트룸", capacity: 5 }],
      reservations: [{ id: "rsv-01", resourceId: "res-01", requesterName: "김", startAt: "2026-07-20T01:00:00.000Z", endAt: "2026-07-20T02:00:00.000Z", status: "pending", createdAt: "2026-07-17T00:00:00.000Z", decidedAt: null, reason: null }],
    };
    saveReservationState(storage, custom);
    assert.deepStrictEqual(loadReservationState(storage), custom);
  });

  it("EC-08: setItem 이 throw 하는 환경 → 흡수(크래시 없음)", () => {
    const throwing = { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded / private mode"); } };
    assert.doesNotThrow(() => saveReservationState(throwing, { schemaVersion: 1, resources: [], reservations: [] }));
  });

  it("saveReservationState: 잘못된 state 형식 → TypeError", () => {
    assert.throws(() => saveReservationState(makeStorage(), { schemaVersion: 1, resources: "x", reservations: [] }), TypeError);
    assert.throws(() => saveReservationState(makeStorage(), null), TypeError);
  });

  it("SEED 는 매 접근 새 복사본(참조 공유 없음)", () => {
    const a = loadReservationState(makeStorage());
    const b = loadReservationState(makeStorage());
    a.reservations[0].status = "MUTATED";
    assert.notStrictEqual(b.reservations[0].status, "MUTATED");
  });
});

// ══════════════════════════════════════════════════════════
describe("AC-06: 결정적 재현성", () => {
  it("동일 입력 반복 호출 시 동일 결과", () => {
    const all = loadReservationState(makeStorage()).reservations;
    const rsv02 = all.find((r) => r.id === "rsv-02");
    const r1 = decideReservation(rsv02, "approve", all, "2026-07-18T00:00:00.000Z");
    const r2 = decideReservation(rsv02, "approve", all, "2026-07-18T00:00:00.000Z");
    assert.deepStrictEqual(r1, r2);
  });
});
