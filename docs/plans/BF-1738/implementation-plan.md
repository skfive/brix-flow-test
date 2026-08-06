# SVG 슬라이딩 퍼즐 — 구현 설계 (BF-1738 / BF-1749)

> **문서 성격**: 이 문서는 designer(BF-1746)와 developer(BF-1747)가 병렬로 따를 **실행 설계**입니다.
> 아래의 파일·selector·상태·token은 frozen UI 계약이며, 이 문서는 그것을 **재정의하지 않고 그대로 렌더링**합니다.
> 새 파일·새 selector·새 역할을 추가하지 마세요. 계약값의 유일한 권위는 frozen blueprint입니다.

---

## 1. 목표 (Objective)

3×3(8-퍼즐) 기준의 **SVG 슬라이딩 퍼즐**을 vanilla static(HTML/CSS/ESM) 스택으로 구현한다.
게임 로직은 **렌더링과 분리된 순수 함수**로 작성하고, 무작위 요소(셔플)는 **주입 가능한 rng**로 결정적 테스트가 가능하도록 설계한다.

---

## 2. 사용자 시나리오 (User Scenarios)

- **S1 — 게임 시작**: 사용자가 페이지를 열면 셔플된 solvable 보드가 `playing` 상태로 표시되고, 이동 횟수 0, 경과 시간 0으로 시작한다.
- **S2 — 타일 이동**: 사용자가 빈 칸(empty)에 인접한 타일을 클릭/키보드로 선택하면 해당 타일이 빈 칸으로 슬라이딩(CSS transition)되고 이동 횟수가 1 증가한다.
- **S3 — 클리어**: 모든 타일이 정렬(1..8, 마지막이 빈 칸)되면 `cleared` 상태로 전환되고 클리어 화면(`clear-screen`)이 상태 텍스트와 함께 노출된다.
- **S4 — 재시작**: 사용자가 restart 버튼을 누르면 상태·이동 횟수·경과 시간이 초기값으로 되돌아가고 새 solvable 보드가 `playing`으로 다시 시작된다.
- **S5 — 반응형**: 320px 이상 좁은 화면에서 보드는 뷰포트에 맞춰 축소되고 HUD는 세로로 재배치된다. content overflow가 없다.

---

## 3. Frozen UI 계약 (ui-contract@v1 — 그대로 구현)

### 3.1 파일 및 소유자 (파일 소유권은 frozen blueprint가 유일 권위)

| 파일 | 소유자 | 역할 |
| --- | --- | --- |
| `svg-puzzle-slider/README.md` | canonical work packet owner | 모듈 개요·실행 방법 |
| `svg-puzzle-slider/design-mockup.html` | developer | 정적 시안(마크업/레이아웃 참조) |
| `svg-puzzle-slider/design-tokens.html` | developer | 토큰 시각 카탈로그 |
| `svg-puzzle-slider/index.html` | developer | 실제 진입 페이지 |
| `svg-puzzle-slider/src/puzzle.js` | developer | **순수 게임 로직** (렌더링 없음) |
| `svg-puzzle-slider/src/render.js` | developer | **SVG 렌더링 + 입력** (DOM 담당) |
| `svg-puzzle-slider/styles.css` | developer | 스타일·토큰·반응형 |
| `svg-puzzle-slider/tests/puzzle.test.js` | developer | 순수 로직 단위 테스트 |

- **artifact-policy: 모든 파일 `additive`** — 위 파일들은 신규 생성이며 기존 자산을 재정의/삭제하지 않는다.
- **designer(BF-1746)**: `design-mockup.html`/`design-tokens.html`은 developer 소유이므로 직접 수정하지 말고, 시각 명세는 위 frozen selector·token 안에서 제안한다. designer 산출물은 자신의 owned_paths에 둔다.
- **developer(BF-1747)**: 위 8개 파일을 구현하되 frozen selector·token을 변경/재정의하지 않는다.

### 3.2 DOM 계약 (변경 금지)

| DOM ID | 용도 |
| --- | --- |
| `puzzle-board` | 퍼즐 보드 컨테이너(SVG 루트) |
| `puzzle-tiles` | 타일 그룹(개별 타일이 붙는 부모) |
| `move-count` | 이동 횟수 표시 |
| `elapsed-time` | 경과 시간 표시 |
| `restart-button` | 재시작 control(주 실행 control) |
| `clear-screen` | 클리어 상태 화면 |

| CSS class | 용도 |
| --- | --- |
| `puzzle` | 최상위 래퍼 |
| `puzzle__tile` | 개별 타일 |
| `puzzle__tile--empty` | 빈 칸 타일 |
| `puzzle__hud` | HUD(이동 횟수·경과 시간) |
| `puzzle__clear` | 클리어 화면 스타일 |

### 3.3 상태 계약 (start / playing / paused / cleared)

