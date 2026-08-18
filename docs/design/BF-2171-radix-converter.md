# 진법 변환기 UI 명세 (BF-2171 / design: BF-2172)

> 본 문서는 `docs/plans/BF-2171/implementation-plan.md` §8의 **frozen `ui-contract@v1`** 을 재정의하지 않고 그대로 시각·구현 명세로 구체화한 것입니다. DOM id, CSS class, 디자인 토큰, 상태값, 접근성, 반응형 규칙은 planner가 동결한 값과 정확히 일치합니다.

## 1. 시안 개요

- **변경 범위**: 서버/네트워크 호출이 없는 클라이언트 전용 정적 진법(2/8/10/16) 변환기 UI. 사용자가 입력 진법을 라디오로 선택하고 숫자를 입력하면, 4개 진법 결과가 동시에 표시된다.
- **사용자 경험 목표**:
  - 사용자가 어떤 진법으로 입력하든, 나머지 3개 진법을 포함한 4개 진법 결과 전부를 한 화면에서 동시에 확인할 수 있게 한다(변환 방향을 따로 지정할 필요가 없다는 느낌).
  - 입력한 진법 자신의 결과 카드는 "원본 입력"으로, 나머지 3개는 "변환 결과"로 시각적으로 구분해 사용자가 무엇이 입력이고 무엇이 계산된 값인지 즉시 인지하게 한다(§5.3 참고 — DOM/개수는 4개 전부 그대로 유지).
  - 오류(빈 값/공백/소수점/부호 오류/허용 문자 오류/범위 초과) 발생 시 `#radix-error`(`role="alert"`)로 어떤 규칙을 위반했는지 즉시 인지하게 한다.
  - 상태(`idle`/`invalid-input`/`converted`/`copied`)는 색상만으로 구분하지 않고 텍스트로도 노출해 색각 이상 사용자도 상태를 알 수 있다.
  - 복사 버튼 클릭 시 어떤 결과가 복사됐는지 시각 피드백(`radix-converter__copy-feedback`)을 즉시 준다.

## 2. 컬러 팔레트

프로젝트 stack은 `vanilla-static` — 외부 의존성 0, CSS 변수는 frozen 토큰(implementation-plan.md §8)을 그대로 사용한다. 아래 값은 planner blueprint에서 동결된 값이며 재정의하지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#f8fafc` | 페이지 배경 |
| `--color-surface` | `#ffffff` | 카드/입력/컨테이너 배경 |
| `--color-text-primary` | `#0f172a` | 본문/제목 텍스트 |
| `--color-text-muted` | `#64748b` | 보조 라벨(진법 이름, 캡션) |
| `--color-border` | `#cbd5e1` | 카드/입력/라디오 테두리 |
| `--color-action-primary` | `#2563eb` | 선택된 라디오, 포커스 링, 복사 버튼, 원본 입력 카드 강조 |
| `--color-error` | `#dc2626` | `radix-converter__error` 텍스트/테두리 |
| `--color-success` | `#16a34a` | `radix-converter__copy-feedback` 텍스트(복사 완료) |
| `--space-control-gap` | `12px` | 컨트롤 간 여백 |
| `--radius-control` | `8px` | 입력/카드/버튼 모서리 반경 |

- 배경 `#f8fafc` 위 텍스트 `#0f172a` 대비 ≈ 17.8:1, 카드 배경 `#ffffff` 위 동일 텍스트 대비 ≈ 18.7:1 → WCAG AAA 수준.
- `--color-action-primary`(`#2563eb`)와 흰 배경 대비 ≈ 5.1:1, `--color-error`(`#dc2626`)와 흰 배경 대비 ≈ 5.9:1, `--color-success`(`#16a34a`)와 흰 배경 대비 ≈ 3.4:1(텍스트는 14px 이상 semi-bold로 사용해 AA large-text 기준 충족) → 모두 텍스트/아이콘 용도로 AA 통과.
- 다크모드는 frozen 계약에 별도 정의가 없으므로 추가하지 않는다(라이트 단일 팔레트).

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다(외부 폰트 요청 금지).

