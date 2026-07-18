# 반품 승인 워크벤치 — 디자인 명세 (BF-1038)

<!-- bf:tech-stack:typescript-monorepo -->
<!-- bf:primary-module:return-approvals-canary -->

- 대상 route: `/return-approvals-canary`
- 기획 근거: `docs/planning/return-approvals-canary-BF-1037.md`
- 관련 형제 Task: BF-1037(planner), BF-1039(developer), BF-1041(tester)
- 산출물: 본 명세 markdown + mockup HTML (§8 참조)

> **토큰 원칙 (AC1)**: brix-Flow 공용 semantic 디자인 토큰(shadcn/ui 규약)만 사용한다.
> **신규 컬러/토큰을 정의하지 않는다.** 상태 구분은 색상 단독이 아니라 텍스트 라벨 + 형태(border/아이콘)를
> 함께 사용하여 표현한다(접근성 §5 참조). 아래 표의 `--토큰명`은 monorepo `design-tokens.json`의
> 공용 semantic 토큰을 그대로 참조하며, 하드코딩 HEX는 mockup 시각화 목적의 fallback 주석으로만 병기한다.

---

## 1. 시안 개요

### 변경 범위
- 운영자가 접수된 반품 요청을 확인·필터링하고 **승인/보류/보류 해제** 처리를 수행하는 단일 화면.
- 좌측 **목록(list)** + 우측 **상세·액션 패널(detail)** 의 2-pane 워크벤치 레이아웃.
- 정적 fixture + 로컬 상태 오버레이(§기획 §3~4) 기준. 신규 API/스키마 없음.

### 사용자 경험 목표
1. 운영자가 처리 대기(pending) 건을 **한눈에 식별**하고 우선 처리할 수 있다.
2. 승인/보류 액션의 **결과와 현재 상태를 항상 명확히** 인지한다(상태 라벨 + 처리 시각/처리자 노출).
3. 보류 시 **사유 입력 강제** 및 검증 실패를 인라인으로 즉시 피드백한다.
4. 키보드만으로 목록 탐색 → 상세 진입 → 액션 실행까지 **완결 가능**하다(접근성 §5).

### 과거 canary 페이지 미참조 선언
- 본 시안은 기획 명세(BF-1037)와 brix-Flow 공용 토큰·접근성 규칙만을 근거로 신규 작성한다.
- 과거 canary 페이지의 레이아웃/컬러/컴포넌트를 참조하거나 이식하지 않는다.

---

## 2. 컬러 팔레트 (공용 토큰 매핑 — 신규 토큰 0건)

| 역할 | 공용 토큰 (CSS 변수) | 용도 | 라이트 참고값 |
|---|---|---|---|
| 배경 | `--background` | 페이지 최상위 배경 | `#ffffff` |
| 전경(본문) | `--foreground` | 기본 텍스트 | `#0a0a0a` |
| 카드/패널 | `--card` / `--card-foreground` | 목록·상세 패널 표면 | `#ffffff` / `#0a0a0a` |
| 보조 배경 | `--muted` / `--muted-foreground` | 테이블 헤더, 캡션, 대기 상태 | `#f4f4f5` / `#71717a` |
| 강조/브랜드 | `--primary` / `--primary-foreground` | 주요 CTA(승인), 선택 행 강조 | `#18181b` / `#fafafa` |
| 보조 액션 | `--secondary` / `--secondary-foreground` | 보조 버튼(보류/보류 해제) | `#f4f4f5` / `#18181b` |
| 위험/주의 | `--destructive` / `--destructive-foreground` | 검증 에러, 보류 상태 강조 | `#dc2626` / `#fafafa` |
| 테두리 | `--border` | 패널/행/입력 경계 | `#e4e4e7` |
| 입력 | `--input` | 폼 컨트롤 경계 | `#e4e4e7` |
| 포커스 링 | `--ring` | 키보드 포커스 outline | `#0a0a0a` |

