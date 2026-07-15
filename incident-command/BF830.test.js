// incident-command/BF830.test.js — /incident-command/ SPA 수용(AC) 검증 테스트
//
// BF-830 · Epic BF-827 (Incident Command Center)
//
// 배경 (Think Before Coding):
//   incident-command/ SPA 는 선행 Epic BF-821/BF-824(PR #150)에서 이미 완전히
//   구현·머지되어 있다(index.html / style.css / fixtures.js / command.js).
//   BF-829 디자인 명세 §0·§11 은 "기존 구현이 source of truth 이며 재구현·수정은
//   비범위"임을 명시한다. 따라서 BF-830 은 Simplicity First / Surgical Changes 원칙에
//   따라 기존 코드를 재작성하지 않고, 아래 세 수용 기준을 기존 구현에 대해 검증하는
//   신규(additive) 테스트만 추가한다 — AC-03("신규 파일만 추가, 기존 파일·의존성·설정
//   불변")을 그대로 구현한 것이다.
//
// 수용 기준 (BF-830):
//   AC1. /incident-command/ 진입 → fixture 데이터로 incident 목록·severity·owner·
//        timeline·checklist 가 정상 렌더된다.
//   AC2. empty / loading / error 상황에서 각 상태 UI 가 표시된다.
//   AC3. 신규 파일만 추가하며 기존 파일·의존성·설정은 변경되지 않는다.
//
// 배치·실행 (File Ownership `incident-command/**` 준수):
//   본 파일은 모듈 디렉터리에 co-locate 한다(incident-command/package.json 이
//   type:commonjs 이므로 require 로 직접 로드). BF824 순수함수 단위 테스트
//   (tests/incident-command-BF824.test.js) · BF826 브라우저 e2e 가드
//   (tests/incident-command/BF826-e2e.test.js) 와 중복하지 않고, BF-830 AC 를
//   수용 레벨로 재확인하는 회귀 가드다.
//   실행: node --test incident-command/BF830.test.js
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const MODULE_DIR = __dirname;
const command = require("./command.js");
const fixtures = require("./fixtures.js");

const {
  validateIncidentRecord,
  loadIncidents,
  filterIncidentsBySeverity,
  calculateChecklistProgress,
  toggleChecklistItem,
} = command;
const { INCIDENTS, SEVERITY_LABELS, STATUS_LABELS, EVENT_TYPE_LABELS } = fixtures;

