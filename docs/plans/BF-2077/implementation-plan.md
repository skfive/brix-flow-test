# BF-2077 계산기 구현 설계 문서

- Jira: BF-2077 (Epic) / BF-2080 (planner task)
- 작성: 박기획 (planner)
- 상태: frozen — designer(BF-2078), developer(BF-2079)는 본 문서와 frozen blueprint의 `ui-contract`를 그대로 따른다.

## 1. 개요

숫자/연산자 버튼과 디스플레이로 구성된 기본 사칙연산 계산기를 구현한다. 순수 함수 기반 상태 전이(`applyInput`, `evaluate`)로 UI 로직과 렌더링을 분리하고, designer/developer는 아래에 동결된 DOM/CSS/토큰/접근성/반응형 계약을 변경 없이 구현한다.

## 2. 상태 정의

| phase 값 | 한글명 | 의미 |
|---|---|---|
| `input-entry` | 입력중 | 사용자가 숫자를 입력하고 있는 상태 |
| `operator-pending` | 연산자대기 | 연산자를 선택했고 두 번째 피연산자 입력을 기다리는 상태 |
| `result` | 결과 | `=` 로 계산이 완료되어 결과가 표시된 상태 |
| `error` | 에러 | 계산 불가(0으로 나누기 등)로 에러가 표시된 상태 |

### state 스키마 (developer 구현 기준)

```js
/**
 * @typedef {Object} CalculatorState
 * @property {'input-entry'|'operator-pending'|'result'|'error'} phase
 * @property {string} display   // 화면에 표시되는 문자열
 * @property {number|null} left // 저장된 좌항 값
 * @property {'+'|'-'|'*'|'/'|null} operator
 * @property {boolean} overwrite // true면 다음 숫자 입력이 display를 덮어씀
 */
```

초기 state: `{ phase: 'input-entry', display: '0', left: null, operator: null, overwrite: true }`

## 3. 순수 함수 시그니처

```js
/**
 * 순수 함수. 인자로 받은 state를 변경하지 않고 새 state 객체를 반환한다.
 * @param {CalculatorState} state
 * @param {string} key // '0'-'9' | '.' | '+' | '-' | '*' | '/' | '=' | 'C' | '±'
 * @returns {CalculatorState} newState
 */
function applyInput(state, key) {}

/**
 * 순수 함수. 두 피연산자와 연산자로 계산 결과를 반환한다.
 * @param {number} left
 * @param {'+'|'-'|'*'|'/'} operator
 * @param {number} right
 * @returns {number | { error: true }} // 0으로 나누기 등 계산 불가 시 { error: true }
 */
function evaluate(left, operator, right) {}
```

**불변 state 반환 규칙**: `applyInput`은 인자로 받은 `state` 객체와 그 내부 값을 직접 수정하지 않는다. 항상 새 객체를 생성해 반환하며, 변경되지 않는 필드도 새 객체에 복사해 포함한다. `evaluate`는 인자를 전혀 변경하지 않고 값만 반환한다.

## 4. 상태 전이표

| 현재 phase | 입력 key | 다음 phase | display 규칙 | 비고 |
|---|---|---|---|---|
| input-entry | 숫자 (0-9) | input-entry | 기존 문자열에 append (overwrite=true면 새로 시작) | overwrite → false |
| input-entry | `.` | input-entry | 소수점 추가 (이미 있으면 무시) | |
| input-entry | `±` | input-entry | 부호 반전 | |
| input-entry | 연산자 (+-*/) | operator-pending | 직전 결과 값 유지 (left=현재 display 값) | left=파싱값, operator=key, overwrite=true |
| input-entry | `=` | result | 계산 결과 숫자 | left/operator 없으면 현재 값을 그대로 result로 취급(no-op 계산) |
| input-entry | `C` | input-entry(초기) | `'0'` | left=null, operator=null, overwrite=true |
| operator-pending | 숫자 (0-9) | input-entry | 새 입력 시작 | overwrite=false |
| operator-pending | 연산자 (+-*/) | operator-pending | 직전 결과 값 유지 | operator를 새 key로 교체(연산자 재입력) |
| operator-pending | `±` | operator-pending | 직전 결과 값 유지 | left 부호 반전 |
| operator-pending | `=` | result | 계산 결과 숫자 | right=left로 간주해 `evaluate(left, operator, left)` |
| operator-pending | `C` | input-entry(초기) | `'0'` | 전체 초기화 |
| result | 숫자 (0-9) | input-entry | 새 입력 시작 | left/operator 초기화 후 overwrite=false |
| result | 연산자 (+-*/) | operator-pending | 직전 결과 값 유지 | left=결과값, operator=key |
| result | `=` | result | 계산 결과 숫자 (변화 없음) | idempotent, 재계산 없음 |
| result | `C` | input-entry(초기) | `'0'` | 전체 초기화 |
| error | 숫자 (0-9) | input-entry | 새 입력 시작 | 에러 상태 초기화 후 입력 |
| error | `C` | input-entry(초기) | `'0'` | 전체 초기화 |
| error | 연산자/`=`/`.`/`±` | error | `'Error'` (변화 없음) | `C` 외 입력은 무시 |
| (모든 phase) | `evaluate` 결과가 `{error:true}` | error | `'Error'` | 0으로 나누기 등 |

