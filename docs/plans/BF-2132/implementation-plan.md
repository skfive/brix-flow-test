# 칸반 보드 검색 · D-day 실행 설계 — BF-2132

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:261344f8ed34e1df7370154c5cde6ce4fb351327fbccc99d9c022456f4726f31)를
**재정의 없이** 실행 설계로 서술한다. selector·상태·token 값은 frozen 목록
그대로이며, 본 문서는 신규 selector·상태·역할·파일을 추가하지 않는다.

산출물 범위는 본 문서 1개(`docs/plans/BF-2132/implementation-plan.md`)이며,
런타임 산출물(`docs/design/kanban-search-duedate-BF-2132.md`,
`docs/design/mockup/kanban-board-BF-2132.html`, `kanban-board/board.js`,
`kanban-board/index.html`, `kanban-board/style.css`,
`kanban-board/board.test.js`)은 designer(BF-2133)/developer(BF-2134) 소유로
frozen되어 있어 본 task에서 생성하지 않는다.

## 1. 배경 및 범위

기존 칸반 보드(BF-2103/BF-2113, Vite+React SPA)에 카드 **검색**과 카드
**마감일(D-day) 배지**를 추가한다. 서버/API/데이터 저장소 변경 없음 —
클라이언트 상태(`board`)와 `localStorage`만 다룬다.

## 2. 구현 참고 — frozen 파일명과 실제 저장소 경로 매핑

frozen 계약의 파일명은 `kanban-board/` 하위 경로만 명시하며, 현재 저장소는
그 경로들이 아래 실제 위치에 대응한다(파일 소유·상태 계약 자체는 재정의하지
않으며, 물리적 위치만 명확히 한다).

| frozen 파일명 | 현재 저장소 실제 경로 | 비고 |
| --- | --- | --- |
| `kanban-board/board.js` | `kanban-board/src/lib/board.js` | 카드/보드 상태 머신(순수 함수). 기존 함수(`upsertCard`, `cardsForColumn` 등) additive 확장 대상 |
| `kanban-board/board.test.js` | `kanban-board/src/lib/board.test.js` | 위 상태 머신의 vitest 테스트 |
| `kanban-board/index.html` | `kanban-board/index.html` | 실제 위치 동일. 현재 `<style>` 인라인 블록에 CSS 보유, `#kanban-board-root`에 React 마운트 |
| `kanban-board/style.css` | 현재 별도 파일 없음 | 현재 CSS는 `index.html` 인라인 `<style>`에 있음. 신규 selector/token 스타일을 인라인 블록에 추가할지, 별도 `kanban-board/style.css`로 분리해 `index.html`에서 참조할지는 developer 재량 — 어느 방식이든 §7의 selector·token 값은 동일하게 적용 |

`kanban-board/src/App.jsx`, `kanban-board/src/lib/storage.js`는 frozen 파일
목록에 없으나 위 두 frozen 파일(`board.js`→렌더링 소비, `board.js`→상태 로직)과
직접 연결된 기존 파일이며, `additive` 정책상 검색·D-day를 위한 최소 배선
변경(상태 필드 추가, 렌더 분기 추가)이 필요하다. 새 파일·새 역할을 추가하는
것은 아니므로 frozen 계약과 충돌하지 않는다.

## 3. 검색 결합 규칙

- **정규화**: 검색어와 카드 `title`/`description`을 모두 `trim()` 후
  `toLowerCase()`로 비교한다(영문 대소문자만 무시 — 로케일 변환 없는 단순
  `toLowerCase`).
