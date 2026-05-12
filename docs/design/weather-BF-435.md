# 날씨 카드 SPA 디자인 명세 (BF-435)

> 관련 task: BF-436 (designer)
> mockup: [`docs/design/mockups/weather-BF-435.html`](mockups/weather-BF-435.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `weather/index.html` (URL 진입점 `/weather/`)
- 다크 우선 다중 카드 grid 레이아웃: **topbar (제목·테마 토글) → 도시 카드 grid (3 / 2 / 1 열)**
- 각 카드 구성: **이모지 아이콘 → 도시명 → 큰 온도 → 상태 텍스트 → 보조 메트릭 2종 (풍속·습도)**
- vanilla HTML / CSS / JS — 외부 CDN · SVG · 웹폰트 · `fetch()` 자가 로드 · ES module import **금지** (file:// CORS 안전)
- 토큰 시스템은 본 명세에서 새 페어 (`#0d1117` GitHub Dark canvas · `#38bdf8` sky accent) 를 정의 — 기존 SPA 토큰 (notepad/timer/stopwatch/kanban/pomodoro) 과 **이름 호환** 이지만 색 값은 모듈 자율 (§2.6 alias 정책)

### 1.2 사용자 경험 목표
- **다크 우선**: 첫 진입 시 `<html data-theme="dark">` default. 라이트는 토글로만. 다른 SPA 와 동일하게 `localStorage["bf-theme"]` 공유 — **단**, 저장값이 없으면 OS `prefers-color-scheme` 무시하고 **dark 강제** (날씨 카드 컬러풀 시그너처가 다크 위에서 가장 잘 살아남)
- **카드 한눈 인지**: 도시별 카드 1장에서 "지금 날씨" 를 1.5 초 안에 인지 — 이모지 (3rem · 48px) 가 시각 anchor, 온도 (3rem) 는 우측 정렬, 보조 메트릭은 한 줄로 압축
- **부드러운 등장**: 페이지 load 시 카드들이 **stagger 80ms 간격** 으로 fade-in (opacity 0→1, translateY 8px→0, 280ms `--ease-emphasized`)
- **hover lift**: 카드 hover 시 `transform: translateY(-4px)` + `box-shadow` 강화 (200ms — AC 명시 `transition 200ms`)
- **그리드 적응**: viewport 폭에 따라 자동 재배치 — `≥ 960px` 3열, `≥ 600px` 2열, `< 600px` 1열
- **키보드 단축**: `R` (refresh — 카드 상태 시각 갱신), `T` (테마 토글)

### 1.3 비목표 (Out of Scope)
- **실제 외부 API 연동** (OpenWeather / 기상청 등) — file:// 호환 위해 v1 은 **인메모리 정적 mock 데이터** 만. fetch / XHR / WebSocket 0건.
- **위치 기반 자동 도시 추가** (Geolocation API) — v1 은 도시 목록 하드코딩 (서울 / 도쿄 / 뉴욕 / 런던 / 시드니 / 두바이 등 6개)
- **시간별 / 7일 예보** — v1 은 "현재 시점" 1장 카드만. 후속 Epic
- **사용자 도시 추가 / 삭제 UI** — v1 은 read-only grid. 후속 Epic 에서 +Add 버튼
- **외부 폰트 CDN / 외부 SVG 아이콘** — 시스템 스택 + emoji 만 (AC 명시)
- **ES module import / `<script type="module">`** — `file://` CORS 차단되므로 단일 `<script src="main.js">` IIFE 패턴 (AC 명시)
- **알림 / 사운드** — 시각 표현만

---

## 2. 디자인 토큰

> 본 명세는 GitHub Dark 톤 (`#0d1117` canvas + `#161b22` surface) + Tailwind sky-400 accent (`#38bdf8`) 를 weather 시그너처로 채택. AC 에 직접 명시된 두 hex 값이 source of truth.

### 2.1 색상 토큰 (Dark / Light 페어)

| 토큰명 | Dark HEX | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | **`#0d1117`** | `#f6f8fa` | 페이지 전체 배경 (AC 명시) |
| `--color-bg-surface` | `#161b22` | `#ffffff` | 카드 표면 |
| `--color-bg-elevated` | `#1c222b` | `#f1f4f8` | 카드 hover 시 surface |
| `--color-bg-subtle` | `#21262d` | `#eaeef2` | divider zone / 보조 메트릭 chip 배경 |
| `--color-border-default` | `#30363d` | `#d0d7de` | 카드 1px 외곽선 |
| `--color-border-strong` | `#444c56` | `#afb8c1` | hover 시 border |
| `--color-text-primary` | `#e6edf3` | `#1f2328` | 온도·도시명 본문 |
| `--color-text-secondary` | `#9da7b3` | `#59636e` | 상태 텍스트·라벨 |
| `--color-text-muted` | `#6e7681` | `#848d97` | 보조 메트릭 라벨 (Wind / Humidity) |
| `--color-accent` | **`#38bdf8`** | `#0284c7` | 강조 색 — refresh 버튼·focus ring·온도 단위 °C (AC 명시) |
| `--color-accent-hover` | `#7dd3fc` | `#0369a1` | accent hover/active |
| `--color-accent-soft` | `rgba(56, 189, 248, 0.12)` | `rgba(2, 132, 199, 0.10)` | accent 배경 tint (chip / hover halo) |
| `--color-focus-ring` | `rgba(56, 189, 248, 0.55)` | `rgba(2, 132, 199, 0.45)` | 키보드 focus outline (2px) |
| `--color-shadow-card` | `rgba(0, 0, 0, 0.40)` | `rgba(15, 23, 42, 0.08)` | 카드 그림자 base |
| `--color-shadow-card-hover` | `rgba(0, 0, 0, 0.55)` | `rgba(15, 23, 42, 0.14)` | hover 시 그림자 강화 |

> **AC 직접 매핑**: `--color-bg-canvas: #0d1117` (dark) ✓, `--color-accent: #38bdf8` (dark) ✓ — 두 값은 `:root[data-theme="dark"]` 에 그대로 박힘. 라이트 페어는 GitHub light tone 으로 자연 매칭.

### 2.2 날씨 상태 시그너처 토큰 (선택 — 카드 이모지 halo)

| 상태 | 이모지 | halo 토큰 (`--state-*`) — Dark | halo Light | 비고 |
|---|---|---|---|---|
| sunny | ☀️ | `rgba(250, 204, 21, 0.16)` | `rgba(234, 179, 8, 0.14)` | warm yellow |
| cloudy | ☁️ | `rgba(148, 163, 184, 0.16)` | `rgba(100, 116, 139, 0.12)` | cool gray |
| rainy | 🌧️ | `rgba(96, 165, 250, 0.18)` | `rgba(59, 130, 246, 0.14)` | blue |
| snowy | ❄️ | `rgba(186, 230, 253, 0.20)` | `rgba(125, 211, 252, 0.18)` | ice blue |
| thunder | ⛈️ | `rgba(192, 132, 252, 0.18)` | `rgba(147, 51, 234, 0.14)` | violet |
| windy | 💨 | `rgba(45, 212, 191, 0.16)` | `rgba(13, 148, 136, 0.12)` | teal |

> halo 는 이모지 뒤 원형 배경으로만 사용 (`border-radius: 50%`, 64×64, opacity 보장된 rgba). 카드 본체 배경은 무관 — 색이 카드 톤을 흩뜨리지 않도록 16% 이하 opacity 사용.
> dev 가 카드 마크업에 `data-state="sunny"` 등 attribute 만 박으면 CSS 가 halo 자동 매핑.

### 2.3 공간 토큰

| 토큰명 | 값 | 비고 |
|---|---|---|
| `--space-1` | `4px` | |
| `--space-2` | `8px` | |
| `--space-3` | `12px` | 카드 내부 인접 요소 (이모지 ↔ 도시명) |
| `--space-4` | `16px` | 카드 padding 좌우 (모바일) |
| `--space-5` | `20px` | 카드 padding 좌우 (desktop) |
| `--space-6` | `24px` | 카드 내부 세로 stack gap |
| `--space-7` | `32px` | grid 외곽 padding |
| `--space-8` | `48px` | page top padding |

### 2.4 반경·그림자·모션

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--radius-sm` | `4px` | chip / kbd |
| `--radius-md` | `8px` | 버튼 / 보조 메트릭 chip |
| `--radius-lg` | `14px` | **카드 (weather card)** |
| `--radius-pill` | `999px` | refresh 버튼 (선택) |
| `--shadow-card` | `0 4px 14px var(--color-shadow-card)` | 카드 base |
| `--shadow-card-hover` | `0 10px 28px var(--color-shadow-card-hover)` | hover (translateY(-4px) 와 함께) |
| `--motion-fast` | `120ms` | press / 작은 hover |
| `--motion-mid` | **`200ms`** | **카드 hover lift transition (AC 명시)** |
| `--motion-slow` | `280ms` | 페이지 진입 fade-in |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 일반 easing |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1.2)` | 카드 등장 lift |

> **AC 직접 매핑**: `--motion-mid: 200ms` 가 카드 hover transition 의 source of truth. transform·box-shadow·border-color 모두 200ms 적용.

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | letter-spacing | 토큰 |
|---|---|---|---|---|---|
| heading-page | `20px` | `600` | `1.3` | `0` | `--text-h1` |
| **temperature (large)** | **`3rem` (48px)** | `300` | `1` | `-0.02em` | `--text-temp` |
| temperature unit (°C) | `1rem` (16px) | `500` | `1` | `0` | `--text-temp-unit` |
| city-name | `18px` | `600` | `1.3` | `0` | `--text-city` |
| state-label (Sunny / Cloudy 등) | `14px` | `500` | `1.4` | `0` | `--text-state` |
| metric-value (풍속 / 습도 수치) | `14px` | `600` | `1.3` | `0` | `--text-metric-val` |
| metric-label (Wind / Humidity) | `12px` | `500` | `1.3` | `0.04em` (uppercase) | `--text-metric-label` |
| body | `15px` | `400` | `1.65` | `0` | `--text-body` |
| caption | `12px` | `400` | `1.4` | `0` | `--text-caption` |
| button | `14px` | `500` | `1` | `0` | `--text-button` |

> **AC 매핑**: 이모지 크기는 §4.4 에서 `font-size: 3rem` 명시. temperature 도 동일 `3rem` 로 이모지·온도 양대 시각 anchor 의 크기를 통일 — grid 카드 시각 균형 확보.

---

## 4. 레이아웃 (와이어)

### 4.1 전체 그리드 (desktop ≥ 960px — 3 열)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌤  날씨                                       [⟳ 새로고침] [🌙]    │  topbar 56px
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │  ☀️               │  │  ☁️               │  │  🌧️              │  │
│   │  서울              │  │  도쿄              │  │  뉴욕             │  │
│   │      24°C         │  │      19°C         │  │      12°C        │  │
│   │  Sunny            │  │  Cloudy           │  │  Rainy           │  │
│   │  💨 3 m/s  💧 42% │  │  💨 2 m/s  💧 68% │  │  💨 5 m/s  💧 84%│  │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │  ☁️               │  │  ❄️               │  │  ☀️               │  │
│   │  런던              │  │  시드니             │  │  두바이            │  │
│   │      15°C         │  │      -2°C         │  │      36°C        │  │
│   │  Cloudy           │  │  Snowy            │  │  Sunny           │  │
│   │  💨 4 m/s  💧 72% │  │  💨 6 m/s  💧 51% │  │  💨 2 m/s  💧 18%│  │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│         <kbd>R</kbd> 새로고침 · <kbd>T</kbd> 테마                     │  hint
└─────────────────────────────────────────────────────────────────────┘
```

- 페이지 컨테이너: `max-width: 1120px`, 가운데 정렬, `padding: var(--space-8) var(--space-7)` (48px / 32px)
- grid 컨테이너: `display: grid`, `grid-template-columns: repeat(3, 1fr)`, `gap: var(--space-6)` (24px)
- 카드: `background: --color-bg-surface`, `border: 1px solid --color-border-default`, `border-radius: --radius-lg` (14px), `box-shadow: --shadow-card`, `padding: var(--space-6) var(--space-5)` (24 / 20)
- 카드 내부 세로 stack: `display: flex; flex-direction: column; gap: var(--space-3)` (12px)

### 4.2 Topbar (페이지 헤더)

```
[ 🌤 날씨 ]                                  [ ⟳ 새로고침 ]  [ 🌙 ]
```

- 높이 `56px`, `padding: 0 var(--space-7)` (32px), `background: --color-bg-canvas` (투명 동급 — 카드와 살짝 contrast), 하단 `1px solid var(--color-border-default)`
- 좌측: `🌤` 이모지 (1.5rem) + 제목 "날씨" (`--text-h1`)
- 우측 (gap `var(--space-3)` 12px):
  - **`⟳ 새로고침` 버튼** — `secondary` variant (§4.7) — 인메모리 mock 데이터 시각 재렌더 (stagger fade-in 재실행). v1 은 실제 데이터 갱신 없음 — UX 시뮬레이션 용도
  - **`🌙 / ☀` 다크 토글** — ghost button. notepad/timer/pomodoro 와 동일 패턴
- `aria-label` 명시: 새로고침 = "데이터 새로고침", 테마 토글 = "테마 전환"

### 4.3 그리드 반응형 (3 / 2 / 1 열 — AC 명시)

| breakpoint | 컬럼 | 카드 width | 카드 padding | 비고 |
|---|---|---|---|---|
| **`≥ 960px`** (desktop) | **3** | auto (= `(1120 - 64 - 48) / 3 ≈ 336px`) | `24px 20px` | 1.4.1 와이어와 동일 |
| **`≥ 600px` & `< 960px`** (tablet) | **2** | auto (`(viewport - 64 - 24) / 2`) | `24px 20px` | gap 유지 |
| **`< 600px`** (mobile) | **1** | `100%` (margin `var(--space-4)`) | `24px 16px` | grid 가 single column, gap `var(--space-4)` (16px), topbar padding `0 var(--space-4)` |

CSS:
```css
.grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 959px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 599px) {
  .grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}
```

> 또는 권장: `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` — viewport 분기 없이 자동 재배치. **v1 채택: 명시 분기** (예측 가능성·AC 검증 용이성 우선).

### 4.4 카드 본체 명세 (`<WeatherCard>`)

```
┌──────────────────────────────────────┐
│  ┌──────┐                            │
│  │  ☀️  │      서울                   │  ← 이모지 halo 64x64, 도시명 18/600
│  │      │                            │
│  └──────┘                            │
│                                      │
│                  24°C                │  ← 온도 3rem, 우측 정렬 또는 큰 stack
│                  Sunny               │  ← 상태 14/500 muted
│                                      │
│  ┌─────────┐  ┌─────────┐            │
│  │ 💨 3m/s │  │ 💧 42% │              │  ← 보조 메트릭 chip 2개
│  └─────────┘  └─────────┘            │
└──────────────────────────────────────┘
```

#### 4.4.1 이모지 아이콘 (AC 명시 — 3rem)

- 컨테이너: `display: inline-flex; align-items: center; justify-content: center`, `width: 64px; height: 64px`, `border-radius: 50%`, `background: var(--state-halo)` (상태별 §2.2)
- 이모지 자체: `font-size: 3rem` (= 48px) — **AC 매핑** ✓
- `line-height: 1`, `display: block`
- `aria-hidden="true"` — 의미 전달은 옆 텍스트 (Sunny / Cloudy) 가 담당. SR 가 이모지 글리프 읽지 않도록.
- 모바일에서도 3rem 유지 (1열 grid 에서 카드가 충분히 넓음)

#### 4.4.2 도시명

- 텍스트: `--text-city` (18px / 600), 색 `--color-text-primary`
- 위치: 이모지 우측, `display: flex; align-items: center; gap: var(--space-3)` (12px) 의 row 안
- 영문 도시명 (Tokyo / New York) 도 동일 — 폰트는 시스템 sans 가 적절 처리

#### 4.4.3 큰 온도 + 단위

- 컨테이너: `display: flex; align-items: baseline; gap: 2px`
- 온도 숫자: `--text-temp` (3rem · 48px · 300 weight, `--font-mono`, `tabular-nums`) — 자릿수 변동 (`5` ↔ `-12`) 시 흔들림 0
- 단위 `°C`: `--text-temp-unit` (1rem · 500 weight), `color: var(--color-accent)` — sky blue 로 살짝 액센트
- 음수 온도: 부호 `-` 도 동일 크기 (3rem). 색은 동일 `--color-text-primary` (`--color-accent` 변경 X — 데이터 의미가 아닌 시각 일관성 우선)

#### 4.4.4 상태 텍스트

- 텍스트: `--text-state` (14px / 500), 색 `--color-text-secondary`
- 라벨: `Sunny` / `Cloudy` / `Rainy` / `Snowy` / `Thunder` / `Windy` (영문 — 짧음·국제 표준)
- 한국어 병기 안 함 (v1 단순화). 후속에서 i18n 도입 시 변경

#### 4.4.5 보조 메트릭 (풍속 + 습도) chip 2 개

```
[ 💨  3 m/s ]   [ 💧  42% ]
```

- 컨테이너: `display: flex; gap: var(--space-2)` (8px), `flex-wrap: wrap`
- 각 chip:
  - `display: inline-flex; align-items: center; gap: var(--space-2)` (8px)
  - `padding: 6px 10px`, `border-radius: var(--radius-md)` (8px)
  - `background: var(--color-bg-subtle)`
  - 이모지 (`💨` / `💧`): `font-size: 1rem` (16px), `aria-hidden="true"`
  - 값: `--text-metric-val` (14px / 600), 색 `--color-text-primary`
  - 단위 (m/s / %): 동일 크기, 색 `--color-text-muted`
- 라벨 — 시각 라벨은 chip 옆에 노출하지 않음 (이모지로 충분). 단 SR 용 `aria-label="풍속 3 m/s"` / `aria-label="습도 42%"` 부여

### 4.5 카드 hover lift (AC 명시 — 200ms)

```css
.card {
  transition:
    transform var(--motion-mid) var(--ease-standard),
    box-shadow var(--motion-mid) var(--ease-standard),
    border-color var(--motion-mid) var(--ease-standard),
    background var(--motion-mid) var(--ease-standard);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-border-strong);
  background: var(--color-bg-elevated);
}
.card:active {
  transform: translateY(-2px);
}
```

- transition duration: **200ms** (`--motion-mid`) — AC 매핑 ✓
- transform: **`translateY(-4px)`** — 4px lift (카드 위로 뜸)
- shadow: base → hover 로 더 깊은 그림자 (offset y 4→10, blur 14→28)
- border-color: 미세하게 더 강한 색으로 (subtle reinforcement)
- `prefers-reduced-motion: reduce` 시: transform 비활성 (`transform: none`), shadow·border 만 유지

### 4.6 페이지 진입 fade-in (stagger)

```css
@keyframes card-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card {
  animation: card-enter var(--motion-slow) var(--ease-emphasized) both;
}
.card:nth-child(1) { animation-delay:   0ms; }
.card:nth-child(2) { animation-delay:  80ms; }
.card:nth-child(3) { animation-delay: 160ms; }
.card:nth-child(4) { animation-delay: 240ms; }
.card:nth-child(5) { animation-delay: 320ms; }
.card:nth-child(6) { animation-delay: 400ms; }
```

- duration: **280ms** (`--motion-slow`)
- offset: opacity 0→1, translateY 8px→0
- stagger: **80ms** 간격 (1~6 카드, 총 ~480ms 후 마지막 카드 등장 시작)
- `animation-fill-mode: both` — 시작 전 / 종료 후 상태 유지 (FOUC 차단)
- 새로고침 버튼 클릭 시 동일 animation 재실행: JS 가 `card` 클래스 제거 → reflow → 재추가 (3프레임 내) 로 재발화. 또는 `animation: none` → `void el.offsetWidth` → 원래 animation 복원.
- `prefers-reduced-motion: reduce` 시 animation 비활성, 카드 즉시 opacity 1 / translateY 0.

### 4.7 컨트롤 버튼 (Topbar)

#### 4.7.1 `⟳ 새로고침` (secondary)

- `height: 36px`, `padding: 0 var(--space-4)` (16px), `border-radius: var(--radius-md)` (8px)
- `background: transparent`, `border: 1px solid var(--color-border-default)`, `color: var(--color-text-primary)`, `font: var(--text-button)`
- 아이콘 `⟳`: `font-size: 14px`, `margin-right: var(--space-2)` (8px)
- hover: `background: var(--color-accent-soft)`, `border-color: var(--color-accent)`, `color: var(--color-accent)` — sky accent halo
- active: `transform: translateY(1px)`
- focus-visible: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- 클릭 시: §4.6 stagger fade-in animation 재실행 (시각 시뮬레이션). v1 은 mock 데이터 자체는 불변 — 새로고침 = "다시 본다" UX 시그널만

#### 4.7.2 `🌙 / ☀` 다크 토글 (ghost)

- `width: 36px`, `height: 36px`, `border-radius: var(--radius-md)`, `background: transparent`, `border: none`
- 이모지: `font-size: 18px`
- hover: `background: var(--color-bg-subtle)`
- 현재 dark 면 `🌙` 표시 (= "라이트로 전환 가능"), light 면 `☀`
- pomodoro/notepad 와 동일 패턴 — `bf-theme` localStorage 공유

### 4.8 키보드 단축 hint

- 위치: page 하단 가운데, grid 아래 `margin-top: var(--space-7)`
- 텍스트: `<kbd>R</kbd> 새로고침 · <kbd>T</kbd> 테마`
- 타이포: `--text-caption`, `--color-text-muted`
- `<kbd>` 스타일: `padding: 2px 6px`, `border: 1px solid var(--color-border-default)`, `border-radius: 3px`, `background: var(--color-bg-subtle)`, `font: 11px/1 var(--font-mono)`

### 4.9 빈 상태 (out of scope — 참고)

v1 은 도시 6개 하드코딩이므로 빈 상태 미발생. 후속 Epic 에서 도시 추가 / 삭제 UI 시 빈 grid placeholder 추가 예정 (별도 명세).

---

## 5. 컴포넌트 명세

### 5.1 `<WeatherCard>`
props:
- `city: string` (예: `"서울"`, `"Tokyo"`)
- `temperature: number` (정수 — 섭씨, `-30 ~ 50` 가정)
- `state: "sunny" | "cloudy" | "rainy" | "snowy" | "thunder" | "windy"`
- `stateLabel: string` (예: `"Sunny"` — 영문 capitalized)
- `windMps: number` (정수, 0~30)
- `humidityPct: number` (정수, 0~100)

명세: §4.4. `data-state` attribute 로 halo 색 자동 매핑 (§2.2).

마크업 권장:
```html
<article class="card" data-state="sunny" aria-label="서울 날씨">
  <header class="card__head">
    <span class="card__emoji" aria-hidden="true">☀️</span>
    <h2 class="card__city">서울</h2>
  </header>
  <div class="card__temp">
    <span class="card__temp-val">24</span><span class="card__temp-unit">°C</span>
  </div>
  <p class="card__state">Sunny</p>
  <div class="card__metrics">
    <span class="chip" aria-label="풍속 3 m/s">
      <span aria-hidden="true">💨</span>
      <span class="chip__val">3 m/s</span>
    </span>
    <span class="chip" aria-label="습도 42%">
      <span aria-hidden="true">💧</span>
      <span class="chip__val">42%</span>
    </span>
  </div>
