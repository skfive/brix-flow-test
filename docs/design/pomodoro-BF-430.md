# 뽀모도로 SPA 디자인 명세 (BF-430)

> 관련 task: BF-431 (designer)
> mockup: [`docs/design/mockups/pomodoro-BF-430.html`](mockups/pomodoro-BF-430.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `pomodoro/index.html` (URL 진입점 `/pomodoro`)
- 다크 우선 단일 카드 레이아웃: **모드 배지 → 사이클 dot → 대형 카운트다운(mm:ss) → 컨트롤 버튼 3종(Start/Pause·Reset·Skip) → 사이클 카운터 텍스트**
- vanilla HTML/CSS/JS — 외부 CDN·module import 금지 (file:// CORS 안전)
- 토큰 시스템은 `notepad-BF-400` / `timer-BF-405` / `stopwatch-BF-415` 와 공유, 본 명세는 **뽀모도로 전용 토큰만 추가**

### 1.2 사용자 경험 목표
- **다크 우선**: default `data-theme="dark"`. 라이트는 토글로만 전환 (notepad/timer 와 달리 첫 진입을 다크로 고정 → "집중 모드" 시각 시그널)
- **현재 모드를 1초 안에 인지**: FOCUS / SHORT_BREAK / LONG_BREAK 의 색 매핑을 모드 배지·display·progress dot 에 일관 적용
- **카운트다운 가독성 절대 우선**: 데스크탑 6rem(96px), 모바일 4rem(64px) `--font-mono` + `tabular-nums` 로 자릿수 떨림 0
- **사이클 흐름 시각화**: 4개 dot 으로 "FOCUS×4 → LONG_BREAK" 한 사이클 표현. 완료 dot 은 채움, 진행 중 dot 은 outline + 펄스
- **부드러운 모드 전환**: 모드 변경 시 220ms `fade(0→1) + scale(0.96→1)` 미세 인터랙션으로 정보 위계 강조
- **키보드 단축**: `Space` 시작/일시정지, `R` 리셋, `S` skip, `T` 테마 토글

### 1.3 비목표 (Out of Scope)
- **백그라운드 푸시 / 사운드 / Web Notification** (시각 신호만 — v1)
- **다중 인스턴스 / 큐** (단일 타이머 1개만)
- **커스텀 사이클 설정 UI** (FOCUS 25 / SHORT 5 / LONG 15, 사이클당 4 FOCUS — v1 하드코딩, 후속 Epic 에서 settings UI)
- **외부 폰트 CDN** (시스템 스택만 — file:// 환경 동작 보장)
- **ES module import via CDN** — 단일 `<script src="main.js">` 만 사용 (CORS 회피)
- **확장 통계·히스토리** (주간 그래프 / 사이클 히스토리 / 카테고리 분류 등 — 후속 Epic)
  - **단, "오늘 누적 집중 시간" 1줄 라벨은 v1 포함** (§4.10 / §6.7) — minimal stat. 자정 경계에서 자동 리셋되는 단일 수치이므로 별도 카드/그래프 없이 topbar 캡션 1개로 처리

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/notepad-BF-400.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth). 뽀모도로 전용 토큰만 §2.2 에 추가.

### 2.1 색상 토큰 (재사용 — notepad/timer/stopwatch 공유)

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드 표면 (pomodoro card) |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 버튼 hover / dot empty fill |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 표면 구분선 |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | dot outline / button outline |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 본문·display·사이클 카운터 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | label·hint·"사이클 N/4" |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | placeholder·완료 후 disabled |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action (Start) base·focus ring base |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | Reset 버튼 hover 텍스트 강조 |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 뽀모도로 전용 추가 토큰 (모드 색 매핑)

> **AC 직접 매핑**: `--color-focus` (FOCUS 빨강), `--color-break` (SHORT_BREAK 청록), `--color-long-break` (LONG_BREAK 보라) 3종이 모드 시그너처. 각 모드별로 배경 tint·텍스트·border 3단 페어 정의해 배지/display/dot 에서 재사용.

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-focus` | `#E04848` | `#FF6B6B` | **FOCUS 모드 시그너처 (빨강)** — display 색·배지 텍스트·dot 채움 |
| `--color-focus-bg` | `#FCE9E9` | `#3A1F22` | FOCUS 배지 배경·display halo (선택) |
| `--color-focus-border` | `#F4B5B5` | `#7A3A3F` | FOCUS 배지 border |
| `--color-break` | `#0FA8A8` | `#3DD9D9` | **SHORT_BREAK 모드 시그너처 (청록)** — display 색·배지 텍스트·dot 채움 |
| `--color-break-bg` | `#E0F7F7` | `#0E2F30` | SHORT_BREAK 배지 배경 |
| `--color-break-border` | `#A8E4E4` | `#1F5C5D` | SHORT_BREAK 배지 border |
| `--color-long-break` | `#7B5BE8` | `#A48BFF` | **LONG_BREAK 모드 시그너처 (보라)** — display 색·배지 텍스트·dot 채움 |
| `--color-long-break-bg` | `#EFEAFD` | `#1F1A3A` | LONG_BREAK 배지 배경 |
| `--color-long-break-border` | `#C8B7F4` | `#4A3D7A` | LONG_BREAK 배지 border |
| `--color-dot-empty` | `#E5E5E2` | `#262B36` | 미완료 사이클 dot 배경 (= border-default alias) |

> 위 3색 (`--color-focus` / `--color-break` / `--color-long-break`) 은 **그 단계에서만 활성** — 동시에 두 색 노출 금지. 모드 전환 시 §6.4 fade+scale 으로 자연 교체.

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
| `--radius-sm` | `4px` (dot · 작은 chip) |
| `--radius-md` | `8px` (button) |
| `--radius-lg` | `12px` (pomodoro card) |
| `--radius-pill` | `999px` (모드 배지) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` (light) / `0 4px 16px rgba(0,0,0,0.32)` (dark) |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

### 2.5 모션 토큰 (신규)

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--motion-fast` | `120ms` | hover / press |
| `--motion-mid` | `220ms` | 모드 전환 fade+scale (§6.4) |
| `--motion-slow` | `400ms` | 사이클 완료 dot 채움 |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 기본 easing |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1.2)` | 모드 전환 scale (살짝 over-shoot 없는 lift) |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **countdown (desktop, ≥640px)** | **`96px` / `6rem`** | `300` | `1` | `-0.02em` | `--text-countdown` |
| **countdown (mobile, <640px)** | **`64px` / `4rem`** | `300` | `1` | `-0.02em` | `--text-countdown-sm` |
| mode-badge | `13px` | `600` | `1` | `0.06em` (uppercase) | `--text-mode-badge` |
| cycle-counter | `14px` | `500` | `1.4` | `0` | `--text-cycle` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |
| **button-primary-lg** (Start/Pause) | `16px` | `600` | `1` | `0` | `--text-button-lg` |

countdown 은 **`--font-mono`** + `font-variant-numeric: tabular-nums` 적용 — `mm:ss` 자릿수 변동 (예: 10:00 → 9:59) 시 가로폭 흔들림 0. weight `300` 으로 굵기를 줄여 시각 잡음 최소화.

> **정량 고정 (AC 매핑)**:
> - 데스크탑 카운트다운: `6rem` (96px)
> - 모바일 (<640px) 카운트다운: `4rem` (64px)
> - `font-variant-numeric: tabular-nums` 필수

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 640px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar · "뽀모도로"                       [🌙 토글]       │  56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│           ┌─────────────────────────────────┐            │
│           │                                 │            │
│           │       [ FOCUS ]   (배지)         │  ↑ mode    │
│           │                                 │            │
│           │      ●  ●  ○  ○                 │  cycle dot │
│           │                                 │            │
│           │           24:37                 │  display   │
│           │                                 │ (6rem mono)│
│           │                                 │            │
│           │   [▶ Start]  [⟲ Reset]  [⤼ Skip] │  controls │
│           │                                 │            │
│           │       사이클  2 / 4               │  counter  │
│           │                                 │            │
│           └─────────────────────────────────┘            │
│                                                          │
│       <kbd>Space</kbd> 시작/정지 · R 리셋 · S Skip · T 테마│  kbd-hint
└──────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 560px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- pomodoro card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-7) var(--space-6)`
- card 내부 세로 stack: `display: flex; flex-direction: column; align-items: center;`, `gap: var(--space-5)` (배지↔dot↔display↔controls↔counter 각 24px)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "뽀모도로" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (notepad/timer 와 동일 패턴)

### 4.3 모드 배지 (현재 모드 표시)

```
  ┌──────────────┐
  │   FOCUS      │   pill shape, 색은 현재 모드에 따라 변동
  └──────────────┘
```

- 모양: `border-radius: var(--radius-pill)` (999px), `padding: var(--space-1) var(--space-4)` (4px / 16px)
- 타이포: `--text-mode-badge` (13px / 600 / uppercase / letter-spacing 0.06em)
- 색 매핑 (배경 / border / 텍스트 모두 모드별 토큰 사용):

| 모드 | 배경 | border | 텍스트 |
|---|---|---|---|
| FOCUS | `var(--color-focus-bg)` | `1px solid var(--color-focus-border)` | `var(--color-focus)` |
| SHORT_BREAK | `var(--color-break-bg)` | `1px solid var(--color-break-border)` | `var(--color-break)` |
| LONG_BREAK | `var(--color-long-break-bg)` | `1px solid var(--color-long-break-border)` | `var(--color-long-break)` |

- 라벨 텍스트: `FOCUS` / `SHORT BREAK` / `LONG BREAK` (UI 가독성 위해 underscore 제거하고 공백)
- `aria-live="polite"` — 모드 전환 시 스크린 리더 알림

### 4.4 사이클 dot (진행 시각화)

```
  ●  ●  ○  ○        (FOCUS 2 회 완료, 3·4 미완료)
```

- 4 개 dot 가로 배치, `display: flex; gap: 4px` ← **AC 명시 (정량)**
- 각 dot: `width: 10px; height: 10px; border-radius: var(--radius-sm)` (4px — 살짝 둥근 사각). 또는 `border-radius: 50%` (원형) — **v1 채택: 4px 둥근 사각** (각진 시각 = "체크리스트" 메타포, 원형 dot 보다 명확)
- 상태별 시각:
  - **완료된 FOCUS** (n < currentCycle): 배경 `var(--color-focus)`, border `none`
  - **현재 진행 중 FOCUS** (n === currentCycle, FOCUS 중): 배경 `transparent`, `border: 2px solid var(--color-focus)`, `animation: dot-pulse 1.4s ease-in-out infinite` (opacity 0.5 → 1.0 → 0.5)
  - **현재 BREAK 중** (직전 FOCUS 완료 후 휴식): 해당 인덱스 dot 은 채움 + 다음 dot 은 outline+pulse 없이 빈 상태
  - **미완료 FOCUS**: 배경 `var(--color-dot-empty)`, border `none`
- LONG_BREAK 시: 4 개 dot 모두 채워진 상태로 표시 + 추가 inline 텍스트 "사이클 완료" (`--text-caption`, `--color-long-break`) — dot 하단에 작게
- `prefers-reduced-motion: reduce` 시 pulse animation 비활성 (정적 outline 만)

### 4.5 카운트다운 display (mm:ss)

- 컨테이너: `display: flex; align-items: baseline; justify-content: center; gap: 0`
- 텍스트: `--text-countdown` (desktop 6rem), `--font-mono`, `font-variant-numeric: tabular-nums`
- 색 (모드별 — running/paused 동일):

| 모드 | 색 |
|---|---|
| FOCUS | `var(--color-focus)` |
| SHORT_BREAK | `var(--color-break)` |
| LONG_BREAK | `var(--color-long-break)` |

- paused 시: 동일 색 유지 + `opacity: 0.7` (정지 시그널). running 복귀 시 `opacity: 1`. transition `var(--motion-fast)`
- 형식: `MM:SS` 항상 2자리 zero-pad. 최댓값 v1 은 `25:00` (FOCUS), `15:00` (LONG_BREAK), `5:00` (SHORT_BREAK)
- `role="timer" aria-live="off"` (매초 갱신을 SR 가 안 읽도록), 모드 전환 시 §4.3 배지가 `aria-live="polite"` 로 대신 알림

### 4.6 컨트롤 버튼 (3종 한 줄)

| 버튼 | 라벨 | variant | 동작 |
|---|---|---|---|
| 1번 (primary) | `▶ Start` / `⏸ Pause` / `▶ Resume` (상태별) | primary-lg | running ↔ paused 토글 |
| 2번 | `⟲ Reset` | ghost-lg | 현재 모드의 잔여 시간 → 초기값 복귀 (FOCUS 25:00 등), running 중에도 즉시 실행 |
| 3번 | `⤼ Skip` | ghost-lg | 현재 모드 종료 처리 → 다음 모드 진입 (FOCUS → SHORT_BREAK, 4번째 FOCUS → LONG_BREAK 등) |

- 가로 배치, `gap: var(--space-3)` (12px)
- primary-lg: `height: 48px`, `min-width: 132px`, `padding: 0 var(--space-5)`, `font: var(--text-button-lg)`, `border-radius: var(--radius-md)`
  - 배경: **모드 시그너처 색** — FOCUS = `var(--color-focus)`, SHORT_BREAK = `var(--color-break)`, LONG_BREAK = `var(--color-long-break)` (모드 따라 동적)
  - 텍스트: 다크 모드에서는 검정 텍스트 (`#0F1115`) 가독성 위해 — light 에서는 흰색 (`#FFFFFF`)
  - hover: 같은 토큰 + `filter: brightness(1.08)`
  - active: `transform: translateY(1px)`
- ghost-lg (Reset / Skip): `height: 48px`, `min-width: 96px`, `padding: 0 var(--space-4)`, `font: var(--text-button-lg)`, `background: transparent`, `border: 1px solid var(--color-border-strong)`, `color: var(--color-text-secondary)`
  - hover: `background: var(--color-bg-subtle)`, Reset 만 텍스트 색 `var(--color-danger)`
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- disabled (사용 안 함 — v1 모든 모드에서 3 버튼 항상 활성)

### 4.7 사이클 카운터 텍스트

- 위치: controls 아래
- 형식: `사이클  N / 4` (N = 현재 진행 중인 FOCUS 인덱스, 1~4)
- 타이포: `--text-cycle` (14px / 500 / `--color-text-secondary`)
- N 의 색: 현재 모드 시그너처 색 (FOCUS 빨강 / SHORT 청록 / LONG 보라) — `font-weight: 600` 으로 강조
- LONG_BREAK 진입 시: "사이클 완료 · LONG BREAK" 라벨로 치환 (분기 명확성)

### 4.8 키보드 단축 hint

- 위치: card 외부, page 하단 가운데
- 텍스트: `<kbd>Space</kbd> 시작/정지 · <kbd>R</kbd> 리셋 · <kbd>S</kbd> Skip · <kbd>T</kbd> 테마`
- 타이포: `--text-caption`, `--color-text-muted`
- `<kbd>` 스타일: `padding: 2px 6px`, `border: 1px solid var(--color-border-default)`, `border-radius: 3px`, `background: var(--color-bg-subtle)`, `font: 11px/1 var(--font-mono)`

### 4.9 반응형 Breakpoint

| breakpoint | 동작 |
|---|---|
| `≥ 640px` (desktop / tablet) | countdown `--text-countdown` (96px / 6rem), card max-width `560px`, padding `--space-7 --space-6` |
| **`< 640px` (mobile)** | **countdown `--text-countdown-sm` (64px / 4rem)** ← AC 명시, card 좌우 padding `--space-5 --space-4` (24px / 16px), card max-width `100%`, `margin: var(--space-4)`, controls 한 줄 유지 (3 버튼 모두 `flex: 1 1 0`, `min-width: 0` 으로 균등 분배) |
| `< 380px` (XS) | controls 의 라벨 단축 (`Reset` → `⟲`, `Skip` → `⤼`) 아이콘만, 시작/정지는 텍스트 유지 |

### 4.10 오늘 누적 집중 시간 라벨 (`<FocusTotal>` — v1 minimal stat)

> **AC 매핑**: "오늘 누적 집중 시간 자정 리셋" — §1.3 minimal stat 예외, §6.7 정책 상세.

```
  [🌙]   오늘 집중 1h 24m       ← topbar 우측 끝
```

- 위치: topbar 우측, 다크 토글 버튼 **왼쪽** 인접 (gap `var(--space-3)` = 12px)
- 마크업 권장: `<span class="focus-total" id="focus-total" aria-label="오늘 누적 집중 시간" aria-live="off">오늘 집중 0m</span>`
- 타이포: `--text-cycle` (14px / 500), 색 `var(--color-text-secondary)` — 정적 톤. 강조 X (메인 정보는 카운트다운).
- 텍스트 형식 (분 단위 round-down, paused 시간 제외):
  - 누적 0 분: `오늘 집중 0m`
  - 0 < n < 60: `오늘 집중 {n}m`
  - n ≥ 60: `오늘 집중 {h}h {m}m` (예: `1h 24m`)
- 모바일 (< 640px): topbar 가 좁으면 `오늘 {n}m` 으로 축약 (label 만 단축, 숫자 동일)
- `aria-live="off"`: 매초 갱신을 SR 가 안 읽도록. 자정 리셋 / 모드 전환 등 의미 변화 시점에만 SR 가 읽도록 §6.7 핸들러에서 `aria-live="polite"` 일시 토글 OK (선택).

---

## 5. 컴포넌트 명세

### 5.1 `<ModeBadge>`
props:
- `mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK"`

명세: §4.3. `aria-live="polite"`. 라벨은 `FOCUS` / `SHORT BREAK` / `LONG BREAK`.

### 5.2 `<CycleDots>`
props:
- `total: number` (= 4, 하드코딩)
- `currentCycle: number` (1~4, 현재 진행 중인 FOCUS 인덱스)
- `mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK"`

명세: §4.4. 4 dot 의 상태 분기 + pulse animation. LONG_BREAK 시 inline "사이클 완료" caption 노출.

### 5.3 `<Countdown>` (대형 mm:ss)
props:
- `minutes: number`
- `seconds: number`
- `mode: "FOCUS" | "SHORT_BREAK" | "LONG_BREAK"`
- `state: "idle" | "running" | "paused"`

명세: §4.5. 색 매핑은 mode 기반. paused 시 opacity 0.7.

### 5.4 `<Controls>` (3 버튼)
props:
- `state: "idle" | "running" | "paused"`
- `mode` (primary 배경 색 결정용)
- `onPrimary()` `onReset()` `onSkip()`

명세: §4.6. primary 라벨 분기: idle → `▶ Start`, running → `⏸ Pause`, paused → `▶ Resume`.

### 5.5 `<CycleCounter>`
props: `current: number`, `total: number = 4`, `mode`

명세: §4.7. LONG_BREAK 시 라벨 치환.

### 5.6 `<FocusTotal>` (v1 minimal stat)
props:
- `focusTotalMs: number` (오늘 누적 집중 ms — paused 제외)
- `narrow?: boolean` (true 시 모바일 축약 `오늘 {n}m`)

명세: §4.10. 자정 리셋 정책은 §6.7. 매 tick / 모드 전환 / 페이지 진입 시 갱신. 스토리지 형식은 §6.7 참고.

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

```
              ┌────────────────────────────────┐
              │  idle · FOCUS · 25:00 · 사이클 1 │
              └──────────────┬─────────────────┘
                   Start  │
                          ▼
              ┌────────────────────────────────┐
              │  running · FOCUS · mm:ss ↓     │◄──── Resume
              └──┬──────────────┬──────────────┘
            Pause│              │ 0:00 자동
                 ▼              ▼
       ┌─────────────────┐   ┌───────────────────────────────┐
       │ paused · FOCUS  │   │ running · SHORT_BREAK · 5:00   │
       └────────┬────────┘   └──────────────┬─────────────────┘
                │                           │ 0:00 자동
                │ Resume                    ▼
                └──> running                ┌───────────────────────┐
                                            │ running · FOCUS · 25:00 │
                                            │ 사이클 2 ...             │
                                            └───────────────────────┘
                                                    ⋮ (반복)
                                            ┌───────────────────────────┐
                                            │ 4번째 FOCUS 완료 후 →       │
                                            │ running · LONG_BREAK · 15:00│
                                            └────────────┬──────────────┘
                                                         │ 0:00 자동
                                                         ▼
                                            ┌───────────────────────────┐
                                            │ idle · FOCUS · 25:00 · 사이클 1│ (재시작)
                                            └───────────────────────────┘
```

전이 키:
- `Start` (idle): running 진입, tick 시작
- `Pause` (running): paused, tick 정지
- `Resume` (paused): running, tick 재개
- `Reset` (모든 상태): 현재 모드 초기 시간 + idle. **사이클은 유지** (Reset 으로 사이클 초기화 안 함 — UX 마찰 최소화. 사이클 0 으로 되돌리려면 LONG_BREAK 자동 완료 또는 v2 의 별도 "전체 초기화")
- `Skip` (모든 상태): 현재 모드 시간 0:00 으로 fast-forward → 다음 모드 진입 → 자동 running 시작 (idle 에서 skip 도 마찬가지)
- `0:00 도달` (running): 다음 모드 자동 전이 + 자동 running 시작. **자동 진입이 핵심 UX** — 사용자가 매번 Start 누를 필요 없이 사이클 flow 유지

> **참고**: 자동 진행은 v1 default 채택. 일부 도구는 "각 단계 시작 시 사용자 확인" 옵션을 제공하나, 본 명세 v1 은 단순화 위해 자동만 — §13 운영자 결정 1.

### 6.2 모드 전환 시퀀스 (FOCUS → BREAK 등)

자동 또는 Skip 으로 모드가 바뀔 때 220ms 미세 인터랙션 (§6.4 상세):
1. 직전 모드의 배지·display·dot 동시 `opacity 1 → 0`, `transform: scale(1) → scale(0.96)` (220ms)
2. 동시에 새 모드 색·라벨·dot 상태로 DOM 갱신
3. 새 모드 요소들 `opacity 0 → 1`, `transform: scale(0.96) → scale(1)` (220ms, `--ease-emphasized`)
4. 사이클 카운터의 N 숫자는 같은 transition 동안 색만 fade 교체 (위치 변경 없음)

### 6.3 키보드 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Space` | primary 버튼 토글 (Start ↔ Pause/Resume) | 전역. input 이 없으므로 충돌 0 |
| `R` (대/소문자) | Reset | 전역 |
| `S` (대/소문자) | Skip | 전역 |
| `T` (대/소문자) | 테마 토글 (dark ↔ light) | 전역 |
| `Tab` / `Shift+Tab` | topbar 토글 → primary → Reset → Skip 순환 | 전역 |

- focus-visible only outline (마우스 클릭으로 인한 focus 시 outline 비노출)
- 키보드 hint 는 §4.8 page 하단 노출

### 6.4 모드 전환 fade+scale (정량 — AC 매핑)

```css
.mode-zone {
  transition:
    opacity var(--motion-mid) var(--ease-standard),
    transform var(--motion-mid) var(--ease-emphasized);
}
.mode-zone[data-transitioning="true"] {
  opacity: 0;
  transform: scale(0.96);
}
```

- 시간: **220ms** (`--motion-mid`)
- transform: **scale(0.96) → scale(1)** (lift 효과, over-shoot 없음)
- easing: `--ease-emphasized` (`cubic-bezier(0.2, 0, 0, 1.2)`)
- 적용 대상 (`.mode-zone`): 모드 배지·display·controls 의 primary 버튼 배경색 (`transition: background-color var(--motion-mid)`)
- `prefers-reduced-motion: reduce` 시: transform 비활성, opacity 만 step (instant). transition `0ms` 적용.

### 6.5 매초 갱신 (running 중)
- `requestAnimationFrame` + `performance.now()` 기반 drift-correction (timer-BF-405 §6.3 패턴 재사용)
- 매 tick: `disp-m` / `disp-s` textContent 갱신만 (re-render 최소)
- 0:00 도달 시: 다음 모드 자동 진입 (§6.2 시퀀스 트리거)

### 6.6 다크 모드 (default 다크)
- 첫 진입 시 `<html data-theme="dark">` ← **default**
- topbar `[🌙/☀]` 토글로 dark ↔ light 전환 + `T` 키로도 가능
- `localStorage["bf-theme"]` 키 공유 (notepad/timer/stopwatch 와 동일) — 페이지 간 일관성 유지
  - **단**, 본 페이지 첫 진입 시 저장값이 없으면 OS `prefers-color-scheme` 무시하고 **dark 강제** (집중 모드 시각 시그널) — 토글 시 저장값 생성

### 6.7 오늘 누적 집중 시간 자정 리셋 (v1 minimal stat 정책)

> **AC 보강**: developer 가 회귀 가드 (`tests/pomodoro-timer.test.js: accumulateFocusMs · 자정 리셋`) 를 그대로 통과시킬 수 있도록 정책을 정량화.

- **저장 키**: `localStorage["bf-pomodoro-stats"]`
- **스키마**:
  ```json
  { "dateKey": "YYYY-MM-DD", "focusTotalMs": 0 }
  ```
  - `dateKey` — **로컬 타임존 기준** 날짜 문자열. 권장: `new Date().toLocaleDateString("sv-SE")` (sv-SE 로케일 → ISO 8601 형식 `YYYY-MM-DD` 보장, file:// 환경에서 안전)
  - `focusTotalMs` — 누적 ms (정수). paused 시간 제외, **FOCUS 모드만 누적** (SHORT_BREAK / LONG_BREAK 미산입)
- **누적 시점** (FOCUS 모드 한정):
  1. FOCUS 0:00 자동 도달 → 직전 running 구간 ms 가산 후 다음 모드 전이
  2. FOCUS 중 Skip → 직전 running 구간 ms 가산 후 다음 모드 전이
  3. FOCUS 중 Pause → 직전 running 구간 ms 가산 (이후 Resume 은 새 구간 시작)
  4. Reset (FOCUS 중) → 가산 안 함 (해당 구간을 "취소" 로 해석)
- **자정 경계 처리**:
  - 갱신 직전 `dateKey` 와 현재 로컬 날짜 비교 → 다르면 **`focusTotalMs = 0` 으로 교체 후 새 dateKey 저장**, 그 다음 새 가산 적용
  - 페이지 진입 시 (load 핸들러)에도 동일 검증 — 어제 띄워둔 탭이 자정을 넘긴 상태로 살아남은 경우 즉시 0 으로 표시
  - 매 tick (running 중 1Hz) 시점에도 dateKey 검증 권장 — 타이머가 자정 cross 하면 즉시 `0m` 표시 후 새 누적 시작
- **갱신 시점 (UI 라벨 §4.10)**:
  - running 중 매 tick (1Hz)
  - 모드 전환 직후 (자동 / Skip 모두)
  - 페이지 load 시 1회
  - `T` 다크 토글 시는 갱신 불필요 (수치 변화 없음)
- **prefers-reduced-motion / 접근성**:
  - 라벨 자체는 정적 (transition 없음)
  - SR 알림은 자정 리셋 직후 1회 권장 (`aria-live="polite"` 1프레임 토글) — 필수 아님 (선택)

### 6.8 4 사이클마다 LONG_BREAK 자동 진입 (사이클 흐름 정책)

> **AC 보강**: §6.1 상태 머신 다이어그램·§7.9 `CYCLES_PER_LONG_BREAK = 4` 상수와 정합. 별도 항목으로 정량화.

- **사이클 정의**: 1 사이클 = `FOCUS → SHORT_BREAK` 4 회 반복 + 마지막에 `LONG_BREAK` 1 회
- **카운터 진행 규칙**:
  - 진행 변수 `currentCycle ∈ {1, 2, 3, 4}` — 현재 진행 중인 FOCUS 인덱스
  - FOCUS 종료 (자동 0:00 / Skip) → `currentCycle === 4` 면 다음 모드 = **LONG_BREAK**, 아니면 SHORT_BREAK
  - SHORT_BREAK 종료 → `currentCycle += 1` (다음 FOCUS 진입)
  - LONG_BREAK 종료 → `currentCycle = 1` (다음 사이클 시작, idle FOCUS 25:00 으로 복귀 — §6.1 다이어그램 참고)
- **시각 표현**:
  - §4.4 사이클 dot: `currentCycle === 4` 의 FOCUS 가 진행 중이면 dot 4 outline+pulse, 종료 후 LONG_BREAK 진입 시 4 dot 모두 채움 + "사이클 완료" inline caption (`--color-long-break`)
  - §4.7 사이클 카운터: LONG_BREAK 진입 시 `사이클 N / 4` → `사이클 완료 · LONG BREAK` 로 라벨 치환
- **Skip / Reset 의 사이클 영향**:
  - Skip — 현 모드를 즉시 종료, 위 진행 규칙 그대로 적용 (즉 4번째 FOCUS 중 Skip 도 LONG_BREAK 로 진입)
  - Reset — `currentCycle` **불변** (§6.1 명시), 현재 모드 시간만 초기 시간으로 복귀
- **하드코딩 상수**: §7.9 `CYCLES_PER_LONG_BREAK = 4` — settings UI 도입 전까지 변경 금지

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── pomodoro/
│   ├── index.html       # 뽀모도로 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃
│   ├── main.js          # 상태 머신 + tick loop + 이벤트
│   └── storage.js       # (옵션) bf-theme + 사이클 영속 — v1 은 사이클 미영속, theme 만 main.js 인라인 OK
├── notepad/  timer/  stopwatch/  kanban/    # 기존 — 보존
└── docs/design/
    ├── pomodoro-BF-430.md            (본 문서)
    └── mockups/pomodoro-BF-430.html  (시각 mockup)
```

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>뽀모도로</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">뽀모도로</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <section class="card pomodoro" aria-label="뽀모도로 타이머" data-mode="FOCUS">
        <!-- 모드 배지 -->
        <div class="mode-badge mode-zone" id="mode-badge" aria-live="polite">
          <span class="mode-badge__label" id="mode-label">FOCUS</span>
        </div>

        <!-- 사이클 dot -->
        <div class="cycle-dots" id="cycle-dots" role="img" aria-label="사이클 진행">
          <span class="dot dot--done" data-index="1"></span>
          <span class="dot dot--current" data-index="2"></span>
          <span class="dot dot--empty" data-index="3"></span>
          <span class="dot dot--empty" data-index="4"></span>
        </div>

        <!-- 대형 카운트다운 -->
        <div class="countdown mode-zone" id="countdown" role="timer" aria-live="off" aria-label="남은 시간">
          <span class="countdown__minutes" id="disp-m">25</span>
          <span class="countdown__colon" aria-hidden="true">:</span>
          <span class="countdown__seconds" id="disp-s">00</span>
        </div>

        <!-- 컨트롤 3종 -->
        <div class="controls">
          <button type="button" class="btn btn--primary-lg mode-zone" id="btn-primary">▶ Start</button>
          <button type="button" class="btn btn--ghost-lg" id="btn-reset">⟲ Reset</button>
          <button type="button" class="btn btn--ghost-lg" id="btn-skip">⤼ Skip</button>
        </div>

        <!-- 사이클 카운터 -->
        <p class="cycle-counter" id="cycle-counter">
          사이클 <span class="cycle-counter__n" id="cycle-n">1</span> / 4
        </p>
      </section>

      <p class="kbd-hint">
        <kbd>Space</kbd> 시작/정지 ·
        <kbd>R</kbd> 리셋 ·
        <kbd>S</kbd> Skip ·
        <kbd>T</kbd> 테마
      </p>
    </main>

    <script src="main.js"></script>
  </body>
</html>
```

> **중요**: `<script src="main.js">` — **`type="module"` 사용 금지** (file:// CORS 차단됨). 단일 IIFE 또는 전역 함수로 작성. AC 명시 사항.

### 7.3 CSS 변수 정의 위치

`pomodoro/styles.css` 상단에 `:root` 블록 — notepad/styles.css 토큰 복사 + 본 명세 §2.2 모드 토큰 + §2.5 모션 토큰 + §3 typography 토큰 추가:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color tokens (notepad-BF-400 §2.1 복사) */
  --color-bg-canvas: #FAFAF9;
  --color-bg-surface: #FFFFFF;
  --color-bg-subtle: #F1F1EF;
  --color-border-default: #E5E5E2;
  --color-border-strong: #D0D0CC;
  --color-text-primary: #1A1A19;
  --color-text-secondary: #6B6B66;
  --color-text-muted: #9A9A93;
  --color-accent: #3563E9;
  --color-accent-hover: #2A4FC0;
  --color-danger: #D14343;
  --color-danger-hover: #A83333;
  --color-focus-ring: rgba(53, 99, 233, 0.45);

  /* pomodoro 전용 (§2.2) — light */
  --color-focus: #E04848;
  --color-focus-bg: #FCE9E9;
  --color-focus-border: #F4B5B5;
  --color-break: #0FA8A8;
  --color-break-bg: #E0F7F7;
  --color-break-border: #A8E4E4;
  --color-long-break: #7B5BE8;
  --color-long-break-bg: #EFEAFD;
  --color-long-break-border: #C8B7F4;
  --color-dot-empty: #E5E5E2;

  /* spacing / radius / shadow */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-pill: 999px;
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.06);

  /* motion (§2.5) */
  --motion-fast: 120ms;
  --motion-mid: 220ms;
  --motion-slow: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1.2);

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-countdown: 300 6rem/1 var(--font-mono);
  --text-countdown-sm: 300 4rem/1 var(--font-mono);
  --text-mode-badge: 600 13px/1 var(--font-sans);
  --text-cycle: 500 14px/1.4 var(--font-sans);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
  --text-button-lg: 600 16px/1 var(--font-sans);
}
[data-theme="dark"] {
  --color-bg-canvas: #0F1115;
  --color-bg-surface: #171A21;
  --color-bg-subtle: #1E222B;
  --color-border-default: #262B36;
  --color-border-strong: #3A4150;
  --color-text-primary: #E8E8E4;
  --color-text-secondary: #9A9A93;
  --color-text-muted: #6B6B66;
  --color-accent: #5B82F0;
  --color-accent-hover: #7596F3;
  --color-danger: #E55858;
  --color-danger-hover: #EC7676;
  --color-focus-ring: rgba(91, 130, 240, 0.55);

  --color-focus: #FF6B6B;
  --color-focus-bg: #3A1F22;
  --color-focus-border: #7A3A3F;
  --color-break: #3DD9D9;
  --color-break-bg: #0E2F30;
  --color-break-border: #1F5C5D;
  --color-long-break: #A48BFF;
  --color-long-break-bg: #1F1A3A;
  --color-long-break-border: #4A3D7A;
  --color-dot-empty: #262B36;

  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.32);
}
```

### 7.4 모드별 토큰 alias 패턴 (구현 권장)

card 의 `data-mode` 속성에 따라 "현재 모드 시그너처" 변수 alias 를 정의 → display/badge/primary 가 alias 만 참조하면 모드 변경 시 색이 자동 추적:

```css
.pomodoro[data-mode="FOCUS"] {
  --current-color: var(--color-focus);
  --current-bg: var(--color-focus-bg);
  --current-border: var(--color-focus-border);
}
.pomodoro[data-mode="SHORT_BREAK"] {
  --current-color: var(--color-break);
  --current-bg: var(--color-break-bg);
  --current-border: var(--color-break-border);
}
.pomodoro[data-mode="LONG_BREAK"] {
  --current-color: var(--color-long-break);
  --current-bg: var(--color-long-break-bg);
  --current-border: var(--color-long-break-border);
}

