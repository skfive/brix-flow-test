// BF-1105 요청 우선순위 분류 순수 로직 단위 테스트
// 검증 명령: node --test demo/request-priority-skill-canary/tests/*.test.js
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyRequestPriority,
  UndefinedGradeError,
  PRIORITY_META,
  IMPACTS,
  URGENCIES,
} from "../../../src/demo/request-priority/classify.js";

// 기획 BF-1103 §3 매트릭스 (Impact × Urgency → P1~P4)
const EXPECTED = {
  critical: { immediate: "P1", high: "P1", medium: "P2", low: "P2" },
  high: { immediate: "P1", high: "P2", medium: "P2", low: "P3" },
  medium: { immediate: "P2", high: "P3", medium: "P3", low: "P4" },
  low: { immediate: "P3", high: "P4", medium: "P4", low: "P4" },
};

test("16개 조합 모두 매트릭스와 1:1 일치한다", () => {
  for (const impact of IMPACTS) {
    for (const urgency of URGENCIES) {
      const { priority } = classifyRequestPriority(impact, urgency);
      assert.equal(
        priority,
        EXPECTED[impact][urgency],
        `${impact} × ${urgency} 는 ${EXPECTED[impact][urgency]} 이어야 함`,
      );
    }
  }
});

test("AC 매핑 발췌 (기획 §3.2) 를 만족한다", () => {
  assert.equal(classifyRequestPriority("critical", "immediate").priority, "P1");
  assert.equal(classifyRequestPriority("critical", "medium").priority, "P2");
  assert.equal(classifyRequestPriority("medium", "low").priority, "P4");
  // 긴급도=즉시라도 영향도가 낮으면 격상하지 않음 → P3
  assert.equal(classifyRequestPriority("low", "immediate").priority, "P3");
});

test("반환된 nextAction 은 우선순위별 §3.1 텍스트와 정확히 일치한다", () => {
  const { priority, nextAction } = classifyRequestPriority("critical", "immediate");
  assert.equal(priority, "P1");
  assert.equal(nextAction, PRIORITY_META.P1.nextAction);
  assert.equal(
    classifyRequestPriority("low", "low").nextAction,
    PRIORITY_META.P4.nextAction,
  );
});

test("PRIORITY_META 는 P1~P4 라벨/조치/목표시간을 모두 정의한다", () => {
  for (const p of ["P1", "P2", "P3", "P4"]) {
    assert.ok(PRIORITY_META[p].label, `${p} label`);
    assert.ok(PRIORITY_META[p].nextAction, `${p} nextAction`);
    assert.ok(PRIORITY_META[p].targetTime, `${p} targetTime`);
  }
});

test("정의되지 않은 등급은 UndefinedGradeError 를 던진다 (폴백 추정 금지)", () => {
  assert.throws(() => classifyRequestPriority("unknown", "immediate"), UndefinedGradeError);
  assert.throws(() => classifyRequestPriority("critical", "someday"), UndefinedGradeError);
  assert.throws(() => classifyRequestPriority(null, null), UndefinedGradeError);
  // prototype 오염 등급명도 거부 (hasOwnProperty 로 가드)
  assert.throws(() => classifyRequestPriority("critical", "toString"), UndefinedGradeError);
});

test("순수 함수 — 같은 입력은 항상 같은 출력 (무상태 재계산)", () => {
  const a = classifyRequestPriority("high", "medium");
  const b = classifyRequestPriority("high", "medium");
  assert.deepEqual(a, b);
});
