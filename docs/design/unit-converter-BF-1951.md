# 단위 변환기 UI 명세 (BF-1951 / design: BF-1952)

> 본 문서는 `docs/plans/BF-1951/implementation-plan.md` §1의 **frozen `ui-contract@v1`** 을 재정의하지 않고 그대로 시각·구현 명세로 구체화한 것입니다. DOM id, CSS class, 디자인 토큰, 상태값, 접근성, 반응형 규칙은 planner가 동결한 값과 정확히 일치합니다.

## 1. 시안 개요

- **변경 범위**: 서버/네트워크 호출이 없는 클라이언트 전용 정적 단위 변환 계산기 UI. 카테고리 3종(길이/무게/온도)을 탭으로 전환하며, 각 탭 안의 여러 단위 입력 필드가 하나의 값 변경에 실시간으로 동기화된다.
- **사용자 경험 목표**:
  - 사용자가 어떤 단위 입력창에 값을 넣어도 같은 패널의 나머지 입력창이 즉시 갱신되어, "입력/출력" 구분 없이 모든 필드가 동등하게 상호 변환 가능하다는 것을 직관적으로 느끼게 한다.
  - 에러 상태(비숫자 입력, 절대영도 미만, 음수)가 발생해도 어떤 입력도 비활성화되지 않으며, 사용자가 무엇을 고쳐야 하는지 `error-message`(`role="alert"`)로 즉시 인지한다.
  - 상태(idle/error)는 색상만으로 구분하지 않고 텍스트로도 노출해 색각 이상 사용자도 상태를 알 수 있다.
  - 라이트/다크 모드 전환 시에도 동일한 정보 위계와 대비를 유지한다.

## 2. 컬러 팔레트

프로젝트 stack은 `vanilla-static` (repo convention capsule 기준) — 외부 의존성 0, CSS 변수는 frozen 토큰(§1.5 of implementation-plan.md)을 그대로 사용한다. 아래 값은 planner blueprint에서 동결된 값이며 재정의하지 않는다.

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--color-bg-light` | `#ffffff` | — | 라이트 모드 배경 |
| `--color-bg-dark` | — | `#121212` | 다크 모드 배경 |
| `--color-text-light` | `#1a1a1a` | — | 라이트 모드 본문 텍스트 |
| `--color-text-dark` | — | `#f5f5f5` | 다크 모드 본문 텍스트 |
| `--color-accent` | `#2563eb` | `#2563eb` | 활성 탭(`tab--active`), 포커스 링, 강조 요소 |
| `--color-error` | `#dc2626` | `#dc2626` | `error-text`, `error-message` 텍스트, 에러 시 입력 테두리 |
| `--space-control-gap` | `12px` | `12px` | 탭/입력 필드 사이 여백 |
| `--radius-control` | `8px` | `8px` | 탭·입력·패널 모서리 반경 |

- **다크모드 판정**: `prefers-color-scheme: dark` 미디어쿼리로 전환한다(별도 토글 UI는 frozen 계약에 없으므로 추가하지 않는다).
- 배경/텍스트는 라이트 `#ffffff`/`#1a1a1a`, 다크 `#121212`/`#f5f5f5` 조합으로 각각 WCAG AA 이상의 명도 대비를 만족한다(라이트 대비 ≈ 15.7:1, 다크 대비 ≈ 15.7:1).
- accent(`#2563eb`)와 흰 배경(`#ffffff`) 대비 ≈ 5.1:1 → 텍스트/아이콘 사용 시 AA 통과. error(`#dc2626`)와 흰 배경 대비 ≈ 5.9:1 → AA 통과.

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다(외부 폰트 요청 금지).

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

| 용도 | size | weight | line-height |
|---|---|---|---|
| heading (`h1`, 앱 타이틀) | 1.375rem (22px) | 700 | 1.3 |
| tab label (`.tab`) | 0.9375rem (15px) | 600 | 1.4 |
| body / label (`unit-row` label) | 0.875rem (14px) | 600 | 1.4 |
| input value (`unit-input`) | 1rem (16px) | 400 | 1.4 |
| caption (상태 텍스트, 단위 보조 설명) | 0.8125rem (13px) | 500 | 1.4 |
| error (`error-text`, `error-message`) | 0.8125rem (13px) | 600 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조

