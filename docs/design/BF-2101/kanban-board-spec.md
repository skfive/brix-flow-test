# 칸반 보드 UI 시안 (BF-2102 / BF-2101)

> 본 문서는 `docs/plans/BF-2101/implementation-plan.md` §6 UI 계약(동결)을 그대로 시각화한 designer 산출물입니다. selector, DOM ID/class, token, 상태명, 접근성, 반응형 값은 planner가 동결한 값을 재정의하지 않고 그대로 사용합니다.

## 1. 시안 개요

- **변경 범위**: 칸반 보드 화면 전체 — 툴바(카드 추가 + 우선순위 필터), `todo`/`doing`/`done` 3개 컬럼, 카드, 카드 생성/편집 폼, 삭제 확인 dialog.
- **사용자 경험 목표**:
  - 사용자가 카드의 우선순위를 색으로 즉시 구분하되, 색약 사용자도 텍스트 라벨로 우선순위를 알 수 있게 한다.
  - 카드 이동(◀ ▶)과 삭제가 마우스 없이 키보드만으로 가능해야 한다.
  - 모바일(320px)에서도 스크롤 없이 3개 컬럼을 세로로 순회할 수 있어야 한다.
- **데이터 흐름**: 서버 API 없음. `storage.js`가 로컬 저장소에서만 로드/저장 (본 문서는 시각 명세만 다루며 구현은 developer 담당).

## 2. 컬러 팔레트

| 용도 | 변수 | HEX | 사용처 |
|---|---|---|---|
| 우선순위 - 높음 | `--color-priority-high` | `#dc2626` | `.kanban-card--high` 좌측 보더/배지 |
| 우선순위 - 중간 | `--color-priority-med` | `#d97706` | `.kanban-card--med` 좌측 보더/배지 |
| 우선순위 - 낮음 | `--color-priority-low` | `#16a34a` | `.kanban-card--low` 좌측 보더/배지 |
| 컬럼 배경 | `--color-column-bg` | `#f3f4f6` | `.kanban-column` 배경 |
| 배경(전체) | (신규 토큰 아님) | `#ffffff` | `#kanban-board-root` 배경 |
| 텍스트 - 기본 | (신규 토큰 아님) | `#1f2937` | 카드 제목/본문 |
| 텍스트 - 보조 | (신규 토큰 아님) | `#6b7280` | 설명, 카운트, 캡션 |
| 테두리 | (신규 토큰 아님) | `#e5e7eb` | 카드/폼/dialog 보더 |

> 동결 토큰(`--color-priority-*`, `--color-column-bg`)만 planner 계약값을 그대로 사용하며, 표의 나머지 색상은 신규 CSS 변수를 추가 정의하지 않고 배경/텍스트/보더에 한해 고정 HEX로만 사용합니다(토큰 재정의 금지 원칙 준수).

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| Heading (보드 타이틀) | system-ui, -apple-system, "Segoe UI", sans-serif | 20px | 700 | 1.3 |
| 컬럼 타이틀 | system-ui, -apple-system, "Segoe UI", sans-serif | 15px | 600 | 1.4 |
| 카드 제목 | system-ui, -apple-system, "Segoe UI", sans-serif | 14px | 600 | 1.4 |
| Body (카드 설명, 폼 입력) | system-ui, -apple-system, "Segoe UI", sans-serif | 13px | 400 | 1.5 |
| Caption (카운트, 우선순위 배지, 에러 메시지) | system-ui, -apple-system, "Segoe UI", sans-serif | 12px | 500 | 1.4 |

## 4. 레이아웃

### 4.1 전체 구조

```
#kanban-board-root
├── .kanban-toolbar          (카드 추가 버튼 + #kanban-priority-filter)
└── .kanban-board             (3개 컬럼 컨테이너)
    ├── #kanban-column-todo   .kanban-column
    ├── #kanban-column-doing  .kanban-column
    └── #kanban-column-done   .kanban-column
```

각 `.kanban-column` 내부:
```
.kanban-column
├── (컬럼 헤더) 컬럼명 텍스트 + .kanban-column__count
└── .kanban-card (0개 이상)
    ├── 우선순위 배지 (텍스트 라벨, 색상 아님)
    ├── 카드 제목 / 설명
    └── 이동 버튼 2개(◀ ▶, aria-label 포함) + 삭제 버튼
```

### 4.2 spacing

- 카드 간 간격: `--space-card-gap` (`12px`) — `.kanban-card` 세로 마진/`.kanban-column` 내부 `gap`으로 적용.
- 컬럼 간 간격: `16px`.
- 컬럼 내부 패딩: `12px`.
- 카드 내부 패딩: `10px 12px`.
- 툴바 패딩: `12px 16px`, 툴바-보드 사이 간격 `16px`.

### 4.3 breakpoint 별 동작

| breakpoint | 컬럼 배치 | 비고 |
|---|---|---|
| `min-width: 320px` (기본) | 세로 스택 (`flex-direction: column`) | 3개 컬럼이 위→아래로 쌓이며 가로 스크롤 없음. 컬럼 내부는 세로 스크롤 허용. |
| `min-width: 768px` | 가로 배치 (`flex-direction: row`, 3열 `1fr 1fr 1fr`) | 3개 컬럼이 가로로 나란히 표시. |

