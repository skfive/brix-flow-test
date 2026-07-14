/* tests/incident-triage-history-BF809.test.js
 * BF-809 · Incident Handoff Timeline pure 함수 단위 테스트
 * 기획 docs/plan/incident-triage-history-BF-806.md §6(Contract) · §7.2(TC-01~TC-11)
 * vanilla-static — node --test 로만 실행, DOM/브라우저 의존 0건
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// history.js / fixtures.js 는 UMD(CommonJS) — 루트 package.json 이 type:module 이므로
// 기존 incident-triage-BF803.test.js 관례대로 createRequire 로 로드한다.
const require = createRequire(import.meta.url);
const { deriveIncidentStatus, formatCompletedAt } = require("../incident-triage/history/history.js");
const { INCIDENT_HISTORY } = require("../incident-triage/history/fixtures.js");

const HISTORY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "incident-triage", "history");
const readHistoryFile = (name) => fs.readFileSync(path.join(HISTORY_DIR, name), "utf8");

/* ─── 헬퍼: §2.1 role 고정 순서로 stages 5개 생성 ─── */
const ROLE_ORDER = ["planner", "designer", "developer", "reviewer", "tester"];

function stagesOf(statuses) {
  return statuses.map((status, i) => ({ role: ROLE_ORDER[i], status: status }));
}

/* ══════════ deriveIncidentStatus (기획 §2.3 우선순위 표) ══════════ */

test("TC-01: 5개 Stage 전부 done → 'done'", () => {
  const stages = stagesOf(["done", "done", "done", "done", "done"]);
  assert.equal(deriveIncidentStatus(stages), "done");
});

test("TC-02: 5개 Stage 전부 not_started → 'not_started'", () => {
  const stages = stagesOf(["not_started", "not_started", "not_started", "not_started", "not_started"]);
  assert.equal(deriveIncidentStatus(stages), "not_started");
});

test("TC-03: done·done·in_progress·not_started·not_started → 'in_progress'", () => {
  const stages = stagesOf(["done", "done", "in_progress", "not_started", "not_started"]);
  assert.equal(deriveIncidentStatus(stages), "in_progress");
});

test("TC-04: blocked 가 하나라도 있으면 done 이 섞여 있어도 'blocked' (규칙 1 최우선)", () => {
  const stages = stagesOf(["done", "done", "blocked", "not_started", "not_started"]);
  assert.equal(deriveIncidentStatus(stages), "blocked");

  // done 4개 + blocked 1개 — 규칙 2(전부 done)보다 규칙 1 이 우선
  const mixed = stagesOf(["done", "done", "done", "done", "blocked"]);
  assert.equal(deriveIncidentStatus(mixed), "blocked");
});

test("TC-05: stages 길이가 5가 아니면 TypeError", () => {
  assert.throws(() => deriveIncidentStatus(stagesOf(["done", "done", "done", "done"])), TypeError);
  assert.throws(
    () => deriveIncidentStatus(stagesOf(["done", "done", "done", "done", "done"]).concat({ role: "planner", status: "done" })),
    TypeError,
  );
  assert.throws(() => deriveIncidentStatus("not-an-array"), TypeError);
  assert.throws(() => deriveIncidentStatus(null), TypeError);
});

test("TC-06: role 구성/순서가 §2.1 과 다르면 TypeError", () => {
  const swapped = [
    { role: "designer", status: "done" },
    { role: "planner", status: "done" },
    { role: "developer", status: "done" },
    { role: "reviewer", status: "done" },
    { role: "tester", status: "done" },
  ];
  assert.throws(() => deriveIncidentStatus(swapped), TypeError);

  const unknownRole = [
    { role: "planner", status: "done" },
    { role: "designer", status: "done" },
    { role: "developer", status: "done" },
    { role: "reviewer", status: "done" },
    { role: "operator", status: "done" },
  ];
  assert.throws(() => deriveIncidentStatus(unknownRole), TypeError);
});

test("TC-07: status 가 §2.2 enum 4종이 아니면 TypeError", () => {
  assert.throws(() => deriveIncidentStatus(stagesOf(["done!", "done", "done", "done", "done"])), TypeError);
  assert.throws(() => deriveIncidentStatus(stagesOf([null, "done", "done", "done", "done"])), TypeError);
});

/* ══════════ formatCompletedAt (기획 §6.2 · EC-09) ══════════ */

test("TC-08: ISO 8601 문자열 → 'YYYY-MM-DD HH:mm'", () => {
  assert.equal(formatCompletedAt("2026-07-10T14:32:00+09:00"), "2026-07-10 14:32");
});

test("TC-08b: 타임존이 달라도 오프셋 재변환 없이 문자열 그대로 슬라이싱 (Date 미사용 — 결정론적)", () => {
  // 같은 벽시계 값이면 오프셋과 무관하게 동일 출력 — new Date() 로 파싱하면 깨지는 케이스
  assert.equal(formatCompletedAt("2026-07-10T14:32:00Z"), "2026-07-10 14:32");
  assert.equal(formatCompletedAt("2026-07-10T14:32:00-05:00"), "2026-07-10 14:32");
});

test("TC-09: null → '-'", () => {
  assert.equal(formatCompletedAt(null), "-");
});

test("TC-10: 패턴 불일치 문자열 → TypeError", () => {
  assert.throws(() => formatCompletedAt("invalid-date"), TypeError);
  assert.throws(() => formatCompletedAt("2026-07-10"), TypeError);
  assert.throws(() => formatCompletedAt(20260710), TypeError);
});

test("EC-09: 초(:ss) 가 없는 ISO 문자열도 'YYYY-MM-DD HH:mm' 반환", () => {
  assert.equal(formatCompletedAt("2026-07-10T14:32+09:00"), "2026-07-10 14:32");
});

