# 필터 프리셋 시각 명세 — BF-1454 (run-filter-presets)

> 이 문서는 `docs/plans/run-filter-presets-BF-1453.md`에 동결된 `ui-contract@v1`(sha256:c9a8bd53...)의
> selector·상태·token·접근성·반응형 계약을 그대로 시각화한다. 새로운 selector/class/token/상태를
> 추가하거나 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: 실행 이력 화면에 상태·페르소나 필터 조합을 이름 붙여 저장/재적용하는 "필터 프리셋"
  패널의 시각 표현. 저장은 `localStorage`뿐이며 서버 API·DB 변경은 이 문서의 범위 밖이다.
- **사용자 경험 목표**: 운영자가 프리셋을 저장·선택·초기화하는 동안 `idle → saving → (applied | error)`
  전이를 화면 텍스트로 명확히 인지하고, 저장된 프리셋이 없을 때도 빈 상태(`empty`)를 오인 없이
  파악할 수 있도록 한다. 모든 상태 전이는 텍스트로도 함께 드러나 색상에만 의존하지 않는다.
- **범위 제한**: 이 문서와 mockup은 정적 시각 자료이며 런타임 HTML/CSS/JS를 생성하지 않는다.
  실제 구현은 developer(`demo/run-filter-presets/`)가 담당한다.

## 2. 컬러 팔레트

### Frozen token (변경 금지 — `docs/plans/run-filter-presets-BF-1453.md` §3.4 원문 그대로)

| 용도 | CSS 변수 | HEX |
|---|---|---|
| 패널 배경 (다크 서피스) | `--color-surface-dark` | `#0f172a` |
| 주요 액션 (프리셋 저장 버튼) | `--color-action-primary` | `#2563eb` |
| 본문 텍스트 | `--color-text-primary` | `#e2e8f0` |

### 보조 컬러 (designer 추가 — frozen 계약 아님, 배경/보더/보조 텍스트 참고용)

| 용도 | HEX | 비고 |
|---|---|---|
| 패널 테두리 | `#1e293b` | `--color-surface-dark`보다 한 단계 밝은 다크 톤 |
| 입력창 배경 | `#1e293b` | `preset-name-input` |
| 입력창 테두리 (기본) | `#334155` | |
| 입력창 테두리 (focus) | `--color-action-primary` (`#2563eb`) | focus-visible outline과 동일 색 |
| 보조/캡션 텍스트 | `#94a3b8` | placeholder, `empty` 상태 안내 |
| 리스트 항목 hover/focus 배경 | `#1e293b` | `preset-panel__item` |
| 초기화 버튼 텍스트·테두리 | `#94a3b8` / `#334155` | ghost 버튼 — primary 대비되는 보조 액션 |
| 성공(적용됨) 강조 | `#16a34a` | `applied` 상태 텍스트 보조 강조 (색상 단독 아님) |
| 오류 강조 | `#dc2626` | `error` 상태 텍스트 보조 강조 (색상 단독 아님) |
| 페이지 배경 (mockup 전용) | `#020617` | `--color-surface-dark`보다 더 어두운 페이지 바탕 |

> 위 §3.3 상태 5종은 frozen 계약상 "색상만으로 구분하지 않는다"가 원칙이므로, `applied`/`error`
> 강조색은 텍스트 문구를 보조하는 용도로만 쓰고 상태 판별의 유일한 단서로 삼지 않는다.

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다 (외부 폰트 의존성 0건).

- font-family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif`
- **heading** (패널 타이틀 등 부가 콘텐츠): 16px / weight 600 / line-height 1.4 / color `--color-text-primary`
- **body** (`preset-name-input`, `preset-panel__item`): 14px / weight 400 / line-height 1.5 / color `--color-text-primary`
- **버튼 라벨** (`preset-panel__save`, `preset-panel__reset`): 14px / weight 600 / line-height 1.4
- **caption** (`preset-status` 상태 텍스트): 13px / weight 500 / line-height 1.4 — 굵기로도 상태를
  강조해 색맹 사용자 인지를 보완한다

## 4. 레이아웃

- `preset-panel` (`#preset-root`): 패널 컨테이너 — `background: var(--color-surface-dark)`,
  `border: 1px solid #1e293b`, `border-radius: 8px`, `padding: 16px`, `box-sizing: border-box`
- 패널 내부 요소(입력행 / 리스트 / 상태 영역) 사이 간격, 그리고 입력행 내부 컨트롤(input·저장·초기화
  버튼) 사이 간격 모두 `--space-control-gap: 12px` (frozen token) 적용
- 입력행: `preset-name-input` + `preset-panel__save` + `preset-panel__reset`
  - **데스크톱(≥1024px)**: `flex-direction: row` — input이 `flex: 1`로 남는 폭을 채우고 두 버튼은
    고정 폭으로 오른쪽에 나란히 배치
  - **360px**: `flex-direction: column` — input과 두 버튼을 세로로 스택하고 각각 `width: 100%`
