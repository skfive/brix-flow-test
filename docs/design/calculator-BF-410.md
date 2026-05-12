# 계산기 SPA 디자인 명세 (BF-410)

> 관련 task: BF-411 (designer)
> mockup: [`docs/design/mockups/calculator-BF-410.html`](mockups/calculator-BF-410.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `calc/index.html` (또는 진입점 `/calc`)
- 단일 카드 중심 레이아웃: **수식 표시줄 → 결과 디스플레이 → 키패드 그리드(5×4)**
- vanilla HTML/CSS/JS 기반 — notepad/timer SPA 와 동일한 토큰 시스템 공유 (`shadcn/ui` 미도입)

### 1.2 사용자 경험 목표
- **한 눈에 입력/결과**: 수식(작게, 상단)과 결과(크게, 우측 정렬)를 동시에 노출. 어떤 연산 중인지 항상 가시화.
- **마우스·터치·키보드 동등 입력**: 키패드 버튼 / 물리 키보드 1:1 매핑. PC에서도 모바일에서도 동일 흐름.
- **명확한 초기화·삭제 분리**: `C` (전체 초기화) 와 `←` (한 글자 삭제) 가 시각·키보드 모두 분리.
- **연산 우선순위 보이지 않음**: v1 은 **순차 연산** (입력 순서대로 계산) — 일반 OS 계산기와 동일. 곱셈/나눗셈 우선순위 미반영(아래 §1.3 비범위 참조).
- **빈 상태(0) 가 곧 입력 대기**: 결과 영역에 `0` 회색 표시, 입력 첫 1글자에 본문 색 전환.

### 1.3 비목표 (Out of Scope)
- **공학용 함수** (sin/cos/log/√/x²/π 등 모든 과학 계산 함수) — v1 사칙연산만
- **계산 히스토리** (이전 수식 목록·재실행) — 후속 Epic
- **메모리 기능** (`M+ / M- / MR / MC`) — 후속 Epic
- **연산 우선순위 (precedence)** — v1 은 순차 평가. `2 + 3 * 4 = 20` (왼쪽→오른쪽). 후속 Epic 에서 일반 수학 우선순위 적용 검토.
- **괄호 입력** — 우선순위와 함께 후속 Epic
- **소수점 정밀도 제어 / 지수 표기 / 반올림 옵션** — v1 은 JS `Number` 기본 동작 + 자릿수 한계 도달 시 fallback 표시(`Error`)

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/notepad-BF-400.md §2` 및 `docs/design/timer-BF-405.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth 유지). 계산기에만 필요한 토큰만 추가/확장.

### 2.1 색상 토큰 (재사용)

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드 표면 (calc card) |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 키 hover / 디스플레이 bg-secondary |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 표면 구분선·키 outline |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | 강조 outline |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 본문·결과 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | 수식·라벨 |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | 빈 상태 0·placeholder |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action(=) · focus ring |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | 초기화(C) hover 강조 |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 계산기 전용 추가 토큰

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-key-digit-bg` | `#FFFFFF` | `#1E222B` | 숫자 키 배경 (0~9, .) |
| `--color-key-digit-hover` | `#F1F1EF` | `#262B36` | 숫자 키 hover |
| `--color-key-op-bg` | `#F6F1E8` | `#2A2418` | 연산자 키 배경 (+, -, *, /) |
| `--color-key-op-hover` | `#EFE5D0` | `#3A301D` | 연산자 키 hover |
| `--color-key-op-text` | `#8A5A12` | `#D4A23A` | 연산자 키 텍스트(+, -, *, /) |
| `--color-key-fn-bg` | `#F1F1EF` | `#262B36` | 기능 키 배경 (C, ←) |
| `--color-key-fn-hover` | `#E5E5E2` | `#3A4150` | 기능 키 hover |
| `--color-key-equals-bg` | `#3563E9` | `#5B82F0` | 등호 키 배경 (=) — accent 동일 |
| `--color-key-equals-hover` | `#2A4FC0` | `#7596F3` | 등호 키 hover |
| `--color-key-equals-text` | `#FFFFFF` | `#0F1115` | 등호 키 텍스트 |
| `--color-error-text` | `#9A2A2A` | `#FCB7B7` | `Error` 표시 (0 나눗셈 등) |

> 연산자 키 톤은 `--color-accent` 와 구분되도록 **앰버 계열** (warm) 채택 — 시각 그룹화. 운영자 결정 필요 항목(§13)에 색 톤 재검토 포함.

### 2.3 공간 토큰 (재사용)

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자 (재사용)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` (작은 badge) |
| `--radius-md` | `8px` (키, button) |
| `--radius-lg` | `12px` (calc card) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` (light) / `0 4px 16px rgba(0,0,0,0.32)` (dark) |
| `--shadow-key-pressed` | `inset 0 2px 4px rgba(0,0,0,0.12)` (light) / `inset 0 2px 4px rgba(0,0,0,0.32)` (dark) |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **expression (desktop)** | `18px` | `400` | `1.4` | `0` | `--text-expr` |
| **expression (≤639px)** | `16px` | `400` | `1.4` | `0` | `--text-expr-sm` |
| **result (desktop)** | **`56px` / `3.5rem`** | `500` | `1.1` | `-0.01em` | `--text-result` |
| **result (640–959px)** | **`48px` / `3rem`** | `500` | `1.1` | `-0.01em` | `--text-result-md` |
| **result (<640px)** | **`40px` / `2.5rem`** | `500` | `1.1` | `-0.01em` | `--text-result-sm` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| **key-digit / key-op / key-fn** | `24px` | `500` | `1` | `0` | `--text-key` |
| **key-equals** | `26px` | `600` | `1` | `0` | `--text-key-equals` |

