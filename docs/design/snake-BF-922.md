# Snake 아케이드(Phase 18) 디자인 명세 — BF-922

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 대상 라우트: `/phase18-games/snake` (신규 module `phase18-snake`)
> 페이지 타이틀: "Snake 아케이드"
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
> 기획 SSOT: `docs/planning/phase18-snake-BF-923.md` (박기획, BF-923)
> mockup 참조: `docs/design/mockups/snake-BF-922.html` (§7)

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — 파일명 근거 (BF-922 / BF-923 / BF-924 번호 불일치):** 본 designer task 의 수용 기준(AC-1)이 산출물 경로를 `docs/design/snake-BF-922.md` 로 **명시적으로 지정**했다. 현재 task 티켓(BF-924)·의존 planner 티켓(BF-923)과 번호가 다르지만, AC 는 검증 가능한 종료 조건이므로 문자 그대로 준수해 `snake-BF-922.md` 로 생성한다. mockup HTML 은 topic·key 일관성을 위해 `docs/design/mockups/snake-BF-922.html` 로 맞춘다. (이 불일치는 PR self-critique 에 flag)

**전제 2 — 기획 계약 승계, 재해석 금지:** 게임 규칙·상수·상태 전이는 `docs/planning/phase18-snake-BF-923.md`(이하 "기획 명세")가 SSOT 다. 본 디자인 문서는 그 계약(20×20 보드, `CELL_SIZE=20`, 고정 틱 150ms, 벽/자기 충돌=게임오버, 먹이 10점, 세션 in-memory 최고 점수, 4상태 전이)을 **시각 규칙으로만** 번역한다. 규칙 자체를 바꾸지 않는다.

**전제 3 — 다크 단일 테마, 기존 phase18 게임 계열 승계:** `pong-BF-910`·`memory-match-BF-916` 이 확립한 다크 표준 토큰(`--color-bg-canvas:#0B0F17` 계열)을 그대로 승계한다. Snake 전용 토큰(보드 필드/격자선/뱀 머리·몸/먹이/게임오버)만 신규 추가한다. 라이트 테마·테마 토글은 v1 비범위(기존 phase18 게임과 동일).

**전제 4 — 렌더링 기술 중립:** 기획 명세 §1.3 대로 dev 는 `<canvas>` 2D 로 보드를 렌더링한다. 본 문서의 컬러·형태·상태 규칙은 canvas `fillStyle`/`strokeStyle` 값으로도, DOM grid 로도 동일하게 적용 가능한 **논리 스펙**이다. mockup(§7)은 시각 시뮬레이션을 위해 CSS grid 로 표현하지만, dev 는 픽셀 단위 일치 의무가 없다(색상 토큰·형태 규칙만 준수).

