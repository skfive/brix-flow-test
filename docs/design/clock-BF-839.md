# 브라우저 시계 카드 디자인 명세 — BF-839

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-841 (본 designer task) · BF-839 (부모 스토리) · BF-840 (planner 명세)
> 대상 모듈: `clock/` (vanilla-static — planner 문서 §0 가정 1 준수)
> 계약(contract) 상위 문서: `docs/planning/clock-BF-839.md` (표시 규칙·상태 전이·12/24 규칙의 SSOT)
> mockup 참조: `docs/design/mockups/clock-BF-839.html` (§7)

---

## 0. 문서 성격 및 전제 (필독)

**가정 1 — 스택 재확인:** Epic 메타 태그는 `<!-- bf:tech-stack:nextjs -->` 이나, planner 문서(`docs/planning/clock-BF-839.md` §0 가정 1)에서 확인된 대로 본 저장소는 Next.js 프로젝트가 아니며 `timer/`·`stopwatch/`·`pomodoro/` 등 기존 모든 신규 모듈이 **vanilla-static**(바닐라 HTML/CSS/JS + `file://` 직접 실행) 패턴이다. 본 디자인 명세도 동일하게 **기존 vanilla-static 토큰 시스템**을 따른다. 신규 컬러·폰트·외부 에셋·디자인 토큰을 추가하지 않는다(Simplicity First).

**가정 2 — "기존 디자인 토큰"의 출처:** brix-Flow 는 중앙 집중식 `design-tokens.json` 대신 각 모듈이 **동일한 토큰 세트를 `:root` CSS 변수로 복제**하는 컨벤션을 쓴다(`timer/styles.css`·`stopwatch/styles.css` §2 주석 참고 — "이전 모듈의 시스템을 그대로 복제"). 본 명세의 §2~§3 토큰은 이 공유 세트를 **신규 정의 없이 그대로 재사용**한다. dev 는 `clock/styles.css` 에서 timer/stopwatch 와 동일한 `:root` 블록을 복제하면 된다.

**가정 3 — 파일 소유권:** 본 task 산출물은 아래 2개뿐이다.
- 명세: `docs/design/clock-BF-839.md` (본 문서)
- mockup: `docs/design/mockups/clock-BF-839.html`

