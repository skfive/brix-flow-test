# 비밀번호 강도 판정기 — 시각 명세 (BF-1939 / BF-1940)

> 본 문서는 `docs/plans/BF-1939/implementation-plan.md`(BF-1942)가 동결한 UI 계약(파일·DOM ID/class·상태·색상 token·접근성·반응형)을 그대로 시각 명세로 구체화한 것입니다. selector/state/token 값은 재정의하지 않습니다.
> 산출물 범위: 본 markdown 문서 1개. 런타임 HTML/CSS/JS는 developer(BF-1941)가 `password-strength.html`로 별도 구현합니다.

## 1. 시안 개요

- **변경 범위**: 신규 단일 화면 `password-strength.html`. 비밀번호 입력창 + 표시/숨김 토글 + 실시간 강도 라벨/미터 + 4항목 체크리스트로 구성된 독립 위젯 1개.
- **사용자 경험 목표**:
  - 사용자가 타이핑하는 즉시(매 `input` 이벤트) 강도 등급(약함/보통/강함)과 4개 판정 항목의 충족 여부를 시각적으로 즉각 인지할 수 있어야 한다.
  - 색상만으로 등급을 구분하지 않고, 항상 상태명 텍스트를 함께 노출하여 색맹 사용자도 등급을 판별할 수 있어야 한다(접근성 요구사항, §3.6).
  - 비밀번호 표시/숨김 토글은 강도 판정과 독립적으로 동작하며, 클릭할 때마다 아이콘·라벨·`aria-pressed` 상태가 즉시 갱신된다.
  - 입력을 전부 지우면 모든 시각 요소(라벨, 미터, 체크리스트)가 초기 상태(`empty`)로 즉시 복귀한다.

## 2. 컬러 팔레트

frozen token(§3.5, implementation-plan.md)을 그대로 사용한다. 아래 외 새 색상 token을 추가하지 않는다.

| 용도 | token | HEX | 비고 |
|---|---|---|---|
| 약함(weak) 강조색 | `--color-strength-weak` | `#dc2626` | 라벨 텍스트, 미터 바, 체크리스트 미충족 아이콘 강조 없음(중립 유지) |
| 보통(medium) 강조색 | `--color-strength-medium` | `#f59e0b` | 라벨 텍스트, 미터 바 |
| 강함(strong) 강조색 | `--color-strength-strong` | `#16a34a` | 라벨 텍스트, 미터 바, 체크리스트 충족(`checklist-item--met`) 아이콘 |
| 배경(카드) | (신규 정의) `--color-surface` | `#ffffff` | `password-strength` 루트 컨테이너 배경 |
| 배경(페이지) | (신규 정의) `--color-page-bg` | `#f8fafc` | body 배경 |
| 본문 텍스트 | (신규 정의) `--color-text` | `#1e293b` | 라벨, 체크리스트 기본 텍스트 |
| 보조 텍스트 | (신규 정의) `--color-text-muted` | `#64748b` | placeholder, 미충족 체크리스트 항목 텍스트 |
| 테두리 | (신규 정의) `--color-border` | `#cbd5e1` | 입력창/카드 테두리 (기본 상태) |
| empty 상태 중립색 | (신규 정의) `--color-strength-empty` | `#94a3b8` | 강도 미터 트랙 배경, `empty` 상태 라벨 색 |

> `--color-surface` 등은 frozen token 목록(`--color-strength-weak/medium/strong`, `--space-control-gap`)에 없는 보조 색상으로, blueprint 색상 token을 재정의하지 않는 범위에서 dev 구현 편의를 위해 추가 제안하는 값이다. dev는 frozen 4개 token(§3.5)만 필수 준수하면 되며, 나머지는 참고값이다.

## 3. 타이포그래피

