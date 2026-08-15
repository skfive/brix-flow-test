# 계산기 UI 시안 — BF-2078

- Jira: BF-2078 (designer task) / 상위 Epic BF-2077
- 작성: 이디자인 (designer)
- 근거: `docs/plans/BF-2077/implementation-plan.md` (frozen `ui-contract@v1`) — 본 문서는 해당 계약의 DOM id/class/토큰/상태/접근성/반응형 정의를 재정의하지 않고 시각 시안으로 구현한다.

## 1. 시안 개요

- **변경 범위**: 숫자 버튼(0-9), 소수점(`.`), 사칙연산자(`+ - * /`), `=`, `C`(초기화), `±`(부호 전환)로 구성된 단일 화면 계산기 UI.
- **사용자 경험 목표**: 다크 테마의 단일 컬럼 계산기. 디스플레이는 항상 현재 입력/결과/에러 상태를 텍스트로 명확히 보여주고, 키패드는 4열 그리드로 손가락/마우스/키보드 어느 입력에도 동일한 접근성을 제공한다.
- **상태 범위**: `input-entry`(입력중), `operator-pending`(연산자대기), `result`(결과), `error`(에러) — 4가지 phase를 화면 텍스트로 구분해 표시한다(색상에만 의존하지 않음).

## 2. 컬러 팔레트 (frozen 토큰 그대로 사용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg-calculator` | `#1e1e1e` | 계산기 카드 배경 (`.calculator`) |
| `--color-display-bg` | `#0f0f0f` | 디스플레이 배경 (`.calculator__display`) |
| `--color-display-text` | `#f5f5f5` | 디스플레이 텍스트 |
| `--color-button-bg` | `#2c2c2c` | 숫자/기타 버튼 배경 |
| `--color-button-operator-bg` | `#ff9f0a` | 연산자·`=` 버튼 배경 (`.calculator__button--operator`, `.calculator__button--equals`) |
| `--color-button-text` | `#ffffff` | 버튼 텍스트 |

> 위 6개는 frozen 계약의 값 그대로이며 변경·재정의하지 않는다. 아래는 계약에 없는 인터랙션(hover/focus/error 강조) 표현을 위해 designer가 추가로 제안하는 **보충 토큰**이다. 이름이 frozen 토큰과 겹치지 않으며, developer가 채택 여부를 자유롭게 조정할 수 있는 선택 사항이다.

| 보충 토큰 (선택) | 값 | 용도 |
|---|---|---|
| `--color-button-hover-bg` | `#3a3a3a` | 숫자/기타 버튼 hover |
| `--color-button-operator-hover-bg` | `#ffb03d` | 연산자·`=` 버튼 hover |
| `--color-focus-ring` | `#4da6ff` | 키보드 포커스 아웃라인 (`:focus-visible`) |
| `--color-error-accent` | `#ff6b6b` | 에러 상태 디스플레이 좌측 강조선(텍스트 `Error`를 보조하는 시각 신호, 색상 단독 지시 아님) |

## 3. 타이포그래피

`--font-family-calculator: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;` (frozen) 를 모든 텍스트에 사용한다.

| 요소 | font-size | weight | line-height | 비고 |
|---|---|---|---|---|
| 디스플레이 숫자 (`.calculator__display`) | 2.5rem (40px) | 500 | 1.2 | 우측 정렬, `font-variant-numeric: tabular-nums` |
| 상태 캡션 (시각적으로 숨김, sr-only) | 0.875rem (14px) | 400 | 1.4 | phase 한글명을 스크린리더에 전달 |
| 버튼 라벨 (`.calculator__button`) | 1.375rem (22px) | 500 | 1 | 숫자/연산자 공통 |
| `=` 버튼 라벨 | 1.375rem (22px) | 600 | 1 | 주요 액션 강조 |

## 4. 레이아웃

- **구조**: `#calculator-app`(`.calculator`) > `#calculator-display`(`.calculator__display`, `role="status" aria-live="polite"`) + `#calculator-keypad`(`.calculator__button` × 18개).
- **spacing**: 키패드 버튼 간격은 `--space-button-gap: 8px` (frozen). 디스플레이-키패드 간격 16px, 카드 내부 패딩 20px.
- **키패드 그리드**: `display:grid; grid-template-columns: repeat(4, 1fr);` — 320px 이상 뷰포트에서 4열 유지, overflow 없음. 버튼 18개(숫자 10 + `.` 1 + 연산자 4 + `=` 1 + `C` 1 + `±` 1) 중 `0` 버튼만 `grid-column: span 2`로 2칸을 차지해 하단 행 정렬을 맞춘다(별도 CSS class 신설 없이 `[data-key="0"]` 구조적 선택자로 처리 — frozen class 목록 외 신규 class를 만들지 않기 위함).
- **키패드 배열 (5행 × 4열)**:

  | 1열 | 2열 | 3열 | 4열 |
  |---|---|---|---|
  | `C` | `±` | `/` | `*` |
  | `7` | `8` | `9` | `-` |
  | `4` | `5` | `6` | `+` |
  | `1` | `2` | `3` | `=` |
  | `0` (span 2) | | `.` | |