</article>
```

### 5.2 `<WeatherGrid>` (컨테이너)
props:
- `cards: WeatherCardData[]` (v1 = 길이 6 고정)

명세: §4.1 / §4.3. CSS grid 자체. 자식 카드 6개에 stagger animation 자동 적용.

### 5.3 `<RefreshButton>`
props: `onRefresh()`

명세: §4.7.1. 클릭 시 grid 내 모든 카드 animation 재발화. v1 은 데이터 mutation 없음.

### 5.4 `<ThemeToggle>`
props: 없음 (DOM `<html data-theme>` 직접 토글)

명세: §4.7.2. `bf-theme` localStorage 공유, default `dark` (§6.5).

---

## 6. 상태·인터랙션 상세

### 6.1 상태 머신 (간소)

```
            ┌──────────────────────────────┐
            │  init (load)                  │
            │  - bf-theme 검증 → dark default │
            │  - 카드 6 개 DOM 생성            │
            │  - stagger fade-in (§4.6) 시작 │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  idle                         │
            │  카드 grid 정적 표시              │
            │  R / T 단축키 listen           │
            └──┬────────────────┬──────────┘
               │ R 또는 ⟳ click │ T 또는 🌙 click
               ▼                ▼
   ┌─────────────────────┐   ┌─────────────────────┐
   │ refresh             │   │ theme-toggle        │
   │ - card animation 재실행 │   │ - data-theme 변경     │
   │ - 280ms 후 idle 복귀  │   │ - localStorage 갱신   │
   └───────────┬─────────┘   └───────────┬─────────┘
               └────────────┬────────────┘
                            ▼
                          idle (반복)
