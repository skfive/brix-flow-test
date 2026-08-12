# 뽀모도로 타이머 구현 설계 (BF-2005 / plan: BF-2008)

## 0. 문서 목적 및 범위

이 문서는 BF-2005 Epic 산하 뽀모도로 타이머 기능을 designer(BF-2006)와 developer(BF-2007)가
충돌 없이 병렬 작업할 수 있도록, frozen Execution Blueprint의 UI 계약을 그대로 서술하고
상태 전이표·순수 함수 시그니처·설정 값 검증 정책을 정의한다.

**이 문서는 frozen blueprint의 파일·소유자·상태·후조건을 재정의하지 않으며, 새 파일이나 역할을
추가하지 않는다.** 아래 "산출물 및 소유권" 절은 frozen ui-contract@v1 을 그대로 옮긴 것이다.

> 참고: 저장소의 `pomodoro/` 디렉터리에는 이미 다른 작업(BF-430/BF-432 계열)의 레거시 구현
> (`main.js`, `storage.js`, `styles.css`, `timer.js`, `index.html`)이 존재한다. 이번 frozen
> blueprint가 지정한 `pomodoro/index.html`은 레거시 파일과 이름이 같아 developer가 해당 파일을
> 덮어써야 한다. 이는 frozen blueprint가 지정한 그대로이며, 본 문서는 이 사실을 developer/designer가
> 인지하도록 기록만 할 뿐 파일 목록이나 소유권을 변경하지 않는다.

## 1. 산출물 및 소유권 (frozen blueprint 그대로)

| 파일 | 소유자 |
|---|---|
| `docs/design/pomodoro-BF-2005-mockup.html` | designer |
| `docs/design/pomodoro-BF-2005.md` | designer |
| `pomodoro/index.html` | developer |
| `pomodoro/pomodoro.js` | developer |
| `pomodoro/style.css` | developer |
| `pomodoro/tests/pomodoro.test.js` | developer |

모든 파일은 `artifact-policy: additive` — 기존 형제 산출물을 삭제하지 않고 추가한다.
designer/developer는 아래 selector·token을 변경하거나 재정의하지 않는다.

## 2. 사용자 시나리오

사용자는 집중 작업을 위해 뽀모도로 타이머 화면을 연다. 집중 시간(분)과 휴식 시간(분)을
설정하고 시작 버튼을 눌러 카운트다운을 시작한다. 필요하면 일시정지 후 재개할 수 있고,
언제든 리셋으로 처음 상태로 되돌릴 수 있다. 집중 시간이 끝나면 자동으로 휴식으로 전환되고,
휴식이 끝나면 다시 집중으로 전환되며 완료한 집중 세션 수가 누적 표시된다.

## 3. Acceptance Criteria (Given/When/Then)

### AC-1. 기본 idle 상태
- Given 페이지를 처음 로드했을 때
- When 사용자가 아무 조작도 하지 않았다면
- Then 상태는 `idle`이고 `timer-display`는 설정된 focus 분(기본 25분)을 `MM:SS`로 표시하며,
  `status-label`은 대기 상태 텍스트를 노출하고, `session-count`는 0이다.

### AC-2. 타이머 시작 (idle → focus)
- Given 상태가 `idle`
- When 사용자가 `start-button`을 클릭(또는 Enter/Space)하면
- Then 상태는 `focus`로 전이되고 `pomodoro-app` 요소에 `pomodoro-app--focus` 클래스가 적용되며
  1초마다 `timer-display`가 감소한다.

### AC-3. 일시정지 (focus/break → paused)
- Given 상태가 `focus` 또는 `break`
- When 사용자가 `pause-button`을 클릭하면
- Then 상태는 `paused`로 전이되고 `timer-display`는 멈춘 시점의 남은 시간을 유지하며,
  `status-label`은 일시정지 상태를 텍스트로 알린다. 일시정지 직전 모드(focus/break)의
  배경 클래스는 유지된다.

### AC-4. 재개 (paused → focus/break)
- Given 상태가 `paused`
- When 사용자가 `start-button`을 클릭하면
- Then 상태는 일시정지 직전 모드(focus 또는 break)로 복귀하고, 남은 시간부터 카운트다운을
  재개한다.

### AC-5. 리셋 (모든 상태 → idle)
- Given 상태가 `focus`, `break`, `paused` 중 하나
- When 사용자가 `reset-button`을 클릭하면
- Then 상태는 `idle`로 전이되고, `timer-display`는 현재 설정된 focus 분으로 되돌아가며,
  `session-count`는 0으로 초기화되고, `progress-ring` 진행 표시도 초기값(0%)으로 돌아간다.
  `start-button`은 다시 사용 가능하다.

