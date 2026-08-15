# BF-2112 칸반 보드 테스트 격차 분석 및 실행 설계 (BF-2114)

## 1. 배경 및 범위

`kanban-board/` SPA 는 BF-2103 에서 구현되었으나 자동 테스트는 `kanban-board/src/lib/board.test.js` 한 건만 존재하고, storage 계층·리듀서 경계값·컴포넌트 접근성 상태는 검증되지 않았다.
본 문서는 developer(BF-2113)가 그대로 구현할 수 있도록 세 영역(storage / board reducer / 컴포넌트)의 테스트 공백을 분석하고, 경계값 케이스와 실행 설계를 확정한다.

frozen `ui-contract@v1`(sha256:7d926bac43435aa2170d06c557b16064028cd878e03f75620423bb335a58cb6e) 이 정의한 DOM/상태/토큰 계약은 재정의하지 않고 테스트 대상으로만 참조한다.

## 2. 현재 테스트 공백 분석

### 2.1 storage — `kanban-board/src/lib/storage.js`

`loadBoard()` / `saveBoard(board)` 는 `hasLocalStorage()` 가드와 `try/catch` 로 예외를 흡수하도록 작성되어 있으나, 다음 분기에 대한 테스트가 전혀 없다:

- `saveBoard` → `loadBoard` 왕복 시 저장한 객체가 그대로 복원되는지
- 저장된 값이 없을 때(`getItem` → `null`) / 빈 문자열일 때의 반환값
- 저장된 JSON 이 손상되어 `JSON.parse` 가 throw 할 때 `catch` 분기가 실제로 `null` 을 반환하는지
- `window.localStorage` 자체가 없는 환경(SSR/구형 브라우저 시뮬레이션)에서 `loadBoard`/`saveBoard` 가 예외 없이 no-op 하는지
- `setItem` 이 quota 초과(`QuotaExceededError`)로 throw 할 때 `saveBoard` 가 예외를 삼키는지

`kanban-board/tests/storage.test.js` 는 신규 파일이며 위 공백을 채운다.

### 2.2 board reducer — `kanban-board/src/lib/board.js`

기존 `src/lib/board.test.js` 는 순정상 흐름을 다루는 것으로 추정되며, 다음 경계값·상태 머신 전이는 함수 시그니처상 별도 검증이 필요하다:

- `moveCard`: 존재하지 않는 `cardId`, 컬럼 경계(`todo`→prev, `done`→next)를 벗어나는 이동 시 board 가 그대로 반환되는지(no-op)
- `removeCard`: 존재하지 않는 `cardId` 삭제 시도 시 배열 불변
- `cardsForColumn`: 필터가 `'all'` 이 아니면서 해당 컬럼에 일치 카드가 없는 조합(필터+빈 컬럼)
- `upsertCard`: 동일 `id` 를 중복 upsert 했을 때 배열에 중복 없이 병합되는지, 음수 `id` 처럼 형식 검증이 없는 값도 opaque 식별자로 그대로 수용되는지 (현재 코드에 id 형식 검증 로직 없음 — 공백이 아니라 현재 동작을 문서화·고정하는 회귀 가드)
- `submitCard`/`requestDelete`/`confirmDelete`/`cancelDelete`/`startCreate`/`startEdit`/`cancelForm` 이 구성하는 `idle → creating/editing → validation-error/confirming-delete → idle` 상태 머신 전이 전체 경로

`kanban-board/tests/board-reducer.test.js` 는 신규 파일이며, 기존 `src/lib/board.test.js` 와 중복되지 않는 범위만 additive 로 추가한다.

### 2.3 컴포넌트 — 카드 생성/수정 폼 (frozen `ui-contract@v1`)

현재 컴포넌트 자동 테스트는 없다. frozen 계약이 명시한 DOM id(`kanban-card-form`, `kanban-card-title-input`, `kanban-card-title-error`)와 상태(`idle`, `submitting`, `validation-error`, `success`), 접근성 요구(`aria-invalid`, `role="alert"`, 컬럼 이동 버튼 `aria-label`)를 스모크 레벨로 검증하는 테스트가 없다.

