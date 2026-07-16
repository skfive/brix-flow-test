# 진행률 체크리스트 검증 페이지(progress-5) 디자인 명세 — BF-905 (Phase 18 검증 5/5)

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-905 (본 designer task) · BF-903 (상위 Epic) · BF-904 (planner 산출물)
> 검증 대상 라우트: `/phase18-validation/progress-5` (= 저장소 최상위 `phase18-validation/progress-5/`)
> tech-stack: `vanilla-static` — 외부 의존성 0건, CSS 변수 자체 정의(원본 `--ic-*` 토큰 복제)
> 재사용 원본(수정 금지): `incident-command/`(BF-821/822/823/824) — `command.js`의 진행률/체크리스트 컴포넌트 + `style.css`의 `--ic-progress-*`/`.ic-progress`/`.ic-check` 규칙
> 기획 SSOT: `docs/spec/phase18-validation-progress-5-BF-903.md` (planner [박기획] · BF-904)
> mockup 참조: `docs/design/mockups/progress-5-BF-905.html` (본 명세와 함께 작성 — §7)

---

## 0. 문서 성격 및 전제

본 문서는 planner 명세(`docs/spec/phase18-validation-progress-5-BF-903.md`)를 시각 디자인으로 구체화한 **designer 산출물**이다. 코드 구현은 후속 dev task 담당이며, 본 문서는 컬러/타이포/레이아웃/컴포넌트 토큰과 dev 구현 가이드까지만 정의한다.

**핵심 디자인 원칙 — "재사용, 발명 아님"**: progress-5 는 신규 시각 언어를 만드는 페이지가 아니라, 이미 병합된 `incident-command/`(BF-822/823/824)의 **체크리스트 진행률 시각 계약(진행률 바 `role="progressbar"` + 고정 텍스트 "N/M 완료 (P%)" + 체크박스 항목)이 새 경로에서 손실 없이 재현되는지**를 검증하는 페이지다. 따라서 본 명세의 컬러·타이포·컴포넌트 토큰은 **전부 `incident-command/style.css` `:root`(`--ic-*`) 값을 그대로 복제**하며 신규 색상 리터럴을 0건으로 유지한다(planner §5.1, §5.4-1).

**범위 축소(planner §0 가정 3 승계)**: 원본 `incident-command/` 의 장애 목록·심각도 필터·상세 헤더·타임라인·다중 체크리스트 전환은 **본 검증 페이지에서 제외**한다. 화면은 **① 상단바(타이틀) + ② 단일 체크리스트 카드(진행률 바 + 항목 리스트)** 만으로 구성된다(planner §4.1).

**테마 결정 — 다크 단일(원본 승계, 라이트 팔레트 미발명)**: 원본 `incident-command/` 는 **다크 전용(관제 화면 톤)** 이며 라이트 테마 오버라이드도, 테마 토글 버튼도 갖지 않는다(`index.html` 에 toggle 없음 실측 확인). 본 검증 페이지는 원본 default 를 그대로 승계해 **다크 단일 테마**로 확정한다 — 라이트 팔레트를 새로 정의하면 "신규 색상 리터럴 0건" 재사용 기준(planner §5.4-1 / AC-재사용)을 위반하기 때문이다. planner §4.4/§13-5 가 "다크/라이트 default 는 designer 재량, 원본이 다크 전용이므로 dice-4 처럼 원본 default 승계 권장"으로 열어둔 판단을 이 근거로 확정한다. 이 결정과 그 파급(§4.4 테마 토글 미포함)은 §8.3 모호함 항목에 명시적으로 flag 한다.

