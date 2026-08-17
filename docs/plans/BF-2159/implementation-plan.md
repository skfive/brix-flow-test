# BF-2159 스톱워치 + 랩타임 구현 설계

## 1. 개요
- 대상 모듈: `stopwatch` (flat-modules 확장, 신규 파일/역할 추가 없음)
- 상태(frozen): `idle`, `running`, `paused` 3종
- 본 문서는 frozen blueprint(ui-contract@v1)의 파일·소유자·상태·후조건을 그대로 기술한 실행 설계이며, designer(BF-2160)·developer(BF-2161)가 변경 없이 그대로 따른다.

## 2. 상태 전이표

| 현재 상태 | 트리거(버튼) | 다음 상태 | 비고 |
|---|---|---|---|
| idle | `stopwatch-start` 클릭 | running | 경과시간 0에서 시작 |
| running | `stopwatch-pause` 클릭 | paused | 누적 경과시간 확정 후 정지 |
| running | `stopwatch-lap` 클릭 | running | 랩 기록 추가, 상태는 유지 |
| paused | `stopwatch-start` 클릭 (라벨 "재개") | running | 기존 누적 경과시간에서 재개 |
| paused | `stopwatch-reset` 클릭 | idle | 경과시간 0, 랩 목록 초기화 |

## 3. 버튼 활성 규칙

| 상태 | stopwatch-start | stopwatch-pause | stopwatch-reset | stopwatch-lap |
|---|---|---|---|---|
| idle | 활성 (라벨 "시작") | 비활성 | 비활성 | 비활성 (`disabled` + `aria-disabled="true"`) |
| running | 비활성 | 활성 | 비활성 | 활성 |
| paused | 활성 (라벨 "재개") | 비활성 | 활성 | 비활성 (`disabled` + `aria-disabled="true"`) |

- `stopwatch-start`는 idle/paused 겸용 단일 버튼이다. 별도 DOM 요소를 추가하지 않고 상태에 따라 텍스트·`aria-label`만 "시작" ↔ "재개"로 전환한다.
- 리셋은 paused에서만 활성화된다(running 중 리셋 불가, idle은 이미 초기값이므로 비활성).

## 4. UI 계약 (Exact, frozen — 변경·재정의 금지)

### 4.1 산출물 파일 및 소유자
| 파일 | 소유자 | 정책 |
|---|---|---|
| `docs/design/stopwatch-BF-2159-mockup.html` | designer | additive |
| `docs/design/stopwatch-BF-2159.md` | designer | additive |
| `stopwatch/index.html` | developer | replace |
| `stopwatch/style.css` | developer | replace |
| `stopwatch/stopwatch.js` | developer | replace |
| `stopwatch/stopwatch.test.js` | developer | additive |

### 4.2 DOM ID
`stopwatch-display`, `stopwatch-start`, `stopwatch-pause`, `stopwatch-reset`, `stopwatch-lap`, `stopwatch-lap-list`

### 4.3 CSS class
`stopwatch`, `stopwatch__display`, `stopwatch__controls`, `stopwatch__lap-list`, `stopwatch__lap-item`, `lap--fastest`, `lap--slowest`

### 4.4 상태
`idle`, `running`, `paused`

### 4.5 디자인 토큰
| 토큰 | 값 |
|---|---|
| `--color-bg` | `#101418` |
| `--color-surface` | `#1b2129` |
| `--color-text` | `#f5f7fa` |
| `--color-accent` | `#4f9dff` |
| `--color-fastest` | `#34d399` |
| `--color-slowest` | `#f87171` |
| `--font-family-base` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `--space-control-gap` | `12px` |

