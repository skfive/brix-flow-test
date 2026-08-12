# 단위 변환기 — 디자인 명세 (BF-1988)

- Jira: BF-1988 (본 문서), 상위 Epic: BF-1987
- 작성자: 이디자인 (designer)
- 소비자: developer(BF-1989)
- 근거: `docs/plans/BF-1987/implementation-plan.md` (BF-1990, frozen UI 계약) — 아래 selector·상태·token은
  planner가 동결한 값을 그대로 사용하며 재정의하지 않았다.
- 상태: 이 문서는 §4 Frozen UI 계약을 재정의하지 않는 **시각 구현 명세**다. selector/token 충돌 시
  implementation-plan.md 가 우선한다.

## 1. 시안 개요

- 변경 범위: 정적 페이지(`unit-converter/index.html`) 위에 카드형 단위 변환기 위젯 1개를 신설한다.
  길이/무게 두 카테고리를 탭으로 전환하고, 값 입력 → from/to 단위 선택 → 결과 확인 → swap(단위 맞바꾸기)의
  단일 화면 플로우를 제공한다.
- 사용자 경험 목표:
  1. 카테고리 전환과 변환 결과가 **추가 클릭/제출 없이 즉시** 반영된다는 것을 시각적으로도 드러낸다
     (버튼이 아닌 실시간 필드로 인지되도록 입력형 컨트롤 스타일 사용).
  2. 오류가 발생해도 입력 컨트롤이 절대 잠기지 않는다는 것을 색상+문구로 동시에 전달한다(AC-6).
  3. 320px 협소 뷰포트부터 480px 이상까지 잘림/가로 스크롤 없이 자연스럽게 스택→가로 정렬로 전환된다(AC-9).
- 톤: 유틸리티 위젯이므로 장식보다 명료성 우선 — 여백과 상태 대비로 정보 위계를 만든다.

## 2. 컬러 팔레트

### 2.1 Frozen token (변경 금지 — implementation-plan.md §4.5 그대로 사용)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-text-primary` | `#1f2937` | 본문/라벨/결과 텍스트 |
| `--color-bg-panel` | `#ffffff` | 변환기 카드 배경 |
| `--color-action-primary` | `#2563eb` | 주요 액션(활성 탭 텍스트 강조, swap 버튼, 포커스 링) |
| `--color-tab-active-bg` | `#2563eb` | 활성 탭 배경 |
| `--color-error` | `#dc2626` | 오류 문구·오류 테두리 |

### 2.2 추가 token (additive — frozen 목록에 없는 보조 컬러만 신규 정의, 기존 토큰과 충돌 없음)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg-page` | `#f3f4f6` | 페이지 배경(카드 밖 여백) |
| `--color-border` | `#d1d5db` | input/select 기본 테두리 |
| `--color-border-focus` | `#2563eb` | 포커스 시 테두리(=`--color-action-primary`) |
| `--color-text-muted` | `#6b7280` | 필드 라벨, 캡션 |
| `--color-tab-inactive-text` | `#4b5563` | 비활성 탭 텍스트 |
| `--color-error-bg` | `#fef2f2` | 오류 상태 결과 영역 배경 |

## 3. 타이포그래피

- `--font-family-base: system-ui;` (frozen — 값 그대로, 재정의/확장 금지). 시스템 폰트만 사용하며 외부
  웹폰트 로드 없음.

| 용도 | font-size | font-weight | line-height | 색상 |
|---|---|---|---|---|
| 위젯 제목 (h1) | 20px | 700 | 1.3 | `--color-text-primary` |
| 탭 라벨 (`.tab`) | 15px | 600 | 1.2 | 활성: `--color-action-primary` on `--color-tab-active-bg` / 비활성: `--color-tab-inactive-text` |
| 필드 라벨 (`.field__label`) | 13px | 600 | 1.2 | `--color-text-muted` |
| input/select 값 | 16px | 400 | 1.4 | `--color-text-primary` |
| 결과 값 (`#unit-converter-result`) | 22px | 700 | 1.3 | `--color-text-primary` |
| 오류 문구 (`#unit-converter-error`) | 13px | 600 | 1.4 | `--color-error` |

