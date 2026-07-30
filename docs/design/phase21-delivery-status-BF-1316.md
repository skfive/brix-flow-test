# Phase21 전달 상태 배지 — 시각 명세 (BF-1317)

- Jira: BF-1317 (designer) · Epic 형제: BF-1319(planner) / BF-1318(developer) / BF-1321(tester)
- 대상 저장소: backend (vanilla-static / ESM / npm)
- **계약 권위**: 본 문서는 planner가 동결한 `ui-contract@v1`(`docs/plans/phase21-delivery-status-BF-1316.md`)을 **시각 명세로 구현**한다. selector·상태·token·접근성·반응형을 **재정의하지 않고 그대로 시각화**한다.
- mockup 참조: `docs/design/phase21-delivery-status-mockup.html`

> 이 문서는 시각 명세와 mockup 범위만 다룬다. 런타임 HTML/CSS/JS는 생성하지 않으며 developer(BF-1318)가 frozen 계약을 구현한다.

---

## 1. 시안 개요

### 변경 범위
전달(Delivery) 파이프라인 상태를 화면에 노출하는 **전달 상태 배지** 컴포넌트의 시각 명세. 4개 상태(idle/loading/success/error)를 색상 + 화면 텍스트 + 접근성 이름 3중으로 표현하고, 마지막 갱신 시각과 새로고침 control을 함께 제공한다.

### 사용자 경험 목표
- 전달 상태(정상/오류)를 한눈에, **색상에만 의존하지 않고** 식별한다.
- 마지막 갱신 시각을 확인한다.
- 페이지 전체 새로고침 없이 상태만 재조회한다.
- 스크린리더 사용자가 상태 변화를 음성으로 안내받는다.

---

## 2. 컬러 팔레트 (frozen token 그대로)

| 역할 | 토큰 | HEX | 적용 상태 |
| --- | --- | --- | --- |
| 성공(success) | `--color-status-success` | `#16a34a` | success |
| 오류(error) | `--color-status-error` | `#dc2626` | error |
| 중립(neutral) | `--color-status-neutral` | `#64748b` | idle, loading |
| 배지 gap | `--space-badge-gap` | `8px` | 루트 레이아웃 간격 |

> 위 4개 토큰은 frozen 계약값이며 재정의·추가하지 않는다. 배경/텍스트 등 보조 색은 mockup 시각화용 예시일 뿐 계약 토큰이 아니다.

---

## 3. 타이포그래피

- system font stack 사용(외부 폰트 의존 0건, vanilla-static 규약):
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans KR", sans-serif`

| 요소 | size | weight | line-height |
| --- | --- | --- | --- |
| 배지 상태 텍스트 (`delivery-status__badge`) | 14px | 600 | 1.2 |
| 마지막 갱신 시각 (`delivery-status__updated-at`) | 12px | 400 | 1.4 |
| 새로고침 control 라벨 (`delivery-status__refresh`) | 13px | 500 | 1.2 |

---

## 4. 레이아웃

- 루트(`#delivery-status-root`, `.delivery-status`)는 가로 배치(배지 → 갱신 시각 → 새로고침), 항목 간 간격 `--space-badge-gap`(8px).
- 배지는 inline-flex pill 형태(상태 텍스트 표시). 색상은 상태 modifier class로만 전환.
- **반응형**: 320px 이상에서 배지와 마지막 갱신 시각이 content overflow 없이 표시된다. 폭이 좁아지면 `flex-wrap`으로 줄바꿈하여 overflow를 방지한다(계약 하한 320px).

---

## 5. 컴포넌트 명세

### 5.1 DOM 구조 (frozen — exact)

| DOM ID | class | 역할 |
| --- | --- | --- |
| `delivery-status-root` | `delivery-status` | 컴포넌트 루트 컨테이너 |
| `delivery-status-badge` | `delivery-status__badge` (+ 상태 modifier) | 상태 배지(상태 텍스트) |
| `delivery-status-updated-at` | `delivery-status__updated-at` | 마지막 갱신 시각 |
| `delivery-status-refresh` | `delivery-status__refresh` | 새로고침 control |

### 5.2 상태별 명세 (frozen — exact 4개)

