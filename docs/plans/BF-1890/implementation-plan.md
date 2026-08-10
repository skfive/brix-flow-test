# 스네이크 게임 구현 설계 (BF-1897)

- 관련 Jira: BF-1890 (Epic), BF-1897 (본 planner task), BF-1896 (developer task — 본 문서를 그대로 따름)
- 산출물 파일: `games/snake.html` (단일 파일, HTML+CSS+JS 인라인)
- 파일 소유자: `games/snake.html -> developer` (frozen blueprint 권위, 본 문서는 이를 재정의하지 않음)
- artifact 정책: `games/snake.html`은 additive — 기존 파일이 없으므로 developer가 신규 생성한다.

## 1. 사용자 시나리오

1. 사용자가 `games/snake.html`을 브라우저로 열면 idle 상태 화면이 표시되고, 점수판과 게임 시작 안내가 보인다.
2. 사용자가 방향키를 눌러 게임을 시작하면 뱀이 이동하며 playing 상태가 된다.
3. 뱀이 먹이를 먹으면 점수가 오르고 뱀 길이가 늘어난다.
4. 뱀이 벽 또는 자기 몸에 부딪히면 game-over 상태로 전환되고 최종 점수가 표시된다.
5. 사용자가 "다시 시작" 버튼을 누르면 idle 상태를 거치지 않고 즉시 새 게임(playing)이 시작되며 점수·뱀 위치·진행 상태가 모두 초기값으로 복귀한다.

## 2. Acceptance Criteria (Given/When/Then)

### AC-1. 초기 idle 상태
- Given: 페이지를 처음 로드했을 때
- When: 사용자가 아직 방향키를 누르지 않음
- Then: `#game-canvas`는 idle 상태 뷰를 렌더링하고, `#score-display`는 0점을 표시하며, `.game-over-message`는 화면에 노출되지 않는다.

### AC-2. 방향키 조작으로 게임 시작
- Given: idle 상태
- When: 사용자가 화살표 키(↑/↓/←/→) 중 하나를 누름
- Then: 상태가 playing으로 전환되고 뱀이 해당 방향으로 이동을 시작한다.

### AC-3. 이동 중 방향 전환
- Given: playing 상태
- When: 사용자가 현재 이동 방향의 반대 방향이 아닌 다른 화살표 키를 누름
- Then: 뱀의 다음 이동 방향이 갱신된다.
- Given: playing 상태
- When: 사용자가 현재 이동 방향과 정반대인 화살표 키를 누름(예: 오른쪽 이동 중 왼쪽 키)
- Then: 입력은 무시되고 기존 방향을 유지한다(즉시 자기 몸 충돌로 이어지는 180도 반전 방지).

### AC-4. 먹이 섭취와 점수
- Given: playing 상태에서 뱀 머리가 먹이 좌표와 겹침
- When: 다음 이동 tick이 처리됨
- Then: 점수가 고정 단위만큼 증가하고, 뱀 길이가 1칸 늘어나며, 새 먹이가 뱀이 차지하지 않은 빈 칸에 무작위로 재배치된다. `#score-display`(`aria-live="polite"`)가 갱신된 점수를 알린다.

### AC-5. 벽 충돌
- Given: playing 상태
- When: 뱀 머리가 게임판 경계를 벗어나는 위치로 이동함
- Then: 상태가 game-over로 전환되고 `.game-over-message`가 표시되며 이동이 멈춘다.

### AC-6. 자기 몸 충돌
- Given: playing 상태
- When: 뱀 머리가 자신의 몸통 칸과 같은 좌표로 이동함
- Then: 상태가 game-over로 전환되고 `.game-over-message`가 표시되며 이동이 멈춘다.

### AC-7. 재시작
- Given: game-over 상태
- When: 사용자가 `#restart-button`(`aria-label="게임 다시 시작"`)을 클릭하거나 Enter로 활성화함
- Then: 점수가 0으로 초기화되고, 뱀이 초기 위치·길이·방향으로 재배치되며, 먹이가 새로 배치되고, 상태가 playing으로 전환되며 `.game-over-message`가 사라진다. 재시작 직후에도 `#restart-button`은 다시 사용할 수 있는 상태를 유지한다.

### AC-8. 상태의 텍스트 노출(접근성)
- Given: 임의의 상태(idle/playing/game-over)
- When: 상태가 전환됨
- Then: 상태는 색상만으로 구분되지 않고, 상태명이 화면 텍스트 및 접근성 이름(예: `aria-label`, 텍스트 콘텐츠)으로 함께 노출된다.

### AC-9. 반응형
- Given: 뷰포트 폭이 320px 이상인 임의의 화면
- When: 게임 화면을 렌더링함
- Then: `.game-container` 내부의 `#game-canvas`와 `.score-board`가 겹치거나 잘리지 않고 모두 표시된다.

## 3. 구현 설계

### 3.1 파일 구조 (단일 파일)
`games/snake.html` 하나에 `<style>`(CSS) + `<body>` 마크업 + `<script>`(게임 로직)를 모두 인라인으로 포함한다. 외부 리소스 의존 없이 파일을 열면 바로 동작해야 한다.

