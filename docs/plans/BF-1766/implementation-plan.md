# Color Guess 구현 설계 (BF-1766) — Frozen Blueprint

> 이 문서는 planner가 동결한 **구현 설계 및 handoff 계약**이다.
> designer(BF-1767)와 developer(BF-1768)는 아래 selector·상태·토큰·시그니처를 **변경하거나 재정의하지 않고 그대로 구현**한다.
> 파일 소유권과 상태 계약의 유일한 권위는 frozen Execution Blueprint이며, 본 문서는 이를 재정의하지 않고 설명한다.
> 모든 산출물은 저장소 루트의 `isolation-check-color-guess/` 격리 디렉터리 **안에서만** 생성한다.

---

## 1. 개요

- **게임**: Color Guess (색상 맞히기)
- **tech-stack**: vanilla-static (HTML/CSS/vanilla ESM JS, 빌드 도구 없음)
- **primary-module**: color-guess
- **격리 루트**: `isolation-check-color-guess/`
- **serve-root**: `.` (root-relative static)

플레이어에게 목표 색상 값을 텍스트로 제시하고, 여러 색상 견본(swatch) 중 목표와 일치하는 것을 고르게 한다.
정답이면 점수를 올리고, 오답이면 목숨을 하나 줄인다. 목숨이 모두 소진되면 gameover 상태로 전환되어 최종 점수를 표시하고 다시 시작 버튼을 노출한다.

---

## 2. 파일 구조 · 소유자 · 상태 · 후조건 (frozen)

모든 경로는 `isolation-check-color-guess/` 기준. artifact-policy는 전부 **additive**(신규 생성).

| 파일 | 소유자 | 역할 | 후조건 |
| --- | --- | --- | --- |
| `README.md` | canonical work packet owner | 모듈 실행/구조 설명 | 격리 모듈의 실행 방법과 파일 맵을 기술 |
| `docs/design/design-mockup.html` | developer | 정적 mockup (디자인 참조 렌더) | 동결된 selector·상태 화면이 정적으로 렌더됨 |
| `docs/design/design-tokens.html` | developer | 디자인 토큰 미리보기 | §5의 `--token=값`이 그대로 표기됨 |
| `index.html` | developer | 게임 진입 화면 (DOM 골격) | §3의 DOM ID/class 골격을 포함, `src/main.js`를 ESM으로 로드 |
| `src/game.js` | developer | 순수 게임 로직 (렌더링 분리) | §6의 순수 함수 시그니처 구현, RNG 주입 가능 |
| `src/main.js` | developer | DOM 바인딩 · 렌더 · 이벤트 | `game.js`를 소비하여 상태를 DOM에 반영 |
| `styles.css` | developer | 토큰·레이아웃·상태 스타일 | §5 토큰, §7 반응형, 상태별 시각 표현 |
| `tests/game.test.js` | developer | `game.js` 단위 테스트 | 정답 생성/채점/목숨 관리 순수 함수 검증 |

> designer(BF-1767)는 위 파일의 **소유권을 가져가지 않는다**. 실행 코드/정적 파일 산출물은 developer(BF-1768)가 생성한다.
> designer 산출물이 별도로 필요하면 designer 자신의 owned path에서 생성하며, 본 격리 계약의 파일 목록에 새 파일을 추가하지 않는다.

---

## 3. DOM selector 계약 (frozen — 변경 금지)

### DOM ID

| ID | 요소 | 용도 |
| --- | --- | --- |
| `color-target` | 목표 색상 표시 | 맞혀야 할 색상 값을 텍스트로 노출 (§5 `--font-size-target`) |
| `swatch-options` | 색상 견본 컨테이너 | 선택 가능한 swatch button들을 담는 영역 |
| `score-value` | 점수 표시 | 현재 점수(정답 수) |
| `lives-value` | 목숨 표시 | 남은 목숨 수 |
| `feedback-message` | 피드백 영역 | 정답/오답 결과 안내 (aria-live=polite) |
| `gameover-panel` | 종료 패널 | gameover 상태에서만 표시 |
| `final-score` | 최종 점수 | gameover 시 최종 점수 |
| `restart-button` | 다시 시작 버튼 | 초기화 후 playing 상태로 복귀 |

### CSS class

| class | 용도 |
| --- | --- |
| `game` | 최상위 게임 컨테이너 |
| `game__hud` | 점수·목숨 HUD 영역 |
| `swatch` | 개별 색상 견본 button 기본 |
| `swatch--correct` | 정답 견본 선택 시 상태 표현 |
| `swatch--wrong` | 오답 견본 선택 시 상태 표현 |
| `gameover` | gameover 상태 컨테이너/패널 표현 |

> 위 ID/class 집합이 유일한 권위다. developer/designer는 이름을 추가·변경·재정의하지 않는다.

---

## 4. 상태 모델 · 화면 텍스트 (frozen)

상태 집합: `playing | correct | wrong | gameover`

| 상태 | 진입 조건 | 화면 텍스트 (`feedback-message` 등) | 접근성 노출 |
| --- | --- | --- | --- |
| `playing` | 게임 시작/다음 라운드 | "색상을 맞혀보세요" (안내) | 상태명을 화면 텍스트로 노출 |
| `correct` | 정답 견본 선택 | "정답입니다" | 상태명을 텍스트+aria-live로 노출 |
| `wrong` | 오답 견본 선택 | "오답입니다 — 목숨이 하나 줄었습니다" | 상태명을 텍스트+aria-live로 노출 |
| `gameover` | 목숨 0 도달 | "게임 오버 — 최종 점수 N" | `gameover-panel` 표시, 상태명 노출 |

