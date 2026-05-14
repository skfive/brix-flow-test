# CPU 지렁이 AI 행동 명세 (BF-527)

> 관련 task: BF-528 (planner) → BF-529 (developer)
> 작성자: 박기획
> 작성일: 2026-05-14
> 대상 모듈: `snake/`

---

## 0. 문서 목적 및 범위

본 문서는 Snake 게임(`snake/` 모듈) 에 추가될 **CPU 지렁이(AI 플레이어)** 의 행동 규칙을
개발자가 추가 질문 없이 구현할 수 있도록 **의사코드(pseudocode) 수준** 으로 정의한다.

### 0.1 전제 조건 (Assumptions)

- 기존 `snake/logic.js` 의 `GameState` 구조(`cols, rows, snake, dir, food, status`)를 재사용한다.
- CPU 지렁이는 별도 `CpuState` 객체로 관리하며, 플레이어 `GameState` 와 **격자를 공유** 한다.
- CPU 지렁이는 DOM 이벤트(키보드)가 아닌 **게임 틱(tick) 마다 AI 함수가 호출** 되어 방향을 결정한다.
- 격자 좌표계는 기존과 동일: `{x: 열, y: 행}`, 원점 좌상단.

### 0.2 비목표 (Out of Scope)

- 3인 이상 멀티 CPU 동시 처리
- 학습형(강화학습) AI — v1 은 규칙 기반(rule-based) 만
- UI/디자인 시안 (designer 영역)
- 점수 경쟁 리더보드 (후속 Epic)

---

## 1. 데이터 모델

### 1.1 CpuState

```
CpuState {
  snake      : [{x, y}, ...]     // CPU 지렁이 세그먼트 배열 (head = [0])
  dir        : {x, y}            // 현재 이동 방향
  nextDir    : {x, y}            // 다음 틱에 적용할 방향
  food       : {x, y} | null     // 플레이어와 동일한 food 참조 (공유)
  status     : "playing" | "dead" | "respawning"
  score      : number            // CPU 누적 점수
  difficulty : "easy" | "normal" // 난이도
  ticksSinceDead : number        // 사망 후 경과 틱 수 (재생성 대기)
}
```

### 1.2 SharedGrid (충돌 계산용 가상 격자)

매 틱마다 아래 두 정보를 합산해 **점유 셀 집합(occupiedSet)** 을 구성한다:

```
occupiedSet = Set(
  playerState.snake.map(seg → `${seg.x},${seg.y}`)
  ∪ cpuState.snake.map(seg → `${seg.x},${seg.y}`)
)
```

> **설계 의도**: 단순 집합 조회(`O(1)`)로 충돌 여부를 판단해 성능을 유지한다.

---

## 2. 난이도 파라미터

| 파라미터명 | 설명 | `easy` | `normal` |
|---|---|---|---|
| `tickIntervalMs` | AI 방향 결정 주기 (ms) | `240` | `120` |
| `visionRange` | 전방 탐색 셀 수 (시야 깊이) | `3` | `8` |
| `avoidanceThreshold` | 회피 판단 임계값: 다음 방향 후보의 안전 경로 길이가 이 값 미만이면 다른 방향 탐색 | `2` | `5` |
| `respawnDelayTicks` | 사망 후 재생성까지 대기 틱 수 | `10` | `20` |
| `foodPriorityWeight` | 음식 탐색 vs. 생존 우선 비율 (0.0 = 생존 최우선, 1.0 = 음식 최우선) | `0.4` | `0.7` |

### 2.1 `tickIntervalMs` 와 게임 루프 관계

- 플레이어 게임 루프 `TICK_MS = 120` ms 와 별도로, CPU 방향 결정은 `tickIntervalMs` 마다 1회 호출된다.
- `easy` 의 경우 플레이어 2틱마다 CPU 방향이 1회 결정되므로 반응 속도가 절반이다.
- CPU 지렁이의 **이동 속도(물리 틱)** 는 플레이어와 동일하게 유지한다 — 방향 결정 빈도만 줄이는 방식.

### 2.2 `visionRange` 정의

