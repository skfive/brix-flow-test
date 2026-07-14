# Release Readiness Board — 디자인 명세 (BF-815)

> 작성자: [이디자인] · 작성일 2026-07-14
> 관련 티켓: BF-817 (designer task) · BF-816 (planner task) · BF-815 (부모 Epic)
> 대상 모듈: `release-readiness/`
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 기획 원본: [`docs/plan/release-readiness-BF-815.md`](../plan/release-readiness-BF-815.md)
> 시각 mockup: [`docs/design/mockups/release-readiness-BF-817.html`](./mockups/release-readiness-BF-817.html)
>
> **파일명 안내**: 본 명세 파일명은 BF-817 수용 기준에 리터럴로 명시된 경로(`docs/design/release-readiness-BF-815.md`, Epic 키 기준)를 그대로 따랐다 — 기획 문서(`docs/plan/release-readiness-BF-815.md`, planner task BF-816)와 동일한 규칙. mockup HTML 은 기존 관례대로 designer task 키(BF-817)를 사용한다(`incident-triage-BF-800.md` ↔ `incident-triage-BF-802.html` 사례와 동일).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태 스펙 (focus / hover / empty)](#6-상태-스펙-focus--hover--empty)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조 및 evidence](#8-mockup-참조-및-evidence)
9. [AC ↔ 산출물 매핑 표](#9-ac--산출물-매핑-표)
10. [기획 대비 미결정/확인 필요 항목](#10-기획-대비-미결정확인-필요-항목)

---

## 1. 시안 개요

### 1.1 변경 범위

| 항목 | 내용 |
|------|------|
| 대상 화면 | `release-readiness/index.html` (신규 라우트, 읽기 전용 운영 대시보드) |
| 본 task 산출물 | 디자인 명세 markdown 1건 + 시각 mockup HTML 1건 + desktop/mobile PNG evidence 2건 |
| 본 task 비산출물 | SPA 실제 구현 코드(`index.html`/`style.css`/`fixtures.js`/`board.js`) — dev task 담당 |
| 기존 코드 영향 | 없음 — `docs/design/**` 만 추가 |

### 1.2 사용자 경험 목표

운영자가 이 화면에서 답해야 하는 질문은 **단 하나** — *"지금 릴리즈해도 되는가?"* 시안은 이 질문에 3초 안에 답이 나오도록 정보 계층을 설계한다.

| 우선순위 | 정보 | 시각 처리 |
|----------|------|-----------|
| 1순위 | **릴리즈 가능 여부** (blocked 유무) | 최상단 릴리즈 배너 — 좌측 4px 색 바 + 아이콘 글리프 + 굵은 문구. 화면에서 가장 먼저 읽히는 요소 |
| 2순위 | **전체 진행률** (N/M, P%) | 배너 바로 아래 진행률 바 + 숫자 라벨. 필터와 무관하게 항상 전체 fixture 기준 (기획 §4.2) |
| 3순위 | **상태별 건수** (done/blocked/pending) | 진행률 옆 stat 타일 3개 — 어느 상태에 몇 건이 몰려 있는지 즉시 파악 |
| 4순위 | **개별 항목 탐색** (필터·토글·목록) | 필터 바 → 목록. 좁혀 보는 도구이며, 위 1~3순위 값을 **바꾸지 않는다** |

**핵심 설계 원칙 (기획 §2.2 를 시각 언어로 옮긴 것)**: 필터는 "무엇을 보여줄지"만 바꾼다. 진행률·배너·stat 타일은 필터와 **물리적으로 다른 영역**(요약 패널 = 카드 안, 목록 = 카드 밖)에 배치해, 필터를 걸어도 요약 수치가 변하지 않는 것이 **레이아웃만으로 납득되게** 한다. 운영자가 "QA 필터를 걸었는데 왜 50% 그대로지?"라고 묻지 않도록 하는 것이 이 분리의 목적이다.

### 1.3 시안 톤

- **운영 도구답게 차분하게.** 채도 높은 색은 상태 신호(blocked/done)에만 쓰고, 나머지는 무채색 + 단일 accent(#3563E9)로 억제한다.
- 기존 brix-Flow 운영 화면(`incident-triage`)과 **같은 계열의 토큰 체계**(회색 base + #3563E9 accent + 상태색)를 사용해 제품 내 일관성을 유지한다. 단 CSS 변수는 `--rr-*` 접두사로 **자체 정의**한다 (vanilla-static: 공유 토큰 파일 없음, 모듈 간 변수 충돌 금지).

---

## 2. 컬러 팔레트

### 2.1 Base 토큰

| 토큰 | HEX | 용도 | 대비 |
|------|-----|------|------|
| `--rr-color-bg` | `#F1F3F5` | 페이지 배경 | — |
| `--rr-color-surface` | `#FFFFFF` | 카드/표 배경 | — |
| `--rr-color-surface-muted` | `#F8F9FA` | 표 헤더, 보조 배경 | — |
| `--rr-color-border` | `#DDE1E6` | 기본 경계선 | — |
| `--rr-color-border-strong` | `#8A9199` | 인터랙티브 요소 경계선 (스위치 트랙 등) | 3.1:1 on `#FFFFFF` ✅ (WCAG 2.1 non-text 3:1) |
| `--rr-color-text` | `#1A1D21` | 본문/제목 | 16.1:1 on `#FFFFFF` ✅ |
| `--rr-color-text-muted` | `#5C636A` | 캡션, 보조 텍스트, 표 헤더 | 5.6:1 on `#FFFFFF` ✅ |
| `--rr-color-accent` | `#3563E9` | 선택 칩, 진행률 바 fill, focus ring | 5.2:1 on `#FFFFFF` ✅ / 흰 텍스트 5.2:1 ✅ |
| `--rr-color-accent-hover` | `#2A50C4` | accent hover | 7.0:1 on `#FFFFFF` ✅ |
| `--rr-color-track` | `#E4E7EB` | 진행률 바 트랙 | — |

### 2.2 Status 토큰 (기획 §13.3 대비 요건 충족 — 임의 변경 금지)

각 상태는 **텍스트색 / 배경 tint / 경계선** 3쌍으로 정의한다. 배지는 색 + 한글 라벨 + 글리프 **3중 표기**이므로 색각 이상 사용자도 구분 가능하다 (색 단독 의존 금지, 기획 §13.3).

| status | 글리프 | `--rr-color-{s}` (텍스트) | `--rr-color-{s}-tint` (배경) | `--rr-color-{s}-line` (경계) | 텍스트 대비 (on tint) |
|--------|--------|---------------------------|------------------------------|------------------------------|------------------------|
| `pending` (대기) | `○` | `#475569` | `#F8FAFC` | `#CBD5E1` | 8.0:1 ✅ |
| `blocked` (차단) | `▲` | `#B91C1C` | `#FEF2F2` | `#FECACA` | 6.8:1 ✅ |
| `done` (완료) | `✓` | `#0F7B4F` | `#ECFDF5` | `#A7F3D0` | 4.9:1 ✅ |

> 모두 WCAG 2.1 AA(4.5:1) 충족. `done` 이 4.9:1 로 가장 여유가 적으므로 **`#0F7B4F` 를 더 밝게 조정하지 말 것** (예: `#10B981` 은 2.5:1 로 AA 미달).

### 2.3 릴리즈 배너 토큰 (기획 §4.3 3-state)

| `data-banner-state` | 조건 | 글리프 | 배경 | 좌측 바(4px) | 텍스트 | 대비 |
|---------------------|------|--------|------|--------------|--------|------|
| `blocked` | `blocked > 0` (최우선) | `▲` | `#FEF2F2` | `#B91C1C` | `#7F1D1D` | 9.3:1 ✅ |
| `ready` | `blocked===0 && releaseReady` | `✓` | `#ECFDF5` | `#0F7B4F` | `#065F46` | 7.6:1 ✅ |
| `in-progress` | `blocked===0 && !releaseReady` | `●` | `#EFF6FF` | `#3563E9` | `#1E3A8A` | 10.4:1 ✅ |
| `hidden` | `total === 0` | — | 배너 자체를 `display:none` | — | — | — |

### 2.4 진행률 바 fill 색에 대한 결정 (설계 근거)

진행률 바 fill 은 **차단 여부와 무관하게 항상 accent(`#3563E9`)** 로 칠한다 — blocked 가 있다고 fill 을 빨갛게 바꾸지 않는다.

- 이유: 진행률은 "얼마나 했나"(양)이고, 차단은 "나가도 되나"(가부)다. 서로 다른 축을 같은 그래픽에 겹쳐 칠하면 *"50% 빨강"* 이 진행률이 나쁘다는 뜻인지 차단됐다는 뜻인지 모호해진다.
- 차단 신호는 **배너(1순위) + blocked stat 타일 + 목록 배지** 3곳에서 이미 명확히 전달된다. 기획 §16 EC-08(9/10 done + 1 blocked 인데 긍정 배너로 오인 금지)은 배너 우선순위 규칙으로 이미 방어된다.

---

## 3. 타이포그래피

폰트는 **system stack 만** 사용한다 (vanilla-static: 외부 폰트 CDN·`@font-face` 금지, 기획 §15).

```css
--rr-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--rr-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | 요소 | size | weight | line-height | 비고 |
|------|------|------|--------|-------------|------|
| Page title | `<h1>` | 26px (모바일 22px) | 700 | 1.3 | "Release Readiness" |
| Page lead | `<p class="rr-lead">` | 14px | 400 | 1.5 | `--rr-color-text-muted` |
| Banner text | `#release-banner` | 16px (모바일 15px) | 700 | 1.4 | 상태별 텍스트색 |
| Progress label | `.rr-progress-label` | 15px | 700 | 1.4 | "5/10 완료 (50%)" |
| Stat 값 | `.rr-stat-value` | 22px | 700 | 1.2 | 숫자 |
| Stat 라벨 | `.rr-stat-label` | 12px | 600 | 1.3 | `--rr-color-text-muted`, letter-spacing .02em |
| Section/필터 라벨 | `.rr-filter-label` | 12px | 700 | 1.3 | uppercase 아님(한글), `--rr-color-text-muted` |
| 필터 칩 | `button[data-*-filter]` | 14px | 600 | 1 | |
| 표 헤더 | `<th>` | 12px | 700 | 1.3 | `--rr-color-text-muted` |
| 항목 제목 | `.rr-item-title` | 15px | 600 | 1.45 | `--rr-color-text` |
| Status 배지 | `.rr-badge` | 13px | 700 | 1 | 상태별 텍스트색 |
| Evidence 텍스트 | `.rr-evidence` | 13px | 400 | 1.5 | `--rr-color-text-muted` |
| Evidence 플레이스홀더 | `.rr-evidence--empty` | 13px | 400 | 1.5 | `—` + sr-only "증빙 없음" |
| 빈 상태 제목 | `.rr-empty-title` | 16px | 700 | 1.4 | |
| 빈 상태 설명 | `.rr-empty-desc` | 14px | 400 | 1.5 | `--rr-color-text-muted` |

- 최소 폰트 크기 **12px** — 그 이하 금지 (운영자가 장시간 보는 화면).
- 숫자(진행률/건수)는 `font-variant-numeric: tabular-nums` 적용 — 값이 바뀔 때 자릿수 흔들림 방지.

---

## 4. 레이아웃

### 4.1 spacing / radius 스케일

```css
--rr-space-1: 4px;  --rr-space-2: 8px;  --rr-space-3: 12px;
--rr-space-4: 16px; --rr-space-5: 24px; --rr-space-6: 32px; --rr-space-7: 48px;
--rr-radius-sm: 4px; --rr-radius-md: 8px; --rr-radius-lg: 12px; --rr-radius-pill: 999px;
--rr-shadow-card: 0 1px 2px rgba(16, 24, 40, .06), 0 1px 3px rgba(16, 24, 40, .10);
```

### 4.2 섹션 구조 (위→아래 = 정보 우선순위 §1.2 와 일치)

```
┌─────────────────────────────────────────────────────────┐
│ <header>  h1 "Release Readiness"  +  lead 문구           │
├─────────────────────────────────────────────────────────┤
│ ┌─ 요약 패널 (카드, surface) ─────────────────────────┐ │  ← 필터 영향 없음 (전체 fixture 기준)
│ │ [릴리즈 배너]  ▲ 차단 항목 2건 — 출시 보류          │ │
│ │                                                     │ │
│ │ 진행률 바 ████████░░░░░░░░  5/10 완료 (50%)         │ │
│ │                                                     │ │
│ │ [완료 5]  [차단 2]  [대기 3]   ← stat 타일 3개      │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ┌─ 필터 바 (카드, surface) ───────────────────────────┐ │  ← 목록만 좁힘
│ │ 역할  [전체][기획][디자인][개발][QA][운영]           │ │
│ │ 상태  [전체][대기][차단][완료]                       │ │
│ │ ───────────────────────────────────────────────────  │ │
│ │ [◯━ 완료 항목 숨기기]            [필터 초기화]      │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ aria-live: "총 10건 표시"                                │
│ ┌─ 목록 (카드, surface) ──────────────────────────────┐ │
│ │ 항목 | 역할 | 상태 | 증빙                            │ │
│ │ ─────┼──────┼──────┼─────────────────────────────    │ │
│ │ ...10 rows...                                        │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

- 컨테이너 `max-width: 1040px`, `margin: 0 auto`, 페이지 padding `--rr-space-6` (모바일 `--rr-space-4`).
- 요약 패널 / 필터 바 / 목록은 **각각 독립 카드** — §1.2 의 "요약은 필터 밖" 을 물리적 분리로 표현.
- 카드 간 간격 `--rr-space-5`(24px).

### 4.3 요약 패널 내부

| 요소 | 데스크톱 | 모바일 (≤767px) |
|------|----------|------------------|
| 배너 | 폭 100%, padding 12/16, 좌측 4px 색 바 | 동일 (글자 15px) |
| 진행률 바 | 높이 10px, radius pill, 라벨은 바 **우측**에 인라인 배치 | 라벨을 바 **위**로 이동(세로 스택) |
| stat 타일 | `grid-template-columns: repeat(3, 1fr)`, gap 12px | `repeat(3, 1fr)` 유지 (3개뿐이라 320px 에서도 수용) |

### 4.4 필터 바 내부

- 역할/상태 칩 그룹은 각각 `label + 칩들` 의 가로 행. 칩은 `flex-wrap: wrap`, gap 8px.
- 좁은 화면에서는 **줄바꿈(wrap)** 으로 처리한다 — 가로 스크롤(`overflow-x:auto`)은 채택하지 않는다. 이유: 스크롤은 화면 밖 칩의 존재를 숨겨 "QA 필터가 없네?" 오인을 유발한다. 칩이 최대 6개뿐이라 320px 에서 2~3줄이면 전부 보인다. (기획 §14 에서 "디자이너 재량" 으로 위임된 선택)
- 토글 + 초기화 버튼은 같은 행 양끝 정렬(`justify-content: space-between`), 모바일에서는 세로 스택.
- 필터 바 상단 경계 `1px solid --rr-color-border` 로 칩 영역과 토글 영역 구분.

### 4.5 목록 — 반응형 전환 (기획 §14)

| breakpoint | 레이아웃 |
|------------|----------|
| **≥768px** | `<table>` 유지. 컬럼: 항목(auto) / 역할(96px) / 상태(104px) / 증빙(34%). `<th>` 는 `surface-muted` 배경, 행 구분선 1px. |
| **≤767px** | **카드 스택 전환** — `table, thead, tbody, tr, td { display: block }`, `thead { position:absolute; left:-9999px }`(스크린리더 유지), 각 `<td>` 앞에 `::before { content: attr(data-label) }` 로 라벨 노출. `<tr>` 은 카드(border + radius md + margin-bottom 12px). |

**모바일 카드 1건 구조**:
```
┌──────────────────────────────────┐
│ 회귀 테스트 스위트 전체 통과      │  ← 항목 (라벨 숨김, 제목 자체가 헤드)
│ 역할    QA                        │
│ 상태    ▲ 차단                    │
│ 증빙    회귀 스위트 3건 실패 …    │
└──────────────────────────────────┘
```
- "항목" 셀만 `::before` 라벨을 숨긴다(`.rr-cell-title::before { content: none }`) — 제목이 카드 헤드 역할을 하므로 "항목" 이라는 라벨은 중복 노이즈.
- 320px 에서 가로 스크롤 0 — `word-break: keep-all; overflow-wrap: anywhere` 로 긴 evidence 텍스트 처리.

---

## 5. 컴포넌트 명세

> 아래 `data-*` 속성/시맨틱은 **기획 §9 DOM 계약 = 고정**. 클래스명·시각 스타일만 디자이너 재량이다.

### 5.1 릴리즈 배너 `#release-banner`

| 항목 | 값 |
|------|-----|
| 마크업 | `<div id="release-banner" class="rr-banner" data-banner-state="blocked\|ready\|in-progress\|hidden">` |
| props (dev 가 주입) | `data-banner-state` (§2.3 표), 내부 텍스트(기획 §4.3 문구) |
| 내부 구조 | `<span class="rr-banner-glyph" aria-hidden="true">▲</span><span class="rr-banner-text">차단 항목 2건 — 출시 보류</span>` |
| 상태 | `blocked` / `ready` / `in-progress` / `hidden`(`display:none`) |
| 인터랙션 | 없음 (비인터랙티브 표시 전용) |
| 접근성 | 글리프는 `aria-hidden="true"` (색·모양은 장식, 의미는 텍스트가 전달). 배너 문구 자체가 스크린리더로 읽히면 충분 |

### 5.2 진행률 바 `#progress-bar`

| 항목 | 값 |
|------|-----|
| 마크업 | `<div id="progress-bar" class="rr-progress" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-label="릴리즈 진행률">` |
| props | `aria-valuenow` = `percent`, fill 폭 = `style="width: {percent}%"` |
| 시각 | 트랙 `--rr-color-track` h10 radius pill / fill `--rr-color-accent` radius pill / `transition: width .25s ease` |
| 라벨 (필수 병기) | `<p class="rr-progress-label">5/10 완료 (50%)</p>` — 기획 §18 "텍스트 라벨 항상 병기" |
| `total===0` | 바 숨기고 `<p class="rr-progress-empty">표시할 진행률 없음</p>` 노출 (기획 §12.2) |

### 5.3 Stat 타일 `.rr-stat`

| 항목 | 값 |
|------|-----|
| 마크업 | `<div class="rr-stat" data-stat="done\|blocked\|pending">` → `<span class="rr-stat-value">5</span><span class="rr-stat-label">완료</span>` |
| props | `data-stat` (상태 enum), 값(건수) |
| 시각 | 배경 = 해당 status tint, 경계 = status line, 값 텍스트 = status 텍스트색, padding 12/16, radius md |
| 상태 | 값이 `0` 이어도 타일은 **숨기지 않는다** — "차단 0건" 이 보이는 것 자체가 릴리즈 판단 정보 |
| 인터랙션 | 없음 (v1). 클릭 시 상태 필터 연동은 비범위(기획 §17 정신) |

### 5.4 필터 칩 `button[data-role-filter]` / `button[data-status-filter]`

| 항목 | 값 |
|------|-----|
| 마크업 | `<div class="rr-chip-group" role="group" aria-label="역할 필터"><button class="rr-chip" type="button" data-role-filter="qa" aria-pressed="false">QA</button>…</div> |
| props | `data-role-filter`: `all\|planning\|design\|dev\|qa\|ops` / `data-status-filter`: `all\|pending\|blocked\|done` / `aria-pressed`: `true\|false` |
| 라벨 텍스트 | 기획 §5.3 매핑 그대로 (`전체`/`기획`/`디자인`/`개발`/`QA`/`운영`, `전체`/`대기`/`차단`/`완료`) — 재작성 금지 |
| 기본 (`aria-pressed="false"`) | bg `surface`, border 1px `--rr-color-border`, text `--rr-color-text`, radius pill, padding 8/14 |
| hover | bg `--rr-color-surface-muted`, border `--rr-color-border-strong` |
| **선택 (`aria-pressed="true"`)** | bg `--rr-color-accent`, border `--rr-color-accent`, text `#FFFFFF`, weight 700 |
| 선택+hover | bg `--rr-color-accent-hover` |
| focus-visible | `outline: 2px solid --rr-color-accent; outline-offset: 2px` |
| active | `transform: translateY(1px)` |
| **스타일 훅** | 선택 상태 CSS 는 반드시 **`[aria-pressed="true"]` 속성 선택자**로 작성 — 별도 `.is-active` 클래스를 병행하면 ARIA 와 시각이 어긋날 수 있다 (§7.3) |

### 5.5 완료 숨기기 토글 `#hide-done-toggle`

| 항목 | 값 |
|------|-----|
| 마크업 | `<button id="hide-done-toggle" class="rr-switch" type="button" role="switch" aria-checked="false"><span class="rr-switch-track"><span class="rr-switch-knob"></span></span><span class="rr-switch-text">완료 항목 숨기기</span></button>` |
| props | `aria-checked`: `true\|false` |
| off | 트랙 bg `--rr-color-surface-muted` + 1px `--rr-color-border-strong`(3.1:1 ✅), knob 흰색 좌측 |
| on (`aria-checked="true"`) | 트랙 bg `--rr-color-accent`(5.2:1 ✅), knob 흰색 우측(`transform: translateX(20px)`) |
| 치수 | 트랙 44×24, knob 20×20, `transition: .18s ease` |
| focus-visible | `outline: 2px solid --rr-color-accent; outline-offset: 2px` (버튼 전체 기준) |
| 접근성 | 네이티브 `<button>` → `Enter`/`Space` 기본 동작 (기획 §13.1). `role="switch"` + `aria-checked` 로 상태 전달. **텍스트 라벨이 버튼 안에 포함**되므로 별도 `aria-label` 불필요 |
| 스타일 훅 | `[aria-checked="true"]` 속성 선택자로 on 상태 스타일 작성 (§7.3) |

### 5.6 필터 초기화 버튼 `#reset-filters-btn`

| 항목 | 값 |
|------|-----|
| 마크업 | `<button id="reset-filters-btn" class="rr-btn-ghost" type="button">필터 초기화</button>` |
| 기본 | bg transparent, border 1px `--rr-color-border`, text `--rr-color-text`, radius sm, padding 8/14, 14px/600 |
| hover | bg `--rr-color-surface-muted`, border `--rr-color-border-strong` |
| focus-visible | `outline: 2px solid --rr-color-accent; outline-offset: 2px` |
| 노출 규칙 | 필터 바 안: **항상 노출**. 빈 상태 A 안: 노출(동일 동작). 빈 상태 B: **숨김** (기획 §12.2) — 빈 상태 A/B 의 버튼은 필터 바의 것과 **동일 동작**이며, dev 는 두 위치의 클릭 핸들러를 하나로 공유해도 된다 (§7.5, ID 중복 주의) |

### 5.7 항목 행 `<tr data-id data-role data-status>`

| 항목 | 값 |
|------|-----|
| 마크업 | `<tr class="rr-row" data-id="rr-007" data-role="qa" data-status="blocked">` |
| 셀 | `<td class="rr-cell-title" data-label="항목">` / `<td data-label="역할">` / `<td data-label="상태">` / `<td data-label="증빙">` |
| 제목 | `.rr-item-title` 15px/600 |
| 역할 | 한글 라벨 (기획 §5.3) — 배지 아님, 평문 텍스트 |
| 상태 | `.rr-badge` (§5.8) |
| 증빙 (있음) | `.rr-evidence` 13px muted, `overflow-wrap: anywhere` |
| 증빙 (빈 문자열) | `<span class="rr-evidence rr-evidence--empty" aria-hidden="true">—</span><span class="sr-only">증빙 없음</span>` (기획 §5.2, §13.2, EC-06) |
| hover (≥768px) | 행 배경 `--rr-color-surface-muted` — 가로 스캔 보조 |
| 인터랙션 | 행 클릭 없음 (읽기 전용, 드릴다운은 기획 §17 비범위) |

### 5.8 Status 배지 `.rr-badge`

| 항목 | 값 |
|------|-----|
| 마크업 | `<span class="rr-badge" data-status="blocked"><span class="rr-badge-glyph" aria-hidden="true">▲</span>차단</span>` |
| props | `data-status`: `pending\|blocked\|done` |
| 시각 | §2.2 토큰 (tint 배경 + line 경계 + status 텍스트색), radius pill, padding 4/10, 13px/700, `display:inline-flex; gap:4px; white-space:nowrap` |
| **색 비의존 3중 표기** | ① 색 ② 한글 라벨(대기/차단/완료) ③ 글리프(○/▲/✓) — 기획 §13.3 (색 단독 구분 금지) |
| 글리프 | `aria-hidden="true"` — 의미는 한글 라벨이 전달하므로 스크린리더에서 중복 낭독 방지 |

### 5.9 결과 개수 announcer `.rr-live`

| 항목 | 값 |
|------|-----|
| 마크업 | `<p class="rr-live" aria-live="polite">총 10건 표시</p>` |
| 갱신 | 필터/토글/초기화로 목록이 바뀔 때마다 문구 갱신 (기획 §13.2) |
| 시각 | 13px muted, 목록 카드 바로 위. **시각적으로도 노출**한다(sr-only 아님) — 필터 결과 건수는 마우스 사용자에게도 유용 |
| 빈 상태 A | "총 0건 표시" |
| 빈 상태 B | announcer 숨김 (표시할 목록 자체가 없음) |

---

## 6. 상태 스펙 (focus / hover / empty)

### 6.1 focus (키보드) — 기획 AC-13 / §13.1

- **모든 인터랙티브 요소**(역할 칩 6 + 상태 칩 4 + 토글 + 초기화 버튼)는 네이티브 `<button>`. `tabindex` 임의 지정 금지.
- Tab 순서 = DOM 순서: **역할 필터 → 상태 필터 → 완료 숨기기 토글 → 필터 초기화 → 목록**.
- focus ring **단일 규칙**: `outline: 2px solid var(--rr-color-accent); outline-offset: 2px;` — `:focus-visible` 에만 적용(마우스 클릭 시 링 미노출).
- `outline: none` **절대 금지** (대체 스타일 없이 제거 시 키보드 사용자 실명).
- 선택된 칩(accent 배경) 위에서도 `outline-offset: 2px` 덕분에 링이 배경과 겹치지 않아 식별 가능.

### 6.2 hover (마우스)

| 요소 | hover 처리 |
|------|------------|
| 칩 (미선택) | bg `surface-muted` + border `border-strong` |
| 칩 (선택) | bg `accent-hover` |
| 토글 | 트랙 border `border-strong` 유지 + knob 그림자 살짝 |
| 초기화 버튼 | bg `surface-muted` + border `border-strong` |
| 표 행 (≥768px) | bg `surface-muted` |
| stat 타일 / 배너 / 배지 | hover 없음 (비인터랙티브 — 커서도 `default` 유지) |

> **원칙**: hover 효과가 있는 요소 = 클릭 가능한 요소. 비인터랙티브 요소에 hover 를 주면 "눌러도 되나?" 하는 오해를 만든다.

### 6.3 empty 상태 (기획 §12 — 문구 고정)

| | 빈 상태 A (`data-view-state="empty-filtered"`) | 빈 상태 B (`data-view-state="empty-fixture"`) |
|---|---|---|
| 조건 | 필터 결과 0건, fixture 는 존재 | fixture 배열 자체가 0건 (방어적 edge) |
| 글리프 | `⌕` (48px, `--rr-color-border-strong`) | `☐` (48px, `--rr-color-border-strong`) |
| 제목 (고정 문구) | **"선택한 조건에 해당하는 항목이 없습니다."** | **"등록된 릴리즈 체크리스트 항목이 없습니다."** |
| 보조 설명 (디자이너 추가) | "역할·상태 필터 또는 '완료 항목 숨기기' 조건을 조정해 보세요." | (없음 — 조치할 것이 없으므로 헛된 안내 금지) |
| 초기화 버튼 | **노출** | **숨김** |
| 요약 패널(진행률/배너/stat) | **그대로 유지** (전체 fixture 기준) | 진행률 → "표시할 진행률 없음", 배너 → `hidden`, stat 타일 → 숨김 |
| announcer | "총 0건 표시" | 숨김 |
| 시각 | 목록 카드 안 중앙 정렬, padding `--rr-space-7` 상하 | 동일 |

- 두 상태는 **문구 + 버튼 유무**로 구분된다 (기획 §12). dev 는 `#board[data-view-state]` 값으로 분기 렌더링.
- 빈 상태 A 에서 요약 패널이 그대로 남아 있는 것은 **버그가 아니라 설계**다 (기획 §4.2) — 리뷰 시 오해 주의.

---

## 7. dev 구현 가이드

> 대상: `release-readiness/style.css` + `index.html` 마크업 (dev task). 아래 순서대로 진행하면 된다.

### 7.1 STEP 1 — CSS 변수 정의 (`style.css` 최상단)

mockup(`docs/design/mockups/release-readiness-BF-817.html`) 의 `<style>` 안 `:root` 블록을 **그대로 복사**해 `style.css` 최상단에 붙여넣는다. 값은 §2/§3/§4.1 표와 1:1 일치하며, 대비 검증이 끝난 값이므로 **임의 조정 금지**.

```css
:root {
  /* base */
  --rr-color-bg: #F1F3F5;          --rr-color-surface: #FFFFFF;
  --rr-color-surface-muted: #F8F9FA; --rr-color-border: #DDE1E6;
  --rr-color-border-strong: #8A9199; --rr-color-text: #1A1D21;
  --rr-color-text-muted: #5C636A;    --rr-color-accent: #3563E9;
  --rr-color-accent-hover: #2A50C4;  --rr-color-track: #E4E7EB;
  /* status */
  --rr-color-pending: #475569; --rr-color-pending-tint: #F8FAFC; --rr-color-pending-line: #CBD5E1;
  --rr-color-blocked: #B91C1C; --rr-color-blocked-tint: #FEF2F2; --rr-color-blocked-line: #FECACA;
  --rr-color-done:    #0F7B4F; --rr-color-done-tint:    #ECFDF5; --rr-color-done-line:    #A7F3D0;
  /* banner */
  --rr-color-banner-blocked-text: #7F1D1D;
  --rr-color-banner-ready-text:   #065F46;
  --rr-color-banner-progress-text:#1E3A8A;
  --rr-color-banner-progress-tint:#EFF6FF;
  /* space / radius / shadow / font — §4.1, §3 참조 */
}
```

### 7.2 STEP 2 — 마크업 골격 (`index.html`)

기획 §9 DOM 계약을 만족하는 골격. **ID·`data-*`·ARIA 속성은 고정**, `class` 만 아래 권장값 사용:

```html
<main id="board" class="rr-board" data-view-state="list">
  <header class="rr-header">
    <h1 class="rr-title">Release Readiness</h1>
    <p class="rr-lead">릴리즈 전 체크리스트 — 역할·상태로 좁혀 보고, 차단 항목을 확인하세요.</p>
  </header>

  <!-- 요약 패널: 항상 전체 fixture 기준 (필터 영향 없음) -->
  <section class="rr-card rr-summary" aria-labelledby="summary-heading">
    <h2 id="summary-heading" class="sr-only">릴리즈 요약</h2>
    <div id="release-banner" class="rr-banner" data-banner-state="blocked">
      <span class="rr-banner-glyph" aria-hidden="true">▲</span>
      <span class="rr-banner-text">차단 항목 2건 — 출시 보류</span>
    </div>
    <div class="rr-progress-row">
      <div id="progress-bar" class="rr-progress" role="progressbar"
           aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-label="릴리즈 진행률">
        <div class="rr-progress-fill" style="width:50%"></div>
      </div>
      <p class="rr-progress-label">5/10 완료 (50%)</p>
    </div>
    <div class="rr-stats">
      <div class="rr-stat" data-stat="done"><span class="rr-stat-value">5</span><span class="rr-stat-label">완료</span></div>
      <div class="rr-stat" data-stat="blocked"><span class="rr-stat-value">2</span><span class="rr-stat-label">차단</span></div>
      <div class="rr-stat" data-stat="pending"><span class="rr-stat-value">3</span><span class="rr-stat-label">대기</span></div>
    </div>
  </section>

  <!-- 필터 바: 목록만 좁힘 -->
  <section class="rr-card rr-filters">
    <div class="rr-filter-row">
      <span class="rr-filter-label" id="role-filter-label">역할</span>
      <div class="rr-chip-group" role="group" aria-labelledby="role-filter-label">
        <button class="rr-chip" type="button" data-role-filter="all" aria-pressed="true">전체</button>
        <button class="rr-chip" type="button" data-role-filter="planning" aria-pressed="false">기획</button>
        <button class="rr-chip" type="button" data-role-filter="design" aria-pressed="false">디자인</button>
        <button class="rr-chip" type="button" data-role-filter="dev" aria-pressed="false">개발</button>
        <button class="rr-chip" type="button" data-role-filter="qa" aria-pressed="false">QA</button>
        <button class="rr-chip" type="button" data-role-filter="ops" aria-pressed="false">운영</button>
      </div>
    </div>
    <div class="rr-filter-row">
      <span class="rr-filter-label" id="status-filter-label">상태</span>
      <div class="rr-chip-group" role="group" aria-labelledby="status-filter-label">
        <button class="rr-chip" type="button" data-status-filter="all" aria-pressed="true">전체</button>
        <button class="rr-chip" type="button" data-status-filter="pending" aria-pressed="false">대기</button>
        <button class="rr-chip" type="button" data-status-filter="blocked" aria-pressed="false">차단</button>
        <button class="rr-chip" type="button" data-status-filter="done" aria-pressed="false">완료</button>
      </div>
    </div>
    <div class="rr-filter-actions">
      <button id="hide-done-toggle" class="rr-switch" type="button" role="switch" aria-checked="false">
        <span class="rr-switch-track" aria-hidden="true"><span class="rr-switch-knob"></span></span>
        <span class="rr-switch-text">완료 항목 숨기기</span>
      </button>
      <button id="reset-filters-btn" class="rr-btn-ghost" type="button">필터 초기화</button>
    </div>
  </section>

  <!-- 목록 -->
  <p class="rr-live" aria-live="polite">총 10건 표시</p>
  <section class="rr-card rr-list">
    <table class="rr-table">
      <thead>
        <tr><th scope="col">항목</th><th scope="col">역할</th><th scope="col">상태</th><th scope="col">증빙</th></tr>
      </thead>
      <tbody id="item-list">
        <tr class="rr-row" data-id="rr-007" data-role="qa" data-status="blocked">
          <td class="rr-cell-title" data-label="항목"><span class="rr-item-title">회귀 테스트 스위트 전체 통과</span></td>
          <td data-label="역할">QA</td>
          <td data-label="상태">
            <span class="rr-badge" data-status="blocked"><span class="rr-badge-glyph" aria-hidden="true">▲</span>차단</span>
          </td>
          <td data-label="증빙"><span class="rr-evidence">회귀 스위트 3건 실패 — BF-820 대응 중</span></td>
        </tr>
        <!-- pending 항목의 증빙 셀 (EC-06) -->
        <!-- <td data-label="증빙">
               <span class="rr-evidence rr-evidence--empty" aria-hidden="true">—</span>
               <span class="sr-only">증빙 없음</span>
             </td> -->
      </tbody>
    </table>
    <!-- 빈 상태 A/B 는 data-view-state 에 따라 표시 (§7.5) -->
  </section>
</main>
```

### 7.3 STEP 3 — 상태 스타일은 ARIA 속성 선택자로 (중요)

선택/체크 상태를 `.is-active` 같은 **별도 클래스로 관리하지 말 것**. `aria-pressed` / `aria-checked` 를 그대로 스타일 훅으로 쓰면 **ARIA 값과 시각 상태가 구조적으로 어긋날 수 없다**(기획 EC-04: "`aria-checked` 값 항상 최신 상태와 일치" 를 코드로 보장).

```css
.rr-chip[aria-pressed="true"]  { background: var(--rr-color-accent); border-color: var(--rr-color-accent); color:#fff; font-weight:700; }
.rr-chip[aria-pressed="true"]:hover { background: var(--rr-color-accent-hover); }
.rr-switch[aria-checked="true"] .rr-switch-track { background: var(--rr-color-accent); border-color: var(--rr-color-accent); }
.rr-switch[aria-checked="true"] .rr-switch-knob  { transform: translateX(20px); }
```
→ JS 는 `btn.setAttribute('aria-pressed', String(selected))` **한 줄만** 하면 시각까지 동기화된다.

### 7.4 STEP 4 — 반응형 (§4.5)

```css
@media (max-width: 767px) {
  .rr-table thead { position: absolute; left: -9999px; }      /* 스크린리더용 유지 */
  .rr-table, .rr-table tbody, .rr-table tr, .rr-table td { display: block; width: 100%; }
  .rr-table tr { border:1px solid var(--rr-color-border); border-radius: var(--rr-radius-md);
                 padding: var(--rr-space-3); margin-bottom: var(--rr-space-3); }
  .rr-table td { display: grid; grid-template-columns: 56px 1fr; gap: var(--rr-space-2);
                 padding: var(--rr-space-1) 0; border: 0; }
  .rr-table td::before { content: attr(data-label); font-size:12px; font-weight:700;
                         color: var(--rr-color-text-muted); }
  .rr-table td.rr-cell-title { display:block; }
  .rr-table td.rr-cell-title::before { content: none; }        /* 제목은 카드 헤드 — 라벨 중복 제거 */
}
```
- 검증 기준: **320px 에서 가로 스크롤 0** (기획 §14).

### 7.5 STEP 5 — 빈 상태 분기 (§6.3)

`#board[data-view-state]` 로 목록/빈상태 A/빈상태 B 를 전환한다. 빈 상태 마크업은 목록 카드 안에 두고 CSS 로 show/hide:

```css
.rr-empty { display: none; }
#board[data-view-state="empty-filtered"] .rr-table,
#board[data-view-state="empty-fixture"]  .rr-table { display: none; }
#board[data-view-state="empty-filtered"] .rr-empty[data-empty="filtered"],
#board[data-view-state="empty-fixture"]  .rr-empty[data-empty="fixture"] { display: block; }
#board[data-view-state="empty-fixture"]  .rr-stats,
#board[data-view-state="empty-fixture"]  .rr-progress-row,
#board[data-view-state="empty-fixture"]  .rr-live { display: none; }
#release-banner[data-banner-state="hidden"] { display: none; }
```
- ⚠️ 빈 상태 A 안의 초기화 버튼은 `#reset-filters-btn` **ID 를 재사용하지 말 것**(HTML ID 중복 금지). `class="rr-btn-ghost" data-action="reset"` 로 두고, JS 는 `document.querySelectorAll('#reset-filters-btn, [data-action="reset"]')` 처럼 **두 요소에 같은 핸들러**를 바인딩한다.

### 7.6 STEP 6 — sr-only 유틸 (필수)

```css
.sr-only {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
}
```
`display:none` 으로 대체하면 스크린리더에서도 사라지므로 **금지** (§5.7 "증빙 없음" 이 낭독되어야 함).

### 7.7 하지 말 것 (체크리스트)

| ❌ 금지 | 이유 |
|---------|------|
| 진행률/배너/stat 을 **필터된 배열**로 계산 | 기획 §4.2 정면 위반 — 본 화면의 핵심 설계 원칙 |
| status 를 색만으로 표시 (배지 라벨 제거) | 기획 §13.3 위반 (색각 이상 사용자) |
| `outline: none` 으로 focus ring 제거 | AC-13(키보드 전용 조작) 실패 |
| 외부 폰트/아이콘 CDN, `fetch`, `localStorage` | vanilla-static 위반 (기획 §15, AC-12) |
| `--rr-color-done` 을 밝은 초록(`#10B981` 등)으로 변경 | 대비 2.5:1 → AA 미달 (§2.2) |
| 빈 상태 문구 재작성 | 기획 §12 고정 문구 |
| `<div>` + `onclick` 으로 칩/토글 구현 | 키보드 기본 동작 상실 (기획 §13.1 — 네이티브 `<button>` 필수) |

---

## 8. mockup 참조 및 evidence

| 산출물 | 경로 |
|--------|------|
| 시각 mockup (self-contained HTML, 외부 의존성 0건) | [`docs/design/mockups/release-readiness-BF-817.html`](./mockups/release-readiness-BF-817.html) |
| Desktop 캡처 (1280×viewport) | [`docs/design/mockups/release-readiness-BF-817-desktop.png`](./mockups/release-readiness-BF-817-desktop.png) |
| Mobile 캡처 (390×viewport, iPhone 12 급) | [`docs/design/mockups/release-readiness-BF-817-mobile.png`](./mockups/release-readiness-BF-817-mobile.png) |

### 8.1 mockup 구성 (6개 섹션)

| # | 섹션 | 확인 가능한 것 |
|---|------|----------------|
| 1 | 데스크톱 기본 뷰 (`list`) | 전체 레이아웃, 배너(blocked), 진행률 50%, stat 3, 필터 바, 표 10행 |
| 2 | 필터 적용 뷰 (역할=QA) | **진행률·배너·stat 이 변하지 않음**(§1.2 핵심 원칙) + 목록만 2건 |
| 3 | 릴리즈 배너 3-state | `blocked` / `ready` / `in-progress` 색·글리프·문구 |
| 4 | 상태 배지 + 인터랙션 상태 | 배지 3종, 칩 default/hover/selected/focus, 스위치 off/on, 버튼 hover/focus |
| 5 | 빈 상태 A / B | 고정 문구, 초기화 버튼 노출/숨김 차이 |
| 6 | 반응형 안내 | 브레이크포인트(768px) 동작 설명 |

### 8.2 반응형 확인 방법 (AC-2)

mockup 은 **실제 `@media (max-width: 767px)` 쿼리**로 구현되어 있다 — 모바일 뷰를 별도 이미지로 흉내 낸 것이 아니다.

```bash
# file:// 로 직접 열기 (외부 의존성 0건 — 네트워크 요청 없음)
open docs/design/mockups/release-readiness-BF-817.html
```
브라우저 창을 **768px 미만으로 좁히면** 표가 카드 스택으로 전환되고, 필터 칩이 줄바꿈되며, 진행률 라벨이 바 위로 이동한다. 커밋된 mobile PNG 는 390px 뷰포트에서 캡처한 것이다.

### 8.3 실 브라우저 검증 결과 (주장이 아닌 측정값)

PNG 는 **실제 브라우저(e2e-runner 컨테이너)에서 렌더한 결과**이며, 캡처와 동시에 아래 항목을 측정했다:

| 검증 항목 | desktop 1280px | mobile 390px | 320px (최소 폭) |
|-----------|----------------|--------------|------------------|
| 가로 스크롤 (기획 §14) | ✅ 없음 | ✅ 없음 | ✅ **없음** |
| 목록 `td` computed display | `table-cell` (표) | `block` (카드 스택) | `block` (카드 스택) |
| 외부 리소스 태그 (`link`/`script src`/`img`) | ✅ 0건 | ✅ 0건 | ✅ 0건 |
| 외부 네트워크 요청 (AC-2 / 기획 AC-12) | ✅ 0건 | ✅ 0건 | ✅ 0건 |
| 콘솔/페이지 에러 | ✅ 0건 | ✅ 0건 | ✅ 0건 |
| HTML ID 중복 | ✅ 없음 | ✅ 없음 | ✅ 없음 |

→ 768px 브레이크포인트가 **실제로 동작**함이 computed style 로 확인됐다(`table-cell` → `block`). 반응형을 이미지로 흉내 낸 것이 아니라는 근거다.

---

## 9. AC ↔ 산출물 매핑 표

### 9.1 본 task(BF-817) 수용 기준

| # | BF-817 수용 기준 | 충족 위치 | 상태 |
|---|------------------|-----------|------|
| AC-1 | `docs/design/release-readiness-BF-815.md` 에 **정보 계층** 포함 | §1.2 (4단계 우선순위 + 요약/필터 물리 분리), §4.2 (섹션 구조도) | ✅ |
| AC-1 | 〃 **색상 토큰** 포함 | §2.1 base 10종, §2.2 status 9종, §2.3 banner 4-state — 전부 HEX + 대비 수치 | ✅ |
| AC-1 | 〃 **상태 배지(pending/blocked/done)** 포함 | §2.2 (토큰), §5.8 (배지 컴포넌트 — 색+라벨+글리프 3중 표기) | ✅ |
| AC-1 | 〃 **focus/hover/empty 상태** 포함 | §6.1 focus, §6.2 hover, §6.3 empty A/B | ✅ |
| AC-1 | 〃 **AC 매핑 표** 포함 | 본 §9 (9.1 designer AC, 9.2 기획 AC 커버리지) | ✅ |
| AC-2 | mockup 이 `file://` 로 **외부 의존성 없이** 렌더 | mockup HTML — 단일 파일, `<link>`/`<script src>`/CDN 0건, system font only (§8.2) | ✅ |
| AC-2 | 〃 **desktop/mobile 브레이크포인트 모두 확인 가능** | 실제 `@media (max-width:767px)` 구현 — 창 크기 조절로 전환 확인 (§8.2) | ✅ |
| AC-3 | **desktop/mobile PNG 캡처가 `docs/design/` 아래 존재** | `docs/design/mockups/release-readiness-BF-817-desktop.png` (1280px), `…-mobile.png` (390px) | ✅ |

### 9.2 기획(BF-815) AC 대비 디자인 커버리지

designer 는 **시각 명세**까지 책임지고, 실제 동작은 dev task 가 구현한다. 아래는 각 기획 AC 를 구현하는 데 필요한 시각 스펙이 본 문서에 모두 있는지 확인한 표다.

| 기획 AC | 필요한 시각 스펙 | 본 문서 위치 |
|---------|------------------|--------------|
| AC-01 초기 로드 | 기본 레이아웃, 진행률 바, blocked 배너 | §4.2, §5.2, §5.1 |
| AC-02 역할 필터 | 칩 선택 상태, 진행률 불변 | §5.4, §1.2, mockup 섹션 2 |
| AC-03 상태 필터 | 상태 칩 4종 | §5.4 |
| AC-04 역할+상태 AND | 칩 2그룹 독립 선택 시각 | §5.4 (그룹별 독립 `aria-pressed`) |
| AC-05 완료 숨기기 토글 | 스위치 on/off 시각 | §5.5 |
| AC-06 결과 0건 → 빈 상태 | 빈 상태 A (문구 + 초기화 버튼) | §6.3, mockup 섹션 5 |
| AC-07 필터 초기화 | 초기화 버튼 (2곳, 동일 동작) | §5.6, §7.5 |
| AC-08 진행률 계산 | 진행률 라벨 포맷 "5/10 완료 (50%)" | §5.2 |
| AC-09 blocked 최우선 배너 | 배너 우선순위 = blocked 최상단, fill 색은 중립 유지 | §2.3, §2.4 |
| AC-10 전 항목 완료 배너 | `ready` 배너 시각 | §2.3, mockup 섹션 3 |
| AC-11 fixture 0건 | 빈 상태 B + "표시할 진행률 없음" + 배너 숨김 | §6.3, §5.2 |
| AC-12 file:// 호환 | system font, 외부 의존성 0건 명시 | §3, §7.7 |
| AC-13 키보드 전용 조작 | focus ring 규칙, 네이티브 `<button>`, Tab 순서 | §6.1, §7.7 |
| §14 반응형 | 768px 브레이크포인트, 카드 스택 전환, 320px 무스크롤 | §4.5, §7.4 |
| §13.3 색 비의존 | 배지 3중 표기 (색+라벨+글리프) | §5.8 |

---

## 10. 기획 대비 미결정/확인 필요 항목

designer 재량으로 **결정**한 것과, dev/운영자가 **알고 있어야 할** 사항:

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| D-1 | 필터 칩 좁은 화면 처리 — 가로 스크롤 vs 줄바꿈 | **줄바꿈(wrap)** 채택 | 기획 §14 가 "디자이너 재량" 으로 위임. 스크롤은 화면 밖 칩을 숨겨 오인 유발 (§4.4) |
| D-2 | 진행률 바 fill 색 — blocked 시 빨강 전환 여부 | **전환 안 함** (항상 accent) | 진행률(양)과 차단(가부)은 다른 축 — 겹치면 의미 모호 (§2.4) |
| D-3 | stat 타일 클릭 → 상태 필터 연동 | **v1 미포함** (비인터랙티브) | 기획 §17 비범위 정신. 필요 시 별도 스토리 |
| D-4 | announcer("총 N건 표시") 시각 노출 여부 | **시각 노출** (sr-only 아님) | 기획 §13.2 는 `aria-live` 만 요구. 건수는 마우스 사용자에게도 유용 (§5.9) |
| D-5 | 빈 상태 A 보조 설명 문구 추가 | **추가** ("역할·상태 필터 또는 '완료 항목 숨기기' 조건을 조정해 보세요.") | 기획 §12.1 고정 문구는 **제목**으로 그대로 유지하고, 보조 설명만 덧붙임 — 고정 문구 변경 아님 |
| D-6 | 본 명세 파일명이 BF-817 이 아닌 BF-815 | **BF-815 유지** | BF-817 수용 기준에 리터럴 경로로 명시됨 (문서 상단 파일명 안내 참조) |

### 10.1 ⚠️ 기획 문서 내부 불일치 1건 — dev/tester 확인 필요

진행률 라벨 문구가 기획 문서 안에서 **두 가지 형태**로 나온다:

| 기획 위치 | 문구 |
|-----------|------|
| §11 AC-01 | `5/10 완료, 50%` (쉼표) |
| §18 디자이너 위임 표 | `N/M 완료 (P%)` (괄호) |

- **본 시안은 §18 의 괄호 형태 `5/10 완료 (50%)` 를 채택**했다 — §18 이 라벨 포맷을 명시적으로 규정한 항목이고, AC-01 의 표현은 서술 중 요약으로 보이기 때문.
- ⚠️ **tester 주의**: E2E 에서 진행률 라벨을 문자열 완전일치로 단언할 경우 **어느 형태를 기준으로 할지 먼저 확정**해야 한다. 숫자(`5`/`10`/`50`)만 검증하고 구분자는 느슨하게 매칭하는 것을 권장한다.
- 운영자/기획이 쉼표 형태를 원하면 **CSS 변경 없이 텍스트만 교체**하면 되므로 시안에 미치는 영향은 없다.

**dev 에게 남기는 확인 요청**: 위 D-1~D-5 는 기획이 designer 에게 위임한 범위 안에서 내린 결정이라 별도 승인 없이 진행했다. 운영자가 다르게 원하면 **PR 코멘트로 알려주면 mockup 을 수정**한다 — dev 구현 후 바꾸는 것보다 지금 바꾸는 편이 싸다.

---

*문서 종료 — [이디자인] · BF-817*
</content>