### AC-6. 집중 세션 자동 완료 (focus → break)
- Given 상태가 `focus`이고 `timer-display`가 `00:00`에 도달
- When 다음 tick이 발생하면
- Then 상태는 `break`로 전이되고 `pomodoro-app--focus` 대신 `pomodoro-app--break` 클래스가
  적용되며, `session-count`가 1 증가하고 `timer-display`는 설정된 break 분으로 재설정된다.

### AC-7. 휴식 자동 완료 (break → focus)
- Given 상태가 `break`이고 `timer-display`가 `00:00`에 도달
- When 다음 tick이 발생하면
- Then 상태는 `focus`로 전이되고 `pomodoro-app--break` 대신 `pomodoro-app--focus` 클래스가
  적용되며, `timer-display`는 설정된 focus 분으로 재설정된다. `session-count`는 변하지 않는다.

### AC-8. 설정 값 — 유효 범위
- Given 상태가 `idle`
- When 사용자가 `focus-duration-input` 또는 `break-duration-input`에 1~60 사이의 정수를 입력하면
- Then 값이 즉시 반영되고 `settings-error`는 숨김 상태(`settings-error--visible` 클래스 제거)를
  유지하며, `timer-display`는 갱신된 focus 분을 반영한다.

### AC-9. 설정 값 — 범위 밖/비정상 입력
- Given 상태가 `idle`
- When 사용자가 `focus-duration-input` 또는 `break-duration-input`에 `0`, `61`, 또는 숫자가 아닌
  문자열을 입력하면
- Then 해당 입력값은 상태에 반영되지 않고 이전 유효 값이 유지되며, `settings-error`에
  `settings-error--visible` 클래스가 추가되어 오류 메시지가 노출되고, 입력 필드는
  `aria-describedby="settings-error"`로 오류를 참조한다. `start-button`은 계속 사용 가능하다
  (마지막 유효 값으로 시작).

### AC-10. 실행 중 설정 잠금
- Given 상태가 `focus`, `break`, `paused` 중 하나
- When 사용자가 `focus-duration-input` / `break-duration-input`을 조작하려 하면
- Then 두 입력 필드는 비활성화(`disabled`) 상태이며 값 변경이 반영되지 않는다. 설정 변경은
  `reset-button`으로 `idle`로 돌아온 뒤에만 가능하다.

### AC-11. 접근성 — 상태 텍스트 노출
- Given 상태가 `focus`, `break`, `paused`, `idle` 중 어느 것으로 전환되더라도
- When 상태 전환이 발생하면
- Then `status-label`(`aria-live="polite"`)의 텍스트가 상태명을 포함해 갱신되어, 색상만으로
  상태를 구분하지 않는다.

### AC-12. 반응형 — 좁은 화면
- Given 뷰포트 폭이 480px 미만
- When 화면이 렌더링되면
- Then `control-button`들은 세로로 stack되고 각 버튼의 탭 영역은 최소 44px를 유지하며,
  320px 이상 어떤 폭에서도 콘텐츠 overflow가 발생하지 않는다.

## 4. 상태 정의

### 4.1 상태 값 (frozen: idle, focus, break, paused)

내부 상태 객체(순수 함수가 다루는 `state`)는 다음 필드를 갖는다.

```
state = {
  mode: 'idle' | 'focus' | 'break' | 'paused',
  remainingSeconds: number,      // 현재 표시 중인 남은 초
  focusDurationMinutes: number,  // 1~60, 유효성 검증 통과한 값만 저장
  breakDurationMinutes: number,  // 1~60, 유효성 검증 통과한 값만 저장
  sessionCount: number,          // 완료한 focus 세션 수 (0 이상)
  resumeMode: 'focus' | 'break' | null, // mode === 'paused'일 때만 의미 있음
}
```

- `idle`: `remainingSeconds === focusDurationMinutes * 60`, `resumeMode === null`.
- `focus` / `break`: 카운트다운이 진행 중. `resumeMode === null`.
- `paused`: 카운트다운 정지. `resumeMode`에 일시정지 직전 모드(`'focus'` 또는 `'break'`)를 보존.

### 4.2 상태 전이표

