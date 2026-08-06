# Memory Match 구현 설계 및 UI·로직 계약 (BF-1715 / planner BF-1726)

> 본 문서는 PM 분해를 designer(BF-1720)·developer(BF-1723)가 그대로 따를 수 있는 **frozen handoff 계약**으로 구체화한다.
> 여기 명시된 파일 소유권·상태·selector·token·로직 시그니처는 frozen Execution Blueprint를 렌더링한 것이며, planner 문서가 이를 재정의하거나 새 파일·역할을 추가하지 않는다.
> **designer·developer는 selector와 token을 변경·재정의하지 않는다.** 충돌이 있으면 frozen Blueprint가 유일한 권위다.

---

## 0. 산출물·소유권 계약 (frozen)

| 파일 | 소유자 | 상태 계약 |
| --- | --- | --- |
| `docs/design/BF-1715/design-mockup.html` | designer | additive |
| `docs/design/BF-1715/design-tokens.html` | designer | additive |
| `phaser-memory-match/README.md` | canonical work packet owner | additive |
| `phaser-memory-match/index.html` | developer | additive |
| `phaser-memory-match/src/game.js` | developer | additive |
| `phaser-memory-match/src/logic.js` | developer | additive |
| `phaser-memory-match/tests/logic.test.js` | developer | additive |

- **artifact policy = additive**: 위 파일은 신규 생성만 하며 기존 무관 코드/파일을 수정·삭제하지 않는다.
- 파일 소유권과 상태 계약은 frozen Blueprint가 유일 권위다. planner 문서는 재정의하지 않는다.
- 배치 위치: `serve_root = .`, route mapping = root-relative-static. 즉 `phaser-memory-match/index.html` 이 실행 진입점이다.

---

## 1. 사용자 시나리오 (Use Case)

**액터**: 단일 플레이어(브라우저 사용자)

**주 흐름**
1. 플레이어가 `phaser-memory-match/index.html` 을 연다 → 화면은 `start` 상태.
2. 시작 control 을 활성화하면 4×4(8쌍) 카드가 뒤집힌 상태로 배치되고 `playing` 상태로 전이한다.
3. 플레이어가 카드 하나를 뒤집는다(마우스 클릭 또는 키보드 활성화).
4. 두 번째 카드를 뒤집으면 이동(move) 수가 1 증가하고 일치 여부를 판정한다.
   - 일치: 두 카드는 뒤집힌 채 고정(matched)된다.
   - 불일치: 짧은 지연 후 두 카드가 다시 뒷면으로 돌아간다.
5. 8쌍을 모두 맞추면 `cleared` 상태로 전이하고 클리어 오버레이가 표시된다.

**대안/실패 흐름**
- 플레이어가 일시정지하면 `paused` 상태로 전이하고 타이머가 멈춘다. 재개하면 `playing` 으로 복귀한다.
- 플레이어가 다시 시작 control 을 활성화하면 상태·이동 수·타이머가 초기값으로 리셋되고 주 실행 control 을 다시 사용할 수 있다(초기화·취소·실패 후조건).
- 이미 matched 이거나 현재 턴에서 이미 뒤집힌 카드를 다시 선택하면 무시한다.

---

## 2. 화면 상태 계약 (start / playing / paused / cleared)

상태는 색상만으로 구분하지 않으며, **상태명을 화면 텍스트와 접근성 이름으로 노출**한다.

| 상태 | 진입 조건 | 화면 텍스트(정확 값) | 진행 표시(HUD) |
| --- | --- | --- | --- |
| `start` | 최초 로드 / 리셋 직후 | `"카드를 뒤집어 짝을 맞추세요"` + 시작 control 라벨 `"게임 시작"` | `#hud-moves` = `"이동: 0"`, `#hud-timer` = `"시간: 00:00"` |
| `playing` | 시작 control 활성화 | (오버레이 없음, 격자 표시) | 이동/타이머 실시간 갱신 |
| `paused` | 일시정지 control 활성화 | `"일시정지"` (색상 외 텍스트로 표기) | 타이머 정지, 마지막 값 유지 |
| `cleared` | 8쌍 모두 matched | `#clear-overlay` 내부 `"클리어! 총 {moves}회 이동, {mm:ss}"` | 최종 이동/시간 값 고정 |

- `{moves}` 는 최종 이동 수, `{mm:ss}` 는 `formatTime` 결과값이다.
- **초기화·취소·실패 후조건(invariant)**: 리셋 이후 상태 = `start`, 이동 = 0, 타이머 = `00:00`, `#restart-button` 을 포함한 주 실행 control 을 다시 사용할 수 있어야 한다.

