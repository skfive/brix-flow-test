# 적 스네이크 경쟁 유닛화 + 아이템 시스템 확장 명세 (BF-628)

> Epic: BF-627 · 관련 task: BF-628 (planner) → developer
> 작성자: 박기획
> 작성일: 2026-05-19
> 대상 모듈: `snake/` (primary-module:snake)
> 운영자 마커: `bf:persona-set:planner,developer` — 디자이너/리뷰어/테스터는 본 분해 제외, planner 산출물 1건

---

## 0. 문서 목적 및 범위

본 문서는 `snake/` 모듈의 고도화를 개발자가 추가 질문 없이 구현할 수 있도록
**의사코드(pseudocode) 수준** 으로 정의한다. 세 가지를 명세한다.

1. **(AC1)** 단순 배회만 하던 적 스네이크(`extraCpus`)를 실제 아이템을 먹고 성장·경쟁하는
   AI 경쟁 유닛으로 정의 — 탐색/추격·경합/회피 행동 규칙
2. **(AC2)** 적 유닛 증가에 대응한 아이템/먹이 시스템 확장 — 채택안과 수치 파라미터
3. **(AC3)** 기존 단일 플레이 영향 0 · 롤백 가능 · KPI 측정 코드 요건의 구현 가능 수준 구체화

### 0.1 전제 조건 (Assumptions — 코드 사실 확인 완료)

현재 `snake/logic.js` · `snake/game.js` 를 분석한 결과:

- **메인 CPU(`state.cpu`)** 는 이미 실질 경쟁 유닛이다 — `cpuChooseDir()` 스코어 기반 AI
  (`safeLen` + `foodScore`), 먹이 섭취·성장(`cpuPendingGrowth`)·점수(`cpuScore`)·
  아이템 획득(`tickWithItems` 내 `cpuHitItem`)·루프 감지(BF-576) 보유. **본 task 변경 대상 아님(보존).**
- **`extraCpus`(BF-584, `cpuCount ≥ 2` 일 때 `cpuCount-1` 개)** 가 본 task 의 "단순 배회 적 스네이크".
  `game.js`의 `tickExtraCpus()` 가 처리하며 현재 한계는 다음과 같다:
  - 먹이 방향 Manhattan 거리 최소 방향으로 이동하나 **실제로 먹지 않음** (주석: "음식은 먹지 않음 (점수 격리)")
  - 성장 없음 · 점수 없음 · 아이템 상호작용 없음 · 루프 감지 없음(`recentPositions: []` 항상 리셋)
  - 유효 방향이 없으면 영구 제거(사망), **재생성 없음**
- **먹이/아이템 희소성**: 보드 위 배수 먹이 `state.food` 1개 + 파워업 아이템 `state.item` 1개만
  동시 존재. 아이템 스폰 타이머는 `state.item === null` 일 때만 신규 스폰(최대 1개).
- 설정(BF-579): `cpuCount ∈ [0..5]`, `itemsEnabled`(기본 false), `itemSpawnRate`,
  `difficulty ∈ {easy, normal}`. 설정은 게임 진행 중 불변(변경 시 재시작).
- 충돌 규칙(BF-572): 상대 몸통 통과 허용, 머리-머리(head-on) 충돌만 상호 사망.
- KPI 패턴: `localStorage` ring buffer + 게임 종료 시 `console.log`,
  키 예 `bf-snake-comp-kpi`/`bf-snake-item-kpi`, 쓰기는 항상 `try/catch`(private mode 대비).

### 0.2 비목표 (Out of Scope)

- 디자인 시안(designer 영역) — 신규 시각 요소는 기존 렌더 함수 재사용 범위로 제한
- 강화학습 AI — v1 은 규칙 기반(rule-based) 만
- 적 유닛 점수의 **승패 판정 반영** — 기존 player vs main-CPU `result` 판정은 **변경 금지**
  (extras 는 환경 경쟁자이며 KPI 로만 추적, HUD 노출은 후속 Epic)
- 멀티 먹이의 **플레이어 레인 통합** — §3.2 의 레인 분리 원칙으로 명시적 비목표

### 0.3 핵심 설계 결정 (채택 근거 요약)

> AC2 의 "동시 10배 확장" vs "시간 점진 증가" 중 **동시 N배 확장(적 수 비례)** 을 채택한다.
> 단, 기존 단일 레인을 건드리지 않는 **별도 풀(separate pool) + 레인 분리** 로 구현한다.
> 근거: (a) 희소성의 본질 원인은 *동시 경쟁자 수* 이므로 시간 점진만으로는 "지금 N마리가
> 먹이 1개를 두고 경쟁"하는 순간 밀도 문제를 못 푼다. (b) 별도 풀 + 레인 분리는
> 기존 `tick`/`tickFull`/`tickWithItems` 단일 먹이 경로를 한 줄도 바꾸지 않아 영향 0 ·
> 회귀 리스크 최소 · 롤백 단순. 상세는 §5, 채택 근거 표는 §11.

---

## 1. 현황 Gap 분석

