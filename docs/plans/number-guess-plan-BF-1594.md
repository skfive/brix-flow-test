# 숫자 맞히기 게임 구현 설계 (BF-1594)

> planner: 박기획 · task: BF-1597 · frozen contract: `planning-contract@v1`, `ui-contract@v1`
>
> 본 문서는 designer(BF-1595)·developer(BF-1596)가 따라야 할 **실행 설계**이자
> **동결 UI 계약**의 렌더링본입니다. 아래 selector·token·상태·파일 소유권은
> frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.
> designer·developer는 selector와 token을 **변경하거나 재정의하지 않습니다**.

---

## 1. 개요 / 사용자 시나리오

플레이어는 시스템이 정한 1~100 사이의 비밀 숫자를 추측 입력으로 맞힙니다.
매 추측마다 게임은 "더 높게 / 더 낮게 / 정답" 힌트를 텍스트로 알려주고 시도 횟수를 누적합니다.
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
| `apps/number-guess/index.html` | developer | additive |
| `apps/number-guess/game.js` | developer | additive |
| `apps/number-guess/judge.js` | developer | additive |
| `apps/number-guess/style.css` | developer | additive |
| `apps/number-guess/tests/judge.test.js` | developer | additive |
| `docs/design/number-guess-BF-1594.md` | designer | additive |
| `docs/design/number-guess-mockup.html` | designer | additive |
| `docs/plans/number-guess-plan-BF-1594.md` | planner | 본 문서 |

- **serve_root**: `.` (root-relative static), module type: ESM
- **entry**: `apps/number-guess/index.html`
- 후속 페르소나 handoff 순서: planner(plan) → designer(design)·developer(develop) 병렬 → reviewer(review) → tester(test)

---

## 3. UI 계약 (frozen — selector·token 변경 금지)

### 3.1 DOM ID

| ID | 요소 역할 |
| --- | --- |
| `guess-input` | 추측 숫자 입력 필드 (연결된 label 필수, Enter 제출 지원) |
| `guess-submit` | 추측 제출 버튼 (`aria-label='추측 제출'`) |
| `guess-feedback` | 피드백 텍스트 영역 (`aria-live='polite'`) |
| `attempt-count` | 누적 시도 횟수 표시 |
| `best-score` | 최소 시도 횟수(best score) 표시 |
| `new-game` | 새 게임 시작 컨트롤 |

### 3.2 CSS class

| class | 용도 |
| --- | --- |
| `game` | 게임 카드 루트 컨테이너 |
| `game__field` | 입력 필드 래퍼 |
| `game__submit` | 제출 버튼 |
| `game__feedback` | 피드백 텍스트 |
| `game__meta` | 시도 횟수·best score 등 메타 영역 |
| `game__new` | 새 게임 컨트롤 |

### 3.3 design token (frozen 값 — 재정의 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 컨트롤(제출 버튼) 색 |
| `--color-feedback-correct` | `#16a34a` | 정답(win) 피드백 색 |
| `--color-feedback-hint` | `#b45309` | too-high/too-low 힌트 색 |
| `--space-control-gap` | `12px` | 컨트롤 간 간격 |
| `--font-size-feedback` | `1.125rem` | 피드백 텍스트 크기 |

### 3.4 상태 모델 (states)

상태는 정확히 `idle`, `too-high`, `too-low`, `win` 네 가지입니다.

| 상태 | 진입 조건 | 화면 표현 |
| --- | --- | --- |
| `idle` | 초기 로드 / 새 게임 시작 직후 | 피드백 비움 또는 안내, 입력 활성 |
| `too-high` | 추측 > 정답 | "더 낮게" 취지 힌트 텍스트 + hint 색 |
| `too-low` | 추측 < 정답 | "더 높게" 취지 힌트 텍스트 + hint 색 |
| `win` | 추측 == 정답 | 승리 텍스트 + correct 색, 시도 횟수 확정 |

> **후조건 불변식**: 초기화·취소·실패(잘못된 입력) 뒤에는 상태와 진행 표시(시도 횟수·피드백)를
> 초기값으로 되돌리고 주 실행 control(입력·제출)을 다시 사용할 수 있어야 합니다.
> 모든 상태는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름**으로 노출합니다.

### 3.5 접근성 (accessibility)

- `guess-submit` 버튼은 `aria-label='추측 제출'`을 가진다.
- `guess-feedback`는 `aria-live='polite'`로 피드백 텍스트를 전달한다.
- `guess-input`은 연결된 label을 가지고 **Enter 키로 제출**을 지원한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- 게임 카드는 **최대 폭 480px**로 중앙 정렬되고, 좁은 화면에서 컨트롤이 세로로 쌓인다.
- **320px 이상**에서 content overflow가 발생하지 않는다.

---

## 4. 핵심 로직 계약 — `judge(guess, answer)` (frozen 순수함수)

`apps/number-guess/judge.js`는 부수효과 없는 순수함수를 export 한다.

```js
// judge.js
// @param {number} guess  - 플레이어가 입력한 정수 추측
// @param {number} answer - 비밀 정답 정수
// @returns {'too-high' | 'too-low' | 'win'}
export function judge(guess, answer) { /* ... */ }
```

