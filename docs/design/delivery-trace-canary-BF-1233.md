# 납품 추적 상태 보드 — 시각 명세 (BF-1234 / dispatch BF-1236)

> 이 문서는 designer 시안이다. planner가 동결한 `planning-contract@v1`·`ui-contract@v1`
> (`docs/plans/delivery-trace-canary-BF-1233.md`)의 selector·상태 텍스트·디자인 토큰·접근성·반응형
> 계약을 **재정의하지 않고 그대로 시각화**한다. domId / cssClass / 토큰 / 상태 텍스트는 원문 그대로 유지한다.
>
> **범위 주의 (fail-honest)**: 본 task의 AC상 산출물은 이 markdown 1건이며 런타임 HTML/CSS/JS는 생성하지 않는다.
> 따라서 mockup은 별도 `.html` 파일이 아니라 본 문서 §8에 임베드된 시각 코드 블록으로 제공한다.
> 실제 구현 파일(`DeliveryTraceBoard.tsx` / `fixtures.ts` / `index.ts` / `styles.css`)은 developer(BF-1235) 소유이며 designer가 생성하지 않는다.

---

## 1. 시안 개요

- **변경 범위**: `/demo/delivery-trace-canary` 상태 보드 신규 시각 명세. Requirement→Design→Implementation→Review→Test
  5단계 납품 추적을 하나의 보드로 가시화한다.
- **사용자 경험 목표**
  1. 운영자가 보드를 열면 5개 단계의 **완료 / 진행 중 / 누락** 상태를 색상과 화면 텍스트로 **동시에** 인지한다.
  2. 특정 단계를 선택하면 상세 패널에서 evidence 링크와 상태를 확인한다.
  3. evidence가 하나라도 없으면 경고 배너가 어떤 단계가 누락인지 즉시 알린다.
  4. 데이터가 없으면 빈 상태 안내를 보되 필터·패널 조작성은 유지된다.
- **동결 계약 소비**: 아래 모든 selector·토큰·텍스트는 §6(계약 blueprint)에서 온 값이며 designer가 새로 만들지 않는다.

---

## 2. 컬러 팔레트 (동결 토큰 + 시안 보조색)

### 2.1 동결 상태 토큰 (계약 §6.4 — 변경 금지)

| 토큰 | 값 | 매핑 status | 시각 의미 |
|------|-----|-------------|-----------|
| `--color-trace-complete` | `#15803d` | `complete` | 완료 (녹색) |
| `--color-trace-missing` | `#b91c1c` | `missing` | 누락 (적색) |
| `--color-trace-pending` | `#a16207` | `pending` | 진행 중 (황갈색) |
| `--space-trace-gap` | `16px` | — | 카드·패널 간격 |

> ⚠️ 위 4개 토큰은 frozen blueprint 권위값이다. HEX·이름 모두 그대로 사용한다.

### 2.2 시안 보조색 (구현 자유값 — developer 조정 가능, 대비만 보장)

상태 토큰만으로는 배경·테두리·본문 텍스트가 정의되지 않는다. 아래는 **권장 보조색**이며 강제 아니다.
단, WCAG AA 대비(본문 텍스트 4.5:1 이상)와 "색상만으로 구분하지 않기" 원칙을 지켜야 한다.

| 역할 | 권장 HEX | 용도 |
|------|----------|------|
| background (보드) | `#f8fafc` | 보드 루트 배경 |
| surface (카드/패널) | `#ffffff` | 카드·상세 패널 표면 |
| border | `#e2e8f0` | 카드·패널 경계 |
| text-primary | `#0f172a` | 제목·상태 텍스트 |
| text-secondary | `#475569` | 보조 설명·evidence 라벨 |
| focus-ring | `#2563eb` | 키보드 포커스 링 (접근성) |

- 각 status 색은 **카드 좌측 상태 바 / 상태 pill 배경 / 아이콘**에 쓰고, 본문 글자색은 항상 `text-primary`로 유지해
  색약 사용자도 텍스트로 상태를 읽을 수 있게 한다.
- `pending`은 전용 카드 modifier가 계약에 없다(§6.3에는 `--complete` / `--missing`만 존재). 따라서 pending 카드는
  **base `.delivery-trace__stage` + `--color-trace-pending` 토큰을 상태 pill/좌측 바에 적용**하는 방식으로 표현한다(§7.3 참조).

---

## 3. 타이포그래피

