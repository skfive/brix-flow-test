# Snake 게임 구현 설계 (BF-1697)

> 상태: frozen — developer는 아래 구조·경로·DOM 계약을 변경하지 않고 그대로 구현한다.

## 1. 범위와 제약

- 신규 독립 디렉터리 `snake-game/` 안에서만 작업한다.
- **기존 backend 코드, 기존 snake 모듈(`tests/snake-BF608.test.js` 및 그 대상 코드), `package.json`의 기존 `test`/`test:snake`/`test:e2e` 스크립트는 재사용·수정하지 않는다.** 이번 작업 범위(`docs/plans/BF-1695/implementation-plan.md`, `snake-game/**`)를 벗어나는 파일은 만들거나 고치지 않는다.
- 이 문서에 열거된 파일·DOM id·class·상태·token·접근성·반응형 요구는 frozen blueprint(UI 계약)를 그대로 옮긴 것이며, 이 문서가 그 값을 재정의하지 않는다. 값이 충돌하면 frozen blueprint가 유일한 권위다.

## 2. 디렉터리 및 파일 구조 (exact)

```
snake-game/
├── index.html
├── styles.css
├── src/
│   ├── game.js       # 순수 게임 로직 (DOM 비의존)
│   └── app.js         # 렌더링 · 입력 · DOM 바인딩
├── tests/
│   └── game.test.js   # game.js 대상 결정적 단위 테스트
└── README.md           # 실행 방법 · 게임 개요
```

모든 파일은 신규 생성(additive)이며, 위 6개 경로 외 파일을 추가하지 않는다.

## 3. 모듈 경계

### 3.1 `src/game.js` — 게임 로직 (렌더링·입력과 완전 분리)

- DOM, `window`, `document`, `requestAnimationFrame` 등 브라우저 API에 의존하지 않는다. Node 환경에서 단독 `import`/실행이 가능해야 한다.
- 팩토리 함수 `createGame(options)`를 export 한다.
  - `options.rng`: `() => number` (0 이상 1 미만 실수를 반환하는 함수). **기본값은 `Math.random`**. 먹이 위치를 결정할 때만 사용한다.
  - `options.columns`, `options.rows`: 보드 격자 크기(정수, 기본값은 구현 시 developer가 정하되 문서에는 존재 자체만 요구).
- 반환 객체(또는 인스턴스)가 제공해야 하는 동작:
  - `setDirection(direction)`: `'up' | 'down' | 'left' | 'right'` 입력을 받는다. **현재 이동 방향의 정반대 방향 입력은 무시**하고 기존 방향을 유지한다(방향 반전 차단).
  - `tick()`: 한 스텝 진행 — 머리를 현재 방향으로 이동시키고, 벽 충돌 또는 자기 몸통 충돌 시 상태를 `game-over`로 전이한다. 먹이를 먹으면 점수를 올리고 몸 길이를 늘리며, `options.rng`로 다음 먹이 좌표를 새로 뽑는다(이미 뱀 몸이 있는 좌표는 제외).
  - `pause()` / `resume()`: 상태를 `paused` ↔ `playing`으로 전환한다(둘 다 `idle`/`game-over` 상태에서는 무시).
  - `reset()`: 상태를 `idle`로 되돌리고 뱀 위치·길이·점수·먹이를 초기값으로 재생성한다(재시작 후 진행 표시는 반드시 초기값으로 돌아가야 한다).
  - `getState()`: 현재 상태 스냅샷(`status`, `snake`, `food`, `score`, `direction` 등)을 반환한다. `status`는 `idle | playing | paused | game-over` 중 하나.
- RNG는 생성 시 1회 주입(옵션)되며 게임 로직 내부에서 `Math.random`을 직접 호출하지 않는다 — 모든 난수 소비는 주입된 `rng`를 통해서만 이뤄져야 결정적 테스트가 가능하다.

### 3.2 `src/app.js` — 렌더링 · 입력 · DOM 바인딩

- `game.js`의 `createGame`을 `import`해서 사용한다. 게임 로직을 직접 구현하지 않는다.
- 키보드 입력(방향키)을 `setDirection`으로 매핑한다.
- 진행 루프(`setInterval` 또는 `requestAnimationFrame` 기반 틱)로 `tick()`을 호출하고 결과를 캔버스·HUD·오버레이에 반영한다.
- `pause-button` 클릭 → `pause()`/`resume()` 토글, `restart-button` 클릭 → `reset()` 후 `playing` 전환.
- 상태 전환 시 `status-overlay`의 표시/숨김과 `overlay--*` class, 포커스 이동(§5 접근성)을 담당한다.
- `score-display`, `final-score`의 텍스트를 `getState().score`로 갱신한다.

