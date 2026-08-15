# 칸반 보드 구현 설계 (BF-2101 / BF-2104)

> 이 문서는 designer(BF-2102)·developer(BF-2103)가 그대로 따르는 실행 설계이며, 아래 UI 계약은 **동결(frozen)** 값입니다. selector, DOM ID/class, token, 상태명을 재정의하지 마세요.

## 1. 개요

칸반 보드는 `todo`(할 일) / `doing`(진행 중) / `done`(완료) 3개 컬럼으로 구성되며, 사용자는 카드를 생성·편집·이동·삭제하고 우선순위로 필터링할 수 있습니다. 데이터는 클라이언트 로컬 저장소(`storage.js`)에만 영속화되며 서버 API는 없습니다.

## 2. 화면 흐름

### 2.1 기본 흐름
1. 앱 진입 시 `idle` 상태. `storage.js`가 로컬 저장소에서 보드 상태를 로드하여 3개 컬럼에 카드를 렌더링한다.
2. 사용자가 "카드 추가"를 클릭하면 `creating` 상태로 전환되고 `#kanban-card-form`이 노출된다.
3. 제목/설명/우선순위를 입력해 제출하면 카드가 `todo` 컬럼에 생성되고 `idle`로 복귀한다.
4. 사용자가 카드를 클릭하면 `editing` 상태로 전환되고 폼에 기존 값이 채워진다. 저장 시 카드가 갱신되고 `idle`로 복귀한다.
5. 사용자가 카드의 ◀ / ▶ 버튼을 클릭하면 카드가 인접 컬럼(`todo` ↔ `doing` ↔ `done`)으로 이동한다.
6. 사용자가 `#kanban-priority-filter`에서 우선순위를 선택하면 해당 우선순위 카드만 표시된다. "전체"를 다시 선택하면 필터가 초기화되어 모든 카드가 표시된다.

### 2.2 실패/예외 흐름
- 제목을 비운 채 제출 → `validation-error` 상태, 카드 미생성, 폼 유지, 에러 메시지 노출.
- 카드 삭제 버튼 클릭 → `confirming-delete` 상태, `#kanban-delete-confirm-dialog`(`role="alertdialog"`) 노출. 확인 시 삭제 후 `idle` 복귀, 취소(또는 Escape) 시 카드 보존 후 `idle` 복귀.

## 3. 상태 머신

`idle → creating/editing → (validation-error | idle)`, `idle → confirming-delete → idle`

| 상태 | 진입 조건 | 종료 조건 |
|---|---|---|
| `idle` | 초기 진입, 제출/삭제/취소 완료 후 | 카드 생성/편집/삭제 액션 시작 |
| `creating` | "카드 추가" 클릭 | 제출 성공(→idle) 또는 실패(→validation-error) |
| `editing` | 기존 카드 클릭 | 저장 성공(→idle) 또는 실패(→validation-error) |
| `validation-error` | 빈 제목 제출 | 값 수정 후 재제출(→creating/editing 유지 후 idle) 또는 취소(→idle) |
| `confirming-delete` | 카드 삭제 버튼 클릭 | 삭제 확인(→idle, 카드 제거) 또는 취소/Escape(→idle, 카드 보존) |

## 4. 보드/카드 상태 스키마

### Card
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | Y | 카드 고유 식별자 |
| `title` | string | Y | 공백만으로 구성되거나 빈 문자열일 수 없음 |
| `description` | string \| null | N | 카드 설명 |
| `priority` | `"high" \| "med" \| "low"` | Y | `kanban-card--high/--med/--low` 및 우선순위 필터와 매핑 |
| `columnId` | `"todo" \| "doing" \| "done"` | Y | `kanban-column-todo/doing/done`과 매핑 |

## 5. 엣지 케이스 (Given/When/Then)

### 5.1 빈 제목
- **Given** 카드 생성/편집 폼이 열려 있다
- **When** 제목이 빈 문자열이거나 공백만 포함된 채 제출한다
- **Then** `validation-error` 상태로 전환되고, 카드는 생성/수정되지 않으며, 에러 메시지가 표시된다

