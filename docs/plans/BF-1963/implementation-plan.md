# 색상 대비 검사기(Contrast Checker) 구현 설계 — BF-1963 (planner: BF-1966)

## 0. 문서 성격

본 문서는 `planning-contract@v1`(producer=planner, artifactId 계열
`PKT-PLAN`, sha256:8a05d579301baec63ea4ce44fcc4d1155732743d09db980af9f28ee9a6c9fa1b)
이며, 상위 frozen `ui-contract@v1`(sha256:6b58bd54af99e27ee9f89adf2d5dec8c620da304ced1516f586d26df977b4608)을
**재정의 없이** 구현 가능한 실행 설계로 서술한다. §4의 파일·DOM ID/class·상태·
토큰·접근성·반응형은 frozen 목록 그대로이며, 본 문서는 신규 selector·상태·
역할·파일을 추가하지 않는다. designer(BF-1964)는 §4를 `docs/design/contract.md`
시각 명세로, developer(BF-1965)는 §2~§4를 `contrast-checker/index.html` /
`contrast-checker/tests/contrast.test.js` 구현으로 그대로 따른다.

## 1. 요구 요약

- F1: hex 3자리(`#abc`)/6자리(`#aabbcc`) 입력을 동일 색상으로 인식한다.
- F2: 유효하지 않은 hex 입력 시 오류를 즉시(지연 없이) 표시한다.
- F3: WCAG 상대 휘도 공식 기반 대비비를 계산하고 AA/AA-large/AAA 판정을
  배지로 표시한다.
- F4: 전경색/배경색 입력, 미리보기, 배지, 색상 교환(swap) UI를 제공한다.
- P1: 입력 변경 시 매 keystroke 마다 재계산하지 않도록 디바운스를 적용한다.
- P2: 유효한 입력 변경으로부터 결과 갱신까지 총 지연이 150ms를 넘지 않는다.
- P3: 동일 hex 조합 재계산을 피하도록 메모이제이션을 적용한다.

이 요구들 사이에는 정면 긴장이 있다: P1(디바운스로 지연 추가)과 F2(즉시 오류
표시)·P2(150ms 상한)가 충돌하고, P1(지연 삽입)과 P3(캐시로 계산 자체를
스킵)의 역할 분담이 불명확하다. §2에서 이를 해소한다.

## 2. 요구 긴장 해소 전략

### 2.1 디바운스 지연 값과 오류 즉시 표시 경로 분리 (P1 vs F2 vs P2)

**핵심 결정: "형식 검증"과 "대비 계산·UI 갱신"을 서로 다른 두 단계로 분리하고,
디바운스는 후자에만 적용한다.**

1. **1단계 — 형식 검증 (디바운스 없음, 항상 즉시)**
   - `fg-color-hex`/`bg-color-hex`의 `input` 이벤트마다 동기적으로
     `/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/` 정규식으로 형식을 검사한다.
   - 형식이 유효하지 않으면(길이 불일치, 3/6자리 외, 16진수 아닌 문자 포함,
     빈 문자열 등) **디바운스 없이 그 즉시** `state=invalid-input`으로
     전이하고 `input-error-message`(role="alert")를 노출한다. 이는 F2를
     충족하며 P1의 디바운스 대상이 아니므로 P1과 충돌하지 않는다.
   - 진행 중이던 디바운스 타이머(2단계)가 있다면 즉시 취소한다(오래된 유효
     입력 기준으로 재계산이 뒤늦게 실행되는 것을 방지).

2. **2단계 — 대비 계산 및 UI 갱신 (디바운스 적용, 150ms 예산 안에서)**
   - 형식이 유효한 입력이 들어오면 즉시 `state=recalculating`으로 전이해
     "재계산 중" 임을 알리고, **디바운스 지연 100ms** 타이머를 (재)설정한다.
   - 100ms 동안 추가 변경이 없으면 타이머가 만료되어 §3의 계산을 실행하고
     `contrast-ratio-value`/`badge-aa`/`badge-aa-large`/`badge-aaa`/
     `preview-sample`을 갱신한 뒤 `state=valid-result`로 전이한다.
   - **150ms 상한 준수 근거**: 계산 자체는 §2.2 메모이제이션 덕분에 O(1)에
     가깝고(수 ms 미만), 디바운스 100ms + 계산 <10ms ≈ 110ms로 P2가 요구하는
     150ms 상한 안에 항상 들어온다. 디바운스 지연 값(100ms)은 이 예산 안에서
     정한 상수이며, 임의로 늘릴 경우 P2를 위반하므로 developer는 100ms를
     초과하는 값으로 변경하지 않는다(향후 실측 결과 150ms 상한을 유지하는
     선에서만 조정 가능).
   - `swap-colors-btn` 클릭은 두 입력이 모두 이미 유효했던 경우 값 교환 직후
     동일하게 `recalculating → (100ms) → valid-result` 경로를 따른다(사용자
     명시적 액션이지만 별도 즉시-갱신 경로를 두지 않아 로직을 단일화한다 —
     100ms는 여전히 150ms 예산 안이므로 P2 위반 아님). 교환 결과 어느 한쪽이
     `invalid-input`이었다면(예: 오류 메시지가 남아있던 입력을 교환) 오류는
     그 값을 따라 이동하며 1단계 규칙대로 즉시 `invalid-input`을 유지한다.

