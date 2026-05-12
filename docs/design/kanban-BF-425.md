# 칸반 보드 SPA 디자인 명세 (BF-425)

> 관련 task: BF-426 (designer)
> mockup: [`docs/design/mockups/kanban-BF-425.html`](mockups/kanban-BF-425.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `kanban/index.html` (또는 동급 URL 진입점 `/kanban`)
- **모던 다크 테마 우선** 의 3컬럼 칸반 보드 — `To Do · In Progress · Done`
- vanilla HTML/CSS/JS 기반 (notepad-BF-400 · timer-BF-405 · stopwatch-BF-415 와 토큰 시스템 일부 공유, 단 본 명세는 **다크 default + light 보조** 로 색 토큰 순서 반전)
- DnD (Drag-and-Drop) 컬럼 간 카드 이동 — 네이티브 HTML5 DnD API

### 1.2 사용자 경험 목표
- **다크 우선** — 첫 진입 시 다크 테마 default (GitHub Dark 톤). 라이트 토글은 보조 옵션. 야간·장시간 사용자 친화.
- **3컬럼 시각 위계** — 좌→우 흐름이 진행 상태 흐름과 일치 (To Do → In Progress → Done). 컬럼 헤더 uppercase + 카운트 배지로 한 눈에 진행률 인지.
- **카드 hover lift** — `translateY(-2px)` + 강한 shadow → 상호작용 가능한 객체임을 즉시 시각 신호.
- **DnD 시각 명료성** — 드래그 중 source card `opacity: 0.5`, drop target column 배경 `rgba(88,166,255,0.08)` 으로 하이라이트. 어디에 떨어뜨릴지 망설임 제거.
- **미세 인터랙션** — 카드 추가·삭제·이동 시 200ms fade-in/out 으로 부드러운 갱신감.
- **file:// 호환** — 외부 폰트/아이콘 CDN 0건. system font stack + 인라인 SVG / unicode 만 사용. 단일 HTML 더블클릭으로도 풀 동작.

### 1.3 비목표 (Out of Scope)
- **다중 보드 / 보드 전환** (v1 은 단일 보드만)
- **카드 상세 modal / 댓글 / 첨부 / 라벨 색 커스텀** (v1 은 단일 라인 title + 단일 chip tag 만)
- **컬럼 추가 / 삭제 / 이름 변경** (v1 은 3컬럼 고정)
- **사용자 / 권한 / 협업 sync** (in-memory 또는 localStorage 단일 사용자만)
- **검색 / 필터 / 정렬 UI** (v1 은 컬럼 내 수동 순서만)
- **외부 라이브러리 도입** — DnD 도 네이티브 HTML5 API 만 (Sortable.js / react-dnd X)

---

## 2. 디자인 토큰

> 본 명세는 다크 우선이므로 토큰 표기 순서를 **Dark HEX → Light HEX** 로 둡니다 (notepad/timer/stopwatch 명세와 반전 — 시각 표현 우선순위 명시 목적). 구현 CSS 는 `:root` 가 dark 값, `[data-theme="light"]` 가 light override.

### 2.1 색상 토큰 (dark 우선)

| 토큰명 | **Dark HEX (default)** | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | **`#0d1117`** | `#f6f8fa` | 페이지 전체 배경 |
| `--color-bg-surface` | **`#161b22`** | `#ffffff` | 컬럼 배경 |
| `--color-bg-card` | **`#1c2128`** | `#ffffff` | 카드 배경 |
| `--color-bg-elevated` | **`#22272e`** | `#f6f8fa` | 카드 hover 배경 / popover |
| `--color-bg-subtle` | **`#1c2128`** | `#f1f3f5` | 컬럼 헤더 hover bg |
| `--color-border-default` | **`#30363d`** | `#d0d7de` | 컬럼·카드 외곽선 |
| `--color-border-strong` | **`#444c56`** | `#afb8c1` | hover 시 강조 외곽 |
| `--color-text-primary` | **`#c9d1d9`** | `#1f2328` | 카드 title·컬럼 헤더 |
| `--color-text-secondary` | **`#8b949e`** | `#656d76` | 카드 meta·캡션 |
| `--color-text-muted` | **`#6e7681`** | `#8c959f` | placeholder·빈 상태 hint |
| `--color-accent` | **`#58a6ff`** | `#0969da` | primary action·focus ring·드롭 하이라이트 base |
| `--color-accent-hover` | **`#79b8ff`** | `#1f6feb` | accent hover/active |
| `--color-accent-soft` | **`rgba(88,166,255,0.08)`** | `rgba(9,105,218,0.08)` | drop target column 배경 하이라이트 (8% alpha) |
| `--color-accent-soft-strong` | **`rgba(88,166,255,0.16)`** | `rgba(9,105,218,0.12)` | drop target column 헤더 / drag preview 강조 (16% alpha) |
| `--color-success` | **`#3fb950`** | `#1a7f37` | Done 컬럼 헤더 dot |
| `--color-warning` | **`#d29922`** | `#9a6700`  | In Progress 컬럼 헤더 dot |
| `--color-neutral` | **`#8b949e`** | `#656d76` | To Do 컬럼 헤더 dot |
| `--color-danger` | **`#f85149`** | `#cf222e` | 삭제 버튼 hover·확정 |
| `--color-focus-ring` | **`rgba(88,166,255,0.4)`** | `rgba(9,105,218,0.35)` | 키보드 focus outline (2px) |

> **AC 매핑**: `--color-bg-canvas: #0d1117`, `--color-accent: #58a6ff`, `--color-text-primary: #c9d1d9` 가 모두 다크 default 로 정의되었고, 라이트 페어도 위 표에서 함께 정의됨.

### 2.2 공간 토큰

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.3 반경·그림자

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` (chip tag / count badge) |
| `--radius-md` | **`8px`** (카드 corner — AC 정량 기준) |
| `--radius-lg` | `12px` (컬럼 container) |
| `--radius-pill` | `999px` (count badge 옵션) |
| `--shadow-card` | dark: `0 1px 0 rgba(0,0,0,0.4)` / light: `0 1px 0 rgba(31,35,40,0.04), 0 1px 1px rgba(31,35,40,0.06)` |
| `--shadow-card-hover` | dark: `0 8px 24px rgba(0,0,0,0.5)` / light: `0 8px 24px rgba(140,149,159,0.2)` |
| `--shadow-drag` | dark: `0 16px 32px rgba(0,0,0,0.6)` / light: `0 16px 32px rgba(140,149,159,0.4)` (드래그 중 카드 분리감) |

### 2.4 모션 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--duration-fast` | `120ms` | hover 색 전환 |
| `--duration-base` | `200ms` | **카드 fade-in/out · 컬럼 하이라이트 (AC 정량 기준)** |
| `--duration-slow` | `300ms` | 큰 레이아웃 reflow (선택) |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 카드 추가·드롭 settle |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 색 / opacity 전환 |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

> **file:// 호환 정책 (§9.4)**: 위 stack 은 모두 OS 내장 폰트. 외부 Google Fonts / 웹폰트 호출 0건.

### 3.1 type hierarchy (AC 14/12/11px 기준)

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page (topbar) | `18px` | `600` | `1.3` | `0` | `--text-h1` |
| **card-title** | **`14px`** | `500` | `1.45` | `0` | `--text-card-title` |
| **card-meta** (assignee / due / tag inline) | **`12px`** | `400` | `1.4` | `0` | `--text-card-meta` |
| **column-header** (uppercase kicker) | **`12px`** | `600` | `1` | `0.06em` | `--text-column-header` |
| **count-badge** (mono numerals) | **`11px`** | `600` | `1` | `0` | `--text-count` |
| tag-chip | `11px` | `500` | `1` | `0.02em` | `--text-tag` |
| button | `13px` | `500` | `1` | `0` | `--text-button` |
| caption / empty hint | `12px` | `400` | `1.4` | `0` | `--text-caption` |

**3단 위계 요약** (AC 직결):
- **14px** — card-title (가장 정보 밀도가 높은 카드 본문)
- **12px** — card-meta · column-header · caption (보조 정보 + 컬럼 라벨)
- **11px** — count-badge · tag-chip (압축된 메타)

column-header 는 `text-transform: uppercase` + `letter-spacing: 0.06em` 으로 시각 위계 부여 (Linear / GitHub Projects 패턴).

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Topbar · "칸반 보드"                                       [+ 카드][🌙] │ 56px
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│   │ ● TO DO    [ 3 ] │  │ ● IN PROGRESS  2 │  │ ● DONE         5 │ col  │
│   ├──────────────────┤  ├──────────────────┤  ├──────────────────┤      │
│   │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │      │
│   │ │ 카드 title    │ │  │ │ 카드 title    │ │  │ │ 카드 title   │ │ card │
│   │ │ meta · tag   │ │  │ │ meta · tag   │ │  │ │ meta · tag   │ │      │
│   │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │      │
│   │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │      │
│   │ │ 카드 title    │ │  │ │ 카드 title    │ │  │ │ 카드 title   │ │      │
│   │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │      │
│   │      ⋮           │  │                  │  │       ⋮          │      │
│   │ [+ 카드 추가]    │  │ [+ 카드 추가]    │  │ [+ 카드 추가]    │      │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
        ◄── 16px ──►          ◄── 16px ──►
```

- 페이지 컨테이너 `.board`: `display: grid`, `grid-template-columns: repeat(3, minmax(0, 1fr))`, **`gap: 16px`** (= `--space-4`), `padding: var(--space-5)`, `max-width: 1280px`, 가운데 정렬
- 컬럼 `.column`: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border-default)`, `border-radius: var(--radius-lg)`, `padding: var(--space-3)`, `display: flex; flex-direction: column; gap: var(--space-3)`, `min-height: 240px`
- 카드 `.card`: §4.4 상세

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: var(--color-bg-surface)`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "칸반 보드" (`--text-h1`)
- 우측: `[+ 카드 추가]` primary button + `[🌙 / ☀]` ghost button (다크 토글)
  - 다크 토글 아이콘: **unicode glyph** (`🌙` / `☀`) — 외부 아이콘 라이브러리 X. 또는 inline SVG 24×24 path (mockup 참조).

### 4.3 컬럼 헤더

```
┌──────────────────────────────────────────────┐
│ ● TO DO                              [ 3 ]   │  header
└──────────────────────────────────────────────┘
  ▲           ▲                            ▲
  dot (8px)  uppercase label              count badge
```

- 컨테이너: `display: flex`, `align-items: center`, `justify-content: space-between`, `padding: var(--space-3) var(--space-2)`, `border-bottom: 1px solid var(--color-border-default)`
- 좌측 그룹 `.column-header__label`:
  - `display: flex; align-items: center; gap: var(--space-2)`
  - dot `.column-dot`: `width: 8px; height: 8px; border-radius: 999px`
    - To Do: `background: var(--color-neutral)`
    - In Progress: `background: var(--color-warning)`
    - Done: `background: var(--color-success)`
  - label `<span>` : font `--text-column-header`, `text-transform: uppercase`, `letter-spacing: 0.06em`, color `--color-text-primary`
- 우측 count badge `.count-badge`:
  - `min-width: 22px; height: 20px; padding: 0 6px`
  - `border-radius: var(--radius-pill)` (= `999px`)
  - `background: var(--color-bg-subtle)`
  - `font: var(--text-count)` (= `600 11px/1 mono`), `tabular-nums`
  - `color: var(--color-text-secondary)`
  - `display: inline-flex; align-items: center; justify-content: center`
- 카드 0개일 때 count badge `0` 표시 (hidden X) — 빈 상태 인지

### 4.4 카드

```
┌───────────────────────────────────────┐
│ 디자인 시스템 토큰 정리                  │  title (14px)
│                                       │
│ #design  · 2일 후                      │  meta (12px) + tag (11px chip)
└───────────────────────────────────────┘
```

- 컨테이너 `.card`:
  - `background: var(--color-bg-card)`
  - `border: 1px solid var(--color-border-default)`
  - **`border-radius: 8px`** (= `--radius-md`, **AC 정량 기준**)
  - `padding: var(--space-3)`
  - `box-shadow: var(--shadow-card)`
  - `cursor: grab` (active 시 `grabbing`)
  - `transition: transform var(--duration-fast) var(--ease-in-out), box-shadow var(--duration-fast) var(--ease-in-out), background var(--duration-fast), opacity var(--duration-base)`
- 카드 내부 구조:
  - `.card__title`: font `--text-card-title` (= `500 14px/1.45 sans`), `color: var(--color-text-primary)`, `margin: 0 0 var(--space-2)`
  - `.card__meta`: `display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap`, font `--text-card-meta` (= `400 12px/1.4 sans`), `color: var(--color-text-secondary)`
  - `.tag`: chip — `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-sm); background: var(--color-bg-elevated); color: var(--color-text-secondary); font: var(--text-tag)` (= `500 11px/1 sans`)
  - assignee initial avatar (옵션): `width: 20px; height: 20px; border-radius: 999px; background: var(--color-accent-soft-strong); color: var(--color-accent); font: 500 11px/1 sans; display: inline-flex; align-items: center; justify-content: center`

### 4.5 카드 hover / focus 상태

| 상태 | 시각 변경 |
|---|---|
| default | shadow `--shadow-card`, transform `none`, background `--color-bg-card` |
| **hover** | shadow `--shadow-card-hover`, **`transform: translateY(-2px)`** (AC 정량 기준), background `--color-bg-elevated` |
| focus-visible | hover 와 동일 + `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
| active (mousedown 직후) | `transform: translateY(0); transition-duration: 0ms` (지연 없는 즉시 반응) |

