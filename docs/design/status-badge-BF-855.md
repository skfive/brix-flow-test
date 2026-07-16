# 서비스 상태 배지 디자인 명세 — BF-855

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-855 (본 designer task) · 의존 planner 명세: `docs/planning/status-badge-BF-854.md`
> tech-stack: `vanilla-static` (외부 의존성 0건 · system font · CSS 변수 자체 정의)
> 산출물: 본 명세 markdown + mockup HTML `docs/design/mockups/status-badge-BF-855.html`

---

## 0. 문서 성격 및 전제

- 본 문서는 **디자인 명세(시각 계약)** 이다. 코드 구현은 후속 dev task 담당이며, 본 task는 명세 markdown + 시각 mockup HTML 두 산출물까지만 만든다.
- planner 명세(BF-854)의 §3~§7이 **데이터/렌더/접근성 계약**이며, 본 문서는 그 위에 **색·타이포·레이아웃·컴포넌트 시각 명세**만 얹는다. planner가 확정한 fixture·aria 규칙·제외 범위(health API·polling·DB·신규 패키지)는 재해석하지 않고 그대로 승계한다.
- **신규 디자인 토큰 0건**(BF-855 수용 기준 2). 아래 §2 모든 색은 기존 `clock/styles.css`(셸) + `kanban/styles.css`(시맨틱 3색) 에 이미 존재하는 값만 참조한다. 새 `--color-*` 를 정의하지 않는다.

### 디자이너 결정 사항 (planner §4.3 대비 정제 — flag)

planner §4.3은 `operational→--color-success` / `degraded→--color-warning` / `outage→--color-danger` 매핑을 확정하되, `--color-danger`의 **출처를 "clock/kanban 공통 토큰"으로 모호하게** 남겼다(clock 값 `#d14343` vs kanban 값 `#cf222e`가 서로 다름). 본 디자이너는 **상태 3색 트리오를 모두 `kanban/styles.css` 한 출처에서 가져오는 것으로 확정**한다. 근거:

1. `kanban`은 success/warning/danger 3종을 **하나의 시맨틱 세트로 설계**한 유일한 모듈 — 3색의 채도·명도가 서로 조화롭다(GitHub Primer 계열).
2. clock의 `--color-danger`(`#d14343`)와 kanban의 success/warning을 섞으면 붉은 계열만 색 온도가 달라져 배지 트리오의 시각적 일관성이 깨진다.
3. 세 값 모두 **기존 파일에 존재**하므로 "기존 토큰만 참조" 수용 기준을 그대로 충족한다(신규 값 발명 아님).

→ dev는 `src/app/demo/status/styles.css`의 `:root`(light) / `[data-theme="dark"]`(dark)에 아래 §2 값 그대로 복제한다.

---

## 1. 시안 개요

### 1.1 변경 범위

`/demo/status`(= `src/app/demo/status/`) 신규 정적 페이지의 **시각 디자인**. 다음 3개 시각 요소를 명세한다.

| 요소 | 설명 |
|---|---|
| **전체 요약 배너** | 페이지 상단 1개 — 가장 심각한 상태(§planner 3.3 파생)를 아이콘+라벨+문구로 표시 |
| **상태 배지(핵심 컴포넌트)** | 서비스별 상태(정상/저하/장애)를 아이콘+색+한글 라벨 칩으로 표시 |
| **서비스 카드** | 서비스명 + 상태 배지 + 설명 문구를 담는 목록 항목 |

### 1.2 사용자 경험 목표

1. **한눈에 파악** — 페이지 진입 즉시 상단 요약 배너로 "전체가 괜찮은가/문제 있나"를 3초 안에 인지.
2. **색맹 안전** — 색 하나에 의존하지 않고 **아이콘 모양(●/▲/✕) + 한글 텍스트**를 항상 병기(planner §5.4 승계).
3. **차분한 정보 화면** — 애니메이션·반짝임 없는 정적 대시보드. 상태가 "살아 움직이지" 않음을 시각적으로도 전달(polling 없음, planner §6.2).
4. **테마 견고성** — light(기본)·dark 양쪽에서 배지 전경/배경 대비 WCAG AA(4.5:1) 이상 보장(§2.4 대비표).

