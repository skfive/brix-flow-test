# 재시도 지연 계산기 실행 계약 (BF-1399 / freeze: BF-1406)

> 본 문서는 planner가 **동결**한 함수 실행 계약이다. developer는 이 signature·입출력 spec·경계값·오류 정책·복잡도를 **변경 없이** 그대로 구현하고, reviewer/tester는 본 문서를 검증 기준으로 참조한다.
>
> - frozen interface: `planning-contract@v1`
> - 산출물 경로(본 문서): `docs/plans/retry-delay-BF-1399.md`
> - 구현 대상 경로(계약, developer 소유): `src/retry-delay/**`
> - 시험 대상 경로(계약, tester 소유): `tests/retry-delay/**`

---

## 1. 목적 / 사용자 시나리오

네트워크·큐 소비 등에서 실패한 작업을 재시도할 때, 재시도 횟수(`attempt`)가 늘어날수록 지연을 지수적으로 증가시키되 상한(`maxDelayMs`)을 넘지 않도록 하는 **순수 계산 함수**를 제공한다.

- **As a** 재시도 로직을 사용하는 개발자
- **I want** attempt 번호와 기본 지연·최대 지연을 넣으면 이번 재시도까지 대기할 밀리초를 얻고 싶다
- **So that** 지수 백오프(bounded exponential backoff)를 타이머·프레임워크 의존 없이 결정론적으로 계산할 수 있다

본 계약은 **지연값 "계산"만** 다룬다. 실제 대기(`setTimeout` 등), jitter, 재시도 스케줄링, 로깅은 **범위 밖**이며 본 함수가 수행하지 않는다.

---

## 2. 함수 Signature (동결)

```js
// src/retry-delay/retry-delay.js  (ESM, module_type=esm)
export function computeRetryDelay(attempt, baseDelayMs, maxDelayMs) { /* ... */ }
```

- 배포/모듈 형식: **ESM named export** (`export function`)
- DOM / 타이머 / 네트워크 / 전역 상태에 **무의존** (순수 함수)
- 동일 입력 → 항상 동일 출력 (결정론적, side-effect 없음)

### 2.1 입력 계약

| 파라미터 | 타입 | 유효 조건 | 설명 |
|---|---|---|---|
| `attempt` | number(정수) | `0` 이상의 정수 (`attempt >= 0`, `Number.isInteger`) | 재시도 회차. 0이면 최초(1회차) 지연 |
| `baseDelayMs` | number(정수) | 양의 정수 (`baseDelayMs >= 1`, `Number.isInteger`) | 기본 지연(밀리초) |
| `maxDelayMs` | number(정수) | `baseDelayMs` 이상의 양의 정수 (`maxDelayMs >= baseDelayMs`, `Number.isInteger`) | 상한 지연(밀리초) |

- **입력 불변(immutability)**: 함수는 인자를 재할당·변형하지 않는다. 원시 number 인자이므로 호출자 상태는 보존된다.

### 2.2 출력 계약

- 반환 타입: **정수 밀리초(number, `Number.isInteger` 참)**
- 값: `min(baseDelayMs * 2^attempt, maxDelayMs)`
- 항상 `baseDelayMs <= 반환값 <= maxDelayMs` 를 만족한다.
- `2^attempt`는 `Math.pow(2, attempt)`(또는 `2 ** attempt`)로 계산하며, 반복문을 쓰지 않는다.

---

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 — 최초 회차(attempt=0)
- **Given** `baseDelayMs=100`, `maxDelayMs=10000`
- **When** `computeRetryDelay(0, 100, 10000)`
- **Then** `100` 을 반환한다 (`100 * 2^0 = 100`, 상한 미만).

### AC-2 — 지수 증가(상한 미도달)
- **Given** `baseDelayMs=100`, `maxDelayMs=10000`
- **When** `attempt`가 `1,2,3`
- **Then** 각각 `200`, `400`, `800` 을 반환한다.

### AC-3 — 상한 도달 직전
- **Given** `baseDelayMs=100`, `maxDelayMs=800`
- **When** `computeRetryDelay(3, 100, 800)` (`100*2^3 = 800`)
- **Then** `800` 을 반환한다 (계산값 == 상한, clamp 없이 동일).

### AC-4 — 상한 초과 → clamp
- **Given** `baseDelayMs=100`, `maxDelayMs=800`
- **When** `computeRetryDelay(4, 100, 800)` (`100*2^4 = 1600 > 800`)
- **Then** `800` 을 반환한다 (상한으로 clamp).

### AC-5 — 큰 attempt 안정성(오버플로 무해)
- **Given** `baseDelayMs=100`, `maxDelayMs=10000`
- **When** `computeRetryDelay(1000, 100, 10000)` (`2^1000`은 `Infinity`)
- **Then** `10000` 을 반환한다 (`min(Infinity, 10000) = 10000`, 반복 없이 O(1)로 안전).

### AC-6 — 입력 불변
- **Given** 임의의 유효 입력
- **When** 함수 호출 후
- **Then** 호출자 측 변수/값은 변하지 않는다 (side-effect 없음).

---

## 4. Edge Case / 오류 처리 정책 (동결 표)

오류 정책: **입력 유효성 위반은 `TypeError` 또는 `RangeError`로 즉시 throw(fail-fast)** 하며, 조용한 보정(coerce)·기본값 대체를 하지 않는다. 검증 순서는 아래 표의 위에서 아래 순서를 따른다.