.countdown { color: var(--current-color); }
.mode-badge {
  background: var(--current-bg);
  border: 1px solid var(--current-border);
  color: var(--current-color);
}
.btn--primary-lg { background: var(--current-color); }
.dot--done { background: var(--current-color); }
.dot--current { border: 2px solid var(--current-color); }
.cycle-counter__n { color: var(--current-color); }
```

→ JS 는 `card.dataset.mode = "SHORT_BREAK"` 한 줄로 전체 색 갱신.

### 7.5 단계별 구현 순서

1. **HTML 골격** (§7.2 그대로) + 빈 `styles.css` / `main.js`
2. **CSS 변수 + base reset** (notepad/timer 동일 — `*{box-sizing:border-box}`, body 토큰 적용, default `data-theme="dark"`)
3. **Topbar** (notepad 와 동일 패턴)
4. **Page + card 컨테이너** (max-width 560px, padding, shadow)
5. **모드 배지** (pill shape, §4.3) — 정적 표시 우선
6. **사이클 dot 4 개** (§4.4) — 상태별 클래스 (`dot--done` / `dot--current` / `dot--empty`)
7. **카운트다운 display** (§4.5, `--text-countdown`, `tabular-nums`)
8. **컨트롤 3 버튼** (§4.6, primary 동적 색 alias)
9. **사이클 카운터** (§4.7)
10. **상태 머신** (`main.js`) — `{ mode, state, remainingMs, currentCycle }` + `render()` 함수
11. **`start() / pause() / reset() / skip()`** — `requestAnimationFrame` + `performance.now()` drift-correction
12. **0:00 자동 모드 전이** + §6.4 fade+scale 트리거 (`card.dataset.transitioning="true"` 토글)
13. **모드 alias 패턴** (§7.4) 으로 단일 `data-mode` 변경만으로 색 전체 갱신
14. **키보드 단축** (§6.3) — `document.addEventListener("keydown")` 전역, Space / R / S / T
15. **반응형** — `@media (max-width: 639px)` countdown 64px / controls 균등 + `@media (max-width: 379px)` 라벨 단축
16. **다크 default 진입** — localStorage 없으면 `dark` 강제 (§6.6)
17. **`prefers-reduced-motion` 가드** — 모든 transition 0ms, dot pulse animation 비활성

### 7.6 a11y 체크
- countdown: `role="timer" aria-live="off"` (매초 갱신 안 읽음)
- 모드 배지: `aria-live="polite"` (모드 전환 시 알림)
- 사이클 dot 영역: `role="img" aria-label="사이클 진행"` + JS 가 dot 변화 시 aria-label 갱신 ("4개 중 2개 완료")
- 모든 interactive 요소: `:focus-visible` 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- `<kbd>` 요소는 SR 가 그대로 읽도록 추가 aria 불필요

### 7.7 CORS 안전성 (AC 매핑)
- ✅ 외부 CDN 호출 0건 — 모든 폰트는 system stack, 아이콘은 emoji/유니코드 문자
- ✅ `<script type="module">` 사용 금지 — 단일 `<script src="main.js">` 만, IIFE 또는 전역 함수
- ✅ `import` / `export` 키워드 금지 — vanilla JS 만
- ✅ 모든 자원은 same-origin 상대 경로
- ✅ file:// 로 직접 열어도 동작해야 함 (CI/dev 환경에서 직접 검증 권장)

### 7.8 정량 일치 기준 (구현 검증 — AC source of truth)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop) | 값 (mobile <640px) | 토큰 |
|---|---|---|---|
| pomodoro card max-width | `560px` | `100%` (margin 16px) | hardcoded |
| card padding | `48px 32px` | `24px 16px` | `--space-7 --space-6` / `--space-5 --space-4` |
| card 내부 stack gap | `24px` | `24px` | `--space-5` |
| **countdown font-size** | **`6rem` (96px)** | **`4rem` (64px)** | `--text-countdown` / `--text-countdown-sm` |
| countdown font-family | `--font-mono` | `--font-mono` | — |
| countdown `font-variant-numeric` | `tabular-nums` | `tabular-nums` | — |
| 모드 배지 padding | `4px 16px` | `4px 16px` | `--space-1 --space-4` |
| 모드 배지 radius | `999px` | `999px` | `--radius-pill` |
| 모드 배지 font | `600 13px/1`, uppercase, letter-spacing `0.06em` | 동일 | `--text-mode-badge` |
| **사이클 dot 크기** | `10px × 10px` | `10px × 10px` | hardcoded |
| **사이클 dot 간격 (gap)** | **`4px`** | **`4px`** | hardcoded — AC 명시 |
| dot border-radius | `4px` | `4px` | `--radius-sm` |
| 진행 중 dot border | `2px solid` | `2px solid` | — |
| primary-lg button height | `48px` | `48px` | hardcoded |
| primary-lg button min-width | `132px` | `auto` (`flex: 1`) | hardcoded |
| primary-lg button font | `600 16px/1` | 동일 | `--text-button-lg` |
| ghost-lg button height | `48px` | `48px` | hardcoded |
| ghost-lg button min-width | `96px` | `auto` (`flex: 1`) | hardcoded |
| controls 버튼 간 gap | `12px` | `12px` | `--space-3` |
| **모드 전환 fade duration** | **`220ms`** | 동일 | `--motion-mid` — AC 명시 |
| **모드 전환 scale** | **`0.96 → 1`** | 동일 | — AC 명시 |
| 모드 전환 easing | `cubic-bezier(0.2, 0, 0, 1.2)` | 동일 | `--ease-emphasized` |
| dot pulse duration | `1.4s ease-in-out infinite` | 동일 | hardcoded |
| focus-ring outline | `2px solid` + `offset 2px` | 동일 | `--color-focus-ring` |

### 7.9 v1 하드코딩 상수 (settings UI 없이)

```js
const DURATIONS = {
  FOCUS: 25 * 60 * 1000,        // 25 분
  SHORT_BREAK: 5 * 60 * 1000,   //  5 분
  LONG_BREAK: 15 * 60 * 1000,   // 15 분
};
const CYCLES_PER_LONG_BREAK = 4;  // FOCUS 4 회 → LONG_BREAK
```

후속 Epic 에서 settings UI 도입 시 `localStorage["bf-pomodoro-config"]` 로 override.

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 참고:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<ModeBadge>` | `Badge` (`variant: custom — color via CSS variable`) |
| `<CycleDots>` | vanilla — shadcn 미제공 (커스텀 dot row) |
| `<Countdown>` | vanilla — large display 는 shadcn 영역 외 |
| primary-lg / ghost-lg `<Controls>` | `Button` (`size: lg`, `variant: default / outline`) |
| 다크 토글 | vanilla (notepad/timer 와 공유 패턴) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`pomodoro/`) 입니다. BF-197 회귀 정책 반영 — 기존 페이지의 head/공통 스크립트 복제 대상 explicit 명시.

