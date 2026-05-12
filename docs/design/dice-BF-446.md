# 주사위 SPA 디자인 명세 (BF-446)

> 관련 task: BF-447 (designer · fast mode)
> mockup: [`docs/design/mockups/dice-BF-446.html`](mockups/dice-BF-446.html)
> 작성자: 이디자인

---

## 0. fast mode 안내

본 명세는 **fast mode** 로 진행됩니다 — reviewer-design 단계가 생략되므로 designer
self-critique 를 강화합니다. §11 의 **AC 매핑 표** 는 의무 포함 (운영자 정책).
dev 페르소나는 본 명세 + mockup HTML 만으로 추가 질문 없이 구현 가능해야 합니다.

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `dice/index.html` (URL 진입점 `/dice`)
- **다크 우선** 단일 카드 레이아웃: **주사위 박스 (이모지 ⚀~⚅, `5rem`) → 굴리기 CTA → 통계 카드 (합계 강조) → 히스토리 compact row**
- vanilla HTML/CSS/JS — **ES module / fetch / 외부 CDN 금지** (file:// CORS 안전)
- 토큰 시스템은 `notepad-BF-400` / `timer-BF-405` / `stopwatch-BF-415` / `pomodoro-BF-430` / `clicker-BF-441` 와 공유, 본 명세는 **주사위 전용 토큰만 추가** (rose accent 페어)

### 1.2 사용자 경험 목표
- **다크 우선**: default `data-theme="dark"`. 라이트는 토글로만 전환 (pomodoro / clicker 와 동일 패턴) — "게임/도구 모드" 시각 시그널
- **이모지로 주사위 시각 구현**: 외부 이미지 / svg / 폰트 CDN 없이 `⚀ ⚁ ⚂ ⚃ ⚄ ⚅` 유니코드 글리프만 사용 — file:// 안전 + 인쇄/스크린샷 친화
- **굴리기 결과 즉시 명료**: 다이스 페이스 자체가 점 패턴이라 별도 숫자 표기 안해도 즉시 인식. 합계만 별도 카드로 시선 잡음 최소화
- **통계 합계 강조**: 통계 카드 4 행 (합계 / 굴림 횟수 / 평균 / 최대) 중 **합계가 가장 큰 typo** — 게임 의사결정에 가장 자주 참조되는 값
- **히스토리 compact**: 한 줄당 1 굴림 (`#42  ⚂ ⚄  합 8`) — 스크롤 적게, 빠른 시각 스캔
- **단순함 (Simplicity First)**: 주사위 박스·굴리기·통계·히스토리 외 다른 UI 없음. v1 은 minimal core 만
- **키보드 단축**: `Space` / `Enter` 굴리기, `R` 통계+히스토리 리셋, `T` 테마 토글

### 1.3 비목표 (Out of Scope)
- **localStorage 통계 / 히스토리 영속화** — v1 은 in-memory 단발 (새로고침 시 리셋). `bf-theme` 만 공유 localStorage 사용
- **주사위 개수 변경 / d20 등 다른 면 수** — v1 은 **2개의 6면체 주사위 고정**. 후속 Epic 에서 옵션화
- **사운드 / 진동 / Web Notification** — 시각 피드백만
- **3D 굴림 애니메이션** — v1 은 2D 페이스 전환만 (rapid swap 효과 — §6.3)
- **외부 폰트 CDN / 이미지 / svg sprite** — 시스템 스택 + 유니코드 이모지만
- **ES module / fetch import** — 단일 inline `<script>` 또는 non-module `<script src>` 만 (AC §2 직접 매핑)
- **히스토리 무한 누적** — UI 표시는 최근 50 굴림만 (메모리는 v1 cap 없음 — minimal core)

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/clicker-BF-441.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth). 주사위 전용 토큰은 §2.1 의 `--color-accent*` (rose) + §2.2 에만 추가.

### 2.1 색상 토큰 (다크 우선 — AC 명시)

> **AC §1 직접 매핑**: 다크 default 토큰 `--color-bg-canvas: #0d1117`, `--color-accent: #fb7185` (rose-400) — Epic 요구 값 그대로 채택. 라이트 페어는 본 명세에서 신규 정의 (rose-600 `#e11d48` 채택 — Tailwind rose 스케일 다크↔라이트 표준 쌍).

| 토큰명 | **Dark HEX (default)** | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | **`#0d1117`** | `#FAFAF9` | 페이지 전체 배경 (다크 default ← AC 매핑) |
| `--color-bg-surface` | `#161b22` | `#FFFFFF` | 카드 표면 (dice / 통계 / 히스토리 카드) |
| `--color-bg-subtle` | `#1f2530` | `#F1F1EF` | 통계 행 hover / 히스토리 row hover / ghost hover |
| `--color-border-default` | `#262c36` | `#E5E5E2` | 카드 구분선·통계 행 separator |
| `--color-border-strong` | `#3a4150` | `#D0D0CC` | ghost button outline |
| `--color-text-primary` | `#E8E8E4` | `#1A1A19` | 본문·합계 강조 숫자 |
| `--color-text-secondary` | `#9A9A93` | `#6B6B66` | 통계 라벨·히스토리 회차 번호 |
| `--color-text-muted` | `#6B6B66` | `#9A9A93` | placeholder·"굴림 0회" empty state |
| `--color-accent` | **`#fb7185`** | `#e11d48` | **굴리기 CTA 배경 + 합계 숫자 강조** ← AC 매핑 |
| `--color-accent-hover` | `#fda4af` | `#be123c` | accent hover (다크는 밝게, 라이트는 어둡게) |
| `--color-accent-active` | `#f43f5e` | `#9f1239` | accent active (눌릴 때 톤 깊게) |
| `--color-accent-on` | `#0d1117` | `#FFFFFF` | accent 배경 위 텍스트 (다크 = 어두운 텍스트로 대비 확보) |
| `--color-danger` | `#E55858` | `#D14343` | 리셋 hover 텍스트 강조 |
| `--color-focus-ring` | `rgba(251, 113, 133, 0.55)` | `rgba(225, 29, 72, 0.45)` | 키보드 focus outline (2px) — accent 와 톤 일치 |

> **다크 → 라이트 토글 시 대비 보존**: accent 배경(rose) 위 텍스트는 다크 default 에서는 `#0d1117` (어두운 텍스트) 로 가독성 확보. 라이트 모드 전환 시 `#FFFFFF` 로 교체. `--color-accent-on` 토큰으로 캡슐화 — CSS 사용처는 한 줄로 통일.
>
> **rose 다크/라이트 페어 근거**: 다크의 `#fb7185` (rose-400) 는 위에 `#0d1117` 어두운 텍스트 얹어 대비 ~7.5:1 (WCAG AA ✓). 라이트의 `#e11d48` (rose-600) 는 위에 `#FFFFFF` 흰 텍스트 얹어 대비 ~5.7:1 (WCAG AA ✓). 두 모드 모두 large text 면제 없이 본문 사이즈에서도 통과.

### 2.2 주사위 전용 추가 토큰

| 토큰명 | Dark | Light | 용도 |
|---|---|---|---|
| `--color-dice-face` | `#E8E8E4` | `#1A1A19` | 주사위 이모지 본체 색 (= text-primary alias — 시스템 emoji 글리프는 color 영향 받지만 컬러 emoji 폰트는 시스템 default 유지 — §3 참조) |
| `--color-dice-bg` | `#161b22` | `#FFFFFF` | 주사위 박스 컨테이너 배경 (= bg-surface alias — surface 와 동일하나 의미 명확성) |
| `--color-roll-glow` | `rgba(251, 113, 133, 0.40)` | `rgba(225, 29, 72, 0.25)` | 굴리기 CTA hover/active 시 box-shadow halo |
| `--color-sum-accent` | `#fb7185` | `#e11d48` | 통계 카드 합계 숫자 강조 색 (= accent alias) |
| `--color-history-row` | `#161b22` | `#FFFFFF` | 히스토리 row 기본 배경 (= bg-surface alias) |
| `--color-history-row-stripe` | `#1a2029` | `#FAFAF9` | 히스토리 row zebra striping (선택 — odd rows). 라이트는 canvas 와 동일해 시각 차이 미세 |

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
| `--space-8` | `64px` |

### 2.4 반경·그림자 (재사용 + 주사위용 신규 1건)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` (보조 버튼, 통계 카드 행) |
| `--radius-lg` | `12px` (카드) |
| `--radius-dice` | `16px` (주사위 박스 — 신규, 카드보다 살짝 큼) |
| `--shadow-card` | `0 4px 16px rgba(0, 0, 0, 0.32)` (dark) / `0 4px 16px rgba(0, 0, 0, 0.06)` (light) |
| `--shadow-roll` | `0 6px 20px var(--color-roll-glow)` (굴리기 CTA — accent halo) |
| `--shadow-roll-active` | `0 2px 8px var(--color-roll-glow)` (눌릴 때 그림자 축소) |

### 2.5 모션 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--motion-press` | `150ms` | 굴리기 CTA press animation |
| `--motion-fast` | `120ms` | hover bg transition |
| `--motion-mid` | `220ms` | 합계 숫자 색 / 통계 행 hover bg 전환 |
| `--motion-roll` | `360ms` | **주사위 페이스 swap (3 step × 120ms — §6.3)** |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | press/roll easing |
| `--scale-press` | `0.95` | CTA press 시 transform scale |

> **모션 정책**: 주사위 굴림 시 페이스 이모지를 3 step (120ms × 3 = 360ms) 동안 랜덤 페이스로 빠르게 교체 후 최종값에 정착 — 굴림 행위의 시각 시그널. `prefers-reduced-motion: reduce` 시 즉시 최종값만 표시 (animation skip — §7.5).

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
--font-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "EmojiOne Color", "Android Emoji", sans-serif;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **dice-face (desktop, ≥640px)** | **`5rem` / 80px** | `400` | `1` | `0` | `--text-dice` |
| **dice-face (mobile, <640px)** | **`4rem` / 64px** | `400` | `1` | `0` | `--text-dice-sm` |
| **sum-value (통계 합계 강조)** | **`3rem` / 48px** | `300` | `1` | `-0.02em` | `--text-sum` |
| stat-value (합계 외 통계) | `1.25rem` / 20px | `500` | `1.2` | `0` | `--text-stat` |
| stat-label (통계 라벨) | `12px` | `500` | `1.4` | `0.06em` (uppercase 옵션) | `--text-stat-label` |
| roll-cta (굴리기 버튼 라벨) | `18px` | `600` | `1` | `0.02em` | `--text-roll-cta` |
| history-row (회차·이모지·합) | `14px` | `500` | `1.4` | `0` | `--text-history` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |

