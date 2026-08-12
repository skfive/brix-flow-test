# BF-1999 단위 변환기 구현 설계 (BF-2002 planner 산출물)

> 이 문서는 frozen blueprint(`ui-contract@v1`)를 그대로 서술하는 실행 설계입니다. 새 파일이나 새 역할을 추가하지 않으며, designer(BF-2000)/developer(BF-2001)는 이 문서와 frozen blueprint의 파일 소유권·상태 계약을 그대로 따릅니다.

## 0. Frozen blueprint 요약 (권위: frozen `ui-contract@v1`)

| 경로 | 소유자 | 상태(policy) |
|---|---|---|
| `docs/design/BF-1999/design-spec.md` | designer | additive |
| `docs/design/BF-1999/mockup.html` | designer | additive |
| `unit-converter/index.html` | developer | additive |
| `unit-converter/style.css` | developer | additive |
| `unit-converter/convert.js` | developer | additive |
| `unit-converter/convert.test.js` | developer | additive |

> ⚠️ 주의: 저장소에 이미 `unit-converter/convert.js` 등 동일 경로의 파일이 존재하나, DOM id(`unit-converter-tab-length` 등)와 카테고리 구성(길이/무게만, 온도 없음)이 아래 frozen 계약과 다릅니다. 이는 본 task(BF-1999)의 산출물이 아닌 이전 작업 잔여물이므로 developer는 **이 문서의 계약을 유일한 기준**으로 새로 작성/교체합니다.

## 1. 변환 규칙표

### 1.1 카테고리 및 계수

| 카테고리 | 방향 | 공식 | 계수(정의) |
|---|---|---|---|
| length | forward (m→ft) | `value / 0.3048` | 1 ft = 0.3048 m (국제 표준, 정확) |
| length | reverse (ft→m) | `value * 0.3048` | 상동 |
| weight | forward (kg→lb) | `value / 0.45359237` | 1 lb = 0.45359237 kg (국제 표준, 정확) |
| weight | reverse (lb→kg) | `value * 0.45359237` | 상동 |
| temperature | forward (°C→°F) | `value * 9/5 + 32` | 표준 화씨 변환식 |
| temperature | reverse (°F→°C) | `(value - 32) * 5/9` | 표준 섭씨 변환식 |

`direction`은 각 카테고리의 SI/미터법 단위 → 관용 단위 방향을 `forward`, 그 반대를 `reverse`로 고정한다. `swap-direction` 컨트롤은 현재 `direction` 값을 토글한다.

### 1.2 반올림 · 표시 포맷 규칙 (소수 4자리 반올림 + 후행 0 제거)

| 단계 | 규칙 |
|---|---|
| 1 | `rounded = Math.round(raw * 10000) / 10000` |
| 2 | `Object.is(rounded, -0)` 이면 `0`으로 정규화 |
| 3 | `str = rounded.toFixed(4)` |
| 4 | 소수부 후행 `0` 제거 (정규식 `/0+$/`) |
| 5 | 소수점만 남으면 소수점도 제거 (정규식 `/\.$/`) |

예: `3.28083989...` → `3.2808`, `1.0000` → `1`, `0.45359237` → `0.4536`, `-40.0000` → `-40`.

## 2. `convert(category, direction, value)` 순수 함수 시그니처

```js
/**
 * @param {'length'|'weight'|'temperature'} category
 * @param {'forward'|'reverse'} direction
 * @param {number} value - 유한수 (Number.isFinite(value) === true)
 * @returns {string} 1.2 규칙이 적용된 변환 결과 문자열
 * @throws {TypeError} category 또는 direction 값이 유효하지 않을 때
 */
function convert(category, direction, value) { /* ... */ }
```

- 순수 함수: DOM/전역 상태를 읽거나 변경하지 않는다.
- 입력값의 유효성(숫자 여부, 빈 값)은 UI 레이어(3장 상태 모델)에서 먼저 걸러내고, `convert()`에는 항상 유한수만 전달한다.
- `category`/`direction`이 표 1.1에 없는 값이면 `TypeError`를 던진다.

## 3. DOM 구조 · 상태 계약 (frozen `ui-contract@v1` 그대로 적용)

### 3.1 DOM ID / class (frozen — 변경 금지)