수식·결과 모두 **`--font-mono`** + `font-variant-numeric: tabular-nums` 적용 — 자릿수 변동 시 좌우 흔들림 방지. 키 라벨은 `--font-sans` (digit 도 sans-serif 가 가독성 더 좋음 — Mac/iOS 계산기 패턴).

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar · "계산기"                          [🌙]            │  56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│           ┌─────────────────────────────────┐            │
│           │              12 + 34 ×          │ expr 18px  │
│           │                          1234   │ result 56  │
│           ├─────────────────────────────────┤            │
│           │  [C ]  [← ]  [/ ]  [* ]         │            │
│           │  [7 ]  [8 ]  [9 ]  [- ]         │            │
│           │  [4 ]  [5 ]  [6 ]  [+ ]         │            │
│           │  [1 ]  [2 ]  [3 ]  [= ]         │  (= 2행)    │
│           │  [   0   ]   [. ]  │            │            │
│           └─────────────────────────────────┘            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 480px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- calc card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: var(--space-5)` (카드 내부 패딩 단일값 — 디스플레이↔키패드 간격을 `--space-4` 로 별도)
- 디스플레이 영역과 키패드 영역은 `flex column`, `gap: var(--space-4)` (디스플레이 ↔ 키패드)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "계산기" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (notepad/timer 와 동일 패턴, §9 참조)

### 4.3 디스플레이 영역 (수식 + 결과)

```
┌─────────────────────────────────┐
│ 12 + 34 ×                       │  ← expression row (우측 정렬, 작게)
│                          1234   │  ← result row (우측 정렬, 크게)
└─────────────────────────────────┘
```

- 컨테이너: `padding: var(--space-4)`, `border-radius: --radius-md`, `background: --color-bg-subtle`, `min-height: 112px` (desktop), `min-height: 96px` (mobile)
- 내부 `flex column`, `align-items: flex-end`, `justify-content: space-between`, `gap: var(--space-2)`

**수식 줄 (expression)**:
- 텍스트: `--text-expr` (desktop 18px / mobile 16px), `--font-mono`, `tabular-nums`
- 색: `--color-text-secondary`
- 빈 상태 (입력 전): 빈 문자열로 두기 (아무 텍스트 없음 — placeholder 텍스트 X)
- 표현: 연산자 사이에는 `&nbsp;` (공백) — 가독성. 곱셈/나눗셈은 화면에 **`×` / `÷` 기호** 로 치환 (입력 자체는 `*` / `/` 로 유지하되 표시만 변경)
- 최대 폭 초과 시: `text-overflow: ellipsis` + `direction: rtl` (오른쪽부터 잘리지 않고 왼쪽이 잘림)

**결과 줄 (result)**:
- 텍스트: `--text-result` (desktop 56px / md 48px / sm 40px), `--font-mono`, `tabular-nums`
- 색 상태:
  - `empty` (값 0, 입력 전): `--color-text-muted` (회색)
  - `entering` / `evaluated`: `--color-text-primary`
  - `error` (예: 0 나눗셈): `--color-error-text`, 텍스트 `Error`
- 표현: 정수는 `,` 천 단위 구분 (선택적 — §13 운영자 결정). 소수는 그대로. 자릿수 한계 (`Number.MAX_SAFE_INTEGER` 또는 폭 초과) 도달 시 `Error` 표시.
- aria: `role="status" aria-live="polite" aria-atomic="true"` — 결과 변동을 SR 가 읽음

### 4.4 키패드 그리드

#### 4.4.1 그리드 구조 (5행 × 4열)

```
┌──────┬──────┬──────┬──────┐
│  C   │  ←   │  /   │  *   │  row 1
├──────┼──────┼──────┼──────┤
│  7   │  8   │  9   │  -   │  row 2
├──────┼──────┼──────┼──────┤
│  4   │  5   │  6   │  +   │  row 3
├──────┼──────┼──────┼──────┤
│  1   │  2   │  3   │      │  row 4
├──────┴──────┼──────┤  =   │
│      0      │  .   │      │  row 5  (= 가 row4+row5)
└─────────────┴──────┴──────┘
```

**CSS Grid 사양**:
```css
.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: var(--space-2); /* 8px */
}
```

**셀 점유**:
| 키 | grid-column | grid-row |
|---|---|---|
| `C` | 1 / 2 | 1 / 2 |
| `←` | 2 / 3 | 1 / 2 |
| `/` | 3 / 4 | 1 / 2 |
| `*` | 4 / 5 | 1 / 2 |
| `7` | 1 / 2 | 2 / 3 |
| `8` | 2 / 3 | 2 / 3 |
| `9` | 3 / 4 | 2 / 3 |
| `-` | 4 / 5 | 2 / 3 |
| `4` | 1 / 2 | 3 / 4 |
| `5` | 2 / 3 | 3 / 4 |
| `6` | 3 / 4 | 3 / 4 |
| `+` | 4 / 5 | 3 / 4 |
| `1` | 1 / 2 | 4 / 5 |
| `2` | 2 / 3 | 4 / 5 |
| `3` | 3 / 4 | 4 / 5 |
| `=` | 4 / 5 | **4 / 6** (2행 차지) |
| `0` | **1 / 3** (2열 차지) | 5 / 6 |
| `.` | 3 / 4 | 5 / 6 |

#### 4.4.2 키 스타일

- **공통**: 정사각 셀 비율(`aspect-ratio: 1 / 1` — 단, = 와 0 은 자동), `border: 1px solid var(--color-border-default)`, `border-radius: --radius-md`, `font: var(--text-key)`, `cursor: pointer`, transition `background 120ms ease, transform 80ms ease`
- **숫자 키 (0~9, .)**: `background: --color-key-digit-bg`, `color: --color-text-primary`, hover `background: --color-key-digit-hover`, active `box-shadow: --shadow-key-pressed; transform: translateY(1px)`
- **연산자 키 (+, -, *, /)**: `background: --color-key-op-bg`, `color: --color-key-op-text`, hover `background: --color-key-op-hover`. 연산자 키는 화면에 다음 기호 노출:
  - `*` → `×` (U+00D7)
  - `/` → `÷` (U+00F7)
  - `-` → `−` (U+2212, minus sign)
  - `+` → `+` (그대로)
- **기능 키 (C, ←)**: `background: --color-key-fn-bg`, `color: --color-text-primary`, hover `background: --color-key-fn-hover`. `C` 는 hover 시 `color: --color-danger` (실수 방지를 위한 시각 경고)
- **등호 키 (=)**: `background: --color-key-equals-bg`, `color: --color-key-equals-text`, `font: var(--text-key-equals)`, hover `background: --color-key-equals-hover`, border 없음 (또는 동색)
- **disabled 상태**: 연산자 키는 결과 직후 또는 연산자 연속 입력 시에도 활성 유지 (덮어쓰기). 단, 빈 상태(0)에서 `=` 와 연산자 키 모두 활성 (사칙연산은 어떤 시점이든 입력 가능)
- **active(pressed) 상태**: 마우스 down 또는 키보드 down 시 `transform: translateY(1px) + --shadow-key-pressed` 적용. 약 80ms.

#### 4.4.3 정량 치수

| 항목 | 값 (desktop) | 비고 |
|---|---|---|
| 카드 max-width | `480px` | hardcoded |
| 카드 padding | `24px` | `--space-5` |
| 디스플레이 min-height | `112px` | hardcoded |
| 디스플레이↔키패드 gap | `16px` | `--space-4` |
| 키패드 grid gap | `8px` | `--space-2` |
| 키 최소 높이 (정사각 기준) | `64px` (≈ 480 - 48 - 24 = 408 / 4 = 102 - gap) — 자동 | aspect-ratio 1 |
| 키 폰트 (숫자/연산자/기능) | `500 24px/1` | `--text-key` |
| 등호 키 폰트 | `600 26px/1` | `--text-key-equals` |
| 키 border-radius | `8px` | `--radius-md` |
| 키 active translateY | `1px` | hardcoded |

### 4.5 빈 상태 (값 0, 입력 전)

- 결과 줄: `0` (회색 `--color-text-muted`)
- 수식 줄: 빈 (텍스트 없음)
- 모든 키 활성 (단, `=` 와 `←` 는 동작 시 의미 없는 no-op — 시각 변화 없이 무시)
- 첫 1글자 입력 시 결과 줄 색이 즉시 `--color-text-primary` 로 전환

### 4.6 에러 상태 (0 나눗셈 / overflow)

- 결과 줄: `Error` (`--color-error-text`, `--text-result` weight `500`)
- 수식 줄: 기존 수식 유지 (어떤 입력에서 에러가 났는지 보이게)
- 사용자 액션:
  - 어떤 키든 (숫자/연산자/`.`) 입력하면 자동 초기화 후 새 입력 시작
  - `C` 누르면 즉시 초기화
  - `=` 누르면 `Error` 유지 (no-op)
- aria: `role="alert"` 로 SR 즉시 알림 — 디스플레이 영역의 `aria-live` 가 `polite` 에서 `assertive` 로 일시 격상은 하지 않고, 별도 시각/색 변경만으로 표현 (a11y 권장 — assertive 남용 회피)

### 4.7 반응형 Breakpoint

| breakpoint | 동작 |
|---|---|
| `≥ 960px` (desktop) | card max-width `480px`, result `--text-result` (56px), expr `--text-expr` (18px), 키 폰트 24px |
| `640px – 959px` (tablet) | card max-width `420px`, result `--text-result-md` (48px), 키 폰트 22px, gap `--space-2` 유지 |
| `< 640px` (mobile) | card max-width `100%` (좌우 `margin: var(--space-3)`), result `--text-result-sm` (40px), expr `--text-expr-sm` (16px), 키 폰트 20px, 키 padding `var(--space-3)`, 디스플레이 min-height `96px` |
| `< 360px` (XS) | 키 폰트 18px, 디스플레이 패딩 `--space-3` |

mobile/XS 에서도 그리드 구조(5×4) 자체는 유지. 폭 좁아지면 키 정사각이 자연 축소.

---

## 5. 컴포넌트 명세

### 5.1 `<ExpressionLine>` (수식 줄)
props:
- `expression: string` (예: `"12 + 34 ×"`)
- `error: boolean`

명세:
- §4.3 (expression 줄) 참조
- 빈 문자열일 때는 노드 자체를 빈 상태로 두고 높이 보존 (`min-height: 1.4em`)
- 연산자 치환은 표시 단계에서 (`*` → `×`, `/` → `÷`, `-` → `−`)

### 5.2 `<ResultLine>` (결과 줄)
props:
- `value: string` (예: `"1234"`, `"3.14"`, `"0"`, `"Error"`)
- `state: "empty" | "entering" | "evaluated" | "error"`

명세:
- §4.3 (result 줄) 참조
- aria: `role="status" aria-live="polite" aria-atomic="true"`
- 천 단위 콤마는 §13 운영자 결정 후 적용 (default OFF — 단순 표시)

### 5.3 `<Keypad>` (키패드 그리드)
props:
- `onKey(key: string)` — key 는 `"0"~"9"`, `"."`, `"+"`, `"-"`, `"*"`, `"/"`, `"="`, `"C"`, `"backspace"`
- `state: "idle" | "entering" | "evaluated" | "error"`

명세:
- §4.4 참조 — CSS Grid 5×4
- 각 키는 `<button type="button" class="key key--digit|key--op|key--fn|key--equals" data-key="0">`
- 키 라벨은 본문 텍스트(`<span class="key__label">`)와 aria 라벨 분리:
  - `*` 키: 라벨 `×`, `aria-label="곱하기"`
  - `/` 키: 라벨 `÷`, `aria-label="나누기"`
  - `-` 키: 라벨 `−`, `aria-label="빼기"`
  - `+` 키: 라벨 `+`, `aria-label="더하기"`
  - `=` 키: 라벨 `=`, `aria-label="계산"`
  - `C` 키: 라벨 `C`, `aria-label="전체 지우기"`
  - `←` 키: 라벨 `←`, `aria-label="한 글자 삭제"`
  - 숫자/`.` 키: 라벨 = aria-label

### 5.4 `<CalcCard>` (전체 컨테이너)
- §4.1 + §4.3 + §4.4 의 조합. 별도 props 없음.

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신

```
        ┌────────────────────────┐
        │       empty (0)        │◄────┐
        └───────────┬────────────┘     │
        숫자/'.' 입력 │                 │ C
                  ▼                    │
        ┌────────────────────────┐     │
   ┌────┤      entering          ├─────┤
   │    └───────────┬────────────┘     │
   │ 연산자 입력      │                  │
   │                ▼                  │
   │    ┌────────────────────────┐     │
   └────►   entering (op_pending)├─────┤
        └───────────┬────────────┘     │
            숫자/'.' 입력 │              │
                  ▼                    │
        ┌────────────────────────┐     │
        │  entering (rhs)        ├─────┤
        └───────────┬────────────┘     │
                = 입력 │                │
                  ▼                    │
        ┌────────────────────────┐     │
        │      evaluated         ├─────┤
        └─────┬───────────┬──────┘     │
              │ 숫자 입력  │ 연산자 입력 │
              ▼           ▼            │
            empty      entering        │
              (자동 리셋)  (결과를 LHS로) │
                                       │
        ┌────────────────────────┐     │
        │       error            ├─────┘
        └────────────────────────┘
        (어떤 키든 입력 시 empty 로 자동 복귀)