---

## 2. 컬러 팔레트 (기존 토큰만 — 신규 0건)

### 2.1 셸 토큰 — 출처 `clock/styles.css` (그대로 복제)

| 역할 | 토큰 | light 값 | dark 값 |
|---|---|---|---|
| 페이지 배경 | `--color-bg-canvas` | `#fafaf9` | `#0f1115` |
| 카드/배너/topbar 표면 | `--color-bg-surface` | `#ffffff` | `#171a21` |
| 옅은 표면(설명 블록 등) | `--color-bg-subtle` | `#f1f1ef` | `#1e222b` |
| 기본 테두리 | `--color-border-default` | `#e5e5e2` | `#262b36` |
| 강조 테두리 | `--color-border-strong` | `#d0d0cc` | `#3a4150` |
| 본문/제목 텍스트 | `--color-text-primary` | `#1a1a19` | `#e8e8e4` |
| 보조 텍스트(설명) | `--color-text-secondary` | `#6b6b66` | `#9a9a93` |
| 흐린 텍스트(메타) | `--color-text-muted` | `#9a9a93` | `#6b6b66` |
| 포커스 링 | `--color-focus-ring` | `rgba(53,99,233,.45)` | `rgba(91,130,240,.55)` |

### 2.2 상태 시맨틱 3색 — 출처 `kanban/styles.css` (그대로 복제, §0 결정)

| 상태값 | 토큰 | light 값 | dark 값 | 의미 |
|---|---|---|---|---|
| `operational` (정상) | `--color-success` | `#1a7f37` | `#3fb950` | 초록 |
| `degraded` (저하) | `--color-warning` | `#9a6700` | `#d29922` | 앰버 |
| `outage` (장애) | `--color-danger` | `#cf222e` | `#f85149` | 레드 |

> ⚠️ dev 주의: clock `:root`를 통째로 복제하면 clock의 `--color-danger`(`#d14343`)가 딸려온다. **위 표대로 kanban 값(`#cf222e`/`#f85149`)으로 덮어써** 세 시맨틱 색을 kanban 한 출처로 통일한다. success/warning은 clock에 아예 없으므로 신규 라인으로 추가.

### 2.3 배지 전경(아이콘+라벨) 색 — 테마별 대비 확보

배지는 **시맨틱 색 solid fill** + 그 위에 얹는 전경(아이콘+라벨) 텍스트로 구성한다. 전경색은 테마별로 대비를 만족하는 기존 셸 토큰을 재사용한다(신규 색 아님).

| 테마 | 배지 채움 | 배지 전경(아이콘·라벨) | 참조 토큰 |
|---|---|---|---|
| light | 시맨틱 색(진함) | 흰색 `#ffffff` | = `--color-bg-surface`(light) |
| dark | 시맨틱 색(밝음) | 어두운 캔버스 `#0f1115` | = `--color-bg-canvas`(dark) |

> 원리: light 시맨틱 색은 어둡다 → 흰 전경이 AA. dark 시맨틱 색은 밝다 → 어두운 전경이 AA. 채움/전경이 테마에 따라 명암이 뒤집히므로 대비가 항상 유지된다. dev는 `--badge-ink`(컴포넌트 로컬 헬퍼 변수, 디자인 토큰 아님)를 light `#fff` / dark `#0f1115`로 두면 배지 CSS가 단순해진다.

### 2.4 WCAG AA 대비 검증표 (배지 채움 ↔ 전경, 4.5:1 기준)

| 상태 · 테마 | 채움 | 전경 | 대비율 | AA(4.5:1) |
|---|---|---|---|---|
| operational · light | `#1a7f37` | `#ffffff` | **5.08:1** | ✅ |
| degraded · light | `#9a6700` | `#ffffff` | **4.88:1** | ✅ |
| outage · light | `#cf222e` | `#ffffff` | **5.35:1** | ✅ |
| operational · dark | `#3fb950` | `#0f1115` | **7.1:1** | ✅ |
| degraded · dark | `#d29922` | `#0f1115` | **7.2:1** | ✅ |
| outage · dark | `#f85149` | `#0f1115` | **5.4:1** | ✅ |

