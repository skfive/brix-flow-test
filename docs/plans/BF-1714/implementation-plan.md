# Space Defender 실행 설계 및 UI 계약 (BF-1714)

> 이 문서는 planner(BF-1719)가 동결한 실행 설계입니다.
> designer(BF-1717)와 developer(BF-1718)는 이 문서와 frozen blueprint를 그대로 따릅니다.
> **파일 소유권·상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 재정의하지 않고 그대로 설명합니다.**
> selector·token 을 변경하거나 재정의하지 마세요. 새 파일이나 역할을 추가하지 마세요.

---

## 1. 개요

- **모듈**: `phaser-space-defender/` (신규)
- **스택**: vanilla-static + Phaser 3 (CDN 로드)
- **모듈 타입**: ESM (`type: "module"`), serve root = 저장소 루트
- **게임 개념**: 플레이어 함선이 좌우로 이동하며 스페이스로 발사, 낙하하는 적을 요격하는 세로형 슈팅 게임
- **핵심 설계 원칙**: 순수 게임 로직(`logic.js`)을 렌더링(`game.js`)에서 완전히 분리한다. 무작위 요소는 주입(injection)으로 처리해 테스트 가능성을 확보한다.

---

## 2. 파일 배치 및 소유권 (frozen)

frozen blueprint가 정의한 파일·소유자를 그대로 옮긴 표입니다. 추가·재배정 금지.

| 파일 | 소유자 | additive 정책 |
| --- | --- | --- |
| `docs/design/BF-1714/design-mockup.html` | designer | additive |
| `docs/design/BF-1714/design-tokens.html` | designer | additive |
| `phaser-space-defender/README.md` | canonical work packet owner | additive |
| `phaser-space-defender/index.html` | developer | additive |
| `phaser-space-defender/src/game.js` | developer | additive |
| `phaser-space-defender/src/logic.js` | developer | additive |
| `phaser-space-defender/tests/logic.test.js` | developer | additive |

- **artifact-policy: additive** — 모든 산출물은 기존 계약 selector/token 을 삭제·재정의하지 않고 계약대로 신규 생성한다.
- designer 는 `docs/design/BF-1714/` 산출물(mockup + tokens)만, developer 는 `phaser-space-defender/` 구현 파일만 담당한다.

---

## 3. 씬(Scene) 구성

Phaser 3 씬은 단일 `GameScene` 하나로 구성하고, 화면 전환은 DOM 오버레이(start/paused/gameover)로 처리한다.
Phaser 캔버스는 `#game-canvas`에 렌더링되고, HUD·오버레이는 캔버스 위에 겹쳐지는 DOM 레이어다.

- `preload()`: 스프라이트/사운드 없이 색상 도형(Graphics) 기반으로 렌더링 → CDN 외 에셋 의존 없음
- `create()`: 함선·입력·초기 상태(start) 세팅, HUD 텍스트 DOM 바인딩
- `update(time, delta)`: `logic.js` 순수 함수에 현재 상태 + delta + 주입된 난수를 넘겨 다음 상태를 계산하고, 반환된 상태로 렌더링만 수행

렌더링 레이어(`game.js`)는 상태를 **저장하지 않고** logic 반환값을 화면에 반영만 한다.

---

## 4. 순수 게임 로직 모듈 경계 (`src/logic.js`)

`logic.js` 는 Phaser·DOM·전역 상태에 의존하지 않는 순수 함수 모듈이다. 렌더링과 분리된 경계는 다음과 같다.

### 4.1 상태 형태 (GameState)

```
{
  status: 'start' | 'playing' | 'paused' | 'gameover',
  score: number,
  lives: number,
  highScore: number,
  ship: { x: number },
  bullets: [{ x, y }],
  enemies: [{ x, y }],
}
```

### 4.2 순수 함수 경계

| 함수 | 시그니처(개념) | 책임 |
| --- | --- | --- |
| `createInitialState(highScore)` | `(highScore) => GameState` | start 상태의 초기값 생성 (score=0, lives=초기값, 함선 중앙) |
| `transition(state, event)` | `(state, event) => GameState` | start→playing→paused↔playing→gameover 상태 전이 |
| `stepPhysics(state, delta, rng)` | `(state, delta, rng) => GameState` | 함선·탄·적 위치 갱신, 적 스폰(rng 주입) |
| `detectCollisions(state)` | `(state) => { state, hits }` | 탄–적, 적–함선 충돌 판정 |
| `applyScore(state, hits)` | `(state, hits) => GameState` | 점수 가산, 목숨 차감, highScore 갱신 |

### 4.3 무작위 요소 주입 방식

- 적 스폰 위치·타이밍 등 무작위 요소는 **`rng` 파라미터(0~1 반환 함수)를 인자로 주입**한다.
- `game.js` 는 런타임에서 `Math.random` 을 주입하고, `logic.test.js` 는 결정적 시퀀스(예: 고정 배열을 순차 반환하는 stub)를 주입한다.
- `logic.js` 내부에서 `Math.random` 을 직접 호출하지 않는다 → 테스트 재현성 보장.

---

## 5. 상태 계약 (frozen) — start / playing / paused / gameover

각 상태는 색상만이 아니라 **상태명을 화면 텍스트와 접근성 이름으로 노출**한다.
초기화·취소·실패 뒤에는 상태·진행 표시를 초기값으로 되돌리고 주 실행 control(start/restart)을 다시 사용할 수 있어야 한다.

