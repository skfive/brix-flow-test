# 숫자 야구 게임 구현 설계 (BF-1772)

> 본 문서는 **frozen Execution Blueprint / UI 계약을 렌더링**한 planner 산출물입니다.
> designer(BF-1773)와 developer(BF-1774)는 아래 파일 소유권·선택자·상태·토큰을 **변경하거나 재정의하지 않고** 그대로 구현합니다.
> planner는 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

---

## 1. 개요 (Objective)

브라우저에서 동작하는 vanilla static 숫자 야구(number baseball) 게임을 구현한다.
사용자는 세 자리 숫자를 추측하고, 매 시도마다 스트라이크/볼/아웃 피드백을 받는다.
정답을 맞히면 승리, 9회 시도 안에 맞히지 못하면 패배한다.

- observed_stack: `vanilla-static` (ESM, npm, serve_root `.`)
- 정적 파일 + 순수 로직(`src/game.js`) + 단위 테스트(`tests/game.test.js`)로 구성한다.

---

## 2. 파일 소유권 (Frozen File Ownership)

frozen blueprint가 유일한 권위이며, 아래 소유권·상태 계약을 planner 문서가 재정의하지 않는다.

| 파일 | 소유자 | 상태 계약 |
|------|--------|-----------|
| `docs/design/BF-1772/design-mockup.html` | designer | additive |
| `docs/design/BF-1772/design-tokens.html` | designer | additive |
| `local-iso-number-baseball/README.md` | canonical work packet owner | additive |
| `local-iso-number-baseball/index.html` | developer | additive |
| `local-iso-number-baseball/src/game.js` | developer | additive |
| `local-iso-number-baseball/styles.css` | developer | additive |
| `local-iso-number-baseball/tests/game.test.js` | developer | additive |

- artifact-policy: 위 모든 파일은 **additive** — 기존 산출물을 덮어쓰지 않고 추가/확장한다.
- planner 산출물: `docs/plans/BF-1772/implementation-plan.md` (본 문서).

---

## 3. UI 계약 (ui-contract@v1 — blueprint-frozen)

designer와 developer는 아래 selector·token을 **변경하거나 재정의하지 않는다**.

### 3.1 DOM ID (exact)

| DOM ID | 용도 |
|--------|------|
| `game-root` | 게임 전체 루트 컨테이너 |
| `rgb-display` | 현재 게임 정보 / 시도 안내 디스플레이 영역 |
| `guess-input` | 세 자리 숫자 추측 입력 필드 |
| `guess-submit` | 추측 제출 버튼 |
| `feedback` | 스트라이크/볼 결과 피드백 영역 (aria-live) |
| `attempts-count` | 남은/사용 시도 표시 |
| `result-screen` | 승/패 결과 화면 컨테이너 |
| `result-answer` | 결과 화면의 정답 노출 영역 |
| `restart-button` | 재시작 버튼 |

### 3.2 CSS class (exact)

| CSS class | 용도 |
|-----------|------|
| `game` | 게임 루트 블록 |
| `game__display` | 디스플레이 영역 (`#rgb-display`) |
| `game__input` | 입력 필드 (`#guess-input`) |
| `game__submit` | 제출 버튼 (`#guess-submit`) |
| `game__feedback` | 피드백 영역 (`#feedback`) |
| `game__attempts` | 시도 표시 (`#attempts-count`) |
| `game__result` | 결과 화면 (`#result-screen`) |

### 3.3 화면 상태 (states)

| 상태 | 설명 | 화면 |
|------|------|------|
| `playing` | 진행 중 — 입력·제출 가능, 시도 카운트 갱신 | `#game-root` 활성, `#result-screen` 숨김 |
| `win` | 3 스트라이크로 정답 맞힘 | `#result-screen` 노출, 승리 텍스트 + 정답 |
| `lose` | 9회 소진, 정답 못 맞힘 | `#result-screen` 노출, 패배 텍스트 + `#result-answer`에 정답 |

- 상태는 **색상만으로 구분하지 않고** 상태명(승리/패배/진행 중)을 화면 텍스트와 접근성 이름으로 노출한다.
- 초기화·재시작 뒤에는 상태·시도·피드백·입력을 초기값(`playing`, 시도 0/9, 빈 피드백)으로 되돌리고 `#guess-input`/`#guess-submit`를 다시 사용할 수 있어야 한다.

### 3.4 CSS 변수 (design tokens — exact value)

