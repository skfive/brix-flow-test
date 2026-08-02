# 일시정지 입력 큐 수정 실행 설계 — BF-1519 / 설계 task BF-1522

- 상태: planner frozen 실행 계약 (executionProfile: implementation-strict, profile: standard)
- 대상 모듈: `demo/neon-snake-fullscreen-0802` (1인 네온 스네이크 순수 규칙 + 브라우저 런타임)
- 대상 파일(수정): `demo/neon-snake-fullscreen-0802/src/game.js`, `demo/neon-snake-fullscreen-0802/tests/game.test.js`
- 후속: developer(BF-1521) → reviewer → tester
- 불변 계약: developer 는 본 설계만 따르며 **기존 게임 규칙·tick 루프·충돌 판정·resize 동작을 변경하지 않는다.**

---

## 1. 배경 · 버그 정의

1인 스네이크에서 게임 진행 중(`running`) → 일시정지(`paused`) 상태로 전환한 뒤,
일시정지 동안 눌린 방향 입력(방향키/WASD/스와이프/터치패드)이 `nextDirection` 입력 버퍼에
적재되어 **재개(resume) 직후 첫 tick 에 "정지 직전 방향"이 아니라 "일시정지 중 눌린 방향"으로
뱀이 꺾이는** 회귀가 보고 대상이다.

특히 정지 직전 진행 방향의 **정반대** 입력이 버퍼되면, 재개 첫 tick 에 180° 반전으로 즉시
자기 몸 충돌(자살)이 발생할 수 있어 플레이 신뢰성을 해친다.

### 1.1 "입력 큐"의 정확한 의미

이 게임에는 다중 슬롯 큐가 없다. 입력은 상태의 **단일 슬롯 `nextDirection`** 에 커밋되고
`step` 이 매 tick 마다 `nextDirection` → `direction` 으로 확정한다(`src/game.js:132`).
따라서 "입력 큐 적재"란 **일시정지 중 입력이 `nextDirection` 슬롯을 덮어써서 재개 시 반영되는 것**을
가리킨다. 수정의 초점은 이 단일 버퍼가 `paused` 동안 절대 갱신되지 않도록 보장하는 것이다.

---

## 2. 현재 코드 정밀 분석 (base SHA 기준)

입력이 `nextDirection` 에 도달하는 경로와 현재 가드 상태:

| 계층 | 위치 | 현재 가드 |
| --- | --- | --- |
| 순수 규칙 | `setDirection` — `src/game.js:105-116` | `if (state.status !== 'running') return state;` → `paused` 에서 no-op |
| 런타임 키보드 | `onKeyDown` — `src/game.js:579-602` | 방향 라우팅이 `ready`/`running` 분기 안에만 있음. `paused` 는 어느 분기도 아님 → 무시 |
| 런타임 스와이프 | `onTouchEnd` — `src/game.js:609-628` | `if (state.status === 'running')` 안에서만 `setDirection` 호출(`625`) |
| 런타임 터치패드 | `onTouchPad` — `src/game.js:630-643` | `if (state.status === 'running')` 안에서만 `setDirection` 호출(`640`) |

`resumeGame`(`src/game.js:200-205`)은 `direction`/`nextDirection` 을 **보존**한 채 `status` 만
`running` 으로 되돌리므로, `nextDirection` 이 정지 시점 값 그대로면 재개 첫 tick 은 정지 직전
방향을 유지한다.

### 2.1 실제 결함: 불변식이 회귀 테스트로 고정되어 있지 않음

현재 커밋에서는 pure/runtime 두 계층 모두 가드가 존재한다. 그러나 **일시정지 중 입력 무시
불변식을 검증하는 테스트가 없다:**

- `setDirection 은 running 이 아니면 no-op 이다`(`tests/game.test.js:108-111`)는 `ready` 만
  검증하고 **`paused` 는 검증하지 않는다.**
- `pauseGame/resumeGame 왕복 후 ... 보존`(`tests/game.test.js:225-236`)은 pause→resume 사이에
  **입력이 없는** 상태 보존만 검증한다. "일시정지 중 입력 → 재개" 경로는 어디에서도 검증되지 않는다.

이 공백 때문에, `setDirection` 의 가드를 완화하는 리팩터(예: 조건을 `status === 'gameover'`
차단으로만 좁힘) 또는 `onKeyDown` 에서 방향 라우팅을 status 분기 밖으로 옮기는 변경이 들어오면
버그가 **조용히 재유입**되고 CI 가 잡지 못한다. 본 task 의 수정 범위는 이 불변식을
단일 진실 원천으로 확정하고 회귀 가드 테스트로 박제하는 것이다.

