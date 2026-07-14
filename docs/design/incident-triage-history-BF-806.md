# Incident Handoff Timeline (`/incident-triage/history/`) 디자인 명세 — BF-806

> 작성자: [이디자인] · 작성일 2026-07-14
> designer task: **BF-808** · 상위 Epic/스토리: **BF-806** · 기획 명세: `docs/plan/incident-triage-history-BF-806.md` (BF-807)
> mockup: **`docs/design/mockups/incident-triage-history-BF-808.html`** (§8)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font stack, CSS 변수 자체 정의, `file://` 직접 실행 호환
>
> **파일명 안내**: 본 명세 파일명은 BF-808 수용 기준에 명시된 경로(`docs/design/incident-triage-history-BF-806.md`)를 그대로 따랐다(기획 문서 `docs/plan/incident-triage-history-BF-806.md` 와 Epic 키를 맞춘 것). mockup 은 designer task 키(BF-808)로 생성한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [접근성 · WCAG 대비 검증](#6-접근성--wcag-대비-검증)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [AC ↔ UI 매핑 표](#9-ac--ui-매핑-표)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

기존 `incident-triage/` 모듈 하위에 신규 페이지 `incident-triage/history/` 의 시각 시안을 정의한다. 인시던트 1건이 **5단계 인계 파이프라인**(기획→디자인→개발→리뷰→테스트)을 거친 이력을 카드 + 세로 타임라인으로 보여주는 **읽기 전용 조회 화면**이다.

- 신규 파일(dev 담당): `incident-triage/history/index.html`, `style.css`, `history.js`, `fixtures.js`
- **기존 파일 4개(`incident-triage/index.html`·`style.css`·`triage.js`·`package.json`)는 1바이트도 수정하지 않는다** (기획 §1.2 / AC-10). 본 시안도 기존 파일의 값을 **복사해서 신규 `:root` 에 재정의**할 뿐 import/공유하지 않는다.
- CSS 변수 프리픽스: **`--ith-*`** (기존 `--it-*` 와 충돌 방지 — 기획 §5.2 제안 그대로 채택)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| "지금 어디까지 왔나"를 1초 안에 파악 | 카드 우측 상단 **종합 상태 배지**(큰 pill) + 타임라인 왼쪽 **진행 레일**(완료 구간만 채색) 2중 신호 |
| 5단계가 순서라는 인지 | 세로 타임라인 — 노드(●)를 세로선으로 연결, 위→아래가 곧 인계 방향 |
| 단계별 6개 필드를 한 줄에 | 데스크톱: `역할 | 상태 | 담당자 | 완료 시각 | Jira | PR` 6열 그리드 / 모바일: 라벨-값 세로 스택 |
| 미도달 단계의 "비어 있음"을 형태로 전달 | `not_started` 노드는 속 빈 원(outline) + 행 전체 opacity 0.72 + 모든 값 `-` |
| 차단 상태의 즉시 경고 | `blocked` 노드는 채워진 적색 + 행 좌측 3px 적색 스트립 — 카드 종합 배지도 적색으로 승격(기획 §2.3 규칙 1) |
| 색맹 사용자 동등 인지 | 배지에 **한글 라벨(완료/진행중/차단/대기) 항상 병기**, 노드 채움/윤곽 형태 차이 병행 — 색은 보조 채널 |

### 1.3 디자인 톤 — 기존 SPA 계승 및 **task 설명과의 차이 flag**

> ⚠️ **모호함 flag (dev·reviewer 확인 필요)**: BF-808 task 설명에는 "기존 `/incident-triage/` SPA 의 **dark navy**·severity accent 디자인 토큰"이라고 적혀 있으나, **실제 코드(`incident-triage/style.css` `:root`)와 PR #141 시안(`docs/design/incident-triage-BF-800.md` §1.3)의 톤은 dark navy 가 아니라 밝은 중립 캔버스(`#F1F3F5`) + 흰 카드**다("게임 모듈의 다크 그라데이션과 의도적으로 구분"이라고 명시).
>
> 본 시안은 **코드에 실재하는 토큰을 source of truth 로 삼아 밝은 중립 톤을 계승**한다. 같은 `incident-triage/` 모듈 안에서 상위 페이지(`../index.html`)와 하위 페이지(`history/`)의 배경 톤이 갈리면 사용자가 "다른 앱"으로 오인하기 때문이다. severity accent(적/주황/청/회) 계열은 요구대로 상태 배지에 계승했다.
> → **dark navy 가 필수 요구라면 dev 구현 전에 운영자 판단 필요**(§2.4 에 다크 대안 팔레트 준비해 둠 — `:root` 값 교체만으로 전환 가능하도록 구조화).

- 밝은 중립 캔버스 위 흰 카드 — 운영 도구(ops tool) 특유의 차분·신뢰 무드 (BF-800 톤 계승)
- 색은 **상태 표현에만** 절제 사용, 나머지는 무채색
- radius 8~12px, 얕은 그림자 — 정보 밀도 높은 조회 도구에 맞는 낮은 장식성

---

## 2. 컬러 팔레트

모든 색상은 `incident-triage/history/style.css` 의 `:root` 에 **신규 CSS 변수(`--ith-*`)** 로 정의한다. 기존 파일에서 import 하지 않고 **값만 복제**한다(vanilla-static 제약).

### 2.1 기본 팔레트 (BF-800 `--it-*` 값 그대로 계승)

| 역할 | CSS 변수 | HEX | 용도 |
|------|----------|-----|------|
| background (canvas) | `--ith-color-bg` | `#F1F3F5` | 페이지 배경 |
| surface | `--ith-color-surface` | `#FFFFFF` | 인시던트 카드 표면 |
| surface-muted | `--ith-color-surface-muted` | `#F8F9FA` | Stage 행 배경(zebra), 빈 상태 박스 |
| border | `--ith-color-border` | `#DDE1E6` | 카드·행 구분선 |
| border-strong | `--ith-color-border-strong` | `#B9C0C8` | 타임라인 레일(미완료 구간), hover 테두리 |
| text | `--ith-color-text` | `#1A1D21` | 제목·본문 |
| text-muted | `--ith-color-text-muted` | `#6B6B66` | 필드 라벨, 캡션, `-` placeholder |
| accent | `--ith-color-accent` | `#3563E9` | 링크 텍스트, 포커스 링 |
| accent-hover | `--ith-color-accent-hover` | `#2A50C4` | 링크 hover |

### 2.2 상태(Status) 팔레트 — **핵심**

기획 §2.2 의 4개 status enum ↔ BF-800 severity accent 계열 매핑. 각 상태는 **solid(배지 배경)** + **tint(행 강조/노드 후광)** 2종을 가진다. 배지 텍스트는 항상 `#FFFFFF`.

| `status` | 한글 라벨 | solid 변수 | HEX | tint 변수 | tint HEX | 계승 출처 | 배지 대비(vs 흰 텍스트) |
|----------|-----------|------------|-----|-----------|----------|-----------|--------------------------|
| `done` | 완료 | `--ith-color-done` | `#0F7B4F` | `--ith-color-done-tint` | `#ECFDF5` | `--it-color-success` | **5.28:1** ✅ AA |
| `in_progress` | 진행중 | `--ith-color-progress` | `#1D4ED8` | `--ith-color-progress-tint` | `#EFF6FF` | `--it-color-p3` | **6.71:1** ✅ AA |
| `blocked` | 차단 | `--ith-color-blocked` | `#B91C1C` | `--ith-color-blocked-tint` | `#FEF2F2` | `--it-color-p1` | **6.47:1** ✅ AA |
| `not_started` | 대기 | `--ith-color-waiting` | `#475569` | `--ith-color-waiting-tint` | `#F8FAFC` | `--it-color-p4` | **7.58:1** ✅ AA |

> 매핑 근거: `blocked`=P1 적색(가장 강한 경고), `in_progress`=P3 청색(진행/중립), `not_started`=P4 회색(비활성), `done`=success 녹색. **적색을 blocked 에만 쓰기 때문에** 화면에서 적색이 보이면 곧 "막힌 인시던트"라는 단일 의미를 갖는다.

### 2.3 spacing / radius / elevation

| 토큰 | 값 |
|------|-----|
| `--ith-space-1 … -7` | `4px / 8px / 12px / 16px / 24px / 32px / 48px` (BF-800 스케일 동일) |
| `--ith-radius-sm / -md / -lg / -pill` | `4px / 8px / 12px / 999px` |
| `--ith-shadow-card` | `0 1px 2px rgba(26,29,33,.06), 0 2px 8px rgba(26,29,33,.05)` |
| `--ith-rail-width` | `2px` (타임라인 세로선) |
| `--ith-node-size` | `12px` (타임라인 노드 지름) |

### 2.4 (예비) 다크 대안 팔레트 — §1.3 flag 해소용

운영자가 "dark navy" 를 확정 요구하면 **`:root` 값만 아래로 교체**한다(마크업·클래스·컴포넌트 구조 변경 0). 상태 solid 색은 다크 배경 대비를 위해 밝은 톤으로 치환:

| 변수 | 다크 값 | 비고 |
|------|---------|------|
| `--ith-color-bg` | `#0F172A` | dark navy canvas |
| `--ith-color-surface` | `#1E293B` | 카드 |
| `--ith-color-text` | `#E2E8F0` | 본문 (vs surface 11.6:1) |
| `--ith-color-text-muted` | `#94A3B8` | 보조 (vs surface 4.9:1) |
| `--ith-color-done` / `-progress` / `-blocked` / `-waiting` | `#34D399` / `#60A5FA` / `#F87171` / `#94A3B8` | 배지 텍스트를 `#0F172A`(어두운 글자)로 반전 |

> 본 mockup·기본 시안은 **밝은 톤(§2.1~2.2)** 이 정본이다. 다크는 승인 시에만 적용.

---

## 3. 타이포그래피

폰트는 **system font stack 만** 사용한다(외부 CDN 0건 — vanilla-static).

```css
--ith-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                 system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--ith-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | 클래스 | font-family | size | weight | line-height | 색 |
|------|--------|-------------|------|--------|-------------|-----|
| 페이지 제목 (h1) | `.ith-header h1` | sans | 24px | 700 | 1.3 | text |
| 페이지 부제 | `.ith-subtitle` | sans | 14px | 400 | 1.5 | text-muted |
| 카드 제목 (h2) | `.ith-card__title` | sans | 18px | 600 | 1.4 | text |
| 카드 메타(인시던트 ID·Epic 키) | `.ith-card__meta` | **mono** | 13px | 500 | 1.4 | text-muted |
| 종합 상태 배지 | `.ith-badge--overall` | sans | 13px | 700 | 1 | #FFFFFF |
| Stage 역할 라벨 | `.ith-stage__role` | sans | 15px | 600 | 1.4 | text |
| Stage 상태 배지 | `.ith-badge--stage` | sans | 12px | 600 | 1 | #FFFFFF |
| Stage 필드 라벨(모바일 전용 노출) | `.ith-field__label` | sans | 12px | 500 | 1.4 | text-muted |
| Stage 필드 값(담당자) | `.ith-field__value` | sans | 14px | 400 | 1.5 | text |
| 완료 시각 | `.ith-field--time .ith-field__value` | **mono** | 13px | 400 | 1.5 | text-muted |
| Jira 키 링크 | `.ith-link--jira` | **mono** | 13px | 600 | 1.5 | accent |
| PR 링크 | `.ith-link--pr` | sans | 13px | 600 | 1.5 | accent |
| placeholder (`-`) | `.ith-empty-value` | sans | 14px | 400 | 1.5 | text-muted |
| 빈 목록 안내 | `.ith-empty` | sans | 15px | 500 | 1.6 | text-muted |

> Jira 키·완료 시각·인시던트 ID 는 **mono** — 코드/식별자/시각은 등폭이 스캔 속도를 높이고, 세로로 나열될 때 자릿수가 정렬된다.

---

## 4. 레이아웃

### 4.1 페이지 구조

```
<body>                                   배경 #F1F3F5, padding 32px 24px
 └─ <div class="ith-app">                max-width 960px, 중앙 정렬
     ├─ <header class="ith-header">
     │    ├─ h1  "인시던트 인계 타임라인"
     │    ├─ p.ith-subtitle  "5단계 인계 파이프라인 이력 (읽기 전용)"
     │    └─ a.ith-backlink  "← 심각도 판정 도구로 돌아가기"   (href="../index.html", AC-08)
     ├─ <main id="history-list" class="ith-list">        ← history.js 가 채움 (<ul>)
     │    └─ <li class="ith-card"> × N                    (fixture 순서 그대로)
     │         ├─ .ith-card__head   제목 · ID/Epic 메타 · 종합 상태 배지(우측)
     │         └─ ol.ith-timeline   Stage 5행 (기획 §2.1 고정 순서)
     └─ <footer class="ith-footer">  캡션 — "정적 fixture 스냅샷 · 실시간 조회 없음"
```

빈 상태(AC-07): `#history-list` 안에 `<p class="ith-empty">표시할 인시던트 이력이 없습니다.</p>` 한 블록만 렌더.

### 4.2 인시던트 카드

- surface 흰색, `border 1px solid --ith-color-border`, `radius --ith-radius-lg(12px)`, `--ith-shadow-card`
- padding `24px`, 카드 간 간격 `24px`
- 카드 좌측 4px 스트립(`::before`)에 **종합 상태 색** — 목록을 훑을 때 주변시로 상태 구분(BF-800 결과 카드 스트립 관례 계승)
- head: 좌측(제목 + 메타), 우측(종합 상태 배지) — `display:flex; justify-content:space-between; align-items:flex-start; gap:16px`

### 4.3 타임라인 (핵심)

세로 타임라인. 각 Stage 행은 **좌측 레일 컬럼(28px) + 콘텐츠 그리드**로 구성:

```
 ┌ 28px ┬────────────────── 콘텐츠 ─────────────────────┐
 │  ●   │ 기획   [완료]  박기획  2026-07-08 09:10  BF-901  PR 보기 │
 │  │   │
 │  ●   │ 디자인 [완료]  이디자인 2026-07-08 15:40  BF-902  PR 보기 │
 │  │   │
 │  ◉   │ 개발   [진행중] 김개발   -              BF-923  -      │
 │  ┆   │  (레일: 진행중 노드 이후 구간은 점선 + border-strong 색)
 │  ○   │ 리뷰   [대기]   -       -              -       -      │
 │  ┆   │
 │  ○   │ 테스트 [대기]   -       -              -       -      │
 └──────┴─────────────────────────────────────────────┘
```

**레일·노드 규칙**

| 상태 | 노드 | 노드 아래 레일 |
|------|------|----------------|
| `done` | 12px 채움 원 (`--ith-color-done`) | 실선 2px, `--ith-color-done` |
| `in_progress` | 12px 채움 원 (`--ith-color-progress`) + 4px tint 후광(box-shadow `0 0 0 4px var(--ith-color-progress-tint)`) | 점선 2px, `--ith-color-border-strong` |
| `blocked` | 12px 채움 원 (`--ith-color-blocked`) + tint 후광 | 점선 2px, `--ith-color-border-strong` |
| `not_started` | 12px 속 빈 원 (배경 surface, `border 2px solid --ith-color-border-strong`) | 점선 2px, `--ith-color-border-strong` |
| 마지막(테스트) 행 | 위와 동일 | **레일 없음** (`:last-child::after { display:none }`) |

> 형태(채움/윤곽/후광)만으로도 상태가 구분되므로 색상 단독 의존이 아니다(§6).

**행 강조**
- `blocked` 행: 배경 `--ith-color-blocked-tint`, 좌측 3px 적색 스트립
- `in_progress` 행: 배경 `--ith-color-progress-tint`
- `done` / `not_started` 행: 배경 투명 (`not_started` 는 `opacity: .72`)

### 4.4 Stage 콘텐츠 그리드 · breakpoint

| breakpoint | 그리드 |
|------------|--------|
| **≥ 721px (데스크톱/태블릿)** | `grid-template-columns: 88px 76px 1fr 148px 84px 72px;` → 역할·상태·담당자·완료 시각·Jira·PR 6열 1행. 필드 라벨(`.ith-field__label`)은 `display:none`(각 열의 의미는 타임라인 상단 `.ith-timeline__head` 헤더 행이 1회 제공) |
| **481–720px** | 2행 배치 — 1행: 역할+상태 배지, 2행: 담당자/시각/Jira/PR 4열 |
| **≤ 480px (모바일, AC-09)** | 세로 스택 1열. 각 필드는 `라벨 / 값` 세로쌍으로 노출(`.ith-field__label { display:block }`). 가로 스크롤 0 — `min-width:0` + `overflow-wrap:anywhere` 로 긴 값 줄바꿈(EC-08) |

- 뷰포트 최소 지원 320px: 카드 padding 을 `16px` 로 축소, 레일 컬럼 24px 로 축소
- `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수

---

## 5. 컴포넌트 명세

dev 는 프레임워크 없이 순수 DOM 으로 구현하므로 "props" 는 **렌더 함수 입력 + data-속성 계약**으로 표기한다.

### 5.1 `IncidentCard`

| 항목 | 내용 |
|------|------|
| 입력 | `incident: { id, title, epicKey, stages[5] }` (기획 §4.1) |
| 파생 | `overall = deriveIncidentStatus(incident.stages)` (기획 §6.1) — **디자인은 이 값만 신뢰**, 자체 재계산 금지 |
| 루트 | `<li class="ith-card" data-overall="{overall}">` |
| 계약 | `data-overall` ∈ `done|in_progress|blocked|not_started` → CSS 가 좌측 스트립 색을 이 속성으로 선택 |
| 자식 | `.ith-card__head`(제목 h2 · `.ith-card__meta` = `INC-1001 · BF-900` · `StatusBadge(variant=overall)`), `<ol class="ith-timeline">` |
| 상태/인터랙션 | **없음** (읽기 전용). hover 시 카드 그림자 강화만(장식) |

### 5.2 `StatusBadge`

| 항목 | 내용 |
|------|------|
| 입력 | `status: 'not_started'|'in_progress'|'blocked'|'done'`, `size: 'overall' | 'stage'` |
| 마크업 | `<span class="ith-badge ith-badge--{size}" data-status="{status}">완료</span>` |
| 라벨 매핑(고정) | `done→완료`, `in_progress→진행중`, `blocked→차단`, `not_started→대기` |
| 스타일 | 배경 = `data-status` 별 solid 색, 텍스트 `#FFFFFF`, `radius: pill`, padding `overall: 5px 12px / 13px·700` · `stage: 3px 8px / 12px·600` |
| 계약 | 색상 없이도 의미 전달 — **한글 라벨 텍스트 필수 포함**(빈 배지·아이콘 전용 금지) |

### 5.3 `TimelineRow` (Stage 행)

| 항목 | 내용 |
|------|------|
| 입력 | `stage: { role, status, assigneeName, completedAt, jiraIssueKey, prUrl }` (기획 §4.2 6필드) |
| 루트 | `<li class="ith-stage" data-status="{status}" data-role="{role}">` |
| 역할 라벨 매핑(고정) | `planner→기획`, `designer→디자인`, `developer→개발`, `reviewer→리뷰`, `tester→테스트` |
| 자식 6개 | ① `.ith-stage__role` ② `StatusBadge(size='stage')` ③ `.ith-field--assignee` ④ `.ith-field--time`(`formatCompletedAt()` 결과) ⑤ `.ith-field--jira` ⑥ `.ith-field--pr` |
| null 처리 (AC-04) | 값이 `null` 이면 `<span class="ith-empty-value" aria-label="없음">-</span>` — **`href` 없는 `<a>` 를 절대 생성하지 않는다** |
| 노드 | `::before`(노드) / `::after`(레일) 의사요소 — 추가 DOM 불필요 |
| 인터랙션 | 링크 hover/focus 외 없음 |

### 5.4 `JiraLink` / `PrLink`

| 항목 | JiraLink | PrLink |
|------|----------|--------|
| 입력 | `jiraIssueKey: string | null` | `prUrl: string | null` |
| 렌더 (non-null) | `<a class="ith-link ith-link--jira" href="{jiraBaseUrl}{key}" target="_blank" rel="noopener noreferrer" aria-label="{key} Jira 이슈 (새 탭에서 열림)">BF-903</a>` | `<a class="ith-link ith-link--pr" href="{prUrl}" target="_blank" rel="noopener noreferrer" aria-label="{key} GitHub PR (새 탭에서 열림)">PR 보기 ↗</a>` |
| 렌더 (null) | `-` (`.ith-empty-value`) | `-` (`.ith-empty-value`) |
| 링크 텍스트 | Jira 는 **키 원문**(mono), PR 은 **짧은 라벨 "PR 보기 ↗"** — URL 원문 노출 금지(가로 넘침 방지, 기획 §10) |
| 스타일 | 기본: accent 색 + `text-decoration: underline; text-underline-offset: 2px` · hover: accent-hover · focus-visible: `outline: 2px solid var(--ith-color-accent); outline-offset: 2px` |
| 네트워크 | **정적 앵커만** — fetch/XHR 금지 (AC-05, 기획 §11) |

### 5.5 `EmptyState`

| 항목 | 내용 |
|------|------|
| 조건 | `INCIDENT_HISTORY.length === 0` |
| 마크업 | `<p class="ith-empty">표시할 인시던트 이력이 없습니다.</p>` |
| 스타일 | surface-muted 배경, dashed border 1px `--ith-color-border`, radius md, padding 32px, 가운데 정렬, text-muted |

---

## 6. 접근성 · WCAG 대비 검증

### 6.1 텍스트 대비

| 조합 | 대비 | 판정 |
|------|------|------|
| text `#1A1D21` / surface `#FFFFFF` | 16.6:1 | ✅ AAA |
| text-muted `#6B6B66` / surface `#FFFFFF` | 5.2:1 | ✅ AA |
| accent 링크 `#3563E9` / surface `#FFFFFF` | 5.4:1 | ✅ AA |
| 배지 흰 텍스트 / done·in_progress·blocked·not_started solid | 5.28 / 6.71 / 6.47 / 7.58 : 1 | ✅ 전부 AA |
| 노드 색 / surface (비텍스트 UI 컴포넌트, 3:1 기준) | 모두 ≥ 4.9:1 | ✅ AA (1.4.11) |

### 6.2 구조·키보드

- 카드 목록 `<ul>`/`<li>`, 타임라인 `<ol>`/`<li>` — 스크린리더가 개수·순서 인지 (기획 §9)
- 링크는 네이티브 `<a href>` → Tab 순차 이동 / Enter 오픈. `:focus-visible` 링 필수(§5.4)
- 새 탭 오픈은 `aria-label` 에 "(새 탭에서 열림)" 명시
- 상태는 색 + **한글 라벨 텍스트** + **노드 형태(채움/윤곽)** 3중 채널 → 색맹·흑백 인쇄에서도 판별 가능
- `not_started` 행 `opacity:.72` 적용 후에도 text-muted 대비 ≥ 4.5:1 유지되도록, opacity 는 **행 전체가 아닌 텍스트 색상 자체**로 낮추지 않고 `--ith-color-text-muted` 를 그대로 사용(중복 감쇠 금지)
- 정적 콘텐츠이므로 `aria-live` 불필요 (기획 §9)
- `prefers-reduced-motion: reduce` 시 hover 트랜지션 제거

---

## 7. dev 구현 가이드

### 7.1 `:root` 토큰 블록 (그대로 복사 가능)

```css
/* incident-triage/history/style.css */
:root {
  /* base — BF-800 --it-* 값 계승 (import 아님, 값 복제) */
  --ith-color-bg:            #F1F3F5;
  --ith-color-surface:       #FFFFFF;
  --ith-color-surface-muted: #F8F9FA;
  --ith-color-border:        #DDE1E6;
  --ith-color-border-strong: #B9C0C8;
  --ith-color-text:          #1A1D21;
  --ith-color-text-muted:    #6B6B66;
  --ith-color-accent:        #3563E9;
  --ith-color-accent-hover:  #2A50C4;

  /* status — 시안 §2.2 대비 검증 완료 (5.28~7.58:1). 임의 변경 금지 */
  --ith-color-done:     #0F7B4F;  --ith-color-done-tint:     #ECFDF5;
  --ith-color-progress: #1D4ED8;  --ith-color-progress-tint: #EFF6FF;
  --ith-color-blocked:  #B91C1C;  --ith-color-blocked-tint:  #FEF2F2;
  --ith-color-waiting:  #475569;  --ith-color-waiting-tint:  #F8FAFC;

  /* spacing / radius / shape */
  --ith-space-1: 4px;  --ith-space-2: 8px;  --ith-space-3: 12px;
  --ith-space-4: 16px; --ith-space-5: 24px; --ith-space-6: 32px; --ith-space-7: 48px;
  --ith-radius-sm: 4px; --ith-radius-md: 8px; --ith-radius-lg: 12px; --ith-radius-pill: 999px;
  --ith-shadow-card: 0 1px 2px rgba(26,29,33,.06), 0 2px 8px rgba(26,29,33,.05);
  --ith-rail-width: 2px;
  --ith-node-size: 12px;

  /* type */
  --ith-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                   system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
  --ith-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

### 7.2 클래스 · data-속성 계약 (mockup 과 동일 이름 사용 권장)

| 클래스 | 역할 |
|--------|------|
| `.ith-app` / `.ith-header` / `.ith-subtitle` / `.ith-backlink` / `.ith-footer` | 페이지 셸 |
| `.ith-list` | `<ul>` 카드 목록 컨테이너 (`id="history-list"`) |
| `.ith-card[data-overall]` / `.ith-card__head` / `.ith-card__title` / `.ith-card__meta` | 인시던트 카드 |
| `.ith-timeline` / `.ith-timeline__head` | `<ol>` 타임라인 · 데스크톱 열 헤더 행 |
| `.ith-stage[data-status][data-role]` / `.ith-stage__role` | Stage 행 |
| `.ith-badge[data-status]` + `.ith-badge--overall` / `.ith-badge--stage` | 상태 배지 |
| `.ith-field` + `--assignee` / `--time` / `--jira` / `--pr`, `.ith-field__label`, `.ith-field__value` | Stage 필드 |
| `.ith-link` + `--jira` / `--pr`, `.ith-empty-value` | 링크 · `-` placeholder |
| `.ith-empty` | 빈 목록 안내 |

**CSS 는 `data-status` / `data-overall` 속성 선택자로 색을 분기한다** (JS 가 클래스명을 조립하지 않도록):

```css
.ith-badge[data-status="done"]        { background: var(--ith-color-done); }
.ith-badge[data-status="in_progress"] { background: var(--ith-color-progress); }
.ith-badge[data-status="blocked"]     { background: var(--ith-color-blocked); }
.ith-badge[data-status="not_started"] { background: var(--ith-color-waiting); }

.ith-card[data-overall="blocked"]::before { background: var(--ith-color-blocked); }
.ith-stage[data-status="blocked"]         { background: var(--ith-color-blocked-tint); }
.ith-stage[data-status="not_started"]     { opacity: .72; }
.ith-stage::before { /* 노드 */ } .ith-stage::after { /* 레일 */ }
.ith-stage:last-child::after { display: none; }
```

### 7.3 구현 단계 (권장 순서)

1. `history/index.html` — `<head>`(charset·viewport·title) + 셸 마크업 + `#history-list` 빈 컨테이너 + `../index.html` 백링크. 스크립트는 `</body>` 직전 `fixtures.js` → `history.js` 순 (기획 §5.2)
2. `history/style.css` — §7.1 `:root` 복사 → 셸 → 카드 → 타임라인(노드/레일 의사요소) → 배지 → 필드 → 반응형 3구간(§4.4) → `:focus-visible` / `prefers-reduced-motion`
3. `history/fixtures.js` — 기획 §4.4 의 3건 fixture 그대로(디자인 변경 없음)
4. `history/history.js` — `deriveIncidentStatus` / `formatCompletedAt` pure 함수(기획 §6) + `init()` 렌더. 렌더 시 §5 의 마크업 계약 준수, `null` 값은 `-` placeholder 로만 처리(빈 `<a>` 금지)
5. `file://` 로 직접 열어 콘솔 에러 0 · 네트워크 요청 0 확인 (AC-11)

### 7.4 하지 말 것

- ❌ `incident-triage/index.html`·`style.css`·`triage.js`·`package.json` 수정 (AC-10) — 값 복제만
- ❌ 외부 폰트/CDN/아이콘 라이브러리 (vanilla-static)
- ❌ `href` 없는 `<a>` 렌더 (AC-04)
- ❌ 배지에서 한글 라벨 제거하고 색/아이콘만 남기기 (§6)
- ❌ mockup 픽셀 단위 복제 — mockup 은 **시각 참조**. 단 §2 HEX 값·§5 마크업 계약·§4.4 breakpoint 동작은 **준수 필수**

---

## 8. mockup 참조

- **파일: `docs/design/mockups/incident-triage-history-BF-808.html`**
- 단일 self-contained HTML (외부 link/script 0건, system font) — `file://` 로 더블클릭해 바로 열림
- 포함 내용:
  - 인시던트 카드 3건 = 기획 §4.4 fixture 그대로 (`INC-1001` 완료 / `INC-1002` 진행중 / `INC-1003` 차단) — **5단계 인계 타임라인 시각 표시**
  - 종합 상태 배지 3종 + Stage 상태 배지 4종 전부 등장
  - `not_started` 행의 `-` placeholder, `blocked` 행 강조, reviewer PR = developer PR 동일 URL(EC-04) 시각 확인
  - 하단 부록 섹션: 상태 배지·노드 형태 레퍼런스, 링크 hover/focus 상태, 빈 목록(EmptyState) 미리보기
- mockup 의 `:root` 는 §7.1 과 **동일 HEX** — dev 는 mockup 의 `<style>` 을 참조 구현 가이드로 사용 가능

---

## 9. AC ↔ UI 매핑 표

| AC (기획 §8) | 요구 | 본 시안 대응 | mockup 확인 위치 |
|--------------|------|--------------|------------------|
| **AC-01** 카드 목록 렌더링 | fixture 순서대로 N카드 · 각 5 Stage 고정 순서 | §4.1 `.ith-list` `<ul>` / §4.3 `<ol class="ith-timeline">` 5행 | 본문 카드 3건 |
| **AC-02** Stage 6필드 표시 | 역할·상태배지·담당자·시각·Jira·PR | §4.4 6열 그리드 / §5.3 자식 6개 | 각 Stage 행 |
| **AC-03** 종합 상태 배지 | `deriveIncidentStatus` 값과 일치 | §5.1 `data-overall` — **파생값만 신뢰, 재계산 금지** | 카드 우측 상단 배지 |
| **AC-04** null 필드 `-` 처리 | 빈 `<a>` 생성 금지 | §5.3 null 처리 / §5.4 `.ith-empty-value` | INC-1002·1003 의 리뷰·테스트 행 |
| **AC-05** Jira/PR 링크 | `target="_blank" rel="noopener"`, fetch 없음 | §5.4 | 완료 Stage 의 `BF-9xx` / `PR 보기 ↗` |
| **AC-06** reviewer PR = developer PR | 동일 URL | §5.4(디자인 제약 없음, fixture 준수) — 시각적으로 같은 라벨 | INC-1001 개발·리뷰 행 (동일 `#203`) |
| **AC-07** 빈 목록 | 안내 문구 | §5.5 `EmptyState` | mockup 부록 §C |
| **AC-08** 기존 도구 백링크 | `../index.html` 이동 | §4.1 `.ith-backlink` | 헤더 좌측 상단 |
| **AC-09** 반응형 320–480px | 가로 스크롤 0, 세로 재배치 | §4.4 ≤480px 세로 스택 + `overflow-wrap:anywhere` | 창 폭 축소 시 |
| **AC-10** 기존 파일 보존 | diff 0 | §1.1 · §7.4 — 토큰 **값 복제**, import 없음 | — (본 PR 은 `docs/design/**` 만 변경) |
| **AC-11** file:// 호환 | 외부 요청 0건 | §3 system font · §8 self-contained mockup | mockup 자체가 증거 |

---

## 10. Self-critique

| # | 점검 항목 | 결과 |
|---|-----------|------|
| 1 | **AC 매핑** — 기획 §8 AC-01~11 전부 시안에 대응되는가 | ✅ §9 표 11행 전부 매핑. AC-06/AC-10 은 디자인이 아닌 fixture·범위 제약이라 "디자인 제약 없음"으로 명시 |
| 2 | **dev 구현 가이드** — dev 가 추측 없이 따라갈 수 있는가 | ✅ §7.1 `:root` 복붙 가능 블록 + §7.2 클래스/`data-` 계약 + §7.3 단계 순서 + §7.4 금지 목록 |
| 3 | **기존 요소 보존** — 기존 4개 파일 미변경 원칙이 시안에 반영됐는가 | ✅ §1.1·§7.4 에 명시. 토큰은 import 가 아니라 **값 복제**로 설계(vanilla-static + AC-10 동시 충족) |
| 4 | **컴포넌트 매핑** — 기획 §4.2 6필드 / §2.2 4상태 / §2.1 5역할이 컴포넌트로 빠짐없이 표현됐는가 | ✅ §5.3(6필드) · §5.2(4상태 + 한글 라벨 고정 매핑) · §5.3(5역할 라벨 매핑). 종합↔Stage 배지 시각 구분(기획 §14)은 size variant(`--overall` 13px/700 vs `--stage` 12px/600 + 위치)로 해결 |
| 5 | **모호함 flag** | ⚠️ **1건**: task 설명의 "dark navy" vs 실제 코드/PR #141 의 밝은 중립 톤 불일치 → §1.3 에 flag, **코드 실물을 source of truth 로 밝은 톤 채택**, §2.4 에 다크 대안 팔레트를 `:root` 값 교체만으로 전환 가능하게 준비. 운영자/reviewer 판단 요청 |
| | (부수) 파일명 | ⚠️ 명세 md 는 AC 문구대로 `...-BF-806.md`, mockup 은 designer task 키 `...-BF-808.html`. 의도된 불일치이며 문서 상단·§8 에 명시 |

---

*문서 종료 — [이디자인] · BF-808*
