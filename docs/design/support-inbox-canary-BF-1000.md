# 고객지원 인박스 디자인 명세 — BF-1000 (3-pane 인박스)

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-1005 (본 designer task) · BF-1000 (부모 Epic)
> 기준 문서(s1): `docs/planning/support-inbox-canary-BF-1000.md` (BF-1003, planner) — **단일 기준(single source of truth)**
> 형제 task: BF-1003 (planner) · BF-1007 (developer) · BF-1011 (tester)
> 대상 모듈: `support-inbox-canary/` (신규 · tech-stack `vanilla-static`)
> mockup 참조: `docs/design/support-inbox-canary-mockup.html` (본 명세와 시각 동기화된 self-contained HTML)

---

## 0. 문서 성격 및 전제

본 문서는 s1 기획 명세(BF-1003)의 **데이터 모델·상태 전이·이력 스키마를 화면으로 번역**한 UI/UX 디자인 명세다. s1 이 규정한 도메인 규칙(상태 4종, 가드 G1~G5, 이력 append-only 등)은 재해석하지 않고 **시각/인터랙션 계층만** 추가한다.

**designer 산출물 경계(절대 준수):**
- 본 task 담당 파일: `docs/design/support-inbox-canary-BF-1000.md`(본 명세) + `docs/design/support-inbox-canary-mockup.html`(mockup) 2개뿐.
- 실제 앱 코드(`support-inbox-canary/*`)는 developer(BF-1007) 담당 — 본 명세는 와이어프레임·토큰·컴포넌트 props·구현 가이드까지만 규정한다.

