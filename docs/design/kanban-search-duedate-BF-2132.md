# 칸반 보드 검색 · D-day 배지 시각 명세 — BF-2132 / BF-2133

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`,
sha256:261344f8ed34e1df7370154c5cde6ce4fb351327fbccc99d9c022456f4726f31)와
planner 실행 설계(`docs/plans/BF-2132/implementation-plan.md`)를
**재정의하지 않고** 시각 결과물로 구현한 명세다. selector·CSS class·design
token·상태·접근성·반응형 요건은 frozen 원문 값을 그대로 사용한다.

이 문서는 기존 칸반 보드(BF-2103/BF-2113, Vite+React SPA, `kanban-board/`)에
**추가**되는 검색 입력과 D-day 배지만 다룬다. 기존 툴바·컬럼·카드·폼·삭제
확인 다이얼로그의 시각 요소는 변경하지 않는다(additive).

## 1. 시안 개요

- **변경 범위**: (1) 카드 검색 입력 1개(`#kanban-search-input`)를 기존
  `.kanban-toolbar`에 추가, (2) 카드 마감일(D-day) 배지를 카드 본문에 추가,
  (3) 카드 생성/수정 폼에 마감일 입력 1개(`#kanban-card-form-duedate`) 추가.
- **사용자 경험 목표**:
  - 사용자가 제목/설명 일부만 기억해도 빠르게 카드를 찾을 수 있다(검색).
  - 카드 목록만 훑어봐도 마감이 임박했거나 지난 카드를 색과 텍스트로 즉시
    구분할 수 있다(D-day 배지).
  - 검색 결과가 없을 때도 "무언가 잘못됐다"가 아니라 "조건에 맞는 카드가
    없다"는 것을 명확한 문구로 안다(`no-results`).
- **비목표**: 서버/API 변경, 정렬 옵션 추가, 검색 결과 하이라이팅, 날짜
  선택기(datepicker) UI — 모두 이번 시안 범위 밖이다.

## 2. 컬러 팔레트

기존 칸반 보드 팔레트(`--color-priority-*`, `--color-column-bg`)는
변경하지 않는다. 아래는 이번 작업에서 **추가**되는 토큰이며, frozen 값을
그대로 사용한다(재정의 없음).

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-badge-overdue-bg` | `#fee2e2` | D-day 배지 배경 — 기한 초과(`duedate-overdue`) |
| `--color-badge-overdue-text` | `#991b1b` | D-day 배지 텍스트 — 기한 초과 |
| `--color-badge-upcoming-bg` | `#e0f2fe` | D-day 배지 배경 — 정상(`duedate-on-time`) |
| `--color-badge-upcoming-text` | `#075985` | D-day 배지 텍스트 — 정상 |

기존 팔레트 참고(변경 없음, 재사용):

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-priority-high` | `#dc2626` | 카드 좌측 우선순위 바 — 높음 |
| `--color-priority-med` | `#d97706` | 카드 좌측 우선순위 바 — 중간 |
| `--color-priority-low` | `#16a34a` | 카드 좌측 우선순위 바 — 낮음 |
| `--color-column-bg` | `#f3f4f6` | 컬럼 배경 |

## 3. 타이포그래피

기존 칸반 보드는 시스템 폰트 스택(`system-ui, -apple-system, sans-serif`)을
사용하며, 이번 작업도 동일 스택을 그대로 따른다(신규 폰트 추가 없음).

| 요소 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 검색 입력 텍스트 (`#kanban-search-input`) | 상속(system-ui) | 14px | normal | 1.4 |
| D-day 배지 텍스트 | 상속(system-ui) | 12px | 600(semibold) | 1 |
| `no-results` 안내 문구 | 상속(system-ui) | 14px | normal | 1.4 |
| 마감일 입력 라벨 (`label[for="kanban-card-form-duedate"]`) | 상속(system-ui) | 14px | normal | 1.4 |

- D-day 배지는 짧은 텍스트(`"D-0"`, `"D-3"`, `"기한 초과"`)를 강조해야
  하므로 semibold(600)로 다른 본문 텍스트와 구분한다.
- `no-results` 문구는 카드 본문과 동일한 weight로, 에러가 아닌 **안내**
  임을 시각적으로도 나타낸다(굵게/붉은색 강조 금지 — §6 접근성 3항과
  일관되게 상태를 색상에만 의존시키지 않는다).

## 4. 레이아웃

### 4.1 검색 입력 — 툴바 배치

- planner 설계(§7 배치 참고)를 따라 `#kanban-search-input`은 기존
  `.kanban-toolbar`(`display: flex; flex-wrap: wrap; gap: 12px`) 내부,
  "카드 추가" 버튼과 "우선순위 필터" 사이에 배치한다.
