# 숫자 맞히기 게임 구현 설계 (BF-1600)

> planner: 박기획 · task: BF-1603 · frozen contract: `planning-contract@v1`, `ui-contract@v1`
>
> 본 문서는 designer(BF-1601)·developer(BF-1602)가 따라야 할 **실행 설계**이자
> **동결 UI 계약**의 렌더링본입니다. 아래 selector·token·상태·파일 소유권은
> frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.
> designer·developer는 selector와 token을 **변경하거나 재정의하지 않습니다**.

---

## 1. 개요 / 사용자 시나리오

플레이어는 시스템이 정한 1~100 사이의 비밀 숫자를 추측 입력으로 맞힙니다.
매 추측마다 게임은 "더 큼 / 더 작음 / 정답" 피드백을 텍스트로 알려주고 시도 횟수를 누적합니다.
정답을 맞히면 승리 상태가 되고, 최소 시도 횟수(best score)는 브라우저에 저장되어 다음 방문에도 표시됩니다.
플레이어는 언제든 새 게임을 시작해 상태를 초기값으로 되돌릴 수 있습니다.

- **주 행위자**: 단일 플레이어 (인증 없음, 로컬 브라우저)
- **범위 밖(non-goal)**: 서버 저장, 멀티플레이어, 난이도 선택, 범위 커스터마이즈

---

## 2. 산출물 경로 및 파일 소유권 (frozen — 재정의 금지)

frozen blueprint가 파일 소유권과 상태 계약의 유일한 권위입니다. planner는 새 파일·역할을 추가하지 않습니다.
모든 산출물 파일은 **additive** 정책(기존 selector/token 변경 금지, 추가만 허용)을 따릅니다.

| 파일 경로 | 소유자 | 정책 |
| --- | --- | --- |
| `apps/number-guessing/index.html` | developer | additive |
| `apps/number-guessing/game.js` | developer | additive |
| `apps/number-guessing/style.css` | developer | additive |
| `apps/number-guessing/tests/judge.test.js` | developer | additive |
| `docs/design/number-guessing-BF-1600.md` | designer | additive |
| `docs/design/number-guessing-mockup.html` | designer | additive |
| `docs/plans/number-guessing-BF-1600.md` | planner | 본 문서 |

- **serve_root**: `.` (root-relative static), module type: ESM, package manager: npm
- **entry**: `apps/number-guessing/index.html`
- **주의**: 본 계약에는 별도 `judge.js` 파일이 **없습니다**. 순수함수 `judge`는
  `apps/number-guessing/game.js`에서 export하며 `tests/judge.test.js`가 import합니다(§4 참조).
- 후속 페르소나 handoff 순서: planner(plan) → designer(design)·developer(develop) 병렬 → reviewer(review) → tester(test)

---

## 3. UI 계약 (frozen — selector·token 변경 금지)

### 3.1 DOM ID

| ID | 요소 역할 |
| --- | --- |
| `guess-form` | 추측 입력 form (Enter 키 제출 지원, submit 이벤트로 처리) |
| `guess-input` | 추측 숫자 입력 필드 (`aria-label='추측할 숫자 입력'`) |
| `guess-submit` | 추측 제출 버튼 (`aria-label='추측 제출'`) |
| `guess-feedback` | 피드백 텍스트 영역 (`aria-live='polite'`) |
| `attempts-count` | 누적 시도 횟수 표시 |
| `best-score` | 최소 시도 횟수(best score) 표시 |
| `new-game` | 새 게임 시작 컨트롤 |

### 3.2 CSS class

| class | 용도 |
| --- | --- |
| `game` | 게임 카드 루트 컨테이너 |
| `game__input` | 추측 입력 필드 |
| `game__submit` | 제출 버튼 |
| `game__feedback` | 피드백 텍스트 |
| `game__stats` | 시도 횟수·best score 등 통계 영역 |

