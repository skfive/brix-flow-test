# BF-1925 · 색상 팔레트 생성기 구현 설계

> 이 문서는 BF-1922 Epic frozen Execution Blueprint 의 `ui-contract@v1`
> (interface_checksum `sha256:5e09d7cb...0206a55`) 를 있는 그대로 서술한 구현 설계입니다.
> 파일·소유자·상태 계약은 frozen blueprint 가 유일한 권위이며, 이 문서는 그 계약을
> **재정의하지 않고** designer(BF-1923)/developer(BF-1924) 가 그대로 구현할 수 있는
> exact 수준으로 구체화만 합니다. 새 파일·새 역할·새 selector·새 토큰은 추가하지 않습니다.

## 0. 산출물 소유권 (frozen — 재확인용)

| 파일 | 소유자 | 정책 |
|---|---|---|
| `color-palette.html` | developer (BF-1924) | additive |
| `docs/design/BF-1922/color-palette-contract.md` | designer (BF-1923) | additive |
| `docs/plans/BF-1922/implementation-plan.md` (본 문서) | planner (BF-1925) | — |

이 문서는 위 두 산출물의 **내용 계약**을 정의합니다. 두 파일 모두 아직 저장소에 존재하지 않으며,
frozen policy 상 신규 생성이 아니라 blueprint 에 이미 예정된 additive 산출물입니다.

## 1. 개요

기준색(base color) 1개를 입력하면 보색·유사색·삼각 배색 3종 팔레트를 즉시 계산해
카드 목록으로 보여주고, 각 카드를 클릭/키보드로 활성화하면 HEX 값을 클립보드에 복사하는
정적 단일 파일(`color-palette.html`) 화면입니다. 서버·네트워크 의존이 없는 클라이언트 전용 로직이며
영속 저장(localStorage 등)은 blueprint 범위에 없으므로 설계하지 않습니다(비목표, §9 참조).

## 2. DOM 구조 (exact)

frozen `dom_ids` / `css_classes` 를 아래 구조로 배치합니다. id·class 이름은 그대로 사용하고
재정의하지 않습니다. 들여쓰기 안의 주석 없는 태그/속성만 계약이며, 괄호 주석은 구현 참고용입니다.

```html
<body>
  <main id="color-palette-root">
    <section class="base-color-panel">
      <label for="base-color-input">기준 색상</label>
      <input type="color" id="base-color-input" value="#2563eb">
      <label for="base-color-hex">HEX</label>
      <input type="text" id="base-color-hex" value="#2563EB"
             pattern="^#[0-9A-Fa-f]{6}$" inputmode="text" autocomplete="off">
    </section>

    <section class="palette-section" id="palette-complementary" aria-label="보색 팔레트">
      <h2 class="palette-section__title">보색 (Complementary)</h2>
      <div class="palette-section__cards">
        <!-- color-card × 2, §4.3 순서대로 -->
        <div class="color-card" tabindex="0" role="button"
             aria-label="{색상명 또는 순번} {HEX값}">
          <span class="color-card__hex">#RRGGBB</span>
        </div>
      </div>
    </section>

    <section class="palette-section" id="palette-analogous" aria-label="유사색 팔레트">
      <h2 class="palette-section__title">유사색 (Analogous)</h2>
      <div class="palette-section__cards">
        <!-- color-card × 3, §4.3 순서대로 -->
      </div>
    </section>

    <section class="palette-section" id="palette-triadic" aria-label="삼각 배색 팔레트">
      <h2 class="palette-section__title">삼각 배색 (Triadic)</h2>
      <div class="palette-section__cards">
        <!-- color-card × 3, §4.3 순서대로 -->
      </div>
    </section>

    <div id="copy-feedback" role="status" aria-live="polite"></div>
  </main>
</body>
```

규칙:
- `#color-palette-root`, `#base-color-input`, `#base-color-hex`, `#palette-complementary`,
  `#palette-analogous`, `#palette-triadic`, `#copy-feedback` 은 각 1개씩만 존재합니다.
- `.color-card` 는 각 `.palette-section` 안에 §4.3 순서대로 반복되며, 내부에 정확히 1개의
  `.color-card__hex` 를 포함합니다.
