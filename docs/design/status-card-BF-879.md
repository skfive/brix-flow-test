# 서비스 상태 카드 디자인 명세 — BF-879 (Phase 18 검증 1/5, 본 task BF-881)

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> tech-stack: `vanilla-static` (외부 의존성 0건, system font, CSS 변수 자체 정의)
> 기획 SSOT: `docs/planning/status-card-BF-879.md` (BF-880, planner)
> 재사용 원본(수정 금지): `src/app/demo/status/` (BF-856) — styles.css 토큰·컴포넌트, status.js fixture/파생 로직
> 검증 대상 라우트(=디렉터리): `/phase18-validation/status-card-1` → `src/app/phase18-validation/status-card-1/`
> mockup: `docs/design/mockups/status-card-BF-879.html`

---

## 0. 문서 성격 (필독 — 재해석 금지)

본 task(BF-881)는 **신규 시각 언어를 발명하지 않는다**. Phase 18 검증 스위트 1/5 항목으로, 이미 병합·확정된 `src/app/demo/status/`의 시각 언어(clock 셸 토큰 + kanban 상태 3색, `summary-banner`/`status-list`/`status-card`/`status-badge` 컴포넌트)를 **새 경로에서 손실 없이 재사용**하는 것을 시각적으로 명세하는 것이 목적이다(기획 §1, §5).

- 본 디자인 명세의 모든 색상·타이포·컴포넌트 값은 원본 `src/app/demo/status/styles.css`·`status.js`에서 **그대로 인용**한 것이다. 신규 색상 리터럴·신규 토큰·신규 컴포넌트는 **0건**이다(기획 §5.3-1).
- 파일명이 본 task 티켓(BF-881)이 아닌 **BF-879**인 이유: BF-881 수용 기준 원문이 산출물 경로를 `docs/design/status-card-BF-879.md`로 명시했다(Phase 18 검증 스위트의 상위 Epic 번호 = BF-879). 지시를 재해석하지 않고 그대로 따른다. mockup 파일도 짝을 맞춰 `status-card-BF-879.html`로 생성한다.
- **파일 소유권**: 본 task의 담당 파일은 `docs/design/**` 뿐이다. `src/app/phase18-validation/status-card-1/*` 코드는 후속 dev task 담당 영역이며 본 task에서 생성·수정하지 않는다.

---

## 1. 시안 개요

### 1.1 변경 범위

| 항목 | 내용 |
|---|---|
| 신규 시각 요소 | **없음** — 원본 `/demo/status`의 시각 언어를 100% 재사용 |
| 신규 색상/토큰 | **없음** — §2 팔레트는 전부 원본 `styles.css` 인용 |
| 신규 컴포넌트 | **없음** — §5 컴포넌트는 전부 원본 클래스 재사용 |
| 문구 차이(유일한 신규) | `<title>`·`<h1>` 텍스트만 검증 맥락 반영(§4.4, 기획 §4.2) |
| 신규 배치 위치 | 디렉터리 경로 `src/app/phase18-validation/status-card-1/` (검증 분리 목적) |

### 1.2 사용자 경험 목표

1차 사용자는 최종 고객이 아니라 **내부 검증 담당자(QA/운영자)** 다(기획 §2). UX 목표:

1. **한눈에 재사용 성공 확인** — 화면 진입 즉시(로딩 스피너·지연 없이) 요약 배너 1개 + 서비스 카드 4개가 원본 `/demo/status`와 **시각적으로 구분 불가능**하게 렌더되어, 코드 리딩 없이 "재사용 계약이 지켜졌다"를 눈으로 확인한다.
2. **상태 위계의 즉각 전달** — 정상(녹)/저하(황)/장애(적) 3색 배지와 요약 배너 좌측 컬러 바로, 가장 심각한 상태(=장애)가 상단 배너에서 먼저 읽힌다.
3. **일관성 = 신뢰** — 새 컨텍스트에서도 동일한 셸(topbar·카드 그림자·pill 배지)이 유지됨을 보여, 향후 검증 항목(2~5/5)이 참조할 "재사용 우선" 시각 선례를 만든다.

---

## 2. 컬러 팔레트

> 전 값은 원본 `src/app/demo/status/styles.css` `:root`(light) / `[data-theme="dark"]`(dark)에서 인용. **신규 색 0건.** dev는 이 값들을 자체 `styles.css`에 복제하거나 원본 `styles.css`를 상대경로로 직접 `<link>`한다(기획 §5.1, §8).

### 2.1 셸 색 (clock 셸 복제)