dice-face 는 **`--font-emoji`** 스택 적용 — system color emoji 가 컬러 글리프로 렌더 (Apple/Win/Android 모두 자동). weight `400` (일반) — emoji 는 굵기 영향 없지만 명시.

sum-value 는 `--font-mono` + `tabular-nums` 적용 (합계 숫자 자릿수 떨림 0).

> **AC 매핑 (정량 고정)**:
> - dice 페이스 데스크탑: `5rem` (80px) ← AC 요구사항 "5rem 이모지" 정확 일치
> - dice 페이스 모바일: `4rem` (64px) — 모바일 뷰포트 안전 + tap 영역 충분
> - 합계 강조: `3rem` (48px) — 통계 카드의 시각 위계 최상위

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 640px)

```
┌────────────────────────────────────────────────────────────┐
│ Topbar · "주사위"                              [🌙 토글]    │  56px
├────────────────────────────────────────────────────────────┤
│                                                            │
│       ┌─────────────────────────────────────────┐          │
│       │                                         │          │
│       │     ╭───────╮       ╭───────╮            │          │
│       │     │   ⚂   │       │   ⚄   │            │  dice    │
│       │     ╰───────╯       ╰───────╯            │  5rem    │
│       │                                         │          │
│       │          [ 🎲 굴리기 ]                    │  CTA     │
│       │                                         │          │
│       └─────────────────────────────────────────┘          │
│                                                            │
│       ┌─────────────────────────────────────────┐          │
│       │  합계                            42      │  통계      │
│       │  ───────────────────────────────────     │  카드      │
│       │  굴림 횟수                        6       │          │
│       │  평균                          7.0       │          │
│       │  최대                            12      │          │
│       └─────────────────────────────────────────┘          │
│                                                            │
│       ┌─────────────────────────────────────────┐          │
│       │  히스토리                                 │  history │
│       │  ─────────────────────────────────────   │  compact │
│       │  #6   ⚂ ⚄   합 8                         │          │
│       │  #5   ⚀ ⚁   합 3                         │          │
│       │  #4   ⚄ ⚅   합 11                        │          │
│       │  ...                                    │          │
│       └─────────────────────────────────────────┘          │
│                                                            │
│       [⟲ 리셋] · <kbd>Space</kbd> 굴리기 <kbd>R</kbd> 리셋  │  hint
└────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 520px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- 3 개 카드 (dice / 통계 / 히스토리) 가 세로 stack — `display: flex; flex-direction: column; gap: var(--space-5)`
- 각 카드: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-6)` (모바일 `var(--space-5)`)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "주사위" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (`id="theme-toggle"` — pomodoro/timer/clicker 와 동일 패턴)

### 4.3 주사위 박스 영역 (`<DiceBox>`)

```
   ┌───────────────────────────────────────────┐
   │                                           │
   │     ╭───────╮         ╭───────╮            │
   │     │       │         │       │            │
   │     │   ⚂   │         │   ⚄   │            │  각 면: 96px × 96px
   │     │       │         │       │            │  이모지 5rem (80px)
   │     ╰───────╯         ╰───────╯            │  gap: var(--space-5)
   │                                           │
   │            [ 🎲 굴리기 ]                    │
   │                                           │
   └───────────────────────────────────────────┘
```

- 컨테이너: `padding: var(--space-7) var(--space-6)`, `display: flex; flex-direction: column; align-items: center; gap: var(--space-6)`
- 주사위 stack: `display: flex; gap: var(--space-5); align-items: center; justify-content: center`
- 각 주사위 셀 (`.dice`): `width: 96px; height: 96px; border-radius: var(--radius-dice); background: var(--color-bg-canvas); border: 1px solid var(--color-border-default); display: inline-flex; align-items: center; justify-content: center; font: var(--text-dice); font-family: var(--font-emoji); user-select: none`
  - 다크 / 라이트 모두 surface 와 다른 톤 (`bg-canvas`) 으로 살짝 들어간 well 느낌
  - aria: `<span class="dice" role="img" aria-label="주사위 3">⚂</span>` — SR 이 글리프 대신 의미 라벨 읽음
- 이모지 매핑 (1~6 → 글리프):
  - `1 → ⚀` (U+2680)
  - `2 → ⚁` (U+2681)
  - `3 → ⚂` (U+2682)
  - `4 → ⚃` (U+2683)
  - `5 → ⚄` (U+2684)
  - `6 → ⚅` (U+2685)
- 굴림 상태 (`.is-rolling`): 360ms 동안 랜덤 페이스 3 회 swap 후 최종값 정착 (§6.3 detail). 컨테이너에 `transform: rotate(-2deg) → rotate(2deg) → rotate(0deg)` 미세 흔들림 옵션 (`prefers-reduced-motion` 시 skip)

### 4.4 굴리기 CTA (핵심 — accent 강조)

```
        ╭─────────────────────╮
        │      🎲 굴리기        │   height 56px
        │                     │   padding 0 var(--space-6)
        ╰─────────────────────╯   border-radius var(--radius-md)
```

- 라벨: `🎲 굴리기` (이모지 + 한국어)
- 사이즈: `height: 56px`, `min-width: 200px`, `padding: 0 var(--space-6)`, `border-radius: var(--radius-md)`
- 배경: `var(--color-accent)` (다크 `#fb7185`, 라이트 `#e11d48`)
- 텍스트: `var(--color-accent-on)` (다크 `#0d1117`, 라이트 `#FFFFFF`), `font: var(--text-roll-cta)`
- `border: none`, `cursor: pointer`, `user-select: none`
- `box-shadow: var(--shadow-roll)` (accent halo — 행위 시각 위계 강화)
- 인터랙션 상태:
  - **hover**: `background: var(--color-accent-hover)`, `transform: translateY(-1px)`, `box-shadow: var(--shadow-roll)` 유지, transition `var(--motion-fast)`
  - **active / pressed**: `background: var(--color-accent-active)`, `transform: scale(var(--scale-press))` (= 0.95), `box-shadow: var(--shadow-roll-active)`, transition `var(--motion-press)` (= 150ms) `var(--ease-out)`
  - **disabled (굴림 중)**: `opacity: 0.6; cursor: progress` — 360ms 동안 중복 굴림 차단 (§6.3)
  - **focus-visible**: `outline: 2px solid var(--color-focus-ring); outline-offset: 3px`
- `aria-label="주사위 굴리기"`, `type="button"`
- 모바일 터치: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`
- `prefers-reduced-motion: reduce` 시: `transform: none` (translateY / scale 비활성), 배경색 transition 만 유지

### 4.5 통계 카드 (`<StatsCard>`)

```
   ┌─────────────────────────────────────┐
   │  합계                          42    │  ← 강조 (3rem mono accent 색)
   │  ─────────────────────────────────   │  separator
   │  굴림 횟수                      6     │  --text-stat (20px / 500)
   │  ─────────────────────────────────   │
   │  평균                         7.0    │
   │  ─────────────────────────────────   │
   │  최대                          12    │
   └─────────────────────────────────────┘
```

- 컨테이너: 카드 (background bg-surface, padding `var(--space-5) var(--space-6)`)
- 4 행 stack (`display: flex; flex-direction: column`)
- 각 행 (`.stat-row`):
  - `display: flex; justify-content: space-between; align-items: baseline`
  - `padding: var(--space-3) 0`
  - `border-bottom: 1px solid var(--color-border-default)` (마지막 행 제외)
- **합계 행** (`.stat-row--sum` — 강조):
  - 라벨: `font: var(--text-stat-label)`, `color: var(--color-text-secondary)`, `text-transform: uppercase`, `letter-spacing: 0.06em`
  - 값: `font: var(--text-sum)` (3rem mono tabular-nums), `color: var(--color-sum-accent)` (= rose accent)
  - 시선 위계: 다른 통계 행 대비 약 2.4× 크고 색도 accent — 합계가 시선 최상위 ✓
- **그 외 stat-row** (굴림 횟수 / 평균 / 최대):
  - 라벨: `font: var(--text-stat-label)`, `color: var(--color-text-secondary)`, `text-transform: uppercase`, `letter-spacing: 0.06em`
  - 값: `font: var(--text-stat)` (20px / 500 mono), `color: var(--color-text-primary)`, `font-variant-numeric: tabular-nums`
- 빈 상태 (굴림 0회): 모든 값을 `--` 또는 `0` 으로 표시, `color: var(--color-text-muted)` (전체 회색 — "비어있음")
- 계산 정의:
  - `합계 (sum)`: 모든 굴림의 합 (각 굴림 합 = die1 + die2). 굴림 0회 시 `0`
  - `굴림 횟수 (count)`: 굴림 누적 수. 정수
  - `평균 (avg)`: `sum / count` 소수 첫째자리 (toFixed(1)). 굴림 0회 시 `--`
  - `최대 (max)`: 굴림 단일 합 중 최댓값 (2~12 범위). 굴림 0회 시 `--`

aria:
- 통계 카드 전체: `<section aria-labelledby="stats-title">` + 시각 hidden `<h2 id="stats-title">통계</h2>`
- 합계 변경 시점: `aria-live="polite"` 1 회 알림 — "현재 합계 42 점" (선택)

### 4.6 히스토리 (`<History>` — compact row)

```
   ┌─────────────────────────────────────┐
   │  히스토리                            │  --text-stat-label
   │  ─────────────────────────────────   │
   │  #6   ⚂ ⚄   합 8                    │  ← row 36px
   │  #5   ⚀ ⚁   합 3                    │
   │  #4   ⚄ ⚅   합 11                   │
   │  ...                                │
   └─────────────────────────────────────┘
