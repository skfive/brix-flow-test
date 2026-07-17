# 메모리 매치 디자인 명세 — BF-916 (Phase 18 games · memory-match)

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-918 (본 designer task) · BF-916 (상위 Epic/부모 스토리, File Ownership 원문) · BF-917 (planner 산출물)
> 대상 라우트: `/phase18-games/memory-match` (= 저장소 최상위 `phase18-games/memory-match/`, 신규 디렉터리 — planner §0 가정 1)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CDN·웹폰트 금지, system font, CSS 변수 자체 정의
> 기획 SSOT(수정 금지): `docs/plan/memory-match-BF-916.md` (planner [박기획] · BF-917) — 게임 규칙·상태 전이·순수 함수 contract·AC 의 단일 진실
> mockup 참조: `docs/design/mockups/memory-match-BF-916.html` (본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제

본 문서는 planner 명세(`docs/plan/memory-match-BF-916.md`)를 **시각 디자인**으로 구체화한 designer 산출물이다. 코드 구현·게임 로직은 후속 dev task 담당이며, 본 문서는 컬러/타이포/레이아웃/컴포넌트 토큰 + dev 구현 가이드까지만 정의한다(순수 함수 로직은 정의하지 않음 — planner §6 이 SSOT).

**핵심 디자인 원칙 — "기존 게임 계열과 일관, 카드 상태를 색·모양 이중 인코딩으로 명확히":**
`memory-match` 는 신규 module 이지만 시각 언어를 새로 발명하지 않는다. 저장소의 기존 `phase18-games` 계열(`pong`)과 게임 계열(`tetris`/`snake`/`game-2048`/`dice`)이 공유하는 **다크 테마 + brix-Flow 표준 토큰 네이밍**(`--color-bg-*`/`--color-text-*`/`--color-accent`/`--space-*`/`--radius-*`/`--text-*`)을 그대로 승계한다. 그 위에 메모리 매치 고유의 **카드 3상태(뒷면/앞면/확정)** 를 카드 전용 토큰(`--card-*`)으로 얹고, 색상 단독이 아닌 **기호(이모지) + 테두리/글로우 + 상태 라벨** 로 상태를 다중 인코딩하여 색맹 사용자도 구분 가능하게 한다(planner §12 색맹 대응 요구).

**전제 — vanilla-static 제약(TECH_STACK_POLICY):**
- 외부 의존성 0건. CDN·Google Fonts 금지 → **system font stack 만 사용**(`system-ui, -apple-system, sans-serif` / `ui-monospace, Menlo, monospace`).
- 디자인 토큰 파일(design-tokens.json) 없음 → CSS 변수는 각 산출물(`styles.css`) `:root` 에 **직접 정의**. 본 명세가 그 SSOT 값을 확정한다.
- mockup HTML 은 단일 self-contained 파일 — 외부 link/script 0건, 이모지 기호는 유니코드 문자(외부 이미지 0건, planner §0 가정 3).

**테마 결정 — 다크 단일(라이트 팔레트 미발명):**
기존 게임 계열(`pong`/`tetris`/`snake` 다크 default)과의 일관성을 근거로 **다크 단일 테마**로 확정한다. 라이트 오버라이드·테마 토글은 v1 비범위(planner §11). 이 결정과 파급은 §8.4 모호함에 flag 한다.

**렌더링 전제:** mockup HTML 의 카드 보드는 **실제 게임 로직이 아니라 CSS 로 시뮬레이션한 정적 시안**이다. 4×4 보드의 대표 프레임(일부 카드 hidden / revealed / matched / mismatch 상태를 동시에 보여줌)으로 상태별 스타일을 한 화면에 노출한다. dev 는 mockup 을 시각 가이드로 참조하되 픽셀 단위 일치 의무는 없다(planner §0 가정 1).

**경로 참고:** 산출물은 File Ownership(`docs/design/**`) 내 2개 — 명세 `docs/design/memory-match-BF-916.md` + mockup `docs/design/mockups/memory-match-BF-916.html`. 파일명 키는 task 수용 기준(`docs/design/memory-match-BF-916.md`)과 planner 규약에 맞춰 **Epic key `BF-916`**(memory-match 기능 공유 키)을 사용한다(본 task 번호 BF-918 이 아님 — spec↔mockup↔planning 파일 정합). `phase18-games/memory-match/*` 코드는 후속 dev task 담당이며 본 task 에서 생성하지 않는다.

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
| 신규 화면 | `phase18-games/memory-match/` — 4×4(16장, 8쌍) 카드 매칭 게임, 카드 보드 + HUD(이동 횟수·타이머) + 재시작 |
| 화면 구조 | 상단바(타이틀) → HUD(이동 횟수 · 타이머 · 재시작) → 4×4 카드 보드 → 조작 안내, 세로 스택(planner §4.2) |
| 카드 상태 | `hidden`(뒷면) / `revealed`(앞면 공개) / `matched`(짝 확정 고정) + `mismatch`(불일치 복귀 직전 순간 표현, planner §2.2) |
| 게임 상태 | `idle` / `playing` / `checking`(입력 잠금) / `won`(완료 배너) — HUD·오버레이에 반영(planner §3.2) |
| 디자인 언어 | 기존 게임 계열 다크 테마 + brix-Flow 표준 토큰 승계, 카드만 전용 토큰(`--card-*`) |
| 카드 기호 | `pairId` 0~7 ↔ 이모지 8종 + 쌍별 은은한 accent 색 — 색·모양 이중 인코딩(planner §12) |
| 테마 | **다크 단일**(§0) |
| 접근성 | 카드 네이티브 `<button>`, 포커스 링, `aria-label` 상태 안내, 라이브 리전(이동/매치/완료), 360px 44×44 터치 타깃 |

### 1.2 사용자 경험 목표 (planner §1.1 승계)

- **진입 즉시** "카드를 뒤집어 짝을 맞추는 게임"이 읽히도록 — 뒷면 패턴이 통일된 16장 카드가 4×4 격자로 정렬되고, HUD 에 `이동 횟수: 0회 · 00:00` 이 명확히 보인다.
- **카드 상태 전이가 시각적으로 명확** — 뒷면(뒤집기 전) → 앞면(기호 공개) → 확정(은은한 성공 글로우로 고정)의 3단계가 한눈에 구분되고, 불일치는 짧은 흔들림/경고 톤으로 "틀렸다"가 즉시 읽힌다.
- **360px 소형 모바일**에서도 4×4 보드가 가로 스크롤 없이 전부 보이고, 각 카드가 손가락으로 탭 가능한 최소 44×44px 터치 타깃을 확보한다(planner §7.2).
- **키보드만으로 완주 가능** — `Tab` 으로 16장 카드 + 재시작 버튼에 순서대로 도달하고, `Enter`/`Space` 로 뒤집기·재시작이 마우스와 동일하게 동작하며, 포커스 위치가 항상 또렷한 링으로 보인다(planner §7.1).
- **완료의 성취감** — 8쌍을 모두 맞추면 보드 위에 완료 배너가 떠 최종 이동 횟수·소요 시간을 강조하고, 재시작 버튼으로 즉시 새 게임을 시작할 수 있다.

### 1.3 화면 상태 요약 (planner §3.2 상태 → 시각 매핑)

| game.status | 보드 표현 | HUD | 오버레이 | 주요 버튼 |
|---|---|---|---|---|
| `idle` | 16장 전부 뒷면(hidden), 정적 | `이동 횟수: 0회` · `00:00`(정지) | 없음 | 재시작 (secondary, 활성) |
| `playing` | 0~1장 revealed, 나머지 hidden/matched | 이동 횟수 실시간 · 타이머 카운트업 | 없음 | 재시작 (secondary) |
| `checking` | 2장 revealed(판정 대기) — **보드 입력 잠금** | 이동 횟수 방금 +1 · 타이머 진행 | (없음, 카드 자체가 판정 표현) | 재시작 (secondary, 예외적 활성) |
| `won` | 16장 전부 matched | 최종 이동 횟수 · 소요 시간 고정 | **완료 배너**(성취 + 최종 기록) | 다시하기 (primary, 포커스 이동) |
| JS 비활성 | — | — | `<noscript>` 안내 문구 | — |

---

## 2. 컬러 팔레트

전부 HEX(또는 rgba) 값으로 확정한다. dev 는 `phase18-games/memory-match/styles.css` `:root` 에 아래 토큰을 그대로 정의한다.

### 2.1 표준 토큰 (다크 테마 — 기존 게임 계열 승계)

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 페이지 배경 | `--color-bg-canvas` | `#0B0F17` | `body` 배경 |
| 표면 | `--color-bg-surface` | `#141B26` | HUD 바 · 완료 배너 카드 배경 |
| 미묘 표면 | `--color-bg-subtle` | `#1C2431` | 재시작 버튼(secondary) 기본 배경 · 조작 안내 배경 |
| 기본 테두리 | `--color-border-default` | `#273140` | HUD·카드·배너 테두리 |
| 강조 테두리 | `--color-border-strong` | `#3A4657` | hover 테두리 |
| 본문 텍스트 | `--color-text-primary` | `#E8EDF4` | 제목 · HUD 값 · 버튼 라벨 |
| 보조 텍스트 | `--color-text-secondary` | `#9AA7B8` | HUD 라벨 · 안내문 |
| 흐린 텍스트 | `--color-text-muted` | `#63708A` | 캡션 · 비활성 |
| 강조(브랜드) | `--color-accent` | `#5B82F0` | primary 버튼 배경 · 포커스 링 · revealed 카드 테두리 |
| 강조 hover | `--color-accent-hover` | `#6E90F5` | primary 버튼 hover |
| 강조 위 텍스트 | `--color-accent-on` | `#0B0F17` | primary 버튼 라벨(대비 확보) |
| 포커스 링 | `--color-focus-ring` | `rgba(91,130,240,0.55)` | 키보드 포커스 3px 아웃라인 |
| 성공(매치) | `--color-success` | `#4ADE80` | matched 카드 글로우/테두리 · 매치 안내 톤 |
| 위험(불일치) | `--color-danger` | `#E55858` | mismatch 순간 카드 흔들림/테두리 톤 |

> WCAG 대비 확인: `--color-text-primary`(#E8EDF4) on `--color-bg-canvas`(#0B0F17) ≈ 15.8:1, on `--color-bg-surface`(#141B26) ≈ 13.1:1 — AAA. `--color-text-secondary`(#9AA7B8) on surface ≈ 6.4:1 — AA(본문)/AAA(대형). primary 버튼 라벨 `--color-accent-on`(#0B0F17) on `--color-accent`(#5B82F0) ≈ 6.9:1 — AA 이상.

### 2.2 카드 전용 토큰 (memory-match 신규 — 최소치)

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 카드 뒷면 배경(상) | `--card-back-top` | `#232E40` | hidden 카드 배경 그라디언트 상단 |
| 카드 뒷면 배경(하) | `--card-back-bottom` | `#18212F` | hidden 카드 배경 그라디언트 하단 |
| 카드 뒷면 문양 | `--card-back-motif` | `rgba(91,130,240,0.22)` | 뒷면 중앙 통일 문양(◆) — 브랜드 accent 저채도 |
| 카드 앞면 배경 | `--card-face-bg` | `#F4F6FB` | revealed 카드 앞면(밝은 면 → 뒤집힘 대비 강조) |
| 카드 앞면 기호색 | `--card-face-symbol` | `#141B26` | 앞면 이모지/문자 대비 확보용 배경 대비 |
| 카드 확정 배경 | `--card-matched-bg` | `#12241C` | matched 카드 앞면(성공 톤으로 살짝 가라앉힘) |
| 카드 확정 테두리 | `--card-matched-border` | `#4ADE80` | matched 카드 2px 테두리(성공) |
| 카드 확정 글로우 | `--card-matched-glow` | `rgba(74,222,128,0.28)` | matched 카드 box-shadow 글로우 |
| 카드 불일치 테두리 | `--card-mismatch-border` | `#E55858` | mismatch 순간 카드 2px 테두리(경고) |
| 카드 불일치 글로우 | `--card-mismatch-glow` | `rgba(229,88,88,0.30)` | mismatch 순간 box-shadow |
| 카드 그림자 | `--card-shadow` | `0 4px 14px rgba(0,0,0,0.38)` | 카드 입체 그림자 |

### 2.3 쌍별 기호 accent (색맹 대응 — 색은 보조, 기호가 1차 구분자)

`pairId` 0~7 에 대응하는 8종 기호. **기호(이모지) 자체가 1차 구분자**이며, 앞면 하단의 얇은 accent 바(4px)는 보조 인코딩이다(색상 단독 구분 지양 — planner §12). dev 는 CSS `--pair-0`~`--pair-7` 변수로 정의하고 `data-pair="N"` 으로 매핑한다.

| pairId | 기호(이모지) | accent 토큰 | 값 | 대체 텍스트(aria) |
|---|---|---|---|---|
| 0 | 🍎 사과 | `--pair-0` | `#E5484D` | "사과" |
| 1 | 🍌 바나나 | `--pair-1` | `#F5C24B` | "바나나" |
| 2 | 🍇 포도 | `--pair-2` | `#A06CF0` | "포도" |
| 3 | 🍉 수박 | `--pair-3` | `#4ADE80` | "수박" |
| 4 | 🍓 딸기 | `--pair-4` | `#F06595` | "딸기" |
| 5 | 🍒 체리 | `--pair-5` | `#E5605E` | "체리" |
| 6 | 🍑 복숭아 | `--pair-6` | `#F59E6B` | "복숭아" |
| 7 | 🥝 키위 | `--pair-7` | `#63C88A` | "키위" |

> 색맹 안전 근거: 8쌍 구분은 이모지 기호(모양)로 완결되며 색은 중복 확인용 보조일 뿐이다. 흑백(grayscale)으로 렌더링해도 8종 기호가 서로 구별되므로 색각 이상·모노크롬 환경에서도 플레이 가능하다.

---

## 3. 타이포그래피

system font stack 만 사용(웹폰트 0건). `:root` 에 아래 토큰을 정의한다.

```
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 토큰 | 값(weight size/line-height family) | 적용 대상 |
|---|---|---|---|
| 화면 제목 | `--text-h1` | `600 20px/1.3 var(--font-sans)` | `<h1>메모리 매치` |
| HUD 값(이동/타이머) | `--text-hud-value` | `700 clamp(20px,6vw,28px)/1 var(--font-mono)` | `이동 횟수` 숫자 · `MM:SS` |
| HUD 라벨 | `--text-hud-label` | `600 12px/1.2 var(--font-sans)` | "이동 횟수" / "시간" 라벨 |
| 카드 기호 | `--text-card-symbol` | `400 clamp(28px,9vw,40px)/1 var(--font-sans)` | 앞면 이모지 |
| 완료 배너 제목 | `--text-banner-title` | `700 clamp(22px,7vw,30px)/1.2 var(--font-sans)` | "모두 맞췄어요!" |
| 완료 배너 기록 | `--text-banner-stat` | `700 clamp(18px,5vw,22px)/1.3 var(--font-mono)` | "이동 12회 · 00:48" |
| 본문/안내 | `--text-body` | `400 15px/1.5 var(--font-sans)` | 조작 안내 |
| 버튼 라벨 | `--text-button` | `600 14px/1 var(--font-sans)` | 재시작 / 다시하기 |
| 캡션 | `--text-caption` | `400 13px/1.4 var(--font-sans)` | 하단 캡션 · 보조 |

> 타이머·이동 횟수 숫자는 `--font-mono` 로 고정폭 표시 → 값이 바뀔 때 가로 흔들림(jitter) 방지. `MM:SS` 는 `font-variant-numeric: tabular-nums` 병행 권장.

---

## 4. 레이아웃

### 4.1 전체 구조 (세로 스택 · 중앙 정렬)

```
┌─────────────────────────────────┐  body: --color-bg-canvas, 중앙 정렬
│  ┌───────────────────────────┐  │
│  │  <h1> 메모리 매치           │  │  상단바 (헤더)
│  ├───────────────────────────┤  │
│  │ [이동 횟수 0회] [00:00] [↻] │  │  HUD 바 (--color-bg-surface)
│  ├───────────────────────────┤  │
│  │  ┌──┐┌──┐┌──┐┌──┐          │  │
│  │  │◆ ││◆ ││🍎││◆ │          │  │  4×4 카드 보드
│  │  └──┘└──┘└──┘└──┘          │  │  (CSS Grid, gap)
│  │  ┌──┐┌──┐┌──┐┌──┐          │  │
│  │  │🍎││◆ ││◆ ││◆ │          │  │
│  │  └──┘└──┘└──┘└──┘          │  │
│  │  ... (4행)                 │  │
│  ├───────────────────────────┤  │
│  │  카드를 두 장 뒤집어 짝을... │  │  조작 안내 (캡션)
│  └───────────────────────────┘  │
└─────────────────────────────────┘
  (won 시 보드 위에 완료 배너 오버레이)
```

### 4.2 컨테이너·간격 토큰

```
--space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
--space-5:24px; --space-6:32px; --space-7:48px;
--radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
--shadow-panel:0 8px 32px rgba(0,0,0,0.45);
--motion-fast:140ms; --motion-flip:260ms; --ease-out:cubic-bezier(.16,1,.3,1);
```

| 영역 | 규칙 |
|---|---|
| 페이지 래퍼 | `max-width: 480px`, 좌우 `padding: var(--space-4)`(16px), 수평 중앙 정렬. 480px 는 4×4 보드가 데스크톱에서도 과대해지지 않는 상한 |
| 헤더 | 상하 `padding: var(--space-4)`, `<h1>` 좌측 정렬 |
| HUD 바 | `display:flex; justify-content:space-between; align-items:center; gap:var(--space-3)`, `padding: var(--space-3) var(--space-4)`, `--radius-md`, 배경 `--color-bg-surface`, 테두리 `--color-border-default` |
| 보드 | `display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-2)`(8px), 상하 `margin: var(--space-4) 0` |
| 카드 | `aspect-ratio: 1/1`(정사각), 폭은 그리드 1fr 로 자동 4등분 |
| 조작 안내 | 보드 하단 캡션, `--color-text-secondary`, 중앙 정렬 |

### 4.3 반응형 — breakpoint 별 동작 (planner §7.2 검증 대응)

메모리 매치는 4×4 격자 비율이 폭에 종속되므로 **미디어 쿼리 분기보다 유동(fluid) 그리드** 를 1차 전략으로 한다. `1fr` × 4 + `gap` 이 컨테이너 폭을 자동 4등분한다.

| 뷰포트 폭 | 보드 폭 계산 | 카드 한 변(대략) | 동작 |
|---|---|---|---|
| **360px (하한 · 필수)** | `360 - 16*2(패딩) = 328px` 내부, `gap 8*3 = 24px` 차감 → 카드 = `(328-24)/4 ≈ 76px` | **≈ 76px** | 가로 스크롤 0, 카드 76px ≫ 최소 44px 터치 타깃 충족(§4.4) |
| 400~479px | 유동 확대 | ≈ 82~88px | 동일 4×4, 카드만 비례 확대 |
| ≥ 480px | 래퍼 `max-width:480px` 고정 | ≈ 106px | 보드 중앙 고정, 더 커지지 않음 |

- **가로 스크롤 방지**: `box-sizing:border-box` 전역 + 래퍼 `width:100%; max-width:480px` + 보드 `min-width:0`(그리드 자식 오버플로우 방지). `documentElement.scrollWidth <= 360` 을 만족한다(planner §7.2 검증).
- HUD 바는 360px 에서 `이동 횟수`·`시간`·`재시작` 3요소가 `flex` 로 한 줄 유지되며, 좁으면 라벨은 `--text-hud-label`(12px)로 축소되고 값만 강조된다. 극단적으로 좁을 때 재시작 버튼은 아이콘(↻)+짧은 라벨로 폭을 절약한다(§5.4).

### 4.4 터치 타깃 산정 (planner §7.2 "44×44px 이상")

- 360px 기준 카드 한 변 ≈ **76px** → WCAG 2.5.5 권장 44×44px 을 여유 있게 초과.
- 카드 간 `gap: 8px` → 인접 카드 오작동 탭 방지 최소 간격 확보.
- 재시작 버튼 최소 높이 `44px`, 좌우 `padding: 0 var(--space-4)` → 터치 타깃 충족.

---

## 5. 컴포넌트 명세

각 컴포넌트의 상태·인터랙션·권장 마크업/클래스를 정의한다. dev 는 이 클래스명/`data-*` 컨벤션을 권장 기본값으로 사용한다(planner §5.2 마크업 계약과 정합).

### 5.1 카드 (`.card` — 네이티브 `<button>`)

**마크업 (planner §7.1 — 네이티브 button 필수, div+role 금지):**

```html
<button class="card" data-state="hidden" data-pair="3"
        aria-label="카드 4, 뒤집기 전">
  <span class="card__back" aria-hidden="true">◆</span>
  <span class="card__face" aria-hidden="true">🍉</span>
</button>
```

**상태별 스타일 (`data-state`):**

| data-state | 앞/뒷면 | 배경 | 테두리 | 글로우/효과 | 상호작용 |
|---|---|---|---|---|---|
| `hidden` | 뒷면(`◆` 문양 노출, face 숨김) | `--card-back-*` 그라디언트 | `--color-border-default` | `--card-shadow` | 클릭/키 가능, hover 시 살짝 상승(`translateY(-2px)`) |
| `revealed` | 앞면(기호 노출, back 숨김) | `--card-face-bg`(밝은 면) | `--color-accent` 2px | accent 은은한 글로우 | 재클릭 no-op(planner EC-01), 판정 대기 |
| `matched` | 앞면 고정 | `--card-matched-bg` | `--card-matched-border` 2px | `--card-matched-glow` box-shadow, 약한 상시 pulse 없음(정적) | 상호작용 없음, `aria-disabled="true"` (disabled 속성 미사용 — 포커스 유지, planner §7.1) |
| `mismatch` | 앞면(순간) | `--card-face-bg` | `--card-mismatch-border` 2px | `--card-mismatch-glow` + `shake` 애니메이션(~400ms) | 입력 잠금 중, 직후 `hidden` 복귀 |

**뒤집기 전환:** hidden↔revealed 는 Y축 회전(`transform: rotateY`) 260ms(`--motion-flip`) 로 표현하거나, 저사양/`prefers-reduced-motion` 시 즉시 크로스페이드로 대체(§5.5). **3D flip 은 필수 아님**(planner §11 — 기본 상태 스타일 차이만 필수). mockup 은 `:hover`/정적 상태로 표현.

**aria-label 규칙 (planner §7.3):**
- `hidden`: `"카드 {N}, 뒤집기 전"` (N = 보드 좌상→우하 1~16 위치)
- `revealed`/`matched`: `"카드 {N}, {기호 대체 텍스트}"` (예: `"카드 4, 수박"`) — 대체 텍스트는 §2.3 표.

### 5.2 HUD 바 (이동 횟수 · 타이머 · 재시작)

```html
<div class="hud" role="group" aria-label="게임 진행 정보">
  <div class="hud__stat">
    <span class="hud__label">이동 횟수</span>
    <output class="hud__value" id="move-count" aria-live="polite">0회</output>
  </div>
  <div class="hud__stat">
    <span class="hud__label">시간</span>
    <output class="hud__value" id="timer">00:00</output>
  </div>
  <button class="btn btn--secondary" id="restart-btn" type="button">
    <span aria-hidden="true">↻</span> 재시작
  </button>
</div>
```

| 요소 | 스타일 | 접근성 |
|---|---|---|
| `이동 횟수` 값 | `--text-hud-value`, `--color-text-primary`, `"N회"` 포맷 | `aria-live="polite"` — 값 변경(매치 시도) 시 안내 |
| 타이머 값 | `--text-hud-value`, `MM:SS`, tabular-nums | **`aria-live` 미부여**(매초 갱신 안내는 방해 — planner §7.3, §14-2). 완료 시점에만 별도 라이브 리전으로 안내 |
| 라벨 | `--text-hud-label`, `--color-text-secondary`, 값 위 소형 표기 | 값과 시각적 그룹 |
| 재시작 버튼 | secondary 스타일(§5.4), 항상 활성 | 네이티브 `<button>`, `Tab` 도달, 항상 `disabled` 없음(planner §2.5) |

### 5.3 완료 배너 (`won` 오버레이)

```html
<div class="win-banner" id="win-banner" role="dialog"
     aria-modal="false" aria-labelledby="win-title" hidden>
  <h2 class="win-banner__title" id="win-title">모두 맞췄어요! 🎉</h2>
  <p class="win-banner__stat">이동 <strong id="win-moves">12</strong>회
     · <strong id="win-time">00:48</strong></p>
  <button class="btn btn--primary" id="win-restart-btn" type="button">다시하기</button>
</div>
<div class="sr-live" aria-live="polite" id="announce"></div>
```

| 항목 | 스타일 |
|---|---|
| 컨테이너 | 보드 영역 위 중앙 오버레이 카드, `--color-bg-surface`, `--radius-lg`, `--shadow-panel`, 진입 시 페이드+살짝 상승(`--motion-fast`) |
| 스크림 | 보드 위 `--color-bg-canvas` 72% 반투명 딤(선택) — 카드 결과가 은은히 비침 |
| 제목 | `--text-banner-title`, `--color-text-primary` |
| 기록 | `--text-banner-stat`, 이동/시간 강조는 `--color-accent` |
| 다시하기 버튼 | primary(§5.4), `won` 전환 시 이 버튼에 포커스 이동(planner §7.1 AC-05) |
| 라이브 안내 | `#announce` 라이브 리전에 `"모두 맞췄습니다! 이동 12회, 48초"` 문장 주입 |

### 5.4 버튼 (`.btn`)

| variant | 배경 | 라벨색 | 테두리 | hover | 용도 |
|---|---|---|---|---|---|
| `btn--primary` | `--color-accent` | `--color-accent-on` | 없음 | `--color-accent-hover` | 완료 배너 "다시하기" |
| `btn--secondary` | `--color-bg-subtle` | `--color-text-primary` | `--color-border-default` | 테두리 `--color-border-strong` | HUD "재시작" |

- 공통: `min-height:44px`, `padding:0 var(--space-4)`, `--radius-md`, `--text-button`, `cursor:pointer`, 전환 `--motion-fast`.
- 360px 축소 시 secondary "재시작" 은 아이콘(↻)+라벨 유지가 기본, 폭 부족하면 라벨 숨김 없이 `padding` 만 `var(--space-3)` 로 축소.

### 5.5 포커스·모션·상태 인터랙션 (접근성 필수)

| 항목 | 규칙 |
|---|---|
| 포커스 링 | 모든 인터랙티브 요소 `:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }` — `outline:none` 단독 사용 금지(planner §7.1) |
| 카드 hover | `hidden` 카드만 `translateY(-2px)` + 그림자 강화, `matched`/`revealed` 는 hover 무반응 |
| checking 잠금 | `checking` 중 보드에 `.board--locked`(예: `pointer-events` 는 유지하되 JS 핸들러가 no-op) — 카드에 `disabled` 부여 금지(포커스 유지, planner §7.1) |
| 감소된 모션 | `@media (prefers-reduced-motion: reduce)` — flip 회전·shake·pulse 제거, 상태 전환은 즉시(색/테두리만 변경) |
| 색맹 대응 | 상태는 색 + 기호 + 테두리 두께 + (matched)글로우로 다중 인코딩, mismatch 는 색 + shake 모션으로 이중 표현 |

---

## 6. dev 구현 가이드

dev-1 이 `phase18-games/memory-match/{index.html,styles.css}` 를 구현할 때 따라야 할 단계별 지침. **로직(logic.js)·상태 전이는 planner §5~§6 이 SSOT**, 본 절은 시각/마크업 매핑만 다룬다.

### 6.1 `:root` 토큰 정의 (styles.css 최상단에 그대로 복제)

§2(컬러)·§3(타이포)·§4.2(간격/모션) 의 모든 CSS 변수를 `:root` 에 정의한다. 하드코딩 색상 리터럴 금지 — 모든 색은 `var(--token)` 참조(카드 상태·버튼·HUD 포함). 쌍별 accent 는 `--pair-0`~`--pair-7`, 매핑은 `.card[data-pair="0"] .pair-bar { background: var(--pair-0); }` 형태.

### 6.2 마크업 골격 (index.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>메모리 매치 · /phase18-games/memory-match</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="wrap">
    <header class="header"><h1>메모리 매치</h1></header>
    <div class="hud" role="group" aria-label="게임 진행 정보"> ... §5.2 ... </div>
    <div class="board" id="board" role="grid" aria-label="4x4 카드 보드">
      <!-- 카드 16개: 네이티브 <button class="card">, JS 로 셔플 후 생성 -->
    </div>
    <p class="hint">카드를 두 장 뒤집어 같은 그림의 짝을 맞추세요. 8쌍을 모두 맞추면 완료!</p>
    <div class="win-banner" id="win-banner" ... hidden> ... §5.3 ... </div>
    <div class="sr-live" aria-live="polite" id="announce"></div>
  </main>
  <noscript>이 게임은 JavaScript 가 필요합니다. 브라우저에서 JavaScript 를 활성화해 주세요.</noscript>
  <script src="logic.js"></script>
  <script src="main.js"></script>
</body>
</html>
```

### 6.3 상태 → 클래스/속성 매핑 (JS 렌더 시 갱신)

| 상태 변화 | DOM 갱신 |
|---|---|
| 카드 hidden→revealed | `card.dataset.state='revealed'`; `aria-label` = `"카드 N, {기호}"` |
| 판정 일치 | 두 카드 `dataset.state='matched'`, `aria-disabled='true'`; `#announce` = "짝을 맞췄습니다" |
| 판정 불일치 | 두 카드 `dataset.state='mismatch'` → (planner 권장 700~900ms 후) `dataset.state='hidden'`, `aria-label` 원복 |
| moves 증가 | `#move-count` 텍스트 = `"{n}회"` |
| 타이머 tick | `#timer` 텍스트 = `MM:SS` (aria-live 없음) |
| won | `#win-banner` `hidden` 제거, 값 주입, `#win-restart-btn.focus()`, `#announce` 완료 문장 |
| 재시작 | 보드 재생성(재셔플), HUD 리셋, `#win-banner` `hidden` 부여, 대기 flip-back 타이머 취소(planner EC-05) |

### 6.4 불일치 지연 값

planner 권장 **700~900ms** 중 **800ms** 를 기본으로 제안(체감상 "기억할 시간"과 "답답하지 않음"의 균형). `--flip-back-delay: 800ms` 로 상수화하되 정확 값은 dev 재량(planner §2.2·§12).

### 6.5 반응형 검증 체크리스트 (planner §7.2)

- [ ] 360px 뷰포트에서 `document.documentElement.scrollWidth <= 360` (가로 스크롤 0)
- [ ] 각 카드 실측 ≥ 44×44px (360px 기준 ≈ 76px)
- [ ] HUD 3요소가 360px 에서 한 줄 유지, 잘림/겹침 없음
- [ ] 카드 16장 전부 네이티브 `<button>` (`grep -c '<button[^>]*class="card"'` → 16, 단 JS 생성 시 런타임 DOM 기준)
- [ ] `:focus-visible` 포커스 링이 카드·버튼에서 보임, `outline:none` 단독 없음

### 6.6 기존 요소 보존

`memory-match` 는 완전 신규 모듈(planner §0 가정 7)로 **기존 코드 변경 0건**. 기존 `phase18-games/pong/` 및 다른 게임 module 의 파일은 건드리지 않는다. 표준 토큰 네이밍만 계열에서 승계(값 복제, 참조·import 아님 — vanilla-static 독립).

---

## 7. mockup 참조

- **파일:** `docs/design/mockups/memory-match-BF-916.html`
- **성격:** 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, 유니코드 이모지). 본 명세 §2~§5 의 토큰/레이아웃/카드 상태를 시각화한 **정적 시안**.
- **표현 내용:**
  1. 헤더 + HUD(이동 횟수·타이머·재시작) 실제 배치
  2. 4×4 보드에 **4가지 카드 상태 동시 노출** — `hidden`(뒷면 문양), `revealed`(앞면 기호 + accent 테두리), `matched`(성공 글로우 고정), `mismatch`(경고 테두리)
  3. `won` 완료 배너 시안(별도 `<section>` 으로 상태 비교 노출)
  4. 상태 레전드(카드 상태별 스타일 설명) 섹션
  5. 360px 프레임 미리보기 섹션 — 반응형 축소 표현
