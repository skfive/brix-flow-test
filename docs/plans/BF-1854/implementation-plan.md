# Addiction Mini 구현 설계 (BF-1854)

> 본 문서는 **planner 산출물**이며 designer(BF-1855)·developer(BF-1856)가 그대로 따르는
> frozen blueprint 렌더입니다. 파일 소유권·상태·selector·token 은 frozen Execution Blueprint 가
> 유일한 권위이며, 본 문서는 이를 **재정의하지 않고 설명**합니다. 새 파일·새 역할을 추가하지 않습니다.

## 1. 개요

Addiction Mini 는 브라우저 카드 퍼즐입니다. 4×7(=28) 보드에 A~6, 4개 무늬(♥ ♦ ♣ ♠) 24장을 깔고
빈 칸 4개를 둡니다. 목표는 각 행을 **한 무늬로 A→6 오름차순 정렬**하는 것입니다(운영자 이미지의
"에이스부터 6까지 색깔별로 오름차순"). 빈 칸을 전략적으로 활용해 카드를 밀어 넣으며, 막히면
**한 번만** 카드를 섞을 수 있습니다. 모든 초기 보드는 **풀 수 있도록(solvable) 생성**됩니다.

- 파일 위치: `iteration-check3/`
- 정적 vanilla(ESM) 구성 — 빌드 도구 없음. serve root 는 저장소 루트.
- 평균 플레이 15분 규모의 "미니" 스코프이므로 로직·UI 를 최소한으로만 구현합니다.

## 2. 파일·소유권 계약 (frozen — 재정의 금지)

| 파일 | 소유자 | 역할 |
| --- | --- | --- |
| `docs/design/addiction-mini-BF-1854.md` | designer | 시각 명세(토큰·레이아웃) |
| `docs/design/addiction-mini-mockup.html` | designer | 정적 mockup |
| `iteration-check3/index.html` | developer | DOM 구조(아래 ID 계약) |
| `iteration-check3/styles.css` | developer | 스타일(아래 token·class 계약) |
| `iteration-check3/src/game.js` | developer | **순수 로직**(DOM 접근 금지) |
| `iteration-check3/src/ui.js` | developer | 렌더·이벤트(DOM ↔ game.js 연결) |
| `iteration-check3/tests/game.test.js` | developer | game.js 단위 테스트 |

> artifact-policy: 위 모든 파일은 **additive**. 기존 계약 selector·token 을 변경/재정의하지 않습니다.

## 3. UI 계약 (frozen — exact 값 그대로)

### 3.1 DOM ID (index.html)
`game-root`, `hud-score`, `hud-time`, `hud-moves`, `game-board`,
`btn-settings`, `btn-shuffle`, `btn-restart`, `win-overlay`

### 3.2 CSS class
`hud`, `hud__stat`, `board`, `cell`, `cell--empty`,
`card`, `card--anchor`, `card--red`, `card--black`,
`controls`, `controls__btn`, `win-banner`

### 3.3 상태(states)
`playing`, `selected`, `won`, `shuffle-disabled`

- `playing`: 기본 진행 상태. 이동 가능.
- `selected`: 키보드 포커스/선택된 카드에 표시. 색상만이 아니라 접근성 이름으로도 노출.
- `won`: 승리. `win-overlay`(`win-banner`) 노출, 보드 잠금.
- `shuffle-disabled`: 셔플 1회 사용 후. `btn-shuffle` 는 `aria-disabled='true'`.

### 3.4 디자인 토큰 (styles.css — exact)
```
--color-bg=#1b1030
--color-board-panel=#1a8a89
--color-hud-bg=#12203a
--color-hud-text=#e8f0f0
--color-card-face=#ffffff
--color-card-anchor=#c9c9c9
--color-suit-red=#d81e2c
--color-suit-black=#1a1a1a
--color-empty-cell=#0f5c5c
--space-card-gap=8px
```

