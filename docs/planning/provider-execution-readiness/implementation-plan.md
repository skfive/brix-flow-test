# Provider 실행 준비 상태 — 실행 설계 및 UI 계약 동결 (BF-1367)
# Provider Execution Readiness — Implementation Plan & Frozen UI Contract (BF-1367)

> 작성자 / Author: planner (박기획) · Task: **BF-1367** · Epic: Provider Execution Readiness
> 상태 / Status: **동결(frozen)** — downstream(designer/developer/reviewer/tester)이 그대로 소비
> 실행 프로파일 / Execution profile: `implementation-strict`

이 문서는 PM 분해를 downstream이 그대로 소비할 수 있는 **실행 설계**와 **동결된 UI 계약**으로 구체화한다.
This document elaborates the PM breakdown into an execution design and a **frozen UI contract** that downstream roles consume verbatim.

- 새 schema · migration · 외부 의존성 없음. 기존 **Project Planning 조회 계약**과 **Provider 정책 조회 계약**만 **읽기전용**으로 참조한다.
  No new schema, migration, or external dependency. Only the existing **Project Planning read contract** and **Provider policy read contract** are referenced **read-only**.
- 인증 토큰 · Provider secret · 세션 cookie 값은 본 산출물 어디에도 노출하지 않는다.
  No auth token, Provider secret, or session cookie value is exposed anywhere in this artifact.
- 파일 소유권 · 상태 계약의 유일한 권위는 **frozen Execution Blueprint** 이며, 본 문서는 이를 재정의하지 않고 그대로 렌더링한다.
  The sole authority for file ownership and state contracts is the **frozen Execution Blueprint**; this document renders it without redefinition.

---

## 1. 요구사항 / Requirements

| ID | 우선순위 | 요구사항 (KO) | Requirement (EN) |
|----|----------|---------------|------------------|
| REQ-READINESS-STATUS | high | 실행 모드와 Provider의 준비 상태를 loading/ready/blocked/unset/error 다섯 상태로 판정하여 상태 카드에 표시한다. | Determine and display execution-mode & Provider readiness across five states: loading/ready/blocked/unset/error in the status card. |
| REQ-UI-CONTRACT-FROZEN | critical | 상태 카드의 파일·DOM id/class·상태 텍스트·design token·접근성·반응형 동작을 exact 값으로 동결한다. | Freeze the status card's files, DOM ids/classes, state text, design tokens, accessibility, and responsive behavior as exact values. |
| REQ-READONLY-CONSUMPTION | high | 기존 Project Planning / Provider 정책 조회 계약만 읽기전용으로 소비하고 새 schema·migration·외부 의존성을 추가하지 않는다. | Consume only the existing Project Planning / Provider policy read contracts read-only; add no new schema, migration, or external dependency. |
| REQ-SECURITY-NO-SECRET | high | 인증·Provider secret·세션 cookie를 산출물·화면·로그에 노출하지 않는다. | Never expose auth, Provider secret, or session cookie in artifacts, UI, or logs. |

### 판정 규칙 / Readiness determination rule
읽기전용으로 조회한 (실행 모드, Provider 정책) 값을 다음 규칙으로 상태에 매핑한다. UI는 이 규칙의 결과만 렌더링하며 판정 자체를 재구현하지 않는다.
The read-only (execution mode, Provider policy) values map to states by the rule below. The UI renders only the rule's output and does not re-implement determination.

1. 조회 진행 중 → `loading`
2. 조회 실패 → `error`
3. Provider가 선택되지 않음 → `unset`
4. Provider 선택됨 & 정책상 사용 가능 → `ready`
5. Provider 선택됨 & 정책상 차단(설정 필요) → `blocked`

---

## 2. 사용자 시나리오 / Use case — UC-VIEW-READINESS

- **Actor**: 프로젝트 실행을 준비하는 운영자 / Operator preparing project execution
- **선행조건 / Preconditions**: 운영자가 인증된 세션으로 Planning 화면에 접근했고, 실행 모드/Provider 정책 조회 계약이 읽기전용으로 사용 가능하다. / Operator has an authenticated session on the Planning screen; mode/Provider policy read contracts are available read-only.

