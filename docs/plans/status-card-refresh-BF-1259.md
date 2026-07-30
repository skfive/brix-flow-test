# Planner Delivery Dossier — status-card 새로고침 UX (BF-1259)

> 본 문서는 planner가 확정하는 **단일 revision** Delivery Dossier입니다.
> designer(BF-1260)·developer(BF-1261)·tester(BF-1264)는 아래 확정 계약과 RoleWorkPacket만 소비하며,
> 다른 역할의 설계를 재해석하거나 파일·소유자·상태 모델을 재정의하지 않습니다.
>
> planning-contract@v1 · ui-contract@v1 는 이 문서에서 동결(frozen)됩니다.
> 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 문서는 이를 그대로 렌더링합니다.

- Revision: 1
- Execution profile: `implementation-strict`
- Primary module: `status-card`
- Primary repo: `backend`
- Language: 한국어/영문 병행 (KR primary, EN parenthetical)

---

## 1. Requirement (요구사항)

**REQ-1 — status-card 새로고침 상태 UX (Refresh status UX)**

- Statement: 사용자가 status-card에서 명시적 새로고침 control을 실행하면 idle → loading → success 또는 error 상태 전이가 화면 텍스트와 접근성 이름으로 노출되어야 한다. (User can trigger an explicit refresh and observe idle/loading/success/error transitions via visible text + accessible name.)
- Rationale: 색상만으로 상태를 구분하면 색각 이상 사용자와 스크린리더 사용자가 갱신 결과를 알 수 없다. 상태를 텍스트·접근성 이름으로 노출해 접근성과 명확성을 확보한다.
- Priority: high
- Acceptance:
  - idle/loading/success/error 각 상태에 고유한 화면 텍스트가 노출된다.
  - loading 중 주 실행 버튼은 `aria-busy="true"`와 `disabled`로 중복 클릭이 차단된다.
  - error 뒤 재시도(retry) control로 다시 loading 진입이 가능하다.
  - 초기화·취소·실패 뒤 상태와 진행 표시는 초기값으로 복귀하고 주 실행 control이 다시 활성화된다.
  - 320px 이상 폭에서 텍스트·버튼이 overflow 없이 배치된다.
- Source refs: BF-1259 PM 분해, ui-contract@v1 frozen blueprint

---

## 2. UseCase (사용 시나리오)

**UC-1 — 상태 새로고침 실행 (Trigger status refresh)**

- Actors: 최종 사용자(End user), status-card 클라이언트
- Preconditions:
  - status-card가 렌더되어 있고 `#status-card-refresh-button`이 idle 상태로 활성화되어 있다.
- Main flow:
  1. `{stepId: UC1-S1, order: 1}` 사용자가 `#status-card-refresh-button`을 클릭한다.
  2. `{stepId: UC1-S2, order: 2}` UI가 loading 상태로 전이하고 버튼에 `.status-card__refresh--loading`, `aria-busy="true"`, `disabled`를 적용한다.
  3. `{stepId: UC1-S3, order: 3}` `#status-card-status-text`(`aria-live="polite"`)가 loading 텍스트로 갱신된다.
  4. `{stepId: UC1-S4, order: 4}` 갱신이 성공하면 success 상태로 전이하고 `#status-card-last-updated`가 갱신 시각을 표시한다.
  5. `{stepId: UC1-S5, order: 5}` 버튼이 idle로 복귀해 다시 활성화된다.
- Alternate flows:
  - `{stepId: UC1-A1, order: 1}` (실패) 갱신이 실패하면 error 상태로 전이, `#status-card-status-text`에 `.status-card__status-text--error` 적용, `#status-card-retry-action`이 노출된다.
  - `{stepId: UC1-A2, order: 2}` (재시도) 사용자가 `#status-card-retry-action`을 실행하면 다시 loading 상태로 진입한다.
- Postconditions:
  - success 또는 error 처리 후 주 실행 control이 다시 사용 가능하며 상태 텍스트가 결과를 반영한다.

---

## 3. ProcessFlow (상태 전이 흐름)

- Nodes:
  - `{nodeId: N-idle, label: idle 대기, kind: start}`
  - `{nodeId: N-loading, label: loading 갱신 중, kind: action}`
  - `{nodeId: N-result, label: 성공/실패 판정, kind: decision}`
  - `{nodeId: N-success, label: success 갱신 완료, kind: end}`
  - `{nodeId: N-error, label: error 실패, kind: failure}`
