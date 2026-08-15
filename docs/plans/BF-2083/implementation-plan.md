# 뽀모도로 타이머 구현 설계 — BF-2083

> planner 산출물 (BF-2086). designer(BF-2084)/developer(BF-2085)는 아래 계약을 그대로 따르며 selector·토큰·상태 전이 규칙을 임의로 변경하지 않는다.

## 1. 상태 전이표

### 1.1 상태 모델

- `phase`: `focus` | `short-break` | `long-break` (현재 진행 중인 모드)
- `isRunning`: `boolean` (카운트다운 진행 여부 — false 면 화면상 "일시정지" 상태)
- `remainingSeconds`: `number` (현재 phase 에서 남은 초)
- `cycleCount`: `number` (완료된 집중 세션 누적 횟수, 초기값 0)

`paused` 는 별도 모드 class 가 아니라 `isRunning=false` 로 표현되는 상태이며, 화면 텍스트/색상은 직전 `phase` 값(집중/짧은 휴식/긴 휴식)을 그대로 유지한다.

### 1.2 기본 지속시간

| phase | 지속시간 |
|---|---|
| focus | 25분 (1500초) |
| short-break | 5분 (300초) |
| long-break | 15분 (900초) |

### 1.3 전이 규칙

| 현재 phase | 이벤트 | 조건 | 다음 phase | 다음 duration | cycleCount 변화 |
|---|---|---|---|---|---|
| focus | 시작 버튼 클릭 (최초) | - | focus | 1500초 | 0 |
| focus | 시간 만료 (`remainingSeconds===0`) | `(cycleCount+1) % 4 !== 0` | short-break | 300초 | +1 |
| focus | 시간 만료 | `(cycleCount+1) % 4 === 0` (4회차 집중 완료) | long-break | 900초 | +1 |
| short-break | 시간 만료 | - | focus | 1500초 | 변화 없음 |
| long-break | 시간 만료 | - | focus | 1500초 | 변화 없음 |
| 임의 phase | 일시정지 버튼 클릭 | `isRunning===true` | 동일 phase | 변화 없음 (`isRunning=false`) | 변화 없음 |
| 임의 phase (paused) | 시작 버튼 재클릭 | `isRunning===false` | 동일 phase | 변화 없음 (`isRunning=true`) | 변화 없음 |
| 임의 phase | 리셋 버튼 클릭 | - | focus | 1500초 | 0 으로 초기화 (`isRunning=false`) |

- 4회차마다 긴 휴식: `cycleCount` 는 focus 세션이 "완료"될 때만 증가하며, 증가 후 값이 4의 배수(4, 8, 12…)일 때 `long-break` 로 전환한다.
- 일시정지 중에는 `nextPhase` 가 호출되지 않는다 (카운트다운 자체가 멈추므로 `remainingSeconds` 가 0에 도달하지 않음).
- 리셋은 어떤 phase/일시정지 상태에서도 즉시 초기 상태(focus, 1500초, cycleCount=0, isRunning=false)로 복귀시키고, 시작 컨트롤을 다시 사용할 수 있게 한다.

## 2. 순수함수 시그니처

두 함수 모두 DOM 접근이나 부작용 없이 입력→출력만으로 동작해야 하며 `pomodoro/pomodoro.test.js` 에서 `node --test` 로 검증한다.

### 2.1 `nextPhase(state)`

```
nextPhase(state: { phase: 'focus'|'short-break'|'long-break', cycleCount: number })
  => { phase: 'focus'|'short-break'|'long-break', cycleCount: number, remainingSeconds: number }
```

현재 phase 가 시간 만료로 완료되었을 때 다음 상태를 계산한다 (표 1.3 의 "시간 만료" 행만 담당 — 일시정지/리셋은 UI 레이어에서 별도 처리).

**테스트 케이스 (최소 5개)**

