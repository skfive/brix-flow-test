# 기간 변환기(duration-converter) 시각 명세 (BF-1970)

- Epic: BF-1969 / 본 문서 작성 Task: BF-1970 (designer)
- 작성자: 이디자인 (designer)
- 근거 문서: `docs/plans/BF-1969/implementation-plan.md` (BF-1972, planner, **frozen**)
- stack 규약: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
- 상태: 본 문서는 planner가 동결한 §2 UI 계약(파일 구성/DOM id/CSS class/상태명/토큰/접근성/반응형)을 **재정의하지 않고** 시각적으로 구체화한다.

> ⚠️ 본 문서와 mockup은 frozen 계약(파일 경로, DOM id 7개, CSS class 4개, 상태명 4종, 디자인 토큰 4개, 접근성, 반응형 기준)을 그대로 인용한다. 아래 표의 값은 모두 `docs/plans/BF-1969/implementation-plan.md` §2 원문과 동일하며, 색상 팔레트 중 frozen 토큰 외 배경/텍스트 색상만 designer 재량으로 추가한다.

## 1. 시안 개요

- **변경 범위**: 신규 단일 화면 위젯. "초 단위 값"(`seconds-input`)과 "사람이 읽는 기간 표현"(`duration-input`, 예: `1시간 30분`)을 양방향 실시간 변환한다.
- **사용자 경험 목표**:
  - 두 입력란 중 어느 쪽을 편집해도 즉시 반대쪽이 갱신된다는 확신을 주는 시각적 피드백(활성 필드 강조)을 제공한다.
  - 무효 입력은 지연 없이 즉시 오류로 안내하되(F2), 색상만이 아니라 상태명 텍스트로도 상태를 알 수 있게 한다(접근성 요구사항).
  - `quick-select-30s`/`5m`/`1h`/`1d` 버튼으로 대표값을 원클릭으로 채울 수 있게 해 반복 입력 부담을 줄인다.
  - 320px 폭(저사양/좁은 뷰포트)에서도 두 입력란과 quick-select 버튼 그룹이 겹치거나 잘리지 않는다.
- **비목표(out of scope)**: 실제 파싱/변환/디바운스 로직 구현(developer, BF-1971 담당), 새 DOM id/class/상태/토큰 정의(§2는 frozen).

## 2. 컬러 팔레트

### 2.1 Frozen 토큰 (재정의 금지 — planner §2.5 그대로 인용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-field-active` | `#2563eb` | `field--active` 강조(테두리/포커스 링) |
| `--color-field-error` | `#dc2626` | `field--error` 강조 및 `error-message` 텍스트 |
| `--color-action-primary` | `#2563eb` | `quick-select-btn` 배경/강조 |
| `--space-control-gap` | `12px` | 필드/버튼 그룹 간 수직·수평 간격 |

### 2.2 보조 팔레트 (designer 재량 — frozen 토큰과 충돌하지 않는 배경/텍스트 전용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg-page` | `#f8fafc` | 페이지 배경 |
| `--color-bg-surface` | `#ffffff` | 위젯 카드 배경 |
| `--color-border-default` | `#cbd5e1` | 기본(비활성) 필드 테두리 |
| `--color-text-primary` | `#0f172a` | 제목, 입력값, 라벨 본문 텍스트 |
| `--color-text-secondary` | `#64748b` | 캡션, quick-select 라벨 보조 설명 |
| `--color-action-primary-hover` | `#1d4ed8` | `quick-select-btn` hover/active |
| `--color-field-active-bg` | `#eff6ff` | `field--active` 배경 틴트(테두리 강조 보조) |
| `--color-field-error-bg` | `#fef2f2` | `field--error` 배경 틴트(테두리 강조 보조) |
| `--color-state-idle` | `#64748b` | idle 상태 배지 색 (비-frozen 보조 요소) |

## 3. 타이포그래피

`vanilla-static` 규약에 따라 외부 폰트 CDN을 쓰지 않고 system font stack만 사용한다.

