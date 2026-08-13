# BF-2036 · 퀴즈 카드 시안

- Jira: BF-2036 (designer) · 관련: BF-2038 (planner) · BF-2037 (developer)
- 작성자: 이디자인 (designer)
- 근거 문서: [`docs/plans/BF-2035/implementation-plan.md`](../../plans/BF-2035/implementation-plan.md) (planner 동결 채점 규칙 · UI 계약)

## 1. 시안 개요

10문항 단답형 퀴즈를 한 화면에서 한 문항씩 순차적으로 풀 수 있는 단일 카드 UI다.
사용자는 `answer-input`에 답을 입력하고 `submit-btn`을 눌러 제출하며, 제출 즉시 정오 피드백(`feedback-message`)이
색상과 텍스트로 함께 표시된다. 2초 후 자동으로 다음 문항으로 전환되고, 상단 `progress-indicator`가
현재 진행 상황("N / 10")을 보여준다. 10문항을 모두 마치면 `result-screen`에 맞힌 개수와 정답률을 보여주고,
`restart-btn`으로 처음부터 다시 시작할 수 있다.

**UX 목표**
- 한 번에 하나의 결정(입력 → 제출)만 요구하는 단순한 흐름 유지
- 정오 피드백을 색상 + 텍스트 이중 신호로 전달 (색맹/저시력 사용자 배려)
- 자동 전환(2초)이 사용자를 기다리게 하지 않도록 진행 표시를 항상 노출
- 320px 폭에서도 깨지지 않는 단일 컬럼 레이아웃

이 문서와 [`mockup.html`](./mockup.html) 은 UI 계약(§4)에 동결된 `domIds`/`cssClasses`/`designTokens`를
그대로 반영한 시각 시안이며, planner가 동결한 채점 규칙·상태 흐름을 재정의하지 않는다.

## 2. 컬러 팔레트

planner가 동결한 디자인 토큰(`docs/plans/BF-2035/implementation-plan.md` §4.5)을 그대로 사용한다. 추가 토큰은
레이아웃/중립색 용도로만 최소 정의한다.

| 역할 | 변수명 | 값 | 출처 |
|---|---|---|---|
| Primary action | `--color-action-primary` | `#2563eb` | 동결 토큰 |
| 정답 | `--color-correct` | `#16a34a` | 동결 토큰 |
| 오답 | `--color-incorrect` | `#dc2626` | 동결 토큰 |
| 배경 | `--color-bg` | `#f8fafc` | 신규(중립) |
| 카드 배경 | `--color-card-bg` | `#ffffff` | 신규(중립) |
| 본문 텍스트 | `--color-text` | `#1e293b` | 신규(중립) |
| 보조 텍스트 | `--color-text-muted` | `#64748b` | 신규(중립) |
| 테두리 | `--color-border` | `#e2e8f0` | 신규(중립) |

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| Heading (문항 텍스트, `quiz-card__question`) | `--font-family-base` (동결: `system-ui, sans-serif`) | 20px | 600 | 1.4 |
| Body (입력값, 버튼, 결과) | `--font-family-base` | 16px | 400 | 1.5 |
| Caption (progress-indicator, feedback 보조 텍스트) | `--font-family-base` | 14px | 500 | 1.4 |

## 4. 레이아웃

### 4.1 구조

```
quiz-app (뷰포트 중앙 정렬 컨테이너, max-width 480px)
 └─ quiz-card                      … 진행 중 문항 카드
     ├─ progress-indicator          "N / 10"
     ├─ quiz-card__question         문항 텍스트
     ├─ quiz-card__input (answer-input)  텍스트 입력 + label
     ├─ quiz-card__submit (submit-btn)   제출 버튼
     └─ feedback-message             정오 피드백 (aria-live="polite")
 └─ result-screen                  … finished 상태에서만 노출
     ├─ 결과 요약 (맞힌 수 / 정답률)
     └─ restart-btn
```