**원칙**: 모든 상태는 **색상만으로 구분하지 않는다**. 상태명을 화면 텍스트와 접근성 이름 양쪽으로 노출한다.
`correct`/`wrong`는 견본에 `swatch--correct`/`swatch--wrong` class로 시각 표현하되, 결과 문구를 `feedback-message`에 항상 함께 쓴다.

### 상태 전이

- `playing` → (정답 선택) → `correct` → (다음 라운드) → `playing`
- `playing` → (오답 선택, 목숨>0) → `wrong` → (다음 라운드) → `playing`
- `playing` → (오답 선택, 목숨=0) → `gameover`
- `gameover` → (`restart-button` 클릭) → `playing` (점수·목숨·진행표시 초기값 복귀)

**초기화/취소/실패 후조건**: 초기화·다시 시작·실패 후에는 상태와 진행 표시(점수·목숨·feedback)를 초기값으로 되돌리고, 주 실행 control(`restart-button` 및 견본 선택)을 다시 사용할 수 있어야 한다.

---

## 5. 디자인 토큰 (frozen — exact 값)

CSS custom property로 `:root`에 정의한다. developer/designer는 값을 변경하지 않는다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#0f172a` | 배경 |
| `--color-surface` | `#1e293b` | 카드/HUD 표면 |
| `--color-text-primary` | `#f8fafc` | 주 텍스트 |
| `--color-text-muted` | `#94a3b8` | 보조 텍스트 |
| `--color-correct` | `#22c55e` | 정답 상태 강조 |
| `--color-wrong` | `#ef4444` | 오답 상태 강조 |
| `--color-accent` | `#3b82f6` | 포커스/액센트 |
| `--space-sm` | `8px` | 좁은 간격 |
| `--space-md` | `16px` | 기본 간격 |
| `--space-lg` | `24px` | 넓은 간격 |
| `--radius-md` | `12px` | 모서리 반경 |
| `--font-size-target` | `28px` | 목표 색상 텍스트 크기 |
| `--font-size-body` | `16px` | 본문 텍스트 크기 |

---

## 6. 순수 게임 로직 시그니처 · RNG 주입 계약 (frozen)

`src/game.js`는 **렌더링과 분리된 순수 함수** 모듈이다. DOM에 접근하지 않는다.
RNG는 **주입 가능**해야 한다: 함수는 `[0, 1)` 범위의 숫자를 반환하는 `rng` 인자를 받고, 기본값으로 `Math.random`을 쓰지 않고 호출 측에서 주입한다(테스트는 결정적 RNG 주입).

```js
// src/game.js — 순수 함수, ESM export

/**
 * 라운드 정답과 선택지를 생성한다.
 * @param {() => number} rng - [0,1) 난수 생성기 (주입 가능)
 * @param {number} optionCount - 견본 개수
 * @returns {{ target: string, options: string[], correctIndex: number }}
 */
export function generateRound(rng, optionCount) { /* ... */ }

/**
 * 선택이 정답인지 채점한다. 순수 함수 (부수효과 없음).
 * @param {{ correctIndex: number }} round
 * @param {number} selectedIndex
 * @returns {boolean}
 */
export function scoreGuess(round, selectedIndex) { /* ... */ }

/**
 * 목숨을 관리한다. 순수 함수 — 새 목숨 수와 gameover 여부를 반환.
 * @param {number} lives - 현재 목숨
 * @param {boolean} wasCorrect - 직전 선택 정답 여부
 * @returns {{ lives: number, gameOver: boolean }}
 */
export function applyLife(lives, wasCorrect) { /* ... */ }

/**
 * 새 게임의 초기 상태를 만든다. 순수 함수.
 * @returns {{ status: 'playing', score: number, lives: number }}
 */
export function createInitialState() { /* ... */ }
```

**RNG 계약**:
- 모든 무작위성은 인자로 받은 `rng()` 호출에서만 나온다. 모듈 내부에서 `Math.random`을 직접 호출하지 않는다.
- 동일한 `rng` 시퀀스를 주입하면 `generateRound`는 항상 동일한 결과를 반환한다(결정적).
- `tests/game.test.js`는 고정 시퀀스 RNG를 주입해 정답 생성·채점·목숨 관리를 검증한다.

**로직/렌더 분리**: `src/main.js`가 `game.js`의 순수 함수를 호출해 상태를 계산하고, 그 상태를 §3 selector에 반영한다. `game.js`는 DOM을 알지 못한다.

---

## 7. 접근성 · 반응형 계약 (frozen)

### 접근성

- 각 색상 견본은 **키보드 포커스 가능한 `button`**이며 `N번 색상 견본` 형식의 `aria-label`을 가진다.
- `restart-button`은 `다시 시작` `aria-label`을 가진다.
- `feedback-message`는 `aria-live="polite"` 영역으로 정답/오답 결과를 안내한다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 반응형

- **320px 이상**에서 색상 견본과 HUD가 가로 overflow 없이 배치된다.
- **480px 미만**에서 색상 견본이 세로로 재배치된다.

---

## 8. handoff 계약 요약

- **producer**: planner(BF-1769, packet=`plan`)
- **consumer**: designer(BF-1767, packet=`design`), developer(BF-1768, packet=`develop`)
- **invariant**:
  - designer와 developer는 승인된 실행 설계(본 문서 + frozen blueprint)를 따른다.
  - selector와 token을 변경하거나 재정의하지 않는다.
  - 게임 로직은 렌더링과 분리된 순수 함수이며 RNG는 주입 가능하다.
  - 모든 산출물은 `isolation-check-color-guess/` 안에서만 생성한다.
  - 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있게 한다.

이 문서는 frozen blueprint의 파일·소유자·상태·후조건을 그대로 설명하며 **새 파일이나 역할을 추가하지 않는다.**
