# BF-2090 · 단어 맞추기(Word Guess) UI 시안

> 본 문서는 `docs/plans/BF-2089/implementation-plan.md`가 동결한 UI 계약(§3, §4)을
> 그대로 따르는 시각 명세다. selector·상태·토큰·접근성·반응형 요구는 재정의하지 않고
> 시각적으로 구현하는 방법만 다룬다.

## 1. 시안 개요

- **변경 범위**: `word-guess/` 모듈의 단어 맞추기(hangman 스타일) 게임 화면 1개 — 단어 표시,
  글자 키보드, 남은 시도 횟수, 승패 메시지, 다시 시작 버튼.
- **사용자 경험 목표**:
  - 진행중(`playing`) 상태에서 남은 시도 횟수와 이미 시도한 글자를 한눈에 파악할 수 있어야 한다.
  - 승리(`won`)/패배(`lost`) 결과는 색상뿐 아니라 텍스트로도 명확히 구분된다.
  - 키보드만으로도(Tab + Enter/Space) 전체 게임을 완결할 수 있다.
  - 320px 폭의 좁은 화면에서도 가로 스크롤 없이 모든 요소가 보인다.

## 2. 컬러 팔레트

frozen 디자인 토큰(implementation-plan.md §3.4)을 그대로 사용한다. 새 토큰을 추가하지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#0f172a` | 페이지/루트 배경 (다크 네이비) |
| `--color-surface` | `#1e293b` | 카드형 표면 (word-display, keyboard, message 컨테이너) |
| `--color-text` | `#f8fafc` | 기본 텍스트 |
| `--color-accent` | `#6366f1` | 강조 요소 (restart-btn 배경, 포커스 outline) |
| `--color-correct` | `#22c55e` | 정답 글자 버튼 상태 |
| `--color-wrong` | `#ef4444` | 오답 글자 버튼 상태 |
| `--space-gap` | `8px` | 컴포넌트 간 공통 간격(grid gap, margin 단위) |

보조 색상(토큰 미지정 값)은 `--color-surface`/`--color-text`에서 파생되는 투명도 변형만 사용하고
새 HEX 토큰을 도입하지 않는다. 예: 비활성(`letter-btn--disabled`) 배경은
`--color-surface`에 `opacity: 0.5`를 적용해 표현한다.

## 3. 타이포그래피

`vanilla-static` stack 규약에 따라 system font stack만 사용하고 외부 폰트에 의존하지 않는다.

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (게임 제목) | system-ui, -apple-system, "Segoe UI", sans-serif | 1.5rem (24px) | 700 | 1.3 |
| word-display (밑줄 글자열) | ui-monospace, "SFMono-Regular", Menlo, monospace | 2rem (32px), 320px 이하 1.375rem(22px) | 700 | 1.4 |
| body (message, tries-left, 버튼 라벨) | system-ui, -apple-system, "Segoe UI", sans-serif | 1rem (16px) | 500 | 1.5 |
| caption (안내 문구) | system-ui, -apple-system, "Segoe UI", sans-serif | 0.8125rem (13px) | 400 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조 (상단 → 하단, `#word-guess-root` 내부)

1. 게임 제목 (h1, "단어 맞추기")
2. `#tries-left` — 남은 시도 횟수 ("남은 기회: N회")
3. `#word-display` — 밑줄/공개 글자열
4. `#message` — 승패 결과/안내 메시지 (`aria-live="polite"`)
5. `#keyboard` — 글자 버튼 grid (A~Z)
6. `#restart-btn` — 다시 시작 버튼

세로 방향 단일 컬럼(flex column), 각 섹션 사이 간격은 `--space-gap`의 2~3배(16~24px)를 사용하고
grid 내부 요소 간격만 `--space-gap`(8px)을 그대로 적용한다.

### 4.2 spacing

- `#word-guess-root` 최대 폭 480px, 좌우 중앙 정렬, 내부 padding 24px (320px 이하에서는 16px).
- `#keyboard`는 `display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap: var(--space-gap);`
  형태로 구성해 뷰포트 폭에 따라 열 수가 자동 조정되도록 한다.
- `letter-btn` 크기는 최소 36×36px(터치 타겟), padding 8px.

### 4.3 breakpoint 별 동작

