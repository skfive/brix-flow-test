# Pong 아케이드 디자인 명세 — BF-910 (Phase 18 games · pong 1/1)

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-912 (본 designer task) · BF-910 (상위 Epic, File Ownership 원문) · BF-911 (planner 산출물)
> 대상 라우트: `/phase18-games/pong` (= 저장소 최상위 `phase18-games/pong/`, 신규 디렉터리 — planner §0 가정 1)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CDN·웹폰트 금지, system font, CSS 변수 자체 정의
> 기획 SSOT(수정 금지): `docs/planning/pong-BF-910.md` (planner [박기획] · BF-911) — 물리 상수·상태 전이·AC의 단일 진실
> mockup 참조: `docs/design/mockups/pong-BF-910.html` (본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제

본 문서는 planner 명세(`docs/planning/pong-BF-910.md`)를 **시각 디자인**으로 구체화한 designer 산출물이다. 코드 구현은 후속 dev task 담당이며, 본 문서는 컬러/타이포/레이아웃/컴포넌트 토큰 + dev 구현 가이드까지만 정의한다(코드·물리 로직은 정의하지 않음).

**핵심 디자인 원칙 — "기존 아케이드 계열과 일관, 클래식 Pong 시각언어 재현":**
`pong`은 신규 module이지만 시각 언어를 새로 발명하지 않는다. 저장소의 기존 게임 계열(`tetris`/`snake`/`game-2048`/`dice`)이 공유하는 **다크 아케이드 테마 + brix-Flow 표준 토큰 네이밍**(`--color-bg-*`/`--color-text-*`/`--color-accent`/`--space-*`/`--radius-*`/`--text-*`)을 그대로 승계하고, 그 위에 클래식 Pong 고유의 **모노톤 코트(검은 배경 · 흰 공 · 점선 네트)** 시각을 코트 전용 토큰(`--court-*`/`--ball-*`/`--paddle-*`)으로 얹는다. 신규 색 리터럴은 코트/패들 표현에 꼭 필요한 최소치로 제한한다(§2.3에 근거 명시).

**전제 — vanilla-static 제약(TECH_STACK_POLICY):**
- 외부 의존성 0건. CDN·Google Fonts 금지 → **system font stack만 사용**(`system-ui, -apple-system, sans-serif` / `ui-monospace, Menlo, monospace`).
- 디자인 토큰 파일(design-tokens.json) 없음 → CSS 변수는 각 산출물(`styles.css`) `:root`에 **직접 정의**. 본 명세가 그 SSOT 값을 확정한다.
- mockup HTML은 단일 self-contained 파일 — 외부 link/script 0건.

**테마 결정 — 다크 단일(라이트 팔레트 미발명):**
클래식 Pong의 정체성(어두운 오락실 CRT 톤)과 기존 게임 계열(`tetris`/`snake`은 다크 default)의 일관성을 근거로 **다크 단일 테마**로 확정한다. 라이트 오버라이드·테마 토글은 v1 비범위(§11-planner). 이 결정과 파급은 §8.4 모호함에 flag 한다.

**렌더링 전제:** 코트는 planner §3.1대로 `<canvas>` 800×400 논리 해상도를 CSS로 반응형 스케일한다. **mockup HTML의 코트는 실제 canvas가 아니라 CSS로 시뮬레이션한 정적 시안**이다(공/패들 위치는 대표 프레임 값). dev는 mockup을 시각 가이드로 참조하되 픽셀 단위 일치 의무는 없다.

**경로 참고:** 산출물은 File Ownership(`docs/design/**`) 내 2개 — 명세 `docs/design/pong-BF-910.md` + mockup `docs/design/mockups/pong-BF-910.html`. 파일명 키는 task 지시(`docs/design/pong-BF-910.md`)와 planner 규약에 맞춰 **Epic key `BF-910`**(pong 기능 공유 키)을 사용한다(본 task 번호 BF-912가 아님 — spec↔mockup↔planning 파일 정합). `phase18-games/pong/*` 코드는 후속 dev task 담당이며 본 task에서 생성하지 않는다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑 및 Self-critique](#8-ac-매핑-및-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

| 항목 | 내용 |
|---|---|
| 신규 화면 | `phase18-games/pong/` — 1인용 Pong(플레이어 좌측 vs CPU 우측), 아케이드 보드 + 360px 터치 컨트롤 |
| 화면 구조 | 상단바(타이틀) → 스코어보드 → 코트(canvas) → 조작 안내 + 버튼, 세로 스택(planner §7.1) |
| 상태 오버레이 | `start` / `paused` / `gameover` 3종 + `point-paused`(득점 후 자동 서브 카운트) — 코트 위에 겹침(§5.4) |
| 디자인 언어 | 기존 게임 계열 다크 아케이드 테마 + brix-Flow 표준 토큰 승계, 코트만 클래식 Pong 모노톤 |
| 신규 시각 요소 | 코트 전용 토큰(`--court-*`/`--ball-*`/`--paddle-*`) — 최소치(§2.3) |
| 테마 | **다크 단일**(§0) |
| 접근성 | 스코어 라이브 리전, 버튼 포커스 링, 패들 색상 + 위치(좌/우) 이중 인코딩, `<noscript>` 폴백 |

### 1.2 사용자 경험 목표 (planner §1.1 승계)

- **진입 즉시** "이건 Pong이다"가 읽히도록 — 검은 코트 · 점선 네트 · 좌우 패들 · 흰 공의 클래식 실루엣을 첫 프레임에 제시한다.
- **360px 소형 모바일**에서도 코트가 가로 스크롤 없이 표시되고, 코트 어디든 손가락을 대 위/아래로 끌면 좌측 패들이 즉시 따라오는 "직접 조작" 체감을 준다(planner §5.3).
- **스코어보드**는 항상 `플레이어 N : M CPU`로 한눈에 읽히고, 득점 시 값이 갱신되며 라이브 리전으로 스크린리더에도 전달된다.
- **상태 전이가 시각적으로 명확** — 시작/일시정지/게임오버가 코트 위 오버레이 카드로 구분되어, 지금 무엇을 눌러야 하는지(시작·계속·다시하기)가 버튼으로 즉시 드러난다.

### 1.3 화면 상태 요약 (planner §6.2 상태 → 시각 매핑)

| status | 코트 표현 | 오버레이 | 주요 버튼 |
|---|---|---|---|
| `start` | 코트 정적(패들 중앙, 공 중앙 대기) + 어둡게 딤 | **시작 오버레이**(타이틀 + 조작 안내) | 시작 (primary) |
| `playing` | 패들·공 실시간 이동, 오버레이 없음 | 없음 | 일시정지 (secondary) · 재시작 (ghost) |
| `point-paused` | 공 중앙 리셋, 짧은 카운트 | **서브 카운트 배지**(코트 중앙 상단, ~800ms) | (자동 진행) |
| `paused` | 코트 그대로 딤 | **일시정지 오버레이** | 계속하기 (primary) · 메뉴로 (ghost) |
| `gameover` | 코트 딤 | **결과 오버레이**(승자 + 최종 점수) | 다시하기 (primary) · 메뉴로 (ghost) |
| JS 비활성 | — | `<noscript>` 안내 문구 | — |

---

## 2. 컬러 팔레트

전부 HEX(또는 rgba) 값으로 확정한다. dev는 `phase18-games/pong/styles.css` `:root`에 아래 토큰을 그대로 정의한다.

### 2.1 표준 토큰 (다크 아케이드 — 기존 게임 계열 승계)

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 페이지 배경 | `--color-bg-canvas` | `#0B0F17` | `body` 배경 |
| 표면 | `--color-bg-surface` | `#141B26` | 스코어보드 · 오버레이 카드 배경 |
| 미묘 표면 | `--color-bg-subtle` | `#1C2431` | 버튼(secondary/ghost) 기본 배경 · 조작 안내 배경 |
| 기본 테두리 | `--color-border-default` | `#273140` | 카드 · 코트 프레임 테두리 |
| 강조 테두리 | `--color-border-strong` | `#3A4657` | 포커스 아닌 hover 테두리 |
| 본문 텍스트 | `--color-text-primary` | `#E8EDF4` | 점수 · 제목 · 버튼 라벨 |
| 보조 텍스트 | `--color-text-secondary` | `#9AA7B8` | 스코어 라벨(플레이어/CPU) · 안내문 |
| 흐린 텍스트 | `--color-text-muted` | `#63708A` | 캡션 · 비활성 |
| 강조(브랜드) | `--color-accent` | `#5B82F0` | primary 버튼 배경 · 포커스 링(기존 `tetris --color-accent` 승계) |
| 강조 hover | `--color-accent-hover` | `#6E90F5` | primary 버튼 hover |
| 강조 위 텍스트 | `--color-accent-on` | `#0B0F17` | primary 버튼 라벨(대비 확보) |
| 포커스 링 | `--color-focus-ring` | `rgba(91,130,240,0.55)` | 키보드 포커스 3px 아웃라인 |
| 위험/승패 강조 | `--color-danger` | `#E55858` | (예비) 패배 톤 · 경고 |

### 2.2 코트 전용 토큰 (클래식 Pong 모노톤)

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 코트 배경 | `--court-bg` | `#05070C` | canvas 배경(CRT 블랙) |
| 코트 경계선 | `--court-line` | `rgba(232,237,244,0.28)` | 코트 상/하 경계 · 프레임 내부선 |
| 네트(점선) | `--court-net` | `rgba(232,237,244,0.55)` | 중앙 세로 점선 |
| 공 | `--ball-color` | `#F5F7FA` | 흰 공(순백) |
| 공 잔상 | `--ball-trail` | `rgba(245,247,250,0.18)` | 공 이동 방향 잔상(연출, 선택) |
| 플레이어 패들 | `--paddle-player` | `#4ADE80` | 좌측 패들(쿨 그린 — 사용자 조작) |
| 플레이어 글로우 | `--paddle-player-glow` | `rgba(74,222,128,0.40)` | 좌측 패들 발광 |
| CPU 패들 | `--paddle-cpu` | `#F59E6B` | 우측 패들(웜 앰버 — 자동) |
| CPU 글로우 | `--paddle-cpu-glow` | `rgba(245,158,107,0.40)` | 우측 패들 발광 |
| 오버레이 딤 | `--overlay-scrim` | `rgba(5,7,12,0.72)` | start/paused/gameover 시 코트 딤 막 |

### 2.3 신규 색 리터럴 최소화 근거

- 표준 토큰(§2.1)은 기존 게임 계열의 다크 아케이드 팔레트를 승계 — `--color-accent(#5B82F0)`는 `tetris/styles.css` 승계값과 동일 계열.
- 코트 전용 신규 리터럴은 **클래식 Pong 표현에 불가결한 5색**뿐: 코트 블랙 · 흰 공 · 흰 네트/경계 · 플레이어 그린 · CPU 앰버.
- **패들 색상 코딩(그린/앰버) 결정**: 클래식 Pong은 완전 모노톤이지만, 1인용에서 "내 패들이 어느 쪽인지"를 색으로 즉시 구분하면 UX가 개선된다. 색상은 **위치(좌=플레이어/우=CPU)와 이중 인코딩**되므로 색각 이상 사용자도 위치로 판별 가능(색상 단독 의존 아님). 이 결정은 §8.4에 모호함으로 flag(운영자가 순수 모노톤을 원하면 두 패들 모두 `--court-line` 계열로 통일 가능).
- 대비: 흰 공(`#F5F7FA`)/코트 블랙(`#05070C`) 대비 ≈ 19:1, primary 버튼 라벨(`#0B0F17`)/accent(`#5B82F0`) 대비 ≈ 7.4:1 — WCAG AA(4.5:1) 초과.

---

## 3. 타이포그래피

system font stack만 사용(webfont 금지). 스코어·서브 카운트 등 아케이드 수치는 **mono**로, 그 외 UI는 **sans**로.

### 3.1 폰트 스택

| 토큰 | 값 |
|---|---|
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif` |
| `--font-mono` | `ui-monospace, Menlo, Consolas, "Courier New", monospace` |

### 3.2 타이포 스케일

| 토큰 | 조합 (weight size/line-height family) | 용도 |
|---|---|---|
| `--text-h1` | `600 20px/1.3 var(--font-sans)` | 상단바 "Pong 아케이드" 타이틀 |
| `--text-score` | `700 clamp(40px, 12vw, 64px)/1 var(--font-mono)` | 스코어 숫자(반응형 축소) |
| `--text-score-sep` | `400 clamp(28px, 8vw, 44px)/1 var(--font-mono)` | 스코어 구분자 `:` |
| `--text-score-label` | `600 12px/1.2 var(--font-sans)` | "플레이어" / "CPU" 라벨(대문자 letter-spacing) |
| `--text-overlay-title` | `700 clamp(24px, 7vw, 34px)/1.2 var(--font-mono)` | 오버레이 타이틀("일시정지" · "플레이어 승리!") |
| `--text-body` | `400 15px/1.5 var(--font-sans)` | 조작 안내 · 오버레이 본문 |
| `--text-button` | `600 14px/1 var(--font-sans)` | 버튼 라벨 |
| `--text-caption` | `400 13px/1.4 var(--font-sans)` | 서브 카운트 · 보조 캡션 |

### 3.3 규칙

- 스코어 라벨("플레이어"/"CPU")은 `text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-secondary)`로 아케이드 톤.
- 스코어 숫자는 `--text-score`(mono, 고정폭)로 자릿수 변동 시에도 좌우 흔들림 없음. `font-variant-numeric: tabular-nums`.
- 승자 오버레이 타이틀은 `--paddle-player`(플레이어 승) 또는 `--paddle-cpu`(CPU 승) 색으로 렌더 — 위치/텍스트("플레이어 승리")와 병행하므로 색상 단독 아님.

---

## 4. 레이아웃

### 4.1 페이지 구조 (planner §7.1 시각화)

```
<body>                                         ← 배경 --color-bg-canvas, 세로 중앙 정렬
 └─ <div class="pong-app">  (max-width 840px, 세로 스택, gap --space-5)
     ├─ <header class="pong-topbar">           ← "Pong 아케이드" 타이틀 (좌측 정렬)
     ├─ <div class="pong-scoreboard">          ← [플레이어 N] : [M CPU]
     │     role="status" aria-live="polite"
     ├─ <div class="pong-court-wrap">          ← 코트 프레임(테두리·radius) + 오버레이 레이어
     │     ├─ <canvas id="court" width="800" height="400">
     │     └─ <div class="pong-overlay" data-state="...">  ← start/paused/gameover/point-paused
     └─ <div class="pong-controls">            ← 조작 안내문 + 버튼 행
           ├─ <p class="pong-hint">↑ / ↓ 또는 코트를 드래그해 패들을 움직이세요
           └─ <div class="pong-buttons"> [시작] [일시정지] [재시작]
