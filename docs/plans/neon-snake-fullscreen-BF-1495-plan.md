# 네온 스네이크 전체화면 스테이지 — 구현 설계 및 handoff 계약 (BF-1495)

> **문서 성격**: planner 실행 설계(planning blueprint). designer(BF-1496)와 developer(BF-1497)가
> 그대로 따라야 할 **frozen 실행 계약**을 렌더링한다.
> **권위**: 파일 소유권·상태 계약·selector·token은 frozen Execution Blueprint가 유일한 권위이며,
> 본 문서는 이를 **재정의하지 않고 설명만** 한다. 새 파일·새 역할·새 요구사항을 추가하지 않는다.

## 1. 목표 (Objective)

PM 분해를 구현 가능한 계획과 handoff 계약으로 구체화한다.
`resize` / `orientationchange` / `fullscreenchange` 하에서 **뱀·먹이·점수·상태가 유지되는**
회귀 가드를 명시하고, 뷰포트 실시간 확장·DPR 리렌더·상태 보존 실행 설계와 UI 계약을 동결한다.

- 라우트: `/demo/neon-snake-fullscreen-0802`
- 진입 파일(entry): `demo/neon-snake-fullscreen-0802/index.html`
- serve root: 저장소 루트 (`.`), root-relative-static

## 2. 사용자 시나리오 (Use Case)

- **행위자**: 플레이어(단일), 스크린 리더 사용자, 모바일/데스크톱 사용자
- **주 흐름**
  1. 사용자가 `/demo/neon-snake-fullscreen-0802`에 진입하면 스테이지가 뷰포트 전체(`100dvw × 100dvh`)를 채우고 `ready` 상태로 표시된다.
  2. 사용자가 시작(키 입력/탭/`restart-button`)하면 `playing` 상태로 전환되어 뱀이 이동하고 먹이 획득 시 점수가 증가한다.
  3. 게임 중 사용자가 창 크기를 바꾸거나(리사이즈) 기기를 회전(orientationchange)하거나 전체화면을 토글(fullscreenchange)해도 **게임은 재시작되지 않고** 뱀·먹이·점수·상태가 그대로 유지된 채 새 크기에 맞춰 다시 그려진다.
  4. 뱀이 벽/자기 몸에 충돌하면 `gameover` 상태로 전환되고 `game-overlay`에 상태 텍스트가 노출된다.
  5. 사용자가 `restart-button`을 활성화하면 상태·점수·진행 표시가 초기값으로 복귀하고 `ready`(또는 즉시 새 게임)로 되돌아가 주 control을 다시 사용할 수 있다.
- **대안/실패 흐름**: 일시정지(`paused`) → 재개 시 이전 진행 유지, 초기화/취소/실패 후에는 상태·진행 표시가 초기값으로 복귀한다.

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 · 전체화면 스테이지 채움
- **Given** 320px 모바일부터 1920px 이상 데스크톱까지 임의 뷰포트에서
- **When** 페이지를 로드하면
- **Then** `#game-stage`가 `100dvw × 100dvh` 사용 가능 영역을 채우고, body 스크롤·고정 415px·정사각형 제한이 없으며, `safe-area-inset`을 반영한다.

### AC-2 · 리사이즈/전환 시 상태 보존 (회귀 기준)
- **Given** `playing` 또는 `paused` 상태에서 뱀·먹이·점수가 존재할 때
- **When** `resize` / `orientationchange` / `fullscreenchange` 이벤트가 발생하면
- **Then** 게임은 **재시작되거나 상태가 초기화되지 않고**, 뱀 좌표·먹이 좌표·점수·현재 상태가 보존되며, DPR/새 grid에 맞춰 캔버스가 다시 렌더된다.
- **And** 새 grid에서 모든 좌표는 **유효 범위 내로 클램프/보정**되어 뱀·먹이가 화면 밖으로 벗어나지 않는다.

### AC-3 · HUD/overlay 비침습 오버레이
- **Given** 임의 뷰포트에서
- **When** HUD(`#hud-score`, `#hud-highscore`)와 `#game-overlay`가 표시되면
- **Then** 이들은 플레이 영역 **위 오버레이**로 배치되어 `game-stage` 계산 크기를 줄이지 않으며, 잘리거나 겹치지 않는다.

