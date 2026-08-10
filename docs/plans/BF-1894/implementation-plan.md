# 2048 게임 구현 설계 (BF-1894)

> 작성: 박기획 (planner) · Task: BF-1904
> 이 문서는 frozen Execution Blueprint(`planning-contract@v1`, `ui-contract@v1`)를 렌더링한 실행 설계입니다.
> developer는 이 문서와 frozen blueprint의 파일·소유자·상태·후조건을 그대로 따르며, 새 파일이나 역할을 추가하지 않습니다.

## 0. 실행 개요

- 대상: 4×4 그리드 2048 퍼즐 게임 (이동·병합·타일 스폰·승리/게임오버 판정).
- **파일 제약(frozen invariant): `games/2048.html` 단일 파일**에 HTML/CSS/JS를 모두 인라인으로 구현한다. 외부 CDN·라이브러리(폰트·아이콘·프레임워크·번들러 등) 로드를 금지한다.
- 실행 방식: `serve_root "."` 기준 정적 파일이며, 브라우저에서 `games/2048.html`을 직접 열거나(`file://`) 정적 서버(`/games/2048.html`)로 서빙해 실행 가능해야 한다.
- 격리 원칙: 다른 module 코드를 참조하지 않고 `games/2048.html` 내부에 자기완결적으로 구현한다. (frozen invariant: `artifact-policy:games/2048.html:additive`)
- 번들러/빌드 스텝 없음. 모듈 시스템 사용 여부(ESM `<script type="module">` 포함 여부)는 developer 재량이며 계약 대상이 아니다.

## 1. 파일 소유권 · 상태 계약 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `games/2048.html` | developer | additive | 진입 문서 · DOM 뼈대 · 스타일 · 게임 로직 전체 |

> 파일 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 재정의하지 않는다.
> 본 task의 frozen Execution Blueprint에는 designer 산출물이 없다 — developer 외 새 파일·역할을 추가하지 않는다.

## 2. UI 계약 (ui-contract@v1 — selector·token 변경/재정의 금지)

### 2.1 DOM ID (frozen)

`game-board`, `score-value`, `game-message`, `restart-button`

### 2.2 CSS class (frozen)

`tile`, `tile-new`, `tile-merged`, `game-container`, `message-overlay`

### 2.3 DOM 구조 (예시 — 태그·부가 class·속성 배치는 developer 재량, 위 ID/class는 그대로 사용)

```html
<div class="game-container">
  <div class="score-panel">
    <span id="score-value">0</span>
  </div>

  <div id="game-board" aria-label="2048 게임판">
    <!-- 4x4 셀. 타일 엘리먼트는 class="tile" 필수.
         새로 스폰된 타일: class="tile tile-new"
         이번 이동에서 병합된 타일: class="tile tile-merged" -->
  </div>

  <div id="game-message" class="message-overlay" role="status">
    <!-- 상태 텍스트. DOM에는 항상 존재(role=status 알림용).
         idle/playing: 시각적으로 숨김(CSS) 가능, won/gameover: 시각적으로 노출 -->
  </div>

  <button id="restart-button" aria-label="다시 시작">다시 시작</button>
</div>
```

### 2.4 게임 상태 (states, frozen)

`idle` → `playing` → `won` / `gameover` → (재시작) → `idle`

| 상태 | 진입 조건 | `game-message` 텍스트(예시) | 입력 처리 |
| --- | --- | --- | --- |
| `idle` | 최초 로드 / 재시작 직후 (타일 2개 스폰 완료, 아직 이동 없음) | "게임 준비" | 방향키 이동 가능 → 첫 이동 시 `playing` |
| `playing` | `idle`에서 첫 방향키 이동 발생 | "게임 진행 중" | 방향키 이동 가능 |
| `won` | 병합 결과 `2048` 타일이 처음 생성됨 | "2048 달성! 승리했습니다" | 방향키 이동 무시, 재시작만 유효 |
| `gameover` | 빈 셀이 없고 4방향 모두 이동/병합 불가 | "더 이상 이동할 수 없습니다. 게임 오버" | 방향키 이동 무시, 재시작만 유효 |

- 문구 자체는 developer 재량이나, **상태명을 유추할 수 있는 정보를 반드시 포함**해야 한다(§2.6 접근성 요구와 연결).
- **모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 노출**한다.
- **초기화·취소·실패(재시작) 뒤에는 상태와 진행 표시(`score-value`)를 초기값(`idle`, `0`)으로 되돌리고, 주 실행 control(`restart-button`)을 다시 사용할 수 있어야 한다.**