3. **상태 4종의 정확한 의미**
   - `idle`: 최초 마운트 시 기본값(§2.1 참고, `fg=#000000`/`bg=#ffffff`)에
     대한 최초 계산이 아직 표시되지 않은 짧은 초기 순간. 최초 계산은 사용자
     입력이 아니므로 디바운스를 적용하지 않고 마운트 직후 동기적으로 수행해
     바로 `valid-result`로 전이한다(즉, `idle`은 렌더 직후 즉시 `valid-result`로
     대체되는 짧은 초기 상태이며 사용자가 인지할 필요는 없다. 초기값이 항상
     유효한 hex이므로 `idle`이 장시간 유지되는 경로는 없다).
   - `invalid-input`: 1단계에서 형식 오류가 감지된 상태. `input-error-message`
     노출, 배지/미리보기는 마지막 유효 결과를 유지한다(급격한 초기화로 사용자
     맥락을 잃지 않도록).
   - `recalculating`: 2단계 디바운스 대기 중. 배지/미리보기는 이전 유효
     결과를 유지한 채(깜빡임 방지) 갱신 대기 중임을 나타낸다.
   - `valid-result`: 최신 계산이 반영 완료된 상태.

4. **불변식 준수(초기화·취소·실패 후 복귀)**: `fg-color-hex`/`bg-color-hex`/
   `fg-color-picker`/`bg-color-picker`/`swap-colors-btn`은 `invalid-input`을
   포함한 어떤 상태에서도 비활성화되지 않고 즉시 재사용 가능해야 한다. 오류
   상태가 발생해도 이후 새 입력을 다시 받을 수 있어야 하며, 값을 지우거나
   다시 유효한 hex로 고치면 1단계 규칙에 따라 즉시 반응한다.

### 2.2 hex 정규화 → 메모이제이션 캐시 키 (F1 + P3)

1. **정규화 함수**: 입력 문자열에서 선행 `#`을 제거하고 소문자로 변환한 뒤,
   - 3자리(`rgb`)이면 각 문자를 두 번 반복해 6자리로 확장한다: `abc` →
     `aabbcc`.
   - 6자리(`rrggbb`)이면 그대로 사용한다.
   - 결과는 항상 소문자 6자리 hex 문자열(`#` 없음, 예: `aabbcc`)이다.
   - 이 정규화는 1단계 형식 검증을 통과한 값에만 적용한다(형식이 유효하지
     않으면 정규화하지 않고 `invalid-input`으로 처리, §2.1).
2. **캐시 키**: `` `${normalize(fg)}:${normalize(bg)}` ``. `#abc`와
   `#aabbcc`는 동일한 정규화 결과(`aabbcc`)를 생성하므로, 배경색이 동일할 때
   두 표기는 항상 같은 캐시 키로 수렴한다(F1 요구 충족).
3. **캐시 저장소**: 모듈 스코프의 `Map<string, {ratio:number, aa:boolean,
   aaLarge:boolean, aaa:boolean}>`. §3의 계산 결과(대비비, AA/AA-large/AAA
   판정)를 캐시 키로 저장한다. 2단계 디바운스 타이머 만료 시점에 캐시를 먼저
   조회하고, hit이면 §3 계산을 건너뛰고 즉시 UI를 갱신하며, miss이면 계산 후
   캐시에 적재한다.
4. **캐시 상한(edge case)**: 세션 중 사용자가 다양한 hex를 시도하며 캐시가
   무한정 커지는 것을 막기 위해 최대 항목 수(예: 100개, LRU eviction — 가장
   오래 미사용된 키부터 제거)를 둔다. 상한 값 자체는 frozen 계약이 아니므로
   developer 재량이나, 상한을 두어야 한다는 원칙은 본 설계의 요구사항이다.
