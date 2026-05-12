# 타이머 SPA 디자인 명세 (BF-405)

> 관련 task: BF-406 (designer)
> mockup: [`docs/design/mockups/timer-BF-405.html`](mockups/timer-BF-405.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `timer/index.html` (또는 기존 notepad SPA 와 동일한 URL 진입점 `/timer`)
- 단일 카드 중심 레이아웃: **시간 입력 → large display(mm:ss) → 컨트롤 버튼 3종 → 종료 알림 배너**
- vanilla HTML/CSS/JS 기반 (현 프로젝트 `shadcn/ui` 미도입 — notepad-BF-400 명세와 토큰 시스템 공유)

### 1.2 사용자 경험 목표
- **한 눈에 남은 시간**: large display 가 화면의 시각적 중심. 멀리서도 mm:ss 가독.
- **즉시 시작·중단·재시작**: 가장 큰 primary 버튼 1개로 시작/일시정지를 토글하고, 보조 버튼으로 리셋
- **빈 상태(0:00) 가 곧 입력 상태**: 0:00 표시 옆에서 분/초 input 이 활성, 입력 즉시 display 동기
- **종료 시 명확한 시각 신호**: 진동·소리 없이 색·아이콘·짧은 텍스트만으로 종료 알림
- **키보드 단축**: `Space` 시작/일시정지 토글, `Esc` 리셋

### 1.3 비목표 (Out of Scope)
- **다중 타이머 동시 실행** (v1 은 단일 인스턴스만)
- **사운드 / 진동 알림** (시각 알림만. Web Audio / Vibration API 미사용)
- **브라우저 Notification API** 권한 요청 (포커스 외 탭 알림 후속 Epic)
- **프리셋·히스토리** (예: "3분", "포모도로 25분" quick chip — 후속 Epic)
- **시간 외 카운트업 (스톱워치) 모드** — v1 은 카운트다운만

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/notepad-BF-400.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth 유지). 타이머에만 필요한 토큰만 추가/확장.

### 2.1 색상 토큰 (재사용)

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드 표면 (timer card) |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 버튼 hover / input bg |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 표면 구분선 |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | input·button outline |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 본문·display |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | label·hint |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | placeholder·빈 상태 0:00 |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action (시작)·focus ring |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | 리셋 (destructive)·종료 강조 |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 타이머 전용 추가 토큰

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-timer-running` | `#1F8A5C` | `#3AAE7A` | running 상태 display 색 (carrying 동작 중) |
| `--color-timer-paused` | `#B7791F` | `#D4A23A` | paused 상태 display 색 |
| `--color-timer-ended-bg` | `#FFF1F1` | `#3A1F22` | 종료 알림 배너 배경 |
| `--color-timer-ended-border` | `#F4B5B5` | `#7A3A3F` | 종료 알림 배너 border |
| `--color-timer-ended-text` | `#9A2A2A` | `#FCB7B7` | 종료 알림 배너 텍스트 |

> running/paused 색은 **선택적 강조**입니다. v1 default 는 `--color-text-primary` 유지하고, 운영자 컨펌 시 (§13) 활성. mockup 은 default(primary) 색 적용.

### 2.3 공간 토큰 (재사용)

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자 (재사용)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` (input) |
| `--radius-md` | `8px` (button) |
| `--radius-lg` | `12px` (timer card) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` (light) / `0 4px 16px rgba(0,0,0,0.32)` (dark) |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **display-timer (desktop)** | **`128px` / `8rem`** | `300` | `1` | `-0.02em` | `--text-display` |
| **display-timer (≤959px)** | **`96px` / `6rem`** | `300` | `1` | `-0.02em` | `--text-display-md` |
| **display-timer (≤639px)** | **`72px` / `4.5rem`** | `300` | `1` | `-0.02em` | `--text-display-sm` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |
| **button-primary-lg** (시작/일시정지) | `16px` | `600` | `1` | `0` | `--text-button-lg` |

