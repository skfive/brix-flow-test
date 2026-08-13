# BF-2068 · 틱택토 구현 설계 및 UI 계약

> 상위 티켓: BF-2065 (틱택토)
> 본 문서는 designer(BF-2066)·developer(BF-2067)가 병렬 착수할 수 있도록 상태 전이표, acceptance criteria, 순수함수 계약, frozen UI 계약을 동결한다.

## 1. 상태 전이표 (in-progress / x-win / o-win / draw, 입력 잠금)

### 1.1 상태 정의

보드(게임 전체) 상태 4종:

| 상태 | 설명 |
| --- | --- |
| in-progress | 게임 진행 중. 빈 칸 클릭 가능, X/O가 번갈아 착수(첫 착수는 X) |
| x-win | X가 가로/세로/대각선 중 한 줄을 완성. 보드 입력 잠금, 승리한 3칸에 `cell--win` 부여 |
| o-win | O가 가로/세로/대각선 중 한 줄을 완성. 보드 입력 잠금, 승리한 3칸에 `cell--win` 부여 |
| draw | 9칸이 모두 채워졌고 승자가 없음. 보드 입력 잠금 |

칸(개별 셀) 상태 2종 — 보드 상태와 별개 계층으로 동시에 성립한다:

| 상태 | 설명 |
| --- | --- |
| empty | 아직 마크되지 않은 칸. `in-progress`에서만 클릭 가능 |
| marked(X\|O) | 착수 완료된 칸. 이후 클릭 무시 |

- `x-win`/`o-win`/`draw`는 보드 전체에 적용되는 입력 잠금(input-locked) 게이트다. `in-progress`에서만 칸 클릭이 유효하다.
- 착수 순번(현재 차례가 X인지 O인지)은 `in-progress`의 하위 값이며 별도 top-level 상태로 취급하지 않는다.

### 1.2 전이 목록

보드는 9칸, index 0~8 (row = ⌊index/3⌋+1, col = index%3+1, 1부터 시작, 좌상단 = 1,1).

| # | From | 트리거 | To | Guard | 효과 |
| --- | --- | --- | --- | --- | --- |
| T1 | in-progress | 빈 칸 클릭(또는 포커스 상태 Enter/Space) | in-progress (유지) | 대상 칸이 empty AND 착수 후 승리/무승부 미충족 | 대상 칸이 현재 차례 플레이어 기호로 marked. 차례가 상대 플레이어로 전환. `#status` 텍스트가 다음 차례로 갱신 |
| T2 | in-progress | 빈 칸 클릭으로 가로/세로/대각선 한 줄 완성 | x-win 또는 o-win | 대상 칸이 empty AND 착수 결과 3목 완성 | 대상 칸 marked. 완성된 줄(들)의 3칸 전체에 `cell--win` 부여(두 줄이 동시에 완성되면 두 줄의 합집합에 부여). 보드 입력 잠금. `#status` 텍스트가 승리 결과로 갱신 |
| T3 | in-progress | 빈 칸 클릭으로 9칸 전부 충족, 승리 줄 없음 | draw | 대상 칸이 empty AND 착수 후 빈 칸 0개 AND 승리 줄 없음 | 대상 칸 marked. 보드 입력 잠금. `#status` 텍스트가 무승부로 갱신 |
| T4 | 임의 상태(in-progress/x-win/o-win/draw) | `#restart-btn` 클릭(또는 Enter/Space) | in-progress(초기화) | 없음(항상 가능) | 9칸 전부 empty로 재생성, 차례를 X로 재설정, 모든 `cell--win` 제거, `#status` 텍스트를 "X의 차례입니다"로 재설정, 보드 입력 잠금 해제 |

### 1.3 무효 전이 / edge case (원천 차단)

- 이미 marked(X 또는 O)된 칸을 다시 클릭 → 무시(상태 변화 없음).
- 보드가 x-win/o-win/draw(입력 잠금)인 동안 임의 칸 클릭 → 무시. `#restart-btn`만 유효.
- 한 번의 착수로 두 줄이 동시에 완성되는 경우(예: 코너 착수로 가로+대각선 동시 완성) → `cell--win`은 완성된 모든 줄의 칸 합집합에 부여(중복 없이).
- **후조건 불변식**: 재시작(T4) 완료 직후 보드·차례·상태 텍스트는 초기값으로 되돌아가고, 칸 클릭(주 실행 control)을 즉시 다시 사용할 수 있어야 한다.