### 주 흐름 / Main flow
1. 운영자가 Planning 화면을 연다. 상태 카드가 `loading`('확인 중…')으로 마운트된다.
2. 실행 모드와 Provider 정책을 읽기전용으로 조회한다.
3. §1 판정 규칙에 따라 상태를 계산한다.
4. 카드에 mode / provider / status 를 렌더링하고 `readiness-status`가 aria-live=polite로 변화를 알린다.

### 대안·실패 흐름 / Alternate & failure flows
- **AF-UNSET**: Provider 미선택 → `unset`('설정되지 않음') 표시, `readiness-settings-link`로 설정 유도.
- **AF-BLOCKED**: 정책상 차단 → `blocked`('차단됨 — 설정 필요') 표시, `readiness-settings-link` 노출.
- **AF-ERROR**: 조회 실패 → `error`('상태를 불러오지 못했습니다') 표시, `readiness-retry` 노출. 재시도 시 `loading`으로 복귀.

### 후행조건 / Postconditions
- 화면에는 항상 정확히 하나의 상태가 표시된다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시가 초기값으로 되돌아가고 주 실행 control(설정 링크/재시도)을 다시 사용할 수 있다.

---

## 3. Acceptance Criteria (Given/When/Then)

- **AC-1 (ready)**: *Given* Provider가 선택되고 정책상 사용 가능, *When* 카드가 조회를 완료, *Then* `readiness-status`가 `readiness-card__status--ready` class와 '준비됨' 텍스트, ready 색상으로 표시된다.
- **AC-2 (blocked)**: *Given* Provider가 정책상 차단, *When* 조회 완료, *Then* `readiness-card__status--blocked` class와 '차단됨 — 설정 필요' 텍스트, blocked 색상, `readiness-settings-link` 노출.
- **AC-3 (unset)**: *Given* Provider 미선택, *When* 조회 완료, *Then* `readiness-card__status--unset` class와 '설정되지 않음' 텍스트, `readiness-settings-link` 노출.
- **AC-4 (loading)**: *Given* 조회 진행 중, *When* 카드 마운트, *Then* '확인 중…' 텍스트가 표시된다.
- **AC-5 (error)**: *Given* 조회 실패, *When* 응답 오류, *Then* '상태를 불러오지 못했습니다' 텍스트와 `readiness-retry`가 노출되고 재시도 시 `loading`으로 복귀한다.
- **AC-6 (a11y)**: *Given* 임의 상태, *When* 스크린리더로 접근, *Then* `readiness-card`는 role=region + aria-label='실행 모드 및 Provider 준비 상태', `readiness-status`는 aria-live=polite, 상태는 색상만이 아니라 상태명 텍스트/접근성 이름으로 노출된다.
- **AC-7 (responsive)**: *Given* viewport 320px 이상, *When* 카드 렌더, *Then* content overflow가 없고, 480px 미만에서 mode/provider/status가 세로로 stack된다.
- **AC-8 (security)**: *Given* 산출물/화면/로그, *When* 검토, *Then* 인증·Provider secret·세션 cookie 값이 어디에도 노출되지 않는다.

### Edge case · 실패 케이스 / Edge & failure cases
- 조회가 지연되어도 카드는 `loading`을 유지하며 빈 화면/깨진 레이아웃을 만들지 않는다.
- `error` 재시도 도중 재차 실패하면 다시 `error`로 남고 `readiness-retry`가 계속 유효하다.
- Provider 이름/모드 문자열이 길어도 320px에서 overflow 없이 처리한다(줄바꿈/축약은 developer 구현 범위, DOM 계약은 불변).
- 취소(화면 이탈 후 재진입) 시 상태는 초기값 `loading`부터 재시작한다.

---

## 4. 아키텍처 모델 / Architecture model — ARCH-READINESS (read-only)

