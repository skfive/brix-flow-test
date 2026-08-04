# 숫자 맞히기 게임 구현 설계 (BF-1609)

## 0. 개요

PM 이 분해한 Story 를 designer(BF-1607)·developer(BF-1608)가 병렬로 따를 수 있도록
요구사항·acceptance criteria·기술 설계를 정제하고, frozen UI 계약을 그대로 서술한다.

- 본 문서는 **planning-contract** 이자 **ui-contract** 의 서술 산출물이다.
- 아래 파일·소유자·상태·후조건은 frozen Execution Blueprint 가 유일한 권위이며, 본 문서는 그것을 재정의하지 않고 설명만 한다.
- **새 파일·새 역할·계약 밖 요구사항을 추가하지 않는다.**

## 1. 사용자 시나리오

1. 플레이어가 게임 화면에 진입하면 1~100 사이의 임의 정답이 준비된 상태(`ready`)로 시작한다.
2. 플레이어가 숫자를 입력하고 제출하면 시스템이 정답과 비교해 피드백을 준다.
   - 입력이 정답보다 작으면 "더 큰 수"(`guess-higher`) 안내.
   - 입력이 정답보다 크면 "더 작은 수"(`guess-lower`) 안내.
   - 일치하면 "정답"(`win`) 안내 및 시도 횟수 확정.
3. 플레이어는 정답을 맞힐 때까지 반복 제출하며, 매 제출마다 시도 횟수가 증가한다.
4. 정답을 맞히면 최소 시도 횟수(best score)를 `localStorage` 에 갱신·보존한다.
5. 플레이어가 "새 게임"을 누르면 정답이 재설정되고 상태·진행 표시가 초기값(`ready`)으로 되돌아간다.

## 2. Acceptance Criteria (Given/When/Then)

### AC-1 게임 시작 (ready)
- **Given** 플레이어가 게임 화면에 진입했고
- **When** 화면이 로드되면
- **Then** 상태는 `ready` 이며, 시도 횟수(`attempt-count`)는 0, 정답은 1~100 사이 정수로 준비된다.

### AC-2 더 큰 수 안내 (guess-higher)
- **Given** 상태가 `ready`/`guess-higher`/`guess-lower` 이고
- **When** 플레이어가 정답보다 **작은** 값을 제출하면
- **Then** 상태는 `guess-higher` 로 전이하고, 피드백 영역(`feedback`)에 "더 큰 수" 취지의 화면 텍스트를 표시하며 시도 횟수가 1 증가한다.

### AC-3 더 작은 수 안내 (guess-lower)
- **Given** 상태가 `ready`/`guess-higher`/`guess-lower` 이고
- **When** 플레이어가 정답보다 **큰** 값을 제출하면
- **Then** 상태는 `guess-lower` 로 전이하고, 피드백 영역에 "더 작은 수" 취지의 화면 텍스트를 표시하며 시도 횟수가 1 증가한다.

### AC-4 정답 (win)
- **Given** 상태가 진행 중이고
- **When** 플레이어가 정답과 **일치**하는 값을 제출하면
- **Then** 상태는 `win` 으로 전이하고, `feedback` 에 `game__feedback--win` 스타일과 정답 안내 텍스트를 표시하며, 확정된 시도 횟수로 best score(`best-score`)를 갱신 후보로 비교한다.

### AC-5 best score 보존
- **Given** 정답을 맞혀 시도 횟수가 확정됐고
- **When** 확정 시도 횟수가 기존 best score 보다 작거나 best score 가 없으면
- **Then** `localStorage` 의 best score 를 갱신하고 `best-score` 표시를 최신값으로 반영한다. 이후 재방문 시 저장된 best score 를 읽어 표시한다.

### AC-6 새 게임 리셋
- **Given** 임의 상태(`win` 포함)에서
- **When** 플레이어가 "새 게임"(`new-game`)을 누르면
- **Then** 정답이 재설정되고 상태는 `ready`, 시도 횟수 표시는 0, 피드백은 초기값으로 되돌아가며 주 입력 control(`guess-input`)을 다시 사용할 수 있다. best score 는 유지된다.

### AC-7 접근성
- **Given** 게임 화면에서
- **When** 스크린리더/키보드 사용자가 조작하면
- **Then** `guess-submit` 는 `aria-label="추측 제출"` 을 가지고, `feedback` 영역은 `aria-live="polite"` 로 피드백 텍스트를 읽어주며, `guess-input` 은 Enter 키 제출을 지원하고, 모든 상태는 색상만이 아니라 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### AC-8 반응형
- **Given** 뷰포트 폭이 320px 이상이면
- **When** 게임 카드를 렌더링해도
- **Then** 카드 content overflow(가로 스크롤/잘림)가 발생하지 않는다.

## 3. 실패 케이스 · Edge Case