### 9.1 보존 (건드리지 마라)
- `notepad/` (index.html, styles.css, main.js, storage.js, ulid.js) — 본 작업과 무관, 변경 금지
- `timer/` (index.html, styles.css, main.js, storage.js, timer.js) — 보존
- `stopwatch/` (index.html, styles.css, main.js, storage.js, stopwatch.js) — 보존
- `kanban/` (index.html, styles.css, main.js, storage.js, drag.js) — 보존
- 기존 SPA 간 link 가 있다면 (`README.md` 또는 root index) 보존

### 9.2 신규 `pomodoro/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | timer/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | timer/index.html | **복제** | 반응형 동작 전제 |
| `<html lang="ko" data-theme="…">` 패턴 | timer/index.html | **복제 + 값 변경** | default `dark` (notepad/timer 는 light, 본 페이지만 dark) |
| `<link rel="stylesheet" href="styles.css">` | timer/index.html | **복제** (경로 그대로 — pomodoro/styles.css) | — |
| `<header class="topbar">` 구조 | timer/index.html | **복제 (간소화)** | timer 의 다크 토글 ghost 버튼만 유지 |
| `<script src="main.js">` (module 아님) | timer/index.html (단, timer 는 module 사용 → 본 페이지는 비-module) | **복제 + `type` 제거** | **AC: type="module" 금지** |
| `:root` CSS 변수 블록 (color/spacing/shadow) | notepad/styles.css 또는 timer/styles.css | **복제 + §2.2 추가 토큰 append** | single source of truth = 본 명세 |
| `bf-theme` localStorage 초기화 로직 | timer/main.js theme init 부분 | **복제 + default 변경** | 저장값 없으면 dark 강제 (§6.6) |