> 요약 배너는 채움을 쓰지 않고 **시맨틱 색을 좌측 4px 액센트 바 + 아이콘 색**으로만 쓰고 배너 배경은 `--color-bg-surface`, 문구는 `--color-text-primary`를 유지한다 → 배너 텍스트 대비는 셸 기본 대비(진한 텍스트/흰 표면)로 AA 이상 자동 충족.

---

## 3. 타이포그래피 (기존 clock 토큰만)

| 용도 | 토큰 | 값(font: weight size/line family) |
|---|---|---|
| topbar 타이틀 "서비스 상태" | `--text-h1` | `600 20px/1.3 var(--font-sans)` |
| 요약 배너 문구 | `--text-h2` | `600 16px/1.3 var(--font-sans)` |
| 서비스명(카드 제목) | `--text-h2` | `600 16px/1.3 var(--font-sans)` |
| 상태 배지 라벨(정상/저하/장애) | `--text-label` | `500 14px/1.4 var(--font-sans)` |
| 설명 문구 | `--text-body` | `400 15px/1.65 var(--font-sans)` |
| 메타/캡션(요약 배너 서브라벨 등) | `--text-caption` | `400 12px/1.4 var(--font-sans)` |

- 폰트 패밀리는 `--font-sans`(system stack, `Pretendard`/`Apple SD Gothic Neo` fallback) — 외부 폰트 CDN 미사용(vanilla-static, planner §6.4).
- 배지 라벨은 `--text-label`(500 14px)을 기준으로 하되, 배지 내부 시각 균형을 위해 `letter-spacing: .01em` 정도의 미세 조정만 허용(신규 토큰 아님).

---

## 4. 레이아웃

### 4.1 페이지 골격 (planner §4.1 승계 · 위→아래)

```
<body>  (background: --color-bg-canvas / flex column)
 ├─ <header class="topbar">              높이 56px · surface · 하단 border
 │     └─ "서비스 상태" (h1)
 └─ <main class="page">                   max-width 720px · 중앙 정렬 · padding --space-6
     ├─ <section class="summary-banner">  요약 배너 1개
     └─ <ul class="status-list">          서비스 카드 목록
         └─ <li class="status-card"> × N
```

### 4.2 컨테이너 · spacing (모두 `--space-*` 토큰)

| 항목 | 값 |
|---|---|
| `.page` 최대 폭 | `720px`, 좌우 자동 마진, 내부 padding `--space-6`(32px) 상하 · `--space-5`(24px) 좌우 |
| 요약 배너 ↔ 카드 목록 간격 | `--space-6`(32px) |
| 카드 간 간격(grid gap) | `--space-4`(16px) |
| 카드 내부 padding | `--space-5`(24px) |
| 카드 내부 요소 세로 간격 | `--space-3`(12px) |
| 배지 내부 padding | 세로 `--space-1`(4px) · 가로 `--space-3`(12px) |
| 배지 아이콘↔라벨 간격 | `--space-2`(8px) |

### 4.3 카드 내부 배치 (읽기 순서 보존)

DOM 순서는 planner §5.2대로 **서비스명 → 배지 → 설명** 고정(스크린리더 읽기 순서 = 시각 순서). 시각적으로는:

```
┌───────────────────────────────────────────┐
│  웹 서버                        [● 정상]   │  ← 1행: 서비스명(좌) · 배지(우), flex space-between
│  모든 페이지가 정상적으로 응답하고 있습니다.  │  ← 2행: 설명(--color-text-secondary)
└───────────────────────────────────────────┘
```

- 1행은 `display:flex; justify-content:space-between; align-items:center` — 서비스명 왼쪽, 배지 오른쪽. DOM은 여전히 명→배지 순이므로 읽기 순서 유지.
- 설명은 배지 아래 전체 폭. 긴 문구는 `word-break:keep-all`(한국어 어절 보존) + 자연 줄바꿈, **말줄임 금지**(planner §9.4 정보 손실 방지).