- **매치 판정(카드 단위)**:
  `(title 부분일치 OR description 부분일치) AND (우선순위 필터 조건)`
  - `title.trim().toLowerCase().includes(query)` 또는
    `(description ?? '').trim().toLowerCase().includes(query)` 중 하나라도
    참이면 검색 조건 통과.
  - `description`이 `null`인 카드는 `description` 조건이 자동 거짓 —
    `title` 단독으로 판정.
  - 우선순위 필터(`board.filter`)는 기존 로직(`all` 이거나
    `card.priority === board.filter`) 그대로 유지하며, 검색 조건과 **AND**로
    결합한다.
  - 검색어를 `trim()`한 결과가 빈 문자열이면(입력 없음 또는 공백만 입력)
    검색 조건은 항상 참으로 취급한다 — 기존 우선순위 필터 단독 동작과 동일.
  - 부분일치는 `String.prototype.includes` 사용(정규식 아님) — 검색어의
    특수문자를 이스케이프할 필요 없다.
- **결합 순서**: 우선순위 필터가 `high`이고 검색어가 `"기획"`이면, 결과는
  `priority === 'high'` **그리고** (`title` 또는 `description`에 `"기획"`
  포함) 카드만 남는다.
- **결과 0건**: 검색어가 있고(§6 `search-active` 전제) 모든 컬럼에서 매치
  카드가 0건이면 `no-results` 상태(§6).

## 4. D-day 경계값 판정

- `dueDate` 저장 형식: `'YYYY-MM-DD'` 문자열(로컬 캘린더 날짜, 시간대 정보
  없음) 또는 `null`(마감일 미설정).
- 오늘 날짜(`today`)도 동일하게 로컬 자정 기준 date-only 값으로 취급한다
  (시:분:초·UTC 변환에 의한 하루 오차를 방지하기 위해 `'YYYY-MM-DD'` 문자열을
  로컬 자정 `Date`로 파싱해 비교한다. `new Date('YYYY-MM-DD')` 형태의 UTC
  파싱은 사용하지 않는다).
- `diffDays = dueDate의 그레고리력 일수 - today의 그레고리력 일수` (정수).
- **경계값 규칙**:
  - `diffDays >= 0` → on-time/upcoming, 배지 라벨 `"D-{diffDays}"`
    (`diffDays === 0`이면 `"D-0"` — 오늘 마감).
  - `diffDays <= -1`(1일 이상 경과) → overdue, 배지 라벨 `"기한 초과"`.
- `dueDate`가 `null`/`undefined`인 카드: 배지를 렌더하지 않는다(에러 아님,
  정상 상태).
- `dueDate`가 파싱 불가능한 값(형식 오류)인 카드: 배지를 렌더하지 않는다
  (방어적 처리 — 크래시 금지).

## 5. `localStorage` 하위호환 설계

- 기존 저장 스키마(BF-2103/BF-2113 당시 저장된 카드 객체)에는 `dueDate`
  필드가 없다.
- `loadBoard()`로 불러온 카드에 `dueDate` 필드가 없으면 `card.dueDate ?? null`
  로 다뤄 "마감일 미설정" 상태로 취급한다 — §4에 따라 배지 미표시, 에러 없음.
- 자동 마이그레이션/백필은 수행하지 않는다. 사용자가 카드를 수정해 마감일을
  직접 입력하기 전까지 배지 없이 표시된다.
- `saveBoard()` 저장 시 `dueDate` 필드를 다른 카드 필드와 함께 그대로
  직렬화한다 — 기존 저장 포맷에 필드가 추가될 뿐 구조 자체는 하위호환이다.
- `board.search`(§8)도 동일하게 신규 최상위 필드로 추가되며, 기존 저장값에
  이 필드가 없을 때는 `''`(빈 문자열)로 기본값 처리한다.

## 6. 상태(states) 정의 (frozen: `idle`, `search-active`, `no-results`,
`duedate-on-time`, `duedate-overdue`)

검색 상태 3종(`idle`/`search-active`/`no-results`)은 카드 폼 워크플로 상태
(`board.status` — 기존 `idle`/`creating`/`editing`/...)와 **별개의 차원**이다.
기존 `board.status` 값을 재사용하거나 덮어쓰지 않는다.