`quiz-card`와 `result-screen`은 상태에 따라 배타적으로 노출된다 (§5 상태별 표시 참조).

### 4.2 Spacing

- 카드 내부 padding: `--space-card-padding` (동결: `24px`)
- `quiz-card__question` ↔ `answer-input` 간격: 16px
- `answer-input` ↔ `submit-btn` 간격: 12px (데스크톱 가로 배치 시), 12px (모바일 세로 배치 시)
- `submit-btn` ↔ `feedback-message` 간격: 16px

### 4.3 Breakpoint 별 동작

| 뷰포트 | `answer-input` + `submit-btn` 배치 | 비고 |
|---|---|---|
| ≥ 480px (기본) | 가로 배치 (input flex-grow, 버튼 고정 폭) | |
| < 480px (모바일) | 세로 배치 (input 100% 폭, 버튼 100% 폭) | 동결 요구사항 §4.7 |
| 320px | 세로 배치, `quiz-card` padding 유지, overflow 없이 표시 | 동결 요구사항 §4.7 |

## 5. 컴포넌트 명세

### 5.1 `quiz-app` (`#quiz-app`)
- 역할: 전체 퀴즈 위젯의 루트 컨테이너
- 상태: 없음 (레이아웃 컨테이너)

### 5.2 `quiz-card` (`#quiz-card`, class `quiz-card`)
- 역할: 현재 문항 카드
- props(구현 시 참고): `questionText`, `questionIndex`, `totalCount`
- 상태별 표시:
  - `idle` / `submitting` / `empty-input-error`: 카드 노출, `submit-btn` 활성
  - `submitting`: `submit-btn` 비활성(중복 제출 방지), 로딩 상태 시각 표시는 dev 재량(예: 버튼 텍스트 유지 + `aria-busy="true"`)
  - `correct-feedback` / `incorrect-feedback`: 카드 노출 유지, `feedback-message`에 결과 표시, 2초 후 자동 전환
  - `finished`: 카드 숨김, `result-screen` 노출

### 5.3 `progress-indicator` (`#progress-indicator`)
- 표시 형식: `"{현재 문항 번호} / {총 문항 수}"` (예: `"3 / 10"`)
- 갱신 시점: 채점이 확정될 때(정답/오답 판정 시점)마다 갱신. 초기값은 `"1 / 10"`
- 접근성: 텍스트 노드 자체가 스크린리더에 그대로 전달됨(별도 aria 불필요)

### 5.4 `answer-input` (`#answer-input`, class `quiz-card__input`)
- 타입: `<input type="text">`
- 상태:
  - 기본: `--color-border` 테두리
  - `empty-input-error`: 강조 테두리(`--color-incorrect`) + 카드 내 에러 안내 텍스트 병기 ("답을 입력해주세요")
  - `correct-feedback`/`incorrect-feedback`: 읽기 전용처럼 보이도록 비활성(dev 재량, 값 유지)
- 접근성: `<label for="answer-input">` 필수 텍스트 라벨 제공 (동결 §4.6)

### 5.5 `submit-btn` (`#submit-btn`, class `quiz-card__submit`)
- 타입: `<button type="submit">`
- 텍스트: "제출" (텍스트 콘텐츠 자체로 스크린리더 전달, 별도 aria-label 불필요)
- 상태: 기본(활성) / `submitting`(비활성, 중복 클릭 방지)
- 색상: 배경 `--color-action-primary`, 텍스트 `#ffffff`

### 5.6 `feedback-message` (`#feedback-message`)
- 접근성: `aria-live="polite"` 필수 (동결 §4.6)
- class 상태:
  - `quiz-card__feedback--correct`: 배경/텍스트에 `--color-correct` 반영 + "정답입니다" 텍스트
  - `quiz-card__feedback--incorrect`: 배경/텍스트에 `--color-incorrect` 반영 + "오답입니다 (정답: …)" 텍스트
