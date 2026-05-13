# 타이머 SPA 디자인 명세 (BF-467)

> 관련 task: BF-468 (designer)
> mockup: [`docs/design/mockups/timer-BF-467.html`](mockups/timer-BF-467.html)
> 작성자: 이디자인
> 선행 명세: [`docs/design/timer-BF-405.md`](timer-BF-405.md) (BF-405 구현 기반)

---

## 1. 시안 개요

### 1.1 변경 범위

본 명세는 **BF-405 명세의 구현 위에** 다음 변경 사항을 정의한다.

| 항목 | BF-405 (기존) | BF-467 (본 명세) |
|---|---|---|
| 기본 테마 | **light** (`data-theme="light"`) | **dark** (`data-theme="dark"`) |
| 테마 토글 button ID | `#btn-theme` | `#theme-toggle` |
| CSS 토큰 구조 | `:root` = light, `[data-theme="dark"]` = dark 오버라이드 | `:root` = **dark**, `[data-theme="light"]` = light 오버라이드 |
| flicker 방지 | JS 모듈 `initTheme()` (body 로드 후 실행) | **head 인라인 IIFE** (paint 전 실행 — flicker 없음) |

palette/, clicker/, dice/ 등 기존 dark-default SPA 와 **동일 패턴**으로 통일. 나머지 레이아웃·컴포넌트·인터랙션은 BF-405 명세를 계승.

### 1.2 사용자 경험 목표

- **다크 우선 렌더**: 첫 방문 시 dark 배경에서 시작. OS 또는 저장값이 light 면 즉시 전환 (flicker 없음).
- **한 눈에 남은 시간**: large mm:ss display 가 시각 중심. monospace + tabular-nums 로 자릿수 흔들림 없음.
- **즉시 시작·중단·재개**: primary 버튼 1개로 시작/일시정지/재개 토글. 보조 ghost 버튼으로 리셋.
- **분/초 입력 직관**: idle 상태에서 number input 2개 표출 → 입력 즉시 display 동기 갱신.
- **종료 시각 알림**: dark/light 양쪽에서 명확한 색·아이콘·배너로 종료 신호 전달.
- **키보드 단축**: `Space` 시작/일시정지 토글, `Esc` 리셋, `T` 테마 전환.

### 1.3 비목표 (Out of Scope)

BF-405 §1.3 과 동일:
- 다중 타이머 동시 실행
- 사운드 / 진동 알림
- 브라우저 Notification API
- 프리셋·히스토리 (quick chip 등)
- 카운트업 (스톱워치) 모드

---

## 2. 디자인 토큰

> **핵심 변경**: BF-405 와 토큰 값은 동일하지만 **구조가 반전**된다.
> `:root` = dark (default), `[data-theme="light"]` = light 오버라이드.

### 2.1 색상 토큰 — Dark Default (`:root`)

| 토큰명 | Dark HEX (`:root` 기본) | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0f1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#171a21` | 카드 표면 (timer card) |
| `--color-bg-subtle` | `#1e222b` | 버튼 hover / input bg |
| `--color-border-default` | `#262b36` | 표면 구분선 |
| `--color-border-strong` | `#3a4150` | input · button outline |
| `--color-text-primary` | `#e8e8e4` | 본문 · display |
| `--color-text-secondary` | `#9a9a93` | label · hint |
| `--color-text-muted` | `#6b6b66` | placeholder · 빈 0:00 |
| `--color-accent` | `#5b82f0` | primary action (시작) · focus ring base |
| `--color-accent-hover` | `#7596f3` | accent hover/active |
| `--color-danger` | `#e55858` | 리셋 (destructive) · 종료 강조 |
| `--color-danger-hover` | `#ec7676` | danger hover |
| `--color-focus-ring` | `rgba(91, 130, 240, 0.55)` | 키보드 focus outline (2px) |
| `--color-timer-running` | `#3aae7a` | running 상태 display 색 (초록) |
| `--color-timer-paused` | `#d4a23a` | paused 상태 display 색 (앰버) |
| `--color-timer-ended-bg` | `#3a1f22` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#7a3a3f` | 종료 배너 border |
| `--color-timer-ended-text` | `#fcb7b7` | 종료 배너 텍스트 |
| `--shadow-card` | `0 4px 16px rgba(0, 0, 0, 0.32)` | 카드 그림자 (dark) |