## 5. 컴포넌트 명세

### 5.1 툴바 — `.kanban-toolbar`

| 요소 | 타입 | props/상태 | 인터랙션 |
|---|---|---|---|
| "카드 추가" 버튼 | `<button>` | 텍스트: "+ 카드 추가" | 클릭 시 `idle → creating`, `#kanban-card-form` 노출 |
| 우선순위 필터 | `<select id="kanban-priority-filter" aria-label="우선순위 필터">` | 옵션: 전체/높음(`high`)/중간(`med`)/낮음(`low`) | 변경 시 해당 우선순위 카드만 표시. "전체" 재선택 시 필터 초기화(§5.3 엣지 케이스) |

### 5.2 컬럼 — `.kanban-column` (`#kanban-column-todo` / `-doing` / `-done`)

| props | 값 |
|---|---|
| `columnId` | `todo` \| `doing` \| `done` |
| 헤더 텍스트 | "할 일" / "진행 중" / "완료" |
| `.kanban-column__count` | 현재 컬럼에 표시 중인(필터 적용 후) 카드 개수 |
| 배경 | `--color-column-bg` |

빈 컬럼 상태: 카드가 0개면 컬럼 내부에 캡션 텍스트 "카드가 없습니다"를 표시(플레이스홀더, 별도 컴포넌트 아님).

### 5.3 카드 — `.kanban-card` (+ `--high` / `--med` / `--low`)

| props | 타입 | 설명 |
|---|---|---|
| `id` | string | 카드 식별자 |
| `title` | string | 카드 제목 (필수) |
| `description` | string \| null | 카드 설명 |
| `priority` | `high\|med\|low` | `.kanban-card--{priority}` 클래스 결정, 좌측 4px 보더 + 텍스트 배지("높음"/"중간"/"낮음")로 이중 표시 |
| `columnId` | `todo\|doing\|done` | 이동 버튼 활성/비활성 결정(§5.4) |

상태(인터랙션):
- 카드 클릭(제목/설명 영역) → `idle → editing`, `#kanban-card-form`에 기존 값 채워 노출.
- hover: 배경 `#fafafa`, 그림자 `0 1px 3px rgba(0,0,0,0.08)`.
- focus-visible: `2px solid #2563eb` outline.

### 5.4 카드 이동 버튼 — `.kanban-move-btn`

| props | 값 |
|---|---|
| 방향 | `prev`(◀) \| `next`(▶) |
| `aria-label` | `prev` → "이전 컬럼으로 이동" / `next` → "다음 컬럼으로 이동" |
| 비활성 조건 | `todo` 카드의 ◀, `done` 카드의 ▶는 `disabled` (더 이상 이동할 컬럼 없음) |
| 포커스 | Tab으로 도달 가능, `focus-visible` 시 `2px solid #2563eb` outline |

카드 삭제 버튼(별도, "삭제"): 클릭 시 `idle → confirming-delete`.

### 5.5 카드 생성/편집 폼 — `#kanban-card-form`

상태: `creating`(빈 값) / `editing`(기존 값 채움) / `validation-error`(빈 값 재제출 시 하위 상태로 표시).

| 필드 | 타입 | 필수 | 인터랙션 |
|---|---|---|---|
| 제목 input | `<input type="text">` | Y | 빈 값(공백만 포함 포함) 제출 시 `validation-error` — 필드 하단에 "제목을 입력해주세요" 캡션(빨강 `#dc2626`) 노출, 폼 유지 |
| 설명 textarea | `<textarea>` | N | — |
| 우선순위 select | `<select>` | Y (기본값 `med`) | 높음/중간/낮음 |
| 저장 버튼 | `<button type="submit">` | — | 유효 시 카드 생성/갱신 후 `idle` 복귀 |
| 취소 버튼 | `<button type="button">` | — | 폼 닫고 `idle` 복귀(입력값 폐기) |

### 5.6 삭제 확인 dialog — `#kanban-delete-confirm-dialog`

| props | 값 |
|---|---|
| `role` | `alertdialog` |
| 상태 | `confirming-delete` |
| 본문 텍스트 | "이 카드를 삭제하시겠습니까?" + 대상 카드 제목 |
| 버튼 | "삭제"(확인, 위험 스타일 `#dc2626` 배경) / "취소" |
| 키보드 | `Escape` → 취소와 동일 동작(`confirming-delete → idle`, 카드 보존) |

## 6. dev 구현 가이드

