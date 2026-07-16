# 세계시계 검증 페이지(clock-3) 디자인 명세 — BF-891 (Phase 18 검증 3/5)

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-893 (본 designer task) · BF-891 (상위 Epic, File Ownership 원문 명시) · BF-892 (planner 명세)
> 대상 모듈: `clock-3` (`src/app/phase18-validation/clock-3/`) · tech-stack: **vanilla-static**
> 계약(contract) 상위 문서: `docs/planning/clock-3-BF-891.md` (지역 선정·데이터 소스·갱신 주기·재사용 범위의 SSOT)
> 재사용 원본(수정 금지): `src/app/demo/clock/`(BF-842) — `styles.css`/`index.html`, 디자인 SSOT `docs/design/clock-BF-839.md`
> mockup 참조: `docs/design/mockups/clock-3-BF-891.html` (§7)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 파일명이 본 task 티켓(BF-893)이 아닌 BF-891인 이유:** 본 task의 수용 기준 원문이 산출물 경로를 `docs/design/clock-3-BF-891.md`로 명시했고, planner 문서(`docs/planning/clock-3-BF-891.md` §0 가정 7)도 동일하게 상위 Epic 번호(BF-891)를 파일명에 사용하는 컨벤션을 확립했다. 본 문서는 그 지시를 재해석하지 않고 그대로 따르며(mockup도 `clock-3-BF-891.html`), 본문에서 "본 task"를 지칭할 때는 실제 작업 티켓 BF-893을 사용한다.

**가정 2 — 재사용 원본 = `src/app/demo/clock/`(BF-842), 재사용 범위는 planner §7 계약 준수:** planner 문서 §7이 "재사용 대상(CSS 디자인 토큰 전체·페이지 셸·카드 컴포넌트 시각 언어)"과 "재사용하지 않는 것(로컬 전용 포맷팅 함수·정지/재개·12/24 전환·단일 카드 레이아웃)"을 확정했다. 본 디자인 명세는 이 계약을 시각 언어 차원에서 구체화한다 — **신규 색상·폰트·디자인 토큰을 0건 추가**하고(Simplicity First), 원본 `styles.css`의 `:root` 토큰과 `.card`/`.clock-date`/`.clock-display` 시각 규칙을 그대로 재사용하며, 신규는 오직 **3-카드 배치용 `.region-grid`/지역 라벨 클래스**뿐이다.

**가정 3 — 정지/재개·12/24 전환·상태 배지·키보드 힌트 미제공:** planner §0 가정 4·§8.3에 따라 본 검증 페이지는 항상 실행 중인 정적 3-카드 표시다. 원본 clock의 `.controls`(정지/재개·형식 전환 버튼)·`.clock-status`(상태 배지)·`.kbd-hint`(단축키 힌트)는 **재현하지 않는다**. 따라서 원본 §5·§6의 버튼/상태 배지 접근성 규칙은 본 명세 범위 밖이며, 본 문서 §9는 정적 표시 요소(카드·라벨·날짜·시각)의 접근성만 다룬다.