| Component | 책임 / Responsibility |
|-----------|----------------------|
| `readiness-card-view` | 상태 카드 DOM 렌더링. frozen selector/token/텍스트만 사용. |
| `readiness-state-resolver` | §1 판정 규칙으로 (mode, policy) → state 매핑. |
| `planning-read-contract` (external, read-only) | 기존 Project Planning 조회 계약. 읽기전용 소비. |
| `provider-policy-read-contract` (external, read-only) | 기존 Provider 정책 조회 계약. 읽기전용 소비. |

- 제약 / Constraints: 새 schema·migration·외부 의존성 금지. 인증/secret/cookie 비노출. DOM id·css class·상태 모델·token 값 변경 금지.
- 데이터 흐름은 조회(read) 전용이며 쓰기·mutation 경로를 신설하지 않는다.

---

## 5. 동결된 UI 계약 / Frozen UI contract — UI-READINESS-CARD

> 아래 값은 **동결**이다. designer/developer는 DOM id, css class, 상태 모델, design token 값을 **변경·재정의하지 않는다**. 모든 대상 파일은 **additive** 정책이다.
> The values below are **frozen**. designer/developer must not change/redefine DOM ids, css classes, the state model, or token values. All target files are **additive**.

### 5.1 파일과 소유자 / Files & owners
| 파일 / File | 소유자 / Owner | 정책 / Policy |
|-------------|----------------|----------------|
| `docs/design/provider-readiness-BF-1364.md` | designer | additive |
| `provider-readiness/index.html` | developer | additive |
| `provider-readiness/src/readiness-card.js` | developer | additive |
| `provider-readiness/styles.css` | developer | additive |

### 5.2 DOM id
`readiness-card`, `readiness-mode`, `readiness-provider`, `readiness-status`, `readiness-settings-link`, `readiness-retry`

### 5.3 CSS class
`readiness-card`, `readiness-card__mode`, `readiness-card__provider`, `readiness-card__status`, `readiness-card__status--ready`, `readiness-card__status--blocked`, `readiness-card__status--unset`

### 5.4 상태 모델 / State model
| 상태 / State | 화면 텍스트 / Screen text | 표현 / Rendering |
|--------------|---------------------------|------------------|
| `loading` | `확인 중…` | 진행 표시 |
| `ready` | `준비됨` | ready 색상(`--color-status-ready`) + `readiness-card__status--ready` |
| `blocked` | `차단됨 — 설정 필요` | blocked 색상(`--color-status-blocked`) + `readiness-card__status--blocked`, `readiness-settings-link` 노출 |
| `unset` | `설정되지 않음` | `readiness-card__status--unset`, `readiness-settings-link` 노출 |
| `error` | `상태를 불러오지 못했습니다` | `readiness-retry` 노출, 재시도 시 `loading` 복귀 |

### 5.5 Design token (exact 값 / exact values)
| Token | 값 / Value |
|-------|------------|
| `--color-status-ready` | `#16a34a` |
| `--color-status-blocked` | `#dc2626` |
| `--color-status-unset` | `#6b7280` |
| `--space-card-gap` | `12px` |
| `--radius-card` | `8px` |

### 5.6 접근성 / Accessibility
- `readiness-card` 는 role=region 과 aria-label='실행 모드 및 Provider 준비 상태' 를 가진다.
- `readiness-status` 는 aria-live=polite 로 상태 변화를 알린다.
- `readiness-settings-link` 와 `readiness-retry` 는 명시적 aria-label 을 가지며 키보드 focus 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.7 반응형 / Responsive
- 320px 이상에서 content overflow 가 발생하지 않는다.
- 480px 미만에서 mode/provider/status 항목이 세로로 stack 된다.

### 5.8 Routes
- 상태 카드는 프로젝트 Planning 화면에 배치된다: `/projects/PROJECT-ID/planning`

---

## 6. 인터페이스 동결 / Frozen interfaces

| interfaceKey | kind | availability | producer → consumers | 요약 / Summary |
|--------------|------|--------------|----------------------|----------------|
| `planning-contract` | data | runtime-artifact | plan → design, develop | planner가 동결한 실행 설계·판정 규칙·읽기전용 소비 계약. |
| `ui-contract` | design | blueprint-frozen | plan → design, develop | planner가 동결하고 designer/developer가 그대로 구현하는 상태 카드 UI 계약. |