## 4. 레이아웃

### 4.1 섹션 구조

```
#unit-converter-root (.app-card)
├─ h1 "단위 변환기"
├─ .tabs (role="tablist")
│   ├─ #unit-converter-tab-length (.tab .tab--active)
│   └─ #unit-converter-tab-weight (.tab)
└─ .converter-panel
    ├─ .field  → label + #unit-converter-input-value (.field__input)
    ├─ .field  → label + #unit-converter-from-unit (.field__select)
    ├─ #unit-converter-swap-button (.swap-button)
    ├─ .field  → label + #unit-converter-to-unit (.field__select)
    └─ .result → #unit-converter-result + #unit-converter-error
```

### 4.2 spacing

- 컨트롤 간 간격은 frozen 토큰 `--space-control-gap: 12px;` 하나로 통일한다(탭 사이, `.converter-panel` 내부
  요소 사이, 필드 라벨-인풋 사이 모두 이 값 또는 그 절반(6px, 라벨 간격 한정)을 사용).
- 카드 내부 padding: 20px(≥480px), 16px(<480px) — overflow 방지를 위해 좁은 뷰포트에서 축소.
- 카드 바깥 페이지 padding: 16px(320px 기준) ~ 24px(480px 이상).
- 모서리 반경은 frozen 토큰 `--radius-control: 8px;` 을 input/select/button/카드에 공통 적용한다.

### 4.3 breakpoint 별 동작 (AC-9)

- **320px ~ 479px (기본, mobile-first)**: `.converter-panel`은 `flex-direction: column`. `.field`,
  `.swap-button`, `.result`는 모두 `width: 100%`로 세로 스택. `box-sizing: border-box`와
  `max-width: 100%`를 모든 컨트롤에 적용해 어떤 요소도 뷰포트 폭을 넘기지 않는다(overflow-x 없음).
- **480px 이상**: `.converter-panel`은 `flex-direction: row; flex-wrap: wrap; align-items: flex-end;`로
  전환. `.field`는 `flex: 1 1 130px`, `.swap-button`은 `flex: 0 0 auto`(아이콘 크기 고정), `.result`는
  `flex: 1 1 160px`로 한 행에 정렬된다. gap은 동일하게 `--space-control-gap`.
- 브레이크포인트는 `@media (min-width: 480px)` 단일 지점만 사용한다(요구사항이 320/480 두 지점만 명시).

## 5. 컴포넌트 명세

### 5.1 `.tabs` / `.tab` / `.tab--active` — 카테고리 탭

- 구조: `div.tabs[role=tablist]` 안에 버튼 2개, `role="tab"`.
- props/상태: `aria-selected="true|false"`. 활성 탭만 `.tab--active` 클래스 부여 → 배경
  `--color-tab-active-bg`, 텍스트는 배경 대비를 위해 흰색(`#ffffff`), `font-weight: 600`.
  비활성 탭은 배경 투명, 텍스트 `--color-tab-inactive-text`.
- 인터랙션: 클릭 시 즉시 전환(제출 없음). 키보드 좌/우 화살표로 탭 간 포커스 이동 + 즉시 활성화(개발
  가이드 §6 참고). 포커스 시 `outline: 2px solid var(--color-border-focus); outline-offset: 2px;`.
- 상태 이월 금지(§5 규칙 4): 카테고리 전환 시 이전 오류 상태를 지우고 새 카테고리 단위 기준으로 재계산한다.

### 5.2 `.field` / `.field__input` / `.field__select` — 입력 필드 그룹