## 2. Acceptance Criteria (Given/When/Then)

**AC-1 착수 및 차례 전환**
Given 보드가 in-progress이고 대상 칸이 empty다
When 사용자가 그 칸을 클릭(또는 포커스 상태에서 Enter/Space)한다
Then 그 칸이 현재 차례 플레이어 기호(X 또는 O)로 marked되고, 차례가 상대 플레이어로 전환되며 `#status` 텍스트가 갱신된다

**AC-2 이미 marked된 칸 재클릭 가드**
Given 특정 칸이 이미 marked다
When 사용자가 그 칸을 다시 클릭한다
Then 아무 상태 변화도 일어나지 않는다

**AC-3 가로/세로/대각선 승리 판정**
Given in-progress이고 어떤 플레이어가 착수 시 가로·세로·대각선 중 한 줄을 완성한다
When 그 착수가 이루어진다
Then 상태가 x-win 또는 o-win으로 전이되고, 완성된 줄의 3칸에만 `cell--win`이 부여되며 보드가 입력 잠금된다

**AC-4 무승부 판정**
Given 8칸까지 채워져 있고 마지막 빈 칸에 착수해도 승리 줄이 만들어지지 않는다
When 그 착수가 이루어진다
Then 상태가 draw로 전이되고 보드가 입력 잠금된다

**AC-5 입력 잠금 가드**
Given 상태가 x-win, o-win 또는 draw다
When 사용자가 임의의 칸을 클릭한다
Then 아무 상태 변화도 일어나지 않는다(클릭 무시)

**AC-6 재시작**
Given 게임이 진행 중이거나(in-progress) 종료(x-win/o-win/draw)되었다
When 사용자가 `#restart-btn`을 클릭(또는 Enter/Space)한다
Then 9칸이 모두 empty로 초기화되고 차례가 X로 재설정되며 모든 `cell--win`이 제거되고 칸 클릭이 즉시 다시 가능하다

**AC-7 접근성 — 키보드 조작 및 상태 텍스트 노출**
Given 사용자가 키보드만 사용한다
When Tab으로 각 칸과 `#restart-btn`에 포커스를 이동하고 Enter 또는 Space를 누른다
Then 마우스 클릭과 동일하게 각 컨트롤이 동작하며, 각 칸의 `aria-label`이 "칸 {row},{col}" 형식으로 위치를 텍스트로 노출하고 `#status`는 색상이 아닌 텍스트로 현재 상태(진행 중인 플레이어 차례/승리/무승부)를 노출한다

**AC-8 반응형**
Given 뷰포트 너비가 320px 이상이다
When `#board`의 3x3 칸 그리드가 렌더링된다
Then 가로 스크롤(overflow) 없이 컨테이너 너비 안에 표시된다

## 3. 순수함수 계약

developer는 `tictactoe.js`에서 아래 순수함수를 분리 구현하고 `tictactoe.test.js`에서 단위 검증한다. 보드 표현은 길이 9 배열, 각 값은 `'X' | 'O' | null`, index = row*3+col(0-based).

### 3.1 `checkWinner(board)`

- **입력**: 길이 9 배열 `board`
- **출력**: `{ winner: 'X' | 'O' | null, lines: number[][] }` — `winner`는 승자 기호 또는 승자 없으면 `null`. `lines`는 완성된 모든 승리 줄(각 3개 index)의 배열이며, 승리 없으면 빈 배열
- **방어**: 길이가 9가 아니면 `{ winner: null, lines: [] }` 반환(throw 하지 않음)

경계값 테스트 케이스 (최소 6개):

