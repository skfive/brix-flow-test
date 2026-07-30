# InterfaceContract — 전달 상태 보드 v3 / Delivery Status Board v3

## IFC-DELIVERY-STATUS-DESIGN — 전달 상태 보드 UI 계약 / Board UI contract

- interfaceKey: `delivery-status`
- interfaceKind: design
- availability: blueprint-frozen
- producerPacketId: PACKET-PLAN
- consumerPacketIds: PACKET-DESIGN, PACKET-DEV
- artifactPaths:
  - `demo/phase21-delivery-board-v3/index.html`
  - `demo/phase21-delivery-board-v3/main.js`
  - `demo/phase21-delivery-board-v3/styles.css`
  - `demo/phase21-delivery-board-v3/tests/delivery-board.test.js`
  - `docs/design/mockups/phase21-delivery-board-v3.html`
  - `docs/design/phase21-delivery-board-v3.md`

### Invariants
1. designer와 developer는 frozen selector(`delivery-board-root`, `board-refresh`, `board-status`, `board-role-list`, `board-revision`)와 cssClasses를 변경·재정의하지 않는다 / do not change or redefine frozen selectors and cssClasses.
2. 상태 모델은 `idle|loading|loaded|empty|error`로 고정되며 새 상태를 추가하지 않는다 / the state model is fixed and no state is added.
3. design token 값(`--color-status-verified=#16a34a`, `--color-status-pending=#f59e0b`, `--color-status-failed=#dc2626`, `--space-board-gap=16px`, `--font-board-label=14px`)을 변경하지 않는다 / do not change token values.
4. 초기화·취소·실패 뒤 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(`board-refresh`)을 다시 사용할 수 있어야 한다 / reset state and progress and re-enable `board-refresh` after reset/cancel/failure.
5. 계약 6개 파일은 additive policy로만 수정한다 / the six contract files are modified additively only.
6. 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 planner 문서는 이를 재정의하지 않는다 / the frozen blueprint is the sole authority.

### Errors
- fetch 실패 시 `error` 상태로 전이하고 상태명을 화면 텍스트·접근성 이름으로 노출하며 `board-refresh`로 재시도 가능하다 / on fetch failure, transition to `error`, expose status name in text and accessible name, retry via `board-refresh`.

### Versioning
- ui-contract@v1 (sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb). 변경은 새 revision 발행으로만 이뤄진다 / changes only via a new revision.
