# Beat Tap 구현 설계 및 UI 계약 (BF-1739 / planner: BF-1759)

> 본 문서는 designer(BF-1756)와 developer(BF-1757)가 그대로 따라야 할 **동결된 실행 설계 + exact UI 계약**입니다.
> 파일 소유권·상태 계약의 유일한 권위는 frozen Execution Blueprint입니다. 본 문서는 이를 **재정의하지 않고 그대로 렌더링**합니다.
> designer/developer는 여기 정의된 selector와 token을 **변경·재정의하지 않습니다**. 모든 산출 파일 정책은 `additive`입니다.

---

## 1. 개요 · 사용자 시나리오

Beat Tap은 4개 레인(D·F·J·K)으로 낙하하는 노트를 판정선(judgment-line)에 맞춰 눌러 점수를 얻는 순수 DOM 리듬 게임입니다. 외부 라이브러리 없이 vanilla ESM으로 구현합니다.

- 플레이어는 시작 화면에서 게임을 시작하고, 낙하 노트를 D/F/J/K 키(또는 레인 탭)로 판정합니다.
- 판정선과의 거리로 Perfect/Good/Miss가 결정되며, 연속 성공은 콤보로 누적됩니다.
- 일시정지·재개가 가능하고, 패턴이 끝나면 결과 화면에서 최종 점수·정확도를 확인하고 재시작합니다.

핵심 사용자 흐름:
1. `start` 화면 → `start-button` 클릭 → `playing` 진입
2. `playing` 중 노트를 키/탭으로 판정, HUD(점수/콤보/정확도)와 `judgment-feedback` 실시간 갱신
3. `pause-button` → `paused`, `resume-button` → `playing` 복귀
4. 패턴 종료 → `gameover`(`result-panel`) → `result-restart-button` → 초기값으로 되돌아가 `start` 재진입

---

## 2. 모듈 경계 (순수 로직 vs 렌더/입력)

게임 로직은 렌더링과 **분리한 순수 함수**로 작성하고, 무작위 요소는 **주입 가능**하게 설계합니다.

| 파일 | 책임 | 부수효과 |
|---|---|---|
| `dom-rhythm-tap/src/engine.js` | 순수 게임 로직: 상태 전이, 노트 진행, 판정 계산, 콤보/정확도 산식, 패턴 생성 | 없음(DOM/타이머/전역 접근 금지) |
| `dom-rhythm-tap/src/main.js` | 렌더링·입력·타이머 루프: engine 결과를 DOM에 반영, 키/포인터 이벤트 → engine 호출 | DOM, `requestAnimationFrame`, 이벤트 |

**불변식**
- `engine.js`는 DOM·타이머·`Math.random`·전역 상태에 접근하지 않는다. 모든 입력은 인자로 받고 결과는 반환값으로 준다.
- 무작위 요소(패턴 생성 등)는 `rng: () => number` 형태로 **주입**한다. 기본은 `main.js`가 `Math.random`을 주입하고, 테스트는 시드 고정 RNG를 주입한다.
- 시간은 `now`(ms)를 인자로 주입한다. engine은 시계에 직접 접근하지 않는다.

### 2.1 engine.js 공개 함수(계약)

순수 함수 시그니처(구현 세부는 developer 재량이나 아래 계약은 동결):

- `createInitialState()` → 초기 상태 객체(`status: 'start'`, score 0, combo 0, judged 0, hits 0)
- `generatePattern(rng)` → 노트 패턴 배열(§4). `rng`는 `() => number`(0~1) 주입.
- `judge(note, hitTime, config)` → `'perfect' | 'good' | 'miss'`. 판정선 거리 기반(§5).
- `applyJudgment(state, result)` → 새 상태(불변 갱신): score/combo/accuracy 반영(§6).
- `advance(state, now)` → 경과 시간 기준으로 지나친(놓친) 노트 miss 처리 및 종료 판정.
- `transition(state, action)` → 상태 전이(`start`/`pause`/`resume`/`restart`/`finish`).

모든 함수는 입력 상태를 **변형하지 않고** 새 상태를 반환한다(불변 갱신).

---

## 3. exact UI 계약 (동결)

frozen `ui-contract@v1`을 그대로 렌더링합니다. designer/developer는 아래 값을 **변경 금지**합니다.

### 3.1 파일 목록 및 소유자