```
font-family: var(--font-family-base);
/* -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif */
```

| 용도 | size | weight | line-height |
|---|---|---|---|
| heading (`h1`, 앱 타이틀) | 1.375rem (22px) | 700 | 1.3 |
| body / label (라디오 라벨, 결과 값) | 0.9375rem (15px) | 600 | 1.4 |
| input value (`radix-converter__input`) | 1.0625rem (17px) | 400 | 1.4 |
| caption (진법 명, 카드 보조 라벨) | 0.8125rem (13px) | 500 | 1.4 |
| error / feedback (`radix-converter__error`, `radix-converter__copy-feedback`) | 0.8125rem (13px) | 600 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조

```
#radix-root.radix-converter
├─ h1 (타이틀: "진법 변환기")
├─ input#radix-input.radix-converter__input (aria-label="변환할 숫자 입력")
├─ div (role="radiogroup" aria-label="입력 진법 선택")
│   ├─ label > input#radix-base-2.radix-converter__base-option  (value="2",  기본 미선택)
│   ├─ label > input#radix-base-8.radix-converter__base-option  (value="8",  기본 미선택)
│   ├─ label > input#radix-base-10.radix-converter__base-option (value="10", 기본 선택 — 가장 친숙한 진법)
│   └─ label > input#radix-base-16.radix-converter__base-option (value="16", 기본 미선택)
├─ p#radix-error.radix-converter__error (role="alert")
└─ div.radix-converter__result (idle/invalid-input일 때 radix-converter__result--hidden)
    ├─ div (결과 카드: 2진수)  → span#radix-result-2  + button#radix-copy-2.radix-converter__copy-btn
    ├─ div (결과 카드: 8진수)  → span#radix-result-8  + button#radix-copy-8.radix-converter__copy-btn
    ├─ div (결과 카드: 10진수) → span#radix-result-10 + button#radix-copy-10.radix-converter__copy-btn
    └─ div (결과 카드: 16진수) → span#radix-result-16 + button#radix-copy-16.radix-converter__copy-btn
```

- 결과 카드는 **항상 4개 모두 렌더링**된다(frozen DOM id `radix-result-2/8/10/16`이 전부 존재해야 하므로 개수를 줄이지 않는다). 사용자가 선택한 입력 진법과 일치하는 카드에는 `radix-converter__result-card--source` 보조 클래스(비-frozen, 시각 구분 전용)와 "입력한 진법" 캡션을 붙여 나머지 3개(변환된 진법)와 구분한다. §9 AC 매핑표의 AC-1 참고.
- `#radix-error`는 DOM에 항상 존재하고, `invalid-input` 상태에서만 `radix-converter__error--visible`이 붙어 시각적으로 노출된다(§5.4).

### 4.2 Spacing

- 모든 형제 컨트롤(입력-라디오그룹 간, 라디오 옵션 간, 결과 카드 간) 기준 간격은 `--space-control-gap`(12px) 사용.
- 컨테이너(`#radix-root`) 내부 padding: 20px. 바깥 여백: 최소 16px, 최대 폭 480px, 중앙 정렬.
- 결과 카드 내부 padding: 12px(`--space-control-gap`과 동일값 고정 사용).

### 4.3 Breakpoint 별 동작

| Breakpoint | 동작 |
|---|---|
| 320px ~ 480px | `radix-converter__result`는 세로 1열 스택(4개 카드가 위→아래로 쌓임). 가로 스크롤 없음. |
| 480px 초과 | `radix-converter__result`는 가로 배치(`display:grid; grid-template-columns: repeat(4, 1fr)`; gap `--space-control-gap`). 컨테이너 최대 폭 480px 안에서 4열이 들어가지 않을 만큼 좁아지면(예: 폰트 확대 등) `repeat(auto-fit, minmax(96px, 1fr))`로 자연스럽게 줄바꿈하되 320px 이상에서는 가로 스크롤이 생기지 않아야 한다. |

- 320px 미만 대응은 frozen 계약 범위 밖(비목표) — 320px를 최소 지원 폭으로 간주한다.

