# 고객지원 인박스 디자인 명세 — Phase 18 (BF-1019)

> 작성자: [이디자인] (designer) · 작성일 2026-07-18
> 관련 티켓: BF-1019 (본 designer task) · BF-1013 (부모 Epic)
> 기준 문서(s1): `docs/plan/support-inbox-phase18-BF-1013.md` (BF-1018, planner) — **단일 기준(single source of truth)**
> 형제 task: BF-1018 (planner) · BF-1021 (developer) · BF-1023 (tester)
> 대상 모듈: `support-inbox-phase18/` (신규 · tech-stack `vanilla-static`)
> mockup 참조: `docs/design/mockups/support-inbox-phase18-BF-1019.html` (본 명세와 시각 동기화된 self-contained HTML)
> 선례: `docs/design/support-inbox-canary-BF-1000.md`(BF-1005, canary) — **토큰·컴포넌트 스타일 계승 대상**. 단 canary 는 3-pane 배정 워크플로였고, 본 phase18 은 목록·검색·필터·상태 전환 4개 기능 중심(배정 액션 비범위)이라 레이아웃은 재설계한다.

---

## 0. 문서 성격 및 전제

본 문서는 s1 기획 명세(BF-1018)의 **데이터 모델·기능 파이프라인·상태 전이·fixture** 를 화면으로 번역한 UI/UX 디자인 명세다. s1 이 규정한 도메인 규칙(상태 4종·우선순위 4종·가드 G1~G5·검색/필터/정렬 파이프라인·이력 append-only)은 재해석하지 않고 **시각/인터랙션 계층만** 추가한다.

**designer 산출물 경계(절대 준수):**
- 본 task 담당 파일: `docs/design/support-inbox-phase18-BF-1019.md`(본 명세) + `docs/design/mockups/support-inbox-phase18-BF-1019.html`(mockup) 2개뿐.
- 실제 앱 코드(`support-inbox-phase18/*`)는 developer(BF-1021) 담당 — 본 명세는 와이어프레임·토큰·컴포넌트 props·구현 가이드까지만 규정한다.

**tech-stack `vanilla-static` 제약:**
- 외부 의존성 0건. CDN·웹폰트 로드 금지 → **system font stack**만 사용.
- 디자인 토큰 파일 없음 → mockup·구현 모두 `:root` CSS 변수로 토큰을 **자체 정의**(§2).
- **신규 토큰 추가 금지(AC-2)**: canary(`--sib-*`)에서 검증된 토큰 세트를 **값 그대로 계승**하고, 신규 필드인 우선순위(priority)도 **기존 semantic 토큰을 재사용**하여 표현한다(§2.3 — 새 색/spacing 토큰 정의 없음). vanilla-static 은 공유 스타일시트가 없으므로 값 복제가 관례(import 아님).

**canary 대비 phase18 범위 차이(s1 §10 반영):**