`prefers-reduced-motion: reduce` 시 transform 비활성, shadow/background 만 전환.

### 4.6 DnD (드래그 앤 드롭) 상태

```
   드래그 중 source                Drop target column
   ┌──────────────┐                ╔══════════════════╗
   │  카드 title   │ opacity 0.5    ║ ● IN PROGRESS  2 ║ ← 배경
   │  (반투명)     │                ╠══════════════════╣   rgba(88,166,255,0.08)
   └──────────────┘                ║                  ║   border 강조
                                   ║   [drop here]    ║
                                   ╚══════════════════╝
```

| 상태 | 시각 |
|---|---|
| source card (드래그 중 원본) | **`opacity: 0.5`** (AC 정량 기준), `cursor: grabbing`, transform 적용 X |
| drop target column (over) | `background: var(--color-accent-soft)` (= **`rgba(88,166,255,0.08)`**, AC 정량 기준), `border-color: var(--color-accent)`, `box-shadow: inset 0 0 0 1px var(--color-accent-soft-strong)` |
| drop target column header | 색 변화 X (label 안정성 유지) |
| placeholder slot (drop position indicator) | `height: 4px; background: var(--color-accent); border-radius: 2px; margin: var(--space-1) 0` (드롭 위치 가이드) |
| drop 완료 직후 카드 | `animation: drop-settle 200ms var(--ease-out)` — scale `0.96 → 1` + opacity `0.6 → 1` |