### 9.3 추가/수정해야 할 부분 (pomodoro 전용)
- pomodoro card / mode-badge / cycle-dots / countdown / controls / cycle-counter 마크업 (§7.2)
- pomodoro 전용 색·typo·motion 토큰 (§2.2 / §2.5 / §3)
- 상태 머신·tick loop·모드 전이 (§6.1 / §6.5)
- 모드 alias 패턴 (§7.4)
- 키보드 단축키 Space/R/S/T (§6.3)
- 반응형 mobile breakpoint (§4.9)
- CORS 안전 모드 (§7.7) — script 비-module, 외부 CDN 0

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. timer/main.js 가 `type="module"` 인 점은 **본 페이지에서 비복제** — pomodoro/main.js 는 IIFE 패턴.

---

## 10. mockup 참조

[`docs/design/mockups/pomodoro-BF-430.html`](mockups/pomodoro-BF-430.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0)
- **다크 / 라이트 두 패널 나란히** → 토큰 매핑 시각 검증
- 3가지 모드별 패널 동시 표시:
  1. **FOCUS** (빨강) — 24:37, 사이클 2/4 진행 중
  2. **SHORT_BREAK** (청록) — 04:21, 사이클 2 완료, 휴식
  3. **LONG_BREAK** (보라) — 12:55, 사이클 완료
