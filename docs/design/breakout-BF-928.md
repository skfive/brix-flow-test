# 벽돌깨기(Breakout) 게임 디자인 명세 — BF-928

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-930(본 designer task) · 의존 planner BF-929 · 파일명 번호 BF-928(수용 기준 원문 지정)
> 대상 라우트: `/phase18-games/breakout` (신규 module `breakout`)
> 페이지 타이틀: "벽돌깨기"
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
> 기획 SSOT: `docs/plan/breakout-BF-928.md` (박기획, BF-929)
> mockup 참조: `docs/design/mockups/breakout-BF-928.html` (§7)

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — 파일명 근거 (BF-930 / BF-929 / BF-928 번호 불일치):** 본 designer task 티켓은 BF-930, 의존 planner 는 BF-929 지만, 수용 기준 원문(AC-1)이 산출물 경로를 **명시적으로 `docs/design/breakout-BF-928.md`** 로 지정했다. 기획 명세(`docs/plan/breakout-BF-928.md`) 도 동일하게 `BF-928` 번호를 파일명에 사용한다(기획 §0 가정 2). AC 는 검증 가능한 종료 조건이므로 문자 그대로 준수해 `breakout-BF-928.md` 로 생성하고, mockup 도 topic·key 일관성을 위해 `docs/design/mockups/breakout-BF-928.html` 로 맞춘다. (이 불일치는 PR self-critique 에 flag)

**전제 2 — 기획 계약 승계, 재해석 금지:** 게임 규칙·상수·상태 전이는 `docs/plan/breakout-BF-928.md`(이하 "기획 명세")가 SSOT 다. 본 디자인 문서는 그 계약(보드 `360×480`, 패들 `64×10`, 공 반지름 `6`, 벽돌 `5행×8열=40개`(`40×16`, gap `4`), 생명 3, 벽돌당 10점, `BALL_SPEED 240`, 6상태 전이 `start/serve/playing/paused/gameover/win`)을 **시각 규칙으로만** 번역한다. 상수·물리·상태 전이 자체를 바꾸지 않는다.

**전제 3 — 다크 단일 테마, 기존 phase18 게임 계열 승계:** `pong-BF-910`·`memory-match-BF-916`·`snake-BF-922` 가 확립한 다크 표준 토큰(`--color-bg-canvas:#0B0F17` 계열)을 그대로 승계한다. Breakout 전용 토큰(보드/벽/패들/공/5행 벽돌/생명 하트/win·gameover 틴트)만 신규 추가한다. 라이트 테마·테마 토글은 v1 비범위(기존 phase18 게임과 동일).

**전제 4 — 렌더링 기술 중립:** 기획 명세 §1.3·§12 대로 dev 는 `<canvas id="board" width="360" height="480">` 2D 로 보드를 렌더링한다. 본 문서의 컬러·형태·상태 규칙은 canvas `fillStyle`/`strokeStyle`/`arc` 값으로도, DOM 로도 동일하게 적용 가능한 **논리 스펙**이다. mockup(§7)은 시각 시뮬레이션을 위해 CSS(absolute 배치 + grid)로 표현하지만, dev 는 픽셀 단위 일치 의무가 없다(색상 토큰·형태·상태 규칙만 준수).

**전제 5 — 코드 미작성:** 본 산출물은 디자인 명세 markdown + 시각 mockup HTML 2건뿐이다. `phase18-games/breakout/*` 실제 구현은 후속 dev(dev-1) task 담당이며 본 task 에서 생성·수정하지 않는다.

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

- **신규 페이지 1개**: `/phase18-games/breakout` (`index.html`/`styles.css`/`logic.js`/`main.js`) — `phase18-games/pong`·`memory-match`·`snake` 와 형제 디렉터리(기획 §0 가정 1, §12).
- **시각 요소**: 상단 타이틀바 → HUD(점수 / 생명 하트) → `360×480` 세로형 게임 보드(canvas) → 조작 안내 힌트 + 컨트롤 버튼. 세로 스택 단일 컬럼.
- **상태 6종의 시각 표현**: `start` / `serve` / `playing` / `paused` / `gameover` / `win` — 보드 위 오버레이 + HUD + 컨트롤 버튼 세트로 구분(§5.4).
- **보드 오브젝트 3종의 시각 구분**: 패들(paddle) / 공(ball) / 벽돌(brick, 5행 색상 코딩) — 명도·색상·형태로 색맹까지 구분(§2.3, §5.1).

### 1.2 사용자 경험 목표

