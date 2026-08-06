# 벽돌깨기(Phaser 3) 구현 설계 및 UI 계약 — BF-1712 / BF-1727

> 본 문서는 planner가 동결한 **실행 설계 + UI 계약(frozen blueprint)** 을 designer/developer가
> 재정의 없이 병렬 구현하도록 렌더링한 것이다. 아래의 파일·소유자·selector·token·상태 계약은
> frozen blueprint가 유일한 권위이며 planner 문서는 이를 재정의하거나 새 파일/역할을 추가하지 않는다.

## 0. 목표(Objective)

`phaser-brick-blitz/` 신규 디렉터리에서 Phaser 3 기반 벽돌깨기를 구현한다. designer는 `design/`
아래 시각 mockup만, developer는 런타임/테스트 파일만 소유하도록 경로를 분리해 병렬 작업 시 충돌이
없게 한다. 게임 로직(상태 전이·충돌·점수)은 렌더링과 분리한 **순수 함수 모듈**로 설계하고, 무작위성은
주입 방식으로 규정한다.

## 1. 파일 구조 및 소유권(File Ownership) — 동결

| 파일 | 소유 역할 | 성격 | 정책 |
|---|---|---|---|
| `phaser-brick-blitz/README.md` | developer | 실행/사용법 문서 | additive |
| `phaser-brick-blitz/design/design-mockup.html` | designer | 시각 mockup | additive |
| `phaser-brick-blitz/design/design-tokens.html` | designer | 토큰 팔레트 mockup | additive |
| `phaser-brick-blitz/index.html` | developer | 런타임 진입 HTML | additive |
| `phaser-brick-blitz/src/game.js` | developer | Phaser 렌더/입력 어댑터 | additive |
| `phaser-brick-blitz/src/logic.js` | developer | 순수 로직 모듈 | additive |
| `phaser-brick-blitz/tests/logic.test.js` | developer | 로직 단위 테스트 | additive |

- **경로 분리 불변식**: designer는 `phaser-brick-blitz/design/` 아래 시각 mockup **만** 소유한다.
  런타임(`index.html`, `src/**`)과 테스트(`tests/**`), `README.md`는 developer가 소유한다. 두 소유
  경로는 겹치지 않는다.
- designer와 developer는 아래 selector/token을 **변경하거나 재정의하지 않는다**. 파일 소유권과 상태
  계약은 frozen blueprint가 유일한 권위이다.

## 2. UI 계약(UI Contract) — 동결

라우트(정적): `/phaser-brick-blitz/index.html`

### 2.1 DOM ID (exact)
- `game-root` — 게임 루트 컨테이너
- `game-canvas` — Phaser 캔버스 마운트 지점
- `hud-score` — 점수 표시
- `hud-lives` — 목숨 표시
- `overlay-start` — 시작(ready) 오버레이
- `overlay-pause` — 일시정지(paused) 오버레이
- `overlay-gameover` — 게임오버(gameover) 오버레이
- `overlay-clear` — 클리어(cleared) 오버레이

### 2.2 CSS class (exact)
- `game` — 루트 레이아웃
- `game__hud` — HUD 영역(점수·목숨)
- `game__overlay` — 오버레이 공통
- `game__button` — 상태 전이 버튼(시작/재개 등)
- `game__brick` — 벽돌 요소

### 2.3 상태(States) — exact
`ready`, `playing`, `paused`, `gameover`, `cleared`

- 각 상태는 해당 overlay(`overlay-start`/`overlay-pause`/`overlay-gameover`/`overlay-clear`)와 1:1로
  대응한다. `playing` 상태에서는 어떤 overlay도 표시되지 않는다.
- **초기화·취소·실패 후조건**: 초기화·취소·실패(gameover) 뒤에는 상태와 진행 표시(점수·목숨)를
  초기값으로 되돌리고 주 실행 control(시작 버튼)을 다시 사용할 수 있어야 한다.

### 2.4 디자인 토큰(Design Tokens) — exact 값 (CSS 변수)
```
--color-bg: #0f1424
--color-surface: #1b2138
--color-paddle: #4cc9f0
--color-ball: #f8f9fa
--color-brick-r1: #ef476f
--color-brick-r2: #ffd166
--color-brick-r3: #06d6a0
--color-text: #e9ecef
--space-hud-gap: 16px
--radius-brick: 4px
--font-size-hud: 20px
--font-size-title: 40px
```
- `--color-brick-r1/r2/r3`은 각각 벽돌 1/2/3행 색상이다.
- designer의 `design-tokens.html`은 이 값들을 **exact**하게 팔레트로 시각화하고, developer의
  런타임 CSS는 동일 이름·동일 값의 CSS 변수를 선언한다.

