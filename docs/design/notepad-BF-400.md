# 메모장 SPA 디자인 명세 (BF-400)

> 관련 task: BF-401 (designer)
> mockup: [`docs/design/mockups/notepad-BF-400.html`](mockups/notepad-BF-400.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `index.html` (메모장 단일 페이지)
- 좌측 목록 + 우측 미리보기/편집의 2단 (split-view) 구조
- vanilla HTML/CSS/JS 기반 — 외부 UI 프레임워크 없음 (`shadcn/ui` 도입 전 단계이므로 vanilla 로 명세)

### 1.2 사용자 경험 목표
- **빠른 작성·탐색**: 키보드만으로 새 메모 생성·이동·삭제 가능
- **시각적 잡음 최소화**: 메모 작성 흐름을 방해하지 않는 차분한 톤
- **즉시 미리보기**: 좌측 목록 선택 시 우측에 본문이 즉시 렌더 (라우팅 지연 없음)
- **안전한 삭제**: 실수 방지를 위한 modal confirmation

### 1.3 비목표 (Out of Scope)
- 협업·실시간 동기화 (단일 사용자 로컬 SPA 가정)
- markdown 렌더 (plain text only — 후속 Epic)
- 폴더·태그 등 분류 기능

---

## 2. 디자인 토큰 (컬러 팔레트)

> 신규 프로젝트라 `design-tokens.json` 이 아직 없으므로 본 명세가 토큰의 **single source of truth**. dev-1 은 `:root` CSS custom property 로 그대로 노출.

### 2.1 색상 토큰

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드·sidebar·editor 표면 |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 좌측 목록 hover / 코드 inline |
| `--color-bg-selected` | `#E8EEF7` | `#1F2A3D` | 좌측 목록 선택 항목 |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 표면 구분선 |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | input·button outline |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 본문·제목 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | 메타·timestamp |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | placeholder·빈 상태 |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action·focus ring |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | 삭제 버튼·확인 modal |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 공간 토큰 (4px scale)

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
| `--radius-sm` | `4px` (input, badge) |
| `--radius-md` | `8px` (button, list item) |
| `--radius-lg` | `12px` (modal, card) |
| `--shadow-modal` | `0 12px 32px rgba(0,0,0,0.18)` |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

---

## 3. 타이포그래피

font-family system stack 사용 (외부 폰트 로드 없음 — 첫 페인트 지연 방지).

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | 토큰 |
|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `--text-h1` |
| heading-section | `16px` | `600` | `1.4` | `--text-h2` |
| list-title | `14px` | `500` | `1.4` | `--text-list` |
| body | `15px` | `400` | `1.65` | `--text-body` |
| caption / timestamp | `12px` | `400` | `1.4` | `--text-caption` |
| button | `14px` | `500` | `1` | `--text-button` |

본문 (`<textarea>`) 은 `--font-sans` 기준 — plain text 메모장이므로 mono 강요 X.

---

## 4. 레이아웃

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────┐
│ Topbar  · "메모장"  · [+ 새 메모]  · [🌙 토글]            │  56px
├────────────────────┬─────────────────────────────────────┤
│ Sidebar (목록)      │ Editor / Preview pane              │
│  280px (resizable   │  remaining width                   │
│   추후 — v1 fixed)  │                                    │
│                    │                                    │
│  [메모 항목 list]    │   <textarea> + footer              │
│                    │                                    │
└────────────────────┴─────────────────────────────────────┘
```

- 좌측 sidebar 폭: **고정 280px** (v1). drag-resize 는 후속 Epic.
- 우측 editor: 남은 폭 100% — 최대 본문 컨테이너 폭 `760px` 로 가운데 정렬 (가독성)
- editor 내부 padding: `--space-6` (상하) / `--space-7` (좌우)

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`
- 좌측: 제목 "메모장" (`--text-h1`)
- 우측: `[+ 새 메모]` primary button + `[🌙]` 다크 토글 ghost button
- 하단 `1px solid var(--color-border-default)` 구분선

### 4.3 Sidebar (좌측 목록)
- 폭 `280px`, 배경 `--color-bg-surface`, 우측 `1px solid --color-border-default`
- 상단 검색 input (`44px` 높이, padding `--space-3`) — placeholder "메모 검색…"
- 검색 input 아래 list scroll 영역 (flex:1, `overflow-y:auto`)
- 각 list item:
  - 높이 `auto` (최소 `64px`), padding `--space-3 --space-4`
  - 1행: title (`--text-list`, 1줄 ellipsis)
  - 2행: 본문 preview (`--text-caption`, `--color-text-secondary`, 1줄 ellipsis)
  - 3행: timestamp (`--text-caption`, `--color-text-muted`, 우측 정렬)
  - 항목 간 `1px solid --color-border-default` 구분선

### 4.4 Editor pane (우측)
- 상단: 메모 metadata bar — title input + 우측 `[🗑 삭제]` ghost button (`--color-danger` 텍스트)
- 본문: `<textarea>` — border 없음, `outline:none`, `resize:none`, `width:100%`, `min-height: calc(100vh - 200px)`
- 하단 status bar: 글자수 / 마지막 저장 시각 (`--text-caption`, `--color-text-muted`)

### 4.5 반응형 Breakpoint

| breakpoint | 동작 |
|---|---|
| `≥ 960px` | 위 2단 split view (desktop default) |
| `640px – 959px` | sidebar 폭 `240px` 로 축소, editor 본문 컨테이너 폭 자동 |
| `< 640px` | **1단 stack**. sidebar 가 전체 화면을 차지하는 첫 view. list item 탭하면 editor 가 full-screen overlay 로 push (`transform: translateX(0)`), 좌상단 `[← 목록]` back button 노출. topbar 의 `[+ 새 메모]` 는 우하단 floating FAB 으로 이동 (`56x56`, `position: fixed`, `bottom: 24px`, `right: 24px`) |

---

## 5. 컴포넌트 명세

### 5.1 `<Button>` (vanilla)
| variant | bg | text | border | hover |
|---|---|---|---|---|
| `primary` | `--color-accent` | `#FFFFFF` | none | `--color-accent-hover` |
| `ghost` | transparent | `--color-text-primary` | none | `--color-bg-subtle` |
| `danger-ghost` | transparent | `--color-danger` | none | `--color-bg-subtle` + text `--color-danger-hover` |
| `danger-solid` | `--color-danger` | `#FFFFFF` | none | `--color-danger-hover` |

공통: `height: 36px`, `padding: 0 var(--space-4)`, `border-radius: --radius-md`, `font: --text-button`, `cursor: pointer`. focus 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`.

### 5.2 `<ListItem>` (메모 항목)
props:
- `id: string`
- `title: string`
- `preview: string` (본문 앞 80자)
- `updatedAt: ISO string`
- `selected: boolean`

상태:
- default: `bg: --color-bg-surface`
- hover: `bg: --color-bg-subtle`
- selected: `bg: --color-bg-selected`, 좌측 3px `--color-accent` 띠
- keyboard-focused (selected 와 무관): `outline: 2px solid --color-focus-ring; outline-offset: -2px`

### 5.3 `<Editor>` (textarea wrapper)
props:
- `value: string`
- `onChange(value)`
- `placeholder: "메모를 입력하세요…"`

상태:
- empty (값 없음): placeholder 표시, autofocus 활성
- typing: 글자수 status bar 실시간 갱신
- saved: 우하단 status `"저장됨 · HH:mm"` (1.5s fade 후 `"마지막 저장 HH:mm"` 으로 변경)
- saving (debounce 중): `"저장 중…"` (`--color-text-secondary`)

### 5.4 `<EmptyState>` (메모 0개일 때)
- editor pane 중앙에 표시
- 아이콘 (📝 또는 inline svg) — `48px`
- 제목: "아직 메모가 없어요" (`--text-h2`)
- 부제: "좌측 상단의 + 새 메모 버튼으로 시작하세요" (`--text-body`, `--color-text-secondary`)
- 하단 `[+ 새 메모 만들기]` primary button (`Cmd/Ctrl + N` 단축키 hint 우측 `<kbd>` chip)

### 5.5 `<DeleteConfirmModal>` (삭제 확인)
props:
- `open: boolean`
- `noteTitle: string`
- `onConfirm()`, `onCancel()`

명세:
- overlay: 전체 화면 `rgba(0,0,0,0.45)` (light) / `rgba(0,0,0,0.65)` (dark), `backdrop-filter: blur(2px)`
- modal box: `width: 420px`, `padding: var(--space-5) var(--space-6) var(--space-6)`, `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-modal`
- 제목: "메모를 삭제할까요?" (`--text-h2`)
- 본문: `"${noteTitle}" 메모가 영구적으로 삭제되며 되돌릴 수 없습니다.` (`--text-body`, `--color-text-secondary`)
- footer: 우측 정렬, `[취소]` ghost + `[삭제]` danger-solid. gap `--space-3`
- focus trap: modal open 시 `[취소]` 에 autofocus (실수 방지 — destructive default 비선택)
- `Escape` 키로 cancel, `Enter` 는 focused 버튼만 실행 (자동 confirm X)

---

## 6. 상태·인터랙션 상세

### 6.1 빈 상태 (3가지)

| 위치 | 조건 | 표시 |
|---|---|---|
| Sidebar list | 메모 0건 | "메모가 없습니다" (`--text-caption`, `--color-text-muted`, 가운데 정렬, padding `--space-5`) |
| Sidebar list | 검색 결과 0건 | `"\"${query}\"\` 에 대한 결과 없음" |
| Editor pane | 선택된 메모 없음 + 메모 0건 | 5.4 EmptyState 컴포넌트 |
| Editor pane | 선택된 메모 없음 + 메모 ≥1건 | "왼쪽에서 메모를 선택하세요" (`--text-body`, `--color-text-secondary`) |

### 6.2 키보드 포커스 / 단축키

| 키 | 동작 |
|---|---|
| `Tab` / `Shift+Tab` | topbar → sidebar 검색 → list → editor 순환. focus-visible 시 `--color-focus-ring` outline 2px |
| `↑` / `↓` (sidebar list focus 시) | 이전/다음 메모로 selection 이동, editor 동기 갱신 |
| `Enter` (list item focus 시) | editor 로 focus 이동 |
| `Cmd/Ctrl + N` | 새 메모 생성 + editor autofocus |
| `Cmd/Ctrl + F` | sidebar 검색 input focus |
| `Cmd/Ctrl + S` | 즉시 저장 (debounce 무시) — toast 1.5s |
| `Cmd/Ctrl + Backspace` (editor focus 시) | 삭제 확인 modal open |
| `Escape` (modal open 시) | modal close (cancel 처리) |

### 6.3 저장 인터랙션
- typing 후 `800ms` debounce 자동 저장
- 저장 중: status bar `"저장 중…"`
- 저장 완료: `"저장됨 · 14:23"` (1.5s) → `"마지막 저장 14:23"` 으로 자연 fade
- 오프라인/실패 시: status bar `--color-danger` 텍스트 `"저장 실패 — 재시도"` + 클릭으로 재시도 (v1 은 localStorage 라 fail 거의 없음, 명세만 포함)

### 6.4 삭제 인터랙션 흐름
1. editor 의 `[🗑 삭제]` 또는 `Cmd/Ctrl + Backspace`
2. `<DeleteConfirmModal>` open, `[취소]` 자동 focus
3. `[삭제]` 클릭 → modal close → list 에서 해당 항목 제거 → editor pane 은 "왼쪽에서 메모를 선택하세요" 또는 EmptyState 로 전환
4. 직전 항목의 위/아래 형제 항목을 자동 selection 으로 이동 (UX 안전망 — 사용자가 다음 작업으로 자연스럽게 이어지도록)

### 6.5 다크 모드
- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- CSS 변수는 `[data-theme="dark"]` selector 로 재정의
- `localStorage["bf-theme"]` 에 저장, 첫 로드 시 OS `prefers-color-scheme` 따라 초기화

---

## 7. dev 구현 가이드 (dev-1 step-by-step)

> 본 가이드는 dev-1 (developer 페르소나) 가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조
```
/
├── index.html         # SPA entry (단일 페이지)
├── styles.css         # 본 명세의 토큰 + 레이아웃
├── script.js          # 상태/이벤트/localStorage 핸들러
└── docs/design/
    ├── notepad-BF-400.md   (본 문서)
    └── mockups/notepad-BF-400.html  (시각 mockup — 구현 참조용)
```

### 7.2 HTML 골격 (권장 클래스명)
```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>메모장</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">메모장</h1>
      <div class="topbar__actions">
        <button class="btn btn--primary" id="btn-new">+ 새 메모</button>
        <button class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>
    <main class="layout">
      <aside class="sidebar" aria-label="메모 목록">
        <input class="sidebar__search" type="search" placeholder="메모 검색…" id="search" />
        <ul class="list" id="note-list" role="listbox" aria-label="메모"></ul>
      </aside>
      <section class="editor" aria-label="편집기">
        <!-- EmptyState 또는 editor 내용 (JS 가 토글) -->
      </section>
    </main>
    <div class="modal" id="delete-modal" hidden role="dialog" aria-modal="true" aria-labelledby="del-title">
      <!-- 5.5 명세대로 -->
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

### 7.3 CSS 변수 정의 위치
`styles.css` 상단:
```css
:root {
  --color-bg-canvas: #FAFAF9;
  --color-bg-surface: #FFFFFF;
  /* … 2.1 표 전체 light 값 … */
  --space-1: 4px;
  /* … 2.2 표 전체 … */
  --radius-sm: 4px;
  /* … 2.3 표 전체 … */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-h2: 600 16px/1.4 var(--font-sans);
  --text-list: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
}
[data-theme="dark"] {
  --color-bg-canvas: #0F1115;
  /* … 2.1 표 전체 dark 값 … */
}
```

### 7.4 단계별 구현 순서 (권장)
1. **7.2 골격 HTML** 작성 + 빈 `styles.css` / `script.js`
2. **CSS 변수 + base reset** (`*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **Topbar + Layout 2단** (CSS Grid `grid-template-columns: 280px 1fr`)
4. **Sidebar list 정적 mock** — 더미 3개 항목으로 hover/selected 시각 확인 (mockup HTML 참고)
5. **`<Button>` variant** CSS 작성, focus-ring 적용
6. **EmptyState** + 메모 0건 케이스
7. **localStorage 상태** (`notes: Note[]`, `selectedId: string | null`) 도입 — JSON 직렬화
8. **`+ 새 메모`**, **list 클릭 → editor 표시**, **typing → debounce 저장**
9. **DeleteConfirmModal** + focus trap (`focusin` 이벤트 + 마지막 focusable 까지 wrap)
10. **키보드 단축키** (6.2 표 그대로 구현). `keydown` 글로벌 + modal 내부 분리
11. **검색** — sidebar input 의 `input` 이벤트, `title` 과 `preview` 에 대한 case-insensitive includes
12. **반응형** — `@media (max-width: 959px)` / `@media (max-width: 639px)` 두 단계. mobile 에서 sidebar/editor 토글은 body class `is-editor-open` 으로 제어
13. **다크 토글** — `<html data-theme>` 속성 + `localStorage["bf-theme"]`

### 7.5 a11y 체크
- modal 은 `role="dialog" aria-modal="true"`
- list 는 `role="listbox"`, list item 은 `role="option"` + `aria-selected`
- `[+ 새 메모]` 등 모든 button 에 명확한 label
- focus-visible 만 outline 표시 (마우스 클릭 시 outline 노출 X) — `:focus-visible` selector 사용

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<Button>` | `Button` (`variant: default/ghost/destructive`) |
| `<ListItem>` | vanilla — shadcn 미제공, list/scroll-area 조합 |
| `<DeleteConfirmModal>` | `AlertDialog` |
| `<Editor>` (textarea) | `Textarea` |
| 검색 input | `Input` |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 명시

- **기존 페이지 없음** (신규 프로젝트, 본 작업이 첫 페이지). 따라서 head/footer 공통 요소 복제 대상 없음.
- 후속 Epic 에서 다른 페이지 추가 시 본 `index.html` 의 다음 요소를 공통 골격으로 복제할 것:
  - `<meta charset>` / `<meta viewport>` / `<link rel="stylesheet" href="styles.css">`
  - `<header class="topbar">` 의 다크 토글 버튼 + `script.js` 의 `bf-theme` 초기화 로직
  - `data-theme` 속성을 `<html>` 에 부여하는 패턴

---

## 10. mockup 참조

[`docs/design/mockups/notepad-BF-400.html`](mockups/notepad-BF-400.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0)
- light/dark 두 패널을 나란히 보여 토큰 매핑 검증 가능
- DeleteConfirmModal 정적 표시 (open 상태로 그려진 별도 섹션)
- mobile (< 640px) 레이아웃 미리보기 섹션 포함

dev-1 은 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 토큰·구조가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 좌측 목록 / 우측 미리보기 와이어 | §4.1, §4.3, §4.4 | ✓ |
| 디자인 토큰 (색·여백) 매핑 | §2.1, §2.2, §2.3 | ✓ |
| 빈 상태 명세 | §5.4, §6.1 | ✓ |
| 저장 상태 명세 | §5.3, §6.3 | ✓ |
| 삭제 상태 명세 | §5.5, §6.4 | ✓ |
| 포커스 상태 명세 | §2.1 (focus-ring), §5.1/5.2 (각 컴포넌트 focus), §6.2 | ✓ |
| 반응형 breakpoint 명시 | §4.5 | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 모든 AC 가 명세 섹션과 cross-reference |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수 위치·13단계 구현 순서 포함 |
| 기존 요소 보존 명시 | ✓ | §9 — 신규 프로젝트라 보존 대상 없음을 explicit 명시 + 향후 공통 골격 가이드 포함 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 클래스 유지 가이드 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 2건 |

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다:

1. **accent 컬러 hue** — 현재 `#3563E9` (cool blue) 로 설정. 브랜드 가이드가 별도로 존재한다면 교체 필요. (대안: 보다 부드러운 `#4F6BED`, 또는 중성 톤 `#2D7A6F` teal)
2. **모바일 < 640px 의 editor full-screen 전환 방식** — 현재 명세는 `transform: translateX(0)` slide-in. 대안으로 list-only/editor-only 단순 toggle (애니메이션 없음) 도 가능. v1 성능 우선이면 후자 권장.

위 결정 없이도 dev-1 가 구현 진행 가능 (default 명세 채택). 운영자가 추후 변경 요청 시 §2.1, §4.5 만 수정.
