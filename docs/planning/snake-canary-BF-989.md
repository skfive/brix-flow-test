# 스네이크 캐너리(Canary) 그리드 게임 기획 명세 — BF-989

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-991 (본 planner task) · BF-989 (파일명 기준 상위 스토리 — §0 가정 8)
> 형제 task: BF-993 (designer) · BF-995 (developer) · BF-998 (tester)
> 대상 라우트: `/demo/snake-canary` (= `src/app/demo/snake-canary/`, 신규 디렉터리)
> 페이지 타이틀: "스네이크 캐너리"
> tech-stack 태그: `vanilla-static` (외부 프레임워크·번들러·네트워크 의존 없음)
> 신규 module: `snake-canary`
> 단위 테스트(예정, 후속 tester task): `node --test tests/snake-canary-*.test.js` (focused scope · module: `snake-canary`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑, `src/app/demo/*` 기존 선례 그대로 적용:** task 설명이 대상을 `/demo/snake-canary`로 이미 명시했다(`bf:primary-module:snake-canary`). 저장소에는 동일 패턴의 `src/app/demo/counter/`(BF-862), `src/app/demo/clock/`(BF-842 계열), `src/app/demo/status/` 3개가 이미 존재하며 모두 `index.html` + `styles.css` + `main.js` + `<모듈명>.js`(순수 로직) 4파일 구성을 따른다(실측: `find src/app/demo -maxdepth 3`). 본 게임도 동일 관례로 **`src/app/demo/snake-canary/`**(`counter/`·`clock/`·`status/`와 형제 디렉터리)에 신설한다. 저장소 루트의 `snake/`(BF-504 계열, 전체화면 대형 게임)나 `phase18-games/snake/`(BF-923 계열)와는 라우트·디렉터리·목적이 모두 다른 **완전히 별개의 신규 데모**다(§8 보존 영역).

**가정 2 — ES 모듈(`type="module"`) 패턴 채택, 루트 게임군의 UMD 관례와 의도적으로 다름:** 저장소에는 두 가지 스크립트 로드 관례가 공존한다. ① 루트 `snake/`·`rps/`·`phase18-games/*`는 `file://` 프로토콜 직접 열기를 지원하기 위해 UMD/IIFE + 일반 `<script>` 태그를 쓴다(README §"방법 B"). ② `src/app/demo/counter/`·`clock/`·`status/`는 `<script type="module" src="main.js">` + `import`/`export`를 쓰며, `npm start`(`http-server`)로 서빙하는 것을 전제로 한다(README §"방법 A"). 본 게임은 **가정 1의 형제 디렉터리 선례(②)를 그대로 따른다** — `snake-canary.js`는 `export`로 순수 함수를, `main.js`는 그 함수들을 `import`해 DOM에 연결한다. `file://` 직접 열기는 지원 목표가 아니며(§9), `npm start` 또는 동등 정적 서버로 서빙하는 것을 전제 조건으로 명시한다(§1.3).

**가정 3 — 격자 20×20·`CELL_SIZE=20`·틱 150ms·먹이당 10점: 저장소 내 이미 검증된 값 재사용:** Epic/task 원문에는 정확한 보드 크기·이동 속도·점수 공식이 없다. 동일 저장소에 이미 구현·검증된 클래식 그리드 스네이크인 `phase18-games/snake/`(BF-923 계열, `docs/planning/phase18-snake-BF-923.md`)가 채택한 상수(`BOARD_COLS/ROWS=20`, `CELL_SIZE=20`, `TICK_INTERVAL_MS=150`, `SCORE_PER_FOOD=10`)를 **값만** 재사용한다 — 이미 플레이 검증된 수치를 다시 추측하지 않기 위함이다(Simplicity First). 단, **코드·모듈·상태 객체는 전혀 공유하지 않는다** — `snake-canary`는 처음부터 독립적으로 구현되는 신규 module이며, `phase18-games/snake/`의 파일을 import·참조·수정하지 않는다(§8).

**가정 4 — 상태는 정확히 3개만: 대기(idle) · 진행(playing) · 게임오버(gameover), 일시정지 없음:** task 원문이 "상태(대기·진행·게임오버)"라고 정확히 3개만 명시했다. `phase18-games/snake/`는 `paused` 상태를 추가로 갖지만, 본 task 원문에는 일시정지 요구가 없으므로 **추측성으로 확장하지 않는다**(Simplicity First) — 일시정지는 §13 비범위에 명시한다.

**가정 5 — 브라우저 메모리 상태 전용, `localStorage` 등 영속 저장 일체 금지:** task 원문이 "외부 API 없이 브라우저 메모리 상태만 사용한다"고 명시했다. 최고 점수를 포함한 모든 게임 상태는 JS 변수로만 존재하며, 새로고침·탭 종료 시 완전히 소실된다(§5). `src/app/demo/counter/`가 이미 동일하게 무영속 메모리 상태만 쓰는 선례다(가정 1 근거 확인).

**가정 6 — 입력은 키보드 + 온스크린 터치 D-pad 두 경로, 스와이프 제스처는 dev 재량(비범위):** task 원문이 "키보드/터치 입력 방식"을 요구한다. `phase18-games/snake/`가 이미 채택한 "키보드 방향키/WASD + 44×44 이상 온스크린 D-pad 버튼(Pointer Events)" 패턴을 동일하게 채택한다(가정 3과 같은 재사용 근거) — 검증된 접근성 패턴(WCAG 2.5.5 터치 타깃)이며 추가 발명이 필요 없다. 스와이프 제스처 인식은 원문에 없는 추가 기능이므로 필수로 요구하지 않는다(§13).

**가정 7 — 파일 소유권 및 파일명 근거 (BF-989 vs BF-991 번호 불일치 해설):** 본 세션의 `owned_paths`는 `docs/planning/snake-canary-BF-989.md` 1개로 명시되어 있으며, 이는 본 task의 티켓 번호(BF-991)와 다르다. 형제 task 목록(BF-993 designer·BF-995 developer·BF-998 tester)이 모두 동일 Epic 계열로 묶여 있는 점으로 미루어, **BF-989는 상위 스토리/Epic 번호이고 BF-991은 그 스토리를 위해 dispatch된 본 planner task**로 추정된다. 시스템이 지정한 `owned_paths` 경로를 그대로 따르는 것이 형제 task들이 동일한 파일을 일관되게 찾을 수 있는 유일한 방법이므로, 파일명은 **시스템이 지정한 대로 `snake-canary-BF-989.md`를 그대로 사용**하고 문서 본문에는 실제 작업 티켓(BF-991)을 명시해 추적성을 남긴다.

**가정 8 — Jira/GitHub 도구 미할당(운영자 확인 불필요, worker가 처리):** `RUN_CAPABILITY_MANIFEST`에 `assigned_mcp_servers: (none)`으로 명시되어 있다. Jira 코멘트·PR 생성 등은 `worker_brokered_lifecycle_writes`로 시스템이 본 문서의 최종 커밋과 이 세션의 마지막 메시지를 근거로 처리한다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 보드·이동·먹이·충돌](#3-게임-규칙--보드이동먹이충돌)
4. [점수 산정](#4-점수-산정)
5. [상태 모델 — 브라우저 메모리, 상태 전이](#5-상태-모델--브라우저-메모리-상태-전이)
6. [입력 모델 — 키보드 + 터치](#6-입력-모델--키보드--터치)
7. [접근성 요건](#7-접근성-요건)
8. [보존 영역 — 기존 게임 모듈·공용 로직·빌드 설정 불변](#8-보존-영역--기존-게임-모듈공용-로직빌드-설정-불변)
9. [외부 의존성 배제 확인](#9-외부-의존성-배제-확인)
10. [화면 구성 요구사항](#10-화면-구성-요구사항)
11. [Acceptance Criteria (Given/When/Then)](#11-acceptance-criteria-givenwhenthen)
12. [Edge Case 및 실패 케이스 목록](#12-edge-case-및-실패-케이스-목록)
13. [비범위 (Out of Scope)](#13-비범위-out-of-scope)
14. [파일 구조 및 기술 제약](#14-파일-구조-및-기술-제약)
15. [산출물 위치 및 참조 표 / 남은 모호함](#15-산출물-위치-및-참조-표--남은-모호함)

---

## 1. 개요

### 1.1 목적

`/demo/snake-canary`는 저장소의 `src/app/demo/*` 데모 패밀리(counter·clock·status)에 합류하는 신규 module `snake-canary`로, 클래식 그리드 기반 스네이크 게임을 결정론적 규칙과 명확한 상태 전이로 구현 가능하게 하는 기획 SSOT다. 게임 규칙(그리드 이동·먹이·충돌·점수), 키보드/터치 입력, 상태(대기·진행·게임오버), 접근성 요건을 후속 designer(BF-993)·developer(BF-995)·tester(BF-998)가 동일한 기준으로 다룰 수 있도록 문서화하고, 기존 게임 모듈·공용 로직·빌드 설정을 건드리지 않는 보존 원칙을 명시한다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `src/app/demo/snake-canary/`(`index.html`/`styles.css`/`snake-canary.js`/`main.js`) — §0 가정 1, §14 |
| 게임 모드 | 1인용, 클래식 격자 이동 스네이크 — §3 |
| 보드 | 20 × 20 셀(고정) — §3.1, §0 가정 3 |
| 게임 규칙 | §3 — 이동·먹이 스폰·성장·충돌(벽/자기 몸)·게임오버, 고정 틱 150ms |
| 점수 | §4 — 먹이 1개당 10점, 게임오버 시 리셋 |
| 입력 | §6 — 키보드(방향키/WASD) + 온스크린 터치 D-pad(Pointer Events) |
| 상태 | §5 — 대기(idle) → 진행(playing) → 게임오버(gameover), 3개 상태만 |
| 상태 영속화 | 없음 — 브라우저 메모리(JS 변수)에만 존재, 새로고침 시 완전 소실(§0 가정 5) |
| 접근성 | §7 — 키보드/터치 양쪽 완전 조작, 최소 대비(WCAG AA), 포커스 가시성 가이드 |
| 보존 영역 | §8 — 기존 게임 모듈(`snake/`, `phase18-games/**`), 형제 데모(`counter/`, `clock/`, `status/`), 공용 로직, 빌드 설정(`package.json` 등) 불변 |
| 외부 의존성 | 없음 — 네트워크 요청·외부 라이브러리·서버 API·DB 0건(§9) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전, Pointer Events + ES modules 지원)
- `npm start`(`http-server`) 또는 동등 정적 서버로 서빙(§0 가정 2 — `type="module"` 사용으로 `file://` 직접 열기는 지원 목표 아님, §9)
- 순수 로직 함수(이동/충돌/먹이 스폰/점수)는 Node.js `node --test`로도 단위 테스트 가능해야 함(`import`로 로드)
- `src/app/demo/snake-canary/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer(BF-993)/developer(BF-995) task에서 신규 생성됨

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
| 대기(idle) | 게임 시작 전 초기 화면 상태 |
| 진행(playing) | 틱 루프가 동작하며 뱀이 실제로 이동하는 상태 |
| 게임오버(gameover) | 충돌로 게임이 종료된 상태 — 재시작만 가능 |

---

## 3. 게임 규칙 — 보드·이동·먹이·충돌

### 3.1 좌표계 및 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `BOARD_COLS` | `20` | 보드 가로 셀 수(§0 가정 3) |
| `BOARD_ROWS` | `20` | 보드 세로 셀 수 |
| `CELL_SIZE` | `20` (논리 px) | 셀 1개 크기 — `BOARD_COLS × CELL_SIZE = 400` → `<canvas width="400" height="400">` |
| `TICK_INTERVAL_MS` | `150` | 뱀이 1칸 이동하는 주기(고정, 가속 없음) |
| `INITIAL_SNAKE_LENGTH` | `3` | 게임 시작 시 뱀 길이 |
| `INITIAL_HEAD` | `{x:10, y:10}` | 시작 머리 위치(보드 중앙 부근) |
| `INITIAL_DIRECTION` | `'right'` | 시작 이동 방향 |
| `SCORE_PER_FOOD` | `10` | 먹이 1개당 점수(§4) |

좌표계: 원점 `(0,0)`은 보드 좌상단 셀. `x`는 열(0~19, 좌→우), `y`는 행(0~19, 상→하).

```javascript
export const DIRECTION_VECTORS = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
```

### 3.2 초기 상태 구성

```javascript
initialSnake = [
  { x: 10, y: 10 },  // head
  { x: 9,  y: 10 },
  { x: 8,  y: 10 },  // tail
];
initialDirection = 'right';
```

- 뱀은 항상 몸이 이어진 일직선으로 시작하며, 시작 방향(`right`)은 머리가 몸에서 "멀어지는" 방향으로 고정한다 — 시작하자마자 자기 충돌이 발생하지 않도록 보장.
- 초기 먹이 위치는 `initialSnake`가 점유한 3개 셀을 제외한 397개 빈 셀 중 무작위 1개(§3.4 `spawnFood`와 동일 알고리즘).

### 3.3 게임 루프(틱) — 이동·성장·충돌 판정 순서

매 `TICK_INTERVAL_MS(150ms)`마다, `status === 'playing'`일 때만 다음을 순서대로 수행한다(순수 함수 `tick(state) → newState`로 구현):

```
1. effectiveDirection = isValidTurn(state.pendingDirection, state.direction, state.snake.length)
                         ? state.pendingDirection
                         : state.direction
   // 방향 확정은 "틱 적용 시점"에 현재 direction과 비교(§12.1 — 빠른 연속 입력으로 인한
   // 즉시 반전 방지)

2. vec = DIRECTION_VECTORS[effectiveDirection]
   newHead = { x: state.snake[0].x + vec.dx, y: state.snake[0].y + vec.dy }

3. if (isWallCollision(newHead)) → status = 'gameover', gameoverReason = 'wall', 종료   // §3.4

4. growing = (newHead.x === state.food.x && newHead.y === state.food.y)

5. if (isSelfCollision(state.snake, newHead, growing)) → status = 'gameover', gameoverReason = 'self', 종료
   // §3.4 — growing 여부에 따라 꼬리 셀 포함/제외가 달라짐(§12.3)

6. newSnake = [newHead, ...state.snake]      // 머리 추가
   if (!growing) newSnake.pop()              // 성장이 아니면 꼬리 제거(제자리 이동)

7. if (growing) {
     newScore = state.score + SCORE_PER_FOOD
     newFood  = spawnFood(newSnake, state.board)     // §3.4
     if (newFood === null) → status = 'gameover', gameoverReason = 'board-full', 종료   // §12.4
   } else {
     newScore = state.score
     newFood  = state.food
   }

8. return { ...state, snake: newSnake, direction: effectiveDirection, pendingDirection: null,
            food: newFood, score: newScore }
```

### 3.4 충돌 판정 및 먹이 스폰

**벽 충돌** — 랩어라운드 없음:

```javascript
export function isWallCollision(head) {
  return head.x < 0 || head.x >= BOARD_COLS || head.y < 0 || head.y >= BOARD_ROWS;
}
```

**자기 충돌** — 꼬리 vacate 규칙 포함(§12.3 상세):

```javascript
export function isSelfCollision(snake, newHead, growing) {
  const bodyToCheck = growing ? snake : snake.slice(0, -1);
  // growing이 아니면 꼬리 셀은 이번 틱에 비워지므로 충돌 대상에서 제외
  return bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y);
}
```

**먹이 스폰**:

```javascript
export function spawnFood(snake, board) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const freeCells = [];
  for (let y = 0; y < board.rows; y++)
    for (let x = 0; x < board.cols; x++)
      if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
  if (freeCells.length === 0) return null;   // 보드가 뱀으로 가득 참(§12.4)
  return freeCells[Math.floor(Math.random() * freeCells.length)];
}
```

- 빈 셀 목록을 전수 구성한 뒤 그 중 무작위 인덱스를 뽑는 방식(rejection-sampling 아님)으로, 보드가 거의 가득 찬 상태에서도 무한 루프 없이 결정적으로 종료한다.
- 먹이는 뱀 몸 셀과 절대 겹치지 않는다.

### 3.5 방향 전환 유효성 검사

```javascript
function isOpposite(a, b) {
  return (
    (a === 'up' && b === 'down') || (a === 'down' && b === 'up') ||
    (a === 'left' && b === 'right') || (a === 'right' && b === 'left')
  );
}

export function isValidTurn(pendingDirection, currentDirection, snakeLength) {
  if (pendingDirection === null) return false;
  if (snakeLength === 1) return true;   // 몸이 없으면 즉시 반전도 허용
  return !isOpposite(pendingDirection, currentDirection);
}
```

- 뱀 길이가 2 이상일 때, 현재 진행 방향의 정반대 방향으로는 전환할 수 없다(자기 목으로 즉시 돌진 방지) — 표준 클래식 스네이크 규칙.
- 대각선 이동·정지 상태는 없다 — 매 틱 반드시 1칸 이동.

---

## 4. 점수 산정

- 먹이 1개를 먹을 때마다 `score += SCORE_PER_FOOD(10)`(§3.3 step 7).
- 게임오버 후 재시작(`gameover → playing`) 시 `score`는 `0`으로 완전히 리셋된다.
- 점수는 정수이며 감소하지 않는다(패널티 없음 — task 원문에 감점 요구 없음, §13).
- **최고 점수(세션 최고 기록) 자체는 본 task 범위에 포함하지 않는다** — task 원문이 "점수 산정"만 요구하며 최고 점수 HUD를 명시하지 않았고(Simplicity First), 필요 시 별도 스토리에서 확장한다(§13).

---

## 5. 상태 모델 — 브라우저 메모리, 상태 전이

### 5.1 상태 데이터 형태 (in-memory 전용, §0 가정 5)

```javascript
// 상태는 탭의 메모리(JS 클로저/변수)에만 존재 — 영속 저장소 없음
state = {
  status: 'idle' | 'playing' | 'gameover',
  board: { cols: 20, rows: 20 },
  snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],  // head first
  direction: 'up' | 'down' | 'left' | 'right',
  pendingDirection: null,      // 다음 틱에 적용될 후보 방향(§3.5)
  food: { x: 0, y: 0 },
  score: 0,
  gameoverReason: null,        // 'wall' | 'self' | 'board-full' | null
};
```

이 객체는 순수 JS 런타임 변수로만 존재하며, `localStorage`/`sessionStorage`/서버 세션 어디에도 기록되지 않는다(§0 가정 5).

### 5.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `idle` | `playing` | "시작" 버튼 클릭 또는 `Enter`/`Space` | `snake`/`direction`/`food`를 §3.2 초기값으로 설정, `score=0`, 틱 루프 시작 |
| `playing` | `playing` (자기 전이) | 먹이 섭취(§3.3 step 4·7) | 뱀 길이 +1, `score += 10`, 먹이 재스폰 — 상태 자체는 변하지 않음 |
| `playing` | `gameover` | 벽 충돌 / 자기 충돌 / 보드 가득 참(§3.3 step 3·5·7) | `gameoverReason` 확정, 틱 루프 정지, 결과 화면(최종 점수) 표시 |
| `gameover` | `playing` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `idle → playing`과 동일한 전체 초기화(`score=0`부터 새 게임) |

> 정의되지 않은 전이(예: `idle`/`gameover` 상태에서 방향 입력)는 **무시**된다 — 모든 핸들러가 상태별 조건 가드(`if (state.status !== 'playing') return`)로 no-op 처리하며 예외를 던지지 않는다(§12.5).

### 5.3 상태별 수용 기준은 §11(AC-STATE-01~04)에서 정의한다.

---

## 6. 입력 모델 — 키보드 + 터치

### 6.1 통합 조작 원칙

방향 입력은 **키보드**와 **온스크린 터치 D-pad**(Pointer Events) 두 경로로 발생할 수 있으며, 둘 다 동일하게 `state.pendingDirection`을 갱신한다(§3.3 step 1에서 다음 틱에 적용). 입력 버퍼는 슬롯 1개만 유지하며, 한 틱 안에 여러 입력이 들어오면 마지막 입력만 `pendingDirection`에 남는다. 실제 반영 여부(유효성 검사)는 **틱 적용 시점**에 그 시점의 `direction`과 비교해 결정하므로(§3.5), 짧은 시간에 연속 입력이 들어와도 자기 목으로 반전하는 결과는 나오지 않는다(§12.1). 두 입력 경로 사이에 우선순위·잠금은 없다 — 마지막 입력이 항상 유효하다.

### 6.2 키보드 조작

| 키 | 동작 |
|---|---|
| `ArrowUp` / `W`/`w` | `pendingDirection = 'up'` |
| `ArrowDown` / `S`/`s` | `pendingDirection = 'down'` |
| `ArrowLeft` / `A`/`a` | `pendingDirection = 'left'` |
| `ArrowRight` / `D`/`d` | `pendingDirection = 'right'` |
| `Enter` / `Space` | `idle → playing` 시작, `gameover → playing` 재시작(§5.2). `playing` 상태에서는 무시(no-op) |

- 방향키 기본 스크롤 동작은 `preventDefault()`로 차단한다.
- 키 입력은 누르는 순간 1회만 `pendingDirection`을 갱신한다(연속 `keydown` 반복 이벤트도 동일 값을 재대입할 뿐 부작용 없음) — 이동 자체는 틱 기반이라 키를 누르고 있어도 매 프레임 이동하지 않는다(§12.6).
- `playing`이 아닌 상태에서 방향키 입력은 무시된다(§5.2).

### 6.3 터치 조작 — 온스크린 D-pad

- **레이아웃**: 4개 방향 버튼(▲ ◀ ▶ ▼)을 십자(D-pad) 모양으로 배치한다. 각 버튼은 최소 `44×44` CSS px(WCAG 2.5.5 터치 타깃 권장 크기) 이상으로 구성한다(§7).
- **입력 방식**: 각 버튼에 `pointerdown` 이벤트(Pointer Events — 터치/마우스 클릭 통합 처리)로 해당 방향을 `pendingDirection`에 설정한다. `pointerup`/`pointerleave`에서는 아무 동작도 하지 않는다 — 이산 격자 이동이라 "누른 순간 1회 반영"이면 충분하다(§6.1과 동일 원칙, §12.6).
- **`touch-action: manipulation`**: D-pad 버튼에 지정해 더블탭 확대(zoom)·기본 터치 지연을 방지한다.
- **연속 탭 대응**: 같은 버튼을 빠르게 여러 번 탭해도 `pendingDirection`이 마지막 값으로 계속 갱신될 뿐이므로 별도 디바운스가 필요 없다(§3.3 step 1이 매 틱 1회만 소비).
- **네이티브 `<button>` 사용**: `role="button"` div가 아닌 실제 `<button type="button">`을 사용해 키보드 포커스·클릭 이벤트도 자동으로 동작하게 한다(§7) — 즉, D-pad 버튼은 마우스 클릭·키보드(`Enter`/`Space` 포커스 시)·터치 세 방식 모두로 활성화 가능하다.

### 6.4 시작/재시작 컨트롤

- "시작" 버튼(`idle` 상태에 표시) — 클릭 또는 `Enter`/`Space`로 `playing` 전이.
- "다시 하기" 버튼(`gameover` 상태에 표시) — 클릭 또는 `Enter`/`Space`로 재시작.
- 두 버튼 모두 네이티브 `<button>`이며 D-pad와 동일하게 마우스/터치/키보드 3방식으로 조작 가능하다.

---

## 7. 접근성 요건

> 본 절은 task 수용 기준 2("키보드/터치 양쪽 조작과 최소 대비/포커스 가이드가 포함됨")에 직접 대응한다.

### 7.1 요건 표

| 요건 | 상세 | 검증 방법 |
|---|---|---|
| 키보드만으로 전체 조작 완결 | 시작/재시작/4방향 이동이 모두 키보드만으로 가능(§6.2, §6.4) — 마우스·터치 없이도 게임 시작부터 게임오버까지 완주 가능 | E2E: 키보드 입력만으로 1개 이상 먹이 섭취 후 의도적 충돌까지 재현 |
| 터치만으로 전체 조작 완결 | 시작/재시작/4방향 이동 버튼이 모두 터치 탭으로 가능(§6.3, §6.4) — 키보드 없이도 완주 가능 | E2E: 터치(Pointer Events) 입력만으로 동일 시나리오 재현 |
| Tab 순서 | 시작(또는 재시작) 버튼 → D-pad 4버튼(▲◀▶▼ 순서) — DOM 순서 = Tab 순서, 커스텀 tabindex 조작 없음 | 정적 마크업 검사: DOM 상 버튼 배치 순서 확인 |
| 최소 터치 타깃 | D-pad 버튼·시작·재시작 버튼 모두 `min-width/min-height: 44px` 이상(WCAG 2.5.5) | 정적 코드 검사: `styles.css`의 버튼 클래스 `min-width`/`min-height` 값 확인 |
| 포커스 가시성 | 모든 상호작용 버튼에 `:focus-visible` 스타일(`outline` + `box-shadow` 등 이중 표시 권장) 적용, `outline: none` 단독 사용 금지 | 정적 코드 검사: `styles.css`에서 `outline:\s*none`이 대응 커스텀 링 없이 단독 사용되지 않는지 확인 |
| 최소 대비(텍스트) | 본문 텍스트·점수·버튼 라벨은 배경 대비 **WCAG AA 4.5:1 이상**(일반 텍스트 기준) | 디자이너(BF-993) 색상 확정 후 대비 계산 도구(예: WebAIM Contrast Checker)로 검증 |
| 최소 대비(UI 컴포넌트) | 버튼 테두리·포커스 링 등 비텍스트 UI 요소는 인접 배경 대비 **WCAG AA 3:1 이상**(WCAG 1.4.11) | 상동 |
| 색만으로 구분하지 않음 | 게임오버 등 상태 안내는 항상 텍스트로 함께 표시(예: "게임 오버 · 점수 30") — 색상 변화만으로 상태를 전달하지 않음 | 정적 마크업 검사: 상태 텍스트 존재 확인 |
| 상태/결과 변경 announce | `#game-status` 요소에 `aria-live="polite"` 적용 — 대기→진행, 진행→게임오버(최종 점수 포함 문구) 전환 시 스크린리더가 안내받음. **매 틱/매 먹이 섭취마다는 announce하지 않음**(150ms 주기 announce는 사용 불가 수준의 소음이 되므로 §12.7에서 의도적으로 배제) | 정적 마크업 검사: `aria-live="polite"` 존재 확인 + E2E로 상태 전환 시 텍스트 갱신 확인 |
| 캔버스 대체 텍스트 | `<canvas id="board">`는 실시간 픽셀 렌더링이라 스크린리더로 의미 있게 전달 불가 — `aria-hidden="true"`로 표시하고, 게임 진행 정보(점수·상태)는 `#game-status`·`#score` 텍스트 요소로 별도 제공(§10.1) | 정적 마크업 검사: `<canvas>`에 `aria-hidden="true"` 확인 |
| 자동 포커스 없음 | 페이지 로드 시 특정 버튼에 자동 포커스를 주지 않음(스크린리더 사용자에게 예기치 않은 포커스 이동 방지) | 코드 리뷰: `main.js`에 로드 시점 `.focus()` 자동 호출 없음 확인 |
| `prefers-reduced-motion` | 뱀의 격자 이동 자체는 게임의 핵심 콘텐츠이므로 유지(스냅 이동은 원래 트랜지션이 없어 추가 처리 불필요). 다만 게임오버 화면 전환 등 **부가 연출**(페이드/펄스 등)이 있다면 `@media (prefers-reduced-motion: reduce)`로 제거 | `styles.css`에 해당 미디어쿼리 블록 존재 확인(부가 연출을 추가하는 경우에 한함) |
| `<noscript>` 폴백 | JS 비활성화 시 "이 게임은 JavaScript가 필요합니다" 안내 문구 표시(저장소 기존 모듈 공통 관례) | 정적 마크업 검사 |

### 7.2 접근성 이름(Accessible Name) 매핑

| 요소 | 접근성 이름 |
|---|---|
| `#btn-start` | 텍스트 콘텐츠 "시작" |
| `#btn-restart` | 텍스트 콘텐츠 "다시 하기" |
| `#dpad-up` | `aria-label="위로 이동 (↑ 또는 W)"` |
| `#dpad-down` | `aria-label="아래로 이동 (↓ 또는 S)"` |
| `#dpad-left` | `aria-label="왼쪽으로 이동 (← 또는 A)"` |
| `#dpad-right` | `aria-label="오른쪽으로 이동 (→ 또는 D)"` |
| `#game-status` | `aria-live="polite"` — 상태 전환 시 능동 announce |
| `#score` | 시각 표시 전용(비-live) — 값은 `#game-status`의 게임오버 문구에 최종 점수로 포함(§7.1) |

### 7.3 알려진 접근성 한계 (명시적 인정)

실시간 격자 이동 게임의 특성상, 스크린리더 사용자가 시각 사용자와 **동등한 실시간 게임 플레이 경험**을 가지기는 어렵다(진행 중 뱀·먹이 위치를 매 틱 announce하는 것은 UX상 불가능한 소음 수준이 된다, §12.7). 본 문서는 "완전한 비시각적 게임 플레이"가 아니라 "키보드/터치로 조작 가능 + 상태·결과를 인지 가능"한 수준의 접근성을 목표로 한다 — 이는 task 원문의 요구 수준("키보드/터치 양쪽 조작과 최소 대비/포커스 가이드")과 일치한다.

---

## 8. 보존 영역 — 기존 게임 모듈·공용 로직·빌드 설정 불변

> 본 절은 task 수용 기준 3("기존 게임 모듈·공용 로직·빌드 설정 미변경 원칙이 명시됨")에 직접 대응한다.

### 8.1 수정 금지 대상 (실측 경로)

| 경로 | 내용 | 불변 근거 |
|---|---|---|
| `snake/**`(`index.html`/`game.js`/`logic.js`/`styles.css`/`vendor/`) | 루트 Snake(BF-504 계열, 전체화면·Pixi 렌더링) | 완전히 별개 게임(§0 가정 1), 코드/상수/상태 모델 공유 없음 |
| `phase18-games/snake/**` | Phase 18 스네이크(BF-923 계열, 20×20 격자 클래식 스네이크) | 라우트(`/phase18-games/snake` vs `/demo/snake-canary`)가 다른 별개 구현. 상수 **값**만 참고했을 뿐(§0 가정 3) 코드는 전혀 공유·수정하지 않음 |
| `phase18-games/{pong,memory-match,breakout,breakout-lite,simon-says}/**` | 기존 phase18-games 형제 게임들 | 본 task와 무관, 참조·수정 대상 아님 |
| `src/app/demo/{counter,clock,status}/**` | 기존 `/demo/*` 형제 데모 모듈 | 디렉터리 컨벤션만 참고(§0 가정 1)했을 뿐 파일 자체는 건드리지 않음 |
| `src/features/tetris/**`, `src/pages/demo/tetris/**`, `src/routes/api/tetris/**` | 별도 앱 라우팅 계열(테트리스) | 본 task와 무관한 별개 하위시스템 |
| `package.json`(`dependencies`/`devDependencies`/`scripts`), `tsconfig*`, `prisma/**` | 저장소 공용 빌드/런타임 설정 | vanilla-static 제약(§9) — 신규 패키지·빌드 스크립트 추가 없이 기존 `http-server` 서빙만으로 동작해야 함 |
| `docs/planning/*.md`(본 문서 제외), `docs/design/*.md`, `docs/spec/*.md` | 기존 기획/디자인/스펙 문서 전반 | 본 문서(`docs/planning/snake-canary-BF-989.md`)와 독립된 신규 SSOT — 기존 문서 재해석·수정 없음 |
| `tests/*.test.js`(본 module 접두사 제외) | 기존 테스트 스위트 전체 | module명을 `snake-canary`로 분리해 네임스페이스 충돌 자체를 방지(TEST_SCOPE_POLICY `primary_module: snake-canary`와 일치) — 후속 tester는 `tests/snake-canary-*.test.js`만 신설 |

### 8.2 보존 영역 수용 기준 (Given/When/Then)

**AC-PRESERVE-01 (기존 게임 모듈 불변)**
> **Given** 본 기획 문서 및 후속 designer/dev/tester 산출물
> **When** `src/app/demo/snake-canary/**`, `docs/planning/snake-canary-BF-989.md`, `docs/design/snake-canary-*.md`(후속), `tests/snake-canary-*.test.js`(후속)를 신규 생성하면
> **Then** `snake/**`(루트) 및 `phase18-games/snake/**`의 어떤 파일도 diff에 포함되지 않는다.

**AC-PRESERVE-02 (형제 데모·공용 로직 불변)**
> **Given** `src/app/demo/snake-canary/`를 신설한다
> **When** 구현이 진행되어도
> **Then** `src/app/demo/counter/**`, `src/app/demo/clock/**`, `src/app/demo/status/**`의 어떤 파일도 diff에 포함되지 않으며, `snake-canary.js`/`main.js`는 이들 모듈을 import하지 않고 자기완결적으로 구현된다(형제 데모와의 코드 공유 없음).

**AC-PRESERVE-03 (빌드 설정 불변)**
> **Given** vanilla-static 제약
> **When** 신규 module을 추가하면
> **Then** `package.json`의 `dependencies`/`devDependencies`/`scripts`에 신규 항목이 추가되지 않고, 기존 `npm start`(`http-server`) 서빙 방식만으로 `/demo/snake-canary`가 정상 로드된다.

**AC-PRESERVE-04 (테스트 네임스페이스 분리)**
> **Given** module명이 `snake-canary`로 확정되었다
> **When** 후속 tester가 테스트 파일을 작성하면
> **Then** 파일명은 `tests/snake-canary-*.test.js` 패턴만 사용하고 기존 `tests/snake-*.test.js`(루트 게임)·`tests/phase18-snake-*.test.js`(Phase 18 게임) 네임스페이스와 겹치지 않는다.

검증 방법(후속 dev/tester가 구현 후 실행):
```sh
git diff --name-only <base>...<head> \
  | grep -E "^snake/|^phase18-games/|^src/app/demo/(counter|clock|status)/|^package\.json$"
# → 매치 0건이어야 통과
```

---

## 9. 외부 의존성 배제 확인

vanilla-static 제약(task 명시 "외부 API 없이 브라우저 메모리 상태만 사용")에 따라 다음을 명시적으로 배제한다.

| 확인 항목 | 값 |
|---|---|
| `fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 호출 | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건(상대경로 리소스만 사용) |
| 신규 npm 패키지/외부 CDN 스크립트 | 0건 — `package.json`에 신규 dependency 추가하지 않음(§8) |
| 서버 API 라우트 신규 생성(`/api/snake-canary*` 등) | 없음 |
| DB 스키마(Prisma 등) | 없음 |
| `localStorage`/`sessionStorage` 등 영속 저장 | 없음(§0 가정 5) — 상태는 전량 세션 in-memory |
| 인증/세션/로그인 | 불필요 — 공개 정적 페이지 |

검증 방법(후속 dev/tester가 구현 후 실행):
```sh
grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://|localStorage|sessionStorage" src/app/demo/snake-canary/*
# → 매치 0건이어야 통과
```

---

## 10. 화면 구성 요구사항

### 10.1 페이지 구조

```
<body>
 └─ <main class="snake-canary-page">
     ├─ <h1>              ← "스네이크 캐너리" 타이틀
     ├─ <p id="score">     ← "점수: {score}" (§4, 비-live 텍스트)
     ├─ <p id="game-status" aria-live="polite">   ← "대기 중" / "진행 중" / "게임 오버 · 점수 {score}"(§7.1)
     ├─ <canvas id="board" width="400" height="400" aria-hidden="true">  ← §3.1 논리 해상도
     ├─ <button id="btn-start">시작</button>        ← idle 상태에만 표시
     ├─ <button id="btn-restart">다시 하기</button>  ← gameover 상태에만 표시
     └─ <div class="dpad">  ← §6.3, ▲/◀/▶/▼ 4버튼 십자 배치
```

### 10.2 반응형 규칙

- 캔버스 CSS: `width: 100%; max-width: 400px; height: auto; aspect-ratio: 1 / 1;` — 논리 해상도(400×400)는 불변, 표시 크기만 뷰포트에 맞춰 축소된다.
- 스코어·상태 텍스트·보드·D-pad·시작/재시작 버튼은 세로 스택 배치를 기본으로 하며, 좁은 뷰포트(모바일)에서도 가로 스크롤이 발생하지 않아야 한다.
- 정확한 반응형 브레이크포인트·시각 스타일은 designer(BF-993) 재량이다(§13) — 본 문서는 구조(§10.1)와 최소 터치 타깃(§7.1)만 고정 계약으로 정의한다.

---

## 11. Acceptance Criteria (Given/When/Then)

### AC-01: task 수용 기준 1 — 게임 규칙·입력·상태 전이·점수 산정 정의

> **Given** task 원문 요구
> **When** planner가 `docs/planning/snake-canary-BF-989.md`를 작성하면
> **Then** 게임 규칙(§3 이동·먹이·성장·충돌), 입력(§6 키보드·터치), 상태 전이(§5 전이표), 점수 산정(§4)이 모두 검증 가능하게 정의된다.

### AC-02: task 수용 기준 2 — 접근성(키보드/터치 양쪽 + 최소 대비/포커스)

> **Given** 접근성 요건
> **When** 명세를 검토하면
> **Then** 키보드만으로 전체 조작(§7.1 1행), 터치만으로 전체 조작(§7.1 2행), 최소 대비 WCAG AA 4.5:1/3:1(§7.1), 포커스 가시성 가이드(§7.1)가 모두 §7에 포함되어 있다.

### AC-03: task 수용 기준 3 — 보존 영역 원칙 명시

> **Given** 보존 영역
> **When** 명세를 확인하면
> **Then** 기존 게임 모듈(`snake/`, `phase18-games/**`)·형제 데모(`counter`/`clock`/`status`)·공용 빌드 설정(`package.json` 등) 미변경 원칙이 §8에 표 및 AC-PRESERVE-01~04로 명시되어 있다.

### AC-RULE-01 (이동)

> **Given** 게임이 진행 중(`playing`)이고 유효한 `direction`이 확정되어 있다
> **When** 틱이 발생하면
> **Then** 뱀 머리가 해당 방향 벡터만큼 정확히 1칸 이동하고, 꼬리는 성장이 아닌 한 1칸 제거된다(§3.3).

### AC-RULE-02 (먹이 섭취·성장·점수)

> **Given** 다음 틱의 새 머리 위치가 현재 먹이 위치와 일치한다
> **When** 틱이 처리되면
> **Then** 꼬리가 제거되지 않아 뱀 길이가 1 증가하고, `score`가 정확히 10 증가하며, 먹이가 뱀이 점유하지 않은 임의의 새 셀로 재스폰된다(§3.3, §4).

### AC-RULE-03 (벽 충돌 → 게임오버)

> **Given** 다음 틱의 새 머리 위치가 보드 경계 밖이다
> **When** 틱이 처리되면
> **Then** 즉시 `status='gameover'`, `gameoverReason='wall'`로 전이되고 틱 루프가 정지한다(§3.4).

### AC-RULE-04 (자기 충돌 → 게임오버)

> **Given** 다음 틱의 새 머리 위치가 자기 몸(꼬리 vacate 규칙 적용 후, §12.3) 셀과 겹친다
> **When** 틱이 처리되면
> **Then** 즉시 `status='gameover'`, `gameoverReason='self'`로 전이된다(§3.4).

### AC-RULE-05 (방향 반전 방지)

> **Given** 뱀 길이가 2 이상이고 현재 `direction`이 확정되어 있다
> **When** 정확히 반대 방향 입력이 `pendingDirection`으로 들어온 상태에서 틱이 처리되면
> **Then** 해당 입력은 무시되고 `direction`이 유지된다(§3.5, §12.1).

### AC-STATE-01 (idle → playing)

> **Given** 사용자가 대기 화면(`status='idle'`)에 있다
> **When** "시작" 버튼을 클릭하거나 `Enter`/`Space`를 누르면
> **Then** `status`가 `playing`으로 전이되고 뱀이 초기 위치(§3.2)에, `score=0`으로 배치되며 틱 루프가 시작된다.

### AC-STATE-02 (playing → gameover, 3가지 사유)

> **Given** 게임이 진행 중이다
> **When** 벽 충돌·자기 충돌·보드 가득 참 중 하나가 발생하면
> **Then** `status`가 즉시 `gameover`로 전이되고 해당 `gameoverReason`(`'wall'`/`'self'`/`'board-full'`)이 설정되며 틱 루프가 정지하고 결과 화면에 최종 점수가 표시된다(§5.2, §12.4).

### AC-STATE-03 (gameover → playing, 재시작)

> **Given** 사용자가 게임오버 상태(`status='gameover'`)이다
> **When** `Enter`/`Space` 또는 "다시 하기" 버튼을 누르면
> **Then** `score=0`, 뱀이 초기 위치로 완전히 새로운 게임이 시작된다(§5.2).

### AC-STATE-04 (정의되지 않은 전이 무시)

> **Given** 사용자가 `idle` 또는 `gameover` 상태이다
> **When** 방향키 또는 D-pad 버튼(이동용)을 누르면
> **Then** 아무 상태 변화도 발생하지 않고 예외도 발생하지 않는다(no-op, §5.2, §12.5).

### AC-INPUT-01 (키보드/터치 동등성)

> **Given** 게임이 진행 중이다
> **When** 키보드 방향키(또는 WASD) 또는 D-pad 버튼 중 어느 쪽으로 입력해도
> **Then** 동일하게 `pendingDirection`이 갱신되며 두 입력 경로 간 우선순위 차이 없이 마지막 입력이 반영된다(§6.1).

### AC-A11Y-01 (접근성 — 키보드 단독 완주)

> **Given** 마우스/터치를 전혀 사용하지 않는다
> **When** 키보드만으로 시작 → 먹이 섭취 1회 이상 → 의도적 충돌까지 진행하면
> **Then** 모든 단계가 키보드 조작(§6.2, §6.4)만으로 완결된다.

### AC-A11Y-02 (접근성 — 터치 단독 완주)

> **Given** 키보드를 전혀 사용하지 않는다
> **When** 터치(탭)만으로 동일 시나리오를 진행하면
> **Then** 모든 단계가 터치 조작(§6.3, §6.4)만으로 완결된다.

---

## 12. Edge Case 및 실패 케이스 목록

### 12.1 짧은 시간 내 연속 방향 입력으로 인한 즉시 반전(더블턴) 방지

키보드/D-pad에서 한 틱 안에 방향 입력이 여러 번 발생해도(`pendingDirection`은 마지막 값으로만 덮어써짐), §3.3 step 1에서 유효성 검사(§3.5)를 **"틱 적용 시점의 실제 `direction`"** 기준으로 수행하므로, "위 → 오른쪽 → 아래" 같은 빠른 연속 입력이 한 틱 안에서 실제로는 "위 → 아래(정반대)"로 처리되어 뱀이 자기 목을 향해 반전하는 클래식 버그가 발생하지 않는다.

### 12.2 방향 미확정 상태(첫 틱 이전)

게임 시작 직후 `pendingDirection`은 `null`이며, `isValidTurn`이 `false`를 반환해 `state.direction`(초기값 `'right'`)이 그대로 사용된다 — 사용자가 아무 입력도 하지 않아도 뱀은 초기 방향으로 계속 이동한다.

### 12.3 꼬리 추적 이동은 자기 충돌이 아님(먹이 섭취 시 예외)

일반적인 이동에서는 꼬리가 이번 틱에 비워지므로, 새 머리가 "현재 꼬리였던 칸"으로 들어가는 것은 정상 이동이다(§3.4 `isSelfCollision`이 `growing=false`일 때 `snake.slice(0,-1)`로 꼬리를 충돌 대상에서 제외). 다만 같은 틱에 먹이도 섭취하는 경우(`growing=true`)에는 꼬리가 제거되지 않으므로 꼬리 셀도 충돌 대상에 포함된다.

### 12.4 보드가 뱀으로 가득 찬 경우(퍼펙트 클리어)

이론상 뱀 길이가 400(20×20 전체)에 도달하면 `spawnFood`가 빈 셀을 찾지 못해 `null`을 반환한다. 이 경우 예외를 던지지 않고 `status='gameover'`, `gameoverReason='board-full'`로 안전하게 전이한다 — 무한 루프나 크래시 없이 결정적으로 종료된다.

### 12.5 정의되지 않은 상태에서의 입력

`idle`/`gameover` 상태에서 방향 입력(키보드/D-pad)이 들어오는 경우는 무시(no-op)된다(§5.2) — `status !== 'playing'`인 동안은 틱 루프 자체가 동작하지 않으므로 이동에 영향이 없다.

### 12.6 키를 누르고 있어도 매 프레임 이동하지 않음

방향키를 계속 누르고 있어도(브라우저의 `keydown` 반복 이벤트) 뱀은 `TICK_INTERVAL_MS(150ms)`마다 정확히 1칸만 이동한다 — 키를 오래 누른다고 더 빨리 이동하지 않는다.

### 12.7 상태 announce의 announce 폭주 방지

`#game-status`의 `aria-live="polite"`는 상태 전이(idle→playing, playing→gameover) 시점에만 텍스트를 갱신한다. 먹이 섭취처럼 `playing` 내부에서 반복되는 이벤트(§5.2 자기 전이)는 `#game-status` 텍스트를 갱신하지 않는다 — 150ms 주기로 발생 가능한 이벤트를 매번 announce하면 스크린리더 사용자에게 사용 불가능한 소음이 되기 때문이다(§7.3).

### 12.8 게임오버 직후 재시작 연타

`gameover` 상태에서 `Enter`/`Space`나 "다시 하기"를 여러 번 빠르게 눌러도, 상태 가드(`if (state.status !== 'gameover') return`)로 인해 첫 번째 입력만 `playing`으로의 전이를 트리거하고 이후 입력은 이미 `playing`으로 바뀐 상태에서 무시된다 — 중복 초기화나 상태 꼬임이 발생하지 않는다.

### 12.9 뷰포트 크기가 매우 작아 D-pad와 보드가 동시에 안 보이는 경우

세로 스크롤은 허용하되(§10.2) 가로 스크롤은 발생하지 않아야 한다 — 정확한 최소 지원 뷰포트 폭은 designer(BF-993) 재량이며 본 문서는 강제하지 않는다(§13).

---

## 13. 비범위 (Out of Scope)

v1에서는 다음 기능을 구현하지 않는다. 필요 시 별도 스토리에서 처리한다:

| 항목 | 이유 |
|---|---|
| 일시정지(`paused`) 상태 | task 원문이 3개 상태(대기·진행·게임오버)만 요구(§0 가정 4) |
| 최고 점수(세션 누적) HUD | task 원문이 "점수 산정"만 요구, 최고 점수 언급 없음(§4) |
| 벽 통과(랩어라운드) 이동 | 클래식 규칙 채택, 추측성 확장 금지(§3.4) |
| 속도 증가/레벨 시스템 | 원문에 속도 요구 없음(§3.1 고정 틱) |
| 장애물·아이템·버프·CPU AI | 루트 `snake/`의 영역이며 본 게임은 순수 클래식 규칙만 다룸(§8) |
| 사운드 효과 | 원문에 언급 없음 |
| 스와이프 제스처 입력 | D-pad + 키보드로 충분(§0 가정 6), dev 재량으로 추가 가능하나 필수 아님 |
| 최고 점수/이력의 영속 저장(`localStorage` 등), 서버 API | §0 가정 5, 영속 저장 자체가 비범위 |
| 온라인 대전/멀티플레이어 | 네트워크 의존성 자체가 배제 대상(§9) |
| 디자인 mockup 산출물 | designer(BF-993) 담당 영역, 본 문서는 규칙/상태/입력/접근성/보존 계약만 정의 |
| 정확한 색상 팔레트·반응형 브레이크포인트 확정 | designer(BF-993) 재량(§10.2, §14) |

---

## 14. 파일 구조 및 기술 제약

| 파일(제안, 최종 분할은 dev 재량) | 역할 |
|---|---|
| `src/app/demo/snake-canary/index.html` | 마크업(§10.1), `<canvas id="board" width="400" height="400">`, `<script type="module" src="main.js">` |
| `src/app/demo/snake-canary/styles.css` | 반응형 레이아웃(§10.2), 최소 터치 타깃·포커스 링·대비(§7), 저장소 공통 디자인 토큰(`:root` CSS 변수) 재사용 권장 — 신규 색상 발명 최소화 |
| `src/app/demo/snake-canary/snake-canary.js` | 순수 함수(ES `export`): `tick`(§3.3), `isWallCollision`/`isSelfCollision`(§3.4), `spawnFood`(§3.4), `isValidTurn`(§3.5) — `node --test` 대상, module명 `snake-canary` |
| `src/app/demo/snake-canary/main.js` | DOM 바인딩(ES `import`): 틱 루프(`setInterval(tick, TICK_INTERVAL_MS)`), 키보드(§6.2)·D-pad(§6.3) 입력 처리, 캔버스 렌더링, 상태 전이(§5) 실행, `aria-live` 텍스트 갱신(§7) |

- 격자 좌표계(20×20, `CELL_SIZE=20`)와 상수(§3.1)는 렌더링 방식(canvas 2D 권장)과 무관하게 고정 계약이다.
- ES 모듈(`type="module"`) 패턴 필수 — `src/app/demo/*` 형제 선례를 따르며 `npm start`(`http-server`) 서빙을 전제로 한다(§0 가정 2). 루트 게임군의 UMD 패턴을 이식하지 않는다.
- 게임 루프는 `setInterval` 기반 고정 틱을 권장한다(이산 격자 이동은 연속 물리가 없어 더 단순한 구조로 충분).
- 테스트(후속 tester task 대상, BF-998): `node --test tests/snake-canary-*.test.js` —
  1. 이동/성장/꼬리 제거 로직(§3.3) 고정 입력값 검증
  2. 벽/자기 충돌 판정(§3.4, 꼬리 vacate 예외 §12.3 포함) 검증
  3. 먹이 스폰이 항상 빈 셀에서만 발생하는지(§3.4) 대량 반복 검증
  4. 방향 반전 방지(§3.5, §12.1) 검증
  5. 점수 갱신(§4) 경계값 검증
  6. 보드 가득 참(§12.4) 경계 케이스
  7. 상태 전이(§5.2, AC-STATE-01~04) 검증
  8. §9 정적 검사(외부 의존성 0건) + §8.2 `git diff` 기반 보존 영역 검사

---

## 15. 산출물 위치 및 참조 표 / 남은 모호함

### 15.1 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/snake-canary-BF-989.md`(본 문서, `owned_paths` 명시 경로, §0 가정 7) |
| 신규 디자인 mockup(후속 designer task) | `docs/design/snake-canary-BF-993.md`(예상, 경로 컨벤션 준수) — BF-993 담당, §13 |
| 신규 구현 대상(후속 developer task) | `src/app/demo/snake-canary/index.html`/`styles.css`/`snake-canary.js`/`main.js` — BF-995 담당, 본 문서 §3~§10이 계약 |
| 신규 테스트 대상(후속 tester task) | `tests/snake-canary-*.test.js` — BF-998 담당, 본 문서 §11~§12가 검증 기준 |
| 참조한 기존 선례(값·컨벤션만, 코드 재사용 없음) | `docs/planning/phase18-snake-BF-923.md`(격자 상수·틱·점수·D-pad 패턴, §0 가정 3·6), `docs/plan/counter-BF-859.md`(`src/app/demo/*` 디렉터리·ES 모듈 컨벤션, §0 가정 1·2) |
| 참조한 기존 코드(수정 없이 실측만) | `src/app/demo/counter/`(디렉터리 4파일 구성·ES 모듈 로드 확인), `phase18-games/snake/`(격자 상수 값 확인) |

### 15.2 남은 모호함 (운영자 확인 권장)

1. **BF-989 vs BF-991 번호 불일치**: §0 가정 7 — `owned_paths`가 지정한 파일명은 `snake-canary-BF-989.md`이나 실제 작업 티켓은 BF-991이다. 시스템 지정 경로를 그대로 따랐으나, 운영자가 의도한 상위 스토리 번호가 맞는지 확인이 필요하다.
2. **점수 공식(`SCORE_PER_FOOD=10`) 확정 여부**: §0 가정 3 — task 원문에 정확한 점수 값이 없어 저장소 내 기존 값(`phase18-games/snake`)을 재사용했다. 운영자가 다른 값을 원하면 §4 개정이 필요하다.
3. **최고 점수 HUD 필요 여부**: §4, §13 — task 원문이 "점수 산정"만 언급해 최고 점수를 비범위로 뒀다. 운영자가 최고 점수 표시를 원하면 §4·§5.1 확장이 필요하다.
4. **격자 크기(20×20)·이동 속도(150ms) 확정 여부**: §0 가정 3 — 기존 저장소 값을 재사용했다. "캐너리(가벼운 데모)" 성격상 더 작은 보드를 원할 경우 §3.1 상수 조정이 필요하다.
5. **일시정지 기능 필요 여부**: §0 가정 4, §13 — task 원문이 3개 상태만 요구해 제외했다. 운영자가 일시정지를 원하면 §5 상태 모델 확장이 필요하다.
6. **Jira 코멘트 등록**: §0 가정 8 — 본 세션에 Jira MCP가 할당되어 있지 않아 직접 코멘트를 등록하지 못했다. `worker_brokered_lifecycle_writes`에 따라 시스템이 본 문서 커밋과 이 세션의 최종 메시지를 근거로 Jira 코멘트를 등록할 것으로 예상한다.

---

*문서 종료 — [박기획] · BF-991*
