# 클릭 카운터 게임 SPA 디자인 명세 (BF-441)

> 관련 task: BF-442 (designer · fast mode)
> mockup: [`docs/design/mockups/clicker-BF-441.html`](mockups/clicker-BF-441.html)
> 작성자: 이디자인

---

## 0. fast mode 안내

본 명세는 **fast mode** 로 진행됩니다 — reviewer-design 단계가 생략되므로 designer
self-critique 를 강화합니다. §11 의 **AC 매핑 표** 는 의무 포함 (운영자 정책).
dev 페르소나는 본 명세 + mockup HTML 만으로 추가 질문 없이 구현 가능해야 합니다.

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `clicker/index.html` (URL 진입점 `/clicker`)
- **다크 우선** 단일 카드 레이아웃: **대형 점수 display (4rem+) → 원형 클릭 버튼 (180px) → 보조 컨트롤 (Reset)**
- vanilla HTML/CSS/JS — **ES module / fetch / 외부 CDN 금지** (file:// CORS 안전)
- 토큰 시스템은 `notepad-BF-400` / `timer-BF-405` / `stopwatch-BF-415` / `pomodoro-BF-430` 와 공유, 본 명세는 **클리커 전용 토큰만 추가** (보라 accent 페어)

### 1.2 사용자 경험 목표
- **다크 우선**: default `data-theme="dark"`. 라이트는 토글로만 전환 (pomodoro 와 동일 패턴) — "게임 모드" 시각 시그널
- **클릭 즉시 시각 피드백**: 버튼 `scale(0.95)` 150ms 누르는 인터랙션 + 점수 즉시 +1 (대기 시간 0)
- **점수 가독성 절대 우선**: `4rem` (64px) 이상 큰 숫자 + `--font-mono` + `tabular-nums` 로 자릿수 떨림 0
- **원형 버튼 한 점 집중**: 정원 180px 가 화면 중앙 시각 앵커. accent (보라) 색으로 클릭 행위를 분명히 인식
- **단순함 (Simplicity First)**: 점수·버튼·리셋 외 다른 UI 없음. v1 은 game-feel 의 minimal core 만
- **키보드 단축**: `Space` / `Enter` 클릭, `R` 리셋, `T` 테마 토글

### 1.3 비목표 (Out of Scope)
- **localStorage 저장 / 최고 점수 기록** — v1 은 in-memory 단발 (새로고침 시 0)
- **사운드 / 진동 / Web Notification** — 시각 피드백만
- **achievements / 업적 / 멀티플레이어** — 후속 Epic
- **클릭 속도 통계 (CPS) / 그래프** — v1 비포함 (minimal core)
- **외부 폰트 CDN** — 시스템 스택만 (file:// 동작 보장)
- **ES module / fetch import** — 단일 inline `<script>` 또는 non-module `<script src>` 만 (AC §3 직접 매핑)

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/pomodoro-BF-430.md §2` / `docs/design/stopwatch-BF-415.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth). 클리커 전용 토큰은 §2.2 에만 추가.

### 2.1 색상 토큰 (다크 우선 — AC 명시)

> **AC §1 직접 매핑**: 다크 default 토큰 `--color-bg-canvas: #0d1117`, `--color-accent: #a78bfa` (보라) — Epic 요구 값 그대로 채택. 라이트 페어는 본 명세에서 신규 정의.

| 토큰명 | **Dark HEX (default)** | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | **`#0d1117`** | `#FAFAF9` | 페이지 전체 배경 (다크 default ← AC 매핑) |
| `--color-bg-surface` | `#161b22` | `#FFFFFF` | 카드 표면 (clicker card) |
| `--color-bg-subtle` | `#1f2530` | `#F1F1EF` | 버튼 hover / 리셋 ghost hover |
| `--color-border-default` | `#262c36` | `#E5E5E2` | 카드 구분선 |
| `--color-border-strong` | `#3a4150` | `#D0D0CC` | ghost button outline |
| `--color-text-primary` | `#E8E8E4` | `#1A1A19` | 본문·점수 숫자 |
| `--color-text-secondary` | `#9A9A93` | `#6B6B66` | 라벨·hint·"점수" 캡션 |
| `--color-text-muted` | `#6B6B66` | `#9A9A93` | placeholder·disabled |
| `--color-accent` | **`#a78bfa`** | `#7B5BE8` | **클릭 버튼 (원형) 배경** ← AC 매핑 |
| `--color-accent-hover` | `#bda1fc` | `#6B4FD8` | accent hover (밝게) |
| `--color-accent-active` | `#8c6df0` | `#5A3FC0` | accent active (눌릴 때 살짝 어둡게) |
| `--color-accent-on` | `#0d1117` | `#FFFFFF` | accent 배경 위 텍스트 (다크 = 어두운 텍스트로 대비 확보) |
| `--color-danger` | `#E55858` | `#D14343` | 리셋 hover 텍스트 강조 |
| `--color-focus-ring` | `rgba(167, 139, 250, 0.55)` | `rgba(123, 91, 232, 0.45)` | 키보드 focus outline (2px) — accent 와 톤 일치 |

> **다크 → 라이트 토글 시 대비 보존**: accent 배경(보라) 위 텍스트는 다크 default 에서는 `#0d1117` (어두운 텍스트) 로 가독성 확보. 라이트 모드 전환 시 `#FFFFFF` 로 교체. 이는 `--color-accent-on` 토큰으로 캡슐화 — CSS 사용처는 한 줄로 통일.

### 2.2 클리커 전용 추가 토큰

| 토큰명 | Dark | Light | 용도 |
|---|---|---|---|
| `--color-click-glow` | `rgba(167, 139, 250, 0.45)` | `rgba(123, 91, 232, 0.30)` | 클릭 버튼 hover/active 시 box-shadow halo |
| `--color-click-ring` | `rgba(167, 139, 250, 0.18)` | `rgba(123, 91, 232, 0.12)` | 클릭 버튼 정적 outer ring (선택 — 시각 위계 강화) |
| `--color-score-accent` | `#a78bfa` | `#7B5BE8` | 점수 숫자 강조 색 (= accent alias — 점수 1 이상일 때만 토글) |

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

### 2.4 반경·그림자 (재사용 + 클릭 버튼용 신규 1건)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` (보조 버튼) |
| `--radius-lg` | `12px` (카드) |
| `--radius-circle` | `50%` (클릭 버튼 원형 — 신규) |
| `--shadow-card` | `0 4px 16px rgba(0, 0, 0, 0.32)` (dark) / `0 4px 16px rgba(0, 0, 0, 0.06)` (light) |
| `--shadow-click` | `0 8px 24px var(--color-click-glow), 0 0 0 6px var(--color-click-ring)` (다크/라이트 동일 식 — 토큰 변수가 모드별 변동) |
| `--shadow-click-active` | `0 2px 8px var(--color-click-glow)` (눌릴 때 그림자 축소 — depth 변동) |

### 2.5 모션 토큰 (AC 매핑 — `scale(0.95)` 150ms 직접 정의)

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--motion-press` | **`150ms`** | **클릭 버튼 press animation** ← AC §1 직접 매핑 |
| `--motion-fast` | `120ms` | hover bg transition |
| `--motion-mid` | `220ms` | 점수 숫자 색 전환 (0 → 1 toggle) |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | press easing |
| `--scale-press` | **`0.95`** | **press 시 transform scale** ← AC §1 직접 매핑 |

> **AC 매핑**: `--motion-press: 150ms` + `--scale-press: 0.95` 두 토큰이 Epic "scale(0.95) 150ms 애니메이션" 요구사항을 캡슐화. CSS 적용 위치는 §4.4 + §7.3 참조.

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **score-display (desktop, ≥640px)** | **`5rem` / 80px** | `300` | `1` | `-0.02em` | `--text-score` |
| **score-display (mobile, <640px)** | **`4rem` / 64px** | `300` | `1` | `-0.02em` | `--text-score-sm` |
| score-label ("점수") | `13px` | `500` | `1.4` | `0.08em` (uppercase 옵션) | `--text-score-label` |
| click-cta ("Click!" 버튼 라벨) | `18px` | `600` | `1` | `0.02em` | `--text-click-cta` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |

score-display 는 **`--font-mono`** + `font-variant-numeric: tabular-nums` 적용 — 점수가 1→9→10→99→100 으로 자릿수 늘어날 때 가로폭 흔들림 0. weight `300` 으로 굵기를 줄여 큰 사이즈에서도 시각 잡음 최소화.

> **AC 매핑 (정량 고정)**:
> - 데스크탑 점수: `5rem` (80px) — AC 요구사항 "4rem+" 충족 (4rem 이상)
> - 모바일 점수: `4rem` (64px) — AC 요구사항 정확히 4rem (mobile fallback)
> - `font-variant-numeric: tabular-nums` 필수 (자릿수 떨림 방지)

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 640px)

```
┌────────────────────────────────────────────────────────────┐
│ Topbar · "클릭 카운터"                        [🌙 토글]      │  56px
├────────────────────────────────────────────────────────────┤
│                                                            │
│            ┌─────────────────────────────────┐             │
│            │                                 │             │
│            │            점수                  │  label      │
│            │           ─────                  │             │
│            │            42                   │  score      │
│            │                                 │ (5rem mono) │
│            │                                 │             │
│            │       ╭─────────────╮            │             │
│            │       │             │            │             │
│            │       │   Click!    │            │  원형 버튼   │
│            │       │             │            │  180×180    │
│            │       ╰─────────────╯            │             │
│            │                                 │             │
│            │          [⟲ Reset]              │  ghost      │
│            │                                 │             │
│            └─────────────────────────────────┘             │
│                                                            │
│       <kbd>Space</kbd> 클릭 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마 │  kbd-hint
└────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 480px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- clicker card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-7) var(--space-6)`
- card 내부 세로 stack: `display: flex; flex-direction: column; align-items: center;`, `gap: var(--space-6)` (label↔score↔버튼↔reset 각 32px)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "클릭 카운터" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (`id="theme-toggle"` — pomodoro/timer 와 동일 패턴)

### 4.3 점수 영역 (score display)

```
   ┌─────────────────────────┐
   │       점수               │   label (--text-score-label)
   │                         │
   │        42               │   숫자 (--text-score, mono, tabular-nums)
   └─────────────────────────┘