### 3.5 접근성 (accessibility)
- 설정·셔플·재시작 버튼은 각각 `aria-label='설정'`, `'카드 섞기'`, `'재시작'` 을 가진다.
- 셔플 사용 후 버튼은 `aria-disabled='true'` 로 표시된다.
- 카드/빈 칸은 키보드 포커스와 Enter/Space 로 이동을 실행할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)
- 320px 이상 뷰포트에서 4×7 보드가 가로 overflow 없이 표시된다.
- 보드는 컨테이너 폭에 맞춰 카드 크기를 축소하되 셀 비율을 유지한다(예: `aspect-ratio` 유지).

### 3.7 HUD·컨트롤 매핑
- `hud-score` ← SCORE(올바르게 놓인 카드 수), `hud-time` ← TIME(mm:ss), `hud-moves` ← MOVES(이동 횟수).
- `controls` 안에 `btn-settings`, `btn-shuffle`, `btn-restart`(각 `controls__btn`).

## 4. 도메인 모델 (game.js)

DOM 을 전혀 참조하지 않는 순수 데이터/함수만 둡니다.

### 4.1 Card
```
Card = {
  id:    string,                 // 고유 식별자 (예: 'H3', 'S1')
  suit:  'hearts'|'diamonds'|'clubs'|'spades',
  color: 'red'|'black',          // hearts/diamonds=red, clubs/spades=black
  rank:  1..6                    // 1=A ... 6
}
```

### 4.2 Board
- 행 4 × 열 7 = 28 셀을 **행 우선(row-major) 1차원 배열**로 표현.
- `index = row * 7 + col` (0 ≤ index ≤ 27). `row = Math.floor(index/7)`, `col = index % 7`.
- 각 셀 값: `Card` 또는 `null`(빈 칸). 카드 24장 + 빈 칸 4개.

```
Board = Array<Card|null>   // length 28
```

### 4.3 GameState (ui.js 가 보유, game.js 는 Board 만 다룸)
```
GameState = {
  board:       Board,
  status:      'playing'|'won',
  selected:    number|null,      // 현재 선택/포커스 셀 index
  shuffleUsed: boolean,          // true 이면 shuffle-disabled
  moves:       number,
  score:       number,           // = 올바르게 놓인 카드 수 (checkWin 시 24)
  startedAt:   number|null       // 첫 이동 시각(ms). TIME 계산용
}
```

## 5. 순수 로직 함수 시그니처 (game.js — planning-contract, frozen)

developer 는 아래 시그니처를 그대로 구현하고, ui.js 는 아래 함수만 통해 로직에 접근합니다.

| 함수 | 시그니처 | 설명 |
| --- | --- | --- |
| `createBoard` | `createBoard() => Board` | 24장+4빈칸을 배치하고 `isSolvable` 이 true 인 보드를 반환(불가 시 재생성, 유한 시도). |
| `canMove` | `canMove(board, fromIndex, toIndex) => boolean` | `fromIndex` 카드를 빈 칸 `toIndex` 로 옮길 수 있는지 판정. |
| `isSolvable` | `isSolvable(board) => boolean` | 보드가 승리에 도달 가능한지 시뮬레이션으로 판정. |
| `shuffle` | `shuffle(board) => Board` | 올바른 접두(prefix)를 보존한 채 나머지를 재배치. 결과는 `isSolvable`=true 보장. |
| `checkWin` | `checkWin(board) => boolean` | 각 행이 한 무늬 A→6(0~5열) + 6열 빈 칸이면 true. |

### 5.1 canMove 규칙 (핵심)
`toIndex` 는 반드시 빈 칸이어야 하며, 그 빈 칸이 요구하는 카드는:
- **1열(col 0)** 빈 칸: 임의 무늬의 **Ace(rank 1)** 만 이동 가능.
- **그 외 열**: 왼쪽 이웃 셀(`toIndex-1`, 같은 행)을 본다.
  - 왼쪽이 빈 칸이면 → 이동 불가(dead gap).
  - 왼쪽 카드 rank 가 6이면 → 이동 불가(다음 rank 없음, dead gap).
  - 그 외 → 요구 카드 = `{ suit: 왼쪽.suit, rank: 왼쪽.rank + 1 }`.
