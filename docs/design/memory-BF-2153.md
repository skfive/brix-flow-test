# 카드 짝맞추기(memory) 디자인 명세 (BF-2154 / BF-2153)

이 문서는 `docs/plans/BF-2153/implementation-plan.md`에 동결(frozen)된 UI/DOM/토큰/상태 계약을 시각 명세로 구현한 것이다.
선택자(selector), 상태명, 디자인 토큰, 접근성 규칙, 파일 경로는 계약값을 그대로 사용하며 재정의하지 않는다.

## 1. 시안 개요

- 변경 범위: 4x4(8쌍) 카드 짝맞추기 게임 보드/컨트롤 UI 시각 명세.
- 사용자 경험 목표: 사용자가 카드를 두 장씩 순서대로 클릭해 심볼을 확인하고, 일치하면 카드가 고정되어 맞춰진 상태로 남는다. 불일치 시 잠깐 두 카드를 보여준 뒤 다시 뒷면으로 되돌리며, 이 동안에는 추가 클릭이 잠긴다. 모든 카드를 맞추면 완료 메시지와 총 시도 횟수를 명확히 안내하고, `#restart-button`으로 언제든 새 게임을 다시 시작할 수 있다.
- 참조 계약: `docs/plans/BF-2153/implementation-plan.md` §4 상태 전이표, §6 UI/DOM/디자인 토큰 계약, §7 접근성 요구사항, §8 반응형 요구사항, §9 완료 메시지 및 재시작 계약.

## 2. 컬러 팔레트

동결 디자인 토큰(재정의 금지):

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-card-back` | `#2563eb` | 카드 뒷면(숨김 상태) 배경색 |
| `--color-card-face` | `#f8fafc` | 카드 앞면(뒤집힘/맞춤 상태) 배경색 |
| `--color-board-bg` | `#0f172a` | 보드 컨테이너 배경색 |
| `--space-grid-gap` | `12px` | 카드 사이 grid 간격 |

보조 팔레트(계약 외 자유 지정 — 페이지/텍스트/컨트롤/상태 강조용):

| 역할 | 값 | 용도 |
| --- | --- | --- |
| background (페이지) | `#f1f5f9` | 페이지 전체 배경 |
| text-primary | `#0f172a` | 제목/본문 텍스트 |
| text-secondary | `#475569` | 보조 텍스트(상태 문구, 시도 횟수 라벨) |
| card-symbol-text | `#0f172a` | 카드 앞면 심볼명 캡션 텍스트 |
| matched-accent (success) | `#16a34a` | `card--matched` 테두리·배지 강조(색상 단독 아님, 텍스트 배지 동반) |
| button-bg (secondary) | `#1e293b` | `restart-button` 기본 배경 |
| button-accent | `#2563eb` | `restart-button` hover/focus, 카드 focus 링 |
| focus-ring | `#f59e0b` | 카드/버튼 키보드 포커스 아웃라인(어두운 보드 배경 대비용) |

## 3. 타이포그래피

시스템 폰트 스택(vanilla-static 규약 준수, 외부 폰트 의존성 없음) — 동결 토큰:

```
--font-family-base: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

| 용도 | size | weight | line-height |
| --- | --- | --- | --- |
| heading (페이지 타이틀) | 1.5rem (24px) | 700 | 1.3 |
| body/caption (상태 문구, 시도 횟수) | 0.9375rem (15px) | 600 | 1.4 |
| 카드 심볼(이모지) — 320~599px | 1.5rem (24px) | 700 | 1 |
| 카드 심볼(이모지) — 600px 이상 | 2.25rem (36px) | 700 | 1 |
| 카드 심볼명 캡션 — 320~599px | 0.625rem (10px) | 600 | 1.2 |
| 카드 심볼명 캡션 — 600px 이상 | 0.75rem (12px) | 600 | 1.2 |
| `completion-message` | 1.125rem (18px) | 700 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조

1. 페이지 타이틀 영역 — "카드 짝맞추기"
2. 상태 표시줄(선택 추가, 프리징 대상 아님) — 현재 phase 상태명을 텍스트로 노출(§7.6 참조)
3. 정보 바 — `#move-counter` (시도 횟수)
4. 보드 영역 — `#game-board.board` (4x4 grid, 카드 16개)
5. 컨트롤 영역 — `#restart-button` ("다시 시작" 버튼)
6. 완료 메시지 영역 — `#completion-message` (`done` 상태에서만 텍스트 채움)

