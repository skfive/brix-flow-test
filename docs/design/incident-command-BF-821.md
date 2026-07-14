# Incident Command Center UI 시안 명세 — BF-821

> 작성자: [이디자인] (designer) · 작성일 2026-07-14
> 관련 티켓: BF-823 (designer task) · BF-822 (planner task) · BF-821 (부모 Epic)
> 기획 문서: `docs/plan/incident-command-BF-821.md` (본 시안의 상위 source of truth — 본 문서는 이를 **재해석하지 않고 시각화만** 한다)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> mockup 참조: `docs/design/mockups/incident-command-BF-823.html`

> **파일명 규칙 안내**: 본 명세 파일명은 BF-823 수용 기준에 리터럴로 명시된 경로(`docs/design/incident-command-BF-821.md`, **Epic 키** 기준)를 그대로 따랐다 — 기획 문서(`docs/plan/incident-command-BF-821.md`)·기존 `incident-triage-BF-800.md`(designer task BF-802) 사례와 동일한 규칙. mockup HTML 은 시스템 screenshot capture 규약상 **현재 task 키 BF-823** 을 사용한다. 의도된 차이이며 오타가 아니다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [디자인 토큰 — 컬러 팔레트](#2-디자인-토큰--컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [스페이싱 · 라디우스 · 그림자](#4-스페이싱--라디우스--그림자)
5. [레이아웃 · 반응형](#5-레이아웃--반응형)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [상태별 시각 규칙 (loading · empty · error · 결과없음 · 미선택)](#7-상태별-시각-규칙-loading--empty--error--결과없음--미선택)
8. [접근성 · WCAG 대비 검증](#8-접근성--wcag-대비-검증)
9. [dev 구현 가이드](#9-dev-구현-가이드)
10. [AC ↔ UI 매핑 표](#10-ac--ui-매핑-표)
11. [mockup 참조 · PNG evidence](#11-mockup-참조--png-evidence)
12. [Self-critique](#12-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 모듈 `incident-command/` 의 시각 시안. 운영자가 진행 중 장애 목록을 한눈에 훑고(Master), 한 건을 골라 심각도·담당자·타임라인·복구 체크리스트를 확인·체크하는(Detail) **dark operations 대시보드**의 컬러·타이포·레이아웃·컴포넌트·상태별 시각 규칙을 정의한다.

- 대상 신규 파일: `incident-command/index.html`, `incident-command/style.css` (+ dev 담당 `fixtures.js`, `command.js`, `package.json`)
- 기존 모듈 CSS/토큰 공유: **없음** — 완전 독립. CSS 변수 프리픽스 `--ic-*` (기획 §8.2 제안 그대로 채택, 기존 `--it-*`/`--rr-*` 와 충돌 없음)
- 기존 파일 수정: **0건** (기획 §12 AC-13 — `incident-triage/`, `release-readiness/` 등 무변경)
- 본 designer PR 이 건드리는 파일: `docs/design/**` 뿐 (코드 미구현 — 구현은 dev-1 담당)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| **"지금 제일 급한 게 뭔가"를 1초 안에** | 좌측 목록에서 severity 배지를 행 최좌단 고정 위치에 배치 + P1 은 행 좌측에 4px 컬러 레일(rail)로 강조. 스캔 경로(좌→우)의 첫 픽셀이 곧 심각도 |
| **눈이 덜 피로한 야간 온콜 대응** | dark operations 팔레트. 배경은 순수 검정(#000) 이 아닌 청록빛 딥네이비(#0B0F17)로 잔상·눈부심 완화, 텍스트는 순백(#FFF) 대신 #E8EDF5 로 대비를 낮춰 장시간 응시 부담 감소 |
| **색맹·저조도에서도 오판 없음** | severity/status/eventType 은 **색 + 한글 라벨 + 형태(도형/테두리)** 3중 인코딩 (기획 §14.3 준수). 색상만으로 구분되는 정보 0건 |
| **체크리스트 진행이 "일한 느낌"으로 보이도록** | 진행률 바를 상세 패널 sticky 헤더 바로 아래 고정. 체크 시 항목 텍스트에 취소선 + 완료 시각(mono) 노출 → 즉각적 피드백 |
| **타임라인은 읽기 전용임이 시각적으로 자명** | 세로 라인 + 노드 형태. hover/pointer/포커스링 없음 → 클릭 가능해 보이지 않게 의도적으로 무반응 처리 |

### 1.3 시각 톤

"NASA 관제실 / SRE war room" — 정보 밀도는 높되 장식은 0. 그라데이션·아이콘 폰트·일러스트 없음(vanilla-static 제약이자 톤 선택). 강조는 오직 **컬러 배지 + 여백 + 1px 경계선**으로만 만든다.

---

## 2. 디자인 토큰 — 컬러 팔레트

모두 `incident-command/style.css` 의 `:root` 에 직접 정의한다 (외부 토큰 파일 import 없음 — vanilla-static).

### 2.1 기반 (Base / Surface / Text)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--ic-bg` | `#0B0F17` | 페이지 최상위 배경 (딥네이비) |
| `--ic-surface` | `#131A26` | 패널/카드 배경 (목록 패널, 상세 패널) |
| `--ic-surface-raised` | `#1B2433` | 한 단계 뜬 면 (목록 행 hover, 상세 헤더, 체크리스트 항목) |
| `--ic-surface-selected` | `#1E2A3D` | 선택된 목록 행 배경 |
| `--ic-border` | `#2A3648` | **장식용** 구분선 (패널 경계, 타임라인 레일) — 대비 요건 비적용 |
| `--ic-border-interactive` | `#6B7C94` | **인터랙티브 컨트롤** 경계 (필터 칩, 목록 행, 체크박스) — WCAG 3:1 충족 (§8.2) |
| `--ic-text` | `#E8EDF5` | 본문/제목 기본 텍스트 |
| `--ic-text-secondary` | `#9FB0C7` | 보조 텍스트 (담당자 팀, note 본문) |
| `--ic-text-muted` | `#6B7C94` | 최약 텍스트 (타임스탬프, 캡션) |
| `--ic-accent` | `#4DA3FF` | 포커스 링, 링크, 활성 필터 칩 |
| `--ic-accent-fg` | `#08111C` | 활성 필터 칩 위 텍스트 (accent 배경 대비 8.4:1, §8.2) |

### 2.2 Severity 배지 (기획 §4.1 — P1~P4)

각 배지는 `배경(bg) + 텍스트(fg) + 1px 테두리(border)` 3토큰 1세트. 텍스트는 항상 한글 라벨 병기.

| severity | 한글 라벨 | `--ic-sev-{n}-fg` | `--ic-sev-{n}-bg` | `--ic-sev-{n}-border` | 형태 보조 |
|----------|-----------|-------------------|-------------------|------------------------|-----------|
| `P1` | 치명 | `#FF8A8A` | `#3A1518` | `#7A2A30` | 목록 행 좌측 4px 레일 + 배지 테두리 2px (유일하게 2px) |
| `P2` | 높음 | `#FFC96B` | `#3A2A10` | `#7A5A20` | 좌측 레일 4px |
| `P3` | 보통 | `#7DB8FF` | `#12283F` | `#2C5480` | 좌측 레일 4px |
| `P4` | 낮음 | `#B9C7DA` | `#212C3B` | `#44536B` | 좌측 레일 4px |

> **P1 만 배지 테두리 2px** — 색을 못 보는 사용자도 "가장 두꺼운 배지 = 가장 급함"을 형태로 인지. 라벨 텍스트는 `P1 · 치명` 형식으로 코드+한글 동시 표기.

### 2.3 Status 배지 (기획 §4.2 — 5단계)

배경은 5종 공통 `#1E2735`, 텍스트 색 + **선행 도형(dot)** 으로 구분.

| status | 한글 라벨 | `--ic-status-*-fg` | 공통 bg | 선행 도형 (색 비의존 인코딩) |
|--------|-----------|--------------------|---------|------------------------------|
| `detected` | 감지됨 | `#C7D3E3` | `#1E2735` | ○ 속 빈 원 (border only) |
| `investigating` | 조사중 | `#FFC96B` | `#1E2735` | ◐ 반원 (원 + 우측 절반 채움) |
| `mitigating` | 조치중 | `#5EEAD4` | `#1E2735` | ● 채운 원 |
| `monitoring` | 모니터링 | `#7DB8FF` | `#1E2735` | ◎ 이중 원 (링) |
| `resolved` | 해결됨 | `#4ADE80` | `#1E2735` | ✓ 체크 글리프 |

> 도형은 이미지/아이콘 폰트가 아니라 **CSS 로 그린 `::before` 의사 요소**(border-radius/box-shadow) 또는 유니코드 문자다 — 외부 의존성 0건 유지.

### 2.4 Timeline eventType (기획 §4.3 — 4종)

| eventType | 한글 라벨 | 노드 색 `--ic-evt-*` | 노드 형태 | 행 배경 |
|-----------|-----------|----------------------|-----------|---------|
| `detected` | 감지 | `#C7D3E3` | 속 빈 원 (2px 테두리, 배경=페이지 bg) | 없음 |
| `update` | 진행 갱신 | `#7DB8FF` | 채운 원 (8px) | 없음 |
| `escalated` | 에스컬레이션 | `#FF8A8A` | **마름모(diamond, 45° 회전 사각형)** | `#2A1A1E` + 좌측 2px 적색 라인 — 유일하게 배경 강조 (기획 EC-06) |
| `resolved` | 해결 | `#4ADE80` | 채운 원 + ✓ 글리프 | `#12261B` (은은한 녹색) |

### 2.5 기능 색 (Feedback)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--ic-progress-fill` | `#4ADE80` | 체크리스트 진행률 바 채움 |
| `--ic-progress-track` | `#212C3B` | 진행률 바 트랙 |
| `--ic-danger` | `#FF5C5C` | error 배너 강조 테두리 |
| `--ic-danger-bg` | `#2A1418` | error 배너 배경 |
| `--ic-focus` | `#4DA3FF` | 포커스 링 (2px solid + 2px offset) |
| `--ic-skeleton` | `#1E2735` | loading 스켈레톤 블록 |
| `--ic-skeleton-shine` | `#2A3648` | 스켈레톤 펄스 애니메이션 밝은 톤 |

> **하드코딩 색상 금지** — `style.css` 안의 모든 `color`/`background`/`border-color` 는 위 토큰 `var(--ic-*)` 로만 참조한다. 리터럴 HEX 는 `:root` 블록에만 존재해야 한다.

---

## 3. 타이포그래피

### 3.1 폰트 스택 (system font only — CDN 금지)

```css
--ic-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo",
                "Malgun Gothic", "Noto Sans KR", sans-serif;
--ic-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "D2Coding", monospace;
```

`--ic-font-mono` 는 **타임스탬프·장애 ID·진행률 수치** 전용 — 자릿수가 흔들리지 않아 목록에서 시각적으로 정렬돼 보인다(관제 화면의 핵심 요건).

### 3.2 타입 스케일

| 역할 | 토큰 | size / weight / line-height | letter-spacing | 적용 위치 |
|------|------|------------------------------|----------------|-----------|
| 페이지 타이틀 | `--ic-type-h1` | `22px / 700 / 1.3` | `-0.01em` | `<h1>` "Incident Command Center" |
| 패널 타이틀 | `--ic-type-h2` | `16px / 600 / 1.4` | `0` | "장애 목록", "대응 타임라인", "복구 체크리스트" |
| 상세 장애 제목 | `--ic-type-title` | `20px / 700 / 1.35` | `-0.01em` | 상세 패널 헤더 장애 title |
| 목록 행 제목 | `--ic-type-row` | `15px / 600 / 1.4` | `0` | `<li>` 안 장애 title |
| 본문 | `--ic-type-body` | `14px / 400 / 1.6` | `0` | 타임라인 note, 체크리스트 text, 안내 문구 |
| 캡션 / 메타 | `--ic-type-caption` | `12px / 500 / 1.5` | `0` | 담당자 팀, "총 N건" |
| 배지 | `--ic-type-badge` | `12px / 700 / 1` | `0.02em` | severity / status 배지 |
| 모노 (타임스탬프·ID) | `--ic-type-mono` | `12px / 500 / 1.5` | `0` | `INC-3001`, `2026-07-14 02:45` |

- 최소 폰트 크기 **12px** — 그 이하 사용 금지(가독성).
- 한글 본문 line-height 는 1.6 고정 (영문 기준 1.4 는 한글에서 답답함).

### 3.3 타임스탬프 표시 포맷 (dev 필수 — 재해석 금지)

fixture 는 `2026-07-14T02:45:00+09:00` (기획 §5.5, 오프셋 고정 문자열). 화면 표시는 **문자열 슬라이스로만** 가공한다 — `new Date()` 파싱 금지(기획 §5.5 결정론성 요구).

| 위치 | 표시 포맷 | 산출 방법 |
|------|-----------|-----------|
| 목록 행 "최근 업데이트" | `07-14 02:45` | `iso.slice(5, 10).replace('-', '-') + ' ' + iso.slice(11, 16)` → 즉 `iso.slice(5,10) + ' ' + iso.slice(11,16)` |
| 상세 헤더 감지/업데이트 | `2026-07-14 02:45` | `iso.slice(0, 10) + ' ' + iso.slice(11, 16)` |
| 타임라인 이벤트 | `02:45` | `iso.slice(11, 16)` |
| 체크리스트 완료 시각 | `07-14 02:20` | `iso.slice(5, 10) + ' ' + iso.slice(11, 16)` |

모두 `--ic-font-mono` + `--ic-text-muted`. `+09:00` 오프셋은 화면에 표시하지 않는다(전 데이터가 KST 고정이므로 노이즈).

---

## 4. 스페이싱 · 라디우스 · 그림자

```css
--ic-space-1: 4px;   --ic-space-2: 8px;   --ic-space-3: 12px;
--ic-space-4: 16px;  --ic-space-5: 20px;  --ic-space-6: 24px;  --ic-space-7: 32px;

--ic-radius-sm: 4px;    /* 배지, 진행률 바 */
--ic-radius-md: 8px;    /* 목록 행, 체크리스트 항목 */
--ic-radius-lg: 12px;   /* 패널 */
--ic-radius-pill: 999px;/* 필터 칩 */

--ic-shadow-panel: 0 1px 3px rgba(0, 0, 0, 0.4);
--ic-shadow-selected: inset 0 0 0 1px var(--ic-accent);  /* 선택 행 내부 링 */
```

- 4px 그리드 — 모든 margin/padding/gap 은 위 7개 토큰 값만 사용.
- 그림자는 dark UI 에서 거의 안 보이므로 **깊이는 배경 명도차(`--ic-surface` → `--ic-surface-raised`)로 표현**하고 shadow 는 최소만 사용.

---

## 5. 레이아웃 · 반응형

### 5.1 전체 골격

```
┌──────────────────────────────────────────────────────────────┐
│ <header class="ic-topbar">                                    │
│   h1 Incident Command Center      [aria-live: 총 6건 표시]     │
├──────────────────────────────────────────────────────────────┤
│ <main id="incident-command" data-view-state="ready">          │
│  ┌───────────────────────┬────────────────────────────────┐   │
│  │ <section .ic-list-pane>│ <section id="incident-detail"> │   │
│  │  h2 장애 목록           │  ┌ sticky 헤더 ──────────────┐ │   │
│  │  [전체][P1][P2][P3][P4]│  │ 제목 + severity + status  │ │   │
│  │  ─────────────────────│  │ owner / 감지·업데이트 시각 │ │   │
│  │  <ul #incident-list>  │  └───────────────────────────┘ │   │
│  │   ▌P1·치명 결제…       │  ┌ 복구 체크리스트 ──────────┐ │   │
│  │   ▌P2·높음 CDN…        │  │ [progressbar] 2/4 (50%)   │ │   │
│  │   ▌P3·보통 세션…       │  │ ☑ 사이드카 재시작          │ │   │
│  │   …                   │  │ ☐ 재시도 큐 우회 …         │ │   │
│  │                       │  └───────────────────────────┘ │   │
│  │                       │  ┌ 대응 타임라인 ────────────┐ │   │
│  │                       │  │ ○ 02:10 감지  …           │ │   │
│  │                       │  │ ● 02:15 진행 갱신 …        │ │   │
│  │                       │  └───────────────────────────┘ │   │
│  └───────────────────────┴────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

> **상세 패널 내 섹션 순서 = 체크리스트 → 타임라인** (의도적). 운영자가 상세를 여는 1순위 동기는 "지금 내가 뭘 해야 하나(=체크리스트)"이고, 타임라인은 맥락 파악용 참조다. 상호작용 가능한 것을 스크롤 없이 먼저 노출한다.

### 5.2 브레이크포인트 (기획 §15 준수)

| 뷰포트 | 레이아웃 | 세부 |
|--------|----------|------|
| **≥ 768px** (데스크톱/태블릿) | 2단 Master-Detail | `display:grid; grid-template-columns: minmax(300px, 360px) 1fr; gap: var(--ic-space-5);` 목록 패널은 `position:sticky; top:...; max-height:calc(100vh - ...); overflow-y:auto` — 상세가 길어져도 목록은 항상 보임 |
| **≥ 1280px** (와이드) | 2단 (목록 폭만 확대) | `grid-template-columns: 380px 1fr;` `max-width: 1400px; margin-inline: auto;` |
| **320px ~ 767px** (모바일) | 세로 스택 | `grid-template-columns: 1fr;` 목록 위 / 상세 아래. 가로 스크롤 0 (`min-width:0` 를 grid item 에 필수 지정) |

### 5.3 모바일(<768px) 세부 규칙

- 필터 칩 그룹: `display:flex; overflow-x:auto; -webkit-overflow-scrolling:touch;` + 칩 `flex:0 0 auto` → 가로 스크롤 허용(기획 §15 허용안). 스크롤바는 숨기되(`scrollbar-width:none`) 스크롤은 유지.
- 목록 행: severity 배지와 status 배지를 제목 **아래 줄**로 내려 2행 구성(320px 에서 배지 3개 + 제목 1행 배치 시 넘침).
- 상세 sticky 헤더: 모바일에서도 `position:sticky; top:0` 유지 → 긴 타임라인 스크롤 중에도 "어느 장애를 보는 중인지" 잃지 않음.
- 터치 타깃 **최소 44×44px** — 필터 칩(`min-height:36px` + padding 으로 44 확보), 체크박스(`width:20px` + `label` padding 으로 44 확보), 목록 행(`min-height:64px`).
- 최소 지원 폭 **320px** — 가로 스크롤 0건 (모든 grid/flex item 에 `min-width:0`, 긴 제목은 `overflow-wrap:anywhere`).

---

## 6. 컴포넌트 명세

> 아래 "props" 는 React props 가 아니라 **dev 가 DOM 을 만들 때 주입하는 데이터 축**이다 (vanilla DOM). `data-*` 속성/id 는 기획 §10 DOM 계약에서 **고정** — 아래 클래스명은 권장(재량 가능), `data-*`/`id`/`role`/`aria-*` 는 **변경 금지**.

### 6.1 SeverityBadge

| 항목 | 내용 |
|------|------|
| 마크업 | `<span class="ic-badge ic-badge--sev" data-severity="P1">P1 · 치명</span>` |
| props | `severity: 'P1'|'P2'|'P3'|'P4'` (라벨은 `SEVERITY_LABELS[severity]` 로 조회 — 하드코딩 금지) |
| 스타일 | `padding: 3px 8px; border-radius: var(--ic-radius-sm); font: var(--ic-type-badge); border: 1px solid var(--ic-sev-N-border);` 색은 `[data-severity="P1"]` 속성 선택자로 분기 |
| 상태 | 정적 (hover/focus 없음 — 배지는 비인터랙티브) |
| 특이 | `[data-severity="P1"]` 만 `border-width: 2px` (§2.2 형태 인코딩) |

### 6.2 StatusBadge

| 항목 | 내용 |
|------|------|
| 마크업 | `<span class="ic-badge ic-badge--status" data-status="investigating">조사중</span>` |
| props | `status: 'detected'|'investigating'|'mitigating'|'monitoring'|'resolved'` (라벨은 `STATUS_LABELS[status]`) |
| 스타일 | 공통 bg `#1E2735`, 텍스트 색만 `[data-status]` 분기. `::before` 로 8px 선행 도형 (§2.3) |
| 상태 | 정적 |

### 6.3 SeverityFilterChip (그룹)

| 항목 | 내용 |
|------|------|
| 마크업 | `<div role="group" aria-label="심각도 필터" class="ic-filters"> <button type="button" class="ic-chip" data-severity-filter="all" aria-pressed="true">전체</button> … </div>` |
| props | `value: 'all'|'P1'|'P2'|'P3'|'P4'`, `pressed: boolean`, `count?: number` (칩 내 "P1 2" 처럼 건수 표시 — **선택 구현, 없어도 AC 충족**) |
| 기본 | `background: transparent; color: var(--ic-text-secondary); border: 1px solid var(--ic-border-interactive); border-radius: var(--ic-radius-pill); padding: 6px 14px; min-height: 36px;` |
| hover | `background: var(--ic-surface-raised); color: var(--ic-text);` |
| **활성** (`aria-pressed="true"`) | `background: var(--ic-accent); color: #08111C; border-color: var(--ic-accent); font-weight: 700;` — **`[aria-pressed="true"]` 속성 선택자로 스타일링** (별도 `.is-active` 클래스 금지: 시각 상태와 접근성 상태가 어긋날 여지 제거) |
| focus-visible | `outline: 2px solid var(--ic-focus); outline-offset: 2px;` |
| 특이 | 필터 칩은 `all` 포함 5개. 활성 칩 텍스트색 `#08111C` 는 `--ic-accent` 위 대비 8.4:1 (§8.2) |

### 6.4 IncidentListRow

| 항목 | 내용 |
|------|------|
| 마크업 | `<li class="ic-row" data-id="INC-3001" data-severity="P1" data-status="investigating" role="option" aria-selected="true" tabindex="0"> … </li>` (부모 `<ul id="incident-list" role="listbox" aria-label="장애 목록">`) |
| props | `id, title, severity, status, owner{name,team}, updatedAt` |
| 구성(≥768px) | 1행: `[severity 배지] [제목(flex:1)] [status 배지]` / 2행: `[담당자 이름 · 팀] … [07-14 02:45 (mono)]` |
| 구성(<768px) | 1행: `[제목]` / 2행: `[severity][status]` / 3행: `[담당자 · 팀] [시각]` |
| 좌측 레일 | `border-left: 4px solid var(--ic-sev-N-fg)` — severity 를 색으로 한 번 더 인코딩. 배지가 잘려도(좁은 폭) 레일은 남음 |
| 기본 | `background: var(--ic-surface); border: 1px solid var(--ic-border-interactive); border-radius: var(--ic-radius-md); padding: var(--ic-space-3); cursor: pointer; min-height: 64px;` |
| hover | `background: var(--ic-surface-raised);` |
| **선택** (`aria-selected="true"`) | `background: var(--ic-surface-selected); box-shadow: var(--ic-shadow-selected);` (내부 accent 링) + 좌측 레일 폭 `6px` — **`[aria-selected="true"]` 속성 선택자로 스타일링** |
| focus-visible | `outline: 2px solid var(--ic-focus); outline-offset: 2px;` |
| 키보드 | `tabindex="0"` (DOM 순서 그대로 — 기획 §14.1 Tab 순서 고정). `Enter`/`Space` 로 선택 (dev: `keydown` 에서 `e.key === 'Enter' || e.key === ' '` → `e.preventDefault()` 후 선택 핸들러 호출. Space 기본 스크롤 방지 필수) |

### 6.5 DetailHeader

| 항목 | 내용 |
|------|------|
| 마크업 | `<header class="ic-detail-head">` 내부: `<h2>` 제목 + 배지 2종 + owner + 시각 2종 |
| props | `title, severity, status, owner{name,team}, detectedAt, updatedAt` |
| 스타일 | `position: sticky; top: 0; background: var(--ic-surface-raised); border-bottom: 1px solid var(--ic-border); padding: var(--ic-space-4); border-radius: var(--ic-radius-lg) var(--ic-radius-lg) 0 0; z-index: 2;` |
| Owner 표기 | `<span class="ic-owner"><span class="ic-owner__avatar" aria-hidden="true">김</span> 김온콜 <span class="ic-owner__team">Payments</span></span>` — avatar 는 **이름 첫 글자 1자를 CSS 원형 배경에 렌더**(이미지 0건, `aria-hidden` 으로 SR 중복 낭독 방지) |
| 시각 표기 | `감지 2026-07-14 02:10 · 업데이트 2026-07-14 02:45` (mono, `--ic-text-muted`) |

### 6.6 ChecklistProgressBar

| 항목 | 내용 |
|------|------|
| 마크업 | `<div id="checklist-progress" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-label="복구 체크리스트 진행률"><div class="ic-progress__fill" style="width:50%"></div></div>` + 인접 텍스트 `<p class="ic-progress__text">2/4 완료 (50%)</p>` |
| props | `total, done, percent` (← `calculateChecklistProgress(checklist)` 반환값 그대로, 기획 §9.4) |
| 스타일 | 트랙 `height: 8px; background: var(--ic-progress-track); border-radius: var(--ic-radius-sm); overflow: hidden;` / 채움 `height:100%; background: var(--ic-progress-fill); transition: width 180ms ease-out;` |
| 텍스트 | **"N/M 완료 (P%)" 형식 고정** (기획 §19) — 예 `2/4 완료 (50%)`. 숫자는 mono |
| 표시 조건 | `data-checklist-state="has-items"` 일 때만 존재 (기획 §10) |
| 특이 | `aria-valuenow` 는 **percent 정수**(0~100). 토글 시 `style.width` + `aria-valuenow` + 텍스트 **3곳 모두** 갱신 (dev 실수 주의 지점) |

### 6.7 ChecklistItem

| 항목 | 내용 |
|------|------|
| 마크업 | `<li class="ic-check" data-checklist-id="chk-3001-1"><input type="checkbox" id="chk-3001-1" data-checklist-id="chk-3001-1" checked><label for="chk-3001-1">결제 게이트웨이 사이드카 재시작</label><time class="ic-check__at">07-14 02:20</time></li>` |
| props | `id, text, done, completedAt` |
| 기본 | 항목 `background: var(--ic-surface-raised); border: 1px solid var(--ic-border); border-radius: var(--ic-radius-md); padding: var(--ic-space-3); display:flex; gap: var(--ic-space-3); align-items:flex-start;` |
| checkbox | 네이티브 `<input type="checkbox">` (기획 §14.1 — 커스텀 대체 금지). `accent-color: var(--ic-progress-fill); width:20px; height:20px; flex:0 0 auto; cursor:pointer;` |
| **완료** (`:checked`) | `label` → `text-decoration: line-through; color: var(--ic-text-muted);` (CSS `:has()` 없이도 `input:checked + label` 인접 선택자로 구현 가능 — 호환성 안전) |
| 완료 시각 | `done===true` 일 때만 `<time>` 노출 (`completedAt` mono, muted). `done===false` 면 DOM 에서 제거 (기획 §5.4 null 일관성) |
| focus-visible | `outline: 2px solid var(--ic-focus); outline-offset: 2px;` (checkbox 자체) |
| 특이 | `<label for>` 클릭도 토글되므로 **터치 타깃 44px 확보** (label 에 `padding-block: 4px`). label 텍스트 클릭 시 `change` 이벤트는 1회만 발생 — dev 는 `change` 만 듣고 `click` 은 듣지 않는다 (이중 토글 방지, 기획 EC-05) |

### 6.8 TimelineEvent

| 항목 | 내용 |
|------|------|
| 마크업 | `<ol id="incident-timeline"> <li data-event-type="escalated"> <time class="ic-tl__time">00:35</time> <div class="ic-tl__body"><span class="ic-tl__type">에스컬레이션</span> <span class="ic-tl__actor">한온콜</span> <p class="ic-tl__note">…</p></div> </li> </ol>` |
| props | `timestamp, actor, eventType, note` |
| 레일 | `<ol>` 에 `position:relative;` + `::before` 로 좌측 세로선 `1px var(--ic-border)`. 각 `<li>` 의 `::before` 가 노드 도형을 그려 레일 위에 얹음 |
| 노드 | §2.4 표대로 eventType 별 색/형태. `escalated` = 마름모(`transform: rotate(45deg)`), `resolved` = ✓ |
| 라벨 | `.ic-tl__type` 에 **한글 라벨 항상 병기** (`EVENT_TYPE_LABELS[eventType]`) — 색 비의존 (기획 §14.3) |
| `escalated` 행 | 배경 `#2A1A1E` + `border-left: 2px solid var(--ic-sev-1-fg)` (기획 EC-06 시각 구분) |
| 인터랙션 | **없음** — `cursor: default`, hover/focus 스타일 0건, `tabindex` 미부여 (읽기 전용임을 시각으로 전달) |
| 순서 | fixture 배열 순서 그대로 (`<ol>` 시맨틱 = SR 이 순서 인지, 기획 §14.2) |

### 6.9 LiveRegion (SR 안내)

| 항목 | 내용 |
|------|------|
| 마크업 | `<p id="ic-live" class="ic-sr-only" aria-live="polite" aria-atomic="true"></p>` |
| 갱신 시점 | ① 필터 적용 → `"총 2건 표시"` ② 장애 선택 변경 → `"결제 게이트웨이 타임아웃 급증 선택됨"` (기획 §14.2) |
| 스타일 | `.ic-sr-only` = 시각적으로 숨김(`position:absolute; width:1px; height:1px; clip-path: inset(50%); overflow:hidden; white-space:nowrap;`) — `display:none` 금지(SR 도 못 읽음) |

---

## 7. 상태별 시각 규칙 (loading · empty · error · 결과없음 · 미선택)

`<main id="incident-command" data-view-state="...">` 값에 따라 CSS 로 배타 전환한다 (기획 §10·§13).

```css
/* dev 구현 패턴 — 상태 전환은 CSS 가 담당, JS 는 속성 1개만 바꾼다 */
[data-view-state="loading"] .ic-ready-only,
[data-view-state="empty"]   .ic-ready-only,
[data-view-state="error"]   .ic-ready-only { display: none; }

[data-view-state="ready"] .ic-skeleton,
[data-view-state="ready"] .ic-empty,
[data-view-state="ready"] .ic-error { display: none; }
/* … 각 상태 블록도 동일 패턴으로 배타 표시 */
```

### 7.1 Loading (정적 스켈레톤 — 기획 §13.2)

- `index.html` **정적 마크업**에 포함 (JS 가 만들지 않음). 초기값 `data-view-state="loading"`.
- 시각: 목록 자리에 **높이 64px 스켈레톤 블록 4개**(gap 8px), 상세 자리에 헤더 블록 1개(높이 96px) + 본문 블록 3개.
- 블록 스타일: `background: var(--ic-skeleton); border-radius: var(--ic-radius-md);` + 1.2s 펄스 애니메이션(`--ic-skeleton` ↔ `--ic-skeleton-shine` opacity 변화).
- **`prefers-reduced-motion: reduce` 시 애니메이션 정지** (정적 배경만) — 필수.
- 인위적 지연 금지 (기획 §13.2) — `command.js` 가 실행되는 즉시 동기적으로 다른 상태로 교체.

### 7.2 Empty (`data-view-state="empty"` — 기획 §13.3)

- 문구 **고정**: `표시할 장애가 없습니다.`
- 시각: 중앙 정렬 블록. 아이콘 대신 **CSS 로 그린 48px 점선 원 + 안쪽 "—"**(외부 asset 0건). `color: var(--ic-text-secondary)`.
- 목록/상세 패널 모두 숨김, 필터 칩도 숨김(필터링할 대상이 없음).

### 7.3 Error (`data-view-state="error"` — 기획 §13.4)

- 문구 **고정**: `장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.`
- 마크업: `<div id="error-banner" role="alert">` (기획 §10 — `role="alert"` 필수, SR 즉시 낭독)
- 시각: `background: var(--ic-danger-bg); border: 1px solid var(--ic-danger); border-left-width: 4px; border-radius: var(--ic-radius-md); padding: var(--ic-space-4); color: var(--ic-text);` + 선행 `⚠` 글리프(`aria-hidden="true"`).
- **"재시도" 버튼 없음** (기획 §13.4 — 새로고침 안내 문구로 충분).
- 목록/상세 패널 렌더링 안 함.

### 7.4 필터 결과 0건 (`ready` 상태 내부 — 기획 §2.2 / EC-01)

- 문구 **고정**: `해당 심각도의 장애가 없습니다.`
- + `<button id="reset-severity-filter-btn" type="button">필터 초기화</button>`
- 버튼 스타일: 필터 칩과 동일 pill, 단 `border-color: var(--ic-accent); color: var(--ic-accent);`
- 목록 `<ul>` 자리에 대체 표시. 필터 칩 그룹은 **그대로 노출**(사용자가 다른 칩으로 바로 이동 가능해야 함).

### 7.5 상세 미선택 (`data-selected-id="none"` — 기획 §2.2 / AC-03)

- 문구 **고정**: `왼쪽 목록에서 장애를 선택하세요.`
- 모바일(<768px)에서는 "왼쪽"이 부정확하므로 **CSS `::after` content 로 문구를 바꾸지 않는다** — 문구는 기획 고정값이므로 그대로 두고, 대신 안내 블록 위에 ↑ 화살표 글리프(`aria-hidden`)를 두어 모바일에서 방향을 보조한다. *(문구 변경이 필요하면 기획 재승인 필요 — §12 모호함 flag ①)*
- 시각: 상세 패널 자리에 중앙 정렬 `--ic-text-secondary` 안내 + 점선 테두리(`1px dashed var(--ic-border)`) 박스.

### 7.6 체크리스트 없음 (`data-checklist-state="no-checklist"` — 기획 §7.3 / AC-08)

- 문구 **고정**: `해당 장애에 등록된 복구 체크리스트가 없습니다.`
- **진행률 바를 렌더링하지 않는다** (0% 바 표시 금지 — 기획 §7.1 오인 방지). `#checklist-progress` 요소 자체가 DOM 에 없어야 함.
- 시각: `--ic-text-secondary` 본문 텍스트 + `1px dashed var(--ic-border)` 박스.

---

## 8. 접근성 · WCAG 대비 검증

### 8.1 요구 (기획 §14)

| 항목 | 충족 방법 |
|------|-----------|
| 색 비의존 | severity/status/eventType 전부 **한글 라벨 + 형태** 병기 (§2.2~§2.4) |
| 키보드 | 필터 칩 `<button>`, 목록 행 `tabindex="0"`+Enter/Space, 체크박스 네이티브 `<input>`. Tab 순서 = DOM 순서(필터 → 목록 → 체크리스트), 임의 `tabindex` 양수 금지 |
| 포커스 가시성 | 전 인터랙티브 요소 `:focus-visible { outline: 2px solid var(--ic-focus); outline-offset: 2px; }` — `outline: none` 전역 리셋 **금지** |
| SR 안내 | `aria-live="polite"` 영역(§6.9), `role="progressbar"`+`aria-valuenow`, `<ol>` 타임라인, `role="alert"` 에러 배너 |
| 모션 | `@media (prefers-reduced-motion: reduce)` → 스켈레톤 펄스·진행률 transition 모두 `animation:none; transition:none;` |

### 8.2 대비비 검증표 (WCAG 2.1 — 텍스트 4.5:1 / UI 경계 3:1)

| 전경 | 배경 | 대비비 | 기준 | 판정 |
|------|------|--------|------|------|
| `--ic-text` `#E8EDF5` | `--ic-surface` `#131A26` | **14.9:1** | 4.5:1 | ✅ AAA |
| `--ic-text-secondary` `#9FB0C7` | `--ic-surface` `#131A26` | **7.9:1** | 4.5:1 | ✅ AAA |
| `--ic-text-muted` `#6B7C94` | `--ic-surface` `#131A26` | **4.1:1** | 4.5:1 | ⚠️ **비본문 전용** — 12px 타임스탬프/캡션에만 사용. **본문·라벨 사용 금지**. 강조 필요 시 `--ic-text-secondary` 로 승격 (§12 모호함 flag ②) |
| P1 `#FF8A8A` | `#3A1518` | **7.2:1** | 4.5:1 | ✅ AAA |
| P2 `#FFC96B` | `#3A2A10` | **9.2:1** | 4.5:1 | ✅ AAA |
| P3 `#7DB8FF` | `#12283F` | **7.3:1** | 4.5:1 | ✅ AAA |
| P4 `#B9C7DA` | `#212C3B` | **8.2:1** | 4.5:1 | ✅ AAA |
| status 감지됨 `#C7D3E3` | `#1E2735` | **10.0:1** | 4.5:1 | ✅ AAA |
| status 조사중 `#FFC96B` | `#1E2735` | **10.0:1** | 4.5:1 | ✅ AAA |
| status 조치중 `#5EEAD4` | `#1E2735` | **10.2:1** | 4.5:1 | ✅ AAA |
| status 모니터링 `#7DB8FF` | `#1E2735` | **7.3:1** | 4.5:1 | ✅ AAA |
| status 해결됨 `#4ADE80` | `#1E2735` | **8.7:1** | 4.5:1 | ✅ AAA |
| 활성 칩 텍스트 `#08111C` | `--ic-accent` `#4DA3FF` | **8.4:1** | 4.5:1 | ✅ AAA |
| 포커스 링 `#4DA3FF` | `--ic-bg` `#0B0F17` | **7.3:1** | 3:1 | ✅ |
| `--ic-border-interactive` `#6B7C94` | `--ic-surface` `#131A26` | **4.1:1** | 3:1 | ✅ (UI 경계) |
| `--ic-border` `#2A3648` | `--ic-bg` `#0B0F17` | 1.6:1 | — | ✅ **장식 전용** (패널 구분선·타임라인 레일). 인터랙티브 경계에 사용 금지 |

> **dev 주의**: `--ic-border` 와 `--ic-border-interactive` 는 **용도가 다른 토큰**이다. 필터 칩·목록 행·체크박스 테두리에 `--ic-border` 를 쓰면 WCAG 3:1 위반이다.

---

## 9. dev 구현 가이드

### 9.1 파일별 작업 (기획 §8.1 파일 구조 그대로)

| 파일 | designer 산출물 반영 사항 |
|------|---------------------------|
| `incident-command/style.css` | §2 토큰 전량을 `:root` 에 정의 → §3~§7 스타일. **리터럴 HEX 는 `:root` 밖에 등장 금지** |
| `incident-command/index.html` | §5.1 골격 + §6 마크업 + **§7.1 loading 스켈레톤을 정적으로 포함**(`data-view-state="loading"` 초기값). `<meta name="viewport" content="width=device-width, initial-scale=1">` 필수 |
| `incident-command/command.js` | 상태 전환은 **`data-*` 속성 1개만 바꾸고 나머지는 CSS 가 처리**(§7 패턴). 라벨은 `fixtures.js` 의 `*_LABELS` 맵에서 조회 — 한글 문자열 하드코딩 금지 |

### 9.2 단계별 순서 (권장)

1. `:root` 토큰 블록 작성 (§2, §3.1, §3.2, §4) — 다른 CSS 작성 전 **먼저**.
2. `index.html` 골격 + loading 스켈레톤 정적 마크업 (§5.1, §7.1). 이 시점에 브라우저로 열면 스켈레톤만 보여야 정상.
3. 레이아웃 grid (§5.2) → 데스크톱 2단 확인 → 767px 이하 스택 확인 (DevTools 320px 에서 **가로 스크롤 0** 확인).
4. 컴포넌트 스타일 (§6) — 배지 → 칩 → 목록 행 → 상세 헤더 → 진행률 바 → 체크리스트 → 타임라인 순.
5. 상태 블록 (§7.2~§7.6) — `data-view-state` 를 DevTools 에서 손으로 바꿔가며 5개 상태 전부 눈으로 확인.
6. `:focus-visible` 링 + `prefers-reduced-motion` (§8.1) — 마지막에 몰아서 하지 말고 4단계와 함께.

### 9.3 CSS 클래스 네이밍 (권장 — 재량 가능)

`ic-` 프리픽스 + BEM-lite: `.ic-row`, `.ic-row__title`, `.ic-badge--sev`, `.ic-chip`, `.ic-tl__note`, `.ic-check__at`, `.ic-progress__fill`, `.ic-sr-only`.
**단, `data-*` / `id` / `role` / `aria-*` 는 기획 §10 계약이므로 변경 금지.**

### 9.4 dev 가 흔히 놓치는 지점 (체크리스트)

- [ ] 진행률 토글 시 **3곳** 갱신: `.ic-progress__fill` 의 `style.width`, `#checklist-progress` 의 `aria-valuenow`, `.ic-progress__text` 의 "N/M 완료 (P%)" (§6.6)
- [ ] `checklist.length === 0` 이면 **진행률 바를 DOM 에서 제거** — `width:0%` 로 두지 말 것 (§7.6)
- [ ] 목록 행 `Space` 키 → `e.preventDefault()` 없으면 페이지가 스크롤됨 (§6.4)
- [ ] 체크리스트는 `change` 이벤트만 청취 (`click` 동시 청취 시 label 클릭에서 이중 토글, 기획 EC-05)
- [ ] `outline: none` 전역 리셋 금지 (§8.1)
- [ ] 활성 필터 칩 / 선택 행 스타일은 **`.is-active` 클래스가 아니라 `[aria-pressed="true"]` / `[aria-selected="true"]`** 속성 선택자로 (§6.3, §6.4)
- [ ] 타임스탬프는 `new Date()` 파싱 없이 **문자열 슬라이스** (§3.3, 기획 §5.5)
- [ ] 모바일 320px 에서 긴 장애 제목 → `overflow-wrap: anywhere` 없으면 가로 스크롤 발생 (§5.3)

---

## 10. AC ↔ UI 매핑 표

### 10.1 BF-823 (본 designer task) 수용 기준

| # | BF-823 수용 기준 | 충족 위치 |
|---|------------------|-----------|
| AC-1 | severity 배지·owner·timeline·recovery checklist 각 컴포넌트의 **토큰·상태별 스펙**이 AC 매핑 표와 함께 문서화 | §2.2(severity 토큰) · §6.1(SeverityBadge) · §6.5(Owner) · §6.8(Timeline) · §6.6~§6.7(Checklist) · §7(상태별) · 본 §10 |
| AC-2 | vanilla-static — mockup 을 `file://` 로 열면 **외부 의존성 없이 렌더**, 데스크톱/모바일 PNG evidence 첨부 | §11 (mockup 단일 HTML, `<link>`/`<script src>` 0건, system font) · PR 본문 PNG evidence |

### 10.2 BF-821 Epic AC ↔ 본 시안 커버리지 (기획 §12)

| 기획 AC | 시안이 정의한 것 |
|---------|------------------|
| AC-01 초기 로드 · 기본 선택 | §5.1 골격, §6.4 선택 행 시각(`aria-selected` 링 + 6px 레일) |
| AC-02 심각도 필터 적용 | §6.3 필터 칩 (기본/hover/활성/포커스 4상태) |
| AC-03 필터로 선택 사라짐 → 미선택 | §7.5 미선택 안내 블록 (문구 고정) |
| AC-04 장애 선택 전환 | §6.4 hover/선택 시각 + §6.9 live region 안내 |
| AC-05 타임라인 순서 · escalated | §6.8, §2.4 (마름모 노드 + 적색 배경 행) |
| AC-06/07 체크리스트 토글 · 진행률 | §6.6 (3곳 갱신 규칙), §6.7 (`:checked` 취소선 + 완료 시각) |
| AC-08 체크리스트 없음 | §7.6 (진행률 바 미렌더 + 고정 문구) |
| AC-09 진행률 계산 | (순수 함수 — dev 담당) 시안은 §6.6 "N/M 완료 (P%)" 표기 형식만 고정 |
| AC-10 loading → ready | §7.1 정적 스켈레톤 (인위적 지연 없음) |
| AC-11 empty | §7.2 (고정 문구 + CSS 일러스트) |
| AC-12 error | §7.3 (`role="alert"` 배너, 재시도 버튼 없음) |
| AC-13 기존 파일 보존 | 본 PR 은 `docs/design/**` 만 변경 — 코드 0건 |
| AC-14 file:// 호환 | §2/§3.1 (CDN 0건, system font), §11 (mockup 자체가 증명) |
| AC-15 키보드 전체 조작 | §8.1, §6.3/§6.4/§6.7 (네이티브 요소 + Tab 순서 고정 + focus-visible) |

---

## 11. mockup 참조 · PNG evidence

- **mockup HTML**: `docs/design/mockups/incident-command-BF-823.html`
- 단일 self-contained 파일 — `<link>` / `<script src>` / `@font-face` / 이미지 **0건**. `file://` 더블클릭으로 렌더 검증 완료.
- mockup 구성 (4개 `<section>`):
  1. **데스크톱 ready** — `INC-3001` 선택 상태의 실제 2단 화면 (필터 칩 / 목록 6건 / 상세 헤더 / 진행률 2/4 50% / 체크리스트 / 타임라인)
  2. **모바일 스택 (375px 프레임)** — 세로 스택 레이아웃 + 필터 칩 가로 스크롤 + 2행 목록 행
  3. **상태 갤러리** — loading 스켈레톤 / empty / error / 필터 결과 0건 / 상세 미선택 / 체크리스트 없음(`INC-3004`)
  4. **컴포넌트 갤러리** — severity 배지 4종 / status 배지 5종 / 타임라인 노드 4종 / 필터 칩 4상태 / 진행률 바 3변형
- mockup 의 체크박스는 **CSS `:checked` 만으로** 취소선을 표현한다 (JS 0줄) — 시안은 시각 시뮬레이션이며 실제 토글 로직·진행률 재계산은 dev-1 이 `command.js` 에 구현한다. mockup 의 진행률 바 수치는 정적 값이다.
- PNG evidence: PR 본문에 데스크톱/모바일 screenshot 자동 첨부 (worker capture).

---

## 12. Self-critique

PR 직전 자기 점검 5항목.

| # | 점검 항목 | 결과 |
|---|-----------|------|
| 1 | **AC 매핑** — BF-823 AC 2건 + BF-821 Epic AC 15건이 모두 시안 섹션에 매핑되는가 | ✅ §10.1(2건) / §10.2(15건). 누락 0건. AC-09(진행률 계산)는 순수 함수라 시안이 표기 형식만 고정 — 의도된 부분 커버 |
| 2 | **dev 구현 가이드** — dev-1 이 추측 없이 따라갈 수 있는가 | ✅ §9.2 단계별 순서 + §9.4 "흔히 놓치는 지점" 8개 체크리스트(진행률 3곳 갱신, Space preventDefault, change-only 청취, 속성 선택자 스타일링 등). 토큰은 §2~§4 에 HEX/px 리터럴로 전량 명시 |
| 3 | **기존 요소 보존** — 기존 모듈에 영향 없는가 | ✅ CSS 변수 프리픽스 `--ic-*` (기존 `--it-*`/`--rr-*` 와 충돌 없음), 파일은 전부 `incident-command/` 신규. 본 designer PR 은 `docs/design/**` 2파일만 추가 (기획 AC-13 준수) |
| 4 | **컴포넌트 매핑** — 기획 §10 DOM 계약의 모든 요소가 시안에 존재하는가 | ✅ 9개 계약 요소 전수 확인: 앱 루트 `data-view-state`(§7) / 필터 칩 `data-severity-filter`+`aria-pressed`(§6.3) / `#reset-severity-filter-btn`(§7.4) / `#incident-list` `<li data-id/severity/status aria-selected tabindex>`(§6.4) / `#incident-detail data-selected-id`(§6.5, §7.5) / `#incident-timeline` `<li data-event-type>`(§6.8) / `#incident-checklist data-checklist-state`(§6.7, §7.6) / `#checklist-progress role=progressbar`(§6.6) / `#error-banner role=alert`(§7.3) |
| 5 | **모호함 flag** — 기획이 정하지 않았거나 시안이 임의 결정한 것 | 아래 3건 ⚠️ |

### 12.1 모호함 flag (reviewer / 운영자 확인 요망)

| # | 항목 | 시안의 결정 | 리스크 / 대안 |
|---|------|-------------|---------------|
| ① | **미선택 안내 문구 "왼쪽 목록에서…"가 모바일에서 부정확** (모바일은 목록이 *위*) | 기획 §2.2 가 문구를 고정값으로 못박았으므로 **문구는 그대로 두고** ↑ 화살표 글리프로 방향 보조 (§7.5) | 문구를 "목록에서 장애를 선택하세요."로 바꾸면 방향 무관하게 정확해짐 — 다만 **기획 고정 문구 변경은 planner 승인 필요**. dev-1 은 임의 변경 금지 |
| ② | **`--ic-text-muted` (#6B7C94) 는 본문 대비 4.1:1 로 AA(4.5:1) 미달** | 12px 타임스탬프/캡션 **비본문 전용**으로 용도를 제한하고, 본문·라벨에는 `--ic-text-secondary`(7.9:1) 사용을 강제 (§8.2) | WCAG 2.1 은 비텍스트 보조정보에 예외를 두지 않으므로 **엄밀히는 타임스탬프도 4.5:1 이 안전**. 더 엄격히 가려면 `--ic-text-muted` 를 `#8493AB`(≈5.4:1)로 상향 — 시각적 위계는 약간 흐려짐. **reviewer 판단 요청** |
| ③ | **상세 패널 섹션 순서를 "체크리스트 → 타임라인"으로 배치** (기획은 순서를 명시하지 않음) | 운영자의 1순위 행동이 체크리스트 토글이므로 인터랙티브 섹션을 위로 (§5.1) | 기획 §2.1 UX 흐름 서술 순서는 "타임라인 → 체크리스트". 기획 의도가 표시 순서까지 포함한 것이라면 뒤집어야 함 — **planner/reviewer 확인 요망**. dev-1 은 본 시안(체크리스트 우선)을 따르되, 반대 지시가 오면 순서만 교체(스타일 영향 없음) |

---

*문서 종료 — [이디자인] · BF-823*
