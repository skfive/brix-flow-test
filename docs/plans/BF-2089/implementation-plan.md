# BF-2089 단어 맞추기 게임 — 구현 설계 (Planner: BF-2092)

## 1. 개요

단어 맞추기(hangman 스타일) 게임의 요구사항을 정제하고, 진행중/승리/패배 상태 전이,
파일 구조, UI 계약, 순수 함수 테스트 케이스를 확정한다. 본 문서는 designer(BF-2090)와
developer(BF-2091)가 그대로 따르는 frozen blueprint이며, 아래 명시된 파일·소유자·상태·
후조건 외의 새 파일이나 역할을 추가하지 않는다.

## 2. 파일 구조 및 소유권 (frozen blueprint 그대로)

| 경로 | 소유자 | 설명 |
|---|---|---|
| `docs/design/word-guess-BF-2089.md` | designer | UI 시안 문서 |
| `docs/design/word-guess-mockup-BF-2089.html` | designer | mockup HTML |
| `word-guess/index.html` | developer | 게임 마크업 |
| `word-guess/style.css` | developer | 게임 스타일 |
| `word-guess/word-game.js` | developer | 게임 로직 (순수 함수 + DOM 연동) |
| `word-guess/tests/word-game.test.js` | developer | 순수 함수 단위 테스트 |

각 파일은 additive 정책을 따른다 (기존 파일 재정의 없음). 파일 소유권과 상태 계약은
본 문서가 아니라 frozen blueprint가 유일한 권위이며, 이 문서는 이를 재설명만 한다.

## 3. UI 계약 (exact — designer/developer는 selector·token을 변경/재정의하지 않음)

### 3.1 DOM ID
- `word-guess-root` — 게임 컨테이너 루트
- `word-display` — 밑줄/공개 글자열 표시 영역
- `keyboard` — 글자 버튼 그리드 영역
- `message` — 승패 결과 메시지 영역
- `tries-left` — 남은 시도 횟수 표시 영역
- `restart-btn` — 다시 시작 버튼

### 3.2 CSS class
- `word-guess` — 루트 컨테이너 클래스
- `letter-btn` — 글자 버튼 기본 클래스
- `letter-btn--correct` — 정답 글자 버튼 상태 클래스
- `letter-btn--wrong` — 오답 글자 버튼 상태 클래스
- `letter-btn--disabled` — 비활성(시도 완료) 글자 버튼 상태 클래스

### 3.3 상태 (state)
- `playing` — 진행중
- `won` — 승리
- `lost` — 패배

### 3.4 디자인 토큰
- `--color-bg: #0f172a`
- `--color-surface: #1e293b`
- `--color-text: #f8fafc`
- `--color-accent: #6366f1`
- `--color-correct: #22c55e`
- `--color-wrong: #ef4444`
- `--space-gap: 8px`

### 3.5 접근성
- `restart-btn`은 `aria-label="다시 시작"`을 가진다.
- `message` 영역은 `aria-live="polite"`로 승패 결과 텍스트를 스크린리더에 알린다.
- 시도한 `letter-btn`은 `disabled` 속성과 `aria-disabled="true"`를 함께 설정한다.
- 모든 `letter-btn`과 `restart-btn`은 Tab 포커스와 Enter/Space 키보드 활성화를 지원한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형
- 320px 폭에서 `keyboard` 영역의 `letter-btn` grid가 줄바꿈되어 가로 스크롤 없이 표시된다.
- 320px 폭에서 `word-display`의 밑줄 글자열이 `word-guess-root` 폭을 넘지 않고 줄바꿈된다.

### 3.7 산출물 경로
- `word-guess/index.html`, `word-guess/style.css`, `word-guess/word-game.js`,
  `word-guess/tests/word-game.test.js` (developer)
- `docs/design/word-guess-BF-2089.md`, `docs/design/word-guess-mockup-BF-2089.html` (designer)

## 4. 상태 전이표

| 현재 상태 | 트리거 | 조건 | 다음 상태 | 부수 효과 |
|---|---|---|---|---|
| `playing` | 글자 클릭/키보드 입력 (정답 포함) | 남은 미공개 글자가 0 (모든 글자 공개됨) | `won` | `message`에 승리 문구 표시, `letter-btn` 전체 잠금 |
| `playing` | 글자 클릭/키보드 입력 (오답) | 누적 오답 수 == `maxMiss` | `lost` | `message`에 패배 문구 표시, `letter-btn` 전체 잠금 |
| `playing` | 글자 클릭/키보드 입력 (정답, 미완성) | 미공개 글자 존재 & 오답 수 < `maxMiss` | `playing` | 해당 `letter-btn`에 `letter-btn--correct` + `letter-btn--disabled` 부여, `word-display` 갱신 |
| `playing` | 글자 클릭/키보드 입력 (오답, 한계 미도달) | 오답 수 < `maxMiss` | `playing` | 해당 `letter-btn`에 `letter-btn--wrong` + `letter-btn--disabled` 부여, `tries-left` 갱신 |
| `won` / `lost` | 글자 클릭/키보드 입력 | (무관) | 상태 변화 없음 | 입력 무시 (모든 `letter-btn`이 `disabled`/`aria-disabled="true"`이므로 클릭 자체가 발생하지 않음) |
| `won` / `lost` / `playing` | `restart-btn` 클릭 | (무관) | `playing` | 아래 4.1 복원 규칙 적용 |