| 목표 | 설계 반영 |
|---|---|
| **한눈에 게임 상태 파악** | 공은 가장 밝은 근백색 원형(항상 시선 추적 대상), 패들은 대비되는 파란 막대(조작 주체), 벽돌은 5행 무지개 색상 코딩 — 3오브젝트가 형태·색상·명도 모두 달라 즉시 구분 |
| **모바일 우선 조작감** | `360×480` 논리 보드를 뷰포트 폭에 맞춰 축소(`aspect-ratio:3/4`), 캔버스 전체가 드래그 히트 영역(기획 §5.3) — 좁은 화면에서도 손가락으로 패들 직접 추종. 버튼 ≥44×44px(WCAG 2.5.5) |
| **기존 게임과 일관된 시각 언어** | 다크 캔버스 배경·동일 accent 파랑·동일 버튼 3종(primary/secondary/ghost)·동일 타이포 스케일·동일 HUD 카드 — phase18 게임 계열의 형제로 느껴짐 |
| **접근성** | 색에만 의존하지 않는 구분(벽돌 5행은 위치+명도, 공은 형태, 패들은 형태·위치), 키보드 완전 조작(←→/AD/Enter·Space/P·Esc), 포커스 링, `aria-live` 점수·생명·게임오버 안내 |
| **명확한 실패·성공 피드백** | 게임오버 시 danger 붉은 틴트 오버레이 + "생명을 모두 소진했어요" + 최종 점수 + 재시작 유도 / 승리 시 success 초록 틴트 + "모든 벽돌을 깼어요! 🎉" + 최종 점수 |

---

## 2. 컬러 팔레트

### 2.1 표준 토큰 (다크 테마 — 기존 phase18 게임 계열 승계, 값 불변)

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0B0F17` | 페이지 최하단 배경 |
| `--color-bg-surface` | `#141B26` | 카드/패널(HUD·컨트롤 영역) 배경 |
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
| `--color-success` | `#4ADE80` | 승리/성공 강조 |
| `--color-danger` | `#E55858` | 게임오버/위험 |

### 2.2 Breakout 전용 토큰 (신규 — 보드·패들·공·벽돌·생명)

| 토큰 | HEX / 값 | 용도 |
|---|---|---|
| `--board-bg` | `#070B12` | 게임 보드(플레이 필드) 배경 — 페이지보다 더 어둡게 "화면 속 화면" 느낌 |
| `--board-border` | `#273140` | 보드 외곽 테두리 |
| `--board-wall` | `rgba(232,237,244,.10)` | 상/좌/우 벽(반사면) 은은한 하이라이트 — 공이 튕기는 경계 암시 |
| `--paddle-fill` | `#6E90F5` | 패들 본체 — accent 계열 파랑(조작 주체 강조) |
| `--paddle-edge` | `#3D5BC4` | 패들 하단/측면 베벨(입체감) |
| `--paddle-glow` | `rgba(110,144,245,.35)` | 패들 주변 은은한 광 |
| `--ball-fill` | `#F5F7FA` | 공 — 근백색(어느 벽돌 색 위에서도 최대 대비, 항상 눈에 띔) |
| `--ball-edge` | `#AEB9CC` | 공 외곽 살짝 어두운 링(보드 배경과 경계) |
| `--ball-glow` | `rgba(245,247,250,.30)` | 공 이동 잔광(속도감 — 정적 mockup 은 은은한 halo) |
| `--brick-row-1` | `#E55858` | 1행(최상단) 벽돌 — 레드 |
| `--brick-row-2` | `#F0883E` | 2행 벽돌 — 오렌지 |
| `--brick-row-3` | `#F5C24B` | 3행 벽돌 — 앰버 |
| `--brick-row-4` | `#4ADE80` | 4행 벽돌 — 그린 |
| `--brick-row-5` | `#38BDF8` | 5행(최하단) 벽돌 — 스카이 |
| `--brick-top-highlight` | `rgba(255,255,255,.22)` | 벽돌 상단 베벨(입체 하이라이트) |
| `--brick-bottom-shade` | `rgba(0,0,0,.28)` | 벽돌 하단 베벨(입체 그림자) |
| `--life-heart` | `#E55858` | 생명 하트(남은 생명) |
| `--life-heart-empty` | `#3A4657` | 소진된 생명 하트(빈 하트) |
| `--overlay-scrim` | `rgba(5,7,12,.74)` | 상태 오버레이(start/paused/gameover/win) 딤 |
| `--serve-hint-bg` | `rgba(11,15,23,.55)` | serve 대기 힌트 배너 배경(약한 딤 — 보드 대부분 노출) |
| `--gameover-tint` | `rgba(229,88,88,.14)` | 게임오버 시 보드에 감도는 붉은 틴트 |
| `--win-tint` | `rgba(74,222,128,.14)` | 승리 시 보드에 감도는 초록 틴트 |