1. `#kanban-board-root`를 최상위 컨테이너로 사용하고 내부에 `.kanban-toolbar` → `.kanban-board` 순서로 배치한다.
2. `.kanban-board`는 기본(`320px~`) `flex-direction: column`, `768px` 이상에서 `flex-direction: row`로 전환하는 media query를 사용한다(§4.3).
3. 컬럼 3개는 `#kanban-column-todo`, `#kanban-column-doing`, `#kanban-column-done` ID와 공통 클래스 `.kanban-column`을 함께 부여한다.
4. 카드 카운트는 `.kanban-column__count`에 필터 적용 후 개수를 렌더링한다(전체 카드 수가 아님).
5. 카드는 `.kanban-card`에 우선순위별 `.kanban-card--high|med|low`를 추가 부여하고, CSS는 `--color-priority-*` 변수를 좌측 보더 색상으로 사용한다. 배지 텍스트("높음"/"중간"/"낮음")는 색상과 별개로 항상 렌더링한다(접근성 §6.6 대응, 색상만으로 구분 금지).
6. 이동 버튼은 `.kanban-move-btn` 클래스를 공유하고 `aria-label`을 방향별로 다르게 설정한다. `todo`의 ◀와 `done`의 ▶는 `disabled` 속성을 부여한다.
7. `#kanban-priority-filter`에 `aria-label="우선순위 필터"`를 반드시 부여한다. "전체" 옵션 선택 시 필터 상태를 초기화한다.
8. `#kanban-delete-confirm-dialog`는 `role="alertdialog"`로 렌더링하고, `keydown`에서 `Escape` 처리 시 카드 삭제 없이 `idle`로 복귀시킨다.
9. 상태 전이는 §3 상태 머신(`idle/creating/editing/confirming-delete/validation-error`)을 그대로 따르며, 상태명을 화면 텍스트(폼 타이틀, 버튼 라벨 등)와 접근성 이름에 노출한다(예: 폼 헤더가 "카드 추가" vs "카드 편집"으로 상태를 구분).
10. CSS 변수는 `:root`에 `--color-priority-high`, `--color-priority-med`, `--color-priority-low`, `--color-column-bg`, `--space-card-gap`을 정의하고 그대로 참조한다(변수명 변경 금지).

## 7. mockup 참조

- 시각 mockup: [`docs/design/BF-2101/mockup.html`](./mockup.html)
- mockup은 `idle`(기본 3컬럼 + 카드 목록), `creating`(카드 폼 노출), `confirming-delete`(alertdialog 노출) 3개 상태를 `<section>` 단위로 정적 표현한다.

## 8. Self-critique

### 8.1 AC 매핑 표

| Acceptance Criteria | 반영 위치 |
|---|---|
| domIds 정확히 반영 (`kanban-board-root`, `kanban-card-form`, `kanban-column-todo/doing/done`, `kanban-priority-filter`, `kanban-delete-confirm-dialog`) | §4.1 레이아웃 구조도, mockup.html 각 `id` 속성 |
| cssClasses 정확히 반영 (`kanban-board`, `kanban-column`, `kanban-column__count`, `kanban-card`, `kanban-card--high/med/low`, `kanban-toolbar`, `kanban-move-btn`) | §4.1, §5 컴포넌트 명세, mockup.html class 속성 |
| states 정확히 반영 (`idle`, `creating`, `editing`, `confirming-delete`, `validation-error`) | §5.5, §5.6, §6-9, mockup.html 3개 `<section>` |
| designTokens 정확히 반영 (`--color-priority-high/med/low`, `--color-column-bg`, `--space-card-gap`) | §2 컬러 팔레트, §6-10, mockup.html `:root` |
| accessibility 정확히 반영 (필터 aria-label, 이동 버튼 aria-label, alertdialog+Escape, 색상 외 텍스트 구분) | §5.1, §5.4, §5.6, §6-5/6/8/9, mockup.html |
| responsive 정확히 반영 (320px 세로 스택, 768px 가로 배치) | §4.3, §6-2, mockup.html media query |

### 8.2 dev 구현 가이드 존재 여부
§6에 10단계 구현 가이드 포함 — CSS 변수명, 클래스명, media query breakpoint, 상태 전이 트리거를 모두 exact 값으로 명시.

### 8.3 기존 요소 보존 여부
본 작업은 신규 화면(칸반 보드)이며 기존 UI 요소를 대체/제거하지 않음. planner 동결 계약(§6.1~6.7)의 selector/token/상태명을 재정의하지 않고 그대로 사용함.

### 8.4 컴포넌트 매핑 명확성
§5의 각 컴포넌트(툴바/컬럼/카드/이동버튼/폼/dialog)에 props·상태·인터랙션을 표로 명시하여 developer가 App.jsx/board.js 구현 시 참조 가능하도록 구성함.

### 8.5 모호함 flag
- 컬럼 헤더 텍스트("할 일"/"진행 중"/"완료")와 빈 컬럼 캡션("카드가 없습니다")은 planner 동결 계약에 exact 문구가 명시되지 않아 designer가 제안한 값입니다. developer는 이 문구를 그대로 사용하거나 필요 시 조정할 수 있습니다(DOM ID/class/token/상태명이 아니므로 재정의 제약 대상 아님).
- 카드 삭제 트리거 버튼의 정확한 DOM 표현(별도 버튼 vs 아이콘)은 동결 계약에 명시되지 않아 텍스트 버튼("삭제")으로 제안함.