vanilla-static 규약(외부 의존성 0건) 기준 system font stack을 사용한다.

```css
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | weight | line-height | 용도 |
|------|-----------|--------|-------------|------|
| heading (보드 제목) | 20px | 700 | 1.3 | "납품 추적 상태 보드" |
| card-title (단계명) | 15px | 600 | 1.4 | 요구사항/설계/구현/검토/테스트 |
| status-pill (상태 텍스트) | 13px | 600 | 1.2 | 완료 / 진행 중 / 누락 |
| body (evidence 라벨·설명) | 14px | 400 | 1.5 | 상세 패널 본문 |
| caption (보조 메타) | 12px | 400 | 1.4 | 행 id, 도움말 |
| banner (경고 배너) | 14px | 600 | 1.45 | 누락 evidence 경고 |

- 한글 가독을 위해 `word-break: keep-all`, 상태 pill은 `white-space: nowrap`.
- 최소 본문 14px 이상으로 유지(모바일 320px에서도 축소 금지).

---

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)

```
┌─ #delivery-trace-board (.delivery-trace) ──────────────────────┐
│  [헤더]  납품 추적 상태 보드                                    │
│  [경고]  #evidence-warning-banner (role=alert)  ← 누락 시에만   │
│  [필터]  #trace-stage-filter                                    │
│  [본문]  ┌ 단계 카드 목록 ─┐  ┌ #trace-detail-panel ─┐         │
│          │ .delivery-trace │  │ .delivery-trace__     │         │
│          │   __stage × N   │  │   detail              │         │
│          └─────────────────┘  └───────────────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 spacing

- 섹션 간 수직 간격, 카드 간 간격, 카드-패널 간격 모두 `--space-trace-gap`(16px) 기준.
- 카드 내부 padding 12~16px, 상세 패널 padding 16px 권장.

### 4.3 breakpoint 동작 (계약 §6.6 — 동결)

| breakpoint | 레이아웃 | 규칙 |
|------------|----------|------|
| **≥ 320px** | 세로 스택 (1단) | 헤더→경고→필터→카드 목록→상세 패널 순으로 세로 스택, 가로 overflow 없음 |
| **≥ 768px** | 2단 | 단계 카드 목록(좌) + 상세 패널(우) 2단 레이아웃 |

- 권장 구현: 본문 컨테이너에 `display: grid`. 320px는 `grid-template-columns: 1fr`(1단),
  768px 이상은 `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr)`(2단, 카드 목록 우선폭).
- 320px 미만은 계약상 미보장(§8 EC5) — 세로 스택 best-effort.

---

## 5. 컴포넌트 명세 (props / 상태 / 인터랙션)

> props 타입 정의·export는 developer 소유(`DeliveryTraceBoard.tsx` / `fixtures.ts`). 아래는 **UI 계약을 만족하는 props 형상**을 designer가 명시한 것이며, fixture 스키마(계약 §5)와 정합해야 한다.

### 5.1 `DeliveryTraceBoard` (루트 — `#delivery-trace-board` / `.delivery-trace`)

| prop | 타입 | 설명 |
|------|------|------|
| `fixture` | `TraceFixture` | 계약 §5 스키마. `rows` 0건이면 state=`empty` |
| `selectedRowId?` | `string \| null` | 선택된 행 id. null이면 state=`ready` |
| `stageFilter?` | `'all' \| TraceStage` | 필터 값. 초기값 `'all'` |

- 파생 상태: `empty`(rows 0건) → `evidence-missing`(missing 셀 존재) → `stage-selected`(selectedRowId 존재) → 그 외 `ready`.
- 초기화·취소·실패 시 `selectedRowId=null`, `stageFilter='all'`로 되돌려 state=`ready` 복귀(계약 §4 invariant, §8 EC4).

### 5.2 단계 카드 (`.delivery-trace__stage`)

| prop | 타입 | 설명 |
|------|------|------|
| `stage` | `TraceStage` | requirement/design/implementation/review/test |
| `status` | `'complete' \| 'pending' \| 'missing'` | §7.3 매핑 |
| `evidenceLabel` | `string` | 카드/상세에 노출할 라벨 |
| `evidenceHref` | `string \| null` | null → missing 취급, 링크 대신 상태 텍스트만 |
| `selected` | `boolean` | true면 `aria-current="step"` |

- modifier: status=complete → `.delivery-trace__stage--complete`, status=missing → `.delivery-trace__stage--missing`.
  pending은 base 클래스 + pending 토큰(§2.2 참고).
