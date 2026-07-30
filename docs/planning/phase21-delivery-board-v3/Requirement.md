# Requirement — 전달 상태 보드 v3 / Delivery Status Board v3

- Task: BF-1287 · 전달 상태 보드 실행 계약 동결
- Interface freeze: `planning-contract@v1` sha256:5a7ad7faf67307fedc12d8871504fe218ee58cfffac7b681ed1f05e654c6fbc0
- UI freeze: `ui-contract@v1` sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb
- Stack: vanilla-static (ESM, npm, serve_root=`.`)

## REQ-1 — 전달 상태 보드 렌더링 / Delivery board rendering

**Statement (KO):** 운영자가 전달 상태 보드를 열면, 각 역할(role)의 전달 상태가 verified/pending/failed 배지와 함께 목록으로 표시되고, 현재 revision 값이 노출된다.

**Statement (EN):** When the operator opens the delivery status board, each role's delivery status is shown as a list with verified/pending/failed badges, and the current revision value is exposed.

- Priority: high
- Rationale (KO): designer·developer가 동일 revision/checksum을 재해석 없이 소비하려면 화면 계약과 상태 모델이 고정되어야 한다.
- Rationale (EN): To let designer and developer consume the same revision/checksum without reinterpretation, the screen contract and state model must be frozen.

**Acceptance (Given/When/Then):**
1. Given 보드가 처음 로드되기 전, When 초기 진입, Then 상태는 `idle`이며 주 실행 control(`board-refresh`)은 사용 가능하다.
2. Given 데이터 요청 진행 중, When fetch가 시작되면, Then 상태는 `loading`이고 진행 표시가 나타난다.
3. Given 데이터 수신 성공, When 역할 목록이 1개 이상, Then 상태는 `loaded`이고 `board-role-list`에 역할별 항목이 렌더링된다.
4. Given 데이터 수신 성공, When 역할 목록이 0개, Then 상태는 `empty`이고 빈 상태 텍스트가 노출된다.
5. Given 데이터 요청 실패, When fetch 오류, Then 상태는 `error`이고 상태명이 화면 텍스트와 접근성 이름으로 노출되며 `board-refresh`로 재시도할 수 있다.

## REQ-2 — 상태 초기화·재활성화 / State reset & re-enable

**Statement (KO):** 초기화·취소·실패 후에는 상태와 진행 표시가 초기값으로 되돌아가고, 주 실행 control(`board-refresh`)을 다시 사용할 수 있어야 한다.

**Statement (EN):** After reset/cancel/failure, the state and progress indicator return to their initial values and the primary execution control (`board-refresh`) becomes usable again.

- Priority: high
- Rationale (KO): BF-1277 회귀 가드(상태 전이·재활성화)와 동일한 후조건을 v3에서도 보장한다.
- Rationale (EN): Guarantees in v3 the same postcondition as the BF-1277 regression guard (state transition & re-enable).

**Acceptance (Given/When/Then):**
1. Given 상태가 `error`, When 사용자가 `board-refresh`를 실행, Then 상태는 `loading`을 거쳐 `loaded`/`empty`/`error`로 재전이한다.
2. Given 상태가 `loading`, When 요청이 종료(성공/실패/취소), Then 진행 표시는 사라지고 `board-refresh`는 다시 활성화된다.

## REQ-3 — 접근성·반응형 준수 / Accessibility & responsive compliance

**Statement (KO):** 보드는 색상만으로 상태를 구분하지 않고 상태명을 텍스트·접근성 이름으로 노출하며, 320px/768px breakpoint에서 규정된 레이아웃으로 재배치된다.

**Statement (EN):** The board never distinguishes status by color alone; it exposes status names as text and accessible names, and re-lays out at the 320px/768px breakpoints per the frozen contract.

- Priority: high
- Rationale (KO): UiScreenContract의 accessibility·responsive 불변식은 designer/developer가 그대로 구현해야 한다.
- Rationale (EN): The accessibility/responsive invariants of the UiScreenContract must be implemented as-is by designer/developer.

**Acceptance (Given/When/Then):**
1. Given 임의 상태, When 화면 확인, Then 상태명이 화면 텍스트와 접근성 이름 양쪽에 존재한다.
2. Given 뷰포트 320px 이상, When 렌더링, Then `board-role-list`는 세로 스택이고 content overflow가 없다.
3. Given 뷰포트 768px 이상, When 렌더링, Then `board-role-list`는 다열 grid로 표시된다.
4. Given 키보드 사용, When Tab 이동, Then `board-refresh`에 도달하고 Enter/Space로 실행된다.

## sourceRefs
- ROLE_WORK_PACKET_V2 `plan` (packet_checksum sha256:49719968792e693297236a1545a406b40ef374a9881d2a1ea5a79d97f209114c)
- frozen_interfaces `ui-contract@v1`, `planning-contract@v1`
