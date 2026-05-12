# 메모장 SPA 디자인 명세 — BF-395 / BF-396

> 본 문서는 메모장 단일 페이지 (SPA) 의 레이아웃·컴포넌트·상태별 시안과 디자인 토큰 매핑을 정의한다.
> 시각 시뮬레이션 mockup: [`docs/design/mockups/notepad-BF-395.html`](./mockups/notepad-BF-395.html)

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 페이지 `index.html` (또는 `notepad.html`) 단일 라우트 SPA
- 메모 CRUD (생성·조회·수정·삭제) 시각 흐름 제공
- 좌측 작성 영역 ↔ 중앙 목록 ↔ 우측 미리보기 의 **3분할 데스크탑 레이아웃**
- 모바일에서는 **단일 컬럼 스택** + 탭 전환

### 1.2 사용자 경험 목표
1. **작성 흐름 끊김 없음** — 좌측에서 입력하는 즉시 중앙 목록·우측 미리보기에 반영
2. **상태 가시성** — 빈 상태 / 목록 상태 / 미리보기 선택 상태를 시각적으로 즉시 구분
3. **반응형 일관성** — 모바일/데스크탑 모두 동일한 정보 위계 유지, 인터랙션만 변경

### 1.3 AC 매핑
| AC | 다뤄지는 섹션 |
|---|---|
| 좌측 작성·중앙 목록·우측 미리보기 3분할 와이어 | §4.1 데스크탑 와이어 + §6.1 작성 / §6.2 목록 / §6.3 미리보기 |
| 모바일 스택 / 데스크탑 3분할 분기 | §4.2 모바일 와이어 + §5 반응형 분기점 |
| 모든 시각 속성 토큰 키로 참조 (raw hex/px 금지) | §2 컬러 토큰 + §3 타이포·간격 토큰 + §6 컴포넌트 명세 |

---

## 2. 컬러 팔레트 (토큰 매핑)

> ⚠️ 본 프로젝트는 `design-tokens.json` 이 아직 없으므로, 본 명세에서 토큰 키 체계를 **신규 정의**한다.
> dev 는 이 표를 그대로 `:root` CSS 변수로 반영한다.

| 토큰 키 | HEX 값 | 용도 |
|---|---|---|
| `--color-bg-base` | `#FAFAF7` | 페이지 전체 배경 (warm off-white) |
| `--color-bg-surface` | `#FFFFFF` | 카드·컬럼 표면 |
| `--color-bg-subtle` | `#F1F0EA` | 목록 hover / 입력 placeholder 영역 |
| `--color-bg-selected` | `#E8E2D0` | 선택된 메모 카드 강조 |
| `--color-border-default` | `#E2DFD5` | 컬럼 경계선 |
| `--color-border-focus` | `#8B7B4F` | 입력 포커스 |
| `--color-text-primary` | `#2A2A28` | 본문 텍스트 |
| `--color-text-secondary` | `#6E6B62` | 부가 정보 (날짜·메타) |
| `--color-text-muted` | `#A5A29A` | placeholder · 빈 상태 안내 |
| `--color-accent` | `#8B7B4F` | 액션 (저장 버튼·새 메모 FAB) |
| `--color-accent-hover` | `#6F622F` | accent hover 상태 |
| `--color-danger` | `#B0463C` | 삭제 버튼 |

**다크 모드**: 본 명세 범위 외. 후속 task 에서 별도 토큰 셋 정의 예정 (운영자 결정 필요 항목 참고).

---

## 3. 타이포그래피·간격·반경 토큰

### 3.1 폰트
| 토큰 키 | 값 | 용도 |
|---|---|---|
| `--font-family-sans` | `'Inter', system-ui, -apple-system, sans-serif` | UI 본문 |
| `--font-family-serif` | `'Source Serif Pro', Georgia, serif` | 메모 본문 (가독성) |

### 3.2 타이포 스케일
| 토큰 키 | size / weight / line-height | 용도 |
|---|---|---|
| `--text-display` | 24px / 600 / 1.3 | 페이지 헤더 타이틀 |
| `--text-heading` | 18px / 600 / 1.4 | 메모 제목 |
| `--text-body` | 15px / 400 / 1.6 | 메모 본문 |
| `--text-meta` | 13px / 400 / 1.4 | 날짜·카운트 |
| `--text-caption` | 12px / 500 / 1.2 | 라벨·tag |

