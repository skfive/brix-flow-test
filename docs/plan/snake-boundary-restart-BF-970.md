# Snake 경계 충돌·재시작 상태 초기화 회귀 보강 명세 — BF-970

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-970(본 planner task) · 형제 task BF-972(designer) · BF-973(developer) · BF-975(tester)
> 대상 모듈: `phase18-games/snake/`(기존 구현, BF-925) — **신규 모듈 아님, 회귀 보강**
> 선행 SSOT: `phase18-games/snake/logic.js` 코드 주석이 지목하는 `docs/planning/phase18-snake-BF-923.md`(§3 상수·공식) — 본 문서는 그 SSOT의 값을 변경하지 않고, 회귀 가드가 비어 있는 지점만 특정한다.
> 개선 축 2개: ① 벽 충돌·자기 몸 충돌 게임오버 일관성(4방향 전체 + UI 레벨) ② 재시작 상태 초기화 완전성(점수·뱀·먹이·방향·대기 입력)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 task는 "범위 계약"이지 구현이 아니다:** File Ownership이 `docs/plan/snake-*.md`로 고정되어 있다. 코드(`phase18-games/snake/**`)는 BF-973(developer), 디자인(`docs/design/snake-*.md` 신규 topic)은 BF-972(designer)가 직접 작성한다. 본 문서는 "무엇을 어떤 기준으로 회귀 가드해야 하는지"만 확정한다.

**가정 2 — 이번 축은 "버그 수정"이 아니라 "이미 정상 동작하는 로직의 회귀 가드 공백 보완"이다:** `logic.js` 실측 결과, 벽 충돌(`isWallCollision`, 79~86행)은 4방향 모두 대칭적으로 판정되고, 자기 충돌(`isSelfCollision`, 90~98행)과 재시작 초기화(`createPlayState`/`createInitialState`, 119~151행)도 로직상 이미 올바르게 동작한다. 본 task가 다루는 것은 신규 로직 발명이 아니라, 아래 가정 4에서 실측한 **회귀 가드 공백**이다 — 향후 리팩터링 시 조용히 깨질 위험이 있는 지점을 테스트로 고정한다.

**가정 3 — context-widening 기록 (누적 2회, 예산 3회 이내):**
- `context-widening: docs/plan/*.md 기존 산출물 형식 확인 — candidateFiles(docs/plan/snake-*.md)에는 선례가 없어(신규 topic), 같은 디렉토리의 최신 형제 문서 docs/plan/pong-BF-959.md 1건을 열람해 §구성(가정→개선범위표→AC→edge case→nonGoals→API방향)을 재사용함. 신규 포맷 발명 대신 기존 컨벤션 재사용(Simplicity First).`
- `context-widening: 실제 회귀 테스트 커버리지 확인 — 계약 초안의 tests 패턴("tests/snake-*.test.js", "tests/e2e/snake/**")이 가리키는 파일들을 grep 한 결과, 그 파일들은 phase18-games/snake(BF-925, 본 task의 primary_module)와 무관한 **레거시/별도 Snake 구현**의 테스트였음(예: tests/snake-BF574-e2e.test.js 헤더 "BF-572 T3/T4-SWAP" — 다른 충돌 판정 이력). candidateFiles에 명시된 phase18-games/snake/** 의 실제 테스트는 tests/phase18-snake-BF925.test.js(unit) · tests/e2e/phase18-snake/render-play-direction-gameover.test.js(e2e) 임을 확인함(파일명이 "snake-" 접두 패턴과 다름). 이 2개 파일만 읽었고, 그 밖의 레거시 snake-BF* 테스트 본문은 열지 않음.`

**가정 4 — 실측 결과, 회귀 가드 공백이 4건 실재한다 (추측 아님):**

