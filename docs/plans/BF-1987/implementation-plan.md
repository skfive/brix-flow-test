# BF-1987 단위 변환기 — 실행 설계 및 UI 계약 (BF-1990)

- Jira: BF-1990 (본 문서), 상위 Epic: BF-1987
- 작성자: 박기획 (planner)
- 소비자: designer(BF-1988), developer(BF-1989)
- 상태: frozen — 이 문서와 아래 UI 계약은 designer/developer가 그대로 따른다. 재정의·확장 금지.

## 1. 개요 / 목표

정적 HTML/CSS/JS 기반 단위 변환기(길이·무게)를 신규 구현한다. 사용자는 카테고리(길이/무게)를 선택하고
값과 변환 단위(from/to)를 지정해 변환 결과를 즉시 확인하며, 두 단위를 맞바꾸는 swap 기능과 잘못된
입력에 대한 오류 표시·복구를 제공한다. 서버/빌드 도구 없이 `index.html`을 직접 로드하는 정적 페이지로
동작한다 (repo 관례: vanilla-static, serve_root `.`).

## 2. 수용 기준 (Given/When/Then)

### AC-1. 카테고리 전환
- Given 단위 변환기 화면이 로드되어 있다
- When 사용자가 무게 탭(`#unit-converter-tab-weight`)을 클릭하거나 키보드 화살표로 전환한다
- Then 무게 탭이 `aria-selected="true"`가 되고 화면 텍스트 "무게"가 활성 카테고리로 표시되며,
  from/to 셀렉트 옵션이 무게 단위(g/kg/lb/oz) 목록으로 교체된다. 길이 탭은 `aria-selected="false"`가 된다.

### AC-2. idle 상태
- Given 카테고리를 방금 선택했고 값 입력란이 비어 있다
- When 값을 아직 입력하지 않았다
- Then 입력란에 placeholder "값을 입력하세요"가 보이고, 결과 영역(`#unit-converter-result`)과
  오류 영역(`#unit-converter-error`)은 비어 있다.

### AC-3. 유효한 변환 결과
- Given 카테고리가 길이이고 from=m, to=cm이다
- When 사용자가 값 "1"을 입력한다
- Then `convert(1, "m", "cm")` 결과 100이 `formatNumber`로 정규화되어 `#unit-converter-result`에 표시된다
  (소수점 최대 4자리, 불필요한 0/소수점 제거).

### AC-4. 잘못된 입력 — 숫자가 아님
- Given 값 입력란에 포커스가 있다
- When 사용자가 숫자가 아닌 값(예: "abc")을 입력한다
- Then `#unit-converter-result`는 비워지고 `#unit-converter-error`에 "숫자를 입력하세요"가 표시되며
  `role="alert"`로 공지된다. 입력란/셀렉트/swap 버튼은 계속 조작 가능하다(비활성화하지 않는다).

### AC-5. 잘못된 입력 — 음수
- Given 값 입력란에 포커스가 있다
- When 사용자가 음수(예: "-1")를 입력한다
- Then `#unit-converter-error`에 "0 이상의 값을 입력하세요"가 표시되고 결과 영역은 비워진다.

### AC-6. 오류 이후 복구
- Given AC-4 또는 AC-5로 오류 상태이다
- When 사용자가 값을 유효한 숫자로 정정한다
- Then 오류 문구가 사라지고 `#unit-converter-error`가 비워지며, 정상 변환 결과가 다시 표시된다.
  이 과정에서 입력/셀렉트/swap 버튼은 처음부터 끝까지 항상 활성 상태를 유지한다(재활성화 대상이 되는
  비활성화 로직 자체가 없어야 한다).

### AC-7. 단위 맞바꾸기(swap)
- Given from=m, to=cm이고 값이 입력되어 있다
- When 사용자가 swap 버튼(`#unit-converter-swap-button`, `aria-label="단위 맞바꾸기"`)을 클릭한다
- Then from=cm, to=m으로 교체되고 동일 입력값 기준 결과가 즉시 재계산되어 표시된다(입력값 자체는 유지).

### AC-8. 접근성
- Given 스크린리더 사용자이다
- When 카테고리 탭을 전환하거나 오류가 발생한다
- Then 탭은 `aria-selected`로 활성 상태를 노출하고, 오류는 `role="alert"`인 `#unit-converter-error`로
  공지되며, 모든 상태는 색상만이 아니라 텍스트로도 구분된다.

### AC-9. 반응형
- Given 뷰포트 너비가 320px이다
- When 화면을 렌더링한다
- Then 입력/결과 영역이 세로로 스택되고 콘텐츠 overflow가 없다.
- Given 뷰포트 너비가 480px 이상이다
- Then 입력 필드, swap 버튼, 결과 영역이 한 행으로 가로 정렬된다.

## 3. 단위 환산표 및 순수 함수 시그니처

### 3.1 기준 단위 환산 계수

길이 — 기준 단위: m (meter)

| 단위 | to-base(m) 계수 |
|---|---|
| m | 1 |
| km | 1000 |
| cm | 0.01 |
| inch | 0.0254 |
| ft | 0.3048 |

무게 — 기준 단위: g (gram)

| 단위 | to-base(g) 계수 |
|---|---|
| g | 1 |
| kg | 1000 |
| lb | 453.59237 |
| oz | 28.349523125 |

변환 공식: `result = value * factor(from) / factor(to)` (factor는 to-base 계수)

