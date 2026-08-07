# 슈퍼마리오 1-1 구현 설계 (BF-1876)

> 작성: 박기획 (planner) · Task: BF-1879
> 이 문서는 frozen Execution Blueprint(`planning-contract@v1`, `ui-contract@v1`)를 렌더링한 실행 설계입니다.
> designer/developer는 이 문서와 frozen blueprint의 파일·소유자·상태·후조건을 그대로 따르며, 새 파일이나 역할을 추가하지 않습니다.

## 0. 실행 개요

- 대상: HTML5 `<canvas>` 기반 슈퍼마리오 1-1 게임 (물리·입력·1-1 레벨·렌더 루프).
- 실행 방식: vanilla-static repo에서 `file://`로 `supermario/index.html`을 직접 열어 실행 가능해야 한다.
- 격리 원칙: **다른 module 코드를 참조하지 않고 `supermario/` 폴더에만 구현**한다. (frozen invariant)
- 모듈 시스템: ESM (`<script type="module">`), 번들러/빌드 스텝 없음.

## 1. 파일 소유권 · 상태 계약 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `docs/design/supermario-BF-1876.md` | designer | additive | 시각 명세 (색/레이아웃/상태 표현) |
| `supermario/index.html` | developer | additive | 진입 문서 · DOM 뼈대 · CSS 변수 정의 |
| `supermario/src/game.js` | developer | additive | 게임 상태·물리·입력·렌더 루프 |
| `supermario/src/level-1-1.js` | developer | additive | 1-1 레벨 타일 데이터 |
| `supermario/tests/game.test.js` | developer | additive | 단위 테스트 (물리·충돌·상태 전이) |

> 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 재정의하지 않는다.

## 2. UI 계약 (ui-contract@v1 — selector·token 변경/재정의 금지)

### 2.1 DOM ID
`game-root`, `game-canvas`, `game-hud`, `game-score`, `game-start`

### 2.2 CSS class
`game`, `game__canvas`, `game__hud`, `game__score`, `game__start`

### 2.3 DOM 구조 (exact)

```html
<div id="game-root" class="game">
  <div id="game-hud" class="game__hud">
    <span id="game-score" class="game__score">SCORE 000000</span>
    <button id="game-start" class="game__start" aria-label="게임 시작">시작</button>
  </div>
  <canvas id="game-canvas" class="game__canvas"
          aria-label="슈퍼마리오 1-1 게임 화면"></canvas>
</div>
```

### 2.4 게임 상태 (states)

`ready` → `playing` → `paused` → `gameover` / `cleared`

| 상태 | 진입 조건 | 화면 텍스트(예) | 접근성 이름 |
| --- | --- | --- | --- |
| `ready` | 최초 로드 / 초기화·취소·실패 후 | `READY` | "준비 상태" |
| `playing` | `game-start` 조작 또는 재개 | (HUD SCORE 갱신) | "진행 중" |
| `paused` | 일시정지 입력 | `PAUSED` | "일시정지" |
| `gameover` | 낙사/피격/시간초과 | `GAME OVER` | "게임 오버" |
| `cleared` | 목적지(깃대) 도달 | `CLEARED` | "클리어" |

- **모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(aria)으로 노출**한다.
- **초기화·취소·실패 뒤에는 상태와 진행 표시(SCORE 포함)를 초기값(`ready`, `000000`)으로 되돌리고, 주 실행 control(`game-start`)을 다시 사용할 수 있어야 한다.**

### 2.5 디자인 토큰 (CSS 변수 — `index.html` `:root`에 정의)

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--color-sky` | `#5c94fc` | 배경 하늘 |
| `--color-ground` | `#c84c0c` | 지면 블록 |
| `--color-brick` | `#e45c10` | 벽돌 블록 |
| `--color-mario` | `#d82800` | 마리오 |
| `--space-hud-gap` | `12px` | HUD 요소 간격 |

- canvas 렌더 시에도 위 색상 값을 그대로 사용한다(하드코딩 헥사 재정의 금지 — CSS 변수 또는 동일 값 상수 1곳에서 참조).

### 2.6 접근성 (accessibility)

- `game-canvas`는 `aria-label="슈퍼마리오 1-1 게임 화면"`을 가진다.
- 방향키(←→)로 이동, `Space` 또는 `↑`로 점프하는 키보드 조작을 지원한다.
- `game-start` control은 명시적인 `aria-label`을 가진다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 2.7 반응형 (responsive)

