# Snake 아케이드(Phase 18) 게임 규칙·상태·수용 기준·보존 영역 명세 — BF-923

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-923 (본 planner task — File Ownership 원문 `docs/planning/**`)
> 대상 라우트: `/phase18-games/snake` (= `phase18-games/snake/`, 신규 디렉터리)
> 페이지 타이틀: "Snake 아케이드"
> tech-stack 태그: `vanilla-static` (외부 프레임워크·번들러 없음, 저장소 실질 스택과 일치)
> 신규 module: `phase18-snake` — 기존 `snake`(루트) module과 이름 충돌 방지(§0 가정 2)
> 단위 테스트(예정, 후속 task): `node --test tests/phase18-snake-*.test.js` (focused scope · module: `phase18-snake`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑, `phase18-games/` 기존 선례 그대로 적용:** task 설명이 라우트를 `/phase18-games/snake`로 이미 명시했다. 저장소 최상위에는 실제 라우터가 없고(`package.json` `name: notepad-spa`), 동일 컨테이너 아래 `phase18-games/pong/`(BF-910~915)·`phase18-games/memory-match/`(BF-916~919)가 이미 구현되어 있다(커밋 `489a80e`, `959f5d5` 확인). 본 게임도 동일 관례로 **`phase18-games/snake/`**(저장소 최상위, `pong/`·`memory-match/`와 형제 디렉터리)에 신설한다.

**가정 2 — module명 = `phase18-snake`(루트 `snake`와 명시적으로 분리):** 저장소에는 이미 `snake/`(루트, BF-504 계열)라는 완전히 별개의 대형 Pixi 기반 게임이 존재하고, 그 테스트만 `tests/snake-BF504.test.js` ~ `tests/snake-BF874-e2e.test.js`까지 **30개 이상** 존재한다(실측: `find tests -iname "*snake*"`). 만약 본 신규 게임의 module명도 `snake`로 두면 ① 신규 테스트 파일명이 `tests/snake-BF923.test.js` 형태로 기존 루트 snake 테스트 네이밍 패턴과 뒤섞여 두 게임의 테스트를 구분할 수 없고, ② `pnpm test:snake`류 스크립트가 어느 게임을 가리키는지 모호해진다. 따라서 module명을 **`phase18-snake`**로 확정하고, 이후 모든 파일 컨벤션(테스트 접두사·문서 topic·검증 커맨드)에 일관 적용한다(§12, TEST_SCOPE_POLICY의 `node --test tests/phase18-snake-*.test.js`, `primary_module: phase18-snake`와 일치).

**가정 3 — 전량 신규(forward) 설계, 루트 `snake/`와 코드·로직 공유 없음:** 루트 `snake/`(`game.js` 3481줄 + `logic.js` 1935줄)는 전체화면 캔버스, CPU AI, 아이템/버프, 이펙트, HUD, 경쟁 모드 등 매우 방대한 기능을 갖춘 별개 게임이다(`docs/design/snake-*.md` 10여 건, `docs/spec/snake-*.md` 4건 참조). Epic 설명은 "게임 루프(이동·먹이·성장·충돌·게임오버)·점수/최고 점수·20x20 보드·360px 방향 컨트롤"만 요구하며 아이템·이펙트·CPU AI·경쟁 모드는 언급하지 않는다. 본 문서는 **클래식 Snake 규칙만** 처음부터 정의하며(Simplicity First), 루트 `snake/`의 코드·상수·상태 모델을 재사용하거나 참조 구현으로 삼지 않는다 — 두 게임은 완전히 독립적인 구현이다(§7 보존 영역).

**가정 4 — "점수/최고 점수(브라우저 메모리)" = 세션 in-memory 전용, `localStorage` 미사용:** `pong-BF-910.md`(§0 가정 5)·`dice-4-BF-897.md`(§0 가정 3)가 확립한 동일 해석을 따른다. 추가로 루트 `snake/`의 `highScore` 처리를 실측한 결과(`snake/index.html` `createInitialState(cols, rows, highScore, settings)`, `SNAKE_SETTINGS_LS_KEY`는 설정값만 `localStorage`에 저장하고 `highScore` 자체는 저장하지 않음), 루트 게임조차 최고 점수를 세션 in-memory로만 다룬다 — 본 게임도 동일하게 최고 점수를 JS 변수로만 유지하고 새로고침 시 초기화되는 것으로 확정한다(§4, §6).

**가정 5 — 벽 충돌 = 게임오버(랩어라운드 없음):** Epic 원문에 벽을 통과해 반대편으로 나오는 "랩어라운드" 요구가 없다. 클래식 아케이드 Snake의 표준 규칙(벽 = 즉시 게임오버)을 채택하고, 추측성 확장을 하지 않는다(§3.4, §11).

**가정 6 — 먹이 1개당 점수 = 10점 고정:** Epic 원문에 정확한 점수 공식이 없어 임의의 고정 상수(`SCORE_PER_FOOD = 10`)를 채택한다(§4.1). 운영자가 다른 값을 원하면 본 문서 개정 필요(§14-2).

**가정 7 — 이동 속도 = 고정 틱(150ms), 레벨/가속 시스템 없음:** Epic 원문에 속도 증가 요구가 없다. 루트 `snake/`는 "속도 레벨" HUD를 갖고 있지만(`hud-speed-level`), 이는 §7 보존 영역이 명시하는 루트 게임 고유 기능이며 본 신규 게임에 이식하지 않는다(Simplicity First). 고정 `TICK_INTERVAL_MS = 150`으로 확정한다(§3.2, §11).

**가정 8 — 파일 소유권 및 파일명 근거:** 본 task(BF-923)의 담당 파일은 `docs/planning/phase18-snake-BF-923.md` 1개뿐이다(RUN_CONTEXT `owned_paths: docs/planning/**` 명시). 이번 세션에는 별도의 상위 Epic 티켓 번호가 제공되지 않았고(RUN_CONTEXT `dependency: jira=미제공`) 현재 작업 자체가 BF-923로 직접 지정되었으므로, 선례 문서(`pong-BF-910.md`가 Epic 번호를, planner task는 별도 번호였던 것)와 달리 **본 task의 티켓 번호(BF-923)를 그대로 파일명에 사용**한다(PERSONA_VERSION_PROMPT의 "JIRA-KEY 는 본 planner task" 규칙을 문자 그대로 적용). `phase18-games/snake/*` 코드, `docs/design/*` 디자인 문서, `tests/phase18-snake-*.test.js`는 후속 designer/dev/tester task 담당 영역이며 본 task에서 생성·수정하지 않는다.

**가정 9 — Jira/GitHub 도구 미할당(운영자 확인 불필요, worker가 처리):** RUN_CAPABILITY_MANIFEST에 `assigned_mcp_servers: (none)`으로 명시되어 있고, Jira 코멘트·PR 생성/머지 등은 `worker_brokered_lifecycle_writes`로 시스템이 본 문서의 최종 출력(커밋 + 이 메시지)을 근거로 멱등적으로 처리한다. 따라서 본 문서 내 §14-1(산출물 위치)과 이 세션의 마지막 메시지 요약이 Jira 코멘트·PR 본문의 원천이 된다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 보드·이동·먹이·성장·충돌](#3-게임-규칙--보드이동먹이성장충돌)
4. [점수·최고 점수](#4-점수최고-점수)
5. [입력 모델 — 키보드 + 360px 방향 컨트롤](#5-입력-모델--키보드--360px-방향-컨트롤)
6. [상태 모델 — 브라우저 메모리, 상태 전이](#6-상태-모델--브라우저-메모리-상태-전이)
7. [보존 영역 — 기존 루트 snake·타 phase18 게임 불변](#7-보존-영역--기존-루트-snake타-phase18-게임-불변)
8. [화면 구성 요구사항 (반응형 360px)](#8-화면-구성-요구사항-반응형-360px)
9. [외부 의존성 배제 확인](#9-외부-의존성-배제-확인)
10. [Acceptance Criteria 매핑 (Given/When/Then)](#10-acceptance-criteria-매핑-givenwhenthen)
11. [Edge Case 및 실패 케이스 목록](#11-edge-case-및-실패-케이스-목록)
12. [비범위 (Out of Scope)](#12-비범위-out-of-scope)
13. [파일 구조 및 기술 제약](#13-파일-구조-및-기술-제약)
14. [산출물 위치 및 참조 표 / 남은 모호함](#14-산출물-위치-및-참조-표--남은-모호함)

---

## 1. 개요

### 1.1 목적

`/phase18-games/snake`는 신규 module `phase18-snake`의 최초 항목으로, 클래식 Snake(뱀 게임)를 결정론적 격자 이동 규칙과 명확한 상태 전이로 구현 가능하게 하는 기획 SSOT다. 게임 루프(이동·먹이·성장·충돌·게임오버), 점수/최고 점수(브라우저 메모리), 20×20 보드, 360px 방향 컨트롤을 후속 designer(mockup)·dev(구현)·tester(E2E)가 동일한 기준으로 다룰 수 있도록 문서화하고, 기존 루트 `snake/`·타 phase18 게임을 건드리지 않는 보존 영역을 명시한다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-games/snake/`(`index.html`/`styles.css`/`logic.js`/`main.js`) — §0 가정 1, §13 |
| 게임 모드 | 1인용, 클래식 격자 이동 Snake — §3 |
| 보드 | 20 × 20 셀(고정, Epic 명시) — §3.1 |
| 게임 루프 | §3 — 이동·먹이 스폰·성장·충돌(벽/자기 몸)·게임오버, 고정 틱 150ms |
| 점수·최고 점수 | §4 — 먹이 1개당 10점, 세션 in-memory 최고 점수 |
| 입력 | §5 — 키보드(방향키/WASD) + 360px 온스크린 방향 컨트롤(D-pad) |
| 상태 영속화 | 없음 — 브라우저 메모리(JS 변수)에만 존재, 새로고침 시 초기화(§0 가정 4, §6) |
| 보존 영역 | §7 — 루트 `snake/`, `phase18-games/pong/`·`phase18-games/memory-match/` 등 기존 코드/문서/테스트 불변 |
| 외부 의존성 | 없음 — 네트워크 요청·외부 라이브러리·서버 API·DB 0건(§9) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전, Pointer Events 지원) 또는 Node.js(`node --test`)로 순수 함수(이동·충돌·먹이 스폰 로직) 단위 테스트
- `phase18-games/snake/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 렌더링은 `<canvas>` 2D context 사용을 전제로 좌표계를 설계한다(§3.1) — 렌더링 기술 자체(canvas vs DOM grid) 선택은 dev 재량으로 열어둘 수 있으나, 격자 좌표계·상수(§3, §4)는 렌더링 방식과 무관하게 그대로 지켜야 한다.
- `file://` 프로토콜(로컬 파일 직접 열기)로도 정상 동작해야 한다(저장소 vanilla-static 전제, §9).

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 보드(Board) | 게임이 벌어지는 20×20 격자. 각 셀은 `(x, y)` 정수 좌표(`0 ≤ x,y ≤ 19`)로 식별 |
| 뱀(Snake) | 격자 셀들의 순서 배열. `snake[0]`이 머리(head), 마지막 요소가 꼬리(tail) |
| 방향(Direction) | 뱀이 다음 틱에 이동할 방향. `'up' \| 'down' \| 'left' \| 'right'` 4방향만 존재(대각선 없음) |
| 틱(Tick) | 게임 루프의 최소 이동 단위 시간(150ms 고정, §3.2). 매 틱마다 뱀이 정확히 1칸 이동 |
| 먹이(Food) | 보드 위 임의의 빈 셀에 위치하는 목표물. 뱀 머리가 닿으면 소비되고 즉시 재스폰 |
| 성장(Growth) | 먹이를 먹었을 때 꼬리를 제거하지 않아 뱀 길이가 1 증가하는 것 |
| 충돌(Collision) | 뱀 머리가 벽 경계를 벗어나거나(벽 충돌) 자기 몸 셀과 겹치는 것(자기 충돌) — 즉시 게임오버 |
| 최고 점수(High Score) | 현재 브라우저 탭 세션 동안 기록된 가장 높은 점수(§4.2) |

---

## 3. 게임 규칙 — 보드·이동·먹이·성장·충돌

### 3.1 좌표계 및 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `BOARD_COLS` | `20` | 보드 가로 셀 수(Epic 명시, 20×20 보드) |
| `BOARD_ROWS` | `20` | 보드 세로 셀 수(Epic 명시) |
| `CELL_SIZE` | `20` (논리 px) | 셀 1개의 논리 크기 — `BOARD_COLS × CELL_SIZE = 400`, `<canvas width="400" height="400">`로 정확히 나누어떨어짐 |
| `TICK_INTERVAL_MS` | `150` | 뱀이 1칸 이동하는 주기(§0 가정 7, 고정, 가속 없음) |
| `INITIAL_SNAKE_LENGTH` | `3` | 게임 시작 시 뱀 길이 |
| `INITIAL_HEAD` | `{x:10, y:10}` | 시작 머리 위치(보드 중앙 부근) |
| `INITIAL_DIRECTION` | `'right'` | 시작 이동 방향 |
| `SCORE_PER_FOOD` | `10` | 먹이 1개당 점수(§0 가정 6) |

좌표계: 원점 `(0,0)`은 보드 좌상단 셀. `x`는 열(0~19, 좌→우), `y`는 행(0~19, 상→하). 방향 벡터:

```
DIRECTION_VECTORS = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}
```

### 3.2 초기 상태 구성

```
initialSnake = [
  { x: 10, y: 10 },  // head
  { x: 9,  y: 10 },
  { x: 8,  y: 10 },  // tail
]
initialDirection = 'right'
```

- 뱀은 항상 몸이 이어진 일직선으로 시작하며, 시작 방향은 머리가 몸에서 "멀어지는" 방향(`right`)으로 고정한다 — 시작하자마자 자기 충돌이 발생하지 않도록 보장.
- 초기 먹이 위치는 `initialSnake`가 점유한 3개 셀을 제외한 397개 빈 셀 중 무작위 1개(§3.5 `spawnFood` 동일 알고리즘 사용).

### 3.3 게임 루프(틱) — 이동·성장·충돌 판정 순서

매 `TICK_INTERVAL_MS(150ms)`마다, `status === 'playing'`일 때만 다음을 순서대로 수행한다(순수 함수 `tick(state) → newState`로 구현):

```
1. effectiveDirection = isValidTurn(state.pendingDirection, state.direction, state.snake.length)
                         ? state.pendingDirection
                         : state.direction
   // 방향 확정은 "틱 적용 시점"에 현재 direction과 비교(§11.1 — 빠른 연속 입력으로 인한
   // 즉시 반전 버그 방지)

2. vec = DIRECTION_VECTORS[effectiveDirection]
   newHead = { x: state.snake[0].x + vec.dx, y: state.snake[0].y + vec.dy }

3. if (isWallCollision(newHead)) → status = 'gameover', gameoverReason = 'wall', 종료
   // §3.4

4. growing = (newHead.x === state.food.x && newHead.y === state.food.y)

5. if (isSelfCollision(state.snake, newHead, growing)) → status = 'gameover', gameoverReason = 'self', 종료
   // §3.4 — growing 여부에 따라 꼬리 셀 포함/제외가 달라짐(§11.3)

6. newSnake = [newHead, ...state.snake] (머리 추가)
   if (!growing) newSnake.pop()  // 성장이 아니면 꼬리 제거(제자리 이동)

7. if (growing) {
     newScore = state.score + SCORE_PER_FOOD
     newFood  = spawnFood(newSnake, state.board)   // §3.5
     if (newFood === null) → status = 'gameover', gameoverReason = 'board-full', 종료  // §11.4
   } else {
     newScore = state.score
     newFood  = state.food
   }

8. newHighScore = Math.max(state.highScore, newScore)

9. return { ...state, snake: newSnake, direction: effectiveDirection, pendingDirection: null,
            food: newFood, score: newScore, highScore: newHighScore }
```

### 3.4 충돌 판정

**벽 충돌** — 랩어라운드 없음(§0 가정 5):

```
function isWallCollision(head) {
  return head.x < 0 || head.x >= BOARD_COLS || head.y < 0 || head.y >= BOARD_ROWS
}
```

**자기 충돌** — 꼬리 vacate 규칙 포함(§11.3 상세):

```
function isSelfCollision(snake, newHead, growing) {
  const bodyToCheck = growing ? snake : snake.slice(0, -1)
  // growing이 아니면 꼬리 셀은 이번 틱에 비워지므로 충돌 대상에서 제외
  return bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)
}
```

### 3.5 먹이 스폰 (`spawnFood`)

```
function spawnFood(snake, board) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
  const freeCells = []
  for (let y = 0; y < board.rows; y++)
    for (let x = 0; x < board.cols; x++)
      if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y })
  if (freeCells.length === 0) return null   // 보드가 뱀으로 가득 참(§11.4)
  return freeCells[Math.floor(Math.random() * freeCells.length)]
}
```

- 빈 셀 목록을 전수 구성한 뒤 그 중 무작위 인덱스를 뽑는 방식(rejection-sampling 아님)으로, 보드가 거의 가득 찬 상태에서도 무한 루프 없이 결정적으로 종료한다(§11.4).
- 먹이는 뱀 몸 셀과 절대 겹치지 않는다(구성 자체가 `occupied` 제외 집합에서 뽑음).

### 3.6 방향 전환 유효성 검사 (`isValidTurn`)

```
function isOpposite(a, b) {
  return (a === 'up' && b === 'down') || (a === 'down' && b === 'up') ||
         (a === 'left' && b === 'right') || (a === 'right' && b === 'left')
}

function isValidTurn(pendingDirection, currentDirection, snakeLength) {
  if (pendingDirection === null) return false
  if (snakeLength === 1) return true   // 몸이 없으면 즉시 반전도 허용
  return !isOpposite(pendingDirection, currentDirection)
}
```

- 뱀 길이가 2 이상일 때, 현재 진행 방향의 정반대 방향으로는 전환할 수 없다(자기 목으로 즉시 돌진 방지) — 표준 클래식 Snake 규칙.
- 대각선 이동·정지(같은 방향 유지 외 "이동 안 함") 상태는 없다 — 매 틱 반드시 1칸 이동.

---

## 4. 점수·최고 점수

### 4.1 점수 계산

- 먹이 1개를 먹을 때마다 `score += SCORE_PER_FOOD(10)`(§3.3 step 7).
- 게임오버·재시작 시 `score`는 `0`으로 리셋된다.
- 점수는 정수이며 감소하지 않는다(패널티 없음 — Epic 원문에 감점 요구 없음, §12).

### 4.2 최고 점수 (세션 in-memory, §0 가정 4)

- `highScore`는 `Math.max(highScore, score)`로 매 틱(성장 시) 및 게임오버 시점에 갱신된다(§3.3 step 8).
- **같은 브라우저 탭 세션** 내에서는 재시작(`gameover → playing`)을 여러 번 반복해도 `highScore`는 유지·갱신된다(리셋되지 않음) — `score`만 매 게임마다 초기화된다.
- 페이지를 새로고침하거나 닫으면 `highScore`를 포함한 모든 상태가 완전히 소실된다(`localStorage`/`sessionStorage` 등 영속 저장소 사용 안 함, §0 가정 4, §9) — 결함이 아니라 "브라우저 메모리 상태 모델"의 명시적 정의다.

---

## 5. 입력 모델 — 키보드 + 360px 방향 컨트롤

### 5.1 통합 조작 원칙

방향 입력은 **키보드**와 **360px 온스크린 D-pad(터치/마우스 클릭)** 두 경로로 발생할 수 있으며, 둘 다 동일하게 `state.pendingDirection`을 갱신한다(§3.3 step 1에서 다음 틱에 적용). 입력 버퍼는 슬롯 1개만 유지하며, 한 틱 안에 여러 입력이 들어오면 마지막 입력만 `pendingDirection`에 남는다 — 단, 실제 반영 여부(유효성 검사)는 **틱 적용 시점**에 그 시점의 `direction`과 비교해 결정하므로(§3.6), 짧은 시간에 연속 입력이 들어와도 자기 목으로 반전하는 결과는 나오지 않는다(§11.1).

### 5.2 키보드 조작 (데스크톱/접근성)

| 키 | 동작 |
|---|---|
| `ArrowUp` / `W` | `pendingDirection = 'up'` |
| `ArrowDown` / `S` | `pendingDirection = 'down'` |
| `ArrowLeft` / `A` | `pendingDirection = 'left'` |
| `ArrowRight` / `D` | `pendingDirection = 'right'` |
| `P` / `Escape` | `playing ⇄ paused` 토글(§6.2) |
| `Enter` / `Space` | `start → playing` 시작, `gameover → playing` 재시작(§6.2) |

키 입력은 방향키를 누르는 순간 1회만 `pendingDirection`을 갱신한다(연속 `keydown` 반복 이벤트도 동일 값을 재대입할 뿐 부작용 없음 — pong의 "누르고 있는 동안 연속 이동"과 달리, 이동 자체는 틱 기반이라 키를 누르고 있어도 매 프레임 이동하지 않는다, §11.6).

### 5.3 360px 온스크린 방향 컨트롤 (필수 요구, Epic 명시 항목)

- **레이아웃**: 4개 방향 버튼(▲ ◀ ▶ ▼)을 십자(D-pad) 모양으로 배치한다. 버튼 각각 최소 `44×44` CSS px(WCAG 2.5.5 터치 타겟 권장 크기) 이상으로, D-pad 클러스터 전체 폭은 약 `150px` 이내로 구성해 **360px 폭 뷰포트**(좌우 패딩 적용 후 남는 폭) 안에 항상 스코어보드·보드·D-pad가 세로 스택으로 전부 들어가도록 한다(§8.2).
- **입력 방식**: 각 버튼에 `pointerdown` 이벤트(Pointer Events, 터치/마우스 클릭 통합 처리)로 해당 방향을 `pendingDirection`에 설정한다. `pointerup`/`pointerleave`에서는 아무 동작도 하지 않는다(연속 드래그 추적이 필요 없음 — pong과 달리 이산 격자 이동이라 §5.1 원칙과 동일하게 "누른 순간 1회 반영"이면 충분, §11.6).
- **`touch-action: manipulation`**: D-pad 버튼에 지정해 더블탭 확대(zoom)·기본 터치 지연을 방지한다.
- **연속 탭 대응**: 사용자가 같은 버튼을 빠르게 여러 번 탭해도 `pendingDirection`이 마지막 값으로 계속 갱신될 뿐이므로 별도 디바운스가 필요 없다(§3.3 step 1이 매 틱 1회만 소비).
- **뷰포트 지원 하한**: 360px CSS 너비 기준으로 보드(§8.2, 최대 `320px` 표시 폭) + D-pad(약 `150px`, 보드 아래 배치) 모두 가로 스크롤 없이 표시되어야 한다(디자인/구현 검증 시 360px 프레임 실측 확인 필요, §14-2).
- **키보드와의 우선순위**: 마지막으로 발생한 입력(키보드든 D-pad든)이 `pendingDirection`을 덮어쓴다 — 두 입력 경로 사이에 잠금이나 우선순위 규칙은 없다(§5.1).

---

## 6. 상태 모델 — 브라우저 메모리, 상태 전이

### 6.1 상태 데이터 형태 (in-memory 전용, §0 가정 4)

```js
state = {
  status: 'start' | 'playing' | 'paused' | 'gameover',
  board: { cols: 20, rows: 20 },
  snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],  // head first
  direction: 'up' | 'down' | 'left' | 'right',
  pendingDirection: null,           // 다음 틱에 적용될 후보 방향(§3.6)
  food: { x: 0, y: 0 },
  score: 0,
  highScore: 0,                     // 세션 유지, 새로고침 시 소실(§4.2)
  gameoverReason: null,             // 'wall' | 'self' | 'board-full' | null
}
```

이 객체는 순수 JS 런타임 변수로만 존재하며, `localStorage`/`sessionStorage`/서버 세션 어디에도 기록되지 않는다(§0 가정 4).

### 6.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `start` | `playing` | "시작" 버튼 클릭 또는 `Enter`/`Space`(status=start일 때만) | `snake`/`direction`/`food`를 §3.2 초기값으로 설정, `score=0`(`highScore`는 유지 — 최초 진입 시에는 `0`), 틱 루프 시작 |
| `playing` | `paused` | `P`/`Escape`(status=playing일 때만) | 틱 인터벌 정지(뱀/먹이 위치, `pendingDirection` 그대로 보존) |
| `paused` | `playing` | `P`/`Escape` 또는 "계속하기" 버튼 | 틱 인터벌 재개, 정지 동안의 경과 시간은 이동에 영향 없음(§11.7) |
| `paused` | `start` | "메뉴로" 버튼 | 진행 중이던 뱀/점수 폐기, 시작 화면 복귀(`highScore`는 유지) |
| `playing` | `gameover` | 벽 충돌 / 자기 충돌 / 보드 가득 참(§3.3 step 3·5·7) | `gameoverReason` 확정, 틱 루프 정지, `highScore` 최종 갱신(§3.3 step 8), 결과 화면 표시 |
| `gameover` | `playing` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `start → playing`과 동일한 전체 초기화(`highScore`만 유지, `score`는 `0`으로 리셋) |
| `gameover` | `start` | "메뉴로" 버튼 | 시작 화면 복귀(`highScore` 유지) |

> 정의되지 않은 전이(예: `start`/`gameover` 상태에서 방향 입력, `paused` 중 방향 입력)는 **무시**된다 — 모든 핸들러가 상태별 조건 가드(`if (state.status !== 'playing') return`)로 no-op 처리하며 예외를 던지지 않는다(§11.5, §11.8).

### 6.3 상태별 수용 기준 (Given/When/Then)

**AC-STATE-01 (start → playing)**
> **Given** 사용자가 시작 화면(`status=start`)에 있다
> **When** "시작" 버튼을 클릭하거나 `Enter`/`Space`를 누르면
> **Then** `status`가 `playing`으로 전이되고 뱀이 초기 위치(§3.2)에, `score=0`으로 배치되며 틱 루프가 시작된다.

**AC-STATE-02 (playing에서 먹이 섭취 — 상태 유지, 부수효과만 발생)**
> **Given** 게임이 진행 중(`status=playing`)이다
> **When** 뱀 머리가 먹이 위치로 이동하면
> **Then** `status`는 `playing`을 유지한 채 뱀 길이가 1 증가하고 `score`가 `10` 증가하며, 먹이가 새 빈 셀로 재스폰되고 `highScore`가 필요 시 갱신된다(§3.3, §4).

**AC-STATE-03 (playing → gameover, 벽 충돌)**
> **Given** 게임이 진행 중이고 뱀 머리가 보드 경계에 인접해 있다
> **When** 다음 틱에 머리가 `x<0`/`x≥20`/`y<0`/`y≥20` 중 하나로 이동하면
> **Then** `status`가 즉시 `gameover`로 전이되고 `gameoverReason='wall'`이 설정되며 틱 루프가 정지한다.

**AC-STATE-04 (playing → gameover, 자기 충돌)**
> **Given** 게임이 진행 중이고 뱀 길이가 4 이상이다
> **When** 다음 틱에 머리가 자기 몸(꼬리 제외, §11.3)의 셀로 이동하면
> **Then** `status`가 즉시 `gameover`로 전이되고 `gameoverReason='self'`가 설정된다.

**AC-STATE-05 (playing ⇄ paused)**
> **Given** 게임이 진행 중이다
> **When** `P` 또는 `Escape`를 누르면
> **Then** `status`가 `paused`로 전이되어 뱀/먹이가 그 위치에서 정지하고, 다시 누르면 `playing`으로 복귀해 정지 시점 그대로(같은 `direction`·`pendingDirection`) 재개된다.

**AC-STATE-06 (gameover → playing, 재시작)**
> **Given** 사용자가 게임오버 상태(`status=gameover`)이다
> **When** `Enter`/`Space` 또는 "다시 하기" 버튼을 누르면
> **Then** `score=0`, 뱀이 초기 위치로 완전히 새로운 게임이 시작되고 `highScore`는 직전 게임 값이 그대로 유지된다.

**AC-STATE-07 (paused/gameover → start)**
> **Given** 사용자가 일시정지 또는 게임오버 상태이다
> **When** "메뉴로" 버튼을 누르면
> **Then** `status=start`로 전이되고 시작 화면이 표시되며, 진행 중이던 뱀/점수는 폐기되지만 `highScore`는 유지된다.

---

## 7. 보존 영역 — 기존 루트 snake·타 phase18 게임 불변

Epic이 명시적으로 요구한 항목이며, 본 게임의 신규 구현이 아래 기존 자산을 **절대 수정·재사용하지 않아야** 한다는 계약을 별도 절로 확정한다.

### 7.1 수정 금지 대상 (실측 경로)

| 경로 | 내용 | 불변 근거 |
|---|---|---|
| `snake/**`(`index.html`/`game.js`/`logic.js`/`styles.css`/`vendor/pixi.min.js`) | 루트 Snake(BF-504 계열, 전체화면·CPU AI·아이템·이펙트·경쟁 모드) | 완전히 별개 게임(§0 가정 3), 코드/상수/상태 모델 공유 없음 |
| `docs/design/snake-*.md`(예: `snake-hud-BF-556.md`, `snake-items-BF-538.md`, `snake-cpu-ai-BF-527.md` 등) | 루트 Snake 관련 기존 디자인 문서 | 본 문서(`docs/planning/phase18-snake-BF-923.md`)와 독립된 신규 SSOT — 기존 문서 재해석·수정 없음 |
| `docs/spec/snake-*.md`(예: `snake-game-settings-BF-579.md`, `snake-items-BF-538.md`, `snake-pixi-BF-595.md`, `snake-sound-toggle-BF-563.md`) | 루트 Snake 관련 기존 기술 스펙 | 동일 — 참조만 하고 수정하지 않음 |
| `tests/snake-BF*.test.js`(30개 이상, `snake-BF504` ~ `snake-BF874-e2e`) | 루트 Snake 테스트 스위트 | module명을 `phase18-snake`로 분리해 네임스페이스 충돌 자체를 방지(§0 가정 2) — 후속 tester는 `tests/phase18-snake-*.test.js`만 신설 |
| `phase18-games/pong/**`(`index.html`/`styles.css`/`logic.js`/`main.js`) | 기존 phase18-games 게임(BF-910~915) | 형제 디렉터리로 신설만 하고 기존 파일은 건드리지 않음 |
| `phase18-games/memory-match/**` | 기존 phase18-games 게임(BF-916~919) | 동일 |
| `phase18-validation/**` | Phase 18 검증 스위트(status-card-1/counter-2/clock-3/dice-4/progress-5) | 본 task와 무관한 별개 라우트 그룹, 참조·수정 대상 아님 |

### 7.2 보존 영역 수용 기준 (Given/When/Then)

**AC-PRESERVE-01 (루트 snake 불변)**
> **Given** 본 기획 문서 및 후속 designer/dev/tester 산출물
> **When** `phase18-games/snake/**`, `docs/planning/phase18-snake-BF-923.md`, `docs/design/phase18-snake-*.md`(후속), `tests/phase18-snake-*.test.js`(후속)를 신규 생성하면
> **Then** `snake/**`(루트) 디렉터리의 어떤 파일도 diff에 포함되지 않는다.

**AC-PRESERVE-02 (타 phase18 게임 불변)**
> **Given** 본 task 및 후속 task들의 작업 범위
> **When** `phase18-games/snake/`를 신설하면
> **Then** `phase18-games/pong/**`, `phase18-games/memory-match/**`의 어떤 파일도 diff에 포함되지 않는다.

**AC-PRESERVE-03 (테스트 네임스페이스 분리)**
> **Given** module명이 `phase18-snake`로 확정되었다(§0 가정 2)
> **When** 후속 tester가 테스트 파일을 작성하면
> **Then** 파일명은 `tests/phase18-snake-*.test.js` 패턴만 사용하고 `tests/snake-*.test.js`(루트 게임 네임스페이스)와 겹치지 않는다.

검증 방법(후속 dev/tester가 구현 후 실행): `git diff --name-only <base>...<head> | grep -E "^snake/|^phase18-games/(pong|memory-match)/"` → 매치 0건이어야 통과.

---

## 8. 화면 구성 요구사항 (반응형 360px)

### 8.1 페이지 구조

```
<body>
 ├─ <header class="topbar">     ← "Snake 아케이드" 타이틀
 └─ <main class="page">
     ├─ <div class="scoreboard">  ← "점수 {score}  최고 {highScore}"
     ├─ <canvas id="board" width="400" height="400">  ← §3.1 논리 해상도(20×20×20px), CSS로 반응형 스케일
     ├─ <div class="dpad">        ← §5.3, ▲/◀/▶/▼ 4버튼 십자 배치
     └─ <div class="controls-hint">  ← "방향키 또는 아래 버튼으로 이동하세요" 안내문 + 시작/일시정지/재시작 버튼
```

### 8.2 반응형 규칙 (360px 필수 지원)

- 캔버스 CSS: `width: 100%; max-width: 400px; height: auto; aspect-ratio: 1 / 1;` — 논리 해상도(`400×400`, 20×20 셀 × `CELL_SIZE(20)`)는 불변, 표시 크기만 뷰포트에 맞춰 축소된다.
- 360px 뷰포트 기준(페이지 좌우 패딩 적용 후) 보드 표시 폭이 약 `300~320px`까지 축소되어도 20×20 격자가 그대로 유지되며(래스터화만 축소), D-pad(§5.3, 약 `150px` 폭)는 보드 아래 별도 행에 배치되어 가로 스크롤이 발생하지 않는다.
- 스코어보드·보드·D-pad·조작 안내·버튼은 세로 스택 배치되어 360px 폭에서 전부 표시된다.
- 리사이즈/화면 회전 시 캔버스 CSS 크기만 바뀌고 논리 좌표계(20×20 격자)는 그대로이므로 렌더링 로직 변경이 필요 없다(격자 인덱스 → 픽셀 변환은 항상 `CELL_SIZE` 고정 상수 기반, §3.1).

### 8.3 `prefers-reduced-motion` 처리 방침

뱀의 격자 이동 자체가 게임의 핵심 동작이므로 `prefers-reduced-motion: reduce`에서도 뱀의 셀 단위 이동은 동일하게 유지한다(모션이 곧 게임 콘텐츠 — `tetris-BF-833.md` §7.3, `pong-BF-910.md` §7.3과 동일한 성격). 셀 사이를 부드럽게 보간하는 CSS 트랜지션 등 **부가 연출**은 v1 범위에 포함하지 않으므로(§12), 렌더링은 매 틱마다 셀 위치를 즉시 스냅(snap)하는 것으로 충분하다.

### 8.4 `<noscript>` 폴백

JS가 비활성화된 경우 "이 게임은 JavaScript가 필요합니다" 안내 문구를 표시한다(저장소 내 기존 모듈들과 동일 패턴).

---

## 9. 외부 의존성 배제 확인

vanilla-static 제약(Epic 명시)에 따라 다음을 명시적으로 배제하며, `file://` 프로토콜 직접 실행 호환을 전제로 한다.

| 확인 항목 | 값 |
|---|---|
| `fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 호출 | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건(상대경로 리소스만 사용) |
| 신규 npm 패키지/외부 CDN 스크립트 | 0건 — `package.json`에 신규 dependency 추가하지 않음 |
| 서버 API 라우트 신규 생성(`/api/snake*` 등) | 없음 |
| DB 스키마(Prisma 등) | 없음 |
| `localStorage`/`sessionStorage` 등 영속 저장 | 없음(§0 가정 4) — 상태는 전량 세션 in-memory |
| 인증/세션/로그인 | 불필요 — 공개 정적 페이지(저장소 전체에 인증 로직 0건, `dice-4-BF-897.md` §0 가정 5와 동일 근거) |
| `file://` 프로토콜 호환 | 비-module(IIFE/UMD) 패턴 필수(§13) — `<script type="module">`/상대경로 fetch 등 `file://`에서 깨지는 패턴 금지 |

검증 방법(후속 dev/tester가 구현 후 실행): `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://|localStorage|sessionStorage" phase18-games/snake/*` → 매치 0건이어야 통과.

---

## 10. Acceptance Criteria 매핑 (Given/When/Then)

### 10.1 BF-923 수용 기준 원문 매핑

**AC-1 (게임 규칙·상태·수용 기준·보존 영역의 검증 가능한 정의)**
> **Given** Epic 요구
> **When** 기획 문서(`docs/planning/phase18-snake-BF-923.md`)를 작성하면
> **Then** `docs/planning`에 게임 규칙(§3 이동·먹이·성장·충돌·게임오버), 상태(§6 데이터 형태·전이표), 수용 기준(§6.3, §10.2~10.3 GWT), 보존 영역(§7)이 검증 가능하게 정리된다.

충족 근거: §3(20×20 보드·이동·먹이·성장·충돌 공식) · §4(점수/최고 점수) · §6(상태 데이터 형태·전이표·AC-STATE-01~07) · §7(보존 영역 표·AC-PRESERVE-01~03) · §5.3(360px 방향 컨트롤 명세).

**AC-2 (vanilla-static — 외부 의존성 0건·`file://` 호환 전제 명시)**
> **Given** vanilla-static 제약
> **When** 명세를 확정하면
> **Then** 외부 네트워크/데이터 의존성이 0건으로 명시되고 `file://` 호환 전제가 기술된다.

충족 근거: §9 표(8개 확인 항목 전부 "0건"/"없음"/"불필요"/"필수") + 검증용 `grep` 명령 + `file://` 호환을 위한 비-module 패턴 명시(§13).

### 10.2 파생 AC — 게임 규칙·물리

**AC-RULE-01 (이동)**
> **Given** 게임이 진행 중이고 유효한 `direction`이 확정되어 있다
> **When** 틱이 발생하면
> **Then** 뱀 머리가 해당 방향 벡터만큼 정확히 1칸 이동하고, 꼬리는 성장이 아닌 한 1칸 제거된다(§3.3).

**AC-RULE-02 (먹이 섭취·성장)**
> **Given** 다음 틱의 새 머리 위치가 현재 먹이 위치와 일치한다
> **When** 틱이 처리되면
> **Then** 꼬리가 제거되지 않아 뱀 길이가 1 증가하고, 점수가 10 증가하며, 먹이가 뱀이 점유하지 않은 임의의 새 셀로 재스폰된다(§3.3, §3.5).

**AC-RULE-03 (벽 충돌)**
> **Given** 다음 틱의 새 머리 위치가 보드 경계(`x<0`/`x≥20`/`y<0`/`y≥20`) 밖이다
> **When** 틱이 처리되면
> **Then** 즉시 `gameover`로 전이되고 `gameoverReason='wall'`이 설정된다(§3.4, AC-STATE-03).

**AC-RULE-04 (자기 충돌)**
> **Given** 다음 틱의 새 머리 위치가 자기 몸(꼬리 vacate 규칙 적용 후, §11.3) 셀과 겹친다
> **When** 틱이 처리되면
> **Then** 즉시 `gameover`로 전이되고 `gameoverReason='self'`가 설정된다(§3.4, AC-STATE-04).

**AC-RULE-05 (방향 전환 반전 방지)**
> **Given** 뱀 길이가 2 이상이고 현재 `direction`이 확정되어 있다
> **When** 정확히 반대 방향 입력이 `pendingDirection`으로 들어온 상태에서 틱이 처리되면
> **Then** 해당 입력은 무시되고 `direction`이 유지된다(§3.6, §11.1).

### 10.3 파생 AC — 입력·컨트롤

**AC-CONTROL-01 (360px D-pad 입력)**
> **Given** 360px 폭 뷰포트에서 페이지가 렌더링되었다
> **When** 사용자가 D-pad의 한 버튼을 탭하면
> **Then** 해당 방향이 `pendingDirection`에 설정되고, 다음 틱에 §3.6 유효성 검사를 통과하면 뱀이 그 방향으로 전환된다(§5.3).

**AC-CONTROL-02 (키보드/D-pad 동등성)**
> **Given** 게임이 진행 중이다
> **When** 키보드 방향키 또는 D-pad 버튼 중 어느 쪽으로 입력해도
> **Then** 동일하게 `pendingDirection`이 갱신되며 두 입력 경로 간 우선순위 차이 없이 마지막 입력이 반영된다(§5.1).

각 §6.3 AC-STATE-01~07은 §10의 파생 AC로 포함한다(상태 전이 전체 커버). §7.2 AC-PRESERVE-01~03은 보존 영역 전체 커버.

### 10.4 매핑 요약표

| BF-923 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구, When 기획 문서 작성, Then docs/planning 에 게임 규칙·상태·수용 기준·보존 영역이 검증 가능하게 정리된다 | §3~§7(규칙/상태/보존 전체) + §10.2~10.3(파생 GWT 7개 + 상태 AC 7개 + 보존 AC 3개) |
| Given vanilla-static 제약, When 명세, Then 외부 의존성 0건·file:// 호환 전제가 명시된다 | §9 표 + grep 검증 명령 + §13 비-module 패턴 명시 |

---

## 11. Edge Case 및 실패 케이스 목록

### 11.1 짧은 시간 내 연속 방향 입력으로 인한 즉시 반전(더블턴) 방지

키보드/D-pad에서 한 틱 안에 방향 입력이 여러 번 발생해도(`pendingDirection`은 마지막 값으로만 덮어써짐), §3.3 step 1에서 유효성 검사(§3.6)를 **"틱 적용 시점의 실제 `direction`"** 기준으로 수행하므로, "위 → 오른쪽 → 아래" 같은 빠른 연속 입력이 한 틱 안에서 실제로는 "위 → 아래(정반대)"로 처리되어 뱀이 자기 목을 향해 반전하는 클래식 버그가 발생하지 않는다.

### 11.2 방향 미확정 상태(첫 틱 이전)

게임 시작 직후 `pendingDirection`은 `null`이며, 이 경우 §3.6 `isValidTurn`이 `false`를 반환해 `state.direction`(초기값 `'right'`)이 그대로 사용된다(§3.3 step 1) — 사용자가 아무 입력도 하지 않아도 뱀은 초기 방향으로 계속 이동한다.

### 11.3 꼬리 추적 이동은 자기 충돌이 아님(먹이 섭취 시 예외)

일반적인 이동에서는 꼬리가 이번 틱에 비워지므로, 새 머리가 "현재 꼬리였던 칸"으로 들어가는 것은 정상 이동이다(§3.4 `isSelfCollision`이 `growing=false`일 때 `snake.slice(0,-1)`로 꼬리를 충돌 대상에서 제외). 다만 **같은 틱에 먹이도 섭취하는 경우**(`growing=true`)에는 꼬리가 제거되지 않으므로 꼬리 셀도 충돌 대상에 포함된다 — 이 구분이 없으면 뱀이 자기 몸 전체를 휘감아 정확히 꼬리 자리로 성장하는 극단적 상황에서 오탐/미탐이 발생할 수 있다.

### 11.4 보드가 뱀으로 가득 찬 경우(퍼펙트 클리어)

이론상 뱀 길이가 400(20×20 전체)에 도달하면 `spawnFood`가 빈 셀을 찾지 못해 `null`을 반환한다(§3.5). 이 경우 §3.3 step 7에서 예외를 던지지 않고 `status='gameover'`, `gameoverReason='board-full'`로 안전하게 전이한다 — 무한 루프나 크래시 없이 결정적으로 종료된다. 실제 플레이에서 도달 가능성은 낮지만, 유한 보드라는 물리적 제약상 반드시 처리해야 하는 경계 조건이다.

### 11.5 정의되지 않은 상태에서의 입력

`start`/`gameover`/`paused` 상태에서 방향 입력(키보드/D-pad)이 들어오는 경우는 무시(no-op)된다(§6.2) — `pendingDirection`을 갱신하지 않거나, 갱신되더라도 `status !== 'playing'`인 동안은 틱 루프 자체가 동작하지 않으므로 이동에 영향이 없다. 예외를 던지지 않는 것이 정상 동작이다.

### 11.6 키를 누르고 있어도 매 프레임 이동하지 않음

pong(연속 물리 이동, `dt` 기반)과 달리 본 게임은 이산 격자 이동이므로, 방향키를 계속 누르고 있어도(브라우저의 `keydown` 반복 이벤트) 뱀은 `TICK_INTERVAL_MS(150ms)`마다 정확히 1칸만 이동한다 — 키를 오래 누른다고 더 빨리 이동하지 않는다. 이는 버그가 아니라 격자 기반 Snake의 정의된 동작이다.

### 11.7 일시정지 중 경과 시간은 이동에 영향 없음

`paused` 상태에서는 틱 인터벌 자체가 정지(`clearInterval`)되므로, 일시정지가 아무리 오래 지속되어도 재개 시 뱀은 정지 시점과 동일한 위치·방향에서 다음 틱을 시작한다(pong의 `dt` 폭주 방지 클램프와 달리, 이산 틱 구조라 별도 델타타임 보정이 필요 없음 — 구조적으로 단순함).

### 11.8 게임오버 직후 재시작 연타

`gameover` 상태에서 `Enter`/`Space`를 여러 번 빠르게 눌러도, 상태 가드(`if (state.status !== 'gameover') return`)로 인해 첫 번째 입력만 `playing`으로의 전이를 트리거하고 이후 입력은 이미 `playing`으로 바뀐 상태에서 §6.2에 정의되지 않은 전이이므로 무시된다 — 중복 초기화나 상태 꼬임이 발생하지 않는다.

---

## 12. 비범위 (Out of Scope)

- 벽 통과(랩어라운드) 이동 — §0 가정 5, 미요청 기능을 추측 확장하지 않음
- 속도 증가/레벨 시스템 — §0 가정 7, 미요청
- 장애물·아이템·버프·이펙트·CPU AI·경쟁 모드 — 이는 루트 `snake/`의 영역이며 본 게임은 순수 클래식 규칙만 다룸(§7 보존 영역)
- 사운드 효과 — Epic 원문에 언급 없음
- 파티클/화면 흔들림 등 부가 연출, 셀 간 부드러운 이동 애니메이션 — §8.3, v1 범위 아님(스냅 이동으로 충분)
- 최고 점수의 영속 저장(`localStorage` 등), 리더보드/서버 API — §0 가정 4, §9, 영속 저장 자체가 비범위
- 온라인 대전/멀티플레이어 — 네트워크 의존성 자체가 배제 대상(§9)
- 스와이프 제스처 입력 — D-pad + 키보드로 충분(§5.3), 필요 시 dev 재량으로 추가 가능하나 필수 아님
- 디자인 mockup 산출물 — designer 담당 영역, 본 문서는 규칙/상태/입력/보존 계약만 정의

---

## 13. 파일 구조 및 기술 제약

| 파일(제안, 최종 분할은 dev 재량) | 역할 |
|---|---|
| `phase18-games/snake/index.html` | 마크업(§8.1), `<canvas id="board" width="400" height="400">` |
| `phase18-games/snake/styles.css` | 반응형 레이아웃(§8.2), 저장소 공통 디자인 토큰 재사용 권장(신규 색상 발명 최소화) |
| `phase18-games/snake/logic.js` | 순수 함수: `tick`(§3.3), 충돌 판정(§3.4), 먹이 스폰(§3.5), 방향 유효성 검사(§3.6) — UMD/IIFE, `node --test` 대상, module명 `phase18-snake`(§0 가정 2) |
| `phase18-games/snake/main.js` | DOM 바인딩: 틱 루프(`setInterval(tick, TICK_INTERVAL_MS)`, §3.2), 키보드(§5.2)·D-pad(§5.3) 입력 처리, 캔버스 렌더링, 상태 전이(§6) 실행 |

- 격자 좌표계(20×20, `CELL_SIZE=20`)와 상수(§3.1)는 렌더링 방식(canvas 2D 권장)과 무관하게 고정 계약이다.
- 비-module(IIFE/UMD) 패턴 필수 — `file://` 프로토콜 직접 실행 호환(저장소 기존 모듈들의 공통 관례, §9).
- 게임 루프는 `setInterval` 기반 고정 틱을 권장한다(pong의 `requestAnimationFrame` + `dt` 클램프 방식과 달리, 이산 격자 이동은 연속 물리가 없어 더 단순한 구조로 충분하다, §11.7) — 렌더링만 별도로 `requestAnimationFrame`을 사용해도 무방하나 로직 갱신 주기(§3.1 `TICK_INTERVAL_MS`)는 고정값을 지켜야 한다.
- 테스트(후속 tester task 대상): `node --test tests/phase18-snake-*.test.js` — ① 이동/성장/꼬리 제거 로직(§3.3) 고정 입력값 검증, ② 벽/자기 충돌 판정(§3.4, 꼬리 vacate 예외 §11.3 포함) 검증, ③ 먹이 스폰이 항상 빈 셀에서만 발생하는지(§3.5) 대량 반복 검증, ④ 방향 반전 방지(§3.6, §11.1) 검증, ⑤ 점수/최고 점수 갱신(§4) 경계값 검증, ⑥ 보드 가득 참(§11.4) 경계 케이스, ⑦ §9 정적 검사(외부 의존성 0건) + `git diff` 기반 보존 영역 검사(§7.2).

---

## 14. 산출물 위치 및 참조 표 / 남은 모호함

### 14.1 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/phase18-snake-BF-923.md`(본 문서, `owned_paths: docs/planning/**` 명시) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-games/snake/index.html`, `styles.css`, `logic.js`, `main.js` — 미정, 본 문서 §3~§8이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/phase18-snake-*.test.js` — 미정, 본 문서 §10~§11이 검증 기준 |
| 참조한 기존 선례 | `docs/planning/pong-BF-910.md`(신규 규칙 SSOT 작성 형식, 상태 전이표·보존 영역 유형 패턴), `docs/planning/dice-4-BF-897.md`(브라우저 메모리 상태 해석 근거), `docs/planning/tetris-BF-833.md`(격자 기반 게임 목차 구조 참고) |
| 참조한 기존 코드(수정 없이 실측만) | `snake/index.html`(`highScore` in-memory 처리 방식 확인, §0 가정 4), `phase18-games/pong/`·`phase18-games/memory-match/`(디렉터리 컨벤션 확인, §0 가정 1) |

### 14.2 남은 모호함 (운영자 확인 권장)

1. **점수 공식(`SCORE_PER_FOOD=10`) 확정 여부**: §0 가정 6 — Epic 원문에 정확한 점수 값이 없어 임의 상수로 확정했다. 운영자가 다른 값(예: 먹이당 1점, 길이 비례 점수 등)을 원하면 §4.1 개정이 필요하다.
2. **이동 속도(`TICK_INTERVAL_MS=150`) 및 가속 시스템 여부**: §0 가정 7 — 고정 속도로 확정했다. 루트 `snake/`처럼 속도 레벨 HUD를 원한다면 §3.1·§6.1 전면 재설계가 필요하다.
3. **벽 랩어라운드 여부**: §0 가정 5 — 벽 충돌 = 게임오버로 확정했다. 랩어라운드를 원한다면 §3.4 `isWallCollision` 로직 및 관련 AC 전면 수정이 필요하다.
4. **module명 `phase18-snake` 확정 여부**: §0 가정 2 — 루트 `snake` module과의 네임스페이스 충돌을 피하기 위한 판단이다. 운영자가 다른 명명(예: `snake-2`, `snake-classic`)을 원하면 본 문서 및 후속 task의 파일 접두사 전체 조정이 필요하다.
5. **Jira 코멘트 등록**: §0 가정 9 — 본 세션에 Jira MCP가 할당되어 있지 않아 직접 코멘트를 등록하지 못했다. `worker_brokered_lifecycle_writes`에 따라 시스템이 본 문서 커밋과 이 세션의 최종 메시지를 근거로 Jira 코멘트를 등록할 것으로 예상하나, 등록 결과 확인은 운영자 몫이다.

---

*문서 종료 — [박기획] · BF-923*