- **기본(≥480px)**: `#word-guess-root` 폭 고정(480px), `#keyboard` 열 수 약 7~9개.
- **320px (최소 지원 폭)**:
  - `#keyboard`의 `letter-btn` grid가 `auto-fill`로 자동 줄바꿈되어 가로 스크롤 없이 표시된다
    (구현 계약 §3.6과 동일).
  - `#word-display`의 밑줄 글자열은 `flex-wrap: wrap;` 또는 `overflow-wrap: break-word;`로
    `#word-guess-root` 폭을 넘지 않고 줄바꿈된다.
  - heading/word-display font-size가 §3 표의 축소값으로 전환된다 (미디어쿼리 `max-width: 320px`
    또는 `max-width: 360px` 기준).

## 5. 컴포넌트 명세

모든 selector·상태 클래스·ID는 frozen 계약(implementation-plan.md §3.1~§3.3) 그대로다.

### 5.1 `#word-display` (밑줄 글자열)

- **props**: 없음 (word-game.js가 텍스트 콘텐츠를 갱신).
- **상태별 표현**:
  - `playing`: 미공개 글자는 `_`(밑줄) 문자로, 공개된 글자는 대문자로 표시. 글자 사이 간격을
    `letter-spacing: 0.25em` 정도로 넉넉히 둬 가독성을 확보한다.
  - `won`: 모든 글자가 공개된 상태(밑줄 없음) — 별도 색상 변화 없이 `--color-text` 유지, 아래
    `#message`가 승리를 알린다.
  - `lost`: 공개되지 않은 글자는 계속 `_`로 남는다 — 정답을 노출하지 않는다(계약에 정답 공개
    규칙이 없으므로 추측 단어를 임의로 드러내지 않음).

### 5.2 `#keyboard` / `.letter-btn` (글자 버튼)

- **props**: `data-letter`(A~Z 단일 문자, mockup에서는 표기용).
- **상태(클래스 조합)**:
  | 상태 | 클래스 | 배경색 | 텍스트색 | 속성 |
  |---|---|---|---|---|
  | 미시도 (기본) | `.letter-btn` | `--color-surface` | `--color-text` | 없음 |
  | 정답 시도 | `.letter-btn.letter-btn--correct.letter-btn--disabled` | `--color-correct` | `--color-bg` | `disabled`, `aria-disabled="true"` |
  | 오답 시도 | `.letter-btn.letter-btn--wrong.letter-btn--disabled` | `--color-wrong` | `--color-text` | `disabled`, `aria-disabled="true"` |
  | 게임 종료(won/lost) 후 전체 잠금 | 기존 상태 클래스 유지 + `.letter-btn--disabled` | 상태별 색 유지, opacity 0.85 | - | `disabled`, `aria-disabled="true"` |
- **인터랙션**:
  - hover(미시도 상태만): 배경 `--color-accent` 20% 톤, `cursor: pointer`.
  - focus-visible: `outline: 2px solid var(--color-accent); outline-offset: 2px;` — Tab 이동 시 시인성 확보.
  - `.letter-btn--disabled`는 `cursor: not-allowed`, hover 효과 없음.
  - 색상만으로 상태를 구분하지 않기 위해 정답/오답 버튼에는 접근성 이름에 상태가 포함되도록
    `aria-label="{글자}, 정답"` / `aria-label="{글자}, 오답"`을 dev 구현 시 부여한다
    (계약 §3.5 "색상만으로 구분 금지"에 대응하는 시각/접근성 명세).

### 5.3 `#message` (승패/안내 메시지)

- **props**: 없음. `aria-live="polite"` 고정 속성(계약 §3.5).
- **상태별 텍스트/스타일**:
  | 상태 | 텍스트 예시 | 색상 |
  |---|---|---|
  | `playing` (초기) | "글자를 골라 단어를 맞혀보세요." | `--color-text` (muted, opacity 0.7) |
  | `won` | "정답입니다! 승리했습니다 🎉" | `--color-correct` |
  | `lost` | "아쉽습니다. 패배했습니다." | `--color-wrong` |
- 상태 전환 시 텍스트만 교체되고 색상도 함께 바뀌며, 문구 자체가 상태명을 담고 있어
  스크린리더 사용자도 승/패를 텍스트로 인지한다.

### 5.4 `#tries-left` (남은 시도 횟수)

- **props**: 없음. 텍스트 형식 "남은 기회: N회".
- **상태별 표현**:
  - `playing`: 남은 횟수를 실시간 갱신. 남은 횟수가 1일 때 `--color-wrong` 톤으로 경고 강조
    (선택적 시각 강조 — 계약에 없는 추가 연출이므로 생략 가능, 있어도 무방한 progressive
    enhancement로 명시).
  - `won`/`lost`: 종료 시점의 마지막 값 그대로 고정 표시(별도 초기화 없음, 4.2 restart 시에만 복원).