- 상태 표현: 좌측 상태 바(status 토큰) + 상태 pill(텍스트 "완료/진행 중/누락") + 단계명 텍스트.

**인터랙션 / 상태**

| 상호작용 | 결과 |
|----------|------|
| hover | 카드 표면 elevation(그림자) 강조 — 색상 의미 변화 없음 |
| focus (Tab) | `focus-ring`(2px, `#2563eb`) 노출, 키보드 도달 가능 |
| click / Enter / Space | 해당 행 선택 → state=`stage-selected`, 카드에 `aria-current="step"`, 상세 패널 갱신 |
| ↑/↓ 또는 ←/→ | 카드 목록 내 이동(roving focus 권장) |
| Esc | 선택 해제 → state=`ready`, 상세 패널 초기값 |

### 5.3 상태 필터 (`#trace-stage-filter`)

- 역할: 단계(status/stage) 필터. 키보드(Tab/Enter/화살표)만으로 조작 가능해야 한다(계약 §6.5).
- 권장 마크업: `<fieldset>` + 라디오형 세그먼트 또는 네이티브 `<select>`(둘 다 키보드 접근성 확보 용이).
- 빈 상태(empty)에서도 조작 가능한 초기값(`'all'`)으로 유지(§8 EC1/EC7).

### 5.4 상세 패널 (`#trace-detail-panel` / `.delivery-trace__detail`)

- 선택된 단계의 evidence 라벨·링크·상태 텍스트를 노출.
- 미선택(ready/empty) 시: "단계를 선택하면 상세가 표시됩니다" 안내(placeholder), 조작성 유지.
- `evidenceHref===null` 셀: 링크 대신 "누락" 상태 텍스트만 노출(§8 EC6).

### 5.5 경고 배너 (`#evidence-warning-banner`)

- 조건부 렌더: missing 셀이 **하나 이상** 있을 때만 DOM에 존재. 모두 채워지면 DOM에서 제거(계약 §3 경고 규칙, §8 EC2).
- `role="alert"` + 명시적 `aria-label="누락 evidence 경고"`.
- 텍스트: `누락 evidence: {단계명 나열}` — 단계명은 한국어(요구사항/설계/구현/검토/테스트).
- 색상: `--color-trace-missing` 계열 배경/테두리 + 어두운 텍스트로 대비 확보. 아이콘(⚠)은 텍스트 보조로만.

---

## 6. 계약 selector 요약 (developer 참조용 — 동결, 재정의 금지)

### 6.1 DOM ID

| domId | 용도 |
|-------|------|
| `delivery-trace-board` | 보드 루트 컨테이너 |
| `trace-stage-filter` | 상태 필터 컨트롤 |
| `trace-detail-panel` | 선택 단계 상세 패널 |
| `evidence-warning-banner` | 누락 evidence 경고 배너 (role=alert) |

### 6.2 CSS class

| cssClass | 용도 |
|----------|------|
| `delivery-trace` | 보드 스타일 루트 |
| `delivery-trace__stage` | 단계 카드 |
| `delivery-trace__stage--complete` | 완료 단계 카드 modifier |
| `delivery-trace__stage--missing` | 누락 단계 카드 modifier |
| `delivery-trace__detail` | 상세 패널 내부 |

### 6.3 상태(state)

`ready` · `stage-selected` · `evidence-missing` · `empty` (계약 §4 상태 모델 준수).

---

## 7. 상태 텍스트 & 표기 규칙 (동결 — 계약 §7 그대로)

### 7.1 status/state → 텍스트

| status/state | 화면 텍스트 (한국어 primary) | 접근성 이름 (aria-label) |
|--------------|------------------------------|--------------------------|
| `complete` | 완료 | "완료(Complete)" |
| `pending` | 진행 중 | "진행 중(Pending)" |
| `missing` | 누락 | "누락(Missing)" |
| state=`ready` | 준비됨 | "준비됨(Ready)" |
| state=`stage-selected` | 선택됨 | "선택됨(Selected)" |
| state=`empty` | 추적 항목 없음 | "추적 항목 없음(Empty)" |
| 경고 배너 | "누락 evidence: {단계명 나열}" | "누락 evidence 경고" |

### 7.2 단계명 (TraceStage → 화면 텍스트)

`requirement`=요구사항, `design`=설계, `implementation`=구현, `review`=검토, `test`=테스트.

