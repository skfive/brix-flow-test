# 가위바위보 게임 UI/UX 디자인 명세 — BF-645

> 작성자: [이디자인] · 작성일 2026-05-28  
> 관련 티켓: BF-646 (designer task), BF-645 (부모 스토리)  
> 신규 모듈: `rps/`  
> mockup: [`docs/design/mockups/rps-BF-645.html`](mockups/rps-BF-645.html)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태 전이 다이어그램](#6-상태-전이-다이어그램)
7. [승·패·무 피드백 규칙](#7-승패무-피드백-규칙)
8. [인터랙션 규칙](#8-인터랙션-규칙)
9. [localStorage 키 스키마](#9-localstorage-키-스키마)
10. [dev 구현 가이드](#10-dev-구현-가이드)
11. [Acceptance Criteria 매핑 표](#11-acceptance-criteria-매핑-표)
12. [mockup 참조](#12-mockup-참조)

---

## 1. 시안 개요

### 1.1 변경 범위

- 신규 SPA 모듈 `rps/index.html` (단일 페이지 게임)
- 플레이어 vs CPU 1:1 대전 화면 (선택 카드 × 2 + VS 구분자)
- 가위 ✌️ / 바위 ✊ / 보 🖐 선택 버튼 패널 (3종)
- 실시간 승패 결과 배너 (WIN / LOSE / DRAW)
- 누적 점수판 (승 / 무 / 패 카운터)
- 게임 진행 상태별 애니메이션 피드백
- 반응형 레이아웃 (desktop / mobile 2단계)

### 1.2 사용자 경험 목표

| 목표 | 세부 내용 |
|---|---|
| **게임스러운 비주얼** | 어두운 배경 + 결과별 컬러 글로우 이펙트로 긴장감·흥미 연출 |
| **직관적인 선택** | 3개 버튼에 아이콘 + 텍스트 동시 표시 — 클릭 한 번으로 즉시 진행 |
| **즉각적인 피드백** | 선택 즉시 CPU "생각 중" 애니 → 결과 공개 + 색상 강조 |
| **누적 전황 파악** | 화면 상단 점수판이 항상 노출 — 승/무/패 한눈에 비교 |
| **접근성** | Tab/Enter 키보드 조작 완결 + 결과 aria-live로 스크린리더 지원 |

### 1.3 비목표 (Out of Scope)

- 멀티플레이어·온라인 대전
- 베스트 of N 게임 모드 (단판 반복)
- 효과음 (별도 Epic)
- CPU AI 전략 (완전 랜덤으로 구현)

---

## 2. 컬러 팔레트

### 2.1 베이스 토큰 (기존 프로젝트 토큰 재사용)

기존 프로젝트 공통 토큰 준수 (`notepad-BF-400.md §2` 기준).  
`rps/styles.css` `:root` 에서 재정의하지 않고 그대로 참조.

| 토큰명 | Dark HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0F1115` | 페이지 외곽 배경 |
| `--color-bg-surface` | `#171A21` | 카드·패널 표면 |
| `--color-bg-subtle` | `#1E222B` | 버튼 hover / 보조 영역 |
| `--color-border-default` | `#262B36` | 패널 구분선 |
| `--color-border-strong` | `#3A4150` | 강조 테두리 |
| `--color-text-primary` | `#E8E8E4` | 주요 텍스트 |
| `--color-text-secondary` | `#9A9A93` | 서브 레이블 |
| `--color-accent` | `#5B82F0` | 포커스 링·primary 버튼 |
| `--color-danger` | `#E55858` | 패배 상태 강조 |

### 2.2 RPS 게임 전용 토큰 (신규 — `rps/styles.css` 에서 정의)

#### 2.2.1 결과 상태 컬러

| 토큰명 | HEX | 용도 |
|---|---|---|
| `--rps-win` | `#28C840` | 승리 배너 텍스트·테두리 |
| `--rps-win-bg` | `#0A1F0E` | 승리 배너 배경 |
| `--rps-win-glow` | `rgba(40,200,64,0.30)` | 승리 시 카드 글로우 |
| `--rps-lose` | `#E82828` | 패배 배너 텍스트·테두리 |
| `--rps-lose-bg` | `#1F0A0A` | 패배 배너 배경 |
| `--rps-lose-glow` | `rgba(232,40,40,0.30)` | 패배 시 카드 글로우 |
| `--rps-draw` | `#F5C400` | 무승부 배너 텍스트·테두리 |
| `--rps-draw-bg` | `#1F1900` | 무승부 배너 배경 |
| `--rps-draw-glow` | `rgba(245,196,0,0.25)` | 무승부 시 카드 글로우 |

#### 2.2.2 선택지별 컬러 (버튼 강조)

| 선택지 | 토큰명 | HEX | 설명 |
|---|---|---|---|
| ✌️ 가위 | `--rps-scissors` | `#F5C400` | 노란 골드 계열 |
| `--rps-scissors-bg` | — | `#1F1900` | 가위 버튼 hover bg |
| ✊ 바위 | `--rps-rock` | `#9A9A93` | 중성 회색 계열 |
| `--rps-rock-bg` | — | `#1A1C22` | 바위 버튼 hover bg |
| 🖐 보 | `--rps-paper` | `#5B82F0` | 파란 계열 |
| `--rps-paper-bg` | — | `#0A1020` | 보 버튼 hover bg |

#### 2.2.3 카드 상태 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--card-idle-bg` | `#1E222B` | 대기 중 카드 배경 |
| `--card-idle-border` | `#3A4150` | 대기 중 카드 테두리 |
| `--card-chosen-border-width` | `2px` | 선택된 카드 테두리 두께 |
| `--thinking-dot-color` | `#9A9A93` | CPU "생각 중" 점 색상 |
| `--thinking-speed` | `0.6s` | 점 애니메이션 주기 |

---

## 3. 타이포그래피

기존 프로젝트의 `--font-sans` / `--font-mono` 토큰을 그대로 사용.

| role | font | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 게임 타이틀 | `--font-sans` | `22px` | `800` | `1.2` | "가위바위보", letter-spacing 2px |
| 선택지 아이콘 (결과 카드) | system emoji | `72px` | — | `1` | 결과 공개 전: `❓` |
| 선택지 아이콘 (버튼) | system emoji | `32px` | — | `1` | 버튼 내부 아이콘 |
| 결과 배너 텍스트 | `--font-sans` | `28px` | `800` | `1.2` | "WIN!" / "LOSE" / "DRAW", letter-spacing 3px |
| 점수판 숫자 | `--font-mono` | `28px` | `700` | `1` | 승/무/패 카운터 |
| 점수판 레이블 | `--font-sans` | `11px` | `600` | `1.3` | "승" / "무" / "패", uppercase 스타일 |
| 카드 레이블 | `--font-sans` | `13px` | `600` | `1.3` | "나" / "컴퓨터" |
| 버튼 텍스트 | `--font-sans` | `14px` | `700` | `1` | "가위" / "바위" / "보" |
| 부제 설명 | `--font-sans` | `13px` | `400` | `1.5` | "선택하세요" 안내 텍스트 |

---

## 4. 레이아웃

### 4.1 전체 구조 개요

```
┌──────────────────────────────────────────────────┐
│  ✊✌✋  가위바위보                    [🌙 테마] │  header 56px
├──────────────────────────────────────────────────┤
│                                                  │
│     ┌──── 점수판 ────────────────────────┐       │
│     │  [승 N]    [무 N]    [패 N]        │       │  scoreboard
│     └────────────────────────────────────┘       │
│                                                  │
│  ┌─────────────┐   VS   ┌─────────────┐         │
│  │    나       │        │   컴퓨터    │         │  battle area
│  │    [icon]   │        │   [icon]    │         │
│  │   선택명    │        │   CPU선택명  │         │
│  └─────────────┘        └─────────────┘         │
│                                                  │
│       ┌──────── 결과 배너 ──────────┐            │
│       │   WIN! / LOSE / DRAW        │            │  result banner
│       └────────────────────────────┘             │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │    ✌️    │  │    ✊    │  │    🖐    │      │  choice buttons
│  │   가위   │  │   바위   │  │    보    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
└──────────────────────────────────────────────────┘
```

> **Desktop (≥ 640px)**: 배틀 영역 가로 배치 (플레이어 카드 | VS | CPU 카드)  
> **Mobile (< 640px)**: 배틀 영역 세로 배치 (플레이어 카드 위 / CPU 카드 아래), VS 텍스트는 카드 사이에 작게

### 4.2 배틀 영역 치수

| 브레이크포인트 | 카드 크기 | 간격 | VS 폰트 |
|---|---|---|---|
| Desktop ≥ 640px | `160px × 180px` | `gap: 32px` | `24px, bold` |
| Mobile < 640px | `130px × 150px` | `gap: 16px` | `18px, bold` |

- 카드 배경: `var(--card-idle-bg)`
- 카드 테두리: `2px solid var(--card-idle-border)`
- 카드 border-radius: `var(--radius-lg)` (12px)
- 카드 아이콘 영역: 카드 상단 70% (아이콘 중앙 정렬)
- 카드 레이블 영역: 카드 하단 30% (텍스트 중앙 정렬)

### 4.3 점수판 치수

- 가로: 최대 `400px`, 가운데 정렬
- padding: `var(--space-4)` (16px)
- 3개 점수 항목: `flex, justify-content: space-around`
- 각 항목 폭: `120px` (데스크탑) / `100px` (모바일)
- 구분선: `1px solid var(--color-border-default)` (항목 사이 세로선)

### 4.4 선택 버튼 패널 치수

- 가로: 최대 `480px`, 가운데 정렬
- 버튼 3개: `display: flex; gap: var(--space-4)` (16px)
- 버튼 크기: `140px × 100px` (데스크탑) / `100px × 80px` (모바일)
- 버튼 border-radius: `var(--radius-lg)` (12px)
- 버튼 padding: `var(--space-3)` (12px)
- 버튼 내부: flex column (아이콘 상단 + 텍스트 하단)

### 4.5 결과 배너

- 위치: 배틀 영역과 선택 버튼 패널 사이 (또는 배틀 영역 하단)
- 최소 높이: `52px`
- idle 상태: `visibility: hidden` (공간 유지, 텍스트 숨김) — 레이아웃 shift 방지
- 표시 상태: 슬라이드-인 + 페이드-인 애니메이션

### 4.6 Header

- 높이: `56px`, `padding: 0 var(--space-5)`
- 좌측: 게임 로고 (아이콘 + 타이틀)
- 우측: 테마 토글 버튼
- 배경: `var(--color-bg-surface)`, 하단 border: `1px solid var(--color-border-default)`

---

## 5. 컴포넌트 명세

### 5.1 선택지 카드 (ChoiceCard)

**구조**:
```html
<div class="choice-card" 
     data-owner="player|cpu" 
     data-state="idle|thinking|revealed"
     data-choice="none|scissors|rock|paper">
  <div class="choice-card__icon" aria-hidden="true">❓</div>
  <div class="choice-card__label">나 / 컴퓨터</div>
  <div class="choice-card__name">가위 / 바위 / 보</div>  <!-- revealed 상태에서만 표시 -->
</div>
```

| 상태 | 스타일 |
|---|---|
| `idle` | 아이콘: `❓` 72px; 테두리: `var(--card-idle-border)`; bg: `var(--card-idle-bg)` |
| `thinking` | 아이콘: `⋯` 점 3개 펄스 애니메이션 (각 0.2s delay); 테두리 점선 `border-style: dashed` |
| `revealed` (player) | 아이콘: 해당 선택지 이모지; 테두리: 선택지 컬러 2px; bg: 선택지 컬러 10% tint |
| `revealed` (cpu) — **win** | 테두리: `var(--rps-win)` + `box-shadow: 0 0 16px var(--rps-win-glow)` |
| `revealed` (cpu) — **lose** | 테두리: `var(--rps-lose)` + `box-shadow: 0 0 16px var(--rps-lose-glow)` |
| `revealed` (cpu) — **draw** | 테두리: `var(--rps-draw)` + `box-shadow: 0 0 16px var(--rps-draw-glow)` |

**선택지 아이콘 매핑**:

| `data-choice` | 이모지 | 이름 | 테두리 컬러 토큰 |
|---|---|---|---|
| `scissors` | `✌️` | 가위 | `--rps-scissors` |
| `rock` | `✊` | 바위 | `--rps-rock` |
| `paper` | `🖐` | 보 | `--rps-paper` |

### 5.2 VS 구분자 (VsDivider)

```html
<div class="vs-divider" aria-hidden="true">
  <span class="vs-divider__text">VS</span>
</div>
```

| prop | 값 |
|---|---|
| 폰트 | `--font-sans`, 24px, weight 800 |
| 색상 | `var(--color-text-secondary)` |
| 자체 크기 | `60px × 60px`, 원형, `border-radius: 50%` |
| 배경 | `var(--color-bg-subtle)` |
| 테두리 | `2px solid var(--color-border-default)` |

### 5.3 결과 배너 (ResultBanner)

```html
<div class="result-banner" 
     data-result="none|win|lose|draw"
     role="status"
     aria-live="polite"
     aria-atomic="true">
  <span class="result-banner__icon" aria-hidden="true"><!-- 이모지 --></span>
  <span class="result-banner__text"><!-- WIN! / LOSE / DRAW --></span>
</div>
```

| `data-result` | 아이콘 | 텍스트 | 배경 | 텍스트 색 | 테두리 색 |
|---|---|---|---|---|---|
| `none` | — | — | `transparent` | — | `transparent` |
| `win` | `🎉` | `WIN!` | `var(--rps-win-bg)` | `var(--rps-win)` | `var(--rps-win)` |
| `lose` | `😤` | `LOSE` | `var(--rps-lose-bg)` | `var(--rps-lose)` | `var(--rps-lose)` |
| `draw` | `🤝` | `DRAW` | `var(--rps-draw-bg)` | `var(--rps-draw)` | `var(--rps-draw)` |

| prop | 값 |
|---|---|
| border-radius | `var(--radius-lg)` (12px) |
| border | `1px solid` (위 컬러 적용) |
| padding | `var(--space-3) var(--space-5)` (12px 24px) |
| 텍스트 크기 | 28px, weight 800, letter-spacing 3px |
| 나타남 애니 | `slideUp 250ms ease-out` (`transform: translateY(8px)→0` + `opacity: 0→1`) |

### 5.4 점수판 (Scoreboard)

```html
<section class="scoreboard" aria-label="점수판">
  <div class="score-item" data-type="win">
    <span class="score-item__count" id="count-win">0</span>
    <span class="score-item__label">승</span>
  </div>
  <div class="score-divider" aria-hidden="true"></div>
  <div class="score-item" data-type="draw">
    <span class="score-item__count" id="count-draw">0</span>
    <span class="score-item__label">무</span>
  </div>
  <div class="score-divider" aria-hidden="true"></div>
  <div class="score-item" data-type="lose">
    <span class="score-item__count" id="count-lose">0</span>
    <span class="score-item__label">패</span>
  </div>
</section>
```

| prop | 값 |
|---|---|
| `score-item` 정렬 | `flex-direction: column; align-items: center` |
| `score-item__count` | `--font-mono`, 28px, weight 700 |
| `score-item[data-type="win"] .score-item__count` | `color: var(--rps-win)` |
| `score-item[data-type="draw"] .score-item__count` | `color: var(--rps-draw)` |
| `score-item[data-type="lose"] .score-item__count` | `color: var(--rps-lose)` |
| `score-item__label` | 11px, weight 600, `color: var(--color-text-secondary)`, letter-spacing 1px |
| 점수 증가 애니 | `transform: scale(1.25)` → `scale(1.0)` 150ms |
| `score-divider` | `width: 1px; height: 40px; background: var(--color-border-default)` |

### 5.5 선택 버튼 (ChoiceButton)

```html
<button class="choice-btn" 
        data-choice="scissors|rock|paper" 
        aria-label="가위 선택">
  <span class="choice-btn__icon" aria-hidden="true">✌️</span>
  <span class="choice-btn__name">가위</span>
</button>
```

| 상태 | 스타일 |
|---|---|
| default | `bg: var(--color-bg-surface); border: 2px solid var(--color-border-strong)` |
| hover / focus | 선택지별 `bg: var(--rps-X-bg); border-color: var(--rps-X)` |
| active (클릭 순간) | `transform: scale(0.95)` 100ms |
| disabled (thinking 중) | `opacity: 0.5; cursor: not-allowed; pointer-events: none` |

| prop | 값 |
|---|---|
| border-radius | `var(--radius-lg)` (12px) |
| padding | `var(--space-3)` (12px) |
| flex 정렬 | `column; align-items: center; gap: var(--space-2)` |
| 아이콘 크기 | 32px |
| 버튼 텍스트 | 14px, weight 700 |
| focus-visible ring | `outline: 2px solid var(--color-accent); outline-offset: 2px` |

**선택지별 hover 컬러 매핑**:

| `data-choice` | hover bg | hover border |
|---|---|---|
| `scissors` | `--rps-scissors-bg` (#1F1900) | `--rps-scissors` (#F5C400) |
| `rock` | `--rps-rock-bg` (#1A1C22) | `--rps-rock` (#9A9A93) |
| `paper` | `--rps-paper-bg` (#0A1020) | `--rps-paper` (#5B82F0) |

### 5.6 CPU "생각 중" 애니메이션 (ThinkingIndicator)

- 카드의 `data-state="thinking"` 상태에서 아이콘 영역에 3-dot 펄스 표시
- HTML: `<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>`
- 각 `.` 에 CSS `animation: dotPulse 1.2s infinite` + `animation-delay: 0s / 0.2s / 0.4s`
- 점 크기: `10px`, 색상: `var(--thinking-dot-color)`, 간격: `4px`
- 애니메이션: `opacity: 0.3 → 1.0 → 0.3` (keyframes)

### 5.7 리셋 버튼 (ResetButton)

```html
<button class="reset-btn" aria-label="점수 초기화">
  <span>점수 초기화</span>
</button>
```

| prop | 값 |
|---|---|
| 위치 | 점수판 우측 하단 또는 헤더 영역 |
| 스타일 | ghost — `background: transparent; border: 1px solid var(--color-border-default); color: var(--color-text-secondary)` |
| hover | `border-color: var(--color-danger); color: var(--color-danger)` |
| 크기 | `height: 32px; padding: 0 var(--space-3); font-size: 12px` |
| border-radius | `var(--radius-md)` (8px) |

---

## 6. 상태 전이 다이어그램

```
               [페이지 로드]
                    │
                    ▼
         ┌──────────────────┐
         │      IDLE        │  (❓ vs ❓, 버튼 활성)
         └──────────────────┘
                    │ [버튼 클릭]
                    ▼
         ┌──────────────────┐
         │    THINKING      │  (플레이어 선택 표시, CPU ⋯ 애니, 버튼 disabled)
         └──────────────────┘
                    │ [500ms 후 자동]
                    ▼
         ┌──────────────────┐
    ┌───▶│     RESULT       │  (양쪽 선택 공개, 결과 배너, 점수 업데이트)
    │    └──────────────────┘
    │               │ [버튼 클릭 — 다시 선택]
    └───────────────┘
```

**게임 상태 (`data-game-state` 속성 — `<main>` 또는 `<body>` 에 적용)**:

| 상태 | DOM 마커 | UI 동작 |
|---|---|---|
| `idle` | `[data-game-state="idle"]` | 카드 ❓, 배너 숨김, 버튼 활성 |
| `thinking` | `[data-game-state="thinking"]` | 플레이어 선택 표시, CPU ⋯, 버튼 disabled |
| `result-win` | `[data-game-state="result-win"]` | 양쪽 공개, WIN 배너, 점수↑ |
| `result-lose` | `[data-game-state="result-lose"]` | 양쪽 공개, LOSE 배너 |
| `result-draw` | `[data-game-state="result-draw"]` | 양쪽 공개, DRAW 배너 |

---

## 7. 승·패·무 피드백 규칙

### 7.1 판정 로직 (디자인 관점에서의 명세)

| 플레이어 | CPU | 결과 |
|---|---|---|
| 가위 ✌️ | 가위 ✌️ | **DRAW** 🤝 |
| 가위 ✌️ | 바위 ✊ | **LOSE** 😤 |
| 가위 ✌️ | 보 🖐 | **WIN** 🎉 |
| 바위 ✊ | 가위 ✌️ | **WIN** 🎉 |
| 바위 ✊ | 바위 ✊ | **DRAW** 🤝 |
| 바위 ✊ | 보 🖐 | **LOSE** 😤 |
| 보 🖐 | 가위 ✌️ | **LOSE** 😤 |
| 보 🖐 | 바위 ✊ | **WIN** 🎉 |
| 보 🖐 | 보 🖐 | **DRAW** 🤝 |

### 7.2 시각 피드백 상세

**WIN 상태**:
- 플레이어 카드: `border-color: var(--rps-win)`, `box-shadow: 0 0 20px var(--rps-win-glow)`
- 결과 배너: 🎉 `WIN!`, 녹색 (`var(--rps-win)`), 배경 `var(--rps-win-bg)`
- 승 카운터: `+1` 증가 애니메이션 (`scale: 1.25 → 1.0`)

**LOSE 상태**:
- CPU 카드: `border-color: var(--rps-lose)`, `box-shadow: 0 0 20px var(--rps-lose-glow)`
- 결과 배너: 😤 `LOSE`, 빨간 (`var(--rps-lose)`), 배경 `var(--rps-lose-bg)`
- 패 카운터: `+1` 증가 애니메이션

**DRAW 상태**:
- 양쪽 카드: `border-color: var(--rps-draw)`, `box-shadow: 0 0 16px var(--rps-draw-glow)`
- 결과 배너: 🤝 `DRAW`, 노란 (`var(--rps-draw)`), 배경 `var(--rps-draw-bg)`
- 무 카운터: `+1` 증가 애니메이션

### 7.3 CPU 선택 공개 애니메이션

- thinking → result 전환 시 CPU 카드에 `flipIn` 애니메이션
- `@keyframes flipIn`: `rotateY(90deg) → rotateY(0)` 300ms ease-out
- `transform-perspective: 800px` on card parent

---

## 8. 인터랙션 규칙

### 8.1 게임 흐름 인터랙션

| 단계 | 트리거 | 시간 | 동작 |
|---|---|---|---|
| 1. 선택 | 버튼 클릭 / Enter | 즉시 | 플레이어 카드에 선택 표시, 버튼 disabled, `thinking` 상태 진입 |
| 2. CPU 연산 | 자동 | `0ms` (즉시 랜덤 결정, UI 딜레이만 500ms) | CPU 선택 내부 결정 |
| 3. CPU 공개 | 자동 | `500ms 후` | CPU 카드 flipIn 애니 + 선택 이모지 표시, 결과 계산 |
| 4. 결과 표시 | 자동 | `200ms 후 (CPU 공개 직후)` | 결과 배너 slideUp + 점수 업데이트 |
| 5. 재선택 대기 | 자동 | `result` 상태 유지 | 버튼 re-enable, 다시 클릭 가능 |

### 8.2 키보드 인터랙션

| 키 | 동작 |
|---|---|
| `Tab` | 버튼 간 포커스 이동 (가위 → 바위 → 보 → 초기화 버튼) |
| `Enter` / `Space` | 포커스된 버튼 선택 |
| `1` | 가위 선택 (단축키, thinking 상태가 아닐 때만) |
| `2` | 바위 선택 (단축키) |
| `3` | 보 선택 (단축키) |
| `R` | 점수 초기화 |

### 8.3 접근성 규칙

- 결과 배너: `aria-live="polite" aria-atomic="true"` — 스크린리더가 결과 읽음
- 버튼: `aria-label="가위 선택"` 등 명시적 레이블
- `thinking` 상태: 버튼에 `aria-disabled="true"` + `disabled` 속성 동시 적용
- 카드 아이콘: `aria-hidden="true"` (장식용 이모지)
- 카드 상태 변경: 카드에 `aria-label` 동적 업데이트 (`"나의 선택: 가위"`)

---

## 9. localStorage 키 스키마

| 키 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `rps:score` | `{ win: number, draw: number, lose: number }` | `{ win:0, draw:0, lose:0 }` | 누적 점수 |
| `rps:theme` | `"light" \| "dark"` | `"dark"` | 테마 설정 |

---

## 10. dev 구현 가이드

### 10.1 모듈 파일 구조

```
rps/
├── index.html     # 진입점 (SPA)
├── styles.css     # 토큰 정의 + 레이아웃 + 컴포넌트 스타일
└── main.js        # 게임 로직 + 인터랙션 + 렌더링
```

### 10.2 CSS 변수명 가이드

**`rps/styles.css` `:root` 에서 선언 (다크 기본)**:

```css
:root {
  /* 공통 베이스 (notepad-BF-400.md §2 준수) */
  --color-bg-canvas:      #0F1115;
  --color-bg-surface:     #171A21;
  --color-bg-subtle:      #1E222B;
  --color-border-default: #262B36;
  --color-border-strong:  #3A4150;
  --color-text-primary:   #E8E8E4;
  --color-text-secondary: #9A9A93;
  --color-accent:         #5B82F0;
  --color-danger:         #E55858;

  /* 공간 토큰 */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;

  /* 반경·그림자 */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;

  /* 폰트 */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, Menlo, Consolas, monospace;

  /* RPS 결과 상태 */
  --rps-win:       #28C840;
  --rps-win-bg:    #0A1F0E;
  --rps-win-glow:  rgba(40,200,64,0.30);
  --rps-lose:      #E82828;
  --rps-lose-bg:   #1F0A0A;
  --rps-lose-glow: rgba(232,40,40,0.30);
  --rps-draw:      #F5C400;
  --rps-draw-bg:   #1F1900;
  --rps-draw-glow: rgba(245,196,0,0.25);

  /* RPS 선택지 컬러 */
  --rps-scissors:    #F5C400;
  --rps-scissors-bg: #1F1900;
  --rps-rock:        #9A9A93;
  --rps-rock-bg:     #1A1C22;
  --rps-paper:       #5B82F0;
  --rps-paper-bg:    #0A1020;

  /* 카드 */
  --card-idle-bg:     #1E222B;
  --card-idle-border: #3A4150;

  /* CPU thinking 애니 */
  --thinking-dot-color: #9A9A93;
  --thinking-speed:     0.6s;
}
```

라이트 테마 오버라이드 (선택적):
```css
[data-theme="light"] {
  --color-bg-canvas:      #FAFAF9;
  --color-bg-surface:     #FFFFFF;
  --color-bg-subtle:      #F1F1EF;
  --color-border-default: #E5E5E2;
  --color-text-primary:   #1A1A19;
  --color-text-secondary: #6B6B66;
  --color-accent:         #3563E9;
  --card-idle-bg:         #F1F1EF;
  --card-idle-border:     #D5D5D0;
}
```

### 10.3 DOM 구조 권장

```html
<body data-theme="dark">
  <!-- Header -->
  <header class="app-header">
    <div class="app-header__logo">
      <span class="app-header__icons" aria-hidden="true">✊✌️🖐</span>
      <h1 class="app-header__title">가위바위보</h1>
    </div>
    <button class="theme-toggle" aria-label="테마 변경">🌙</button>
  </header>

  <!-- Main game -->
  <main class="game" data-game-state="idle">

    <!-- 점수판 -->
    <section class="scoreboard" aria-label="점수판">
      <div class="score-item" data-type="win">
        <span class="score-item__count" id="count-win">0</span>
        <span class="score-item__label">승</span>
      </div>
      <div class="score-divider" aria-hidden="true"></div>
      <div class="score-item" data-type="draw">
        <span class="score-item__count" id="count-draw">0</span>
        <span class="score-item__label">무</span>
      </div>
      <div class="score-divider" aria-hidden="true"></div>
      <div class="score-item" data-type="lose">
        <span class="score-item__count" id="count-lose">0</span>
        <span class="score-item__label">패</span>
      </div>
    </section>

    <!-- 배틀 영역 -->
    <div class="battle-area">
      <div class="choice-card" data-owner="player" data-state="idle" data-choice="none"
           aria-label="나의 선택: 아직 선택하지 않음">
        <div class="choice-card__icon" aria-hidden="true">❓</div>
        <div class="choice-card__label">나</div>
        <div class="choice-card__name" aria-hidden="true"></div>
      </div>

      <div class="vs-divider" aria-hidden="true">
        <span>VS</span>
      </div>

      <div class="choice-card" data-owner="cpu" data-state="idle" data-choice="none"
           aria-label="컴퓨터의 선택: 아직 선택하지 않음">
        <div class="choice-card__icon" aria-hidden="true">❓</div>
        <div class="choice-card__label">컴퓨터</div>
        <div class="choice-card__name" aria-hidden="true"></div>
      </div>
    </div>

    <!-- 결과 배너 -->
    <div class="result-banner" data-result="none"
         role="status" aria-live="polite" aria-atomic="true">
      <span class="result-banner__icon" aria-hidden="true"></span>
      <span class="result-banner__text"></span>
    </div>

    <!-- 선택 버튼 패널 -->
    <div class="choice-panel" role="group" aria-label="선택">
      <button class="choice-btn" data-choice="scissors" aria-label="가위 선택">
        <span class="choice-btn__icon" aria-hidden="true">✌️</span>
        <span class="choice-btn__name">가위</span>
      </button>
      <button class="choice-btn" data-choice="rock" aria-label="바위 선택">
        <span class="choice-btn__icon" aria-hidden="true">✊</span>
        <span class="choice-btn__name">바위</span>
      </button>
      <button class="choice-btn" data-choice="paper" aria-label="보 선택">
        <span class="choice-btn__icon" aria-hidden="true">🖐</span>
        <span class="choice-btn__name">보</span>
      </button>
    </div>

    <!-- 리셋 버튼 -->
    <button class="reset-btn" id="reset-btn" aria-label="점수 초기화">
      점수 초기화
    </button>

  </main>
</body>
```

### 10.4 CSS attribute selector 활용 패턴

```css
/* 결과 상태별 카드 글로우 */
[data-game-state="result-win"] .choice-card[data-owner="player"] {
  border-color: var(--rps-win);
  box-shadow: 0 0 20px var(--rps-win-glow);
}
[data-game-state="result-lose"] .choice-card[data-owner="cpu"] {
  border-color: var(--rps-lose);
  box-shadow: 0 0 20px var(--rps-lose-glow);
}
[data-game-state="result-draw"] .choice-card {
  border-color: var(--rps-draw);
  box-shadow: 0 0 16px var(--rps-draw-glow);
}

/* 선택지별 버튼 hover */
.choice-btn[data-choice="scissors"]:hover {
  background: var(--rps-scissors-bg);
  border-color: var(--rps-scissors);
}
.choice-btn[data-choice="rock"]:hover {
  background: var(--rps-rock-bg);
  border-color: var(--rps-rock);
}
.choice-btn[data-choice="paper"]:hover {
  background: var(--rps-paper-bg);
  border-color: var(--rps-paper);
}

/* thinking 상태: 버튼 비활성 */
[data-game-state="thinking"] .choice-btn {
  opacity: 0.5;
  pointer-events: none;
}
```

### 10.5 JavaScript 구현 포인트

```javascript
// 게임 상태 토글
function setGameState(state) {
  document.querySelector('.game').dataset.gameState = state;
}

// CPU 선택 랜덤
function cpuPick() {
  const choices = ['scissors', 'rock', 'paper'];
  return choices[Math.floor(Math.random() * 3)];
}

// 승패 판정
function judge(player, cpu) {
  if (player === cpu) return 'draw';
  if (
    (player === 'scissors' && cpu === 'paper') ||
    (player === 'rock' && cpu === 'scissors') ||
    (player === 'paper' && cpu === 'rock')
  ) return 'win';
  return 'lose';
}

// 플레이 흐름
async function play(playerChoice) {
  setGameState('thinking');
  updatePlayerCard(playerChoice);
  const cpu = cpuPick();
  await delay(500);
  updateCpuCard(cpu);        // flipIn 애니 + 이모지 표시
  await delay(200);
  const result = judge(playerChoice, cpu);
  setGameState(`result-${result}`);
  showResultBanner(result);
  updateScore(result);
  saveScore();               // localStorage
}
```

### 10.6 클래스명 규약

```
.game                 — 메인 게임 컨테이너 (data-game-state 보유)
.battle-area          — 양쪽 카드 + VS 구분자 wrapper
.choice-card          — 선택지 카드 (player/cpu)
.choice-card__icon    — 이모지 아이콘 영역
.choice-card__label   — "나" / "컴퓨터" 레이블
.choice-card__name    — 선택지 이름 (가위/바위/보, revealed 시 노출)
.vs-divider           — VS 원형 구분자
.result-banner        — 결과 배너 (data-result 보유)
.scoreboard           — 점수판 컨테이너
.score-item           — 개별 점수 항목 (data-type: win/draw/lose)
.score-item__count    — 숫자 표시
.score-item__label    — 레이블 ("승"/"무"/"패")
.score-divider        — 점수 항목 구분선
.choice-panel         — 선택 버튼 그룹 컨테이너
.choice-btn           — 개별 선택 버튼 (data-choice 보유)
.choice-btn__icon     — 버튼 아이콘 이모지
.choice-btn__name     — 버튼 텍스트
.reset-btn            — 점수 초기화 버튼
.thinking-dots        — CPU thinking 점 3개 컨테이너
.app-header           — 상단 헤더
.theme-toggle         — 테마 토글 버튼
```

---

## 11. Acceptance Criteria 매핑 표

| AC | 명세 섹션 | 충족 방법 |
|---|---|---|
| 컬러 토큰 정의됨 | §2.2 | `--rps-win/lose/draw` + bg/glow 변형 + 선택지별 컬러 완전 정의 |
| 버튼/카드 레이아웃 정의됨 | §4.2, §4.4, §5.1, §5.5 | 카드 치수·상태·hover/focus 스타일 + 버튼 3종 명세 |
| 아이콘 표현 정의됨 | §5.1, §5.5 | 가위 ✌️ / 바위 ✊ / 보 🖐 이모지 + 컬러 매핑 표 |
| 승/패/무 피드백 규칙 정의됨 | §7 | 9가지 판정 표 + 결과별 배너·카드 글로우 시각 규칙 |
| AC 매핑 표 포함됨 | §11 (본 절) | 각 AC와 명세 섹션 1:1 매핑 추적 가능 |
| mockup HTML (file:// 가능) | §12 | `docs/design/mockups/rps-BF-645.html` — 외부 의존성 0건, 인터랙션 시뮬레이션 포함 |
| dev 구현 가이드 포함됨 | §10 | 파일 구조·CSS 변수·DOM 구조·JS 패턴·클래스명 규약 완전 정의 |

---

## 12. mockup 참조

- **위치**: `docs/design/mockups/rps-BF-645.html`
- **내용**: 가위바위보 게임 전체 화면 — 점수판, 배틀 카드, VS 구분자, 결과 배너, 선택 버튼 3종
- **특이사항**: 실제 가위바위보 로직이 내장되어 있어 버튼 클릭으로 직접 플레이 가능 (CPU 랜덤 선택, 승패 판정, 점수 누적)
- **상태 시뮬레이션**: idle → thinking(500ms) → result 전환 + WIN/LOSE/DRAW 컬러 피드백 확인 가능
