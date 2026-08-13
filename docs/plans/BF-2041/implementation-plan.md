# BF-2044 · 스톱워치 실행 설계 및 UI 계약

> 상위 티켓: BF-2041 (스톱워치 기능)
> 본 문서는 designer(BF-2042)·developer(BF-2043)가 병렬 착수할 수 있도록 상태 전이표, acceptance criteria, 순수함수 계약, frozen UI 계약을 동결한다.

## 1. 상태 전이표 (idle / running / paused)

### 1.1 상태별 컨트롤 가용성

| 상태 | btn-start | btn-pause | btn-reset | btn-lap |
| --- | --- | --- | --- | --- |
| idle | 활성 (시작) | 비활성 | 비활성 | 비활성 |
| running | 비활성 | 활성 (일시정지) | 비활성 | 활성 (랩 기록) |
| paused | 활성 (재개) | 비활성 | 활성 (리셋) | 비활성 |

### 1.2 전이 목록

| # | From | 트리거 | To | 효과 |
| --- | --- | --- | --- | --- |
| T1 | idle | 시작 (btn-start 클릭/Enter/Space) | running | 타이머가 0부터 증가 시작 |
| T2 | running | 일시정지 (btn-pause) | paused | 타이머 정지, elapsed 값 유지 |
| T3 | paused | 시작/재개 (btn-start) | running | 타이머가 유지된 elapsed 값에서 계속 증가 |
| T4 | paused | 리셋 (btn-reset) | idle | elapsed=0, laps=[] 로 초기화, display 초기값 복귀 |
| T5 | running | 랩 (btn-lap) | running (self-loop) | 현재 elapsed 기준 새 랩 추가, 상태 변화 없음 |

- idle 상태에서 일시정지/리셋/랩은 컨트롤 disabled 로 원천 차단 (무효 전이 없음).
- running 상태에서 리셋은 컨트롤 disabled 로 원천 차단.
- **후조건 불변식**: 리셋(T4) 완료 직후 상태·진행 표시는 초기값으로 되돌아가고 btn-start(주 실행 control)를 즉시 재사용할 수 있어야 한다.

## 2. Acceptance Criteria (Given/When/Then)

**AC-1 시작**
Given 스톱워치가 idle 상태이고 elapsed=0이다
When 사용자가 btn-start를 클릭(또는 포커스 상태에서 Enter/Space)한다
Then 상태가 running으로 전이되고 타이머가 0부터 증가하며, btn-start는 비활성화, btn-pause/btn-lap은 활성화된다

**AC-2 일시정지**
Given 스톱워치가 running 상태이다
When 사용자가 btn-pause를 클릭한다
Then 상태가 paused로 전이되고 타이머가 멈추며 elapsed 값이 유지된다. btn-start(재개용)·btn-reset이 활성화되고 btn-pause/btn-lap은 비활성화된다

**AC-3 재개**
Given 스톱워치가 paused 상태이고 elapsed=T이다
When 사용자가 btn-start를 클릭한다
Then 상태가 running으로 전이되고 타이머가 T부터 계속 증가한다

**AC-4 리셋**
Given 스톱워치가 paused 상태이다
When 사용자가 btn-reset을 클릭한다
Then 상태가 idle로 전이되고 elapsed=0, laps=[]로 초기화되며 display가 "00:00.00"으로 되돌아가고 btn-start를 즉시 다시 사용할 수 있다

**AC-5 랩 기록**
Given 스톱워치가 running 상태이다
When 사용자가 btn-lap을 클릭한다
Then 현재 elapsed 기준 새 랩이 lap-list 최상단에 추가되고 상태는 running으로 유지된다 (self-loop)

**AC-6 비활성 컨트롤 가드**
Given 스톱워치가 idle 상태이다
When 사용자가 btn-pause·btn-reset·btn-lap 클릭을 시도한다
Then 세 버튼 모두 disabled 상태라 아무 동작도 일어나지 않는다