- 현재 방향(혹은 후보 방향) 기준으로 **직선으로 최대 N 셀을 앞으로 스캔** 한다.
- 스캔 경로 중 첫 번째 장애물(벽·몸)까지의 거리를 `safeLength` 로 사용한다.

---

## 3. AI 방향 결정 알고리즘

### 3.1 전체 흐름 의사코드

```
function chooseCpuDirection(cpuState, playerState, difficulty):
  params   ← DIFFICULTY_PARAMS[difficulty]
  candidates ← getValidDirections(cpuState)     // §3.2
  scored   ← []

  for dir in candidates:
    safeLen ← lookAhead(cpuState, playerState, dir, params.visionRange)  // §3.3
    foodScore ← computeFoodScore(cpuState, dir, playerState.food)         // §3.4

    if safeLen < params.avoidanceThreshold:
      score ← safeLen * 0.1                    // 위험 경로 — 대폭 감점
    else:
      score ← safeLen * (1 - params.foodPriorityWeight)
             + foodScore * params.foodPriorityWeight

    scored.push({ dir, score })

  if scored is empty:
    return cpuState.dir                         // 탈출 불가 — 현재 방향 유지 (§5.1)

  best ← scored 중 score 최대인 항목
  return best.dir
```

### 3.2 유효 방향 후보 필터링

```
function getValidDirections(cpuState):
  all_dirs ← [UP, DOWN, LEFT, RIGHT]
  // 1) 정반대 방향 제거 (즉사 방지)
  filtered ← all_dirs.filter(d → NOT isOpposite(d, cpuState.dir))
  // 2) 다음 셀이 벽 또는 점유 셀인 방향도 미리 제거
  //    (safeLen = 0 인 방향은 선택해봤자 사망이므로)
  safe ← filtered.filter(d →
    nextHead ← { x: head.x + d.x, y: head.y + d.y }
    NOT isWall(nextHead, cols, rows) AND NOT isOccupied(nextHead, occupiedSet)
  )
  return safe   // 비어있을 수 있음 (§5.1 에서 처리)

function isOpposite(a, b):
  return a.x + b.x === 0 AND a.y + b.y === 0
```

### 3.3 전방 시야 탐색 (lookAhead)

```
function lookAhead(cpuState, playerState, dir, maxDepth):
  pos   ← cpuState.snake[0]   // 현재 머리
  count ← 0
  while count < maxDepth:
    pos ← { x: pos.x + dir.x, y: pos.y + dir.y }
    if isWall(pos, cols, rows) OR isOccupied(pos, occupiedSet):
      break
    count ← count + 1
  return count   // 0 = 즉사, maxDepth = 완전 안전
```

> **단순화 근거**: 전체 BFS/DFS 경로 탐색은 `normal` 난이도 v1 에서 불필요.
> `visionRange = 8` 직선 탐색으로 "바로 앞이 막혀있는가" 수준의 판단이면 충분하다.
> 더 정교한 pathfinding (BFS, A*) 은 추후 `hard` 난이도 Epic 에서 추가한다.

### 3.4 음식 방향 점수 계산

```
function computeFoodScore(cpuState, candidateDir, food):
  if food is null:
    return 0

  head    ← cpuState.snake[0]
  nextPos ← { x: head.x + candidateDir.x, y: head.y + candidateDir.y }

  // 맨해튼 거리 기반: 방향 선택 후 음식까지 거리가 줄면 양수 점수
  distBefore ← |head.x - food.x| + |head.y - food.y|
  distAfter  ← |nextPos.x - food.x| + |nextPos.y - food.y|

  if distAfter < distBefore:
    return 1.0    // 음식에 가까워지는 방향
  elif distAfter === distBefore:
    return 0.5    // 중립 (직각 이동)
  else:
    return 0.0    // 음식에서 멀어지는 방향
```

---

## 4. 음식 우선순위 규칙

### 4.1 음식 공유 정책

- 플레이어와 CPU 는 **동일한 food 셀 1개** 를 공유한다 (v1).
- 먹이를 먼저 도달한 쪽이 수집하고, 이후 `spawnFoodCell` 로 새 먹이를 재배치한다.
- CPU 가 음식을 수집해도 플레이어 점수에는 영향 없고, CPU 자체 `score += 10` 만 적용한다.