- **비어 있는 입력 / 비숫자**: 제출 시 시도 횟수를 증가시키지 않고 상태를 유지하며 재입력을 유도한다(피드백으로 안내). 정답 판정 대상에서 제외.
- **범위 밖 입력(1 미만 / 100 초과)**: 유효 범위 안내 후 시도 횟수 증가 없이 재입력 유도.
- **동일 값 반복 제출**: 정상 판정하되 상태·시도 횟수 규칙을 그대로 적용한다(별도 예외 없음).
- **`win` 상태에서의 추가 제출**: 새 게임 전까지는 승리 상태를 유지하고 추가 판정을 막는다.
- **localStorage 미지원/차단**: best score 저장 실패를 무시하고 게임 진행 자체는 계속되도록 방어한다(진행 표시는 세션 내에서만 유지).
- **초기화·실패 뒤 복구**: 리셋/실패 후에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(`guess-input`/`guess-submit`)을 다시 사용할 수 있어야 한다.

## 4. 기술 설계

### 4.1 순수함수 분리 (developer)
- `judge(guess, answer)` 를 **순수함수**로 분리한다. side effect 없이 입력값만으로 결과를 반환한다.
  - 반환은 세 상태 축 `guess-higher | guess-lower | win` 을 구분할 수 있는 값이어야 한다(예: `-1`/`+1`/`0` 또는 상태 문자열). exact 반환 형태는 developer 가 계약 selector/상태명과 일관되게 확정한다.
  - DOM·`localStorage`·랜덤 정답 생성 등 부수효과는 `judge` 밖(호출부)에 둔다.
- `node --test` 로 `judge(guess, answer)` 단위 테스트를 작성한다(파일: `guess-number/game.test.js`).
  - 최소 케이스: guess < answer → higher, guess > answer → lower, guess === answer → win, 경계값(1, 100).

### 4.2 상태 모델
- 상태 집합: `ready`, `guess-higher`, `guess-lower`, `win`.
- 전이:
  - `ready` → 제출 → (`guess-higher` | `guess-lower` | `win`)
  - `guess-higher`/`guess-lower` → 제출 → (`guess-higher` | `guess-lower` | `win`)
  - 임의 상태 → 새 게임 → `ready`
- 각 상태는 색상만이 아니라 **상태명 텍스트**로도 화면·접근성 이름에 노출한다.

### 4.3 저장 (best score)
- `localStorage` 에 최소 시도 횟수를 저장한다. 키/직렬화 형식은 developer 가 확정하되, 재방문 시 읽어 `best-score` 에 반영해야 한다(AC-5).

## 5. Frozen UI 계약 (ui-contract@v1 — 그대로 구현)

designer·developer 는 아래 selector·token 을 **변경하거나 재정의하지 않는다**.

### 5.1 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/guess-number-BF-1606.md` | designer | additive |
| `docs/design/guess-number-mockup.html` | designer | additive |
| `guess-number/index.html` | developer | additive |
| `guess-number/style.css` | developer | additive |
| `guess-number/game.js` | developer | additive |
| `guess-number/game.test.js` | developer | additive |

### 5.2 DOM ID
`guess-input`, `guess-submit`, `new-game`, `attempt-count`, `best-score`, `feedback`

### 5.3 CSS class
`game`, `game__input`, `game__submit`, `game__feedback`, `game__feedback--win`, `game__stats`

### 5.4 상태
`ready`, `guess-higher`, `guess-lower`, `win`

### 5.5 디자인 토큰 / CSS 변수
| 변수 | 값 |
| --- | --- |
| `--color-action-primary` | `#2563eb` |
| `--color-feedback-win` | `#16a34a` |
| `--space-control-gap` | `12px` |
| `--font-scale-base` | `16px` |

### 5.6 접근성
- `guess-submit` control 은 `aria-label="추측 제출"` 을 가진다.
- `feedback` 영역은 `aria-live="polite"` 로 피드백 텍스트를 읽어준다.
- `guess-input` 은 Enter 키 제출을 지원한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.7 반응형
- 320px 이상 폭에서 게임 카드 content overflow 가 발생하지 않는다.

## 6. Handoff 계약 (실행 순서)

- **plan (planner, 본 task)** → 요구사항·AC·기술 설계·frozen 계약 서술. 산출물: `docs/plans/guess-number-plan.md`.
- **design (designer, BF-1607)** — `plan` 완료 후 착수. 시안·mockup 을 위 selector/token 으로 구현. 산출물: `docs/design/guess-number-BF-1606.md`, `docs/design/guess-number-mockup.html`.
- **develop (developer, BF-1608)** — `plan` 완료 후 착수. `judge(guess, answer)` 순수함수 + `node --test` 단위 테스트 + UI 구현. 산출물: `guess-number/index.html`, `guess-number/style.css`, `guess-number/game.js`, `guess-number/game.test.js`.
- **review (reviewer)** — `design`·`develop` 완료 후.
- **test (tester)** — `review` 완료 후 `node --test` 결과로 검증.

**불변식**: designer 와 developer 는 승인된 실행 설계를 따르며, `judge(guess, answer)` 순수함수 분리와 `node --test` 단위 테스트 요구를 유지하고, selector·token 을 변경·재정의하지 않는다.
