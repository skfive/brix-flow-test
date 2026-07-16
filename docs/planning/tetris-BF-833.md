# 테트리스 게임 규칙·점수/레벨 정책·상태 시나리오 명세 — BF-833

> 작성자: [박기획] (planner) · 작성일 2026-07-15
> 관련 티켓: BF-834 (본 planner task) · BF-833 (부모 Epic/Story)
> 대상: 기존 `tetris/` 프론트엔드 모듈 (BF-639 디자인 → BF-642 개발 계열, 이미 구현·배포됨) + 신규 백엔드 데모 기능 `/demo/tetris` (leaderboard/scores API — **미구현, 본 문서가 최초 스펙**)
> tech-stack 태그: `typescript-monorepo` (Epic 설명 태그 — 신규 백엔드 영역에 적용. 기존 `tetris/` 프론트엔드는 `vanilla-static` 그대로 유지)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 (모호하여 명시함) — "backend repo" 표기:** Epic 설명은 "대상 경로는 backend repo 의 데모 기능 `/demo/tetris`"라고 기술하지만, 본 저장소(`brix-flow-test`)는 harness 상 `backend` 레이블로 분류된 **단일** 저장소이며 별도의 backend 전용 저장소가 존재하지 않는다(`src/`에 `counter.ts`/`config/env.ts`/`utils/slugify.ts` 등 소규모 TS 유틸만 있고, HTTP 서버·DB 드라이버·API 라우터는 0건). 따라서 본 문서는 "이 저장소 안에 신규로 추가될 백엔드 데모 기능"으로 해석하여 스펙을 작성한다. 만약 실제로 별도 backend 저장소를 의도한 것이라면 Jira 코멘트로 확인이 필요하다(§12).

**가정 2 — 게임 규칙/점수/레벨/상태는 이미 구현되어 있다:** 7-tetromino·회전(SRS 월킥)·충돌·라인 클리어·점수·레벨·상태 전이는 `tetris/logic.js`(순수 함수, BF-642)와 `tetris/main.js`(상태 머신)에 **이미 결정론적으로 구현되어 있고 `tests/tetris-BF642.test.js`로 검증되어 있다.** 본 문서 §3~§5는 이 기존 구현을 **역-공식화(reverse-formalize)**한 것이며 코드를 새로 설계하지 않는다(Simplicity First — 이미 동작하는 로직을 재발명하지 않음). 후속 dev가 `/demo/tetris` 백엔드를 만들 때 클라이언트 규칙과 **불일치를 일으키지 않도록** 이 문서를 SSOT로 참조한다.

**가정 3 — API/DB(§6~§7)는 신규(forward) 설계다:** 현재 리더보드/점수 영속화는 `tetris/storage.js`의 `localStorage`(`tetris:highScore`, 기기 로컬 1인용 최고점)뿐이며 서버 API·DB는 전무하다. §6~§7은 **처음 정의되는 신규 스펙**이다. 기존 `tetris/` 프론트엔드 코드·`tetris:highScore` localStorage 키는 본 문서 범위에서 변경하지 않는다(다른 페르소나 파일 소유권 영역 — 담당 파일은 본 문서 1개뿐).

