# 뽀모도로 타이머 UI 시안 — BF-2084 (Epic BF-2083)

> planner(BF-2086)가 `docs/plans/BF-2083/implementation-plan.md` §3에서 동결한 `ui-contract@v1`을
> 시각 명세로 구체화한 문서다. 아래 DOM id·CSS class·디자인 토큰·상태명·접근성·반응형 요구는
> frozen 계약 그대로이며 이 문서는 이를 재정의하지 않는다. 참조 mockup:
> `docs/design/pomodoro-mockup-BF-2083.html`.

## 0. 해석이 필요했던 지점 (가정 명시)

frozen 계약은 `#timer-display`, `#timer-count` 두 id를 모두 정의하지만 각각이 무엇을
표시하는지 텍스트로 명시하지 않는다. 접근성 요구사항 원문 "남은 시간 표시 영역
(`#timer-display`)은 `aria-live=\"polite\"`로 스크린리더에 갱신을 알린다"는 `#timer-display`
자체가 잔여시간(`formatTime(remainingSeconds)`) 텍스트를 직접 담는 요소임을 가리킨다.
따라서 이 문서는 다음과 같이 해석하고 진행한다.

- **`#timer-display`** = 잔여시간 텍스트("MM:SS") 그 자체가 들어가는 요소 (`aria-live="polite"`).
- **`#timer-count`** = 상태 전이표(§1.4, planner 계획서)의 `cycleCount`(완료된 focus 세션 누적
  횟수)를 노출하는 보조 카운터. `remainingSeconds`와는 무관.

두 id 중 어느 것도 이름을 바꾸거나 제거하지 않았으며, 위 해석에 이견이 있으면 dev/reviewer가
PR에서 바로잡을 수 있도록 이 섹션에 명시해 둔다.

또한 planner 계획서 §1.1 "`paused`는 별도 모드 class가 아니라 `isRunning=false`로 표현되는
상태이며, 화면 텍스트/색상은 직전 `phase` 값을 그대로 유지한다"는 표현을 그대로 따라
**paused 상태에서 `#timer-mode` 텍스트를 별도 문구로 바꾸지 않는다** — 표시는 진행 중과
동일("집중"/"짧은 휴식"/"긴 휴식")하고, 실행/일시정지 구분은 `#btn-start`/`#btn-pause`의
활성·비활성 상태로만 전달한다.

## 1. 시안 개요

- **변경 범위**: `pomodoro/` 앱의 타이머 화면(frozen 계약 §3.1~§3.7 기준) 레이아웃·컬러·
  타이포·상태별 시각 표현을 정의한다. developer(BF-2085)가 이 명세대로
  `pomodoro/index.html` 등 4개 파일을 소유·구현한다.
- **사용자 경험 목표**:
  - 집중 / 짧은 휴식 / 긴 휴식 3개 모드를 배경색만으로 구분하지 않고, `#timer-mode` 텍스트를
    항상 함께 노출해 색맹·저시력 사용자도 동일 정보를 얻게 한다.
  - 잔여시간 숫자(`#timer-display`)를 화면에서 가장 큰 시각 요소로 두어 "지금 얼마나
    남았는지"를 한눈에 파악하게 한다.
  - 시작 / 일시정지 / 리셋 3개 컨트롤은 항상 손쉽게 탭 가능한 크기를 유지해 모바일에서도
    오조작이 없게 한다.
  - 4번째 집중 세션마다 긴 휴식으로 전환되는 리듬을 `#timer-count`(완료 세션 수)로 은근히
    드러내 사용자가 진행 상황을 추적할 수 있게 한다.

## 2. 컬러 팔레트 (frozen 토큰 그대로 — 재정의 금지)

| 역할 | CSS 변수 | HEX | 사용처 |
|---|---|---|---|
| 집중 배경 | `--color-focus-bg` | `#fef3f2` | `.timer.mode-focus` 배경 |
| 짧은 휴식 배경 | `--color-short-break-bg` | `#f0fdf4` | `.timer.mode-short-break` 배경 |
| 긴 휴식 배경 | `--color-long-break-bg` | `#eff6ff` | `.timer.mode-long-break` 배경 |
| 본문 텍스트 | `--color-text-primary` | `#1f2937` | 카드 내부 모든 텍스트 기본색 |

**보조 토큰 (frozen 목록에 없음 — additive, 재정의 아님)**

frozen 계약은 버튼 표면색·보더·비활성 상태를 지정하지 않는다. 계약을 침범하지 않는 범위에서
아래 보조 토큰을 추가로 정의해 버튼과 보조 텍스트를 표현한다. 세 모드 배경이 이미 유채색이므로
보조 톤은 전부 `--color-text-primary`의 투명도 변주로만 만들어 모드별 배경과 항상 대비를 이룬다.