- `board[fromIndex]` 가 요구 카드와 정확히 일치하면 true.

### 5.2 checkWin 규칙
- 각 행 r(0~3): 0~5열이 **같은 무늬** 이고 rank 가 1,2,3,4,5,6 순서, 6열은 `null`.
- 4개 행 모두 만족하면 true. (무늬 배정은 어느 행이 어떤 무늬든 무방.)

### 5.3 SCORE 계산 (ui.js 보조 규칙)
- 각 행에서 0열부터 시작하는 **Ace 시작 같은-무늬 오름차순 연속 접두**의 길이를 합산.
- 승리 시 24. `hud-score` 에 표시.

### 5.4 shuffle 규칙 (1회 제약)
1. 각 행의 올바른 접두(5.3 정의)를 **locked** 로 고정.
2. locked 가 아닌 카드들을 모아 Fisher-Yates 로 섞는다.
3. 각 행 locked 접두 바로 뒤에 빈 칸 1개를 두고, 나머지 셀을 섞인 카드로 채운다(남는 빈 칸 4개 유지).
4. 결과가 `isSolvable`=true 가 될 때까지 2~3을 유한 번(예: ≤200) 재시도. 실패 시 `createBoard` 수준의 보장으로 대체.
5. 호출자(ui.js)는 `shuffleUsed=true` 로 설정하고 `shuffle-disabled`/`aria-disabled='true'` 를 적용.

### 5.5 isSolvable 규칙
- 제한 깊이의 greedy + 소규모 backtracking 시뮬레이션. `canMove` 로 가능한 이동을 탐색해
  `checkWin` 도달이 존재하면 true. 24장 규모라 유계 탐색으로 판정 가능.
- deadlock(모든 빈 칸이 dead gap)이고 승리 아님 → 해당 경로 실패로 처리.

## 6. 모듈 경계 (Architecture)

```
index.html ──(DOM ids)── ui.js ──(순수 호출)── game.js
                             │
                          styles.css (token/class)
tests/game.test.js ──(import)── game.js
```

- **game.js**: 순수 로직. `document`/`window` 접근 금지. 입출력은 `Board`/`Card`/boolean 만.
- **ui.js**: DOM 렌더·이벤트만. 상태(GameState) 보유. `game.js` 의 5개 함수만 호출.
  - 렌더: `game-board` 에 28 셀 렌더(`cell`, 빈 칸은 `cell--empty`, 카드는 `card`+`card--red|card--black`).
  - 빈 칸이 요구하는 카드를 앵커로 표기할 때 `card--anchor` 사용(이미지의 "다음 필요 rank" 표시).
  - HUD/컨트롤 갱신, `selected`/`won`/`shuffle-disabled` 클래스·aria 토글.
  - 이동 상호작용: 카드 클릭/Enter/Space → 유효한 빈 칸 대상이 있으면(빈 칸들에 대해 `canMove` 검사)
    이동 실행, `moves++`, SCORE·`checkWin` 갱신.
- **index.html**: §3.1 ID 를 가진 정적 골격. `<script type="module">` 로 ui.js 로드.
- **styles.css**: §3.4 토큰 + §3.2 class.
- **tests/game.test.js**: game.js 순수 함수 단위 테스트(§9).

## 7. 사용자 시나리오

1. 페이지 진입 → 풀 수 있는 보드가 렌더되고 HUD 는 SCORE 0 / TIME 0:00 / MOVES 0.
2. 플레이어가 빈 칸의 왼쪽 이웃 다음 카드를 클릭 → 그 카드가 빈 칸으로 이동, MOVES 증가, SCORE 갱신.
3. 진행이 막히면 `btn-shuffle` 클릭 → 접두 보존 재배치(1회). 이후 버튼 비활성.
4. 모든 행이 무늬별 A→6 정렬 → `win-overlay` 노출, 보드 잠금.
5. `btn-restart` 클릭 → 전체 초기화(새 보드, 상태·HUD·셔플 재사용 가능).

## 8. Acceptance Criteria (Given/When/Then)

