# 구독 관리 시각 명세 — BF-1460 (service-subscriptions-canary)

> 이 문서는 `docs/plans/service-subscriptions-canary-plan.md`에 동결된 `ui-contract@v1`(sha256:a983e196...)의
> selector·상태·token·접근성·반응형 계약을 그대로 시각화한다. 새로운 selector/class/token/상태를
> 추가하거나 재정의하지 않는다. (아래 §5·§8에 명시한 designer 보조 요소는 frozen 계약 밖의
> 시각적 보조 구조로, 기존 selector를 대체하지 않는다.)

## 1. 시안 개요

- **변경 범위**: `demo/service-subscriptions-canary/`에 구독 목록을 추가·해제·필터링하는 client-only
  구독 관리 canary 화면의 시각 표현. 서버 API 없이 `localStorage` 단일 계층으로 영속화된다.
- **사용자 경험 목표**: 운영자가 구독 추가 시 `idle → adding → (subscribed | error)` 전이를,
  해제 시 `idle → removed(→ empty)` 전이를 화면 텍스트로 명확히 인지하도록 한다. 모든 상태는
  색상만으로 구분하지 않고 상태명을 텍스트로 노출한다(frozen 접근성 계약).
- **범위 제외**: 서버 API, 정렬, 구독 상세 페이지는 이 문서의 범위 밖이다(frozen 계약에 없음).
  이 문서와 mockup은 정적 시각 자료이며 런타임 HTML/CSS/JS를 생성하지 않는다. 실제 구현은
  developer(`demo/service-subscriptions-canary/index.html`, `src/feature.js`)가 담당한다.

## 2. 컬러 팔레트

### Frozen token (변경 금지 — plan §UI 계약 원문 그대로)

| 용도 | CSS 변수 | HEX |
|---|---|---|
| 주요 액션 (구독 추가 버튼) | `--color-action-primary` | `#2563eb` |
| 활성 상태 강조 | `--color-status-active` | `#16a34a` |
| 컨트롤 간 간격(spacing, 색상 아님) | `--space-control-gap` | `12px` |

### 보조 컬러 (designer 추가 — frozen 계약 아님, 배경/보더/보조 텍스트·비활성 상태 참고용)

| 용도 | HEX | 비고 |
|---|---|---|
| 페이지 배경 | `#f8fafc` | `--color-page-bg` |
| 목록/카드 표면 | `#ffffff` | `--color-surface` |
| 카드·컨트롤 테두리 | `#e2e8f0` | `--color-border` |
| 본문 텍스트 | `#0f172a` | `--color-text-primary` |
| 보조/캡션 텍스트, 비활성 상태 텍스트 | `#64748b` | `--color-text-muted` / `--color-status-inactive` (공용) |
| 오류 강조 | `#dc2626` | `--color-status-error` — `error` 상태 텍스트 보조 강조(색상 단독 아님) |

> `active`/`inactive`/`error` 상태는 frozen 접근성 원칙("색상만으로 구분하지 않는다")에 따라 강조색을
> 텍스트 문구를 보조하는 용도로만 사용하고, 상태 판별의 유일한 단서로 삼지 않는다. `--color-status-active`
> 외 다른 상태 강조색(`inactive`/`error`)은 frozen 계약에 정의되어 있지 않으므로 designer가 보조로 지정했다.

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다 (외부 폰트 의존성 0건).