5. **P1과의 관계**: 디바운스(§2.1)는 "언제 계산을 트리거할지"를, 메모이제이션은
   "같은 입력에 대해 계산을 반복하지 않는 것"을 담당한다. 두 메커니즘은 독립
   레이어이며, 디바운스 타이머가 만료되어도 캐시 hit이면 §3 연산을 생략해
   150ms 예산에 더 큰 여유를 준다.

## 3. WCAG 상대 휘도 계산 절차 (F3)

`docs/design/contract.md`와 `contrast-checker/tests/contrast.test.js`는 아래
절차를 정확히 구현/검증한다.

1. §2.2에서 정규화된 6자리 hex(`rrggbb`)를 `R, G, B ∈ [0,255]` 정수로
   분해한다.
2. 각 채널을 `[0,1]`로 정규화: `c = R/255` (G, B 동일).
3. **감마 보정 분기(WCAG 2.x 공식)**:
   - `c <= 0.03928` 이면 `c_lin = c / 12.92`
   - `c > 0.03928` 이면 `c_lin = ((c + 0.055) / 1.055) ^ 2.4`
   - R, G, B 각각 독립적으로 위 분기를 적용해 `R_lin, G_lin, B_lin`을 얻는다.
4. **상대 휘도**: `L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin`.
5. **대비비**: 전경/배경 각각의 `L`(`L_fg`, `L_bg`)을 구한 뒤
   `L1 = max(L_fg, L_bg)`, `L2 = min(L_fg, L_bg)`로 정하고
   `ratio = (L1 + 0.05) / (L2 + 0.05)`. 결과 범위는 `[1, 21]`.
6. **배지 판정 임계값(경계 포함, `>=`)**:
   - `badge-aa`(일반 텍스트 AA): `ratio >= 4.5`
   - `badge-aa-large`(큰 텍스트 AA): `ratio >= 3.0`
   - `badge-aaa`(일반 텍스트 AAA): `ratio >= 7.0`
   - 각 배지는 판정에 따라 `contrast-badge--pass` 또는 `contrast-badge--fail`
     class를 가지며, `contrast-ratio-value`에는 소수 둘째 자리까지 반올림한
     비율(예: `4.48:1`)을 텍스트로 표시한다.
7. **검증 예시(테스트 케이스 근거)**:
   - `fg=#000000`, `bg=#ffffff` → `ratio = 21.00` (모든 배지 pass).
   - `fg=#ffffff`, `bg=#ffffff` → `ratio = 1.00` (모든 배지 fail, F1의 동일색
     edge case).
   - `fg=#777777`, `bg=#ffffff` → `L_fg ≈ 0.1846`, `ratio ≈ 4.48` → AA(4.5)
     **fail**, AA-large(3.0) **pass**, AAA(7.0) **fail**. 임계값 경계 근접
     케이스로 `contrast.test.js`에 반드시 포함한다(§6).

## 4. UI 계약 (exact, frozen 그대로 서술 — 재정의 금지)

### 4.1 대상 파일

| 파일 | 소유 | 상태 |
| --- | --- | --- |
| `contrast-checker/index.html` | developer (BF-1965) | frozen (신규 생성) |
| `contrast-checker/tests/contrast.test.js` | developer (BF-1965) | frozen (신규 생성) |
| `docs/design/contract.md` | designer (BF-1964) | frozen, additive(다른 절 보존, 본 task 절만 추가) |
| `docs/design/mockup.html` | designer (BF-1964) | frozen (신규 생성) |
| `docs/plans/BF-1963/implementation-plan.md` | planner (본 문서) | 본 task 산출물 |

### 4.2 DOM ID (frozen, 변경 금지)

`fg-color-hex`, `fg-color-picker`, `bg-color-hex`, `bg-color-picker`,
`swap-colors-btn`, `contrast-ratio-value`, `badge-aa`, `badge-aa-large`,
`badge-aaa`, `preview-sample`, `input-error-message`.

### 4.3 CSS class (frozen, 변경 금지)

`contrast-badge`, `contrast-badge--pass`, `contrast-badge--fail`,
`color-input-group`, `preview-panel`.

- `badge-aa`/`badge-aa-large`/`badge-aaa` 각 요소는 `contrast-badge` 기본
  class와, 판정에 따라 `contrast-badge--pass` 또는 `contrast-badge--fail`
  중 하나를 함께 가진다(§3.6).
- `fg-color-hex`/`fg-color-picker`와 `bg-color-hex`/`bg-color-picker`는 각각
  `color-input-group` 컨테이너로 묶는다.
- `preview-sample`은 `preview-panel` 컨테이너 안에 배치한다.

