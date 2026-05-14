# 지렁이게임 HUD / 일시정지 / 통계 화면 layout 명세 — BF-556

> 작성자: [박기획] · 작성일 2026-05-14  
> 관련 티켓: BF-557 (planner task), BF-556 (부모 스토리)  
> 기반 모듈: `snake/` (game.js / logic.js / index.html)  
> 의존 명세: `docs/design/snake-items-BF-538.md` (아이템 HUD), `docs/spec/snake-items-BF-538.md` (아이템 기획)  
> 기존 구현 참조: `index.html` GameState (`status: "playing" | "paused" | "gameover"`), `game.js` localStorage 키

---

## 목차

1. [개요 및 변경 범위](#1-개요-및-변경-범위)
2. [정보 구조 (IA) 다이어그램](#2-정보-구조-ia-다이어그램)
3. [실시간 HUD 명세](#3-실시간-hud-명세)
4. [일시정지 모달 명세](#4-일시정지-모달-명세)
5. [게임 오버 통계 화면 명세](#5-게임-오버-통계-화면-명세)
6. [상태 전이 다이어그램](#6-상태-전이-다이어그램)
7. [키보드 인터랙션 전체 표](#7-키보드-인터랙션-전체-표)
8. [localStorage 키 스키마](#8-localstorage-키-스키마)
9. [KPI 측정 명세](#9-kpi-측정-명세)
10. [Edge case / 실패 케이스](#10-edge-case--실패-케이스)
11. [Acceptance Criteria 매핑 표](#11-acceptance-criteria-매핑-표)

---

## 1. 개요 및 변경 범위

### 1-1. 목적

지렁이게임의 세 화면 레이어에 대한 **정보 구조·레이아웃·인터랙션·상태 전이** 를 확정한다.  
후속 designer (레이아웃 시각화) 와 developer (DOM/Canvas 구현) 가 본 명세만으로 작업할 수 있어야 한다.

### 1-2. 변경 대상 화면

| 화면 | 현재 구현 상태 | 이번 명세 추가 내용 |
|------|--------------|-------------------|
| **실시간 HUD** | 점수(좌상단) 만 표시 | 우상단에 **길이·속도** 패널 추가, 점수 패널 위치 확정 |
| **일시정지 모달** | "PAUSED + Space to resume" 단순 텍스트 | **계속/재시작/종료** 버튼 3종, P·Space 키 토글 정의 |
| **게임 오버 통계** | 결과·점수·"Press Space" 단순 표시 | 플레이 시간·아이템 카운트·최고 점수 비교 추가 |

### 1-3. 범위 외 항목 (명시 제외)

- 아이템 아이콘 색상·Canvas path — `docs/design/snake-items-BF-538.md` 에서 정의  
- CPU AI 로직 변경 없음  
- 모바일·터치 레이아웃 — 본 명세 대상 외 (별도 티켓)  

---

## 2. 정보 구조 (IA) 다이어그램

```
지렁이게임 화면
├── [A] 플레이 중 (status: "playing")
│   ├── 게임 보드 (Canvas)
│   └── HUD 레이어 (DOM overlay)
│       ├── 좌상단: 점수 패널
│       │   ├── 플레이어 점수 (hud-player-score)
│       │   └── CPU 점수 (hud-cpu-score)  ※경쟁모드만
│       ├── 우상단: 상태 패널  ← ★신규
│       │   ├── 뱀 길이 (snake length)
│       │   └── 속도 레벨 (speed level)
│       └── 기존 아이템 슬롯 / 버프 바 (BF-538 명세)
│
├── [B] 일시정지 (status: "paused")
│   └── 일시정지 모달 (DOM overlay, role="dialog")  ← ★신규 구조
│       ├── 타이틀: "일시정지"
│       ├── 버튼: 계속하기
│       ├── 버튼: 재시작
│       └── 버튼: 종료
│
└── [C] 게임 오버 (status: "gameover")
    └── 통계 화면 (DOM overlay, role="dialog")  ← ★신규 섹션 추가
        ├── 결과 헤더 (YOU WIN / 게임 오버 등)
        ├── 최종 점수 + 신기록 배지
        ├── 최고 점수 비교 행
        ├── 플레이 시간  ← ★신규
        ├── 아이템 획득 현황 (5종)  ← ★신규
        └── 하단 액션 힌트
```

---

## 3. 실시간 HUD 명세

### 3-1. 전체 레이아웃 wireframe

```
┌────────────────────────────────────────────────────────┐
│  ┌──────────────────────┐      ┌─────────────────────┐ │
│  │ P 150  C 80          │      │ 길이 12   속도 ●●○  │ │
│  └──────────────────────┘      └─────────────────────┘ │
│  ↑ 좌상단 점수 패널 (기존)       ↑ 우상단 상태 패널 (신규) │
│ ┌──────────────────────────────────────────────────────┐│
│ │                                                      ││
│ │                     Canvas 보드                     ││
│ │                                                      ││
│ └──────────────────────────────────────────────────────┘│
│  [ 보유 슬롯 ]  [ 버프 바 ]    ← 기존 BF-538 영역      │
└────────────────────────────────────────────────────────┘
```

### 3-2. 좌상단 점수 패널 (기존 — 확인/유지)

| 요소 | DOM id | 표시 형식 | 설명 |
|------|--------|----------|------|
| 플레이어 점수 | `hud-player-score` | `P 000` | 숫자 최소 3자리 zero-pad |
| CPU 점수 | `hud-cpu-score` | `C 000` | 경쟁모드가 아닐 때 `hidden` |

> 기존 구현 유지. DOM id·스타일 변경 없음.

### 3-3. 우상단 상태 패널 (신규)

**DOM 구조 요건:**
```html
<div id="hud-status-panel" role="status" aria-live="polite" aria-label="게임 상태">
  <span id="hud-snake-length" aria-label="뱀 길이">길이 3</span>
  <span id="hud-speed-level" aria-label="속도 레벨">속도 ○○○</span>
</div>
```

#### 3-3-1. 뱀 길이 (`hud-snake-length`)

| 항목 | 규격 |
|------|------|
| 표시 형식 | `길이 N` (N은 `state.snake.length` 정수값) |
| 업데이트 시점 | 매 틱(tick) 후 렌더링 — 기존 `renderHUD()` 호출 지점에 추가 |
| 최솟값 | 3 (초기 뱀 길이) |
| LENGTH_BURST 활성 중 | 폭발적으로 증가하므로 숫자 자체가 피드백 — 별도 강조 없음 |
| 경쟁모드 | 플레이어 뱀 길이만 표시 (CPU 길이는 표시하지 않음) |

#### 3-3-2. 속도 레벨 (`hud-speed-level`)

속도는 `state.speedStack` 의 현재 효과를 집계해 3단계로 표시한다.

| 속도 레벨 | 판정 조건 | 표시 텍스트 | 점 아이콘 |
|-----------|----------|------------|---------|
| `SLOW` | 净 속도 효과 < 0 (SLOW_DOWN 잔여, SPEED_UP 없음) | `속도 ▼` | `●○○` |
| `NORMAL` | 净 속도 효과 = 0 (기본 틱 인터벌) | `속도 —` | `○●○` |
| `FAST` | 净 속도 효과 > 0 (SPEED_UP 잔여) | `속도 ▲` | `○○●` |

**净 속도 효과 계산:**
```
netSpeed = (SPEED_UP 잔여 횟수) - (SLOW_DOWN 잔여 횟수)
   < 0  → SLOW
   = 0  → NORMAL
   > 0  → FAST
```
> speedStack 은 `{ type: "SPEED_UP"|"SLOW_DOWN", expiresAt: timestamp }` 배열.  
> `expiresAt > Date.now()` 인 항목만 계산 대상.

**aria 텍스트:** `aria-label` 은 아이콘 대신 "속도: 느림/보통/빠름" 으로 설정 (스크린 리더 대응).

### 3-4. HUD 업데이트 주기

| 항목 | 업데이트 트리거 |
|------|--------------|
| 점수 | 먹이 획득 이벤트 |
| 뱀 길이 | 매 tick (게임 루프) |
| 속도 레벨 | 아이템 효과 시작/종료 이벤트 + 매 tick |

---

## 4. 일시정지 모달 명세

### 4-1. Wireframe

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│             ┌──────────────────────────┐              │
│             │                          │              │
│             │        ⏸ 일시정지         │              │
│             │                          │              │
│             │  ┌──────────────────┐    │              │
│             │  │   계속하기  ↵/P  │    │              │
│             │  └──────────────────┘    │              │
│             │  ┌──────────────────┐    │              │
│             │  │   재시작    R    │    │              │
│             │  └──────────────────┘    │              │
│             │  ┌──────────────────┐    │              │
│             │  │   종료      Q    │    │              │
│             │  └──────────────────┘    │              │
│             │                          │              │
│             └──────────────────────────┘              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 4-2. DOM 구조 요건

```html
<div id="paused-overlay" hidden role="dialog" aria-modal="true" aria-label="일시정지">
  <div class="paused-box">
    <h2 class="paused-title">일시정지</h2>
    <button id="paused-btn-resume"  class="paused-btn" data-action="resume">
      계속하기 <kbd>Space</kbd>/<kbd>P</kbd>
    </button>
    <button id="paused-btn-restart" class="paused-btn" data-action="restart">
      재시작 <kbd>R</kbd>
    </button>
    <button id="paused-btn-quit"    class="paused-btn" data-action="quit">
      종료 <kbd>Q</kbd>
    </button>
  </div>
</div>
```

> - 기존 `paused-overlay` / `paused-box` DOM id 유지 (회귀 가드 호환)  
> - 기존 `<p class="paused-hint">Press Space to resume</p>` 제거하고 버튼 3종으로 교체

### 4-3. 버튼 액션 정의

| 버튼 | data-action | 단축키 | 동작 |
|------|------------|--------|------|
| 계속하기 | `resume` | `Space` / `P` | `status: "paused" → "playing"`, 게임 루프 재개, 플레이 타이머 재개 |
| 재시작 | `restart` | `R` | `createInitialState()` → `status: "playing"`, 플레이 타이머 초기화 |
| 종료 | `quit` | `Q` / `Escape` | 게임 루프 정지, 메인 화면(index) 으로 이동 또는 보드 리셋 |

> **종료의 "메인 화면"**: 현재 프로젝트에 별도 메인 메뉴가 없으면 `location.reload()` 로 처리.  
> developer 가 실제 라우팅 결정 후 `// FIXME(BF-557): 종료 시 라우팅 방식 확정` 으로 표기.

### 4-4. 포커스 관리

- 모달 열릴 때: `paused-btn-resume` 으로 `focus()` 이동  
- 모달 닫힐 때: Canvas 또는 게임 컨테이너로 포커스 복귀  
- Tab 순환: 모달 내 3개 버튼만 Tab 이동 (focus trap)  
- 모달 외부 클릭: 무시 (게임 중 오동작 방지)

### 4-5. 일시정지 중 플레이 타이머 처리

일시정지 구간은 **플레이 시간에서 제외** 한다.

```
실제 플레이 시간 = Σ(재개 타임스탬프 - 일시정지 타임스탬프)
```

구현 힌트: 게임 시작 시 `sessionStartMs = Date.now()` 저장 후,  
`pauseStartMs` / `totalPausedMs` 누산으로 순수 플레이 시간 계산.

---

## 5. 게임 오버 통계 화면 명세

### 5-1. Wireframe

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│         ┌────────────────────────────────────┐        │
│         │                                    │        │
│         │   [결과 헤더]  YOU WIN / 게임 오버   │        │
│         │                                    │        │
│         │   최종 점수:  150  ★ 신기록!        │        │
│         │   최고 기록:  150  (이전 최고: 120)  │        │
│         │                                    │        │
│         │   플레이 시간:  2분 34초            │        │
│         │                                    │        │
│         │   ── 아이템 획득 현황 ──           │        │
│         │   ⚡ 빠르게   ×3                   │        │
│         │   ⏱ 느리게   ×1                   │        │
│         │   ★ 길이폭발  ×2                  │        │
│         │   🛡 방패      ×0                  │        │
│         │   ↺ 역전탄    ×1                  │        │
│         │                                    │        │
│         │   [Space] 재시작  ·  [Q] 종료       │        │
│         │                                    │        │
│         └────────────────────────────────────┘        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5-2. 표시 항목 정의

| 섹션 | DOM id | 데이터 소스 | 표시 형식 |
|------|--------|-----------|---------|
| 결과 헤더 | `go-result` | `state.result` | 아래 §5-3 결과 텍스트 표 참조 |
| 최종 점수 | `go-score` | `state.score` | 숫자 그대로 |
| 신기록 배지 | `go-new-record` | `state.score > prevHighScore` | `★ 신기록!` 텍스트 + 골드 색상 (조건부 표시) |
| 최고 기록 행 | `go-high-score-row` | `state.highScore` | `최고 기록: N` |
| 이전 기록 | `go-prev-high-score` | `prevHighScore` (저장 전 값) | `(이전 최고: N)` 뮤트 색상, 신기록인 경우만 표시 |
| 플레이 시간 | `go-play-time` | `sessionPlayTimeMs` | `N분 M초` 형식 (§5-5 참조) |
| 아이템 현황 섹션 | `go-item-stats` | `state.itemStats[type].acquired` | 5종 행 (§5-4 참조) |
| 하단 힌트 | `go-hint` | — | `[Space] 재시작 · [Q] 종료` |

> 기존 `go-result`, `go-score`, `go-cpu-score`, `go-hint` DOM id 유지 (회귀 가드 호환)

### 5-3. 결과 헤더 텍스트 표

| `state.result` | 헤더 텍스트 | 색상 |
|---------------|------------|------|
| `"player_win"` | `YOU WIN` | `--player-head` (`#00cc44`) |
| `"cpu_win"` | `GAME OVER` | `--cpu-head` (`#cc2200`) |
| `"draw"` | `DRAW` | `#aaaaaa` |
| `null` (솔로 게임 오버) | `GAME OVER` | `--cpu-head` (`#cc2200`) |

### 5-4. 아이템 획득 현황 표 (5행)

```html
<section id="go-item-stats" aria-label="아이템 획득 현황">
  <h3 class="go-section-title">아이템 획득 현황</h3>
  <ul class="go-item-list">
    <li data-item-type="SPEED_UP">
      <span class="go-item-icon">⚡</span>
      <span class="go-item-label">빠르게</span>
      <span class="go-item-count" id="go-item-SPEED_UP">×0</span>
    </li>
    <li data-item-type="SLOW_DOWN">
      <span class="go-item-icon">⏱</span>
      <span class="go-item-label">느리게</span>
      <span class="go-item-count" id="go-item-SLOW_DOWN">×0</span>
    </li>
    <li data-item-type="LENGTH_BURST">
      <span class="go-item-icon">★</span>
      <span class="go-item-label">길이폭발</span>
      <span class="go-item-count" id="go-item-LENGTH_BURST">×0</span>
    </li>
    <li data-item-type="SHIELD">
      <span class="go-item-icon">🛡</span>
      <span class="go-item-label">방패</span>
      <span class="go-item-count" id="go-item-SHIELD">×0</span>
    </li>
    <li data-item-type="REVERSE">
      <span class="go-item-icon">↺</span>
      <span class="go-item-label">역전탄</span>
      <span class="go-item-count" id="go-item-REVERSE">×0</span>
    </li>
  </ul>
</section>
```

- 카운트는 `×N` 형식. N = `state.itemStats[type].acquired`  
- 아이콘은 기존 `snake-items-BF-538.md` 의 Canvas 아이콘 대신 텍스트 이모지로 통계 화면에서만 사용 (Canvas 아닌 DOM 영역)

### 5-5. 플레이 시간 표시 형식

| 범위 | 표시 형식 | 예시 |
|------|----------|------|
| < 60초 | `N초` | `47초` |
| 1분 ~ 59분 59초 | `N분 M초` | `2분 34초` |
| ≥ 60분 | `N시간 M분` | `1시간 3분` |

> 60분 이상 플레이는 극히 드물지만 오버플로 방지를 위해 정의함.

### 5-6. 신기록 강조 처리 ← AC 2 대응

**판정 조건:**
```
isNewRecord = state.score > prevHighScore
prevHighScore = localStorage.getItem("bf-snake-high-score") 를 게임 시작 시점에 캡처한 값
```

> `saveHighScore()` 는 gameover 이벤트에서 호출됨.  
> 통계 화면 렌더링 시에는 저장 **이전** 에 캡처한 `prevHighScore` 를 사용해야 신기록 판정이 정확함.

**신기록 시 표시:**

| 요소 | 변화 |
|------|------|
| `go-score` 숫자 | 골드 색상 (`#ffcc00`) + bold |
| `go-new-record` 배지 | `★ 신기록!` 텍스트 노출 (기본 `hidden`) |
| 이전 최고 점수 행 | `(이전 최고: N)` 뮤트 텍스트로 노출 (기본 `hidden`) |

**신기록이 아닐 때 표시:**

| 요소 | 변화 |
|------|------|
| `go-score` 숫자 | 기본 색상 |
| `go-new-record` 배지 | `hidden` 유지 |
| 최고 기록 행 | `최고 기록: N` 만 표시 (이전 최고 행 `hidden`) |

**동점(신기록 아님):**
- `state.score === prevHighScore` → 신기록 배지 표시 안 함 (엄격한 `>` 조건)

### 5-7. 통계 화면 인터랙션

| 키 | 동작 |
|----|------|
| `Space` | 재시작 (`createInitialState()`) |
| `R` | 재시작 (동일) |
| `Q` | 종료 (메인 화면) |
| `Escape` | 종료 (메인 화면) |
| 기타 키 | 무시 |

> 통계 화면에서 `P` 키는 동작 없음 (일시정지가 의미 없는 상태).

---

## 6. 상태 전이 다이어그램

```
                   [게임 시작]
                        │
                        ▼
              ┌─────────────────┐
              │    playing      │◄──────────────────┐
              │  (게임 루프 중) │                   │
              └────────┬────────┘                   │
                       │                            │
          ┌────────────┼────────────┐               │
          │            │            │               │
        [P/Space]   [충돌/사망]   [아이템/틱]        │
          │            │            │               │
          ▼            │          (loop)            │
  ┌──────────────┐     │                            │
  │    paused    │     │                            │
  │  (일시정지)  │     │           [Space/R]        │
  └──────┬───────┘     │               ▲            │
         │             │               │            │
    ┌────┼────┐        ▼               │            │
    │    │    │  ┌──────────────┐      │            │
  [P/ [R]  [Q]  │   gameover   │──────┘            │
  Space]   │    │  (통계화면)  │  [Space/R]         │
    │      │    └──────┬───────┘                   │
    ▼      │           │ [Q/Esc]                    │
  [재개]  [재시작]    [종료]                         │
    │      │           │                            │
    └──────┘           ▼                            │
       │          [메인화면/reload]                  │
       └───────────────────────────────────────────┘
         (재시작은 playing 상태로 직접 복귀)
```

### 6-1. 플레이 타이머 상태 전이

```
[게임 시작] → sessionStartMs = Date.now(); totalPausedMs = 0; pauseStartMs = null
[일시정지]  → pauseStartMs = Date.now()
[재개]      → totalPausedMs += (Date.now() - pauseStartMs); pauseStartMs = null
[게임 오버] → sessionPlayTimeMs = (Date.now() - sessionStartMs) - totalPausedMs
[재시작]    → 위 초기화 반복
```

---

## 7. 키보드 인터랙션 전체 표

| 게임 상태 | 키 | 동작 | 비고 |
|----------|-----|------|------|
| `playing` | `ArrowUp/Down/Left/Right` | 방향 전환 | 기존 구현 유지 |
| `playing` | `Z` | 보유 아이템 사용 | 기존 BF-538 |
| `playing` | `P` | 일시정지 (→ `paused`) | **신규** |
| `playing` | `Space` | 일시정지 (→ `paused`) | 기존 — 동작 변경 없음 |
| `paused` | `P` | 재개 (→ `playing`) | **신규** |
| `paused` | `Space` | 재개 (→ `playing`) | 기존 동작 유지 |
| `paused` | `R` | 재시작 (→ `playing`) | **신규** |
| `paused` | `Q` | 종료 | **신규** |
| `paused` | `Escape` | 종료 | **신규** |
| `paused` | `Tab` | 버튼 순환 (focus trap) | **신규** |
| `gameover` | `Space` | 재시작 | 기존 유지 |
| `gameover` | `R` | 재시작 | **신규** |
| `gameover` | `Q` | 종료 | **신규** |
| `gameover` | `Escape` | 종료 | **신규** |

> **P 키 신규 등록 이유**: `Space` 는 브라우저 기본 스크롤 동작과 충돌할 수 있고, 게임 표준 일시정지 키(P)를 추가해 접근성을 높임.  
> `preventDefault()` 는 게임 컨테이너가 포커스 중일 때만 적용.

---

## 8. localStorage 키 스키마

### 8-1. 기존 키 (변경 없음)

| 키 | 타입 | 설명 |
|----|------|------|
| `bf-snake-high-score` | `string` (숫자) | 역대 최고 점수 |
| `bf-snake-item-stats` | JSON | 아이템 누적 통계 (획득·소멸·만료 등) |
| `bf-snake-item-kpi` | JSON | 아이템 세션 KPI (직전 게임) |

### 8-2. 신규 키 — 플레이 시간 통계

**키:** `bf-snake-play-stats`  
**저장 시점:** 게임 오버 직후 (`saveHighScore()` 호출 이후)  
**읽기 시점:** 통계 화면 렌더링 전

**스키마:**
```jsonc
{
  "version": 1,                  // 스키마 버전 (마이그레이션 대비)
  "totalGames": 42,              // 누적 게임 횟수
  "totalPlayTimeMs": 1523400,   // 누적 순수 플레이 시간 (ms, 일시정지 제외)
  "lastPlayTimeMs": 154200,     // 직전 게임 플레이 시간 (ms)
  "avgPlayTimeMs": 36271        // avgPlayTimeMs = totalPlayTimeMs / totalGames
}
```

**저장 함수 명세:**
```js
// FIXME(BF-557): 아래 함수를 game.js 에 추가
function savePlayStats(sessionPlayTimeMs) {
  var KEY = "bf-snake-play-stats";
  var prev = {};
  try { prev = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch(_) {}
  var totalGames    = (prev.totalGames    || 0) + 1;
  var totalPlayTime = (prev.totalPlayTimeMs || 0) + sessionPlayTimeMs;
  localStorage.setItem(KEY, JSON.stringify({
    version:          1,
    totalGames:       totalGames,
    totalPlayTimeMs:  totalPlayTime,
    lastPlayTimeMs:   sessionPlayTimeMs,
    avgPlayTimeMs:    Math.round(totalPlayTime / totalGames),
  }));
}
```

**오류 처리:** `try/catch` 필수 (private 모드 등 localStorage 비활성화 환경).

### 8-3. 신규 키 — 세션 HUD 캐시 (선택 사항)

**키:** `bf-snake-session-cache`  
**목적:** 비정상 종료(탭 닫기 등) 시 직전 게임 결과를 복원  
**저장 시점:** 게임 오버 시 (통계 화면 데이터 보존용)  
**만료 조건:** 다음 게임 시작 시 덮어씀

> 이 키는 **필수 구현이 아님** — developer 가 비정상 종료 복원이 필요하다고 판단할 경우에만 구현.  
> 포함 여부 결정 시 `// FIXME(BF-557): session-cache 구현 여부 결정` 주석으로 표기.

---

## 9. KPI 측정 명세

### 9-1. 아이템 종류별 카운트 (게임 오버 화면 표시 + KPI 저장)

| 아이템 | 카운트 변수 | 측정 시점 | 저장 키 |
|--------|-----------|---------|--------|
| `SPEED_UP` | `state.itemStats.SPEED_UP.acquired` | `applyInstantEffect("SPEED_UP")` 호출 시 +1 | `bf-snake-item-stats` → `SPEED_UP.acquired` |
| `SLOW_DOWN` | `state.itemStats.SLOW_DOWN.acquired` | `applyInstantEffect("SLOW_DOWN")` 호출 시 +1 | `bf-snake-item-stats` → `SLOW_DOWN.acquired` |
| `LENGTH_BURST` | `state.itemStats.LENGTH_BURST.acquired` | `applyInstantEffect("LENGTH_BURST")` 호출 시 +1 | `bf-snake-item-stats` → `LENGTH_BURST.acquired` |
| `SHIELD` | `state.itemStats.SHIELD.acquired` | 아이템 보유 슬롯에 넣는 시점(`acquireHoldable`) +1 | `bf-snake-item-stats` → `SHIELD.acquired` |
| `REVERSE` | `state.itemStats.REVERSE.acquired` | 아이템 보유 슬롯에 넣는 시점(`acquireHoldable`) +1 | `bf-snake-item-stats` → `REVERSE.acquired` |

> 기존 `createItemStats()` 함수의 `acquired` 필드를 그대로 사용.  
> 게임 오버 시 `state.itemStats` 를 `bf-snake-item-kpi` / `bf-snake-item-stats` 에 저장하는 기존 흐름에 변경 없음.

### 9-2. 세션 아이템 카운트 vs 누적 통계 구분

| 용도 | 데이터 소스 | 설명 |
|------|-----------|------|
| 게임 오버 화면 표시 | `state.itemStats[type].acquired` | 현 세션 카운트 — 재시작 시 초기화 |
| KPI 누적 통계 | `bf-snake-item-stats` localStorage | 역대 누적 — 재시작해도 유지 |

### 9-3. 평균 플레이 시간 KPI

| 항목 | 내용 |
|------|------|
| **측정 단위** | 밀리초 (ms), 표시 시 `N분 M초` 로 변환 |
| **측정 시작** | `status: "playing"` 전환 시점 (`sessionStartMs = Date.now()`) |
| **측정 종료** | `status: "gameover"` 전환 시점 |
| **일시정지 제외** | `totalPausedMs` 누산값 차감 |
| **저장 시점** | gameover 이벤트 처리 함수 내 (score 저장 직후) |
| **저장 키** | `bf-snake-play-stats` (§8-2 스키마) |
| **재시작 처리** | `createInitialState()` 호출 시 `sessionStartMs` 재초기화, `totalPausedMs = 0` |
| **최소 기록 임계값** | 없음 — 1초 미만 게임도 기록 (비정상 종료 구분은 개발자 판단) |

### 9-4. KPI 데이터 흐름 요약

```
[게임 시작]
  sessionStartMs    = Date.now()
  totalPausedMs     = 0
  pauseStartMs      = null
  prevHighScore     = loadHighScore()   ← 신기록 판정용 스냅샷

[일시정지 진입]
  pauseStartMs      = Date.now()

[일시정지 해제]
  totalPausedMs    += Date.now() - pauseStartMs
  pauseStartMs      = null

[게임 오버]
  sessionPlayTimeMs = Date.now() - sessionStartMs - totalPausedMs
  saveHighScore(state.score)             → bf-snake-high-score
  savePlayStats(sessionPlayTimeMs)       → bf-snake-play-stats
  saveItemKpi(state.itemStats)           → bf-snake-item-kpi (기존)
  saveItemStats(state.itemStats)         → bf-snake-item-stats (기존)
  renderGameOverScreen(prevHighScore, sessionPlayTimeMs, state.itemStats)
```

---

## 10. Edge case / 실패 케이스

| # | 시나리오 | 예상 동작 |
|---|---------|---------|
| E-1 | 게임 시작 직후(< 1초) 사망 | 플레이 시간 0초 표시. `bf-snake-play-stats` 에 0 기록 |
| E-2 | localStorage 비활성화 (private 모드) | `try/catch` 처리, 저장 실패 무시. 통계 화면은 세션 데이터(`state`) 로 정상 표시 |
| E-3 | 일시정지 중 탭 비활성화 | `pauseStartMs` 값 보존 — 재활성화 시 `totalPausedMs` 갱신 (Page Visibility API 미구현 시 이론적 오차 허용) |
| E-4 | 신기록이 0점 | `prevHighScore = 0`, `state.score = 0` → `0 > 0` = false → 신기록 배지 미표시 |
| E-5 | `bf-snake-play-stats` JSON 파싱 오류 | `catch` 블록에서 `{}` 로 초기화, `totalGames = 1` 로 새로 저장 |
| E-6 | 아이템 시스템 비활성화 (`ITEMS_ENABLED=false`) | 아이템 현황 5종 모두 `×0` 표시 — 섹션 자체는 숨기지 않음 |
| E-7 | 일시정지 → 브라우저 새로고침 | `paused` 상태 저장 없음. 새로고침 시 새 게임 시작 |
| E-8 | 통계 화면에서 P 키 입력 | 무시 (§7 키보드 표 — `gameover` 상태에서 P 키는 미정의) |
| E-9 | 동점 타이 (새 기록과 기존 기록 동일) | `state.score > prevHighScore` = false → 신기록 배지 없음 |
| E-10 | 재시작 버튼 연타 | 이미 `playing` 상태면 두 번째 클릭 무시 (`status !== "paused"` 가드) |

---

## 11. Acceptance Criteria 매핑 표

| AC 번호 | Given | When | Then | 본 명세 근거 섹션 |
|---------|-------|------|------|----------------|
| **AC-1** | Epic AC 항목 5개 | layout 명세 작성 | HUD/모달/통계 각 영역의 wireframe + 키보드 인터랙션 (P/Space) + localStorage 키 스키마가 정리됨 | §3 (HUD wireframe), §4 (모달 wireframe), §5 (통계 wireframe), §7 (키보드 표), §8 (localStorage 스키마) |
| **AC-2** | 통계 화면 최고 점수 비교 명세 작성 | 신기록 시 시각 강조 처리·기존 기록 표기 방식이 결정됨 | §5-6 (신기록 강조 — 골드 색상 + `★ 신기록!` + 이전 최고 표기) |
| **AC-3** | KPI 측정 명세 작성 | 아이템 종류별 카운트 / 평균 플레이 시간의 측정 시점·저장 방식이 명시됨 | §9-1 (아이템 카운트 측정 시점), §9-3 (플레이 시간 측정), §8-2 (저장 키 스키마), §9-4 (KPI 흐름) |

---

## 부록 A — 구현 시 dev 참조 사항

### 기존 DOM id 유지 필수 (회귀 가드)

| id | 기존 용도 | 변경 가능 여부 |
|----|---------|--------------|
| `gameover-overlay` | 게임 오버 컨테이너 | **변경 금지** |
| `go-result` | 결과 텍스트 | **변경 금지** |
| `go-score` | 플레이어 점수 | **변경 금지** |
| `go-cpu-score` | CPU 점수 | **변경 금지** |
| `go-hint` | 하단 힌트 | 텍스트 내용만 변경 가능 |
| `paused-overlay` | 일시정지 컨테이너 | **변경 금지** |
| `hud-player-score` | 플레이어 점수 HUD | **변경 금지** |
| `hud-cpu-score` | CPU 점수 HUD | **변경 금지** |

### 신규 DOM id 예약

| id | 역할 |
|----|------|
| `hud-status-panel` | 우상단 상태 패널 컨테이너 |
| `hud-snake-length` | 뱀 길이 표시 |
| `hud-speed-level` | 속도 레벨 표시 |
| `paused-btn-resume` | 계속하기 버튼 |
| `paused-btn-restart` | 재시작 버튼 |
| `paused-btn-quit` | 종료 버튼 |
| `go-new-record` | 신기록 배지 |
| `go-prev-high-score` | 이전 최고 점수 (조건부) |
| `go-play-time` | 플레이 시간 |
| `go-item-stats` | 아이템 현황 섹션 |
| `go-item-SPEED_UP` | SPEED_UP 카운트 |
| `go-item-SLOW_DOWN` | SLOW_DOWN 카운트 |
| `go-item-LENGTH_BURST` | LENGTH_BURST 카운트 |
| `go-item-SHIELD` | SHIELD 카운트 |
| `go-item-REVERSE` | REVERSE 카운트 |