```css
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| Heading (위젯 제목) | `var(--font-family-base)` | 20px | 700 | 1.3 |
| Body (라벨, 입력 텍스트) | `var(--font-family-base)` | 14px | 500(라벨) / 400(입력값) | 1.5 |
| Caption (state 배지, quick-select 버튼, error-message) | `var(--font-family-base)` | 13px | 500 | 1.4 |

## 4. 레이아웃

- **컨테이너**: 최대 너비 420px, 패딩 24px, `--color-bg-surface` 배경, 8px 라운드, 페이지 중앙 정렬(`--color-bg-page` 배경 위).
- **섹션 구조 (위→아래 수직 stack, 모든 뷰포트 공통)**:
  1. 위젯 제목 ("기간 변환기") + state 배지(현재 상태명 텍스트, 색상만이 아닌 텍스트로 상태 노출)
  2. `seconds-field` (label + `seconds-input`)
  3. `duration-field` (label + `duration-input`)
  4. `error-message` (내용 없을 때도 레이아웃 흔들림 방지를 위해 `min-height: 1.4em` 예약, 비어있으면 텍스트 없음)
  5. `quick-select-group` (4개 버튼, flex-wrap 행 배치)
- **간격**: 섹션 간 및 quick-select 버튼 간 간격은 frozen 토큰 `--space-control-gap`(12px)을 그대로 사용한다.
- **레이아웃 결정 근거(Simplicity First)**: 두 입력 필드를 모든 뷰포트에서 항상 세로로 stack한다. 별도의 "넓은 화면에서는 가로 배치" 같은 추가 breakpoint 분기를 두지 않는다 — frozen 요구사항은 320px에서의 세로 stack만 보장하면 되고, 항상 세로 배치를 쓰면 그 요구사항이 모든 뷰포트에서 자동으로 만족되며 반응형 분기 코드가 필요 없다.
- **Breakpoint 별 동작**:
  - **320px (frozen 기준)**: 컨테이너 패딩 16px로 축소, `seconds-field`/`duration-field`는 각각 100% 너비로 세로 stack, `quick-select-group`은 `flex-wrap: wrap`으로 2×2 배치(버튼 최소 너비 `calc(50% - var(--space-control-gap)/2)`), 어떤 텍스트도 컨테이너 밖으로 overflow 되지 않는다(입력값·버튼 라벨 `overflow-wrap: break-word` 또는 `text-overflow: ellipsis` 미적용 — 라벨이 짧아 여유 있음).
  - **≥480px**: 컨테이너 패딩 24px, `quick-select-group`은 1행 4열로 배치. 필드는 계속 세로 stack(§ 레이아웃 결정 근거 참조).

## 5. 컴포넌트 명세

### 5.1 `seconds-field` (wrapper, class: `field`)

- 자식: `<label for="seconds-input">`, `<input id="seconds-input" type="text" inputmode="numeric">`
- **props/속성**: `aria-label="초 단위 값 입력"` (frozen, §2.6)
- **상태**:
  | 상태 | wrapper class | 시각 |
  |---|---|---|
  | 기본(idle 또는 비활성) | `field` | 테두리 `--color-border-default` 1px |
  | 활성(`seconds-active`) | `field field--active` | 테두리 `--color-field-active` 2px, 배경 `--color-field-active-bg` |
  | 오류(`error`, 이 필드가 원인) | `field field--error` | 테두리 `--color-field-error` 2px, 배경 `--color-field-error-bg` |
- **인터랙션**: 포커스 시 native focus ring 유지(접근성), 값 입력은 developer 로직(BF-1971)이 처리 — 본 mockup은 정적 placeholder 값만 표시.

### 5.2 `duration-field` (wrapper, class: `field`)

- 자식: `<label for="duration-input">`, `<input id="duration-input" type="text">`
- **props/속성**: `aria-label="기간 표현 입력 (예: 1시간 30분)"` (frozen, §2.6)
- **상태**: `seconds-field`와 동일한 class/시각 규칙(§5.1 표), 단 활성/오류 트리거는 `duration-active`/이 필드발 오류일 때.

### 5.3 `error-message`

- `<p id="error-message" role="alert" aria-live="assertive">`
- **상태**: 비어있음(idle/seconds-active/duration-active) / 원인 텍스트 표시(error). 텍스트 색상 `--color-field-error`, 아이콘 없이 텍스트만(색상 의존 최소화 — 원인 필드의 `field--error` 테두리와 함께 이중으로 인지 가능).
- 예시 텍스트(§9 edge case 인용): "0 이상의 정수를 입력하세요", "형식을 인식할 수 없습니다 (예: 1시간 30분)", "값을 입력하세요", "값이 너무 큽니다".

### 5.4 `quick-select-group` (wrapper, 비-frozen id/class 명 developer 재량)

- 자식: 4개 `<button type="button" class="quick-select-btn">` — `id="quick-select-30s"`(라벨 "30초"), `id="quick-select-5m"`(라벨 "5분"), `id="quick-select-1h"`(라벨 "1시간"), `id="quick-select-1d"`(라벨 "1일")
- **시각**: 배경 `--color-action-primary`, 텍스트 흰색, hover/active 배경 `--color-action-primary-hover`, 라운드 6px, 패딩 8px 16px.
- **인터랙션**: 네이티브 `<button>`이므로 Tab 포커스 + Enter/Space 클릭 가능(frozen, §2.6). 클릭 시 두 필드 즉시 canonical 값으로 갱신(§3 T5, developer 로직) — 디바운스 미적용.

### 5.5 상태 배지 (state badge, 비-frozen 보조 요소)

Frozen 계약은 "모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출"할 것을 요구하지만(§2.6), 이를 위한 전용 DOM id는 정의하지 않았다. 이 요구를 만족시키기 위해 designer는 위젯 제목 옆에 **비-frozen 보조 요소**로 상태 배지를 제안한다(정확한 id/class 명은 developer 재량, 예: `.state-badge`).

| 상태 | 배지 텍스트 | 배지 색상 |
|---|---|---|
| `idle` | "대기 중" | `--color-state-idle` (회색) |
| `seconds-active` | "초 단위 입력 중" | `--color-field-active` |
| `duration-active` | "기간 입력 중" | `--color-field-active` |
| `error` | "오류" | `--color-field-error` |

- 배지는 `aria-live="polite"`로 상태 변경 시 스크린리더에도 전달되도록 권장한다(단, `error-message`의 `aria-live="assertive"`와 별개 — 즉각적 오류 안내는 `error-message`가 담당하고, 배지는 현재 상태의 지속적 텍스트 표기를 담당).
- 이 요소는 frozen 목록(§2.2/§2.3 DOM id/class)에 없으므로 developer가 정확한 마크업/명명을 자유롭게 정할 수 있다. 다만 "상태명을 화면 텍스트로 노출"한다는 요구사항 자체는 frozen이므로, 배지든 다른 형태든 반드시 어떤 형태로 구현해야 한다.

## 6. dev 구현 가이드 (BF-1971)

1. `duration-converter/index.html`은 `docs/plans/BF-1969/implementation-plan.md` §2.2 권장 마크업 골격을 그대로 사용하고, 본 문서 §5의 wrapper class(`field`, `field--active`, `field--error`, `quick-select-btn`)를 부여한다.
2. CSS 변수는 `:root`에 §2.1(frozen 4개) + §2.2(보조, designer 재량 9개)를 그대로 선언한다. 하드코딩 HEX 대신 변수를 참조한다.
3. `field--active`/`field--error`는 동시에 부여하지 않는다(상호 배타) — 활성 필드가 오류가 되면 `field--active`를 제거하고 `field--error`를 부여한다(§3 T3).
4. `error-message`는 항상 DOM에 존재하고 텍스트만 비우는 방식을 권장한다(요소 자체를 넣었다 뺐다 하면 `min-height` 레이아웃 예약이 무의미해짐).
5. 상태 배지(§5.5)는 `duration-converter-view` 컴포넌트(계획서 §8)에서 상태 전이 시점마다 텍스트를 갱신한다. `aria-live="polite"`.
6. 320px 반응형은 미디어쿼리 `@media (max-width: 359px)` 정도의 기준으로 컨테이너 패딩/quick-select 2열 wrap을 적용하되, 정확한 브레이크포인트 값은 developer가 §4 "Breakpoint 별 동작"의 의도(320px에서 겹침·overflow 없음)만 지키면 재량으로 조정 가능하다.
7. 색상/간격은 반드시 CSS 변수 참조 — `vanilla-static` 규약상 하드코딩 색상 금지, 프레임워크/외부 라이브러리 도입 금지.

## 7. mockup 참조

시각 mockup: `docs/design/mockup.html`

- 실제 변환 로직/이벤트 리스너 없이 idle / seconds-active / duration-active / error 4개 상태를 각각 정적 스냅샷 섹션으로 보여준다.
- 각 스냅샷은 frozen DOM id(`seconds-input`, `duration-input`, `error-message`, `quick-select-30s/5m/1h/1d`)를 그대로 사용하되, 하나의 HTML 문서 안에 4개 상태를 동시에 나란히 보여줘야 하는 mockup 특성상 id 중복을 피하기 위해 각 스냅샷 섹션에 `data-mock-state` 속성과 함께 id에 상태 접미사(`-idle`/`-seconds`/`-duration`/`-error`)를 붙인다. 실제 런타임 페이지(`duration-converter/index.html`)는 위젯 인스턴스가 하나뿐이므로 이 접미사 없이 frozen id를 그대로 1회씩만 사용한다(mockup 전용 예외이며 devnote로 mockup 상단에 명시).
