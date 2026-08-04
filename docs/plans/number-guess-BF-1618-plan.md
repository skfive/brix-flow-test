<!-- bf:tech-stack:vanilla-static -->
# 숫자 맞히기 게임 — 실행 설계·UI 계약 (BF-1618)

- **Jira**: BF-1618 (planner: BF-1621)
- **문서 성격**: planning-contract@v1 + ui-contract@v1 동결 문서
- **기술 스택**: vanilla-static (HTML/CSS/JS, ESM, 번들러 없음)
- **소비 페르소나**: designer(BF-1619), developer(BF-1620)

> 이 문서는 frozen Execution Blueprint를 **그대로 렌더링**한 실행 설계다.
> 파일·소유자·상태·후조건은 frozen blueprint가 유일한 권위이며, 이 문서는 이를
> 재정의하지 않는다. 새 파일·새 역할·contract 밖 요구사항을 추가하지 않는다.

---

## 1. 요구사항 정제

브라우저에서 동작하는 1~100 사이 정수 숫자 맞히기 게임을 vanilla-static 스택으로
구현한다. 사용자는 숫자를 입력해 제출하고, 게임은 정답과 비교해 "더 큼/더 작음/정답"
피드백을 준다. 시도 횟수를 집계하고, 최소 시도(best-score)를 `localStorage`에 저장해
새 게임에서도 유지한다.

정답 판정은 순수함수 `judge(guess, answer)`로 분리해 단위 테스트로 검증한다.
DOM·렌더링과 판정 로직을 분리하는 것이 이 설계의 핵심 원칙이다.

---

## 2. 사용자 시나리오

- **A. 정상 플레이**: 사용자가 게임 화면에 진입 → 안내에 따라 숫자 입력 → 제출 →
  힌트(더 큼/더 작음) 확인 → 반복 → 정답 도달 시 승리 메시지와 시도 횟수 표시.
- **B. 잘못된 입력**: 사용자가 범위 밖 값·비정수·빈 값을 제출 → 오류 안내 표시,
  제출은 계속 가능(시도 횟수 미증가).
- **C. 재도전**: 승리 후 또는 진행 중 "새 게임"을 눌러 상태·진행 표시를 초기화하고
  다시 플레이. best-score는 유지.

---

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 · idle 진입
- **Given** 게임이 처음 로드되면
- **When** 화면이 렌더된다
- **Then** `#guess-feedback`에 `1~100 사이 숫자를 입력하세요` 안내가 보이고,
  `#guess-submit`이 활성 상태다.

### AC-2 · 더 큼 힌트
- **Given** 정답보다 작은 값을 입력하고
- **When** 제출하면
- **Then** `#guess-feedback`에 `더 큼 ↑` 텍스트가 표시되고 `#attempts-count`가 1 증가한다.

### AC-3 · 더 작음 힌트
- **Given** 정답보다 큰 값을 입력하고
- **When** 제출하면
- **Then** `#guess-feedback`에 `더 작음 ↓` 텍스트가 표시되고 `#attempts-count`가 1 증가한다.

### AC-4 · 정답(win)
- **Given** 정답과 같은 값을 입력하고
- **When** 제출하면
- **Then** `#guess-feedback`에 `정답! N번 만에 맞혔습니다` (N=시도 횟수)가 표시되고,
  `#guess-submit`이 비활성화된다. best-score가 갱신 대상이면 `#best-score`가 갱신된다.

### AC-5 · 잘못된 입력(invalid)
- **Given** 1~100 밖의 값·비정수·빈 값을 입력하고
- **When** 제출하면
- **Then** `#guess-feedback`에 `1~100 사이 정수를 입력하세요` 오류 텍스트가 표시되고,
  `#guess-submit`은 활성 상태를 유지하며 `#attempts-count`는 증가하지 않는다.

### AC-6 · 새 게임(초기화)
- **Given** 임의 상태에서
- **When** `#new-game`을 누르면
- **Then** 상태와 `#attempts-count`가 초기값으로 되돌아가고, `#guess-feedback`은 idle
  안내로 복귀하며, `#guess-submit`이 다시 활성화된다. best-score는 유지된다.

### AC-7 · best-score 유지
- **Given** 이전 게임에서 best-score가 `localStorage`에 저장돼 있으면
- **When** 새로고침 후 화면이 로드된다
- **Then** `#best-score`에 저장된 최소 시도 횟수가 표시된다.

---

## 4. Edge case · 실패 케이스

- 빈 입력 제출 → invalid 상태(AC-5), 시도 횟수 미증가.
- `0`, `101`, 음수, 소수(`50.5`), 문자(`abc`) → invalid 상태.
- 승리 후 추가 제출 시도 → `#guess-submit` 비활성으로 차단.
- best-score 미존재(최초 플레이) → `#best-score`는 미기록/placeholder 표시,
  첫 승리 시 최초 기록.
- 동일 게임에서 더 큰 시도 횟수로 이겨도 기존 best-score보다 크면 갱신하지 않는다.
- `new-game` 이후: 상태·진행 표시는 초기값, 주 실행 control(`#guess-submit`) 재사용 가능.

---

