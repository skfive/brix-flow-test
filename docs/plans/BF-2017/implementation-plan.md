# BF-2017 계산기 — 구현 설계 (BF-2020 planner 산출물)

- Jira: BF-2020 (BF-2017 epic 하위 planner task)
- 대상 기능: 사칙연산 계산기 (client-only, vanilla HTML/CSS/JS)
- 본 문서 목적: designer(BF-2018)·developer(BF-2019)가 그대로 따를 실행 설계와, frozen 상태인 UI 계약(DOM/CSS/token/상태/접근성/반응형)을 정제된 문서 형태로 제공

## 0. 범위 원칙

본 문서는 시스템이 이미 동결한 아래 Execution Blueprint 를 **그대로 설명**한다. 새 파일, 새 DOM ID/class, 새 역할을 추가하지 않는다. selector·DOM ID·token 값은 frozen 이므로 designer/developer는 변경·재정의하지 않는다.

### 0.1 파일 소유권 (frozen, 그대로 유지)

| 파일 | 소유 역할 | 상태 |
|---|---|---|
| `calculator/index.html` | developer | additive (frozen) |
| `calculator/style.css` | developer | additive (frozen) |
| `calculator/calc.js` | developer | additive (frozen) |
| `calculator/tests/calc.test.js` | developer | additive (frozen) |
| `docs/design/BF-2017-calculator-mockup.html` | designer | additive (frozen) |
| `docs/design/BF-2017-calculator-spec.md` | designer | additive (frozen) |
| `docs/plans/BF-2017/implementation-plan.md` | planner (본 문서) | 본 task 산출물 |

### 0.2 후조건 (frozen invariant, 그대로 유지)

- designer/developer는 selector, DOM ID, token 을 변경하거나 재정의하지 않는다.
- 초기화(AC)·취소·실패(오류) 뒤에는 상태와 진행 표시(디스플레이)를 초기값("0", idle)으로 되돌리고, 주 실행 control(숫자/연산자/등호 버튼)을 다시 사용할 수 있어야 한다.
- 파일 소유권과 상태 계약은 이 frozen blueprint 가 유일한 권위이며 본 planner 문서는 이를 재정의하지 않는다.

## 1. 사용자 시나리오

사용자는 브라우저에서 계산기 화면을 열고, 마우스 클릭 또는 키보드로 숫자·연산자·등호(=)·전체 지우기(AC)·백스페이스를 입력해 사칙연산(+, -, ×, ÷) 결과를 얻는다. 연산자를 연속으로 입력하면 왼쪽에서 오른쪽 순서(좌결합)로 즉시 계산되며, 0으로 나누기를 시도하면 오류 메시지를 보여주고 AC 입력으로만 복구된다.

## 2. Acceptance Criteria (Given/When/Then)

### AC-1. 기본 사칙연산
- Given 계산기가 idle 상태이고
- When 사용자가 `3` `+` `5` `=` 를 순서대로 입력하면
- Then 디스플레이는 `8` 을 표시하고 상태는 result 로 전이한다.

### AC-2. 좌결합 연속 연산
- Given 계산기가 entering 상태에서 피연산자와 연산자가 이미 저장되어 있고 (예: `3` `+` `5` 입력됨, `+` 대기 중)
- When 사용자가 추가 연산자(`×`)를 입력하면
- Then 계산기는 우선순위 없이 저장된 연산(3+5=8)을 즉시 수행해 8을 새 첫 피연산자로 삼고, 새 연산자(`×`)를 대기시킨다.
- 예: `3 + 5 × 2 =` → `(3+5)×2` = `16` (수학적 연산자 우선순위 미적용, 입력 순서대로 좌결합).

### AC-3. 소수점 입력
- Given 계산기가 idle 또는 entering 상태이고
- When 사용자가 `.` 을 입력하면
- Then 현재 입력값에 소수점이 없을 때만 소수점이 추가되고, 이미 있으면 무시된다.