시스템 폰트 스택 사용(외부 폰트 CDN 금지 — DoD §4 "CDN/외부 라이브러리 미사용" 준수).

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| 위젯 제목(선택, 화면 밖 h1 또는 카드 상단) | `system-ui, -apple-system, "Segoe UI", sans-serif` | 18px | 700 | 1.4 |
| `pw-input` 입력 텍스트 | 동일 system stack | 16px | 400 | 1.5 |
| `pw-strength-label` 강도 텍스트 | 동일 system stack | 14px | 600 | 1.4 |
| `checklist-item` 체크리스트 텍스트 | 동일 system stack | 13px | 400 | 1.4 |
| `pw-toggle` 버튼 라벨(시각적으로는 아이콘, `aria-label`은 텍스트) | 동일 system stack | 13px | 500 | 1 |

## 4. 레이아웃

### 4.1 섹션 구조 (DOM ID 기준, 계약 §3.2 그대로 사용)

```
#password-strength-root (.password-strength)              ← 카드 컨테이너
├── 입력 그룹 (input row)
│   ├── #pw-input (.password-strength__input)              ← 비밀번호 입력창 (type="password"/"text" 토글)
│   └── #pw-toggle (.password-strength__toggle)             ← 표시/숨김 토글 버튼, 입력창 우측 내부 정렬
├── 강도 표시 영역 (strength row)
│   ├── #pw-strength-label                                  ← "약함" / "보통" / "강함" / 초기 안내 텍스트, aria-live="polite"
│   └── #pw-strength-meter (.password-strength__meter)      ← 가로 바 형태 진행 미터, state class(strength-weak 등) 적용
└── #password-strength__checklist (.password-strength__checklist) ← 4항목 체크리스트
    ├── #pw-check-length     (.checklist-item)
    ├── #pw-check-uppercase  (.checklist-item)
    ├── #pw-check-number     (.checklist-item)
    └── #pw-check-special    (.checklist-item)
```

- 각 체크리스트 항목은 충족 시 `checklist-item--met` class를 추가로 부여받는다(§3.3). 미충족 시 base `checklist-item`만 유지.

### 4.2 spacing

- 카드(`password-strength`) 내부 padding: 24px.
- 입력 그룹과 강도 표시 영역, 강도 표시 영역과 체크리스트 사이 간격: `--space-control-gap`(12px)을 seed 단위로 사용하되, 섹션 간 큰 구분은 `--space-control-gap`의 2배(24px)를 적용한다.
- 체크리스트 항목 간 세로 간격: `--space-control-gap`(12px).
- 체크리스트 항목 내부 아이콘–텍스트 간격: 8px.
- `pw-input`과 `pw-toggle`은 같은 행(input row) 안에서 `--space-control-gap`(12px) 간격으로 배치하거나, 토글을 입력창 내부 우측에 절대배치할 경우 입력창 우측 padding을 40px 확보해 텍스트와 겹치지 않게 한다.

### 4.3 breakpoint 별 동작 (계약 §3.7)

- **320px ~ 479px (최소 지원 폭)**: 카드 전체 폭 100%, 좌우 padding 16px로 축소. `pw-input` + `pw-toggle` 행은 유지하되 `pw-toggle`은 24×24px 아이콘 버튼으로 축소. 체크리스트는 1열 세로 나열(4행)로 줄바꿈되어도 가로 overflow가 발생하지 않아야 한다.
- **480px ~ 767px**: 카드 최대 폭 420px, 중앙 정렬. 체크리스트는 2열 grid(각 항목 최소 폭 150px)로 배치 가능.
- **768px 이상**: 카드 최대 폭 480px 유지. 체크리스트 2열 grid, 카드 padding 32px.
- 모든 breakpoint에서 `pw-input`, `password-strength__checklist`는 `box-sizing: border-box` + `max-width: 100%`로 가로 overflow를 방지한다(계약 §3.7 필수 조건).

## 5. 컴포넌트 명세

### 5.1 `pw-input` (비밀번호 입력창)