- **breakpoint**:
  - `< 480px`: `.calculator`는 뷰포트 폭에 맞춰 유동 너비(최소 320px 대응, 좌우 여백 16px).
  - `>= 480px`: `.calculator`는 `max-width: 360px`로 고정되고 뷰포트 내 중앙 정렬(`margin: 0 auto`).

## 5. 컴포넌트 명세

### 5.1 `#calculator-app` (`.calculator`)
- **역할**: 계산기 전체를 감싸는 카드 컨테이너.
- **스타일**: 배경 `--color-bg-calculator`, `border-radius: 20px`, `padding: 20px`.
- **props/상태**: 없음 (정적 컨테이너).

### 5.2 `#calculator-display` (`.calculator__display`)
- **역할**: 현재 phase의 화면 텍스트를 표시.
- **상태별 텍스트 (frozen, 고정)**:

  | phase | 화면 텍스트 |
  |---|---|
  | `input-entry` | 입력된 숫자 문자열 (예: `123`, `0`) |
  | `operator-pending` | 직전 결과 값 유지 (예: `5`) |
  | `result` | 계산 결과 숫자 (예: `8`) |
  | `error` | `Error` |

- **인터랙션**: 값이 바뀔 때마다 텍스트 노드가 갱신되며 `aria-live="polite"`로 스크린리더에 자동 낭독. `error` phase에서는 `--color-error-accent` 좌측 4px 보더로 보조 강조(색상 단독이 아니라 `Error` 텍스트가 1차 신호).
- **속성**: `role="status"`, `aria-live="polite"` (frozen).

### 5.3 `#calculator-keypad` (`.calculator__button` 그룹)
- **역할**: 18개 입력 버튼 그리드.
- **버튼 종류 및 class**:
  - 숫자(`0`-`9`), `.`, `±`, `C`: `.calculator__button` (배경 `--color-button-bg`)
  - `+ - * /`: `.calculator__button .calculator__button--operator` (배경 `--color-button-operator-bg`)
  - `=`: `.calculator__button .calculator__button--equals` (배경 `--color-button-operator-bg`)
- **상태**: 각 버튼은 `default / hover / focus-visible / active` 4가지 시각 상태를 갖는다. 비활성(disabled) 상태는 없음 — 계약상 "재활성화" 요구는 모든 버튼이 항상 활성 상태를 유지함을 의미(자체적으로 disable 로직을 두지 않음).
- **인터랙션**: 클릭/Enter/Space로 입력, `Tab`으로 순회, `:focus-visible` 시 `--color-focus-ring` 2px 아웃라인.
- **aria-label 매핑**:

  | 버튼 | aria-label |
  |---|---|
  | `0`-`9` | `숫자 0` ~ `숫자 9` |
  | `.` | `소수점` |
  | `+` | `더하기` |
  | `-` | `빼기` |
  | `*` | `곱하기` |
  | `/` | `나누기` |
  | `=` | `계산` |
  | `C` | `초기화` |
  | `±` | `부호 전환` |

## 6. dev 구현 가이드

1. `calculator/index.html`에 `#calculator-app.calculator` > `#calculator-display.calculator__display[role=status][aria-live=polite]` + `#calculator-keypad.calculator__button 그룹` 구조를 그대로 마크업한다. DOM id 3종(`calculator-app`, `calculator-display`, `calculator-keypad`)과 class 5종은 절대 이름을 바꾸지 않는다.
2. `calculator/style.css`의 `:root`에 frozen 토큰 8개(`--color-bg-calculator` 등)를 선언한다. §2 보충 토큰(hover/focus/error-accent)은 채택 시 동일하게 `:root`에 추가하되 이름 충돌이 없어야 한다.
3. 키패드는 `display:grid; grid-template-columns: repeat(4,1fr); gap: var(--space-button-gap);`로 구현. `0` 버튼만 `grid-column: span 2` 적용(§4 배열 참고).
4. 각 버튼에 `data-key` 속성(예: `data-key="7"`, `data-key="+"`, `data-key="="`, `data-key="C"`, `data-key="±"`)을 부여해 `calculator.js`의 `applyInput(state, key)` 호출과 1:1 매핑한다. `aria-label`은 §5.3 표를 그대로 적용한다.
5. `#calculator-display` 텍스트는 state.phase에 따라 §5.2 규칙으로 렌더링한다. `error` phase일 때만 `.calculator__display`에 시각적 보조 강조(테두리 등)를 추가해도 되지만 텍스트 `Error` 노출이 필수이며 색상만으로 상태를 표현하지 않는다.
6. `C` 입력 시 모든 버튼의 시각적 상태(hover/active 잔상 등)를 초기화하고 어떤 버튼도 비활성 상태로 남지 않아야 한다(§5.3 상태 규칙).
7. `:focus-visible`에 `outline: 2px solid var(--color-focus-ring)`(또는 대체 가시적 아웃라인)를 반드시 적용해 키보드 접근성 요구를 만족한다.
8. 반응형: 320px 이상에서 4열 유지·overflow 없음, 480px 이상에서 `.calculator { max-width: 360px; margin: 0 auto; }` 적용.

## 7. mockup 참조

- 시각 mockup: `docs/design/mockup/calculator.html` (정적 self-contained HTML, 4개 상태 섹션 포함)