### 3.3 design token (frozen 값 — 재정의 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 컨트롤(제출 버튼) 색 |
| `--color-feedback-higher` | `#f59e0b` | `higher`(더 큼) 피드백 색 |
| `--color-feedback-lower` | `#3b82f6` | `lower`(더 작음) 피드백 색 |
| `--color-feedback-win` | `#16a34a` | `win`(정답) 피드백 색 |
| `--color-feedback-error` | `#dc2626` | `invalid`(오류) 피드백 색 |
| `--space-control-gap` | `12px` | 컨트롤 간 간격 |

### 3.4 상태 모델 (states)

상태는 정확히 `idle`, `higher`, `lower`, `win`, `invalid` 다섯 가지입니다.
각 상태의 화면 텍스트는 아래 값을 **그대로** 노출합니다(재정의 금지).

| 상태 | 진입 조건 | 화면 텍스트 (`guess-feedback`) | 컨트롤 상태 |
| --- | --- | --- | --- |
| `idle` | 초기 로드 / 새 게임 시작 직후 | `1~100 사이 숫자를 입력하세요` | submit 활성 |
| `higher` | 유효 추측 < 정답 (더 큰 수 필요) | `더 큼 — 더 큰 수를 입력하세요` | submit 활성 |
| `lower` | 유효 추측 > 정답 (더 작은 수 필요) | `더 작음 — 더 작은 수를 입력하세요` | submit 활성 |
| `win` | 유효 추측 == 정답 | `정답! N번 만에 맞혔습니다` (N = 시도 횟수) | submit **비활성**, `new-game` **강조** |
| `invalid` | 정수 아님 / 1~100 범위 밖 | `1~100 사이 정수를 입력하세요` (error 색) | submit **유지**(활성) |

> **후조건 불변식**: 초기화·취소·실패(`invalid`) 뒤에는 상태와 진행 표시(시도 횟수·피드백)를
> 초기값으로 되돌리고 주 실행 control(입력·제출)을 다시 사용할 수 있어야 합니다.
> 모든 상태는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름**으로 노출합니다.

### 3.5 접근성 (accessibility)

- `guess-input`은 명시적 `aria-label='추측할 숫자 입력'`을 가진다.
- `guess-submit`은 명시적 `aria-label='추측 제출'`을 가진다.
- `guess-feedback`는 `aria-live='polite'`로 상태 텍스트 변화를 낭독한다.
- `guess-form`에서 **Enter 키로 제출**이 동작한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- **320px 이상**에서 content overflow가 발생하지 않는다.
- **480px 미만**에서 입력·제출 control이 **세로로 stack**된다.

---

## 4. 핵심 로직 계약 — `judge(guess, answer)` (frozen 순수함수)

`apps/number-guessing/game.js`는 부수효과 없는 순수함수 `judge`를 export한다.
`tests/judge.test.js`가 이 함수를 import해 `node --test`로 검증한다.

```js
// game.js 에서 export
// @param {number} guess  - 이미 검증·정규화된 정수 추측
// @param {number} answer - 비밀 정답 정수 (1~100)
// @returns {'higher' | 'lower' | 'win'}
export function judge(guess, answer) { /* ... */ }
```

### 반환 계약 (고정)

| 조건 | 반환값 | 대응 상태 |
| --- | --- | --- |
| `guess < answer` | `'higher'` | `higher` (더 큰 수를 입력하세요) |
| `guess > answer` | `'lower'` | `lower` (더 작은 수를 입력하세요) |
| `guess === answer` | `'win'` | `win` (정답) |

- 반환 문자열은 상태 모델의 `higher` / `lower` / `win`과 1:1 대응한다.
- `judge`는 입력 검증(범위·NaN·정수)을 담당하지 **않는다** — 검증은 호출부(`game.js`의 submit 핸들러)의
  책임이며, 검증 실패는 `invalid` 상태로 처리된다. `judge`에는 이미 정규화된 정수 두 개만 전달된다.