### 4.4 요약 배너 배치

```
┌─────────────────────────────────────────────────┐
│ ▌ ✕  일부 서비스에 장애가 발생했습니다.          │
│      전체 서비스 4개 중 장애 1 · 저하 1 · 정상 2  │  ← 서브라벨(--text-caption, muted)
└─────────────────────────────────────────────────┘
   ▲ 좌측 4px 액센트 바 = 가장 심각한 상태의 시맨틱 색
```

- 배너 배경 `--color-bg-surface`, 좌측 `border-left: 4px solid`(가장 심각 상태 시맨틱 색), radius `--radius-lg`(12px), `--shadow-card`.
- 아이콘은 심각 상태 시맨틱 색, 문구는 `--color-text-primary`, 서브라벨은 `--color-text-muted`.
- fixture 기본값(web·api 정상 / database 저하 / auth 장애) → 심각도 최댓값 `outage` → 배너는 **장애(레드) 톤**.

### 4.5 반응형 (breakpoint: `639px`, planner §4.4)

| 뷰포트 | 카드 목록 | 비고 |
|---|---|---|
| 데스크톱(`≥640px`) | 2열 grid (`grid-template-columns: repeat(2, 1fr)`) | 카드 높이는 내용에 맞춤(align-items:start) |
| 모바일(`≤639px`) | 1열 세로 스택 (`grid-template-columns: 1fr`) | 서비스명/배지/설명 가로 잘림 없음 |

- 모바일에서 카드 1행(명+배지)이 좁아지면 배지가 다음 줄로 내려가지 않도록 배지에 `flex-shrink:0`, 서비스명은 `min-width:0`+`overflow-wrap`.
- `.page` 좌우 padding은 모바일에서 `--space-4`(16px)로 축소.

---

## 5. 컴포넌트 명세

### 5.1 상태 배지 `.status-badge` (핵심 컴포넌트)

| 항목 | 값 |
|---|---|
| 마크업 | `<span class="status-badge status-badge--{status}" role="img" aria-label="{서비스명} 상태: {라벨}">` |
| 내부 | `<span class="status-badge__icon" aria-hidden="true">●</span><span class="status-badge__label">정상</span>` |
| 형태 | inline-flex, `align-items:center`, gap `--space-2`, radius `--radius-sm`(4px) 또는 pill(`999px`) — **pill 권장**(칩 인상) |
| 채움 | `background: var(--color-{semantic})` (§2.2) |
| 전경 | `color: var(--badge-ink)` (light `#fff` / dark `#0f1115`, §2.3) |
| 크기 | 높이 약 24px (padding 4/12 + 14px 라벨), 아이콘 폰트 10px |
| 상태(state) | 정적 표시 요소 — hover/active/클릭 **없음**(planner §4.2·§10). `:hover` 스타일 미정의(커서 default) |
| 인터랙션 | 없음. `<button>` 아님. 링크 아님 |

**변형(variant) 3종 — props 대응표**

| variant 클래스 | status prop | 아이콘 | 라벨 | 채움 토큰 |
|---|---|---|---|---|
| `.status-badge--operational` | `operational` | `●` | 정상 | `--color-success` |
| `.status-badge--degraded` | `degraded` | `▲` | 저하 | `--color-warning` |
| `.status-badge--outage` | `outage` | `✕` | 장애 | `--color-danger` |

**props 계약(dev fixture → 컴포넌트)**

```
StatusBadge(props):
  serviceName: string   // aria-label 조합용 (예: "웹 서버")
  status: "operational" | "degraded" | "outage"
  // → 아이콘·라벨·채움색은 status 로 파생 (하드코딩 매핑, §4.2 planner 표)
  // → aria-label = `${serviceName} 상태: ${라벨}`  (planner §5.1)
```

