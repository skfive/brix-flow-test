# Phase21 전달 상태 배지 — 시각 명세 (BF-1428)

- Jira: BF-1428 (designer) · 형제: BF-1430(planner) / BF-1429(developer)
- 대상 저장소: backend (vanilla-static / ESM / npm)
- **계약 권위**: 본 문서는 planner가 동결한 `ui-contract@v1`(`docs/plans/phase21-delivery-status-plan.md`)을 **시각 명세로 구현**한다. selector·상태·token·접근성·반응형을 **재정의하지 않고 그대로 시각화**한다.
- mockup 참조: `docs/design/phase21-delivery-status.mockup.html`

> 이 문서는 시각 명세와 mockup 범위만 다룬다. 런타임 HTML/CSS/JS는 생성하지 않으며 developer(BF-1429)가 frozen 계약을 구현한다.

---

## 1. 시안 개요

### 변경 범위
`phase21-validation` 영역에 "전달 상태 배지" 컴포넌트의 시각 명세를 제공한다. 4개 클라이언트 상태(`idle`/`loading`/`delivered`/`error`)를 색상 + 화면 텍스트 + 접근성 이름 3중으로 표현하고, 전달 완료 시 갱신 시각(ISO 8601)과 새로고침 control을 함께 제공한다.

### 사용자 경험 목표
- 전달 상태(대기/진행/완료/오류)를 한눈에, **색상에만 의존하지 않고** 식별한다.
- 전달 완료 시점의 갱신 시각을 확인한다.
- 페이지 전체 새로고침 없이 상태만 재조회한다.
- 스크린리더 사용자가 상태 변화를 음성으로 안내받는다.
- 조회 실패·취소 후에도 새로고침 control로 즉시 재시도할 수 있다.

---

## 2. 컬러 팔레트 (frozen token 그대로)

| 역할 | 토큰 | HEX | 적용 상태 |
| --- | --- | --- | --- |
| 완료(delivered) | `--color-status-delivered` | `#16a34a` | delivered |
| 대기중(pending) | `--color-status-pending` | `#f59e0b` | idle, loading |
| 오류(error) | `--color-status-error` | `#dc2626` | error |
| 배지 gap | `--space-badge-gap` | `8px` | 루트 레이아웃 간격 |

> 위 4개 토큰은 frozen 계약값이며 재정의·추가하지 않는다. 배경/텍스트 등 보조 색은 mockup 시각화용 예시일 뿐 계약 토큰이 아니다.

---

## 3. 타이포그래피

- system font stack 사용(외부 폰트 의존 0건, vanilla-static 규약):
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif`

| 요소 | size | weight | line-height |
| --- | --- | --- | --- |
| 배지 상태 텍스트 (`delivery-status__badge`) | 14px | 600 | 1.2 |
| 갱신 시각 (`delivery-status__timestamp`) | 12px | 400 | 1.4 |
| 새로고침 control 라벨 (`delivery-status__refresh` 대체 텍스트/aria-label) | 13px | 500 | 1.2 |

---

## 4. 레이아웃

- 루트(`#delivery-status-root`, `.delivery-status`)는 가로 배치(배지 → 갱신 시각 → 새로고침), 항목 간 간격 `--space-badge-gap`(8px).
- 배지는 inline-flex pill 형태(상태 텍스트 표시). 색상은 상태 modifier class(`.delivery-status--delivered` / `.delivery-status--pending` / `.delivery-status--error`)로만 전환하며, 이 modifier는 루트(`.delivery-status`)에 적용되고 배지·타임스탬프는 이를 상속/참조해 색상을 표현한다.
- **반응형**:
  - 320px 이상 폭에서 배지·갱신 시각 영역에 content overflow가 없다.
  - 480px 미만 폭에서는 배지와 갱신 시각을 **세로로 stack** 한다 (frozen invariant).

---

## 5. 컴포넌트 명세

### 5.1 DOM 구조 (frozen — exact)

| DOM ID | class | 역할 |
| --- | --- | --- |
| `delivery-status-root` | `delivery-status` (+ 상태 modifier) | 컴포넌트 루트 컨테이너 |
| `delivery-status-badge` | `delivery-status__badge` | 상태 배지(상태 텍스트) |
| `delivery-status-timestamp` | `delivery-status__timestamp` | 갱신 시각(ISO 8601) 표시 |
| `delivery-status-refresh` | (지정 class 없음, `<button>`) | 새로고침 control |

### 5.2 상태별 명세 (frozen — exact 4개)