| 상태 | 표시 화면(DOM) | 화면 텍스트 | HUD 표시 |
| --- | --- | --- | --- |
| `start` | `#start-screen`(.screen--start) 노출 | 타이틀 + "게임 시작" `#start-button` | HUD 초기값(점수 0 / 목숨 초기 / 최고점수) |
| `playing` | 모든 오버레이 숨김, 캔버스 활성 | 없음(게임 진행) | 점수·목숨·최고점수 실시간 갱신 |
| `paused` | `#pause-overlay`(.screen--pause) 노출 | "일시정지" 텍스트 노출 | HUD 값 유지(정지 시점 값) |
| `gameover` | `#gameover-screen`(.screen--gameover) 노출 | "게임 오버" + `#final-score` + "다시 시작" `#restart-button` | 최종 점수 HUD 반영 |

- **후조건(invariant)**: gameover 이후 `#restart-button` → `createInitialState` 로 start 초기값 복귀, 주 실행 control 재사용 가능.
- paused ↔ playing 은 `P` 키 토글로 전환하며 진행 상태(점수·목숨·위치)를 보존한다.

---

## 6. UI 계약 — DOM ID / class (frozen, 변경 금지)

### 6.1 DOM ID (11개)

| ID | 용도 |
| --- | --- |
| `game-root` | 게임 전체 루트 컨테이너 |
| `game-canvas` | Phaser 렌더 캔버스 |
| `hud-score` | 현재 점수 텍스트 |
| `hud-lives` | 남은 목숨 텍스트 |
| `hud-highscore` | 최고 점수 텍스트 |
| `start-screen` | 시작 화면 오버레이 |
| `start-button` | 게임 시작 버튼 |
| `pause-overlay` | 일시정지 오버레이 |
| `gameover-screen` | 게임 오버 화면 |
| `final-score` | 게임 오버 최종 점수 텍스트 |
| `restart-button` | 다시 시작 버튼 |

### 6.2 CSS class (9개)

| class | 용도 |
| --- | --- |
| `hud` | HUD 컨테이너 |
| `hud__stat` | HUD 개별 지표(점수/목숨/최고점수) |
| `screen` | 오버레이 화면 공통 |
| `screen--start` | 시작 화면 변형 |
| `screen--pause` | 일시정지 화면 변형 |
| `screen--gameover` | 게임 오버 화면 변형 |
| `btn` | 버튼 공통 |
| `btn--primary` | 주 실행 버튼 변형 |
| `canvas-frame` | 캔버스 프레임 |

---

## 7. CSS custom property token (frozen 값, 변경·재정의 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-bg-space` | `#0b0e1a` | 우주 배경 |
| `--color-panel` | `#151a2e` | 패널/오버레이 배경 |
| `--color-accent-primary` | `#00e5ff` | 강조(주 실행/함선) |
| `--color-danger` | `#ff3b6b` | 위험/게임오버 |
| `--color-text-primary` | `#e8ecf8` | 기본 텍스트 |
| `--space-hud-gap` | `12px` | HUD 지표 간격 |
| `--radius-panel` | `8px` | 패널 모서리 반경 |
| `--font-size-score` | `24px` | 점수 폰트 크기 |
| `--font-size-title` | `40px` | 타이틀 폰트 크기 |

- designer 는 `design-tokens.html` 에 위 token 을 그대로 정의하고, developer 는 `index.html` 에서 동일 값을 참조한다.

---

## 8. 접근성 계약 (frozen)

1. `#start-button` 과 `#restart-button` 은 명시적 `aria-label` 을 가진다.
2. 키보드 지원: **방향키 좌우** 함선 이동 / **스페이스** 발사 / **P** 일시정지 토글.
3. 점수·목숨·최고점수는 텍스트(`hud__stat`)로 노출되어 색상만으로 정보를 전달하지 않는다.
4. 모든 상태(start/playing/paused/gameover)는 색상만으로 구분하지 않고 상태명을 화면 텍스트·접근성 이름으로 노출한다.

---

## 9. 반응형 계약 (frozen)

1. **320px 이상**에서 HUD·오버레이 텍스트에 overflow 가 발생하지 않는다.
2. 게임 캔버스는 세로형 비율을 유지하며 뷰포트 높이에 맞춰 축소된다(`Phaser.Scale.FIT` 등 비율 유지 스케일).

---

## 10. 검증 경계 (`tests/logic.test.js`)

- 대상: `src/logic.js` 순수 함수 (렌더링·DOM 제외, focused 범위).
- 결정적 `rng` stub 을 주입해 다음을 단위 검증한다:
  - 상태 전이: start→playing→paused↔playing→gameover 및 gameover→start(초기값 복귀)
  - 충돌 판정: 탄–적 명중 시 적 제거, 적–함선 충돌 시 목숨 차감
  - 점수: 명중 시 가산, `highScore` 갱신, 초기화 시 score=0 복귀
- 실행: `npm test` (package test 명령, 표시용). focused scope — 다른 module 회귀는 실행하지 않는다.

---

## 11. 후속 페르소나 handoff 요약

- **designer(BF-1717)**: `design-mockup.html` + `design-tokens.html` 를 §6~§9 계약대로 작성. selector·token 신규 생성만(additive), 변경·재정의 금지.
- **developer(BF-1718)**: `index.html` + `src/game.js` + `src/logic.js` + `tests/logic.test.js` 를 §3~§10 계약대로 구현. `logic.js` 는 순수 함수(§4)로 유지하고 `game.js` 에서만 Phaser/DOM/`Math.random` 주입.
- **reviewer**: design·develop PR 완료 후 계약 준수(selector/token/상태 텍스트/접근성/반응형) 검토.
- **tester**: review 후 `logic.test.js` 실행 결과(test_result)로 로직 계약 검증.