| 역할 | CSS 변수 | 값 | 사용처 |
|---|---|---|---|
| 버튼 표면 | `--color-button-bg` | `#ffffff` | `.timer__button` 기본 배경 |
| 버튼 강조 표면 (start) | `--color-button-primary-bg` | `var(--color-text-primary)` | `#btn-start` 배경, 텍스트는 `#ffffff` |
| 버튼 보더 | `--color-button-border` | `rgba(31, 41, 55, .16)` | 모든 `.timer__button` 테두리 |
| 보조 텍스트 | `--color-text-muted` | `rgba(31, 41, 55, .60)` | `#timer-count` 캡션, disabled 버튼 텍스트 |

## 3. 타이포그래피

frozen 계약은 `--font-family-base` 하나만 지정한다. 이 문서는 별도 서체를 도입하지 않고
frozen 스택 하나로 위계를 만든다 — 크기·굵기·자간·`font-variant-numeric: tabular-nums`
조합만으로 큰 숫자와 작은 라벨을 구분한다.

| 용도 | font-family | size | weight | line-height | 대상 |
|---|---|---|---|---|---|
| Heading (잔여시간) | `var(--font-family-base)`, `font-variant-numeric: tabular-nums` | `clamp(56px, 16vw, 120px)` | 700 | 1.0 | `#timer-display` |
| Mode 라벨 | `var(--font-family-base)` | `18px`, `letter-spacing: .04em` | 600 | 1.3 | `#timer-mode` |
| Body (버튼) | `var(--font-family-base)` | `16px` | 600 | 1.2 | `.timer__button` 라벨 |
| Caption | `var(--font-family-base)` | `14px` | 500 | 1.3 | `#timer-count` |

- `#timer-display`는 반드시 `font-variant-numeric: tabular-nums`를 적용해 초 단위 갱신 시
  자릿수가 흔들리지 않게 한다.
- 모든 텍스트 색은 `--color-text-primary` 또는 `--color-text-muted` 중 하나만 사용한다
  (모드 배경이 파스텔이므로 별도 텍스트 색상을 모드마다 바꾸지 않는다).

## 4. 레이아웃

### 4.1 구조 (mockup "기본 구조" 패널과 1:1 반영)

```
.timer.mode-focus (#timer-mode 부모 — 별도 id 없음, class로만 상태 표현)
├─ .timer__mode (#timer-mode)      // "집중" / "짧은 휴식" / "긴 휴식"
├─ .timer__display (#timer-display, aria-live="polite")   // "25:00"
├─ .timer__count (#timer-count)    // "완료 세션 0회"
└─ .timer__controls
     ├─ .timer__button (#btn-start, aria-label="시작")
     ├─ .timer__button (#btn-pause, aria-label="일시정지")
     └─ .timer__button (#btn-reset, aria-label="리셋")
```

- 루트 `.timer`에는 별도 id가 없다(frozen 목록에 `#timer` id가 없음) — `pomodoro/index.html`의
  최상위 컨테이너 역할만 하며 `mode-focus`/`mode-short-break`/`mode-long-break` 클래스만 토글한다.
- 콘텐츠 최대 너비: `min(480px, 100% - 32px)`, 뷰포트 전체 높이를 모드 배경색으로 채운다
  (`min-height: 100vh`, `display: flex; align-items: center; justify-content: center;`).
- 세로 stack, 요소 간 기본 gap `16px`. `.timer__display`와 `.timer__mode` 사이만 `8px`로 좁혀
  숫자와 라벨이 하나의 그룹처럼 보이게 한다.
- `.timer__controls` 내부 버튼 간 gap `12px`.

### 4.2 Breakpoint 동작 (frozen §3.6 그대로)

| 조건 | 동작 |
|---|---|
| ≥768px | `.timer__controls`는 가로 배치(`flex-direction: row`), 버튼 3개가 한 줄, 각 버튼 `min-width: 120px` |
| <768px | `.timer__controls`는 세로 stack(`flex-direction: column`), 각 `.timer__button`은 `width: 100%` |
| ≥320px 전 구간 | `box-sizing: border-box`와 `clamp()` 텍스트 크기로 가로 overflow가 발생하지 않는다 |
| 모든 뷰포트 | `.timer__button`은 `min-height: 44px`를 유지해 탭 영역을 확보한다 |

## 5. 컴포넌트 명세

### 5.1 `.timer` (루트, id 없음)

- **props**: `mode: 'focus' | 'short-break' | 'long-break'` → 대응 `mode-*` 클래스 1개만 부여.
- **상태**: `isRunning`은 `.timer` 자체 클래스에 반영하지 않는다(§0 해석 — paused는 배경/텍스트
  불변). 버튼 활성 상태로만 표현.