| 파일 | 소유자 | 정책 |
|---|---|---|
| `dom-rhythm-tap/README.md` | canonical work packet owner | additive |
| `dom-rhythm-tap/design/design-mockup.html` | developer | additive |
| `dom-rhythm-tap/design/design-tokens.html` | developer | additive |
| `dom-rhythm-tap/index.html` | developer | additive |
| `dom-rhythm-tap/src/engine.js` | developer | additive |
| `dom-rhythm-tap/src/main.js` | developer | additive |
| `dom-rhythm-tap/tests/engine.test.js` | developer | additive |

> 주의: 파일 소유권과 상태 계약은 frozen blueprint가 유일 권위이며 본 문서는 재정의하지 않는다. 새 파일·새 역할을 추가하지 않는다.

### 3.2 DOM ID (exact)

`game-root`, `start-screen`, `start-button`, `lane-container`, `judgment-line`, `hud-score`, `hud-combo`, `hud-accuracy`, `judgment-feedback`, `pause-button`, `pause-screen`, `resume-button`, `result-panel`, `result-restart-button`

### 3.3 CSS class (exact)

`game`, `game__lane`, `game__note`, `note--perfect`, `note--good`, `note--miss`, `hud`, `hud__value`, `screen`, `screen--start`, `screen--pause`, `screen--gameover`, `combo-counter`

### 3.4 화면 상태 (exact)

`start`, `playing`, `paused`, `gameover`

- 각 상태는 색상 외에 **화면 텍스트 라벨**을 포함한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름**으로 노출한다.
- 초기화·취소·실패(restart/finish) 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(`start-button`)을 다시 사용할 수 있어야 한다.

### 3.5 디자인 토큰 (exact 값)

| 토큰 | 값 |
|---|---|
| `--color-bg` | `#0f1020` |
| `--color-lane` | `#1b1d3a` |
| `--color-note` | `#38bdf8` |
| `--color-judge-perfect` | `#22c55e` |
| `--color-judge-good` | `#eab308` |
| `--color-judge-miss` | `#ef4444` |
| `--color-text-primary` | `#f8fafc` |
| `--space-lane-gap` | `8px` |
| `--radius-note` | `6px` |
| `--shadow-note` | `0 2px 6px rgba(0,0,0,0.4)` |
| `--font-size-hud` | `20px` |

### 3.6 접근성 (exact)

- `start-button`, `pause-button`, `resume-button`, `result-restart-button`는 명시적 `aria-label`을 가진다.
- D·F·J·K 키로 4개 레인을 조작하며, 각 레인은 **키 라벨을 화면 텍스트로 표시**한다.
- `judgment-feedback`와 `combo-counter`는 `aria-live="polite"`로 판정/콤보 변화를 안내한다.
- 각 화면 상태(start/playing/paused/gameover)는 색상 외 **화면 텍스트 라벨**을 포함한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.7 반응형 (exact)

- **320px 이상에서 4개 레인과 HUD에 가로 overflow가 발생하지 않는다.**
- 레인 폭과 노트 크기는 뷰포트에 맞춰 축소되고, **판정선 위치는 유지**된다.

### 3.8 산출물 경로

- planner 산출물(본 문서): `docs/plans/BF-1739/implementation-plan.md`
- 구현 산출물: 위 §3.1 파일 목록(`dom-rhythm-tap/` 하위)

---

## 4. 노트 패턴 데이터 구조 (시간축 배열)

노트 패턴은 **시간축 배열**로 정의합니다. 각 노트는 다음 형태의 객체입니다.

```
Note = {
  id: number,        // 고유 식별자
  lane: 0 | 1 | 2 | 3,   // 0=D, 1=F, 2=J, 3=K
  time: number,      // 판정선에 도달해야 하는 목표 시각(ms, 게임 시작 기준)
  status: 'pending' | 'perfect' | 'good' | 'miss'  // 판정 결과
}

Pattern = Note[]   // time 오름차순 정렬
```

- 레인 인덱스 → 키 매핑: `0→D`, `1→F`, `2→J`, `3→K`.
- `generatePattern(rng)`는 주입된 `rng`로 레인/간격을 결정하여 결정론적으로 재현 가능한 배열을 만든다(테스트에서 시드 RNG로 검증).
- 노트의 화면상 위치는 `main.js`가 `(현재시각 - (time - fallDuration)) / fallDuration` 비율로 계산해 렌더한다(engine은 위치 계산에 관여하지 않음).

---

## 5. 판정 규칙 (판정선 거리 기반)

노트의 목표 시각 `time`과 실제 입력 시각 `hitTime`의 **절대 시간차 `d = |hitTime - time|`**(ms)로 판정합니다. 시간차는 판정선까지의 거리에 비례합니다.