### AC-4 · 상태 노출 및 접근성
- **Given** `ready` / `playing` / `paused` / `gameover` 상태에서
- **When** 상태가 바뀌면
- **Then** 상태명이 색상만이 아니라 **화면 텍스트와 접근성 이름**으로 노출되고, `#game-overlay`는 `aria-live="polite"`로 상태 텍스트(준비/일시정지/게임오버)를 안내한다.

### AC-5 · 초기화 후조건
- **Given** 초기화/취소/실패가 발생하면
- **When** 처리가 끝난 뒤
- **Then** 상태와 진행 표시가 초기값으로 되돌아가고 주 실행 control(`#restart-button`)을 다시 사용할 수 있다.

## 4. UI 계약 (Frozen — exact 값, 변경/재정의 금지)

designer와 developer는 아래 selector와 token을 **변경하거나 재정의하지 않는다**.

### 4.1 산출물 파일 및 소유자
| 파일 | 소유자 | policy |
|---|---|---|
| `demo/neon-snake-fullscreen-0802/index.html` | developer | additive |
| `demo/neon-snake-fullscreen-0802/src/game.js` | developer | additive |
| `demo/neon-snake-fullscreen-0802/tests/viewport.test.js` | developer | additive |
| `docs/design/neon-snake-fullscreen-BF-1495.md` | designer | additive |

> **소유권 주의**: 요청 라우트의 `expected_entry_path`(`demo/neon-snake-fullscreen-0802/index.html`)는
> **developer 소유**이며 planner의 owned_paths(`docs/plans/...`)가 아니다. 구현은 developer가 위 경로에서만 수행한다.

### 4.2 DOM ID
`game-stage`, `game-canvas`, `hud-score`, `hud-highscore`, `game-overlay`, `restart-button`, `touch-controls`

### 4.3 CSS class
`stage`, `stage__canvas`, `hud`, `hud__item`, `overlay`, `overlay--gameover`, `touch-pad`

### 4.4 상태(states)와 화면 텍스트
| 상태 | 화면/overlay 텍스트 | 비고 |
|---|---|---|
| `ready` | 준비 | 시작 대기, overlay 표시 |
| `playing` | (overlay 숨김) | 뱀 이동·점수 진행 |
| `paused` | 일시정지 | 진행 유지, overlay 표시 |
| `gameover` | 게임오버 | `overlay--gameover` 부여, overlay 표시 |

### 4.5 design token / CSS 변수 (exact)
| 변수 | 값 |
|---|---|
| `--neon-primary` | `#39ff14` |
| `--neon-bg` | `#050510` |
| `--hud-gap` | `12px` |
| `--overlay-bg` | `rgba(5,5,16,0.72)` |
| `--safe-area-top` | `env(safe-area-inset-top)` |

### 4.6 접근성 요구
- `#game-overlay`는 `aria-live="polite"`로 상태 텍스트(준비/일시정지/게임오버)를 안내한다.
- `#restart-button`은 명시적 `aria-label`을 가지며 키보드 포커스로 도달·활성화된다.
- `#game-canvas`는 `role`과 `aria-label`을 가지고 `prefers-reduced-motion`을 존중한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.7 반응형 요구 (320px ~ 1920px+)
- `#game-stage`는 `100dvw × 100dvh` 사용 가능 영역을 채우고 body 스크롤·고정 415px/정사각형 제한이 없다.
- 320px 모바일부터 1920px 이상 데스크톱까지 HUD·overlay가 잘리거나 겹치지 않고 `safe-area-inset`을 반영한다.
- HUD와 overlay는 플레이 영역 **위 오버레이**로 배치되어 stage 계산 크기를 줄이지 않는다.

## 5. 실행 설계 — 뷰포트 확장 · DPR 리렌더 · 상태 보존

