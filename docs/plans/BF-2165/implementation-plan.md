# BF-2168 · 단위 변환기 구현 설계

> 이 문서는 designer(BF-2166)와 developer(BF-2167)가 그대로 따를 실행 설계입니다.
> 새 파일이나 새 역할을 추가하지 않으며, 파일 소유권과 상태 계약은 아래 [파일 소유권 및 산출물 위치](#파일-소유권-및-산출물-위치)에 고정된 frozen blueprint를 그대로 옮긴 것입니다.

## 1. 요구사항 개요

단위 변환기는 길이(length) / 무게(weight) / 온도(temperature) 3개 카테고리에 대해
사용자가 값을 입력하고 출발 단위 → 도착 단위로 변환된 결과를 즉시 확인할 수 있는
클라이언트 사이드(vanilla JS) 도구다.

- 카테고리: 길이(m, km, mi, ft), 무게(g, kg, lb, oz), 온도(C, F, K)
- 각 카테고리는 임의의 두 단위 조합 간 상호 변환을 지원한다.
- 절대영도 미만·비숫자·빈 값 입력은 결과 대신 명시적 오류를 표시한다.
- 결과 표시값은 유효숫자 6자리로 반올림한다.

## 2. 길이(length) 계수표

기준 단위: 미터(m). `1 [단위] = X m`.

| 단위 | 코드 | 1단위당 m |
|---|---|---|
| 미터 | `m` | 1 |
| 킬로미터 | `km` | 1000 |
| 마일 | `mi` | 1609.344 |
| 피트 | `ft` | 0.3048 |

변환 공식(선형): `결과 = 입력값 × factor(출발단위→m) ÷ factor(도착단위→m)`

## 3. 무게(weight) 계수표

기준 단위: 그램(g). `1 [단위] = X g`.

| 단위 | 코드 | 1단위당 g |
|---|---|---|
| 그램 | `g` | 1 |
| 킬로그램 | `kg` | 1000 |
| 파운드 | `lb` | 453.59237 |
| 온스 | `oz` | 28.349523125 |

변환 공식(선형): `결과 = 입력값 × factor(출발단위→g) ÷ factor(도착단위→g)`

## 4. 온도(temperature) 변환 공식 (비선형)

온도는 배율 계수표가 아니라 셀시우스(C)를 기준으로 한 비선형 공식을 사용한다.

**입력 → 셀시우스(toCelsius):**

| 출발 단위 | 공식 |
|---|---|
| `C` | `celsius = value` |
| `F` | `celsius = (value - 32) × 5 / 9` |
| `K` | `celsius = value - 273.15` |

**셀시우스 → 도착 단위(fromCelsius):**

| 도착 단위 | 공식 |
|---|---|
| `C` | `result = celsius` |
| `F` | `result = celsius × 9 / 5 + 32` |
| `K` | `result = celsius + 273.15` |

변환 절차: `celsius = toCelsius(입력값, 출발단위)` → `결과 = fromCelsius(celsius, 도착단위)`

절대영도 기준값: `-273.15°C` = `0K` = `-459.67°F`

## 5. 오류 규칙

검사 순서(먼저 걸리는 조건이 우선):

1. **빈 값** — 입력이 빈 문자열이거나 공백만 있는 경우 → 상태 `error-invalid-input`, 메시지: "값을 입력해 주세요."
2. **비숫자** — trim한 값이 유효한 숫자로 파싱되지 않는 경우(`Number(trimmed)`가 `NaN`) → 상태 `error-invalid-input`, 메시지: "숫자를 입력해 주세요."
3. **절대영도 미만** — 온도 카테고리에서만 적용. 입력값을 4장 공식으로 셀시우스로 환산한 값이 `-273.15`보다 작은 경우 → 상태 `error-below-absolute-zero`, 메시지: "절대영도(-273.15°C) 미만은 변환할 수 없습니다."

**범위 밖(non-goal):** 길이·무게 카테고리의 음수 입력에 대한 별도 오류 상태는 정의하지 않는다. frozen UI 계약의 `states`가 `idle / result-ready / error-invalid-input / error-below-absolute-zero` 4개로 고정되어 있어, 그 이상의 새 오류 상태를 추가하지 않는다.

## 6. formatResult 반올림 규칙

결과 표시값은 다음 알고리즘으로 계산한다.

```
formatResult(value):
  1. value === 0 이면 "0" 반환
  2. rounded = Number(value.toPrecision(6))   // 유효숫자 6자리로 반올림
  3. rounded 가 정수이면 정수 문자열로 반환 (소수점 없음)
  4. 그 외에는 String(rounded) 반환 (trailing zero는 Number→String 변환 과정에서 자동 제거됨)
```

예시:

| 입력 | 결과 |
|---|---|
| `1609.344` | `1609.34` |
| `100` | `100` |
| `0.3048` | `0.3048` |
| `1 / 3` (`0.333333...`) | `0.333333` |

**범위 밖(non-goal):** `1e21` 이상 또는 `1e-7` 미만처럼 JS가 지수 표기로 전환하는 극단값은 이번 3개 카테고리의 실사용 입력 범위(일상적 길이·무게·온도 값)에서 발생하지 않는 것으로 간주하고 별도 처리하지 않는다.

## 7. 파일 소유권 및 산출물 위치

frozen blueprint에서 이미 고정된 소유권을 그대로 옮긴 것이며, 이 문서가 소유권을 재정의하지 않는다.

| 파일 | 소유자 |
|---|---|
| `docs/design/BF-2165/design-spec.md` | designer |
| `docs/design/BF-2165/mockup.html` | designer |
| `unit-converter/converter.js` | developer |
| `unit-converter/converter.test.js` | developer |
| `unit-converter/index.html` | developer |
| `unit-converter/style.css` | developer |

모든 파일은 `additive` 정책이다(기존 산출물을 대체하지 않고 새로 추가).

## 8. UI 계약 (exact — designer/developer는 재정의하지 않음)

### DOM IDs
`converter-app`, `category-tabs`, `value-input`, `from-unit-select`, `to-unit-select`, `swap-button`, `result-output`, `error-message`

### CSS 클래스
`tab`, `tab--active`, `converter-form`, `unit-select`, `swap-btn`, `result`, `result--error`

### 상태(states)
- `idle` — 초기 상태
- `result-ready` — 변환 결과 표시
- `error-invalid-input` — 빈 값/비숫자 오류
- `error-below-absolute-zero` — 절대영도 미만 오류

초기화·취소·실패 뒤에는 상태와 진행 표시를 `idle`로 되돌리고 주 실행 control(변환 입력/실행)을 다시 사용할 수 있어야 한다.

### 디자인 토큰(CSS 변수)
```
--color-bg: #f8fafc
--color-surface: #ffffff
--color-primary: #2563eb
--color-text: #1e293b
--color-error: #dc2626
--space-control-gap: 12px
--font-family: system-ui, -apple-system, sans-serif
```

### 접근성
- 탭 버튼은 `role="tab"`과 `aria-selected` 속성을 갖는다.
- swap 버튼은 `aria-label="단위 교환"`을 갖는다.
- 오류 메시지 영역(`#error-message`)은 `role="alert"`로 스크린리더에 즉시 공지된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 반응형
- 360px 이상 뷰포트에서 콘텐츠 overflow 없이 표시된다.
- 768px 이상에서는 입력 영역과 결과 영역이 2열 레이아웃으로 전환된다.

## 9. Acceptance Criteria (Given/When/Then)

**AC-1 길이 변환**
- Given 카테고리가 `길이`이고 출발 단위 `km`, 도착 단위 `mi`
- When 사용자가 `1`을 입력하면
- Then 결과는 2장 계수표 기준 `0.621371`(6 유효숫자)로 표시된다.

**AC-2 무게 변환**
- Given 카테고리가 `무게`이고 출발 단위 `lb`, 도착 단위 `kg`
- When 사용자가 `10`을 입력하면
- Then 결과는 3장 계수표 기준 `4.5359237` → 6 유효숫자 반올림된 `4.53592`로 표시된다.

**AC-3 온도 변환**
- Given 카테고리가 `온도`이고 출발 단위 `C`, 도착 단위 `F`
- When 사용자가 `100`을 입력하면
- Then 4장 공식에 따라 `212`가 표시된다.

**AC-4 빈 값 오류**
- Given 임의 카테고리
- When 값 입력란이 빈 상태로 변환이 시도되면
- Then 상태는 `error-invalid-input`이 되고 `#error-message`에 "값을 입력해 주세요."가 `role="alert"`로 공지된다.

**AC-5 비숫자 오류**
- Given 임의 카테고리
- When 값 입력란에 `abc`처럼 숫자로 파싱되지 않는 값이 입력되면
- Then 상태는 `error-invalid-input`이 되고 "숫자를 입력해 주세요."가 표시된다.

**AC-6 절대영도 미만 오류**
- Given 카테고리가 `온도`이고 출발 단위 `C`
- When 사용자가 `-300`을 입력하면
- Then 5장 규칙에 따라 셀시우스 환산값(`-300`)이 `-273.15` 미만이므로 상태는 `error-below-absolute-zero`가 되고 "절대영도(-273.15°C) 미만은 변환할 수 없습니다."가 표시된다.

**AC-7 오류 이후 재시도**
- Given 상태가 `error-invalid-input` 또는 `error-below-absolute-zero`
- When 사용자가 유효한 값을 다시 입력해 변환을 실행하면
- Then 상태는 `idle`을 거치지 않고 바로 `result-ready`로 전환되며(입력 필드·변환 버튼은 항상 재사용 가능), 새 결과가 6장 규칙으로 표시된다.