```

- 컨테이너: 카드 (background bg-surface, padding `var(--space-5) var(--space-6)`)
- 상단 라벨: "히스토리" (`--text-stat-label`, uppercase, `--color-text-secondary`)
- row stack: `display: flex; flex-direction: column` (gap 없음 — row 자체 padding)
- 각 row (`.history-row`):
  - `display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: var(--space-3)`
  - `padding: var(--space-3) var(--space-3)`
  - `font: var(--text-history)` (14px / 500)
  - `border-radius: var(--radius-sm)` (호버 시 visual fit)
  - hover: `background: var(--color-bg-subtle)` (선택 — 강조 시각)
  - zebra (odd row): `background: var(--color-history-row-stripe)` (다크에서 미세 차이, 라이트에서 거의 동일 — 선택)
- row 내부:
  - **회차** (`.history-row__index`): `#6` 형식, `--font-mono`, `color: var(--color-text-secondary)`, `tabular-nums`
  - **주사위 글리프** (`.history-row__dice`): `font-family: var(--font-emoji)`, `font-size: 1.5rem` (24px — row 안에서 압축), `gap: var(--space-2)`, `color: var(--color-text-primary)` (이모지 색에는 영향 없음, 단 fallback text 글리프 대비)
  - **합** (`.history-row__sum`): `합 8` 형식, `color: var(--color-text-primary)`, `--font-mono` tabular-nums, justify-self end
- 빈 상태 (히스토리 0개):
  - row stack 자리에 `"아직 굴림 기록 없음"` placeholder (`--color-text-muted`, `--text-caption`, center align, padding `var(--space-6)`)
- 표시 cap:
  - **UI 표시는 최신 50개** — 그 이상 누적되면 가장 오래된 row 부터 자동 숨김 (DOM 에서 unmount 또는 css `display: none`)
  - 메모리 cap 은 v1 없음 (상태에 push, 표시만 slice). 후속 Epic 에서 무한 스크롤 / 페이징 옵션화
- 정렬: **최신이 위** (`#N`, `#N-1`, ... 내림차순) — 사용자 시선 즉시 도착

aria:
- `<section aria-labelledby="history-title">` + `<h2 id="history-title">히스토리</h2>`
- 각 row: `<li>` 마크업 + `aria-label="6번째 굴림: 3, 5, 합 8"` (SR 이 row 의 의미 전체 읽음)
- 새 굴림 추가 시점: 히스토리 컨테이너에 `aria-live="polite"` 적용 (선택 — 합계 카드 알림과 중복 가능하므로 default 는 off)

### 4.7 빈 상태 (굴림 0회)
- 주사위 박스: 초기 페이스 `⚀ ⚀` (둘 다 1) 또는 placeholder 페이스 (디자인 결정 — default `⚀ ⚀`)
- 통계 카드: 합계 `0` (muted), 그 외 `--` (muted)
- 히스토리 카드: `"아직 굴림 기록 없음"` placeholder
- 굴리기 CTA: enabled (entry point)
- 리셋: disabled (이미 빈 상태)

### 4.8 반응형 Breakpoint

| breakpoint | dice 크기 | card width | dice cell | CTA | history row |
|---|---|---|---|---|---|
| **`≥ 640px`** (desktop/tablet) | `--text-dice` (5rem / 80px) | max-width `520px`, padding `--space-7 --space-5` | `96 × 96` | height 56, min-width 200 | grid 48/1fr/auto |
| **`< 640px`** (mobile) | `--text-dice-sm` (`4rem` / 64px) | max-width `100%`, margin `var(--space-4)`, padding `var(--space-5)` | `80 × 80` | height 52, min-width 100% (card 폭 채움) | grid 40/1fr/auto (회차 폭 축소) |
| **`< 360px`** (XS) | 동일 4rem | (mobile 과 동일) | `72 × 72` | height 48 | 동일 |

> **AC §1 매핑 (반응형)**: dice 페이스 `5rem` 이 desktop 정확 일치. mobile 은 4rem 으로 안전한 fallback (점 패턴 가독성 유지 한계).

### 4.9 다크/라이트 토글 시각

- 토글 버튼 (topbar 우측): ghost button, 라벨 `🌙` (다크 default) / `☀` (라이트 모드)
- 클릭 시 `<html data-theme="dark|light">` 속성 변경 → CSS 변수 자동 재바인딩
- `localStorage["bf-theme"]` 키로 영속화 (notepad / timer / stopwatch / pomodoro / clicker 와 공유)
- 첫 로드 시 head 인라인 `<script>` 로 즉시 적용 (FOUC/flicker 방지 — pomodoro §6.6, clicker §6.5 동일 패턴)

---

## 5. 컴포넌트 명세

### 5.1 `<DiceBox>`
props:
- `die1: number` (1~6)
- `die2: number` (1~6)
- `isRolling: boolean`

표시 변환:
- 1~6 정수를 `["⚀","⚁","⚂","⚃","⚄","⚅"][value-1]` 글리프로 매핑
- `isRolling === true`: 360ms 동안 랜덤 페이스 swap (§6.3) — `.is-rolling` 클래스 추가
- 초기 default: die1=1, die2=1 (즉 `⚀ ⚀`)

aria:
- 컨테이너: `<div class="dice-box" aria-label="주사위 한 쌍" role="group">`
- 각 dice: `<span class="dice" role="img" aria-label="주사위 3">⚂</span>` (값 변할 때마다 aria-label 갱신)

### 5.2 `<RollButton>` (핵심 CTA)
props:
- `onRoll()` — 굴림 1회 실행 (랜덤 1~6 × 2)
- `disabled: boolean` (굴림 중 360ms 잠금)

명세: §4.4 참조 (사이즈 / 색 / 인터랙션 상세).

키보드:
- `Space` / `Enter` 누르면 click + `.is-pressed` 클래스 150ms 적용
- 단축키 `Space` 전역 (focus 없을 때) — 빠른 연타 위해

aria:
- `<button type="button" id="btn-roll" class="roll-button" aria-label="주사위 굴리기">🎲 굴리기</button>`
- `disabled` 시 `aria-disabled="true"` 추가

### 5.3 `<StatsCard>`
props:
- `sum: number` (≥ 0)
- `count: number` (≥ 0)
- `max: number | null` (count = 0 시 null)

표시 변환:
- `avg` = `count > 0 ? (sum / count).toFixed(1) : "--"`
- `max` = `count > 0 ? max.toString() : "--"`
- count = 0 시 모든 값 muted 색

명세: §4.5 참조.

### 5.4 `<History>`
props:
- `entries: Array<{ index: number; die1: number; die2: number; sum: number }>` (최신순 sorted)

표시 변환:
- `entries.length === 0` → empty placeholder
- 그 외 → 최근 50개만 render (`entries.slice(0, 50)`)
- 각 row: 회차 `#${index}` + 주사위 글리프 2개 + `합 ${sum}`

명세: §4.6 참조.

### 5.5 `<ResetButton>` (ghost — 통계 + 히스토리 동시 리셋)
props:
- `disabled: boolean` (count = 0 일 때 true)
- `onReset()` — 통계 + 히스토리 모두 초기화 (주사위 페이스는 그대로 — 마지막 굴림 결과 유지)

명세:
- 위치: hint 라인 좌측 또는 통계 카드 내부 (선택 — default 는 hint 라인 좌측 inline, 디자인 한 줄에 통합)
- 라벨: `⟲ 리셋`
- variant: ghost (background transparent, border `1px solid var(--color-border-strong)`, color `--color-text-secondary`)
- 크기: `height: 36px`, `min-width: 88px`, `padding: 0 var(--space-4)`, `font: var(--text-button)`, `border-radius: var(--radius-md)`
- hover: `background: var(--color-bg-subtle)`, 텍스트 색 `var(--color-danger)`
- disabled 조건: 굴림 0회 — `opacity: 0.4; cursor: not-allowed`
- 클릭 동작: 통계 + 히스토리 즉시 초기화, 주사위 페이스는 마지막 굴림값 유지 (확인 modal 없음)
- 단축키 `R` (대소문자 무관)

aria:
- `<button type="button" id="btn-reset" aria-label="통계와 히스토리 리셋">⟲ 리셋</button>`
- disabled 시 `disabled` 속성 + `aria-disabled="true"`

### 5.6 `<KbdHint>`
- 단일 `<p>` 라인, page 하단 가운데
- `--text-caption`, `--color-text-muted`
- 내용: `<kbd>Space</kbd> 굴리기 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마`
- `<kbd>` 스타일: clicker 와 동일 (§clicker-BF-441 §5.4 — 재사용)

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

단순 — 굴림 행위가 핵심 transition.

```
   ┌─────────────────┐    roll    ┌─────────────────────┐
   │ idle            │───────────►│ rolling (360ms)      │
   │ count = 0       │            │ (button disabled)    │
   │ dice = (1,1)    │            └──────────┬───────────┘
   └─────────────────┘                       │ commit
        ▲                                    ▼
        │            ┌────────────────────────────────┐
        │            │ result                         │
        │            │ count ≥ 1                       │
        │            │ stats / history 갱신             │
        │  reset     │                                │
        └────────────┤                                │
                     └────┬───────────────────────────┘
                          │ roll (다시)
                          ▼
                       rolling → result (loop)
```

전이 규칙:
- `idle / result → rolling`: 굴리기 버튼 또는 `Space`/`Enter`
- `rolling → result`: 360ms 후 자동 commit (랜덤 결과 확정)
- `result → idle`: 리셋 버튼 또는 `R` 키
- **굴림 중 추가 굴림 시도는 무시** (button disabled — 360ms 동안)