- `preset-list` (`#preset-list`): 저장된 프리셋을 `preset-panel__item` 목록으로 세로 나열.
  각 항목은 `padding: 10px 12px`, `border-radius: 6px`, 키보드 포커스 시 `outline: 2px solid
  var(--color-action-primary)`
- `preset-status` (`#preset-status`): 리스트 바로 아래, 패널 하단에 위치 — 시각적 위치와
  스크린리더 발화 순서(조작 직후 상태 안내)를 일치시킨다
- **360px 폭에서 overflow 방지**: `box-sizing: border-box` + `word-break: keep-all`(한국어 줄바꿈
  고려) + input/버튼/리스트 항목 모두 퍼센트 기반 폭 사용, 패널 자체는 `width: 100%`에 좌우
  여백만 유지

### Breakpoint 표

| 뷰포트 | 입력행 방향 | 버튼 폭 |
|---|---|---|
| 360px | column (세로 스택) | 100% |
| ≥1024px | row (가로 배치) | 고정 폭(콘텐츠 기준, 최소 88px) |

## 5. 컴포넌트 명세

### `#preset-root` (`.preset-panel`)

- 패널 루트 컨테이너. `idle`/`saving`/`applied`/`empty`/`error` 5개 상태를 자식 요소(주로
  `preset-status`)의 텍스트로 표현한다.
- 루트 자체에는 상태별 modifier class를 새로 추가하지 않는다 (frozen — 계약에 없는 class
  임의 추가 금지).

### `#preset-name-input`

- 프리셋 이름 입력. placeholder: "프리셋 이름 입력" (mockup 예시 텍스트, frozen 계약 아님)
- 기본 테두리 `#334155`, focus 시 테두리 `--color-action-primary` + `outline: 2px solid
  var(--color-action-primary)` (focus-visible)

### `#preset-save-button` (`.preset-panel__save`)

| 상태 | 활성/비활성 | 표시 텍스트 | 색상 |
|---|---|---|---|
| idle | 활성 | "저장" | `--color-action-primary` 배경, `--color-text-primary` 텍스트 |
| saving | 비활성 | "저장" | 비활성 배경 `#1e293b`, 텍스트 `#64748b` |
| applied / empty / error | 활성(초기화됨) | "저장" | `--color-action-primary` 배경, `--color-text-primary` 텍스트 |

- `aria-label="프리셋 저장"` (명시적, frozen)

### `#preset-reset-button` (`.preset-panel__reset`)

| 상태 | 활성/비활성 | 표시 텍스트 | 색상 |
|---|---|---|---|
| idle / applied / empty / error | 활성 | "초기화" | 배경 투명, 테두리 `#334155`, 텍스트 `#94a3b8` (ghost 버튼) |
| saving | 비활성 | "초기화" | 배경 투명, 테두리 `#1e293b`, 텍스트 `#475569` |

- `aria-label="필터 초기화"` (명시적, frozen)
- 저장 진행 중에는 초기화도 즉시 재사용 가능해야 한다는 frozen 후조건(§3.3 전이 규칙)에 따라,
  `saving` 종료(성공/실패 불문) 즉시 두 버튼 모두 다시 활성 상태로 복귀한다.

### `#preset-list` (`.preset-panel__item`)

- 저장된 프리셋을 이름 + 저장 시각(`savedAt` 상대 표기, 예: "5분 전") 순으로 나열.
- 각 항목은 `tabindex="0"`으로 키보드 `Tab` 순회 가능해야 하며, `Enter` 키 입력 시 해당 프리셋을
  적용한다 (frozen 접근성 계약).
- `empty` 상태에서는 리스트 영역에 항목 대신 "저장된 프리셋이 없습니다" 안내를 텍스트로 노출한다
  (별도 아이콘·일러스트 없이 캡션 텍스트만 — vanilla-static 규약상 외부 자산 의존 금지).

### `#preset-status` (`.preset-panel__status` 텍스트 영역)

- `aria-live="polite"` (frozen — 상태명을 화면 텍스트와 접근성 이름으로 함께 노출)
- 상태별 정확 문구 (exact — 재문구화 금지, `docs/plans/run-filter-presets-BF-1453.md` §3.3 원문):

| 상태 | 화면 텍스트 (exact) | 텍스트 색상 |
|---|---|---|
| idle | 저장된 프리셋을 선택하거나 새로 저장하세요 | `--color-text-primary` |
| saving | 프리셋 저장 중… | `--color-text-primary` |
| applied | 프리셋이 적용되었습니다 | `--color-text-primary` (보조 강조 `#16a34a` 좌측 4px 보더) |
| empty | 저장된 프리셋이 없습니다 | `#94a3b8` |
| error | 프리셋 저장에 실패했습니다. 다시 시도하세요 | `--color-text-primary` (보조 강조 `#dc2626` 좌측 4px 보더) |

