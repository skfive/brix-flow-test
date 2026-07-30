# Phase21 전달 상태 배지 — 구현 설계 문서 (BF-1319)

- Jira: BF-1319 (planner) — 전달 상태 배지 구현 설계 및 RTM 작성
- Epic 형제 Task: BF-1317(designer), BF-1318(developer), BF-1321(tester)
- 대상 저장소: backend (vanilla-static / ESM / npm)
- 계약 권위: 본 문서는 frozen Execution Blueprint의 `ui-contract@v1` / `planning-contract@v1`을 그대로 렌더링한다. **파일 소유권·상태·selector·token은 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.**

> 실행 규칙: designer·developer는 본 실행 설계와 RTM, 그리고 아래 UI 계약을 그대로 따른다. selector와 token을 변경하거나 재정의하지 않으며, 계약 밖의 새 파일·역할·요구를 추가하지 않는다.

---

## 1. 문제 정의 (Problem Statement)

### 현재 상황
전달(Delivery) 파이프라인의 상태가 화면에 노출되지 않아, 사용자는 마지막 전달이 정상인지 오류인지, 언제 갱신되었는지를 별도 경로로 확인해야 한다.

### 사용자 불편(Pain Point)
- 전달 상태(정상/오류)를 한눈에 파악할 수 없다.
- 상태가 언제 갱신되었는지(마지막 갱신 시각)를 알 수 없다.
- 상태를 다시 확인하려면 페이지 전체를 새로고침해야 한다.

### 비즈니스 영향
- 오류 상태 인지가 늦어 대응이 지연된다.
- 색상만으로 상태를 구분하면 접근성(색약·스크린리더) 사용자가 상태를 놓친다.

---

## 2. 제안 솔루션 (Proposed Solution)

`전달 상태 배지(delivery-status badge)` 컴포넌트를 추가한다. 배지는 4개 상태(idle/loading/success/error)를 화면 텍스트 + 색상으로 동시에 표현하고, 마지막 갱신 시각과 새로고침 control을 함께 제공한다. 새로고침 control은 전달 상태 API를 재조회한다.

### 핵심 사용자 스토리
- 사용자로서, 전달 상태가 정상인지 오류인지 배지로 즉시 확인하고 싶다.
- 사용자로서, 상태가 마지막으로 갱신된 시각을 보고 싶다.
- 사용자로서, 페이지 전체 새로고침 없이 상태만 다시 불러오고 싶다.
- 스크린리더 사용자로서, 상태 변화를 음성으로 안내받고 싶다.

### 성공 지표
- 4개 상태 전이(idle→loading→success/error)가 화면 텍스트와 접근성 이름으로 모두 노출된다.
- 320px 뷰포트에서 content overflow 없이 배지와 마지막 갱신 시각이 표시된다.

---

## 3. UI 계약 (Frozen — ui-contract@v1)

> availability: **blueprint-frozen** · producer: `plan` · consumer: `design`, `develop`
> invariant: designer와 developer는 selector와 token을 변경하거나 재정의하지 않는다.

### 3.1 파일 및 소유자 (그대로 준수, 새 파일 추가 금지)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/phase21-delivery-status-BF-1316.md` | designer | additive |
| `docs/design/phase21-delivery-status-mockup.html` | designer | additive |
| `phase21-validation/api/delivery-status.json` | canonical work packet owner | additive |
| `phase21-validation/index.html` | developer | additive |
| `phase21-validation/src/delivery-status.js` | developer | additive |
| `phase21-validation/styles.css` | developer | additive |
| `phase21-validation/tests/delivery-status.test.js` | developer | additive |

- 본 planner 산출물은 `docs/plans/phase21-delivery-status-BF-1316.md` 한 개만 소유·작성한다 (owned_paths: `docs/plans/**`).
- 모든 계약 파일은 additive 정책: 기존 파일이 있으면 계약 요소를 추가하고, selector/token/상태 계약을 재정의하지 않는다.

### 3.2 DOM ID (exact)

| DOM ID | 역할 |
| --- | --- |
| `delivery-status-root` | 컴포넌트 루트 컨테이너 |
| `delivery-status-badge` | 상태 배지 (상태 텍스트 표시) |
| `delivery-status-updated-at` | 마지막 갱신 시각 표시 |
| `delivery-status-refresh` | 새로고침 control |

### 3.3 CSS class (exact)

| class | 용도 |
| --- | --- |
| `delivery-status` | 루트 레이아웃 |
| `delivery-status__badge` | 배지 기본 |
| `delivery-status__badge--success` | success 상태 modifier |
| `delivery-status__badge--error` | error 상태 modifier |
| `delivery-status__updated-at` | 마지막 갱신 시각 |
| `delivery-status__refresh` | 새로고침 control |

### 3.4 상태 (states, exact 4개)