const read = (name) => readFileSync(join(MODULE_DIR, name), "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
const byId = (id) => clone(INCIDENTS.find((i) => i.id === id));

const INDEX_HTML = read("index.html");
const COMMAND_SRC = read("command.js");
const STYLE_CSS = read("style.css");

/* ══════════════ AC1 — fixture 렌더: 목록·severity·owner·timeline·checklist ══════════════ */

test("AC1-1: loadIncidents(fixture) 는 6건 incident 를 ok 로 로드한다", () => {
  const result = loadIncidents(INCIDENTS);
  assert.equal(result.ok, true);
  assert.equal(result.incidents.length, 6);
});

test("AC1-2: 모든 incident 가 severity·owner·timeline·checklist 필드를 갖춘다", () => {
  const { incidents } = loadIncidents(INCIDENTS);
  for (const inc of incidents) {
    assert.ok(["P1", "P2", "P3", "P4"].includes(inc.severity), `${inc.id} severity`);
    assert.ok(inc.owner && inc.owner.name.length > 0 && inc.owner.team.length > 0, `${inc.id} owner`);
    assert.ok(Array.isArray(inc.timeline) && inc.timeline.length >= 1, `${inc.id} timeline`);
    assert.ok(Array.isArray(inc.checklist), `${inc.id} checklist`);
    assert.equal(validateIncidentRecord(inc).valid, true, `${inc.id} 스키마`);
  }
});

test("AC1-3: severity 필터가 심각도별 부분집합을 반환한다", () => {
  const { incidents } = loadIncidents(INCIDENTS);
  assert.equal(filterIncidentsBySeverity(incidents, "all").length, 6);
  assert.deepEqual(
    filterIncidentsBySeverity(incidents, "P1").map((i) => i.id).sort(),
    ["INC-3001", "INC-3006"]
  );
  assert.deepEqual(
    filterIncidentsBySeverity(incidents, "P2").map((i) => i.id).sort(),
    ["INC-3002", "INC-3005"]
  );
  assert.equal(filterIncidentsBySeverity(incidents, "P3").length, 1);
  assert.equal(filterIncidentsBySeverity(incidents, "P4").length, 1);
});

test("AC1-4: 체크리스트 진행률이 done/total 로 계산된다", () => {
  assert.deepEqual(calculateChecklistProgress(byId("INC-3001").checklist), {
    total: 4,
    done: 2,
    percent: 50,
  });
  // 빈 체크리스트(INC-3004) 는 0/0/0
  assert.deepEqual(calculateChecklistProgress(byId("INC-3004").checklist), {
    total: 0,
    done: 0,
    percent: 0,
  });
});

test("AC1-5: 체크리스트 토글이 완료 상태·진행률을 갱신한다(세션 인터랙션)", () => {
  const checklist = byId("INC-3001").checklist; // done 2 / total 4
  const nowIso = "2026-07-14T03:00:00+09:00";
  const toggled = toggleChecklistItem(checklist, "chk-3001-3", nowIso);
  const item = toggled.find((i) => i.id === "chk-3001-3");
  assert.equal(item.done, true);
  assert.equal(item.completedAt, nowIso);
  assert.deepEqual(calculateChecklistProgress(toggled), { total: 4, done: 3, percent: 75 });
});

test("AC1-6: command.js 렌더 파이프라인이 목록·severity·owner·timeline·checklist 를 그린다", () => {
  // 내부 build* 헬퍼가 각 필수 요소를 DOM 으로 렌더함을 소스 계약으로 확인
  for (const fn of [
    "buildListRow",
    "buildSeverityBadge",
    "buildStatusBadge",
    "buildOwner",
    "buildTimelineSection",
    "buildChecklistSection",
    "renderList",
    "renderDetail",
  ]) {
    assert.ok(COMMAND_SRC.includes("function " + fn), `${fn} 정의 존재`);
  }
});

test("AC1-7: index.html 에 목록·필터·상세 마운트 포인트와 DOM 계약이 존재한다", () => {
  assert.match(INDEX_HTML, /id="incident-list"[^>]*role="listbox"/);
  assert.match(INDEX_HTML, /id="incident-detail"/);
  assert.match(INDEX_HTML, /id="incident-count"/);
  for (const sev of ["all", "P1", "P2", "P3", "P4"]) {
    assert.ok(INDEX_HTML.includes(`data-severity-filter="${sev}"`), `필터 칩 ${sev}`);
  }
});

/* ══════════════ AC2 — empty / loading / error 상태 UI ══════════════ */

test("AC2-1: 빈 배열 로드는 empty 조건(ok·0건)을 만든다", () => {
  const result = loadIncidents([]);
  assert.equal(result.ok, true);
  assert.equal(result.incidents.length, 0);
});

test("AC2-2: 배열이 아니면 error 조건을 만든다", () => {
  assert.equal(loadIncidents(null).ok, false);
  assert.equal(loadIncidents({}).ok, false);
  assert.equal(loadIncidents("nope").ok, false);
});

test("AC2-3: 스키마 위반 레코드는 error 조건을 만든다", () => {
  const bad = byId("INC-3001");
  delete bad.severity; // 필수 필드 제거
  assert.equal(loadIncidents([bad]).ok, false);
});

test("AC2-4: index.html 초기 상태가 loading 스켈레톤이다", () => {
  assert.match(INDEX_HTML, /data-view-state="loading"/);
  assert.match(INDEX_HTML, /class="ic-skeleton"/);
  assert.match(INDEX_HTML, /aria-hidden="true"/);
});

test("AC2-5: index.html 에 empty·error 상태 UI 와 고정 문구가 있다", () => {
  assert.ok(INDEX_HTML.includes("표시할 장애가 없습니다."), "empty 문구");
  assert.match(INDEX_HTML, /role="alert"/);
  assert.ok(
    INDEX_HTML.includes("장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."),
    "error 문구"
  );
});

test("AC2-6: command.js 가 data-view-state 를 loading→ready/empty/error 로 전환한다", () => {
  assert.ok(COMMAND_SRC.includes("function setViewState"), "setViewState 정의");
  assert.match(COMMAND_SRC, /setViewState\("ready"\)/);
  assert.match(COMMAND_SRC, /setViewState\("empty"\)/);
  assert.match(COMMAND_SRC, /setViewState\("error"\)/);
});

test("AC2-7: style.css 가 data-view-state 선택자로 상태별 표시를 담당한다", () => {
  for (const st of ["loading", "ready", "empty", "error"]) {
    assert.ok(STYLE_CSS.includes(`data-view-state="${st}"`), `CSS [data-view-state="${st}"]`);
  }
});

/* ══════════════ AC3 — 신규 파일만 추가 · 기존 계약 보존(회귀 가드) ══════════════ */

test("AC3-1: 기존 모듈 파일이 그대로 존재하고 공개 API 계약을 유지한다", () => {
  for (const f of ["index.html", "style.css", "fixtures.js", "command.js", "package.json"]) {
    assert.ok(read(f).length > 0, `${f} 존재`);
  }
  for (const fn of [
    "validateIncidentRecord",
    "loadIncidents",
    "filterIncidentsBySeverity",
    "calculateChecklistProgress",
    "toggleChecklistItem",
    "init",
  ]) {
    assert.equal(typeof command[fn], "function", `공개 API ${fn}`);
  }
});

test("AC3-2: fixture 라벨 매핑(severity·status·eventType)이 보존된다", () => {
  assert.deepEqual(SEVERITY_LABELS, { P1: "치명", P2: "높음", P3: "보통", P4: "낮음" });
  assert.deepEqual(Object.keys(STATUS_LABELS).sort(), [
    "detected",
    "investigating",
    "mitigating",
    "monitoring",
    "resolved",
  ]);
  assert.deepEqual(Object.keys(EVENT_TYPE_LABELS).sort(), [
    "detected",
    "escalated",
    "resolved",
    "update",
  ]);
});

test("AC3-3: vanilla-static 제약 — fetch/XHR/ESM/외부 CDN 0건", () => {
  for (const src of [COMMAND_SRC, read("fixtures.js")]) {
    assert.ok(!/\bfetch\s*\(/.test(src), "fetch 없음");
    assert.ok(!/XMLHttpRequest/.test(src), "XHR 없음");
    assert.ok(!/\bimport\s+/.test(src) && !/\bexport\s+/.test(src), "ESM 구문 없음");
  }
  assert.ok(!/https?:\/\/[^"']*\.(css|js)/.test(INDEX_HTML), "외부 CDN link/script 없음");
  assert.ok(!INDEX_HTML.includes('type="module"'), "script type=module 없음");
});
