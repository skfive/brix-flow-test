# BF-2166 · 단위 변환기 UI 시안

> 이 문서는 planner가 동결한 `docs/plans/BF-2165/implementation-plan.md` §8 UI 계약을 그대로 시각화한 designer 산출물이다.
> frozen domIds / cssClasses / states / token / 접근성 / 반응형 계약은 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: 길이(length) / 무게(weight) / 온도(temperature) 3개 카테고리를 탭으로 전환하며, 값을 입력하고 출발·도착 단위를 선택하면 변환 결과를 즉시 확인하는 단일 화면 도구.
- **사용자 경험 목표**:
  - 카테고리 전환 → 단위 선택 → 값 입력까지 3단계 이하로 결과 확인.
  - swap 버튼으로 출발/도착 단위를 한 번에 교환.
  - 오류(빈 값 / 비숫자 / 절대영도 미만)를 색상 + 텍스트 문구로 동시에 인지 가능.
  - 오류 상태에서 유효한 값으로 수정하면 별도 초기화 없이 바로 정상 결과로 복귀.

## 2. 컬러 팔레트

frozen 디자인 토큰(§8)을 그대로 사용한다. 신규 색상 추가 없음.

| 역할 | 변수 | HEX |
|---|---|---|
| 배경(page background) | `--color-bg` | `#f8fafc` |
| 표면(카드/폼 배경) | `--color-surface` | `#ffffff` |
| 주요 강조(활성 탭, 버튼, 포커스) | `--color-primary` | `#2563eb` |
| 본문 텍스트 | `--color-text` | `#1e293b` |
| 오류(에러 텍스트/테두리) | `--color-error` | `#dc2626` |

- primary/secondary/accent를 별도로 나누지 않고 frozen 토큰의 `--color-primary` 하나를 강조색으로 통일 사용한다(신규 accent 색상 추가는 계약 위반이므로 도입하지 않음).
- surface 위에 배치되는 오류 텍스트/아이콘은 `--color-error`, 정상 결과 텍스트는 `--color-text`를 사용한다.

## 3. 타이포그래피

폰트는 frozen `--font-family: system-ui, -apple-system, sans-serif` 하나만 사용(외부 폰트 CDN 금지 — vanilla-static 정책).

| 용도 | size | weight | line-height |
|---|---|---|---|
| heading (`#converter-app` 타이틀) | 20px | 700 | 1.3 |
| tab 라벨 | 15px | 600 | 1.4 |
| body (label, select, input) | 15px | 400 | 1.5 |
| result (`#result-output` 정상 값) | 28px | 700 | 1.2 |
| error (`#error-message`) | 14px | 600 | 1.5 |
| caption (단위 코드 보조 텍스트) | 12px | 400 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조

```
#converter-app (.converter-app)
├─ h1 "단위 변환기"
├─ #category-tabs (role="tablist")
│   ├─ button.tab[role=tab][data-category=length]  "길이"
│   ├─ button.tab[role=tab][data-category=weight]  "무게"
│   └─ button.tab[role=tab][data-category=temperature] "온도"
├─ form.converter-form
│   ├─ label + #value-input (input[type=text][inputmode=decimal])
│   ├─ .unit-row
│   │   ├─ label + #from-unit-select (select.unit-select)
│   │   ├─ #swap-button (button.swap-btn, aria-label="단위 교환")
│   │   └─ label + #to-unit-select (select.unit-select)
├─ .result-area
│   ├─ #result-output (.result 또는 .result.result--error)
│   └─ #error-message (role="alert")
```

### 4.2 spacing

- 카드 내부 padding: `24px`
- 컨트롤 간 간격: frozen `--space-control-gap: 12px`을 폼 필드·탭·unit-row 요소 간 gap으로 일괄 적용.
- 카드(`.converter-form`, `.result-area`) 바깥 여백: `16px`

### 4.3 breakpoint 별 동작

