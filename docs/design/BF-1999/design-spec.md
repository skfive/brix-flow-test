# 단위 변환기 UI 디자인 명세 (BF-2000)

> 이 문서는 planner가 동결한 `ui-contract@v1` (`docs/plans/BF-1999/implementation-plan.md`)을 그대로 시각화한 산출물입니다. DOM id/class, 디자인 토큰, 상태 모델, 접근성, 반응형 규칙을 재정의하지 않습니다.

## 1. 시안 개요

- **변경 범위**: 길이(length) / 무게(weight) / 온도(temperature) 3개 카테고리를 탭으로 전환하며 값을 입력하면 즉시 변환 결과를 보여주는 단일 화면 컨버터 UI.
- **사용자 경험 목표**:
  - 카테고리 선택 → 값 입력 → 결과 확인까지 3단계 이내로 완결.
  - `swap-direction` 버튼으로 변환 방향(예: m→ft ↔ ft→m)을 즉시 뒤집을 수 있다.
  - 숫자가 아닌 입력은 `error-message`로 명확히 알리고, 카테고리 전환/스왑/오류 이후에도 입력창과 컨트롤은 즉시 재사용 가능한 상태로 되돌아간다(`idle | valid | error | reset` 상태 모델).
  - 색상만으로 상태를 구분하지 않고 텍스트 레이블을 항상 함께 노출한다.

## 2. 컬러 팔레트 (frozen 토큰 — 재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#ffffff` | 페이지/카드 배경 |
| `--color-text` | `#1f2933` | 기본 텍스트 |
| `--color-primary` | `#2563eb` | 활성 탭, 주요 버튼(swap), 포커스 강조 |
| `--color-error` | `#dc2626` | 오류 텍스트, 오류 상태 보더 |
| `--space-control-gap` | `12px` | 컨트롤 간 기본 간격 |

파생 색상(토큰 미정의 보조값, 시각 대비용으로만 사용 — 신규 디자인 토큰 아님):
- 비활성 탭 텍스트: `--color-text` 60% 투명도 (`rgba(31,41,51,0.6)`)
- 카드 보더/구분선: `--color-text` 12% 투명도 (`rgba(31,41,51,0.12)`)

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (타이틀) | `--font-family-base` (`system-ui, -apple-system, 'Segoe UI', sans-serif`) | 20px | 600 | 1.3 |
| body (탭/라벨/입력) | `--font-family-base` | 16px | 400 | 1.5 |
| output (변환 결과) | `--font-family-base` | 24px | 600 | 1.3 |
| caption (오류 텍스트) | `--font-family-base` | 13px | 500 | 1.4 |

시스템 폰트 스택만 사용하며 외부 웹폰트를 로드하지 않는다(vanilla-static 규약).

## 4. 레이아웃

### 4.1 섹션 구조

```
#unit-converter-root (카드, max-width 480px, 중앙 정렬)
├─ h1 (타이틀, "단위 변환기")
├─ #category-tabs (role="tablist")
│   ├─ .tab#tab-length      (role="tab", aria-selected)
│   ├─ .tab#tab-weight      (role="tab", aria-selected)
│   └─ .tab#tab-temperature (role="tab", aria-selected)
├─ 컨트롤 영역
│   ├─ #input-value (.converter-input)
│   ├─ #swap-direction (.swap-button, aria-label="단위 방향 전환")
│   └─ #output-value (.converter-output)
└─ #error-message (.error-text, aria-live="polite")
```

### 4.2 spacing

- 카드 내부 padding: `24px`
- 섹션 간 세로 간격: `20px`
- 컨트롤(입력/스왑/출력) 사이 간격: `--space-control-gap` (`12px`)
- 탭 사이 간격: `8px`

### 4.3 반응형 (frozen 규칙)

- **320px 이상**: `input-value`/`output-value`가 줄바꿈 없이 표시되거나, 가로 폭이 부족하면 세로 stack 레이아웃으로 전환되어 overflow가 발생하지 않는다.
- **≥480px**: 입력 → 스왑 버튼 → 출력이 한 행에 가로로 배치 (`display: flex; flex-wrap: wrap;`).
- **<480px**: 컨트롤 영역이 세로 stack으로 전환 (`flex-direction: column`), 스왑 버튼은 가운데 정렬.
- 탭 목록(`#category-tabs`)은 좁은 화면에서 `flex-wrap: wrap`으로 줄바꿈 허용(탭 자체 텍스트는 줄바꿈되지 않음).

## 5. 컴포넌트 명세

### 5.1 카테고리 탭 (`#category-tabs` > `.tab`)