- **AC1 (보드 생성/solvable)**
  Given 페이지 로드, When `createBoard()` 실행, Then 24장+빈칸4 배치이며 `isSolvable(board)===true`.
- **AC2 (이동 규칙 — 정상)**
  Given 빈 칸의 왼쪽 카드가 N(<6, 무늬 S), When 그 옆 빈 칸에 대해 (S, N+1) 카드로 `canMove`,
  Then true 이며 이동 후 SCORE·`checkWin` 재계산.
- **AC3 (이동 규칙 — 1열)**
  Given 1열 빈 칸, When Ace 로 `canMove`, Then true; Ace 가 아니면 false.
- **AC4 (dead gap)**
  Given 빈 칸의 왼쪽이 빈 칸이거나 rank=6, When 임의 카드로 `canMove`, Then false.
- **AC5 (승리 판정)**
  Given 4개 행이 각 한 무늬 A→6(0~5열)+6열 빈칸, When `checkWin`, Then true; 하나라도 어긋나면 false.
- **AC6 (셔플 1회)**
  Given `shuffleUsed=false` 로 막힌 보드, When `btn-shuffle`, Then 접두 보존 재배치(solvable)하고
  버튼 `aria-disabled='true'`+`shuffle-disabled`; 재클릭은 무시.
- **AC7 (재시작 초기화)**
  Given 임의 상태(진행/승리), When `btn-restart`, Then 새 solvable 보드, SCORE·MOVES 0/TIME 0:00,
  `won`/`shuffle-disabled` 해제, `btn-shuffle` 재사용 가능(불변식: 초기화·취소·실패 후 상태·진행표시
  초기값 복원 및 주 control 재사용 가능).
- **AC8 (접근성)**
  Given 각 컨트롤, Then §3.5 aria-label 존재; 카드/빈 칸은 키보드 포커스+Enter/Space 이동;
  상태는 텍스트로도 노출.
- **AC9 (반응형)**
  Given 뷰포트 320px, Then 4×7 보드 가로 overflow 없음, 셀 비율 유지.
- **AC10 (UI 계약 준수)**
  Given 렌더된 화면, Then §3.1 ID·§3.2 class·§3.4 토큰 exact 값 사용.

## 9. 테스트 명세 (tests/game.test.js — 단위)

- `canMove`: 1열 Ace 허용/비-Ace 거부, N→N+1 같은무늬 허용, 다른무늬·rank불일치 거부, dead gap(왼쪽 빈칸/rank6) 거부.
- `checkWin`: 완성 보드 true, 무늬 혼합/순서 오류/6열 비어있지 않음 false.
- `createBoard`: 길이 28, 카드 24·빈칸 4, `isSolvable`=true.
- `isSolvable`: 명백히 완성된 보드 true, 인위적 deadlock 보드 false.
- `shuffle`: locked 접두 보존, 카드 수 보존, 결과 `isSolvable`=true.

> 실행: `npm test`(focused). game.js 는 ESM 이므로 `game.test.js` 에서 `import` 로 로드.

## 10. Edge case / 실패 케이스

- 1열 빈 칸 ← Ace 만. 그 외 빈 칸 왼쪽이 빈칸/rank6 → 이동 불가(dead gap).
- 모든 빈 칸 dead gap & 미승리 → 막힘: 셔플 미사용이면 셔플 유도, 사용했으면 재시작 유도.
- 셔플 이미 사용 → 클릭 무시(`aria-disabled`). 중복 실행 금지.
- 승리 후 보드 잠금 — 재시작만 허용.
- 재시작은 진행/승리 어디서든 전체 초기값 복원.
- `createBoard`/`shuffle` 의 solvable 재시도는 유한 상한을 두어 무한 루프 방지.

## 11. downstream handoff 요약

- **designer(BF-1855)**: §3 UI 계약(ID·class·token·접근성·반응형)을 시각 명세/mockup 으로 구현.
  selector·token 을 변경·재정의하지 않음.
- **developer(BF-1856)**: §4~6 도메인·시그니처·모듈 경계로 `iteration-check3/` 구현, §9 테스트 작성.
  game.js DOM 분리, §3 계약 exact 준수.