- **360px ~ 767px (기본, 1열)**: `#converter-app`을 세로 1열 스택으로 배치. `.unit-row`는 `from-select / swap-button / to-select` 가로 flex 유지하되 좁은 화면에서 `flex-wrap`으로 줄바꿈 허용해 overflow 방지.
- **768px 이상 (2열)**: `.converter-form`(입력 영역)과 `.result-area`(결과 영역)를 `display: grid; grid-template-columns: 1fr 1fr;`로 좌우 배치. 카테고리 탭(`#category-tabs`)은 두 열 위에 전체 폭으로 유지.

## 5. 컴포넌트 명세

### 5.1 `#category-tabs` (`.tab`, `.tab--active`)
- **props/구성**: 카테고리 3개(길이/무게/온도) 고정 버튼 목록. `role="tab"`, `aria-selected` 필수.
- **상태**: 활성 탭에 `.tab--active` 클래스 추가, `aria-selected="true"`; 비활성 탭은 `aria-selected="false"`.
- **인터랙션**: 클릭 시 해당 카테고리의 단위 목록으로 `#from-unit-select`/`#to-unit-select` 옵션이 교체되고, 값 입력·결과는 `idle`로 초기화(§8 states 재사용 — 새 상태 도입 없음).

### 5.2 `.converter-form` / `#value-input`
- **props**: `type="text"`, `inputmode="decimal"`, placeholder "숫자를 입력하세요".
- **상태**: 비어 있음(`idle` 유지) / 값 있음.
- **인터랙션**: 입력 변경 시 실시간 재계산 또는 변환 실행(구현은 developer 재량이나, AC-7에 따라 오류 상태에서 유효 값 입력 시 즉시 `result-ready`로 전환되어야 함).

### 5.3 `#from-unit-select`, `#to-unit-select` (`.unit-select`)
- **props**: 현재 활성 카테고리의 단위 코드 목록(예: 길이 → `m, km, mi, ft`).
- **상태**: 기본 선택값은 카테고리별 첫 번째/두 번째 단위(예: 길이 `m` → `km`).
- **인터랙션**: 선택 변경 시 결과 재계산.

### 5.4 `#swap-button` (`.swap-btn`)
- **props**: `aria-label="단위 교환"`, 아이콘 또는 "⇄" 텍스트.
- **인터랙션**: 클릭 시 `#from-unit-select`와 `#to-unit-select`의 선택값을 교환하고 결과 재계산.

### 5.5 `#result-output` (`.result`, `.result--error`)
- **상태**:
  - `result-ready`: `.result` 클래스, `--color-text`로 6 유효숫자 반올림된 값 표시 (예: "0.621371 mi").
  - `error-invalid-input` / `error-below-absolute-zero`: `.result.result--error` 클래스, `--color-error` 강조. 값 영역은 비우거나 "—" 표시.
- 상태명은 색상만으로 구분하지 않고, 정상 결과일 때도 "결과" 라벨을 화면에 텍스트로 노출한다(§8 접근성 원칙).

### 5.6 `#error-message`
- **props**: `role="alert"`.
- **상태별 문구** (plan §5 그대로):
  - `error-invalid-input` (빈 값): "값을 입력해 주세요."
  - `error-invalid-input` (비숫자): "숫자를 입력해 주세요."
  - `error-below-absolute-zero`: "절대영도(-273.15°C) 미만은 변환할 수 없습니다."
- `result-ready` / `idle` 상태에서는 비어 있음(빈 문자열, DOM에는 유지하되 내용 없음).

## 6. 상태 → 화면 표시 매핑 (오류 텍스트 계약)

| 상태 | `#result-output` | `#error-message` | 색상 |
|---|---|---|---|
| `idle` | 빈 값 또는 placeholder "값을 입력하면 결과가 표시됩니다" | (비어 있음) | `--color-text` |
| `result-ready` | 변환값 (예: "212 °F") | (비어 있음) | `--color-text`, `.result` |
| `error-invalid-input` (빈 값) | "—" | "값을 입력해 주세요." | `--color-error`, `.result--error` |
| `error-invalid-input` (비숫자) | "—" | "숫자를 입력해 주세요." | `--color-error`, `.result--error` |
| `error-below-absolute-zero` | "—" | "절대영도(-273.15°C) 미만은 변환할 수 없습니다." | `--color-error`, `.result--error` |