### 2.3 색맹·명도 안전성 근거

- **공 vs 패들 vs 벽돌**: 세 오브젝트는 **형태가 근본적으로 다르다** — 공(원형)·패들(가로 막대)·벽돌(가로 사각 격자). 형태만으로 색 인지 없이도 구분된다.
- **벽돌 5행 색상 코딩**: 색상(무지개)뿐 아니라 **행 위치(1~5행)가 고정**이라, 색 인지가 어려워도 "몇 번째 줄"로 구분된다. 또한 5색은 명도가 서로 다르게 배치됨(레드·스카이는 중간, 앰버·그린은 밝음, 오렌지는 중간-밝음). 벽돌은 게임 진행상 파괴만 되고 서로를 혼동해도 플레이에 지장이 없어(모두 동일 10점·내구도 1) 색상은 심미·재미 요소이며 **기능적 구분 부담이 낮다**.
- **파괴된 벽돌**: 색 제거가 아니라 **셀 자체가 사라짐**(빈 공간) — 색맹 여부와 무관하게 명확.
- **게임오버 vs 승리**: 색(붉은/초록 틴트)에만 의존하지 않고 오버레이 아이콘(✕ / 🎉) + 텍스트 사유로 명시(§5.4).
- **생명 하트**: 남은 하트(`--life-heart` 채움) vs 빈 하트(`--life-heart-empty` 아웃라인)는 색뿐 아니라 **채움/비움 형태**로 구분되고, 숫자 카운트("생명 3")를 병기해 이중 표현(§5.2).

---

## 3. 타이포그래피

폰트는 vanilla-static 제약에 따라 **system stack** 만 사용(외부 CDN·웹폰트 금지).

```css
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 토큰 | 스펙 (weight size/line-height family) | 적용 |
|---|---|---|---|
| 페이지 타이틀 (H1) | `--text-h1` | `600 20px/1.3 var(--font-sans)` | 상단 타이틀바 "벽돌깨기" |
| HUD 값 | `--text-score-value` | `700 clamp(22px,6vw,30px)/1 var(--font-mono)` | 점수 숫자(자릿수 흔들림 방지 위해 mono) |
| HUD 라벨 | `--text-score-label` | `600 12px/1.2 var(--font-sans)` | "점수" / "생명" 라벨(대문자/자간) |
| 오버레이 타이틀 | `--text-overlay-title` | `700 clamp(22px,7vw,30px)/1.2 var(--font-sans)` | "벽돌깨기"(start) / "일시정지" / "게임 오버" / "클리어!" |
| 오버레이 사유/스탯 | `--text-overlay-stat` | `700 clamp(16px,5vw,20px)/1.3 var(--font-mono)` | 게임오버·승리 최종 점수 수치 |
| 본문 | `--text-body` | `400 15px/1.5 var(--font-sans)` | 조작 안내·오버레이 설명문 |
| 버튼 | `--text-button` | `600 14px/1 var(--font-sans)` | 시작/일시정지/다시하기/메뉴로 |
| 캡션/힌트 | `--text-caption` | `400 13px/1.4 var(--font-sans)` | 하단 힌트 / serve 발사 안내 |

- **점수·수치는 `--font-mono`**: 점수가 오를 때 자릿수 폭이 흔들리지 않도록 등폭 폰트 사용(pong·snake `--text-score` 관례 승계).
- 라벨류(`--text-score-label`)는 `letter-spacing:.08em; text-transform:uppercase` 를 권장(HUD 라벨의 시각 계층).

---

## 4. 레이아웃

### 4.1 페이지 구조 (기획 §7.1 승계)

```
<body>  (배경: --color-bg-canvas, 세로 중앙 정렬)
 └─ <main class="breakout-app">  (max-width 360px, 단일 컬럼 세로 스택)
     ├─ <header class="breakout-topbar">     ← H1 "벽돌깨기"
     ├─ <section class="hud">                 ← [점수 N] · [생명 ♥♥♥ (N)]
     ├─ <div class="board-wrap">              ← position:relative (오버레이 컨테이너, aspect-ratio 3/4)
     │   ├─ <canvas id="board" width="360" height="480">  ← §3.1(기획) 논리 해상도
     │   ├─ <div class="serve-hint">          ← serve 상태 "탭/Enter로 발사" 배너(serve 시만)
     │   └─ <div class="board-overlay">       ← start/paused/gameover/win 오버레이(playing·serve 시 숨김)
     └─ <section class="controls">            ← 조작 안내 힌트 + [시작/일시정지] [다시하기] [메뉴로]