```

### 4.2 코트(canvas) 반응형 (planner §7.2)

| 속성 | 값 |
|---|---|
| 논리 해상도 | `width="800" height="400"` (불변, 물리 좌표계) |
| CSS 크기 | `width: 100%; max-width: 800px; height: auto; aspect-ratio: 2 / 1;` |
| 프레임 | `border: 2px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--court-bg);` |
| 드래그 | `touch-action: none;` (드래그 중 스크롤/줌 차단, planner §5.3) |
| 360px 하한 | 페이지 좌우 패딩 `--space-4(16px)` → 코트 표시 폭 ≥ ~320px 확보(planner §7.2) |

### 4.3 spacing / breakpoint

| 구간 | 규칙 |
|---|---|
| 페이지 패딩 | `--space-4`(16px) 좌우, `--space-5`(24px) 상하 |
| 스택 gap | 섹션 간 `--space-5`(24px) |
| ≥ 640px | 코트 최대 840px 컨테이너 중앙, 스코어보드 숫자 최대(64px), 버튼 가로 배치 |
| ≤ 480px | 스코어 숫자 `clamp` 하한(40px)까지 축소, 조작 안내 2줄 허용 |
| ≤ 360px | 버튼은 가로 유지하되 padding 축소(`--space-3`), 안내문 캡션 크기, 코트 폭 100% |
| 세로/가로 회전 | 코트 CSS 크기만 변동, 논리 좌표 불변 → 포인터 변환식 자동 대응(planner §7.2, 리사이즈 핸들러 불필요) |

### 4.4 스코어보드 배치

- 3분할 그리드: `[플레이어 영역] [구분자 :] [CPU 영역]`, `justify-content: center; align-items: baseline; gap: --space-4`.
- 플레이어 영역은 좌측(라벨 아래 숫자), CPU 영역은 우측 — 코트의 좌/우 패들 배치와 공간적으로 일치(왼쪽=플레이어 시각 앵커).
- 각 숫자 위 라벨을 배치해 색(그린/앰버)과 무관하게 텍스트로도 구분.

---

## 5. 컴포넌트 명세

각 컴포넌트의 구조 / 상태 / 인터랙션을 정의한다. props는 vanilla이므로 **DOM 속성·data-state·CSS 클래스 계약**으로 표현한다.

### 5.1 상단바 `pong-topbar`

| 항목 | 값 |
|---|---|
| 구조 | `<header class="pong-topbar"><h1 class="pong-topbar__title">Pong 아케이드</h1></header>` |
| 타이포 | `--text-h1`, `color: var(--color-text-primary)` |
| 상태 | 정적(무상태) |

### 5.2 스코어보드 `pong-scoreboard`

| 항목 | 값 |
|---|---|
| 구조 | `<div class="pong-scoreboard" role="status" aria-live="polite" aria-atomic="true">` → `.pong-score--player`(라벨 "플레이어" + 숫자) · `.pong-score__sep`(`:`) · `.pong-score--cpu`(숫자 + 라벨 "CPU") |
| data 계약 | 숫자 span: `data-role="player-score"` / `data-role="cpu-score"` (dev가 textContent 갱신) |
| 접근성 | 컨테이너 `aria-live="polite"` → 점수 변동 시 "플레이어 7 대 4 CPU"류 읽힘. `aria-label`은 dev가 `플레이어 {n}점, CPU {m}점`으로 합성 |
| 상태 | 점수 값에 따라 숫자만 변경. 승리 임박(10점)·게임오버 시 별도 색 강조는 v1 미포함(§8.4) |
| 인터랙션 | 없음(표시 전용) |

### 5.3 코트 `pong-court-wrap` + `<canvas#court>`