### AC-4. 0으로 나누기 오류 및 복구
- Given 계산기가 entering 상태에서 `a ÷ 0` 형태로 등호(`=`) 또는 다음 연산자를 입력하면
- When 두 번째 피연산자가 0인 나눗셈이 실행되면
- Then 상태는 error 로 전이하고 디스플레이는 `0으로 나눌 수 없습니다` 를 표시한다.
- And error 상태에서는 `AC`(btn-clear, 또는 키보드 Escape) 입력만 idle 로 복구시키며, 그 외 모든 입력(숫자/연산자/등호/Backspace)은 무시된다.
- And idle 로 복구되면 디스플레이는 `0` 으로 초기화되고 숫자/연산자/등호 버튼을 다시 사용할 수 있다.

### AC-5. 키보드 매핑
- Given 계산기가 포커스를 가진 상태이고
- When 사용자가 숫자 키(0-9), `.`, 연산자 키(`+` `-` `*` `/`), `Enter`, `Escape`, `Backspace` 중 하나를 누르면
- Then 대응하는 버튼을 클릭한 것과 동일하게 동작한다 (아래 3.2 표).

### AC-6. 초기화(AC)·Backspace
- Given 계산기가 임의 상태이고
- When 사용자가 `AC`(btn-clear) 를 입력하면
- Then 상태는 idle 로, 디스플레이는 `0` 으로, 저장된 피연산자/연산자는 모두 초기화된다.
- When entering 상태에서 `Backspace`(btn-backspace) 를 입력하면
- Then 마지막 입력 문자가 삭제되고, 삭제 후 값이 비면 디스플레이는 `0` 이 된다.

### AC-7. Result 상태에서의 재입력
- Given 계산기가 result 상태이고
- When 사용자가 새 숫자를 입력하면
- Then 이전 결과는 폐기되고 새 계산이 entering 상태로 시작된다.
- When 사용자가 연산자를 입력하면
- Then 이전 결과를 첫 피연산자로 사용해 연속 계산을 대기한다(entering).

## 3. 상태 전이표

상태: `idle` (초기) · `entering` (입력 중) · `result` (계산 완료) · `error` (오류)

| 현재 상태 | 입력 | 조건 | 다음 상태 | 동작 |
|---|---|---|---|---|
| idle | 숫자(0-9) | - | entering | 디스플레이에 숫자 표시, 첫 피연산자 입력 시작 |
| idle | 소수점(.) | - | entering | 디스플레이 `0.` 으로 시작 |
| idle | 연산자(+-*/) | 피연산자 없음 | idle | 무시 |
| idle | 등호(=) | 피연산자 없음 | idle | 무시 |
| idle | Backspace | - | idle | 무시 |
| idle | AC | - | idle | 디스플레이 `0` 유지(변화 없음) |
| entering | 숫자(0-9) | - | entering | 디스플레이 끝에 숫자 추가 |
| entering | 소수점(.) | 현재 입력에 소수점 없음 | entering | 소수점 추가 |
| entering | 소수점(.) | 이미 소수점 존재 | entering | 무시 |
| entering | 연산자 | 대기 중인 연산자 없음(첫 연산자) | entering | 현재 값을 첫 피연산자로 저장, 연산자 저장, 다음 입력 대기 |
| entering | 연산자 | 대기 중인 연산자 있음(좌결합) | entering | 저장된 연산 즉시 수행 → 결과를 새 첫 피연산자로, 새 연산자 저장, 중간 결과 표시 |
| entering | 연산자(÷ 계산 실행 시 두 번째 피연산자=0) | 0으로 나누기 | error | `0으로 나눌 수 없습니다` 표시 |
| entering | 등호(=) | 피연산자·연산자 모두 있음, 0 나누기 아님 | result | 계산 수행, 최종 결과 표시 |
| entering | 등호(=) | 피연산자·연산자 모두 있음, 두 번째 피연산자=0 이고 연산자=÷ | error | `0으로 나눌 수 없습니다` 표시 |
| entering | 등호(=) | 연산자 없음(피연산자 1개) | entering | 무시 |
| entering | Backspace | 입력값 2자 이상 | entering | 마지막 문자 삭제 |
| entering | Backspace | 입력값 1자 | entering | 디스플레이 `0` 으로 초기화 |
| entering | AC | - | idle | 피연산자/연산자/디스플레이 전체 초기화, 디스플레이 `0` |
| result | 숫자(0-9) | - | entering | 이전 결과 폐기, 새 입력값으로 디스플레이 교체(새 계산 시작) |
| result | 소수점(.) | - | entering | `0.` 으로 새 계산 시작 |
| result | 연산자 | - | entering | 이전 결과를 첫 피연산자로 사용, 연산자 저장(연속 계산 대기) |
| result | 등호(=) | - | result | 무시(상태 유지, 재계산 없음) |
| result | Backspace | - | result | 무시 |
| result | AC | - | idle | 전체 초기화, 디스플레이 `0` |
| error | 숫자/소수점/연산자/등호/Backspace | - | error | 무시(오류 메시지·상태 유지) |
| error | AC(btn-clear) | - | idle | 오류·피연산자·연산자 초기화, 디스플레이 `0`, 주 실행 control 재사용 가능 |