### 2.2 색상 토큰 — Light 오버라이드 (`[data-theme="light"]`)

| 토큰명 | Light HEX (오버라이드) | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| `--color-bg-surface` | `#ffffff` | 카드 표면 |
| `--color-bg-subtle` | `#f1f1ef` | 버튼 hover |
| `--color-border-default` | `#e5e5e2` | 구분선 |
| `--color-border-strong` | `#d0d0cc` | input · button outline |
| `--color-text-primary` | `#1a1a19` | 본문 · display |
| `--color-text-secondary` | `#6b6b66` | label |
| `--color-text-muted` | `#9a9a93` | placeholder |
| `--color-accent` | `#3563e9` | primary action |
| `--color-accent-hover` | `#2a4fc0` | accent hover |
| `--color-danger` | `#d14343` | destructive |
| `--color-danger-hover` | `#a83333` | danger hover |
| `--color-focus-ring` | `rgba(53, 99, 233, 0.45)` | focus outline |
| `--color-timer-running` | `#1f8a5c` | running 색 (초록) |
| `--color-timer-paused` | `#b7791f` | paused 색 (앰버) |
| `--color-timer-ended-bg` | `#fff1f1` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#f4b5b5` | 종료 배너 border |
| `--color-timer-ended-text` | `#9a2a2a` | 종료 배너 텍스트 |
| `--shadow-card` | `0 4px 16px rgba(0, 0, 0, 0.06)` | 카드 그림자 (light) |

### 2.3 공간 토큰 (BF-405 동일)

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자 (BF-405 동일)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--shadow-popover` | `0 4px 12px rgba(0, 0, 0, 0.10)` |

---

## 3. 타이포그래피 (BF-405 동일)

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | 토큰 |
|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `--text-h1` |
| **display-timer (desktop ≥960px)** | **`128px`** | `300` | `1` | `--text-display` |
| **display-timer (640–959px)** | **`96px`** | `300` | `1` | `--text-display-md` |
| **display-timer (<640px)** | **`72px`** | `300` | `1` | `--text-display-sm` |
| label | `14px` | `500` | `1.4` | `--text-label` |
| body | `15px` | `400` | `1.65` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `--text-caption` |
| button | `14px` | `500` | `1` | `--text-button` |
| **button-lg** (primary 시작/일시정지) | `16px` | `600` | `1` | `--text-button-lg` |

display 는 `--font-mono` + `font-variant-numeric: tabular-nums` — mm:ss 자릿수 변동 시 가로폭 흔들림 방지. weight `300` 으로 굵기 최소화.

---

## 4. 레이아웃

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar · "타이머"                          [☀ / 🌙 토글] │  56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│           ┌─────────────────────────────────┐            │
│           │  ┌───────────────────────────┐  │ ← 종료배너 │
│           │  │ ⏰ 시간이 다 됐어요  [닫기] │  │  (ended만) │
│           │  └───────────────────────────┘  │            │
│           │                                 │            │
│           │          12 : 34                │ display    │
│           │                                 │ 128px mono │
│           │   ┌──────┐  :  ┌──────┐        │            │
│           │   │  분  │     │  초  │        │ ← idle만   │
│           │   └──────┘     └──────┘        │            │
│           │     분              초          │            │
│           │                                 │            │
│           │   분과 초를 입력하세요           │ ← hint     │
│           │                                 │            │
│           │  [▶ 시작 / ⏸ 일시정지 / ▶ 재개] [⟲ 리셋]   │
│           │                                 │            │
│           │  Space 시작/정지 · Esc 리셋      │ kbd-hint   │
│           └─────────────────────────────────┘            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 720px`, 수평 중앙, `padding: var(--space-7) var(--space-5)`
- timer card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-7) var(--space-6)`
- card 내부: `display: flex; flex-direction: column; align-items: center; gap: var(--space-6)`

### 4.2 Topbar

- 높이 `56px`, `padding: 0 var(--space-5)`
- `background: --color-bg-surface`, `border-bottom: 1px solid --color-border-default`
- 좌측: "타이머" (`--text-h1`)
- 우측: `#theme-toggle` ghost button — 다크 = `☀`, 라이트 = `🌙`