| 항목 | 메인 CPU(`state.cpu`) | extraCpus(현재) | 본 task 목표 |
|---|---|---|---|
| 방향 결정 | `cpuChooseDir` 스코어 AI | 단순 greedy(Manhattan) | 통합 AI(§4) |
| 먹이 섭취 | O (`cpuPendingGrowth`) | **X (격리)** | **O (전용 풀)** |
| 성장 | O | X | **O** |
| 점수 | O (`cpuScore`) | X | **O (KPI 전용)** |
| 아이템 | O (`tickWithItems`) | X | **O (전용 풀)** |
| 루프 감지 | O (BF-576) | X | **O** |
| 사망 후 재생성 | X(메인은 사망=draw 판정) | X(영구 제거) | **O (재생성)** |
| 플레이어 경합/회피 | 암묵(점유 셀 회피) | 없음 | **명시(FORAGE/CONTEST/EVADE)** |

→ 본 task 는 **extraCpus 를 메인 CPU 와 동급 경쟁 유닛으로 승격** 하고, 늘어난 경쟁자에게
공급할 **별도 먹이/아이템 풀** 을 추가한다. 메인 CPU·플레이어·기존 단일 레인은 **보존**.

---

## 2. 데이터 모델 변경

### 2.1 enemy 엔티티 통합 스키마 (`extraCpus[]` 각 원소 확장)

```
EnemyUnit {
  id              : string            // "e0".."e3" — 안정 식별자 (speedStack target 키)
  body            : [{x,y}, ...]      // 기존 필드 (head = [0])
  dir             : {x,y}             // 기존 필드
  recentPositions : string[]          // 기존 필드 — 본 task 부터 실제 갱신(루프 감지)
  score           : number            // 신규: 누적 점수 (KPI 전용, 플레이어 점수 불간섭)
  pendingGrowth   : number            // 신규: 성장 카운터 (player/main-cpu 와 동일 방식)
  dead            : boolean            // 신규: 사망 플래그
  respawnTicksLeft: number            // 신규: 재생성 대기 틱 (0=즉시 가능)
}
```

### 2.2 GameState 신규 필드 (`createInitialState` 반환 객체에 추가)

```
extraFoods : [ {x, y, multiplier:1|2|4|8, spawnedAt:number}, ... ]   // 신규 먹이 풀
extraItems : [ {type, x, y, spawnedAt, expiresAt}, ... ]             // 신규 아이템 풀
enemyStats : EnemyStats                                              // KPI 누적 (§9)
```

- `cpuCount ≤ 1` 또는 `MULTI_FOOD_ENABLED=false` → `extraFoods=[] / extraItems=[]`
  로 **항상 빈 배열** (단일 플레이 영향 0, §6).
- 기존 필드(`food`, `item`, `snake`, `cpu`, …) 는 **시그니처·의미 불변**.

### 2.3 신규 모듈 상수 / Feature Flag (`snake/logic.js`)

```
export const ENEMY_AI_V2_ENABLED = true;   // false → extras 기존 greedy 폴백 (롤백)
export const MULTI_FOOD_ENABLED  = true;   // false → extraFoods/extraItems 비활성 (롤백)

// AC2 풀 사이징 파라미터
export const FOOD_PER_EXTRA_ENEMY = 2.25;  // extra enemy 1마리당 동시 먹이
export const FOOD_POOL_CAP        = 10;    // 동시 먹이 상한 (≈ 단일 1개의 10배)
export const ITEM_PER_EXTRA_ENEMY = 1.0;   // extra enemy 1마리당 동시 아이템
export const ITEM_POOL_CAP        = 5;     // 동시 아이템 상한
export const POOL_MAX_SPAWN_PER_TICK = 1;  // 틱당 풀 보충 최대 개수 (급격 채움 방지)
```

> Feature Flag 는 기존 `EFFECTS_ENABLED`(game.js) 와 동일 패턴 — 브라우저 콘솔에서
> 런타임 변경 가능하도록 `let` 이 아닌 `export const` + game.js 측 참조. 롤백 상세 §7.

---

## 3. 아키텍처 — 레인 분리 (Lane Separation)

### 3.1 두 개의 독립 레인

| 레인 | 참여자 | 먹이/아이템 | 처리 함수 | 변경 여부 |
|---|---|---|---|---|
| **레거시 레인** | player + 메인 CPU(`state.cpu`) | `state.food`(1) · `state.item`(1) | `tickWithItems`/`tickFull`/`tick` | **불변(보존)** |
| **경쟁 레인** | extras(`extraCpus[]`) | `extraFoods[]` · `extraItems[]` | 신규 `tickEnemies()` | 신규 |

### 3.2 레인 분리 원칙 (영향 0 의 핵심)

- extras 는 **레거시 `state.food`/`state.item` 을 먹지 않는다** (좌표 충돌 검사 대상 아님).
- player·메인 CPU 는 **`extraFoods`/`extraItems` 를 먹지 않는다**.
- 결과: 기존 player vs main-CPU 먹이 경쟁·승패 판정 로직(`tickFull`/`tickWithItems`)을
  **한 줄도 수정하지 않는다** → BF-504~BF-616 회귀 0.
