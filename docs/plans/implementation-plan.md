# 결정론적 Backoff 계약 — 구현 실행 설계 (BF-1389)

> 본 문서는 planner가 먼저 작성하고 **designer(BF-1384) / developer(BF-1387) / tester(BF-1393)** 가
> 그대로 따르는 실행 설계(`planning-contract@v1`)입니다.
> **입력/출력 규칙 · 불변식 · 에러 계약 · edge case · 복잡도 목표는 아래 값이 유일한 권위**이며,
> designer와 developer는 승인된 입출력·에러 계약을 재정의하지 않고 그대로 구현합니다.

- Jira: BF-1389 (planner)
- Epic 형제 Task: BF-1384(designer) · BF-1387(developer) · BF-1393(tester)
- executionProfile: `implementation-strict`
- 대상 저장소: backend (vanilla-static / esm / serve_root=`.`)
- 대상 함수 파일(구현 소유 developer): `lib/deterministic-retry/backoff.js`

---

## 1. Problem Statement

### 배경
재시도(retry) 로직에서 각 시도마다 대기 시간을 지수적으로 늘리는 exponential backoff가 필요하다.
현재 저장소에는 이를 계산하는 **결정론적(deterministic)** 단일 함수가 없어, 소비 측(producer)마다
제각기 지연 계산을 구현할 위험이 있다. 계산 규칙이 흩어지면 상한(cap) 처리·오버플로 처리·입력 검증이
일관되지 않게 되어 재시도 폭주나 예측 불가능한 지연을 유발한다.

### 목표
downstream producer가 소비할 수 있도록, **동일 입력에 항상 동일 출력**을 내는 순수(pure) backoff
계산 함수의 입출력·경계 계약을 구현 가능한 설계로 확정한다. 이 문서는 계약을 고정하며,
실제 함수 구현은 developer(BF-1387)가 `lib/deterministic-retry/backoff.js`에 수행한다.

### 비목표 (Non-Goals)
- 실제 재시도 실행/타이머/스케줄러 구현 (본 함수는 지연 "값"만 계산한다).
- jitter(무작위 흔들림) 도입 — 결정론성을 깨므로 명시적으로 금지한다.
- 네트워크·I/O·전역 상태 접근.

---

## 2. Proposed Solution (Overview)

단일 순수 함수를 정의한다. 입력 객체 `{ baseDelayMs, attempt, maxDelayMs }`를 받아
`Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)` 규칙으로 지연(ms)을 계산해 반환한다.
외부 의존성·랜덤·타이머·네트워크를 사용하지 않으며, 입력 객체를 변형하지 않는다.

### 2.1 함수 시그니처 (frozen — 재정의 금지)

```
computeBackoffDelay(input: {
  baseDelayMs: number,   // 0 이상 정수
  attempt: number,       // 0 이상 정수
  maxDelayMs: number     // baseDelayMs 이상 정수
}): number               // 계산된 지연(ms), 0 이상 정수
```

- 모듈 형식: ESM (`export function computeBackoffDelay(input) { ... }`).
- 구현 파일(developer 소유): `lib/deterministic-retry/backoff.js`.
- 단위 테스트(developer 동반): `lib/deterministic-retry/backoff.test.js`.
- 회귀 테스트(tester 소유, read-only): `lib/deterministic-retry/backoff.regression.test.js`.

### 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `docs/plans/implementation-plan.md` | planner (BF-1389, 본 문서) | — | 실행 설계 + 계약 + RTM |
| `docs/design/**` | designer (BF-1384) | additive | 계약 기반 설계 명세 |
| `lib/deterministic-retry/backoff.js` | developer (BF-1387) | additive | backoff 계산 함수 (ESM) |
| `lib/deterministic-retry/backoff.test.js` | developer (BF-1387) | additive | 함수 단위 테스트 |
| `lib/deterministic-retry/backoff.regression.test.js` | tester (BF-1393) | (planner read-only) | 계약 회귀·edge case 검증 |

> `additive` 정책: 후속 페르소나는 아래 계약된 입출력·불변식·에러 규칙을 **추가·구현**하되 변경·삭제·재정의하지 않는다.

---

## 3. Exact Backoff Contract (frozen — 유일 권위)

### 3.1 입력 계약 (Input Contract)