display 는 **`--font-mono`** 적용 — `mm:ss` 의 자릿수 변동(carrying) 시 가로폭 흔들림 방지. weight `300` 으로 굵기를 줄여 시각 잡음 최소화.

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar · "타이머"                                          │  56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│           ┌─────────────────────────────────┐            │
│           │                                 │            │
│           │            12 : 34              │ display    │
│           │                                 │ (128px)    │
│           │                                 │            │
│           │   ┌──┐  ┌──┐                   │            │
│           │   │분 │  │초 │  input pair       │  ↓ idle    │
│           │   └──┘  └──┘                   │   only     │
│           │                                 │            │
│           │   [▶ 시작]  [⟲ 리셋]            │  controls  │
│           │                                 │            │
│           └─────────────────────────────────┘            │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 720px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- timer card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-7) var(--space-6)`
- display 와 controls 는 `flex column`, `align-items: center`, `gap: var(--space-6)` (display ↔ controls)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "타이머" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (notepad 와 동일 패턴, §9 참조)

### 4.3 large display (mm:ss)
- 컨테이너: `display: flex`, `align-items: baseline`, `justify-content: center`, `gap: 0`
- 텍스트: `--text-display` (desktop 128px), `--font-mono`, `font-variant-numeric: tabular-nums`
- 색 상태:
  - `idle` (값 0): `--color-text-muted` (회색) — "빈 상태" 표현
  - `idle` (값 > 0, 시작 전): `--color-text-primary`
  - `running`: `--color-text-primary` (default) — 운영자 확정 시 `--color-timer-running` 적용
  - `paused`: `--color-text-primary` (default) — 운영자 확정 시 `--color-timer-paused` 적용
  - `ended`: `--color-timer-ended-text`, `font-weight: 400` (강조)
- 형식: `MM:SS` 항상 2자리 zero-pad. 60분 이상은 v1 비범위 → 최대 `99:59`.

### 4.4 시간 입력 (idle 상태에만 노출)

```
  ┌─────┐ : ┌─────┐
  │ 25  │   │ 00  │
  └─────┘   └─────┘
   분         초
```

- 노출 조건: state `idle` AND display 값 0:00 클릭 OR 페이지 첫 진입 시
- running / paused / ended 상태에서는 input pair `hidden`, display 만 표시
- input 각각: `type="number"`, `min=0`, `max=99` (분) / `min=0`, `max=59` (초), `inputmode="numeric"`, `pattern="\d*"`
- 크기: `width: 72px`, `height: 56px`, `font: 600 28px/1 var(--font-mono)`, `text-align: center`, `border: 1px solid --color-border-strong`, `border-radius: --radius-md`, `background: --color-bg-canvas`
- 사이 `:` 구분자: `font: 300 28px/1 var(--font-mono)`, `color: --color-text-muted`, `padding: 0 var(--space-2)`
- focus 시: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px; border-color: var(--color-accent)`
- 입력 즉시 large display 동기 갱신 (debounce 0). 잘못된 값은 onBlur 에 clamp.
- 하단 micro-label "분" / "초" (`--text-caption`, `--color-text-secondary`, 가운데 정렬)

### 4.5 컨트롤 버튼 영역

| 상태 | 1번 버튼 | 2번 버튼 |
|---|---|---|
| `idle` (0:00 이거나 값 미지정) | `[▶ 시작]` disabled | `[⟲ 리셋]` disabled |
| `idle` (값 > 0:00) | `[▶ 시작]` primary-lg enabled | `[⟲ 리셋]` ghost enabled (입력 0:00 으로 되돌림) |
| `running` | `[⏸ 일시정지]` primary-lg enabled | `[⟲ 리셋]` ghost enabled |
| `paused` | `[▶ 재개]` primary-lg enabled | `[⟲ 리셋]` ghost enabled |
| `ended` | `[▶ 시작]` primary-lg disabled (display 0:00 자동 복귀) | `[⟲ 새 타이머]` ghost enabled |