---

## 3. 사용자 시나리오

- US-1 (정상 재개): 플레이어가 오른쪽으로 진행 중 일시정지했다가 재개하면, 뱀은 **정지 직전 방향
  (오른쪽)** 으로 계속 진행한다.
- US-2 (일시정지 중 입력 무시): 플레이어가 일시정지 중 위/아래/왼쪽 등 어떤 방향키를 눌러도
  재개 시 그 입력은 무시되고 정지 직전 방향으로 진행한다.
- US-3 (역방향 자살 방지): 일시정지 중 정지 직전 방향의 정반대 입력을 눌러도 재개 첫 tick 에
  180° 반전이 발생하지 않는다(입력 자체가 버퍼되지 않으므로).

---

## 4. Acceptance Criteria (Given/When/Then)

### AC-1 — 일시정지 중 방향 입력은 `nextDirection` 을 갱신하지 않는다
- Given: `status === 'paused'` 이고 `nextDirection` 이 정지 직전 방향(예: `right`)인 상태
- When: `setDirection(state, dir)` 를 임의 방향 `dir`(정지 직전과 다른 방향 포함)으로 호출한다
- Then: 반환 상태의 `nextDirection` 은 변하지 않고, 반환 상태는 입력 상태와 동등하다(no-op).

### AC-2 — 재개 후 첫 tick 은 정지 직전 방향을 유지한다
- Given: `running` 에서 방향을 `up` 으로 확정(setDirection→step 으로 `direction==='up'`)한 뒤
  `pauseGame` 으로 일시정지하고, 일시정지 중 `setDirection` 으로 `left`(또는 `down`)를 시도한 상태
- When: `resumeGame` 후 `step` 을 1회 실행한다
- Then: 뱀 머리는 `up` 방향으로 1칸 이동하며, 일시정지 중 입력한 방향으로 꺾이지 않는다.

### AC-3 — 일시정지 중 역방향 입력이 재개 시 180° 반전을 유발하지 않는다
- Given: `direction === 'up'` 로 진행하다 일시정지한 상태
- When: 일시정지 중 `down`(정반대)을 입력하고 재개 후 `step` 을 실행한다
- Then: 뱀은 계속 `up` 으로 이동하고 자기 충돌(gameover)이 발생하지 않는다.

### AC-4 — 런타임 입력 핸들러는 `paused` 에서 방향 입력을 라우팅하지 않는다
- Given: 브라우저 런타임에서 `status === 'paused'`
- When: 방향키/WASD(`onKeyDown`), 스와이프(`onTouchEnd`), 터치패드(`onTouchPad`) 입력이 들어온다
- Then: 세 핸들러 모두 `setDirection` 을 호출하지 않는다(단일 진실 원천은 `setDirection` 의
  `status === 'running'` 가드이며, 런타임 핸들러는 이를 보조로 유지한다).

---

## 5. 수정 지점 · 조건 (developer 계약)

### 5.1 단일 진실 원천 — `setDirection`
- `setDirection`(`src/game.js:105-116`)의 **`status === 'running'` 에서만 `nextDirection` 을
  갱신하는 가드를 단일 진실 원천으로 유지/확정**한다. 이 가드가 "일시정지 상태에서 입력을 큐에
  넣지 않는 조건"이다. base 에서 이미 충족되어 있다면 로직 변경 없이 유지하고, 회귀 테스트로 고정한다.
- 가드를 `paused` 만 특별 차단하는 식으로 좁히지 말 것. `ready`/`paused`/`gameover` 모두에서
  no-op 이어야 한다(허용 커밋은 오직 `running`).

### 5.2 재개 후 방향 유지 규칙
- `resumeGame`(`src/game.js:200-205`)은 `direction`/`nextDirection` 을 **변경하지 않는다.**
  정지 시점의 `nextDirection` 이 재개 첫 tick 에 그대로 확정되므로, AC-1 로 `paused` 중 갱신이
  차단되면 재개 방향 유지는 자동으로 성립한다. `resumeGame` 에 방향 관련 로직을 추가하지 말 것.

### 5.3 런타임 입력 핸들러 (보조 가드)
- `onKeyDown`/`onTouchEnd`/`onTouchPad` 세 핸들러의 방향 라우팅이 `status === 'running'`
  분기 안에만 있도록 유지한다(현재 구조 유지). 방향 라우팅을 status 가드 밖으로 이동하지 말 것.

### 5.4 수정 최소성 (surgical)
- 위 가드가 base 에서 이미 성립하면 `src/game.js` 의 **런타임/규칙 로직 변경은 없거나 최소**이며,
  주 산출물은 `tests/game.test.js` 에 추가되는 §6 회귀 가드 테스트다.
