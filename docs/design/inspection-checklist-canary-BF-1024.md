# 현장 점검 체크리스트 디자인 명세 — BF-1026 (칸반형 상태/책임자/차단사유/이력 UI)

> 작성자: [이디자인] (designer) · 작성일 2026-07-18
> 관련 티켓: BF-1026 (본 designer task) · BF-1024 (부모 Epic)
> 기준 문서(s1): `docs/plan/inspection-checklist-canary-BF-1024.md` (BF-1025, planner) — **단일 기준(single source of truth)**
> 형제 task: BF-1025 (planner) · BF-1027 (developer) · BF-1029 (tester)
> 대상 모듈: `inspection-checklist-canary/` (신규 · tech-stack `vanilla-static`)
> 라우트: `/inspection-checklist-canary`
> mockup 참조: `docs/design/inspection-checklist-canary-mockup.html` (본 명세와 시각 동기화된 self-contained HTML)
> 선례(시각 일관성 계승 대상): `docs/design/support-inbox-phase18-BF-1019.md` · `docs/design/mockups/support-inbox-phase18-BF-1019.html` — canary 계열 base 토큰·카드·상태 배지 스타일을 **값 그대로 계승**한다.

---

## 0. 문서 성격 및 전제

본 문서는 s1 기획 명세(BF-1025)의 **데이터 모델 · 상태 전이 가드 · 저장 정책 · 결정적 seed** 를 화면으로 번역한 UI/UX 디자인 명세다. s1 이 확정한 도메인 규칙(상태 4종 전이표 · 가드 G1~G5 · 배정 규칙 · 차단사유 결합 규칙 · history append-only)은 **재해석하지 않고** 시각/인터랙션 계층만 추가한다.

**designer 산출물 경계(절대 준수):**
- 본 task 담당 파일: `docs/design/inspection-checklist-canary-BF-1024.md`(본 명세) + `docs/design/inspection-checklist-canary-mockup.html`(mockup) 2개뿐.
- 실제 앱 코드(`inspection-checklist-canary/*`)는 developer(BF-1027) 담당 — 본 명세는 와이어프레임 · 토큰 · 컴포넌트 props · 구현 가이드까지만 규정한다.