```

**중요 전이 규칙**:
- `entering` → 연산자 입력 시: 현재 값을 LHS 로 저장, 연산자 pending, 결과는 그대로 표시 (커서 이동 느낌)
- `evaluated` → 숫자 입력 시: 결과 폐기 후 empty 로 리셋한 뒤 입력 시작 (계산기 표준 동작)
- `evaluated` → 연산자 입력 시: 결과를 LHS 로 사용해서 연쇄 계산 (예: `12 + 3 = 15` 후 `* 2 =` 누르면 `30`)
- `error` → 어떤 키든: empty 로 자동 복귀 후 해당 키 입력 처리 (단, `=` 와 `←` 는 그냥 empty 로만 복귀)

### 6.2 순차 평가 (precedence 없음)

v1 은 입력 순서대로 좌→우 평가:
- `2 + 3 = 5` → 그 다음 `* 4` 누르면 LHS=5, op=*, → 다음 숫자 입력 후 `=` 누르면 `5 * 4 = 20`
- 즉, 같은 연산자 그룹 내에서는 일반 계산기 동작과 동일. 우선순위 적용 X (후속 Epic).

### 6.3 키보드 단축키 / 입력 매핑

| 물리 키 | 동작 | aria-label 일치 |
|---|---|---|
| `0`–`9` | 해당 숫자 입력 | ✓ |
| `.` | 소수점 입력 | ✓ |
| `+` | 더하기 | ✓ |
| `-` | 빼기 | ✓ |
| `*` 또는 `Shift+8` | 곱하기 | ✓ |
| `/` | 나누기 | ✓ |
| `Enter` 또는 `=` | 계산 (`=` 동일) | ✓ |
| `Escape` | 전체 초기화 (`C` 동일) | ✓ |
| `Backspace` | 한 글자 삭제 (`←` 동일) | ✓ |
| `Delete` | 전체 초기화 (`C` 별칭 — `Escape` 와 동등) | ✓ |
| `Tab` / `Shift+Tab` | topbar 토글 → C → ← → / → * → 7 → … → 0 → . 순환 (`grid-area` 기준 행 우선) | — |

**구현 노트**:
- `document.addEventListener("keydown", handler)` 전역 등록
- focus 가 input/textarea 가 아닐 때만 매핑 (현재 페이지엔 input/textarea 없으니 사실상 모든 상황)
- `event.key` 기반 매핑 (`event.code` 아님 — 키보드 레이아웃 호환)
- `event.preventDefault()` 는 `Backspace` 와 `Enter` 에 한해 적용 (브라우저 기본 동작 차단)
- 키 누르는 동안 해당 버튼에 `active` 클래스 부여 후 `keyup` 시 제거 → 시각 피드백 일치

**focus-visible 표시**: 모든 키 버튼은 `:focus-visible` 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. 마우스 클릭 focus 에서는 outline X (`:focus` 단독 X).

### 6.4 입력 제한·검증

- **소수점 중복 차단**: 현재 입력 중인 숫자에 이미 `.` 있으면 추가 `.` 입력 무시 (no-op, 시각 변화 없음)
- **연산자 연속 입력**: 마지막 입력이 연산자일 때 다른 연산자 누르면 **덮어쓰기** (예: `12 + -` 시 op 는 `-` 로 교체). 표시도 갱신.
- **0 으로 시작**: 빈 상태에서 `0` 누르면 그대로 `0`, 그 다음 `0` 또 누르면 무시 (`0` 만 유지). `.` 누르면 `0.`. 다른 숫자 누르면 `0` 폐기 후 그 숫자로 시작 (예: `0` → `5` 입력 → `5`).
- **0 나눗셈**: `5 / 0 =` 입력 시 결과 `Error`, state `error` 진입
- **자릿수 한계**: 결과 또는 입력 중 값이 `Number.MAX_SAFE_INTEGER` 초과 또는 폭 16자 초과 시 `Error` 전이

### 6.5 다크 모드
- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad/timer SPA 와 동일) — 페이지 간 일관성 자동 유지
- 첫 로드 시 OS `prefers-color-scheme` 따라 초기화 (저장값 우선)

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)
```
/
├── calc/
│   ├── index.html       # 계산기 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃 (notepad/styles.css 의 :root 재활용)
│   ├── main.js          # 상태 머신 + 입력 처리 + 키보드 바인딩
│   └── calc.js          # 순수 평가 함수 (LHS, op, RHS 기반) — 단위 테스트 용이
├── notepad/             # 기존 메모장 SPA (보존)
├── timer/               # 기존 타이머 SPA (보존)
└── docs/design/
    ├── calculator-BF-410.md         (본 문서)
    └── mockups/calculator-BF-410.html (시각 mockup)
