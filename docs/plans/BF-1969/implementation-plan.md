# 기간 변환기(duration-converter) 구현 설계 (BF-1969)

- Epic: BF-1969 / 본 문서 작성 Task: BF-1972 (planner)
- 작성자: 박기획 (planner)
- 후속: BF-1970 (designer) · BF-1971 (developer)
- 상태: **frozen** — 아래 §2(파일 구성/DOM id/CSS class/상태명/토큰/접근성/반응형)는 designer·developer가 그대로 따르며 재정의하지 않는다.
- stack 규약: `vanilla-static` (외부 프레임워크 의존성 없음, ESM), `serve_root=.`, route mapping은 root-relative static.

> 본 문서는 `planning-contract@v1` / `ui-contract@v1`를 구체화한 실행 설계다. designer는 `docs/design/BF-1969-duration-converter.md` + `docs/design/mockup.html`, developer는 `duration-converter/index.html` + `duration-converter/src/duration.js` + `duration-converter/tests/duration.test.js`를 이 계약 위에서 작성한다. 새 파일이나 새 역할은 추가하지 않는다.

## 1. 개요

기간 변환기는 "초 단위 값"과 "사람이 읽는 기간 표현"(예: `1시간 30분`)을 **양방향**으로 실시간 변환하는 단일 화면 위젯이다.

- 사용자는 `seconds-input`(초 단위 숫자) 또는 `duration-input`(자연어 기간 텍스트) 어느 쪽이든 편집할 수 있고, 다른 쪽 필드가 자동으로 갱신된다.
- `quick-select-30s` / `quick-select-5m` / `quick-select-1h` / `quick-select-1d` 버튼으로 대표값을 즉시 채울 수 있다.
- 오류(무효 입력)는 지연 없이 즉시 안내되어야 하고(F2), 성공적인 상대 필드 갱신은 과도한 재계산을 막기 위해 디바운스되어야 하며(P1), 그 디바운스 지연은 150ms를 넘지 않아야 한다(P2).
- 동일한 총 초를 나타내는 서로 다른 기간 텍스트(`90분` = `1시간 30분`)는 항상 동일하게 정규화되어 표시되어야 한다(F3).

## 2. Frozen UI 계약

### 2.1 파일 구성 (frozen — 신규 파일 추가 금지)

| 경로 | 소유자 | 역할 |
|---|---|---|
| `docs/plans/BF-1969/implementation-plan.md` | planner (본 문서) | 실행 설계 / frozen 계약 |
| `docs/design/BF-1969-duration-converter.md` | designer | 시각 명세 (본 계약 인용) |
| `docs/design/mockup.html` | designer | 정적 목업 |
| `duration-converter/index.html` | developer | 실제 마크업/서빙 엔트리 (root-relative route: `/duration-converter/index.html`) |
| `duration-converter/src/duration.js` | developer | 파싱/검증/변환/포맷/메모이제이션 순수 함수 + 동기화 컨트롤러 |
| `duration-converter/tests/duration.test.js` | developer | 단위 테스트 |

### 2.2 DOM id (frozen, 7개 — 재정의 금지)

`seconds-input`, `duration-input`, `error-message`, `quick-select-30s`, `quick-select-5m`, `quick-select-1h`, `quick-select-1d`

권장 마크업 골격(비-frozen 보조 요소는 developer 재량):

```html
<div class="field" id="seconds-field">
  <label for="seconds-input">초 단위 값</label>
  <input id="seconds-input" type="text" inputmode="numeric" aria-label="초 단위 값 입력">
</div>
<div class="field" id="duration-field">
  <label for="duration-input">기간 표현</label>
  <input id="duration-input" type="text" aria-label="기간 표현 입력 (예: 1시간 30분)">
</div>
<p id="error-message" role="alert" aria-live="assertive"></p>
<div class="quick-select-group">
  <button type="button" id="quick-select-30s" class="quick-select-btn">30초</button>
  <button type="button" id="quick-select-5m" class="quick-select-btn">5분</button>
  <button type="button" id="quick-select-1h" class="quick-select-btn">1시간</button>
  <button type="button" id="quick-select-1d" class="quick-select-btn">1일</button>
</div>
```

`seconds-field` / `duration-field` / `quick-select-group` id·class는 frozen 목록 밖이므로 developer 재량(명칭 변경 가능), 단 위 7개 frozen id와 §2.3 frozen class는 변경 금지.

### 2.3 CSS class (frozen, 4개 — 재정의 금지)

- `field` — `seconds-input`/`duration-input`을 감싸는 래퍼에 부여하는 기본 클래스.
- `field--active` — 현재 활성(사용자가 편집 중이거나 마지막으로 유효 갱신된) 필드 래퍼에 추가하는 modifier.
- `field--error` — 상태가 `error`일 때 원인이 된 필드 래퍼에 추가하는 modifier.
- `quick-select-btn` — 4개 quick-select 버튼 공통 클래스.

