# BF-571: 지렁이 머리 충돌 판정 변경 명세

> **작성자**: 박기획 (planner)  
> **작성일**: 2026-05-14  
> **대상 모듈**: `snake/logic.js`, `snake/index.html`  
> **목적**: 현재 "머리 → 상대방 몸통" 충돌 판정을 제거하고, **머리 vs 머리(head-on)** 충돌만 남기는 규칙 변경 명세

---

## 1. 개요

현재 지렁이 게임(경쟁 모드)에서는 플레이어 머리가 CPU 지렁이의 **몸 어느 부분에든** 닿으면 플레이어가 사망한다(T3 검사). 이번 변경은 이 규칙을 철폐하고, **두 머리가 같은 셀에 동시 진입할 때만** 상호 충돌로 처리하도록 한다.

자기-몸 충돌(셀프-충돌, T2)과 벽 충돌(T1)은 **현행 유지**한다.

---

## 2. 현재 충돌 판정 분석

### 2.1 관련 함수·파일 위치

| 함수명 | 파일 | 라인 | 역할 |
|---|---|---|---|
| `isWallCollision(head, cols, rows)` | `snake/logic.js` | 243–244 | 격자 범위 이탈 검사 |
| `isSelfCollision(head, body)` | `snake/logic.js` | 254–256 | 자기 몸 겹침 검사 |
| 충돌 조합 블록 (tickFull) | `snake/logic.js` | 501–521 | 경쟁 모드 1프레임 충돌 처리 |
| 충돌 조합 블록 (tickWithItems) | `snake/logic.js` | 1008–1023 | 아이템 포함 충돌 처리 |
| 폴백 구현 (브라우저) | `snake/index.html` | 753–784 | 동일 로직 인라인 |

### 2.2 헤드 좌표 정의

```
snake[0] / cpu[0] = 현재 (이동 전) 머리 위치
newHead  = head.x + dir.x, head.y + dir.y  (이동 후 예정 위치)
```

충돌 검사는 모두 **newHead (이동 후 예정 위치)** 기준으로 수행한다.

### 2.3 현재 충돌 유형 및 검사 순서

```
T4 (head-on)  : newHead === newCpuHead  → 양쪽 모두 사망 (draw)
T1 (벽)        : isWallCollision(newHead) → 개별 사망
T2 (자기 몸)   : isSelfCollision(newHead, state.snake) → 개별 사망
T3 (상대 몸통) : !headOn && state.cpu.some(seg => seg === newHead) → 개별 사망
```

현재 `playerDead` 산출식:
```javascript
const playerDead = headOn || playerHitWall || playerHitSelf || playerHitCPU;
const cpuDead    = headOn || cpuHitWall    || cpuHitSelf    || cpuHitPlayer;
```

---

## 3. 변경 전·후 동작 비교표

| 시나리오 | 변경 **전** | 변경 **후** |
|---|---|---|
| 플레이어 머리 → CPU 머리 (동시, 같은 셀) | 양쪽 사망 (draw) | **양쪽 사망 (draw)** ← 유지 |
| 플레이어 머리 → CPU 몸통 (T3) | 플레이어 사망 (cpu_win) | **통과 (무피해)** ← 변경 |
| CPU 머리 → 플레이어 몸통 (T3) | CPU 사망 (player_win) | **통과 (무피해)** ← 변경 |
| 플레이어 머리 → 벽 (T1) | 플레이어 사망 | **플레이어 사망** ← 유지 |
| CPU 머리 → 벽 (T1) | CPU 사망 | **CPU 사망** ← 유지 |
| 플레이어 머리 → 자기 몸 (T2) | 플레이어 사망 | **플레이어 사망** ← 유지 |
| CPU 머리 → 자기 몸 (T2) | CPU 사망 | **CPU 사망** ← 유지 |
| 교차 이동 (swap) | T3로 플레이어/CPU 중 한 쪽 사망 | **양쪽 사망 (T4-SWAP, draw)** ← 추가 |

---

## 4. 충돌 판정 변경 명세

### 4.1 T3 (상대방 몸통 충돌) 제거

**변경 전 코드** (`tickFull`, `tickWithItems`, `index.html` 동일 패턴):
```javascript
// T3: 상대방 몸통 충돌 (T4 아닌 경우만)
const playerHitCPU =
  !headOn && state.cpu.some(s => s.x === newHead.x && s.y === newHead.y);
const cpuHitPlayer =
  !headOn && state.snake.some(s => s.x === newCpuHead.x && s.y === newCpuHead.y);
```

**변경 후**:
```javascript
// T3 제거 — 상대방 몸통 통과 허용
const playerHitCPU = false;
const cpuHitPlayer = false;
```

