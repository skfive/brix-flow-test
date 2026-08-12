# 인터벌 타이머 구현 설계 (BF-1984)

- 관련 Epic/후속 Task: BF-1982(designer), BF-1983(developer)
- 작성: planner(박기획)
- 상태: frozen — designer/developer는 아래 계약을 그대로 따른다. 이 문서는 frozen blueprint(`ui-contract@v1`, `planning-contract@v1`)를 구현 가능한 계획으로 서술할 뿐이며 새 파일·새 역할·새 selector/token을 추가하지 않는다.

## 1. 목적 / 사용자 시나리오

사용자는 work(작업) 구간과 rest(휴식) 구간을 번갈아 반복하는 인터벌 타이머를 사용한다.
- work 구간이 끝나면 자동으로 rest 구간으로, rest 구간이 끝나면 자동으로 다음 라운드의 work 구간으로 전환된다.
- 사용자는 언제든 일시정지/재개할 수 있고, 언제든 초기 상태로 리셋할 수 있다.
- 사용자는 마우스 클릭 없이 키보드(Space = 시작/일시정지 토글, R = 리셋)만으로 전체 흐름을 조작할 수 있다.
- 화면은 남은 시간(mm:ss), 현재 구간(work/rest), 라운드 진행도를 항상 명확히 보여주며 스크린리더 사용자에게도 상태 변화를 알린다.

## 2. 상태 다이어그램

### 2.1 상태 목록 (frozen)
`idle`, `work`, `rest`, `paused`

### 2.2 전이 규칙

```
[idle] --(Start 클릭 #timer-start-pause | Space)--> [work]
                                                        |
                                    work 잔여시간 00:00 도달
                                                        v
                                                     [rest]
                                                        |
                                    rest 잔여시간 00:00 도달
                                        |                              |
                            현재 라운드 < 총 라운드           현재 라운드 == 총 라운드
                                        v                              v
                              [work] (라운드 +1)              [idle] (세션 완료, 초기화)

[work] --(Start/Pause 클릭 | Space)--> [paused] (직전 phase=work 기억)
[rest] --(Start/Pause 클릭 | Space)--> [paused] (직전 phase=rest 기억)
[paused] --(Start/Pause 클릭 | Space)--> 기억해둔 phase([work] 또는 [rest])로 복귀, 잔여시간 이어서 카운트다운

[work|rest|paused] --(Reset 클릭 #timer-reset | R 키)--> [idle] (완전 초기화)
[idle] --(R 키)--> [idle] (no-op, 이미 초기 상태)
```

- **라운드 카운트 증가 시점**: rest → work로 자동 전환되는 순간에만 +1. work 진입 최초(1라운드 시작) 및 rest 유지 중에는 값 유지.
- **일시정지 중 표시**: `paused`는 별도 CSS phase 클래스나 토큰이 없다(§4 참고). 진입 직전 phase의 `.timer__phase--work`/`.timer__phase--rest` 클래스는 그대로 유지하고, `#timer-phase-label` 텍스트만 "일시정지"로 바꾼다. 잔여시간은 멈춘 값 그대로 표시한다.
- **리셋 시 복원값**: `#timer-display` = 초기 work 구간 시간(§5 기본값), `#timer-round-count` = 1라운드째 표시, phase 클래스 제거(= idle 기본 상태), `#timer-start-pause` aria-label = "시작".
- **세션 완료(마지막 rest 종료)**: 자동으로 `idle`로 돌아가며 리셋과 동일한 화면 상태가 되지만, `#timer-display`의 `aria-live="polite"` 영역에는 완료 안내 문구(예: "모든 라운드를 완료했습니다")를 1회 노출한다.

## 3. Acceptance Criteria (Given/When/Then)

| # | Given | When | Then |
|---|---|---|---|
| AC1 | `idle` 상태 | `#timer-start-pause` 클릭 또는 Space | 상태 `work`로 전환, `#timer-phase-label`="작업", `.timer__phase--work` 적용, `#timer-display`가 work 초기 잔여시간(mm:ss)부터 카운트다운 시작, 버튼 aria-label="일시정지" |
| AC2 | `work` 상태, 잔여시간 00:00 도달 | (자동) | 상태 `rest`로 전환, `#timer-phase-label`="휴식", `.timer__phase--rest` 적용, `#timer-display`가 rest 초기 잔여시간으로 리셋 후 카운트다운, 라운드 카운트 불변 |
| AC3 | `rest` 상태, 잔여시간 00:00 도달, 현재 라운드 < 총 라운드 | (자동) | 상태 `work`로 전환, `#timer-round-count` +1, `#timer-display`가 work 초기 잔여시간으로 리셋 |
| AC4 | `rest` 상태, 잔여시간 00:00 도달, 현재 라운드 == 총 라운드 | (자동) | 상태 `idle`로 전환(세션 완료), 표시값 초기화, `aria-live` 영역에 완료 문구 노출 |
| AC5 | `work` 또는 `rest` 상태 | `#timer-start-pause` 클릭 또는 Space | 상태 `paused`, 카운트다운 정지, 직전 phase 클래스 유지, 버튼 aria-label="시작" |
| AC6 | `paused` 상태 | `#timer-start-pause` 클릭 또는 Space | 기억된 phase(`work`/`rest`)로 복귀, 남은 시간부터 카운트다운 재개, 버튼 aria-label="일시정지" |
| AC7 | 임의 상태(`work`/`rest`/`paused`) | `#timer-reset` 클릭 또는 R 키 | 상태 `idle`, 표시값·라운드·phase 클래스 초기화, 버튼 aria-label="시작" |
| AC8 | `idle` 상태 | R 키 | 아무 변화 없음(no-op) |
| AC9 | 임의 상태 | 상태 전환 발생 | `#timer-display`(`aria-live="polite"`)가 변경 내용을 스크린리더에 안내 |
| AC10 | 뷰포트 320px 이상 | `.timer` 렌더 | `.timer__control` 그룹이 줄바꿈되어도 콘텐츠 overflow 없음 |