- `.palette-section__cards`, `role="button"`, `tabindex="0"`, `aria-label` 은 구현 세부이며
  frozen selector 목록에는 없지만 §6 접근성 요구를 만족하기 위해 developer 가 추가해야 하는
  최소 보조 속성입니다(신규 blueprint selector 로 취급하지 않음).

## 3. 색상 계산 로직

### 3.1 HEX → RGB → HSL

```
입력: hex = "#RRGGBB"
r = parseInt(hex.slice(1,3),16) / 255
g = parseInt(hex.slice(3,5),16) / 255
b = parseInt(hex.slice(5,7),16) / 255

max = max(r,g,b); min = min(r,g,b)
l = (max+min) / 2

if (max === min) {
  h = 0; s = 0
} else {
  d = max - min
  s = l > 0.5 ? d/(2-max-min) : d/(max+min)
  if (max === r) h = ((g-b)/d + (g < b ? 6 : 0))
  else if (max === g) h = (b-r)/d + 2
  else h = (r-g)/d + 4
  h = h * 60
}
// 결과: h ∈ [0,360), s,l ∈ [0,1]
```

### 3.2 HSL → RGB → HEX (역변환, 카드 렌더링에 사용)

```
입력: h ∈ [0,360), s,l ∈ [0,1]
if (s === 0) {
  r = g = b = l
} else {
  q = l < 0.5 ? l*(1+s) : l+s-l*s
  p = 2*l - q
  r = hue2rgb(p, q, h/360 + 1/3)
  g = hue2rgb(p, q, h/360)
  b = hue2rgb(p, q, h/360 - 1/3)
}
hex = "#" + [r,g,b].map(c => round(c*255).toString(16).padStart(2,"0")).join("").toUpperCase()

function hue2rgb(p, q, t) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1/6) return p + (q-p)*6*t
  if (t < 1/2) return q
  if (t < 2/3) return p + (q-p)*(2/3-t)*6
  return p
}
```

### 3.3 팔레트별 hue 산출 공식 + 카드 순서 (exact)

기준색의 `h, s, l` 을 §3.1 로 구한 뒤, 팔레트별로 `s, l` 은 고정하고 `h` 만 회전합니다.
카드는 아래 순서 그대로 DOM 에 렌더링합니다(왼쪽이 먼저 나오는 첫 번째 카드).

| 팔레트 | id | hue 목록 (기준색 h 사용) | 카드 수 |
|---|---|---|---|
| 보색 | `#palette-complementary` | `[h, (h+180) % 360]` | 2 |
| 유사색 | `#palette-analogous` | `[(h-30+360)%360, h, (h+30)%360]` | 3 |
| 삼각 배색 | `#palette-triadic` | `[h, (h+120)%360, (h+240)%360]` | 3 |

각 hue 값을 §3.2 공식에 `s, l` 은 기준색과 동일하게 대입해 카드별 HEX 를 얻고, 그 값을
`.color-card__hex` 텍스트와 `.color-card` 배경색(`background-color`)에 사용합니다.

무채색 예외: 기준색이 `s === 0`(회색/흑/백) 이면 hue 회전은 시각적으로 의미가 없지만
계산은 그대로 수행합니다(회전해도 `s=0` 이므로 §3.2 는 항상 `r=g=b=l` 을 반환 — 3개 팔레트
모두 기준색과 동일한 무채색 카드가 나옵니다). 별도 분기 처리를 하지 않습니다.

## 4. 상태 모델 (idle / computing / invalid / copied)

상태는 화면 전역에 1개만 존재하며(동시에 2개 상태가 활성화되지 않음),
`#copy-feedback` 의 텍스트 콘텐츠와 `data-state` 속성(구현 편의, 값: 위 4종)으로 노출합니다.

