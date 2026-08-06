# Star Collector 구현 설계 및 UI 계약 (BF-1713)

- **작성 role**: planner (BF-1734)
- **objective**: PM 분해를 designer·developer가 그대로 따를 수 있는 실행 설계와 동결된 UI 계약으로 구체화한다.
- **실행 모델**: backend 저장소 = vanilla-static (npm / ESM / serve_root=`.` / root-relative-static)
- **권위 원칙**: 파일 소유권·상태·후조건의 유일한 권위는 frozen Execution Blueprint이다. 본 문서는 그 계약을 **렌더링**만 하며 새 파일·역할·요구사항을 추가하거나 재정의하지 않는다.

---

## 1. 사용자 시나리오

플레이어는 브라우저에서 정적 페이지를 열어 Star Collector 게임을 실행한다.

- 페이지 진입 시 **start** 상태의 오버레이가 표시되고 시작 안내와 조작법이 화면 텍스트로 노출된다.
- 플레이어가 게임을 시작하면 **playing** 상태로 전환되어 캐릭터를 좌우로 움직이고 스페이스로 점프해 별(star)을 모으고 위험(hazard)을 피한다.
- 별을 모으면 HUD 점수가 증가하고 스크린리더에 점수 변경이 안내된다.
- 플레이어가 일시정지하면 **paused** 상태 오버레이가 표시되며 진행이 멈춘다.
- 위험에 부딪히면 **gameover** 상태로 전환되어 최종 점수와 재시작 안내가 표시되고, Enter 또는 재시작 버튼으로 초기 상태(start)로 되돌아간다.

---

## 2. Acceptance Criteria (Given/When/Then)

### AC-1: 초기 진입 (start)
- **Given** 플레이어가 게임 페이지를 처음 연다
- **When** 페이지 로드가 완료되면
- **Then** `#game-overlay`가 `.overlay--start`로 표시되고, `#overlay-title`에 시작 상태명이 화면 텍스트로 노출되며, HUD 점수(`#hud-score`)는 초기값 0을 표시한다.

### AC-2: 게임 진행과 점수 (playing)
- **Given** start 상태에서 플레이어가 게임을 시작한다
- **When** 별과 충돌하면
- **Then** 상태가 **playing**으로 전환되고 점수가 별 획득 규칙에 따라 증가하며, `#hud-score`(`aria-live="polite"`)를 통해 변경이 스크린리더에 안내된다.

### AC-3: 일시정지 (paused)
- **Given** playing 상태에서 플레이어가 일시정지를 요청한다
- **When** 일시정지가 적용되면
- **Then** `#game-overlay`가 `.overlay--paused`로 표시되고 게임 진행이 멈추며, 상태명이 화면 텍스트와 접근성 이름으로 노출된다. 재개 시 진행이 이어진다.

### AC-4: 게임 오버와 재시작 (gameover → start)
- **Given** playing 상태에서 플레이어가 위험(hazard)과 충돌한다
- **When** 충돌이 판정되면
- **Then** 상태가 **gameover**로 전환되고 `.overlay--gameover`가 최종 점수와 재시작 안내를 표시한다.
- **And** 플레이어가 `#restart-button`(`aria-label="게임 다시 시작"`)을 누르거나 Enter를 입력하면 상태·점수·진행 표시가 초기값으로 되돌아가고 start 상태에서 다시 플레이할 수 있다.

### AC-5: 키보드 전용 플레이
- **Given** 마우스를 쓰지 않는 플레이어
- **When** 방향키(이동)·스페이스(점프)·Enter(재시작)만 사용한다
- **Then** 전체 플레이 흐름을 키보드만으로 완주할 수 있다.

### AC-6: 반응형
- **Given** 320px 이상 폭의 뷰포트
- **When** 페이지를 표시하면
- **Then** 게임 캔버스와 HUD가 가로 overflow 없이 표시되고, 캔버스는 4:3 종횡비를 유지하며 컨테이너 폭에 맞춰 축소된다.

---

## 3. 동결된 UI 계약 (frozen — designer·developer는 selector·token을 변경/재정의 금지)