- **인터랙션**: 없음(컨테이너).

### 5.2 `#timer-mode` (`.timer__mode`)

- **내용**: 현재 `phase`의 고정 문구 — `focus`="집중", `short-break`="짧은 휴식",
  `long-break`="긴 휴식". `isRunning` 값과 무관하게 `phase`만 반영한다(§0).
- **접근성**: 시각 텍스트 자체가 상태명이므로 별도 `aria-live` 불필요(전이 시점에 함께
  갱신되는 시각 텍스트로 충분). 색상만으로 모드를 구분하지 않는다는 frozen 접근성 요구를
  이 요소가 직접 충족한다.

### 5.3 `#timer-display` (`.timer__display`)

- **내용**: `formatTime(remainingSeconds)` 결과("MM:SS"), 순수 텍스트.
- **상태**: `isRunning=true`면 매초 갱신, `isRunning=false`(paused)면 갱신이 멈추고 마지막 값을
  그대로 표시한다.
- **접근성**: `aria-live="polite"` (frozen 요구, §3.5) — 값이 바뀔 때마다 스크린리더가 읽는다.
  매초 읽으면 소음이 되므로 실제 갱신 주기는 dev 구현 가이드(§6-5)에서 완화 방법을 안내한다.

### 5.4 `#timer-count` (`.timer__count`)

- **내용**: "완료 세션 {cycleCount}회" (§0 해석). `cycleCount=0`이면 "완료 세션 0회".
- **상태**: focus 세션이 시간 만료로 완료될 때만 +1(계획서 §1.3). 리셋 시 0으로 복귀.
- **접근성**: 일반 텍스트, 별도 `aria-live` 불필요(빈도가 낮고 `#timer-mode` 전이와 함께
  자연스럽게 읽힘).

### 5.5 컨트롤 버튼 3종 (`.timer__button`)

| id | 라벨(텍스트) | `aria-label` | `isRunning=false`(초기/paused) | `isRunning=true` |
|---|---|---|---|---|
| `#btn-start` | "시작" | "시작" | 활성 | 비활성(disabled) |
| `#btn-pause` | "일시정지" | "일시정지" | 비활성(disabled) | 활성 |
| `#btn-reset` | "리셋" | "리셋" | 항상 활성 | 항상 활성 |

- **시각**: `#btn-start`는 `--color-button-primary-bg` 배경(강조), `#btn-pause`/`#btn-reset`은
  `--color-button-bg` 배경 + `--color-button-border` 테두리. 공통 `border-radius: 999px`
  (pill 형태), `padding: 12px 24px`, `min-height: 44px`.
- **인터랙션**: 마우스 클릭 + Tab 포커스 + Enter/Space 키 활성화. DOM 순서(`btn-start` →
  `btn-pause` → `btn-reset`)가 곧 Tab 순서이며 frozen 접근성 요구(§3.5)를 그대로 충족한다.
  `:focus-visible`에 `2px solid var(--color-text-primary)` outline.
- **disabled 시각**: `opacity: .45`, `cursor: not-allowed`. 텍스트는 그대로 노출해 색상에만
  의존하지 않는다.

## 6. dev 구현 가이드 (developer BF-2085용)

1. `pomodoro/style.css`의 `:root`에 §2 표의 frozen 토큰 4개(`--color-focus-bg`,
   `--color-short-break-bg`, `--color-long-break-bg`, `--color-text-primary`)를 이름·값
   그대로 선언한다. 보조 토큰(`--color-button-bg` 등)은 이름 그대로 가져다 써도 되고 다른
   이름으로 대체해도 무방하다(non-frozen).
2. `pomodoro/index.html`은 §4.1 DOM 트리와 동일한 id/class를 사용한다. 순서·중첩 구조를
   바꾸지 않는다. 루트 `.timer`에는 `#timer` id를 새로 만들지 않는다(frozen 목록에 없음).
3. `pomodoro/pomodoro.js`에서 `nextPhase(state)` / `formatTime(seconds)` 순수 함수(계획서
   §2)로 상태를 계산하고, 별도 렌더 함수가 다음을 담당한다(관심사 분리):
   - `#timer-display.textContent = formatTime(state.remainingSeconds)`
   - `#timer-mode.textContent`를 §5.2 표대로 `phase` 기준으로만 갱신 (`isRunning`과 무관)
   - `#timer-count.textContent = `완료 세션 ${state.cycleCount}회``
   - `.timer` 루트의 `mode-focus`/`mode-short-break`/`mode-long-break` 클래스를 `phase` 기준
     1개만 남도록 토글
   - `#btn-start`/`#btn-pause`의 `disabled` 속성을 §5.5 표대로 토글 (`#btn-reset`은 항상 활성)