- **[GAP-1] 벽 충돌 4방향 중 1방향만 unit 커버리지 존재**: `tests/phase18-snake-BF925.test.js:289~301` "tick 벽 충돌: gameover + reason=wall" 케이스는 `direction:"right"`(우측 벽, x≥20)만 검증한다. `isWallCollision`(logic.js 79~86행)은 x<0·x≥20·y<0·y≥20 4개 조건을 대칭 판정하지만, 좌측(x<0)·상단(y<0)·하단(y≥20) 3방향은 unit 테스트로 고정된 적이 없다. e2e(`tests/e2e/phase18-snake/render-play-direction-gameover.test.js:349~396`)도 좌측 벽(자연 진행) 1건만 exercise한다.
- **[GAP-2] 자기 충돌 게임오버가 UI/e2e 레벨에서 전혀 검증되지 않음**: 자기 충돌은 `tests/phase18-snake-BF925.test.js:303~345`에서 순수 로직 단위로만 검증된다. `tests/e2e/phase18-snake/render-play-direction-gameover.test.js`(유일한 e2e 파일)는 STEP 6(349~396행)에서 `reason:'wall'`만 exercise하며, 자기 충돌 시 오버레이 문구("몸에 부딪혔어요", `main.js` REASON_TEXT 61~65행)·`btnPauseDisabled`·틱 루프 정지가 DOM에서 실제로 동일하게 성립하는지는 e2e로 확인된 적이 없다.
- **[GAP-3] 재시작 반환 상태(createPlayState/createInitialState)의 초기화 필드가 부분적으로만 unit 고정됨**: `tests/phase18-snake-BF925.test.js:374~380` "createPlayState: highScore 승계, score 0, status playing"은 `status`·`score`·`highScore`·`snake.length`·`food 존재`만 assert한다. `direction`(INITIAL_DIRECTION 승계 여부)·`pendingDirection`(null 리셋 여부)·`snake` 좌표(정확히 initial head 기준 일직선인지, length만이 아니라)·`gameoverReason`(null 리셋 여부)은 assert되지 않는다. `createInitialState`(119~133행, `toMenu()`가 사용)는 이 테스트 파일에서 아예 직접 검증되지 않는다(간접적으로 162~172행 "초기 상태" 테스트가 있으나 재시작 맥락이 아닌 최초 로드 맥락).
- **[GAP-4] main.js DOM 레벨 재시작 흐름(다시하기/재시작 버튼)이 e2e로 전혀 검증되지 않음**: 유일한 e2e 시나리오(`render-play-direction-gameover.test.js`)는 STEP 6 게임오버 확인에서 종료되며, `btnAgain`(다시하기, 33행)·`btnRestart`(하단 컨트롤 바 재시작, 36행)를 클릭해 스코어보드 DOM(`scoreEl`/`highScoreEl` 텍스트)이 "0"으로 복귀하는지, 오버레이가 다시 hidden되는지, 캔버스가 새 뱀 위치로 재렌더되는지는 확인된 적이 없다. 이는 본 task 수용 기준의 핵심("재시작 상태 초기화: 점수·뱀·먹이·방향")과 직결되는 미검증 지점이다.

**가정 5 — 물리 상수·상태 전이 공식은 변경하지 않는다:** `BOARD_COLS`/`BOARD_ROWS`(20×20)·`TICK_INTERVAL_MS`(150)·`INITIAL_SNAKE_LENGTH`(3)·`INITIAL_HEAD`({x:10,y:10})·`INITIAL_DIRECTION`("right")·`SCORE_PER_FOOD`(10) 등 `logic.js` 20~28행 상수는 SSOT로 불변 유지한다. 이번 축은 (a) 기존 대칭 로직 자체는 변경 없이 회귀 테스트로 고정, (b) `gameoverReason`별 UI 문구 매핑 일관성 확인, (c) 재시작 반환 상태의 필드별 계약 명문화에 한정된다.

**가정 6 — board-full(퍼펙트 클리어) 사유는 본 축의 1차 대상이 아니다:** `gameoverReason:"board-full"`(logic.js 220~236행)은 벽/자기 충돌과 별도 트리거 조건(먹이 재스폰 실패)을 가지므로 본 task 제목("벽 충돌·자기 몸 충돌")의 직접 대상이 아니다. 다만 §2.4 AC-INTEG-3에서 "재시작 계약은 gameoverReason 값과 무관하게 동일해야 한다"는 최소 확인만 포함한다(신규 로직 변경 없음).

