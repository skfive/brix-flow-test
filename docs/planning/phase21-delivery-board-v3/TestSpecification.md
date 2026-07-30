# TestSpecification — 전달 상태 보드 v3 / Delivery Status Board v3

## TS-DELIVERY-BOARD — 상태 전이·접근성·반응형 검증 / State, a11y, responsive verification

- artifactId: TS-DELIVERY-BOARD
- requirementRefs: REQ-1, REQ-2, REQ-3
- level: unit
- Test command authority: `npm test` (focused scope)

### Preconditions
1. `demo/phase21-delivery-board-v3/index.html`, `main.js`, `styles.css`가 존재하고 frozen selector를 노출한다 / exist and expose frozen selectors.
2. `demo/phase21-delivery-board-v3/tests/delivery-board.test.js` (developer 소유)가 실행 가능하다 / runnable.

### Steps
| stepId | order | description (KO / EN) |
| --- | --- | --- |
| STEP-INIT | 1 | 초기 진입 시 상태가 `idle`이고 `board-refresh`가 활성인지 확인한다 / initial state `idle` and `board-refresh` enabled. |
| STEP-LOADING | 2 | `board-refresh` 실행 시 `loading`으로 전이하고 진행 표시가 노출되는지 확인한다 / on trigger, transitions to `loading` with progress shown. |
| STEP-LOADED | 3 | 비어있지 않은 목록 수신 시 `loaded`로 전이하고 `board-role-list`에 배지가 렌더되는지 확인한다 / on non-empty list, `loaded` with badges rendered. |
| STEP-EMPTY | 4 | 빈 목록 수신 시 `empty`로 전이하고 빈 상태 텍스트가 노출되는지 확인한다 / on empty list, `empty` with empty-state text. |
| STEP-ERROR | 5 | fetch 실패 시 `error`로 전이하고 상태명이 텍스트·접근성 이름으로 노출되는지 확인한다 / on failure, `error` with status name in text and accessible name. |
| STEP-REENABLE | 6 | 실패·취소 뒤 상태·진행 표시가 초기값으로 복귀하고 `board-refresh`가 재활성화되는지 확인한다 / after failure/cancel, state/progress reset and `board-refresh` re-enabled. |
| STEP-A11Y | 7 | `board-refresh`의 aria-label과 `board-status`의 role='status'/aria-live='polite', Tab→Enter/Space 실행을 확인한다 / verify aria-label, role/aria-live, keyboard activation. |
| STEP-RESPONSIVE | 8 | 320px 세로 스택·overflow 없음, 768px 다열 grid를 확인한다 / verify 320px stack (no overflow) and 768px grid. |

### expectedResult
모든 step이 통과하고 `npm test`가 성공한다. 상태 모델·selector·design token·접근성·반응형 계약이 frozen 값과 일치한다 / all steps pass and `npm test` succeeds; state model, selectors, tokens, a11y, responsive match frozen values.

### evidencePolicy
- `build_result` — verified PR head SHA provenance로 자동 생산 / auto-produced as head SHA provenance.
- `test_result` — tester가 `npm test` 실제 결과를 기록 / tester records actual `npm test` result.