1. **뷰포트 확장**: `game-stage`는 `100dvw × 100dvh`를 CSS로 채우고, `game-canvas`는 stage의 실제 픽셀 크기를 따라간다. HUD/overlay는 `position` 오버레이로 얹어 stage 크기 계산에 영향을 주지 않는다.
2. **DPR 리렌더**: 이벤트 발생 시 `devicePixelRatio`를 반영해 canvas backing store 크기(`width/height` 속성)를 CSS 크기 × DPR로 재설정하고, 렌더 컨텍스트 scale을 재적용한다. 논리 grid 셀 크기만 재계산하고 **게임 상태(뱀/먹이/점수/상태)는 건드리지 않는다**.
3. **상태 보존**: 리사이즈/전환 핸들러는 **재초기화 함수가 아니라 리렌더 함수만** 호출한다. 상태 컨테이너(뱀 좌표 배열, 먹이 좌표, 점수, 현재 상태값)는 이벤트 경로에서 재생성되지 않는다.
4. **좌표 유효성**: 새 grid 열/행 수가 줄어드는 경우 뱀·먹이 좌표를 새 경계 내로 클램프하여 화면 밖 좌표를 제거한다(뱀 몸통은 유효 셀 유지, 먹이는 필요 시 유효 셀로 재배치).

## 6. 회귀 가드 (Regression Guard)

`demo/neon-snake-fullscreen-0802/tests/viewport.test.js`(developer 소유)가 검증할 불변식:

- **RG-1**: `resize` / `orientationchange` / `fullscreenchange` 발생 후 게임 상태(`playing`/`paused`)가 유지되고 **재시작·초기화되지 않는다**.
- **RG-2**: 전환 후 뱀 좌표·먹이 좌표·점수가 이벤트 직전 값과 동일하게 보존된다.
- **RG-3**: 새 grid에서 모든 뱀/먹이 좌표가 유효 범위(`0 ≤ x < cols`, `0 ≤ y < rows`) 안에 있다.
- **RG-4**: 초기화/취소/실패 후 상태·진행 표시가 초기값으로 복귀하고 `#restart-button`이 다시 활성 가능하다.

## 7. API 스펙 / 데이터 모델

- **서버 API 없음**: 순수 클라이언트(vanilla-static, ESM) 데모로 서버 엔드포인트·영속 스토리지 스키마를 도입하지 않는다.
- **클라이언트 상태 모델(런타임 전용, 파일/DB 아님)**:
  - `GameState`: `status ∈ {ready, playing, paused, gameover}`, `score:int≥0`, `highScore:int≥0`
  - `Snake`: 셀 좌표 배열 `[{x:int, y:int}, ...]`, `direction`
  - `Food`: `{x:int, y:int}`
  - `Grid`: `{cols:int, rows:int, cellPx:number}` — 뷰포트/DPR로부터 파생, 상태 보존과 무관하게 재계산

## 8. Edge case · 실패 케이스

- **E1**: 리사이즈 중 grid가 뱀 길이보다 작아짐 → 뱀을 유효 범위로 클램프하되 게임오버로 처리하지 않는다(전환은 상태 변경 트리거가 아님).
- **E2**: `fullscreenchange`가 사용자 취소로 전체화면 해제 → 상태·점수 유지, 축소된 뷰포트로 리렌더만 수행.
- **E3**: `prefers-reduced-motion: reduce` → 애니메이션/글로우 모션을 축소하되 게임 로직·상태 노출은 동일하게 유지.
- **E4**: 320px 협소 폭 → HUD `--hud-gap` 유지, overlay 텍스트 줄바꿈 허용, 잘림/겹침 금지.
- **E5**: safe-area 있는 노치 기기 → `--safe-area-top` 등 inset 반영으로 HUD/overlay가 시스템 UI에 가리지 않게 배치.
- **E6**: 연속 빠른 리사이즈 이벤트 → 리렌더는 멱등이어야 하며 상태 누적 손상이 없어야 한다.

## 9. Handoff 계약 (후조건)

- **designer(BF-1496)**: `docs/design/neon-snake-fullscreen-BF-1495.md`에 위 4장 UI 계약(selector·token·상태·접근성·반응형)을 그대로 시각 명세로 렌더링한다. selector/token을 변경·재정의하지 않는다.
- **developer(BF-1497)**: `demo/neon-snake-fullscreen-0802/{index.html, src/game.js, tests/viewport.test.js}`를 위 계약대로 구현한다. 6장 회귀 가드를 `tests/viewport.test.js`로 커버한다.
- **후조건 불변식**: 파일 소유권·상태 계약은 frozen blueprint가 유일 권위이며, 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.

## 10. 검증 명령 (저장소 권위)

```
node --test demo/neon-snake-fullscreen-0802/tests/*.test.js
```

focused 범위: 신규/수정 테스트와 owned_paths 직접 관련 테스트만 실행한다.
