# 숫자 맞히기 게임 구현 설계 (BF-1588)

> 본 문서는 planner가 동결한 실행 설계이며, designer와 developer는 이 문서와 frozen UI 계약을
> 그대로 구현한다. selector·token·상태 텍스트·파일 소유권은 이 계약이 유일한 권위이며,
> 후속 페르소나는 이를 변경하거나 재정의하지 않는다. 새 파일·새 역할을 추가하지 않는다.

## 1. 개요

1부터 100 사이의 임의의 정수를 사용자가 맞히는 웹 게임을 구현한다. 사용자가 숫자를 입력하면
정답보다 큰지/작은지 힌트를 제공하고, 정답을 맞히면 몇 번 만에 맞혔는지 알린다. 최소 시도 횟수는
best score로 유지한다.

- 실행 스택: **vanilla-static** (외부 의존성 0, 빌드 단계 없음)
- 로딩 방식: **classic script** (`<script src="game.js">` — ES module 아님)
- 실행 환경: **`file://` 직접 실행** 가능 (dev server·번들러 불필요)
- 판정 로직 `judge.js`는 DOM에 의존하지 않는 **순수 함수**로 분리하여 `judge.test.js`에서 단위 검증한다.

## 2. 파일 구성 및 소유권 (frozen)

| 파일 | 소유 페르소나 | 역할 |
| --- | --- | --- |
| `docs/design/number-guess-BF-1588.md` | designer | UI 시각 명세 (색·간격·레이아웃) |
| `docs/design/number-guess-mockup-BF-1588.html` | designer | 정적 mockup |
| `number-guess/index.html` | developer | 게임 화면 마크업, classic script 로딩 |
| `number-guess/style.css` | developer | 스타일 (design token 적용) |
| `number-guess/game.js` | developer | DOM 연결·이벤트·상태 렌더링 |
| `number-guess/judge.js` | developer | 판정 순수 함수 (DOM 비의존) |
| `number-guess/judge.test.js` | developer | `judge.js` 단위 테스트 |

- 파일 소유권·상태 계약은 frozen blueprint가 유일한 권위이다. 본 문서는 이를 재정의하지 않는다.
- 각 파일은 additive 정책 대상이다.

## 3. DOM 계약 (frozen)

### 3.1 DOM ID

| ID | 요소 | 설명 |
| --- | --- | --- |
| `guess-input` | `<input type="number">` | 추측 숫자 입력. 연결된 `<label>`을 가진다. |
| `guess-submit` | `<button>` | 추측 제출 (주 실행 control). 명시적 `aria-label`. |
| `guess-feedback` | 상태 텍스트 영역 | `aria-live="polite"` region. 상태 변화를 읽어준다. |
| `guess-attempts` | 텍스트 | 현재 시도 횟수 표시. |
| `best-score` | 텍스트 | 최소 시도(best) 표시. |
| `new-game` | `<button>` | 게임 초기화. 명시적 `aria-label`. |

### 3.2 CSS class

| class | 대상 |
| --- | --- |
| `game` | 게임 카드 컨테이너 |
| `game__form` | 입력 폼 |
| `game__input` | 입력 필드 |
| `game__submit` | 제출 버튼 |
| `game__feedback` | 피드백 텍스트 |
| `game__stats` | 시도/best 표시 영역 |

## 4. 상태별 화면 텍스트 (frozen)

`guess-feedback`에 노출되는 상태명과 화면 텍스트는 다음과 같이 고정한다. 정답 상태의 `N`은 실제
시도 횟수로 치환한다.

| 상태명 | 화면 텍스트 |
| --- | --- |
| `idle` | `1부터 100 사이의 숫자를 입력하세요` |
| `hint-higher` | `더 큰 수를 입력하세요` |
| `hint-lower` | `더 작은 수를 입력하세요` |
| `won` | `정답입니다! N번 만에 맞혔습니다` |
| `invalid` | `1부터 100 사이의 숫자를 입력하세요` |

- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

## 5. Design token (frozen)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 버튼 색 |
| `--color-feedback-success` | `#16a34a` | 정답(won) 피드백 색 |
| `--color-feedback-hint` | `#64748b` | 힌트(higher/lower) 피드백 색 |
| `--space-control-gap` | `12px` | control 간 간격 |

- developer는 위 token 값을 변경·재정의하지 않고 `style.css`에서 그대로 사용한다.

## 6. 판정 순수 함수 분리 규칙 (frozen)

`number-guess/judge.js`는 DOM·전역 상태에 의존하지 않는 순수 함수만 export 한다. `game.js`가
DOM 값을 읽어 `judge.js`에 넘기고, 반환된 판정 결과로 화면을 렌더링한다.

- 판정 함수는 입력값 유효성(1~100 정수 여부)과 비교 결과(정답/더 큼/더 작음)를 계산해 상태명
  (`idle`/`hint-higher`/`hint-lower`/`won`/`invalid`) 중 하나를 반환한다.
- `judge.test.js`는 `judge.js`를 import 하여 각 상태 분기를 단위 검증한다.
  vanilla-static·classic script 제약에 맞는 로딩 방식으로 실행한다.
