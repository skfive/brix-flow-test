# 전달 상태 배지 구현 설계 (BF-1430)

## 1. 개요

phase21-validation 영역에 "전달 상태 배지" UI와 그 데이터 소스인 `GET /api/phase21-validation/delivery-status`
응답 계약을 구현하기 위한 실행 설계다. 아래 UI 계약과 API 계약은 **frozen** 이며, designer(BF-1428)·developer(BF-1429)는
이 문서에 기재된 파일·ID·class·token·상태·문구를 그대로 구현한다. 새 파일이나 새 역할을 추가하지 않는다.

## 2. 소유 파일 및 담당자 (frozen — 재배정 금지)

| 파일 | 담당 |
|---|---|
| `docs/design/phase21-delivery-status.md` | designer |
| `docs/design/phase21-delivery-status.mockup.html` | designer |
| `phase21-validation/app.js` | developer |
| `phase21-validation/index.html` | developer |
| `phase21-validation/tests/delivery-status.test.js` | developer |
| `phase21-validation/delivery-status.json` | 본 work packet 공용 산출물 (canonical) |
| `docs/plans/phase21-delivery-status-plan.md` (본 문서) | planner |

모든 파일은 **additive** 다: 기존 selector/token을 재정의하지 않고, 새 항목만 더한다.

## 3. UI 계약 (frozen — designer/developer 변경 금지)

### 3.1 DOM 구조 / ID

루트 컨테이너 하나에 배지, 갱신 시각, 새로고침 control이 자식으로 들어간다.

- `#delivery-status-root` — 루트 컨테이너
- `#delivery-status-badge` — 상태 배지
- `#delivery-status-timestamp` — 갱신 시각 표시
- `#delivery-status-refresh` — 새로고침 control (키보드로 실행 가능한 `<button>`)

### 3.2 CSS class

- `.delivery-status` — 루트
- `.delivery-status__badge` — 배지
- `.delivery-status__timestamp` — 갱신 시각
- `.delivery-status--delivered` / `.delivery-status--pending` / `.delivery-status--error` — 상태별 modifier (색상은 이 modifier로만 적용, 텍스트는 3.3 참조)

### 3.3 상태 모델

4개 클라이언트 상태. 색상만으로 상태를 구분하지 않고, 상태명을 화면 텍스트 + 접근성 이름으로 함께 노출한다 (아래 §4.4 매핑표와 연결).

| 상태 | 화면 텍스트 | modifier class | refresh control | 비고 |
|---|---|---|---|---|
| `idle` | '상태 확인 대기' | `delivery-status--pending` | 활성 | 최초 진입 · 초기화/취소/실패 후 복귀 지점 |
| `loading` | '전달 상태 확인 중…' | `delivery-status--pending` | 비활성 | 진행 표시 노출 |
| `delivered` | '전달 완료' | `delivery-status--delivered` | 활성 | ISO 8601 갱신 시각(§3.1 timestamp) 표시 |
| `error` | '전달 상태를 불러오지 못했습니다' | `delivery-status--error` | 활성(재활성) | API 실패·권한 거부 공통 (§4.4) |

### 3.4 디자인 토큰

- `--color-status-delivered: #16a34a`
- `--color-status-pending: #f59e0b`
- `--color-status-error: #dc2626`
- `--space-badge-gap: 8px`

### 3.5 접근성

- `#delivery-status-badge`는 `aria-live="polite"`로 상태 변화를 안내한다.
- `#delivery-status-refresh`는 명시적 `aria-label="전달 상태 새로고침"`을 가진다.
- 모든 상태는 색상만으로 구분하지 않는다 — §3.3 화면 텍스트가 접근성 이름과 동일하게 노출되어야 한다.

### 3.6 반응형

- 320px 이상 폭에서 배지·갱신 시각 영역에 content overflow가 없다.
- 480px 미만 폭에서는 배지와 갱신 시각을 세로로 stack 한다.

