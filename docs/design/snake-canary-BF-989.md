# 스네이크 캐너리(Canary) 그리드 게임 — 디자인 명세 · BF-989

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 실제 작업 티켓: **BF-993** (designer task) · 파일명은 시스템 지정 `owned_paths`(`snake-canary-BF-989.md`)를 그대로 사용
> 상위 스토리/파일명 기준: BF-989 · 형제 task: BF-991(planner·완료) / BF-995(developer) / BF-998(tester)
> 기획 SSOT: `docs/planning/snake-canary-BF-989.md` (BF-991, [박기획]) — 본 문서는 그 규칙/상태/입력/접근성 계약의 **시각 레이어**만 정의한다
> tech-stack: `vanilla-static` — 외부 의존성 0건 · system font · CSS 변수 자체 정의
> 대상 라우트: `/demo/snake-canary` (= top-level `demo/snake-canary/`, 신규 디렉터리 — file:// 직접 열기 호환 관례, §0 전제 4)
> mockup 참조: `docs/design/mockups/snake-canary/snake-canary-BF-989.html` (§7)

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — 본 문서는 "시각 계약"만 정의한다.** 게임 규칙·상태 전이·입력 처리·좌표계·상수(20×20, `CELL_SIZE=20`, 틱 150ms, 먹이당 10점) 등 **로직 계약은 전부 기획 SSOT(`docs/planning/snake-canary-BF-989.md`)가 소유**한다. 본 문서는 그 위에 컬러/타이포/레이아웃/컴포넌트 시각 명세와 반응형/접근성 **표현** 가이드만 얹는다. 로직 값을 재정의하지 않으며, 충돌 시 기획 SSOT가 우선한다.

**전제 2 — 공용 토큰 재사용, 신규 발명 최소화.** 본 게임은 `src/app/demo/*` 데모 패밀리(counter·clock·status)의 형제 모듈이다. 따라서 **그 형제들이 공유하는 `:root` 토큰 시스템(light 기본 + `prefers-color-scheme: dark` 자동 전환)을 그대로 승계**한다(실측 출처: `src/app/demo/counter/styles.css`). 크롬(제목·점수·상태·버튼·표면·테두리·포커스 링)은 100% 공용 토큰을 쓰고, **게임 고유 시각 요소(보드 배경·격자선·뱀 머리/몸·먹이·오버레이 스크림)만** 최소한의 신규 토큰(`--sc-*` 접두사)으로 추가한다. 다른 게임 구현(루트 `snake/`, `phase18-games/**`, 지뢰찾기 등)의 토큰·레이아웃은 참조하지 않는다.

**전제 3 — mockup은 시각 시뮬레이션 전용.** `docs/design/mockups/snake-canary/snake-canary-BF-989.html`은 dev(BF-995)의 실제 산출물이 아니다. dev는 `demo/snake-canary/`에 canvas 렌더링으로 실제 게임을 구현하며, mockup의 보드는 CSS grid로 "정지된 한 프레임"을 흉내 낸 것이다. dev는 mockup을 시각 참조 가이드로만 쓰고 픽셀 단위 일치 의무는 없다.

**전제 4 — 디렉터리·스크립트 로드는 top-level `demo/*` + 비-module `<script>` 관례를 따른다 (리뷰 정정).** 본 문서 초안은 기획 SSOT(BF-991) 가정 1·2를 승계해 `src/app/demo/snake-canary/` + `<script type="module">`(ES 모듈) 패턴을 지시했으나, 저장소의 최신 vanilla-static 형제 게임(`demo/color-switch/`(BF-979), `demo/minesweeper/`(BF-980), `demo/breakout-canary/` 등)은 이미 **top-level `demo/<game>/` 디렉터리 + 비-module `<script src="main.js">`(IIFE, 전역 노출)** 패턴으로 확립되어 있다. 이 패턴만이 본 게임의 명시 요건인 **`file://` 직접 열기 호환**(CORS로 인해 `type="module"`은 file://에서 로드 실패)을 만족한다. 따라서 경로는 `demo/snake-canary/`, 스크립트는 비-module `<script>`로 정정한다. dev(BF-995)는 이미 이 관례로 올바르게 구현했다. `snake-canary.js`는 `export` 대신 전역/IIFE로 순수 함수를 노출하고, `main.js`는 그 전역을 참조한다. (기획 SSOT의 상반된 가정 1·2는 로직 계약이 아닌 구조 관례이며, file:// AC와 확립된 형제 관례가 우선한다 — 후속 planner 문서 정합성은 §9.3 참조.)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [접근성 시각 체크리스트](#8-접근성-시각-체크리스트)
9. [AC 매핑 / Self-critique](#9-ac-매핑--self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

`/demo/snake-canary` 페이지의 **단일 정적 레이아웃**을 신규 정의한다. 화면은 세로 스택 하나로 구성된다:

```
[ 제목 ]  →  [ HUD: 점수 · 상태 ]  →  [ 보드(정사각) ]  →  [ 주 컨트롤(시작/다시하기) ]  →  [ D-pad ]
```

정의 대상 4개 시각 구조(task 수용 기준 1):
1. **그리드 보드** — 20×20 격자를 담는 정사각 캔버스 영역 + 시각적 프레임
2. **점수판(HUD)** — 점수 + 상태 텍스트 2요소
3. **조작 안내** — 키보드 힌트 + 온스크린 D-pad
4. **게임오버 오버레이** — 보드 위에 겹치는 결과 패널(최종 점수 + 사유 + 다시하기)

### 1.2 사용자 경험 목표

- **즉시 이해**: 캐너리(가벼운 데모)답게 첫 화면에서 "시작만 누르면 되는 클래식 스네이크"임이 한눈에 읽혀야 한다.
- **양손 조작 동등성**: 데스크톱=키보드, 모바일=D-pad라는 두 경로가 **시각적으로 대등**하게 노출된다(둘 중 하나가 숨겨지거나 열등해 보이지 않음).
- **상태 명확성**: 대기/진행/게임오버 3상태가 색이 아니라 **텍스트 + 버튼 노출 여부**로 구분된다(색맹 대응).
- **형제 데모와의 시각 일관성**: counter/clock/status와 같은 배경·폰트·라운드·버튼·포커스 링을 써서 "같은 데모 패밀리"로 읽힌다.

---

## 2. 컬러 팔레트

### 2.1 승계 토큰 (공용 — `src/app/demo/*` 패밀리와 100% 공유, 신규 아님)

> 출처: `src/app/demo/counter/styles.css` `:root` (timer/stopwatch/clock 계열과 공유). dev는 이 블록을 그대로 복제하며 값을 바꾸지 않는다.

**Light (기본)**

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-accent` | `#3563e9` | 주 버튼 배경, 강조 |
| `--color-accent-hover` | `#2a4fc0` | 주 버튼 hover |
| `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| `--color-bg-surface` | `#ffffff` | 카드/보드 프레임 표면 |
| `--color-bg-subtle` | `#f1f1ef` | 보조 표면(HUD 칩, D-pad 버튼 바탕) |
| `--color-border-default` | `#e5e5e2` | 기본 테두리 |
| `--color-border-strong` | `#d0d0cc` | 강조 테두리 |
| `--color-text-primary` | `#1a1a19` | 본문/제목/점수 |
| `--color-text-secondary` | `#6b6b66` | 보조 텍스트/키보드 힌트 |
| `--color-text-muted` | `#9a9a93` | 캡션 |
| `--color-focus-ring` | `rgba(53,99,233,.45)` | 포커스 링 |

**Dark (`@media (prefers-color-scheme: dark)` 자동 전환)**

| 토큰 | HEX |
|---|---|
| `--color-accent` | `#5b82f0` |
| `--color-accent-hover` | `#7596f3` |
| `--color-bg-canvas` | `#0f1115` |
| `--color-bg-surface` | `#171a21` |
| `--color-bg-subtle` | `#1e222b` |
| `--color-border-default` | `#262b36` |
| `--color-border-strong` | `#3a4150` |
| `--color-text-primary` | `#e8e8e4` |
| `--color-text-secondary` | `#9a9a93` |
| `--color-text-muted` | `#6b6b66` |
| `--color-focus-ring` | `rgba(91,130,240,.55)` |

### 2.2 게임 고유 토큰 (신규 — `--sc-*`, 게임 시각 요소 전용)

> 이 6쌍만 신규다. 크롬 색은 전부 §2.1 승계 토큰을 쓴다. 값은 보드 배경 대비 뱀·먹이 대비를 확보하도록 선정했다(§2.3 대비표).

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--sc-board-bg` | `#ffffff` | `#0b0d11` | 격자 셀 바탕(보드 내부 면) |
| `--sc-grid-line` | `#eceae7` | `#20242d` | 격자선(장식 — 대비 요건 없음) |
| `--sc-snake-head` | `#14532d` | `#34d399` | 뱀 머리(가장 진하게 — 진행 방향 식별) |
| `--sc-snake-body` | `#15803d` | `#22c55e` | 뱀 몸통 |
| `--sc-food` | `#c81e1e` | `#f87171` | 먹이 |
| `--sc-overlay-scrim` | `rgba(26,26,25,.62)` | `rgba(5,7,11,.70)` | 게임오버 오버레이 배경 스크림 |

**설계 근거**
- **뱀=녹색 계열, 먹이=적색 계열**: 클래식 스네이크 관습 + 색상 자체가 크게 달라 색약 사용자도 형태(연결된 몸통 vs 단일 셀)로 1차 구분 가능(§8 색-비의존 원칙).
- **머리 > 몸통 명도 차**: 머리를 몸통보다 진하게(light) / 밝게(dark) 두어 진행 방향을 색만이 아닌 명도로도 식별.
- 격자선은 순수 장식이라 3:1을 요구하지 않되, 셀 경계가 은은히 보이는 수준으로만 둔다.

### 2.3 대비 검증표 (WCAG AA)

> 상대 명도 기준 계산값(근사). 텍스트 4.5:1 / 비텍스트 UI·게임 객체 3:1 요건.

| 전경 | 배경 | 계산 대비 | 요건 | 판정 |
|---|---|---|---|---|
| text-primary `#1a1a19` | bg-canvas `#fafaf9` | ~16.6:1 | 4.5 | ✅ |
| text-secondary `#6b6b66`(키보드 힌트) | bg-canvas `#fafaf9` | ~5.1:1 | 4.5 | ✅ |
| 흰색 버튼 라벨 | accent `#3563e9` | ~5.1:1 | 4.5 | ✅ |
| snake-body `#15803d` | board-bg `#ffffff` | ~5.0:1 | 3.0 | ✅ (텍스트 기준도 통과) |
| snake-head `#14532d` | board-bg `#ffffff` | ~9.1:1 | 3.0 | ✅ |
| food `#c81e1e` | board-bg `#ffffff` | ~5.7:1 | 3.0 | ✅ |
| (dark) snake-body `#22c55e` | board-bg `#0b0d11` | ~8.2:1 | 3.0 | ✅ |
| (dark) food `#f87171` | board-bg `#0b0d11` | ~7.0:1 | 3.0 | ✅ |

> ⚠️ dev 확정 후 **WebAIM Contrast Checker로 재검증** 권장(계산값은 근사). 색을 바꾸면 이 표를 갱신해야 한다.

---

## 3. 타이포그래피

> system font stack만 사용(웹폰트/CDN 금지 — vanilla-static). 승계 토큰 재사용 + 게임 전용 2종 추가.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| 역할 | 토큰(제안) | font (weight size/line-height family) | 적용 요소 |
|---|---|---|---|
| 제목(H1) | `--text-h1` | `600 20px/1.3 var(--font-sans)` | "스네이크 캐너리" |
| 점수 값 | `--text-score` | `700 clamp(24px,7vw,32px)/1 var(--font-mono)` | `#score`의 숫자 |
| 점수 라벨 | `--text-label` | `600 12px/1.2 var(--font-sans)` | "점수" 캡션 |
| 상태 텍스트 | `--text-status` | `500 14px/1.4 var(--font-sans)` | `#game-status` |
| 버튼(주) | `--text-button-lg` | `600 16px/1 var(--font-sans)` | 시작/다시 하기 |
| D-pad 글리프 | `--text-dpad` | `400 22px/1 var(--font-sans)` | ▲◀▶▼ |
| 캡션/힌트 | `--text-caption` | `400 12px/1.4 var(--font-sans)` | 키보드 힌트, 각주 |
| 오버레이 제목 | `--text-overlay` | `700 clamp(22px,6vw,28px)/1.2 var(--font-sans)` | "게임 오버" |

- 점수는 mono로 표기해 자릿수 변동 시 폭이 튀지 않게 한다(HUD 안정성).
- 제목은 caption 대비 뚜렷하되 과하지 않게 20px 고정(형제 데모 H1과 동일 위계).

---

## 4. 레이아웃

### 4.1 페이지 골격 (기획 §10.1 마크업 계약 준수)

```
<main class="sc-page">                     ← 중앙 정렬 컬럼, max-width 460px
 ├─ <h1 class="sc-title">스네이크 캐너리</h1>
 ├─ <div class="sc-hud">                     ← 점수판(가로 2칸)
 │    ├─ <div class="sc-hud__score">
 │    │    ├─ <span class="sc-hud__label">점수</span>
 │    │    └─ <span id="score">0</span>
 │    └─ <p id="game-status" aria-live="polite">대기 중</p>
 ├─ <div class="sc-board-frame">             ← 정사각 프레임(position:relative)
 │    ├─ <canvas id="board" width="400" height="400" aria-hidden="true"></canvas>
 │    └─ <div class="sc-overlay" data-state>  ← 게임오버 시에만 표시(§5.4)
 ├─ <div class="sc-controls">                ← 주 컨트롤(상태별 버튼 1개)
 │    ├─ <button id="btn-start">시작</button>
 │    └─ <button id="btn-restart" hidden>다시 하기</button>
 ├─ <p class="sc-hint">키보드: 방향키 / WASD · 시작·재시작: Enter / Space</p>
 └─ <nav class="sc-dpad" aria-label="방향 조작">   ← ▲◀▶▼ 십자
      ├─ <button id="dpad-up">▲</button>
      ├─ <button id="dpad-left">◀</button>
      ├─ <button id="dpad-right">▶</button>
      └─ <button id="dpad-down">▼</button>
```

> DOM 순서 = Tab 순서(기획 §7.1). 커스텀 `tabindex` 금지. `<canvas>`는 `aria-hidden="true"`, 진행 정보는 `#score`·`#game-status` 텍스트로 별도 제공.

### 4.2 간격 시스템 (승계 토큰)

`--space-1:4px / -2:8px / -3:12px / -4:16px / -5:24px / -6:32px`.
`--radius-sm:4px / -md:8px / -lg:12px`. `--shadow-card:0 4px 16px rgba(0,0,0,.06)`(dark: `…/.32`).

- 섹션 간 세로 간격: `--space-5`(24px).
- 페이지 좌우 패딩: 모바일 `--space-4`(16px), 데스크톱 중앙 정렬.
- 보드 프레임 내부 패딩: `--space-2`(8px), 프레임 라운드 `--radius-lg`.

### 4.3 보드 반응형 (기획 §10.2 계약)

- 논리 해상도 **400×400 고정**(canvas width/height 속성). 표시 크기만 뷰포트에 맞춰 축소:
  ```css
  #board { width:100%; max-width:400px; height:auto; aspect-ratio:1/1; display:block; }
  .sc-board-frame { width:100%; max-width:416px; margin-inline:auto; }
  ```
- **가로 스크롤 절대 금지**(기획 §12.9). 세로 스크롤은 허용.

### 4.4 브레이크포인트 & 데스크톱/모바일 동작

| 뷰포트 | 폭 | 레이아웃 |
|---|---|---|
| 모바일 | < 480px | 순수 세로 스택. 보드가 화면 폭에 맞춰 축소(최소 지원 폭 **320px**). D-pad가 주 조작 → 크게(버튼 56px), 화면 하단 근처에 위치. 키보드 힌트는 `--space-2` 여백으로 유지하되 시각 비중 낮춤. |
| 태블릿/데스크톱 | ≥ 480px | 컬럼 max-width 460px로 중앙 정렬. 보드 400px 고정 표시. D-pad는 유지하되 44px 표준 크기(키보드가 주 조작이므로). 키보드 힌트를 D-pad와 대등하게 노출. |

- D-pad는 **어느 뷰포트에서도 숨기지 않는다** — 터치 단독 완주(기획 AC-A11Y-02)가 데스크톱 터치스크린에서도 성립해야 하기 때문. 다만 폭에 따라 버튼 크기만 44↔56px로 조정.
- 세로 매우 짧은 화면(landscape 모바일)에서는 세로 스크롤로 D-pad 접근 보장(기획 §12.9).

---

## 5. 컴포넌트 명세

각 컴포넌트의 시각 상태 / props(=상태 클래스·속성) / 인터랙션을 정의한다. **상태 전이 로직은 기획 §5가 소유** — 여기서는 그 상태별 "무엇이 보이는가"만 명세한다.

### 5.1 보드 프레임 (`.sc-board-frame` + `#board`)

| 속성 | 값 |
|---|---|
| 표면 | `background: var(--sc-board-bg)`; 프레임 테두리 `1px solid var(--color-border-strong)`; `border-radius: var(--radius-lg)`; `box-shadow: var(--shadow-card)` |
| 격자 표현(실구현) | canvas 2D로 20×20 셀 렌더. 셀 경계선은 `--sc-grid-line`으로 옅게(선택적 — 격자 가독 보조) |
| 격자 표현(mockup) | CSS `repeating-linear-gradient` 또는 `grid`로 정지 프레임 흉내 |
| 뱀 | 몸통 `--sc-snake-body`, 머리 `--sc-snake-head`. 셀 내부 `border-radius: 3px`, 셀 간 1~2px 간격감(mockup은 `inset` 여백) |
| 먹이 | `--sc-food`, 원형(`border-radius:50%`) 또는 라운드 사각, 셀 중앙 |
| 인터랙션 | 없음(캔버스는 `aria-hidden`, 입력은 키보드/D-pad로만) |

> **뱀·먹이 형태 구분**(색-비의존): 뱀=연결된 라운드 사각 체인, 먹이=단일 원형. 색을 못 봐도 형태로 구분 가능.

### 5.2 HUD (`.sc-hud`)

| 하위 요소 | 시각 | props/상태 |
|---|---|---|
| `.sc-hud__score` | `--color-bg-subtle` 칩, `--radius-md`, 패딩 `--space-2 --space-3`. 라벨(위, `--text-label`, muted) + 값(아래, `--text-score`, mono, primary) | `#score` 텍스트가 상태 따라 갱신(대기·게임오버 시 최종 점수 유지 표시) |
| `#game-status` | `--text-status`, `--color-text-secondary`. `aria-live="polite"` | 텍스트: `대기 중` / `진행 중` / `게임 오버 · 점수 N`. **색이 아니라 문구로 상태 전달**(기획 §7.1) |

- HUD는 가로 2칸(`display:flex; justify-content:space-between; align-items:center`). 모바일에서도 한 줄 유지(점수 칩 + 상태 텍스트).

### 5.3 버튼 — 주 컨트롤 & D-pad

**공통 베이스**
- 최소 터치 타깃 **44×44px 이상**(WCAG 2.5.5, 기획 §7.1) — `min-width:44px; min-height:44px`.
- `:focus-visible` **이중 표시**: `outline: 2px solid var(--color-accent)` + `outline-offset: 2px` + `box-shadow: 0 0 0 4px var(--color-focus-ring)`. `outline:none` 단독 금지.
- `touch-action: manipulation`(더블탭 확대·터치 지연 방지).
- 트랜지션 `--motion-fast:120ms var(--ease-out)`(배경·transform), `prefers-reduced-motion:reduce` 시 제거.

**주 컨트롤(`#btn-start` / `#btn-restart`)** — accent 채움 버튼

| 상태 | 스타일 |
|---|---|
| 기본 | `background: var(--color-accent)`; 흰색 라벨; `--text-button-lg`; padding `--space-3 --space-5`; `--radius-md` |
| hover | `background: var(--color-accent-hover)` |
| active | `transform: translateY(1px)` |
| focus-visible | 이중 링(위 공통) |

> 상태별 노출: `idle` → `#btn-start`만, `gameover` → `#btn-restart`만, `playing` → 둘 다 숨김(`hidden`). (전이 로직은 기획 §5.2 / main.js 소유)

**D-pad(`#dpad-up/down/left/right`)** — subtle 아웃라인 버튼, 십자 배치

| 속성 | 값 |
|---|---|
| 배치 | `display:grid; grid-template-columns: repeat(3,44px); grid-template-rows: repeat(3,44px)`. ▲=(row1,col2) ◀=(row2,col1) ▶=(row2,col3) ▼=(row3,col2). 중앙칸 비움 |
| 크기 | 모바일 56px / 데스크톱 44px |
| 기본 | `background: var(--color-bg-subtle)`; `border:1px solid var(--color-border-default)`; `--radius-md`; 글리프 `--color-text-primary` `--text-dpad` |
| hover | `background: 살짝 진하게`(light: `#e9e9e6`), `border-color: var(--color-border-strong)` |
| active/pressed | `background: var(--color-accent)`; 글리프 흰색(`pointerdown` 순간 눌림 피드백 — mockup은 별도 상태 셀로 표현) |
| focus-visible | 이중 링(공통) |
| aria-label | 기획 §7.2: `위로 이동 (↑ 또는 W)` 등 |

> DOM 순서: ▲ → ◀ → ▶ → ▼ (기획 §7.1 Tab 순서). 시각 배치는 grid로 십자 형태를 만들되 DOM 순서는 유지.

### 5.4 게임오버 오버레이 (`.sc-overlay`)

보드 프레임 위에 겹치는 결과 패널(`position:absolute; inset:0`).

| 속성 | 값 |
|---|---|
| 배경 | `background: var(--sc-overlay-scrim)`; `backdrop-filter: blur(2px)`(지원 시); `border-radius: var(--radius-lg)`(프레임과 동일) |
| 정렬 | `display:flex; flex-direction:column; justify-content:center; align-items:center; gap:--space-3` |
| 제목 | "게임 오버" — `--text-overlay`, 흰색(스크림 위 대비 확보) |
| 결과 문구 | "점수 N" + 사유 배지(선택): `벽 충돌` / `자기 몸 충돌` / `보드 클리어`(기획 `gameoverReason` 매핑) — 흰색/밝은 텍스트 |
| 액션 | "다시 하기" 버튼(§5.3 주 컨트롤 재사용) — 오버레이 안에 배치하거나 프레임 하단 `#btn-restart`와 동일 동작 |
| 표시 조건 | `status==='gameover'`일 때만 렌더(그 외 `display:none` 또는 미삽입). **색이 아닌 텍스트로 결과 전달** |
| 모션 | 등장 시 fade/scale 연출은 선택 — 넣을 경우 `prefers-reduced-motion:reduce`에서 제거(기획 §7.1) |

> 오버레이의 최종 점수·상태는 `#game-status`(`aria-live="polite"`) 텍스트 갱신과 **함께** 이뤄져 스크린리더에도 결과가 전달된다(기획 §7.1, §12.7 — 매 틱이 아닌 상태 전이 시점에만 announce).

### 5.5 조작 안내 텍스트 (`.sc-hint`)

- 내용: `키보드: 방향키 / WASD · 시작·재시작: Enter / Space`.
- 스타일: `--text-caption`, `--color-text-secondary`, 중앙 정렬.
- D-pad와 함께 "두 조작 경로가 대등하게 존재"함을 시각적으로 알린다(§1.2).

---

## 6. dev 구현 가이드

> dev(BF-995)가 `demo/snake-canary/{index.html,styles.css,snake-canary.js,main.js}`(top-level `demo/*` 관례, §0 전제 4) 구현 시 따를 단계별 지침. **로직은 기획 §3~§6, 시각은 본 문서.**

### 6.1 토큰 셋업 (styles.css `:root`)
1. `src/app/demo/counter/styles.css`의 `:root` + dark `@media` 블록을 **그대로 복제**(§2.1). 값 변경 금지.
2. 그 아래에 §2.2 `--sc-*` 6쌍(light) + dark `@media`에 dark 값 추가.
3. §3 타이포 토큰(`--text-score` 등 게임 전용)을 `:root`에 추가.

### 6.2 마크업 (index.html)
1. §4.1 골격 그대로. **비-module** `<script src="snake-canary.js"></script>` → `<script src="main.js"></script>` 순서로 로드(§0 전제 4 — IIFE/전역 노출, `file://` 직접 열기 호환 필수). `type="module"` 사용 금지(file://에서 CORS로 로드 실패).
2. `<canvas id="board" width="400" height="400" aria-hidden="true">` — 논리 해상도 속성 고정.
3. D-pad는 실제 `<button type="button">` + §7.2 `aria-label`. `<nav aria-label="방향 조작">`으로 감쌈.
4. `<noscript>` 폴백 문구("이 게임은 JavaScript가 필요합니다") 포함(기획 §7.1).
5. 초기 표시: `#btn-start` 보임 / `#btn-restart` `hidden` / `.sc-overlay` 미표시.

### 6.3 클래스/스타일 (styles.css) — 권장 클래스명
`.sc-page`(중앙 컬럼 max-width 460px), `.sc-title`, `.sc-hud`/`.sc-hud__score`/`.sc-hud__label`, `.sc-board-frame`, `.sc-overlay`, `.sc-controls`, `.sc-btn`(주 버튼), `.sc-dpad`/`.sc-dpad__btn`, `.sc-hint`.
- 버튼 `:focus-visible` 이중 링(§5.3) 필수. `outline:none` 단독 사용 금지(§8).
- 보드 반응형(§4.3), D-pad grid 십자(§5.3), 44px 최소 타깃(§5.3) 반영.
- `@media (prefers-reduced-motion: reduce)`로 부가 연출 제거(넣은 경우).

### 6.4 캔버스 렌더링 (main.js)
1. `CELL_SIZE=20`, 20×20 → 400×400 논리 좌표(기획 §3.1)로 셀 그리기.
2. 그리기 순서: 보드 배경(`--sc-board-bg`) → (선택)격자선(`--sc-grid-line`) → 먹이(`--sc-food`, 원형) → 뱀 몸통(`--sc-snake-body`) → 뱀 머리(`--sc-snake-head`). **CSS 변수는 `getComputedStyle(document.documentElement).getPropertyValue('--sc-...')`로 읽어** 다크모드 자동 대응.
3. 셀 내부 여백 1~2px로 셀 간 격자감 유지(§5.1).
4. 상태 텍스트 갱신: `idle`→"대기 중", `playing`→"진행 중", `gameover`→"게임 오버 · 점수 N"(기획 §7.1). `#game-status`는 상태 전이 시점에만 갱신(매 틱 금지, 기획 §12.7).
5. 오버레이 표시/버튼 노출은 상태에 따라 토글(§5.3·§5.4).

### 6.5 기존 요소 보존 (기획 §8)
- `src/app/demo/{counter,clock,status}/**`, `demo/{color-switch,minesweeper,breakout-canary}/**`, `snake/**`, `phase18-games/**`, `package.json` **미변경**. 승계 토큰(§2.1)은 공용 디자인 토큰 값을 **복제**할 뿐 import·수정하지 않는다.

---

## 7. mockup 참조

- **경로**: `docs/design/mockups/snake-canary/snake-canary-BF-989.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, system font). `file://`로 열어 정적 렌더.
- 포함 섹션(정지 시뮬레이션):
  1. **대기(idle)** — 시작 버튼 노출, 오버레이 없음
  2. **진행(playing)** — 뱀·먹이가 놓인 보드, 진행 중 상태 텍스트, D-pad
  3. **게임오버(gameover)** — 오버레이 패널(최종 점수·사유·다시 하기)
  4. **컴포넌트/상태 상세** — 버튼 hover/active/focus, D-pad pressed, 대비표
  5. **다크 모드 프리뷰** — `prefers-color-scheme: dark` 강제 컨테이너
- mockup의 보드는 CSS grid로 그린 "정지 프레임"이며 실제 canvas 게임 로직은 없다(전제 3). dev는 시각 참조로만 사용.

---

## 8. 접근성 시각 체크리스트

> 기획 §7 요건에 대응하는 **시각 레이어** 확인 항목. (로직/E2E 검증은 tester BF-998.)

- [x] **최소 대비**: 텍스트 4.5:1 / 게임 객체·UI 3:1 확보(§2.3 표).
- [x] **색-비의존**: 상태는 텍스트로(대기/진행/게임 오버·점수 N), 뱀/먹이는 형태(체인 vs 원형)로도 구분.
- [x] **최소 터치 타깃**: D-pad·주 버튼 44px 이상(§5.3).
- [x] **포커스 가시성**: 모든 버튼 `:focus-visible` 이중 링, `outline:none` 단독 금지(§5.3·§6.3).
- [x] **Tab 순서**: 시작/재시작 → ▲◀▶▼ (DOM=Tab, 커스텀 tabindex 없음, §4.1).
- [x] **키보드/터치 대등 노출**: 힌트 텍스트 + D-pad를 항상 표시(§4.4·§5.5).
- [x] **캔버스 대체**: `<canvas aria-hidden="true">`, 진행 정보는 텍스트 요소(§4.1).
- [x] **상태 announce**: `#game-status aria-live="polite"`, 전이 시점만(§5.4, 기획 §12.7).
- [x] **모션 저감**: 부가 연출은 `prefers-reduced-motion:reduce`에서 제거(§5.3·§5.4).
- [x] **`<noscript>` 폴백**: JS 비활성 안내(§6.2).

---

## 9. AC 매핑 / Self-critique

### 9.1 task 수용 기준 매핑

| task 수용 기준 | 충족 위치 |
|---|---|
| ① 그리드/점수판/조작 안내/오버레이 레이아웃 + 공용 토큰 매핑 정의 | §4(레이아웃)·§5(컴포넌트)·§2(팔레트, 승계+`--sc-*`) |
| ② mockup을 file://로 열면 외부 의존성 없이 정적 렌더 + 기존 데모와 시각 일관성 | §7 + mockup(self-contained, counter 토큰 승계) |
| ③ 데스크톱·모바일 레이아웃 + 키보드 포커스/대비 가이드 포함 | §4.4(반응형)·§5.3(포커스 이중 링)·§2.3(대비표)·§8(체크리스트) |

### 9.2 Self-critique (PR 직전 자기 점검 — 5개 항목)

1. **AC 매핑** — task 수용 기준 3개 모두 §9.1로 명시 매핑. 누락 없음.
2. **dev 구현 가이드** — §6에 토큰 복제→마크업→클래스→canvas 렌더→보존까지 단계별 지침 + 권장 클래스명/CSS 변수명 제공. dev가 바로 따라갈 수 있음.
3. **기존 요소 보존** — §6.5·전제 2에서 counter 토큰은 **복제**(import·수정 아님), `src/app/demo/{counter,clock,status}`·`snake/`·`phase18-games`·`package.json` 미변경 명시(기획 §8과 정합).
4. **컴포넌트 매핑** — 기획 §10.1 마크업 계약의 모든 요소(`#score`/`#game-status`/`#board`/`#btn-start`/`#btn-restart`/`#dpad-*`)를 §4.1·§5에서 1:1 시각 명세로 커버.
5. **모호함 flag** — 아래 §9.3.

### 9.3 남은 모호함 (dev/운영자 참고)

- **격자선 렌더 여부**: canvas 셀 경계선(`--sc-grid-line`)은 가독 보조용 **선택**으로 뒀다. 미니멀을 원하면 생략 가능(§5.1) — dev 재량.
- **오버레이 사유 배지**: `gameoverReason`(wall/self/board-full)을 배지로 노출할지 문구로만 할지는 §5.4에서 선택 허용. 최소 요건은 "최종 점수 텍스트 표시".
- **먹이 형태**: 원형 권장이나 라운드 사각도 허용(§5.1). 색-비의존(형태 구분)만 지키면 됨.
- **BF-989 vs BF-993 번호**: 파일명은 시스템 지정 `owned_paths`(`snake-canary-BF-989.md`)를 따랐고 실제 작업 티켓은 BF-993이다(기획 §0 가정 7과 동일 상황). 운영자 확인 권장.
- **[리뷰 정정 반영] 디렉터리·스크립트 로드 관례 — 기획 SSOT와 불일치 존재**: 초안은 기획 SSOT(BF-991) 가정 1·2를 그대로 승계해 `src/app/demo/snake-canary/` + `<script type="module">`(ES 모듈, `file://` 비대상)을 지시했으나, 최리뷰(BF-993 review)가 지적한 대로 이는 저장소의 최신 vanilla-static 형제 관례(`demo/*` top-level + 비-module `<script>`, `file://` 호환) 및 본 게임의 명시 `file://` 호환 AC와 어긋난다. 본 개정에서 §0 전제 4·§6.2·§6.5·§14 참조를 `demo/snake-canary/` + 비-module `<script>`로 정정했다. **단, 기획 SSOT(`docs/planning/snake-canary-BF-989.md` §14, 가정 1·2)는 여전히 옛 경로/모듈 가정을 담고 있다** — 해당 문서는 planner(BF-991) 소유라 본 designer task의 `owned_paths` 밖이므로 직접 수정하지 않는다. 후속 문서 정합성을 위해 planner가 SSOT 가정 1·2를 동일하게 정정하도록 운영자 확인을 권장한다. dev(BF-995)는 이미 `demo/snake-canary/` + 비-module로 올바르게 구현했으므로 구현 측 실질 피해는 없다.

---

*문서 종료 — [이디자인] · BF-993 (파일명 BF-989)*
