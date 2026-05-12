# 스톱워치 SPA 디자인 명세 (BF-415)

> 관련 task: BF-416 (designer)
> mockup: [`docs/design/mockups/stopwatch-BF-415.html`](mockups/stopwatch-BF-415.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `stopwatch/index.html` (또는 동급 URL 진입점 `/stopwatch`)
- 단일 카드 중심 레이아웃: **대형 display(mm:ss.xx) → 4 개 컨트롤 버튼(시작·정지·랩·리셋) → 랩 리스트 카드**
- vanilla HTML/CSS/JS 기반 (현 프로젝트 `shadcn/ui` 미도입 — notepad-BF-400 · timer-BF-405 와 토큰 시스템 공유)

### 1.2 사용자 경험 목표
- **밀리초까지 한 눈에**: large display 의 mm:ss.xx 가 화면 시각 중심. 1/100 초 자릿수는 분/초보다 가볍게 표현 (시각 안정감).
- **즉시 시작·정지·랩·리셋**: 4 개 버튼 한 줄 배치, 상태에 따라 enable/disable 만 토글 (라벨 변형 없이 의미 일관성 유지).
- **랩 기록 누적 가시화**: 카드 아래 랩 리스트가 누적·차이를 분리 표기. 가장 최근 랩이 상단(역순 정렬), 최단/최장 랩 색 강조.
- **빈 상태(0:00.00) 가 idle 시작점**: 카운트업이므로 입력 영역 없음. display 자체가 entry point.
- **키보드 단축**: `Space` 시작/정지 토글, `L` 랩, `R` 리셋 (Esc 는 timer 와 호환되도록 보조 리셋).

### 1.3 비목표 (Out of Scope)
- **다중 스톱워치 동시 실행** (v1 은 단일 인스턴스만)
- **랩 export / 공유** (CSV·이미지 저장 — 후속 Epic)
- **랩 무제한 누적 가상 스크롤** (v1 은 최대 200 개로 cap, 초과 시 가장 오래된 항목부터 dim 표시)
- **사운드 / 진동 / 알림 API** (시각 표시만)
- **시·일 단위 카운트업** — v1 은 `99:59.99` 까지(약 100 분). 초과 시 display 는 99:59.99 로 고정 + 경고 라벨.
- **카운트다운(타이머) 모드 통합** — 별도 페이지(`/timer`, BF-405) 와 분리 유지

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/notepad-BF-400.md §2` + `docs/design/timer-BF-405.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth 유지). 스톱워치에만 필요한 토큰만 추가/확장.

### 2.1 색상 토큰 (재사용 — notepad/timer 공유)

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드 표면 (stopwatch card · lap list card) |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 버튼 hover / 랩 row hover bg |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 카드 구분선·랩 row 구분선 |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | 버튼 outline (ghost) |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | display·랩 누적 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | label·랩 번호·랩 차이 |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | placeholder·빈 상태 (랩 리스트 empty hint) |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action (시작)·focus ring |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | 리셋 (destructive)·max-cap 경고 |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 스톱워치 전용 추가 토큰

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-stopwatch-running` | `#1F8A5C` | `#3AAE7A` | running 상태 display 색 (선택적 강조 — §13 운영자 결정) |
| `--color-stopwatch-stopped` | `#B7791F` | `#D4A23A` | stopped(=paused) 상태 display 색 (선택적 강조) |
| `--color-lap-fastest-bg` | `#E8F6EE` | `#1F3A2A` | 최단 랩 row 배경 |
| `--color-lap-fastest-text` | `#1F8A5C` | `#5DCB94` | 최단 랩 row 차이 텍스트 |
| `--color-lap-slowest-bg` | `#FBEEEE` | `#3A2326` | 최장 랩 row 배경 |
| `--color-lap-slowest-text` | `#9A2A2A` | `#FCB7B7` | 최장 랩 row 차이 텍스트 |
| `--color-lap-row-bg` | `#FFFFFF` | `#171A21` | 일반 랩 row 배경 (= `--color-bg-surface` 와 동일 alias) |

> running / stopped 색은 **선택적 강조** 입니다. v1 default 는 `--color-text-primary` 유지. 운영자 컨펌(§13) 시 활성. mockup 은 default(primary) + 최단/최장 랩 색 강조 모두 적용.

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
| `--radius-sm` | `4px` (랩 row hover hint) |
| `--radius-md` | `8px` (button · lap row corner) |
| `--radius-lg` | `12px` (stopwatch card · lap list card) |
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
| **display-stopwatch mm:ss (desktop)** | **`128px` / `8rem`** | `300` | `1` | `-0.02em` | `--text-display` |
| **display-stopwatch mm:ss (≤959px)** | **`96px` / `6rem`** | `300` | `1` | `-0.02em` | `--text-display-md` |
| **display-stopwatch mm:ss (≤639px)** | **`72px` / `4.5rem`** | `300` | `1` | `-0.02em` | `--text-display-sm` |
| **display-stopwatch .xx (1/100 — desktop)** | **`72px`** | `300` | `1` | `-0.02em` | `--text-display-frac` |
| **display-stopwatch .xx (≤959px)** | `56px` | `300` | `1` | `-0.02em` | `--text-display-frac-md` |
| **display-stopwatch .xx (≤639px)** | `40px` | `300` | `1` | `-0.02em` | `--text-display-frac-sm` |
| section-heading (랩 리스트) | `16px` | `600` | `1.3` | `0` | `--text-h2` |
| lap-number | `13px` | `500` | `1.4` | `0` | `--text-lap-num` |
| **lap-cumulative (mm:ss.xx)** | `18px` | `500` | `1` | `0` | `--text-lap-time` |
| **lap-delta (+mm:ss.xx)** | `14px` | `400` | `1.4` | `0` | `--text-lap-delta` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |
| **button-primary-lg** (시작/정지) | `16px` | `600` | `1` | `0` | `--text-button-lg` |
| **button-secondary-lg** (랩/리셋) | `15px` | `500` | `1` | `0` | `--text-button-md` |