### 2.5 접근성(Accessibility)
- 일시정지 control은 `aria-label="일시정지"`를 가진다.
- 각 overlay(`overlay-*`)는 `role="dialog"`와 현재 화면 상태를 알리는 텍스트를 가진다.
- 키보드만으로 게임 시작(Space)·일시정지·재개·패들 좌우 이동(←/→)이 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 2.6 반응형(Responsive)
- 320px 이상 뷰포트에서 `game-root`에 가로 overflow가 발생하지 않는다.
- `game-canvas`는 컨테이너 폭에 맞춰 비율을 유지하며 축소된다.
- HUD(`hud-score`/`hud-lives`)의 점수·목숨 텍스트는 좁은 화면에서도 잘리지 않는다.

## 3. 게임 로직/렌더링 분리 설계

### 3.1 순수 로직 모듈 `src/logic.js` (developer 소유)
렌더링/DOM에 의존하지 않는 **순수 함수**로 상태·충돌·점수를 계산한다. 부작용과 무작위성은 밖에서 주입한다.

- **상태 전이(순수)**: `(state, event) -> nextState`
  - `ready --Space--> playing`
  - `playing --Pause--> paused`
  - `paused --Resume/Space--> playing`
  - `playing --(lives==0)--> gameover`
  - `playing --(bricks==0)--> cleared`
  - `gameover|cleared --Reset--> ready` (진행 표시 초기값 복귀)
- **충돌(순수)**: 공-벽/패들/벽돌 AABB 충돌 판정과 반사 벡터 계산을 좌표·속도 입력만으로 반환한다.
- **점수(순수)**: 파괴된 벽돌 행(r1/r2/r3)별 가중치로 점수를 누적 계산해 반환한다.
- **무작위 주입 규정**: 로직은 전역 `Math.random()`을 직접 호출하지 않는다. 초기 공 방향/벽돌 배치
  등 무작위 요소는 **주입된 RNG 함수**(`rng: () => number`, 기본은 `Math.random`)를 파라미터로
  받아 결정론적 테스트가 가능하도록 한다. 테스트는 고정 시드 RNG를 주입한다.

### 3.2 렌더/입력 어댑터 `src/game.js` (developer 소유)
Phaser 3 Scene에서 입력 이벤트를 로직 모듈에 전달하고, 로직이 반환한 상태/좌표/점수로 화면과
DOM(HUD·overlay·상태 클래스)을 갱신한다. 로직 계산은 이 파일에 두지 않는다.

### 3.3 진입 HTML `index.html` (developer 소유)
`game-root` > (`game-canvas`, `game__hud`(`hud-score`,`hud-lives`), `overlay-*`) 구조와 CSS 변수
토큰을 선언한다. Phaser CDN/모듈을 로드하고 `src/game.js`를 ESM으로 부트스트랩한다.

## 4. 테스트 계약

- `tests/logic.test.js` (developer 소유): `src/logic.js`의 상태 전이·충돌·점수를 주입 RNG로 결정론적
  단위 테스트한다. 실행은 `npm test`(package test) 기준, 범위는 focused.
- 접근성·반응형은 mockup/런타임 산출물에 대한 수동/시각 검증으로 tester가 확인한다.

## 5. 역할별 handoff

- **designer(BF-1721)**: `design/design-mockup.html`, `design/design-tokens.html`만 작성. §2의
  selector·상태·토큰·접근성·반응형을 exact하게 시각화한다. selector/token을 새로 만들지 않는다.
- **developer(BF-1724)**: `README.md`, `index.html`, `src/game.js`, `src/logic.js`,
  `tests/logic.test.js`를 작성. §2 계약을 그대로 구현하고 §3 분리 설계를 따른다.
- **reviewer**: design·develop 완료 후 selector/token/상태 계약 준수와 로직 분리를 검토한다.
- **tester**: review 이후 로직 단위 테스트 결과와 접근성·반응형 후조건을 검증한다.

## 6. Edge / 실패 케이스

- 마지막 목숨 소진 → `gameover` overlay 표시, 점수·목숨 초기값 복귀 후 시작 버튼 재사용 가능.
- 모든 벽돌 파괴 → `cleared` overlay 표시.
- `paused` 중 재개(Space) → 직전 좌표/속도로 `playing` 복귀(진행 손실 없음).
- 320px 뷰포트에서 HUD 텍스트 오버플로/절단 금지, 캔버스 비율 유지 축소.
- 주입 RNG 미제공 시 기본 `Math.random`으로 동작하되, 테스트는 반드시 고정 RNG 주입.
