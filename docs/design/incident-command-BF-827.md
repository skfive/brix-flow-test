# Incident Command Center UI 디자인 명세 — BF-827

> 작성자: [이디자인] (designer) · 작성일 2026-07-15
> 관련 티켓: BF-829 (본 designer task) · BF-828 (planner task) · BF-827 (부모 Epic)
> 기획 문서: `docs/planning/incident-command-BF-827.md` (본 명세의 상위 source of truth — 데이터 모델·상태·fixture 스펙. 본 문서는 이를 **재해석하지 않고 시각화만** 한다)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> mockup 참조: `docs/design/incident-command/mockup-BF-829.html` (+ PNG evidence `docs/design/incident-command/mockup-BF-829.png`)

> **파일명·경로 규칙 안내 (오타 아님):**
> - 본 명세 파일명은 본 task 의 File Ownership 에 리터럴로 지정된 경로(`docs/design/incident-command-BF-827.md`, **Epic 키** 기준)를 그대로 따랐다. 선행 designer 명세(`docs/design/incident-command-BF-821.md`)와 동일한 "Epic 키 명세 파일명" 규칙이다.
> - mockup HTML/PNG 은 File Ownership 이 지정한 디렉터리 `docs/design/incident-command/**` 에 **현재 task 키 BF-829** 로 배치했다. 본 Epic 은 시안 산출물을 module 전용 서브디렉터리로 co-locate 하는 구조를 채택한다(공용 `docs/design/mockups/` 미사용 — 병렬 페르소나와의 File Ownership 경계 준수).

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**중요 가정 (모호하여 명시함):** `incident-command/` 모듈은 이미 선행 Epic **BF-821** 산하에서 완전히 구현·배포되어 있다(`incident-command/{index.html,style.css,fixtures.js,command.js}` + E2E). 기획 문서 `docs/planning/incident-command-BF-827.md` §0 이 밝히듯, BF-827 Epic 은 기존 모듈과 **동일 도메인**을 reverse-formalize 한 것이다.

따라서 본 디자인 명세는 **기존 구현의 실제 CSS 토큰·DOM 계약을 1차 소스로 삼아 dark operations UI 사양을 공식 문서화**한 것이며, 색/레이아웃/컴포넌트를 새로 발명하지 않는다. 아래 §2 디자인 토큰·§6 컴포넌트·§7 상태는 **현재 `incident-command/style.css` 및 `index.html` 에 이미 구현되어 있는 그대로**를 기술한다(그것이 source of truth). 이 정합성 원칙은 §10 AC-04(기존 구현과 100% 일치)로 검증된다.