- Transitions:
  - `{transitionId: T1, fromNodeId: N-idle, toNodeId: N-loading, guard: 새로고침 버튼 클릭}`
  - `{transitionId: T2, fromNodeId: N-loading, toNodeId: N-result}`
  - `{transitionId: T3, fromNodeId: N-result, toNodeId: N-success, guard: 갱신 성공}`
  - `{transitionId: T4, fromNodeId: N-result, toNodeId: N-error, guard: 갱신 실패}`
  - `{transitionId: T5, fromNodeId: N-error, toNodeId: N-loading, guard: 재시도 실행}`
  - `{transitionId: T6, fromNodeId: N-success, toNodeId: N-idle, guard: idle 복귀}`
- Failure recovery:
  - error 상태에서 `#status-card-retry-action`으로 loading 재진입.
  - 취소·실패 후 상태/진행 표시를 초기값으로 복귀하고 주 실행 control 재활성화.

---

## 4. ArchitectureModel (구성 요소)

- Components:
  - `{componentId: status-card-view, responsibility: index.html/styles.css 기반 상태 카드 마크업·스타일 렌더링}`
  - `{componentId: refresh-controller, responsibility: refresh.ts에서 상태 전이(idle/loading/success/error)와 DOM 갱신 제어}`
  - `{componentId: status-card-types, responsibility: index.d.ts에서 상태 모델과 public 인터페이스 타입 선언}`
- Dependencies:
  - `{dependencyId: D1, sourceComponentId: refresh-controller, targetComponentId: status-card-view, kind: control, label: 상태 전이에 따라 DOM/class 갱신, boundary: module}`
  - `{dependencyId: D2, sourceComponentId: refresh-controller, targetComponentId: status-card-types, kind: data, label: 상태 모델 타입 참조, boundary: module}`
- Constraints:
  - selector, 상태 모델, 디자인 토큰은 frozen ui-contract를 변경/재정의하지 않는다.
  - 모든 대상 파일은 additive 정책(기존 파일 보존, 신규 파일/역할 추가 금지)을 따른다.
- Decision refs: ui-contract@v1 frozen blueprint

---

## 5. UiScreenContract (화면 계약, 동결)

- interfaceRef: `IFC-STATUS-CARD-DESIGN`
- Files (frozen, owner):
  - `apps/status-card/index.html` → developer
  - `apps/status-card/src/index.d.ts` → developer
  - `apps/status-card/src/refresh.ts` → developer
  - `apps/status-card/styles.css` → developer
  - `docs/design/prototypes/status-card-refresh.html` → designer
  - `docs/design/status-card-refresh-BF-1259.md` → designer
- prototypePath: `docs/design/prototypes/status-card-refresh.html`
- DOM IDs:
  - `status-card-refresh-button` — 주 실행 control(새로고침 버튼)
  - `status-card-status-text` — 상태 텍스트 영역(`aria-live="polite"`)
  - `status-card-last-updated` — 마지막 갱신 시각 표시
  - `status-card-retry-action` — error 상태 재시도 control
- CSS classes:
  - `status-card__refresh` — 새로고침 버튼 기본
  - `status-card__refresh--loading` — loading 상태 버튼 modifier
  - `status-card__status-text` — 상태 텍스트 기본
  - `status-card__status-text--error` — error 상태 텍스트 modifier
- Routes: `/` (root-relative static, 별도 라우트 없음)
- States 와 화면 텍스트 (exact, 각 상태 고유 텍스트):
  - `idle` — "최근 상태를 확인하려면 새로고침하세요." (Refresh to check the latest status.)
  - `loading` — "상태를 불러오는 중…" (Loading status…)
  - `success` — "상태를 방금 갱신했습니다." (Status updated just now.) — `#status-card-last-updated`에 갱신 시각 표기
  - `error` — "상태를 불러오지 못했습니다. 다시 시도해 주세요." (Failed to load status. Please try again.) — `#status-card-retry-action` 노출
- Actions:
  - `refresh` — `#status-card-refresh-button` 클릭 시 idle→loading 전이
  - `retry` — `#status-card-retry-action` 실행 시 error→loading 전이
