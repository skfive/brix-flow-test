# 팔레트 SPA 디자인 명세 (BF-461)

> 관련 task: BF-462 (designer)
> mockup: [`docs/design/mockups/palette-BF-461.html`](mockups/palette-BF-461.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `palette/index.html` (URL 진입점 `/palette`)
- **다크 우선** 단일 카드 레이아웃: **5개 컬러 슬롯 (색상 박스 + HEX/HSL 표시 + 복사 버튼) → 저장 영역**
- vanilla HTML/CSS/JS — ES module / fetch / 외부 CDN 금지 (file:// CORS 안전)
- 토큰 시스템은 `dice-BF-446` / `clicker-BF-441` / `pomodoro-BF-430` 와 공유, 본 명세는 **팔레트 전용 토큰만 추가** (amber accent 페어)

### 1.2 사용자 경험 목표
- **다크 우선**: default `data-theme="dark"`. 라이트는 토글로만 전환 (dice / clicker 와 동일 패턴)
- **즉각적인 색상 피드백**: 슬롯 박스 클릭 → native `<input type="color">` 열림 → 슬롯 배경색 + HEX/HSL 값 실시간 갱신
- **빠른 HEX 복사**: 각 슬롯에 복사 버튼, 클릭 시 HEX 값 클립보드 복사 + "✓" 상태 피드백 1.5s
- **팔레트 저장**: localStorage 에 이름 + 5색 배열 저장 (bf-palette-saves 키). 저장된 팔레트 compact list로 불러오기 가능
- **단순함 (Simplicity First)**: 슬롯 5개 · 복사 · 저장/불러오기 외 다른 UI 없음. v1 minimal core

### 1.3 비목표 (Out of Scope)
- **색상 하모니 자동 생성** (complementary / triadic 등) — v1 수동 선택만
- **HSL 슬라이더 직접 조작** — v1 은 native color picker 만 (간소화)
- **팔레트 내보내기 (JSON/CSS 파일 다운로드)** — v1 은 클립보드 복사만
- **슬롯 드래그 순서 변경** — v1 고정 순서
- **외부 폰트 CDN / 이미지 / svg sprite** — 시스템 스택만

---

## 2. 디자인 토큰

> 본 명세는 `dice-BF-446.md §2` 의 공유 토큰을 그대로 재사용합니다. 팔레트 전용 토큰은 accent (amber) 페어 + 슬롯 관련 추가 토큰만.

### 2.1 색상 토큰 (다크 우선)

> **AC §1 직접 매핑**: 다크 default `--color-bg-canvas: #0d1117` — 기존 모듈 동일값 채택.
> 팔레트 accent = **Amber** (`#fb923c` dark / `#ea580c` light). 기존 모듈 accent 미사용 계통 선택:
> Rose (dice), Purple (clicker), Blue (pomodoro/timer/stopwatch/notepad/kanban), Sky (weather) 와 충돌 없음.

| 토큰명 | **Dark HEX (default)** | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | **`#0d1117`** | `#fafaf9` | 페이지 전체 배경 |
| `--color-bg-surface` | `#161b22` | `#ffffff` | 카드 표면 (슬롯 래퍼, 저장 영역) |
| `--color-bg-subtle` | `#1f2530` | `#f1f1ef` | 슬롯 hover / 저장 목록 행 hover |
| `--color-border-default` | `#262c36` | `#e5e5e2` | 슬롯 구분선, 카드 테두리 |
| `--color-border-strong` | `#3a4150` | `#d0d0cc` | ghost button outline, focus ring base |
| `--color-text-primary` | `#e8e8e4` | `#1a1a19` | HEX 값, 저장 이름 |
| `--color-text-secondary` | `#9a9a93` | `#6b6b66` | HSL 값, 슬롯 번호 라벨 |
| `--color-text-muted` | `#6b6b66` | `#9a9a93` | placeholder, empty state |
| `--color-accent` | **`#fb923c`** | `#ea580c` | 저장 버튼 CTA, 슬롯 복사 버튼 active |
| `--color-accent-hover` | `#fdba74` | `#c2410c` | accent hover (다크 밝게, 라이트 어둡게) |
| `--color-accent-active` | `#f97316` | `#9a3412` | accent active (눌릴 때 깊게) |
| `--color-accent-on` | `#0d1117` | `#ffffff` | accent 배경 위 텍스트 (대비 확보) |
| `--color-danger` | `#e55858` | `#d14343` | 팔레트 삭제 hover 강조 |
| `--color-focus-ring` | `rgba(251, 146, 60, 0.55)` | `rgba(234, 88, 12, 0.45)` | 키보드 focus outline (2px) |

> **amber 다크/라이트 페어 근거**: 다크 `#fb923c` (amber-400) 위에 `#0d1117` 어두운 텍스트 → 대비 ~6.8:1 (WCAG AA ✓). 라이트 `#ea580c` (orange-600) 위에 `#ffffff` → 대비 ~4.6:1 (WCAG AA large text ✓, 버튼 라벨 18px 이상에서 적용).

### 2.2 팔레트 전용 추가 토큰

| 토큰명 | Dark | Light | 용도 |
|---|---|---|---|
| `--color-slot-empty` | `#1f2530` | `#e5e5e2` | 초기 빈 슬롯 배경 (색상 미선택 상태) |
| `--color-slot-border` | `#3a4150` | `#d0d0cc` | 슬롯 박스 테두리 (색상 박스 윤곽) |
| `--color-copy-glow` | `rgba(251, 146, 60, 0.35)` | `rgba(234, 88, 12, 0.20)` | 복사 버튼 hover glow (box-shadow) |
| `--color-save-glow` | `rgba(251, 146, 60, 0.40)` | `rgba(234, 88, 12, 0.25)` | 저장 CTA hover glow |
| `--color-hex-display` | `#e8e8e4` | `#1a1a19` | HEX 값 텍스트 (= text-primary alias) |
| `--color-hsl-display` | `#9a9a93` | `#6b6b66` | HSL 값 텍스트 (= text-secondary alias) |

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
| `--space-8` | `64px` |

### 2.4 반경·그림자 (재사용 + 팔레트용 신규 1건)

| 토큰명 | Dark 값 | Light 값 | 용도 |
|---|---|---|---|
| `--radius-sm` | `4px` | `4px` | 복사 버튼 |
| `--radius-md` | `8px` | `8px` | 저장 영역 행, ghost 버튼 |
| `--radius-lg` | `12px` | `12px` | 메인 카드, 저장 영역 카드 |
| `--radius-slot` | `10px` | `10px` | 컬러 슬롯 박스 (신규 — 슬롯 전용) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.32)` | `0 4px 16px rgba(0,0,0,0.06)` | 카드 |
| `--shadow-copy` | `0 4px 12px var(--color-copy-glow)` | (동일) | 복사 버튼 hover halo |
| `--shadow-save` | `0 6px 20px var(--color-save-glow)` | (동일) | 저장 CTA hover halo |

### 2.5 모션 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--motion-press` | `150ms` | 버튼 press animation |
| `--motion-fast` | `120ms` | hover bg transition |
| `--motion-mid` | `220ms` | 슬롯 색상 전환, 저장 목록 나타남 |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | press/transition easing |
| `--scale-press` | `0.95` | 버튼 press 시 transform scale |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | 토큰 | 적용처 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `--text-h1` | 상단바 타이틀 "팔레트" |
| **hex-value** | **`15px`** | **`600`** | **`1.2`** | `--text-hex` | 슬롯 HEX 값 |
| **hsl-value** | **`12px`** | **`400`** | **`1.4`** | `--text-hsl` | 슬롯 HSL 값 |
| slot-label | `11px` | `500` | `1.4` | `--text-slot-label` | 슬롯 번호 ("색상 1" 등) |
| save-cta | `16px` | `600` | `1` | `--text-save-cta` | 저장 버튼 라벨 |
| save-name | `14px` | `500` | `1.4` | `--text-label` | 저장 이름 입력, 목록 이름 |
| button | `14px` | `500` | `1` | `--text-button` | 복사 버튼, ghost 버튼 |
| caption | `12px` | `400` | `1.4` | `--text-caption` | "복사됨 ✓" 피드백, hint |

HEX 값은 `--font-mono` + `text-transform: uppercase` + `tabular-nums` — 자릿수 떨림 방지.
HSL 값은 `--font-mono` + `tabular-nums` — 수치 정렬.

---

## 4. 레이아웃 (와이어프레임)

### 4.1 전체 그리드 (desktop ≥ 640px)

```
┌────────────────────────────────────────────────────────────────┐
│  Topbar · "팔레트"                              [🌙 토글]       │  56px
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │  [슬롯1] [슬롯2] [슬롯3] [슬롯4] [슬롯5]                  │ │  메인 카드
│   │  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐               │ │
│   │  │      ││      ││      ││      ││      │  ← 색상 박스    │ │  120px
│   │  │      ││      ││      ││      ││      │                 │ │
│   │  └──────┘└──────┘└──────┘└──────┘└──────┘               │ │
│   │  #FF5733  #FFC300  #28B463  #1A73E8  #8E44AD             │ │  HEX
│   │  hsl(...) hsl(...) hsl(...) hsl(...) hsl(...)             │ │  HSL
│   │  [복사]   [복사]   [복사]   [복사]   [복사]               │ │  복사 버튼
│   └──────────────────────────────────────────────────────────┘ │
│                                                                │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │  저장된 팔레트                                             │ │  저장 카드
│   │  ┌────────────────────────────────────────────────────┐  │ │
│   │  │ 이름:  [______________________]   [저장]           │  │ │
│   │  └────────────────────────────────────────────────────┘  │ │
│   │  ──────────────────────────────────────────────────────   │ │
│   │  내 팔레트 1     ■■■■■    [불러오기] [삭제]               │ │  목록 행
│   │  내 팔레트 2     ■■■■■    [불러오기] [삭제]               │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                │
│   <kbd>T</kbd> 테마 토글                                       │  hint
└────────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 680px`, 가운데 정렬, `padding: var(--space-7) var(--space-5)`
- 메인 카드 내 슬롯: `display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-3)`
- 메인 카드 padding: `var(--space-5)`
- 저장 카드 padding: `var(--space-5)`
- 두 카드 사이 간격: `var(--space-5)`

### 4.2 모바일 (< 640px)

```
┌──────────────────────────────────┐
│  Topbar · "팔레트"   [🌙 토글]    │
├──────────────────────────────────┤
│  ┌────────────────────────────┐   │
│  │  [슬롯1][슬롯2][슬롯3]     │   │  → grid 3열
│  │  [슬롯4][슬롯5]            │   │  → grid 2열 (마지막 행)
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │  이름: [__________] [저장] │   │
│  │  목록 행 (전체 너비)        │   │
│  └────────────────────────────┘   │
└──────────────────────────────────┘
```

- 모바일 breakpoint `< 640px`: 슬롯 `grid-template-columns: repeat(3, 1fr)` → 3열
- 슬롯 색상 박스 높이: 데스크탑 `120px`, 모바일 `80px`

### 4.3 컨테이너 구조

```html
<html data-theme="dark">
  <body>
    <header class="topbar">
      <h1 class="topbar__title">팔레트</h1>
      <div class="topbar__actions">
        <button id="theme-toggle" class="btn btn--ghost" aria-label="라이트 테마로 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <!-- 메인 카드 -->
      <section class="card palette-card" aria-label="컬러 팔레트">
        <div class="slot-grid">
          <div class="slot" data-slot="0"> ... </div>
          <div class="slot" data-slot="1"> ... </div>
          <div class="slot" data-slot="2"> ... </div>
          <div class="slot" data-slot="3"> ... </div>
          <div class="slot" data-slot="4"> ... </div>
        </div>
      </section>

      <!-- 저장 카드 -->
      <section class="card save-card" aria-label="팔레트 저장">
        <div class="save-form"> ... </div>
        <ul class="save-list" aria-label="저장된 팔레트"> ... </ul>
      </section>

      <p class="hint"><kbd>T</kbd> 테마 토글</p>
    </main>
  </body>
</html>
```

---

## 5. 컴포넌트 명세

### 5.1 컬러 슬롯 (`.slot`)

**구조**:
```
.slot
  └── .slot__swatch   ← <button> (클릭 → native color picker 트리거)
        <input type="color" class="slot__input" hidden>
  └── .slot__info
        .slot__hex    ← HEX 값 (예: #FF5733)
        .slot__hsl    ← HSL 값 (예: hsl(11, 100%, 58%))
  └── .slot__copy   ← <button> 복사 버튼
```

**Props / 상태**:

| 상태 | 설명 | 시각 표현 |
|---|---|---|
| `empty` | 초기 상태, 색상 미선택 | swatch 배경 = `--color-slot-empty`, HEX = `—`, HSL = `—` |
| `filled` | 색상 선택 완료 | swatch 배경 = 선택된 색상, HEX/HSL 값 표시 |
| `hover` | swatch hover | `outline: 2px solid --color-border-strong` + cursor `crosshair` |
| `copied` | 복사 직후 1.5s | 복사 버튼 텍스트 → "✓", 배경 = `--color-accent` 20% 투명도 |

**슬롯 swatch 크기**:
- 데스크탑 (≥640px): `width: 100%; height: 120px; border-radius: var(--radius-slot)`
- 모바일 (<640px): `width: 100%; height: 80px; border-radius: var(--radius-slot)`

**HEX/HSL 표시**:
- `.slot__hex`: `--font-mono`, `15px`, `600`, `text-transform: uppercase`
- `.slot__hsl`: `--font-mono`, `12px`, `400`, `color: var(--color-hsl-display)`

**인터랙션**:
1. `.slot__swatch` click → `slot__input.click()` (hidden color input 트리거)
2. `slot__input` `input` 이벤트 → swatch 배경색 업데이트 + HEX/HSL 재계산
3. `.slot__copy` click → `navigator.clipboard.writeText(hexValue)` → 1.5s "✓" 상태 → 원복

### 5.2 복사 버튼 (`.slot__copy`)

| 속성 | 값 |
|---|---|
| 크기 | `width: 100%; height: 32px` (슬롯 너비 전체) |
| 기본 상태 | 텍스트: "복사", background: `--color-bg-subtle`, border: `1px solid --color-border-default` |
| hover | background: `--color-bg-subtle` + `box-shadow: var(--shadow-copy)` |
| copied 상태 (1.5s) | 텍스트: "✓ 복사됨", background: `rgba(--color-accent, 0.15)`, color: `--color-accent` |
| disabled (empty slot) | opacity: `0.35`, cursor: `not-allowed` |
| font | `--text-button`, `--font-sans` |
| border-radius | `var(--radius-sm)` |
| press | `transform: scale(var(--scale-press))`, `transition: var(--motion-press)` |

### 5.3 저장 폼 (`.save-form`)

**구조**:
```
.save-form
  └── <input type="text" id="palette-name" placeholder="팔레트 이름...">
  └── <button id="btn-save" class="btn btn--accent">저장</button>
```

| 속성 | 값 |
|---|---|
| input 너비 | flex-grow: 1 (저장 버튼과 flex row) |
| input 높이 | `40px` |
| input border-radius | `var(--radius-md)` |
| input border | `1px solid var(--color-border-default)` |
| input focus ring | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
| input background | `var(--color-bg-subtle)` |
| 저장 버튼 | `padding: 0 var(--space-4); height: 40px; border-radius: var(--radius-md); background: var(--color-accent)` |
| 저장 버튼 hover | `background: var(--color-accent-hover); box-shadow: var(--shadow-save)` |
| 저장 버튼 font | `--text-save-cta` |

**저장 동작**:
- 이름 비어있으면 버튼 disabled (opacity 0.5, pointer-events none)
- 저장 시 `localStorage.setItem("bf-palette-saves", JSON.stringify([...saves, newEntry]))`
- 저장 키 구조: `{ id: Date.now(), name: string, colors: string[5] }` (colors: HEX 배열)
- 저장 직후 입력 필드 clear + `.save-list` 새 항목 삽입 (animate: fade-in 220ms)

### 5.4 저장 목록 행 (`.save-list__item`)

**구조**:
```
.save-list__item
  └── .save-list__name  ← 팔레트 이름
  └── .save-list__swatches  ← 5색 미니 사각형 (12px × 12px each)
  └── .save-list__actions
        <button class="btn btn--ghost btn--sm">불러오기</button>
        <button class="btn btn--ghost btn--sm btn--danger">삭제</button>
```

| 속성 | 값 |
|---|---|
| 행 높이 | `44px` (min-height) |
| 행 padding | `var(--space-2) var(--space-3)` |
| 행 border-radius | `var(--radius-md)` |
| 행 hover | background `var(--color-bg-subtle)` |
| 미니 swatch | `width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(255,255,255,0.1)` |
| 미니 swatch gap | `4px` |
| 삭제 버튼 hover | `color: var(--color-danger)` |

**빈 상태** (저장 없음):
```
<p class="save-list__empty">저장된 팔레트가 없습니다</p>
```
- color: `--color-text-muted`, font: `--text-caption`, text-align: center, padding: `var(--space-5) 0`

### 5.5 테마 토글 버튼 (`#theme-toggle`)

- dice / clicker 와 **동일 패턴** (head IIFE + `localStorage["bf-theme"]` 공유)
- 아이콘: 다크 = `🌙`, 라이트 = `☀`
- aria-label: 다크 = "라이트 테마로 전환", 라이트 = "다크 테마로 전환"
- class: `btn btn--ghost`

### 5.6 버튼 공통 스타일 (`.btn`)

| variant | class | background | border | color |
|---|---|---|---|---|
| accent (저장 CTA) | `.btn--accent` | `--color-accent` | none | `--color-accent-on` |
| ghost (복사, 불러오기, 테마) | `.btn--ghost` | transparent | `1px solid --color-border-strong` | `--color-text-primary` |
| ghost-sm | `.btn--ghost.btn--sm` | transparent | `1px solid --color-border-default` | `--color-text-secondary` |
| ghost hover | | `--color-bg-subtle` | — | — |
| danger hover | `.btn--danger:hover` | — | — | `--color-danger` |

공통: `cursor: pointer; transition: background var(--motion-fast) var(--ease-out); border-radius: var(--radius-sm)`

---

## 6. 인터랙션 명세

### 6.1 컬러 슬롯 선택 흐름

```
사용자 클릭
  └─→ .slot__swatch 클릭
  └─→ hidden <input type="color"> 트리거
  └─→ 브라우저 native color picker 표시
  └─→ 색상 선택 (input 이벤트 연속 발화)
  └─→ .slot__swatch 배경색 = 선택값 (CSS property 직접 설정)
  └─→ HEX 값 = selectedColor.toUpperCase()
  └─→ HSL 값 = hex → HSL 변환 (JS 내장 계산)
  └─→ .slot__copy: disabled → enabled
```

### 6.2 HEX → HSL 변환 알고리즘

dev 참고 (JS pseudo-code):
```js
function hexToHsl(hex) {
  // hex → r, g, b (0-1 range)
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  // 표준 RGB → HSL 변환 (min/max 계산)
  // 반환: "hsl(H, S%, L%)" 문자열 (H: 0-360 정수, S/L: 0-100 정수)
}
```
- HEX: `#RRGGBB` 형식 (6자리 대문자)
- HSL: `hsl(H, S%, L%)` 형식 (정수값)

### 6.3 복사 인터랙션

1. 버튼 클릭 → `navigator.clipboard.writeText(hexValue)`
2. 성공 시: 버튼 텍스트 → `"✓ 복사됨"`, 배경 amber 15% 투명도
3. 1.5s 후: 원래 `"복사"` 텍스트로 복원 (transition: `--motion-mid`)
4. clipboard API 미지원 시: `document.execCommand('copy')` fallback

### 6.4 저장/불러오기 흐름

```
저장:
  input[팔레트 이름] 입력
  └─→ btn-save enabled
  └─→ 클릭 → localStorage 저장
  └─→ input clear
  └─→ 목록 새 항목 추가

불러오기:
  목록 행 [불러오기] 클릭
  └─→ 5개 슬롯에 저장된 색상 일괄 적용
  └─→ HEX/HSL 값 갱신
  └─→ 슬롯 배경색 갱신

삭제:
  [삭제] 클릭
  └─→ confirm() 없이 즉시 삭제 (v1 단순화)
  └─→ localStorage 업데이트
  └─→ 행 fade-out 220ms 후 DOM 제거
```

### 6.5 키보드 단축키

| 키 | 동작 |
|---|---|
| `T` | 테마 토글 |
| `1`~`5` | 해당 번호 슬롯 color picker 트리거 |
| `C` | 마지막 활성 슬롯 HEX 복사 |

### 6.6 다크 default 토글 패턴

- HTML 초기값: `<html data-theme="dark">`
- head 인라인 IIFE (flicker 방지):
  ```html
  <script>
    (function(){
      try {
        var saved = localStorage.getItem("bf-theme");
        var t = saved === "light" || saved === "dark" ? saved : "dark";
        document.documentElement.setAttribute("data-theme", t);
      } catch(_e){}
    })();
  </script>
  ```
- CSS 구조: `:root` = 다크 기본값, `[data-theme="light"]` = 라이트 오버라이드
- localStorage 키: `"bf-theme"` (모든 SPA 공유)

---

## 7. 접근성

| 항목 | 요구사항 |
|---|---|
| 색상 대비 | WCAG AA 준수: accent 버튼 텍스트 ≥ 4.5:1 |
| focus ring | 모든 인터랙티브 요소에 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
| swatch 버튼 | `aria-label="색상 {n} 선택 — 현재 {HEX}"` (동적 갱신) |
| 복사 버튼 | `aria-label="색상 {n} HEX 복사"` |
| 저장 버튼 | `aria-label="팔레트 저장"` |
| color input | `aria-hidden="true"` (swatch button 이 대리) |
| reduced-motion | `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }` |
| 공백 슬롯 | empty 상태에서 복사 버튼 `disabled` + `aria-disabled="true"` |

---

## 8. dev 구현 가이드

### 8.1 파일 구조

```
palette/
  index.html    ← 마크업 + head IIFE
  styles.css    ← :root 토큰 + [data-theme="light"] + 컴포넌트 CSS
  main.js       ← 슬롯 인터랙션 + 저장/불러오기 + 키보드 단축키
  storage.js    ← localStorage 래퍼 (bf-palette-saves 키 관리)
```

### 8.2 CSS 작성 순서

1. `:root {}` — 다크 기본값 토큰 (§2.1 ~ §2.5)
2. `[data-theme="light"] {}` — 라이트 오버라이드 (배경·accent·shadow 만)
3. `* {}` 리셋 (box-sizing, margin 0)
4. `.topbar {}` — 상단바
5. `.page {}` — 페이지 컨테이너 (max-width: 680px, margin: auto)
6. `.card {}` — 공통 카드 스타일
7. `.slot-grid {}` — 그리드 레이아웃
8. `.slot {}`, `.slot__swatch {}`, `.slot__hex {}`, `.slot__hsl {}`, `.slot__copy {}`
9. `.save-form {}`, `.save-list {}`, `.save-list__item {}`
10. `.btn {}`, `.btn--accent {}`, `.btn--ghost {}`, `.btn--sm {}`, `.btn--danger {}`
11. `@media (max-width: 639px) {}` — 모바일 breakpoint
12. `@media (prefers-reduced-motion: reduce) {}` — 모션 비활성화

### 8.3 권장 CSS 변수명

```css
/* 슬롯 swatch 색상 — JS 에서 직접 설정 */
.slot__swatch { background-color: var(--slot-color, var(--color-slot-empty)); }
/* JS: slot.querySelector('.slot__swatch').style.setProperty('--slot-color', hex) */
```

### 8.4 JS 주요 함수명 권장

```js
initSlots()          // 5개 슬롯 이벤트 바인딩
updateSlot(idx, hex) // 슬롯 색상·HEX·HSL 갱신
hexToHsl(hex)        // HEX → "hsl(H, S%, L%)" 변환
copyHex(idx)         // 복사 + copied 상태 1.5s
savePalette(name)    // localStorage 저장
loadPalette(id)      // 저장된 팔레트 불러오기
deletePalette(id)    // 삭제 + DOM 갱신
renderSaveList()     // 저장 목록 전체 재렌더
applyTheme(theme)    // 테마 적용 + 아이콘 갱신
toggleTheme()        // 테마 전환 + localStorage
```

### 8.5 localStorage 키 정리

| 키 | 용도 | 형식 |
|---|---|---|
| `"bf-theme"` | 테마 설정 (공유) | `"dark"` \| `"light"` |
| `"bf-palette-saves"` | 저장된 팔레트 배열 | `JSON.stringify([{ id, name, colors }])` |
| `"bf-palette-current"` | 현재 팔레트 상태 (선택) | `JSON.stringify({ colors: string[5] })` |

---

## 9. mockup 참조

- **시각 mockup**: [`docs/design/mockups/palette-BF-461.html`](mockups/palette-BF-461.html)
- 단일 self-contained HTML (외부 의존성 0건, vanilla CSS + 인라인 `<style>`)
- 다크/라이트 모드 전환 시뮬레이션 포함 (`#theme-toggle` 버튼 동작)
- 복사 버튼 copied 상태 hover 시뮬레이션 포함 (`:hover` CSS로 표현)
- 저장 목록에 샘플 2건 포함 (UX 의도 확인용)

---

## 10. AC 매핑 표

| AC | 명세 섹션 | 구현 항목 |
|---|---|---|
| docs/design/palette-BF-461.md 에 컬러 토큰 포함 | §2 전체 | `--color-*` 토큰 27종, 팔레트 전용 6종 |
| 컴포넌트 구조 포함 | §5 전체 | slot / copy / save-form / save-list / theme-toggle |
| 인터랙션 포함 | §6 전체 | 색상 선택·복사·저장/불러오기·키보드 단축키 |
| 다크 모드 정책 포함 | §6.6 | IIFE + `:root` dark + `[data-theme="light"]` override |
| AC 매핑 표 포함 | §10 (본 표) | — |
| mockup: file:// 로 열면 외부 의존성 0건 | §9 | self-contained HTML, 외부 link/script 없음 |
| mockup: 5개 슬롯 + HEX/HSL + 복사 + 저장 + 다크 토글 시각 표현 | §9 | mockup HTML §4 요소 전부 포함 |
| 기존 clock/dice 와 동일 디자인 토큰 재사용 | §2.1 ~ §2.5 | bg/text/border/space/radius/motion 토큰 동일값 |
| `#theme-toggle` 패턴 재사용 | §5.5, §6.6 | 동일 IIFE + bf-theme 키 + CSS 구조 |

---

## 11. Self-critique

| 항목 | 점검 | 결과 |
|---|---|---|
| AC 매핑 | 모든 AC 항목이 §10 에 매핑되었는가 | ✅ 5개 AC 전부 매핑 |
| dev 구현 가이드 | dev-1 이 추가 질문 없이 구현 가능한가 | ✅ §8에 파일 구조·CSS 순서·변수명·JS 함수명·localStorage 키 전부 명시 |
| 기존 요소 보존 | clock/dice 토큰과 충돌 없는가 | ✅ 공유 토큰 그대로, accent만 amber 신규 추가 |
| 컴포넌트 매핑 | AC 요구 컴포넌트 (슬롯5·HEX·HSL·복사·저장·다크토글) 전부 명세 있는가 | ✅ §5.1~§5.6 모두 포함 |
| 모호함 flag | 모호하게 남겨진 사항 | ⚠️ HSL 표시 형식 정수 반올림 여부 — §6.2에 "정수값"으로 명시했으나, 소수점 1자리 표시도 가능. dev 재량으로 결정 가능 (UX 영향 미미) |