- 요소: `<input id="pw-input" class="password-strength__input" type="password">`
- props/attr: `type`은 `pw-toggle` 상태에 따라 `password` ↔ `text` 전환. `placeholder="비밀번호를 입력하세요"`. `aria-describedby="pw-strength-label"` 권장(강도 라벨과 연결).
- 상태:
  - 기본: 테두리 `--color-border`(#cbd5e1), 배경 `--color-surface`.
  - focus: 테두리 색을 현재 강도 색(예: `strong`이면 `--color-strength-strong`) 또는 중립 강조색으로 전환 + outline 2px.
  - `empty`(빈 문자열): placeholder 노출, 테두리 기본색.
- 인터랙션: `input` 이벤트마다 4항목 재판정 + 강도 라벨/미터/체크리스트 즉시 갱신(§1.1~§2 판정 로직은 developer 구현 범위).

### 5.2 `pw-toggle` (비밀번호 표시/숨김 토글)

- 요소: `<button id="pw-toggle" class="password-strength__toggle" type="button">`
- 아이콘: 텍스트 기반 아이콘 사용 권장(외부 아이콘 폰트/CDN 금지 — DoD §4). 예: 숨김 상태 `"👁"` 또는 `"보기"` 텍스트, 표시 상태 `"🙈"` 또는 `"숨기기"` 텍스트. 시각적으로는 단순 아이콘 1글자 또는 2~3자 텍스트 라벨로 표현.
- 상태별 표기:

  | 내부 상태 | `type` of `pw-input` | 버튼 시각 텍스트/아이콘(예시) | `aria-pressed` | `aria-label` |
  |---|---|---|---|---|
  | 비밀번호 숨김(기본) | `password` | `👁` (또는 "보기") | `false` | `"비밀번호 표시"` |
  | 비밀번호 표시 | `text` | `🙈` (또는 "숨기기") | `true` | `"비밀번호 숨기기"` |

- 인터랙션: 클릭할 때마다 위 표의 두 상태를 토글. `aria-pressed`와 `aria-label`은 매 클릭마다 갱신(계약 §3.6). 강도 판정 상태(`empty|weak|medium|strong`)에는 어떠한 영향도 주지 않는다(§2).
- 배치: 입력 그룹(input row) 내부, `pw-input` 우측.

### 5.3 `pw-strength-label` (강도 텍스트, aria-live)

- 요소: `<div id="pw-strength-label" aria-live="polite">`
- 상태별 표기 (색상 + 텍스트를 항상 함께 노출 — 계약 §1.2, §3.6):

  | 상태 | 표시 텍스트 | 색상 |
  |---|---|---|
  | `empty` | `"비밀번호를 입력해주세요"` (초기 안내 텍스트) | `--color-strength-empty`(#94a3b8) |
  | `weak` | `"약함"` | `--color-strength-weak`(#dc2626) |
  | `medium` | `"보통"` | `--color-strength-medium`(#f59e0b) |
  | `strong` | `"강함"` | `--color-strength-strong`(#16a34a) |

- 인터랙션: 입력 변경 시마다 텍스트와 색상이 함께 갱신되며, `aria-live="polite"`로 스크린리더에 변경 사항이 자동 낭독된다.

### 5.4 `pw-strength-meter` (강도 미터)

- 요소: `<div id="pw-strength-meter" class="password-strength__meter">` (내부에 채움 bar용 자식 요소 1개 포함 가능, 예: `<div class="password-strength__meter-fill">`)
- 상태 class(계약 §3.3): 루트 또는 채움 요소에 `strength-weak` / `strength-medium` / `strength-strong` 중 하나를 부여. `empty` 상태에서는 세 class 모두 미부여(중립 표시).
- 시각 표현: 가로 바 형태(트랙 + 채움). 트랙 배경 `--color-strength-empty`의 옅은 버전 또는 `--color-border`. 채움 폭은 충족 개수 기준으로 4단계(0/1개=25% 이하, 2~3개=50~75%, 4개=100%) 비례 표시 권장(정확한 계산은 developer 구현, 본 명세는 시각 비례 원칙만 제시).
- 채움 색상: 상태 class에 대응하는 token 색상(`--color-strength-weak/medium/strong`). `empty`는 채움 폭 0.
- 높이 8px, border-radius 4px.

### 5.5 `password-strength__checklist` + `checklist-item` (4항목 체크리스트)

- 요소: `<ul id="password-strength__checklist" class="password-strength__checklist">` 내부에 4개 `<li class="checklist-item">` (각각 `id`는 `pw-check-length`, `pw-check-uppercase`, `pw-check-number`, `pw-check-special`).
- 항목별 텍스트:

  | id | 텍스트 |
  |---|---|
  | `pw-check-length` | `"8자 이상"` |
  | `pw-check-uppercase` | `"대문자 포함"` |
  | `pw-check-number` | `"숫자 포함"` |
  | `pw-check-special` | `"특수문자 포함"` |

- 상태별 시각 표현 (계약 §3.3 `checklist-item--met` class 사용):

  | 상태 | class | 아이콘(텍스트 기반, 앞에 배치) | 텍스트 색상 |
  |---|---|---|---|
  | 미충족(기본) | `checklist-item` | `"○"` 또는 `"✕"` | `--color-text-muted`(#64748b) |
  | 충족 | `checklist-item checklist-item--met` | `"✓"` | `--color-text`(#1e293b) 또는 `--color-strength-strong`(#16a34a) |

- `empty` 상태에서는 4항목 전부 미충족(기본) 표시로 초기화된다(계약 §1.2 — 빈 문자열은 미충족 표시가 아닌 "초기 상태"로 명시되나, 시각적으로는 미충족과 동일한 기본 스타일을 사용하고 `pw-strength-label`의 초기 안내 텍스트로 empty임을 구분한다).
- 인터랙션: 입력 변경마다 4항목 전부 재평가하여 각 항목의 class를 즉시 갱신.

## 6. dev 구현 가이드

1. 루트 컨테이너에 id `password-strength-root`, class `password-strength`를 부여하고 §4.1 구조 그대로 마크업을 구성한다.
2. `pw-input`은 기본 `type="password"`로 시작(초기 `empty` 상태와 일치).
3. `pw-toggle` 클릭 핸들러에서 `pw-input.type`을 `password`/`text`로 토글하고, 동시에 `aria-pressed`, `aria-label`을 §5.2 표에 따라 갱신한다. 이 핸들러는 강도 상태 로직과 완전히 분리한다.
4. `pw-input`의 `input` 이벤트 핸들러에서:
   - 값이 `""`이면 `empty` 상태로 처리: `pw-strength-label` 텍스트를 초기 안내 문구로, `pw-strength-meter`에서 `strength-*` class 전부 제거, 체크리스트 4항목 모두 `checklist-item--met` 제거.
   - 값이 있으면 §1.1 4항목을 재계산 → 충족 개수로 §1.2 임계값에 따라 `weak|medium|strong` 산출 → `pw-strength-label` 텍스트/색, `pw-strength-meter`의 `strength-*` class, 4개 `checklist-item`의 `checklist-item--met` class를 모두 갱신한다.
5. 색상은 CSS 변수로 정의: 필수 4개(`--color-strength-weak`, `--color-strength-medium`, `--color-strength-strong`, `--space-control-gap`)는 §2에 명시된 값 그대로 `:root`에 선언. 이외 보조 변수(`--color-surface` 등)는 §2 표를 참고해 자유롭게 추가 가능(신규 이름 충돌만 피하면 됨).
6. 반응형은 `@media (max-width: 479px)` 등 breakpoint 없이도 `max-width: 100%; box-sizing: border-box`만으로 320px 대응이 가능하면 media query 없이 구현해도 무방하다(§4.3 원칙 충족이 핵심이며 특정 breakpoint 문법 강제 아님).
7. CDN/외부 라이브러리 금지 — 아이콘은 텍스트 문자(예: 이모지 또는 유니코드 기호)로 대체한다(§5.2, §5.5).
8. `password-strength.html`은 200줄 이하로 작성해야 하므로(DoD §4), 본 명세의 모든 상태 스타일을 인라인 `<style>` 내 class 선택자 조합으로 간결하게 구성할 것을 권장한다.

## 7. mockup 참조

- `docs/design/mockups/BF-1939-password-strength.html` — 위 명세를 시각적으로 표현한 self-contained 정적 mockup. 4가지 상태(`empty`/`weak`/`medium`/`strong`)를 섹션별로 나란히 배치하여 비교 가능하도록 구성. dev의 실제 산출물이 아니며 참고용 시각 시뮬레이션이다.