> **구현 주의**: 상수 `false` 로 두는 대신 해당 변수를 완전히 삭제하고, playerDead/cpuDead 산출식에서 `playerHitCPU`·`cpuHitPlayer` 항목을 제거하는 것이 더 깔끔하다.

**변경 후 playerDead 산출식**:
```javascript
const playerDead = headOnNormal || headOnSwap || playerHitWall || playerHitSelf;
const cpuDead    = headOnNormal || headOnSwap || cpuHitWall    || cpuHitSelf;
```

### 4.2 T4-SWAP (교차 이동 충돌) 신규 추가

T3 제거 시 발생하는 **교차 이동(pass-through) 시각적 버그**를 막기 위해 T4-SWAP 검사를 추가한다.

**시나리오**: 플레이어와 CPU가 서로 맞은편에서 마주보고 이동해 위치를 교환할 때.

```
프레임 n:     플레이어(2,2) ──→  CPU(3,2)
newHead = (3,2),  newCpuHead = (2,2)
```

T4 기존 조건: `newHead.x === newCpuHead.x && newHead.y === newCpuHead.y` → **(3,2) ≠ (2,2)** → false (미감지)

**T4-SWAP 추가 조건**:
```
newHead     === cpu[0]  (플레이어가 CPU의 현재 머리 위치로 이동)
AND
newCpuHead  === snake[0] (CPU가 플레이어의 현재 머리 위치로 이동)
```

**구현 예시**:
```javascript
// T4: 같은 셀 진입 (기존)
const headOnNormal = movePlayer && moveCpu &&
  newHead.x === newCpuHead.x && newHead.y === newCpuHead.y;

// T4-SWAP: 교차 이동 (신규)
const headOnSwap = movePlayer && moveCpu &&
  newHead.x === cpuHead.x  && newHead.y === cpuHead.y &&
  newCpuHead.x === head.x  && newCpuHead.y === head.y;

const headOn = headOnNormal || headOnSwap;
```

---

## 5. Edge Case 명세

### AC-1: 동시 머리 충돌 (head-on, T4Normal)

**Given** 플레이어와 CPU가 동시에 같은 셀로 이동할 때  
**When** 1 프레임 처리  
**Then** `playerDead = true, cpuDead = true, result = "draw", deathCause = "head_on"`

```
예시:
  플레이어: (2,5) →right→ (3,5)
  CPU:      (4,5) →left→  (3,5)
  → 양쪽 (3,5) 도달 → headOnNormal = true
```

### AC-2: 교차 이동 충돌 (T4-SWAP)

**Given** 플레이어와 CPU가 인접한 셀에서 서로 반대 방향으로 이동해 위치를 교환할 때  
**When** 1 프레임 처리  
**Then** `playerDead = true, cpuDead = true, result = "draw", deathCause = "head_on"`

```
예시:
  플레이어: (2,5) →right→ (3,5),  CPU: (3,5) →left→ (2,5)
  → headOnSwap = true → 양쪽 사망
```

**정책 결정**: T4-SWAP 은 머리 vs 머리 교환이므로 **양쪽 사망 (draw)** 으로 처리한다.  
단방향 이동 시(한쪽만 이동)에는 T4-SWAP 은 성립하지 않는다 (`movePlayer && moveCpu` 조건).

### AC-3: 머리 vs 상대 몸통 (T3 제거 후 통과)

**Given** 플레이어 머리가 CPU의 몸통 세그먼트 위치로 이동할 때  
**When** 1 프레임 처리  
**Then** 충돌 없이 정상 이동. `playerDead = false`.

```
예시:
  CPU 몸: [(5,5), (4,5), (3,5), (2,5)]
  플레이어 newHead: (4,5)  (CPU 몸통)
  → playerHitCPU = false → 사망 없음
```

**정책 결정**: 몸통 통과는 **허용**. 시각적으로 잠깐 겹쳐 보이지만 게임플레이 규칙상 충돌 없음.

### AC-4: 셀프-충돌 (T2) 정책 — 현행 유지

**Given** 플레이어/CPU 머리가 자기 몸통 어느 세그먼트와 겹칠 때  
**When** 1 프레임 처리  
**Then** 해당 지렁이 즉시 사망

**정책 결정**: 셀프-충돌은 **현행 유지** (완화하지 않는다).

근거:
- 셀프-충돌은 단일 플레이어 `tick()` 에도 존재하는 핵심 난이도 요소
- 이번 변경 목표("머리 끼리만 충돌")의 대상은 **다른 지렁이 간 충돌**에만 해당
- 셀프-충돌 완화는 별도 Task 에서 다룬다

### AC-5: 한쪽만 이동하는 프레임 (이동 잠금 상태)

**Given** 아이템에 의해 한쪽이 이동 불가 상태 (`movePlayer=false` 또는 `moveCpu=false`) 일 때  
**When** T4-SWAP 평가  
**Then** `headOnSwap = false` (양쪽 모두 이동 조건 `movePlayer && moveCpu` 로 필터링)

