# 단위 변환기 시각 명세 (BF-1934)

- Jira: BF-1934 (본 문서 작성) / 상위 Epic: BF-1933
- 작성자: 이디자인 (designer)
- 근거: `docs/plans/BF-1933/implementation-plan.md` (planner, frozen `planning-contract@v1` / `ui-contract@v1`)
- 상태: frozen 계약을 그대로 인용 — 아래 DOM id/class/token/상태/접근성/반응형 값은 재정의하지 않는다.
- mockup 참조: `docs/design/mockups/unit-converter-BF-1933.html`

> 본 문서는 planner의 frozen 계약(§2~§6, `docs/plans/BF-1933/implementation-plan.md`)을 화면 구성과 시각 명세로 구체화한다.
> DOM id, CSS class, design token, 상태 3종, 접근성 요구사항, 반응형 breakpoint는 planner 문서를 그대로 인용하며 새 값을 추가/변경하지 않는다.

## 1. 시안 개요

- 변경 범위: 신규 단위 변환기 위젯 1개 화면(`unit-converter.html`, 정적 서빙 `/unit-converter.html`). 길이/무게/온도 3종 변환을 하나의 폼에서 처리.
- 사용자 경험 목표:
  - 종류(카테고리)를 고르고 값을 입력하면 결과가 즉시(재계산 트리거마다) 갱신되어야 한다 — 별도 "변환" 버튼 없이 입력 즉시 반응하는 흐름.
  - 입력/출력 단위를 한 번의 클릭(`swap-button`)으로 맞바꿀 수 있어야 한다.
  - 오류(숫자 아님, 절대영도 미만, 음수) 발생 시 원인을 텍스트로 즉시 안내하고, 값을 고치면 별도 새로고침 없이 정상 결과로 복귀해야 한다.
  - 마우스 없이 Tab/Enter만으로 전체 흐름을 완료할 수 있어야 한다.

## 2. 컬러 팔레트

planner frozen token을 그대로 사용한다(§2.3). 재정의 금지. 그 외 배경/보더/텍스트 색상은 designer 재량으로 아래와 같이 보강한다(신규 토큰 아님 — 순수 CSS 값, 인용 표시).

| 역할 | 값 | 출처 |
|---|---|---|
| `--color-error-text` (오류 텍스트) | `#b91c1c` | frozen token (그대로 인용) |
| `--color-border-default` (필드 기본 테두리) | `#cbd5e1` | frozen token (그대로 인용) |
| background (페이지 배경) | `#f8fafc` | designer 재량 (신규 토큰 아님, 순수 값) |
| surface (`unit-converter` 카드 배경) | `#ffffff` | designer 재량 |
| text primary (본문/라벨) | `#0f172a` | designer 재량 |
| text secondary (보조 설명, 상태명 텍스트) | `#475569` | designer 재량 |
| accent (`swap-button` 배경, focus ring) | `#2563eb` | designer 재량 |
| accent hover | `#1d4ed8` | designer 재량 |
| error background (`error-message` 배경 강조) | `#fef2f2` | designer 재량, 텍스트는 frozen `--color-error-text` 사용 |

> 상태 구분은 색상만으로 하지 않는다(§4 접근성 요구). 아래 색상은 보조 신호이며, 상태명 텍스트가 항상 함께 노출된다.

## 3. 타이포그래피

시스템 폰트 스택 사용(외부 폰트 의존성 0건 — `vanilla-static` stack 규약 준수).

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`unit-converter` 타이틀, 예: "단위 변환기") | `system-ui, -apple-system, "Segoe UI", sans-serif` | 20px | 700 | 1.3 |
| body (라벨, select/input 텍스트, 결과값) | `system-ui, -apple-system, "Segoe UI", sans-serif` | 15px | 400 | 1.5 |
| body-strong (`output-value` 결과 숫자) | 동일 스택 | 18px | 600 | 1.4 |
| caption (상태명 텍스트, 단위 보조 표기) | 동일 스택 | 13px | 500 | 1.4 |
| error text (`error-message`) | 동일 스택 | 13px | 500 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조 (상단 → 하단)

