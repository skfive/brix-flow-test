# 습관 트래커 시각 명세 (BF-2048)

> 이 문서는 `docs/plans/BF-2047/implementation-plan.md`(planner, BF-2050)가 동결한 UI 계약(DOM id·CSS class·상태·design token·접근성·반응형)을 **그대로** 따르는 시각 명세입니다. 동결 계약은 재정의하지 않으며, 여기서는 레이아웃·타이포그래피·컴포넌트 세부 표현만 구체화합니다.

## 1. 시안 개요

- **변경 범위**: 신규 단일 페이지 `habit-tracker/index.html`(developer, BF-2049 산출물)의 시각 시안. 습관 이름 등록(최대 8개) → 요일별(월~일) 체크 그리드로 완료 여부 토글 → 습관별/전체 주간 완료율 표시.
- **사용자 경험 목표**:
  - 습관을 추가하거나 셀을 체크하는 즉시 `weekly-summary`와 개별 `.habit-rate`가 갱신되는 반응성을 시각적으로 명확히 전달한다.
  - `empty`/`idle`/`error`/`success` 4개 상태를 색상에만 의존하지 않고 상태 라벨 텍스트로 항상 노출한다.
  - 체크 셀은 `button` + `aria-pressed`로 완료 여부를 전달하며, 시각적으로도 체크 표시(✓)와 배경색 두 신호를 함께 사용해 색맹 사용자도 구분 가능하게 한다.
  - 320px 폭에서도 `#habit-grid`가 겹치거나 잘리지 않고 스크롤 또는 축약 레이아웃으로 자연스럽게 표시된다.
- **비목표**: 실제 상태 관리/저장/순수함수 로직 구현(developer 담당, 계획 문서 1~2절 규칙 참조), `habit-tracker/index.html` · `style.css` · `habits.js` 생성/수정.

## 2. 컬러 팔레트

### 2.1 동결 토큰 (planner 동결 — 변경/재정의 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | `#habit-add-button` 배경, 입력 포커스 링, 링크성 강조 텍스트 |
| `--color-success` | `#16a34a` | `success` 상태 라벨 텍스트/아이콘, 등록·체크 성공 확인 표시 |
| `--color-error` | `#dc2626` | `error` 상태 라벨 텍스트, `#habit-error-message` 텍스트/아이콘 |
| `--color-cell-checked` | `#22c55e` | `.habit-cell--checked` 배경 |
| `--color-cell-empty` | `#e5e7eb` | `.habit-cell`(미체크) 배경 |

### 2.2 제안 확장 토큰 (dev 재량 — 동결 아님, 이름/값 조정 가능)

| 토큰(제안명) | 값 | 용도 |
| --- | --- | --- |
| `--color-app-background` | `#f8fafc` | 페이지(앱 바깥) 배경 |
| `--color-surface-card` | `#ffffff` | `.habit-tracker-app` 카드 배경 |
| `--color-border` | `#e2e8f0` | 카드/입력/그리드 테두리 |
| `--color-text-primary` | `#0f172a` | 제목, 습관명, 본문 텍스트 |
| `--color-text-secondary` | `#64748b` | 라벨, `.habit-rate`, 상태 라벨 보조 텍스트 |
| `--color-cell-mark` | `#ffffff` | `.habit-cell--checked` 내부 체크 아이콘 색 |

> primary/success/error 색상은 모두 동결 토큰이며 별도 accent 색상은 도입하지 않는다(추가 색은 4개 상태 구분의 시각적 노이즈가 되므로 배제).

## 3. 타이포그래피

- **font-family**: `--font-family-base` (동결) — `system-ui, -apple-system, "Segoe UI", sans-serif`. vanilla-static 규약에 따라 외부 폰트 CDN 의존 없이 system font만 사용한다. 앱 전역(`.habit-tracker-app` 및 하위 모든 요소)에 이 토큰 하나만 적용한다.