- 색상만으로 상태를 구분하지 않는다 — 아이콘 또는 텍스트 라벨 병기 (동결 §4.6)

### 5.7 `result-screen` (`#result-screen`)
- 표시 시점: `finished` 상태에서만 노출 (그 외 상태에서는 숨김)
- 내용: "N / 10 문항을 맞혔습니다", "정답률: N%" (grade() 결과의 `correctCount`/`totalCount`/`accuracy` 반영)
- 하위: `restart-btn`

### 5.8 `restart-btn` (`#restart-btn`)
- 텍스트: "다시 시작"
- 동작: 클릭 시 문항 인덱스·입력값·피드백·progress·누적 채점값을 초기값으로 되돌리고 1번째 문항의 `idle` 상태로 복귀 (동결 §3.1)
- 색상: 배경 `--color-action-primary`, 텍스트 `#ffffff` (submit-btn과 동일 시각 언어 — 주 실행 control)

## 6. dev 구현 가이드

1. 동결된 `domIds`(§4.2)와 `cssClasses`(§4.3)는 정확히 그대로 사용한다. 추가 wrapper `id`/`class`는 자유롭게 확장 가능하나 계약된 이름은 재정의하지 않는다.
2. CSS 변수는 `:root`에 본 문서 §2 표의 변수명으로 선언한다. 동결 토큰 5개(`--color-action-primary`, `--color-correct`, `--color-incorrect`, `--font-family-base`, `--space-card-padding`)는 값도 그대로 사용한다.
3. `quiz-card`와 `result-screen`은 상태 기반으로 `display: none` / 노출을 토글한다 (동시 노출 금지).
4. `feedback-message`는 항상 DOM에 `aria-live="polite"` 속성을 유지한 채로 텍스트 내용만 갱신한다(엘리먼트를 통째로 교체하면 스크린리더가 못 읽을 수 있음).
5. `empty-input-error` 상태에서는 `submit-btn`을 비활성화하지 않는다 — 재입력 후 즉시 재시도 가능해야 한다(§3.1 근거).
6. 모바일(< 480px) 레이아웃은 `answer-input`/`submit-btn`에 대해 flex-direction을 `row`→`column`으로 전환하는 미디어쿼리 하나로 구현 가능(§4.3 참조).
7. `restart-btn` 클릭 핸들러는 채점 누적 상태를 포함해 전체 상태를 초기화해야 한다(2초 자동전환 타이머가 남아있다면 clear 필요 — dev 구현 세부사항).

## 7. AC 매핑 표

| Acceptance Criteria | 반영 위치 |
|---|---|
| 시안 문서에 레이아웃/컬러/타이포와 AC 매핑 표가 포함된다 | 본 문서 §2(컬러), §3(타이포), §4(레이아웃), 본 표(§7) |
| mockup.html이 브라우저에서 단독으로 열람 가능하고 ui-contract의 domIds/cssClasses/designTokens를 그대로 반영한다 | [`mockup.html`](./mockup.html) — 외부 의존성 0, `:root` 토큰 5종 + 동결 domIds/cssClasses 전부 사용 |
| 시각 명세 범위는 design-spec.md, mockup.html이며 런타임 HTML/CSS/JS를 생성하지 않는다 | 본 작업은 `quiz-card/**` 산출물을 생성하지 않음 (developer 소유, BF-2037) |

## 8. mockup 참조

시각 mockup: [`docs/design/BF-2035/mockup.html`](./mockup.html)

mockup에는 §5의 모든 상태(정상 진행 중 카드, `empty-input-error`, `correct-feedback`, `incorrect-feedback`, `finished`/`result-screen`)를
정적 섹션으로 나란히 배치하여 한 화면에서 비교할 수 있도록 구성했다. 실제 동적 전환(2초 자동 전환, JS 상태 관리)은
developer(BF-2037) 구현 범위이며 mockup은 시각 참고용이다.