| 항목 | 값 | 역할 |
|---|---|---|
| root id | `unit-converter-root` | 컨테이너 |
| tablist id | `category-tabs` (`role="tablist"`) | 카테고리 탭 컨테이너 |
| tab class | `tab`, 활성 시 `tab--active` (`role="tab"`, `aria-selected`) | 카테고리 탭 |
| 입력 id | `input-value` (class `converter-input`) | 값 입력 |
| 출력 id | `output-value` (class `converter-output`) | 변환 결과 표시 |
| 방향 전환 id | `swap-direction` (class `swap-button`, `aria-label="단위 방향 전환"`) | forward/reverse 토글 |
| 오류 id | `error-message` (class `error-text`, `aria-live="polite"`) | 오류 텍스트 |

`category-tabs` 하위 개별 탭 id는 frozen 목록에 없으므로 본 문서에서 `tab-length`, `tab-weight`, `tab-temperature`로 고정한다(developer/designer는 이 3개 id를 그대로 사용).

### 3.2 상태 모델 (`idle | valid | error | reset`)

| 상태 | 진입 조건 | `output-value` | `error-message` |
|---|---|---|---|
| `idle` | 초기 로드, 또는 `input-value`가 빈 값 | 비움 | 비움 |
| `valid` | `input-value`가 유한수로 파싱됨 | `convert()` 결과 표시 | 비움 |
| `error` | 숫자로 파싱 불가한 입력 | 비움 | 오류 문구 표시(`aria-live` 갱신) |
| `reset` | 카테고리 전환 / `swap-direction` 클릭 / 명시적 초기화 직후 | 즉시 `idle`(빈 입력) 또는 `valid`(입력 유지 시 재계산)로 전이하는 경유 상태 | 비움 |

불변식(frozen invariant): 초기화·취소(카테고리 전환/swap)·실패(error) 이후에도 `input-value`, `category-tabs`, `swap-direction`은 즉시 재사용 가능해야 하며, 표시값은 항상 초기값(빈 값 또는 최신 계산값)으로 정확히 되돌아간다.

### 3.3 디자인 토큰 (frozen — 재정의 금지)

`--color-bg: #ffffff; --color-text: #1f2933; --color-primary: #2563eb; --color-error: #dc2626; --font-family-base: system-ui, -apple-system, 'Segoe UI', sans-serif; --space-control-gap: 12px;`

### 3.4 접근성 (frozen)

- `swap-direction`은 `aria-label="단위 방향 전환"`.
- `error-message`는 `aria-live="polite"`.
- `category-tabs`는 `role="tablist"`, 각 탭은 `role="tab"` + `aria-selected`.
- 모든 상태는 색상만이 아니라 텍스트(접근성 이름 포함)로도 구분한다.

### 3.5 반응형 (frozen)

- 320px 이상에서 `input-value`/`output-value`가 줄바꿈 없이 표시되거나 세로 stack 레이아웃으로 전환되어 overflow가 발생하지 않는다.

## 4. 테스트 케이스 목록 (`node --test unit-converter/convert.test.js`, 최소 8개 — 카테고리별 왕복 포함)

| ID | 케이스 | 기대값 |
|---|---|---|
| TC-01 | `convert('length','forward',1)` | `'3.2808'` |
| TC-02 | `convert('length','reverse',1)` | `'0.3048'` |
| TC-03 | `convert('length','forward',0.3048)` (반올림/후행 0 제거 확인) | `'1'` |
| TC-04 | `convert('weight','forward',1)` | `'2.2046'` |
| TC-05 | `convert('weight','reverse',1)` | `'0.4536'` |
| TC-06 | `convert('temperature','forward',0)` | `'32'` |
| TC-07 | `convert('temperature','forward',-40)` (교차점 경계값) | `'-40'` |
| TC-08 | `convert('temperature','reverse',98.6)` | `'37'` |
| TC-09 | `convert('length','forward',0)` (0 값) | `'0'` |
| TC-10 | `convert('volume','forward',1)` (알 수 없는 category) | `TypeError` throw |

각 카테고리(length/weight/temperature)에 forward·reverse 케이스가 최소 1개씩 포함되어 왕복 변환을 검증한다(TC-01/02, TC-04/05, TC-06/08).

## 5. 산출물 경로 (frozen — 변경 금지)

- `docs/design/BF-1999/design-spec.md` (designer)
- `docs/design/BF-1999/mockup.html` (designer)
- `unit-converter/index.html` (developer)
- `unit-converter/style.css` (developer)
- `unit-converter/convert.js` (developer)
- `unit-converter/convert.test.js` (developer)