- **import 안전성**: `game.js`는 `judge`를 부수효과 없이 export해야 하며, DOM 초기화(이벤트 바인딩·정답
  생성)는 브라우저 로드 시점에만 실행되도록 가드한다(예: `DOMContentLoaded` 또는 `document` 존재 확인).
  이렇게 해야 `node --test`가 DOM 없이 `game.js`에서 `judge`만 import해 실행할 수 있다.

### node --test 검증 전략

- **명령**: `node --test apps/number-guessing/tests/judge.test.js` (focused scope, 본 작업이 추가한 테스트만 실행)
- **검증 케이스**:
  - `judge(30, 50) === 'higher'` (guess < answer)
  - `judge(70, 50) === 'lower'` (guess > answer)
  - `judge(50, 50) === 'win'` (정답)
  - 경계값: `judge(49, 50) === 'higher'`, `judge(51, 50) === 'lower'`, `judge(1, 1) === 'win'`, `judge(100, 100) === 'win'`

---

## 5. best score 저장·표시 규칙 (localStorage)

- **저장 매체**: `localStorage`
- **키**: `number-guessing:best-score`
- **저장 값**: 정답을 맞힌 게임의 시도 횟수(정수, 문자열로 직렬화)
- **저장 규칙**: `win` 상태 진입 시, 이번 게임의 시도 횟수가 기존 저장값보다 **작을 때만** 갱신한다.
  기존 저장값이 없으면 이번 시도 횟수를 그대로 저장한다.
- **표시 규칙**: `best-score` 요소는 로드 시 저장값을 읽어 표시한다.
  저장값이 없으면 "기록 없음" 취지의 대체 텍스트를 표시한다(빈 값 노출 금지).
- **초기화 범위**: 새 게임(`new-game`)은 현재 진행 상태만 초기화하며, **best score는 유지**한다.
- **장애 내성**: `localStorage` 접근이 실패(비활성/quota)해도 게임 진행은 막지 않는다 —
  best score만 세션 한정으로 동작하고 나머지 흐름은 정상 유지한다.

---

## 6. 게임 흐름 (game.js 오케스트레이션)

1. **로드**: 정답 생성(1~100 정수 난수), 상태 `idle`, 시도 횟수 0, `best-score` 표시.
2. **제출**(`guess-form` submit — 버튼 클릭 또는 입력에서 Enter):
   1. `guess-form`의 native 검증이 JS 처리를 가로채지 않도록 하고(§8 참조), submit 이벤트를 `preventDefault`로 받아 처리한다.
   2. 입력값 파싱·검증. 정수 아님/1~100 범위 밖 → `invalid` 상태, 시도 횟수 **미증가**, submit 유지.
   3. 유효하면 시도 횟수 +1 → `judge(guess, answer)` 호출.
   4. 반환값에 따라 상태(`higher`/`lower`/`win`)와 `guess-feedback` 텍스트를 갱신하고 `attempts-count`를 갱신한다.
   5. `win`이면: `guess-submit` 비활성, `new-game` 강조, best score 갱신 규칙(§5) 적용 후 `best-score` 표시 갱신.
3. **새 게임**(`new-game`): 정답 재생성, 상태 `idle`, 시도 횟수 0, 피드백 초기화, `guess-submit` 재활성, best score 유지.

---

## 7. Acceptance Criteria (Given/When/Then)

- **AC1 — higher 피드백**
  Given 정답이 50이고 상태가 `idle`일 때,
  When 플레이어가 30을 제출하면,
  Then `judge`는 `'higher'`를 반환하고 상태는 `higher`, `guess-feedback`에 `더 큼 — 더 큰 수를 입력하세요`가 노출되며 `attempts-count`는 1이 된다.

- **AC2 — lower 피드백**
  Given 정답이 50일 때,
  When 플레이어가 70을 제출하면,
  Then `judge`는 `'lower'`를 반환하고 상태는 `lower`, `guess-feedback`에 `더 작음 — 더 작은 수를 입력하세요`가 노출된다.

- **AC3 — 승리 및 best score**
  Given 정답이 50이고 이전 best score가 없을 때,
  When 플레이어가 3번째 시도에 50을 제출하면,
  Then `judge`는 `'win'`을 반환하고 상태는 `win`, `guess-feedback`에 `정답! 3번 만에 맞혔습니다`가 노출되며 `guess-submit`은 비활성, `best-score`는 3으로 저장·표시된다.