| 상태 | 판정 조건 |
| --- | --- |
| `idle` (검색) | `board.search.trim() === ''` |
| `search-active` | `board.search.trim() !== ''`이고 §3 결합 조건에 매치되는 카드가 1건 이상 |
| `no-results` | `board.search.trim() !== ''`이고 §3 결합 조건에 매치되는 카드가 전체 컬럼에서 0건 |
| `duedate-on-time` (카드 단위) | §4에서 `diffDays >= 0`으로 판정된 카드 |
| `duedate-overdue` (카드 단위) | §4에서 `diffDays <= -1`로 판정된 카드 |

## 7. UI 계약 (frozen, 재정의 없음)

- **DOM ID**: `kanban-search-input`(검색 입력), `kanban-card-form-duedate`
  (카드 생성/수정 폼의 마감일 입력).
- **CSS class**: `kanban-search-input`, `kanban-card-duedate-badge`,
  `kanban-card-duedate-badge--overdue`(overdue 카드에 추가되는 modifier).
- **Design token**: `--color-badge-overdue-bg=#fee2e2`,
  `--color-badge-overdue-text=#991b1b`, `--color-badge-upcoming-bg=#e0f2fe`,
  `--color-badge-upcoming-text=#075985`,
  `--space-search-input-padding-inline=12px`.
- **배치 참고(비-frozen)**: `#kanban-search-input`은 기존
  `.kanban-toolbar`(이미 `flex-wrap: wrap; gap: 12px`) 안, 우선순위 필터
  인접 위치를 권장한다 — 별도 레이아웃 변경 없이 §9의 320px 반응형 요건을
  충족할 수 있다. `#kanban-card-form-duedate`는 `#kanban-card-form`의 기존
  제목/설명/우선순위 필드와 같은 패턴(`<label>` + `<input>`)으로 추가한다.
  wrapper 구조·순서는 frozen selector가 아니므로 developer 재량이다.

### 7.1 접근성 (frozen)

1. `#kanban-search-input`은 `aria-label="카드 검색"` 또는 연결된
   `<label>`로 목적을 명시한다.
2. D-day 배지는 `aria-label`로 `'D-0'`, `'D-3'`, `'기한 초과'`와 같이
   스크린리더가 읽을 수 있는 텍스트를 제공한다(§4 라벨 값과 동일 문자열).
3. 모든 상태(§6 5종)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와
   접근성 이름 양쪽으로 노출한다 — 예: `no-results`는 배경/테두리 색이 아닌
   문구로도 "결과 없음"을 알리고, `duedate-overdue` 배지는 배경색뿐 아니라
   `"기한 초과"` 텍스트를 항상 함께 표시한다.

### 7.2 반응형 (frozen)

1. 320px 이상 뷰포트에서 검색 입력과 우선순위 필터가 줄바꿈(wrap)되며 서로
   겹치거나 잘리지 않는다. 기존 `.kanban-toolbar`의 `flex-wrap: wrap`을
   유지하고 `#kanban-search-input`에 고정 `min-width`를 과도하게 주지 않는
   방식을 권장한다.

## 8. 데이터 모델 변경

- **Card**: 기존 필드(`id`, `title`, `description`, `priority`,
  `columnId`)에 `dueDate` 필드를 추가한다 — 타입 `string('YYYY-MM-DD') |
  null`, 기본값 `null`(§5 하위호환).
- **Board**: 기존 필드(`cards`, `status`, `filter`, `editingCardId`,
  `deletingCardId`, `errorMessage`)에 `search` 필드를 추가한다 — 타입
  `string`, 기본값 `''`(§6).

## 9. Given/When/Then acceptance criteria

### 검색

1. Given 카드 제목에 `"기획"`이 포함됨, When 검색 입력에 `"기획"`을
   입력, Then 해당 카드가 검색 결과에 남는다.
2. Given 카드 제목엔 없고 설명에만 `"배포"`가 포함됨, When `"배포"`를
   검색, Then 해당 카드가 결과에 남는다(제목 OR 설명).
3. Given 카드 제목이 `"plan 문서"`, When 검색어 `"PLAN"`(대문자)을 입력,
   Then 매치된다(대소문자 무시).