| 역할 | 토큰 | Light | Dark |
|---|---|---|---|
| 캔버스 배경 | `--color-bg-canvas` | `#fafaf9` | `#0f1115` |
| 표면(카드/배너/topbar) | `--color-bg-surface` | `#ffffff` | `#171a21` |
| 서브 배경 | `--color-bg-subtle` | `#f1f1ef` | `#1e222b` |
| 기본 테두리 | `--color-border-default` | `#e5e5e2` | `#262b36` |
| 강조 테두리 | `--color-border-strong` | `#d0d0cc` | `#3a4150` |
| 본문 텍스트 | `--color-text-primary` | `#1a1a19` | `#e8e8e4` |
| 보조 텍스트 | `--color-text-secondary` | `#6b6b66` | `#9a9a93` |
| 흐린 텍스트 | `--color-text-muted` | `#9a9a93` | `#6b6b66` |
| 액센트 | `--color-accent` | `#3563e9` | `#5b82f0` |
| 포커스 링 | `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` |

### 2.2 상태 시맨틱 3색 (kanban 값으로 통일 — 핵심 축)

| 상태 | 토큰 | Light | Dark | 의미 |
|---|---|---|---|---|
| 정상 operational | `--color-success` | `#1a7f37` | `#3fb950` | 배지/배너 좌측 바 녹색 |
| 저하 degraded | `--color-warning` | `#9a6700` | `#d29922` | 배지/배너 좌측 바 황색 |
| 장애 outage | `--color-danger` | `#cf222e` | `#f85149` | 배지/배너 좌측 바 적색 |
| 알 수 없음 unknown(폴백) | `--color-neutral` | `#656d76` | `#8b949e` | 미정의 status 폴백 배지 |

### 2.3 배지 전경 헬퍼 (컴포넌트 로컬, 디자인 토큰 아님)

| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--badge-ink` | `#ffffff` | `#0f1115` | pill 배지 위 텍스트/아이콘 색 (배경 대비 확보) |

- **대비 근거**: light 에서 흰 전경(`#ffffff`) × 상태 3색 배경은 모두 WCAG AA(≥4.5:1) 이상. dark 에서는 배경이 밝아지므로 전경을 어두운 캔버스색(`#0f1115`)으로 반전해 대비를 유지한다(원본 `status-badge-BF-855.md` §2.3 승계).
- 테마 적용: `<html data-theme="light|dark">`. dev는 원본 `main.js`의 `initTheme()`(prefers-color-scheme만 반영, 토글·저장 없음)를 그대로 재사용한다.

---

## 3. 타이포그래피

> 전 값은 원본 `styles.css` `:root`의 `--text-*` 토큰(clock 셸 복제). system font stack 기반 — 외부 폰트/CDN 0건(vanilla-static 준수).

### 3.1 폰트 패밀리

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

### 3.2 텍스트 스케일

| 토큰 | 정의(weight size/line-height family) | 적용 요소 |
|---|---|---|
| `--text-h1` | `600 20px/1.3 var(--font-sans)` | topbar 타이틀 `.topbar__title` (= `<h1>`) |
| `--text-h2` | `600 16px/1.3 var(--font-sans)` | 배너 제목 `.summary-banner__title`, 카드 서비스명 `.status-card__name` |
| `--text-label` | `500 14px/1.4 var(--font-sans)` | 상태 배지 `.status-badge` (letter-spacing 0.01em 추가) |
| `--text-body` | `400 15px/1.65 var(--font-sans)` | 카드 설명 `.status-card__desc`, noscript 안내 |
| `--text-caption` | `400 12px/1.4 var(--font-sans)` | 배너 서브라벨 `.summary-banner__sub` |

- 카드 설명은 `word-break: keep-all`(한글 어절 단위 줄바꿈), 서비스명은 `overflow-wrap: anywhere`(긴 식별자 대비) — 원본 규칙 그대로 승계.

---

## 4. 레이아웃

### 4.1 페이지 골격 (원본 `/demo/status`와 100% 동일 구조)

```
<body>  (flex column, bg=canvas)
 ├─ <header class="topbar">           height 56px, 표면 배경, 하단 1px 보더
 │    └─ <h1 class="topbar__title">   "서비스 상태 카드 (Phase 18 검증 1/5)"
 └─ <main class="page">               max-width 720px, 중앙 정렬, padding 32/24
      ├─ <section class="summary-banner summary-banner--{worst}">   전체 요약 1개
      │    ├─ <span class="summary-banner__icon">      상태 아이콘(장식, aria-hidden)
      │    └─ <div class="summary-banner__body">
      │         ├─ <span class="summary-banner__title">   worst 요약 문구
      │         └─ <span class="summary-banner__sub">     "전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2"
      └─ <ul class="status-list">      2열 grid (≤639px 1열)
           └─ <li class="status-card"> × 4
                ├─ <div class="status-card__head">
                │    ├─ <span class="status-card__name">   서비스명
                │    └─ <span class="status-badge status-badge--{status}" role="img">
                │         ├─ <span class="status-badge__icon" aria-hidden>  ●/▲/✕
                │         └─ <span class="status-badge__label">             정상/저하/장애
                └─ <p class="status-card__desc">    설명 문구
```

