# BF-1945 텍스트 통계 분석기 — 구현 설계 (BF-1948 · planner)

> 이 문서는 designer(BF-1946)와 developer(BF-1947)가 **그대로 따라야 하는** 실행 설계와
> 동결(frozen) UI 계약입니다. 여기 명시된 파일 소유권, DOM id/class, 상태, token,
> 계산 규칙은 designer/developer가 재정의할 수 없습니다.

## 0. 범위와 파일 제약 (절대 규칙)

- 이번 작업(BF-1945 epic)에서 backend repo에 생성/수정되는 파일은 **정확히 아래 3개뿐**입니다.
  - `docs/design/text-stats-BF-1945-mockup.html` — designer 소유
  - `docs/design/text-stats-BF-1945.md` — designer 소유
  - `text-stats.html` — developer 소유 (repo 루트, **단일 파일**)
- developer는 `text-stats.html` **한 파일만** 생성/수정합니다. HTML/CSS/JS를 모두 이 한 파일 안에 인라인으로 포함하며, 외부 CDN·라이브러리·별도 `.css`/`.js` 파일을 추가하지 않습니다.
- planner(본 문서), designer, developer 산출물 외에 새 파일이나 새 역할을 추가하지 않습니다. 파일 소유권·상태·후조건은 이 절이 아니라 frozen blueprint가 유일한 권위이며, 본 문서는 이를 그대로 옮겨 적을 뿐 재정의하지 않습니다.

## 1. 사용자 시나리오

1. 사용자가 브라우저에서 `text-stats.html`을 연다. 초기 상태는 `empty`이며 `#text-input`은 비어 있고 통계는 초기값(0 또는 규칙에 따른 표기)으로 보인다.
2. 사용자가 `#text-input`에 텍스트를 입력하면 상태가 `populated`로 전환되고, 문자수(공백 포함/제외)·단어수·문장수·문단수·읽기 시간·상위 5단어가 실시간으로 갱신된다.
3. 사용자가 `#clear-button`을 클릭하면 입력값과 모든 통계, 상태 표시가 `empty` 상태로 초기화되고 `#text-input`/`#clear-button`을 즉시 다시 사용할 수 있다.

## 2. 통계 계산 규칙 (developer가 정확히 구현해야 하는 사양)

### 2.1 문장 수
- 문장 경계는 `.`(마침표), `?`(물음표), `!`(느낌표) 뒤로 정의한다.
- 연속된 구두점(예: `"정말?!"`)은 하나의 문장 경계로 처리한다 (경계 뒤 연속 구두점을 건너뛴 다음 지점부터 다음 문장 시작).
- 경계로 분리된 조각이 공백만 남거나 빈 문자열이면 문장으로 세지 않는다.
- 텍스트 끝에 마침표/물음표/느낌표가 없어도 남은 비공백 내용이 있으면 문장 1개로 센다.

### 2.2 단어 수 / 상위 5단어
- 단어는 공백류(스페이스, 탭, 개행) 기준으로 분리하며 빈 문자열 토큰은 제외한다. (문장부호는 단어에서 제거하지 않고 공백 분리만 적용한다.)
- 상위 5단어 집계 시에는 다음을 적용한다:
  - 대소문자를 무시한다 (집계 전 소문자로 변환).
  - 글자수 1인 단어(한 글자 단어)는 집계에서 제외한다.
  - 빈도 내림차순으로 정렬한다.
  - 빈도가 같으면 텍스트에 먼저 등장한 단어를 우선한다 (등장 순서로 tie-break).
  - 상위 5개까지만 `#top-words-list`에 표시한다. 집계 대상 단어가 5개 미만이면 있는 만큼만 표시한다.

### 2.3 문단 수
- 문단은 빈 줄(연속 개행 2개 이상, 즉 `\n\s*\n`)을 경계로 분리한다.
- 공백만 있거나 빈 문단은 카운트하지 않는다.

### 2.4 문자 수
- `#stat-chars-with-spaces`: 입력 전체 문자 수(공백 포함, 개행 포함).
- `#stat-chars-without-spaces`: 공백류(스페이스/탭/개행) 문자를 제외한 문자 수.

### 2.5 읽기 시간
- 분당 200단어(WPM=200) 기준으로 계산한다.
- 단어 수가 0이면 `"0분"`으로 표시한다.
- 단어 수가 1 이상 200 미만이면 `"1분 미만"`으로 표시한다.
- 단어 수가 200 이상이면 `단어수 / 200`을 올림(ceil)한 정수 분을 `"N분"` 형식으로 표시한다 (예: 201단어 → `"2분"`).

