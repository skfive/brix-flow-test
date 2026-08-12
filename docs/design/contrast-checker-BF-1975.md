# 색상 대비 검사기(contrast-checker) 시각 명세 (BF-1976)

- Epic: BF-1975 / 본 문서 작성 Task: BF-1976 (designer)
- 작성자: 이디자인 (designer)
- 근거 문서: `docs/plans/BF-1975/implementation-plan.md` (BF-1978, planner, **frozen**), `ui-contract@v1` (sha256:89f06511f1952bab57858775d9331c210afb9dbd87e31dcdd84962bc7b5f2ec5)
- stack 규약: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
- 상태: 본 문서는 planner가 동결한 §2~9 UI 계약(파일 구성/DOM id/CSS class/상태명/토큰/접근성/반응형)을 **재정의하지 않고** 시각적으로 구체화한다.

> ⚠️ 본 문서와 mockup은 frozen 계약(DOM id 8개, CSS class 5개, 상태명 3종, 디자인 토큰 7개, 접근성, 반응형 기준)을 그대로 인용한다. 아래 표의 값은 모두 `docs/plans/BF-1975/implementation-plan.md` §3・§4・§7・§8・§9 원문과 동일하며, frozen 토큰 외 배경/보조 색상만 designer 재량으로 추가한다.

## 1. 시안 개요

- **변경 범위**: 신규 단일 화면 위젯. 전경색(`#contrast-foreground-input`)과 배경색(`#contrast-background-input`) hex 값을 입력받아 WCAG 2.x 상대 휘도 기반 대비율을 계산하고, AA/AAA/큰 텍스트 AA 판정 결과와 실제 색상 미리보기를 보여준다.
- **사용자 경험 목표**:
  - 두 입력 중 어느 쪽을 바꿔도 결과 카드(`contrast-checker__result-card`)와 미리보기(`#contrast-preview`)가 같은 화면 안에서 즉시 갱신된다는 확신을 주는 레이아웃을 제공한다.
  - 유효하지 않은 hex 입력은 `#contrast-error`에 `role="alert"`로 즉시 안내하되, 입력 control은 절대 비활성화하지 않아 사용자가 바로 수정할 수 있게 한다.
  - AA/AAA/큰 텍스트 AA 판정은 색상만이 아니라 "통과"/"실패" 같은 상태명 텍스트로도 노출해 색각 이상 사용자도 결과를 읽을 수 있게 한다.
  - 320px 폭에서도 입력 두 칸과 결과 카드가 가로 스크롤 없이 세로로 쌓인다.
- **비목표(out of scope)**: 실제 상대 휘도/대비율 계산, 상태 전이, DOM 갱신 로직 구현(developer, contrast.js 담당), 새 DOM id/class/상태/토큰 정의(§2~9는 frozen).

## 2. AC 매핑 표

| Acceptance Criteria | 대상 DOM/영역 | frozen 근거 |
|---|---|---|
| 입력 두 칸 (전경색/배경색) | `#contrast-foreground-input`, `#contrast-background-input` (class: `contrast-checker__input`) | 계획서 §3, §7 accessibility |
| 결과 카드 (대비율 + AA/AAA/큰 텍스트 AA) | `.contrast-checker__result-card` 내부 `#contrast-ratio-value`, `#contrast-aa-result`, `#contrast-aaa-result`, `#contrast-aa-large-result` | 계획서 §3, §6 |
| 미리보기 | `#contrast-preview` (class: `contrast-checker__preview`) | 계획서 §3 |
| 오류 표시 | `#contrast-error` (class: `contrast-checker__error`, `role="alert"`) | 계획서 §3, §8 |

## 3. 컬러 팔레트

### 3.1 Frozen 토큰 (재정의 금지 — planner §7 그대로 인용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-text-primary` | `#1f2933` | 본문/제목/입력값 텍스트 |
| `--color-bg-page` | `#ffffff` | 페이지 배경 |
| `--color-border-input` | `#cbd5e1` | 입력 control 기본 테두리 |
| `--color-error` | `#b91c1c` | `contrast-checker__error` 텍스트, 오류 상태 강조 |
| `--color-pass` | `#15803d` | AA/AAA/큰 텍스트 AA "통과" 강조 |
| `--space-section-gap` | `16px` | 섹션(입력 그룹/결과 카드/미리보기/오류) 간 수직 간격 |
| `--font-family-base` | `system-ui, -apple-system, "Segoe UI", sans-serif` | 전체 폰트 |

### 3.2 보조 팔레트 (designer 재량 — frozen 토큰과 충돌하지 않는 배경/텍스트/실패 전용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg-surface` | `#f8fafc` | 위젯 카드 배경(페이지 배경과 구분) |
| `--color-bg-card` | `#ffffff` | 결과 카드/미리보기 내부 배경 |
| `--color-text-secondary` | `#52606d` | 라벨, 보조 설명 텍스트 |
| `--color-fail` | `#b91c1c` | AA/AAA/큰 텍스트 AA "실패" 강조 (frozen `--color-error`와 동일 값, 의미 구분용 별칭) |
| `--color-error-bg` | `#fef2f2` | `contrast-checker__error` 배경 틴트(텍스트 색상만이 아닌 이중 신호) |