BF-827 이 기존 모듈에 대한 **실질적 확장**(신규 필드/상태/화면)을 의도한 것이라면, 그 요구는 본 문서 이후의 별도 변경 스펙으로 다뤄야 한다(§11 비범위). 본 designer 는 Simplicity First 원칙에 따라 "기존 구현의 공식 디자인 스펙 문서화 + 시각 mockup 재현"을 채택한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [디자인 토큰 — 컬러 팔레트](#2-디자인-토큰--컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [스페이싱 · 라디우스 · 그림자](#4-스페이싱--라디우스--그림자)
5. [레이아웃 · 반응형 (데스크톱/태블릿/모바일)](#5-레이아웃--반응형-데스크톱태블릿모바일)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [상태별 시각 규칙 (loading · empty · error · 결과없음 · 미선택)](#7-상태별-시각-규칙-loading--empty--error--결과없음--미선택)
8. [접근성 · WCAG 대비](#8-접근성--wcag-대비)
9. [dev 구현 가이드](#9-dev-구현-가이드)
10. [AC ↔ UI 매핑 표](#10-ac--ui-매핑-표)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [mockup 참조 · PNG evidence](#12-mockup-참조--png-evidence)
13. [Self-critique](#13-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

운영자가 진행 중 장애 목록을 한눈에 훑고(Master), 한 건을 골라 심각도·담당자·타임라인·복구 체크리스트를 확인·체크하는(Detail) **dark operations 대시보드**의 디자인 토큰·타이포·반응형 레이아웃·컴포넌트·상태별 시각 규칙을 정의한다.

- 대상 모듈: `incident-command/` (기존 구현 — 본 designer PR 은 코드 미변경)
- 본 designer PR 이 건드리는 파일: `docs/design/incident-command-BF-827.md` + `docs/design/incident-command/**` (시안 문서·mockup·PNG) 뿐
- CSS 변수 프리픽스: `--ic-*` (기존 `--it-*`/`--rr-*` 등 타 모듈과 충돌 없음)
- 기존 구현 파일 수정: **0건** (Surgical Changes — 구현체는 dev-1 담당 영역)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| **"지금 제일 급한 게 뭔가"를 1초 안에** | 좌측 목록 행 최좌단에 severity 4px 컬러 레일(rail) + severity 배지를 스캔 경로(좌→우) 첫 픽셀에 고정. P1 은 배지 테두리 2px 로 유일하게 강조 |
| **야간 온콜의 눈 피로 최소화** | dark operations 팔레트. 배경은 순수 검정이 아닌 딥네이비(`#0B0F17`)로 잔상·눈부심 완화, 텍스트는 순백 대신 `#E8EDF5` 로 대비를 낮춰 장시간 응시 부담 감소 |
| **색맹·저조도에서도 오판 없음** | severity/status/eventType 은 **색 + 한글 라벨 + 형태(도형/테두리)** 3중 인코딩. 색상만으로 구분되는 정보 0건 |
| **체크리스트 진행이 "일한 느낌"으로** | 진행률 바를 상세 sticky 헤더 바로 아래 고정. 체크 시 항목 텍스트 취소선 + 완료 시각(mono) 노출 → 즉각 피드백 |
| **타임라인은 읽기 전용임이 자명** | 세로 라인 + 노드 형태. hover/pointer/포커스링 없음 → 클릭 가능해 보이지 않게 의도적 무반응 |

### 1.3 시각 톤

"SRE war room / 관제실" — 정보 밀도는 높되 장식은 0. 그라데이션·아이콘 폰트·일러스트·이미지 없음(vanilla-static 제약이자 톤 선택). 강조는 오직 **컬러 배지 + 여백 + 1px 경계선**으로만 만든다.

---

## 2. 디자인 토큰 — 컬러 팔레트

모두 `incident-command/style.css` 의 `:root` 에 직접 정의한다 (외부 토큰 파일 import 없음 — vanilla-static). **리터럴 HEX 는 `:root` 블록에만 존재**하고, 그 외 모든 `color`/`background`/`border-color` 는 `var(--ic-*)` 로만 참조한다(하드코딩 색상 금지).

### 2.1 기반 (Base / Surface / Text)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--ic-bg` | `#0B0F17` | 페이지 최상위 배경 (딥네이비) |
| `--ic-surface` | `#131A26` | 패널/카드 배경 (목록 패널, 상세 패널) |
| `--ic-surface-raised` | `#1B2433` | 한 단계 뜬 면 (행 hover, 상세 헤더, 체크리스트 항목) |
| `--ic-surface-selected` | `#1E2A3D` | 선택된 목록 행 배경 |
| `--ic-border` | `#2A3648` | **장식용** 구분선 (패널 경계, 타임라인 레일) — 대비 요건 비적용 |
| `--ic-border-interactive` | `#6B7C94` | **인터랙티브** 컨트롤 경계 (필터 칩, 목록 행, 체크박스) — WCAG 3:1 충족 |
| `--ic-text` | `#E8EDF5` | 본문/제목 기본 텍스트 |
| `--ic-text-secondary` | `#9FB0C7` | 보조 텍스트 (담당자 팀, note 본문) |
| `--ic-text-muted` | `#6B7C94` | 최약 텍스트 (타임스탬프, 캡션) |
| `--ic-accent` | `#4DA3FF` | 포커스 링, 링크, 활성 필터 칩 |
| `--ic-accent-fg` | `#08111C` | 활성 필터 칩 위 텍스트 (accent 배경 대비 8.4:1) |

### 2.2 Severity 배지 (기획 §4.1 — P1~P4)

각 배지는 `배경(bg) + 텍스트(fg) + 1px 테두리(border)` 3토큰 1세트. 텍스트는 항상 한글 라벨 병기(`P1 · 치명`).

| severity | 라벨 | `--ic-sev-N-fg` | `--ic-sev-N-bg` | `--ic-sev-N-border` | 형태 보조 |
|----------|------|-----------------|-----------------|---------------------|-----------|
| `P1` | 치명 | `#FF8A8A` | `#3A1518` | `#7A2A30` | 목록 행 좌측 4px 레일 + **배지 테두리 2px (유일)** |
| `P2` | 높음 | `#FFC96B` | `#3A2A10` | `#7A5A20` | 좌측 레일 4px |
| `P3` | 보통 | `#7DB8FF` | `#12283F` | `#2C5480` | 좌측 레일 4px |
| `P4` | 낮음 | `#B9C7DA` | `#212C3B` | `#44536B` | 좌측 레일 4px |

> **P1 만 배지 테두리 2px** — 색을 못 보는 사용자도 "가장 두꺼운 배지 = 가장 급함"을 형태로 인지. 라벨은 코드+한글 동시 표기.

### 2.3 Status 배지 (기획 §4.2 — 5단계)

배경은 5종 공통 `#1E2735`, 텍스트 색 + **선행 도형(`::before`)** 으로 구분(색 비의존 인코딩).

| status | 라벨 | `--ic-status-*-fg` | 선행 도형 |
|--------|------|--------------------|-----------|
| `detected` | 감지됨 | `#C7D3E3` | ○ 속 빈 원 (border only) |
| `investigating` | 조사중 | `#FFC96B` | ◐ 반원 (우측 절반 채움) |
| `mitigating` | 조치중 | `#5EEAD4` | ● 채운 원 |
| `monitoring` | 모니터링 | `#7DB8FF` | ◎ 이중 원 (링) |
| `resolved` | 해결됨 | `#4ADE80` | ✓ 체크 글리프 |

> 도형은 이미지/아이콘 폰트가 아니라 CSS `::before` 의사 요소(border-radius/box-shadow/linear-gradient) 또는 유니코드 문자 — 외부 의존성 0건.

### 2.4 Timeline eventType (기획 §4.3 — 4종)

| eventType | 라벨 | 노드 색 `--ic-evt-*` | 노드 형태 | 행 배경 |
|-----------|------|----------------------|-----------|---------|
| `detected` | 감지 | `#C7D3E3` | 속 빈 원 (2px 테두리, 배경=페이지 bg) | 없음 |
| `update` | 진행 갱신 | `#7DB8FF` | 채운 원 (8px) | 없음 |
| `escalated` | 에스컬레이션 | `#FF8A8A` | **마름모(45° 회전 사각형)** | `#2A1A1E` + 좌측 2px 적색 라인 (유일한 배경 강조) |
| `resolved` | 해결 | `#4ADE80` | 채운 원 + ✓ | `#12261B` (은은한 녹색) |

### 2.5 기능 색 (Feedback / 상태)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--ic-progress-fill` | `#4ADE80` | 체크리스트 진행률 바 채움 |
| `--ic-progress-track` | `#212C3B` | 진행률 바 트랙 |
| `--ic-danger` | `#FF5C5C` | error 배너 강조 테두리 |
| `--ic-danger-bg` | `#2A1418` | error 배너 배경 |
| `--ic-focus` | `#4DA3FF` | 포커스 링 (2px solid + 2px offset) |
| `--ic-skeleton` | `#1E2735` | loading 스켈레톤 블록 |
| `--ic-skeleton-shine` | `#2A3648` | 스켈레톤 펄스 밝은 톤 |

---

## 3. 타이포그래피

### 3.1 폰트 스택 (system font only — CDN 금지)

```css
--ic-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo",
                "Malgun Gothic", "Noto Sans KR", sans-serif;
--ic-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "D2Coding", monospace;
```

`--ic-font-mono` 는 **타임스탬프·장애 ID·진행률 수치** 전용 — 자릿수가 흔들리지 않아 목록에서 시각적으로 정렬돼 보인다(관제 화면 핵심 요건).

### 3.2 타입 스케일

| 역할 | size / weight / line-height | letter-spacing | 적용 위치 |
|------|------------------------------|----------------|-----------|
| 페이지 타이틀 | `22px / 700 / 1.3` | `-0.01em` | `<h1>` "Incident Command Center" |
| 패널 타이틀 | `16px / 600 / 1.4` | `0` | "장애 목록", "대응 타임라인", "복구 체크리스트" |
| 상세 장애 제목 | `20px / 700 / 1.35` | `-0.01em` | 상세 헤더 장애 title |
| 목록 행 제목 | `15px / 600 / 1.4` | `0` | `<li>` 장애 title |
| 본문 | `14px / 400 / 1.6` | `0` | 타임라인 note, 체크리스트 text, 안내 문구 |
| 캡션 / 메타 | `12px / 500 / 1.5` | `0` | 담당자 팀, "총 N건" |
| 배지 | `12px / 700 / 1` | `0.02em` | severity / status 배지 |
| 모노 (타임스탬프·ID) | `12px / 500 / 1.5` | `0` | `INC-3001`, `2026-07-14 02:45` |

- 최소 폰트 크기 **12px** (그 이하 금지).
- 한글 본문 line-height 1.6 고정 (영문 기준 1.4 는 한글에서 답답함).

### 3.3 타임스탬프 표시 포맷 (dev 필수 — 재해석 금지)

fixture 는 `2026-07-14T02:45:00+09:00`(오프셋 고정 문자열). 화면 표시는 **문자열 슬라이스로만** 가공 — `new Date()` 파싱 금지(기획 §3.3 결정론성).

| 위치 | 표시 | 산출 방법 |
|------|------|-----------|
| 목록 행 "최근 업데이트" | `07-14 02:45` | `iso.slice(5,10) + ' ' + iso.slice(11,16)` |
| 상세 헤더 감지/업데이트 | `2026-07-14 02:45` | `iso.slice(0,10) + ' ' + iso.slice(11,16)` |
| 타임라인 이벤트 | `02:45` | `iso.slice(11,16)` |
| 체크리스트 완료 시각 | `07-14 02:20` | `iso.slice(5,10) + ' ' + iso.slice(11,16)` |

모두 `--ic-font-mono` + `--ic-text-muted`. `+09:00` 오프셋은 화면 미표시(전 데이터 KST 고정이라 노이즈).

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
- dark UI 에서 그림자는 거의 안 보이므로 **깊이는 배경 명도차(`--ic-surface` → `--ic-surface-raised`)로 표현**, shadow 는 최소만.

---

## 5. 레이아웃 · 반응형 (데스크톱/태블릿/모바일)

### 5.1 전체 골격 (데스크톱 ≥768px — 2단 Master-Detail)

```
┌──────────────────────────────────────────────────────────────┐
│ <header .ic-topbar>  h1 Incident Command Center   총 6건 (mono)│
├──────────────────────────────────────────────────────────────┤
│ <main #incident-command data-view-state="ready">              │
│  ┌───────────────────────┬────────────────────────────────┐   │
│  │ <section .ic-list-pane>│ <section #incident-detail>     │   │
│  │  h2 장애 목록           │  ┌ sticky 헤더 ──────────────┐ │   │
│  │  [전체][P1][P2][P3][P4]│  │ 제목 + severity + status  │ │   │
│  │  ─────────────────────│  │ owner · 감지/업데이트 시각 │ │   │
│  │  ▌P1·치명 결제 게이트…  │  └───────────────────────────┘ │   │
│  │  ▌P2·높음 CDN 5xx…     │  ┌ 복구 체크리스트 ──────────┐ │   │
│  │  ▌P3·보통 세션 오탐…    │  │ [progressbar] 2/4 (50%)   │ │   │
│  │  …                     │  │ ☑ 사이드카 재시작          │ │   │
│  │                       │  │ ☐ 재시도 큐 우회 …         │ │   │
│  │                       │  └───────────────────────────┘ │   │
│  │                       │  ┌ 대응 타임라인 ────────────┐ │   │
│  │                       │  │ ○ 02:10 감지  …           │ │   │
│  │                       │  │ ● 02:15 진행 갱신 …        │ │   │
│  │                       │  └───────────────────────────┘ │   │
│  └───────────────────────┴────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

> **상세 패널 내 섹션 순서 = 체크리스트 → 타임라인** (의도적). 운영자가 상세를 여는 1순위 동기는 "지금 뭘 해야 하나(=체크리스트)"이고, 타임라인은 맥락 참조다. 상호작용 가능한 것을 스크롤 없이 먼저 노출한다.

### 5.2 브레이크포인트

| 뷰포트 | 레이아웃 | 세부 |
|--------|----------|------|
| **≥ 768px** (데스크톱/태블릿) | 2단 Master-Detail | `grid-template-columns: minmax(300px, 360px) 1fr; gap: var(--ic-space-5);` 목록 패널 `position:sticky; top:var(--ic-space-4); max-height:calc(100vh - var(--ic-space-7)); overflow-y:auto` — 상세가 길어져도 목록은 항상 보임 |
| **≥ 1280px** (와이드) | 2단 (목록 폭 확대) | `grid-template-columns: 380px 1fr;` `max-width:1400px; margin-inline:auto;` |
| **320px ~ 767px** (모바일) | 세로 스택 | `grid-template-columns: 1fr;` 목록 위 / 상세 아래. 가로 스크롤 0 (`min-width:0` 를 모든 grid item 에 필수) |

### 5.3 모바일(<768px) 세부 규칙

- 필터 칩 그룹: `display:flex; overflow-x:auto;` + 칩 `flex:0 0 auto` → 가로 스크롤 허용. 스크롤바 숨김(`scrollbar-width:none`), 스크롤은 유지.
- 목록 행: severity/status 배지를 제목 **아래 줄**로 내려 2행 구성(좁은 폭에서 넘침 방지).
- 상세 sticky 헤더: 모바일에서도 `position:sticky; top:0` 유지 → 긴 타임라인 스크롤 중 "어느 장애인지" 유지.
- 터치 타깃 **최소 44×44px** — 필터 칩(`min-height:36px` + padding), 체크박스(`width:20px` + label padding), 목록 행(`min-height:64px`).
- 최소 지원 폭 **320px** — 가로 스크롤 0건. 긴 제목 `overflow-wrap:anywhere`.

---

## 6. 컴포넌트 명세

> 아래 "props" 는 React props 가 아니라 **dev 가 DOM 을 만들 때 주입하는 데이터 축**(vanilla DOM). `data-*`/`id`/`role`/`aria-*` 는 기획 DOM 계약상 **변경 금지**, 클래스명은 권장(재량 가능).

### 6.1 SeverityBadge

| 항목 | 내용 |
|------|------|
| 마크업 | `<span class="ic-badge ic-badge--sev" data-severity="P1">P1 · 치명</span>` |
| props | `severity: 'P1'\|'P2'\|'P3'\|'P4'` (라벨은 `SEVERITY_LABELS[severity]` 조회 — 하드코딩 금지) |
| 스타일 | `padding:3px 8px; border-radius:var(--ic-radius-sm); font:var(--ic-type-badge); border:1px solid var(--ic-sev-N-border);` 색은 `[data-severity]` 속성 선택자 분기 |
| 특이 | `[data-severity="P1"]` 만 `border-width:2px`. 정적(hover/focus 없음) |

### 6.2 StatusBadge

| 항목 | 내용 |
|------|------|
| 마크업 | `<span class="ic-badge ic-badge--status" data-status="investigating">조사중</span>` |
| props | `status`(5종, 라벨 `STATUS_LABELS[status]`) |
| 스타일 | 공통 bg `--ic-status-bg`, 텍스트색만 `[data-status]` 분기. `::before` 8px 선행 도형(§2.3) |

### 6.3 SeverityFilterChip (그룹)

| 항목 | 내용 |
|------|------|
| 마크업 | `<div role="group" aria-label="심각도 필터" class="ic-filters"><button class="ic-chip" data-severity-filter="all" aria-pressed="true">전체</button> …</div>` |
| props | `value: 'all'\|'P1'..'P4'`, `pressed: boolean` |
| 기본 | `background:transparent; color:var(--ic-text-secondary); border:1px solid var(--ic-border-interactive); border-radius:var(--ic-radius-pill); padding:6px 14px; min-height:36px;` |
| hover | `background:var(--ic-surface-raised); color:var(--ic-text);` |
| **활성** | `[aria-pressed="true"]` → `background:var(--ic-accent); color:var(--ic-accent-fg); border-color:var(--ic-accent); font-weight:700;` — **`aria-pressed` 속성 선택자로 스타일링**(별도 `.is-active` 금지: 시각·접근성 상태 어긋남 방지) |
| focus-visible | `outline:2px solid var(--ic-focus); outline-offset:2px;` |

### 6.4 IncidentListRow

| 항목 | 내용 |
|------|------|
| 마크업 | `<li class="ic-row" data-id="INC-3001" data-severity="P1" data-status="investigating" role="option" aria-selected="true" tabindex="0"> … </li>` (부모 `<ul id="incident-list" role="listbox">`) |
| props | `id, title, severity, status, owner{name,team}, updatedAt` |
| 구성(≥768px) | 1행 `[severity 배지][제목 flex:1][status 배지]` / 2행 `[담당자·팀] … [07-14 02:45 mono]` |
| 구성(<768px) | 1행 `[제목]` / 2행 `[severity][status]` / 3행 `[담당자·팀][시각]` |
| 좌측 레일 | `border-left:4px solid var(--ic-sev-N-fg)` — 배지가 잘려도 레일은 남음 |
| 기본 | `background:var(--ic-surface); border:1px solid var(--ic-border-interactive); border-radius:var(--ic-radius-md); padding:var(--ic-space-3); cursor:pointer; min-height:64px;` |
| **선택** | `[aria-selected="true"]` → `background:var(--ic-surface-selected); box-shadow:var(--ic-shadow-selected);` + 좌측 레일 `6px` |
| 키보드 | `tabindex="0"`, `Enter`/`Space` 로 선택 (`keydown` 에서 `e.preventDefault()` 후 핸들러 — Space 기본 스크롤 방지 필수) |

### 6.5 DetailHeader

| 항목 | 내용 |
|------|------|
| 마크업 | `<header class="ic-detail-head">` 내부 `<h2>` 제목 + 배지 2종 + owner + 시각 2종 |
| 스타일 | `position:sticky; top:0; background:var(--ic-surface-raised); border-bottom:1px solid var(--ic-border); padding:var(--ic-space-4); border-radius:var(--ic-radius-lg) var(--ic-radius-lg) 0 0; z-index:2;` |
| Owner | `<span class="ic-owner"><span class="ic-owner__avatar" aria-hidden="true">김</span> 김온콜 <span class="ic-owner__team">Payments</span></span>` — avatar 는 이름 첫 글자 1자를 CSS 원형 배경에 렌더(이미지 0건, `aria-hidden`) |
| 시각 | `감지 2026-07-14 02:10 · 업데이트 2026-07-14 02:45` (mono, `--ic-text-muted`) |

### 6.6 ChecklistProgress (진행률 바)

| 항목 | 내용 |
|------|------|
| 마크업 | `<div class="ic-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><div class="ic-progress__fill" style="width:50%"></div></div>` + `<p class="ic-progress__text">2 / 4 완료 (50%)</p>` |
| props | `done, total, percent` (기획 §6.2: `percent = total===0 ? 0 : Math.round(done/total*100)`) |
| 스타일 | 트랙 `height:8px; background:var(--ic-progress-track);` fill `background:var(--ic-progress-fill); transition:width 180ms ease-out;` |
| 빈 체크리스트 | `total===0` 이면 진행률 바 대신 고정 문구 **"해당 장애에 등록된 복구 체크리스트가 없습니다."**(§7.6) |

### 6.7 ChecklistItem

| 항목 | 내용 |
|------|------|
| 마크업 | `<li class="ic-check"><input type="checkbox" class="ic-check__box" id="chk-3001-1"> <label class="ic-check__label" for="chk-3001-1">…</label> <span class="ic-check__at ic-mono">07-14 02:20</span></li>` |
| 체크 상태 | `input:checked + label` → `text-decoration:line-through; color:var(--ic-text-muted);` |
| 완료 시각 | `done===true` 일 때만 노출(§3.3 포맷). 토글은 세션 in-memory(새로고침 시 fixture 초기값 복귀) |
| 접근성 | 체크박스 `accent-color:var(--ic-progress-fill)`, label `for` 연결, 터치 타깃 44px |

### 6.8 TimelineEvent (읽기 전용)

| 항목 | 내용 |
|------|------|
| 마크업 | `<li class="ic-tl" data-event-type="escalated"> … </li>` (부모 `<ol>` 세로 라인 `::before`) |
| 노드 | `::before` 로 8px 도형 — detected 속 빈 원 / update 채운 원 / escalated 마름모(rotate 45°) / resolved 채운 원+✓ (§2.4) |
| escalated 강조 | 행 배경 `--ic-evt-escalated-bg` + 좌측 2px 적색 라인(유일한 배경 강조) |
| 상호작용 | **없음** — `cursor:default`, hover/focus 링 없음(읽기 전용임을 시각적으로 명시) |

---

## 7. 상태별 시각 규칙 (loading · empty · error · 결과없음 · 미선택)

`#incident-command` 의 `data-view-state` 속성 1개로 최상위 상태를 전환한다. JS 는 이 속성만 바꾸고, 표시/숨김은 CSS 가 담당(기획 §7.1 판정 파이프라인).

### 7.1 Loading (스켈레톤)

- `data-view-state="loading"` — `index.html` 정적 마크업이 담고 있는 초기 상태. 스크립트 실행 즉시 ready/empty/error 로 교체.
- 좌측 목록 4행 + 우측 헤더/본문 블록을 `--ic-skeleton` → `--ic-skeleton-shine` 펄스 애니메이션(1.2s). `aria-hidden="true"`.
- `prefers-reduced-motion: reduce` 시 애니메이션 제거(정적 블록).

### 7.2 Empty (최상위)

- `data-view-state="empty"` — `loadIncidents([]).incidents.length === 0`.
- 중앙 정렬, 48px 점선 원형 마크(`—`) + 고정 문구 **"표시할 장애가 없습니다."** (`--ic-text-secondary`).

### 7.3 Error

- `data-view-state="error"` — 스키마 검증 실패 또는 fixture 전역 객체 부재.
- `role="alert"` 배너: `background:var(--ic-danger-bg); border:1px solid var(--ic-danger); border-left-width:4px;` + ⚠ 글리프 + 고정 문구 **"장애 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요."**
- "재시도" 버튼 없음(외부 API 없는 화면에서 재시도=새로고침 — Simplicity First).

### 7.4 Ready

- `data-view-state="ready"` — `incidents.length > 0`. 2단 grid 노출(§5).
- 상단바 `총 N건`(mono) + `aria-live="polite"` 로 SR 안내.

### 7.5 필터 결과 0건 (Ready 유지, 부분 상태)

- 최상위는 `ready` 유지. 심각도 필터 결과 0건이면 `#incident-list` 숨기고 `#filter-empty` 노출.
- 점선 테두리 안내 블록 + 고정 문구 **"해당 심각도의 장애가 없습니다."** + "필터 초기화" 버튼(accent 테두리).
- §7.2 최상위 empty 와 발생 조건·문구·위치가 모두 다르므로 구분 표기.

### 7.6 상세 미선택 / 빈 체크리스트

- **미선택**: 목록에서 아직 아무 것도 안 고른 초기 상태 → 상세 패널에 점선 안내 블록 + 화살표(`←`) + "왼쪽 목록에서 장애를 선택하세요." 안내.
- **빈 체크리스트**: 선택된 장애의 `checklist.length===0`(예: INC-3004) → 진행률 바 대신 고정 문구 "해당 장애에 등록된 복구 체크리스트가 없습니다."

---

## 8. 접근성 · WCAG 대비

- **3중 인코딩**: severity/status/eventType 모두 색 + 한글 라벨 + 형태. 색상 단독 정보 0건(WCAG 1.4.1).
- **대비**: 본문 `#E8EDF5` on `#131A26` ≈ 13:1(AAA). 보조 `#9FB0C7` on `#131A26` ≈ 7:1(AAA). 활성 칩 `#08111C` on `#4DA3FF` ≈ 8.4:1. 인터랙티브 경계 `#6B7C94` on surface ≥ 3:1(WCAG 1.4.11).
- **포커스**: 전 인터랙티브 요소 `:focus-visible` → `outline:2px solid var(--ic-focus); outline-offset:2px;`
- **키보드**: 목록 행 `tabindex="0"` + Enter/Space 선택. Tab 순서는 DOM 순서 고정.
- **SR**: 목록 `role="listbox"`, 행 `role="option"` + `aria-selected`. 진행률 `role="progressbar"` + `aria-valuenow`. error `role="alert"`. 건수 갱신 `aria-live="polite"`. avatar/도형은 `aria-hidden`.
- **모션**: `prefers-reduced-motion: reduce` 시 스켈레톤 펄스·진행률 transition 제거.
- **터치**: 모바일 인터랙티브 타깃 최소 44×44px.

---

## 9. dev 구현 가이드

> 본 모듈은 이미 구현되어 있다(§0). 아래는 **재구현/회귀 시 dev-1 이 준수해야 할 계약**이며, 현재 코드가 이미 만족한다.

1. **토큰 정의 위치**: 리터럴 HEX 는 `incident-command/style.css` `:root` 에만. 그 외 전부 `var(--ic-*)`. (§2)
2. **폰트**: system stack 만(§3.1). CDN·웹폰트 link 금지(vanilla-static).
3. **타임스탬프**: `new Date()` 파싱 금지 — 문자열 slice 만(§3.3). `+09:00` 미표시.
4. **상태 전환**: JS 는 `#incident-command` 의 `data-view-state` 속성만 변경. 표시/숨김은 CSS `[data-view-state="…"]` 선택자가 담당(§7). `loading` 고착은 버그.
5. **DOM 계약(변경 금지)**: `data-severity`/`data-status`/`data-event-type`/`data-severity-filter`/`aria-pressed`/`aria-selected`/`role="listbox|option|progressbar|alert"`/`id="incident-list|incident-detail|filter-empty|ic-live"`.
6. **활성/선택 스타일**: `.is-active` 같은 별도 클래스 금지 — `[aria-pressed="true"]`/`[aria-selected="true"]` 속성 선택자로만(§6.3, §6.4).
7. **severity 레일**: 행 `border-left` 색을 `data-severity` 로 분기. P1 배지만 border 2px.
8. **진행률**: `percent = total===0 ? 0 : Math.round(done/total*100)`(기획 §6.2). `total===0` 은 바 대신 안내 문구.
9. **체크리스트 토글**: 세션 in-memory. `checked` 시 label 취소선 + 완료 시각 노출, 진행률 재계산. 영속 저장 없음.
10. **타임라인 무반응**: `cursor:default`, hover/focus 링 없음(읽기 전용 의도).
11. **반응형**: 768px/1280px 두 브레이크포인트만. 320px 가로 스크롤 0(`min-width:0` 필수).
12. **기존 파일 무변경 원칙**: 타 모듈 CSS/토큰 공유 없음(`--ic-*` 독립 프리픽스).

권장 클래스명: `.ic-topbar` `.ic-grid` `.ic-list-pane` `.ic-panel` `.ic-filters` `.ic-chip` `.ic-list` `.ic-row` `.ic-badge` `.ic-detail-head` `.ic-owner` `.ic-progress` `.ic-check` `.ic-timeline` `.ic-tl` (mockup HTML 과 동일 — 참조 가능).

---

## 10. AC ↔ UI 매핑 표

| AC | 요구 | 충족 위치 |
|----|------|-----------|
| **AC-01** 디자인 명세 작성 → 토큰·반응형·상태별 시안 문서화 | §2 토큰, §3 타이포, §5 반응형(데스크톱/태블릿/모바일), §7 loading/empty/error/ready | 본 문서 |
| **AC-02** mockup 생성 → 실제 HTML 시안 + PNG evidence | §12 — `docs/design/incident-command/mockup-BF-829.html` + `…mockup-BF-829.png` | mockup 산출물 |
| **AC-03** 화면 상태 시각화 | §7 + mockup 하단 "상태 갤러리"(loading/empty/error/filter-empty 정적 재현) | 본 문서 + mockup |
| **AC-04** 기존 구현과 100% 정합 | §2~§7 토큰/DOM 계약이 실제 `style.css`/`index.html` 과 일치(§0) | 정합성 검증 |

---

## 11. 비범위 (Out of Scope)

- `incident-command/` 코드(HTML/CSS/JS) 신규 작성/수정 — 이미 구현, 본 designer PR 담당 아님(dev-1 영역).
- 신규 필드/화면/실시간 API 연동 설계 — 별도 변경 티켓 필요(§0).
- 체크리스트 토글 영속 저장(localStorage/서버) — 세션 in-memory 로 충분.
- status ↔ checklist 완료율 자동 동기화.
- 다국어/테마 토글 — 단일 dark 테마·한국어 고정.

---

## 12. mockup 참조 · PNG evidence

| 산출물 | 경로 | 내용 |
|--------|------|------|
| 시각 mockup HTML | `docs/design/incident-command/mockup-BF-829.html` | 단일 self-contained 파일(외부 의존성 0). §2~§7 토큰/컴포넌트/상태를 그대로 재현. ready 상태(INC-3001 선택) + 하단 "상태 갤러리"(loading·empty·error·filter-empty) + 데스크톱/모바일 프레임 |
| PNG evidence | `docs/design/incident-command/mockup-BF-829.png` | 결정론적 스키매틱 렌더(순수 Node zlib, 브라우저·외부 도구 0건). 2단 레이아웃 구조 + severity 레일/배지 + 진행률 바 + 타임라인 노드 + 디자인 토큰 팔레트 스트립을 실제 HEX 로 표현 |

> **PNG 생성 방식 (투명성):** 본 worktree 환경에는 headless 브라우저·라스터화 도구(chromium/playwright/wkhtmltoimage/ImageMagick 등)가 없어, 공용 `docs/design/mockups/` 자동 screenshot capture 경로도 본 Epic 의 File Ownership(`docs/design/incident-command/**`) 밖이다. 따라서 PNG evidence 는 **vanilla 원칙에 맞춰 외부 의존성 0건으로** 직접 생성했다 — Node 내장 `zlib` 로 RGBA 프레임버퍼를 PNG 인코딩하는 방식의 결정론적 스키매틱 렌더다. 픽셀 정밀 시안은 mockup HTML 이 source 이며, PNG 는 레이아웃·토큰 팔레트를 한 장으로 요약한 evidence 다.

---

## 13. Self-critique

PR commit 직전 자기 점검(`.claude/skills/designer-spec-self-critique.md` 5개 항목):

1. **AC 매핑** — AC-01(토큰·반응형·상태 문서화) §2/§3/§5/§7, AC-02(HTML+PNG) §12, AC-03(상태 시각화) §7+mockup, AC-04(정합성) §0/§10. 4개 AC 전부 문서 내 위치로 추적 가능. ✅
2. **dev 구현 가이드** — §9 에 12개 계약(토큰 위치·타임스탬프 slice·data-view-state 전환·DOM 계약·속성 선택자·진행률 공식·반응형 브레이크포인트) 명시. CSS 변수명·클래스명·`data-*` 계약을 dev 가 그대로 따를 수 있게 서술. ✅
3. **기존 요소 보존** — §0/§1.1/§11 에서 "기존 구현 코드 0건 수정, `--ic-*` 독립 프리픽스, 타 모듈 무변경" 명시. designer PR 은 `docs/design/**` 만 건드림(Surgical Changes). ✅
4. **컴포넌트 매핑** — §6 에 8개 컴포넌트(SeverityBadge/StatusBadge/FilterChip/ListRow/DetailHeader/Progress/ChecklistItem/TimelineEvent) 각각 마크업·props·상태·특이사항 정의. 실제 `index.html` DOM 계약과 대조 완료. ✅
5. **모호함 flag** — §0 에 "BF-827 이 실질적 확장을 의도했다면 별도 티켓 필요"라는 재해석 리스크를 명시적으로 flag. planner 문서(§0)와 동일 판단으로 "기존 구현 공식 문서화"를 채택함을 밝힘. ✅

**남은 모호함(운영자 확인 권장):** BF-827 Epic 이 기존 incident-command 모듈의 **디자인 리뉴얼/확장**을 원했다면, 본 명세는 현행 유지(as-is 문서화)이므로 시각 변경분이 없다. 리뉴얼이 목표라면 구체적 변경 요구(신규 컬러 테마/레이아웃/컴포넌트)를 Jira 코멘트로 명확히 해주면 후속 cycle 에서 반영한다.
