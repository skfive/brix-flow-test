# BF-2023 색상 팔레트 생성기 — UI 시안 명세

## 1. 시안 개요

기준 hex 색상 하나를 입력(텍스트 입력 또는 컬러 피커, 또는 랜덤 생성)받아
보색 1종·유사색 2종·명도 변형 2종으로 구성된 5색 팔레트를 생성하고,
각 swatch를 클릭해 hex 코드를 클립보드에 복사할 수 있는 단일 정적 페이지 시안이다.

본 문서는 `docs/plans/BF-2023/implementation-plan.md`에서 planner가 동결한
UI 계약(DOM 구조·상태 모델·디자인 토큰·접근성·반응형 규칙)을 그대로 시각화한다.
selector, class명, DOM id, 상태명, 토큰 값은 이 문서에서 재정의하지 않는다.

**사용자 경험 목표**
- 기준색 하나만 입력하면 즉시 5색 팔레트를 확인할 수 있다 (동기 계산, 지연 없음).
- 잘못된 hex 입력 시 명확한 에러 문구로 즉시 피드백을 준다.
- 각 swatch를 클릭하면 hex 코드가 복사되고 "복사됨" 배지로 결과를 확인할 수 있다.
- 스크린리더 사용자도 상태 변화(에러/복사됨/생성 중)를 텍스트로 인지할 수 있다.

## 2. 컬러 팔레트

시안 자체의 UI 크롬(입력 영역, 배경, 텍스트)에 사용하는 정적 색상이다.
팔레트 swatch 자체의 색상은 사용자가 입력한 기준색에서 동적으로 계산되므로 고정 HEX가 없다.

| 용도 | 토큰 | HEX | 비고 |
|---|---|---|---|
| 에러 텍스트 | `--color-error-text` | `#dc2626` | frozen 토큰 (3.3) |
| swatch 테두리 | `--color-swatch-border` | `#e2e8f0` | frozen 토큰 (3.3) |
| 배경 | (신규, additive) | `#f8fafc` | 페이지 배경, 토큰 계약에 없는 시안 전용 값 |
| 본문 텍스트 | (신규, additive) | `#1e293b` | 라벨/본문 텍스트 |
| 보조 텍스트 | (신규, additive) | `#64748b` | placeholder, 캡션 |
| 컨테이너 배경 | (신규, additive) | `#ffffff` | `#palette-root` 카드 배경 |
| 버튼 배경(랜덤) | (신규, additive) | `#3b82f6` | `#random-btn` 기본 배경 |
| 버튼 배경(hover) | (신규, additive) | `#2563eb` | `#random-btn` hover |
| 포커스 링 | (신규, additive) | `#93c5fd` | `:focus-visible` outline |

> 신규 색상은 frozen 토큰(3.3)을 재정의하지 않는 additive 값이며, `palette/style.css` 구현 시
> dev가 그대로 CSS 변수로 옮겨 사용해도 되고 별도 이름으로 추가해도 무방하다(선택 사항).

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`#palette-root` 상단 타이틀) | `var(--font-family-base)` | 20px | 600 | 1.4 |
| body (라벨, 캡션, 안내문) | `var(--font-family-base)` | 14px | 400 | 1.5 |
| swatch hex 코드 (`.palette__swatch-hex`) | `var(--font-family-base)` | 13px | 600 | 1.2 (monospace 아님, system font 유지) |
| 에러 메시지 (`#error-message`) | `var(--font-family-base)` | 13px | 500 | 1.4 |

`--font-family-base` 값은 frozen 토큰(3.3) `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`를
그대로 사용한다. 외부 웹폰트는 사용하지 않는다(vanilla-static, system font 원칙).

## 4. 레이아웃

### 4.1 섹션 구조