```

### 6.2 키보드 단축

| 키 | 동작 | 비고 |
|---|---|---|
| `R` (대/소문자) | 새로고침 (= ⟳ 버튼 클릭 동등) | input 0개라 충돌 없음 |
| `T` (대/소문자) | 테마 토글 (dark ↔ light) | 다른 SPA 와 동일 |
| `Tab` / `Shift+Tab` | refresh → theme-toggle → 첫 카드 → 다음 카드 ... | 카드도 `tabindex="0"` 권장 (선택) — v1 은 카드를 navigable 로 만들지 않아도 무방 (interactive 동작 없음) |

> 카드 자체에 키보드 인터랙션 없음 (v1). 따라서 `<article>` 그대로 두고 `tabindex` 미부여 — 후속에서 카드 클릭으로 상세 보기 시 도입.

### 6.3 hover / focus / active

- 카드 hover: §4.5 (translateY(-4px), shadow 강화, border-color 강화)
- 카드 focus (만약 후속에서 navigable 화 되면): focus-visible 시 `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. v1 미적용.
- 버튼 hover / focus / active: §4.7 명시 그대로
- chip / 텍스트는 interactive 아님 — hover 효과 없음

### 6.4 모션 (`prefers-reduced-motion: reduce`)

```css
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
    transition: none;
  }
  .card:hover {
    transform: none;
  }
}
```