- 구조: `label.field__label` + 컨트롤(`input.field__input` 또는 `select.field__select`) 세로 배치, 6px 간격.
- `#unit-converter-input-value`: `type="text" inputmode="decimal"`, idle일 때 placeholder
  `"값을 입력하세요"`. 테두리 `1px solid var(--color-border)`, 포커스 시
  `border-color: var(--color-border-focus)`.
- `#unit-converter-from-unit` / `#unit-converter-to-unit`: `select.field__select`, 카테고리에 맞는
  단위 옵션(길이: m/km/cm/inch/ft, 무게: g/kg/lb/oz)만 노출.
- 상태: 오류 시에도 `disabled` 속성을 절대 부여하지 않는다(AC-6). 시각적 비활성 표현 자체가 없음.

### 5.3 `#unit-converter-swap-button` (`.swap-button`) — 단위 맞바꾸기

- 정사각형 아이콘 버튼(예: 40×40px), 배경 `--color-bg-panel`, 테두리 `1px solid var(--color-border)`,
  아이콘 색 `--color-action-primary`, `border-radius: var(--radius-control)`.
- `aria-label="단위 맞바꾸기"` 필수(스크린리더용 — 아이콘만으로는 의미 전달 불가, AC-8).
- 클릭 시 from/to 값이 교체되고 동일 입력값 기준 결과가 즉시 재계산(입력값 자체는 유지, AC-7). hover 시
  배경 `--color-bg-page`로 미세 변화, active 시 `transform: scale(0.96)`.

### 5.4 `.result` / `#unit-converter-result` / `#unit-converter-error`

- `.result`는 `#unit-converter-result`(값)와 `#unit-converter-error`(오류, `role="alert"`)를 함께 감싸는
  래퍼. 기본 상태: `border: 1px solid var(--color-border); background: var(--color-bg-panel);`.
- **idle**: 두 텍스트 모두 비어 있음(빈 문자열) — AC-2.
- **valid-result**: `#unit-converter-result`에 `formatNumber()` 결과 텍스트만 표시(소수 최대 4자리,
  trailing 0/소수점 제거). `#unit-converter-error`는 비어 있음(빈 alert는 스크린리더에 공지되지 않음).
- **invalid-input**: `.result`에 `.result--error` 모디파이어 추가 →
  `border-color: var(--color-error); background: var(--color-error-bg);`. `#unit-converter-result`는
  비우고, `#unit-converter-error`에 문구("숫자를 입력하세요" 또는 "0 이상의 값을 입력하세요") 표시.
  색상만으로 구분하지 않기 위해 오류 문구 앞에 텍스트 아이콘 `⚠`을 함께 표기한다(AC-8, 색맹 사용자 대응).

## 6. dev 구현 가이드

1. **CSS 변수 선언 위치**: `unit-converter/style.css` 최상단 `:root`에 §2 frozen 토큰 5개를 값 그대로
   선언하고, §2.2 추가 토큰은 같은 `:root` 블록에 이어서 선언(새 이름 충돌 없음 확인됨).
2. **파일/선택자는 §4(Frozen UI 계약) 표 그대로** 사용 — 이 문서는 시각 표현만 추가할 뿐 selector를
   재정의하지 않는다.
3. **탭 키보드 내비게이션**: `role="tablist"` 컨테이너에서 좌/우 화살표 keydown 리스너로 포커스와
   `aria-selected`/`.tab--active`를 함께 이동시킨다(Tab 키는 패널로 진입, 화살표는 탭 간 이동 — WAI-ARIA
   tabs 패턴).
4. **오류→복구는 입력 이벤트 기준**: `input`/`change` 이벤트마다 검증 → `convert()` 호출 → 성공 시
   `.result--error` 제거 + 결과 표시, 실패 시 `.result--error` 부여 + 해당 오류 문구. 별도 `disabled` 토글
   로직 자체를 만들지 않는다(§5 규칙 2 — 만들지 않아야 재활성화 누락 버그가 원천 차단됨).
5. **formatNumber 표시 규칙**: 소수 4자리에서 반올림 후 trailing `0`과 불필요한 `.` 제거. 예:
   `formatNumber(100) → "100"`, `formatNumber(0.3000000000000004) → "0.3"`.