| 상태 | 진입 트리거 | 진입 시 동작 | 종료(다음 상태) |
|---|---|---|---|
| `idle` | 초기 로드, 또는 `copied`/`invalid` 타임아웃 | `#copy-feedback` 텍스트 비움 또는 "대기 중" 등 중립 안내, 팔레트는 최신 유효값 표시 | 사용자 입력 발생 시 `computing` 또는 `invalid` |
| `computing` | `#base-color-input` change 또는 `#base-color-hex` 가 유효 패턴으로 입력(디바운스 150ms) | §3 공식으로 3개 팔레트 재계산, `#copy-feedback` 에 "계산 중" 노출(선택) | 계산 완료 즉시 `idle` |
| `invalid` | `#base-color-hex` 값이 `/^#[0-9A-Fa-f]{6}$/` 불일치(디바운스 150ms 후 blur 또는 input) | 팔레트 재계산 **하지 않음**(직전 유효 팔레트 유지), `#copy-feedback` 에 "잘못된 HEX 형식입니다" 텍스트 노출 | 유효한 값 재입력 시 `computing`, 그 외 별도 타임아웃 없이 사용자가 값을 고칠 때까지 유지 |
| `copied` | `.color-card` 클릭 또는 포커스 상태에서 Enter/Space | 해당 카드 HEX 를 클립보드에 기록, `#copy-feedback` 에 "{HEX} 복사됨" 노출 | 1500ms 후 자동으로 `idle` |

복구 불변식(초기화·취소·실패 뒤 원복): `invalid` 진입 시에도 `#base-color-input`,
`#base-color-hex`, 모든 `.color-card` 는 계속 조작 가능해야 하며(비활성화 금지),
클립보드 복사 실패(§5 edge case) 시에도 `idle` 로 복귀해 재시도가 가능해야 합니다.

## 5. 명도 기반 텍스트 대비 규칙 (exact)

각 `.color-card` 의 배경 RGB(0~255)로 아래 밝기 공식(YIQ 근사)을 계산합니다.

```
brightness = (R*299 + G*587 + B*114) / 1000
```

- `brightness >= 128` → 밝은 배경 → `.color-card__hex` 글자색 = `--color-text-on-light`(`#111111`)
- `brightness < 128` → 어두운 배경 → `.color-card__hex` 글자색 = `--color-text-on-dark`(`#ffffff`)

포커스 표시는 배경 밝기와 무관하게 `--color-focus-ring`(`#2563eb`) outline 을 사용합니다
(`:focus-visible` 등, 대비 전환 로직과 분리된 별도 스타일).

## 6. 접근성 (frozen — 구현 지침으로 구체화)

- 각 `.color-card` 는 `aria-label` 에 색상명 또는 팔레트 내 순번과 HEX 값을 함께 포함합니다
  (예: `aria-label="보색 2 - #DB6725"`). 색상명이 없으면 "팔레트명 + 순번" 으로 대체합니다.
- `#copy-feedback` 은 `aria-live="polite"` + `role="status"` 로 상태 전이 결과를 스크린리더에 알립니다.
- `.color-card` 는 `tabindex="0"` 으로 Tab 포커스가 가능하고, 같은 `.palette-section` 안에서
  좌/우(또는 상/하) 화살표 키로 인접 카드로 포커스 이동, Enter/Space 로 복사를 트리거합니다.
- `idle/computing/invalid/copied` 4개 상태는 색상만으로 구분하지 않고 `#copy-feedback` 텍스트와
  접근성 이름(`aria-live` 알림)으로 상태명을 노출합니다.

## 7. 반응형 (frozen — 구현 지침으로 구체화)

- 320px 뷰포트: `.palette-section__cards` 가 `flex-wrap: wrap`(또는 grid 자동 줄바꿈)으로
  카드가 다음 줄로 넘어가되, 카드나 텍스트가 컨테이너 밖으로 overflow 되지 않습니다.
- 480px 미만: 3개 `.palette-section`(`#palette-complementary`, `#palette-analogous`,
  `#palette-triadic`) 이 가로 배치가 아닌 세로 스택으로 전환됩니다.
- 카드 간 간격은 `--space-card-gap`(`12px`), 카드 모서리는 `--radius-card`(`8px`) 를 모든
  뷰포트에서 동일하게 사용합니다.

## 8. Edge Case / 실패 케이스

- **잘못된 HEX 텍스트 입력**: §4 `invalid` 상태로 전이, 팔레트 재계산 없음, 직전 유효 팔레트 유지.
- **Clipboard API 미지원/거부**: `navigator.clipboard.writeText` 실패(미지원 또는 권한 거부) 시
  `document.execCommand('copy')` fallback 을 시도합니다. fallback 도 실패하면 `copied` 대신
  `invalid` 상태로 전이하고 `#copy-feedback` 에 "복사에 실패했습니다" 를 노출한 뒤, 자동으로
  `idle` 로 복귀합니다(사용자가 값을 고칠 필요는 없으므로 `invalid` 의 "유효 입력 전까지 유지"
  규칙과 달리 이 경우는 §4 `copied` 와 동일하게 1500ms 후 `idle` 복귀).
  초기화/취소/실패 뒤에도 `.color-card` 와 입력 필드는 계속 사용 가능해야 합니다.