### 5.5 `#restart-btn` (다시 시작 버튼)

- **props**: 없음. `aria-label="다시 시작"` 고정(계약 §3.5).
- **상태**: 항상 활성(disabled 없음) — `playing`/`won`/`lost` 모든 상태에서 클릭 가능.
- **스타일**: 배경 `--color-accent`, 텍스트 `--color-text`, padding 12px 24px, border-radius 8px.
- **인터랙션**: hover 시 배경 밝기 +10%, focus-visible outline `--color-text` 2px, active 시 살짝
  축소(`transform: scale(0.97)`).
- 클릭 시 4.2 복원 규칙(전체 초기화)이 적용된다 — mockup에서는 정적 표현이므로 별도 섹션(§6)에
  won/lost 상태 예시로 대체 표시한다.

## 6. 상태별 시각 요약 (playing / won / lost)

mockup HTML은 세 상태를 각각 `<section>`으로 나눠 동시에 시각 비교할 수 있게 구성한다
(실제 앱은 단일 상태만 렌더링하지만, mockup은 정적 시뮬레이션이므로 3개 스냅샷을 병렬 배치).

| 상태 | word-display | keyboard | message | tries-left | restart-btn |
|---|---|---|---|---|---|
| `playing` | 일부 공개 + `_` 혼합 | 정답/오답/미시도 혼합 표시 | muted 안내 문구 | 남은 횟수 표시 | 활성 |
| `won` | 전체 공개 | 전체 `--disabled` (기존 상태색 유지) | "승리했습니다" (`--color-correct`) | 마지막 값 고정 | 활성 |
| `lost` | 일부 `_` 잔존 | 전체 `--disabled` (기존 상태색 유지) | "패배했습니다" (`--color-wrong`) | `0회` 고정 | 활성 |

## 7. dev 구현 가이드 (word-guess/style.css, word-guess/index.html, word-guess/word-game.js)

1. `:root`에 §2 토큰 7개를 그대로 선언한다. 새 토큰을 추가하지 않는다.
2. `#word-guess-root`에 `.word-guess` 클래스를 부여하고 §4.2의 max-width/padding을 적용한다.
3. `#keyboard`는 CSS Grid(`auto-fill`, `minmax(36px, 1fr)`)로 구성해 320px에서 별도 미디어쿼리 없이
   자동 줄바꿈되게 한다 (계약 §3.6 요구를 grid 속성만으로 충족 가능).
4. `.letter-btn` 상태 클래스는 §5.2 표의 클래스 조합을 JS에서 `classList.add/remove`로 토글한다.
   `--correct`/`--wrong`과 `--disabled`는 항상 함께 부여된다(단독 사용 없음).
5. `#message`는 `aria-live="polite"`를 정적 HTML 속성으로 고정하고, 텍스트 콘텐츠만
   `textContent`로 교체한다(속성 자체를 삭제/재생성하지 않음 — 스크린리더가 라이브 리전을
   재인식하지 못할 수 있음에 유의).
6. `letter-btn` 비활성화 시 `disabled` 속성과 `aria-disabled="true"`를 **함께** 설정한다
   (`disabled` 단독으로는 계약 §3.5 요구를 만족하지 못함).
7. `#restart-btn`은 `<button type="button" id="restart-btn" aria-label="다시 시작">`로 마크업하고,
   4.2 복원 규칙(word-guess/word-game.js가 상태·guesses·DOM을 모두 리셋)을 클릭 핸들러에서 호출한다.
8. 반응형은 미디어쿼리 `@media (max-width: 360px)`에서 §4.3의 축소 font-size와 padding만 조정하고,
   grid 자체는 breakpoint 없이 `auto-fill`로 대응한다.
9. 색상 대비: `--color-correct`(#22c55e) 위 텍스트는 `--color-bg`(#0f172a)를 사용해 대비를
   확보한다 (mockup §5.2 표와 동일하게 구현).

## 8. mockup 참조

- 시각 mockup 파일: `docs/design/word-guess-mockup-BF-2089.html`
- mockup은 §6의 3개 상태(playing/won/lost)를 각각 독립 `<section>`으로 병렬 배치한 정적
  스냅샷이며, 실제 앱의 단일 상태 렌더링과 다르게 비교 목적의 레이아웃을 사용한다.
- mockup의 DOM ID는 상태별로 `-playing`/`-won`/`-lost` suffix를 붙여 3벌 구성하되(정적 mockup
  한정 예외 — 실제 앱은 계약과 동일한 단일 ID를 그대로 사용), CSS class와 디자인 토큰은
  계약과 동일하게 유지한다.
