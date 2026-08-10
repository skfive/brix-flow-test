# BF-1923 · 색상 팔레트 화면 시각 명세

> 이 문서는 BF-1922 Epic frozen `ui-contract@v1`(interface_checksum
> `sha256:5e09d7cb...0206a55`) 와 이를 구체화한 `docs/plans/BF-1922/implementation-plan.md`
> (BF-1925, planner)를 **재정의하지 않고** 시각 명세로 구체화한 문서입니다.
> domIds / cssClasses / states / designTokens 는 frozen 목록을 그대로 사용하며,
> 새 selector·새 상태·새 토큰(frozen 5종 대체 목적)을 추가하지 않습니다.
>
> **범위 제약**: 이 task 의 acceptance criteria 에 따라 산출물은 본 markdown 1건이며,
> 별도 mockup HTML(런타임 HTML/CSS/JS)은 생성하지 않습니다. 시각 레이아웃은 §4 의
> ASCII 다이어그램과 서술로 대체합니다.

## 1. 시안 개요

- **변경 범위**: 기준색 1개를 입력받아 보색·유사색·삼각 배색 3종 팔레트를 카드 목록으로
  보여주고, 카드를 클릭/키보드로 활성화하면 HEX 값을 클립보드에 복사하는 단일 화면
  (`color-palette.html`, developer BF-1924 소유)의 시각 레이아웃·타이포·접근성·반응형 명세.
- **사용자 경험 목표**:
  1. 기준색 입력 → 팔레트 재계산까지 지연 없이(디바운스 150ms) 체감되는 즉시성.
  2. 카드 배경색만으로 정보를 전달하지 않고, HEX 텍스트 + 명도 기반 대비 텍스트색으로
     항상 값이 읽히도록 보장.
  3. 마우스 없이 Tab/화살표/Enter·Space 만으로 전체 플로우(입력 → 탐색 → 복사)가 가능.
  4. 320px 폭에서도 카드가 잘리거나 넘치지 않고 자연스럽게 줄바꿈.