## 4. 타이포그래피

`vanilla-static` 규약에 따라 외부 폰트 CDN을 쓰지 않고 frozen `--font-family-base`(system font stack)만 사용한다.

```css
--font-family-base: system-ui, -apple-system, "Segoe UI", sans-serif;
```

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| Heading (위젯 제목 "색상 대비 검사기") | `var(--font-family-base)` | 20px | 700 | 1.3 |
| Body (라벨, 입력 텍스트, 대비율 값) | `var(--font-family-base)` | 14px | 500(라벨) / 400(입력값) | 1.5 |
| 대비율 강조값(`#contrast-ratio-value`) | `var(--font-family-base)` | 24px | 700 | 1.2 |
| Caption (판정 결과 텍스트, `#contrast-error`) | `var(--font-family-base)` | 13px | 500 | 1.4 |

## 5. 레이아웃

- **컨테이너**: `.contrast-checker` 최대 너비 480px, 패딩 24px, `--color-bg-surface` 배경, 8px 라운드, 페이지 중앙 정렬(`--color-bg-page` 배경 위).
- **섹션 구조 (위→아래 수직 stack, 모든 뷰포트 공통, 간격 `--space-section-gap`)**:
  1. 위젯 제목 ("색상 대비 검사기")
  2. 입력 영역 — `#contrast-foreground-input`, `#contrast-background-input` (각각 라벨 + `contrast-checker__input`)
  3. `#contrast-error` (`contrast-checker__error`, `role="alert"`) — idle/valid 상태에서는 내용 없이 `min-height` 예약, error 상태에서만 텍스트 채움
  4. `.contrast-checker__result-card` — `#contrast-ratio-value` + `#contrast-aa-result`/`#contrast-aa-large-result`/`#contrast-aaa-result`
  5. `.contrast-checker__preview` (`#contrast-preview`)
- **간격**: 섹션 간 간격은 frozen 토큰 `--space-section-gap`(16px)을 그대로 사용한다.
- **레이아웃 결정 근거(Simplicity First)**: 두 입력 필드와 결과 카드를 모든 뷰포트에서 항상 세로로 stack한다. 별도의 "넓은 화면에서는 가로 배치" 분기를 두지 않는다 — frozen 요구사항은 320px에서의 세로 stack만 보장하면 되고, 항상 세로 배치를 쓰면 이 요구사항이 모든 뷰포트에서 자동으로 만족되며 반응형 분기 코드가 필요 없다.
- **Breakpoint 별 동작**:
  - **320px (frozen 기준, §9)**: 컨테이너 패딩 16px로 축소, 입력 두 칸은 각각 100% 너비로 세로 stack, 결과 카드/미리보기도 100% 너비. 어떤 텍스트도 컨테이너 밖으로 overflow 되지 않는다.
  - **≥480px**: 컨테이너 패딩 24px 유지, 입력 두 칸은 좌우 대칭 2열 그리드(`grid-template-columns: 1fr 1fr`, gap `--space-section-gap`)로 배치 가능(§9는 세로 stack만 frozen 요구사항이므로, 이 2열 배치는 320px~479px에서는 적용하지 않고 480px 이상에서만 designer 재량으로 제안). 필드가 2열이어도 각 필드 내부 라벨+입력은 계속 세로 stack.

## 6. 컴포넌트 명세

### 6.1 색상 입력 그룹 (전경/배경 공통 구조)

- 마크업: `<label>` + `<input id="contrast-foreground-input" class="contrast-checker__input" type="text">` (배경도 동일 구조로 `contrast-background-input`)
- **props/속성(frozen, §8)**: `#contrast-foreground-input` → `aria-label="전경색 (hex)"`, `#contrast-background-input` → `aria-label="배경색 (hex)"`
- **상태**:
  | 상태 | 시각 |
  |---|---|
  | idle/valid (기본) | 테두리 `--color-border-input` 1px, 배경 `--color-bg-card` |
  | 포커스 | native focus ring 유지(접근성) + 테두리 `--color-text-primary` |
  | error 상태에서도 | disabled 금지, 테두리는 기본과 동일(오류 신호는 `#contrast-error`가 전담 — 입력 자체를 색으로만 구분하지 않음, frozen §8) |
- **인터랙션**: 값 변경 시 실제 검증/계산은 developer 로직(contrast.js)이 처리 — 본 mockup은 정적 placeholder 값만 표시.

### 6.2 결과 카드 (`.contrast-checker__result-card`)