- 320px 이상에서 canvas가 viewport 폭에 맞춰 축소되고 content overflow가 발생하지 않는다. (`max-width:100%`, 논리 해상도는 고정하고 CSS 폭만 축소)
- 좁은 화면에서 `game-hud`와 `game-score`가 겹치지 않는다. (`game__hud`는 flex, `gap: var(--space-hud-gap)`)

## 3. 물리 (physics)

논리 좌표 기준(픽셀/frame, 1 frame = 16.67ms 기준 fixed-step). developer는 아래 값을 상수로 노출하고 테스트에서 검증한다.

| 파라미터 | 기본값(권장) | 설명 |
| --- | --- | --- |
| `GRAVITY` | `0.5` px/frame² | 매 프레임 vy 증가량 |
| `MOVE_SPEED` | `2.0` px/frame | 좌우 이동 속도 |
| `JUMP_VELOCITY` | `-8.0` px/frame | 점프 시작 vy (위 방향 음수) |
| `MAX_FALL_SPEED` | `10` px/frame | 낙하 속도 상한 |
| `TILE` | `16` px | 타일 한 칸 크기 |

- 이동: `x += vx` (좌우 입력에 따라 `vx = ±MOVE_SPEED` 또는 0).
- 중력: 접지 상태가 아니면 `vy = min(vy + GRAVITY, MAX_FALL_SPEED)`.
- 점프: 접지(`onGround`) 상태에서 점프 입력 시 `vy = JUMP_VELOCITY`, `onGround = false`. 공중 재점프 불가.
- 낙사: 마리오 y가 화면(레벨) 하단을 넘으면 `gameover`.

### 3.1 충돌 (collision) — AABB, 축 분리 처리

1. 수평 이동 적용 → 겹치는 solid 타일이 있으면 x를 경계로 되돌리고 `vx = 0`.
2. 수직 이동 적용 → 아래로 겹치면 y를 타일 상단에 맞추고 `vy = 0`, `onGround = true`; 위로 겹치면(머리) y를 맞추고 `vy = 0`.
3. `onGround`는 매 프레임 수직 충돌 판정 후 재계산한다.
4. solid 타일 종류: 지면(`ground`), 벽돌(`brick`), 단단한 블록(`block`). 빈칸(`empty`)·깃대(`flag`)는 비-solid.

## 4. 입력 (input)

- 키다운/키업으로 입력 상태 집합을 유지(`{left,right,jump}`), 렌더 루프에서 소비한다.
- 키 매핑:
  - `ArrowLeft` → left, `ArrowRight` → right
  - `Space` 또는 `ArrowUp` → jump
- `game-start` 클릭/`Enter`/`Space`(버튼 포커스 시): `ready`/`gameover`/`cleared` → `playing` 초기화 진입, `playing` → `paused` 토글은 별도 키(선택: `KeyP`)로 분리 가능(developer 재량, 계약 아님).
- 게임 화면 스크롤 방지를 위해 방향키·Space는 `preventDefault` 처리.

## 5. 1-1 레벨 데이터 구조 (`level-1-1.js`)

- ESM으로 `export const LEVEL_1_1`를 노출.
- 표현: 문자 그리드(행 배열) + 범례. 파싱은 `game.js`에서 수행.

```js
// level-1-1.js (구조 예시 — 실제 그리드는 developer가 1-1을 재현)
export const LEGEND = {
  '.': 'empty',
  'G': 'ground',   // 지면
  'B': 'brick',    // 벽돌
  '?': 'block',    // 물음표 블록(solid)
  'F': 'flag',     // 깃대(목적지)
};
export const LEVEL_1_1 = {
  tileSize: 16,
  spawn: { x: 2, y: 11 },     // 마리오 시작(타일 좌표)
  goal:  { col: /* 깃대 열 */ },
  rows: [
    '................................',
    // ... 상단 공중 벽돌/물음표 블록 ...
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // 지면(하단 2행 권장)
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
};
```

- 요구 조건:
  - 마지막 열 부근에 `flag`(깃대)를 두고, 마리오가 도달하면 `cleared`.
  - 지면 사이 구멍(낙사 지점)을 최소 1곳 포함해 낙사 → `gameover` 경로를 검증 가능하게 한다.
  - solid 판정은 §3.1의 타입 집합을 그대로 사용.
  - 좌표계: 열=x, 행=y, 픽셀 = 타일좌표 × `tileSize`.

## 6. 렌더 루프 (render loop)

