// BF-868 · 핫픽스 검증 체크리스트 빌더 단위 테스트
//
// 명세: docs/hotfix-validation/plan/hotfix-validation-BF-866.md §3, §5, §6
// AC:
//   - AC1: 기획 §3 카테고리 A~D 시나리오를 체크리스트 항목으로 매핑
//   - AC2: 핫픽스 특성(공용 코드/UI/경계/verify)에 따라 적용/스킵 판정 + 사유(§6 edge #4)
//   - AC3: §5 파이프라인 다음 단계 계산
//
// 대상: ./hotfix-checklist.js (ESM)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORY,
  PIPELINE,
  DESIGNER_BRANCH,
  buildChecklist,
  summarizeChecklist,
  nextStage,
} from "./hotfix-checklist.js";

// ──────────────────────────────────────────────────────────
// 1. 상수 — 카테고리/파이프라인
// ──────────────────────────────────────────────────────────

test("CATEGORY 는 A~D 4개 카테고리를 라벨과 함께 정의한다", () => {
  assert.deepEqual(Object.keys(CATEGORY), ["A", "B", "C", "D"]);
  assert.equal(CATEGORY.B, "인접 기능 회귀 없음");
});

test("CATEGORY·PIPELINE 은 동결되어 변경 불가", () => {
  assert.ok(Object.isFrozen(CATEGORY));
  assert.ok(Object.isFrozen(PIPELINE));
});

test("PIPELINE 은 §5 임계 경로 순서", () => {
  assert.deepEqual(PIPELINE, ["planner", "developer", "reviewer", "tester"]);
});

test("DESIGNER_BRANCH 는 developer 와 병렬 분기로 표기", () => {
  assert.equal(DESIGNER_BRANCH.parallelWith, "developer");
});

// ──────────────────────────────────────────────────────────
// 2. buildChecklist — 항상 적용되는 항목 (A1, D1)
// ──────────────────────────────────────────────────────────

test("빈 입력이어도 A1(재현·수정)·D1(단독 revert)은 항상 적용", () => {
  const checklist = buildChecklist();
  const applicableIds = checklist
    .filter((i) => i.applicable)
    .map((i) => i.id);
  assert.deepEqual(applicableIds, ["A1", "D1"]);
});

test("체크리스트는 스킵 항목도 사유와 함께 보존한다 (§6 edge #4)", () => {
  const checklist = buildChecklist({});
  assert.equal(checklist.length, 7, "총 7개 항목 모두 남는다");
  const b1 = checklist.find((i) => i.id === "B1");
  assert.equal(b1.applicable, false);
  assert.equal(b1.reason, "핫픽스가 공용 코드를 변경하지 않음");
});

test("각 항목은 categoryLabel 을 CATEGORY 에서 채운다", () => {
  const checklist = buildChecklist();
  const a1 = checklist.find((i) => i.id === "A1");
  assert.equal(a1.category, "A");
  assert.equal(a1.categoryLabel, CATEGORY.A);
});

// ──────────────────────────────────────────────────────────
// 3. buildChecklist — 특성별 적용 판정 (AC2)
// ──────────────────────────────────────────────────────────

test("touchesSharedCode → B1(공용 회귀)·C2(범위 확장) 적용", () => {
  const checklist = buildChecklist({ touchesSharedCode: true });
  assert.equal(checklist.find((i) => i.id === "B1").applicable, true);
  assert.equal(checklist.find((i) => i.id === "C2").applicable, true);
  // UI/경계/verify 는 여전히 스킵
  assert.equal(checklist.find((i) => i.id === "B2").applicable, false);
});

test("touchesUI → B2(UI/접근성 회귀) 적용", () => {
  const checklist = buildChecklist({ touchesUI: true });
  assert.equal(checklist.find((i) => i.id === "B2").applicable, true);
  assert.equal(checklist.find((i) => i.id === "B1").applicable, false);
});

test("hasBoundaryCondition → A2(경계 조건) 적용", () => {
  const checklist = buildChecklist({ hasBoundaryCondition: true });
  assert.equal(checklist.find((i) => i.id === "A2").applicable, true);
});

test("hasVerifyGate → C1(정적 게이트) 적용", () => {
  const checklist = buildChecklist({ hasVerifyGate: true });
  assert.equal(checklist.find((i) => i.id === "C1").applicable, true);
});

test("모든 특성 활성화 시 7개 항목 전부 적용", () => {
  const checklist = buildChecklist({
    touchesSharedCode: true,
    touchesUI: true,
    hasBoundaryCondition: true,
    hasVerifyGate: true,
  });
  assert.ok(checklist.every((i) => i.applicable));
});

test("boolean 이 아닌 truthy 값은 false 로 정규화(=== true 만 적용)", () => {
  const checklist = buildChecklist({ touchesUI: "yes" });
  assert.equal(checklist.find((i) => i.id === "B2").applicable, false);
});

// ──────────────────────────────────────────────────────────
// 4. buildChecklist — 입력 검증
// ──────────────────────────────────────────────────────────

test("객체가 아닌 입력은 TypeError", () => {
  assert.throws(() => buildChecklist(null), TypeError);
  assert.throws(() => buildChecklist([]), TypeError);
  assert.throws(() => buildChecklist(42), TypeError);
});

// ──────────────────────────────────────────────────────────
// 5. summarizeChecklist
// ──────────────────────────────────────────────────────────

test("summarizeChecklist 는 적용/스킵 수와 카테고리별 id 집계", () => {
  const checklist = buildChecklist({ touchesSharedCode: true });
  const summary = summarizeChecklist(checklist);
  assert.equal(summary.total, 7);
  assert.equal(summary.applicable, 4); // A1, B1, C2, D1
  assert.equal(summary.skipped, 3);
  assert.deepEqual(summary.byCategory.B, ["B1"]);
  assert.deepEqual(summary.byCategory.C, ["C2"]);
});

test("summarizeChecklist 는 배열이 아니면 TypeError", () => {
  assert.throws(() => summarizeChecklist("nope"), TypeError);
});

// ──────────────────────────────────────────────────────────
// 6. nextStage — §5 파이프라인 순서
// ──────────────────────────────────────────────────────────

test("nextStage 는 다음 단계를 반환하고 마지막은 null", () => {
  assert.equal(nextStage("planner"), "developer");
  assert.equal(nextStage("developer"), "reviewer");
  assert.equal(nextStage("reviewer"), "tester");
  assert.equal(nextStage("tester"), null);
});

test("nextStage 는 알 수 없는 단계에 RangeError", () => {
  assert.throws(() => nextStage("qa"), RangeError);
});