- "적 유닛 증가 → 먹이 부족" 의 본질은 *늘어난 적 유닛에게 공급할 먹이* 이므로,
  적 전용 풀로 해결하는 것이 의미적으로도 정확하며 부수효과가 없다.

> 단순화 근거(Simplicity First): 플레이어 레인에 멀티 먹이를 통합하면 모든 충돌/스폰/
> 점수/`multiplierStats` 경로가 영향받아 blast-radius 가 폭발한다. 레인 분리는 신규 코드만
> 추가하고 기존 경로는 read-only 참조만 한다.

---

## 4. 적 스네이크 AI 행동 규칙 (AC1)

> 메인 CPU `cpuChooseDir` 와 동일 철학(스코어 기반 greedy)을 확장한 **통합 행동 모델**.
> extras 전용 신규 함수 `chooseEnemyDir(enemy, world, params)` 로 구현하고,
> `ENEMY_AI_V2_ENABLED=false` 면 기존 `tickExtraCpus` greedy 로 폴백.

### 4.1 행동 모드 (3종)

| 모드 | 트리거 조건 | 의도 |
|---|---|---|
| **FORAGE** (기본) | 아래 두 조건 모두 미충족 | 최근접 유익 타깃(먹이·버프 아이템)으로 안전하게 이동 |
| **CONTEST** | 최근접 타깃 T 에 대해 `enemyDist(T) ≤ playerDist(T)` **AND** `playerDist(T) ≤ contestRadius` | 플레이어와 같은 타깃을 두고 먼저 선점(경쟁 가중↑, 안전 가중↓) |
| **EVADE** | `dist(enemyHead, playerHead) ≤ threatRadius` **OR** 모든 후보 `safeLen < avoidanceThreshold` | head-on/포위 위험 — 안전·위협 회피 가중↑, 타깃 가중↓ |

- 우선순위: **EVADE > CONTEST > FORAGE** (조건 동시 충족 시 EVADE 채택).
- "추격"은 BF-572(몸통 통과 허용, head-on=상호사망) 규칙상 *몸통 들이받기 킬* 이 불가하므로,
  **타깃 선점 경쟁(CONTEST)** 으로 정의한다. 무모한 head-on 유도는 자멸이므로 금지(EVADE 로 회피).

### 4.2 난이도 파라미터 확장 (`DIFFICULTY_PARAMS` 에 키 추가)

| 파라미터 | 설명 | `easy` | `normal` |
|---|---|---|---|
| `contestRadius` | CONTEST 진입 판정용 플레이어-타깃 거리 임계 | `3` | `6` |
| `threatRadius` | EVADE 진입용 enemy-player 머리 거리 임계 | `2` | `4` |
| `threatWeight` | 위협(head-on/포위) 패널티 가중 | `0.2` | `0.5` |
| `contestFoodBoost` | CONTEST 시 타깃 가중 가산 | `0.10` | `0.18` |
| `itemSeekWeight` | 버프 아이템을 먹이 대비 추구하는 비율(0~1) | `0.3` | `0.6` |

> 기존 `tickIntervalMs`/`visionRange`/`avoidanceThreshold`/`respawnDelayTicks`/
> `foodPriorityWeight` 는 그대로 재사용한다.

### 4.3 타깃 가치(value) 테이블

```
TARGET_VALUE:
  food(multiplier=m)  → value = m            // 1/2/4/8 — 큰 배수 우선
  item(SPEED_UP)      → value = 3
  item(SHIELD)        → value = 3            // extras 는 즉시소멸이지만 경합 유도용
  item(SLOW_DOWN)     → value = 1            // 자신에 불리 → 낮음
  item(LENGTH_BURST)  → value = 2
  item(REVERSE)       → value = 1            // HOLDABLE, extras 는 소멸 → 낮음
```

> 의도: 적이 "아이템도 탐색"(AC1 요구)하되, 자신에게 불리한 SLOW_DOWN/REVERSE 는 덜 쫓는다.
> extras 의 아이템 효과 적용 규칙은 §5.4 참조.

### 4.4 방향 결정 의사코드

```
function chooseEnemyDir(enemy, world, params):
  if NOT ENEMY_AI_V2_ENABLED:
     return legacyGreedyDir(enemy, world)            // 기존 tickExtraCpus 로직 (롤백)

  head      ← enemy.body[0]
  occupied  ← Set(
                world.player.snake ∪ world.cpu ∪
                world.otherEnemies.bodies ∪ enemy.body.slice(1) )
  candidates ← validDirs(enemy.dir, head, world.cols, world.rows, occupied)   // §4.5
  if candidates empty: return enemy.dir              // 탈출 불가 → 현 방향 (다음 틱 사망)

  // BF-576 동일: 루프 감지 — recentPositions 에 head 3회+ → 타깃 최단거리 강제
  if visitCount(enemy.recentPositions, head) ≥ 3 and bestTarget ≠ null:
     return argmin_d candidates by Manhattan(head+d, bestTarget.pos)

  bestTarget ← pickTarget(head, world.extraFoods, world.extraItems, params)   // §4.6
  mode       ← decideMode(enemy, world, bestTarget, params)                   // §4.1

  scored ← []
  for d in candidates:
     nextPos   ← head + d
     safeLen   ← lookAhead(head, d, params.visionRange, world.cols, world.rows, occupied)
     tgtScore  ← targetScore(head, d, bestTarget)            // §4.7
     threat    ← threatScore(nextPos, world, params)         // §4.8

     (wSafe, wTgt, wThreat) ← weightsFor(mode, params)       // §4.9
     if safeLen < params.avoidanceThreshold:
        score ← safeLen*0.1 + tgtScore*wTgt - threat*wThreat        // 위험: 안전 최우선
     else:
        score ← (safeLen/params.visionRange)*wSafe
               + tgtScore*wTgt
               - threat*wThreat
     scored.push({d, score})

  return max(scored by score).d        // 동점 → candidates 배열 앞 우선 (결정적)
```