| 요소 | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 앱 타이틀 (h1) | 22px | 700 | 1.3 | "습관 트래커" |
| 섹션 헤딩 (h2) | 16px | 600 | 1.4 | "습관 추가", "주간 요약", "습관 체크" |
| 상태 라벨(`role="status"`) | 13px | 600 | 1.3 | "상태: 습관 없음" 등 4-state 텍스트(5.1절) |
| `#habit-name-input` | 15px | 400 | 1.5 | placeholder는 `--color-text-secondary` |
| `#habit-add-button` | 14px | 600 | 1.3 | |
| `#habit-error-message` | 13px | 600 | 1.4 | `--color-error`, 아이콘 병기 가능 |
| `.summary-bar` 퍼센트 텍스트 | 14px | 700 | 1.2 | `#weekly-summary` 내부 |
| 요일 헤더 라벨 | 12px | 600 | 1.2 | `--color-text-secondary`, 4.4절 축약 규칙 적용 |
| 습관명(`.habit-row` 내) | 14px | 600 | 1.3 | 긴 이름은 `overflow-wrap: break-word` (최대 20자 규칙, 계획 문서 2.2절) |
| `.habit-rate` | 12px | 600 | 1.2 | `--color-text-secondary`, 예: "5/7" |

## 4. 레이아웃

### 4.1 구조 (문서 순서 = 스크린리더 읽기 순서)

```
#habit-tracker-root (.habit-tracker-app, max-width 420px, margin 0 auto)
├─ header
│   ├─ h1 "습관 트래커"
│   └─ p[role="status"][aria-live="polite"] 상태 라벨 (5.1절)
├─ section (입력 영역)
│   ├─ h2 "습관 추가"
│   ├─ label[for=habit-name-input] "습관 이름"
│   ├─ input#habit-name-input (aria-label="습관 이름 입력", maxlength 20)
│   ├─ button#habit-add-button "추가"
│   └─ p#habit-error-message[role="alert"] (검증 실패 시에만 텍스트 채움)
├─ section (주간 요약)
│   ├─ h2 "주간 요약"
│   └─ div#weekly-summary
│       └─ div.summary-bar (전체 평균 완료율 바 + 퍼센트 텍스트)
└─ section (체크 그리드)
    ├─ h2 "습관 체크"
    └─ div.habit-grid-scroll (overflow-x: auto 스크롤 컨테이너, 4.3절)
        └─ div#habit-grid
            ├─ 헤더 행 (좌상단 빈 셀 + 요일 라벨 7개 + rate 열 빈 셀)
            └─ div.habit-row (습관별 반복)
                ├─ span (습관명)
                ├─ button.habit-cell × 7 (요일별, aria-pressed)
                └─ span.habit-rate (예: "5/7")
```

- `empty` 상태(습관 0개)에서는 `#habit-grid` 헤더 행만 남기거나 안내 문구("습관을 추가해 트래킹을 시작하세요")로 대체한다 — `.habit-row`가 없는 것 자체가 데이터 부재를 의미하며 별도 placeholder row를 만들지 않는다.

### 4.2 Spacing

- 섹션 간 세로 간격: 24px.
- `#habit-grid`의 행/열 간격: **8px**(`--space-grid-gap`, 동결) — grid `gap` 값으로 사용.
- `.habit-tracker-app` 패딩: 24px (데스크톱), ≤480px에서 16px.
- `#habit-name-input`과 `#habit-add-button` 사이 간격: 8px (가로 배치, 좁은 폭에서 세로 스택).

### 4.3 `#habit-grid` 반응형 규칙

```css
.habit-grid-scroll {
  overflow-x: auto;
}
#habit-grid {
  display: grid;
  grid-template-columns: minmax(72px, auto) repeat(7, 32px) 40px; /* 습관명 + 요일 7 + rate */
  gap: var(--space-grid-gap); /* 8px, 동결 */
  align-items: center;
}
```