### 3.3 `tests/game.test.js` — 테스트 전략

- `node --test`로 실행 가능한 순수 로직 테스트(`src/game.js`만 대상, DOM 불필요).
- 결정적 실행을 위해 **고정 시퀀스를 반환하는 fake rng**(예: 미리 정한 값 배열을 순서대로 반환하는 클로저)를 `createGame({ rng })`에 주입한다. `Math.random` 기본값에 의존하는 테스트를 작성하지 않는다.
- 최소 커버리지:
  1. 정상 이동: `tick()` 호출 시 머리가 현재 방향으로 한 칸 이동한다.
  2. 방향 반전 차단: 이동 방향이 `right`일 때 `setDirection('left')` 호출 후 `tick()`을 해도 방향은 `right`로 유지된다.
  3. 벽 충돌: 보드 경계를 벗어나는 이동 시 `status`가 `game-over`가 된다.
  4. 자기 충돌: 뱀이 자기 몸통과 겹치는 이동 시 `status`가 `game-over`가 된다.
  5. 먹이 섭취: 머리가 먹이 좌표에 도달하면 `score`가 증가하고 뱀 길이가 1 늘며, 주입된 rng의 다음 값으로 새 먹이 좌표가 결정된다(정확한 좌표를 assert).
  6. 재시작: `game-over` 상태에서 `reset()` 호출 시 `status`가 `idle`이 되고 점수·길이·먹이가 초기값으로 복원된다.
- 실행 명령: `node --test snake-game/tests/game.test.js` (focused). 기존 `npm test`/`package.json` 스크립트는 이번 작업에서 변경하지 않으므로 이 명령을 직접 사용한다.

## 4. UI 계약 (frozen — exact 값)

### 4.1 DOM id

`game-root`, `game-canvas`, `score-display`, `pause-button`, `restart-button`, `status-overlay`, `final-score`

### 4.2 CSS class

`game-container`, `hud`, `score-value`, `overlay`, `overlay--hidden`, `overlay--paused`, `overlay--game-over`, `btn`, `btn--primary`

### 4.3 상태 (exact 4종)

`idle` → `playing` → `paused`/`game-over`. `status-overlay`는 `idle`이 아닌 상태 전환 시 `overlay--hidden` 대신 해당 상태 class(`overlay--paused`, `overlay--game-over`)를 사용해 표시하고, `playing` 중에는 `overlay--hidden`을 유지한다.

### 4.4 디자인 토큰 (exact)

| 토큰 | 값 |
|---|---|
| `--color-bg` | `#0f172a` |
| `--color-board` | `#1e293b` |
| `--color-snake` | `#22c55e` |
| `--color-food` | `#ef4444` |
| `--color-text` | `#f8fafc` |
| `--color-overlay-bg` | `rgba(15,23,42,0.85)` |
| `--space-hud-gap` | `12px` |

### 4.5 접근성

- `pause-button`, `restart-button`은 명시적인 `aria-label`을 갖는다.
- `score-display`는 `aria-live="polite"`로 점수 변경을 스크린리더에 알린다.
- `status-overlay`는 `role="alertdialog"`이며, 표시될 때 `game-over`에서는 `restart-button`으로, `paused`에서는 `pause-button`으로 포커스를 이동한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름(예: overlay 내 텍스트, `aria-label`)으로 함께 노출한다.

### 4.6 반응형

- 너비 360px 이상에서 `game-canvas`는 컨테이너 폭에 비례해 축소되며 종횡비를 유지하고 overflow가 발생하지 않는다.
- 너비 600px 미만에서 `hud`는 세로로 쌓인다(flex-direction: column 등).

## 5. 상태 초기화/취소/실패 후 계약

- 초기화(`reset`)·일시정지 취소·game-over 이후에는 상태(`status`)와 진행 표시(점수, 뱀 길이, 오버레이)가 초기값으로 돌아가고, 주 실행 control(`pause-button`/`restart-button`, 방향키 입력)을 즉시 다시 사용할 수 있어야 한다.

## 6. 산출물 소유권 (frozen blueprint 그대로, 재정의 아님)

| 경로 | 소유자 |
|---|---|
| `snake-game/README.md` | canonical work packet owner |
| `snake-game/index.html` | developer |
| `snake-game/src/app.js` | developer |
| `snake-game/src/game.js` | developer |
| `snake-game/styles.css` | developer |
| `snake-game/tests/game.test.js` | developer |

모든 파일은 `additive` 정책이다(신규 생성, 기존 파일 대체 아님).