| 변수 | 값 | 용도 |
|------|-----|------|
| `--color-bg` | `#0f172a` | 배경 |
| `--color-surface` | `#1e293b` | 카드/표면 |
| `--color-text` | `#f8fafc` | 본문 텍스트 |
| `--color-strike` | `#22c55e` | 스트라이크(초록) |
| `--color-ball` | `#eab308` | 볼(노랑) |
| `--color-out` | `#ef4444` | 아웃(빨강) |
| `--space-md` | `16px` | 기본 간격 |
| `--radius-md` | `12px` | 모서리 반경 |
| `--font-size-display` | `1.5rem` | 디스플레이 폰트 크기 |

### 3.5 접근성 (accessibility)

- `#guess-input`은 `aria-label="세 자리 숫자 추측 입력"`을 가진다.
- `#guess-submit`과 `#restart-button`은 명시적 `aria-label`을 가진다 (예: "추측 제출", "게임 재시작").
- `#feedback` 영역은 `aria-live="polite"`로 스트라이크·볼 결과를 알린다.
- 모든 상태(`playing`/`win`/`lose`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- 320px 이상에서 content overflow가 발생하지 않는다.
- 좁은 너비(모바일)에서 입력·버튼 control이 **단일 열로 세로 정렬**된다.

---

## 4. 게임 규칙 (Game Rules)

### 4.1 정답 생성 (secret generation)

- 정답은 **세 자리, 서로 다른 숫자** 3개로 구성한다.
- 사용 숫자 집합: `1`–`9` (서로 겹치지 않는 3개). 앞자리 0으로 인한 자릿수 모호성을 피한다.
- 무작위 정답은 **주입 가능한 RNG 인터페이스**로 생성한다 (§5 참조) — 테스트에서 결정적 정답 주입이 가능해야 한다.

### 4.2 채점: 스트라이크 / 볼 / 아웃 (scoring)

추측(guess) 세 자리와 정답(secret) 세 자리를 비교한다.

- **스트라이크(strike)**: 숫자와 **위치가 모두 일치**하는 자리 수.
- **볼(ball)**: 숫자는 정답에 있으나 **위치가 다른** 자리 수.
- **아웃(out)**: 스트라이크·볼이 모두 0인 경우 (일치하는 숫자 없음).
- 판정 결과는 `{ strikes, balls, out }` 형태로 계산한다. `out`은 `strikes === 0 && balls === 0`.

### 4.3 입력 검증 (validation)

- 입력은 세 자리 숫자여야 하며, 세 자리 모두 서로 달라야 한다 (정답 규칙과 동일).
- 유효하지 않은 입력(길이 부족, 숫자 아님, 중복 자리)은 시도로 소모하지 않고 오류 메시지를 노출한다.

### 4.4 시도 관리 (attempts)

- 최대 시도 횟수: **9회**.
- 유효한 추측 1회마다 시도 카운트를 1 증가시키고 `#attempts-count`에 갱신한다.
- **승리(win)**: 스트라이크 3 → 상태 `win`, `#result-screen` 노출.
- **패배(lose)**: 9회 유효 시도를 소진했는데 3 스트라이크에 도달하지 못함 → 상태 `lose`, `#result-answer`에 정답 노출.
- win/lose 상태에서는 입력·제출을 비활성화하고 `#restart-button`으로만 재시작한다.
- 재시작 시 §3.3 초기화 후조건을 따른다.

---

## 5. 순수 로직 인터페이스 (src/game.js — developer 구현)

`src/game.js`는 DOM에 의존하지 않는 **순수 로직**을 export 하여 `tests/game.test.js`에서 단위 테스트 가능해야 한다.
아래는 계약 수준의 인터페이스 명세이며, developer는 이 규약을 만족하는 signature로 구현한다.

### 5.1 주입 가능한 RNG 인터페이스

```
// rng: () => number  — [0, 1) 범위 float 반환 (기본값 Math.random)
generateSecret(rng = Math.random): number[]   // 서로 다른 세 자리 숫자 배열, 예: [3, 7, 1]
```

- 테스트는 결정적 `rng`(예: 미리 정한 시퀀스를 반환하는 함수)를 주입해 정답을 고정한다.
- `Math.random`을 함수 내부에서 직접 호출하지 않고 **인자로 주입**받아 테스트 가능성을 확보한다.

### 5.2 채점 함수

```
scoreGuess(secret: number[], guess: number[]): { strikes: number, balls: number, out: boolean }
```

- 순수 함수 — 동일 입력에 항상 동일 출력.

### 5.3 입력 검증 함수

```
validateGuess(input: string): { valid: boolean, digits?: number[], error?: string }
```

- 세 자리·숫자·중복 없음 검증. 실패 시 `error` 메시지 반환.

### 5.4 게임 상태 (선택적 팩토리)

```
createGame({ rng = Math.random, maxAttempts = 9 }): {
  submit(input): { state, strikes, balls, out, attemptsUsed, error? },
  restart(): void,
  getState(): 'playing' | 'win' | 'lose'
}
```

- `state`는 §3.3의 `playing`/`win`/`lose` 중 하나.
- developer는 위 순수 함수를 조합해 `index.html`의 DOM 이벤트 핸들러에서 사용한다.

---

## 6. Edge case · 실패 케이스

| 케이스 | 기대 동작 |
|--------|-----------|
| 입력이 세 자리 미만/초과 | 오류 메시지, 시도 미소모 |
| 숫자가 아닌 문자 포함 | 오류 메시지, 시도 미소모 |
| 중복 자리 (예: `112`) | 오류 메시지, 시도 미소모 |
| 빈 입력 후 제출 | 오류 메시지, 시도 미소모 |
| 9회째 시도에서 정답 | `win` (패배로 처리하지 않음) |
| 9회 소진, 마지막도 오답 | `lose`, `#result-answer`에 정답 노출 |
| 재시작 후 상태 | `playing`, 시도 0/9, 피드백/입력 초기화, control 재활성화 |
| 색상 미인지 사용자 | 스트라이크/볼/아웃·승/패를 텍스트로도 노출 (§3.5) |
| 화면 폭 320px | overflow 없음, 입력·버튼 단일 열 (§3.6) |

---

## 7. 인수 기준 (Acceptance Criteria — Given/When/Then)

- **AC-1 (정답 생성)**: Given 결정적 RNG 주입, When `generateSecret(rng)` 호출, Then 서로 다른 세 자리 숫자 배열이 결정적으로 반환된다.
- **AC-2 (채점)**: Given 정답 `[3,7,1]`과 추측 `[1,7,2]`, When `scoreGuess` 호출, Then `{ strikes:1, balls:1, out:false }`.
- **AC-3 (아웃)**: Given 정답 `[3,7,1]`과 추측 `[4,5,6]`, When `scoreGuess` 호출, Then `{ strikes:0, balls:0, out:true }`.
- **AC-4 (승리)**: Given `playing` 상태, When 3 스트라이크 추측 제출, Then 상태 `win`, `#result-screen` 노출.
- **AC-5 (패배)**: Given 9회 유효 시도 소진 후에도 미해결, Then 상태 `lose`, `#result-answer`에 정답 노출.
- **AC-6 (검증)**: Given 중복 자리/비숫자/길이 오류 입력, When 제출, Then 오류 노출·시도 미소모.
- **AC-7 (재시작)**: Given `win`/`lose` 상태, When `#restart-button` 클릭, Then `playing`·시도 0/9·피드백/입력 초기화·control 재활성화.
- **AC-8 (UI 계약)**: 파일명·DOM ID/class·상태·CSS 변수 exact 값·접근성 이름·`aria-live`·320px 반응형·산출물 경로가 §2–§3 그대로 구현된다.
- **AC-9 (접근성)**: `#guess-input` aria-label "세 자리 숫자 추측 입력", `#guess-submit`/`#restart-button` 명시적 aria-label, `#feedback` `aria-live="polite"`, 모든 상태 텍스트+접근성 이름 노출.

---

## 8. 검증 (Verification)

- observed_stack `vanilla-static`, package test command: `npm test` (표시용). test_scope: **focused**.
- developer는 `tests/game.test.js`에서 §5의 순수 함수(`generateSecret`/`scoreGuess`/`validateGuess`)에 대한 단위 테스트를 작성한다.
- focused scope: 신규 작성·수정한 테스트와 본 게임 module만 실행하고, 다른 module 회귀는 실행하지 않는다.

---

## 9. Handoff

- **designer(BF-1773)**: `docs/design/BF-1772/design-mockup.html`, `docs/design/BF-1772/design-tokens.html` — §3 UI 계약(selector·상태·token·접근성·반응형)을 시각화. selector/token 변경 금지.
- **developer(BF-1774)**: `local-iso-number-baseball/` — `index.html`·`styles.css`·`src/game.js`·`tests/game.test.js` 구현. §3~§6 계약과 §5 인터페이스 준수, additive.
- 후속: reviewer(design·develop 완료 후) → tester.