```
#palette-root (.palette)                     — 카드형 컨테이너, 중앙 정렬, max-width 480px
  ├─ heading (h1 텍스트, "색상 팔레트 생성기")
  ├─ .palette__input-group
  │    ├─ #hex-input      (텍스트 입력, placeholder "#3B82F6")
  │    ├─ #color-picker   (<input type="color">)
  │    └─ #random-btn     ("랜덤 색상")
  ├─ #error-message       (role="alert", 기본 hidden)
  └─ #palette-swatches
       └─ .palette__swatch × 5
            ├─ .palette__swatch-hex   (예: "#93C5FD")
            └─ .palette__copied-badge (copied 상태에서만 노출)
```

### 4.2 spacing

- `#palette-root` 내부 padding: 24px
- `.palette__input-group` 내부 요소 간 gap: 8px
- `.palette__input-group` ↔ `#error-message` 간 margin-top: 8px
- `#error-message` ↔ `#palette-swatches` 간 margin-top: 16px
- `#palette-swatches` swatch 간 gap: `var(--space-swatch-gap)` (frozen, 12px)

### 4.3 breakpoint 별 동작 (frozen 3.5 반영)

| breakpoint | `#palette-swatches` 배치 |
|---|---|
| < 480px | swatch 세로 1열 스택 (`flex-direction: column`) |
| ≥ 480px | swatch 가로 5열 (`flex-direction: row`, `flex-wrap: wrap`) |
| ≥ 320px (전 구간) | `flex-wrap: wrap`으로 overflow 방지 |

## 5. 컴포넌트 명세

### 5.1 `#hex-input`

| 항목 | 값 |
|---|---|
| 타입 | `<input type="text">` |
| `aria-label` | `"기준 색상 hex 코드"` (frozen) |
| placeholder | `"#3B82F6"` |
| 상태 | 값이 `/^#?[0-9a-fA-F]{6}$/` 불일치 시 `error` 상태 트리거, 테두리 색 `--color-error-text`로 전환 |
| 인터랙션 | 입력 변경 시 유효하면 팔레트 재계산(idle), 무효하면 error 상태 진입 |

### 5.2 `#color-picker`

| 항목 | 값 |
|---|---|
| 타입 | `<input type="color">` |
| 인터랙션 | 선택 시 `#hex-input`과 값 동기화, 팔레트 재계산(idle) |

### 5.3 `#random-btn`

| 항목 | 값 |
|---|---|
| 타입 | `<button>` |
| 기본 상태 | `idle` — 활성, 텍스트 "랜덤 색상" |
| `generating` 상태 | `aria-busy="true"`, `disabled` — 계산 완료 즉시 `idle`로 복귀 |
| 인터랙션 | 클릭 시 랜덤 기준색 생성 → 팔레트 재계산 |

### 5.4 `#error-message`

| 항목 | 값 |
|---|---|
| `role` | `"alert"` (frozen) |
| 기본 상태 | 비어있음/`hidden` |
| `error` 상태 문구 | `"올바른 hex 코드를 입력하세요 (예: #3B82F6)"` (frozen) |
| 색상 | `--color-error-text` (`#dc2626`) |

### 5.5 `.palette__swatch` (× 5)

| 항목 | 값 |
|---|---|
| 타입 | `<button>` |
| `aria-label` | `"{hex} 복사"` (동적, hex는 대문자 `#RRGGBB`) |
| 배경 | 해당 swatch의 계산된 hex 값 (인라인 `background-color`) |
| 테두리 | `1px solid var(--color-swatch-border)` |
| 내부 | `.palette__swatch-hex` (hex 텍스트, 대문자 표기) + `.palette__copied-badge` (copied 상태에서만) |
| `idle` 상태 | 기본 표현, 클릭 가능 |
| `copied` 상태 | `.palette__copied-badge`에 `"복사됨"` 노출, 1500ms 후 자동으로 `idle` 표현 복귀(재클릭 시 타이머 재시작) |
| 복사 실패 시 | `copied`로 전이하지 않고 `idle` 표현 유지 (에러 상태로 격상 금지) |