> **상태별 시각 표현 규칙 (색상 단독 금지)**: 아래 상태 뱃지는 색상 + **텍스트 라벨 필수** + **형태 구분**(테두리/도형)으로 표현한다.
>
> | 상태 | 라벨 텍스트 | 배경/전경 토큰 | 형태 보강 |
> |---|---|---|---|
> | `pending` | "대기" | `--muted` / `--muted-foreground` | 점선 테두리(`1px dashed --border`) |
> | `approved` | "승인" | `--primary` / `--primary-foreground` | 채움 + `✔` 아이콘 접두 |
> | `held` | "보류" | `--destructive` / `--destructive-foreground` | 채움 + `⏸` 아이콘 접두 |
>
> 색맹/저대비 환경에서도 라벨 텍스트와 형태만으로 상태 판별이 가능하다.

---

## 3. 타이포그래피 (공용 스케일 참조)

| 역할 | font-family | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| Heading / 화면 타이틀 | 공용 `font-sans` | 20px (1.25rem) | 600 | 1.4 | "반품 승인 워크벤치" |
| Section / 상세 제목 | 공용 `font-sans` | 16px (1rem) | 600 | 1.4 | 상세 패널 상품명 |
| Body / 본문·테이블 셀 | 공용 `font-sans` | 14px (0.875rem) | 400 | 1.5 | 목록/상세 텍스트 |
| Label / 폼 라벨·뱃지 | 공용 `font-sans` | 13px (0.8125rem) | 500 | 1.4 | 필드 라벨, 상태 뱃지 |
| Caption / 보조 | 공용 `font-sans` | 12px (0.75rem) | 400 | 1.4 | 요청일시, 처리자/시각 |
| Numeric / 금액·수량 | 공용 `font-sans`, `tabular-nums` | 14px | 500 | 1.5 | 환불 예정 금액 우측 정렬 |

- `font-family`는 monorepo 공용 sans 토큰을 상속하며 별도 웹폰트를 추가하지 않는다.
- 금액/수량은 `font-variant-numeric: tabular-nums`로 자릿수 정렬한다.

---

## 4. 레이아웃

### 4.1 섹션 구조
```
┌─────────────────────────────────────────────────────────────┐
│ 헤더: "반품 승인 워크벤치"  |  상태 필터(전체/대기/승인/보류)      │  ← toolbar
├───────────────────────────┬─────────────────────────────────┤
│ 목록 패널 (list)           │ 상세·액션 패널 (detail)          │
│ - 테이블 헤더(sticky)      │ - 상품/주문 요약                 │
│ - 반품 요청 행 (선택 가능) │ - 사유 / 환불 예정 금액 / 메모   │
│ - 빈 상태 안내             │ - 상태 뱃지                      │
│                           │ - 액션 영역(승인/보류/보류 해제) │
│                           │ - 보류 사유 입력 폼(조건부)      │
└───────────────────────────┴─────────────────────────────────┘
```

### 4.2 Spacing (공용 spacing 스케일 4px 기준)
- 페이지 패딩: 24px, 패널 간 gap: 16px.
- 패널 내부 패딩: 16px, 폼 필드 세로 간격: 12px.
- 테이블 행 높이: 48px, 셀 좌우 패딩: 12px.
- 액션 버튼 간 gap: 8px.

### 4.3 Breakpoint 별 동작
| Breakpoint | 폭 | 레이아웃 |
|---|---|---|
| Desktop | ≥ 1024px | 목록 60% + 상세 40% 좌우 2-pane |
| Tablet | 640–1023px | 목록 상단 / 상세 하단 세로 스택, 상세는 선택 시 화면 하단에 표시 |
| Mobile | < 640px | 목록만 표시, 행 선택 시 상세가 전체 화면 오버레이(닫기 버튼 제공), 필터는 가로 스크롤 chip |

- 상세 패널은 데스크톱에서 `position: sticky`로 스크롤 시 상단 고정.

---

## 5. 접근성 명세 (AC: 키보드 포커스 · 명도 대비 · 상태 라벨)