`kanban-board/tests/kanban-card-form.test.jsx` 는 신규 파일이며 위 공백을 채운다.

## 3. 경계값 케이스 표

### 3.1 storage — `kanban-board/tests/storage.test.js` (8건)

| ID | 대상 | 시나리오 (Given/When/Then) | 기대 결과 |
|----|------|------------------------------|-----------|
| S1 | 왕복 | `saveBoard(board)` 저장 후 `loadBoard()` 호출 | 저장한 board 와 동일한 값 반환 |
| S2 | 부재 | `localStorage.getItem` 이 `null` 반환 | `loadBoard()` → `null` |
| S3 | 손상 JSON | 저장값이 파싱 불가 문자열(`"{invalid"`) | `loadBoard()` → 예외 없이 `null` |
| S4 | 빈 문자열 | 저장값이 `""` | `loadBoard()` → `null` (falsy 분기) |
| S5 | localStorage 부재 | `window.localStorage` 자체가 undefined | `loadBoard()` → `null`, 예외 없음 |
| S6 | localStorage 부재 | `window.localStorage` 자체가 undefined | `saveBoard(board)` 호출 시 예외 없이 no-op |
| S7 | quota 초과 | `setItem` 이 `QuotaExceededError` throw | `saveBoard(board)` 가 예외를 전파하지 않고 조용히 무시 |
| S8 | 직렬화 | 카드 여러 건을 포함한 board 저장 | `setItem` 에 전달된 값이 `JSON.stringify(board)` 와 동일 |

### 3.2 board reducer — `kanban-board/tests/board-reducer.test.js` (16건)

| ID | 대상 함수 | 시나리오 (Given/When/Then) | 기대 결과 |
|----|-----------|------------------------------|-----------|
| R1 | `moveCard` | 존재하지 않는 `cardId` 로 이동 시도 | board 변경 없이 그대로 반환 (no-op) |
| R2 | `moveCard` | `columnId: 'done'` 카드에 `direction: 'next'` | 범위 초과, board 변경 없음 |
| R3 | `moveCard` | `columnId: 'todo'` 카드에 `direction: 'prev'` | 범위 미만, board 변경 없음 |
| R4 | `removeCard` | 존재하지 않는 `cardId` 삭제 시도 | `cards` 배열 길이·내용 불변 |
| R5 | `cardsForColumn` | 카드가 하나도 없는 컬럼 조회 | 빈 배열 반환 |
| R6 | `cardsForColumn` | `filter: 'high'` 이고 해당 컬럼에 `priority: 'high'` 카드가 없음 | 빈 배열 반환 (필터+빈 컬럼) |
| R7 | `upsertCard` | 동일 `id` 카드를 두 번 upsert | `cards` 에 해당 id 가 정확히 1건만 존재, 마지막 값으로 병합 |
| R8 | `upsertCard` | `id: -1` 인 카드 upsert | 형식 검증 없이 정상 추가됨 (현재 동작 고정) |
| R9 | `submitCard` | `title: '   '` (공백만) 제출 | `status: 'validation-error'`, `errorMessage` 설정, `cards` 불변 |
| R10 | `submitCard` | `title: undefined` 제출 | `status: 'validation-error'` (`isBlankTitle` 방어) |
| R11 | `submitCard` | `title: '  할 일  '` 유효 제출 | trim 된 `'할 일'` 로 저장, `status: 'idle'`, `editingCardId: null` |
| R12 | `requestDelete`→`confirmDelete` | 삭제 요청 후 확정 | `confirming-delete` 진입 → 카드 삭제 및 `status: 'idle'` 복귀 |
| R13 | `confirmDelete` | `deletingCardId: null` 인 상태에서 호출 | `cards` 불변, `status: 'idle'` 로만 전이 (방어) |
| R14 | `cancelDelete` | `confirming-delete` 상태에서 취소 | `status: 'idle'`, `deletingCardId: null`, `cards` 불변 |
| R15 | `startCreate`→`cancelForm` | 생성 시작 후 취소 | `status: 'creating'` 진입 → 취소 시 `status: 'idle'`, `errorMessage`/`editingCardId` 초기화 |
| R16 | `startEdit`→`submitCard` | 수정 시작 후 유효 제출 | `status: 'editing'` 진입 → 제출 후 `status: 'idle'`, `editingCardId: null` |

