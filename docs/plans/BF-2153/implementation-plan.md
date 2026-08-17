# BF-2153 · 카드 짝맞추기(memory) 모듈 구현 설계

- Jira: BF-2156 (본 planner task) · BF-2153 (epic) · BF-2154 (designer) · BF-2155 (developer)
- 작성자: 박기획 (planner)
- 범위: `memory/` 모듈의 상태 전이표, 순수 함수 계약, UI/DOM/토큰 계약을 designer/developer가 그대로 따를 수 있도록 고정한다.

## 1. 개요

카드 짝맞추기(memory matching) 게임을 정적 프론트엔드 모듈로 구현한다. 서버 API는 없으며, 4x4(8쌍) 카드 보드에서 두 장씩 카드를 뒤집어 심볼이 일치하면 맞춘 것으로 고정하고, 모든 카드를 맞추면 완료 메시지를 표시한다. 본 문서는 frozen blueprint(패킷의 `frozen_interfaces`)에 정의된 파일·소유자·상태·계약을 그대로 설명하며, 새 파일이나 새 역할을 추가하지 않는다.

## 2. 파일 소유권 (frozen blueprint 그대로)

| 파일 | 담당 역할 | artifact-policy |
|---|---|---|
| `docs/design/memory-BF-2153-mockup.html` | designer | additive |
| `docs/design/memory-BF-2153.md` | designer | additive |
| `memory/index.html` | developer | additive |
| `memory/style.css` | developer | additive |
| `memory/memory.js` | developer | additive |
| `memory/tests/memory.test.js` | developer | additive |
| `docs/plans/BF-2153/implementation-plan.md` (본 문서) | planner | additive |

파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다. designer/developer는 아래 selector·토큰·시그니처를 변경하거나 재정의하지 않는다.

## 3. 게임 상태 데이터 모델

```
Card = {
  id: number,        // 카드 고유 id (쌍이 아닌 개별 카드 단위)
  symbol: string,     // 심볼(이모지 등), 같은 심볼을 가진 카드가 정확히 2장 존재
  flipped: boolean,   // 현재 앞면이 보이는지 여부
  matched: boolean    // 짝을 맞춰 고정되었는지 여부
}

GameState = {
  deck: Card[],              // 셔플된 전체 카드 배열
  flippedIndices: number[],  // 현재 턴에 뒤집힌(아직 matched 아닌) 카드 index, 0~2개
  moveCount: number,         // 두 번째 카드를 뒤집어 판정을 시도한 횟수 (#move-counter 표시값)
  phase: 'idle' | 'one-flipped' | 'comparing' | 'done'
}
```

## 4. 상태 전이표

| 현재 상태 | 입력 잠금 | 트리거 | 처리 내용 | 다음 상태 |
|---|---|---|---|---|
| `idle` | 해제(카드 클릭 가능) | 유효한 카드(hidden, 미matched) 클릭 → `applyFlip(state, i)` | `deck[i].flipped = true`, `flippedIndices = [i]` | `one-flipped` |
| `one-flipped` | 해제(카드 클릭 가능) | 다른 유효한 카드 클릭 → `applyFlip(state, j)` (j ≠ i) | `deck[j].flipped = true`, `flippedIndices = [i, j]`, `moveCount += 1`, 즉시 심볼 일치 판정 | 일치 & 전체 미완료 → `idle` / 일치 & 전체 완료(모든 카드 matched) → `done` / 불일치 → `comparing` |
| `comparing` | 잠금(카드 클릭 무시) | `applyFlip` 호출 시 무시(no-op, 동일 state 반환) / 내부 지연 타이머(예: 1000ms) 만료 | 두 카드의 `flipped`를 `false`로 되돌리고 `flippedIndices = []` | `idle` |
| `done` | 잠금(카드 클릭 무시) | `applyFlip` 호출 시 무시(no-op) | 없음 — `#restart-button` 클릭으로만 재시작 | `done` (restart 전까지 유지) |

- `comparing → idle` 복귀는 사용자 카드 클릭(`applyFlip`)이 아니라, `memory.js` 오케스트레이션 계층의 지연 타이머 콜백이 새 `GameState` 객체(두 카드 `flipped:false`, `phase:'idle'`)로 교체하는 방식으로 처리한다. 이 전이도 원본 state를 직접 변경하지 않고 새 객체를 반환해야 한다.
- `#restart-button` 클릭 시: 진행 중인 타이머를 취소하고, `createDeck` + 셔플로 새 덱을 만들어 `phase:'idle'`, `moveCount:0`, `flippedIndices:[]`로 초기화하며 `#completion-message`를 비운다.

## 5. 순수 함수 계약

### `createDeck(symbols, shuffleFn)`

