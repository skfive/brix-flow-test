# 탭 데모 구현 설계 (BF-1849)

> planner packet: BF-1851 · 탭 데모 구현 설계 작성
> 이 문서는 frozen blueprint(ui-contract@v1 / planning-contract@v1)를 developer가 따를 실행 설계로 그대로 옮긴 것입니다.
> **파일 소유권·상태 계약의 유일한 권위는 frozen blueprint이며, 본 문서는 이를 재정의하지 않습니다.** 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

## 1. 목표 / 범위

- 두 개의 탭(첫 번째 / 두 번째)을 전환하며 대응하는 콘텐츠 패널을 보여주는 정적 데모를 구현한다.
- 한 번에 하나의 탭만 활성 상태이며, 활성 탭에 대응하는 패널만 노출된다.
- vanilla-static 스택(HTML + ESM JS + `node --test`)으로 구현하며 빌드 도구·프레임워크를 도입하지 않는다.

### 비범위 (Non-goals)
- 탭 개수 확장(3개 이상), 동적 탭 추가/삭제.
- 라우팅·URL 해시 동기화·상태 영속화(localStorage 등).
- 애니메이션·트랜지션 효과.

## 2. 파일·소유권 계약 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 설명 |
| --- | --- | --- | --- |
| `iteration-check2/tabs.html` | developer | additive | 탭 UI 마크업 + frozen token/스타일 |
| `iteration-check2/tabs.js` | developer | additive | 탭 전환 런타임 + DOM 무의존 순수 로직 |
| `iteration-check2/tabs.test.js` | developer | additive | focused 단위 테스트(`node --test`) |

- 세 파일 모두 **신규 추가(additive)** 이며 기존 파일을 수정하지 않는다.
- 본 planner packet의 산출물은 `docs/plans/BF-1849/implementation-plan.md` 하나뿐이다.
- developer는 위 selector와 token을 **변경하거나 재정의하지 않는다.**

## 3. DOM 구조 계약 (exact)

### 3.1 DOM ID (frozen)
- `tab-first` — 첫 번째 탭 버튼
- `tab-second` — 두 번째 탭 버튼
- `panel-first` — 첫 번째 탭에 대응하는 콘텐츠 패널
- `panel-second` — 두 번째 탭에 대응하는 콘텐츠 패널

### 3.2 CSS class (frozen)
- `tabs` — 탭 데모 루트 컨테이너
- `tabs__tab` — 각 탭 버튼 공통 class
- `tabs__tab--active` — 활성 탭 버튼에만 부여
- `tabs__panel` — 각 콘텐츠 패널 공통 class
- `tabs__panel--active` — 활성 패널에만 부여(비활성 패널은 미부여 → 숨김)

### 3.3 마크업 골격
```html
<div class="tabs">
  <div class="tabs__tablist" role="tablist" aria-label="탭 데모">
    <button id="tab-first" class="tabs__tab tabs__tab--active" type="button"
            role="tab" aria-selected="true" aria-controls="panel-first">첫 번째 탭</button>
    <button id="tab-second" class="tabs__tab" type="button"
            role="tab" aria-selected="false" aria-controls="panel-second">두 번째 탭</button>
  </div>
  <section id="panel-first" class="tabs__panel tabs__panel--active"
           role="tabpanel" aria-labelledby="tab-first">첫 번째 탭 내용</section>
  <section id="panel-second" class="tabs__panel"
           role="tabpanel" aria-labelledby="tab-second" hidden>두 번째 탭 내용</section>
</div>
```
- JS 미실행 시에도 초기 상태(`first-selected`)가 보이도록 마크업에 초기 활성 class를 직접 포함한다.

## 4. 활성 상태 모델 (frozen)

- 상태 값: **`first-selected`**(초기값), **`second-selected`** — 정확히 두 가지.
- 한 시점에 정확히 하나의 상태만 성립한다(단일 활성).
- 상태 ↔ DOM 매핑:

| 상태 | 활성 탭 | `tabs__tab--active` | `aria-selected="true"` | 활성 패널 | 숨김 패널 |
| --- | --- | --- | --- | --- | --- |
| `first-selected` | `tab-first` | `tab-first` | `tab-first` | `panel-first` | `panel-second` |
| `second-selected` | `tab-second` | `tab-second` | `tab-second` | `panel-second` | `panel-first` |

- **초기화/취소/실패 후조건**: 정의되지 않았거나 알 수 없는 입력이 들어오면 상태를 초기값(`first-selected`)으로 되돌리고, 두 탭 버튼 모두 다시 조작 가능한 상태로 유지한다(어떤 탭도 `disabled` 되지 않는다).

## 5. 디자인 토큰 (frozen — `:root` 정의)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-tab-active` | `#2563eb` | 활성 탭 텍스트/강조 |
| `--color-tab-inactive` | `#64748b` | 비활성 탭 텍스트 |
| `--space-tab-gap` | `8px` | 탭 버튼 사이 간격 |

- 위 세 토큰을 `tabs.html`의 `:root`에 정의하고 스타일에서 `var(...)`로 참조한다. 값·이름을 변경하지 않는다.

## 6. 접근성 계약 (frozen)

- 각 탭 버튼은 `role="tab"` 과 `aria-selected` 속성을 가진다(활성=`true`, 비활성=`false`).
- 탭은 마우스 클릭뿐 아니라 **키보드 Enter 또는 Space** 로 활성화된다. (`<button>` 사용 시 기본 지원되며, 커스텀 처리 시 동일 동작 보장.)
- **모든 상태는 색상만으로 구분하지 않는다.** 탭 레이블 텍스트("첫 번째 탭"/"두 번째 탭")와 `aria-selected`/`role` 로 상태명을 화면 텍스트·접근성 이름 양쪽에 노출한다.
- 각 탭 버튼은 `aria-controls`로 대응 패널을, 각 패널은 `role="tabpanel"` + `aria-labelledby`로 대응 탭을 참조한다.
- `:focus-visible` 시 시각적 포커스 링을 제공한다.

