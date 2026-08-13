# BF-2062 · 메모리 카드 게임 실행 설계 및 UI 계약

> 상위 티켓: BF-2059 (메모리 카드 게임)
> 본 문서는 designer(BF-2060)·developer(BF-2061)가 병렬 착수할 수 있도록 상태 전이표, acceptance criteria, 순수함수 계약, frozen UI 계약을 동결한다.

## 1. 상태 전이표 (hidden / flipped / matched / input-locked / won)

### 1.1 상태 정의

| 상태 | 적용 대상 | 설명 |
| --- | --- | --- |
| hidden | 카드(개별) | 카드 뒷면(back)이 보이는 기본 상태. 클릭/Enter/Space로 뒤집기 가능 |
| flipped | 카드(개별) | 카드 앞면(face)이 노출된 상태. 한 번에 최대 2장까지 flipped |
| matched | 카드(개별) | 짝이 맞아 앞면이 영구 고정된 상태. 이후 클릭 무시(비활성) |
| input-locked | 보드(전체) | 2장이 flipped되어 일치 여부를 판정하는 동안 모든 카드 클릭이 무시되는 보드 전체 게이트 |
| won | 보드(전체, 종료) | 16장 전부 matched되어 게임이 종료된 상태. `#memory-result`가 노출되고 재시작 외 조작 불가 |

- `input-locked`와 `won`은 보드 전체에 적용되는 게이트 상태이며, `hidden`/`flipped`/`matched`는 카드 개별 상태다. 두 계층은 동시에 성립한다(예: `won` 상태에서 16장 모두 `matched`).

### 1.2 전이 목록

| # | From | 트리거 | To | Guard | 효과 |
| --- | --- | --- | --- | --- | --- |
| T1 | hidden | 카드 클릭(또는 포커스 상태 Enter/Space) | flipped | 보드가 input-locked 아님 AND 현재 flipped 카드 0~1장 AND 대상 카드가 hidden | 카드 앞면 노출. flipped 카드가 0장→1장이 되는 순간 `#memory-timer` 카운트 시작 |
| T2 | flipped (1장째) | 서로 다른 두 번째 카드 클릭 | input-locked | 보드가 input-locked 아님 AND flipped 카드 정확히 1장 | 두 번째 카드도 flipped로 전환. `#memory-attempts` +1. 보드 input-locked로 전환하여 판정 시작 |
| T3 | input-locked | 판정 결과 = 일치(symbol 동일) | matched | 2장 flipped 상태 | 두 카드 모두 matched로 전환(`memory-card--matched` 부여, `memory-card--flipped` 제거). 보드 input-locked 해제 |
| T4 | input-locked | 판정 결과 = 불일치 | hidden | 2장 flipped 상태 | 짧은 지연 후 두 카드 모두 hidden으로 복귀(`memory-card--flipped` 제거). 보드 input-locked 해제 |
| T5 | matched(16장 전체) | 마지막 쌍 matched 확정 | won | 모든 카드 state === matched | `#memory-timer` 정지, `#memory-result`에 `memory-result--visible` 부여, 보드 input-locked 유지(카드 재클릭 차단) |
| T6 | 임의 상태(hidden/flipped/matched/input-locked/won) | `#memory-restart` 클릭(또는 Enter/Space) | hidden(초기화) | 없음(항상 가능) | 전 카드 hidden으로 재생성·재셔플, `#memory-attempts`=0, `#memory-timer`=0, `#memory-result`에서 `memory-result--visible` 제거, 보드 input-locked 해제 |

### 1.3 무효 전이 / edge case (원천 차단)

- 이미 `flipped` 또는 `matched` 카드를 다시 클릭 → 무시(상태 변화 없음).
- 보드가 `input-locked`인 동안(판정 대기 중) 세 번째 카드 클릭 → 무시.
- `won` 상태에서 카드 클릭 → 무시(보드가 input-locked 상태를 유지하므로 T1 guard에서 차단). `#memory-restart`만 유효.
- **후조건 불변식**: 재시작(T6) 완료 직후 상태·시도 횟수·타이머는 초기값으로 되돌아가고, 카드 클릭(주 실행 control)을 즉시 다시 사용할 수 있어야 한다.

## 2. Acceptance Criteria (Given/When/Then)

**AC-1 첫 카드 뒤집기 및 타이머 시작**
Given 게임이 초기 hidden 상태이고 flipped 카드가 0장이다
When 사용자가 카드 하나를 클릭(또는 포커스 상태에서 Enter/Space)한다
Then 해당 카드가 flipped로 전이되어 앞면이 보이고, `#memory-timer`가 0부터 증가하기 시작한다

**AC-2 두 번째 카드 뒤집기 및 판정 시작**
Given flipped 카드가 정확히 1장이다
When 사용자가 다른 hidden 카드를 클릭한다
Then 해당 카드도 flipped로 전이되고, 보드가 input-locked로 전환되며, `#memory-attempts`가 1 증가한다