### 6.2 키보드 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar 토글 → 굴리기 → 리셋 순환 | 전역 |
| `Space` | 현재 focused 버튼 클릭 (브라우저 기본) | 버튼 focus 시 |
| `Enter` | 현재 focused 버튼 클릭 (브라우저 기본) | 버튼 focus 시 |
| `Space` (전역 — focus 없음 시) | 굴리기 트리거 (편의) | input 내부 focus 시 X — 현 페이지엔 input 없음 |
| `R` / `r` | 리셋 (count ≥ 1 일 때만 유효) | 전역 |
| `T` / `t` | 다크/라이트 테마 토글 | 전역 |

**Caps Lock 친화**: `R`/`r`, `T`/`t` 모두 `event.key.toLowerCase()` 비교로 인식.

**focus-visible**: 모든 interactive 요소는 `:focus-visible` 시 outline 노출 — 마우스 클릭 focus 에서는 outline 숨김.

### 6.3 굴림 인터랙션 흐름 (핵심)

1. 사용자가 굴리기 클릭 (마우스 / 터치 / Space / Enter)
2. button: `.is-pressed` 클래스 추가 (150ms scale(0.95))
3. button: `disabled = true` (`is-rolling` 동안 중복 차단)
4. dice-box: `.is-rolling` 클래스 추가
5. **3 step roll animation** (총 `--motion-roll` = 360ms):
   - 0ms: 랜덤 페이스 (예: ⚄ ⚂)
   - 120ms: 다른 랜덤 페이스 (예: ⚁ ⚅)
   - 240ms: 또 다른 랜덤 페이스 (예: ⚃ ⚀)
   - 360ms: **최종 결정값 commit** (실제 result 페이스)
6. dice-box: `.is-rolling` 제거
7. button: `disabled = false`
8. state 업데이트:
   - `state.dice = (newDie1, newDie2)`
   - `state.history.unshift({ index: state.count + 1, die1, die2, sum })`
   - `state.count += 1`
   - `state.sum += newSum`
   - `state.max = Math.max(state.max ?? 0, newSum)` (또는 null guard)
9. render() — 통계 / 히스토리 갱신
10. 합계 셀에 220ms 동안 accent fade 옵션 (선택 — `prefers-reduced-motion` 시 skip)

코드 (권장):
```js
function handleRoll() {
  if (state.isRolling) return;
  state.isRolling = true;
  rollBtn.disabled = true;
  diceBox.classList.add("is-rolling");

  // 3 swap steps × 120ms
  var step = 0;
  var ticker = setInterval(function () {
    step += 1;
    var d1 = 1 + Math.floor(Math.random() * 6);
    var d2 = 1 + Math.floor(Math.random() * 6);
    if (step < 3) {
      renderDice(d1, d2);
    } else {
      clearInterval(ticker);
      // 최종 commit
      commitRoll(d1, d2);
    }
  }, 120);
}

function commitRoll(d1, d2) {
  var sum = d1 + d2;
  state.dice = [d1, d2];
  state.history.unshift({ index: state.count + 1, die1: d1, die2: d2, sum: sum });
  state.count += 1;
  state.sum += sum;
  state.max = state.max == null ? sum : Math.max(state.max, sum);
  state.isRolling = false;
  diceBox.classList.remove("is-rolling");
  rollBtn.disabled = false;
  render();
}
```

> **AC §1 (5rem 이모지) 매핑**: 페이스 swap 중에도 폰트 / 크기는 동일 — 단지 `textContent` 만 교체. 시각 일관성 유지.

`prefers-reduced-motion: reduce` 시: setInterval 의 3 swap 없이 즉시 `commitRoll(d1, d2)` (animation skip — §7.5).

### 6.4 리셋 인터랙션 흐름

1. 리셋 버튼 클릭 또는 `R` 키 (count ≥ 1 일 때만)
2. state 초기화:
   - `state.count = 0`
   - `state.sum = 0`
   - `state.max = null`
   - `state.history = []`
   - `state.dice` 는 그대로 유지 (마지막 굴림 페이스 보존 — UX: 무엇이 마지막이었는지 시각 기억)
3. render() — 통계 카드 muted 색으로 fade (transition 220ms), 히스토리 카드 placeholder 전환
4. 리셋 버튼 disabled (count = 0 이므로)
5. SR 알림 (선택 — `aria-live="polite"`): "통계와 히스토리가 리셋되었습니다"

확인 modal **없음** — UX 마찰 최소화 (clicker 와 동일 정책).

### 6.5 다크 모드 토글

clicker §6.5 와 100% 동일 패턴:
- topbar `[🌙/☀]` 토글 → `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad / timer / stopwatch / pomodoro / clicker 와 동일) — 페이지 간 일관성
- 첫 로드 시 head 인라인 `<script>` (non-module) 로 즉시 적용 — FOUC 방지
- **다크 default**: 저장값 없을 때 `dark` 채택 — Epic 요구사항 "다크 우선" 매핑
- localStorage 사용 불가 환경 (private mode, file://) 에서도 default `dark` 유지

코드 (권장 — pomodoro/index.html 의 패턴 그대로 복제, §9.2 참조):
```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem("bf-theme");
      var theme = saved === "light" || saved === "dark" ? saved : "dark";
      document.documentElement.setAttribute("data-theme", theme);
    } catch (_e) {
      /* localStorage 불가 시 default dark 유지 */
    }
  })();
</script>
```

### 6.6 비저장 정책 (in-memory only)
- 통계 / 히스토리 / dice state는 **localStorage 미사용** — 새로고침 시 모두 초기화 (v1 단발 세션)
- `bf-theme` 만 localStorage 사용 (다른 SPA 와 일관)
- 후속 Epic 에서 "히스토리 영속화 / 누적 통계" 옵션 가능

### 6.7 file:// CORS 안전 정책 (AC §2 매핑)

> **AC §2 직접 매핑**: "file:// 직접 열기 제약" — ES module / fetch / 외부 CDN 금지.

- `<script type="module">` 사용 금지 → **`<script src="./main.js">`** (non-module) 또는 **inline `<script>`** 만 사용
- `import` / `export` 구문 금지 (전역 함수 / IIFE 패턴으로 분리)
- `fetch()` 호출 금지 (정적 데이터 없음 — 모든 상태 in-memory + Math.random())
- 외부 CDN `<link href="https://...">` / `<script src="https://...">` 금지
- 폰트는 시스템 emoji 스택만 (`--font-emoji`) + 시스템 sans/mono — `@import url(...)` 도 금지
- **이미지 / SVG sprite 없음** — 주사위는 유니코드 이모지 글리프만으로 시각화
- 결과: 사용자가 `dice/index.html` 를 더블클릭 (file:// 프로토콜) 으로 열어도 정상 동작 (이모지 글리프 + Math.random + localStorage(theme) 만 사용)

> **mockup HTML 도 동일 정책** — `docs/design/mockups/dice-BF-446.html` 도 외부 의존성 0건으로 작성 (§10).

### 6.8 이모지 폴백 처리

> **주사위 글리프 ⚀~⚅ 호환성 검증**:
> - macOS Safari/Chrome: Apple Color Emoji 컬러 글리프 자동 ✓
> - Windows 10/11 Edge/Chrome: Segoe UI Emoji 컬러 글리프 ✓
> - Android Chrome: Noto Color Emoji ✓
> - Linux Firefox: Noto Emoji 또는 흑백 글리프 fallback ✓ (가독성 유지)

만약 이모지 폰트 부재로 글리프가 박스(`◻`) 로 표시되는 환경 (희귀): 페이지는 동작하나 시각만 저하. AC 매핑 표 §11 의 fallback 정책 명시. v1 은 추가 polyfill 없음 (Simplicity First).

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── dice/
│   ├── index.html       # 주사위 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃
│   └── main.js          # 상태 + 이벤트 (non-module, IIFE)
├── clicker/             # 기존 (보존)
├── pomodoro/            # 기존 (보존)
├── stopwatch/           # 기존 (보존)
├── timer/               # 기존 (보존)
├── notepad/             # 기존 (보존)
└── docs/design/
    ├── dice-BF-446.md            (본 문서)
    └── mockups/dice-BF-446.html  (시각 mockup)
```

`storage.js` 별도 파일 **불필요** (in-memory only, theme 만 localStorage — head inline 으로 충분).

### 7.2 HTML 골격 (권장 클래스명 — file:// 안전)

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>주사위</title>
    <link rel="stylesheet" href="./styles.css" />
    <script>
      /* 다크 default 즉시 적용 (flicker 방지) — pomodoro/index.html 의 패턴 복제 */
      (function () {
        try {
          var saved = localStorage.getItem("bf-theme");
          var theme = saved === "light" || saved === "dark" ? saved : "dark";
          document.documentElement.setAttribute("data-theme", theme);
        } catch (_e) {
          /* default dark 유지 */
        }
      })();
    </script>
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">주사위</h1>
      <div class="topbar__actions">
        <button
          type="button"
          class="btn btn--ghost"
          id="theme-toggle"
          aria-label="테마 전환"
        >🌙</button>
      </div>
    </header>

    <main class="page">
      <!-- 주사위 박스 (5rem 이모지 + 굴리기 CTA) -->
      <section class="card dice-card" aria-label="주사위">
        <div class="dice-box" id="dice-box" role="group" aria-label="주사위 한 쌍">
          <span class="dice" id="dice-1" role="img" aria-label="주사위 1">⚀</span>
          <span class="dice" id="dice-2" role="img" aria-label="주사위 1">⚀</span>
        </div>
        <button
          type="button"
          class="roll-button"
          id="btn-roll"
          aria-label="주사위 굴리기"
        >🎲 굴리기</button>
      </section>

      <!-- 통계 카드 (합계 강조 + 굴림 횟수 / 평균 / 최대) -->
      <section class="card stats-card" aria-labelledby="stats-title">
        <h2 id="stats-title" class="sr-only">통계</h2>
        <div class="stat-row stat-row--sum">
          <span class="stat-row__label">합계</span>
          <span class="stat-row__value stat-row__value--sum" id="stat-sum">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">굴림 횟수</span>
          <span class="stat-row__value" id="stat-count">0</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">평균</span>
          <span class="stat-row__value" id="stat-avg">--</span>
        </div>
        <div class="stat-row">
          <span class="stat-row__label">최대</span>
          <span class="stat-row__value" id="stat-max">--</span>
        </div>
      </section>

      <!-- 히스토리 (compact row) -->
      <section class="card history-card" aria-labelledby="history-title">
        <h2 id="history-title" class="history-card__title">히스토리</h2>
        <ul class="history-list" id="history-list">
          <!-- empty state -->
          <li class="history-empty" id="history-empty">아직 굴림 기록 없음</li>
        </ul>
      </section>

      <!-- hint 라인 + 리셋 -->
      <div class="page__footer">
        <button
          type="button"
          class="btn btn--ghost btn--reset"
          id="btn-reset"
          aria-label="통계와 히스토리 리셋"
          disabled
        >⟲ 리셋</button>
        <p class="kbd-hint">
          <kbd>Space</kbd> 굴리기 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마
        </p>
      </div>
    </main>

    <!-- file:// 안전 — non-module script (AC §2) -->
    <script src="./main.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치