---

## 1. 개선 범위 (to-be) 요약

| 축 | 현재 상태 (as-is, 실측) | 개선 목표 (to-be) |
|---|---|---|
| ① 벽 충돌 4방향 일관성 | `isWallCollision`은 4방향 대칭 판정(코드 정상), unit 테스트는 우측 1방향만 커버(GAP-1) | 로직 변경 없이 좌/우/상/하 4방향 전부 unit 회귀 가드 추가 |
| ① 자기 충돌 UI 일관성 | 로직 unit 테스트는 존재(정상), e2e/DOM 레벨 검증 0건(GAP-2) | 자기 충돌 게임오버가 wall과 동일한 UI 계약(오버레이 문구·틱 정지·버튼 상태)을 만족함을 e2e로 고정 |
| ② 재시작 상태 필드 완전성 | `createPlayState`/`createInitialState`는 direction/pendingDirection/snake 좌표/gameoverReason을 이미 올바르게 리셋(코드 정상), unit assert는 일부 필드만 존재(GAP-3) | 재시작 반환 상태 전체 필드(점수·뱀 좌표·먹이·방향·대기방향·사유)를 명시적으로 고정하는 unit 테스트 추가 |
| ② 재시작 DOM 동기화 | 로직 리셋은 정상이나 main.js가 이를 화면에 실제로 반영하는지 e2e 검증 0건(GAP-4) | "다시하기"/"재시작" 버튼 클릭 후 스코어보드·오버레이·캔버스가 초기 상태로 복귀함을 e2e로 고정 |

---

## 2. Acceptance Criteria (Given/When/Then)

### 2.1 벽 충돌 게임오버 — 4방향 일관성 (회귀 가드)

- **AC-WALL-1** Given `status=playing`, `direction=right`, 머리가 `x=19`에서 우측으로 한 칸 더 이동, When `tick`이 호출되면, Then `status=gameover`, `gameoverReason=wall`(기존 케이스, `tests/phase18-snake-BF925.test.js:289~301` 유지 확인용).
- **AC-WALL-2** Given `status=playing`, `direction=left`, 머리가 `x=0`에서 좌측으로 한 칸 더 이동(`x=-1`), When `tick`, Then 동일하게 `status=gameover`, `gameoverReason=wall`(신규 회귀 가드).
- **AC-WALL-3** Given `status=playing`, `direction=up`, 머리가 `y=0`에서 위로 한 칸 더 이동(`y=-1`), When `tick`, Then `status=gameover`, `gameoverReason=wall`(신규).
- **AC-WALL-4** Given `status=playing`, `direction=down`, 머리가 `y=19`에서 아래로 한 칸 더 이동(`y=20`), When `tick`, Then `status=gameover`, `gameoverReason=wall`(신규).
- **AC-WALL-5** Given 위 4방향 케이스 각각, When `gameover` 전이가 일어나면, Then 반환 상태의 `snake`는 충돌 직전(경계 밖으로 실제 push되지 않은) 값을 그대로 보존하고(`logic.js` 176~186행 반환 객체 계약), `direction`은 `effectiveDirection`(이번 틱에 적용된 방향)으로 갱신되며 `score`/`highScore`는 변하지 않는다.

### 2.2 자기 충돌 게임오버 — 로직·UI 일관성 (회귀 가드)

