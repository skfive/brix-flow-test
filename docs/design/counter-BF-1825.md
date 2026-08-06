# 클릭 카운터 시각 명세 (BF-1825)

> designer packet: BF-1826 · planner 가 동결한 `ui-contract@v1` / `planning-contract@v1` 을 시각 명세로 렌더링한다.
> 이 문서는 frozen UI 계약의 selector·token·상태·접근성·반응형을 **재정의하지 않고 그대로 반영**한다. developer 는 이 명세와 `docs/plans/BF-1825/implementation-plan.md` 를 함께 따른다.
> 참조 구현 설계: `docs/plans/BF-1825/implementation-plan.md`

## 1. 시안 개요

- **변경 범위**: 정적 클릭 카운터 페이지의 시각 표현(레이아웃, token 적용, 상태별 화면). 새 파일·selector·token 을 추가하지 않는다.
- **사용자 경험 목표**: 방문자가 `+1` 버튼으로 클릭 횟수를 세고, `초기화` 버튼으로 언제든 0 으로 되돌린다. 카운트 변화는 화면 텍스트로 즉시 보이고, 스크린리더에도 즉시 전달된다.
- **실행 모델**: backend repo 는 vanilla-static. 외부 의존성 0 건, system font, CSS 변수 자체 정의. mockup 은 시안 시각화용이며 실제 dev 산출물이 아니다.
- **소유권**: 본 designer task 의 산출물은 이 문서(`docs/design/counter-BF-1825.md`)뿐이다. `iteration-check2/counter.html`·`counter.js`·`counter.test.js` 는 developer 소유이며 여기서 생성하지 않는다.

## 2. 컬러 팔레트

frozen `design_tokens` 3 종을 그대로 사용한다. 그 밖의 색은 명세 목적의 중립 보조색이며 developer 는 계약 token 만 필수로 참조한다.

| 역할 | CSS 변수 | HEX | 계약 여부 |
| --- | --- | --- | --- |
| primary (주 실행 control) | `--color-action-primary` | `#2563eb` | ✅ frozen |
| text (카운트 표시) | `--color-count-text` | `#111827` | ✅ frozen |
| background (페이지 배경) | `--counter-bg` | `#f9fafb` | 보조(명세용) |
| surface (카드 배경) | `--counter-surface` | `#ffffff` | 보조(명세용) |
| border (카드 테두리) | `--counter-border` | `#e5e7eb` | 보조(명세용) |
| primary-hover (증가 버튼 hover) | `--counter-action-primary-hover` | `#1d4ed8` | 보조(명세용) |
| reset control (초기화 버튼) | `--counter-reset-fg` | `#111827` | 보조(명세용) |

- **계약 불변**: `--color-action-primary=#2563eb`, `--color-count-text=#111827` 은 값·변수명을 변경하지 않는다.
- 증가 버튼(`#counter-increment`)은 `--color-action-primary` 를 배경으로, 흰색 글자를 얹어 주 실행 control 임을 색으로 강조한다.
- 초기화 버튼(`#counter-reset`)은 보조 control 로, 배경 없는 outline(테두리 `--counter-border`, 글자 `--counter-reset-fg`)로 표현해 증가 버튼과 위계를 구분한다.

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack 을 사용한다.

| 요소 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 카운트 표시 (`.counter__value`) | system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif | 28px | 700 | 1.3 |
| 버튼 라벨 (`.counter__increment`, `.counter__reset`) | 동일 | 16px | 600 | 1.2 |

- 카운트 텍스트 색은 `--color-count-text`(`#111827`)를 사용한다.
- 카운트 표시는 화면에서 가장 큰 요소로, 상태 변화(숫자 갱신)가 한눈에 보이도록 한다.

## 4. 레이아웃

### 4.1 섹션 구조

페이지는 단일 카운터 카드 한 개로 구성된다. frozen DOM 골격(§6.1)을 그대로 시각화한다.

```
page (배경 --counter-bg, 카드 수직·수평 중앙)
└─ #counter-root .counter  (카드: surface 배경, 테두리, radius, padding)
   ├─ #counter-value .counter__value        ← "클릭 횟수: 0"
   └─ .counter__controls                     ← 버튼 그룹 (가로 배치)
      ├─ #counter-increment .counter__increment  ← "+1"
      └─ #counter-reset .counter__reset          ← "초기화"
```

### 4.2 spacing