### 상태 전이

```
start ──(시작)──▶ playing ──(일시정지)──▶ paused ──(재개)──▶ playing
                    │                                          │
                    └────────(8쌍 matched)────────▶ cleared    │
  start ◀──(다시 시작)── {playing | paused | cleared} ─────────┘
```

---

## 3. DOM selector 계약 (frozen — 변경 금지)

### DOM ID

| ID | 용도 |
| --- | --- |
| `game-root` | Phaser 캔버스/게임이 마운트되는 루트 컨테이너 |
| `hud-moves` | 이동 수 표시 영역 |
| `hud-timer` | 경과 시간 표시 영역 |
| `restart-button` | 다시 시작 control |
| `clear-overlay` | 클리어 화면 오버레이 |

### CSS class

| class | 용도 |
| --- | --- |
| `memory-match` | 최상위 wrapper |
| `hud` | HUD 컨테이너 |
| `hud__stat` | HUD 개별 지표(이동/시간) 항목 |
| `btn-restart` | 다시 시작 버튼 스타일 |
| `clear-screen` | 클리어 오버레이 화면 스타일 |

- designer 는 위 selector 를 mockup/token 문서에 그대로 사용하고, developer 는 `index.html`·`game.js` 에서 동일 selector 로 바인딩한다. **재명명·추가 selector 로 대체 금지.**

---

## 4. 디자인 토큰 계약 (frozen — 정확 값)

CSS custom property 로 선언한다.

| token | 값 |
| --- | --- |
| `--color-bg` | `#1a1a2e` |
| `--color-card-back` | `#16213e` |
| `--color-card-face` | `#e94560` |
| `--color-accent` | `#0f3460` |
| `--color-text` | `#f5f5f5` |
| `--space-card-gap` | `12px` |
| `--radius-card` | `8px` |
| `--font-size-hud` | `18px` |

- designer 는 `design-tokens.html` 에 위 값을 그대로 정의하고, developer 는 동일 변수를 참조한다. 값 변경·재정의 금지.

---

## 5. 접근성 계약

- `#restart-button` 은 명시적 `aria-label="게임 다시 시작"` 을 가진다.
- 카드 요소는 키보드로 **포커스·활성화** 가능하며(예: `tabindex`, `Enter`/`Space` 활성화), 뒤집힘·일치·클리어 등 상태 변화가 텍스트로 안내된다(예: `aria-live` 영역 또는 상태 텍스트 갱신).
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다(2절 화면 텍스트 참조).

---

## 6. 반응형 계약

- **≥ 320px (base)**: 4×4 격자와 HUD 가 content overflow 없이 배치된다. 카드 간격은 `--space-card-gap`.
- **≥ 768px (desktop 조정)**: 격자·HUD 를 넓은 뷰포트에 맞춰 확대하되 4×4 구조와 selector 는 유지한다. (breakpoint 값은 planner 지정; 320px 최소 지원은 frozen 요구사항.)
- 캔버스(`#game-root`)는 **뷰포트 폭에 맞춰 종횡비를 유지하며 스케일링**한다. Phaser 사용 시 Scale Manager 의 `FIT` + `autoCenter` 등으로 구현하며 종횡비 왜곡·잘림이 없어야 한다.

---

## 7. 게임 로직 순수 함수 시그니처 (`phaser-memory-match/src/logic.js`)

**invariant**: 게임 로직은 렌더링과 분리된 **순수 함수**이며, 무작위 셔플은 **주입 가능한 시드로 결정적**이다. `logic.js` 는 Phaser/DOM 를 import 하지 않는다. `game.js` 는 렌더링·입력만 담당하고 상태 전이는 `logic.js` 를 호출한다.

### 데이터 형태

```js
/** @typedef {{ id:number, value:number, faceUp:boolean, matched:boolean }} Card */
/** @typedef {{
 *   status:'start'|'playing'|'paused'|'cleared',
 *   cards:Card[],            // 길이 = pairCount*2 (기본 16)
 *   moves:number,
 *   elapsedMs:number,
 *   flippedIndices:number[]  // 현재 턴에 뒤집힌 카드 인덱스(최대 2)
 * }} GameState */
```

### 함수 시그니처 (모두 순수 — 입력 상태를 변형하지 않고 새 값을 반환)

