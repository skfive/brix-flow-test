# SLA 위반 대응 큐 — 디자인 명세 (BF-1056)

- 대상 페이지: `/sla-breach-triage-canary`
- 기획 근거: `docs/planning/sla-breach-triage-canary-BF-1054.md` (BF-1055)
- 관련 Task: BF-1055(planner) · **BF-1056(designer, 본 문서)** · BF-1057(developer) · BF-1059(tester)
- mockup 참조: `docs/design/mockups/sla-breach-triage-canary/sla-breach-triage-canary-BF-1056.html`
- 스택 규약: 저장소 관측 규약 = `vanilla-static`. 외부 의존성 0건, system font stack, 공용 디자인 토큰은 `:root` CSS 변수로 자체 정의. 하드코딩 색상 금지(모든 색상은 토큰 변수 경유).

> ⚠️ 과거 canary 시안은 참조하지 않았습니다. 아래 토큰은 brix-Flow 공용 규약(중립 팔레트 · WCAG AA 대비 · 8px 스페이싱 그리드 · 시맨틱 마크업)에 맞춰 정의했으며, 기존 정적 페이지와 동일한 구조(페이지 헤더 → 섹션 카드 리스트)를 유지합니다.

---

## 1. 시안 개요

### 변경 범위
- SLA 위반/임박 요청을 **한 화면**에서 처리하는 정적 트리아지 큐 페이지 신규 시안.
- 화면은 두 섹션으로 구성: **① 대응 대기열**(`pending` + `assigned`), **② 해결됨**(`resolved`).
- 각 요청은 카드로 표현하며 위험도 배지 · SLA 초과 시간 · 상태 배지 · 상태별 액션 영역 · 인라인 에러 영역을 포함.

### 사용자 경험 목표
1. **우선순위 즉시 파악** — 위험도 배지 색상 + SLA 초과 시간을 카드 좌측에 고정 배치해 스캔 한 번으로 급한 건을 식별.
2. **최소 조작으로 상태 전이** — `pending → assigned → resolved` 흐름을 카드 안에서 완결(페이지 이동/모달 없음).
3. **오류를 즉시 이해** — 빈 담당자/빈 메모는 인라인 에러 텍스트로 카드 안에서 안내(토스트/알림창 없음).
4. **접근성 기본 보장** — 키보드만으로 전체 흐름 수행, 4.5:1 이상 텍스트 대비, 모든 인터랙티브 요소 라벨링.

---

## 2. 컬러 팔레트

모든 색상은 토큰 변수로 정의하며 mockup `:root` 와 1:1 동기화. 대비값은 해당 배경 대비 WCAG 기준(본문 텍스트 4.5:1, 큰 텍스트/UI 컴포넌트 3:1) 충족.

| 토큰 | HEX | 용도 | 대비 검증 |
|---|---|---|---|
| `--bf-color-bg` | `#f4f6f9` | 페이지 배경 | — |
| `--bf-color-surface` | `#ffffff` | 카드/섹션 배경 | — |
| `--bf-color-surface-muted` | `#eef1f6` | 읽기전용(resolved) 카드 배경 | — |
| `--bf-color-border` | `#d5dae1` | 카드/입력 테두리 | 표면 대비 3:1↑(UI) |
| `--bf-color-text` | `#1a2230` | 본문/제목 텍스트 | on `#ffffff` ≈ 14.8:1 |
| `--bf-color-text-muted` | `#4d5769` | 보조 텍스트(고객명/시각) | on `#ffffff` ≈ 7.1:1 |
| `--bf-color-primary` | `#1d4ed8` | 주요 버튼 배경 / 포커스 링 | white 텍스트 대비 ≈ 6.3:1 |
| `--bf-color-primary-hover` | `#1740a6` | 주요 버튼 hover | white 텍스트 대비 ≈ 8.4:1 |
| `--bf-color-on-primary` | `#ffffff` | 주요 버튼 텍스트 | — |
| `--bf-color-danger` | `#b3261e` | 인라인 에러 텍스트/테두리 | on `#ffffff` ≈ 6.6:1 |
| `--bf-color-focus` | `#1d4ed8` | `:focus-visible` outline | 표면 대비 ≈ 6.3:1(UI) |