| 필드 | 타입 | 허용 범위 | 비고 |
| --- | --- | --- | --- |
| `baseDelayMs` | number(정수) | `0` 이상 정수 | 기준 지연(ms). `0` 허용 |
| `attempt` | number(정수) | `0` 이상 정수 | 시도 회차(0-기반). 최초 시도는 `0` |
| `maxDelayMs` | number(정수) | `baseDelayMs` 이상 정수 | 지연 상한(cap). `baseDelayMs`와 같을 수 있음 |

- 세 필드 모두 유한한 **정수**여야 한다 (`Number.isInteger` 만족).
- 세 필드 모두 **필수**이며, 누락은 입력 검증 실패로 처리한다(3.4 참조).

### 3.2 출력 규칙 (Output Rule)

```
result = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
```

- 반환값은 `0` 이상 정수(ms)이다.
- `baseDelayMs * 2 ** attempt`가 `maxDelayMs`를 초과하면 `maxDelayMs`로 **포화(saturation)** 한다.
- 계산이 `maxDelayMs` 이하이면 지수값 `baseDelayMs * 2 ** attempt`를 그대로 반환한다.

### 3.3 불변식 (Invariants — 필수)

1. **입력 객체 미변경**: 함수는 전달받은 입력 객체와 그 필드를 읽기만 하며 절대 mutate하지 않는다(순수 함수).
2. **결정론성**: 동일 입력 → 항상 동일 출력. 랜덤/시간/외부 상태에 의존하지 않는다.
3. **Number 안전 범위 초과 시 포화**: `attempt`가 매우 커서 `baseDelayMs * 2 ** attempt`가
   `Number.MAX_SAFE_INTEGER`를 초과하거나 `Infinity`가 되어도, `Math.min(maxDelayMs, ...)` 규칙에 따라
   결과는 항상 `maxDelayMs`로 포화한다(별도 예외를 던지지 않는다).
4. **외부 의존성 금지**: 랜덤(`Math.random`)·타이머(`setTimeout` 등)·네트워크·파일·전역 가변 상태 접근 금지.
5. **상한 보장**: 유효 입력에 대해 `0 <= result <= maxDelayMs` 를 항상 만족한다.

### 3.4 에러 계약 (Error Contract — 필수)

입력 검증 순서는 **타입 검사 → 범위 검사**이며, 유효하지 않으면 값을 계산하지 않고 즉시 throw한다.

| 조건 | 던지는 에러 | 사유 |
| --- | --- | --- |
| 필드가 number가 아님 (누락/문자열/undefined 등) | `TypeError` | 타입 위반 |
| 필드가 `NaN` | `TypeError` | 숫자가 아님(비유한·비정수) |
| 필드가 소수(비정수, `Number.isInteger` 실패) | `TypeError` | 정수 계약 위반 |
| 필드가 `Infinity`/`-Infinity` | `TypeError` | 유한 정수 아님 |
| `baseDelayMs < 0` 또는 `attempt < 0` | `RangeError` | 음수 불가 |
| `maxDelayMs < baseDelayMs` | `RangeError` | 상한이 기준보다 작을 수 없음 |

> 요약: **타입/정수/유한성 위반 → `TypeError`**, **부호·대소 관계 위반 → `RangeError`**.
> `maxDelayMs`의 하한 범위 검사는 `baseDelayMs`가 유효 정수임이 확인된 뒤 수행한다.

### 3.5 복잡도 목표 (Complexity)

- 시간·공간 복잡도 **O(1)**. 반복문·재귀·할당 증가 없이 상수 시간 산술 연산만 사용한다.
- `2 ** attempt`는 단일 지수 연산으로 계산하며 루프 누적을 사용하지 않는다.

---

## 4. Edge / 경계 케이스 (필수 — tester 회귀 대상)

| # | 입력 | 기대 출력 | 근거 |
| --- | --- | --- | --- |
| E-1 | `attempt = 0` | `Math.min(maxDelayMs, baseDelayMs)` = `baseDelayMs` (base ≤ max 이므로) | 최초 시도는 base 지연 |
| E-2 | `baseDelayMs = 0` | `0` (모든 attempt에서 `0 * 2**n = 0`) | base가 0이면 항상 0 |
| E-3 | cap 직전 (`baseDelayMs * 2**attempt < maxDelayMs`) | `baseDelayMs * 2 ** attempt` (지수값 그대로) | 상한 미도달 |
| E-4 | cap 경계 (`baseDelayMs * 2**attempt === maxDelayMs`) | `maxDelayMs` | 경계 포함 |
| E-5 | cap 초과 (`baseDelayMs * 2**attempt > maxDelayMs`) | `maxDelayMs` (포화) | 상한 적용 |
| E-6 | 매우 큰 `attempt` (예: `1024`) → 지수값이 안전 범위 초과/`Infinity` | `maxDelayMs` (포화, 예외 없음) | 불변식 3 |
| E-7 | `maxDelayMs === baseDelayMs` | `baseDelayMs` (모든 attempt에서 포화) | cap == base |