### 4.6 접근성
- 시작/일시정지/재개 버튼은 현재 동작을 나타내는 `aria-label`을 갖는다(예: '시작', '일시정지', '재개').
- 랩 버튼은 정지 상태(idle/paused)에서 `disabled` 속성과 `aria-disabled="true"`를 함께 갖는다.
- 최단/최장 랩은 색상뿐 아니라 '최단랩'/'최장랩' 텍스트 라벨로도 함께 구분 표시된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.7 반응형
320px 이상 뷰포트에서 컨트롤 버튼과 랩 목록이 가로 overflow 없이 표시되고, 랩 목록은 세로 스크롤로 대체된다.

### 4.8 후조건 (frozen invariant)
초기화(리셋)·취소·실패 뒤에는 상태와 진행 표시를 초기값(idle, `00:00.00`, 빈 랩 목록)으로 되돌리고 `stopwatch-start`를 다시 사용할 수 있어야 한다.

## 5. Acceptance Criteria (Given/When/Then)

**AC-1 idle에서 시작**
- Given 스톱워치가 idle 상태이고 `stopwatch-start`만 활성일 때
- When 사용자가 `stopwatch-start`를 클릭하면
- Then 상태가 running으로 전환되고 `stopwatch-pause`/`stopwatch-lap`이 활성화되며 `stopwatch-start`/`stopwatch-reset`은 비활성화된다.

**AC-2 running에서 랩 기록**
- Given 스톱워치가 running 상태일 때
- When 사용자가 `stopwatch-lap`을 클릭하면
- Then 새 랩이 `stopwatch-lap-list`에 추가되고 상태는 running으로 유지되며, 랩이 2개 이상이면 최단/최장 랩에 색상과 텍스트 라벨('최단랩'/'최장랩')이 함께 표시된다.

**AC-3 running에서 일시정지**
- Given 스톱워치가 running 상태일 때
- When 사용자가 `stopwatch-pause`를 클릭하면
- Then 상태가 paused로 전환되고 `stopwatch-start`(라벨 "재개")/`stopwatch-reset`이 활성화되며 `stopwatch-pause`/`stopwatch-lap`은 비활성화된다.

**AC-4 paused에서 재개**
- Given 스톱워치가 paused 상태일 때
- When 사용자가 `stopwatch-start`(라벨 "재개")를 클릭하면
- Then 상태가 running으로 전환되고 기존 누적 경과시간에서 계속 진행된다.

**AC-5 paused에서 리셋**
- Given 스톱워치가 paused 상태일 때
- When 사용자가 `stopwatch-reset`을 클릭하면
- Then 상태가 idle로 전환되고 display가 `00:00.00`, `stopwatch-lap-list`가 비워지며 `stopwatch-start`(라벨 "시작")만 활성화된다.

## 6. Edge case / 실패 케이스
- running 중에는 `stopwatch-reset`이 비활성 상태이므로 리셋은 반드시 paused를 경유해야 한다.
- idle/paused 상태에서 `stopwatch-lap`은 `disabled` + `aria-disabled="true"`로 조작이 차단된다.
- 랩이 1개 이하이면 최단/최장 랩 배지를 표시하지 않는다(비교 대상 2개 미만).
- 320px 미만은 계약 범위 밖이며, 320px 이상에서 가로 overflow가 발생하면 AC 미충족으로 본다.

## 7. 후속 페르소나 안내
- **designer (BF-2160)**: 4.1~4.7 계약을 `docs/design/stopwatch-BF-2159-mockup.html`, `docs/design/stopwatch-BF-2159.md`에 변경 없이 반영한다.
- **developer (BF-2161)**: 2~4장의 상태 전이·버튼 활성 규칙·UI 계약을 `stopwatch/index.html`, `stopwatch/style.css`, `stopwatch/stopwatch.js`에 구현하고, `stopwatch/stopwatch.test.js`에 상태 전이·접근성 단위 테스트를 추가한다.
- **reviewer**: 상태 전이표·UI 계약 준수 여부와 파일 소유권(artifact-policy) 위반 여부를 검토한다.
- **tester (BF-2164)**: AC-1~AC-5와 320px 반응형 시나리오를 검증한다.