| 상태 | 화면 텍스트 | 배지 class | 색상 token |
| --- | --- | --- | --- |
| `idle` | **대기 중** | `delivery-status__badge` | `--color-status-neutral` (#64748b) |
| `loading` | **불러오는 중** | `delivery-status__badge` | `--color-status-neutral` (#64748b) |
| `success` | **정상** | `delivery-status__badge delivery-status__badge--success` | `--color-status-success` (#16a34a) |
| `error` | **오류** | `delivery-status__badge delivery-status__badge--error` | `--color-status-error` (#dc2626) |

- 상태는 **색상만으로 구분하지 않는다.** 상태명(대기 중/불러오는 중/정상/오류)을 화면 텍스트와 접근성 이름으로 함께 노출한다.

### 5.3 인터랙션 / 상태 전이

- 초기 렌더: `idle`("대기 중", neutral), 갱신 시각 미확정.
- 새로고침 실행(클릭 또는 키보드 Enter/Space) → `loading`("불러오는 중") 전이 → `delivery-status.json` 재조회 → 응답 `status`에 따라 `success`("정상") 또는 `error`("오류")로 갱신, `updatedAt`을 `delivery-status-updated-at`에 표시.
- **loading 중 중복 실행 방지**: 재조회 진행 중 새로고침 control은 진행 표시(비활성/진행중 표기)로 중복 재조회를 막는다.
- **초기화·취소·실패 후 복원(frozen invariant)**: 실패 또는 취소 이후 상태와 진행 표시를 초기값(`idle`/신규 진행 없음)으로 되돌리고, 새로고침 control을 **다시 사용 가능**하게 재활성화한다. → mockup의 "상태 전이 & 복원 흐름" 섹션에 시각화.

### 5.4 접근성 (frozen — 그대로 준수)

1. 배지(`delivery-status-badge`)는 `aria-live="polite"`로 상태 변화를 스크린리더에 알린다.
2. 새로고침 control(`delivery-status-refresh`)은 `aria-label="전달 상태 새로고침"`을 가진다.
3. 각 상태는 색상 외 화면 텍스트(대기 중/불러오는 중/정상/오류)를 함께 표시한다.
4. 새로고침 control은 키보드 Enter/Space로 실행 가능하다.
5. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

---

## 6. dev 구현 가이드 (developer BF-1318 참조용 — 계약 재정의 아님)

> developer는 아래 exact selector/token/상태를 그대로 구현한다. 픽셀 단위 mockup 일치 의무는 없으나 selector·token·상태 텍스트·접근성 계약은 **변경 금지**.

1. **마크업**(`phase21-validation/index.html`):
   - 루트 `<div id="delivery-status-root" class="delivery-status">`.
   - 배지 `<span id="delivery-status-badge" class="delivery-status__badge" aria-live="polite">대기 중</span>` (초기 idle).
   - 갱신 시각 `<span id="delivery-status-updated-at" class="delivery-status__updated-at"></span>`.
   - 새로고침 `<button id="delivery-status-refresh" class="delivery-status__refresh" aria-label="전달 상태 새로고침">새로고침</button>` (`<button>`은 Enter/Space 기본 지원).
2. **스타일**(`phase21-validation/styles.css`):
   - `:root`에 `--color-status-success/#16a34a`, `--color-status-error/#dc2626`, `--color-status-neutral/#64748b`, `--space-badge-gap/8px` 정의.
   - `.delivery-status`: `display:flex; gap:var(--space-badge-gap); align-items:center; flex-wrap:wrap;`.
   - `.delivery-status__badge`: 기본 배경/텍스트는 neutral 토큰 사용.
   - `.delivery-status__badge--success`: success 토큰, `.delivery-status__badge--error`: error 토큰.
   - 320px에서 overflow 없도록 `flex-wrap`.
3. **동작**(`phase21-validation/src/delivery-status.js`):
   - `fetch('api/delivery-status.json')`로 조회. 시작 시 `loading`("불러오는 중"), 응답 `status`에 따라 배지 텍스트/modifier class/`updated-at` 갱신.
   - 새로고침 클릭·Enter/Space → loading 전이 후 재조회. loading 중 중복 실행 방지(진행 표시).
   - 실패/취소/E2~E3 폴백: 계약 밖 `status`는 안전 기본 상태로 폴백, `updatedAt` 누락 시 갱신 시각 미표시. 실패·취소 후 idle 복귀 + 새로고침 재활성화.
4. **상태 텍스트 상수**(재정의 금지): idle="대기 중", loading="불러오는 중", success="정상", error="오류".

---

## 7. mockup 참조

- 파일: `docs/design/phase21-delivery-status-mockup.html`
- 4개 상태(idle/loading/success/error)를 정적으로 나란히 시각화하고, "상태 전이 & 복원 흐름"(loading → success/error, 실패·취소 후 idle 복원 + 새로고침 재활성화), hover/focus 상태, 320px 반응형 프레임을 포함한다.
- 이 mockup은 developer 산출물이 아니며 UX 의도 전달용 시각 시뮬레이션이다.

---

## 8. Self-critique

- **AC 매핑**: AC-1~AC-7 및 E1~E6이 상태별 명세(5.2)·전이(5.3)·접근성(5.4)·반응형(4)으로 모두 커버됨. ✅
- **dev 구현 가이드**: §6에 exact selector/token/상태 텍스트/접근성 단계별 지침 제공. ✅
- **기존 요소 보존**: 신규 컴포넌트로 기존 요소 변경 없음. frozen 파일 소유권/정책(additive) 준수. ✅
- **컴포넌트 매핑**: 4개 DOM ID / 6개 class / 4개 token이 frozen 계약과 1:1 일치(재정의 없음). ✅
- **모호함 flag**: 배경/텍스트 보조 색과 폰트 크기는 계약 토큰이 아닌 **시각화 예시**임을 명시 — developer는 4개 frozen 토큰만 계약으로 준수하면 됨. ⚠️(의도된 자유도)