## 7. 반응형 계약 (frozen)

- **320px 이상 뷰포트에서 탭과 콘텐츠에 가로 overflow가 발생하지 않는다.**
- 탭 목록은 `display: flex` + `gap: var(--space-tab-gap)` + `flex-wrap: wrap` 로 좁은 폭에서 줄바꿈되게 하고, 루트 컨테이너는 `max-width` + `box-sizing: border-box` 로 폭을 넘지 않게 한다.

## 8. tabs.js 구조 계약 (DOM 무의존 순수 로직 분리)

`counter.js` 선례와 동일하게, `node --test`에서 shim 없이 검증 가능하도록 순수 함수를 분리하고 브라우저 배선은 `typeof document !== 'undefined'` 가드로 감싼다.

- `export const INITIAL_STATE = 'first-selected'` — frozen 초기 상태.
- `export function selectTab(state, tabId)` — `tab-first` → `first-selected`, `tab-second` → `second-selected`, 그 외(미지정/알 수 없음) → `INITIAL_STATE` 복원.
- `export function tabsMarkup()` — §3.3 골격 문자열 반환(계약 selector·초기 활성 class·aria 속성 포함).
- `export function init(doc)` — 두 탭 버튼에 click 리스너를 배선하고, 상태 변화 시 `tabs__tab--active`/`tabs__panel--active`/`aria-selected`/패널 `hidden`을 갱신한다. 어떤 탭도 `disabled` 처리하지 않는다.

## 9. tabs.test.js 검증 항목 (focused 단위)

- 초기 상태가 `first-selected` 임(`INITIAL_STATE`).
- `selectTab`: `tab-first`→`first-selected`, `tab-second`→`second-selected`.
- `selectTab`: 미지정/알 수 없는 tabId → `first-selected` 복원(후조건).
- `tabsMarkup`: 계약 selector 전체 포함 — id `tab-first`/`tab-second`/`panel-first`/`panel-second`, class `tabs`/`tabs__tab`/`tabs__tab--active`/`tabs__panel`/`tabs__panel--active`.
- `tabsMarkup`: 접근성 속성 포함 — `role="tab"`, `aria-selected`, `role="tablist"`, `role="tabpanel"`, `aria-controls`, `aria-labelledby`.
- `tabsMarkup`: 상태명이 색상 아닌 텍스트("첫 번째 탭"/"두 번째 탭")로 노출됨.
- `tabsMarkup`: 탭 버튼이 `disabled` 되지 않음(항상 재조작 가능).

## 10. 검증 명령 (focused)

```bash
node --test iteration-check2/tabs.test.js
```

- test_scope: focused — 신규 `tabs.test.js`와 owned_paths 관련 테스트만 실행한다. 다른 module 회귀는 실행하지 않는다.

## 11. Given / When / Then (수용 기준)

- **AC-1 초기 렌더**
  - Given 사용자가 `tabs.html`을 연다
  - When 페이지가 로드된다
  - Then 상태는 `first-selected`이고 `tab-first`가 활성(`tabs__tab--active`, `aria-selected="true"`)이며 `panel-first`만 보인다.
- **AC-2 두 번째 탭 선택**
  - Given `first-selected` 상태
  - When 사용자가 `tab-second`를 클릭한다
  - Then 상태는 `second-selected`가 되고 `panel-second`만 보이며 `tab-second`가 활성, `tab-first`는 비활성(`aria-selected="false"`)이 된다.
- **AC-3 키보드 활성화**
  - Given `tab-second`에 포커스가 있다
  - When 사용자가 Enter 또는 Space를 누른다
  - Then 클릭과 동일하게 `second-selected`로 전환된다.
- **AC-4 반응형 무overflow**
  - Given 뷰포트 폭이 320px이다
  - When 탭 데모가 렌더된다
  - Then 탭과 콘텐츠에 가로 스크롤(overflow)이 발생하지 않는다.
- **AC-5 색상 비의존 상태 노출**
  - Given 임의의 활성 상태
  - When 스크린리더로 탭을 읽는다
  - Then 활성/비활성이 색상이 아니라 `aria-selected`·`role`·레이블 텍스트로 구분된다.
- **AC-6 후조건 복원**
  - Given 알 수 없는/미지정 입력이 `selectTab`에 전달된다
  - When 상태 전환이 시도된다
  - Then 상태는 초기값 `first-selected`로 되돌아가고 두 탭 버튼 모두 다시 조작 가능하다.

## 12. Edge case / 실패 케이스

- **미지정 tabId**: `selectTab`이 초기값(`first-selected`)을 반환한다(§4 후조건).
- **JS 미실행**: 마크업에 초기 활성 class·`hidden`이 박혀 있어 `first-selected` 정적 화면이 그대로 보인다.
- **중복 클릭(이미 활성 탭 재클릭)**: 상태 불변(`first-selected`→`first-selected`), 오류 없이 현재 상태 유지.
- **DOM 요소 누락**(`init`에서 탭/패널 미발견): 배선을 건너뛰고 예외를 던지지 않는다(`counter.js` 선례와 동일 가드).

## 13. developer 후조건 (handoff)

1. `iteration-check2/tabs.html`, `iteration-check2/tabs.js`, `iteration-check2/tabs.test.js`를 위 계약대로 신규 작성(additive).
2. `node --test iteration-check2/tabs.test.js` 통과.
3. selector·token·상태 계약을 변경하지 않고 그대로 구현.