- 순서: `[카드 추가 버튼] [검색 입력] [우선순위 필터 라벨+select] [상태 텍스트]`
  — wrapper 구조·정확한 순서는 frozen이 아니므로 dev 재량이지만, mockup은
  이 순서로 시각 예시를 제공한다.
- 검색 입력 padding: `padding-inline: var(--space-search-input-padding-inline)`
  (`12px`, frozen), `padding-block: 6px`(비-frozen, 기존 select/button과
  높이를 맞추기 위한 참고값).
- `min-width`는 고정 폭을 과도하게 주지 않는다 — mockup은 `min-width: 160px;
  flex: 1 1 200px`을 사용해 320px 뷰포트에서도 줄바꿈이 자연스럽게
  일어나도록 한다(§7.2 반응형 요건).

### 4.2 D-day 배지 — 카드 내 배치

- 배지는 카드(`.kanban-card`) 내부, 우선순위 텍스트(`우선순위: 높음` 등)
  아래, 이동/삭제 버튼 행 위에 배치한다(기존 카드 구조에 한 줄 추가,
  기존 요소 순서 변경 없음).
- `dueDate`가 `null`/`undefined`이거나 파싱 불가능한 값이면 배지 자체를
  렌더하지 않는다 — 자리(빈 공간)를 비워두지 않고 해당 줄을 생략한다.
- 배지는 `inline-block`, `padding: 2px 8px`, `border-radius: 999px`(pill
  형태)로 카드 내 다른 텍스트와 시각적으로 분리한다.

### 4.3 마감일 입력 — 카드 폼 배치

- `#kanban-card-form-duedate`는 기존 `#kanban-card-form`의 "우선순위"
  필드 다음에 동일 패턴(`<label>` + `<input>`)으로 추가한다(제목 → 설명 →
  우선순위 → 마감일 → 저장/취소 버튼 순).
- `<input type="date">`를 사용해 브라우저 네이티브 날짜 선택기를
  활용한다(별도 커스텀 datepicker 없음 — §1 비목표).

### 4.4 반응형 (frozen, §7.2)

- 320px 이상 뷰포트에서 검색 입력과 우선순위 필터가 줄바꿈되며 겹치거나
  잘리지 않는다.
- 기존 `.kanban-toolbar`의 `flex-wrap: wrap`을 그대로 유지하고,
  `#kanban-search-input`에 과도한 고정 `min-width`를 주지 않는다(§4.1).
- mockup(`docs/design/mockup/kanban-board-BF-2132.html`)의 "320px 뷰포트"
  섹션에서 실제 줄바꿈 동작을 시각적으로 확인할 수 있다.

## 5. 컴포넌트 명세

### 5.1 검색 입력 (`#kanban-search-input`)

| 항목 | 값 |
| --- | --- |
| DOM ID | `kanban-search-input` (frozen) |
| CSS class | `kanban-search-input` (frozen) |
| 엘리먼트 | `<input type="text">` |
| props/속성 | `id`, `className`, `value`(제어 컴포넌트), `onChange`, `placeholder="카드 검색"`(비-frozen, 참고용), `aria-label="카드 검색"`(frozen, §6-1) |
| 상태 | `idle`(값이 trim 후 빈 문자열) / `search-active`(값이 있고 매치 카드 존재) / `no-results`(값이 있고 매치 카드 0건) — frozen, §6 |
| 인터랙션 | 입력할 때마다 `board.search` 갱신 → 카드 목록 즉시 필터링(디바운스 없음, 클라이언트 상태만 다룸) |
| 시각 상태 구분 | 입력창 자체의 배경/테두리 색은 상태별로 바꾸지 않는다(검색 입력 자체는 3색 변주 없음) — 결과 유무는 카드 목록 영역과 `no-results` 문구로 표현한다(§5.3) |

### 5.2 D-day 배지 (`.kanban-card-duedate-badge`)

| 항목 | 값 |
| --- | --- |
| CSS class (기본, on-time) | `kanban-card-duedate-badge` (frozen) |
| CSS class (overdue modifier) | `kanban-card-duedate-badge kanban-card-duedate-badge--overdue` (frozen, 두 class 동시 적용) |
| 엘리먼트 | `<span>` |
| props | `dueDate: string('YYYY-MM-DD') \| null`, 파생값 `diffDays`, `label`, `variant('on-time'\|'overdue')` |
| 상태 1: `duedate-on-time` | `diffDays >= 0`. 라벨 `"D-{diffDays}"`(`diffDays===0` → `"D-0"`). 배경 `--color-badge-upcoming-bg`, 텍스트 `--color-badge-upcoming-text`. |
| 상태 2: `duedate-overdue` | `diffDays <= -1`. 라벨 `"기한 초과"`. 배경 `--color-badge-overdue-bg`, 텍스트 `--color-badge-overdue-text`. modifier class 추가. |
| 상태 3: 배지 없음 | `dueDate`가 `null`/`undefined`/파싱 불가 → 배지 렌더 안 함(에러 아님, 정상). |
| `aria-label` | 배지 텍스트와 동일한 문자열(`"D-0"`, `"D-3"`, `"기한 초과"`) — frozen, §6-2 |
| 인터랙션 | 정적 표시 전용(클릭/hover 동작 없음) |