### 반환 계약 (고정)

| 조건 | 반환값 |
| --- | --- |
| `guess > answer` | `'too-high'` |
| `guess < answer` | `'too-low'` |
| `guess === answer` | `'win'` |

- 반환 문자열은 상태 모델의 `too-high` / `too-low` / `win` 과 1:1 대응한다.
- `judge`는 입력 검증(범위·NaN)을 담당하지 않는다 — 검증은 호출부(`game.js`)의 책임이며,
  `judge`에는 이미 정규화된 정수 두 개만 전달된다.
- 단위 테스트(`tests/judge.test.js`)는 세 반환값과 경계값(guess=answer, guess=answer±1)을 검증한다.

---

## 5. best score 저장·표시 규칙 (localStorage)

- **저장 매체**: `localStorage`
- **키**: `number-guess:best-score`
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

1. **로드**: 정답 생성(1~100 정수), 상태 `idle`, 시도 횟수 0, best score 표시.
2. **제출**(버튼 클릭 또는 입력에서 Enter):
   1. 입력값 파싱·검증. 정수 아님/범위 밖 → 상태·피드백을 유효 안내로 되돌리고 시도 횟수 미증가.
   2. 유효하면 시도 횟수 +1 → `judge(guess, answer)` 호출.
   3. 반환값에 따라 상태(`too-high`/`too-low`/`win`)와 `guess-feedback` 텍스트 갱신.
   4. `win`이면 best score 갱신 규칙 적용 후 `best-score` 표시 갱신.
3. **새 게임**(`new-game`): 정답 재생성, 상태 `idle`, 시도 횟수 0, 피드백 초기화, best score 유지.

---

## 7. Acceptance Criteria (Given/When/Then)

- **AC1 — too-low 힌트**
  Given 정답이 50이고 상태가 `idle`일 때,
  When 플레이어가 30을 제출하면,
  Then `judge`는 `'too-low'`를 반환하고 상태는 `too-low`, `guess-feedback`에 "더 높게" 취지 텍스트가 노출되며 시도 횟수는 1이 된다.

- **AC2 — too-high 힌트**
  Given 정답이 50일 때,
  When 플레이어가 70을 제출하면,
  Then `judge`는 `'too-high'`를 반환하고 상태는 `too-high`, 피드백에 "더 낮게" 취지 텍스트가 노출된다.

- **AC3 — 승리 및 best score**
  Given 정답이 50이고 이전 best score가 없을 때,
  When 플레이어가 3번째 시도에 50을 제출하면,
  Then `judge`는 `'win'`을 반환하고 상태는 `win`, best score는 3으로 저장·표시된다.

- **AC4 — best score 갱신 조건**
  Given 저장된 best score가 3일 때,
  When 플레이어가 5번 만에 승리하면,
  Then best score는 3으로 유지된다(더 작을 때만 갱신).

- **AC5 — 새 게임 초기화**
  Given 게임이 `win` 상태일 때,
  When 플레이어가 `new-game`을 실행하면,
  Then 상태는 `idle`, 시도 횟수는 0, 피드백은 초기화되고 입력·제출이 다시 사용 가능하며 best score는 유지된다.

- **AC6 — 접근성**
  Given 화면 리더 사용자가 추측을 제출할 때,
  When 피드백이 갱신되면,
  Then `guess-feedback`(`aria-live='polite'`)가 상태 텍스트를 읽어주고, `guess-submit`은 `aria-label='추측 제출'`을 가지며 Enter 제출이 동작한다.

- **AC7 — 반응형**
  Given 320px 폭 뷰포트에서,
  When 게임 카드를 렌더하면,
  Then content overflow가 없고 카드는 최대 폭 480px 중앙 정렬, 컨트롤이 세로로 쌓인다.

---

## 8. Edge / 실패 케이스

| 케이스 | 기대 동작 |
| --- | --- |
| 빈 입력 제출 | 시도 미증가, 유효 입력 안내로 상태 되돌림 |
| 정수 아님(문자/소수) | 시도 미증가, 안내 표시, 진행 유지 |
| 범위 밖(<1 또는 >100) | 시도 미증가, 범위 안내 표시 |
| `win` 이후 추가 제출 | 새 게임 전까지 입력은 승리 상태 유지(재판정 안내) |
| `localStorage` 접근 실패 | best score 세션 한정 동작, 게임 진행은 정상 |
| best score 저장값 없음 | "기록 없음" 대체 텍스트 표시 |

---

## 9. handoff 계약 요약 (planning-contract@v1)

- **designer**(BF-1595): `docs/design/number-guess-BF-1594.md` + `docs/design/number-guess-mockup.html`을
  본 UI 계약(§3)의 selector·token·상태·접근성·반응형 값 그대로 시각화한다. 값 변경·재정의 금지.
- **developer**(BF-1596): `apps/number-guess/{index.html,game.js,judge.js,style.css}` +
  `tests/judge.test.js`를 구현한다. `judge`(§4)·상태 모델(§3.4)·best score 규칙(§5)을 고정 계약으로 따른다.
- **invariant**: designer·developer는 승인된 실행 설계를 따르며, selector·token을 변경·재정의하지 않는다.
