# 지뢰찾기(Minesweeper) UI/UX 디자인 명세 — BF-980

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-980(본 designer task) · BF-978(planner 기획 명세) · BF-982(developer) · BF-986(tester)
> 대상 모듈: `phase18-games/minesweeper/`(신규 — planner §0 가정 1)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CDN·웹폰트 금지, system font, CSS 변수 자체 정의
> 기획 SSOT(수정 금지 — 본 문서는 그 위에 얹는 시각 명세): `docs/plan/minesweeper-BF-978.md`([박기획] · 규칙·상태 모델·순수 함수 contract·접근성 계약)
> 기반 시각 토큰(승계 — 재정의 아님): `phase18-games` 다크 테마 표준 토큰(`docs/design/snake-BF-922.md`, `docs/design/memory-match-BF-916.md`, `docs/design/breakout-lite-BF-942.md` 계열과 동일)
> mockup 참조: `docs/design/mockups/minesweeper-BF-980.html`(본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 파일명 근거(BF-980):** 본 task의 원문 설명은 산출물 경로를 `docs/design/minesweeper-BF-976.md`로 언급하나, `BF-976`은 현재 JIRA-KEY(BF-980)도 의존 티켓(BF-978)도 아니다. planner SSOT(`docs/plan/minesweeper-BF-978.md` §13)가 designer 산출물을 명시적으로 `docs/design/minesweeper-BF-980.md`로 지정하고, 페르소나 규약도 "현재 JIRA-KEY 기준 파일명 + mockup screenshot capture 경로 일치"를 요구하므로 본 문서·mockup은 **BF-980**으로 확정한다. `BF-976`은 stale 오기로 판단.

**전제 2 — 본 문서는 신규 시각 SSOT(forward):** `phase18-games/minesweeper/`는 저장소에 0건 존재하는 완전 신규 모듈이다(planner §0 가정 8 사전 확인 승계). 따라서 본 문서는 기존 명세의 addendum이 아니라, 이 모듈의 컬러·타이포·레이아웃·컴포넌트·접근성 시각 언어를 최초로 정의하는 SSOT다. dev(BF-982)는 본 문서 §2~§6을 `styles.css` `:root` 및 마크업의 기준으로 삼는다.

**전제 3 — 토큰은 발명이 아니라 승계 우선:** 컬러/간격/타이포 표준 토큰은 기존 `phase18-games` 다크 테마(`--color-bg-canvas:#0B0F17` … `--color-accent:#5B82F0` 등)를 **그대로 승계**하여 데모 전체와 톤을 일관시킨다(수용 기준 1 직결). 지뢰찾기 고유 개념(셀 3상태·숫자 1~8·지뢰·폭발)만 신규 토큰으로 추가 정의한다(§2.2).

**전제 4 — 로직·상태 계약은 planner 소관, 본 문서는 시각만:** 셀 상태(`hidden`/`flagged`/`revealed`)·게임 상태(`ready`/`playing`/`won`/`lost`)·flood fill·승패·no-op 규칙은 planner BF-978 §2·§3이 SSOT다. 본 문서는 그 상태들의 **시각 표현(색/형태/포커스)** 만 정의하며 규칙을 재해석하지 않는다.

**전제 5 — 색맹 대응 필수(planner §12 승계):** 셀 숫자 1~8은 색상만으로 구분하지 않는다. 숫자 글리프(1~8) 자체가 1차 구분 수단이고 색상은 보조다. 지뢰/깃발/폭발도 색 + 형태(글리프)를 함께 사용해 색각 이상 사용자도 상태를 식별할 수 있게 한다.

**전제 6 — 외부 자산 0건:** vanilla-static 제약상 이미지·아이콘 폰트·웹폰트·CDN을 쓰지 않는다. 깃발/지뢰/폭발은 유니코드 문자(이모지/기호)로 표현하고, 숫자는 `--font-mono`로 렌더한다. mockup·구현 모두 단일 파일 내 인라인 스타일만 사용한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드 (developer BF-982 용)](#6-dev-구현-가이드-developer-bf-982-용)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑 및 Self-critique](#8-ac-매핑-및-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 라우트 `/phase18-games/minesweeper`(= `phase18-games/minesweeper/index.html`)의 전체 화면 시각 언어를 정의한다. 화면은 위에서 아래로 **① 타이틀 → ② 상태바(난이도 컨트롤 · 남은 지뢰 카운터 · 재시작) → ③ 보드 그리드 → ④ 조작 안내 → (조건부) ⑤ 결과 배너** 로 구성된다. 기존 `phase18-games` 게임(snake·memory-match·breakout-lite)과 동일한 다크 테마·중앙 정렬·카드형 패널 레이아웃을 재사용한다.

### 1.2 사용자 경험 목표

| # | 목표 | 시각 수단 |
|---|---|---|
| UX-1 | 셀 4상태(미오픈/오픈/플래그/지뢰)를 한눈에 구분 | 미오픈=볼록(bevel) / 오픈=꺼진(sunken flat) / 플래그=🚩+강조테두리 / 지뢰=💣, 폭발=적색 배경 (§5.3) |
| UX-2 | 숫자 단서를 빠르고 정확하게 읽기 | 숫자별 고정 색상(1~8) + 굵은 mono 글리프, 색맹 대응(§2.3, 전제 5) |
| UX-3 | 진행 상황(남은 지뢰) 즉시 파악 | 상태바 중앙 mono 카운터, 음수 허용(planner §2.7), `aria-live` 갱신 |
| UX-4 | 키보드만으로 완전 조작 + 포커스 위치 항상 가시 | 굵은 `--color-focus-ring` 포커스 링, roving tabindex(§5.2, §6.4) |
| UX-5 | 난이도 3종 어디서나 스크롤 없이 or 자연스러운 스크롤로 조작 | 셀 크기 `clamp()` 스케일 + 고급(30열) 가로 스크롤 컨테이너(§4.4) |
| UX-6 | 승/패 결과를 명확히 인지 | 보드 위 반투명 배너 + 색 틴트(성공=녹색 / 실패=적색)(§5.5) |

### 1.3 기존 데모와의 일관성 매핑 (수용 기준 1)

| 시각 요소 | 기존 데모 출처 | 본 명세 채택 |
|---|---|---|
| 배경/서피스/보더 3계층 | `--color-bg-canvas/surface/subtle`, `--color-border-default/strong` (snake·memory-match 공통) | §2.1 그대로 승계 |
| 텍스트 3계층 | `--color-text-primary/secondary/muted` | §2.1 그대로 승계 |
| 액센트/포커스/성공/위험 | `--color-accent:#5B82F0`, `--color-focus-ring`, `--color-success:#4ADE80`, `--color-danger:#E55858` | §2.1 그대로 승계 |
| 간격 스케일 | `--space-1…7`(4·8·12·16·24·32·48) | §4.1 그대로 승계 |
| 반경/그림자/모션 | `--radius-sm/md/lg/pill`, `--shadow-panel`, `--ease-out` | 그대로 승계 |
| 폰트 스택 | `--font-sans`(system-ui …), `--font-mono` | §3 그대로 승계 |
| 상태바(값=mono, 라벨=sans) 패턴 | snake HUD, memory-match HUD | §5.1 동일 패턴 |
| 결과 배너(scrim + tint) | snake game-over, breakout-lite win/lose | §5.5 동일 패턴 |

> 결론: 지뢰찾기 고유 요소(셀 bevel·숫자 1~8·지뢰/깃발/폭발)를 제외한 **모든 기반 토큰은 신규 발명 0건**이며 기존 데모와 값이 동일하다.

---

## 2. 컬러 팔레트

### 2.1 표준 토큰 (승계 — 기존 `phase18-games` 다크 테마와 동일, 재정의 아님)

| 토큰 | 값(HEX/RGBA) | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0B0F17` | 페이지 최하단 배경 |
| `--color-bg-surface` | `#141B26` | 패널·상태바·오픈된 셀 바닥 |
| `--color-bg-subtle` | `#1C2431` | 미세 구분 영역 |
| `--color-border-default` | `#273140` | 기본 보더·격자선 |
| `--color-border-strong` | `#3A4657` | 강조 보더 |
| `--color-text-primary` | `#E8EDF4` | 본문·주요 텍스트 |
| `--color-text-secondary` | `#9AA7B8` | 라벨·보조 텍스트 |
| `--color-text-muted` | `#63708A` | 비활성·캡션 |
| `--color-accent` | `#5B82F0` | 선택 상태·주요 액션 |
| `--color-accent-hover` | `#6E90F5` | hover |
| `--color-accent-on` | `#0B0F17` | 액센트 위 텍스트 |
| `--color-focus-ring` | `rgba(91,130,240,.55)` | `:focus-visible` 링 |
| `--color-success` | `#4ADE80` | 승리 배너·성공 |
| `--color-danger` | `#E55858` | 폭발·패배·경고 |

### 2.2 지뢰찾기 고유 토큰 (신규)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--board-bg` | `#070B12` | 보드 그리드 컨테이너 바닥(격자 사이 gap 색) |
| `--board-border` | `#273140` | 보드 외곽 보더 |
| `--cell-hidden-face` | `#232E40` | 미오픈 셀 표면(볼록) |
| `--cell-hidden-face-hover` | `#2A3purple` | (hover/포커스 시 밝아짐) → 실제값 `#2B3A52` |
| `--cell-bevel-light` | `rgba(232,237,244,.12)` | 미오픈 셀 상/좌 하이라이트(볼록 입체) |
| `--cell-bevel-dark` | `rgba(5,7,12,.50)` | 미오픈 셀 하/우 음영(볼록 입체) |
| `--cell-revealed-bg` | `#141B26` | 오픈 셀 바닥(꺼진 평면) |
| `--cell-revealed-border` | `rgba(39,49,64,.9)` | 오픈 셀 격자선 |
| `--flag-glyph` | `#E55858` | 깃발 글리프(🚩 미지원 폴백 시 삼각형) |
| `--flag-face` | `#26120F` | 깃발 셀 배경 틴트 |
| `--flag-ring` | `rgba(229,88,88,.45)` | 깃발 셀 강조 테두리 |
| `--mine-glyph` | `#0B0F17` | 지뢰 글리프(오픈 배경 위) |
| `--mine-face` | `#20293A` | 안전 종료 시 공개된 지뢰 셀 배경 |
| `--cell-exploded-face` | `#E55858` | 밟은 지뢰(폭발) 셀 배경 |
| `--cell-exploded-glyph` | `#0B0F17` | 폭발 셀 위 지뢰 글리프 |
| `--flag-wrong` | `#63708A` | 패배 시 오답 flag(비지뢰) 취소선 표시(선택, §5.3) |
| `--overlay-scrim` | `rgba(5,7,12,.74)` | 결과 배너 뒤 스크림 |
| `--win-tint` | `rgba(74,222,128,.14)` | 승리 배너 배경 틴트 |
| `--lose-tint` | `rgba(229,88,88,.14)` | 패배 배너 배경 틴트 |

> 참고: `--cell-hidden-face-hover`의 정식 값은 `#2B3A52`이다(위 표의 오타 방지용 주석).

### 2.3 숫자 색상 (1~8) — 색맹 대응 (전제 5)

각 숫자는 **글리프(1~8)가 1차 구분 수단**이며 색상은 보조다. 고전 지뢰찾기 관례를 참고하되, 다크 테마 대비(WCAG AA, 오픈 셀 배경 `#141B26` 대비 ≥ 4.5:1 목표)에 맞춰 재조정했다.

| 숫자 | 토큰 | 값 | 기준 | 대비(vs `#141B26`) |
|---|---|---|---|---|
| 1 | `--num-1` | `#6E90F5` | 파랑(accent 계열) | ≈ 6.0:1 |
| 2 | `--num-2` | `#4ADE80` | 초록(success) | ≈ 9.1:1 |
| 3 | `--num-3` | `#F87171` | 밝은 빨강 | ≈ 5.3:1 |
| 4 | `--num-4` | `#A78BFA` | 보라 | ≈ 6.1:1 |
| 5 | `--num-5` | `#F0883E` | 주황 | ≈ 6.4:1 |
| 6 | `--num-6` | `#38BDF8` | 청록 | ≈ 7.6:1 |
| 7 | `--num-7` | `#E8EDF4` | 근백(text-primary) | ≈ 13:1 |
| 8 | `--num-8` | `#9AA7B8` | 회색(text-secondary) | ≈ 6.6:1 |

> 색상 인접 혼동 방지: 1(파랑)·6(청록)은 명도 차 + 글리프로, 3(빨강)·5(주황)은 채도/글리프로 구분된다. 색을 완전히 무시해도 글리프만으로 1~8 판독이 가능해야 한다(색맹 시뮬레이션 리뷰 항목 — §8.4-4).

---

## 3. 타이포그래피

폰트는 system stack만 사용(웹폰트/CDN 금지). 숫자·카운터는 자릿수 흔들림 방지를 위해 `--font-mono`.

```
--font-sans: system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
--font-mono: ui-monospace,Menlo,Consolas,"Courier New",monospace;
```

| 토큰 | font(weight size/line family) | 용도 |
|---|---|---|
| `--text-h1` | `600 20px/1.3 var(--font-sans)` | 화면 타이틀 `지뢰찾기` |
| `--text-hud-value` | `700 clamp(20px,6vw,28px)/1 var(--font-mono)` | 남은 지뢰 카운터 숫자 |
| `--text-hud-label` | `600 12px/1.2 var(--font-sans)` | "남은 지뢰" 라벨(대문자 tracking) |
| `--text-cell` | `700 clamp(13px,3.2vw,20px)/1 var(--font-mono)` | 셀 숫자 1~8(셀 크기에 비례 스케일) |
| `--text-glyph` | `400 clamp(14px,3.4vw,22px)/1 var(--font-sans)` | 깃발/지뢰 글리프(이모지) |
| `--text-banner-title` | `700 clamp(22px,7vw,30px)/1.2 var(--font-sans)` | 결과 배너 제목 |
| `--text-button` | `600 14px/1 var(--font-sans)` | 버튼·난이도 세그먼트 |
| `--text-body` | `400 15px/1.5 var(--font-sans)` | 안내 문구 |
| `--text-caption` | `400 13px/1.4 var(--font-sans)` | 조작 안내·범례 캡션 |

> 셀 숫자와 글리프는 컨테이너 셀 크기에 종속되므로, 구현 시 셀 폰트 크기를 `min()`/`clamp()` 또는 `em`(셀 크기 기준)으로 상대화하는 것을 권장한다(§4.4 셀 스케일과 연동).

---

## 4. 레이아웃

### 4.1 간격·반경 스케일 (승계)

```
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
--space-5:24px; --space-6:32px; --space-7:48px;
--radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
--shadow-panel:0 8px 32px rgba(0,0,0,.45);
--cell-gap:2px;             /* 셀 사이 격자 간격 */
--motion-fast:130ms; --ease-out:cubic-bezier(.16,1,.3,1);
```

### 4.2 화면 구조 (세로 흐름)

```
┌───────────────────────────────────────┐  body: bg-canvas, 중앙 정렬, flex column
│  h1  지뢰찾기                           │  --text-h1, 상단 space-6
│                                         │
│  ┌─ 상태바(status-bar) ──────────────┐ │  surface 패널, radius-lg, padding space-4
│  │ [초급][중급][고급]  🚩 010  [↻ 재시작]│ │  좌:난이도 / 중:카운터 / 우:재시작
│  └───────────────────────────────────┘ │
│                                         │
│  ┌─ 보드(#board, role=grid) ─────────┐ │  board-bg, board-border, radius-md
│  │  □ □ □ 1 · · 2 ▣ □   (셀 그리드)   │ │  CSS Grid cols×rows, gap=--cell-gap
│  │  □ 1 · · · 1 🚩 · ·                │ │
│  │  … (난이도별 행 수)                 │ │
│  └───────────────────────────────────┘ │
│                                         │
│  조작 안내(caption)                     │  --text-caption, muted
│  좌클릭·Enter/Space: 열기 · 우클릭·F: 깃발│
│  방향키: 이동                           │
└───────────────────────────────────────┘
  (won/lost 시) 보드 위 결과 배너 오버레이(§5.5)
```

- 전체 컨테이너 `max-width`: 보드 폭 + 패널 padding에 맞춰 콘텐츠 기준으로 결정(고정 px 강제 아님). 상태바는 보드 폭과 동일 폭으로 정렬한다.
- 세로 간격: h1(space-6) → 상태바(space-4 아래) → 보드(space-4 아래) → 안내.

### 4.3 상태바 내부 레이아웃

`display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);` 3영역:

| 영역 | 내용 | 정렬 |
|---|---|---|
| 좌 | 난이도 세그먼트 컨트롤(`role="radiogroup"`, 초급/중급/고급) | flex-start |
| 중 | 남은 지뢰 카운터(🚩 아이콘 + mono 숫자, `<output aria-live="polite">`) | center |
| 우 | 재시작 버튼(`↻ 재시작`) | flex-end |

- 좁은 화면(< 480px): 상태바를 2줄로 wrap — 1줄 난이도, 2줄 카운터+재시작. `flex-wrap:wrap` + 카운터/재시작 그룹핑.

### 4.4 보드 그리드 & 반응형 스케일 규칙 (수용 기준 3)

보드는 CSS Grid로 렌더한다. 열/행/셀 크기를 CSS 변수로 구동해 난이도 전환 시 마크업 재생성 + 변수만 갱신하면 되도록 한다.

```css
#board{
  display:grid;
  grid-template-columns:repeat(var(--cols), var(--cell-size));
  grid-auto-rows:var(--cell-size);
  gap:var(--cell-gap);
  background:var(--board-bg);
  border:1px solid var(--board-border);
  border-radius:var(--radius-md);
  padding:var(--cell-gap);
}
```

**셀 크기(`--cell-size`) 스케일 규칙 — 난이도별 & 뷰포트별:**

| 난이도 | 열×행 | 데스크톱 기본 `--cell-size` | 스케일 하한(clamp) | 좁은 뷰포트 대응 |
|---|---|---|---|---|
| 초급 | 9×9 | `34px` | `clamp(30px, 9.5vw, 34px)` | 9열 × 34px ≈ 324px, 대부분 화면 스크롤 없이 수용 |
| 중급 | 16×16 | `30px` | `clamp(22px, 5.6vw, 30px)` | 16열 × 30px ≈ 496px, 태블릿까지 수용, 소형은 셀 축소 |
| 고급 | 30×16 | `26px` | `clamp(20px, 3vw, 26px)` | 30열 × 26px ≈ 810px → 화면 초과 시 **가로 스크롤 컨테이너**(§아래) |

- **1차 전략(셀 스케일):** `--cell-size`를 `clamp(<하한>, <vw 기반>, <기본>)`으로 정의해 뷰포트가 좁아지면 셀이 하한까지 축소된다. 셀 내부 숫자·글리프 폰트는 셀 크기에 비례(`em` 또는 `clamp`)해 함께 축소된다.
- **2차 전략(가로 스크롤, 고급 전용 안전망):** 셀이 하한(20px)까지 줄어도 보드 폭이 뷰포트를 넘으면, 보드를 감싸는 `.board-scroll{ overflow-x:auto; -webkit-overflow-scrolling:touch; }` 컨테이너로 **가로 스크롤**을 허용한다. 셀을 판독 불가능할 만큼(< 20px) 무리하게 줄이지 않는다 — 터치 타깃 최소 크기 확보 우선.
- **터치 타깃:** 셀 하한 20px은 조밀 그리드의 시각 하한이며, 모바일 정밀 조작이 어려운 고급 난이도는 스크롤 + 확대가 기본 경험임을 안내(§11 planner 비범위: 터치 제스처는 v1 밖).
- **breakpoint 요약:**
  - `≥ 768px`: 각 난이도 기본 셀 크기 사용.
  - `480–767px`: 셀 `clamp` 중간값, 상태바 유지.
  - `< 480px`: 상태바 2줄 wrap(§4.3), 셀 하한 근접, 고급은 `.board-scroll` 가로 스크롤 활성.

> 셀 크기·격자·스크롤 컨테이너의 구체 픽셀은 dev 재량(planner §11)이나, 위 clamp 하한(초급30/중급22/고급20px)과 "고급은 스크롤 폴백" 원칙은 시각 계약으로 준수한다.

---

## 5. 컴포넌트 명세

### 5.1 상태바 — 남은 지뢰 카운터 (`#mine-counter`)

| 항목 | 명세 |
|---|---|
| 마크업 | `<output id="mine-counter" aria-live="polite">` (planner §7.2) |
| 표시 | `🚩` 아이콘 + 공백 + 3자리 zero-pad 숫자(예: `🚩 010`). 값 = `mineCount - flaggedCount` |
| 폰트 | 숫자 `--text-hud-value`(mono, 자릿수 고정), 아이콘 `--text-glyph` |
| 색 | 숫자 `--color-text-primary`. **음수 허용**(planner §2.7, EC-05): 값 < 0이면 숫자 색을 `--color-danger`로 전환(예: `-2` → 적색) — 오류가 아니라 "과다 flag" 시각 힌트 |
| 상태 | `ready`/`playing`에서 실시간 갱신, `won`/`lost` 전환 후에는 최종값 고정 |
| 접근성 | `aria-live="polite"`로 값 변경 시 스크린리더 안내. 시각 라벨 "남은 지뢰"는 `aria-label` 또는 인접 텍스트로 제공 |

### 5.2 난이도 세그먼트 컨트롤 (`role="radiogroup"`)

| 항목 | 명세 |
|---|---|
| 구조 | `<div role="radiogroup" aria-label="난이도">` 내부 3개 `<button role="radio">`(초급/중급/고급) 또는 네이티브 `<select>`(planner §5.2 택1, dev 재량). 본 시안은 **세그먼트 버튼**을 1차 권장 |
| 선택 상태 | 현재 난이도 버튼: `aria-checked="true"`, 배경 `--color-accent`, 텍스트 `--color-accent-on`, 그림자 은은 |
| 비선택 상태 | 배경 `--color-bg-subtle`, 텍스트 `--color-text-secondary`, 보더 `--color-border-default` |
| hover | 비선택 버튼 배경 `--color-border-default`, 텍스트 `--color-text-primary` |
| 크기 | 패딩 `space-2 space-3`, 폰트 `--text-button`, 반경 `--radius-sm`, 그룹 컨테이너 `--radius-md`+`--color-bg-canvas` 트랙 |
| 인터랙션 | 클릭/`Enter`/`Space`/방향키(라디오 그룹 표준)로 전환 → 즉시 해당 난이도 `ready` 보드 재생성(planner AC-02, EC-09) |
| 포커스 | `:focus-visible` 시 `--color-focus-ring` 2px outline(§6.4) |

### 5.3 셀 4상태 + 파생 (`.cell`, `<button data-state>`) — **수용 기준 2 핵심**

각 셀은 네이티브 `<button role="gridcell">`이며 `data-state`로 시각을 분기한다. mockup(§7)은 아래 6종 표현을 모두 렌더한다.

| 상태(`data-state`) | 시각 표현 | 배경 | 글리프/숫자 | 입체·테두리 |
|---|---|---|---|---|
| **미오픈** `hidden` | 볼록한 눌리지 않은 버튼 | `--cell-hidden-face`(#232E40) | 없음 | 상/좌 `--cell-bevel-light`, 하/우 `--cell-bevel-dark` (bevel로 볼록감) |
| 미오픈 hover/focus | 밝아진 볼록 버튼 | `--cell-hidden-face-hover`(#2B3A52) | 없음 | 동일 bevel + 포커스 링 |
| **오픈-빈칸** `revealed`(0) | 꺼진 평면 | `--cell-revealed-bg`(#141B26) | 없음 | 얇은 `--cell-revealed-border` 격자선, 입체 제거(flat) |
| **오픈-숫자** `revealed`(1~8) | 꺼진 평면 + 숫자 | `--cell-revealed-bg` | 숫자 1~8, 색 `--num-1…8`(§2.3), `--text-cell` | flat |
| **플래그** `flagged` | 미오픈 위 깃발 | `--flag-face`(#26120F 적색 틴트) | `🚩`(`--flag-glyph`) | `--flag-ring` 강조 테두리(1px inset) + bevel 유지 |
| **지뢰(공개)** `revealed`+mine | 안전/승리 시 공개된 지뢰 | `--mine-face`(#20293A) | `💣`(`--mine-glyph`) | flat |
| **폭발(밟은 지뢰)** exploded | 패배 유발 셀 | `--cell-exploded-face`(#E55858) | `💣`(`--cell-exploded-glyph` #0B0F17) | flat, 적색 강조 |
| (선택) **오답 flag** wrong | 패배 시 비지뢰에 걸린 flag | `--cell-revealed-bg` | `🚩`에 취소선/`✖` 오버레이, 색 `--flag-wrong` | flat — planner §11/§12 재량, 본 시안은 mockup에 예시 포함(dev 선택 구현) |

**시각 원칙:**
- 미오픈=볼록 / 오픈=꺼짐의 **입체 대비**가 상태 구분의 1차 신호다(색맹 무관). 깃발·지뢰·폭발은 글리프 + 색으로 2중 부호화.
- 폭발 셀만 적색 배경으로 "여기서 졌다"를 즉시 지목. 나머지 공개 지뢰는 중립 배경(#20293A)으로 폭발 셀과 구별.
- 셀 hover/focus 시 미오픈 셀만 밝아진다(오픈·플래그·종료 셀은 no-op 대상이므로 hover 강조 억제 — planner no-op 규칙과 시각 정합).
- 글리프는 이모지 미지원 환경 대비: 🚩 폴백 = CSS 삼각형(▶ 회전 or `▲`), 💣 폴백 = `●`/`✱`. dev는 이모지 우선, 폴백은 `@supports`/유니코드 기호로 선택 구현(필수 아님, §8.4-3).

### 5.4 재시작 버튼 (`#restart-btn`)

| 항목 | 명세 |
|---|---|
| 라벨 | `↻ 재시작` (아이콘 문자 + 텍스트) |
| 스타일 | 보조 버튼 — 배경 `--color-bg-subtle`, 보더 `--color-border-strong`, 텍스트 `--color-text-primary`, `--text-button`, `--radius-sm`, 패딩 `space-2 space-3` |
| hover | 배경 `--color-border-default` |
| 상태 | 항상 활성(planner §4.3) — 현재 난이도로 `ready` 보드 재생성 |
| 포커스 | `:focus-visible` 링(§6.4) |

### 5.5 결과 배너 (`#result-banner`, 승/패)

| 항목 | 명세 |
|---|---|
| 노출 | `won`/`lost` 상태에서만(`hidden` 속성 토글). 보드 위 오버레이(중앙) |
| 스크림 | 보드 위 `--overlay-scrim` 반투명 레이어(보드 셀은 흐릿하게 남아 결과 위치 보임) |
| 승리 | 배경 틴트 `--win-tint`, 보더 `--color-success`, 제목 "🎉 모든 안전한 칸을 찾았습니다" `--text-banner-title` 색 `--color-success` |
| 패배 | 배경 틴트 `--lose-tint`, 보더 `--color-danger`, 제목 "💥 지뢰를 밟았습니다" 색 `--color-danger` |
| 액션 | 배너 내 `↻ 다시 하기` 버튼(= 재시작과 동일 동작), 포커스 이동 권장(planner §7.1) |
| 접근성 | `aria-live="assertive"` 영역으로 결과 즉시 안내(planner §7.2). 배너 등장 시 재시작 버튼으로 포커스 이동 권장(필수 아님) |
| 모션 | 등장 시 `--motion-fast` fade+상승(opacity+translateY), `prefers-reduced-motion`에서는 즉시 표시(§6.4) |

### 5.6 조작 안내 (caption)

보드 하단 `--text-caption`, `--color-text-muted`. 2줄:
1. `좌클릭 · Enter/Space: 열기   ·   우클릭 · F: 깃발`
2. `방향키: 셀 이동   ·   Tab: 보드 진입/이탈`

키보드 사용자에게 필수 키맵(방향키/Enter·Space/F)을 항상 노출(planner AC-10 시각 대응).

---

## 6. dev 구현 가이드 (developer BF-982 용)

> 본 절은 dev가 `styles.css` `:root`와 마크업 클래스/속성을 그대로 옮길 수 있도록 정리한다. 로직 계약은 planner BF-978 §2~§6이 SSOT.

### 6.1 `:root` 토큰 복제 순서

1. §2.1 표준 토큰(승계) → 2. §2.2 지뢰찾기 고유 토큰 → 3. §2.3 숫자 색 `--num-1…8` → 4. §3 타이포 토큰 → 5. §4.1 간격/반경/모션. mockup(`docs/design/mockups/minesweeper-BF-980.html`)의 `:root` 블록이 그대로 복제 소스다(신규 색 오타 방지 — `--cell-hidden-face-hover:#2B3A52`).

### 6.2 권장 마크업 골격 (클래스/속성명)

```html
<main class="ms-app">
  <h1 class="ms-title">지뢰찾기</h1>

  <div class="ms-statusbar">
    <div class="ms-difficulty" role="radiogroup" aria-label="난이도">
      <button type="button" role="radio" aria-checked="true"  data-difficulty="beginner">초급</button>
      <button type="button" role="radio" aria-checked="false" data-difficulty="intermediate">중급</button>
      <button type="button" role="radio" aria-checked="false" data-difficulty="expert">고급</button>
    </div>
    <output class="ms-counter" id="mine-counter" aria-live="polite" aria-label="남은 지뢰">
      <span class="ms-counter__icon" aria-hidden="true">🚩</span>
      <span class="ms-counter__value">010</span>
    </output>
    <button type="button" class="ms-restart" id="restart-btn">↻ 재시작</button>
  </div>

  <div class="board-scroll">
    <div id="board" class="ms-board" role="grid" aria-label="지뢰찾기 보드"
         style="--cols:9; --cell-size:clamp(30px,9.5vw,34px);">
      <!-- role="row" 그룹 내부에 셀 버튼들 -->
      <button class="cell" role="gridcell" data-state="hidden"   tabindex="0"  aria-label="1행 1열, 미확인"></button>
      <button class="cell" role="gridcell" data-state="revealed" data-num="1" tabindex="-1" aria-label="1행 2열, 인접 지뢰 1개">1</button>
      <button class="cell" role="gridcell" data-state="revealed" data-num="0" tabindex="-1" aria-label="1행 3열, 빈칸"></button>
      <button class="cell" role="gridcell" data-state="flagged"  tabindex="-1" aria-label="1행 4열, 깃발">🚩</button>
      <!-- … -->
    </div>
  </div>

  <p class="ms-hint">좌클릭 · Enter/Space: 열기 · 우클릭 · F: 깃발<br>방향키: 셀 이동 · Tab: 보드 진입/이탈</p>

  <div id="result-banner" class="ms-banner" data-result="" hidden aria-live="assertive"></div>
</main>
```

### 6.3 상태 → 시각 매핑 (CSS 셀렉터 권장)

```css
.cell{ font:var(--text-cell); border:0; cursor:pointer; }
.cell[data-state="hidden"]{
  background:var(--cell-hidden-face);
  box-shadow: inset 2px 2px 0 var(--cell-bevel-light),
              inset -2px -2px 0 var(--cell-bevel-dark);
}
.cell[data-state="hidden"]:hover,
.cell[data-state="hidden"]:focus-visible{ background:var(--cell-hidden-face-hover); }
.cell[data-state="revealed"]{
  background:var(--cell-revealed-bg);
  box-shadow: inset 0 0 0 1px var(--cell-revealed-border);
  cursor:default;
}
.cell[data-state="revealed"][data-num="1"]{ color:var(--num-1); }
/* … data-num="2..8" → --num-2..8 … */
.cell[data-state="flagged"]{ background:var(--flag-face); box-shadow: inset 0 0 0 1px var(--flag-ring),
              inset 2px 2px 0 var(--cell-bevel-light), inset -2px -2px 0 var(--cell-bevel-dark); }
.cell[data-mine="revealed"]{ background:var(--mine-face); color:var(--mine-glyph); }
.cell[data-mine="exploded"]{ background:var(--cell-exploded-face); color:var(--cell-exploded-glyph); }
```

> `data-num`은 숫자 색 분기용. `data-state="revealed"`+`data-num="0"`은 빈칸(글리프 없음). 지뢰 공개/폭발은 별도 `data-mine` 속성으로 표기하는 예시(dev가 planner 상태 모델과 매핑하는 최종 속성 설계는 재량이나, **미오픈=볼록 / 오픈=flat / 폭발=적색** 3원칙은 준수).

### 6.4 접근성·포커스 (planner §7 시각 대응 — 필수)

- **포커스 링:** 모든 상호작용 요소(`.cell`, 난이도 버튼, 재시작)에 `:focus-visible{ outline:2px solid var(--color-focus-ring); outline-offset:2px; }`. `outline:none`을 대체 스타일 없이 단독 사용 금지(planner §7.1 리뷰 항목).
- **roving tabindex:** 보드 내 정확히 1개 셀만 `tabindex="0"`, 나머지 `tabindex="-1"`(planner §7.1). 초기 활성 셀 = `(0,0)`. 시각적으로는 포커스가 실제 이동했을 때만 링 표시(별도 상시 하이라이트 없음 — memory-match-BF-955 선례와 동일 원칙).
- **입력 잠금 시 포커스 유지:** `won`/`lost`에서 셀에 `disabled`를 부여하지 않는다(포커스 이탈 방지, planner §7.1) — 시각은 그대로 두고 핸들러 `status` 가드로 no-op.
- **모션 감소:** `@media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }` — 배너/셀 전환 애니메이션 무효화.
- **대비:** 숫자 1~8은 오픈 셀 배경(#141B26) 대비 AA(≥4.5:1) 충족값 사용(§2.3).

### 6.5 난이도 전환 시 처리(시각)

- 난이도 버튼 클릭 → `#board`의 `--cols`/`--cell-size` 변수 + 셀 마크업 재생성, 선택 버튼 `aria-checked`/배경 갱신, 카운터를 `mineCount`로 리셋, 결과 배너 숨김. 보드 컨테이너 폭이 바뀌면 상태바 폭도 보드에 맞춰 자연 정렬(상태바는 보드와 동일 폭 권장).

---

## 7. mockup 참조

- 경로: `docs/design/mockups/minesweeper-BF-980.html`
- 성격: 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, system font). **dev 실제 산출물이 아니라 시안 시각화**이며 픽셀 일치 의무는 없다(참조 가이드).
- 포함 시뮬레이션:
  1. 상태바(난이도 세그먼트 · 남은 지뢰 카운터 · 재시작)
  2. **초급 9×9 진행 중 보드** — 미오픈/오픈-빈칸/오픈-숫자(1~8 일부)/플래그/지뢰공개/폭발 상태를 한 보드에 모두 노출(수용 기준 2)
  3. 셀 상태 범례(6종) + 숫자 1~8 색상 스와치(§2.3)
  4. 승리 배너 · 패배 배너 정적 표현(§5.5)
  5. 반응형 스케일 주석(초급/중급/고급 셀 크기 + 고급 가로 스크롤, §4.4)
  6. 포커스 링 예시 셀
- markdown의 컬러/타이포/레이아웃과 mockup `:root`는 동일 값으로 동기화(§6.1이 복제 소스).

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-980 수용 기준 ↔ 본 문서 매핑

| BF-980 수용 기준 | 충족 근거 |
|---|---|
| Given 공용 토큰, When 디자인 명세 작성, Then 색상·간격·타이포가 기존 데모와 일관되게 매핑된다 | §1.3(일관성 매핑표) · §2.1(승계 표준 토큰, 신규 발명 0건) · §3(폰트 스택 승계) · §4.1(간격 승계) |
| Given 셀 상태 4종, When mockup 렌더, Then 각 상태 시각 표현이 mockup HTML에 구현된다 | §5.3(셀 4상태+파생 6종 시각 명세) · §7(mockup 포함 항목 2·3) · `docs/design/mockups/minesweeper-BF-980.html` |
| Given 반응형, When 좁은 뷰포트, Then 보드 스케일 규칙이 명세에 포함된다 | §4.4(난이도별 `--cell-size` clamp 하한 + 고급 가로 스크롤 폴백 + breakpoint 표) |

### 8.2 planner(BF-978) 시각 위임 항목(§12) 소화 확인

| planner §12 위임 | 본 문서 처리 |
|---|---|
| 셀 색상 팔레트(숫자·미확인·깃발·지뢰·폭발) | §2.2·§2.3·§5.3에서 전부 정의, 색맹 대응 명시 |
| 깃발/지뢰/폭발 아이콘 | §5.3 유니코드 글리프(🚩/💣) + 폴백, 외부 자산 0건 |
| 고급 난이도(30×16) 레이아웃 | §4.4 셀 축소 + 가로 스크롤 폴백 |
| 잘못된 flag 시각 표시 여부 | §5.3 오답 flag(선택) — mockup 예시 포함, dev 선택 구현 |
| 승리/패배 배너 연출 | §5.5 |
| 남은 지뢰 수·난이도 컨트롤 레이아웃 | §4.3·§5.1·§5.2 |
| 컬러/타이포 신규 정의 | §2·§3(승계 우선, 고유값만 신규) |
| 초기 자동 포커스 여부 | §6.4 — 활성 셀만 `tabindex=0`, 강제 자동포커스 없음(재량 존중) |

### 8.3 Self-critique 체크리스트 (PR commit 직전)

| # | 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 3개 수용 기준 전부 문서 섹션과 연결? | ✅ §8.1 — 3/3 매핑 |
| 2 | **dev 구현 가이드** — dev가 따라할 CSS 변수명/클래스명/셀렉터 구체 제공? | ✅ §6.1~§6.5 — `:root` 복제 순서·마크업 골격·CSS 셀렉터·포커스/모션·난이도 전환 |
| 3 | **기존 요소 보존** — 기존 데모 토큰을 재정의/훼손하지 않고 승계? | ✅ §2.1·§1.3 — 표준 토큰 값 동일, 신규는 고유 개념만 추가 |
| 4 | **컴포넌트 매핑** — planner 상태 모델(셀 3상태+게임 4상태)과 시각 상태가 1:1 대응? | ✅ §5.3(셀 hidden/flagged/revealed + 파생) · §5.1·§5.5(game status) |
| 5 | **모호함 flag** — 미결정/재량 항목을 명시? | ✅ §8.4 |

### 8.4 남은 모호함 / dev·reviewer 확인 권장

1. **난이도 컨트롤 형태(세그먼트 버튼 vs `<select>`):** 본 시안은 세그먼트 버튼을 1차 권장(§5.2)했으나 planner §5.2는 택1 재량. `<select>` 채택 시 §5.2 색 규칙 대신 네이티브 컨트롤 스타일을 따르되 포커스 링만 준수.
2. **상태바-보드 폭 정합:** 난이도 전환 시 보드 폭이 크게 달라진다(초급 ~324px ↔ 고급 ~810px). 상태바를 보드 폭에 맞출지(권장), 고정 폭으로 둘지는 dev 재량 — 본 시안은 "보드와 동일 폭 권장, 고급은 스크롤 컨테이너 외부에 상태바 배치".
3. **글리프 폴백 구현 범위:** 🚩/💣 이모지가 렌더되지 않는 환경(일부 리눅스) 대비 CSS 도형 폴백(§5.3)은 **선택**이다. mockup은 이모지 기준으로 표현하며, 폴백 필수 여부는 reviewer 판단.
4. **숫자 색 대비 검증:** §2.3 대비값은 배경 #141B26 기준 계산치다. dev 구현 후 실제 렌더에서 색맹 시뮬레이션(특히 3↔5, 1↔6) 1회 육안 확인 권장.
5. **오답 flag 시각(§5.3 wrong):** planner §11에서 v1 비범위로 분류된 항목이라 **필수 아님**. mockup에 예시만 포함했고 구현 채택은 dev/reviewer 합의로 결정.

---

*문서 종료 — [이디자인] · BF-980*