- mobile (< 640px) 레이아웃 미리보기 섹션 별도 포함 (countdown 4rem)
- 모드 전환 인터랙션 시각 가이드 (정적 캡처)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.8 정량 일치 표가 source of truth.

> **mockup 미반영 항목 (BF-431 보강 후)**: §4.10 `<FocusTotal>` 라벨 (topbar 우측 "오늘 집중 N분") 과 §6.7 자정 리셋 시각 표현은 본 mockup HTML 에는 미반영. dev 는 §4.10 / §6.7 markdown 명세를 source of truth 로 사용. mockup 보강은 후속 docs PR 로 분리 (시각 차이 미미 — 라벨 1개만 추가).

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 다크/라이트 CSS 변수 페어 (`--color-bg-canvas`, `--color-focus`, `--color-break`, LONG_BREAK 보라 토큰) hex 값 명시 | §2.1 (canvas) + §2.2 (focus/break/long-break — light·dark hex 표) + §7.3 (`:root` 실제 코드) | ✓ |
| 데스크탑 카운트다운 6rem, 모바일 <640px 4rem | §3 type 표, §4.5, §4.9 반응형 표, §7.8 정량 표 | ✓ |
| `tabular-nums` 명시 | §3 마지막 줄, §4.5 컨테이너 명세, §7.8 정량 표 | ✓ |
| 사이클 dot 4px gap | §4.4 첫 줄 (AC 명시 표기), §7.8 정량 표 ("AC 명시" annotation) | ✓ |
| FOCUS 빨강 / SHORT_BREAK 청록 / LONG_BREAK 보라 매핑 | §2.2 토큰 표 (3색 hex), §4.3 모드 배지 색 표, §4.5 display 색 표, §7.4 alias 패턴 | ✓ |
| 모드 전환 fade+scale 시간 정량 | §6.4 (220ms, scale 0.96→1, easing), §7.8 정량 표 (AC 명시 표기) | ✓ |
| 키보드 단축키 Space/R/S/T | §6.3 단축키 표, §4.8 hint 노출 | ✓ |
| file:// CORS 안전성 (외부 CDN·module import 금지) | §1.1 (변경 범위), §1.3 (out of scope 명시), §7.2 (script 비-module 주석), §7.7 (CORS 체크리스트), §9.2 (script 복제 시 type 제거 명시) | ✓ |
| 정량 수치로 개발자 그대로 구현 가능 | §7.8 정량 일치 표 (모든 핵심 치수 desktop / mobile 분리) | ✓ |
| 오늘 누적 집중 시간 자정 리셋 (v1 minimal stat) | §1.3 (minimal stat 예외 명시), §4.10 (`<FocusTotal>` 라벨 — 위치·타이포·텍스트 형식), §5.6 (props), §6.7 (저장 키·스키마·누적 시점·자정 경계 처리·tick 검증) | ✓ |
| 4 사이클마다 LONG_BREAK 자동 진입 (사이클 흐름 정책) | §1.2 (사이클 시각화), §4.4 (LONG_BREAK 시 dot 4 채움 + caption), §4.7 (라벨 치환), §6.1 (상태 머신 다이어그램 — 4번째 FOCUS 후 LONG_BREAK), §6.8 (사이클 카운터 진행 규칙 + Skip/Reset 영향), §7.9 (`CYCLES_PER_LONG_BREAK = 4` 상수) | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 AC 12개 (디자인 명세 작성 3 + 정량 4 + CORS 1 + 키보드 1 + 토큰 hex 1 + minimal stat 자정 리셋 1 + 4사이클 LONG_BREAK 자동 전이 1) 모두 cross-reference. BF-431 리뷰 (결함 H) 보강분 2개 §1.3 / §4.10 / §5.6 / §6.7 / §6.8 추가. 누락 0. |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조 + HTML 골격 + CSS 변수 + 모드 alias 패턴 + 17단계 구현 순서 + §7.8 정량 일치 표 + §7.9 v1 상수 — dev 추가 질문 없이 진행 가능 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (4 module 전체), §9.2 복제 대상 (head/script/theme — script type 차이 explicit), §9.3 신규 작성 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla 명시, 후속 shadcn 도입 시 매핑 참고 표 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 3건 |