## 5. 컴포넌트 명세

### 5.1 App Root (`#radix-root.radix-converter`)

- **역할**: 전체 앱 컨테이너.
- **DOM**: `<div id="radix-root" class="radix-converter">`.
- **상태 텍스트 노출**: 상태(`idle`/`invalid-input`/`converted`/`copied`)는 별도 `aria-live="polite"` 텍스트 영역(예: `<p class="radix-converter__state-live">현재 상태: <span>정상</span></p>`)으로 화면과 스크린리더 양쪽에 노출한다(색상만으로 상태 구분 금지 — planner 접근성 규칙). 이 텍스트 영역은 frozen id/class 목록 밖의 보조 요소이므로 자유 명명 가능.

### 5.2 Input (`#radix-input.radix-converter__input`)

- **역할**: 변환할 숫자 원본 입력.
- **DOM**: `<input type="text" id="radix-input" class="radix-converter__input" inputmode="text" autocomplete="off" aria-label="변환할 숫자 입력">`.
- **props/상태**:
  - `value`: 사용자가 입력한 원문 그대로 유지(정규화하지 않음 — 정규화된 값은 결과 카드에만 표시).
  - `disabled`: 항상 `false` — 오류 이후에도 항상 재사용 가능(frozen invariant).
  - `invalid-input` 상태일 때 테두리 `--color-error` 2px, `aria-invalid="true"`, `aria-describedby="radix-error"`.
- **인터랙션**: `input` 이벤트마다 §4장(계획 문서) 오류 규칙을 순서대로 검사해 실시간 재평가. `:focus-visible` 시 `--color-action-primary` 2px outline.

### 5.3 진법 선택 라디오 그룹 (`radix-base-2/8/10/16.radix-converter__base-option`)

- **역할**: 입력 문자열을 해석할 기준 진법 선택.
- **DOM**: `<div role="radiogroup" aria-label="입력 진법 선택">` 안에 4개의 `<label><input type="radio" name="radix-base" id="radix-base-{2|8|10|16}" class="radix-converter__base-option" value="{2|8|10|16}"> {N}진수</label>`.
- **상태**:
  - 선택된 옵션: `checked`, 라벨에 `--color-action-primary` 텍스트 + 배경 강조(필 배경, `rgba(37,99,235,0.08)`).
  - 비선택 옵션: 기본 텍스트 색상(`--color-text-primary`).
  - 기본값: `radix-base-10`이 선택된 상태로 최초 렌더(가장 친숙한 진법을 기본값으로 사용 — §9 모호함 flag 참고).
- **인터랙션**: 변경 시 현재 `#radix-input` 값을 새 진법 기준으로 즉시 재평가(입력값 유지, 초기화하지 않음). Tab으로 그룹에 진입 후 방향키로 옵션 간 이동, Enter/Space로 선택(네이티브 radio 동작).

### 5.4 오류 영역 (`#radix-error.radix-converter__error`)

- **역할**: 현재 입력 오류 사유를 즉시 공지.
- **DOM**: `<p id="radix-error" class="radix-converter__error" role="alert"></p>` — `idle`/`converted`/`copied`일 때는 `radix-converter__error--visible` 클래스 제거 + 텍스트 비움. `invalid-input`일 때만 클래스 추가 + implementation-plan.md §4 오류 메시지 텍스트로 채움.
- **색상**: `--color-error`, 좌측 4px 보더 강조(선택 사항, 시각 강조용).
- **텍스트**: 6가지 오류 메시지는 계획 문서 §4 표를 그대로 사용한다(재정의 금지) — "값을 입력해 주세요." / "공백은 사용할 수 없습니다." / "정수만 입력할 수 있습니다." / "숫자 형식이 올바르지 않습니다." / "{진법}진수에서 허용되지 않는 문자가 포함되어 있습니다." / "표현 가능한 범위를 초과했습니다."

### 5.5 결과 영역 (`.radix-converter__result` / `.radix-converter__result--hidden`)