| 요소 | 시각 정의 |
|---|---|
| 코트 배경 | `--court-bg`, 상/하 경계에 `--court-line` 얇은 선(canvas 내부 렌더) |
| 중앙 네트 | 세로 점선 — dash 14px / gap 12px, `--court-net`, 폭 4px, 코트 정중앙(x=W/2) |
| 플레이어 패들 | 좌측(`x=24`), `12×80`(논리), `--paddle-player` + `box-shadow`류 글로우(`--paddle-player-glow`), 모서리 radius 3px |
| CPU 패들 | 우측(`x=764`), 동일 크기, `--paddle-cpu` + `--paddle-cpu-glow` |
| 공 | `--ball-color` 원(반지름 8), 이동 방향 반대편에 `--ball-trail` 짧은 잔상(선택 연출, planner §11 부가연출 최소) |
| 드래그 힌트 | `playing` 진입 후 첫 조작 전까지 코트 하단에 반투명 "드래그해 이동" 힌트(1회성, 선택) |

- **인터랙션(터치/포인터)**: 코트 전체가 드래그 히트 영역(planner §5.3). `cursor: ns-resize`(데스크톱 hover 시 세로 이동 암시). `touch-action: none`.
- mockup에서는 canvas를 CSS로 시뮬레이션(정적 패들·공·네트 배치)한다.