6. **반응형은 `.converter-panel`에만 breakpoint 적용** — 개별 자식(`.field` 등)에 중복 media query를
   걸지 않고 부모의 `flex-direction`/`flex-wrap` 전환에 자연스럽게 따라가도록 구현(§4.3).
7. **접근성 속성 체크리스트**: `role="tablist"`/`role="tab"`/`aria-selected`(탭),
   `role="alert"`(`#unit-converter-error`), `aria-label="단위 맞바꾸기"`(swap 버튼), `<label for=...>`와
   input/select `id` 연결(모든 `.field`).

## 7. AC 매핑 표

| AC | 요구사항 요약 | 화면 요소 |
|---|---|---|
| AC-1 | 카테고리 탭 전환 | `.tabs`, `#unit-converter-tab-length`, `#unit-converter-tab-weight`, `.tab--active`, `aria-selected` |
| AC-2 | idle 상태 | `#unit-converter-input-value` placeholder, 빈 `#unit-converter-result`/`#unit-converter-error` |
| AC-3 | 유효한 변환 결과 | `#unit-converter-result` (valid-result 상태, §5.4) |
| AC-4 | 오류 — 숫자 아님 | `#unit-converter-error`="숫자를 입력하세요", `role="alert"`, `.result--error` |
| AC-5 | 오류 — 음수 | `#unit-converter-error`="0 이상의 값을 입력하세요", `.result--error` |
| AC-6 | 오류 이후 복구 | 컨트롤 `disabled` 미사용(§5.2/§6-4), 오류 해제 시 `.result--error` 제거 |
| AC-7 | 단위 맞바꾸기 | `#unit-converter-swap-button`(`.swap-button`), `aria-label="단위 맞바꾸기"` |
| AC-8 | 접근성 | `aria-selected`, `role="alert"`, 오류 문구 `⚠` 텍스트 병기(색상 단독 구분 금지) |
| AC-9 | 반응형 | `.converter-panel` breakpoint 전환(§4.3) |

## 8. Token 적용 내역 (요약)

| 토큰 | 적용 요소 |
|---|---|
| `--color-text-primary` | h1, 필드 값 텍스트, 결과 텍스트 |
| `--color-bg-panel` | `#unit-converter-root` 카드 배경, `.result` 기본 배경, swap 버튼 배경 |
| `--color-action-primary` | 활성 탭 텍스트 강조 참조색, swap 버튼 아이콘, 포커스 링 |
| `--color-tab-active-bg` | `.tab--active` 배경 |
| `--color-error` | `.result--error` 테두리, `#unit-converter-error` 텍스트 |
| `--space-control-gap` | 탭 간격, `.converter-panel` 내부 gap |
| `--radius-control` | input/select/button/카드 `border-radius` |
| `--font-family-base` | `body` 전체 font-family (재정의 없음) |

## 9. mockup 참조

- 파일: `docs/design/unit-converter/mockup.html`
- 상단 "실사용 스냅샷" 섹션은 §4 Frozen UI 계약의 DOM ID 9개를 그대로 포함한 단일 인스턴스(length
  카테고리, from=m/to=cm, 값 1, 결과 100 — valid-result 상태)로 실제 dev 마크업 구조를 그대로 보여준다.
  브라우저 폭을 좁혀 320px/480px 반응형 전환도 실제로 확인 가능하다(정적 CSS 그대로 동작).
- 하단 "상태 갤러리" 섹션은 idle / invalid-input(숫자 아님) / invalid-input(음수) / weight 카테고리를
  참고용 스냅샷으로 병렬 배치한다. HTML `id` 중복을 피하기 위해 이 갤러리 카드들은 frozen ID를 재사용하지
  않고 class만 재사용한다(실제 dev 구현에서는 갤러리 없이 하나의 위젯이 상태만 전환됨).
