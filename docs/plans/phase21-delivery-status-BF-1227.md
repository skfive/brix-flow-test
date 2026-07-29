# Phase 21 · 전달 상태 배지 실행 설계 (BF-1227)

> 본 문서는 planner(박기획)가 동결한 **frozen blueprint의 실행 설계**입니다.
> designer(BF-1228)와 developer(BF-1229)는 아래 계약을 그대로 구현하며,
> selector·token·상태 계약을 변경하거나 재정의하지 않습니다.
> 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.

- Jira: BF-1230 (planner) / 산출물 참조 키: BF-1227
- Epic 형제 Task: BF-1228 (designer) · BF-1229 (developer) · BF-1232 (tester)
- 대상 저장소: backend
- producer_policy: 본 문서는 frozen 계약을 planning artifact로 렌더링만 합니다. 새 파일·역할·요구사항을 추가하지 않습니다.

---

## 1. 목적 (Objective)

PM 분해를 구현 가능한 실행 계획과 handoff 계약으로 구체화하고, 전달 상태 배지 UI 인터페이스를 동결합니다.
`delivery-status` API 계약과 배지 UI 계약을 고정하여 designer/developer가 따를 단일 실행 설계 문서를 제공합니다.

---

## 2. 사용자 시나리오 (User Scenario)

- 운영자는 Phase 21 검증 화면에서 **전달 상태 배지**를 통해 현재 전달(delivery) 상태와 마지막 갱신 시각을 확인한다.
- 화면 진입 시 배지는 `loading` 상태로 표시되며, `GET /api/phase21-validation/delivery-status` 응답에 따라 `success` / `error` / `forbidden` 상태로 전이한다.
- 운영자는 **새로고침 control**로 최신 전달 상태를 다시 조회할 수 있다.
- 스크린리더 사용자는 `aria-live` 알림으로 상태 변경을 인지하며, 색상에만 의존하지 않고 상태명 텍스트로 상태를 구분한다.

---

## 3. 파일 소유권 계약 (File Ownership — frozen)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/delivery-status-badge-BF-1227.md` | designer | additive |
| `src/features/delivery-status-badge/badge.ts` | developer | additive |
| `src/features/delivery-status-badge/index.d.ts` | developer | additive |
| `src/features/delivery-status-badge/badge.test.ts` | developer | additive |
| `src/routes/phase21-validation.ts` | developer | additive |

- `additive`: 기존 계약을 재정의·삭제하지 않고 추가만 허용합니다.
- 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며, 본 planner 문서는 이를 재정의하지 않습니다.

---

## 4. UI 인터페이스 계약 (ui-contract@v1 — frozen)

### 4.1 DOM 식별자

| 종류 | 값 |
| --- | --- |
| DOM ID | `delivery-status-badge`, `delivery-status-refresh` |
| CSS class | `delivery-status`, `delivery-status__label`, `delivery-status__timestamp` |

- designer와 developer는 위 selector와 token을 변경하거나 재정의하지 않습니다.

### 4.2 상태 모델 및 화면 텍스트 (states)

| 상태 | 화면 텍스트 | 새로고침 control | 비고 |
| --- | --- | --- | --- |
| `loading` | `전달 상태 확인 중…` | **비활성** | 조회 진행 중 |
| `success` | 전달 상태 라벨 + ISO 8601 갱신 시각 텍스트 | 재활성 | 정상 응답 |
| `error` | `전달 상태를 불러오지 못했습니다` | 재활성 | 이전 상태 복원 후 재활성 |
| `forbidden` | `전달 상태 접근 권한이 없습니다` | 재활성 | 권한 거부 |

- **초기화·취소·실패 후조건**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고, 주 실행 control(새로고침)을 다시 사용할 수 있어야 합니다. `error` 상태는 이전 상태를 복원한 뒤 새로고침 control을 재활성화합니다.

### 4.3 디자인 토큰 (design_tokens)

| 토큰 | 값 |
| --- | --- |
| `--color-status-success` | `#16a34a` |
| `--color-status-error` | `#dc2626` |
| `--space-badge-gap` | `8px` |

### 4.4 접근성 (accessibility)

- 배지 root(`#delivery-status-badge`)는 `aria-live="polite"`로 상태 변경을 스크린리더에 알린다.
- 새로고침 control(`#delivery-status-refresh`)은 명시적 `aria-label="전달 상태 새로고침"`을 가지며 **Enter/Space**로 활성화된다.
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.5 반응형 (responsive)

- 320px 이상에서 라벨(`.delivery-status__label`)과 갱신 시각 텍스트(`.delivery-status__timestamp`)가 overflow 없이 줄바꿈된다.

---

## 5. API 계약 (delivery-status endpoint — frozen)

### 5.1 엔드포인트

```
GET /api/phase21-validation/delivery-status
```

라우트 소유: `src/routes/phase21-validation.ts` (developer, additive)

### 5.2 성공 응답 (200 → 배지 `success`)

- 전달 상태 라벨과 **ISO 8601 갱신 시각 필드**를 포함한다.