### 3.1 계산기 내부 상태 모델 (client 메모리, 서버/DB 없음)

- `state`: `idle` \| `entering` \| `result` \| `error`
- `displayValue`: string — 화면 표시 문자열
- `firstOperand`: number \| null
- `pendingOperator`: `+` \| `-` \| `*` \| `/` \| null
- `errorMessage`: string \| null (error 상태일 때만 `0으로 나눌 수 없습니다`)

### 3.2 키보드 매핑

| 키 | 매핑 대상 | 설명 |
|---|---|---|
| `0`-`9` | 숫자 버튼(class `calculator__button`) | 자리 숫자 입력 |
| `.` | 소수점 버튼 | 소수점 입력 |
| `+` `-` `*` `/` | 연산자 버튼(class `calculator__button--operator`) | 사칙연산자 입력 |
| `Enter` | `#btn-equals` | 결과 계산(=) |
| `Escape` | `#btn-clear` | 전체 초기화(AC), error 상태에서도 idle 로 복구 |
| `Backspace` | `#btn-backspace` | 마지막 입력 문자 삭제 |

## 4. UI 계약 (frozen — designer/developer 그대로 구현, 변경/재정의 금지)

### 4.1 파일

`calculator/index.html`, `calculator/style.css`, `calculator/calc.js`, `calculator/tests/calc.test.js`, `docs/design/BF-2017-calculator-mockup.html`, `docs/design/BF-2017-calculator-spec.md`

### 4.2 DOM ID

`calculator-root`, `calculator-display`, `btn-clear`, `btn-backspace`, `btn-equals`

### 4.3 CSS class

`calculator`, `calculator__display`, `calculator__button`, `calculator__button--operator`

### 4.4 상태

`idle`, `entering`, `result`, `error`

### 4.5 Design token

- `--color-display-bg: #1e293b`
- `--color-display-text: #f8fafc`
- `--color-button-bg: #e2e8f0`
- `--color-button-operator-bg: #2563eb`
- `--space-button-gap: 8px`

### 4.6 접근성

- 각 버튼은 값을 설명하는 명시적 `aria-label` 을 가진다 (예: `btn-equals` → `aria-label="결과 계산"`).
- 디스플레이(`#calculator-display`)는 `aria-live="polite"` 로 값 변경을 즉시 알린다.
- 모든 상태(idle/entering/result/error)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.7 반응형

- 320px 이상 뷰포트에서 버튼 grid와 디스플레이가 overflow 없이 유지된다.

## 5. Edge case / 실패 케이스

- 연속 소수점 입력(`1..2`) → 두 번째 `.` 무시 (3.1 참조)
- 결과(result) 상태에서 바로 숫자 입력 → 새 계산 시작(이전 결과 폐기)
- 결과(result) 상태에서 연산자 입력 → 이전 결과로 연속 계산 시작
- 0 나누기 발생 후 AC 이외 입력 → 전부 무시(오류 상태 유지)
- entering 상태에서 피연산자 1개만 있고 등호 입력 → 무시(계산할 연산 없음)
- Backspace 로 마지막 한 자리 삭제 시 디스플레이는 `0` 으로 유지
- 매우 긴 숫자·오버플로우 표시 방식은 본 task 범위 밖이며 별도 명세하지 않는다(추가 요구 없음)

## 6. API / 데이터 모델

본 기능은 client-only 정적 페이지이며 서버 API·영속 데이터 모델이 없다. 상태는 3.1의 in-memory 모델을 따른다.