- font-family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif`
- **heading** (`subscription-root` 상단 타이틀 등 부가 콘텐츠): 18px / weight 600 / line-height 1.4 / color `--color-text-primary`
- **body** (`subscription-service-select`, `subscription-filter-status`, `subscription__item` 본문): 14px / weight 400 / line-height 1.5 / color `--color-text-primary`
- **버튼 라벨** (`subscription-add-submit`): 14px / weight 600 / line-height 1.4
- **caption** (상태 안내 텍스트, `subscription-empty`, 구독일 등 보조 텍스트): 13px / weight 500 / line-height 1.4 — 굵기로도 상태를 강조해 색맹 사용자 인지를 보완한다

## 4. 레이아웃

- `subscription-root` (`.subscription`): 페이지 컨테이너 — `background: var(--color-page-bg)`,
  내부 콘텐츠는 `max-width: 640px`, `padding: 16px`, `box-sizing: border-box`
- `subscription-root` 내부 섹션(추가 폼 / 필터 / 상태 안내 / 목록) 사이 간격, 그리고 추가 폼 내부
  컨트롤(select·버튼) 사이 간격 모두 `--space-control-gap: 12px` (frozen token) 적용
- `subscription-add-form`: `subscription-service-select` + `subscription-add-submit`
  - **480px 이상**: `flex-direction: row` — select가 `flex: 1`로 남는 폭을 채우고 버튼은 고정 폭으로
    오른쪽에 배치
  - **320px~479px**: `flex-direction: column` — select와 버튼을 세로로 스택하고 각각 `width: 100%`
- `subscription-filter-status`: 연결된 `<label>` 텍스트 "상태 필터"와 함께 폼 아래, 목록 위에 배치.
  옵션은 `전체 | 활성 | 비활성` 3가지.
- `subscription-list` (`.subscription__list`): `subscription__item` 목록을 세로로 나열.
  - **480px 이상**: 각 항목 내부는 `flex-direction: row` — 서비스명·상태·구독일이 가로 배치되고
    해제 control이 오른쪽 끝에 위치
  - **320px~479px**: 각 항목 내부는 `flex-direction: column` — 서비스명·상태·구독일·해제 control이
    세로로 stack, `width: 100%`
- **320px 폭에서 overflow 방지**: `box-sizing: border-box` + `word-break: keep-all`(한국어 줄바꿈
  고려) + select/버튼/목록 항목 모두 퍼센트 기반 폭 사용, 루트 컨테이너는 `width: 100%`에 좌우
  여백만 유지

### Breakpoint 표

| 뷰포트 | 추가 폼 방향 | 목록 항목 방향 |
|---|---|---|
| 320px~479px | column (세로 스택) | column (세로 스택) |
| ≥480px | row (가로 배치) | row (가로 배치) |

> 정확한 breakpoint 픽셀 값(480px)은 frozen 계약에 없으며 designer 추정치다. 320px에서 overflow가
> 없어야 한다는 frozen AC만 충족하면 dev가 실제 콘텐츠 폭에 맞춰 조정 가능하다(§8 모호함 flag 참조).

## 5. 컴포넌트 명세

### `#subscription-root` (`.subscription`)

- 페이지 루트 컨테이너. `idle`/`adding`/`subscribed`/`removed`/`empty`/`error` 6개 상태를 자식 요소
  (주로 §5.5의 상태 안내 영역, `subscription-add-submit`, `subscription-empty`)의 텍스트로 표현한다.
- 루트 자체에는 상태별 modifier class를 새로 추가하지 않는다 (frozen — 계약에 없는 class 임의
  추가 금지).

### `#subscription-add-form`

- `subscription-service-select` + `subscription-add-submit`으로 구성된 구독 추가 폼.
- `subscription-service-select`에 값이 없는 상태로 제출 시도 시 클라이언트 유효성 검사로 제출
  자체를 차단한다(`adding` 상태에 진입하지 않는다) — frozen edge case.

### `#subscription-service-select`

- 구독 가능한 서비스 목록을 옵션으로 노출하는 select. placeholder 옵션(예: "서비스 선택") 포함
  (mockup 예시 텍스트, frozen 계약 아님).

### `#subscription-add-submit` (`.subscription__submit`)

| 상태 | 활성/비활성 | 표시 텍스트 | 색상 |
|---|---|---|---|
| idle / subscribed / removed / empty | 활성 | "구독 추가" | `--color-action-primary` 배경, `#ffffff` 텍스트 |
| adding | 비활성 | "추가 중…" | 비활성 배경 `#e2e8f0`, 텍스트 `--color-text-muted` |
| error | 활성(재활성화됨) | "구독 추가" | `--color-action-primary` 배경, `#ffffff` 텍스트 |

- `aria-label="구독 추가"` (명시적, frozen) — 버튼 표시 텍스트가 "추가 중…"으로 바뀌는 `adding`
  상태에서도 `aria-label`은 고정 유지해 스크린리더 이용자가 컨트롤 정체성을 잃지 않게 한다.
- 저장 실패(`error`) 이후에도 이 control은 즉시 재사용 가능해야 한다는 frozen 후조건(주 실행
  control 재사용 invariant)에 따라, `error` 진입과 동시에 다시 활성 상태로 복귀한다.

### `#subscription-filter-status` (`.subscription__filter`)

- 연결된 `<label>` 텍스트 "상태 필터" (frozen 접근성 계약 — `<label for="subscription-filter-status">`).
- 옵션: `전체 | 활성 | 비활성`. `status` 필드를 필터링하며 선택 자체는 localStorage에 영속화하지
  않는다(세션 한정, frozen 데이터 모델).
