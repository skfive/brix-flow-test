# BF-2035 퀴즈 카드 구현 설계

- Jira: BF-2038 (planner) · BF-2036 (designer) · BF-2037 (developer)
- 작성자: 박기획 (planner)
- 목적: designer와 developer가 충돌 없이 병렬 작업할 수 있도록 채점 규칙과 UI 계약을 동결한다.

## 1. 개요

10문항 단답형 퀴즈 카드. 사용자가 한 번에 한 문항씩 답을 입력·제출하면 즉시 정오 피드백을 보여주고,
2초 후 다음 문항으로 자동 전환한다. 10문항을 모두 마치면 결과 화면(맞힌 수, 정답률)을 보여주고
다시 시작할 수 있다.

## 2. 채점 규칙

### 2.1 normalizeAnswer(input)

```
normalizeAnswer(input) = input.trim().toLowerCase()
```

| 항목 | 규칙 |
|---|---|
| 대소문자 | 무시한다 (`toLowerCase()`) |
| 앞뒤 공백 | 무시한다 (`trim()`) |
| 내부 공백 | 그대로 비교한다 (예: `"new york"` ≠ `"newyork"`) |
| 정답 판정 | `normalizeAnswer(userInput) === normalizeAnswer(correctAnswer)` |

### 2.2 grade(answers)

10문항 채점이 끝나면(또는 각 문항 채점 시점마다 누적 호출되어) 다음 형식의 객체를 반환한다.

```
grade(answers) -> {
  correctCount: number,   // 맞힌 문항 수 (0~10)
  totalCount: number,     // 전체 문항 수 (10)
  accuracy: number        // 정답률(%), Math.round(correctCount / totalCount * 100), 정수 0~100
}
```

- `answers`는 문항별 `{ userInput, correctAnswer }` 목록이며 각 항목은 `normalizeAnswer` 비교로 정오를 판정한다.
- `accuracy`는 반올림한 정수 퍼센트 값으로 반환한다 (예: 7/10 → `70`).

## 3. 카드 흐름 (State Flow)

상태 집합(frozen): `idle`, `submitting`, `correct-feedback`, `incorrect-feedback`, `empty-input-error`, `finished`

```
idle
 ├─ submit-btn 클릭 + answer-input 빈 값
 │    └─> empty-input-error
 │         (제출 거부, 카드 전환 없음, 입력값 유지, submit-btn 재사용 가능)
 │
 └─ submit-btn 클릭 + answer-input 값 있음
      └─> submitting
           └─> grade 판정
                ├─ 정답 -> correct-feedback (feedback-message에 정답 표시, progress-indicator 갱신)
                └─ 오답 -> incorrect-feedback (feedback-message에 오답 표시, progress-indicator 갱신)

correct-feedback / incorrect-feedback
 └─ 2000ms(2초) 경과
      ├─ 다음 문항이 있음 -> idle (다음 문항으로 카드 전환)
      └─ 마지막(10번째) 문항이었음 -> finished (result-screen에 grade() 결과 표시)

finished
 └─ restart-btn 클릭
      └─> idle (1번째 문항, 입력값/피드백/progress-indicator 모두 초기값으로 복귀)

empty-input-error
 └─ answer-input 재입력 후 submit-btn 클릭 -> submitting (위 흐름 재진입)
```

### 3.1 세부 규칙

- **빈 입력 거부**: `answer-input`이 공백만 있거나 비어 있으면(`normalizeAnswer(value) === ""`) 제출을 거부하고 `empty-input-error` 상태로 전환한다. 이때 카드 전환·채점·progress 갱신은 발생하지 않는다.
- **2초 후 카드 전환**: `correct-feedback`/`incorrect-feedback` 상태 진입 후 2000ms 뒤 자동으로 다음 문항 카드로 전환한다(수동 "다음" 조작 없음).
- **진행 표시**: `progress-indicator`는 채점이 확정될 때마다(정답/오답 판정 시점) 현재 문항 번호를 갱신한다 (예: "3 / 10").
- **종료 화면**: 10번째 문항 채점 완료 후 `finished` 상태로 전환하며 `result-screen`에 `grade()` 결과(맞힌 수, 정답률)를 표시한다.
- **다시 시작**: `restart-btn` 클릭 시 문항 인덱스, 입력값, 피드백, progress-indicator, 채점 누적값을 모두 초기값으로 되돌리고 1번째 문항의 `idle` 상태로 복귀한다.

## 4. UI 계약 (Frozen — designer/developer는 재정의 금지)

### 4.1 산출물 파일

| 경로 | 소유자 | 상태 |
|---|---|---|
| `docs/design/BF-2035/design-spec.md` | designer | additive |
| `docs/design/BF-2035/mockup.html` | designer | additive |
| `quiz-card/index.html` | developer | additive |
| `quiz-card/quiz.js` | developer | additive |
| `quiz-card/style.css` | developer | additive |
| `quiz-card/tests/quiz.test.js` | developer | additive |

### 4.2 DOM ID

`quiz-app`, `quiz-card`, `answer-input`, `submit-btn`, `feedback-message`, `progress-indicator`, `result-screen`, `restart-btn`

### 4.3 CSS Class

`quiz-card`, `quiz-card__question`, `quiz-card__input`, `quiz-card__submit`, `quiz-card__feedback--correct`, `quiz-card__feedback--incorrect`

### 4.4 상태(states)

`idle`, `submitting`, `correct-feedback`, `incorrect-feedback`, `empty-input-error`, `finished` (§3 참조)

### 4.5 디자인 토큰

| 토큰 | 값 |
|---|---|
| `--color-action-primary` | `#2563eb` |
| `--color-correct` | `#16a34a` |
| `--color-incorrect` | `#dc2626` |
| `--font-family-base` | `system-ui, sans-serif` |
| `--space-card-padding` | `24px` |

### 4.6 접근성

- `submit-btn`은 명시적인 `aria-label` 또는 텍스트 콘텐츠로 스크린리더에 동작을 전달한다.
- `feedback-message`는 `aria-live="polite"` 영역으로 정답/오답 결과를 스크린리더에 전달한다.
- `answer-input`은 연결된 `label` 또는 `aria-label`을 가진다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다(예: "정답입니다", "오답입니다" 텍스트 병기).

### 4.7 반응형

- 320px 폭에서도 `quiz-card` 콘텐츠가 overflow 없이 표시된다.
- 모바일 뷰포트에서 `answer-input`과 `submit-btn`이 세로로 배치된다.

## 5. Edge Case / 실패 케이스

| 케이스 | 처리 |
|---|---|
| 빈 입력 제출 | `empty-input-error` 상태, 카드 전환 없음, 재입력 후 재시도 가능 |
| 공백만 입력 | `normalizeAnswer` 결과가 빈 문자열이므로 빈 입력과 동일하게 거부 |
| 대소문자만 다른 정답 | 정답으로 판정 (`normalizeAnswer` 비교) |
| 앞뒤 공백이 섞인 정답 | 정답으로 판정 (`trim` 적용) |
| 마지막(10번째) 문항 정오 판정 직후 | 2초 후 다음 카드로 넘어가지 않고 `finished`로 전환 |
| `finished` 상태에서 재시도 없이 새로고침 | 범위 밖(브라우저 새로고침 시 초기 상태 재로드는 developer 구현 세부사항) |
| `restart-btn` 클릭 | 문항 인덱스·입력값·피드백·progress·누적 채점값 전부 초기화 후 `idle` 복귀 |
