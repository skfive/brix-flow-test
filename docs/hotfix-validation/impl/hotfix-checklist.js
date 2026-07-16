// BF-868 · 핫픽스 검증 체크리스트 빌더 (단일 JS 구현)
//
// 근거: docs/hotfix-validation/plan/hotfix-validation-BF-866.md
//   - §3 검증 시나리오 (카테고리 A~D) 를 실행 가능한 로직으로 1:1 매핑
//   - §4 "Given/When/Then 을 실행 가능한 케이스로 매핑" 권고 반영
//   - §5 페르소나 파이프라인 의존성 (planner → developer → reviewer → tester)
//   - §6 edge #4 "해당 없음(스킵)" 은 사유와 함께 표기 (억지로 끼워 맞추지 않음)
//
// 핵심: 핫픽스의 특성(공용 코드/UI/경계 조건/verify 게이트/단독 revert)을 입력받아
//       어떤 검증 항목이 "필수"인지, 어떤 항목이 "해당 없음(스킵)"인지 사유와 함께 산출한다.
//       기획 문서는 PR #283 의 실제 diff 에 의존하지 않는 범용 체크리스트이므로(§1.2),
//       실제 핫픽스 특성을 입력으로 받아 구체 체크리스트로 좁히는 것이 본 모듈의 역할이다.

/** §3 카테고리 식별자 → 사람이 읽는 라벨 */
export const CATEGORY = Object.freeze({
  A: "원인 재현 및 수정 확인",
  B: "인접 기능 회귀 없음",
  C: "정적 검증 게이트",
  D: "롤백 가능성",
});

/**
 * §5 파이프라인 의존성의 review/merge 임계 경로.
 * designer 는 UI 변경이 있을 때만 developer 와 병렬로 붙는 선택 분기이므로
 * 순차 nextStage 계산에서는 제외하고 아래 DESIGNER_BRANCH 로 별도 표기한다.
 */
export const PIPELINE = Object.freeze([
  "planner",
  "developer",
  "reviewer",
  "tester",
]);

/** §5 — UI 변경 시 developer 와 병렬로 진입하는 선택 분기 */
export const DESIGNER_BRANCH = Object.freeze({
  parallelWith: "developer",
  entryCondition: "핫픽스가 UI 변경을 포함하는 경우에만",
});

/**
 * §3 의 Given/When/Then 항목을 체크리스트 항목으로 코드화.
 * applies(hotfix) 가 true 면 필수 항목, false 면 skipReason 과 함께 스킵.
 */
const ITEM_SPECS = Object.freeze([
  {
    id: "A1",
    category: "A",
    title: "원래 버그 재현 절차가 핫픽스 적용 후 더 이상 재현되지 않음",
    applies: () => true,
  },
  {
    id: "A2",
    category: "A",
    title: "경계 조건(정상/경계값/경계 밖)별로 의도한 동작을 확인",
    applies: (h) => h.hasBoundaryCondition,
    skipReason: "핫픽스가 특정 경계 조건에서만 발생하는 문제를 다루지 않음",
  },
  {
    id: "B1",
    category: "B",
    title: "변경된 공용 유틸/컴포넌트/설정 사용처의 기존 회귀 가드가 모두 통과",
    applies: (h) => h.touchesSharedCode,
    skipReason: "핫픽스가 공용 코드를 변경하지 않음",
  },
  {
    id: "B2",
    category: "B",
    title: "변경 화면·인접 화면의 레이아웃/접근성(포커스·대비·aria) 회귀 없음",
    applies: (h) => h.touchesUI,
    skipReason: "핫픽스가 UI 변경을 포함하지 않음",
  },
  {
    id: "C1",
    category: "C",
    title: "pnpm verify(lint/typecheck/build) 등 정적 게이트 전체 통과",
    applies: (h) => h.hasVerifyGate,
    skipReason: "저장소에 verify 동등 게이트가 정의되어 있지 않음",
  },
  {
    id: "C2",
    category: "C",
    title: "focused 범위를 넘어 공용 코드 사용처의 회귀 가드까지 확장 실행",
    applies: (h) => h.touchesSharedCode,
    skipReason: "공용 코드 미변경이므로 focused 범위로 충분",
  },
  {
    id: "D1",
    category: "D",
    title: "다른 미병합 변경과 충돌 없이 단독으로 revert 가능한 범위",
    applies: () => true,
  },
]);