- `planning-contract@v1` checksum: `sha256:ed401e48d897846fdedd87604ecfc2e6a5344a8f772cb52252e2ed6ac3a620cc` — 산출물: `docs/planning/provider-execution-readiness/implementation-plan.md`
  - 불변식 / Invariant: designer/developer는 동결된 실행 설계와 상태 판정 규칙만 소비하며 새 schema·migration·외부 의존성을 추가하지 않는다.
- `ui-contract@v1` checksum: `sha256:a8e9cecff311bc81b0cfbe5948a2feb9d3d3e668fc2cbb4b95ea5f65617ab1a4` — 산출물: §5.1의 네 파일
  - 불변식 / Invariant: designer/developer는 DOM id, css class, 상태 모델, design token 값을 변경하거나 재정의하지 않는다. 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.

---

## 7. 테스트 사양 / Test specifications

| ID | level | 검증 대상 / Verifies | evidence |
|----|-------|----------------------|----------|
| TEST-READINESS-STATES | integration | AC-1~AC-5: 5개 상태의 class·텍스트·색상·control 노출 | build_result, test_result |
| TEST-READINESS-A11Y | integration | AC-6·AC-7·AC-8: role/aria-label/aria-live, 반응형 stack/overflow, secret 비노출 | build_result, test_result |

- 두 사양 모두 tester(PKT-TEST)가 실제 `test_result`로 검증한다. developer(PKT-DEVELOP)·designer(PKT-DESIGN)는 `build_result` provenance로 head SHA를 보존한다.

---

## 8. 역할 작업 패킷 / Role work packets (frozen coverage)

| packetKey | role | blockedBy | ownedPaths | 산출물 요지 / Deliverable |
|-----------|------|-----------|------------|--------------------------|
| `plan` | planner | — | `docs/planning/provider-execution-readiness/**` | 본 실행 설계·인터페이스 동결·RTM |
| `design` | designer | plan | `docs/design/provider-readiness-BF-1364.md` | frozen UI 계약을 시각 명세로 렌더(additive) |
| `develop` | developer | plan | `provider-readiness/**` | index.html / readiness-card.js / styles.css 구현(additive) |
| `review` | reviewer | design, develop | (review) | UI 계약 준수·보안 비노출 검토 |
| `test` | tester | review | (test) | TEST-READINESS-STATES·A11Y 실제 결과 검증 |

- design/develop은 동결된 UI 계약과 판정 규칙만 소비하며 파일·소유자·상태 계약을 재정의하지 않는다.

---

## 9. 요구사항 추적 매트릭스 / Requirements Traceability Matrix (RTM)

| Requirement | 상세화 / Elaborated (UseCase·Arch) | 실현 / Realized (UI·Interface) | 검증 / Verified (Test) | 할당 / Allocated (Packet) |
|-------------|-----------------------------------|-------------------------------|------------------------|---------------------------|
| REQ-READINESS-STATUS | UC-VIEW-READINESS | — | TEST-READINESS-STATES | plan, develop, test |
| REQ-UI-CONTRACT-FROZEN | ARCH-READINESS | UI-READINESS-CARD, IF-UI-CONTRACT | TEST-READINESS-A11Y | plan, design, develop, review |
| REQ-READONLY-CONSUMPTION | — | IF-PLANNING-CONTRACT | — | plan, develop |
| REQ-SECURITY-NO-SECRET | — | — | (TEST-READINESS-A11Y AC-8) | plan, review |

---

## 10. 범위 밖 / Non-goals
- 디자인 시안 자체(색·레이아웃 시각화)는 designer 영역. 본 문서는 계약 값만 동결한다.
- 코드 구현은 developer 영역. 본 문서는 selector/token/텍스트만 고정한다.
- 새 API·데이터 모델·migration 신설 없음(읽기전용 소비만).