**AC-3 일치 판정**
Given 보드가 input-locked이고 flipped 카드 2장의 symbol이 동일하다
When 판정 로직이 실행된다
Then 두 카드가 matched로 전이(`memory-card--matched` 부여)되고 보드의 input-locked가 해제된다

**AC-4 불일치 판정**
Given 보드가 input-locked이고 flipped 카드 2장의 symbol이 다르다
When 판정 로직이 실행된다
Then 지연 후 두 카드가 hidden으로 복귀하고 보드의 input-locked가 해제된다

**AC-5 입력 잠금 가드**
Given 보드가 input-locked 상태이다
When 사용자가 세 번째 카드를 클릭한다
Then 아무 상태 변화도 일어나지 않는다(클릭 무시)

**AC-6 이미 확정된 카드 재클릭 가드**
Given 특정 카드가 matched 또는 flipped 상태이다
When 사용자가 그 카드를 다시 클릭한다
Then 아무 상태 변화도 일어나지 않는다

**AC-7 승리**
Given 15장이 이미 matched이고 마지막 남은 두 카드가 flipped되어 일치 판정을 받는다
When 16장 전체가 matched로 확정된다
Then 상태가 won으로 전이되어 `#memory-timer`가 멈추고 `#memory-result`에 `memory-result--visible`이 부여되어 결과가 노출된다

**AC-8 재시작**
Given 게임이 진행 중이거나(hidden/flipped/matched/input-locked) won 상태이다
When 사용자가 `#memory-restart`를 클릭(또는 Enter/Space)한다
Then 전 카드가 새로 셔플되어 hidden으로 초기화되고 `#memory-attempts`=0, `#memory-timer`=0이 되며 `memory-result--visible`이 제거되고 카드 클릭이 즉시 다시 가능하다

**AC-9 접근성 — 키보드 조작 및 상태 텍스트 노출**
Given 사용자가 키보드만 사용한다
When Tab으로 각 카드와 `#memory-restart`에 포커스를 이동하고 Enter 또는 Space를 누른다
Then 마우스 클릭과 동일하게 각 컨트롤이 동작하며, 각 카드의 `aria-label`이 현재 상태(예: "카드 3, 뒤집힘" / "카드 3, 맞춤" / "카드 3, 가려짐")를 텍스트로 노출한다

**AC-10 반응형**
Given 뷰포트 너비가 360px이다
When `#memory-board`의 4x4 카드 그리드가 렌더링된다
Then 가로 스크롤 없이 화면 폭 안에 표시되며, 각 카드는 최소 40x40px 탭 영역을 유지한다

## 3. 순수함수 계약

### 3.1 `createDeck(symbols)`

- **입력**: 고유 문자열(또는 이모지) 배열 `symbols` (예: 8개)
- **출력**: `symbols.length * 2`장의 카드 객체 배열, 각 `{ id: number, symbol: string, state: 'hidden' }` (`id`는 0부터 증가하는 고유값, 각 `symbol`이 정확히 2회 등장)
- **방어**: `symbols`가 배열이 아니거나 길이 0이면 빈 배열 반환(throw 하지 않음). symbol 중복 검증은 호출자 책임.

경계값 테스트 케이스 (최소 6개):

| # | 입력 | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | `[]` | `[]` | 빈 입력 |
| 2 | `['a']` | 2장, symbol 모두 'a', id는 0/1 | 최소 단위(1쌍) |
| 3 | 8개 고유 symbol 배열 | 16장, 각 symbol 정확히 2회 | 표준 케이스(4x4 보드) |
| 4 | `null` / `undefined` | `[]` | 방어적 처리 |
| 5 | 모든 카드 초기 state | `state === 'hidden'` | 생성 직후 상태 |
| 6 | 카드 id | 0 ~ `symbols.length*2-1` 범위, 중복 없음 | 유일성 |

### 3.2 `shuffle(cards, rng)`

- **입력**: 카드 배열 `cards`, 선택적 난수 함수 `rng: () => number` (0 이상 1 미만 반환, 기본값 `Math.random`)
- **출력**: 순서가 섞인 새 배열(원본 `cards`는 mutate하지 않는다)
- **계약**: 동일한 `rng` 호출 시퀀스가 주어지면 항상 동일한 순서를 출력한다(결정적 테스트를 위해 `rng`를 주입 가능하게 구현). 알고리즘 선택(Fisher-Yates 등)은 developer 재량.

경계값 테스트 케이스 (최소 4개):

| # | 입력 | 기대 | 비고 |
| --- | --- | --- | --- |
| 1 | `[]` | `[]` | 빈 배열 |
| 2 | 1장 배열 | 동일한 1장 배열(순서 불변) | 최소 단위 |
| 3 | 16장 배열 + 고정 `rng` | 원소 개수·구성(symbol 집합) 불변, 순서만 재현 가능하게 변경 | 카드 유실/중복 없음 검증 |
| 4 | 원본 배열 참조 | `shuffle` 호출 후 원본 배열 순서 불변 | 순수함수(비파괴) 검증 |

### 3.3 `isMatch(cardA, cardB)`