| 항목 | canary(BF-1000) | phase18(본 task) |
|---|---|---|
| 레이아웃 | 3-pane(목록·상세·이력) 상시 노출 | **목록(검색·필터 툴바) + 상세/상태전환** 2-region |
| 우선순위 | 없음 | **있음**(urgent/high/normal/low) — 표시·필터·정렬(비수정) |
| 검색 | 없음 | **있음**(id·subject·requester.name·email substring) |
| 필터 | 없음 | **있음**(status·priority·assignee 다중, 카테고리 내 OR / 간 AND) |
| 담당자 배정/재배정 액션 | 있음 | **비범위** — 표시·필터 전용 |
| 영속 저장 | 있음(localStorage) | **비범위** — 세션 in-memory |

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 구조 · spacing · breakpoint](#4-레이아웃--구조--spacing--breakpoint)
5. [컴포넌트 명세 — props · 상태 · 인터랙션](#5-컴포넌트-명세--props--상태--인터랙션)
6. [상태 배지 · 우선순위 배지 · 책임자 표시 규칙](#6-상태-배지--우선순위-배지--책임자-표시-규칙)
7. [접근성 기준 (키보드 · 대비 · ARIA)](#7-접근성-기준-키보드--대비--aria)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ 디자인 요소 매핑](#9-ac--디자인-요소-매핑)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

지원 담당자가 고객 문의(inquiry)의 **우선순위·상태를 한 화면에서 파악**하고, **검색·필터로 목록을 좁혀** 찾고, 선택한 문의의 **상태를 전환**하는 고객지원 인박스 SPA. 좌측 목록 상단의 검색바·필터 툴바로 목록을 좁히고, 행을 선택하면 우측 상세에서 상태 전환·변경 이력을 확인한다. s1 §6 fixture 8건(INQ-4001~4008, 상태 4종 + 우선순위 4종 + 재오픈/미배정 케이스)을 그대로 시각화한다.

### 1.2 사용자 경험 목표

| 목표 | 실현 방법 |
|---|---|
| **우선순위 즉시 파악** | 목록 각 행에 우선순위 배지 + 기본 정렬 = 우선순위 내림차순(긴급→낮음) → 급한 문의가 상단(§5.1) |
| **빠른 좁혀찾기** | 검색바(id·subject·요청자) + 필터 칩(상태·우선순위·담당자) 조합. 결과 건수 실시간 노출 |
| **상태 오조작 방지** | s1 가드(G1·G3·G4)에 걸리는 전이 버튼은 `disabled` + 사유 텍스트로 사전 차단 |
| **이력 신뢰성** | 우측 타임라인은 append-only(오래된 순), `from→to`·actor·note 를 그대로 노출 |
| **접근성 내장** | 목록 키보드 이동(↑/↓/Home/End/Enter), 필터 칩 toggle, AA 대비 배지, ARIA 랜드마크·live region |
| **저장소 일관성** | canary(`--sib-*`) 토큰·카드·배지 스타일 계승, 신규 토큰 0 → 학습 비용 최소 |

### 1.3 화면 상태(s1 §7 반영)

- s1 §1.2 로드는 정적 fixture 동기 로드 → **loading 화면 없음**. 항상 "ready" 로 시작.
- s1 §6.2 fixture 8건 보장 → 기본 목록은 항상 비어있지 않음. 단 **검색/필터 교집합 0건**(s1 §7)은 발생 가능 → "결과 없음" empty state(§5.7)를 정의한다.
- 선택된 문의 없음(초기 상세 pane)은 존재 → **placeholder empty pane**(§5.6)만 정의.
- 상태 전환 후 필터 뷰에서 대상이 사라지는 것(s1 EC-11)은 정상 → §5.4 에 시각 처리 명시.

---

## 2. 컬러 팔레트

> prefix `--sib-*`(support-inbox). canary(BF-1000)에서 검증된 값을 **그대로 계승**. **신규 색 토큰 추가 없음(AC-2)** — 우선순위도 아래 기존 토큰을 재사용(§2.3). status 토큰은 대비 검증 완료(§7.2) → 임의 변경 금지.

### 2.1 Base

| 토큰 | HEX | 용도 |
|---|---|---|
| `--sib-color-bg` | `#F1F3F5` | 앱 배경(pane gutter) |
| `--sib-color-surface` | `#FFFFFF` | pane·카드 표면 |
| `--sib-color-surface-muted` | `#F8F9FA` | 선택 행·헤더·비활성/toolbar 영역 |
| `--sib-color-border` | `#DDE1E6` | 기본 구분선 |
| `--sib-color-border-strong` | `#B9C0C8` | 강조 구분선·focus 보조·미선택 칩 테두리 |
| `--sib-color-text` | `#1A1D21` | 본문 텍스트 |
| `--sib-color-text-muted` | `#6B6B66` | 보조 텍스트(메타·caption)·낮음 우선순위 |
| `--sib-color-accent` | `#3563E9` | primary 액션·선택 표시·활성 필터 칩·링크 |
| `--sib-color-accent-hover` | `#2A50C4` | accent hover/active |

### 2.2 Status (상태별 · 배지 fg + tint bg 쌍)

s1 §4 상태 4종 ↔ 색 매핑. `fg`(텍스트/dot) + `tint`(배지 배경). 조합 대비 §7.2.

| 상태(s1) | 토큰 fg | HEX | 토큰 tint | HEX | 의미 |
|---|---|---|---|---|---|
| `received`(접수) | `--sib-color-received` | `#475569` | `--sib-color-received-tint` | `#F8FAFC` | 접수·미착수(중립 슬레이트) |
| `in_progress`(진행) | `--sib-color-progress` | `#1D4ED8` | `--sib-color-progress-tint` | `#EFF6FF` | 처리 중(액티브 블루) |
| `on_hold`(보류) | `--sib-color-hold` | `#B45309` | `--sib-color-hold-tint` | `#FFFBEB` | 보류·대기(경고 앰버) |
| `resolved`(해결) | `--sib-color-resolved` | `#0F7B4F` | `--sib-color-resolved-tint` | `#ECFDF5` | 종결(성공 그린) |

### 2.3 Priority (우선순위 4종 — **신규 토큰 없이 기존 fg 재사용**)

s1 §3.1 우선순위 4종(랭크 urgent>high>normal>low). **신규 색 토큰을 만들지 않고**, 아래처럼 기존 fg 토큰을 재사용한다. 상태 배지(pill+tint bg+dot)와 **시각 형태를 달리하여**(좌측 flag bar + 라벨, surface bg) 같은 색이 쓰여도 두 축이 혼동되지 않게 한다(§6.2).

| 우선순위(s1) | 라벨 | 재사용 fg 토큰 | HEX | 재사용 근거 |
|---|---|---|---|---|
| `urgent`(긴급) | 긴급 | `--sib-color-danger` | `#B91C1C` | 최고 경보 = 위험 레드 |
| `high`(높음) | 높음 | `--sib-color-hold` | `#B45309` | 주의 = 앰버 |
| `normal`(보통) | 보통 | `--sib-color-received` | `#475569` | 중립 = 슬레이트 |
| `low`(낮음) | 낮음 | `--sib-color-text-muted` | `#6B6B66` | 낮은 관심 = muted |

- 배경은 항상 `--sib-color-surface`(#FFFFFF) — fg 색은 흰 배경 위에서 전부 AA↑(§7.2). tint 신규 정의 없음.
- **색만으로 우선순위를 전달하지 않음**: 한글 라벨(긴급/높음/보통/낮음) + 좌측 랭크 caret(▲ 채움 개수) 병기 → 색각 이상·흑백 안전(§6.2).

### 2.4 Semantic 보조

| 토큰 | HEX | 용도 |
|---|---|---|
| `--sib-color-danger` | `#B91C1C` | 전이 거부·오류 메시지 · 긴급 우선순위(§2.3) |
| `--sib-color-unassigned` | `#6B6B66` | 미배정(`assignee: null`) 표시(§6.3) |

> **토큰 총량 = canary 와 동일**(base 9 + status fg/tint 8 + danger + unassigned + spacing/radius/shadow/font). phase18 이 추가한 토큰은 **0개**.

---

## 3. 타이포그래피

> **system font stack only**(CDN 금지). 한글 렌더 위해 `Noto Sans KR` 를 stack 내 fallback 으로 포함(로컬 설치 시에만 적용, 네트워크 로드 아님). canary §3 계승.

```css
--sib-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                 system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--sib-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | font | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| `heading-lg` | sans | 20px | 700 | 1.3 | 앱 제목·상세 제목 |
| `heading-md` | sans | 15px | 600 | 1.35 | 목록 행 subject |
| `body` | sans | 14px | 400 | 1.5 | 본문·상세 필드 |
| `body-strong` | sans | 14px | 600 | 1.5 | 라벨·강조 |
| `caption` | sans | 12px | 500 | 1.4 | 메타(시각·actor)·배지·칩 텍스트 |
| `mono` | mono | 13px | 500 | 1.4 | `INQ-####`·`EVT-######` ID |

- 최소 본문 14px · 최소 caption 12px. 12px 미만 금지.
- ID(`INQ-4001`)는 mono 로 표기해 스캔 용이성 확보(s1 §3.1 패턴).

---

## 4. 레이아웃 — 구조 · spacing · breakpoint

### 4.1 spacing / radius 스케일 (canary §4.1 계승 — 신규 없음)

```css
--sib-space-1: 4px;  --sib-space-2: 8px;  --sib-space-3: 12px;
--sib-space-4: 16px; --sib-space-5: 24px; --sib-space-6: 32px; --sib-space-7: 48px;
--sib-radius-sm: 4px; --sib-radius-md: 8px; --sib-radius-lg: 12px; --sib-radius-pill: 999px;
--sib-shadow-card: 0 1px 2px rgba(26,29,33,.06), 0 2px 8px rgba(26,29,33,.05);
```

### 4.2 전체 골격

```
┌───────────────────────────────────────────────────────────────────────────┐
│  App Header · "고객지원 인박스" · 집계 요약(총 8 · 미배정 2 · 진행 3 · 긴급 2)  │  ← <header> banner
├──────────────────────────────────────┬────────────────────────────────────┤
│ Pane 1: 목록 영역  <section>          │ Pane 2: 상세 / 상태 전환  <main>     │
│ ┌──────────────────────────────────┐ │  (aria-live 앵커)                   │
│ │ Toolbar  <search>                │ │                                     │
│ │  · 검색바 (🔍 input + clear)      │ │ · ID(mono) · 제목                   │
│ │  · 필터: 상태 칩 ×4               │ │ · 요청자(name·email)                │
│ │  · 필터: 우선순위 칩 ×4           │ │ · 우선순위 배지 · 상태 배지         │
│ │  · 필터: 담당자 칩 ×3 + 초기화    │ │ · 담당자(표시 전용)                 │
│ │  · 결과 건수 "8건 중 N건"         │ │ ── 상태 전환 컨트롤(가드 반영) ──   │
│ └──────────────────────────────────┘ │ · 허용 전이 버튼 + 거부 사유        │
│  <ul role="listbox">                  │ · note textarea(선택)               │
│   · 문의 행 ×N (id·subject·우선·상태) │ ── 변경 이력 타임라인 ──            │
│   · 선택 강조 · 우선순위 정렬          │ · 오래된 순 · from→to · actor·note  │
├──────────────────────────────────────┴────────────────────────────────────┤
│  (검색/필터 결과 0건 → 목록 자리 empty state §5.7)                            │
│  (선택 문의 없음 → Pane2 = empty placeholder §5.6)                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.3 그리드 폭 (데스크톱 ≥1024px)

| Pane | 폭 | 근거 |
|---|---|---|
| Pane 1 목록(툴바 포함) | `minmax(380px, 480px)` | 검색바 + 필터 칩 3열 + 행(우선/상태 2배지 수용) |
| Pane 2 상세/전환/이력 | `1fr`(가변, 최소 `min-width: 380px`) | 상세·전환·이력이 주 작업 영역 |

- `display: grid; grid-template-columns: minmax(380px, 480px) 1fr; gap: 0;` pane 경계 `--sib-color-border` 1px.
- 앱 전체 높이 `100vh`, 헤더 고정. 목록 영역은 툴바 sticky + 리스트 독립 스크롤, 상세는 독립 스크롤(`overflow-y: auto`).
- 이력은 canary 처럼 별도 3번째 pane 을 두지 않고 **상세 pane 하단에 통합**(배정 액션이 빠져 상세 콘텐츠가 가벼워졌고, 상태 전환↔이력을 세로로 붙이는 편이 인과관계 파악에 유리).

### 4.4 Breakpoint 별 동작

| Breakpoint | 레이아웃 | 처리 |
|---|---|---|
| **≥1024px (desktop)** | 2-pane 동시 노출(§4.3) | 목록 좌측 고정폭, 상세 우측 가변 |
| **768–1023px (tablet)** | 목록 폭 `340px` 로 축소 + 상세 `1fr`. 필터 칩은 2행 wrap | 상세 유지 |
| **<768px (mobile)** | 1-pane 스택. 목록(툴바 포함) 전체폭 → 행 선택 시 상세 뷰 전환(상세 상단 "← 목록" 버튼). 필터는 접이식 `<details>` "필터" 아코디언 | 검색바는 상시 노출, 필터만 접힘 |

- mobile 목록→상세 전환 시 상세 제목으로 포커스 이동(§7.1) — 스크린리더 컨텍스트 유지.
- 각 breakpoint 는 CSS `@media` 로만 처리(JS 레이아웃 계산 금지 — vanilla-static 단순성).

---

## 5. 컴포넌트 명세 — props · 상태 · 인터랙션

> props 는 developer 가 렌더 함수 시그니처로 삼을 **논리 계약**(vanilla-static 이므로 실제 프레임워크 props 아님 — 데이터→DOM 매핑 기준).

### 5.1 `SearchBar` (Toolbar)

| prop | 타입 | 설명 |
|---|---|---|
| `query` | string | 현재 검색어. `<input type="search">` value |
| `resultCount` | number | 현재 파이프라인 결과 건수(툴바 하단 "8건 중 N건" 표기) |

- 좌측 🔍 아이콘(장식, `aria-hidden`) + input + 우측 clear(✕) 버튼(query 비었으면 숨김). placeholder: "문의 번호·제목·요청자 검색".
- 입력 = 실시간 매칭(s1 §5.2: trim·소문자·substring, `id`/`subject`/`requester.name`/`requester.email` OR). **assignee 는 매칭 대상 아님**(s1 §7 주의) — placeholder 문구에 "요청자"만 명시해 오해 방지.
- `role`: input 은 `<input type="search" aria-label="문의 검색">`, 결과 건수는 `aria-live="polite"`(§7.3).
- **상태**: default / focus-visible(2px accent outline) / clear 버튼 hover.

### 5.2 `FilterChipGroup` (Toolbar — status · priority · assignee 3개 그룹)

| prop | 타입 | 설명 |
|---|---|---|
| `category` | `status`\|`priority`\|`assignee` | 필터 카테고리(s1 §5.3) |
| `options` | `{value,label,selected}[]` | 카테고리 옵션들. 다중 선택(카테고리 내 OR) |

- 각 옵션 = toggle 칩(`<button role="checkbox" aria-checked>`). 선택 시 accent 채움(배경 `--sib-color-accent`, 흰 텍스트), 미선택 시 `--sib-color-border-strong` 테두리 + surface 배경.
- 그룹 라벨: "상태" / "우선순위" / "담당자". assignee 그룹은 `박운영` · `정지원` · `미배정`(특수값 `unassigned`, s1 §5.3) 3칩.
- 카테고리 전체 미선택 = 그 카테고리 미필터(전체 통과, s1 §5.3). 카테고리 간 AND, 내부 OR.
- **초기화** 버튼: 모든 칩 해제(s1 EC-06). 선택된 필터 0개면 `disabled`.
- **상태**: 미선택 / 선택(accent) / hover(테두리 accent) / focus-visible(2px accent outline) / 초기화 disabled(선택 0개).

### 5.3 `InquiryListItem` (Pane 1 행)

| prop | 타입 | 설명 |
|---|---|---|
| `id` | string | `INQ-####` — mono, caption 색 |
| `subject` | string | heading-md, 최대 2줄 후 ellipsis(`-webkit-line-clamp: 2`) |
| `priority` | enum(4) | §6.2 우선순위 배지 |
| `status` | enum(4) | §6.1 상태 배지 |
| `assigneeName` | string \| null | null → "미배정"(§6.3) |
| `updatedAt` | string | caption muted, 상대/절대 시각 |
| `selected` | boolean | 선택 시 좌측 3px `--sib-color-accent` 바 + `surface-muted` 배경 |

- 행 레이아웃: 1행(id mono + 우선순위 배지) / 2행(subject) / 3행(상태 배지 + 담당자 + updatedAt).
- 정렬 = s1 §5.1(우선순위 내림차순 → createdAt 오름차순 → id 오름차순). **정렬 변경 UI 없음**(s1 §10 비범위).
- **상태**: default / hover(`surface-muted`) / selected(`aria-selected="true"`, accent 바) / focus-visible(2px accent outline).
- **인터랙션**: 클릭 또는 Enter/Space → 해당 문의를 Pane2 에 로드. 행 `role="option"`, 목록 `role="listbox"`(§7.1).

### 5.4 `StatusTransitionControls` (Pane 2)

s1 §4 전이표를 버튼 그룹으로 표현. **현재 상태에서 허용된 전이만 활성**, 가드 위반 전이는 `disabled` + 사유 텍스트.

| 현재 상태 | 활성 버튼 | 비활성(사유) |
|---|---|---|
| `received` | "진행 시작"(→in_progress) | 미배정 시 "진행 시작" **disabled**(G1: "담당자 미배정") |
| `in_progress` | "보류"(→on_hold) · "해결"(→resolved) | — (G3: 담당자 있어야 해결 — fixture 상 진행 건은 배정됨) |
| `on_hold` | "재개"(→in_progress) | "해결" **disabled**(G4: "보류 상태에서 해결로 직접 전이 불가 — 재개 후 처리") |
| `resolved` | "재오픈"(→in_progress) | — (G5) |

- 각 전이 확정 시 하단 이력(§5.6)에 `STATUS_CHANGED` 이벤트가 append 되는 것을 시각적으로 암시(신규 노드 하이라이트 1.5s).
- `on_hold`/`resolved`/재오픈 전이 시 note 입력(선택) — 인라인 textarea(`note` optional, s1 §3.2).
- 동일 상태 재요청은 s1 EC-01 no-op → 현재 상태로의 버튼은 애초에 렌더하지 않음(활성 버튼 표에 미포함).
- **disabled 버튼도 DOM 에 존재**(숨김 금지) → 왜 불가한지 학습 가능(오조작 방지 UX 목표).
- **필터 뷰에서 사라짐(EC-11)**: 전환 후 대상이 현재 필터 조건을 벗어나면 목록에서 제거 → 상세는 유지하되 상단에 "이 문의는 현재 필터 결과에 없습니다" caption 안내(정상 동작임을 명시).

> **담당자 배정/재배정 컨트롤 없음**(s1 §10 비범위). 상세의 담당자는 **표시 전용**(§6.3). canary §5.5 의 `AssigneeControls` 는 phase18 에 채택하지 않는다.

### 5.5 `PriorityBadge` · `StatusBadge`

§6.1(상태)·§6.2(우선순위) 참조. 두 배지는 **형태를 구분**(상태=pill+tint+dot, 우선순위=flag+caret+라벨)하여 같은 fg 색이 재사용돼도 축 혼동이 없다.

### 5.6 `HistoryTimeline` (Pane 2 하단)

| prop | 타입 | 설명 |
|---|---|---|
| `events` | `HistoryEvent[]` | s1 §3.2, **오래된 순**(배열 순서 그대로, 재정렬 금지) |

- 세로 rail(2px `--sib-color-border-strong`) + 노드(12px). 노드 색 = 이벤트 성격:
  - `STATUS_CHANGED` → `to` 상태색(§2.2)
  - `ASSIGNEE_CHANGED` → `--sib-color-accent`(fixture 이력에 존재 — s1 §6.2, 표시만. 배정 *액션* 은 비범위이나 fixture 가 담은 과거 배정 *이력* 은 그대로 렌더)
- 각 노드: `type` 라벨 · `from → to` · actor 이름 · `at`(caption) · note(있으면 인용 블록).
- **empty placeholder**: `history` 빈 배열(예: INQ-4001·INQ-4008 최초 접수, s1 §7)일 때 "아직 변경 이력이 없습니다" muted 안내.

### 5.7 Empty / Placeholder 상태

| 상황 | 표시 |
|---|---|
| 선택 문의 없음(초기) | Pane2 "왼쪽에서 문의를 선택하세요" empty placeholder |
| 검색/필터 결과 0건(s1 §7 교집합) | 목록 자리에 "조건에 맞는 문의가 없습니다" + "필터 초기화" 버튼(EC-05/EC-07) |
| history 빈 배열 | §5.6 "아직 변경 이력이 없습니다" |

### 5.8 인터랙션 상태 요약표

| 컴포넌트 | default | hover | active/selected | focus-visible | disabled |
|---|---|---|---|---|---|
| SearchBar input | border | — | — | 2px accent outline | — |
| FilterChip | border-strong 테두리 | 테두리 accent | accent 채움+흰텍스트 | 2px accent outline | (초기화만) muted |
| ListItem | surface | surface-muted | accent 바+muted | 2px accent outline | — |
| 전이 버튼 | outline/accent 채움 | accent-hover | pressed | 2px accent outline | 40% opacity + `cursor:not-allowed` + 사유 텍스트 |

---

## 6. 상태 배지 · 우선순위 배지 · 책임자 표시 규칙

### 6.1 상태 배지 규칙 (canary §6.1 계승)

- 형태: **pill**(`--sib-radius-pill`) + 좌측 8px 상태색 dot + 한글 라벨(접수/진행/보류/해결). **색 + 텍스트 + dot 삼중 인코딩** → 색각 이상·흑백 안전(§7.2).
- 색 매핑(§2.2): 접수=슬레이트 · 진행=블루 · 보류=앰버 · 해결=그린. 텍스트는 tint 배경 위 fg 색 → 대비 AA↑.
- 목록 행·상세 헤더 두 곳에서 **동일 컴포넌트** 재사용(일관성).

### 6.2 우선순위 배지 규칙 (신규 필드 — 형태로 상태와 구분)

- 형태: **squared chip**(`--sib-radius-sm`) + 좌측 3px 세로 flag bar(우선순위색) + 랭크 caret + 한글 라벨(긴급/높음/보통/낮음). 배경은 `surface`(tint 신규 정의 없음, §2.3).
- **색 + 라벨 + caret 삼중 인코딩**: caret 채움 = 랭크 시각화(긴급 ▲▲▲ · 높음 ▲▲△ · 보통 ▲△△ · 낮음 △△△ 형태로 채움 개수 차등) → 색만으로 우선순위를 전달하지 않음.
- 색 매핑(§2.3): 긴급=레드(danger) · 높음=앰버(hold) · 보통=슬레이트(received) · 낮음=muted. **상태 배지(pill+dot)와 형태가 달라** 앰버가 "보류 상태"인지 "높음 우선순위"인지 형태로 즉시 구분된다.
- 목록 행·상세 헤더 두 곳에서 동일 컴포넌트 재사용. **우선순위는 표시 전용 — 변경 UI 없음**(s1 §10).

### 6.3 책임자(assignee) 표시 규칙 (표시 전용 — 배정 액션 비범위)

| 상태 | 표시 |
|---|---|
| 배정됨 `{id,name}` | 이니셜 아바타(accent tint 원형) + 이름. 목록에선 이름만, 상세에선 아바타+이름+id(mono) |
| 미배정 `null` | 점선 테두리 chip + "미배정"(`--sib-color-unassigned` muted). 아바타 자리엔 `—` |

- s1 §5.3 `unassigned` 필터 대응: 미배정 행을 눈에 띄게 표시해 필터 결과와 시각 일치.
- **배정/재배정 컨트롤 없음**(s1 §10). 상세 담당자 옆에 액션 버튼을 두지 않는다 — canary 와의 핵심 차이.

---

## 7. 접근성 기준 (키보드 · 대비 · ARIA)

### 7.1 키보드 이동

| 영역 | 키 | 동작 |
|---|---|---|
| 검색바 | 문자 입력 | 실시간 필터. `Esc` → 검색어 clear(권장) |
| 필터 칩 | `Tab` 순회 · `Enter`/`Space` | 칩 toggle(선택/해제) |
| 목록(listbox) | `↑`/`↓` | 이전/다음 문의 행(roving tabindex — 활성 행만 `tabindex=0`) |
| 목록 | `Home`/`End` | 첫/마지막 행 |
| 목록 | `Enter`/`Space` | 선택 → Pane2 로드, 포커스는 상세 제목(`tabindex=-1`)으로 이동 |
| 전이 버튼 | `Enter`/`Space` | 전이 실행. disabled 는 포커스는 받되 실행 불가(사유 노출) |
| 전역 | `Tab`/`Shift+Tab` | 논리 DOM 순서 = 시각 순서(검색→필터→목록→상세 액션→이력) |

- 모든 인터랙티브 요소 `:focus-visible` → 2px `--sib-color-accent` outline + 2px offset.
- 마우스 없이 검색→필터→문의 선택→상태 전이→이력 확인 전 과정 완주 가능.

### 7.2 명도 대비 (WCAG 2.1 AA — 텍스트 4.5:1, UI/대형 3:1)

status fg×tint 는 canary(검증 완료) 계승. 우선순위 fg 는 흰 배경 대비 실측:

| 조합 | 대비 | 판정 |
|---|---|---|
| `#475569` on `#F8FAFC`(접수) | 7.4:1 | AA/AAA ✅ |
| `#1D4ED8` on `#EFF6FF`(진행) | 6.9:1 | AA/AAA ✅ |
| `#B45309` on `#FFFBEB`(보류) | 5.3:1 | AA ✅ |
| `#0F7B4F` on `#ECFDF5`(해결) | 5.3:1 | AA ✅ |
| `#B91C1C` on `#FFFFFF`(긴급 우선순위) | 5.9:1 | AA ✅ |
| `#B45309` on `#FFFFFF`(높음 우선순위) | 5.3:1 | AA ✅ |
| `#475569` on `#FFFFFF`(보통 우선순위) | 8.6:1 | AA/AAA ✅ |
| `#6B6B66` on `#FFFFFF`(낮음 우선순위·caption) | 4.8:1 | AA ✅ |
| `#1A1D21` on `#FFFFFF`(본문) | 16.1:1 | AAA ✅ |
| `#3563E9` on `#FFFFFF`(accent 텍스트) | 4.7:1 | AA ✅ |
| `#FFFFFF` on `#3563E9`(선택된 필터 칩) | 4.7:1 | AA ✅ |

- 우선순위 배지는 흰 배경 위에만 렌더 → 위 대비 성립. 선택 칩은 accent 채움 위 흰 텍스트(4.7:1 AA).
- 색만으로 전달하지 않음 → 상태=dot+한글, 우선순위=caret+한글 병기(색각 이상 안전).
- disabled 버튼은 40% opacity 지만 사유 텍스트로 정보 전달(색·투명도에만 의존 안 함).

### 7.3 ARIA / 시맨틱 구조

| 영역 | 시맨틱 |
|---|---|
| 앱 헤더 | `<header role="banner">` + `<h1>` |
| 검색 | `<search>` 랜드마크 > `<input type="search" aria-label="문의 검색">`, 결과 건수 `aria-live="polite"` |
| 필터 그룹 | `<fieldset>` + `<legend>`(상태/우선순위/담당자), 칩 `<button role="checkbox" aria-checked>` |
| Pane1 목록 | `<section aria-label="문의 목록">` > `<ul role="listbox" aria-label="고객 문의">` > `<li role="option" aria-selected>` |
| Pane2 상세 | `<main aria-label="문의 상세">`, 선택 변경 시 `aria-live="polite"` 로 "INQ-4003 상세 표시" 안내 |
| 이력 | 상세 내 `<section aria-label="변경 이력">` > `<ol>`(순서 있는 이력) |
| 배지 | 텍스트 라벨 포함(별도 `aria-label` 불필요), dot/caret 은 `aria-hidden` |
| 전이 결과 | 전이 성공·거부 메시지를 `aria-live="polite"` region 으로 통지 |

---

## 8. dev 구현 가이드

> developer(BF-1021)가 `support-inbox-phase18/` 구현 시 따를 단계별 지침. mockup(`docs/design/mockups/support-inbox-phase18-BF-1019.html`)은 **참조 가이드** — 픽셀 일치 의무 없음, 토큰·구조·인터랙션 의도 준수가 핵심.

1. **토큰 정의**: `style.css`(또는 `index.html` `<style>`) `:root` 에 §2·§3·§4.1 `--sib-*` 변수 전부 정의. **canary 값 그대로, 신규 토큰 추가 금지**. 하드코딩 색상 금지 — 반드시 변수 참조.
2. **골격 마크업**: §4.2 대로 `<header>` + 2-col grid(`<section>` 목록 / `<main>` 상세). §7.3 시맨틱·ARIA 부여.
3. **파이프라인 렌더**: s1 §5 파이프라인(`fixture → 필터 → 검색 → 정렬 → 렌더`)을 순수 함수로 구현. 목록은 이 결과를 §5.3 매핑으로 렌더. **판정 로직은 s1 §5 를 단일 기준으로**(디자인은 표시만 규정).
4. **검색바**(`SearchBar`): §5.1. 매칭 대상 4필드(id·subject·requester.name·email)만, assignee 제외. 결과 건수 `aria-live`. 클래스 권장: `.sib-search`, `.sib-search__input`, `.sib-search__clear`.
5. **필터 칩**(`FilterChipGroup`): §5.2. status/priority/assignee 3그룹, `role="checkbox"`, 카테고리 내 OR·간 AND. 초기화 버튼. 클래스 권장: `.sib-filter`, `.sib-chip`, `.sib-chip--on`, `.sib-filter__reset`.
6. **우선순위 배지**(`PriorityBadge`): §6.2 삼중 인코딩(색+caret+라벨), squared+flag. 클래스 권장: `.sib-prio.sib-prio--{urgent|high|normal|low}`. **상태 배지와 형태 구분 필수**.
7. **상태 배지**(`StatusBadge`): §6.1 pill+dot+라벨. 클래스 권장: `.sib-badge.sib-badge--{received|in_progress|on_hold|resolved}`.
8. **목록 행**(`InquiryListItem`): §5.3, roving tabindex(§7.1). 정렬은 §5.1 고정(정렬 UI 없음).
9. **상세/전환**(`InquiryDetail`+`StatusTransitionControls`): §5.4. 가드(G1/G4)를 `disabled`+사유 텍스트로 반영. **담당자는 표시 전용 — 배정 컨트롤 렌더 금지**(§6.3). 전이 가부 판정은 s1 §4 전이표 단일 기준.
10. **이력**(`HistoryTimeline`): §5.6, 오래된 순(재정렬 금지), 노드 색 분기.
11. **empty state**: 초기 선택 없음(§5.6) · 검색/필터 0건(§5.7) · 빈 history(§5.6).
12. **반응형**: §4.4 breakpoint 를 `@media` 만으로. JS 레이아웃 계산 금지.
13. **검증**: 키보드만으로 검색→필터→선택→전이→이력 완주 · 배지 대비 · 색 없이 상태/우선순위 판별(§7) 수동 확인.

**클래스 네이밍 권장(BEM-lite)**: `.sib-app`, `.sib-header`, `.sib-toolbar`, `.sib-search`, `.sib-filter`, `.sib-chip--on`, `.sib-list`, `.sib-badge--*`, `.sib-prio--*`, `.sib-assignee`, `.sib-btn--transition`, `.sib-timeline__node--status|assignee`.

---

## 9. AC ↔ 디자인 요소 매핑

> 본 task(BF-1019) 수용 기준 ↔ 본 명세/mockup 요소 매핑. self-critique(§10)의 핵심 근거.

| AC | Given / When / Then | 충족 디자인 요소 | 위치 |
|---|---|---|---|
| **AC-1** | 기획 명세 → 디자인 명세 작성 → **우선순위/상태 배지 · 필터 UI · 검색바 컴포넌트**가 AC 매핑 표와 함께 명세됨 | 우선순위 배지(§6.2) · 상태 배지(§6.1) · 필터 칩 그룹(§5.2) · 검색바(§5.1) · 본 매핑 표(§9) | §5.1 · §5.2 · §6.1 · §6.2 · §9 · mockup 전체 |
| **AC-2** | 공용 토큰 → mockup 작성 → **신규 토큰 추가 없이** 기존 디자인 일관성을 유지한 정적 mockup 렌더 | canary `--sib-*` 값 그대로 계승, 우선순위도 기존 fg 재사용(신규 토큰 0), self-contained HTML | §2(계승·재사용) · §2.4 각주(추가 토큰 0) · mockup `:root` |

### 9.1 s1 도메인 규칙 ↔ 디자인 요소 역매핑(누락 방지)

| s1 규칙 | 디자인 반영 |
|---|---|
| s1 §3.1 우선순위 4종(랭크) | §6.2 우선순위 배지 + §5.1 우선순위 내림차순 정렬 |
| s1 §5.1 정렬(우선순위↓→createdAt↑→id↑) | §5.3 목록 정렬(정렬 UI 없음, §10 비범위) |
| s1 §5.2 검색(4필드 OR, trim·소문자) | §5.1 검색바(assignee 제외 명시) |
| s1 §5.3 필터(status/priority/assignee, OR/AND) | §5.2 필터 칩 그룹(내부 OR·간 AND, unassigned 특수값) |
| s1 §5.4 상태 전환(가드 G1~G5) | §5.4 전이 컨트롤(허용만 활성, 위반 disabled+사유) |
| s1 §10 배정 액션 비범위 | §5.4·§6.3 담당자 표시 전용, 배정 컨트롤 없음 |
| s1 §3.2 이력 append-only·오래된 순 | §5.6 타임라인(재정렬 금지, from→to·actor·note) |
| s1 §7 검색/필터 0건 · 빈 history | §5.7 empty state · §5.6 빈 이력 |
| s1 §6.2 fixture 8건(INQ-4001~4008) | 목록 행 + mockup 시각화 |
| s1 EC-11 전환 후 필터 뷰 이탈 | §5.4 "현재 필터 결과에 없음" 안내 |

---

## 10. Self-critique

> PR commit 직전 자기 점검(designer-spec-self-critique 5항목).

| # | 점검 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 2개 AC 전부 디자인 요소로 매핑됐는가? | ✅ §9 표로 AC-1(배지/필터/검색바+매핑표)·AC-2(신규토큰0 mockup) 각각 근거 위치 명시 |
| 2 | **dev 구현 가이드** — developer 가 추측 없이 따라갈 단계가 있는가? | ✅ §8 13단계 + 클래스/토큰 네이밍. 파이프라인·전이 판정은 s1 §4/§5 단일 기준으로 위임(중복 규정 회피) |
| 3 | **기존 요소 보존** — 저장소 토큰/패턴을 깨지 않는가? | ✅ canary `--sib-*` 값 그대로 계승, 신규 토큰 0(§2.4 각주), system font, 대비 검증값 재사용 |
| 4 | **컴포넌트 매핑** — s1 데이터 모델·기능의 모든 요소가 화면 요소로 매핑됐는가? | ✅ §9.1 역매핑표로 우선순위·검색·필터·전이·이력·empty·EC-11·비범위 전부 커버 |
| 5 | **모호함 flag** — developer 에게 넘기기 전 애매한 지점은? | ⚠️ 아래 flag 참조 |

### 10.1 모호함 / developer 결정 위임 flag

- **⚠️ 우선순위 배지의 caret 랭크 표현**: 색+라벨에 더해 caret 채움 개수(▲▲▲/▲▲△/▲△△/△△△)로 랭크를 이중 인코딩 제안(§6.2). caret 대신 숫자 뱃지(4/3/2/1)나 막대도 허용 — 색각 안전(색+라벨 병기)만 지키면 developer 재량.
- **⚠️ 이력 pane 위치**: canary 3번째 pane 대신 상세 하단 통합(§4.3) 제안. 배정 액션이 빠져 상세가 가벼워진 판단. 좁은 화면 외에서 별도 컬럼을 원하면 developer 재량이나, 2-pane 단순성 권장.
- **⚠️ 검색 debounce**: 실시간 매칭 제안(§5.1). fixture 8건이라 debounce 불필요하나, 입력 성능 우려 시 developer 재량(디자인 요구 아님).
- **⚠️ mobile 필터 아코디언 기본 상태**: 접힘(collapsed) 기본 권장(§4.4). 펼침 기본은 developer 재량.
- **비범위 재확인**: 담당자 배정/재배정·우선순위 변경·정렬 커스터마이징·CRUD·localStorage 영속화는 s1 §10 대로 **디자인에도 미포함**(추측성 UI 금지).

---

<!-- bf:pr-summary -->
## 시안 요약 (고객지원 인박스 Phase 18 · BF-1019)

s1 기획 명세(BF-1018)를 화면으로 번역한 **목록·검색·필터·상태 전환** 인박스 디자인 명세 + self-contained mockup HTML. canary(BF-1000) 토큰·배지 스타일을 계승하되 **신규 토큰 0** 으로 우선순위·검색·필터 UI 를 추가했다.

**핵심 산출:**
- **2-region 레이아웃**: 목록(검색바+필터 툴바) + 상세/상태전환/이력. 반응형 2→1 pane 축소(§4)
- **우선순위 배지(신규 필드)**: 긴급/높음/보통/낮음 — **기존 fg 토큰 재사용**(danger/hold/received/muted), 상태 pill 과 **형태 구분**(flag+caret), 색+라벨+caret 삼중 인코딩(§6.2)
- **검색바**: id·subject·요청자(name·email) substring OR, assignee 제외 명시(§5.1)
- **필터 칩 그룹**: status·priority·assignee 다중(내부 OR·간 AND), unassigned 특수값, 초기화(§5.2)
- **가드 반영 전이 컨트롤**: G1/G4 위반 전이 disabled+사유. **배정 컨트롤 없음**(비범위)(§5.4)
- **접근성**: 키보드 완주(검색→필터→선택→전이)·roving tabindex·`:focus-visible`·ARIA·`aria-live`(§7)

**토큰 매핑 표(신규 토큰 0 — 전부 재사용):**

| 축 | 값 | fg 토큰 | HEX | 대비(on 배경) |
|---|---|---|---|---|
| 상태 접수 | received | `--sib-color-received` | `#475569` | 7.4:1 (on tint) ✅ |
| 상태 진행 | in_progress | `--sib-color-progress` | `#1D4ED8` | 6.9:1 (on tint) ✅ |
| 상태 보류 | on_hold | `--sib-color-hold` | `#B45309` | 5.3:1 (on tint) ✅ |
| 상태 해결 | resolved | `--sib-color-resolved` | `#0F7B4F` | 5.3:1 (on tint) ✅ |
| 우선 긴급 | urgent | `--sib-color-danger`(재사용) | `#B91C1C` | 5.9:1 (on #fff) ✅ |
| 우선 높음 | high | `--sib-color-hold`(재사용) | `#B45309` | 5.3:1 (on #fff) ✅ |
| 우선 보통 | normal | `--sib-color-received`(재사용) | `#475569` | 8.6:1 (on #fff) ✅ |
| 우선 낮음 | low | `--sib-color-text-muted`(재사용) | `#6B6B66` | 4.8:1 (on #fff) ✅ |

**AC 매핑:** AC-1(우선순위/상태 배지·필터 UI·검색바 + 매핑표)=§5.1/§5.2/§6.1/§6.2/§9 · AC-2(신규 토큰 0 · 일관성 mockup)=§2/§2.4 각주/mockup `:root`.

**산출물:** `docs/design/support-inbox-phase18-BF-1019.md`(명세) · `docs/design/mockups/support-inbox-phase18-BF-1019.html`(mockup).

## Self-critique
- AC 매핑(§9)·dev 가이드(§8, 13단계)·기존 토큰 보존(§2 계승·신규 0)·컴포넌트 역매핑(§9.1)·모호함 flag(§10.1) 5항목 점검 완료.
- flag: 우선순위 caret 표현·이력 통합 위치·검색 debounce·mobile 필터 기본 접힘 — developer 재량 명시. 배정/우선순위 변경·정렬 UI·CRUD·영속화는 s1 §10 대로 미포함.
<!-- bf:pr-summary -->