추가 자체 점검:
- **비범위 명시**: §1.3 에 Notification / 다중 인스턴스 / settings UI / 외부 CDN / module import / 확장 통계 (그래프·히스토리) 6개 explicit 제외 ✓ — 단, "오늘 누적 집중 시간" 1줄 minimal stat 만 v1 포함 (예외 명시 + §4.10 / §6.7 정책 정량화)
- **자정 리셋 정책 정량 (§6.7)**: 저장 키 `bf-pomodoro-stats`, 스키마 `{ dateKey, focusTotalMs }`, 로컬 날짜 기준 (`toLocaleDateString("sv-SE")`), FOCUS 모드만 누적, paused 제외, 페이지 진입·매 tick·모드 전환 3 시점 검증 — dev 회귀 가드 (`accumulateFocusMs`) 통과 정합 ✓
- **4 사이클 LONG_BREAK 정책 정량 (§6.8)**: `currentCycle` 변수 1~4, 4번째 FOCUS 종료 시 LONG_BREAK 전이, Skip 도 동일 진행, Reset 은 사이클 불변, 상수 `CYCLES_PER_LONG_BREAK = 4` — §6.1 상태 머신과 정합 ✓
- **정량 일치 가능성**: §7.8 표가 desktop/mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공, AC 명시 항목 4개 (countdown 6rem/4rem, dot gap 4px, fade 220ms scale 0.96) annotation ✓
- **CORS 안전 명시 위치**: §1.1 (변경 범위) / §1.3 (out of scope) / §7.2 (script 주석) / §7.7 (전용 체크리스트) / §9.2 (timer 와 차이 명시) — 5곳 분산 ✓
- **다크 default 결정**: §6.6 명시 (저장값 없으면 dark 강제) — notepad/timer 와 다른 정책이므로 §9.2 복제 시 default 변경 explicit ✓
- **`prefers-reduced-motion` 가드**: §4.4 (dot pulse) + §6.4 (fade+scale) + §7.5 단계 17 — 3곳에서 명시 ✓
- **모드 alias 패턴** (§7.4): JS 가 `card.dataset.mode` 한 줄만 바꿔 전체 색 갱신 → dev 코드 단순화. mockup 도 같은 패턴으로 시각 검증 ✓
- **사이클 Reset 정책**: §6.1 에서 Reset 은 사이클 유지 / Skip 만 사이클 진행 — UX 의도 explicit (모호 차단)

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 명시된 섹션만 수정):

1. **자동 모드 진입 vs 수동 Start** — v1 default 는 0:00 도달 시 다음 모드 자동 running 진입 (§6.1). 일부 사용자는 단계 사이에 "확인" 을 선호 (UX 마찰 ↓ vs 의도성 ↑). **권장: v1 자동 유지**, 사용자 피드백 후 settings UI 도입 시 옵션화.
2. **Reset 의 사이클 초기화 여부** — v1 default 는 Reset 이 현재 모드 시간만 리셋, 사이클 유지 (§6.1). "전체 처음부터" 가 필요하면 long-press(800ms) 로 분기 가능. **권장: v1 단순 reset 유지**, 후속 Epic 에서 long-press 도입.
3. **다크 default 강제** — 본 페이지는 첫 진입 시 (localStorage 없을 때) dark 강제 (§6.6). notepad/timer 는 OS prefers 따름 → 일관성 위해 OS prefers 따르는 게 안전할 수도 있음. **권장: dark 강제 유지** ("집중 모드" 시각 시그널 부여 — 본 페이지의 USP), 그러나 운영자 컨펌 필요.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
