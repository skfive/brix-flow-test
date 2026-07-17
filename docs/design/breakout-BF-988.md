# 벽돌깨기(Breakout) UI 디자인 명세 — BF-988

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-988 (Epic) · BF-992 (본 designer task) · BF-990 (planner) · BF-994 (dev) · BF-999 (tester)
> tech-stack: `vanilla-static` — 외부 프레임워크·번들러·CDN·webfont 0건, system font 만 사용
> 기획 SSOT: `docs/planning/breakout-BF-988.md`([박기획], BF-990)
> 대상 module: `breakout` (`phase18-games/breakout/`)
> mockup: `docs/design/mockups/breakout-BF-988.html`

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — 공용 토큰·레이아웃 승계, 재창작 아님:** 저장소에는 이미 검증된 `phase18-games/breakout/` 구현과 그 디자인 SSOT(`docs/design/breakout-BF-928.md`)가 존재한다. 본 문서는 그 **공용 디자인 토큰(phase18 게임 계열 표준 팔레트)과 레이아웃 골격을 그대로 재사용**하여 기획 SSOT(`docs/planning/breakout-BF-988.md`, BF-988)의 상태 모델·입력·화면 요구에 맞춰 UI를 재정리한 SSOT 갱신본이다. 색상·간격·컴포넌트 계약을 임의로 재발명하지 않는다(Simplicity First). 값 변경이 필요하면 운영자 확인 후 개정한다(§8 모호함 1).

**전제 2 — 다른 게임 구현 미참조:** task 지시대로 기존 데모의 **공용 토큰·레이아웃만** 재사용하고, snake/pong/tetris 등 다른 game 모듈의 개별 구현·토큰은 참조하지 않는다.

**전제 3 — designer 산출물 경계:** 본 문서는 디자인 명세(레이아웃·토큰 매핑·상태별 시각 표현·컴포넌트 계약)와 시각 mockup HTML 까지다. 실제 게임 코드(`logic.js`/`main.js`/`index.html`/`styles.css`)는 dev(BF-994) 담당이며 본 task에서 생성·수정하지 않는다.