### 5.4 오버레이 `pong-overlay[data-state]`

코트 위 절대 배치 레이어. `--overlay-scrim` 딤 막 + 중앙 카드(`--color-bg-surface`, `--radius-lg`, `--shadow-panel`).

| data-state | 표시 | 카드 내용 |
|---|---|---|
| `start` | 진입 기본 | 타이틀 "Pong 아케이드" + 본문 "11점 먼저 내면 승리 · ↑/↓ 또는 드래그로 조작" + [시작] primary 버튼 |
| `point-paused` | 득점 직후 ~800ms | 딤 없이 코트 중앙 상단 **배지**만("서브 준비…" 캡션, 카운트 점 애니메이션 없이 정적 표기 가능) |
| `paused` | 일시정지 | 타이틀 "일시정지" + [계속하기] primary · [메뉴로] ghost |
| `gameover` | 승패 확정 | 타이틀 "플레이어 승리!" 또는 "CPU 승리" (승자 색) + 본문 최종 점수 "11 : 9" + [다시하기] primary · [메뉴로] ghost |
| (없음) | `playing` | 오버레이 미표시(`hidden`) |

- 접근성: 오버레이 등장 시 `role="dialog" aria-modal` 은 과함(게임 흐름) — 대신 카드 타이틀에 포커스 이동 + primary 버튼이 첫 tab 대상. `Enter`/`Space`로 primary 동작 트리거(planner §5.2 키맵과 일치).
- `point-paused` 배지는 상호작용 없는 순수 표시(자동 진행).

