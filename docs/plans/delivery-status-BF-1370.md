# 전달 상태 배지 구현 설계 (BF-1370 / BF-1373)

> 본 문서는 planner가 확정하는 **실행 설계 + 동결(UI/API) 계약**입니다.
> designer(BF-1371)·developer(BF-1372)·tester(BF-1375)는 이 문서와 frozen blueprint를
> 유일 권위로 따르며, selector·token·상태 모델을 변경하거나 재정의하지 않습니다.
> 본 문서는 파일 소유권·상태 계약을 재정의하지 않고 blueprint를 그대로 렌더링합니다.

---

## 1. Problem Statement (문제 정의)

### 현재 상황
- `phase21-validation` 모듈은 전달(delivery) 파이프라인의 최종 상태를 화면에서 즉시 확인할 방법이 없다.
- 운영자는 전달 완료/진행/오류/권한 여부를 별도 로그나 API를 직접 조회해야 한다.

### 사용자 페인 포인트
- 상태가 텍스트 없이 색상만으로 표시되면 색약 사용자·스크린리더 사용자가 구분하지 못한다.
- 좁은 화면(모바일)에서 배지와 갱신 시각이 겹쳐 정보가 잘린다.
- 마지막 갱신 시각이 사람이 읽기 어려운 형식이면 신선도를 판단할 수 없다.

### 비즈니스 임팩트
- 전달 상태를 한 눈에, 접근성 있게 노출하여 운영 대응 시간을 단축하고 오탐/누락을 줄인다.

---

## 2. Proposed Solution (제안 해법 개요)

`phase21-validation` 화면 상단에 **전달 상태 배지 컴포넌트**를 추가한다.
컴포넌트는 `GET /api/phase21-validation/delivery-status`를 호출하여 4개 상태
(`loading`, `ready`, `error`, `forbidden`) 중 하나를 표시하고, 마지막 갱신 시각(ISO 8601)을
사람이 읽을 수 있게 렌더링한다. 색상 + 상태 텍스트 라벨을 함께 노출하고 `aria-live="polite"`로
상태 변화를 알린다.

### 사용자 스토리
- 운영자로서, 화면에 진입하면 전달 상태 배지가 현재 상태를 색상 **및** 텍스트로 보여주길 원한다.
- 스크린리더 사용자로서, 상태가 바뀌면 별도 조작 없이 변경을 안내받길 원한다.
- 모바일 사용자로서, 320px 폭에서도 배지와 갱신 시각이 잘리지 않고 보이길 원한다.
- 권한 없는 사용자로서, 접근이 거부되면 "권한 없음"이 명확히 표시되길 원한다.

### 성공 지표
- 4개 상태 전부 색상 + 텍스트 라벨로 구분 가능 (색상 단독 구분 0건).
- 320px 이상 전 폭에서 overflow 0건, 좁은 화면 세로 재배치 정상.
- unit test(`phase21-validation/tests/delivery-status.unit.test.js`) 전 통과.

---

## 3. 동결 UI 계약 (Frozen UI Contract) — 변경 금지

> 아래 값은 frozen blueprint(`ui-contract@v1`)를 그대로 옮긴 것으로, designer·developer가
> selector·token을 **추가/변경/재정의하지 않는다**. 각 파일은 **additive** 정책이다.

### 3.1 산출물 파일 및 소유권

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/delivery-status-BF-1370.md` | designer | additive |
| `phase21-validation/data/delivery-status.json` | canonical work packet owner | additive |
| `phase21-validation/index.html` | developer | additive |
| `phase21-validation/src/delivery-status.js` | developer | additive |
| `phase21-validation/tests/delivery-status.unit.test.js` | developer | additive |

- 화면 route: `/phase21-validation/index.html` (root-relative static, serve_root `.`).

### 3.2 DOM 구조 (ID / class)

```
#delivery-status-root  .delivery-status              (root, aria-live="polite")
 ├─ #delivery-status-badge     .delivery-status__badge
 └─ #delivery-status-timestamp .delivery-status__timestamp
