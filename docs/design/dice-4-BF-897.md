# 주사위 통계 검증 페이지(dice-4) 디자인 명세 — BF-897 (Phase 18 검증 4/5)

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-899 (본 designer task) · BF-897 (상위 Epic) · BF-898 (planner 산출물)
> 검증 대상 라우트: `/phase18-validation/dice-4` (= 저장소 최상위 `phase18-validation/dice-4/`)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CSS 변수 자체 정의(원본 토큰 복제)
> 재사용 원본(수정 금지): `dice/`(BF-446/448/450) — `index.html`/`styles.css`/`main.js`/`storage.js`
> 기획 SSOT: `docs/planning/dice-4-BF-897.md` (planner [박기획] · BF-898)
> mockup 참조: `docs/design/dice-4-mockup.html` (본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제

본 문서는 planner 명세(`docs/planning/dice-4-BF-897.md`)를 시각 디자인으로 구체화한 **designer 산출물**이다. 코드 구현은 후속 dev task 담당이며, 본 문서는 컬러/타이포/레이아웃/컴포넌트 토큰과 dev 구현 가이드까지만 정의한다.

**핵심 디자인 원칙 — "재사용, 발명 아님"**: dice-4 는 신규 시각 언어를 만드는 페이지가 아니라, 이미 병합된 `dice/`(BF-448/450)의 **통계 카드 시각 계약이 새 경로에서 손실 없이 재현되는지**를 검증하는 페이지다. 따라서 본 명세의 컬러·타이포·컴포넌트 토큰은 **전부 `dice/styles.css` `:root` 값을 그대로 복제**하며 신규 색상 리터럴을 0건으로 유지한다(planner §5.1, §5.4-1).

**범위 축소(planner §0 가정 3 승계)**: 원본 `dice/` 의 히스토리 카드·전체삭제 모달·`localStorage` 영속화는 **본 검증 페이지에서 제외**한다. 화면은 **① 주사위 카드(개수 선택 + 주사위 표시 + 굴리기 CTA) + ② 통계 카드(합계/평균/최대)** 2개 카드만으로 구성된다.

**경로 관련 참고**: 본 task 의 File Ownership 이 산출물 파일명을 `docs/design/dice-4-BF-897.md`(BF-897 = 상위 Epic 번호, planner 문서와 동일 규약) 및 `docs/design/dice-4-mockup.html`(`docs/design/counter-mockup.html` 선례와 동일 패턴)로 명시 지정했으므로 그대로 따른다.

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
| 신규 화면 | `phase18-validation/dice-4/` — 주사위 통계 검증 페이지 (2-카드 세로 스택) |
| 재사용 원본 | `dice/`(BF-448/450) — 토큰 전체 + `.topbar`/`.page`/`.card`/`.dice-*`/`.roll-button`/`.stats-card`/`.stat-row` 컴포넌트 |
| 신규 시각 요소 | **없음** — 배치(2-카드 축소 스택)만 원본(4-카드)에서 줄임. 신규 색/폰트/컴포넌트 0건 |
| 제외(원본 대비) | 히스토리 카드, 전체삭제 모달, 키보드 힌트 문구(선택), `localStorage` 영속화 |
| 테마 default | **다크**(`data-theme="dark"`) — 원본 `dice/` default 승계(planner §4.4) |

### 1.2 사용자 경험 목표

- **QA/운영자가 화면 진입 + 굴리기 1회만으로** 통계 카드(합계/평균/최대)가 원본과 동일한 시각 언어로 렌더됨을 즉시 확인(planner §2-1).
- 초기 렌더 시 통계 3종이 `--` placeholder(muted 색)로 표시되어 "아직 굴리지 않음" 상태가 명확히 구분된다.
- 굴리기 후 합계는 대형 accent(rose) 숫자로 강조되고, 평균/최대는 보조 mono 숫자로 표시되어 **정보 위계**가 원본과 동일하게 유지된다.
- 라이트/다크 어느 테마에서도 카드·텍스트·accent 대비가 원본 토큰 그대로 보존된다.

---

## 2. 컬러 팔레트

> **전량 `dice/styles.css` `:root` / `[data-theme="light"]` 복제.** 신규 HEX 0건. dev 는 값을 복제하거나 원본 `styles.css` 를 상대경로로 직접 참조해도 무방(planner §5.1).

### 2.1 다크 테마 (default)

| 역할 | 토큰 | HEX | 용도 |
|---|---|---|---|
| background (canvas) | `--color-bg-canvas` | `#0d1117` | 페이지 배경 · 주사위 타일 안쪽 |
| background (surface) | `--color-bg-surface` | `#161b22` | 카드 2개 배경 · topbar |
| background (subtle) | `--color-bg-subtle` | `#1f2530` | 개수 선택 group 배경 |
| border | `--color-border-default` | `#262c36` | 카드/타일/stat-row 구분선 |
| border (강) | `--color-border-strong` | `#3a4150` | ghost 버튼 테두리 |
| text (primary) | `--color-text-primary` | `#e8e8e4` | 타이틀 · 평균/최대 값 |
| text (secondary) | `--color-text-secondary` | `#9a9a93` | stat 라벨 · 개수 legend |
| text (muted) | `--color-text-muted` | `#6b6b66` | `--` placeholder 값 |
| **accent** | `--color-accent` | `#fb7185` (rose-400) | 굴리기 CTA · 선택된 개수 · 합계 값 |
| accent hover | `--color-accent-hover` | `#fda4af` | CTA hover |
| accent active | `--color-accent-active` | `#f43f5e` | CTA press |
| accent on | `--color-accent-on` | `#0d1117` | accent 위 텍스트 |
| focus ring | `--color-focus-ring` | `rgba(251,113,133,0.55)` | 키보드 포커스 |
| 합계 accent | `--color-sum-accent` | `#fb7185` | 합계 대형 숫자 |
| roll glow | `--color-roll-glow` | `rgba(251,113,133,0.4)` | CTA 그림자 |

### 2.2 라이트 테마 (`[data-theme="light"]`)

| 역할 | 토큰 | HEX |
|---|---|---|
| background (canvas) | `--color-bg-canvas` | `#fafaf9` |
| background (surface) | `--color-bg-surface` | `#ffffff` |
| background (subtle) | `--color-bg-subtle` | `#f1f1ef` |
| border | `--color-border-default` | `#e5e5e2` |
| text (primary) | `--color-text-primary` | `#1a1a19` |
| text (secondary) | `--color-text-secondary` | `#6b6b66` |
| text (muted) | `--color-text-muted` | `#9a9a93` |
| **accent** | `--color-accent` / `--color-sum-accent` | `#e11d48` (rose-600) |
| accent hover | `--color-accent-hover` | `#be123c` |
| accent active | `--color-accent-active` | `#9f1239` |
| focus ring | `--color-focus-ring` | `rgba(225,29,72,0.45)` |

> 다크→라이트 전환 시 accent 가 rose-400(#fb7185) → rose-600(#e11d48) 로 자동 대비 보정된다(원본 토큰 규칙 승계).

---

## 3. 타이포그래피

> 전량 `dice/styles.css` `:root` 토큰 복제. 신규 font-family/weight/size 0건.

| 요소 | 토큰 | 값 (weight size/line-height family) |
|---|---|---|
| 페이지 타이틀(H1) | `--text-h1` | `600 20px/1.3` sans |
| 주사위 이모지(≥640px) | `--text-dice` | `400 5rem/1` emoji |
| 주사위 이모지(<640px) | `--text-dice-sm` | `400 4rem/1` emoji |
| **합계 값(강조)** | `--text-sum` | `300 3rem/1` **mono** |
| 평균/최대 값 | `--text-stat` | `500 1.25rem/1.2` mono |
| stat 라벨 · 개수 legend | `--text-stat-label` | `500 12px/1.4` sans · `letter-spacing 0.06em` · uppercase |
| 굴리기 CTA | `--text-roll-cta` | `600 18px/1` sans |
| 버튼 | `--text-button` | `500 14px/1` sans |
| 본문 | `--text-body` | `400 15px/1.65` sans |

**폰트 스택**:
- `--font-sans`: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif`
- `--font-mono`: `ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace`
- `--font-emoji`: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", …`

> 숫자 값은 모두 `font-variant-numeric: tabular-nums` 로 자릿수 흔들림을 방지(원본 승계).

---

## 4. 레이아웃

### 4.1 페이지 구조 (원본 4-카드 → 검증용 2-카드 축소)

```
<body> (다크 default)
 ├─ <header class="topbar">              56px 고정 — 타이틀 "주사위 통계 검증" + 테마 토글
 └─ <main class="page">                  세로 flex · 중앙 정렬 · gap 24px(--space-5)
     ├─ <section class="card dice-card">          ← 주사위 조작 영역
     │   ├─ <fieldset class="dice-count">          개수 선택 1~5 (radiogroup)
     │   ├─ <div class="dice-box" id="dice-box">   주사위 타일 (min-height 96px)
     │   └─ <button class="roll-button">           🎲 굴리기 CTA
     └─ <section class="card stats-card">          ← 검증 핵심 대상
         ├─ 합계 (stat-row--sum, 대형 accent)
         ├─ 평균 (stat-row)
         └─ 최대 (stat-row)
```

> ❌ 원본에 있던 `history-card`, `modal-backdrop`, `kbd-hint` 는 제외(planner §5.3). 카드 스택이 4개→2개로 줄어 세로 길이가 짧아진다.

### 4.2 spacing (토큰 복제)

| 위치 | 값 |
|---|---|
| topbar 높이 | `56px` |
| topbar 좌우 패딩 | `--space-5` (24px) |
| page 패딩(데스크톱) | `--space-7 --space-5` (48px 24px) |
| page 패딩(≤639px) | `--space-5 --space-4` (24px 16px) |
| 카드 간 gap | `--space-5` (24px) |
| dice-card 내부 패딩/gap | `--space-6` (32px) / `--space-5` (24px) |
| stats-card 내부 패딩 | `--space-4 --space-6` (16px 32px) |
| stat-row 상하 패딩 | `--space-3` (12px) |
| 카드 최대 폭 | `520px` (`max-width`, 원본 승계) |

### 4.3 breakpoint 별 동작 (원본 미디어쿼리 승계)

| breakpoint | 변화 |
|---|---|
| ≥640px (데스크톱) | 주사위 타일 96×96px · 이모지 5rem · CTA min-width 200px · 카드 520px 중앙 |
| ≤639px (모바일) | 주사위 타일 80×80px · 이모지 4rem · CTA 전폭(min-width 100%) · 카드/page 패딩 축소 |
| ≤359px (소형) | 주사위 타일 72×72px · CTA 높이 48px |

- 주사위 개수 2개 이상일 때 `.dice-box` 는 `flex-wrap: wrap` 으로 자동 줄바꿈(원본 승계) — 5개 선택 시 좁은 화면에서 2줄로 감싸짐.

---

## 5. 컴포넌트 명세

각 컴포넌트는 원본 `dice/` 마크업/클래스를 **그대로 복제**한다. 아래는 dev 가 재현할 DOM 구조·상태·인터랙션 계약이다.

### 5.1 topbar

| 항목 | 값 |
|---|---|
| 클래스 | `.topbar` > `.topbar__title` + `.topbar__actions` |
| 타이틀 텍스트 | **"주사위 통계 검증"** (원본 "주사위" → 검증 맥락 반영, planner §8) |
| 테마 토글 | `<button class="btn btn--ghost" id="theme-toggle" aria-label="테마 전환">` · 다크=🌙 / 라이트=☀️ |
| 상태 | 없음(정적) · hover 시 `--color-bg-subtle` 배경 |

### 5.2 주사위 개수 선택 (`.dice-count`)

| 항목 | 값 |
|---|---|
| 구조 | `<fieldset class="dice-count">` > `<legend>개수</legend>` + `<div role="radiogroup">` > 5× `<button role="radio">` |
| 값 | 1 / 2 / 3 / 4 / 5 (default **2** 선택) |
| props(dev) | `data-count="{n}"` · `role="radio"` · `aria-checked="true|false"` |
| 상태 | 선택됨: `aria-checked="true"` → accent 배경 + `--color-accent-on` 텍스트 / 비선택 hover: `--color-bg-canvas` 배경 |
| 인터랙션 | 클릭 시 해당 개수로 전환 → **현재 통계 초기화**(`--` 로 리셋, 개수-굴림 mismatch 방지, planner §4.3) → 주사위 타일 개수 갱신 |

### 5.3 주사위 표시 (`.dice-box`)

| 항목 | 값 |
|---|---|
| 구조 | `<div class="dice-box" id="dice-box" role="group" aria-label="주사위 결과">` > n× `<span class="dice" role="img" aria-label="주사위 {값}">` |
| 초기 렌더 | default 개수(2) 만큼 `⚀`(1 눈) 타일 표시 |
| 굴림 후 | 각 타일이 `⚀⚁⚂⚃⚄⚅`(1~6) 이모지로 갱신 |
| 상태 | 굴림 중: `.dice-box.is-rolling` → `dice-wiggle` 애니메이션(360ms) / `prefers-reduced-motion` 시 애니메이션 없이 즉시 최종값(원본 승계) |
| 인터랙션 | 굴리기 버튼 클릭 시에만 값 변경 |

### 5.4 굴리기 CTA (`.roll-button`)

| 항목 | 값 |
|---|---|
| 구조 | `<button class="roll-button" id="btn-roll" aria-label="주사위 굴리기">🎲 굴리기</button>` |
| 스타일 | accent 배경 · `--color-accent-on` 텍스트 · `--text-roll-cta` · 높이 56px · `--shadow-roll` glow |
| 상태 | hover: accent-hover + `translateY(-1px)` / active·`.is-pressed`: accent-active + `scale(0.95)` / disabled(굴림 중): `opacity 0.6` + `cursor: progress` |
| 인터랙션 | 클릭 → `rollOne()` × 개수 → `computeStats()` → 주사위 타일 + 통계 카드 **동일 커밋 시점 갱신**(planner §6.2-3) · 굴림 중 연타 방지(`isRolling` 플래그, 원본 승계) |

### 5.5 통계 카드 (`.stats-card`) — 검증 핵심

| 항목 | 값 |
|---|---|
| 구조 | `<section class="card stats-card" aria-labelledby="stats-title">` > `<h2 id="stats-title" class="sr-only">현재 굴림 통계</h2>` + 3× `.stat-row` |
| 합계 row | `.stat-row.stat-row--sum` > `.stat-row__label`("합계") + `.stat-row__value.stat-row__value--sum#stat-sum` · **대형 accent mono**(`--text-sum`, `--color-sum-accent`) |
| 평균 row | `.stat-row` > 라벨("평균") + `.stat-row__value#stat-avg` · mono `--text-stat` |
| 최대 row | `.stat-row` > 라벨("최대") + `.stat-row__value#stat-max` · mono `--text-stat` |
| row 구분선 | 각 row 하단 `1px solid --color-border-default`, 마지막 row 는 없음 |
| **초기 상태** | `.stats-card.is-empty` → 3종 값 모두 `--` + `--color-text-muted` |
| **굴림 후** | 합계=정수합 · 평균=`.toFixed(1)`(소수 1자리) · 최대=정수 최댓값 (planner §4.2) |
| props(dev) | 값 span 에 `aria-label`("합계"/"평균"/"최대") 부여, 값은 tabular-nums |

**표시 규칙표**(planner §4.2 승계):

| 상태 | `#stat-sum` | `#stat-avg` | `#stat-max` |
|---|---|---|---|
| 굴림 전(초기) | `--` | `--` | `--` |
| 굴림 후 | 정수 합 | `.toFixed(1)` | 정수 최댓값 |
| 개수=1 굴림 | rolls[0] | rolls[0].toFixed(1) | rolls[0] (셋 동일 — 정상, planner §10.1) |

### 5.6 제외 컴포넌트 (원본 대비 — 재현 금지)

| 컴포넌트 | 원본 위치 | 처리 |
|---|---|---|
| 히스토리 카드 | `.history-card` / `#history-list` | **제외** (planner §5.3) |
| 전체삭제 모달 | `.modal-backdrop` / `#modal-backdrop` | **제외** |
| 키보드 힌트 문구 | `.kbd-hint` | dev 재량(선택) — 단축키 구현 시에만 표기, 필수 아님(planner §5.3, §13-3) |
| `localStorage` 영속화 | `dice/storage.js` | **제외** — `bf-theme` 테마 키만 예외 유지(planner §3.4) |

---

## 6. dev 구현 가이드

> 후속 dev task 가 `phase18-validation/dice-4/` 를 구현할 때 따라할 단계별 지침. 원본 `dice/` 를 그대로 import 하지 말고(§6.4 이유) 산식·마크업을 복제 재구현한다.

### 6.1 파일 구조(planner §8 승계)

| 파일 | 역할 |
|---|---|
| `phase18-validation/dice-4/index.html` | 마크업(§5) · `<title>주사위 통계 검증</title>` · head 인라인 테마 부트스트랩(다크 default) |
| `phase18-validation/dice-4/styles.css` | `dice/styles.css` 토큰 + 사용 컴포넌트 규칙 복제 — **히스토리/모달 관련 규칙은 복제 제외** |
| `phase18-validation/dice-4/stats.js` | 순수 로직 `rollOne`·`computeStats`(IIFE/UMD, `node --test` 대상) |
| `phase18-validation/dice-4/main.js` | DOM 바인딩(개수 선택·굴리기·통계 렌더) — `stats.js` 사용 |

### 6.2 CSS 변수명 (그대로 사용 — 신규 정의 금지)

- 색상: §2 표의 `--color-*` 전체 복제
- spacing: `--space-1`~`--space-8`
- radius: `--radius-sm/md/lg/dice`
- shadow: `--shadow-card`, `--shadow-roll`, `--shadow-roll-active`
- motion: `--motion-press/fast/mid/roll`, `--ease-out`, `--scale-press`
- typography: `--text-h1/dice/dice-sm/sum/stat/stat-label/roll-cta/button/body/caption`

### 6.3 클래스명 (원본 재사용 — 신규 클래스 최소화)

`.topbar` · `.topbar__title` · `.topbar__actions` · `.btn` · `.btn--ghost` · `.page` · `.card` · `.dice-card` · `.dice-count` · `.dice-count__legend` · `.dice-count__group` · `.dice-count__btn` · `.dice-box` · `.dice` · `.roll-button` · `.stats-card` · `.stat-row` · `.stat-row--sum` · `.stat-row__label` · `.stat-row__value` · `.stat-row__value--sum` · `.sr-only`

> ✅ 신규 배치 클래스가 필요하면 최소화. 원칙적으로 원본 `.page`(세로 스택)가 그대로 2-카드를 처리하므로 신규 배치 클래스는 불필요.

### 6.4 로직 재구현 제약 (planner §5.2)

원본 `dice/main.js` 는 IIFE 클로저로 `rollOne`/`computeStats` 를 캡슐화해 외부로 `export` 하지 않는다. dev 는 이를 `import` 할 수 없고 `stats.js` 에 **동일 산식으로 재작성**한다:

```js
// phase18-validation/dice-4/stats.js — dice/main.js 동일 산식 복제
function rollOne() { return 1 + Math.floor(Math.random() * 6); }        // 1~6 정수
function computeStats(rolls) {
  var sum = 0, max = rolls[0];
  for (var i = 0; i < rolls.length; i += 1) {
    sum += rolls[i];
    if (rolls[i] > max) max = rolls[i];
  }
  return { sum: sum, avg: sum / rolls.length, max: max };              // 표시 시 avg.toFixed(1)
}
```

### 6.5 단계별 순서

1. `index.html` — head 인라인 테마 부트스트랩(`bf-theme` 없으면 다크) → topbar → dice-card(개수/타일/CTA) → stats-card(3 row). **히스토리/모달/kbd-hint 마크업 미포함.**
2. `styles.css` — `:root`/`[data-theme="light"]` 토큰 복제 + §6.3 사용 컴포넌트 규칙 복제(히스토리/모달 규칙 제외) + `@media` 반응형 복제.
3. `stats.js` — §6.4 두 함수 + `module.exports`(node 테스트 노출) IIFE/UMD 패턴.
4. `main.js` — DOM 참조, 개수 클릭 핸들러(전환 + 통계 리셋 + 타일 재렌더), 굴리기 핸들러(굴림 → computeStats → 렌더, `.is-empty` 토글, `isRolling` 연타 방지, `.toFixed(1)` 표시), 테마 토글.
5. 검증: `grep` 정적 검사(fetch/인증 코드 0건, planner §7.6) + `node --test tests/dice-4-*.test.js`(산식 정확성).

### 6.6 기존 요소 보존 확인

- `dice/*` 원본 파일은 **절대 수정 금지**(planner §7.5) — 본 페이지는 별도 디렉터리에 복제.
- `package.json` 신규 dependency 0건, 외부 CDN 0건(planner §7.4).

---

## 7. mockup 참조

- **파일**: `docs/design/dice-4-mockup.html` (본 명세와 함께 작성한 시각 mockup)
- **내용**: 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). 아래 프레임을 갤러리로 표현:
  1. **데스크톱 · 다크(default)** — 굴림 후 상태(주사위 2개 `⚄⚂` + 통계 합계 8 / 평균 4.0 / 최대 5)
  2. **데스크톱 · 라이트** — 초기 상태(주사위 placeholder + 통계 `--` 3종, `.is-empty`)
  3. **모바일 360px · 다크** — 5개 선택 시 wrap + 전폭 CTA
  4. **anatomy 패널** — 카드 위→아래 요소 설명
  5. **재사용 토큰 매핑 표** — 신규 색 0건 근거 시각화
- mockup 의 컬러/타이포/레이아웃은 §2~§5 명세와 동기화되어 있으며, dev 는 이를 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없다(UX 의도 전달이 핵심).
- placeholder 콘텐츠(굴림 값 예시)는 시각화 목적이며 실제 무작위 값과 무관하다.

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-899 수용 기준 매핑

| 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세 확정, When 디자인 명세 작성, Then 레이아웃·컬러·컴포넌트 토큰이 기존 SPA 와 일관 정의 | §2(컬러 전량 복제)·§3(타이포 전량 복제)·§4(레이아웃 원본 승계)·§5(컴포넌트 원본 복제) — 신규 토큰 0건 |
| Given mockup HTML, When 브라우저로 열면, Then dice-4 통계 화면이 명세대로 시각화 | §7 mockup 이 §2~§5 를 다크/라이트/모바일 3프레임으로 시각화 |

### 8.2 Self-critique (dev 인수 전 자체 점검)

1. **AC 매핑**: 두 AC 모두 §2~§7 로 매핑 완료(§8.1). ✅
2. **dev 구현 가이드 구체성**: CSS 변수명(§6.2)·클래스명(§6.3)·파일별 역할(§6.1)·단계 순서(§6.5)·로직 코드 스니펫(§6.4) 제공. ✅
3. **기존 요소 보존**: `dice/*` 원본 수정 금지 + 별도 디렉터리 복제 명시(§6.6). 원본 토큰 전량 복제로 시각 일관성 보존. ✅
4. **컴포넌트 매핑**: topbar/개수선택/주사위/CTA/통계카드 5개 컴포넌트 각각 DOM 구조·props·상태·인터랙션 정의(§5). 제외 컴포넌트도 명시(§5.6). ✅
5. **모호함 flag**:
   - ⚠️ **mockup 경로**: 본 task File Ownership 은 `docs/design/dice-4-mockup.html` 로 지정했으나, designer 페르소나 기본 규약은 `docs/design/mockups/<topic>-<JIRA-KEY>.html` 을 요구한다. system 자동 screenshot capture(`captureDesignerMockups`)가 `docs/design/mockups/` 만 검사한다면 본 파일은 자동 캡처 대상에서 누락될 수 있다. **File Ownership 을 우선 준수**했으나(task 별 하드 제약), 운영자가 자동 캡처 임베드를 원하면 경로 재지정이 필요하다.
   - ⚠️ **키보드 단축키/힌트 표기**: planner §13-3 대로 dev 재량으로 열어둠. 원본과 동일한 키보드 조작성이 요구되면 §5.6 개정 필요.
   - ⚠️ **파일명 티켓 번호**: 본 task 는 BF-899 이나 File Ownership 이 파일명을 `dice-4-BF-897.md`(Epic 번호)로 지정 — planner 문서(`dice-4-BF-897.md`)와 동일 규약이라 그대로 따름.

---

*문서 종료 — [이디자인] · BF-899*