| 판정 | 조건 | class |
|---|---|---|
| Perfect | `d <= PERFECT_WINDOW` | `note--perfect` |
| Good | `PERFECT_WINDOW < d <= GOOD_WINDOW` | `note--good` |
| Miss | `d > GOOD_WINDOW` 또는 판정선을 지나쳐 입력 없음 | `note--miss` |

- 권장 기본값(config): `PERFECT_WINDOW = 50ms`, `GOOD_WINDOW = 120ms`, `fallDuration = 1600ms`. 값은 `config` 인자로 주입해 조정·테스트 가능하게 한다.
- 판정선을 `GOOD_WINDOW` 넘게 지나친 노트는 `advance(state, now)`에서 자동 `miss` 처리한다.
- 판정 경계는 폐구간/개구간을 위 표대로 고정한다(`<=`가 상위 등급 우선).

---

## 6. 콤보 · 정확도 산식

- **점수(score)**: Perfect `+300`, Good `+100`, Miss `+0`. (권장 기본값, config 주입 가능)
- **콤보(combo)**: Perfect/Good 시 `+1` 누적, Miss 시 `0`으로 초기화. `combo-counter`에 표시하고 `aria-live`로 안내.
- **정확도(accuracy)**: `hits / judged`. 여기서 `judged`는 판정된 노트 수(Perfect+Good+Miss), `hits`는 성공(Perfect+Good) 수. `judged === 0`이면 `100%`로 표기(0 나눗셈 방지). `hud-accuracy`에 백분율로 표시.
- 모든 산식은 `applyJudgment(state, result)`에서 불변 갱신으로 계산한다.

---

## 7. 상태 전이

```
start --(start)--> playing
playing --(pause)--> paused
paused --(resume)--> playing
playing --(finish: 패턴 종료)--> gameover
gameover --(restart)--> start   // 진행 표시·상태를 초기값으로 리셋
paused --(restart)--> start      // 취소 경로: 초기값 복귀
```

- `restart`/`finish` 후에는 score/combo/accuracy/노트 진행이 초기값으로 리셋되고 `start-button`이 다시 활성화된다.
- 각 상태 진입 시 `screen--start` / `screen--pause` / `screen--gameover` 및 상태 텍스트 라벨을 함께 노출한다(`playing`은 게임 보드 표시).

---

## 8. 테스트 전략

- **레벨**: unit(순수 로직). `engine.js`의 순수 함수를 `dom-rhythm-tap/tests/engine.test.js`에서 검증. 실행 범위는 focused.
- **주입 RNG**: 시드 고정 RNG(`() => 고정 시퀀스`)를 주입해 `generatePattern`의 결정론을 검증한다.
- **주입 시각**: `judge`/`advance`에 명시적 `now`/`hitTime`을 주입해 시계 의존 없이 판정 경계를 검증한다.
- **검증 항목(필수)**:
  1. `judge`: Perfect/Good/Miss 경계값(`d = PERFECT_WINDOW`, `= GOOD_WINDOW`, 초과)에서 정확한 등급.
  2. `applyJudgment`: 점수 가산, 콤보 누적/Miss 초기화, 정확도 계산(`judged===0` → 100%).
  3. `advance`: 판정선을 지나친 노트의 자동 miss 처리.
  4. `transition`: 각 상태 전이와 `restart`/`finish` 후 초기값 리셋.
  5. `generatePattern`: 동일 시드 RNG → 동일 패턴(결정론), `time` 오름차순 및 lane 범위(0~3).
- **명령**: `npm test`(package test는 표시용). focused 범위이므로 신규/수정 테스트와 owned 모듈 관련 테스트만 실행한다.
- **접근성/반응형**은 designer가 mockup/tokens에서, developer가 `index.html`에서 구현하며 본 계약(§3.6, §3.7)을 기준으로 검증한다.

---

## 9. 역할별 handoff 후조건

- **designer(BF-1756)**: `design-mockup.html`, `design-tokens.html`를 §3.5 토큰과 §3.2/§3.3 selector로 구현. selector·token 변경 금지, additive.
- **developer(BF-1757)**: `index.html`, `src/engine.js`, `src/main.js`, `tests/engine.test.js`, `README.md`를 §2 모듈 경계·§4 데이터 구조·§5 판정·§6 산식·§8 테스트대로 구현. 승인된 실행 설계를 따르며 selector/token 재정의 금지.
- **reviewer / tester**: 본 계약의 exact selector/token/상태/접근성/반응형 준수 및 unit 테스트 통과를 검증.