### 위험도(severity) 배지 토큰 — 텍스트는 항상 흰색(`--bf-color-on-primary`)

| 토큰 | HEX | severity | white 텍스트 대비 |
|---|---|---|---|
| `--bf-sev-critical` | `#b3261e` | critical | ≈ 6.6:1 |
| `--bf-sev-high` | `#b5451a` | high | ≈ 5.1:1 |
| `--bf-sev-medium` | `#8a5a00` | medium | ≈ 5.4:1 |
| `--bf-sev-low` | `#3f6212` | low | ≈ 6.5:1 |

### 상태(status) 배지 토큰 — 배경틴트 + 진한 텍스트(대비 확보)

| 토큰 | 배경 HEX | 텍스트 HEX | status | 텍스트 대비 |
|---|---|---|---|---|
| `--bf-status-pending-bg` / `-fg` | `#fdecea` / `#8a1c15` | — | pending(대기) | ≈ 7.8:1 |
| `--bf-status-assigned-bg` / `-fg` | `#e7effd` / `#1740a6` | — | assigned(담당지정) | ≈ 7.9:1 |
| `--bf-status-resolved-bg` / `-fg` | `#e4f4ea` / `#0f5a2e` | — | resolved(해결) | ≈ 7.6:1 |

> 색상만으로 정보를 전달하지 않는다: 위험도/상태는 배지 **텍스트 라벨**을 항상 동반하고(예: "긴급", "담당지정"), SLA 초과 시간은 숫자로 별도 표기(색맹 사용자 대응).

---

## 3. 타이포그래피

system font stack 사용(외부 폰트 로드 없음):
`--bf-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;`

| 역할 | 토큰 | font-size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| Page title (h1) | `--bf-type-h1` | 24px (1.5rem) | 700 | 1.3 | 페이지 제목 |
| Section title (h2) | `--bf-type-h2` | 18px (1.125rem) | 600 | 1.35 | "대응 대기열" / "해결됨" |
| Card title (h3) | `--bf-type-h3` | 16px (1rem) | 600 | 1.4 | 요청 요약(title) |
| Body | `--bf-type-body` | 14px (0.875rem) | 400 | 1.5 | 본문/입력/버튼 |
| Caption | `--bf-type-caption` | 12px (0.75rem) | 500 | 1.45 | 고객명·시각·보조 라벨 |

- 최소 본문 크기 14px 유지(가독성). 숫자(SLA 초과 분)는 `font-variant-numeric: tabular-nums` 로 정렬 안정화.

---

## 4. 레이아웃

### 전체 구조
```
┌ page (max-width 960px, 중앙 정렬, 좌우 padding 16px) ────────────┐
│ <header>  h1: SLA 위반 대응 큐   +  요약 카운트(대기 N · 해결 M)   │
│                                                                  │
│ <section aria-labelledby="queue-heading">                        │
│   h2: 대응 대기열 (N)                                             │
│   ├ card (pending)   ├ card (assigned)   ├ ...  (우선순위 정렬)   │
│   └ 빈 상태: "대응 대기 중인 요청이 없습니다."                     │
│                                                                  │
│ <section aria-labelledby="resolved-heading">                     │
│   h2: 해결됨 (M)                                                  │
│   └ card (resolved, 읽기전용)  (resolvedAt desc)                  │
└──────────────────────────────────────────────────────────────────┘
```

### 스페이싱 (8px 그리드 토큰)
`--bf-space-1:4px · --bf-space-2:8px · --bf-space-3:12px · --bf-space-4:16px · --bf-space-6:24px · --bf-space-8:32px`
- 페이지 상하 padding: `--bf-space-8`. 섹션 간 간격: `--bf-space-8`.
- 카드 간 간격: `--bf-space-3`. 카드 내부 padding: `--bf-space-4`.