- **AC-SELF-1** Given 자기 몸으로 진입하는 머리 위치(기존 ㅁ자 몸 시나리오, `tests/phase18-snake-BF925.test.js:303~345`), When `tick`, Then `status=gameover`, `gameoverReason=self`(기존 케이스 유지 확인용).
- **AC-SELF-2** Given `growing=false`(먹이 섭취 아님), When 새 머리가 "이번 틱에 비워질 꼬리 셀"로 이동, Then 자기 충돌로 판정되지 않는다(`isSelfCollision`의 꼬리 vacate 규칙, 기존 로직 회귀 확인).
- **AC-SELF-3** Given 자기 충돌로 게임오버 전이가 실제 브라우저에서 발생, When 오버레이가 표시되면, Then wall 케이스와 동일한 UI 계약을 만족한다: `#overlay[data-state="gameover"]`, `overlay-reason` 텍스트에 "몸"이 포함(`main.js` REASON_TEXT.self="몸에 부딪혔어요"), `#btn-pause`가 `disabled`, 연속 두 시점 사이 `snake[0]` 좌표가 불변(틱 루프 정지) — **신규 e2e 시나리오**(GAP-2, 현재 e2e는 wall만 exercise).
- **AC-SELF-4** Given wall과 self 두 사유, When 각각 게임오버 문구가 렌더되면, Then 서로 다른 고유 문구를 노출하며 교차 노출(wall 사유인데 "몸" 문구 노출 등)이 없다.

### 2.3 재시작 상태 초기화 (점수·뱀·먹이·방향) — 회귀 가드

- **AC-RESTART-1** Given 임의의 `highScore` 값과 임의 상태(`gameover`/`paused`/`playing`), When `createPlayState(highScore, rand)`가 호출되면, Then 반환 상태는 다음을 모두 만족한다:
  - `status === "playing"`
  - `score === 0`
  - `highScore === (인자로 전달된 값)` (승계, 하락/초기화 없음)
  - `direction === INITIAL_DIRECTION`("right")
  - `pendingDirection === null`
  - `snake`가 `createInitialSnake()`와 동일한 좌표(`[{x:10,y:10},{x:9,y:10},{x:8,y:10}]`) — 길이만이 아니라 정확한 좌표
  - `gameoverReason === null`
  - `food`는 새 `snake` 좌표와 겹치지 않는 유효한 셀
- **AC-RESTART-2** Given 임의의 `highScore`, When `createInitialState(rand)`(메뉴 진입/최초 로드)가 호출되면, Then `status === "start"`이고 그 외 필드(`direction`/`pendingDirection`/`snake`/`gameoverReason`/`food` 유효성)는 AC-RESTART-1과 동일한 초기값 계약을 만족한다(단 `highScore`는 `createInitialState` 자체는 0이며, `toMenu()` 호출부(`main.js` 106~114행)가 이전 `highScore`를 별도로 덮어써 승계함).
- **AC-RESTART-3** Given `status=gameover`이고 화면에 오버레이가 노출된 상태, When 사용자가 "다시하기"(`#btn-again`)를 클릭하면, Then DOM이 즉시 초기 상태로 동기화된다: `[data-role="score"]`의 텍스트가 `"0"`, `#overlay`가 `hidden` 속성 보유, `#overlay`의 `data-state`가 더 이상 `"gameover"`가 아님, `#btn-pause`가 `disabled`가 아님(재생 재개). **신규 e2e 시나리오**(GAP-4).
- **AC-RESTART-4** Given `status`가 `playing`/`paused`/`gameover` 중 아무 값, When 하단 컨트롤 바 "재시작"(`#btn-restart`)을 클릭하면(`status==="start"`일 때만 no-op, `main.js` 380~382행), Then AC-RESTART-1과 동일한 상태 초기화 계약이 성립하고 틱 루프가 즉시 재개된다(`startTicking()` 호출).
- **AC-RESTART-5** Given 게임오버 직전 마지막 키 입력이 `pendingDirection`에 큐잉되어 있던 상태(예: 벽 충돌 프레임에 동시에 새 방향 입력), When 재시작(`createPlayState`/`createInitialState` 어느 경로든)이 일어나면, Then 새 상태의 `pendingDirection`은 반드시 `null`이며 이전 게임의 대기 입력이 새 게임 첫 틱에 소비되지 않는다.

### 2.4 통합 일관성 (벽 vs 자기충돌 vs 재시작 조합)