| 상태 | 진입 조건 | 화면/후조건 |
| --- | --- | --- |
| `start` | 초기 로드 직후(셔플 전 준비) | 보드 준비, HUD 초기값(이동 0·시간 0) |
| `playing` | 셔플 완료 후 조작 가능 | 타일 이동 허용, 타이머 진행 |
| `paused` | 진행 일시 중단 | 타이머 정지, 조작 잠금(재개 시 `playing`) |
| `cleared` | 보드가 목표 배열과 일치 | `clear-screen` 노출(role=status), 조작 종료 |

**후조건 불변식(초기화·취소·실패 뒤)**: 상태와 진행 표시(`move-count`·`elapsed-time`)를 초기값으로 되돌리고, 주 실행 control(`restart-button`)을 다시 사용할 수 있어야 한다.

### 3.4 디자인 토큰 (CSS 변수 — 그대로 사용)

```css
:root {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-tile: #f8fafc;
  --color-tile-text: #0f172a;
  --color-accent: #2563eb;
  --space-tile-gap: 8px;
  --radius-tile: 12px;
  --font-size-tile: 28px;
  --shadow-tile: 0 2px 6px rgba(0, 0, 0, 0.3);
}
```

### 3.5 접근성 (Accessibility)

- 각 타일은 `aria-label`로 숫자를 노출하고 키보드(**Tab/Enter**)로 이동 가능하다.
- `restart-button`은 명시적 `aria-label`을 가진다.
- 클리어 화면(`clear-screen`)은 `role="status"`로 스크린리더에 상태 텍스트를 알린다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (Responsive)

- **320px 이상**에서 퍼즐 보드가 뷰포트에 맞춰 축소되며 content overflow가 발생하지 않는다.
- HUD(이동 횟수·경과 시간)는 좁은 화면에서 **세로로 재배치**된다.

### 3.7 산출물 경로 (Deliverables)

- 실행 설계(본 문서): `docs/plans/BF-1738/implementation-plan.md`
- 구현 산출물: 위 3.1 표의 8개 파일(`svg-puzzle-slider/**`).

---

## 4. 게임 로직 / 렌더링 분리 경계 (frozen invariant)

- **`src/puzzle.js` = 순수 게임 로직만**: DOM·SVG·`window`·타이머에 접근하지 않는다. 입력 상태를 받아 새 상태를 반환하는 함수 집합.
- **`src/render.js` = SVG 렌더링 + 입력만**: `puzzle.js`의 순수 함수를 호출해 상태를 계산하고, 그 결과를 SVG DOM에 반영하며 클릭/키보드 이벤트를 로직 함수 호출로 변환한다. 게임 규칙(합법 이동 판정·승리 판정·셔플 알고리즘)을 재구현하지 않는다.
- **테스트(`tests/puzzle.test.js`)는 `puzzle.js`만 대상**으로 하며, 주입한 rng로 결정적 결과를 검증한다.

```
[입력 이벤트] --render.js--> puzzle.js(순수) --새 상태--> render.js --> SVG DOM 갱신
```

---

## 5. 순수 게임 로직 인터페이스 (src/puzzle.js — frozen 함수 시그니처)

> 보드는 길이 9의 1차원 배열로 표현한다. 값 `1..8`은 타일 번호, `0`은 빈 칸을 뜻한다.
> 목표(solved) 배열은 `[1,2,3,4,5,6,7,8,0]`.

```js
// 크기 상수 (3x3 = 8-퍼즐)
export const SIZE = 3;                    // 한 변의 타일 수
export const TILE_COUNT = SIZE * SIZE;    // 9
export const EMPTY = 0;                   // 빈 칸 값

// 목표(정렬 완료) 보드를 반환한다. 예: [1,2,3,4,5,6,7,8,0]
export function solvedBoard(): number[]

// 승리 판정: board가 solvedBoard()와 동일하면 true
export function isSolved(board: number[]): boolean

// 빈 칸(0)의 인덱스를 반환
export function emptyIndex(board: number[]): number

// index 타일이 빈 칸과 상하좌우로 인접해 이동 가능하면 true
// (행 넘어감으로 인한 잘못된 인접 판정을 방지: 좌우 이동은 같은 행일 때만 유효)
export function canMove(board: number[], index: number): boolean

// index 타일을 빈 칸으로 이동한 "새 배열"을 반환 (순수 — 원본 불변).
// 이동 불가면 원본과 동일한 새 배열(또는 원본)을 반환하고 상태를 바꾸지 않는다.
export function move(board: number[], index: number): number[]

// 역위 수(inversion count) 계산: 빈 칸(0)을 제외한 순서쌍 중 역순 개수
export function countInversions(board: number[]): number

// solvable 판정 (홀수 폭 3의 8-퍼즐: 역위 수가 짝수이면 solvable)
export function isSolvable(board: number[]): boolean

// 주입된 rng로 solvable 보드를 생성한다.
//   - rng: () => number, [0,1) 범위 난수를 반환하는 함수 (기본값 주입 없이도 테스트에서 대체 가능)
//   - Fisher–Yates로 섞은 뒤, isSolvable이 false면 두 타일을 swap해 패리티를 보정하여
//     항상 solvable(그리고 이미 solved가 아닌) 보드를 반환한다.
export function shuffle(rng: () => number): number[]
```