## 3. UI 계약 (동결 — designer/developer 재정의 금지)

### 3.1 DOM id
`text-input`, `clear-button`, `stats-grid`, `stat-chars-with-spaces`, `stat-chars-without-spaces`, `stat-words`, `stat-sentences`, `stat-paragraphs`, `stat-reading-time`, `top-words-list`

### 3.2 CSS class
`text-stats-app`, `stats-card`, `stats-card__value`, `stats-card__label`, `top-words__item`

### 3.3 상태
- `empty`: `#text-input`이 빈 문자열일 때. 통계는 초기값(문자/단어/문장/문단수=0, 읽기시간="0분", `#top-words-list`는 빈 목록)으로 표시된다.
- `populated`: `#text-input`에 한 글자 이상 입력되었을 때. 2절 규칙에 따라 계산된 통계가 표시된다.
- 상태 전환은 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(예: `aria-live` 영역 텍스트 또는 상태 라벨)으로도 노출한다.

### 3.4 Design token
- `--color-action-primary: #2563eb`
- `--color-surface-card: #f8fafc`
- `--space-card-gap: 16px`
- `--font-size-stat-value: 28px`

### 3.5 접근성
- `#clear-button`은 `aria-label="입력 지우기"`를 가진다.
- `#text-input`은 `aria-label="분석할 텍스트 입력"`을 가진다.
- `#stats-grid`의 각 `.stats-card`는 `.stats-card__value`와 `.stats-card__label`을 시각적으로 함께 배치해 스크린리더가 값과 이름을 연결해 읽도록 한다.
- 모든 상태(`empty`/`populated`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형
- 320px 폭에서도 `#stats-grid`의 카드가 겹치거나 잘리지 않고 줄바꿈된다.
- `#stats-grid`는 CSS `flex-wrap` 또는 `grid`를 사용해 좁은 화면에서 세로로 쌓인다.

### 3.7 초기화/실패 후 복구
- 초기화(`#clear-button` 클릭) 또는 실패 이후에도 `#text-input`, `#clear-button`은 비활성화되지 않고 즉시 다시 사용할 수 있어야 하며, 상태와 진행 표시는 초기값(`empty`)으로 되돌아간다.

## 4. 산출물 경로 및 소유자 (frozen — 재배정 금지)

| 경로 | 소유자 | 상태 |
| --- | --- | --- |
| `docs/design/text-stats-BF-1945-mockup.html` | designer | additive |
| `docs/design/text-stats-BF-1945.md` | designer | additive |
| `text-stats.html` | developer | additive |
| `docs/plans/BF-1945/implementation-plan.md` (본 문서) | planner | additive |

## 5. 실행 순서

1. planner(BF-1948, 본 task): 본 문서로 실행 설계·UI 계약 동결.
2. designer(BF-1946): 본 문서를 따라 `docs/design/text-stats-BF-1945-mockup.html`, `docs/design/text-stats-BF-1945.md` 작성. `plan` 완료에 의존.
3. developer(BF-1947): 본 문서를 따라 `text-stats.html` 단일 파일 구현. `plan` 완료에 의존 (`design`과 병렬 가능).
4. reviewer: `design`·`develop` 산출물이 본 문서의 계산 규칙·UI 계약과 일치하는지 검토.
5. tester: 리뷰 통과 후 `text-stats.html`을 대상으로 계산 규칙·상태 전환·접근성·반응형을 수동 검증.

## 6. Edge case / 실패 케이스

- 입력이 공백/개행만으로 구성된 경우: 단어수=0, 문장수=0, 문단수=0이며 상태는 `empty`로 유지한다 (trim 후 빈 문자열이면 empty).
- 문장부호가 전혀 없는 텍스트: 비공백 내용이 있으면 문장 1개로 센다.
- 모든 단어가 한 글자인 텍스트: 상위 5단어 목록은 빈 목록으로 표시한다.
- 매우 긴 텍스트(수만 단어): 읽기 시간은 `Math.ceil(단어수/200)`분으로 계산하며 별도 상한을 두지 않는다.
- `#clear-button`을 빈 상태(`empty`)에서 클릭: 상태는 `empty`를 유지하고 오류 없이 동작한다.
