# 숫자 야구 (Number Baseball)

브라우저에서 동작하는 vanilla static 숫자 야구 게임. 서로 다른 세 자리 숫자를 추측하고 매 시도마다 스트라이크/볼/아웃 피드백을 받아, 9회 안에 정답을 맞히면 승리합니다.

> 본 문서는 **planner 가 동결한 UI 계약(ui-contract@v1)의 시각 명세**입니다.
> selector·상태·token 은 변경하거나 재정의하지 않습니다. 상세 설계는 `docs/plans/BF-1772/implementation-plan.md` 를 따릅니다.

## 시각 시안

- 디자인 토큰: [`docs/design/BF-1772/design-tokens.html`](../docs/design/BF-1772/design-tokens.html)
- 화면 상태 시안(playing/win/lose): [`docs/design/BF-1772/design-mockup.html`](../docs/design/BF-1772/design-mockup.html)

## 화면 상태 (states)

| 상태 | 설명 | 화면 |
|------|------|------|
| `playing` | 진행 중 — 입력·제출 가능, 시도 카운트 갱신 | `#game-root` 활성, `#result-screen` 숨김 |
| `win` | 3 스트라이크로 정답 맞힘 | `#result-screen` 노출, 승리 텍스트 + 정답 |
| `lose` | 9회 소진, 정답 못 맞힘 | `#result-screen` 노출, 패배 텍스트 + `#result-answer` 정답 |

- 상태는 **색상만으로 구분하지 않고** 상태명(승리/패배/진행 중)을 화면 텍스트·접근성 이름으로 노출합니다.
- 초기화·재시작 뒤에는 상태·시도·피드백·입력을 초기값(`playing`, 시도 0/9, 빈 피드백)으로 되돌리고 `#guess-input`/`#guess-submit` 을 다시 사용할 수 있습니다.

## DOM ID (exact)

| DOM ID | 용도 |
|--------|------|
| `game-root` | 게임 전체 루트 컨테이너 |
| `rgb-display` | 현재 게임 정보 / 시도 안내 디스플레이 영역 |
| `guess-input` | 세 자리 숫자 추측 입력 필드 |
| `guess-submit` | 추측 제출 버튼 |
| `feedback` | 스트라이크/볼 결과 피드백 영역 (aria-live) |
| `attempts-count` | 남은/사용 시도 표시 |
| `result-screen` | 승/패 결과 화면 컨테이너 |
| `result-answer` | 결과 화면의 정답 노출 영역 |
| `restart-button` | 재시작 버튼 |

## CSS class (exact)

| CSS class | 용도 |
|-----------|------|
| `game` | 게임 루트 블록 |
| `game__display` | 디스플레이 영역 (`#rgb-display`) |
| `game__input` | 입력 필드 (`#guess-input`) |
| `game__submit` | 제출 버튼 (`#guess-submit`) |
| `game__feedback` | 피드백 영역 (`#feedback`) |
| `game__attempts` | 시도 표시 (`#attempts-count`) |
| `game__result` | 결과 화면 (`#result-screen`) |

## 디자인 토큰 (CSS 변수 — exact value)

| 변수 | 값 | 용도 |
|------|-----|------|
| `--color-bg` | `#0f172a` | 배경 |
| `--color-surface` | `#1e293b` | 카드/표면 |
| `--color-text` | `#f8fafc` | 본문 텍스트 |
| `--color-strike` | `#22c55e` | 스트라이크(초록) |
| `--color-ball` | `#eab308` | 볼(노랑) |
| `--color-out` | `#ef4444` | 아웃(빨강) |
| `--space-md` | `16px` | 기본 간격 |
| `--radius-md` | `12px` | 모서리 반경 |
| `--font-size-display` | `1.5rem` | 디스플레이 폰트 크기 |

## 접근성 (accessibility)

- `#guess-input` 은 `aria-label="세 자리 숫자 추측 입력"` 을 가집니다.
- `#guess-submit`·`#restart-button` 은 명시적 `aria-label`(예: "추측 제출", "게임 재시작")을 가집니다.
- `#feedback` 영역은 `aria-live="polite"` 로 스트라이크·볼 결과를 알립니다.
- 모든 상태(`playing`/`win`/`lose`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트·접근성 이름으로 노출합니다.

## 반응형 (responsive)

- 320px 이상에서 content overflow 가 발생하지 않습니다.
- 좁은 너비(모바일)에서 입력·버튼 control 이 **단일 열로 세로 정렬**됩니다.