### 7.3 status → 시각 매핑 (색상 + 텍스트 동시 노출)

| status | 토큰 색 | 카드 modifier | 상태 pill 텍스트 | 보조 아이콘(텍스트 대체 아님) |
|--------|---------|---------------|------------------|-------------------------------|
| complete | `--color-trace-complete` `#15803d` | `--complete` | 완료 | ✓ |
| pending | `--color-trace-pending` `#a16207` | (base) | 진행 중 | … |
| missing | `--color-trace-missing` `#b91c1c` | `--missing` | 누락 | ⚠ |

> **핵심 접근성 원칙**: 색은 상태 pill·좌측 바·아이콘에만 쓰고, 상태 의미는 **항상 화면 텍스트**로 병기한다.
> 색상만으로 상태를 구분하지 않는다(계약 §6.5).

---

## 8. mockup 참조 (임베드 시각 시뮬레이션)

> 본 task는 런타임 HTML을 생성하지 않으므로(§AC), mockup을 별도 파일이 아닌 아래 코드 블록으로 임베드한다.
> developer는 이를 **참조 가이드**로만 사용하며 픽셀 단위 일치 의무는 없다. placeholder 콘텐츠 사용.

### 8.1 데스크톱(≥768px) 2단 — evidence-missing 상태 와이어프레임

```
┌ #delivery-trace-board .delivery-trace ─────────────────────────────────────┐
│  납품 추적 상태 보드                                                        │
│  ┌ #evidence-warning-banner role=alert ─────────────────────────────────┐  │
│  │ ⚠ 누락 evidence: 검토, 테스트                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌ #trace-stage-filter ──────────────────────────┐                          │
│  │ [ 전체 ] [ 완료 ] [ 진행 중 ] [ 누락 ]         │                          │
│  └────────────────────────────────────────────────┘                          │
│                                                                             │
│  ┌ 단계 카드 목록 ─────────────────┐   ┌ #trace-detail-panel ──────────┐   │
│  │ ▎.stage--complete  요구사항      │   │ .delivery-trace__detail        │   │
│  │ ▎[완료 ✓]  R1 추적 카드 렌더     │   │  선택: 설계 (진행 중)          │   │
│  │─────────────────────────────────│   │  evidence: BF-1234 카드 명세   │   │
│  │ ▎.stage (pending)  설계 ◀선택    │   │  [ evidence 링크 열기 ]        │   │
│  │ ▎[진행 중 …]  aria-current=step  │   │                                │   │
│  │─────────────────────────────────│   └────────────────────────────────┘   │
│  │ ▎.stage (pending)  구현          │                                        │
│  │ ▎[진행 중 …]                     │                                        │
│  │─────────────────────────────────│                                        │
│  │ ▎.stage--missing  검토           │                                        │
│  │ ▎[누락 ⚠]  evidenceHref=null     │                                        │
│  │─────────────────────────────────│                                        │
│  │ ▎.stage--missing  테스트         │                                        │
│  │ ▎[누락 ⚠]                        │                                        │
│  └─────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 모바일(≥320px) 세로 스택 — empty 상태

```
┌ #delivery-trace-board ─────────────┐
│ 납품 추적 상태 보드                │
│ (경고 배너 없음: 누락 셀 0)        │
│ ┌ #trace-stage-filter ───────────┐ │
│ │ [전체][완료][진행 중][누락]    │ │
│ └────────────────────────────────┘ │
│ ┌ 빈 상태 안내 ──────────────────┐ │
│ │ 추적 항목 없음                 │ │
│ │ 표시할 추적 데이터가 없습니다. │ │
│ └────────────────────────────────┘ │
│ ┌ #trace-detail-panel ───────────┐ │
│ │ 단계를 선택하면 상세가 표시됩니다 │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### 8.3 시각 참조용 HTML 스니펫 (self-contained, 참조 전용 — 런타임 산출물 아님)