```

- 컨테이너: `display: flex; flex-direction: column; align-items: center; gap: var(--space-2)` (라벨 ↔ 숫자)
- 라벨 "점수": `--text-score-label` (13px / 500 / `--color-text-secondary` / uppercase letter-spacing)
- 숫자: `--text-score` (desktop 5rem) / `--text-score-sm` (mobile 4rem), `--font-mono`, `font-variant-numeric: tabular-nums`
- 색 상태:
  - 점수 `0`: `--color-text-muted` (회색 — "비어있음" 시각화)
  - 점수 `≥ 1`: `--color-text-primary` (다크 = `#E8E8E4`, 라이트 = `#1A1A19`)
  - **점수 증가 시점**: 150ms 동안 일시적으로 `--color-score-accent` (보라) 로 강조 후 primary 로 fade-back (옵션 — §6.3, mockup 은 정적 표현)
- `role="status" aria-live="polite"` — 점수 변동 시 SR 알림 (단, 매 클릭마다 polite 알림은 과할 수 있어 `aria-live="off"` + 매 5 클릭마다 `aria-label` 업데이트 방식도 가능 — §7.5 a11y)
- 숫자 변환: `score.toString()` (zero-pad 없음 — 자연수)
- 최대 표시: v1 cap 없음, 단 7 자리 이상 (≥ 10,000,000) 시 자동 축약 `10.0M` 등 — 후속 Epic. v1 은 7 자리까지 정상 표시 가정 (현실적으로 클릭으로 도달 불가).

### 4.4 원형 클릭 버튼 (`<ClickButton>` — 핵심 인터랙션)

```
       ╭─────────────────────╮
       │                     │
       │                     │
       │       Click!        │   180 × 180px 정원 (AC 매핑)
       │                     │   accent 보라 배경
       │                     │
       ╰─────────────────────╯
```

- **AC §1 직접 매핑**:
  - 모양: `width: 180px; height: 180px; border-radius: var(--radius-circle)` (50%) → 정원 180px
  - 배경: `var(--color-accent)` (다크 `#a78bfa`, 라이트 `#7B5BE8`)
  - 텍스트: "Click!" (`--text-click-cta`, `var(--color-accent-on)` — 다크에서 검정 텍스트로 대비)
- 정적 외관:
  - `box-shadow: var(--shadow-click)` (accent halo + outer ring) — 시각 위계 강화
  - `border: none`, `cursor: pointer`, `user-select: none`
  - `display: inline-flex; align-items: center; justify-content: center`
- **인터랙션 상태** (AC 핵심):
  - **hover**: `background: var(--color-accent-hover)`, `box-shadow: var(--shadow-click)` 유지, `transform: scale(1.02)` (살짝 부풀어오름 — pomodoro 의 ease-emphasized 와 동일 톤). transition `var(--motion-fast)` (120ms).
  - **active / pressed** (AC `scale(0.95)` 150ms): `transform: scale(var(--scale-press))` (= `0.95`), `background: var(--color-accent-active)`, `box-shadow: var(--shadow-click-active)`. transition `var(--motion-press)` (= `150ms`) `var(--ease-out)`.
  - **focus-visible**: `outline: 2px solid var(--color-focus-ring); outline-offset: 4px` (원형이므로 offset 살짝 키움)
  - **press release** (mouseup / keyup): scale 1 로 복귀, transition `var(--motion-press)` 150ms