- **비목표**: 팔레트 영속 저장, 서버 API, 신규 selector/토큰 — `implementation-plan.md` §9 와 동일.

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (그대로 사용 — 재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-text-on-light` | `#111111` | 밝은 배경(`brightness >= 128`) `.color-card__hex` 글자색 |
| `--color-text-on-dark` | `#ffffff` | 어두운 배경(`brightness < 128`) `.color-card__hex` 글자색 |
| `--color-focus-ring` | `#2563eb` | `.color-card` 포커스 아웃라인(배경 밝기 무관, 고정) |
| `--space-card-gap` | `12px` | `.palette-section__cards` 내 카드 간 간격 |
| `--radius-card` | `8px` | `.color-card` 모서리 반경 |

`.color-card` 배경색 자체는 고정 팔레트가 아니라 `implementation-plan.md` §3(HSL 회전 공식)에
따라 기준색 입력값으로부터 **런타임에 계산**됩니다. 이 문서는 그 색상값을 지정하지 않으며,
계산 로직은 재정의하지 않습니다.

### 2.2 화면 크롬(chrome) 보조 토큰 (frozen 목록 밖 — designer 제안, dev 재량)

frozen `design_tokens` 에는 카드/텍스트/포커스 관련 5종만 있고 배경·패널·라벨 색상은
정의돼 있지 않습니다. 아래는 vanilla-static 스택(외부 의존성 0, CSS 변수 자체 정의)
관례에 맞춘 **보조 제안값**이며, frozen 토큰과 충돌하지 않는 선에서 dev 가 그대로 쓰거나
동등한 값으로 조정 가능합니다.

| 제안 토큰 | 값 | 용도 |
|---|---|---|
| `--color-page-bg` | `#f8fafc` | `<body>` 배경 |
| `--color-panel-bg` | `#ffffff` | `.base-color-panel`, `.palette-section` 배경 |
| `--color-panel-border` | `#e2e8f0` | 패널/섹션 테두리 |
| `--color-heading-text` | `#0f172a` | `.palette-section__title` 글자색 |
| `--color-label-text` | `#334155` | `label`(기준 색상, HEX) 글자색 |
| `--color-feedback-text` | `#334155` | `#copy-feedback` idle/computing 상태 글자색 |
| `--color-feedback-error` | `#b91c1c` | `#copy-feedback` invalid 상태 글자색 |
| `--color-feedback-success` | `#15803d` | `#copy-feedback` copied 상태 글자색 |

## 3. 타이포그래피

vanilla-static 관례: 외부 폰트 로드 없이 system font stack 사용.

```
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard,
                     "Apple SD Gothic Neo", sans-serif;
--font-family-mono: ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace;
```

| 용도 | 대상 | font-family | size | weight | line-height |
|---|---|---|---|---|---|
| Heading | `.palette-section__title` | base | 18px (1.125rem) | 600 | 1.4 |
| Body/Label | `label[for=base-color-input]`, `label[for=base-color-hex]` | base | 15px (0.9375rem) | 400 | 1.5 |
| Body/Input | `#base-color-hex` | mono | 15px (0.9375rem) | 500 | 1.5 |
| Card value | `.color-card__hex` | mono | 14px (0.875rem) | 600 | 1.3 |
| Caption/Status | `#copy-feedback` | base | 13px (0.8125rem) | 500 | 1.4 |

`.color-card__hex` 는 mono 폰트를 사용해 HEX 6자리가 카드 폭 안에서 안정적으로
정렬되도록 합니다(§5 대비 규칙과 별개로 가독성 목적).

## 4. 레이아웃

### 4.1 전체 구조 (desktop, ≥480px)

```
┌───────────────────────────────────────────────────────────┐
│ #color-palette-root  (max-width 720px, margin: 0 auto,     │
│                        padding: 24px)                      │
│                                                             │
│  ┌─ .base-color-panel ──────────────────────────────────┐  │
│  │ [기준 색상] [🎨 #base-color-input]                    │  │
│  │ [HEX]      [#base-color-hex: #2563EB____]             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ #palette-complementary (.palette-section) ───────────┐  │
│  │ 보색 (Complementary)                                   │  │
│  │ [card][card]                                           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌─ #palette-analogous (.palette-section) ────────────────┐  │
│  │ 유사색 (Analogous)                                      │  │
│  │ [card][card][card]                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌─ #palette-triadic (.palette-section) ──────────────────┐  │
│  │ 삼각 배색 (Triadic)                                     │  │
│  │ [card][card][card]                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  #copy-feedback  (예: "#DB6725 복사됨")                     │
└───────────────────────────────────────────────────────────┘
```

- `#color-palette-root`: 세로 flex(`flex-direction: column`), 요소 간 간격 20px,
  `max-width: 720px`, 좌우 auto margin 으로 중앙 정렬, 좌우 여백 최소 16px(작은 화면 대비).
- `.base-color-panel`: 가로 flex(`flex-wrap: wrap`), 라벨-입력 쌍 2개를 gap 16px 로 배치.
  좁은 화면에서는 각 라벨-입력 쌍이 자체적으로 줄바꿈됩니다(별도 breakpoint 불필요,
  flex-wrap 만으로 처리).
- `.palette-section`: 세로 flex, 상단에 `.palette-section__title`, 하단에
  `.palette-section__cards`. 패널 배경/테두리는 §2.2 보조 토큰 사용, padding 16px,
  radius 는 `--radius-card` 재사용 가능(또는 더 큰 값으로 dev 재량).
- `.palette-section__cards`: `display: flex; flex-wrap: wrap; gap: var(--space-card-gap)`.
  각 `.color-card` 는 `flex: 0 0 96px; height: 96px` (정사각형), 내부 `.color-card__hex` 는
  `display: flex; align-items: center; justify-content: center`.
- `#copy-feedback`: `.base-color-panel` 과 동일한 좌우 정렬 기준으로 하단 고정 텍스트 라인
  (별도 토스트/오버레이 아님 — 항상 DOM 에 존재하고 텍스트만 상태별로 교체, §6 참조).

### 4.2 반응형 (frozen 요구 — 구체화)

| 브레이크포인트 | 동작 |
|---|---|
| **320px (최소)** | `.palette-section__cards` 가 `flex-wrap: wrap` 으로 카드가 다음 줄로 넘어감. `.color-card` 최소 크기(96px)는 유지하되 `.palette-section`, `.base-color-panel` 의 좌우 padding 을 12px 로 축소해 overflow 방지. `.base-color-panel` 의 두 라벨-입력 쌍도 세로로 줄바꿈됨. |
| **< 480px** | 3개 `.palette-section`(`#palette-complementary`, `#palette-analogous`, `#palette-triadic`)이 세로 스택(`#color-palette-root` 의 기본 `flex-direction: column` 그대로 — 별도 media query 불필요, 애초에 가로 배치를 만들지 않음). |
| **≥ 480px** | 동일하게 세로 스택 유지(§4.1 다이어그램 기준). 3개 섹션을 가로로 나란히 배치하는 것은 frozen 요구에 없으므로 임의로 추가하지 않음(추측성 레이아웃 금지). |

카드 간 간격은 모든 뷰포트에서 `--space-card-gap`(12px), 모서리는 `--radius-card`(8px)로
고정합니다(frozen §7 그대로).

## 5. 명도 기반 텍스트 대비 규칙 (frozen — 재확인)

`implementation-plan.md` §5 공식을 그대로 따릅니다. 이 문서는 재정의하지 않고 시각적으로만
부연합니다.

```
brightness = (R*299 + G*587 + B*114) / 1000
brightness >= 128 → .color-card__hex 색상 = var(--color-text-on-light)  /* #111111 */
brightness <  128 → .color-card__hex 색상 = var(--color-text-on-dark)   /* #ffffff */
```

시각적으로 두 케이스 모두 카드 배경 위에서 최소 4.5:1 이상의 문자 대비를 목표로 하되,
실제 대비 비율 계산·검증은 이 문서 범위가 아니라 §3 색상 계산(구현) 범위입니다.

## 6. 컴포넌트 명세

### 6.1 `.base-color-panel` (frozen class)

- **구성**: `label[for=base-color-input]` + `#base-color-input`(type=color),
  `label[for=base-color-hex]` + `#base-color-hex`(type=text).
- **상태**: 자체 상태 없음 — 값 변경이 전역 상태(§6.5)를 트리거하는 입력 소스.
- **인터랙션**:
  - `#base-color-input` `change` → `computing` 상태 트리거(디바운스 150ms).
  - `#base-color-hex` `input`/`blur` → 패턴 검사 후 유효하면 `computing`, 무효하면 `invalid`.
  - 두 입력은 서로 동기화되어야 함(하나가 바뀌면 다른 하나도 갱신) — 구현 세부는
    `implementation-plan.md` 범위, 이 문서는 시각적 요구만: 두 필드는 항상 같은 값을 보여준다.

### 6.2 `.palette-section` × 3 (`#palette-complementary` / `#palette-analogous` / `#palette-triadic`, frozen ids/class)

- **props(정적)**: `aria-label`(팔레트명), `.palette-section__title` 텍스트("보색
  (Complementary)" 등, `implementation-plan.md` 원문 그대로 사용).
- **구성**: 제목 1개 + `.palette-section__cards` 안에 `.color-card` N개(보색 2 / 유사색 3 /
  삼각 배색 3, §4.3 순서 고정).
- **상태**: 섹션 자체 상태 없음 — 내부 카드가 재계산되면 콘텐츠만 교체(`computing` →
  `idle` 전이 시 카드 HEX/배경색 갱신).

### 6.3 `.color-card` (frozen class, 팔레트 섹션당 반복)

- **props**: `hex`(계산된 `#RRGGBB`), `index`(팔레트 내 순번), `paletteName`(소속 섹션명) →
  `aria-label="{팔레트명} {순번} - {HEX}"` 형태로 조합(예: `aria-label="보색 2 - #DB6725"`).
- **시각 상태**:
  - 기본: 배경색 = 계산된 HEX, 텍스트색 = §5 규칙.
  - hover(포인터 환경): `cursor: pointer`, 미세한 `box-shadow` 또는 `filter: brightness(0.96)`
    등 배경 위 대비를 해치지 않는 가벼운 변화(구체 값은 dev 재량 — frozen 토큰 아님).
  - focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
    (배경 밝기와 무관하게 항상 동일 — §5 와 별개 규칙, frozen 요구 그대로).
  - active/copied 순간: 클릭 즉시 시각 피드백(예: `outline` 유지 + `#copy-feedback` 텍스트
    갱신)으로 "복사됨"을 알림 — 색상 변화만으로 상태를 표현하지 않고 반드시
    `#copy-feedback` 텍스트가 동반됨(§8 접근성 요구).
- **인터랙션**:
  - `tabindex="0"`, `role="button"` — Tab 으로 순차 포커스.
  - 같은 `.palette-section` 안에서 좌/우(또는 상/하) 화살표 키로 인접 카드 포커스 이동.
    섹션 경계를 넘어가는 이동은 정의하지 않음(각 섹션 내부로 한정 — frozen §6 문구
    "같은 .palette-section 안에서" 그대로).
  - `Enter` 또는 `Space` → 클릭과 동일하게 클립보드 복사 트리거, `copied` 상태 진입.
  - `click` → 클립보드 복사 트리거.

### 6.4 `#copy-feedback` (frozen id)

- **속성**: `role="status"`, `aria-live="polite"` (frozen).
- **상태별 텍스트(예시 — 정확한 문구는 `implementation-plan.md` §4 기준)**:
  - `idle`: 빈 텍스트 또는 중립 안내.
  - `computing`: "계산 중"(선택적 노출).
  - `invalid`: "잘못된 HEX 형식입니다" (글자색 `--color-feedback-error`).
  - `copied`: "{HEX} 복사됨" (글자색 `--color-feedback-success`), 1500ms 후 `idle` 복귀.
- **시각 배치**: `#color-palette-root` 하단, 팔레트 섹션들과 동일한 좌우 여백 기준으로
  한 줄 텍스트. 별도 모달/토스트 오버레이로 구현하지 않음(항상 레이아웃 내 고정 위치 —
  포커스 이동이나 레이아웃 시프트를 유발하지 않기 위함).

### 6.5 전역 상태 모델 (frozen: idle / computing / invalid / copied)

시각적으로는 화면 어디에도 "상태 배지"를 별도로 두지 않고, `#copy-feedback` 텍스트 +
글자색(§6.4) 조합만으로 상태를 노출합니다. 상태 전이 규칙 자체는
`implementation-plan.md` §4 를 그대로 따르며 이 문서에서 재정의하지 않습니다.

## 7. 접근성 (frozen — 시각 구체화)

- `.color-card` 의 `aria-label` 은 화면에 보이는 HEX 텍스트와 동일한 정보를 포함해
  스크린리더 사용자도 어떤 카드인지 구분 가능해야 합니다(§6.3).
- `#copy-feedback` 은 `aria-live="polite"` 로 상태 전이(특히 `invalid`, `copied`)를
  능동적으로 알리므로, 시각적으로도 같은 텍스트가 동시에 보여야 합니다(스크린리더 전용
  텍스트로 숨기지 않음).
- 키보드 전용 사용자를 위한 focus-visible 아웃라인(`--color-focus-ring`)은 배경색과
  무관하게 항상 충분한 대비(파란색 `#2563eb`)를 가지므로 밝은/어두운 카드 모두에서
  식별 가능합니다.
- 4개 상태(`idle/computing/invalid/copied`)는 색상만으로 구분하지 않고 `#copy-feedback`
  텍스트 문구로 항상 구분됩니다(§6.4).

## 8. dev 구현 가이드

1. `color-palette.html` 최상위에 `:root` CSS 변수 블록을 두고 §2.1 frozen 토큰 5종 +
   §2.2 제안 토큰(선택)을 `--` 커스텀 프로퍼티로 선언합니다. frozen 토큰 이름/값은
   변경하지 않습니다.
2. `.base-color-panel` 은 `display:flex; flex-wrap:wrap; gap:16px;` 로 구현해 §4.2
   320px 대응을 별도 media query 없이 처리합니다.
3. `.palette-section__cards` 는 `display:flex; flex-wrap:wrap; gap:var(--space-card-gap);`.
   `.color-card` 는 `flex:0 0 96px; height:96px; border-radius:var(--radius-card);`.
4. `.color-card` 배경색은 인라인 스타일(`style="background-color:#RRGGBB"`) 또는
   `element.style.backgroundColor` 로 런타임 설정(§3 계산 결과), 클래스 기반 고정 팔레트를
   만들지 않습니다.
5. 텍스트색 전환은 §5 공식으로 계산한 `brightness` 값에 따라 인라인 또는 클래스 토글로
   `var(--color-text-on-light)` / `var(--color-text-on-dark)` 를 적용합니다.
6. 포커스 스타일은 CSS `:focus-visible { outline: 2px solid var(--color-focus-ring);
   outline-offset: 2px; }` 로 한 곳에서 전역 관리(배경 대비 로직과 분리).
7. 키보드 이동(화살표 키)은 각 `.palette-section` 스코프 내에서 `querySelectorAll('.color-card')`
   순서를 기준으로 다음/이전 카드에 `.focus()` 호출. 섹션 밖으로 넘어가는 로직은 만들지
   않습니다(§6.3).
8. `#copy-feedback` 텍스트/색상 갱신과 1500ms 타임아웃 복귀는 `implementation-plan.md` §4
   상태표를 그대로 구현하며, 텍스트 문구는 이 문서 §6.4 예시를 참고하되 최종 문구는 dev
   재량(문구 자체는 frozen 이 아님 — 상태 종류와 트리거만 frozen).
9. 320px 뷰포트 QA 시 `.palette-section`, `.base-color-panel` 좌우 padding 을 12px 로
   낮춰 실제로 overflow 가 없는지 브라우저 개발자도구 반응형 모드로 확인합니다.

## 9. mockup 참조

이번 task 의 acceptance criteria(§`시각 명세 범위는 docs/design/BF-1922/color-palette-contract.md이며
런타임 HTML/CSS/JS를 생성하지 않는다`)에 따라 별도 mockup HTML 파일은 생성하지 않았습니다.
시각 레이아웃은 §4 ASCII 다이어그램과 §6 컴포넌트 명세로 대체합니다. 실제 시각 검증은
developer(BF-1924)가 구현한 `color-palette.html` 로 진행합니다.