- **AC-INTEG-1** Given 벽 충돌로 게임오버 후 "다시하기"로 재시작, When 새 게임에서 동일한 방식(같은 방향으로 직진)으로 다시 벽에 도달하면, Then 다시 `gameoverReason=wall`이 정상 재현된다(이전 게임 상태 잔존으로 인한 오탐·조기 게임오버·미판정 없음).
- **AC-INTEG-2** Given 자기 충돌로 게임오버 후 재시작, When 새 게임 시작 직후 첫 틱이 진행되면, Then 초기 3칸 직선 뱀(`INITIAL_DIRECTION="right"`가 몸에서 멀어지는 방향)은 자기 충돌이 발생하지 않는다(재시작 직후 즉시 게임오버되는 회귀 없음).
- **AC-INTEG-3** Given `gameoverReason`이 `wall`/`self`/`board-full` 중 어느 값이었더라도, When 재시작이 일어나면, Then §2.3의 초기화 계약(AC-RESTART-1~5)은 사유와 무관하게 동일하게 적용된다(사유별 분기 없음 — 재시작 로직은 `gameoverReason`을 참조하지 않으므로 자동 충족, 회귀 고정용).

---

## 3. Edge Case / 실패 케이스

| # | 시나리오 | 기대 동작 |
|---|---|---|
| E1 | 뱀이 코너(`(0,0)`, `(19,0)`, `(0,19)`, `(19,19)` 인근)에서 벽으로 진입 | 진입 방향과 무관하게 해당 축의 경계 조건만으로 `wall` 판정(대각선 판정 없음 — `isWallCollision`은 축별 독립 판정) |
| E2 | "다시하기"/"재시작" 버튼을 빠르게 연타(더블 클릭) | `startTicking()`의 `tickTimer !== null` 가드(`main.js` 73~76행)로 틱 타이머가 중복 생성되지 않음 — 두 번째 클릭도 `createPlayState`를 다시 호출하지만 새 타이머는 1개만 유지 |
| E3 | 일시정지(`paused`) 중 하단 "재시작" 버튼 클릭 | 정상적으로 §2.3 초기화 계약 성립 + `playing`으로 전이(일시정지 상태에서도 재시작 가능해야 함, AC-RESTART-4 범위) |
| E4 | 재시작 직후 사용자가 즉시 반대 방향 키 입력 | `isValidTurn`이 `snakeLength>1`이면 정반대 전환을 무시하므로(§11.1 원본 근거) 재시작 직후에도 즉시 반전에 의한 자기 충돌이 발생하지 않음 |
| E5 | `board-full`(퍼펙트 클리어) 사유로 게임오버 후 재시작 | §2.4 AC-INTEG-3 — 다른 사유와 동일한 초기화 계약 적용, 사유별 특수 처리 없음(비대상 §4 참고) |
| E6 | 게임오버 오버레이가 열려 `overlayTitle.focus()`가 호출된 직후 "다시하기" 클릭 | 포커스가 새로 열리는 화면(재생 중이면 오버레이 자체가 hidden)으로 자연 이동, 포커스 트랩이나 스크립트 오류 없음(`main.js` `syncUi()` 178~181행 흐름 재확인용) |

---

## 4. 비대상 (nonGoals)

- `logic.js`의 물리 상수·공식(보드 크기·틱 간격·초기 뱀 길이·점수 공식) 변경 — 불변 유지(§0 가정 5).
- `gameoverReason="board-full"`(퍼펙트 클리어) 트리거 조건·로직 자체 변경 — 본 축은 재시작 계약이 사유와 무관하게 동일함만 확인(§0 가정 6, AC-INTEG-3).
- 새로운 게임오버 사유 추가, 또는 기존 3종(`wall`/`self`/`board-full`) 외 판정 로직 신설.
- D-pad/키보드 입력 처리 자체 변경(`onKeyDown`/`bindDpad`) — 기존 그대로 보존, 재시작 후에도 정상 동작함(E4)만 확인 대상.
- 사운드·파티클 등 시각/청각 연출 추가.
- `docs/design/snake-*.md`(디자인 토큰·오버레이 스타일) 신규 변경 — designer(BF-972) 담당.
- `phase18-games/snake/**` 실제 코드 수정 — developer(BF-973) 담당. 본 문서는 "무엇을 어떤 기준으로" 고정할지만 정의.
- `phase18-games/{pong,simon-says,memory-match,breakout}/**`, 저장소 최상위 개별 게임/앱, 레거시 root-level Snake 구현(`tests/snake-BF5xx*.test.js` 등이 검증하는 별도 모듈) — 전부 본 task와 무관, 수정 금지.
- `src/**`, `package.json`, `package-lock.json`, `.github/**`, `prisma/**` — 공용 런타임/의존성/CI/인증.