## 6. Epic AC 대비 화면 요소 매핑 표

| AC / 계약 항목 | 화면 요소 | 시안 반영 위치 |
|---|---|---|
| DOM 구조가 UI 계약과 동일한 id(`palette-root`, `hex-input`, `color-picker`, `palette-swatches`, `random-btn`, `error-message`) 포함 | mockup HTML 전체 구조 | `docs/design/BF-2023-palette-mockup.html` §전체 |
| 기준 hex 입력 → 5색 팔레트 생성 | `#hex-input`, `#color-picker`, `#palette-swatches` | 4.1, 5.1, 5.2 |
| 랜덤 기준색 생성 | `#random-btn` | 5.3 |
| swatch 클릭 → hex 클립보드 복사 | `.palette__swatch`, `.palette__swatch-hex` | 5.5 |
| 잘못된 hex 입력 시 에러 피드백 | `#error-message` (`role="alert"`) | 5.4 |
| 복사 성공 피드백 | `.palette__copied-badge` | 5.5 |
| `idle`/`generating`/`error`/`copied` 4개 상태 시각 표현 | mockup 내 상태별 정적 스냅샷 섹션 | mockup HTML "상태 스냅샷" 섹션 |
| 디자인 토큰(`--font-family-base`, `--color-error-text`, `--color-swatch-border`, `--space-swatch-gap`) 실값 반영 | `:root` CSS 변수 | mockup HTML `<style>` |
| 접근성(aria-label, role="alert", 키보드 조작) | `#hex-input`, `.palette__swatch`, `#error-message`, `#random-btn` | 5.1~5.5 |
| 반응형(320px 이상 wrap, 480px 기준 1열↔5열) | `#palette-swatches` | 4.3 |

## 7. dev 구현 가이드

1. `palette/index.html`에 §4.1 DOM 구조를 §3.1(frozen) id/class 그대로 배치하고, §5의 각 컴포넌트 접근성 속성(aria-label, role)을 정적으로 포함한다.
2. `palette/style.css`에서 `:root`에 frozen 토큰 4종(`--font-family-base`, `--color-error-text`, `--color-swatch-border`, `--space-swatch-gap`)을 정의하고, §2의 additive 색상은 별도 변수(예: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-hover`, `--color-focus-ring`)로 자유롭게 추가한다.
3. `#palette-swatches`는 §4.3 breakpoint 규칙에 따라 `flex-wrap: wrap` + `480px` 기준 `flex-direction` 전환으로 구현한다(class명 재정의 없이 media query만 추가).
4. swatch 배경색은 `buildPalette(hex)` 반환값의 `hex`를 인라인 스타일(`style="background-color: ..."`)로 적용한다.
5. 상태 전이(`idle`/`generating`/`error`/`copied`)는 JS에서 클래스 토글이 아니라 `implementation-plan.md` §3.2 조건 그대로 속성(`disabled`, `aria-busy`, `hidden`, 텍스트 콘텐츠)으로 표현한다 — 색상만으로 상태를 구분하지 않는다.
6. 색 변환 로직은 `palette/palette.js`의 `hexToHsl` → `hslToHex` → `buildPalette` 순수 함수만 사용하고, DOM 이벤트 핸들러에서 이 함수들을 호출해 상태를 갱신한다.

## 8. mockup 참조

시각 mockup: [`docs/design/BF-2023-palette-mockup.html`](BF-2023-palette-mockup.html)

> mockup은 `idle`/`error`/`copied`/`generating` 4개 상태를 각각 별도 정적 스냅샷 섹션으로 나열하여
> 인터랙션 결과를 한눈에 비교할 수 있도록 구성했다. 실제 동적 전이는 dev 구현 범위이며,
> 이 HTML은 UI 계약의 시각적 참조 가이드일 뿐 픽셀 단위 구현 의무는 없다.