**AC-7 최고/최저 랩 표시**
Given lap-list에 서로 다른 구간 시간(lapMs)을 가진 랩이 2개 이상 있다
When 새 랩이 추가되어 lapStats(laps)가 재계산된다
Then 가장 빠른 랩에는 `lap-list__item--best` 클래스와 "최고 랩" 텍스트 배지가, 가장 느린 랩에는 `lap-list__item--worst` 클래스와 "최저 랩" 텍스트 배지가 부여된다

**AC-8 포맷 표시**
Given elapsed=61234ms이다
When display가 `formatElapsed(elapsed)`로 렌더링된다
Then "01:01.23"이 `stopwatch-display`에 표시된다

**AC-9 접근성 — 키보드 조작**
Given 사용자가 키보드만 사용한다
When Tab으로 btn-start/btn-pause/btn-reset/btn-lap 각각에 포커스를 이동하고 Enter 또는 Space를 누른다
Then 마우스 클릭과 동일하게 각 컨트롤의 동작이 실행된다

**AC-10 반응형**
Given 뷰포트 너비가 375px이다
When 컨트롤과 lap-list가 렌더링된다
Then 가로 스크롤 없이 모든 컨트롤과 랩 항목이 화면 안에 표시된다

## 3. 순수함수 계약

### 3.1 `formatElapsed(ms)`

- **입력**: 0 이상의 정수 밀리초 `ms`
- **출력**: `"MM:SS.CC"` 문자열 (MM=분, SS=초, CC=1/100초 — 각 2자리 zero-pad. 분이 100 이상이면 3자리 이상으로 자연 확장, truncation 없음)
- **방어**: 음수/NaN/비정상 입력은 0으로 처리 (throw 하지 않음)

경계값 테스트 케이스 (최소 8개):

| # | 입력 (ms) | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | 0 | "00:00.00" | 초기값 |
| 2 | 9 | "00:00.00" | 10ms 미만은 센티초 0 |
| 3 | 10 | "00:00.01" | 센티초 자리올림 경계 |
| 4 | 999 | "00:00.99" | 초 자리올림 직전 |
| 5 | 1000 | "00:01.00" | 초 자리올림 |
| 6 | 59999 | "00:59.99" | 분 자리올림 직전 |
| 7 | 60000 | "01:00.00" | 분 자리올림 |
| 8 | 6000000 | "100:00.00" | 분 3자리 확장 (100분) |
| 9 | -1 / NaN | "00:00.00" | 방어적 처리, throw 없음 |

### 3.2 `lapStats(laps)`

- **랩 레코드 형태**: `{ id: number, lapMs: number, totalMs: number }`
  - `id`: 1부터 증가하는 랩 일련번호 (MAX_LAPS 초과로 오래된 랩이 제거돼도 계속 증가)
  - `lapMs`: 직전 랩 이후 구간 경과 시간 (첫 랩은 totalMs와 동일)
  - `totalMs`: 랩 기록 시점까지의 누적 경과 시간
- **입력**: 위 형태의 lap 객체 배열 (0개 이상)
- **출력**: `{ bestId: number|null, worstId: number|null }`
  - 비교 기준은 `lapMs`(구간 시간)이며 `totalMs`가 아니다.
  - 최솟값/최댓값 동률 시 더 작은 `id`(먼저 기록된 랩)를 채택한다.
  - 배열 길이 0~1이거나 전체 `lapMs`가 동일(완전 동률)하면 `{ bestId: null, worstId: null }`.
  - `laps`가 배열이 아니거나 null/undefined면 `{ bestId: null, worstId: null }` (throw 하지 않음).
  - MAX_LAPS 등 cap 로직은 `lapStats`의 책임이 아니며 전달된 배열만 계산한다.

경계값 테스트 케이스 (최소 8개):