### 5.2 삭제 확인
- **Given** 카드가 하나 이상 존재한다
- **When** 카드의 삭제 버튼을 클릭한다
- **Then** `confirming-delete` 상태로 전환되고 `#kanban-delete-confirm-dialog`가 `role="alertdialog"`로 노출된다
- **When** 삭제를 확인한다
- **Then** 카드가 제거되고 `idle`로 복귀한다
- **When** (대안) Escape를 누르거나 취소를 클릭한다
- **Then** 카드는 보존되고 `idle`로 복귀한다

### 5.3 필터 초기화
- **Given** `#kanban-priority-filter`로 특정 우선순위만 표시 중이다
- **When** 필터를 "전체"로 재선택한다
- **Then** 모든 컬럼의 카드가 다시 표시된다(필터 초기화)

## 6. UI 계약 (동결 — exact 값)

### 6.1 산출물 경로
| 경로 | 소유자 |
|---|---|
| `docs/design/BF-2101/kanban-board-spec.md` | designer |
| `docs/design/BF-2101/mockup.html` | designer |
| `kanban-board/index.html` | developer |
| `kanban-board/package.json` | 공통 owner(패킷 owner) |
| `kanban-board/package-lock.json` | 공통 owner(패킷 owner) |
| `kanban-board/src/main.jsx` | developer |
| `kanban-board/src/App.jsx` | developer |
| `kanban-board/src/lib/board.js` | developer |
| `kanban-board/src/lib/board.test.js` | developer |
| `kanban-board/src/lib/storage.js` | developer |
| `kanban-board/vite.config.js` | developer |

### 6.2 DOM ID
`kanban-board-root`, `kanban-card-form`, `kanban-column-todo`, `kanban-column-doing`, `kanban-column-done`, `kanban-priority-filter`, `kanban-delete-confirm-dialog`

### 6.3 CSS class
`kanban-board`, `kanban-column`, `kanban-column__count`, `kanban-card`, `kanban-card--high`, `kanban-card--med`, `kanban-card--low`, `kanban-toolbar`, `kanban-move-btn`

### 6.4 상태(states)
`idle`, `creating`, `editing`, `confirming-delete`, `validation-error`

### 6.5 Design token (CSS 변수)
```
--color-priority-high: #dc2626;
--color-priority-med:  #d97706;
--color-priority-low:  #16a34a;
--color-column-bg:     #f3f4f6;
--space-card-gap:      12px;
```

### 6.6 접근성
- 우선순위 필터 `select#kanban-priority-filter`는 `aria-label="우선순위 필터"`를 갖는다.
- 카드 이동 버튼(◀ ▶)은 각각 `aria-label="이전 컬럼으로 이동"` / `aria-label="다음 컬럼으로 이동"`을 갖고 Tab 키로 포커스 가능하다.
- 삭제 확인 dialog `#kanban-delete-confirm-dialog`는 `role="alertdialog"`로 노출되고 Escape로 취소된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 6.7 반응형
- 320px 이상: 3개 컬럼이 가로 스크롤 없이 세로 스택 레이아웃으로 전환되어 content overflow가 발생하지 않는다.
- 768px 이상: 3개 컬럼이 가로 배치로 표시된다.

## 7. 아키텍처 구성요소

- **storage.js** — localStorage 기반 board 상태 영속화(로드/저장)만 담당한다.
- **board.js** — 카드 CRUD, 상태 전이(idle/creating/editing/confirming-delete/validation-error), 우선순위 필터 로직을 담당한다. `App.jsx`가 호출하고 `storage.js`를 통해 영속화한다.
- **App.jsx / main.jsx** — 위 UI 계약(DOM ID/class/token/접근성/반응형)에 따라 렌더링하고 사용자 입력을 `board.js`로 전달한다.

## 8. 제약사항

- selector, DOM ID/class, token 값은 본 문서의 exact 값을 그대로 사용하고 재정의하지 않는다.
- board 데이터는 클라이언트 로컬 저장소에만 저장하며 서버 API를 호출하지 않는다.
- 본 문서는 frozen blueprint(파일 소유권·상태·후조건)를 그대로 설명하며 새 파일이나 역할을 추가하지 않는다.

## 9. 후속 페르소나 참고

- designer(BF-2102): §6의 DOM ID/class/token/접근성/반응형 값 그대로 시안·mockup 작성.
- developer(BF-2103): §4 상태 스키마, §3 상태 머신, §5 엣지 케이스를 board.js/App.jsx/storage.js에 그대로 구현. board.test.js는 §5의 3개 엣지 케이스를 포함한다.