### 카드 내부 레이아웃 (CSS Grid / Flex)
```
┌ card ───────────────────────────────────────────────────────┐
│ [severity badge]  h3 요청 제목            [status badge]      │  ← 상단 행
│ caption: 고객명 · 위반 시각                                    │
│ SLA 초과: 132분  (강조, tabular-nums)                         │
│ ─────────────── 액션 영역(상태별 분기) ───────────────        │
│ 인라인 에러 영역(role="alert", 평상시 비어있음)               │
└──────────────────────────────────────────────────────────────┘
```

### 반응형 breakpoint
- **≥ 720px (desktop/tablet)**: 카드 상단 행은 [배지][제목]...[상태배지] 가로 정렬. 액션 영역은 입력 + 버튼 가로 배치.
- **< 720px (mobile)**: 카드 상단 행 세로 스택(배지 → 제목 → 상태배지 순), 액션 영역 입력/버튼 세로 100% 폭. 터치 타겟 최소 높이 44px 유지.
- 요약 카운트는 항상 표시(모바일에서 헤더 아래로 래핑).

---

## 5. 컴포넌트 명세

### 5.1 `QueuePage` (페이지 컨테이너)
- props: `requests: SlaBreachRequest[]` (fixture 초기값)
- 파생 상태: `sortQueue(requests)` → `{ pendingQueue, resolvedQueue }` (기획 6.1)
- 렌더: 헤더(요약 카운트) + 대응 대기열 섹션 + 해결됨 섹션.

### 5.2 `SeverityBadge`
- props: `severity: "critical" | "high" | "medium" | "low"`
- 라벨 매핑: critical→"긴급", high→"높음", medium→"보통", low→"낮음".
- 배경 = `--bf-sev-{severity}`, 텍스트 = `--bf-color-on-primary`. `aria-label="위험도: 긴급"`.

### 5.3 `StatusBadge`
- props: `status: "pending" | "assigned" | "resolved"`
- 라벨 매핑: pending→"대기", assigned→"담당지정", resolved→"해결".
- 배경/텍스트 = `--bf-status-{status}-bg` / `-fg`.

### 5.4 `RequestCard`
- props: `request: SlaBreachRequest`, `onAssign(id, assignee)`, `onResolve(id, note)`, `onUnassign(id)`, `error?: string`
- 상태별 액션 영역 분기:
  - **pending**: 담당자 입력(`<input type="text">`) + "담당 지정" 버튼(primary). 입력 비면 버튼은 활성이되 클릭 시 유효성 검사로 인라인 에러(기획 AC-3). `<label>` 로 입력 연결.
  - **assigned**: 담당자 표시("담당: 홍길동") + 해결 메모 입력(`<textarea>`) + "해결 처리" 버튼(primary) + "담당 해제" 버튼(secondary). 메모 비면 인라인 에러(AC-4). 담당 해제 시 pending 복귀(AC-6).
  - **resolved**: 읽기전용. 담당자/해결 메모/해결 시각 표시, **액션 버튼 미노출**(AC-5). 카드 배경 `--bf-color-surface-muted`.
- **상태(state)**: 각 카드는 로컬 입력값(assignee draft, note draft)과 에러 문자열을 자체 보유. 상태 전이는 순수 함수(기획 6.1) 결과로 부모가 재렌더.
- **인터랙션**:
  - 버튼 hover → `--bf-color-primary-hover`, `:focus-visible` → 2px outline(`--bf-color-focus`, offset 2px).
  - 입력 `:focus-visible` → border 색 primary + outline.
  - 에러 영역은 `role="alert"` `aria-live="polite"` — 값이 채워질 때만 스크린리더 안내.

### 5.5 `InlineError`
- props: `message: string` (빈 문자열이면 렌더 안 함 또는 시각적 숨김)
- 텍스트 = `--bf-color-danger`, 좌측 아이콘 텍스트(예: "⚠") + 메시지. 관련 입력에 `aria-describedby` 연결, 에러 시 입력에 `aria-invalid="true"`.

