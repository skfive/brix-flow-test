# BF-1700 · pixi-breakout 구현 설계 (BF-1703 planner 산출물)

> 본 문서는 frozen Execution Blueprint(BF-1700)의 실행 계약을 그대로 서술합니다. 여기 명시된 파일·소유자·상태·경계 외에 새 파일이나 역할을 추가하지 않습니다.

## 1. 목표

PixiJS 기반 벽돌깨기(breakout) 게임을 구현하기 위해, designer(BF-1701)와 developer(BF-1702)가 같은 wave에서 병렬로 작업할 수 있도록 디렉터리 구조·모듈 경계·UI 계약·테스트 전략을 확정한다.

## 2. 디렉터리 구조 (exact)

```
pixi-breakout/
├── README.md              # 프로젝트 개요/실행 방법
├── docs/
│   └── design.md          # UI/비주얼/접근성 시각 명세
├── index.html              # 엔트리 마크업 + design token CSS 변수 + ESM 스크립트 로딩
├── src/
│   ├── game-logic.js       # 순수 게임 로직 (PixiJS/DOM 비의존)
│   └── renderer.js         # PixiJS 렌더링 + HUD/overlay DOM 동기화
└── tests/
    └── game-logic.test.js  # game-logic.js 단위 테스트
```

frozen blueprint 상 파일은 위 6개가 전부이며, 그 외 신규 파일(예: 별도 상태관리 모듈, 빌드 설정, css 파일 분리 등)은 이번 wave 범위에 포함하지 않는다.

## 3. 파일 소유자 · 상태 (frozen blueprint 그대로)

| 파일 | 소유자 | 정책 |
|---|---|---|
| `pixi-breakout/README.md` | canonical work packet owner | additive |
| `pixi-breakout/docs/design.md` | canonical work packet owner | additive |
| `pixi-breakout/index.html` | developer | additive |
| `pixi-breakout/src/game-logic.js` | developer | additive |
| `pixi-breakout/src/renderer.js` | developer | additive |
| `pixi-breakout/tests/game-logic.test.js` | developer | additive |
| `docs/plans/BF-1700/implementation-plan.md` | planner (본 문서) | 본 task(BF-1703) 산출물 |

"canonical work packet owner"는 frozen blueprint가 지정한 표기를 그대로 옮긴 것이며, 본 문서가 소유자를 새로 지정하거나 재해석하지 않는다. 파일 소유권/상태 계약의 유일한 권위는 frozen blueprint이다.

## 4. 모듈 경계 — 순수 로직 vs 렌더링

### 4.1 `src/game-logic.js` (순수 로직 계층)

- PixiJS(`import * as PIXI ...`)나 DOM API(`document`, `window`, canvas 등)를 **import하지 않는다**.
- 입력은 이전 state(POJO)와 입력 이벤트/델타 시간이며, 출력은 새 state(POJO)다. 부수효과가 없고 결정론적이다.
- 담당 범위:
  - 공-패들-벽-벽돌 충돌 판정 및 반사 벡터 계산
  - 벽돌 tier별 내구도 소모, 파괴 시 점수 가산
  - lives 차감, best-score 갱신
  - 상태 전이: `start → playing → paused ⇄ playing → game-over | clear`
  - `restart` 호출 시 score/lives/상태를 초기값으로 재설정
- 정확한 함수명은 developer 재량이나, "PixiJS/DOM 비의존"과 "state는 순수 POJO"라는 경계는 고정 계약이다.
- `renderer.js`를 import하지 않는다(단방향 의존: renderer → game-logic).

### 4.2 `src/renderer.js` (렌더링 계층)

- PixiJS 및 DOM 접근을 전담하는 출력 계층. `game-logic.js`가 생성한 state를 입력받아 canvas(PixiJS Application)에 그리고, HUD/overlay DOM을 동기화한다.
- 담당 범위:
  - 벽돌 tier별 색상 + spot 패턴(접근성) 렌더링
  - 공/패들/벽 렌더링
  - `#score-value`, `#lives-value`, `#best-score-value` 텍스트 갱신
  - `#game-overlay`의 `overlay--*` 상태 클래스 전환

### 4.3 `index.html`

- `#game-root` 컨테이너 안에 canvas 마운트 지점, `#game-hud`, `#game-overlay` 마크업을 포함한다.
- design token을 CSS custom property로 정의한다.
- `type="module"` 스크립트로 `src/renderer.js`를 엔트리로 로드한다(`renderer.js`가 내부에서 `game-logic.js`를 import).

## 5. UI 계약 (frozen — selector/token 재정의 금지)

### 5.1 DOM ID

`game-root`, `game-hud`, `game-overlay`, `score-value`, `lives-value`, `best-score-value`, `pause-button`, `restart-button`