**전제 4 — 정적(`file://`) 열람:** mockup HTML 은 외부 의존성 0건 self-contained 단일 파일로, `file://` 로 바로 열람 가능해야 한다(AC-2 대응).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 시각 표현 (start/serve/playing/paused/gameover/win)](#6-상태별-시각-표현)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조 / 남은 모호함](#8-mockup-참조--남은-모호함)

---

## 1. 시안 개요

### 1.1 변경 범위

`/phase18-games/breakout` 화면의 **레이아웃·컬러 토큰·상태 표시(점수/생명/승리·패배)** 를 정의한다. 세로형(3:4) 모바일 우선 단일 페이지로, 상단 타이틀 → HUD(점수/생명) → 캔버스 보드(+상태 오버레이) → 조작 안내·컨트롤 버튼의 세로 스택 구조다.

### 1.2 사용자 경험 목표

| 목표 | 설명 |
|---|---|
| 즉시 이해 | 진입 즉시 `start` 화면(점수 0·생명 3·벽돌 40개 미리보기 + "시작" 버튼)이 렌더링되어 무엇을 하는 게임인지 한눈에 파악 |
| 상태 명료성 | 점수·생명·승패 결과를 **시각(색·아이콘) + 텍스트** 이중 채널로 표시 → 스크린리더 낭독 가능(planner §5.4) |
| 두 입력 경로 동등 | 키보드(←/→·A/D·Enter/Space·P) 와 포인터(드래그·탭) 를 동등한 1급 입력으로 안내(planner §5.1) |
| 일관성 | 기존 phase18 게임 데모의 공용 다크 팔레트·간격·버튼 컴포넌트를 그대로 승계해 데모 간 시각 통일 |
| 접근성 | 터치 타깃 ≥44px, `focus-visible` 포커스 링, `prefers-reduced-motion` 존중 |

### 1.3 AC 매핑

| BF-992 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세 작성, Then `docs/design/breakout-BF-988.md` 에 레이아웃·공용 디자인 토큰 매핑·상태별 시각 표현이 명시된다 | §2(토큰 매핑) · §4(레이아웃) · §6(상태별 시각 표현) |
| Given 공용 토큰, When mockup 작성, Then 기존 데모와 디자인 일관성 유지 + 정적(`file://`) 열람 가능 | §2 공용 토큰 그대로 사용 · §7 · `docs/design/mockups/breakout-BF-988.html`(외부 의존성 0건) |

---

## 2. 컬러 팔레트

기존 phase18 게임 데모의 **공용 토큰(표준 팔레트)** 을 그대로 승계한다. 아래 값은 `phase18-games/breakout/styles.css` 의 `:root` 와 1:1 동일하며, 신규 발명 색상은 없다.

### 2.1 표준 토큰 (phase18 게임 계열 공용)

| 역할 | 토큰 | HEX / 값 | 용도 |
|---|---|---|---|
| primary(accent) | `--color-accent` | `#5b82f0` | 주 버튼·강조·발사 힌트 |
| primary hover | `--color-accent-hover` | `#6e90f5` | 주 버튼 hover |
| accent-on | `--color-accent-on` | `#0b0f17` | accent 위 텍스트 |
| background(canvas) | `--color-bg-canvas` | `#0b0f17` | 페이지 배경 |
| surface | `--color-bg-surface` | `#141b26` | HUD·오버레이 카드·패널 |
| subtle | `--color-bg-subtle` | `#1c2431` | secondary 버튼 배경 |
| border | `--color-border-default` | `#273140` | 패널·카드 테두리 |
| border strong | `--color-border-strong` | `#3a4657` | secondary 버튼 테두리 |
| text primary | `--color-text-primary` | `#e8edf4` | 본문·값 텍스트 |
| text secondary | `--color-text-secondary` | `#9aa7b8` | 레이블·보조 설명 |
| text muted | `--color-text-muted` | `#63708a` | 조작 힌트 |
| focus ring | `--color-focus-ring` | `rgba(91,130,240,0.55)` | 포커스 링 |
| success(win) | `--color-success` | `#4ade80` | 승리 결과 강조 |
| danger(lose) | `--color-danger` | `#e55858` | 게임오버·생명 하트 |

### 2.2 Breakout 전용 토큰 (§2.1 위에 얹는 게임 요소 색)

| 요소 | 토큰 | 값 |
|---|---|---|
| 보드 배경 | `--board-bg` | `#070b12` |
| 보드 테두리 | `--board-border` | `#273140` |
| 패들 채움 | `--paddle-fill` | `#6e90f5` |
| 패들 엣지 | `--paddle-edge` | `#3d5bc4` |
| 공 채움 | `--ball-fill` | `#f5f7fa` |
| 공 엣지 | `--ball-edge` | `#aeb9cc` |
| 벽돌 1행 | `--brick-row-1` | `#e55858` (빨강) |
| 벽돌 2행 | `--brick-row-2` | `#f0883e` (주황) |
| 벽돌 3행 | `--brick-row-3` | `#f5c24b` (노랑) |
| 벽돌 4행 | `--brick-row-4` | `#4ade80` (초록) |
| 벽돌 5행 | `--brick-row-5` | `#38bdf8` (하늘) |
| 벽돌 상단 하이라이트 | `--brick-top-highlight` | `rgba(255,255,255,0.22)` |
| 벽돌 하단 음영 | `--brick-bottom-shade` | `rgba(0,0,0,0.28)` |
| 생명 하트(채움) | `--life-heart` | `#e55858` |
| 생명 하트(빈) | `--life-heart-empty` | `#3a4657` |
| 오버레이 스크림 | `--overlay-scrim` | `rgba(5,7,12,0.74)` |
| serve 힌트 배경 | `--serve-hint-bg` | `rgba(11,15,23,0.55)` |
| gameover 틴트 | `--gameover-tint` | `rgba(229,88,88,0.14)` |
| win 틴트 | `--win-tint` | `rgba(74,222,128,0.14)` |

> **벽돌 행별 색 = 5행 무지개 스택**(빨강→주황→노랑→초록→하늘). 내구도는 전부 1(planner §3.2)이므로 색은 순수 시각 구분·심미용이며 난이도 의미는 없다. 색만으로 정보를 전달하지 않는다 — 파괴/점수/생명 상태는 항상 텍스트로도 표시(§6, WCAG 1.4.1).

### 2.3 대비(명도차) 확인

| 조합 | 용도 | 대비비 | 판정 |
|---|---|---|---|
| `#e8edf4` on `#0b0f17` | 본문 텍스트 | ≈ 15.8:1 | AAA |
| `#9aa7b8` on `#141b26` | HUD 레이블 | ≈ 6.8:1 | AA |
| `#0b0f17` on `#5b82f0` | primary 버튼 텍스트 | ≈ 6.4:1 | AA |
| `#4ade80` on `#141b26` | 승리 강조 | ≈ 8.9:1 | AAA |
| `#e55858` on `#141b26` | 게임오버 강조 | ≈ 4.7:1 | AA |

---

## 3. 타이포그래피

외부 webfont 없이 system font stack 만 사용(vanilla-static).

```
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 요소 | font-family | size | weight | line-height | 비고 |
|---|---|---|---|---|---|---|
| heading (타이틀바) | `.breakout-topbar__title` | sans | 20px | 600 | 1.3 | 페이지 상단 "벽돌깨기" |
| overlay 제목 | `.overlay__title` | sans | `clamp(22px, 7vw, 30px)` | 700 | 1.2 | 시작/일시정지/승리/패배 헤드라인 |
| HUD 값(점수) | `.hud__value` | **mono** | `clamp(22px, 6vw, 30px)` | 700 | 1 | `tabular-nums` — 자릿수 흔들림 방지 |
| HUD 레이블 | `.hud__label` | sans | 12px | 600 | 1.2 | uppercase, `letter-spacing 0.08em` |
| overlay 통계(최종 점수) | `.overlay__stat` | **mono** | `clamp(16px, 5vw, 20px)` | 700 | 1.3 | `tabular-nums` |
| body/설명 | `.overlay__desc` | sans | 15px | 400 | 1.5 | 오버레이 안내문 |
| caption(조작 힌트) | `.controls__hint` | sans | 13px | 400 | 1.4 | muted 색 |
| serve 힌트 배너 | `.serve-hint` | sans | 13px | 400 | 1.4 | pill 배너 |
| 버튼 | `.btn` | sans | 14px | 600 | 1 | — |

> 숫자(점수·최종 점수)는 **mono + `font-variant-numeric: tabular-nums`** 로 자릿수 변동 시 폭 흔들림을 방지한다.

---

## 4. 레이아웃

### 4.1 섹션 구조 (세로 스택, 모바일 우선)

```
<body> (배경 --color-bg-canvas, flex center, 상단 정렬)
 └─ <main class="breakout-app">  (max-width 360px, flex-column, gap 16px)
     ├─ <header class="breakout-topbar">        ← "벽돌깨기" 타이틀 (h1)
     ├─ <section class="hud">                    ← 좌: 점수 / 우: 생명(하트 3)
     ├─ <div class="board-wrap">                 ← position:relative, aspect-ratio 3/4
     │    ├─ <canvas class="board" 360×480>       ← 게임 렌더 영역
     │    ├─ <div class="serve-hint">             ← "탭 또는 Enter로 발사" (playing 중 숨김)
     │    └─ <div class="board-overlay">          ← start/paused/gameover/win 카드 (playing 중 숨김)
     └─ <section class="controls">               ← 조작 힌트 + [시작][일시정지][다시하기]
     └─ <noscript>                                ← JS 필요 안내
```

### 4.2 spacing · radius 토큰 (공용 승계)

| 토큰 | 값 | 주 용도 |
|---|---|---|
| `--space-1` | 4px | 하트 간격·레이블-값 간격 |
| `--space-2` | 8px | serve 힌트 padding |
| `--space-3` | 12px | 버튼 gap·HUD 세로 padding |
| `--space-4` | 16px | 앱 세로 스택 gap·HUD 가로 padding |
| `--space-5` | 24px | body padding·오버레이 카드 padding |
| `--space-6` | 32px | (예비) |
| `--radius-sm` | 6px | 벽돌 모서리(렌더) |
| `--radius-md` | 10px | 보드 래퍼·버튼 |
| `--radius-lg` | 14px | HUD·오버레이 카드 |
| `--radius-pill` | 999px | serve 힌트 배너 |
| `--shadow-panel` | `0 8px 32px rgba(0,0,0,0.45)` | HUD·보드·카드 그림자 |

### 4.3 캔버스 보드

- 논리 해상도 `360 × 480`(고정, planner §3.1) — `<canvas width="360" height="480">`.
- CSS: `width:100%; max-width:360px; aspect-ratio:3/4; height:auto` — 표시 크기만 축소, 논리 좌표계 불변.
- `.board { touch-action: none; cursor: pointer; }` — 드래그 중 페이지 스크롤/줌 차단(planner §5.3).
- 보드 래퍼는 `overflow:hidden` + `--radius-md` 로 캔버스 모서리를 둥글게 클리핑.

### 4.4 breakpoint 별 동작

| 뷰포트 | 동작 |
|---|---|
| 기본(≤360px) | body padding 축소(`--space-4 --space-3`), 앱 폭 = 뷰포트 폭. 캔버스·HUD·버튼 세로 스택, 가로 스크롤 없음 |
| ≥421px | 컨트롤 버튼(`.controls__buttons`) `flex-direction: row` — 가로 정렬. 앱은 여전히 max-width 360px 중앙 정렬 |

> 단일 브레이크포인트(421px). 게임 보드는 언제나 3:4 비율을 유지하며 최대 360px 로 클램프된다.

### 4.5 캔버스 내부 렌더 레이아웃 (논리 좌표, planner §3.1·§3.2)

```
보드 360×480
 ├─ 벽돌 영역: 상단 여백 40px, 좌우 여백 6px
 │   └─ 5행 × 8열 = 40개 · 벽돌 40×16 · 간격 4px · 모서리 radius-sm
 │       행 색상: 1행 빨강 → 2행 주황 → 3행 노랑 → 4행 초록 → 5행 하늘
 ├─ 공: 반지름 6, 흰색(--ball-fill) + 엣지(--ball-edge)
 └─ 패들: 폭 64 × 높이 10, Y=440, 파랑(--paddle-fill) + 엣지(--paddle-edge)
```

---

## 5. 컴포넌트 명세

각 컴포넌트의 시각 상태·인터랙션·접근성 계약. (props/상태는 dev 가 DOM·상태 모델에 매핑; planner §6 상태 모델 준수.)

### 5.1 타이틀바 `.breakout-topbar`

- 내용: `<h1>벽돌깨기</h1>` — heading 타이포(§3).
- 정적. 인터랙션 없음.

### 5.2 HUD `.hud`

| 항목 | 계약 |
|---|---|
| 컨테이너 | surface 배경 · `--radius-lg` · `--shadow-panel` · 좌우 space-between |
| 점수 셀 | 레이블 "점수"(uppercase) + 값(`data-role="score"`, mono, `aria-live="polite"`) |
| 생명 셀 | 우측 정렬. 레이블 "생명" + 하트 3개(`data-role="lives"`, `aria-live="polite"`, `aria-label="생명 N"`) |
| 하트 표현 | 채운 하트 `♥`(`--life-heart`, `.life--full`) / 소진 하트 `♥`(`--life-heart-empty`, `.life--empty`). 생명 3→2→1→0 시 오른쪽부터 empty 로 전환 |
| 상태 | 점수·생명 값은 게임 상태(planner §6)와 실시간 동기화 |
| 접근성 | 값 변경 시 `aria-live="polite"` 로 낭독. 하트는 `aria-hidden`, 컨테이너 `aria-label` 로 정수 낭독 |

### 5.3 캔버스 보드 `.board` + 래퍼 `.board-wrap`

| 항목 | 계약 |
|---|---|
| 래퍼 | `position:relative` · aspect-ratio 3/4 · 테두리 `--board-border` · `overflow:hidden` |
| 캔버스 | `role="img"` · `aria-label="벽돌깨기 보드, 점수 N, 생명 M"`(상태 반영) |
| 인터랙션 | `pointerdown`(발사/드래그 시작) · `pointermove`(패들 추종) · `pointerup/cancel`. `setPointerCapture` 로 경계 이탈 대응(planner §5.3) |
| 렌더 요소 | 벽돌 40개 · 공 · 패들 (§4.5 좌표) |

### 5.4 serve 힌트 배너 `.serve-hint`

- pill 배너(`--radius-pill`, `--serve-hint-bg`), 보드 하단 중앙(`bottom: space-5`).
- 문구: "탭 또는 Enter로 발사".
- `status==='serve'` 에서만 표시, 그 외 `hidden`. `pointer-events:none`(클릭 통과).

### 5.5 상태 오버레이 `.board-overlay` + 카드 `.board-overlay__card`

`data-state`(start/paused/gameover/win)로 내용 전환하는 단일 오버레이. `playing`/`serve` 에서는 `hidden`.

| 자식 | 계약 |
|---|---|
| `.overlay__icon` | 상태별 이모지(승리 🎉 / 패배 💥 / 시작·일시정지 없음). 비어있으면 `display:none` |
| `.overlay__title` | 상태별 헤드라인. `data-result="win"`→success 색, `"gameover"`→danger 색. `tabindex="-1"` 로 상태 전환 시 포커스 이동(스크린리더 낭독) |
| `.overlay__desc` | 보조 설명(secondary 색) |
| `.overlay__stat` | 최종 점수(mono). start/paused 에서는 `hidden` |
| `.overlay__actions` | 상태별 버튼 조합(§5.6) |
| 스크림 | `--overlay-scrim`. gameover→`--gameover-tint` / win→`--win-tint` 그라데이션 오버레이로 결과 색조 |

### 5.6 버튼 `.btn` (3 variant)

| variant | 클래스 | 배경 | 텍스트 | 테두리 | 용도 |
|---|---|---|---|---|---|
| primary | `.btn--primary` | `--color-accent` | `--color-accent-on` | 투명 | 시작 / 계속하기 / 다시하기(오버레이) |
| secondary | `.btn--secondary` | `--color-bg-subtle` | text-primary | `--color-border-strong` | 일시정지(컨트롤바) |
| ghost | `.btn--ghost` | 투명 | text-secondary | `--color-border-default` | 메뉴로 / 다시하기(컨트롤바) |

**공통 상태·인터랙션**

| 상태 | 표현 |
|---|---|
| 기본 | `min-height:44px`(터치 타깃 ≥44px, WCAG 2.5.5) · `--radius-md` · sans 600 14px |
| hover | primary→accent-hover / secondary→테두리 밝게 / ghost→subtle 배경 (`:not(:disabled)`) |
| active | `transform: scale(0.97)` (reduced-motion 시 없음) |
| focus-visible | `outline: 2px solid --color-accent; outline-offset:2px` + `box-shadow 0 0 0 4px --color-focus-ring` |
| disabled | `opacity:0.45; cursor:not-allowed` (예: playing 아닐 때 일시정지 버튼) |
| hidden | `display:none` (상태별 노출 제어) |

### 5.7 컨트롤 영역 `.controls`

- `.controls__hint`: "← → 또는 A/D · 화면 드래그로 패들 이동 · Enter/Space/탭 발사 · P 일시정지"(caption, muted).
- `.controls__buttons`: [시작(primary)] [일시정지(secondary, 기본 disabled)] [다시하기(ghost)]. ≥421px 가로, 그 이하 세로 래핑.

### 5.8 noscript 폴백 `.breakout-noscript`

- surface 카드에 "이 게임은 JavaScript가 필요합니다..." 안내(planner §7.5).

---

## 6. 상태별 시각 표현

planner §6.2 상태 전이표의 6개 `status` 를 시각으로 정의한다. **모든 상태 정보는 색/아이콘 + 텍스트 이중 채널**(WCAG 1.4.1).

### 6.1 `start` — 시작 화면

| 요소 | 표현 |
|---|---|
| HUD | 점수 `0` · 생명 하트 3개(전부 full) |
| 보드 | 벽돌 40개(5행 무지개) 미리보기 + 중앙 패들. 공은 패들에 부착 위치 |
| 오버레이 | `data-state="start"` · 아이콘 없음 · 제목 "벽돌깨기" · 설명 "← → 또는 드래그로 패들을 움직이고, 공으로 벽돌 40개를 모두 깨세요" · 통계 hidden |
| 버튼 | 오버레이 [시작(primary)] · 컨트롤바 [시작][일시정지 disabled][다시하기] |

### 6.2 `serve` — 발사 대기

| 요소 | 표현 |
|---|---|
| 오버레이 | 숨김(보드 노출) |
| serve 힌트 | pill 배너 "탭 또는 Enter로 발사" 표시(보드 하단 중앙) |
| 보드 | 공이 패들 위에 부착, 패들 좌우 이동 가능 |
| HUD | 현재 점수·생명 유지(생명 손실 후 재부착이면 감소분 반영) |

### 6.3 `playing` — 진행 중

| 요소 | 표현 |
|---|---|
| 오버레이·힌트 | 모두 숨김(방해 없는 플레이) |
| 보드 | 공 이동·벽/벽돌/패들 반사. 파괴된 벽돌은 사라짐 |
| HUD | 점수 벽돌 파괴마다 +10 즉시 갱신 · 생명 손실 시 하트 감소(`aria-live` 낭독) |
| 컨트롤바 | 일시정지 버튼 enabled |

### 6.4 `paused` — 일시정지

| 요소 | 표현 |
|---|---|
| 오버레이 | `data-state="paused"` · 스크림(기본 색) · 제목 "일시정지" · 설명 "P 또는 계속하기로 재개" · 통계 hidden |
| 보드 | 공·패들·벽돌이 정지 상태로 스크림 아래 보임 |
| 버튼 | [계속하기(primary)] [메뉴로(ghost)] |

### 6.5 `gameover` — 패배

| 요소 | 표현 |
|---|---|
| 오버레이 | `data-state="gameover"` · 스크림에 `--gameover-tint`(빨강 계열) 오버레이 |
| 아이콘 | 💥 |
| 제목 | "게임 오버" — `--color-danger`(`data-result="gameover"`) |
| 설명 | "생명을 모두 잃었어요" |
| 통계 | "최종 점수 {score}" (mono, 강조 표시) |
| 버튼 | [다시하기(primary)] [메뉴로(ghost)] |
| HUD | 생명 하트 3개 전부 empty(`--life-heart-empty`) |

### 6.6 `win` — 승리

| 요소 | 표현 |
|---|---|
| 오버레이 | `data-state="win"` · 스크림에 `--win-tint`(초록 계열) 오버레이 |
| 아이콘 | 🎉 |
| 제목 | "클리어!" — `--color-success`(`data-result="win"`) |
| 설명 | "벽돌 40개를 모두 깼어요" |
| 통계 | "최종 점수 {score}" — success 색 강조 |
| 버튼 | [다시하기(primary)] [메뉴로(ghost)] |

### 6.7 상태 → 버튼 노출 매트릭스

| status | 오버레이 버튼 | 컨트롤바 시작 | 컨트롤바 일시정지 | 컨트롤바 다시하기 |
|---|---|---|---|---|
| start | 시작 | 노출 | disabled | 노출 |
| serve | (오버레이 없음) | 숨김/비활성 | disabled | 노출 |
| playing | (오버레이 없음) | 숨김/비활성 | **enabled** | 노출 |
| paused | 계속하기·메뉴로 | 숨김/비활성 | (일시정지 상태) | 노출 |
| gameover | 다시하기·메뉴로 | 숨김/비활성 | disabled | 노출 |
| win | 다시하기·메뉴로 | 숨김/비활성 | disabled | 노출 |

> 오버레이 버튼과 컨트롤바 버튼의 정확한 노출·활성 로직은 dev 재량(planner §6.2 전이표 우선). 위 표는 시각 의도의 기준선.

### 6.8 모션 · reduced-motion

- 버튼 hover/active 트랜지션은 `--motion-fast(120ms)` `--ease-out`.
- 공/패들 이동(게임 핵심 물리)은 `prefers-reduced-motion` 에서도 유지(planner §7.4).
- 부가 연출(파티클·화면 흔들림)은 비범위 — 시안에 포함하지 않음.

---

## 7. dev 구현 가이드

dev(BF-994)가 따라할 단계별 지침. **핵심: 기존 `phase18-games/breakout/styles.css` 의 공용 토큰·클래스가 이미 본 명세와 일치**하므로, 신규 토큰 발명 없이 그대로 사용한다.

### 7.1 CSS 변수 (신규 정의 금지 — 아래 이름 그대로 사용)

- 표준 토큰: `--color-accent`, `--color-bg-canvas/surface/subtle`, `--color-border-default/strong`, `--color-text-primary/secondary/muted`, `--color-success`, `--color-danger`, `--color-focus-ring` (§2.1)
- Breakout 전용: `--board-bg`, `--paddle-fill/edge`, `--ball-fill/edge`, `--brick-row-1..5`, `--life-heart`, `--life-heart-empty`, `--overlay-scrim`, `--serve-hint-bg`, `--gameover-tint`, `--win-tint` (§2.2)
- 간격·모서리·그림자: `--space-1..7`, `--radius-sm/md/lg/pill`, `--shadow-panel`, `--font-sans/mono`, `--motion-fast`, `--ease-out` (§4.2)

### 7.2 권장 클래스명 (기존 마크업 계약 승계)

| 영역 | 클래스 |
|---|---|
| 앱 컨테이너 | `.breakout-app` |
| 타이틀 | `.breakout-topbar` / `.breakout-topbar__title` |
| HUD | `.hud` / `.hud__cell` / `.hud__cell--lives` / `.hud__label` / `.hud__value` / `.hud__lives` / `.life` / `.life--full` / `.life--empty` |
| 보드 | `.board-wrap` / `.board` / `.serve-hint` |
| 오버레이 | `.board-overlay`(`.is-gameover`/`.is-win`) / `.board-overlay__card` / `.overlay__icon` / `.overlay__title` / `.overlay__desc` / `.overlay__stat` / `.overlay__actions` |
| 컨트롤 | `.controls` / `.controls__hint` / `.controls__buttons` |
| 버튼 | `.btn` / `.btn--primary` / `.btn--secondary` / `.btn--ghost` |
| 폴백 | `.breakout-noscript` |

### 7.3 구현 단계

1. **토큰 확인** — `styles.css :root` 의 §2·§4.2 토큰이 본 명세와 일치하는지 확인(이미 일치). 하드코딩 색상 금지 — 반드시 변수 참조.
2. **레이아웃** — `.breakout-app` 세로 스택(gap `--space-4`), max-width 360px 중앙 정렬(§4.1).
3. **HUD** — 점수(mono, tabular-nums) + 생명 하트 3개. `data-role`·`aria-live`·`aria-label` 로 상태·접근성 바인딩(§5.2).
4. **보드** — `<canvas width="360" height="480">` + `aspect-ratio:3/4` CSS 스케일. `touch-action:none`(§4.3). 캔버스 렌더 색은 §2.2 토큰을 JS 에서 `getComputedStyle(root).getPropertyValue('--paddle-fill')` 등으로 읽거나 상수 미러링.
5. **serve 힌트 / 오버레이** — `hidden` 속성 + `data-state`/`data-result` 로 상태 전환(§5.4·§5.5·§6).
6. **버튼** — 3 variant, `min-height:44px`, `:focus-visible` 포커스 링(§5.6). 상태별 노출은 §6.7.
7. **반응형** — 421px 브레이크포인트에서 컨트롤 버튼 가로 정렬(§4.4).
8. **접근성** — 점수·생명·결과 텍스트 낭독(`aria-live`), 오버레이 제목 `tabindex="-1"` 포커스 이동, reduced-motion 트랜지션 제거(§6.8).

### 7.4 검증 포인트 (시안 대비)

- 색상은 전부 CSS 변수 참조인가(하드코딩 HEX 0건 in styles)?
- 점수·생명·승패 결과가 텍스트로도 표시되는가(색만 의존 금지)?
- 터치 타깃 ≥44px, focus-visible 링 노출되는가?
- 캔버스 논리 해상도 360×480 유지 + 3:4 스케일인가?
- `file://` 로 열어도 외부 요청 0건인가?

> **주의:** 본 mockup HTML 은 시각 시뮬레이션이며 dev 의 실제 산출물이 아니다. 픽셀 단위 일치 의무는 없고, 토큰·레이아웃·상태 시각 의도만 준수하면 된다.

---

## 8. mockup 참조 / 남은 모호함

### 8.1 mockup 참조

- 경로: **`docs/design/mockups/breakout-BF-988.html`**
- 성격: 단일 self-contained HTML(외부 의존성 0건, system font). `file://` 로 바로 열람 가능.
- 내용: §2 토큰 팔레트 스와치 + start/serve/playing/paused/gameover/win **6개 상태를 `<section>` 으로 병렬 배치**해 상태별 시각 표현을 한 화면에서 비교. 캔버스 대신 CSS 로 벽돌·공·패들을 정적 렌더해 UX 의도 전달.
- markdown 의 컬러/타이포/레이아웃과 동기화됨.

### 8.2 남은 모호함 (운영자/후속 task 확인 권장)

1. **공용 토큰 값 변경 필요 여부**: 본 명세는 기존 검증된 phase18 공용 팔레트를 그대로 승계했다(§0 전제 1). 다른 브랜드 색·간격을 원하면 운영자가 §2 개정을 요청해야 하며, 기존 `styles.css` 도 함께 갱신 대상이 된다.
2. **`serve` 상태 "메뉴로" 노출 여부**: planner §13.2-3 과 동일한 미결정 사항 — `serve→start` 전이가 planner 전이표에 없다. 본 시안은 serve 에서 오버레이·메뉴 버튼을 노출하지 않는 것으로 표현했다(발사 대기 몰입). 발사 대기 화면에서도 메뉴 복귀가 필요하면 planner §6.2 개정 후 반영.
3. **벽돌 행 색상 심미 vs 의미**: 5행 무지개 색은 내구도·점수 차등이 아니라 순수 시각 구분(planner: 전 벽돌 내구도 1·고정 10점). 색을 난이도 신호로 재해석하지 말 것.

---

## Self-critique

PR commit 직전 자기 점검(5 항목):

1. **AC 매핑** — BF-992 AC 2건(레이아웃·토큰 매핑·상태별 시각 표현 / 공용 토큰 일관성·`file://` 열람)을 §1.3 표에서 명세 섹션과 1:1 매핑. ✅
2. **dev 구현 가이드** — §7 에 CSS 변수명·클래스명·8단계 절차·검증 포인트 명시. 신규 토큰 발명 금지, 기존 공용 토큰 재사용을 명령. ✅
3. **기존 요소 보존** — `phase18-games/breakout/styles.css`·`index.html` 의 공용 토큰·클래스·마크업 계약을 그대로 승계(§2·§7.2). 재발명 없음. ✅
4. **컴포넌트 매핑** — HUD·보드·serve 힌트·오버레이·버튼 3종·컨트롤·noscript 를 planner §6 상태 모델·§7 화면 요구와 매핑(§5·§6). 6개 status 전부 시각 정의. ✅
5. **모호함 flag** — 공용 토큰 변경 여부·`serve` 메뉴 노출·벽돌 색 의미를 §8.2 에 명시적으로 flag. planner §13.2 미결정 사항 승계. ✅

**남은 리스크:** 캔버스 내부 렌더 색을 dev 가 JS 상수로 미러링할지 `getComputedStyle` 로 읽을지는 dev 재량으로 남김(§7.3-4) — 시안 의도(토큰 단일 출처)만 전달하면 충분하다고 판단.

---

*문서 종료 — [이디자인] · BF-992 (벽돌깨기 UI 디자인 명세, Epic BF-988)*