- dev 는 픽셀 일치 의무 없음. 색/타이포/상태 스타일의 **시각 기준**으로 참조.

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-918 수용 기준 ↔ 본 산출물 매핑

| BF-918 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세를 작성하면, Then `docs/design/memory-match-BF-916.md` 와 mockup HTML 에 4×4 카드 상태별 스타일과 디자인 토큰 매핑이 정의된다 | 본 문서 §2(토큰)·§5.1(카드 4상태 스타일 표)·§2.3(pairId↔기호/색 매핑) + mockup §7(상태 동시 노출) |
| Given 360px 뷰포트, When mockup 을 확인하면, Then 키보드·포인터 조작 가능한 반응형 레이아웃이 표현된다 | §4.3(360px 유동 그리드)·§4.4(44×44 터치 타깃)·§5.1·§5.5(네이티브 button·포커스 링) + mockup 360px 프레임 섹션 |

### 8.2 planner AC(§9) ↔ 시각 매핑 커버리지

| planner AC | designer 커버 |
|---|---|
| AC-01 초기 보드(16장 hidden·0회·00:00) | §1.3 idle · §5.1 hidden · §5.2 HUD |
| AC-02 첫 클릭 타이머 시작 | §5.2 타이머(값 표현) · §1.3 playing |
| AC-03 2번째 클릭 판정·이동+1 | §5.1 revealed/matched/mismatch · §5.2 이동 횟수 |
| AC-04 checking 입력 잠금 | §5.5 checking 잠금(disabled 미사용) |
| AC-05 완료·재시작 포커스 | §5.3 완료 배너 + 포커스 이동 |
| AC-06 재시작 언제든 | §5.2 재시작 항상 활성 · §6.3 재시작 매핑 |
| AC-07 키보드 전조작 | §5.1 네이티브 button · §5.5 포커스 링 |
| AC-08 360px 무스크롤 | §4.3·§4.4 |
| AC-09 데이터 의존성 0 | vanilla-static · §6.6 신규 독립 |