### 5.1 키보드 포커스 / 조작
- 모든 인터랙티브 요소(필터 chip, 테이블 행, 버튼, 입력)는 `Tab` 순서에 포함, `--ring` 토큰으로 **가시 포커스 링(2px, offset 2px)** 표시.
- 테이블 행은 `role="row"`, 선택 가능한 행은 `tabindex="0"` + `Enter`/`Space`로 상세 열기.
- 필터는 `role="tablist"`(또는 radiogroup), 좌우 화살표로 이동, 현재 선택은 `aria-selected="true"`.
- 액션 버튼은 `<button>` 시맨틱, 비활성 시 `disabled` + `aria-disabled="true"`.
- 보류 사유 입력 폼 등장 시 포커스를 입력 필드로 이동(`focus()`), 취소 시 트리거 버튼으로 복귀.
- 포커스는 시각적 링에만 의존하지 않고 상태 텍스트 변화(예: 선택된 행 `aria-selected`)로도 전달.

### 5.2 명도 대비 (WCAG 2.1 AA)
- 본문 텍스트/배경 대비 ≥ **4.5:1**, 큰 텍스트(≥18.66px bold/24px) ≥ 3:1.
- 상태 뱃지의 라벨 텍스트는 각 배경 토큰 위에서 4.5:1 이상 (`--primary-foreground` on `--primary`, `--destructive-foreground` on `--destructive`, `--muted-foreground` on `--muted`).
- 포커스 링(`--ring`)과 인접 배경 대비 ≥ 3:1.
- 상태·의미 전달을 **색상 단독으로 하지 않음** — 반드시 텍스트 라벨 + 형태 병행(§2 규칙).

### 5.3 상태 라벨 / 스크린리더
- 상태 뱃지: `<span role="status">승인</span>` 형태로 텍스트 라벨을 항상 포함(아이콘은 `aria-hidden="true"`).
- 상태 변경/토스트 피드백은 `aria-live="polite"` 영역에 안내(예: "RTN-1002 승인 처리되었습니다").
- 보류 사유 검증 에러는 `aria-live="assertive"` + 입력 필드에 `aria-invalid="true"` + `aria-describedby`로 에러 메시지 연결.
- 비활성 액션(approved terminal) 버튼은 `aria-disabled`와 함께 사유를 스크린리더에 전달(예: "승인 완료 — 추가 액션 불가").
- 빈 상태 안내와 로드 실패 안내는 각각 `role="status"` / `role="alert"`로 노출.

---

## 6. 컴포넌트 명세

> shadcn/ui 우선. 아래 매핑 컴포넌트가 monorepo에 이미 있으면 재사용하고, 없을 때만 신규 추가(추가 시 dev PR에 매핑 명시).

### 6.1 `StatusFilterTabs` (상태 필터)
- shadcn 매핑: `Tabs` 또는 `ToggleGroup`.
- props: `value: "all" | "pending" | "approved" | "held"`, `counts: Record<status, number>`, `onChange(value)`.
- 상태: 선택/비선택. 각 탭에 건수 뱃지 표시.
- 인터랙션: 클릭/화살표 키 이동 → 목록 재필터링(fixture 재조회 없음, 기획 §5-1).

### 6.2 `ReturnRequestTable` (목록 테이블)
- shadcn 매핑: `Table`.
- 컬럼: 상태 뱃지 · 주문ID(`orderId`) · 고객명(`customerName`) · 상품명(`productName`) · 반품 사유(`reason` 한글 라벨) · 요청일시(`requestedAt`).
- props: `rows: ReturnRequest[]`, `selectedId: string | null`, `onSelect(id)`.
- 상태: 기본 / hover(`--muted`) / 선택(`--primary` 좌측 4px 인디케이터 + `aria-selected`) / 포커스(`--ring`).
- 빈 상태: rows가 0건이면 "표시할 반품 요청이 없습니다" (`role="status"`).

### 6.3 `StatusBadge` (상태 뱃지)
- props: `status: "pending" | "approved" | "held"`.
- 렌더: 라벨 텍스트(대기/승인/보류) + 상태별 아이콘(`aria-hidden`) + §2 형태 규칙.
- 색상 단독 의미 전달 금지.