`dice/styles.css` 상단에 `:root` 블록 — **다크 default** 로 변수 정의. 라이트 토글은 `[data-theme="light"]` 셀렉터로 override.

```css
:root {
  /* fonts */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
  --font-emoji: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji",
    "Twemoji Mozilla", "EmojiOne Color", "Android Emoji", sans-serif;

  /* dark default (AC §1 매핑) */
  --color-bg-canvas: #0d1117;
  --color-bg-surface: #161b22;
  --color-bg-subtle: #1f2530;
  --color-border-default: #262c36;
  --color-border-strong: #3a4150;
  --color-text-primary: #E8E8E4;
  --color-text-secondary: #9A9A93;
  --color-text-muted: #6B6B66;
  --color-accent: #fb7185;        /* rose-400 ← AC 매핑 */
  --color-accent-hover: #fda4af;
  --color-accent-active: #f43f5e;
  --color-accent-on: #0d1117;
  --color-danger: #E55858;
  --color-focus-ring: rgba(251, 113, 133, 0.55);

  --color-dice-face: #E8E8E4;
  --color-dice-bg: #161b22;
  --color-roll-glow: rgba(251, 113, 133, 0.40);
  --color-sum-accent: #fb7185;
  --color-history-row: #161b22;
  --color-history-row-stripe: #1a2029;

  /* spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-dice: 16px;

  /* shadow */
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.32);
  --shadow-roll: 0 6px 20px var(--color-roll-glow);
  --shadow-roll-active: 0 2px 8px var(--color-roll-glow);

  /* motion */
  --motion-press: 150ms;
  --motion-fast: 120ms;
  --motion-mid: 220ms;
  --motion-roll: 360ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --scale-press: 0.95;

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-dice: 400 5rem/1 var(--font-emoji);     /* desktop ≥640px ← AC */
  --text-dice-sm: 400 4rem/1 var(--font-emoji);  /* mobile <640px */
  --text-sum: 300 3rem/1 var(--font-mono);
  --text-stat: 500 1.25rem/1.2 var(--font-mono);
  --text-stat-label: 500 12px/1.4 var(--font-sans);
  --text-roll-cta: 600 18px/1 var(--font-sans);
  --text-history: 500 14px/1.4 var(--font-sans);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
}

[data-theme="light"] {
  --color-bg-canvas: #FAFAF9;
  --color-bg-surface: #FFFFFF;
  --color-bg-subtle: #F1F1EF;
  --color-border-default: #E5E5E2;
  --color-border-strong: #D0D0CC;
  --color-text-primary: #1A1A19;
  --color-text-secondary: #6B6B66;
  --color-text-muted: #9A9A93;
  --color-accent: #e11d48;        /* rose-600 (light pair) */
  --color-accent-hover: #be123c;
  --color-accent-active: #9f1239;
  --color-accent-on: #FFFFFF;
  --color-danger: #D14343;
  --color-focus-ring: rgba(225, 29, 72, 0.45);

  --color-dice-face: #1A1A19;
  --color-dice-bg: #FFFFFF;
  --color-roll-glow: rgba(225, 29, 72, 0.25);
  --color-sum-accent: #e11d48;
  --color-history-row: #FFFFFF;
  --color-history-row-stripe: #FAFAF9;

  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.06);
}

/* reset */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  font: var(--text-body);
  background: var(--color-bg-canvas);
  color: var(--color-text-primary);
  transition: background var(--motion-mid) var(--ease-out),
              color var(--motion-mid) var(--ease-out);
}

/* sr-only (시각 hidden, SR 노출) */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}
```

### 7.4 핵심 컴포넌트 CSS (권장 — file:// 안전)

```css
/* dice box (5rem 이모지 ⚀~⚅) */
.dice-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-7) var(--space-6);
}
.dice-box {
  display: flex;
  gap: var(--space-5);
  align-items: center;
  justify-content: center;
}
.dice {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-dice);
  background: var(--color-bg-canvas);
  border: 1px solid var(--color-border-default);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: var(--text-dice);              /* 5rem ← AC §1 */
  font-family: var(--font-emoji);
  line-height: 1;
  user-select: none;
}
.dice-box.is-rolling .dice {
  /* 굴림 중 미세 흔들림 (선택 — reduced-motion 시 skip) */
  animation: dice-wiggle var(--motion-roll) var(--ease-out);
}
@keyframes dice-wiggle {
  0%   { transform: rotate(-2deg); }
  33%  { transform: rotate(2deg); }
  66%  { transform: rotate(-1deg); }
  100% { transform: rotate(0deg); }
}

/* roll button CTA (accent rose) */
.roll-button {
  height: 56px;
  min-width: 200px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-on);
  font: var(--text-roll-cta);
  border: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  box-shadow: var(--shadow-roll);
  transition:
    transform var(--motion-press) var(--ease-out),
    background var(--motion-fast) var(--ease-out),
    box-shadow var(--motion-fast) var(--ease-out);
}
.roll-button:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}
.roll-button:active:not(:disabled),
.roll-button.is-pressed {
  background: var(--color-accent-active);
  transform: scale(var(--scale-press));
  box-shadow: var(--shadow-roll-active);
}
.roll-button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.roll-button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 3px;
}

/* stats card */
.stats-card {
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border-default);
}
.stat-row:last-child { border-bottom: none; }
.stat-row__label {
  font: var(--text-stat-label);
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.stat-row__value {
  font: var(--text-stat);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.stat-row__value--sum {
  font: var(--text-sum);             /* 3rem mono — 시각 위계 최상 */
  color: var(--color-sum-accent);
  transition: color var(--motion-mid) var(--ease-out);
}
.stats-card.is-empty .stat-row__value {
  color: var(--color-text-muted);
}

/* history card */
.history-card {
  padding: var(--space-5) var(--space-6);
}
.history-card__title {
  margin: 0 0 var(--space-3);
  font: var(--text-stat-label);
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
.history-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  font: var(--text-history);
  border-radius: var(--radius-sm);
}
.history-row:nth-child(odd) {
  background: var(--color-history-row-stripe);
}
.history-row:hover {
  background: var(--color-bg-subtle);
}
.history-row__index {
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.history-row__dice {
  font-family: var(--font-emoji);
  font-size: 1.5rem;
  line-height: 1;
}
.history-row__dice > span { margin-right: var(--space-2); }
.history-row__sum {
  font-family: var(--font-mono);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  justify-self: end;
}
.history-empty {
  padding: var(--space-6);
  text-align: center;
  color: var(--color-text-muted);
  font: var(--text-caption);
  list-style: none;
}

/* reset ghost button */
.btn--reset {
  height: 36px;
  min-width: 88px;
  padding: 0 var(--space-4);
  font: var(--text-button);
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out),
              color var(--motion-fast) var(--ease-out);
}
.btn--reset:hover:not(:disabled) {
  background: var(--color-bg-subtle);
  color: var(--color-danger);
}
.btn--reset:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* page footer (reset + hint) */
.page__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) 0;
  flex-wrap: wrap;
}
.kbd-hint {
  margin: 0;
  color: var(--color-text-muted);
  font: var(--text-caption);
}
kbd {
  padding: 2px 6px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  font: 11px/1 var(--font-mono);
  color: var(--color-text-secondary);
}

/* responsive */
@media (max-width: 639px) {
  .dice { width: 80px; height: 80px; font: var(--text-dice-sm); font-family: var(--font-emoji); }
  .roll-button { height: 52px; min-width: 100%; }
  .dice-card, .stats-card, .history-card {
    padding: var(--space-5);
  }
  .history-row { grid-template-columns: 40px 1fr auto; }
}
@media (max-width: 359px) {
  .dice { width: 72px; height: 72px; }
  .roll-button { height: 48px; }
}

/* reduced motion 가드 */
@media (prefers-reduced-motion: reduce) {
  .dice-box.is-rolling .dice { animation: none; }
  .roll-button:hover { transform: none; }
  .roll-button:active,
  .roll-button.is-pressed { transform: none; }
  body { transition: none; }
}
```

### 7.5 단계별 구현 순서 (권장)

1. **§7.2 골격 HTML** 작성 + 빈 `styles.css` / `main.js` (non-module, 단일 IIFE)
2. **§7.3 CSS 변수 + base reset** — 다크 default 가 즉시 적용되는지 확인
3. **Topbar** (pomodoro/timer/clicker 와 동일 패턴, 다크 토글만 단독)
4. **Page + 3 카드 컨테이너** (max-width 520, gap, box-shadow)
5. **DiceBox** 정적 (`⚀ ⚀` 초기) — 96×96 cell + 5rem emoji 위계 확인 (desktop) / 4rem (mobile)
6. **RollButton** (§7.4 CSS 그대로 적용) — `:hover`, `:active`, `:disabled`, `:focus-visible`, `.is-pressed` 5 상태 시각 확인
7. **StatsCard** — 4 stat-row, **합계 행 강조 typo (3rem mono + accent 색)** 시각 확인
8. **History** — empty state (`아직 굴림 기록 없음`) + row 마크업 (grid 48/1fr/auto)
9. **ResetButton** (ghost) — disabled 시각 + hover danger 색
10. **state + main.js IIFE** — `state = { dice, count, sum, max, history, isRolling }` 패턴
11. **render()** 함수 — dice / stats / history / reset disabled 4 영역 동기 갱신
12. **handleRoll()** (§6.3) — 3 swap × 120ms setInterval + commitRoll 분리
13. **handleReset()** — 통계/히스토리 초기화 + dice 페이스 유지
14. **키보드 단축키** (§6.2 표): `keydown` 전역 — Space (focus 없을 때) / R / T
15. **다크 토글** — `theme-toggle` 클릭 핸들러 + `localStorage["bf-theme"]` 저장
16. **반응형** — `@media (max-width: 639px)` / `@media (max-width: 359px)`
17. **prefers-reduced-motion 가드** — §7.4 마지막 블록