- **CSS 적용 위치 (dev 권장 코드)**:

  ```css
  .click-button {
    width: 180px;
    height: 180px;
    border-radius: var(--radius-circle);
    background: var(--color-accent);
    color: var(--color-accent-on);
    font: var(--text-click-cta);
    border: none;
    cursor: pointer;
    user-select: none;
    box-shadow: var(--shadow-click);
    transition:
      transform var(--motion-press) var(--ease-out),
      background var(--motion-fast) var(--ease-out),
      box-shadow var(--motion-fast) var(--ease-out);
  }
  .click-button:hover {
    background: var(--color-accent-hover);
    transform: scale(1.02);
  }
  .click-button:active,
  .click-button.is-pressed {
    background: var(--color-accent-active);
    transform: scale(var(--scale-press)); /* 0.95 ← AC 매핑 */
    box-shadow: var(--shadow-click-active);
  }
  .click-button:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 4px;
  }
  ```

  - `.is-pressed` 클래스는 키보드 (`Space`/`Enter`) press 시 JS 로 토글 — 마우스 `:active` 와 시각 일치 보장 (브라우저별 `:active` 동작 차이 회피).
- `aria-label="클릭하여 점수 +1"`, `type="button"` 명시
- 모바일 터치 시: 동일 `:active` 발동 (브라우저 기본 touch → active 매핑) + iOS Safari 의 tap highlight 제거 (`-webkit-tap-highlight-color: transparent`)
- **`prefers-reduced-motion: reduce`** 시: `transform: none` 강제 (scale 애니메이션 비활성), 배경색 transition 은 유지 (의미 신호이므로). §7.5 a11y 참조.

### 4.5 리셋 버튼 (ghost)

- 위치: 클릭 버튼 아래, card 중앙
- 라벨: `⟲ Reset`
- variant: ghost (background transparent, border `1px solid var(--color-border-strong)`, color `--color-text-secondary`)
- 크기: `height: 40px`, `min-width: 96px`, `padding: 0 var(--space-4)`, `font: var(--text-button)`, `border-radius: var(--radius-md)`
- hover: `background: var(--color-bg-subtle)`, 텍스트 색 `var(--color-danger)` (destructive 시그널)
- disabled 조건: 점수가 `0` 일 때 (이미 리셋 상태) — `opacity: 0.4; cursor: not-allowed`
- 클릭 동작: 점수 0 으로 즉시 복귀, 확인 modal 없음 (UX 마찰 최소화 — stopwatch 와 동일 정책)
- 단축키 `R` (대소문자 무관) 도 동일 동작

### 4.6 빈 상태 (점수 0)
- 점수 숫자: `0` (muted 회색)
- 리셋 버튼: disabled
- 클릭 버튼: enabled (이게 entry point)
- hint 라인 표시: `Space 클릭 · R 리셋 · T 테마`

### 4.7 반응형 Breakpoint

| breakpoint | score 크기 | card width | click 버튼 크기 | reset |
|---|---|---|---|---|
| **`≥ 640px`** (desktop/tablet) | `--text-score` (5rem / 80px) | max-width `480px`, padding `--space-7 --space-6` | 180 × 180 (AC 고정) | height 40, min-width 96 |
| **`< 640px`** (mobile) | `--text-score-sm` (`4rem` / 64px) ← AC 매핑 | max-width `100%`, margin `var(--space-4)`, padding `var(--space-6) var(--space-5)` | 180 × 180 (AC 고정 유지 — 모바일 터치 영역 충분) | height 40, min-width 100% (card 폭 채움) |
| **`< 360px`** (XS) | 동일 4rem | (mobile 과 동일) | `160 × 160` 으로 미세 축소 (선택 — viewport 안전 확보. 명세 default 는 180 고정, dev 가 viewport 측정 후 결정 OK) | (mobile 과 동일) |

> **AC §1 매핑 (반응형)**: mobile breakpoint `< 640px` 에서 점수 `4rem` (64px) 정확히 적용. 클릭 버튼 180px 는 desktop/mobile 공히 유지 (터치 타깃 권장 ≥ 48px 충족).

### 4.8 다크/라이트 토글 시각