1. 위젯 헤더 — 타이틀("단위 변환기") + 현재 상태명 caption (예: "상태: idle" / "상태: 결과 갱신됨" / "상태: 입력 오류")
2. 카테고리 영역 — `category-select` 1개 (길이/무게/온도)
3. 입력 필드 그룹 — `input-value` + `input-unit` (가로 배치, 600px 미만에서 세로로 쌓임)
4. 맞바꾸기 버튼 — `swap-button` (입력/출력 그룹 사이, 중앙 정렬)
5. 출력 필드 그룹 — `output-value`(읽기 전용) + `output-unit` (가로 배치, 600px 미만에서 세로로 쌓임)
6. 오류 안내 영역 — `error-message` (항상 DOM에 존재, 내용 없을 때는 빈 텍스트 + 시각적으로 숨김 처리 없이 여백만 유지하거나 `invalid-input` 상태일 때만 텍스트 노출 — 구현 재량, 단 `role="alert"`는 항상 유지)

### 4.2 spacing

- 필드 간 간격: `--space-field-gap` = `12px` (frozen token, 그대로 인용) — 카테고리/입력그룹/맞바꾸기/출력그룹/오류영역 각 블록 사이 수직 간격, 그리고 입력그룹 내부 `input-value`/`input-unit` 사이 수평 간격에 동일 적용.
- 위젯 카드 내부 padding: 24px (600px 미만: 16px)
- 위젯 카드 최대 너비: 480px, 카드 자체는 뷰포트 중앙 정렬
- 카드 바깥 페이지 여백: 최소 16px (320px 뷰포트에서 좌우 스크롤 방지)

### 4.3 breakpoint 별 동작 (frozen §6 인용)

| 뷰포트 | 동작 |
|---|---|
| 320px 이상 (frozen 최소 요구) | 좌우 스크롤 없이 `unit-converter-app` 내 모든 필드(카테고리/입력/출력/맞바꾸기) 표시. 입력그룹·출력그룹 모두 세로 배치(`input-value` 위, `input-unit` 아래 / `output-value` 위, `output-unit` 아래)로 폭 확보. |
| 320px ~ 599px | 입력 필드 그룹과 출력 필드 그룹 세로로 쌓임 (frozen 요구, §6). `swap-button`은 두 그룹 사이 가로 전체 폭으로 표시. |
| 600px 이상 | designer 재량: 입력그룹 내부(`input-value`+`input-unit`)와 출력그룹 내부(`output-value`+`output-unit`)를 가로 배치로 전환. `swap-button`은 입력그룹과 출력그룹 사이 중앙에 원형 아이콘 버튼으로 배치. 가로 배치는 필수 요구가 아니므로 미구현해도 계약 위반 아님. |

## 5. 컴포넌트 명세

모든 DOM id/class는 frozen 계약(§2.1, §2.2)을 그대로 인용한다. 아래는 각 컴포넌트의 시각/상태/인터랙션 명세다.

### 5.1 `unit-converter-app` (루트 컨테이너, class `unit-converter`)

- 카드형 컨테이너, 배경 `#ffffff`, border `1px solid var(--color-border-default)`, border-radius 12px, box-shadow 은은하게(예: `0 1px 3px rgba(15,23,42,0.08)`).
- 내부에 헤더 + 5개 섹션(§4.1)을 `--space-field-gap` 간격으로 세로 배치.

### 5.2 `category-select` (class `unit-converter__field` wrapper 내부)

- `<label for="category-select">변환 종류</label>` + `<select id="category-select">`.
- 옵션: 길이 / 무게 / 온도 (3개, 표시 텍스트는 한국어).
- 변경 시 §3(상태 모델) 트리거 1 — 항상 `idle`로 리셋: `input-value`/`error-message` 비움, `input-unit`/`output-unit`을 새 카테고리의 첫 번째/두 번째 단위로 리셋, `output-value` 비움, 헤더 상태명 caption을 "상태: idle"로 갱신.
- 시각: 기본 select 스타일, border `var(--color-border-default)`, padding 8px 12px, border-radius 6px. focus 시 accent color(`#2563eb`) outline 2px.