### 5.5 버튼 `pong-btn` (3 variant)

| variant | 클래스 | 기본 | hover | active | focus-visible | disabled |
|---|---|---|---|---|---|---|
| primary | `.pong-btn--primary` | bg `--color-accent`, 라벨 `--color-accent-on` | bg `--color-accent-hover` | `translateY(1px)` | 3px `--color-focus-ring` outline(offset 2px) | opacity .5, `cursor:not-allowed` |
| secondary | `.pong-btn--secondary` | bg `--color-bg-subtle`, 라벨 `--color-text-primary`, 테두리 `--color-border-default` | 테두리 `--color-border-strong` | `translateY(1px)` | 동일 outline | 동일 |
| ghost | `.pong-btn--ghost` | 투명 bg, 라벨 `--color-text-secondary` | 라벨 `--color-text-primary`, bg `--color-bg-subtle` | `translateY(1px)` | 동일 outline | 동일 |

- 공통: `padding: --space-3 --space-5`, `border-radius: --radius-md`, `--text-button`, `min-height: 44px`(터치 타깃 ≥44px), `transition: background var(--motion-fast), transform var(--motion-fast)`.
- **버튼 상태 대응**(planner §6.2): 하단 컨트롤 바의 [시작]은 `status=start`일 때만, [일시정지]는 `playing`일 때만 enabled — 나머지는 오버레이 카드의 버튼이 주 동작 경로. dev는 상태별로 disabled/hidden 토글.

### 5.6 조작 안내 `pong-hint`