- 토글 버튼 (topbar 우측): ghost button, 라벨 `🌙` (다크 default) / `☀` (라이트 모드)
- 클릭 시 `<html data-theme="dark|light">` 속성 변경 → CSS 변수 자동 재바인딩
- `localStorage["bf-theme"]` 키로 영속화 (단, file:// 환경에서도 동작 — sandbox 가드 §6.5)
- 첫 로드 시 head 인라인 `<script>` 로 즉시 적용 (FOUC/flicker 방지 — pomodoro §6.6 동일 패턴)

---

## 5. 컴포넌트 명세

### 5.1 `<ScoreDisplay>`
props:
- `value: number` (≥ 0, 정수)

표시 변환:
- `value === 0`: 텍스트 `"0"`, 색 `--color-text-muted`
- `value ≥ 1`: 텍스트 `String(value)`, 색 `--color-text-primary` (옵션: 직전 클릭 후 150ms 만 `--color-score-accent`)

aria:
- `role="status" aria-live="off" aria-atomic="true" aria-label="현재 점수 {value} 점"` — 매 클릭마다 SR 알림은 과하므로 default `off`. 5 의 배수 도달 / 리셋 등 의미 변화 시점에서만 임시로 `polite` 토글 (선택 — §7.5)

### 5.2 `<ClickButton>` (원형 — 핵심)
props:
- `onClick()` — 점수 +1

명세:
- §4.4 참조 (사이즈 / 색 / 인터랙션 상세)
- 키보드: `Space` / `Enter` 누르면 click + `.is-pressed` 클래스 150ms 적용 → 마우스 `:active` 와 시각 동기
- 클릭 frequency: rate-limit 없음 — 사용자가 빠르게 연타해도 매 클릭 +1 카운트. event listener 는 `pointerdown` 보다 `click` 이벤트가 안전 (드래그 false-positive 회피)
- 더블 탭 zoom 방지 (iOS): `touch-action: manipulation`
- aria:
  - `<button type="button" id="btn-click" class="click-button" aria-label="클릭하여 점수 +1">Click!</button>`
  - 클릭 시 별도 SR 알림은 §5.1 score 가 처리 (중복 알림 회피)

### 5.3 `<ResetButton>` (ghost)
props:
- `disabled: boolean` (점수 0 일 때 true)
- `onReset()` — 점수 0 으로 복귀

명세: §4.5 참조. 단축키 `R` / `r`.

aria:
- `<button type="button" id="btn-reset" aria-label="점수 리셋">⟲ Reset</button>`
- disabled 시 `disabled` 속성 + `aria-disabled="true"`

### 5.4 `<KbdHint>` (키보드 단축키 힌트)
- 단일 `<p>` 라인, card 외부 page 하단 가운데
- `--text-caption`, `--color-text-muted`
- 내용: `<kbd>Space</kbd> 클릭 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마`
- `<kbd>` 스타일: `padding: 2px 6px`, `border: 1px solid var(--color-border-default)`, `border-radius: --radius-sm`, `background: --color-bg-subtle`, `font: 11px/1 var(--font-mono)`

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

매우 단순 — 단일 정수 상태 `score: number`.

```
   ┌────────────┐    click     ┌────────────────┐
   │ score = 0  ├─────────────►│ score ≥ 1       │
   │ (idle)     │              │ (active)        │
   │            │◄─────────────┤                 │
   └────────────┘    reset     └────────────────┘
        ▲                            │
        │     click (still ≥1)       │
        │                            │
        └────────────────────────────┘
                 (loop: score +1)
```

전이 규칙:
- `idle → active`: 클릭 버튼 또는 `Space`/`Enter` (focused 시)
- `active → active`: 추가 클릭마다 `score++`
- `active → idle`: 리셋 버튼 또는 `R` 키

### 6.2 키보드 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar 토글 → 클릭 버튼 → 리셋 버튼 순환 | 전역 |
| `Space` | 현재 focused 버튼 클릭 (브라우저 기본) | 버튼 focus 시 |
| `Enter` | 현재 focused 버튼 클릭 (브라우저 기본) | 버튼 focus 시 |
| `Space` (전역 — focus 없음 시) | 클릭 버튼 트리거 (편의) | 단, input 내부 focus 시 X — 현 페이지엔 input 없음 |
| `R` / `r` | 리셋 (점수 ≥ 1 일 때만 유효) | 전역 |
| `T` / `t` | 다크/라이트 테마 토글 | 전역 |

**`Space` 전역 클릭** 은 편의 단축으로, 사용자가 키보드만 사용할 때 매번 Tab 으로 버튼에 포커스를 옮기지 않아도 되게 함. 단, 버튼이 이미 focused 일 때는 브라우저 기본 `Space → click` 이 발동하므로 중복 처리 회피 (전역 핸들러에서 `event.target` 이 버튼이면 skip).

**대문자/소문자**: `R`/`r`, `T`/`t` 모두 인식 (`event.key.toLowerCase()` 비교). Caps Lock 사용자 친화.

**focus-visible**: 모든 interactive 요소는 `:focus-visible` 시 outline 노출. 마우스 클릭 focus 에서는 outline 숨김.

### 6.3 클릭 인터랙션 흐름

1. 사용자 클릭 (마우스 / 터치 / Space / Enter)
2. `score` 즉시 +1 (state 갱신)
3. 버튼: `.is-pressed` 클래스 추가 → `transform: scale(0.95)` 150ms 적용 (CSS transition)
4. 150ms 후 (또는 mouseup / keyup 즉시) `.is-pressed` 제거 → scale 1 복귀
5. 점수 숫자: 옵션으로 `--color-score-accent` 적용 후 220ms (`--motion-mid`) 뒤 primary 색 복귀 (정보 변화 시각 신호 — §5.1)
6. SR 알림은 §5.1 정책에 따라 default 비활성 (성가심 회피)

코드 (권장):
```js
function handleClick() {
  state.score += 1;
  render();
  btn.classList.add("is-pressed");
  setTimeout(() => btn.classList.remove("is-pressed"), 150);
}
```

CSS `:active` 가 마우스 케이스를 자연 처리하므로 `.is-pressed` 토글은 **키보드 트리거 케이스만** 명확히 동기화하기 위함. (마우스 클릭의 `:active` 는 mousedown ~ mouseup 까지만 발동 — 너무 짧을 수 있어 150ms 강제 적용).

### 6.4 리셋 인터랙션 흐름

1. 리셋 버튼 클릭 또는 `R` 키
2. `score = 0` 즉시 적용
3. 점수 숫자 색 → `--color-text-muted` 로 페이드 (transition `var(--motion-mid)` 220ms)
4. 리셋 버튼 disabled (점수 0 이므로)
5. SR 알림: `aria-live="polite"` 1 회 — "점수가 리셋되었습니다" (선택 — §7.5)

확인 modal **없음** — UX 마찰 최소화. 실수 시 다시 클릭으로 점수 복구 가능 (게임 성격상 손실 비용 낮음).

### 6.5 다크 모드 토글

- topbar `[🌙/☀]` 토글 → `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad / timer / stopwatch / pomodoro 와 동일) — 페이지 간 일관성
- 첫 로드 시 head 인라인 `<script>` (`<script>` non-module) 로 즉시 적용 — FOUC 방지
- **다크 default**: 저장값 없을 때 `dark` 채택 (pomodoro 와 동일 정책 — Epic 요구사항 "다크 우선" 매핑)
- localStorage 사용 불가 환경 (private mode, file://) 에서도 default `dark` 유지

코드 (권장 — pomodoro/index.html 의 패턴 그대로 복제):
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
- 점수는 **localStorage 미사용** — 새로고침 시 0 으로 복귀 (v1 단발 세션)
- `bf-theme` 만 localStorage 사용 (다른 SPA 와 일관)
- 후속 Epic 에서 "최고 점수 기록 / 누적 클릭 수" 옵션 추가 가능

### 6.7 file:// CORS 안전 정책 (AC §3 매핑)

> **AC §3 직접 매핑**: "file:// 직접 열기 제약" — ES module / fetch / 외부 CDN 금지.

- `<script type="module">` 사용 금지 → **`<script src="./main.js">`** (non-module) 또는 **inline `<script>`** 만 사용
- `import` / `export` 구문 금지 (전역 함수 / IIFE 패턴으로 분리)
- `fetch()` 호출 금지 (정적 데이터 없음 — 점수는 in-memory)
- 외부 CDN `<link href="https://...">` 금지 (시스템 폰트 스택만)
- 폰트는 `--font-mono` / `--font-sans` 시스템 스택만 — `@import url(...)` 도 금지
- 결과: 사용자가 `clicker/index.html` 를 더블클릭 (file:// 프로토콜) 으로 열어도 정상 동작

> **mockup HTML 도 동일 정책** — `docs/design/mockups/clicker-BF-441.html` 도 외부 의존성 0건으로 작성 (§10).

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── clicker/
│   ├── index.html       # 클리커 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃
│   └── main.js          # 상태 + 이벤트 (non-module, IIFE)
├── pomodoro/            # 기존 (보존)
├── stopwatch/           # 기존 (보존)
├── timer/               # 기존 (보존)
├── notepad/             # 기존 (보존)
└── docs/design/
    ├── clicker-BF-441.md            (본 문서)
    └── mockups/clicker-BF-441.html  (시각 mockup)
```

`storage.js` 별도 파일 **불필요** (in-memory only, theme 만 localStorage 사용 — head inline 스크립트로 충분).

### 7.2 HTML 골격 (권장 클래스명 — file:// 안전)

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>클릭 카운터</title>
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
      <h1 class="topbar__title">클릭 카운터</h1>
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
      <section class="card clicker" aria-label="클릭 카운터 게임">
        <!-- 점수 영역 -->
        <div class="score" role="status" aria-live="off" aria-atomic="true">
          <span class="score__label">점수</span>
          <span class="score__value" id="score-value" aria-label="현재 점수 0 점">0</span>
        </div>

        <!-- 원형 클릭 버튼 (핵심 — AC 매핑 180px / 보라 / scale(0.95) 150ms) -->
        <button
          type="button"
          class="click-button"
          id="btn-click"
          aria-label="클릭하여 점수 +1"
        >Click!</button>

        <!-- 리셋 (점수 0 일 때 disabled) -->
        <button
          type="button"
          class="btn btn--ghost"
          id="btn-reset"
          aria-label="점수 리셋"
          disabled
        >⟲ Reset</button>
      </section>

      <p class="kbd-hint">
        <kbd>Space</kbd> 클릭 · <kbd>R</kbd> 리셋 · <kbd>T</kbd> 테마
      </p>
    </main>

    <!-- file:// 안전 — non-module script (AC §3) -->
    <script src="./main.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치

`clicker/styles.css` 상단에 `:root` 블록 — **다크 default** 로 변수 정의. 라이트 토글은 `[data-theme="light"]` 셀렉터로 override.

```css
:root {
  /* fonts */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* dark default (AC §1 매핑) */
  --color-bg-canvas: #0d1117;
  --color-bg-surface: #161b22;
  --color-bg-subtle: #1f2530;
  --color-border-default: #262c36;
  --color-border-strong: #3a4150;
  --color-text-primary: #E8E8E4;
  --color-text-secondary: #9A9A93;
  --color-text-muted: #6B6B66;
  --color-accent: #a78bfa;
  --color-accent-hover: #bda1fc;
  --color-accent-active: #8c6df0;
  --color-accent-on: #0d1117;
  --color-danger: #E55858;
  --color-focus-ring: rgba(167, 139, 250, 0.55);

  --color-click-glow: rgba(167, 139, 250, 0.45);
  --color-click-ring: rgba(167, 139, 250, 0.18);
  --color-score-accent: #a78bfa;

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
  --radius-circle: 50%;

  /* shadow */
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.32);
  --shadow-click:
    0 8px 24px var(--color-click-glow),
    0 0 0 6px var(--color-click-ring);
  --shadow-click-active: 0 2px 8px var(--color-click-glow);

  /* motion (AC §1 매핑) */
  --motion-press: 150ms;   /* AC: scale(0.95) 150ms */
  --motion-fast: 120ms;
  --motion-mid: 220ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --scale-press: 0.95;     /* AC: scale(0.95) */

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-score: 300 5rem/1 var(--font-mono);       /* desktop ≥640px */
  --text-score-sm: 300 4rem/1 var(--font-mono);    /* mobile <640px — AC 매핑 */
  --text-score-label: 500 13px/1.4 var(--font-sans);
  --text-click-cta: 600 18px/1 var(--font-sans);
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
  --color-accent: #7B5BE8;
  --color-accent-hover: #6B4FD8;
  --color-accent-active: #5A3FC0;
  --color-accent-on: #FFFFFF;
  --color-danger: #D14343;
  --color-focus-ring: rgba(123, 91, 232, 0.45);

  --color-click-glow: rgba(123, 91, 232, 0.30);
  --color-click-ring: rgba(123, 91, 232, 0.12);
  --color-score-accent: #7B5BE8;

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
```

### 7.4 단계별 구현 순서 (권장)

1. **§7.2 골격 HTML** 작성 + 빈 `styles.css` / `main.js` (non-module, 단일 IIFE)
2. **§7.3 CSS 변수 + base reset** — 다크 default 가 즉시 적용되는지 확인
3. **Topbar** (pomodoro / timer 와 동일 패턴, 다크 토글만 단독)
4. **Page + card 컨테이너** (max-width 480, padding, box-shadow)
5. **ScoreDisplay** 정적 (`0` 텍스트 + font-mono + tabular-nums) — 4rem/5rem 위계 확인
6. **ClickButton** (§4.4 의 CSS 그대로 적용) — `:hover`, `:active`, `.is-pressed`, `:focus-visible` 4 상태 시각 확인
7. **ResetButton** (ghost) — disabled 시각 + hover danger 색
8. **state + main.js IIFE** — `let score = 0; const btn = ...; btn.addEventListener("click", ...)` 패턴
9. **render()** 함수 — score 변동 시 textContent 갱신 + reset disabled 토글 + score 색 토글 (0 / ≥1)
10. **`.is-pressed` 클래스 토글** (§6.3) — 키보드 트리거 시 시각 동기
11. **키보드 단축키** (§6.2 표): `keydown` 전역 — Space (focus 없을 때) / R / T
12. **다크 토글** — `theme-toggle` 클릭 핸들러 + `localStorage["bf-theme"]` 저장
13. **반응형** — `@media (max-width: 639px)` / `@media (max-width: 359px)`
14. **prefers-reduced-motion 가드** — §7.5

### 7.5 a11y 체크

- score: `role="status" aria-live="off"` (매 클릭마다 SR 가 안 읽도록 — 성가심 회피). 5 배수 / 리셋 시점에만 `aria-live="polite"` 임시 토글 (선택)
- click 버튼: `aria-label="클릭하여 점수 +1"` — 시각 라벨 "Click!" 외에도 의미 명확화
- reset 버튼: `aria-label="점수 리셋"` + disabled 시 `aria-disabled="true"`
- focus-visible only outline (`:focus` 단독 X)
- **`prefers-reduced-motion: reduce`** 시:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .click-button {
      transition: background var(--motion-fast) var(--ease-out);
    }
    .click-button:hover { transform: none; }
    .click-button:active,
    .click-button.is-pressed { transform: none; }
    .score__value { transition: color var(--motion-fast); }
  }
  ```
  → scale 인터랙션 비활성, 배경색 변화는 유지 (의미 신호)
- 키보드 hint 라인 `<kbd>` 는 시각용 + SR 친화
- 색 대비 검증:
  - 다크 mode: accent `#a78bfa` 배경 + `#0d1117` 텍스트 = WCAG AA 충족 (대비 ~12:1)
  - 라이트 mode: accent `#7B5BE8` 배경 + `#FFFFFF` 텍스트 = WCAG AA 충족 (대비 ~6:1)
  - score muted `#6B6B66` (light) / `#6B6B66` (dark) — 4.5:1 이상 (large text 면제 적용)

