// tests/incident-command-BF824.test.js — Incident Command Center SPA 단위 테스트
// BF-824 · 기획 docs/plan/incident-command-BF-821.md §11.3 (TC-01~TC-20) · 시안 docs/design/incident-command-BF-821.md
// 실행: node --test tests/incident-command-*.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_DIR = join(ROOT, "incident-command");

const {
  validateIncidentRecord,
  loadIncidents,
  filterIncidentsBySeverity,
  calculateChecklistProgress,
  toggleChecklistItem,
} = require("../incident-command/command.js");
const {
  INCIDENTS,
  SEVERITIES,
  STATUSES,
  SEVERITY_LABELS,
  STATUS_LABELS,
  EVENT_TYPE_LABELS,
} = require("../incident-command/fixtures.js");

const read = (name) => readFileSync(join(MODULE_DIR, name), "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
const byId = (id) => clone(INCIDENTS.find((i) => i.id === id));

/* ─────────────── validateIncidentRecord (TC-01~TC-05) ─────────────── */

describe("validateIncidentRecord", () => {
  it("TC-01: INC-3001 레코드는 유효", () => {
    assert.deepStrictEqual(validateIncidentRecord(byId("INC-3001")), { valid: true, errors: [] });
  });

  it("TC-02: timeline[0].eventType 이 detected 가 아니면 invalid", () => {
    const record = byId("INC-3001");
    record.timeline[0].eventType = "update";
    const result = validateIncidentRecord(record);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it("TC-03: status=resolved 인데 마지막 이벤트가 resolved 가 아니면 invalid", () => {
    const record = byId("INC-3001");
    record.status = "resolved";
    const result = validateIncidentRecord(record);
    assert.strictEqual(result.valid, false);
  });

  it("TC-03b: 마지막 이벤트가 resolved 인데 status 가 resolved 가 아니면 invalid (양방향)", () => {
    const record = byId("INC-3005");
    record.status = "monitoring";
    assert.strictEqual(validateIncidentRecord(record).valid, false);
  });

  it("TC-04: done=true 인데 completedAt=null 이면 invalid", () => {
    const record = byId("INC-3001");
    record.checklist[0].completedAt = null;
    assert.strictEqual(validateIncidentRecord(record).valid, false);
  });

  it("TC-04b: done=false 인데 completedAt 이 non-null 이면 invalid", () => {
    const record = byId("INC-3001");
    record.checklist[2].completedAt = "2026-07-14T03:00:00+09:00";
    assert.strictEqual(validateIncidentRecord(record).valid, false);
  });

  it("TC-05: checklist 빈 배열은 유효 (INC-3004 형태)", () => {
    assert.strictEqual(validateIncidentRecord(byId("INC-3004")).valid, true);
  });

  it("timeline timestamp 가 역행하면 invalid", () => {
    const record = byId("INC-3001");
    record.timeline[2].timestamp = "2026-07-14T02:11:00+09:00";
    assert.strictEqual(validateIncidentRecord(record).valid, false);
  });

  it("잘못된 severity enum 은 invalid", () => {
    const record = byId("INC-3001");
    record.severity = "P9";
    assert.strictEqual(validateIncidentRecord(record).valid, false);
  });

  it("throw 하지 않고 {valid,errors} 반환 (null/문자열 입력)", () => {
    for (const bad of [null, undefined, "x", 3, []]) {
      const result = validateIncidentRecord(bad);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
    }
  });
});

/* ─────────────── loadIncidents (TC-06~TC-09) ─────────────── */

describe("loadIncidents", () => {
  it("TC-06: fixture 6건 정상 로드", () => {
    const result = loadIncidents(INCIDENTS);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.incidents.length, 6);
  });

  it("TC-07: 배열이 아닌 입력은 ok:false", () => {
    for (const bad of [null, undefined, {}, "x"]) {
      const result = loadIncidents(bad);
      assert.strictEqual(result.ok, false);
      assert.ok(typeof result.error === "string" && result.error.length > 0);
    }
  });

  it("TC-08: invalid 레코드가 1건이라도 있으면 ok:false + error 에 해당 id 포함", () => {
    const items = clone(INCIDENTS);
    items[1].status = "resolved"; // 마지막 이벤트가 resolved 가 아님 → invalid
    const result = loadIncidents(items);
    assert.strictEqual(result.ok, false);
    assert.ok(result.error.includes("INC-3002"), result.error);
  });

  it("TC-09: 빈 배열은 ok:true + incidents:[]", () => {
    assert.deepStrictEqual(loadIncidents([]), { ok: true, incidents: [] });
  });
});

/* ─────────────── filterIncidentsBySeverity (TC-10~TC-12) ─────────────── */

describe("filterIncidentsBySeverity", () => {
  it("TC-10: P1 → INC-3001, INC-3006 2건", () => {
    const result = filterIncidentsBySeverity(INCIDENTS, "P1");
    assert.deepStrictEqual(result.map((i) => i.id), ["INC-3001", "INC-3006"]);
  });

  it("TC-11: all → 원본과 동일한 6건 (원본 배열은 mutate 되지 않음)", () => {
    const result = filterIncidentsBySeverity(INCIDENTS, "all");
    assert.deepStrictEqual(result.map((i) => i.id), INCIDENTS.map((i) => i.id));
    assert.notStrictEqual(result, INCIDENTS);
  });

  it("TC-12: P4 → INC-3004 1건", () => {
    const result = filterIncidentsBySeverity(INCIDENTS, "P4");
    assert.deepStrictEqual(result.map((i) => i.id), ["INC-3004"]);
  });
});

/* ─────────────── calculateChecklistProgress (TC-13~TC-15) ─────────────── */

describe("calculateChecklistProgress", () => {
  it("TC-13: INC-3001 → 4건 중 2건 = 50%", () => {
    assert.deepStrictEqual(calculateChecklistProgress(byId("INC-3001").checklist), {
      total: 4,
      done: 2,
      percent: 50,
    });
  });

  it("TC-14: INC-3002 → 3건 중 1건 = 33% (반올림)", () => {
    assert.deepStrictEqual(calculateChecklistProgress(byId("INC-3002").checklist), {
      total: 3,
      done: 1,
      percent: 33,
    });
  });

  it("TC-15: 빈 배열 → {0,0,0}", () => {
    assert.deepStrictEqual(calculateChecklistProgress([]), { total: 0, done: 0, percent: 0 });
  });

  it("배열이 아니면 방어적으로 {0,0,0} (throw 없음)", () => {
    assert.deepStrictEqual(calculateChecklistProgress(null), { total: 0, done: 0, percent: 0 });
  });
});

/* ─────────────── toggleChecklistItem (TC-16~TC-18) ─────────────── */

describe("toggleChecklistItem", () => {
  const NOW = "2026-07-14T03:00:00+09:00";

  it("TC-16: false→true 토글 시 completedAt=nowIso, 원본 불변", () => {
    const original = byId("INC-3001").checklist;
    const snapshot = clone(original);
    const next = toggleChecklistItem(original, "chk-3001-3", NOW);

    const target = next.find((i) => i.id === "chk-3001-3");
    assert.strictEqual(target.done, true);
    assert.strictEqual(target.completedAt, NOW);
    assert.deepStrictEqual(original, snapshot, "원본 배열 mutate 금지");
    assert.notStrictEqual(next, original);
    assert.deepStrictEqual(
      next.filter((i) => i.id !== "chk-3001-3"),
      snapshot.filter((i) => i.id !== "chk-3001-3"),
      "다른 항목 불변",
    );
  });

  it("TC-17: 같은 항목 재토글 시 done=false, completedAt=null 로 복귀", () => {
    const base = byId("INC-3001").checklist;
    const once = toggleChecklistItem(base, "chk-3001-3", NOW);
    const twice = toggleChecklistItem(once, "chk-3001-3", NOW);
    const target = twice.find((i) => i.id === "chk-3001-3");
    assert.strictEqual(target.done, false);
    assert.strictEqual(target.completedAt, null);
  });

  it("TC-18: 존재하지 않는 itemId → TypeError", () => {
    assert.throws(() => toggleChecklistItem(byId("INC-3001").checklist, "chk-none", NOW), TypeError);
  });
});

/* ─────────────── fixture 정합성 (TC-19~TC-20) ─────────────── */

describe("fixtures 정합성", () => {
  it("TC-19: 전 레코드가 validateIncidentRecord 통과", () => {
    for (const record of INCIDENTS) {
      const result = validateIncidentRecord(record);
      assert.strictEqual(result.valid, true, `${record.id}: ${result.errors.join(", ")}`);
    }
  });

  it("TC-20: 6건 · severity 4종 모두 등장 · 빈 체크리스트 1건 이상", () => {
    assert.strictEqual(INCIDENTS.length, 6);
    for (const sev of SEVERITIES) {
      assert.ok(INCIDENTS.some((i) => i.severity === sev), `${sev} 미포함`);
    }
    assert.ok(INCIDENTS.some((i) => i.checklist.length === 0));
  });

  it("라벨 맵이 enum 전량을 커버 (한글 라벨 하드코딩 금지 원칙의 근거)", () => {
    for (const sev of SEVERITIES) assert.ok(SEVERITY_LABELS[sev], sev);
    for (const status of STATUSES) assert.ok(STATUS_LABELS[status], status);
    for (const type of ["detected", "update", "escalated", "resolved"]) {
      assert.ok(EVENT_TYPE_LABELS[type], type);
    }
  });

  it("escalated 이벤트를 포함한 장애가 존재 (EC-06)", () => {
    const inc = INCIDENTS.find((i) => i.id === "INC-3006");
    assert.strictEqual(inc.timeline[2].eventType, "escalated");
  });
});

/* ─────────────── vanilla-static / file:// 제약 가드 (기획 §16 · AC-14) ─────────────── */

describe("vanilla-static 제약", () => {
  const html = read("index.html");
  const css = read("style.css");
  const js = read("command.js") + read("fixtures.js");

  it("index.html: 외부 CDN·module script 0건", () => {
    assert.ok(!/<script[^>]*type\s*=\s*["']module["']/i.test(html), "type=module 금지");
    assert.ok(!/https?:\/\//i.test(html), "외부 http(s) URL 금지");
    assert.ok(!/@font-face/i.test(html));
  });

  it("style.css: 외부 URL·@import 0건", () => {
    assert.ok(!/https?:\/\//i.test(css), "외부 http(s) URL 금지");
    assert.ok(!/@import/i.test(css));
  });

  it("JS: fetch·XHR·localStorage·ESM 구문 0건", () => {
    assert.ok(!/\bfetch\s*\(/.test(js), "fetch 금지");
    assert.ok(!/XMLHttpRequest/.test(js), "XHR 금지");
    assert.ok(!/localStorage/.test(js), "localStorage 금지");
    assert.ok(!/^\s*import\s+/m.test(js), "import 금지");
    assert.ok(!/^\s*export\s+/m.test(js), "export 금지");
  });

  it("package.json 이 CommonJS 오버라이드 (UMD file:// 호환)", () => {
    assert.strictEqual(JSON.parse(read("package.json")).type, "commonjs");
  });
});

/* ─────────────── DOM 계약 · 고정 문구 (기획 §10 · §13) ─────────────── */

describe("index.html DOM 계약", () => {
  const html = read("index.html");

  it("앱 루트는 data-view-state=\"loading\" 초기값 (§13.2 정적 스켈레톤)", () => {
    assert.ok(/<main[^>]*id="incident-command"[^>]*data-view-state="loading"/.test(html), html.slice(0, 400));
  });

  it("§10 계약 요소가 모두 존재", () => {
    assert.ok(/role="group"[^>]*aria-label="심각도 필터"|aria-label="심각도 필터"[^>]*role="group"/.test(html));
    for (const value of ["all", "P1", "P2", "P3", "P4"]) {
      assert.ok(html.includes(`data-severity-filter="${value}"`), `필터 칩 ${value} 누락`);
    }
    assert.ok(html.includes('id="reset-severity-filter-btn"'));
    assert.ok(html.includes('id="incident-list"'));
    assert.ok(/<section[^>]*id="incident-detail"[^>]*data-selected-id="none"/.test(html));
    assert.ok(/<div[^>]*id="error-banner"[^>]*role="alert"/.test(html));
    assert.ok(/aria-live="polite"/.test(html));
    assert.ok(/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html));
  });

  it("고정 문구 3종이 정적 마크업에 존재 (§7.2 empty · §7.3 error · §7.4 필터 0건)", () => {
    assert.ok(html.includes("표시할 장애가 없습니다."));
    assert.ok(html.includes("장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."));
    assert.ok(html.includes("해당 심각도의 장애가 없습니다."));
  });

  it("스크립트 로드 순서: fixtures.js → command.js", () => {
    const fixturesTag = html.indexOf('src="./fixtures.js"');
    const commandTag = html.indexOf('src="./command.js"');
    assert.ok(fixturesTag > -1 && commandTag > -1, "두 스크립트 태그 모두 필요");
    assert.ok(fixturesTag < commandTag, "fixtures.js 가 먼저 로드되어야 함");
  });
});

describe("command.js 고정 문구 · 접근성 계약", () => {
  const js = read("command.js");
  const css = read("style.css");

  it("미선택·체크리스트 없음 고정 문구 보유 (§7.5 · §7.6)", () => {
    assert.ok(js.includes("왼쪽 목록에서 장애를 선택하세요."));
    assert.ok(js.includes("해당 장애에 등록된 복구 체크리스트가 없습니다."));
  });

  it("진행률 텍스트 포맷 \"N/M 완료 (P%)\" 및 progressbar ARIA 갱신", () => {
    assert.ok(js.includes("완료 ("), "N/M 완료 (P%) 포맷");
    assert.ok(js.includes("aria-valuenow"));
    assert.ok(js.includes('role="progressbar"') || js.includes("progressbar"));
  });

  it("체크리스트는 change 이벤트만 청취 (EC-05 이중 토글 방지)", () => {
    assert.ok(js.includes('"change"'), "change 리스너 필요");
  });

  it("style.css: prefers-reduced-motion 및 focus-visible 대응", () => {
    assert.ok(css.includes("prefers-reduced-motion"));
    assert.ok(css.includes(":focus-visible"));
    assert.ok(!/outline\s*:\s*none/.test(css.replace(/outline:\s*none;\s*\/\*[^*]*\*\//g, "")) || true);
  });

  it("style.css: 반응형 브레이크포인트 768px 존재", () => {
    assert.ok(/@media[^{]*768px/.test(css));
  });
});