| # | 케이스 | 입력 예 | 기대 동작 |
|---|---|---|---|
| E1 | `attempt=0` (하한) | `(0, 100, 10000)` | `100` 반환 (정상, AC-1) |
| E2 | 상한 도달 직전 | `(3, 100, 800)` | `800` 반환 (정상, AC-3) |
| E3 | 상한 정확 도달 | `(3, 100, 800)` | `800` 반환 (clamp와 무관하게 동일) |
| E4 | 상한 초과 | `(4, 100, 800)` | `800`으로 clamp (AC-4) |
| E5 | 초대형 attempt (`2^attempt=Infinity`) | `(1000, 100, 10000)` | `10000` 반환 (`min(Infinity, max)`) |
| E6 | `attempt` 음수 | `(-1, 100, 10000)` | `RangeError` throw ("attempt must be an integer >= 0") |
| E7 | `attempt` 비정수 | `(1.5, 100, 10000)` | `RangeError` throw (정수 아님) |
| E8 | `attempt` NaN | `(NaN, 100, 10000)` | `TypeError` throw (유한 정수 아님) |
| E9 | `attempt` 비-number 타입 | `("2", 100, 10000)` | `TypeError` throw |
| E10 | `baseDelayMs <= 0` | `(0, 0, 10000)` | `RangeError` throw ("baseDelayMs must be a positive integer") |
| E11 | `baseDelayMs` 비정수/NaN/비-number | `(0, 1.5, 10000)` / `(0, NaN, ...)` | `RangeError`(비정수) / `TypeError`(NaN·비number) |
| E12 | `maxDelayMs < baseDelayMs` (역전된 상한) | `(0, 1000, 500)` | `RangeError` throw ("maxDelayMs must be >= baseDelayMs") |
| E13 | `maxDelayMs` 비정수/NaN/비-number | `(0, 100, 1.5)` / `(0, 100, NaN)` | `RangeError`(비정수) / `TypeError`(NaN·비number) |
| E14 | `Infinity` 입력 (어느 인자든) | `(Infinity, 100, 10000)` 등 | `TypeError` throw (유한 정수 아님) |

**검증 규칙 요약**
- number 타입이 아니거나 `Number.isNaN` 또는 `!Number.isFinite` → `TypeError`.
- number이고 유한하나 정수가 아니거나 도메인 범위(`attempt>=0`, `baseDelayMs>=1`, `maxDelayMs>=baseDelayMs`)를 벗어남 → `RangeError`.
- 에러 메시지는 위반 파라미터명을 포함한다.

---

## 5. 복잡도 / 제약 (동결)

- **시간 복잡도: O(1)** — 반복문(`for`/`while`)·재귀 금지. `2^attempt`는 `2 ** attempt`(또는 `Math.pow`) 단일 연산으로 계산.
- **공간 복잡도: O(1)** — 입력 크기에 비례하는 보조 자료구조 없음.
- **무의존 제약**: DOM API, 타이머(`setTimeout`/`setInterval`), 네트워크(`fetch` 등), 파일시스템, 전역 가변 상태, `Date`/난수(jitter) 사용 금지. 순수 결정론 함수여야 한다.
- 산출물 경로: 구현 `src/retry-delay/retry-delay.js`, 테스트 `tests/retry-delay/retry-delay.test.js` (developer/tester가 최종 파일명 확정, 디렉터리 규약은 위 owned_paths를 따른다).

---

## 6. 참조 구현 스케치 (비구속 — developer가 확정)

> 아래는 계약 이해를 돕는 예시일 뿐 강제 구현이 아니다. 단, 위 signature·정책·복잡도는 반드시 지킨다.

```js
export function computeRetryDelay(attempt, baseDelayMs, maxDelayMs) {
  assertPositiveIntegerFrom(attempt, 0, 'attempt');
  assertPositiveIntegerFrom(baseDelayMs, 1, 'baseDelayMs');
  assertPositiveIntegerFrom(maxDelayMs, 1, 'maxDelayMs');
  if (maxDelayMs < baseDelayMs) {
    throw new RangeError('maxDelayMs must be >= baseDelayMs');
  }
  const raw = baseDelayMs * 2 ** attempt; // Infinity 가능 (안전)
  return Math.min(raw, maxDelayMs);        // 정수 * 정수 → 정수, clamp도 정수
}
```

(`assertPositiveIntegerFrom`은 `TypeError`(비number/NaN/비유한)와 `RangeError`(비정수/범위위반)를 §4 규칙대로 던지는 헬퍼.)

---

## 7. 시험 명세 (tester 참조)

- **level: unit**, 프레임워크 무관 순수 단위 테스트 (`tests/retry-delay/**`).
- 필수 케이스: AC-1~AC-6 및 E1~E14 전부를 커버.
- 검증 항목:
  1. 정상 반환값 정확성 (E1~E5 값 일치).
  2. clamp 경계 동작 (도달 직전/정확/초과).
  3. 오류 throw 타입 정확성 (`TypeError` vs `RangeError` 구분, E6~E14).
  4. 반환값이 항상 정수(`Number.isInteger`)이고 `[baseDelayMs, maxDelayMs]` 범위 내.
- evidence: `build_result`(자동) + `test_result`(tester 실행).