```

대안: 단일 디렉토리 prefix 방식 (`calc.html`) 도 가능하나, v1 권장은 **`calc/` 하위 디렉토리** (notepad/timer 와 패턴 통일).

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>계산기</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">계산기</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <section class="card" aria-label="계산기">
        <!-- 디스플레이 -->
        <div class="display" id="display">
          <div class="display__expr" id="expr" aria-hidden="true"></div>
          <div class="display__result" id="result" role="status" aria-live="polite" aria-atomic="true">0</div>
        </div>

        <!-- 키패드 -->
        <div class="keypad" role="group" aria-label="계산기 키패드">
          <button type="button" class="key key--fn" data-key="C" aria-label="전체 지우기">C</button>
          <button type="button" class="key key--fn" data-key="backspace" aria-label="한 글자 삭제">←</button>
          <button type="button" class="key key--op" data-key="/" aria-label="나누기"><span aria-hidden="true">÷</span></button>
          <button type="button" class="key key--op" data-key="*" aria-label="곱하기"><span aria-hidden="true">×</span></button>

          <button type="button" class="key key--digit" data-key="7" aria-label="7">7</button>
          <button type="button" class="key key--digit" data-key="8" aria-label="8">8</button>
          <button type="button" class="key key--digit" data-key="9" aria-label="9">9</button>
          <button type="button" class="key key--op" data-key="-" aria-label="빼기"><span aria-hidden="true">−</span></button>

          <button type="button" class="key key--digit" data-key="4" aria-label="4">4</button>
          <button type="button" class="key key--digit" data-key="5" aria-label="5">5</button>
          <button type="button" class="key key--digit" data-key="6" aria-label="6">6</button>
          <button type="button" class="key key--op" data-key="+" aria-label="더하기">+</button>

          <button type="button" class="key key--digit" data-key="1" aria-label="1">1</button>
          <button type="button" class="key key--digit" data-key="2" aria-label="2">2</button>
          <button type="button" class="key key--digit" data-key="3" aria-label="3">3</button>
          <button type="button" class="key key--equals" data-key="=" aria-label="계산">=</button>

          <button type="button" class="key key--digit key--zero" data-key="0" aria-label="0">0</button>
          <button type="button" class="key key--digit" data-key="." aria-label="소수점">.</button>
        </div>

        <!-- keyboard hint -->
        <p class="kbd-hint">
          <kbd>0</kbd>–<kbd>9</kbd> <kbd>+</kbd> <kbd>−</kbd> <kbd>*</kbd> <kbd>/</kbd> ·
          <kbd>Enter</kbd> 계산 · <kbd>Esc</kbd> 초기화 · <kbd>Backspace</kbd> 삭제
        </p>
      </section>
    </main>

    <script type="module" src="main.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치

`calc/styles.css` 상단에 `:root` 블록 — **notepad/styles.css 의 토큰을 그대로 복사** + 본 명세의 §2.2(계산기 전용) + §3 type 토큰 추가:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color tokens (notepad-BF-400 §2.1 재사용) */
  --color-bg-canvas: #FAFAF9;
  /* … notepad 토큰 전체 복사 … */

  /* calc 전용 (§2.2) */
  --color-key-digit-bg: #FFFFFF;
  --color-key-digit-hover: #F1F1EF;
  --color-key-op-bg: #F6F1E8;
  --color-key-op-hover: #EFE5D0;
  --color-key-op-text: #8A5A12;
  --color-key-fn-bg: #F1F1EF;
  --color-key-fn-hover: #E5E5E2;
  --color-key-equals-bg: #3563E9;
  --color-key-equals-hover: #2A4FC0;
  --color-key-equals-text: #FFFFFF;
  --color-error-text: #9A2A2A;

  /* spacing / radius / shadow (notepad 와 동일) */
  --space-1: 4px; /* … */
  --radius-lg: 12px;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-key-pressed: inset 0 2px 4px rgba(0,0,0,0.12);

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-expr: 400 18px/1.4 var(--font-mono);
  --text-expr-sm: 400 16px/1.4 var(--font-mono);
  --text-result: 500 56px/1.1 var(--font-mono);
  --text-result-md: 500 48px/1.1 var(--font-mono);
  --text-result-sm: 500 40px/1.1 var(--font-mono);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-key: 500 24px/1 var(--font-sans);
  --text-key-equals: 600 26px/1 var(--font-sans);
}
[data-theme="dark"] {
  --color-bg-canvas: #0F1115;
  /* … dark 값 (notepad 와 동일) + calc 전용 dark 값 … */
  --color-key-digit-bg: #1E222B;
  --color-key-digit-hover: #262B36;
  --color-key-op-bg: #2A2418;
  --color-key-op-hover: #3A301D;
  --color-key-op-text: #D4A23A;
  --color-key-fn-bg: #262B36;
  --color-key-fn-hover: #3A4150;
  --color-key-equals-bg: #5B82F0;
  --color-key-equals-hover: #7596F3;
  --color-key-equals-text: #0F1115;
  --color-error-text: #FCB7B7;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.32);
  --shadow-key-pressed: inset 0 2px 4px rgba(0,0,0,0.32);
}
```