### 7.6 a11y 체크

- 각 dice: `role="img" aria-label="주사위 N"` — SR 이 글리프 대신 의미 라벨 읽음
- roll 버튼: `aria-label="주사위 굴리기"` + disabled 시 `aria-disabled="true"`
- reset 버튼: `aria-label="통계와 히스토리 리셋"` + disabled 시 `aria-disabled="true"`
- 통계 카드: `<h2 class="sr-only">통계</h2>` + `aria-labelledby="stats-title"` — landmark 가독
- 합계 변경 시점 알림: stat-sum 요소에 `aria-live="polite"` 옵션 (default 비활성 — 매 굴림마다 알림은 과할 수 있음)
- 히스토리 row: `<li>` 마크업 + 각 row aria-label="N번째 굴림: a, b, 합 c"
- `prefers-reduced-motion: reduce` 시:
  - dice wiggle animation 비활성
  - roll button hover/active transform 비활성
  - body transition 비활성 (다크/라이트 전환 점프)
  - 굴림 중 3 swap 도 skip — 즉시 최종값만 commit
- focus-visible only outline
- 색 대비 검증:
  - 다크: accent `#fb7185` 배경 + `#0d1117` 텍스트 = ~7.5:1 (WCAG AA ✓)
  - 라이트: accent `#e11d48` 배경 + `#FFFFFF` 텍스트 = ~5.7:1 (WCAG AA ✓)
  - secondary `#9A9A93` / muted `#6B6B66` — large text (≥18.66px) 면제로 4.5:1 안전 (stat-row 라벨 12px 는 정보 누락이 없는 보조 라벨이므로 허용)

### 7.7 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (PR review 시 확인):