| # | 입력 | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | 전부 `null` | `{winner:null, lines:[]}` | 빈 보드 |
| 2 | 가로 한 줄 X(`[0,1,2]`) 완성, 나머지 null | `{winner:'X', lines:[[0,1,2]]}` | 가로 승리 |
| 3 | 세로 한 줄 O(`[0,3,6]`) 완성 | `{winner:'O', lines:[[0,3,6]]}` | 세로 승리 |
| 4 | 대각선(`[0,4,8]`) X 완성 | `{winner:'X', lines:[[0,4,8]]}` | 대각선 승리 |
| 5 | 반대각선(`[2,4,6]`) O 완성 | `{winner:'O', lines:[[2,4,6]]}` | 반대각선 승리 |
| 6 | 두 줄 동시 완성(예: 가로+대각선) | `{winner:'X', lines:[[...],[...]]}` (두 줄 모두 포함) | 동시 완성 |

### 3.2 `isDraw(board, checkWinnerResult)`

- **입력**: 길이 9 배열 `board`, `checkWinner(board)`의 반환값
- **출력**: `boolean` — 보드에 빈 칸(`null`)이 없고 `checkWinnerResult.winner === null`일 때만 `true`
- **방어**: 길이가 9가 아니면 `false` 반환

경계값 테스트 케이스 (최소 4개):

| # | 입력 | 기대 | 비고 |
| --- | --- | --- | --- |
| 1 | 전부 `null` | `false` | 빈 보드 |
| 2 | 가득 찼고 승자 있음 | `false` | 승자 우선 |
| 3 | 가득 찼고 승자 없음 | `true` | 무승부 |
| 4 | 일부만 채워짐, 승자 없음 | `false` | 진행 중 |

## 4. UI 계약 (frozen — designer/developer는 selector·token을 변경·재정의하지 않는다)

### 4.1 산출물 파일

| 경로 | 소유 페르소나 |
| --- | --- |
| `docs/design/BF-2065/design-spec.md` | designer |
| `docs/design/BF-2065/mockup.html` | designer |
| `tictactoe/index.html` | developer |
| `tictactoe/style.css` | developer |
| `tictactoe/tictactoe.js` | developer |
| `tictactoe/tictactoe.test.js` | developer |

### 4.2 DOM ID / class

- ID: `#board`, `#status`, `#restart-btn`
- class: `.board`(`#board`에 동시 부여), `.cell`(칸 공통), `.cell--win`(승리 줄 칸에만 추가), `.status`(`#status`에 동시 부여), `.restart-btn`(`#restart-btn`에 동시 부여)

### 4.3 상태별 `#status` 텍스트 (canonical copy — 변경 금지)

| 상태 | `#status` 텍스트 |
| --- | --- |
| in-progress, X 차례 | `X의 차례입니다` |
| in-progress, O 차례 | `O의 차례입니다` |
| x-win | `X 승리!` |
| o-win | `O 승리!` |
| draw | `무승부입니다` |

### 4.4 Design Token

| 변수 | 값 | 적용 대상 |
| --- | --- | --- |
| `--color-cell-bg` | `#ffffff` | `.cell` 배경 |
| `--color-cell-border` | `#333333` | `.cell` 테두리 |
| `--color-x` | `#2563eb` | X 마크 색상 |
| `--color-o` | `#dc2626` | O 마크 색상 |
| `--color-win-highlight` | `#facc15` | `.cell--win` 강조 배경/테두리 |
| `--space-board-gap` | `8px` | `.board`(`#board`) grid gap |

### 4.5 접근성

- 각 칸 버튼: `aria-label="칸 {row},{col}"` (row/col은 1~3, 좌상단이 1,1)
- `#restart-btn`: `aria-label="다시 시작"`, 키보드 Tab 이동과 Enter 실행 가능
- 모든 상태는 색상만으로 구분하지 않고 `#status` 텍스트(4.3)로 노출

### 4.6 반응형

- 320px 이상 뷰포트에서 `#board`의 3x3 그리드가 컨테이너 너비를 넘지 않고 overflow 없이 렌더링된다

## 5. 파일 소유권 및 정책

- 위 4.1 표의 소유권과 4장 전체(selector/token/텍스트)는 frozen 계약이며, 이 문서가 유일한 권위다. designer/developer 산출물은 additive(신규 파일 생성)로만 반영하고 본 계약을 재정의하지 않는다.
- 새 파일이나 새 역할을 추가하지 않는다 — 4.1의 6개 파일 외 산출물은 이 계약 범위 밖이다.
