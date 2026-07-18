# 예약 충돌 검사 UI 디자인 명세 — BF-1044 (booking-canary)

> 작성자: [이디자인] · 작성일 2026-07-18
> 관련 티켓: BF-1044 (designer task) — 문서 파일명은 Epic 그룹 키 `BF-1042` 컨벤션을 따름 (형제 task와 동일 경로 공유 목적)
> 기획 근거: `docs/plan/booking-canary-BF-1042.md` (BF-1043 [박기획]) — §9 화면 정보구조, §15 디자이너 위임 시각 요소
> tech-stack: `typescript-monorepo` — design-tokens SSOT 준수, hardcoded 색상 금지, shadcn/ui 컴포넌트 우선
> 대상 화면: `/demo/booking-canary` (검증 전용 데모)
> mockup: `docs/design/mockups/booking-canary/booking-canary-BF-1042.html`
> 형제 task: BF-1045(developer) · BF-1047(tester)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트 & 디자인 토큰 매핑](#2-컬러-팔레트--디자인-토큰-매핑)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 & 반응형](#4-레이아웃--반응형)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 UI (입력/가능/충돌/오류)](#6-상태별-ui-입력가능충돌오류)
7. [접근성 & 키보드 조작 명세](#7-접근성--키보드-조작-명세)
8. [dev 구현 가이드 (BF-1045)](#8-dev-구현-가이드-bf-1045)
9. [mockup 참조](#9-mockup-참조)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

기획 명세(§9)의 단일 화면 `/demo/booking-canary` 에 대한 시각 설계다. 화면은 세로 1열 흐름으로 **① 예약 검사 폼 → ② 결과 패널(가능/충돌) → ③ 대체 후보 목록(충돌 시)** 순서로 구성한다. 서버·저장소 없이 fixture 순수 함수 결과만 표시하므로, 화면은 "입력 → 즉시 판정 결과" 만 다루는 경량 폼-결과 패턴을 채택한다.

### 1.2 사용자 경험 목표

| 목표 | 설계 반영 |
|------|-----------|
| 결과를 한눈에 구분 | `available`(가능)=녹색 계열 성공 톤, `conflict`(충돌)=적색 계열 경고 톤으로 색·아이콘·라벨을 3중 인코딩(색맹 대비) |
| 대안을 재입력 없이 파악 | 충돌 시 대체 후보를 카드 목록으로 즉시 노출, Track A(순연)/Track B(다른 회의실)를 배지로 구분 |
| 오류를 입력 지점 근처에서 인지 | 검증 실패 시 폼 하단 인라인 에러 + 해당 필드 강조, 4개 실패 코드별 한국어 문구 1:1 매핑 |
| 키보드/모바일 완결성 | 마우스 없이 Tab 순서만으로 전 흐름 조작 가능, 360px 폭에서 가로 스크롤 0 |

### 1.3 `data-*` 계약 준수 (변경 금지)

기획 §9.1·§15 에 고정된 `data-testid`/`data-field`/`data-result`/`data-strategy`/`data-error-code` 속성은 **시각 디자인과 무관하게 그대로 유지**한다. 본 명세의 레이아웃/색상은 이 속성 골격 위에 입히는 표현층이며, dev(BF-1045)·tester(BF-1047)가 공유하는 selector 계약을 절대 바꾸지 않는다.

---

## 2. 컬러 팔레트 & 디자인 토큰 매핑

> tech-stack `typescript-monorepo` 규약: 실제 구현은 **`design-tokens.json` / shadcn/ui 토큰을 참조**하고 hardcoded HEX 를 쓰지 않는다. 아래 HEX 는 mockup 시각화 및 대비 검증용 참조값이며, dev 는 대응하는 시맨틱 토큰 변수를 사용한다. 신규 상태 토큰이 토큰 파일에 없으면 §8.4 절차대로 운영자 승인 후 추가한다.

### 2.1 베이스 팔레트 (shadcn 표준 시맨틱 토큰 매핑)

| 역할 | 시맨틱 토큰 (권장) | Light 참조 HEX | 용도 |
|------|--------------------|----------------|------|
| 배경 | `--background` | `#FFFFFF` | 페이지 바탕 |
| 표면(카드) | `--card` | `#FFFFFF` | 폼/패널/후보 카드 표면 |
| 전경 텍스트 | `--foreground` | `#0F172A` | 본문·제목 |
| 보조 텍스트 | `--muted-foreground` | `#64748B` | 캡션·헬프텍스트·메타 |
| 경계선 | `--border` | `#E2E8F0` | 카드/입력 테두리, 구분선 |
| 뮤트 배경 | `--muted` | `#F1F5F9` | 비활성/보조 영역 배경 |
| 주요 액션 | `--primary` / `--primary-foreground` | `#2563EB` / `#FFFFFF` | 검사 버튼 |
| 포커스 링 | `--ring` | `#2563EB` | 키보드 포커스 아웃라인 |

### 2.2 상태 시맨틱 토큰 (결과·오류 구분)

| 상태 | 시맨틱 토큰 (권장) | 참조 HEX (fg / bg / border) | 매핑 UI |
|------|--------------------|------------------------------|---------|
| 예약 가능 (`available`) | `--success` / `--success-foreground` / `--success-muted` | `#15803D` / `#FFFFFF` / `#F0FDF4`, border `#BBF7D0` | 결과 패널 성공 상태, `[data-result="available"]` |
| 충돌 (`conflict`) | `--destructive` / `--destructive-foreground` / `--destructive-muted` | `#B91C1C` / `#FFFFFF` / `#FEF2F2`, border `#FECACA` | 결과 패널 경고 상태, `[data-result="conflict"]`, `[data-testid="form-error"]` |
| Track A 배지 (`same-room-push`) | `--info` (파랑 계열) | `#1D4ED8` / bg `#EFF6FF` / border `#BFDBFE` | 대체 후보 "같은 회의실·시간 순연" |
| Track B 배지 (`same-time-other-room`) | `--accent` (보라 계열) | `#7C3AED` / bg `#F5F3FF` / border `#DDD6FE` | 대체 후보 "같은 시간·다른 회의실" |

> **대비(WCAG AA) 검증**: 상태 fg 텍스트를 각 muted 배경 위에 올렸을 때 명도 대비 ≥ 4.5:1 을 만족한다(예: `#15803D` on `#F0FDF4` ≈ 4.9:1, `#B91C1C` on `#FEF2F2` ≈ 5.9:1). 색 단독이 아니라 **아이콘(✓/⚠)+라벨 텍스트**를 병행해 색각 이상 사용자도 상태를 구분할 수 있게 한다(§1.2).

---

## 3. 타이포그래피

system font stack 기반(별도 웹폰트 로드 없음 — 성능·의존성 0). 실제 구현은 토큰 파일의 `--font-sans` 를 사용한다.

| 레벨 | 용도 | font-size | weight | line-height | letter-spacing |
|------|------|-----------|--------|-------------|----------------|
| Heading / H1 | 페이지 타이틀 | `1.5rem` (24px) | 700 | 1.3 | `-0.01em` |
| Heading / H2 | 섹션 제목(폼·결과) | `1.125rem` (18px) | 600 | 1.4 | 0 |
| Body | 라벨·본문·결과 문구 | `0.9375rem` (15px) | 400 | 1.6 | 0 |
| Body-strong | 강조(회의실명·시각) | `0.9375rem` (15px) | 600 | 1.6 | 0 |
| Caption | 헬프텍스트·에러·메타·배지 | `0.8125rem` (13px) | 500 | 1.5 | `0.01em` |
| Mono | 시각 값(ISO/시:분) | `0.875rem` (14px) | 500 | 1.5 | 0 |

- `--font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif`
- `--font-mono`: `ui-monospace, "SF Mono", "Roboto Mono", monospace` — 시각(HH:mm) 값 정렬 가독성용
- 모바일(≤480px)에서 H1 은 `1.375rem`(22px)로 축소, 본문 크기는 유지(가독성 우선).

---

## 4. 레이아웃 & 반응형

### 4.1 섹션 구조 (세로 1열)

```
┌──────────────────────────────────────────────┐
│  header  : 페이지 타이틀 + 한줄 설명            │  ← max-width 640px, 중앙 정렬
├──────────────────────────────────────────────┤
│  form    : [data-testid="booking-check-form"] │
│   ├ 회의실 선택 (select)  data-field=roomId    │
│   ├ 신청자명 (input)      data-field=requesterName
│   ├ 시작 시각 (datetime)  data-field=startAt   │
│   ├ 종료 시각 (datetime)  data-field=endAt     │
│   ├ [검사하기] 버튼       data-testid=check-btn│
│   └ 인라인 에러           data-testid=form-error│  ← 검증 실패 시에만 표시
├──────────────────────────────────────────────┤
│  result  : [data-testid="result-panel"]       │
│   data-result=available | conflict            │
│   ├ (available) ✓ 예약 가능 배너                │
│   └ (conflict)  ⚠ 충돌 배너                     │
│        ├ conflict-list / conflict-item × N     │
│        └ alternative-list / alternative-item×N │
│             (0개면 "제안 가능한 대체 시간 없음") │
└──────────────────────────────────────────────┘
```

### 4.2 spacing 스케일 (4px 기반)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--space-1` | 4px | 아이콘-텍스트 간격 |
| `--space-2` | 8px | 라벨-입력 간격 |
| `--space-3` | 12px | 필드 간 세로 간격(모바일) |
| `--space-4` | 16px | 카드 내부 패딩(모바일), 필드 간(데스크톱) |
| `--space-5` | 24px | 카드 내부 패딩(데스크톱), 섹션 간 간격 |
| `--space-6` | 32px | 주요 블록(폼/결과) 간 간격 |

- 컨테이너 `max-width: 640px`, 좌우 패딩 데스크톱 24px / 모바일 16px.
- 카드 `border-radius: 12px`, 입력/버튼 `border-radius: 8px`, 배지 `border-radius: 9999px`(pill).

### 4.3 breakpoint 별 동작

| breakpoint | 폭 | 동작 |
|------------|-----|------|
| 모바일 | ≤ 480px | 폼 필드 100% 폭 1열, 시작/종료 시각 세로 스택, 대체 후보 카드 1열, 폰트 §3 모바일 값 |
| 태블릿+ | 481–640px | 시작/종료 시각 2열 가로 배치(각 50%), 대체 후보 카드 1열 유지 |
| 데스크톱 | > 640px | 컨테이너 640px 고정 중앙 정렬, 나머지 태블릿과 동일(콘텐츠 폭 고정형) |

- **최소 지원 폭 360px**: 360px 에서 가로 스크롤이 발생하지 않아야 한다(입력/버튼 `min-width:0`, `box-sizing:border-box`, 긴 회의실명·시각 `overflow-wrap:anywhere`).
- 터치 타겟: 버튼/셀렉트/인풋 높이 최소 44px(모바일 탭 가능성).

---

## 5. 컴포넌트 명세

각 컴포넌트는 shadcn/ui 대응 컴포넌트를 우선 사용한다(§8.2 매핑 표). props/상태/인터랙션은 dev 구현 계약이다.

### 5.1 BookingCheckForm (`[data-testid="booking-check-form"]`)

| 항목 | 명세 |
|------|------|
| 구성 | 회의실 Select · 신청자명 Input · 시작 Input(datetime-local) · 종료 Input(datetime-local) · Submit Button · 에러 슬롯 |
| 제출 | `<form>` submit 또는 검사 버튼 클릭 → §6.1 검증 흐름(기획 IA-01) |
| 상태 | `idle`(초기) / `error`(검증 실패, 에러 슬롯 노출) / `submitted`(결과 패널 렌더) |
| 접근성 | `<form aria-labelledby="form-heading">`, 검사 실패 시 form-error 로 포커스 이동(§7) |

**필드별 명세**

| 필드 | data-field | 요소 | 라벨 | placeholder/옵션 | 비고 |
|------|-----------|------|------|------------------|------|
| 회의실 | `roomId` | `<select>` | "회의실" | 기본 옵션 "회의실을 선택하세요"(value="") + fixture 3건(§4.1) | 첫 옵션 disabled 로 미선택 유도 |
| 신청자명 | `requesterName` | `<input type="text">` | "신청자명" | "예: 김도윤" | `autocomplete="name"` |
| 시작 시각 | `startAt` | `<input type="datetime-local">` | "시작 시각" | — | 값은 ISO 8601 로 직렬화(§8.3) |
| 종료 시각 | `endAt` | `<input type="datetime-local">` | "종료 시각" | — | 값은 ISO 8601 로 직렬화 |

### 5.2 CheckButton (`[data-testid="check-btn"]`)

| 항목 | 명세 |
|------|------|
| 유형 | `<button type="submit">`, `--primary` 채움, 라벨 "예약 가능 여부 검사" |
| 상태 | default / `:hover`(명도 -8%) / `:focus-visible`(2px `--ring` 아웃라인 + 2px offset) / `:active`(명도 -12%) |
| 폭 | 모바일 100%, 데스크톱 auto(좌측 정렬) |

### 5.3 FormError (`[data-testid="form-error"]`)

| 항목 | 명세 |
|------|------|
| 노출 | 검증 실패 시에만 렌더(성공/충돌 결과에는 관여 안 함) |
| 속성 | `data-error-code` = 실패 코드(§6.4), `role="alert"`, `aria-live="assertive"` |
| 시각 | `--destructive` 톤 좌측 4px 보더 + `--destructive-muted` 배경, ⚠ 아이콘 + 한국어 문구 |
| 문구 매핑 | §6.4 표의 코드↔문구 1:1(기획 §15 재량, 매핑 고정) |

### 5.3.1 필드 강조 규칙

`MISSING_FIELD`(field 지정)·`UNKNOWN_ROOM` 은 해당 `data-field` 입력에 `aria-invalid="true"` + `--destructive` 보더를 부여한다. `INVALID_TIME_FORMAT`/`TIME_INVERSION` 은 시작/종료 두 시각 필드를 함께 강조한다.

### 5.4 ResultPanel (`[data-testid="result-panel"]`)

| 항목 | 명세 |
|------|------|
| 속성 | `data-result="available" \| "conflict"`, `role="status"`, `aria-live="polite"` |
| available | ✓ 아이콘 + "예약 가능합니다" 배너(`--success` 톤). 대체 후보 목록 **미렌더**(기획 IA-02) |
| conflict | ⚠ 아이콘 + "선택한 시간에 이미 예약이 있습니다" 배너(`--destructive` 톤) + 충돌 목록 + 대체 후보 목록 |

### 5.5 ConflictList / ConflictItem (`[data-testid="conflict-list"]` / `conflict-item`)

| 항목 | 명세 |
|------|------|
| 렌더 | `conflicts` 배열 순서대로 카드/행 나열(기획 §6.2, IA-03) |
| item 내용 | 회의실명 · 신청자명 · `HH:mm–HH:mm`(mono) 시간대 |
| 시각 | `--destructive-muted` 배경 카드, 좌측 ⚠ 마커 |

### 5.6 AlternativeList / AlternativeItem (`[data-testid="alternative-list"]` / `alternative-item`)

| 항목 | 명세 |
|------|------|
| 렌더 | `findAlternativeSlots` 반환 순서 그대로(기획 §7.3, IA-03) |
| 속성 | 각 item `data-strategy="same-room-push" \| "same-time-other-room"` |
| 배지 | Track A=`--info` "같은 회의실 · 시간 순연", Track B=`--accent` "같은 시간 · 다른 회의실"(§2.2) — **색+텍스트 병행** |
| item 내용 | 회의실명 · `HH:mm–HH:mm`(mono) · 전략 배지 |
| 상호작용 | v1 은 표시 전용(선택/재예약 없음 — 기획 §14 비범위). 카드 hover 시 미묘한 elevation 만 |
| 빈 상태 | 후보 0개면 목록 대신 "제안 가능한 대체 시간이 없습니다" 안내 문구(muted 톤)만 표시(기획 IA-04) |

---

## 6. 상태별 UI (입력/가능/충돌/오류)

### 6.1 상태 전이

```
idle ──검사 클릭──▶ 검증
   validateBookingInput (IA-01)
       │ 실패 ─────────────▶ [error] form-error 노출 + 필드 강조 (결과 패널 없음)
       │ 통과
       ▼
   findConflicts (IA-02/03)
       │ hasConflict=false ─▶ [available] result-panel(성공), 대체후보 미렌더
       │ hasConflict=true  ─▶ [conflict] result-panel(경고)
       │                         + conflict-list
       │                         + findAlternativeSlots → alternative-list
       │                             (0개면 빈-상태 문구)
```

### 6.2 available 상태

- 배너: ✓ + "예약 가능합니다" + 요청 요약(회의실 · 신청자 · 시간대) 캡션.
- 대체 후보 영역 미렌더(DOM 미생성) — 기획 IA-02 준수.

### 6.3 conflict 상태

- 배너: ⚠ + "선택한 시간에 이미 예약이 있습니다".
- `conflict-list`: 겹치는 기존 예약 전부(§6.2 EC-12).
- `alternative-list`: 후보 카드(전략 배지 구분) 또는 빈-상태 문구.

### 6.4 오류(검증 실패) 상태 — 코드↔문구 매핑 (1:1 고정)

| 실패 코드 (`data-error-code`) | 사용자 문구(한국어) | 강조 필드 |
|-------------------------------|----------------------|-----------|
| `MISSING_FIELD` | "필수 항목을 모두 입력해 주세요: {필드 한글명}" | 해당 `field` |
| `INVALID_TIME_FORMAT` | "시작·종료 시각을 올바른 날짜/시간 형식으로 입력해 주세요." | startAt·endAt |
| `TIME_INVERSION` | "종료 시각은 시작 시각보다 뒤여야 합니다." | startAt·endAt |
| `UNKNOWN_ROOM` | "선택한 회의실을 찾을 수 없습니다. 목록에서 다시 선택해 주세요." | roomId |

- 필드 한글명 매핑: `roomId`→"회의실", `requesterName`→"신청자명", `startAt`→"시작 시각", `endAt`→"종료 시각".
- 문구는 dev 가 실패 코드→문구 lookup 테이블로 구현한다(하드코딩 분산 금지, §8.1).

---

## 7. 접근성 & 키보드 조작 명세

> 본 task 수용 기준(접근성/키보드/모바일)의 핵심 산출물. mockup 은 이 흐름을 시각적으로 표현한다.

### 7.1 키보드 전용 조작 흐름 (마우스 없이 완결)

| 순서 | 키 | 동작 |
|------|-----|------|
| 1 | `Tab` | 회의실 Select 로 포커스 진입 |
| 2 | `↑/↓` 또는 문자 | 회의실 옵션 선택 |
| 3 | `Tab` | 신청자명 Input |
| 4 | `Tab` | 시작 시각 → `Tab` 종료 시각(datetime-local 내부는 방향키로 필드 이동) |
| 5 | `Tab` | 검사 버튼 |
| 6 | `Enter`/`Space` | 검사 실행 (또는 폼 내 어디서든 `Enter` 로 submit) |
| 7 | (검증 실패 시) | 포커스가 `form-error` 로 이동, 스크린리더가 `role="alert"` 낭독 후 사용자는 `Shift+Tab` 으로 문제 필드 복귀 |
| 8 | (결과 렌더 시) | `result-panel` `aria-live="polite"` 로 결과 자동 낭독, `Tab` 계속 시 대체 후보 카드로 순차 진입 |

- **포커스 링**: 모든 인터랙티브 요소 `:focus-visible` 에 2px `--ring` 아웃라인 + 2px offset(배경 대비 무관하게 항상 가시). 아웃라인 제거(`outline:none` 단독) 금지.
- **포커스 순서 = DOM 순서**: `tabindex` 양수 사용 금지, 시각 순서와 DOM 순서 일치.
- **탭 트랩 없음**: 모달이 없으므로 전체 문서가 단일 탭 시퀀스.

### 7.2 라벨링 & 시맨틱

| 요소 | 접근성 처리 |
|------|-------------|
| 각 입력 | `<label for>` 명시 연결(placeholder 를 라벨 대체로 쓰지 않음) |
| 필수 표시 | 라벨에 시각적 `*` + `aria-required="true"` |
| 폼 | `<form aria-labelledby="form-heading">` |
| 에러 | `role="alert"` `aria-live="assertive"`, 강조 필드에 `aria-invalid="true"` + `aria-describedby` 로 에러 연결 |
| 결과 패널 | `role="status"` `aria-live="polite"`(결과 갱신을 방해 없이 낭독) |
| 아이콘 | 장식용 아이콘 `aria-hidden="true"`, 의미는 인접 텍스트로 전달 |
| 상태 색 | 색 단독 정보 전달 금지 — ✓/⚠ 아이콘 + 라벨 텍스트 병행(§1.2, §2.2) |

### 7.3 모바일 폭 가독성 (360–480px)

- 단일 열 스택, 터치 타겟 ≥ 44px, 본문 폰트 축소 없음(§3).
- 시작/종료 시각 세로 스택(가로 압축으로 인한 datetime 위젯 잘림 방지).
- 긴 회의실명/신청자명 `overflow-wrap:anywhere` 로 줄바꿈, 가로 스크롤 0.
- 배지·시간대는 wrap 허용해 좁은 폭에서 겹치지 않게 배치.

---

## 8. dev 구현 가이드 (BF-1045)

### 8.1 구현 순서 (권장)

1. 라우트/페이지 스캐폴딩: 기획 §16 Open Decision #1 대로 기존 `/demo/*` 컨벤션 확인 후 배치. `data-*` 계약(기획 §9.1)은 그대로.
2. 폼 마크업: §5.1 필드 표 + §7.2 라벨링. `<label for>`·`aria-required` 필수.
3. 제출 핸들러: 기획 IA-01→03 순서로 `validateBookingInput`→`findConflicts`→`findAlternativeSlots` 호출.
4. 에러 문구 lookup 테이블(§6.4) 1곳에 정의, `data-error-code` 세팅 + 필드 `aria-invalid`.
5. 결과 패널/충돌 목록/대체 후보 렌더(§5.4~5.6), 전략 배지 `data-strategy` 세팅.
6. 접근성 마감: 포커스 이동(검증 실패→form-error), `aria-live` 영역, `:focus-visible` 링.

### 8.2 컴포넌트 매핑 (shadcn/ui 우선)

| 본 명세 컴포넌트 | shadcn/ui 대응 | 신규 여부 |
|------------------|----------------|-----------|
| 회의실 Select | `Select` (또는 접근성 확실한 native `<select>` 래핑) | 기존 |
| 신청자명 / 시각 Input | `Input` | 기존 |
| CheckButton | `Button`(variant=default) | 기존 |
| FormError | `Alert`(variant=destructive) | 기존 |
| ResultPanel 배너 | `Alert`(success/destructive) | success variant 없으면 §8.4 |
| Conflict/Alternative 카드 | `Card` | 기존 |
| 전략 배지 | `Badge` | 기존(variant 색은 §8.4 토큰) |

> 신규 커스텀 컴포넌트 추가는 없다. 기존 shadcn 프리미티브 조합으로 구성한다.

### 8.3 시각 값 처리

- `<input type="datetime-local">` 값(로컬 무타임존)을 기획 §1.3 의 ISO 8601(UTC `Z`) 문자열로 직렬화해 `validateBookingInput`/`findConflicts` 에 전달한다. 표시(HH:mm)는 fixture 가 UTC 이므로 UTC 기준으로 포맷해 fixture 와 일관되게 보여준다(기획 §14 타임존 변환 비범위 — UTC 고정 표시).
- 시각 렌더는 `--font-mono` 로 정렬 가독성 확보(§3).

### 8.4 토큰 준수 (필수)

- **hardcoded HEX 금지**. §2 참조 HEX 는 mockup 전용. 구현은 시맨틱 토큰 변수(`--primary`, `--destructive`, `--muted-foreground` 등)를 사용.
- `--success`/`--info`/`--accent` 계열 상태 토큰이 `design-tokens.json` 에 없으면: 임의 추가 금지. **운영자 승인 후** 토큰을 추가하거나, 승인 전에는 기존 토큰(예: 성공=`--primary` 대체 불가하면 리뷰에 flag)으로 매핑하고 PR/리뷰에 결정 요청을 남긴다. designer 는 토큰 파일을 직접 수정하지 않는다(절대 금지 규약).
- plan-v2 / docs/wireframes 등 기존 경로는 건드리지 않는다.

### 8.5 mockup 활용

`docs/design/mockups/booking-canary/booking-canary-BF-1042.html` 은 색·간격·상태 표현의 시각 레퍼런스다. 픽셀 단위 일치 의무는 없고, `data-*` 계약과 상태 구분·접근성 구조를 우선한다.

---

## 9. mockup 참조

- 파일: `docs/design/mockups/booking-canary/booking-canary-BF-1042.html`
- 단일 self-contained HTML(외부 의존성 0, 인라인 `<style>`, system font).
- 포함 상태 시뮬레이션(한 페이지 `<section>` 구분):
  1. 초기 입력 폼(idle)
  2. 검증 오류(form-error, 4개 코드 예시)
  3. 예약 가능(available) 결과
  4. 충돌(conflict) + 대체 후보(Track A/B 배지) 결과
  5. 충돌 + 대체 후보 0개(빈 상태)
  6. 모바일 폭(360px) 레이아웃 프리뷰
  7. 포커스 링/키보드 포커스 상태 시각 예시
- worker 가 종료 시 이 파일을 자동 screenshot 캡처해 PR 본문에 임베드한다.

---

## 10. Self-critique

PR commit 직전 자기 점검(5개 항목):

| 항목 | 점검 결과 |
|------|-----------|
| AC 매핑 | AC-1(상태별 UI+토큰 매핑 문서화)→§2·§6 표로 충족. AC-2(키보드 흐름+모바일 폭 시각 확인)→§7 + mockup §9 상태 6·7 로 충족 |
| dev 구현 가이드 | §8 에 구현 순서·컴포넌트 매핑·시각 값 처리·토큰 준수 명시. 에러 문구 lookup·datetime 직렬화까지 단계화 |
| 기존 요소 보존 | 기획 §9.1 `data-*` 계약 전부 유지(§1.3), 신규 커스텀 컴포넌트 0, 기존 shadcn 프리미티브만 조합(§8.2) |
| 컴포넌트 매핑 | §5 각 컴포넌트 → §8.2 shadcn 대응 1:1 매핑 완료 |
| 모호함 flag | ⚠ `--success`/`--info`/`--accent` 상태 토큰이 `design-tokens.json` 에 존재하는지 미확인(context 범위 밖). §8.4 에 "미존재 시 운영자 승인 후 추가, designer 직접 수정 금지"로 명시해 dev/리뷰에 결정 위임. ⚠ 라우트 물리 경로는 기획 §16 Open Decision #1 대로 dev 가 확정 |

---

*문서 종료 — [이디자인] · BF-1044 (파일명 그룹 키: BF-1042)*