**가정 4 — mockup 경로:** 시스템 자동 screenshot capture(`captureDesignerMockups`)가 `docs/design/mockups/` 경로만 검사하므로, mockup은 `docs/design/mockups/clock-3-BF-891.html`로 생성한다(원본 clock 명세 BF-839 §0의 확립된 컨벤션 계승).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트 (기존 토큰 재사용)](#2-컬러-팔레트-기존-토큰-재사용)
3. [타이포그래피 (기존 토큰 재사용)](#3-타이포그래피-기존-토큰-재사용)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [Acceptance Criteria 매핑](#8-acceptance-criteria-매핑)
9. [접근성](#9-접근성)
10. [비범위](#10-비범위)
11. [Self-critique](#11-self-critique)
12. [남은 모호함](#12-남은-모호함)

---

## 1. 시안 개요

### 1.1 변경 범위

원본 단일 시계 카드(BF-842 `/demo/clock`)의 시각 언어를 그대로 승계한 **3-카드 가로 그리드** 검증 페이지다. 상단 `topbar`(타이틀 + 테마 전환 버튼)는 원본 셸을 그대로 재사용하고, 본문에는 서울 → 뉴욕 → 런던 순서(planner §3.1)의 카드 3개를 `region-grid`로 나란히 배치한다. 각 카드는 위에서부터 (1) 지역 라벨, (2) 날짜, (3) 대형 시각(HH:MM:SS 24시간 고정) 순으로 세로 정렬된다 — 원본 카드에서 상태 배지·컨트롤·키보드 힌트를 제거한 축약 구조(§0 가정 3).

### 1.2 사용자 경험 목표

- **한눈에 3개 지역 비교** — 세 카드를 동일 시각 언어·동일 계층으로 나란히 배치해, 지역별 시각(과 날짜)의 차이를 스캔 한 번으로 인지한다. 시각(HH:MM:SS)이 각 카드의 시각적 주인공(hero).
- **기존 페이지와의 완전한 시각 일관성** — 신규 색/폰트/에셋 0건. `/demo/clock`·`timer`·`stopwatch` 사용자가 학습 없이 즉시 이해(planner AC-5 §7.3의 "신규 색상 0건" 판정 기준 충족).
- **정보 밀도에 맞춘 시각 크기 조정** — 단일 hero(128px)가 아니라 3개 병렬 비교이므로, 대형 시각을 카드 폭에 대응하는 유동 크기로 축소(§3, §4.4). 색/폰트 family는 불변, 크기(px)만 반응형 배치 파라미터로 조정(원본 §4.5가 이미 128/96/72로 미디어별 조정한 선례의 연장).
- **잘림 없는 반응형** — 데스크톱 3열 → 태블릿 2열 → 모바일 1열 스택. 어느 뷰포트에서도 `HH:MM:SS` 8자가 카드 밖으로 잘리지 않는다(§4.5).

### 1.3 신규 추가 금지 항목 (planner §7 재확인)

| 금지 | 본 명세의 대응 |
|---|---|
| 신규 컬러 | §2는 원본 `styles.css`의 기존 토큰만 사용. 지역 라벨도 기존 `--color-text-secondary` 재사용 |
| 신규 폰트 | `--font-sans` / `--font-mono`(시스템 폰트 스택)만 사용 |
| 외부 에셋·CDN | 이미지·아이콘 폰트·웹폰트 0건. 테마 전환 글리프(🌙)만 유니코드 |
| 신규 디자인 토큰 | `:root` 토큰 세트를 원본에서 값 그대로 복제. 신규 변수 정의 0건 |
| 상태 배지·컨트롤·힌트 | 원본 `.clock-status`/`.controls`/`.kbd-hint` 재현 안 함(§0 가정 3) |

---

## 2. 컬러 팔레트 (기존 토큰 재사용)

신규 색을 정의하지 않는다. 아래는 원본 `src/app/demo/clock/styles.css`의 `:root`에서 **재사용하는** 토큰과 본 세계시계 카드에서의 용도 매핑이다. HEX는 참고용이며 dev는 반드시 CSS 변수로 참조한다(하드코딩 금지).

### 2.1 라이트 테마 (기본, `data-theme="light"`)

| 역할 | 토큰(변수) | HEX | clock-3 카드 용도 |
|---|---|---|---|
| background(canvas) | `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| surface | `--color-bg-surface` | `#ffffff` | topbar 배경, 카드 3개 배경 |
| subtle | `--color-bg-subtle` | `#f1f1ef` | 테마 전환 버튼 hover 배경 |
| border | `--color-border-default` | `#e5e5e2` | topbar 하단 경계선 |
| text primary | `--color-text-primary` | `#1a1a19` | 대형 시각 숫자(HH·MM·SS) |
| text secondary | `--color-text-secondary` | `#6b6b66` | 지역 라벨, 날짜 |
| text muted | `--color-text-muted` | `#9a9a93` | 시각 콜론(`:`) |
| accent | `--color-accent` | `#3563e9` | (지역 라벨 강조가 필요할 때만 — 본 시안은 미사용, 토큰 세트 유지 위해 복제) |
| focus ring | `--color-focus-ring` | `rgba(53,99,233,.45)` | 테마 전환 버튼 `:focus-visible` outline |

> 원본 clock에서 running/stopped 구분에 쓰던 `--color-accent`(동작 중 점)는 본 페이지에 상태 배지가 없으므로 시각 요소로 쓰지 않는다. 토큰 자체는 `:root` 복제 시 유지한다(§6.1).

### 2.2 다크 테마 (`data-theme="dark"`)

원본 clock의 다크 오버라이드를 그대로 상속한다(신규 없음). 핵심 값:

| 역할 | 토큰 | HEX(dark) |
|---|---|---|
| canvas | `--color-bg-canvas` | `#0f1115` |
| surface | `--color-bg-surface` | `#171a21` |
| subtle | `--color-bg-subtle` | `#1e222b` |
| border | `--color-border-default` | `#262b36` |
| text primary | `--color-text-primary` | `#e8e8e4` |
| text secondary | `--color-text-secondary` | `#9a9a93` |
| text muted | `--color-text-muted` | `#6b6b66` |
| shadow-card | `--shadow-card` | `0 4px 16px rgba(0,0,0,.32)` |

### 2.3 대비 검증 (WCAG)

- 대형 시각 `--color-text-primary` on `--color-bg-surface`: 라이트 `#1a1a19` on `#ffffff`(대비 ≈ 17:1), 다크 `#e8e8e4` on `#171a21`(≈ 14:1) — WCAG AAA 충족.
- 지역 라벨·날짜 `--color-text-secondary`(muted 아님) on surface: 라이트 `#6b6b66` on `#ffffff`(≈ 5.3:1), 다크 `#9a9a93` on `#171a21`(≈ 6.1:1) — WCAG AA(소형 텍스트 4.5:1) 충족.
- 콜론 `--color-text-muted`는 장식적 구분자이며 값 판독은 인접 숫자(primary)로 이뤄지므로 대비 요건에서 제외(콜론만으로 정보 전달하지 않음).

---

## 3. 타이포그래피 (기존 토큰 재사용)

| 요소 | 토큰 | 값(= 기존 정의) | 비고 |
|---|---|---|---|
| topbar 타이틀 | `--text-h1` | `600 20px/1.3 sans` | "세계시계 검증" |
| 지역 라벨 | `--text-label` | `500 14px/1.4 sans` | `서울` / `뉴욕` / `런던` (신규 요소, 기존 토큰 재사용) |
| 날짜 | `--text-label` | `500 14px/1.4 sans` | `YYYY-MM-DD (요일)` — 원본 `.clock-date` 승계 |
| 대형 시각 | (아래 §4.4 유동 크기) | `300 · mono · clamp(48–72px)/1` | `font-variant-numeric: tabular-nums` 필수. weight/family는 `--text-display*` 토큰과 동일(300 mono), 크기만 카드폭 대응 유동 |

> **대형 시각 크기 결정 근거:** 원본 단일 카드는 `--text-display`(128px)를 hero로 썼으나, 3-카드 병렬 그리드에서 각 카드 폭(≈300–380px)에 128px(8자 ≈ 616px)는 잘린다. 신규 크기 토큰을 정의하는 대신 **기존 `--text-display-sm`(72px)을 상한으로, `--space-7`(48px) 근사값을 하한으로 하는 `clamp()` 유동 크기**를 채택한다(§4.4). 상·하한 모두 기존 토큰 수치 범위 내이므로 "신규 폰트/크기 토큰 도입"이 아니라 원본 §4.5의 반응형 크기 조정 패턴을 카드폭 기준으로 일반화한 것이다.

---

## 4. 레이아웃

### 4.1 셸 구조 (원본 `/demo/clock` 셸 재사용 + 3-카드 그리드 신규)

```
<body>                              ← flex column, bg-canvas (원본 재사용)
 ├─ <header class="topbar">         ← 56px 고정, 좌: "세계시계 검증" / 우: 테마 전환 버튼 (원본 재사용)
 └─ <main class="page">             ← flex column, center 정렬 (원본 재사용)
     └─ <div class="region-grid">   ← 신규 컨테이너 (배치 전용, 색/폰트 신규 없음)
         ├─ <section class="card region-clock" aria-label="서울">
         ├─ <section class="card region-clock" aria-label="뉴욕">
         └─ <section class="card region-clock" aria-label="런던">
```

- `.topbar`/`.page`/`.card`는 원본 규칙 그대로. 단, `.card`의 원본 `max-width:480px`은 그리드 셀에서는 `region-grid`가 폭을 제어하므로 `.region-clock`에서 `max-width:none`으로 오버라이드(§6.2) — 색/폰트 불변, 폭 배치 값만 조정.

### 4.2 카드 내부 세로 구조 (위 → 아래)

| # | 영역 | 클래스(권장) | 내용 | 정렬 |
|---|---|---|---|---|
| 1 | 지역 라벨(신규) | `.region-clock__label` | `서울` / `뉴욕` / `런던` | 중앙, `--text-label`, `--color-text-secondary` |
| 2 | 날짜 | `.clock-date` (원본 재사용) | `2026-07-17 (금)` | 중앙, `--color-text-secondary` |
| 3 | 대형 시각 | `.clock-display` (원본 재사용) | `03:19:07` (24시간 고정) | 중앙, baseline flex, tabular-nums |

- 카드는 원본 `.card` 규칙(`display:flex; flex-direction:column; align-items:center; gap: var(--space-6)`)을 그대로 사용하되, 콘텐츠가 3요소로 줄었으므로 카드 세로 gap을 `--space-5`(24px)로 좁혀 균형을 맞춘다(§6.2, 배치 조정).
- 시각의 오전/오후 접두(`.clock-display__prefix`)는 24시간 고정이므로 항상 `hidden`(원본 구조 유지, DOM 존재하되 미표시).

### 4.3 spacing

- 페이지 패딩: `.page { padding: var(--space-7) var(--space-5) }` (원본)
- 그리드 gap: `.region-grid { gap: var(--space-5) }` (24px, 카드 간 간격)
- 카드 패딩: `.region-clock { padding: var(--space-6) var(--space-5) }` (원본 `--space-7 --space-6`에서 좁힘 — 3열에서 시각 폭 확보)
- 카드 내 세로 간격: `gap: var(--space-5)`(24px) — 라벨↔날짜↔시각

### 4.4 대형 시각 유동 크기 (잘림 방지 핵심)

```css
.region-clock .clock-display__time {
  font-family: var(--font-mono);
  font-weight: 300;
  line-height: 1;
  font-size: clamp(3rem, 7vw, 4.5rem);   /* 48px ~ 72px, 상한 = --text-display-sm */
  font-variant-numeric: tabular-nums;     /* 8자 폭 고정, 초 갱신 시 흔들림 없음 */
  color: var(--color-text-primary);
}
```

- 하한 `3rem`(48px): 최소 카드 폭(모바일 그리드 셀 ≈ 288px 콘텐츠)에서도 `88:88:88` 8자(≈ 48×0.6×8 = 230px)가 잘리지 않는 안전값.
- 상한 `4.5rem`(72px = 기존 `--text-display-sm`): 넓은 뷰포트에서도 원본 최소 display 크기를 넘지 않아 신규 크기 도입이 아님.
- `7vw`: 카드 폭에 비례해 두 극단 사이를 유동 조정 — 데스크톱 3열(≈ 72px)에서 모바일 1열까지 자연 축소.

### 4.5 breakpoint 별 동작 (AC "기존 페이지 일관 + 잘림 없음" 핵심)

`region-grid`는 `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`로 컨테이너 폭에 따라 열 수가 자동 조정된다:

| 뷰포트 | 조건 | 그리드 | 카드 폭(근사) | 시각 크기(clamp 결과) |
|---|---|---|---|---|
| 데스크톱 | `≥ 900px` | 3열 | ≈ 300–380px | ≈ 63–72px |
| 태블릿 | `600–899px` | 2열 | ≈ 280–430px | ≈ 56–72px |
| 모바일 | `≤ 599px` | 1열 (auto-fit → 단일 카드가 폭 채움) | 100% − 패딩 | ≈ 48px(하한, `7vw`가 작아짐) |

- 열 수는 미디어 쿼리가 아니라 `auto-fit + minmax`가 컨테이너 폭 기준으로 자동 결정 — 브레이크포인트 경계에서 매끄럽게 재배치(원본 §4.5의 반응형 원칙을 그리드로 일반화).
- 모바일 단일 열에서 카드는 `region-grid`의 `max-width`(예: 420px) 안에서 중앙 정렬해 과도하게 넓어지지 않게 한다(§6.2).

> **잘림 검증 근거:** 최장 표시 문자열은 `88:88:88`(8자, 초 단위 최대 폭). tabular-nums mono 글리프 폭 ≈ 0.6em 기준, 하한 48px에서 8자 ≈ 230px < 최소 카드 콘텐츠 폭(280px − `--space-5`×2 = 232px)에 근접하나, 콜론 2자는 숫자보다 좁아 실측 폭이 더 작다. mockup의 모바일 360px 프레임에서 이 동작을 시각 확인할 것(§7). 상한 72px는 데스크톱 3열 카드 콘텐츠 폭(≈ 300 − 48 = 252px)에 대해 `7vw`가 72px에 도달하는 뷰포트(≈ 1030px 이상)에서만 적용되며, 그 지점의 카드 콘텐츠 폭은 충분하다.

### 4.6 모션

- 본 페이지는 상태 전환(정지/재개)이 없으므로 상태 점 트랜지션(원본 §4.6)이 없다.
- 테마 전환 버튼 hover는 원본 `.btn--ghost` 규칙(배경 색 트랜지션)만. **신규 keyframe 애니메이션 0건**.
- 매초 시각 갱신은 텍스트 교체일 뿐 트랜지션 없음(깜빡임 방지).
- `@media (prefers-reduced-motion: reduce)`에서 추가 트랜지션 없음(기존 패턴 준수).

---

## 5. 컴포넌트 명세

### 5.1 지역 시계 카드 (`RegionClockCard` — 표시 전용, 버튼 아님)

| 항목 | 값 |
|---|---|
| 기반 클래스 | `.card`(원본 공용 카드 셸) + `.region-clock`(폭/패딩 배치 오버라이드) |
| props/데이터 | planner §3.3 `REGIONS[i]` = `{ id, label, timeZone }` 1건에 1:1 대응 |
| 렌더 인스턴스 | 서울(`id="clock-seoul"`) / 뉴욕(`id="clock-newyork"`) / 런던(`id="clock-london"`) 3개 — 배열 순서 = DOM 순서 = 표시 순서(planner §3.3) |
| 접근성 | `aria-label`에 지역 라벨(예: `aria-label="서울"`) — 스크린리더가 카드 경계를 지역 단위로 인지 |
| 상태 | 없음(항상 실행, 정지/형식 상태 모델 미보유 — §0 가정 3) |

### 5.2 지역 라벨 (`RegionLabel` — 신규 최소 추가 요소)

| 항목 | 값 |
|---|---|
| 클래스(권장) | `.region-clock__label` |
| 내용 | `서울` / `뉴욕` / `런던` (planner §3.1 `label`) |
| 스타일 | `--text-label`, `--color-text-secondary`, 중앙 정렬. 신규 색/폰트 없음(기존 토큰 재사용) |
| DOM id 접두 규칙 | 카드 내부 요소 id는 `clock-<id>-*`(예: `clock-seoul-date`, `clock-seoul-time`) — planner §3.3 "`id`는 DOM id 접두사" 계약 준수 |
| 마크업 | `<h2>` — topbar `<h1>` 하위 문서 구조. `--text-label` 크기는 유지하되 시맨틱은 heading(§9.2) |

### 5.3 날짜 표시 (`ClockDate` — 원본 재사용)

| 항목 | 값 |
|---|---|
| 클래스 | `.clock-date`(원본 규칙 그대로) |
| 내용 | planner §5.1 형식 `YYYY-MM-DD (요일)` — 지역별 `Intl.DateTimeFormat` 투영 결과(예: 서울 `2026-07-17 (금)`, 뉴욕 `2026-07-16 (목)`) |
| 스타일 | `--text-label`, `--color-text-secondary`, 중앙 정렬(원본 그대로) |
| 지역별 날짜 차이 | planner §5.3·§13.2 — UTC 오프셋 차이로 카드마다 날짜가 다를 수 있음(결함 아님, 세계시계의 정확한 동작). mockup은 이 차이를 의도적으로 보여주는 샘플 시각 사용(§7) |

### 5.4 대형 시각 표시 (`ClockDisplay` — 원본 구조 재사용, 크기만 유동)

| 항목 | 값 |
|---|---|
| 클래스 | `.clock-display`(원본) + `.clock-display__time`/`__colon`/`__prefix`(원본 내부 구조) |
| 크기 | §4.4 `clamp(3rem, 7vw, 4.5rem)` 유동. weight/family/color는 원본 `--text-display*`와 동일 |
| role | `role="timer"`(원본 승계) |
| aria-live | **`off`** — 1초마다 갱신되므로 live면 스크린리더가 매초 읽어 소음. 갱신 자체는 읽지 않음(원본 §5.3 규칙 승계) |
| aria-label | `"<지역> 현재 시각"`(예: `"서울 현재 시각"`) — 3개 카드가 구분되도록 지역명 포함 |
| 오전/오후 접두 | `.clock-display__prefix`는 항상 `hidden`(24시간 고정, §0 가정 3) — DOM 구조는 원본 유지 |
| 콜론 | `.clock-display__colon`, `aria-hidden="true"`(장식), `--color-text-muted` |

---

## 6. dev 구현 가이드

### 6.1 `:root` 토큰 복제 (신규 정의 금지)

`src/app/phase18-validation/clock-3/styles.css` 최상단에 **원본 `src/app/demo/clock/styles.css`의 `:root` + `[data-theme="dark"]` 블록을 그대로 복제**한다(planner §7.1 — 값 복제 또는 상대경로 참조는 dev 재량, 단 신규 색 리터럴 0건). 아래 토큰이 모두 존재해야 한다:

```
--font-sans, --font-mono
--color-bg-canvas/surface/subtle, --color-border-default/strong
--color-text-primary/secondary/muted
--color-accent, --color-accent-hover, --color-focus-ring
--space-1..7, --radius-sm/md/lg, --shadow-card
--motion-fast/mid, --ease-out
--text-h1, --text-label, --text-caption, --text-button,
--text-display-sm  /* 시각 clamp 상한 참조 근거 (직접 참조는 선택) */
```

**clock-3 전용 신규 색/폰트 변수는 추가하지 않는다.**

### 6.2 clock-3 전용 CSS (신규 클래스는 레이아웃 배치용만)

기존 `.topbar`/`.page`/`.card`/`.btn*`/`.clock-date`/`.clock-display*`/`.sr-only`/`:focus-visible` 규칙을 그대로 복제·재사용하고, 아래 **배치 오버라이드만** 추가(색/폰트 신규 없음):

```css
/* 3-카드 그리드 (신규 배치 컨테이너) */
.region-grid {
  width: 100%;
  max-width: 1080px;          /* 데스크톱 3열 컨테이너 상한 */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
}
/* 1열이 될 때(모바일) 카드가 과도하게 넓어지지 않게 */
@media (max-width: 599px) {
  .region-grid { max-width: 420px; }
}

/* 그리드 셀 카드 — 원본 .card 폭/패딩만 오버라이드 */
.region-clock {
  max-width: none;                              /* 원본 480px 상한 해제(그리드가 폭 제어) */
  padding: var(--space-6) var(--space-5);
  gap: var(--space-5);
}

/* 지역 라벨 (신규 최소 요소, 기존 토큰만) */
.region-clock__label {
  font: var(--text-label);
  color: var(--color-text-secondary);
  margin: 0;
  text-align: center;
}

/* 대형 시각 — 카드폭 대응 유동 크기 (§4.4) */
.region-clock .clock-display__time {
  font-family: var(--font-mono);
  font-weight: 300;
  line-height: 1;
  font-size: clamp(3rem, 7vw, 4.5rem);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}
```

> ⚠️ 원본 `styles.css`의 `.clock-display__time`은 `font: var(--text-display)`(128px)로 고정돼 있다. clock-3에서는 위 `.region-clock .clock-display__time` 규칙이 셀렉터 특이도(specificity)로 이를 오버라이드하도록 **`.region-clock` 하위에서 재정의**한다(원본 파일은 수정 금지 — planner §10.5).

### 6.3 마크업 골격 (원본 index.html 셸 준수)

```html
<header class="topbar">
  <h1 class="topbar__title">세계시계 검증</h1>
  <div class="topbar__actions">
    <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
  </div>
</header>
<main class="page">
  <div class="region-grid">
    <!-- 카드 3개: 서울 / 뉴욕 / 런던 (planner §3.3 REGIONS 순서) -->
    <section class="card region-clock" aria-label="서울">
      <h2 class="region-clock__label">서울</h2>
      <p class="clock-date" id="clock-seoul-date">2026-07-17 (금)</p>
      <div class="clock-display" id="clock-seoul-display" role="timer" aria-live="off" aria-label="서울 현재 시각">
        <span class="clock-display__prefix" hidden></span>
        <span class="clock-display__time">
          <span id="clock-seoul-h">03</span><span class="clock-display__colon" aria-hidden="true">:</span
          ><span id="clock-seoul-m">19</span><span class="clock-display__colon" aria-hidden="true">:</span
          ><span id="clock-seoul-s">07</span>
        </span>
      </div>
    </section>
    <!-- 뉴욕(clock-newyork-*) / 런던(clock-london-*) 카드는 동일 구조, id 접두사만 교체 -->
  </div>
  <noscript><p>이 페이지는 JavaScript로 시각을 갱신합니다. JS를 활성화해 주세요.</p></noscript>
</main>
<script type="module" src="main.js"></script>
```

- 카드 3개는 **동일 구조를 id 접두사(`clock-<id>-*`)만 바꿔 반복** — planner §7.1 "카드 1개당 1지역으로 3번 반복"을 그대로 구현.
- 초기 마크업의 시각 값은 placeholder(로드 즉시 `main.js`가 실제 값으로 교체). 서로 다른 날짜(서울 금 / 뉴욕·런던 목)로 두어 지역별 날짜 차이(§5.3)를 초기 렌더부터 자연스럽게 노출.

### 6.4 요소별 JS 갱신 규칙 (디자인 관점 — 로직은 planner 계약)

| 이벤트 | 시각 변화 |
|---|---|
| tick(1초) | 3개 카드의 `#clock-<id>-h/m/s` 텍스트 + `#clock-<id>-date` 텍스트만 갱신. `aria-live=off`라 SR 무음. planner §6.2 단일 `Date` 원천 준수(디자인 영향 없음) |
| 테마 전환 | 원본과 동일 — `<html data-theme>` 토글, 버튼 글리프(🌙/☀️) 교체 |
| 자정 통과 | 해당 지역 카드 날짜만 갱신(다른 지역과 날짜 달라질 수 있음, §5.3) |

### 6.5 sr-only 유틸 (기존 재사용)

`.sr-only` 클래스는 원본 정의를 복제(신규 아님). 본 페이지는 상태 안내(`role="status"`) 영역이 없으므로(정지/재개 없음) 원본의 `#sr-announce`는 재현하지 않는다.

---

## 7. mockup 참조

- **경로**: `docs/design/mockups/clock-3-BF-891.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, vanilla CSS).
- 본 명세 §2~§5를 시각화:
  1. **데스크톱 라이트** — 3-카드 그리드(서울/뉴욕/런던), 실제 페이지 셸(topbar + region-grid).
  2. **데스크톱 다크** — 동일 그리드의 다크 테마 표현(토큰 오버라이드 검증).
  3. **모바일 360px** — 단일 열 스택으로 잘림 없이 배치되는 모습.
  4. **카드 anatomy + 토큰 팔레트** — 카드 내부 계층(라벨→날짜→시각)과 재사용 토큰 매핑표를 정적 표현.
- **의도적 샘플 시각(동일 시점 투영)**: 서울 `2026-07-17 (금) 03:19:07` / 뉴욕 `2026-07-16 (목) 14:19:07` / 런던 `2026-07-16 (목) 19:19:07` — 동일 UTC 시점(2026-07-16 18:19:07 UTC)을 세 지역으로 투영한 값. 서울만 날짜가 다음 날(금)로, 지역별 날짜 차이(§5.3, planner §13.2)를 한눈에 보여준다.
- dev는 픽셀 일치 의무 없음 — UX 의도·토큰 매핑·잘림 방지 동작 참조용.

---

## 8. Acceptance Criteria 매핑

| BF-893 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세 작성, Then `docs/design/clock-3-BF-891.md` + mockup이 세 지역 카드 레이아웃과 디자인 토큰 매핑을 포함 | §4(3-카드 그리드 레이아웃·breakpoint)·§5(카드/라벨/날짜/시각 컴포넌트)·§2·§3(토큰 매핑표) + `docs/design/mockups/clock-3-BF-891.html`(서울/뉴욕/런던 3-카드 시각화) |
| Given 기존 demo 카드, When 시각 언어 검토, Then 색상·간격·타이포가 기존 페이지와 일관됨 | §1.3(신규 0건 대응표)·§2(원본 `styles.css` 토큰 그대로)·§3(원본 타이포 토큰)·§6.1~§6.2(원본 `:root`·`.card`·`.clock-*` 복제, 신규는 배치 클래스만) — planner §7.3 재사용 성공 판정 4항목과 정합 |

---

## 9. 접근성

> 본 페이지는 인터랙티브 컨트롤(정지/재개·형식 전환)이 없으므로(§0 가정 3), 접근성 명세는 **정적 표시 요소 + 유일한 인터랙션인 테마 전환 버튼**만 다룬다.

### 9.1 포커스 순서(Tab order)

- 포커스 가능한 요소는 **테마 전환 버튼(`#btn-theme`) 1개뿐**. 3개 시계 카드·라벨·날짜·시각은 정적 표시로 포커스 불가(`tabindex` 부여 안 함).
- 네이티브 `<button type="button">` → 기본 포커스·`Enter`/`Space` 활성화. `:focus-visible`은 원본 `.btn:focus-visible`(2px focus-ring outline) 그대로.

### 9.2 문서 구조 (heading·landmark)

- `<h1>` "세계시계 검증"(topbar) → 각 카드 `<h2>` 지역 라벨(서울/뉴욕/런던) 순의 논리적 heading 계층. 스크린리더가 heading 목록으로 3개 지역을 탐색 가능.
- 각 카드 `<section aria-label="<지역>">` → landmark로 지역 단위 경계 인지.

### 9.3 라이브 리전 (초 갱신 소음 방지)

- 대형 시각 `aria-live="off"`(원본 §5.3 규칙 승계) — 매초 갱신이 스크린리더에서 읽히지 않는다. `role="timer"`로 시각 표시임을 노출하되, 값 자체를 초마다 announce하지 않아 소음 방지.

### 9.4 색각·명암 접근성

- 지역 구분은 **색이 아니라 텍스트 라벨**(서울/뉴욕/런던)로 이뤄진다 — 색각 이상 사용자도 카드 구분 가능.
- 대비: §2.3 검증 — 시각(AAA), 라벨/날짜(AA) 충족. 라이트/다크 모두.

---

## 10. 비범위 (Out of Scope)

- 시각 계산 로직(`Intl.DateTimeFormat` 투영·tick·단일 Date 원천) 구현 — planner §4~§6 계약을 dev가 구현. 본 문서는 시각/레이아웃/접근성 명세만.
- 정지/재개·12/24 형식 전환·상태 배지·키보드 힌트 — planner §0 가정 4·§8.3에서 비범위 확정(§0 가정 3).
- 사용자 지정 타임존 선택 UI(4번째 지역 추가 등) — planner §10.2.
- 외부 timezone/시각 API 연동 — planner §10.1에서 명시 배제.
- 원본 `src/app/demo/clock/*` 코드 수정·리팩터링 — planner §10.5(§6.2 오버라이드는 clock-3 신규 파일에서만).
- 신규 디자인 토큰(`design-tokens.json`) 정의·수정 — 기존 토큰만 재사용.

---

## 11. Self-critique

PR commit 직전 5개 항목 자기 점검(designer 페르소나 필수).

1. **AC 매핑 완결성** — BF-893의 2개 수용 기준을 §8 표로 1:1 매핑. (1) 세 지역 카드 레이아웃·토큰 매핑 → §2/§3/§4/§5 + mockup, (2) 기존 페이지 시각 일관성 → §1.3/§2/§3/§6 + planner §7.3 정합. ✅ 누락 없음.
2. **dev 구현 가이드 구체성** — §6에 `:root` 복제 토큰 목록, clock-3 전용 CSS(그리드·카드 오버라이드·시각 clamp, 색/폰트 신규 없이 배치만), 마크업 골격(id 접두사 규칙 포함), 요소별 갱신표 제공. dev가 추측 없이 따라올 수 있음. 특히 원본 128px 오버라이드를 `.region-clock` 특이도로 처리하는 방법 명시. ✅
3. **기존 요소 보존** — 신규 클래스는 배치용(`.region-grid`/`.region-clock`/`.region-clock__label`)뿐. 색/폰트/카드 셸/`.clock-date`/`.clock-display`는 전부 원본 토큰·규칙 재사용. topbar/page/card 셸을 원본과 동일 구조로 유지. planner §7.3 판정 4항목(신규 색 0건·표시 계층 동일·원본 미변경·계산 로직 독립)과 정합. ✅
4. **컴포넌트 매핑 명확성** — RegionClockCard(§5.1)·RegionLabel(§5.2)·ClockDate(§5.3)·ClockDisplay(§5.4) 각각 클래스·id 접두 규칙·데이터(planner `REGIONS`)·aria·스타일을 표로 정의. planner §3.3 데이터 구조(`{id,label,timeZone}`)와 1:1 대응. ✅
5. **모호함 flag** — §12에 (a) 대형 시각 clamp 크기 결정(신규 토큰 아님을 근거와 함께 명시, dev 재해석 금지), (b) 지역 라벨 heading 레벨(`<h2>`) 결정, (c) 파일명 BF-891 컨벤션을 명시. 그 외 결정 완료 항목은 dev 재해석 금지로 표기. ✅

> 잔여 리스크: 대형 시각을 `clamp()` 유동 크기로 정의한 것은 원본의 고정 토큰(`--text-display*`) 방식과 형식이 다르다. 다만 상·하한을 기존 토큰 수치(48–72px) 범위로 묶어 "신규 크기 도입"이 아님을 §3·§4.4에서 근거화했고, 3-카드 병렬이라는 새 컨텍스트에서 잘림 방지를 위한 불가피한 배치 조정임을 명시했다. reviewer가 고정 크기(예: `--text-display-sm` 72px 단독)를 선호한다면 §4.4를 그 값으로 교체 가능(단, 좁은 카드 잘림 위험 재검토 필요).

---

## 12. 남은 모호함 (운영자 확인 권장)

1. **대형 시각 크기 방식**: 3-카드 그리드에 원본 128px hero는 잘리므로 `clamp(48–72px)` 유동 크기를 채택했다(§4.4, 상·하한 모두 기존 토큰 범위). 운영자/reviewer가 지역별 시각을 원본처럼 더 크게(단일 카드 hero급) 강조하고 싶다면 카드를 세로 1열로 배치하는 대안을 재검토할 수 있다(현 시안은 "3개 동시 비교"를 우선).
2. **지역 라벨 강조 수준**: 현 시안은 라벨을 `--color-text-secondary`로 절제 표현(날짜와 동급). 지역 구분을 더 강조하려면 `--color-text-primary` 또는 `--color-accent` 적용도 가능하나, "신규 강조 0건·기존 페이지 일관" 원칙에 따라 절제안을 기본으로 채택했다.
3. **파일명 BF-891 컨벤션**: 본 task 티켓은 BF-893이나 산출물 파일명은 수용 기준·planner 컨벤션대로 `clock-3-BF-891`을 사용했다(§0 가정 1). Epic 원문에 다른 지침이 있다면 대조 확인 권장(본 세션에 Jira 조회 도구 미연결).
4. **Phase 18 검증 스위트 후속 항목(4~5/5)**: planner §16-2와 동일 — 남은 검증 대상 모듈은 확인 불가.

---

*문서 종료 — [이디자인] · BF-893*