| # | 입력 | 기대 출력 | 비고 |
| --- | --- | --- | --- |
| 1 | `[]` | `{bestId:null, worstId:null}` | 빈 배열 |
| 2 | `[{id:1,lapMs:1000,totalMs:1000}]` | `{bestId:null, worstId:null}` | 단일 랩, 비교 불가 |
| 3 | `[{id:1,lapMs:1000},{id:2,lapMs:800}]` | `{bestId:2, worstId:1}` | 정상 계산 |
| 4 | `[{id:1,lapMs:500},{id:2,lapMs:500}]` | `{bestId:null, worstId:null}` | 전체 동률 |
| 5 | `[{id:1,lapMs:500},{id:2,lapMs:300},{id:3,lapMs:300}]` | `{bestId:2, worstId:1}` | 최솟값 tie → 먼저 기록된 id |
| 6 | `[{id:1,lapMs:300},{id:2,lapMs:900},{id:3,lapMs:900}]` | `{bestId:1, worstId:2}` | 최댓값 tie → 먼저 기록된 id |
| 7 | `[{id:1,lapMs:0,totalMs:0},{id:2,lapMs:200,totalMs:200}]` | `{bestId:1, worstId:2}` | lapMs=0도 유효한 최솟값 |
| 8 | `null` / `undefined` | `{bestId:null, worstId:null}` | 방어적 처리 |
| 9 | 랩 200개(서로 다른 lapMs) | 정상적으로 최댓값/최솟값 계산 | cap 로직과 무관하게 배열 전체 대상 |

## 4. UI 계약 (frozen — 그대로 기술, 재정의 금지)

### 4.1 대상 파일 · 소유자 · 상태

| 파일 | 소유자 | 상태 |
| --- | --- | --- |
| `docs/design/mockup/stopwatch.html` | designer | blueprint-frozen (additive) |
| `docs/design/stopwatch-BF-2041.md` | designer | blueprint-frozen (additive) |
| `stopwatch/index.html` | developer | blueprint-frozen (additive) |
| `stopwatch/stopwatch.js` | developer | blueprint-frozen (additive) |
| `stopwatch/style.css` | developer | blueprint-frozen (additive) |
| `stopwatch/test/stopwatch.test.js` | developer | blueprint-frozen (additive) |

> 참고: 현재 `stopwatch/index.html`·`stopwatch/stopwatch.js`에는 이전 티켓(BF-417/BF-415) 산출물이 남아 있어 DOM 구조가 본 계약과 다르다. developer는 아래 §4.2~§4.5 frozen 계약을 기준으로 구현한다.

### 4.2 DOM ID / class

- **DOM ID**: `stopwatch-root`, `stopwatch-display`, `btn-start`, `btn-pause`, `btn-reset`, `btn-lap`, `lap-list`
- **CSS class**: `stopwatch`, `stopwatch__display`, `stopwatch__controls`, `stopwatch__btn`, `lap-list__item`, `lap-list__item--best`, `lap-list__item--worst`
- **상태**: idle, running, paused (§1 상태 전이표 참조)

### 4.3 디자인 토큰

`--color-bg-app=#0f172a`, `--color-display-text=#f8fafc`, `--color-btn-start=#22c55e`, `--color-btn-pause=#f59e0b`, `--color-btn-reset=#ef4444`, `--color-lap-best=#16a34a`, `--color-lap-worst=#dc2626`, `--space-control-gap=12px`, `--font-family-base=system-ui, -apple-system, sans-serif`

### 4.4 접근성 기준

- btn-start/btn-pause/btn-reset/btn-lap은 각각 명시적 `aria-label`('시작'/'일시정지'/'리셋'/'랩 기록')을 가진다.
- 모든 컨트롤은 Tab 키로 포커스 가능하고 Enter/Space로 활성화된다.
- 최고/최저 랩은 색상뿐 아니라 텍스트 배지('최고 랩'/'최저 랩')로도 구분된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.5 반응형 기준

- 375px 이상 뷰포트에서 컨트롤과 랩 목록이 가로 스크롤 없이 표시된다.

### 4.6 selector/token 불변식

- designer와 developer는 위 selector(ID/class)와 토큰을 변경하거나 재정의하지 않는다.
- 파일 소유권과 상태 계약은 본 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.

## 5. Handoff

- designer(BF-2042): §4 UI 계약을 기준으로 `docs/design/mockup/stopwatch.html`, `docs/design/stopwatch-BF-2041.md` 작성.
- developer(BF-2043): §1 상태 전이표, §3 순수함수 계약, §4 UI 계약을 기준으로 `stopwatch/index.html`, `stopwatch/stopwatch.js`, `stopwatch/style.css`, `stopwatch/test/stopwatch.test.js` 구현.
