# 전달 상태 배지 — 시각 명세 (BF-1371)

> 본 문서는 planner가 동결한 `ui-contract@v1`
> (`sha256:f49bb094d0a1bfde7705da52c7addc2ec9d2ad80eac45582874e3b65ba64ebaa`)와
> 실행 설계(`docs/plans/delivery-status-BF-1370.md`, `planning-contract@v1`)를 **유일 권위**로 삼는
> designer 산출물입니다.
> selector·design token·상태 모델·텍스트 라벨을 **추가/변경/재정의하지 않고** 시각/레이아웃 스펙으로
> 구체화합니다. 본 문서는 런타임 HTML/CSS/JS를 생성하지 않으며, additive 정책을 따릅니다.
>
> - 시각 mockup: `docs/design/mockups/delivery-status-BF-1370.html`
> - 상태별 시각 데이터: `phase21-validation/data/delivery-status.json`

---

## 1. 시안 개요

### 변경 범위
`phase21-validation` 화면 상단의 **전달 상태 배지** 컴포넌트의 시각·레이아웃·접근성·반응형 명세.
DOM 구조, selector, design token, 상태 모델, 텍스트 라벨은 frozen 계약 그대로 반영한다.

### 사용자 경험 목표
- 전달 상태(진행 중 / 전달 완료 / 오류 / 권한 없음)를 **색상 + 텍스트 라벨**로 한눈에 구분한다.
- 색약·스크린리더 사용자도 색상에 의존하지 않고 상태를 인지한다 (`aria-live="polite"`).
- 320px 폭에서도 배지와 갱신 시각이 overflow 없이 표시되고, 좁은 화면에서 세로로 재배치된다.

---

## 2. 컬러 팔레트

> frozen `design_tokens` 그대로. **HEX·토큰명 변경 금지 (additive)**.

| 토큰 | HEX | 용도 | 대비(흰 텍스트 기준) |
| --- | --- | --- | --- |
| `--color-status-success` | `#16a34a` | `ready` (전달 완료) 배지 배경 | AA 통과 (4.54:1) |
| `--color-status-pending` | `#f59e0b` | `loading` (진행 중) 배지 배경 | 어두운 텍스트 권장 |
| `--color-status-error` | `#dc2626` | `error` / `forbidden` 배지 배경 | AA 통과 (4.5:1) |
| `--space-badge-gap` | `8px` | 배지 ↔ 갱신 시각 간격 | — |

### 배지 전경(텍스트) 색 가이드 (파생 값 — 신규 토큰 아님)
- `--color-status-pending`(`#f59e0b`)은 흰 텍스트 대비가 낮으므로 **진한 텍스트(`#1f2937`)** 를 권장한다.
- `--color-status-success` / `--color-status-error`는 **흰 텍스트(`#ffffff`)** 로 AA를 만족한다.
- 위 전경 색은 접근성 확보를 위한 파생 권장값이며, frozen token을 추가/재정의하지 않는다.

---

## 3. 타이포그래피

> `vanilla-static` stack — 외부 폰트 의존성 0건, system font stack 사용.

```
--font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

| 요소 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 배지 라벨 (`.delivery-status__badge`) | system stack | 14px (0.875rem) | 600 | 1.2 |
| 갱신 시각 (`.delivery-status__timestamp`) | system stack | 12px (0.75rem) | 400 | 1.4 |
| 섹션 제목(`h1`, 기존 scaffold) | system stack | 20px (1.25rem) | 700 | 1.3 |

- 배지 라벨은 `weight 600`으로 상태명을 강조해 색상 외 인지 단서(굵기)를 추가한다.

---

## 4. 레이아웃

### 4.1 DOM 구조 (frozen — §ui-contract 그대로)

```
#delivery-status-root  .delivery-status            (root · aria-live="polite")
 ├─ #delivery-status-badge     .delivery-status__badge      (상태 배지)
 └─ #delivery-status-timestamp .delivery-status__timestamp  (갱신 시각)
```

| 역할 | DOM ID | CSS class |
| --- | --- | --- |
| 루트 컨테이너 | `delivery-status-root` | `delivery-status` |
| 상태 배지 | `delivery-status-badge` | `delivery-status__badge` |
| 갱신 시각 | `delivery-status-timestamp` | `delivery-status__timestamp` |

> ⚠️ **developer 정렬 노트 (재정의 아님)**: 현재 scaffold `phase21-validation/index.html`는
> `#delivery-status-updated-at` / `.delivery-status__updated-at`를 쓰고 있고 `aria-live`가 배지에 붙어
> 있다. frozen 계약은 timestamp를 `#delivery-status-timestamp` / `.delivery-status__timestamp`,
> `aria-live="polite"`를 **root(`#delivery-status-root`)** 에 두도록 규정한다.
> developer는 구현 시 계약값으로 **정렬(additive)** 한다 — 본 명세가 selector를 새로 만드는 것이 아니라
> frozen 계약을 그대로 옮긴 것이다.