### 3.3 간격 (spacing scale)
| 토큰 키 | 값 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |

### 3.4 반경·그림자
| 토큰 키 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | 4px | 입력 필드 |
| `--radius-md` | 8px | 카드·버튼 |
| `--radius-lg` | 12px | 컬럼 컨테이너 |
| `--shadow-card` | `0 1px 2px rgba(42,42,40,0.04), 0 2px 8px rgba(42,42,40,0.06)` | 메모 카드 |
| `--shadow-focus` | `0 0 0 3px rgba(139,123,79,0.22)` | 포커스 링 |

---

## 4. 레이아웃 와이어프레임

### 4.1 데스크탑 (≥ 1024px) — 3분할

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  HEADER  [메모장]                            검색 □□□□□□□        [+ 새 메모] │
├──────────────────────┬──────────────────────┬─────────────────────────────────┤
│   [작성 영역]        │   [목록 영역]        │   [미리보기 영역]               │
│                      │                      │                                 │
│  제목 ______________ │  ┌────────────────┐  │   ┌───────────────────────┐    │
│                      │  │ 회의록         │  │   │ 회의록                │    │
│  본문 ______________ │  │ 2026-05-12     │  │   │ 2026-05-12 14:32      │    │
│       ______________ │  │ 오늘 회의는... │  │   ├───────────────────────┤    │
│       ______________ │  └────────────────┘  │   │ 오늘 회의는 분기...   │    │
│       ______________ │  ┌────────────────┐  │   │                       │    │
│       ______________ │  │ 쇼핑 리스트    │  │   │ ... (본문 전체) ...   │    │
│                      │  │ 2026-05-11     │  │   │                       │    │
│  [저장]   [초기화]   │  │ 우유, 빵, ...  │  │   └───────────────────────┘    │
│                      │  └────────────────┘  │   [수정]        [삭제]         │
│  글자수: 0           │  ▼ 더보기            │                                 │
│                      │                      │                                 │
└──────────────────────┴──────────────────────┴─────────────────────────────────┘
   width: 320px         flex: 1 (~360px)         flex: 1.2 (~460px)
```

- **컬럼 비율**: `320px | 1fr | 1.2fr`
- **전체 max-width**: `1440px` (가운데 정렬)
- **컬럼 간 구분**: `--color-border-default` 1px 세로선
- **컬럼 내부 padding**: `--space-5` (24px)

### 4.2 모바일 (< 768px) — 단일 컬럼 스택 + 탭

```
┌──────────────────────────────┐
│ HEADER  [메모장]    [+ FAB]  │
├──────────────────────────────┤
│ [작성] [목록] [미리보기]     │   ← 탭 바 (현재 활성 강조)
├──────────────────────────────┤
│                              │
│   (선택된 탭 콘텐츠)         │
│                              │
│                              │
└──────────────────────────────┘
       width: 100%
```

- **상단 탭**: 3개 탭 (`작성` / `목록` / `미리보기`)
- **활성 탭 표시**: 하단 2px `--color-accent` 언더라인
- **콘텐츠 영역**: 단일 컬럼, 좌우 padding `--space-4`
- **새 메모 FAB**: 우측 하단 고정, 56×56, `--color-accent`

### 4.3 태블릿 (768–1023px) — 2분할

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
├──────────────────────────┬──────────────────────────┤
│  [작성 또는 미리보기]    │   [목록]                 │
│  (상단 토글)             │                          │
└──────────────────────────┴──────────────────────────┘
```

- 좌측 컬럼이 작성/미리보기를 토글
- 토글 버튼: 좌측 컬럼 상단 (`작성` ↔ `미리보기`)

---

## 5. 반응형 분기점

| breakpoint 토큰 | 값 | 레이아웃 |
|---|---|---|
| `--bp-sm` | `< 768px` | 단일 컬럼 + 탭 (§4.2) |
| `--bp-md` | `768px ~ 1023px` | 2분할 토글 (§4.3) |
| `--bp-lg` | `≥ 1024px` | 3분할 (§4.1) |

CSS 미디어 쿼리 예시 (dev 가이드용):
```css
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
```

---

## 6. 컴포넌트 명세

### 6.1 작성 영역 (`<EditorPanel>`)