### 5.6 `EmptyState`
- props: `message: string`
- 대응 대기열이 비면(AC-7) "대응 대기 중인 요청이 없습니다." 를 중앙 정렬 caption 톤으로 표시. 크래시 없이 해결됨 섹션만 렌더.

---

## 6. dev 구현 가이드 (BF-1057)

> mockup 은 시각 참조용이며 픽셀 단위 일치 의무는 없습니다. 아래 토큰/클래스명은 권장값입니다.

1. **토큰 정의**: 전역 스타일(`:root`)에 §2 컬러 · §3 타이포 · §4 스페이싱 토큰을 그대로 선언. 컴포넌트에서는 하드코딩 색상 금지, 반드시 `var(--bf-*)` 참조.
2. **클래스명 권장**: `.sla-page`, `.sla-header`, `.sla-summary`, `.sla-section`, `.sla-card`, `.sla-card--resolved`, `.sla-badge-severity`, `.sla-badge-status`, `.sla-card__actions`, `.sla-inline-error`, `.sla-empty`.
3. **정렬**: 렌더 전 `sortQueue(requests)`(기획 5장 comparator + §6.1) 사용. 컴포넌트는 이미 정렬된 배열을 map 만.
4. **상태 전이**: 버튼 핸들러는 `assignRequest` / `resolveRequest` / `unassignRequest`(기획 6.1) 순수 함수 호출 → `ActionResult.ok=false` 면 해당 카드 `error` state 갱신(인라인 에러). `now` 는 호출부에서 주입.
5. **접근성 필수 구현**:
   - 두 섹션 `<section aria-labelledby>` + `<h2 id>` 연결.
   - 각 입력 `<label for>` 또는 `aria-label`. 에러 시 `aria-invalid` + `aria-describedby`.
   - 에러 컨테이너 `role="alert" aria-live="polite"`.
   - 모든 인터랙티브 요소 키보드 도달 가능, `:focus-visible` outline 제거 금지.
   - 위험도/상태는 색상 + 텍스트 라벨 병행(색상 단독 정보 금지).
6. **읽기전용 보호**: resolved 카드는 액션 버튼을 렌더하지 않음(비활성이 아니라 미노출) — DOM 자체에서 종단 상태 보장(AC-5).
7. **빈 상태**: `pendingQueue.length === 0` 이면 `EmptyState` 렌더(AC-7). 무결성 위반 항목은 `sortQueue` 이전 필터에서 제외되어 카드가 생성되지 않음(AC-8, 기획 3·5장).

---

## 7. AC 매핑 표

| AC | 기획 요구 | 디자인 반영 위치 | mockup 확인 지점 |
|---|---|---|---|
| AC-1 | 스키마 + `pending→assigned→resolved` 전이 | §5.4 상태별 액션 분기, §6.4 순수함수 연결 | pending/assigned/resolved 3종 카드 예시 |
| AC-2 | 4단계 comparator 정렬 + 누락 없음 | §4 2섹션 레이아웃, §6.3 정렬 선행, 요약 카운트(대기+해결=전체) | 헤더 요약 카운트 · 대기열 위험도순 배치 |
| AC-3 | 담당자 없이 지정 → 에러 유지 | §5.4 pending, §5.5 InlineError, §6.5 | pending 카드 하단 "담당자를 입력하세요" 에러 예시 |
| AC-4 | 메모 없이 해결 → 에러 유지 | §5.4 assigned, §5.5 InlineError | assigned 카드 하단 "해결 메모를 입력하세요" 에러 예시 |
| AC-5 | resolved 조작 액션 미노출 | §5.4 resolved(읽기전용, 버튼 미노출), §6.6 | resolved 카드에 액션 버튼 없음 |
| AC-6 | 담당 해제 → pending 복귀 | §5.4 assigned "담당 해제" 버튼, §6.4 | assigned 카드 "담당 해제" secondary 버튼 |
| AC-7 | 대기열 빈 상태 | §5.6 EmptyState, §6.7 | 빈 상태 문구 예시 블록 |
| AC-8 | 무결성 위반 항목 렌더 제외 | §6.7(정렬 전 필터), 기획 3·5장 참조 | (렌더 제외 — 시각 요소 없음, 명세로 확인) |

