# 지렁이게임 설정 항목 명세 — BF-579

> 작성자: [박기획] · 작성일 2026-05-15
> 관련 티켓: BF-580 (planner 작업), BF-579 (부모 스토리)
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)
> 의존 명세: `docs/design/snake-items-BF-538.md` (아이템 시스템), `docs/design/snake-cpu-ai-BF-527.md` (CPU AI), `docs/spec/snake-sound-toggle-BF-563.md` (효과음 토글)
> 운영자 지시 경로(`docs/specs/...`) 는 기존 컨벤션 `docs/spec/` 에 맞춰 단수 디렉토리로 조정됨 — 후속 designer/dev 가 일관된 위치에서 찾도록 함.

---

## 목차

1. [개요](#1-개요)
2. [설정 항목 정의](#2-설정-항목-정의)
3. [설정 모달 UX 흐름](#3-설정-모달-ux-흐름)
4. [상태 전이 다이어그램](#4-상태-전이-다이어그램)
5. [localStorage persistence 정책](#5-localstorage-persistence-정책)
6. [Effective settings 적용 규칙](#6-effective-settings-적용-규칙)
7. [KPI 이벤트 정의](#7-kpi-이벤트-정의)
8. [사용자 시나리오 (Given/When/Then)](#8-사용자-시나리오-givenwhenthen)
9. [Edge Case 목록](#9-edge-case-목록)
10. [디자이너 위임 시각 요소](#10-디자이너-위임-시각-요소)
11. [Acceptance Criteria 매핑](#11-acceptance-criteria-매핑)

---

## 1. 개요

### 1-1. 도입 목적

현재 지렁이게임은 모든 게임 파라미터(난이도, CPU 등장, 아이템 등장 확률, 게임 시간)가 코드 상수로 고정되어 있어 사용자가 플레이 환경을 조정할 수 없다. 본 명세는 **재시작 단위로 적용되는 게임 설정 모달**을 도입하여 사용자가 자기 선호에 맞춰 게임 난이도·길이·내용을 조정할 수 있게 한다.

### 1-2. 적용 범위

| 항목 | 내용 |
|------|------|
| 설정 적용 단위 | 다음 게임 시작 시 (현재 진행 중 게임에는 영향 없음) |
| 저장 영역 | `localStorage` (브라우저 세션 간 유지) |
| 모달 호출 시점 | 게임 시작 전(start screen) 또는 일시정지 중 |
| 영향 받는 코드 | `snake/logic.js` (상수 → 파라미터화), `snake/game.js` (모달 UI + 적용) |

### 1-3. 비범위(Out of Scope)

다음 항목은 본 명세에서 다루지 않으며 별도 티켓에서 처리한다.

- 효과음 ON/OFF 토글 — 이미 `docs/spec/snake-sound-toggle-BF-563.md` 에서 정의됨. 본 모달에서는 **링크만 노출**하거나 동일 키를 공유한다(§5-3 참조).
- 격자 크기(cols/rows) 변경 — 충돌 검사·렌더링 영향이 커 별도 스토리 분리.
- 색상/테마 변경 — 시각 디자인 영역(designer 담당).
- 키 바인딩 변경 — 본 게임은 방향키·Space 만 사용하므로 불필요.

---

## 2. 설정 항목 정의

### 2-1. 설정 항목 표 (단위·최소·최대·기본값)

| Key | 라벨 (UI 표시) | 타입 | 단위 | 최소 | 최대 | 기본값 | 비고 |
|-----|---------------|------|------|------|------|--------|------|
| `difficulty` | 난이도 | enum | — | `easy` | `normal` | `normal` | 기존 `DIFFICULTY_PARAMS` 와 일치 (logic.js §31-46) |
| `cpuCount` | 적 지렁이 수 | integer | 마리 | `0` | `2` | `1` | `0` 은 솔로 모드, `2` 는 향후 확장(현재 코드는 1 만 지원 → §6-4 마이그레이션) |
| `itemsEnabled` | 아이템 등장 | boolean | — | `false` | `true` | `false` | 기존 `ITEMS_ENABLED` 상수 대체 |
| `itemSpawnRate` | 아이템 등장 확률 | number | 비율 | `0.0` | `1.0` | `0.5` | `itemsEnabled=true` 일 때만 활성. 0.1 단위 step. `0` 이면 사실상 비활성 |
| `multiplierEnabled` | 배수 먹이 등장 | boolean | — | `false` | `true` | `true` | `false` 시 모든 먹이는 ×1 |
| `timeLimitSec` | 게임 시간 제한 | integer \| null | 초 | `60` | `600` | `null` | `null` = 무제한. UI 에서는 "무제한" 별도 옵션 |
| `initialLength` | 시작 지렁이 길이 | integer | 칸 | `3` | `7` | `3` | 홀수만 허용(3/5/7) — 중앙 정렬 보장 |

### 2-2. 각 항목별 허용 값 상세

#### `difficulty`
| 값 | 의미 | tickIntervalMs | visionRange | 비고 |
|----|------|----------------|-------------|------|
| `easy` | 느리고 너그러움 | 240 | 3 | 기존 logic.js easy 프리셋 |
| `normal` | 표준 | 120 | 8 | 기존 logic.js normal 프리셋 (기본값) |

> `hard` 는 본 명세에 포함하지 않는다. 추후 BF-58x 에서 별도 프리셋 추가 시 enum 확장.

#### `cpuCount`
| 값 | 게임 흐름 |
|----|----------|
| `0` | 솔로 플레이 — CPU 없이 player snake 만 동작. `result` 판정은 시간 초과/자기 충돌/벽 충돌 only |
| `1` | 1 vs 1 경쟁 (현재 기본) |
| `2` | 1 vs 2 — **본 스토리 범위에선 UI 만 노출, 적용은 비활성** (FIXME 주석 + dev 단계에서 disabled 처리). 코드 미준비 상태에서 선택되어도 1로 폴백한다(§9 EC-1) |

#### `itemSpawnRate`
- step: `0.1` (10% 단위 슬라이더)
- 값 → 동작 매핑:
  - `0.0` ~ `0.2`: 거의 안 나옴 (5틱당 1회 미만 시도)
  - `0.3` ~ `0.6`: 보통 (기본값 `0.5`)
  - `0.7` ~ `1.0`: 자주 등장
- 내부 적용 공식: 기존 아이템 스폰 주기 ms 를 `baseIntervalMs / (itemSpawnRate || 0.001)` 로 보정 (FIXME(BF-579): dev 가 logic.js §9-2 에 반영)

#### `timeLimitSec`
- UI 표시: 슬라이더 또는 select. "무제한 / 1분 / 3분 / 5분 / 10분" 5개 프리셋 + 수치 직접 입력 허용
- 내부 표현: `null` 또는 `60..600` 정수
- 시간 만료 시 동작: `state.status = "gameover"`, `state.deathCause = "timeout"`, `state.result` 는 score 비교로 결정 (player > cpu → `player_win`, etc.)

#### `initialLength`
- 허용 값: `3`, `5`, `7` (홀수만)
- 중앙 정렬 보장: head 위치 `(cols/2, rows/2)` 에서 왼쪽으로 `length-1` 칸 — 격자 폭 검증 필요(§9 EC-3)

### 2-3. 항목 간 의존 관계

| 항목 A | 항목 B | 관계 |
|--------|--------|------|
| `itemsEnabled = false` | `itemSpawnRate` | B 컨트롤은 **disabled (회색)** 처리, 값은 유지 |
| `cpuCount = 0` | `difficulty` | 영향 없음(player 만 적용), 단 KPI 의 cpu 관련 필드는 0 으로 기록 |
| `cpuCount = 0` | `timeLimitSec = null` | "무제한 솔로" 조합은 허용. 단 KPI 분석 시 별도 카테고리 |
| `multiplierEnabled = false` | `itemSpawnRate` | 독립. 아이템과 배수는 분리된 시스템 |

---

## 3. 설정 모달 UX 흐름

### 3-1. 모달 진입 경로

| 진입 경로 | 트리거 | 게임 상태 요구 |
|-----------|--------|----------------|
| 시작 화면(start screen) | 우상단 "⚙ 설정" 버튼 클릭 | 게임 미시작 (또는 직전 게임 종료 후) |
| 일시정지(pause) 중 | 일시정지 오버레이의 "설정" 버튼 클릭 | `state.status === "paused"` |
| 키보드 단축키 | `S` 키 (게임 미시작 또는 paused 상태) | 게임 중(`playing`) 에는 무시 |

> 게임이 `playing` 상태일 때는 모달 진입을 **차단**한다. 키 입력 충돌(방향키)·중도 변경으로 인한 일관성 깨짐 방지.

### 3-2. 모달 구조 (UI 영역)

```
┌─────────────────────────────────────┐
│  게임 설정                    [×]   │
├─────────────────────────────────────┤
│  난이도            ( easy / normal) │
│  적 지렁이 수      ( 0 / 1 / 2* )   │
│  시작 지렁이 길이  ( 3 / 5 / 7 )    │
│                                     │
│  ─── 먹이 ───                       │
│  배수 먹이 등장    [✓ on]           │
│                                     │
│  ─── 아이템 ───                     │
│  아이템 등장       [   off]         │
│  등장 확률         [────●────] 0.5  │
│                    (disabled if off)│
│                                     │
│  ─── 게임 시간 ───                  │
│  시간 제한        ○무제한 ●5분 ...  │
│                                     │
├─────────────────────────────────────┤
│  [기본값 복원]      [취소] [저장]   │
└─────────────────────────────────────┘
```

> 디자이너에게 상세 시각 디자인 위임(§10). 본 명세는 영역·항목·인터랙션만 정의.

### 3-3. 액션 버튼 동작

| 버튼 | 동작 |
|------|------|
| `[저장]` | 현재 모달 값 → `localStorage` 저장, 모달 닫기. 게임이 `paused` 상태면 **다음 게임 시작 시 적용**(현재 게임 미변경) |
| `[취소]` | 모달 진입 전 상태로 롤백, 저장 안 함, 모달 닫기 |
| `[기본값 복원]` | 모달 내 컨트롤 값을 §2-1 기본값으로 리셋(아직 저장은 안 함 — `[저장]` 눌러야 확정) |
| `[×]` (닫기) | `[취소]` 와 동일 |
| `Esc` 키 | `[취소]` 와 동일 |

### 3-4. 인풋 변경 동작 (실시간)

- 슬라이더/select 값 변경 → 모달 내부 임시 상태(`draftSettings`) 만 갱신
- localStorage 는 `[저장]` 누를 때 1회만 write (불필요한 I/O 방지)
- 의존 컨트롤(§2-3) 은 즉시 disabled 토글 반영

---

## 4. 상태 전이 다이어그램

### 4-1. 모달 상태 전이

```
            [open]
              │
       ┌──────▼──────┐
       │  draft      │◄────┐
       │ (편집 중)   │     │
       └──────┬──────┘     │
              │           [change]
              │            │
   ┌──────────┼────────────┘
   │          │
[cancel]   [save]   [reset]
   │          │       │
   │          │       │ (draft → defaults, 계속 편집)
   │          │       └──┐
   │          │          │
   │          ▼          │
   │     ┌────────┐      │
   │     │ saved  │      │
   │     │(LS write)│    │
   │     └────┬───┘      │
   │          │          │
   ▼          ▼          │
[modal closed, no LS write]
```

### 4-2. 게임 라이프사이클 vs 설정 적용 시점

```
  page load
     │
     ▼
  loadSettings() ─► localStorage 에서 읽기 (없으면 §2-1 기본값)
     │
     ▼
  appliedSettings ← 현재 적용된 값 (게임 시작 시 캡처)
     │
     ▼
  start screen ──[설정 모달 open/close]── 사용자가 저장하면
     │                                      pendingSettings ← 새 값
     │                                      (appliedSettings 미변경)
     ▼
  [Space 키 또는 "시작" 클릭]
     │
     ▼
  applySettingsToGame()
     │   appliedSettings = pendingSettings ?? appliedSettings
     │   createInitialState(...) 에 파라미터 전달
     ▼
  playing ◄──── [Esc] ────┐
     │                    │
     │ (Esc 누름)         │
     ▼                    │
  paused ───[설정 모달 open]─┐
     │                       │
     │ (저장 시 pendingSettings 갱신
     │  현재 게임은 미변경)   │
     ▼                       │
  resume (Space) ────────────┘
     │
     ▼
  gameover (벽/자기/CPU/timeout)
     │
     ▼
  start screen (다음 게임은 pendingSettings 로 시작)
```

### 4-3. 상태 전이 표 (모달)

| From | Event | To | Side Effect |
|------|-------|----|-----|
| (closed) | 사용자 클릭 ⚙ / `S` 키 | `draft` | `draftSettings ← appliedSettings ?? loadFromLS()` |
| `draft` | input 변경 | `draft` | `draftSettings` 갱신, 의존 컨트롤 disabled 재계산 |
| `draft` | [기본값 복원] | `draft` | `draftSettings ← DEFAULTS` (§2-1) |
| `draft` | [저장] | (closed) | `localStorage.setItem(...)`, `pendingSettings = draftSettings` |
| `draft` | [취소] / Esc / [×] | (closed) | 변경 없음 |
| (closed, playing) | start trigger | (game running) | `appliedSettings = pendingSettings`, `pendingSettings = null` |

---

## 5. localStorage persistence 정책

### 5-1. 스토리지 키 정의

| 항목 | 값 |
|------|----|
| localStorage 키 | `"bf-snake-settings"` |
| 네이밍 근거 | 기존 `bf-snake-*` 컨벤션 (cf. `bf-snake-high-score`, `bf-snake-sound-enabled`) |
| 저장 형식 | JSON-serialized object (§5-2 스키마) |
| Quota | < 200 bytes (브라우저 5MB 한도 대비 무시 수준) |

### 5-2. 저장 스키마 (JSON)

```json
{
  "schemaVersion": 1,
  "difficulty": "normal",
  "cpuCount": 1,
  "itemsEnabled": false,
  "itemSpawnRate": 0.5,
  "multiplierEnabled": true,
  "timeLimitSec": null,
  "initialLength": 3
}
```

| 필드 | 비고 |
|------|------|
| `schemaVersion` | 미래 마이그레이션용. 현재 `1`. 다른 값이면 §5-4 마이그레이션 |
| (나머지) | §2-1 표와 1:1 매핑 |

### 5-3. 효과음 키와의 관계

기존 `bf-snake-sound-enabled` 키(BF-563)는 **분리 유지**한다. 이유:
- 효과음 토글은 게임 중 즉시 적용(BF-563 §2-5), 본 설정은 재시작 시 적용 → 적용 단위가 다름
- 토글 UI 가 게임 중에도 노출되어야 함(우상단) → 모달 안에 두면 접근성 저하

본 모달에서 효과음 토글은 **읽기 전용 표시(아이콘 + 현재 상태 텍스트)** 로 안내 + "우상단 토글로 변경하세요" 도움말만 노출하는 옵션도 가능(디자이너 결정).

### 5-4. 마이그레이션 / 검증 정책

| 시점 | 동작 |
|------|------|
| 로드 시 키 없음 | §2-1 기본값으로 모든 필드 초기화 |
| `schemaVersion` 누락 또는 < 1 | 기본값 병합(missing field 채우기), 사용자 값 우선 |
| 필드 값이 허용 범위 외 | 해당 필드만 기본값으로 폴백, console.warn 기록 |
| JSON parse 실패 | 전체 기본값으로 리셋, console.warn 기록, localStorage 키 삭제 |

```js
// FIXME(BF-579): dev — game.js 초기화 시 호출
function loadSettings() {
  try {
    const raw = localStorage.getItem("bf-snake-settings");
    if (raw === null) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return validateAndMerge(parsed, DEFAULTS);
  } catch (_) {
    console.warn("[BF-579] settings load failed, using defaults");
    localStorage.removeItem("bf-snake-settings");
    return DEFAULTS;
  }
}
```

---

## 6. Effective settings 적용 규칙

### 6-1. 적용 시점 매트릭스

| 설정 항목 | 적용 시점 | 게임 중 변경 영향 |
|-----------|-----------|-------------------|
| `difficulty` | 다음 게임 시작 | 없음 (tickIntervalMs 고정) |
| `cpuCount` | 다음 게임 시작 | 없음 (CPU 배열 고정 시점) |
| `itemsEnabled` | 다음 게임 시작 | 없음 |
| `itemSpawnRate` | 다음 게임 시작 | 없음 |
| `multiplierEnabled` | 다음 게임 시작 | 없음 |
| `timeLimitSec` | 다음 게임 시작 | 없음 (타이머 시작 시 캡처) |
| `initialLength` | 다음 게임 시작 | 없음 (snake 초기 길이) |

> **모든 항목은 재시작 단위 적용**. UX 일관성을 위해 예외 없음.

### 6-2. `logic.js` 인터페이스 변경 제안

`createInitialState(cols, rows, highScore)` → `createInitialState(cols, rows, highScore, settings)` 로 확장.

```js
// FIXME(BF-579): dev — logic.js §62 시그니처 확장
export function createInitialState(cols, rows, highScore = 0, settings = DEFAULT_SETTINGS) {
  const length = settings.initialLength;
  const cpuCount = settings.cpuCount;
  const startSnake = buildSnakeOfLength(cols, rows, length);
  const startCpu = cpuCount === 0 ? [] : buildCpuSnake(cols, rows);
  // ... 기존 로직, settings 를 추가 필드로 보관
  return {
    // 기존 필드
    settings,            // 추가 — 게임 진행 중 참조용 (불변)
    timeLimitSec: settings.timeLimitSec,
    elapsedMs: 0,
    // ...
  };
}
```

### 6-3. 시간 제한 적용 (`timeLimitSec`)

- 게임 시작 시점: `state.elapsedMs = 0`, `state.startedAtMs = performance.now()` 캡처
- 각 tick: `elapsedMs = performance.now() - startedAtMs`
- `state.settings.timeLimitSec !== null && elapsedMs / 1000 >= timeLimitSec` 면:
  - `status = "gameover"`, `deathCause = "timeout"`
  - `result` 는 `score` vs `cpuScore` 비교(동점 → `draw`)
- HUD 에 남은 시간 표시(디자이너 위임)

### 6-4. `cpuCount = 2` 비활성 처리

본 스토리 범위에서 코드 미준비(현재 `state.cpu` 단일 배열). UI 옵션은 노출하되:
- select / 버튼 그룹의 `cpuCount=2` 옵션을 `disabled` + "곧 추가 예정" 툴팁
- 만약 localStorage 에 `cpuCount: 2` 가 저장되어 있다면 로드 시 `1` 로 폴백(§9 EC-1)
- 향후 멀티 CPU 스토리(BF-58x)에서 활성화

---

## 7. KPI 이벤트 정의

### 7-1. 이벤트 카테고리

| 이벤트 키 | 트리거 | 페이로드 필드 |
|-----------|--------|--------------|
| `settings.modal.open` | 모달 열림 | `{ source: "start" \| "pause" \| "hotkey" }` |
| `settings.modal.close` | 모달 닫힘 | `{ outcome: "save" \| "cancel" \| "reset_then_save" }` |
| `settings.changed` | 개별 필드 변경(저장 시 1회 집계) | `{ field: string, oldValue: any, newValue: any }` 목록 |
| `settings.save` | [저장] 클릭 | `{ snapshot: <전체 settings 객체>, changedFields: string[] }` |
| `settings.cancel` | [취소]/Esc/[×] | `{ hadChanges: boolean }` |
| `settings.reset` | [기본값 복원] 클릭 | `{ prevSnapshot, nextSnapshot }` |
| `game.start` | 게임 시작 시점 | `{ effectiveSettings: <object> }` — 어떤 설정으로 게임 시작됐는지 |
| `game.end` | 게임 종료 시점 | `{ result, deathCause, elapsedMs, effectiveSettings }` |

### 7-2. 저장 위치

| 키 | 내용 |
|----|------|
| `bf-snake-settings-kpi` | 최근 N 개(예: 20) 이벤트 ring buffer (JSON array). 기존 KPI 키 컨벤션과 일치 |

> 운영자가 분석할 수 있도록 게임 종료 시 `console.log("[BF-579 KPI] ...")` 로 요약 1줄 출력(기존 `[BF-529 KPI]` 패턴 따름).

### 7-3. `effectiveSettings` 스냅샷 필드

`game.start` / `game.end` 에 포함되는 스냅샷은 §5-2 의 settings 객체 + `schemaVersion` 을 그대로 사용한다. 분석 시 어떤 설정 조합이 어떤 결과로 이어졌는지 추적 가능.

### 7-4. 분석 활용 예시

| 질문 | 사용 KPI |
|------|---------|
| 사용자들이 가장 많이 변경하는 설정은? | `settings.changed.field` 집계 |
| 아이템 ON 게임의 평균 생존 시간? | `game.end{itemsEnabled=true}.elapsedMs` 평균 |
| 시간 제한 사용 비율 vs 무제한 | `game.start.effectiveSettings.timeLimitSec === null` 비율 |
| 기본값 유지 사용자 비율 | `bf-snake-settings` localStorage 미존재 비율 (또는 첫 game.start 의 snapshot 이 DEFAULTS 와 일치) |

---

## 8. 사용자 시나리오 (Given/When/Then)

### 8-1. 첫 방문 사용자 — 기본값으로 시작

```
Given localStorage 에 "bf-snake-settings" 키가 없다
When 페이지가 로드된다
Then loadSettings() 는 §2-1 의 기본값을 반환한다
 And 시작 화면에서 Space 를 누르면 default 설정으로 게임이 시작된다
 And game.start KPI 에 기본 effectiveSettings 가 기록된다
```

### 8-2. 재방문 사용자 — 저장된 설정으로 시작

```
Given localStorage["bf-snake-settings"] = { difficulty:"easy", cpuCount:0, ..., schemaVersion:1 } 가 있다
When 페이지가 로드된다
Then 시작 시 적용되는 settings 는 저장된 값이다
 And UI 어딘가에 현재 설정 요약이 표시되어 사용자가 확인할 수 있다(디자이너 결정)
```

### 8-3. 모달 열기 — 변경 → 저장

```
Given 시작 화면 또는 일시정지 상태이다
When 사용자가 "⚙ 설정" 버튼을 클릭한다
Then 설정 모달이 열린다
 And settings.modal.open KPI 가 기록된다 (source = "start" 또는 "pause")
 And draftSettings = 현재 appliedSettings 로 초기화된다

When 사용자가 난이도를 normal → easy 로 변경한다
Then draftSettings.difficulty = "easy" 가 된다
 And UI 가 즉시 갱신된다 (localStorage 는 아직 미변경)

When 사용자가 [저장] 을 클릭한다
Then localStorage["bf-snake-settings"] 에 새 값이 기록된다
 And settings.save KPI 가 changedFields=["difficulty"] 로 기록된다
 And 모달이 닫힌다
 And 다음 게임 시작 시 easy 난이도가 적용된다
```

### 8-4. 모달 열기 — 변경 → 취소

```
Given 모달이 열려 있다
When 사용자가 적 지렁이 수를 1 → 0 으로 변경한다 (저장 아직 안 함)
 And [취소] 또는 Esc 를 누른다
Then 모달이 닫힌다
 And localStorage 는 변경되지 않는다
 And appliedSettings 도 변경되지 않는다
 And settings.cancel KPI 가 hadChanges=true 로 기록된다
```

### 8-5. 일시정지 중 설정 변경

```
Given 게임이 playing 상태이다
When 사용자가 Esc 를 눌러 일시정지한다
 And [설정] 버튼을 클릭한다
 And cpuCount 를 1 → 0 으로 변경한 후 [저장] 한다
Then 모달이 닫힌다
 And localStorage 에 저장된다
 And 현재 게임은 변하지 않는다 (CPU 여전히 존재)
 And 게임 오버 후 다음 게임은 솔로 모드로 시작된다
 And settings.save KPI 에 source 정보가 포함된다
```

### 8-6. 기본값 복원

```
Given 모달이 열려 있고 모든 값이 변경된 상태이다
When 사용자가 [기본값 복원] 을 클릭한다
Then draftSettings 가 §2-1 의 기본값으로 리셋된다
 And UI 가 갱신되지만 localStorage 는 아직 미변경
 And settings.reset KPI 가 기록된다

When 사용자가 [저장] 을 누른다
Then localStorage 가 기본값으로 갱신된다
 And settings.modal.close.outcome = "reset_then_save" 로 기록된다
```

### 8-7. 의존 컨트롤 disabled 동작

```
Given 모달이 열려 있다
When 사용자가 "아이템 등장" 토글을 off → on 으로 바꾼다
Then "등장 확률" 슬라이더가 enabled 가 된다 (값은 이전 값 유지)

When 사용자가 다시 on → off 로 바꾼다
Then 슬라이더가 disabled 가 된다 (값은 메모리상 유지, 저장 시 그대로 기록)
```

### 8-8. 시간 제한 만료

```
Given 사용자가 timeLimitSec = 60 으로 설정 저장한다
 And 새 게임을 시작한다
When elapsedMs >= 60000 (60초 경과)
Then state.status = "gameover" 가 된다
 And state.deathCause = "timeout" 이 된다
 And state.result 는 score 비교 결과로 결정된다
 And game.end KPI 에 deathCause="timeout", elapsedMs >= 60000 이 기록된다
```

### 8-9. 게임 진행 중 모달 차단

```
Given state.status === "playing" 이다
When 사용자가 "⚙" 버튼이 보이지 않거나 클릭해도 무반응이어야 한다
 And "S" 키도 무시된다 (방향키 충돌 방지를 위한 단축키도 비활성)
Then 모달이 열리지 않는다
 And settings.modal.open KPI 가 기록되지 않는다
```

---

## 9. Edge Case 목록

| ID | 케이스 | 동작 |
|----|--------|------|
| EC-1 | localStorage 에 `cpuCount: 2` 가 저장되어 있으나 코드 미지원 | 로드 시 `1` 로 폴백, console.warn |
| EC-2 | localStorage 에 `itemSpawnRate: 1.5` (범위 초과) | clamp 0..1 후 적용, console.warn |
| EC-3 | `initialLength = 7` 이지만 격자 폭 < 7 | 가능한 최대 홀수 길이로 클램프(예: 폭 5 → 길이 5), console.warn |
| EC-4 | `timeLimitSec = 0` 입력 시도 | UI 에서 차단(슬라이더 최소 60). 직접 localStorage 조작 시 60 으로 폴백 |
| EC-5 | localStorage write 실패(quota / private mode) | try-catch, console.warn, 메모리만 갱신 (현재 세션 한정 적용) |
| EC-6 | 모달 열린 상태에서 페이지 새로고침 | 저장 안 한 변경은 잃음 (의도된 동작 — draft 는 영구 저장하지 않음) |
| EC-7 | 모달 열린 상태에서 키보드 방향키 입력 | 게임 영향 없음 (모달이 열려 있을 때 키 핸들러는 모달에 위임) |
| EC-8 | `cpuCount = 0` + `multiplierEnabled = true` | 정상 동작. 솔로 모드에서 배수 먹이만 등장 |
| EC-9 | `itemsEnabled = false` 인데 진행 중 localStorage 가 외부에서 변경됨 | 변경은 다음 게임 시작 시 반영. 진행 중 게임 영향 없음 |
| EC-10 | localStorage JSON 손상 | parse 실패 시 §5-4 정책대로 키 삭제 + 기본값 사용 |
| EC-11 | `schemaVersion` 이 미래 값(예: 2) | 알 수 없는 필드는 무시, 알려진 필드만 추출. console.info |
| EC-12 | 동시에 두 탭에서 게임 + 설정 변경 | localStorage 는 마지막 write 가 이김. `storage` 이벤트 동기화는 본 스토리 범위 외 |

---

## 10. 디자이너 위임 시각 요소

본 명세는 **인터랙션·데이터·상태 전이** 만 정의한다. 다음 시각 요소는 designer 가 결정한다.

| 항목 | 명세 |
|------|------|
| 모달 배경 / 오버레이 색 | 미정 — 디자이너 결정 |
| 모달 크기 (반응형) | 데스크톱 기준 약 480px × auto, 모바일 full-width 권장 |
| 입력 컨트롤 스타일 | 슬라이더·select·토글·라디오 등 항목별 적절 선택 |
| ⚙ 버튼 아이콘 (start screen / pause 오버레이) | 위치만 정의: 우상단 또는 오버레이 중앙 하단 |
| HUD 남은 시간 표시 위치·폰트 | 미정 — 기존 HUD 와 일관성 |
| 의존 컨트롤 disabled 시 시각 표현 | 회색 처리 + cursor: not-allowed 권장 |
| "곧 추가 예정" 툴팁 (cpuCount=2) | 디자이너가 카피 톤 결정 |

> **기획·디자이너 분리 원칙**: 컨트롤의 모양·색상은 디자이너 영역. 본 명세 §3-2 의 ASCII 와이어프레임은 영역 구분 목적이며 최종 디자인이 아니다.

---

## 11. Acceptance Criteria 매핑

본 명세가 task BF-580 의 AC 를 어떻게 충족하는지 매핑한다.

| AC | 충족 섹션 |
|----|----------|
| **AC1** — 운영자가 명세를 읽을 때 단위·최소·최대·기본값이 표로 명시 | §2-1 (전체 표), §2-2 (항목별 상세), §5-2 (저장 스키마) |
| **AC2** — 게임 시작·모달 열기·변경·저장·취소·재시작 상태 전이 포함 | §3 (UX 흐름), §4 (상태 전이 다이어그램 + 표), §8 (Given/When/Then 시나리오 8.1~8.9) |
| **AC3** — KPI 측정 요구: 어떤 이벤트를 기록할지 항목별 정의 | §7 (KPI 이벤트 정의 표 + 페이로드 + 저장 위치 + 분석 활용 예시) |

추가적으로:
- §6 — `logic.js` 인터페이스 변경 가이드 (dev 가 코드 변경 시점 결정 도움)
- §9 — Edge case 12 개 (dev/tester 가 검증 시 참고)
- §10 — designer 위임 항목 명시 (역할 경계)

---

## 부록 A. 다른 페르소나가 알아야 할 핵심 결정

| 결정 | 결정 사유 | 영향 받는 페르소나 |
|------|----------|------|
| 모든 설정은 **재시작 단위 적용** | 게임 중 파라미터 변경 시 일관성·로직 복잡도 폭발 | dev (logic.js 시그니처 변경 시 in-game 변경 path 추가 X) |
| `cpuCount=2` 는 UI 만 노출, 적용 비활성 | 코드 미준비 — 멀티 CPU 는 별도 스토리 | dev (disabled 처리), designer (툴팁 카피) |
| 효과음 토글은 별도 키 유지 (BF-563) | 적용 단위가 다름 (효과음은 즉시 적용) | dev (두 키 분리 관리), designer (모달 안 효과음 항목 처리 방식) |
| localStorage 키: `bf-snake-settings` (단일) | 기존 키 컨벤션 일치 | dev, tester |
| schemaVersion 으로 향후 마이그레이션 지원 | 현재 v1, 추후 항목 추가 시 v2 | dev |
| 솔로 모드(`cpuCount=0`)는 KPI 별도 카테고리 | 분석 시 1vs1 과 분리 | dev (KPI 페이로드에 cpuCount 포함), 운영자 (분석 시) |