## 5. UI 계약 (ui-contract@v1 — 동결)

> designer(시각 명세·mockup)와 developer(런타임 구현)는 아래 domId, cssClass,
> designToken 값을 **변경하거나 재정의하지 않는다**. 아래 6개 파일은 additive 정책이며
> 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위다.

### 5.1 파일·소유자

| 파일 | 소유자 |
| --- | --- |
| `docs/design/number-guess-BF-1618-mockup.html` | designer |
| `docs/design/number-guess-BF-1618-spec.md` | designer |
| `number-guess/game.js` | developer |
| `number-guess/game.test.js` | developer |
| `number-guess/index.html` | developer |
| `number-guess/style.css` | developer |

### 5.2 DOM ID

| ID | 용도 |
| --- | --- |
| `guess-form` | 입력 폼 |
| `guess-input` | 숫자 입력 |
| `guess-submit` | 제출 버튼(주 실행 control) |
| `guess-feedback` | 상태·힌트·오류 텍스트 영역 |
| `attempts-count` | 시도 횟수 표시 |
| `best-score` | 최소 시도(best-score) 표시 |
| `new-game` | 새 게임 초기화 버튼 |

### 5.3 CSS class

`game`, `game__form`, `game__input`, `game__submit`, `game__feedback`, `game__stats`

### 5.4 상태 모델 (안내 텍스트 포함)

| 상태 | 화면 텍스트 | submit |
| --- | --- | --- |
| `idle` | `1~100 사이 숫자를 입력하세요` | 활성 |
| `hint-higher` | `더 큼 ↑` | 활성 |
| `hint-lower` | `더 작음 ↓` | 활성 |
| `win` | `정답! N번 만에 맞혔습니다` | 비활성 |
| `invalid` | `1~100 사이 정수를 입력하세요` | 활성 유지 |

### 5.5 Design Token

| 토큰 | 값 |
| --- | --- |
| `--color-action-primary` | `#2563eb` |
| `--color-feedback-correct` | `#16a34a` |
| `--color-feedback-hint` | `#d97706` |
| `--color-feedback-error` | `#dc2626` |
| `--space-control-gap` | `12px` |
| `--font-stack` | `system-ui` |

### 5.6 접근성

- `#guess-input`은 `aria-label='1부터 100 사이 숫자 입력'`을 가진다.
- `#guess-submit`은 명시적 `aria-label='추측 제출'`을 가진다.
- `#guess-feedback` 영역은 `aria-live='polite'`로 상태 텍스트를 읽어준다.
- `#guess-input`에서 **Enter 키**로 제출을 지원한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.7 반응형

- 320px 이상에서 content overflow가 발생하지 않는다.
- 360px 미만에서 입력·버튼 컨트롤이 세로로 stack된다.

---

## 6. 기술 설계

### 6.1 judge 순수함수 계약 (동결)

```
judge(guess, answer) → 'higher' | 'lower' | 'correct'
```

- 입력: `guess`(사용자 추측 정수), `answer`(정답 정수, 1~100)
- 반환:
  - `guess < answer` → `'higher'` (정답이 더 큼 → UI `hint-higher`)
  - `guess > answer` → `'lower'` (정답이 더 작음 → UI `hint-lower`)
  - `guess === answer` → `'correct'` (UI `win`)
- 순수함수: 부수효과·DOM 접근·전역 상태 없음. 입력 검증(범위·정수)은 호출부에서
  수행하며, `judge`는 판정만 담당한다. developer가 이 시그니처와 반환값을 임의로
  바꾸지 않는다.

### 6.2 best-score localStorage 키 (동결)

- 키: `number-guess-best-score`
- 값: 최소 시도 횟수(정수 문자열). 승리 시 기존 값보다 작으면 갱신, 미존재 시 최초 기록.
- 읽기 실패·미존재 시 best-score 미표시(placeholder)로 처리하고 게임은 정상 진행한다.

### 6.3 데이터 모델

런타임 상태(메모리):

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `answer` | integer(1~100) | 현재 게임 정답 |
| `attempts` | integer ≥ 0 | 유효 제출 누적 횟수 |
| `status` | enum | `idle`/`hint-higher`/`hint-lower`/`win`/`invalid` |
| `bestScore` | integer \| null | `localStorage`에서 로드된 최소 시도 |

영속 상태: `localStorage['number-guess-best-score']`만 사용. 서버·DB·마이그레이션 없음.

---

## 7. 소유권 경계 (재정의 아님)

- **런타임·테스트 파일**(`number-guess/game.js`, `game.test.js`, `index.html`,
  `style.css`) 소유권은 **developer**에 있다. 이 planner 문서는 이를 재정의하지 않는다.
- **시각 명세**(`docs/design/number-guess-BF-1618-spec.md`,
  `number-guess-BF-1618-mockup.html`) 소유권은 **designer**에 있다.
- planner는 위 계약을 동결해 두 페르소나가 병렬로 일관되게 구현하도록 하는 것만
  담당한다.

---

## AI-Generated
이 문서는 brix-Flow planner 페르소나(박기획)가 frozen Execution Blueprint를 렌더링해
작성했다.