```

| 역할 | DOM ID | CSS class |
| --- | --- | --- |
| 루트 컨테이너 | `delivery-status-root` | `delivery-status` |
| 상태 배지 | `delivery-status-badge` | `delivery-status__badge` |
| 갱신 시각 | `delivery-status-timestamp` | `delivery-status__timestamp` |

### 3.3 상태 모델 (states)

| 상태 | 화면 텍스트 라벨 | 색상 token | 의미 |
| --- | --- | --- | --- |
| `loading` | 진행 중 | `--color-status-pending` | 데이터 로딩 중 (초기값) |
| `ready` | 전달 완료 | `--color-status-success` | 전달 성공 |
| `error` | 오류 | `--color-status-error` | 전달 실패/조회 오류 |
| `forbidden` | 권한 없음 | `--color-status-error` | 접근 권한 거부(403) |

- 초기 상태는 `loading`이며, 초기화/취소/실패 뒤에는 상태와 진행 표시를 초기값(`loading`)으로
  되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.

### 3.4 디자인 token / CSS 변수

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-status-success` | `#16a34a` | `ready` 배지 색 |
| `--color-status-pending` | `#f59e0b` | `loading` 배지 색 |
| `--color-status-error` | `#dc2626` | `error` / `forbidden` 배지 색 |
| `--space-badge-gap` | `8px` | 배지와 갱신 시각 간격 |

### 3.5 접근성 (accessibility)

- 배지 root(`#delivery-status-root`)는 `aria-live="polite"`로 상태 변화를 알린다.
- 배지는 색상 외에 상태 텍스트 라벨(전달 완료/진행 중/오류/권한 없음)을 표시한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트 **및** 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- 320px 이상에서 배지와 갱신 시각이 overflow 없이 표시된다.
- 좁은 화면에서 배지와 갱신 시각이 세로로 재배치된다 (`--space-badge-gap` 간격 유지).

---

## 4. API 응답 계약 (Frozen API Contract)

### 4.1 엔드포인트

```
GET /api/phase21-validation/delivery-status
```

- 정적 데이터 소스: `phase21-validation/data/delivery-status.json` (canonical work packet owner 소유).

### 4.2 성공 응답 (200 → 상태 `ready`)

```json
{
  "status": "ready",
  "label": "전달 완료",
  "updatedAt": "2026-07-31T09:15:00Z"
}
```

- `status`: `"ready" | "error"` (성공 payload 안에서의 논리 상태).
- `label`: 화면 텍스트 라벨 (§3.3).
- `updatedAt`: **ISO 8601 UTC** 문자열 (`YYYY-MM-DDTHH:mm:ssZ`). 갱신 시각 계약.

### 4.3 실패 응답 (5xx / 네트워크 오류 → 상태 `error`)

```json
{
  "status": "error",
  "label": "오류",
  "updatedAt": "2026-07-31T09:15:00Z"
}
```

- 응답 수신 실패(네트워크·타임아웃)나 `4xx/5xx`(403 제외) 시 클라이언트는 상태를 `error`로 렌더링.
- `updatedAt` 파싱 실패 시 갱신 시각 영역은 빈 값으로 두고 배지 상태는 `error`로 유지.

### 4.4 권한 거부 응답 (403 → 상태 `forbidden`)

```json
{
  "status": "forbidden",
  "label": "권한 없음",
  "updatedAt": null
}
```

- HTTP 403 수신 시 상태 `forbidden`, 라벨 "권한 없음", 갱신 시각 미표시(`null` 허용).

### 4.5 갱신 시각 표시 규칙

- 원본은 항상 ISO 8601(UTC, `Z`)로 계약한다.
- 화면 렌더링 시 사람이 읽을 수 있는 형식으로 변환하되 원본 값은 `#delivery-status-timestamp`의
  접근성 이름/`datetime` 근거로 보존한다.
- `updatedAt`이 `null`이거나 파싱 불가면 갱신 시각 영역을 표시하지 않는다.

---

## 5. Acceptance Criteria (Given/When/Then)

### AC-1 초기 로딩
- **Given** 사용자가 `/phase21-validation/index.html`에 진입하고
- **When** 배지 컴포넌트가 초기화되면
- **Then** `#delivery-status-root`가 상태 `loading`("진행 중", `--color-status-pending`)으로
  렌더링되고 `aria-live="polite"`가 설정된다.

### AC-2 전달 완료
- **Given** API가 `200 {status:"ready"}`를 반환할 때
- **When** 응답을 수신하면
- **Then** 배지는 "전달 완료"(`--color-status-success`)를 색상+텍스트로 표시하고,
  `#delivery-status-timestamp`가 `updatedAt`을 사람이 읽는 형식으로 표시한다.