```

### 4.2 spacing 스케일

```css
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
--space-5:24px; --space-6:32px; --space-7:48px;
--radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
--shadow-panel:0 8px 32px rgba(0,0,0,.45);
```

- 섹션 간 세로 간격: `--space-4`(16px). 타이틀바 아래 `--space-4`~`--space-5`.
- `breakout-app` 좌우 패딩: `--space-4`(16px) → 360px 뷰포트에서 콘텐츠 폭 = 360 − 32 = **328px** 확보(보드는 이 폭에 맞춰 축소).
- HUD/컨트롤 패널: `border-radius: --radius-lg`, `background: --color-bg-surface`, `box-shadow: --shadow-panel`. 보드 래퍼: `--radius-md` + `--board-border`.

### 4.3 반응형 규칙 (권장 — 기획 §7.2·§0 가정 7 승계)

| 요소 | 규칙 |
|---|---|
| **보드(canvas)** | 논리 해상도 `360×480` 고정(기획 §3.1). CSS: `width:100%; max-width:360px; height:auto; aspect-ratio:3/4;` → 좁은 뷰포트에서 보드 표시 폭이 축소되고 래스터 스케일만 발생(논리 좌표계·물리 불변). 포인터 좌표 변환식(기획 §5.3)이 매 이벤트마다 `canvasRect` 를 다시 읽어 자동 대응 |
| **HUD** | 2칸 flex(점수 왼쪽 · 생명 오른쪽), `width:100%`, 보드와 동일 최대폭 정렬 |
| **컨트롤 버튼** | ≤420px 에서 세로 스택(`flex-direction:column`) 또는 2열 wrap, ≥421px 에서 가로 배치 허용 |
| **가로 스크롤** | 360px 폭에서 HUD·보드·힌트·버튼 전부 세로 스택으로 표시, `overflow-x` 발생 0 |
| **터치 조작** | 캔버스에 `touch-action:none`(드래그 중 페이지 스크롤/줌 방지, 기획 §5.3) — 온스크린 방향 버튼(D-pad) 없음(기획 §0 가정 8): 캔버스 드래그로 패들 직접 추종 |

### 4.4 브레이크포인트

- **단일 브레이크포인트 `420px`**: 이하는 순수 모바일 세로 스택(기본), 초과는 컨트롤 버튼 가로 배치 정도의 미세 조정. 데스크톱에서도 `breakout-app` max-width 360px 로 중앙 정렬(게임은 좁은 세로 컬럼이 자연스러움 — pong·snake 관례).
- 화면 회전/리사이즈 시 canvas CSS 크기만 변하고 논리 좌표계(`360×480`)는 불변(기획 §7.2).

---

## 5. 컴포넌트 명세

### 5.1 보드 오브젝트 (canvas 렌더 — 논리 스펙, 기획 §3 상수 준수)

dev 는 canvas 에 아래 규칙으로 그린다. 좌표·크기는 기획 §3.1 상수를 그대로 사용한다(디자인은 색·형태만 규정).

| 오브젝트 | 논리 크기/위치 (기획 §3.1) | 채움(fill) | 형태 | 부가 표현 |
|---|---|---|---|---|
| **보드 배경** | `360×480` 전체 | `--board-bg` | 사각(전체) | 상/좌/우 안쪽 경계 `--board-wall` 1px 하이라이트(반사 벽 암시), 격자선 없음 |
| **벽돌** (brick) | `40×16`, 5행×8열, gap 4, `BRICK_TOP_MARGIN 40`(기획 §3.2) | 행별 `--brick-row-1`~`5` | 둥근 사각(radius ≈ 3px 논리) | 상단 `--brick-top-highlight` 1~2px 베벨 + 하단 `--brick-bottom-shade` 1~2px 베벨(입체). `alive=false` 벽돌은 미렌더(빈 공간) |
| **패들** (paddle) | `64×10`, `PADDLE_Y=440`, X 가변 | `--paddle-fill` | 둥근 사각(radius ≈ 4px 논리, pill 느낌) | 상단 얇은 하이라이트, 하단 `--paddle-edge` 베벨, 주변 `--paddle-glow` 은은한 광(선택) |
| **공** (ball) | 반지름 `6`, `(x,y)` 물리 좌표 | `--ball-fill` | **원형** | 외곽 `--ball-edge` 1px 링 + `--ball-glow` halo(선택, 속도감). serve 중엔 패들 중앙 위에 부착(기획 §3.7 step 3) |

- **벽돌 행 색상 매핑**(row 0 = 최상단): `row 0 → --brick-row-1`(레드) · `row 1 → --brick-row-2`(오렌지) · `row 2 → --brick-row-3`(앰버) · `row 3 → --brick-row-4`(그린) · `row 4 → --brick-row-5`(스카이). 색은 심미·재미 요소이며 파괴 규칙은 전 행 동일(§2.3).
- **베벨 방향 고정**: 모든 벽돌은 상단 하이라이트 + 하단 그림자(광원 위쪽 가정) — 5색이 달라도 입체 처리는 통일해 시각 통일감 확보.

### 5.2 HUD (`.hud`) — 점수·생명 (기획 §7.3 대응)

| props/상태 | 값 |
|---|---|
| 구조 | 2칸: `점수`(왼쪽) · `생명`(오른쪽), 각 칸 `라벨 + 값` |
| 점수 라벨/값 | 라벨 `--text-score-label`+`--color-text-secondary`(대문자/자간), 값 `--text-score-value`+`--color-text-primary`+`--font-mono`, `aria-live="polite"` |
| 생명 표시 | 하트 아이콘 `♥` × `LIVES_INITIAL(3)` — 남은 생명은 `--life-heart`(채움), 소진분은 `--life-heart-empty`(빈 하트 `♡`). 스크린리더용으로 "생명 N" 숫자 텍스트 병기(`aria-label`/시각 병기, §2.3) |
| 생명 감소 순간 | 소진된 하트가 채움→빈 하트로 전환(선택: 짧은 fade). 정적 mockup 은 3/2/1/0 단계 스와치로 표기 |
| 배경 | `--color-bg-surface`, `--radius-lg`, 좌우 `--space-4` 패딩, `--shadow-panel` |

> 기획 §7.3 은 "생명 {lives}" 최소 계약을 요구하고 하트 등 시각 표현은 designer 재량으로 위임했다 — 본 문서는 **하트 아이콘 + 숫자 병기** 로 확정(색맹·명료성 이중 표현, §2.3).

### 5.3 게임 보드 래퍼 (`.board-wrap`) + serve 힌트 (`.serve-hint`)

- `.board-wrap`: `position:relative`, `aspect-ratio:3/4`, `max-width:360px`, `--radius-md`, `overflow:hidden`, `--board-border` 1px, `--shadow-panel`. 오버레이·serve 힌트의 위치 기준.
- `.serve-hint`: `status==='serve'` 일 때만 표시. 보드 하단 중앙에 `--serve-hint-bg` 약한 딤 배너 + 텍스트 "탭 또는 Enter로 발사"(`--text-caption`). 보드 대부분(벽돌·패들·부착된 공)은 그대로 노출 — 강한 scrim 을 쓰지 않는다(발사 준비 화면은 게임 화면의 연장).
- `.board-overlay`: `position:absolute; inset:0`, `background:--overlay-scrim`, flex 중앙 정렬. `status` 가 `playing`·`serve` 이면 `hidden`, 그 외(start/paused/gameover/win)만 내용 교체 후 표시(§5.4).

### 5.4 상태별 오버레이 (`.board-overlay`) — 6상태 시각 규칙

기획 §6.2 상태 전이표를 시각으로 번역. `playing`·`serve` 는 오버레이 숨김(serve 는 §5.3 힌트 배너만).

| status | 오버레이 | 보드 틴트 | 내용 |
|---|---|---|---|
| `start` | 표시(scrim) | — | 타이틀 "벽돌깨기" + 설명("←→ 또는 드래그로 패들을 움직이고, 공으로 벽돌 40개를 모두 깨세요") + **[시작]** primary 버튼 |
| `serve` | 숨김(§5.3 힌트만) | — | 보드에 벽돌·패들·부착된 공 노출 + 하단 "탭/Enter로 발사" 힌트 배너 |
| `playing` | 숨김 | — | 보드만 노출(벽돌·패들·공 이동) |
| `paused` | 표시(딤 약하게) | — | "일시정지" 타이틀 + **[계속하기]** primary + **[메뉴로]** ghost |
| `gameover` | 표시 | `--gameover-tint` | ✕ 아이콘 + "게임 오버" + 사유 "생명을 모두 소진했어요" + `점수 N`(mono, 강조) + **[다시하기]** primary + **[메뉴로]** ghost |
| `win` | 표시 | `--win-tint` | 🎉 아이콘 + "클리어!" + "모든 벽돌을 깼어요" + `점수 N`(mono, 강조, success 색) + **[다시하기]** primary + **[메뉴로]** ghost |

- 게임오버 사유는 기획상 `gameoverReason='out-of-lives'` 단일(기획 §4.3) → "생명을 모두 소진했어요" 고정 문구.
- 승리 최종 점수는 `--color-success` 로 강조(만점 400 도달 가능성 시각 축하).

### 5.5 컨트롤 버튼 3종 (`.btn`)

phase18 게임 계열의 표준 버튼 3종을 그대로 승계.

| 종류 | 클래스 | 배경 | 텍스트 | 테두리 | 용도 |
|---|---|---|---|---|---|
| primary | `.btn--primary` | `--color-accent` | `--color-accent-on` | 없음 | 시작 / 계속하기 / 다시하기 |
| secondary | `.btn--secondary` | `--color-bg-subtle` | `--color-text-primary` | `1px --color-border-strong` | 일시정지 |
| ghost | `.btn--ghost` | `transparent` | `--color-text-secondary` | `1px --color-border-default` | 메뉴로 |

- 공통: `--radius-md`, `--text-button`, 패딩 `10px 18px`, `min-height:44px`(터치 타겟, WCAG 2.5.5).
- 상태: `hover`(배경/테두리 밝게), `active`(`scale(.97)`), `focus-visible`(`outline:2px --color-accent; outline-offset:2px` + `--color-focus-ring`), `disabled`(`opacity:.45`, 예: playing 아닐 때 일시정지 버튼).
- 컨트롤 영역의 주 버튼은 `status` 에 따라 라벨/역할 전환: `start`→[시작] / `playing`→[일시정지](secondary) / `paused`→[계속하기] / `gameover`·`win`→[다시하기]. [메뉴로] ghost 는 paused/gameover/win 에서 노출.

### 5.6 조작 안내 힌트 (`.controls__hint`)

- `--text-caption`, `--color-text-muted`, 중앙 정렬.
- 문구: "← → 또는 A/D · 화면 드래그로 패들 이동 · Enter/Space/탭 발사 · P 일시정지".

### 5.7 인터랙션 요약

| 인터랙션 | 트리거 | 시각 반응 |
|---|---|---|
| 패들 이동 | 키보드 ←→/AD · 캔버스 드래그(Pointer) | 패들 X 위치가 즉시(드래그) 또는 `300px/s`(키보드) 이동, 보드 경계 클램프(기획 §3.3·§5) |
| 발사 | serve 상태 Enter/Space/탭 | 부착 공이 `launchVector` 각도로 발사(기획 §3.6), serve 힌트 배너 사라짐 |
| 벽돌 파괴 | 공이 벽돌 셀 도달 | 해당 벽돌 셀 소멸(빈 공간) + 점수 +10(HUD 값 갱신) + 공 반사(기획 §3.6) |
| 생명 손실 | 공이 하단 이탈 | 하트 1개 채움→빈 하트, `serve` 재부착(또는 `gameover`) |
| 게임오버 | 생명 소진 | 보드 `--gameover-tint` + 오버레이 등장(✕·사유·점수) |
| 승리 | 벽돌 40개 전량 파괴 | 보드 `--win-tint` + 오버레이 등장(🎉·점수 success 강조) |
| 일시정지 | playing 중 P/Esc | 보드 정지 + paused 오버레이 |
| `prefers-reduced-motion` | OS 설정 | 버튼 `scale`·틴트 fade 등 부가 트랜지션 제거. 공/패들 물리 이동은 게임 콘텐츠라 유지(기획 §7.4) |

---

## 6. dev 구현 가이드

dev-1 이 `phase18-games/breakout/` 를 구현할 때 따를 단계별 지침. **CSS 변수명·클래스명은 아래 권장을 사용**하면 mockup(§7)과 일치해 리뷰가 쉬워진다. (물리·상수·상태 전이는 기획 §3~§6 이 SSOT — 본 가이드는 시각만.)

### 6.1 파일별 역할 (기획 §12 승계)

| 파일 | 디자인 관점 역할 |
|---|---|
| `index.html` | §4.1 마크업 스켈레톤(`breakout-topbar`/`hud`/`board-wrap`+`canvas#board`/`serve-hint`/`board-overlay`/`controls`), `<noscript>` 폴백(기획 §7.5) |
| `styles.css` | §2 토큰 `:root` 정의 + §4 레이아웃 + §5 컴포넌트 상태 스타일 |
| `logic.js` | 순수 게임 로직(기획 §3~§6) — 색상·렌더 무관 |
| `main.js` | canvas 렌더러(§5.1 오브젝트 규칙을 `fillRect`/`roundRect`/`arc` 로 구현) + 상태별 오버레이 토글(§5.4) + 입력 바인딩(기획 §5) |