### 7.4 키패드 CSS Grid 핵심

```css
.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: var(--space-2);
}
.key {
  aspect-ratio: 1 / 1;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font: var(--text-key);
  cursor: pointer;
  transition: background 120ms ease, transform 80ms ease, box-shadow 80ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.key:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.key:active,
.key.is-active {
  transform: translateY(1px);
  box-shadow: var(--shadow-key-pressed);
}

/* variants */
.key--digit { background: var(--color-key-digit-bg); color: var(--color-text-primary); }
.key--digit:hover { background: var(--color-key-digit-hover); }
.key--op { background: var(--color-key-op-bg); color: var(--color-key-op-text); }
.key--op:hover { background: var(--color-key-op-hover); }
.key--fn { background: var(--color-key-fn-bg); color: var(--color-text-primary); }
.key--fn:hover { background: var(--color-key-fn-hover); }
.key--fn[data-key="C"]:hover { color: var(--color-danger); }
.key--equals {
  background: var(--color-key-equals-bg);
  color: var(--color-key-equals-text);
  font: var(--text-key-equals);
  border-color: transparent;
  grid-row: 4 / 6;       /* 2행 차지 */
  aspect-ratio: auto;    /* equals 는 직사각 */
}
.key--equals:hover { background: var(--color-key-equals-hover); }
.key--zero {
  grid-column: 1 / 3;    /* 2열 차지 */
  aspect-ratio: auto;
}
```