- 두 버튼 가로 배치, `gap: var(--space-4)`
- primary-lg: `height: 56px`, `min-width: 160px`, `padding: 0 var(--space-6)`, `font: --text-button-lg`, `border-radius: --radius-md`
- ghost (리셋): `height: 56px`, `min-width: 120px`, `padding: 0 var(--space-5)`, `font: --text-button-lg`, `color: --color-text-secondary`. hover 시 `--color-danger`, `background: --color-bg-subtle`
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`

### 4.6 종료 알림 배너 (ended 상태 한정)

```
┌──────────────────────────────────────────────────┐
│ ⏰  시간이 다 됐어요                       [닫기] │
└──────────────────────────────────────────────────┘
```

- 위치: timer card **상단 내부**, display 위 (`margin-bottom: var(--space-5)`)
- 폭: card 내부 100% (card padding 안쪽)
- 배경: `--color-timer-ended-bg`, border `1px solid --color-timer-ended-border`, `border-radius: --radius-md`
- 패딩: `var(--space-3) var(--space-4)`
- 좌측 아이콘: `⏰` (24px) 또는 inline SVG bell, `color: --color-timer-ended-text`
- 텍스트: "시간이 다 됐어요" (`--text-label`, `--color-timer-ended-text`)
- 우측 `[닫기]` ghost button (`--text-caption`, `--color-timer-ended-text`) — 클릭 시 배너 dismiss + state `idle` (display 0:00 복귀)
- 페이지 진입 시 banner role 으로 스크린 리더 알림: `role="status" aria-live="polite"`
- 시각 강조 애니메이션 (선택): `animation: pulse 1s ease-in-out 2` — display 만 2회 fade (0.6 → 1.0 opacity). 사용자 `prefers-reduced-motion: reduce` 시 비활성.

### 4.7 빈 상태 (0:00)

- state `idle` 이고 분/초 input 모두 `0` 이거나 미입력
- display 텍스트 `00:00`, 색 `--color-text-muted` (회색 처리로 "비어있음" 시각화)
- `[▶ 시작]` 버튼 `disabled` (`opacity: 0.4`, `cursor: not-allowed`)
- input pair 의 placeholder 는 `00` 로 통일
- hint 라인 (input 하단): "분과 초를 입력하세요" (`--text-caption`, `--color-text-muted`, 가운데 정렬)

### 4.8 반응형 Breakpoint

| breakpoint | 동작 |
|---|---|
| `≥ 960px` (desktop) | display `--text-display` (128px), card max-width `720px`, padding `--space-7 --space-6` |
| `640px – 959px` (tablet) | display `--text-display-md` (96px), card max-width `560px`, padding `--space-6 --space-5`, input `width: 64px; height: 52px; font-size: 24px` |
| `< 640px` (mobile) | display `--text-display-sm` (72px), card 좌우 padding `--space-4`, card max-width `100%` (전체 폭, `margin: var(--space-4)`), primary-lg button `width: 100%` 로 stack(세로 배치 + `gap: var(--space-3)`), 리셋도 `width: 100%` |
| `< 360px` (XS) | display `font-size: 64px` 로 한 단계 더 축소 (`@media (max-width: 359px)`) |

---

## 5. 컴포넌트 명세

### 5.1 `<TimerDisplay>` (large mm:ss)
props:
- `minutes: number` (0–99)
- `seconds: number` (0–59)
- `state: "idle" | "running" | "paused" | "ended"`

상태별 시각:
- `idle` 값 0: 색 `--color-text-muted`, weight `300`
- `idle` 값 > 0: 색 `--color-text-primary`, weight `300`
- `running` / `paused`: 색 `--color-text-primary` (default — §13 운영자 결정 시 강조 색 적용)
- `ended`: 색 `--color-timer-ended-text`, weight `400`, `animation: pulse 1s 2`

aria: 항상 `role="timer" aria-live="off"` (running 중 매초 갱신을 SR 가 읽지 않도록), ended 진입 시 별도 `<div role="status" aria-live="polite">` 가 §4.6 banner 로 알림.

### 5.2 `<TimeInputPair>` (분 / 초 input)
props:
- `minutes: number`
- `seconds: number`
- `onChange({minutes, seconds})`
- `disabled: boolean` (running/paused/ended 시 hidden)

명세:
- §4.4 참조 — 두 input 사이 `:` 구분자, 하단 micro-label
- onBlur clamp: 분 `[0, 99]`, 초 `[0, 59]`. 초 60 이상 입력 시 분으로 carrying 안 함 (단순 clamp — UX 명확성)
- 빈 input 은 `0` 으로 처리 (visual 만 placeholder `00`)
- 첫 진입 시 `<input id="m">` 에 `autofocus`

### 5.3 `<ControlButtons>` (시작·일시정지·리셋)
props:
- `state: "idle" | "running" | "paused" | "ended"`
- `hasValue: boolean` (분 또는 초 > 0)
- `onPrimary()`, `onReset()`

primary 버튼 라벨 / variant 분기: §4.5 표 참조.

리셋 동작:
- `idle` 에서 누르면 input 0:00 으로 복귀 + display 0:00
- `running` / `paused` 에서 누르면 → 확인 modal **없이 즉시** `idle` 로 복귀 (UX 마찰 최소화)
  - 단, primary 가 `running` 중일 때 리셋은 실수 방지를 위해 **버튼이 한 단계 작게(`height: 44px`)** 표시하거나 hover 시 텍스트 색 `--color-danger` 로 강조 (v1 후자 채택)
- `ended` 에서는 "새 타이머" 라벨 (의미적 변형) — 마지막 사용한 값(분/초) 으로 input 자동 복원

### 5.4 `<EndedBanner>` (종료 알림)
props:
- `visible: boolean`
- `onDismiss()`

명세: §4.6 참조. SR 알림은 `aria-live="polite"` (intrusive 하지 않게).

### 5.5 `<EmptyState>` (0:00)
- 별도 컴포넌트가 아닌 `<TimerDisplay state="idle" minutes={0} seconds={0}>` + hint 라인 (§4.7) 의 시각 조합
- "빈 상태" 는 곧 "입력 대기" — 별도 일러스트나 아이콘 없이, input 활성 자체가 entry point

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

```
        ┌────────────────────────┐
        │       idle (0:00)      │◄────┐
        └───────────┬────────────┘     │
            입력  │                    │ 리셋
                  ▼                    │
        ┌────────────────────────┐     │
        │   idle (값 > 0:00)     │     │
        └───────────┬────────────┘     │
            시작  │                    │
                  ▼                    │
        ┌────────────────────────┐     │
   ┌────┤       running          ├─────┤
   │    └───────────┬────────────┘     │
   │ 일시정지       │ 시간 0 도달       │
   │                ▼                  │
   │    ┌────────────────────────┐     │
   └────►       paused           ├─────┤
        └─────────────┬──────────┘     │
                      │                │
                      ▼                │
        ┌────────────────────────┐     │
        │        ended           ├─────┘
        └────────────────────────┘
        (배너 표시 + 새 타이머/닫기로 idle 복귀)