**전제 5 — 코드 미작성:** 본 산출물은 디자인 명세 markdown + 시각 mockup HTML 2건뿐이다. `phase18-games/snake/*` 실제 구현은 후속 dev(dev-1) task 담당이며 본 task 에서 생성·수정하지 않는다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑](#8-ac-매핑)

---

## 1. 시안 개요

### 1.1 변경 범위

- **신규 페이지 1개**: `/phase18-games/snake` (`index.html`/`styles.css`/`logic.js`/`main.js`) — `phase18-games/pong`·`phase18-games/memory-match` 와 형제 디렉터리.
- **시각 요소**: 상단 타이틀바 → 스코어보드(점수/최고 점수) → 20×20 게임 보드(canvas) → 360px D-pad 방향 컨트롤 → 조작 안내 + 컨트롤 버튼. 세로 스택 단일 컬럼.
- **상태 4종의 시각 표현**: `start` / `playing` / `paused` / `gameover` — 보드 위 오버레이 + 컨트롤 버튼 세트로 구분.
- **셀 4종의 시각 구분**: 뱀 머리(head) / 뱀 몸(body) / 먹이(food) / 빈 셀(empty) — 명도·형태·테두리로 색맹까지 구분.

### 1.2 사용자 경험 목표

| 목표 | 설계 반영 |
|---|---|
| **한눈에 게임 상태 파악** | 머리는 가장 밝은 초록 + 진행 방향 "눈", 몸은 한 단계 어두운 초록 그라데이션, 먹이는 대비되는 앰버 원형 — 3요소가 명도·색상·형태 모두 달라 즉시 구분 |
| **모바일 우선 조작감** | 360px 폭에서 보드(≤320px) + D-pad(≤160px)가 세로 스택으로 가로 스크롤 없이 전부 표시, 각 방향 버튼 ≥44×44px(WCAG 2.5.5) |
| **기존 게임과 일관된 시각 언어** | 다크 캔버스 배경·동일 accent 파랑·동일 버튼 3종(primary/secondary/ghost)·동일 타이포 스케일 — phase18 게임 계열의 형제로 느껴짐 |
| **접근성** | 색에만 의존하지 않는 상태 구분(형태·테두리·아이콘), 키보드 완전 조작(방향키/WASD/P/Enter), 포커스 링, `aria-live` 스코어·게임오버 안내 |
| **명확한 실패 피드백** | 게임오버 시 danger 계열 오버레이 + 사유("벽에 부딪혔어요"/"몸에 부딪혔어요") + 점수·최고 점수 + 재시작 유도 |

---

## 2. 컬러 팔레트

### 2.1 표준 토큰 (다크 테마 — 기존 phase18 게임 계열 승계, 값 불변)

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0B0F17` | 페이지 최하단 배경 |
| `--color-bg-surface` | `#141B26` | 카드/패널(스코어보드·컨트롤 영역) 배경 |
| `--color-bg-subtle` | `#1C2431` | 보조 표면(버튼 secondary 배경 등) |
| `--color-border-default` | `#273140` | 기본 테두리 |
| `--color-border-strong` | `#3A4657` | 강조 테두리 |
| `--color-text-primary` | `#E8EDF4` | 본문/타이틀/점수 값 |
| `--color-text-secondary` | `#9AA7B8` | 라벨/보조 텍스트 |
| `--color-text-muted` | `#63708A` | 힌트/캡션 |
| `--color-accent` | `#5B82F0` | primary 버튼·포커스·강조 |
| `--color-accent-hover` | `#6E90F5` | accent hover |
| `--color-accent-on` | `#0B0F17` | accent 위 텍스트(대비) |
| `--color-focus-ring` | `rgba(91,130,240,.55)` | 키보드 포커스 링 |
| `--color-success` | `#4ADE80` | 성공/최고 점수 갱신 강조 |
| `--color-danger` | `#E55858` | 게임오버/위험 |

### 2.2 Snake 전용 토큰 (신규 — 보드·뱀·먹이)

| 토큰 | HEX | 용도 |
|---|---|---|
| `--board-bg` | `#070B12` | 게임 보드(플레이 필드) 배경 — 페이지보다 더 어둡게 "화면 속 화면" 느낌 |
| `--board-grid` | `rgba(232,237,244,.06)` | 20×20 격자선 — 아주 옅게(방해 X, 셀 감각만) |
| `--board-border` | `#273140` | 보드 외곽 테두리 |
| `--snake-head` | `#5CF08A` | 뱀 머리 — 가장 밝은 초록(즉시 눈에 띔) |
| `--snake-head-eye` | `#07130B` | 머리 위 진행 방향 "눈"(보드 배경 대비 어둡게) |
| `--snake-body` | `#2FA968` | 뱀 몸 — 머리보다 한 단계 어두운 초록 |
| `--snake-body-alt` | `#278C57` | 몸 그라데이션 하단/짝수 마디(마디감 표현) |
| `--snake-body-border` | `rgba(7,19,11,.55)` | 몸 셀 사이 구분선(마디 경계) |
| `--food-fill` | `#F5C24B` | 먹이 — 앰버(뱀 초록과 색상환 대비) |
| `--food-glow` | `rgba(245,194,75,.35)` | 먹이 주변 은은한 글로우 |
| `--food-stem` | `#7CC86A` | 먹이 꼭지(사과 모티프 — 형태 구분 보조) |
| `--overlay-scrim` | `rgba(5,7,12,.74)` | 상태 오버레이(start/paused/gameover) 딤 |
| `--gameover-tint` | `rgba(229,88,88,.14)` | 게임오버 시 보드에 감도는 붉은 틴트 |

### 2.3 색맹·명도 안전성 근거

- **머리 vs 몸**: 색상은 같은 초록 계열이지만 명도가 뚜렷이 다르고(`#5CF08A` 밝음 vs `#2FA968` 중간), 머리에는 **진행 방향 "눈"** 형태가 추가돼 색 인지가 어려워도 머리 위치·방향이 구분된다.
- **먹이 vs 뱀**: 앰버(`#F5C24B`)와 초록은 명도·색상 모두 대비되며, 먹이는 **원형(꼭지 포함)** 이라 형태만으로도 셀 종류가 구분된다(뱀 셀은 둥근 사각형).
- **게임오버**: 색(붉은 틴트)에만 의존하지 않고 텍스트 사유 + danger 아이콘(✕)로 명시.

---

## 3. 타이포그래피

폰트는 vanilla-static 제약에 따라 **system stack** 만 사용(외부 CDN·웹폰트 금지).

```css
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 토큰 | 스펙 (weight size/line-height family) | 적용 |
|---|---|---|---|
| 페이지 타이틀 (H1) | `--text-h1` | `600 20px/1.3 var(--font-sans)` | 상단 타이틀바 "Snake 아케이드" |
| 스코어 값 | `--text-score-value` | `700 clamp(24px,7vw,32px)/1 var(--font-mono)` | 점수/최고 점수 숫자(자릿수 흔들림 방지 위해 mono) |
| 스코어 라벨 | `--text-score-label` | `600 12px/1.2 var(--font-sans)` | "점수" / "최고" 라벨(대문자/자간) |
| 오버레이 타이틀 | `--text-overlay-title` | `700 clamp(22px,7vw,30px)/1.2 var(--font-sans)` | "일시정지" / "게임 오버" / "Snake 아케이드"(start) |
| 오버레이 사유/스탯 | `--text-overlay-stat` | `700 clamp(16px,5vw,20px)/1.3 var(--font-mono)` | 게임오버 점수·최고 점수 수치 |
| 본문 | `--text-body` | `400 15px/1.5 var(--font-sans)` | 조작 안내·오버레이 설명문 |
| 버튼 | `--text-button` | `600 14px/1 var(--font-sans)` | 시작/일시정지/재시작/메뉴로 |
| 캡션/힌트 | `--text-caption` | `400 13px/1.4 var(--font-sans)` | 하단 힌트 "방향키 또는 아래 버튼으로…" |
| D-pad 글리프 | `--text-dpad` | `700 22px/1 var(--font-sans)` | ▲ ◀ ▶ ▼ 방향 화살표 |

- **점수·수치는 `--font-mono`**: 점수가 오를 때 자릿수 폭이 흔들리지 않도록 등폭 폰트 사용(pong `--text-score` 관례 승계).
- 라벨류(`--text-score-label`)는 `letter-spacing:.08em; text-transform:uppercase` 를 권장(스코어보드 라벨의 시각 계층).

---

## 4. 레이아웃

### 4.1 페이지 구조 (기획 §8.1 승계)

```
<body>  (배경: --color-bg-canvas, 세로 중앙 정렬)
 └─ <main class="snake-app">  (max-width 최대 420px, 단일 컬럼 세로 스택)
     ├─ <header class="snake-topbar">        ← H1 "Snake 아케이드"
     ├─ <section class="scoreboard">          ← [점수 N] [최고 N] 2칸
     ├─ <div class="board-wrap">              ← position:relative (오버레이 컨테이너)
     │   ├─ <canvas id="board" width="400" height="400">  ← 20×20 논리 격자
     │   └─ <div class="board-overlay">       ← start/paused/gameover 오버레이(playing 시 숨김)
     ├─ <nav class="dpad">                     ← ▲ ◀ ▶ ▼ 십자 배치(360px 필수)
     └─ <section class="controls">            ← 조작 안내 힌트 + [시작/일시정지] [재시작] [메뉴로]
```

### 4.2 spacing 스케일

```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
--space-5:24px; --space-6:32px; --space-7:48px;
--radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
--shadow-panel:0 8px 32px rgba(0,0,0,.45);
```

- 섹션 간 세로 간격: `--space-4`(16px). 타이틀바 아래 `--space-5`.
- `snake-app` 좌우 패딩: `--space-4`(16px) → 360px 뷰포트에서 콘텐츠 폭 = 360 − 32 = **328px** 확보.
- 보드/스코어보드/컨트롤 패널: `border-radius: --radius-lg`, `background: --color-bg-surface`, `box-shadow: --shadow-panel`.

### 4.3 반응형 규칙 (360px 필수 지원 — 기획 §8.2 승계)

| 요소 | 규칙 |
|---|---|
| **보드(canvas)** | 논리 해상도 `400×400` 고정(20셀 × `CELL_SIZE 20`). CSS: `width:100%; max-width:320px; height:auto; aspect-ratio:1/1;` → 360px 뷰포트에서 보드 표시 폭 ≈ 300~320px, 격자는 래스터 축소만 발생(좌표계 불변) |
| **스코어보드** | 2칸 flex, `width:100%`, 보드와 동일 최대폭 정렬 |
| **D-pad** | 십자 3×3 grid, 클러스터 전체 폭 ≤ **160px**, 보드 아래 중앙 배치. 각 버튼 `min-width/height:52px`(≥44px 권장 초과 확보) |
| **컨트롤 버튼** | ≤420px 에서 세로 스택(`flex-direction:column`), ≥421px 에서 가로 배치 허용 |
| **가로 스크롤** | 360px 폭에서 스코어보드·보드·D-pad·힌트·버튼 전부 세로 스택으로 표시, `overflow-x` 발생 0 |

### 4.4 브레이크포인트

- **단일 브레이크포인트 `420px`**: 이하는 순수 모바일 세로 스택(기본), 초과는 컨트롤 버튼 가로 배치 정도의 미세 조정만. 데스크톱에서도 `snake-app` max-width 420px 로 중앙 정렬(게임은 좁은 컬럼이 자연스러움 — pong·memory-match 관례).
- 화면 회전/리사이즈 시 canvas CSS 크기만 변하고 논리 격자(20×20)는 불변(기획 §8.2).

---

## 5. 컴포넌트 명세

### 5.1 보드 셀 (canvas 렌더 — 논리 스펙)

각 셀은 `CELL_SIZE=20` 논리 px 정사각. dev 는 canvas 에 아래 규칙으로 그린다. 셀 안쪽 `1px` 여백(inset)을 두어 셀 간 경계를 살린다.

| 셀 종류 | data 상태 | 채움(fill) | 형태 | 부가 표현 |
|---|---|---|---|---|
| **빈 셀** (empty) | — | `--board-bg` | 격자선(`--board-grid`)만 | 없음 |
| **뱀 머리** (head) | `head` | `--snake-head` | 둥근 사각(radius ≈ 4px 논리) | 진행 방향에 **눈 2개**(`--snake-head-eye`, 지름 ≈ 3px 논리, 방향 쪽 두 모서리) |
| **뱀 몸** (body) | `body` | `--snake-body` → `--snake-body-alt` 세로 그라데이션 | 둥근 사각(radius ≈ 3px 논리) | 셀 경계에 `--snake-body-border` 1px(마디감). 꼬리 셀은 살짝 작게(≈ 90%) 그려 꼬리임을 암시(선택) |
| **먹이** (food) | `food` | `--food-fill` | **원형**(지름 ≈ 셀의 78%) | 상단에 `--food-stem` 꼭지 2px, 주변 `--food-glow` 은은한 광 |

- **머리 방향별 눈 위치** (진행 방향 = `direction`):
  - `right`: 오른쪽 위/아래 모서리 안쪽 2점
  - `left`: 왼쪽 위/아래
  - `up`: 위쪽 좌/우
  - `down`: 아래쪽 좌/우
  - → 눈 위치가 곧 진행 방향 인디케이터(색맹 대응, §2.3).

### 5.2 스코어보드 (`.scoreboard`)

| props/상태 | 값 |
|---|---|
| 구조 | 2칸: `점수`(왼쪽) · `최고`(오른쪽), 각 칸 `라벨 + 값` 세로 |
| 라벨 | `--text-score-label`, `--color-text-secondary`, 대문자/자간 |
| 값 | `--text-score-value`, `--color-text-primary`, `--font-mono`, `aria-live="polite"` |
| 최고 점수 갱신 순간 | 값 색을 `--color-success`(#4ADE80)로 잠깐 강조(선택 — 순간 피드백). 정적 mockup 은 갱신 상태를 별도 스와치로 표기 |
| 배경 | `--color-bg-surface`, `--radius-lg`, 좌우 `--space-4` 패딩 |

### 5.3 게임 보드 래퍼 (`.board-wrap`) + 오버레이 (`.board-overlay`)

- `.board-wrap`: `position:relative`, 정사각, 오버레이의 위치 기준.
- `.board-overlay`: `position:absolute; inset:0`, `background:--overlay-scrim`, flex 중앙 정렬. `status==='playing'` 이면 `display:none`(또는 `hidden` 속성).

| status | 오버레이 표시 | 내용 |
|---|---|---|
| `start` | 표시 | 타이틀 "Snake 아케이드" + 설명("방향키/버튼으로 뱀을 조종해 먹이를 먹으세요") + **[시작]** primary 버튼 |
| `playing` | 숨김 | 보드만 노출(뱀·먹이) |
| `paused` | 표시(딤 약하게) | "일시정지" 타이틀 + **[계속하기]** primary + **[메뉴로]** ghost |
| `gameover` | 표시 + 보드에 `--gameover-tint` | ✕ 아이콘 + "게임 오버" + 사유("벽에 부딪혔어요"/"몸에 부딪혔어요"/"보드를 가득 채웠어요") + `점수 N · 최고 N`(mono) + **[다시하기]** primary + **[메뉴로]** ghost |

- 게임오버 사유 매핑: `gameoverReason` `'wall'`→"벽에 부딪혔어요", `'self'`→"몸에 부딪혔어요", `'board-full'`→"보드를 가득 채웠어요! 🎉"(퍼펙트, 긍정 톤).

### 5.4 360px 방향 컨트롤 D-pad (`.dpad`) — Epic 필수 항목

| props/상태 | 값 |
|---|---|
| 레이아웃 | 3×3 CSS grid, `grid-template-areas: ". up ." "left . right" ". down ."` |
| 버튼 4개 | `▲`(up) `◀`(left) `▶`(right) `▼`(down), 각 `<button type="button">`, `aria-label="위로/아래로/왼쪽/오른쪽"` |
| 버튼 크기 | `min-width:52px; min-height:52px`(≥44px WCAG 2.5.5 초과 확보), 클러스터 전체 ≤160px |
| 배경/형태 | `--color-bg-subtle`, `border:1px --color-border-strong`, `--radius-md`, 글리프 `--color-text-primary` |
| `default` | 위 기본 스타일 |
| `hover`(포인터) | 배경 `--color-bg-surface`, 테두리 `--color-accent` |
| `active`(누름) | 배경 `--color-accent`, 글리프 `--color-accent-on`, `transform:scale(.94)` — 눌림 피드백 |
| `focus`(키보드) | `outline:2px --color-accent; outline-offset:2px` + `--color-focus-ring` box-shadow |
| `disabled` | `status!=='playing'` 시 `opacity:.4; cursor:not-allowed`(선택 — 또는 항상 활성 후 no-op) |
| 터치 | `touch-action:manipulation`(더블탭 확대·지연 방지), `pointerdown` 으로 방향 확정(기획 §5.3) |

### 5.5 컨트롤 버튼 3종 (`.btn`)

phase18 게임 계열의 표준 버튼 3종을 그대로 승계.

| 종류 | 클래스 | 배경 | 텍스트 | 테두리 | 용도 |
|---|---|---|---|---|---|
| primary | `.btn--primary` | `--color-accent` | `--color-accent-on` | 없음 | 시작 / 계속하기 / 다시하기 |
| secondary | `.btn--secondary` | `--color-bg-subtle` | `--color-text-primary` | `1px --color-border-strong` | 일시정지 |
| ghost | `.btn--ghost` | `transparent` | `--color-text-secondary` | `1px --color-border-default` | 메뉴로 / 재시작 |

- 공통: `--radius-md`, `--text-button`, 패딩 `10px 18px`, `min-height:44px`(터치 타겟).
- 상태: `hover`(배경/테두리 밝게), `active`(`scale(.97)`), `focus-visible`(포커스 링), `disabled`(`opacity:.45`, 예: playing 아닐 때 일시정지 버튼).

### 5.6 조작 안내 힌트 (`.controls__hint`)

- `--text-caption`, `--color-text-muted`, 중앙 정렬.
- 문구: "방향키(↑↓←→) · WASD 또는 아래 버튼으로 이동 · P 일시정지 · Enter 시작/재시작".

### 5.7 인터랙션 요약

| 인터랙션 | 트리거 | 시각 반응 |
|---|---|---|
| 방향 전환 | 키보드/D-pad | 다음 틱에 머리 이동 + 눈 방향 갱신(150ms 스냅, 보간 없음 — 기획 §8.3) |
| 먹이 섭취 | 머리가 먹이 셀 도달 | 점수 +10(값 갱신), 몸 1칸 성장, 먹이 재스폰 |
| 최고 점수 갱신 | `score > highScore` | 최고 값 `--color-success` 순간 강조(선택) |
| D-pad 누름 | `pointerdown` | 버튼 `active` 스타일(scale·accent) |
| 게임오버 | 충돌 | 보드 `--gameover-tint` + 오버레이 등장 |
| `prefers-reduced-motion` | OS 설정 | 버튼 `scale`/틴트 트랜지션 제거, 셀 이동은 원래 스냅이라 영향 없음 |

---

## 6. dev 구현 가이드

dev-1 이 `phase18-games/snake/` 를 구현할 때 따를 단계별 지침. **CSS 변수명·클래스명은 아래 권장을 사용**하면 mockup(§7)과 일치해 리뷰가 쉬워진다.

### 6.1 파일별 역할 (기획 §13 승계)

| 파일 | 디자인 관점 역할 |
|---|---|
| `index.html` | §4.1 마크업 스켈레톤(`snake-topbar`/`scoreboard`/`board-wrap`+`canvas#board`/`dpad`/`controls`), `<noscript>` 폴백 |
| `styles.css` | §2 토큰 `:root` 정의 + §4 레이아웃 + §5 컴포넌트 상태 스타일 |
| `logic.js` | 순수 게임 로직(기획 §3~§6) — 색상·렌더 무관 |
| `main.js` | canvas 렌더러(§5.1 셀 규칙을 `fillStyle`/`fillRect`/`arc` 로 구현) + 상태별 오버레이 토글(§5.3) + 입력 바인딩 |

### 6.2 STEP 1 — `:root` 토큰 복제

§2.1 + §2.2 의 모든 토큰을 `styles.css` `:root` 에 **그대로 복제**한다(mockup `<style>` 과 동일). 색상 하드코딩 금지 — 모든 색은 `var(--…)` 참조.

### 6.3 STEP 2 — 레이아웃 골격 (§4)

1. `body` 배경 `--color-bg-canvas`, `min-height:100vh`, flex 세로 중앙.
2. `main.snake-app` `max-width:420px; margin:0 auto; padding:var(--space-4)`.
3. 자식 순서: `snake-topbar` → `scoreboard` → `board-wrap` → `dpad` → `controls`, 간격 `--space-4`.
4. 360px 실측 확인: 보드 `max-width:320px`, D-pad 클러스터 `max-width:160px`, 가로 스크롤 0 (§4.3).

### 6.4 STEP 3 — 보드 canvas 렌더러 (§5.1)

- `<canvas id="board" width="400" height="400">`, CSS `width:100%; max-width:320px; aspect-ratio:1/1`.
- 렌더 루프에서 셀 좌표 `(x,y)` → 픽셀 `(x*20, y*20)`, 셀 크기 20. 셀 안쪽 `1px` inset.
- 그리기 순서: ① 보드 배경(`--board-bg`) 채움 → ② 격자선(`--board-grid`, 20등분 수직/수평) → ③ 먹이(원, `--food-fill`+꼭지+글로우) → ④ 몸 셀(둥근 사각, 그라데이션·마디선) → ⑤ 머리(둥근 사각 + 방향 눈).
- **머리 눈**: `direction` 에 따라 두 눈 좌표 오프셋(§5.1 표). canvas 로 그릴 땐 `arc` 2개 (`--snake-head-eye`).
- 게임오버 시 보드 위에 `--gameover-tint` 반투명 사각 덮기.

> 참고: canvas 는 CSS 변수를 직접 못 읽으므로, `getComputedStyle(document.documentElement).getPropertyValue('--snake-head')` 로 토큰 값을 읽어 `fillStyle` 에 주입하거나, JS 상수 팔레트 객체에 §2 값을 미러링(단, styles.css `:root` 가 SSOT — 값 불일치 주의).

### 6.5 STEP 4 — 상태 오버레이 (§5.3)

- `.board-overlay` 를 `board-wrap` 안 `position:absolute; inset:0`.
- `main.js` 가 `status` 에 따라 오버레이 내용/표시 토글: `playing`→`hidden`, 그 외→내용 교체 후 표시.
- 게임오버 사유 매핑(§5.3) 문자열 적용.

### 6.6 STEP 5 — D-pad + 버튼 (§5.4, §5.5)

- D-pad grid-areas 배치, `pointerdown`→방향 확정, `touch-action:manipulation`.
- 버튼 3종 클래스(`.btn--primary/secondary/ghost`) 상태별 스타일.
- 키보드: `keydown` 방향키/WASD/P/Escape/Enter/Space(기획 §5.2).

### 6.7 STEP 6 — 접근성

- canvas 에 `role="img"` + `aria-label`(예: "Snake 게임 보드, 점수 N"), 또는 시각장애 대응은 v1 범위상 보드 자체는 시각 게임임을 명시(pong·memory-match 관례).
- 스코어 값 `aria-live="polite"`, 게임오버 오버레이 `role="status"`.
- 모든 버튼 `focus-visible` 포커스 링, D-pad `aria-label`.
- `@media (prefers-reduced-motion: reduce)`: 버튼 `transform`·틴트 트랜지션 제거.

### 6.8 권장 클래스명 요약 (mockup 과 일치)

```
.snake-app  .snake-topbar  .scoreboard .scoreboard__cell .scoreboard__label .scoreboard__value
.board-wrap  #board  .board-overlay .overlay__title .overlay__desc .overlay__stat .overlay__reason
.dpad  .dpad__btn .dpad__btn--up/--down/--left/--right
.controls  .controls__hint  .btn .btn--primary .btn--secondary .btn--ghost
```

---

## 7. mockup 참조

- **파일**: `docs/design/mockups/snake-BF-922.html` (단일 self-contained HTML, 외부 의존성 0건)
- **확인 방법**: `file://` 로 브라우저에서 직접 열기 → 아래 시각 요소가 스크롤 없이 확인됨.
- **mockup 구성 섹션**:
  1. **대표 화면(playing)** — 360px 프레임: 타이틀바 · 스코어보드 · 20×20 보드(길이 8 뱀 + 먹이) · D-pad · 컨트롤. 머리/몸/먹이 시각 구분 노출.
  2. **상태별 오버레이** — start / paused / gameover(사유 3종) 미니 보드.
  3. **셀 시각 규칙** — 머리 4방향(눈 위치) · 몸 · 먹이 · 빈 셀 스와치.
  4. **D-pad 버튼 상태** — default / hover / active / focus / disabled.
  5. **컨트롤 버튼 3종** — primary / secondary / ghost × 상태.
  6. **컬러 토큰 팔레트** — §2 전체 스와치.
- mockup 은 CSS grid 로 보드를 표현(정적 시각화용) — dev 는 canvas 로 구현하되 **색상 토큰·형태·상태 규칙만 일치**시키면 되고 픽셀 단위 일치 의무는 없다(전제 4).

---

## 8. AC 매핑

### 8.1 BF-922(본 designer task) 수용 기준 충족

| 수용 기준 | 충족 근거 |
|---|---|
| **AC-1**: Given 기획 명세, When 디자인 문서 작성, Then `docs/design/snake-BF-922.md` 에 토큰·컴포넌트·상태별 시각 규칙이 담긴다 | 본 문서 §2(컬러 토큰 SSOT) · §5(컴포넌트 명세: 셀/스코어보드/오버레이/D-pad/버튼) · §5.3(상태 4종 시각 규칙) · §5.1(셀 4종 시각 규칙). 경로 `docs/design/snake-BF-922.md` 준수(전제 1) |
| **AC-2**: Given mockup, When 정적 렌더, Then `file://` 로 열어 보드·컨트롤·상태 표현이 확인된다 | §7 mockup `docs/design/mockups/snake-BF-922.html` — 외부 의존성 0건 self-contained, 대표 화면(보드) + D-pad(컨트롤) + start/paused/gameover(상태) 전부 정적 렌더로 확인 가능 |

### 8.2 기획 명세(BF-923) 계약 → 디자인 반영 매핑

| 기획 계약 | 디자인 반영 |
|---|---|
| 20×20 보드, `CELL_SIZE=20`, canvas 400×400 | §4.3 보드 논리 해상도 불변 + §5.1 셀 렌더 스펙 |
| 머리·몸·먹이·게임오버 시각 구분 | §2.2 전용 토큰 + §2.3 색맹 안전성 + §5.1 셀 규칙 + §5.3 게임오버 오버레이 |
| 360px 방향 컨트롤(D-pad) | §5.4 D-pad(≤160px, 버튼 ≥52px) + §4.3 반응형 |
| 상태 4종(start/playing/paused/gameover) 전이 | §5.3 오버레이 표 + mockup §7-2 |
| 세션 in-memory 최고 점수 | §5.2 스코어보드(점수/최고) + 갱신 강조 |
| 벽/자기/보드-full 게임오버 사유 | §5.3 사유 매핑 3종 |
| vanilla-static, 외부 의존성 0건 | §3 system font, §2 CSS 변수 자체 정의, mockup self-contained |
| 기존 루트 snake·타 phase18 게임 불변 | 신규 `docs/design/snake-BF-922.md` + mockup 만 생성, 기존 파일 미수정 |

---

*문서 종료 — [이디자인] · BF-922 (Snake 아케이드 디자인 명세)*