### 5.3 입력 필드 그룹 — `input-value` / `input-unit` (각각 class `unit-converter__field` wrapper)

- `input-value`: `<label for="input-value">값</label>` + `<input id="input-value" type="text" inputmode="decimal">`. (숫자 검증은 §5.4 edge case에 따라 텍스트 파싱 — `type="number"` 강제 아님, 음수/빈값 등 임의 문자열 입력을 허용하고 JS 레벨에서 검증하는 것을 권장)
- `input-unit`: `<label for="input-unit">입력 단위</label>` + `<select id="input-unit">`. 옵션은 현재 카테고리의 단위 목록(§5 변환 규칙 표 참조, 예: 길이 → m/km/cm/inch/feet).
- 값/단위 변경 시 §3 트리거 2 — 유효성 검사 후 `result-updated` 또는 `invalid-input`으로 전이.
- 시각: input/select 모두 border `var(--color-border-default)`, padding 8px 12px, border-radius 6px, 너비 100%(그룹 내 flex 배분). `invalid-input` 상태일 때 `input-value`의 border만 `--color-error-text`로 강조(색상은 보조 신호, 상태명 텍스트가 주 신호).

### 5.4 출력 필드 그룹 — `output-value` / `output-unit` (각각 class `unit-converter__field` wrapper)

- `output-value`: `<label for="output-value">결과</label>` + `<input id="output-value" type="text" readonly>`. 읽기 전용이지만 스크린리더 접근을 위해 `<label for>` 연결 유지(frozen §4 요구).
- `output-unit`: `<label for="output-unit">출력 단위</label>` + `<select id="output-unit">`. 옵션은 입력 단위와 동일한 카테고리 단위 목록.
- `output-unit` 변경 시 §3 트리거 2 재계산 적용.
- 시각: `output-value`는 읽기 전용임을 배경 `#f1f5f9`(옅은 회색)로 구분 표시하되, `readonly` 텍스트 상태(브라우저 기본 접근성 시맨틱)도 함께 유지 — 색상 단독 구분 아님. body-strong 타이포(§3) 적용.

### 5.5 `swap-button` (class `unit-converter__swap-btn`)

- `<button id="swap-button" type="button">⇅ 단위 맞바꾸기</button>` — 아이콘 + 텍스트 라벨 병기(아이콘 단독 금지, 접근성 이름 확보).
- 클릭 시 §3 트리거 3: `input-unit`↔`output-unit`, `input-value`↔`output-value`(숫자 파싱 가능 시) 교체 후 재계산.
- 시각: 배경 accent(`#2563eb`), 텍스트 흰색, padding 8px 16px, border-radius 6px. hover 시 `#1d4ed8`. focus-visible 시 outline 2px accent, offset 2px. Tab 순서상 입력그룹과 출력그룹 사이에 위치(마크업 순서 = 탭 순서).
- 320~599px: 버튼 폭 100%(가로 전체). 600px 이상(designer 재량 레이아웃): 원형 44x44px 아이콘 버튼으로 축소 가능(텍스트는 `aria-label`로 유지).

### 5.6 `error-message` (class `unit-converter__error`)

- `<div id="error-message" role="alert"></div>` — 항상 DOM에 존재(frozen 접근성 요구, `role="alert"` 상시 유지로 스크린리더 즉시 공지 보장).
- `invalid-input` 상태 진입 시 사유 텍스트 표시 (§5.4 edge case 문구 그대로 사용: "숫자를 입력하세요." / "절대영도 미만은 입력할 수 없습니다." 등).
- `idle`/`result-updated` 상태에서는 텍스트 내용을 비운다(요소 자체는 유지, `display:none` 등으로 완전히 숨기지 않는 것을 권장 — `role="alert"` 공지 신뢰성 유지).
- 시각: 텍스트 색상 `--color-error-text`(frozen), 배경 `#fef2f2`, padding 8px 12px, border-radius 6px, border `1px solid #fecaca`. 내용이 빈 문자열일 때는 배경/padding도 제거해 빈 박스가 도드라지지 않게 한다(높이 0 축소, `role="alert"` 속성은 유지).