**가정 4 — 파일 소유권:** 본 planner task(BF-834)의 담당 파일은 `docs/planning/tetris-BF-833.md` 1개뿐이다. `tetris/*` 코드, `tests/tetris-BF642.test.js`, `docs/design/tetris-BF-639.md`는 수정 금지 대상이며 읽기 전용 참조만 했다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 보드·테트로미노·충돌·회전·라인 클리어](#3-게임-규칙--보드테트로미노충돌회전라인-클리어)
4. [점수·레벨 진행 정책](#4-점수레벨-진행-정책)
5. [상태 전이 — 시작/일시정지/게임오버/재시작](#5-상태-전이--시작일시정지게임오버재시작)
6. [API 스펙 — `/demo/tetris` leaderboard·scores](#6-api-스펙--demotetris-leaderboardscores)
7. [DB 스펙 — `TetrisScore`](#7-db-스펙--tetrisscore)
8. [Acceptance Criteria 매핑](#8-acceptance-criteria-매핑)
9. [Edge Case 목록](#9-edge-case-목록)
10. [비범위 (Out of Scope)](#10-비범위-out-of-scope)
11. [산출물 위치 및 참조 표](#11-산출물-위치-및-참조-표)
12. [남은 모호함 (운영자 확인 권장)](#12-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

테트리스 챌린지의 게임 규칙·점수/레벨 정책·상태 전이를 결정론적(같은 입력 → 항상 같은 출력)으로 문서화하고, `/demo/tetris` 백엔드 데모(leaderboard/scores)의 API/DB 스펙을 개발 착수 가능한 수준으로 정리하여 후속 디자인·개발의 SSOT를 만든다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 게임 규칙·점수·레벨·상태 전이(§3~§5) | 기존 `tetris/` 구현의 공식 스펙화 — 코드 변경 없음 |
| API/DB(§6~§7) | 신규 `/demo/tetris` 백엔드 데모 스펙 — 미구현, 본 문서가 최초 정의 |
| 프론트엔드 변경 | 없음(본 task 범위 아님) — `tetris/`가 신규 API를 호출하도록 연동하는 작업은 별도 후속 task |

### 1.3 전제 조건

- 참조 소스: `tetris/logic.js`(순수 함수 22개), `tetris/main.js`(상태 머신·이벤트 바인딩), `tetris/storage.js`(localStorage 어댑터), `tests/tetris-BF642.test.js`(단위 테스트 60+ 케이스)
- 보드 크기: 10열 × 20행 (고정, 변경 불가)
- 랜덤 피스 생성은 `Math.random()` 균등분포이며 표준 7-bag 랜덤라이저가 **아니다**(§9 edge case 참고 — 결정론적 스펙 작성 시 이 비표준 동작도 있는 그대로 기술한다).

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 테트로미노(Tetromino) | 4칸으로 이루어진 블록 조각. `I/O/T/S/Z/J/L` 7종 고정 |
| 스폰(Spawn) | 새 피스가 보드 상단에 생성되는 것. `x = floor((10 - 피스너비)/2)`, `y = 0` |
| 고스트 피스(Ghost) | 현재 피스가 즉시 낙하했을 때 도달할 위치를 미리보기로 표시 |
| 락(Lock) | 피스가 더 이상 아래로 이동 불가할 때 보드에 고정되는 것 |
| 라인 클리어(Line Clear) | 한 행(row)의 10칸이 모두 채워져 제거되는 것 |
| SRS 월킥(Wall Kick) | 회전 시 충돌하면 정의된 오프셋 목록을 순서대로 시도해 회전을 성사시키는 보정 규칙 |
| 소프트 드롭(Soft Drop) | 사용자가 아래 방향키/키를 눌러 1칸씩 수동 하강시키는 동작 |
| 하드 드롭(Hard Drop) | Space 키로 고스트 위치까지 즉시 낙하시키는 동작 |
| 게임오버(Game Over) | 새로 스폰된 피스의 초기 위치가 기존 보드 블록과 충돌하는 상태 |

---

## 3. 게임 규칙 — 보드·테트로미노·충돌·회전·라인 클리어

### 3.1 보드 및 7종 테트로미노

| 항목 | 값 |
|---|---|
| 보드 크기 | 10열(COLS) × 20행(ROWS), 셀 값은 `null`(빈칸) 또는 피스 타입 문자열 |
| 테트로미노 7종 | `I`, `O`, `T`, `S`, `Z`, `J`, `L` — `tetris/logic.js` `TETROMINOES`에 초기 회전(rotation=0) shape 고정 정의 |
| 랜덤 선택 | `PIECE_TYPES`(7개) 중 `Math.floor(Math.random() * 7)` 균등분포 — 매 스폰마다 독립 시행(7-bag 아님, §9.1) |
| 스폰 좌표 | `x = floor((10 - shape너비) / 2)`, `y = 0` (회전 0 상태 기준) |

### 3.2 충돌 판정 (`isValidPosition(board, shape, px, py)`)

다음 중 하나라도 해당하면 유효하지 않은 위치(충돌):

1. 블록 셀의 열 좌표가 `[0, 10)` 범위를 벗어남
2. 블록 셀의 행 좌표가 `20` 이상(바닥 아래)
3. 블록 셀의 행 좌표가 `0` 미만(보드 위) — **이 경우는 허용**(스폰 시 위쪽으로 넘치는 것은 충돌 아님)
4. 블록 셀 위치의 보드 값이 `null`이 아님(이미 다른 블록 존재)

> 결정론: 동일한 `(board, shape, px, py)` 입력에 대해 항상 동일한 boolean을 반환하는 순수 함수.

### 3.3 이동 규칙

| 동작 | 함수 | 규칙 |
|---|---|---|
| 좌/우 이동 | `movePiece(board, piece, dx)` | `dx=±1`. 이동 후 위치가 유효하면 이동, 아니면 원위치 유지(무시, 에러 아님) |
| 소프트 드롭 1칸 | `softDrop(board, piece)` | `y+1` 위치가 유효하면 `{piece: y+1, locked:false}`, 아니면 `{piece: 그대로, locked:true}` |
| 하드 드롭 | `hardDrop(board, piece)` | 고스트 Y(`getGhostY`)까지 즉시 이동, `cellsDropped = ghostY - 원래y` 반환 |
| 고스트 Y 계산 | `getGhostY(board, piece)` | 현재 위치부터 `y+1`이 유효한 동안 반복 하강 → 최종 정지 y |

### 3.4 회전 규칙 (SRS 월킥 — 시계/반시계)

1. `rotateCW`/`rotateCCW`: shape 배열을 90° 회전한 새 shape 생성(행렬 전치 기반, 좌표 이동 없음)
2. 회전 후 **월킥 오프셋 목록**을 순서대로 시도하여 첫 번째로 유효한 위치를 채택:
   - `O` 피스: 킥 없음(`[[0,0]]` 1개만) — 정사각형은 회전해도 형태 불변
   - `I` 피스: 전용 `WALL_KICKS_I` 표(회전 상태 0→1→2→3→0 별 5개 오프셋)
   - `J/L/S/T/Z` 피스: 공용 `WALL_KICKS_JLSTZ` 표(회전 상태별 5개 오프셋)
3. 5개 오프셋을 모두 시도해도 유효한 위치가 없으면 **회전 실패**(원래 shape/좌표/rotation 유지, `tryRotate`가 `null` 반환)
4. 회전 상태(`rotation`)는 `0→1→2→3→0`(시계) 또는 역순(반시계)으로 mod 4 순환

> 결정론: 회전 성공 여부·최종 좌표는 `(board, piece, clockwise)` 입력에 의해 유일하게 결정된다. 월킥 시도 순서가 고정되어 있으므로 재현 가능하다.

### 3.5 락(고정) 및 라인 클리어

1. 피스가 `softDrop` 결과 `locked:true`가 되면 `placePiece(board, piece)`로 보드에 영구 고정(셀 값 = 피스 타입 문자열)
2. `clearLines(board)`: 10칸이 모두 non-null인 행을 전부 찾아 제거(`cleared` 카운트), 제거된 수만큼 보드 상단에 빈 행을 추가하여 20행 유지
3. 한 번의 락으로 **동시에 최대 4행**까지 클리어 가능(라인 클리어 수 0~4)
4. 클리어된 즉시 다음 피스가 스폰(`spawnNext`) — 애니메이션(180ms 플래시)은 화면 표시용이며 게임 로직 진행을 막지 않음(§9.2 참고)

---

## 4. 점수·레벨 진행 정책

### 4.1 라인 클리어 점수 (결정론적 공식)

```
calcScore(linesCleared, level) = LINE_SCORES[linesCleared] * level
LINE_SCORES = [0, 100, 300, 500, 800]   // index = 동시 클리어 라인 수
```

| 동시 클리어 라인 수 | 기본 점수(level=1) | 명칭(참고) |
|---|---|---|
| 0 | 0 | (클리어 없음, 점수 가산 없음) |
| 1 | 100 | Single |
| 2 | 300 | Double |
| 3 | 500 | Triple |
| 4 | 800 | Tetris |

- 레벨이 오를수록 배수 적용: 예) level 3에서 4줄(Tetris) 클리어 = `800 * 3 = 2400`점
- `linesCleared`가 0~4 범위를 벗어나는 입력은 게임 로직상 발생하지 않음(한 번의 락에서 최대 4행만 동시 제거 가능 — §3.5)

### 4.2 레벨 진행 임계

```
calcLevel(totalLines) = floor(totalLines / 10) + 1
```

| 누적 클리어 라인 수 | 레벨 |
|---|---|
| 0 ~ 9 | 1 |
| 10 ~ 19 | 2 |
| 20 ~ 29 | 3 |
| ... | ... |
| `10*(N-1)` ~ `10*N - 1` | N |

- 레벨은 **누적 라인 수에서 파생**되는 값이며 별도 저장/증감 로직이 없다(레벨업 이벤트마다 재계산이 아니라 매 클리어 후 `totalLines`로부터 다시 계산 — 상태 불일치 불가능).
- 하한 없음(라인 0 → 레벨 1), 상한 없음(무한 누적 가능).

### 4.3 낙하 속도(레벨 연동)

```
DROP_INTERVALS = [800, 717, 633, 550, 467, 383, 300, 217, 133, 100]  // ms, index 0 = level 1
calcDropInterval(level) = DROP_INTERVALS[min(level - 1, 9)]
```

- 레벨 10 이상은 모두 `100ms`로 고정(하한 캡).
- 소프트 드롭 중(`softDropping=true`)에는 중력 tick 간격이 `min(50, calcDropInterval(level))`로 가속된다 — 단, 이 가속된 중력 하강 자체는 점수를 가산하지 않는다(§4.4의 명시적 입력 이벤트만 가산).

### 4.4 소프트/하드 드롭 점수 규칙 (결정론적, 입력 이벤트 기준)

| 드롭 종류 | 트리거 | 점수 규칙 | 비고 |
|---|---|---|---|
| 소프트 드롭 | `ArrowDown`/`S` **keydown 이벤트 1회당** | 피스가 1칸 하강에 성공하면 `+1점` | 락이 발생하면(더 내려갈 곳 없음) 점수 가산 없이 즉시 락 처리 |
| 하드 드롭 | `Space` keydown | `cellsDropped * 2점` (`cellsDropped = ghostY - 현재y`) | 하드 드롭은 keydown 즉시 락까지 처리(락 애니메이션 대기 없음) |
| 자동 중력 하강 | 게임 루프(레벨 기반 tick) | **점수 가산 없음** | 소프트 드롭 가속 중에도 자동 tick 하강분은 무점수 — §4.3 참고 |

> 결정론 주의: 소프트 드롭 점수는 "눌려있던 시간"이 아니라 "keydown 이벤트 횟수"에 비례한다. OS 키 반복(auto-repeat) 설정에 따라 동일 시간 눌러도 이벤트 횟수가 달라질 수 있으므로, 리더보드 점수를 서버에서 재현·검증하려면 이 이벤트 기반 특성을 반드시 고려해야 한다(§6.3, §9.3).

### 4.5 최고점(로컬) 갱신 규칙 — 기존 동작 참고

- 라인 클리어로 점수가 오를 때마다 `state.score > state.highScore`이면 즉시 `localStorage["tetris:highScore"]`에 저장(§7의 서버 리더보드와는 **별개** — 동기화 로직 없음, §10 비범위).

---

## 5. 상태 전이 — 시작/일시정지/게임오버/재시작

### 5.1 상태 목록

| 상태 | 의미 |
|---|---|
| `start` | 시작 화면(게임 미시작 또는 메뉴로 복귀) |
| `playing` | 게임 진행 중 — 게임 루프·입력 처리 활성 |
| `paused` | 일시정지 — 게임 루프 정지, 입력 대부분 비활성(재개/재시작/메뉴 제외) |
| `gameover` | 게임 종료 — 신규 피스 스폰이 기존 보드와 충돌한 결과 |

### 5.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `start` | `playing` | "게임 시작" 버튼 클릭 **또는** `Enter`/`Space` keydown(status=start일 때만) | 보드 초기화, `score=0, lines=0, level=1, hold=null, holdUsed=false`, 첫 피스 스폰, 게임 루프 시작 |
| `playing` | `paused` | `P` **또는** `Escape` keydown(status=playing일 때만) | 게임 루프 정지(`requestAnimationFrame` 재호출 안 함), 일시정지 오버레이 표시, 재개 버튼에 포커스 |
| `paused` | `playing` | `P`/`Escape` keydown **또는** "계속하기"(`btn-pause-resume`) 클릭(status=paused일 때만) | `lastDrop`을 현재 시각으로 재설정 후 게임 루프 재개(보드/점수 그대로 유지) |
| `paused` | `playing` (재시작) | `R` keydown **또는** "다시 시작"(`btn-pause-restart`) 클릭(status=paused일 때만) | `start→playing`과 동일한 전체 초기화 수행(§5.2 첫 행과 동일 부수 효과) |
| `paused` | `start` | "메뉴로"(`btn-pause-quit`) 클릭 | 진행 중이던 보드/점수 폐기, 시작 화면 복귀(최고점 라벨만 갱신) |
| `playing` | `gameover` | **자동**: 락 후 다음 피스 스폰 시 스폰 위치가 기존 보드와 충돌(`isGameOver`=true) | 최종 점수/레벨/라인/최고점 요약 표시, 게임 루프 자동 정지(status≠playing이므로 루프가 스스로 종료) |
| `gameover` | `playing` (재시작) | `R` keydown **또는** "새 게임"(`btn-go-newgame`) 클릭 | `start→playing`과 동일한 전체 초기화 |
| `gameover` | `start` | "메뉴로"(`btn-go-quit`) 클릭 | 시작 화면 복귀 |

> 정의되지 않은 전이(예: `start`에서 `P` keydown, `gameover`에서 좌우 이동 키)는 **무시**된다 — 모든 입력 핸들러가 `if (state.status !== "playing") return` 또는 상태별 조건 분기로 가드되어 있어 예외를 던지지 않고 no-op 처리된다.

### 5.3 상태별 수용 기준 (Given/When/Then)

**AC-STATE-01 (start → playing)**
> **Given** 사용자가 시작 화면(`status=start`)에 있다
> **When** "게임 시작" 버튼을 클릭하거나 `Enter`/`Space`를 누르면
> **Then** `status`가 `playing`으로 전이되고 `score=0, lines=0, level=1`로 초기화된 새 보드와 첫 피스가 렌더링되며 게임 루프가 시작된다.

**AC-STATE-02 (playing → paused)**
> **Given** 사용자가 게임 진행 중(`status=playing`)이다
> **When** `P` 또는 `Escape`를 누르면
> **Then** `status`가 `paused`로 전이되고 게임 루프(중력 하강)가 정지하며, 보드/점수/레벨/현재 피스 상태는 정지 시점 그대로 보존된다.

**AC-STATE-03 (paused → playing, 재개)**
> **Given** 사용자가 일시정지 상태(`status=paused`)이다
> **When** `P`/`Escape` 또는 "계속하기" 버튼을 누르면
> **Then** `status`가 `playing`으로 전이되고, 일시정지 이전의 보드/점수/레벨/피스 위치가 그대로 유지된 채 낙하 타이머만 재설정되어 게임이 재개된다(일시정지 동안 경과 시간이 낙하 판정에 영향을 주지 않는다).

**AC-STATE-04 (paused → playing, 재시작)**
> **Given** 사용자가 일시정지 상태(`status=paused`)이다
> **When** `R` 또는 "다시 시작" 버튼을 누르면
> **Then** 진행 중이던 점수/보드가 폐기되고 `status=playing`, `score=0, lines=0, level=1`로 완전히 새 게임이 시작된다.

**AC-STATE-05 (playing → gameover)**
> **Given** 사용자가 게임 진행 중(`status=playing`)이며 보드 상단 근처까지 블록이 쌓여 있다
> **When** 현재 피스가 락되어 다음 피스가 스폰되는데 그 스폰 위치가 기존 보드 블록과 충돌하면
> **Then** `status`가 `gameover`로 자동 전이되고, 최종 점수·레벨·라인 수·최고점 갱신 여부가 요약 화면에 표시되며, 사용자 입력에 의한 것이 아니라 게임 로직에 의해 결정론적으로(같은 보드 상태·같은 스폰 위치 조합이면 항상) 발생한다.

**AC-STATE-06 (gameover → playing, 재시작)**
> **Given** 사용자가 게임오버 상태(`status=gameover`)이다
> **When** `R` 또는 "새 게임" 버튼을 누르면
> **Then** `status=playing`으로 전이되고 `score=0, lines=0, level=1`의 완전히 새로운 게임이 시작된다(직전 게임 결과는 저장 규칙 §7 을 따르는 백엔드 제출 없이는 소실됨 — 프론트엔드 자체 영속화는 최고점 localStorage 뿐).

**AC-STATE-07 (paused/gameover → start)**
> **Given** 사용자가 일시정지 또는 게임오버 상태이다
> **When** "메뉴로" 버튼을 누르면
> **Then** `status=start`로 전이되고 시작 화면이 표시되며 최고점 라벨이 최신 `localStorage` 값으로 갱신된다.

---

## 6. API 스펙 — `/demo/tetris` leaderboard·scores

> **신규(§0 가정 3)** — 아직 구현되지 않았으며 프레임워크(Express/Fastify 등)는 dev 재량. 아래는 경로/메서드/요청·응답 스키마/검증 규칙/상태 코드에 대한 계약(contract)이다.

### 6.1 공통 규칙

- Base path: `/demo/tetris/api`
- 포맷: JSON only (`Content-Type: application/json`), 응답도 동일
- 인증: 없음(데모 기능 — 익명 제출). 남용 방지는 §10 비범위
- 에러 응답 공통 포맷:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "playerName 은 1~20자여야 합니다", "field": "playerName" } }
  ```
  `code`는 `VALIDATION_ERROR | NOT_FOUND | INTERNAL_ERROR` 중 하나.

### 6.2 `POST /demo/tetris/api/scores` — 점수 제출

**요청 바디**

| 필드 | 타입 | 필수 | 검증 규칙 |
|---|---|---|---|
| `playerName` | string | Y | trim 후 1~20자. 패턴 `/^[\p{L}\p{N} _-]{1,20}$/u`(한글/영문/숫자/공백/`_`/`-`만 허용, HTML 태그·특수문자 차단) |
| `score` | integer | Y | `0` 이상 정수 |
| `level` | integer | Y | `1` 이상 정수, **서버가 재검증**: `level === floor(lines / 10) + 1` 이어야 함(§4.2 공식과 불일치 시 `400 VALIDATION_ERROR`, field=`level`) — 레벨은 라인 수에서 결정론적으로 파생되므로 유일하게 서버측 완전 검증이 가능한 필드 |
| `lines` | integer | Y | `0` 이상 정수 |
| `durationMs` | integer | N (기본 `null`) | 제공 시 `0` 이상 정수 — 통계용, 랭킹에는 사용 안 함 |

> **`score` 자체의 서버측 완전 검증은 하지 않는다**(§9.3, §10) — 소프트/하드 드롭 점수가 클라이언트 입력 이벤트 횟수에 의존하는 특성상 서버가 재현할 수 없다. 대신 `level`↔`lines` 정합성만 결정론적으로 강제하여 명백히 조작된 조합(예: `lines=0`인데 `level=5`)을 차단한다.

**응답 `201 Created`**
```json
{ "id": "uuid-v4", "rank": 12, "playerName": "박기획", "score": 4500, "level": 3, "lines": 24, "createdAt": "2026-07-15T09:00:00.000Z" }
```
- `rank`: 제출 직후 기준 전체 순위(1-base, `score DESC, createdAt ASC` 정렬에서의 위치)

**에러**
| 상태 코드 | 조건 |
|---|---|
| `400` | 필수 필드 누락/타입 불일치/패턴 불일치/`level`↔`lines` 불일치 |
| `500` | DB 오류 등 서버 내부 오류 |

### 6.3 `GET /demo/tetris/api/leaderboard` — 리더보드 조회

**쿼리 파라미터**

| 파라미터 | 타입 | 기본값 | 검증 규칙 |
|---|---|---|---|
| `limit` | integer | `10` | `1` ~ `100` 범위. 벗어나면 `400` |
| `offset` | integer | `0` | `0` 이상. 벗어나면 `400` |

**응답 `200 OK`**
```json
{
  "items": [
    { "rank": 1, "playerName": "박기획", "score": 9800, "level": 6, "lines": 58, "createdAt": "2026-07-15T08:00:00.000Z" }
  ],
  "total": 137,
  "limit": 10,
  "offset": 0
}
```

**정렬 규칙(결정론적)**: `score DESC`, 동점 시 `createdAt ASC`(먼저 달성한 기록이 상위) — tie-break 규칙이 없으면 정렬 순서가 비결정적이 되므로 명시.

**에러**: `limit`/`offset` 범위 밖 → `400 VALIDATION_ERROR`.

---

## 7. DB 스펙 — `TetrisScore`

### 7.1 테이블 정의

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | UUID (v4) | PK, NOT NULL, DEFAULT random | 레코드 식별자 |
| `playerName` | VARCHAR(20) | NOT NULL, `CHECK (length(trim(playerName)) BETWEEN 1 AND 20)` | 표시명, 저장 전 trim. 패턴 검증은 애플리케이션 레이어(§6.2)에서 1차 수행, DB는 길이만 방어 |
| `score` | INTEGER | NOT NULL, `CHECK (score >= 0)` | |
| `level` | INTEGER | NOT NULL, `CHECK (level >= 1)` | |
| `lines` | INTEGER | NOT NULL, `CHECK (lines >= 0)` | |
| `durationMs` | INTEGER | NULL 허용, `CHECK (durationMs IS NULL OR durationMs >= 0)` | |
| `createdAt` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT `now()` | 서버 시각 기준(클라이언트 시각 신뢰 안 함) |

### 7.2 인덱스

- `idx_tetris_score_leaderboard` : `(score DESC, createdAt ASC)` — §6.3 리더보드 정렬/페이지네이션 쿼리 최적화

### 7.3 필드 제약과 API 검증의 관계

- `level` = `floor(lines / 10) + 1` 정합성은 **API 레이어(§6.2)에서 강제**하며, DB에는 별도 CHECK 제약을 걸지 않는다(다중 컬럼 CHECK는 DB 엔진 이식성 이슈가 있어 애플리케이션 검증으로 일원화 — Simplicity First).
- `playerName` 패턴(허용 문자 정규식)은 DB가 아닌 API 레이어에서 강제(§6.2) — DB는 길이 CHECK만으로 방어선을 이중화.

---

## 8. Acceptance Criteria 매핑

| BF-834 AC | 충족 근거 |
|---|---|
| Given Epic 요구, When 명세 문서를 작성하면, Then 시작/일시정지/게임오버/재시작 상태 전이표와 각 전이의 수용 기준이 명시된다 | §5.2 상태 전이표(8개 전이) + §5.3 AC-STATE-01~07(7개 Given/When/Then) |
| Given 점수/레벨 정책, When 규칙을 정의하면, Then 라인 클리어당 점수·레벨업 임계·소프트/하드 드롭 규칙이 결정론적으로 기술된다 | §4.1 라인별 점수 공식·표, §4.2 레벨업 임계 공식, §4.4 소프트/하드 드롭 점수 규칙(이벤트 기준 결정론 명시) |
| Given API/DB 스펙, When 명세를 정리하면, Then leaderboard/scores 엔드포인트의 검증 규칙과 TetrisScore 필드 제약이 개발 착수 가능한 수준으로 정리된다 | §6 (요청/응답 스키마, 필드별 검증 규칙, 상태 코드, 정렬 규칙) + §7 (테이블 컬럼/타입/CHECK/인덱스) |

---

## 9. Edge Case 목록

### 9.1 랜덤 피스 생성이 표준 7-bag이 아님

현재 `createRandomPiece`는 매 스폰마다 7종 중 균등 독립 랜덤을 뽑는다(표준 테트리스의 "7-bag" 랜덤라이저—한 bag 안에서 7종이 정확히 1번씩만 나오는 방식—가 아님). 결과적으로 동일 피스가 연속 여러 번 나올 수 있다(이론상 무한 연속 가능). 이는 **기존 구현을 그대로 반영**한 것이며, 본 task 범위에서 변경하지 않는다. Epic이 7-bag으로의 변경을 원한다면 별도 확장 task로 다뤄야 한다(§10).

### 9.2 라인 클리어 애니메이션과 로직 진행의 분리

`clearLines`는 애니메이션(180ms flash) 시작 **전에** 이미 로직상 라인이 제거된 상태로 보드/점수/레벨을 갱신한다. 즉 화면의 플래시 효과는 순수 시각 효과이며 게임 진행 타이밍(다음 피스 스폰, 낙하 속도 재계산)을 지연시키지 않는다. 백엔드 점수 제출 시점도 이 로직 갱신 시점 기준이어야 한다(화면 애니메이션 종료를 기다릴 필요 없음).

### 9.3 소프트 드롭 점수의 keydown 이벤트 의존성 (리더보드 신뢰도 이슈)

§4.4에 명시했듯 소프트 드롭 점수는 keydown 이벤트 횟수에 비례하므로, 동일한 플레이라도 OS/브라우저의 키 반복(auto-repeat) 설정에 따라 점수가 달라질 수 있다. 서버는 이를 검증할 방법이 없으므로(§6.2) 리더보드 점수는 "신뢰 기반 자가 신고(self-reported)"이며 위변조 방지 기능은 없다 — 데모 기능 목적상 허용하되 §10에 out of scope로 명시한다.

### 9.4 동시 리더보드 제출 경쟁

동일 `score`로 동시에 여러 사용자가 제출할 경우 `createdAt`(서버 타임스탬프) 순서로 tie-break되므로(§6.3), DB 트랜잭션의 커밋 순서가 곧 순위 결정 순서다 — 별도의 락 처리 없이도 결정론적 정렬이 보장된다(타임스탬프 자체가 유일한 정렬키 역할).

### 9.5 게임오버 직후 재시작 시 이전 결과 소실

§5.3 AC-STATE-06에 명시했듯, `gameover → playing` 전이는 이전 게임의 점수를 완전히 폐기한다. 사용자가 §6.2 API로 점수를 제출하기 **전에** 재시작 버튼을 누르면 그 기록은 리더보드에 반영되지 않는다 — 프론트엔드 연동 시(별도 후속 task) 게임오버 화면에서 제출을 완료한 뒤에만 재시작이 가능하도록 할지, 비동기 백그라운드 제출로 처리할지는 UX 결정 사항이며 본 문서 범위 밖(§10)이다.

---

## 10. 비범위 (Out of Scope)

- 프론트엔드 `tetris/` 코드가 실제로 `/demo/tetris` API를 호출하도록 연동하는 작업(별도 후속 dev task)
- 리더보드 점수 위변조 방지(서버측 리플레이 검증, rate limiting, CAPTCHA 등) — §9.3에서 한계로만 명시
- 7-bag 랜덤라이저로의 변경(§9.1) — 현재 균등 랜덤 유지
- 인증/계정 시스템 — `playerName`은 자유 입력 텍스트일 뿐 계정과 연결되지 않음
- 리더보드 UI 화면 설계(디자이너 담당 영역) — 본 문서는 API/DB 계약만 정의

---

## 11. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/tetris-BF-833.md` (본 문서) |
| 기존 디자인 명세(참조) | `docs/design/tetris-BF-639.md` |
| 기존 게임 로직(참조, 변경 없음) | `tetris/logic.js`, `tetris/main.js`, `tetris/storage.js` |
| 기존 단위 테스트(참조, 변경 없음) | `tests/tetris-BF642.test.js` |
| 신규 API/DB 구현(후속 dev task 대상) | 미정 — 본 문서 §6~§7이 계약(contract) |

---

## 12. 남은 모호함 (운영자 확인 권장)

1. **"backend repo" 표기**: §0 가정 1 참고 — 실제로 이 저장소가 아닌 별도 backend 저장소를 의도했다면 경로/저장소 확인이 필요하다.
2. **점수 제출 트리거 시점**: 게임오버 즉시 자동 제출인지, 사용자가 닉네임을 입력 후 수동 제출인지는 Epic에 명시되어 있지 않다. §6.2는 두 방식 모두를 지원 가능한 범용 계약으로 작성했으나, UX 결정(§9.5)은 후속 디자이너/개발자 확인이 필요하다.
3. **DB 엔진**: Epic 설명의 `typescript-monorepo` 태그만으로는 특정 DB(PostgreSQL/SQLite/MySQL 등)를 특정할 수 없다. §7 스펙은 표준 SQL(CHECK 제약·인덱스)로 작성해 엔진 중립적이나, 실제 구현 시 dev가 선택한 엔진의 문법으로 변환 필요.