### 4.5 `validDirs` (기존 `cpuChooseDir` §3.2 동일 규칙)

```
all=[UP,DOWN,LEFT,RIGHT]
filter: NOT isOpposite(d, enemy.dir)
        AND NOT isWall(head+d, cols, rows)
        AND NOT occupied.has(head+d)
```

### 4.6 `pickTarget` — 먹이·아이템 통합 타깃 선택

```
function pickTarget(head, foods, items, params):
  best ← null; bestKey ← +∞
  for f in foods:
     key ← Manhattan(head, f) / max(1, TARGET_VALUE.food(f.multiplier))
     if key < bestKey: best←{pos:f, kind:"food", value:f.multiplier}; bestKey←key
  for it in items:
     v ← TARGET_VALUE.item(it.type)
     key ← Manhattan(head, it) / max(1, v) / max(0.01, params.itemSeekWeight)
     if key < bestKey: best←{pos:it, kind:"item", value:v}; bestKey←key
  return best        // null 가능 (풀 비었을 때) → FORAGE 시 safeLen 만으로 배회
```

### 4.7 `targetScore` (기존 `computeFoodScore` 일반화)

```
if bestTarget == null: return 0
distBefore ← Manhattan(head, target.pos)
distAfter  ← Manhattan(head+d, target.pos)
return distAfter<distBefore ? 1.0 : distAfter==distBefore ? 0.5 : 0.0
```

### 4.8 `threatScore` — head-on/포위 위험

```
opponentHeads ← [ world.player.snake[0], world.cpu[0]?,
                  ...world.otherEnemies.heads ]
// nextPos 가 상대 머리의 "다음 가능 칸"과 겹치면 head-on 위험
risk ← 0
for h in opponentHeads (존재 시):
   if Manhattan(nextPos, h) ≤ 1: risk ← max(risk, 1.0)        // 인접 → 고위험
   else if Manhattan(nextPos, h) == 2: risk ← max(risk, 0.5)
return risk
```

### 4.9 `weightsFor(mode, params)` — 모드별 가중

```
base wSafe = (1 - params.foodPriorityWeight)
base wTgt  = params.foodPriorityWeight
FORAGE : (wSafe, wTgt,                       params.threatWeight*0.5)
CONTEST: (wSafe*0.8, wTgt+params.contestFoodBoost, params.threatWeight*0.7)
EVADE  : (wSafe*1.3, wTgt*0.4,               params.threatWeight*1.5)
```

---

## 5. 경쟁 레인 틱 처리 — `tickEnemies()` (신규)

> 위치: `snake/game.js` (현 `tickExtraCpus()` 를 본 함수로 대체).
> `moveCpu` 가 true 인 틱에만 실행(기존 호출 지점 `if (moveCpu) tickExtraCpus()` 와 동일).

### 5.1 처리 순서 (틱당)

```
1. 풀 만료 정리 : extraItems 중 nowMs ≥ expiresAt 제거 → enemyStats.itemExpired++
2. for each alive enemy (배열 순서, 결정적):
   a. dir ← chooseEnemyDir(enemy, world, params)
   b. recentPositions ← (recentPositions + headKey).slice(-15)   // 루프 감지
   c. newHead ← head + dir
   d. 충돌: isWall(newHead) OR isSelf(newHead, enemy.body)
            OR headOn(newHead, 다른 enemy 의 newHead)            // 상호 사망
      → enemy.dead=true; enemy.respawnTicksLeft=params.respawnDelayTicks
        enemyStats.died[cause]++ ; continue
      (BF-572: player/cpu/다른 enemy '몸통' 통과 허용 — 사망 아님)
   e. 먹이 섭취: extraFoods 중 newHead 와 동일 좌표 1개 → 소비
      pendingGrowth += food.multiplier ; score += food.multiplier*10
      enemyStats.foodEaten++ ; 해당 food 제거(보충은 §5.3)
   f. 아이템 섭취: extraItems 중 newHead 동일 좌표 1개
      INSTANT(SPEED_UP/SLOW_DOWN) → applyEnemySpeed(enemy.id, type, nowMs)  // §5.4
      그 외(LENGTH_BURST/SHIELD/REVERSE) → 소멸(효과 없음)
      enemyStats.itemAcquired[type]++ ; 해당 item 제거
   g. body 이동: pendingGrowth>0 ? [newHead,...body] (꼬리유지, pg--)
                                : [newHead,...body.slice(0,-1)]
3. 사망 enemy 재생성 처리 (§5.5)
4. 풀 보충 (§5.3)
5. enemyStats.tickMode[mode]++ (KPI)
```

