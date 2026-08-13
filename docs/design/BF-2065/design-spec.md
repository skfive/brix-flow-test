# 틱택토 UI 디자인 명세 (BF-2066)

> 상위 티켓: BF-2065 (틱택토)
> 본 문서는 `docs/plans/BF-2065/implementation-plan.md` 4장의 frozen UI 계약을 그대로 반영한 시각 명세다. DOM id/class, 상태 텍스트, design token, 접근성, 반응형 기준은 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: 3x3 틱택토 보드, 현재 상태를 알려주는 상태 텍스트 영역, 재시작 버튼으로 구성된 단일 화면 게임 UI.
- **사용자 경험 목표**:
  - 사용자가 빈 칸을 클릭(또는 키보드 Tab + Enter/Space)해서 즉시 착수할 수 있어야 한다.
  - 현재 차례(X/O), 승리, 무승부 상태를 색상뿐 아니라 텍스트로 항상 명확히 인지할 수 있어야 한다.
  - 승리 시 완성된 줄의 3칸이 시각적으로 즉시 구분되어야 한다.
  - 언제든 재시작 버튼으로 게임을 초기 상태로 되돌릴 수 있어야 한다.
- **비목표**: 점수판, 난이도 선택, 애니메이션 트랜지션, 사운드 등은 이 시안 범위 밖이다.

## 2. 컬러 팔레트 (design token — frozen, 값 변경 금지)

| 토큰 | 값 | 적용 대상 |
| --- | --- | --- |
| `--color-cell-bg` | `#ffffff` | `.cell` 배경 |
| `--color-cell-border` | `#333333` | `.cell` 테두리 |
| `--color-x` | `#2563eb` | X 마크 색상 |
| `--color-o` | `#dc2626` | O 마크 색상 |
| `--color-win-highlight` | `#facc15` | `.cell--win` 강조 배경/테두리 |
| `--space-board-gap` | `8px` | `.board`(`#board`) grid gap |

보조 색상(토큰 외, 배경/텍스트용 — 자유 조정 가능):

| 용도 | 값 |
| --- | --- |
| 페이지 배경 | `#f3f4f6` |
| 카드/컨테이너 배경 | `#ffffff` |
| 상태 텍스트 색상 | `#1f2937` |
| 재시작 버튼 배경 | `#2563eb` |
| 재시작 버튼 텍스트 | `#ffffff` |
| 재시작 버튼 hover 배경 | `#1d4ed8` |

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 페이지 제목(선택 요소) | system-ui, sans-serif | 24px | 700 | 1.3 |
| `#status` 상태 텍스트 | system-ui, sans-serif | 18px | 600 | 1.4 |
| 칸(X/O) 마크 | system-ui, sans-serif | 48px | 700 | 1 |
| `#restart-btn` 버튼 텍스트 | system-ui, sans-serif | 16px | 600 | 1.2 |

- 별도 웹폰트를 사용하지 않는다 — system font stack만 사용(외부 의존성 0건 원칙, `vanilla-static` 스택 규약 준수).

## 4. 레이아웃

- 전체 화면은 세로 스택(제목 → 상태 텍스트 → 보드 → 재시작 버튼) 중앙 정렬.
- `#board`는 3열 3행 CSS grid, `grid-template-columns: repeat(3, 1fr)`, `gap: var(--space-board-gap)`.
- 각 `.cell`은 정사각형(`aspect-ratio: 1 / 1`)으로 렌더링해 보드 비율을 유지한다.
- 보드 컨테이너 최대 너비: `360px`, 뷰포트가 좁을 때는 `width: min(90vw, 360px)`로 축소.
- **반응형(320px 이상)**: `#board`는 컨테이너 너비를 넘지 않고 overflow(가로 스크롤) 없이 렌더링되어야 한다. 320px 뷰포트에서도 grid와 gap이 유지되며 각 셀이 비례 축소된다.
- 상태 텍스트(`#status`)와 재시작 버튼(`#restart-btn`)은 보드 위/아래에 각각 16px 여백을 두고 배치한다.

## 5. 컴포넌트 명세

### 5.1 `#board` (`.board`)

- **역할**: 9칸 게임판 컨테이너.
- **DOM**: `<div id="board" class="board" role="grid">` 안에 9개의 칸 버튼.
- **상태**: `in-progress`에서만 내부 칸 클릭 가능. `x-win`/`o-win`/`draw`에서는 보드 전체 입력 잠금(칸 클릭 무시).

### 5.2 `.cell` (칸, 9개)