**경로 관련 참고**: 본 task 산출물은 File Ownership 이 `docs/design/**` 로 지정한 범위 내 2개 파일이다 — 명세 `docs/design/progress-5-BF-905.md`(BF-905 = 본 designer task 번호) + mockup `docs/design/mockups/progress-5-BF-905.html`(system 자동 screenshot capture 경로). `phase18-validation/progress-5/*` 코드는 후속 dev task 담당이며 본 task 에서 생성하지 않는다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑 및 Self-critique](#8-ac-매핑-및-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

| 항목 | 내용 |
|---|---|
| 신규 화면 | `phase18-validation/progress-5/` — 진행률 체크리스트 검증 페이지 (상단바 + 단일 카드) |
| 재사용 원본 | `incident-command/`(BF-822/823/824) — `--ic-*` 토큰 전체 + `.ic-topbar`/`.ic-progress`/`.ic-progress__fill`/`.ic-progress__text`/`.ic-check-list`/`.ic-check` 컴포넌트 |
| 신규 시각 요소 | **없음** — 배치를 원본(2-pane 관제 레이아웃)에서 단일 카드로 축소만 함. 신규 색/폰트/컴포넌트 0건 |
| 제외(원본 대비) | 장애 목록·심각도 필터·상세 헤더·타임라인·다중 체크리스트 전환·loading 스켈레톤·테마 토글 |
| 테마 | **다크 단일**(`--ic-*` default) — 원본 `incident-command/` 다크 전용 승계(§0, planner §4.4/§13-5) |

### 1.2 사용자 경험 목표 (planner §2 승계)

- **QA/운영자가 화면 진입 + 체크박스 토글 1회만으로** 진행률 바(`N/M 완료 (P%)`)가 원본과 동일한 시각 언어로 렌더·갱신됨을 즉시 확인한다(planner §2-1).
- 초기 렌더 시 진행률 바가 fixture 의 done 비율만큼 채워진 상태로 지연 없이 나타나, "부분 완료" 상태가 시각적으로 명확히 드러난다.
- 체크박스 토글 시 완료 항목은 label 취소선 + muted 색으로 흐려지고, 완료 시각(`<time>`, mono)이 우측에 붙으며, **동일 렌더 사이클**에서 진행률 바 fill 폭과 텍스트가 함께 갱신되어 항목 상태와 진행률 값이 항상 일치한다(planner §6.2-3).
- 진행률 fill 은 원본과 동일한 성공 그린(`--ic-progress-fill: #4ADE80`)으로, 관제 화면 톤(다크)의 카드·텍스트 대비가 원본 그대로 보존된다.

### 1.3 화면 상태 요약

| 상태 | 트리거 | 시각 표현 |
|---|---|---|
| 초기 렌더 | 페이지 로드 | fixture 체크리스트 + 초기 진행률 바(done 비율) 즉시 표시 |
| 항목 토글(on) | 체크박스 체크 | label 취소선·muted, 완료시각 표시, 진행률 fill 증가 |
| 항목 토글(off) | 체크박스 해제 | label 원복, 완료시각 제거, 진행률 fill 감소 |
| 전체 완료(100%) | 모든 항목 done | fill 가득 참, 텍스트 "N/N 완료 (100%)" (별도 배너 없음, planner §10.3) |
| 빈 체크리스트 | fixture 0건(방어적 edge) | 진행률 바 대신 dashed 안내 문구(§5.5, planner §4.3/§10.1) |
| JS 비활성 | `<noscript>` | 안내 문구 표시(planner §6.2-5) |

---

## 2. 컬러 팔레트

**전부 `incident-command/style.css` `:root`(`--ic-*`) 복제 — 신규 색상 리터럴 0건.** 아래는 progress-5 가 실제로 사용하는 토큰만 발췌한 것이다(장애 심각도·상태 배지·이벤트 색은 본 페이지에서 사용하지 않으므로 dev 가 복제할 필요 없음).

### 2.1 사용 토큰 (다크 단일)

| 역할 | 토큰 | HEX | 용도 |
|---|---|---|---|
| 배경(canvas) | `--ic-bg` | `#0B0F17` | `body` 배경 |
| 표면(카드) | `--ic-surface` | `#131A26` | 체크리스트 카드 배경 |
| 표면(항목) | `--ic-surface-raised` | `#1B2433` | `.ic-check` 항목 배경 |
| 경계 | `--ic-border` | `#2A3648` | 카드·항목 border |
| 본문 텍스트 | `--ic-text` | `#E8EDF5` | 제목·항목 label |
| 보조 텍스트 | `--ic-text-secondary` | `#9FB0C7` | 진행률 텍스트·상단바 서브 |
| muted 텍스트 | `--ic-text-muted` | `#6B7C94` | 완료(취소선) 항목 label |
| accent | `--ic-accent` | `#4DA3FF` | (사용 최소 — 링크/포커스 계열) |
| **진행률 fill** | `--ic-progress-fill` | `#4ADE80` | 진행률 바 채움 + 체크박스 `accent-color` |
| **진행률 track** | `--ic-progress-track` | `#212C3B` | 진행률 바 배경(빈 부분) |
| 포커스 링 | `--ic-focus` | `#4DA3FF` | `:focus-visible` outline |

### 2.2 반경·그림자·간격 토큰 (복제)

| 토큰 | 값 |
|---|---|
| `--ic-radius-sm` | `4px` (진행률 바) |
| `--ic-radius-md` | `8px` (체크리스트 항목) |
| `--ic-radius-lg` | `12px` (카드) |
| `--ic-shadow-panel` | `0 1px 3px rgba(0,0,0,0.4)` (카드) |
| `--ic-space-1~7` | `4/8/12/16/20/24/32px` (원본 스케일 그대로) |

> **금지**: 위 목록에 없는 신규 HEX/rgb 리터럴을 `styles.css` 에 추가하지 말 것. 재사용 성공 판정 기준 1번(planner §5.4-1)이 "신규 색상 리터럴 0건"이다.

---

## 3. 타이포그래피

**`incident-command/style.css` 폰트 스택·크기 그대로 승계.**

| 역할 | font-family | size / weight / line-height | 적용 요소 |
|---|---|---|---|
| 상단바 타이틀(h1) | `--ic-font-sans` | 22px / 700 / 1.3, letter-spacing -0.01em | `.ic-topbar h1` |
| 카드 제목(h2) | `--ic-font-sans` | 16px / 600 / 1.3 | "복구 체크리스트" |
| 본문/항목 label | `--ic-font-sans` | 14px / 400 / 1.6 | `.ic-check__label` |
| 진행률 텍스트 | `--ic-font-mono` | 12px / 400 / 1.4 | `.ic-progress__text.ic-mono` "N/M 완료 (P%)" |
| 완료 시각 | `--ic-font-mono` | 12px / 400 | `.ic-check__at.ic-mono` (`<time>`) |
| 상단바 서브캡션 | `--ic-font-sans` | 12px / 400 | `.ic-topbar__count` (검증 맥락 캡션) |

- `--ic-font-sans`: `system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", ...` (원본 그대로)
- `--ic-font-mono`: `ui-monospace, SFMono-Regular, Menlo, Consolas, "D2Coding", monospace` (원본 그대로)
- 진행률 텍스트와 완료 시각은 **반드시 mono** — 원본이 숫자 정렬·타임스탬프에 mono 를 쓰는 관례를 승계(계약 텍스트 "N/M 완료 (P%)"의 자릿수 안정).

---

## 4. 레이아웃

### 4.1 페이지 구조 (planner §4.1 축소 재현)

```
<body>  (배경 --ic-bg, 좌우 패딩 --ic-space-4, 하단 패딩 --ic-space-7)
 ├─ <header class="ic-topbar">           ← max-width 720px, 가운데 정렬
 │    ├─ <h1>진행률 체크리스트 검증</h1>
 │    └─ <p class="ic-topbar__count ic-mono">phase18-validation · 5/5</p>  (검증 맥락 캡션)
 └─ <main>  (max-width 720px, 가운데 정렬)
     └─ <section class="ic-panel ic-checklist-panel" aria-labelledby="checklist-title">
         ├─ <h2 id="checklist-title" class="ic-panel__title">복구 체크리스트</h2>
         └─ <div id="progress-5-checklist" data-checklist-state="has-items">
             ├─ <div class="ic-progress" role="progressbar" aria-valuenow aria-valuemin=0 aria-valuemax=100 aria-label="복구 체크리스트 진행률">
             │    └─ <div class="ic-progress__fill" style="width:P%">
             ├─ <p class="ic-progress__text ic-mono">N/M 완료 (P%)</p>
             └─ <ul class="ic-check-list">
                 └─ <li class="ic-check"> checkbox + label + (완료 시)<time> ×N
</body>
```

- 원본은 관제용 2-pane(목록/상세, `max-width:1400px`)이지만, 본 페이지는 단일 체크리스트만 남으므로 **읽기 편한 단일 컬럼(`max-width: 720px`, 가운데 정렬)** 으로 축소한다. 이는 planner §4.1 "체크리스트 섹션만 축소 재현" 및 §8 "단일 카드면 충분"과 정합한다. `720px` 는 새 레이아웃 상수일 뿐 신규 **색상**이 아니므로 재사용 기준(§5.4-1)에 저촉되지 않는다.
- 카드 내부 패딩은 원본 `.ic-checklist-panel` 의 `padding: var(--ic-space-4)` 승계.

### 4.2 spacing 규칙 (원본 토큰 매핑)

| 영역 | 값 | 토큰 |
|---|---|---|
| 상단바 상/하 패딩 | 24px / 16px | `--ic-space-6` / `--ic-space-4` |
| 카드 내부 패딩 | 16px | `--ic-space-4` |
| 진행률 바 → 텍스트 여백 | 8px | `--ic-space-2` |
| 진행률 텍스트 → 리스트 여백 | 12px | `--ic-space-3` |
| 항목 간 간격 | 8px | `--ic-space-2` (`.ic-check-list { gap }`) |
| 항목 내부 패딩 | 12px | `--ic-space-3` |
| checkbox ↔ label 간격 | 12px | `--ic-space-3` |

### 4.3 breakpoint 별 동작

원본 `style.css` 의 `@media (max-width: 860px)` 관련 규칙 중 progress-5 에 영향을 주는 것은 `.ic-progress__fill` 의 transition(§5.2)뿐이다. 단일 컬럼(`max-width:720px`)이므로 별도 반응형 분기가 불필요하다:

| viewport | 동작 |
|---|---|
| ≥ 720px | 카드가 720px 폭 고정, 가운데 정렬 |
| < 720px | 카드가 `width:100%` 로 자연 축소(`body` 좌우 `--ic-space-4` 패딩 유지). 항목은 checkbox + label + 완료시각이 한 줄 flex, label 이 `flex:1 1 auto; overflow-wrap:anywhere` 로 줄바꿈 |
| 매우 좁은 화면 | 완료 시각(`.ic-check__at`)은 `flex:0 0 auto` 로 우측 유지, label 이 먼저 줄바꿈 |

- 접근성 고려: `prefers-reduced-motion: reduce` 시 진행률 fill 의 `width` transition 을 제거(§5.2). 원본에는 없지만 **색상이 아닌 모션 접근성 보강**이므로 재사용 기준에 저촉되지 않으며, dev 재량으로 권장한다.

---

## 5. 컴포넌트 명세

각 컴포넌트는 원본 클래스명·구조·ARIA 를 그대로 승계한다. dev 는 `command.js` 의 해당 build 함수(원본 참조)를 **직접 import 하지 말고**(planner §5.2 — `command.js` 는 로드 시 원본 전용 DOM 을 전제로 `init()` 자동 실행) 마크업만 동일하게 재작성한다.

### 5.1 상단바 `.ic-topbar`

| 속성 | 값 |
|---|---|
| 구조 | `<header class="ic-topbar">` → `<h1>` + `<p class="ic-topbar__count ic-mono">` |
| h1 텍스트 | "진행률 체크리스트 검증" |
| 캡션 텍스트 | "phase18-validation · 5/5" (검증 맥락 표기 — 원본 `incident-count` 자리를 재활용) |
| 정렬 | `display:flex; flex-wrap:wrap; align-items:baseline; gap: --ic-space-3` |
| 상태 | 정적(인터랙션 없음) |

### 5.2 진행률 바 `.ic-progress` (**검증 핵심**)

| 속성 | 값 |
|---|---|
| 컨테이너 | `<div class="ic-progress" role="progressbar" aria-valuenow="{percent}" aria-valuemin="0" aria-valuemax="100" aria-label="복구 체크리스트 진행률">` |
| 높이/배경/반경 | `height:8px; background:var(--ic-progress-track); border-radius:var(--ic-radius-sm); overflow:hidden` |
| fill | `<div class="ic-progress__fill">` — `height:100%; width:{percent}%; background:var(--ic-progress-fill); transition:width 180ms ease-out` |
| 인터랙션 | 없음(표시 전용). `aria-valuenow` 와 fill `width` 는 토글 시 **동일 사이클**에서 갱신 |
| 상태 | percent 0 → fill width 0%; percent 100 → 100% |
| 접근성 | `prefers-reduced-motion:reduce` 시 `transition:none` (dev 권장 보강) |

### 5.3 진행률 텍스트 `.ic-progress__text` (**고정 포맷 계약**)

| 속성 | 값 |
|---|---|
| 마크업 | `<p class="ic-progress__text ic-mono">` |
| 텍스트 포맷 | **`"{done}/{total} 완료 ({percent}%)"`** — 원본 `progressText()` 그대로. 문구 재작성 금지(planner §5.1) |
| 스타일 | `color:var(--ic-text-secondary); font-size:12px; margin:8px 0 12px` |
| 예시 | `2/5 완료 (40%)`, `5/5 완료 (100%)`, `0/5 완료 (0%)` |

### 5.4 체크리스트 항목 `.ic-check`

| 속성 | 값 |
|---|---|
| 컨테이너 | `<li class="ic-check" data-checklist-id="{id}">` (리스트 `<ul class="ic-check-list">`) |
| checkbox | `<input type="checkbox" id="{id}" class="ic-check__box" data-checklist-id="{id}" checked?>` — `width/height:20px; accent-color:var(--ic-progress-fill); cursor:pointer` |
| label | `<label for="{id}" class="ic-check__label">{text}</label>` — `flex:1 1 auto; overflow-wrap:anywhere; cursor:pointer` |
| 완료 시각 | `done===true && completedAt` 일 때만 `<time class="ic-mono ic-check__at">{formatShortDateTime}</time>` 우측 표시 |
| 완료 상태 스타일 | `.ic-check__box:checked + .ic-check__label { text-decoration:line-through; color:var(--ic-text-muted) }` |
| 항목 배경 | `background:var(--ic-surface-raised); border:1px solid var(--ic-border); border-radius:var(--ic-radius-md)` |
| 인터랙션 | `change` 이벤트 → `toggleItem(checklist,id,nowIso)` → 새 배열로 상태 교체 → `calculateProgress` 재계산 → 바/텍스트/완료시각 리렌더(planner §4.3) |
| 상태 | ① 미완료(체크 해제, 시각 없음) ② 완료(체크·취소선·muted·완료시각) |

### 5.5 빈 체크리스트 안내 (방어적 edge, planner §4.3/§10.1)

| 속성 | 값 |
|---|---|
| 조건 | `checklist.length === 0` (v1 정상 fixture 에선 미발생) |
| 마크업 | 진행률 바를 **DOM 에 만들지 않고**(0% 오인 방지, 원본 §7.6 승계) `<p class="ic-note ic-note--dashed">` 안내 |
| 문구 | **"등록된 체크리스트 항목이 없습니다."** — 원본 "해당 장애에 등록된 복구 체크리스트가 없습니다."에서 "장애" 맥락을 제거해 progress-5 맥락에 맞게 조정(planner §4.3/§13-4 재량 반영) |
| 스타일 | `.ic-note`: `padding:--ic-space-4; border:1px dashed var(--ic-border); border-radius:--ic-radius-md; color:var(--ic-text-secondary)` (원본 복제) |
| 컨테이너 표식 | `data-checklist-state="no-checklist"` (원본 승계 — 테스트 훅) |

### 5.6 `<noscript>` 폴백 (planner §6.2-5)

JS 비활성 시 카드 상단에 안내 문구 표시: **"이 검증 페이지는 JavaScript 가 필요합니다."** — 원본 톤(간결)에 맞춰 dashed `.ic-note` 스타일 재사용.

### 5.7 컴포넌트 ↔ 원본 매핑표 (dev 참조)

| progress-5 컴포넌트 | 원본 출처(`incident-command/`) | 재사용 방식 |
|---|---|---|
| `.ic-topbar` + `h1` + `.ic-topbar__count` | `index.html` `.ic-topbar` / `style.css:116` | 구조·클래스 복제, 텍스트만 검증 맥락으로 |
| `.ic-progress` / `__fill` | `command.js buildProgressBar()` / `style.css:605` | 마크업·ARIA·CSS 그대로 복제 |
| `.ic-progress__text` | `command.js progressText()` / `style.css:619` | 고정 포맷 문구 그대로 |
| `.ic-check-list` / `.ic-check` / `__box`/`__label`/`__at` | `command.js buildChecklistItem()` / `style.css:627~669` | 그대로 복제 |
| `.ic-note.ic-note--dashed` | `style.css:577` (`TEXT.noChecklist`) | 문구만 맥락 조정(§5.5) |
| `--ic-progress-fill/track` 등 토큰 | `style.css:8~77` `:root` | 사용 토큰만 발췌 복제(§2) |

---

## 6. dev 구현 가이드

후속 dev task(`phase18-validation/progress-5/*`)가 그대로 따를 단계별 지침. planner §8 파일 구조와 정합.

### 6.1 파일별 작업

1. **`styles.css`**
   - `:root` 에 §2 의 사용 토큰만 복제(장애 심각도/상태/이벤트 색 제외). 신규 HEX 0건.
   - 컴포넌트 규칙(`.ic-topbar`/`.ic-progress`/`.ic-progress__fill`/`.ic-progress__text`/`.ic-check-list`/`.ic-check`/`.ic-check__box`/`.ic-check__label`/`.ic-check__at`/`.ic-note`)을 원본에서 복제.
   - 레이아웃만 조정: `.ic-topbar`/`main` 을 `max-width:720px; margin:0 auto` 로(원본 1400px → 단일 컬럼).
   - `@media (prefers-reduced-motion: reduce)` 로 `.ic-progress__fill { transition:none }` 보강(권장).
2. **`index.html`**
   - `<meta charset="UTF-8">` + `<title>진행률 체크리스트 검증 · progress-5</title>`.
   - §4.1 구조 마크업. `<script src="fixtures.js">` → `progress.js` → `main.js` (모두 비-module, `defer` 또는 body 하단).
   - `<noscript>` 폴백(§5.6). `command.js` 는 **로드하지 않는다**(planner §5.2).
3. **`fixtures.js`** — 정적 체크리스트 배열 최소 5건, done/미done 혼합(예: done 2 / 미done 3 → 초기 40%). UMD 노출(`module.exports`).
4. **`progress.js`** — `calculateProgress(checklist)`(planner §3.1) + `toggleItem(checklist,id,nowIso)`(planner §3.2). 순수 함수, UMD 노출.
5. **`main.js`** — DOM 바인딩: 초기 렌더 → `change` 이벤트 위임 → `toggleItem` → `calculateProgress` → 진행률 바 `style.width`+`aria-valuenow`+텍스트+완료시각 리렌더. `command.js` import 금지.

### 6.2 클래스명·ID 권장(원본 일치 + 검증 훅)

| 요소 | 권장 값 |
|---|---|
| 진행률 바 컨테이너 | `class="ic-progress"`, `role="progressbar"`, `aria-valuenow/min/max`, `aria-label="복구 체크리스트 진행률"` |
| 진행률 텍스트 | `class="ic-progress__text ic-mono"` |
| 체크리스트 컨테이너 | `id="progress-5-checklist"`, `data-checklist-state="has-items"\|"no-checklist"` |
| 항목 | `class="ic-check"`, `data-checklist-id="{id}"` |
| 완료 시각 | `class="ic-mono ic-check__at"`, `<time>` 태그 |

### 6.3 렌더 갱신 순서(불일치 방지 — planner §6.2-3)

체크박스 `change` 발생 시 **한 함수 안에서** 순서대로: ① `toggleItem` 으로 새 배열 계산 → ② `calculateProgress` 로 `{total,done,percent}` 산출 → ③ fill `style.width=percent+"%"` + `aria-valuenow` + 텍스트 `progressText` + 해당 항목 label 클래스·완료시각 DOM 을 **모두 갱신**. 개별 항목만 갱신하고 진행률 바를 나중에 갱신하는 분리 흐름 금지(값 불일치 순간이 생김).

### 6.4 검증(planner §7.7 정합)

- `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://" phase18-validation/progress-5/*` → 0건.
- `grep -rniE "login|session|auth|redirect.*sign" phase18-validation/progress-5/*` → 0건.
- `styles.css` 신규 색상 리터럴 0건(§2 토큰만).
- `incident-command/**`·`refs/infra` diff 0건.

---

## 7. mockup 참조

- **파일**: `docs/design/mockups/progress-5-BF-905.html` (본 명세와 함께 작성한 시각 mockup — system 자동 screenshot capture 경로).
- **구성**: 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). `:root` 에 §2 의 `--ic-*` 토큰 복제.
- **프레임**: ① 초기 렌더(2/5, 40%) ② 항목 토글 후(4/5, 80%, 완료 항목 취소선+완료시각) ③ 전체 완료(5/5, 100%) ④ 빈 체크리스트 안내(방어적 edge) — 4개 상태를 세로로 병치해 진행률 바·체크리스트의 상태별 시각 변화를 한 화면에서 비교 가능하게 함.
- mockup 은 정적 시각 시뮬레이션이며 dev 의 실제 산출물이 아니다. dev 는 픽셀 단위 일치 의무 없이 참조 가이드로 사용한다(진행률 바 계약·토큰·레이아웃만 준수).