- **역할**: 4개 진법 결과를 동시에 표시하는 카드 그룹 컨테이너.
- **DOM**: `<div class="radix-converter__result">` 안에 카드 4개. `idle`/`invalid-input` 상태에서는 `radix-converter__result--hidden` 클래스가 추가되어 시각적으로 숨김(`display:none`) + 접근성 트리 제외.
- **카드 내부 구조** (예: 2진수):
  ```html
  <div class="radix-converter__result-card">
    <span class="radix-converter__result-caption">2진수</span>
    <span id="radix-result-2" class="radix-converter__result">1010</span>
    <button type="button" id="radix-copy-2" class="radix-converter__copy-btn" aria-label="2진수 결과 복사">복사</button>
    <span class="radix-converter__copy-feedback" aria-hidden="true">복사됨</span>
  </div>
  ```
  - 주의: frozen 클래스 `radix-converter__result`는 "결과 값 표시 요소"(`#radix-result-2/8/10/16`)에 직접 붙는 클래스다(개별 span). 카드 바깥 컨테이너(`.radix-converter__result-card` 등)는 frozen 목록 밖 보조 클래스로 자유 명명하되, 개별 결과 `<span>`에는 반드시 `radix-converter__result` 클래스를 유지한다.

### 5.6 복사 버튼 / 피드백 (`radix-copy-*.radix-converter__copy-btn` / `.radix-converter__copy-feedback`)

- **역할**: 개별 진법 결과를 클립보드에 복사, 복사 완료를 시각 공지.
- **상태**:
  - 기본: `--color-action-primary` 텍스트, `--color-border` 테두리.
  - `copied`(해당 버튼 클릭 직후): 버튼 인근 `.radix-converter__copy-feedback`이 노출("복사됨", `--color-success`), 1500ms 후 자동으로 사라지며 `converted`로 복귀. 입력값이 바뀌면 즉시 재평가되어 `converted`/`invalid-input`으로 전환.
- **인터랙션**: 클릭 또는 Enter/Space(버튼 네이티브 동작)로 해당 결과 텍스트를 클립보드에 복사. `:focus-visible` 시 `--color-action-primary` 2px outline.
- **접근성**: `aria-label`은 대상 진법을 명시(`aria-label="2진수 결과 복사"` 등 4종).

## 6. dev 구현 가이드

1. **CSS 변수 선언**: `:root`에 §2 표의 10개 토큰(`--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-muted`, `--color-border`, `--color-action-primary`, `--color-error`, `--color-success`, `--space-control-gap`, `--radius-control`)과 `--font-family-base`를 implementation-plan.md §8 값 그대로 선언한다.
2. **DOM id**: `radix-root`, `radix-input`, `radix-base-2`, `radix-base-8`, `radix-base-10`, `radix-base-16`, `radix-error`, `radix-result-2`, `radix-result-8`, `radix-result-10`, `radix-result-16`, `radix-copy-2`, `radix-copy-8`, `radix-copy-10`, `radix-copy-16` 15개를 정확히 그대로 사용한다.
3. **CSS 클래스**: `radix-converter`, `radix-converter__input`, `radix-converter__base-option`, `radix-converter__error`, `radix-converter__error--visible`, `radix-converter__result`, `radix-converter__result--hidden`, `radix-converter__copy-btn`, `radix-converter__copy-feedback` 9개를 정확히 그대로 사용한다. 카드 wrapper, 캡션, 상태 텍스트 등 보조 요소는 새 클래스를 추가할 수 있으나 위 9개를 대체/재정의하지 않는다.
4. **상태 전이 로직**:
   - `idle` → `radix-input` 값이 빈 문자열일 때 최초 렌더 상태. `radix-error` 텍스트 비움 + `--error--visible` 제거, `radix-converter__result`에 `--result--hidden` 추가.
   - `invalid-input` → 계획 문서 §4 검사 순서(1~6번)대로 첫 위반 규칙의 메시지를 `radix-error`에 채우고 `--error--visible` 추가. 결과 영역은 `--result--hidden` 유지.
   - `converted` → 파싱 성공 시 `parseInBase`/`formatInBase`(계획 문서 §5) 결과로 4개 `radix-result-*`를 채우고 `--result--hidden` 제거, `radix-error`는 비움 + `--error--visible` 제거.
   - `copied` → `converted` 상태에서 `radix-copy-*` 클릭 시 해당 카드의 `.radix-converter__copy-feedback`을 노출하고 1500ms 타이머로 자동 복귀. 입력/진법 변경 시 타이머를 취소하고 즉시 `converted`/`invalid-input`으로 재평가.