브라우저 기본 drag image 는 그대로 사용 (커스텀 ghost 미생성 — v1 단순화). 단, 시각적으로 source 가 0.5 opacity 로 약화되므로 사용자는 드래그가 진행 중임을 충분히 인지.

### 4.7 빈 상태 (컬럼 카드 0개)

- 컬럼 header 유지, count badge `0`
- 본문 영역에 hint: `"카드가 없습니다. + 카드 추가 로 시작하세요."`
  - 텍스트: `--text-caption`, `color: var(--color-text-muted)`, `text-align: center`, `padding: var(--space-5) var(--space-3)`
  - dashed 외곽선 컨테이너: `border: 1px dashed var(--color-border-default); border-radius: var(--radius-md); background: transparent`
- 드롭 대상으로는 여전히 동작 — 빈 상태 hint 위에 카드 dropped 시 정상 추가

### 4.8 컬럼 푸터 `[+ 카드 추가]`
- 컬럼 내 항상 마지막 위치 (카드 목록 아래)
- 버튼 style:
  - `display: flex; align-items: center; justify-content: center; gap: var(--space-1)`
  - `width: 100%; padding: var(--space-2) var(--space-3)`
  - `background: transparent; border: 1px dashed var(--color-border-default)`
  - `border-radius: var(--radius-md)`
  - `color: var(--color-text-secondary); font: var(--text-button)` (= `500 13px/1 sans`)
  - hover: `border-color: var(--color-accent)`, `color: var(--color-accent)`, `background: var(--color-accent-soft)`
- 아이콘은 unicode `+` (외부 라이브러리 X)

### 4.9 카드 추가 인라인 입력

`[+ 카드 추가]` 클릭 시 그 자리에 inline `<textarea>` 가 표시 (modal X):

```
┌──────────────────────────────────────┐
│ [ 카드 제목 입력...                 ] │  textarea (3 lines max)
│                                      │
│ [ 추가 ]   [ 취소 ]                  │  버튼 한 줄
└──────────────────────────────────────┘
```

- textarea: `min-height: 60px; max-height: 120px; padding: var(--space-2); background: var(--color-bg-card); border: 1px solid var(--color-accent); border-radius: var(--radius-md); color: var(--color-text-primary); font: var(--text-card-title); resize: none`
- placeholder: `"제목을 입력하세요…"`, `color: var(--color-text-muted)`
- Enter 키: 추가 확정 (Shift+Enter 줄바꿈)
- Esc 키: 취소
- 추가 확정 시 fade-in 200ms 로 새 카드 prepend

### 4.10 카드 삭제

- 카드 우상단 hover 시 노출되는 `×` ghost button (20×20px, `--text-caption`, `color: var(--color-text-muted)`)
- hover 시 `color: var(--color-danger)`
- 클릭 즉시 fade-out 200ms + 컬럼 reflow (확인 modal 없음 — UX 마찰 최소화. 실수 가능성은 v2 에서 undo toast 도입 검토)

### 4.11 반응형 Breakpoint