### 4.2 spacing / radius / shadow (원본 토큰)

| 토큰 | 값 | 주요 용도 |
|---|---|---|
| `--space-1`~`--space-7` | `4 / 8 / 12 / 16 / 24 / 32 / 48 px` | 아래 표 참조 |
| `--radius-lg` | `12px` | 배너·카드 모서리 |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` (dark 0.32) | 배너·카드 그림자 |

레이아웃 spacing 매핑:
- `.page` 패딩: `--space-6 --space-5` (상하 32 / 좌우 24)
- `.summary-banner` 내부 패딩 `--space-5`(24), 아이콘–본문 gap `--space-3`(12), 하단 마진 `--space-6`(32)
- `.status-list` grid gap `--space-4`(16), `grid-template-columns: repeat(2, 1fr)`
- `.status-card` 패딩 `--space-5`(24), 내부 요소 gap `--space-3`(12)
- `.status-badge` 패딩 `--space-1 --space-3`(4/12), `border-radius: 999px`(pill), 아이콘–라벨 gap `--space-2`(8)

### 4.3 breakpoint 별 동작

| 화면폭 | 동작 |
|---|---|
| `≥640px` (기본) | `.status-list` 2열 grid, `.page` 좌우 패딩 24px |
| `≤639px` (모바일) | `.status-list` 1열 스택(`grid-template-columns: 1fr`), `.page` 패딩 `--space-5 --space-4`(24/16) |

- 요약 배너·카드 헤드는 flex라 폭에 따라 자연 축소. 배지는 `flex-shrink: 0`으로 항상 온전히 표시, 서비스명이 먼저 줄바꿈.

### 4.4 원본과의 문구 차이 (구조는 100% 동일, 텍스트만 검증 맥락 반영 — 기획 §4.2)

| 요소 | `/demo/status` (원본) | `/phase18-validation/status-card-1` (본 검증) |
|---|---|---|
| `<title>` | `서비스 상태 · /demo/status` | `서비스 상태 카드 검증 · /phase18-validation/status-card-1` |
| `<h1>` (`.topbar__title`) | `서비스 상태` | `서비스 상태 카드 (Phase 18 검증 1/5)` |
| 그 외 마크업/클래스/색상/접근성 속성 | — | **변경 없음** (재사용 검증 대상) |

---

## 5. 컴포넌트 명세

> 모든 컴포넌트는 원본 `src/app/demo/status/`의 클래스·구조를 재사용한다. props/상태/인터랙션은 원본 `status.js` 파생 로직 계약을 승계한다(신규 구현 금지).

### 5.1 상태 배지 `.status-badge` (핵심 컴포넌트)

| 항목 | 명세 |
|---|---|
| 형태 | pill(`border-radius: 999px`), inline-flex, 아이콘 + 라벨 |
| props (파생) | `serviceName: string`, `status: "operational"｜"degraded"｜"outage"` |
| variant 클래스 | `--operational`(녹) / `--degraded`(황) / `--outage`(적) / `--unknown`(중립, 폴백) |
| 아이콘 | `●`(정상) / `▲`(저하) / `✕`(장애) / `?`(폴백) — `status-badge__icon`, `aria-hidden="true"`(장식) |
| 라벨 | `정상` / `저하` / `장애` / `알 수 없음` — `status-badge__label` |
| 전경색 | `var(--badge-ink)` (light 흰색 / dark 어두운색) |
| 접근성 | `role="img"` + `aria-label="{서비스명} 상태: {라벨}"` (예: `웹 서버 상태: 정상`) |
| 상태(state) | 정적 표시 요소 — hover/active/focus 인터랙션 **없음**(클릭·토글 없음) |

- 미정의 status 폴백: 원본 `isKnownStatus()`가 false면 `status-badge--unknown` + `?` + `알 수 없음`. 현재 fixture는 3-state 고정이라 발생하지 않으나 계약상 명시(기획 §10.4).

### 5.2 서비스 카드 `.status-card`

| 항목 | 명세 |
|---|---|
| 컨테이너 | `<li>`, `id="status-card-{service.id}"`, 표면 배경 + 12px 라운드 + card 그림자 |
| 구조 | `.status-card__head`(서비스명 ↔ 배지, space-between) + `.status-card__desc`(설명 `<p>`) |
| props | `{ id, name, status, description }` (원본 `SERVICES` fixture 항목) |
| DOM 순서 | 서비스명 → 배지 (읽기 순서 = 시각 순서, 기획 §5.2) |
| 상태(state) | 정적 — hover 강조 없음 |

### 5.3 요약 배너 `.summary-banner`

| 항목 | 명세 |
|---|---|
| 역할 | 전체 서비스 중 **가장 심각한 상태**(worst) 1개를 상단에 요약 (다수결 아님) |
| props (파생) | `summarize(SERVICES)` → `{ status(worst), text, counts, total }` |
| variant | `--operational` / `--degraded` / `--outage` → 좌측 4px 컬러 바 + 아이콘 색 |
| 구조 | 아이콘(장식, aria-hidden) + `.summary-banner__body`(제목 + 서브라벨) |
| 제목 | worst 요약 문구 (예: `일부 서비스에 장애가 발생했습니다.`) |
| 서브라벨 | `summarySubline()` → `전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2` |
| 접근성 | `aria-label="전체 서비스 상태 요약"` |

- 현재 fixture(web=정상, api=정상, database=저하, auth=장애)의 worst = **outage** → 배너는 `--outage`(적색 바)로 렌더된다.

### 5.4 topbar / noscript

| 컴포넌트 | 명세 |
|---|---|
| `.topbar` | height 56px, 표면 배경, 하단 1px 보더. 우측 컨트롤(테마 토글 등) **없음** — 범위 밖 |
| `<noscript>` | `.noscript-note` 안내 문구 표시 — JS 비활성 폴백(기획 §6.2-4). 문구는 검증 맥락 반영 가능하나 원본 패턴 유지 |

---

## 6. dev 구현 가이드

> 대상 파일: `src/app/phase18-validation/status-card-1/` (후속 dev task 신규 생성). 본 명세는 계약이며, 최종 파일 분할은 dev 재량(기획 §8).

### 6.1 재사용 원칙 (Simplicity First — 신규 발명 금지)

1. **CSS**: 원본 `src/app/demo/status/styles.css`의 `:root`/`[data-theme]` 토큰 + 컴포넌트 규칙을 **그대로 복제**하거나, 상대경로로 원본 `styles.css`를 `<link>`한다. 신규 색상 리터럴 추가 금지(§2, 기획 §5.3-1).
2. **JS 로직**: 자체 fixture·파생 함수를 재구현하지 말고 `../../demo/status/status.js`를 상대경로 `import`한다. DOM 바인딩(`createBadge`/`createCard`/`renderSummary`/`renderList`)만 신규 작성하거나 원본 `main.js` 패턴을 답습한다(기획 §5.1, §8).
3. **마크업**: §4.1 골격을 동일 클래스명으로 재현. `<title>`·`<h1>` 문구만 §4.4 기준 변경.

### 6.2 단계별 지침

1. `src/app/phase18-validation/status-card-1/index.html` 생성 — 원본 `index.html` 복제 후 `<title>`·`<h1>` 문구만 §4.4로 교체. 컨테이너 `#summary-banner`·`#status-list`·`<noscript>` 유지.
2. `styles.css` — 원본 토큰/컴포넌트 규칙 복제(권장) 또는 원본 `styles.css` 상대참조. 클래스명(`topbar` / `page` / `summary-banner` / `status-list` / `status-card` / `status-badge` 및 하위 요소) 변경 금지.
3. `main.js` — `../../demo/status/status.js`에서 `SERVICES, summarize, summarySubline, statusLabel, statusIcon, isKnownStatus, badgeAriaLabel` import. `initTheme()` → `renderSummary()` → `renderList()` 순으로 로드 시 1회 렌더. `setInterval`/`fetch` 등 금지(기획 §7).
4. 정적 검사 통과 확인: `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|setTimeout|https?://" src/app/phase18-validation/status-card-1/*` → 매치 0건(자체 상대경로 리소스 제외).

