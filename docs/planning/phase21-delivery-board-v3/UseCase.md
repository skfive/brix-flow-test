# UseCase — 전달 상태 보드 v3 / Delivery Status Board v3

## UC-1 — 운영자가 전달 상태를 확인·새로고침 / Operator reviews and refreshes delivery status

- artifactId: UC-DELIVERY-BOARD

### Actors
- 운영자 (Operator) — 전달 상태 보드를 열람하고 새로고침한다 / opens and refreshes the board.
- 시스템 (Delivery board runtime) — 상태 데이터를 조회하고 화면 상태를 전이한다 / fetches status data and transitions view states.

### Preconditions
1. `demo/phase21-delivery-board-v3/index.html`가 serve_root(`.`) 기준으로 정적 제공된다 / served statically.
2. 보드 초기 상태는 `idle`이다 / initial state is `idle`.

### Main flow
| stepId | order | description (KO / EN) |
| --- | --- | --- |
| STEP-OPEN | 1 | 운영자가 보드 페이지를 연다 / Operator opens the board page. |
| STEP-LOAD | 2 | 시스템이 상태를 `loading`으로 전이하고 진행 표시를 노출한다 / System transitions to `loading` and shows progress. |
| STEP-FETCH | 3 | 시스템이 전달 상태 데이터를 조회한다 / System fetches delivery status data. |
| STEP-RENDER | 4 | 역할 목록이 1개 이상이면 `loaded`로 전이해 `board-role-list`에 배지와 함께 렌더링한다 / On non-empty list, transitions to `loaded` and renders items with badges. |
| STEP-REVISION | 5 | `board-revision`에 현재 revision 값을 노출한다 / Exposes current revision in `board-revision`. |
| STEP-REFRESH | 6 | 운영자가 `board-refresh`를 실행하면 STEP-LOAD로 되돌아간다 / Operator triggers `board-refresh`, returning to STEP-LOAD. |

### Alternate flows
| stepId | order | description (KO / EN) |
| --- | --- | --- |
| STEP-EMPTY | 1 | STEP-FETCH 결과 목록이 0개면 `empty`로 전이하고 빈 상태 텍스트를 노출한다 / On empty list, transitions to `empty` with empty-state text. |
| STEP-ERROR | 2 | STEP-FETCH 실패 시 `error`로 전이하고 상태명을 텍스트·접근성 이름으로 노출한다 / On fetch failure, transitions to `error` exposing status name in text and accessible name. |
| STEP-RETRY | 3 | `error`/`empty`에서 `board-refresh` 실행 시 STEP-LOAD로 재진입한다 / From `error`/`empty`, `board-refresh` re-enters STEP-LOAD. |

### Postconditions
1. 초기화·취소·실패 뒤 상태와 진행 표시가 초기값으로 복귀하고 `board-refresh`가 다시 사용 가능하다 / after reset/cancel/failure, state and progress reset and `board-refresh` is usable again.
2. `board-status`는 role='status', aria-live='polite'로 상태 변경을 스크린리더에 알린다 / `board-status` announces changes via role='status', aria-live='polite'.