- 필터 결과가 0건이면 `empty` 상태와 동일한 `subscription-empty` 텍스트가 표시된다(frozen).

### `#subscription-list` (`.subscription__list`) / `.subscription__item`

- 구독 항목을 `subscription__item` 단위로 나열. 각 항목은 서비스명, 상태 텍스트(활성/비활성 —
  색상만으로 구분하지 않고 텍스트로 노출), 구독일, 해제 control로 구성된다.
- 해제 control은 frozen 계약에 별도 selector가 없으므로 designer가 `.subscription__item-remove`
  (비-frozen 보조 class)로 명세한다. `aria-label="{서비스명} 구독 해제"` 패턴을 권장한다(§8 모호함
  flag 참조).
- 각 항목은 `tabindex="0"`으로 키보드 `Tab` 순회 가능해야 한다(frozen 접근성 계약 — 폼·필터·목록
  항목에 순차 포커스).
- 이미 구독 중인 서비스를 다시 제출해도 중복 레코드를 추가하지 않고 기존 항목을 유지한다(frozen
  edge case) — 목록 렌더링 결과에는 항상 서비스당 항목이 1개뿐이다.

### 상태 안내 영역 (designer 보조 요소, 비-frozen)

- frozen `dom_ids`에는 `adding`/`subscribed`/`removed`/`error` 상태의 안내 텍스트를 위한 전용
  selector가 없다(`empty`만 `subscription-empty`로 frozen). `adding`은 §5.3 표대로
  `subscription-add-submit` 자신의 표시 텍스트 교체로 처리하고, `subscribed`/`removed`/`error` 3개
  상태의 안내 문구는 `subscription-root` 내부, 폼과 목록 사이에 designer가 추가한 보조 안내
  영역(`.subscription__status`, `aria-live="polite"`)에 표시한다(§8 모호함 flag 참조).
- 정확 문구 (exact — 재문구화 금지, plan 문서 원문):

| 상태 | 화면 텍스트 (exact) | 표시 위치 |
|---|---|---|
| idle | (문구 없음 — 구독 목록과 "구독 추가" 버튼만 표시) | — |
| adding | 추가 중… | `subscription-add-submit` 버튼 텍스트 |
| subscribed | 구독이 추가되었습니다 | `.subscription__status` |
| removed | 구독이 해제되었습니다 | `.subscription__status` |
| empty | 표시할 구독이 없습니다 | `#subscription-empty` |
| error | 구독을 저장하지 못했습니다 | `.subscription__status` |

- `.subscription__status`는 `aria-live="polite"`로 상태명을 화면 텍스트와 접근성 이름으로 함께
  노출한다(frozen 접근성 원칙 적용).

### `#subscription-empty`

- `empty` 상태(구독 0건 또는 필터 결과 0건) 전용 안내: "표시할 구독이 없습니다" (frozen, exact
  문구). 목록에 항목이 1개 이상이면 이 요소는 숨김 처리한다.

## 6. dev 구현 가이드

1. selector·class·token 이름은 위 표와 완전히 동일하게 사용한다 — 재정의·리네이밍 금지 (frozen):
   `#subscription-root`, `#subscription-add-form`, `#subscription-service-select`,
   `#subscription-add-submit`, `#subscription-filter-status`, `#subscription-list`,
   `#subscription-empty` / `.subscription`, `.subscription__list`, `.subscription__item`,
   `.subscription__submit`, `.subscription__filter`.
2. `:root`에 아래 CSS 변수를 그대로 선언:
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-status-active: #16a34a;
     --space-control-gap: 12px;
   }
   ```
3. 추가 폼·목록 항목 방향 전환은 `@media (min-width: 480px) { flex-direction: row; }` 기준으로
   구현한다(기본값 column — 320px 포함 480px 미만은 세로 스택).
4. `subscription-add-submit`은 `adding` 상태에서 `textContent`를 "추가 중…"으로 교체하고
   `disabled` 속성을 설정하되 `aria-label="구독 추가"`는 유지한다. `subscribed`/`error` 진입 시
   다시 "구독 추가" 텍스트로 복귀하고 재활성화한다.
5. `subscribed`/`removed`/`error` 안내 문구는 `.subscription__status`(`aria-live="polite"`)의
   `textContent`를 위 §5 표의 exact 문구로 교체한다. 좌측 보더 강조색(성공 `--color-status-active`,
   오류 `#dc2626`)은 CSS class 없이 인라인 스타일 또는 data 속성 기반으로 적용하되, 계약에 없는 새
   modifier class가 추가로 필요하면 구현 전 reviewer와 사전 협의한다.
