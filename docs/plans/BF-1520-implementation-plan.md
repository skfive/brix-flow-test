# BF-1520 · SPEED_CONFIG 추출 구현 설계

- **Jira**: BF-1520 (구현) / BF-1526 (본 planner task)
- **대상 모듈**: `demo/neon-snake-fullscreen-0802`
- **성격**: 순수 리팩터링 — **값 불변(회귀 0)**. 제품 동작 변경 없음.
- **작성 근거 소스**: `demo/neon-snake-fullscreen-0802/src/game.js`, `demo/neon-snake-fullscreen-0802/tests/game.test.js`

---

## 1. 목적 (Objective)

1인 스네이크 게임 루프의 **속도 관련 숫자 리터럴**을 단일 `SPEED_CONFIG` 객체로 추출한다.
현재 이 값들은 `src/game.js` §4에 4개의 개별 `export const`로 흩어져 있다. 이를 하나의 응집된 설정 객체로 모아 **속도 튜닝 지점을 한 곳에서 관리**할 수 있게 한다.

이 작업의 성공 기준은 **동작·값 완전 불변**이다. tick 간격, 가속 주기, 최소 속도 하한이 리팩터 전과 **숫자 하나까지 동일**해야 하며, 기존 테스트가 **수정 없이** 그대로 통과해야 한다.

---

## 2. 추출 대상 리터럴 · 현재 값 · 사용처

현재 정의 (`src/game.js` §4, 라인 10–13):

```js
export const INITIAL_STEP_MS = 140;
export const SPEED_STEP_MS_DECREMENT = 8;
export const MIN_STEP_MS = 60;
export const SPEED_UP_EVERY_N_FOODS = 3;
```

| 상수 | 현재 값 | 의미 | 정의 위치 |
|---|---|---|---|
| `INITIAL_STEP_MS` | `140` | 초기 tick 간격(ms). 값이 클수록 느림 = **최소 속도(가장 느린 시작 속도)** | `src/game.js:10` |
| `SPEED_STEP_MS_DECREMENT` | `8` | 가속 1레벨당 tick 간격 감소량(ms) = **속도 증가량** | `src/game.js:11` |
| `MIN_STEP_MS` | `60` | tick 간격 하한(ms) = **최대 속도 상한** (더 빨라지지 않음) | `src/game.js:12` |
| `SPEED_UP_EVERY_N_FOODS` | `3` | 먹이 N개마다 1레벨 가속 = **가속 주기** | `src/game.js:13` |

### 2.1 각 사용처 (전수)

| 사용처 라인 | 코드 | 사용 상수 |
|---|---|---|
| `src/game.js:63` | `stepMs: INITIAL_STEP_MS` (초기 state의 `stepMs`) | `INITIAL_STEP_MS` |
| `src/game.js:159` | `if (foodsEaten % SPEED_UP_EVERY_N_FOODS === 0)` | `SPEED_UP_EVERY_N_FOODS` |
| `src/game.js:161` | `stepMs = Math.max(MIN_STEP_MS, INITIAL_STEP_MS - speedLevel * SPEED_STEP_MS_DECREMENT)` | `MIN_STEP_MS`, `INITIAL_STEP_MS`, `SPEED_STEP_MS_DECREMENT` |
| `src/game.js:560–561` | `while (accumulator >= state.stepMs …) { accumulator -= state.stepMs; … }` | (상수 직접 미사용 — `state.stepMs` 경유) |

> **주의**: 게임 루프(라인 560–561)는 상수를 직접 참조하지 않고 런타임 `state.stepMs`를 읽는다. 따라서 이 부분은 **수정 대상이 아니다**. 추출은 §4 상수 정의부와 `step()`의 속도 재계산부(라인 63, 159, 161)에 한정된다.

### 2.2 범위 밖 (대상 아님)