```
#app-root [data-state="idle|error"]
├─ h1 (타이틀: "단위 변환기")
├─ div.tabs (role="tablist")
│   ├─ button.tab#tab-length      (role="tab", aria-selected, aria-controls="panel-length")
│   ├─ button.tab#tab-weight      (role="tab", aria-selected, aria-controls="panel-weight")
│   └─ button.tab#tab-temperature (role="tab", aria-selected, aria-controls="panel-temperature")
├─ div.panel#panel-length      (role="tabpanel", aria-labelledby="tab-length")
│   └─ div.unit-row × 6 (m/km/cm/mm/inch/feet) — 각 row: <label> + input.unit-input
├─ div.panel#panel-weight      (role="tabpanel", aria-labelledby="tab-weight")
│   └─ div.unit-row × 5 (g/kg/mg/lb/oz) — 각 row: <label> + input.unit-input
├─ div.panel#panel-temperature (role="tabpanel", aria-labelledby="tab-temperature")
│   └─ div.unit-row × 3 (C/F/K) — 각 row: <label> + input.unit-input
├─ p#error-message.error-text (role="alert")
└─ p (현재 상태 텍스트 — 화면/스크린리더 공용, §7 접근성 참고)
```

- 한 번에 하나의 `panel--active`만 표시된다(나머지 패널은 `display:none` 또는 `hidden` 속성).
- `unit-row`는 세로 스택: 라벨 위, 입력 필드 아래(모바일) → 768px 이상에서는 라벨+입력을 한 grid cell로 묶어 그리드 배치(§4.3).

### 4.2 Spacing

- 모든 형제 컨트롤(탭 간, `unit-row` 간, 입력 필드 내부 라벨-입력 간) 기준 간격은 `--space-control-gap`(12px) 사용.
- 패널 내부 상하 padding: 16px (spacing 스케일 상 `--space-control-gap` × 1.33, 고정값으로 명시).
- 앱 컨테이너(`#app-root`) 바깥 여백: 최소 16px, 최대 폭 640px, 중앙 정렬.

### 4.3 Breakpoint 별 동작

| Breakpoint | 동작 |
|---|---|
| 320px ~ 767px | `tabs`는 가로 스크롤 없이 3개 탭이 균등폭(`flex: 1 1 0`)으로 한 줄에 표시. `unit-row`는 세로 1열 스택. |
| 768px 이상 | `unit-row`들이 2열 grid(`grid-template-columns: repeat(2, 1fr)`; gap `--space-control-gap`)로 배치. 탭은 좌측 정렬, 최대 폭 320px로 축소 가능. |

- 320px 미만 대응은 frozen 계약 범위 밖(비목표) — 320px를 최소 지원 폭으로 간주한다.
- 가로 스크롤은 어떤 폭에서도 발생하지 않아야 한다(`overflow-x: hidden` 또는 `box-sizing: border-box` + 반응형 폭 조정으로 보장).

## 5. 컴포넌트 명세

### 5.1 Tabs (`.tabs` > `.tab`)

- **역할**: 카테고리(길이/무게/온도) 전환.
- **DOM**: `<div class="tabs" role="tablist">` 안에 `<button class="tab" id="tab-length" role="tab" aria-selected="true|false" aria-controls="panel-length" tabindex="0|-1">길이</button>` 형태 3개.
- **상태**:
  - 활성 탭: `.tab--active` 클래스 추가, `aria-selected="true"`, `tabindex="0"`, 배경/텍스트 `--color-accent` 강조(밑줄 또는 필 배경), `aria-selected`만이 아니라 시각적으로도 굵은 글자(weight 600 유지, 밑줄 2px `--color-accent`)로 표시.
  - 비활성 탭: `aria-selected="false"`, `tabindex="-1"`, 기본 텍스트 색상.
- **인터랙션**:
  - 클릭/Enter/Space → 해당 탭 활성화 + 대응 패널(`panel--active`) 전환 + 상태를 `idle`로 초기화(§7.4 planner 규칙, 모든 `unit-input`과 `error-message` 초기화).
  - 좌/우 화살표 키로 탭 간 포커스 이동(roving tabindex) — `role="tab"` 표준 패턴.
  - `:hover`, `:focus-visible` 시 `--color-accent` 2px outline.