| 항목 | 값 (desktop) | 토큰 | AC 매핑 |
|---|---|---|---|
| `--color-bg-canvas` (dark) | `#0d1117` | `--color-bg-canvas` | **AC §1** |
| `--color-accent` (dark) | `#fb7185` (rose-400) | `--color-accent` | **AC §1** |
| `--color-accent` (light) | `#e11d48` (rose-600) | `--color-accent` (light pair) | **AC §1** |
| dice cell 크기 | `96px × 96px` (desktop) / `80px` (mobile) / `72px` (XS) | hardcoded | — |
| dice 페이스 폰트 (≥640px) | `400 5rem/1 emoji` | `--text-dice` | **AC §1 (5rem 이모지)** |
| dice 페이스 폰트 (<640px) | `400 4rem/1 emoji` | `--text-dice-sm` | **AC §1 (반응형)** |
| dice 이모지 글리프 | `⚀ ⚁ ⚂ ⚃ ⚄ ⚅` (U+2680~U+2685) | hardcoded mapping | **AC §1 (이모지)** |
| roll CTA height | `56px` (desktop) / `52px` (mobile) | hardcoded | — |
| roll CTA press transform | `scale(0.95)` | `--scale-press` | — |
| roll CTA press transition | `150ms` | `--motion-press` | — |
| 굴림 swap timing | `120ms × 3 = 360ms` | `--motion-roll` | — |
| 합계 폰트 (강조) | `300 3rem/1 mono` | `--text-sum` | **AC §1 (합계 강조)** |
| 합계 색 | `--color-sum-accent` (= accent rose) | `--color-sum-accent` | **AC §1 (합계 강조 색)** |
| 통계 stat-row 폰트 | `500 1.25rem/1.2 mono` | `--text-stat` | — |
| 히스토리 row grid | `48px 1fr auto` (desktop) / `40px 1fr auto` (mobile) | hardcoded | — |
| 히스토리 표시 cap | 최근 50개 | `entries.slice(0, 50)` | — |
| 반응형 breakpoint | `< 640px`, `< 360px` | `@media` | **AC §1 (반응형)** |
| ES module 사용 | **금지** | `<script src="./main.js">` non-module | **AC §2 (file:// 안전)** |
| fetch / 외부 CDN | **금지** | inline / 같은 디렉토리 ref 만 | **AC §2 (file:// 안전)** |
| 이미지 / SVG | **사용 X** | 유니코드 이모지만 | **AC §2 + Simplicity** |

### 7.8 main.js 권장 골격 (non-module, IIFE — file:// 안전)

```js
(function () {
  "use strict";

  /* ------------- 상수 ------------- */
  var DICE_GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  var HISTORY_CAP = 50;
  var ROLL_STEP_MS = 120;
  var ROLL_STEPS = 3; /* total 360ms */

  /* ------------- state ------------- */
  var state = {
    dice: [1, 1],
    count: 0,
    sum: 0,
    max: null,
    history: [],
    isRolling: false
  };

  /* ------------- DOM refs ------------- */
  var dice1El = document.getElementById("dice-1");
  var dice2El = document.getElementById("dice-2");
  var diceBoxEl = document.getElementById("dice-box");
  var rollBtn = document.getElementById("btn-roll");
  var resetBtn = document.getElementById("btn-reset");
  var themeBtn = document.getElementById("theme-toggle");
  var statSumEl = document.getElementById("stat-sum");
  var statCountEl = document.getElementById("stat-count");
  var statAvgEl = document.getElementById("stat-avg");
  var statMaxEl = document.getElementById("stat-max");
  var historyListEl = document.getElementById("history-list");
  var statsCardEl = statSumEl.closest(".stats-card");

  /* reduced motion 감지 */
  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------- helpers ------------- */
  function rollOne() { return 1 + Math.floor(Math.random() * 6); }
  function glyph(n) { return DICE_GLYPHS[n - 1]; }

  function renderDice(d1, d2) {
    dice1El.textContent = glyph(d1);
    dice2El.textContent = glyph(d2);
    dice1El.setAttribute("aria-label", "주사위 " + d1);
    dice2El.setAttribute("aria-label", "주사위 " + d2);
  }

  function renderStats() {
    statSumEl.textContent = String(state.sum);
    statCountEl.textContent = String(state.count);
    statAvgEl.textContent = state.count > 0
      ? (state.sum / state.count).toFixed(1)
      : "--";
    statMaxEl.textContent = state.max != null ? String(state.max) : "--";
    statsCardEl.classList.toggle("is-empty", state.count === 0);
  }

  function renderHistory() {
    /* clear */
    historyListEl.innerHTML = "";
    if (state.history.length === 0) {
      var empty = document.createElement("li");
      empty.className = "history-empty";
      empty.textContent = "아직 굴림 기록 없음";
      historyListEl.appendChild(empty);
      return;
    }
    var rows = state.history.slice(0, HISTORY_CAP);
    for (var i = 0; i < rows.length; i += 1) {
      var r = rows[i];
      var li = document.createElement("li");
      li.className = "history-row";
      li.setAttribute(
        "aria-label",
        r.index + "번째 굴림: " + r.die1 + ", " + r.die2 + ", 합 " + r.sum
      );
      li.innerHTML =
        '<span class="history-row__index">#' + r.index + '</span>' +
        '<span class="history-row__dice"><span>' + glyph(r.die1) + '</span><span>' + glyph(r.die2) + '</span></span>' +
        '<span class="history-row__sum">합 ' + r.sum + '</span>';
      historyListEl.appendChild(li);
    }
  }

  function render() {
    renderDice(state.dice[0], state.dice[1]);
    renderStats();
    renderHistory();
    resetBtn.disabled = state.count === 0;
  }

  /* ------------- roll ------------- */
  function commitRoll(d1, d2) {
    var sum = d1 + d2;
    state.dice = [d1, d2];
    state.history.unshift({ index: state.count + 1, die1: d1, die2: d2, sum: sum });
    state.count += 1;
    state.sum += sum;
    state.max = state.max == null ? sum : Math.max(state.max, sum);
    state.isRolling = false;
    diceBoxEl.classList.remove("is-rolling");
    rollBtn.disabled = false;
    render();
  }

  function handleRoll() {
    if (state.isRolling) return;
    state.isRolling = true;
    rollBtn.disabled = true;
    diceBoxEl.classList.add("is-rolling");

    var finalD1 = rollOne();
    var finalD2 = rollOne();

    if (prefersReducedMotion) {
      commitRoll(finalD1, finalD2);
      return;
    }

    /* 3 swap × 120ms */
    var step = 0;
    var ticker = setInterval(function () {
      step += 1;
      if (step < ROLL_STEPS) {
        renderDice(rollOne(), rollOne());
      } else {
        clearInterval(ticker);
        commitRoll(finalD1, finalD2);
      }
    }, ROLL_STEP_MS);
  }

  /* ------------- reset ------------- */
  function handleReset() {
    if (state.count === 0) return;
    state.count = 0;
    state.sum = 0;
    state.max = null;
    state.history = [];
    /* state.dice 는 유지 (마지막 굴림 페이스 보존) */
    render();
  }

  /* ------------- theme ------------- */
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    themeBtn.textContent = next === "dark" ? "🌙" : "☀";
    try { localStorage.setItem("bf-theme", next); } catch (_e) { /* ignore */ }
  }

  /* ------------- wiring ------------- */
  rollBtn.addEventListener("click", handleRoll);
  resetBtn.addEventListener("click", handleReset);
  themeBtn.addEventListener("click", toggleTheme);

  document.addEventListener("keydown", function (e) {
    var key = e.key.toLowerCase();
    var target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    if (key === " " || key === "spacebar") {
      if (target === rollBtn || target === resetBtn || target === themeBtn) return;
      e.preventDefault();
      handleRoll();
    } else if (key === "r") {
      handleReset();
    } else if (key === "t") {
      toggleTheme();
    }
  });

  /* 초기 theme 동기화 */
  var initialTheme = document.documentElement.getAttribute("data-theme");
  themeBtn.textContent = initialTheme === "light" ? "☀" : "🌙";

  /* 첫 render */
  render();
})();
```

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 참고:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<DiceBox>` | vanilla — shadcn 미제공 (이모지 글리프 + custom cell) |
| `<RollButton>` | `Button` (`size: lg`, `variant: default` — accent 색은 theme override) |
| `<StatsCard>` | `Card` + `<Separator>` (행 구분) — 합계 행은 커스텀 클래스로 typo override |
| `<History>` | vanilla — `ScrollArea` (긴 리스트) 옵션, `<ul>` 마크업 유지 |
| `<ResetButton>` | `Button` (`size: sm`, `variant: ghost`) |
| 다크 토글 | vanilla (pomodoro / timer / clicker 와 공유 패턴) |
| `<KbdHint>` `<kbd>` | shadcn 미제공 — vanilla 유지 |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`dice/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/storage.js`, `timer/timer.js` — 본 작업과 무관, 변경 금지
- `stopwatch/index.html`, `stopwatch/styles.css`, `stopwatch/main.js`, `stopwatch/stopwatch.js`, `stopwatch/storage.js` — 본 작업과 무관, 변경 금지
- `pomodoro/index.html`, `pomodoro/styles.css`, `pomodoro/main.js`, `pomodoro/timer.js`, `pomodoro/storage.js` — 본 작업과 무관, 변경 금지
- `clicker/index.html`, `clicker/styles.css`, `clicker/main.js`, `clicker/storage.js` — 본 작업과 무관, 변경 금지
- `weather/` — 본 작업과 무관, 변경 금지
- `kanban/` — 본 작업과 무관, 변경 금지
- 기존 페이지들의 라우팅·링크 (만약 있다면)

### 9.2 신규 `dice/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | pomodoro/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | pomodoro/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="dark">` 패턴 | pomodoro/index.html · clicker/index.html | **복제 (다크 default 유지)** | dice 도 다크 우선 (Epic 매핑) |
| `<link rel="stylesheet" href="./styles.css">` | pomodoro/index.html | **복제 + 경로 수정** | dice/styles.css 로 향함 |
| **head 인라인 `<script>` 다크 초기화** | pomodoro/index.html (9~19줄) | **복제** | flicker 방지 — `bf-theme` localStorage 키 공유 |
| **non-module `<script src="./main.js">`** | pomodoro/index.html (114줄) · clicker/index.html | **복제** | `type="module"` 사용 X — file:// CORS 안전 (AC §2) |
| `<header class="topbar">` 구조 | pomodoro/index.html · clicker/index.html | **복제 (라벨·내부 요소 수정)** | 제목 "주사위", `focus-total` 캡션 제거, `[🌙]` 다크 토글만 유지 |
| `:root` CSS 변수 블록 (공유 토큰) | pomodoro/styles.css · clicker/styles.css | **복제** + §2.1/2.2 dice 토큰 append/override | single source of truth: 본 명세. **dice 는 다크 default 이므로 `:root` 가 다크, `[data-theme="light"]` 가 라이트 override** — clicker 와 동일 다크 우선 패턴 |
| reset / base body 스타일 (`*{box-sizing}`, `body{margin:0;...}`) | pomodoro/styles.css | **복제** | 모든 페이지 공통 |
| `.btn` / `.btn--ghost` base 클래스 | pomodoro/styles.css · clicker/styles.css | **복제** | theme-toggle 버튼이 그대로 사용 |
| `<kbd>` 단축키 hint 스타일 (`.kbd-hint`, `kbd`) | pomodoro/styles.css · clicker/styles.css | **복제** | 동일 시각 패턴 |
| `.sr-only` 유틸리티 | (신규 패턴 — clicker 명세엔 없었음) | **신규** | a11y `<h2>` landmark 시각 hidden 용 |

### 9.3 추가/수정해야 할 부분 (dice 전용)

- dice card / dice box / 굴리기 CTA / 통계 카드 / 히스토리 카드 / hint+리셋 마크업 (§7.2)
- dice 전용 색·typo·motion 토큰 (§2.1 rose accent · §2.2 dice · §2.5 motion-roll · §3 — `--color-roll-glow`, `--color-sum-accent`, `--color-dice-*`, `--text-dice`, `--text-dice-sm`, `--text-sum`, `--text-stat`, `--text-stat-label`, `--text-roll-cta`, `--text-history`)
- `--radius-dice: 16px` (신규 — 주사위 박스 곡률)
- 굴림 상태 머신 (§6.1) + roll / reset / theme 핸들러 (§7.8)
- `.roll-button` / `.dice` / `.stat-row--sum` / `.history-row` 클래스 (§7.4 CSS)
- 3 step swap 굴림 animation (§6.3) — setInterval 120ms × 3 + commit
- 반응형 mobile breakpoint `< 640px` 에서 `--text-dice-sm` 적용 (§4.8, §7.4)
- `prefers-reduced-motion: reduce` 가드 (§7.4 마지막 블록 + §7.8 JS)
- `.sr-only` 유틸 클래스 (§7.3)

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지부터 확인.

### 9.4 file:// 안전 정책 (AC §2 — 절대 어기지 마라)

- `<script type="module">` 사용 금지 ← pomodoro/index.html · clicker/index.html 의 `<script src="./main.js">` 패턴 그대로 복제
- timer/index.html 의 `<script type="module" src="main.js">` 패턴은 **참조 금지** — dice 는 file:// 안전이 AC 직접 요구사항이므로 pomodoro/clicker 패턴 우선
- import / export / fetch / 외부 CDN / 외부 이미지 / 외부 svg 모두 금지
- main.js 는 단일 IIFE (`(function(){ ... })()`) 로 전역 오염 방지하면서 module 시스템 미사용
- **주사위 시각은 이모지 유니코드 글리프만** — 외부 이미지 / `<img>` / `<svg>` / icon font 모두 미사용

---

## 10. mockup 참조

[`docs/design/mockups/dice-BF-446.html`](mockups/dice-BF-446.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0건 — AC §2 매핑)
- 인라인 `<style>` + 인라인 `<script>` (또는 미사용) 만 사용 — `type="module"` X, fetch X, CDN X
- 시안 패널 구성:
  1. **다크 default + idle (굴림 0회)** — 빈 상태 entry point (`⚀ ⚀`, 통계 muted, 히스토리 empty)
  2. **다크 + 굴림 6회 (active)** — 통계/히스토리 채워진 상태, 합계 강조 위계 확인
  3. **다크 + 굴림 50회 (히스토리 cap 근접)** — 히스토리 stripe + scroll 시각 확인 (UI 표시 50개 cap)
  4. **라이트 + 굴림 4회** — 라이트 페어 시각 검증 (rose-600 accent + 합계 색)
  5. **굴리기 CTA 4 상태** (default / hover / active(scale 0.95) / focus-visible) 정적 표현
  6. **mobile (< 640px) 레이아웃** — dice 4rem 적용 + roll CTA 폭 100% 미리보기
- 더블클릭으로 열어도 모든 시각 요소 정상 렌더 (file:// 안전 자가 검증)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.7 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑 — fast mode self-critique 의무 표

> **fast mode 정책**: reviewer-design 이 없으므로 designer 가 self-critique 단계에서 본 표를 의무 작성. 각 AC 항목이 본 명세의 어느 섹션 / 어떤 토큰 / 어떤 CSS rule 에서 다뤄지는지 명시.

### 11.1 AC §1 — dice 모듈 디자인 명세 요구 (주사위/통계/히스토리 + AC 매핑 표 + 다크/라이트 토큰 + 이모지 사용 근거)

| Epic 요구 항목 | 본 명세 위치 | 충족 토큰 / 값 | ✓ |
|---|---|---|---|
| 주사위 박스(5rem 이모지 ⚀~⚅) 컴포넌트 명세 | §4.3, §5.1, §7.4 `.dice` CSS, §7.7 정량 표 | `--text-dice: 400 5rem/1 emoji` + glyph mapping `[⚀⚁⚂⚃⚄⚅]` | ✓ |
| 굴리기 CTA 컴포넌트 명세 | §4.4, §5.2, §7.4 `.roll-button` CSS, §7.7 정량 표 | `height: 56px; bg: var(--color-accent); 라벨 "🎲 굴리기"; 인터랙션 5상태` | ✓ |
| 통계 카드(합계 강조) 컴포넌트 명세 | §4.5, §5.3, §7.4 `.stats-card` / `.stat-row--sum` CSS | `--text-sum: 300 3rem mono` + `--color-sum-accent` (accent rose) — 합계 시각 위계 최상 | ✓ |
| 히스토리 compact row 컴포넌트 명세 | §4.6, §5.4, §7.4 `.history-row` CSS | `grid: 48px 1fr auto`, row 36px, 회차/이모지/합 3 column, cap 50 | ✓ |
| AC 매핑 표 명세 끝에 의무 포함 | **§11 본 표 자체** (§11.1 / §11.2 / §11.3 세 분할) | designer self-critique 강화 정책 충족 | ✓ |
| 다크 토큰 `--color-accent: #fb7185 (rose-400)` | §2.1 (10행), §7.3 `:root` 블록 | `--color-accent: #fb7185` | ✓ |
| 다크 토큰 `--color-bg-canvas: #0d1117` (다크 우선) | §2.1 (1행), §7.3 `:root` 블록 | `--color-bg-canvas: #0d1117` | ✓ |
| 라이트 페어 토큰 정의 | §2.1 (Light HEX 열), §7.3 `[data-theme="light"]` 블록 | bg `#FAFAF9`, accent `#e11d48` (rose-600) 등 13 토큰 페어 | ✓ |
| 이모지 사용 근거 명시 | §1.2 (이모지로 주사위 시각), §6.7 (file:// CORS — 외부 이미지 X), §6.8 (이모지 호환성), §9.4 (이미지 미사용 정책) | "외부 이미지 / svg / 폰트 CDN 없이 유니코드 글리프만 사용 — file:// 안전 + 인쇄/스크린샷 친화 + Simplicity First" 4 곳에서 cross-reference | ✓ |

### 11.2 AC §2 — file:// 직접 열기 제약 (ES module / fetch / 외부 CDN 금지, inline 또는 non-module script + 이모지만)

| 제약 항목 | 본 명세 위치 | 채택 정책 | ✓ |
|---|---|---|---|
| ES module 사용 금지 | §1.3 (비목표), §6.7, §7.2 (`<script src="./main.js">` non-module), §7.8 (IIFE), §9.4 | `<script type="module">` 사용 X — pomodoro/clicker 패턴 복제 | ✓ |
| fetch 호출 금지 | §6.7, §9.4 | `fetch()` 미사용 — 모든 상태 in-memory, 굴림은 `Math.random()` 만 사용 | ✓ |
| 외부 CDN 금지 | §1.3, §6.7, §9.4 | `<link href="https://...">` / `@import url(...)` / `<script src="https://...">` 미사용 — 시스템 폰트/이모지 스택만 | ✓ |
| inline `<script>` 또는 non-module `<script src>` 만 허용 | §6.7, §7.2 (head 인라인 + `<script src="./main.js">`), §9.4 | head 인라인 (다크 init) + non-module src (main.js) | ✓ |
| 이모지만으로 주사위 시각 동작 | §1.2, §3 (`--font-emoji` 스택), §4.3 (이모지 매핑), §6.8 (호환성), §9.4 (이미지 미사용) | `⚀ ⚁ ⚂ ⚃ ⚃ ⚄ ⚅` (U+2680~U+2685) — 외부 이미지 / svg / icon font 0건 | ✓ |
| mockup HTML 도 동일 제약 | §10 (mockup 패널 구성 + "단일 self-contained HTML 외부 의존성 0건") | mockup 도 외부 의존성 0 — 더블클릭 동작 | ✓ |
| dev 산출물도 동일 제약 | §7.1 ~ §7.8, §9.4 | dice/index.html · main.js 모두 file:// 안전 | ✓ |

### 11.3 AC §3 — designer PR 본문 self-check (AC 매핑 표 + CORS 호환 확인 + 디자인 토큰 정합성)

| 요구사항 | 본 명세 / PR 본문 위치 | ✓ |
|---|---|---|
| AC 매핑 표 PR 본문 명시 | PR 본문 "## AC 매핑" 섹션 (자동 템플릿 + 본 §11 표 요약 인용) | ✓ |
| CORS 호환 확인 (file:// 안전) | §6.7 + §9.4 + §11.2 (본 명세) + PR 본문 "## Self-critique" 섹션 1줄 명시 ("CORS 호환 — ES module/fetch/CDN/외부 이미지 0건, 이모지 글리프만 사용") | ✓ |
| 디자인 토큰 정합성 self-check | §2 토큰 정의 + §7.3 `:root` / `[data-theme="light"]` 블록 + §11.1 행별 토큰 매핑 + PR 본문 1줄 명시 ("rose-400/rose-600 다크/라이트 페어 WCAG AA 충족 — §2.1 근거") | ✓ |

### 11.4 종합 AC 충족 표

| AC 번호 | 핵심 요구 | 충족 | 비고 |
|---|---|---|---|
| AC §1 | dice 모듈 명세 요구 (주사위/통계/히스토리 컴포넌트 명세 + AC 매핑 표 + 다크/라이트 토큰 + 이모지 사용 근거) 9 sub-item | ✓ | §11.1 의 9 행 모두 cross-reference |
| AC §2 | file:// CORS 제약 (ES module/fetch/CDN 금지 + 이모지만으로 동작) 7 sub-item | ✓ | §11.2 의 7 항목 + §10 mockup 동일 |
| AC §3 | designer PR 본문 self-check (AC 매핑 / CORS / 토큰 정합성) 3 sub-item | ✓ | §11.3 + PR 본문 자동 prepend |

**누락된 AC 0건.**

---

## 12. Self-critique (fast mode 강화)

> fast mode 이므로 reviewer-design 단계가 없습니다. 본 섹션은 designer 가 의무적으로 작성하는 자가 검증 체크리스트입니다. 각 항목 ✓ / ⚠️ / ✗ + 1줄 사유.

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 (fast mode 의무) | ✓ | §11 에 AC §1 / §2 / §3 세 분할 표 + 종합 표. 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·핵심 CSS·17단계 구현 순서·§7.7 정량 일치 표·§7.8 main.js 골격 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (notepad/timer/stopwatch/pomodoro/clicker/weather/kanban 7 페이지), §9.2 복제 대상 (head 인라인 다크 init / non-module script / `<header>` / `:root` / `.btn` base / kbd-hint / sr-only), §9.3 신규, §9.4 file:// 정책 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 도입 시 매핑 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 3 건 |
| file:// CORS 안전 정책 (AC §2) | ✓ | §6.7 + §9.4 + §11.2 — 3 곳에서 cross-reference. mockup 도 동일 (§10). 이모지만 사용 (이미지/svg 0) |
| 다크 default 정책 (AC §1) | ✓ | §6.5 + §7.2 head 인라인 init + §7.3 `:root` 다크 / `[data-theme="light"]` override |
| 디자인 토큰 정합성 (AC §3) | ✓ | rose-400 (`#fb7185`) 다크 / rose-600 (`#e11d48`) 라이트 — Tailwind 표준 페어. 대비 ~7.5:1 / ~5.7:1 WCAG AA ✓ |
| 접근성 (a11y) | ✓ | §7.6 — `prefers-reduced-motion` (wiggle + transform + transition 비활성), focus-visible, aria-label (dice / button / row), 색 대비 검증, `<h2 sr-only>` landmark |
| 이모지 사용 근거 (AC §1) | ✓ | §1.2 + §6.7 + §6.8 + §9.4 — file:// 안전 + 인쇄/스크린샷 친화 + 시스템 컬러 글리프 자동 |

추가 자체 점검:

- **비범위 명시**: §1.3 에 localStorage 영속화 / 주사위 개수 변경 / d20 / 사운드 / 3D 굴림 / 외부 폰트 / ES module / 무한 누적 8개 explicit 제외 ✓
- **정량 일치 가능성**: §7.7 표가 desktop / mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **Space/R/T 충돌**: §6.2 에 현 페이지 input 없음 → 충돌 없음 명시. 대문자/소문자 모두 인식. Space 는 focus 가 버튼에 있을 때 브라우저 기본 우선 (전역 핸들러 skip) — 중복 굴림 회피 ✓
- **마우스 vs 키보드 press 시각 동기**: §6.3 + §7.4 `.is-pressed` 클래스 — 키보드 트리거 시에도 150ms scale 동기 ✓
- **굴림 중 중복 차단**: §6.3 `state.isRolling` + `rollBtn.disabled = true` 로 360ms 동안 추가 굴림 무시 ✓
- **iOS 터치 highlight**: §7.4 `-webkit-tap-highlight-color: transparent` 명시 ✓
- **touch-action**: §7.4 `touch-action: manipulation` 명시 (더블 탭 zoom 방지) ✓
- **WCAG 색 대비**: §7.6 에 다크 / 라이트 모두 AA 충족 산정 (accent on text 7.5:1, 5.7:1) ✓
- **reduced-motion 가드**: §7.4 마지막 + §7.8 `prefersReducedMotion` 분기로 wiggle / transform / 3 swap 모두 skip — 즉시 commit ✓
- **fast mode 정책 명시**: §0 + §11 헤더 + §12 헤더에서 fast mode 임을 3번 강조 → 후속 dev / 운영자가 이 명세의 검토 단계 차이를 인지 ✓
- **mockup 시각 검증**: §10 에 6 가지 패널 (다크 0회 / 다크 6회 / 다크 50회 / 라이트 4회 / CTA 4상태 / mobile preview) → 시각 검증 6 케이스 보장 ✓
- **이모지 폴백**: §6.8 에 OS 별 호환성 검증 (Apple/Win/Android/Linux 모두 ✓) + 폰트 부재 환경에서 기능 동작 보장 명시 ✓
- **히스토리 cap**: §4.6 + §7.7 + §7.8 `HISTORY_CAP = 50` 으로 UI 표시 cap 일관 ✓
- **굴림 정의**: §1.3 + §5.1 "2개의 6면체 주사위 고정" 명시 → dev 가 주사위 개수 추측 0 ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §2 / §4 만 수정):

1. **히스토리 표시 cap 50개** — 현재 default 는 UI 표시 최근 50개 (§4.6, §7.7, §7.8). 메모리는 cap 없음, 단지 표시만. 사용자가 100+ 굴림 시도 시 51 번째 이상은 보이지 않음. **권장: v1 은 50 cap 유지** (스크롤 무한 누적은 모바일 성능 부담) — 후속 무한 스크롤 / 페이징 분리 Epic.
2. **굴림 swap animation (3 step × 120ms = 360ms)** — 현재 default 는 시각 시그널 강화를 위해 굴림 중 페이스 swap (§6.3). 일부 사용자는 즉시 결과 보고 싶을 수 있음. **권장: v1 은 default ON** (게임/도구 느낌 강화 핵심) + `prefers-reduced-motion` 시 자동 skip — 추가 설정 옵션은 후속.
3. **히스토리 zebra striping** — 현재 default 는 odd row 에 미세 톤 차이 (`--color-history-row-stripe`). 다크 모드에서는 시각 차이 있고 라이트 모드에서는 거의 동일. **권장: v1 은 적용** (가독성 향상 미세하지만 positive) — 운영자가 "통일된 단색이 더 깔끔" 입장이면 §7.4 `.history-row:nth-child(odd)` 블록 1줄 제거.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