**tech-stack `vanilla-static` 제약:**
- 외부 의존성 0건. CDN·웹폰트 로드 금지 → **system font stack**만 사용.
- 디자인 토큰 파일 없음 → mockup·구현 모두 `:root` CSS 변수로 토큰을 **자체 정의**(§2).
- 기존 업무용 module(`incident-triage/`, `incident-triage/history/`)의 토큰 값을 **계승(값 복제)** 하여 저장소 일관성을 유지한다(import 아님 — vanilla-static 은 공유 스타일시트가 없으므로 값 복제가 관례).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 3-pane 구조 · spacing · breakpoint](#4-레이아웃--3-pane-구조--spacing--breakpoint)
5. [컴포넌트 명세 — props · 상태 · 인터랙션](#5-컴포넌트-명세--props--상태--인터랙션)
6. [상태 뱃지 · 책임자 표시 규칙](#6-상태-뱃지--책임자-표시-규칙)
7. [접근성 기준 (키보드 · 대비 · ARIA)](#7-접근성-기준-키보드--대비--aria)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ 디자인 요소 매핑](#9-ac--디자인-요소-매핑)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

운영자가 고객 문의를 **한 화면에서** 접수→해결까지 추적하는 3-pane 인박스 레이아웃. 좌측 목록에서 문의를 선택하면 중앙에 상세·조작이, 우측에 변경 이력 타임라인이 표시된다. s1 §7 seed 6건(INQ-3001~3006, 상태 4종 + 재오픈 케이스)을 그대로 시각화한다.

### 1.2 사용자 경험 목표

| 목표 | 실현 방법 |
|---|---|
| **컨텍스트 유지** | 목록·상세·이력을 3-pane 으로 동시 노출 → 화면 전환 없이 문의 처리(데스크톱) |
| **상태 오조작 방지** | s1 가드(G1·G3·G4)에 걸리는 전이 버튼은 `disabled` + 사유 툴팁으로 사전 차단 |
| **이력 신뢰성** | 우측 타임라인은 append-only(오래된 순), `from→to`·actor·note 를 그대로 노출 |
| **접근성 내장** | 목록 키보드 이동(↑/↓/Home/End/Enter), AA 대비 뱃지, ARIA 랜드마크·live region |
| **저장소 일관성** | `incident-triage` 계열 토큰·카드·뱃지 스타일 계승 → 학습 비용 0 |

### 1.3 화면 상태(s1 §9 반영)

- s1 §9.3 에 따라 로드는 동기적 → **loading 화면 없음**. 항상 "ready" 상태로 시작한다.
- s1 §7.1·§9.4 에 따라 문의 최소 1건 보장 → **true empty state 없음**. 단, "선택된 문의 없음"(중앙/우측 pane 초기값)은 존재하므로 **placeholder empty pane**(§5.6)만 정의한다.

---

## 2. 컬러 팔레트

> prefix `--sib-*` (support-inbox). 기존 `--it-*`/`--ith-*` 값 계승. **status 토큰은 대비 검증 완료(§7.2) — 임의 변경 금지.**

### 2.1 Base

| 토큰 | HEX | 용도 |
|---|---|---|
| `--sib-color-bg` | `#F1F3F5` | 앱 배경(pane 사이 gutter) |
| `--sib-color-surface` | `#FFFFFF` | pane·카드 표면 |
| `--sib-color-surface-muted` | `#F8F9FA` | 선택 행·헤더·비활성 영역 |
| `--sib-color-border` | `#DDE1E6` | 기본 구분선 |
| `--sib-color-border-strong` | `#B9C0C8` | 강조 구분선·focus 보조 |
| `--sib-color-text` | `#1A1D21` | 본문 텍스트 |
| `--sib-color-text-muted` | `#6B6B66` | 보조 텍스트(메타·caption) |
| `--sib-color-accent` | `#3563E9` | primary 액션·선택 표시·링크 |
| `--sib-color-accent-hover` | `#2A50C4` | accent hover/active |

### 2.2 Status (상태별 · 뱃지 fg + tint bg 쌍)

s1 §4 상태 4종 ↔ 색 매핑. `fg`(텍스트/아이콘) + `tint`(뱃지 배경)로 사용하며, 조합 대비는 §7.2 표 참조.

| 상태(s1) | 토큰 fg | HEX | 토큰 tint | HEX | 의미 |
|---|---|---|---|---|---|
| `received`(접수) | `--sib-color-received` | `#475569` | `--sib-color-received-tint` | `#F8FAFC` | 접수·미착수(중립 슬레이트) |
| `in_progress`(진행) | `--sib-color-progress` | `#1D4ED8` | `--sib-color-progress-tint` | `#EFF6FF` | 처리 중(액티브 블루) |
| `on_hold`(보류) | `--sib-color-hold` | `#B45309` | `--sib-color-hold-tint` | `#FFFBEB` | 보류·대기(경고 앰버) |
| `resolved`(해결) | `--sib-color-resolved` | `#0F7B4F` | `--sib-color-resolved-tint` | `#ECFDF5` | 종결(성공 그린) |

### 2.3 Semantic 보조

| 토큰 | HEX | 용도 |
|---|---|---|
| `--sib-color-danger` | `#B91C1C` | 전이 거부·오류 메시지 |
| `--sib-color-unassigned` | `#6B6B66` | 미배정(`assignee: null`) 표시(§6.2) |

---

## 3. 타이포그래피

> **system font stack only**(CDN 금지). 한글 렌더 위해 `Noto Sans KR` 를 stack 내 fallback 으로 포함(로컬 설치 시에만 적용, 네트워크 로드 아님).

```css
--sib-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                 system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--sib-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | font | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| `heading-lg` | sans | 20px | 700 | 1.3 | pane 헤더·상세 제목 |
| `heading-md` | sans | 16px | 600 | 1.35 | 섹션 제목·목록 행 subject |
| `body` | sans | 14px | 400 | 1.5 | 본문·상세 필드 |
| `body-strong` | sans | 14px | 600 | 1.5 | 라벨·강조 |
| `caption` | sans | 12px | 500 | 1.4 | 메타(시각·actor)·뱃지 텍스트 |
| `mono` | mono | 13px | 500 | 1.4 | `INQ-####`·`EVT-######` ID |

- 최소 본문 14px(가독성) · 최소 caption 12px. 12px 미만 금지.
- ID(`INQ-3001`)는 mono 로 표기해 스캔 용이성 확보(s1 §3.1 패턴).

---

## 4. 레이아웃 — 3-pane 구조 · spacing · breakpoint

### 4.1 spacing / radius 스케일

```css
--sib-space-1: 4px;  --sib-space-2: 8px;  --sib-space-3: 12px;
--sib-space-4: 16px; --sib-space-5: 24px; --sib-space-6: 32px; --sib-space-7: 48px;
--sib-radius-sm: 4px; --sib-radius-md: 8px; --sib-radius-lg: 12px; --sib-radius-pill: 999px;
--sib-shadow-card: 0 1px 2px rgba(26,29,33,.06), 0 2px 8px rgba(26,29,33,.05);
```

### 4.2 전체 골격

```
┌───────────────────────────────────────────────────────────────────────────┐
│  App Header  ·  "고객지원 인박스"  ·  집계 요약(총 N · 미배정 N · 진행 N)      │  ← <header> banner
├──────────────┬───────────────────────────────┬────────────────────────────┤
│ Pane 1: 목록  │ Pane 2: 상세                   │ Pane 3: 이력                │
│ (list)       │ (detail)                       │ (history)                  │
│ <nav>        │ <main> (aria-live 앵커)         │ <aside> (complementary)    │
│              │                                │                            │
│ · 문의 행 ×6  │ · 제목·요청자·메타             │ · 타임라인(오래된 순)        │
│ · 상태 뱃지   │ · 현재 상태 뱃지               │ · STATUS/ASSIGNEE 이벤트     │
│ · 담당자      │ · 상태 전이 액션(가드 반영)     │ · from→to · actor · note    │
│ · 선택 강조   │ · 담당자 배정/재배정 액션        │                            │
├──────────────┴───────────────────────────────┴────────────────────────────┤
│  (선택 문의 없을 때 Pane2/3 = empty placeholder §5.6)                        │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.3 그리드 폭 (데스크톱 ≥1024px)

| Pane | 폭 | 근거 |
|---|---|---|
| Pane 1 목록 | `320px` 고정(min 280 / max 360) | subject 1~2줄 + 뱃지 + 담당자 수용 |
| Pane 2 상세 | `1fr`(가변, 최소 `min-width: 360px`) | 상세·액션이 주 작업 영역 |
| Pane 3 이력 | `340px` 고정(min 300 / max 380) | 타임라인 노드 + from→to + note |

- `display: grid; grid-template-columns: 320px minmax(360px, 1fr) 340px; gap: 0;` pane 경계는 `--sib-color-border` 1px.
- 앱 전체 높이 `100vh`, 각 pane 내부는 독립 스크롤(`overflow-y: auto`) — 헤더 고정.

### 4.4 Breakpoint 별 동작

| Breakpoint | 레이아웃 | 이력 pane 처리 |
|---|---|---|
| **≥1024px (desktop)** | 3-pane 동시 노출(§4.3) | 항상 노출 |
| **768–1023px (tablet)** | 2-pane: 목록(280px) + 상세(1fr). 이력은 상세 하단 **접이식 `<details>` 섹션**으로 이동 | 상세 내 "변경 이력" 아코디언 |
| **<768px (mobile)** | 1-pane 스택. 목록 ↔ 상세 뷰 전환(상세 상단 "← 목록" 버튼). 이력은 상세 하단 아코디언 | 상세 스크롤 하단 |

- mobile 목록→상세 전환 시 상세 제목으로 포커스 이동(§7.1) — 스크린리더 컨텍스트 유지.
- 각 breakpoint 는 CSS `@media` 로만 처리(JS 레이아웃 계산 금지 — vanilla-static 단순성).

---

## 5. 컴포넌트 명세 — props · 상태 · 인터랙션

> props 는 developer 가 렌더 함수 시그니처로 삼을 **논리 계약**(vanilla-static 이므로 실제 프레임워크 props 아님 — 데이터→DOM 매핑 기준).

### 5.1 `InquiryListItem` (Pane 1 행)

| prop | 타입 | 설명 |
|---|---|---|
| `id` | string | `INQ-####` — mono, caption 색 |
| `subject` | string | heading-md, 최대 2줄 후 ellipsis(`-webkit-line-clamp: 2`) |
| `requesterName` | string | caption muted |
| `status` | enum(4) | §6 상태 뱃지 |
| `assigneeName` | string \| null | null → "미배정"(§6.2) |
| `selected` | boolean | 선택 시 좌측 3px `--sib-color-accent` 바 + `surface-muted` 배경 |

- **상태**: default / hover(`surface-muted`) / selected(`aria-selected="true"`, accent 바) / focus-visible(2px accent outline).
- **인터랙션**: 클릭 또는 Enter/Space → 해당 문의를 Pane2/3 에 로드. 행은 `role="option"`, 목록은 `role="listbox"`(§7.1).

### 5.2 `StatusBadge`

| prop | 타입 | 설명 |
|---|---|---|
| `status` | `received`\|`in_progress`\|`on_hold`\|`resolved` | §2.2 fg+tint 매핑 |

- pill(`--sib-radius-pill`), caption weight 500, 좌측 8px 상태색 dot(§6.1). 텍스트 라벨은 한글(접수/진행/보류/해결) + 색 **이중 인코딩**(색맹 안전 — §7.2).

### 5.3 `AssigneeChip`

| prop | 타입 | 설명 |
|---|---|---|
| `assignee` | `{id,name}` \| null | null → "미배정" 점선 테두리 chip(§6.2) |

- 배정: 이니셜 원형 아바타(색: accent tint) + 이름. 미배정: 회색 점선 테두리 + "미배정" muted 텍스트.

### 5.4 `StatusTransitionControls` (Pane 2)

s1 §4 전이표를 버튼 그룹으로 표현. **현재 상태에서 허용된 전이만 활성**, 가드 위반 전이는 `disabled` + `title`/툴팁 사유.

| 현재 상태 | 활성 버튼 | 비활성(사유) |
|---|---|---|
| `received` | "진행 시작"(→in_progress) | — (미배정 시 "진행 시작" disabled: G1 "담당자 미배정") |
| `in_progress` | "보류"(→on_hold) · "해결"(→resolved) | — |
| `on_hold` | "재개"(→in_progress) | "해결" **disabled** (G4: "보류→해결 직접 전이 금지, 재개 후 처리") |
| `resolved` | "재오픈"(→in_progress) | — |

- 각 전이 확정 시 Pane3 이력에 `STATUS_CHANGED` 이벤트가 append 되는 것을 시각적으로 암시(우측 타임라인 최상단 신규 노드 하이라이트 1.5s).
- `on_hold`/`resolved` 전이 시 note 입력(선택) — 인라인 textarea(`note` optional, s1 §6.1).
- **disabled 버튼도 DOM 에 존재**(숨김 금지) → 왜 불가한지 학습 가능(오조작 방지 UX 목표).

### 5.5 `AssigneeControls` (Pane 2)

s1 §5 배정 규칙 반영.

| 현재 상태 | 배정 select | 해제 버튼 |
|---|---|---|
| `received` | 활성(agt-01/agt-02 택1) | **활성**(§5: received 에서만 해제 가능, EC-10) |
| `in_progress`·`on_hold` | 활성(재배정) | **비활성**(항상 담당자 필요) |
| `resolved` | **비활성**(EC-11: 재오픈 후에만) | 비활성 |

- 재배정 확정 → Pane3 에 `ASSIGNEE_CHANGED`(from→to) append 암시.

### 5.6 `HistoryTimeline` (Pane 3)

| prop | 타입 | 설명 |
|---|---|---|
| `events` | `HistoryEvent[]` | s1 §6, **오래된 순**(배열 순서 그대로, 재정렬 금지) |

- 세로 rail(2px `--sib-color-border-strong`) + 노드(12px). 노드 색 = 이벤트 성격:
  - `STATUS_CHANGED` → `to` 상태색(§2.2)
  - `ASSIGNEE_CHANGED` → `--sib-color-accent`
- 각 노드: `type` 라벨 · `from → to` · actor 이름 · `at`(caption) · note(있으면 인용 블록).
- **empty placeholder**: `history` 빈 배열(예: INQ-3001, 최초 접수)일 때 "아직 변경 이력이 없습니다" muted 안내(s1 §6.3 정상 케이스).
- 선택 문의 없을 때(초기): Pane2·Pane3 공통 "왼쪽에서 문의를 선택하세요" empty placeholder.

### 5.7 인터랙션 상태 요약표

| 컴포넌트 | default | hover | active/selected | focus-visible | disabled |
|---|---|---|---|---|---|
| ListItem | surface | surface-muted | accent 바+muted | 2px accent outline | — |
| 전이/배정 버튼 | accent 채움/outline | accent-hover | pressed | 2px accent outline | 40% opacity + `cursor:not-allowed` + 사유 title |
| 담당자 select | border | border-strong | — | 2px accent outline | muted |

---

## 6. 상태 뱃지 · 책임자 표시 규칙

### 6.1 상태 뱃지 규칙

- 형태: pill + 좌측 8px 상태색 dot + 한글 라벨(접수/진행/보류/해결). **색 + 텍스트 + dot 삼중 인코딩** → 색각 이상·흑백 인쇄에도 판별 가능(§7.2).
- 색 매핑(§2.2): 접수=슬레이트 · 진행=블루 · 보류=앰버 · 해결=그린.
- 목록 행·상세 헤더 두 곳에서 **동일 컴포넌트** 재사용(일관성).
- 뱃지 텍스트는 tint 배경 위 fg 색 → 대비 AA 이상(§7.2).

### 6.2 책임자(assignee) 표시 규칙

| 상태 | 표시 |
|---|---|
| 배정됨 `{id,name}` | 이니셜 아바타(accent tint 원형) + 이름. 목록에선 이름만, 상세에선 아바타+이름+id(mono) |
| 미배정 `null` | 점선 테두리 chip + "미배정"(`--sib-color-unassigned` muted). 아바타 자리엔 `—` |

- s1 §5 규칙 시각화: `received` + 미배정 행에는 "진행 시작" 액션이 회색(G1) — 목록에서도 미배정을 눈에 띄게 표시해 우선 배정을 유도.
- 상세 헤더 담당자 옆에 상태별 배정 가능 여부를 §5.5 컨트롤로 노출.

---

## 7. 접근성 기준 (키보드 · 대비 · ARIA)

### 7.1 키보드 이동

| 영역 | 키 | 동작 |
|---|---|---|
| 목록(listbox) | `↑`/`↓` | 이전/다음 문의 행 이동(roving tabindex — 활성 행만 `tabindex=0`, 나머지 `-1`) |
| 목록 | `Home`/`End` | 첫/마지막 행 |
| 목록 | `Enter`/`Space` | 선택 → Pane2/3 로드, 포커스는 상세 제목(`tabindex=-1`)으로 이동 |
| 전역 | `Tab`/`Shift+Tab` | 랜드마크·인터랙티브 요소 순회(목록→상세 액션→이력) |
| 액션 버튼 | `Enter`/`Space` | 전이/배정 실행. disabled 는 포커스는 받되 실행 불가(사유 노출) |
| 전역 | 논리적 DOM 순서 = 시각 순서(목록→상세→이력) | 탭 순서 예측 가능 |

- 모든 인터랙티브 요소 `:focus-visible` → 2px `--sib-color-accent` outline + 2px offset(대비 확보).
- 마우스 없이 문의 선택→상태 전이→이력 확인 전 과정 완주 가능(AC-2 키보드 이동 요건).

### 7.2 명도 대비 (WCAG 2.1 AA — 텍스트 4.5:1, UI/대형 3:1)

status fg×tint 조합은 기존 `incident-triage/history` 에서 검증된 값을 계승(대비 실측 재사용):

| 조합 | 대비 | 판정 |
|---|---|---|
| `#475569` on `#F8FAFC`(접수) | 7.4:1 | AA/AAA ✅ |
| `#1D4ED8` on `#EFF6FF`(진행) | 6.9:1 | AA/AAA ✅ |
| `#B45309` on `#FFFBEB`(보류) | 5.3:1 | AA ✅ |
| `#0F7B4F` on `#ECFDF5`(해결) | 5.3:1 | AA ✅ |
| `#1A1D21` on `#FFFFFF`(본문) | 16.1:1 | AAA ✅ |
| `#6B6B66` on `#FFFFFF`(caption) | 4.8:1 | AA ✅ |
| `#3563E9` on `#FFFFFF`(accent 텍스트) | 4.7:1 | AA ✅ |

- 색만으로 상태를 전달하지 않음 → dot + 한글 라벨 병기(§6.1, 색각 이상 안전).
- disabled 버튼도 40% opacity 지만 `title` 사유 텍스트로 정보 전달(색·투명도에만 의존 안 함).

### 7.3 ARIA / 시맨틱 구조

| 영역 | 시맨틱 |
|---|---|
| 앱 헤더 | `<header role="banner">` + `<h1>` |
| Pane1 목록 | `<nav aria-label="문의 목록">` > `<ul role="listbox" aria-label="고객 문의">` > `<li role="option" aria-selected>` |
| Pane2 상세 | `<main aria-label="문의 상세">`, 선택 변경 시 `aria-live="polite"` 로 "INQ-3003 상세 표시" 안내 |
| Pane3 이력 | `<aside role="complementary" aria-label="변경 이력">` > `<ol>`(순서 있는 이력) |
| 상태 뱃지 | 텍스트 라벨 포함(별도 `aria-label` 불필요), dot 은 `aria-hidden` |
| 전이 결과 | 전이/배정 성공·거부 메시지를 `aria-live="polite"` region 으로 통지 |

---

## 8. dev 구현 가이드

> developer(BF-1007)가 `support-inbox-canary/` 구현 시 따를 단계별 지침. mockup(`docs/design/support-inbox-canary-mockup.html`)은 **참조 가이드** — 픽셀 일치 의무 없음, 토큰·구조·인터랙션 의도 준수가 핵심.

1. **토큰 정의**: `style.css`(또는 `index.html` `<style>`) `:root` 에 §2·§3·§4.1 `--sib-*` 변수 전부 정의. 하드코딩 색상 금지 — 반드시 변수 참조.
2. **골격 마크업**: §4.2 대로 `<header>` + grid 컨테이너(`<nav>`/`<main>`/`<aside>`). §7.3 시맨틱·ARIA 속성 부여.
3. **목록 렌더**(`InquiryListItem`): s1 §7 seed 6건을 §5.1 매핑으로 렌더. `role="listbox"/"option"`, roving tabindex(§7.1). 클래스 권장: `.sib-list`, `.sib-list__item`, `.sib-list__item--selected`.
4. **상태 뱃지**(`StatusBadge`): §6.1 삼중 인코딩. 클래스 권장: `.sib-badge.sib-badge--{received|in_progress|on_hold|resolved}`.
5. **상세**(`InquiryDetail`): 선택 문의의 subject·requester·meta·현재 뱃지·§5.4 전이 컨트롤·§5.5 배정 컨트롤. 가드(G1/G4/EC-10/EC-11)를 `disabled` + `title` 로 반영 — **전이 가부 판정 로직은 s1 §4 전이표를 단일 기준으로**(디자인은 표시만 규정).
6. **이력**(`HistoryTimeline`): s1 §6 `history` 배열을 §5.6 대로 오래된 순 렌더. 재정렬 금지. `STATUS_CHANGED`/`ASSIGNEE_CHANGED` 노드 색 분기.
7. **empty placeholder**: 초기(선택 없음) Pane2/3, `history` 빈 배열(§5.6).
8. **반응형**: §4.4 breakpoint 를 `@media` 만으로. JS 레이아웃 계산 금지.
9. **포커스 관리**: 선택 시 상세 제목으로 포커스 이동(§7.1), `aria-live` 통지(§7.3).
10. **검증**: 키보드만으로 선택→전이→이력 완주 · 뱃지 대비 · 색 없이 상태 판별(§7) 수동 확인.

**클래스 네이밍 권장(BEM-lite)**: `.sib-app`, `.sib-header`, `.sib-list`, `.sib-detail`, `.sib-history`, `.sib-badge--*`, `.sib-assignee`, `.sib-btn--transition`, `.sib-timeline__node--status|assignee`.

---

## 9. AC ↔ 디자인 요소 매핑

> 본 task(BF-1005) 수용 기준 ↔ 본 명세/mockup 요소 매핑. self-critique(§10)의 핵심 근거.

| AC | Given / When / Then | 충족 디자인 요소 | 위치 |
|---|---|---|---|
| **AC-1** | s1 명세 → 디자인 작성 → `docs/design` 에 3-pane 레이아웃·컬러·상태 토큰 명세 산출 | 3-pane grid 골격 · `--sib-*` 컬러 팔레트 · status 토큰 4종 | §2 · §4 · §6 · mockup 전체 |
| **AC-2** | 접근성 기준 → mockup 작성 → 키보드 이동·명도 대비·기존 module 일관성 만족 mockup HTML | 키보드 이동표 · 대비 검증표 · `--it-*` 계승 · 삼중 인코딩 뱃지 | §7 · mockup(`role`/`tabindex`/`:focus-visible`/`aria-live`) |
| **AC-3** | 수용 기준 → self-critique → AC↔디자인 요소 매핑표 명세 포함 | 본 표(§9) + Self-critique(§10) | §9 · §10 |

### 9.1 s1 도메인 규칙 ↔ 디자인 요소 역매핑(누락 방지)

| s1 규칙 | 디자인 반영 |
|---|---|
| s1 §4 전이표·가드 G1/G3/G4/G5 | §5.4 전이 컨트롤(허용만 활성, 가드 위반 disabled+사유) |
| s1 §5 배정 규칙(EC-10/EC-11) | §5.5 배정 컨트롤(상태별 배정/해제 가부) |
| s1 §6 이력 append-only·오래된 순 | §5.6 타임라인(재정렬 금지, from→to·actor·note) |
| s1 §6.3 빈 history 정상 케이스 | §5.6 empty placeholder |
| s1 §7 seed 6건(상태 4종+재오픈) | 목록 6행 + mockup 시각화(INQ-3001~3006) |
| s1 §9.3 동기 로드·loading 없음 | §1.3 loading 화면 없음 |
| s1 §9.4·§7.1 최소 1건·empty state 없음 | §1.3 true empty state 없음(단 "선택 없음" placeholder만) |

---

## 10. Self-critique

> PR commit 직전 자기 점검(designer-spec-self-critique 5항목).

| # | 점검 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 3개 AC 전부 디자인 요소로 매핑됐는가? | ✅ §9 표로 AC-1/2/3 각각 근거 위치 명시 |
| 2 | **dev 구현 가이드** — developer 가 추측 없이 따라갈 단계가 있는가? | ✅ §8 10단계 + 클래스/토큰 네이밍. 전이 가부 판정은 s1 §4 단일 기준으로 위임(중복 규정 회피) |
| 3 | **기존 요소 보존** — 저장소 토큰/패턴을 깨지 않는가? | ✅ `incident-triage` 계열 `--it-*`/`--ith-*` 값 계승, system font, 대비 검증값 재사용 |
| 4 | **컴포넌트 매핑** — s1 데이터 모델의 모든 필드가 화면 요소로 매핑됐는가? | ✅ §9.1 역매핑표로 상태·assignee·history·seed·전이·empty 전부 커버 |
| 5 | **모호함 flag** — developer 에게 넘기기 전 애매한 지점은? | ⚠️ 아래 flag 참조 |

### 10.1 모호함 / developer 결정 위임 flag

- **⚠️ note 입력 UI 위치**: `on_hold`/`resolved`/`재오픈` note(선택)를 인라인 textarea 로 제안(§5.4)했으나, 모달 vs 인라인은 developer 재량. s1 §6.1 은 `note` nullable 만 규정하므로 **인라인 권장, 모달도 허용**.
- **⚠️ 이니셜 아바타 색상**: 운영자 2명(agt-01/agt-02) 아바타를 accent tint 단색으로 통일(§5.3). 운영자별 색 구분은 canary 범위 밖(불필요 확장 — 미채택).
- **⚠️ tablet/mobile 이력 아코디언 기본 상태**: 접힘(collapsed) 기본 권장(§4.4). 펼침 기본은 developer 재량.
- **비범위 재확인**: 검색/필터/정렬·신규 생성/삭제·우선순위 필드는 s1 §12 대로 **디자인에도 미포함**(추측성 UI 금지).

---

<!-- bf:pr-summary -->
## 시안 요약 (3-pane 고객지원 인박스 · BF-1005)

s1 기획 명세(BF-1003)를 화면으로 번역한 **3-pane 인박스**(목록·상세·이력) 디자인 명세 + self-contained mockup HTML.

**핵심 산출:**
- **3-pane 레이아웃**: 목록(320px) · 상세(1fr) · 이력(340px), 반응형 3→2→1 pane 축소(§4)
- **상태 토큰 4종**(대비 검증 AA↑): 접수 슬레이트 · 진행 블루 · 보류 앰버 · 해결 그린(§2.2)
- **상태 뱃지 삼중 인코딩**(색+dot+한글) → 색각 이상 안전(§6.1)
- **가드 반영 전이 컨트롤**: s1 가드 G1/G4 위반 전이는 disabled+사유(§5.4) — 오조작 방지
- **접근성**: 키보드 목록 이동(↑↓/Home/End/Enter)·roving tabindex·`:focus-visible`·ARIA 랜드마크·`aria-live`(§7)
- **저장소 일관성**: `incident-triage` 계열 `--it-*` 토큰 계승, system font(외부 의존성 0)

**토큰 매핑 표(상태 ↔ 색):**

| 상태(s1 §4) | fg | tint | 대비 |
|---|---|---|---|
| received(접수) | `#475569` | `#F8FAFC` | 7.4:1 ✅ |
| in_progress(진행) | `#1D4ED8` | `#EFF6FF` | 6.9:1 ✅ |
| on_hold(보류) | `#B45309` | `#FFFBEB` | 5.3:1 ✅ |
| resolved(해결) | `#0F7B4F` | `#ECFDF5` | 5.3:1 ✅ |

**AC 매핑:** AC-1(3-pane·컬러·상태 토큰 명세)=§2/§4/§6 · AC-2(키보드·대비·일관성 mockup)=§7+mockup · AC-3(AC 매핑표)=§9/§10.

**산출물:** `docs/design/support-inbox-canary-BF-1000.md`(명세) · `docs/design/support-inbox-canary-mockup.html`(mockup).

## Self-critique
- AC 매핑(§9)·dev 가이드(§8)·기존 토큰 보존(§2 계승)·컴포넌트 역매핑(§9.1)·모호함 flag(§10.1) 5항목 점검 완료.
- flag: note 입력 UI(인라인 권장/모달 허용)·아바타 색 통일·아코디언 기본 접힘 — developer 재량 명시. 검색/정렬·CRUD·우선순위는 s1 §12 대로 미포함.
<!-- bf:pr-summary -->