### 3.2 순수 함수 시그니처 (`unit-converter/convert.js`, developer 소유)

```js
/**
 * @param {number} value 변환할 값 (0 이상의 유한수)
 * @param {string} from 원본 단위 키 (예: "m","km","cm","inch","ft","g","kg","lb","oz")
 * @param {string} to 대상 단위 키
 * @returns {number} 변환 결과 (반올림/자릿수 처리 없음, 순수 계산값)
 * @throws {Error} value가 숫자가 아니거나 음수이거나, from/to가 같은 카테고리가 아니거나
 *   알 수 없는 단위일 때
 */
function convert(value, from, to) {}

/**
 * @param {number} n 표시할 숫자
 * @returns {string} 소수점 최대 4자리, 불필요한 trailing 0과 소수점 제거된 문자열
 *   예: formatNumber(100) -> "100", formatNumber(0.30000000000000004) -> "0.3"
 */
function formatNumber(n) {}
```

- `convert`/`formatNumber`는 DOM에 의존하지 않는 순수 함수여야 하며 `unit-converter/convert.test.js`에서
  단위 테스트로 검증한다(§4 단위 환산표 값 기준 회귀 케이스 포함).
- 입력 검증(숫자 여부, 0 이상 여부)과 오류 문구 매핑은 UI 레이어(`index.html`/스크립트)에서 수행하고,
  `convert()` 자체는 유효성 오류 시 예외를 던지는 것으로 충분하다(§2 AC-4/AC-5 문구는 UI가 표시).

## 4. Frozen UI 계약

아래 계약은 `plan` 패킷이 동결한 blueprint이며 designer/developer는 selector·token을 변경하거나
재정의하지 않는다. 파일 소유권과 상태 계약은 이 표가 유일한 권위다.

### 4.1 파일 및 소유자

| 파일 | 소유자 |
|---|---|
| `docs/design/unit-converter/design-spec.md` | designer |
| `docs/design/unit-converter/mockup.html` | designer |
| `unit-converter/index.html` | developer |
| `unit-converter/style.css` | developer |
| `unit-converter/convert.js` | developer |
| `unit-converter/convert.test.js` | developer |

### 4.2 DOM ID

`unit-converter-root`, `unit-converter-tab-length`, `unit-converter-tab-weight`,
`unit-converter-input-value`, `unit-converter-from-unit`, `unit-converter-to-unit`,
`unit-converter-swap-button`, `unit-converter-result`, `unit-converter-error`

### 4.3 CSS class

`tabs`, `tab`, `tab--active`, `converter-panel`, `field`, `field__input`, `field__select`,
`swap-button`, `result`, `result--error`

### 4.4 상태

- `category-length` — 활성 카테고리 화면 텍스트 "길이"
- `category-weight` — 활성 카테고리 화면 텍스트 "무게"
- `idle` — 입력란 placeholder "값을 입력하세요", 결과/오류 영역 비어 있음
- `valid-result` — 변환 결과 텍스트 표시, 소수점 최대 4자리, 불필요한 0 제거(§3.2 `formatNumber`)
- `invalid-input` — 오류 텍스트 "숫자를 입력하세요" 또는 "0 이상의 값을 입력하세요" 표시, 결과 영역 비움

### 4.5 Design token

`--color-text-primary=#1f2937`, `--color-bg-panel=#ffffff`, `--color-action-primary=#2563eb`,
`--color-tab-active-bg=#2563eb`, `--color-error=#dc2626`, `--space-control-gap=12px`,
`--radius-control=8px`, `--font-family-base=system-ui`

### 4.6 접근성

- swap 버튼은 `aria-label="단위 맞바꾸기"`를 가진다.
- 오류 문구 요소(`#unit-converter-error`)는 `role="alert"`로 스크린리더에 공지된다.
- 탭 버튼(`#unit-converter-tab-length`, `#unit-converter-tab-weight`)은 `aria-selected` 속성으로
  활성 상태를 표시하며 키보드 화살표로 전환 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.7 반응형

- 320px 이상에서 입력/결과 영역이 세로로 스택되고 콘텐츠 overflow가 발생하지 않는다.
- 480px 이상에서 입력 필드, swap 버튼, 결과 영역이 한 행으로 가로 정렬된다.

## 5. 오류 → 복구 규칙 (요약)

1. 입력값이 숫자가 아니거나 음수이면 `invalid-input` 상태로 전환하고 `#unit-converter-result`를 비운다.
2. 오류 상태에서도 값 입력란, from/to 셀렉트, swap 버튼은 `disabled` 처리하지 않는다 — 항상 조작 가능해야
   사용자가 값을 정정해 스스로 복구할 수 있다.
3. 입력값이 다시 유효해지는 즉시(추가 클릭/제출 없이) `invalid-input` 해제, `idle`/`valid-result`로 자동
   전환한다.
4. 카테고리 전환(AC-1) 시에도 이전 오류 상태를 이월하지 않는다 — 전환 직후는 입력값 유무에 따라 `idle`
   또는 새 카테고리 단위 기준 재계산된 `valid-result`/`invalid-input`이다.

## 6. Non-goals (이번 범위 아님)

- 길이/무게 외 다른 카테고리(온도, 부피 등) 추가
- 값 저장/기록(로컬 스토리지, 히스토리)
- 서버 API, 빌드 도구, 프레임워크 도입 — 정적 vanilla HTML/CSS/JS 유지
- 위 4.1의 6개 파일 외 신규 파일 추가 또는 소유권 재배정