- **입력**: 카드 객체 두 개 `{ id, symbol }`
- **출력**: boolean — `cardA.symbol === cardB.symbol && cardA.id !== cardB.id`
- **방어**: 동일 `id`(자기 자신과 비교)는 symbol이 같아도 `false`.

경계값 테스트 케이스 (최소 3개):

| # | 입력 | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | 동일 symbol, 서로 다른 id | `true` | 정상 매치 |
| 2 | 서로 다른 symbol | `false` | 불일치 |
| 3 | 동일 id(같은 카드) | `false` | 자기 자신 매치 방지 |

### 3.4 `formatTime(seconds)`

- **입력**: 0 이상의 정수 초 `seconds`
- **출력**: `"MM:SS"` 문자열(각 2자리 zero-pad, 60분 이상이면 자연 확장, truncation 없음)
- **방어**: 음수/NaN/비정상 입력은 `"00:00"`으로 처리(throw 하지 않음)

경계값 테스트 케이스 (최소 6개):

| # | 입력(초) | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | 0 | "00:00" | 초기값 |
| 2 | 5 | "00:05" | 1자리 초 |
| 3 | 59 | "00:59" | 분 자리올림 직전 |
| 4 | 60 | "01:00" | 분 자리올림 |
| 5 | 3599 | "59:59" | 59분대 |
| 6 | -1 / NaN | "00:00" | 방어적 처리 |

### 3.5 `isWon(cards)`

- **입력**: 카드 객체 배열 `cards` (각 `{ state }` 포함)
- **출력**: boolean — 배열이 비어있지 않고 모든 카드의 `state === 'matched'`이면 `true`
- **방어**: 빈 배열이거나 배열이 아니면 `false`

경계값 테스트 케이스 (최소 4개):

| # | 입력 | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | `[]` | `false` | 빈 배열(게임 시작 전) |
| 2 | 16장 전부 `state:'matched'` | `true` | 승리 조건 |
| 3 | 15장 matched + 1장 hidden | `false` | 미완료 |
| 4 | `null` / `undefined` | `false` | 방어적 처리 |

## 4. UI 계약 (frozen — 그대로 기술, 재정의 금지)

### 4.1 대상 파일 · 소유자 · 상태

| 파일 | 소유자 | 상태 |
| --- | --- | --- |
| `docs/design/BF-2059-memory-card-mockup.html` | designer | blueprint-frozen (additive) |
| `docs/design/BF-2059-memory-card.md` | designer | blueprint-frozen (additive) |
| `memory/index.html` | developer | blueprint-frozen (additive) |
| `memory/memory.js` | developer | blueprint-frozen (additive) |
| `memory/style.css` | developer | blueprint-frozen (additive) |
| `memory/tests/memory.test.js` | developer | blueprint-frozen (additive) |

### 4.2 DOM ID / class

- **DOM ID**: `memory-board`, `memory-attempts`, `memory-timer`, `memory-result`, `memory-restart`
- **CSS class**: `memory-card`, `memory-card--flipped`, `memory-card--matched`, `memory-result--visible`
- **상태**: hidden, flipped, matched, input-locked, won (§1 상태 전이표 참조)

### 4.3 디자인 토큰

`--color-bg=#0f172a`, `--color-card-back=#334155`, `--color-card-face=#f8fafc`, `--color-accent=#22c55e`, `--font-family-base=system-ui, -apple-system, sans-serif`, `--space-grid-gap=12px`

### 4.4 접근성 기준

- 각 카드는 네이티브 `button` 요소로 구현되어 Tab으로 포커스 가능하고 Enter/Space로 조작 가능하다.
- 카드의 뒤집힘·맞춤 상태는 `aria-label` 텍스트(예: "카드 3, 뒤집힘")로 전달되며 색상에만 의존하지 않는다.
- `#memory-restart`는 명시적 `aria-label`("다시 시작")을 가진다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.5 반응형 기준

- 360px 이상 뷰포트에서 `#memory-board`의 4x4 그리드가 가로 스크롤 없이 화면 폭 안에 표시된다.
- 카드 크기는 뷰포트 폭에 비례해 축소되되 최소 탭 영역 40x40px을 유지한다.

### 4.6 selector/token 불변식

- designer와 developer는 위 selector(ID/class)와 토큰 값을 변경하거나 재정의하지 않는다.
- 파일 소유권과 상태 계약은 본 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.
- 초기화(재시작)·판정 실패(불일치) 뒤에는 상태와 진행 표시(`#memory-attempts`, `#memory-timer`)가 각각 정의된 값으로 돌아가고, 주 실행 control(카드 클릭 또는 `#memory-restart`)을 다시 사용할 수 있어야 한다.

## 5. Handoff

- designer(BF-2060): §4 UI 계약을 기준으로 `docs/design/BF-2059-memory-card-mockup.html`, `docs/design/BF-2059-memory-card.md` 작성.
- developer(BF-2061): §1 상태 전이표, §3 순수함수 계약, §4 UI 계약을 기준으로 `memory/index.html`, `memory/memory.js`, `memory/style.css`, `memory/tests/memory.test.js` 구현.