- **320px 검증**: 위 컬럼 폭 합계(72 + 32×7 + 40 + gap 9×8 = 72+224+40+72 = 408px)는 320px 뷰포트보다 넓다. 계약 3.6절은 "overflow 없음" 또는 "`overflow-x: auto` 스크롤 가능" 중 하나만 만족하면 되므로, 본 명세는 `.habit-grid-scroll`에 `overflow-x: auto`를 적용해 습관 개수·이름 길이와 무관하게 항상 만족시키는 전략을 택한다.
- 요일 헤더/셀 열 폭(32px)은 습관 개수(최대 8개)와 무관하게 고정 — 행 수가 늘어도 가로 폭은 변하지 않는다.

### 4.4 요일 헤더 라벨 축약 규칙 (계약 3.6절)

| 폭 | 라벨 형식 | 예 |
| --- | --- | --- |
| ≥600px | 전체 요일명 | 월요일, 화요일, 수요일, 목요일, 금요일, 토요일, 일요일 |
| <600px | 축약형(1글자) | 월, 화, 수, 목, 금, 토, 일 |

- 요일 순서는 항상 월→일 고정(계획 문서 1.4절과 동일 순서).
- 라벨 텍스트 자체를 미디어쿼리로 교체하거나(`::before`/`::after` 대신 두 개의 `<span>`을 두고 하나만 시각적으로 숨김) CSS `content` 스위칭 중 dev 재량으로 구현하되, 스크린리더에는 항상 하나의 명확한 텍스트만 노출되도록 한다(5.5절 참조).

## 5. 컴포넌트 명세

### 5.1 상태 라벨 (`role="status"`, 계약 3.3/3.7절 구현체)

| 항목 | 내용 |
| --- | --- |
| 위치 | 헤더 영역, `<h1>` 바로 아래 |
| 마크업 | `<p role="status" aria-live="polite" class="app-status">상태: {텍스트}</p>` |
| 상태별 텍스트 | `empty` → "상태: 습관 없음" · `idle` → "상태: 정상" · `error` → "상태: 오류 - {검증 실패 메시지}" · `success` → "상태: 등록 완료" 또는 "상태: 체크 완료" |
| 시각 | 상태별 색상 점(8px) 병기 가능(empty/idle=`--color-text-secondary`, error=`--color-error`, success=`--color-success`)하나 **점 색상만으로 상태를 구분하지 않음** — 텍스트가 항상 주 정보원 |

### 5.2 `#habit-name-input` / `#habit-add-button`

| 항목 | 내용 |
| --- | --- |
| 타입 | `<input type="text">` + `<button type="button">` |
| aria-label (동결) | `#habit-name-input` → `"습관 이름 입력"` |
| 속성 | `maxlength="20"` (계획 문서 2.2절 20자 규칙과 시각적으로 정렬, 실제 검증은 `validateHabitName`) |
| 시각 | input: 높이 40px, 테두리 1px `--color-border`, radius 8px, 포커스 시 `outline: 2px solid var(--color-action-primary)`. button: 배경 `--color-action-primary`, 텍스트 흰색, radius 8px |
| placeholder | "예: 운동" (`--color-text-secondary`) |
| 상태 | 두 요소 모두 어떤 상태에서도 `disabled` 처리하지 않는다(계획 문서 3.7절 — 검증 실패 후 즉시 재사용 가능) |
| 배치 | 데스크톱: input + button 한 행. 480px 미만: input 위, button 아래 세로 스택(전체 폭) |

### 5.3 `#habit-error-message`