- designTokens (문자열, exact 값):
  - `--status-refresh-gap=12px`
  - `--status-loading-color=#2563eb`
  - `--status-success-color=#16a34a`
  - `--status-error-color=#dc2626`
- accessibility:
  - 새로고침 버튼은 `aria-label="상태 새로고침"`을 가진다.
  - 상태 텍스트 영역은 `aria-live="polite"`로 갱신 결과를 낭독한다.
  - 로딩 중 버튼은 `aria-busy="true"`와 `disabled`로 중복 클릭을 막는다.
  - 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- responsive:
  - 320px 이상 폭에서 상태 카드 텍스트와 버튼이 overflow 없이 배치된다(`--status-refresh-gap` 간격 유지).

---

## 6. DataModel (상태 모델)

- Entities:
  - `StatusCardState`
    - `{name: status, dataType: enum(idle|loading|success|error), primaryKey: true, foreignKey: false, unique: true, nullable: false}`
    - `{name: statusText, dataType: string, primaryKey: false, foreignKey: false, unique: false, nullable: false}`
    - `{name: lastUpdated, dataType: string, primaryKey: false, foreignKey: false, unique: false, nullable: true}`
    - `{name: retryAvailable, dataType: boolean, primaryKey: false, foreignKey: false, unique: false, nullable: false}`
- Invariants:
  - `status`는 idle/loading/success/error 4개 값만 허용한다.
  - `retryAvailable`는 `status=error`일 때만 true다.
  - `status=loading`일 때 주 실행 control은 비활성(`disabled`, `aria-busy="true"`)이다.
- Migration constraints:
  - 신규 클라이언트 상태 모델이며 서버 스키마/데이터 마이그레이션은 없다(additive, no migration).

---

## 7. InterfaceContract (동결 계약)

- interfaceKey: `status-card-refresh`
- interfaceKind: `design`
- availability: `blueprint-frozen`
- producerPacketId: `plan`
- consumerPacketIds: `design`, `develop`
- artifactPaths:
  - `apps/status-card/index.html`
  - `apps/status-card/src/index.d.ts`
  - `apps/status-card/src/refresh.ts`
  - `apps/status-card/styles.css`
  - `docs/design/prototypes/status-card-refresh.html`
  - `docs/design/status-card-refresh-BF-1259.md`
- invariants:
  - designer·developer는 selector, 상태 모델, 디자인 토큰을 변경/재정의하지 않는다.
  - 상태 표시는 색상 외에 idle/loading/success/error 각 화면 텍스트를 포함한다.
  - 모든 대상 파일은 additive 정책을 따른다(기존 내용 보존, 신규 파일/역할 추가 금지).
  - 초기화·취소·실패 뒤 상태와 진행 표시를 초기값으로 복귀하고 주 실행 control을 재활성화한다.
  - 파일 소유권과 상태 계약의 권위는 frozen blueprint이며 본 문서는 이를 재정의하지 않는다.
- versioning: `v1` (frozen at revision 1)

---

## 8. TestSpecification (검증 명세)

**TS-1 — 상태 전이 및 접근성 검증**

- requirementRefs: `REQ-1`
- level: `unit`
- preconditions:
  - status-card가 idle 상태로 렌더되어 있다.
- steps:
  - `{stepId: TS1-S1, order: 1}` 새로고침 버튼 클릭 → loading 텍스트/`aria-busy="true"`/`disabled` 적용 확인.
  - `{stepId: TS1-S2, order: 2}` 성공 응답 → success 텍스트와 `#status-card-last-updated` 갱신, 버튼 재활성화 확인.
  - `{stepId: TS1-S3, order: 3}` 실패 응답 → error 텍스트(`.status-card__status-text--error`)와 `#status-card-retry-action` 노출 확인.
  - `{stepId: TS1-S4, order: 4}` 재시도 실행 → loading 재진입 확인.
  - `{stepId: TS1-S5, order: 5}` 320px 폭에서 overflow 없음 및 상태별 화면 텍스트 고유성 확인.
- expectedResult: idle/loading/success/error 전이가 화면 텍스트·접근성 이름으로 노출되고, retry로 복구 가능하며, 320px에서 overflow가 없다.
- evidencePolicy: `build_result`, `test_result`
- 검증 명령: `npm test` (focused: `node --test tests/status-card-*.test.js`)

---

## 9. TraceLink (추적)