### 7.5 단계별 구현 순서 (권장)

1. **7.2 골격 HTML 작성** + 빈 `styles.css` / `main.js`
2. **CSS 변수 + base reset** (notepad/timer 와 동일 — `*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **Topbar** (notepad/timer 와 동일 패턴, 다크 토글만)
4. **Page + card 컨테이너** (max-width, padding, box-shadow)
5. **Display 영역 (정적)** — `0` 텍스트 + tabular-nums + 우측 정렬
6. **Keypad CSS Grid** — 7.4 의 grid 정의 적용 후 시각 확인 (=가 2행, 0이 2열)
7. **키 variant 색** — digit / op / fn / equals 4종 분기
8. **active 시각 피드백** — `:active` + `.is-active` 클래스 시각화
9. **state 객체** (`main.js`) — `{state, expression, currentInput, lhs, op, lastResult}` + `render()` 함수
10. **calc.js 평가 함수** — `evaluate(lhs, op, rhs)` 순수 함수 (단위 테스트 가능)
11. **클릭 입력 핸들러** — `keypad.addEventListener("click", e => dispatch(e.target.dataset.key))`
12. **물리 키보드 핸들러** — §6.3 매핑 적용, `keydown` 시 해당 버튼 `is-active` 추가
13. **에러 처리** — 0 나눗셈·overflow → `error` state 전이
14. **반응형** — `@media (max-width: 959px)` / `@media (max-width: 639px)` / `@media (max-width: 359px)`
15. **다크 토글** — `theme.js` 분리 또는 main.js 내부, `localStorage["bf-theme"]` 공유

### 7.6 a11y 체크
- 모든 키: `<button type="button">` + `aria-label` (시각 기호와 다를 때 한국어 라벨)
- result: `role="status" aria-live="polite" aria-atomic="true"`
- expression: `aria-hidden="true"` (SR 가 매 입력마다 수식 전체를 읽지 않도록 — 결과만 polite 로 알림)
- error 상태: 색·텍스트(`Error`) 변경만으로 표현. `role="alert"` 추가 검토 가능하나 `polite` 와의 충돌로 v1 은 시각만 의존 (§13 운영자 결정 후 보강)
- focus-visible only outline (`:focus` 단독 X)
- 키보드 hint: `<kbd>` 사용으로 SR 가 단축키임을 인지

### 7.7 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop) | 토큰 |
|---|---|---|
| calc card max-width | `480px` | hardcoded |
| card padding | `24px` | `--space-5` |
| display min-height | `112px` | hardcoded |
| display padding | `16px` | `--space-4` |
| display↔keypad gap | `16px` | `--space-4` |
| keypad grid columns | `repeat(4, 1fr)` | hardcoded |
| keypad grid rows | `repeat(5, 1fr)` | hardcoded |
| keypad gap | `8px` | `--space-2` |
| key aspect-ratio | `1 / 1` (= 와 0 제외) | hardcoded |
| key border-radius | `8px` | `--radius-md` |
| key font (숫자/연산자/기능) | `500 24px/1` | `--text-key` |
| key font (=) | `600 26px/1` | `--text-key-equals` |
| key active translateY | `1px` | hardcoded |
| result font-size (≥960px) | `56px` | `--text-result` |
| result font-size (640–959px) | `48px` | `--text-result-md` |
| result font-size (<640px) | `40px` | `--text-result-sm` |
| expression font-size (≥640px) | `18px` | `--text-expr` |
| expression font-size (<640px) | `16px` | `--text-expr-sm` |
| `=` grid-row | `4 / 6` (2행) | hardcoded |
| `0` grid-column | `1 / 3` (2열) | hardcoded |
| focus-ring outline | `2px solid` + `offset 2px` | `--color-focus-ring` |

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<ResultLine>` | vanilla — shadcn 미제공 (커스텀 unique) |
| `<ExpressionLine>` | vanilla — `<span>` 단순 텍스트 |
| 키패드 키 (digit/op/fn) | `Button` (`size: lg`, `variant: secondary / outline`) — variant 는 색 토큰으로 직접 분기 |
| 등호 키 (`=`) | `Button` (`size: lg`, `variant: default`) — accent 색 적용 |
| `<CalcCard>` | `Card` (`<CardContent>` 내부에 디스플레이+키패드) |
| 다크 토글 | vanilla (notepad/timer 와 공유 패턴) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`calc/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/timer.js`, `timer/storage.js` — 본 작업과 무관, 변경 금지
- 기존 SPA 들의 테스트 파일 (`tests/notepad-*.test.js`, `tests/timer-*.test.js`) — 변경 금지

### 9.2 신규 `calc/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | timer/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | timer/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="light">` 패턴 | timer/index.html | **복제** | data-theme 속성 토큰 시스템 의존 |
| `<link rel="stylesheet" href="styles.css">` | timer/index.html | **복제 + 경로 수정** | calc/styles.css 로 향함 |
| `<script type="module" src="main.js">` | timer/index.html | **복제 + 경로 수정** | calc/main.js |
| `<header class="topbar">` 구조 | timer/index.html | **복제 (간소화)** | timer 와 동일 — 제목 변경 ("계산기") + `[🌙]` 다크 토글만 유지 |
| `:root` CSS 변수 블록 | timer/styles.css (또는 notepad/styles.css) | **복제** + §2.2 추가 토큰 append | single source of truth: 본 명세 |
| `bf-theme` localStorage 초기화 로직 | timer/main.js (또는 같이 작성된 theme init) | **복제** 또는 **공유 모듈화** | `theme.js` 로 분리 후 양쪽 import 권장. v1 은 단순 복붙 OK |

### 9.3 추가/수정해야 할 부분 (calc 전용)

- calc card / display(expr+result) / keypad grid 마크업 (§7.2)
- calc 전용 색·typo 토큰 (§2.2, §3)
- 계산기 상태 머신·평가 함수 (§6.1, §6.2, calc.js)
- 키패드 입력 처리·물리 키 매핑 (§6.3)
- 에러 처리 (0 나눗셈, overflow) (§6.4)

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지부터 확인.

---

## 10. mockup 참조

[`docs/design/mockups/calculator-BF-410.html`](mockups/calculator-BF-410.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0)
- light/dark 두 패널을 나란히 표시 → 토큰 매핑 시각 검증
- 4가지 상태별 패널 동시 표시:
  1. **empty (0)** — 입력 대기 (회색 0)
  2. **entering** — `12 + 34 ×`, 결과 `56`
  3. **evaluated** — `12 + 34 =`, 결과 `46`
  4. **error** — `5 / 0 =`, 결과 `Error` (빨간색)
- mobile (< 640px) 레이아웃 미리보기 섹션 별도 포함
- focus-visible outline 시각 (키 1개에 정적 표현)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.7 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 키패드 레이아웃 (0~9, ., +, -, *, /, =, C, ←) | §4.4 (5×4 그리드 + grid-area 표), §7.2 (HTML 골격) | ✓ |
| 수식·결과 영역 | §4.3 (디스플레이 영역) + §5.1, §5.2 | ✓ |
| 반응형 분기 (모바일/태블릿/데스크탑) | §4.7 (Breakpoint 표) + §7.7 정량 표 | ✓ |
| 디자인 토큰 매핑 | §2.1 (재사용) + §2.2 (계산기 전용) + §2.3 spacing + §2.4 radius + §3 type | ✓ |
| 키보드 매핑 (숫자/연산자/Enter=계산/Escape=초기화) | §6.3 (단축키 표) + §7.6 (a11y) + §7.7 (focus-ring 정량) | ✓ |
| 정량값 (px/rem, 토큰 키) 명시 | §7.7 정량 일치 표 (모든 핵심 치수) | ✓ |
| 비범위 명시 (공학용·히스토리·메모리) | §1.3 (5개 explicit 제외) | ✓ |
| dev 가 추측 없이 구현 가능 | §7 (파일 구조·HTML 골격·CSS 변수·15단계 구현 순서·§7.7 정량 표) | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 8개 AC 모두 cross-reference, 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·grid 정의·15단계 구현 순서·§7.7 정량 일치 표 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존(notepad/timer 양쪽), §9.2 복제 대상(head/script/theme 초기화), §9.3 신규 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 매핑 가이드 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 4건 |

추가 자체 점검:
- **비범위 명시**: §1.3 에 공학용·히스토리·메모리·우선순위·괄호·소수 정밀도 6개 explicit 제외 ✓
- **정량 일치 가능성**: §7.7 표가 desktop/tablet/mobile 별 핵심 치수 모두 px/rem/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **키보드 Esc/Enter 충돌**: 현 페이지에 input/textarea 없으므로 충돌 X. 후속 modal 도입 시 우선순위 정책 §13-3 에 flag ✓
- **error 상태 a11y**: §7.6 에 `role="alert"` 미사용 사유(`polite` 와의 충돌) 명시, §13-4 운영자 결정으로 보강 가능 ✓
- **연산자 우선순위 미반영 위험**: §6.2 에 순차 평가 정책 명시 + §1.3 비범위로 explicit 제외 → 사용자 혼동 방지 위해 dev 가 README/툴팁 1줄 추가 권장 (§13-2 와 별개) ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §2.2 / §4.3 / §6.4 만 수정):

