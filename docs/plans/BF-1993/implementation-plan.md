# BF-1996 · 비밀번호 강도 검사기 — 강도 산정 규칙 및 구현 설계

> 이 문서는 BF-1993(비밀번호 강도 검사기) epic 산하 designer(BF-1994)·developer(BF-1995)가
> 그대로 따를 실행 설계입니다. 아래 UI 계약(파일/DOM id·class/상태/토큰/접근성/반응형)은
> **frozen** 이며 재정의하지 않습니다. 새 파일이나 새 역할을 추가하지 않습니다.

## 1. 개요

password-strength 페이지는 사용자가 입력하는 비밀번호의 강도를 실시간으로 채점하고,
5개 규칙(길이/대문자/소문자/숫자/특수문자) 충족 여부와 종합 상태를 화면에 표시한다.
채점 로직은 `strength.js`의 `scorePassword(pw)` / `checkRules(pw)` 두 함수로 구현한다.

## 2. Frozen UI 계약 (그대로 준수 — 변경/재정의 금지)

### 2.1 산출물 파일 및 소유자

| 경로 | 소유자 | 상태 |
|---|---|---|
| `docs/design/password-strength/design-spec.md` | designer | blueprint-frozen / additive |
| `docs/design/password-strength/mockup.html` | designer | blueprint-frozen / additive |
| `password-strength/index.html` | developer | blueprint-frozen / additive |
| `password-strength/strength.js` | developer | blueprint-frozen / additive |
| `password-strength/style.css` | developer | blueprint-frozen / additive |
| `password-strength/tests/strength.test.js` | developer | blueprint-frozen / additive |
| `docs/plans/BF-1993/implementation-plan.md` (본 문서) | planner | runtime-artifact |

모든 산출물은 **additive**로만 변경한다. 파일 소유권·상태 계약의 유일한 권위는 frozen
blueprint이며 본 문서는 이를 재서술만 하고 재정의하지 않는다.

### 2.2 DOM ID / CSS Class (exact)

- DOM id: `password-input`, `toggle-visibility`, `strength-meter`, `strength-label`, `rules-list`
- CSS class: `strength-bar`, `strength-bar__fill`, `rule`, `rule--met`, `rule--unmet`

### 2.3 상태(states)

`empty`, `very-weak`, `weak`, `medium`, `strong`, `very-strong` (6종 — `empty`는 미입력
전용 상태이며 나머지 5종은 `scorePassword` 점수 0~4에 1:1 대응한다)

상태별 `strength-label` 표시 텍스트(화면 텍스트 = 접근성 이름, 색상만으로 구분하지 않음):

| state | strength-label 텍스트 |
|---|---|
| empty | 비밀번호를 입력하세요 |
| very-weak | 매우 약함 |
| weak | 약함 |
| medium | 보통 |
| strong | 강함 |
| very-strong | 매우 강함 |

### 2.4 디자인 토큰 (CSS 변수)

- `--color-strength-very-weak: #dc2626`
- `--color-strength-weak: #f97316`
- `--color-strength-medium: #eab308`
- `--color-strength-strong: #84cc16`
- `--color-strength-very-strong: #16a34a`
- `--color-bar-track: #e5e7eb`
- `--font-family-base: system-ui, -apple-system, sans-serif`

`strength-bar__fill`의 배경색은 현재 state에 대응하는 `--color-strength-*` 토큰을,
`strength-bar` 트랙 배경은 `--color-bar-track`을 사용한다.

### 2.5 접근성 (exact)

- `password-input`에는 `aria-label="비밀번호"`를 명시한다.
- `toggle-visibility` 버튼은 클릭마다 `aria-pressed` 값과 `aria-label`
  (`비밀번호 표시` / `비밀번호 숨김`)을 갱신한다. 매핑:
  | input type | aria-pressed | aria-label |
  |---|---|---|
  | password(숨김, 기본값) | false | 비밀번호 표시 |
  | text(표시 중) | true | 비밀번호 숨김 |
- `strength-meter`는 `role="progressbar"`이며 `aria-valuenow`/`aria-valuemin`/`aria-valuemax`를
  현재 점수(0~4)에 맞춰 갱신한다. `aria-valuemin=0`, `aria-valuemax=4`. `empty` 상태에서는
  `aria-valuenow=0`을 유지한다.