```

### 6.2 키보드 포커스 / 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar 토글 → 분 input → 초 input → 1번 버튼(시작/일시정지) → 2번 버튼(리셋) → 종료 배너 닫기 (visible 시) 순환 | 전역 |
| `Space` | 1번 버튼 토글 실행 (시작 ↔ 일시정지) | input 외 focus 시 (input focus 중에는 기본 스페이스 입력 우선) |
| `Esc` | 리셋 (`onReset()` 호출) | 전역. modal 가 없으므로 항상 리셋만 트리거 |
| `Enter` (input focus 시) | 다음 input 으로 이동, 마지막 input 에서는 1번 버튼 focus | input focus 시 |
| `↑` / `↓` (input focus 시) | 분/초 값을 +1 / -1 (number input 기본 동작) | input focus 시 |

**focus-visible 표시**: 모든 interactive 요소는 `:focus-visible` 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. 마우스 클릭으로 인한 focus 에서는 outline 노출 X (`:focus` 단독 X).

**Space / Esc 충돌 회피**: input 이 focus 중일 때 `Space` 는 number input 의 기본 입력으로 흘려보냄. `Esc` 만 전역 wired — input 에서 `Esc` 누르면 blur + 리셋. screen reader 사용자에게 혼동을 줄 수 있으므로 topbar 또는 hint 라인에 `<kbd>Space</kbd> 시작/정지 · <kbd>Esc</kbd> 리셋` 표기 (`--text-caption`, `--color-text-muted`).

### 6.3 매초 갱신 (running 중)
- `setInterval` 1000ms 또는 `requestAnimationFrame` 기반 `performance.now()` drift-correction (v1 후자 권장 — 탭 백그라운드 시 정확도 유지)
- 매 tick 마다 display textContent 갱신만 (re-render 최소)
- 0:00 도달 시 즉시 `ended` 전이, banner 표시, primary 버튼 disabled

### 6.4 종료 인터랙션 흐름
1. running 중 0:00 도달 → `ended` 상태 전이
2. 종료 배너 fade-in (`opacity 0 → 1`, `200ms ease`)
3. display 펄스 애니메이션 2회 (`prefers-reduced-motion: reduce` 시 skip)
4. 사용자 액션:
   - 배너 `[닫기]` 또는 `Esc` 또는 리셋 버튼 (`[⟲ 새 타이머]`) → `idle` 복귀
   - 리셋 시 input 은 **마지막 값으로 복원** (재실행 UX 효율)

### 6.5 다크 모드
- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad SPA 와 동일) — 페이지 간 일관성 자동 유지
- 첫 로드 시 OS `prefers-color-scheme` 따라 초기화 (저장값 우선)

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── timer/
│   ├── index.html       # 타이머 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃 (notepad/styles.css 의 :root 재활용 또는 import)
│   ├── main.js          # 상태 머신 + tick loop + 이벤트
│   └── theme.js         # (옵션) bf-theme 초기화 — notepad 와 공유 모듈화 가능
├── notepad/             # 기존 메모장 SPA (보존)
└── docs/design/
    ├── timer-BF-405.md           (본 문서)
    └── mockups/timer-BF-405.html (시각 mockup)
```