| 항목 | 내용 |
| --- | --- |
| role (동결) | `alert` |
| 시각 | 텍스트 `--color-error`, 좌측 아이콘(⚠) 병기 가능, 배경 없음(텍스트만) |
| 표시 규칙 | 검증 실패(빈 이름/중복/20자 초과/최대 8개 초과) 직후에만 텍스트가 채워지고, 다음 성공적인 입력/추가 시 빈 문자열로 초기화된다. 빈 문자열일 때는 시각적으로 공간을 차지하지 않도록 `display: none` 또는 `min-height: 0` 처리 |
| 오류 문구 | 계획 문서 1.3절/2.2절 문구를 그대로 사용: "습관 이름을 입력하세요" / "습관 이름은 20자 이내로 입력하세요" / "이미 등록된 습관입니다" / "최대 8개까지 등록할 수 있습니다" |

### 5.4 `#weekly-summary` / `.summary-bar`

| 항목 | 내용 |
| --- | --- |
| 구성 | `#weekly-summary` 컨테이너 안에 `.summary-bar` 1개(전체 습관의 평균 주간 완료율) |
| `.summary-bar` 내부 | track(배경 `--color-cell-empty`) + fill(너비 = 평균 완료율 %, 배경 `--color-action-primary`) + 퍼센트 텍스트(예: "전체 완료율 54%") |
| 계산 근거(표시용) | 습관별 `weeklyRate(habit, weekDates)`(계획 문서 2.1절) 평균값 × 100, 반올림 정수 % — 계산 로직 자체는 developer 구현, 본 문서는 표시 형식만 정의 |
| `empty` 상태 | 습관이 0개면 fill 너비 0%, 텍스트 "습관을 추가하면 완료율이 표시됩니다" |
| 접근성 | fill에 `role="img"` 불필요 — 퍼센트 텍스트가 이미 동일 정보를 텍스트로 제공하므로 시각 바는 `aria-hidden="true"` |

### 5.5 `#habit-grid` / `.habit-row` / `.habit-cell` / `.habit-rate`

| 항목 | 내용 |
| --- | --- |
| DOM id (동결) | `habit-grid` (컨테이너 1개) |
| class (동결) | `.habit-row`(습관별 행), `.habit-cell`(요일 셀 button), `.habit-cell--checked`(체크된 셀), `.habit-rate`(습관별 완료율 텍스트) |
| `.habit-row` 구성 | 습관명 `<span>` + `.habit-cell` button × 7(월~일) + `.habit-rate` `<span>` |
| `.habit-cell` 타입 | `<button type="button">`, `aria-pressed="true|false"`(동결 요구사항) |
| `.habit-cell` accessible name | `aria-label="{습관명} {요일명} {완료|미완료}"` (예: "운동 월요일 완료") — 요일명은 4.4절 축약 여부와 무관하게 항상 전체 요일명 사용(스크린리더 명확성 우선) |
| `.habit-cell` 시각(미체크) | 배경 `--color-cell-empty`, 테두리 1px `--color-border`, radius 6px, 내부 비어 있음 |
| `.habit-cell--checked` 시각 | 배경 `--color-cell-checked`, 내부 체크 아이콘(✓) 색 `--color-cell-mark`, font-weight 700 — 배경색 + 아이콘 두 신호로 색맹 사용자도 구분 가능 |
| `.habit-rate` | 습관별 `weeklyRate` × 7 형식 "{체크수}/7" 텍스트(예: "5/7"), `--color-text-secondary` |
| `empty` 상태 | `.habit-row`가 하나도 없음 — 헤더 행만 표시하거나 4.1절 안내 문구로 대체 |

## 6. dev 구현 가이드 (developer, BF-2049 대상)