### 4.1 입력 잠금 규칙
- `won` 또는 `lost` 상태 진입 시 모든 `letter-btn`에 `disabled` 속성과
  `aria-disabled="true"`, `letter-btn--disabled` 클래스를 부여해 추가 입력을 막는다.
- `playing` 상태에서는 아직 시도하지 않은 `letter-btn`만 활성 상태를 유지한다.

### 4.2 다시 시작(restart) 복원 규칙
- 상태를 `playing`으로 초기화한다.
- 새 단어를 선택하고 guesses 배열을 빈 배열로 초기화한다.
- `word-display`를 모두 미공개(밑줄) 상태로 되돌린다.
- `tries-left`를 `maxMiss` 초기값으로 복원한다.
- `message` 영역의 승패 문구를 비우거나 초기 안내 문구로 되돌린다.
- 이전에 `disabled`/`letter-btn--correct`/`letter-btn--wrong`/`letter-btn--disabled`가
  부여됐던 모든 `letter-btn`을 활성 상태로 복원한다 (`disabled` 속성 제거,
  `aria-disabled="false"`, 상태 클래스 제거).

## 5. 순수 함수 시그니처

### 5.1 `revealState(word, guesses)`
- 입력: `word: string` (정답 단어, 대문자 가정), `guesses: string[]` (지금까지 시도한 글자 배열)
- 출력: `string[]` — `word`와 같은 길이의 배열. 각 인덱스는 해당 글자가 `guesses`에
  포함되면 그 글자, 아니면 `'_'`.
- 부수효과 없음 (순수 함수), `word`/`guesses` 원본을 변경하지 않는다.

### 5.2 `judgeGame(word, guesses, maxMiss)`
- 입력: `word: string`, `guesses: string[]`, `maxMiss: number` (허용 최대 오답 수)
- 출력: `'playing' | 'won' | 'lost'`
- 판정 규칙:
  - `word`의 모든 고유 글자가 `guesses`에 포함되면 `'won'`.
  - `guesses` 중 `word`에 포함되지 않는 고유 오답 글자 수가 `maxMiss` 이상이면 `'lost'`.
  - 위 두 조건에 해당하지 않으면 `'playing'`.
- 부수효과 없음.

## 6. 순수 함수 테스트 케이스 (최소 8개, 중복 글자 케이스 포함)

| # | 함수 | 입력 | 기대 출력 | 비고 |
|---|---|---|---|---|
| 1 | `revealState` | `word="APPLE"`, `guesses=[]` | `["_","_","_","_","_"]` | 미시도 초기 상태 |
| 2 | `revealState` | `word="APPLE"`, `guesses=["A"]` | `["A","_","_","_","_"]` | 단일 정답 부분 공개 |
| 3 | `revealState` | `word="APPLE"`, `guesses=["P"]` | `["_","P","P","_","_"]` | 중복 글자(P가 2개) 모두 공개 |
| 4 | `revealState` | `word="APPLE"`, `guesses=["A","P","L","E"]` | `["A","P","P","L","E"]` | 전체 공개(승리 직전) |
| 5 | `judgeGame` | `word="APPLE"`, `guesses=["A"]`, `maxMiss=6` | `"playing"` | 오답 없음, 미완성 |
| 6 | `judgeGame` | `word="APPLE"`, `guesses=["A","P","L","E"]`, `maxMiss=6` | `"won"` | 중복 글자 포함 전체 정답 커버 |
| 7 | `judgeGame` | `word="APPLE"`, `guesses=["X","Y","Z"]`, `maxMiss=3` | `"lost"` | 오답 수가 `maxMiss`에 도달 |
| 8 | `judgeGame` | `word="APPLE"`, `guesses=["X","Y"]`, `maxMiss=3` | `"playing"` | 오답 수가 `maxMiss` 미만 |
| 9 | `judgeGame` | `word="APPLE"`, `guesses=["P","X"]`, `maxMiss=6` | `"playing"` | 중복 글자 정답(P) + 오답(X) 혼합, 아직 미완성/미탈락 |

## 7. 엣지 케이스 / 실패 케이스

- 빈 `guesses` 배열: `revealState`는 전부 `'_'`, `judgeGame`은 `word` 길이가 0이 아닌 한 `'playing'`.
- 중복 글자 단어에서 같은 글자를 한 번만 `guesses`에 넣어도 해당 글자의 모든 위치가 공개된다
  (5.1 규칙, 테스트 #3).
- `maxMiss` 경계값: 오답 고유 글자 수가 정확히 `maxMiss`에 도달하는 순간 `'lost'`로 전이한다
  (테스트 #7). `maxMiss - 1`까지는 `'playing'`을 유지한다 (테스트 #8).
- `won`/`lost` 상태에서의 추가 입력은 UI 레벨에서 `disabled`로 원천 차단되며, 순수 함수
  자체는 상태를 유지한 채 재호출되어도 동일한 상태를 반환해야 한다(멱등성).
- `restart-btn` 클릭은 언제나(`playing`/`won`/`lost` 무관) 4.2 복원 규칙을 동일하게 적용한다.