- `MP_TICK_MS = 130` (`src/game.js:685`): **멀티플레이어(2인 로컬)** 고정 tick 상수. 1인 가속 로직과 무관하며 본 리팩터 대상이 **아니다**. 손대지 말 것.
- `GRID_COLS`, `GRID_ROWS`, `SCORE_PER_FOOD` 등 그 밖의 §4 상수: 속도와 무관 → 대상 아님.

---

## 3. SPEED_CONFIG 객체 배치 · 형태

### 3.1 배치 위치

`src/game.js` §4 상수 블록(현재 라인 10–13 자리)에 단일 `SPEED_CONFIG` 객체를 정의한다. 파일 상단 상수 구역을 유지하여 후속 독자가 기존과 동일한 위치에서 속도 설정을 찾도록 한다.

### 3.2 제안 형태 (developer 재량 — 값·키 매핑은 고정)

```js
// §4 속도 설정 (frozen 실행 설계 수치 — 값 불변)
export const SPEED_CONFIG = {
  initialStepMs: 140,        // 초기 tick 간격(ms) = 최소 속도
  stepMsDecrement: 8,        // 레벨당 tick 감소량(ms) = 속도 증가량
  minStepMs: 60,             // tick 간격 하한(ms) = 최대 속도
  speedUpEveryNFoods: 3,     // 먹이 N개마다 가속
};
```

### 3.3 기존 named export 보존 (필수 — 하위호환)

**기존 테스트(`tests/game.test.js`)가 named export를 직접 import 하므로**, 추출 후에도 아래 4개 export를 `SPEED_CONFIG`에서 파생한 alias로 **반드시 유지**한다:

```js
export const INITIAL_STEP_MS = SPEED_CONFIG.initialStepMs;
export const SPEED_STEP_MS_DECREMENT = SPEED_CONFIG.stepMsDecrement;
export const MIN_STEP_MS = SPEED_CONFIG.minStepMs;
export const SPEED_UP_EVERY_N_FOODS = SPEED_CONFIG.speedUpEveryNFoods;
```

> `tests/game.test.js:17–20`은 `INITIAL_STEP_MS`, `MIN_STEP_MS`, `SPEED_UP_EVERY_N_FOODS`를 import 한다. `SPEED_STEP_MS_DECREMENT`는 현재 test에서 import 하지 않으나(테스트는 리터럴 `8` 사용) 파일 내부에서 쓰이므로 export를 제거하지 말고 그대로 유지한다.
> 내부 사용처(라인 63, 159, 161)는 기존 상수명을 그대로 참조하거나 `SPEED_CONFIG.*`로 바꿔도 무방하다. **어느 쪽이든 값이 동일**하면 된다.

---

## 4. 사용자 시나리오

- **플레이어**로서 나는 먹이를 3개 먹을 때마다 뱀이 조금씩 빨라지길 기대한다. 리팩터 후에도 **가속 체감이 이전과 완전히 동일**해야 한다.
- **개발자**로서 나는 속도 튜닝 값을 조정할 때 파일 곳곳을 뒤지지 않고 `SPEED_CONFIG` 한 곳만 보면 되길 기대한다.

---

## 5. 수용 기준 (Acceptance Criteria — Given/When/Then)

### AC-1 · 초기 속도 불변
- **Given** 새 게임을 시작한 직후 초기 state
- **When** `createInitialState()`가 반환한 state의 `stepMs`를 확인하면
- **Then** `stepMs === 140` (`=== INITIAL_STEP_MS`) 이다.

### AC-2 · 가속 주기·증가량 불변
- **Given** 진행 중인 게임에서 먹이를 3개(=`SPEED_UP_EVERY_N_FOODS`) 먹었을 때
- **When** `step()`이 속도를 재계산하면
- **Then** `speedLevel`이 1 증가하고 `stepMs === 140 - 1*8 === 132` 이다.