4. Given 우선순위 필터 `high`, 카드 제목에 `"기획"` 포함하나 카드
   `priority === 'low'`, When 검색어 `"기획"`으로 검색, Then 결과에서
   제외된다(검색·필터 AND 결합).
5. Given 검색 입력에 공백만 입력됨, When 목록을 확인, Then 전체 카드가
   표시된다(우선순위 필터만 적용, `idle` 상태).
6. Given 모든 카드가 검색어와 불일치함, When 검색, Then `no-results`
   상태가 화면 텍스트로 노출된다.

### D-day

7. Given 카드 `dueDate`가 오늘 날짜, When 카드를 렌더, Then `"D-0"`
   배지가 `duedate-on-time` 스타일로 표시된다.
8. Given 카드 `dueDate`가 오늘로부터 3일 뒤, When 렌더, Then `"D-3"`
   배지가 표시된다.
9. Given 카드 `dueDate`가 어제(1일 경과), When 렌더, Then `"기한 초과"`
   배지가 `duedate-overdue` 스타일로 표시된다.
10. Given 카드 `dueDate`가 `null`(미설정), When 렌더, Then 배지가
    표시되지 않는다.
11. Given `localStorage`에 `dueDate` 필드가 없는 기존 카드가 저장되어
    있음, When 앱을 로드, Then 에러 없이 배지 없는 상태로 정상 렌더된다
    (§5).

## 10. Edge case

- `description`이 공백 문자만으로 이루어진 카드: `trim()` 후 빈 문자열로
  취급되어 사실상 `description` 조건은 검색어가 빈 문자열일 때만 항상
  매치되고, 그 외에는 `title` 조건에만 의존한다(§3과 동일 정규화 규칙
  적용, 별도 예외 없음).
- 검색어에 정규식 특수문자(`.`, `*`, `(` 등)가 포함된 경우:
  `String.prototype.includes` 기반 단순 부분일치이므로 이스케이프가
  필요 없고 리터럴 문자열로 비교된다.
- `dueDate` 형식 오류(예: `'2026-13-40'`, 빈 문자열 `''`, 숫자 타입 등):
  파싱 실패로 간주해 배지를 렌더하지 않는다(§4) — 예외를 던지지 않는다.
- 검색 상태에서 우선순위 필터를 `all`이 아닌 값으로 바꾸는 경우: 기존
  `board.filter`와 신규 `board.search`는 각각 독립적으로 유지되며, 두
  조건 모두 AND로 재적용된다(§3).

## 11. 산출물 경로 (frozen, 원문 유지)

- `docs/design/kanban-search-duedate-BF-2132.md` — designer(BF-2133) 소유
- `docs/design/mockup/kanban-board-BF-2132.html` — designer(BF-2133) 소유
- `kanban-board/board.js`(실제: `kanban-board/src/lib/board.js`) —
  developer(BF-2134) 소유
- `kanban-board/board.test.js`(실제: `kanban-board/src/lib/board.test.js`) —
  developer(BF-2134) 소유
- `kanban-board/index.html` — developer(BF-2134) 소유
- `kanban-board/style.css`(§2 참고) — developer(BF-2134) 소유

## 12. Self-critique

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | AC 매핑 | AC1(§3 검색 결합 규칙 + §9 검색 시나리오), AC2(§4 D-day 경계값 + §9 D-day 시나리오), AC3(§5 하위호환 로드 규칙), AC4(§2/§7/§11에 frozen 파일·selector·token·산출물 경로를 원문대로 반영, 새 파일·역할 미추가) 모두 충족. |
| 2 | frozen 재정의 여부 | §7 selector·token·접근성·반응형 문구는 frozen 원문 그대로이며, §2는 물리 경로 매핑(비-frozen 참고)만 추가. |
| 3 | 하위호환 | §5·§9-11에서 `dueDate` 부재 카드의 로드·렌더 경로를 명시적으로 다룸. |
| 4 | 모호함 flag | `kanban-board/style.css` 분리 여부(§2), `no-results` 안내 문구의 정확한 배치(§6/§7.1)는 developer/designer 재량으로 명시. |
