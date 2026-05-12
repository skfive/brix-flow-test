# 할일 SPA 디자인 명세 (BF-420)

> 관련 task: BF-421 (designer)
> mockup: [`docs/design/mockups/todo-BF-420.html`](mockups/todo-BF-420.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `todo/index.html` (또는 동급 URL 진입점 `/todo`)
- 단일 카드 중심 레이아웃: **상단 입력 영역 → 필터 탭 + 카운터 → 할일 리스트 → 일괄 완료삭제 버튼**
- vanilla HTML/CSS/JS 기반 (현 프로젝트 `shadcn/ui` 미도입 — `notepad-BF-400`·`timer-BF-405`·`stopwatch-BF-415` 와 토큰 시스템 공유)
- **file:// 더블클릭 실행을 1차 환경으로 지원** → §11 file:// 제약 가이드가 본 명세의 핵심 차별점

### 1.2 사용자 경험 목표
- **즉시 추가**: 진입 시 입력 input 자동 focus, `Enter` 한 번으로 항목 추가
- **상태 토글 명확**: checkbox 체크 ↔ 본문 strike-through 동시 변화, 0~150ms 마이크로 트랜지션
- **현재 상태 한 눈에**: 카운터 ("3개 남음") · 필터 (전체/진행/완료) 가 항상 시야
- **일괄 정리 안전**: 완료 항목 삭제는 modal 로 한 번 확인 (수 표시)
- **키보드 친화**: `Enter` 추가, `Backspace` (빈 입력 시) 마지막 항목 토글, `Esc` 입력 비우기·모달 닫기

### 1.3 비목표 (Out of Scope)
- **드래그 정렬** (재정렬은 후속 Epic — v1 은 추가 순 역순 고정)
- **카테고리·태그·우선순위** (v1 은 단일 리스트)
- **마감일 / 알림** (Notification API 도입 시 후속)
- **다중 디바이스 동기화** (localStorage 만 사용 — file:// 환경 의존)
- **마크다운·서식 렌더** (plain text only)
- **검색 입력** (v1 은 항목 수 50 이내 가정 — 필터만으로 충분)
- **편집 모드** (제목 in-place edit) — v1 은 추가/체크/삭제만. **후속 Epic 에서 doubleclick 또는 ✎ 아이콘 추가**

---

## 2. 디자인 토큰

> 본 명세는 `docs/design/notepad-BF-400.md §2` · `timer-BF-405.md §2` · `stopwatch-BF-415.md §2` 의 **토큰 시스템을 그대로 재사용** 합니다 (single source of truth 유지). 할일 SPA 에만 필요한 토큰만 추가/확장.

### 2.1 색상 토큰 (재사용 — 4 개 SPA 공유)

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#FAFAF9` | `#0F1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#FFFFFF` | `#171A21` | 카드 표면 (할일 카드) |
| `--color-bg-subtle` | `#F1F1EF` | `#1E222B` | 버튼 hover / 리스트 row hover / 입력 input bg |
| `--color-bg-selected` | `#E8EEF7` | `#1F2A3D` | 필터 탭 활성 배경 |
| `--color-border-default` | `#E5E5E2` | `#262B36` | 카드 / row 구분선 |
| `--color-border-strong` | `#D0D0CC` | `#3A4150` | input·button outline |
| `--color-text-primary` | `#1A1A19` | `#E8E8E4` | 항목 본문·카운터 |
| `--color-text-secondary` | `#6B6B66` | `#9A9A93` | 필터 비활성 라벨·hint |
| `--color-text-muted` | `#9A9A93` | `#6B6B66` | placeholder·빈 상태·완료된 항목 본문 |
| `--color-accent` | `#3563E9` | `#5B82F0` | primary action (추가)·checkbox 체크 색·focus ring |
| `--color-accent-hover` | `#2A4FC0` | `#7596F3` | accent hover/active |
| `--color-danger` | `#D14343` | `#E55858` | 삭제 버튼·완료삭제 modal confirm |
| `--color-danger-hover` | `#A83333` | `#EC7676` | danger hover |
| `--color-focus-ring` | `rgba(53,99,233,0.45)` | `rgba(91,130,240,0.55)` | 키보드 focus outline (2px) |

### 2.2 할일 SPA 전용 추가 토큰

| 토큰명 | Light HEX | Dark HEX | 용도 |
|---|---|---|---|
| `--color-todo-check-bg` | `#3563E9` | `#5B82F0` | checkbox 체크 시 배경 (=accent) |
| `--color-todo-check-border` | `#D0D0CC` | `#3A4150` | checkbox 미체크 border (=border-strong) |
| `--color-todo-done-text` | `#9A9A93` | `#6B6B66` | 완료 항목 본문 색 (=text-muted) |
| `--color-todo-done-strike` | `#9A9A93` | `#6B6B66` | strike-through 라인 색 (=text-muted) |
| `--color-filter-active-bg` | `#E8EEF7` | `#1F2A3D` | 필터 탭 활성 배경 (=bg-selected) |
| `--color-filter-active-text` | `#2A4FC0` | `#7596F3` | 필터 탭 활성 텍스트 (=accent-hover) |

> 신규 hue 추가 없이 기존 토큰을 alias 로 묶어 의미 단위로 노출. dev 는 컴포넌트 CSS 에서 alias 이름으로 참조하면 향후 토큰 교체 시 알기 쉬움.

### 2.3 공간 토큰 (재사용)

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자 (재사용)

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` (checkbox, filter chip) |
| `--radius-md` | `8px` (button, input, list row) |
| `--radius-lg` | `12px` (todo card, modal) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` (light) / `0 4px 16px rgba(0,0,0,0.32)` (dark) |
| `--shadow-modal` | `0 12px 32px rgba(0,0,0,0.18)` |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

> **system stack 만 사용** — Google Fonts / 외부 CDN 폰트 import 금지 (§11 file:// 제약). 실제 mockup HTML 도 system font 만.

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| heading-section (카운터·필터 영역) | `16px` | `600` | `1.4` | `0` | `--text-h2` |
| todo-input | `16px` | `400` | `1.5` | `0` | `--text-input` |
| todo-item | `15px` | `400` | `1.55` | `0` | `--text-item` |
| filter-tab | `14px` | `500` | `1` | `0` | `--text-filter` |
| counter | `14px` | `500` | `1.4` | `0` | `--text-counter` |
| label / hint | `14px` | `500` | `1.4` | `0` | `--text-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |
| button-primary-lg (추가 버튼) | `15px` | `600` | `1` | `0` | `--text-button-lg` |
| modal-title | `18px` | `600` | `1.3` | `0` | `--text-modal-title` |

본문은 `--font-sans`, 카운터 숫자 부분만 `font-variant-numeric: tabular-nums` 적용 — 항목 수 변동 시 가로폭 흔들림 방지.

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar · "할일"                                       [🌙]   │  56px
├──────────────────────────────────────────────────────────────┤
│                                                              │
│         ┌─────────────────────────────────────────┐          │
│         │                                         │          │
│         │  ┌─────────────────────────────┐ [+추가]│  input   │
│         │  │ 새 할일을 입력하세요…         │       │  영역    │
│         │  └─────────────────────────────┘       │          │
│         │                                         │          │
│         ├─────────────────────────────────────────┤          │
│         │ [전체 5] [진행 3] [완료 2]    3개 남음 │  필터 +   │
│         │                                         │  카운터  │
│         ├─────────────────────────────────────────┤          │
│         │ ☐  장보기                          🗑   │          │
│         │ ☐  운동 30분                       🗑   │  리스트  │
│         │ ☐  책 읽기                         🗑   │          │
│         │ ☑  세탁 (취소선)                   🗑   │          │
│         │ ☑  쓰레기 버리기 (취소선)          🗑   │          │
│         ├─────────────────────────────────────────┤          │
│         │                       [완료된 2개 삭제] │  footer   │
│         └─────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 640px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- todo card: `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-card`, `padding: 0` (내부 섹션이 padding 담당)
- 내부 섹션은 4 단으로 수직 분할 (input → filter+counter → list → footer), 각 섹션 사이 `1px solid --color-border-default` 구분선

### 4.2 Topbar
- 높이 `56px`, `padding: 0 var(--space-5)`, `background: --color-bg-surface`, 하단 `1px solid var(--color-border-default)`
- 좌측: 제목 "할일" (`--text-h1`)
- 우측: `[🌙 / ☀]` 다크 토글 ghost button (notepad / timer / stopwatch 와 동일 패턴, §9 참조)

### 4.3 입력 영역 (input row)

```
┌─────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────┐  ┌──────┐           │
│  │ 새 할일을 입력하세요…              │  │ +추가 │           │
│  └────────────────────────────────┘  └──────┘           │
└─────────────────────────────────────────────────────────┘
```

- 컨테이너: `padding: var(--space-5) var(--space-5)`, `display: flex`, `gap: var(--space-3)`, `align-items: center`
- `<input type="text">`:
  - `flex: 1`, `height: 44px`, `padding: 0 var(--space-4)`, `border: 1px solid --color-border-strong`, `border-radius: --radius-md`, `font: --text-input`, `background: --color-bg-surface`, `color: --color-text-primary`
  - placeholder: `"새 할일을 입력하세요…"` (`--color-text-muted`)
  - focus: `border-color: --color-accent`, `outline: 2px solid --color-focus-ring`, `outline-offset: 0` (border 와 ring 이 겹치도록)
  - 페이지 첫 진입 시 `autofocus` 활성
  - `maxlength="200"` (200 자 이상 입력 시 더 이상 추가되지 않음 — 시각 알림 X, 명세 §5.1)
- `[+ 추가]` 버튼:
  - `height: 44px`, `min-width: 72px`, `padding: 0 var(--space-4)`, `border-radius: --radius-md`, `font: --text-button-lg`, `background: --color-accent`, `color: white`, no border
  - 입력값 trim 후 비어 있으면 `disabled` (`opacity: 0.4`, `cursor: not-allowed`)
  - hover (enabled 시): `background: --color-accent-hover`
  - focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`

### 4.4 필터 + 카운터 영역

```
┌─────────────────────────────────────────────────────────┐
│  [전체 5] [진행 3] [완료 2]              3개 남음        │
└─────────────────────────────────────────────────────────┘
```

- 컨테이너: `padding: var(--space-3) var(--space-5)`, `display: flex`, `align-items: center`, `justify-content: space-between`, `gap: var(--space-3)`
- 좌측 필터 탭 그룹: `display: flex`, `gap: var(--space-2)`
- 우측 카운터: `font: --text-counter`, `color: --color-text-secondary`, `tabular-nums`

각 **filter chip** (탭 형태 버튼):
- `height: 32px`, `padding: 0 var(--space-3)`, `border-radius: --radius-sm`, `font: --text-filter`, no border, `background: transparent`, `color: --color-text-secondary`, `cursor: pointer`
- 라벨 형식: `"전체 5"` (라벨 + 공백 + 숫자) — 숫자는 tabular-nums, 0 일 때도 표시 (예: "완료 0")
- 활성 상태 (현재 선택): `background: --color-filter-active-bg`, `color: --color-filter-active-text`, `font-weight: 600`
- hover (비활성): `background: --color-bg-subtle`, `color: --color-text-primary`
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- `aria-pressed="true|false"` 로 토글 상태 알림

3 종: `전체` / `진행` / `완료`. default 활성 = `전체`.

카운터 텍스트 (우측):
- 진행 중 항목 수 기준. 형식: `"<n>개 남음"` (예: `"3개 남음"`, `"0개 남음"`)
- 전체 항목이 0 일 때는 hidden (빈 상태에서 의미 없음)
- 모든 항목이 완료일 때는 `"모두 완료! 🎉"` (이모지는 inline, 색은 `--color-accent`)

### 4.5 할일 리스트 영역

```
┌─────────────────────────────────────────────────────────┐
│  ☐  장보기                                          🗑    │  진행 row
├─────────────────────────────────────────────────────────┤
│  ☐  운동 30분                                       🗑    │
├─────────────────────────────────────────────────────────┤
│  ☑  세탁                                            🗑    │  완료 row (strike)
└─────────────────────────────────────────────────────────┘
```

- 컨테이너: `<ul>`, `list-style: none`, `padding: 0`, `margin: 0`
- 각 row (`<li>`): `display: grid`, `grid-template-columns: 32px 1fr 32px`, `column-gap: var(--space-3)`, `align-items: center`, `padding: var(--space-3) var(--space-5)`, `border-bottom: 1px solid --color-border-default` (마지막 row 는 border 없음)

#### 4.5.1 컬럼 1 — checkbox (체크박스)
- 컨테이너: `display: flex`, `align-items: center`, `justify-content: center`
- `<input type="checkbox">` 는 시각적으로 hide 하고 `<label>` 의 가상 박스로 표현 (또는 직접 `<button role="checkbox">` 패턴):
  - 박스: `width: 22px`, `height: 22px`, `border: 1.5px solid --color-todo-check-border`, `border-radius: --radius-sm`, `background: transparent`, `cursor: pointer`, transition `background 120ms ease, border-color 120ms ease`
  - 체크 시: `background: --color-todo-check-bg`, `border-color: --color-todo-check-bg`, 내부 `✓` 마크는 inline SVG 또는 CSS `::after` (white, `font-size: 14px`)
  - hover: 박스 `border-color: --color-accent`
  - focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
  - **inline SVG 만 사용** — 외부 아이콘 폰트 (Font Awesome 등) CDN 금지 (§11)

#### 4.5.2 컬럼 2 — 본문 텍스트
- `font: --text-item`, `color: --color-text-primary`
- 완료 상태 (`.is-done`): `color: --color-todo-done-text`, `text-decoration: line-through`, `text-decoration-color: --color-todo-done-strike`, `text-decoration-thickness: 1.5px`
- 본문 줄바꿈: `word-break: break-word`, `white-space: normal` (긴 문장 wrap)
- 본문 최대 표시 줄 수: 4 줄 (`-webkit-line-clamp: 4`, `display: -webkit-box`, `-webkit-box-orient: vertical`, `overflow: hidden`) — 4 줄 초과 시 ellipsis. 본 제약은 v1 만, 후속 Epic 에 펼치기 토글

#### 4.5.3 컬럼 3 — 삭제 버튼
- `<button class="btn btn--icon btn--icon-danger">` — `🗑` 아이콘만 (inline SVG 권장 — emoji 도 OK)
- `width: 32px`, `height: 32px`, `border-radius: --radius-sm`, `background: transparent`, `color: --color-text-secondary`, no border, `cursor: pointer`
- hover: `background: --color-bg-subtle`, `color: --color-danger`
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- 클릭 시: 해당 항목 즉시 삭제 (확인 modal 없음 — 단일 항목 삭제는 즉시성 우선. 완료 항목 일괄 삭제는 §4.6 모달).
- `aria-label="할일 삭제: <항목 제목>"` 동적

#### 4.5.4 row 상태별 시각

| 상태 | 본문 색 | strike | checkbox | row bg |
|---|---|---|---|---|
| `pending` (진행) | `--color-text-primary` | 없음 | empty box | `--color-bg-surface` |
| `done` (완료) | `--color-todo-done-text` | 있음 (1.5px) | filled + ✓ | `--color-bg-surface` |
| `hover` (마우스) | (위와 동일) | (위와 동일) | (위와 동일) | `--color-bg-subtle` |
| `keyboard-focused` (row 전체) | (위와 동일) | (위와 동일) | (위와 동일) | `--color-bg-subtle` + `outline: 2px solid --color-focus-ring; outline-offset: -2px` |

#### 4.5.5 빈 상태 (리스트 0 건)

리스트 컨테이너 자리에 EmptyState 표시 (§5.4).

#### 4.5.6 필터 적용 결과 0 건

- 필터 = `진행` 인데 모두 완료 → `"진행 중인 할일이 없습니다 — 모두 완료!"` (`--text-body`, `--color-text-secondary`, `padding: var(--space-6) var(--space-5)`, 가운데 정렬)
- 필터 = `완료` 인데 완료 0 → `"완료된 할일이 없습니다"` 동일 스타일
- 필터 = `전체` + 항목 0 → §5.4 EmptyState 컴포넌트

### 4.6 footer (완료된 N개 삭제 버튼)

```
┌─────────────────────────────────────────────────────────┐
│                                  [완료된 2개 삭제]        │
└─────────────────────────────────────────────────────────┘
```

- 컨테이너: `padding: var(--space-3) var(--space-5)`, `display: flex`, `justify-content: flex-end`
- 버튼: `btn--ghost-danger` variant
  - `height: 36px`, `padding: 0 var(--space-4)`, `background: transparent`, `color: --color-danger`, no border, `border-radius: --radius-md`, `font: --text-button`, `cursor: pointer`
  - hover: `background: --color-bg-subtle`, `color: --color-danger-hover`
  - focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- 라벨: `"완료된 <n>개 삭제"` (n = 완료 항목 수). 동적 갱신.
- 표시 조건: 완료 항목 ≥ 1 일 때만 enabled (완료 0 일 때 hidden — footer 영역도 hidden 처리하여 카드 시각 노이즈 최소화)
- 클릭 시: `<DeleteCompletedModal>` 열림 (§5.5)

### 4.7 빈 상태 (메인 EmptyState — 항목 0 건)

리스트 영역 + footer 가 모두 hidden 이고, 그 자리에 EmptyState 가 표시:

```
┌─────────────────────────────────────────────────────────┐
│  (input 영역 유지)                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                       📋                                │
│                                                         │
│              아직 할일이 없습니다                          │
│       위에서 새 할일을 추가해 보세요                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- 빈 상태 시 카운터 영역 hidden, 필터 탭은 hidden (전체 0, 진행 0, 완료 0 이므로 의미 없음)
- §5.4 컴포넌트 명세 참조

### 4.8 반응형 Breakpoint

| breakpoint | card 폭 | input row | filter+counter | list row padding | 키 동작 |
|---|---|---|---|---|---|
| **`≥ 960px`** (desktop) | `max-width: 640px`, 가운데 | input flex:1 + 버튼 우측 | 한 줄 (필터 좌·카운터 우) | `var(--space-3) var(--space-5)` | 모든 단축키 §6.2 표 그대로 |
| **`640px – 959px`** (tablet) | `max-width: 560px`, padding `--space-6 --space-4` | (동일) | (동일) | `var(--space-3) var(--space-4)` | (동일) |
| **`< 640px`** (mobile) | `max-width: 100%`, margin `var(--space-3)`, padding `--space-5 --space-3` | input row 그대로 (버튼은 아이콘 `+` 만, min-width 44px 로 축소) | **2 줄**: 1행 = 필터 탭 (스크롤 가능, `overflow-x: auto`, `white-space: nowrap`), 2행 = 카운터 (좌측 정렬) | `var(--space-3) var(--space-4)` | 키보드 단축키는 동일하게 동작 (소프트 키보드 사용 시 일부 제약은 §6.2 비고) |
| **`< 360px`** (XS) | (mobile 과 동일) | input 의 placeholder 단축: "할일 입력…" | filter chip padding 축소 `0 var(--space-2)` | (mobile 과 동일) | (mobile 과 동일) |

mobile 시 input 영역의 `[+ 추가]` 버튼:
- 라벨을 `+` 아이콘 1 자만 노출 (텍스트 "추가" 제거)
- aria-label="할일 추가" 유지 (스크린리더 가독성)
- `width: 44px`, `min-width: 44px`, `padding: 0`, 가운데 정렬

mobile 시 filter chip 가로 스크롤:
- 컨테이너: `overflow-x: auto`, `scrollbar-width: thin`, `-webkit-overflow-scrolling: touch`
- 각 chip 의 `flex-shrink: 0`
- 우측 fade mask (옵션 — `mask-image: linear-gradient(to left, transparent, black 24px)`) 로 더 있다는 시각 hint

---

## 5. 컴포넌트 명세

### 5.1 `<TodoInput>` (입력 + 추가)
props (상태 모델):
- `value: string`
- `onChange(value)`
- `onSubmit()` — 추가 트리거 (Enter 또는 `[+ 추가]` 클릭)
- `placeholder: "새 할일을 입력하세요…"`
- `maxLength: 200`

상태:
- empty (값 없음, 공백 trim 후 0): `[+ 추가]` 버튼 disabled
- typing: 버튼 enabled
- 추가 직후: input 값 자동 clear, focus 유지
- 200자 초과 시: input 의 `maxlength` 속성으로 브라우저가 입력 자체 차단 — 별도 alert 없음
- 공백만 입력 후 Enter: trim → 빈 문자열 → 추가 안 함 (silent no-op)

키보드:
- `Enter`: 추가 (submit)
- `Esc`: 입력값 clear (focus 유지)
- `Backspace` 가 input 값을 빈 문자열로 만든 직후 한 번 더 `Backspace`: **마지막(상단) 진행 중 항목의 완료 토글** (§6.2 — 입력 비어 있을 때만, 부주의 방지 위해 진행 중 항목만 대상)

### 5.2 `<FilterTabs>` (전체·진행·완료)
props:
- `current: "all" | "pending" | "done"`
- `counts: { all: number; pending: number; done: number }`
- `onChange(filter)`

명세:
- 3 개 chip 가로 정렬, default 활성 = `"all"`
- 라벨 + 숫자 inline: `전체 5` / `진행 3` / `완료 2`
- 활성 chip: `--color-filter-active-bg` + `--color-filter-active-text` + `font-weight: 600`
- 비활성 chip: transparent bg + `--color-text-secondary`
- `aria-pressed`, `role="tab"` (또는 단순 `<button>` + `aria-current="page"` — 본 명세는 후자 권장 — SPA 내 라우팅 아니므로 `aria-pressed` 가 더 정확)
- chip 간 `gap: var(--space-2)`
- 키보드: `←/→` 또는 `Tab` 으로 chip 순환 (브라우저 기본 `Tab` 사용 — `←/→` 보조 단축은 v1 미구현, 후속)

### 5.3 `<TodoItem>` (리스트 row)
props:
- `id: string` (ULID 또는 crypto.randomUUID — file:// 환경에서 crypto.randomUUID 사용 가능)
- `title: string`
- `done: boolean`
- `createdAt: ISO string`
- `onToggle(id)`, `onDelete(id)`

상태:
- pending / done: §4.5.4 표
- hover / keyboard-focused: §4.5.4 표

키보드:
- row 가 `tabindex="0"` (focus 가능)
- `Space` 또는 `Enter` (row focus 시): toggle (체크박스 click 과 동일)
- `Delete` 또는 `Backspace` (row focus 시): 해당 항목 즉시 삭제 (확인 X — 단일 항목 즉시성 우선). **단, focus 가 input 에 있을 때의 `Backspace` 와 충돌 방지 — row focus 인지 input focus 인지 명확 분리**
- `↑/↓` (row focus 시): 이전/다음 row 로 focus 이동 (skip 필터 hidden 항목)

aria:
- row: `role="listitem"` (브라우저 기본)
- checkbox 자리: `role="checkbox" aria-checked="true|false" aria-labelledby="todo-<id>-title"`
- 삭제 버튼: `aria-label="할일 삭제: <title>"`

### 5.4 `<EmptyState>` (전체 0 건)

- 카드 내부 리스트 영역 자리, footer 자리도 같이 hidden
- 상단 아이콘 (inline SVG 또는 이모지 `📋`) `font-size: 48px`, `color: --color-text-muted`
- 제목: `"아직 할일이 없습니다"` (`--text-h2`, `--color-text-primary`)
- 부제: `"위에서 새 할일을 추가해 보세요"` (`--text-body`, `--color-text-secondary`)
- 컨테이너: `padding: var(--space-7) var(--space-5)`, `display: flex`, `flex-direction: column`, `align-items: center`, `gap: var(--space-3)`, `text-align: center`

### 5.5 `<DeleteCompletedModal>` (완료된 N개 삭제 확인)
props:
- `open: boolean`
- `completedCount: number`
- `onConfirm()`, `onCancel()`

명세:
- overlay: 전체 화면 `rgba(0,0,0,0.45)` (light) / `rgba(0,0,0,0.65)` (dark), `backdrop-filter: blur(2px)`
- modal box: `width: 420px` (max-width 90vw), `padding: var(--space-5) var(--space-6) var(--space-6)`, `background: --color-bg-surface`, `border-radius: --radius-lg`, `box-shadow: --shadow-modal`
- 제목: `"완료된 할일을 삭제할까요?"` (`--text-modal-title`)
- 본문: `"완료된 ${completedCount}개 할일이 영구적으로 삭제되며 되돌릴 수 없습니다."` (`--text-body`, `--color-text-secondary`)
- footer: 우측 정렬, `[취소]` ghost button + `[삭제]` danger-solid button. `gap: var(--space-3)`
- focus trap: open 시 `[취소]` 에 autofocus (destructive default 비선택 — 실수 방지). `Tab` / `Shift+Tab` 으로 modal 내부 순환 (마지막 → 첫으로 wrap)
- `Escape` 키: cancel 동작 (modal close)
- `Enter` 키: focused 버튼만 실행 (자동 confirm 안 됨)
- overlay 클릭: cancel 동작

variant `[취소]` ghost:
- `height: 36px`, `padding: 0 var(--space-4)`, `background: transparent`, `color: --color-text-primary`, no border, `border-radius: --radius-md`, hover `background: --color-bg-subtle`

variant `[삭제]` danger-solid:
- `height: 36px`, `padding: 0 var(--space-4)`, `background: --color-danger`, `color: white`, no border, `border-radius: --radius-md`, hover `background: --color-danger-hover`

### 5.6 `<Counter>` (n개 남음)
props:
- `pendingCount: number`
- `totalCount: number`

표시 로직:
- `totalCount === 0`: hidden
- `pendingCount === 0` && `totalCount > 0`: `"모두 완료! 🎉"` (색 `--color-accent`)
- 그 외: `"${pendingCount}개 남음"` (색 `--color-text-secondary`)

`font: --text-counter`, `tabular-nums`.

---

## 6. 상태·인터랙션 상세

### 6.1 상태 모델 (in-memory + localStorage 미러)

```
state = {
  todos: Array<{ id: string; title: string; done: boolean; createdAt: ISO string }>,
  filter: "all" | "pending" | "done",
  pendingDeleteModalOpen: boolean,
  inputValue: string,
}
```

저장:
- `localStorage["bf-todos"] = JSON.stringify(state.todos)` (filter / input / modal 은 휘발 — 새로고침 시 초기화)
- `localStorage["bf-theme"]` 는 다른 SPA 와 공유 (다크 토글 일관성)
- 모든 mutation (추가·토글·삭제·완료삭제) 후 즉시 동기 저장 (debounce 없음 — 작은 데이터)
- 첫 로드 시: localStorage 읽기 → state 복원 → render. localStorage 없으면 빈 배열로 초기화.
- **JSON.parse 실패 케이스**: try/catch 로 fallback to `[]`, 콘솔 warn. v1 은 corrupted 데이터 복구 UI 없음 (후속 Epic).

### 6.2 키보드 포커스 / 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Tab` / `Shift+Tab` | topbar 다크 토글 → input → `[+ 추가]` → 필터 chip 1 → chip 2 → chip 3 → list row 1 (checkbox → text → 삭제 버튼 순) → row 2 → … → footer `[완료된 N개 삭제]` 순환 | 전역. focus-visible 시 `--color-focus-ring` outline 2px |
| `Enter` (input focus 시) | 할일 추가. input clear 후 focus 유지 | input.value.trim() !== "" 일 때만 |
| `Esc` (input focus 시) | input value clear | 항상 |
| `Backspace` (input focus + value === "" 시) | 마지막 (가장 최근 추가된) **진행 중** 항목의 완료 토글 (UX 단축) | 입력 비어 있고 진행 항목 ≥ 1 일 때만 |
| `Space` / `Enter` (row focus 또는 checkbox focus 시) | 해당 항목 toggle | 브라우저 기본 동작 + custom checkbox 도 동일 |
| `Delete` (row focus 시) | 해당 항목 즉시 삭제 | row 가 focus (input 이 아니라) 일 때만 |
| `Backspace` (row focus 시) | 해당 항목 즉시 삭제 | input 이 아닐 때. row 가 focus 인지 명확 판별 필요 (`document.activeElement` 가 li 또는 그 내부 button) |
| `↑/↓` (row focus 시) | 이전/다음 row 로 focus 이동 (현재 필터 적용된 목록 내에서) | row 가 focus 일 때만 |
| `1` / `2` / `3` (전역, input focus 외) | 필터 전환: 1 = 전체, 2 = 진행, 3 = 완료 | input·modal 외 focus 또는 body focus |
| `Esc` (modal open 시) | modal close (cancel) | modal 우선 |

**focus-visible 표시**: 모든 interactive 요소는 `:focus-visible` 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. 마우스 클릭 focus 에서는 outline 노출 X.

**충돌 가드**:
- `Backspace` 의 다중 의미는 `document.activeElement` 로 판별:
  - input focus + value 비어 있음 → "마지막 진행 항목 토글" 단축
  - row 또는 row 내부 button focus → "해당 항목 삭제"
  - 그 외 → no-op
- `Esc` 우선순위: modal open > input clear

**소프트 키보드 (mobile)**:
- `Enter` (Return) 키만 동작. `Esc` / `Backspace` 의 입력-비어있음-단축은 모바일 IME 거동상 불확실 → mobile 에서는 명시적으로 UI 버튼만 사용하도록 안내 (mockup hint 라인에 표기 X — 데스크탑 hint 만)

### 6.3 추가 인터랙션 흐름

1. 사용자가 input 에 텍스트 입력 → `[+ 추가]` 버튼 enable
2. `Enter` 또는 버튼 클릭 → `onSubmit()` 호출
3. `state.todos.unshift({ id: crypto.randomUUID(), title: trimmed, done: false, createdAt: new Date().toISOString() })` (최신이 상단)
4. `localStorage` 동기 저장
5. input value clear, focus 유지
6. 리스트 상단에 새 row prepend 애니메이션 (`fadeInDown 150ms ease`, `prefers-reduced-motion: reduce` 시 비활성)
7. 필터 `완료` 가 active 였다면 새 항목이 시야에서 안 보임 — 별도 알림 X (UX 정책: 사용자가 필터 인지하고 있음 전제). 후속 Epic 에서 toast 고려.

### 6.4 toggle 인터랙션 흐름

1. checkbox 클릭 또는 row focus + Space
2. `state.todos[i].done` 반전
3. localStorage 동기 저장
4. row 전체에 `.is-done` 클래스 토글 → strike-through 트랜지션 (text-decoration 150ms ease)
5. 카운터·필터 chip 의 숫자 갱신
6. 모두 완료 상태 진입 시 카운터가 `"모두 완료! 🎉"` 로 자연 전환

### 6.5 삭제 인터랙션 흐름 (단일 항목)

1. row 의 `🗑` 버튼 클릭 또는 row focus + Delete/Backspace
2. 확인 modal **없음**. 즉시 `state.todos.splice(i, 1)` + localStorage 저장
3. row DOM fade-out 트랜지션 (150ms `opacity: 0` + `height: 0`, `prefers-reduced-motion` 가드)
4. focus 는 직전 row 로 이동 (없으면 input 으로). 키보드 사용자가 다음 작업 가능하도록.

> 단일 항목 즉시 삭제 정책 사유: (a) 항목 1 개 실수 시 재추가 비용 낮음, (b) UX 마찰 최소화. 후속 Epic 에서 undo toast (1.5s 노출) 고려.

### 6.6 완료 항목 일괄 삭제 인터랙션 흐름

1. footer `[완료된 N개 삭제]` 버튼 클릭
2. `<DeleteCompletedModal>` open, `[취소]` 자동 focus
3. `[삭제]` 클릭 또는 Enter → `state.todos = state.todos.filter(t => !t.done)` + localStorage 저장
4. modal close, focus 는 input 으로 복귀 (footer 가 hidden 될 가능성 — focus 잃지 않도록 명시적 이동)
5. 완료 항목이 0 이 되므로 footer 자체 hidden

### 6.7 필터 전환 인터랙션 흐름

1. 필터 chip 클릭 또는 단축키 `1` / `2` / `3`
2. `state.filter` 업데이트 (localStorage 저장 X — 휘발)
3. 리스트 re-render: `state.todos.filter(predicate)` 결과만 노출
4. 필터 결과 0 건: §4.5.6 빈 상태 메시지
5. focus 는 클릭된 chip 에 유지 (키보드 단축키 사용 시 chip 으로 자동 이동 X — body focus 유지)

### 6.8 다크 모드

- topbar `[🌙/☀]` 토글로 `<html data-theme="dark|light">` 속성 변경
- `localStorage["bf-theme"]` 키 공유 (notepad / timer / stopwatch SPA 와 동일)
- 첫 로드 시 OS `prefers-color-scheme` 따라 초기화 (저장값 우선)

### 6.9 첫 로드 / 진입 인터랙션

- localStorage 읽기 → todos 복원
- 빈 배열이면 §4.7 EmptyState 표시, 그 외 리스트 렌더
- input 에 autofocus (mobile 제외 — mobile 은 자동 soft keyboard 열림이 침습적이므로 autofocus 비활성. `<= 639px` 미디어 쿼리 + JS 분기)
- 다크 토글: localStorage `bf-theme` 또는 OS prefer

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장이며 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)

```
/
├── todo/
│   ├── index.html       # 할일 SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃
│   ├── main.js          # 상태·이벤트·렌더 — type=module 사용 금지 (§11)
│   └── storage.js       # (옵션) localStorage 래퍼. main.js 와 단순 concat 또는 별도 <script>
├── notepad/             # 기존 메모장 SPA (보존)
├── timer/               # 기존 타이머 SPA (보존)
├── stopwatch/           # 기존 스톱워치 SPA (보존)
└── docs/design/
    ├── todo-BF-420.md             (본 문서)
    └── mockups/todo-BF-420.html   (시각 mockup)
```

**중요한 차이점 (vs notepad/timer/stopwatch)**:
- 기존 SPA 3 종은 `<script type="module" src="main.js">` 사용. **todo SPA 는 type=module 금지** (§11 — file:// CORS 안전 가이드).
- 따라서 `import` / `export` 도 사용 불가. `storage.js` 같은 보조 파일은 (a) main.js 에 통합하거나, (b) 별도 `<script src="storage.js">` 태그로 먼저 로드 후 전역 함수 참조 (window 객체 또는 IIFE).

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>할일</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title">할일</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <section class="todo-card" aria-label="할일 목록">
        <!-- 입력 영역 -->
        <div class="todo-card__input">
          <form id="todo-form" autocomplete="off">
            <input
              type="text"
              id="todo-input"
              class="input"
              maxlength="200"
              placeholder="새 할일을 입력하세요…"
              aria-label="새 할일 입력"
              autofocus
            />
            <button type="submit" id="btn-add" class="btn btn--primary-lg" disabled>+ 추가</button>
          </form>
        </div>

        <!-- 필터 + 카운터 -->
        <div class="todo-card__filter">
          <div class="filter-tabs" role="group" aria-label="필터">
            <button type="button" class="filter-chip is-active" id="filter-all" aria-pressed="true">
              전체 <span class="filter-chip__count" id="count-all">0</span>
            </button>
            <button type="button" class="filter-chip" id="filter-pending" aria-pressed="false">
              진행 <span class="filter-chip__count" id="count-pending">0</span>
            </button>
            <button type="button" class="filter-chip" id="filter-done" aria-pressed="false">
              완료 <span class="filter-chip__count" id="count-done">0</span>
            </button>
          </div>
          <div class="counter" id="counter" aria-live="polite">0개 남음</div>
        </div>

        <!-- 리스트 -->
        <ul class="todo-list" id="todo-list" aria-label="할일 목록"></ul>

        <!-- 빈 상태 (리스트 0 건) -->
        <div class="empty-state" id="empty-state" hidden>
          <div class="empty-state__icon" aria-hidden="true">📋</div>
          <h2 class="empty-state__title">아직 할일이 없습니다</h2>
          <p class="empty-state__desc">위에서 새 할일을 추가해 보세요</p>
        </div>

        <!-- footer -->
        <div class="todo-card__footer" id="todo-footer" hidden>
          <button type="button" class="btn btn--ghost-danger" id="btn-clear-completed">
            완료된 <span id="completed-count">0</span>개 삭제
          </button>
        </div>
      </section>

      <!-- modal -->
      <div class="modal-overlay" id="modal-overlay" hidden></div>
      <div
        class="modal"
        id="delete-completed-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        hidden
      >
        <h2 class="modal__title" id="modal-title">완료된 할일을 삭제할까요?</h2>
        <p class="modal__body" id="modal-body">완료된 0개 할일이 영구적으로 삭제되며 되돌릴 수 없습니다.</p>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" id="btn-cancel">취소</button>
          <button type="button" class="btn btn--danger-solid" id="btn-confirm-delete">삭제</button>
        </div>
      </div>

      <!-- SR-only 알림 -->
      <div id="sr-announce" class="sr-only" role="status" aria-live="polite"></div>
    </main>

    <!-- file:// 환경 호환: type=module 금지, src 만 (§11) -->
    <script src="main.js"></script>
  </body>
</html>
```

**렌더 row 템플릿** (JS 가 `<li>` 동적 생성):
```html
<li class="todo-item" data-id="<id>" tabindex="0" role="listitem">
  <button
    type="button"
    class="todo-item__check"
    role="checkbox"
    aria-checked="false"
    aria-labelledby="title-<id>"
  >
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
      <path d="M3 8 L7 12 L13 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  <span class="todo-item__title" id="title-<id>"><텍스트></span>
  <button type="button" class="todo-item__delete" aria-label="할일 삭제: <텍스트>">
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
      <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  </button>
</li>
```

### 7.3 CSS 변수 정의 위치

`todo/styles.css` 상단에 `:root` 블록 — **timer / stopwatch styles.css 의 토큰 블록을 그대로 복사** + 본 명세의 §2.2 (할일 전용 alias) · §3 type 토큰 추가:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color tokens — 4 개 SPA 공유 (§2.1) */
  --color-bg-canvas: #FAFAF9;
  --color-bg-surface: #FFFFFF;
  --color-bg-subtle: #F1F1EF;
  --color-bg-selected: #E8EEF7;
  --color-border-default: #E5E5E2;
  --color-border-strong: #D0D0CC;
  --color-text-primary: #1A1A19;
  --color-text-secondary: #6B6B66;
  --color-text-muted: #9A9A93;
  --color-accent: #3563E9;
  --color-accent-hover: #2A4FC0;
  --color-danger: #D14343;
  --color-danger-hover: #A83333;
  --color-focus-ring: rgba(53,99,233,0.45);

  /* todo 전용 alias (§2.2) */
  --color-todo-check-bg: var(--color-accent);
  --color-todo-check-border: var(--color-border-strong);
  --color-todo-done-text: var(--color-text-muted);
  --color-todo-done-strike: var(--color-text-muted);
  --color-filter-active-bg: var(--color-bg-selected);
  --color-filter-active-text: var(--color-accent-hover);

  /* spacing / radius / shadow (§2.3, §2.4) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-card: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-modal: 0 12px 32px rgba(0,0,0,0.18);
  --shadow-popover: 0 4px 12px rgba(0,0,0,0.10);

  /* typography (§3) */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-h2: 600 16px/1.4 var(--font-sans);
  --text-input: 400 16px/1.5 var(--font-sans);
  --text-item: 400 15px/1.55 var(--font-sans);
  --text-filter: 500 14px/1 var(--font-sans);
  --text-counter: 500 14px/1.4 var(--font-sans);
  --text-label: 500 14px/1.4 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
  --text-button-lg: 600 15px/1 var(--font-sans);
  --text-modal-title: 600 18px/1.3 var(--font-sans);
}
[data-theme="dark"] {
  --color-bg-canvas: #0F1115;
  --color-bg-surface: #171A21;
  --color-bg-subtle: #1E222B;
  --color-bg-selected: #1F2A3D;
  --color-border-default: #262B36;
  --color-border-strong: #3A4150;
  --color-text-primary: #E8E8E4;
  --color-text-secondary: #9A9A93;
  --color-text-muted: #6B6B66;
  --color-accent: #5B82F0;
  --color-accent-hover: #7596F3;
  --color-danger: #E55858;
  --color-danger-hover: #EC7676;
  --color-focus-ring: rgba(91,130,240,0.55);
  --shadow-card: 0 4px 16px rgba(0,0,0,0.32);
}
```

### 7.4 단계별 구현 순서 (권장)

1. **7.2 골격 HTML 작성** + 빈 `styles.css` / `main.js`. **`<script>` 태그는 `type` 속성 없이 src 만** (§11)
2. **CSS 변수 + base reset** (`*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **Topbar** (timer / stopwatch 와 동일 패턴, 다크 토글만 단독)
4. **Page + card 컨테이너** (`max-width: 640px`, `padding`, `box-shadow`, `border-radius`)
5. **입력 영역** (`form#todo-form` + `input#todo-input` + `button#btn-add`). disabled 토글 (input.value.trim() === "" 검사)
6. **필터 + 카운터 영역** (3 chip 정적 → 활성 클래스 토글)
7. **state 모델 + localStorage 래퍼**: `loadTodos()`, `saveTodos()`, `addTodo(title)`, `toggleTodo(id)`, `deleteTodo(id)`, `clearCompleted()`. **import/export 금지 — main.js 단일 파일 또는 별도 `<script src="storage.js">` 후 전역 함수**
8. **렌더 함수**: `render(state)` → list, counter, filter chip, footer, empty-state 모두 갱신. 단순 innerHTML 재구성 권장 (v1 항목 50 이하 가정 — 성능 우선보다 단순함 우선)
9. **이벤트 바인딩**: form submit → addTodo. 필터 click → setFilter. event delegation 으로 list 의 checkbox / 삭제 버튼 처리
10. **DeleteCompletedModal**: footer 버튼 → open. focus trap (`focusin` 이벤트 + 마지막 focusable wrap). Esc / overlay click → cancel
11. **키보드 단축키** (§6.2 표): `keydown` 전역. activeElement 로 input/row/modal 분기
12. **반응형**: `@media (max-width: 959px)` / `@media (max-width: 639px)` / `@media (max-width: 359px)`. mobile 시 `[+ 추가]` 라벨 → `+` 만, autofocus 비활성
13. **다크 토글**: `localStorage["bf-theme"]` 공유, `<html data-theme>` 토글. timer / stopwatch / notepad 의 토글 로직 그대로 복제 (또는 별도 `theme.js` 로 분리 — 단, **import 금지** → 별도 `<script src="theme.js">` 태그로 main.js 보다 먼저 로드)

### 7.5 a11y 체크

- todo-list: `<ul role="list" aria-label="할일 목록">` (브라우저 기본 role 보강)
- todo-item: `<li role="listitem" tabindex="0">`
- checkbox: `<button role="checkbox" aria-checked aria-labelledby>` — native `<input type="checkbox">` 도 OK 이지만 커스텀 시각화 시 button 패턴 권장
- 삭제 버튼: `aria-label="할일 삭제: <title>"` 동적
- 카운터: `aria-live="polite"` (수 변화 시 SR 알림)
- modal: `role="dialog" aria-modal="true" aria-labelledby="modal-title"`
- focus-visible only outline
- `prefers-reduced-motion: reduce` 시 row prepend fade-in / row remove fade-out 비활성
- sr-only 패턴: `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;`

### 7.6 정량 일치 기준 (구현 검증)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop) | 토큰 |
|---|---|---|
| page max-width | `640px` | hardcoded |
| page padding | `48px 24px` | `--space-7 --space-5` |
| todo card border-radius | `12px` | `--radius-lg` |
| todo card shadow | `0 4px 16px rgba(0,0,0,0.06)` | `--shadow-card` |
| input row padding | `24px 24px` | `--space-5 --space-5` |
| input row gap (input ↔ button) | `12px` | `--space-3` |
| input height | `44px` | hardcoded |
| input padding | `0 16px` | `--space-4` |
| input border | `1px solid` | `--color-border-strong` |
| input font | `400 16px/1.5` | `--text-input` |
| `[+ 추가]` button height | `44px` | hardcoded |
| `[+ 추가]` button min-width | `72px` | hardcoded |
| `[+ 추가]` button padding | `0 16px` | `--space-4` |
| `[+ 추가]` button font | `600 15px/1` | `--text-button-lg` |
| filter+counter row padding | `12px 24px` | `--space-3 --space-5` |
| filter chip height | `32px` | hardcoded |
| filter chip padding | `0 12px` | `--space-3` |
| filter chip font | `500 14px/1` | `--text-filter` |
| filter chip border-radius | `4px` | `--radius-sm` |
| filter chips gap | `8px` | `--space-2` |
| list row grid | `32px 1fr 32px` | hardcoded |
| list row padding | `12px 24px` | `--space-3 --space-5` |
| list row gap | `12px` | `--space-3` |
| list row font | `400 15px/1.55` | `--text-item` |
| list row border-bottom | `1px solid` | `--color-border-default` |
| checkbox box | `22px × 22px`, `1.5px border` | hardcoded |
| checkbox border-radius | `4px` | `--radius-sm` |
| 삭제 버튼 | `32px × 32px` | hardcoded |
| footer padding | `12px 24px` | `--space-3 --space-5` |
| footer button height | `36px` | hardcoded |
| footer button font | `500 14px/1` | `--text-button` |
| modal width | `420px` (max 90vw) | hardcoded |
| modal padding | `24px 32px 32px` | `--space-5 --space-6 --space-6` |
| modal border-radius | `12px` | `--radius-lg` |
| modal shadow | `0 12px 32px rgba(0,0,0,0.18)` | `--shadow-modal` |
| modal title font | `600 18px/1.3` | `--text-modal-title` |
| modal body font | `400 15px/1.65` | `--text-body` |
| modal footer gap | `12px` | `--space-3` |
| focus-ring outline | `2px solid` + `offset 2px` | `--color-focus-ring` |

### 7.7 ID 생성 helper

```js
function newTodoId() {
  // crypto.randomUUID() 는 file:// + secure context 에서도 동작 (modern browser)
  // fallback: Math.random + Date.now (UUID 형식 아니지만 충돌 가능성 낮음)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}
```

> file:// 에서 `crypto.randomUUID()` 가 정상 동작하는지 dev-1 가 1차 확인. 일부 구형 브라우저는 secure context 가 아니라고 판단할 수 있음 → fallback 으로 안전성 확보.

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 가이드:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<TodoInput>` | `Input` + `Button` (variant `default`, size `default`) |
| `<FilterTabs>` | `ToggleGroup` (`type: single`) — chip 형태로 styling |
| `<TodoItem>` checkbox | `Checkbox` |
| `<TodoItem>` row | vanilla `<li>` — `Table` 도입 시 `TableRow` |
| `<TodoItem>` 삭제 버튼 | `Button` (`variant: ghost`, `size: icon`) |
| `<EmptyState>` | vanilla — shadcn 미제공 (커스텀 패턴) |
| `<DeleteCompletedModal>` | `AlertDialog` |
| `<Counter>` | vanilla `<span>` |
| 다크 토글 | vanilla (notepad / timer / stopwatch 와 공유) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`todo/`) 입니다. 운영자 정책 (BF-197 회귀 반영) 에 따라 기존 페이지의 head/footer 공통 요소를 복제 대상으로 명시합니다.

### 9.1 보존 (건드리지 마라)

- `notepad/index.html`, `notepad/styles.css`, `notepad/main.js`, `notepad/storage.js`, `notepad/ulid.js` — 본 작업과 무관, 변경 금지
- `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/storage.js`, `timer/timer.js` — 본 작업과 무관, 변경 금지
- `stopwatch/index.html`, `stopwatch/styles.css`, `stopwatch/main.js`, `stopwatch/stopwatch.js`, `stopwatch/storage.js` — 본 작업과 무관, 변경 금지
- 기존 페이지들의 라우팅·링크 (만약 있다면)

### 9.2 신규 `todo/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | timer/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | timer/index.html | **복제** | 반응형 정상 동작 전제 |
| `<html lang="ko" data-theme="light">` 패턴 | timer/index.html | **복제** | data-theme 속성 토큰 시스템 의존 |
| `<link rel="stylesheet" href="styles.css">` | timer/index.html | **복제 + 경로 수정** | `todo/styles.css` 로 향함 |
| `<header class="topbar">` 구조 | timer/index.html | **복제 (라벨 변경)** | 제목만 "타이머" → "할일", `[🌙]` 다크 토글 유지. timer 의 입력 영역은 미포함 |
| `:root` CSS 변수 블록 | timer/styles.css | **복제** + §2.2 alias 추가 | single source of truth: 본 명세 |
| `bf-theme` localStorage 초기화 로직 | timer/main.js | **복제 (단, import 사용 X — file:// 호환)** | timer 가 type=module 이라 import 형태일 가능성. **todo 는 동일 코드를 inline 또는 별도 `<script src>` 로 다시 작성**. 코드 자체는 동일 |
| reset / base body 스타일 (`*{box-sizing}`, `body{margin:0;...}`) | timer/styles.css | **복제** | 모든 페이지 공통 |
| `.btn` 기본 스타일 (`.btn`, `.btn--ghost`) | timer/styles.css | **복제** | timer 가 정의한 ghost button 패턴 재사용 |

### 9.3 추가/수정해야 할 부분 (todo 전용)

- todo card / input row / filter+counter / list row / footer / modal 마크업 (§7.2)
- todo 전용 alias 토큰 (§2.2)
- 할일 전용 typography 토큰 (§3 — `--text-input`, `--text-item`, `--text-filter`, `--text-counter`, `--text-button-lg`, `--text-modal-title`)
- 상태 모델 + localStorage `bf-todos` 키 (§6.1)
- 필터 / 카운터 / 추가 / 토글 / 삭제 / 완료삭제 인터랙션 (§6.3 ~ 6.6)
- 키보드 단축키 (§6.2)
- DeleteCompletedModal (§5.5)
- **§11 file:// 제약 마크업 패턴** (`<script src>` non-module, import/export 금지, fetch 금지, CDN 금지)

### 9.4 핵심 차이점 정리 (혼동 차단)

| 항목 | 기존 timer / stopwatch / notepad | 신규 todo |
|---|---|---|
| `<script>` 태그 | `<script type="module" src="main.js">` | **`<script src="main.js">`** (type 속성 없음) |
| 모듈 시스템 | `import` / `export` 사용 가능 | **금지** — 단일 파일 또는 전역 함수 |
| 데이터 fetch | (현재 미사용) | **금지 명시** — localStorage 만 |
| 외부 폰트 / 아이콘 | system stack | system stack (동일) |
| localStorage 키 | `bf-theme` (공유) + 각 SPA 전용 키 | `bf-theme` (공유) + `bf-todos` |

> **혼동 차단**: 위 §9.2 복제 항목은 dev 가 그대로 갖다 붙이되, **§9.4 의 차이 4 가지** 는 todo 에서 반드시 수정 / 재작성. 코드 리뷰 시 reviewer 는 §9.2 복제 누락과 §9.4 차이 위반 (예: type=module 잔존) 모두 확인.

---

## 10. mockup 참조

[`docs/design/mockups/todo-BF-420.html`](mockups/todo-BF-420.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0 — file:// 더블클릭 실행 가능)
- light / dark 두 패널을 나란히 표시 → 토큰 매핑 시각 검증
- 4 가지 상태 패널 동시 표시:
  1. **빈 상태 (empty)** — 입력 영역 + EmptyState
  2. **혼합 상태 (mixed)** — 진행 3 / 완료 2, 필터 = `전체`
  3. **진행 필터 적용** — 진행 3 만 노출, 필터 = `진행` 활성
  4. **삭제 modal open** — 완료 2 개 삭제 confirm modal
- mobile (< 640px) 레이아웃 미리보기 섹션 별도 포함
- focus-visible outline 시각 (input·chip·row 각 1 샷 정적 표현)

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.6 정량 일치 표가 source of truth.

---

## 11. file:// CORS 안전 가이드 (디자이너 권고)

> **본 섹션은 BF-420 epic 의 핵심 차별점**. 디자이너 명세 단계에서 마크업/구조 제약을 explicit 으로 명시하여 dev-1 가 의도치 않게 file:// 환경에서 깨지는 패턴을 도입하지 않도록 가드.

### 11.1 왜 file:// 호환이 필요한가

- 운영자가 `todo/index.html` 을 **로컬 파일 시스템에서 더블클릭** 으로 열어 즉시 사용할 수 있어야 함 (정적 서버 / npm 명령 / IDE preview 없이도)
- 브라우저는 `file://` 스킴에서 module script · fetch · 일부 dynamic import 를 CORS 정책으로 차단 → 흔한 SPA 패턴이 그대로 깨짐
- 따라서 명세 단계에서 "쓰지 마라" 항목을 명시적 체크리스트로 작성하여 dev 가 추측 없이 따라할 수 있도록 함

### 11.2 마크업 제약 체크리스트 (dev / reviewer 필수 검증)

- [ ] **`<script type="module">` 금지** → `<script src="main.js"></script>` (type 속성 자체 없음). `defer` 는 OK
- [ ] **JS 에서 `import` / `export` 키워드 금지** → 단일 main.js 또는 별도 `<script src>` 태그를 HTML 에서 순서대로 로드 후 전역 함수 참조 (window.bfTodo.* 또는 IIFE 캡슐화)
- [ ] **`fetch()` 호출 금지** → 데이터는 localStorage 만 사용. JSON 파일이나 외부 API 호출 X. file:// 에서 fetch 는 거의 모든 브라우저가 차단
- [ ] **`XMLHttpRequest` (XHR) 도 금지** — fetch 의 구식 형태이지만 동일한 CORS 제약. 어차피 외부 통신이 없으므로 사용할 이유 없음
- [ ] **외부 CDN / 호스팅 import 금지**:
  - `<script src="https://unpkg.com/...">` X
  - `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` X
  - Tailwind CDN, jsdelivr, esm.sh 등 모두 X
  - **이유**: file:// 에서 일부 외부 호출은 동작하지만 (mixed-origin 정책), 운영자 네트워크 환경에 의존 → 오프라인 환경에서 깨짐
- [ ] **`new Worker(...)` / `new SharedWorker(...)` 금지** — file:// 에서 worker 스크립트 로드는 거의 모든 브라우저에서 차단됨. v1 은 worker 불필요
- [ ] **dynamic `import(...)` 금지** — module 시스템 의존
- [ ] **`<link rel="modulepreload">` 금지** — module 시스템 의존
- [ ] **로컬 이미지 / SVG 파일 외부 참조 시 상대 경로만** (`./icon.svg` OK, `/icon.svg` 는 file:// 에서 동작 안 함 — 절대 경로 X). v1 은 inline SVG 권장이므로 사실상 비해당
- [ ] **`<link rel="stylesheet" href="styles.css">` 는 OK** — same-directory 의 상대 경로 stylesheet 는 file:// 에서도 정상 로드 (CSS @import 도 OK 이나 v1 에서 사용 안 함)
- [ ] **inline `<style>` / inline `<script>` 도 OK** — 동일 origin 의 inline 콘텐츠는 CORS 영향 없음

### 11.3 허용되는 패턴 (안심 사용 OK)

- [x] `<link rel="stylesheet" href="styles.css">` (상대 경로)
- [x] `<script src="main.js"></script>` (type 속성 없음)
- [x] inline `<style>` / `<script>` (필요 시 — 단, v1 은 외부 파일 분리 권장)
- [x] `localStorage.getItem` / `setItem` (file:// 에서 정상 동작 — origin per directory)
- [x] `crypto.randomUUID()` (modern browser file:// 에서 동작. fallback 필요 시 §7.7)
- [x] `JSON.parse` / `JSON.stringify`
- [x] `new Date()` / `Date.now()` / `performance.now()`
- [x] inline SVG (이미지·아이콘 모두 inline SVG 권장)
- [x] system font stack (`ui-sans-serif`, `system-ui`, ...)
- [x] CSS custom properties (`var(--color-...)`)
- [x] `addEventListener` / `dispatchEvent` (DOM 표준)

### 11.4 디자이너 권고 (마크업 작성 시 dev 가 따라야 할 형식)

1. **HTML 의 `<script>` 태그는 type 속성 없이** — `<script src="main.js">` 만. `defer` 속성은 추가해도 OK
2. **JS 파일 분리 시** (예: `theme.js`, `storage.js`, `main.js`) HTML 에 순서대로 로드:
   ```html
   <script src="storage.js"></script>
   <script src="theme.js"></script>
   <script src="main.js"></script>
   ```
   각 파일은 전역에 함수를 노출 (IIFE 로 namespace 캡슐화 권장):
   ```js
   // storage.js
   (function (global) {
     global.bfStorage = {
       loadTodos: function () { /* ... */ },
       saveTodos: function (todos) { /* ... */ }
     };
   })(window);
   ```
3. **단일 파일 통합도 OK** — v1 규모가 작으므로 `main.js` 하나에 모든 로직 통합도 권장. 분리는 가독성 / 재사용성 판단에 맡김.
4. **module syntax 사용한 코드 복사 시 변환 필수** — 다른 SPA (timer / stopwatch / notepad) 의 코드를 참고 / 복사 시 `import` / `export` 키워드 모두 제거 후 전역 함수로 재작성. reviewer 가 PR 에서 grep 으로 검증 가능: `grep -E '^(import|export)\s' todo/main.js` 결과 0 건이어야 함.
5. **외부 의존성 0 원칙** — v1 에서 npm 패키지·CDN 라이브러리 도입 금지. 모든 로직은 vanilla JS · DOM API 만으로 구현.

### 11.5 reviewer 검증 grep 예시

PR 검토 시 reviewer 가 다음 grep 명령으로 자동 검증 가능:

```bash
# type=module 잔존 검출
grep -nE 'type=["\x27]module["\x27]' todo/*.html  # 0 hit 이어야 함

# import / export 키워드 검출
grep -nE '^(import|export)\s' todo/*.js  # 0 hit 이어야 함

# fetch / XHR 검출
grep -nE '\b(fetch|XMLHttpRequest)\s*\(' todo/*.js  # 0 hit 이어야 함

# 외부 https CDN 검출
grep -nE 'https?://' todo/*.html todo/*.css todo/*.js  # 외부 호스팅 URL 0 hit (단, 명세 / 주석의 URL 은 예외)
```

### 11.6 운영자 검증 시나리오 (수동)

1. 운영자가 운영체제 파일 탐색기에서 `todo/index.html` 을 더블클릭
2. 기본 브라우저 (Chrome / Safari / Firefox / Edge) 가 `file:///path/to/todo/index.html` 로 열림
3. 페이지 진입 → 빈 상태 표시 → 콘솔 에러 없음 → 할일 추가 / 토글 / 삭제 / 필터 / 완료삭제 모두 정상 동작
4. 새로고침 후 localStorage 복원되어 추가했던 항목 유지
5. 다른 디렉토리로 파일 이동 후에도 동일 동작 (절대 경로 의존 없음)

위 시나리오가 모두 통과해야 file:// 호환 완료.

---

## 12. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 입력 / 리스트 / 필터 / 카운터 / 완료삭제 모달의 토큰·간격·상태별 스타일 정량 명시 | §2.1, §2.2, §3, §4.3 ~ §4.6, §5.1 ~ §5.6, §7.6 정량 일치 표 | ✓ |
| file:// 제약 섹션 (script type=module 금지·import/export 금지·fetch 금지·외부 CDN 금지·CSS link 허용) | §11.2 체크리스트, §11.3 허용 패턴, §11.4 권고, §11.5 검증 grep, §11.6 운영자 시나리오 | ✓ |
| 반응형 (모바일·데스크탑 breakpoint) | §4.8 반응형 표, §7.6 정량 일치 표 | ✓ |
| 키보드 접근성 (Enter·Backspace·Esc) | §6.2 단축키 표, §5.1 / §5.3 컴포넌트별 키보드 명세 | ✓ |
| docs/design/todo-BF-420.md 신규 추가 | 본 파일 자체 | ✓ |
| 디자인 토큰 기반 정의 | §2.1 ~ §2.4 (공유 토큰), §2.2 (todo 전용 alias), §3 (typography) | ✓ |

---

## 13. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §12 표에 6 개 AC 모두 cross-reference, 누락 0 |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조·HTML 골격·CSS 변수·13 단계 구현 순서·§7.6 정량 일치 표 (40+ 항목)·§7.7 ID helper 포함 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (notepad / timer / stopwatch 5 + 5 + 5 파일), §9.2 복제 대상 (head / script / theme / `.btn` base), §9.3 신규, §9.4 핵심 차이점 4 가지 표 — BF-197 회귀 정책 반영 |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla, 후속 shadcn 호환 매핑 가이드 9 종 |
| 모호함 self-flag | ⚠️ | §14 운영자 결정 필요 항목 3 건 |

추가 자체 점검:
- **file:// 제약 explicit 명시**: §11 에 6 개 금지 항목 (체크리스트), 11 개 허용 패턴, dev 권고 형식 5 가지, reviewer grep 4 종, 운영자 검증 시나리오 5 단계 모두 명시 ✓
- **비범위 명시**: §1.3 에 드래그 정렬·카테고리·마감일·동기화·마크다운·검색·편집 모드 7 개 explicit 제외 ✓
- **정량 일치 가능성**: §7.6 표가 desktop / 모달 / 컴포넌트별 핵심 치수 40+ 항목 모두 px/토큰 키로 제공 → developer 가 추측 없이 구현 가능 ✓
- **Backspace 다중 의미 충돌 가드**: §6.2 의 `Backspace` 가 (a) input 비어 있음 → 마지막 진행 토글, (b) row focus → 삭제 — activeElement 판별 명시 ✓
- **Esc 다중 의미**: §6.2 에 modal open > input clear 우선순위 명시 ✓
- **mobile autofocus 제약**: §6.9 에 mobile autofocus 비활성 명시 (soft keyboard 침습 방지) ✓
- **reduced-motion 가드**: §6.3 (row prepend), §6.5 (row remove) 모두 explicit 가드 ✓
- **localStorage 손상 케이스**: §6.1 에 try/catch fallback + 콘솔 warn 명시 ✓
- **crypto.randomUUID 호환성**: §7.7 에 fallback 명시 (구형 브라우저 / file:// 보안 컨텍스트 issue 대비) ✓
- **모듈 분리 시 권고**: §11.4 에 IIFE namespace 캡슐화 패턴 예시 코드 포함 ✓

---

## 14. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 §4 / §5 / §6 일부만 수정):

1. **단일 항목 삭제 정책** — 현재 default 는 `🗑` 즉시 삭제 (확인 modal 없음). 사용자 실수 가능성 우려 시 (a) undo toast 1.5s (v2), (b) 모든 삭제에 modal 확인 (UX 마찰 증가) 옵션이 가능. **권장: v1 즉시 삭제 유지** + 후속 Epic 에서 undo toast 도입. mockup 은 즉시 삭제 가정.
2. **Backspace (input 비어 있을 때) 의 "마지막 진행 항목 토글" 단축** — 일부 사용자에게 직관적이지 않을 수 있음 (의도치 않은 토글 우려). default 채택 가능하나 운영자 의견 확인 권장. **권장: v1 채택** — 키보드 사용자 친화 + hint 라인에 표시 (UX 학습 가능). 우려 시 비활성하고 §6.2 표만 수정.
3. **편집 (in-place edit) 의 v1 제외 결정** — §1.3 에 편집 모드를 비목표로 명시. 항목 오타 수정 시 삭제 후 재추가 필요 → UX 부담. **권장: v1 제외 유지** (단순함 우선), 후속 Epic 에서 doubleclick 또는 ✎ 아이콘으로 추가. 운영자가 v1 포함 결정 시 §5.3 props 에 onEdit 추가 + 인터랙션 §6 보강 필요.

위 결정 없이도 developer 가 구현 진행 가능 (default 명세 채택).