### 5.3 검색 결과 없음 안내 (`no-results`)

| 항목 | 값 |
| --- | --- |
| 표시 조건 | `board.search.trim() !== ''` 이고 전체 컬럼에서 매치 카드 0건 |
| 배치 | `.kanban-board` 영역(컬럼들) 위 또는 각 컬럼 내부(비-frozen, dev 재량) — mockup은 컬럼 상단 공통 안내 배너 방식으로 예시 제공 |
| 문구 예시 | `"검색 결과가 없습니다"` (본문 텍스트로 상태 노출, §6-3) |
| 시각 스타일 | 에러 색상(빨강 계열) 사용 금지 — 중립 텍스트(`#555` 계열), 배경 없음 또는 `--color-column-bg`와 동일한 중립 배경 |

### 5.4 마감일 입력 (`#kanban-card-form-duedate`)

| 항목 | 값 |
| --- | --- |
| DOM ID | `kanban-card-form-duedate` (frozen) |
| 엘리먼트 | `<input type="date">` |
| props | `id`, `value`(`'YYYY-MM-DD'` 또는 `''`), `onChange` |
| 연결 라벨 | `<label for="kanban-card-form-duedate">마감일</label>` |
| 필수 여부 | 선택 입력(미입력 시 `dueDate: null`, §5 하위호환) |

## 6. 접근성 (frozen, 재정의 없음)

1. `#kanban-search-input`은 `aria-label="카드 검색"` 또는 연결된
   `<label>`로 목적을 명시한다. (mockup은 `aria-label` 방식 사용)
2. D-day 배지는 `aria-label`로 `'D-0'`, `'D-3'`, `'기한 초과'`와 같이
   스크린리더가 읽을 수 있는 텍스트를 제공한다(§5.2 라벨 값과 동일 문자열).
3. 모든 상태(검색 3종 + D-day 2종)는 색상만으로 구분하지 않고 상태명을
   화면 텍스트와 접근성 이름 양쪽으로 노출한다:
   - `no-results`: 배경/테두리 색이 아닌 `"검색 결과가 없습니다"` 문구로
     알린다.
   - `duedate-overdue`: 배경색뿐 아니라 `"기한 초과"` 텍스트를 항상 함께
     표시한다.
   - `duedate-on-time`: 배경색뿐 아니라 `"D-{n}"` 텍스트를 항상 함께
     표시한다.

## 7. 상태별 AC 매핑

| AC (planner §9) | 상태(§6 frozen states) | 시각 명세 근거 |
| --- | --- | --- |
| AC1 제목 부분일치 검색 | `search-active` | §5.1 검색 입력 상태, §5.3 결과 있음(안내 미표시) |
| AC2 설명 부분일치 검색 | `search-active` | §5.1 (title/description 매치 결과 동일 취급) |
| AC3 대소문자 무시 검색 | `search-active` | §5.1 (입력값 표시만 담당, 정규화는 로직 영역) |
| AC4 검색+우선순위 필터 AND 결합 | `search-active` 또는 `no-results` | §5.1, §5.3 (결합 결과에 따라 상태 전환) |
| AC5 공백 입력 → 전체 표시 | `idle`(검색) | §5.1 idle 상태 — 검색 입력 시각 상태 변화 없음 |
| AC6 매치 0건 → `no-results` | `no-results` | §5.3 안내 문구 명세 |
| AC7 오늘 마감(`D-0`) | `duedate-on-time` | §5.2 상태 1 |
| AC8 3일 뒤(`D-3`) | `duedate-on-time` | §5.2 상태 1 |
| AC9 1일 경과(`기한 초과`) | `duedate-overdue` | §5.2 상태 2 |
| AC10 `dueDate` 없음 → 배지 미표시 | 배지 없음 | §5.2 상태 3 |
| AC11 하위호환 로드(기존 카드에 `dueDate` 필드 없음) | 배지 없음 | §5.2 상태 3과 동일 시각 결과 |

## 8. dev 구현 가이드

1. **CSS 변수 추가 위치**: `kanban-board/index.html`의 기존 `<style>` 인라인
   블록 `:root`에 §2의 4개 배지 토큰을 추가한다(기존 `--color-priority-*`
   변수들과 같은 블록). 별도 `kanban-board/style.css`로 분리할지는 dev
   재량(planner §2) — 어느 쪽이든 selector·토큰 값은 동일해야 한다.