display 와 랩 시간은 **`--font-mono`** + `font-variant-numeric: tabular-nums` 적용 — 자릿수 변동 시 가로폭 흔들림 방지. 분/초(mm:ss) 와 1/100 초(.xx) 의 크기 차이로 시각 위계 부여 (.xx 는 약 60 % 크기).

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar · "스톱워치"                                  [🌙]    │  56px
├──────────────────────────────────────────────────────────────┤
│                                                              │
│           ┌───────────────────────────────────────┐          │
│           │                                       │          │
│           │         00 : 24 . 73                  │ display  │
│           │         ──┬──   ─┬─                   │ (128/72) │
│           │           │      └─ 1/100 (작게)       │          │
│           │           └────── mm:ss (크게)         │          │
│           │                                       │          │
│           │   [▶ 시작]  [⏸ 정지]  [⚑ 랩]  [⟲ 리셋] │ controls │
│           │                                       │          │
│           └───────────────────────────────────────┘          │
│                                                              │
│           ┌───────────────────────────────────────┐          │
│           │  랩 (4)                               │          │
│           │  ───────────────────────────────────  │          │
│           │  #4   00:24.73    +00:05.12  ← 최장   │          │
│           │  #3   00:19.61    +00:04.30           │          │
│           │  #2   00:15.31    +00:03.10  ← 최단   │          │
│           │  #1   00:12.21    +00:12.21           │          │
│           └───────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 720px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- stopwatch card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-7) var(--space-6)`
- card ↔ lap list 사이: `margin-top: var(--space-5)`
- display 와 controls 는 `flex column`, `align-items: center`, `gap: var(--space-6)` (display ↔ controls)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "스톱워치" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (notepad / timer 와 동일 패턴, §9 참조)

### 4.3 large display (mm:ss.xx)

```
   ┌─────────────────────────────────────────┐
   │   ┌─────────────┐    ┌──────────┐        │
   │   │   00 : 24   │    │   .  73  │        │
   │   │   (128px)   │    │   (72px) │        │
   │   └─────────────┘    └──────────┘        │
   │   ▲                  ▲                   │
   │   tabular-nums      tabular-nums (작게)  │
   └─────────────────────────────────────────┘
```

- 컨테이너: `display: flex`, `align-items: baseline`, `justify-content: center`, `gap: var(--space-2)` (mm:ss ↔ .xx)
- mm:ss 영역: `--text-display`, `--font-mono`, `font-variant-numeric: tabular-nums`, `color: --color-text-primary`
- .xx 영역: `--text-display-frac`, `--font-mono`, `font-variant-numeric: tabular-nums`, `color: --color-text-secondary` (시각 위계 약화)
- `.` (소수점): `color: --color-text-muted`, `padding: 0 var(--space-1)`
- 색 상태:
  - `idle` (값 0:00.00): mm:ss 색 `--color-text-muted` (회색) — "빈 상태" 표현, .xx 도 동일 muted
  - `idle` (값 > 0, 정지 상태): mm:ss `--color-text-primary`, .xx `--color-text-secondary`
  - `running`: mm:ss `--color-text-primary` (default — 운영자 결정 시 `--color-stopwatch-running`)
  - `stopped` (정지 = paused): mm:ss `--color-text-primary` (default — 운영자 결정 시 `--color-stopwatch-stopped`)
- 형식: `MM:SS.XX` 항상 2자리 zero-pad. 100 분 이상은 v1 비범위 → 최대 `99:59.99` 도달 시 자동 정지(state `stopped` + 경고 라벨).
- 매 tick (`requestAnimationFrame`) 으로 .xx 자릿수 갱신 — 60Hz 디스플레이에서 약 16ms 간격, 시각적으로 부드러운 흐름.
- 0.01 초 정밀도 표시이지만 내부 측정은 `performance.now()` 의 ms 정밀도 (drift 방지).

### 4.4 컨트롤 버튼 영역 (4 개)

| 상태 | 1번 (Primary) | 2번 | 3번 | 4번 |
|---|---|---|---|---|
| `idle` (0:00.00) | `[▶ 시작]` primary-lg enabled | `[⏸ 정지]` secondary-lg disabled | `[⚑ 랩]` secondary-lg disabled | `[⟲ 리셋]` ghost-lg disabled |
| `running` | `[▶ 시작]` primary-lg disabled | `[⏸ 정지]` secondary-lg enabled | `[⚑ 랩]` secondary-lg enabled | `[⟲ 리셋]` ghost-lg disabled |
| `stopped` (값 > 0) | `[▶ 시작]` primary-lg enabled (재개) | `[⏸ 정지]` secondary-lg disabled | `[⚑ 랩]` secondary-lg disabled | `[⟲ 리셋]` ghost-lg enabled |
| `max-cap` (99:59.99 도달) | `[▶ 시작]` primary-lg disabled | `[⏸ 정지]` secondary-lg disabled | `[⚑ 랩]` secondary-lg disabled | `[⟲ 리셋]` ghost-lg enabled |

> **버튼 라벨 변형 없음**: 의미 일관성 유지를 위해 라벨은 4 종 고정. `running` 중 `[▶ 시작]` 은 disabled 로 시각 표현만 변화. (timer 와 달리 stopwatch 는 카운트업이므로 "재개" 라벨 분기를 두지 않고 동일 라벨 사용.)

- 4 개 버튼 가로 배치, `flex`, `gap: var(--space-3)`, `flex-wrap: wrap` (mobile 시 줄바꿈)
- primary-lg (시작): `height: 56px`, `min-width: 140px`, `padding: 0 var(--space-5)`, `font: --text-button-lg`, `border-radius: --radius-md`, `background: --color-accent`, `color: white`
- secondary-lg (정지·랩): `height: 56px`, `min-width: 100px`, `padding: 0 var(--space-4)`, `font: --text-button-md`, `border-radius: --radius-md`, `border: 1px solid --color-border-strong`, `background: --color-bg-surface`, `color: --color-text-primary`
- ghost-lg (리셋): `height: 56px`, `min-width: 100px`, `padding: 0 var(--space-4)`, `font: --text-button-md`, `color: --color-text-secondary`, `background: transparent`, no border. hover 시 `color: --color-danger`, `background: --color-bg-subtle`.
- disabled 상태: `opacity: 0.4`, `cursor: not-allowed`, hover effect 비활성
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`