```js
// 결정적 PRNG. seed(정수)로 재현 가능한 () => number(0..1) 생성 (예: mulberry32).
export function createSeededRng(seed: number): () => number

// pairCount 쌍(기본 8)의 카드 덱 생성. 길이 = pairCount*2, 각 value 는 2개씩.
export function buildDeck(pairCount?: number): Card[]

// Fisher-Yates 셔플. 주입된 rng 만 사용 → 같은 rng 면 항상 같은 결과. 새 배열 반환.
export function shuffle(deck: Card[], rng: () => number): Card[]

// 초기 GameState 생성. seed 주입으로 배치가 결정적.
export function createInitialState(opts: { pairCount?: number, seed: number }): GameState

// 카드 뒤집기. 이미 matched/현재 턴에 뒤집힌 카드는 무시(동일 상태 반환).
export function flipCard(state: GameState, cardIndex: number): GameState

// 현재 턴(뒤집힌 2장) 판정. 일치 시 matched 고정, 불일치 시 뒷면 복귀. moves 증가.
export function resolveTurn(state: GameState): GameState

// 모든 쌍이 matched 인지 여부.
export function isCleared(state: GameState): boolean

// 초기값 리셋: status='start', moves=0, elapsedMs=0, 카드 재배치(seed 재사용/신규).
export function resetGame(state: GameState, opts?: { seed?: number }): GameState

// 경과 초 → "mm:ss" 문자열.
export function formatTime(totalSeconds: number): string
```

### 결정적 셔플 주입 방식

- 무작위성은 **`createSeededRng(seed)` 로 생성한 rng 를 `shuffle` 에 인자로 주입**하는 방식으로만 도입한다. `logic.js` 내부에서 `Math.random()` 을 직접 호출하지 않는다.
- `createInitialState({ seed })` 는 내부적으로 `shuffle(buildDeck(pairCount), createSeededRng(seed))` 를 사용한다.
- 테스트(`tests/logic.test.js`)는 **고정 seed** 를 넘겨 동일 배치·동일 판정 결과를 단정한다. 실제 플레이에서는 `game.js` 가 런타임 seed(예: 타임스탬프)를 생성해 주입하되, 로직 계층은 여전히 결정적이다.

---

## 8. 검증 계약

- **단위 테스트**(`phaser-memory-match/tests/logic.test.js`, developer 소유): `buildDeck` 쌍 구성, `createSeededRng`/`shuffle` 결정성(같은 seed → 같은 순서), `flipCard`/`resolveTurn` 일치·불일치 전이, `isCleared`, `resetGame` 초기화, `formatTime` 포맷을 검증한다.
- **상태·UI 검증**: 상태 전이(start→playing→paused→cleared)와 리셋 후조건, HUD 텍스트, 접근성(aria-label·키보드·상태 텍스트), 반응형(≥320px overflow 없음, 캔버스 종횡비 스케일링)을 검증한다.
- 테스트 범위는 focused: 본 모듈(`phaser-memory-match/**`)에 직접 관련된 테스트만 실행한다.

---

## 9. edge case · 실패 케이스

1. 같은 카드를 두 번 클릭 → 두 번째 클릭 무시(단일 카드로 턴 진행 안 됨).
2. 이미 matched 인 카드 선택 → 무시.
3. 세 번째 카드를 두 카드 판정 전에 클릭 → 판정 완료 전까지 추가 flip 차단.
4. `paused` 상태에서의 카드 입력 → 무시, 타이머 정지 유지.
5. `cleared` 이후 카드 입력 → 무시(다시 시작으로만 재개).
6. 홀수 pairCount 또는 잘못된 seed 등 비정상 입력 → `buildDeck`/`createInitialState` 가 명확히 처리(기본값 사용 또는 예외).
7. 320px 미만 초협소 뷰포트 → 최소 지원은 320px 이며 그 이하에서도 가로 overflow 로 레이아웃이 깨지지 않도록 방어.
8. 리셋을 어느 상태에서 눌러도(playing/paused/cleared) 항상 `start` 초기값으로 복귀.

---

## 10. handoff 순서

1. **planner(현재, BF-1726)**: 본 계약 문서 동결.
2. **designer(BF-1720)**: `design-mockup.html`·`design-tokens.html` 에 selector·token·상태·접근성·반응형을 그대로 구현(additive).
3. **developer(BF-1723)**: `index.html`·`src/game.js`·`src/logic.js`·`tests/logic.test.js`·`README.md` 를 계약대로 구현(additive). selector/token 변경 금지, 로직은 순수 함수 + 주입 시드.
4. **reviewer**: design·develop 완료 후 계약 준수 검토.
5. **tester**: review 이후 단위·상태·접근성·반응형 검증.
