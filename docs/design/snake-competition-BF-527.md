# Snake 경쟁 모드 설계 명세 — BF-527 / BF-529

> 작성자: [박기획] · 최초 작성 2026-05-14  
> 관련 티켓: BF-527 (CPU 지렁이 구현), BF-529 (경쟁 규칙·UI·KPI 명세)  
> 기반 모듈: `snake/` (BF-504 ~ BF-526 에서 구축된 단일 플레이어 버전)

---

## 목차

1. [전제 조건 · 용어 정의](#1-전제-조건--용어-정의)
2. [경쟁 게임 종료 조건](#2-경쟁-게임-종료-조건)
3. [승패 판정 표](#3-승패-판정-표)
4. [점수 시스템](#4-점수-시스템)
5. [UI 변경 명세 — 플레이어 / CPU 식별](#5-ui-변경-명세--플레이어--cpu-식별)
6. [KPI 측정 명세](#6-kpi-측정-명세)
7. [Acceptance Criteria (Given/When/Then)](#7-acceptance-criteria-givenwhenhen)
8. [Edge Case 목록](#8-edge-case-목록)
9. [미결 사항 (Open Questions)](#9-미결-사항-open-questions)

---

## 1. 전제 조건 · 용어 정의

| 용어 | 정의 |
|------|------|
| **플레이어 지렁이** | 키보드(Arrow / WASD)로 조작하는 지렁이. 코드 내 식별자: `playerSnake` |
| **CPU 지렁이** | 자동 AI 알고리즘으로 움직이는 지렁이. 코드 내 식별자: `cpuSnake` |
| **헤드** | 지렁이 배열의 인덱스 0 (`snake[0]`) 위치 |
| **몸통** | 지렁이 배열의 인덱스 1 이상 전체 세그먼트 |
| **동시 사망** | 같은 틱(tick) 에서 플레이어와 CPU 헤드가 모두 충돌 조건을 만족 |
| **제한 시간** | 기본 **120 초**. 추후 설정 값으로 변경 가능 (구현 시 `GAME_DURATION_MS` 상수 사용). |
| **틱** | `logic.js` 의 `tick()` 1회 호출 = TICK_MS(120ms) 간격 1 스텝 |

---

## 2. 경쟁 게임 종료 조건

경쟁 모드에서 게임이 종료되는 조건은 아래 5가지이다.  
각 조건은 **틱 처리 함수** 내에서 매 스텝마다 검사한다.

| # | 종료 트리거 | 발생 주체 |
|---|------------|---------|
| T1 | 벽 충돌 (격자 경계 밖) | 플레이어 또는 CPU |
| T2 | 자기 몸통 충돌 | 플레이어 또는 CPU |
| T3 | 상대방 몸통 충돌 (상대 몸통 셀에 헤드 진입) | 플레이어 또는 CPU |
| T4 | 헤드-온 충돌 (같은 틱에 두 헤드가 동일 셀로 이동) | 양쪽 동시 |
| T5 | 제한 시간 만료 (120초) | 시스템 타이머 |

> **주의 (T3 vs T4):** T3은 한쪽 헤드가 상대방 몸통 세그먼트(헤드 제외)로 진입하는 경우이고,  
> T4는 두 헤드가 동일 좌표로 이동하는 경우다. 틱 처리 순서상 T4를 T3보다 먼저 검사해야  
> 한쪽이 일방적으로 사망 처리되는 오류를 방지한다.

---

## 3. 승패 판정 표

### 3-1. 기본 케이스

| 케이스 | 플레이어 상태 | CPU 상태 | 결과 | 비고 |
|--------|------------|---------|------|------|
| A | 사망 (T1/T2/T3) | 생존 | **패 (Lose)** | 플레이어 단독 충돌 |
| B | 생존 | 사망 (T1/T2/T3) | **승 (Win)** | CPU 단독 충돌 |
| C | 동시 사망 (T4, 또는 같은 틱 각자 T1/T2/T3) | 동시 사망 | **무 (Draw)** | 점수 무관 |
| D | 생존 (T5 발동) | 생존 (T5 발동) | 점수 비교 → 아래 3-2 참조 | 제한 시간 종료 |

### 3-2. 시간 종료 후 점수 비교 (케이스 D 세부)

| 플레이어 점수 vs CPU 점수 | 결과 |
|--------------------------|------|
| 플레이어 점수 **>** CPU 점수 | **승 (Win)** |
| 플레이어 점수 **=** CPU 점수 | **무 (Draw)** |
| 플레이어 점수 **<** CPU 점수 | **패 (Lose)** |

> **근거:** 동시 사망(케이스 C)은 실력보다 타이밍 운이 크므로 무로 단순 처리.  
> 시간 종료(케이스 D)는 생존한 채 성과를 냈으므로 점수로 우열을 가린다.

---

## 4. 점수 시스템

### 4-1. 기본 점수 규칙

| 이벤트 | 플레이어 점수 변화 | CPU 점수 변화 |
|--------|-----------------|-------------|
| 플레이어가 먹이 수집 | +10 | 변화 없음 |
| CPU가 먹이 수집 | 변화 없음 | +10 |
| 충돌 사망 | 변화 없음 (점수 확정) | 변화 없음 (점수 확정) |
| 시간 종료 | 변화 없음 (점수 확정) | 변화 없음 (점수 확정) |

> **먹이 공유:** 격자에는 먹이가 항상 **1개**만 존재. 어느 쪽이든 수집하면 새 먹이가 스폰됨.

### 4-2. High Score

- High Score 대상은 **플레이어 점수**만 (`localStorage` 키: `bf-snake-high-score`, BF-504 기존 키 유지)
- CPU 점수는 High Score에 반영하지 않는다.

---

## 5. UI 변경 명세 — 플레이어 / CPU 식별

### 5-1. 지렁이 색상 및 헤드 구분

| 속성 | 플레이어 (PLAYER) | CPU |
|------|-----------------|-----|
| **몸통 채우기 색** | `#4cff80` *(기존 초록 유지)* | `#ff6b4c` *(주황-빨강)* |
| **헤드 채우기 색** | `#00cc44` *(진한 초록)* | `#cc2200` *(진한 빨강)* |
| **헤드 테두리** | 2 px solid `rgba(255,255,255,0.5)` | 2 px solid `rgba(255,255,255,0.5)` |
| **헤드 라벨 텍스트** | `"P"` (헤드 셀 중앙, 8px, white) | `"C"` (헤드 셀 중앙, 8px, white) |

> 헤드 라벨은 셀 크기(CELL=20px)가 작아 가독성이 낮을 경우 생략 가능 (개발자 재량).  
> 대신 **헤드 테두리(2 px stroke) 는 필수** — 라벨 없이도 헤드 위치를 즉시 인식해야 함.

### 5-2. 범례 (Legend) — 화면 좌하단 고정

HTML 구조 (신규 추가):

```html
<div id="competition-legend">
  <span class="legend-item player">● PLAYER</span>
  <span class="legend-item cpu">● CPU</span>
</div>
```

| CSS 속성 | 값 |
|----------|---|
| `position` | `fixed` |
| `bottom` | `16px` |
| `left` | `20px` |
| `font-size` | `13px` |
| `color` | `#e0e0e0` |
| `.legend-item.player` 색 | `#4cff80` |
| `.legend-item.cpu` 색 | `#ff6b4c` |
| `pointer-events` | `none` |
| `z-index` | `10` |

### 5-3. 점수판 (HUD) 변경

기존 HUD는 플레이어 단일 점수만 표시했으나, 경쟁 모드에서는 **양쪽 점수를 동시 표시**한다.

**변경 전 (단일 플레이어):**

```
[우상단]
  24          ← 현재 점수
  Best: 30    ← 최고 점수
```

**변경 후 (경쟁 모드):**

```
[우상단]
  PLAYER  24   |   CPU  18
        Best: 30
```

HTML 구조 (기존 `#hud` 교체):

```html
<div id="hud" aria-live="polite" aria-label="점수 현황">
  <div class="hud-row">
    <span class="hud-label player-label">PLAYER</span>
    <span class="hud-score player-score" id="hud-player-score">0</span>
    <span class="hud-divider">|</span>
    <span class="hud-label cpu-label">CPU</span>
    <span class="hud-score cpu-score" id="hud-cpu-score">0</span>
  </div>
  <div class="hud-high">Best: <span id="hud-high-value">0</span></div>
</div>
```

| CSS 식별자 | 색상 |
|------------|------|
| `.player-label`, `.player-score` | `#4cff80` |
| `.cpu-label`, `.cpu-score` | `#ff6b4c` |
| `.hud-divider` | `#555` |

### 5-4. 게임 결과 오버레이 변경

기존 Game Over 오버레이를 경쟁 모드 결과 오버레이로 확장한다.

| 결과 | `<h2>` 텍스트 | `<h2>` 색상 |
|------|--------------|------------|
| 승 (Win) | `YOU WIN` | `#4cff80` |
| 패 (Lose) | `YOU LOSE` | `#ff4c4c` |
| 무 (Draw) | `DRAW` | `#ffcc44` |

표시 내용:
- 결과 텍스트 (위 표)
- `PLAYER: {플레이어 점수}  vs  CPU: {CPU 점수}`
- `Press Space to restart`

---

## 6. KPI 측정 명세

### 6-1. 측정 항목

| # | KPI 항목 | 단위 | 측정 방법 |
|---|----------|------|---------|
| K1 | **게임당 생존시간** | ms | 게임 시작 타임스탬프(`performance.now()`)부터 종료 틱까지 경과 ms. 멈춤(paused) 구간은 **제외**. |
| K2 | **승률** | 정수 비율 (wins / totalGames) | 누적 게임 수 대비 승 횟수. 무(Draw)는 승/패 모두 포함 안 함. |
| K3 | **CPU 충돌 사망률** | 정수 비율 (cpuCollisionDeaths / totalDeaths) | 플레이어 사망 원인이 T3(상대 몸통 충돌) 또는 T4(헤드-온 충돌)인 비율. |

### 6-2. 저장 위치

#### 6-2-1. 직전 게임 상세 KPI — `localStorage`

키명: **`bf-snake-comp-kpi`**  
형식: JSON 문자열

```json
{
  "survivalMs": 34200,
  "result": "win",
  "playerScore": 40,
  "cpuScore": 20,
  "deathCause": null,
  "cpuCollision": false,
  "timestamp": 1747190400000
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `survivalMs` | number | 멈춤 제외 생존시간 (ms) |
| `result` | `"win" \| "lose" \| "draw"` | 해당 게임 결과 |
| `playerScore` | number | 게임 종료 시 플레이어 점수 |
| `cpuScore` | number | 게임 종료 시 CPU 점수 |
| `deathCause` | `"wall" \| "self" \| "cpu_body" \| "head_on" \| "timeout" \| null` | 플레이어 사망 원인 (승리 시 null) |
| `cpuCollision` | boolean | CPU 관련 충돌로 사망했는지 (`cpu_body` 또는 `head_on`) |
| `timestamp` | number | `Date.now()` 기록 시각 |

#### 6-2-2. 누적 통계 — `localStorage`

키명: **`bf-snake-comp-stats`**  
형식: JSON 문자열

```json
{
  "totalGames": 15,
  "wins": 6,
  "losses": 7,
  "draws": 2,
  "totalDeaths": 13,
  "cpuCollisionDeaths": 4
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `totalGames` | number | 전체 게임 수 |
| `wins` | number | 승 횟수 |
| `losses` | number | 패 횟수 |
| `draws` | number | 무 횟수 |
| `totalDeaths` | number | 플레이어가 충돌로 사망한 총 횟수 (timeout 제외) |
| `cpuCollisionDeaths` | number | CPU 충돌(T3/T4)로 사망한 횟수 |

#### 6-2-3. console.log 출력 (게임 종료 시)

```
[BF-529 KPI] 결과: win | 생존시간: 34200ms | P:40 vs CPU:20 | 사망원인: null | 승률: 40.0%(6/15)
```

출력 코드 형식:

```js
console.log(
  `[BF-529 KPI] 결과: ${result} | 생존시간: ${survivalMs}ms | P:${playerScore} vs CPU:${cpuScore} | 사망원인: ${deathCause} | 승률: ${winRate}%(${wins}/${totalGames})`
);
```

---

## 7. Acceptance Criteria (Given/When/Then)

### AC-1 승패 판정 표

**Given** 경쟁 게임 종료 조건이 5가지(T1~T5)로 변경되었을 때,  
**When** 명세(§3 승패 판정 표)를 보면,  
**Then** 아래 케이스 전부가 표로 정리되어 있어야 한다:
- 플레이어만 사망 → 패
- CPU만 사망 → 승
- 플레이어·CPU 동시 사망 → 무
- 시간 종료 (양쪽 생존), 플레이어 점수 > CPU → 승
- 시간 종료 (양쪽 생존), 점수 동일 → 무
- 시간 종료 (양쪽 생존), 플레이어 점수 < CPU → 패

### AC-2 UI 명세

**Given** 경쟁 모드 UI 요구사항이 정의되었을 때,  
**When** 명세(§5 UI 변경 명세)를 보면,  
**Then** 다음 항목이 **모두** 기술되어 있어야 한다:
- 플레이어 지렁이 색상 (`#4cff80`) 과 CPU 지렁이 색상 (`#ff6b4c`) 이 명시
- 헤드 구분을 위한 헤드 테두리(2 px stroke) 명세 포함
- 화면 좌하단에 플레이어/CPU 범례(`● PLAYER`, `● CPU`) 배치 결정 기술
- 기존 단일 점수판 → 양쪽 스코어 동시 표시로 변경 명세 (`PLAYER 점수 | CPU 점수`) 포함

### AC-3 KPI 명세

**Given** 경쟁 모드 KPI 수집 요구사항이 있을 때,  
**When** 명세(§6 KPI 측정 명세)를 보면,  
**Then** 다음 3개 항목 전부가 기술되어 있어야 한다:
- 게임당 생존시간: 단위(ms), 멈춤 구간 제외 방법, 저장 키(`bf-snake-comp-kpi`)
- 승률: 산출 공식(`wins / totalGames`), 저장 키(`bf-snake-comp-stats`)
- CPU 충돌사망률: 산출 공식(`cpuCollisionDeaths / totalDeaths`), 저장 키(`bf-snake-comp-stats`)
- `console.log` 출력 형식이 명시되어 있음

---

## 8. Edge Case 목록

| EC# | 시나리오 | 처리 방법 |
|-----|---------|---------|
| EC-1 | 첫 틱에 플레이어·CPU 스폰 위치가 겹침 | 초기 상태 생성 시 CPU 스폰 위치를 플레이어 반대편(격자 우하단 영역)에 고정. 겹침 자체를 방지. |
| EC-2 | 먹이가 두 지렁이 사이 1칸에 스폰 | 정상 동작 — 먼저 도착한 쪽이 수집. 별도 처리 없음. |
| EC-3 | 제한 시간 종료 시각과 충돌 발생이 동일 틱 | 충돌(T1~T4) 우선 처리 → 충돌 결과(승/패/무)로 판정. 시간 종료(T5)는 무시. |
| EC-4 | CPU가 먹이를 모두 독점해 격자 가득 참 | 먹이 스폰 불가(`spawnFoodCell` → null) → 게임 계속 진행, 점수 변동 없음. 시간 종료로만 종료. |
| EC-5 | `localStorage` 쓰기 실패 (프라이빗 모드 등) | `try/catch` 로 감싸고 무시. `console.log` 기록은 항상 실행. |
| EC-6 | 멈춤(paused) 상태에서 제한 시간 타이머 | 멈춤 중 타이머도 일시 정지 (`clearInterval` / 재개 시 `setInterval` 재설정). 생존시간 계산에서도 제외. |
| EC-7 | `totalDeaths === 0` 에서 CPU 충돌사망률 계산 | 0으로 나누기 방지: `totalDeaths === 0 ? 0 : cpuCollisionDeaths / totalDeaths` |

---

## 9. 미결 사항 (Open Questions)

| OQ# | 질문 | 영향 범위 |
|-----|------|---------|
| OQ-1 | 제한 시간을 120초 외 다른 값(예: 60초, 180초)으로 설정하는 UI가 필요한가? | BF-527 구현 범위 결정 필요 (현재는 상수 고정) |
| OQ-2 | CPU 난이도(Easy/Hard)를 이번 스프린트에 포함하는가? | CPU AI 알고리즘 복잡도에 영향 |
| OQ-3 | 경쟁 모드와 단일 플레이어 모드를 모드 선택 화면으로 분기할 것인가, 아니면 별도 URL/파일로 분리할 것인가? | `index.html` 구조 변경 범위에 영향 |
| OQ-4 | 누적 통계(`bf-snake-comp-stats`)의 초기화(리셋) 기능이 UI에 필요한가? | UX 설계 결정 필요 |