대안: 단일 디렉토리에 `timer.html` 추가하고 styles/main.js 모두 prefix 로 충돌 방지. **v1 권장은 `timer/` 하위 디렉토리** (분리 명확).

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>타이머</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">타이머</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <section class="card" aria-label="타이머">
        <!-- 종료 배너 (hidden by default) -->
        <div class="banner banner--ended" id="ended-banner" role="status" aria-live="polite" hidden>
          <span class="banner__icon" aria-hidden="true">⏰</span>
          <span class="banner__text">시간이 다 됐어요</span>
          <button type="button" class="banner__close" id="btn-banner-close" aria-label="알림 닫기">닫기</button>
        </div>

        <!-- large display -->
        <div class="display" id="display" role="timer" aria-live="off" aria-label="남은 시간">
          <span class="display__minutes" id="disp-m">00</span>
          <span class="display__colon" aria-hidden="true">:</span>
          <span class="display__seconds" id="disp-s">00</span>
        </div>

        <!-- input pair (idle 만 노출) -->
        <div class="input-pair" id="input-pair">
          <div class="input-pair__field">
            <input type="number" id="input-m" min="0" max="99" value="0" inputmode="numeric" pattern="\d*" aria-label="분" />
            <span class="input-pair__label">분</span>
          </div>
          <span class="input-pair__colon" aria-hidden="true">:</span>
          <div class="input-pair__field">
            <input type="number" id="input-s" min="0" max="59" value="0" inputmode="numeric" pattern="\d*" aria-label="초" />
            <span class="input-pair__label">초</span>
          </div>
        </div>

        <!-- hint (idle 0:00 만 노출) -->
        <p class="hint" id="hint">분과 초를 입력하세요</p>

        <!-- controls -->
        <div class="controls">
          <button type="button" class="btn btn--primary-lg" id="btn-primary" disabled>▶ 시작</button>
          <button type="button" class="btn btn--ghost-lg" id="btn-reset" disabled>⟲ 리셋</button>
        </div>

        <!-- keyboard hint -->
        <p class="kbd-hint"><kbd>Space</kbd> 시작/정지 · <kbd>Esc</kbd> 리셋</p>
      </section>
    </main>

    <script type="module" src="main.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치

`timer/styles.css` 상단에 `:root` 블록 — **notepad/styles.css 의 토큰을 그대로 복사** + 본 명세의 §2.2(타이머 전용)·§3 type 토큰 추가:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color tokens (notepad-BF-400 §2.1 재사용) */
  --color-bg-canvas: #FAFAF9;
  /* … notepad 토큰 전체 복사 … */

  /* timer 전용 (§2.2) */
  --color-timer-running: #1F8A5C;
  --color-timer-paused: #B7791F;
  --color-timer-ended-bg: #FFF1F1;
  --color-timer-ended-border: #F4B5B5;
  --color-timer-ended-text: #9A2A2A;

  /* spacing / radius / shadow (notepad 와 동일) */
  --space-1: 4px; /* … */
  --radius-lg: 12px;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.06);

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-display: 300 128px/1 var(--font-mono);
  --text-display-md: 300 96px/1 var(--font-mono);
  --text-display-sm: 300 72px/1 var(--font-mono);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
  --text-button-lg: 600 16px/1 var(--font-sans);
}
[data-theme="dark"] {
  --color-bg-canvas: #0F1115;
  /* … dark 값 (notepad 와 동일) + timer 전용 dark 값 … */
  --color-timer-ended-bg: #3A1F22;
  --color-timer-ended-border: #7A3A3F;
  --color-timer-ended-text: #FCB7B7;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.32);
}
```

### 7.4 단계별 구현 순서 (권장)

1. **7.2 골격 HTML 작성** + 빈 `styles.css` / `main.js`
2. **CSS 변수 + base reset** (notepad 와 동일 — `*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **Topbar** (notepad 와 동일 패턴, 다크 토글만 단독)
4. **Page + card 컨테이너** (max-width, padding, box-shadow)
5. **TimerDisplay** 정적 (`00:00` 텍스트 + font-mono + tabular-nums) — 정적 시각 확인
6. **TimeInputPair** — number input 2개 + `:` 구분자 + micro-label
7. **ControlButtons** — primary-lg / ghost-lg variant 추가, disabled 시각
8. **state machine** (`main.js`) — `{state, minutes, seconds, remainingMs}` 객체 + render() 함수
9. **start() / pause() / reset()** — `requestAnimationFrame` + `performance.now()` 기반 tick (drift 보정)
10. **0:00 도달 → ended 전이** + banner show + display 펄스 (`prefers-reduced-motion` 가드)
11. **키보드 단축키** (§6.2 표): `keydown` 전역 — Space (input focus 외), Esc (전역)
12. **반응형** — `@media (max-width: 959px)` / `@media (max-width: 639px)` / `@media (max-width: 359px)`
13. **다크 토글** — `theme.js` 분리 또는 main.js 내부, `localStorage["bf-theme"]` 공유

