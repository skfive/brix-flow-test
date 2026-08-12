# 타이핑 속도 테스트 구현 설계 (BF-2032)

본 문서는 designer(BF-2030), developer(BF-2031)가 그대로 따르는 실행 설계와 산식 규칙표다. 아래 UI 계약은 frozen blueprint(ui-contract@v1)를 그대로 옮긴 것이며, 이 문서는 새 파일이나 새 역할을 추가하지 않는다.

## 1. 산출물 파일 · 소유자 · 상태

frozen blueprint가 유일한 권위이며, 아래 표는 그 내용을 그대로 설명한다.

| 파일 경로 | 소유 페르소나 | 정책 |
|---|---|---|
| `docs/design/typing-BF-2029.md` | designer | additive |
| `docs/design/typing-mockup-BF-2029.html` | designer | additive |
| `typing/index.html` | developer | additive |
| `typing/style.css` | developer | additive |
| `typing/typing.js` | developer | additive |
| `typing/typing.test.js` | developer | additive |

- 산출물은 위 6개 파일로 고정한다. designer와 developer는 여기 없는 파일을 새로 만들지 않는다.
- 후조건: 초기화(idle 복귀) · 취소 · 실패 이후에는 상태와 진행 표시가 초기값으로 되돌아가고, 주 실행 control(`#restart-button`, `#typed-input`)이 다시 사용 가능해야 한다.

## 2. UI 계약 (exact)

### 2.1 DOM ID

`typing-app`, `target-sentence`, `typed-input`, `wpm-value`, `accuracy-value`, `timer-value`, `typo-count-value`, `restart-button`, `result-panel`

### 2.2 CSS class

`char-pending`, `char-current`, `char-correct`, `char-incorrect`, `stats-bar`, `result-panel--visible`

- 문장의 각 글자는 진행 상태에 따라 `char-pending`(미입력) → `char-current`(현재 입력 위치) → `char-correct`/`char-incorrect`(입력 완료, 일치 여부) 클래스를 갖는다.
- `result-panel--visible`은 `finished` 상태에서만 `#result-panel`에 추가한다.

### 2.3 상태 (state)

`idle`, `running`, `finished` — 3개 상태만 존재한다.

### 2.4 디자인 토큰 (CSS 변수)

| 변수 | 값 |
|---|---|
| `--color-bg` | `#0f172a` |
| `--color-surface` | `#1e293b` |
| `--color-text` | `#e2e8f0` |
| `--color-char-current` | `#facc15` |
| `--color-char-correct` | `#22c55e` |
| `--color-char-incorrect` | `#ef4444` |
| `--font-family-base` | `system-ui, -apple-system, 'Segoe UI', sans-serif` |
| `--space-control-gap` | `12px` |

designer/developer는 이 selector와 token 값을 변경하거나 재정의하지 않는다.

### 2.5 접근성

- `#typed-input`은 `aria-label="타이핑 입력"`을 갖는다.
- `#wpm-value`, `#accuracy-value`, `#timer-value`는 `aria-live="polite"` 영역으로 값이 갱신될 때마다 스크린리더에 통지된다.
- `#restart-button`은 키보드 포커스를 받을 수 있고 Enter/Space 키로 활성화된다.
- 모든 상태(`idle`/`running`/`finished`)는 색상만으로 구분하지 않는다. 상태명을 화면 텍스트와 접근성 이름(예: `aria-label` 또는 텍스트 노드)으로 함께 노출한다.

### 2.6 반응형

- 320px 이상 뷰포트에서 `#target-sentence`와 `stats-bar`는 줄바꿈되며 가로 overflow가 발생하지 않는다.
- 화면 너비와 무관하게 `#typed-input`은 항상 뷰포트 안에 표시된다.

## 3. 산식 규칙표

### 3.1 `calcWpm(charCount, elapsedMs)`

- 정의: `charCount`는 **정확히 일치한 문자 수만** 포함한다(오타 문자는 제외). 5글자 = 1단어 기준으로 환산한다.
- 공식: `words = charCount / 5`, `minutes = elapsedMs / 60000`, `wpm = Math.round(words / minutes)`
- 가드: `elapsedMs === 0`이면 0으로 나눔을 방지하기 위해 `wpm = 0`을 반환한다.
- 결과는 음수가 될 수 없다(0으로 clamp).

경계값 예시:

| charCount | elapsedMs | 계산 | wpm |
|---|---|---|---|
| 0 | 60000 | 0단어 / 1분 | 0 |
| 250 | 60000 | 50단어 / 1분 | 50 |
| 125 | 30000 | 25단어 / 0.5분 | 50 |
| 1 | 60000 | 0.2단어 / 1분 → 반올림 | 0 |
| 250 | 0 | 0으로 나눔 가드 | 0 |

### 3.2 `calcAccuracy(typed, target)`

- 정의: `typed`와 `target`을 같은 인덱스끼리 비교한다. `i < min(typed.length, target.length)`에서 `typed[i] === target[i]`면 정확, 아니면 오타다. `typed.length > target.length`인 초과 입력 구간(오버타이핑)의 문자도 전부 오타로 센다.
- 오타 수(typo count): 위 규칙으로 센 불일치 문자 수의 총합.
- 정확도 공식: `typed.length === 0`이면 `accuracy = 100`(0 나눗셈 방지, 아직 입력이 없을 때의 기본 표시값). 그 외에는 `accuracy = Math.round((correctCount / typed.length) * 100)`.

경계값 예시 (target = `"the"` 또는 `"there"` 기준):

| typed | target | correct | typo | accuracy |
|---|---|---|---|---|
| `""` | `"the quick"` | 0 | 0 | 100 (입력 없음 가드) |
| `"the"` | `"the"` | 3 | 0 | 100 |
| `"thw"` | `"the"` | 2 | 1 | 67 (2/3=66.67 반올림) |
| `"thereX"` | `"there"` | 5 | 1 | 83 (5/6=83.33 반올림) |
| `"th"` | `"the"` | 2 | 0 | 100 (아직 입력 중, 남은 글자는 미평가) |

## 4. 타이머 · 결과 화면 · 재시작 규칙

### 4.1 60초 타이머 시작 조건

- `idle` 상태에서 `#typed-input`에 **첫 키 입력이 발생하는 순간** 타이머가 시작되고 상태가 `running`으로 전환된다.
- `#typed-input`에 포커스만 주는 것으로는 타이머가 시작되지 않는다.
- 타이머는 60초가 경과하면 자동으로 `finished` 상태로 전환하고 `#typed-input`을 비활성화한다.
- 가정(설계 결정): 60초가 되기 전에 사용자가 `target-sentence` 전체를 정확한 길이만큼 입력 완료(`typed.length === target.length`)하면 그 시점에도 즉시 `finished`로 전환한다. 5문장 순환은 재시작 시에만 적용되며, 진행 중(`running`) 상태에서 다음 문장으로 자동 전환하지 않는다.

### 4.2 결과 화면(`finished` 상태, `#result-panel`)

`finished` 상태 진입 시 `#result-panel`에 `result-panel--visible` 클래스를 추가하고 아래 3개 항목을 표시한다.

- `#wpm-value` — 3.1 `calcWpm` 결과
- `#accuracy-value` — 3.2 `calcAccuracy` 결과
- `#typo-count-value` — 3.2에서 정의한 오타 수

### 4.3 재시작(`#restart-button`) 및 5문장 순환 규칙

- 문장 pool은 고정된 5개 문장 배열이며, 순서는 배열 인덱스 순으로 **순차 순환**한다(무작위 아님): `nextIndex = (currentIndex + 1) % 5`.
- `#restart-button`은 `idle`/`running`/`finished` 어느 상태에서 눌러도 동작한다.
- 클릭 시: 타이머·입력값·오타 카운트·통계 표시를 초기값으로 되돌리고, 상태를 `idle`로 전환하며, `#target-sentence`를 pool의 다음 순번 문장으로 교체하고, `#typed-input`을 다시 사용 가능하게 한다(후조건 충족).

## 5. 실패/취소 케이스

- 타이핑 도중 탭 전환 등으로 `#typed-input` 포커스를 잃어도 타이머는 계속 진행한다(별도 일시정지 기능은 범위 밖).
- `running` 상태에서 `#restart-button`을 누르면 진행 중이던 시도는 저장 없이 폐기되고 4.3 규칙에 따라 즉시 초기화된다.
- 60초 경과와 전체 입력 완료가 같은 프레임에서 동시에 발생하면 `finished` 전환은 1회만 수행한다(중복 상태 전이 없음).