- 색상만으로 상태를 구분하지 않는다 — 상태명이 텍스트에 그대로 포함되어 색맹 사용자도 텍스트로
  상태를 인지할 수 있다 (frozen 접근성 계약).

## 6. dev 구현 가이드

1. selector·class·token 이름은 위 표와 완전히 동일하게 사용한다 — 재정의·리네이밍 금지 (frozen):
   `#preset-root`, `#preset-name-input`, `#preset-save-button`, `#preset-reset-button`,
   `#preset-list`, `#preset-status` / `.preset-panel`, `.preset-panel__save`,
   `.preset-panel__reset`, `.preset-panel__item`.
2. `:root`에 아래 CSS 변수를 그대로 선언:
   ```css
   :root {
     --color-surface-dark: #0f172a;
     --color-action-primary: #2563eb;
     --color-text-primary: #e2e8f0;
     --space-control-gap: 12px;
   }
   ```
3. 입력행 방향 전환은 `@media (min-width: 1024px) { flex-direction: row; }` 기준으로 구현한다
   (기본값 column — 360px 포함 1024px 미만은 세로 스택, mockup과 동일 breakpoint).
4. `#preset-status`는 상태 전이마다 `textContent`를 위 §5 표의 exact 문구로 교체한다. 좌측 보더
   강조색(`applied`/`error`)은 CSS class 없이 인라인 스타일 또는 data 속성 기반으로 적용하되,
   계약에 없는 새 modifier class가 필요하면 구현 전 reviewer와 사전 협의한다.
5. `saving` 종료(성공/실패 불문) 뒤에는 `#preset-save-button`/`#preset-reset-button`을 즉시
   재사용 가능한 활성 상태로 되돌린다 (frozen 후조건, §3.3 전이 규칙).
6. 저장된 프리셋이 0건이면 `#preset-list` 영역은 `empty` 상태 텍스트를 노출한다 (frozen).
7. 키보드 전용 흐름을 보장한다 — `Tab`으로 input → 저장 → 초기화 → 리스트 항목 순 이동,
   리스트 항목에서 `Enter`로 프리셋 적용.
8. localStorage 스키마(`runFilterPresets.v1`, `RunFilterPreset[]`)는 `docs/plans/run-filter-presets-BF-1453.md`
   §4 원문을 그대로 따른다 — 이 문서는 시각 명세이므로 데이터 스키마를 재정의하지 않는다.

## 7. mockup 참조

- 파일: `docs/design/mockups/run-filter-presets-BF-1453.html`
- 위 5개 상태(`idle`/`saving`/`applied`/`empty`/`error`)의 화면 텍스트·색상 token을 정적으로
  시각화하고, 360px/데스크톱(≥1024px) 반응형 동작(입력행 스택 여부)과 `#preset-status` 배치
  위치를 함께 표현한다.
- 이 mockup은 dev의 실제 산출물이 아니며 참조 가이드로만 사용한다. 픽셀 단위 일치 의무는 없다.

## Self-critique

- **AC 매핑**: §5(selector·상태 텍스트 exact)와 §2(frozen token exact)가 planner ui-contract@v1의
  selector·상태·token 원문과 1:1로 대응한다. §4의 360px/데스크톱 레이아웃이 반응형 AC(overflow
  없음, 두 뷰포트 모두 레이아웃 유지)를 각각 커버한다.
- **dev 구현 가이드**: §6에 CSS 변수 선언, breakpoint 조건, 상태 전이 시 후조건(버튼 재활성화),
  키보드 흐름을 단계별로 명시해 dev가 별도 해석 없이 그대로 옮길 수 있게 했다.
- **기존 요소 보존**: 이 작업은 신규 additive 파일(`docs/design/run-filter-presets-BF-1453.md`,
  `docs/design/mockups/run-filter-presets-BF-1453.html`)만 추가하며 기존 파일을 수정하지 않는다.
- **컴포넌트 매핑**: frozen DOM ID 6개·CSS class 4개가 모두 §5에 최소 1회씩 명세되었고, 매핑되지
  않은 추가 selector는 도입하지 않았다.
- **모호함 flag**: planner 문서는 `applied`/`error` 상태의 강조 색상을 frozen하지 않았다 — 이
  문서는 "색상만으로 구분하지 않는다"는 frozen 접근성 원칙을 지키는 선에서 좌측 보더 강조를
  designer 재량으로 보조 추가했다(§2 보조 컬러 표에 명시). 데스크톱 breakpoint 값(1024px)도
  planner가 "≥1024px"로만 지정했고 정확한 buttion 고정폭(88px)은 designer 추정치이므로, dev가
  구현 중 실제 콘텐츠 폭에 맞춰 조정 가능하다.