- `rules-list`의 각 규칙 항목은 충족 여부를 색상뿐 아니라 텍스트(`충족`/`미충족`)로도 함께
  제공한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다
  (2.3 표 참조).

### 2.6 반응형 (exact)

- 320px 이상에서 content overflow가 발생하지 않는다.
- 480px 이하 모바일 뷰에서도 `strength-bar`와 `rules-list`가 세로로 정렬되어 가독성을
  유지한다.

## 3. 강도 산정 로직 설계

### 3.1 `checkRules(pw)` — 5개 규칙 키 (exact)

`checkRules(pw)`는 아래 5개 boolean 키만 정확히 가진 객체를 반환한다.

| 규칙 키 | 판정 조건 | `rules-list` 표시 텍스트 |
|---|---|---|
| `length` | `pw.length >= 8` | 8자 이상 |
| `uppercase` | `/[A-Z]/.test(pw)` | 대문자 포함 |
| `lowercase` | `/[a-z]/.test(pw)` | 소문자 포함 |
| `number` | `/[0-9]/.test(pw)` | 숫자 포함 |
| `special` | `/[^A-Za-z0-9]/.test(pw)` | 특수문자 포함 |

각 `rules-list` 항목은 `rule` 클래스에 충족 시 `rule--met`, 미충족 시 `rule--unmet`을
추가하고, 텍스트에도 `(충족)`/`(미충족)`을 병기한다(2.5 접근성 원칙).

```js
function checkRules(pw) {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}
```

### 3.2 `scorePassword(pw)` — 점수 산정 (exact)

1. `pw.length === 0` → `state = 'empty'`, 점수는 표시하지 않는다(진행 표시는 초기값).
2. 그 외에는 `checkRules(pw)`의 충족 키 개수(0~5)를 아래 표로 점수 0~4에 매핑한다.

| 충족 규칙 개수 | score | state |
|---|---|---|
| 0~1개 | 0 | very-weak |
| 2개 | 1 | weak |
| 3개 | 2 | medium |
| 4개 | 3 | strong |
| 5개 | 4 | very-strong |

3. 흔한 비밀번호 강등 규칙(3.3)이 적용되면 위 매핑 결과와 무관하게 `score = 0`
   (`very-weak`)으로 강제한다.

```js
const SCORE_STATE = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'];

function scorePassword(pw) {
  if (pw.length === 0) return { score: null, state: 'empty' };

  const rules = checkRules(pw);
  const metCount = Object.values(rules).filter(Boolean).length;
  let score = metCount <= 1 ? 0 : Math.min(metCount - 1, 4);

  if (isCommonPassword(pw)) score = 0;

  return { score, state: SCORE_STATE[score] };
}
```

`strength-meter`의 `aria-valuenow`, `strength-bar__fill` 색상 토큰, `strength-label`
텍스트는 모두 위에서 계산한 `state`를 단일 출처로 사용한다(2.3, 2.4, 2.5 참조).

### 3.3 흔한 비밀번호 강등 규칙 (exact)

`isCommonPassword(pw)`는 `pw.toLowerCase()`가 아래 목록과 **정확히 일치**할 때만 true다.
부분 일치·포함 검사로 확장하지 않는다 (임의 변형 예: `Password1`은 목록에 없으므로
일반 규칙대로 채점하고 강등하지 않는다).

```
password, 123456, 12345678, 123456789, qwerty, 111111,
abc123, letmein, admin, welcome, iloveyou, monkey, dragon, 000000, 1234567890
```

강등 시 `checkRules(pw)` 자체의 개별 규칙 충족 표시(`rules-list`)는 실제 문자 구성대로
유지하고, 종합 `score`/`state`(strength-meter, strength-label, strength-bar__fill)만
`very-weak`로 강제한다.

### 3.4 초기화/리셋 규칙

입력을 모두 지워 `pw.length === 0`이 되면(백스페이스, 붙여넣기 취소 등) 상태는 `empty`로
복귀하고 `strength-bar__fill`, `aria-valuenow`, `strength-label`, `rules-list`는 최초
로드 시점과 동일한 초기값으로 되돌아간다. `password-input`과 `toggle-visibility`는 계속
사용 가능해야 한다(주 실행 control 재사용 가능 불변식).