- 카드 `.counter` padding: 24px, border-radius: 12px, 테두리 1px `--counter-border`.
- 카운트 표시와 버튼 그룹 사이 세로 간격: 16px.
- 버튼 그룹 `.counter__controls` 내부 control 간 간격: `--space-control-gap`(**frozen `12px`**). `display:flex; gap: var(--space-control-gap)` 로 구현한다.

### 4.3 breakpoint 별 동작

| 뷰포트 | 동작 |
| --- | --- |
| ≥ 480px | 카드 폭 auto(최대 360px), 버튼 그룹 가로 배치. |
| 320px ~ 479px | 카드가 좌우 여백(16px)을 두고 화면 폭에 맞춰 축소. 버튼 그룹은 `--space-control-gap` 간격을 유지하며 가로 배치를 유지하되, 폭이 부족하면 `flex-wrap: wrap` 으로 줄바꿈해 **content overflow(가로 스크롤·잘림)를 발생시키지 않는다**. |

- **frozen 반응형 계약**: 320px 이상에서 카운터 카드와 버튼 그룹에 content overflow 가 없어야 한다. 카드에 `max-width:100%`, `box-sizing:border-box` 를 적용하고 버튼은 `min-width` 를 강제하지 않는다.

## 5. 상태별 화면 표현

frozen `states` 텍스트를 **글자 그대로** 반영한다. `#counter-value` 의 텍스트만 상태에 따라 바뀌며, DOM 구조·selector 는 상태와 무관하게 고정이다.

| 상태 | 트리거 | `#counter-value` 텍스트 | 화면 표현 |
| --- | --- | --- | --- |
| 초기 | 페이지 로드 | `클릭 횟수: 0` | 카운트 `0` 표시, `+1`·`초기화` 버튼 활성. |
| 증가 | `#counter-increment` 클릭마다 | `클릭 횟수: N` (N = 현재 카운트) | 클릭 1 회당 숫자 1 증가, 텍스트 즉시 갱신. |
| 초기화 | `#counter-reset` 클릭 | `클릭 횟수: 0` 으로 복원 | 숫자 0 복원, `#counter-increment` 재사용 가능. |

- **초기화 후조건(frozen invariant)**: 초기화 뒤에는 상태와 진행 표시를 초기값(0)으로 되돌리고, 주 실행 control(`#counter-increment`)을 다시 사용할 수 있어야 한다.
- 카운트는 음수가 될 수 없다(증가·초기화만 존재, 감소 없음). 초기 상태(0)에서 `초기화` 를 눌러도 `클릭 횟수: 0` 을 유지한다.
- 상태는 색상만으로 구분하지 않는다 — 상태명·수치가 항상 화면 텍스트(`클릭 횟수: N`)로 노출된다.

### 5.1 인터랙션(hover / active / focus)

정적 명세이므로 상태 스타일은 CSS 로 표현한다(mockup 에서 `:hover`·`:focus-visible` 로 시각화).

| control | 기본 | hover | focus-visible |
| --- | --- | --- | --- |
| `#counter-increment` | 배경 `--color-action-primary`, 흰 글자 | 배경 `--counter-action-primary-hover` | 2px focus outline(`--color-action-primary`) |
| `#counter-reset` | outline(테두리 `--counter-border`, 글자 `--counter-reset-fg`) | 배경 옅은 회색(`--counter-border`) | 2px focus outline(`--color-action-primary`) |

- 두 버튼 모두 `cursor: pointer`, focus 시 키보드 사용자를 위한 가시적 outline 을 제공한다.

## 6. 컴포넌트 명세

### 6.1 DOM 구조 (frozen selector — 변경 금지)

frozen `dom_ids` / `css_classes` 를 그대로 사용한다. developer 는 아래 골격을 따른다.

```html
<div id="counter-root" class="counter">
  <p id="counter-value" class="counter__value" aria-live="polite">클릭 횟수: 0</p>
  <div class="counter__controls">
    <button id="counter-increment" class="counter__increment" type="button" aria-label="카운트 증가">+1</button>
    <button id="counter-reset" class="counter__reset" type="button" aria-label="카운트 초기화">초기화</button>
  </div>
</div>
```

| 컴포넌트 | id | class | 요소 | 상태 | 인터랙션 |
| --- | --- | --- | --- | --- | --- |
| 루트 카드 | `counter-root` | `counter` | `div` | 정적 | 없음 |
| 카운트 표시 | `counter-value` | `counter__value` | `p` | 텍스트가 상태에 따라 `클릭 횟수: N` | `aria-live="polite"` |
| 증가 버튼 | `counter-increment` | `counter__increment` | `button` | 활성 고정 | 클릭 → 카운트 +1 |
| 초기화 버튼 | `counter-reset` | `counter__reset` | `button` | 활성 고정 | 클릭 → 카운트 0 복원 |