### 2.4 상태 모델 (frozen, 4종 — 재정의 금지)

`idle` · `seconds-active` · `duration-active` · `error`

상태명은 항상 화면 텍스트로도 노출한다(§2.6 접근성 참조, 색상만으로 구분 금지).

### 2.5 디자인 토큰 (frozen — 재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-field-active` | `#2563eb` | `field--active` 강조(테두리/포커스 링) |
| `--color-field-error` | `#dc2626` | `field--error` 강조 및 `error-message` 텍스트 |
| `--color-action-primary` | `#2563eb` | `quick-select-btn` 배경/강조 |
| `--space-control-gap` | `12px` | 필드/버튼 그룹 간 수직·수평 간격 |

### 2.6 접근성 요구사항 (frozen)

- `seconds-input`, `duration-input`은 각각 명시적 `aria-label`을 가진다.
- `error-message`는 `role="alert"`(또는 `aria-live="assertive"`)로 스크린리더에 즉시 공지된다.
- `quick-select-30s`/`5m`/`1h`/`1d`는 네이티브 `<button>` 요소로 Tab/Enter 키보드 조작이 가능하다.
- 모든 상태(`idle`/`seconds-active`/`duration-active`/`error`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 2.7 반응형 기준 (frozen)

320px 폭에서 `seconds-input`/`duration-input` 두 입력란과 quick-select 버튼 그룹이 **세로로 stack**되며 content overflow가 발생하지 않는다.

## 3. 상태 전이 설계 (Given/When/Then)

| # | Given | When | Then |
|---|---|---|---|
| T1 | `idle`, 두 필드 모두 비어있음 | 사용자가 `seconds-input`에 유효한 정수 입력 | 즉시 유효성 통과 → §4 디바운스 규칙에 따라 120ms 후 `duration-input` 갱신, 상태 → `seconds-active`, `seconds-field`에 `field--active`, `error-message` 비움 |
| T2 | `idle` | 사용자가 `duration-input`에 유효한 기간 텍스트 입력 | 동일 로직으로 120ms 후 `seconds-input` 갱신, 상태 → `duration-active`, `duration-field`에 `field--active` |
| T3 | `seconds-active` 또는 `duration-active` | 현재 활성 필드에 **무효** 값 입력 | 디바운스 없이 즉시(0ms) 상태 → `error`, 해당 필드에 `field--error`, `error-message`에 원인 텍스트, 대기 중이던 디바운스 타이머는 `clearTimeout`으로 취소되어 상대 필드는 마지막 유효 값을 유지(덮어쓰지 않음) |
| T4 | `error` | 사용자가 값을 수정해 다시 유효해짐 | 즉시 `field--error` 해제, T1/T2와 동일하게 120ms 후 정상 갱신, 상태 → 편집 중이던 필드에 대응하는 `seconds-active`/`duration-active` |
| T5 | 임의 상태 | quick-select 버튼(`30초`/`5분`/`1시간`/`1일`) 클릭 | 디바운스 미적용(사용자 타이핑이 아닌 이산 액션) — 두 필드를 즉시 canonical 값으로 프로그램적 갱신(§5 가드 경유), 상태 → `seconds-active`, `error-message` 비움, `field--error` 제거 |
| T6 | 임의 상태 | 활성 필드가 다시 빈 문자열로 전부 지워지고 **다른 쪽 필드도 비어있음** | 상태 → `idle` 복귀, `error-message` 비움, `field--active`/`field--error` 모두 제거 |
| T7 | `seconds-active`(디바운스 대기 중) | 대기 중 사용자가 `duration-input` 편집 시작(필드 전환) | 활성 필드가 `duration-input`으로 갱신되고, 이전 필드용으로 예약된 디바운스 타이머는 취소 후 새 필드 기준으로 재예약(단일 공유 타이머 변수 사용, §4) |

## 4. P1(디바운스)·F2(즉시 오류)·P2(150ms 상한) 긴장 해소 설계

세 요구는 **"검증"과 "갱신"을 분리**해 양립시킨다.

1. **오류 검증(F2)은 디바운스 없이 매 `input` 이벤트마다 동기적으로 즉시 실행한다.** 정규식 기반 파싱/검증은 1ms 미만이므로 이벤트 핸들러 안에서 그대로 수행해도 체감 지연이 없다. 무효 판정 시 `error-message`와 `field--error`는 그 자리에서(0ms) 반영된다.
2. **성공적으로 파싱된 값의 "상대 필드 갱신"만 디바운스를 적용한다(P1).** 디바운스 지연값은 `DEBOUNCE_MS = 120`(ms)로 고정한다.
3. **`DEBOUNCE_MS = 120` < P2 상한 `150`ms.** 사용자가 타이핑을 멈춘 시점부터 상대 필드가 갱신되기까지의 최대 지연은 120ms이며, 여기에 실행 오버헤드(포맷/DOM 대입, 통상 수 ms 이내)를 더해도 150ms 상한에 30ms의 여유를 둔다. 디바운스는 "연속 재예약형"이므로(§3 T7) 타이핑이 계속되는 동안은 갱신이 미뤄지지만, **정지 시점 기준 최대 대기는 항상 120ms**로 고정되어 P2를 위반하지 않는다.
4. **오류 전이 시 대기 중인 디바운스 타이머는 즉시 취소한다.** 그렇지 않으면 사용자가 유효값 입력 직후 곧바로 무효값으로 고쳤을 때, 취소되지 않은 이전 타이머가 뒤늦게 실행되어 이미 `error` 상태인 화면의 상대 필드를 덮어쓰는 경합이 발생한다(§5 가드와 함께 단일 `debounceTimerId` 변수로 관리해 이 경합을 원천 차단).

구현 스케치(`duration.js` 동기화 컨트롤러 내부):

```js
const DEBOUNCE_MS = 120; // P2(150ms) 상한 대비 30ms 여유
let debounceTimerId = null;

function onFieldInput(sourceEl, targetEl) {
  const result = parseInputFor(sourceEl); // 동기, 즉시 — F2
  if (debounceTimerId) { clearTimeout(debounceTimerId); debounceTimerId = null; }

  if (!result.ok) {
    setErrorState(sourceEl, result.error); // 즉시 반영, 디바운스 없음
    return;
  }
  clearErrorState();
  debounceTimerId = setTimeout(() => {
    writeValue(targetEl, formatFor(targetEl, result.seconds)); // §5 가드 경유
    setActiveState(sourceEl);
    debounceTimerId = null;
  }, DEBOUNCE_MS); // P1
}
```

## 5. 양방향 동기화 무한 루프 방지 가드 설계

`seconds-input`↔`duration-input`이 서로의 값을 프로그램적으로 대입하므로, **"프로그램이 쓴 값"과 "사용자가 입력한 값"을 구분하는 가드**가 필요하다.

- 모듈 스코프 플래그 `let isProgrammaticUpdate = false;`를 둔다.
- 모든 프로그램적 대입은 `writeValue()` 헬퍼 하나만 거친다:

  ```js
  function writeValue(el, value) {
    isProgrammaticUpdate = true;
    el.value = value;
    isProgrammaticUpdate = false; // 동기 실행이므로 setTimeout 불필요, 즉시 원복
  }
  ```

- 모든 `input` 이벤트 핸들러는 최상단에서 `if (isProgrammaticUpdate) return;`으로 가드한다.
- **가정 명시**: 네이티브 DOM에서 `el.value = ...` 대입 자체는 `input`/`change` 이벤트를 발생시키지 않으므로, 현재 설계상 엄밀히는 재귀 호출이 발생하지 않는다. 그럼에도 이 플래그를 명시적으로 둔다 — 향후 접근성 개선 등으로 `dispatchEvent(new Event('input'))`를 프로그램적 동기화에 추가하거나 핸들러 로직이 리팩터링될 경우에도 무한 루프를 구조적으로 방지하기 위한 방어적 설계다.
- 추가 가드: 어떤 필드가 "현재 사용자가 편집 중인 필드"(`activeField`)인지 별도로 추적하고, `writeValue()`의 대상이 `activeField`와 같으면 호출하지 않는다(개발자 실수로 활성 필드 자신에게 다시 쓰는 것을 방지). `writeValue()`의 대상은 항상 `activeField`의 반대쪽 필드다.

## 6. 메모이제이션 키 설계 (F3: 동치 표현 정규화)

**문제**: `duration-input`에 `90분`을 입력하든 `1시간 30분`을 입력하든 총 초는 동일(5400초)해야 한다. 만약 포맷/변환 캐시의 키를 원문 문자열로 잡으면 `"90분"`과 `"1시간 30분"`이 서로 다른 캐시 엔트리가 되어, 구현이 바뀌거나 캐시가 일부만 채워진 상태에서 두 표현이 서로 다른 결과를 보여주는 불일치가 발생할 수 있다.

**해결**: 캐시 키를 원문 문자열이 아닌 `canonicalizeSeconds()`가 반환하는 **정규화된 정수 초 값(canonical seconds)**으로 정의한다.

```js
const secondsToDurationCache = new Map(); // key: canonical integer seconds, value: formatted duration text

function formatDuration(seconds) {
  const key = canonicalizeSeconds(seconds); // 음수/소수/NaN 방지, 정수 초로 정규화
  if (secondsToDurationCache.has(key)) return secondsToDurationCache.get(key);
  const text = computeDurationText(key); // 일/시간/분/초 성분 조합, 0이면 "0초"
  secondsToDurationCache.set(key, text);
  return text;
}
```

- `duration-input` 파싱(`parseDurationInput`)은 먼저 원문을 canonical seconds(정수)로 환산한 뒤, 화면에 되돌려 보여줄 정규화된 표현이 필요할 때 이 `formatDuration(key)`를 호출한다. 따라서 `90분`과 `1시간 30분`은 동일한 `key = 5400`으로 수렴해 **항상 동일한 캐시 엔트리, 동일한 출력**을 보장한다.
- 캐시 eviction 정책은 두지 않는다(Simplicity First) — 본 위젯은 사람이 손으로 입력하는 상호작용 폼이라 세션 내 distinct seconds 값의 개수가 실질적으로 작다. 자동화된 대량 입력 등 이 가정이 깨지는 시나리오는 현재 범위 밖이며, 필요해지면 별도 후속 task로 다룬다(추측성 abstraction 금지).

## 7. API 스펙 초안 (`duration-converter/src/duration.js`, 권장 — developer 재량으로 조정 가능)

| 함수 | 시그니처 | 설명 |
|---|---|---|
| `canonicalizeSeconds` | `(seconds: number) => number` | 음수/소수/NaN 방지, 0 이상의 정수로 정규화 |
| `parseSecondsInput` | `(raw: string) => { ok: true, seconds: number } \| { ok: false, error: string }` | `seconds-input` 원문 검증(0 이상 정수만 허용) |
| `parseDurationInput` | `(raw: string) => { ok: true, seconds: number } \| { ok: false, error: string }` | `duration-input` 원문을 canonical seconds로 파싱(§9 문법) |
| `formatDuration` | `(seconds: number) => string` | canonical seconds → 사람이 읽는 기간 텍스트, §6 캐시 적용 |

## 8. 아키텍처 개요

- **duration-converter-view**: DOM 렌더링, 이벤트 바인딩, 상태별 class(`field--active`/`field--error`) 적용.
- **duration-converter-sync-controller**: `activeField` 추적, §5 `isProgrammaticUpdate` 가드, §4 디바운스 타이머(`debounceTimerId`) 관리, 상태(§2.4) 전이.
- **duration-converter-core**(`duration.js`): §7의 순수 함수(파싱/검증/변환/포맷 + §6 메모이제이션). 부작용 없음, DOM 비의존 → 단위 테스트 용이.

## 9. edge case / 실패 케이스

- `seconds-input`: 빈 문자열/음수/소수/비숫자 문자 → `error` ("0 이상의 정수를 입력하세요"). 정수 파싱이 안전 정수 범위(`Number.MAX_SAFE_INTEGER`)를 넘으면 → `error` ("값이 너무 큽니다").
- `duration-input`: 문법은 `^(?:(\d+)일)?\s*(?:(\d+)시간)?\s*(?:(\d+)분)?\s*(?:(\d+)초)?$`(일→시간→분→초 고정 순서, 각 성분 최대 1회, 최소 1개 성분 필요, 음수/소수 불가)만 허용한다. 순서가 뒤바뀌거나(`30분 1시간`) 문법 밖 문자가 섞이면 → `error` ("형식을 인식할 수 없습니다 (예: 1시간 30분)").
- 모든 성분이 0인 유효 입력(`0초`)은 오류가 아니라 `seconds=0`으로 정상 처리한다(`idle`이 아니라 사용자가 명시적으로 입력한 값이므로 `seconds-active`/`duration-active` 유지).
- 필드가 비어 있고 **다른 쪽 필드도 비어 있으면** `idle`(§3 T6), 한쪽만 비면 `error`("값을 입력하세요").
- §3 T7의 필드 전환 경합은 단일 공유 `debounceTimerId`로 방지한다(필드별 독립 타이머 금지 — 오래된 타이머가 새 활성 필드 값을 덮어쓰는 것을 막기 위함).

## 10. 후속 페르소나 안내

- designer(BF-1970): §2(파일/DOM id/class/상태명/토큰/접근성/반응형)를 그대로 인용해 `docs/design/BF-1969-duration-converter.md` + `docs/design/mockup.html` 작성. 색상 팔레트 중 frozen 토큰 외 배경/텍스트 등은 designer 재량.
- developer(BF-1971): §4(디바운스/즉시오류 분리)·§5(무한루프 가드)·§6(메모이제이션 키)·§7(API)·§9(edge case)를 그대로 구현. `duration-converter/index.html`은 §2.2 골격을 기준으로 작성.