### AC-3 오류
- **Given** API가 5xx/네트워크 오류 또는 `{status:"error"}`를 반환할 때
- **When** 응답을 수신/실패하면
- **Then** 배지는 "오류"(`--color-status-error`)를 표시한다.

### AC-4 권한 거부
- **Given** API가 `403`을 반환할 때
- **When** 응답을 수신하면
- **Then** 배지는 "권한 없음"(`--color-status-error`)을 표시하고 갱신 시각을 표시하지 않는다.

### AC-5 접근성
- **Given** 임의의 상태에서
- **When** 스크린리더로 배지를 읽으면
- **Then** 상태명이 화면 텍스트 및 접근성 이름으로 노출되고, 상태 변화가 `aria-live="polite"`로
  안내되며, 색상 단독 구분에 의존하지 않는다.

### AC-6 반응형
- **Given** 뷰포트 폭 320px 이상에서
- **When** 배지가 표시되면
- **Then** overflow 없이 표시되고, 좁은 화면에서는 배지와 갱신 시각이 `--space-badge-gap`
  간격으로 세로 재배치된다.

### AC-7 초기화/취소/실패 복원
- **Given** 오류/취소/재초기화가 발생하면
- **When** 컴포넌트가 리셋되면
- **Then** 상태와 진행 표시가 초기값(`loading`)으로 돌아가고 주 실행 control을 다시 사용할 수 있다.

---

## 6. Edge Cases & 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E1 | `updatedAt` 파싱 불가 | 상태는 유지, 갱신 시각 영역 미표시 |
| E2 | 응답 body 누락/JSON 파싱 실패 | 상태 `error` |
| E3 | 알 수 없는 `status` 값 | 상태 `error`로 폴백 |
| E4 | 403 | 상태 `forbidden`, 갱신 시각 미표시 |
| E5 | 네트워크 타임아웃 | 상태 `error` |
| E6 | 응답 지연 중 재초기화 | 진행 표시 초기값 복원, control 재사용 가능 (AC-7) |
| E7 | `updatedAt: null` (forbidden) | 갱신 시각 미표시, 오류 아님 |

---

## 7. Requirement Traceability Matrix (RTM)

| Requirement | AC | Edge | 검증 산출물 |
| --- | --- | --- | --- |
| REQ 상태 배지 4-state | AC-1~4, AC-7 | E3, E4, E6 | `delivery-status.unit.test.js` |
| REQ API 응답 계약 | AC-2~4 | E2, E4, E5, E7 | `delivery-status.unit.test.js` |
| REQ 접근성 | AC-5 | — | `delivery-status.unit.test.js` |
| REQ 반응형 | AC-6 | — | `delivery-status.unit.test.js` |
| REQ 갱신 시각(ISO 8601) | AC-2, AC-4 | E1, E7 | `delivery-status.unit.test.js` |

---

## 8. 역할별 실행 지침 (Blueprint packet 요약, 재정의 아님)

- **designer(BF-1371)** → `docs/design/delivery-status-BF-1370.md`: 위 UI 계약(§3)을 시각/레이아웃
  스펙으로 구체화. selector·token·상태명 변경 금지 (additive).
- **developer(BF-1372)** → `phase21-validation/index.html`, `.../src/delivery-status.js`,
  `.../tests/delivery-status.unit.test.js`: §3~4 계약대로 구현 및 unit test 작성 (additive).
- **canonical owner** → `phase21-validation/data/delivery-status.json`: §4 응답 형태 고정 데이터.
- **tester(BF-1375)** → §5 AC / §6 edge를 실제 결과(`test_result`)로 검증.

---

## 9. Risks & Mitigations

| 리스크 | 완화 |
| --- | --- |
| selector/token 임의 변경으로 계약 붕괴 | frozen 계약 명시 + additive 정책, review에서 diff 확인 |
| 색상 단독 구분(접근성 위반) | 상태 텍스트 라벨 필수화(AC-5) |
| 시간대 혼란 | `updatedAt` UTC ISO 8601 고정(§4.5) |
| 좁은 화면 overflow | 320px 기준 반응형 AC-6로 검증 |