- 입력: `symbols: string[]` (중복 없는 심볼 목록), `shuffleFn?: (cards: Card[]) => Card[]` (선택, 셔플 알고리즘 주입용 — 미지정 시 기본 셔플 사용).
- 동작: 각 심볼마다 `Card` 2장(동일 `symbol`, 서로 다른 `id`, `flipped:false`, `matched:false`)을 생성해 `symbols.length * 2`장의 배열을 만든 뒤 `shuffleFn`(또는 기본 셔플)을 적용해 반환한다.
- 반환: 새로 생성된 `Card[]` 배열. 매 호출마다 새 배열/새 카드 객체를 반환한다.
- 불변성: 입력 `symbols` 배열과 그 원소를 변경하지 않는다.

### `applyFlip(state, index)`

- 입력: `state: GameState` (현재 게임 상태), `index: number` (사용자가 뒤집으려는 카드의 `deck` 배열 index).
- 동작: 3절 상태 전이표에 따라 다음 `GameState`를 계산한다.
- 반환: 새로운 `GameState` 객체. **원본 `state`, `state.deck`, `state.deck`의 개별 카드 객체를 직접 변경(mutate)하지 않는다** — 변경이 필요한 부분만 얕은 복사로 새 객체를 만들어 반환한다.
- no-op 조건 (원본과 동등한 state를 그대로 반환): `index`가 `deck` 범위를 벗어남, 대상 카드가 이미 `flipped` 또는 `matched`, 또는 `phase`가 `comparing`/`done`(입력 잠금 상태).

## 6. UI / DOM / 디자인 토큰 계약

- 파일: `memory/index.html`, `memory/style.css`, `memory/memory.js`, `memory/tests/memory.test.js`
- DOM id: `game-board`, `move-counter`, `restart-button`, `completion-message`
- CSS class: `board`, `card`, `card--flipped`, `card--matched`
- 디자인 토큰(CSS custom property):
  - `--font-family-base: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  - `--color-card-back: #2563eb`
  - `--color-card-face: #f8fafc`
  - `--color-board-bg: #0f172a`
  - `--space-grid-gap: 12px`
- Route: 정적 파일이 root-relative로 서빙되므로 `/memory/index.html` 경로에서 접근한다.

## 7. 접근성 요구사항

- 각 카드 버튼(`button.card`)은 상태별 `aria-label`(예: '뒤집힌 카드', 심볼명, '맞춘 카드')을 제공한다.
- `#move-counter`와 `#completion-message`는 `aria-live="polite"` 영역으로 선언해 스크린리더에 변경을 알린다.
- `#restart-button`은 가시 텍스트 레이블 '다시 시작'을 가지며 키보드 Tab/Enter로 조작 가능하다.
- 모든 상태(뒤집힘/맞춤/진행/완료)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

## 8. 반응형 요구사항

- 320px 이상 뷰포트에서 4x4 그리드(`#game-board.board`)가 가로 스크롤 없이 표시된다.
- 600px 이상 뷰포트에서는 카드 크기가 확대되어 가독성이 향상된다.

## 9. 완료 메시지 및 재시작 계약

- 모든 카드가 `matched`가 되어 `phase`가 `done`으로 전이하면 `#completion-message`에 색상이 아닌 화면 텍스트로 완료를 알린다. 예: `모두 맞췄습니다! 총 N번 시도` (N = `moveCount`).
- `#restart-button` 클릭(초기화) 후에는 상태와 진행 표시(시도 횟수, 완료 메시지, 카드 뒤집힘/맞춤 표시)가 초기값으로 돌아가고, 카드 클릭이라는 주 실행 control이 다시 사용 가능해야 한다.

## 10. 파일 로딩 방식 및 테스트 호환성

- `memory/index.html`은 `memory/memory.js`를 classic `<script src="memory.js">` 태그로 로드한다 (file:// 프로토콜의 ES module CORS 제약 회피).
- `memory/memory.js`는 ES `import`/`export` 구문을 사용하지 않고, `typeof module !== 'undefined'` 가드로 `module.exports`를 통해 `createDeck`, `applyFlip`을 조건부 export한다. 이를 통해 `node --test memory/tests/memory.test.js`(focused test scope)와 브라우저 `file://` 실행을 모두 지원한다.

## 11. Edge case / 실패 케이스

- `comparing`/`done` 상태에서의 카드 클릭: `applyFlip`이 상태를 바꾸지 않고 그대로 반환한다(입력 잠금).
- 이미 `matched`이거나 이미 `flipped`인 카드를 다시 클릭: no-op.
- `index`가 배열 범위를 벗어남(음수, `deck.length` 이상): no-op.
- 마지막 쌍까지 일치: `one-flipped → done`으로 바로 전이하며 `comparing`을 거치지 않는다(불일치가 없으므로 지연 표시가 불필요).
- 재시작 중 진행 중이던 `comparing` 지연 타이머는 취소되어 재시작 이후 지연된 콜백이 새 게임 상태를 덮어쓰지 않는다.

## 12. API 스펙

해당 없음 — 정적 프론트엔드 모듈이며 서버 API를 호출하지 않는다.
