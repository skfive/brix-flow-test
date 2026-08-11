# 비밀번호 강도 검사기 구현 설계 — password-strength (BF-1957 / BF-1960)

## 0. 문서 성격

본 문서는 `planning-contract@v1`
(sha256:8dd12cda65d080a944a57df323a6eabe9e844029a70e975cdbcb52b486feb483)와
`ui-contract@v1`(sha256:cced67d448d11e26dd753ee6d7196a6737597118de4b0daeac7c2ea9d699ca59)
frozen 계약을 **재정의 없이** 구현 가능한 형태로 구체화한다. selector·상태·
token·파일 소유권은 frozen 목록 그대로이며, 본 문서는 신규 파일·역할을
추가하지 않는다.

- 산출물 범위(본 task, BF-1960 소유): 본 markdown 1개 파일
  (`docs/plans/BF-1957/implementation-plan.md`)뿐이다.
- 런타임 산출물은 frozen 소유권에 따라 아래 페르소나가 담당하며 본 task에서
  생성하지 않는다.
  - `docs/design/contract.md`, `docs/design/mockup-password-strength.html` —
    designer(BF-1958) 소유, `additive` 정책(기존 절 보존, 새 절만 추가).
  - `password-strength.html`, `tests/password-strength.test.js` —
    developer(BF-1959) 소유, `additive` 정책.
- 스택 규약(`vanilla-static`, 외부 의존성 0건, `npm test`): 단일 정적 HTML
  파일에 HTML/CSS/JS를 inline으로 작성하고, 테스트는 Node.js 내장 모듈
  (`node:test`, `node:assert`, `node:fs`, `node:vm`)만 사용한다.

## 1. scorePassword 판정 규칙 (frozen)

### 1.1 함수 시그니처

```
scorePassword(password: string) => {
  score: number,                 // 0~5
  state: 'empty'|'weak'|'medium'|'strong',
  rules: {
    length: boolean,
    lowercase: boolean,
    uppercase: boolean,
    number: boolean,
    special: boolean
  }
}
```

순수 함수여야 하며 `document`/`window` 등 브라우저 전역을 참조하지 않는다
(§5 테스트 전략의 전제 조건).

### 1.2 규칙 정의 (5개, 순서 고정)

| 순서 | 규칙 키 | 판정식 | 화면 텍스트(규칙 미충족 안내) |
| --- | --- | --- | --- |
| 1 | `length` | `password.length >= 8` | `8자 이상` |
| 2 | `lowercase` | `/[a-z]/.test(password)` | `소문자 포함` |
| 3 | `uppercase` | `/[A-Z]/.test(password)` | `대문자 포함` |
| 4 | `number` | `/[0-9]/.test(password)` | `숫자 포함` |
| 5 | `special` | `/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_\`{|}~]/.test(password)` | `특수문자 포함` |

- 특수문자 정규식은 위 문자 클래스를 정확히 사용한다(공백·영숫자 제외 ASCII
  구두점 전체). developer가 임의로 문자 집합을 축소/확장하지 않는다.
- 5개 규칙은 서로 독립적으로 판정하며 순서를 바꾸지 않는다(§3 리스트 표시
  순서와 §5 테스트 케이스 순서가 이 표를 기준으로 한다).

### 1.3 빈 문자열(초기) 처리 — frozen

`password.length === 0`이면 5개 규칙 판정과 무관하게 `state = 'empty'`,
`score = 0`, `rules`의 5개 값은 모두 `false`를 반환한다. `empty`는 §1.4의
점수-라벨 구간(약함/보통/강함)과 별개의 상태이며, 약함(`weak`)으로
치환하지 않는다.

### 1.4 점수 계산 및 점수-라벨 매핑 (frozen)

`password.length > 0`일 때, `score`는 위 5개 규칙 중 충족된(`true`) 개수의
합(0~5)이다.

| score 구간 | state | 화면 텍스트 |
| --- | --- | --- |
| 0 ~ 2 | `weak` | `약함` |
| 3 ~ 4 | `medium` | `보통` |
| 5 | `strong` | `강함` |

- 위 3구간 매핑은 `password.length > 0`인 경우에만 적용한다. 길이가 0인
  경우는 §1.3에 따라 항상 `empty`이다.