> AC-8 은 "렌더하지 않음"이 요구라 mockup 에 대응 시각 요소가 없는 것이 정상. 명세 §6.7 로 dev/tester 확인 가능.

---

## 8. 접근성 체크리스트 (mockup 충족)

- [x] **키보드 이동**: 탭 순서 = 헤더 → 대기열 카드(입력 → 버튼) → 해결됨 카드. 모든 버튼/입력 `Tab`/`Shift+Tab` 도달, `Enter`/`Space` 작동. 포커스 트랩 없음.
- [x] **대비**: 본문 텍스트 ≥ 4.5:1, 배지/UI 컴포넌트 ≥ 3:1 (§2 검증값).
- [x] **라벨링**: 모든 입력 `<label>`/`aria-label`, 배지 `aria-label`, 섹션 `aria-labelledby`, 에러 `role="alert"`.
- [x] **색상 비의존**: 위험도/상태 텍스트 라벨 병행, SLA 초과는 숫자 표기.
- [x] **포커스 가시성**: `:focus-visible` 2px outline(offset 2px), outline 제거 금지.
- [x] **터치 타겟**: 모바일 버튼/입력 최소 높이 44px.

---

## 9. mockup 참조

- 파일: `docs/design/mockups/sla-breach-triage-canary/sla-breach-triage-canary-BF-1056.html`
- 단일 self-contained HTML(외부 의존성 0). §2~§4 토큰/타이포/레이아웃을 그대로 표현하며 pending·assigned·resolved 카드와 인라인 에러·빈 상태 예시를 정적으로 포함.
- placeholder 데이터(예: "결제 API 응답 지연", "홍길동")로 UX 의도 전달.

---

## 10. Self-critique

PR commit 직전 자기 점검(체크 5개):

1. **AC 매핑**: AC-1~AC-8 전부 §7 표에 매핑. AC-8 은 "렌더 제외"라 시각 요소 부재가 정상임을 명시 → 누락 아님. ✅
2. **dev 구현 가이드**: §6 에 토큰/클래스명/정렬-상태전이 연결/접근성 구현/읽기전용 보호 단계별 기술. 기획 6.1 순수함수와 1:1 연결. ✅
3. **기존 요소 보존**: 신규 페이지라 대체 대상 없음. 저장소 관측 스택(vanilla-static) 규약(외부 의존성 0·system font·CSS 변수 자체정의) 준수, 기존 정적 페이지 구조(헤더→섹션 카드) 답습. ✅
4. **컴포넌트 매핑**: 기획 3장 스키마 필드(severity/status/assignee/slaMinutesOverdue/resolutionNote/resolvedAt)가 §5 컴포넌트 props/표시 요소로 전부 대응. sortQueue 결과 2섹션 매핑. ✅
5. **모호함 flag**:
   - ⚠️ 요청 stack marker(`typescript-monorepo`)와 저장소 관측 규약(`vanilla-static`)이 불일치. 저장소 관측 규약을 authority 로 채택해 CSS 변수 자체 정의 방식으로 명세함. dev 가 실제 앱 프레임워크에 맞춰 토큰을 전역 스타일로 이식하면 됨(토큰 값 자체는 프레임워크 무관).
   - ⚠️ owned 마크다운 파일명이 `-BF-1054`(에픽 키)로 지정됨 — Task DB owned_paths 를 authority 로 그대로 사용. mockup 은 `sla-breach-triage-canary/` 디렉터리 하위에 `-BF-1056` 로 생성.
   - pending 카드에서 "담당 지정" 버튼을 비활성이 아닌 **활성 + 클릭 시 유효성 검사**로 설계(기획 AC-3 이 "에러 표시"를 요구 → 클릭 유효성 검사 방식이 AC 충족). 기획 4.1 의 "이미 assigned/resolved 재실행 차단"은 버튼 미노출로 처리.