### 4.2 spacing

- 페이지 컨테이너: 320~599px에서 최대 너비 360px, 600px 이상에서 최대 너비 480px, 좌우 중앙 정렬, 상하 padding 24px, 좌우 padding 16px.
- 섹션 간 간격: 16px.
- 보드 내부 카드 간격: `var(--space-grid-gap)` (12px, 모든 breakpoint 공통 — 반응형은 grid `1fr` 컬럼 자체가 유동적이므로 gap 값을 변경하지 않는다). 보드 외곽 padding: `var(--space-grid-gap)`과 동일값으로 시각적 통일감 유지.

### 4.3 보드 그리드

- `#game-board.board`는 `display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: var(--space-grid-gap);` 4x4 배치.
- 보드 컨테이너 배경은 `var(--color-board-bg)`, `border-radius: 12px`.
- 각 카드(`.card`)는 `aspect-ratio: 1 / 1`로 정사각 비율 유지.

### 4.4 breakpoint 별 동작

- 최소 지원 뷰포트: 320px.
- 320px~599px: 페이지 컨테이너 최대 너비 360px(뷰포트가 더 좁으면 `max-width: 100%`로 축소), 보드는 컨테이너 너비를 그대로 채워 가로 스크롤 없이 표시. 카드 심볼 폰트 1.5rem, 캡션 0.625rem.
- 600px 이상: 페이지 컨테이너 최대 너비 480px로 확대, 카드 심볼 폰트 2.25rem, 캡션 0.75rem로 확대되어 가독성이 향상된다.
- 모든 구간에서 `#game-board`는 `max-width: 100%`로 부모 컨테이너를 넘지 않는다.

## 5. 컴포넌트 명세

### 5.1 `#game-board` (`.board`, 보드 컨테이너)

- role: 4x4(16개) 카드 grid 컨테이너.
- 자식 요소: `button.card` 16개.
- 상태별 판단은 각 카드 단위(§5.2)에서 이루어지며, `#game-board` 자체는 phase(`idle`/`one-flipped`/`comparing`/`done`)에 따라 카드 클릭 가능 여부만 결정한다(§7 상태 전이표: `comparing`/`done`은 입력 잠금).

### 5.2 `.card` (카드 버튼, `button.card`)

- props(데이터): `symbol: string`(심볼명, 예: "사과"), `flipped: boolean`, `matched: boolean`.
- 기본 마크업: `<button type="button" class="card" aria-label="...">`, 내부에 이모지 심볼과 심볼명 캡션(`<span class="card__symbol">`, `<span class="card__label">`)을 포함해 아이콘+텍스트로 이중 표현한다.
- 상태별 시각/접근성:
  1. **숨김(기본, `flipped:false`, `matched:false`)** — `class="card"` (수식 클래스 없음). 배경 `var(--color-card-back)`, 내부 심볼/캡션 비표시(뒷면 패턴만 표시). `aria-label="뒤집힌 카드"`. 클릭 가능(단, phase가 `comparing`/`done`이면 보드 레벨에서 잠금).
  2. **뒤집힘, 미확정(`class="card card--flipped"`, `matched:false`)** — 배경 `var(--color-card-face)`, 이모지 심볼 + 심볼명 캡션 표시, `border: 2px solid var(--color-card-back)`로 "확인 중" 시각 강조. `aria-label="{심볼명}"` (예: `"바나나"`).
  3. **맞춤(`class="card card--flipped card--matched"`, `matched:true`)** — 배경 `var(--color-card-face)` 유지, 이모지 심볼 + 심볼명 캡션 표시 + `border: 2px solid var(--color-matched-accent)` + 우상단 텍스트 배지 `"✓ 맞춤"`(색상 단독 구분 금지 원칙에 따라 테두리 색상 변경과 텍스트 배지를 병행). `cursor: not-allowed`, `aria-label="맞춘 카드, {심볼명}"` (예: `"맞춘 카드, 사과"`).
- hover(마우스 오버, 숨김 카드이며 클릭 가능한 경우만): 배경색을 살짝 밝게(`filter: brightness(1.1)`).
- focus(키보드 포커스): `outline: 3px solid var(--color-focus-ring); outline-offset: 2px`.