### AC-3 · 최소 속도 하한 불변
- **Given** `speedLevel`이 충분히 높아 계산상 tick이 60ms 미만이 될 조건
- **When** `step()`이 `Math.max(MIN_STEP_MS, …)`로 하한을 적용하면
- **Then** `stepMs`는 `60`(`=== MIN_STEP_MS`) 아래로 내려가지 않는다.

### AC-4 · named export 하위호환
- **Given** 기존 테스트가 `INITIAL_STEP_MS`, `MIN_STEP_MS`, `SPEED_UP_EVERY_N_FOODS`를 import 하는 상태
- **When** 리팩터 후 `tests/game.test.js`를 **수정 없이** 실행하면
- **Then** 모든 import가 해석되고 각 값이 `140 / 60 / 3`으로 동일하다.

### AC-5 · 회귀 0
- **Given** 리팩터 전/후 `src/game.js`
- **When** `demo/neon-snake-fullscreen-0802/tests/` 전체 테스트를 실행하면
- **Then** 리팩터 전과 동일하게 **전부 통과**하며 실패·스킵이 새로 생기지 않는다.

---

## 6. 보존 영역 (Preservation — 수정 금지)

리팩터는 §4 속도 상수 정의부와 `step()`의 속도 재계산부에 **국한**한다. 아래는 **손대지 않는다**:

- **게임 규칙**: 이동/성장/꼬리 제거 로직 (`step()`의 §2.1 표 외 부분).
- **충돌 판정**: 벽 충돌(라인 138), 자기충돌(라인 146–150).
- **렌더링**: `render()`, canvas/그리드 계산, `axisOffset` 등.
- **입력 처리**: `setDirection()`, 키 핸들러.
- **게임 루프**: 라인 550–574의 accumulator 루프 (`state.stepMs`를 읽을 뿐 상수 미참조).
- **멀티플레이어 코드**: `MP_*` 상수 및 `stepMultiplayer` 전체.
- **기존 테스트 파일**: `tests/game.test.js`, `tests/cpu.test.js`, `tests/highscore.test.js`, `tests/viewport.test.js` — **read-only, 수정 금지**.

---

## 7. 회귀 검증 절차 (Verification)

> 테스트 범위: **focused** (`BRIX_TEST_SCOPE=focused`) — 대상 모듈 `demo/neon-snake-fullscreen-0802`만 검증. 다른 모듈 회귀는 CI가 별도 처리.

1. **값 불변 정적 확인**: `SPEED_CONFIG`의 4개 값이 `140 / 8 / 60 / 3`인지, 파생 named export가 각각 그 값과 일치하는지 눈으로 대조.
2. **full scope(모듈 내 전체) 회귀 테스트**: 대상 모듈 `tests/` 디렉터리 전체를 실행한다.
   ```bash
   cd demo/neon-snake-fullscreen-0802
   node --test tests/
   ```
   - 특히 `tests/game.test.js`의 속도 관련 케이스(초기 `stepMs`, "먹이 3개마다 speedLevel/stepMs", "`MIN_STEP_MS` 하한")가 통과해야 한다.
   - **종료 조건**: 리팩터 전 baseline과 동일하게 전 케이스 통과, 신규 실패·스킵 0.
3. **export 해석 확인**: `tests/game.test.js`의 `import { … INITIAL_STEP_MS, MIN_STEP_MS, SPEED_UP_EVERY_N_FOODS … }`가 오류 없이 해석됨(테스트 실행 자체가 이를 증명).

---

## 8. developer 실행 지침 요약 (frozen)

1. `src/game.js` §4에 `SPEED_CONFIG` 객체(값 `140/8/60/3`) 정의.
2. 기존 4개 named export를 `SPEED_CONFIG` 파생 alias로 유지 (§3.3).
3. 내부 사용처(라인 63, 159, 161)는 값 불변 유지 하에 자유롭게 상수명 또는 `SPEED_CONFIG.*` 참조.
4. 게임 루프·충돌·렌더·입력·MP·테스트 파일 **미수정** (§6).
5. `node --test tests/`로 회귀 0 확인 (§7).