5. **입력 진법 변경 시**: `#radix-input`의 현재 값(빈 값이면 `idle` 유지)을 그대로 유지한 채 새로 선택된 진법 기준으로 §4 검사를 재실행한다(입력값을 초기화하지 않는다 — frozen invariant: 실패 후에도 주 실행 control 재사용 가능).
6. **접근성 배선**: 라디오 그룹에 `role="radiogroup"` + `aria-label="입력 진법 선택"`, `radix-input`에 `aria-label="변환할 숫자 입력"`(+ 오류 시 `aria-invalid`/`aria-describedby` 권장), `radix-error`에 `role="alert"`(§5.4), 각 `radix-copy-*`에 대상 진법 명시 `aria-label`.
7. **반응형 CSS**: 기본(모바일) 스타일을 320px 기준 1열 스택으로 작성 후 `@media (min-width: 481px)`에서 `.radix-converter__result`에 `display:grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-control-gap);` 적용(§4.3).
8. **금지 사항**: frozen 계약에 없는 새 DOM id/class/토큰/상태를 추가하지 않는다. `radix-input`/라디오/복사 버튼을 `disabled` 처리하지 않는다. 결과 카드 개수를 4개 미만으로 줄이지 않는다(§9 AC 매핑표 AC-1 참고 — 선택 진법의 카드도 항상 렌더링하되 시각적으로만 "원본" 표시로 구분).

## 7. 접근성 (요약 — planner frozen 규칙 그대로)

- `#radix-input`은 `aria-label="변환할 숫자 입력"`을 갖는다.
- 진법 선택 라디오 그룹은 `role="radiogroup"` `aria-label="입력 진법 선택"`으로 노출된다.
- `#radix-error`는 `role="alert"`로 오류 발생 시 스크린리더에 즉시 announce된다.
- 각 복사 버튼은 대상 진법을 명시하는 `aria-label`(예: `aria-label="2진수 결과 복사"`)을 갖는다.
- input·radio·copy 버튼 모두 Tab만으로 포커스 이동하고 Enter/Space로 조작 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다(§5.1 상태 텍스트 영역).

## 8. 반응형 (요약 — planner frozen 규칙 그대로)

- 320px 이상: 가로 스크롤 없음.
- 480px 이하: 결과 카드 세로 1열 스택.
- 480px 초과: 결과 카드 가로 배치.

## 9. AC 매핑표 (요구사항 ↔ UI 요소)

| AC | 요구사항 요약 | 대응 UI 요소 |
|---|---|---|
| AC-1 | 2진수 입력 `1010` → 4개 진법 동시 변환 | `#radix-input`(값 `1010`) + `#radix-base-2`(checked) → `converted` 상태 → `#radix-result-2="1010"`(원본 강조 카드), `#radix-result-8="12"`, `#radix-result-10="10"`, `#radix-result-16="A"` |
| AC-2 | 16진수 소문자 입력 정규화 | `#radix-base-16` 선택 + `#radix-input="2f"` → `#radix-result-16="2F"`(모든 16진수 결과 대문자 정규화) |
| AC-3 | 음수 입력 변환 | `#radix-input="-101"` + `#radix-base-2` → `#radix-result-10="-5"` 등 4개 결과 모두 `-` 접두 |
| AC-4 | 빈 값 오류 | `#radix-input` 빈 값 → `invalid-input` → `#radix-error`="값을 입력해 주세요."(`role="alert"`), `.radix-converter__result--hidden` 유지 |
| AC-5 | 공백 포함 오류 | `#radix-input="10 10"` → `#radix-error`="공백은 사용할 수 없습니다." |
| AC-6 | 소수점 포함 오류 | `#radix-input="1.5"` → `#radix-error`="정수만 입력할 수 있습니다." |
| AC-7 | 허용되지 않는 문자 오류 | `#radix-base-2` + `#radix-input="2"` → `#radix-error`="2진수에서 허용되지 않는 문자가 포함되어 있습니다." |
| AC-8 | 복사 버튼 클릭 → `copied` 상태 | `#radix-copy-16` 클릭 → `.radix-converter__copy-feedback` 노출(해당 카드) → 1500ms 후 `converted` 복귀 |
| AC-9 | 오류 이후 재시도 | `invalid-input`에서 유효값 재입력 → `#radix-input`/라디오/복사 버튼 모두 재사용 가능(`disabled` 없음) → 즉시 `converted` 전환 |
| AC-10 | 접근성 | `#radix-error[role="alert"]`, `radix-copy-*[aria-label]` 4종 |
| AC-11 | 반응형 | `.radix-converter__result` 480px 이하 1열 / 초과 가로 배치, 320px 이상 가로 스크롤 없음 |