- 예시: `"abc"` → length(F) lowercase(T) uppercase(F) number(F) special(F) →
  score=1 → `weak`. `"Abcdefg1"` → length(T) lowercase(T) uppercase(T)
  number(T) special(F) → score=4 → `medium`. `"Abcdefg1!"` → 5개 모두 충족 →
  score=5 → `strong`.

## 2. 파일 구조 및 소유권 (frozen — 재서술만, 신규 파일/역할 추가 없음)

| 경로 | 소유 페르소나 | 상태 | 비고 |
| --- | --- | --- | --- |
| `docs/plans/BF-1957/implementation-plan.md` | planner(BF-1960, 본 task) | 본 task에서 작성 | 본 문서 |
| `docs/design/contract.md` | designer(BF-1958) | frozen, `additive` | 기존 BF-1478/BF-1502/BF-1917 등 절 보존, 본 epic 절만 신규 추가 |
| `docs/design/mockup-password-strength.html` | designer(BF-1958) | frozen, `additive` | §3 selector/token 그대로 시안 구현 |
| `password-strength.html` | developer(BF-1959) | frozen, `additive` | 저장소 루트, 단일 파일(HTML+CSS+JS inline) |
| `tests/password-strength.test.js` | developer(BF-1959) | frozen, `additive` | `node:test` 기반, §5 전략 준수 |

- 서버 데이터 모델·API 스키마 변경 없음(클라이언트 전용 정적 페이지).
- 후조건(§4 재확인): 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값
  (`empty`)으로 되돌리고, `#password-input`을 즉시 다시 사용할 수 있어야
  한다(주 실행 control 비활성 고착 금지).

## 3. UI 계약 (frozen — exact selector/token/상태/접근성/반응형)

### 3.1 DOM 구조

```
.strength-meter (root 컨테이너, id는 비-frozen·재량)
├─ <label for="password-input"> 비밀번호
├─ #password-input                          (input[type=password])
├─ #strength-bar (.strength-meter__bar)     (role="progressbar")
├─ #strength-label (.strength-meter__label) (aria-live="polite")
├─ #unmet-rules-list (.strength-meter__rules, <ul>)
│   └─ .strength-meter__rule × 0~5 (<li>, §1.2 순서 고정, 미충족 규칙만)
└─ #all-rules-met-message                   (5개 규칙 모두 충족 시에만 노출)
```

- frozen DOM ID: `password-input`, `strength-bar`, `strength-label`,
  `unmet-rules-list`, `all-rules-met-message`. 5개 외 신규 ID 추가는
  가능하나(비-frozen 보조 요소) 위 5개의 명칭·역할은 변경 금지.
- frozen CSS class: `strength-meter`(root), `strength-meter__bar`,
  `strength-meter__label`, `strength-meter__rules`, `strength-meter__rule`,
  `strength-weak`/`strength-medium`/`strength-strong`(상태 modifier).
- 상태 modifier class(`strength-weak`/`strength-medium`/`strength-strong`)는
  `#strength-bar`에 토글한다(저장소 내 기존 선례
  `password-strength.html`의 `.password-strength__meter.strength-weak` 패턴과
  동일 배치 방식을 따름 — 신규 selector 추가 아님, 배치 위치만 참고).
  `empty` 상태에서는 세 modifier class를 모두 제거한다.

### 3.2 상태(state) 4종 (frozen)

| state | 트리거 | `#strength-bar` | `#strength-label` 텍스트 | `#unmet-rules-list` | `#all-rules-met-message` |
| --- | --- | --- | --- | --- | --- |
| `empty` | `password.length === 0` | modifier 없음, `aria-valuenow="0"`, 폭 0% | `비밀번호를 입력하세요` | 5개 규칙 모두 표시 | 숨김 |
| `weak` | score 0~2 (길이>0) | `.strength-weak`, `aria-valuenow=score` | `약함` | 미충족 규칙만 표시 | 숨김 |
| `medium` | score 3~4 | `.strength-medium`, `aria-valuenow=score` | `보통` | 미충족 규칙만 표시 | 숨김 |
| `strong` | score 5 | `.strength-strong`, `aria-valuenow=score` | `강함` | 비어있음, 숨김 | 노출 (`모든 조건을 충족했습니다`) |