### 4.2 음식 우선순위 전략 요약

| 상황 | easy | normal |
|---|---|---|
| 음식까지 경로가 안전 (`safeLen ≥ threshold`) | 음식 방향으로 `40%` 가중 | 음식 방향으로 `70%` 가중 |
| 음식까지 경로가 위험 (`safeLen < threshold`) | 생존 우선, 음식 무시 | 생존 우선, 음식 무시 |
| 음식이 없음 (`food = null`) | `foodScore = 0` → 생존 탐색만 | `foodScore = 0` → 생존 탐색만 |

---

## 5. 충돌 시나리오 및 처리

### 5.1 탈출 불가 (유효 방향 없음)

```
Given CPU 지렁이의 머리 주변 3방향 모두 벽 또는 점유 셀일 때
When AI 방향 결정 함수가 호출되면
Then getValidDirections() 가 빈 배열 반환
     → chooseCpuDirection() 은 현재 방향(cpuState.dir) 유지 반환
     → 다음 틱에 이동 → 벽 또는 몸 충돌 → §5.3 또는 §5.4 충돌 분기로 진입
```

### 5.2 벽 충돌 (Wall Collision)

```
Given CPU 지렁이의 다음 머리 위치가 격자 경계 밖(isWallCollision = true)일 때
When tick() 에서 CPU 이동이 처리되면
Then cpuState.status ← "dead"
     cpuState.ticksSinceDead ← 0
     CPU 지렁이의 모든 세그먼트를 occupiedSet 에서 제거
     → 재생성 대기 (§5.5)
     → 게임오버 트리거 없음 (CPU 사망은 플레이어 게임에 영향 없음)
```

### 5.3 자기 몸 충돌 (Self Collision)

```
Given CPU 지렁이의 다음 머리 위치가 자기 자신의 세그먼트 중 하나와 같을 때
When tick() 에서 CPU 이동이 처리되면
Then cpuState.status ← "dead"
     cpuState.ticksSinceDead ← 0
     CPU 지렁이의 모든 세그먼트를 occupiedSet 에서 제거
     → 재생성 대기 (§5.5)
```

### 5.4 플레이어와 충돌 (Player Collision)

CPU 지렁이가 플레이어 지렁이와 충돌하는 시나리오는 두 종류다:

#### 5.4-A: CPU 머리 → 플레이어 몸 충돌

```
Given CPU 지렁이의 다음 머리 위치가 플레이어 지렁이 세그먼트(몸통)일 때
When tick() 에서 CPU 이동이 처리되면
Then cpuState.status ← "dead"
     cpuState.ticksSinceDead ← 0
     CPU 지렁이 세그먼트 전체 제거 → 재생성 대기 (§5.5)
     → 플레이어 상태 변경 없음 (플레이어는 무적)
```

#### 5.4-B: 플레이어 머리 → CPU 몸 충돌

```
Given 플레이어 지렁이의 다음 머리 위치가 CPU 지렁이 세그먼트(몸통)일 때
When tick() 에서 플레이어 이동이 처리되면
Then playerState.status ← "gameover"   (기존 logic.js 의 isSelfCollision 확장)
     highScore 갱신 + Game Over 오버레이 표시
     → CPU 지렁이는 계속 살아있음 (재생성 대기 없음)
```

> **구현 주의**: 기존 `isSelfCollision` 은 플레이어 자기 몸만 검사한다.
> CPU 몸과의 충돌을 추가로 검사하려면 `isSelfCollision(newHead, [...playerSnake, ...cpuSnake])` 와 같이
> 병합 배열을 전달하거나, 별도 `isCpuCollision` 함수를 추가해야 한다.

#### 5.4-C: 머리-머리 정면 충돌 (Head-to-Head)

```
Given 같은 틱에 플레이어 머리와 CPU 머리가 동일한 셀로 이동할 때
When 충돌 검사가 실행되면
Then 양측 모두 충돌 판정:
     - playerState.status ← "gameover"
     - cpuState.status ← "dead"
     둘 다 동시 처리 (동시성 우선순위 없음 — 동점 처리)
```