### 4.4 상태 (frozen, §2.1 참조)

`idle`, `valid-result`, `invalid-input`, `recalculating`.

### 4.5 디자인 토큰 (frozen, 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-pass` | `#15803d` | `contrast-badge--pass` 강조 |
| `--color-fail` | `#b91c1c` | `contrast-badge--fail` 강조 |
| `--space-control-gap` | `12px` | `color-input-group` 등 control 간 간격 |
| `--font-size-preview` | `2rem` | `preview-sample` 텍스트 크기 |

이 4개 토큰만 CSS 커스텀 프로퍼티로 고정 사용하며, developer가 배경/텍스트/
테두리 등 비-frozen 보조 색상이 필요하면 신규 토큰을 추가로 정의할 수 있으나
(예: `contrast-checker-BF-1963` 절 자체 보조 팔레트) 위 4개 값을 재정의하지
않는다.

### 4.6 접근성 (frozen)

1. `fg-color-hex`/`bg-color-hex` 입력 필드는 각각 `aria-label="전경색 hex"`/
   `aria-label="배경색 hex"`를 가진다.
2. `badge-aa`/`badge-aa-large`/`badge-aaa` 컨테이너는 `aria-live="polite"`로
   통과/실패 상태 변경을 스크린리더에 알린다.
3. `swap-colors-btn`은 키보드 Tab 포커스 및 Enter/Space로 활성화 가능하다
   (네이티브 `<button>` 권장).
4. `input-error-message`는 `role="alert"`로 노출된다.
5. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성
   이름으로 노출한다(예: 배지는 "AA", "AA (large)", "AAA" 텍스트 + pass/fail
   문구를 색상과 함께 노출, `preview-sample`은 배경/전경색 실제 렌더로 대비를
   시각적으로도 보여준다).

### 4.7 반응형 (frozen)

320px 이상 뷰포트에서 `color-input-group`과 `preview-panel`이 겹치거나 가로
스크롤을 유발하지 않는다. 좁은 폭에서는 `color-input-group`(전경/배경 각각)과
`preview-panel`을 세로로 스택하는 레이아웃을 권장한다(구체적 breakpoint 값은
비-frozen, developer 재량이나 320px 이상 전 구간에서 overflow 금지는 준수).

## 5. Given/When/Then 시나리오

1. **F1 hex 정규화 동일성**
   - Given `bg-color-hex`가 `#ffffff`로 고정되어 있을 때
   - When 사용자가 `fg-color-hex`에 `#abc`를 입력하면
   - Then §2.2 정규화로 `aabbcc:ffffff` 캐시 키가 생성되고, 이후 같은 필드에
     `#aabbcc`를 입력해도 동일 캐시 키를 사용해 동일한 `contrast-ratio-value`
     (`ratio ≈ 4.30`)가 표시된다.

2. **F2 즉시 오류 표시(디바운스 우회)**
   - Given `fg-color-hex`가 유효한 값을 가지고 있을 때
   - When 사용자가 `#gg1`처럼 유효하지 않은 hex를 입력하면
   - Then 디바운스 지연 없이 즉시 `state=invalid-input`으로 전이하고
     `input-error-message`(role="alert")가 표시되며, 진행 중이던 재계산
     타이머가 있다면 취소된다.

3. **P1 + P2 디바운스와 150ms 상한 동시 충족**
   - Given 사용자가 `bg-color-hex`에 유효한 hex를 빠르게 여러 번 수정하고
     있을 때
   - When 마지막 유효 입력 이후 추가 변경 없이 100ms가 경과하면
   - Then `contrast-ratio-value`/`badge-*`/`preview-sample`이 갱신되고,
     마지막 유효 keystroke부터 화면 갱신까지의 총 지연은 150ms를 넘지 않는다
     (디바운스 100ms + 계산 <10ms).

4. **P3 메모이제이션 캐시 hit**
   - Given 사용자가 `fg=#000000`/`bg=#ffffff` 조합을 이미 조회해 캐시에
     결과가 저장되어 있을 때
   - When `swap-colors-btn`을 두 번 눌러(값이 뒤집혔다가 원래대로 복귀)
     동일 조합으로 되돌아오면
   - Then 2단계 디바운스 타이머 만료 시 캐시 hit으로 §3 재계산을 생략하고
     즉시 저장된 결과로 UI를 갱신한다.

5. **WCAG 배지 판정 경계값**
   - Given `fg-color-hex=#777777`, `bg-color-hex=#ffffff`일 때
   - When 대비비가 계산되면(`ratio ≈ 4.48`)
   - Then `badge-aa`는 `contrast-badge--fail`(4.5 미만), `badge-aa-large`는
     `contrast-badge--pass`(3.0 이상), `badge-aaa`는 `contrast-badge--fail`
     (7.0 미만) class를 가진다.