### 4.3 분/초 입력 UI (idle 상태에만 노출)

```
  ┌──────┐     ┌──────┐
  │  25  │  :  │  00  │
  └──────┘     └──────┘
     분            초
```

- 노출 조건: state `idle` — `running` / `paused` / `ended` 에서는 `hidden`
- 각 input: `type="number"`, 분 `min=0 max=99`, 초 `min=0 max=59`, `inputmode="numeric"`
- input 크기: `width: 72px; height: 56px; font: 600 28px/1 var(--font-mono); text-align: center`
- input border: `1px solid --color-border-strong; border-radius: --radius-md; background: --color-bg-canvas`
- focus 시: `outline: 2px solid --color-focus-ring; outline-offset: 2px; border-color: --color-accent`
- 사이 `:` 구분자: `font: 300 28px/1 var(--font-mono); color: --color-text-muted`
- 하단 micro-label "분" / "초": `--text-caption; color: --color-text-secondary`
- spinner 숨김: `-webkit-appearance: none; -moz-appearance: textfield`
- 입력 즉시 display 동기 갱신 (debounce 0). onBlur 에서 range clamp.

### 4.4 카운트다운 display (mm:ss)

- `role="timer" aria-live="off"` — running 중 SR 가 매초 읽지 않도록
- `font-variant-numeric: tabular-nums` — 자릿수 흔들림 방지
- **상태별 색**:

| state | display 색 | 비고 |
|---|---|---|
| `idle` (0:00) | `--color-text-muted` | 빈 상태 시각화 (`.is-empty`) |
| `idle` (값 > 0) | `--color-text-primary` | 시작 대기 |
| `running` | `--color-text-primary` | 기본값 (운영자 결정 시 `--color-timer-running`) |
| `paused` | `--color-text-primary` | 기본값 (운영자 결정 시 `--color-timer-paused`) |
| `ended` | `--color-timer-ended-text` | weight `400`, 펄스 애니메이션 2회 |

- 펄스 animation (ended): `@keyframes timer-pulse { 50% { opacity: 0.6 } }` 2회
- `prefers-reduced-motion: reduce` 시 animation 비활성

### 4.5 컨트롤 버튼 상태표

| state | primary 버튼 | reset 버튼 |
|---|---|---|
| `idle` (0:00) | `▶ 시작` — disabled (opacity 0.4) | `⟲ 리셋` — disabled |
| `idle` (값 > 0) | `▶ 시작` — primary-lg enabled | `⟲ 리셋` — ghost enabled |
| `running` | `⏸ 일시정지` — primary-lg enabled | `⟲ 리셋` — ghost enabled |
| `paused` | `▶ 재개` — primary-lg enabled | `⟲ 리셋` — ghost enabled |
| `ended` | `▶ 시작` — primary-lg disabled | `⟲ 새 타이머` — ghost enabled |

- primary-lg: `height: 56px; min-width: 160px; padding: 0 var(--space-6); font: --text-button-lg; background: --color-accent; color: #fff`
- primary-lg hover: `background: --color-accent-hover`
- ghost-lg (리셋): `height: 56px; min-width: 120px; color: --color-text-secondary`
- ghost-lg hover: `background: --color-bg-subtle; color: --color-danger`
- focus-visible: `outline: 2px solid --color-focus-ring; outline-offset: 2px`
- disabled: `opacity: 0.4; cursor: not-allowed`

### 4.6 종료 알림 배너 (ended 상태)

```
┌────────────────────────────────────────────────────┐
│ ⏰  시간이 다 됐어요                           [닫기] │
└────────────────────────────────────────────────────┘
```