- `.counter__controls` 는 버튼 그룹 래퍼 클래스로, frozen 계약에 명시된 selector 는 아니므로 레이아웃 보조용이다(계약 selector 4 종은 그대로 유지).

### 6.2 접근성 (frozen — 변경 금지)

- `#counter-increment` 는 `aria-label="카운트 증가"` 를 가진다.
- `#counter-reset` 는 `aria-label="카운트 초기화"` 를 가진다.
- `#counter-value` 는 `aria-live="polite"` 로 카운트 변경을 스크린리더에 알린다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트(`클릭 횟수: N`)와 접근성 이름으로 노출한다.
- 버튼은 시맨틱 `<button type="button">` 을 사용하고, focus-visible outline 으로 키보드 접근성을 보장한다.

## 7. dev 구현 가이드

developer(BF-1827)가 `iteration-check2/counter.html`·`counter.js` 구현 시 따를 지침. selector/token 은 계약값 그대로 사용한다.

1. **CSS 변수 정의** — `:root`(또는 `.counter` 스코프)에 frozen token 을 정의:
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-count-text: #111827;
     --space-control-gap: 12px;
   }
   ```
   보조 변수(`--counter-bg`, `--counter-surface`, `--counter-border`, `--counter-action-primary-hover`, `--counter-reset-fg`)는 §2 표를 참조해 정의한다.
2. **마크업** — §6.1 골격을 그대로 사용(ID·class·`aria-*`·초기 텍스트 `클릭 횟수: 0` 포함). JS 미실행 시에도 초기 상태가 보이도록 초기 텍스트를 마크업에 둔다.
3. **버튼 그룹** — `.counter__controls { display: flex; gap: var(--space-control-gap); flex-wrap: wrap; }`.
4. **카드 반응형** — `.counter { max-width: 360px; width: 100%; box-sizing: border-box; }`, 페이지에 좌우 padding 16px. 320px 에서 overflow 없도록 `min-width` 강제 금지.
5. **카운트 표시** — `.counter__value { color: var(--color-count-text); font-size: 28px; font-weight: 700; }`.
6. **증가 버튼** — 배경 `var(--color-action-primary)`, 흰 글자, hover `var(--counter-action-primary-hover)`.
7. **동작(counter.js)** — 메모리 변수로 카운트 관리. `#counter-increment` 클릭 → +1 후 `#counter-value` 텍스트를 `클릭 횟수: ${count}` 로 갱신. `#counter-reset` 클릭 → count=0 후 `클릭 횟수: 0` 갱신. 서버 통신·영속화 없음.
8. **focus outline** — `:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: 2px; }`.

## 8. mockup 참조

- 시각 mockup: `docs/design/mockups/counter-BF-1825.html`
- 명세의 컬러·타이포·레이아웃·상태(초기/증가/초기화)·320px 반응형을 그대로 시각화한 self-contained HTML(외부 의존성 0 건).
- dev 는 mockup 을 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없다. selector/token 계약 준수가 우선이다.

## 9. Self-critique

PR 직전 자기 점검(designer-spec-self-critique 5 항목):

1. **AC 매핑** — 구현 설계 §6 의 AC-1~AC-7 을 본 명세가 모두 커버: 초기 표시(§5 초기 행), 증가/연속 증가(§5 증가 행), 초기화(§5 초기화 행 + 후조건), 접근성(§6.2), 반응형(§4.3), selector/token 준수(§2·§6.1). ✅
2. **dev 구현 가이드** — §7 에 CSS 변수·마크업·flex·반응형·동작을 단계별로 제시, 계약값 그대로 사용 명시. ✅
3. **기존 요소 보존** — frozen selector 4 종·token 3 종·상태 텍스트·접근성·반응형을 재정의 없이 그대로 반영. `.counter__controls` 만 레이아웃 보조 래퍼로 추가(계약 selector 미변경) 명시. ✅
4. **컴포넌트 매핑** — §6.1 표에서 4 컴포넌트를 id/class/요소/상태/인터랙션으로 매핑. ✅
5. **모호함 flag** — 보조색·타이포 수치는 명세용 권장값이며 계약값이 아님을 §2·§3 에 명시(dev 는 계약 token 만 필수). 남은 모호함 없음. ✅