- 모든 transition·animation·hover transform 비활성
- 카드는 즉시 opacity 1 / translateY 0 으로 노출 (FOUC 없도록 `.card` base style 에 opacity 1 명시 + animation 이 from 단계로 가린 뒤 to 로 복귀 패턴 사용 시 reduce-motion 에서는 `animation: none` 으로 즉시 base style 유지)
- hover 시각 변화는 shadow / border-color 만 유지 — 위치 흔들림 0

### 6.5 다크 모드 default 정책

- 첫 진입 시: `localStorage["bf-theme"]` 검증
  - 저장값 `"dark"` → `<html data-theme="dark">`
  - 저장값 `"light"` → `<html data-theme="light">`
  - **저장값 없음** → `<html data-theme="dark">` **강제** (OS `prefers-color-scheme` 무시 — AC "다크 우선" 정책)
- 토글 (버튼 클릭 또는 `T` 키) 시: 현재 값 반전 + `localStorage.setItem("bf-theme", newValue)` (저장값 생성)
- 다른 SPA (notepad/timer/stopwatch/kanban/pomodoro) 와 키 공유 → 페이지 간 일관성 유지
- pomodoro 와 동일한 "저장값 없으면 dark 강제" 정책 — 다만 weather 는 "집중 모드" 의미 X, "컬러풀 카드 가독성" 이유. 의도는 다르지만 결과는 동일 (default dark)

### 6.6 새로고침 동작 (v1 시각 시뮬레이션)

- ⟳ 버튼 클릭 또는 `R` 키 입력 시:
  1. `grid` 자식 카드 전부에 일시적으로 `animation: none` → `void el.offsetWidth` (reflow trigger) → `animation: card-enter ...` 재할당
  2. 결과: §4.6 stagger fade-in 이 재실행됨 (시각적으로 카드들이 다시 "들어오는" 느낌)
- v1 은 데이터 mutation 없음 (mock 정적). 후속 Epic 에서 실제 API 호출 시 본 핸들러에 fetch 추가 + loading skeleton state 도입
- 동시 다발 클릭 방지: 새로고침 중 (animation 진행 중) 추가 클릭 무시 (debounce ~500ms)

