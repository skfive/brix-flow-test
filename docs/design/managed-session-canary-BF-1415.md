# 관리형 세션 상태 카드 — 시각 명세 (BF-1416 / Epic BF-1415)

> 본 문서는 designer가 작성하는 **시각 명세**이며, planner가 동결한 **ui-contract@v1**
> (`docs/plans/managed-session-canary-BF-1415.md`)을 그대로 시각화한 것이다.
> selector·상태·token·접근성·반응형 계약을 **변경하거나 재정의하지 않는다**.
> 실제 런타임 HTML/CSS/JS(`demo/managed-session-canary/**`)는 developer(BF-1417)가 구현하며,
> 본 문서와 함께 첨부한 mockup HTML은 시안 시각화 전용 참조물이다(런타임 산출물 아님).

## 1. 시안 개요

- **변경 범위**: `/demo/managed-session-canary` 화면의 페르소나 상태 카드 목록 + 상태 필터.
- **사용자 경험 목표**:
  - 세션 상태를 페르소나 카드로 한눈에 파악하고, 상태 필터로 원하는 상태만 걸러 본다.
  - `loading → loaded → (empty|error)` 4개 상태를 명확한 화면 텍스트로 항상 노출한다.
  - 색상만으로 상태를 구분하지 않고, 상태명 텍스트를 시각·접근성 이름으로 함께 노출한다.
- **불변 원칙**: 인증·공용 레이아웃·DB 미변경, frozen selector/token 미변경, 신규 파일/역할 미추가.

## 2. 컬러 팔레트

frozen design token을 유일 권위로 사용한다. hardcoded 색상 대신 아래 CSS 변수를 참조한다.

| 역할 | 토큰 | HEX | 용도 |
| --- | --- | --- | --- |
| status / active | `--color-status-active` | `#16a34a` | 활성 카드(`persona-card--active`) 상태 강조 |
| status / idle | `--color-status-idle` | `#64748b` | 유휴 카드(`persona-card--idle`) 상태 강조 |
| status / error | `--color-status-error` | `#dc2626` | 오류 카드(`persona-card--error`) 상태 강조 + error 상태 텍스트 |
| background | (stack 자체 정의) `#ffffff` | `#ffffff` | 화면/카드 배경 |
| surface | (stack 자체 정의) `#f1f5f9` | `#f1f5f9` | 필터 영역·요약 배경, 카드 hover surface |
| text / primary | (stack 자체 정의) `#0f172a` | `#0f172a` | 제목·본문 기본 텍스트 |
| text / secondary | (stack 자체 정의) `#475569` | `#475569` | 요약·보조 텍스트 |
| border | (stack 자체 정의) `#e2e8f0` | `#e2e8f0` | 카드·필터 테두리 |

> frozen token(`--color-status-*`)은 값·이름 변경 금지. 나머지 배경/텍스트/보더는
> `vanilla-static` stack 규약에 따라 `:root`에서 자체 정의(CSS 변수)하며 외부 의존성 0건.

## 3. 타이포그래피

`vanilla-static` 규약: system font stack만 사용(외부 폰트 로드 없음).