| breakpoint | board layout | 컬럼 width | 카드 / typography |
|---|---|---|---|
| **`≥ 960px`** (desktop) | `grid-template-columns: repeat(3, minmax(0, 1fr))`, **`gap: 16px`** (AC) | 자동 (균등 3등분) | 정상 (14/12/11) |
| **`640px – 959px`** (tablet) | `grid-template-columns: repeat(3, minmax(260px, 1fr))`, `overflow-x: auto`, `scroll-snap-type: x mandatory` | 최소 `260px`, 가로 스크롤 (필요 시) | 정상 (14/12/11) |
| **`< 640px`** (mobile) | **`grid-template-columns: 1fr`** (= **1컬럼 stack**, AC 정량 기준), `gap: var(--space-3)` | 100% (단일 컬럼 풀폭) | card-title `14px` 유지, padding 축소 `var(--space-2) var(--space-3)` |
| **`< 360px`** (XS) | (mobile 과 동일) | (mobile 과 동일) | topbar `[+ 카드]` 버튼 라벨 hide, icon only |

mobile (< 640px) 시 DnD 는 long-press(약 300ms) 후 활성 (touch 기본). 정밀 드래그 어려우므로 카드 우상단에 **"이동"** secondary action 도 함께 제공 (선택 — §13 운영자 결정).

mobile 시 컬럼 헤더는 `position: sticky; top: 0` 으로 고정 — 스크롤 시 어느 컬럼 안인지 인지.

---

## 5. 컴포넌트 명세

### 5.1 `<Board>` (전체 컨테이너)
props:
- `columns: Array<{ id: string; label: string; tone: "neutral"|"warning"|"success"; cards: Card[] }>`
- `onCardMove(cardId, fromColumnId, toColumnId, toIndex)`
- `onCardCreate(columnId, title)`
- `onCardDelete(cardId)`

명세:
- §4.1 그리드 컨테이너
- v1 의 columns 는 hardcoded 3개 (id: `todo` / `in-progress` / `done`)

### 5.2 `<Column>`
props:
- `column: { id, label, tone, cards }`
- `onDropCard(cardId, toIndex)`
- 자체 DnD 이벤트 핸들러 (`ondragover`, `ondrop`, `ondragenter`, `ondragleave`)

명세:
- §4.3 헤더 + §4.4 카드 리스트 + §4.8 푸터
- drop target 상태 (`.is-drop-target`) CSS 클래스 토글: `dragenter` 시 추가, `dragleave` (실제 컬럼 밖) 시 제거, `drop` 시 제거
- `dragleave` 는 자식 요소 진출에서도 발생하므로 `event.target === column` 가드 또는 enter/leave counter 패턴 사용 (구현 가이드 §7)

### 5.3 `<Card>`
props:
- `card: { id, title, tag?, assignee?, dueAt? }`
- `onDelete()`
- `draggable: true`

명세:
- §4.4 마크업, §4.5 hover / focus 상태, §4.6 드래그 시 `opacity: 0.5`
- `draggable="true"` HTML attribute
- `ondragstart`: `event.dataTransfer.setData("text/plain", card.id)`, `event.dataTransfer.effectAllowed = "move"`, 자기 자신에 `.is-dragging` 클래스 추가 (CSS 로 opacity 0.5 적용)
- `ondragend`: `.is-dragging` 제거 (성공/취소 모두)

aria:
- `<article role="listitem" aria-grabbed="false" aria-label="카드: {title}">`
- 드래그 중 `aria-grabbed="true"` (legacy aria 지만 SR 호환 보조)

### 5.4 `<ColumnHeader>`
props:
- `label: string`
- `tone: "neutral"|"warning"|"success"`
- `count: number`

명세:
- §4.3 마크업
- dot color 는 tone 에 따라 분기 (CSS 클래스 `.column-header__dot--neutral|warning|success`)

### 5.5 `<CountBadge>`
- §4.3 우측 badge
- `<span class="count-badge" aria-label="{count}개">{count}</span>`
- 0 일 때도 표시 (hidden X)

### 5.6 `<AddCardForm>` (inline)
- §4.9 명세
- 상태: `idle` (버튼 표시) / `editing` (textarea 표시)
- focus management: editing 시작 시 textarea autofocus

### 5.7 `<EmptyColumnHint>`
- §4.7 명세
- 별도 컴포넌트 X — 컬럼 내부 분기 콘텐츠

---

## 6. 상태·인터랙션 상세

### 6.1 데이터 모델

```ts
type Card = {
  id: string;          // ULID
  title: string;       // 1 ~ 140자
  tag?: string;        // 단일 chip (선택)
  assignee?: string;   // 단일 이니셜 1글자 (선택)
  createdAt: number;   // epoch ms
};

type ColumnId = "todo" | "in-progress" | "done";

type Column = {
  id: ColumnId;
  label: string;       // "To Do" | "In Progress" | "Done"
  tone: "neutral" | "warning" | "success";
  cardIds: string[];   // 순서 보존
};

type BoardState = {
  cards: Record<string, Card>;
  columns: Record<ColumnId, Column>;
};
```

persistence: localStorage key `bf-kanban-board` (선택 — v1 default 는 in-memory. 운영자 결정 §13).

### 6.2 DnD 흐름 (네이티브 HTML5 API)

1. **dragstart** (card):
   - `event.dataTransfer.setData("text/plain", cardId)`
   - `event.dataTransfer.effectAllowed = "move"`
   - card 에 `.is-dragging` 클래스 → CSS `opacity: 0.5`
   - body 에 `.is-dragging-card` 클래스 (선택 — 전역 cursor 변경 가능)
2. **dragenter** (column):
   - 컬럼에 `.is-drop-target` 클래스 → CSS `background: var(--color-accent-soft)` + `border-color: var(--color-accent)`
   - enter counter +1 (자식 요소 진입 시에도 발생하므로 counter 패턴)
3. **dragover** (column):
   - `event.preventDefault()` 필수 (drop 허용)
   - 선택: 카드들 사이 mouse Y 위치 계산 후 placeholder slot DOM 삽입 (시각 가이드)
4. **dragleave** (column):
   - enter counter -1, 0 이면 `.is-drop-target` 제거
5. **drop** (column):
   - `event.preventDefault()` 필수
   - `cardId = event.dataTransfer.getData("text/plain")`
   - placeholder 위치 또는 mouse Y 기반 index 계산
   - state mutation: `cardIds` 배열에서 cardId 제거 → toIndex 에 삽입
   - 컬럼 cross 인 경우 from / to 모두 update
   - render
   - `.is-drop-target` 제거