### 5.2 CSS class

`hud`, `hud__score`, `hud__lives`, `overlay`, `overlay--start`, `overlay--paused`, `overlay--gameover`, `overlay--clear`

### 5.3 상태

`start`, `playing`, `paused`, `game-over`, `clear`

### 5.4 Design token

```
--color-bg=#0b1021
--color-brick-tier1=#38bdf8
--color-brick-tier2=#818cf8
--color-brick-tier3=#f472b6
--color-ball=#facc15
--color-paddle=#e2e8f0
--color-text-primary=#f8fafc
--color-text-secondary=#94a3b8
--font-family-ui=-apple-system, 'Segoe UI', Roboto, sans-serif
```

### 5.5 접근성

- 벽돌 내구도는 색상뿐 아니라 표면 스팟 패턴(spot count)으로도 구분한다.
- `pause-button`과 `restart-button`은 명시적 `aria-label`을 가진다.
- 패들은 좌우 방향키만으로 전체 플레이가 가능하며 focus 시 시각적 outline을 제공한다.
- UI 텍스트의 색상 대비는 WCAG AA(4.5:1) 이상을 만족한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.6 반응형

- 360px 이상 뷰포트에서 `game-root`와 `game-hud`가 겹치지 않고 overflow 없이 표시된다.
- 게임 보드는 원본 종횡비를 유지하며 뷰포트 폭에 맞춰 스케일된다.

### 5.7 후조건 (초기화·취소·실패)

- `restart` 또는 초기화/취소/실패 이후에는 상태와 진행 표시(score/lives/overlay)가 초기값으로 돌아가고, `pause-button`/`restart-button` 등 주 실행 control을 다시 사용할 수 있어야 한다.

## 6. 핵심 시나리오 (Given/When/Then)

- Given `game-root`가 마운트되고 상태가 `start`일 때, When 플레이어가 게임을 시작하면, Then 상태가 `playing`으로 전이되고 `overlay--start`가 해제된다.
- Given 상태가 `playing`일 때, When 공이 벽돌에 충돌하면, Then 해당 벽돌의 내구도가 감소하고 파괴 시 점수가 가산되며, 모든 벽돌이 파괴되면 상태가 `clear`로 전이된다.
- Given 상태가 `playing`일 때, When 공을 놓치면, Then `lives`가 차감되고 `lives`가 0이 되면 상태가 `game-over`로 전이된다.
- Given 상태가 `playing`일 때, When `pause-button`을 클릭하면, Then 상태가 `paused`로 전이되고 다시 클릭하면 `playing`으로 복귀한다(edge case: `paused` 동안 게임 로직은 진행되지 않는다).
- Given 상태가 `game-over` 또는 `clear`일 때, When `restart-button`을 클릭하면, Then score/lives/overlay가 초기값으로 재설정되고 상태가 `start` 또는 `playing`으로 전이되며 `pause-button`/`restart-button`이 다시 정상 동작한다(실패 케이스: restart 이후 이전 상태의 잔여 벽돌/점수가 남아있으면 안 된다).

## 7. 테스트 전략

- `tests/game-logic.test.js`는 `game-logic.js`만을 대상으로 하는 순수 단위 테스트다. `renderer.js`는 PixiJS/canvas에 의존하므로 이번 wave의 단위 테스트 범위에서 제외한다(별도 e2e/manual 검증은 review/test 단계에서 다루며, 이번 task에는 e2e skill이 할당되어 있지 않다).
- 커버리지 범위: 충돌/반사 계산, 벽돌 tier별 내구도 소모와 점수 가산, lives 차감 및 game-over 전이, clear 전이, pause/resume, restart 시 상태 초기화.
- 실행 명령: `npm test` (repo convention 상 `package_manager=npm`, `package_test_command=npm test`). 현재 `focused_test_authority`가 unavailable이므로, developer는 `package.json`의 `test` 스크립트 정의를 authoritative로 확인한 뒤 실제 러너(예: Node 내장 test runner)를 결정한다.
- UI 계약(DOM ID/class/상태/token/반응형)과 접근성 요구사항은 자동화된 e2e 없이 review/test 단계에서 수동 검증한다.

## 8. 산출물 경로 요약

- `docs/plans/BF-1700/implementation-plan.md` — 본 문서 (planner, BF-1703)
- `pixi-breakout/README.md` — designer 산출물 예정 (canonical work packet owner)
- `pixi-breakout/docs/design.md` — designer 산출물 예정 (canonical work packet owner)
- `pixi-breakout/index.html` — developer 산출물 예정
- `pixi-breakout/src/game-logic.js` — developer 산출물 예정
- `pixi-breakout/src/renderer.js` — developer 산출물 예정
- `pixi-breakout/tests/game-logic.test.js` — developer 산출물 예정