- **무채색 기준색(s=0, 회색/흑/백)**: §3.3 무채색 예외에 따라 hue 회전이 일어나도 계산 결과는
  기준색과 동일한 무채색 카드로 표시됩니다(별도 오류 아님).
- **극단 명도(l=0 또는 l=1, 순수 흑/백 기준색)**: §3.1/§3.2 공식을 그대로 적용하며 별도 분기 없이
  `s=0` 결과가 자연히 나옵니다.
- **연속 빠른 재입력**: `computing` 진입 트리거에 150ms 디바운스를 적용해 매 키 입력마다
  재계산이 중첩되지 않도록 합니다.

## 9. 비목표 (Non-goals, blueprint 범위 밖)

- 팔레트/테마의 localStorage 영속 저장 — frozen `ui-contract` 에 저장 키 명세가 없으므로 설계하지 않음.
- `color-palette.html` 외 신규 파일, 신규 selector/토큰, 신규 페르소나 역할 — 모두 추가하지 않음.
- 서버 API·네트워크 요청 — 클라이언트 전용 정적 파일이므로 해당 없음(§1).

## 10. Acceptance Criteria (Given/When/Then)

**AC-1 기준색 입력 → 3종 팔레트 계산**
- Given `#color-palette-root` 가 idle 상태로 로드되어 있다
- When 사용자가 `#base-color-input` 값을 변경하거나 `#base-color-hex` 에 유효한 `#RRGGBB` 를 입력한다
- Then §3.3 hue 공식대로 `#palette-complementary`(2장) · `#palette-analogous`(3장) ·
  `#palette-triadic`(3장) 의 `.color-card__hex` 값이 재계산되어 표시되고 상태는 `computing` → `idle` 순으로 전이한다

**AC-2 잘못된 HEX 입력**
- Given 팔레트가 유효한 기준색으로 표시되어 있다
- When 사용자가 `#base-color-hex` 에 `/^#[0-9A-Fa-f]{6}$/` 에 맞지 않는 값을 입력한다
- Then 상태가 `invalid` 로 전이하고 `#copy-feedback` 에 오류 텍스트가 노출되며 팔레트 값은 변경되지 않는다

**AC-3 클릭 복사**
- Given `.color-card` 가 화면에 표시되어 있다
- When 사용자가 카드를 클릭하거나 포커스 상태에서 Enter/Space 를 누른다
- Then 해당 카드의 HEX 가 클립보드에 복사되고 상태가 `copied` 로 전이해 `#copy-feedback` 에 결과가 알려지며 1500ms 후 `idle` 로 복귀한다

**AC-4 명도 기반 글자색 전환**
- Given 서로 다른 밝기의 배경색을 가진 두 `.color-card` 가 있다
- When 카드가 렌더링된다
- Then §5 공식에 따라 밝은 배경 카드는 `--color-text-on-light`, 어두운 배경 카드는 `--color-text-on-dark` 텍스트색을 사용한다

**AC-5 키보드 접근성**
- Given 팔레트가 렌더링되어 있다
- When 사용자가 Tab/화살표 키로 카드 간 이동한다
- Then 포커스가 같은 `.palette-section` 내 인접 카드로 이동하고 `--color-focus-ring` 아웃라인이 표시된다

**AC-6 복사 실패 복구**
- Given Clipboard API 와 `execCommand` fallback 이 모두 실패하는 환경이다
- When 사용자가 카드를 클릭한다
- Then `invalid` 상태로 전이 후 자동으로 `idle` 로 복귀하며 입력 필드/카드는 계속 조작 가능하다

**AC-7 반응형**
- Given 뷰포트 너비가 320px 이다
- When 팔레트가 렌더링된다
- Then `.palette-section__cards` 내 카드가 줄바꿈되어도 콘텐츠 overflow 가 없고, 480px 미만에서는 3개 `.palette-section` 이 세로로 스택된다

## 11. API / 데이터 모델

해당 없음 — `color-palette.html` 은 서버 API·영속 데이터 저장이 없는 클라이언트 전용 정적 파일입니다(§9).