### 7.6 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (PR review 시 확인):

| 항목 | 값 (desktop) | 토큰 | AC 매핑 |
|---|---|---|---|
| `--color-bg-canvas` (dark) | `#0d1117` | `--color-bg-canvas` | **AC §1** |
| `--color-accent` (dark) | `#a78bfa` | `--color-accent` | **AC §1** |
| click 버튼 width × height | `180px × 180px` | hardcoded | **AC §1 (원형 180px)** |
| click 버튼 border-radius | `50%` | `--radius-circle` | **AC §1 (원형)** |
| click 버튼 press transform | `scale(0.95)` | `--scale-press` | **AC §1 (scale(0.95))** |
| click 버튼 press transition | `150ms` | `--motion-press` | **AC §1 (150ms 애니메이션)** |
| score 폰트 (≥640px) | `300 5rem/1 mono` | `--text-score` | **AC §1 (4rem+)** |
| score 폰트 (<640px) | `300 4rem/1 mono` | `--text-score-sm` | **AC §1 (4rem+) + 반응형 breakpoint** |
| 반응형 mobile breakpoint | `< 640px` | `@media` | **AC §1 (반응형)** |
| clicker card max-width | `480px` | hardcoded | — |
| clicker card padding | `48px 32px` | `--space-7 --space-6` | — |
| card 내부 stack gap | `32px` | `--space-6` | — |
| reset 버튼 height | `40px` | hardcoded | — |
| ES module 사용 | **금지** | `<script src="./main.js">` non-module | **AC §3 (file:// 안전)** |
| fetch / 외부 CDN | **금지** | inline / 같은 디렉토리 ref 만 | **AC §3 (file:// 안전)** |

### 7.7 main.js 권장 골격 (non-module, IIFE — file:// 안전)

```js
(function () {
  "use strict";

  /* ------------- state ------------- */
  var state = { score: 0 };

  /* ------------- DOM refs ------------- */
  var scoreEl = document.getElementById("score-value");
  var clickBtn = document.getElementById("btn-click");
  var resetBtn = document.getElementById("btn-reset");
  var themeBtn = document.getElementById("theme-toggle");

  /* ------------- render ------------- */
  function render() {
    scoreEl.textContent = String(state.score);
    scoreEl.setAttribute(
      "aria-label",
      "현재 점수 " + state.score + " 점"
    );
    scoreEl.classList.toggle("is-zero", state.score === 0);
    resetBtn.disabled = state.score === 0;
  }

  /* ------------- click handler ------------- */
  function handleClick() {
    state.score += 1;
    render();
    clickBtn.classList.add("is-pressed");
    setTimeout(function () {
      clickBtn.classList.remove("is-pressed");
    }, 150); /* AC §1: 150ms */
  }

  /* ------------- reset handler ------------- */
  function handleReset() {
    if (state.score === 0) return;
    state.score = 0;
    render();
  }

  /* ------------- theme toggle ------------- */
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    themeBtn.textContent = next === "dark" ? "🌙" : "☀";
    try {
      localStorage.setItem("bf-theme", next);
    } catch (_e) { /* private mode 등 — ignore */ }
  }

  /* ------------- event wiring ------------- */
  clickBtn.addEventListener("click", handleClick);
  resetBtn.addEventListener("click", handleReset);
  themeBtn.addEventListener("click", toggleTheme);

  /* keyboard shortcuts */
  document.addEventListener("keydown", function (e) {
    var key = e.key.toLowerCase();
    var target = e.target;
    /* input 안에서는 단축키 무시 — 현 페이지엔 input 없지만 방어 코드 */
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    if (key === " " || key === "spacebar") {
      /* Space: 버튼이 이미 focused 면 브라우저 기본 click 발동되므로 skip */
      if (target === clickBtn || target === resetBtn || target === themeBtn) return;
      e.preventDefault();
      handleClick();
    } else if (key === "r") {
      handleReset();
    } else if (key === "t") {
      toggleTheme();
    }
  });

  /* 초기 theme 동기화 — head 인라인 스크립트가 이미 적용함 */
  var initialTheme = document.documentElement.getAttribute("data-theme");
  themeBtn.textContent = initialTheme === "light" ? "☀" : "🌙";

  /* 첫 render */
  render();
})();
```

### 7.8 score.is-zero 시각 (CSS 추가)

```css
.score__value {
  font: var(--text-score);
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  transition: color var(--motion-mid) var(--ease-out);
}
.score__value.is-zero {
  color: var(--color-text-muted);
}
@media (max-width: 639px) {
  .score__value {
    font: var(--text-score-sm); /* 4rem ← AC 매핑 */
  }
}
```

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<ScoreDisplay>` | vanilla — shadcn 미제공 (커스텀 unique) |
| `<ClickButton>` (원형 180px) | `Button` (`size: lg`, `variant: default`) — 단 원형 / 사이즈는 커스텀 className override 필요 (shadcn 의 default 는 직사각형) |
| `<ResetButton>` | `Button` (`size: sm`, `variant: ghost`) |
| 다크 토글 | vanilla (pomodoro / timer 와 공유 패턴) |
| `<KbdHint>` `<kbd>` | shadcn 미제공 — vanilla 유지 |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`clicker/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/storage.js`, `timer/timer.js` — 본 작업과 무관, 변경 금지
- `stopwatch/index.html`, `stopwatch/styles.css`, `stopwatch/main.js`, `stopwatch/stopwatch.js`, `stopwatch/storage.js` — 본 작업과 무관, 변경 금지
- `pomodoro/index.html`, `pomodoro/styles.css`, `pomodoro/main.js`, `pomodoro/timer.js`, `pomodoro/storage.js` — 본 작업과 무관, 변경 금지
- 기존 페이지들의 라우팅·링크 (만약 있다면)

### 9.2 신규 `clicker/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | pomodoro/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | pomodoro/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="dark">` 패턴 | pomodoro/index.html | **복제 (다크 default 유지)** | clicker 도 다크 우선 (Epic 매핑) |
| `<link rel="stylesheet" href="./styles.css">` | pomodoro/index.html | **복제 + 경로 수정** | clicker/styles.css 로 향함 |
| **head 인라인 `<script>` 다크 초기화** | pomodoro/index.html (9~19줄) | **복제** | flicker 방지 — `bf-theme` localStorage 키 공유 |
| **non-module `<script src="./main.js">`** | pomodoro/index.html (114줄) | **복제** | `type="module"` 사용 X — file:// CORS 안전 (AC §3) |
| `<header class="topbar">` 구조 | pomodoro/index.html | **복제 (라벨·내부 요소 수정)** | 제목 "뽀모도로" → "클릭 카운터", `focus-total` 캡션 제거, `[🌙]` 다크 토글만 유지 |
| `:root` CSS 변수 블록 (공유 토큰) | pomodoro/styles.css | **복제** + §2.1/2.2 클리커 토큰 append/override | single source of truth: 본 명세. **clicker 는 다크 default 이므로 `:root` 가 다크, `[data-theme="light"]` 가 라이트 override** — pomodoro 와 동일 다크 우선 패턴 |
| reset / base body 스타일 (`*{box-sizing}`, `body{margin:0;...}`) | pomodoro/styles.css | **복제** | 모든 페이지 공통 |
| `.btn` / `.btn--ghost` base 클래스 | pomodoro/styles.css | **복제** | reset / theme-toggle 버튼이 그대로 사용. `.btn--ghost-lg` 는 clicker 미사용 (clicker 는 `.click-button` 단독 + ghost reset) |
| `<kbd>` 단축키 hint 스타일 (`.kbd-hint`, `kbd`) | pomodoro/styles.css | **복제** | 동일 시각 패턴 |

### 9.3 추가/수정해야 할 부분 (clicker 전용)

- clicker card / score / 원형 클릭 버튼 / reset 마크업 (§7.2)
- clicker 전용 색·typo·motion 토큰 (§2.2, §2.5, §3 — `--color-click-*`, `--scale-press`, `--motion-press`, `--text-score`, `--text-score-sm`, `--text-click-cta`, `--text-score-label`)
- `--radius-circle: 50%` (신규 — 클릭 버튼 원형)
- 점수 상태 머신 (§6.1) + click / reset / theme 핸들러 (§7.7)
- `.click-button` 클래스 (§4.4 CSS) + `.is-pressed` 키보드 트리거 동기 클래스
- 반응형 mobile breakpoint `< 640px` 에서 `--text-score-sm` 적용 (§4.7, §7.8)
- `prefers-reduced-motion: reduce` 가드 (§7.5)

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지부터 확인.

### 9.4 file:// 안전 정책 (AC §3 — 절대 어기지 마라)

- `<script type="module">` 사용 금지 ← pomodoro/index.html 의 `<script src="./main.js">` 패턴 (line 114) 그대로 복제
- timer/index.html 의 `<script type="module" src="main.js">` 패턴은 **참조 금지** — clicker 는 file:// 안전이 AC 직접 요구사항이므로 pomodoro 패턴 우선
- import / export / fetch / 외부 CDN 모두 금지
- main.js 는 단일 IIFE (`(function(){ ... })()`) 로 전역 오염 방지하면서 module 시스템 미사용

---

## 10. mockup 참조

[`docs/design/mockups/clicker-BF-441.html`](mockups/clicker-BF-441.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0건 — AC §3 매핑)
- 인라인 `<style>` + 인라인 `<script>` (또는 미사용)만 사용 — `type="module"` X, fetch X, CDN X
- 시안 패널 구성:
  1. **다크 default + 점수 0 (idle)** — 빈 상태 시작점
  2. **다크 + 점수 42 (active)** — 정상 게임 진행 중
  3. **다크 + 점수 999 (active, 자릿수 큼)** — tabular-nums 확인
  4. **라이트 + 점수 7** — 라이트 페어 시각 검증
  5. **클릭 버튼 4 상태** (default / hover / active(scale 0.95) / focus-visible) 정적 표현
  6. **mobile (< 640px) 레이아웃** — score 4rem 적용 미리보기
- 더블클릭으로 열어도 모든 시각 요소 정상 렌더 (file:// 안전 자가 검증)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.6 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑 — fast mode self-critique 의무 표

> **fast mode 정책**: reviewer-design 이 없으므로 designer 가 self-critique 단계에서 본 표를 의무 작성. 각 AC 항목이 본 명세의 어느 섹션 / 어떤 토큰 / 어떤 CSS rule 에서 다뤄지는지 명시.

### 11.1 AC §1 — 디자인 요구사항 (다크 토큰·라이트 페어·원형 버튼·점수 typo·애니메이션·반응형)

| Epic 요구 항목 | 본 명세 위치 | 충족 토큰 / 값 | ✓ |
|---|---|---|---|
| 다크 우선 토큰 `--color-bg-canvas: #0d1117` | §2.1 (1행), §7.3 `:root` 블록 | `--color-bg-canvas: #0d1117` | ✓ |
| 다크 우선 토큰 `--color-accent: #a78bfa` | §2.1 (9행), §7.3 `:root` 블록 | `--color-accent: #a78bfa` | ✓ |
| 라이트 페어 토큰 정의 | §2.1 (Light HEX 열), §7.3 `[data-theme="light"]` 블록 | bg `#FAFAF9`, accent `#7B5BE8` 등 12 토큰 페어 | ✓ |
| 원형 180px 클릭 버튼 | §4.4 (사이즈), §7.3 (`--radius-circle: 50%`), §7.6 정량 표 | `width: 180px; height: 180px; border-radius: 50%` | ✓ |
| 4rem+ 점수 display | §3 (typo 표 — desktop 5rem, mobile 4rem), §4.3, §7.6 정량 표, §7.8 CSS | `--text-score: 5rem` (desktop, ≥4rem 충족) / `--text-score-sm: 4rem` (mobile, 정확히 4rem) | ✓ |
| scale(0.95) 애니메이션 | §2.5 (`--scale-press: 0.95`), §4.4 (`.click-button:active`), §7.3 토큰 정의 | `transform: scale(0.95)` via `--scale-press` | ✓ |
| 150ms 애니메이션 timing | §2.5 (`--motion-press: 150ms`), §4.4 (transition rule), §6.3 (JS setTimeout 150) | `transition: transform 150ms`, JS `setTimeout(..., 150)` | ✓ |
| 반응형 breakpoint 명시 | §4.7 (breakpoint 표), §7.3 (`@media (max-width: 639px)`), §7.6 정량 표, §7.8 CSS | `< 640px` → `--text-score-sm` (4rem), card padding 축소 | ✓ |

### 11.2 AC §2 — fast mode self-critique 강화 / AC 매핑 표 의무 포함

| 요구사항 | 본 명세 위치 | ✓ |
|---|---|---|
| AC 매핑 표 명세 끝에 의무 포함 | **§11 본 표 자체** (§11.1 / §11.2 / §11.3 세 분할) | ✓ |
| Epic 의 디자인 요구 각 항목 → 명세 내 위치 매핑 | §11.1 의 9개 행이 AC §1 의 모든 sub-item 을 cross-reference | ✓ |
| reviewer-design 부재 보완 — designer self-critique 강화 | §12 Self-critique (8 항목 체크리스트 + 8 추가 자체 점검) | ✓ |

### 11.3 AC §3 — file:// 직접 열기 제약 (ES module / fetch / 외부 CDN 금지)

| 제약 항목 | 본 명세 위치 | 채택 정책 | ✓ |
|---|---|---|---|
| ES module 사용 금지 | §1.3 (비목표), §6.7, §7.2 (`<script src="./main.js">` non-module), §7.7 (IIFE), §9.4 | `<script type="module">` 사용 X — pomodoro 패턴 복제 | ✓ |
| fetch 호출 금지 | §6.7, §9.4 | `fetch()` 미사용 — 모든 상태 in-memory | ✓ |
| 외부 CDN 금지 | §1.3, §6.7, §9.4 | `<link href="https://...">` / `@import url(...)` 미사용 — 시스템 폰트 스택만 | ✓ |
| inline `<script>` 또는 non-module `<script src>` 만 허용 | §6.7, §7.2 (head 인라인 + `<script src="./main.js">`), §9.4 | head 인라인 (다크 init) + non-module src (main.js) | ✓ |
| mockup HTML 도 동일 제약 | §10 (mockup 패널 구성 + "단일 self-contained HTML 외부 의존성 0건") | mockup 도 외부 의존성 0 — 더블클릭 동작 | ✓ |
| dev 산출물도 동일 제약 | §7.1 ~ §7.8, §9.4 | clicker/index.html · main.js 모두 file:// 안전 | ✓ |

### 11.4 종합 AC 충족 표

| AC 번호 | 핵심 요구 | 충족 | 비고 |
|---|---|---|---|
| AC §1 | 디자인 요구사항 8 sub-item (다크 토큰·라이트 페어·원형 버튼·typo·애니메이션·반응형) | ✓ | §11.1 의 9 행 모두 cross-reference |
| AC §2 | AC 매핑 표 의무 포함 + self-critique 강화 | ✓ | §11 본 표 + §12 |
| AC §3 | file:// 안전 (module/fetch/CDN 금지) | ✓ | §11.3 의 6 항목 + §10 mockup 동일 |

**누락된 AC 0건.**

---

## 12. Self-critique (fast mode 강화)

> fast mode 이므로 reviewer-design 단계가 없습니다. 본 섹션은 designer 가 의무적으로 작성하는 자가 검증 체크리스트입니다. 각 항목 ✓ / ⚠️ / ✗ + 1줄 사유.

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 (fast mode 의무) | ✓ | §11 에 AC §1 / §2 / §3 세 분할 표 + 종합 표. 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·14단계 구현 순서·§7.6 정량 일치 표·§7.7 main.js 골격·§7.8 score CSS 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (notepad/timer/stopwatch/pomodoro 5 페이지), §9.2 복제 대상 (head 인라인 다크 init / non-module script / `<header>` / `:root` / `.btn` base / kbd-hint), §9.3 신규, §9.4 file:// 정책 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 도입 시 매핑 (원형 사이즈는 custom className override 필요 명시) |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 3 건 |
| file:// 안전 정책 | ✓ | §6.7 + §9.4 + §11.3 — 3 곳에서 cross-reference. mockup 도 동일 (§10) |
| 다크 default 정책 | ✓ | §6.5 + §7.2 head 인라인 init + §7.3 `:root` 다크 / `[data-theme="light"]` override |
| 접근성 (a11y) | ✓ | §7.5 — `prefers-reduced-motion`, focus-visible, aria-label, 색 대비 검증 |

추가 자체 점검:

- **비범위 명시**: §1.3 에 localStorage 점수 저장 / 사운드 / 업적 / CPS 통계 / 외부 폰트 / ES module 6개 explicit 제외 ✓
- **정량 일치 가능성**: §7.6 표가 desktop / mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **Space/R/T 충돌**: §6.2 에 현 페이지 input 없음 → 충돌 없음 명시. 대문자/소문자 모두 인식 명시. Space 는 focus 가 버튼에 있을 때 브라우저 기본 우선 (전역 핸들러 skip) — 중복 클릭 회피 ✓
- **마우스 vs 키보드 press 시각 동기**: §6.3 + §4.4 `.is-pressed` 클래스로 키보드 트리거 시에도 150ms scale 동기 ✓
- **iOS 터치 hihglight**: §4.4 `-webkit-tap-highlight-color: transparent` 명시 ✓
- **touch-action**: §5.2 `touch-action: manipulation` 명시 (더블 탭 zoom 방지) ✓
- **WCAG 색 대비**: §7.5 에 다크 / 라이트 모두 AA 충족 산정 (accent on text 12:1, 6:1) ✓
- **reduced-motion 가드**: §7.5 에 explicit `@media (prefers-reduced-motion: reduce)` 블록 명시 ✓
- **fast mode 정책 명시**: §0 + §11 헤더 + §12 헤더에서 fast mode 임을 3번 강조 → 후속 dev / 운영자가 이 명세의 검토 단계 차이를 인지 ✓
- **mockup 시각 검증**: §10 에 4 가지 패널 (다크 0 / 다크 42 / 다크 999 / 라이트 7) + 클릭 버튼 4 상태 + mobile 미리보기 → 시각 검증 6 케이스 보장 ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §2 / §4 만 수정):

1. **점수 1+ 도달 시 일시 강조 색 (accent fade)** — 현재 default 는 점수 변동 시 220ms 동안 `--color-score-accent` 적용 후 primary 로 복귀 (§5.1 옵션). 시각 피드백 강화 효과 vs 정보 과잉 우려. **권장: 옵션 적용** (mockup 은 정적 primary 색만 표현) — 후속 사용자 테스트로 조정.
2. **`Space` 전역 트리거 정책** — 현재 default 는 focus 가 버튼에 있지 않을 때만 전역 핸들러가 클릭 트리거 (§6.2). 일부 게임 사용자는 Space 누름 = 클릭이라 명시적 focus 가 필요한 동작에 혼란 가능. **권장: v1 은 전역 트리거 채택** (게임 성격상 빠른 입력이 UX 핵심) + 필요 시 후속 옵션화.
3. **점수 최대값 / 자릿수 cap** — 현재 default 는 cap 없음, 7 자리 (~10M) 까지 정상 표시 가정 (§4.3). 자릿수가 score 박스 폭을 초과하면 레이아웃 깨질 수 있으나 현실적 도달 확률 낮음. **권장: v1 은 cap 없음** + 7 자리 도달 시 자동 축약 (예: `1.2M`) 은 후속 Epic 분리.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
