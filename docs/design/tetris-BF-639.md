# 테트리스 게임 UI/UX 디자인 명세 — BF-639

> 작성자: [이디자인] · 작성일 2026-05-28  
> 관련 티켓: BF-640 (designer task), BF-639 (부모 스토리)  
> 신규 모듈: `tetris/`  
> mockup: [`docs/design/mockups/tetris-BF-640.html`](mockups/tetris-BF-640.html)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태 전이 다이어그램](#6-상태-전이-다이어그램)
7. [키보드 조작 안내](#7-키보드-조작-안내)
8. [localStorage 키 스키마](#8-localstorage-키-스키마)
9. [dev 구현 가이드](#9-dev-구현-가이드)
10. [Acceptance Criteria 매핑 표](#10-acceptance-criteria-매핑-표)
11. [mockup 참조](#11-mockup-참조)

---

## 1. 시안 개요

### 1.1 변경 범위

- 신규 SPA 모듈 `tetris/index.html` (단일 페이지 게임)
- 게임 보드 그리드 (10×20), 7종 테트로미노 색상 시스템
- 실시간 HUD (점수·레벨·라인 수·다음 블록 미리보기·홀드 블록)
- 게임오버 / 일시정지 오버레이 모달
- 반응형 레이아웃 (desktop / tablet / mobile 3단계)
- 키보드 조작 안내 패널

### 1.2 사용자 경험 목표

| 목표 | 세부 내용 |
|---|---|
| **몰입감 있는 게임 분위기** | 어두운 배경 + 선명한 네온-팝 테트로미노 색상으로 게임스러운 분위기 연출 |
| **한눈에 읽히는 HUD** | 점수·레벨·라인을 크고 굵게, 다음 블록 미리보기는 보드 옆에 항상 노출 |
| **착지 예측 보조** | 고스트 블록(Ghost Piece)으로 착지 위치를 반투명하게 표시 |
| **즉각적인 피드백** | 라인 클리어 시 행 플래시 + 점수 팝업 애니메이션 |
| **키보드 접근성** | Tab/Enter 포커스 링 + 모든 인터랙션 키보드만으로 완결 |
| **반응형 완전 지원** | 모바일에서도 터치/스와이프 없이 화면 레이아웃 적응 (터치 컨트롤은 후속 Epic) |

### 1.3 비목표 (Out of Scope)

- 멀티플레이어·온라인 랭킹 (단일 로컬 플레이어)
- 터치/스와이프 컨트롤 (별도 Epic)
- 배경 음악·효과음 (별도 Epic)
- 10종 이상 테트로미노 변형 (표준 7종만)

---

## 2. 컬러 팔레트

### 2.1 베이스 토큰 (기존 프로젝트 토큰 재사용)

기존 `notepad-BF-400.md §2` 에서 정의된 공통 토큰을 그대로 준수.  
게임 모듈 `tetris/styles.css` 의 `:root` 에서 재정의하지 않고 그대로 참조.

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 외곽 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | HUD 패널 표면 |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 버튼 hover / 보조 영역 |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 패널 구분선 |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 숫자·레이블 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | 서브 레이블 |
| `--color-accent` | `#3563E9` | `#5B82F0` | 버튼 primary / focus ring |
| `--color-danger` | `#D14343` | `#E55858` | 게임오버 표시 |

### 2.2 게임 전용 토큰 (신규 — `tetris/styles.css` 에서 정의)

#### 2.2.1 게임 보드 환경

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--board-bg` | `#0A0E1A` | 게임 보드 배경 (다크 네이비 블랙) |
| `--board-border` | `#1E2640` | 보드 외곽 테두리 |
| `--board-grid-line` | `rgba(255,255,255,0.04)` | 셀 격자선 (매우 연함) |
| `--board-overlay-bg` | `rgba(5,8,18,0.88)` | 오버레이 반투명 배경 |

#### 2.2.2 테트로미노 7색 토큰

표준 Tetris Guideline 색상을 기반으로 약간 포화도를 높여 게임스러운 느낌 연출.

| 토큰명 | HEX | 테트로미노 | 모양 |
|---|---|---|---|
| `--tetro-I` | `#00C8D4` | I-피스 | `████` (수평 4칸) |
| `--tetro-O` | `#F5C400` | O-피스 | `██`<br>`██` (2×2 정사각) |
| `--tetro-T` | `#A020C8` | T-피스 | ` █ `<br>`███` (T자) |
| `--tetro-S` | `#28C840` | S-피스 | ` ██`<br>`██ ` (S자) |
| `--tetro-Z` | `#E82828` | Z-피스 | `██ `<br>` ██` (Z자) |
| `--tetro-J` | `#1468F0` | J-피스 | `█  `<br>`███` (J자) |
| `--tetro-L` | `#F07800` | L-피스 | `  █`<br>`███` (L자) |

각 테트로미노 색상에는 **보더/그림자 변형** 도 함께 정의:

| 토큰명 | 산출 방식 | 용도 |
|---|---|---|
| `--tetro-I-border` | `--tetro-I` 에서 15% 어둡게 (`#00A0AA`) | 셀 하단·우측 테두리 (입체감) |
| `--tetro-O-border` | `#C49E00` | — |
| `--tetro-T-border` | `#7A14A0` | — |
| `--tetro-S-border` | `#1A9C30` | — |
| `--tetro-Z-border` | `#B81818` | — |
| `--tetro-J-border` | `#0A4CC0` | — |
| `--tetro-L-border` | `#C05800` | — |

#### 2.2.3 고스트 블록 (Ghost Piece)

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--ghost-opacity` | `0.18` | 고스트 셀 fill 투명도 |
| `--ghost-border-opacity` | `0.45` | 고스트 셀 테두리 투명도 |

> 고스트 셀: `background-color: color-mix(in srgb, var(--tetro-X) var(--ghost-opacity×100%), transparent)` 또는 JavaScript 로 rgba 계산 후 인라인 스타일 적용.

#### 2.2.4 라인 클리어 이펙트

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--line-clear-flash` | `rgba(255,255,255,0.85)` | 클리어 행 플래시 색상 |
| `--line-clear-duration` | `180ms` | 플래시 애니메이션 시간 |

#### 2.2.5 레벨별 속도 시각화 (선택적 HUD 표시)

| 레벨 범위 | 스피드 레이블 색 | 토큰 |
|---|---|---|
| 1–3 | `#28C840` (녹색) | `--speed-slow` |
| 4–7 | `#F5C400` (노란색) | `--speed-mid` |
| 8–10 | `#E82828` (빨간색) | `--speed-fast` |

---

## 3. 타이포그래피

기존 프로젝트의 `--font-sans` / `--font-mono` 토큰을 그대로 사용.  
게임 숫자(점수·레벨)에는 `--font-mono` 적용 — 숫자 폭 균일로 가독성 향상.

| role | font | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 게임 타이틀 (TETRIS) | `--font-sans` | `28px` | `800` | `1.2` | 로고 텍스트 |
| 점수 숫자 | `--font-mono` | `32px` | `700` | `1` | HUD 메인 숫자 |
| 레벨·라인 숫자 | `--font-mono` | `24px` | `700` | `1` | HUD 서브 숫자 |
| HUD 레이블 | `--font-sans` | `11px` | `600` | `1.3` | "SCORE", "LEVEL" 등 대문자 |
| 오버레이 제목 | `--font-sans` | `36px` | `800` | `1.2` | "GAME OVER", "PAUSE" |
| 오버레이 서브 | `--font-sans` | `15px` | `400` | `1.6` | 통계·설명 텍스트 |
| 버튼 | `--font-sans` | `14px` | `600` | `1` | CTA 버튼 |
| 키 가이드 레이블 | `--font-sans` | `12px` | `400` | `1.5` | 키보드 안내 |
| 키 배지 | `--font-mono` | `11px` | `600` | `1` | `[Space]` 등 키 표시 |

---

## 4. 레이아웃

### 4.1 전체 구조 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                       TETRIS  [🌙 테마토글]                      │  topbar 56px
├──────────────┬──────────────────────────────┬───────────────────┤
│              │                              │                   │
│  LEFT HUD    │       GAME BOARD             │   RIGHT HUD       │
│  (HUD 패널)  │       (10×20 그리드)          │   (미리보기 패널)  │
│              │                              │                   │
│  ● SCORE     │  ┌──────────────────────┐    │  NEXT             │
│  ● LEVEL     │  │  (게임 보드 셀 그리드) │    │  ┌────┐          │
│  ● LINES     │  │                      │    │  │ 다음│          │
│  ● HIGH SCR  │  │  (낙하 중인 피스)     │    │  └────┘          │
│              │  │                      │    │                   │
│  [HOLD]      │  │  (고스트 블록)        │    │  HOLD             │
│  ┌────┐      │  │                      │    │  ┌────┐          │
│  │홀드│      │  └──────────────────────┘    │  │홀드│          │
│  └────┘      │                              │  └────┘          │
│              │                              │                   │
│  키 안내     │                              │   키 안내         │
└──────────────┴──────────────────────────────┴───────────────────┘
```

> **Desktop (≥960px)**: 좌우 HUD 패널 + 중앙 보드 3단 레이아웃  
> **Tablet (640–959px)**: 보드 + 우측 HUD 2단 (좌 HUD는 보드 상단으로 이동)  
> **Mobile (<640px)**: 보드 전폭 + HUD 상단 가로 바 형태로 축소

### 4.2 게임 보드 (Board) 치수

| 브레이크포인트 | 셀 크기 | 보드 너비 | 보드 높이 |
|---|---|---|---|
| Desktop ≥960px | `32px × 32px` | `320px` (10열) | `640px` (20행) |
| Tablet 640–959px | `28px × 28px` | `280px` | `560px` |
| Mobile <640px | `22px × 22px` | `220px` | `440px` |

- 보드 외곽 테두리: `2px solid var(--board-border)`
- 보드 배경: `var(--board-bg)`
- 격자선: `1px solid var(--board-grid-line)` (각 셀 사이)

### 4.3 HUD 패널 치수

| 영역 | 데스크탑 | 태블릿 | 모바일 |
|---|---|---|---|
| 좌측 HUD 폭 | `200px` | 숨김 (보드 상단 바) | 숨김 |
| 우측 HUD 폭 | `180px` | `160px` | 숨김 |
| 보드-HUD 간격 | `--space-5 (24px)` | `--space-4 (16px)` | — |
| 패널 padding | `--space-4` 내부 | `--space-3` | — |

### 4.4 Topbar

- 높이: `56px`, `padding: 0 var(--space-5)`
- 좌측: 게임 타이틀 "TETRIS" (font-size 22px, weight 800, letter-spacing 4px)
- 우측: 테마 토글 버튼 (`[🌙]` / `[☀️]`)
- 배경: `var(--color-bg-surface)`, 하단 border: `1px solid var(--color-border-default)`

### 4.5 반응형 레이아웃 상세

#### Desktop (≥ 960px)

```
[좌 HUD 200px] [gap 24px] [보드 320px] [gap 24px] [우 HUD 180px]
전체 폭 ~748px — 가운데 정렬
```

좌 HUD 구성 (상→하):
1. SCORE 패널 (점수 + 최고 점수)
2. LEVEL 패널
3. LINES 패널
4. HOLD 미리보기
5. 키보드 안내 (접이식, 기본 열림)

우 HUD 구성 (상→하):
1. NEXT 미리보기 (다음 블록)
2. 스피드 인디케이터
3. 빈 공간

#### Tablet (640–959px)

```
[상단 HUD 바 — 가로 배치: SCORE | LEVEL | LINES | HOLD]
[보드 280px] [gap 16px] [우 HUD 160px: NEXT]
```

#### Mobile (< 640px)

```
[상단 HUD 바 — SCORE : LEVEL : LINES (한 줄, 압축)]
[보드 220px — 전폭 가운데 정렬]
[NEXT + HOLD 소형 미리보기 — 보드 하단 좌우에 배치]
```

---

## 5. 컴포넌트 명세

### 5.1 게임 보드 셀 (Board Cell)

**구조**: `<div class="board-cell" data-state="empty|filled|ghost|flash" data-piece="I|O|T|S|Z|J|L|none">`

| 상태 | 스타일 |
|---|---|
| `empty` | `background: transparent; border: 1px solid var(--board-grid-line)` |
| `filled` (피스 고정) | `background: var(--tetro-X); border: 1px solid var(--tetro-X-border); border-bottom-width: 2px; border-right-width: 2px` (입체감) |
| `ghost` (착지 예측) | `background: rgba(var(--tetro-X-rgb), 0.18); border: 1px dashed rgba(var(--tetro-X-rgb), 0.45)` |
| `flash` (라인 클리어 애니) | `animation: cellFlash var(--line-clear-duration) ease-out` |

**입체감 규칙** (filled 상태):
- 상단·좌측 border: 피스 색상 15% 밝게 (하이라이트)
- 하단·우측 border: `var(--tetro-X-border)` (그림자)
- 셀 내부: 중앙에 `2px` 안쪽 여백 적용 (셀들이 분리되어 보이는 효과)

### 5.2 HUD 점수 패널 (ScorePanel)

```html
<div class="hud-panel hud-score">
  <span class="hud-label">SCORE</span>
  <span class="hud-value" id="score-value">000000</span>
  <span class="hud-label hud-label--sub">BEST</span>
  <span class="hud-value hud-value--sub" id="best-value">000000</span>
</div>
```

| prop | 값 |
|---|---|
| `hud-panel` background | `var(--color-bg-surface)` |
| `hud-panel` border | `1px solid var(--color-border-default)` |
| `hud-panel` border-radius | `var(--radius-lg)` |
| `hud-panel` padding | `var(--space-4)` |
| `hud-label` | font-size 11px, weight 600, letter-spacing 1.5px, color `var(--color-text-secondary)`, uppercase |
| `hud-value` | font `var(--font-mono)`, size 32px, weight 700, color `var(--color-text-primary)` |
| `hud-value--sub` | font `var(--font-mono)`, size 20px, weight 600, color `var(--color-text-secondary)` |
| 점수 증가 애니 | 숫자 변경 시 `transform: scale(1.15)` → `scale(1.0)` 120ms transition |

**점수 계산 표시** (라인 클리어 시 팝업 오버레이):

라인 클리어 즉시 보드 위에 `+점수` 텍스트가 1초간 위로 올라가며 fade-out.

| 클리어 수 | 기본 점수 (레벨 1) | 팝업 텍스트 |
|---|---|---|
| Single (1줄) | 100점 | `+100` |
| Double (2줄) | 300점 | `+300` |
| Triple (3줄) | 500점 | `+500` |
| Tetris (4줄) | 800점 | `🎉 TETRIS! +800` |

### 5.3 다음 블록 미리보기 (NextPreview)

```html
<div class="hud-panel hud-next">
  <span class="hud-label">NEXT</span>
  <div class="piece-preview" id="next-piece-grid">
    <!-- 4×4 미니 그리드 (20px × 20px 셀) -->
  </div>
</div>
```

| prop | 값 |
|---|---|
| 미니 그리드 셀 크기 | `20px × 20px` (데스크탑) / `18px × 18px` (모바일) |
| 그리드 컨테이너 | `4×4` 고정 크기 (80px × 80px) |
| 빈 셀 | `background: var(--board-bg); border: 1px solid var(--board-grid-line)` |
| 채워진 셀 | `filled` 상태와 동일 스타일 |
| 피스는 그리드 중앙 정렬 | CSS 또는 JS로 중앙 좌표 계산 |

### 5.4 홀드 블록 미리보기 (HoldPreview)

NextPreview와 동일 구조, `id="hold-piece-grid"`.  
단, 홀드 불가 상태(`hold-locked`)일 때:
- 미니 그리드 전체 `opacity: 0.35`
- `hud-label` 텍스트에 `"HOLD (잠김)"` 표시 또는 아이콘

### 5.5 레벨 패널 (LevelPanel)

```html
<div class="hud-panel hud-level">
  <span class="hud-label">LEVEL</span>
  <span class="hud-value" id="level-value">1</span>
  <div class="speed-indicator">
    <!-- 속도 레벨 시각화: 3칸 바 -->
    <span class="speed-bar" data-active="true"></span>
    <span class="speed-bar"></span>
    <span class="speed-bar"></span>
  </div>
</div>
```

스피드 인디케이터:
- 레벨 1–3: 바 1개 활성 (녹색 `var(--speed-slow)`)
- 레벨 4–7: 바 2개 활성 (노란색 `var(--speed-mid)`)
- 레벨 8–10: 바 3개 활성 (빨간색 `var(--speed-fast)`)

### 5.6 라인 수 패널 (LinesPanel)

```html
<div class="hud-panel hud-lines">
  <span class="hud-label">LINES</span>
  <span class="hud-value" id="lines-value">0</span>
</div>
```

### 5.7 일시정지 오버레이 (PauseOverlay)

**트리거**: `P` 키 또는 `Escape` 키  
**상태**: `data-status="paused"` → 오버레이 표시

```
┌──────────────────────────────────┐
│                                  │
│          ⏸ PAUSED                │
│                                  │
│    ┌────────────────────────┐    │
│    │   계속하기 (P / Space) │    │  ← primary button
│    └────────────────────────┘    │
│    ┌────────────────────────┐    │
│    │       다시 시작         │    │  ← secondary button
│    └────────────────────────┘    │
│    ┌────────────────────────┐    │
│    │       메뉴로 나가기     │    │  ← ghost button (danger 계열)
│    └────────────────────────┘    │
│                                  │
└──────────────────────────────────┘
```

| prop | 값 |
|---|---|
| 오버레이 배경 | `var(--board-overlay-bg)` (보드 위에 절대 위치) |
| 모달 컨테이너 | `background: var(--color-bg-surface); border-radius: var(--radius-lg); padding: var(--space-6)` |
| 모달 폭 | `280px` (고정) |
| 제목 | font-size 36px, weight 800, color `var(--color-text-primary)`, letter-spacing 2px |
| 아이콘 | `⏸` 유니코드 또는 SVG — 크기 40px |
| Primary 버튼 | `background: var(--color-accent); color: #fff; border-radius: var(--radius-md); height: 44px` |
| Secondary 버튼 | `background: var(--color-bg-subtle); border: 1px solid var(--color-border-strong)` |
| Ghost/Danger 버튼 | `background: transparent; color: var(--color-danger); border: 1px solid var(--color-danger)` |
| 버튼 간격 | `var(--space-3)` (12px) |
| 포커스 관리 | 오버레이 열릴 때 첫 번째 버튼(`계속하기`)에 `focus()` — focus trap |

### 5.8 게임오버 오버레이 (GameOverOverlay)

**트리거**: 피스가 보드 상단을 넘어설 때 → `data-status="gameover"`

```
┌──────────────────────────────────┐
│                                  │
│          💀 GAME OVER            │
│                                  │
│   ┌─────────────────────────┐    │
│   │   SCORE    000,450      │    │
│   │   BEST     000,800      │    │
│   │   LEVEL    7            │    │
│   │   LINES    42           │    │
│   └─────────────────────────┘    │
│                                  │
│   [새 게임]     [최고 기록 보기]  │
│                                  │
└──────────────────────────────────┘
```

| prop | 값 |
|---|---|
| 오버레이 배경 | `var(--board-overlay-bg)` |
| 제목 색 | `var(--color-danger)` (빨간 계열로 긴장감) |
| 신기록 배지 | 최고 점수 갱신 시 `🏆 NEW RECORD!` — `color: var(--tetro-O)` (노란색), 위로 올라오는 애니 |
| 통계 카드 | `background: var(--color-bg-subtle); border-radius: var(--radius-md); padding: var(--space-4)` |
| 통계 행 | 레이블 left / 값 right, 2열 grid |
| `[새 게임]` | primary button |
| `[최고 기록 보기]` | secondary ghost button |

### 5.9 키보드 조작 안내 패널 (KeyGuide)

```html
<div class="hud-panel hud-key-guide" aria-label="키보드 조작 안내">
  <span class="hud-label">CONTROLS</span>
  <!-- 키 항목 반복 -->
  <div class="key-row">
    <kbd class="key-badge">←→</kbd>
    <span class="key-desc">좌우 이동</span>
  </div>
  ...
</div>
```

| prop | 값 |
|---|---|
| `key-badge` | `font: var(--font-mono); background: var(--color-bg-subtle); border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); padding: 2px 6px; font-size: 11px` |
| `key-desc` | `font-size: 12px; color: var(--color-text-secondary)` |
| `key-row` 간격 | `gap: var(--space-2)` |
| 패널 전체 | 접이식 — `<details>` 요소 사용 권장 또는 토글 버튼 |

---

## 6. 상태 전이 다이어그램

```
                   [페이지 로드]
                        │
                        ▼
              ┌─────────────────┐
              │   START SCREEN  │  (제목 + "시작" 버튼 + 최고점)
              └─────────────────┘
                        │ [시작 버튼 클릭 / Enter]
                        ▼
              ┌─────────────────┐
         ┌───▶│    PLAYING      │◀──────────────────┐
         │    └─────────────────┘                   │
         │           │         │                    │
         │    [P/Esc]│    [보드  │                    │ [계속하기]
         │           │     상단  │                    │
         │           ▼    초과]  │                    │
         │    ┌─────────┐       ▼             ┌──────────┐
         │    │ PAUSED  │    ┌──────────┐     │  PAUSED  │
         │    └─────────┘    │ GAMEOVER │     └──────────┘
         │           │       └──────────┘
         │    [다시   │            │ [새 게임]
         │     시작]  │            │
         │           └────────────┘
         │                    │ [새 게임]
         └────────────────────┘
```

**게임 상태 (`data-status` 속성)**:

| 상태 | DOM 마커 | 표시 요소 |
|---|---|---|
| `start` | `body[data-status="start"]` | 시작 화면 오버레이 |
| `playing` | `body[data-status="playing"]` | HUD + 보드 활성 |
| `paused` | `body[data-status="paused"]` | 일시정지 오버레이 + 보드 dimmed |
| `gameover` | `body[data-status="gameover"]` | 게임오버 오버레이 |

---

## 7. 키보드 조작 안내

| 키 | 동작 | 비고 |
|---|---|---|
| `←` / `A` | 피스 왼쪽 이동 | 벽 충돌 시 무시 |
| `→` / `D` | 피스 오른쪽 이동 | 벽 충돌 시 무시 |
| `↓` / `S` | 소프트 드롭 (빠른 낙하) | 점수 1점/셀 추가 |
| `↑` / `W` / `X` | 시계방향 90° 회전 | SRS 벽킥 적용 |
| `Z` / `Ctrl` | 반시계방향 90° 회전 | — |
| `Space` | 하드 드롭 (즉시 착지) | 점수 2점/셀 추가 |
| `C` / `Shift` | 홀드 (현재 피스 보관) | 같은 피스 2회 연속 홀드 불가 |
| `P` / `Esc` | 일시정지 / 재개 토글 | — |
| `R` | 게임 재시작 | 게임오버·일시정지 상태에서만 |
| `Tab` | 포커스 이동 | 오버레이 내 버튼 간 이동 |
| `Enter` | 포커스 버튼 활성화 | — |

---

## 8. localStorage 키 스키마

| 키 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `tetris:highScore` | `number` | `0` | 역대 최고 점수 |
| `tetris:theme` | `"light" \| "dark"` | `"dark"` | 테마 설정 (게임이므로 dark 기본) |
| `tetris:level` | `number` | `1` | 시작 레벨 (설정 가능) |

---

## 9. dev 구현 가이드

### 9.1 모듈 파일 구조

```
tetris/
├── index.html          # 진입점 (SPA)
├── styles.css          # 토큰 정의 + 레이아웃 + 컴포넌트 스타일
├── main.js             # 게임 루프 + 입력 처리 + 렌더링
├── logic.js            # 테트로미노 로직 (이동·회전·충돌·고정·라인 클리어)
└── storage.js          # localStorage 래퍼
```

### 9.2 CSS 변수명 가이드

**`tetris/styles.css` `:root` 에서 선언:**

```css
:root {
  /* 게임 보드 */
  --board-bg: #0A0E1A;
  --board-border: #1E2640;
  --board-grid-line: rgba(255,255,255,0.04);
  --board-overlay-bg: rgba(5,8,18,0.88);

  /* 테트로미노 색상 */
  --tetro-I: #00C8D4;  --tetro-I-border: #00A0AA;  --tetro-I-rgb: 0,200,212;
  --tetro-O: #F5C400;  --tetro-O-border: #C49E00;  --tetro-O-rgb: 245,196,0;
  --tetro-T: #A020C8;  --tetro-T-border: #7A14A0;  --tetro-T-rgb: 160,32,200;
  --tetro-S: #28C840;  --tetro-S-border: #1A9C30;  --tetro-S-rgb: 40,200,64;
  --tetro-Z: #E82828;  --tetro-Z-border: #B81818;  --tetro-Z-rgb: 232,40,40;
  --tetro-J: #1468F0;  --tetro-J-border: #0A4CC0;  --tetro-J-rgb: 20,104,240;
  --tetro-L: #F07800;  --tetro-L-border: #C05800;  --tetro-L-rgb: 240,120,0;

  /* 속도 인디케이터 */
  --speed-slow: #28C840;
  --speed-mid: #F5C400;
  --speed-fast: #E82828;

  /* 라인 클리어 */
  --line-clear-duration: 180ms;
}
```

**다크 테마 기본** (게임이므로 기본값이 dark):  
```css
/* 기본: 다크 모드 */
body { background: var(--board-bg); }
[data-theme="light"] { /* 라이트 오버라이드 */ }
```

### 9.3 DOM 구조 권장

```html
<body data-status="start" data-theme="dark">
  <!-- Topbar -->
  <header class="topbar">...</header>

  <!-- 게임 컨테이너 -->
  <main class="game-container">
    <!-- 좌측 HUD -->
    <aside class="hud hud--left">
      <div class="hud-panel hud-score">...</div>
      <div class="hud-panel hud-level">...</div>
      <div class="hud-panel hud-lines">...</div>
      <div class="hud-panel hud-hold">...</div>
      <div class="hud-panel hud-key-guide">...</div>
    </aside>

    <!-- 게임 보드 -->
    <section class="board-wrapper">
      <div class="board" id="game-board" role="img" aria-label="테트리스 게임 보드">
        <!-- 200개 셀 (10×20) — JS로 동적 생성 권장 -->
      </div>
      <!-- 오버레이들 (보드 위에 absolute 배치) -->
      <div class="overlay overlay--start" aria-hidden="false">...</div>
      <div class="overlay overlay--pause" aria-hidden="true" role="dialog">...</div>
      <div class="overlay overlay--gameover" aria-hidden="true" role="dialog">...</div>
    </section>

    <!-- 우측 HUD -->
    <aside class="hud hud--right">
      <div class="hud-panel hud-next">...</div>
    </aside>
  </main>
</body>
```

### 9.4 렌더링 접근법

**Canvas vs DOM 선택**: 이 모듈은 **DOM 기반 셀 렌더링** 권장 (Pixi.js는 snake 전용).

- 보드: `10×20 = 200개` `<div class="board-cell">` — JS로 초기화 시 한 번 생성
- 렌더: 매 프레임 JS에서 셀 `data-state` 속성 + `data-piece` 속성만 변경
- 스타일: CSS attribute selector (`[data-piece="I"]`)로 색상 자동 매핑

```css
/* CSS attribute selector 예 */
.board-cell[data-piece="I"] {
  background: var(--tetro-I);
  border-color: var(--tetro-I-border);
}
.board-cell[data-state="ghost"][data-piece="I"] {
  background: rgba(var(--tetro-I-rgb), 0.18);
  border-color: rgba(var(--tetro-I-rgb), 0.45);
}
```

### 9.5 게임 루프 틱 (참고)

| 레벨 | 낙하 간격 |
|---|---|
| 1 | 800ms |
| 2 | 717ms |
| 3 | 633ms |
| 4 | 550ms |
| 5 | 467ms |
| 6 | 383ms |
| 7 | 300ms |
| 8 | 217ms |
| 9 | 133ms |
| 10 | 100ms |

10줄 클리어마다 레벨 1 상승.

### 9.6 클래스명 규약

```
.board              — 게임 보드 컨테이너
.board-cell         — 개별 셀
.board-cell--ghost  — 고스트 피스 셀 (또는 data-state="ghost")
.board-cell--flash  — 클리어 애니메이션 셀
.hud                — HUD 컨테이너 (aside)
.hud-panel          — HUD 개별 카드
.hud-label          — HUD 항목 레이블
.hud-value          — HUD 숫자값
.piece-preview      — next/hold 미니 그리드
.overlay            — 상태 오버레이 컨테이너
.overlay--active    — 활성 오버레이
.key-badge          — 키 표시 배지 (kbd)
.key-row            — 키 + 설명 행
```

---

## 10. Acceptance Criteria 매핑 표

| AC | 명세 섹션 | 충족 방법 |
|---|---|---|
| 보드 그리드 정의됨 | §4.2, §5.1 | 10×20 셀 구조, 셀 크기 브레이크포인트별 정의, CSS 변수 `--board-*` |
| 테트로미노 7색 토큰 정의됨 | §2.2.2 | `--tetro-I/O/T/S/Z/J/L` + `-border` + `-rgb` 모두 정의 |
| HUD 구조 정의됨 | §4.3, §5.2~5.6 | SCORE / LEVEL / LINES / NEXT / HOLD 모두 컴포넌트 명세 완성 |
| 게임오버 오버레이 정의됨 | §5.8 | 통계 카드 + 버튼 구조 + 신기록 배지 명세 |
| 일시정지 오버레이 정의됨 | §5.7 | 계속/재시작/나가기 3버튼 + focus trap + P/Esc 키 |
| 반응형 레이아웃 정의됨 | §4.5 | desktop/tablet/mobile 3단계 치수 명세 |
| 키보드 조작 안내 포함됨 | §7 | 11개 키 동작 완전 정의 |
| 색상·간격·폰트 토큰화됨 | §2, §3, §9.2 | CSS 변수명 완전 명시, hardcoded 금지 규약 준수 |
| dev 구현 가이드 포함됨 | §9 | 파일 구조·DOM 구조·CSS 규약·렌더링 방식 단계별 안내 |
| mockup HTML (외부 의존성 0) | §11 | `docs/design/mockups/tetris-BF-640.html` — self-contained |

---

## 11. mockup 참조

- **위치**: `docs/design/mockups/tetris-BF-640.html`
- **내용**: 게임 보드 그리드, 7색 테트로미노 샘플 블록, HUD 패널 (SCORE/LEVEL/LINES/NEXT/HOLD), 게임오버/일시정지 오버레이 두 가지 상태, 키보드 안내 패널
- **특이사항**: `⌨ 오버레이 보기` 버튼으로 일시정지/게임오버 오버레이 토글 가능 (정적 시뮬레이션)