## 4. Acceptance Criteria (Given/When/Then)

**AC-1 초기 로드**
Given 사용자가 `password-strength/index.html`을 처음 로드했다
When 아직 아무것도 입력하지 않았다
Then `strength-meter` 상태는 `empty`이고, `rules-list` 5개 항목이 모두 `rule--unmet`으로
표시되며, `strength-label`에는 "비밀번호를 입력하세요"가 표시된다.

**AC-2 일반 입력에 따른 점수 갱신**
Given 사용자가 `password-input`에 포커스하고 있다
When `Abcdefg1!`을 입력한다(5개 규칙 모두 충족, 흔한 비밀번호 아님)
Then `checkRules`의 5개 키가 모두 true, `scorePassword`의 `score=4`/`state=very-strong`이며
`strength-bar__fill`은 `--color-strength-very-strong`, `strength-label`은 "매우 강함",
`strength-meter`의 `aria-valuenow`는 4로 갱신된다.

**AC-3 흔한 비밀번호 강등**
Given 사용자가 `password-input`에 포커스하고 있다
When `password`를 입력한다
Then `scorePassword`의 `score`는 0으로 강제되고 `state=very-weak`, `strength-label`은
"매우 약함"으로 표시되며, `rules-list`의 개별 규칙 충족 표시는 실제 문자 구성대로 유지된다
(이 경우 `length`만 충족이므로 나머지 4개는 미충족으로 표시).

**AC-4 표시 토글**
Given `password-input`의 type이 `password`(숨김)다
When 사용자가 `toggle-visibility`를 클릭한다
Then input의 type이 `text`로 바뀌고 `aria-pressed=true`, `aria-label="비밀번호 숨김"`으로
갱신된다. 다시 클릭하면 type=`password`, `aria-pressed=false`,
`aria-label="비밀번호 표시"`로 복귀한다.

**AC-5 초기화/입력 삭제**
Given 사용자가 비밀번호를 입력한 상태다
When 입력을 모두 지운다(`length=0`)
Then 상태가 `empty`로 복귀하고 `strength-bar__fill`/`aria-valuenow`/`strength-label`/
`rules-list`가 모두 최초 로드 시점과 동일한 초기값으로 리셋되며 `password-input`과
`toggle-visibility`는 계속 사용 가능하다.

**AC-6 반응형**
Given 뷰포트 너비가 320px~480px다
When 페이지가 렌더링된다
Then `strength-bar`와 `rules-list`가 세로로 정렬되고 어떤 콘텐츠도 overflow되지 않는다.

## 5. Edge Case / 실패 케이스

- 흔한 비밀번호의 대소문자 변형(`PASSWORD`, `Password1` 등): `pw.toLowerCase()`가 목록과
  정확히 일치하는 경우만 강등한다. `Password1`처럼 목록에 정확히 없는 변형은 일반 규칙대로
  채점한다(3.3 정책 — 부분 일치 금지).
- 공백만으로 구성된 비밀번호(예: `"        "`): 특별 예외 없이 일반 문자로 취급되어
  `length` 규칙 판정에 그대로 포함된다.
- 매우 긴 비밀번호(예: 100자): `length` 규칙은 8자 이상이면 true이며, 추가 길이에 대한
  가산점이나 상한 로직은 두지 않는다(요구된 범위 밖의 추측성 스펙 금지).
- 입력 삭제로 `empty`로 되돌아간 뒤 재입력: 3.4 초기화 규칙에 따라 매번 최초 상태부터
  다시 계산하며 이전 강등 이력을 유지하지 않는다.

## 6. Frozen Blueprint 준수 선언

본 문서는 2절의 파일·소유자·상태·후조건(불변식)을 frozen blueprint 그대로 재서술한
것이며, 새 파일이나 새 역할을 추가하지 않는다. designer(BF-1994)는
`docs/design/password-strength/design-spec.md`, `docs/design/password-strength/mockup.html`을,
developer(BF-1995)는 `password-strength/index.html`, `password-strength/strength.js`,
`password-strength/style.css`, `password-strength/tests/strength.test.js`를 위 2·3절
계약대로 구현한다.