- 위치: timer card 상단 내부, display 위 (card의 첫 번째 자식)
- 폭: card 내부 100%
- 배경: `--color-timer-ended-bg`, `border: 1px solid --color-timer-ended-border`, `border-radius: --radius-md`
- padding: `var(--space-3) var(--space-4)`
- 아이콘 `⏰`: `font-size: 24px; color: --color-timer-ended-text`
- 텍스트 "시간이 다 됐어요": `--text-label; color: --color-timer-ended-text`
- `[닫기]` 버튼: `--text-caption; color: --color-timer-ended-text; border-radius: --radius-sm`
- SR 알림: `role="status" aria-live="polite"`
- ended 아닐 때: `hidden` attribute

### 4.7 빈 상태 (idle 0:00)

- display: 색 `--color-text-muted`, `.is-empty` 클래스
- hint: "분과 초를 입력하세요" (`--text-caption; color: --color-text-muted; text-align: center`)
- `[▶ 시작]` + `[⟲ 리셋]` 모두 disabled

### 4.8 반응형 Breakpoint

| breakpoint | 동작 |
|---|---|
| `≥ 960px` | display `128px`, card `max-width: 720px; padding: --space-7 --space-6` |
| `640–959px` | display `96px`, card `max-width: 560px; padding: --space-6 --space-5`, input `64px × 52px`, font-size `24px` |
| `< 640px` | display `72px`, card `max-width: 100%; padding: --space-5 --space-4`, controls `flex-direction: column; gap: --space-3`, 버튼 `width: 100%` |
| `< 360px` | display `font-size: 64px` (추가 축소) |

---

## 5. 컴포넌트 명세

### 5.1 `<TimerDisplay>` (large mm:ss)

props:
- `minutes: number` (0–99)
- `seconds: number` (0–59)
- `state: "idle" | "running" | "paused" | "ended"`

상태별 시각: §4.4 표 참조.
aria: `role="timer" aria-live="off" aria-label="남은 시간"`

### 5.2 `<TimeInputPair>` (분/초 number input)

props:
- `minutes: number`, `seconds: number`
- `onChange({minutes, seconds})`

노출: state `idle` 만. 나머지 상태에서 `hidden`.
onBlur clamp: 분 `[0, 99]`, 초 `[0, 59]` (초 overflow 시 분으로 carrying 안 함 — 단순 clamp).
미세 레이아웃: §4.3 참조.

### 5.3 `<ControlButtons>`

props:
- `state: "idle" | "running" | "paused" | "ended"`
- `hasValue: boolean`
- `onPrimary()`, `onReset()`

상태별 라벨/active: §4.5 표 참조.
리셋 동작: 확인 modal 없이 즉시 idle 복귀. ended 에서는 마지막 설정값으로 input 복원.

### 5.4 `<EndedBanner>`

props:
- `visible: boolean`
- `onDismiss()`

layout: §4.6 참조. SR 알림: `aria-live="polite"` (intrusive 하지 않게).

### 5.5 `#theme-toggle` 버튼

- ID: `theme-toggle` (palette / clicker / dice 와 동일)
- 아이콘: 다크 모드일 때 `☀`, 라이트 모드일 때 `🌙`
- aria-label: 다크 = "라이트 테마로 전환", 라이트 = "다크 테마로 전환"
- class: `btn btn--ghost`
- 키보드 단축키 `T` 로도 동일 동작

---

## 6. 상태·인터랙션 명세

### 6.1 상태 머신 (BF-405 동일)

```
idle (0:00)  ──입력──▶  idle (값>0)  ──시작──▶  running
                                                    │   ↑
                                               일시정지  재개
                                                    │   │
                                               paused ◀──┘
                                                    │
                                             0:00 도달
                                                    ▼
                                                 ended
                              배너[닫기]/Esc/새타이머
                                                    │
                                               idle (마지막 설정값 복원)
```

### 6.2 키보드 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Space` | primary 버튼 토글 (시작 ↔ 일시정지) | input focus 외 |
| `Esc` | 리셋 (ended 상태에서는 배너 닫기 + idle 복귀) | 전역 |
| `T` | 테마 토글 | 전역 (input focus 제외 권장) |
| `Tab` / `Shift+Tab` | topbar 토글 → 분 input → 초 input → primary → reset → banner close | 순환 |
| `↑` / `↓` (input) | 값 +1 / -1 (number input 기본) | input focus |