### 2.5 디자인 토큰 (frozen CSS 변수 — `games/2048.html` `:root`에 정의)

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--board-bg` | `#bbada0` | 보드 배경 |
| `--cell-bg` | `#cdc1b4` | 빈 셀 배경 |
| `--tile-bg-2` | `#eee4da` | 값 2 타일 배경(최소값 기준색) |
| `--tile-bg-2048` | `#edc22e` | 값 2048 타일 배경(최대값 기준색) |
| `--tile-text-light` | `#f9f6f2` | 밝은 배경(고배율 타일)에 쓰는 텍스트색 |
| `--tile-text-dark` | `#776e65` | 어두운 배경(저배율 타일)에 쓰는 텍스트색 |

- 위 6개 토큰 이름·값은 재정의하지 않는다. `4`~`1024` 등 중간 값 타일의 배경색은 frozen 대상이 아니며, `--tile-bg-2`와 `--tile-bg-2048` 사이를 보간하는 별도 색상 상수(예: `--tile-bg-4`, `--tile-bg-8`, ...)를 developer가 추가로 정의할 수 있다(신규 CSS 변수 추가는 additive라 허용, 단 위 6개 변수명/값 변경은 금지).
- 텍스트색은 값이 커질수록(배경이 진해질수록) `--tile-text-dark`에서 `--tile-text-light`로 전환하는 것을 권장(계약 아님, 가독성 목적).

### 2.6 접근성 (accessibility, frozen)