### 7.5 a11y 체크
- display: `role="timer" aria-live="off"` (매초 갱신을 SR 가 안 읽도록)
- 종료 banner: `role="status" aria-live="polite"` (intrusive 하지 않게)
- input: `<label>` 또는 `aria-label="분" / "초"` 명시 (mockup 은 `aria-label` 사용)
- primary 버튼: 상태 변화 시 `aria-label` 도 같이 갱신 ("시작" → "일시정지")
- focus-visible only outline (`:focus` 단독 X)
- `prefers-reduced-motion: reduce` 시 펄스 / fade 애니메이션 비활성

### 7.6 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop) | 토큰 |
|---|---|---|
| timer card max-width | `720px` | hardcoded |
| card padding | `48px 32px` | `--space-7 --space-6` |
| display font-size (≥960px) | `128px` | `--text-display` |
| display font-size (640–959px) | `96px` | `--text-display-md` |
| display font-size (<640px) | `72px` | `--text-display-sm` |
| primary-lg button height | `56px` | hardcoded |
| primary-lg button min-width | `160px` | hardcoded |
| primary-lg button font | `600 16px/1` | `--text-button-lg` |
| ghost-lg button height | `56px` | hardcoded |
| ghost-lg button min-width | `120px` | hardcoded |
| input width × height | `72px × 56px` | hardcoded |
| input font | `600 28px/1 mono` | hardcoded |
| display ↔ controls gap | `32px` | `--space-6` |
| controls 버튼 간 gap | `16px` | `--space-4` |
| banner padding | `12px 16px` | `--space-3 --space-4` |
| focus-ring outline | `2px solid` + `offset 2px` | `--color-focus-ring` |

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<TimerDisplay>` | vanilla — shadcn 미제공 (커스텀 unique) |
| `<TimeInputPair>` | `Input` (`type=number`) ×2 + 구분자는 plain `<span>` |
| primary-lg / ghost-lg button | `Button` (`size: lg`, `variant: default / ghost`) |
| `<EndedBanner>` | `Alert` (`variant: destructive` 또는 커스텀) |
| 다크 토글 | vanilla (notepad 와 공유 패턴) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`timer/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- 기존 메모장 SPA 의 라우팅/링크 (만약 있다면)

### 9.2 신규 `timer/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | notepad/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | notepad/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="light">` 패턴 | notepad/index.html | **복제** | data-theme 속성 토큰 시스템 의존 |
| `<link rel="stylesheet" href="styles.css">` | notepad/index.html | **복제 + 경로 수정** | timer/styles.css 로 향함 |
| `<script type="module" src="main.js">` | notepad/index.html | **복제 + 경로 수정** | timer/main.js |
| `<header class="topbar">` 구조 | notepad/index.html | **복제 (간소화)** | 메모장 전용 `[+ 새 메모]` 버튼은 제거, `[🌙]` 다크 토글만 유지 |
| `:root` CSS 변수 블록 | notepad/styles.css | **복제** + §2.2 추가 토큰 append | single source of truth: 본 명세 |
| `bf-theme` localStorage 초기화 로직 | notepad/main.js (또는 같이 작성된 theme init) | **복제** 또는 **공유 모듈화** | `theme.js` 로 분리 후 양쪽 import 권장. v1 은 단순 복붙 OK |