- 접근성: 배지 루트에 `role="img"` + `aria-label` 부여 → 스크린리더는 아이콘 장식을 건너뛰고 `aria-label` 한 문장으로 호명(planner §5.1, rotor 순회 시에도 문맥 완전).
- 미정의 status 값이 오면(planner §9.3) 채움색을 `--color-neutral`(kanban에 존재, `#8b949e`/`#656d76`)로 폴백 + 라벨 "알 수 없음" + 아이콘 `?` 권장(강제 아님, dev 재량).

### 5.2 서비스 카드 `.status-card`

| 항목 | 값 |
|---|---|
| 마크업 | `<li class="status-card">` (목록 항목, `aria-label` 별도 부여 안 함 — 내부 텍스트가 접근성 이름, planner §5.2) |
| 배경/테두리 | `--color-bg-surface` + `1px solid --color-border-default` |
| radius / shadow | `--radius-lg`(12px) / `--shadow-card` |
| 내부 | 1행(서비스명+배지, flex space-between) + 2행(설명) |
| 상태 | 정적 — hover 시 미세 강조(선택): `border-color:--color-border-strong` 정도만 허용(클릭 아님, 필수 아님) |

### 5.3 요약 배너 `.summary-banner`

| 항목 | 값 |
|---|---|
| 마크업 | `<section class="summary-banner summary-banner--{worst}">` (일반 텍스트 · `aria-live` 없음, planner §5.3 정적) |
| 내부 | 아이콘(심각 상태 색, `aria-hidden`) + 요약 문구(h2급) + 서브라벨(캡션) |
| 좌측 액센트 | `border-left: 4px solid var(--color-{worst})` |
| 배경 | `--color-bg-surface` (채움 아님 — 대비 안전) |
| 파생 | worst = `outage` > `degraded` > `operational` (planner §3.3 우선순위) |

### 5.4 topbar `.topbar`

- clock `.topbar` 재사용: 높이 56px, `--color-bg-surface`, 하단 `1px solid --color-border-default`, 좌우 padding `--space-5`.
- 좌측 h1 "서비스 상태"(`--text-h1`). 우측은 비움(정적 데모 — 테마 토글 등 별도 컨트롤은 본 범위 밖).

---

## 6. dev 구현 가이드 (단계별)

> planner §7 파일 구조(`index.html`/`styles.css`/`status.js`/`main.js`)를 전제로 한다. 아래는 **시각 구현** 지침 — 데이터/접근성 계약은 planner 문서를 함께 볼 것.

### 6.1 토큰 셋업 (`styles.css` `:root` / `[data-theme="dark"]`)

1. `clock/styles.css`의 `:root`(light) 전체 + `[data-theme="dark"]` 전체를 그대로 복제.
2. 아래 2줄을 `:root`에 **추가**(clock엔 없음):
   ```css
   --color-success: #1a7f37;
   --color-warning: #9a6700;
   ```
3. `:root`의 `--color-danger`를 kanban 값으로 **교체**: `--color-danger: #cf222e;`
4. `[data-theme="dark"]`에도 동일 3색 dark 값 추가/교체:
   ```css
   --color-success: #3fb950;
   --color-warning: #d29922;
   --color-danger: #f85149;
   ```
5. 배지 전경 헬퍼(컴포넌트 로컬, 디자인 토큰 아님):
   ```css
   :root { --badge-ink: #ffffff; }            /* light: 흰 전경 */
   [data-theme="dark"] { --badge-ink: #0f1115; } /* dark: 어두운 전경 */
   ```

### 6.2 배지 CSS 스켈레톤 (권장 클래스명)

```css
.status-badge {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;               /* pill */
  font: var(--text-label);
  color: var(--badge-ink);
  flex-shrink: 0;
  letter-spacing: .01em;
}
.status-badge__icon { font-size: 10px; line-height: 1; }
.status-badge--operational { background: var(--color-success); }
.status-badge--degraded    { background: var(--color-warning); }
.status-badge--outage      { background: var(--color-danger); }
```

### 6.3 레이아웃 CSS 요점