오류 상태에서 사용자가 `#value-input` 값을 유효한 값으로 수정하고 변환을 재실행하면, 위 표의 `result-ready` 행으로 즉시 전환되며 `#error-message`는 다시 빈 문자열이 된다(AC-7).

## 7. dev 구현 가이드

1. **CSS 변수 선언 위치**: `unit-converter/style.css`의 `:root`에 §2 표의 5개 토큰을 그대로 선언(`--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-error`, `--space-control-gap`, `--font-family`). 신규 변수 추가 금지.
2. **DOM 골격**: 4.1 섹션 구조를 `unit-converter/index.html`에 그대로 사용. id는 정확히 `converter-app`, `category-tabs`, `value-input`, `from-unit-select`, `to-unit-select`, `swap-button`, `result-output`, `error-message`.
3. **클래스명**: 탭 버튼 `class="tab"` (+활성 시 `tab--active`), 폼 `class="converter-form"`, select `class="unit-select"`, swap 버튼 `class="swap-btn"`, 결과 `class="result"` (+오류 시 `result--error`).
4. **탭 접근성**: `#category-tabs`는 `role="tablist"`, 각 버튼은 `role="tab"` + `aria-selected`. 활성 탭 전환 시 JS로 `aria-selected` 값을 갱신.
5. **오류 알림**: `#error-message`에 `role="alert"`을 정적으로 부여(내용이 바뀔 때마다 스크린리더가 자동 공지).
6. **계산 로직**: 계수표·온도 공식·오류 우선순위·`formatResult` 반올림 규칙은 이 문서가 아니라 `docs/plans/BF-2165/implementation-plan.md` §2~§6을 그대로 따른다(designer는 계산 로직을 재정의하지 않음).
7. **반응형 구현**: `min-width: 768px` 미디어 쿼리에서 `.converter-form`과 `.result-area`를 감싸는 컨테이너에 2열 grid 적용. 360px 기준 이하 요소는 `flex-wrap`/`overflow-wrap`으로 넘침 방지.

## 8. AC 매핑 표

| AC | 관련 domId / cssClass | 시안 반영 위치 |
|---|---|---|
| AC-1 길이 변환 | `#category-tabs` (길이 탭), `#from-unit-select`, `#to-unit-select`, `#value-input`, `#result-output.result` | §5.1, §5.3, §5.5, §6 `result-ready` 행 |
| AC-2 무게 변환 | 상동 (무게 탭) | 상동 |
| AC-3 온도 변환 | 상동 (온도 탭) | 상동 |
| AC-4 빈 값 오류 | `#value-input`, `#result-output.result--error`, `#error-message[role=alert]` | §6 `error-invalid-input`(빈 값) 행 |
| AC-5 비숫자 오류 | 상동 | §6 `error-invalid-input`(비숫자) 행 |
| AC-6 절대영도 미만 오류 | `#category-tabs`(온도 탭), `#value-input`, `#result-output.result--error`, `#error-message` | §6 `error-below-absolute-zero` 행 |
| AC-7 오류 이후 재시도 | `#value-input`, `#result-output`, `#error-message` | §6 표 하단 서술 — 오류 → `result-ready` 즉시 전환, 입력/변환 control 항상 재사용 가능 |

## 9. mockup 참조

시각 mockup: [`docs/design/BF-2165/mockup.html`](./mockup.html)

mockup은 `idle` / `result-ready` / `error-invalid-input` / `error-below-absolute-zero` 4개 상태를 정적 섹션으로 나란히 배치해 시각적으로 비교할 수 있게 구성했다(실제 앱은 단일 상태만 표시하며, mockup의 다중 섹션은 상태 시뮬레이션 목적).