/* ══════════ TC-11: fixture 스키마 적합성 (기획 §4) ══════════ */

test("TC-11: INCIDENT_HISTORY 각 인시던트는 stages 5개 · §2.1 role 순서 고정", () => {
  assert.ok(Array.isArray(INCIDENT_HISTORY));
  assert.ok(INCIDENT_HISTORY.length >= 1);

  for (const incident of INCIDENT_HISTORY) {
    assert.match(incident.epicKey, /^BF-\d+$/, `${incident.id} epicKey`);
    assert.equal(typeof incident.title, "string");
    assert.equal(incident.stages.length, 5, `${incident.id} stages 길이`);
    assert.deepEqual(
      incident.stages.map((s) => s.role),
      ROLE_ORDER,
      `${incident.id} role 순서`,
    );
  }
});

test("TC-11b: fixture 의 status 별 null 허용 규칙 (기획 §4.3)", () => {
  for (const incident of INCIDENT_HISTORY) {
    for (const stage of incident.stages) {
      const where = `${incident.id}/${stage.role}`;

      if (stage.status === "not_started") {
        assert.equal(stage.assigneeName, null, `${where} assigneeName`);
        assert.equal(stage.completedAt, null, `${where} completedAt`);
        assert.equal(stage.jiraIssueKey, null, `${where} jiraIssueKey`);
        assert.equal(stage.prUrl, null, `${where} prUrl`);
      } else {
        assert.equal(typeof stage.assigneeName, "string", `${where} assigneeName`);
        assert.match(stage.jiraIssueKey, /^BF-\d+$/, `${where} jiraIssueKey`);
      }

      if (stage.status === "done") {
        assert.equal(typeof stage.completedAt, "string", `${where} completedAt`);
        assert.equal(typeof stage.prUrl, "string", `${where} prUrl (done 이면 non-null 필수)`);
      } else {
        assert.equal(stage.completedAt, null, `${where} completedAt (done 이 아니면 null)`);
      }
    }
  }
});

test("EC-04/AC-06: reviewer 의 prUrl 은 non-null 이면 developer 와 동일 URL", () => {
  for (const incident of INCIDENT_HISTORY) {
    const dev = incident.stages.find((s) => s.role === "developer");
    const reviewer = incident.stages.find((s) => s.role === "reviewer");
    if (reviewer.prUrl !== null) {
      assert.equal(reviewer.prUrl, dev.prUrl, `${incident.id} reviewer PR = developer PR`);
    }
  }
});

test("fixture 전체가 deriveIncidentStatus 계약을 통과 (throw 없이 4종 enum 반환)", () => {
  const allowed = ["not_started", "in_progress", "blocked", "done"];
  for (const incident of INCIDENT_HISTORY) {
    assert.ok(allowed.includes(deriveIncidentStatus(incident.stages)), `${incident.id}`);
  }
});

/* ══════════ 정적 가드 — vanilla-static / file:// 제약 (기획 §11 · AC-11) ══════════ */

test("AC-11: JS 에 fetch/XHR/import/export/localStorage 가 없다 (file:// CORS 안전)", () => {
  for (const name of ["history.js", "fixtures.js"]) {
    const src = readHistoryFile(name);
    assert.doesNotMatch(src, /\bfetch\s*\(/, `${name}: fetch 금지`);
    assert.doesNotMatch(src, /XMLHttpRequest/, `${name}: XHR 금지`);
    assert.doesNotMatch(src, /^\s*import\s/m, `${name}: ESM import 금지`);
    assert.doesNotMatch(src, /^\s*export\s/m, `${name}: ESM export 금지`);
    assert.doesNotMatch(src, /localStorage/, `${name}: localStorage 금지`);
  }
});

test("AC-11: index.html 은 외부 CDN 없이 classic script 를 fixtures.js → history.js 순으로 로드", () => {
  const html = readHistoryFile("index.html");

  assert.doesNotMatch(html, /type\s*=\s*["']module["']/, "type=module 금지 (file:// CORS)");
  assert.doesNotMatch(html, /(src|href)\s*=\s*["']https?:\/\//, "외부 CDN link/script 금지");

  const fixturesAt = html.indexOf('src="./fixtures.js"');
  const historyAt = html.indexOf('src="./history.js"');
  assert.ok(fixturesAt !== -1 && historyAt !== -1, "fixtures.js·history.js 둘 다 로드");
  assert.ok(fixturesAt < historyAt, "fixtures.js 가 history.js 보다 먼저 로드되어야 함 (기획 §5.2)");

  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/, "AC-09 viewport");
  assert.match(html, /id="history-list"/, "AC-01 렌더 컨테이너");
});

test("AC-08: 기존 심각도 판정 도구(../index.html)로 돌아가는 백링크가 있다", () => {
  assert.match(readHistoryFile("index.html"), /href="\.\.\/index\.html"/);
});

test("AC-05: 링크는 target=_blank + rel=noopener 로 렌더된다 (history.js 계약)", () => {
  const src = readHistoryFile("history.js");
  assert.match(src, /link\.target\s*=\s*"_blank"/);
  assert.match(src, /link\.rel\s*=\s*"noopener noreferrer"/);
});

test("style.css 는 --ith-* 프리픽스만 정의하고 외부 폰트를 import 하지 않는다", () => {
  const css = readHistoryFile("style.css");
  assert.match(css, /--ith-color-done:\s*#0F7B4F/, "시안 §7.1 상태 HEX 준수");
  assert.doesNotMatch(css, /@import/, "외부 CSS import 금지");
  assert.doesNotMatch(css, /https?:\/\//, "외부 폰트/CDN URL 금지");
});