### 5.2 Panel (`.panel` / `panel-length` / `panel-weight` / `panel-temperature`)

- **역할**: 카테고리별 단위 입력 목록 컨테이너.
- **상태**: `.panel--active`가 없으면 `hidden` 속성으로 완전히 숨김(접근성 트리에서 제외). 활성 패널만 `.panel--active` + 렌더링.
- **컨텐츠**: `unit-row` N개(길이 6 / 무게 5 / 온도 3), §2/§3 순서(계획 문서 표 순서)를 그대로 따른다.

### 5.3 Unit Row (`.unit-row`) / Unit Input (`.unit-input`)

- **역할**: 하나의 단위와 그 값을 표시·입력.
- **DOM**: `<div class="unit-row"><label for="unit-length-m">미터 (m)</label><input class="unit-input" id="unit-length-m" type="text" inputmode="decimal" autocomplete="off" aria-label="미터 (m) 값"></div>`
  - `id` 네이밍 규약(§6 dev 구현 가이드 참고): `unit-<category>-<unitKey>` (frozen id 목록에는 없는 보조 id이므로 dev가 자유 명명 가능하나, 본 문서는 일관성을 위해 권장값을 제시함 — DOM 구조상 필수 아님).
  - `<label>`은 시각적으로도 노출(스크린리더 전용 숨김 금지) — 단위명 + 기호(예: "미터 (m)").
- **props/상태**:
  - `value`: 현재 표시값(문자열, 사용자가 마지막으로 편집한 필드는 원문 유지, 나머지는 §2/§3 계산 결과를 소수 6자리 반올림 후 표시).
  - `disabled`: 항상 `false` — 어떤 상태에서도 비활성화하지 않는다(planner invariant: 실패 후에도 주 실행 control 재사용 가능).
  - 에러를 유발한 필드: 값 유지, 테두리 `--color-error` 2px.
  - 나머지 필드(에러 상태일 때): 값 비움(빈 문자열), 테두리는 기본색 유지(에러 필드만 강조).
- **인터랙션**:
  - `input` 이벤트마다 실시간 재계산(§4/§5 계획 문서 규칙).
  - `:focus-visible` → `--color-accent` 2px outline.
  - 에러 필드는 `aria-invalid="true"` 추가, `aria-describedby="error-message"` 연결.

### 5.4 Error Message (`#error-message.error-text`)

- **역할**: 현재 입력 에러 사유를 즉시 공지.
- **DOM**: `<p id="error-message" class="error-text" role="alert"></p>` — idle일 때는 빈 문자열(빈 `<p>`는 DOM에 유지, 텍스트만 비움 → 다음 에러 발생 시 `role="alert"` 공지가 스크린리더에서 정상 트리거되도록 텍스트 갱신 방식 사용).
- **상태**: 텍스트가 비어 있으면 시각적으로도 숨김 처리 가능(`:empty { display: none }` 등, DOM에서 완전히 제거하지는 않음).
- **색상**: `--color-error`.

### 5.5 App Root (`#app-root`)

- **역할**: 전체 앱 컨테이너, 현재 상태(`idle`/`error`)를 `data-state` 속성으로 노출.
- **DOM**: `<div id="app-root" data-state="idle|error">`.
- **상태 텍스트 노출**: `data-state`는 스타일링/테스트 훅용이며, 별도로 화면에 보이는 상태 텍스트(예: "상태: 정상" / "상태: 오류")를 `aria-live="polite"` 영역에 함께 둔다(색상만으로 상태 구분 금지 — planner 접근성 규칙).

## 6. dev 구현 가이드