6. **dragend** (card — 성공/취소 무관):
   - card 에서 `.is-dragging` 제거 (opacity 복귀)
   - body 에서 `.is-dragging-card` 제거

**dragleave / dragenter counter 패턴**:
```js
let dragEnterCount = 0;
column.addEventListener("dragenter", (e) => {
  dragEnterCount++;
  column.classList.add("is-drop-target");
});
column.addEventListener("dragleave", (e) => {
  dragEnterCount--;
  if (dragEnterCount === 0) column.classList.remove("is-drop-target");
});
column.addEventListener("drop", (e) => {
  dragEnterCount = 0;
  column.classList.remove("is-drop-target");
  // ... drop 처리
});
```

### 6.3 미세 인터랙션 (animation)

```css
/* 카드 추가 fade-in */
@keyframes card-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card.is-entering {
  animation: card-fade-in var(--duration-base) var(--ease-out);
}

/* 카드 삭제 fade-out */
@keyframes card-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}
.card.is-leaving {
  animation: card-fade-out var(--duration-base) var(--ease-in-out) forwards;
  pointer-events: none;
}

/* 드롭 settle */
@keyframes drop-settle {
  from { opacity: 0.6; transform: scale(0.96); }
  to   { opacity: 1;   transform: scale(1); }
}
.card.is-dropped {
  animation: drop-settle var(--duration-base) var(--ease-out);
}

/* 컬럼 drop target 하이라이트 */
.column {
  transition:
    background var(--duration-base) var(--ease-in-out),
    border-color var(--duration-base) var(--ease-in-out);
}

@media (prefers-reduced-motion: reduce) {
  .card.is-entering,
  .card.is-leaving,
  .card.is-dropped {
    animation: none;
  }
  .card {
    transition: none;
  }
}
```

**정량 일관성**: 모든 fade-in/out + drop settle + column 하이라이트 전환은 **`200ms`** (= `--duration-base`, AC 정량 기준). hover 색 전환만 `120ms` (즉시감).

### 6.4 키보드 / 접근성

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar → 컬럼 1 헤더 → 카드들 → `[+ 카드]` → 컬럼 2 ... 순환 | 전역 |
| `Enter` (카드 focus) | 카드 액션 메뉴 (v1 은 삭제만 — `×` 버튼으로 focus 이동) | 카드 focus |
| `Delete` / `Backspace` (카드 focus) | 카드 삭제 확정 (v1 은 즉시 — undo 없음) | 카드 focus |
| `Esc` | inline 입력 취소 / drop preview 취소 | textarea editing 시 |
| `Space` (카드 focus, 옵션) | 키보드 이동 모드 진입 — 화살표 키로 컬럼 간 이동, Enter 확정 | v2 (§13) |

키보드 DnD (Space → 화살표) 는 v2 후속 — v1 은 카드 자체에 focus 가능 + 삭제만 키보드로 가능. 마우스 DnD 만 v1 범위. (§13 운영자 결정)

`focus-visible` only outline (마우스 click focus 에서는 outline 비표시).

`aria-live` SR 알림:
- 카드 이동 완료 시: `"{title} 카드를 {fromColumn} 에서 {toColumn} 으로 이동했습니다"`
- 카드 추가 시: `"{toColumn} 에 카드 추가: {title}"`
- 카드 삭제 시: `"{fromColumn} 에서 카드 삭제: {title}"`
- 모두 `<div id="sr-announce" class="sr-only" role="status" aria-live="polite">` 에 textContent 갱신

### 6.5 다크 / 라이트 토글
- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- **첫 진입 default 는 dark** — notepad/timer/stopwatch 와 반전 (본 명세는 다크 우선)
- 단, OS `prefers-color-scheme: light` 가 명시되어 있고 사용자가 명시적으로 light 를 골랐던 적이 있으면 `localStorage["bf-theme"]` 값 우선
- `localStorage["bf-theme"]` 키는 notepad/timer/stopwatch 와 공유 (cross-SPA 일관성)
  - 단, 다른 SPA 와 default 가 다른 점만 유의 — value 가 명시되지 않은 경우 kanban 만 `"dark"`, 나머지는 `"light"` (각 SPA 의 default 가 다른 것이 정상)

### 6.6 비저장 vs 저장 정책 (v1)
- **default: in-memory only** — 새로고침 시 모든 카드 초기화 + 데모 시드 3·2·5 카드 재로드
- 옵션: localStorage `bf-kanban-board` (운영자 결정 §13)
- 다크 토글 상태(`bf-theme`) 는 항상 localStorage 저장

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)

```
/
├── kanban/
│   ├── index.html       # 칸반 SPA entry
│   ├── styles.css       # 본 명세 토큰 + 레이아웃
│   ├── main.js          # 상태 + 렌더 + DnD 이벤트
│   ├── storage.js       # (선택) localStorage 어댑터
│   └── ulid.js          # (선택 — notepad/ulid.js 복제 가능)
├── notepad/             # 기존 — 보존
├── timer/               # 기존 — 보존
├── stopwatch/           # 기존 — 보존
└── docs/design/
    ├── kanban-BF-425.md            (본 문서)
    └── mockups/kanban-BF-425.html  (시각 mockup)
```

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>칸반 보드</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">칸반 보드</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--primary" id="btn-add-global">＋ 카드</button>
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="board" id="board" aria-label="칸반 보드">
      <!-- 컬럼 3개를 main.js render() 가 동적 생성 — 또는 정적으로 SSR 골격 두고 카드만 동적 -->
    </main>

    <div id="sr-announce" class="sr-only" role="status" aria-live="polite"></div>

    <script type="module" src="main.js"></script>
  </body>