- `{sourceRef: REQ-1, targetRef: UC-1, relation: elaborated_by}`
- `{sourceRef: REQ-1, targetRef: UI-STATUS-CARD, relation: elaborated_by}`
- `{sourceRef: REQ-1, targetRef: DM-STATUS-CARD, relation: elaborated_by}`
- `{sourceRef: REQ-1, targetRef: IFC-STATUS-CARD-DESIGN, relation: elaborated_by}`
- `{sourceRef: REQ-1, targetRef: RWP-DESIGN, relation: allocated_to}`
- `{sourceRef: REQ-1, targetRef: RWP-DEVELOP, relation: allocated_to}`
- `{sourceRef: REQ-1, targetRef: RWP-TEST, relation: allocated_to}`
- `{sourceRef: REQ-1, targetRef: TS-1, relation: verified_by}`

---

## 10. RoleWorkPacket (하위 역할 계약)

### RWP-DESIGN — designer (BF-1260)
- assigneeRole: designer
- objective: frozen ui-contract를 시각 프로토타입과 design 명세로 렌더한다.
- acceptanceCriteria:
  - `docs/design/prototypes/status-card-refresh.html`에 idle/loading/success/error 상태와 디자인 토큰을 반영한 프로토타입 제공.
  - `docs/design/status-card-refresh-BF-1259.md`에 selector·상태 텍스트·토큰·접근성·반응형 계약을 그대로 서술.
- ownedPaths: `docs/design/prototypes/status-card-refresh.html`, `docs/design/status-card-refresh-BF-1259.md`
- deliverables:
  - `{path: docs/design/prototypes/status-card-refresh.html, description: 상태별 프로토타입}`
  - `{path: docs/design/status-card-refresh-BF-1259.md, description: design 명세}`
- dependencies: `plan`
- requirementRefs: `REQ-1`
- testSpecRefs: `TS-1`
- primaryRepo: `backend`
- requiredSkills: `*assigned`

### RWP-DEVELOP — developer (BF-1261)
- assigneeRole: developer
- objective: frozen selector·상태 모델·토큰을 additive로 구현한다.
- acceptanceCriteria:
  - `index.html`/`styles.css`/`refresh.ts`/`index.d.ts`에 frozen DOM ID·class·상태·토큰·접근성 속성 구현.
  - loading 중복 클릭 차단, error 재시도, 초기값 복귀 동작 구현.
- ownedPaths: `apps/status-card/index.html`, `apps/status-card/src/index.d.ts`, `apps/status-card/src/refresh.ts`, `apps/status-card/styles.css`
- deliverables:
  - `{path: apps/status-card/src/refresh.ts, description: 상태 전이 컨트롤러}`
  - `{path: apps/status-card/index.html, description: 상태 카드 마크업}`
  - `{path: apps/status-card/styles.css, description: 상태 스타일·토큰}`
  - `{path: apps/status-card/src/index.d.ts, description: 상태 모델 타입}`
- dependencies: `plan`, `design`
- requirementRefs: `REQ-1`
- testSpecRefs: `TS-1`
- primaryRepo: `backend`
- requiredSkills: `*assigned`

### RWP-TEST — tester (BF-1264)
- assigneeRole: tester
- objective: TS-1을 실제 실행해 상태 전이·접근성·반응형을 검증한다.
- acceptanceCriteria:
  - `npm test`(focused: `node --test tests/status-card-*.test.js`) 통과.
  - idle/loading/success/error 전이·retry 복구·320px overflow 부재 검증.
- ownedPaths: `tests/status-card/**`, `tests/status-card-*.test.*`, `apps/status-card/tests/**`
- deliverables:
  - `{path: tests/status-card-refresh.test.js, description: 상태 전이·접근성 테스트}`
- dependencies: `plan`, `develop`
- requirementRefs: `REQ-1`
- testSpecRefs: `TS-1`
- primaryRepo: `backend`
- requiredSkills: `*assigned`

---

## 11. 후조건 요약 (Handoff invariants)

- 본 dossier revision 1과 RoleWorkPacket만 소비한다. 다른 역할의 설계를 재해석하지 않는다.
- 파일 소유·상태 계약의 유일한 권위는 frozen blueprint다. 새 파일·역할·요구사항을 추가하지 않는다.
- selector/상태 모델/디자인 토큰은 변경·재정의 금지(additive only).