### 5.2 점수 격리 보장 (AC3-1 핵심)

- enemy.score 는 **`enemyStats`/KPI 전용**. `state.score`·`state.cpuScore`·`result`·
  `deathCause` 에 **절대 기록하지 않는다**. 시간초과 승패 비교(game.js 2690행대)도 불변.
- enemy 사망은 게임오버 트리거 **아님** (재생성). 기존 `tickWithItems` 의 player/main-CPU
  사망 → 게임오버 경로와 완전 분리.

### 5.3 풀 사이징·보충 (AC2 수치 파라미터)

```
E  ← extras 활성 마리수 (dead 제외)
Fc ← MULTI_FOOD_ENABLED && E≥1
       ? clamp( ceil(E * FOOD_PER_EXTRA_ENEMY), 0, FOOD_POOL_CAP ) : 0
Ic ← (MULTI_FOOD_ENABLED && itemsEnabled && E≥1)
       ? clamp( ceil(E * ITEM_PER_EXTRA_ENEMY), 0, ITEM_POOL_CAP ) : 0
```

| cpuCount | extras(E) | Fc(동시 먹이) | Ic(동시 아이템, itemsEnabled 시) |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 1 | 0 | 0 (단일 플레이 — 영향 0) | 0 |
| 2 | 1 | `ceil(1*2.25)=3` | 1 |
| 3 | 2 | `ceil(2*2.25)=5` | 2 |
| 4 | 3 | `ceil(3*2.25)=7` | 3 |
| 5 | 4 | `ceil(4*2.25)=9` | 4 |

> 단일 먹이 기준 대비 최대 약 9~10배 ≈ "동시 약 10배 확장" 충족(AC2).
> `FOOD_POOL_CAP=10` 으로 상한. **보충 규칙**: 매 틱 `extraFoods.length < Fc` 이면
> 최대 `POOL_MAX_SPAWN_PER_TICK(=1)` 개를 빈 셀에 스폰(`spawnFoodWithMultiplier` 재사용,
> 점유 = player∪cpu∪extras∪extraFoods∪extraItems∪`state.food`∪`state.item`).
> 즉시 가득 채우지 않고 틱당 1개씩 → 급격한 화면 변화·성능 스파이크 방지.
> 아이템도 동일 규칙(`itemsEnabled` 시, `spawnItemCell` 재사용 + `pickItemType`).

### 5.4 extras 의 아이템 효과 적용 (단순화)

- **INSTANT-속도(SPEED_UP/SLOW_DOWN)** 만 적용. 기존 `state.speedStack` 에
  `{type, target:"extra:"+enemy.id, expiresAtMs}` 항목으로 추가(스키마 재사용).
  game.js 루프의 enemy 이동 간격에 반영(§12 구현 가이드).
- **LENGTH_BURST**: extra 별 burst 복원 상태 필드 추가는 blast-radius 가 커서 **미적용**
  (소멸 처리, `enemyStats` 에 `itemConsumed.LENGTH_BURST++`). 단순화 — 후속 Epic 검토.
- **HOLDABLE(SHIELD/REVERSE)**: extras 는 보유 슬롯 없음 → 소멸(`itemConsumed++`).
  (기존 메인 CPU 의 HOLDABLE `cpuConsumed` 규칙과 일관.)

### 5.5 사망/재생성 (BF-527 §5.5 개념을 extras 에 실제 구현)

```
for enemy in deadEnemies:
   enemy.respawnTicksLeft--
   if enemy.respawnTicksLeft ≤ 0:
      slot ← freeRespawnSlot(cols, rows, allOccupied)   // 4분면 빈 3칸 LEFT body
      if slot:
         enemy.body=slot.body; enemy.dir=LEFT; enemy.dead=false
         enemy.pendingGrowth=0; enemy.recentPositions=[]
         enemyStats.respawned++
      else:
         enemy.respawnTicksLeft = 1     // 빈 공간 없음 → 다음 틱 재시도 (EC-3)
```

> `freeRespawnSlot` 은 `spawnExtraCpus()` 의 슬롯 후보 로직을 재사용한다(중복 구현 금지).

---

## 6. 기존 단일 플레이 영향 0 (AC3-1)

| 보존 대상 | 보존 방식 |
|---|---|
| 단일 플레이 동작 | 기본 설정 `cpuCount=1` → extras=[] → `tickEnemies` 즉시 return, 풀 비활성 |
| 솔로 모드 | `cpuCount=0` → enemies 없음, 풀 0 |
| 레거시 먹이/아이템 | §3.2 레인 분리 — `tick`/`tickFull`/`tickWithItems`/`state.food`/`state.item` **무수정** |
| 기존 단위/E2E 테스트 | BF-504~BF-616 은 `cpuCount` 기본·`itemsEnabled=false` → 신규 경로 미진입. 회귀 0 |
| `multiplierStats`/`itemStats` | 레거시 카운트 경로 불변. enemy 통계는 **별도 `enemyStats`** |
| 승패/시간초과 판정 | enemy.score 격리(§5.2) — `result`/`deathCause` 산식 불변 |
| 아이템 스폰 타이머 | 기존 `state.item` 타이머 로직 불변. 풀 보충은 별도 분기(`tickEnemies` 내부) |