| 상태 | 화면 텍스트 | 루트 modifier class | 색상 token | refresh control | 비고 |
| --- | --- | --- | --- | --- | --- |
| `idle` | **상태 확인 대기** | `delivery-status--pending` | `--color-status-pending` (#f59e0b) | 활성 | 최초 진입 · 초기화/취소/실패 후 복귀 지점 |
| `loading` | **전달 상태 확인 중…** | `delivery-status--pending` | `--color-status-pending` (#f59e0b) | 비활성 | 진행 표시 노출 |
| `delivered` | **전달 완료** | `delivery-status--delivered` | `--color-status-delivered` (#16a34a) | 활성 | ISO 8601 갱신 시각 표시 |
| `error` | **전달 상태를 불러오지 못했습니다** | `delivery-status--error` | `--color-status-error` (#dc2626) | 활성(재활성) | API 실패·403 권한 거부 공통 문구 |

- 상태는 **색상만으로 구분하지 않는다.** 상태명(상태 확인 대기/전달 상태 확인 중…/전달 완료/전달 상태를 불러오지 못했습니다)을 화면 텍스트와 접근성 이름으로 함께 노출한다.
- `idle`과 `loading`은 동일한 `delivery-status--pending` modifier(동일 색상)를 공유하되, 화면 텍스트와 refresh control 활성 여부로 구분된다.

### 5.3 인터랙션 / 상태 전이

- 초기 렌더: `idle`("상태 확인 대기", pending 색상), 갱신 시각 미표시.
- 새로고침 실행(클릭 또는 키보드 Enter/Space) → `loading`("전달 상태 확인 중…") 전이, refresh control 비활성 → `delivery-status.json` 재조회 → 응답에 따라 `delivered`("전달 완료" + 갱신 시각) 또는 `error`("전달 상태를 불러오지 못했습니다")로 갱신.
- **loading 중 중복 실행 방지**: 재조회 진행 중 새로고침 control은 비활성화되어 중복 재조회를 막는다.
- **초기화·취소·실패 후 복원(frozen invariant)**: 조회 취소(abort) 시 진행 표시를 중단하고 `idle`로 복귀, refresh 재활성화. 조회 실패(5xx/네트워크/403) 시 `error`로 전이하되 refresh는 즉시 재활성화되어 재시도 가능해야 한다. → mockup의 "상태 전이 & 복원 흐름" 섹션에 시각화.

### 5.4 접근성 (frozen — 그대로 준수)

1. `delivery-status-badge`는 `aria-live="polite"`로 상태 변화를 스크린리더에 안내한다.
2. `delivery-status-refresh`는 명시적 `aria-label="전달 상태 새로고침"`을 가진다.
3. 각 상태는 색상 외 화면 텍스트(§5.2)를 함께 표시하며, 접근성 이름도 동일 텍스트를 사용한다.
4. 새로고침 control은 `<button>` 요소로 키보드 Enter/Space 실행이 기본 지원된다.

---

## 6. API 계약 요약 (`GET /api/phase21-validation/delivery-status`)

> 상세 계약은 `docs/plans/phase21-delivery-status-plan.md` §4가 권위 문서이며, 본 절은 시각 명세 참고용 요약이다.

- 정적 스택 환경이므로 `phase21-validation/delivery-status.json` 고정 응답을 `fetch`로 조회하는 형태로 구현한다.
- 성공(200): `{ "status": "delivered", "updatedAt": "2026-08-01T03:12:00Z" }` — `updatedAt`은 ISO 8601 UTC(`Z` suffix). 파싱 불가·누락 시 빈 문자열 폴백 + 타임스탬프 요소 숨김.
- 실패(5xx/네트워크 오류) 및 403(권한 거부) → 클라이언트는 공통 `error` 상태로 정규화하고 §5.2의 공통 오류 문구를 그대로 사용한다(원인별 문구 추가 금지, 거부 사유는 화면에 노출하지 않음).
- 계약 밖 상태 문자열 수신 시 `error`로 안전 폴백한다.

### 상태 매핑표 (API → UI)

| API 응답 | 클라이언트 상태 | UI 상태(§5.2) |
| --- | --- | --- |
| 조회 시작 전 | (초기값) | `idle` |
| 요청 진행 중 | (진행 중) | `loading` |
| 200 + `status: "delivered"` | 정상 | `delivered` |
| 5xx / 네트워크 오류 | 실패 | `error` |
| 403 | 권한 거부 | `error` (공통 오류 문구) |
| 요청 취소(abort) | 취소 | `idle` |

---

## 7. dev 구현 가이드 (developer BF-1429 참조용 — 계약 재정의 아님)

> developer는 아래 exact selector/token/상태를 그대로 구현한다. 픽셀 단위 mockup 일치 의무는 없으나 selector·token·상태 텍스트·접근성 계약은 **변경 금지**.

1. **마크업**(`phase21-validation/index.html`):
   - 루트 `<div id="delivery-status-root" class="delivery-status delivery-status--pending">`.
   - 배지 `<span id="delivery-status-badge" class="delivery-status__badge" aria-live="polite">상태 확인 대기</span>` (초기 idle).
   - 갱신 시각 `<span id="delivery-status-timestamp" class="delivery-status__timestamp"></span>` (초기 미표시).
   - 새로고침 `<button id="delivery-status-refresh" aria-label="전달 상태 새로고침">새로고침</button>` (`<button>`은 Enter/Space 기본 지원).
2. **스타일**:
   - `:root`에 `--color-status-delivered:#16a34a`, `--color-status-pending:#f59e0b`, `--color-status-error:#dc2626`, `--space-badge-gap:8px` 정의.
   - `.delivery-status`: `display:flex; gap:var(--space-badge-gap); align-items:center;`.
   - `.delivery-status--delivered` / `.delivery-status--pending` / `.delivery-status--error`: 각 색상 token을 배지·타임스탬프에 적용(예: 배지 배경/텍스트 색).
   - 480px 미만: `.delivery-status`가 `flex-direction:column`으로 전환되어 배지·갱신 시각이 세로 stack.
3. **동작**(`phase21-validation/app.js`):
   - `fetch`로 `phase21-validation/delivery-status.json` 조회. 시작 시 `loading` 전이(배지 텍스트 "전달 상태 확인 중…", refresh 비활성), 응답에 따라 `delivered`/`error`로 갱신.
   - 새로고침 클릭·Enter/Space → loading 전이 후 재조회. loading 중 refresh 비활성으로 중복 실행 방지.
   - 실패(5xx/네트워크/403)·취소(abort)·계약 밖 상태 문자열 폴백: §6 매핑표대로 처리. 실패는 `error` + refresh 즉시 재활성화, 취소는 `idle` 복귀 + refresh 재활성화.
   - `updatedAt` 누락/파싱 불가 시 빈 문자열 폴백, 타임스탬프 요소 숨김.
4. **상태 텍스트 상수**(재정의 금지): idle="상태 확인 대기", loading="전달 상태 확인 중…", delivered="전달 완료", error="전달 상태를 불러오지 못했습니다".

---

## 8. mockup 참조

- 파일: `docs/design/phase21-delivery-status.mockup.html`
- 4개 상태(idle/loading/delivered/error)를 정적으로 나란히 시각화하고, "상태 전이 & 복원 흐름"(loading → delivered/error, 실패·취소 후 idle 복원 + 새로고침 재활성화), 320px/480px 반응형 프레임을 포함한다.
- 이 mockup은 developer 산출물이 아니며 UX 의도 전달용 시각 시뮬레이션이다.

---

## 9. Self-critique

- **AC 매핑**: acceptance_criteria 3항목(frozen selector/상태/token/접근성/반응형 재정의 없이 구현, delivered/pending/error 화면 텍스트·색상 token 명시, 산출물 범위 3개 파일로 한정)이 §2·§5·§6·§8에서 모두 커버됨. ✅
- **dev 구현 가이드**: §7에 exact selector/token/상태 텍스트/접근성 단계별 지침 제공. ✅
- **기존 요소 보존**: 신규 컴포넌트 문서로 기존 파일 변경 없음(additive). frozen 파일 소유권 정책 준수. ✅
- **컴포넌트 매핑**: 4개 DOM ID / 3개 상태 modifier class / 4개 token이 frozen 계약(`docs/plans/phase21-delivery-status-plan.md`)과 1:1 일치(재정의 없음). ✅
- **모호함 flag**: 배지·타임스탬프 배경/보조 텍스트 색과 폰트 크기는 frozen token이 아닌 **시각화 예시**이며, developer는 §2의 4개 frozen 토큰만 계약으로 준수하면 됨. refresh control에는 별도 class가 지정되지 않아(§5.1) mockup에서는 시각 구분을 위한 예시 class만 사용했고 이는 계약이 아님. ⚠️(의도된 자유도)