</html>
```

### 7.3 컬럼 / 카드 HTML 템플릿 (render() 가 생성)

```html
<section class="column" data-column-id="todo" aria-label="To Do 컬럼">
  <header class="column-header">
    <div class="column-header__label">
      <span class="column-header__dot column-header__dot--neutral" aria-hidden="true"></span>
      <span class="column-header__text">TO DO</span>
    </div>
    <span class="count-badge" aria-label="3개">3</span>
  </header>

  <ol class="column-body" data-role="card-list">
    <li class="card" draggable="true" data-card-id="c-01" tabindex="0" role="listitem">
      <button class="card__delete" type="button" aria-label="카드 삭제">×</button>
      <h3 class="card__title">디자인 시스템 토큰 정리</h3>
      <div class="card__meta">
        <span class="tag">#design</span>
        <span class="card__due">2일 후</span>
      </div>
    </li>
    <!-- ... -->
  </ol>

  <button class="column-add" type="button" data-action="add-card">＋ 카드 추가</button>
</section>
```

### 7.4 CSS 변수 정의 위치

`kanban/styles.css` 상단 `:root` — **다크 default**:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* §2.1 다크 default */
  --color-bg-canvas: #0d1117;
  --color-bg-surface: #161b22;
  --color-bg-card: #1c2128;
  --color-bg-elevated: #22272e;
  --color-bg-subtle: #1c2128;
  --color-border-default: #30363d;
  --color-border-strong: #444c56;
  --color-text-primary: #c9d1d9;
  --color-text-secondary: #8b949e;
  --color-text-muted: #6e7681;
  --color-accent: #58a6ff;
  --color-accent-hover: #79b8ff;
  --color-accent-soft: rgba(88, 166, 255, 0.08);
  --color-accent-soft-strong: rgba(88, 166, 255, 0.16);
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-neutral: #8b949e;
  --color-danger: #f85149;
  --color-focus-ring: rgba(88, 166, 255, 0.4);

  /* §2.2 spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* §2.3 radius / shadow */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 0 rgba(0, 0, 0, 0.4);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-drag: 0 16px 32px rgba(0, 0, 0, 0.6);

  /* §2.4 motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* §3 typography */
  --text-h1: 600 18px/1.3 var(--font-sans);
  --text-card-title: 500 14px/1.45 var(--font-sans);
  --text-card-meta: 400 12px/1.4 var(--font-sans);
  --text-column-header: 600 12px/1 var(--font-sans);
  --text-count: 600 11px/1 var(--font-mono);
  --text-tag: 500 11px/1 var(--font-sans);
  --text-button: 500 13px/1 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
}

[data-theme="light"] {
  --color-bg-canvas: #f6f8fa;
  --color-bg-surface: #ffffff;
  --color-bg-card: #ffffff;
  --color-bg-elevated: #f6f8fa;
  --color-bg-subtle: #f1f3f5;
  --color-border-default: #d0d7de;
  --color-border-strong: #afb8c1;
  --color-text-primary: #1f2328;
  --color-text-secondary: #656d76;
  --color-text-muted: #8c959f;
  --color-accent: #0969da;
  --color-accent-hover: #1f6feb;
  --color-accent-soft: rgba(9, 105, 218, 0.08);
  --color-accent-soft-strong: rgba(9, 105, 218, 0.12);
  --color-success: #1a7f37;
  --color-warning: #9a6700;
  --color-neutral: #656d76;
  --color-danger: #cf222e;
  --color-focus-ring: rgba(9, 105, 218, 0.35);
  --shadow-card: 0 1px 0 rgba(31, 35, 40, 0.04), 0 1px 1px rgba(31, 35, 40, 0.06);
  --shadow-card-hover: 0 8px 24px rgba(140, 149, 159, 0.2);
  --shadow-drag: 0 16px 32px rgba(140, 149, 159, 0.4);
}
```

### 7.5 단계별 구현 순서 (권장)

1. **§7.2 골격 HTML** + 빈 `styles.css` / `main.js`
2. **§7.4 CSS 변수** + reset (`*{box-sizing:border-box}`, `body{margin:0; font:14px/1.5 var(--font-sans); background:var(--color-bg-canvas); color:var(--color-text-primary)}`)
3. **topbar** (기존 SPA 패턴 재사용, 다크 토글만 단독 — kanban 은 default `dark` 라는 점만 차이)
4. **board grid** `.board` (3컬럼 grid, gap 16px)
5. **column** 컨테이너 + header + body + footer button (정적 마크업 검증)
6. **card** 마크업 + hover lift `translateY(-2px)` + focus-visible outline
7. **카드 추가** inline form (textarea + 추가/취소)
8. **카드 삭제** hover 시 `×` 노출 + fade-out 200ms
9. **state model** `BoardState` (§6.1) + render() 함수
10. **DnD 이벤트** (§6.2 6단계) — dragstart / dragenter / dragover / dragleave / drop / dragend + enter counter
11. **placeholder slot** (선택 — drop position 가이드 4px height)
12. **animation** (§6.3 keyframes) + reduced-motion 가드
13. **반응형** (§4.11 — `@media (max-width: 959px)` / `@media (max-width: 639px)`)
14. **다크 토글** (§6.5) + `localStorage["bf-theme"]` 공유
15. **a11y** — sr-only 영역, aria-live 알림, focus 순환 검증

### 7.6 정량 일치 기준 (구현 검증 — AC 직결)

| 항목 | 값 | 토큰 | AC |
|---|---|---|---|
| **board grid gap** | **`16px`** | `--space-4` | ✓ AC |
| **카드 border-radius** | **`8px`** | `--radius-md` | ✓ AC |
| **카드 hover transform** | **`translateY(-2px)`** | — | ✓ AC |
| **드래그 source opacity** | **`0.5`** | — | ✓ AC |
| **drop target column 배경** | **`rgba(88,166,255,0.08)`** | `--color-accent-soft` (dark) | ✓ AC |
| **mobile breakpoint** | **`< 640px → 1컬럼 stack`** | — | ✓ AC |
| **desktop breakpoint** | **`≥ 960px → 3컬럼 풀 grid`** | — | ✓ AC |
| **fade-in / fade-out** | **`200ms`** | `--duration-base` | ✓ AC |
| **컬럼 헤더 letter-spacing** | `0.06em` + uppercase | `--text-column-header` | ✓ AC (uppercase + 카운터) |
| **count badge font** | `600 11px/1 mono` | `--text-count` | ✓ AC (11/12/14 위계) |
| `--color-bg-canvas` dark | `#0d1117` | — | ✓ AC |
| `--color-accent` dark | `#58a6ff` | — | ✓ AC |
| `--color-text-primary` dark | `#c9d1d9` | — | ✓ AC |
| board max-width | `1280px` | hardcoded | — |
| column padding | `12px` | `--space-3` | — |
| card padding | `12px` | `--space-3` | — |
| topbar height | `56px` | hardcoded | — |