### 5.3 `#move-counter` (시도 횟수)

- `aria-live="polite"` 영역.
- 표시 형식: "시도 횟수: N번" (N = `moveCount`, 정수, 0부터 시작).
- 상태별: `idle`/`one-flipped`에서는 직전까지 확정된 시도 횟수를 유지(두 번째 카드를 아직 뒤집지 않았으므로 증가하지 않음), 두 번째 카드가 뒤집혀 판정이 이루어지는 시점(`comparing` 진입 또는 즉시 매치로 `idle`/`done` 진입)에 값이 1 증가해 표시된다.

### 5.4 `#restart-button` (다시 시작 버튼)

- `<button type="button" id="restart-button">다시 시작</button>` — 가시 텍스트 레이블 "다시 시작" 고정(상태별 텍스트 변경 없음), 키보드 Tab/Enter로 조작 가능.
- 항상 활성 상태(disabled 없음) — `comparing`/`done`을 포함한 모든 phase에서 클릭 가능해야 재시작 흐름이 막히지 않는다.
- 시각: 배경 `var(--color-button-bg)`, 텍스트 `#ffffff`, padding `10px 20px`, `border-radius: 6px`. hover/focus 시 배경 `var(--color-button-accent)`, focus 시 `outline: 3px solid var(--color-focus-ring); outline-offset: 2px`.
- 클릭 시(§9 계약): 진행 중인 지연 타이머 취소, 새 덱 생성, `moveCount:0`, `flippedIndices:[]`, `phase:'idle'`로 초기화하며 `#completion-message`를 비운다 — 모든 카드가 숨김 상태로 되돌아간다.

### 5.5 `#completion-message` (완료 메시지)

- `aria-live="polite"` 영역.
- 표시 조건: `phase:'done'`에서만 텍스트 채움. 그 외 상태에서는 DOM에 존재하되 빈 문자열(또는 `hidden`).
- 텍스트 형식: `"모두 맞췄습니다! 총 N번 시도"` (N = 완료 시점의 `moveCount`).
- 시각: 텍스트 색 `var(--color-matched-accent)`, font-weight 700, 상단 여백 16px. 색상뿐 아니라 텍스트 자체로 완료 상태를 알리므로 별도 아이콘/색상 의존이 없다.

### 5.6 상태 표시 텍스트 (접근성 — 색상 단독 구분 금지, 선택 추가 요소)

frozen 계약에 새 id를 추가하지 않는 범위에서, phase 변화를 화면 텍스트로도 알리기 위해 `<p class="phase-status">` 문구(비-frozen, dev 재량)를 둘 수 있다:

| phase | 상태 표시 텍스트 |
| --- | --- |
| `idle` | "카드를 선택하세요" |
| `one-flipped` | "두 번째 카드를 선택하세요" |
| `comparing` | "확인 중입니다…" |
| `done` | "완료!" |

이 요소는 frozen DOM 계약(§6)의 일부가 아니므로 dev가 생략하거나 다른 방식(예: `#move-counter` 인접 텍스트에 통합)으로 구현해도 무방하다. 단, 카드 단위 상태(숨김/뒤집힘/맞춤)는 §5.2의 `aria-label`로 반드시 텍스트 노출되어야 한다.

## 6. dev 구현 가이드