### 3.1 파일 구조와 소유자
| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/BF-1713/design-mockup.html` | designer | additive |
| `docs/design/BF-1713/design-tokens.html` | designer | additive |
| `phaser-star-collector/README.md` | canonical work packet owner | additive |
| `phaser-star-collector/index.html` | developer | additive |
| `phaser-star-collector/src/game.js` | developer | additive |
| `phaser-star-collector/src/logic.js` | developer | additive |
| `phaser-star-collector/tests/logic.test.js` | developer | additive |

> 위 목록 외 새 파일 추가·역할 재배정 금지. 소유권·상태 계약의 권위는 frozen blueprint이다.

### 3.2 DOM ID (exact)
- `game-root` — 게임 전체 컨테이너
- `game-canvas` — Phaser 캔버스 마운트 대상
- `hud-score` — 점수 표시 (`aria-live="polite"`)
- `game-overlay` — 상태 오버레이 (`role="status"`)
- `overlay-title` — 상태명 텍스트
- `restart-button` — 재시작 버튼 (`aria-label="게임 다시 시작"`)

### 3.3 CSS class (exact)
- `hud`, `hud__score`
- `overlay`, `overlay--start`, `overlay--paused`, `overlay--gameover`
- `button`, `button--primary`

### 3.4 게임 상태 (exact)
`start` · `playing` · `paused` · `gameover`

상태 전이 요약:
- `start → playing` (게임 시작)
- `playing → paused` (일시정지) / `paused → playing` (재개)
- `playing → gameover` (위험 충돌)
- `gameover → start` (재시작: 상태·점수·진행 표시 초기화)

> 후조건: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(시작/재시작)을 다시 사용할 수 있어야 한다.

### 3.5 디자인 토큰 (CSS 변수 — 값 포함, exact)
```
--color-bg: #0f172a;
--color-player: #38bdf8;
--color-star: #fbbf24;
--color-hazard: #ef4444;
--color-hud-text: #f8fafc;
--font-hud-size: 20px;
--font-title-size: 40px;
--space-hud-gap: 12px;
--radius-panel: 12px;
```

### 3.6 접근성 계약
- `#hud-score`는 `aria-live="polite"`로 점수 변경을 스크린리더에 알린다.
- `#restart-button`은 `aria-label="게임 다시 시작"`을 가진다.
- `#game-overlay`는 `role="status"`로 현재 게임 상태 텍스트를 전달한다.
- 방향키·스페이스(점프)·Enter(재시작)만으로 전체 플레이가 키보드로 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.7 반응형 계약
- 320px 이상 뷰포트에서 게임 캔버스와 HUD가 가로 overflow 없이 표시된다.
- 게임 캔버스는 지정된 4:3 종횡비를 유지하며 컨테이너 폭에 맞춰 축소된다.

---

## 4. 아키텍처 — 로직/렌더링 분리

게임 로직(상태 전이·충돌·점수)은 렌더링과 분리한 **순수 함수 모듈**로 둔다.

- `phaser-star-collector/src/logic.js`
  - 순수 함수만 export한다. DOM·Phaser·전역 상태에 의존하지 않는다.
  - 상태 전이(`start/playing/paused/gameover`), 충돌 판정, 점수 계산을 담당한다.
  - **무작위 요소는 주입 가능**하게 설계한다 — 별/위험 배치 등 randomness는 함수 파라미터(예: 주입된 RNG 함수 또는 seed)로 전달받아 테스트에서 결정적으로 재현할 수 있어야 한다.
- `phaser-star-collector/src/game.js`
  - Phaser Scene/렌더링·입력 바인딩·DOM(HUD/overlay) 갱신을 담당한다.
  - `logic.js`의 순수 함수를 호출해 상태를 계산하고, 결과를 화면·selector에 반영한다.
- `phaser-star-collector/tests/logic.test.js`
  - `logic.js`의 순수 함수를 단위 테스트한다. 주입된 RNG로 충돌·점수·상태 전이를 결정적으로 검증한다.

---

## 5. 실행 모델 (vanilla-static — 빌드 도구 변경 없음)

- backend 저장소는 vanilla-static이며 serve_root은 `.`, route는 root-relative-static이다.
- **Phaser는 CDN `<script>`로 로드**한다 (`phaser-star-collector/index.html`에서 `<script src="…phaser…">`).
- 런타임 구성은 `.js`(ESM 모듈)와 `.html`로만 이루어진다.
- **번들러·트랜스파일러 등 빌드 도구를 추가하거나 변경하지 않는다.** `package.json`의 빌드 파이프라인 변경 없음.
- 테스트는 focused 범위이며 `logic.js` 순수 함수 단위 테스트(`logic.test.js`)에 한정한다. 다른 module 회귀는 이번 작업에서 실행하지 않는다.

---

## 6. Edge case · 실패 케이스

- **재시작 후 잔여 상태**: gameover → start 재시작 시 점수·타이머·엔티티가 초기값으로 완전 초기화되어야 한다. 잔여 점수/엔티티가 남으면 안 된다.
- **paused 중 입력**: paused 상태에서는 이동/점프 입력이 게임 진행에 영향을 주지 않아야 한다. 재개 시에만 진행이 이어진다.
- **동시 충돌**: 같은 프레임에 star와 hazard가 동시에 판정될 때의 우선순위를 `logic.js`에서 결정적으로 정의한다(테스트로 고정).
- **점수 경계**: 점수는 음수가 되지 않으며 초기값은 0이다.
- **키보드 포커스**: gameover 시 `#restart-button`이 키보드로 도달·활성화 가능해야 한다(Enter 대체 경로 포함).
- **좁은 뷰포트(320px)**: 캔버스가 4:3을 유지하며 축소되어도 HUD가 겹치거나 가로 overflow가 발생하지 않아야 한다.
- **CDN 로드 실패**: Phaser CDN 로드 실패 시 화면이 빈 상태로 방치되지 않도록 developer는 최소한의 상태 텍스트가 유지되게 처리한다(overlay 초기 상태 텍스트).

---

## 7. Handoff — 후속 role 가이드

- **designer (BF-1732)**: §3의 selector·token·상태·접근성·반응형 계약을 그대로 `docs/design/BF-1713/design-mockup.html`·`design-tokens.html`에 반영한다. token 값·selector를 변경/재정의하지 않는다(additive).
- **developer (BF-1733)**: §3 계약과 §4 로직/렌더링 분리, §5 실행 모델을 따라 `phaser-star-collector/` 런타임과 `logic.test.js`를 구현한다. Phaser는 CDN `<script>`, 런타임은 `.js`/`.html`만, 빌드 도구 변경 없음.
- **공통 불변식**: designer·developer는 selector와 token을 변경하거나 재정의하지 않는다. 파일 소유권·상태 계약의 권위는 frozen blueprint이다.
