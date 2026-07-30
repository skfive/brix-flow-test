# UiScreenContract — 전달 상태 보드 v3 / Delivery Status Board v3

- artifactId: UISC-DELIVERY-BOARD
- interfaceRef: IFC-DELIVERY-STATUS-DESIGN (interfaceKind=design)
- 이 계약은 frozen `ui-contract@v1` sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb 를 그대로 렌더링한다. designer/developer는 selector·상태 모델·design token을 변경하지 않는다.

## Files (owner)
| file | owner | policy |
| --- | --- | --- |
| `demo/phase21-delivery-board-v3/index.html` | developer | additive |
| `demo/phase21-delivery-board-v3/main.js` | developer | additive |
| `demo/phase21-delivery-board-v3/styles.css` | developer | additive |
| `demo/phase21-delivery-board-v3/tests/delivery-board.test.js` | developer | additive |
| `docs/design/mockups/phase21-delivery-board-v3.html` | designer | additive |
| `docs/design/phase21-delivery-board-v3.md` | designer | additive |

## DOM IDs (고정 / frozen)
- `delivery-board-root` — 보드 루트 컨테이너 / board root container
- `board-refresh` — 주 실행 control(새로고침) / primary execution control (refresh)
- `board-status` — 상태 알림 영역 / status announcement region
- `board-role-list` — 역할별 상태 목록 / per-role status list
- `board-revision` — 현재 revision 표시 / current revision display

## CSS classes (고정 / frozen)
- `delivery-board`
- `delivery-board__role`
- `delivery-board__status`
- `delivery-board__refresh`
- `delivery-board__badge`

## Routes
- `/demo/phase21-delivery-board-v3/index.html` (root-relative static, serve_root=`.`)

## States (고정 / frozen)
`idle` → `loading` → (`loaded` | `empty` | `error`) → (`board-refresh` 실행 시 `loading`으로 재전이 / re-enters `loading` on `board-refresh`).
- `idle`: 초기 상태, `board-refresh` 사용 가능 / initial, `board-refresh` usable.
- `loading`: 진행 표시 노출, 조회 진행 / progress shown, fetch in progress.
- `loaded`: `board-role-list`에 역할 항목 렌더 / role items rendered.
- `empty`: 목록 0개, 빈 상태 텍스트 / empty list, empty-state text.
- `error`: 조회 실패, 상태명 텍스트·접근성 이름 노출, 재시도 가능 / fetch failed, status name in text and accessible name, retryable.

## Actions
- `board-refresh` 실행(click / Enter / Space) → `loading`으로 전이 후 재조회 / triggers re-fetch by transitioning to `loading`.

## Design tokens (문자열 / frozen)
- `--color-status-verified=#16a34a`
- `--color-status-pending=#f59e0b`
- `--color-status-failed=#dc2626`
- `--space-board-gap=16px`
- `--font-board-label=14px`

## Accessibility
1. `board-refresh` control은 `aria-label='전달 상태 새로고침'`을 가진다.
2. `board-status` 영역은 `role='status'`, `aria-live='polite'`로 상태 변경을 스크린리더에 알린다.
3. 키보드 Tab으로 `board-refresh`에 도달하고 Enter/Space로 실행 가능하다.
4. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## Responsive
1. 320px 이상에서 `board-role-list`가 세로 스택으로 재배치되고 content overflow가 발생하지 않는다.
2. 768px 이상에서 `board-role-list`는 다열 grid로 표시된다.

## producer policy
render this frozen contract into the planning artifact; do not add files, reassign owners, or introduce requirements outside this contract.