## 10. mockup 참조

- 시각 mockup: [`docs/design/BF-2171-radix-converter-mockup.html`](./BF-2171-radix-converter-mockup.html)
- mockup은 `idle`/`invalid-input`/`converted`/`copied` 4개 상태와 4개 결과 카드(원본 강조 포함), 반응형 1열/가로 배치를 정적으로 시각화한다(placeholder 계산값 포함, 실제 `parseInBase`/`formatInBase` 로직 없음). 상태 전환은 mockup 전용 데모 버튼으로만 시연하며, 실제 앱 코드가 아니고 dev의 픽셀 단위 구현 의무는 없다.

## 11. Self-critique (PR commit 직전 점검)

1. **AC 매핑** — §9에서 AC-1~AC-11 전부 UI 요소로 매핑 완료.
2. **dev 구현 가이드** — §6에 상태 전이 로직·id/class 목록·반응형 breakpoint·금지 사항을 단계별로 명시.
3. **기존 요소 보존** — 본 topic은 신규 module(`radix-converter`)이며 기존 산출물을 대체하지 않음(additive). 기존 계획 문서(§8 UI 계약)의 DOM id/class/토큰/상태/접근성/반응형 규칙을 값 그대로 옮겼으며 재정의하지 않음.
4. **컴포넌트 매핑** — §5에서 App Root / Input / 라디오 그룹 / 오류 영역 / 결과 영역 / 복사 버튼 6개 컴포넌트 각각의 DOM·상태·인터랙션·접근성을 명시.
5. **모호함 flag** — 아래 2건은 계획 문서에 명시되지 않아 designer가 판단해 보완한 사항:
   - **결과 카드 "선택 진법 제외" 표현**: 상위 work packet의 acceptance_criteria에는 "4개 진법 결과 카드(선택 진법 제외 3개 노출)"라는 문구가 있으나, frozen `ui-contract@v1`(계획 문서 §8, AC-1)은 `radix-result-2/8/10/16` 4개 DOM id 전부가 항상 채워져 표시되는 것으로 명시한다(AC-1 예시: 입력 진법 `2`로 `1010` 입력 시 `radix-result-2="1010"` 포함 4개 모두 표시). DOM id 목록(frozen)이 더 구체적이고 우선하는 계약이라 판단해, **4개 카드 모두 렌더링하되 선택된 진법의 카드만 "원본 입력" 캡션 + 강조 스타일로 시각 구분**하는 절충안으로 시안을 작성했다(§4.1, §5.5). dev/reviewer는 이 해석이 의도와 다르면 PR 코멘트로 정정 요청 바란다.
   - **입력 진법 기본 선택값**: 계획 문서에 기본 선택 진법이 명시되지 않아, 가장 친숙한 `10진수`(`radix-base-10`)를 기본 `checked`로 지정했다(§5.3). frozen 계약 위반은 아니나(4개 옵션 모두 존재, 어떤 것이 기본인지는 non-frozen 영역) dev가 다른 기본값을 원하면 조정 가능.