### 3.3 컴포넌트 스모크 — `kanban-board/tests/kanban-card-form.test.jsx` (5건)

| ID | 대상 | 시나리오 (Given/When/Then) | 기대 결과 |
|----|------|------------------------------|-----------|
| C1 | 초기 렌더 | 폼 최초 렌더링 | `#kanban-card-form` 이 `idle` 상태로 표시, 제목 input 비어있음 |
| C2 | 검증 실패 | 빈 제목으로 제출 | `#kanban-card-title-error` 가 `role="alert"` 로 표시, 제목 input `aria-invalid="true"` |
| C3 | 성공 | 유효한 제목 입력 후 제출 | `success` 상태 전이, 입력값이 초기화됨 |
| C4 | 접근성 | 컬럼 이동 버튼(`.kanban-column__move-button`) 렌더 | 각 버튼에 방향을 식별할 수 있는 명시적 `aria-label` 존재 |
| C5 | 상태 복귀 | `validation-error` 상태에서 취소 동작 수행 | 에러 메시지·`aria-invalid` 초기화, `idle` 복귀 후 폼 재사용 가능 |

합계 **29건** (storage 8 + reducer 16 + component 5), AC 기준 20건 이상 충족.

## 4. Developer 실행 설계

### 4.1 담당 파일 (frozen `ui-contract@v1` 소유권 그대로 적용, 추가 파일·역할 없음)

| 파일 | 소유자 | 정책 |
|------|--------|------|
| `kanban-board/package.json` | canonical work packet owner | additive (기존 `scripts.test` 유지, 필요 시 devDependency 추가만) |
| `kanban-board/vitest.config.js` | developer | additive (신규 파일 — 현재 저장소에 없음) |
| `kanban-board/tests/storage.test.js` | developer | additive (신규 파일, §3.1 8케이스) |
| `kanban-board/tests/board-reducer.test.js` | developer | additive (신규 파일, §3.2 16케이스, 기존 `src/lib/board.test.js` 와 중복 금지) |
| `kanban-board/tests/kanban-card-form.test.jsx` | developer | additive (신규 파일, §3.3 5케이스) |

### 4.2 실행 순서

1. `kanban-board/vitest.config.js` 작성 (jsdom 환경, `@vitejs/plugin-react` 연결 — 이미 devDependency 로 존재).
2. `kanban-board/tests/storage.test.js` 구현 → S1~S8.
3. `kanban-board/tests/board-reducer.test.js` 구현 → R1~R16 (기존 `src/lib/board.test.js` 는 수정하지 않음).
4. `kanban-board/tests/kanban-card-form.test.jsx` 구현 → C1~C5 (frozen DOM id/class/상태/토큰만 참조, 재정의 금지).
5. `npm test` (`kanban-board/` 디렉터리, `vitest run`) 로 전체 스위트 그린 확인.

### 4.3 완료 조건

- §3 의 29케이스가 각각 독립된 `it`/`test` 로 존재하고 전부 통과.
- 기존 `kanban-board/src/lib/board.test.js` 는 변경 없이 계속 통과.
- `npm test` (vitest run) 종료 코드 0.

## 5. Frozen 계약 요약 (참조 전용, 재정의 아님)

- DOM ids: `kanban-card-form`, `kanban-card-title-input`, `kanban-card-title-error`
- CSS classes: `kanban-card-form`, `kanban-card-form__error`, `kanban-column__move-button`
- States: `idle`, `submitting`, `validation-error`, `success`
- Design tokens: `--color-error-text=#b91c1c`, `--space-form-gap=8px`
- 접근성: 제목 input 은 `aria-invalid` 로 에러 상태 노출, 에러 메시지는 `role="alert"` 연결; 컬럼 이동 버튼은 명시적 `aria-label`; 모든 상태는 텍스트/접근성 이름으로도 노출 (색상 단독 구분 금지)
- 반응형: 320px 이상에서 overflow 없이 렌더