2. **검색 입력 클래스/ID**: `<input id="kanban-search-input"
   className="kanban-search-input" type="text" aria-label="카드 검색" ... />`
   를 `.kanban-toolbar` 내부, "카드 추가" 버튼 다음에 추가한다.
3. **검색 입력 스타일**: `.kanban-search-input { padding-inline:
   var(--space-search-input-padding-inline); padding-block: 6px; flex: 1 1
   200px; min-width: 160px; border: 1px solid #d1d5db; border-radius: 4px;
   font-size: 14px; }` (mockup 참고, 정확한 border/radius 값은 비-frozen이라
   dev 재량이지만 mockup과 크게 벗어나지 않도록 권장)
4. **D-day 배지 렌더링**: 카드 렌더 함수에서 `dueDate` 파생 로직(경계값
   판정은 developer 소유 `board.js`/`App.jsx` 로직 — 본 명세는 시각만
   다룸)의 결과를 받아 다음처럼 렌더링:
   ```jsx
   {badge ? (
     <span
       className={`kanban-card-duedate-badge${badge.variant === 'overdue' ? ' kanban-card-duedate-badge--overdue' : ''}`}
       aria-label={badge.label}
     >
       {badge.label}
     </span>
   ) : null}
   ```
   위치: `<p>우선순위: ...</p>` 다음, 이동/삭제 버튼 `<div>` 이전.
5. **배지 CSS**: `.kanban-card-duedate-badge { display: inline-block;
   padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight:
   600; background: var(--color-badge-upcoming-bg); color:
   var(--color-badge-upcoming-text); }` /
   `.kanban-card-duedate-badge--overdue { background:
   var(--color-badge-overdue-bg); color: var(--color-badge-overdue-text); }`
6. **`no-results` 안내**: 검색 상태가 `no-results`일 때 `.kanban-board`
   영역 상단(또는 각 컬럼 상단)에 `<p>검색 결과가 없습니다</p>`를
   조건부 렌더링한다. 별도 `role="status"`를 추가할지는 기존 `상태:
   {STATUS_LABELS[...]}` `role="status"`와 중복되지 않도록 dev 재량으로
   판단한다(비-frozen).
7. **마감일 입력 필드**: `#kanban-card-form`의 우선순위 `<select>` 다음에
   `<label htmlFor="kanban-card-form-duedate">마감일</label><input
   id="kanban-card-form-duedate" type="date" value={draft.dueDate ?? ''}
   onChange={...} />`를 추가한다.
8. **mockup 대비 자유도**: mockup은 정적 HTML이므로 실제 React 컴포넌트
   구조(props, 이벤트 핸들러명)는 dev 재량이다. selector(`id`/`className`)와
   token 값만 정확히 일치시키면 된다.

## 9. mockup 참조

시각 mockup HTML: `docs/design/mockup/kanban-board-BF-2132.html`

mockup은 아래 5개 상태를 정적으로 표현한다:
- 기본 화면(검색 `idle`, 카드에 `duedate-on-time`/`duedate-overdue`/배지
  없음 카드 혼합 표시)
- 검색 `search-active` 상태(검색어 입력 + 일부 카드만 표시)
- 검색 `no-results` 상태(검색어 입력 + 안내 문구)
- 카드 생성/수정 폼에 마감일 입력이 추가된 모습
- 320px 뷰포트에서 툴바 줄바꿈 동작(반응형 예시 섹션)

mockup은 시안 시각화 전용이며 dev의 실제 산출물이 아니다 — 픽셀 단위 일치
의무는 없다(§8-8).

## 10. Self-critique

| # | 점검 항목 | 결과 |
| --- | --- | --- |
| 1 | AC 매핑 | §7에서 planner AC1~AC11 전체를 frozen states(§6)에 매핑 완료. |
| 2 | dev 구현 가이드 | §8에 CSS 변수 위치·selector 부착 위치·배지 렌더 조건부 JSX 예시·마감일 입력 위치까지 8단계로 구체화. |
| 3 | 기존 요소 보존 | §1·§4에서 기존 툴바/카드/폼 구조를 변경 없이 유지하고 신규 요소만 additive로 삽입함을 명시. 기존 팔레트(`--color-priority-*` 등)도 §2에 변경 없음으로 명기. |
| 4 | 컴포넌트 매핑 | §5.1~§5.4에서 검색 입력·D-day 배지·no-results 안내·마감일 입력 4개 컴포넌트를 selector/props/상태/인터랙션 표로 정리. |
| 5 | 모호함 flag | `no-results` 안내의 정확한 배치(컴포넌트 상단 공통 vs 컬럼별)는 §5.3·§8-6에서 dev 재량으로 명시. 검색 입력 border/radius 등 비-frozen 세부값도 §8-3에서 권장값으로만 제시하고 dev 재량임을 밝힘. |