### 6.3 권장 CSS 변수명 / 클래스명 (원본과 동일 — 신규 없음)

- 토큰: `--color-bg-canvas`, `--color-bg-surface`, `--color-border-default`, `--color-text-primary/secondary/muted`, `--color-success/warning/danger/neutral`, `--badge-ink`, `--space-1`~`--space-7`, `--radius-lg`, `--shadow-card`, `--text-h1/h2/label/body/caption`
- 클래스: `topbar` / `topbar__title` / `page` / `summary-banner`(+`--operational|degraded|outage`) / `summary-banner__icon|body|title|sub` / `status-list` / `status-card`(+`__head|__name|__desc`) / `status-badge`(+`--operational|degraded|outage|unknown`) / `status-badge__icon|label` / `noscript-note`

### 6.4 색상 하드코딩 규칙

- 색상 리터럴(HEX/rgb)은 `styles.css`의 토큰 정의 블록(`:root`/`[data-theme]`)에만 존재. 컴포넌트 규칙은 반드시 `var(--…)`만 참조(원본 §6.4 승계).

---

## 7. mockup 참조

- **경로**: `docs/design/mockups/status-card-BF-879.html`
- 본 명세 §2 팔레트·§3 타이포·§4 레이아웃·§5 컴포넌트를 그대로 시각화한 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`).
- fixture는 원본 `status.js`의 `SERVICES`(웹 서버·API 게이트웨이·데이터베이스·인증 서비스, 3-state 전부 포함)를 정적으로 반영. worst = outage → 상단 배너 적색.
- Light 테마 기준 렌더. dark 토큰은 §2 표로 명세(mockup은 light 1종 — UX 의도 전달이 목적, dev 산출물과 픽셀 일치 의무 없음).
- mockup은 정적 시각화이며 dev의 실제 산출물이 아니다. dev는 §6 재사용 원칙에 따라 원본 코드를 재사용한다.

---

## Self-critique

PR commit 직전 자기 점검 (dev·reviewer가 받기 전 명세 누락/모호함 검증):

1. **AC 매핑** — BF-881 AC-1(디자인 명세에 시각 토큰·컴포넌트 구조·상태 카드 레이아웃 정의) → §2/§3(토큰)·§4(레이아웃)·§5(컴포넌트)로 충족. AC-2(mockup이 기존 demo 시각 언어와 일관) → §7 + mockup이 원본 토큰 100% 인용으로 충족. ✅
2. **dev 구현 가이드** — §6에 단계별 지침·권장 클래스/변수명·정적 검사 명령·색상 하드코딩 규칙까지 명시. dev가 원본 재사용 경로를 따라갈 수 있음. ✅
3. **기존 요소 보존** — 원본 `src/app/demo/status/*`는 수정 금지(기획 §7.5)임을 §0·§6에서 반복 명시. 본 명세는 신규 색/토큰/컴포넌트 0건으로 회귀 위험 없음. ✅
4. **컴포넌트 매핑** — §5의 각 컴포넌트가 원본 클래스명·`status.js` 파생 함수와 1:1 매핑됨(status-badge/status-card/summary-banner/topbar/noscript). ✅
5. **모호함 flag** — (a) `file://` cross-origin ES 모듈 import 제약 시 dev가 정적 서버 검증으로 축소 또는 파일 복제 선택(기획 §10.1) — 시각 명세 범위 밖, dev 재량. (b) dark 테마 mockup은 미제공(§2 표로만 명세) — light 1종으로 UX 의도 충분 판단. (c) 파일명 BF-879는 AC 리터럴 준수(§0).

---

<!-- bf:pr-summary -->
## 시안 요약 — 서비스 상태 카드 (BF-879, Phase 18 검증 1/5)

기존 `/demo/status`(BF-856)의 **시각 언어를 100% 재사용**하는 디자인 명세. 신규 색상·토큰·컴포넌트 **0건** — Phase 18 검증 네임스페이스에서 재사용 일관성을 시각적으로 증명.

**핵심 축 — 상태 시맨틱 3색 (원본 토큰 인용):**

| 상태 | 토큰 | Light | Dark |
|---|---|---|---|
| 정상 | `--color-success` | `#1a7f37` | `#3fb950` |
| 저하 | `--color-warning` | `#9a6700` | `#d29922` |
| 장애 | `--color-danger` | `#cf222e` | `#f85149` |

**컴포넌트**: `summary-banner`(worst 상태 요약, 좌측 컬러 바) · `status-card`(2열 grid, ≤639px 1열) · `status-badge`(pill, `role="img"` + `aria-label="{서비스명} 상태: {라벨}"`) — 전부 원본 클래스 재사용.

**산출물**: `docs/design/status-card-BF-879.md`(명세) + `docs/design/mockups/status-card-BF-879.html`(mockup). dev는 원본 `styles.css` 토큰 복제 + `../../demo/status/status.js` import 재사용.
<!-- /bf:pr-summary -->