### 4.5 랩 리스트 카드 (lap list card)

```
┌────────────────────────────────────────────────────┐
│  랩 (4)                                            │  header
├────────────────────────────────────────────────────┤
│  #4    00:24.73         +00:05.12        최장      │  row (slowest highlight)
├────────────────────────────────────────────────────┤
│  #3    00:19.61         +00:04.30                  │  row
├────────────────────────────────────────────────────┤
│  #2    00:15.31         +00:03.10        최단      │  row (fastest highlight)
├────────────────────────────────────────────────────┤
│  #1    00:12.21         +00:12.21                  │  row
└────────────────────────────────────────────────────┘
```

- 카드 컨테이너: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: 0` (내부 row 가 padding 담당)
- 카드 헤더: `padding: var(--space-4) var(--space-5)`, `border-bottom: 1px solid --color-border-default`, 좌측 "랩 (n)" (`--text-h2`), 우측 (옵션) `[지우기]` ghost button (`--text-caption`, lap 0 일 때 hidden)
- 빈 상태 (lap 0 개): 카드 자체 hidden. 또는 헤더만 있는 카드 + 본문 "아직 기록된 랩이 없습니다 — 실행 중 ⚑ 랩 버튼을 눌러 보세요." (`--text-caption`, `--color-text-muted`, `padding: var(--space-5)`)
- row 구조 (grid):
  - `display: grid`, `grid-template-columns: 60px 1fr 1fr 80px`, `align-items: center`, `padding: var(--space-3) var(--space-5)`, `border-bottom: 1px solid --color-border-default` (마지막 row 는 border-bottom 없음)
  - 컬럼 1: 랩 번호 `#n` (`--text-lap-num`, `--color-text-secondary`, `text-align: left`)
  - 컬럼 2: 누적 시간 `mm:ss.xx` (`--text-lap-time`, `--color-text-primary`, `--font-mono`, `tabular-nums`, `text-align: left`)
  - 컬럼 3: 랩 차이 `+mm:ss.xx` (직전 랩 대비 경과 — 첫 랩은 `+0:00.00` 부터 카운트한 값과 동일) (`--text-lap-delta`, `--color-text-secondary`, `--font-mono`, `tabular-nums`, `text-align: left`)
  - 컬럼 4: 라벨 (선택) — "최단" / "최장" (`--text-caption`, weight `500`, 색은 §2.2 의 fastest/slowest text 토큰)