1. `habit-tracker/index.html` + `habit-tracker/style.css` + `habit-tracker/habits.js`로 파일을 분리하되(계획 문서 0절 소유권 표), 외부 CDN/라이브러리는 사용하지 않는다.
2. `:root`(또는 `style.css` 최상단)에 동결 토큰 7개를 **정확한 이름과 값 그대로** 선언한다:
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-success: #16a34a;
     --color-error: #dc2626;
     --color-cell-checked: #22c55e;
     --color-cell-empty: #e5e7eb;
     --font-family-base: system-ui, -apple-system, "Segoe UI", sans-serif;
     --space-grid-gap: 8px;
   }
   ```
   본 문서 2.2절의 확장 토큰은 이름/값을 자유롭게 조정 가능(동결 아님).
3. DOM id 6개(`habit-tracker-root`, `habit-name-input`, `habit-add-button`, `habit-error-message`, `weekly-summary`, `habit-grid`)와 class 5개(`habit-row`, `habit-cell`, `habit-cell--checked`, `habit-rate`, `summary-bar`)는 계획 문서 3.1/3.2절과 본 문서 철자 그대로 사용한다(오타·재명명 금지).
4. `#habit-grid`는 4.3절의 `grid-template-columns: minmax(72px, auto) repeat(7, 32px) 40px` + `gap: var(--space-grid-gap)` 패턴을 그대로 적용하면 320px 스크롤 전략이 성립한다. 다른 컬럼 폭을 쓰더라도 `.habit-grid-scroll`(또는 동등 래퍼)에 `overflow-x: auto`를 적용해 320px에서 겹침·잘림이 없어야 한다(계획 문서 3.6절 필수 요건).
5. `.habit-cell`은 반드시 `<button>` + `aria-pressed`로 구현하고, 클릭 시 `aria-pressed` 토글과 `.habit-cell--checked` class 토글을 함께 갱신한다(5.5절 accessible name 포함).
6. 요일 헤더 라벨은 4.4절 축약 규칙(≥600px 전체명 / <600px 1글자)을 미디어쿼리로 전환하되, 스크린리더에는 항상 하나의 명확한 텍스트만 노출한다(예: 시각적으로 숨긴 전체명 `<span class="sr-only">` + 표시용 축약 `<span aria-hidden="true">` 조합, 또는 CSS `content` 스위칭).
7. 검증 실패(빈 이름/중복/20자 초과/8개 초과) 시 `#habit-error-message`에 계획 문서 문구를 그대로 채우고 상태 라벨을 `error`로 전환한다. 실패 후에도 `#habit-name-input`/`#habit-add-button`은 즉시 재사용 가능해야 하며(계획 문서 3.7절), 입력값과 상태 라벨은 다음 유효한 조작에서 초기 상태(`idle` 또는 `empty`)로 복원된다.
8. 등록/체크 성공 시 `localStorage`와 `#weekly-summary`, 해당 `.habit-rate`를 즉시 갱신하고 상태 라벨을 `success`로 전환한다(전환 지속 시간은 dev 재량, 짧은 시각 확인 후 `idle`로 복귀 권장).
9. 완료율 계산(`weeklyRate`)과 이름 검증(`validateHabitName`)은 본 문서가 아닌 `docs/plans/BF-2047/implementation-plan.md` 2절을 유일한 근거로 구현한다 — 본 문서의 예시 수치(mockup 포함)는 레이아웃 참고용 placeholder이며 계산 규칙의 출처가 아니다.

## 7. mockup 참조

- 파일: `docs/design/habit-tracker-BF-2047-mockup.html`
- 구성: (1) `idle` 상태 실행 예시 — 동결 id/class를 실제로 부여한 단일 인스턴스(습관 4개, 체크 패턴 예시), (2) `empty` 상태 참고 스케치, (3) `error` 상태 참고 스케치, (4) `success` 상태 참고 스케치, (5) 320px 폭 반응형 미리보기(요일 헤더 축약형 + 가로 스크롤 확인) 프레임. (2)~(5)는 HTML `id` 유일성 제약 때문에 동결 id를 재부여하지 않고 동결 class만 재사용한 참고용 스케치이며 실제 DOM 구조를 그대로 복제한 것은 아니다.
- mockup 내 습관명·체크 패턴·완료율 수치는 6절 참고 데이터(placeholder)이며 실제 산출값은 개발자가 계획 문서 2절 규칙으로 계산한다.