### 6.2 STEP 1 — `:root` 토큰 복제

§2.1 + §2.2 의 모든 토큰을 `styles.css` `:root` 에 **그대로 복제**한다(mockup `<style>` 과 동일). 색상 하드코딩 금지 — 모든 색은 `var(--…)` 참조.

### 6.3 STEP 2 — 레이아웃 골격 (§4)

1. `body` 배경 `--color-bg-canvas`, `min-height:100vh`, flex 세로 중앙.
2. `main.breakout-app` `max-width:360px; margin:0 auto; padding:var(--space-4)`.
3. 자식 순서: `breakout-topbar` → `hud` → `board-wrap` → `controls`, 간격 `--space-4`.
4. 360px 실측 확인: 보드 `max-width:360px`(패딩 고려 실제 ≈328px 표시), 가로 스크롤 0(§4.3).

### 6.4 STEP 3 — 보드 canvas 렌더러 (§5.1)

- `<canvas id="board" width="360" height="480">`, CSS `width:100%; max-width:360px; aspect-ratio:3/4; touch-action:none;`.
- 그리기 순서(매 프레임): ① 보드 배경(`--board-bg`) 채움 → ② 상/좌/우 벽 하이라이트(`--board-wall`) → ③ 살아있는 벽돌(행별 색 + 상/하 베벨) → ④ 패들(둥근 사각 + 베벨) → ⑤ 공(원 + 외곽 링/halo). gameover/win 시 보드 위 `--gameover-tint`/`--win-tint` 반투명 사각 덮기.
- **벽돌 색 매핑**: `brick.row`(0~4) → `--brick-row-1`~`5`(§5.1 표). `alive===false` 벽돌은 그리지 않는다.
- **공 좌표**: 기획 §6.1 `ball.{x,y}` 물리 좌표를 그대로 캔버스 좌표로 사용(논리=캔버스 동일 `360×480`).

