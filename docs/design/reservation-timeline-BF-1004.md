# 예약 목록·일간 타임라인 디자인 명세 — BF-1004

> 작성자: [이디자인] · 작성일 2026-07-17
> 관련 티켓: BF-1004 (designer task) · 상위 Epic: team-reservation-canary
> 의존 명세: [reservation-approval-spec-BF-1002.md](../plan/team-reservation-canary/reservation-approval-spec-BF-1002.md) (planner, [박기획])
> 대상 모듈: `team-reservation-canary/` (developer BF-1006 구현 예정)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> mockup 참조: [mockups/reservation-timeline-BF-1004.html](./mockups/reservation-timeline-BF-1004.html)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태 신호 체계 — 색상+텍스트+아이콘 병행](#6-상태-신호-체계--색상텍스트아이콘-병행)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [접근성 (a11y)](#8-접근성-a11y)
9. [mockup 참조](#9-mockup-참조)
10. [AC 매핑 & 비범위](#10-ac-매핑--비범위)

---

## 1. 시안 개요

### 1.1 변경 범위

`team-reservation-canary/` 신규 모듈의 **단일 페이지 화면**을 두 개의 주요 뷰로 구성한다:

| 뷰 | 목적 | planner 명세 근거 |
|----|------|-------------------|
| **예약 목록 (Reservation List)** | 전체 예약 신청 건을 카드/행으로 나열, `pending` 건에 대해 승인/반려 조작 | §5.2 상태 전이, §13 위임 요소 |
| **일간 타임라인 (Daily Timeline)** | 특정 날짜의 자원별 시간대 점유 현황을 시각적 그리드로 표시 | §4 시간 겹침, §3.2 seed |

두 뷰는 세로로 이어진 단일 스크롤 페이지(`index.html`)이며, 상단에 앱 헤더, 그 아래 날짜/자원 필터 바, 그 다음 목록 뷰와 타임라인 뷰가 순서대로 배치된다.

### 1.2 사용자 경험 목표

- **한눈에 상태 파악**: 각 예약의 상태(`대기`/`승인`/`반려`)를 **색상만이 아니라 텍스트 라벨 + 아이콘 3중 신호**로 전달해 색각 이상 사용자·흑백 출력·저대비 환경에서도 구분 가능하게 한다 (본 task 의 핵심 AC).
- **충돌 회피의 직관화**: 타임라인 그리드에서 이미 `승인`된 예약 블록과 시간이 겹치는 `대기` 블록을 시각적으로 인접 배치해, 승인 시 발생할 충돌을 사전에 인지하게 한다.
- **결정 액션의 명확성**: 승인/반려 버튼은 `pending` 상태 카드에서만 노출되며(§5.2 고정 요구), 종료 상태(`approved`/`rejected`) 카드는 조작 UI 없이 결과만 표시한다.
- **기존 페이지와의 일관성**: 리포 공통 디자인 언어(중립 회색 베이스 + 단일 accent blue + 시맨틱 3색, 4px 배수 spacing, system font)를 그대로 계승해 다른 브릭 페이지와 이질감이 없도록 한다.

### 1.3 참조한 기존 디자인 언어

본 명세는 기존 업무용 UI mockup의 토큰 관례를 계승한다 (신규 발명 최소화):

- 베이스/서피스/보더/텍스트 계열: `incident-triage-BF-802.html`, `status-badge-BF-855.html` 의 중립 회색 팔레트
- accent blue `#3563E9`: 리포 전역 공통 accent
- 시맨틱 3색(success/warning/danger) 및 4·8·12·16·24·32·48 spacing scale, radius 4/8/12: `kanban`/`status-badge` 관례
- 접두사만 예약 도메인용 `--tr-` (team-reservation)로 네임스페이스 분리

---

## 2. 컬러 팔레트

모든 색상은 mockup HTML `:root` 에 CSS 변수로 정의된다. `vanilla-static` 규약에 따라 디자인 토큰 파일 없이 mockup·구현 CSS 안에서 직접 정의한다. 접두사 `--tr-`.

### 2.1 기본(Base) 팔레트

| 역할 | 변수명 | HEX | 용도 |
|------|--------|-----|------|
| 배경 | `--tr-color-bg` | `#F1F3F5` | 페이지 캔버스 |
| 서피스 | `--tr-color-surface` | `#FFFFFF` | 카드/패널 배경 |
| 서피스(약) | `--tr-color-surface-muted` | `#F8F9FA` | 타임라인 격자, 테이블 헤더 |
| 보더 | `--tr-color-border` | `#DDE1E6` | 카드/셀 구분선 |
| 보더(강) | `--tr-color-border-strong` | `#B9C0C8` | 포커스 인접/강조 구분 |
| 본문 텍스트 | `--tr-color-text` | `#1A1D21` | 제목/본문 |
| 보조 텍스트 | `--tr-color-text-muted` | `#5F6B76` | 캡션/메타 정보 |
| accent | `--tr-color-accent` | `#3563E9` | 주요 버튼·링크·선택 상태 |
| accent hover | `--tr-color-accent-hover` | `#2A50C4` | accent hover/active |
| 포커스 링 | `--tr-color-focus-ring` | `rgba(53,99,233,0.45)` | 키보드 포커스 아웃라인 |

> 대비 검증: `--tr-color-text` (#1A1D21) on `--tr-color-surface` (#FFFFFF) = 15.8:1 (AAA). `--tr-color-text-muted` (#5F6B76) on #FFFFFF = 5.0:1 (AA 통과, 14px+ 본문). accent #3563E9 on #FFFFFF = 5.2:1 (AA).

### 2.2 상태(Status) 팔레트 — planner §5 상태 3종 매핑

각 상태는 **전경색(글자/아이콘/보더용)** 과 **틴트 배경색(칩/블록 배경용)** 을 짝으로 정의한다. 상태별로 서로 다른 **색상(hue)** 을 부여하되, §6 에서 정의하는 텍스트·아이콘 신호와 항상 병행한다.

| planner 상태 | 표시 라벨 | 전경 변수 | 전경 HEX | 틴트 변수 | 틴트 HEX | hue |
|--------------|-----------|-----------|----------|-----------|----------|-----|
| `pending` | 대기 | `--tr-status-pending` | `#B45309` | `--tr-status-pending-tint` | `#FFF7ED` | amber |
| `approved` | 승인 | `--tr-status-approved` | `#0F7B4F` | `--tr-status-approved-tint` | `#ECFDF5` | green |
| `rejected` | 반려 | `--tr-status-rejected` | `#475569` | `--tr-status-rejected-tint` | `#F1F5F9` | slate |

> 설계 의도: `rejected` 를 흔한 빨강 대신 **slate(회청)** 로 둔 이유는, 빨강을 §2.3 의 **충돌(CONFLICT) 경고 전용**으로 분리해 "반려된 과거 결정"과 "지금 승인하면 터지는 실시간 경고"를 색으로도 구분하기 위함이다. 반려는 이미 종료된 중립적 결과이므로 채도 낮은 slate 가 적절하다.

> 대비 검증(전경 on 틴트): pending #B45309 on #FFF7ED = 6.4:1 (AA). approved #0F7B4F on #ECFDF5 = 5.6:1 (AA). rejected #475569 on #F1F5F9 = 7.4:1 (AAA). 전경색 on #FFFFFF 도 모두 4.5:1 이상.

### 2.3 피드백(Feedback) 팔레트

| 역할 | 변수명 | HEX | 용도 |
|------|--------|-----|------|
| 충돌 경고 | `--tr-color-conflict` | `#B91C1C` | CONFLICT 반환 시 인라인 경고 배너/보더 (§5.5) |
| 충돌 틴트 | `--tr-color-conflict-tint` | `#FEF2F2` | 충돌 배너 배경 |
| 성공 피드백 | `--tr-color-success` | `#0F7B4F` | 승인 완료 토스트 (approved 전경과 동일) |
| 정보 | `--tr-color-info` | `#1D4ED8` | "임시 세션(저장 안 됨)" 안내 등(§7.3 planner) |

---

## 3. 타이포그래피

`vanilla-static` 규약에 따라 **system font stack** 만 사용한다(외부 폰트 CDN 금지). 한글 표시를 위해 stack 에 `"Noto Sans KR"`/`"Apple SD Gothic Neo"` 를 포함하되, 이는 OS 로컬 폰트 참조일 뿐 네트워크 호출이 없다.

```css
--tr-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI",
                "Apple SD Gothic Neo", "Noto Sans KR", system-ui,
                Roboto, "Helvetica Neue", Arial, sans-serif;
--tr-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | 변수 | font | size / line-height | weight | 용도 |
|------|------|------|--------------------|--------|------|
| 페이지 타이틀 (h1) | `--tr-text-h1` | sans | 22px / 1.3 | 700 | 앱 헤더 제목 |
| 섹션 헤딩 (h2) | `--tr-text-h2` | sans | 17px / 1.35 | 600 | "예약 목록" / "일간 타임라인" |
| 카드 타이틀 (h3) | `--tr-text-h3` | sans | 15px / 1.4 | 600 | 자원명 / 예약 제목 |
| 본문 (body) | `--tr-text-body` | sans | 14px / 1.6 | 400 | 신청자·설명 |
| 라벨 (label) | `--tr-text-label` | sans | 13px / 1.4 | 500 | 상태 칩·버튼·필드 라벨 |
| 캡션 (caption) | `--tr-text-caption` | sans | 12px / 1.4 | 400 | 메타 정보(생성 시각 등) |
| 시각 표기 (time) | `--tr-text-time` | mono | 13px / 1.4 | 500 | `01:00–02:00` 시간 범위 (mono 로 자릿수 정렬) |

> 시각 표기에 mono 폰트를 쓰는 이유: `01:00–02:00` 같은 시간 문자열을 등폭으로 렌더해 목록·타임라인에서 세로 정렬이 흐트러지지 않게 한다.

---

## 4. 레이아웃

### 4.1 페이지 골격 (세로 스택, 단일 스크롤)

```
┌─────────────────────────────────────────────────────────┐
│  App Header       팀 회의실 예약 · 승인                    │  ← h1 + 부제
├─────────────────────────────────────────────────────────┤
│  Filter Bar   [◀ 2026-07-20 ▶]   자원: [전체 ▾]  [+ 예약]  │  ← 날짜/자원 필터
├─────────────────────────────────────────────────────────┤
│  §A 예약 목록 (Reservation List)                           │
│     ┌───────────────────────────────────────────────┐    │
│     │ 예약 카드 (pending)   [승인] [반려]              │    │
│     ├───────────────────────────────────────────────┤    │
│     │ 예약 카드 (approved)                            │    │
│     ├───────────────────────────────────────────────┤    │
│     │ 예약 카드 (rejected)   반려 사유: …             │    │
│     └───────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  §B 일간 타임라인 (Daily Timeline)                         │
│     자원↓ / 시각→   09  10  11  12  13  14  15  16  17     │
│     1층 대회의실    ░░[■승인]░░░░░░░░░░░░░░░░░░░░░░░       │
│     2층 소회의실A   ░░░░░░░░░░░░░[▨대기]░░░░░░░░░░░       │
│     2층 소회의실B   ░░░░░░░░░░░░░[■승인]░░░░░░░░░░░       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 컨테이너 / spacing

| 항목 | 값 |
|------|-----|
| 최대 콘텐츠 폭 | `1040px` (중앙 정렬, 좌우 `--tr-space-5`=24px 패딩) |
| spacing scale | `--tr-space-1:4px` `--tr-space-2:8px` `--tr-space-3:12px` `--tr-space-4:16px` `--tr-space-5:24px` `--tr-space-6:32px` `--tr-space-7:48px` |
| radius | `--tr-radius-sm:4px` `--tr-radius-md:8px` `--tr-radius-lg:12px` `--tr-radius-pill:999px` |
| 카드 그림자 | `--tr-shadow-card: 0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)` |
| 섹션 간 간격 | `--tr-space-7` (48px) |
| 카드 내부 패딩 | `--tr-space-4`~`--tr-space-5` (16~24px) |

### 4.3 반응형 breakpoint

| breakpoint | 조건 | 동작 |
|------------|------|------|
| Desktop | `≥ 900px` | 예약 목록은 2열 카드 그리드, 타임라인은 전체 시간 축(09–18시) 가로 표시 |
| Tablet | `600px ~ 899px` | 예약 목록 1열, 타임라인 가로 스크롤(`overflow-x:auto`) 유지 |
| Mobile | `< 600px` | 예약 목록 1열(카드 내부 요소 세로 스택), 필터 바 요소 줄바꿈, 타임라인은 가로 스크롤 + 자원명 라벨 sticky 좌측 고정 |

- 타임라인은 좁은 화면에서 셀 폭을 압축하지 않고 **가로 스크롤**로 처리한다(시각 축 가독성 우선). 자원명 열은 `position: sticky; left: 0` 로 고정.
- 승인/반려 버튼은 mobile 에서 카드 하단 full-width 2분할로 재배치(터치 타깃 ≥ 44px).

---

## 5. 컴포넌트 명세

각 컴포넌트는 developer 구현과 DOM 계약을 공유한다. **`data-status` 속성값은 planner §13 위임 요소의 고정 요구(`pending|approved|rejected`)와 정확히 일치**해야 한다.

### 5.1 상태 칩 (Status Chip)

예약의 현재 상태를 표시하는 인라인 칩. **§6 3중 신호**의 시각적 구현체.

| 속성 | 값 |
|------|-----|
| 마크업 | `<span class="tr-chip" data-status="approved" role="status">` |
| 구성 | `[아이콘 glyph] + [텍스트 라벨]` (예: `✓ 승인`) |
| 배경 | 해당 상태 `*-tint` |
| 전경(글자·아이콘) | 해당 상태 전경색 |
| 보더 | `1px solid` 전경색 `@ 40% alpha` |
| radius | `--tr-radius-pill` |
| padding | `2px 10px` |
| font | `--tr-text-label` (13px/500) |
| 아이콘 | 순수 유니코드 glyph (§6.2) — 외부 아이콘 폰트/SVG 에셋 없음 |

상태값 → 표현 (§6.1 표와 동일):

| `data-status` | 아이콘 | 라벨 | 전경 / 틴트 |
|---------------|--------|------|-------------|
| `pending` | `⏳` (또는 `◔`) | 대기 | pending / pending-tint |
| `approved` | `✓` | 승인 | approved / approved-tint |
| `rejected` | `✕` | 반려 | rejected / rejected-tint |

### 5.2 예약 카드 (Reservation Card)

예약 목록의 기본 단위.

```
┌─ .tr-card [data-status] ──────────────────────────┐
│  1층 대회의실                       ⏳ 대기          │  ← h3 자원명 + 상태 칩(우상단)
│  🕐 01:00–02:00                                     │  ← time(mono) + 아이콘
│  신청자 · 이서준                                     │  ← body meta
│  ───────────────────────────────────────────────  │
│  [ ✓ 승인 ]  [ ✕ 반려 ]                             │  ← pending 일 때만 노출(§5.4)
└────────────────────────────────────────────────────┘
```

| 요소 | 명세 |
|------|------|
| 루트 | `<article class="tr-card" data-status="…" data-reservation-id="rsv-02">` |
| 좌측 보더 강조 | `border-left: 4px solid` 해당 상태 전경색 (색상 신호 보강, 단독 신호 아님) |
| 자원명 | h3, `data-resource-id` 참조로 planner seed 의 `resource.name` 매핑 |
| 시간 범위 | `<time class="tr-time">01:00–02:00</time>` mono, 앞에 시계 아이콘 `🕐` |
| 신청자 | `신청자 · {requesterName}` body |
| 상태 칩 | §5.1, 카드 우상단 정렬 |
| 액션 영역 | §5.4 (pending 전용) |
| 반려 사유 | `data-status="rejected"` 일 때 하단에 `반려 사유 · {reason}` 표시 (planner §2.2 `reason`) |

- 카드 hover: `box-shadow` 를 `--tr-shadow-card-hover` 로 상승 + border-strong. (정적 mockup 은 `:hover` CSS 로 직접 표현 + 별도 상태 섹션에 hover 스냅샷 병기)

### 5.3 필터 바 (Filter Bar)

| 요소 | 명세 |
|------|------|
| 날짜 네비게이터 | `[◀] 2026-07-20 [▶]` — 이전/다음 날 버튼 + 현재 날짜(mono). 클릭 시 해당 날짜 예약/타임라인 필터 |
| 자원 선택 | `<select class="tr-select">` — `전체` / 자원별. seed 3자원 + "전체" 옵션 |
| 신규 예약 버튼 | `[+ 예약]` accent primary 버튼 (planner §6.4 `createReservation` 진입점). **본 task 는 진입점 버튼 배치만 정의**, 생성 폼 상세는 §10 비범위 flag |

### 5.4 결정 액션 (Decision Actions) — pending 전용

**planner §5.2 고정 요구: `pending` 상태에서만 노출.** `approved`/`rejected` 카드에는 이 영역이 렌더되지 않는다.

| 버튼 | 클래스 | 스타일 | 아이콘+라벨 | 동작 매핑 |
|------|--------|--------|-------------|-----------|
| 승인 | `.tr-btn.tr-btn--approve` | solid, bg=`--tr-status-approved`, 글자 흰색 | `✓ 승인` | `decideReservation(…, 'approve', …)` |
| 반려 | `.tr-btn.tr-btn--reject` | outline, 보더/글자=`--tr-status-rejected` | `✕ 반려` | `decideReservation(…, 'reject', …)` |

- 반려 클릭 시 반려 사유 입력(짧은 인라인 입력 또는 prompt)이 필요하나(planner §5.2 `reason`), **입력 UX 상세는 §10 비범위 flag** — 본 명세는 반려 버튼과 사유 표시 위치만 확정한다.
- 승인 시도가 CONFLICT 로 실패하면 §5.5 충돌 배너를 카드 내부 상단에 인라인 표시한다.
- 버튼 최소 크기: 높이 36px(desktop) / 44px(mobile), 좌우 padding `--tr-space-4`.

### 5.5 충돌 경고 배너 (Conflict Alert) — CONFLICT 전용

planner §5.2 #1 / AC-04: 승인 시도가 `{ ok:false, code:'CONFLICT' }` 로 실패했을 때 표시.

| 속성 | 값 |
|------|-----|
| 마크업 | `<div class="tr-alert" data-kind="conflict" role="alert">` |
| 배경 / 보더 / 글자 | `--tr-color-conflict-tint` / `--tr-color-conflict` / `--tr-color-conflict` |
| 아이콘 + 문구 | `⚠ 이미 승인된 예약과 시간이 겹쳐 승인할 수 없습니다.` (planner §13: "충돌로 승인 불가" 의미 전달 필수) |
| 위치 | 해당 pending 카드 내부, 액션 영역 위 |
| 부가 정보 | 충돌 상대 예약 시간대를 함께 표기(예: `충돌: 01:00–02:00 승인 건`) |

### 5.6 타임라인 그리드 (Daily Timeline)

특정 날짜의 자원별 시간 점유를 2차원 그리드로 표시.

| 요소 | 명세 |
|------|------|
| 루트 | `<div class="tr-timeline" role="table" aria-label="일간 타임라인">` |
| 행(row) | 자원 1개 = 1행. 좌측 sticky 라벨(자원명) + 우측 시간 트랙 |
| 시간 축 | 09:00–18:00, 1시간 단위 컬럼(정적 mockup 기준). 상단 헤더에 시각 눈금 |
| 예약 블록 | `<div class="tr-block" data-status="approved" style="--start:…; --span:…">` — 시작 시각·길이에 비례해 배치(CSS 변수로 grid-column 계산) |
| 블록 표현 | 배경=상태 틴트, 좌측 보더=전경색, 내부에 `[아이콘 라벨] {신청자}` 축약 표기. **패턴 오버레이로 상태 추가 구분**(§6.3) |
| 겹침 표시 | 동일 자원·겹치는 시간대의 pending 블록은 approved 블록 아래 반투명 레인(sub-row)으로 겹쳐 그려, 승인 시 충돌 소지를 시각화 |
| 빈 셀 | `--tr-color-surface-muted` 격자, 1px 보더 |

- 타임라인 블록은 색상만으로 상태를 구분하지 않도록 **아이콘+텍스트 축약 라벨**을 블록 내부에 넣고, 좁아서 텍스트가 안 들어가면 `title`/`aria-label` 로 보강 + §6.3 패턴을 병행한다.

---

## 6. 상태 신호 체계 — 색상+텍스트+아이콘 병행

> **본 task 의 핵심 수용 기준**: 상태 색상에만 의존하지 않고 텍스트·아이콘 신호를 병행한다.

### 6.1 3중 신호 매핑 표 (단일 진실 소스)

| planner 상태 | ① 색상(hue) | ② 텍스트 라벨 | ③ 아이콘 glyph | 추가 신호 |
|--------------|-------------|----------------|-----------------|-----------|
| `pending` | amber `#B45309` | `대기` | `⏳` (fallback `◔`) | 카드 좌측 보더 amber, 타임라인 블록 **사선(diagonal) 패턴** |
| `approved` | green `#0F7B4F` | `승인` | `✓` | 카드 좌측 보더 green, 타임라인 블록 **solid(무늬 없음)** |
| `rejected` | slate `#475569` | `반려` | `✕` | 카드 좌측 보더 slate, 목록에서 카드 **60% opacity + 취소선 없는 dim 처리** |

### 6.2 아이콘 선택 원칙

- **순수 유니코드 glyph 만 사용** (`vanilla-static` 외부 에셋 0건 규약). `✓`(U+2713), `✕`(U+2715), `⏳`(U+23F3), `⚠`(U+26A0), `🕐`(U+1F550).
- 이모지 렌더가 흑백/컬러 OS 별로 달라도 의미가 전달되도록, 아이콘은 **항상 텍스트 라벨과 함께** 배치한다(아이콘 단독 사용 금지).
- 스크린리더 중복 낭독 방지: 장식용 아이콘은 `aria-hidden="true"`, 의미는 인접 텍스트 라벨 또는 칩의 `role="status"`/`aria-label` 로 전달.

### 6.3 색맹 안전성 검증 (color-blind safety)

색상 3종(amber/green/slate)은 적록색맹(deuteranopia/protanopia) 에서 amber↔green 이 유사하게 보일 수 있다. 따라서 색상은 **보조 신호**로만 취급하고 다음을 필수 병행한다:

1. **텍스트 라벨**(대기/승인/반려) — 항상 노출, 생략 금지.
2. **형태가 다른 아이콘**(모래시계/체크/엑스) — 색을 제거해도 구분되는 실루엣.
3. **타임라인 블록 패턴**: approved=solid, pending=사선 hachure, rejected=(목록에서만 dim, 타임라인에는 종료 상태 미표시). 패턴은 CSS `repeating-linear-gradient` 로 구현(에셋 0건).

> 검증 방법(reviewer/QA용): mockup 을 흑백(grayscale) 필터로 렌더해도 세 상태가 라벨+아이콘+패턴으로 구분되면 통과.

---

## 7. dev 구현 가이드

developer(BF-1006)가 따라할 단계별 지침. planner §6 순수 함수 계약과 본 명세의 DOM 계약을 잇는다.

### 7.1 CSS 변수 정의 (권장)

- `team-reservation-canary/style.css` 최상단 `:root` 에 §2·§3·§4.2 의 모든 `--tr-*` 변수를 선언한다. mockup HTML `<style>` 의 `:root` 블록을 그대로 복사해 출발점으로 사용해도 된다(픽셀 단위 일치 의무는 없음).
- **하드코딩 색상 금지 원칙**: 컴포넌트 CSS 에서는 HEX 리터럴 대신 `var(--tr-*)` 를 참조한다(`vanilla-static` 이지만 유지보수 일관성을 위해 권장).

### 7.2 클래스 / 속성 네이밍 (권장 → data-* 는 고정)

| 대상 | 권장 클래스 | 고정 속성(계약) |
|------|-------------|-----------------|
| 예약 카드 | `.tr-card` | `data-status="pending\|approved\|rejected"`, `data-reservation-id`, `data-resource-id` |
| 상태 칩 | `.tr-chip` | `data-status`, `role="status"` |
| 결정 버튼 | `.tr-btn--approve` / `.tr-btn--reject` | (버튼 자체엔 상태 없음, 부모 카드 status 로 노출 제어) |
| 충돌 배너 | `.tr-alert` | `data-kind="conflict"`, `role="alert"` |
| 타임라인 블록 | `.tr-block` | `data-status`, `--start`/`--span` CSS 변수 |

> `data-status` 값 3종은 planner §13 위임 요소 및 §2.2 `status` enum 과 **문자 그대로 일치**해야 한다. 클래스명은 권장이며 dev 재량으로 변경 가능하나, `data-*` 계약과 `role`/`aria-*` 는 접근성·테스트(BF-1010)를 위해 유지한다.

### 7.3 상태별 렌더 분기 (의사코드)

```javascript
// planner §6 순수 함수 결과 → DOM 렌더 (developer 구현)
function renderCard(rsv, resource) {
  const el = createEl('article', { class: 'tr-card', 'data-status': rsv.status,
                                   'data-reservation-id': rsv.id, 'data-resource-id': rsv.resourceId });
  el.append(statusChip(rsv.status));                 // §5.1 — 아이콘+라벨 3중 신호
  el.append(timeRange(rsv.startAt, rsv.endAt));      // <time> mono
  el.append(requester(rsv.requesterName));
  if (rsv.status === 'pending') {
    el.append(decisionActions(rsv));                 // §5.4 — pending 에서만
  }
  if (rsv.status === 'rejected' && rsv.reason) {
    el.append(rejectReason(rsv.reason));             // §5.2 반려 사유
  }
  return el;
}
```

### 7.4 승인/반려 액션 → 충돌 처리

```javascript
onApproveClick(rsv, allReservations, decidedAtISO) {
  const res = decideReservation(rsv, 'approve', allReservations, decidedAtISO); // planner §6.3
  if (!res.ok && res.code === 'CONFLICT') {
    showConflictAlert(cardEl, /* 겹치는 approved 예약들 */ findApprovedConflicts(rsv, allReservations)); // §5.5
    return; // 카드 status 는 pending 유지 (AC-04)
  }
  // ok → state 갱신 + saveReservationState + 재렌더
}
```

### 7.5 타임라인 배치 계산 (권장)

- 시각 축 시작 `AXIS_START = 09:00`, 컬럼 1개 = 1시간. 블록의 `--start = (startHour - 9)`, `--span = (endHour - startHour)` 로 CSS `grid-column: calc(var(--start)+2) / span var(--span)` 배치(1열은 자원명 라벨).
- 09:00 이전/18:00 이후 예약은 축 범위를 넘어가므로, mockup 은 축 범위를 seed(§3.2, UTC 01:00~08:00 = KST 10:00~17:00 가정) 이 들어오도록 **09–18시**로 잡는다. dev 는 실제 데이터 min/max 로 축을 동적 산출해도 무방(권장, 필수 아님).

---

## 8. 접근성 (a11y)

| 항목 | 요구 |
|------|------|
| 상태 전달 | 색상 단독 금지 — §6 3중 신호 필수(핵심 AC) |
| 대비 | 본문/전경 텍스트 모두 AA(4.5:1) 이상, §2 검증치 참조 |
| 포커스 | 모든 버튼/셀렉트/날짜 네비 버튼에 `:focus-visible` 아웃라인(`--tr-color-focus-ring` 2px) |
| 키보드 | 승인/반려/필터/날짜 이동 전부 Tab 순회 + Enter/Space 조작 가능 |
| 시맨틱 | 상태 칩 `role="status"`, 충돌 배너 `role="alert"`, 타임라인 `role="table"` + 자원행 `role="row"` |
| 아이콘 | 장식 아이콘 `aria-hidden="true"`, 의미는 텍스트로 |
| 터치 타깃 | mobile 버튼 ≥ 44×44px |

---

## 9. mockup 참조

- 파일: [`docs/design/mockups/reservation-timeline-BF-1004.html`](./mockups/reservation-timeline-BF-1004.html)
- 단일 self-contained HTML(외부 의존성 0건). `file://` 로 직접 열어 렌더 확인 가능(AC-02).
- 포함 섹션: 앱 헤더 → 필터 바 → 예약 목록(pending/approved/rejected 카드 각 1개 이상 + hover 상태 스냅샷) → 충돌 배너 예시 → 일간 타임라인 그리드 → 색맹 안전성(grayscale) 비교 섹션.
- placeholder 콘텐츠는 planner §3.2 seed(자원 3건·예약 5건)를 그대로 반영해 dev·QA 가 실제 데이터와 대조 가능하게 함.
- **주의**: 이 mockup 은 시안 시각화용이며 dev 의 실제 산출물이 아니다. dev 는 참조 가이드로만 사용하고 픽셀 단위 일치 의무는 없다.

---

## 10. AC 매핑 & 비범위

### 10.1 수용 기준(AC) 매핑

| task AC | 충족 근거 |
|---------|-----------|
| AC-1: 예약 목록/타임라인 레이아웃·상태별 색상+텍스트+아이콘 토큰 정의 | §2(색상), §3(타이포), §4(레이아웃), §5(컴포넌트), §6(3중 신호 매핑 표) |
| AC-2: mockup 을 `file://` 로 열면 외부 의존성 없이 정상 렌더 | §9 + mockup HTML(외부 link/script 0건, system font, `:root` 자체 정의) |
| 기존 페이지 디자인 일관성 | §1.3 참조 관례 계승(중립 회색 + accent blue + 시맨틱 3색 + 4px scale + system font) |

### 10.2 비범위 (Out of Scope) & 모호함 flag

developer/planner 확인이 필요하거나 본 task 에서 확정하지 않는 항목:

| 항목 | 상태 | 처리 |
|------|------|------|
| 신규 예약 생성 폼(필드·검증 UX) 상세 | ⚠️ flag | §5.3 은 진입점 버튼만 정의. 폼 상세는 별도 스토리 또는 dev 재량. planner §6.4 계약 준수 전제 |
| 반려 사유 입력 인터랙션(인라인 입력 vs 모달 vs prompt) | ⚠️ flag | §5.4 는 반려 버튼·사유 표시 위치만 확정. 입력 방식은 dev 재량(planner §5.2 `reason` 계약 준수) |
| 타임라인 시각 축 범위 동적 산출 | 권장(필수 아님) | §7.5 — mockup 은 09–18시 고정, dev 는 데이터 기반 동적 산출 허용 |
| 취소/재신청, 자원 CRUD, 반복 예약, 알림 | 제외 | planner §12 비범위 계승 |

---

## Self-critique

PR commit 직전 5개 항목 자기 점검:

1. **AC 매핑** ✅ — task AC 2건(레이아웃·상태 토큰 / `file://` 렌더) + Epic "색상 미의존 텍스트·아이콘 병행" 요구를 §10.1 표로 명시 매핑. 각 AC 가 어느 섹션에서 충족되는지 추적 가능.
2. **dev 구현 가이드** ✅ — §7 에 CSS 변수 선언 위치, `data-*` 계약, 상태별 렌더 분기 의사코드, 충돌 처리 흐름, 타임라인 배치 계산까지 단계별로 제공. planner §6 순수 함수와 DOM 을 잇는 매핑 명시.
3. **기존 요소 보존** ✅ — 신규 모듈이라 파괴할 기존 UI 는 없음. 대신 §1.3 에서 리포 공통 디자인 언어(토큰 관례·spacing·font)를 계승해 이질감 없도록 함. 소유 경로 `docs/design/**` 만 수정, 코드 미구현.
4. **컴포넌트 매핑** ✅ — planner §13 위임 요소(`data-status` enum, pending 전용 버튼, CONFLICT 안내)를 §5.1/§5.4/§5.5 컴포넌트로 1:1 매핑. planner §2.2 스키마 필드(reason/startAt/endAt/requesterName)가 모두 UI 요소로 대응됨.
5. **모호함 flag** ✅ — §10.2 에서 신규 예약 생성 폼 상세·반려 사유 입력 인터랙션 2건을 ⚠️ flag 로 명시(본 task 미확정, dev 재량 또는 별도 스토리). 확정한 것과 위임한 것의 경계를 dev 가 오해하지 않도록 분리.

---

*문서 종료 — [이디자인] · BF-1004*