### 5.7 상태명 caption (헤더 영역)

- frozen §4 접근성 요구("상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출") 충족을 위한 시각 요소.
- 위치: 헤더 타이틀 옆 또는 아래, caption 타이포(§3) 적용.
- 텍스트 매핑: `idle` → "상태: 대기 중" / `result-updated` → "상태: 결과 갱신됨" / `invalid-input` → "상태: 입력 오류".
- 이 caption은 frozen DOM id 목록에 없는 보조 시각 요소이므로 고정 id 없이 자유 마크업 허용(예: `unit-converter-app` 내부 `<p>` 또는 `<span>`), 단 텍스트 접근성 이름 노출 요구는 충족해야 한다.

## 6. dev 구현 가이드

1. 마크업은 §5의 순서(카테고리 → 입력그룹 → swap-button → 출력그룹 → error-message)를 그대로 DOM 순서로 사용 — Tab 순서가 자연스럽게 이 순서를 따른다(frozen §4 키보드 접근성 요구 충족).
2. CSS 변수 3종(`--color-error-text`, `--color-border-default`, `--space-field-gap`)은 `:root` 또는 `.unit-converter`에 frozen 값 그대로 선언하고, 본 문서 §2에서 designer가 추가한 색상(background/surface/text/accent 등)은 신규 CSS 변수를 자유 명명해 추가해도 무방하나 frozen 3종 변수명·값은 재정의하지 않는다.
3. 클래스 매핑: 루트 `.unit-converter`, 각 `<label>+<input|select>` wrapper `.unit-converter__field`, `#error-message`에 `.unit-converter__error`, `#swap-button`에 `.unit-converter__swap-btn`.
4. 반응형: `@media (max-width: 599px)` 에서 입력그룹/출력그룹을 `flex-direction: column`으로, 600px 이상에서 `flex-direction: row`(designer 재량, 필수 아님)로 전환하는 방식을 권장. 320px 최소폭에서 좌우 스크롤이 생기지 않도록 카드 `max-width: 480px; width: 100%; box-sizing: border-box;`와 내부 요소 `width: 100%` 적용을 권장.
5. 상태 전이 로직(§3, planner 문서)은 순수 JS로 구현: `category-select`/`input-value`/`input-unit`/`output-unit` 각각에 `change`/`input` 리스너를 달아 재계산 → 성공 시 `output-value` 갱신 + `error-message` 비움 + 상태명 caption "결과 갱신됨"으로, 실패 시 `output-value` 비움 + `error-message`에 사유 텍스트 + caption "입력 오류"로 갱신.
6. `swap-button` 클릭 핸들러: 단위 select 두 값 교체 + 입력값이 숫자로 파싱 가능하면 `output-value`의 현재 표시값을 `input-value`로 옮긴 뒤 재계산 함수 재사용(§5의 재계산 로직과 동일 함수 호출 권장 — 중복 로직 금지).
7. 값/공식은 planner 문서 §5(변환 규칙 표 전체)를 그대로 구현 — 본 시각 명세는 값을 재정의하지 않는다.
8. 모든 상호작용 요소는 완료/오류 이후에도 비활성화(`disabled`) 처리하지 않는다(frozen §3 트리거 4 — 즉시 재사용 가능 요구).

## 7. mockup 참조

- 경로: `docs/design/mockups/unit-converter-BF-1933.html`
- 위 §2~§6 명세를 정적 HTML/CSS로 시각화한 self-contained mockup. `idle`/`result-updated`/`invalid-input` 3개 상태를 각각 별도 `<section>`으로 나란히 배치해 상태별 시각 차이를 한 화면에서 비교할 수 있도록 구성.
- mockup은 시각 시뮬레이션 전용이며 dev의 실제 산출물이 아니다 — dev는 실제 계산 로직/상태 전이를 `unit-converter.html`에 별도 구현한다.