### 6.7 인메모리 mock 데이터 (v1 — file:// 호환 보장)

v1 은 외부 fetch 0 건 — 데이터는 `main.js` 상단 상수로 박음:

```js
const CITIES = [
  { city: "서울",    temperature: 24, state: "sunny",   stateLabel: "Sunny",   windMps: 3, humidityPct: 42 },
  { city: "Tokyo",   temperature: 19, state: "cloudy",  stateLabel: "Cloudy",  windMps: 2, humidityPct: 68 },
  { city: "New York",temperature: 12, state: "rainy",   stateLabel: "Rainy",   windMps: 5, humidityPct: 84 },
  { city: "London",  temperature: 15, state: "cloudy",  stateLabel: "Cloudy",  windMps: 4, humidityPct: 72 },
  { city: "Sydney",  temperature: -2, state: "snowy",   stateLabel: "Snowy",   windMps: 6, humidityPct: 51 },
  { city: "Dubai",   temperature: 36, state: "sunny",   stateLabel: "Sunny",   windMps: 2, humidityPct: 18 },
];
```

- 도시명은 운영자 의도에 따라 한/영 혼용 OK (서울 + 영문) — i18n 추가 비용 0
- 본 데이터는 후속 Epic 에서 OpenWeather API 호출 결과로 교체 — 형식 (interface) 만 유지하면 호환

---

## 7. dev 구현 가이드 (developer step-by-step)

> 본 가이드는 developer 페르소나가 추가 질문 없이 따라할 수 있도록 작성. 클래스명·CSS 변수명은 권장 — 일관성 유지 시 변경 무관.

### 7.1 파일 구조 (권장)

```
/
├── weather/
│   ├── index.html       # weather SPA entry
│   ├── styles.css       # 본 명세의 토큰 + 레이아웃
│   └── main.js          # 카드 렌더 + theme + refresh + 단축키 (IIFE, 비-module)
├── notepad/  timer/  stopwatch/  kanban/  pomodoro/    # 기존 — 보존
└── docs/design/
    ├── weather-BF-435.md           (본 문서)
    └── mockups/weather-BF-435.html (시각 mockup)
```

> `storage.js` 별도 분리 불필요 — v1 은 mock 데이터 인메모리 + bf-theme 만 localStorage. `main.js` 인라인으로 충분.

### 7.2 HTML 골격 (권장 클래스명)

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>날씨</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="topbar">
      <h1 class="topbar__title"><span aria-hidden="true">🌤</span> 날씨</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--secondary" id="btn-refresh" aria-label="데이터 새로고침">
          <span aria-hidden="true">⟳</span> 새로고침
        </button>
        <button type="button" class="btn btn--ghost-icon" id="btn-theme" aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="page">
      <section class="grid" id="grid" aria-label="도시별 현재 날씨"></section>

      <p class="kbd-hint">
        <kbd>R</kbd> 새로고침 ·
        <kbd>T</kbd> 테마
      </p>
    </main>

    <script src="main.js"></script>
  </body>
</html>
```

> **AC 매핑 (CORS)**: `<script src="main.js">` — **`type="module"` 절대 금지** (file:// 차단). IIFE 또는 전역 함수만. `import` / `export` 키워드 사용 금지.

카드 6개는 JS 가 `CITIES` 상수 (§6.7) 를 순회하면서 `<article class="card">` 마크업 (§5.1) 을 `grid` 에 append.

### 7.3 CSS 변수 정의 위치

`weather/styles.css` 상단에 `:root` 블록 — §2 의 모든 토큰을 한 번에:

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* color — light (default fallback) */
  --color-bg-canvas: #f6f8fa;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f1f4f8;
  --color-bg-subtle: #eaeef2;
  --color-border-default: #d0d7de;
  --color-border-strong: #afb8c1;
  --color-text-primary: #1f2328;
  --color-text-secondary: #59636e;
  --color-text-muted: #848d97;
  --color-accent: #0284c7;
  --color-accent-hover: #0369a1;
  --color-accent-soft: rgba(2, 132, 199, 0.10);
  --color-focus-ring: rgba(2, 132, 199, 0.45);
  --color-shadow-card: rgba(15, 23, 42, 0.08);
  --color-shadow-card-hover: rgba(15, 23, 42, 0.14);

  /* state halo — light */
  --state-sunny:   rgba(234, 179, 8, 0.14);
  --state-cloudy:  rgba(100, 116, 139, 0.12);
  --state-rainy:   rgba(59, 130, 246, 0.14);
  --state-snowy:   rgba(125, 211, 252, 0.18);
  --state-thunder: rgba(147, 51, 234, 0.14);
  --state-windy:   rgba(13, 148, 136, 0.12);

  /* spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-7: 32px; --space-8: 48px;

  /* radius / shadow */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  --shadow-card: 0 4px 14px var(--color-shadow-card);
  --shadow-card-hover: 0 10px 28px var(--color-shadow-card-hover);

  /* motion */
  --motion-fast: 120ms;
  --motion-mid: 200ms;    /* AC: 카드 hover transition */
  --motion-slow: 280ms;   /* 진입 fade-in */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1.2);

  /* typography */
  --text-h1: 600 20px/1.3 var(--font-sans);
  --text-temp: 300 3rem/1 var(--font-mono);
  --text-temp-unit: 500 1rem/1 var(--font-sans);
  --text-city: 600 18px/1.3 var(--font-sans);
  --text-state: 500 14px/1.4 var(--font-sans);
  --text-metric-val: 600 14px/1.3 var(--font-sans);
  --text-metric-label: 500 12px/1.3 var(--font-sans);
  --text-body: 400 15px/1.65 var(--font-sans);
  --text-caption: 400 12px/1.4 var(--font-sans);
  --text-button: 500 14px/1 var(--font-sans);
}
[data-theme="dark"] {
  --color-bg-canvas: #0d1117;        /* AC */
  --color-bg-surface: #161b22;
  --color-bg-elevated: #1c222b;
  --color-bg-subtle: #21262d;
  --color-border-default: #30363d;
  --color-border-strong: #444c56;
  --color-text-primary: #e6edf3;
  --color-text-secondary: #9da7b3;
  --color-text-muted: #6e7681;
  --color-accent: #38bdf8;            /* AC */
  --color-accent-hover: #7dd3fc;
  --color-accent-soft: rgba(56, 189, 248, 0.12);
  --color-focus-ring: rgba(56, 189, 248, 0.55);
  --color-shadow-card: rgba(0, 0, 0, 0.40);
  --color-shadow-card-hover: rgba(0, 0, 0, 0.55);

  /* state halo — dark (밝은 글로우) */
  --state-sunny:   rgba(250, 204, 21, 0.16);
  --state-cloudy:  rgba(148, 163, 184, 0.16);
  --state-rainy:   rgba(96, 165, 250, 0.18);
  --state-snowy:   rgba(186, 230, 253, 0.20);
  --state-thunder: rgba(192, 132, 252, 0.18);
  --state-windy:   rgba(45, 212, 191, 0.16);
}
```

### 7.4 상태 halo 매핑 (data-attribute 패턴)