| 항목 | 값 |
|---|---|
| 구조 | `<p class="pong-hint">` — 아이콘 텍스트("↑ / ↓") + "또는 코트를 드래그해 패들을 움직이세요" |
| 타이포 | `--text-body`, `color: var(--color-text-secondary)` |
| 배경 | `--color-bg-subtle`, `--radius-md`, `padding --space-3 --space-4` |

### 5.7 `<noscript>` 폴백 (planner §7.4)

`<noscript>` 내 `.pong-noscript` 카드 — "이 게임은 JavaScript가 필요합니다" (`--color-bg-surface`, `--color-text-primary`, 중앙 정렬).

---

## 6. dev 구현 가이드

dev-1이 `phase18-games/pong/`(`index.html`/`styles.css`/`logic.js`/`main.js`, planner §12)를 구현할 때 따를 시각 계약. **물리·상태 로직은 planner SSOT(`docs/planning/pong-BF-910.md`)를, 시각은 본 명세를 참조.**

### 6.1 토큰 정의 (styles.css `:root`)

§2·§3의 토큰을 `:root`에 그대로 정의. 하드코딩 색 리터럴 금지 — 코트 canvas 렌더 시에도 `getComputedStyle(document.documentElement).getPropertyValue('--paddle-player')`류로 토큰 값을 읽어 `ctx.fillStyle`에 주입(색 SSOT 유지). 예:

```css
:root {
  --color-bg-canvas:#0B0F17; --color-bg-surface:#141B26; --color-bg-subtle:#1C2431;
  --color-border-default:#273140; --color-border-strong:#3A4657;
  --color-text-primary:#E8EDF4; --color-text-secondary:#9AA7B8; --color-text-muted:#63708A;
  --color-accent:#5B82F0; --color-accent-hover:#6E90F5; --color-accent-on:#0B0F17;
  --color-focus-ring:rgba(91,130,240,.55); --color-danger:#E55858;
  --court-bg:#05070C; --court-line:rgba(232,237,244,.28); --court-net:rgba(232,237,244,.55);
  --ball-color:#F5F7FA; --ball-trail:rgba(245,247,250,.18);
  --paddle-player:#4ADE80; --paddle-player-glow:rgba(74,222,128,.40);
  --paddle-cpu:#F59E6B;   --paddle-cpu-glow:rgba(245,158,107,.40);
  --overlay-scrim:rgba(5,7,12,.72);
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:24px;--space-6:32px;--space-7:48px;
  --radius-sm:4px;--radius-md:8px;--radius-lg:12px;--radius-pill:999px;
  --shadow-panel:0 8px 32px rgba(0,0,0,.45);
  --font-sans:system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  --font-mono:ui-monospace,Menlo,Consolas,"Courier New",monospace;
  --motion-fast:120ms; --ease-out:cubic-bezier(.16,1,.3,1);
}
```

### 6.2 canvas 렌더 순서 (매 프레임)

1. `clearRect` 후 `--court-bg`로 코트 fill
2. 상/하 경계선(`--court-line`)
3. 중앙 세로 네트(점선, `--court-net`) — `setLineDash([14,12])`
4. 플레이어 패들(`--paddle-player`, 선택적 `shadowBlur`로 글로우), CPU 패들(`--paddle-cpu`)
5. 공(`--ball-color`), 선택적 잔상(`--ball-trail`)
> 색은 `:root` 토큰을 1회 읽어 캐시(리사이즈/테마 변화 없으므로 매 프레임 재조회 불필요).

### 6.3 클래스/DOM 계약 (권장 네이밍)

| 영역 | 클래스 / 속성 |
|---|---|
| 루트 | `.pong-app` |
| 상단바 | `.pong-topbar`, `.pong-topbar__title` |
| 스코어 | `.pong-scoreboard`(`role=status aria-live=polite aria-atomic=true`), `.pong-score--player`, `.pong-score--cpu`, `.pong-score__label`, `.pong-score__value[data-role]`, `.pong-score__sep` |
| 코트 | `.pong-court-wrap`, `<canvas id="court" width=800 height=400>`(`touch-action:none`) |
| 오버레이 | `.pong-overlay[data-state="start\|point-paused\|paused\|gameover"]`(playing 시 `hidden`), `.pong-overlay__card`, `.pong-overlay__title`, `.pong-overlay__body`, `.pong-overlay__actions` |
| 버튼 | `.pong-btn`, `.pong-btn--primary\|--secondary\|--ghost` |
| 안내 | `.pong-hint`, `.pong-controls`, `.pong-buttons` |
| 폴백 | `.pong-noscript`(`<noscript>` 내) |

### 6.4 상태 → 시각 전환 구현 지침 (planner §6.2 매핑)