### 5.5 CPU 재생성 (Respawn)

```
Given cpuState.status === "dead" 일 때 매 틱마다
When ticksSinceDead 가 증가하면
Then if ticksSinceDead >= params.respawnDelayTicks:
       newPos ← spawnCpuStartPosition(cols, rows, occupiedSet)
       if newPos is valid:
         cpuState ← createCpuInitialState(cols, rows, newPos, difficulty)
         cpuState.status ← "playing"
       else:
         // 빈 공간 부족 — 다음 틱 재시도 (ticksSinceDead 유지)
         cpuState.status ← "respawning"
```

#### 5.5.1 CPU 시작 위치 선정 규칙

```
function spawnCpuStartPosition(cols, rows, occupiedSet):
  // 1) 격자를 4분면으로 나눈다: 좌상/우상/좌하/우하
  // 2) 각 분면의 중심 좌표 후보를 occupiedSet 과 비교
  // 3) 점유되지 않은 분면 중 플레이어 head 와 가장 먼 쪽 선택
  // 4) 해당 분면 중심에서 3×3 영역 내 첫 번째 빈 셀 반환
  // 5) 전체 격자에 빈 셀이 3개 미만이면 null 반환 (재생성 불가)
```

---

## 6. Acceptance Criteria 검증 매핑

| AC 항목 | 명세 섹션 | 검증 방법 |
|---|---|---|
| CPU AI 의사결정 규칙 (방향 결정·음식 우선순위·자기몸 회피) 이 의사코드 수준으로 정의 | §3, §4 | 개발자가 본 문서만으로 `chooseCpuDirection` 함수 구현 가능 여부 |
| 최소 2단계 난이도 (쉬움/보통) 파라미터가 수치로 표기 | §2 난이도 파라미터 표 | `easy` / `normal` 5개 파라미터 모두 수치 명시 |
| CPU 지렁이가 벽·자기몸·플레이어 와 충돌했을 때 처리가 분기별로 정의 | §5.2 / §5.3 / §5.4 | 5개 충돌 분기 (Wall / Self / Player-A / Player-B / Head-Head) 모두 정의 |

---

## 7. 구현 가이드라인 (개발자용 체크리스트)

1. **새 파일**: `snake/cpu-ai.js` — `chooseCpuDirection`, `createCpuInitialState`, `spawnCpuStartPosition`, `tickCpu` 함수 export
2. **기존 파일 최소 변경**:
   - `snake/logic.js`: `isSelfCollision` 시그니처 변경 없이 `isCpuCollision(head, cpuSnake)` 별도 추가
   - `snake/game.js`: `loop()` 내부에 `tickCpu()` 호출 추가, CPU 렌더링(`drawCpuSnake()`) 추가
3. **테스트 대상** (`tests/snake-BF529*.test.js` 으로 작성):
   - `chooseCpuDirection`: 벽 직전 방향 회피 검증
   - `chooseCpuDirection`: 음식 방향 우선 검증 (`normal` 난이도)
   - `tickCpu`: 벽 충돌 시 `status → "dead"` 검증
   - `tickCpu`: 재생성 대기 틱 카운터 검증
4. **회귀 가드**: `snake-BF504/514/516/518/520/522/524/526` 테스트 전부 통과 유지

---

## 8. 미결 사항 (개발 착수 전 확인 요청)

| # | 질문 | 기본값 (미확인 시 사용) |
|---|---|---|
| Q1 | CPU 지렁이 색상 (플레이어: `#4cff80` 녹색) | `#ff6b6b` (붉은 계열) — designer 확인 필요 |
| Q2 | CPU 지렁이 사망 시 사망 애니메이션 여부 | v1 은 즉시 소멸 (애니메이션 없음) |
| Q3 | CPU 점수를 HUD 에 표시할지 여부 | v1 은 표시 안 함 (내부 변수만 추적) |
| Q4 | 플레이어 게임오버 시 CPU 도 멈출지 | 게임오버 시 전체 게임 루프 정지 — CPU 도 동시 정지 |