- 최단 랩 row: 배경 `--color-lap-fastest-bg`, 컬럼 3 텍스트 `--color-lap-fastest-text`, 컬럼 4 라벨 "최단" 표시
- 최장 랩 row: 배경 `--color-lap-slowest-bg`, 컬럼 3 텍스트 `--color-lap-slowest-text`, 컬럼 4 라벨 "최장" 표시
- 일반 랩 row: 배경 `--color-lap-row-bg` (= surface), 컬럼 4 비어 있음
- **정렬**: 가장 최근 랩이 **상단** (역순 — 시간 순으로는 #1 이 가장 오래 전, 표시 순으로는 #n 부터 #1 까지)
- **최단/최장 강조 조건**: 랩이 **2 개 이상** 일 때만 강조 표시. 1 개일 때는 비교 대상 없으므로 라벨 X.
- row hover: `background: --color-bg-subtle` (단, fastest/slowest row 는 hover 시에도 자체 배경 유지 — 강조 우선)
- 키보드 포커스 대상 아님 (정적 데이터 row). 단, `[지우기]` 헤더 버튼은 포커스 가능.
- 최대 200 개 cap — 초과 시 가장 오래된 (#1) row 부터 `opacity: 0.5` dim 처리하고 상단에 "최대 200 개까지 표시됩니다" 캡션. v1 은 cap 도달 가능성 낮음 (99:59.99 까지 200 랩이면 30 초/랩 평균 페이스 이상 필요).

### 4.6 빈 상태 (0:00.00)

- state `idle` 이고 경과 시간 0 (=초기 진입)
- display 텍스트 `00:00.00`, mm:ss 색 `--color-text-muted`, .xx 색 `--color-text-muted` ("비어있음" 시각화)
- 4 개 버튼: 시작만 enabled, 나머지 모두 disabled
- 랩 리스트 카드: hidden (또는 빈 상태 hint 카드만 표시 — §4.5 빈 상태 분기)
- 하단 키보드 단축키 힌트만 표시: "`Space` 시작/정지 · `L` 랩 · `R` 리셋"

### 4.7 반응형 Breakpoint

| breakpoint | display mm:ss | display .xx | card width | controls | lap list |
|---|---|---|---|---|---|
| **`≥ 960px`** (desktop) | `--text-display` (128px) | `--text-display-frac` (72px) | max-width `720px`, padding `--space-7 --space-6` | 한 줄, primary min-width 140px | grid `60px 1fr 1fr 80px`, 카드 padding `var(--space-3) var(--space-5)` |
| **`640px – 959px`** (tablet) | `--text-display-md` (96px) | `--text-display-frac-md` (56px) | max-width `560px`, padding `--space-6 --space-5` | 한 줄, primary min-width 120px, secondary/ghost min-width 88px | grid `52px 1fr 1fr 64px`, 카드 padding `var(--space-3) var(--space-4)` |
| **`< 640px`** (mobile) | `--text-display-sm` (72px) | `--text-display-frac-sm` (40px) | max-width `100%`, margin `var(--space-4)`, padding `var(--space-5) var(--space-4)` | **2 × 2 그리드** (`grid-template-columns: 1fr 1fr`, `gap: var(--space-3)`), 각 버튼 `width: 100%; min-width: auto` | grid `44px 1fr 1fr` (컬럼 4 라벨 제거, 컬럼 3 옆에 inline tag 표시), 카드 padding `var(--space-3) var(--space-4)` |
| **`< 360px`** (XS) | `font-size: 64px` 추가 축소 | `font-size: 32px` 추가 축소 | (mobile 과 동일) | (mobile 과 동일) | (mobile 과 동일) |

mobile 시 4 버튼 배치:
```
┌──────────┬──────────┐
│ ▶ 시작   │ ⏸ 정지   │
├──────────┼──────────┤
│ ⚑ 랩     │ ⟲ 리셋    │
└──────────┴──────────┘
```

mobile 시 랩 row 컬럼 4 "최단/최장" 라벨은 컬럼 3 옆 inline tag (`font-size: 11px`, `padding: 2px 6px`, `border-radius: --radius-sm`, 배경은 fastest/slowest bg 토큰 적용한 chip 형태) 로 축소:
```
#4   00:24.73   +00:05.12 [최장]
```

---

## 5. 컴포넌트 명세

### 5.1 `<StopwatchDisplay>` (large mm:ss.xx)
props:
- `elapsedMs: number` (0 ~ 5_999_999 = 99:59.99)
- `state: "idle" | "running" | "stopped" | "max-cap"`

표시 변환:
- `mm = Math.floor(elapsedMs / 60000)` (clamp 0–99)
- `ss = Math.floor((elapsedMs % 60000) / 1000)` (clamp 0–59)
- `xx = Math.floor((elapsedMs % 1000) / 10)` (clamp 0–99, 1/100 초)
- 표시: `${pad2(mm)}:${pad2(ss)}.${pad2(xx)}`

상태별 시각:
- `idle` 값 0: 전체 `--color-text-muted`, weight `300`
- `idle` 값 > 0 (정지 직후): mm:ss `--color-text-primary`, .xx `--color-text-secondary`
- `running` / `stopped`: mm:ss `--color-text-primary` (default — §13), .xx `--color-text-secondary`
- `max-cap`: mm:ss `--color-danger`, .xx `--color-danger` opacity 0.7, 좌측 inline tag `[최대]` (`--text-caption`, `--color-danger`)

aria:
- `role="timer" aria-live="off"` (running 중 매 frame 갱신을 SR 가 읽지 않도록)
- 정지 시 별도 `<div role="status" aria-live="polite">` 가 "현재 기록 mm:ss.xx 에서 정지됨" 알림 (1 회만)
- 랩 추가 시 별도 `<div role="status" aria-live="polite">` 가 "랩 n 기록 mm:ss.xx" 알림

### 5.2 `<ControlButtons>` (시작·정지·랩·리셋)
props:
- `state: "idle" | "running" | "stopped" | "max-cap"`
- `hasLaps: boolean`
- `onStart()`, `onStop()`, `onLap()`, `onReset()`

활성/비활성 매트릭스: §4.4 표 참조.

리셋 동작:
- `stopped` 에서 누르면 → display `00:00.00` 복귀 + lap list 전체 clear (확인 modal 없음 — UX 마찰 최소화)
- `idle` 에서는 disabled (이미 0 이므로 클릭 자체 불가)
- **랩이 1 개 이상 있을 때 리셋 hover** 시 텍스트 색 `--color-danger` 로 강조 (실수 방지 시각 신호)

랩 동작:
- `running` 중에만 enabled
- 클릭 시 현재 `elapsedMs` 를 즉시 랩 배열에 push, 차이는 `elapsedMs - previousLapMs` (첫 랩은 `elapsedMs - 0`)
- 랩 리스트 상단에 새 row append + 스크롤 자동 이동 (랩 리스트 컨테이너가 scrollable 일 때만)
- 키보드 단축 `L`

### 5.3 `<LapList>` (랩 카드 + row)
props:
- `laps: Array<{ index: number; cumulativeMs: number; deltaMs: number }>`
- `onClear()` (옵션 — `[지우기]` 헤더 버튼 클릭 시)

명세:
- §4.5 참조
- 최단/최장 산정: `Math.min(...deltaMs)` / `Math.max(...deltaMs)`. tie 발생 시 가장 최근(높은 index) 랩 우선.
- 랩 0 개: 카드 자체 hidden (또는 empty state hint 카드)
- 랩 1 개: 최단/최장 라벨 모두 X (비교 대상 없음)
- 랩 2 개 이상: 최단/최장 라벨 각각 1 row 에만 표시 (동일 row 가 최단·최장 동시일 수 없는 케이스 — laps.length === 2 일 때는 둘 중 하나만 최단, 다른 하나는 최장으로 표시. 동률이면 둘 다 라벨 표시 X)
- 200 개 cap: §4.5 마지막 항목 참조

aria:
- `<ol aria-label="랩 기록 목록">` + `<li>` 의 row 구조
- 각 row 에 `aria-label="랩 {index}, 누적 {mm:ss.xx}, 직전 대비 +{mm:ss.xx}{최단|최장|}"` 종합 라벨
- 새 랩 추가 시 `<div role="status" aria-live="polite">` 가 별도 알림 (§5.1)

### 5.4 `<KbdHint>` (키보드 단축키 힌트)
- 단일 `<p>` 라인, 카드 또는 lap list 하단 노출
- `--text-caption`, `--color-text-muted`, 가운데 정렬
- 내용: `<kbd>Space</kbd> 시작/정지 · <kbd>L</kbd> 랩 · <kbd>R</kbd> 리셋`
- `<kbd>` 태그 스타일: `background: --color-bg-subtle`, `border: 1px solid --color-border-default`, `border-radius: --radius-sm`, `padding: 1px 6px`, `font-family: --font-mono`, `font-size: 11px`

### 5.5 `<EmptyLapState>` (랩 0 개)
- 별도 컴포넌트가 아닌 lap list card 의 분기 콘텐츠 (§4.5 빈 상태)
- 또는 v1 은 lap list 카드 자체를 hidden 처리 (선택 — mockup 은 lap > 0 케이스만 보여줌)

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

```
        ┌────────────────────────┐
        │     idle (0:00.00)     │◄──────┐
        └───────────┬────────────┘       │
            시작  │                      │ 리셋
                  ▼                      │
        ┌────────────────────────┐       │
   ┌────┤       running          ├───────┤
   │    └───────────┬────────────┘       │
   │ 정지          │ 99:59.99 도달        │
   │                ▼                    │
   │    ┌────────────────────────┐       │
   └────►       stopped          ├───────┤
        └───────────┬────────────┘       │
            시작  │                      │
                  ▼                      │
              (running 재개)              │
                                         │
        ┌────────────────────────┐       │
        │       max-cap          ├───────┘
        └────────────────────────┘
        (자동 정지 · 리셋만 가능)

    랩 (running 중만): running → running (display 유지, lap 배열 push)
```

전이 규칙:
- `idle → running`: 시작 버튼, 또는 Space
- `running → stopped`: 정지 버튼, 또는 Space
- `running → running` (lap 만 push): 랩 버튼, 또는 L
- `stopped → running`: 시작 버튼 (재개), 또는 Space (값 유지된 채 이어서 카운트업)
- `stopped → idle`: 리셋 버튼, 또는 R, 또는 Esc (랩 배열도 모두 clear)
- `running → max-cap`: `elapsedMs >= 5_999_999` 도달 시 자동 (display 99:59.99 고정)
- `max-cap → idle`: 리셋 버튼만 (Space/L 비활성)

### 6.2 키보드 포커스 / 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar 토글 → 시작 → 정지 → 랩 → 리셋 → (랩 카드 헤더 `[지우기]`) 순환 | 전역 |
| `Space` | 시작 ↔ 정지 토글 (현재 상태에 따라 적절한 액션) | input 외 focus 시 (현 페이지엔 input 없음 — 전역) |
| `L` / `l` | 랩 추가 (running 중에만) | 전역. running 외 상태에서는 no-op |
| `R` / `r` | 리셋 (stopped 또는 max-cap 일 때만) | 전역. idle/running 에서는 no-op |
| `Esc` | 리셋 (R 보조 단축 — timer SPA 와 일관성 유지) | 전역. idle 에서는 no-op |
| `Enter` | 현재 focused 버튼 클릭 | 버튼 focus 시 (브라우저 기본) |

**focus-visible 표시**: 모든 interactive 요소는 `:focus-visible` 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. 마우스 클릭 focus 에서는 outline 노출 X (`:focus` 단독 X).

**`L` / `R` 단축 키 충돌**: 현 페이지에 텍스트 input 이 없으므로 충돌 없음. 단, **topbar 의 다크 토글 버튼이 focus 일 때** Space/Enter 가 토글 동작 우선 — 이건 의도된 브라우저 기본 (focus 우선). 사용자가 단축키로 시작/정지/랩/리셋 하려면 카드 영역 어딘가에 focus 가 있거나 focus 가 없는 상태여야 함. 키보드 hint 라인에 `<kbd>Space</kbd> 시작/정지 · <kbd>L</kbd> 랩 · <kbd>R</kbd> 리셋` 표기.

**대문자/소문자**: `L`/`l`, `R`/`r` 모두 인식 (`event.key.toLowerCase()` 비교). Caps Lock 사용자 친화.

### 6.3 매 tick 갱신 (running 중)
- `requestAnimationFrame` 기반 `performance.now()` drift-correction
  - `startTimestamp = performance.now() - baseElapsedMs` (재개 시 누적값 보정)
  - 매 frame: `elapsedMs = performance.now() - startTimestamp` 계산 후 display textContent 갱신
- mm:ss 자리는 1 초 단위로만 시각 변동, .xx 자리는 매 frame 갱신 — 시각 부드러움
- DOM 갱신 최소화: mm/ss/xx 각각 별도 `<span>` 으로 분리, 변경된 부분만 textContent 교체 (전체 innerHTML 재구성 X)
- 탭 백그라운드 (`document.visibilityState === "hidden"`) 시 `requestAnimationFrame` 자동 일시정지되지만 `performance.now()` 는 계속 흐름 → 복귀 시 정확한 값으로 즉시 동기. (이게 setInterval 대비 강점)

### 6.4 랩 추가 인터랙션 흐름
1. running 중 `[⚑ 랩]` 또는 `L` 키
2. 현재 `elapsedMs` 즉시 capture (rAF tick 과 별개 — 클릭 이벤트 시점 정확도 우선)
3. lap 배열에 `{ index: laps.length + 1, cumulativeMs: elapsedMs, deltaMs: elapsedMs - (laps[0]?.cumulativeMs ?? 0) }` push
   - 정확히는 직전 lap 의 cumulativeMs 와 비교: `deltaMs = elapsedMs - previousLapCumulative`
4. lap 카드 상단(최신 row) 에 새 row prepend 애니메이션 (`fadeInDown 200ms ease`, `prefers-reduced-motion` 가드)
5. 2 개 이상 누적 시 최단/최장 재계산 + 라벨 갱신 (CSS 클래스 토글)
6. `aria-live="polite"` SR 알림: "랩 n 기록 mm:ss.xx"

### 6.5 정지 → 재개 흐름
1. `running` 중 `[⏸ 정지]` 또는 Space
2. `elapsedMs` 고정 (rAF 중단)
3. state `stopped`. 시작 버튼 enabled, 리셋 enabled, 랩 disabled.
4. 다시 `[▶ 시작]` 또는 Space → state `running`, baseElapsedMs = 정지 시점 값, rAF 재시작
5. 재개 후에도 랩 배열은 유지 (clear 되지 않음). 새 랩의 cumulativeMs 는 재개 후 누적값 기준.

### 6.6 리셋 흐름
1. `stopped` 또는 `max-cap` 에서 `[⟲ 리셋]` 또는 R/Esc
2. `elapsedMs = 0`, state `idle`, lap 배열 `[]`
3. lap card hidden (또는 empty state)
4. 확인 modal **없음** — 의도된 즉시성. 랩이 많을 때 실수 우려는 §5.2 의 hover 색 강조로 완화.

### 6.7 다크 모드
- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad / timer SPA 와 동일) — 페이지 간 일관성 자동 유지
- 첫 로드 시 OS `prefers-color-scheme` 따라 초기화 (저장값 우선)

### 6.8 비저장 정책 (in-memory only)
- 새로고침 / 페이지 이탈 시 lap 배열·elapsedMs 모두 초기화 (state `idle`)
- localStorage 미사용 (`bf-theme` 제외)
- v1 은 단발성 사용. 후속 Epic 에서 "최근 세션 복원" 가능

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── stopwatch/
│   ├── index.html       # 스톱워치 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃 (timer/styles.css 의 :root 재활용 가능)
│   ├── main.js          # 상태 머신 + rAF tick loop + 이벤트
│   └── theme.js         # (옵션) bf-theme 초기화 — notepad/timer 와 공유 모듈화 가능
├── timer/               # 기존 타이머 SPA (보존)
├── notepad/             # 기존 메모장 SPA (보존)
└── docs/design/
    ├── stopwatch-BF-415.md            (본 문서)
    └── mockups/stopwatch-BF-415.html  (시각 mockup)
```

대안: 단일 디렉토리에 `stopwatch.html` 추가하고 styles/main.js 모두 prefix 로 충돌 방지. **v1 권장은 `stopwatch/` 하위 디렉토리** (timer / notepad 와 일관).

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>스톱워치</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">스톱워치</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <!-- 메인 카드: display + controls -->
      <section class="card" aria-label="스톱워치">
        <!-- large display -->
        <div class="display" id="display" role="timer" aria-live="off" aria-label="경과 시간">
          <span class="display__main">
            <span class="display__minutes" id="disp-m">00</span>
            <span class="display__colon" aria-hidden="true">:</span>
            <span class="display__seconds" id="disp-s">00</span>
          </span>
          <span class="display__frac">
            <span class="display__dot" aria-hidden="true">.</span>
            <span class="display__hundredths" id="disp-x">00</span>
          </span>
        </div>

        <!-- 4-button controls -->
        <div class="controls" id="controls">
          <button type="button" class="btn btn--primary-lg" id="btn-start">▶ 시작</button>
          <button type="button" class="btn btn--secondary-lg" id="btn-stop" disabled>⏸ 정지</button>
          <button type="button" class="btn btn--secondary-lg" id="btn-lap" disabled>⚑ 랩</button>
          <button type="button" class="btn btn--ghost-lg" id="btn-reset" disabled>⟲ 리셋</button>
        </div>

        <!-- keyboard hint -->
        <p class="kbd-hint">
          <kbd>Space</kbd> 시작/정지 · <kbd>L</kbd> 랩 · <kbd>R</kbd> 리셋
        </p>
      </section>

      <!-- lap list card (hidden 까지 laps.length === 0) -->
      <section class="lap-card" id="lap-card" aria-label="랩 기록" hidden>
        <header class="lap-card__header">
          <h2 class="lap-card__title">랩 (<span id="lap-count">0</span>)</h2>
          <button type="button" class="btn btn--ghost btn--sm" id="btn-clear-laps" hidden>지우기</button>
        </header>
        <ol class="lap-list" id="lap-list" aria-label="랩 기록 목록">
          <!-- li 가 동적 prepend -->
        </ol>
      </section>

      <!-- SR-only 알림 영역 -->
      <div id="sr-announce" class="sr-only" role="status" aria-live="polite"></div>
    </main>

    <script type="module" src="main.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치

`stopwatch/styles.css` 상단에 `:root` 블록 — **timer/styles.css 의 토큰 블록을 그대로 복사** + 본 명세의 §2.2(스톱워치 전용)·§3 type 토큰 추가:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color tokens (timer/notepad 와 공유 — §2.1) */
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
  --color-focus-ring: rgba(53,99,233,0.45);

  /* stopwatch 전용 (§2.2) */
  --color-stopwatch-running: #1F8A5C;
  --color-stopwatch-stopped: #B7791F;
  --color-lap-fastest-bg: #E8F6EE;
  --color-lap-fastest-text: #1F8A5C;
  --color-lap-slowest-bg: #FBEEEE;
  --color-lap-slowest-text: #9A2A2A;
  --color-lap-row-bg: var(--color-bg-surface);

  /* spacing / radius / shadow (§2.3, §2.4 — timer 와 동일) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-popover: 0 4px 12px rgba(0,0,0,0.10);

  /* typography (§3) */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-h2: 600 16px/1.3 var(--font-sans);
  --text-display: 300 128px/1 var(--font-mono);
  --text-display-md: 300 96px/1 var(--font-mono);
  --text-display-sm: 300 72px/1 var(--font-mono);
  --text-display-frac: 300 72px/1 var(--font-mono);
  --text-display-frac-md: 300 56px/1 var(--font-mono);
  --text-display-frac-sm: 300 40px/1 var(--font-mono);
  --text-lap-num: 500 13px/1.4 var(--font-sans);
  --text-lap-time: 500 18px/1 var(--font-mono);
  --text-lap-delta: 400 14px/1.4 var(--font-mono);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
  --text-button-lg: 600 16px/1 var(--font-sans);
  --text-button-md: 500 15px/1 var(--font-sans);
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
  --color-focus-ring: rgba(91,130,240,0.55);

  --color-stopwatch-running: #3AAE7A;
  --color-stopwatch-stopped: #D4A23A;
  --color-lap-fastest-bg: #1F3A2A;
  --color-lap-fastest-text: #5DCB94;
  --color-lap-slowest-bg: #3A2326;
  --color-lap-slowest-text: #FCB7B7;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.32);
}
```

### 7.4 단계별 구현 순서 (권장)

1. **7.2 골격 HTML 작성** + 빈 `styles.css` / `main.js`
2. **CSS 변수 + base reset** (timer 와 동일 — `*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **Topbar** (timer 와 동일 패턴, 다크 토글만 단독)
4. **Page + card 컨테이너** (max-width, padding, box-shadow)
5. **StopwatchDisplay** 정적 (`00:00.00` 텍스트 + font-mono + tabular-nums) — mm:ss 와 .xx 의 font-size 위계 확인
6. **ControlButtons** 4 종 — primary-lg / secondary-lg / ghost-lg variant, disabled 시각
7. **state machine** (`main.js`) — `{ state, elapsedMs, startTimestamp, laps[] }` 객체 + render() 함수
8. **start() / stop() / lap() / reset()** — `requestAnimationFrame` + `performance.now()` 기반 tick (drift 보정)
9. **lap list card 렌더링** — 동적 `<li>` prepend, 최단/최장 클래스 토글
10. **99:59.99 도달 → max-cap 전이** + 자동 정지 + display 색 변경
11. **키보드 단축키** (§6.2 표): `keydown` 전역 — Space/L/R/Esc
12. **반응형** — `@media (max-width: 959px)` / `@media (max-width: 639px)` / `@media (max-width: 359px)`
13. **다크 토글** — `theme.js` 분리 또는 main.js 내부, `localStorage["bf-theme"]` 공유

### 7.5 a11y 체크
- display: `role="timer" aria-live="off"` (매 frame 갱신을 SR 가 안 읽도록)
- 별도 `<div id="sr-announce" role="status" aria-live="polite" class="sr-only">` 가 정지·랩·리셋 시 짧은 텍스트 알림 (intrusive 하지 않게)
- 4 버튼: 각각 텍스트 라벨 + 아이콘 (아이콘은 텍스트 옆 정렬 — SR 가 텍스트로 인식)
- focus-visible only outline (`:focus` 단독 X)
- `prefers-reduced-motion: reduce` 시 lap row 추가 fade-in 애니메이션 비활성
- 키보드 hint 라인의 `<kbd>` 는 시각용 + SR 친화 (모노스페이스만 적용, 의미 변경 X)
- `sr-only` 클래스: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;` (표준 패턴)

### 7.6 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop) | 토큰 |
|---|---|---|
| stopwatch card max-width | `720px` | hardcoded |
| stopwatch card padding | `48px 32px` | `--space-7 --space-6` |
| lap card max-width | `720px` (메인 카드와 동일) | hardcoded |
| lap card margin-top | `24px` | `--space-5` |
| display mm:ss font (≥960px) | `300 128px/1 mono` | `--text-display` |
| display .xx font (≥960px) | `300 72px/1 mono` | `--text-display-frac` |
| display mm:ss / .xx 간격 | `8px` | `--space-2` |
| display ↔ controls gap | `32px` | `--space-6` |
| controls 버튼 간 gap | `12px` | `--space-3` |
| primary-lg button height | `56px` | hardcoded |
| primary-lg button min-width | `140px` | hardcoded |
| primary-lg button font | `600 16px/1` | `--text-button-lg` |
| secondary-lg button height | `56px` | hardcoded |
| secondary-lg button min-width | `100px` | hardcoded |
| secondary-lg button font | `500 15px/1` | `--text-button-md` |
| ghost-lg button height | `56px` | hardcoded |
| ghost-lg button min-width | `100px` | hardcoded |
| lap row grid (desktop) | `60px 1fr 1fr 80px` | hardcoded |
| lap row padding | `12px 24px` | `--space-3 --space-5` |
| lap row border-bottom | `1px solid` | `--color-border-default` |
| lap-time font | `500 18px/1 mono` | `--text-lap-time` |
| lap-delta font | `400 14px/1.4 mono` | `--text-lap-delta` |
| focus-ring outline | `2px solid` + `offset 2px` | `--color-focus-ring` |

### 7.7 mm:ss.xx 포맷 helper (권장 구현)

```js
function pad2(n) { return String(n).padStart(2, "0"); }
function formatStopwatchMs(ms) {
  const clamped = Math.max(0, Math.min(ms, 5_999_999));
  const mm = Math.floor(clamped / 60000);
  const ss = Math.floor((clamped % 60000) / 1000);
  const xx = Math.floor((clamped % 1000) / 10);
  return { mm: pad2(mm), ss: pad2(ss), xx: pad2(xx) };
}
```

호출 측은 `disp-m`, `disp-s`, `disp-x` 의 textContent 만 갱신 (전체 innerHTML 재구성 X — 매 frame 호출되므로 성능 중요).

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<StopwatchDisplay>` | vanilla — shadcn 미제공 (커스텀 unique) |
| `<ControlButtons>` 4 종 | `Button` (`size: lg`, `variant: default / secondary / ghost`) |
| `<LapList>` 카드 | `Card` (`<CardHeader>` + `<CardContent>`) + 내부 `<ul>` |
| `<LapList>` row | vanilla `<li>` — `Table` 도입 시 `TableRow` 매핑 가능 |
| `<KbdHint>` `<kbd>` | shadcn 미제공 — vanilla 유지 |
| 다크 토글 | vanilla (notepad / timer 와 공유 패턴) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`stopwatch/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/storage.js`, `timer/timer.js` — 본 작업과 무관, 변경 금지
- 기존 페이지들의 라우팅·링크 (만약 있다면)

### 9.2 신규 `stopwatch/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | timer/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | timer/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="light">` 패턴 | timer/index.html | **복제** | data-theme 속성 토큰 시스템 의존 |
| `<link rel="stylesheet" href="styles.css">` | timer/index.html | **복제 + 경로 수정** | stopwatch/styles.css 로 향함 |
| `<script type="module" src="main.js">` | timer/index.html | **복제 + 경로 수정** | stopwatch/main.js |
| `<header class="topbar">` 구조 | timer/index.html | **복제 (라벨 변경)** | 제목만 "타이머" → "스톱워치", `[🌙]` 다크 토글 유지. timer 의 입력 input 영역은 미포함 |
| `:root` CSS 변수 블록 | timer/styles.css | **복제** + §2.2 추가 토큰 append | single source of truth: 본 명세 |
| `bf-theme` localStorage 초기화 로직 | timer/main.js (또는 함께 작성된 theme init) | **복제** 또는 **공유 모듈화** | `theme.js` 로 분리 후 양쪽 import 권장. v1 은 단순 복붙 OK |
| reset / base body 스타일 (`*{box-sizing}`, `body{margin:0;...}`) | timer/styles.css | **복제** | 모든 페이지 공통 |
| `.btn` 기본 스타일 (timer 의 `.btn`, `.btn--ghost` 등 base 클래스) | timer/styles.css | **복제** | timer 가 정의한 ghost button 패턴 재사용. `.btn--primary-lg`, `.btn--ghost-lg` 도 그대로 적용 가능. `.btn--secondary-lg` 만 본 명세에서 신규 정의 |

### 9.3 추가/수정해야 할 부분 (stopwatch 전용)

- stopwatch card / display / 4-button controls / lap card / lap row 마크업 (§7.2)
- stopwatch 전용 색·typo 토큰 (§2.2, §3 — `--color-lap-*`, `--text-display-frac`, `--text-lap-*`, `--text-button-md`)
- 스톱워치 상태 머신·rAF tick loop (§6.1, §6.3)
- 4 개 버튼 동작 (시작·정지·랩·리셋) + 키보드 단축키 (§6.2)
- 랩 리스트 렌더링 + 최단/최장 강조 (§4.5, §5.3)
- `--text-button-md` 토큰 (timer 에 없는 신규) — `.btn--secondary-lg` 전용

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지부터 확인.

---

## 10. mockup 참조

[`docs/design/mockups/stopwatch-BF-415.html`](mockups/stopwatch-BF-415.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0)
- light / dark 두 패널을 나란히 표시 → 토큰 매핑 시각 검증
- 4 가지 상태별 패널 동시 표시:
  1. **idle (빈 0:00.00)** — 시작 대기
  2. **running** — 00:24.73 + 4 개 랩 (#1 ~ #4, 최단/최장 강조)
  3. **stopped** — 01:12.49 + 6 개 랩 (정지 상태, 시작·리셋 enabled)
  4. **max-cap** — 99:59.99 + danger 색 + 자동 정지 상태
- mobile (< 640px) 레이아웃 미리보기 섹션 별도 포함 (2 × 2 버튼 그리드)
- focus-visible outline 시각 (버튼 1 샷 정적 표현)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.6 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 대형 display 타이포 | §3 (display-stopwatch mm:ss / .xx 위계), §4.3, §7.6 정량 표 | ✓ |
| 4 개 버튼 배치 (시작·정지·랩·리셋) | §4.4 (활성 매트릭스), §5.2, §7.6 정량 표, mockup | ✓ |
| 랩 리스트 카드 | §4.5 (구조), §5.3 (컴포넌트), mockup state 2/3 | ✓ |
| 디자인 토큰 매핑 (색·간격·typography) | §2.1, §2.2, §2.3, §2.4, §3 | ✓ |
| 키보드 단축키 표기 | §5.4 (KbdHint), §6.2 (단축키 표), §7.5 (a11y), mockup 의 kbd-hint 라인 | ✓ |
| 반응형 (모바일·데스크탑) 와이어프레임 | §4.7 (breakpoint 표), §7.6 정량 표, mockup 의 mobile preview | ✓ |
| display 포맷 mm:ss.xx | §4.3, §5.1 (변환 공식), §7.7 (포맷 helper) | ✓ |
| 랩 번호 + 누적 + 차이 시각 표현 | §4.5 (3+1 컬럼 grid), §5.3 (props), mockup state 2/3 | ✓ |
| docs/design/stopwatch-BF-415.md 신규 추가 | 본 파일 자체 | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 9 개 AC 모두 cross-reference, 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·13단계 구현 순서·§7.6 정량 일치 표·§7.7 포맷 helper 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (notepad / timer), §9.2 복제 대상 (head / script / theme / `.btn` base), §9.3 신규 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 매핑 가이드 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 4 건 |

추가 자체 점검:
- **비범위 명시**: §1.3 에 다중 인스턴스 / 사운드 / export / 시단위 카운트업 / 타이머 통합 5개 explicit 제외 ✓
- **정량 일치 가능성**: §7.6 표가 desktop / tablet / mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **Space/L/R/Esc 충돌**: §6.2 에 현 페이지 input 없음 → 충돌 없음 명시. 대문자/소문자 모두 인식 명시. timer 와의 Esc 일관성 유지 ✓
- **최단/최장 tie 처리**: §5.3 에 동률 시 가장 최근 랩 우선 또는 라벨 표시 X 명시 ✓
- **반응형 mobile 4 버튼 배치**: §4.7 에 2 × 2 그리드 + 컬럼 4 라벨 → inline tag 축소 명시 ✓
- **rAF drift-correction**: §6.3 에 `performance.now()` 기반 누적값 보정 명시 → 탭 백그라운드 정확도 유지 ✓
- **reduced-motion 가드**: §6.4 (lap row fade-in), §7.5 (a11y) 에 explicit 가드 ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §2.2 / §4.3 / §5.3 만 수정):

1. **running / stopped 상태에서 display 색 강조 여부** — 현재 default 는 `--color-text-primary` (단색). §2.2 의 `--color-stopwatch-running` (초록) / `--color-stopwatch-stopped` (앰버) 적용 시 시각 피드백이 강해지나 정보 과잉 우려도 있음. **권장: default(primary) 유지**, 사용자 테스트 후 조정. mockup 은 default 적용.
2. **최단/최장 랩 강조 색 채도** — 현재 §2.2 의 fastest/slowest bg 는 옅은 색조 (light: `#E8F6EE`/`#FBEEEE`). 더 강한 채도(`#C7E9D3`/`#F5C2C2`) 도 가능. **권장: 옅은 색 유지** — 랩이 많아질 때 시각 부담 적음.
3. **랩 200 개 cap 정책** — 99:59.99 까지의 약 100 분 / 200 = 평균 30 초/랩 페이스. 일반 사용은 도달 가능성 낮으나 짧은 운동 인터벌 (5–10 초 랩) 사용 시 도달 가능. **권장: 200 개 cap 유지** + 도달 시 dim 표시 (운영자 시안 요구 시 무제한 가상 스크롤 후속 Epic 분리).
4. **`Esc` 글로벌 리셋의 위험** — 일부 사용자는 modal 닫기로만 Esc 를 기대. v1 은 modal 없음 — 충돌 X. 단, 향후 modal 도입 시 우선순위 정책 필요. **권장: v1 은 글로벌 리셋 채택** (timer 와 일관성), modal 도입 시 modal-close 우선.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