---

## 8. AC 매핑 및 Self-critique

### 8.1 BF-905 수용 기준 매핑

| 수용 기준 | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 작성, Then 진행률 체크리스트 UI 명세 markdown + mockup HTML 산출 | 본 문서(`docs/design/progress-5-BF-905.md`) §1~§6 + mockup(`docs/design/mockups/progress-5-BF-905.html`) §7 |
| Given 기존 SPA 디자인 토큰, When 시안 정합성 확인, Then 기존 페이지와 시각 일관성 유지 | §2(토큰 전량 `--ic-*` 복제, 신규 색상 0건)·§3(폰트 승계)·§5.7(컴포넌트↔원본 매핑표)로 원본 `incident-command/` 와 시각 일관성 보장 |

### 8.2 Self-critique (5개 체크 — commit 직전)

1. **AC 매핑**: BF-905 수용 기준 2건이 §8.1 표로 각각 산출물·근거에 매핑됨. planner AC(§9)의 렌더·데이터·재사용 요구도 §4.1(렌더)·§5(재사용 매핑)로 시각화됨. ✅
2. **dev 구현 가이드**: §6 에 파일별 작업·클래스명/ID·렌더 갱신 순서·검증 grep 까지 단계별 명시. dev 가 새 판단 없이 따라갈 수 있음. ✅
3. **기존 요소 보존**: 원본 `incident-command/` 파일을 수정하지 않음(재사용 = 복제 재구현, planner §5.2/§7.5). `styles.css` 는 사용 토큰만 발췌 복제해 원본 계약(진행률 바 ARIA, "N/M 완료 (P%)" 포맷) 보존. ✅
4. **컴포넌트 매핑**: §5.7 매핑표로 모든 progress-5 컴포넌트가 원본 출처(`command.js` build 함수 / `style.css` 라인)에 1:1 대응. 신규 컴포넌트 0건. ✅
5. **모호함 flag**: §8.3 에 3건 명시. ✅

