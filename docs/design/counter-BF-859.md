# 카운터 데모 UI 디자인 명세 — BF-859

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-861 (본 designer task) · BF-859 (부모 스토리) · 의존: BF-860 (planner 기획 명세)
> 기획 명세(SSOT): `docs/plan/counter-BF-859.md`
> mockup 참조: `docs/design/counter-mockup.html`
> tech-stack: `vanilla-static` — 외부 의존성 0건, CSS 변수 자체 정의(기획 §0 가정 1)

---

## 0. 문서 성격 및 전제

- **본 문서는 기획 명세(`docs/plan/counter-BF-859.md`)의 하위 시각 명세다.** 기획이 고정한 **접근성 마크업 계약**(§6.3: `id`/태그/`aria-live`)·**0-플로어 클램프**·**키보드 조작 요건**은 재해석하지 않고 그대로 승계한다. 본 문서는 기획이 **디자이너에게 위임한 시각 요소**(기획 §11)만 정의한다.
- **tech-stack 준수:** 이 저장소의 신규 프론트엔드 모듈은 모두 `vanilla-static`(HTML/CSS/JS, `file://` 직접 실행)이다. 따라서 본 명세는 `design-tokens.json`(존재하지 않음)이 아닌 **자체 CSS 변수**를 정의하며, 기존 `timer`/`stopwatch`/`clock` 모듈이 공유해 온 토큰 팔레트를 **동일하게 채택**해 시각 일관성을 유지한다(신규 토큰 도입 최소화).
- **dev 재량 존중:** 기획 §0 가정 2 에 따라 dev 는 `counter/` 또는 `src/app/demo/counter/` 어디에 배치하든 무방하다. 본 명세의 CSS 변수명·클래스명은 **권장**이며 픽셀 단위 일치 의무는 없다(기획 §11).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [포커스 & 키보드 인터랙션 가이드](#6-포커스--키보드-인터랙션-가이드)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [AC ↔ 디자인 매핑](#9-ac--디자인-매핑)

---

## 1. 시안 개요

### 1.1 변경 범위

`/demo/counter` 신규 카운터 SPA 의 시각 디자인. 화면 중앙에 **단일 카드**를 놓고, 상단에 대형 값 표시 영역, 하단에 `+1`/`-1`/`초기화` 3버튼 컨트롤을 배치한다. 기획이 정의한 단일 상태(항상 조작 가능) UI 이므로 게임오버·에러 등 분기 화면은 없다(기획 §3.2).

### 1.2 사용자 경험 목표

| 목표 | 설계 반영 |
|---|---|
| **값이 즉시 눈에 들어온다** | 값 표시 영역을 display 급 대형 mono 숫자(`96px`)로 배치해 시선을 최상단에 고정 |
| **조작이 직관적이다** | `+1`(주 액션·accent) / `-1`(보조·surface) / `초기화`(위험톤 아님·subtle)로 시각 위계 부여 |
| **키보드만으로 완결된다** | 모든 컨트롤 네이티브 `<button>` + `:focus-visible` 링을 명확히 노출(기획 §6.1) |
| **가벼우면서 정돈됐다** | 기존 timer/clock 카드와 동일 토큰 → 데모 계열 시각 통일감 |
| **라이트/다크 모두 대응** | `prefers-color-scheme` 로 자동 전환(기존 모듈 관례) |

### 1.3 톤 & 무드

미니멀·중립(neutral gray canvas) + 단일 accent(파랑). 장식·그림자 과용 없이 **값과 버튼의 대비**로 정보 위계를 만든다.

---

## 2. 컬러 팔레트

> 기존 `timer`/`stopwatch`/`clock` 모듈과 **동일 토큰**을 승계한다(신규 색상 도입 없음 — Simplicity First). dev 는 아래 변수를 `:root` 에 정의한다.

### 2.1 라이트 테마 (`:root`, 기본)

| 역할 | 변수 | HEX | 용도 |
|---|---|---|---|
| Primary(accent) | `--color-accent` | `#3563e9` | `+1` 주 버튼 배경, 포커스 링 |
| Primary hover | `--color-accent-hover` | `#2a4fc0` | `+1` hover/active |
| Background(canvas) | `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| Surface | `--color-bg-surface` | `#ffffff` | 카드 배경, `-1` 버튼 배경 |
| Subtle | `--color-bg-subtle` | `#f1f1ef` | `초기화` 버튼 배경, 값 영역 배경 |
| Border | `--color-border-default` | `#e5e5e2` | 카드·버튼 외곽선 |
| Border strong | `--color-border-strong` | `#d0d0cc` | 버튼 hover 외곽선 |
| Text primary | `--color-text-primary` | `#1a1a19` | 값 숫자, 주요 라벨 |
| Text secondary | `--color-text-secondary` | `#6b6b66` | 캡션·보조 문구 |
| Text muted | `--color-text-muted` | `#9a9a93` | 힌트(단축키 안내) |
| Focus ring | `--color-focus-ring` | `rgba(53,99,233,0.45)` | `:focus-visible` outline |

> **참고 — accent/text/subtle 대비:** `#3563e9` 위 흰색 텍스트 대비 ≈ 5.0:1, subtle(`#f1f1ef`) 위 primary 텍스트(`#1a1a19`) ≈ 15:1 로 WCAG AA(4.5:1) 충족.

### 2.2 다크 테마 (`@media (prefers-color-scheme: dark)`)

| 역할 | 변수 | HEX |
|---|---|---|
| accent | `--color-accent` | `#5b82f0` |
| accent hover | `--color-accent-hover` | `#7596f3` |
| bg canvas | `--color-bg-canvas` | `#0f1115` |
| bg surface | `--color-bg-surface` | `#171a21` |
| bg subtle | `--color-bg-subtle` | `#1e222b` |
| border | `--color-border-default` | `#262b36` |
| border strong | `--color-border-strong` | `#3a4150` |
| text primary | `--color-text-primary` | `#e8e8e4` |
| text secondary | `--color-text-secondary` | `#9a9a93` |
| text muted | `--color-text-muted` | `#6b6b66` |
| focus ring | `--color-focus-ring` | `rgba(91,130,240,0.55)` |

> ⚠️ **`초기화` 는 위험(danger) 색을 쓰지 않는다.** 리셋은 파괴적 액션이 아니라 "0 으로 되돌리기"이며 기획상 항상 허용되는 무해한 조작이므로(기획 §2.1, AC-04), subtle/중립 톤으로 표현해 오인 클릭 공포를 만들지 않는다.

---

## 3. 타이포그래피

> 폰트는 **system stack**(외부 웹폰트 로드 없음 — `vanilla-static` 제약). 숫자는 자릿수 흔들림 방지를 위해 `--font-mono` 사용.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| 역할 | 변수 | 값 (weight size/line-height family) | 적용 |
|---|---|---|---|
| 페이지 제목(h1) | `--text-h1` | `600 20px/1.3 var(--font-sans)` | "카운터" 카드 타이틀 |
| 값 표시(display) | `--text-display` | `300 96px/1 var(--font-mono)` | `#counter-value` 대형 숫자 |
| 값 표시(모바일) | `--text-display-sm` | `300 72px/1 var(--font-mono)` | ≤480px 축소 |
| 버튼 라벨(대) | `--text-button-lg` | `600 18px/1 var(--font-sans)` | `+1`/`-1` 버튼 |
| 버튼 라벨(중) | `--text-button-md` | `500 15px/1 var(--font-sans)` | `초기화` 버튼 |
| 캡션 | `--text-caption` | `400 12px/1.4 var(--font-sans)` | 단축키 힌트 |

- **값 숫자는 `font-variant-numeric: tabular-nums`** 를 적용해 값이 바뀌어도 폭이 흔들리지 않게 한다.
- 값이 커져 자릿수가 늘어도(예: 9999) 카드 폭을 넘지 않도록 값 영역에 `min-width` 대신 `overflow` 안전 여백을 둔다(§4.3).

---

## 4. 레이아웃

### 4.1 섹션 구조

```
┌───────────────────────── page (bg-canvas, flex center) ─────────────────────────┐
│                                                                                   │
│        ┌──────────────── .counter-card (surface, radius-lg, shadow) ──────────┐  │
│        │  카운터                                              ← h1 (좌상단)      │  │
│        │                                                                        │  │
│        │                     ┌────────────────────┐                            │  │
│        │                     │        42          │  ← #counter-value (display) │  │
│        │                     └────────────────────┘                            │  │
│        │                                                                        │  │
│        │     ┌─────────┐    ┌─────────┐    ┌───────────┐                       │  │
│        │     │   -1    │    │   +1    │    │  초기화   │  ← .counter-controls   │  │
│        │     └─────────┘    └─────────┘    └───────────┘                       │  │
│        │                                                                        │  │
│        │   ↑ +1   ↓ -1   R 초기화        ← .counter-hint (caption, muted)      │  │
│        └────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

> **버튼 시각 순서 주의:** 화면상 좌→우 배치는 `-1` · `+1` · `초기화` 를 권장한다(−/+ 를 나란히 두어 증감 쌍을 인지시키고 리셋을 우측에 격리). 단, 기획 §6.3 이 **DOM 순서**를 `+1`→`-1`→`초기화`(Tab 순서)로 고정했으므로, **DOM 순서는 기획대로 두고 시각 순서만 CSS `order` 로 조정**한다(§7.4). Tab 포커스는 DOM 순서(`+1`→`-1`→`초기화`)를 따른다 — 기획 §6.1 계약 유지.

### 4.2 Spacing

| 구간 | 토큰 | 값 |
|---|---|---|
| 카드 내부 패딩 | `--space-6` | 32px |
| 카드 폭 | `min(92vw, 400px)` | 데스크탑 400px 고정, 모바일 92vw |
| h1 ↔ 값 영역 | `--space-6` | 32px |
| 값 영역 ↔ 버튼 행 | `--space-6` | 32px |
| 버튼 간 gap | `--space-3` | 12px |
| 버튼 행 ↔ 힌트 | `--space-5` | 24px |
| 값 영역 세로 패딩 | `--space-5` | 24px |

### 4.3 값 표시 영역

- 배경 `--color-bg-subtle`, `border-radius: var(--radius-md)`, 세로 패딩 `--space-5`.
- `text-align: center`, `tabular-nums`, `overflow-wrap: anywhere` (극단적 큰 값 방어).
- 값 변경 시 **미세 강조**: `transition: color var(--motion-fast)` 로 색 전환만(레이아웃 이동 없음). 큰 애니메이션 금지 — 기획 "즉시 반영"(§6.2) 원칙에 맞춰 지연을 주지 않는다.

### 4.4 Breakpoint 별 동작

| Breakpoint | 동작 |
|---|---|
| ≥ 481px (desktop/tablet) | 카드 400px, 값 `--text-display`(96px), 버튼 3개 가로 배치 |
| ≤ 480px (mobile) | 카드 92vw, 값 `--text-display-sm`(72px), 버튼 3개 가로 유지(폭 부족 시 `flex-wrap` 으로 `초기화` 가 다음 줄로) |
| 세로 아주 짧은 화면 | 카드가 세로 스크롤 안에서 중앙 정렬 유지(`min-height:100dvh` + flex center) |

- `prefers-reduced-motion: reduce` 시 모든 `transition` 제거(값 색 전환 포함).

---

## 5. 컴포넌트 명세

### 5.1 값 표시 (`#counter-value`)

| 속성 | 값 |
|---|---|
| 태그/계약 | `<output id="counter-value" aria-live="polite">0</output>` (기획 §6.3 고정 — 변경 금지) |
| 초기 콘텐츠 | `0` |
| 타이포 | `--text-display` (mono 300 96px), `tabular-nums` |
| 색 | `--color-text-primary` |
| 상태 | 단일(항상 표시). 값 변경 시 `color` 트랜지션만 |
| 인터랙션 | 없음(비포커스 요소) — 값은 버튼/키로만 변경 |

### 5.2 버튼 공통 (`.counter-btn`)

| 속성 | 값 |
|---|---|
| 태그 | 네이티브 `<button type="button">` (기획 §6.1 — `role="button"` div 금지) |
| 크기 | 최소 터치 타깃 `min-height: 48px`, 가로 패딩 `--space-5`(24px) |
| radius | `--radius-md` (8px) |
| 트랜지션 | `background/border/transform var(--motion-fast) var(--ease-out)` |
| hover | 배경 1단계 진하게 + `border-color: var(--color-border-strong)` |
| active | `transform: translateY(1px)` (눌림 피드백) |
| focus-visible | §6.4 포커스 링 (필수) |
| disabled | **사용 안 함** — 세 버튼 모두 항상 활성(기획 §3.2). `-1` 도 값 0 에서 비활성화하지 않음 |

### 5.3 버튼별 variant

| 버튼 | id | variant 클래스 | 배경 | 텍스트 | 위계 |
|---|---|---|---|---|---|
| `+1` | `btn-increment` | `.counter-btn--primary` | `--color-accent` | `#fff` | 주 액션(강조) |
| `-1` | `btn-decrement` | `.counter-btn--secondary` | `--color-bg-surface` + border | `--color-text-primary` | 보조 |
| `초기화` | `btn-reset` | `.counter-btn--ghost` | `--color-bg-subtle` | `--color-text-secondary` | 저강조(중립) |

- 라벨 문구: `+1` / `-1` / `초기화` (기획 §6.3 라벨 계약 유지). 아이콘은 선택 — 텍스트 라벨을 대체하지 않고 보조로만(스크린리더 라벨 훼손 방지).
- `+1`/`-1` 은 `--text-button-lg`, `초기화` 는 `--text-button-md`.

### 5.4 단축키 힌트 (`.counter-hint`)

| 속성 | 값 |
|---|---|
| 콘텐츠 | `↑ +1   ↓ -1   R 초기화` (전역 단축키 안내 — 기획 §6.1) |
| 타이포 | `--text-caption`, 색 `--color-text-muted` |
| 역할 | 순수 시각 힌트. 키 캡은 `<kbd>` 로 마크업 권장(시맨틱) |
| 접근성 | 장식성이나 `<kbd>` 로 키를 명시해 스크린리더도 읽을 수 있게 함 |

### 5.5 카드/제목

| 요소 | 명세 |
|---|---|
| `.counter-card` | `--color-bg-surface`, `border: 1px solid var(--color-border-default)`, `--radius-lg`(12px), `--shadow-card`, 패딩 `--space-6` |
| `h1` (제목) | "카운터", `--text-h1`, 색 `--color-text-primary`, 카드 좌상단 |

---

## 6. 포커스 & 키보드 인터랙션 가이드

> 기획 §6(접근성)의 **검증 가능 요건을 시각적으로 구현**하는 절. 계약 자체(키 매핑·즉시 반영)는 기획이 SSOT, 본 절은 **보이는 스타일**을 규정한다.

### 6.1 키보드 인터랙션 (기획 §6.1·§2.3 승계 — 시각 관점 요약)

| 입력 | 동작 | 시각 피드백 |
|---|---|---|
| `Tab` / `Shift+Tab` | `+1`→`-1`→`초기화` 포커스 이동(DOM 순서) | 포커스 링 노출(§6.4) |
| `Enter` / `Space` | 포커스된 버튼 실행 | 버튼 active 눌림 + 값 갱신 |
| `ArrowUp` | 전역 +1 | 값 색 전환 |
| `ArrowDown` | 전역 -1 | 값 색 전환 |
| `R` / `r` | 전역 초기화 | 값 색 전환 |

> DOM(Tab) 순서와 시각 순서가 다를 수 있음에 유의(§4.1). Tab 순서는 기획 계약(`+1`→`-1`→`초기화`)을 반드시 지키고, 시각 좌우 배치만 CSS `order` 로 조정한다.

### 6.2 포커스 링 스타일 (필수 — 숨김 금지)

```css
.counter-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}
```

- **`outline: none` 을 단독으로 쓰지 않는다**(기획 §6.1 검증 항목 — reviewer 정적 검사 대상). `:focus-visible` 로 키보드 포커스에만 링을 노출하고, 마우스 클릭 포커스에는 과한 링을 주지 않아 시각 노이즈를 줄인다.
- 포커스 링은 **버튼 variant 색과 무관하게 accent 링 통일** → 어떤 버튼이든 현재 포커스 위치가 한눈에 보인다.
- 대비: 링(accent) vs surface/canvas 배경 ≥ 3:1(WCAG 비텍스트 대비) 충족.

### 6.3 값 즉시 반영의 시각 표현

- 값 변경은 **레이아웃 이동 없는 색 전환**(`transition: color var(--motion-fast)`)만 사용. 숫자 슬라이드/카운트업 애니메이션 금지 — 기획 §6.2 "동기 즉시 반영"에 어긋나는 지연을 만들지 않기 위함.
- `prefers-reduced-motion: reduce` 시 색 전환도 제거.

### 6.4 포커스 순서 요약

1. (페이지 진입) — 자동 포커스는 **주지 않음**(기획 §13-4 권고: 스크린리더 사용자에게 예기치 않은 포커스 이동 방지). 첫 `Tab` 이 `+1` 에 도달.
2. `Tab` → `#btn-increment`(+1)
3. `Tab` → `#btn-decrement`(-1)
4. `Tab` → `#btn-reset`(초기화)
5. `Tab` → 페이지 밖(포커스 트랩 없음 — 기획 EC-08)

---

## 7. dev 구현 가이드

> dev-1 이 순서대로 따라 구현. CSS 변수명·클래스명은 **권장**(mockup 과 픽셀 일치 의무 없음, 기획 §11).

### 7.1 마크업 골격 (기획 §6.3 계약 + 시각 요소)

```html
<main class="counter-page">
  <section class="counter-card" aria-labelledby="counter-title">
    <h1 id="counter-title" class="counter-title">카운터</h1>

    <output id="counter-value" class="counter-value" aria-live="polite">0</output>

    <div class="counter-controls">
      <!-- DOM 순서 = Tab 순서: +1 → -1 → 초기화 (기획 §6.3 고정) -->
      <button type="button" id="btn-increment" class="counter-btn counter-btn--primary">+1</button>
      <button type="button" id="btn-decrement" class="counter-btn counter-btn--secondary">-1</button>
      <button type="button" id="btn-reset"     class="counter-btn counter-btn--ghost">초기화</button>
    </div>

    <p class="counter-hint">
      <kbd>↑</kbd> +1 &nbsp; <kbd>↓</kbd> -1 &nbsp; <kbd>R</kbd> 초기화
    </p>
  </section>
</main>
```

### 7.2 CSS 변수 정의 (권장 `:root`)

§2·§3 의 토큰을 `:root` 에 그대로 정의하고, 다크는 `@media (prefers-color-scheme: dark)` 로 override. 기존 `timer`/`clock` 의 `styles.css` 토큰 블록을 복제하면 일관성 확보(신규 토큰 추가 불필요).

### 7.3 레이아웃 핵심

```css
.counter-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-canvas);
  padding: var(--space-5);
}
.counter-card {
  width: min(92vw, 400px);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
}
.counter-value {
  display: block;
  text-align: center;
  font: var(--text-display);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-5) var(--space-4);
  margin: var(--space-6) 0;
  transition: color var(--motion-fast) var(--ease-out);
}
.counter-controls {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}
```

### 7.4 시각 순서 vs DOM 순서

- DOM 순서는 기획 계약(`+1`→`-1`→`초기화`)을 **유지**한다.
- 화면 좌우 배치를 `-1` · `+1` · `초기화` 로 하려면 `.counter-controls` 에 CSS `order` 사용:

```css
#btn-decrement { order: 1; }
#btn-increment { order: 2; }
#btn-reset     { order: 3; }
```

> ⚠️ `order` 는 **시각 순서만** 바꾸고 Tab(포커스) 순서는 DOM 순서를 따른다. 시각 순서와 Tab 순서 불일치가 접근성상 혼란을 준다고 판단되면, **DOM 순서 그대로(+1·-1·초기화) 좌→우 배치**하고 `order` 를 생략해도 무방하다(dev 재량). mockup 은 DOM 순서 그대로 배치한 안을 기본 시안으로 제시한다.

### 7.5 포커스/모션

- §6.2 포커스 링 CSS 필수 적용. `outline:none` 단독 사용 금지.
- `@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`.

### 7.6 하지 말 것

- 값 카운트업/슬라이드 애니메이션 금지(즉시 반영 원칙).
- `초기화` 에 danger 색·확인 모달 금지(무해한 조작).
- 버튼 텍스트 라벨을 아이콘만으로 대체 금지(스크린리더).
- 외부 폰트/CDN/라이브러리 로드 금지(`vanilla-static`).

---

## 8. mockup 참조

- **파일:** `docs/design/counter-mockup.html`
- **내용:** 단일 self-contained HTML. 라이트/다크 두 프레임 + 값 0 / 값 42(큰 값) / 포커스 상태 시연 섹션 포함. 인라인 `<style>` 로 §2·§3 토큰 정의, 외부 의존성 0건.
- **성격:** 시각 시뮬레이션용. dev 는 참조 가이드로 사용하되 픽셀 단위 일치 의무 없음(기획 §11).

---

## 9. AC ↔ 디자인 매핑

| 기획/task AC | 디자인 반영 |
|---|---|
| AC-01 초기값 0 표시 | §5.1 `#counter-value` 초기 콘텐츠 `0`, display 타이포 |
| AC-02 `+1` 즉시 반영 | §5.3 primary 버튼 + §6.3 색 전환(지연 없음) |
| AC-03 `-1` 즉시 반영·0-플로어 | §5.2 `-1` 값 0 에서도 비활성화 안 함(클램프는 로직, 버튼 항상 활성) |
| AC-04 `초기화` 항상 허용 | §5.3 ghost 버튼(danger 아님), 항상 활성 |
| AC-05 키보드 전체 조작 | §6.1 키맵 + §6.2 포커스 링 + §6.4 Tab 순서 |
| AC-06 외부 의존성 0 | §3 system font, §7.6 CDN/라이브러리 금지 |
| task AC "레이아웃·버튼·포커스/키보드 스타일 토큰 정의" | §2~§6 전체 |
| task AC "mockup 으로 시각 확인" | §8 + `docs/design/counter-mockup.html` |

---

## 10. Self-critique

PR commit 직전 자기 점검 (5개 항목):

1. **AC 매핑 완결성** — task AC 2건(디자인 명세 토큰 정의 / mockup 시각 확인) 및 기획 AC-01~06 을 §9 표로 전수 매핑. ✅
2. **dev 구현 가이드 구체성** — §7 에 마크업 골격·CSS 변수·레이아웃·포커스·order·금지 항목까지 복붙 가능한 수준으로 제공. ✅
3. **기존 요소 보존** — 신규 모듈이라 기존 UI 파괴 없음. 기획 §6.3 마크업 계약(id/aria-live)·0-플로어·Tab 순서를 **변경 없이 승계**(§0, §4.1, §7.1). `src/counter.ts`(BF-760) 미접촉. ✅
4. **컴포넌트 매핑** — 값 표시/버튼(3 variant)/힌트/카드/제목 5개 컴포넌트 각각 props·상태·인터랙션 명세(§5). 기획이 고정한 id 와 1:1 대응. ✅
5. **모호함 flag** — (a) 버튼 **시각 순서 vs DOM(Tab) 순서** 불일치 가능성을 §4.1·§7.4 에서 명시하고 dev 재량 선택지 제공. (b) 자동 포커스는 기획 §13-4 권고대로 "주지 않음"으로 결정(§6.4). (c) 아이콘 사용은 선택(텍스트 라벨 유지 조건). 추가로 운영자 확인이 필요한 신규 모호함은 없음 — 기획 §13 미해결 항목은 로직 계약 영역이라 디자인에 영향 없음. ✅

---

*문서 종료 — [이디자인] · BF-861*