### 4.2 배치·spacing

- 루트는 **가로 flex** 배치: `배지` → `갱신 시각` 순, 세로 중앙 정렬.
- 배지와 갱신 시각 사이 간격 = `--space-badge-gap`(`8px`).
- 배지 내부 padding 권장: `4px 10px`, `border-radius: 999px`(pill 형태).
- 루트 자체 상하 여백은 화면 컨텍스트에 맞추되 신규 spacing 토큰을 만들지 않는다.

### 4.3 breakpoint 별 동작

| 뷰포트 | 배치 | 근거 (AC-6) |
| --- | --- | --- |
| `≥ 480px` | 가로 1행 (배지 · 갱신 시각), `--space-badge-gap` 간격 | overflow 없음 |
| `320px ~ 479px` | **세로 재배치** (배지 위, 갱신 시각 아래), `--space-badge-gap` 간격 유지 | 좁은 화면 재배치 |

- 재배치 구현 권장: 루트를 `display:flex; flex-wrap:wrap;` 로 두고 `@media (max-width:479px)` 에서
  `flex-direction:column; align-items:flex-start;`.
- 320px 미만은 계약 범위 밖(§responsive: 320px 이상 보장).

---

## 5. 컴포넌트 명세

### 5.1 상태 모델 (frozen `states` — 변경 금지)

| 상태 | 화면 텍스트 라벨 | 색상 token | 색상 외 표시(비색상 단서) | 갱신 시각 |
| --- | --- | --- | --- | --- |
| `loading` | **진행 중** | `--color-status-pending` (`#f59e0b`) | 텍스트 라벨 + 선택적 글리프 `⏳`(aria-hidden) | 미표시 (초기값) |
| `ready` | **전달 완료** | `--color-status-success` (`#16a34a`) | 텍스트 라벨 + 선택적 글리프 `✓`(aria-hidden) | ISO→사람이 읽는 형식 표시 |
| `error` | **오류** | `--color-status-error` (`#dc2626`) | 텍스트 라벨 + 선택적 글리프 `!`(aria-hidden) | 파싱 가능 시 표시, 불가 시 미표시 |
| `forbidden` | **권한 없음** | `--color-status-error` (`#dc2626`) | 텍스트 라벨 + 선택적 글리프 `⊘`(aria-hidden) | 미표시 (`updatedAt: null`) |

- **초기 상태 = `loading`**. 초기화/취소/실패 뒤 상태·진행 표시는 초기값(`loading`)으로 복원되고
  주 실행 control을 다시 사용 가능해야 한다 (AC-7).
- `error`와 `forbidden`은 같은 색 토큰(`--color-status-error`)을 공유하므로 **텍스트 라벨("오류" vs
  "권한 없음")이 두 상태를 구분하는 유일·필수 단서**다 → 색상 단독 구분 금지 원칙 충족.
- 글리프는 **선택적 장식(비색상 보조 단서)** 이며 `aria-hidden="true"` 로 스크린리더에서 숨긴다.
  글리프를 생략해도 계약(텍스트 라벨)은 만족한다 → developer 픽셀·글리프 일치 의무 없음.

### 5.2 각 상태의 시각 속성 (mockup / json 동기화)

각 상태는 `phase21-validation/data/delivery-status.json`의 `states.<name>` 항목과 1:1 동기화된다.

| 상태 | 배지 배경 | 배지 텍스트색 | 라벨 | timestampVisible |
| --- | --- | --- | --- | --- |
| `loading` | `#f59e0b` | `#1f2937` | 진행 중 | false |
| `ready` | `#16a34a` | `#ffffff` | 전달 완료 | true |
| `error` | `#dc2626` | `#ffffff` | 오류 | 조건부(파싱 성공 시) |
| `forbidden` | `#dc2626` | `#ffffff` | 권한 없음 | false |

### 5.3 인터랙션 / 상태 전이

- 컴포넌트는 API(`GET /api/phase21-validation/delivery-status`) 응답으로 상태를 갱신한다.
- 상태 변경 시 root의 `aria-live="polite"`가 새 라벨을 스크린리더에 안내한다.
- 정적 hover/focus는 본 배지에 필수 아님(정보 표시 컴포넌트). 갱신 시각 `<time>`은 `datetime`
  속성에 원본 ISO 8601 값을 보존한다(§5.4).

### 5.4 갱신 시각 표시 규칙 (frozen §4.5)