6. **초기화/복귀 불변식**
   - Given `invalid-input` 상태로 `fg-color-hex`에 오류가 표시되어 있을 때
   - When 사용자가 값을 다시 유효한 hex로 수정하면
   - Then `input-error-message`는 사라지고 `state`가 `recalculating`을 거쳐
     `valid-result`로 복귀하며, 모든 control(`fg-color-hex`, `bg-color-hex`,
     `fg-color-picker`, `bg-color-picker`, `swap-colors-btn`)은 그 사이에도
     비활성화되지 않고 즉시 사용 가능했다.

## 6. edge case / 실패 케이스

- 빈 문자열 입력: 형식 불일치로 `invalid-input` (§2.1 1단계).
- 길이 1/2/4/5/7자 이상 또는 16진수가 아닌 문자 포함: `invalid-input`.
- `#` 유무 모두 허용(있으면 제거 후 검증), 대소문자 혼용은 정규화 단계에서
  소문자로 통일.
- 전경색과 배경색이 동일한 값: `ratio = 1.00`, 세 배지 모두
  `contrast-badge--fail` (§3 검증 예시).
- 극단값 `#000000`/`#ffffff`: `ratio = 21.00`, 세 배지 모두
  `contrast-badge--pass`.
- 임계값 근접값(`ratio ≈ 4.48`, `≈2.98` 등 4.5/3.0/7.0 부근): 경계는 `>=`
  포함 판정이며 §3.6·§5.5로 테스트에 반드시 포함한다.
- 디바운스 대기 중(`recalculating`) 추가 유효 입력: 타이머를 100ms로 재설정
  (표준 디바운스 동작), 이전 대기는 취소된다.
- 디바운스 대기 중 유효하지 않은 입력 발생: 타이머를 즉시 취소하고
  `invalid-input`으로 전이(§2.1 1단계 우선).
- `swap-colors-btn`을 한쪽만 유효한 상태에서 클릭: 오류는 교환된 필드를
  따라가며 즉시 `invalid-input` 유지(§2.1-2).
- 320px 뷰포트: `color-input-group`(2개) + `preview-panel`이 세로로 스택되어
  가로 스크롤이 발생하지 않아야 한다(§4.7).
- 키보드 전용 사용자: `swap-colors-btn`은 Tab 포커스 후 Enter/Space로 동작.
- 캐시 무한 성장 방지: §2.2-4의 상한/LRU eviction으로 장시간 세션에서도
  메모리 사용을 제한한다.

## 7. Self-critique

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | AC 매핑 | AC1(§2.1, 디바운스 100ms + 형식검증 즉시경로로 150ms 상한 준수), AC2(§2.2, hex 3/6자리 → 동일 정규화 키 → 메모이제이션), AC3(§3, gamma 보정 분기 포함 상대 휘도 절차), AC4(§4, 파일·DOM ID/class·상태·토큰·접근성·반응형 exact 명시), AC5(본 문서는 frozen blueprint의 파일·소유자·상태·후조건만 서술하며 신규 파일/역할 미추가) 모두 충족. |
| 2 | 요구 긴장 해소 | P1(디바운스)·F2(즉시 오류)·P2(150ms 상한)를 "형식검증(즉시)"과 "계산·갱신(디바운스 100ms)" 2단계로 분리해 상호 배타적 경로로 해소(§2.1). P3(메모이제이션)는 디바운스와 독립된 계산 스킵 레이어로 정의해 P1과 역할 충돌 없이 150ms 예산에 여유를 더함(§2.2-5). |
| 3 | 기존 요소 보존 | `docs/design/contract.md`는 다른 epic 절을 변경하지 않는 additive 정책 대상이며, 본 문서는 그 소유·상태를 재정의하지 않고 그대로 서술함(§4.1). |
| 4 | 컴포넌트 매핑 | 11개 DOM ID·5개 CSS class·4개 상태·4개 token을 각각 §4.2~§4.5에 1:1 매핑, 접근성 5개·반응형 1개를 §4.6~§4.7에 그대로 반영. |
| 5 | 모호함 flag | 디바운스 정확 값(100ms)·초기 `idle` 처리·캐시 상한 값은 frozen 계약에 명시되지 않아 본 문서가 내린 설계 결정임을 §2.1-3, §2.2-4에 명시. developer는 100ms를 초과 조정할 경우 P2(150ms) 위반 여부를 재검증해야 한다. |