### 3.2 DOM 구조 / ID / class (frozen — 변경·재정의 금지)
- `#game-canvas`: 게임 보드를 렌더링하는 요소(canvas 또는 grid 컨테이너).
- `#score-display`: 현재 점수 표시. `aria-live="polite"` 필수.
- `#game-over-overlay`: game-over 상태에서 노출되는 오버레이 컨테이너.
- `#restart-button`: 재시작 버튼. `aria-label="게임 다시 시작"` 필수.
- `.game-container`: 전체 게임 레이아웃을 감싸는 최상위 컨테이너.
- `.score-board`: 점수판 영역.
- `.game-over-message`: game-over 상태 안내 텍스트(상태명을 텍스트로 노출).

### 3.3 게임 상태
`idle | playing | game-over` 3개 상태를 명시적 상태 머신으로 관리한다(예: 최상위 컨테이너에 `data-state` 속성 반영 권장). 상태 전환:
- idle → playing: 최초 방향키 입력
- playing → game-over: 벽 충돌 또는 자기 몸 충돌
- game-over → playing: 재시작 버튼 활성화

### 3.4 방향키 조작
- `keydown` 이벤트로 `ArrowUp/ArrowDown/ArrowLeft/ArrowRight`를 처리한다.
- 현재 이동 방향과 정반대 방향 입력은 무시한다(AC-3).
- 같은 tick 내 중복 입력은 마지막 유효 입력만 다음 이동에 반영한다.

### 3.5 이동 및 충돌 판정
- 고정 tick 간격(setInterval 또는 requestAnimationFrame 기반 타이머)마다 뱀 머리를 현재 방향으로 한 칸 이동시키고, 몸통 배열의 뒤쪽 한 칸을 제거한다(먹이를 먹은 경우 제거하지 않아 길이가 늘어남).
- 벽 충돌: 새 머리 좌표가 보드 경계(0 ≤ x < 열 수, 0 ≤ y < 행 수) 밖이면 game-over.
- 자기 몸 충돌: 새 머리 좌표가 이동 후 몸통 좌표 목록(머리 제외) 중 하나와 일치하면 game-over.
- 두 판정은 이동 처리 시 매 tick 수행하며, 어느 하나라도 해당하면 즉시 game-over로 전환하고 타이머를 정지한다.

### 3.6 점수 계산
- 먹이 1개 섭취당 고정 점수(예: +10)를 더한다.
- 점수는 `#score-display` 텍스트로 즉시 갱신하고 `aria-live="polite"`로 스크린리더에 알린다.

### 3.7 재시작 동작
- `#restart-button` 클릭/Enter 시: 타이머 정리 → 점수 0 초기화 → 뱀을 초기 좌표/길이/방향으로 재설정 → 먹이 재배치(뱀이 차지하지 않은 칸 중 무작위) → 상태를 playing으로 전환 → `.game-over-message` 및 `#game-over-overlay` 숨김 → 새 이동 타이머 시작.
- 재시작은 idle 상태를 거치지 않고 바로 playing으로 진입한다(3.3 참고).

### 3.8 CSS 변수 (frozen — exact 값)
```
--color-bg: #111111
--color-snake: #4ade80
--color-food: #f87171
--color-text: #f8fafc
```

### 3.9 접근성 (frozen)
- `#restart-button`은 `aria-label="게임 다시 시작"`을 갖는다.
- `#score-display`는 `aria-live="polite"`로 점수 갱신을 알린다.
- 모든 상태(idle/playing/game-over)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

### 3.10 반응형 (frozen)
- 320px 이상 뷰포트에서 `#game-canvas`와 `.score-board`가 겹치거나 잘리지 않도록 레이아웃(flex/grid + 상대 단위)을 구성한다.

## 4. Edge Case / 실패 케이스

- 먹이 재배치 시 뱀 몸통이 보드 전체를 채워 빈 칸이 없는 극단적 경우: 더 이상 배치할 칸이 없으므로 승리/정지 처리(게임 진행 중단)로 다루되, game-over 상태와 동일하게 상태명을 텍스트로 노출한다.
- playing 상태에서 게임 로직과 무관한 키 입력: 무시하고 상태 변화 없음.
- game-over 상태에서 방향키 입력: 무시(재시작 버튼으로만 재시작 가능).
- 재시작 버튼 연타: 매 클릭마다 위 3.7 절차를 처음부터 재수행하며 진행 중이던 타이머가 중복 생성되지 않도록 이전 타이머를 정리한 뒤 재시작한다.
- 매우 좁은 뷰포트(320px 부근)에서도 `.game-container` 내부 요소가 겹치거나 잘리지 않아야 한다(3.10).

## 5. Developer 참고

- 본 문서(`docs/plans/BF-1890/implementation-plan.md`)와 frozen `ui-contract`(DOM/상태/토큰/접근성/반응형)를 그대로 구현하며, selector·token 값을 변경하거나 재정의하지 않는다.
- `games/snake.html`은 developer(BF-1896)가 신규 생성하는 단일 파일이며, 본 계획은 새로운 파일이나 역할을 추가하지 않는다.