**공통 후조건**: `C` 입력 시 어떤 phase에서든 `display='0'`으로 복원되고 `left`/`operator`가 초기화되며, 모든 버튼 컨트롤이 재활성화된다(비활성 상태로 남는 버튼이 없어야 한다).

## 5. Edge Case / 실패 케이스

- **0으로 나누기**: `evaluate(left, '/', 0)` → `{ error: true }` → phase=`error`, display=`'Error'`.
- **소수점 중복 입력**: 이미 `.`이 포함된 문자열에 `.` 입력 시 무시(state 변화 없음, display 동일 유지).
- **연속 연산자 입력**: `operator-pending`에서 다른 연산자 입력 시 마지막 연산자로 교체(누산하지 않음).
- **에러 상태에서 연산 계속 시도**: `error` phase에서 `C` 이외의 key는 무시하고 동일 state 유지(display `'Error'` 그대로).
- **첫 입력 없이 `=` 입력**: `input-entry` 초기 상태(`left=null`)에서 `=` 입력 시 현재 표시값을 그대로 결과로 취급(계산 오류를 발생시키지 않음).

## 6. UI 계약 (frozen — designer/developer는 selector/token을 변경·재정의하지 않는다)

### 6.1 산출물 파일 및 소유자

| 경로 | 소유자 | 정책 |
|---|---|---|
| `docs/design/calculator-BF-2077.md` | designer | additive |
| `docs/design/mockup/calculator.html` | designer | additive |
| `calculator/index.html` | developer | additive |
| `calculator/style.css` | developer | additive |
| `calculator/calculator.js` | developer | additive |
| `calculator/calculator.test.js` | developer | additive |

### 6.2 DOM ID / CSS Class

- DOM ID: `calculator-app`, `calculator-display`, `calculator-keypad`
- CSS Class: `calculator`, `calculator__display`, `calculator__button`, `calculator__button--operator`, `calculator__button--equals`

### 6.3 상태별 화면 텍스트 (고정)

| phase | 화면 텍스트 규칙 |
|---|---|
| input-entry | 입력된 숫자 문자열 |
| operator-pending | 직전 결과 값 유지 |
| result | 계산 결과 숫자 |
| error | `Error` |

`C` 입력 시 `'0'`으로 복원되고 모든 버튼 컨트롤이 재활성화된다.

### 6.4 디자인 토큰 (CSS 변수, 고정)

```
--color-bg-calculator: #1e1e1e;
--color-display-bg: #0f0f0f;
--color-display-text: #f5f5f5;
--color-button-bg: #2c2c2c;
--color-button-operator-bg: #ff9f0a;
--color-button-text: #ffffff;
--font-family-calculator: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--space-button-gap: 8px;
```

### 6.5 접근성 요구사항

- 각 숫자/연산자/`=`/`C`/`±` 버튼은 명시적 `aria-label`을 가진다 (예: `aria-label="더하기"`, `aria-label="초기화"`, `aria-label="부호 전환"`, `aria-label="계산"`).
- 결과 디스플레이(`#calculator-display`)는 `role="status" aria-live="polite"`로 상태 변경을 스크린리더에 알린다.
- 키패드는 키보드 tab 순서로 접근 가능하며 포커스 아웃라인이 시각적으로 표시된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 6.6 반응형 breakpoint

- 320px 이상 뷰포트에서 `calculator__button` 키패드가 4열 그리드로 표시되며 content overflow가 발생하지 않는다.
- 480px 이상에서는 디스플레이와 키패드가 최대 360px 폭 컨테이너 내에 중앙 정렬된다.

## 7. Acceptance Criteria (Given/When/Then)

1. **기본 사칙연산**
   Given phase=input-entry, display='0'
   When 사용자가 `5`, `+`, `3`, `=` 를 순서대로 입력하면
   Then phase는 result로 전이되고 display는 `8` 을 표시한다.

2. **연산자 대기 중 직전 결과 유지**
   Given phase=input-entry, display='5'
   When 사용자가 `+`를 입력하면
   Then phase는 operator-pending으로 전이되고 display는 `5`를 그대로 유지한다.

3. **0으로 나누기 에러**
   Given phase=operator-pending, left=5, operator='/'
   When 사용자가 `0`, `=`를 입력하면
   Then phase는 error로 전이되고 display는 `Error`를 표시한다.

4. **에러 상태에서 초기화**
   Given phase=error, display='Error'
   When 사용자가 `C`를 입력하면
   Then phase는 input-entry로 전이되고 display는 `0`이 되며 모든 버튼이 재활성화된다.

5. **소수점 중복 입력 방지**
   Given phase=input-entry, display='1.5'
   When 사용자가 `.`를 다시 입력하면
   Then state는 변경되지 않고 display는 `1.5`를 그대로 유지한다.

6. **키보드 접근성**
   Given 사용자가 마우스 없이 키보드만 사용하는 상황
   When Tab 키로 키패드를 순회하면
   Then 모든 버튼에 포커스가 가능하고 포커스 아웃라인이 시각적으로 표시된다.