**구조**:
```
EditorPanel
├── TitleInput   (id="note-title-input")
├── BodyTextarea (id="note-body-input")
├── ActionRow
│   ├── SaveButton    (primary)
│   └── ResetButton   (ghost)
└── MetaRow
    └── CharCount     (id="char-count")
```

**Props / 상태**:
| 속성 | 타입 | 기본값 | 비고 |
|---|---|---|---|
| `mode` | `'create' | 'edit'` | `'create'` | edit 시 SaveButton 라벨 "수정 저장" |
| `noteId` | `string \| null` | `null` | edit 모드에서 사용 |
| `title` | `string` | `''` | controlled |
| `body` | `string` | `''` | controlled |

**시각 토큰**:
- 배경: `--color-bg-surface`
- 입력 border: `--color-border-default`, focus 시 `--color-border-focus` + `--shadow-focus`
- TitleInput 폰트: `--text-heading`
- BodyTextarea 폰트: `--font-family-serif` + `--text-body`
- SaveButton: 배경 `--color-accent`, hover `--color-accent-hover`, 라벨 `--color-bg-surface`
- ResetButton: 배경 transparent, border `--color-border-default`, 텍스트 `--color-text-secondary`
- 입력 간 간격: `--space-3`

**인터랙션**:
- TitleInput 입력 → 우측 미리보기 제목 실시간 반영
- BodyTextarea 입력 → CharCount 자동 갱신 + 우측 미리보기 본문 반영
- SaveButton: 제목·본문 모두 비어있으면 disabled (배경 `--color-bg-subtle`, 텍스트 `--color-text-muted`)
- ResetButton: 클릭 시 confirm 없이 두 필드 초기화 (작성 중인 내용만, 저장된 메모 영향 X)

### 6.2 목록 영역 (`<NoteList>`)

**구조**:
```
NoteList
├── SearchInput     (id="note-search")
├── NoteCard[]      (반복)
│   ├── CardTitle
│   ├── CardSnippet (본문 첫 80자)
│   └── CardDate
└── EmptyState      (목록 0건일 때)
```

**Props / 상태**:
| 속성 | 타입 | 비고 |
|---|---|---|
| `notes` | `Note[]` | 정렬: 최신순 (updatedAt desc) |
| `selectedId` | `string \| null` | 선택 카드 강조 |
| `searchQuery` | `string` | 빈 문자열이면 필터 X |

**카드 시각 토큰**:
- 배경 기본: `--color-bg-surface`
- 배경 hover: `--color-bg-subtle`
- 배경 selected: `--color-bg-selected`
- 카드 padding: `--space-4`
- 카드 간 간격: `--space-3`
- 카드 radius: `--radius-md`
- CardTitle: `--text-heading` + `--color-text-primary`
- CardSnippet: `--text-body` + `--color-text-secondary`, 2줄 ellipsis
- CardDate: `--text-meta` + `--color-text-muted`

**상태별 시각**:
| 상태 | 시각 |
|---|---|
| 기본 | `--color-bg-surface` + `--shadow-card` |
| Hover | `--color-bg-subtle` + cursor: pointer |
| Selected | `--color-bg-selected` + 좌측 3px `--color-accent` 띠 |
| Disabled (검색 결과 없음) | NoteList 전체를 EmptyState 로 치환 |

**빈 상태 (`<EmptyState>`)**:
- 일러스트: 노트 아이콘 (SVG, 64×64, `--color-text-muted`)
- 안내 문구: "아직 메모가 없습니다." (`--text-body` + `--color-text-muted`)
- 보조 안내: "왼쪽 작성 영역에서 첫 메모를 남겨보세요." (`--text-meta` + `--color-text-muted`)
- 정렬: 중앙, 세로 padding `--space-7`

### 6.3 미리보기 영역 (`<NotePreview>`)

**구조**:
```
NotePreview
├── PreviewHeader
│   ├── PreviewTitle
│   └── PreviewMeta (작성·수정 시각)
├── PreviewBody
└── ActionBar
    ├── EditButton    (secondary)
    └── DeleteButton  (danger)
```

**Props / 상태**:
| 속성 | 타입 | 비고 |
|---|---|---|
| `note` | `Note \| null` | null 이면 EmptyPreview 표시 |