| 현재 상태 | 이벤트 | 다음 상태 | 부수효과 |
|---|---|---|---|
| `idle` | `start-button` 클릭 | `focus` | `remainingSeconds = focusDurationMinutes * 60`부터 카운트다운 시작 |
| `focus` | `pause-button` 클릭 | `paused` | `resumeMode = 'focus'`, `remainingSeconds` 유지 |
| `focus` | tick, `remainingSeconds`가 0에 도달 | `break` | `sessionCount += 1`, `remainingSeconds = breakDurationMinutes * 60` |
| `focus` | `reset-button` 클릭 | `idle` | `remainingSeconds = focusDurationMinutes * 60`, `sessionCount = 0`, `resumeMode = null` |
| `break` | `pause-button` 클릭 | `paused` | `resumeMode = 'break'`, `remainingSeconds` 유지 |
| `break` | tick, `remainingSeconds`가 0에 도달 | `focus` | `remainingSeconds = focusDurationMinutes * 60` (`sessionCount` 불변) |
| `break` | `reset-button` 클릭 | `idle` | `remainingSeconds = focusDurationMinutes * 60`, `sessionCount = 0`, `resumeMode = null` |
| `paused` | `start-button` 클릭 | `resumeMode` 값(`focus`/`break`) | 해당 모드로 복귀, `remainingSeconds`부터 카운트다운 재개, `resumeMode = null` |
| `paused` | `reset-button` 클릭 | `idle` | `remainingSeconds = focusDurationMinutes * 60`, `sessionCount = 0`, `resumeMode = null` |

`idle`, `paused` 상태에서는 tick 루프가 동작하지 않는다 (§5.1 참고). `reset-button`은 모든
상태에서 항상 활성화되어 있어야 하며(취소/실패 뒤에도 주 실행 control을 재사용 가능해야 한다는
frozen invariant), 클릭 시 예외 없이 `idle`로 복귀한다.

## 5. 순수 함수 시그니처

구현은 vanilla JS(ESM, `pomodoro/pomodoro.js`)로 작성한다. 아래 두 함수는 부수효과(DOM 접근,
타이머 등록/해제, localStorage 등)를 갖지 않는 순수 함수로 설계하며, 호출부(이벤트 핸들러,
`setInterval` 콜백)가 상태 갱신과 렌더링을 담당한다.

### 5.1 `tick(state)`

```
tick(state: State) -> State
```

- **전제조건**: `state.mode`는 `'focus'` 또는 `'break'`여야 한다. 호출부는 `idle`/`paused`
  상태에서 `tick`을 호출하지 않는다 (호출 자체가 계약 위반이며, 방어적으로 호출될 경우
  입력 `state`를 변경 없이 그대로 반환한다).
- **동작**:
  - `remainingSeconds > 0`이면 `{ ...state, remainingSeconds: state.remainingSeconds - 1 }`을 반환한다.
  - `remainingSeconds === 0`인 상태에서 호출되면 §4.2의 자동 완료 전이(`focus → break` 또는
    `break → focus`)를 적용한 새 `state`를 반환한다 (`sessionCount` 증가는 `focus → break`
    전이에서만 발생).
- **반환값**: 새 `State` 객체(불변, 입력 객체를 변형하지 않음).

### 5.2 `formatTime(seconds)`

```
formatTime(seconds: number) -> string
```

- **전제조건**: `seconds`는 0 이상의 정수(초). 음수·NaN 입력은 호출부 책임이며 함수는 방어적으로
  `0`으로 clamp하여 처리한다.
- **동작**: 총 초를 분/초로 나눠 `MM:SS` 형식(각 2자리, zero-padded)의 문자열로 변환한다.
  예: `formatTime(65) -> "01:05"`, `formatTime(3600) -> "60:00"`.
- **반환값**: `MM:SS` 문자열. `timer-display`의 `textContent`로 그대로 사용 가능하다.

## 6. 설정 값(집중/휴식 분) 검증 정책

- **유효 범위**: 1 이상 60 이하의 정수(분)만 유효하다.
- **검증 시점**: `focus-duration-input`, `break-duration-input`의 `input`/`change` 이벤트마다
  검증한다. 검증은 `idle` 상태에서만 값 반영을 허용한다(§AC-10).
- **오류 케이스와 처리**:
  | 입력 | 판정 | 처리 |
  |---|---|---|
  | `0` | 범위 밖(최솟값 미만) | 값 미반영, `settings-error--visible` 부여, 오류 메시지 노출 |
  | `61` | 범위 밖(최댓값 초과) | 값 미반영, `settings-error--visible` 부여, 오류 메시지 노출 |
  | 숫자가 아닌 문자열(예: `"abc"`, 빈 문자열) | 형식 오류 | 값 미반영, `settings-error--visible` 부여, 오류 메시지 노출 |
  | 1~60 사이 정수 | 유효 | 값 반영, `settings-error--visible` 제거 |