> **검증 가능 종료 조건**: `node --test tests/snake-*.test.js` 전체 green
> (focused scope, primary-module=snake). 신규 테스트는 `tests/snake-BF<dev>*.test.js`.

---

## 7. 롤백 방법 (AC3-2)

3단계 롤백 — 가벼운 것부터:

1. **런타임 Feature Flag** (재배포 불필요, 즉시):
   - 브라우저 콘솔: `ENEMY_AI_V2_ENABLED=false` → extras 가 기존 greedy 배회로 폴백
   - `MULTI_FOOD_ENABLED=false` → `extraFoods/extraItems` 풀 완전 비활성
     (extras 는 풀이 없으면 §4.6 `bestTarget=null` → 안전 배회만 — 사실상 BF-584 동작)
   - 두 플래그는 **독립** — 각각 단독 비활성 시에도 안전(EC-6)
2. **설정 롤백**: 운영자/사용자가 `cpuCount=1`(또는 0) / `itemsEnabled=false` →
   기능 전체 dormant (코드 변경 없음, BF-579 설정 모달 그대로 활용)
3. **코드 롤백**: 본 task PR 단일 revert — 레인 분리로 기존 파일 변경 최소
   (`logic.js` 추가 export + `game.js` `tickExtraCpus`→`tickEnemies` 교체 + 신규 KPI 함수).
   revert 후 BF-584 `tickExtraCpus` 복원으로 회귀 없음.

> Flag 기본값은 `true`(기능 ON) 이나, `cpuCount` 기본 1 이라 **단일 플레이 사용자에게는
> 켜져 있어도 무동작**(영향 0). 문제 발생 시 운영자가 1번 단계로 수초 내 무력화 가능.

---

## 8. KPI 측정 항목 (AC3-3)

### 8.1 `enemyStats` 구조 (`createEnemyStats()` — `createItemStats` 패턴 차용)

```
EnemyStats {
  enemiesSpawned   : number                     // 초기 + 재생성 누적
  respawned        : number
  died             : { wall, self, head_on }     // 사망 원인별
  foodEaten        : number                      // extras 총 먹이 수
  foodMultSum      : number                      // 섭취 배수 합 (평균 배수 산출용)
  itemAcquired     : { SPEED_UP, SLOW_DOWN, LENGTH_BURST, SHIELD, REVERSE }
  itemConsumed     : { LENGTH_BURST, SHIELD, REVERSE }   // 효과 미적용 소멸
  itemExpired      : number                      // 풀에서 수명만료
  tickMode         : { FORAGE, CONTEST, EVADE }   // 모드별 틱 누적
  contestWins      : number                      // CONTEST 타깃을 player 보다 먼저 선점
  maxScore         : number                      // 단일 enemy 최고 점수
  poolStarvedTicks : number                      // 빈 셀 부족으로 보충 실패한 틱
  avgConcurFoodSum : number, avgConcurFoodN : number   // 평균 동시 먹이수 산출용
}
```

### 8.2 기록 방식 (기존 `logItemKPI` 패턴 그대로)

- localStorage 키: 세션 `bf-snake-enemy-kpi`, 누적 `bf-snake-enemy-stats`
- 게임 종료 시 `logEnemyKPI()` 호출(기존 `logKPI`/`logItemKPI` 호출부에 1줄 추가)
- 모든 `localStorage.setItem` 은 `try/catch` 로 감싼다(private mode = EC-5, 무시)
- console 출력 1줄(획득/사망/모드 요약), prefix **`[BF-628 KPI]`**:

```
[BF-628 KPI] enemies=4 died(wall:3 self:1 head_on:2) food=27(avgM 1.8)
             items(SU:4 SD:1) mode(F:910 C:120 E:55) contestWin=14
             poolStarved=0 maxScore=420
```

### 8.3 KPI 측정 위치 (코드 삽입 지점)

| 지표 | 증가 시점 |
|---|---|
| `enemiesSpawned`/`respawned` | `createInitialState`(초기) / §5.5 재생성 |
| `died.*` | §5.1-d 사망 분기 |
| `foodEaten`/`foodMultSum` | §5.1-e 섭취 |
| `itemAcquired`/`itemConsumed` | §5.1-f |
| `itemExpired` | §5.1-1 만료 정리 |
| `tickMode.*` | §5.1-5 모드 확정 후 |
| `contestWins` | CONTEST 모드 enemy 가 타깃을 소비한 틱 & `playerDist>enemyDist` 였을 때 |
| `poolStarvedTicks` | §5.3 보충 시 빈 셀 0 |
| `avgConcurFood*` | 매 틱 `extraFoods.length` 누적/카운트 |

---

## 9. Edge Case · 실패 케이스