```javascript
// 이동 잠금 시 headOnSwap 성립 안 됨
const headOnSwap = movePlayer && moveCpu && ...;
```

### AC-6: deathCause 값 변경

T3 제거로 인해 `deathCause = "cpu_body"` / `"player_body"` 가 더 이상 생성되지 않는다.

| 구분 | 변경 전 deathCause 가능 값 | 변경 후 deathCause 가능 값 |
|---|---|---|
| playerDead 원인 | `"head_on"` / `"wall"` / `"self"` / `"cpu_body"` | `"head_on"` / `"wall"` / `"self"` |
| cpuDead 원인 | `"head_on"` / `"wall"` / `"self"` / `"player_body"` | `"head_on"` / `"wall"` / `"self"` |

---

## 6. 영향 범위

### 6.1 변경이 필요한 코드 위치

| 위치 | 파일 | 변경 내용 |
|---|---|---|
| `tickFull` 충돌 블록 | `snake/logic.js` L501–521 | T3 변수 제거, T4-SWAP 추가 |
| `tickWithItems` 충돌 블록 | `snake/logic.js` L1008–1023 | 동일 |
| deathCause 분기 (tickFull) | `snake/logic.js` L528–551 | `"cpu_body"` 분기 제거 |
| deathCause 분기 (tickWithItems) | `snake/logic.js` L1036–1049 | 동일 |
| 폴백 구현 | `snake/index.html` L753–784 | 동일 패턴 |

### 6.2 변경 불필요 코드

| 위치 | 이유 |
|---|---|
| `tick()` (단일 플레이어) | CPU 없음, 해당 없음 |
| `isWallCollision()` | 변경 없음 |
| `isSelfCollision()` | 변경 없음 |
| `cpuChooseDir()` 내부 회피 로직 | CPU AI는 플레이어 몸통을 `occupiedSet` 으로 회피 — 이 AI-level 회피는 **유지** (게임플레이 가치) |

### 6.3 CPU AI 회피 로직 (변경 불필요, 단 주의 필요)

`cpuChooseDir()` 내 `occupiedSet` 은 플레이어 전체 몸을 회피 대상으로 포함한다. T3 제거 후에도 **CPU AI 가 플레이어 몸을 피하는 것은 유지**한다.

근거: 충돌 판정 규칙과 AI 전략은 별개다. CPU 가 스스로 플레이어 몸으로 진입하지 않도록 AI 전략을 유지하면 게임 퀄리티가 높아진다.

---

## 7. 테스트 영향 분석

### 7.1 수정이 필요한 기존 테스트

다음 테스트는 T3(몸통 충돌) 동작을 기대하므로 **수정 또는 삭제**가 필요하다.

| 파일 | 테스트 케이스 | 현재 기대값 | 변경 후 기대값 |
|---|---|---|---|
| `tests/snake-BF530.test.js` | §3-5 Player가 CPU 몸통 충돌 | `result: "cpu_win", deathCause: "cpu_body"` | 사망 없음 (테스트 로직 변경) |
| `tests/snake-BF530.test.js` | §3-6 CPU가 Player 몸통 충돌 | `result: "player_win"` | 사망 없음 |

### 7.2 신규 테스트 추가 필요

| 케이스 | 설명 |
|---|---|
| T4-SWAP 검증 | 두 머리 교차 이동 → draw, deathCause: "head_on" |
| 몸통 통과 검증 | 플레이어 머리가 CPU 몸통 위치로 이동해도 생존 |
| 단방향 이동 잠금 중 T4-SWAP 미발생 | movePlayer=false 시 headOnSwap = false |

---

## 8. Acceptance Criteria 매핑

| AC 항목 | 해당 섹션 | 충족 여부 |
|---|---|---|
| 충돌 판정 함수 위치·입력·반환 식별 | §2 (현재 분석) | ✅ |
| 변경 전·후 동작 비교표 | §3 (비교표) | ✅ |
| 동시 머리 충돌 정책 (양쪽/한쪽 사망) | §5 AC-1, AC-2 | ✅ 양쪽 사망 (draw) |
| 셀프-충돌 정책 결정·기록 | §5 AC-4 | ✅ 현행 유지 |

---

## 9. 미결 사항 (개발자 확인 필요)

| # | 항목 | 권고 |
|---|---|---|
| 1 | `deathCause = "cpu_body"` 가 HUD / 결과 화면 UI 에 출력되는가? | 있다면 해당 문자열 표시 코드 제거 또는 숨김 처리 필요 |
| 2 | T4-SWAP 발생 시 사운드/이펙트가 headOn 과 동일하게 재생되어야 하는가 | 별도 이펙트 없이 headOn 동일 처리 권고 |