> ⚠️ **mockup 경로 관련 명시:** 본 task 의 File Ownership 안내에는 mockup 경로가 `docs/design/clock-mockup-BF-839.html`(flat) 로 기재되어 있으나, 저장소의 기존 68개 mockup 이 **전부** `docs/design/mockups/` 하위에 있고, 시스템의 자동 screenshot capture(`captureDesignerMockups`)가 **오직 `docs/design/mockups/` 경로만 검사**한다. flat 경로에 두면 PR 스크린샷 임베드가 누락되므로, 컨벤션·capture 호환을 위해 mockup 을 `docs/design/mockups/clock-BF-839.html` 로 생성했다. (§12-1 에 재기록)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트-기존-토큰-재사용)
3. [타이포그래피](#3-타이포그래피-기존-토큰-재사용)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [접근성 — 키보드 포커스·라벨 규칙](#6-접근성--키보드-포커스라벨-규칙)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [Acceptance Criteria 매핑](#9-acceptance-criteria-매핑)
10. [비범위](#10-비범위)
11. [Self-critique](#11-self-critique)
12. [남은 모호함](#12-남은-모호함)

---

## 1. 시안 개요

### 1.1 변경 범위

화면 중앙에 **단일 시계 카드 1개**를 배치하는 최소 SPA. 카드는 위에서부터 (1) 날짜, (2) 큰 시각(HH:MM:SS), (3) 상태 라벨, (4) 컨트롤 2개(정지/재개 · 12/24 형식 전환), (5) 키보드 힌트 순으로 세로 정렬된다. 기존 `stopwatch/`·`timer/` 의 "topbar + 중앙 카드" 셸을 그대로 재사용한다.

### 1.2 사용자 경험 목표

- **한눈에 시각 확인**: 시각이 카드의 시각적 주인공(hero). 128px monospace 대형 숫자로 표시하고 나머지 요소는 보조.
- **군더더기 없는 조작**: 버튼 2개(정지/재개, 형식 전환)만 노출. 정지/재개는 하나의 primary 버튼이 상태에 따라 라벨·의미를 토글한다.
- **기존 앱과 시각적 일관성**: 신규 색/폰트/에셋 0건. timer/stopwatch 사용자가 학습 없이 바로 이해.
- **잘림 없는 반응형**: 모바일(≤639px)에서 대형 시각을 축소하고 버튼을 세로 전개하여 가로 스크롤·잘림 없이 배치.
- **접근 가능**: 두 컨트롤 모두 키보드 포커스 이동·활성화·현재 상태 전달(§6).

### 1.3 신규 추가 금지 항목 (task 제약 재확인)

| 금지 | 본 명세의 대응 |
|---|---|
| 신규 컬러 | §2 는 timer/stopwatch 의 기존 토큰만 사용. running/stopped 표현도 기존 `--color-accent` / `--color-text-muted` 재사용 |
| 신규 폰트 | `--font-sans` / `--font-mono`(시스템 폰트 스택)만 사용 |
| 외부 에셋 | 아이콘은 유니코드 글리프(⏸ ▶)만. 이미지·CDN·아이콘 폰트 0건 |
| 복잡한 애니메이션 | 상태 전환 시 `--motion-fast`(120ms) 색/배경 트랜지션만. 깜빡임·회전 등 없음 |

---

## 2. 컬러 팔레트 (기존 토큰 재사용)

신규 색을 정의하지 않는다. 아래는 **재사용하는** 기존 토큰과 본 시계 카드에서의 용도 매핑이다. HEX 는 참고용이며, dev 는 반드시 CSS 변수로 참조한다(하드코딩 금지).

### 2.1 라이트 테마 (기본, `data-theme="light"`)

| 역할 | 토큰(변수) | HEX | 시계 카드 용도 |
|---|---|---|---|
| primary(accent) | `--color-accent` | `#3563e9` | 정지/재개 primary 버튼 배경, 동작 중 상태 점 |
| accent hover | `--color-accent-hover` | `#2a4fc0` | primary 버튼 hover |
| background(canvas) | `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| surface | `--color-bg-surface` | `#ffffff` | 카드 배경, 형식 전환 secondary 버튼 배경 |
| subtle | `--color-bg-subtle` | `#f1f1ef` | 버튼 hover 배경, `kbd` 배경 |
| border | `--color-border-default` / `--color-border-strong` | `#e5e5e2` / `#d0d0cc` | 카드/버튼 테두리 |
| text primary | `--color-text-primary` | `#1a1a19` | 대형 시각 숫자 |
| text secondary | `--color-text-secondary` | `#6b6b66` | 날짜, 오전/오후 접두, 상태 라벨 텍스트 |
| text muted | `--color-text-muted` | `#9a9a93` | 콜론(`:`), 정지됨 상태 점, 키보드 힌트 |
| focus ring | `--color-focus-ring` | `rgba(53,99,233,.45)` | 버튼 `:focus-visible` outline |

### 2.2 다크 테마 (`data-theme="dark"`)

기존 timer/stopwatch 의 다크 오버라이드를 그대로 상속한다(별도 신규 없음). 핵심 값만:

| 역할 | 토큰 | HEX(dark) |
|---|---|---|
| accent | `--color-accent` | `#5b82f0` |
| canvas | `--color-bg-canvas` | `#0f1115` |
| surface | `--color-bg-surface` | `#171a21` |
| text primary | `--color-text-primary` | `#e8e8e4` |
| text secondary | `--color-text-secondary` | `#9a9a93` |
| text muted | `--color-text-muted` | `#6b6b66` |

> 상태 표현 결정: planner 는 running/stopped 를 정의하지만 색상은 미지정. task 의 "신규 컬러 금지"에 따라 timer 의 `--color-timer-running`(녹색) 같은 **모듈 전용 색을 새로 도입하지 않고**, running=`--color-accent`, stopped=`--color-text-muted` 로 기존 토큰만으로 구분한다. 색만으로 구분하지 않도록 텍스트 라벨("동작 중"/"정지됨")을 항상 병기한다(§6.5, 색각 접근성).

---

## 3. 타이포그래피 (기존 토큰 재사용)

| 요소 | 토큰 | 값(= 기존 정의) | 비고 |
|---|---|---|---|
| topbar 타이틀 | `--text-h1` | `600 20px/1.3 sans` | "시계" |
| 대형 시각(데스크톱) | `--text-display` | `300 128px/1 mono` | `font-variant-numeric: tabular-nums` 필수 |
| 대형 시각(태블릿 ≤959px) | `--text-display-md` | `300 96px/1 mono` | |
| 대형 시각(모바일 ≤639px) | `--text-display-sm` | `300 72px/1 mono` | 잘림 방지 축소 |
| 날짜 | `--text-label` | `500 14px/1.4 sans` | `YYYY-MM-DD (요일)` |
| 오전/오후 접두 | `--text-label` | `500 14px/1.4 sans` | 12시간 형식일 때만 시각 앞 노출 |
| 상태 라벨 | `--text-caption` | `400 12px/1.4 sans` | "동작 중"/"정지됨" |
| 버튼(대형) | `--text-button-lg` | `600 16px/1 sans` | primary-lg |
| 버튼(중형) | `--text-button-md` | `500 15px/1 sans` | secondary-lg (stopwatch 정의 재사용) |
| 키보드 힌트 | `--text-caption` | `400 12px/1.4 sans` | |

> ⚠️ dev 참고: `--text-display-md`·`--text-button-md` 는 timer 또는 stopwatch 중 한쪽에만 정의된 경우가 있다. `clock/styles.css` 에 `:root` 토큰 복제 시 **두 파일의 합집합**을 가져와 위 토큰이 모두 존재하도록 한다(§7.1).

---

## 4. 레이아웃

### 4.1 셸 구조

```
<body>                         ← flex column, bg-canvas
 ├─ <header class="topbar">    ← 56px 고정 높이, 좌: "시계" 타이틀 / 우: 테마 전환 버튼
 └─ <main class="page">        ← flex column, center 정렬, 세로 중앙寄り
     └─ <section class="card"> ← 단일 시계 카드 (아래 4.2)
```

기존 `stopwatch/` 의 `.topbar` + `.page` + `.card` 규칙을 그대로 사용한다. 단, 시계 카드는 콘텐츠가 적으므로 `.card` 의 `max-width` 를 **480px** 로 좁힌다(stopwatch 는 720px). 이는 신규 클래스가 아니라 clock 전용 오버라이드 1줄(§7.2).

### 4.2 카드 내부 세로 구조 (위 → 아래)

| # | 영역 | 클래스(권장) | 내용 | 정렬 |
|---|---|---|---|---|
| 1 | 날짜 | `.clock-date` | `2026-07-16 (목)` | 중앙, text-secondary |
| 2 | 대형 시각 | `.clock-display` | `[오후] 08:03:07` | 중앙, baseline flex |
| 3 | 상태 | `.clock-status` | `● 동작 중` / `● 정지됨` | 중앙 |
| 4 | 컨트롤 | `.controls` | [정지/재개] [24시간/12시간] | 중앙, 가로 나열 |
| 5 | 힌트 | `.kbd-hint` | `Space 정지/재개 · H 형식 전환` | 중앙 |

카드는 `display:flex; flex-direction:column; align-items:center; gap: var(--space-6)`(기존 `.card` 규칙 그대로).

### 4.3 spacing

- 페이지 패딩: `.page { padding: var(--space-7) var(--space-5) }` (기존)
- 카드 패딩: `.card { padding: var(--space-7) var(--space-6) }` (기존)
- 카드 내 세로 간격: `gap: var(--space-6)`(32px) — 날짜↔시각↔상태↔컨트롤↔힌트
- 컨트롤 버튼 사이: `.controls { gap: var(--space-3) }`(12px, 기존)

### 4.4 대형 시각 내부(baseline 정렬)

```
[오전/오후]  HH : MM : SS
  ↑ text-secondary, text-label   ↑ text-primary, text-display, tabular-nums
                          ↑ 콜론은 text-muted
```
- `display:flex; align-items:baseline; gap: var(--space-2)` (기존 `.display` 재사용)
- 12/24 형식과 무관하게 숫자 폭이 흔들리지 않도록 `font-variant-numeric: tabular-nums` 필수.
- 오전/오후 접두는 24시간 형식에서 **DOM 제거 또는 `hidden`** 처리(공간 차지 없음).

### 4.5 breakpoint 별 동작 (잘림 방지 — AC-2 핵심)

| 뷰포트 | 조건 | 시각 폰트 | 카드 | 컨트롤 |
|---|---|---|---|---|
| 데스크톱 | 기본 | `--text-display` 128px | max-width 480px, 중앙 | 가로 2버튼 (`flex-wrap`) |
| 태블릿 | `≤959px` | `--text-display-md` 96px | max-width 480px 유지 | 가로 2버튼 |
| 모바일 | `≤639px` | `--text-display-sm` 72px | `max-width:100%`, 패딩 `--space-5 --space-4` | **세로 스택**: `.controls`→`flex-direction:column`, 각 버튼 `width:100%` |
| 소형 | `≤359px` | `--text-display-sm` 72px 유지(더 줄이면 가독성↓, tabular-nums 로 8자 `88:88:88` 기준 폭 계산 시 카드 패딩 내 수용) | 패딩 `--space-4` | 세로 스택 유지 |

> **잘림 검증 근거:** 최장 표시 문자열은 12시간 형식 `오후 08:03:07`. 모바일 72px mono 에서 숫자 8자(`08:03:07`)의 폭 ≈ 8 × ~43px = ~344px < 360px 뷰포트 − (카드+페이지 패딩). 접두 "오후 "는 14px 로 baseline 별도 줄바꿈 없이 앞에 붙되, 폭 초과 시 `.clock-display { flex-wrap: wrap; justify-content:center }` 로 접두가 윗줄로 안전하게 흐른다(잘림 대신 wrap). mockup 의 모바일 프레임(360px)에서 이 동작을 시각 확인할 것.

### 4.6 모션

- 상태(running↔stopped) 전환 시 상태 점 색만 `transition: color var(--motion-fast) var(--ease-out)`.
- 버튼 hover/active 는 기존 `.btn` 규칙(배경 색 트랜지션)만. **신규 keyframe 애니메이션 0건**(task 제약).
- `@media (prefers-reduced-motion: reduce)` 에서 위 트랜지션 제거(기존 모듈 패턴 준수).

---

## 5. 컴포넌트 명세

### 5.1 정지/재개 버튼 (`ClockToggleButton` — 단일 primary 토글)

| 항목 | 값 |
|---|---|
| 기반 클래스 | `.btn .btn--primary-lg` (기존 공용 버튼, 신규 X) |
| id(권장) | `btn-toggle` |
| props/상태 | `state ∈ {running, stopped}` (planner §4.1 상태와 1:1) |
| running 일 때 | 라벨 `⏸ 정지`, `aria-pressed="false"`, `aria-label="시계 정지"` |
| stopped 일 때 | 라벨 `▶ 재개`, `aria-pressed="true"`, `aria-label="시계 재개"` |
| 인터랙션 | click / `Enter` / `Space`(버튼 포커스 시 네이티브) → 상태 토글. 추가로 전역 `Space` 단축키(planner §4.2)로도 토글 |
| 시각 상태 | hover: `--color-accent-hover`, `:active` 미세 축소(기존 primary-lg active 규칙), `:focus-visible`: 2px focus-ring |
| disabled | 사용 안 함 — 시계는 항상 토글 가능 |

> 아이콘 글리프(⏸/▶)는 `aria-hidden` 이 아니라 텍스트 라벨과 함께 읽혀도 무방하나, 스크린리더 명확성을 위해 **버튼의 접근 이름은 `aria-label` 이 우선**(글리프는 장식). §6.2 참조.

### 5.2 12/24 형식 전환 버튼 (`HourFormatToggleButton`)

| 항목 | 값 |
|---|---|
| 기반 클래스 | `.btn .btn--secondary-lg` (기존 공용 버튼) |
| id(권장) | `btn-format` |
| props/상태 | `format ∈ {"24","12"}` (planner §5, 기본 `"24"`, `localStorage["clock:hourFormat"]` 복원) |
| format="24" 일 때 | 라벨 `24시간` (현재 24시간 표시 중임을 나타냄), `aria-pressed="false"`, `aria-label="12시간 형식으로 전환"` |
| format="12" 일 때 | 라벨 `12시간`, `aria-pressed="true"`, `aria-label="24시간 형식으로 전환"` |
| 인터랙션 | click / `Enter` / `Space` → 형식 토글. 전역 `H` 단축키(planner §5.1)로도 토글. 상태(running/stopped) 무관 즉시 재포맷(planner §4.2 단서) |
| 시각 상태 | secondary 버튼 스타일(surface 배경 + border-strong). hover: `--color-bg-subtle`. `:focus-visible` ring |

> 라벨 표기 규칙(명확화): 버튼 라벨은 **"현재 형식"**을 표시하고(`24시간`=지금 24시간), `aria-label` 은 **"누르면 될 동작"**을 표시(`12시간 형식으로 전환`)한다. 시각 라벨과 접근 이름의 의미가 어긋나 보일 수 있으므로 §6.3 에서 근거를 명시하고, dev 는 이 규칙을 그대로 구현한다.

### 5.3 대형 시각 표시 (`ClockDisplay` — 표시 전용, 버튼 아님)

| 항목 | 값 |
|---|---|
| 클래스(권장) | `.clock-display` (내부 `.clock-display__prefix` / `__time` / `__colon`) |
| role | `role="timer"` (planner §4.2 상태 라벨과 함께) |
| aria-live | **`off`** — 1초마다 갱신되므로 live 로 두면 스크린리더가 매초 읽어 소음. 갱신 자체는 읽지 않음 |
| aria-label | `"현재 시각"` (정적) — 값 자체는 상태 변화(정지/재개/형식 전환) 시에만 별도 `role="status"` 영역(polite)으로 1회 안내 |
| 상태 반영 | `stopped` 시 시각 텍스트는 `--color-text-primary` 유지(회색 처리 안 함 — 값이 유효한 마지막 시각이므로), 대신 §5.4 상태 배지로 구분 |

### 5.4 상태 배지 (`ClockStatus`)

| 항목 | 값 |
|---|---|
| 클래스(권장) | `.clock-status` (내부 `.clock-status__dot` + 텍스트) |
| running | `● 동작 중`, 점 색 `--color-accent`, 텍스트 `--color-text-secondary` |
| stopped | `● 정지됨`, 점 색 `--color-text-muted`, 텍스트 `--color-text-secondary` |
| 접근성 | 점(`__dot`)은 `aria-hidden="true"`(장식), 상태 텍스트는 실제 텍스트로 읽힘. 상태 변화 시 §5.3 status 영역에서 "동작 중"/"정지됨" polite 안내 |

### 5.5 날짜 표시 (`ClockDate`)

| 항목 | 값 |
|---|---|
| 클래스(권장) | `.clock-date` |
| 내용 | planner §3.1 형식 `YYYY-MM-DD (요일)` — 예 `2026-07-16 (목)` |
| 스타일 | `--text-label`, `--color-text-secondary`, 중앙 정렬 |
| aria | 별도 role 없음(정적 텍스트). 자정 넘어 날짜 갱신 시 planner §3.3 단일 Date 원천 준수(디자인 영향 없음) |

### 5.6 컨트롤 컨테이너 (`.controls`)

기존 `.controls`(flex, wrap, center, gap `--space-3`) 재사용. 버튼 2개. 모바일에서 §4.5 대로 세로 스택.

---

## 6. 접근성 — 키보드 포커스·라벨 규칙 (AC-3 핵심)

### 6.1 포커스 순서(Tab order)

DOM 순서 = 논리적 Tab 순서. 별도 `tabindex` 로 재배치하지 않는다(양수 tabindex 금지).

```
1. 테마 전환 버튼 (topbar, #btn-theme)
2. 정지/재개 버튼   (#btn-toggle)
3. 12/24 형식 버튼  (#btn-format)
```

- 세 요소 모두 네이티브 `<button type="button">` → 기본적으로 포커스 가능·`Enter`/`Space` 활성화.
- `Shift+Tab` 역방향 이동 정상 지원(네이티브).
- 대형 시각(`.clock-display`)·날짜·상태 배지는 **포커스 불가**(정적 표시, `tabindex` 부여 안 함).

### 6.2 정지/재개 버튼 라벨 규칙

| 상태 | 시각 라벨 | `aria-label` | `aria-pressed` |
|---|---|---|---|
| running | `⏸ 정지` | `시계 정지` | `false` |
| stopped | `▶ 재개` | `시계 재개` | `true` |

- `aria-label` 이 글리프(⏸/▶)보다 우선하여 스크린리더가 명확한 한국어 동작을 읽는다.
- `aria-pressed` 로 토글 상태를 프로그램적으로 노출(정지=눌림 상태로 표현).
- 상태 전환 직후 `role="status"` polite 영역에 "정지됨"/"동작 중" 1회 안내(매초 X, 상태 변화 시만).

### 6.3 12/24 형식 버튼 라벨 규칙

| 상태 | 시각 라벨 | `aria-label` | `aria-pressed` |
|---|---|---|---|
| 24시간 | `24시간` | `12시간 형식으로 전환` | `false` |
| 12시간 | `12시간` | `24시간 형식으로 전환` | `true` |

- **의도된 이중 표기**: 시각 라벨은 "현재 형식", `aria-label` 은 "누르면 될 동작". 시각 사용자는 현재 형식을 즉시 인지, 스크린리더 사용자는 "무엇을 하게 되는지"를 명확히 듣는다. `aria-pressed` 가 12시간 활성 여부를 보조로 노출하므로 상태 혼선 없음.
- 대안(라벨=동작 통일)도 가능하나, 시각 사용자에게 "현재 뭘로 보고 있는지"가 시계에서 더 중요하다고 판단하여 위 규칙 채택. dev 는 임의 변경 말 것(§11 모호함 flag 아님 — 결정 완료).

### 6.4 포커스 링 가시성

- 모든 버튼 `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px }` (기존 `.btn:focus-visible` 규칙 그대로).
- 마우스 클릭 시(`:focus` 이나 `:focus-visible` 아님)에는 링 미표시 — 기존 패턴.
- 라이트/다크 모두 `--color-focus-ring` 대비 충족(기존 토큰).

### 6.5 색각·명암 접근성

- running/stopped 를 **색만으로 구분하지 않음** — 항상 텍스트 라벨("동작 중"/"정지됨") 병기(§5.4).
- 대형 시각 `--color-text-primary` on `--color-bg-surface`: 라이트 `#1a1a19` on `#ffffff`(대비 ≈ 17:1), 다크 `#e8e8e4` on `#171a21`(≈ 14:1) — WCAG AAA 충족.
- 상태 라벨 caption(12px)은 `--color-text-secondary` 사용(muted 아님) — 소형 텍스트 대비 확보.

### 6.6 전역 키보드 단축키(참고 — planner 계약)

- `Space`: 정지/재개 토글. **단, 버튼에 포커스가 있을 때의 네이티브 Space 와 충돌하지 않도록** dev 는 전역 핸들러에서 `event.target` 이 버튼이면 중복 토글 방지(구현 세부는 dev 재량, 디자인은 "Space=정지/재개" 힌트만 규정).
- `H`: 형식 전환. 입력 필드가 없으므로 충돌 없음.
- 힌트 문구: `Space 정지/재개 · H 형식 전환` (`.kbd-hint`, `<kbd>` 마크업).

---

## 7. dev 구현 가이드

### 7.1 `:root` 토큰 복제 (신규 정의 금지)

`clock/styles.css` 최상단에 **timer/stopwatch 의 `:root` + 테마 오버라이드 블록을 그대로 복제**한다. 아래 토큰이 모두 존재해야 한다(누락 시 이 명세의 폰트가 깨짐):

```
--font-sans, --font-mono
--color-bg-canvas/surface/subtle, --color-border-default/strong
--color-text-primary/secondary/muted
--color-accent, --color-accent-hover, --color-danger(미사용이나 복제), --color-focus-ring
--space-1..7, --radius-sm/md/lg, --shadow-card, --shadow-popover
--motion-fast/mid, --ease-out
--text-h1, --text-display, --text-display-md, --text-display-sm,
--text-label, --text-caption, --text-button, --text-button-lg, --text-button-md
```
그리고 `[data-theme="dark"]`(또는 stopwatch 처럼 dark 를 오버라이드) 블록도 복제. **clock 전용 신규 색/폰트 변수는 추가하지 않는다.**

### 7.2 clock 전용 CSS (신규 클래스는 레이아웃 배치용만)

기존 `.topbar / .page / .card / .controls / .btn* / .kbd-hint / .display(→clock-display) / :focus-visible` 규칙을 재사용하고, 아래 **배치 오버라이드만** 추가(색/폰트 신규 없음):

```css
.card { max-width: 480px; }              /* 시계는 좁은 카드 */
.clock-date { font: var(--text-label); color: var(--color-text-secondary); }
.clock-display { display:flex; align-items:baseline; justify-content:center;
                 gap: var(--space-2); flex-wrap: wrap; user-select:none; }
.clock-display__prefix { font: var(--text-label); color: var(--color-text-secondary); }
.clock-display__time   { font: var(--text-display); font-variant-numeric: tabular-nums;
                         color: var(--color-text-primary); }
.clock-display__colon  { color: var(--color-text-muted); }
.clock-status { display:inline-flex; align-items:center; gap: var(--space-2);
                font: var(--text-caption); color: var(--color-text-secondary); }
.clock-status__dot { width:8px; height:8px; border-radius:50%;
                     background: var(--color-text-muted);
                     transition: background var(--motion-fast) var(--ease-out); }
.clock-status.is-running .clock-status__dot { background: var(--color-accent); }

@media (max-width: 959px) { .clock-display__time { font: var(--text-display-md); font-variant-numeric: tabular-nums; } }
@media (max-width: 639px) {
  .clock-display__time { font: var(--text-display-sm); font-variant-numeric: tabular-nums; }
  .card { max-width: 100%; padding: var(--space-5) var(--space-4); }
  .controls { flex-direction: column; width: 100%; }
  .controls .btn { width: 100%; min-width: auto; }
}
@media (max-width: 359px) { .page { padding: var(--space-4); } }
@media (prefers-reduced-motion: reduce) { .clock-status__dot { transition: none; } }
```

### 7.3 마크업 골격 (기존 stopwatch/index.html 셸 준수)

```html
<header class="topbar">
  <h1 class="topbar__title">시계</h1>
  <div class="topbar__actions">
    <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
  </div>
</header>
<main class="page">
  <section class="card" aria-label="시계">
    <p class="clock-date" id="clock-date">2026-07-16 (목)</p>
    <div class="clock-display" id="clock-display" role="timer" aria-live="off" aria-label="현재 시각">
      <span class="clock-display__prefix" id="clock-prefix" hidden>오후</span>
      <span class="clock-display__time">
        <span id="disp-h">08</span><span class="clock-display__colon" aria-hidden="true">:</span><span id="disp-m">03</span><span class="clock-display__colon" aria-hidden="true">:</span><span id="disp-s">07</span>
      </span>
    </div>
    <p class="clock-status is-running" id="clock-status">
      <span class="clock-status__dot" aria-hidden="true"></span><span id="clock-status-text">동작 중</span>
    </p>
    <div class="controls">
      <button type="button" class="btn btn--primary-lg" id="btn-toggle" aria-label="시계 정지" aria-pressed="false">⏸ 정지</button>
      <button type="button" class="btn btn--secondary-lg" id="btn-format" aria-label="12시간 형식으로 전환" aria-pressed="false">24시간</button>
    </div>
    <p class="kbd-hint"><kbd>Space</kbd> 정지/재개 · <kbd>H</kbd> 형식 전환</p>
  </section>
  <div id="sr-announce" class="sr-only" role="status" aria-live="polite"></div>
</main>
```

### 7.4 상태별 JS 갱신 규칙(디자인 관점 — 로직은 planner 계약)

| 이벤트 | 시각 변화 |
|---|---|
| tick(1초) | `#disp-h/m/s` 텍스트만 갱신. `aria-live=off` 라 SR 무음 |
| 정지 클릭 | `#btn-toggle` → `▶ 재개`/`aria-label=시계 재개`/`aria-pressed=true`; `.clock-status` → `is-running` 제거, 텍스트 `정지됨`; `#sr-announce`="정지됨" |
| 재개 클릭 | 역으로 복원; `#sr-announce`="동작 중" |
| 형식 12↔24 | `#btn-format` 라벨/`aria-label`/`aria-pressed` 토글; `#clock-prefix` `hidden` 토글(12h 시 오전/오후 노출) |

### 7.5 sr-only 유틸 (기존 재사용)

`.sr-only`(시각 숨김·SR 노출) 클래스는 기존 모듈 정의를 복제. 신규 정의 아님.

---

## 8. mockup 참조

- **경로**: `docs/design/mockups/clock-BF-839.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`).
- 본 명세 §2~§6 을 시각화: 좌=데스크톱(라이트) 프레임, 우=모바일 360px(다크) 프레임 + 정지 상태/12시간 형식/포커스 링/버튼 hover 상태를 별도 상태 갤러리 섹션으로 정적 표현.
- dev 는 픽셀 일치 의무 없음 — UX 의도·토큰 매핑 참조용.

---

## 9. Acceptance Criteria 매핑

| BF-841 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 문서를 작성하면, Then 기존 디자인 토큰·공용 버튼만 사용한 시계 카드 레이아웃이 명세된다 | §2(기존 토큰 재사용, 신규 0)·§3·§4(레이아웃)·§5(컴포넌트, `.btn--primary-lg`/`--secondary-lg` 공용 버튼만)·§1.3(신규 금지 대응표) |
| Given 모바일/데스크톱, When mockup 을 확인하면, Then 두 뷰포트 모두에서 잘림 없이 배치된다 | §4.5(breakpoint 별 폰트 축소·컨트롤 세로 스택)·§4.5 잘림 검증 근거 + `docs/design/mockups/clock-BF-839.html` 의 데스크톱/360px 모바일 프레임 병치 |
| Given 접근성 요구, When 명세를 검토하면, Then 12/24 전환·정지/재개 버튼의 키보드 포커스·라벨 규칙이 포함된다 | §6 전체 — §6.1(Tab 순서)·§6.2(정지/재개 라벨·aria)·§6.3(12/24 라벨·aria)·§6.4(포커스 링)·§6.5(색각)·§6.6(단축키) |

---

## 10. 비범위 (Out of Scope)

- 시계 로직(포맷팅·tick·상태 전이·localStorage) 구현 — planner §3~§7 계약을 dev 가 구현. 본 문서는 시각/접근성 명세만.
- 알람·타임존 선택·다국어·서버 동기화 — planner §10 과 동일하게 비범위.
- 신규 디자인 토큰(`design-tokens.json`) 정의·수정 — 운영자 승인 사항이며 본 task 범위 밖(기존 토큰만 재사용).
- 복잡한 애니메이션(초침 스윕, 플립 등) — task 제약으로 명시 배제.

---

## 11. Self-critique

PR commit 직전 5개 항목 자기 점검(designer 페르소나 필수).

1. **AC 매핑 완결성** — BF-841 의 3개 수용 기준을 §9 표로 1:1 매핑, 각 근거 섹션 명시. ✅ 누락 없음.
2. **dev 구현 가이드 구체성** — §7 에 `:root` 복제 토큰 목록, clock 전용 CSS 오버라이드(색/폰트 신규 없이 배치만), 마크업 골격, 상태별 갱신표, 반응형 media 규칙까지 제공. dev 가 추측 없이 따라올 수 있음. ✅
3. **기존 요소 보존** — 신규 클래스는 배치용(`.clock-*`)뿐이고 색/폰트/버튼은 전부 기존 토큰·`.btn*` 공용 버튼 재사용. topbar/page/card/controls 셸을 stopwatch 와 동일 구조로 유지하여 기존 UI 일관성 보존. ✅
4. **컴포넌트 매핑 명확성** — 정지/재개(§5.1)·12/24(§5.2)·display(§5.3)·status(§5.4)·date(§5.5) 각각 클래스·id·props/상태·aria·인터랙션을 표로 정의. planner 상태 모델(running/stopped, format 24/12)과 1:1 대응. ✅
5. **모호함 flag** — §12 에 (a) mockup 경로 불일치(File Ownership flat vs capture 컨벤션), (b) nextjs 태그 vs vanilla 실제 스택을 명시. 그 외 라벨 이중 표기(§6.3)는 결정 완료 항목으로 dev 재해석 금지 표기. ✅

> 잔여 리스크: mockup 경로를 `docs/design/mockups/` 로 둔 판단이 File Ownership 문구와 형식상 어긋남 — §12-1 에서 근거와 함께 운영자 확인 요청. dev 흐름에는 영향 없음(dev 는 본 md 를 읽음).

---

## 12. 남은 모호함 (운영자 확인 권장)

1. **mockup 파일 경로 불일치**: 본 task 의 File Ownership 은 `docs/design/clock-mockup-BF-839.html`(flat) 를 지정하나, 저장소 기존 68개 mockup 이 전부 `docs/design/mockups/` 하위이고 시스템 screenshot capture 가 그 경로만 검사한다. capture 누락·컨벤션 일관성을 위해 `docs/design/mockups/clock-BF-839.html` 로 생성했다. File Ownership flat 경로가 의도된 것이라면 운영자 확인 후 이동 필요(단, 그 경우 PR 스크린샷 임베드가 누락됨).
2. **`tech-stack:nextjs` 태그 vs 실제 vanilla-static**: planner §0 가정 1 과 동일 — Epic 메타 태그는 nextjs 이나 실제 스택은 vanilla-static. 본 명세는 vanilla-static 토큰 시스템으로 작성. 실제 Next.js/shadcn 전환 의도라면 별도 아키텍처 결정 필요(본 task 범위 밖).
3. **날짜 표기 로케일**: planner §3.1 의 `YYYY-MM-DD (요일)` 고정 포맷을 그대로 따름. 운영자가 다른 날짜 표기(예: `2026년 7월 16일`)를 원하면 planner 문서 개정이 선행되어야 함(디자인은 표시 폭만 영향).
