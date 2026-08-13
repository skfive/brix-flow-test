# 15퍼즐 구현 설계 (BF-2053 / plan: BF-2056)

이 문서는 designer(BF-2054)와 developer(BF-2055)가 동일하게 따를 실행 설계와 동결(frozen) UI 계약을 제공한다.
아래 계약은 frozen blueprint 값을 그대로 서술하며, 새 파일이나 새 역할을 추가하지 않는다.

## 1. 보드 상태 모델

- 타입: `(number|null)[16]` — 4x4 보드를 나타내는 1차원 배열, 인덱스는 row-major(0=좌상단, 15=우하단).
- 값: 1~15는 숫자 타일, `null`은 빈 칸(blank) 1개.
- 목표(solved) 상태: `[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,null]`.
- 인덱스 ↔ 좌표 변환: `row = Math.floor(index / 4)`, `col = index % 4`.

## 2. 이동 규칙표

인덱스 `i`의 이동 가능한 인접 인덱스(빈 칸이 해당 위치에 있을 때만 유효):

| 방향 | 조건 | 인접 인덱스 |
| --- | --- | --- |
| 위(up) | `i >= 4` | `i - 4` |
| 아래(down) | `i < 12` | `i + 4` |
| 왼쪽(left) | `i % 4 !== 0` | `i - 1` |
| 오른쪽(right) | `i % 4 !== 3` | `i + 1` |

타일은 위 4방향 중 하나로 빈 칸과 인접할 때만 이동(빈 칸과 교환)할 수 있다. 대각선 이동은 없다.

## 3. 순수 함수 시그니처 및 반환값 계약

모든 함수는 순수 함수이며 입력 `board` 배열을 변경하지 않는다(불변성 유지).

### `canMove(board, index)`
- 입력: `board: (number|null)[16]`, `index: number` (0~15)
- 반환: `boolean`
- 규칙: `board[index]`가 `null`이 아니고, `index`가 빈 칸(`board.indexOf(null)`)과 2절의 이동 규칙표상 인접할 때만 `true`.
- 부작용: 없음(입력 배열 미변경).

### `applyMove(board, index)`
- 입력: `canMove`와 동일.
- 반환: `(number|null)[16]`
- 규칙:
  - `canMove(board, index) === true`인 경우: `index`의 타일과 빈 칸을 교환한 **새 배열**을 반환(원본 `board`는 변경되지 않고 참조도 다름).
  - `canMove(board, index) === false`인 경우: 원본 `board`와 **동일한 참조**를 그대로 반환(새 배열을 생성하지 않음). 호출부는 `applyMove(board, index) === board` 비교로 무효 이동을 판별할 수 있다.

### `isSolved(board)`
- 입력: `board: (number|null)[16]`
- 반환: `boolean`
- 규칙: `board`가 1절의 목표 상태 `[1,...,15,null]`과 정확히 일치할 때만 `true`.
- 부작용: 없음(입력 배열 미변경).

## 4. UI 계약 (동결)

아래 값은 frozen blueprint의 `ui-contract@v1`을 그대로 반영한 것이며, designer/developer는 재정의하지 않는다.

### 4.1 파일 및 소유권 (additive)

| 파일 | 소유자 |
| --- | --- |
| `docs/design/fifteen-puzzle-BF-2053-mockup.html` | designer |
| `docs/design/fifteen-puzzle-BF-2053.md` | designer |
| `fifteen-puzzle/index.html` | developer |
| `fifteen-puzzle/puzzle.js` | developer |
| `fifteen-puzzle/puzzle.test.js` | developer |
| `fifteen-puzzle/style.css` | developer |

모든 파일의 artifact-policy는 `additive`(기존 내용을 재정의하지 않고 추가만 함)이다.

### 4.2 DOM id / class

- id: `puzzle-board`, `puzzle-shuffle-button`, `puzzle-move-count`, `puzzle-timer`, `puzzle-success-message`
- class: `puzzle-tile`, `puzzle-tile--blank`, `puzzle-tile--movable`

### 4.3 상태(states)

`idle` → `shuffling` → `playing` → `solved` 4개 상태를 사용한다. 초기화·취소·실패 뒤에는 상태와 진행 표시(이동 횟수/타이머 등)를 초기값으로 되돌리고, 주 실행 control(`puzzle-shuffle-button`)을 다시 사용할 수 있어야 한다.

### 4.4 디자인 토큰

- `--color-tile-bg: #2563eb`
- `--color-tile-text: #ffffff`
- `--color-board-bg: #0f172a`
- `--space-tile-gap: 6px`

### 4.5 접근성

- 각 숫자 타일은 `aria-label="타일 N"` 형식으로 값을 노출한다.
- 빈 칸 요소는 `aria-hidden="true"`로 표기한다.
- `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` 키로 빈 칸에 인접한 타일을 이동할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(accessible name)으로 노출한다.

### 4.6 반응형

- 320px 이상 뷰포트에서 4x4 보드가 overflow 없이 정사각 비율로 렌더링된다.

## 5. 후조건 요약

- `docs/plans/BF-2053/implementation-plan.md`(본 문서)는 plan 패킷의 유일한 산출물이다.
- designer/developer는 본 문서의 보드 모델·순수 함수 시그니처·UI 계약을 그대로 따르며, selector·상태명·토큰·함수 시그니처를 재정의하지 않는다.
- 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 그대로 설명할 뿐 새 파일·역할을 추가하지 않는다.