```css
.card[data-state="sunny"]   .card__emoji { background: var(--state-sunny); }
.card[data-state="cloudy"]  .card__emoji { background: var(--state-cloudy); }
.card[data-state="rainy"]   .card__emoji { background: var(--state-rainy); }
.card[data-state="snowy"]   .card__emoji { background: var(--state-snowy); }
.card[data-state="thunder"] .card__emoji { background: var(--state-thunder); }
.card[data-state="windy"]   .card__emoji { background: var(--state-windy); }
```

JS 는 `card.dataset.state = "sunny"` 만 박으면 CSS 가 halo 자동 적용. 후속에서 상태 변경 시 dataset 한 줄 변경.

### 7.5 단계별 구현 순서

1. **HTML 골격** (§7.2 그대로) + 빈 `styles.css` / `main.js`
2. **CSS 변수 + base reset** (`* { box-sizing: border-box; }`, body 토큰 적용, `data-theme="dark"` default)
3. **Topbar** (제목 + 새로고침 + 다크 토글) — 단순 flex 레이아웃
4. **grid 컨테이너** (§4.3 — `repeat(3, 1fr)` + 반응형 breakpoint 2개)
5. **카드 마크업 템플릿** (§5.1) — JS 에서 6번 반복 render
6. **이모지 halo + 상태별 색 매핑** (§7.4) — data-attribute CSS
7. **온도 + 단위** (§4.4.3) — flex baseline align
8. **보조 메트릭 chip 2개** (§4.4.5) — flex + bg-subtle
9. **카드 hover lift** (§4.5) — transition 200ms — AC 정량 일치
10. **stagger fade-in** (§4.6) — animation + nth-child delay
11. **새로고침 버튼 동작** (§6.6) — animation 재발화 (animation: none → reflow → 원복)
12. **다크 토글 + bf-theme localStorage 공유** (§6.5)
13. **키보드 단축** (§6.2) — `document.addEventListener("keydown")` 전역, R / T
14. **반응형 검증** (§4.3) — desktop / tablet / mobile 폭에서 3/2/1 열 자동 전환
15. **`prefers-reduced-motion` 가드** (§6.4) — transition·animation 비활성
16. **a11y 검증** (§7.6) — aria-label / aria-hidden / focus-visible

### 7.6 a11y 체크

- 이모지 (`☀️` / `💨` / `💧`): `aria-hidden="true"` — SR 가 글리프 안 읽음. 의미는 옆 텍스트 (Sunny / Cloudy / 풍속 등) 가 담당
- 카드 자체: `<article aria-label="서울 날씨">` — SR 가 카드 묶음 인식
- chip: `<span aria-label="풍속 3 m/s">` — 단위 포함된 SR 텍스트
- topbar 이모지 `🌤` (제목 옆): `aria-hidden="true"` — 제목 "날씨" 가 SR 텍스트
- 버튼: `aria-label="데이터 새로고침"` / `aria-label="테마 전환"`
- focus-visible only outline (`outline: 2px solid var(--color-focus-ring); outline-offset: 2px`)
- 색만으로 정보 전달 금지 — 상태는 항상 텍스트 (Sunny / Cloudy) 동반

### 7.7 CORS 안전성 (AC 매핑 — file:// 호환)

✅ 다음을 모두 **금지** 합니다 (그대로 지켜야 AC 통과):

| 항목 | 금지 사유 | 대체 |
|---|---|---|
| `<script type="module">` | file:// CORS 차단 | 단일 `<script src="main.js">` IIFE |
| `import` / `export` 키워드 | module syntax 사용 시 동일 | 전역 함수 또는 IIFE 내부 함수 |
| `fetch()` / `XMLHttpRequest` | file:// 의 same-origin 정책으로 데이터 로드 실패 | §6.7 인메모리 mock 상수 |
| 외부 CDN `<link rel="stylesheet">` | 외부 호출 발생 | 모든 CSS 는 `weather/styles.css` 한 파일 |
| `<link href="https://fonts.googleapis.com/...">` | 웹폰트 외부 호출 | 시스템 스택 (`var(--font-sans)`) |
| SVG `<img src="*.svg">` 또는 인라인 `<svg>` 외부 reference | AC: SVG 금지 | emoji 글리프 (`☀️`, `💨` 등) |
| `<iframe>` 외부 호출 | 외부 호출 | v1 비사용 |
| Service Worker 등록 | file:// 미지원 | v1 비사용 |

검증: 구현 완료 후 `file:///path/to/weather/index.html` 직접 열기 → DevTools console 의 에러 / warning **0건** + Network 탭에서 외부 호출 0건 (오직 same-folder `styles.css`, `main.js`).

### 7.8 정량 일치 기준 (구현 검증 — AC source of truth)

다음 값은 구현 시 정량 일치 필수 (reviewer 가 PR 검토 시 확인):

| 항목 | 값 (desktop ≥960) | 값 (tablet 600~959) | 값 (mobile <600) | 토큰 |
|---|---|---|---|---|
| page max-width | `1120px` | `1120px` | `100%` | hardcoded |
| page padding | `48px 32px` | `48px 32px` | `24px 16px` | `--space-8 --space-7` / `--space-6 --space-4` |
| **grid columns** | **3** | **2** | **1** | hardcoded (§4.3) — AC 명시 |
| grid gap | `24px` | `24px` | `16px` | `--space-6` / `--space-4` |
| 카드 radius | `14px` | `14px` | `14px` | `--radius-lg` |
| 카드 border | `1px solid var(--color-border-default)` | 동일 | 동일 | — |
| 카드 padding | `24px 20px` | `24px 20px` | `24px 16px` | `--space-6 --space-5` / `--space-6 --space-4` |
| 카드 내부 stack gap | `12px` | `12px` | `12px` | `--space-3` |
| 카드 shadow base | `0 4px 14px var(--color-shadow-card)` | 동일 | 동일 | `--shadow-card` |
| 카드 shadow hover | `0 10px 28px var(--color-shadow-card-hover)` | 동일 | 동일 | `--shadow-card-hover` |
| **이모지 font-size** | **`3rem` (48px)** | **`3rem`** | **`3rem`** | hardcoded — AC 명시 |
| 이모지 halo size | `64px × 64px` | 동일 | 동일 | hardcoded |
| 이모지 halo radius | `50%` (원형) | 동일 | 동일 | — |
| **온도 font-size** | **`3rem` (48px)** | **`3rem`** | **`3rem`** | `--text-temp` |
| 온도 font-family | `--font-mono` | 동일 | 동일 | — |
| 온도 `font-variant-numeric` | `tabular-nums` | 동일 | 동일 | — |
| 온도 unit °C font | `500 1rem/1` | 동일 | 동일 | `--text-temp-unit` |
| 도시명 font | `600 18px/1.3` | 동일 | 동일 | `--text-city` |
| 상태 텍스트 font | `500 14px/1.4` | 동일 | 동일 | `--text-state` |
| chip padding | `6px 10px` | 동일 | 동일 | hardcoded |
| chip radius | `8px` | 동일 | 동일 | `--radius-md` |
| chip gap (icon ↔ val) | `8px` | 동일 | 동일 | `--space-2` |
| **카드 hover transition** | **`200ms`** | 동일 | 동일 | `--motion-mid` — AC 명시 |
| **카드 hover translateY** | **`-4px`** | 동일 | 동일 | hardcoded — AC 명시 |
| 카드 fade-in duration | `280ms` | 동일 | 동일 | `--motion-slow` |
| **카드 fade-in stagger** | **`80ms`** | 동일 | 동일 | hardcoded — AC 명시 |
| 카드 fade-in translateY from | `8px` → `0` | 동일 | 동일 | hardcoded |
| 카드 fade-in easing | `cubic-bezier(0.2, 0, 0, 1.2)` | 동일 | 동일 | `--ease-emphasized` |
| refresh 버튼 height | `36px` | 동일 | 동일 | hardcoded |
| 다크 토글 width/height | `36px × 36px` | 동일 | 동일 | hardcoded |
| focus-ring outline | `2px solid` + `offset 2px` | 동일 | 동일 | `--color-focus-ring` |
| `--color-bg-canvas` (dark) | **`#0d1117`** | — | — | AC 명시 ✓ |
| `--color-accent` (dark) | **`#38bdf8`** | — | — | AC 명시 ✓ |

