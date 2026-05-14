# 지렁이게임 아이템 시스템 기획 명세 — BF-538 / BF-539

> 작성자: [박기획] · 작성일 2026-05-14
> 관련 티켓: BF-539 (planner 작업), BF-538 (부모 스토리)
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)
> 의존 명세: `docs/design/snake-competition-BF-527.md` (경쟁 모드), `docs/design/snake-effects-BF-536.md` (이팩트)

---

## 목차

1. [개요 및 아이템 카테고리 정의](#1)
2. [아이템 목록 전체 표](#2)
3. [즉시 발동형 아이템 상세 명세](#3)
4. [보유형 아이템 상세 명세](#4)
5. [발동 흐름 시나리오](#5)
6. [스폰 규칙](#6)
7. [중첩 우선순위 규칙](#7)
8. [사용키 매핑 및 HUD UI 요구사항](#8)
9. [마이그레이션 전략](#9)
10. [KPI 측정 항목](#10)
11. [디자이너 위임 시각 요소](#11)
12. [Edge Case 목록](#12)
13. [Acceptance Criteria 매핑](#13)

---

## 1. 개요 및 아이템 카테고리 정의

### 1-1. 도입 목적

현재 지렁이게임은 배수 먹이(1×/2×/4×/8×) 만 존재하여 점수 누적이 유일한 메카닉이다.
아이템 시스템은 속도·길이·보호·방해 효과를 부여해 전략적 선택지와 긴장감을 추가한다.

### 1-2. 두 카테고리 정의

| 카테고리 | 영문 식별자 | 발동 방식 | 설명 |
|---------|-----------|---------|------|
| 즉시 발동형 | INSTANT | 획득(밟기) 즉시 효과 적용 | 별도 조작 없이 수집과 동시에 효과 시작 |
| 보유형 | HOLDABLE | 획득 후 Z 키로 수동 발동 | 슬롯에 보관 후 원하는 타이밍에 사용 |

### 1-3. 아이템과 배수 먹이의 관계

- 아이템은 기존 배수 먹이(food)와 별도 스폰 슬롯을 사용한다.
- 보드에는 배수 먹이 1개 + 아이템 최대 1개가 동시에 존재 가능.
- 아이템을 수집해도 점수는 증가하지 않는다 (효과만 적용).
- 보유형 아이템 사용에 의한 간접 점수 변화는 KPI로 측정한다.

---

## 2. 아이템 목록 전체 표

| # | 이름 | 식별자 | 카테고리 | 효과 요약 | 지속시간 | 스폰 가중치 | 획득 대상 |
|---|------|--------|---------|---------|--------|-----------|---------|
| 1 | 스피드업 | SPEED_UP | INSTANT | 획득자 이동 속도 1.5배 | 5초 (42틱) | 25 | 플레이어/CPU |
| 2 | 슬로우다운 | SLOW_DOWN | INSTANT | 획득자 이동 속도 0.5배 | 5초 (28틱) | 25 | 플레이어/CPU |
| 3 | 길이폭발 | LENGTH_BURST | INSTANT | 획득자 뱀 길이 현재 × 10, 5초 후 복귀 | 5초 (42틱) | 15 | 플레이어/CPU |
| 4 | 방패 | SHIELD | HOLDABLE | 다음 충돌 1회 무효화 | 충돌 1회 또는 30초 | 20 | 플레이어 전용 |
| 5 | 역전탄 | REVERSE | HOLDABLE | 상대방(CPU) 이동 방향 역전 | 3초 (25틱) | 15 | 플레이어 전용 |

틱 환산 기준: TICK_MS = 120ms → 5,000ms / 120ms ≈ 42틱 / 3,000ms / 120ms = 25틱
스폰 가중치 합계: 25 + 25 + 15 + 20 + 15 = 100 (정규화 분모)

---

## 3. 즉시 발동형 아이템 상세 명세

### 3-1. SPEED_UP (스피드업)

| 항목 | 값 |
|------|----|
| 식별자 | SPEED_UP |
| 카테고리 | INSTANT |
| 획득 조건 | 플레이어 또는 CPU 헤드가 아이템 셀로 이동 |
| 효과 | 획득자의 tickIntervalMs 를 80ms 로 변경 (기본 120ms → 1.5배 빠름) |
| 지속 시간 | 5,000ms (42틱) — 내부 카운터 speedUpTicks 로 관리 |
| 종료 후 복원 | tickIntervalMs 를 기존 값(또는 현재 활성 슬로우다운 값)으로 복원 |
| 적용 범위 | 획득한 주체(플레이어/CPU)의 tick 주기만 변경 |
| 시각 힌트 | HUD에 ⚡ 아이콘 + 남은 시간 표시 (즉시발동형 버프 표시줄) |

### 3-2. SLOW_DOWN (슬로우다운)

| 항목 | 값 |
|------|----|
| 식별자 | SLOW_DOWN |
| 카테고리 | INSTANT |
| 획득 조건 | 플레이어 또는 CPU 헤드가 아이템 셀로 이동 |
| 효과 | 획득자의 tickIntervalMs 를 240ms 로 변경 (기본 120ms → 0.5배 느림) |
| 지속 시간 | 5,000ms (약28틱) — 내부 카운터 slowDownTicks 로 관리 |
| 종료 후 복원 | tickIntervalMs 를 기존 값(또는 현재 활성 스피드업 값)으로 복원 |
| 적용 범위 | 획득한 주체의 tick 주기만 변경 |
| 시각 힌트 | HUD에 🐢 아이콘 + 남은 시간 표시 |

### 3-3. LENGTH_BURST (길이폭발)

| 항목 | 값 |
|------|----|
| 식별자 | LENGTH_BURST |
| 카테고리 | INSTANT |
| 획득 조건 | 플레이어 또는 CPU 헤드가 아이템 셀로 이동 |
| 효과 | 획득자의 뱀 배열에 (현재 길이 × 10) − 현재 길이 개 세그먼트 즉시 추가 |
| 지속 시간 | 5,000ms (42틱) |
| 종료 후 복원 | 길이를 폭발 직전 길이로 복원 (tail 에서 초과 세그먼트 제거) |
| 최소 길이 보장 | 폭발 전 길이 1이면 획득 후 길이 10, 복원 시 다시 1 |
| 최대 길이 캡 | 폭발 후 길이가 cols × rows × 0.8 초과 시 캡 적용 |
| 시각 힌트 | HUD에 🔥 아이콘 + 남은 시간, 뱀 몸통 색상 깜박임 |

---

## 4. 보유형 아이템 상세 명세

### 4-1. 공통 보유형 규칙

| 규칙 | 내용 |
|------|------|
| 보관 슬롯 수 | 1개 (새 보유형 아이템 획득 시 기존 슬롯 아이템 교체) |
| 발동 키 | z 또는 Z (현재 미사용 키) |
| 발동 조건 | state.status === "playing" + 슬롯에 아이템 존재 |
| 사용 후 슬롯 | 빈 슬롯 (null) 으로 초기화 |
| 아이템 만료 | 획득 후 30초 내 미사용 시 자동 소멸 |
| CPU 보유형 | CPU가 밟아도 아이템 소멸만, 슬롯 미보관 |

### 4-2. SHIELD (방패)

| 항목 | 값 |
|------|----|
| 식별자 | SHIELD |
| 획득 주체 | 플레이어 전용 |
| 발동 효과 | 다음 충돌(벽/자기 몸통/CPU 몸통/헤드-온) 1회 무효화 |
| 충돌 무효화 범위 | T1(벽), T2(자기 몸통), T3(상대 몸통), T4(헤드-온) 모두 포함 |
| 방패 유지 조건 | 충돌 1회 발생 시 방패 소멸 후 게임 계속 진행 |
| 지속 시간 | 충돌 1회 또는 보유 30초 초과 |
| 시각 힌트 | HUD 보유 슬롯에 🛡️ 아이콘 + 활성 중 뱀 윤곽선 글로우 효과 |

### 4-3. REVERSE (역전탄)

| 항목 | 값 |
|------|----|
| 식별자 | REVERSE |
| 획득 주체 | 플레이어 전용 |
| 발동 효과 | CPU의 현재 이동 방향을 180도 반전 (좌우, 상하) |
| 역전 지속 | 3,000ms (25틱) 동안 CPU nextDir 를 역방향으로 오버라이드 |
| 역전 오버라이드 | CPU AI cpuChooseDir 반환값의 반대 방향으로 강제 변경 |
| 종료 | 25틱 경과 또는 CPU 사망 시 해제 |
| 시각 힌트 | HUD 보유 슬롯에 🌀 아이콘, 발동 중 CPU 주변 소용돌이 이팩트 |

---

## 5. 발동 흐름 시나리오

### 5-1. 즉시 발동형 흐름

Given 플레이어가 이동하여 아이템 셀에 진입할 때
When 헤드 위치 == 아이템 셀 검사
Then:
1. state.item = null (보드에서 제거)
2. 효과 적용 (tickIntervalMs 변경 또는 길이 즉시 증가)
3. 효과 타이머 시작 (effectTicks 카운터 세팅)
4. KPI: itemStats[type].acquired++
5. game.js: 이팩트 트리거

매 틱: effectTicks 감소 → effectTicks === 0 일 때 효과 종료:
1. tickIntervalMs 복원
2. LENGTH_BURST: 초과 세그먼트 제거
3. KPI: itemStats[type].durationCompleted++

### 5-2. 보유형 획득 흐름

Given 플레이어가 이동하여 HOLDABLE 아이템 셀에 진입할 때
When 헤드 위치 == 아이템 셀 && category === HOLDABLE
Then:
1. state.item = null (보드에서 제거)
2. 기존 state.heldItem 교체 (있으면 KPI: dropped++)
3. state.heldItem = { type, acquiredAt, expiresAt: now + 30000 }
4. KPI: itemStats[type].acquired++
5. HUD 보유 슬롯 업데이트

### 5-3. 보유형 발동 흐름

Given 플레이어가 Z 키 입력
When state.status === "playing" && state.heldItem !== null
Then SHIELD:
  1. state.shieldActive = true
  2. state.heldItem = null
  3. KPI: itemStats.SHIELD.used++
  4. HUD: 뱀 글로우 이팩트 ON
Then REVERSE:
  1. state.cpuReverseTicksLeft = 25
  2. state.heldItem = null
  3. KPI: itemStats.REVERSE.used++
  4. HUD: 역전탄 발동 알림 + CPU 이팩트

### 5-4. 보유형 자동 만료 흐름

Given 매 틱 체크
When now > state.heldItem.expiresAt
Then:
- KPI: itemStats[type].expired++
- state.heldItem = null
- HUD: "[아이템명] 소멸" 텍스트 알림 1.5초

---

## 6. 스폰 규칙

### 6-1. 스폰 조건 (타이머 기반)

| 항목 | 값 |
|------|----|
| 최초 스폰 지연 | 게임 시작 후 20초 경과 후 최초 스폰 |
| 이후 스폰 간격 | 30초 ± 5초 균일 랜덤 Jitter (25~35초) |
| 동시 아이템 제한 | 보드에 아이템 1개 상한 (기존 아이템 존재 시 스폰 스킵) |
| 아이템 수명 | 스폰 후 10초 경과 시 자동 소멸 (KPI: expired++) |
| 위치 선택 | spawnFoodCell 동일 로직 — 뱀 몸통 + 기존 먹이 셀 제외 랜덤 |
| 아이템 종류 선택 | §2 가중치 테이블 기반 pickItemType() 신규 함수 |

### 6-2. 스폰 확률 가중치 테이블

```js
// logic.js 신규 상수 — FIXME(BF-539): dev 구현 시 참고
const ITEM_WEIGHTS = [
  { type: "SPEED_UP",     weight: 25 },
  { type: "SLOW_DOWN",    weight: 25 },
  { type: "LENGTH_BURST", weight: 15 },
  { type: "SHIELD",       weight: 20 },
  { type: "REVERSE",      weight: 15 },
];
const ITEM_TOTAL_WEIGHT = 100;
```

### 6-3. 최초 스폰 지연 이유

첫 20초는 플레이어가 게임 흐름에 적응하는 시간이다.
아이템이 너무 이르게 등장하면 초보 플레이어가 의도치 않게 수집해 혼란을 유발한다.

### 6-4. feature flag OFF 시 스폰 동작

ITEMS_ENABLED === false 또는 ITEM_SPAWN_RATE === 0 이면
스폰 타이머 자체를 시작하지 않는다.
기존 배수 먹이 동작에 전혀 영향 없음.

---

## 7. 중첩 우선순위 규칙

### 7-1. 즉시 발동형 중첩 정책

| 시나리오 | 처리 방식 |
|---------|---------|
| SPEED_UP 활성 중 SPEED_UP 재획득 | 기존 타이머 리셋 (42틱으로 재시작). 배속 중첩 없음 |
| SLOW_DOWN 활성 중 SLOW_DOWN 재획득 | 기존 타이머 리셋. 감속 중첩 없음 |
| SPEED_UP 활성 중 SLOW_DOWN 획득 | SLOW_DOWN이 우선 적용 (240ms). SPEED_UP 타이머는 계속 감소 |
| SLOW_DOWN 활성 중 SPEED_UP 획득 | SPEED_UP이 우선 적용 (80ms). SLOW_DOWN 타이머는 계속 감소 |
| LENGTH_BURST 활성 중 LENGTH_BURST 재획득 | 타이머 리셋만 (길이 추가 중첩 없음) |
| 다른 즉시 발동형과 LENGTH_BURST 동시 활성 | 서로 독립적 타이머. 상호 간섭 없음 |

### 7-2. 속도 우선순위 스택 구현 가이드

```js
// state.speedStack = [{ type: "SPEED_UP"|"SLOW_DOWN", expiresAtTick }]
// 매 틱 만료된 항목 제거
// 남은 항목 중 마지막으로 획득한 항목의 tickIntervalMs 적용
// 스택이 비면 기본 tickIntervalMs (normal: 120ms, easy: 240ms) 로 복원
```

### 7-3. 보유형 슬롯 교체 정책

| 시나리오 | 처리 방식 |
|---------|---------|
| 빈 슬롯에 보유형 획득 | 슬롯에 보관 |
| 슬롯 점유 중 동일 종류 획득 | 만료 시간 갱신 (30초 리셋). 기존 아이템 유지 |
| 슬롯 점유 중 다른 종류 획득 | 기존 아이템 드롭 (KPI: dropped++), 새 아이템으로 교체 |
| CPU가 보유형 밟기 | 아이템 소멸 (보드에서 제거). KPI: cpuConsumed++ |

---

## 8. 사용키 매핑 및 HUD UI 요구사항

### 8-1. 사용키 매핑

| 키 | 역할 | 현재 상태 |
|----|------|---------|
| ArrowUp/Down/Left/Right | 방향 전환 | 기존 (변경 없음) |
| W/A/S/D | 방향 전환 (WASD) | 기존 (변경 없음) |
| Space | 멈춤/재개, 게임오버 후 재시작 | 기존 (변경 없음) |
| z / Z | 보유형 아이템 발동 | 신규 추가 |

z 키는 현재 미사용 상태 (keydown 핸들러에 매핑 없음). 충돌 없음.

### 8-2. 키 처리 로직 위치 (game.js)

```js
// keydown 핸들러 playing 상태 블록에 추가 — FIXME(BF-539)
if (e.key === "z" || e.key === "Z") {
  e.preventDefault();
  if (state.heldItem !== null) {
    state = useHeldItem(state);  // logic.js 신규 함수
  }
  return;
}
```

### 8-3. HUD UI 요구사항

현재 HUD 구조에 다음 2개 신규 구역을 추가한다:

#### 8-3-1. 버프 상태 표시줄 (즉시 발동형 전용)

| 항목 | 내용 |
|------|------|
| 위치 | HUD 하단 (또는 캔버스 하단 테두리 영역) |
| 표시 조건 | 즉시 발동형 효과가 1개 이상 활성화된 경우에만 표시 |
| 표시 내용 | 활성 효과 아이콘 + 남은 시간 (초, 소수점 1자리) |
| 예시 | ⚡ 3.2s  🔥 1.8s |
| 디자인 위임 | §11-2 참조 |

#### 8-3-2. 보유 아이템 슬롯

| 항목 | 내용 |
|------|------|
| 위치 | HUD 우측 하단 (고정) |
| 표시 조건 | 항상 표시 (비어 있으면 빈 박스) |
| 표시 내용 | 아이템 아이콘 + 만료 카운트다운 + "Z" 키 힌트 |
| 예시 (보유 중) | [🛡️ 18s]  Z |
| 예시 (비어 있음) | [  ]  (Z) |
| 디자인 위임 | §11-3 참조 |

#### 8-3-3. 아이템 획득/소멸 토스트 알림

| 항목 | 내용 |
|------|------|
| 위치 | 캔버스 중앙 상단, HUD 아래 |
| 지속 시간 | 1.5초 후 fade-out |
| 내용 예시 | ⚡ 스피드업 획득! / 🛡️ 방패 소멸 / 🌀 역전탄 사용! |
| 디자인 위임 | §11-4 참조 |

---

## 9. 마이그레이션 전략 (기존 사용자 영향 0)

### 9-1. 기본 정책

기존 사용자 영향 0: 아이템 시스템은 기본적으로 비활성화 상태로 배포한다.

| 전략 | 내용 |
|------|------|
| Feature Flag | logic.js 에 ITEMS_ENABLED 상수 추가, 기본값 false |
| Spawn Rate | ITEM_SPAWN_RATE 파라미터 기본값 0 (스폰 없음) |
| 두 조건 중 하나라도 비활성이면 | 아이템 타이머 시작 안 함, 보드에 아이템 없음 |

### 9-2. 점진적 활성화 단계

```js
// logic.js — FIXME(BF-539): dev 구현 시 참고
export const ITEMS_ENABLED   = false;  // 초기 배포 기본값
export const ITEM_SPAWN_RATE = 0;      // 0: 비활성, 1: 정상 (25~35초 간격)
```

| 단계 | 설정 | 목적 |
|------|------|------|
| 1단계 (초기 배포) | ITEMS_ENABLED=false | 기존 사용자 영향 0 |
| 2단계 (실험) | ITEMS_ENABLED=true, ITEM_SPAWN_RATE=0.3 | 30% 확률로 스폰 간격 트리거 |
| 3단계 (전체) | ITEMS_ENABLED=true, ITEM_SPAWN_RATE=1 | 전체 활성 |

### 9-3. localStorage 호환성

| 키 | 변경 여부 | 비고 |
|----|---------|------|
| bf-snake-high-score | 변경 없음 | 기존 High Score 영향 없음 |
| bf-snake-comp-kpi | 변경 없음 | 경쟁 모드 KPI 영향 없음 |
| bf-snake-multiplier-kpi | 변경 없음 | 배수 아이템 KPI 영향 없음 |
| bf-snake-item-kpi | 신규 추가 | 아이템 시스템 세션 KPI |
| bf-snake-item-stats | 신규 추가 | 아이템별 누적 통계 |

bf-snake-item-kpi 미존재 시 graceful fallback ({}) 처리 필수.

---

## 10. KPI 측정 항목

### 10-1. 아이템별 누적 통계 구조

```js
// localStorage key: "bf-snake-item-stats"
{
  SPEED_UP:     { spawned: 0, acquired: 0, expired: 0, durationCompleted: 0 },
  SLOW_DOWN:    { spawned: 0, acquired: 0, expired: 0, durationCompleted: 0 },
  LENGTH_BURST: { spawned: 0, acquired: 0, expired: 0, durationCompleted: 0,
                  selfDeathDuringBurst: 0 },
  SHIELD:       { spawned: 0, acquired: 0, expired: 0, used: 0,
                  shieldTriggered: 0, dropped: 0 },
  REVERSE:      { spawned: 0, acquired: 0, expired: 0, used: 0,
                  cpuConsumed: 0, dropped: 0 },
}
```

### 10-2. 세션별 KPI 구조

```js
// sessionStorage key: "bf-snake-item-kpi"
{
  sessionId:          "<timestamp>",
  itemsEnabled:       true,
  scoreWithItems:     0,   // 아이템 1개 이상 활성 중 획득한 점수 합산
  scoreWithoutItems:  0,   // 아이템 비활성 구간 점수 합산
  itemsAcquired:      0,   // 총 획득 횟수
  itemsUsed:          0,   // 총 보유형 사용 횟수
  itemsExpired:       0,   // 수집 전 소멸 횟수
  heldItemsDropped:   0,   // 보유 슬롯 교체로 드롭된 횟수
}
```

### 10-3. 핵심 KPI 지표 정의

| KPI 지표 | 계산식 | 목표 기준 (초기) |
|---------|--------|--------------|
| 아이템 획득률 | acquired / spawned × 100 (%) | ≥ 60% |
| 보유형 사용률 | used / acquired × 100 (%) (보유형만) | ≥ 50% |
| 평균 점수 변화 | avg(scoreWithItems) / avg(scoreWithoutItems) | > 1.0 |
| 길이폭발 자멸률 | selfDeathDuringBurst / LENGTH_BURST.acquired × 100 (%) | < 30% |
| 방패 발동률 | shieldTriggered / SHIELD.used × 100 (%) | ≥ 40% |
| 아이템 만료율 | itemsExpired / spawned × 100 (%) | < 30% |

---

## 11. 디자이너 위임 시각 요소

이 섹션의 모든 항목은 디자이너(이디자인) 전담 영역이다.
기획 명세는 "무엇이 필요한지"만 정의하며, "어떻게 보여야 하는지"는 디자이너가 결정한다.

### 11-1. 보드 위 아이템 셀 아이콘

| 아이템 | 요청 사항 |
|--------|---------|
| SPEED_UP | 번개 ⚡ 형태. 배경색: 밝은 노란-오렌지 계열 |
| SLOW_DOWN | 거북이 🐢 또는 달팽이 형태. 배경색: 청록색 계열 |
| LENGTH_BURST | 불꽃 🔥 또는 폭발 형태. 배경색: 보라-빨강 계열 (8x 먹이와 구별 필요) |
| SHIELD | 방패 🛡️ 형태. 배경색: 파란색 계열 |
| REVERSE | 소용돌이 🌀 또는 화살표 역전 형태. 배경색: 초록색 계열 |
| 공통 | 아이템 셀은 배수 먹이와 명확히 구분되는 외형 필요 |
| 공통 | 아이템 수명 10초 중 마지막 3초는 깜박임 효과로 만료 임박 표시 |

### 11-2. 즉시 발동형 버프 상태 표시줄

| 항목 | 요청 사항 |
|------|---------|
| 레이아웃 | 활성 효과 아이콘 + 남은 시간 텍스트 가로 나열. 최대 3개 동시 표시 |
| 색상 | 각 아이템 색상 팔레트 기반 |
| 타이머 시각화 | 남은 지속시간 프로그레스 바 또는 원형 카운트다운 |
| 만료 애니메이션 | 효과 종료 시 페이드아웃 |

### 11-3. 보유 아이템 슬롯 (HUD)

| 항목 | 요청 사항 |
|------|---------|
| 위치 | HUD 우측 하단. 기존 점수판과 겹치지 않는 위치 |
| 슬롯 크기 | 44px × 44px 이상 (모바일 탭 영역 고려) |
| 활성 상태 | 아이템 보유 중: 아이콘 + 만료 카운트다운 + "Z" 키 힌트 |
| 빈 슬롯 | 점선 테두리 박스 + "(Z)" 텍스트를 흐리게 |
| 방패 활성화 중 | 뱀 전체 테두리에 파란 글로우 (canvas 렌더링 레이어) |
| 역전탄 발동 중 | CPU 지렁이 주변 소용돌이 이팩트 (effect-layer BF-536 레이어 재활용 가능) |

### 11-4. 토스트 알림 (획득/소멸)

| 항목 | 요청 사항 |
|------|---------|
| 위치 | 캔버스 상단 중앙, HUD 아래 |
| 크기 | 자동 너비 (최대 280px) × 32px |
| 표시 시간 | 1.5초 후 fade-out |
| 텍스트 예시 | ⚡ 스피드업 획득! / 🛡️ 방패 소멸 / 🌀 역전탄 사용! |
| 스타일 | 다크 반투명 배경 (#0d0d0d 60% opacity) + 아이템 주색 텍스트 |

### 11-5. LENGTH_BURST 활성화 중 뱀 시각

| 항목 | 요청 사항 |
|------|---------|
| 효과 | 뱀 몸통 색상 원래 색 ↔ 흰색 또는 강한 발광색 깜박임 (0.5초 주기) |
| 목적 | "현재 길이가 위험하게 길다"는 경고 신호 |
| 복귀 시 | 정상 색상으로 즉시 전환 후 짧은 페이드 인 |

---

## 12. Edge Case 목록

| # | Edge Case | 처리 방식 |
|---|-----------|---------|
| EC-01 | SPEED_UP/SLOW_DOWN 활성 중 게임 일시정지(Space) | 타이머 일시정지 필요 (performance.now 기반 경과시간 누적 방식 권장) |
| EC-02 | SLOW_DOWN 활성 중 SPEED_UP 획득 | SPEED_UP 즉시 우선 적용 (§7-1) |
| EC-03 | LENGTH_BURST 복원 시 뱀이 이미 짧아진 경우 | 복원 길이 = min(원래 길이, 현재 길이) |
| EC-04 | 보드가 꽉 차 아이템 스폰 위치 없음 | 스폰 스킵, 다음 간격에 재시도 |
| EC-05 | CPU가 보유형 아이템 셀을 밟음 | 아이템 소멸. KPI: cpuConsumed++ |
| EC-06 | 게임 오버 시 보유형 아이템 활성 상태 | state 초기화 → 효과 자동 해제. KPI 기록 유지 |
| EC-07 | SHIELD 활성 중 T4(헤드-온) 발동 | 플레이어 방패 발동 → 플레이어 생존, 충돌 무효화 |
| EC-08 | REVERSE 활성 중 CPU 사망 | CPU 사망 처리 우선, REVERSE 효과 즉시 해제 |
| EC-09 | LENGTH_BURST 중 추가 먹이 수집 | 추가 성장은 pendingGrowth 누적. 복원 시 폭발 전 길이 기준 유지 |
| EC-10 | 동일 셀에 먹이와 아이템 중복 스폰 | spawnItemCell 에서 food 셀 제외 필수 |
| EC-11 | ITEMS_ENABLED = false 상태에서 Z 키 입력 | 핸들러 no-op. HUD 아이템 슬롯 hidden |
| EC-12 | resize 이벤트 발생 시 활성 아이템 효과 | restartGame 시 모든 아이템 상태 초기화 |

---

## 13. Acceptance Criteria 매핑

| AC 항목 | AC 조건 요약 | 명세 섹션 | 충족 여부 |
|---------|------------|---------|---------|
| AC-1-1 | 아이템 목록 (이름·효과·지속시간·스폰 확률·카테고리) 정의 | §2 전체 표 | 완료 |
| AC-1-2 | 즉시발동/보유형 발동 흐름 정의 | §5 발동 흐름 | 완료 |
| AC-1-3 | 사용키 매핑·HUD UI 요구사항 | §8 | 완료 |
| AC-1-4 | 중첩·우선순위 규칙 | §7 | 완료 |
| AC-1-5 | KPI 항목 (아이템 획득률·사용률·평균 점수 변화) | §10 | 완료 |
| AC-2 | 신규 아이템 비활성 fallback (feature flag 또는 기본 spawn=0) | §9 | 완료 |
| AC-3 | 디자이너 위임 시각 요소 별도 섹션 분리 | §11 | 완료 |

---

## 부록 A — GameState 필드 추가 제안 (dev 참고)

```js
// createInitialState 에 추가할 필드 — FIXME(BF-539): dev 구현 시 참고
{
  // 아이템 시스템 — BF-538
  item:                 null,   // 보드 위 아이템 { type, x, y, spawnedAt, expiresAt }
  heldItem:             null,   // 보유 슬롯 { type, acquiredAt, expiresAt }
  shieldActive:         false,  // 방패 활성화 여부
  cpuReverseTicksLeft:  0,      // 역전탄 남은 틱
  speedStack:           [],     // 속도 효과 스택 [{ type, expiresAtTick }]
  lengthBurstActive:    false,  // 길이폭발 활성 여부
  lengthBeforeBurst:    0,      // 폭발 전 길이 (복원 기준)
  lengthBurstTicksLeft: 0,      // 길이폭발 남은 틱
}
```

---

이 문서는 BF-539 planner 작업의 산출물입니다. 후속 작업자(developer, designer)는 이 명세를 기준으로 구현·디자인을 진행하십시오.