- **금지**: `step`(tick 확정/이동), 벽·자기 충돌 판정(`src/game.js:137-150`), `reprojectState`/
  `resizeGame`(`305-343`), 속도/먹이 로직, 2인 멀티플레이 코드 경로는 손대지 않는다.

### 5.5 API·데이터 모델 변경
- **없음.** 공개 함수 시그니처(`setDirection`, `pauseGame`, `resumeGame`, `step`)와 상태
  스키마(`status`, `direction`, `nextDirection`, `snake`, `food` 등)는 그대로 유지된다.

---

## 6. 재현 · 회귀 테스트 전략 (focused, `tests/game.test.js`)

실행: `node --test demo/neon-snake-fullscreen-0802/tests/game.test.js` (BRIX_TEST_SCOPE=focused).
모두 순수 함수 단위 테스트이며 DOM/타이머에 의존하지 않는다. 아래 T1~T3 은 §2.1 결함(가드 완화)
변형에서 **실패**하고, 가드가 유지된 구현에서 **통과**하는 fail→fix→pass 회귀 가드다.

### T1 — 재현: 일시정지 중 방향 입력은 nextDirection 을 바꾸지 않는다 (AC-1)
- `running` 상태에서 `nextDirection === 'right'` 로 두고 `pauseGame` → `paused` 로 전환.
- `setDirection(paused, 'up')` 및 `setDirection(paused, 'down')` 각각 호출.
- 단언: 반환 `nextDirection === 'right'` 로 불변, 그리고 `deepEqual(result, paused)`(완전 no-op).
- 버그 변형(가드 완화)에서는 `nextDirection` 이 `'up'` 으로 바뀌어 실패한다.

### T2 — 재개 시나리오: 정지 직전 방향으로 첫 tick 이동 (AC-2)
- `startGame` 후 `setDirection('up')` → `step` 으로 `direction==='up'` 확정(먹이는 멀리 배치해
  섭취 간섭 제거).
- `pauseGame` → `paused` 상태에서 `setDirection('left')` 시도(무시되어야 함).
- `resumeGame` 후 `step` 1회.
- 단언: 머리가 이전 대비 `y-1`(up) 로 이동하고 `x` 불변, `status === 'running'`.

### T3 — 역방향 자살 방지 (AC-3)
- `direction==='up'` 로 진행하다 `pauseGame`.
- `paused` 상태에서 `setDirection('down')`(정반대) 시도 후 `resumeGame` → `step`.
- 단언: 여전히 `up` 으로 이동, `status === 'running'`(gameover 아님).

### 6.1 인접 흐름 불변 회귀 검증 (변경 없음 확인)
아래 기존 테스트가 그대로 통과해야 하며(회귀 없음), developer/tester 는 focused 실행에 포함한다.

- tick 루프: `ready 상태에서 step 은 no-op`(`299-302`), `gameover 후 step/setDirection no-op`
  (`175-179`), 먹이 섭취/성장/속도(`114-163`) — tick 확정·성장·속도 로직 불변.
- 충돌 판정: 벽 충돌 gameover(`166-173`), 자기 충돌 gameover(`182-201`), 꼬리 자리 이동 허용
  (`203-222`) — 충돌 규칙 불변.
- resize: `reprojectState`/`resizeGame` 상태 보존(뷰포트 테스트 `tests/viewport.test.js`) — 좌표
  재투영이 `status`/방향을 바꾸지 않음 확인.
- pause/resume 보존: 기존 `pauseGame/resumeGame 왕복 후 보존`(`225-236`) 유지.

### 6.2 edge case
- E-1: `ready` 에서 `setDirection` 은 여전히 no-op(기존 `108-111` 유지).
- E-2: `gameover` 에서 `setDirection` no-op(기존 `175-179` 유지) — 재개 대상 아님.
- E-3: 일시정지 중 동일 방향(정지 직전과 같은 방향) 입력도 no-op 이어야 하며 `nextDirection` 불변.
- E-4: 일시정지 중 유효하지 않은 방향 문자열 입력도 상태를 바꾸지 않는다.

---

## 7. developer 작업 순서 (요약)

1. §5 가드가 base 에서 성립하는지 확인 — 성립하면 규칙/런타임 로직 변경 없음.
2. `tests/game.test.js` 에 §6 T1~T3 회귀 가드 테스트를 additive 로 추가.
3. focused 테스트 실행으로 T1~T3 통과 + §6.1 기존 테스트 회귀 없음 확인.
4. 상태/시그니처/인접 규칙 무변경 확인 후 commit.