```json
{
  "status": "delivered",
  "label": "전달 완료",
  "updatedAt": "2026-07-28T12:00:00Z"
}
```

- `updatedAt`은 ISO 8601 형식으로 고정하며, 배지 `.delivery-status__timestamp`에 갱신 시각 텍스트로 렌더링한다.

### 5.3 실패 응답 (조회 실패 → 배지 `error`)

```json
{
  "error": "delivery_status_unavailable",
  "message": "전달 상태를 불러오지 못했습니다"
}
```

- 클라이언트는 이전 상태를 복원한 뒤 새로고침 control을 재활성화한다.

### 5.4 권한 거부 응답 (403 → 배지 `forbidden`)

```json
{
  "error": "forbidden",
  "message": "전달 상태 접근 권한이 없습니다"
}
```

- 배지는 `forbidden` 상태 텍스트를 표시하고 새로고침 control을 재활성화한다.

---

## 6. Acceptance Criteria (Given/When/Then)

### AC-1 · 로딩 초기 상태
- **Given** 운영자가 Phase 21 검증 화면에 진입하고 `delivery-status` 응답이 아직 도착하지 않았을 때
- **When** 배지가 최초 렌더링되면
- **Then** `#delivery-status-badge`에 `전달 상태 확인 중…` 텍스트가 표시되고 `#delivery-status-refresh`는 비활성 상태여야 한다.

### AC-2 · 성공 응답 렌더링
- **Given** `GET /api/phase21-validation/delivery-status`가 `status`/`label`/`updatedAt(ISO 8601)`를 반환할 때
- **When** 응답이 도착하면
- **Then** `.delivery-status__label`에 전달 상태 라벨, `.delivery-status__timestamp`에 ISO 8601 갱신 시각 텍스트가 표시되고 새로고침 control이 재활성된다.

### AC-3 · 조회 실패 처리
- **Given** API가 실패 응답을 반환할 때
- **When** 클라이언트가 이를 수신하면
- **Then** `전달 상태를 불러오지 못했습니다` 텍스트를 표시하고, 이전 상태를 복원한 뒤 새로고침 control을 재활성화한다.

### AC-4 · 권한 거부 처리
- **Given** API가 403 권한 거부 응답을 반환할 때
- **When** 클라이언트가 이를 수신하면
- **Then** `전달 상태 접근 권한이 없습니다` 텍스트를 표시하고 새로고침 control을 재활성화한다.

### AC-5 · 새로고침 재조회
- **Given** 배지가 `success`/`error`/`forbidden` 상태일 때
- **When** 운영자가 `#delivery-status-refresh`를 클릭하거나 Enter/Space로 활성화하면
- **Then** 배지는 `loading` 상태(텍스트 `전달 상태 확인 중…`, control 비활성)로 전이한 뒤 응답에 따라 상태를 갱신한다.

### AC-6 · 접근성
- **Given** 배지 root가 렌더링될 때
- **When** 상태가 전이되면
- **Then** `aria-live="polite"`로 변경이 알려지고, 새로고침 control은 `aria-label="전달 상태 새로고침"`을 가지며, 모든 상태는 색상 외 텍스트로 구분된다.

### AC-7 · 반응형
- **Given** 뷰포트 너비가 320px 이상일 때
- **When** 라벨·갱신 시각 텍스트가 렌더링되면
- **Then** overflow 없이 줄바꿈되어야 한다.

---

## 7. Edge Case · 실패 케이스

| 케이스 | 기대 동작 |
| --- | --- |
| 응답 지연/네트워크 오류 | `error` 상태 텍스트 표시, 이전 상태 복원, 새로고침 control 재활성 |
| 조회 취소(진행 중 새 요청) | 진행 표시를 초기값으로 되돌리고 새로고침 control 재사용 가능 |
| `updatedAt`이 ISO 8601 형식이 아님 | 계약 위반 — API는 항상 ISO 8601로 응답해야 함(developer 구현 시 고정) |
| 권한 거부(403) | `forbidden` 상태 텍스트 표시, control 재활성 |
| 색상 대비만으로 상태 판단 시도 | 금지 — 상태명 텍스트/접근성 이름으로도 노출 필요 |
| 320px 미만 대응 | 계약 범위 밖(320px 이상만 보장) |

---

## 8. Handoff 계약 (planning-contract@v1 · ui-contract@v1)

- **producer**: planner(본 문서, BF-1230)
- **consumer**: designer(BF-1228) · developer(BF-1229)
- **invariant**:
  - designer와 developer는 승인된 실행 설계를 따른다.
  - selector와 token을 변경하거나 재정의하지 않는다.
  - 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.
  - 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.
- **downstream 산출물**:
  - designer → `docs/design/delivery-status-badge-BF-1227.md` (배지 UI 시안·명세, additive)
  - developer → `src/features/delivery-status-badge/{badge.ts, index.d.ts, badge.test.ts}`, `src/routes/phase21-validation.ts` (additive)
- **tester(BF-1232)** 참조 회귀 가드: `tests/regression/delivery-status-badge.test.ts` (read-only 계약)