| # | 케이스 | Given / When / Then |
|---|---|---|
| EC-1 | 풀 보충 시 빈 셀 없음 | Given 격자 포화 When 보충 시도 Then 스폰 skip · `poolStarvedTicks++` · 크래시 없음 |
| EC-2 | 진행 중 cpuCount 변경 | Given 게임 중 설정 변경 When 적용 Then BF-579 정책대로 재시작 시에만 풀 재사이징 |
| EC-3 | 재생성 슬롯 없음 | Given 모든 분면 점유 When 재생성 Then `respawnTicksLeft=1` 로 다음 틱 재시도 |
| EC-4 | 두 enemy 동일 먹이 동시 도달 | Given 같은 칸 When 같은 틱 Then 배열 앞 enemy 소비, 뒤 enemy 미획득(결정적) |
| EC-5 | localStorage 쓰기 실패 | Given private mode When KPI 저장 Then catch 무시 · console.log 는 출력 |
| EC-6 | 플래그 한쪽만 OFF | Given `ENEMY_AI_V2=false`,`MULTI_FOOD=true`(역도) When 틱 Then 각자 독립 폴백, 무크래시 |
| EC-7 | extras 가 LENGTH_BURST/HOLDABLE 획득 | Given 풀 아이템 When extra 섭취 Then 효과 미적용·소멸·`itemConsumed++`(§5.4) |
| EC-8 | extra-extra head-on | Given 두 extra 머리 동일/교차 칸 When 충돌 Then 둘 다 사망+재생성, 게임오버 아님 |
| EC-9 | extras=0 인데 풀 잔존 | Given 모든 extra 사망(재생성 대기) When `tickEnemies` Then E=0 → Fc=0, 풀 점진 소진(만료) |
| EC-10 | 초소형 격자 | Given cols·rows 작음 When 풀 사이징 Then 빈 셀 수로 자연 클램프(EC-1 경유), 정상 진행 |
| EC-11 | `state.food`/extras 좌표 겹침 시도 | Given 보충 스폰 When 점유셀 계산 Then `state.food`/`state.item` 도 점유에 포함 → 겹침 0 |

---

## 10. 사용자 시나리오 (Given/When/Then)

### 10.1 적이 실제 경쟁자가 됨 (AC1)

```
Given cpuCount=3, itemsEnabled=true, normal 난이도 게임 시작
When 게임을 진행
Then 2마리 extra enemy 가 extraFoods 를 추격·섭취하여 몸이 길어지고
     extraItems(SPEED_UP) 를 먹으면 이동이 빨라진다
And  플레이어 머리가 extra 머리에 근접하면 extra 가 EVADE 로 회피 기동한다
And  플레이어와 같은 먹이를 노릴 때 extra 가 CONTEST 로 먼저 선점 시도한다
```

### 10.2 단일 플레이 사용자 무영향 (AC3-1)

```
Given 기본 설정(cpuCount=1, itemsEnabled=false)으로 플레이
When 게임을 끝까지 진행
Then extras·extraFoods·extraItems 가 전혀 생성되지 않고
     점수·먹이·게임오버·하이스코어 동작이 BF-628 이전과 비트 단위로 동일하다
```

### 10.3 운영자 롤백 (AC3-2)

```
Given 출시 후 extras AI 이상 행동 신고
When 운영자가 콘솔에서 ENEMY_AI_V2_ENABLED=false 설정
Then 재배포 없이 즉시 extras 가 기존(BF-584) 단순 배회로 폴백되고
     플레이어 경험은 안정 상태로 복귀한다
```

### 10.4 경쟁 KPI 측정 (AC3-3)

```
Given cpuCount=4 게임을 1판 완료
When 게임오버 시점
Then localStorage[bf-snake-enemy-kpi] 에 적 사망원인·먹이수·모드분포·
     contestWins·poolStarvedTicks 가 기록되고
     콘솔에 [BF-628 KPI] 요약 1줄이 출력된다
```

---

## 11. AC 검증 매핑 + 채택안 근거

### 11.1 AC 매핑

| AC | 명세 섹션 | 검증 방법 |
|---|---|---|
| AC1 적 AI 행동 규칙(탐색·섭취·성장·경쟁) 구현 가능 수준 | §4 전체 + §5.1 | dev 가 본 문서만으로 `chooseEnemyDir`/`tickEnemies` 구현 가능 여부 |
| AC2 동시 10배 확장 vs 시간 점진 중 채택안 + 수치 | §0.3, §2.3, §5.3 표 | `FOOD_PER_EXTRA_ENEMY/CAP` 등 5개 수치 + cpuCount별 Fc/Ic 표 명시 |
| AC3-1 기존 동작 보존 | §3.2, §6 | BF-504~BF-616 회귀 0 (focused scope) |
| AC3-2 롤백 | §7 (3단계) + §2.3 플래그 | 콘솔 플래그/설정/revert 각 절차 명시 |
| AC3-3 KPI 측정 코드 | §8 (구조·키·삽입 지점) | `bf-snake-enemy-kpi` + `[BF-628 KPI]` console |

### 11.2 채택안 근거 (동시 N배 확장 채택)