**시각 토큰**:
- 배경: `--color-bg-surface`
- PreviewTitle: `--text-display` + `--color-text-primary`
- PreviewMeta: `--text-meta` + `--color-text-secondary`, PreviewTitle 아래 `--space-2`
- PreviewBody: `--font-family-serif` + `--text-body` + `--color-text-primary`, 행간 1.7
- ActionBar: 하단 고정, top border `--color-border-default`
- EditButton: 배경 transparent, border `--color-border-default`, hover 시 `--color-bg-subtle`
- DeleteButton: 배경 transparent, 텍스트 `--color-danger`, hover 시 배경 `rgba(176,70,60,0.08)` (토큰 `--color-danger-subtle` 신규 추가 권장 — §10 운영자 결정 필요 참고)

**상태별 시각**:
| 상태 | 시각 |
|---|---|
| `note === null` (빈 미리보기) | 중앙에 "메모를 선택하면 여기에서 미리볼 수 있습니다." 표시 (`--color-text-muted`) |
| `note !== null` | 일반 미리보기 |

---

## 7. 헤더 & 검색

### 7.1 PageHeader
- 좌측: 텍스트 로고 "메모장" (`--text-display` + `--color-text-primary`)
- 중앙: 검색 입력 (데스크탑 폭 320px, 모바일은 헤더 아래 별도 줄)
- 우측: `+ 새 메모` 버튼 (모바일은 FAB 으로 대체)
- 높이: `--space-7` (48px) + padding `--space-3` 상하
- 하단 border: 1px `--color-border-default`

### 7.2 SearchInput
- placeholder: "메모 검색…"
- icon: 좌측 돋보기 (SVG, 16×16, `--color-text-muted`)
- 입력 시 실시간 필터 (debounce 150ms — dev 결정 사항)

---

## 8. 상태 매트릭스 (요약)

| 상태 | 작성 영역 | 목록 영역 | 미리보기 |
|---|---|---|---|
| **빈 상태** (메모 0건) | 신규 작성 활성 | EmptyState | 빈 미리보기 안내 |
| **목록 상태** (선택 없음) | 신규 작성 활성 | 카드 목록 (선택 없음) | 빈 미리보기 안내 |
| **미리보기 선택** | 신규 작성 (또는 edit 모드) | 카드 목록 (선택 강조) | 선택 메모 표시 |
| **검색 결과 0건** | 신규 작성 활성 | "검색 결과가 없습니다" | 직전 선택 유지 또는 빈 미리보기 |

---

## 9. dev 구현 가이드

### 9.1 디렉토리·파일
```
/
├── index.html                  ← SPA 진입점
├── styles.css                  ← :root 토큰 + 컴포넌트 스타일
├── script.js                   ← 메모 CRUD + DOM 렌더링
└── docs/design/
    ├── notepad-BF-395.md       ← 본 문서
    └── mockups/notepad-BF-395.html
```

### 9.2 단계별 구현 순서
1. `styles.css` 의 `:root` 에 §2 / §3 토큰을 그대로 CSS 변수로 정의 (raw hex/px 직접 작성 금지)
2. `index.html` 골격:
   - `<header class="page-header">`
   - `<main class="layout-grid">` — `display: grid; grid-template-columns: 320px 1fr 1.2fr;` (데스크탑 기준)
   - `<section class="editor-panel">`, `<section class="note-list">`, `<section class="note-preview">`
3. 모바일 분기:
   - `< 768px` 에서 `grid-template-columns: 1fr` + 탭 바 표시 + 비활성 패널 `display: none`
4. JS 상태:
   - 메모 store: 메모리 (Phase 1) — `[{id, title, body, createdAt, updatedAt}]`
   - localStorage 영속화는 별도 task 권장 (운영자 결정 필요 §10)
5. 이벤트 바인딩:
   - TitleInput `input` → preview 실시간 반영 + charCount
   - BodyTextarea `input` → 동일
   - SaveButton `click` → store 추가/갱신 → 목록 재렌더
   - 카드 `click` → selectedId 갱신 → preview 갱신
   - DeleteButton `click` → 확인 후 store 제거 → selectedId null