| 상태 | 화면 텍스트 | 배지 class | 색상 token |
| --- | --- | --- | --- |
| `idle` | 대기 중 | `delivery-status__badge` | `--color-status-neutral` (#64748b) |
| `loading` | 불러오는 중 | `delivery-status__badge` | `--color-status-neutral` (#64748b) |
| `success` | 정상 | `delivery-status__badge delivery-status__badge--success` | `--color-status-success` (#16a34a) |
| `error` | 오류 | `delivery-status__badge delivery-status__badge--error` | `--color-status-error` (#dc2626) |

- 상태는 **색상만으로 구분하지 않는다.** 상태명(대기 중/불러오는 중/정상/오류)을 화면 텍스트와 접근성 이름으로 함께 노출한다.

### 3.5 디자인 토큰 (exact, 재정의 금지)

| 토큰 | 값 |
| --- | --- |
| `--color-status-success` | `#16a34a` |
| `--color-status-error` | `#dc2626` |
| `--color-status-neutral` | `#64748b` |
| `--space-badge-gap` | `8px` |

### 3.6 접근성 (accessibility)

1. 배지는 `aria-live="polite"`로 상태 변화를 스크린리더에 알린다.
2. 새로고침 control은 `aria-label="전달 상태 새로고침"`을 가진다.
3. 각 상태는 색상 외 화면 텍스트(대기 중/불러오는 중/정상/오류)를 함께 표시한다.
4. 새로고침 control은 키보드 Enter/Space로 실행 가능하다.
5. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.7 반응형 (responsive)

- 320px 이상에서 배지와 마지막 갱신 시각이 content overflow 없이 표시된다.

### 3.8 데이터 계약 (delivery-status.json)

- 파일: `phase21-validation/api/delivery-status.json` (mock API 응답)
- 스키마(예시):

```json
{
  "status": "success",
  "updatedAt": "2026-07-30T09:00:00Z"
}
```

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | string | `idle` \| `loading` \| `success` \| `error` 중 하나 |
| `updatedAt` | string(ISO-8601) | 마지막 갱신 시각. `delivery-status-updated-at`에 표시 |

- `delivery-status.js`는 이 JSON을 `fetch`로 조회하여 배지 상태와 갱신 시각을 렌더링한다.

---

## 4. 사용자 시나리오 & AC (Given/When/Then)

### AC-1 초기 렌더 (idle)
- **Given** 페이지가 처음 로드되고 아직 상태 조회가 시작되지 않았을 때
- **When** `delivery-status-root`가 렌더되면
- **Then** `delivery-status-badge`에 화면 텍스트 "대기 중"이 표시되고, 배지는 neutral 색상(`--color-status-neutral`)이며, `delivery-status-updated-at`은 갱신 시각 미확정 상태를 표시한다.

### AC-2 조회 진행 (loading)
- **Given** 상태 조회가 시작되었을 때
- **When** `delivery-status.json` 요청이 진행 중이면
- **Then** 배지에 "불러오는 중"이 표시되고 neutral 색상을 유지하며, 새로고침 control은 중복 실행되지 않도록 진행 표시를 노출한다.

### AC-3 조회 성공 (success)
- **Given** 조회 응답 `status: "success"`를 받았을 때
- **When** 렌더가 완료되면
- **Then** 배지는 `delivery-status__badge--success`가 적용되어 success 색상(#16a34a)과 화면 텍스트 "정상"을 표시하고, `delivery-status-updated-at`에 응답 `updatedAt`이 표시된다. `aria-live="polite"`로 변화가 안내된다.

### AC-4 조회 실패 (error)
- **Given** 조회 응답 `status: "error"` 또는 요청 실패일 때
- **When** 렌더가 완료되면
- **Then** 배지는 `delivery-status__badge--error`가 적용되어 error 색상(#dc2626)과 화면 텍스트 "오류"를 표시하고, `aria-live="polite"`로 오류가 안내된다.

### AC-5 새로고침 재조회
- **Given** 어떤 상태든 렌더된 이후
- **When** 사용자가 `delivery-status-refresh`를 클릭하거나 키보드 Enter/Space로 실행하면
- **Then** loading으로 전이 후 재조회하여 success/error로 갱신된다. control은 `aria-label="전달 상태 새로고침"`을 가진다.

### AC-6 색상 비의존 접근성
- **Given** 임의 상태
- **When** 상태를 색상 없이(스크린리더/색약) 확인할 때
- **Then** 상태명이 화면 텍스트와 접근성 이름으로 모두 노출되어 색상만으로 구분하지 않아도 상태를 식별할 수 있다.

### AC-7 반응형
- **Given** 뷰포트 폭이 320px일 때
- **When** 컴포넌트가 렌더되면
- **Then** 배지와 마지막 갱신 시각이 content overflow 없이 표시된다.

---

## 5. Edge Case & 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E1 | `delivery-status.json` fetch 실패(네트워크/404) | error 상태로 전이, "오류" 텍스트 + error 색상, aria-live 안내 |
| E2 | 응답 JSON의 `status`가 계약 밖 값 | idle 또는 error 등 안전한 기본 상태로 폴백, 상태명 텍스트 유지 |
| E3 | `updatedAt` 누락/파싱 불가 | 갱신 시각 미표시 폴백(빈/대체 텍스트), 배지 상태는 정상 처리 |
| E4 | loading 중 새로고침 중복 클릭 | 중복 재조회 방지, 진행 표시 유지 |
| E5 | 초기화·취소·실패 이후 | 상태와 진행 표시를 초기값으로 되돌리고 새로고침 control을 다시 사용할 수 있어야 한다 (frozen invariant) |
| E6 | 320px 미만 극단 폭 | 최소 320px 계약 하한을 기준으로 하며, 그 이상에서 overflow 없음을 보장 |

---

## 6. Planner Dossier

- **보증 수준(profile)**: `high-assurance` — UI + data + interface 변경을 포함하며 접근성/반응형/데이터 계약을 동결한다.
- **실행 범위(executionProfile)**: `implementation-strict` (frozen Blueprint 권위값).
- **변경 종류(changeKinds)**: `ui`, `data`, `interface`.
- **리스크 트리거**: 없음(auth/tenant/secret/billing/destructive-data/migration/workflow-runtime-critical 해당 없음).
- **핵심 결정 사항**:
  1. selector/token/상태 계약은 frozen blueprint가 유일 권위 — designer/developer는 재정의 금지.
  2. 상태는 반드시 색상 + 화면 텍스트 + 접근성 이름 3중으로 노출(색상 비의존).
  3. 새로고침은 페이지 전체 reload가 아니라 `delivery-status.json` 재조회.
  4. 초기화·취소·실패 후 상태/진행 표시는 초기값 복귀, 주 control 재사용 가능.
- **Handoff 계약**:
  - `planning-contract@v1` (runtime-artifact): 본 문서 → designer/develop.
  - `ui-contract@v1` (blueprint-frozen): 본 문서에 렌더된 UI 계약 → designer/develop.

### Execution Blueprint Packet 커버리지

| packet | role | Jira |
| --- | --- | --- |
| plan | planner | BF-1319 (본 Task) |
| design | designer | BF-1317 |
| develop | developer | BF-1318 |
| test | tester | BF-1321 |
| review | reviewer | (Blueprint 지정) |

---

## 7. 요구사항 추적 매트릭스 (RTM)

| Req ID | 요구사항 | AC | 검증 산출물 (파일) | 테스트 |
| --- | --- | --- | --- | --- |
| REQ-DS-1 | 4개 상태(idle/loading/success/error)를 화면 텍스트+색상으로 표현 | AC-1~AC-4, AC-6 | `phase21-validation/src/delivery-status.js`, `phase21-validation/styles.css`, `phase21-validation/index.html` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-2 | exact DOM ID/class/token 계약 준수 | AC-1~AC-5 | `docs/design/phase21-delivery-status-BF-1316.md`, `phase21-validation/index.html`, `phase21-validation/styles.css` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-3 | 마지막 갱신 시각 표시 | AC-3 | `phase21-validation/api/delivery-status.json`, `phase21-validation/src/delivery-status.js` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-4 | 새로고침 control로 재조회(키보드 Enter/Space 포함) | AC-5 | `phase21-validation/src/delivery-status.js`, `phase21-validation/index.html` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-5 | 접근성: aria-live, aria-label, 색상 비의존 상태명 | AC-3, AC-4, AC-6 | `phase21-validation/index.html`, `phase21-validation/src/delivery-status.js` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-6 | 반응형 320px+ content overflow 없음 | AC-7 | `phase21-validation/styles.css`, `docs/design/phase21-delivery-status-mockup.html` | `phase21-validation/tests/delivery-status.test.js` |
| REQ-DS-7 | 초기화·취소·실패 후 상태/진행 초기값 복귀, control 재사용 | AC-5, E5 | `phase21-validation/src/delivery-status.js` | `phase21-validation/tests/delivery-status.test.js` |

- 검증 증거 정책: developer/designer packet의 실행 증거는 자동 생산되는 `build_result`를 필수로 하고, tester packet(BF-1321)은 `test_result`를 포함한다.

---

## 8. 산출물 경로 (Deliverable Paths)

- 본 문서: `docs/plans/phase21-delivery-status-BF-1316.md` (planner 소유)
- 후속 designer 산출물: `docs/design/phase21-delivery-status-BF-1316.md`, `docs/design/phase21-delivery-status-mockup.html`
- 후속 developer 산출물: `phase21-validation/index.html`, `phase21-validation/src/delivery-status.js`, `phase21-validation/styles.css`, `phase21-validation/tests/delivery-status.test.js`
- 데이터: `phase21-validation/api/delivery-status.json`

## 9. 종료 조건 (Definition of Done — planner)

1. 파일명·DOM ID/class·상태·token/CSS 변수·접근성·반응형·산출물 경로가 exact UI 계약으로 본 문서에 명시됨. ✅
2. Planner Dossier와 RTM이 포함되고 각 수용 기준이 산출물에 매핑됨. ✅
3. frozen blueprint의 파일·소유자·상태·후조건을 그대로 설명하며 새 파일/역할을 추가하지 않음. ✅