### 6.4 `ReturnDetailPanel` (상세·액션 패널)
- props: `request: ReturnRequest | null`, `onApprove(id)`, `onHold(id, reason)`, `onReleaseHold(id)`.
- 표시: 상품/주문 요약, `reason`+`reasonDetail`, `refundAmount`(금액 포맷), `notes`, 상태 뱃지.
- 상태별 액션 노출(기획 §5-2):
  - `pending`: [승인](primary) + [보류](secondary) 모두 활성.
  - `held`: [승인](primary) + [보류 해제](secondary) 노출, 기존 `holdReason` 표시.
  - `approved`: 액션 버튼 비활성(`disabled`), `approvedAt`/`approvedBy` 표시(terminal).
- `request === null`: "요청을 선택하세요" placeholder.

### 6.5 `HoldReasonForm` (보류 사유 입력)
- shadcn 매핑: `Textarea` + `Button` + 인라인 에러 텍스트.
- props: `visible: boolean`, `value: string`, `error: string | null`, `onSubmit`, `onCancel`.
- 인터랙션: [보류] 클릭 시 노출 → 등장 시 입력에 포커스 → 확인 시 공백 검증(공백만이면 전이 차단 + `aria-invalid` 에러) → 통과 시 `onHold` 호출.
- 검증 에러 메시지: "보류 사유를 입력해 주세요." (`aria-live="assertive"`).

### 6.6 `ApproveConfirmDialog` (승인 확인)
- shadcn 매핑: `AlertDialog`.
- props: `open`, `request`, `onConfirm`, `onCancel`.
- 인터랙션: [승인] 클릭 → 확인 다이얼로그 → 확정 시 즉시 전이(기획 §5-4). 오픈 시 포커스 트랩, `Esc` 취소.

### 6.7 `ActionFeedbackToast` (처리 피드백)
- shadcn 매핑: `Toast`(또는 상세 상단 인라인 배너).
- props: `message: string`, `variant: "success" | "info"`.
- `aria-live="polite"`로 처리 결과 안내. 인라인 대체 시에도 동일 live region 규칙.

### 6.8 상태 → 액션 매핑 요약 (기획 §4 대응)

| 현재 상태 | 노출 액션 | 결과 상태 | 가드 |
|---|---|---|---|
| pending | 승인 / 보류 | approved / held | 보류는 `holdReason` 공백 불가 |
| held | 승인 / 보류 해제 | approved / pending | 없음 |
| approved | (없음, 비활성) | — (terminal) | 역방향 전이 미제공 |

---

## 7. dev 구현 가이드 (BF-1039 developer 대상)

1. **토큰**: 위 §2 공용 semantic 토큰만 사용. **하드코딩 HEX 금지**, 신규 토큰 추가 금지. Tailwind/shadcn 클래스(`bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring` 등)로 매핑.
2. **레이아웃 클래스(권장)**: 컨테이너 `.return-workbench`, 목록 `.rw-list`, 상세 `.rw-detail`, 툴바 `.rw-toolbar`. 데스크톱 2-pane는 `grid-cols-[3fr_2fr]`, 태블릿 이하 `grid-cols-1`.
3. **CSS 변수(권장 로컬 별칭)**: 상태 시각 규칙을 위해 `--rw-badge-pending-*` 같은 신규 컬러 변수를 만들지 말고, 공용 토큰(`--muted`/`--primary`/`--destructive`)을 직접 참조.
4. **컴포넌트**: §6 매핑대로 shadcn/ui 우선 재사용. 신규 컴포넌트는 매핑 명시 후 추가.
5. **상태 로직**: 기획 §4 상태 전이 규칙 준수. 로컬 state + `localStorage` 오버레이. 중복 클릭은 전이 직후 `disabled`로 방지.
6. **접근성**: §5의 포커스 링/`aria-*`/live region/색상 비의존 규칙을 구현 필수. 상태는 항상 텍스트 라벨 포함.
7. **반응형**: §4.3 breakpoint 동작 구현. 모바일 상세는 오버레이 + 닫기 버튼.
8. **fixture**: `reason` enum → 한글 라벨 매핑 테이블은 dev가 상수로 정의(불량/단순 변심/오배송/배송 중 파손/기타).

---

## 8. mockup 참조