> 참고: canvas 는 CSS 변수를 직접 못 읽으므로, `getComputedStyle(document.documentElement).getPropertyValue('--brick-row-1')` 등으로 토큰 값을 읽어 `fillStyle` 에 주입하거나 JS 팔레트 객체에 §2 값을 미러링(단, styles.css `:root` 가 SSOT — 값 불일치 주의).

### 6.5 STEP 4 — serve 힌트 + 상태 오버레이 (§5.3, §5.4)

- `.serve-hint` 를 `board-wrap` 안 하단 중앙 absolute 배치, `status==='serve'` 일 때만 표시.
- `.board-overlay` 를 `board-wrap` 안 `position:absolute; inset:0`. `main.js` 가 `status` 에 따라: `playing`·`serve`→`hidden`, `start`/`paused`/`gameover`/`win`→내용 교체 후 표시.
- gameover/win 은 보드에 틴트 클래스(`is-gameover`/`is-win`) 추가로 §5.4 틴트 적용.

### 6.6 STEP 5 — 컨트롤 버튼 (§5.5)

- 버튼 3종 클래스(`.btn--primary/secondary/ghost`) 상태별 스타일.
- 주 버튼 라벨/역할을 `status` 에 따라 전환(§5.5 마지막 항목).
- 키보드: `keydown` ←→/A/D(패들), Enter/Space(발사·시작·재시작), P/Escape(일시정지)(기획 §5.2). 포인터: 캔버스 드래그(기획 §5.3).