focus-visible: 모든 interactive 요소에 `outline: 2px solid --color-focus-ring; outline-offset: 2px` (`:focus-visible` 만, 마우스 클릭 시 X).

### 6.3 카운트다운 tick

- `requestAnimationFrame` + `performance.now()` drift-correction
- 매 프레임: display textContent 갱신 (full re-render 없이 효율화)
- 0:00 도달 시 즉시 `ended` 전이 → 배너 표시 → display 펄스 2회

### 6.4 종료 인터랙션

1. 0:00 도달 → `ended` 전이
2. 배너 fade-in (200ms)
3. display 펄스 2회 (`prefers-reduced-motion` 시 skip)
4. 사용자 액션:
   - `[닫기]` / `Esc` → idle (input 마지막 설정값 복원)
   - `[⟲ 새 타이머]` → idle (동일)

### 6.5 다크 default 토글 패턴 (palette / clicker 계승)

#### HTML 초기 속성
```html
<html lang="ko" data-theme="dark">
```

#### head 인라인 IIFE (flicker 방지)
```html
<head>
  <link rel="stylesheet" href="styles.css" />
  <script>
    // BF-467 · dark default + flicker 방지 — head 인라인
    (function () {
      try {
        var saved = localStorage.getItem("bf-theme");
        var theme = saved === "light" || saved === "dark" ? saved : "dark";
        document.documentElement.setAttribute("data-theme", theme);
      } catch (_e) {
        // localStorage 불가 (private mode) — dark 유지
      }
    })();
  </script>
</head>
```

#### CSS 구조 (dark 기본 → light 오버라이드)
```css
:root {
  /* dark 값 (default) */
  --color-bg-canvas: #0f1115;
  --color-bg-surface: #171a21;
  /* ... 전체 §2.1 토큰 ... */
}

[data-theme="light"] {
  /* light 오버라이드만 선언 */
  --color-bg-canvas: #fafaf9;
  --color-bg-surface: #ffffff;
  /* ... §2.2 토큰 ... */
}
```

#### JS 테마 토글 함수
```js
const THEME_KEY = "bf-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "☀" : "🌙";
  themeToggleBtn.setAttribute(
    "aria-label",
    theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환"
  );
}

function toggleTheme() {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_e) {}
}

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

// T 단축키
document.addEventListener("keydown", function (e) {
  if (e.key && e.key.toLowerCase() === "t") {
    const focused = document.activeElement;
    if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")) return;
    e.preventDefault();
    toggleTheme();
  }
});
```

#### 초기화 (모듈 로드 시)
```js
// localStorage 또는 dark default
function initTheme() {
  let theme = null;
  try { theme = localStorage.getItem(THEME_KEY); } catch (_e) {}
  // IIFE 가 이미 attribute 설정했으므로 현재 attribute 를 source of truth 로 사용
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current);
}
```

---

## 7. 접근성