### 실패(예외) 케이스

| # | 입력 | 기대 |
| --- | --- | --- |
| F-1 | 임의 필드가 음수 (예: `attempt = -1`) | `RangeError` |
| F-2 | 임의 필드가 `NaN` | `TypeError` |
| F-3 | 임의 필드가 소수 (예: `baseDelayMs = 1.5`) | `TypeError` |
| F-4 | 임의 필드가 number 아님 (예: `attempt = "2"`) | `TypeError` |
| F-5 | `maxDelayMs < baseDelayMs` (예: base=100, max=50) | `RangeError` |
| F-6 | 필드가 `Infinity` (예: `attempt = Infinity`) | `TypeError` |

---

## 5. 데이터 모델 (입출력 표현)

서버 스키마·영속 데이터 변경 없음. 함수는 in-memory 값 계산만 수행한다.

| 요소 | 타입 | 제약 |
| --- | --- | --- |
| 입력 `baseDelayMs` | 정수 | `>= 0` |
| 입력 `attempt` | 정수 | `>= 0` |
| 입력 `maxDelayMs` | 정수 | `>= baseDelayMs` |
| 출력 `delayMs` | 정수 | `0 <= delayMs <= maxDelayMs` |

불변식: 유효 입력에 대해 출력은 항상 `[0, maxDelayMs]` 범위의 정수이며, 입력 객체는 변경되지 않는다.

---

## 6. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence |
| --- | --- | --- | --- | --- |
| REQ-BACKOFF-IO | 입력 계약(3.1) + 출력 규칙 `Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)`(3.2) 명시·구현 | E-1~E-7 | TS-BACKOFF-CONTRACT | build_result, test_result |
| REQ-BACKOFF-INVARIANT | 입력 미변경·안전범위 초과 시 maxDelayMs 포화·외부 의존성/랜덤/타이머/네트워크 금지(3.3) | E-6 | TS-BACKOFF-CONTRACT | build_result, test_result |
| REQ-BACKOFF-ERROR | 음수·NaN·소수·`maxDelayMs<baseDelayMs`에 대한 TypeError/RangeError 계약(3.4) | F-1~F-6 | TS-BACKOFF-CONTRACT | build_result, test_result |
| REQ-BACKOFF-COMPLEXITY | O(1) 상수 시간 산술만 사용(3.5) | E-6 | TS-BACKOFF-CONTRACT | build_result, test_result |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 변경 없음(순수 함수 추가). 기존 저장소 규약(vanilla-static/esm) 유지.
- 파일 정책은 모두 `additive` — 기존 파일 구조를 파괴하지 않는다.

### 롤백
- 신규 추가 파일(`lib/deterministic-retry/**`) 제거로 무손상 롤백 가능. 공유 utility·전역 상태 변경 없음.

---

## 7. Handoff 지시 (후속 페르소나)

- **designer (BF-1384)** — 본 3장 계약(입출력 규칙·불변식·에러·edge case·복잡도)을 유일 권위로 삼아
  설계 명세를 `docs/design/**`에 작성한다. 입출력·에러 계약을 재정의하지 않는다.
- **developer (BF-1387)** — `lib/deterministic-retry/backoff.js`에 3.2 절 시그니처의 `computeBackoffDelay`를
  ESM으로 구현하고, `lib/deterministic-retry/backoff.test.js`로 3장/4장 케이스를 단위 검증한다.
  출력 규칙·에러 계약·불변식을 그대로 구현한다.
- **tester (BF-1393)** — `lib/deterministic-retry/backoff.regression.test.js`로 4장 edge/실패 케이스와
  불변식(입력 미변경·포화·결정론성)을 회귀 검증한다.

> 세 페르소나 모두 본 문서 3장의 계약값을 유일 권위로 삼으며 입출력·에러 계약을 재정의하지 않는다.