## 4. UI 계약 (frozen — designer/developer 공통, 변경·재정의 금지)

### 4.1 파일 및 소유자
| 경로 | 소유자 | 비고 |
|---|---|---|
| `apps/interval-timer/index.html` | developer | DOM 구조, §4.2 ID 포함 |
| `apps/interval-timer/style.css` | developer | §4.2 class/token 사용 |
| `apps/interval-timer/timer.js` | developer | 상태 전이 로직(§2) |
| `apps/interval-timer/tests/timer.test.js` | developer | §3 AC 커버 |
| `docs/design/BF-1981/design-spec.md` | designer | §2·§4 계약을 시각/문구로 구체화 |
| `docs/design/BF-1981/mockup.html` | designer | idle/work/rest/paused 4개 상태 시안 |

### 4.2 DOM ID / CSS class (frozen, 신규 추가·이름 변경 금지)
- DOM IDs: `timer-root`, `timer-display`, `timer-phase-label`, `timer-round-count`, `timer-start-pause`, `timer-reset`
- CSS classes: `timer`, `timer__display`, `timer__control`, `timer__phase--work`, `timer__phase--rest`
  - `idle`: phase 수식 class 없음(기본), 색상은 `--color-phase-idle` 사용
  - `paused`: 신규 class를 만들지 않고 직전 phase의 `.timer__phase--work`/`.timer__phase--rest`를 유지(§2.2)

### 4.3 상태 (frozen)
`idle`, `work`, `rest`, `paused` — §2 전이 규칙을 그대로 구현.

### 4.4 Design Token (frozen)
- `--color-phase-work: #2563eb`
- `--color-phase-rest: #16a34a`
- `--color-phase-idle: #6b7280`
- `--space-control-gap: 12px`

### 4.5 접근성 (frozen)
- `#timer-start-pause`는 현재 동작 상태를 나타내는 `aria-label`을 갖는다(값은 "시작" 또는 "일시정지" 두 가지만 사용, §2.2).
- `#timer-display` 컨테이너는 `aria-live="polite"`로 구간 전환과 남은 시간 변경을 알린다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트(`#timer-phase-label`)와 접근성 이름으로 함께 노출한다.

### 4.6 반응형 (frozen)
- 320px 이상 뷰포트에서 `.timer` 내 컨트롤 그룹(`.timer__control`)이 줄바꿈되어도 콘텐츠 overflow가 발생하지 않는다.

## 5. 데이터/설정 모델 (developer 구현 세부, `timer.js` 내부 상수 — 계약 확장 아님)

상태 계약(§2, §4)은 frozen이지만 구체적인 구간 길이·총 라운드 수는 UI 계약에 명시되어 있지 않으므로 developer가 `timer.js` 내 상수로 구현한다. 참고 기본값(조정 가능):
- work 구간: 25:00 (1500초)
- rest 구간: 5:00 (300초)
- 총 라운드 수: 4

이 값들은 파일 소유권·selector·token 계약을 변경하지 않는 순수 구현 상수이며, 필요 시 developer가 팀 합의로 조정할 수 있다(단, mm:ss 표시 포맷과 §2 전이 규칙은 유지).

## 6. Edge Case / 실패 케이스

1. **idle 상태에서 R 키** — AC8, no-op.
2. **입력 요소 포커스 중 Space** — `#timer-start-pause`/`#timer-reset`가 아닌 다른 포커스 가능 요소가 있다면 Space의 기본 스크롤 동작을 막기 위해 `preventDefault` 처리가 필요하다(구현 세부, developer 담당).
3. **탭 비활성화 후 복귀 시 드리프트** — `setInterval` 누적 오차를 막기 위해 목표 종료 timestamp 기반으로 잔여시간을 재계산해야 한다(구현 세부, developer 담당). 계약상 요구되는 결과는 §3 AC1~AC4의 mm:ss 정확성이다.
4. **연속 클릭/연타** — `#timer-start-pause`를 연타해도 상태는 §2 전이표를 벗어나지 않아야 한다(work↔paused, rest↔paused 토글만 가능).
5. **마지막 라운드 rest 종료 직후 재시작** — 세션 완료 후 idle에서 다시 Start를 누르면 AC1부터 정상적으로 재시작되어야 한다(1라운드부터 다시 시작).

## 7. Downstream 실행 가이드

- **designer(BF-1982)**: `docs/design/BF-1981/design-spec.md`, `docs/design/BF-1981/mockup.html`에 §2 4개 상태(idle/work/rest/paused)를 모두 시안화하고, §4의 ID/class/token/접근성/반응형 규칙을 그대로 반영한다. 새 selector·token을 만들지 않는다.
- **developer(BF-1983)**: `apps/interval-timer/{index.html,style.css,timer.js}`에 §2 상태 전이와 §4 UI 계약을 구현하고, `apps/interval-timer/tests/timer.test.js`에서 §3 AC1~AC10을 커버한다.
- **reviewer/tester**: §3 AC 표를 기준으로 상태 전이·접근성·반응형을 검증한다.