- `data-state` 하나로 오버레이 종류 전환(CSS 선택자로 카드 내용/버튼 노출). `playing`은 오버레이 `hidden`.
- 오버레이 등장 시 카드 타이틀(`tabindex="-1"`)에 `focus()` 이동, 첫 primary 버튼이 자연 tab 순서 선두.
- `point-paused`는 딤 없이 코트 중앙 상단 배지(`.pong-overlay[data-state=point-paused]`는 scrim opacity 0)로 — 게임 화면을 가리지 않음.
- 승자 오버레이 타이틀 색은 `winner==='player' ? --paddle-player : --paddle-cpu`, 텍스트는 "플레이어 승리!"/"CPU 승리"로 색+텍스트 병행.

### 6.5 접근성 체크리스트

- [ ] 모든 버튼 `:focus-visible` 3px `--color-focus-ring` outline(offset 2px)
- [ ] 스코어 컨테이너 `aria-live="polite" aria-atomic="true"`, `aria-label` 점수 합성
- [ ] 터치 타깃(버튼) `min-height:44px`
- [ ] 패들 구분 색상 + 위치(좌/우) 이중 인코딩(색각 이상 대응)
- [ ] canvas에 `role="img"` + `aria-label`(예: "Pong 코트, 플레이어 7점 CPU 4점")로 현재 스코어 대체 텍스트 제공(선택 강화)
- [ ] `<noscript>` 폴백 문구

### 6.6 하지 말 것

- webfont/CDN 로드 금지(vanilla-static) — system font만.
- 하드코딩 색 리터럴(canvas fillStyle 포함) — 토큰 경유.
- 물리 상수/상태 전이 변경 — planner SSOT 고정(변경 필요 시 Jira 코멘트 후 planner 문서 개정).

---

## 7. mockup 참조

- 파일: **`docs/design/mockups/pong-BF-910.html`** (본 명세와 함께 작성 · system 자동 screenshot capture 경로)
- 단일 self-contained HTML(외부 의존성 0건, system font). 갤러리 셸 안에 상태별 프레임을 나열:
  1. **플레이 중**(`playing`) — 스코어 7:4, 코트·패들·공·네트, 하단 컨트롤
  2. **시작**(`start` 오버레이)
  3. **일시정지**(`paused` 오버레이)
  4. **게임오버**(`gameover` 오버레이, 플레이어 승 11:9)
  5. **360px 터치 프레임** — 소형 뷰포트 + 드래그 조작 힌트
  6. **버튼 상태 팔레트** — primary/secondary/ghost의 기본/hover/active/focus/disabled
- mockup 셸(갤러리·프레임 라벨)은 시각 설명용이며 **실제 dev 산출물이 아니다**. dev는 프레임 내부의 `.pong-*` 구성을 시각 가이드로 참조하되 픽셀 일치 의무 없음.

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-912 수용 기준 매핑

| 수용 기준 | 충족 근거 |
|---|---|
| Given s1 기획 명세, When 디자인 명세 작성, Then `docs/design/pong-BF-910.md`에 아케이드 보드·터치 컨트롤·토큰 매핑 정의 + mockup 시각화 | 아케이드 보드=§4.2·§5.3, 터치 컨트롤=§5.3(코트 드래그)·§6.4·360px 프레임(§7-5), 토큰 매핑=§2·§3·§6.1, mockup=`docs/design/mockups/pong-BF-910.html`(§7) |
| Given 기존 데모 게임, When 시안 확정, Then 디자인 일관성 + 토큰 정합성 유지 | 다크 아케이드 테마 + brix-Flow 표준 토큰 네이밍 승계(§0·§2.1), `--color-accent` 등 `tetris` 승계값 재사용(§2.3), 신규 리터럴 코트 5색으로 최소화(§2.3) |

### 8.2 planner AC → 시각 커버리지

| planner AC | 본 명세 커버 |
|---|---|
| AC-STATE-01~06 (상태 전이) | §1.3 상태→시각 표 + §5.4 오버레이 data-state + §6.4 전환 지침 |
| AC-TOUCH-01/02 (360px 드래그·포인터 캡처) | §4.2 `touch-action:none` + §5.3 코트 드래그 히트 영역 + §7-5 360px 프레임 |
| AC-RULE-01~05 (물리) | 시각 표현: §5.3 코트 요소(패들 반사·네트·공). 로직은 planner SSOT(본 명세 비침범) |

### 8.3 Self-critique 5항목