1. **CSS 변수 선언**: `:root`에 §2 표의 8개 토큰을 그대로 선언한다. 라이트/다크는 `@media (prefers-color-scheme: dark)` 블록에서 `--color-bg-*`/`--color-text-*` 중 다크 값을 사용하도록 전환(토큰 이름 자체는 변경하지 않고, 실제 적용 시 `background: var(--color-bg-light)`처럼 라이트를 기본값으로 두고 dark media query 안에서 `background: var(--color-bg-dark)`로 override하는 방식을 권장).
2. **클래스명**: `tabs`, `tab`, `tab--active`, `panel`, `panel--active`, `unit-row`, `unit-input`, `error-text`를 정확히 그대로 사용한다(BEM 수정자 `--active`는 이미 frozen). 새 클래스를 추가할 수는 있으나(예: 레이아웃 보조용 `unit-converter__grid`) 위 8개를 재정의하거나 대체하지 않는다.
3. **DOM id**: `app-root`, `tab-length`, `tab-weight`, `tab-temperature`, `panel-length`, `panel-weight`, `panel-temperature`, `error-message` 8개를 정확히 그대로 사용한다.
4. **탭 전환 로직**: 탭 클릭 시 (a) 클릭된 탭에 `tab--active` + `aria-selected="true"`, 나머지 탭은 제거/`false`, (b) 대응 패널에 `panel--active` + `hidden` 제거, 나머지 패널은 `hidden` 추가, (c) `data-state="idle"`로 리셋, (d) 모든 `unit-input.value = ""`, `error-message.textContent = ""`.
5. **실시간 재계산**: 각 `unit-input`의 `input` 이벤트에서 (a) 값 검증(§4 계획 문서 규칙: 비숫자/절대영도 미만/음수), (b) 유효하면 기준 단위 경유로 같은 패널의 나머지 `unit-input` 값을 채우고 `data-state="idle"`, `error-message`를 비움, (c) 무효면 `data-state="error"`, 트리거 필드 외 나머지 `unit-input`을 비우고 `error-message`에 사유 문구 채움.
6. **접근성 배선**: 탭 버튼에 `role="tab"`+`aria-selected`(+ `aria-controls`/`tabindex` 권장), 패널에 `role="tabpanel"`(+ `aria-labelledby` 권장), `error-message`에 `role="alert"`(이미 §5.4), 모든 `unit-input`에 `<label for>` 또는 `aria-label`.
7. **반응형 CSS**: 기본(모바일) 스타일을 320px 기준으로 작성 후 `@media (min-width: 768px)`에서 `.panel--active`(또는 그 안의 `unit-row` 묶음 wrapper)에 `display:grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-control-gap);` 적용.
8. **기존 파일 처리**: 저장소 루트 `unit-converter.html`은 §1.6(계획 문서)에 따라 현재 구조(`#unit-converter-app`, `category-select`, `input-unit`/`output-unit`, `swap-button`, 상태값 `idle`/`result-updated`/`invalid-input`)와 frozen 계약이 다르다. dev는 frozen DOM id/class/token/상태(`idle`/`error`)로 **재작성**하되 파일 자체(경로)는 유지한다(additive 정책).
9. **금지 사항**: frozen 계약에 없는 새 DOM id/class/토큰/상태를 추가하지 않는다. `unit-input` 비활성화(disabled) 처리 금지.

## 7. 접근성 (요약 — planner frozen 규칙 그대로)

- 탭 버튼은 `role="tab"` + `aria-selected`.
- `error-message`는 `role="alert"`.
- 모든 `unit-input`은 명시적 `<label>` 또는 `aria-label`.
- 모든 상태(`idle`/`error`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트 + 접근성 이름으로 노출.
- 추가 권장(비-frozen, dev 재량): `role="tablist"`/`role="tabpanel"`, roving tabindex, `aria-invalid`/`aria-describedby`는 접근성 품질 향상을 위한 권장 사항이며 frozen 계약 위반이 아니다(§1.2~1.5에 명시된 항목을 대체/삭제하지 않는 한 자유).

## 8. 반응형 (요약 — planner frozen 규칙 그대로)

- 320px 이상: 가로 스크롤 없이 탭과 단위 입력 필드가 세로로 재배치.
- 768px 이상: 카테고리별 단위 입력이 그리드로 배치.

## 9. mockup 참조

- 시각 mockup: [`docs/design/unit-converter-BF-1951-mockup.html`](./unit-converter-BF-1951-mockup.html)
- mockup은 길이/무게/온도 3개 탭, idle/error 상태, 라이트/다크 토큰을 정적으로 시각화한다(placeholder 데이터 포함). 실제 앱 코드가 아니며 dev의 픽셀 단위 구현 의무는 없다.