### 6.7 STEP 6 — 접근성

- canvas 에 `role="img"` + `aria-label`(예: "벽돌깨기 보드, 점수 N, 생명 N") — 보드 자체는 시각 게임임을 명시(pong·snake 관례).
- HUD 점수·생명 값 `aria-live="polite"`, 게임오버/승리 오버레이 `role="status"`.
- 모든 버튼 `focus-visible` 포커스 링(§5.5).
- `@media (prefers-reduced-motion: reduce)`: 버튼 `transform`·틴트 fade 트랜지션 제거(공/패들 물리는 유지, 기획 §7.4).

### 6.8 권장 클래스명 요약 (mockup 과 일치)

```
.breakout-app  .breakout-topbar
.hud  .hud__cell  .hud__label  .hud__value  .hud__lives  .life  .life--full  .life--empty
.board-wrap  #board  .serve-hint  .board-overlay
.overlay__icon  .overlay__title  .overlay__desc  .overlay__stat
.controls  .controls__hint  .btn .btn--primary .btn--secondary .btn--ghost
```

---

## 7. mockup 참조

- **파일**: `docs/design/mockups/breakout-BF-928.html` (단일 self-contained HTML, 외부 의존성 0건, system font, CSS 변수 자체 정의)
- **확인 방법**: `file://` 로 브라우저에서 직접 열기 → 아래 시각 요소가 스크롤 없이 확인됨.
- **mockup 구성 섹션**:
  1. **대표 화면(playing)** — 360px 프레임: 타이틀바 · HUD(점수/생명 하트) · `360×480` 보드(벽돌 5행 일부 파괴 + 패들 + 공) · 조작 힌트 · 컨트롤 버튼. 패들/공/벽돌 시각 구분 노출.
  2. **데스크톱 / 모바일 레이아웃** — 동일 단일 컬럼이 데스크톱(중앙 정렬)·모바일(360px)에서 어떻게 보이는지 나란히 비교(AC-2 반응형 대응).
  3. **상태별 오버레이** — start / serve / paused / gameover / win 미니 보드.
  4. **오브젝트 시각 규칙** — 패들 · 공 · 벽돌 5행 색상 스와치.
  5. **생명 하트 단계** — 3/2/1/0 하트 표현.
  6. **컨트롤 버튼 3종** — primary / secondary / ghost × 상태.
  7. **컬러 토큰 팔레트** — §2 전체 스와치.