### 7.7 DnD 이벤트 helper (권장 구현)

```js
function setupColumnDnD(columnEl, onDrop) {
  let enterCount = 0;
  columnEl.addEventListener("dragenter", (e) => {
    enterCount++;
    columnEl.classList.add("is-drop-target");
  });
  columnEl.addEventListener("dragleave", (e) => {
    enterCount--;
    if (enterCount <= 0) {
      enterCount = 0;
      columnEl.classList.remove("is-drop-target");
    }
  });
  columnEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  columnEl.addEventListener("drop", (e) => {
    e.preventDefault();
    enterCount = 0;
    columnEl.classList.remove("is-drop-target");
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) onDrop(cardId, computeDropIndex(columnEl, e.clientY));
  });
}

function computeDropIndex(columnEl, clientY) {
  const cards = [...columnEl.querySelectorAll(".card:not(.is-dragging)")];
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return cards.length;
}
```

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현.

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<Board>` | vanilla — grid container |
| `<Column>` | `Card` (전체 컬럼 wrapper) + 내부 `<ol>` |
| `<Card>` | `Card` + `CardHeader` + `CardContent` |
| `<ColumnHeader>` | vanilla `<header>` |
| `<CountBadge>` | `Badge` (`variant: secondary`) |
| `<AddCardForm>` textarea | `Textarea` + `Button` (Add / Cancel) |
| 다크 토글 | vanilla — shadcn `ThemeToggle` 패턴과 호환 |
| `.tag` chip | `Badge` (`variant: outline`) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`kanban/`) 입니다. 운영자 정책(BF-197 회귀 반영)에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)
- `notepad/` 전체 — 본 작업 무관, 변경 금지
- `timer/` 전체 — 본 작업 무관, 변경 금지
- `stopwatch/` 전체 — 본 작업 무관, 변경 금지
- 기존 페이지들의 라우팅·링크 (만약 있다면)

### 9.2 신규 `kanban/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | stopwatch/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | stopwatch/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="...">` 패턴 | stopwatch/index.html | **복제 + 수정** | **`data-theme="dark"`** (kanban 만 default dark) |
| `<link rel="stylesheet" href="styles.css">` | stopwatch/index.html | **복제 + 경로 수정** | `kanban/styles.css` |
| `<script type="module" src="main.js">` | stopwatch/index.html | **복제 + 경로 수정** | `kanban/main.js` |
| `<header class="topbar">` 구조 | stopwatch/index.html | **복제 (라벨 변경 + 액션 추가)** | 제목 "스톱워치" → "칸반 보드". 우측 액션에 `[+ 카드]` primary + `[🌙]` ghost 2개 |
| `bf-theme` localStorage 초기화 로직 | timer/main.js 또는 stopwatch/main.js | **복제 + default 변경** | kanban 의 default 는 `"dark"` (다른 SPA 는 `"light"`). 기존 SPA 와 키 공유는 유지 — 키 값이 명시 저장된 경우 우선 반영 |
| reset / base body 스타일 | stopwatch/styles.css | **복제** | `*{box-sizing}`, `body{margin:0;...}` |
| `.btn` ghost / primary base | stopwatch/styles.css | **복제 + 토큰 조정** | 동일 패턴, 본 명세의 §2.1 다크 우선 토큰으로 색 갱신 |
| `.sr-only` 클래스 | stopwatch/styles.css | **복제** | 접근성 표준 패턴 |
| ulid 생성 helper | notepad/ulid.js | **복제** | card id 생성 — 동일 파일 그대로 복제 OK |

### 9.3 추가/수정해야 할 부분 (kanban 전용)

- board grid + column / card 마크업 (§7.2, §7.3)
- 다크 우선 색 토큰 (§2.1) — 기존 SPA 와 별도 팔레트
- DnD 이벤트 + state 모델 (§6.1, §6.2, §7.7)
- 미세 인터랙션 keyframes (§6.3)
- 카드 inline 추가 form / 삭제 (§4.9, §4.10)
- topbar `[+ 카드]` global add button — global add 는 To Do 컬럼에 prepend (default behavior)

### 9.4 file:// 호환 제약 (AC 직결)

본 명세는 **file:// 프로토콜로 더블클릭 진입 시에도 풀 동작** 을 요구합니다. dev / mockup 모두 다음을 준수:

| 항목 | 정책 |
|---|---|
| 외부 폰트 (Google Fonts 등) | **금지** — system font stack (`ui-sans-serif, system-ui, ...`) 만 사용 |
| 외부 아이콘 라이브러리 (Font Awesome, lucide, feather) | **금지** — inline SVG 또는 unicode glyph (`🌙`, `☀`, `＋`, `×`) 만 사용 |
| 외부 CSS CDN | **금지** — `<link rel="stylesheet">` 는 같은 디렉토리 내 상대 경로만 |
| 외부 JS CDN | **금지** — `<script src>` 는 같은 디렉토리 내 상대 경로 또는 ES module import 만 |
| 이미지 / 아이콘 자산 | inline SVG 또는 base64 data URI. 외부 호스팅 이미지 X |
| `fetch()` / network 호출 | v1 범위 X — 모든 데이터는 in-memory 또는 localStorage |

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 / §9.4 만 새로 작성. 코드 리뷰 시 reviewer 는 §9.2 의 복제가 누락되지 않았는지 + §9.4 외부 의존성 0건인지부터 확인.

---

## 10. mockup 참조

[`docs/design/mockups/kanban-BF-425.html`](mockups/kanban-BF-425.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0건, file:// 더블클릭 진입 가능)
- **다크 default 패널 (메인)** + 라이트 패널 (보조 비교) 두 섹션
- 상태별 시각 패널:
  1. **default 보드** — 3컬럼 풀 grid, To Do 3 / In Progress 2 / Done 5
  2. **드래그 중** — source card opacity 0.5, drop target column 하이라이트 (rgba(88,166,255,0.08))
  3. **카드 hover** — translateY(-2px) + 강한 shadow
  4. **빈 컬럼** — dashed empty hint
  5. **inline 추가 form** — textarea + 추가/취소 버튼
  6. **mobile preview** (< 640px) — 1컬럼 stack
- 외부 폰트/아이콘 CDN 0건 — system font + unicode/inline SVG 만

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.6 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 다크/라이트 색상 토큰 페어 (`--color-bg-canvas: #0d1117`, `--color-accent: #58a6ff`, `--color-text-primary: #c9d1d9` + 라이트 페어) | §2.1 색상 토큰 표, §7.4 `:root` + `[data-theme="light"]` 블록 | ✓ |
| 3컬럼 grid (gap 16px) | §4.1, §7.6 정량 표 (board grid gap 16px) | ✓ |
| 카드 border-radius 8px | §4.4, §7.6 정량 표 | ✓ |
| 카드 hover translateY(-2px) | §4.5, §7.6 정량 표 | ✓ |
| 드래그 opacity 0.5 | §4.6, §6.2, §7.6 정량 표 | ✓ |
| drop target `rgba(88,166,255,0.08)` | §2.1 (`--color-accent-soft`), §4.6, §7.6 정량 표 | ✓ |
| 모바일 1컬럼 stack (< 640px) | §4.11, §7.6 정량 표 | ✓ |
| 컬럼 헤더 uppercase + 카운터 배지 | §4.3, §3 (`--text-column-header` letter-spacing 0.06em + uppercase), §5.4, §5.5 | ✓ |
| 타이포 hierarchy 14/12/11px | §3 (card-title 14 / card-meta·column-header·caption 12 / count-badge·tag 11) | ✓ |
| 반응형 breakpoint <640 / >=960 | §4.11 표 (XS / mobile / tablet / desktop 4단계) | ✓ |
| 미세 인터랙션 fade-in/out 200ms | §2.4 (`--duration-base`), §6.3 keyframes, §7.6 정량 표 | ✓ |
| file:// 호환 (외부 폰트/아이콘 금지, system font, inline SVG/unicode) | §9.4 표 + §3 타이포 stack | ✓ |
| 디자인 명세 파일 `docs/design/kanban-BF-425.md` 신규 | 본 파일 자체 | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 13개 AC cross-reference, 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 파일 구조 + HTML 골격 + CSS 변수 + 15단계 구현 순서 + §7.6 정량 일치 표 + §7.7 DnD helper |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (notepad/timer/stopwatch), §9.2 복제 대상 (head/script/theme/`.btn` base/sr-only/ulid), §9.3 신규 — BF-197 회귀 정책 반영. 추가로 §9.4 file:// 호환 제약 명시 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 매핑 가이드 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 4건 |