- **AC4 — best score 갱신 조건**
  Given 저장된 best score가 3일 때,
  When 플레이어가 5번 만에 승리하면,
  Then `best-score`는 3으로 유지된다(더 작을 때만 갱신).

- **AC5 — invalid 입력**
  Given 상태가 `idle`이고 시도 횟수가 0일 때,
  When 플레이어가 빈 값 / 문자 / 0 / 101을 제출하면,
  Then 상태는 `invalid`, `guess-feedback`에 `1~100 사이 정수를 입력하세요`(error 색)가 노출되고 시도 횟수는 증가하지 않으며 `guess-submit`은 활성 유지된다.

- **AC6 — 새 게임 초기화**
  Given 게임이 `win` 상태일 때,
  When 플레이어가 `new-game`을 실행하면,
  Then 상태는 `idle`, 시도 횟수는 0, 피드백은 `1~100 사이 숫자를 입력하세요`로 초기화되고 입력·제출이 다시 사용 가능하며 best score는 유지된다.

- **AC7 — 접근성**
  Given 화면 리더 사용자가 추측을 제출할 때,
  When 피드백이 갱신되면,
  Then `guess-feedback`(`aria-live='polite'`)가 상태 텍스트를 읽어주고, `guess-input`은 `aria-label='추측할 숫자 입력'`, `guess-submit`은 `aria-label='추측 제출'`을 가지며 `guess-form`에서 Enter 제출이 동작한다.

- **AC8 — 반응형**
  Given 320px 폭 뷰포트에서,
  When 게임 카드를 렌더하면,
  Then content overflow가 없고 480px 미만에서 입력·제출 control이 세로로 stack된다.

- **AC9 — judge 순수함수 단위 테스트**
  Given `apps/number-guessing/tests/judge.test.js`,
  When `node --test`로 실행하면,
  Then `higher`/`lower`/`win` 세 반환값과 경계값(§4)이 모두 통과한다.

---

## 8. Edge / 실패 케이스

| 케이스 | 기대 동작 |
| --- | --- |
| 빈 입력 제출 | `invalid` 상태, 시도 미증가, submit 유지 |
| 정수 아님(문자/소수) | `invalid` 상태, 시도 미증가, 진행 유지 |
| 범위 밖(<1 또는 >100) | `invalid` 상태, `1~100 사이 정수를 입력하세요` 표시 |
| `guess-form` native 검증 간섭 | `guess-form`에 `novalidate`를 두어 native 검증이 `invalid` 상태 제출을 가로채지 않게 한다(회귀 방지) |
| `win` 이후 추가 제출 | `guess-submit` 비활성으로 재제출 차단, `new-game` 전까지 승리 상태 유지 |
| `localStorage` 접근 실패 | best score 세션 한정 동작, 게임 진행은 정상 |
| best score 저장값 없음 | "기록 없음" 대체 텍스트 표시 |

---

## 9. handoff 계약 요약 (planning-contract@v1)

- **designer**(BF-1601): `docs/design/number-guessing-BF-1600.md` + `docs/design/number-guessing-mockup.html`을
  본 UI 계약(§3)의 selector·token·상태 텍스트·접근성·반응형 값 그대로 시각화한다. 값 변경·재정의 금지.
- **developer**(BF-1602): `apps/number-guessing/{index.html,game.js,style.css}` +
  `tests/judge.test.js`를 구현한다. `judge`(§4)·상태 모델(§3.4)·best score 규칙(§5)을 고정 계약으로 따르며,
  `judge`는 `game.js`에서 부수효과 없이 export한다(별도 `judge.js` 없음).
- **invariant**: designer·developer는 승인된 실행 설계를 따르며, selector·token을 변경·재정의하지 않고,
  파일 소유권·상태 계약(frozen blueprint)을 재정의하지 않는다.