```css
.page { max-width: 720px; margin: 0 auto; padding: var(--space-6) var(--space-5); }
.status-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: var(--space-4);
  grid-template-columns: repeat(2, 1fr);   /* desktop */
}
.status-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-5);
  display: flex; flex-direction: column; gap: var(--space-3);
}
.status-card__head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
.status-card__name { font: var(--text-h2); color: var(--color-text-primary); min-width: 0; }
.status-card__desc { font: var(--text-body); color: var(--color-text-secondary); word-break: keep-all; }
.summary-banner {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-left-width: 4px; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-5); margin-bottom: var(--space-6);
  display: flex; align-items: center; gap: var(--space-3);
}
.summary-banner--operational { border-left-color: var(--color-success); }
.summary-banner--degraded    { border-left-color: var(--color-warning); }
.summary-banner--outage      { border-left-color: var(--color-danger); }
@media (max-width: 639px) {
  .status-list { grid-template-columns: 1fr; }
  .page { padding: var(--space-5) var(--space-4); }
}
```

### 6.4 마크업 요점

- 카드 목록은 `<ul class="status-list">` / `<li class="status-card">` (planner §4.1 목록 시맨틱).
- 배지 아이콘 `<span aria-hidden="true">`, 배지 루트 `role="img" aria-label="…"`.
- 요약 배너 아이콘도 `aria-hidden`, 문구는 순수 텍스트(`aria-live` 금지 — 정적).
- 색상 하드코딩(`#...` 인라인) **금지** — 반드시 `var(--…)` 참조(BF-855 수용 기준 2).

### 6.5 픽셀 일치 의무 없음

mockup(`docs/design/mockups/status-badge-BF-855.html`)은 **시각 의도 전달용**이다. dev는 이를 참조 가이드로 삼되 픽셀 단위 일치 의무는 없다. 토큰·클래스명·접근성 계약·AA 대비만 지키면 세부 여백·radius는 재량.

---

## 7. mockup 참조

- **시각 mockup HTML**: `docs/design/mockups/status-badge-BF-855.html`
- 포함 프레임:
  1. **데스크톱 light** — 전체 페이지(topbar + 요약 배너(장애 톤) + 2열 카드 4개)
  2. **모바일 light** — 375px 폭, 1열 스택
  3. **배지 3종 레퍼런스** — operational/degraded/outage 배지 분리 전시 + 대비 수치
  4. **다크 테마 프리뷰** — 동일 카드/배지의 dark 렌더(전경색 반전 확인용)
- mockup의 `:root`는 본 문서 §2 토큰을 그대로 인라인 정의(clock 셸 + kanban 시맨틱 3색) — markdown ↔ mockup 색 동기화.

---

## 8. Acceptance Criteria 매핑 (BF-855)

| BF-855 수용 기준 | 충족 근거 |
|---|---|
| Given planner 명세, When 디자인 명세·mockup 작성, Then `docs/design`에 배지 시각 명세와 mockup HTML 생성 | 본 문서(`docs/design/status-badge-BF-855.md`) + `docs/design/mockups/status-badge-BF-855.html` §7 |
| Given 기존 디자인 토큰, When 배지 스타일 정의, Then 신규 토큰 없이 기존 토큰만 참조 | §2 전체(clock 셸 + kanban 시맨틱, 신규 `--color-*` 0건) + §6.1 셋업 절차 + §6.4 하드코딩 금지 |

---

## 9. 비범위 (Out of Scope)

- 코드 구현(HTML/CSS/JS) — dev 담당(본 문서 §6은 가이드일 뿐 구현 아님).
- fixture 서비스 목록·개수 확정 — planner §12-1 미해결 이슈 승계(디자인은 개수 무관).
- 실제 health API·polling·DB·신규 패키지 — planner §6 배제 범위 승계.
- 배지 클릭/토글/애니메이션 — 정적 표시 요소(§5.1).
- 다국어(i18n) — 한국어 라벨 고정.
- 신규 브랜드 색 채택/디자인 토큰 파일 수정 — 운영자·디자인시스템 권한(planner §12-4).
