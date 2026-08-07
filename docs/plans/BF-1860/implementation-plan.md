# Addiction Mini 이동 버그 수정 — 구현 설계 (BF-1862)

> 산출물: `planning-contract@v1` — developer(BF-1861)가 이 설계의 재현 시나리오와 수정 범위를 따라 구현한다.
> 실행 계약: `executionProfile=implementation-strict`, `profile=compact`, `changeKinds=[ui]`.

## 0. 대상 코드 위치 (중요 — 경로 불일치)

- Task 계약의 `contract_paths`는 `addiction-mini/**`로 표기되어 있으나, **워크트리에는 `addiction-mini/` 디렉터리가 존재하지 않는다.**
- Addiction Mini 게임의 실제 구현 위치는 **`iteration-check3/`** 이다 (커밋 `bd91174` "feat(bf-1856): Addiction Mini 게임 구현 (#502)"에서 생성).
  - `iteration-check3/index.html`
  - `iteration-check3/src/game.js` — 순수 게임 로직(DOM 비의존)
  - `iteration-check3/src/ui.js` — 보드 렌더 + 클릭/키보드 인터랙션 (**버그 위치**)
  - `iteration-check3/styles.css`
  - `iteration-check3/tests/game.test.js` — 순수 로직 단위 테스트
- **developer는 `addiction-mini/`가 아니라 `iteration-check3/` 를 대상으로 구현한다.**

## 1. 버그 요약

카드를 선택한 뒤 이동하려는 빈 칸(이동 영역)을 클릭해도 **카드가 이동/교체되지 않는다.**

기대 인터랙션(2단계): ① 이동 가능한 카드를 클릭해 **선택** → ② 목표 빈 칸을 클릭해 선택 카드를 그 칸으로 **이동**.
현재 코드에는 ②(선택 후 목표 빈 칸 클릭 → 이동)를 처리하는 경로가 아예 없다.

## 2. 재현 시나리오 (Given / When / Then)

재현 테스트로 표현 가능하도록 상태 전이 기준으로 기술한다.

- **Given** `iteration-check3/index.html` 를 브라우저로 연 초기 `playing` 상태의 보드에서, 이동 가능한 비앵커 카드 `C`(예: 어떤 행의 규칙상 인접 빈 칸으로 이동 가능한 카드)와 그 목표 빈 칸 `T`(`canMove(board, C_index, T_index) === true`)가 존재한다.
- **When** 사용자가 카드 `C` 를 클릭해 선택(하이라이트) 상태로 만든 뒤, 목표 빈 칸 `T` 를 클릭한다.
- **Then (현재/버그)** `T` 는 여전히 비어 있고, `C` 는 원위치에 남으며, `state.moves`·`state.score` 가 변하지 않는다. (이동/교체 실패)
- **Then (기대/수정 후)** `C` 가 `T` 로 이동해 `board[T]=C`, `board[C_index]=null` 이 되고, `state.moves` 가 1 증가, `state.score = computeScore(board)` 로 갱신되며, `state.selected` 가 `null` 로 해제된다.

### 재현 테스트가 확인할 불변식
1. 선택된 카드 + 유효 목표 빈 칸 클릭 → 카드 이동, `selected` 해제, `moves` 증가.
2. 선택된 카드 + **유효하지 않은** 빈 칸 클릭 → 보드 불변, 이동 없음(현재는 이 케이스도 무반응 — 수정 후에도 이동하지 않아야 함).
3. 이동 가능한 카드 클릭 → `selected` 가 그 카드 인덱스로 설정된다.
4. 앵커(col0의 Ace) 카드는 선택/이동 대상이 되지 않는다.

## 3. 근본 원인 가설

`iteration-check3/src/ui.js` 의 클릭 인터랙션 설계에 **2단계(선택→목표) 모델의 두 번째 단계가 미구현**이다.

1. **빈 칸 클릭이 필터링되어 무시됨** — `onBoardClick`(ui.js:174–178)은
   ```js
   const cell = e.target.closest('.cell');
   if (!cell || !cell.classList.contains('card')) return; // ← 빈 칸(cell--empty)은 여기서 종료
   tryMove(Number(cell.dataset.index));
   ```
   목표 빈 칸은 `cell cell--empty` 클래스라 `.card` 가드에서 즉시 `return` 된다. 즉 "이동 영역 클릭"은 어떤 상태 전이도 일으키지 못한다.
2. **`state.selected` 가 이동 소스로 소비되지 않음** — `state.selected` 는 `onBoardFocusIn`(ui.js:188–194)에서 포커스 시 설정되고 `render()`(ui.js:93)에서 하이라이트로 표시되지만, **이 선택값을 출발지로 삼아 클릭한 목표 칸으로 이동시키는 코드 경로가 없다.**
3. **카드 클릭은 목표 지정 없이 자동 이동한다** — `tryMove`(ui.js:107–131)는 `findTarget(i)`(ui.js:100–105)로 "첫 번째로 발견되는 이동 가능한 빈 칸"으로 즉시 옮긴다. 사용자가 선택한 목표를 존중하지 않으며, 2단계 모델과 충돌한다.

**결론:** `selected` 상태·하이라이트·focusin 처리가 존재하는 것으로 보아 2단계(선택→목표 클릭) 인터랙션이 설계 의도였으나, "목표 빈 칸 클릭 → 선택 카드 이동" 분기가 배선되지 않아 빈 칸 클릭이 가드에서 걸러진다. 이것이 이동/교체 실패의 근본 원인이다.