1. **연산자 키 톤 (앰버 vs 중립 회색)** — 현재 default 는 `--color-key-op-bg: #F6F1E8` (앰버 계열) 로 숫자/기능 키와 시각 분리. 대안: `--color-bg-subtle` (회색) 적용해 더 차분하게. **권장: default(앰버) 유지**, 사용자 테스트 후 조정.
2. **수식 미리보기에 우선순위 미적용 안내** — `2 + 3 * 4 = 20` 결과가 일반 수학과 다를 수 있음. UI 어딘가(키보드 hint 옆 또는 첫 진입 후 1회 toast) 에 "순차 계산" 안내 표시 여부. **권장: hint 라인 하단에 작은 caption 1줄 추가** ("연산자 우선순위 미적용") 또는 미표시(단순성 우선).
3. **천 단위 콤마 표시** — 결과 `1234567` 을 `1,234,567` 로 표시할지. 입력 중에는 적용하지 않고 `evaluated` 결과에만 적용 검토. **권장: v1 OFF (단순 표시)**, 후속 Epic 에서 옵션화.
4. **error 상태 a11y 강도** — 현 default 는 시각만 (`Error` 텍스트 + 색). `role="alert"` 추가 시 SR 가 즉시 알리지만 `aria-live="polite"` 와 충돌 가능. **권장: v1 default(시각만)** 유지하고 사용자 피드백 후 보강.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