### 9.3 추가/수정해야 할 부분 (timer 전용)

- timer card / display / input pair / controls / banner 마크업 (§7.2)
- timer 전용 색·typo 토큰 (§2.2, §3)
- 타이머 상태 머신·tick loop (§6.1, §6.3)
- 키보드 단축키 (§6.2)

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지부터 확인.

---

## 10. mockup 참조

[`docs/design/mockups/timer-BF-405.html`](mockups/timer-BF-405.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0)
- light/dark 두 패널을 나란히 표시 → 토큰 매핑 시각 검증
- 5가지 상태별 패널 동시 표시:
  1. **idle (빈 0:00)** — 입력 대기
  2. **idle (값 입력 후, 시작 전)** — 25:00
  3. **running** — 24:37 (분/초 input 숨김)
  4. **paused** — 12:05 (재개/리셋)
  5. **ended** — 0:00 + 종료 알림 배너
- mobile (< 640px) 레이아웃 미리보기 섹션 별도 포함
- focus-visible outline 시각 (input/button 각각 1샷 정적 표현)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.6 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 와이어: 시작 상태 | §4.5 (idle 값>0 → 시작 enabled), mockup state 2 | ✓ |
| 와이어: 일시정지 상태 | §4.5 (running → 일시정지 라벨), mockup state 3 | ✓ |
| 와이어: 리셋 동작 | §4.5 + §5.3 (각 state 별 리셋 라벨/효과) | ✓ |
| 와이어: 종료 상태 | §4.6 + §5.4 + §6.4, mockup state 5 | ✓ |
| 와이어: 빈 상태 (0:00) | §4.7 + §5.5, mockup state 1 | ✓ |
| 디자인 토큰 매핑 (색·여백·타이포) | §2.1, §2.2, §2.3, §2.4, §3 | ✓ |
| 반응형 breakpoint | §4.8, §7.6 정량 표 | ✓ |
| 키보드 접근성 (Space/Esc 포커스 표시) | §6.2 (단축키 표) + §7.5 (a11y) + §7.6 (focus-ring 정량) | ✓ |
| 정량값(px/rem, 토큰 키) 명시 | §7.6 정량 일치 표 (모든 핵심 치수) | ✓ |
| 비범위 명시 | §1.3 (다중 타이머·사운드·notification API 모두 explicit) | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 9개 AC 모두 cross-reference, 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·13단계 구현 순서·§7.6 정량 일치 표 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존, §9.2 복제 대상 (head/script/theme 초기화), §9.3 신규 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 매핑 가이드 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 3건 |

추가 자체 점검:
- **비범위 명시**: §1.3 에 다중 타이머·사운드·notification·프리셋·카운트업 5개 explicit 제외 ✓
- **정량 일치 가능성**: §7.6 표가 desktop/tablet/mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **Space/Esc 충돌**: §6.2 에 input focus 중 Space 는 input 입력으로 양보, Esc 만 전역 wired 으로 명시 ✓
- **종료 시 reduced-motion 가드**: §4.6 + §7.5 에 `prefers-reduced-motion: reduce` 분기 명시 ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §2.2 / §4.3 만 수정):

1. **running / paused 상태에서 display 색 강조 여부** — 현재 default 는 `--color-text-primary` (단색). §2.2 의 `--color-timer-running` (초록) / `--color-timer-paused` (앰버) 적용 시 시각 피드백이 강해지나 정보 과잉 우려도 있음. **권장: default(primary) 유지**, 사용자 테스트 후 조정.
2. **종료 시 펄스 애니메이션 강도** — 현재 `opacity 0.6 → 1.0` 2회. 보다 부드럽게(`0.85 → 1.0`) 또는 비활성 모두 가능. `prefers-reduced-motion` 가드는 항상 적용.
3. **`Esc` 글로벌 리셋의 위험** — 일부 사용자는 modal 닫기로만 Esc 를 기대. v1 은 modal 이 없어 충돌 X 지만 후속 modal 도입 시 우선순위 정책 필요. **권장: v1 은 글로벌 리셋 채택**, modal 도입 시 modal-close 우선.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