- 원본은 항상 ISO 8601 UTC(`YYYY-MM-DDTHH:mm:ssZ`).
- 화면에는 사람이 읽는 형식(예: `2026-07-31 18:15 (KST)` 또는 `2026-07-31 09:15 UTC`)으로 변환.
- 원본 ISO 값은 `#delivery-status-timestamp`의 `datetime`/접근성 이름으로 **보존**.
- `updatedAt`이 `null`이거나 파싱 불가면 갱신 시각 영역을 **표시하지 않는다** (E1, E7).

---

## 6. dev 구현 가이드 (developer(BF-1372)용 — additive)

> selector·token·라벨은 아래 값 **그대로** 사용. 신규 selector/token 도입 금지.

1. **root**: `#delivery-status-root.delivery-status` 에 `aria-live="polite"` 부여.
   - CSS: `display:flex; align-items:center; gap:var(--space-badge-gap); flex-wrap:wrap;`
2. **배지**: `#delivery-status-badge.delivery-status__badge`.
   - 공통 CSS: `padding:4px 10px; border-radius:999px; font-weight:600; font-size:0.875rem;`
   - 상태별 배경/전경은 §5.2 표를 상태 class 또는 인라인 style로 적용
     (권장 상태 훅 class 예: `is-loading` / `is-ready` / `is-error` / `is-forbidden`).
     상태 훅은 BEM base class를 대체하지 않고 **추가**한다.
3. **갱신 시각**: `#delivery-status-timestamp.delivery-status__timestamp`, 시맨틱 `<time datetime="...">`.
   - `font-size:0.75rem;`, 미표시 시 DOM에서 감추거나 빈 텍스트(§5.4).
4. **token 선언**: `:root` 에 frozen 4개 token 선언(색 3개 + `--space-badge-gap`).
   `#16a34a / #f59e0b / #dc2626 / 8px` 하드코딩 대신 변수 참조.
5. **반응형**: `@media (max-width:479px){ #delivery-status-root{flex-direction:column; align-items:flex-start;} }`
6. **상태 복원(AC-7)**: reset 시 상태를 `loading`으로, 갱신 시각 미표시로 되돌린다.
7. **접근성**: 색상만으로 상태를 나타내지 말 것 — 라벨 텍스트 필수, 글리프는 `aria-hidden="true"`.

### 권장 CSS 변수·클래스 요약

| 종류 | 이름 | 비고 |
| --- | --- | --- |
| 변수 | `--color-status-success` / `--color-status-pending` / `--color-status-error` / `--space-badge-gap` | frozen |
| base class | `.delivery-status` / `.delivery-status__badge` / `.delivery-status__timestamp` | frozen |
| 상태 훅 class(권장) | `.is-loading` / `.is-ready` / `.is-error` / `.is-forbidden` | additive, 선택 |

---

## 7. mockup 참조

- 파일: `docs/design/mockups/delivery-status-BF-1370.html`
- 내용: 4개 상태(loading / ready / error / forbidden) 배지를 frozen token 색·라벨로 시각화하고,
  가로(≥480px)·세로(≤479px) 반응형 재배치를 별도 섹션으로 시뮬레이션.
- self-contained 단일 HTML(외부 의존성 0건, `:root`에 frozen token 정의).
- ⚠️ mockup은 시안 시각화 전용 — developer 실제 산출물이 아니며 픽셀 일치 의무 없음.

---

## Self-critique

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC-1(loading 초기값·aria-live) §5.1/§6-1·6, AC-2(ready+시각) §5.2/§5.4, AC-3(error) §5.1, AC-4(forbidden·시각 미표시) §5.1/§5.4, AC-5(접근성) §5.1/§6-7, AC-6(반응형) §4.3/§6-5, AC-7(복원) §5.1/§6-6 — 전 AC 커버 |
| 2 | **dev 구현 가이드** | §6에 selector·token·CSS 스니펫·미디어쿼리·상태 훅 단계별 제공 |
| 3 | **기존 요소 보존** | frozen selector/token/라벨 재정의 0건. scaffold의 `updated-at` 명명 차이는 §4.1에서 "developer가 계약값으로 정렬"로 안내(재정의 아님, additive) |
| 4 | **컴포넌트 매핑** | root/badge/timestamp 3개 DOM 노드 ↔ §4.1 표 ↔ json `dom` 1:1 매핑 |
| 5 | **모호함 flag** | `error` 상태 갱신 시각은 "파싱 성공 시 조건부 표시"로 §5.4/E1에 근거 명시. `loading` 시각 미표시로 확정. 남은 판단(정확한 시각 로컬라이즈 포맷)은 developer 재량으로 위임 명시 |

### flag (developer 확인 요망)
- 갱신 시각의 최종 표기 포맷(KST vs UTC 표기)은 frozen 계약이 "사람이 읽는 형식"까지만 규정하므로
  developer가 화면 컨텍스트에 맞게 결정. 원본 ISO 8601 보존 규칙만 필수(§5.4).