| # | 입력 | 기대 출력 |
|---|---|---|
| 1 | `{phase:'focus', cycleCount:0}` | `{phase:'short-break', cycleCount:1, remainingSeconds:300}` |
| 2 | `{phase:'focus', cycleCount:3}` (4번째 집중 완료) | `{phase:'long-break', cycleCount:4, remainingSeconds:900}` |
| 3 | `{phase:'short-break', cycleCount:1}` | `{phase:'focus', cycleCount:1, remainingSeconds:1500}` |
| 4 | `{phase:'long-break', cycleCount:4}` | `{phase:'focus', cycleCount:4, remainingSeconds:1500}` |
| 5 | `{phase:'focus', cycleCount:7}` (8번째 집중 완료) | `{phase:'long-break', cycleCount:8, remainingSeconds:900}` |

### 2.2 `formatTime(seconds)`

```
formatTime(seconds: number) => string   // "MM:SS" (분/초 각 두 자리, 0 패딩)
```

**테스트 케이스 (최소 5개)**

| # | 입력 | 기대 출력 |
|---|---|---|
| 1 | `1500` | `"25:00"` |
| 2 | `300` | `"05:00"` |
| 3 | `900` | `"15:00"` |
| 4 | `65` | `"01:05"` |
| 5 | `0` | `"00:00"` |

총 10개 테스트 케이스로 acceptance criteria의 "최소 8개"를 충족한다.

## 3. UI 계약 (frozen — 변경 금지)

이 섹션은 frozen blueprint 의 `ui-contract@v1` 을 그대로 옮긴 것이며, planner 는 새 파일이나 역할을 추가하지 않는다. designer/developer 는 아래 selector/토큰/상태명을 재정의하지 않는다.

### 3.1 파일 및 소유자

| 파일 | 소유자 | 정책 |
|---|---|---|
| `docs/design/pomodoro-BF-2083.md` | designer | additive |
| `docs/design/pomodoro-mockup-BF-2083.html` | designer | additive |
| `pomodoro/index.html` | developer | replace |
| `pomodoro/pomodoro.js` | developer | replace |
| `pomodoro/pomodoro.test.js` | developer | replace |
| `pomodoro/style.css` | developer | replace |

### 3.2 DOM ID / CSS class

- DOM ID: `timer-display`, `timer-mode`, `timer-count`, `btn-start`, `btn-pause`, `btn-reset`
- CSS class: `timer`, `timer__display`, `timer__mode`, `timer__count`, `timer__controls`, `timer__button`, `mode-focus`, `mode-short-break`, `mode-long-break`

### 3.3 상태

`focus`, `short-break`, `long-break`, `paused`

### 3.4 디자인 토큰

- `--color-focus-bg: #fef3f2`
- `--color-short-break-bg: #f0fdf4`
- `--color-long-break-bg: #eff6ff`
- `--color-text-primary: #1f2937`
- `--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### 3.5 접근성

- 시작/일시정지/리셋 버튼은 명시적 `aria-label` 을 가진다.
- 남은 시간 표시 영역(`#timer-display`)은 `aria-live="polite"` 로 스크린리더에 갱신을 알린다.
- Tab 키 순서로 시작→일시정지→리셋 버튼에 순차 접근 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형

- 320px 이상 뷰포트에서 콘텐츠 overflow 없이 표시된다.
- 768px 이상에서 컨트롤 버튼(`#btn-start`, `#btn-pause`, `#btn-reset`)이 가로 정렬된다.

### 3.7 불변 조건 (invariants)

- selector 와 design token 을 변경하거나 재정의하지 않는다.
- 모드 전환 시 화면에 표시되는 텍스트(집중/짧은 휴식/긴 휴식)가 색상 변화와 함께 갱신된다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(시작 버튼)을 다시 사용할 수 있어야 한다.
- 파일 소유권과 상태 계약은 이 frozen blueprint 가 유일한 권위이며, 다른 문서가 이를 재정의하지 않는다.

## 4. 참고 — 기존 `pomodoro/` 디렉터리

worktree 안에 이미 `pomodoro/index.html`, `pomodoro/pomodoro.js`, `pomodoro/style.css` 외에 `main.js`, `storage.js`, `styles.css`, `timer.js`, `tests/` 가 존재한다. 이는 developer(BF-2085) owned_paths 밖이므로 planner 가 임의로 정리하지 않는다. developer 는 `artifact-policy:replace` 대상 파일(`index.html`, `pomodoro.js`, `style.css`, `pomodoro.test.js`)만 교체하고, 그 외 파일 존재 여부는 PR 설명에 별도로 언급하는 것을 권장한다.