1. CSS 변수는 `memory/style.css`의 `:root`에 계약 토큰 4종(`--font-family-base`, `--color-card-back`, `--color-card-face`, `--color-board-bg`, `--space-grid-gap`)을 그대로 선언하고, 본 문서 §2의 보조 팔레트는 별도 변수(예: `--color-page-bg`, `--color-text-primary`, `--color-text-secondary`, `--color-matched-accent`, `--color-button-bg`, `--color-button-accent`, `--color-focus-ring`)로 추가 선언해 사용 권장.
2. `#game-board.board`는 CSS Grid(`grid-template-columns: repeat(4, 1fr)`)로 4x4 배치, 카드는 `aspect-ratio: 1 / 1`.
3. 카드는 `button.card` 요소로 구현하고, `GameState.deck[i]`의 `flipped`/`matched` 값에 따라 `card--flipped`/`card--matched` 클래스와 `aria-label`을 매 렌더마다 재계산해 토글한다(§5.2 3가지 상태 매핑 표 그대로).
4. `applyFlip(state, index)` 순수 함수 호출 결과로 새 `GameState`를 받아 렌더링하며, `comparing`/`done` phase에서는 카드 클릭 핸들러가 클릭을 무시하도록(순수 함수도 no-op를 반환하지만 UI 레벨에서 `pointer-events` 또는 클릭 조건 분기로 이중 방어 권장) 처리한다.
5. `comparing → idle` 복귀는 사용자 클릭이 아닌 지연 타이머 콜백으로 처리하며(설계 §4 그대로), 타이머는 `#restart-button` 클릭 시 반드시 취소해 재시작 이후 지연 콜백이 새 게임 상태를 덮어쓰지 않게 한다.
6. `#move-counter`, `#completion-message`는 `aria-live="polite"`를 HTML에 정적으로 선언(동적으로 추가하지 않음)해 최초 렌더부터 스크린리더가 인식하도록 한다.
7. `#completion-message`는 `phase:'done'` 진입 시에만 `"모두 맞췄습니다! 총 N번 시도"` 텍스트를 채우고, 그 외 phase에서는 빈 문자열로 되돌린다.
8. 반응형은 `@media (min-width: 600px)`에서 페이지 컨테이너 `max-width`, 카드 심볼/캡션 폰트 크기를 확대하고, `#game-board`는 모든 구간에서 `max-width: 100%`를 유지해 320px에서도 overflow가 없도록 한다.
9. phase 상태는 body 또는 보드 컨테이너에 `data-phase="idle|one-flipped|comparing|done"` 속성으로 노출 권장(CSS 훅 및 §5.6 상태 문구 렌더링 조건 분기에 사용).

## 7. AC 매핑 표 (self-critique)

| frozen 계약 항목 | 값 | 본 문서/화면 요소 대응 |
| --- | --- | --- |
| domIds | `game-board` | §5.1, mockup 보드 컨테이너 |
| domIds | `move-counter` | §5.3, mockup 정보 바 |
| domIds | `restart-button` | §5.4, mockup 버튼 |
| domIds | `completion-message` | §5.5, mockup done 섹션 |
| cssClasses | `board` | §5.1, mockup `#game-board.board` |
| cssClasses | `card` | §5.2, mockup 카드 16개 |
| cssClasses | `card--flipped` | §5.2-2/3, mockup one-flipped/comparing/done 섹션 |
| cssClasses | `card--matched` | §5.2-3, mockup idle(누적 맞춤)/done 섹션 |
| states | `idle`/`one-flipped`/`comparing`/`done` | §5.6 상태 텍스트 표, mockup 4개 섹션(idle/one-flipped/comparing/done) |
| designTokens | `--font-family-base`, `--color-card-back`, `--color-card-face`, `--color-board-bg`, `--space-grid-gap` | §2·§3, mockup 각 섹션 `:root` |
| accessibility | `button.card` 상태별 `aria-label`('뒤집힌 카드'/심볼명/'맞춘 카드') | §5.2 |
| accessibility | `#move-counter`/`#completion-message` `aria-live="polite"` | §5.3, §5.5 |
| accessibility | `#restart-button` 가시 텍스트 "다시 시작" + 키보드 조작 | §5.4 |
| accessibility | 색상 단독 구분 금지(상태명 텍스트 노출) | §5.2(배지 텍스트), §5.6 |
| responsive | 320px 이상 가로 스크롤 없는 4x4 grid | §4.4 |
| responsive | 600px 이상 카드 확대 | §4.4 |
| 완료 메시지 텍스트 계약 | "모두 맞췄습니다! 총 N번 시도" | §5.5 |

## 8. mockup 참조

시각 mockup: `docs/design/memory-BF-2153-mockup.html` — `idle`/`one-flipped`/`comparing`/`done` 4개 상태를 각각 독립된 iframe 섹션으로 정적 시각화한다. 동일한 8쌍 16장 보드를 기준으로 진행 상황이 자연스럽게 이어지도록 구성했다: `idle`(2쌍 이미 맞춤, 시도 5번) → `one-flipped`(카드 1장 추가로 뒤집힘, 시도 5번) → `comparing`(두 번째 카드까지 뒤집혀 불일치 확인 중, 시도 6번, 입력 잠금) → `done`(16장 모두 맞춤, 시도 12번, 완료 메시지 표시).
