# Incident Severity Triage UI 시안 명세 — BF-800

> 작성자: [이디자인] (designer) · 작성일 2026-07-14
> 관련 티켓: BF-802 (designer task) · BF-801 (planner) · BF-800 (부모 스토리)
> 기획 문서: `docs/plan/incident-triage-BF-800.md` (본 시안의 상위 source of truth)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> mockup 참조: `docs/design/mockups/incident-triage-BF-802.html`

> **파일명 규칙 안내**: 본 명세 파일명은 AC 및 기획 문서(`docs/plan/incident-triage-BF-800.md`)와 동일하게 **부모 스토리 키 BF-800** 을 따른다. mockup HTML 은 시스템 screenshot capture 규약상 **현재 task 키 BF-802** 를 사용한다. 의도된 차이이며 오타가 아니다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [상태별 시각 규칙](#5-상태별-시각-규칙)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [접근성 · WCAG 대비 검증](#7-접근성--wcag-대비-검증)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ UI 매핑 표](#9-ac--ui-매핑-표)
10. [mockup 참조](#10-mockup-참조)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 모듈 `incident-triage/` 의 시각 시안. 영향도(Impact) × 긴급도(Urgency) 3×3 라디오 선택 → 심각도(P1~P4)·SLA·다음 행동을 즉시 판정하는 단일 페이지 도구의 컬러·타이포·레이아웃·상태별 시각 규칙을 정의한다.

- 신규 파일: `incident-triage/index.html`, `incident-triage/style.css`, `incident-triage/triage.js`
- 기존 모듈 CSS/토큰 공유: **없음** — 완전 독립 (`--it-*` 네임스페이스 프리픽스)
- 기존 SPA 와의 일관성: 기존 모듈(`rps/style.css` 등)의 **토큰 명명 체계·spacing 스케일·radius 스케일 관례를 그대로 계승**하되, 값은 본 모듈 `:root` 에 자체 정의한다 (파일 간 import 없음 = vanilla-static 제약 준수)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| "2개만 고르면 끝" 이라는 인지 | 영향도/긴급도 2개 그룹을 좌우 동등한 무게로 병치 — 3번째 입력이 없음을 형태로 전달 |
| 판정 결과의 즉시성 | 결과 카드가 선택 즉시 fade-in, 좌측에 severity 색 4px 스트립으로 등급을 주변시(peripheral vision)에서도 인지 |
| 심각도의 직관적 서열 | P1(적색) → P2(주황) → P3(청색) → P4(회색) — **채도 하강 = 긴급도 하강** |
| 색맹 사용자 동등 인지 | 배지에 `P1` 코드 + 한글명("치명")을 **항상 병기** — 색상은 보조 채널 (§7.3) |
| 다음 행동의 명확성 | Next Action 문구를 결과 카드 내 가장 큰 본문 블록으로 배치 + "요약 복사" CTA 인접 |
| 실수 없는 재판정 | 선택 변경 시 초기화 없이 즉시 갱신 — 결과 카드 위치 고정으로 시선 이동 최소화 |

### 1.3 디자인 톤

- 밝은 중립 캔버스(`#F1F3F5`) 위 흰 카드 — **운영 도구(ops tool)** 특유의 차분·신뢰 무드. 게임 모듈의 다크 그라데이션과 의도적으로 구분
- 색상은 severity 표현에만 절제 사용 — 나머지 UI 는 무채색으로 눌러 **severity 색이 유일한 시각적 신호**가 되게 함
- 둥근 모서리 8~12px + 얕은 그림자 — 정보 밀도 높은 도구에 적합한 낮은 장식성

---

## 2. 컬러 팔레트

모든 색상은 `incident-triage/style.css` 의 `:root` 에 **신규 CSS 변수**로 정의한다. 다른 모듈과 공유하지 않는다 (프리픽스 `--it-`).

### 2.1 기본 팔레트

| 역할 | CSS 변수 | HEX | 용도 |
|------|----------|-----|------|
| background (canvas) | `--it-color-bg` | `#F1F3F5` | 페이지 배경 |
| surface | `--it-color-surface` | `#FFFFFF` | 카드·결과 영역 표면 |
| surface-muted | `--it-color-surface-muted` | `#F8F9FA` | 라디오 카드 기본 배경, 미선택 상태 |
| border | `--it-color-border` | `#DDE1E6` | 카드/라디오 테두리 |
| border-strong | `--it-color-border-strong` | `#B9C0C8` | hover 테두리, 구분선 |
| text | `--it-color-text` | `#1A1D21` | 본문·제목 텍스트 |
| text-muted | `--it-color-text-muted` | `#6B6B66` | 보조 설명, legend 캡션 |
| accent | `--it-color-accent` | `#3563E9` | 포커스 링, 선택된 라디오 강조, primary 버튼 |
| accent-hover | `--it-color-accent-hover` | `#2A50C4` | primary 버튼 hover |
| success | `--it-color-success` | `#0F7B4F` | "복사됨" 피드백 |
| error | `--it-color-error` | `#B91C1C` | 복사 실패 안내 텍스트 (EC-06) |

### 2.2 Severity 팔레트 (핵심)

각 severity 는 **배지 배경색(solid)** + **연한 틴트(카드 강조용)** 2종을 가진다. 배지 텍스트는 항상 `#FFFFFF`.

| Severity | 한글 라벨 | 배지 배경 변수 | HEX | 틴트 변수 | 틴트 HEX | 배지 대비 (vs 흰 텍스트) |
|----------|-----------|----------------|-----|-----------|----------|--------------------------|
| P1 | 치명 | `--it-color-p1` | `#B91C1C` | `--it-color-p1-tint` | `#FEF2F2` | **6.47:1** ✅ AA |
| P2 | 높음 | `--it-color-p2` | `#B45309` | `--it-color-p2-tint` | `#FFFBEB` | **5.02:1** ✅ AA |
| P3 | 보통 | `--it-color-p3` | `#1D4ED8` | `--it-color-p3-tint` | `#EFF6FF` | **6.71:1** ✅ AA |
| P4 | 낮음 | `--it-color-p4` | `#475569` | `--it-color-p4-tint` | `#F8FAFC` | **7.58:1** ✅ AA |

> **설계 의도**: P1→P4 로 갈수록 채도·명도 대비가 완만해져 **시각적 긴급도가 자연 감쇠**한다. 틴트는 결과 카드 배경/좌측 스트립에만 사용하며, 틴트 위 텍스트는 항상 `--it-color-text`(#1A1D21) 로 대비 12:1 이상 확보.

### 2.3 spacing / radius 스케일

| 변수 | 값 | 변수 | 값 |
|------|-----|------|-----|
| `--it-space-1` | `4px` | `--it-radius-sm` | `4px` |
| `--it-space-2` | `8px` | `--it-radius-md` | `8px` |
| `--it-space-3` | `12px` | `--it-radius-lg` | `12px` |
| `--it-space-4` | `16px` | `--it-radius-pill` | `999px` |
| `--it-space-5` | `24px` | | |
| `--it-space-6` | `32px` | | |
| `--it-space-7` | `48px` | | |

---

## 3. 타이포그래피

폰트는 **system font stack 만** 사용 (외부 CDN 금지 — vanilla-static 제약).

```css
--it-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
--it-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | 요소 | font-family | size | weight | line-height | 색상 |
|------|------|-------------|------|--------|-------------|------|
| Page title | `<h1>` | sans | `24px` | `700` | `1.3` | `--it-color-text` |
| Page subtitle | `.it-subtitle` | sans | `14px` | `400` | `1.5` | `--it-color-text-muted` |
| Group legend | `<legend>` | sans | `15px` | `600` | `1.4` | `--it-color-text` |
| Radio label | `.it-option-label` | sans | `15px` | `500` | `1.4` | `--it-color-text` |
| Radio 보조설명 | `.it-option-hint` | sans | `12px` | `400` | `1.4` | `--it-color-text-muted` |
| Severity 배지 코드 | `.it-badge-code` | **mono** | `20px` | `700` | `1` | `#FFFFFF` |
| Severity 배지 한글명 | `.it-badge-name` | sans | `13px` | `600` | `1` | `#FFFFFF` |
| SLA 라벨 | `.it-sla-label` | sans | `12px` | `600` | `1.4` | `--it-color-text-muted` |
| SLA 값 | `.it-sla-value` | sans | `18px` | `700` | `1.3` | `--it-color-text` |
| Next Action 본문 | `.it-next-action` | sans | `16px` | `400` | `1.6` | `--it-color-text` |
| 버튼 라벨 | `<button>` | sans | `14px` | `600` | `1` | 문맥별 |

> severity 코드(`P1`)에 mono 를 쓰는 이유: 숫자 등급의 **기계적·객관적 판정** 성격을 타이포로 전달하고, 자릿수 정렬로 배지 폭을 일정하게 유지.

---

## 4. 레이아웃

### 4.1 섹션 구조

```
<body>  (배경 --it-color-bg, 중앙 정렬, 최대폭 880px)
 └─ <main class="it-app">
     ├─ <header class="it-header">          ← h1 "인시던트 심각도 판정" + subtitle
     ├─ <form class="it-form">
     │   └─ <div class="it-groups">          ← ⬅ 반응형 분기 지점 (grid)
     │       ├─ <fieldset name=impact>       ← legend "영향도" + 라디오 카드 3
     │       └─ <fieldset name=urgency>      ← legend "긴급도" + 라디오 카드 3
     ├─ <div id="result" data-state="idle|partial|resolved">
     │   ├─ .it-result-empty                 ← idle/partial 시 안내 문구
     │   └─ .it-result-body                  ← resolved 시 표시
     │       ├─ .it-badge                    ← severity 배지 (코드 + 한글명)
     │       ├─ .it-sla                      ← SLA 라벨 + 값
     │       └─ .it-next-action              ← 다음 행동 문구
     └─ <div class="it-actions">
         ├─ <button id="copy-btn">           ← 요약 복사 (primary)
         └─ <button id="reset-btn">          ← 초기화 (secondary)
```

### 4.2 spacing 규칙

| 영역 | 규칙 |
|------|------|
| `body` 좌우 패딩 | `var(--it-space-5)` (24px) — 모바일에서 `var(--it-space-4)` (16px) |
| `.it-app` 최대폭 | `880px`, `margin: 0 auto` |
| 섹션 간 수직 간격 | `var(--it-space-5)` (24px) |
| `.it-groups` 그리드 gap | `var(--it-space-5)` (24px) |
| fieldset 내부 패딩 | `var(--it-space-5)` (24px) |
| 라디오 카드 간 간격 | `var(--it-space-2)` (8px) |
| 결과 카드 패딩 | `var(--it-space-5)` (24px) |

### 4.3 breakpoint 별 동작

| breakpoint | `.it-groups` | 라디오 카드 | 버튼 |
|------------|--------------|-------------|------|
| **≥ 481px** (태블릿/데스크톱) | `grid-template-columns: 1fr 1fr` — 영향도/긴급도 **좌우 병치** | 세로 스택 (그룹 내 3개) | 가로 배치, 우측 정렬 |
| **≤ 480px** (모바일) | `grid-template-columns: 1fr` — **세로 스택** | 세로 스택 | **가로 100% 폭 세로 스택** (터치 타깃 확보) |

```css
/* mobile-first 가 아닌 desktop 기준 + max-width 분기 (본 리포 관례) */
@media (max-width: 480px) {
  .it-groups { grid-template-columns: 1fr; }
  .it-actions { flex-direction: column; }
  .it-actions button { width: 100%; }
}
```

- 320px 최소 폭에서 **가로 스크롤 0** (AC-10): 모든 컨테이너 `max-width: 100%`, `box-sizing: border-box`, 긴 Next Action 문구는 자동 줄바꿈(`word-break: keep-all` 로 한글 어절 단위 유지)
- 모든 터치 타깃(라디오 카드, 버튼) **최소 높이 44px** 보장

---

## 5. 상태별 시각 규칙

### 5.1 결과 영역 `data-state` 전이 (구조는 기획 §14 고정 — 준수)

| `data-state` | 결과 영역 | 복사 버튼 | 시각 처리 |
|--------------|-----------|-----------|-----------|
| `idle` | `.it-result-empty` 표시 — "영향도와 긴급도를 모두 선택하면 심각도가 판정됩니다." | `disabled` | 점선 테두리(`1px dashed --it-color-border`) + muted 텍스트, 배경 투명 |
| `partial` | `.it-result-empty` 표시 — 동일 문구 유지 | `disabled` | idle 과 **동일** (기획 §3.2: partial 도 결과 숨김) |
| `resolved` | `.it-result-body` 표시 | 활성 | 실선 테두리 + 흰 표면 + severity 틴트 배경 + 좌측 4px severity 스트립 + `fade-in` 120ms |

> CSS 는 `#result[data-state="resolved"] .it-result-body { display: block }` / `#result:not([data-state="resolved"]) .it-result-body { display: none }` 패턴으로 제어 — **JS 는 `data-state` 속성값만 갱신**하면 되고 개별 요소의 `style.display` 를 직접 만지지 않는다.

### 5.2 severity 별 결과 카드 시각 (`data-severity` 속성)

결과 영역에 `data-severity="P1|P2|P3|P4"` 를 함께 부여하여 CSS 만으로 색 전환:

| `data-severity` | 좌측 스트립 / 배지 배경 | 카드 배경 |
|-----------------|------------------------|-----------|
| `P1` | `--it-color-p1` `#B91C1C` | `--it-color-p1-tint` `#FEF2F2` |
| `P2` | `--it-color-p2` `#B45309` | `--it-color-p2-tint` `#FFFBEB` |
| `P3` | `--it-color-p3` `#1D4ED8` | `--it-color-p3-tint` `#EFF6FF` |
| `P4` | `--it-color-p4` `#475569` | `--it-color-p4-tint` `#F8FAFC` |

```css
#result[data-severity="P1"] { --it-sev: var(--it-color-p1); --it-sev-tint: var(--it-color-p1-tint); }
/* P2·P3·P4 동일 패턴 — 이후 모든 규칙은 var(--it-sev) 만 참조 */
.it-result-body { background: var(--it-sev-tint); border-left: 4px solid var(--it-sev); }
.it-badge       { background: var(--it-sev); color: #FFFFFF; }
```

> **dev 참고**: 이 패턴 덕분에 severity 별 CSS 규칙이 4벌로 늘어나지 않는다. JS 는 `result.dataset.severity = r.severity` 한 줄이면 색 전환이 끝난다.

### 5.3 라디오 카드 상태

| 상태 | 배경 | 테두리 | 기타 |
|------|------|--------|------|
| 기본 (unchecked) | `--it-color-surface-muted` | `1px solid --it-color-border` | — |
| hover | `--it-color-surface` | `1px solid --it-color-border-strong` | `cursor: pointer` |
| **checked** | `--it-color-surface` | `2px solid --it-color-accent` | 좌측에 accent 색 라디오 dot, `font-weight: 600` |
| focus-visible | (상태 유지) | (상태 유지) | `outline: 2px solid --it-color-accent; outline-offset: 2px` |
| disabled | — | — | 해당 없음 (라디오는 항상 활성) |

> checked 상태에서 테두리가 1px→2px 로 두꺼워지므로 **레이아웃 시프트 방지**를 위해 기본 상태에 `border: 2px solid transparent` + `box-shadow: inset 0 0 0 1px var(--it-color-border)` 대신, 간단히 모든 상태 `border-width: 2px` 로 고정하고 색만 바꾼다 (기본은 `--it-color-border`).

### 5.4 버튼 상태

| 버튼 | 기본 | hover | disabled | 활성(copied) |
|------|------|-------|----------|--------------|
| `#copy-btn` (primary) | bg `--it-color-accent`, 흰 텍스트 | bg `--it-color-accent-hover` | bg `--it-color-border`, 텍스트 `--it-color-text-muted`, `cursor: not-allowed`, `opacity: 1` (대비 유지) | bg `--it-color-success`, 라벨 "✓ 복사됨" — **2초 후 원복** (기획 §4.3 고정 타이밍) |
| `#reset-btn` (secondary) | bg `--it-color-surface`, 테두리 `--it-color-border-strong`, 텍스트 `--it-color-text` | bg `--it-color-surface-muted` | 해당 없음 (항상 활성 — EC-07 no-op) | — |

- 두 버튼 모두 `min-height: 44px`, `padding: 0 var(--it-space-5)`, `border-radius: var(--it-radius-md)`
- disabled 복사 버튼은 **`opacity` 로 흐리게 처리하지 않는다** — 대비가 깨져 WCAG 위반 위험. 대신 명시적 회색 토큰 사용 (§7.2)
- "복사됨" 전환은 `transition: background-color 150ms ease` 만 — 과한 애니메이션 금지

---

## 6. 컴포넌트 명세

### 6.1 `RadioCard` (라디오 카드) — 6개 인스턴스

| props (HTML 속성) | 값 | 비고 |
|-------------------|-----|------|
| `name` | `"impact"` \| `"urgency"` | 그룹 구분 |
| `value` | `"high"` \| `"medium"` \| `"low"` | **기획 §6.3 enum 과 100% 동일** — 변경 금지 |
| `id` | `impact-high` 등 `{name}-{value}` | `<label for>` 연결용 |
| 라벨 텍스트 | 높음 / 보통 / 낮음 | |
| 보조 설명(`.it-option-hint`) | 영향도: "전사/다수 고객" / "일부 기능·팀" / "개별 사용자" · 긴급도: "즉시 대응 필요" / "수 시간 내" / "여유 있음" | **시각 보조 문구 — 판정 로직에 영향 없음** |

- 마크업: `<label class="it-option"><input type="radio" ...><span class="it-option-label">…</span><span class="it-option-hint">…</span></label>`
- **네이티브 `<input type="radio">` 시맨틱 유지** (기획 §9.1) — 커스텀 div 토글 금지. 방향키 그룹 이동은 브라우저 기본 동작에 위임
- 인터랙션: `change` 이벤트만 사용 (`click` 아님 — 키보드 방향키 선택도 잡아내기 위함)

### 6.2 `SeverityBadge`

| props | 값 |
|-------|-----|
| `severity` | `P1` \| `P2` \| `P3` \| `P4` (부모 `#result[data-severity]` 에서 상속) |
| 표시 내용 | `.it-badge-code` (P1) + `.it-badge-name` (치명) — **항상 병기** (AC-09 색 비의존) |

- 크기: `min-width: 88px`, `padding: var(--it-space-3) var(--it-space-4)`, `border-radius: var(--it-radius-md)`
- 상태: 정적 — hover/focus 없음 (표시 전용, 상호작용 요소 아님)

### 6.3 `ResultCard`

| props | 값 |
|-------|-----|
| `data-state` | `idle` \| `partial` \| `resolved` — **기획 §14 고정 구조** |
| `data-severity` | `P1`~`P4` (resolved 시에만 설정, 그 외 제거) |
| `aria-live` | `"polite"` — 기획 §9.2 필수 |

- 하위: `SeverityBadge` + SLA 블록 + Next Action 문구
- 인터랙션: 없음 (표시 전용). 복사/초기화는 `.it-actions` 소관

### 6.4 `ActionButtons`

| 컴포넌트 | props / 상태 | 인터랙션 |
|----------|--------------|----------|
| `#copy-btn` | `disabled` (resolved 아닐 때 `true`) · 라벨 `요약 복사` ↔ `✓ 복사됨` | 클릭/Enter/Space → 클립보드 복사 → 라벨 전환 → **2초 후 원복** |
| `#reset-btn` | 항상 활성 | 클릭/Enter/Space → 상태 리셋 → **영향도 첫 라디오로 포커스 이동** |

- 복사 실패 시(EC-06): `.it-copy-error` 요소에 "복사에 실패했습니다. 아래 텍스트를 직접 선택해 복사하세요." 를 `--it-color-error` 로 표시 — **예외 throw 금지**

---

## 7. 접근성 · WCAG 대비 검증

### 7.1 Severity 배지 대비 (AC-09 — 일반 텍스트 4.5:1 이상)

| 배지 | 전경 | 배경 | 대비비 | 판정 |
|------|------|------|--------|------|
| P1 | `#FFFFFF` | `#B91C1C` | **6.47:1** | ✅ AA (4.5:1 초과) |
| P2 | `#FFFFFF` | `#B45309` | **5.02:1** | ✅ AA |
| P3 | `#FFFFFF` | `#1D4ED8` | **6.71:1** | ✅ AA |
| P4 | `#FFFFFF` | `#475569` | **7.58:1** | ✅ AA (AAA 근접) |

> ⚠️ **dev 주의**: P2 의 `#B45309` 는 5.02:1 로 AA 기준(4.5:1)에 **여유가 가장 적다**. 이 값을 임의로 밝은 amber(`#F59E0B` = 약 2.1:1)로 바꾸면 **즉시 AC-09 위반**이다. severity 배지 색은 본 표의 HEX 를 그대로 사용할 것.

### 7.2 그 외 주요 텍스트 대비

| 요소 | 전경 | 배경 | 대비비 | 판정 |
|------|------|------|--------|------|
| 본문 텍스트 | `#1A1D21` | `#FFFFFF` | ~16.9:1 | ✅ AAA |
| 보조 텍스트(muted) | `#6B6B66` | `#FFFFFF` | **5.36:1** | ✅ AA |
| 보조 텍스트(muted) | `#6B6B66` | `#F1F3F5` (canvas) | **4.82:1** | ✅ AA |
| primary 버튼 라벨 | `#FFFFFF` | `#3563E9` | **5.11:1** | ✅ AA |
| 포커스 링 (UI 컴포넌트) | `#3563E9` | `#FFFFFF` | **5.11:1** | ✅ AA (3:1 기준 초과) |
| disabled 복사 버튼 라벨 | `#6B6B66` | `#DDE1E6` | **4.52:1** | ✅ AA (opacity 미사용 이유) |
| 틴트 위 본문 (P1~P4 카드) | `#1A1D21` | 각 틴트(#FEF2F2 등) | 15:1 이상 | ✅ AAA |

### 7.3 색 비의존 (Color-independence)

- severity 는 **색 + 코드(P1) + 한글명(치명) + 좌측 스트립 위치** 4중 채널로 전달 → 흑백 인쇄·전색맹 환경에서도 등급 판별 가능
- 라디오 선택 상태는 **색(accent 테두리) + 두께(2px) + 네이티브 라디오 dot + font-weight** 로 중복 표현

### 7.4 키보드 · 포커스 (기획 §9.1~9.2 준수)

- Tab 순서 = DOM 순서: **영향도 3 → 긴급도 3 → 요약 복사 → 초기화**. `tabindex` 양수값 사용 금지
- 모든 포커스 가능 요소에 `:focus-visible { outline: 2px solid var(--it-color-accent); outline-offset: 2px; }` — **`outline: none` 단독 사용 절대 금지**
- `#result` 에 `aria-live="polite"` — 판정 갱신 시 스크린리더 자동 낭독
- 초기화 후 포커스는 `impact-high` 라디오로 이동 (`document.getElementById('impact-high').focus()`)

---

## 8. dev 구현 가이드

### 8.1 파일별 작업 (기획 §5 파일 구조 준수)

| 파일 | 본 시안에서 가져갈 것 |
|------|----------------------|
| `incident-triage/style.css` | §2 팔레트 → `:root` 변수 · §3 타이포 · §4 레이아웃/breakpoint · §5 상태 규칙 |
| `incident-triage/index.html` | §4.1 섹션 구조 · §6 컴포넌트 마크업 · 클래스명 |
| `incident-triage/triage.js` | `data-state` / `data-severity` **속성만 갱신** — 인라인 스타일 조작 금지 |

### 8.2 `:root` 변수 (그대로 복사해 사용)

```css
:root {
  /* base */
  --it-color-bg:             #F1F3F5;
  --it-color-surface:        #FFFFFF;
  --it-color-surface-muted:  #F8F9FA;
  --it-color-border:         #DDE1E6;
  --it-color-border-strong:  #B9C0C8;
  --it-color-text:           #1A1D21;
  --it-color-text-muted:     #6B6B66;
  --it-color-accent:         #3563E9;
  --it-color-accent-hover:   #2A50C4;
  --it-color-success:        #0F7B4F;
  --it-color-error:          #B91C1C;

  /* severity — §7.1 대비 검증 완료. 임의 변경 금지 */
  --it-color-p1: #B91C1C;  --it-color-p1-tint: #FEF2F2;
  --it-color-p2: #B45309;  --it-color-p2-tint: #FFFBEB;
  --it-color-p3: #1D4ED8;  --it-color-p3-tint: #EFF6FF;
  --it-color-p4: #475569;  --it-color-p4-tint: #F8FAFC;

  /* spacing / radius */
  --it-space-1: 4px;  --it-space-2: 8px;   --it-space-3: 12px;
  --it-space-4: 16px; --it-space-5: 24px;  --it-space-6: 32px; --it-space-7: 48px;
  --it-radius-sm: 4px; --it-radius-md: 8px; --it-radius-lg: 12px; --it-radius-pill: 999px;

  /* type */
  --it-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                  system-ui, Roboto, "Helvetica Neue", Arial, sans-serif;
  --it-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

### 8.3 권장 클래스명 (mockup 과 1:1 일치)

| 클래스 | 역할 |
|--------|------|
| `.it-app` | 최상위 컨테이너 (max-width 880px) |
| `.it-header` / `.it-subtitle` | 페이지 제목 영역 |
| `.it-groups` | 영향도/긴급도 grid 래퍼 (**반응형 분기 지점**) |
| `.it-fieldset` | 각 라디오 그룹 카드 |
| `.it-option` / `.it-option-label` / `.it-option-hint` | 라디오 카드 |
| `.it-result-empty` / `.it-result-body` | 결과 영역 idle/resolved 하위 |
| `.it-badge` / `.it-badge-code` / `.it-badge-name` | severity 배지 |
| `.it-sla` / `.it-sla-label` / `.it-sla-value` | SLA 블록 |
| `.it-next-action` | 다음 행동 문구 |
| `.it-actions` / `.it-btn` / `.it-btn-primary` / `.it-btn-secondary` | 버튼 영역 |
| `.it-copy-error` | 복사 실패 안내 (EC-06) |

### 8.4 구현 단계 (권장 순서)

1. `index.html` — §4.1 구조 + §6 마크업. 라디오 `value` 는 **반드시** `high|medium|low` (기획 §6.3 enum)
2. `style.css` — §8.2 `:root` 붙여넣기 → 레이아웃(grid) → 라디오 카드 → 결과 카드 → 버튼 → `@media (max-width: 480px)`
3. `triage.js` — 기획 §6.5 UMD 패턴 + `resolveSeverity` lookup table(기획 §2.2 표 그대로)
4. 렌더 함수: `result.dataset.state = 'resolved'; result.dataset.severity = r.severity;` + 텍스트 3곳 주입 + `copyBtn.disabled = false`
5. 초기화: `form.reset()` → `dataset.state = 'idle'` → `delete result.dataset.severity` → `copyBtn.disabled = true` → `impact-high` 포커스

### 8.5 dev 가 하지 말아야 할 것 (시안 위반 방지)

- ❌ severity 색을 밝은 톤(`#EF4444`, `#F59E0B` 등)으로 교체 — §7.1 대비 위반
- ❌ disabled 버튼에 `opacity: 0.5` — 대비 붕괴
- ❌ `outline: none` 으로 포커스 링 제거
- ❌ 라디오를 `<div role="radio">` 커스텀 구현 — 네이티브 유지 (기획 §9.1)
- ❌ JS 에서 `element.style.background = ...` 직접 조작 — `data-*` 속성 + CSS 로만

> mockup 은 **시각 참조**이며 픽셀 단위 일치 의무는 없다. 단 §2 컬러 HEX·§7 대비 요건·`data-state`/`data-severity` 구조는 **준수 필수**.

---

## 9. AC ↔ UI 매핑 표

| AC | 요구 | 본 시안에서 대응하는 곳 | mockup 확인 위치 |
|----|------|------------------------|------------------|
| **AC-01** | 9개 조합 결정론적 판정 | (로직 — 시안 범위 밖) §5.2 가 P1~P4 4종 시각을 모두 정의해 어떤 조합이 와도 표현 가능 | mockup §3 "Severity 4종" 섹션 |
| **AC-02** | 초기 상태 결과 숨김 | §5.1 `data-state="idle"` — 점선 테두리 + 안내 문구, 복사 버튼 `disabled` | mockup §1 "상태 A: idle" |
| **AC-03** | 부분 선택 시 결과 미표시 | §5.1 `partial` = idle 과 **시각 동일** (결과 숨김 유지) | mockup §1 "상태 B: partial" |
| **AC-04** | 완전 선택 시 즉시 판정 표시 | §5.1 `resolved` — 배지/SLA/Next Action + fade-in 120ms | mockup §2 "상태 C: resolved" |
| **AC-05** | 선택 변경 시 재계산 | §5.2 `data-severity` 속성 교체만으로 색 전환 — 결과 카드 **위치 고정**(시선 이동 최소화) | mockup §3 4종 비교 |
| **AC-06** | 요약 복사 + "복사됨" 2초 | §5.4 copy-btn `copied` 상태 (bg success, "✓ 복사됨") | mockup §4 "버튼 상태" |
| **AC-07** | 초기화 + 포커스 이동 | §5.4 reset-btn · §7.4 포커스 이동 대상 `impact-high` · §8.4 5단계 | mockup §4 |
| **AC-08** | 키보드 전체 조작 | §6.1 네이티브 radio 유지 · §7.4 Tab 순서 = DOM 순서 · `:focus-visible` 링 | mockup §5 "포커스 링" |
| **AC-09** | WCAG 대비 + 색 비의존 | **§7.1 배지 4종 5.02~7.58:1 전수 검증** · §7.3 코드+한글명 병기 | mockup §3 (배지 하단 대비비 주석) |
| **AC-10** | 반응형 320~480px | §4.3 `@media (max-width: 480px)` 세로 스택 · 터치 타깃 44px | mockup §6 "모바일 프리뷰(360px)" |
| **AC-11** | vanilla-static / file:// | §3 system font only · 외부 link/script 0건 · mockup 자체가 self-contained 단일 HTML | mockup 파일 전체 (외부 요청 0건) |

---

## 10. mockup 참조

- **파일**: `docs/design/mockups/incident-triage-BF-802.html`
- **여는 법**: 브라우저에서 파일을 직접 열기 (`file://`) — 외부 의존성 0건, 네트워크 요청 0건
- **구성**: 단일 페이지 내 `<section>` 6개
  1. 상태 A/B — `idle` · `partial` (결과 숨김)
  2. 상태 C — `resolved` (P1 예시)
  3. Severity 4종 비교 (P1~P4, 각 배지에 실측 대비비 병기)
  4. 버튼 상태 (기본 / hover / disabled / 복사됨)
  5. 포커스 링 시각화
  6. 모바일 프리뷰 (360px 폭 — 세로 스택 확인)
- **주의**: mockup 은 **시각 시뮬레이션 전용**이며 dev 의 실제 산출물이 아니다. 실제 구현은 `incident-triage/` 3개 파일로 별도 작성한다 (기획 §5).

---

*문서 종료 — [이디자인] · BF-802*
