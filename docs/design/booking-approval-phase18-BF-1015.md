# 팀 예약 승인 화면 디자인 명세 — BF-1015 (booking-approval-phase18)

> 작성자: [이디자인] · 작성일 2026-07-18
> 관련 티켓: BF-1015 (designer task)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> 기획 근거: `docs/plan/booking-approval-phase18-BF-1014.md` ([박기획])
> 선례 참고: `docs/design/reservation-timeline-BF-1004.md` (동일 도메인 이전 모듈 — 중립 회색 팔레트·상태 3색·spacing scale 계승)
> 형제 task: BF-1016(developer) · BF-1020(tester)
> mockup 참조: `docs/design/mockup/booking-approval-phase18/booking-approval-phase18-BF-1015.html`

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [Self-critique](#8-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

기획 명세(BF-1014) §9 화면 정보구조를 시각화한다. 단일 화면(`index.html`) 안에 다음 5개 영역의 레이아웃·상태 스타일을 정의한다.

1. **헤더** — 페이지 타이틀 + 짧은 설명
2. **필터 바** — 자원 필터 / 상태 필터
3. **신규 예약 요청 폼** — 자원·신청자명·시작/종료 시각 입력 + 제출 + 검증 에러
4. **충돌 안내 배너** — 승인 시도 시 `CONFLICT` 발생하면 표시(평소 숨김)
5. **예약 목록** — 예약 카드(상태 배지 + 승인/반려 액션 + 반려 사유)

### 1.2 사용자 경험 목표

- **상태 3색의 즉각 구분**: `requested`(대기) / `approved`(승인) / `rejected`(반려)를 색상·아이콘·라벨 3중 신호로 구분해, 승인자가 목록을 훑는 것만으로 처리 대상을 골라낼 수 있게 한다.
- **결정 액션의 명확성**: 승인/반려 버튼은 `requested` 상태 카드에서만 노출한다(기획 §9.2 IA-02 고정 요구). 종료 상태(`approved`/`rejected`) 카드는 조작 UI 없이 결과만 표시한다.
- **충돌의 강한 시각 경고**: 이미 승인된 예약과 겹치는 요청을 승인하려 하면(`CONFLICT`), 반려의 중립색과 명확히 구별되는 **빨강** 경고 배너로 "승인 불가" 의미를 전달한다(기획 §9.2 IA-03).
- **일관성**: 선례 모듈(`reservation-timeline-BF-1004`)의 중립 회색 서피스·accent blue·상태 3색 관례를 계승해, 같은 Epic 안에서 화면 간 이질감을 없앤다.

### 1.3 기존 페이지와의 관계

- 본 모듈은 완전 독립 정적 화면이다(기획 §1.2). 전역 스타일·공용 CSS 파일을 **변경하지 않는다**.
- 색상·spacing·radius 등 "공용 토큰"은 선례 모듈이 확립한 값을 **본 mockup의 `:root` 안에서 재선언**하는 방식으로 참조한다(vanilla-static 규약: 디자인 토큰 파일 없이 CSS 변수 자체 정의). 전역 파일에 토큰을 추가하지 않으므로 다른 페이지에 영향이 없다.

---

## 2. 컬러 팔레트

모든 색상은 mockup HTML `:root` 에 CSS 변수로 정의한다. `vanilla-static` 규약에 따라 디자인 토큰 파일 없이 mockup·구현 CSS 안에서 직접 선언한다. 접두사는 본 모듈 전용 `--bk-` 를 사용한다(선례의 `--tr-` 와 값은 일치, 접두사만 모듈에 맞춤).

### 2.1 기본(Base) 팔레트

| 역할 | 변수 | HEX | 용도 |
|------|------|-----|------|
| 배경 | `--bk-color-bg` | `#F1F3F5` | 페이지 캔버스 |
| 서피스 | `--bk-color-surface` | `#FFFFFF` | 카드/패널 배경 |
| 서피스(약) | `--bk-color-surface-muted` | `#F8F9FA` | 폼/필터 바 배경, 입력 필드 |
| 보더 | `--bk-color-border` | `#DDE1E6` | 카드/필드 구분선 |
| 보더(강) | `--bk-color-border-strong` | `#B9C0C8` | 포커스 인접/강조 구분 |
| 본문 텍스트 | `--bk-color-text` | `#1A1D21` | 제목/본문 |
| 보조 텍스트 | `--bk-color-text-muted` | `#5F6B76` | 캡션/메타(신청자·시각) |
| accent | `--bk-color-accent` | `#3563E9` | 주요 버튼(제출)·링크·선택 상태 |
| accent hover | `--bk-color-accent-hover` | `#2A50C4` | accent hover/active |
| accent(약) | `--bk-color-accent-tint` | `#EEF3FF` | 필터 선택 pill 배경 |

> 대비 검증: `--bk-color-text`(#1A1D21) on `--bk-color-surface`(#FFFFFF) = 15.8:1 (AAA). `--bk-color-text-muted`(#5F6B76) on #FFFFFF = 5.0:1 (AA, 14px+ 본문). accent #3563E9 on #FFFFFF = 5.2:1 (AA).

### 2.2 상태(Status) 팔레트 — `requested` / `approved` / `rejected`

기획 §3.2 `status` enum(3종)에 1:1 대응한다. 각 상태는 **전경색 + 틴트(배경) 쌍**으로 정의한다.

| status | 라벨 | 전경 변수 | 전경 HEX | 틴트 변수 | 틴트 HEX | 계열 |
|--------|------|-----------|----------|-----------|----------|------|
| `requested` | 대기 | `--bk-status-requested` | `#B45309` | `--bk-status-requested-tint` | `#FFF7ED` | amber |
| `approved` | 승인 | `--bk-status-approved` | `#0F7B4F` | `--bk-status-approved-tint` | `#ECFDF5` | green |
| `rejected` | 반려 | `--bk-status-rejected` | `#475569` | `--bk-status-rejected-tint` | `#F1F5F9` | slate |

> **설계 의도** — `rejected` 를 흔한 빨강 대신 **slate(회청)** 로 둔다. 빨강은 §2.3 의 **충돌(CONFLICT) 경고 전용**으로 분리해, "이미 반려된 과거 결정(rejected)"과 "지금 승인하면 터지는 실시간 경고(conflict)"를 색으로도 구분한다. 반려는 이미 종료된 중립적 결과이므로 채도 낮은 slate 가 적절하다. 이는 선례 모듈 BF-1004 와 동일한 판단이다.

> 대비 검증(전경 on 틴트): requested #B45309 on #FFF7ED = 6.4:1 (AA). approved #0F7B4F on #ECFDF5 = 5.6:1 (AA). rejected #475569 on #F1F5F9 = 7.4:1 (AAA). 전경색 on #FFFFFF 도 모두 4.5:1 이상.

### 2.3 피드백(Feedback) 팔레트

| 역할 | 변수 | HEX | 용도 |
|------|------|-----|------|
| 충돌 경고 | `--bk-color-conflict` | `#B91C1C` | `CONFLICT` 반환 시 배너 보더/텍스트/좌측 accent (§5.4) |
| 충돌 틴트 | `--bk-color-conflict-tint` | `#FEF2F2` | 충돌 배너 배경 |
| 폼 에러 | `--bk-color-error` | `#B91C1C` | 신규 예약 폼 검증 에러 텍스트(§5.2, 충돌색과 동일 계열) |
| 정보 | `--bk-color-info` | `#1D4ED8` | "임시 세션(저장 안 됨)" 안내 등(기획 §8.3) |

> 충돌/에러 텍스트 #B91C1C on 틴트 #FEF2F2 = 6.5:1 (AA), on #FFFFFF = 6.9:1 (AA). "빨강"은 오직 실시간 경고(충돌·검증 실패)에만 쓰여, 색만으로도 "지금 조치가 필요한 것"을 가려낸다.

### 2.4 색맹 안전성

상태·경고는 **색 단독으로 의미를 전달하지 않는다**. 모든 상태 배지는 `아이콘 + 텍스트 라벨`을 함께 노출하고(§5.3), 충돌 배너는 `⚠` 아이콘 + 문구를 함께 쓴다. grayscale 로 변환해도 배지 라벨·아이콘·좌측 보더 위치로 상태를 구별할 수 있다(mockup 하단 색맹 안전성 비교 섹션에서 시연).

---

## 3. 타이포그래피

`vanilla-static` 규약에 따라 **system font stack** 만 사용한다(외부 폰트 CDN 금지).

```
--bk-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
--bk-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | 요소 | font-size | weight | line-height | 비고 |
|------|------|-----------|--------|-------------|------|
| 페이지 타이틀 | `h1` | 24px (1.5rem) | 700 | 1.3 | 헤더 |
| 헤더 설명 | `p.bk-subtitle` | 14px | 400 | 1.5 | `--bk-color-text-muted` |
| 섹션 제목 | `h2` | 16px | 600 | 1.4 | 필터/폼/목록 영역 라벨 |
| 카드 자원명 | `.bk-card__resource` | 16px | 600 | 1.4 | 예약 카드 주 제목 |
| 카드 메타 | `.bk-card__meta` | 14px | 400 | 1.5 | 신청자·시각, `--bk-color-text-muted` |
| 시각(시간 구간) | `.bk-card__time` | 14px | 500 | 1.5 | `--bk-font-mono` 로 자릿수 정렬 |
| 상태 배지 | `.bk-badge` | 12px | 600 | 1 | 대문자 아님, 아이콘+라벨 |
| 버튼 | `button` | 14px | 600 | 1 | 승인/반려/제출 |
| 폼 라벨 | `label` | 13px | 500 | 1.4 | 입력 상단 |
| 폼 에러/충돌 문구 | `.bk-form-error` / `.bk-banner__text` | 13px | 500 | 1.5 | 경고색 |
| 반려 사유 | `.bk-card__reason` | 13px | 400 | 1.5 | `--bk-color-text-muted`, 라벨 "반려 사유 ·" 굵게 |

- 기본 body font-size 는 16px, 최소 사용 크기는 12px(배지) — 12px 는 굵기 600 으로 가독성 보정.
- 시각 값(`02:00 ~ 03:00`)은 mono font 로 자릿수를 세로 정렬해 목록 스캔성을 높인다.

---

## 4. 레이아웃

### 4.1 전체 구조

세로 1-column 스택. 최대 폭 `--bk-container-max: 840px`, 좌우 중앙 정렬, 페이지 좌우 패딩 `--bk-space-6(24px)`.

```
┌───────────────────────────────────────────────┐
│ 헤더 (h1 + subtitle)                            │
├───────────────────────────────────────────────┤
│ 필터 바 [data-testid="filter-bar"]              │
│  [자원 필터 select]  [상태 필터 select]          │
├───────────────────────────────────────────────┤
│ 신규 예약 요청 폼 [data-testid="booking-form"]   │
│  ┌ 2-col grid (모바일 1-col) ────────────────┐  │
│  │ [자원 select]      [신청자명 input]        │  │
│  │ [시작 시각 input]  [종료 시각 input]        │  │
│  └────────────────────────────────────────┘  │
│  [폼 에러 영역]                  [예약 요청 ▸] │
├───────────────────────────────────────────────┤
│ 충돌 안내 배너 [data-testid="conflict-banner"]  │
│  (평소 hidden — 승인 CONFLICT 시 노출)          │
├───────────────────────────────────────────────┤
│ 예약 목록 [data-testid="booking-list"]          │
│  ┌ 카드 (requested) ── 승인/반려 버튼 노출 ──┐  │
│  ┌ 카드 (approved)  ── 액션 없음 ───────────┐  │
│  ┌ 카드 (rejected)  ── 반려 사유 표시 ──────┐  │
└───────────────────────────────────────────────┘
```

### 4.2 spacing scale

선례 관례 4·8·12·16·24·32·48 을 계승한다.

```
--bk-space-1: 4px;  --bk-space-2: 8px;   --bk-space-3: 12px;
--bk-space-4: 16px; --bk-space-6: 24px;  --bk-space-8: 32px;  --bk-space-12: 48px;
```

- 영역 간 세로 간격: `--bk-space-6(24px)`
- 카드 내부 패딩: `--bk-space-4(16px)`
- 카드 사이 간격: `--bk-space-3(12px)`
- radius: `--bk-radius-sm: 6px`(배지/버튼/입력), `--bk-radius-md: 10px`(카드/패널)
- 그림자: `--bk-shadow-sm: 0 1px 2px rgba(16,24,40,.06)`(카드), 패널은 보더만 사용

### 4.3 예약 카드 내부 레이아웃

```
┌─ .bk-card [data-status][data-booking-id] ─────────────┐
│ (좌측 3px status 컬러 보더)                             │
│  ┌ 상단 행 (flex, space-between) ───────────────────┐ │
│  │ 자원명 · 상태 배지            시각(mono)           │ │
│  └──────────────────────────────────────────────┘ │
│  신청자 · 메타                                         │
│  ┌ (status==='requested' 일 때만) 액션 행 ──────────┐ │
│  │            [✕ 반려]  [✓ 승인]                     │ │
│  └──────────────────────────────────────────────┘ │
│  ┌ (status==='rejected' 일 때만) ─────────────────┐ │
│  │ 반려 사유 · {reason}                              │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

- 카드 좌측 3px 세로 보더는 `data-status` 색(requested=amber / approved=green / rejected=slate)으로 상태를 카드 밖에서도 인지하게 한다.
- `rejected` 카드는 본문 opacity 0.72 로 dim 처리해 "종료된 과거 건"임을 밀도로 표현한다(취소선은 쓰지 않음 — 사유 텍스트 가독성 유지).

### 4.4 반응형 breakpoint

| breakpoint | 동작 |
|------------|------|
| `≥ 720px` (desktop/tablet) | 폼 2-col grid, 필터 바 가로 배치, 카드 상단 행 자원명↔시각 좌우 정렬 |
| `< 720px` (mobile) | 폼 1-col 세로 스택, 필터 바 세로 스택, 카드 시각이 자원명 아래로 내려감, 액션 버튼 full-width 2분할 |

- 미디어 쿼리 1개(`@media (max-width: 719px)`)만 사용. 버튼 최소 터치 타깃 44px 확보(모바일).

---

## 5. 컴포넌트 명세

각 컴포넌트는 developer(BF-1016) 구현과 **DOM 계약(`data-*`)을 공유**한다. 기획 §9.1/§15 의 `data-testid`/`data-field`/`data-status`/`data-booking-id` 는 **문자 그대로 유지**해야 한다(클래스명은 권장, dev 재량 변경 가능).

### 5.1 필터 바 (`filter-bar`)

| 항목 | 명세 |
|------|------|
| 마크업 | `<section class="bk-filters" data-testid="filter-bar">` |
| 자원 필터 | `<select data-field="filter-resource">` — 옵션: `전체` + 자원 3건(3층 세미나실 / 4층 소회의실 A / 4층 소회의실 B) |
| 상태 필터 | `<select data-field="filter-status">` — 옵션: `전체` / `대기(requested)` / `승인(approved)` / `반려(rejected)` |
| props(개념) | `resources: Resource[]`, `selectedResourceId: string\|'all'`, `selectedStatus: string\|'all'` |
| 상태 | 기본값 둘 다 `전체`. 선택 시 accent 보더로 활성 표시 |
| 인터랙션 | change 시 목록 표시 항목만 필터(기획 §9.2 IA-05 — state 불변, 순수 뷰 필터) |
| 스타일 | `--bk-color-surface-muted` 배경 패널, select 는 `--bk-radius-sm` + 보더 |

### 5.2 신규 예약 요청 폼 (`booking-form`)

| 항목 | 명세 |
|------|------|
| 마크업 | `<form class="bk-form" data-testid="booking-form">` |
| 자원 선택 | `<select data-field="resourceId">` — 자원 3건 |
| 신청자명 | `<input type="text" data-field="requesterName">` (placeholder `"예: 오세훈"`) |
| 시작 시각 | `<input type="datetime-local" data-field="startAt">` |
| 종료 시각 | `<input type="datetime-local" data-field="endAt">` |
| 제출 버튼 | `<button type="submit" data-testid="submit-booking">` — accent solid, 라벨 `예약 요청` |
| 검증 에러 | `<p class="bk-form-error" data-testid="form-error" role="alert">` — 평소 빈/hidden, 검증 실패 시 문구 표시 |
| props(개념) | `resources: Resource[]`, `values: {resourceId, requesterName, startAt, endAt}`, `error: string\|null` |
| 인터랙션 | 제출 시 `createBooking` 호출(기획 §7.4). 필드 누락·`startAt >= endAt` 시 `form-error` 에 메시지 표시, 목록 미추가(기획 §9.2 IA-01) |
| 에러 문구 예시 | `"시작 시각은 종료 시각보다 앞서야 합니다."` / `"신청자명을 입력하세요."` |
| 레이아웃 | 입력 2×2 grid(≥720px), 하단 행에 좌측 에러 · 우측 제출 버튼 |

### 5.3 상태 배지 (`bk-badge`)

| 항목 | 명세 |
|------|------|
| 마크업 | `<span class="bk-badge" data-status="requested" role="status">` |
| 신호 3중 | 틴트 배경 + 전경 텍스트 색 + 아이콘 + 라벨(색 단독 의존 금지) |

| `data-status` | 아이콘 | 라벨 | 전경 / 틴트 |
|---------------|--------|------|-------------|
| `requested` | `⏳` (fallback `◔`) | 대기 | requested / requested-tint |
| `approved` | `✓` | 승인 | approved / approved-tint |
| `rejected` | `✕` | 반려 | rejected / rejected-tint |

- 아이콘은 `aria-hidden="true"`, 의미는 라벨 텍스트 + 칩 `role="status"` 로 전달(스크린리더 중복 낭독 방지).

### 5.4 충돌 안내 배너 (`conflict-banner`)

| 항목 | 명세 |
|------|------|
| 마크업 | `<div class="bk-banner" data-testid="conflict-banner" role="alert" hidden>` |
| 표시 조건 | 승인 버튼 클릭 → `decideBooking(...,'approve',...)` 결과가 `{ ok:false, code:'CONFLICT' }` 일 때만 노출(기획 §9.2 IA-03) |
| 구성 | 좌측 `⚠` 아이콘 + 문구 + (선택) 충돌 대상 예약 요약 |
| 문구 예시 | `"이미 승인된 예약과 시간이 겹쳐 승인할 수 없습니다."` — "충돌로 승인 불가" 의미 전달 필수(기획 §15) |
| 스타일 | `--bk-color-conflict-tint` 배경, 좌측 4px `--bk-color-conflict` accent 보더, 텍스트 `--bk-color-conflict` |
| 동작 | 배너 노출 시 대상 카드 `data-status` 는 `requested` 유지(전이 실패, 기획 §6.2 #1). 닫기(×) 버튼 또는 다음 액션 시 숨김 |

### 5.5 예약 카드 (`booking-item`)

| 항목 | 명세 |
|------|------|
| 루트 | `<article class="bk-card" data-testid="booking-item" data-booking-id="bkg-01" data-status="approved">` |
| 자원명 | `.bk-card__resource` — 자원 표시명(예: `3층 세미나실`) |
| 시각 | `.bk-card__time` — `07/25 02:00 ~ 03:00` (mono, 반열린 구간 `~` 표기) |
| 신청자·메타 | `.bk-card__meta` — `신청 · {requesterName}` |
| 상태 배지 | §5.3 `.bk-badge` |
| 액션 영역 | `data-status="requested"` 일 때만 렌더 — `✕ 반려`(outline) + `✓ 승인`(solid green) |
| 반려 사유 | `data-status="rejected"` 일 때만 `<p class="bk-card__reason" data-testid="reject-reason">반려 사유 · {reason}</p>` |
| props(개념) | `booking: Booking`(기획 §3.2 8필드), `resourceName: string` |

**액션 버튼 명세**

| 버튼 | 클래스(권장) | 스타일 | 라벨 | dev 바인딩 |
|------|-------------|--------|------|-----------|
| 승인 | `.bk-btn.bk-btn--approve` | solid, bg=`--bk-status-approved`, 글자 흰색 | `✓ 승인` | `decideBooking(b,'approve',all,now)` (기획 §7.3) |
| 반려 | `.bk-btn.bk-btn--reject` | outline, 보더/글자=`--bk-status-rejected` | `✕ 반려` | 사유 입력(prompt/inline) 후 `decideBooking(b,'reject',all,now,reason)` |

- **기획 §9.2 IA-02 고정 요구**: 승인/반려 버튼은 `requested` 상태에서만 노출. `approved`/`rejected` 카드에는 이 영역이 렌더되지 않는다.
- 반려는 사유 입력을 받는다(빈 문자열 허용, 기획 §6.2). mockup 은 정적이므로 반려 흐름은 시각으로만 표현(실제 입력 UI 는 dev 재량 — prompt 또는 인라인 확장).

### 5.6 인터랙션 상태(hover/focus/disabled)

| 대상 | 상태 | 스타일 |
|------|------|--------|
| 제출/승인 버튼 | hover | 배경 한 단계 진하게(accent→accent-hover, approved 8% darken), 커서 pointer |
| 반려 버튼 | hover | 보더/텍스트 유지 + `--bk-status-rejected-tint` 배경 채움 |
| 모든 버튼/입력 | focus-visible | 2px `--bk-color-accent` outline + 2px offset(키보드 접근성) |
| select/input | focus | 보더 `--bk-color-accent`, 얕은 accent glow |

- hover/active/focus 는 mockup 에 별도 "인터랙션 상태" 섹션으로 정적 스냅샷을 그려 dev 가 시각 참조하게 한다.

---

## 6. dev 구현 가이드

developer(BF-1016)가 `booking-approval-phase18/index.html` + `style.css` 를 만들 때 따라할 단계별 지침.

### 6.1 CSS 변수 부트스트랩

- `booking-approval-phase18/style.css` 최상단 `:root` 에 §2·§3·§4.2 의 모든 `--bk-*` 변수를 선언한다. mockup HTML `<style>` 의 `:root` 블록을 **그대로 복사해 출발점**으로 사용해도 된다(픽셀 단위 일치 의무 없음).
- 색상 하드코딩 금지 — 모든 색은 `--bk-*` 변수 경유.

### 6.2 DOM 계약(고정 — 변경 금지)

| 요소 | 권장 클래스 | 필수 `data-*` / 속성 |
|------|-------------|----------------------|
| 필터 바 | `.bk-filters` | `data-testid="filter-bar"` |
| 자원 필터 | — | `data-field="filter-resource"` |
| 상태 필터 | — | `data-field="filter-status"` |
| 예약 폼 | `.bk-form` | `data-testid="booking-form"` |
| 자원 선택 | — | `data-field="resourceId"` |
| 신청자명 | — | `data-field="requesterName"` |
| 시작/종료 | — | `data-field="startAt"` / `data-field="endAt"` |
| 제출 버튼 | `.bk-btn--submit` | `data-testid="submit-booking"` |
| 폼 에러 | `.bk-form-error` | `data-testid="form-error"`, `role="alert"` |
| 충돌 배너 | `.bk-banner` | `data-testid="conflict-banner"`, `role="alert"`, 기본 `hidden` |
| 목록 | `.bk-list` | `data-testid="booking-list"` |
| 예약 카드 | `.bk-card` | `data-testid="booking-item"`, `data-booking-id`, `data-status` |
| 상태 배지 | `.bk-badge` | `data-status`, `role="status"` |
| 승인/반려 | `.bk-btn--approve` / `.bk-btn--reject` | (버튼 자체엔 상태 없음 — 부모 카드 status 로 노출 제어) |
| 반려 사유 | `.bk-card__reason` | `data-testid="reject-reason"` |

> `data-status` 값 3종(`requested`/`approved`/`rejected`)은 기획 §3.2 `status` enum 및 §15 위임 요소와 **문자 그대로 일치**해야 한다.

### 6.3 카드 렌더 로직(권장 흐름)

```
function renderCard(booking, resourceName) {
  const el = createEl('article', {
    class: 'bk-card',
    'data-testid': 'booking-item',
    'data-booking-id': booking.id,
    'data-status': booking.status,           // requested|approved|rejected
  });
  el.append(resourceTitle(resourceName), statusBadge(booking.status), meta(booking), timeRange(booking));
  if (booking.status === 'requested') {
    el.append(actionRow(booking));           // §5.5 — reject(outline) + approve(solid) — requested 전용
  }
  if (booking.status === 'rejected') {
    el.append(reasonLine(booking.reason));   // data-testid="reject-reason"
  }
  return el;
}
```

### 6.4 승인/충돌 흐름(권장)

```
onApproveClick(booking):
  const result = decideBooking(booking, 'approve', allBookings, injectedNow);   // 기획 §7.3
  if (result.ok === false && result.code === 'CONFLICT') {
    showConflictBanner();                    // data-testid="conflict-banner" hidden 해제
    return;                                  // 카드 status 는 requested 유지 (기획 AC-04)
  }
  // ok: true → state 갱신 후 saveBookingState + 재렌더
```

### 6.5 상태별 스타일 매핑 요약

| `data-status` | 배지 | 카드 좌측 보더 | 액션 버튼 | 추가 처리 |
|---------------|------|---------------|-----------|-----------|
| `requested` | amber `⏳ 대기` | amber 3px | 노출(반려/승인) | — |
| `approved` | green `✓ 승인` | green 3px | 미노출 | — |
| `rejected` | slate `✕ 반려` | slate 3px | 미노출 | 본문 opacity 0.72 + 반려 사유 표시 |

### 6.6 접근성 체크리스트

- 상태 배지 `role="status"`, 충돌 배너/폼 에러 `role="alert"`.
- 장식 아이콘 `aria-hidden="true"`, 의미는 인접 텍스트로 전달.
- 모든 인터랙티브 요소 `:focus-visible` 2px accent outline.
- 폼 입력마다 `<label for>` 연결. 시각 대비 본문 4.5:1 이상(§2 검증표).

---

## 7. mockup 참조

- **파일**: `docs/design/mockup/booking-approval-phase18/booking-approval-phase18-BF-1015.html`
- 단일 self-contained HTML(외부 link/script 0건, system font, `:root` 자체 정의) — `file://` 로 직접 열어 렌더 확인 가능.
- 포함 섹션(위→아래): 앱 헤더 → 필터 바 → 신규 예약 요청 폼(정상/에러 두 상태) → 충돌 배너 예시 → 예약 목록(seed 5건: requested/approved/rejected 각 상태 + 자원별) → 인터랙션 상태(hover/focus) 스냅샷 → 색맹 안전성(grayscale) 비교.
- 목록 카드는 기획 §4.2 seed 5건(`bkg-01`~`bkg-05`)을 그대로 반영해 dev 가 seed↔UI 를 대조할 수 있게 한다.

> 경로 주: 본 task 의 File Ownership 계약이 mockup 위치를 `docs/design/mockup/booking-approval-phase18/**` 로 지정하여 그 경로를 따랐다(페르소나 일반 규칙의 `docs/design/mockups/` 와 폴더 구조가 다름). system 의 screenshot capture 경로 검사가 이 위치를 커버하는지 운영자/worker 확인이 필요하면 조정 가능하다.

---

## 8. Self-critique

PR commit 직전 자기 점검(5항목).

1. **AC 매핑** ✅ — 기획 AC-01~05 를 시각 컴포넌트로 매핑: 상태 머신/충돌(AC-01·AC-04)→§5.4 충돌 배너 + §5.5 승인 Guard 흐름(§6.4), 데이터 모델(AC-02)→§5.5 카드가 Booking 8필드 전부(자원/신청자/시각/status/reason) 노출, 상태 기반 노출(AC-05)→§5.5/§6.5 requested 전용 액션 + rejected 사유 표시.
2. **dev 구현 가이드** ✅ — §6 에 CSS 변수 부트스트랩·DOM 계약 표·카드 렌더/승인 흐름 의사코드·상태별 스타일 매핑·접근성 체크리스트까지 단계별 제공. dev 가 클래스명/변수명 그대로 사용 가능.
3. **기존 요소 보존** ✅ — 전역 스타일/공용 CSS 미변경, `--bk-` 접두사로 모듈 스코프 격리. 선례 BF-1004 팔레트 값 계승으로 Epic 내 일관성 유지. File Ownership 범위(`docs/design/booking-approval-phase18-*.md`, `docs/design/mockup/booking-approval-phase18/**`) 밖 미변경.
4. **컴포넌트 매핑** ✅ — 기획 §9.1 의 모든 `data-testid`/`data-field`/`data-status`/`data-booking-id` 계약을 §5·§6.2 표에 1:1 반영. 상태 enum 3종(requested/approved/rejected)이 기획 §3.2 와 문자 일치. `pending` 오용 없음(기획이 `requested` 를 명시).
5. **모호함 flag** ⚠️ — (a) 반려 사유 입력 UI 방식(prompt vs 인라인)은 기획이 dev 재량으로 위임 → §5.5 에 "dev 재량" 명시. (b) mockup 경로가 File Ownership 계약과 페르소나 일반 규칙 간 폴더 구조가 달라 §7 에 flag(screenshot capture 커버 여부 운영자 확인 여지). (c) 시각 표기 포맷(`07/25 02:00 ~ 03:00`)은 UX 권장이며 로케일/포맷 세부는 dev 재량.

---

*문서 종료 — [이디자인] · BF-1015*