- mockup 은 CSS(absolute 배치 + grid)로 보드를 표현(정적 시각화용) — dev 는 canvas 로 구현하되 **색상 토큰·형태·상태 규칙만 일치**시키면 되고 픽셀 단위 일치 의무는 없다(전제 4).

---

## 8. AC 매핑

### 8.1 BF-930(본 designer task) 수용 기준 충족

| 수용 기준 | 충족 근거 |
|---|---|
| **AC-1**: Given 기획 명세, When 디자인 명세 작성, Then `docs/design/breakout-BF-928.md` 와 mockup HTML 이 산출되고 공용 UI 토큰 정합성이 검증된다 | 본 문서 §2(표준 토큰 그대로 승계 + Breakout 전용 토큰 추가로 정합성 검증) · §5(컴포넌트 명세: 보드 오브젝트/HUD/오버레이/버튼) · §3(system font 정합) + §7 mockup(`docs/design/mockups/breakout-BF-928.html`). 경로 `breakout-BF-928.md` 준수(전제 1) |
| **AC-2**: Given 반응형 요구, When mockup 확인, Then 데스크톱/모바일 레이아웃과 게임오버 상태가 시각적으로 확인된다 | §4.3 반응형 규칙 + mockup §7-2(데스크톱/모바일 나란히 비교) + §7-3(상태 오버레이에 gameover 포함, `--gameover-tint` + 사유 + 점수) — `file://` 정적 렌더로 전부 확인 가능 |

### 8.2 기획 명세(BF-929/BF-928) 계약 → 디자인 반영 매핑

| 기획 계약 | 디자인 반영 |
|---|---|
| 보드 `360×480` 세로형, canvas 논리 해상도 | §4.3 보드 논리 해상도 불변(`aspect-ratio:3/4`) + §5.1 오브젝트 렌더 스펙 |
| 패들 `64×10` / 공 반지름 `6` / 벽돌 `40×16` 5행×8열 40개 | §5.1 오브젝트 크기·형태·베벨 규칙(기획 §3.1 상수 준수) |
| 점수(벽돌당 10점) · 생명 3 HUD 표시 | §5.2 HUD(점수 mono 값 + 생명 하트 3개 + 숫자 병기) |
| 상태 6종(start/serve/playing/paused/gameover/win) 전이 | §5.3 serve 힌트 + §5.4 오버레이 표(6상태) + mockup §7-3 |
| 게임오버(생명 소진) / 승리(벽돌 전량) | §5.4 gameover(붉은 틴트·✕·사유·점수) / win(초록 틴트·🎉·점수 success) |
| 키보드(←→/AD/Enter/P) + 캔버스 드래그, D-pad 없음 | §5.6 조작 힌트 + §4.3 `touch-action:none` 캔버스 드래그(온스크린 방향 버튼 미채택, 기획 §0 가정 8) |
| vanilla-static, 외부 의존성 0건 | §3 system font, §2 CSS 변수 자체 정의, mockup self-contained |
| 공용 UI 토큰 정합성 | §2.1 표준 토큰 값 불변 승계(pong·memory-match·snake 와 동일) — 신규는 전용 토큰만 |
| 기존 phase18 게임·기타 파일 불변 | 신규 `docs/design/breakout-BF-928.md` + mockup 만 생성, 기존 파일 미수정 |

---

*문서 종료 — [이디자인] · BF-930 (벽돌깨기 디자인 명세)*