### 5.1 결정적 셔플 주입 설계

- `shuffle(rng)`는 난수원을 **인자로 주입**받는다. 테스트는 시드 기반 결정적 rng(예: 선형합동 생성기 클로저)를 주입해 동일 시퀀스를 재현한다.
- 셔플 후 `isSolvable`이 false면 임의 두 타일(빈 칸 제외)을 swap해 **역위 수 패리티를 반전**시켜 solvable로 만든다.
- 반환 보드는 `isSolvable(board) === true` **그리고** `isSolved(board) === false`를 항상 만족한다.

### 5.2 패리티 규칙 근거

- 3×3(폭 = 홀수) 퍼즐에서는 **역위 수가 짝수일 때만 solvable**이다(빈 칸의 행 위치는 폭이 홀수라 판정에 영향 없음). `isSolvable`은 이 규칙만 사용한다.

---

## 6. 렌더링 / 입력 인터페이스 (src/render.js — 경계 명세)

`render.js`는 아래 책임만 가진다(규칙은 `puzzle.js`에 위임):

- 초기화: `shuffle(rng)`로 초기 보드 생성 → `puzzle-board`/`puzzle-tiles`에 SVG 타일 렌더 → 상태 `playing`.
- 입력→로직: 타일 클릭/`Enter`가 `canMove`이면 `move`로 새 보드를 얻고, 변경분만 SVG transform(CSS transition)으로 슬라이딩 반영, `move-count` 증가.
- 승리: 각 이동 후 `isSolved`가 true면 상태 `cleared`, `clear-screen`(role=status) 노출.
- 재시작(`restart-button`): 상태·`move-count`·`elapsed-time`를 초기값으로 리셋 후 새 `shuffle(rng)`로 `playing` 재시작(§3.3 후조건 불변식 충족).
- 타이머: `elapsed-time` 갱신은 render 계층 책임(`playing`에서 진행, `paused`에서 정지, `cleared`/리셋에서 초기화).

렌더 계층은 **셔플·이동 판정·승리 판정을 재구현하지 않는다**(§4 불변식).

---

## 7. Edge Case · 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E1 | 빈 칸에 인접하지 않은 타일 선택 | `canMove=false` → 상태 불변, 이동 횟수 증가 없음 |
| E2 | 좌우 끝 타일이 행을 넘어 "인접"으로 오판 | `canMove`가 같은 행 조건으로 차단 |
| E3 | 셔플 결과가 우연히 solved | `shuffle`이 solved를 배제하고 재생성/보정 |
| E4 | 셔플 결과가 unsolvable | 패리티 보정 swap으로 항상 solvable 보장 |
| E5 | 이미 cleared 상태에서 타일 클릭 | 입력 무시(조작 종료) |
| E6 | 320px 미만 근처 초협소 화면 | 보드 축소·HUD 세로 재배치로 overflow 없음(320px 이상 보장) |
| E7 | 재시작/취소 직후 잔여 타이머·이동 수 | 초기값으로 리셋, `restart-button` 재사용 가능 |
| E8 | 키보드 전용 사용자 | Tab 포커스 + Enter 이동, 상태 텍스트로 진행 인지 |

---

## 8. 검증 가능한 종료 조건 (Acceptance)

- [ ] `tests/puzzle.test.js`가 주입 rng로 `shuffle` 결정성·`isSolvable`·`move`/`canMove`·`isSolved` 순수 함수를 검증한다.
- [ ] `puzzle.js`에 DOM/SVG/타이머 의존이 없다(순수).
- [ ] `render.js`가 규칙을 재구현하지 않고 `puzzle.js`만 호출한다.
- [ ] frozen DOM ID·class·상태·token·접근성·반응형이 §3 그대로 구현된다.
- [ ] 재시작/실패 후 §3.3 후조건 불변식(상태·진행 표시 초기화, control 재사용 가능)이 충족된다.

---

## 9. 후속 페르소나 handoff 요약

- **designer (BF-1746)**: §3의 frozen selector·token·상태·접근성·반응형을 시각 명세의 단일 출처로 사용. token/selector 재정의 금지.
- **developer (BF-1747)**: §5 순수 함수 시그니처 + §6 렌더 경계 + §3 UI 계약을 그대로 구현. 8개 파일만 생성(additive). 셔플은 주입 rng로 결정적.
- **reviewer / tester**: §4 분리 불변식과 §8 종료 조건, §3.3 후조건 불변식을 검증 기준으로 사용.