## 4. API 계약: `GET /api/phase21-validation/delivery-status`

정적 스택(vanilla-static) 환경이므로 이 endpoint는 `phase21-validation/delivery-status.json` 고정 응답을
`fetch`로 조회하는 형태로 구현한다. 실패/권한 거부 시나리오는 서버 상태 코드(5xx/403) 또는 네트워크 오류를
클라이언트에서 매핑해 재현한다 (테스트는 `fetchImpl` 모킹으로 검증).

### 4.1 성공 응답 (200)

```json
{ "status": "delivered", "updatedAt": "2026-08-01T03:12:00Z" }
```

- `updatedAt`은 **ISO 8601 (UTC, `Z` suffix)** 형식이다. 파싱 불가·누락 시 빈 문자열로 폴백하고 timestamp
  요소는 숨김 처리한다.

### 4.2 실패 응답 (5xx / 네트워크 오류)

- 응답 body 유무와 무관하게 클라이언트는 `error` 상태로 정규화한다.
- 화면 문구는 §3.3의 공통 오류 문구를 그대로 사용한다 (원인별 문구를 추가하지 않는다).

### 4.3 권한 거부 응답 (403)

- 클라이언트는 `error` 상태로 정규화한다. **frozen 상태 모델에 별도 "거부" 상태가 없으므로** 화면 텍스트는
  §3.3의 공통 오류 문구와 동일하게 유지한다.
- 거부 사유는 화면에 노출하지 않는다 (로깅 등 화면 밖 용도로만 허용).

### 4.4 상태 매핑표 (API → UI)

| API 응답 | 클라이언트 상태 | UI 상태(§3.3) |
|---|---|---|
| 조회 시작 전 | (초기값) | `idle` |
| 요청 진행 중 | (진행 중) | `loading` |
| 200 + `status: "delivered"` | 정상 | `delivered` |
| 5xx / 네트워크 오류 | 실패 | `error` |
| 403 | 권한 거부 | `error` (공통 오류 문구, §4.3) |
| 요청 취소(abort) | 취소 | `idle` (§5) |

### 4.5 갱신 시각 형식

ISO 8601, UTC, `Z` suffix 고정. 예: `2026-08-01T03:12:00Z`. 초 단위 이하 소수점 유무는 파싱만 성공하면 무방하다.

## 5. 초기화 · 취소 · 실패 후조건 (frozen invariant)

초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값(`idle`)** 으로 되돌리고, 주 실행 control(새로고침 button)을
다시 사용할 수 있어야 한다. 구체적으로:

- 최초 진입: `idle` — 배지 '상태 확인 대기', refresh 활성.
- 조회 취소(`signal` abort): 진행 표시 중단 후 `idle`로 복귀, refresh 재활성.
- 조회 실패(5xx/네트워크/403): `error`로 전이하되, refresh는 즉시 재활성되어 재시도 가능해야 한다.

## 6. Edge Case

- E1: 서버 5xx/네트워크 오류 → §4.2, `error` 상태.
- E2: 계약 밖 상태 문자열 수신 → `error`로 안전 폴백.
- E3: `updatedAt` 누락/파싱 불가 → 빈 문자열 폴백, timestamp 요소 숨김.
- E4: 403 권한 거부 → §4.3, `error` 상태 + 공통 오류 문구(사유 미노출).
- E5: 조회 중 취소(`signal` abort) → §5, `idle` 복귀 + refresh 재활성.

## 7. 산출물 경로 요약

- `docs/design/phase21-delivery-status.md`, `docs/design/phase21-delivery-status.mockup.html` — designer
- `phase21-validation/app.js`, `phase21-validation/index.html`, `phase21-validation/tests/delivery-status.test.js` — developer
- `phase21-validation/delivery-status.json` — API 고정 응답 fixture (canonical)
- `phase21-validation/tests/regression.test.js` — tester (§4.4 매핑 + §5 후조건 회귀 가드)