- `#strength-bar` 폭은 `(score / 5) * 100%`로 시각 표현한다(비-frozen 구현
  세부, `aria-valuenow`만 frozen).
- `#unmet-rules-list`와 `#all-rules-met-message`는 상호 배타적으로
  노출한다(하나가 보이면 다른 하나는 숨김).

### 3.3 Design Token (frozen, 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-strength-weak` | `#dc2626` | `strength-weak` 강조색 |
| `--color-strength-medium` | `#f59e0b` | `strength-medium` 강조색 |
| `--color-strength-strong` | `#16a34a` | `strength-strong` 강조색 |
| `--color-text-primary` | `#1f2937` | 기본 텍스트(라벨·규칙 목록) |
| `--space-control-gap` | `12px` | `.strength-meter` 내부 요소 간 간격 |

`empty` 상태는 위 3개 상태색 토큰을 사용하지 않고 `--color-text-primary`로
중립 표시한다(신규 색상 토큰 추가 금지).

### 3.4 접근성 (frozen)

1. `#strength-bar`는 `role="progressbar"`이며 `aria-valuenow`(현재 score,
   `empty`일 때 `0`), `aria-valuemin="0"`, `aria-valuemax="5"`를 가진다.
2. `#strength-label`은 `aria-live="polite"` 영역 안에서 갱신된다(상태 전환
   시 스크린리더가 즉시 안내).
3. `#password-input`은 `aria-describedby="strength-label unmet-rules-list"`로
   두 요소를 항상 연결한다(값 고정 — `unmet-rules-list`가 시각적으로
   숨겨져도 attribute 자체는 유지).
4. 4개 상태(`empty`/`weak`/`medium`/`strong`) 모두 색상만으로 구분하지
   않고, 상태명을 `#strength-label`의 화면 텍스트와 접근성 이름(스크린리더
   낭독) 양쪽으로 노출한다.

### 3.5 반응형 (frozen)

- `320px` 이상 뷰포트에서 `.strength-meter` 컨테이너가 가로 overflow 없이
  표시된다. 좁은 폭에서는 `#unmet-rules-list` 항목 텍스트 줄바꿈으로
  흡수한다.

## 4. 초기화(입력 전체 삭제) 동작 (frozen invariant)

- **Given** 사용자가 `#password-input`에 값을 입력해 `weak`/`medium`/
  `strong` 중 한 상태에 있다.
- **When** 사용자가 입력값을 전부 지워 `password.length === 0`이 된다.
- **Then** `input` 이벤트 처리 즉시(추가 지연·확인 없이) `scorePassword('')`
  결과를 반영해 `#strength-bar`(폭 0%, `aria-valuenow="0"`, 상태 modifier
  class 제거), `#strength-label`(`비밀번호를 입력하세요`),
  `#unmet-rules-list`(5개 규칙 전부 표시)가 초기 상태로 복원되고,
  `#all-rules-met-message`는 숨겨진다. `#password-input`은 계속 입력 가능한
  상태를 유지한다(비활성 고착 금지).

## 5. 테스트 전략 (frozen — 외부 의존성 0, node:test + fs + vm)

`tests/password-strength.test.js`는 아래 절차로 `scorePassword`를
`password-strength.html`의 inline `<script>`에서 추출해 독립적으로
검증한다(브라우저 DOM 없이 순수 함수만 실행).

1. developer는 `password-strength.html`의 inline script 안에서
   `scorePassword` 함수 정의를 아래 marker 주석으로 감싼다(정확한 문자열,
   앞뒤 공백 유지):
   ```js
   // scorePassword:start
   function scorePassword(password) {
     /* §1의 5개 규칙·score·state 계산만 수행, document/window 미참조 */
   }
   // scorePassword:end
   ```
2. 테스트는 `node:fs`의 `readFileSync`로 `password-strength.html`을 문자열로
   읽고, `indexOf('// scorePassword:start')` ~
   `indexOf('// scorePassword:end')` 구간 문자열을 추출한다.