| 기준 | 동시 N배(채택) | 시간 점진(미채택) |
|---|---|---|
| 밀도 문제 해결 | ✅ 즉시(동시 경쟁자 수에 비례) | ⚠️ 부분(순간 1개 한계 잔존) |
| 영향 0 / blast-radius | ✅ 레인 분리로 기존 경로 무수정 | ✅ 유사 |
| AC2 "약 10배" 부합 | ✅ 최대 ≈10배 | ❌ 동시 1개 유지 |
| 롤백 단순성 | ✅ 플래그 2개 | ✅ 유사 |

→ 시간 점진은 "약 10배 동시 확장" 요구와 직접 충돌하고 본질(동시 경쟁자 수) 미해결.
   동시 N배 + 별도 풀 + 레인 분리가 영향 0·롤백·요구 충족을 동시에 만족하여 채택.

---

## 12. dev 구현 가이드 (개발자 체크리스트)

1. **`snake/logic.js`**:
   - §2.3 상수/플래그 `export`
   - `createEnemyStats()` 추가(`createItemStats` 패턴)
   - `chooseEnemyDir()` / `pickTarget()` / `targetScore()` / `threatScore()` /
     `weightsFor()` export — 단위 테스트 가능하도록 순수 함수(no DOM)
   - `DIFFICULTY_PARAMS` 에 §4.2 키 추가
   - `createInitialState`: `extraCpus[]` 원소에 §2.1 필드 + `extraFoods/extraItems/
     enemyStats` 초기화(`cpuCount≤1 || !MULTI_FOOD_ENABLED` → 빈 배열)
2. **`snake/game.js`**:
   - `tickExtraCpus()` → `tickEnemies()` 로 교체(호출부 `if (moveCpu) tickEnemies()` 유지)
   - 풀 보충(§5.3)·재생성(§5.5)·KPI(§8) 구현
   - `logEnemyKPI()` 추가 + 게임 종료 KPI 호출부에 1줄 추가
   - extras 렌더링은 기존 `drawExtraCpus`(game.js 2261행대) 재사용 — 신규 시각요소 없음
   - extras 속도효과: enemy 이동 accumulator 에 `extra:<id>` speedStack 반영
3. **테스트** (`tests/snake-BF<devKey>*.test.js`, focused scope):
   - `chooseEnemyDir`: FORAGE 타깃 추적 / EVADE 플레이어 회피 / CONTEST 가중 검증
   - `tickEnemies`: 먹이 섭취 → `pendingGrowth`/`score` 증가, 사망 → 재생성
   - 풀 사이징: cpuCount 2/3/5 → Fc=3/5/9 검증
   - 영향 0: `cpuCount=1` → extraFoods/extraItems 항상 []
   - 플래그 OFF 폴백 동작
4. **회귀 가드**: `node --test tests/snake-*.test.js` 전체 green
   (특히 BF-504/530/533/545/572/576/584 — 단일 레인·메인 CPU 불변 확인)

---

## 13. 미결 사항 (개발 착수 전 — 미확인 시 기본값 사용)

| # | 질문 | 기본값 |
|---|---|---|
| Q1 | extras 점수/길이를 HUD 에 노출? | v1 미노출(KPI·내부 변수만) — 시각은 후속 Epic |
| Q2 | extras 가 메인 CPU 와도 경합(CONTEST)? | v1 은 CONTEST 판정 대상 = player 만(단순화). 메인 CPU 머리는 §4.8 threat 로만 반영 |
| Q3 | extras LENGTH_BURST 적용? | v1 미적용(소멸·KPI). 후속 Epic 에서 per-enemy burst 검토 |
| Q4 | `FOOD_PER_EXTRA_ENEMY` 튜닝값 | 2.25(표 기준). 플레이테스트 후 조정 가능 — 상수 1곳 |
| Q5 | extra 재생성 무한 허용? | v1 무제한(보드 유지). cap 필요 시 후속 |

---

<!-- bf:pr-summary -->
## Summary
BF-628 planner 명세 산출물 `docs/design/snake-enemy-ai-items-BF-628.md` 1건을 작성했다.
기존 `extraCpus`(배회만 하던 적)를 먹이 섭취·성장·아이템·재생성하는 실질 AI 경쟁
유닛으로 승격하는 행동 규칙(FORAGE/CONTEST/EVADE 3모드 + 의사코드)을 구현 가능 수준으로
정의했다. 아이템 확장은 "동시 N배 확장(적 수 비례, 최대 ≈10배)"을 채택하되,
기존 단일 먹이/아이템 레인을 한 줄도 건드리지 않는 **별도 풀 + 레인 분리** 구조로
설계하여 단일 플레이 영향 0·롤백 단순성을 확보했다. developer 는 §12 체크리스트와
§4 의사코드만으로 추가 질문 없이 구현 가능하며, 신규 코드는 `cpuCount≥2` & feature
flag 뒤에서만 활성화된다(기본 설정 사용자 무동작).

## Changes
- `docs/design/snake-enemy-ai-items-BF-628.md` — 적 AI 통합 행동 모델(§4)·경쟁 레인
  틱 처리/풀 사이징 수치(§5)·영향 0 보존(§6)·3단계 롤백(§7)·`bf-snake-enemy-kpi`
  측정 항목(§8)·EC 11종(§9)·사용자 시나리오·AC 매핑·dev 구현 가이드 수록
<!-- /bf:pr-summary -->