### 8.3 남은 모호함 (운영자/reviewer 확인 권장)

1. **테마 토글 미포함(다크 단일 확정)**: planner §4.4 는 "phase18 공통 관례대로 `bf-theme` 토글 포함"을 언급하나, 재사용 원본 `incident-command/` 는 다크 전용 + 토글 없음이며 라이트 팔레트를 새로 만들면 "신규 색상 0건" 재사용 기준(§5.4-1)을 위반한다. 본 명세는 **원본 승계 = 다크 단일 + 토글 미포함**으로 확정(§0). 운영자가 라이트 테마를 요구한다면 원본에 없는 라이트 팔레트 정의(신규 색상)가 필요하므로 재사용 기준과 상충 — 별도 결정 필요.
2. **빈 체크리스트 문구 조정**: §5.5 — 원본 "해당 장애에 등록된 복구 체크리스트가 없습니다."에서 "장애" 제거해 "등록된 체크리스트 항목이 없습니다."로 조정(planner §13-4 재량 반영). 원본 문구 그대로를 원하면 dev 가 되돌리면 됨.
3. **단일 컬럼 폭(720px)**: §4.1 — 원본 관제 레이아웃(1400px 2-pane)을 단일 체크리스트 카드용 720px 단일 컬럼으로 축소. 색상이 아닌 레이아웃 상수라 재사용 기준에 저촉되지 않으나, 특정 폭 지정이 없었으므로 dev/운영자가 조정 가능하도록 열어둠.

---

*문서 종료 — [이디자인] · BF-905*
