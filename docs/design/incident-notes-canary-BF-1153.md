# 장애 메모 협업 SPA — 디자인 명세 · BF-1153

> 작성자: [이디자인] (designer) · 작성일 2026-07-24
> 대상 라우트: `/demo/incident-notes-canary` (dev 구현 진입점 `demo/incident-notes-canary/index.html`)
> primary-module: `incident-notes` (신규 · demo canary 계열)
> 스택 규약: **`vanilla-static`** — 외부 의존성 0건, system font stack, 디자인 토큰은 `:root` CSS 변수로 자체 정의, 하드코딩 색상 금지(모든 색상은 토큰 변수 경유). 정적 fixture + 브라우저 local state 만 사용.
> 참조(수정 금지): `docs/design/sla-breach-triage-canary-BF-1054.md`(demo canary 계열 `--bf-*` 공용 토큰·상태 배지·인라인 에러 패턴), `docs/design/oncall-handoff-BF-1139.md`(색 비의존 3중 인코딩·view-state 배타 전환·WCAG 대비표 패턴)
> mockup 참조: `docs/design/mockups/incident-notes-canary-BF-1153.html`

> ⚠️ **스택 마커 불일치 (fail-honest)**: task 설명 마커는 `bf:tech-stack:typescript-monorepo` 이나, 저장소 관측 규약(base SHA 기준)은 `vanilla-static` 이며 `stack_mismatch: true` 로 판정됨. correction 지시("requested stack marker를 authority 로 쓰지 말 것")에 따라 **저장소 관측 규약 `vanilla-static` 을 authority 로 채택**해 CSS 변수 자체 정의 방식으로 명세한다. design-tokens.json/shadcn 전제는 적용하지 않는다(§11 Self-critique 참조).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 · 반응형](#4-레이아웃--반응형)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 시각 규칙 (view-state + 메모 상태)](#6-상태별-시각-규칙-view-state--메모-상태)
7. [접근성 · WCAG 대비 검증](#7-접근성--wcag-대비-검증)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ UI 매핑 표](#9-ac--ui-매핑-표)
10. [mockup 참조](#10-mockup-참조)
11. [Self-critique](#11-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 라우트 `/demo/incident-notes-canary` 경량 SPA 의 시각 시안. 하나의 장애(incident)에 대해 여러 대응자가 **작성자 · 시각 · 상태**를 남기는 협업 메모를 **세로 타임라인 한 화면**으로 보여주고, 브라우저 local state 로 새 메모를 추가한다.

- 대상 신규 파일(후속 dev 담당): `demo/incident-notes-canary/index.html`, `demo/incident-notes-canary/style.css`, `demo/incident-notes-canary/fixtures.js`, `demo/incident-notes-canary/notes.js`(파일 분할은 dev 재량)
  > ⚠️ 이 구현 경로는 designer owned_paths(`docs/design/**`) **밖**이다. 본 PR 은 명세 markdown + mockup HTML 만 생성하며, 위 경로 구현은 dev-1 담당이다(§11 (b) ownership 교정 참조).
- 기존 모듈 CSS/토큰 공유: demo canary 계열 공용 규약(`--bf-*` 중립 팔레트 · 8px 스페이싱 · system font)을 **답습**하되, 값은 본 라우트 `:root` 에 자체 정의(외부 토큰 파일 import 없음 — vanilla-static). 메모 상태 축은 라우트 전용 프리픽스 `--in-*`(incident-notes)로 분리.
- 기존 파일 수정: **0건**. sla-breach·oncall-handoff 는 **패턴만 참조**(파일 미수정).
- 본 designer PR 이 건드리는 파일: `docs/design/**` 뿐 (코드 미구현).

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| **"지금까지 무슨 일이 있었나"를 스크롤 없이 한눈에** | 좌측 상태 rail 이 달린 세로 타임라인. 각 항목이 작성자·시각·상태·본문을 한 카드에 고정 배치 |
| **각 메모의 진행 상태를 색 스캔 한 번으로 구분** | 타임라인 좌측 dot 색 = 메모 상태색(접수/대응중/보류/완료). 상태 배지도 항목마다 동반 |
| **"누가 언제" 남겼는지 즉시 식별** | 작성자 이름 + `@handle`(mono) + 시각(mono `HH:MM`)을 카드 헤더에 고정. 사람이 손댄 값은 mono 로 위계 부여 |
| **협업 흐름을 끊지 않고 메모 추가** | 타임라인 하단 고정 composer(작성자·상태 select·본문)에서 즉시 append. 페이지 이동/모달 없음 |
| **색맹·저조도에서도 상태 오판 없음** | 메모 상태는 **색 + 한글 라벨 + glyph** 3중 인코딩. 색상만으로 구분되는 정보 0건 |

### 1.3 시각 톤 · 시그니처

톤은 "관제 대시보드"가 아니라 **"함께 쓰는 대응 로그(shared response log)"**. 장식은 0, 강조는 상태 배지·좌측 타임라인 rail·여백·1px 경계선으로만.

> **시그니처 = 상태 rail 타임라인.** 각 메모 왼쪽에 상태색 dot 을 얹은 연속 세로선(rail)을 두어, 화면을 위→아래로 훑는 것만으로 "대응이 어떤 색을 거쳐 어디까지 왔는지"(접수→대응중→보류→완료)가 하나의 궤적으로 읽히게 한다. 이 rail 이 "메모 목록"을 "대응 타임라인"으로 각인시키는 유일한 기억 요소이며, 나머지는 조용하게 유지한다.

---

## 2. 컬러 팔레트

demo canary 계열 공용 규약을 따르는 **light 테마**. 기반 토큰은 `--bf-*`(기존 demo 라우트와 일관), 메모 상태 축만 라우트 전용 `--in-*`. 색상 리터럴(HEX)은 `style.css` 의 `:root` 정의 블록에만 존재하고 컴포넌트 규칙은 `var(--…)` 만 참조한다.

### 2.1 기반 (Base / Surface / Text) — `--bf-*` 공용

| 토큰 | HEX | 용도 | 대비 검증 |
|------|-----|------|-----------|
| `--bf-color-bg` | `#f4f6f9` | 페이지 배경 | — |
| `--bf-color-surface` | `#ffffff` | 카드/composer 배경 | — |
| `--bf-color-surface-muted` | `#eef1f6` | 완료 메모 카드 배경(읽기 톤) | — |
| `--bf-color-border` | `#d5dae1` | **장식용** 구분선(카드 경계·rail 선) — 대비 요건 비적용 | — |
| `--bf-color-border-interactive` | `#8a93a2` | **인터랙티브** 경계(입력·secondary 버튼) — WCAG 3:1(§7.2) | on `#ffffff` ≈ 3.1:1 |
| `--bf-color-text` | `#1a2230` | 본문/제목 텍스트 | on `#ffffff` ≈ 14.8:1 |
| `--bf-color-text-muted` | `#4d5769` | 보조 텍스트(작성자 핸들·라벨) | on `#ffffff` ≈ 7.1:1 |
| `--bf-color-text-faint` | `#6b7688` | 최약 텍스트(타임스탬프·캡션 12px 전용) | on `#ffffff` ≈ 4.6:1 |
| `--bf-color-primary` | `#1d4ed8` | primary 버튼 배경 / 포커스 링 | white 텍스트 ≈ 6.3:1 |
| `--bf-color-primary-hover` | `#1740a6` | primary 버튼 hover | white 텍스트 ≈ 8.4:1 |
| `--bf-color-on-primary` | `#ffffff` | primary 버튼 텍스트 | — |
| `--bf-color-danger` | `#b3261e` | 인라인 에러 텍스트/테두리 · error 배너 | on `#ffffff` ≈ 6.6:1 |
| `--bf-color-focus` | `#1d4ed8` | `:focus-visible` outline | 표면 대비 ≈ 6.3:1(UI) |

### 2.2 메모 상태 status (핵심 4-state 축: 접수/대응중/보류/완료) — `--in-*`

각 상태 = `배경 틴트(bg) + 진한 텍스트(fg)` 1세트 + **타임라인 dot 색(= fg)** + **glyph**. 상태는 **색 + 한글 라벨 + glyph** 3중 인코딩. 배지 라벨은 항상 한글 병기.

| status | 한글 라벨 | glyph(형태) | `--in-{s}-fg` | `--in-{s}-bg` | 형태 보조(색 비의존) |
|--------|-----------|-------------|---------------|----------------|------------------------|
| open 접수 | `접수` | `○` 빈 원 | `#33415a` | `#eef1f6` | dot 속 빈 원, rail dot 테두리만 |
| in-progress 대응중 | `대응중` | `◐` 반원 | `#1740a6` | `#e7effd` | dot 채움 + 펄스 링(정적)·배지 좌측 glyph |
| on-hold 보류 | `보류` | `⏸` 일시정지 | `#7a5200` | `#fbedcb` | dot 채움 + `⏸` glyph, 카드 좌측 rail 파선 |
| resolved 완료 | `완료` | `✓` 체크 | `#0f5a2e` | `#e4f4ea` | dot 채움 + `✓`, 카드 배경 muted 로 종단 표기 |

> **접수 ≠ 완료 구분**: `접수` = 방금 기록된 관찰/알림(아직 착수 전). `완료` = 해당 조치가 종결됨(카드 배경 muted + `✓`). 두 상태는 색·glyph·카드 배경이 모두 달라 색을 못 보는 사용자도 형태로 구분한다.

### 2.3 전체 장애 상태(overall) 헤더 배지

타임라인 상단 헤더에 이 장애의 **현재 종합 상태**를 1개 배지로 노출. §2.2 status 토큰을 재사용하며, 메모들에서 파생한다(§6.3 파생 규칙).

| overall | 라벨 | 파생 조건 | 재사용 토큰 |
|---------|------|-----------|-------------|
| 대응중 | `대응 진행 중` | 활성(미완료) 메모 ≥1 & 최근 상태가 대응중/접수 | `--in-inprogress-*` |
| 보류 | `대응 보류` | 최신 활성 메모가 보류 | `--in-onhold-*` |
| 해결 | `해결됨` | 모든 메모가 완료 | `--in-resolved-*` |

---

## 3. 타이포그래피

system font stack 기반 — 외부 폰트/CDN 0건(vanilla-static 준수).

### 3.1 폰트 패밀리

```css
--bf-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
--bf-font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

- **mono 의 역할이 곧 정보 위계**: 사람이 손대는 식별자(작성자 `@handle`)·기계 시간(`09:08`, `datetime`)만 mono. 서술 텍스트(메모 본문)는 sans. 이 대비가 "이건 실제 값이다"를 폰트만으로 전달.

### 3.2 텍스트 스케일

| 역할 | 토큰 | 정의 (weight size/line-height) | 적용 요소 |
|------|------|-------------------------------|-----------|
| Page title (h1) | `--bf-type-h1` | `700 24px/1.3` | `.in-header__title`(=`<h1>`) — "장애 메모 · {제목}" |
| Section title (h2) | `--bf-type-h2` | `600 18px/1.35` | `.in-composer__title`("메모 추가") |
| Card 작성자 (h3) | `--bf-type-h3` | `600 15px/1.4` | `.in-note__author`(=`<h3>`) |
| Body | `--bf-type-body` | `400 15px/1.6` | 메모 본문·입력·버튼 |
| Caption | `--bf-type-caption` | `500 12px/1.45` | `@handle`·타임스탬프·상태 배지·보조 라벨 |

- 본문 최소 15px(가독성). `@handle`·`time` 은 mono. 시각 정렬 안정화를 위해 타임스탬프에 `font-variant-numeric: tabular-nums`.
- 메모 본문은 `overflow-wrap: anywhere`(긴 URL·에러코드 대비), 한글 어절 자연 줄바꿈.

---

## 4. 레이아웃 · 반응형

### 4.1 페이지 골격

```
<body> (bg=canvas, max-width 760px, 중앙 정렬, 좌우 padding 16px)
 ├─ <header class="in-header">              장애 메모 · {제목}  +  overall 상태 배지 + 메타(영향 서비스·시작 시각)
 └─ <main id="incident-notes" data-view-state="…">   상태 1개만 렌더(§6)
      ├─ <ol class="in-timeline">           ◀ 시그니처: 상태 rail 세로 타임라인(시간 오름차순)
      │    └─ <li class="in-note in-note--{status}"> × N
      │         ├─ .in-note__rail            좌측 rail + 상태 dot(::before 연결선)
      │         └─ .in-note__body
      │              ├─ .in-note__head        작성자(h3) · @handle(mono) ↔ time(mono) · 상태 배지
      │              └─ .in-note__text         메모 본문
      └─ <form class="in-composer">          하단 고정 메모 추가(local state append)
           ├─ 작성자 표시(현재 사용자) + 상태 <select>
           ├─ <textarea>(본문) + 인라인 에러 영역(role="alert")
           └─ "메모 추가" 버튼(primary)
```

### 4.2 spacing / radius / shadow — 8px 그리드

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bf-space-1`~`--bf-space-8` | `4 / 8 / 12 / 16 / 24 / 32 px` (1·2·3·4·6·8) | 아래 매핑 |
| `--bf-radius` / `--bf-radius-sm` / `--bf-pill` | `12 / 8 / 999 px` | 카드·composer / 입력·버튼 / 배지 |
| `--bf-shadow` | `0 4px 16px rgba(20,30,50,0.08)` | 카드·composer 그림자(light 톤) |

- 페이지 상하 padding `--bf-space-8`(32). 헤더 ↔ 타임라인 gap `--bf-space-6`(24).
- 타임라인 항목 간 gap `--bf-space-4`(16). 카드 내부 padding `--bf-space-4`.
- rail 폭: dot 지름 14px, 연결선 2px, rail 열 고정 `28px`. `.in-note` 그리드 `28px 1fr`.
- composer 는 타임라인 하단에 `--bf-space-6` 여백 후 배치(모바일에서도 하단 고정 아님 — 스크롤 흐름 유지).

### 4.3 breakpoint 별 동작

| 화면폭 | 동작 |
|--------|------|
| `≥561px` (기본) | 카드 헤더 `작성자·@handle` ↔ `time·배지` 좌우 양끝 정렬(`space-between`). composer 작성자/상태 select 가로 1행 |
| `≤560px` (모바일) | 카드 헤더 세로 스택(작성자 → 시각 → 배지 순). rail 열은 유지(타임라인 궤적 보존). composer 입력/버튼 세로 100% 폭, 터치 타겟 최소 높이 44px |

- 상태 배지·time 은 `flex-shrink: 0` 로 온전 표시, 작성자명이 먼저 줄바꿈.

---

## 5. 컴포넌트 명세

> 모든 컴포넌트는 정적 표시 우선. 인터랙션은 composer 폼·버튼만(카드 자체는 링크 아님).

### 5.1 헤더 `.in-header`

| 항목 | 명세 |
|------|------|
| 역할 | 어떤 장애의 메모인지 + 종합 상태 + 메타를 한 블록에 고정 |
| props | `incident: { title, affectedService, startedAt }`, `overall: "in-progress"｜"on-hold"｜"resolved"` |
| 구성 | `<h1>장애 메모 · {title}</h1>` + overall 배지(§2.3) + 메타 줄(`영향: {service} · 시작 {time}`, time 은 mono) |
| overall 배지 | `role="status"` + `aria-label="장애 상태: {라벨}"`. 색 + 한글 라벨 + glyph |

### 5.2 타임라인 `.in-timeline` (시그니처) + 메모 카드 `.in-note`

| 항목 | 명세 |
|------|------|
| 컨테이너 | `<ol class="in-timeline">` — 시간 **오름차순**(오래된 것 위, 최신 아래 = composer 근처). 읽기 순서 = 시각 순서 |
| 항목 | `<li class="in-note in-note--{status}">`, `id="note-{note.id}"` |
| props(항목) | `{ id, author:{name, handle}, at, status, text }` |
| 4요소 배치 | ①작성자=`.in-note__author`+`@handle`(mono) · ②시각=`<time datetime>`(mono) · ③상태=`.in-status` 배지+rail dot · ④본문=`.in-note__text` |
| rail | `.in-note__rail` 좌측 열: 상태 dot(`.in-dot--{status}`) + 위/아래 연결선(`::before`/`::after`, `--bf-color-border`). 첫 항목은 위 선 없음, 마지막 항목은 아래 선 없음 |
| DOM 순서 | 헤더(작성자·핸들·시각·배지) → 본문 (읽기 순서 = 시각 순서) |
| 상태(state) | 카드 정적. 완료 상태 카드는 배경 `--bf-color-surface-muted`(종단 표기) |

#### 5.2.1 상태 배지 `.in-status`
- pill, `glyph(aria-hidden) · 한글 라벨`. `role="img"` + `aria-label="상태: {한글}"`. 배경/텍스트 = `--in-{status}-bg` / `-fg`.

#### 5.2.2 타임라인 dot `.in-dot`
- 지름 14px 원, 색 = `--in-{status}-fg`. `접수` 는 빈 원(테두리만), 나머지는 채움. `aria-hidden="true"`(상태 정보는 배지가 전달 — 중복 SR 방지).

#### 5.2.3 작성자 `.in-note__author` / 시각 `<time>`
- 작성자 이름(sans, h3) + `@handle`(mono, muted). 시각 `<time datetime="ISO">HH:MM</time>`(mono, faint, tabular-nums).

### 5.3 메모 추가 composer `.in-composer` (브라우저 local state)

| 항목 | 명세 |
|------|------|
| 역할 | 새 메모를 타임라인 끝에 append(브라우저 local state — 서버 전송/`fetch` 없음) |
| props | `currentUser:{name, handle}`, `onAdd({status, text})` |
| 필드 | 작성자 표시(현재 사용자, 고정 라벨) + 상태 `<select>`(접수/대응중/보류/완료, 기본 `대응중`) + 본문 `<textarea>` + "메모 추가" 버튼(primary) |
| 검증 | 본문 공백이면 append 금지 → `.in-inline-error`(`role="alert"`, `aria-live="polite"`) "메모 내용을 입력하세요". `<label for>`/`aria-label` 연결, 에러 시 `aria-invalid="true"` + `aria-describedby` |
| 인터랙션 | 추가 성공 시 새 `.in-note` 가 타임라인 끝에 붙고 헤더 overall 배지 재파생(§6.3), textarea 초기화. select `:focus-visible`/버튼 hover→`--bf-color-primary-hover` |

### 5.4 인라인 에러 `.in-inline-error` / 빈 상태 `.in-empty` / error 배너 `.in-error`
- §6.4 / §6.5 참조. 인라인 에러는 값이 채워질 때만 노출(평상시 시각적 비어있음).

---

## 6. 상태별 시각 규칙 (view-state + 메모 상태)

`<main id="incident-notes" data-view-state="…">` 값에 따라 CSS 로 배타 전환(oncall-handoff §6 패턴 승계). JS 는 속성 1개만 바꾼다.

```css
/* dev 구현 패턴 — 상태 전환은 CSS 담당, JS 는 data-view-state 만 변경 */
[data-view-state="loading"] .in-ready-only,
[data-view-state="empty"]   .in-ready-only,
[data-view-state="error"]   .in-ready-only { display: none; }
[data-view-state="ready"]   .in-skeleton,
[data-view-state="empty"]   .in-skeleton,
[data-view-state="error"]   .in-skeleton { display: none; }
[data-view-state="ready"]   .in-empty,
[data-view-state="ready"]   .in-error { display: none; }
```

### 6.1 view-state 표

| view-state | 트리거(fixture 기준) | 시각 |
|------------|----------------------|------|
| **ready** | 메모 ≥1 | 헤더(overall 배지) + 상태 rail 타임라인 + composer. 메모 상태별 색 구분 |
| **empty** | 메모 0건(신규 장애) | `.in-empty` 중앙 블록(점선 원 + `—`) + `아직 기록된 장애 메모가 없습니다.` + composer 는 **유지**(첫 메모 작성 가능) |
| **error** | fixture 로드 실패 | `.in-error` `role="alert"` 배너 고정 문구 `장애 메모를 불러오지 못했습니다. 페이지를 새로고침해 주세요.` + 선행 `⚠`(aria-hidden). 재시도 버튼 없음 |
| **loading** | 초기 진입 | 정적 스켈레톤 타임라인(펄스 1.2s). `prefers-reduced-motion` 시 애니메이션 정지. 인위적 지연 금지 |

### 6.2 메모 상태(status) 시각 — AC-3 핵심

메모 각 항목은 §2.2 4-state 중 하나. **타임라인 dot 색 + 카드 배지 색 + glyph** 로 상태가 시각적으로 구분된다. mockup(§10) ready 타임라인에 4개 상태를 모두 렌더해 색 구분을 한 화면에서 확인.

### 6.3 overall 파생 규칙 (dev)
- 활성(미완료) 메모 존재 & 최신 활성 상태 ∈ {접수, 대응중} → `대응 진행 중`
- 최신 활성 메모 = 보류 → `대응 보류`
- 모든 메모 = 완료 → `해결됨`
- 메모 추가/상태 변화 시 재계산(순수 함수 `deriveOverall(notes)`).

- **고정 문구**(재해석 금지): 빈=`아직 기록된 장애 메모가 없습니다.`, error=`장애 메모를 불러오지 못했습니다. 페이지를 새로고침해 주세요.`, 본문 검증=`메모 내용을 입력하세요`.
- ready/empty/error 3개 view-state 는 mockup 에 `<section>` 으로 나란히 렌더되어 시각 비교 가능(§10).

---

## 7. 접근성 · WCAG 대비 검증

### 7.1 요구

| 항목 | 충족 방법 |
|------|-----------|
| 색 비의존 | 메모/overall 상태 전부 **색 + 한글 라벨 + glyph** 병기. dot 은 `aria-hidden`(상태는 배지가 전달). 색만으로 구분되는 정보 0건 |
| 키보드 | 인터랙티브는 네이티브 `<select>`/`<textarea>`/`<button type="button">` 만. Tab 순서 = DOM 순서(composer: select → textarea → 버튼). 임의 양수 `tabindex` 금지. 카드 자체는 클릭 대상 아님 |
| 포커스 가시성 | 전 인터랙티브 `:focus-visible { outline: 2px solid var(--bf-color-focus); outline-offset: 2px; }`. 전역 `outline: none` 리셋 **금지** |
| SR 안내 | overall 배지 `role="status"`+`aria-label`, 상태 배지 `role="img"`+`aria-label`, error 배너 `role="alert"`, 인라인 에러 `role="alert"`+`aria-live="polite"`, 장식 glyph/dot 전부 `aria-hidden="true"` |
| 모션 | `@media (prefers-reduced-motion: reduce)` → 스켈레톤 펄스 등 `animation:none; transition:none;` |
| 시맨틱 | 타임라인 `<ol>/<li>`(시간 순서 = 순서형 목록), 작성자 `<h3>`, 시각 `<time datetime>`, composer `<form>` + `<label>` |

### 7.2 대비비 검증표 (WCAG 2.1 — 텍스트 4.5:1 / UI 경계·큰 텍스트 3:1) — 계산값

| 전경 | 배경 | 대비비 | 기준 | 판정 |
|------|------|--------|------|------|
| `--bf-color-text` `#1a2230` | `--bf-color-surface` `#ffffff` | **14.8:1** | 4.5 | ✅ AAA |
| `--bf-color-text` `#1a2230` | `--bf-color-surface-muted` `#eef1f6` | **13.2:1** | 4.5 | ✅ AAA |
| `--bf-color-text-muted` `#4d5769` | `#ffffff` | **7.1:1** | 4.5 | ✅ AAA |
| `--bf-color-text-faint` `#6b7688` | `#ffffff` | **4.6:1** | 4.5 | ✅ (12px 캡션/타임스탬프 전용 — 본문·라벨 사용 금지) |
| primary 텍스트 `#ffffff` | `--bf-color-primary` `#1d4ed8` | **6.3:1** | 4.5 | ✅ AAA |
| primary hover 텍스트 `#ffffff` | `#1740a6` | **8.4:1** | 4.5 | ✅ AAA |
| `--bf-color-danger` `#b3261e` | `#ffffff` | **6.6:1** | 4.5 | ✅ AAA |
| 포커스 링 `#1d4ed8` | `#ffffff` | **6.3:1** | 3 | ✅ (UI) |
| `--bf-color-border-interactive` `#8a93a2` | `#ffffff` | **3.1:1** | 3 | ✅ (UI 경계) |
| status 접수 `#33415a` | `#eef1f6` | **9.0:1** | 4.5 | ✅ AAA |
| status 대응중 `#1740a6` | `#e7effd` | **7.9:1** | 4.5 | ✅ AAA |
| status 보류 `#7a5200` | `#fbedcb` | **5.9:1** | 4.5 | ✅ AA |
| status 완료 `#0f5a2e` | `#e4f4ea` | **7.6:1** | 4.5 | ✅ AAA |

> **dev 주의**: `--bf-color-border`(장식, ~1.5:1)와 `--bf-color-border-interactive`(≥3:1)는 **용도가 다른 토큰**이다. 입력·버튼 경계에 `--bf-color-border` 를 쓰면 WCAG 3:1 위반. 계산은 `docs/design/mockups/incident-notes-canary-BF-1153.html` 에 반영된 값과 동일.

---

## 8. dev 구현 가이드

> 대상 파일: `demo/incident-notes-canary/`(후속 dev task 신규 생성). 본 명세는 계약이며 파일 분할 세부는 dev 재량. mockup 은 시각 참조용, 픽셀 일치 의무 없음(§8.4).

### 8.1 재사용 원칙 (Simplicity First)

1. **CSS**: `style.css` `:root` 에 §2 토큰 정의 — 기반은 `--bf-*`(demo 계열 일관), 메모 상태는 `--in-*`. 색상 리터럴(HEX)은 이 블록에만, 컴포넌트 규칙은 `var(--…)` 만 참조. sla-breach·oncall-handoff 파일을 import 하지 말 것(패턴 참조만).
2. **JS**: `fixtures.js` 에 장애 1건 + 메모 배열 정적 fixture. `notes.js` 는 `deriveOverall(notes)` → `renderHeader()` → `renderTimeline()` 순으로 로드 시 1회 렌더 + composer submit 핸들러(local state append). **`fetch`/`XMLHttpRequest`/`setInterval`/외부 URL 금지**(vanilla-static, 브라우저 local state 만).
3. **마크업**: §4.1 골격을 §5 클래스명으로 재현. `data-view-state` 속성으로 상태 전환.

### 8.2 단계별 지침

1. `demo/incident-notes-canary/index.html` — `<main id="incident-notes" data-view-state="loading">` 골격 + 정적 스켈레톤 + `<noscript>` 폴백. 헤더 `<h1>장애 메모 · {제목}</h1>`.
2. `style.css` — §2 토큰 → §5 컴포넌트 규칙. 클래스명(`in-header`/`in-timeline`/`in-note`(+`--open|inprogress|onhold|resolved`)/`in-note__rail`/`in-dot`(+`--{status}`)/`in-note__head`/`in-note__author`/`in-note__text`/`in-status`(+`--{status}`)/`in-composer`/`in-inline-error`/`in-empty`/`in-error`) 유지 권장.
3. `notes.js` — 초기 fixture 로 타임라인 렌더(시간 오름차순 정렬). composer submit → 본문 검증(공백 시 인라인 에러) → 통과 시 `{id, author:currentUser, at:now, status:selected, text}` append → 타임라인 재렌더 + `deriveOverall` 로 헤더 배지 갱신. `now` 는 호출부 주입.
4. 정적 검사: `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|https?://" demo/incident-notes-canary/*` → 매치 0건(자체 상대경로 리소스 제외).

### 8.3 색상 하드코딩 규칙
- 색상 리터럴은 `style.css` 토큰 정의 블록(`:root`)에만. 컴포넌트 규칙은 `var(--…)` 만 참조. 하드코딩 색 발견 시 리뷰 반려 대상.

### 8.4 mockup 픽셀 일치 의무 없음
- `docs/design/mockups/incident-notes-canary-BF-1153.html` 는 시각 시뮬레이션(ready/empty/error 나란히 + 4상태 메모). dev 는 실제 SPA 에서 데이터/local state 에 따라 렌더한다. mockup 은 참조 가이드이며 픽셀 단위 일치 의무 없음.

---

## 9. AC ↔ UI 매핑 표

| 수용 기준 | 충족 UI / 명세 근거 | mockup 확인 지점 |
|-----------|---------------------|------------------|
| **AC-1** · SPA 진입 시 작성자·시각·상태가 **타임라인 한 화면**에 배치되는 레이아웃 | §4.1 골격(세로 타임라인) + §5.2 메모 카드가 작성자·시각·상태·본문 4요소를 한 카드에 고정 배치. §1.3 상태 rail 시그니처 | ready `<section>` 타임라인에 4개 메모(작성자·time·배지) 렌더 |
| **AC-2** · 기존 demo 라우트와 **공용 스타일/토큰 일관성** 유지 + **AC 매핑 표** 포함 | §2.1 `--bf-*` 공용 토큰(sla-breach 계열 답습, light 테마·8px 그리드·system font) + 본 §9 표 | mockup `:root` 가 `--bf-*` 토큰 사용, sla-breach 와 동일 팔레트 계열 |
| **AC-3** · 정적 fixture 렌더 시 **상태별 컬러 구분이 시각적으로 확인 가능** | §2.2 4-state status 토큰(색+라벨+glyph) + §5.2.1/§5.2.2 상태 배지·rail dot 색 = 상태 fg. §6.2 | ready 타임라인에 접수/대응중/보류/완료 4색 dot + 배지 나란히 렌더 |

---

## 10. mockup 참조

- **경로**: `docs/design/mockups/incident-notes-canary-BF-1153.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). §2 팔레트·§3 타이포·§4 레이아웃·§5 컴포넌트 그대로 시각화.
- **3개 view-state(ready/empty/error)를 `<section>` 으로 나란히** 렌더 + ready 타임라인에 **4개 메모 상태(접수/대응중/보류/완료)를 모두 포함**해 상태별 컬러 구분을 한 화면에서 확인(AC-3). composer(메모 추가 폼)도 정적 표현.
- fixture 는 플레이스홀더(결제 API 5xx 급증 장애, 김SRE·이백엔드·박인프라 대응자). UX 의도 전달이 목적이며 실데이터 아님.
- light 1종 렌더(demo canary 계열 일관). dev 산출물과 픽셀 일치 의무 없음(§8.4).

---

## 11. Self-critique

PR commit 직전 자기 점검 (dev·reviewer 가 받기 전 명세 누락/모호함 검증):

1. **AC 매핑** — AC-1(작성자·시각·상태 타임라인 한 화면) → §4.1 + §5.2 4요소 카드 + §1.3 rail 시그니처. AC-2(demo 라우트 토큰 일관성 + AC 매핑 표) → §2.1 `--bf-*` 공용 토큰 답습 + 본 §9 표. AC-3(상태별 컬러 구분 시각 확인) → §2.2 4-state + §5.2.2 rail dot + mockup 4색 렌더. ✅
2. **dev 구현 가이드** — §8 에 토큰 정의 위치(`--bf-*`/`--in-*` 분리)·overall 파생 규칙·클래스명 목록·정적 검사 grep·하드코딩 규칙·local state append 흐름 명시. dev 가 단계대로 따라갈 수 있음. ✅
3. **기존 요소 보존** — sla-breach·oncall-handoff 는 **패턴만 참조, 파일 수정 0건**(§1.1). 기반 토큰은 demo 계열 공용 `--bf-*` 답습(일관성), 메모 상태만 신규 `--in-*` 프리픽스로 충돌 없음. 회귀 위험 없음. ✅
4. **컴포넌트 매핑** — §5 각 컴포넌트가 mockup 클래스명과 1:1(in-header/in-timeline/in-note/in-status/in-dot/in-composer/in-inline-error/in-empty/in-error). 메모 4요소(작성자·시각·상태·본문) ↔ 카드 요소 §5.2 에 번호로 매핑. ✅
5. **모호함 flag**:
   - ⚠️ **(a) 스택 마커 불일치**: task 마커 `typescript-monorepo` vs 저장소 관측 규약 `vanilla-static`(`stack_mismatch: true`). correction 지시대로 **관측 규약 `vanilla-static` 을 authority 로 채택**(CSS 변수 자체 정의, 외부 의존성 0). design-tokens.json/shadcn 전제 미적용. 토큰 값 자체는 프레임워크 무관하므로, 향후 monorepo 로 실제 전환 시 dev/planner 가 토큰을 전역 스타일로 이식하면 됨.
   - ⚠️ **(b) 구현 경로 ownership 교정**: dev 구현 진입점 `demo/incident-notes-canary/index.html` 은 designer owned_paths(`docs/design/**`) **밖**이다. 본 PR 은 명세+mockup 만 생성하며, 해당 경로 구현은 dev-1 담당. reviewer/planner 는 dev task 의 owned_paths 에 `demo/incident-notes-canary/**` 가 포함됐는지 확인 필요.
   - **(c) 메모 상태 변경(재편집)** 은 이번 범위에서 제외(append-only 협업 로그). 기존 메모의 상태 전환이 필요하면 후속 task 로 분리 권장.
   - **(d) 타임라인 정렬**은 시간 **오름차순**(오래된 것 위, composer 근처가 최신)으로 기본 제시 — 대응 로그 자연 흐름. 운영 선호에 따라 내림차순 조정 가능(dev/planner 재량).
   - **(e) loading 스켈레톤**은 §6 에 규칙만 명시(mockup 미렌더) — ready/empty/error 3 view-state 시각화가 우선이라 판단.

---

<!-- bf:pr-summary -->
## 시안 요약 — 장애 메모 협업 SPA (BF-1153)

하나의 장애에 대해 여러 대응자가 **작성자·시각·상태**를 남기는 협업 메모를 **세로 타임라인 한 화면**으로 보여주고, 브라우저 local state 로 새 메모를 추가하는 `/demo/incident-notes-canary` 경량 SPA 시안. 기존 demo canary 계열(`sla-breach` 등) **공용 `--bf-*` 토큰 답습**(light 테마·8px 그리드·system font), 메모 상태 축만 신규 `--in-*`.

**⚠️ 스택 마커 불일치**: task 마커 `typescript-monorepo` vs 저장소 관측 규약 `vanilla-static`. correction 지시대로 **`vanilla-static` 을 authority 로 채택**(CSS 변수 자체 정의·외부 의존성 0). 구현 경로 `demo/incident-notes-canary/` 는 designer owned 밖 — dev-1 담당(§11 (a)(b)).

**시그니처 — 상태 rail 타임라인**: 각 메모 좌측 상태색 dot 을 얹은 연속 세로선으로 "대응이 어떤 색을 거쳐 어디까지 왔는지"를 하나의 궤적으로 각인.

**4-state 메모 상태 (색+한글+glyph 3중 인코딩):**

| status | 라벨 | glyph | fg | bg |
|---|---|---|---|---|
| open | 접수 | ○ | `#33415a` | `#eef1f6` |
| in-progress | 대응중 | ◐ | `#1740a6` | `#e7effd` |
| on-hold | 보류 | ⏸ | `#7a5200` | `#fbedcb` |
| resolved | 완료 | ✓ | `#0f5a2e` | `#e4f4ea` |

**타임라인 한 화면 4요소**: 메모 카드 1장 = 작성자(이름+@handle mono) · 시각(mono `HH:MM`) · 상태(배지 + rail dot 색) · 본문. 하단 composer 로 local state append(fetch 없음).

**접근성**: 전 대비비 WCAG 통과(본문 ≥4.6:1 / 상태 배지 ≥5.9:1 / UI 경계 ≥3.1:1), `role="status|img|alert"`, `aria-label/hidden`, `:focus-visible`, `prefers-reduced-motion`. 색상만으로 구분되는 정보 0건.

**산출물**: `docs/design/incident-notes-canary-BF-1153.md`(명세) + `docs/design/mockups/incident-notes-canary-BF-1153.html`(ready/empty/error 3상태 + 메모 4색 나란히 렌더, self-contained). dev 는 `--bf-*`+`--in-*` 토큰 정의 + `deriveOverall` 파생 규칙(§6.3)으로 구현.
<!-- /bf:pr-summary -->