/** hotfix 입력의 알려진 boolean 특성 키 (미지정 시 false 로 정규화) */
const HOTFIX_FLAGS = Object.freeze([
  "touchesSharedCode",
  "touchesUI",
  "hasBoundaryCondition",
  "hasVerifyGate",
]);

/**
 * @typedef {Object} HotfixTraits
 * @property {boolean} [touchesSharedCode] 공용 유틸/컴포넌트/설정 변경 여부
 * @property {boolean} [touchesUI]         UI(화면/마크업) 변경 포함 여부
 * @property {boolean} [hasBoundaryCondition] 특정 경계 조건에서만 발생하던 문제인지
 * @property {boolean} [hasVerifyGate]     저장소에 verify 동등 게이트 존재 여부
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} id            항목 식별자 (예: "B1")
 * @property {"A"|"B"|"C"|"D"} category
 * @property {string} categoryLabel 카테고리 사람이 읽는 라벨
 * @property {string} title         검증 항목 설명
 * @property {boolean} applicable   해당 핫픽스에 적용되는 필수 항목인지
 * @property {string} reason        필수/스킵 사유
 */

/**
 * 입력 hotfix 특성을 알려진 flag 만 boolean 으로 정규화한다.
 * plain object 가 아니면 TypeError.
 * @param {HotfixTraits} hotfix
 * @returns {Record<string, boolean>}
 */
function normalizeTraits(hotfix) {
  if (
    hotfix === null ||
    typeof hotfix !== "object" ||
    Array.isArray(hotfix)
  ) {
    throw new TypeError("hotfix 는 특성 flag 를 담은 객체여야 합니다");
  }
  const normalized = {};
  for (const key of HOTFIX_FLAGS) {
    normalized[key] = hotfix[key] === true;
  }
  return normalized;
}

/**
 * 핫픽스 특성으로부터 §3 카테고리 A~D 검증 체크리스트를 생성한다.
 * 적용되지 않는 항목은 제거하지 않고 applicable=false + 스킵 사유로 남긴다(§6 edge #4).
 * @param {HotfixTraits} [hotfix]
 * @returns {ChecklistItem[]}
 */
export function buildChecklist(hotfix = {}) {
  const traits = normalizeTraits(hotfix);
  return ITEM_SPECS.map((spec) => {
    const applicable = spec.applies(traits);
    return {
      id: spec.id,
      category: spec.category,
      categoryLabel: CATEGORY[spec.category],
      title: spec.title,
      applicable,
      reason: applicable
        ? "이 핫픽스에 적용되는 필수 검증 항목"
        : spec.skipReason ?? "해당 없음",
    };
  });
}

/**
 * 체크리스트를 요약한다 — 총계·적용/스킵 수·카테고리별 적용 항목 id.
 * @param {ChecklistItem[]} checklist
 * @returns {{total:number, applicable:number, skipped:number, byCategory:Record<string,string[]>}}
 */
export function summarizeChecklist(checklist) {
  if (!Array.isArray(checklist)) {
    throw new TypeError("checklist 는 배열이어야 합니다");
  }
  const byCategory = {};
  let applicable = 0;
  for (const item of checklist) {
    if (item.applicable) {
      applicable += 1;
      (byCategory[item.category] ??= []).push(item.id);
    }
  }
  return {
    total: checklist.length,
    applicable,
    skipped: checklist.length - applicable,
    byCategory,
  };
}

/**
 * §5 파이프라인의 다음 단계를 반환한다. 마지막 단계면 null.
 * 알 수 없는 단계면 RangeError.
 * @param {string} stage
 * @returns {string|null}
 */
export function nextStage(stage) {
  const idx = PIPELINE.indexOf(stage);
  if (idx === -1) {
    throw new RangeError(`알 수 없는 파이프라인 단계: ${String(stage)}`);
  }
  return idx === PIPELINE.length - 1 ? null : PIPELINE[idx + 1];
}