### 9.3 클래스명·ID 규약
| 요소 | id / class |
|---|---|
| 페이지 헤더 | `.page-header` |
| 검색 입력 | `#note-search` |
| 새 메모 버튼 | `#new-note-btn` (모바일 FAB 도 동일 id) |
| 작성 패널 | `.editor-panel` |
| 제목 입력 | `#note-title-input` |
| 본문 입력 | `#note-body-input` |
| 저장 버튼 | `#save-note-btn` (`.btn-primary`) |
| 초기화 버튼 | `#reset-note-btn` (`.btn-ghost`) |
| 글자수 | `#char-count` |
| 목록 패널 | `.note-list` |
| 메모 카드 | `.note-card`, 선택 시 `.note-card--selected` |
| 빈 상태 | `.empty-state` |
| 미리보기 패널 | `.note-preview` |
| 수정 버튼 | `#edit-note-btn` (`.btn-secondary`) |
| 삭제 버튼 | `#delete-note-btn` (`.btn-danger`) |

### 9.4 기존 페이지 / 공통 요소 보존
- 본 task 시점 repo 에는 `index.html` / 다른 페이지가 **없음** (initial commit 만 존재).
- 따라서 신규 작성에 한해 **복제 대상 없음**.
- `<head>` 표준만 권장: `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>메모장</title>`
- 후속 task 에서 다크 모드 (BF-43 류) 도입 시, 본 명세의 토큰 키를 그대로 다크 변형으로 확장 가능하도록 명명했다 (`--color-bg-base` 등 의미 기반 이름).

### 9.5 shadcn/ui 매핑
본 프로젝트는 **vanilla HTML/CSS** 구성으로 명세한다 (현 시점 shadcn 미도입). 후속 React/Next 마이그레이션 시 매핑 참고:

| 본 명세 컴포넌트 | shadcn 대응 (마이그 시) |
|---|---|
| TitleInput / BodyTextarea | `Input`, `Textarea` |
| SaveButton / ResetButton / EditButton / DeleteButton | `Button` (`variant` 별) |
| NoteCard | `Card` |
| EmptyState | vanilla (shadcn 공식 컴포넌트 없음) |
| SearchInput | `Input` + lucide `Search` 아이콘 |

---

## 10. 운영자 결정 필요

1. **다크 모드 범위** — 본 명세는 라이트 모드만 정의. 다크 토큰 셋을 본 PR 에 포함할지, 별도 task (BF-???) 로 분리할지 결정 필요.
2. **`--color-danger-subtle` 토큰 신설** — DeleteButton hover 배경에 사용. 현재는 `rgba()` 로 적었으나 토큰화 권장.
3. **영속화 방식** — Phase 1 에서 localStorage 사용할지, 메모리 only 후 BF-??? 에서 추가할지.
4. **검색 debounce 값** — 150ms 권장했으나 UX 검증 필요.
5. **태블릿 레이아웃 우선순위** — §4.3 2분할 토글이 필수인지, 모바일 스택을 1023px 까지 확장해도 되는지.

---

## 11. mockup 참조

본 명세의 시각 표현은 다음 단일 HTML 파일에서 시뮬레이션한다:
- 파일: `docs/design/mockups/notepad-BF-395.html`
- 외부 의존성 0건 (vanilla CSS, system font stack)
- 데스크탑·태블릿·모바일 3개 viewport mockup 을 `<section>` 으로 구분
- 빈 상태 / 목록 상태 / 선택 상태 mockup 도 같은 파일 내에 별도 섹션

dev 는 mockup 의 픽셀 단위 일치 의무는 없으며, **본 markdown 의 토큰 매핑이 최종 권위** 다.

---

## 12. Self-critique

| 항목 | 결과 | 사유 |
|---|---|---|
| AC 매핑 완료 | ✓ | §1.3 표에서 3개 AC 모두 섹션 cross-reference |
| dev 구현 가이드 명확 | ✓ | §9.2 단계별 순서 + §9.3 클래스/ID 표 + §9.1 파일 구조 명시 |
| 기존 요소 보존 명시 | ✓ | §9.4 — 현 repo 가 initial commit 만이라 복제 대상 없음 명시 |
| shadcn/ui 매핑 | ✓ | §9.5 — vanilla 채택 사유 + 후속 마이그 시 대응표 |
| 모호함 self-flag | ⚠️ | §10 에 5개 결정 필요 항목 — 다크 모드·영속화·태블릿 우선순위가 후속 task 영향 |