- DOM 조작·이벤트 바인딩은 `game.js`에만 둔다. `judge.js`에는 두지 않는다.

## 7. 접근성 (frozen)

- `guess-feedback`는 `aria-live="polite"` region으로 상태 변화를 읽어준다.
- `guess-submit`과 `new-game` control은 명시적 `aria-label`을 가진다.
- `guess-input`은 연결된 `<label>`을 가진다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 8. 반응형 (frozen)

- 320px 이상 너비에서 content overflow가 발생하지 않는다.
- 게임 카드는 최대 너비 제한과 중앙 정렬을 유지한다.

## 9. 사용자 시나리오

1. 사용자가 화면을 열면 `idle` 안내 텍스트가 보이고 `guess-input`에 숫자를 입력할 수 있다.
2. 숫자를 입력하고 `guess-submit`을 누르면 정답과 비교해 힌트 또는 정답 메시지가 나온다.
3. 정답을 맞히면 시도 횟수와 함께 축하 메시지가 나오고, best score가 갱신될 수 있다.
4. `new-game`을 누르면 새 정답으로 초기화되고 `idle` 상태로 돌아간다.

## 10. Acceptance Criteria (Given/When/Then)

### AC-1 초기 상태
- **Given** 사용자가 게임 화면을 처음 연다
- **When** 아직 아무 입력도 하지 않았다
- **Then** `guess-feedback`에 `1부터 100 사이의 숫자를 입력하세요`(`idle`)가 표시되고,
  `guess-attempts`는 0회, 주 실행 control(`guess-submit`)을 사용할 수 있다.

### AC-2 더 큰 수 힌트
- **Given** 정답이 입력값보다 큰 상황
- **When** 사용자가 정답보다 작은 값을 제출한다
- **Then** `guess-feedback`에 `더 큰 수를 입력하세요`(`hint-higher`)가 표시되고 시도 횟수가 1 증가한다.

### AC-3 더 작은 수 힌트
- **Given** 정답이 입력값보다 작은 상황
- **When** 사용자가 정답보다 큰 값을 제출한다
- **Then** `guess-feedback`에 `더 작은 수를 입력하세요`(`hint-lower`)가 표시되고 시도 횟수가 1 증가한다.

### AC-4 정답
- **Given** 사용자가 여러 번 시도한 뒤
- **When** 정답과 같은 값을 제출한다
- **Then** `guess-feedback`에 `정답입니다! N번 만에 맞혔습니다`(`won`)가 표시되고, N이 기존 best보다
  작으면 `best-score`가 갱신된다.

### AC-5 유효하지 않은 입력
- **Given** 게임 진행 중
- **When** 사용자가 1~100 범위를 벗어나거나 정수가 아닌 값을 제출한다
- **Then** `guess-feedback`에 `1부터 100 사이의 숫자를 입력하세요`(`invalid`)가 표시되고 시도 횟수는
  증가하지 않는다.

### AC-6 초기화·취소·실패 후 복귀
- **Given** 게임을 진행했거나 실패/취소가 발생한 상태
- **When** 사용자가 `new-game`으로 초기화한다
- **Then** 상태와 진행 표시(시도 횟수·피드백)가 초기값(`idle`)으로 돌아가고, 주 실행 control을 다시
  사용할 수 있다.

### AC-7 접근성·반응형
- **Given** 스크린리더 또는 320px 이상의 좁은 화면 사용자
- **When** 상태가 바뀌거나 화면을 좁게 볼 때
- **Then** `aria-live` region이 상태를 읽어주고, control은 aria-label/연결 label을 가지며,
  content overflow 없이 게임 카드가 중앙 정렬·최대 너비를 유지한다.

## 11. Edge case · 실패 케이스

- 빈 입력 또는 공백만 입력 → `invalid` 상태, 시도 횟수 미증가.
- 소수·문자·음수·0·101 이상 → `invalid` 상태.
- 정답을 맞힌 뒤 추가 입력 → `new-game` 전까지 상태 유지(추가 시도로 카운트하지 않음).
- best score 미설정 상태에서 첫 정답 → 해당 시도 횟수를 best로 설정.
- vanilla-static 제약상 외부 라이브러리·`import`(ESM) 사용 금지, `file://`에서 그대로 동작해야 함.

## 12. 데이터 모델

서버·영속 저장소 없음. 런타임 상태는 `game.js`의 in-memory 상태로만 관리한다.

| 상태 항목 | 타입 | 설명 |
| --- | --- | --- |
| `answer` | 정수(1~100) | 현재 라운드 정답. `new-game` 시 재설정. |
| `attempts` | 정수 | 현재 라운드 시도 횟수. |
| `bestScore` | 정수 or 없음 | 최소 정답 시도 횟수. |
| `state` | 상태명 | `idle`/`hint-higher`/`hint-lower`/`won`/`invalid` 중 하나. |

## 13. vanilla-static 제약 요약

- 외부 의존성 0 (npm 런타임 패키지·CDN 없음).
- `file://` 직접 실행 가능해야 한다 (dev server 불필요).
- classic script 로딩 (`<script src>`; ESM `import`/`export module` 아님).
- 판정 로직은 `judge.js` 순수 함수로 분리, `judge.test.js`로 단위 검증.
