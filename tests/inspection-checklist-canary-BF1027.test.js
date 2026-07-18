/* tests/inspection-checklist-canary-BF1027.test.js
 * BF-1027 developer 단위 테스트 — planner 명세(SSOT)의 필수 케이스 구현
 * SSOT: docs/plan/inspection-checklist-canary-BF-1024.md (§2~§8, §12 edge case)
 * 실행: node --test tests/inspection-checklist-canary-BF1027.test.js
 * 로딩: 루트 package.json 이 "type":"module" → ESM 테스트 + new Function 으로 UMD(storage.js) 로드
 *       (team-reservation-canary 테스트 관례 계승 — storage.js 는 CommonJS-UMD)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "inspection-checklist-canary");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const STORAGE_JS = readFileSync(join(MODULE_DIR, "storage.js"), "utf8");
const APP_JS = readFileSync(join(MODULE_DIR, "app.js"), "utf8");

// 주석 제거 — file:// 안전 가드가 산문(예: "import/export 0건")에 오탐하지 않도록
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// storage.js(UMD)를 테스트와 동일 realm 에서 로드해 API 추출 (deepStrictEqual prototype 일치)
function loadApi() {
  const module = { exports: {} };
  const fn = new Function("module", "globalThis", STORAGE_JS);
  fn(module, globalThis);
  const api = module.exports;
  assert.ok(api && api.load && api.applyTransition, "storage.js 가 InspectionChecklist API 를 노출하지 않음");
  return api;
}

const IC = loadApi();

// in-memory storage mock (localStorage 인터페이스)
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
    _dump() {
      return map;
    },
  };
}

const CTX = { actor: "테스터", at: "2026-07-18T00:00:00.000Z" };
const seedById = (id) => IC.SEED.find((it) => it.id === id);

// ───────────────────────────── seed (planner §8) ─────────────────────────────
describe("결정적 seed (§8)", () => {
  it("7건, id IC-2001~IC-2007", () => {
    const seed = IC.SEED;
    assert.equal(seed.length, 7);
    assert.deepEqual(
      seed.map((i) => i.id),
      ["IC-2001", "IC-2002", "IC-2003", "IC-2004", "IC-2005", "IC-2006", "IC-2007"]
    );
  });

  it("상태 분포: todo 2 / in_progress 3 / blocked 1 / done 1", () => {
    const g = IC.groupByStatus(IC.SEED);
    assert.equal(g.todo.length, 2);
    assert.equal(g.in_progress.length, 3);
    assert.equal(g.blocked.length, 1);
    assert.equal(g.done.length, 1);
  });

  it("집계: 총 7 · 미배정 1 · 차단 1 (§9.2)", () => {
    assert.deepEqual(IC.computeStats(IC.SEED), { total: 7, unassigned: 1, blocked: 1 });
  });

  it("IC-2001 은 미배정 + 빈 history (EC-L 정상 케이스)", () => {
    const it = seedById("IC-2001");
    assert.equal(it.assignee, null);
    assert.deepEqual(it.history, []);
    assert.equal(it.updatedAt, it.createdAt); // 빈 history → updatedAt=createdAt
  });

  it("updatedAt 불변식 = 마지막 history 이벤트 at (§2.1)", () => {
    for (const it of IC.SEED) {
      if (it.history.length === 0) {
        assert.equal(it.updatedAt, it.createdAt, `${it.id}`);
      } else {
        assert.equal(it.updatedAt, it.history[it.history.length - 1].at, `${it.id}`);
      }
    }
  });

  it("blocked 항목만 blockReason non-null, 그 외 null (§5 결합 규칙)", () => {
    for (const it of IC.SEED) {
      if (it.status === "blocked") assert.ok(it.blockReason, `${it.id}`);
      else assert.equal(it.blockReason, null, `${it.id}`);
    }
  });

  it("IC-2007 은 재오픈(BLOCK_CLEARED) 이력 포함, 현재 in_progress + 사유 null", () => {
    const it = seedById("IC-2007");
    assert.equal(it.status, "in_progress");
    assert.equal(it.blockReason, null);
    assert.ok(it.history.some((e) => e.type === "BLOCK_CLEARED"));
  });

  it("결정성: 비결정 API(Date.now/Math.random/new Date) 호출 없음 (§8.1)", () => {
    const src = stripComments(STORAGE_JS);
    assert.equal(/Date\.now|Math\.random|new Date\s*\(/.test(src), false);
  });

  it("SEED 는 매 접근 새 복사본 (참조 공유 없음)", () => {
    const a = IC.SEED;
    a[0].title = "변조";
    assert.notEqual(IC.SEED[0].title, "변조");
  });
});

// ───────────────────────── 전이 가드 (planner §3.2) ─────────────────────────
describe("전이 가드 (§3.2)", () => {
  it("허용 전이 목록이 표와 일치", () => {
    assert.deepEqual(IC.allowedTransitions("todo"), ["in_progress", "blocked"]);
    assert.deepEqual(IC.allowedTransitions("in_progress"), ["done", "blocked", "todo"]);
    assert.deepEqual(IC.allowedTransitions("blocked"), ["todo", "in_progress"]);
    assert.deepEqual(IC.allowedTransitions("done"), ["in_progress"]);
  });

  it("G1: 미배정 todo→in_progress 는 거부 (EC-B)", () => {
    const g = IC.checkGuard(seedById("IC-2001"), "in_progress");
    assert.equal(g.ok, false);
    assert.equal(g.code, "G1");
    assert.ok(g.reason); // 사유 텍스트 노출
  });

  it("G1: 배정된 todo→in_progress 는 허용", () => {
    const g = IC.checkGuard(seedById("IC-2002"), "in_progress");
    assert.equal(g.ok, true);
  });

  it("G2: →blocked 는 사유 입력 필요 표시", () => {
    const g = IC.checkGuard(seedById("IC-2002"), "blocked");
    assert.equal(g.ok, true);
    assert.equal(g.requiresReason, true);
  });

  it("G4: todo→done · blocked→done 는 미정의(버튼 미렌더) (EC-D)", () => {
    assert.equal(IC.checkGuard(seedById("IC-2002"), "done").code, "UNDEFINED");
    assert.equal(IC.checkGuard(seedById("IC-2005"), "done").code, "UNDEFINED");
  });

  it("G5: done→in_progress 허용, done→todo/blocked 미정의 (EC-F)", () => {
    assert.equal(IC.checkGuard(seedById("IC-2006"), "in_progress").ok, true);
    assert.equal(IC.checkGuard(seedById("IC-2006"), "todo").code, "UNDEFINED");
    assert.equal(IC.checkGuard(seedById("IC-2006"), "blocked").code, "UNDEFINED");
  });
});

// ───────────────────── 전이 적용 (불변 · history) ─────────────────────
describe("applyTransition (§3.2·§6)", () => {
  it("todo→in_progress: STATUS_CHANGED append + updatedAt 갱신, 원본 불변", () => {
    const before = seedById("IC-2002");
    const r = IC.applyTransition(before, "in_progress", CTX);
    assert.equal(r.ok, true);
    assert.equal(r.item.status, "in_progress");
    assert.equal(r.item.updatedAt, CTX.at);
    const last = r.item.history[r.item.history.length - 1];
    assert.equal(last.type, "STATUS_CHANGED");
    assert.equal(last.from, "todo");
    assert.equal(last.to, "in_progress");
    // 불변: 원본 seed 항목 미변경
    assert.equal(before.status, "todo");
    assert.equal(before.history.length, 1);
  });

  it("todo→blocked with 사유: STATUS_CHANGED + BLOCK_SET, blockReason 설정", () => {
    const r = IC.applyTransition(seedById("IC-2002"), "blocked", { ...CTX, reason: "출입 통제" });
    assert.equal(r.ok, true);
    assert.equal(r.item.status, "blocked");
    assert.equal(r.item.blockReason, "출입 통제");
    const types = r.item.history.slice(-2).map((e) => e.type);
    assert.deepEqual(types, ["STATUS_CHANGED", "BLOCK_SET"]);
    assert.equal(r.item.history[r.item.history.length - 1].reason, "출입 통제");
  });

  it("→blocked 사유 공백/누락이면 전이 거부 (G2, EC-C)", () => {
    assert.equal(IC.applyTransition(seedById("IC-2002"), "blocked", CTX).ok, false);
    assert.equal(IC.applyTransition(seedById("IC-2002"), "blocked", { ...CTX, reason: "   " }).code, "G2");
    // 거부 시 원본 불변
    assert.equal(seedById("IC-2002").status, "todo");
  });

  it("blocked→in_progress: 사유 자동 null + BLOCK_CLEARED(직전 사유 보존) (EC-G)", () => {
    const before = seedById("IC-2005");
    const prevReason = before.blockReason;
    const r = IC.applyTransition(before, "in_progress", CTX);
    assert.equal(r.ok, true);
    assert.equal(r.item.status, "in_progress");
    assert.equal(r.item.blockReason, null);
    const last = r.item.history[r.item.history.length - 1];
    assert.equal(last.type, "BLOCK_CLEARED");
    assert.equal(last.reason, prevReason); // 감사 추적
  });

  it("미정의 전이(todo→done)는 거부", () => {
    assert.equal(IC.applyTransition(seedById("IC-2002"), "done", CTX).ok, false);
  });

  it("G1 미배정 착수 거부", () => {
    assert.equal(IC.applyTransition(seedById("IC-2001"), "in_progress", CTX).code, "G1");
  });
});

// ───────────────────── 담당자 배정 (planner §4) ─────────────────────
describe("assign (§4)", () => {
  const KIM = { id: "insp-01", name: "김현장" };

  it("todo 배정: ASSIGNEE_CHANGED append", () => {
    const r = IC.assign(seedById("IC-2001"), KIM, CTX);
    assert.equal(r.ok, true);
    assert.deepEqual(r.item.assignee, KIM);
    const last = r.item.history[r.item.history.length - 1];
    assert.equal(last.type, "ASSIGNEE_CHANGED");
    assert.equal(last.from, null);
    assert.equal(last.to, "김현장");
  });

  it("todo 해제 가능", () => {
    assert.equal(IC.assign(seedById("IC-2002"), null, CTX).ok, true);
  });

  it("in_progress 해제 거부 (EC-A)", () => {
    assert.equal(IC.assign(seedById("IC-2003"), null, CTX).code, "REQUIRE_ASSIGNEE");
  });

  it("done 배정/재배정 거부 (EC-E)", () => {
    assert.equal(IC.assign(seedById("IC-2006"), KIM, CTX).code, "DONE_LOCKED");
    assert.equal(IC.assign(seedById("IC-2006"), null, CTX).code, "DONE_LOCKED");
  });

  it("동일 담당자 재배정은 no-op (이력 추가 없음)", () => {
    const before = seedById("IC-2003"); // 김현장
    const r = IC.assign(before, KIM, CTX);
    assert.equal(r.ok, true);
    assert.equal(r.item.history.length, before.history.length);
  });
});

// ───────────────── 저장소 load/save + 손상 복구 (planner §7) ─────────────────
describe("versioned localStorage (§7)", () => {
  it("D1 최초 방문(값 없음): seed 로드 + corrupted=false (EC-H)", () => {
    const r = IC.load(makeStorage());
    assert.equal(r.items.length, 7);
    assert.equal(r.corrupted, false);
    assert.equal(r.source, "seed");
  });

  it("D2 파싱 불가: seed 복구 + corrupted=true (EC-I)", () => {
    const s = makeStorage({ [IC.STORAGE_KEY]: "{not json" });
    const r = IC.load(s);
    assert.equal(r.items.length, 7);
    assert.equal(r.corrupted, true);
  });

  it("D3 schemaVersion 불일치: 복구 (EC-J)", () => {
    const s = makeStorage({ [IC.STORAGE_KEY]: JSON.stringify({ schemaVersion: 2, items: [] }) });
    assert.equal(IC.load(s).corrupted, true);
  });

  it("D5 status enum 위반: 복구 (EC-K)", () => {
    const bad = IC.SEED;
    bad[0].status = "archived";
    const s = makeStorage({ [IC.STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, items: bad }) });
    assert.equal(IC.load(s).corrupted, true);
  });

  it("D6 blockReason 결합 규칙 위반: 복구", () => {
    const bad = IC.SEED;
    bad[0].status = "todo";
    bad[0].blockReason = "잘못된 사유"; // todo 인데 non-null
    const s = makeStorage({ [IC.STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, items: bad }) });
    assert.equal(IC.load(s).corrupted, true);
  });

  it("D7 history 비배열: 복구", () => {
    const bad = IC.SEED;
    bad[0].history = "nope";
    const s = makeStorage({ [IC.STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, items: bad }) });
    assert.equal(IC.load(s).corrupted, true);
  });

  it("정상 저장 데이터: 그대로 로드, corrupted=false", () => {
    const s = makeStorage();
    IC.save(s, IC.SEED);
    const r = IC.load(s);
    assert.equal(r.corrupted, false);
    assert.equal(r.source, "stored");
    assert.equal(r.items.length, 7);
  });

  it("save: envelope schemaVersion=1 로 직렬화", () => {
    const s = makeStorage();
    IC.save(s, IC.SEED);
    const env = JSON.parse(s._dump().get(IC.STORAGE_KEY));
    assert.equal(env.schemaVersion, 1);
    assert.ok(Array.isArray(env.items));
    assert.ok(typeof env.updatedAt === "string");
  });

  it("save: storage 없으면 false 반환(크래시 없음)", () => {
    assert.equal(IC.save(null, IC.SEED), false);
    assert.equal(IC.save({}, IC.SEED), false);
  });

  it("전이 결과를 save→load 라운드트립: 변경 반영 + 이력 추적 (AC-2)", () => {
    const s = makeStorage();
    let { items } = IC.load(s); // seed
    const idx = items.findIndex((i) => i.id === "IC-2002");
    const r = IC.applyTransition(items[idx], "in_progress", CTX);
    items[idx] = r.item;
    IC.save(s, items);
    const reloaded = IC.load(s);
    const it = reloaded.items.find((i) => i.id === "IC-2002");
    assert.equal(it.status, "in_progress");
    assert.ok(it.history.some((e) => e.type === "STATUS_CHANGED" && e.to === "in_progress"));
  });
});

// ───────────────── 정적 가드 (vanilla-static · file://) ─────────────────
describe("정적 구조/가드", () => {
  it("storage.js·app.js: ES import/export·fetch·type=module 0건 (file:// 안전)", () => {
    for (const [name, src] of [
      ["storage.js", stripComments(STORAGE_JS)],
      ["app.js", stripComments(APP_JS)],
    ]) {
      assert.equal(/\bimport\s|\bexport\s|\bexport\{/.test(src), false, `${name} import/export`);
      assert.equal(/\bfetch\s*\(/.test(src), false, `${name} fetch`);
    }
  });

  it("index.html: 외부 CDN 없음, 비-module script 로 storage.js+app.js 로드", () => {
    assert.equal(/src\s*=\s*["']https?:\/\//.test(HTML), false, "외부 script src");
    assert.equal(/<link[^>]+href\s*=\s*["']https?:\/\//.test(HTML), false, "외부 link");
    assert.equal(/type\s*=\s*["']module["']/.test(HTML), false, "type=module");
    assert.ok(/<script[^>]+src=["']\.\/storage\.js["']/.test(HTML), "storage.js 로드");
    assert.ok(/<script[^>]+src=["']\.\/app\.js["']/.test(HTML), "app.js 로드");
  });

  it("index.html: 필수 마운트 노드/ARIA 랜드마크 존재", () => {
    assert.ok(/id=["']icc-board["']/.test(HTML), "보드 마운트");
    assert.ok(/id=["']icc-detail["']/.test(HTML), "상세 마운트");
    assert.ok(/id=["']icc-stats["']/.test(HTML), "집계 마운트");
    assert.ok(/aria-live=["']polite["']/.test(HTML), "집계 live region");
    assert.ok(/<header/.test(HTML) && /<main/.test(HTML), "header/main 랜드마크");
  });

  it("styles.css: --icc-* 상태 색 토큰 정의 (design §2)", () => {
    for (const t of ["--icc-color-todo", "--icc-color-progress", "--icc-color-blocked", "--icc-color-done", "--icc-color-accent"]) {
      assert.ok(CSS.includes(t), `${t} 정의`);
    }
  });

  it("app.js: 손상 경고 배너 + console.warn 복구 로그 (AC-3)", () => {
    assert.ok(/console\.warn/.test(APP_JS), "console.warn 복구 로그");
  });
});