- **역할**: 개별 착수 버튼.
- **DOM**: `<button class="cell" aria-label="칸 {row},{col}">` — row/col은 1~3, 좌상단이 (1,1).
- **props/상태**:
  - `empty`: 텍스트 없음, 클릭 시 T1/T2/T3 전이 트리거.
  - `marked(X|O)`: 내부에 `X` 또는 `O` 텍스트, 이후 클릭 무시(AC-2).
  - `cell--win`: 승리 확정 시 완성된 줄의 3칸에만 추가되는 modifier class. `--color-win-highlight` 배경/테두리 강조로 표현.
- **인터랙션**: 마우스 클릭 및 키보드 포커스 + Enter/Space로 동일하게 동작(AC-7).

### 5.3 `#status` (`.status`)

- **역할**: 현재 게임 상태를 텍스트로 노출하는 라이브 영역.
- **DOM**: `<p id="status" class="status">`.
- **상태별 canonical 텍스트(frozen, 변경 금지)**:

| 상태 | `#status` 텍스트 |
| --- | --- |
| in-progress, X 차례 | `X의 차례입니다` |
| in-progress, O 차례 | `O의 차례입니다` |
| x-win | `X 승리!` |
| o-win | `O 승리!` |
| draw | `무승부입니다` |

- 색상만으로 상태를 구분하지 않고 항상 위 텍스트로 노출한다.

### 5.4 `#restart-btn` (`.restart-btn`)

- **역할**: 게임을 초기 상태로 되돌리는 버튼.
- **DOM**: `<button id="restart-btn" class="restart-btn" aria-label="다시 시작">다시 시작</button>`.
- **인터랙션**: 클릭 또는 포커스 상태에서 Enter/Space로 언제나(any 상태에서) 실행 가능(T4, AC-6). 키보드 Tab 이동 가능.
- **효과**: 9칸 전부 empty로 재생성, 차례 X로 재설정, 모든 `cell--win` 제거, `#status`를 `X의 차례입니다`로 재설정, 보드 입력 잠금 해제.

## 6. dev 구현 가이드

1. `tictactoe/index.html`에 `#board.board`(9개 `.cell` 버튼 포함), `#status.status`, `#restart-btn.restart-btn`을 정확히 이 id/class로 마크업한다. 신규 id/class를 추가로 도입하지 않는다.
2. `tictactoe/style.css`에서 `:root`에 §2의 6개 design token(`--color-cell-bg`, `--color-cell-border`, `--color-x`, `--color-o`, `--color-win-highlight`, `--space-board-gap`)을 정의하고, `.cell`/`.cell--win`/`.board`에 그대로 적용한다. 하드코딩된 색상 대신 토큰 변수를 참조한다.
3. `.board`는 `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-board-gap);`으로 구현하고, 320px 뷰포트에서 overflow가 발생하지 않도록 `max-width`/`min(90vw, ...)` 방식으로 축소되게 한다(§4).
4. 각 `.cell`은 `aria-label="칸 {row},{col}"`(1-based, 좌상단 1,1)을 부여하고, `<button>` 요소로 구현해 기본 키보드 포커스/Enter/Space 동작을 그대로 활용한다.
5. `#restart-btn`은 `aria-label="다시 시작"`을 부여하고 항상(모든 보드 상태에서) 활성 상태를 유지한다.
6. `#status` 텍스트는 §5.3 표의 5개 문자열을 정확히 그대로 사용한다(문구 변경 금지).
7. `tictactoe.js`는 `docs/plans/BF-2065/implementation-plan.md` 3장의 `checkWinner(board)` / `isDraw(board, checkWinnerResult)` 순수함수 계약과 1장의 상태 전이표(T1~T4)를 그대로 구현한다 — 이 문서(design-spec.md)는 DOM/시각 계약만 다루며 로직 계약의 권위는 implementation-plan.md에 있다.
8. 승리 시 완성된 모든 줄의 합집합 칸에 `cell--win`을 부여한다(두 줄 동시 완성 케이스 포함).

## 7. mockup 참조

- 시각 mockup: `docs/design/BF-2065/mockup.html`
- mockup은 `in-progress`(X 차례), `o-win`, `draw` 3가지 상태를 정적 스냅샷 섹션으로 나란히 보여준다.
- HTML id 유일성 제약 때문에 frozen id(`#board`, `#status`, `#restart-btn`)는 대표 상태(`in-progress`) 섹션 1곳에만 부여하고, 나머지 상태(`o-win`, `draw`) 참조 섹션은 동일한 frozen class(`.board`, `.cell`, `.cell--win`, `.status`, `.restart-btn`)만 재사용해 id 중복 없이 시각적으로 표현한다.