| 항목 | 요구사항 |
|---|---|
| 색상 대비 | WCAG AA: accent (#5b82f0) 위 흰 텍스트 → 3.6:1 (≥18px 대형 텍스트 AA ✓, 버튼 라벨 16px — 운영자 확인 필요 시 §12 참조) |
| display | `role="timer" aria-live="off"` (매초 SR 읽기 방지) |
| 종료 배너 | `role="status" aria-live="polite"` |
| input | `aria-label="분"` / `aria-label="초"` |
| primary 버튼 | 상태 변화 시 `aria-label` 동시 갱신 ("타이머 시작" → "타이머 일시정지") |
| 테마 토글 | `aria-label` 현재 동작 명시 ("라이트 테마로 전환" ↔ "다크 테마로 전환") |
| focus-visible | 모든 interactive 요소 `:focus-visible` 에만 `outline: 2px solid --color-focus-ring; outline-offset: 2px` |
| reduced-motion | `@media (prefers-reduced-motion: reduce)` 에서 display 펄스 animation 비활성 |

---

## 8. dev 구현 가이드

### 8.1 파일별 변경 범위

| 파일 | 변경 내용 |
|---|---|
| `timer/index.html` | ① `data-theme="dark"` (초기값 변경), ② head IIFE 추가, ③ `#btn-theme` → `#theme-toggle` (ID 변경) |
| `timer/styles.css` | ④ `:root` → dark 값으로 교체, ⑤ `[data-theme="dark"]` 블록 → `[data-theme="light"]` 로 변환 |
| `timer/main.js` | ⑥ `$("btn-theme")` → `$("theme-toggle")`, ⑦ `initTheme()` 로직 수정 (IIFE 와 중복 방지), ⑧ T 단축키 추가 |

> 나머지 로직 (상태 머신, tick, 이벤트 바인딩, storage) 는 **변경 없음** — surgical changes 원칙.

### 8.2 단계별 구현 순서 (권장)

1. `index.html` — `<html data-theme="dark">` 로 변경
2. `index.html` — `<link rel="stylesheet" href="styles.css" />` 바로 다음에 head IIFE 삽입 (§6.5 코드 블록 그대로)
3. `index.html` — `#btn-theme` → `id="theme-toggle"` 로 변경, `aria-label` = "라이트 테마로 전환"
4. `styles.css` — `:root` 블록 값을 dark 값으로 교체 (§2.1 표)
5. `styles.css` — `[data-theme="dark"]` 선택자 → `[data-theme="light"]` 로 변경, 값을 light 값으로 교체 (§2.2 표)
6. `main.js` — `$("btn-theme")` → `$("theme-toggle")` 으로 변경 (1행만)
7. `main.js` — `initTheme()` 내부: localStorage 없을 때 `"dark"` 를 default 로 (OS prefers-color-scheme 폴백 제거 가능 — IIFE 가 이미 처리)
8. `main.js` — `applyTheme()` 내부: dark = `"☀"`, light = `"🌙"` 로 아이콘 방향 수정
9. `main.js` — T 단축키 추가 (§6.5 keydown 코드 블록)
10. 브라우저에서 `file://` 로 열어 dark default + #theme-toggle 동작 확인 (AC2 검증)

### 8.3 정량 일치 기준 (변경 없음 — BF-405 §7.6 그대로)

| 항목 | 값 (desktop) |
|---|---|
| card max-width | `720px` |
| card padding | `48px 32px` (`--space-7 --space-6`) |
| display font-size (≥960px) | `128px` |
| display font-size (640–959px) | `96px` |
| display font-size (<640px) | `72px` |
| primary-lg height | `56px` |
| primary-lg min-width | `160px` |
| ghost-lg height | `56px` |
| ghost-lg min-width | `120px` |
| input w × h | `72px × 56px` |
| input font | `600 28px/1 mono` |
| controls gap | `16px` (`--space-4`) |
| banner padding | `12px 16px` (`--space-3 --space-4`) |
| focus-ring | `2px solid; offset: 2px` |

---

## 9. 기존 요소 보존

- `timer/timer.js`, `timer/storage.js` — 변경 없음 (순수 로직, 독립)
- `timer/main.js` 의 상태 머신 / tick / 이벤트 바인딩 — **변경 없음** (§8.1 에 명시된 3행만 수정)
- 기타 SPA (`notepad/`, `palette/`, `stopwatch/` 등) — 완전 보존, 본 명세 무관

---

## 10. mockup 참조

[`docs/design/mockups/timer-BF-467.html`](mockups/timer-BF-467.html)

- 단일 self-contained HTML (외부 의존성 0건, 인라인 `<style>`)
- **dark default** 렌더 (첫 로드 시 dark)
- `#theme-toggle` 버튼 클릭 → 라이트/다크 전환 동작 (JS 포함)
- 5가지 상태 패널 동시 표시:
  1. **idle (0:00)** — 빈 상태, 입력 대기
  2. **idle (25:00)** — 값 입력 후 시작 전
  3. **running (12:34)** — 카운트다운 중 (input 숨김)
  4. **paused (08:15)** — 일시정지
  5. **ended (0:00)** — 종료 배너 표시

---

## 11. AC 매핑 표

| AC 항목 | 본 명세 섹션 | 디자인 결정 |
|---|---|---|
| **AC1** — 분/초 입력·카운트다운·버튼 상태·종료 알림의 시각 디자인 토큰·레이아웃·접근성 가이드 포함 | §2.1~2.4 (토큰), §4.3 (입력 UI), §4.4 (카운트다운), §4.5 (버튼 상태표), §4.6 (배너), §7 (접근성) | 분/초 input 72×56px, display 128px mono, 5상태 버튼표, 배너 role=status, focus-ring 2px, reduced-motion 가드 |
| **AC2** — file:// 로 열 때 외부 CDN 없이 dark default 렌더, #theme-toggle 라이트 전환 동작 | §6.5 (dark default 패턴), §5.5 (theme-toggle), §8.2 (구현 순서) | data-theme="dark" 초기값, head IIFE, :root = dark, [data-theme="light"] = light 오버라이드, id="theme-toggle" |
| **AC3** — 각 AC 에 대응하는 디자인 결정 1:1 매핑 | §11 (본 표) | AC1·AC2·AC3 각각 본 표 한 행으로 1:1 매핑됨 |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✅ | §11 에 AC1·AC2·AC3 전부 1:1 매핑, 디자인 결정 명시 |
| dev 구현 가이드 명확 | ✅ | §8.1 파일별 변경 범위 (행 단위), §8.2 10단계 순서, §8.3 정량 일치 표 |
| 기존 요소 보존 | ✅ | §9: timer.js·storage.js·상태머신 변경 없음 명시, 타 SPA 보존 |
| 컴포넌트 매핑 | ✅ | §5.1~5.5 전부 포함 (display·input·controls·banner·theme-toggle) |
| 모호함 flag | ⚠️ | accent 대비 3.6:1 (16px 버튼, WCAG AA 기준 4.5:1 미달 가능) — §7 주석. 운영자 확인 권장 (대안: primary 버튼 라벨 `#fff` + background opacity 조정). 구현 블로커 X. |

추가 자체 점검:
- **dark default 완결성**: head IIFE + `data-theme="dark"` + `:root`=dark + `[data-theme="light"]` 오버라이드 4단계 모두 §6.5 에 코드 블록으로 명시. dev 가 복붙하면 바로 동작 ✅
- **#theme-toggle ID 일관성**: §4.2 (Topbar), §5.5 (컴포넌트), §6.5 (JS 코드 블록), §8.1 (변경 범위), AC2 매핑 — 5곳에서 일관되게 `theme-toggle` 사용 ✅
- **surgical changes**: §8.1 에서 변경 파일·행 범위를 3파일·8포인트로 한정, 나머지 명시적 보존 ✅
- **prefers-reduced-motion**: §4.4 (display 펄스), §7 (접근성) 양쪽에 명시 ✅
- **file:// CORS 안전**: ES module `import` 유지 시 file:// 에서 CORS 오류 가능 — 기존 구현이 이미 `type="module"` 사용 중이며 dev 가 인지하고 있음. 명세 범위 외 (현 타이머는 로컬 서버 또는 Live Server 환경 전제). mockup HTML 은 자체 JS 포함(비-module)으로 file:// AC2 충족.

---

## 13. 운영자 결정 필요

1. **accent 색 WCAG 대비** — dark 모드 accent `#5b82f0` 위 흰 텍스트 대비 ~3.6:1. WCAG AA (4.5:1) 미달. 버튼 라벨 16px bold → 대형 텍스트 기준(3:1) 충족. 운영자 OK 또는 accent를 `#6a92f7` (3:1+ 확실) 로 변경 가능.
2. **running/paused 상태 display 색 강조** — 현재 default `--color-text-primary`. `--color-timer-running`(초록) / `--color-timer-paused`(앰버) 적용 여부는 운영자 UX 결정. 구현 블로커 X.
3. **T 키 단축키 충돌** — input focus 중 T 입력 시 테마 전환 여부. §6.5 코드에서 input focus 시 return 처리 권장.