4. `#timer-display`의 `aria-live="polite"` 갱신이 매초 소음이 되지 않도록, 실제 값 변경은
   매초 DOM에 반영하되 스크린리더 낭독은 브라우저의 `aria-live` 기본 동작(연속 변경 시
   마지막 값 위주 낭독)에 맡긴다 — 별도 debounce 로직을 추가로 요구하지 않는다.
5. 리셋(`#btn-reset`)은 phase를 `focus`, `remainingSeconds`를 1500초, `cycleCount`를 0으로
   되돌리고 `isRunning=false`로 전환한다(계획서 §1.3 마지막 행) — `#btn-start`가 다시
   사용 가능해야 한다(frozen invariant).
6. 반응형은 `min-width: 768px` 미디어쿼리 하나로 `.timer__controls`를 `flex-direction: row`로
   전환하면 충분하다(§4.2). 그 미만은 기본값(column)을 그대로 둔다.
7. 색으로만 상태를 구분하지 말 것 — `#timer-mode` 텍스트 갱신을 `.timer` 배경색 전환과
   **항상 같은 시점에** 수행한다(frozen 접근성 요구).

## 7. mockup 참조

시각 mockup: [`docs/design/pomodoro-mockup-BF-2083.html`](./pomodoro-mockup-BF-2083.html)

mockup은 아래 패널로 구성된다.

1. **기본 구조 (집중 · 대기)** — frozen id 전체를 실제로 부여한 단일 인스턴스. `cycleCount=0`,
   `remainingSeconds=1500`("25:00"), `isRunning=false`(`#btn-start` 활성). `pomodoro/index.html`이
   그대로 참조할 정본(canonical) DOM.
2. **상태 갤러리** — 집중 실행 중 / 짧은 휴식 실행 중 / 긴 휴식 실행 중 / 집중 중 일시정지
   4개 시각 스냅샷. 갤러리 항목은 HTML id 유일성을 지키기 위해 `-focus-running` 등 접미사를
   붙인 **복제본**이며, 클래스명은 접미사 없이 frozen 이름 그대로 사용한다.
3. **컨트롤 상태 확대 보기** — `#btn-start`/`#btn-pause`의 활성·비활성·`:focus-visible` 시각을
   나란히 비교.

패널 구획, 안내 텍스트, 접미사가 붙은 갤러리 id는 mockup 전용 장치이며 frozen 계약이 아니다.
"기본 구조" 패널만 `pomodoro/index.html`의 구현 기준이다.

## 8. AC / 계약 요구사항 매핑 표

| 항목 | 요구 (frozen ui-contract / packet AC) | mockup·명세 반영 |
|---|---|---|
| domIds 일치 | `timer-display`, `timer-mode`, `timer-count`, `btn-start`, `btn-pause`, `btn-reset` 정확히 사용 | §4.1 DOM 트리, mockup "기본 구조" 패널 |
| cssClasses 일치 | `timer`, `timer__display`, `timer__mode`, `timer__count`, `timer__controls`, `timer__button`, `mode-focus`, `mode-short-break`, `mode-long-break` 정확히 사용 | §4.1, §5 전 항목 |
| designTokens 일치 | 4개 frozen 컬러 토큰 + `--font-family-base` 이름/값 변경 없이 사용 | §2, §3 |
| 초기 상태 | focus, 1500초, cycleCount=0, isRunning=false | mockup "기본 구조" 패널 |
| 모드 전이 시 텍스트+색상 동시 갱신 | §1.3 전이표 전체 | §5.2, §6-3, mockup 상태 갤러리 3종(focus/short-break/long-break) |
| paused 시 배경/텍스트 유지 | 계획서 §1.1 | §0 해석, §5.1, mockup "집중 중 일시정지" 패널 |
| 리셋 후 초기값 복귀 + 시작 버튼 재사용 | frozen invariant | §6-5, §5.5 표 |
| 버튼 aria-label | 시작/일시정지/리셋 3개 모두 명시적 `aria-label` | §5.5, mockup 마크업 |
| `#timer-display` aria-live | `aria-live="polite"` | §5.3, mockup 마크업 |
| Tab 순서 | 시작→일시정지→리셋 | §5.5, DOM 순서 |
| 색상만으로 상태 구분 금지 | 상태명을 텍스트로도 노출 | §5.2, §6-7 |
| 반응형 320px | overflow 없음 | §4.2, mockup CSS |
| 반응형 768px | 컨트롤 가로 정렬 | §4.2, mockup CSS 미디어쿼리 |