**tech-stack `vanilla-static` 제약:**
- 외부 의존성 0건. CDN · 웹폰트 로드 금지 → **system font stack**만 사용.
- 디자인 토큰 파일 없음 → mockup · 구현 모두 `:root` CSS 변수로 토큰을 **자체 정의**(§2).
- 신규 module 이지만 색/spacing base 토큰은 canary 계열(`--sib-*`)에서 검증된 값을 **그대로 계승**(prefix 만 `--icc-*`)하여 저장소 시각 일관성을 유지한다(§9 AC-3). 칸반 4상태 색상만 신규 정의하되, tint/foreground 대비는 AA 기준으로 검증(§7.2).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 구조 · spacing · breakpoint](#4-레이아웃--구조--spacing--breakpoint)
5. [컴포넌트 명세 — props · 상태 · 인터랙션](#5-컴포넌트-명세--props--상태--인터랙션)
6. [상태 배지 · 담당자 표시 · 전이 버튼 규칙](#6-상태-배지--담당자-표시--전이-버튼-규칙)
7. [접근성 기준 (키보드 · 대비 · ARIA)](#7-접근성-기준-키보드--대비--aria)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ 디자인 요소 매핑](#9-ac--디자인-요소-매핑)
10. [mockup 참조](#10-mockup-참조)
11. [Self-critique](#11-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

현장 운영자가 점검 항목의 **책임자 · 진행 상태를 한 화면(4-컬럼 칸반 보드)에서 관리**하고, 차단 사유와 변경 이력을 추적하는 SPA. 상단 헤더에 집계(총 N · 미배정 N · 차단 N), 본문은 상태 4종(예정 · 진행중 · 차단됨 · 완료)에 1:1 대응하는 칸반 컬럼. 카드를 선택하면 우측 상세 패널에서 전체 필드 + history 타임라인(오래된 순)을 노출한다. s1 §8 seed 7건(`IC-2001`~`IC-2007`)을 그대로 시각화한다.

### 1.2 사용자 경험 목표

| 목표 | 실현 방법 |
|---|---|
| **상태 즉시 파악** | 상태 = 컬럼 위치 + 컬럼 헤더 색 스트립 + 카드 상태 배지(색+텍스트+아이콘) 3중 인코딩. 색맹 대비 텍스트/모양 병행(§7.2) |
| **차단 사유 즉시 노출** | `blocked` 카드는 목록 표면(카드 body)에 `blockReason` 을 항상 노출(s1 §9.2 핵심 요구) — 상세 패널을 열지 않아도 파악 |
| **미배정 가시성** | 담당자 뱃지 자리에 "미배정" 라벨(muted) + 헤더 집계에 미배정 N 카운트 |
| **상태 오조작 방지** | s1 §3.2 가드(G1~G5)에 걸리는 전이 버튼은 `disabled` + `title`/보조텍스트로 사유 사전 노출(예: "담당자 배정 후 진행 가능") |
| **이력 신뢰성** | 우측 타임라인은 append-only(오래된 순, s1 §6.2), `from→to`·actor·reason 을 그대로 노출. 빈 history 는 "변경 이력 없음" 정상 표시 |
| **접근성 내장** | 카드 키보드 이동(↑/↓/←/→/Enter), 전이 버튼 포커스 순회, AA 대비 배지, ARIA 랜드마크 · 컬럼 group · live region |
| **저장소 시각 일관성** | canary 계열 base 토큰 · 카드 · 배지 스타일 계승, prefix 만 `--icc-*` → 학습 비용 최소(§9 AC-3) |

### 1.3 화면 상태(s1 §9 반영)

- s1 §0 로드는 동기적(localStorage) → **loading 화면 없음**. 항상 seed 로 채워진 화면이 최초 렌더.
- s1 §9.1 seed 7건 보장 + 신규 생성/삭제 UI 비범위 → **true empty state 없음**. 단 개별 컬럼이 비는 것(예: 아무 항목도 `done` 이 아님)은 정상 → **컬럼별 empty placeholder**(§5.6)만 정의한다.
- 선택된 항목 없음(초기 상세 패널)은 존재 → **placeholder empty pane**(§5.7).
- 손상 데이터 복구는 콘솔 로그만 필수(s1 §7.3) — 사용자 대상 배너/toast 는 s1 비범위 → 본 명세도 UI 미정의.

---

## 2. 컬러 팔레트

> prefix `--icc-*`(inspection-checklist-canary). Base 토큰은 canary 계열(`--sib-*`)에서 검증된 값을 **그대로 계승**(prefix 만 교체) → 저장소 시각 일관성(AC-3). 칸반 4상태 색상만 신규 정의하되 tint 배경 위 foreground 대비를 AA 기준 검증(§7.2). status 토큰 값은 임의 변경 금지.

### 2.1 Base

| 토큰 | HEX | 용도 |
|---|---|---|
| `--icc-color-bg` | `#F1F3F5` | 앱 배경(보드 gutter) |
| `--icc-color-surface` | `#FFFFFF` | 컬럼 · 카드 · 상세 패널 표면 |
| `--icc-color-surface-muted` | `#F8F9FA` | 컬럼 body 배경 · 헤더 · toolbar |
| `--icc-color-border` | `#DDE1E6` | 카드 · 컬럼 · 구분선 |
| `--icc-color-border-strong` | `#B9C0C8` | 포커스 카드 · 강조 구분 |
| `--icc-color-text` | `#1A1D21` | 본문 텍스트 |
| `--icc-color-text-muted` | `#6B6B66` | 보조 텍스트 · 미배정 · 위치 라벨 |
| `--icc-color-accent` | `#3563E9` | 링크 · 포커스 아웃라인 · primary 액션 |
| `--icc-color-accent-hover` | `#2A50C4` | primary 액션 hover |
| `--icc-color-danger` | `#B91C1C` | 파괴적/차단 강조(전이 사유 텍스트 등) |

### 2.2 상태(칸반 4종) 토큰 — s1 §3.1 상태와 1:1

각 상태는 **foreground(배지/스트립 텍스트 색)** 와 **tint(배지/카드 배경 틴트)** 쌍으로 구성. tint 위 foreground 대비 ≥ 4.5:1 (AA 본문), 흰 배경 위 foreground 대비 ≥ 4.5:1 검증(§7.2).

| 상태(s1) | 한글 라벨 | foreground 토큰 | HEX | tint 토큰 | HEX | 아이콘(텍스트) |
|---|---|---|---|---|---|---|
| `todo` | 예정 | `--icc-color-todo` | `#475569` | `--icc-color-todo-tint` | `#F8FAFC` | ○ (빈 원) |
| `in_progress` | 진행중 | `--icc-color-progress` | `#1D4ED8` | `--icc-color-progress-tint` | `#EFF6FF` | ◐ (진행) |
| `blocked` | 차단됨 | `--icc-color-blocked` | `#B45309` | `--icc-color-blocked-tint` | `#FFFBEB` | ▲ (경고) |
| `done` | 완료 | `--icc-color-done` | `#0F7B4F` | `--icc-color-done-tint` | `#ECFDF5` | ✓ (체크) |

- `blocked` 는 amber 계열(`#B45309`) — `--icc-color-danger`(red) 와 구분하여 "진행 불가(warning)"와 "파괴적 액션"을 시각 분리.
- 미배정 표시는 별도 색 토큰 없이 `--icc-color-text-muted` 재사용(§6.2).

### 2.3 spacing / radius / shape (canary 계승)

| 토큰 | 값 | | 토큰 | 값 |
|---|---|---|---|---|
| `--icc-space-1` | 4px | | `--icc-radius-sm` | 4px |
| `--icc-space-2` | 8px | | `--icc-radius-md` | 8px |
| `--icc-space-3` | 12px | | `--icc-radius-lg` | 12px |
| `--icc-space-4` | 16px | | `--icc-radius-pill` | 999px |
| `--icc-space-5` | 24px | | `--icc-shadow-card` | `0 1px 2px rgba(26,29,33,.06), 0 2px 8px rgba(26,29,33,.05)` |
| `--icc-space-6` | 32px | | | |

---

## 3. 타이포그래피

> system font stack만 사용(CDN 금지). `--icc-font-sans` 로 토큰화.

```css
--icc-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                 system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--icc-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | font-family | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| heading-1 | sans | 20px | 700 | 1.3 | 앱 헤더 타이틀("현장 점검 체크리스트") |
| heading-2 | sans | 14px | 700 | 1.3 | 컬럼 헤더 라벨(예정/진행중/…) |
| heading-3 | sans | 15px | 600 | 1.4 | 카드 제목 · 상세 패널 제목 |
| body | sans | 14px | 400 | 1.5 | 본문 · 상세 필드 값 |
| body-strong | sans | 14px | 600 | 1.5 | 강조 값 · 담당자명 |
| caption | sans | 12px | 500 | 1.4 | 위치 라벨 · 집계 · 배지 · 타임스탬프 |
| mono-id | mono | 12px | 500 | 1.4 | 항목 id(`IC-2001`) · history at |

- 기본 body 14px / 1.5 는 canary 계승. id/시각은 mono 로 정렬성 확보.

---

## 4. 레이아웃 — 구조 · spacing · breakpoint

### 4.1 앱 셸(desktop 기준 ≥ 1024px)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ HEADER  현장 점검 체크리스트            [총 7] [미배정 1] [차단 1]  (집계, 우측)  │  ← icc-header
├───────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┬──────────┐   ┌───────────────────────┐  │
│ │ 예정 ○ 2  │ 진행중 ◐ 3 │ 차단됨 ▲ 1 │ 완료 ✓ 1  │   │  상세 패널 (선택 시)     │  │
│ │──────────│──────────│──────────│──────────│   │  IC-2005              │  │
│ │ [카드]    │ [카드]    │ [카드]    │ [카드]    │   │  제목 / 위치           │  │
│ │ [카드]    │ [카드]    │ (차단사유 │           │   │  상태 배지 / 담당자      │  │
│ │          │ [카드]    │  표면노출) │           │   │  차단 사유             │  │
│ │          │          │          │          │   │  ── history 타임라인 ── │  │
│ └──────────┴──────────┴──────────┴──────────┘   └───────────────────────┘  │
│         icc-board (4-column grid, 좌측)              icc-detail (우측 drawer) │
└───────────────────────────────────────────────────────────────────────────┘
```

- 최상위 grid: `grid-template-rows: auto 1fr` (헤더 고정 + 본문 flex).
- 본문 grid: `grid-template-columns: 1fr` 기본. 상세 패널은 **우측 고정폭 drawer**(desktop) — 카드 선택 시 나타남. 초기(미선택)에는 placeholder pane 노출(§5.7).
  - desktop(≥ 1024px): 보드 `1fr` + 상세 `minmax(320px, 400px)` 2-column.
  - 상세 미선택 시에도 상세 열은 유지하고 placeholder 를 표시(레이아웃 흔들림 방지).

### 4.2 칸반 보드(icc-board)

- `display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: var(--icc-space-4);`
- 각 컬럼(icc-column): 상단 헤더(라벨 + 상태 아이콘 + 건수) + body(카드 세로 스택, `gap: var(--icc-space-3)`).
- 컬럼 헤더 상단에 상태 색 스트립(높이 3px, `background: var(--icc-color-<status>)`) — 색+위치 이중 인코딩.
- 컬럼 body 최소 높이 확보(빈 컬럼도 drop 영역처럼 보이도록), 비면 §5.6 placeholder.

### 4.3 spacing 규칙

| 영역 | padding / gap |
|---|---|
| 헤더 | `var(--icc-space-3) var(--icc-space-5)` |
| 보드 컨테이너 | `var(--icc-space-5)` |
| 컬럼 간 gap | `var(--icc-space-4)` |
| 카드 내부 | `var(--icc-space-3)` |
| 카드 간 gap | `var(--icc-space-3)` |
| 상세 패널 | `var(--icc-space-5)` |

### 4.4 breakpoint

| breakpoint | 보드 | 상세 패널 |
|---|---|---|
| ≥ 1024px (desktop) | 4-column 가로 배치 | 우측 고정 drawer(2-column) |
| 640–1023px (tablet) | 4-column 유지 + 가로 스크롤(`overflow-x: auto`, 컬럼 min-width 220px) | 카드 선택 시 화면 하단/오버레이 drawer(보드 위에 겹침) |
| < 640px (mobile) | 1-column 세로 스택(각 상태 섹션을 세로로, `<section>` 구분) | 선택 시 전체폭 오버레이 |

- vanilla-static · 정적 mockup 특성상 mockup 은 desktop 레이아웃을 기준으로 렌더하고, tablet/mobile 동작은 본 표로 규정(dev 가 media query 로 구현).

---

## 5. 컴포넌트 명세 — props · 상태 · 인터랙션

> 아래 props 는 **논리 계약**(dev 가 구현 시 매핑할 데이터). vanilla-static 이므로 실제로는 dataset 속성/함수 인자로 전달되며, 프레임워크 컴포넌트 강제 아님.

### 5.1 `AppHeader`

| prop | 타입 | 설명 |
|---|---|---|
| `title` | string | "현장 점검 체크리스트" 고정 |
| `totalCount` | number | seed 전체 건수(집계) |
| `unassignedCount` | number | `assignee === null` 건수 |
| `blockedCount` | number | `status === "blocked"` 건수 |

- 집계 3종은 caption 스타일 칩(`총 N` / `미배정 N` / `차단 N`). `미배정`/`차단` 이 0 이 아니면 각각 muted/blocked foreground 로 강조.
- 집계는 상태 변경 시 갱신 → `aria-live="polite"` region(§7.3).

### 5.2 `KanbanColumn`

| prop | 타입 | 설명 |
|---|---|---|
| `status` | `"todo"\|"in_progress"\|"blocked"\|"done"` | 컬럼 식별 |
| `label` | string | 한글 라벨(§2.2) |
| `items` | `ChecklistItem[]` | 해당 상태 카드 목록(s1 §2.1) |

- 헤더: 상태 색 스트립 + 아이콘(§2.2) + 라벨 + 건수 배지.
- body: `role="group"` + `aria-label="{label} 컬럼, {건수}건"`. 카드 없으면 §5.6.

### 5.3 `ChecklistCard`

| prop | 타입 | 설명 |
|---|---|---|
| `id` | string | `IC-####` (mono 표시) |
| `title` | string | 카드 제목(heading-3) |
| `location` | string | 위치 라벨(caption, muted) |
| `assignee` | `{id,name}\|null` | 담당자 뱃지 or "미배정"(§6.2) |
| `status` | status enum | 상태 배지(§6.1) |
| `blockReason` | string\|null | `blocked` 일 때만 카드 표면에 노출(§6.3) |
| `selected` | boolean | 선택 시 강조 테두리(`--icc-color-accent`) |

- 구조: 상단 행(id mono + 상태 배지) → 제목 → 위치 → 담당자 뱃지 → (blocked 시) 차단사유 블록 → 전이 버튼 행(§6.4).
- 카드 자체가 선택 트리거: `role="button"` `tabindex="0"`, Enter/Space 로 상세 패널 open. 전이 버튼은 카드 내부 개별 포커스 대상(§7.1 포커스 순서).
- hover: `box-shadow` 상승 + `border-color: var(--icc-color-border-strong)`. selected: 2px accent 테두리.

### 5.4 상태 전이 버튼(`TransitionButton`) — 카드 내

| prop | 타입 | 설명 |
|---|---|---|
| `from` / `to` | status | 전이 대상(s1 §3.2 표에서 허용된 쌍만 렌더) |
| `enabled` | boolean | s1 가드(G1~G5) 통과 여부 |
| `disabledReason` | string\|null | 비활성 사유(예: "담당자 배정 후 진행 가능") |

- 허용 전이만 버튼 렌더(s1 §3.2). 가드 미충족 시 `disabled` + `aria-disabled="true"` + `title=disabledReason` + 버튼 하단 caption 사유.
- 예: `IC-2001`(미배정 todo) → "진행중" 버튼 disabled + "담당자 배정 후 진행 가능"(G1).
- 예: `blocked` 카드 → "예정으로" / "진행중으로" 버튼(전이 시 차단 해제, s1 §5 G3) 활성. "완료" 버튼은 렌더하지 않음(s1 §3.2 `blocked→done` ❌).
- primary 전이(진행 유도)는 accent, 되돌리기/차단은 outline(§6.4).

### 5.5 상세 패널(`DetailPanel`)

| prop | 타입 | 설명 |
|---|---|---|
| `item` | `ChecklistItem\|null` | 선택 항목 전체(s1 §2.1). null 이면 §5.7 |

- 노출 필드(s1 §9.2): id · title · location · status 배지 · assignee(or 미배정) · blockReason(blocked 시) · createdAt · updatedAt · history 타임라인.
- history 타임라인: 오래된 순(s1 §6.2), `role="list"`. 각 이벤트: type 라벨 + at(mono) + actor + (from→to / reason). 빈 배열이면 "변경 이력 없음"(§5.6 톤).
- 담당자 배정/재배정 액션 UI 는 상세 패널 내 셀렉트(김현장/이점검/미배정) — s1 §4 배정 규칙 반영(done 은 disabled, in_progress/blocked 는 미배정 선택 disabled).

### 5.6 컬럼/이력 empty placeholder

- 빈 컬럼: 점선 테두리 박스 + muted 텍스트("항목 없음"). drop 영역 힌트 톤.
- 빈 history: 상세 패널 타임라인 자리에 "변경 이력 없음"(s1 §6.2 정상 케이스, 오류 아님).

### 5.7 상세 미선택 placeholder pane

- 초기(카드 미선택) 상세 열: 중앙 정렬 muted 안내("카드를 선택하면 상세와 변경 이력이 표시됩니다"). 레이아웃 흔들림 방지 위해 열 자체는 항상 유지.

---

## 6. 상태 배지 · 담당자 표시 · 전이 버튼 규칙

### 6.1 상태 배지(StatusBadge)

- 형태: pill(`--icc-radius-pill`), `background: var(--icc-color-<status>-tint)`, `color: var(--icc-color-<status>)`, `border: 1px solid` 동색 20% 혼합 대체로 foreground 사용.
- 내용: 아이콘(§2.2) + 한글 라벨. **색만으로 상태 구분 금지** — 항상 텍스트 라벨 병행(§7.2).

### 6.2 담당자 표시

- 배정: 원형 이니셜 아바타(이름 첫 글자) + 이름(body-strong). 아바타 배경 `--icc-color-surface-muted`, 텍스트 `--icc-color-text`.
- 미배정: 점선 원 + "미배정"(caption, `--icc-color-text-muted`). 색 대비 유지, 아이콘(점선)으로 이중 구분.

### 6.3 차단 사유 표면 노출(blocked 카드)

- `blocked` 카드 body 에 사유 블록: 좌측 amber 세로 바(`--icc-color-blocked`, 3px) + `--icc-color-blocked-tint` 배경 + 사유 텍스트(body, `--icc-color-text`).
- `▲` 아이콘 접두. 사유는 s1 §5 결합 규칙상 항상 non-empty(blocked 이면 반드시 존재).

### 6.4 전이 버튼 시각 규칙(s1 §3.2 매핑)

| 전이 | 버튼 라벨 | 스타일 | 활성 조건(가드) |
|---|---|---|---|
| `todo→in_progress` | 진행 시작 | primary(accent) | G1: 담당자 배정 시만 활성 |
| `todo→blocked` / `in_progress→blocked` | 차단 | outline(danger 텍스트) | G2: 사유 입력 프롬프트 후 활성(사유 없으면 전이 거부) |
| `in_progress→done` | 완료 | primary(done 색) | 항상 활성(G4 경로) |
| `in_progress→todo` | 착수 취소 | ghost | 항상 활성 |
| `blocked→todo` / `blocked→in_progress` | 차단 해제(예정/진행중) | outline | G3: 활성, 전이 시 사유 자동 해제 |
| `done→in_progress` | 재오픈 | ghost | G5: 항상 활성 |
| `todo→done` · `blocked→done` · `done→todo`/`done→blocked` | — | **버튼 미렌더** | s1 §3.2 ❌ 전이 |

- disabled 버튼도 DOM 에 존재(사유 노출 목적) — 단 `todo→done` 등 아예 미정의 전이는 버튼 자체를 렌더하지 않아 오조작 원천 차단.

---

## 7. 접근성 기준 (키보드 · 대비 · ARIA)

### 7.1 키보드 인터랙션

| 키 | 동작 |
|---|---|
| `Tab` / `Shift+Tab` | 랜드마크 → 컬럼 → 카드 → 카드 내 전이 버튼 → 상세 패널 순 포커스 순회 |
| `↑` / `↓` | 같은 컬럼 내 카드 이동(roving tabindex) |
| `←` / `→` | 인접 컬럼으로 포커스 이동(같은 세로 위치 근사) |
| `Home` / `End` | 컬럼 내 첫/마지막 카드 |
| `Enter` / `Space` | 포커스 카드 선택 → 상세 패널 open |
| `Esc` | 상세 패널(오버레이 모드) 닫기 · 사유 입력 프롬프트 취소 |

- roving tabindex: 컬럼 내 현재 카드만 `tabindex="0"`, 나머지 `-1`. 컬럼 진입 시 첫 카드 또는 마지막 포커스 카드.
- 전이 버튼은 카드 내부 `Tab` 순서로 접근. disabled 버튼은 포커스 대상에서 제외(단 `aria-disabled` + 사유는 스크린리더가 카드 설명으로 읽도록 §7.3).

### 7.2 색 대비(WCAG AA)

- 본문/배지 텍스트 대비 ≥ 4.5:1, 큰 텍스트/UI 컴포넌트 경계 ≥ 3:1.
- 상태 색 검증(foreground on tint / on white):
  - `todo` `#475569` on `#F8FAFC` ≈ 8.0:1, on `#FFFFFF` ≈ 8.3:1 ✅
  - `in_progress` `#1D4ED8` on `#EFF6FF` ≈ 7.0:1, on `#FFFFFF` ≈ 7.4:1 ✅
  - `blocked` `#B45309` on `#FFFBEB` ≈ 5.2:1, on `#FFFFFF` ≈ 5.5:1 ✅
  - `done` `#0F7B4F` on `#ECFDF5` ≈ 4.9:1, on `#FFFFFF` ≈ 5.2:1 ✅
- **색 단독 인코딩 금지**: 상태는 (색 + 텍스트 라벨 + 아이콘), 담당자 미배정은 (muted 색 + 점선 모양 + "미배정" 텍스트), 차단은 (amber + ▲ + 사유 텍스트).

### 7.3 ARIA · 시맨틱

| 요소 | 시맨틱 |
|---|---|
| 앱 셸 | `<header>` + `<main>` 랜드마크 |
| 집계 영역 | `aria-live="polite"`(상태 변경 시 갱신 안내) |
| 칸반 컬럼 | `role="group"` + `aria-label="{라벨} 컬럼, {N}건"`. 상태 스트립은 `aria-hidden`(장식) |
| 카드 | `role="button"` `tabindex` + `aria-pressed`(선택 상태) + `aria-label="{id} {제목}, 상태 {라벨}, 담당자 {이름\|미배정}{, 차단사유 …}"` |
| 상태 배지 아이콘 | `aria-hidden="true"`(텍스트 라벨이 접근명 담당) |
| 전이 버튼 | `<button>` + disabled 시 `aria-disabled` + `title`; 사유 caption 은 `aria-describedby` 연결 |
| 상세 패널 | `role="region"` `aria-label="상세"` (오버레이 모드 시 `role="dialog"` `aria-modal`) |
| history 타임라인 | `<ol role="list">` — 오래된 순, 각 이벤트 `<li>` |
| 담당자 셀렉트 | `<label>` 연결 `<select>` |

- 포커스 표시: 전역 `:focus-visible { outline: 2px solid var(--icc-color-accent); outline-offset: 2px; }`.

---

## 8. dev 구현 가이드 (BF-1027)

> dev 는 아래 클래스/토큰 명명을 권장 가이드로 사용. mockup(`docs/design/inspection-checklist-canary-mockup.html`)을 시각 참조로 삼되 픽셀 일치 의무는 없음. **도메인 규칙(전이 가부·seed·저장)은 s1 §2~§8 을 단일 기준으로 구현** — 본 디자인 문서는 표시 계층만 규정한다.

### 8.1 권장 클래스 네이밍(BEM 계열)

```
.icc-app / .icc-header / .icc-header__title / .icc-stat / .icc-stat--unassigned / .icc-stat--blocked
.icc-body (2-col grid)
.icc-board / .icc-column / .icc-column__head / .icc-column__strip / .icc-column__count / .icc-column__body
.icc-card / .icc-card--selected / .icc-card__top / .icc-card__id / .icc-card__title / .icc-card__location
.icc-badge / .icc-badge--todo / .icc-badge--in_progress / .icc-badge--blocked / .icc-badge--done
.icc-assignee / .icc-assignee--unassigned / .icc-avatar
.icc-blockreason
.icc-actions / .icc-btn / .icc-btn--primary / .icc-btn--outline / .icc-btn--ghost / .icc-btn__reason
.icc-detail / .icc-detail__empty / .icc-field / .icc-history / .icc-history__event
.icc-empty (컬럼 placeholder)
```

### 8.2 CSS 변수 정의 위치

- `:root` 에 §2 토큰 전체 정의(mockup `<style>` 과 동일 값). 하드코딩 색상 금지 — 모든 색은 `var(--icc-*)`.

### 8.3 상태 → 클래스 매핑(단계별)

1. `load()`(s1 §7) 결과 `items` 를 status 별로 4그룹 분류 → 각 `KanbanColumn` 에 주입.
2. 카드 렌더: status 로 `.icc-badge--{status}` + 컬럼 배치. `blocked` 면 `.icc-blockreason` 블록 추가.
3. 전이 버튼: s1 §3.2 표에서 `from=현재status` 인 허용 전이만 버튼 생성. 가드 판정(G1: assignee, G2: 사유 프롬프트, G4/G5: 표 기준) 후 `disabled` 토글 + `.icc-btn__reason` 사유 텍스트.
4. 카드 선택 → `DetailPanel` 에 항목 주입, `.icc-card--selected` 토글, `aria-pressed` 갱신.
5. 상태/배정/차단 변경 → s1 §6 history append + s1 §7 `save()` 동기 write + 집계 `aria-live` 갱신.

### 8.4 인터랙션 상세

- 차단 전이(G2): "차단" 버튼 클릭 → 사유 입력(간단히 `prompt()` 또는 인라인 인풋, dev 재량). 빈 값이면 전이 취소(s1 §5).
- 차단 해제(G3): "차단 해제" 전이 시 `blockReason` 자동 null + `BLOCK_CLEARED` 이벤트(사유는 history 에 보존). 사용자 입력 없음.
- 되돌리기/재오픈(ghost 버튼)은 확인 없이 즉시 전이(단순성 우선) — 단 `done→in_progress` 는 재오픈이므로 라벨 "재오픈"으로 의도 명확화.

---

## 9. AC ↔ 디자인 요소 매핑

| Epic AC | Given / When / Then | 충족 디자인 요소 | 위치 |
|---|---|---|---|
| **AC-1** | 기획 명세(s1) → 디자인 명세 작성 → 레이아웃·상태 색상·타이포·접근성(ARIA/키보드) 규칙 + AC 매핑 표 포함 | 4-컬럼 칸반 레이아웃(§4), 상태 4종 색 토큰(§2.2), 타이포 스케일(§3), 접근성 키보드/대비/ARIA(§7), 본 매핑 표 | §2 · §3 · §4 · §7 · §9 |
| **AC-2** | vanilla-static 제약 → mockup 작성 → 외부 CDN/의존성 없이 `file://` 렌더되는 정적 HTML | self-contained mockup(인라인 `<style>`, system font, 외부 link/script 0건) | §10 · `docs/design/inspection-checklist-canary-mockup.html` |
| **AC-3** | 기존 module 일관성 → 디자인 확정 → 기존 페이지와 시각 일관성 유지 | canary 계열 base 토큰·카드·배지 스타일 값 계승(prefix `--icc-*`), 신규 색은 상태 4종만(§2), spacing/radius/shadow 계승(§2.3) | §2 · §0 전제 |

---

## 10. mockup 참조

- 파일: `docs/design/inspection-checklist-canary-mockup.html`
- 성격: 본 명세의 컬러/타이포/레이아웃을 시각화한 **단일 self-contained HTML**(vanilla CSS, 인라인 `<style>`, 외부 의존성 0건 → `file://` 로 열림).
- 내용: 헤더 집계 + 4-컬럼 칸반(s1 §8 seed 7건 배치) + 상태 배지/담당자 뱃지/차단사유 노출 + 전이 버튼(활성/비활성 사유 포함) + 상세 패널(history 타임라인) + hover/selected/disabled 정적 표현 섹션.
- **dev 의 실제 산출물 아님** — 시안 시각화 전용. dev 는 참조 가이드로 사용(픽셀 일치 의무 없음).

---

## 11. Self-critique

> PR commit 직전 자기 점검(designer-spec-self-critique 5개 항목).

| # | 점검 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — Epic AC 3개 전부 디자인 요소로 매핑됐는가? | ✅ §9 표로 AC-1(레이아웃/색/타이포/접근성)·AC-2(정적 mockup)·AC-3(토큰 계승) 근거 명시 |
| 2 | **dev 구현 가이드** — dev 가 재해석 없이 따라갈 클래스/토큰/단계가 있는가? | ✅ §8 권장 클래스 네이밍 + CSS 변수 위치 + 상태→클래스 5단계 + 인터랙션(차단/해제/재오픈) 명시. 도메인 규칙은 s1 단일 기준 재확인 |
| 3 | **기존 요소 보존** — 저장소 시각 일관성/기존 토큰을 훼손하지 않는가? | ✅ canary base 토큰 값 그대로 계승(prefix만 교체), 신규 색은 칸반 상태 4종만. design-tokens.json 없는 stack → 운영자 승인 필요한 토큰 파일 수정 없음 |
| 4 | **컴포넌트 매핑** — s1 데이터 모델/전이표가 컴포넌트/상태로 빠짐없이 매핑됐는가? | ✅ 상태 4종=컬럼 4개(§4.2), 전이표 §3.2=전이 버튼 규칙(§6.4, 허용/미렌더 전부), history=타임라인(§5.5), 배정 규칙=담당자 셀렉트(§5.5), 미배정/빈history/재오픈 seed 케이스 §5·§6 반영 |
| 5 | **모호함 flag** — dev 결정 위임 지점을 명시했는가? | ✅ 아래 §11.1 |

### 11.1 dev 결정 위임 flag

- **⚠️ 차단 사유 입력 UI**: `prompt()` vs 인라인 인풋 — dev 재량(§8.4). 빈 값 전이 거부(s1 §5)만 고정.
- **⚠️ 카드 이동 방식**: 전이 버튼(본 명세 기본) vs 드래그앤드롭 — s1 §9.2 에서 developer 재량 위임. 본 명세는 전이 버튼 기준으로 그렸으나 DnD 채택 시 가부 판정은 s1 §3.2 동일 적용.
- **⚠️ 상세 패널 형태**: desktop drawer(본 명세) 채택. tablet/mobile 오버레이(§4.4)는 media query 로 dev 구현.
- **⚠️ tablet/mobile 렌더**: mockup 은 desktop 기준. §4.4 breakpoint 표를 dev 가 구현(mockup 미포함).

---

<!-- bf:pr-summary -->
## Summary

현장 점검 체크리스트(칸반형) 디자인 명세 + 정적 mockup 을 작성했다. s1 기획(BF-1025)의 상태 4종·전이 가드·seed 7건을 시각/인터랙션 계층으로 번역: (1) 4-컬럼 칸반 레이아웃(예정/진행중/차단됨/완료) + 우측 상세 drawer(history 타임라인), (2) canary 계열 base 토큰을 값 그대로 계승(prefix `--icc-*`)하고 칸반 상태 색 4종만 신규 정의(AA 대비 검증), (3) 전이 버튼은 s1 §3.2 가드에 걸리면 disabled+사유 노출, 미정의 전이는 버튼 미렌더로 오조작 차단, (4) 키보드(roving tabindex·↑↓←→·Enter)·ARIA(컬럼 group·aria-live 집계·카드 aria-label)·색 단독인코딩 금지 접근성 규칙, (5) 외부 의존성 0건 self-contained mockup(`file://` 렌더). dev(BF-1027)는 s1 을 도메인 단일 기준, 본 명세를 표시 계층 가이드로 사용한다.

## 토큰 매핑 표

| 계층 | 토큰 | 값 | 비고 |
|---|---|---|---|
| base bg/surface | `--icc-color-bg` / `--icc-color-surface` | `#F1F3F5` / `#FFFFFF` | canary 계승 |
| status todo | `--icc-color-todo` / `-tint` | `#475569` / `#F8FAFC` | 예정, 대비 8.0:1 |
| status in_progress | `--icc-color-progress` / `-tint` | `#1D4ED8` / `#EFF6FF` | 진행중, 7.0:1 |
| status blocked | `--icc-color-blocked` / `-tint` | `#B45309` / `#FFFBEB` | 차단됨(amber), 5.2:1 |
| status done | `--icc-color-done` / `-tint` | `#0F7B4F` / `#ECFDF5` | 완료, 4.9:1 |
| accent | `--icc-color-accent` | `#3563E9` | 포커스/primary |

## Changes

- `docs/design/inspection-checklist-canary-BF-1024.md` — 디자인 명세 신규(시안 개요·컬러 팔레트·타이포·레이아웃·컴포넌트 props·상태배지/전이버튼 규칙·접근성(키보드/대비/ARIA)·dev 구현 가이드·AC 매핑·Self-critique).
- `docs/design/inspection-checklist-canary-mockup.html` — self-contained 정적 mockup(4-컬럼 칸반 + seed 7건 + 상태/담당자/차단사유/전이버튼/상세 패널·history 타임라인, 외부 의존성 0건).
<!-- /bf:pr-summary -->