- **오류 상태 유지 원칙**: 오류가 표시된 동안에도 이전에 유효했던 `focusDurationMinutes` /
  `breakDurationMinutes` 값은 상태에 그대로 남아 `start-button`으로 타이머를 시작할 수 있다.
  즉, 잘못된 설정 입력이 전체 기능을 막지 않는다.
- **접근성 연결**: `focus-duration-input`, `break-duration-input`은 각각 연결된 `<label>`을 갖고
  `aria-describedby="settings-error"`로 오류 메시지를 참조한다(§7 UI 계약과 동일).

## 7. UI 계약 (frozen ui-contract@v1 그대로)

### 7.1 산출물 파일

`docs/design/pomodoro-BF-2005-mockup.html`, `docs/design/pomodoro-BF-2005.md`,
`pomodoro/index.html`, `pomodoro/pomodoro.js`, `pomodoro/style.css`,
`pomodoro/tests/pomodoro.test.js` (§1 표와 동일, 소유권 변경 없음)

### 7.2 DOM ID

`pomodoro-app`, `timer-display`, `progress-ring`, `start-button`, `pause-button`,
`reset-button`, `status-label`, `session-count`, `focus-duration-input`,
`break-duration-input`, `settings-error`

### 7.3 CSS 클래스

`pomodoro-app`, `pomodoro-app--focus`, `pomodoro-app--break`, `timer-display`,
`progress-ring`, `control-button`, `control-button--primary`, `settings-error--visible`

- `pomodoro-app--focus` / `pomodoro-app--break`는 `focus`/`break` 상태(및 그 상태에서
  일시정지된 `paused`)에 적용되는 최상위 컨테이너 modifier이며, `idle`에는 modifier가 없다.

### 7.4 디자인 토큰

`--color-focus-bg=#1f2937`, `--color-break-bg=#065f46`, `--color-accent=#f97316`,
`--color-error=#dc2626`, `--color-text=#f9fafb`, `--space-control-gap=16px`,
`--radius-button=8px`

### 7.5 상태

`idle`, `focus`, `break`, `paused` (§4 상태표와 동일)

### 7.6 접근성

- `start-button`, `pause-button`, `reset-button`은 명시적인 `aria-label`(시작/일시정지/리셋)을 가진다.
- `focus-duration-input`과 `break-duration-input`은 연결된 `<label>`과 `aria-describedby`로
  `settings-error`를 참조한다.
- `status-label`은 `aria-live="polite"`로 집중/휴식/일시정지 상태 전환을 텍스트로 알린다.
- `start-button`, `pause-button`, `reset-button`은 Tab 순서로 접근 가능하고 Enter/Space 키로
  활성화된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 7.7 반응형

- 320px 이상에서 content overflow가 발생하지 않는다.
- 480px 미만에서는 `control-button`들이 세로로 stack되어 탭 영역(최소 44px)을 유지한다.

## 8. Edge Case / 실패 케이스 요약

- 범위 밖 설정 입력(`0`, `61`, 비숫자 문자열) → §6, §AC-9 참고. 값 미반영 + 오류 표시, 기존
  유효 값 유지.
- 실행 중(`focus`/`break`/`paused`) 설정 입력 시도 → §AC-10. 입력 비활성화로 원천 차단.
- 연속 자동 완료(예: focus 종료 직후 즉시 break 종료로 이어지는 극단적 tick 순서) → `tick`은
  한 번에 1초씩만 감소시키는 순수 함수이므로 동시 발생은 없다. 매 tick마다 최대 한 번의 상태
  전이만 발생한다.
- 리셋은 모든 상태(`focus`/`break`/`paused`)에서 항상 가능해야 하며, 리셋 후 `session-count`,
  `progress-ring`, `timer-display`가 모두 초기값으로 돌아가고 `start-button`이 다시 사용
  가능해야 한다(§AC-5, frozen invariant).

## 9. designer / developer 참고 사항

- designer는 §7의 DOM ID/CSS 클래스/토큰/접근성/반응형 계약을 그대로 반영한 목업
  (`docs/design/pomodoro-BF-2005-mockup.html`)과 명세(`docs/design/pomodoro-BF-2005.md`)를
  작성한다. selector/token 이름을 새로 만들거나 바꾸지 않는다.
- developer는 §4 상태 전이표, §5 순수 함수 시그니처, §6 검증 정책을 그대로 구현하고,
  `pomodoro/tests/pomodoro.test.js`에 `tick`/`formatTime`과 §3 AC를 커버하는 테스트를 작성한다.
- 기존 `pomodoro/` 레거시 파일(`main.js`, `storage.js`, `styles.css`, `timer.js`)과의 관계는
  developer 재량이며, 이 문서는 frozen blueprint가 지정한 6개 파일의 소유권만 서술한다.