```
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| heading (화면 제목) | `--font-sans` | `20px` | `700` | `1.4` |
| card title (페르소나명) | `--font-sans` | `16px` | `600` | `1.4` |
| body / status (상태 텍스트) | `--font-sans` | `14px` | `600` | `1.5` |
| summary (상태 요약) | `--font-sans` | `14px` | `500` | `1.5` |
| caption (보조/빈 상태 안내) | `--font-sans` | `13px` | `400` | `1.5` |

## 4. 레이아웃

### 4.1 섹션 구조 (위→아래)

```
#session-canary-root .session-canary
├─ 화면 제목 (heading)
├─ .session-canary__filter  (#status-filter 포함)   ← loading 시 disabled
├─ #status-summary          (상태 요약 텍스트)       ← loaded 시 노출
└─ #persona-card-list       (.persona-card 목록)     ← 상태별 렌더 영역
```

### 4.2 spacing (frozen token 기준)

- 카드 간 간격: `--space-card-gap = 16px` (목록 그리드 `gap`).
- 카드 모서리: `--radius-card = 8px`.
- 섹션 간 세로 여백: `16px`, 화면 외곽 padding: `16px`.
- 카드 내부 padding: `16px`.

### 4.3 breakpoint 별 동작 (frozen responsive 계약)

| breakpoint | `#persona-card-list` 레이아웃 |
| --- | --- |
| `320px` 이상 | 세로 1열 스택(`grid-template-columns: 1fr`), content overflow 없음 |
| `640px` 이상 | 2열 grid(`grid-template-columns: repeat(2, 1fr)`), `gap: var(--space-card-gap)` |

- 320px 미만 유사 좁은 폭에서도 카드 텍스트가 줄바꿈되어 overflow 없이 세로 스택 유지.
- 필터 영역은 좁은 폭에서 label + control이 세로로 쌓이거나 wrap 되도록 처리.

## 5. 컴포넌트 명세

### 5.1 상태 필터 — `#status-filter` (`.session-canary__filter`)

- **역할**: 로드된 카드 목록을 상태별로 필터링하는 control(권장: `<select>`).
- **옵션**: `전체`(초기값) / `active` / `idle` / `error`.
- **props / 데이터**: 선택값이 `#persona-card-list` 렌더를 필터링. `전체 보기`는 초기값(전체)으로 복원.
- **상태**:
  - `loading` → **disabled**(비활성), 조작 차단(경합 방지).
  - `loaded` / `empty` → **활성**.
- **인터랙션**: 키보드 Tab 포커스 → Enter/방향키로 옵션 선택 가능.
- **접근성**: `aria-label='상태 필터'` 명시.

### 5.2 페르소나 카드 — `.persona-card`

- **데이터 형태**: `{ personaId, personaName, status }`, `status ∈ {active, idle, error}`.
- **구조**:
  - 페르소나명(card title)
  - `.persona-card__status` — 상태 텍스트(예: `활성`/`유휴`/`오류`) + 상태 색상.
- **상태 변형 class**:
  - `persona-card--active` → 좌측 4px 강조선·상태 텍스트 색 `--color-status-active`, 상태 텍스트 `활성`.
  - `persona-card--idle` → `--color-status-idle`, 상태 텍스트 `유휴`.
  - `persona-card--error` → `--color-status-error`, 상태 텍스트 `오류`.
- **접근성**: `.persona-card__status`는 색상 외에 상태명 텍스트를 항상 노출(색상만으로 구분 금지).
- **인터랙션**: hover 시 surface(`#f1f5f9`) 배경 강조(정적 표현). 클릭 동작은 계약 범위 밖.

### 5.3 상태 요약 — `#status-summary`

- **역할**: 현재 로드된 카드의 상태별 합계 텍스트(예: `활성 2 · 유휴 1 · 오류 1`).
- **상태**: `loaded`에서 노출. `loading`/`error`에서는 숨김 또는 미표시.

### 5.4 화면 상태 4종 (states) — 화면 텍스트 계약

| 상태 | 화면 표현 및 텍스트(정확한 문자열) | 필터 |
| --- | --- | --- |
| `loading` | `세션 상태를 불러오는 중…` 텍스트만 표시 | 비활성(disabled) |
| `loaded` | `#persona-card-list` 카드 목록 + `#status-summary` 요약 텍스트 | 활성 |
| `empty` | `해당 상태의 페르소나가 없습니다` 텍스트 + `전체 보기` 복원 control | 활성 |
| `error` | `상태를 불러오지 못했습니다` 텍스트 + `다시 시도` control | (재시도 시 `loading` 복원) |

- **후조건**: 초기화/취소/실패 뒤 상태·진행 표시를 초기값으로 되돌리고, 주 실행 control
  (필터·`전체 보기`·`다시 시도`)을 다시 사용할 수 있어야 한다.

## 6. dev 구현 가이드 (developer BF-1417 참조용)

> 아래는 시안 재현을 돕는 권장 사항이다. frozen selector/token/텍스트/상태 계약은 **필수**,
> 그 외 CSS 세부(패딩 값 등)는 참조 가이드(픽셀 단위 일치 의무 없음).

1. **CSS 변수 정의**(`:root` 또는 `.session-canary` 스코프):
   - frozen token 그대로: `--color-status-active:#16a34a; --color-status-idle:#64748b; --color-status-error:#dc2626; --space-card-gap:16px; --radius-card:8px;`
   - stack 자체 정의: `--font-sans`, `--color-bg:#ffffff`, `--color-surface:#f1f5f9`, `--color-text:#0f172a`, `--color-text-2:#475569`, `--color-border:#e2e8f0`.
2. **루트 마크업**: `#session-canary-root` > `.session-canary` 안에 제목 → `.session-canary__filter`(`#status-filter`) → `#status-summary` → `#persona-card-list` 순.
3. **필터 control**: `<select id="status-filter" aria-label="상태 필터">` + `전체/active/idle/error` 옵션. `loading` 시 `disabled` 부여.
4. **카드 목록**: `#persona-card-list`는 `display:grid; gap:var(--space-card-gap);` — 기본 1열, `@media (min-width:640px)`에서 `grid-template-columns:repeat(2,1fr)`.
5. **카드**: `.persona-card`(+ 상태별 `persona-card--active|idle|error`), 내부에 페르소나명과 `.persona-card__status`(상태 텍스트) 배치. `border-radius:var(--radius-card);`.
6. **상태 색상**: 상태 변형 class에서 `--color-status-*`를 참조해 상태 텍스트/강조선 색 지정(hardcoded HEX 직접 사용 금지).
7. **상태 전이**: `loading→loaded→(empty|error)`, `error`의 `다시 시도` → `loading` 복원. `empty`의 `전체 보기` → 필터 초기값 복원.
8. **접근성**: `#status-filter` `aria-label='상태 필터'`, 상태 텍스트는 색상과 별개로 항상 DOM 텍스트로 노출, 필터 Tab/Enter 조작 가능.

## 7. mockup 참조

- 시각 mockup HTML: `docs/design/mockups/managed-session-canary-BF-1416.html`
- 4개 상태(loading/loaded/empty/error)와 320px/640px 반응형 배치를 단일 self-contained HTML로 시각화(외부 의존성 0건, vanilla CSS).
- mockup은 시안 시각화 전용 참조물이며 developer의 실제 산출물이 아니다(픽셀 단위 일치 의무 없음).

## 8. Self-critique

- **AC 매핑**: §5.4 상태 표(loading/loaded/empty/error)와 §2 token 표가 planner의 AC-1~AC-8 및 frozen ui-contract(§4.4/4.5/4.6/4.7)와 1:1 대응. 화면 텍스트 문자열을 계약과 동일하게 명시.
- **dev 구현 가이드**: §6에 CSS 변수명·selector·상태 전이·접근성까지 단계별로 기술 — developer가 그대로 따를 수 있음.
- **기존 요소 보존**: 인증·공용 레이아웃·DB 미변경 원칙 §1 명시. 신규 파일/역할 미추가.
- **컴포넌트 매핑**: frozen DOM ID(`session-canary-root`/`status-filter`/`persona-card-list`/`status-summary`)와 CSS class 전부를 §5 컴포넌트 명세로 커버.
- **모호함 flag**: 필터 control의 구체 요소(select vs 버튼 그룹)는 계약이 미지정 → `<select>` 권장으로 제안하되, developer가 접근성(Tab/Enter, `aria-label`)·상태 계약을 만족하면 대체 구현 허용. 그 외 미해결 모호함 없음.