3. 추출한 함수 정의 소스에 `\nmodule.exports.scorePassword = scorePassword;`
   를 덧붙여 `node:vm`의 `vm.Script` + `vm.createContext({ module: { exports:
   {} } })`로 격리 실행한 뒤 `context.module.exports.scorePassword`를
   호출 가능한 함수로 확보한다.
4. §1.2~§1.4의 규칙표를 근거로 아래 케이스를 최소 포함한다(Given/When/Then):
   - **빈 문자열**: `scorePassword('')` → `state: 'empty'`, `score: 0`,
     `rules`의 5개 값 모두 `false`.
   - **약함 경계**: 규칙 2개만 충족(예: `"abcdefgh"` → length+lowercase만
     충족, score=2) → `state: 'weak'`.
   - **보통 경계**: 규칙 3개 충족(score=3) → `state: 'medium'`; 규칙 4개
     충족(score=4) → `state: 'medium'`.
   - **강함**: 5개 규칙 모두 충족(score=5) → `state: 'strong'`.
   - **개별 규칙 판정**: 소문자만 없는 경우, 특수문자만 없는 경우 등
     `rules.<key>`가 정확히 `false`로 떨어지는지 각각 검증.
   - **특수문자 경계**: 문자 클래스에 포함된 문자(`!`, `@` 등)와 미포함
     문자(알파벳/숫자만)로 `special` 판정이 정확히 갈리는지 검증.
5. `npm test`(package.json 기존 `test` 스크립트, `node --test` 계열)로
   실행 가능해야 하며 추가 npm 패키지 설치를 요구하지 않는다.

## 6. Given/When/Then 시나리오 (실패 케이스 포함)

1. **초기 렌더**: Given 페이지 최초 로드, When 아직 입력 없음, Then §3.2
   `empty` 상태로 렌더된다.
2. **점진적 강화**: Given `empty` 상태, When 사용자가 `"Ab1!"` (4개 규칙
   충족, length 미충족, score=3)을 입력, Then `medium` 상태로 전환되고
   `#unmet-rules-list`에 `8자 이상` 1건만 남는다.
3. **최고 강도 도달**: Given `medium`/`weak` 상태, When 5개 규칙을 모두
   충족하는 값을 입력, Then `strong` 상태로 전환되며
   `#unmet-rules-list`는 숨겨지고 `#all-rules-met-message`가 노출된다.
4. **입력 전체 삭제(초기화)**: §4와 동일(핵심 AC — 강도 막대·라벨·규칙
   목록이 즉시 초기 상태로 복원).
5. **경계값 실패 케이스**: Given 7자 길이 + 나머지 4규칙 충족(score=4),
   When 평가, Then `length` 규칙만 미충족으로 남고 `medium`(score=4)을
   유지한다(강함으로 오판정하지 않음).
6. **공백만 입력**: Given 입력값이 공백 문자로만 구성(`"        "`, 8칸),
   When 평가, Then `length`만 충족(score=1)하고 `weak` 상태가 된다(공백을
   임의로 특수문자로 오판정하지 않음 — §1.2 특수문자 문자 클래스에 공백
   미포함).

## 7. Self-critique (AC 매핑)

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | scorePassword 5규칙·점수-라벨 매핑 | §1에 5개 규칙(길이8+/소문자/대문자/숫자/특수문자)과 0~2 약함·3~4 보통·5 강함 매핑을 정확히 명시 |
| 2 | exact UI 계약(파일/ID/class/상태/token/접근성/반응형/테스트) | §2(파일·소유권), §3(DOM ID 5개·class 8개·상태 4종·token 5개·접근성 4항·반응형), §5(fs+vm 기반 node:test 전략, 외부 의존성 0) 모두 명시 |
| 3 | 입력 전체 삭제 시 즉시 초기화 | §4 Given/When/Then으로 강도 막대·라벨·규칙 목록 즉시 복원 동작 명시, §6-4에 재수록 |
| 4 | frozen blueprint 재서술만, 신규 파일/역할 없음 | §0·§2에서 소유권·상태·후조건을 frozen 값 그대로 서술, 신규 selector·token·파일 추가 없음을 각 절에서 명시 |