### 7.9 v1 하드코딩 상수

```js
const CITIES = [
  // §6.7 6 개 도시 데이터
];
const STAGGER_MS = 80;
const REFRESH_DEBOUNCE_MS = 500;
```

후속 Epic 에서 외부 API 도입 시 `CITIES` → fetch 결과로 교체.

---

## 8. shadcn/ui 매핑

본 프로젝트는 현 시점 shadcn/ui 미도입. 모든 UI 요소는 **vanilla HTML/CSS** 로 직접 구현. 후속 Epic 에서 shadcn 도입 시 매핑 참고:

| 본 명세 컴포넌트 | shadcn 대응 (참고) |
|---|---|
| `<WeatherCard>` | `Card` (`<Card>` + `<CardHeader>` + `<CardContent>`) — 본 명세의 hover lift 패턴은 shadcn Card 의 default 가 아니므로 변경 필요 |
| `<WeatherGrid>` | vanilla (grid container — shadcn 미제공) |
| `<RefreshButton>` | `Button` (`variant: outline`, `size: sm`) |
| chip (보조 메트릭) | `Badge` (`variant: secondary`) |
| 다크 토글 | vanilla (notepad/timer/pomodoro 와 공유 패턴) |

→ v1 은 vanilla 로 가되 클래스명·prop 명을 위 매핑과 호환되게 유지.

---

## 9. 기존 요소 보존 · 신규 페이지 head/footer 공통 요소 명시

> 본 명세는 **신규 페이지 추가** (`weather/`) 입니다. BF-197 회귀 정책 반영 — 기존 페이지의 head/공통 스크립트 복제 대상 explicit 명시.

### 9.1 보존 (건드리지 마라)

- `notepad/` (index.html, styles.css, main.js, storage.js, ulid.js) — 본 작업과 무관, 변경 금지
- `timer/` (index.html, styles.css, main.js, storage.js, timer.js) — 보존
- `stopwatch/` (index.html, styles.css, main.js, storage.js, stopwatch.js) — 보존
- `kanban/` (index.html, styles.css, main.js, storage.js, drag.js) — 보존
- `pomodoro/` (index.html, styles.css, main.js, storage.js, timer.js) — 보존
- 루트 `README.md` 의 기존 SPA 라우트 표 — 보존 (단, weather 행 1개 **추가** 는 OK — dev 가 본 명세 §11 따라 추가)
- 루트 `package.json` / `tests/*` — 본 designer 작업에서 변경 금지 (dev 가 BF-43X 후속 task 에서 weather 회귀 가드 추가 예정)

### 9.2 신규 `weather/index.html` 에 복제해야 할 공통 요소