- 자식: `<p>` 내부 `<span id="contrast-ratio-value">` (대비율, 예: `4.53:1`) + 판정 3종(`#contrast-aa-result`, `#contrast-aa-large-result`, `#contrast-aaa-result`)
- **판정 기준(frozen, 계획서 §6)**:
  | 검사 항목 | 임계값 | 대상 DOM |
  |---|---|---|
  | AA (일반 텍스트) | `ratio >= 4.5` | `#contrast-aa-result` |
  | AAA (일반 텍스트) | `ratio >= 7` | `#contrast-aaa-result` |
  | AA 큰 텍스트 | `ratio >= 3` | `#contrast-aa-large-result` |
- **시각**: 각 판정 항목은 배지 형태, 통과 시 `--color-pass` 테두리/텍스트, 실패 시 `--color-fail` 테두리/텍스트 + 반드시 "통과"/"실패" 텍스트를 함께 노출(색상만으로 구분 금지, frozen §8).
- **idle 상태**: 결과 카드는 placeholder(`–` 또는 "입력 대기 중") 표시.

### 6.3 미리보기 (`#contrast-preview`, class: `contrast-checker__preview`)

- 전경/배경 색상을 실제 `color`/`background-color`로 적용한 샘플 텍스트 블록(예: "가나다 Aa 텍스트 미리보기").
- 최소 높이 96px, 라운드 6px, 패딩 16px, 중앙 정렬.
- idle 상태에서는 frozen 토큰 `--color-text-primary` / `--color-bg-page`로 기본 표시.

### 6.4 오류 표시 (`#contrast-error`, class: `contrast-checker__error`)

- `<p id="contrast-error" class="contrast-checker__error" role="alert">` — `role="alert"`로 스크린리더에 즉시 통지(frozen §8).
- 텍스트: `--color-error` 색상 + `--color-error-bg` 배경 틴트(색상 의존 최소화를 위한 이중 신호), 예시 문구 "전경색 형식이 올바르지 않습니다. #RGB 또는 #RRGGBB 형식으로 입력하세요."
- idle/valid 상태에서는 텍스트 없이 `min-height: 1.4em`만 예약해 레이아웃 흔들림을 방지한다(요소는 항상 DOM에 존재).

## 7. dev 구현 가이드

1. `contrast-checker/index.html`은 `docs/plans/BF-1975/implementation-plan.md` §3 DOM 계약(id 8개, class 5개)을 그대로 사용하고, 본 문서 §6의 시각 규칙을 CSS로 구현한다.
2. CSS 변수는 `:root`에 §3.1(frozen 7개) + §3.2(보조, designer 재량 5개)를 그대로 선언한다. 하드코딩 HEX 대신 변수를 참조한다(`vanilla-static` 규약).
3. `#contrast-error`는 항상 DOM에 존재하고 텍스트만 비우는 방식을 권장한다(요소 자체를 넣었다 뺐다 하면 `min-height` 레이아웃 예약이 무의미해짐).
4. 두 입력 control은 error 상태에서도 `disabled` 속성을 절대 추가하지 않는다(frozen invariant, 계획서 §4).
5. idle/error 상태에서 결과 카드·미리보기는 이전 valid 결과를 유지하지 않고 초기값(placeholder)으로 되돌린다(계획서 §4 상태 모델 — error 상태는 결과 영역을 idle과 동일하게 비운다).
6. 320px 반응형은 미디어쿼리 `@media (max-width: 479px)` 정도의 기준으로 §5의 2열 그리드를 해제하고 세로 stack으로 전환하되, 정확한 브레이크포인트 값은 developer가 §5 "Breakpoint 별 동작"의 의도(320px에서 겹침·overflow 없음)만 지키면 재량으로 조정 가능하다.
7. 색상/간격은 반드시 CSS 변수 참조 — `vanilla-static` 규약상 하드코딩 색상 금지, 프레임워크/외부 라이브러리 도입 금지.
8. DOM id/class/토큰 값을 변경·재정의하지 않는다. 변경이 필요하다고 판단되면 코드로 직접 반영하지 말고 PR 설명/Jira 코멘트로 planner에게 재검토를 요청한다.

## 8. mockup 참조

시각 mockup: `docs/design/mockups/contrast-checker-BF-1975-mockup.html`

- 실제 대비율 계산/이벤트 리스너 없이 idle / valid / error 3개 상태를 각각 정적 스냅샷 섹션으로 보여준다.
- 각 스냅샷은 frozen DOM id(`contrast-foreground-input`, `contrast-background-input`, `contrast-ratio-value`, `contrast-aa-result`, `contrast-aa-large-result`, `contrast-aaa-result`, `contrast-preview`, `contrast-error`)를 그대로 사용하되, 하나의 HTML 문서 안에 3개 상태를 동시에 나란히 보여줘야 하는 mockup 특성상 id 중복을 피하기 위해 각 스냅샷 섹션에 `data-mock-state` 속성과 함께 id에 상태 접미사(`-idle`/`-valid`/`-error`)를 붙인다. 실제 런타임 페이지(`contrast-checker/index.html`)는 위젯 인스턴스가 하나뿐이므로 이 접미사 없이 frozen id를 그대로 1회씩만 사용한다(mockup 전용 예외이며 devnote로 mockup 상단에 명시).