- `restart-button`은 `aria-label="다시 시작"`을 가진다.
- `game-message`는 `role="status"`로 승리/게임오버 텍스트를 스크린리더에 알린다.
- 모든 상태(`idle`/`playing`/`won`/`gameover`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다 — §2.4 문구 규칙과 §5 렌더링 규칙으로 충족한다.

### 2.7 반응형 (responsive, frozen)

- 320px 너비 이상에서 `game-board`가 뷰포트를 벗어나지 않고 overflow 없이 표시된다(`max-width:100%` 등 폭 축소, 4×4 비율 유지).

## 3. 게임 로직

- 그리드: 4×4, 각 셀 값은 `0`(빈 셀) 또는 2의 거듭제곱.
- 이동(방향키 1회): 해당 방향으로 각 행/열의 타일을 슬라이드하며, 슬라이드 경로상 값이 같은 인접 타일을 1회만 병합(이미 이번 이동에서 병합된 타일은 재병합 금지). 병합된 값을 `score-value`에 가산.
- 스폰: 이동으로 보드 상태가 실제로 변경된 경우에만, 빈 셀 중 무작위 1곳에 새 타일을 스폰(값 `2` 확률 90%, `4` 확률 10%). 보드가 변경되지 않았으면(막힌 방향) 스폰하지 않는다.
- 승리(`won`): 병합 결과로 값 `2048` 타일이 처음 생성되면 상태를 `won`으로 전환하고 이후 이동 입력을 잠근다.
- 게임오버(`gameover`): 빈 셀이 없고 4방향(상/하/좌/우) 어느 쪽으로도 이동(슬라이드) 또는 병합이 발생하지 않으면 상태를 `gameover`로 전환한다.
- 재시작: 보드를 빈 4×4로 초기화하고 `score-value`를 `0`으로 되돌린 뒤 초기 타일 2개를 스폰하고 상태를 `idle`로 전환한다. `restart-button`은 `idle`/`playing`/`won`/`gameover` 모든 상태에서 항상 동작해야 한다.

## 4. 입력

- 방향키 `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`로 이동. 스크롤 방지를 위해 `preventDefault` 처리.
- `idle`/`playing` 상태에서만 이동 입력이 유효하다. `won`/`gameover` 상태에서는 방향키 입력을 무시한다(재시작만 유효).
- `restart-button` 클릭(또는 키보드 포커스 후 `Enter`/`Space`)은 모든 상태에서 §3 재시작 동작을 수행한다.

## 5. 렌더링

- 이동/스폰 후 새로 생성된 타일 엘리먼트에 `tile-new` class, 이번 이동에서 병합되어 결과로 남은 타일에 `tile-merged` class를 부여한다(애니메이션 트리거 목적 — 정확한 트랜지션 효과·지속시간은 developer 재량).
- `score-value`는 현재 점수 숫자만 텍스트로 표시한다(누적 병합 합계).
- `game-message`는 상태 전환마다 §2.4 표의 텍스트로 갱신한다. 시각적으로는 `idle`/`playing`에서 오버레이를 숨기고 `won`/`gameover`에서만 보드 위에 노출하되, `role="status"` 알림이 항상 동작하도록 엘리먼트 자체는 DOM에서 제거하지 않는다(예: 텍스트만 갱신 + CSS로 시각적 노출 토글).

## 6. Acceptance Criteria (Given/When/Then)

- **AC-1 초기 표시**
  - Given `games/2048.html`을 최초 로드한다
  - When 로드가 완료된다
  - Then `game-board`에 타일 2개가 스폰되어 있고 `score-value`는 `0`, 상태는 `idle`이며 `game-message`는 "게임 준비"류 텍스트를 갖는다.

- **AC-2 이동과 병합**
  - Given `idle`/`playing` 상태에서 이동 가능한 방향이 있다
  - When 방향키를 누른다
  - Then 해당 방향으로 타일이 슬라이드되고 값이 같은 인접 타일이 1회 병합되며, 병합값이 `score-value`에 가산되고 상태가 `playing`이 된다.

- **AC-3 스폰 규칙**
  - Given 이동으로 보드가 실제로 변경되었다
  - When 이동이 완료된다
  - Then 빈 셀 중 1곳에 새 타일(`2` 또는 `4`)이 스폰되고 `tile-new` class가 부여된다. 보드가 변경되지 않았으면 스폰이 발생하지 않는다.

- **AC-4 승리**
  - Given 병합 결과로 `2048` 값 타일이 생성된다
  - When 해당 이동이 완료된다
  - Then 상태가 `won`이 되고 `game-message`가 승리 텍스트로 노출되며(`role="status"`), 이후 방향키 입력은 무시된다.

- **AC-5 게임오버**
  - Given 빈 셀이 없고 4방향 모두 이동/병합이 불가능하다
  - When 사용자가 방향키를 누른다(또는 마지막 이동 직후 판정된다)
  - Then 상태가 `gameover`가 되고 `game-message`가 게임오버 텍스트로 노출되며, 이후 방향키 입력은 무시된다.

- **AC-6 재시작 복구**
  - Given 상태가 `won` 또는 `gameover`(또는 임의 `playing` 진행 중)이다
  - When `restart-button`을 조작한다
  - Then 보드·`score-value`(`0`)·상태(`idle`)가 초기값으로 복구되고 초기 타일 2개가 스폰되며, `restart-button`은 계속 사용 가능하다.

- **AC-7 접근성**
  - Given 게임 화면
  - When 스크린리더/키보드로 접근한다
  - Then `restart-button`은 `aria-label="다시 시작"`을 가지고, `game-message`는 `role="status"`로 승리/게임오버 텍스트를 알리며, 모든 상태가 색상 외 텍스트/접근성 이름으로도 구분된다.

- **AC-8 반응형**
  - Given viewport 폭 ≥ 320px
  - When 폭을 좁힌다
  - Then `game-board`가 뷰포트를 벗어나지 않고 overflow 없이 표시된다.

## 7. Edge / 실패 케이스

- 이동 결과 보드 변화 없음(막힌 방향으로 이동 시도): 스폰하지 않고 상태·점수 유지.
- 동일 프레임/틱 내 다중 키 입력: 마지막으로 처리된 방향만 유효(중복 입력은 no-op으로 무시, 이중 이동 금지).
- `won` 이후 방향키 입력: 무시(재시작만 유효) — 관통/이중 판정 금지.
- `gameover` 이후 방향키 입력: 무시(재시작만 유효).
- `restart-button` 반복 클릭: 매번 동일하게 정상 초기화(중복 스폰/점수 누적 없음).
- 병합 연쇄(한 이동에서 여러 쌍 병합): 각 타일은 해당 이동에서 최대 1회만 병합.
- 매우 좁은 화면(320px): `game-board`가 overflow 없이 표시되고 요소 겹침 없음.

## 8. 검증 (focused)

- 본 task는 `games/2048.html` 단일 파일 제약이며 별도 자동 테스트 파일은 frozen 계약에 포함되지 않는다.
- developer는 브라우저에서 `games/2048.html`을 열어 §6 AC(AC-1~AC-8)를 수동으로 재현해 검증한다(focused scope).
- tester는 §6 AC를 기준으로 manual/e2e 시나리오(§10 TS-1, TS-2)를 실행하고 실제 결과(`test_result`)를 남긴다.

## 9. Handoff

- developer: `games/2048.html` 단일 파일에 §2 UI 계약(ID/class/상태/토큰/접근성/반응형)과 §3~5 게임 로직/입력/렌더링을 그대로 구현한다. 새 파일 생성·외부 CDN/라이브러리 사용을 금지한다.
- reviewer: §2 selector/token 재정의 여부, §3 로직 정확성(이동/병합/스폰/승리/게임오버/재시작), §6 AC 충족 여부를 코드 리뷰로 확인한다.
- tester: §6 AC를 기준으로 §8 검증 절차(TS-1, TS-2)를 실행해 `test_result`를 기록한다.