1. **AC 매핑** — BF-912 AC 2개(§8.1) + planner AC(§8.2) 모두 시각 요소로 매핑됨. 누락 없음.
2. **dev 구현 가이드** — §6에 토큰 `:root` 전량, canvas 렌더 순서, DOM/클래스 계약, 상태 전환, 접근성 체크리스트, 금지사항 제공 → dev가 추가 질의 없이 착수 가능.
3. **기존 요소 보존** — 신규 module이라 보존할 기존 코드는 없음. 대신 **기존 게임 계열의 디자인 언어(다크 아케이드·표준 토큰)**를 보존/승계(§0·§2.1). 신규 색 리터럴을 코트 5색으로 제한해 토큰 정합성 유지(§2.3).
4. **컴포넌트 매핑** — planner 화면 요구(§7.1: 상단바·스코어보드·canvas·조작안내/버튼)와 상태 모델(§6.2)이 본 명세 컴포넌트(§5.1~5.7)에 1:1 매핑. 오버레이 4상태 + 버튼 3variant까지 상태별 정의.
5. **모호함 flag** — 아래 §8.4.

### 8.4 남은 모호함 (dev/운영자 확인 권장)

- **[M1] 패들 색상 코딩 vs 순수 모노톤**: 본 명세는 플레이어=그린/CPU=앰버 색 구분(§2.3, 위치와 이중 인코딩)을 채택. 운영자가 클래식 순수 모노톤(양쪽 흰색)을 선호하면 두 패들 토큰을 `--court-line` 계열로 통일. → **designer 재량 결정, 반대 의견 시 Jira 코멘트로 조정.**
- **[M2] 공 잔상·글로우 연출 범위**: planner §11이 부가 연출을 v1 비범위로 둠. 본 명세는 잔상/글로우를 **선택(optional)**으로 표기(§5.3·§6.2) — dev가 성능/단순성 우선 시 생략 가능. 필수 아님.
- **[M3] 승리 임박(10점) 스코어 강조**: v1 미포함(§5.2). 필요 시 후속 개선.
- **[M4] `point-paused` 카운트 표현**: "서브 준비…" 정적 배지로 확정(§5.4). 카운트다운 숫자/애니메이션은 비범위(reduced-motion·단순성).
- **[M5] canvas `role="img"` 대체 텍스트**: 접근성 강화 옵션으로 제시(§6.5) — 필수 아니나 권장. dev 재량.

---

<!-- bf:pr-summary -->
## 시안 요약

**BF-912 · Pong 아케이드 디자인 명세 + mockup** — 신규 module `pong`(`/phase18-games/pong`)의 아케이드 보드 레이아웃과 360px 터치 컨트롤 UI 시안을 확정.

- **디자인 언어**: 기존 게임 계열(tetris/snake/2048) **다크 아케이드 테마 + brix-Flow 표준 토큰** 승계, 코트만 클래식 Pong 모노톤(검은 코트·흰 공·점선 네트).
- **아케이드 보드**: 800×400 논리 canvas를 `aspect-ratio:2/1`로 반응형 스케일, 좌 플레이어(그린)·우 CPU(앰버) 패들 + 중앙 점선 네트.
- **360px 터치**: 코트 전체가 드래그 히트 영역(`touch-action:none`, 포인터 즉시 추종), 버튼 터치 타깃 ≥44px.
- **상태 오버레이**: start/paused/gameover 3종 + point-paused 배지, 버튼 3variant(primary/secondary/ghost).
- 산출물: `docs/design/pong-BF-910.md`(명세) + `docs/design/mockups/pong-BF-910.html`(mockup, 상태별 프레임 6종).

### 토큰 매핑 (신규 색 리터럴 최소화)

| 역할 | 토큰 | 값 | 출처 |
|---|---|---|---|
| 강조/버튼 | `--color-accent` | `#5B82F0` | tetris 승계 |
| 페이지 배경 | `--color-bg-canvas` | `#0B0F17` | 게임 계열 다크 승계 |
| 코트 배경 | `--court-bg` | `#05070C` | 신규(클래식 Pong) |
| 공 | `--ball-color` | `#F5F7FA` | 신규(모노톤) |
| 플레이어 패들 | `--paddle-player` | `#4ADE80` | 신규(위치와 이중 인코딩) |
| CPU 패들 | `--paddle-cpu` | `#F59E6B` | 신규(위치와 이중 인코딩) |

### Self-critique
5항목 자체 점검 완료(§8.3): AC 매핑·dev 가이드·기존(언어)보존·컴포넌트 매핑·모호함 flag 모두 충족. 모호함 5건(M1 패들 색 코딩/M2 연출 범위/M3 승리 임박 강조/M4 서브 카운트/M5 canvas alt)은 §8.4에 flag — 모두 designer 재량 or 후속 개선 항목으로, dev 착수를 막지 않음.
<!-- /bf:pr-summary -->
