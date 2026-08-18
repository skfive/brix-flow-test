# BF-2171 · 진법 변환기 구현 설계

> 이 문서는 designer(BF-2172)와 developer(BF-2173)가 그대로 따를 실행 설계입니다.
> 새 파일이나 새 역할을 추가하지 않으며, 파일 소유권과 상태 계약은 아래 [7. 파일 소유권 및 산출물 위치](#7-파일-소유권-및-산출물-위치)에 고정된 frozen blueprint를 그대로 옮긴 것입니다.

## 1. 요구사항 개요

진법 변환기는 사용자가 2 / 8 / 10 / 16진수 중 하나로 숫자를 입력하면, 그 값을 나머지 진법을 포함한
4개 진법(2 / 8 / 10 / 16) 표현으로 즉시 변환해 보여주는 클라이언트 사이드(vanilla JS) 도구다.

- 입력 진법: 라디오 그룹으로 2 / 8 / 10 / 16 중 하나를 선택한다.
- 입력값은 정수만 지원한다(소수점 미지원).
- 변환 결과는 입력 진법 자신을 포함한 4개 진법 모두에 대해 동시에 표시한다.
- 각 진법 결과는 개별 복사 버튼으로 클립보드에 복사할 수 있다.
- 잘못된 입력(빈 값 / 공백 / 소수점 / 허용되지 않는 문자 / 안전 정수 범위 초과)은 결과 대신 명시적 오류를 표시한다.

## 2. 진법별 허용 문자 규칙표

| 진법 | 코드 | 허용 문자 | 대소문자 |
|---|---|---|---|
| 2진수 | `2` | `0`, `1` | 해당 없음 |
| 8진수 | `8` | `0`–`7` | 해당 없음 |
| 10진수 | `10` | `0`–`9` | 해당 없음 |
| 16진수 | `16` | `0`–`9`, `A`–`F` | 대소문자 무관 입력 허용(`a`–`f`도 허용), 결과 표시는 항상 대문자로 정규화 |

## 3. 음수 규칙

- 입력 문자열 맨 앞에 `-` 기호를 1개까지 허용한다.
- `-` 뒤에는 반드시 2장의 허용 문자가 1개 이상 와야 한다(`-` 단독, `--`, 문자열 중간의 `-`는 오류).
- 변환 결과의 음수 표기도 동일하게 `-` + 절댓값의 진법 표현으로 통일한다.

## 4. 오류 규칙(소수점·공백 포함)

검사 순서(먼저 걸리는 조건이 우선):

1. **빈 값** — trim 후 빈 문자열인 경우 → 상태 `invalid-input`, 메시지: "값을 입력해 주세요."
2. **중간 공백** — trim 후 문자열 내부에 공백 문자가 남아있는 경우(예: `"10 10"`) → 상태 `invalid-input`, 메시지: "공백은 사용할 수 없습니다."
3. **소수점 포함** — 문자열에 `.`이 포함된 경우(정수만 지원) → 상태 `invalid-input`, 메시지: "정수만 입력할 수 있습니다."
4. **부호 규칙 위반** — `-`가 맨 앞이 아니거나 2개 이상이거나 부호만 있고 숫자가 없는 경우 → 상태 `invalid-input`, 메시지: "숫자 형식이 올바르지 않습니다."
5. **허용되지 않는 문자** — 2장 규칙표의 진법별 허용 문자 밖의 문자가 포함된 경우 → 상태 `invalid-input`, 메시지: "{진법}진수에서 허용되지 않는 문자가 포함되어 있습니다."
6. **안전 정수 범위 초과** — 파싱된 값의 절댓값이 `Number.MAX_SAFE_INTEGER`를 초과하는 경우 → 상태 `invalid-input`, 메시지: "표현 가능한 범위를 초과했습니다."

**범위 밖(non-goal):** `BigInt` 기반 임의 정밀도 변환은 다루지 않는다. 안전 정수 범위(`Number.MAX_SAFE_INTEGER`)를 넘는 값은 6번 규칙으로 명시적 오류 처리한다.

## 5. parseInBase / formatInBase 계약

두 함수 모두 예외(`throw`)를 던지지 않고 항상 명시적 결과 객체를 반환한다.

### `parseInBase(text, base)`

- 입력: `text`(string, 사용자 원본 입력), `base`(`2 | 8 | 10 | 16`)
- 반환(성공): `{ ok: true, value: number, isNegative: boolean }`
- 반환(실패): `{ ok: false, error: 'empty' | 'whitespace' | 'decimal-point' | 'invalid-sign' | 'invalid-char' | 'overflow', message: string }`
- `error` 값은 4장의 검사 순서 1~6번과 1:1 대응한다(`whitespace`=2번, `decimal-point`=3번, `invalid-sign`=4번, `invalid-char`=5번, `overflow`=6번, `empty`=1번).

### `formatInBase(value, base)`

- 입력: `value`(number, `parseInBase`가 반환한 정수 값), `base`(`2 | 8 | 10 | 16`)
- 반환(성공): `{ ok: true, text: string }`
- 반환(실패): `{ ok: false, error: 'invalid-value', message: string }` — `value`가 정수가 아니거나 안전 정수 범위를 벗어난 경우
- `value === 0`이면 모든 진법에서 `"0"`을 반환한다.
- 음수는 `-` 접두사 + 절댓값의 해당 진법 표현으로 반환한다.
- 16진수 결과는 항상 대문자(`A`–`F`)로 정규화한다.

## 6. 테스트 케이스 시나리오 (최소 10개)

| # | 호출 | 기대 결과 |
|---|---|---|
| 1 | `parseInBase("1010", 2)` | `{ ok: true, value: 10, isNegative: false }` |
| 2 | `parseInBase("777", 8)` | `{ ok: true, value: 511, isNegative: false }` |
| 3 | `parseInBase("2F", 16)` | `{ ok: true, value: 47, isNegative: false }` |
| 4 | `parseInBase("2f", 16)` | `{ ok: true, value: 47, isNegative: false }`(소문자 허용) |
| 5 | `parseInBase("-101", 2)` | `{ ok: true, value: -5, isNegative: true }` |
| 6 | `parseInBase("", 10)` | `{ ok: false, error: 'empty', ... }` |
| 7 | `parseInBase("1 0", 2)` | `{ ok: false, error: 'whitespace', ... }` |
| 8 | `parseInBase("1.5", 10)` | `{ ok: false, error: 'decimal-point', ... }` |
| 9 | `parseInBase("--1", 2)` | `{ ok: false, error: 'invalid-sign', ... }` |
| 10 | `parseInBase("2", 2)` | `{ ok: false, error: 'invalid-char', ... }`(`2`는 2진수 허용 문자 아님) |
| 11 | `parseInBase("G", 16)` | `{ ok: false, error: 'invalid-char', ... }` |
| 12 | `parseInBase("1".repeat(60), 2)` | `{ ok: false, error: 'overflow', ... }`(안전 정수 범위 초과) |
| 13 | `formatInBase(47, 16)` | `{ ok: true, text: "2F" }` |
| 14 | `formatInBase(-5, 2)` | `{ ok: true, text: "-101" }` |
| 15 | `formatInBase(0, 8)` | `{ ok: true, text: "0" }` |

## 7. 파일 소유권 및 산출물 위치

frozen blueprint에서 이미 고정된 소유권을 그대로 옮긴 것이며, 이 문서가 소유권을 재정의하지 않는다.

| 파일 | 소유자 |
|---|---|
| `docs/design/BF-2171-radix-converter.md` | designer |
| `docs/design/BF-2171-radix-converter-mockup.html` | designer |
| `radix-converter/index.html` | developer |
| `radix-converter/style.css` | developer |
| `radix-converter/radix.js` | developer |
| `radix-converter/radix.test.js` | developer |

모든 파일은 `additive` 정책이다(기존 산출물을 대체하지 않고 새로 추가).

## 8. UI 계약 (exact — designer/developer는 재정의하지 않음)

### DOM IDs
`radix-root`, `radix-input`, `radix-base-2`, `radix-base-8`, `radix-base-10`, `radix-base-16`, `radix-error`, `radix-result-2`, `radix-result-8`, `radix-result-10`, `radix-result-16`, `radix-copy-2`, `radix-copy-8`, `radix-copy-10`, `radix-copy-16`

### CSS 클래스
`radix-converter`, `radix-converter__input`, `radix-converter__base-option`, `radix-converter__error`, `radix-converter__error--visible`, `radix-converter__result`, `radix-converter__result--hidden`, `radix-converter__copy-btn`, `radix-converter__copy-feedback`

### 상태(states)
- `idle` — 초기 상태. 입력값 없음, 결과 영역(`radix-converter__result`)에 `radix-converter__result--hidden` 적용, 오류 숨김.
- `invalid-input` — 4장 오류 규칙 중 하나에 해당. `#radix-error`에 `radix-converter__error--visible` 적용, `role="alert"`로 공지, 결과 영역은 숨김 유지.
- `converted` — 파싱 성공. 4개 결과(`radix-result-2/8/10/16`)가 6장 규칙으로 채워지고 표시된다.
- `copied` — `converted` 상태에서 복사 버튼(`radix-copy-*`) 클릭 시 진입. 해당 버튼 인근에 `radix-converter__copy-feedback`이 노출되며, 1500ms 후 자동으로 `converted`로 복귀하거나 입력값이 다시 바뀌면 즉시 `converted`/`invalid-input`으로 재평가된다.

초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(`idle` 또는 직전 유효 상태)으로 되돌리고 `#radix-input`·라디오 그룹·복사 버튼은 항상 다시 사용할 수 있어야 한다.

### 디자인 토큰(CSS 변수)
```
--color-bg: #f8fafc
--color-surface: #ffffff
--color-text-primary: #0f172a
--color-text-muted: #64748b
--color-border: #cbd5e1
--color-action-primary: #2563eb
--color-error: #dc2626
--color-success: #16a34a
--space-control-gap: 12px
--radius-control: 8px
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

### 접근성
- `#radix-input`은 `aria-label="변환할 숫자 입력"`을 갖는다.
- 진법 선택 라디오 그룹은 `role="radiogroup"` `aria-label="입력 진법 선택"`으로 노출된다.
- `#radix-error`는 `role="alert"`로 오류 발생 시 스크린리더에 즉시 announce된다.
- 각 복사 버튼은 대상 진법을 명시하는 `aria-label`(예: `aria-label="2진수 결과 복사"`)을 갖는다.
- input·radio·copy 버튼 모두 Tab만으로 포커스 이동하고 Enter/Space로 조작 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 반응형
- 뷰포트 320px 이상에서 가로 스크롤(overflow-x)이 발생하지 않는다.
- 480px 이하에서는 진법 결과 카드가 세로 1열로 스택되고 480px 초과에서는 가로 배치된다.

## 9. Acceptance Criteria (Given/When/Then)

**AC-1 2진수 입력 → 4개 진법 동시 변환**
- Given 입력 진법이 `2`이고
- When 사용자가 `#radix-input`에 `1010`을 입력하면
- Then 상태는 `converted`가 되고 `radix-result-2="1010"`, `radix-result-8="12"`, `radix-result-10="10"`, `radix-result-16="A"`로 표시된다.

**AC-2 16진수 소문자 입력 정규화**
- Given 입력 진법이 `16`이고
- When 사용자가 `2f`를 입력하면
- Then 파싱은 성공하고(3장) 모든 16진수 결과 표시는 대문자 `2F`로 정규화된다.

**AC-3 음수 입력 변환**
- Given 입력 진법이 `2`이고
- When 사용자가 `-101`을 입력하면
- Then `radix-result-10="-5"`처럼 4개 결과 모두 `-` 접두 형식으로 표시된다.

**AC-4 빈 값 오류**
- Given 임의 입력 진법
- When `#radix-input`이 빈 상태로 변환이 시도되면
- Then 상태는 `invalid-input`이 되고 `#radix-error`에 "값을 입력해 주세요."가 `role="alert"`로 공지된다.

**AC-5 공백 포함 오류**
- When 사용자가 `10 10`을 입력하면
- Then 상태는 `invalid-input`이 되고 "공백은 사용할 수 없습니다."가 표시된다.

**AC-6 소수점 포함 오류**
- When 사용자가 `1.5`를 입력하면
- Then 상태는 `invalid-input`이 되고 "정수만 입력할 수 있습니다."가 표시된다.

**AC-7 허용되지 않는 문자 오류**
- Given 입력 진법이 `2`이고
- When 사용자가 `2`를 입력하면
- Then 상태는 `invalid-input`이 되고 "2진수에서 허용되지 않는 문자가 포함되어 있습니다."가 표시된다.

**AC-8 복사 버튼 클릭 → copied 상태**
- Given 상태가 `converted`이고
- When 사용자가 `radix-copy-16`을 클릭하면
- Then 상태는 `copied`가 되고 해당 결과가 클립보드에 복사되며 `radix-converter__copy-feedback`이 노출된다. 1500ms 후 `converted`로 복귀한다.

**AC-9 오류 이후 재시도**
- Given 상태가 `invalid-input`
- When 사용자가 유효한 값을 다시 입력하면
- Then 상태는 즉시 `converted`로 전환되며(입력 필드·라디오·복사 버튼은 항상 재사용 가능) 새 결과가 6장 규칙으로 표시된다.

**AC-10 접근성**
- Given 상태가 `invalid-input`
- Then `#radix-error`는 `role="alert"`로 노출되고, 모든 복사 버튼은 대상 진법을 명시하는 `aria-label`을 갖는다.

**AC-11 반응형**
- Given 뷰포트 너비가 480px 이하
- Then 진법 결과 카드(`radix-converter__result`)는 세로 1열로 스택되고 320px 이상에서 가로 스크롤이 발생하지 않는다.