- `requestAnimationFrame` 기반. fixed-step 누적(accumulator)으로 물리 스텝을 프레임레이트와 분리하는 것을 권장(계약 아님, 안정성 목적).
- 매 스텝:
  1. 입력 소비 → `vx`/점프 반영
  2. 물리 적분(중력·이동) → 충돌 해소(§3.1)
  3. 상태 전이 판정(낙사→`gameover`, 깃대→`cleared`)
  4. 카메라 x = clamp(마리오 x − 화면폭/2, 0, 레벨폭 − 화면폭)
  5. 렌더: 하늘 배경 → 타일(ground/brick/block) → 깃대 → 마리오 → HUD SCORE 갱신
- `playing`이 아닌 상태에서는 물리 적분을 멈추고 상태 오버레이 텍스트를 그린다.
- 렌더는 논리 해상도(예: `256×240`)의 canvas 백버퍼에 그리고, CSS로만 축소(§2.7)한다.

## 7. Acceptance Criteria (Given/When/Then)

- **AC-1 초기 표시**
  - Given `supermario/index.html`을 `file://`로 연다
  - When 최초 로드된다
  - Then `#game-root` 하위에 `#game-hud`(`#game-score`,`#game-start`)와 `#game-canvas`가 렌더되고, 상태는 `ready`이며 SCORE는 `000000`이다.

- **AC-2 시작/이동/점프**
  - Given `ready` 상태
  - When `game-start`를 조작하고 방향키·Space를 누른다
  - Then 상태가 `playing`이 되고, 마리오가 좌우 이동 및 접지 시 점프하며 중력으로 낙하한다.

- **AC-3 충돌**
  - Given `playing` 상태에서 마리오가 solid 타일을 향해 이동/낙하한다
  - When 타일과 겹친다
  - Then 마리오가 타일 경계에서 멈추고(관통 없음), 지면 착지 시 `onGround=true`가 된다.

- **AC-4 클리어**
  - Given 마리오가 레벨 끝의 깃대(`flag`)에 도달한다
  - When 목적지 판정이 성립한다
  - Then 상태가 `cleared`가 되고 화면 텍스트·aria로 "클리어"가 노출된다.

- **AC-5 게임오버 & 초기화 복구**
  - Given 마리오가 구멍으로 낙사하거나 실패한다
  - When `gameover`가 된다 그리고 사용자가 `game-start`를 다시 조작한다
  - Then 상태·진행 표시(SCORE)가 초기값(`ready`/`000000`)으로 되돌아가고 `game-start`를 다시 사용할 수 있다.

- **AC-6 접근성**
  - Given 게임 화면
  - When 스크린리더/키보드로 접근한다
  - Then `#game-canvas`는 `aria-label="슈퍼마리오 1-1 게임 화면"`, `#game-start`는 명시적 aria-label을 가지며, 모든 상태는 색상만이 아니라 텍스트·aria로 구분되고 방향키/Space·↑ 조작이 동작한다.

- **AC-7 반응형**
  - Given viewport 폭 ≥ 320px
  - When 폭을 좁힌다
  - Then canvas가 폭에 맞춰 축소되고 overflow가 없으며, `game-hud`와 `game-score`가 겹치지 않는다.

## 8. Edge / 실패 케이스

- 로드 실패(레벨 데이터 미로드): `ready` 유지 + 상태 텍스트로 오류 노출, `game-start` 사용 가능.
- 방향키 동시 입력(좌+우): `vx=0`(상쇄).
- 공중 점프 입력: 무시(재점프 불가).
- 반복 시작 입력: `playing` 중 `game-start` 재조작 시 중복 초기화 없이 무시하거나 명시적 재시작으로 처리(관통/중복 루프 금지).
- 브라우저 탭 비활성 → `paused` 권장(선택), 재개 시 물리 시간 점프 방지(accumulator clamp).
- 매우 좁은 화면(320px): HUD 줄바꿈 대신 축약, 요소 겹침 없음.

## 9. 검증 (focused)

- `supermario/tests/game.test.js` 단위 테스트로 물리(중력/점프/낙하 상한), 충돌(축 분리, 관통 없음), 상태 전이(ready→playing→cleared/gameover→ready 초기화)를 검증한다.
- 실행: `npm test` (focused scope — 본 module 테스트만).

## 10. Handoff

- designer: `docs/design/supermario-BF-1876.md`에 §2 UI 계약(selector·상태·token·접근성·반응형)을 시각 명세로 구체화. selector/token 변경 금지.
- developer: `supermario/index.html`·`src/game.js`·`src/level-1-1.js`·`tests/game.test.js`를 §1 소유권대로 구현. `supermario/` 폴더 밖 코드 참조 금지, selector·token 준수.