---

## 5. 데이터 모델 / 계약 고정 (dev·tester 재량 허용, 값만 고정)

본 축은 신규 API/데이터 모델이 없다(순수 상태 리셋 계약 명문화). `logic.js`의 상태 shape은 §4 nonGoals대로 불변이며, 아래는 재시작 시 각 필드가 반드시 만족해야 하는 값을 표로 고정한다(developer가 회귀 테스트를 작성할 때 참조).

### 5.1 `createPlayState(highScore, rand)` / `createInitialState(rand)` 반환 계약

| 필드 | `createPlayState` 기대값 | `createInitialState` 기대값 |
|---|---|---|
| `status` | `"playing"` | `"start"` |
| `score` | `0` | `0` |
| `highScore` | 인자값 그대로 승계 | `0`(호출부 `toMenu()`가 별도 승계, §AC-RESTART-2) |
| `direction` | `INITIAL_DIRECTION`("right") | `INITIAL_DIRECTION`("right") |
| `pendingDirection` | `null` | `null` |
| `snake` | `[{x:10,y:10},{x:9,y:10},{x:8,y:10}]` (좌표 정확히 일치) | 동일 |
| `gameoverReason` | `null` | `null` |
| `food` | `snake`와 겹치지 않는 유효 셀 | 동일 |

### 5.2 재시작 트리거별 DOM 동기화 계약 (main.js, GAP-4)

| 트리거 | 코드 위치 | 호출 함수 | 사전 조건 |
|---|---|---|---|
| "다시하기" 버튼 | `#btn-again` (main.js 33, 377행) | `startGame()` → `createPlayState` | `status=gameover`에서만 노출 |
| 하단 "재시작" 버튼 | `#btn-restart` (main.js 36, 380~382행) | `startGame()` → `createPlayState` | `status !== "start"`일 때만 동작 |
| "메뉴로" 버튼 | `#btn-menu` (main.js 34, 378행) | `toMenu()` → `createInitialState` + `highScore` 승계 | `status`가 `paused`/`gameover`일 때만 노출 |

`startGame()`/`toMenu()` 호출 후 공통으로 `syncUi()`(오버레이·버튼 노출·스코어보드 텍스트 갱신)와 `render()`(캔버스 재렌더)가 즉시 실행되어야 한다(`main.js` 98~114행) — 이 두 함수 호출이 실제로 스코어보드 DOM 텍스트를 `"0"`으로, 오버레이를 `hidden`으로 되돌리는지가 AC-RESTART-3/4의 검증 대상이다.

---

## 6. 회귀 테스트 제안 위치 (tester/developer 참고용 — 본 문서는 작성하지 않음)

- **unit**: `tests/phase18-snake-BF925.test.js` — AC-WALL-2~5(좌/상/하 벽), AC-RESTART-1/2/5(재시작 필드 전체 assert), AC-INTEG-2(재시작 직후 무충돌) 추가 위치로 적합(기존 `playState()` 헬퍼, 289~380행 인근 재사용).
- **e2e**: `tests/e2e/phase18-snake/render-play-direction-gameover.test.js`에 STEP 8 이후로 이어 붙이거나, 재시작 전용 신규 e2e 파일(`tests/e2e/phase18-snake/restart-*.test.js`) — AC-SELF-3(자기충돌 UI), AC-RESTART-3/4(다시하기/재시작 버튼 DOM 동기화) 대상. 기존 결정론 훅(`window.__brixSnakeState`, 199~236행)을 자기 충돌 시나리오에도 재사용 가능(먹이를 특정 위치에 고정해 뱀을 자기 몸으로 유도).