6. 저장 실패(`error`) 뒤에는 `subscription-add-submit`을 즉시 재사용 가능한 활성 상태로 되돌린다
   (frozen 후조건).
7. 구독이 0건이거나 필터 결과가 0건이면 `subscription-list`는 비우고 `subscription-empty`를
   노출한다(frozen). 두 경우 모두 동일 문구를 재사용하되 내부 로직에서 "전체 0건"과 "필터 결과
   0건"을 혼동하지 않는다.
8. 이미 구독 중인 서비스를 다시 제출하면 새 레코드를 추가하지 않고 기존 항목을 유지한다(중복
   방지, frozen edge case).
9. `subscription-service-select`에 값이 없으면 제출 이벤트 자체를 클라이언트 유효성 검사로
   차단한다(`adding` 상태에 진입하지 않음).
10. localStorage 키(`service-subscriptions-canary:v1`)와 `SubscriptionRecord` 스키마는 plan 문서
    §데이터 모델 원문을 그대로 따른다 — 이 문서는 시각 명세이므로 데이터 스키마를 재정의하지 않는다.
    JSON 파싱 실패 시 예외를 throw하지 않고 빈 배열로 취급해 `empty` 상태로 렌더링한다(frozen).
11. 키보드 전용 흐름을 보장한다 — `Tab`으로 `subscription-service-select` → `subscription-add-submit`
    → `subscription-filter-status` → 목록 항목(`tabindex="0"`) 순 이동.
12. 반응형은 CSS `flex-direction` + `@media (min-width: 480px)` 미디어쿼리로 구현하고, 320px
    뷰포트에서 텍스트/버튼이 잘리거나 넘치지 않도록 `word-break: keep-all`과 퍼센트 기반 폭을
    고려한다.

## 7. mockup 참조

- 파일: [`docs/design/mockups/service-subscriptions-canary-BF-1460.html`](./mockups/service-subscriptions-canary-BF-1460.html)
- 위 6개 상태(`idle`/`adding`/`subscribed`/`removed`/`empty`/`error`)의 화면 텍스트·색상 token을
  정적으로 시각화하고, 320px/480px 이상 반응형 동작(폼·목록 항목 스택 여부)과 상태 안내 영역
  배치 위치를 함께 표현한다.
- 이 mockup은 dev의 실제 산출물이 아니며 참조 가이드로만 사용한다. 픽셀 단위 일치 의무는 없다.

## 8. Self-critique

- **AC 매핑**: §5(selector·상태 텍스트 exact)와 §2(frozen token exact)가 plan 문서 UI 계약의
  selector·상태·token 원문과 1:1로 대응한다. §4의 320px/480px 레이아웃이 반응형 AC(overflow 없음,
  좁은 폭 세로 stack)를 각각 커버한다.
- **dev 구현 가이드**: §6에 CSS 변수 선언, breakpoint 조건, 상태 전이 시 후조건(버튼 재활성화),
  키보드 흐름, 중복/유효성 검사 edge case를 단계별로 명시해 dev가 별도 해석 없이 그대로 옮길 수
  있게 했다.
- **기존 요소 보존**: 이 작업은 신규 additive 파일(`docs/design/service-subscriptions-canary-contract.md`,
  `docs/design/mockups/service-subscriptions-canary-BF-1460.html`)만 추가하며 기존 파일을 수정하지
  않는다.
- **컴포넌트 매핑**: frozen DOM ID 7개·CSS class 5개가 모두 §5에 최소 1회씩 명세되었고, frozen
  selector는 재정의하지 않았다.
- **모호함 flag**: plan 문서는 `adding` 이후의 `subscribed`/`removed`/`error` 3개 상태 안내 문구를
  위한 전용 selector를 frozen하지 않았다(`empty`만 `subscription-empty`로 frozen) — 이 문서는
  `.subscription__status`(비-frozen 보조 요소)를 designer 재량으로 추가해 세 상태 문구를 노출한다.
  목록 항목의 해제 control 역시 전용 selector가 frozen되지 않아 `.subscription__item-remove`를
  designer가 보조로 명명했다. 두 보조 selector 모두 frozen selector를 대체하지 않으며, dev 구현
  중 이름 조정이 필요하면 reviewer와 사전 협의를 권장한다. 반응형 breakpoint 값(480px)도 plan이
  "320px 이상 overflow 없음"으로만 지정했고 정확한 값은 designer 추정치이므로, dev가 실제 콘텐츠
  폭에 맞춰 조정 가능하다.