- **파일 경로**: `docs/design/return-approvals-canary/return-approvals-canary-BF-1038.html`
- 위 §2~6의 컬러·타이포·레이아웃·상태 뱃지·상세/액션·보류 폼을 정적으로 시각화한 self-contained HTML.
- 인터랙션(hover/포커스/보류 폼/승인 다이얼로그)은 정적 상태 스냅샷으로 각 섹션에 표현.
- dev는 mockup을 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없다(UX 의도 전달이 목적).

> **경로 관련 주석**: 본 dispatch의 owned_paths(현재 Run 권위)는 `docs/design/return-approvals-canary/**`이며,
> `docs/design/mockups/`는 이번 범위 밖이라 쓰기가 차단된다. 따라서 mockup을 소유 하위 디렉터리에 배치한다.
> system screenshot capture가 표준 `docs/design/mockups/` 경로만 검사한다면, 운영자/worker가 파일을
> 표준 경로로 이동하거나 capture 대상 경로를 조정해야 한다(본 명세에서 직접 이동하지 않음).

---

## 9. Acceptance Criteria 매핑

| # | Given | When | Then | 본 명세 근거 |
|---|---|---|---|---|
| AC1 | 공용 디자인 토큰 | 시안 작성 시 | 신규 컬러/토큰 없이 기존 토큰만으로 목록·상세·승인 액션 레이아웃 정의 | §2 컬러 팔레트(공용 토큰 매핑, 신규 0건) · §4 레이아웃 · §6 컴포넌트 · §7-1 |
| AC2 | 접근성 규칙 | mockup 작성 시 | 키보드 포커스·명도 대비·상태 라벨이 명세에 포함 | §5 접근성 명세(5.1 포커스 / 5.2 대비 / 5.3 상태 라벨) · mockup 접근성 섹션 |
| AC3 | 4개 수용 기준 | 명세 작성 시 | AC 매핑 표 포함 | 본 §9 표 |
| AC4 | 기획 화면 흐름(BF-1037 §5) | 시안 작성 시 | 목록→상세→승인/보류 액션 레이아웃이 시각·명세로 정의 | §1 개요 · §4 레이아웃 · §6 컴포넌트 · §8 mockup |

> 본 명세의 수용 기준은 designer task(BF-1038)의 4개 AC이며, planner(BF-1037)의 화면 흐름을 시각 시안으로 구체화한다.

---

## Self-critique

PR commit 직전 자기 점검 (dev-1 인계 전 명세 완결성 검증):

1. **AC 매핑 (AC1~AC4)**: §9 표에 4개 AC 각각을 본문 섹션 근거와 1:1 매핑 완료. ✅
2. **dev 구현 가이드**: §7에 토큰/레이아웃 클래스/CSS 별칭 금지/컴포넌트 매핑/상태 로직/접근성/반응형/fixture 라벨을 단계별 지침으로 명시. ✅
3. **기존 요소 보존**: 기획 §8 보존 영역(인증·공용 레이아웃·타 route·schema·Docker·외부 API 미변경)을 본 시안은 신규 route 화면 범위로만 다루며 보존 원칙에 위배되는 컴포넌트 변경을 요구하지 않음. ✅
4. **컴포넌트 매핑**: §6에서 각 컴포넌트를 shadcn/ui(Tabs/Table/AlertDialog/Textarea/Toast 등)에 매핑, 신규 추가 시 "매핑 명시 후 추가" 규칙 명시. ✅
5. **모호함 flag**: (a) 실제 `design-tokens.json` 직접 조회가 스코프상 차단되어 shadcn 표준 semantic 토큰명을 사용함 — dev는 monorepo 실제 토큰명과 대조 필요. (b) `approved` 상태의 성공(success) 전용 색상 토큰이 공용 토큰에 있으면 `--primary` 대신 그것을 우선 사용 가능(단, 신규 토큰 정의는 금지). (c) mockup 경로가 owned_paths 제약으로 표준 `docs/design/mockups/`가 아닌 소유 하위 디렉터리에 위치 — capture 경로 조정 필요 시 운영자/worker 처리. ⚠️