### 8.3 Self-critique (PR 직전 자가 점검 — 체크 5)

1. **AC 매핑** — BF-918 AC 2개 모두 §8.1 로 근거 연결 완료. 4×4 카드 상태별 스타일(§5.1)·토큰 매핑(§2)·360px 반응형(§4.3) 모두 명세+mockup 양쪽에 존재. ✅
2. **dev 구현 가이드** — §6 에 `:root` 토큰 복제·마크업 골격·상태→DOM 매핑·불일치 지연값·반응형 체크리스트를 단계로 제시. dev 가 로직(planner SSOT) 위에 시각만 얹으면 되도록 경계 명확. ✅
3. **기존 요소 보존** — 완전 신규 모듈(§6.6), 기존 파일 변경 0건 명시. 표준 토큰은 값 복제(참조 아님, vanilla-static 독립). ✅
4. **컴포넌트 매핑** — 카드/HUD/완료 배너/버튼 4개 컴포넌트 각각 마크업·상태·클래스·`data-*`·aria 정의. planner 마크업 계약(§5.2·§7)과 정합. ✅
5. **모호함 flag** — §8.4 에 명시. 특히 (a) 다크 단일 테마 결정, (b) 불일치 지연 800ms 기본값, (c) 3D flip 선택 사항, (d) 뒷면 문양 `◆` 채택을 flag. dev 가 임의 해석하지 않도록 근거·재량 범위 표기. ✅

### 8.4 남은 모호함 (운영자/dev 확인 권장)

1. **테마** — 다크 단일로 확정(§0). 라이트/토글 요구가 있으면 별도 스토리 필요(planner §11 비범위 정합).
2. **불일치 지연** — 800ms 기본 제안(§6.4), planner 권장 700~900ms 범위 내 dev 조정 재량.
3. **카드 뒤집기 애니메이션** — 3D flip 은 선택 사항(planner §11). 기본은 상태 스타일 차이 + 크로스페이드로 충분, `prefers-reduced-motion` 시 즉시 전환.
4. **카드 뒷면 문양** — 통일 문양으로 `◆`(브랜드 accent 저채도) 채택. 로고/패턴 교체는 dev 재량이나 16장 전부 동일 유지(뒷면으로 짝을 유추 불가해야 함).
5. **기호 세트** — 과일 이모지 8종(§2.3). 시스템/폰트별 이모지 렌더 차이가 있으나 8종 구별성은 유지됨. 특정 플랫폼 우려 시 문자/도형 대체 가능(색맹 안전 원칙만 유지).

---

*문서 종료 — [이디자인] · BF-918 (memory-match 공유 키 BF-916)*