| 항목 | 출처 (참고 페이지) | 복제 vs 신규 | 비고 |
|---|---|---|---|
| `<meta charset="UTF-8">` | pomodoro/index.html | **복제** | 모든 페이지 필수 |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | pomodoro/index.html | **복제** | 반응형 동작 전제 |
| `<html lang="ko" data-theme="…">` 패턴 | pomodoro/index.html | **복제 + 값 유지** (`dark`) | weather 도 default dark (§6.5) |
| `<link rel="stylesheet" href="styles.css">` | pomodoro/index.html | **복제** (경로 그대로 — `weather/styles.css`) | — |
| `<header class="topbar">` 구조 | pomodoro/index.html (단순 ver) | **복제 + actions 2 개 (refresh + theme-toggle)** | refresh 는 weather 신규 |
| `<script src="main.js">` (non-module) | pomodoro/index.html | **복제** (`type="module"` 절대 추가 금지) | **AC: type="module" 금지** |
| `:root` CSS 변수 블록 | pomodoro/styles.css (구조 참고) | **신규 (본 명세 §7.3)** | 본 명세에서 weather 시그너처 색 페어를 정의 — 다른 모듈과 hex 값 다름 (#0d1117 / #38bdf8). 변수명은 호환. |
| `bf-theme` localStorage 초기화 로직 | pomodoro/main.js theme init | **복제 + default "dark" 유지** | 저장값 없으면 dark 강제 (§6.5) |

### 9.3 추가 / 수정해야 할 부분 (weather 전용)

- weather grid + 카드 6 개 마크업 (§7.2 + JS 가 §5.1 템플릿 6 번 반복 render)
- weather 전용 색·typo·모션 토큰 (§2 / §7.3)
- 상태 halo 매핑 (§7.4) — `data-state` attribute CSS
- 카드 hover lift transition (§4.5) — 200ms AC 일치
- stagger fade-in animation (§4.6) — 80ms 간격
- 새로고침 동작 (§6.6) — animation 재발화
- 키보드 단축 R / T (§6.2)
- 반응형 grid 3/2/1 (§4.3)
- CORS 안전 (§7.7) — 비-module script, 외부 호출 0

### 9.4 README.md 라우트 표 1줄 추가 (선택 — dev 가 후속 task 에서)

본 designer PR 의 **범위 밖**. 운영자 / dev 가 후속 task (BF-437 dev) 에서 README 업데이트. 본 PR 은 `docs/design/` 경로만 변경 (AC: "docs/design 경로 외 변경이 없다" ✓).

> **혼동 차단**: §9.2 복제 항목은 dev 가 그대로 갖다 붙이고, §9.3 만 새로 작성. pomodoro/main.js 와 동일하게 비-module 패턴 유지. weather 의 `:root` 토큰 hex 값은 pomodoro 와 다름 (AC 직접 명시 `#0d1117` / `#38bdf8`) — 단순 복사 후 §7.3 hex 로 교체.

---

## 10. mockup 참조

[`docs/design/mockups/weather-BF-435.html`](mockups/weather-BF-435.html) — 본 명세의 시각 시뮬레이션.

- 단일 self-contained HTML (외부 의존성 0 — 시스템 폰트 + emoji 글리프만)
- **다크 / 라이트 두 패널 나란히** → 토큰 매핑 시각 검증
- 6 개 도시 카드 grid (desktop 3 열 기준) 두 테마 각각 표시
- mobile (< 600px) 1 열 레이아웃 미리보기 섹션 별도 포함
- hover lift / fade-in stagger 는 정적 캡처 이미지에서는 직접 보이지 않지만, mockup HTML 자체는 실제 CSS animation·transition 을 포함하므로 브라우저 직접 열기 시 시각 확인 가능

dev 는 mockup 을 **시각 참조** 로만 사용. 픽셀 단위 일치 의무 X — 본 markdown 의 §7.8 정량 일치 표가 source of truth.

---

## 11. AC (수용 기준) 매핑

| AC 항목 | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 다크/라이트 토큰 페어 정의 (`--color-bg-canvas: #0d1117`, `--color-accent: #38bdf8` 명시) | §2.1 색상 토큰 표 (Dark/Light 컬럼 분리, AC hex 값 굵게 강조), §7.3 `:root` 실제 코드 — `[data-theme="dark"]` 블록에 `#0d1117` / `#38bdf8` 박힘 | ✓ |
| 카드 grid 정량값 (3 / 2 / 1 열) | §4.3 반응형 표 (≥960 3열, ≥600 2열, <600 1열) + CSS 코드 블록 + §7.8 정량 표 (AC 명시 표기) | ✓ |
| 이모지 아이콘 3rem 크기 | §3 type 표 (`--text-temp` = 3rem), §4.4.1 이모지 명세 (`font-size: 3rem`, AC 매핑 표기), §7.8 정량 표 (AC 명시 표기) | ✓ |
| transition 200ms (카드 hover lift) | §2.4 motion 토큰 (`--motion-mid: 200ms`), §4.5 hover lift CSS (transition 200ms, transform translateY(-4px)), §7.8 정량 표 (AC 명시 표기) | ✓ |
| file:// 직접 열기 호환 (외부 CDN/SVG/웹폰트 금지, fetch/module import 금지) | §1.1 변경 범위, §1.3 out of scope (CDN / SVG / 웹폰트 / module 금지), §7.2 script 비-module 명시, §7.7 CORS 안전 표 (8 항목 금지·대체), §9.2 script 복제 시 type 제거 명시 | ✓ |
| DevTools console 에러 0건 + 외부 fetch/import/CDN 호출 0건 | §1.3 비목표 (외부 호출 0), §6.7 인메모리 mock 데이터 정책, §7.7 CORS 표 + 검증 절차 (file:// 직접 열기 후 console / Network 탭 확인) | ✓ |
| base=main + docs/design 경로 외 변경 없음 | §9.1 보존 목록 (기존 5 module + README + package.json + tests), §9.4 README 추가는 본 PR 범위 밖 명시 — designer PR 은 docs/design 2 파일만 변경 | ✓ |
| fade-in / fade-out · hover lift 미세 인터랙션 정량 | §4.5 hover lift (200ms, translateY -4px, shadow 강화), §4.6 fade-in (280ms, stagger 80ms, opacity 0→1, translateY 8→0), §7.8 정량 표 | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 AC 8 개 (토큰 페어 + 3/2/1 grid + 이모지 3rem + transition 200ms + file:// 호환 + console 에러 0 + base=main + 인터랙션 정량) 모두 cross-reference. 누락 0. |
| dev 구현 가이드 명확 | ✓ | §7 에 파일 구조 + HTML 골격 + CSS 변수 정의 + 상태 halo 매핑 + 16 단계 구현 순서 + §7.8 정량 일치 표 (desktop / tablet / mobile 분리) + §7.9 v1 상수 — dev 추가 질문 없이 진행 가능 |
| 기존 요소 보존 명시 | ✓ | §9.1 보존 (5 module 전체 + README + package.json + tests), §9.2 복제 대상 (script type 차이 explicit), §9.3 신규 작성 — BF-197 회귀 정책 반영. README 추가는 본 PR 범위 밖 (§9.4) — AC "docs/design 외 변경 없음" 정합. |
| shadcn/ui 매핑 | ✓ | §8 — v1 vanilla 명시, 후속 shadcn 도입 시 매핑 참고 표 |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 2건 |

추가 자체 점검:
- **AC hex 값 직접 명시**: `--color-bg-canvas: #0d1117` (dark) 와 `--color-accent: #38bdf8` (dark) 는 §2.1 토큰 표에 굵게 표기 + §7.3 `:root[data-theme="dark"]` 블록 실제 코드에 그대로 박힘 + §7.8 정량 표 마지막 두 행에 AC 명시 마크 — 3 곳에서 cross-verify ✓
- **3 / 2 / 1 열 정량**: §4.3 표 + CSS 코드 블록 + §7.8 정량 표 — viewport 분기 (≥960 / ≥600 / <600) 가 일관 ✓
- **이모지 vs 온도 둘 다 3rem**: 의도적 통일. grid 카드의 좌상 (이모지) / 우 (온도) 시각 anchor 가 동일 크기로 균형 — §4.4.1 / §4.4.3 둘 다 명시
- **200ms transition 적용 대상**: §4.5 에 transform·box-shadow·border-color·background 4 속성 모두 200ms 일치 — 인터랙션 시 비균질 motion 차단
- **stagger 80ms**: §4.6 에 nth-child 1~6 까지 delay 0/80/160/240/320/400ms — 마지막 카드 시작 시점 +400ms, 총 약 680ms 후 6번째 카드 완료. UX 적정 (지나치게 길지 않음)
- **file:// 호환 검증**: §7.7 표 8 항목 + 검증 절차 (DevTools console + Network 탭) — reviewer / tester 가 직접 검증 가능
- **mock 데이터 vs 실제 API**: §6.7 에 v1 인메모리 / 후속 API 교체 명시 — interface 호환 → 후속 마이그레이션 비용 최소
- **다크 default 정책**: §6.5 에 저장값 없으면 dark 강제 (OS prefers-color-scheme 무시) — pomodoro 와 동일 정책. 다른 SPA (notepad/timer/stopwatch/kanban) 와 `bf-theme` 키 공유 → 페이지 간 일관성
- **`prefers-reduced-motion` 가드**: §6.4 — animation·transition·hover transform 3 종 비활성 — a11y 정합
- **a11y**: §7.6 — 이모지 aria-hidden, 카드 article aria-label, chip aria-label, 색만으로 정보 전달 금지
- **focus 흐름**: 카드는 v1 에서 navigable 아님 (interactive 동작 없음) — Tab 순서 = refresh → theme-toggle. 후속에서 카드 상세 열기 도입 시 변경

---

## 13. 운영자 결정 필요

다음 항목은 designer 단독 판단보다 운영자 컨펌이 안전합니다 (default 채택 가능, 추후 변경 시 명시된 섹션만 수정):

1. **도시 6 개 vs 4 개 — v1 카드 수** — 본 명세 default 는 §6.7 6 개 (서울 / Tokyo / New York / London / Sydney / Dubai). 3 열 grid 가 2 행 으로 시각 균형. 4 개 (3+1) 또는 9 개 (3×3) 도 후보. **권장: 6 개 유지** — grid 시각 가독성 + stagger animation 길이 (~680ms) 적정.

2. **새로고침 동작 시 데이터 mutation 여부** — 본 명세 default 는 §6.6 시각 시뮬레이션만 (animation 재발화, 데이터 불변). "랜덤 offset ±2°C / ±10%" 으로 데이터 살짝 흔드는 방안도 후보 — 실제 API 도입 전 UX 시뮬레이션 강화. **권장: v1 시각만 유지** — 단순성 + 후속 API 도입 시 동일 핸들러에 fetch 자연 삽입 가능 (코드 마이그레이션 비용 0).