- **props/속성**: `role="tab"`, `aria-selected="true|false"`, `id`는 `tab-length` / `tab-weight` / `tab-temperature` 고정.
- **상태**:
  - 기본: `--color-text` 60% 톤, 배경 투명, 하단 보더 없음.
  - `.tab--active` (활성): 텍스트 `--color-primary`, 하단 `2px solid --color-primary`, `aria-selected="true"`.
- **인터랙션**: 클릭 시 해당 탭만 `.tab--active` + `aria-selected="true"`, 나머지는 해제. 카테고리 전환은 `reset` 상태를 경유해 입력값 유지 시 즉시 재계산(`valid`), 없으면 `idle`로 전이.
- **접근성**: 컨테이너 `#category-tabs`는 `role="tablist"`.

### 5.2 입력 (`#input-value`, class `converter-input`)

- **props**: `type="text"` 또는 `inputmode="decimal"`, `placeholder="값을 입력하세요"`.
- **상태**: 기본(보더 `rgba(31,41,51,0.12)`) / 포커스(보더 `--color-primary`) / 오류(보더 `--color-error`, `aria-invalid="true"`).
- **인터랙션**: 입력마다 숫자 파싱 시도 → 성공 시 `valid`(출력 갱신), 실패 시 `error`(오류 문구 노출), 빈 값이면 `idle`.

### 5.3 스왑 버튼 (`#swap-direction`, class `swap-button`)

- **props**: `aria-label="단위 방향 전환"` (frozen, 텍스트 라벨 대신 아이콘만 쓰더라도 스크린리더 이름 보장).
- **상태**: 기본(원형 아이콘 버튼, `--color-primary` 텍스트/보더) / hover(배경 `--color-primary` 10% 톤) / active(살짝 축소 `transform: scale(0.95)`).
- **인터랙션**: 클릭 시 `direction`(forward↔reverse) 토글, `reset` 경유 후 입력값 유지 시 재계산.

### 5.4 출력 (`#output-value`, class `converter-output`)

- **props**: `aria-readonly="true"` (텍스트 표시 영역), 값 없을 때(idle/error) 비움.
- **상태**: `valid`일 때만 텍스트 표시. `idle`/`error`일 때는 빈 문자열 + 플레이스홀더성 안내(`"결과가 여기에 표시됩니다"`)는 실제 값이 아닌 시각 힌트로만 `::placeholder` 유사 스타일(연한 회색)로 표시.

### 5.5 오류 메시지 (`#error-message`, class `error-text`)

- **props**: `aria-live="polite"`.
- **상태**: 기본 비움(`display: none` 또는 빈 텍스트) / `error` 상태 진입 시 `"숫자를 입력해주세요"` 등 문구 노출, 색상 `--color-error`.
- **불변식**: 카테고리 전환/스왑/오류 이후에도 즉시 `idle` 또는 `valid`로 정확히 복귀하며 `input-value`, 탭, 스왑 버튼은 계속 조작 가능해야 한다.

## 6. dev 구현 가이드

1. `unit-converter/style.css`에서 `:root`에 frozen 토큰 6개(`--color-bg`, `--color-text`, `--color-primary`, `--color-error`, `--font-family-base`, `--space-control-gap`)를 그대로 선언한다. 새 토큰을 추가하지 않는다.
2. DOM id/class는 §4.1 트리 구조와 3.1(implementation-plan.md) 표를 정확히 따른다: `unit-converter-root`, `category-tabs`, `tab`/`tab--active`, `tab-length`/`tab-weight`/`tab-temperature`, `input-value`/`converter-input`, `output-value`/`converter-output`, `swap-direction`/`swap-button`, `error-message`/`error-text`.
3. 상태 전이(`idle|valid|error|reset`)는 `convert.js`의 `convert(category, direction, value)` 순수 함수 결과를 그대로 표시 레이어에 반영한다. 반올림/포맷 규칙은 convert() 내부에서만 처리하고 UI 레이어는 결과 문자열을 그대로 출력한다.
4. 접근성 속성(§5)을 마크업 작성 시 함께 추가한다: `role="tablist"`, `role="tab"` + `aria-selected`, `aria-label="단위 방향 전환"`, `aria-live="polite"`.
5. 반응형은 CSS `flex` + `flex-wrap`/`flex-direction` 전환만으로 구현하고 320px 미만 별도 breakpoint를 추가하지 않는다(§4.3).
6. 외부 라이브러리/폰트/아이콘 CDN 의존성을 추가하지 않는다(vanilla-static, 의존성 0건).

## 7. mockup 참조

시각 mockup: [`docs/design/BF-1999/mockup.html`](./mockup.html) — 브라우저에서 단독으로 열어 3개 카테고리 탭 전환, 입력, 스왑, 오류 텍스트 상태를 정적으로 확인할 수 있다.