> 아래 코드 블록은 시안을 눈으로 확인하기 위한 **참조용 스니펫**이다. 실제 구현은 developer가 계약대로 작성한다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>납품 추적 상태 보드 — mockup 참조</title>
  <style>
    :root {
      /* 동결 토큰 (계약 §6.4) */
      --color-trace-complete: #15803d;
      --color-trace-missing: #b91c1c;
      --color-trace-pending: #a16207;
      --space-trace-gap: 16px;
      /* 시안 보조색 (구현 자유값) */
      --bg: #f8fafc; --surface: #fff; --border: #e2e8f0;
      --text-primary: #0f172a; --text-secondary: #475569; --focus: #2563eb;
      --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
    }
    body { font-family: var(--font-sans); background: var(--bg); color: var(--text-primary); margin: 0; padding: var(--space-trace-gap); }
    .delivery-trace { display: flex; flex-direction: column; gap: var(--space-trace-gap); max-width: 960px; margin: 0 auto; }
    .delivery-trace h1 { font-size: 20px; font-weight: 700; margin: 0; }
    #evidence-warning-banner { border: 1px solid var(--color-trace-missing); background: #fef2f2;
      color: var(--color-trace-missing); font-weight: 600; padding: 12px 16px; border-radius: 8px; }
    #trace-stage-filter { display: flex; gap: 8px; flex-wrap: wrap; }
    #trace-stage-filter button { font: inherit; padding: 6px 14px; border: 1px solid var(--border);
      background: var(--surface); border-radius: 999px; cursor: pointer; }
    #trace-stage-filter button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    .trace-body { display: grid; grid-template-columns: 1fr; gap: var(--space-trace-gap); }
    @media (min-width: 768px) { .trace-body { grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); } }
    .stage-list { display: flex; flex-direction: column; gap: var(--space-trace-gap); }
    .delivery-trace__stage { display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: var(--surface); border: 1px solid var(--border); border-left: 6px solid var(--color-trace-pending);
      border-radius: 8px; cursor: pointer; }
    .delivery-trace__stage:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    .delivery-trace__stage[aria-current="step"] { box-shadow: 0 0 0 2px var(--focus); }
    .delivery-trace__stage--complete { border-left-color: var(--color-trace-complete); }
    .delivery-trace__stage--missing { border-left-color: var(--color-trace-missing); }
    .stage-name { font-size: 15px; font-weight: 600; }
    .status-pill { font-size: 13px; font-weight: 600; padding: 2px 10px; border-radius: 999px;
      color: #fff; white-space: nowrap; margin-left: auto; }
    .status-pill.complete { background: var(--color-trace-complete); }
    .status-pill.pending  { background: var(--color-trace-pending); }
    .status-pill.missing  { background: var(--color-trace-missing); }
    .delivery-trace__detail { background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 16px; font-size: 14px; }
  </style>
</head>
<body>
  <main id="delivery-trace-board" class="delivery-trace">
    <h1>납품 추적 상태 보드</h1>

    <div id="evidence-warning-banner" role="alert" aria-label="누락 evidence 경고">
      ⚠ 누락 evidence: 검토, 테스트
    </div>

    <div id="trace-stage-filter" role="group" aria-label="상태 필터">
      <button type="button" aria-pressed="true">전체</button>
      <button type="button" aria-pressed="false">완료</button>
      <button type="button" aria-pressed="false">진행 중</button>
      <button type="button" aria-pressed="false">누락</button>
    </div>

    <div class="trace-body">
      <div class="stage-list">
        <div class="delivery-trace__stage delivery-trace__stage--complete" tabindex="0">
          <span class="stage-name">요구사항</span>
          <span class="status-pill complete" aria-label="완료(Complete)">완료 ✓</span>
        </div>
        <div class="delivery-trace__stage" tabindex="0" aria-current="step">
          <span class="stage-name">설계</span>
          <span class="status-pill pending" aria-label="진행 중(Pending)">진행 중 …</span>
        </div>
        <div class="delivery-trace__stage" tabindex="0">
          <span class="stage-name">구현</span>
          <span class="status-pill pending" aria-label="진행 중(Pending)">진행 중 …</span>
        </div>
        <div class="delivery-trace__stage delivery-trace__stage--missing" tabindex="0">
          <span class="stage-name">검토</span>
          <span class="status-pill missing" aria-label="누락(Missing)">누락 ⚠</span>
        </div>
        <div class="delivery-trace__stage delivery-trace__stage--missing" tabindex="0">
          <span class="stage-name">테스트</span>
          <span class="status-pill missing" aria-label="누락(Missing)">누락 ⚠</span>
        </div>
      </div>

      <aside id="trace-detail-panel" class="delivery-trace__detail" aria-live="polite">
        <p><strong>선택:</strong> 설계 (진행 중)</p>
        <p><strong>evidence:</strong> BF-1234 카드 레이아웃 명세</p>
        <p><a href="#">evidence 링크 열기</a></p>
      </aside>
    </div>
  </main>
</body>
</html>
```

---

## 9. dev 구현 가이드 (developer BF-1235 단계별 지침)

> 파일 소유자: `DeliveryTraceBoard.tsx` / `fixtures.ts` / `index.ts` / `styles.css` = developer(additive).
> 아래는 계약 selector·토큰을 그대로 반영하는 구현 순서 권장안이다.

1. **토큰 정의** — `styles.css` `:root`에 동결 토큰 4개(`--color-trace-complete/-missing/-pending`, `--space-trace-gap`)를
   **정확한 HEX·값**으로 선언. 하드코딩 상태색 금지, 토큰 변수 참조.
2. **루트 마크업** — 보드 루트에 `id="delivery-trace-board"` + `class="delivery-trace"`. 헤더/배너/필터/본문 구조는 §4.1.
3. **단계 카드** — 각 카드 `.delivery-trace__stage`, status에 따라 `--complete`/`--missing` modifier 부여(pending은 base).
   상태 pill 텍스트(완료/진행 중/누락)와 aria-label(§7)을 항상 렌더.
4. **필터** — `id="trace-stage-filter"`, 키보드(Tab/Enter/화살표) 접근 가능한 컨트롤. 초기값 `all`.
5. **상세 패널** — `id="trace-detail-panel"` + `.delivery-trace__detail`. 선택 시 갱신, `aria-live="polite"` 권장.
   선택 카드에 `aria-current="step"`.
6. **경고 배너** — missing 셀 존재 시에만 `id="evidence-warning-banner"` + `role="alert"` + `aria-label="누락 evidence 경고"`
   렌더, 없으면 DOM에서 제거.
7. **반응형** — 본문 grid: 320px 1단(세로 스택, 가로 overflow 금지), 768px 이상 2단(카드 목록 + 상세).
8. **상태 복귀** — 초기화·취소·Esc 시 `selectedRowId=null`·`filter=all`로 state=`ready` 복귀(§5.1, 계약 §4).
9. **결정론** — fixture rows·stages 순서 고정, 랜덤/시간 의존 금지(계약 §5, AC6).

**권장 CSS 변수·클래스명**: 위 §6 표의 값 그대로. 신규 selector 발명 금지(계약 재정의 방지).

---

## 10. Self-critique (PR 제출 전 자기 점검)

1. **AC 매핑** — 계약 AC1~AC7을 시안 섹션에 매핑: AC1→§4/§5.1/§7.3, AC2→§5.5, AC3→§5.2, AC4→§5·§7.3(색+텍스트),
   AC5→§4.3, AC6→§9-9, AC7→§8.2/§5.3·§5.4. 누락 없음.
2. **dev 구현 가이드** — §9에 토큰→마크업→카드→필터→상세→배너→반응형→복귀→결정론 순 단계 제공. selector·토큰 원문 유지.
3. **기존 요소 보존** — 신규 route 시안이며 기존 design 문서·selector를 변경하지 않음. 동결 4토큰/4 domId/5 cssClass/4 state 그대로 소비.
4. **컴포넌트 매핑** — 5개 컴포넌트(보드·카드·필터·상세·배너)를 계약 domId/cssClass와 1:1 매핑(§5, §6).
5. **모호함 flag** — (a) `pending` 전용 카드 modifier가 계약에 없어 base 클래스 + pending 토큰으로 표현하도록 명시(§2.2/§7.3).
   (b) 배경/테두리/본문색은 계약 미정의 → §2.2 보조색을 "권장(비강제)"로 표기, developer 조정 여지 남김.
   (c) 필터 세부 인터랙션(세그먼트 vs select)은 접근성 조건만 고정하고 마크업은 developer 재량(§5.3).

---

## 11. Ownership / 범위 fail-honest 노트

- 본 task 산출물은 이 markdown 1건. 런타임 파일(`*.tsx`/`*.css`/`*.ts`/`index.html`)은 designer가 생성하지 않는다(AC 준수).
- repo convention capsule의 요청 route `expected_entry_path`(`demo/delivery-trace-canary/index.html`)는 designer owned_paths 밖이며,
  entry/구현 소유권은 frozen blueprint의 file_owner(developer)를 따른다. designer는 구현 경로를 만들지 않는다.
- 검증 권위 명령(`node --test demo/delivery-trace-canary/tests/*.test.js`)의 대상 파일은 developer/tester 소유이며 본 docs-only 변경에는 실행 대상 런타임이 없다.