추가 자체 점검:
- **다크 우선 + 라이트 페어 모두 정의**: §2.1 색상 토큰 표가 좌측 dark / 우측 light 로 한눈에 비교 가능 ✓
- **정량 일치 표**: §7.6 이 AC 의 모든 수치 항목 (16px gap / 8px radius / -2px translate / 0.5 opacity / rgba(88,166,255,0.08) / 200ms / breakpoint 640 / breakpoint 960) 을 표로 모두 cross-reference ✓
- **타이포 hierarchy 14/12/11**: §3 의 표가 3개 사이즈를 명확히 매핑 (14=card-title, 12=card-meta·column-header·caption, 11=count-badge·tag) ✓
- **uppercase + counter 배지**: §3 column-header 의 `text-transform: uppercase` + `letter-spacing: 0.06em` 명시. §4.3 에 dot + label + count 3구 헤더 구조 명시 ✓
- **DnD 흐름 완전성**: §6.2 dragstart → dragenter → dragover → dragleave → drop → dragend 6단계 + enter counter 패턴 + §7.7 helper. dragleave 자식 진출 false-positive 차단 ✓
- **file:// 호환**: §9.4 표가 외부 폰트 / 아이콘 / CSS CDN / JS CDN / 이미지 / fetch 6개 항목 모두 금지 명시 ✓
- **reduced-motion 가드**: §4.5, §6.3 keyframes 모두 `@media (prefers-reduced-motion: reduce)` 가드 명시 ✓
- **a11y aria-live 알림**: §6.4 카드 이동/추가/삭제 3가지 모두 SR 메시지 정의 ✓
- **비범위 명시**: §1.3 에 다중 보드 / 카드 상세 modal / 협업 sync / 검색 필터 / 외부 라이브러리 5개 explicit 제외 ✓
- **mobile DnD**: §4.11 에 long-press 활성 + 보조 "이동" 버튼 옵션 명시 (touch 정밀도 한계 인지) ✓

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 본 명세 §6 / §4 만 수정):

1. **localStorage 영속화 vs in-memory only** — 현재 default §6.6 은 in-memory + 데모 시드 (새로고침 시 초기화). localStorage 영속 채택 시 다중 탭 sync (storage event) 정책 필요. **권장: v1 은 in-memory** (단순성), 후속 Epic 에서 영속화.
2. **mobile (< 640px) 에서 DnD 보조 "이동" 버튼 채택 여부** — 현재 default §4.11 은 long-press DnD 만. 보조 버튼 채택 시 각 카드 우측에 ⋯ 메뉴 → "다른 컬럼으로 이동" 1depth 제공. **권장: v1 은 long-press 만** (UX 단순성), 사용성 테스트 후 결정.
3. **키보드 DnD (Space → 화살표 키 이동)** — 현재 default §6.4 는 v1 비범위 (v2 예정). 키보드 사용자는 카드 focus + Delete 만 가능. **권장: v1 비범위 유지** (a11y 완전성은 v2 별도 Epic). 단, screen reader 알림은 v1 부터 제공.
4. **DnD 중 placeholder slot 시각 가이드 채택 여부** — 현재 default §4.6 / §6.2 step 3 옵션 표시. 채택 시 mouse Y 위치 기반 4px height 가이드 line 삽입. **권장: 채택** — UX 명료성 ↑, 구현 비용 작음 (`computeDropIndex` 와 동일 로직 재사용).

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