## 4. 수정 대상 이벤트/상태 흐름 (fix scope)

수정 파일: **`iteration-check3/src/ui.js`** (필요 시 순수 전이 함수 분리를 위한 신규 `iteration-check3/src/interaction.js`). **`game.js` 는 수정하지 않는다**(순수 로직은 정상이며 회귀 위험 최소화).

### 4.1 `onBoardClick` 을 2단계 모델로 재배선
- **카드 클릭 시**: 앵커(col0 Ace)면 무시. 그 외에는 `state.selected = index` 로 **선택**하고 `render()` 로 하이라이트. (기존의 즉시 자동 이동 대신 선택 우선.)
- **빈 칸(`cell--empty`) 클릭 시**: `state.selected === null` 이면 무시. 아니면 `canMove(state.board, state.selected, clickedIndex)` 로 **그 목표 칸에 대해** 유효성 검사 후 이동. 유효하지 않으면 이동하지 않는다(선택 유지 또는 해제는 4.4 참조).
- `status !== 'playing'` 이면 전체 무시(기존 가드 유지).

### 4.2 이동 적용 로직 공유 (`tryMove` 리팩터링)
- 현재 `tryMove(i)` 는 출발지만 받아 자동 목표를 찾는다. **출발지·목표를 명시적으로 받는 이동 적용 헬퍼**(예: `moveCard(from, to)`)로 분리하여, 클릭(빈 칸)·키보드 경로가 동일 로직을 재사용하게 한다.
  - `moveCard` 책임: 타이머 최초 시작(`startedAt`/`ensureTimer`), `board[to]=card`·`board[from]=null`, `moves += 1`, `score = computeScore(board)`, `selected = null`, `checkWin` → `win()`, 아니면 `render()`.
- 목표 유효성 판정은 반드시 **클릭한 목표 인덱스**에 대해 `canMove(board, from, to)` 로 수행한다(`findTarget` 의 "첫 번째 목표 자동선택"으로 대체하지 말 것).

### 4.3 키보드 경로 정합성 (`onBoardKeydown`)
- Enter/Space 를 카드에 → 선택, 빈 칸에 → (선택된 카드 있으면) 이동. 접근성(role=gridcell, tabindex=0, aria-label)은 그대로 유지한다.
- `onBoardFocusIn` 은 포커스 이동 시 하이라이트를 갱신하되, **click/keydown 의 선택 소스와 상태(`state.selected`)를 일관되게** 유지한다.

### 4.4 선택 해제 규칙 (명시)
- 유효 목표 이동 성공 → `selected = null` (필수).
- 같은 카드 재클릭 또는 유효하지 않은 목표 클릭 시의 해제 여부는 UX 결정 사항이나, **버그 재현 불변식(§2)을 깨지 않는 선에서** 최소 구현: 유효하지 않은 목표 클릭은 이동 없이 선택을 유지한다.

### 4.5 순수 전이 함수 분리 (재현 테스트 가능성 확보)
- `ui.js` 는 `document`/`window` 에 의존하므로, §2의 상태 전이를 DOM 없이 단위 테스트하려면 **DOM 비의존 순수 전이 함수**로 분리한다.
  - 예: `iteration-check3/src/interaction.js` 에 `resolveClick(board, selected, index)` → `{ board, selected, moved }` 를 두고, `ui.js` 는 이 함수 결과를 상태/DOM에 반영만 한다.
  - 이 함수는 `game.js` 의 `canMove`/`computeScore` 만 호출하며, 선택·이동 전이를 순수하게 계산한다.
- 대안: jsdom 기반 통합 테스트. 단, 현재 저장소 테스트는 순수(node --test, jsdom 미도입)이므로 **순수 함수 분리가 최소·정합 경로**다.

## 5. 회귀 가드 범위

- **기존 순수 로직 테스트 불변**: `iteration-check3/tests/game.test.js` 는 `game.js` 를 대상으로 하며 본 수정에서 `game.js` 를 건드리지 않으므로 그대로 green 유지되어야 한다(회귀 없음 확인).
- **신규 인터랙션 단위 테스트 추가**: `iteration-check3/tests/interaction.test.js` (또는 동등)에서 §2의 재현/회귀 불변식 1~4를 검증한다.
  - (1) 선택 + 유효 목표 클릭 → 이동, `selected=null`, `moves+1`.
  - (2) 선택 + 유효하지 않은 목표 클릭 → 보드 불변.
  - (3) 이동 가능한 카드 클릭 → `selected` 설정.
  - (4) 앵커 카드는 선택/이동 대상이 아님.
- **테스트 범위**: focused. 대상 모듈은 `iteration-check3/**` 로 한정하고, 다른 게임/모듈 회귀는 실행하지 않는다.
- **검증 명령**: `iteration-check3/` 의 단위 테스트(신규 + 기존 `game.test.js`)를 실행해 모두 통과. (repo `package.json` test 는 표시용이며, focused 권한은 대상 모듈 경로에 한정된 명령이다.)

## 6. 비목표 (Non-goals)

- `game.js` 순수 로직 변경(규칙/이동 판정은 정상).
- 시각 스타일/레이아웃 변경(`styles.css` 의 색·간격 등은 유지). 선택 하이라이트(`.selected`)는 기존 클래스를 재사용한다.
- 셔플/리스타트/타이머/HUD 등 이동과 무관한 기능 변경.
- 새로운 route·API·데이터 모델 도입.
