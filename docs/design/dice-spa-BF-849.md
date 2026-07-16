# 주사위 굴리기 SPA 디자인 명세 — BF-849

> 작성자: 이디자인 (designer)
> 작성일: 2026-07-16
> 관련 티켓: BF-849 (본 designer 작업) · 선행 planner 명세: `docs/spec/dice-roll-BF-848.md`
> 기반 모듈: `dice/` (index.html / main.js / storage.js / styles.css) — URL 진입점 `/dice`
> 원 디자인 명세: `docs/design/dice-BF-446.md` (토큰 시스템·레이아웃 baseline)
> mockup: [`docs/design/mockups/dice-spa-BF-849.html`](mockups/dice-spa-BF-849.html)

---

## 0. 문서 성격 (정제 모드 — Think Before Coding)

본 명세는 **신규 화면 설계가 아니다.** `dice/` SPA 는 BF-446(디자인)·BF-448(구현)·BF-450(테스트)을 거쳐 이미 동작 중이며,
BF-848 planner 가 핵심 상호작용 4개 항목(숫자 표시·굴리기 버튼·키보드·모바일 잘림)을 검증 가능한 AC 로 확정했다.

본 designer 작업(BF-849)은 그 확정 AC 를 **디자인 명세 계층에서 시각적으로 고정**한다:

1. **기존 디자인 토큰·공용 버튼만 사용** — 신규 토큰/색상/컴포넌트 도입 금지 (아래 §2, §5 는 현행 `dice/styles.css` 를 그대로 문서화한 것)
2. **데스크톱/모바일 레이아웃 (잘림 없음)** — 320~414px 모바일에서 가로 잘림·요소 넘침이 없는 반응형 규칙을 §4 에 명시
3. **키보드 포커스 시각 상태** — 굴리기 버튼·개수 버튼·히스토리 row·테마 토글의 `:focus-visible` 시각 상태를 §5 에 명시

> **가정 명시**: 현재 `dice/` 구현이 정답(source of truth)이다. 본 명세의 토큰/클래스명은 현행 코드와 1:1 일치하며,
> dev 는 본 명세와 mockup 을 회귀 기준선으로 사용하되 **새 구현을 만들 필요가 없다** — 잘림/포커스 회귀가 발견될 때만 수정한다.
> 만약 운영자 의도가 "전면 재디자인"이라면 본 문서 범위와 다르므로 별도 지시가 필요하다 (§8 모호함 flag 참조).

---

## 1. 시안 개요

### 1.1 변경 범위
- `dice/` 단일 카드 SPA 의 **상호작용 4개 AC** (BF-848 §3~§6) 를 디자인 명세로 시각화
- 레이아웃 구조 (topbar → 주사위 카드 → 통계 카드 → 히스토리 카드 → kbd 힌트) 는 현행 유지
- **다크 우선** (`data-theme="dark"` default) — 라이트는 토글로만 전환
- vanilla HTML/CSS/JS — 외부 CDN·이미지·폰트·애니메이션 라이브러리 0건 (file:// CORS 안전)

### 1.2 사용자 경험 목표
- **결과 즉시 명료**: 주사위 눈은 유니코드 글리프(`⚀ ⚁ ⚂ ⚃ ⚄ ⚅`)로 표시, 합계는 별도 강조 typo 로 시선 최소화
- **잘림 제로**: 개수 1~5 어떤 조합에서도 320px 폭에서 가로 스크롤·요소 절단이 발생하지 않는다 (`flex-wrap` + 반응형 축소)
- **키보드 접근성 가시화**: 모든 인터랙티브 요소가 Tab 순서 안에서 포커스 가능하고, 포커스 시 `--color-focus-ring` 아웃라인이 명확히 보인다
- **연타 방지 피드백**: 굴림 진행 중 버튼은 `disabled`(cursor: progress) 로 전환되어 중복 클릭을 시각적으로 차단

### 1.3 비목표 (Out of Scope — BF-848 §8 준수)
- **저장/API/외부 이미지/애니메이션 라이브러리** 신규 도입 금지
- 통계 계산 로직·히스토리 적재 로직 재설계 금지 (시각/상호작용 계층만 다룸)
- 신규 디자인 토큰 추가 금지 — 아래 §2 는 전량 기존 토큰

---

## 2. 컬러 팔레트 (기존 토큰 재사용 — 신규 0건)

> **출처**: `dice/styles.css :root` / `[data-theme="light"]` 를 그대로 문서화. 본 작업은 값을 **추가·변경하지 않는다.**

### 2.1 다크 (default)

| 토큰명 | HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0d1117` | 페이지 배경 · 주사위 타일 안쪽 |
| `--color-bg-surface` | `#161b22` | 카드 표면 (주사위/통계/히스토리) · topbar |
| `--color-bg-subtle` | `#1f2530` | 개수 그룹 배경 · hover · 히스토리 stripe |
| `--color-border-default` | `#262c36` | 카드 구분선 · 주사위 타일 테두리 |
| `--color-border-strong` | `#3a4150` | ghost 버튼 아웃라인 |
| `--color-text-primary` | `#e8e8e4` | 본문 · 통계 값 |
| `--color-text-secondary` | `#9a9a93` | 라벨 · 캡션 |
| `--color-text-muted` | `#6b6b66` | empty 안내 · kbd 힌트 |
| **`--color-accent`** | **`#fb7185`** (rose-400) | 굴리기 CTA · 선택된 개수 버튼 · 포커스 강조 |
| `--color-accent-hover` | `#fda4af` | CTA hover |
| `--color-accent-active` | `#f43f5e` | CTA active |
| `--color-accent-on` | `#0d1117` | accent 위 텍스트 |
| `--color-danger` | `#e55858` | 삭제 액션 |
| **`--color-focus-ring`** | **`rgba(251,113,133,0.55)`** | **모든 `:focus-visible` 아웃라인 (핵심 — §5)** |

### 2.2 라이트 (`[data-theme="light"]`)

| 토큰명 | HEX |
|---|---|
| `--color-bg-canvas` | `#fafaf9` |
| `--color-bg-surface` | `#ffffff` |
| `--color-bg-subtle` | `#f1f1ef` |
| `--color-accent` | `#e11d48` (rose-600) |
| `--color-focus-ring` | `rgba(225,29,72,0.45)` |
| `--color-text-primary` | `#1a1a19` |

> 라이트/다크 모두 accent 는 rose 스케일 표준 쌍(rose-400 ↔ rose-600). 포커스 링은 accent 계열 반투명으로 배경 대비 확보.

---

## 3. 타이포그래피 (기존 토큰 재사용)

| 역할 | 토큰 | 값 (font weight size/line family) |
|---|---|---|
| 페이지 타이틀 (h1) | `--text-h1` | `600 20px/1.3 sans` |
| 주사위 글리프 (데스크톱 ≥640px) | `--text-dice` | `400 5rem/1 emoji` |
| 주사위 글리프 (모바일 <640px) | `--text-dice-sm` | `400 4rem/1 emoji` |
| 합계 강조 | `--text-sum` | `300 3rem/1 mono` |
| 통계 값 | `--text-stat` | `500 1.25rem/1.2 mono` |
| 통계/섹션 라벨 | `--text-stat-label` | `500 12px/1.4 sans` (uppercase, letter-spacing 0.06em) |
| 굴리기 CTA | `--text-roll-cta` | `600 18px/1 sans` |
| 히스토리 row | `--text-history` | `500 14px/1.4 sans` |
| 캡션/kbd 힌트 | `--text-caption` | `400 12px/1.4 sans` |

- 폰트 스택: `--font-sans` (system-ui 기반), `--font-mono` (숫자 tabular-nums), `--font-emoji` (주사위 글리프 전용) — 전부 시스템/유니코드, 외부 CDN 없음
- 숫자(합계/평균/최대/히스토리 index·sum)는 `font-variant-numeric: tabular-nums` 로 폭 고정 → 값 변동 시 레이아웃 흔들림 없음

---

## 4. 레이아웃 (데스크톱/모바일 — 잘림 없음)

### 4.1 구조 (세로 스택, 카드 중앙 정렬)

```
┌─ topbar (h56) ── "주사위" ─────────── [🌙 테마] ─┐
│                                                  │
│  ┌─ .card.dice-card (max-width 520) ──────────┐  │
│  │  [개수] ( 1  [2]  3  4  5 )   ← radiogroup │  │
│  │                                            │  │
│  │      ┌────┐  ┌────┐   ← .dice-box          │  │
│  │      │ ⚂  │  │ ⚄  │     (flex-wrap)         │  │
│  │      └────┘  └────┘                         │  │
│  │                                            │  │
│  │        [ 🎲 굴리기 ]  ← .roll-button        │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ .card.stats-card ─────────────────────────┐  │
│  │  합계          8   ← --text-sum (accent)   │  │
│  │  평균         4.0                            │  │
│  │  최대          5                            │  │
│  └────────────────────────────────────────────┘  │
│  ┌─ .card.history-card ───────────────────────┐  │
│  │  히스토리                      [⌫ 전체 삭제] │  │
│  │  #3   ⚂ ⚄        합 8                        │  │
│  │  #2   ⚀ ⚅        합 7                        │  │
│  └────────────────────────────────────────────┘  │
│   Space 굴리기 · 1–5 개수 · T 테마  ← kbd-hint     │
└──────────────────────────────────────────────────┘
```

### 4.2 spacing / 컨테이너

- 페이지 패딩: 데스크톱 `--space-7 --space-5` (48/24px) → 모바일 `--space-5 --space-4` (24/16px)
- 카드 간격: `--space-5` (24px), 카드 `max-width: 520px`, `width: 100%`
- 카드 내부 패딩: dice-card `--space-6`(32px) → 모바일 `--space-5`(24px)

### 4.3 반응형 breakpoint 별 동작 (BF-848 §6 — 잘림 없음 핵심)

| Breakpoint | 주사위 타일 | 굴리기 버튼 | 카드 패딩 | 히스토리 grid |
|---|---|---|---|---|
| **≥640px (데스크톱/태블릿)** | 96×96, 글리프 5rem | `min-width 200px`, h56 | 32px | `48px 1fr auto` |
| **≤639px (모바일)** | 80×80, 글리프 4rem | `min-width 100%` (풀폭), h52 | 24px | `40px 1fr auto` |
| **≤359px (초소형)** | 72×72 | h48 | 24px | `40px 1fr auto` |

**잘림 방지 규칙 (필수):**
1. `.dice-box { flex-wrap: wrap; justify-content: center; }` — 5개 주사위가 폭을 초과하면 **줄바꿈**(절단 아님). BF-848 EC-04 = 정상 동작.
2. 어떤 요소에도 `overflow: hidden` 으로 인한 콘텐츠 물리적 절단이 없어야 한다 (세로 스크롤은 잘림 아님 — BF-848 §6-4).
3. `document.documentElement.scrollWidth <= window.innerWidth` — 가로 스크롤 금지. 320~414px 전 구간 + 개수 1~5 전부에서 성립.
4. 굴리기 버튼 텍스트("🎲 굴리기")는 `white-space` 기본값에서도 한 줄에 들어가며, 모바일에서 풀폭이라 말줄임 없음.
5. 320px 미만은 명시적 범위 밖 (BF-848 EC-01).

---

## 5. 컴포넌트 명세 (props / 상태 / 인터랙션)

> 아래 클래스명·상태는 현행 `dice/index.html` + `dice/styles.css` 와 1:1 일치. dev 는 이 표를 회귀 체크리스트로 사용.

### 5.1 굴리기 버튼 `.roll-button#btn-roll`

| 항목 | 값 |
|---|---|
| 마크업 | `<button type="button" id="btn-roll" aria-label="주사위 굴리기">🎲 굴리기</button>` |
| 크기 | h56 (데스크톱) / h52 (≤639px) / h48 (≤359px), `min-width` 200px→100% |
| 배경 | `--color-accent`, 텍스트 `--color-accent-on`, `box-shadow: --shadow-roll` |

**상태별 시각 (핵심 — 5개 상태 모두 명시):**

| 상태 | 시각 |
|---|---|
| **default** | accent 배경 + rose glow shadow |
| **hover** (`:hover:not(:disabled)`) | 배경 `--color-accent-hover`, `translateY(-1px)` |
| **active** (`:active`, `.is-pressed`) | 배경 `--color-accent-active`, `scale(0.95)`, shadow 축소 |
| **disabled** (굴림 진행 중) | `opacity: 0.6`, `cursor: progress` — 연타 방지 (BF-848 §4-2) |
| **focus-visible** (키보드) | `outline: 2px solid var(--color-focus-ring); outline-offset: 3px` ★ |

- 굴림 흐름(BF-848 §4-1): 클릭 → 즉시 `disabled` → `.dice-box.is-rolling` 위글 애니메이션 → 결과 커밋 → `disabled` 해제
- `prefers-reduced-motion: reduce` (BF-848 §4-4): 위글/transform 생략, 상태 전이(disabled→enabled)는 동일 유지

### 5.2 주사위 박스 `.dice-box#dice-box` + 타일 `.dice`

| 항목 | 값 |
|---|---|
| 컨테이너 | `role="group" aria-label="주사위 결과"`, `flex-wrap`, `gap --space-4`, `min-height 96px` |
| 타일 | `role="img" aria-label="주사위 {값}"`, 96×96(→80→72), `--radius-dice`(16px), 배경 `--color-bg-canvas` + 테두리 |
| 글리프 | `⚀ ⚁ ⚂ ⚃ ⚄ ⚅` 만 (1~6 매핑). 0/7+/음수/소수/NaN 표시 금지 (BF-848 §3-1) |
| 개수 | 선택된 N(1~5) 과 정확히 일치 (BF-848 §3-2) |
| 굴림 중 | `.dice-box.is-rolling .dice` → `dice-wiggle 360ms` (reduced-motion 시 none) |

### 5.3 개수 선택 `.dice-count__btn` (radiogroup)

| 항목 | 값 |
|---|---|
| 마크업 | `role="radio" aria-checked` 버튼 5개(1~5), 컨테이너 `role="radiogroup"` |
| 선택됨 | `[aria-checked="true"]` → 배경 `--color-accent`, 텍스트 `--color-accent-on` |
| hover | `:hover:not([aria-checked="true"])` → 배경 `--color-bg-canvas` |
| **focus-visible** | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` ★ |

### 5.4 히스토리 row `.history-row` (button)

| 항목 | 값 |
|---|---|
| 마크업 | `<button>` grid `48px 1fr auto` (→40px), 클릭 시 해당 굴림 재표시 |
| 구성 | `#index` (mono) · `dice 글리프` (emoji 1.5rem) · `합 N` (mono, 우측 정렬) |
| stripe | `:nth-child(odd)` → `--color-history-row-stripe` |
| hover / active | `--color-bg-subtle` / `.is-active` 는 accent outline |
| **focus-visible** | `outline: 2px solid var(--color-focus-ring); outline-offset: -2px` ★ |
| empty | `.history-empty` "아직 굴림 기록 없음" (`--color-text-muted`) |

### 5.5 테마 토글 `.btn.btn--ghost#theme-toggle`

- 공용 `.btn--ghost`: 투명 배경 + `--color-border-strong` 아웃라인, hover 시 `--color-bg-subtle`
- **focus-visible**: `.btn:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px }` ★ (공용 규칙)

### 5.6 삭제 확인 모달 `.modal-backdrop` (기존 유지)

- `role="dialog" aria-modal="true"`, 취소(`.btn--ghost`)/삭제(`.btn--danger`) — 공용 버튼만 사용, 신규 스타일 없음

### 5.7 키보드 힌트 `.kbd-hint`

- `<kbd>Space</kbd> 굴리기 · <kbd>1</kbd>–<kbd>5</kbd> 개수 · <kbd>T</kbd> 테마` — 시각 힌트 (BF-848 §5)

---

## 6. dev 구현 가이드

> 현행 구현이 이미 아래를 만족한다. dev 는 **회귀 검증**만 수행하고, 어긋난 지점만 수정한다.

1. **토큰**: `dice/styles.css :root` 의 기존 토큰만 사용. 신규 색상/토큰 추가 금지. HEX 하드코딩 금지 (전량 `var(--color-*)`).
2. **공용 버튼**: `.btn`, `.btn--ghost`, `.btn--danger` 규칙 재사용. 굴리기/개수/히스토리 버튼도 공용 `:focus-visible` 패턴(`2px solid var(--color-focus-ring)`) 준수.
3. **포커스 시각 상태 (핵심)**: 모든 인터랙티브 요소(`#btn-roll`, `.dice-count__btn`, `.history-row`, `#theme-toggle`, 모달 버튼)가 `:focus-visible` 아웃라인을 갖는지 확인. `outline: none` 으로 제거하는 코드가 없어야 함.
4. **잘림 없음 (핵심)**: `.dice-box { flex-wrap: wrap }` 유지. `@media (max-width: 639px)` / `(max-width: 359px)` 축소 규칙 유지. 어떤 컨테이너도 `overflow: hidden` 으로 콘텐츠를 자르지 않도록 확인.
5. **반응형 검증**: 320/360/375/414px × 개수 1~5 조합에서 `scrollWidth <= innerWidth` (BF-848 §6-5 e2e 가드 — tester 담당).
6. **reduced-motion**: `@media (prefers-reduced-motion: reduce)` 블록에서 위글/transform/transition 억제 유지, 기능(disabled 전이)은 유지.
7. **접근성 속성**: 주사위 타일 `role="img" aria-label`, 개수 `role="radio" aria-checked`, 버튼 `type="button" aria-label`, 모달 `role="dialog" aria-modal`.

**권장 CSS 변수/클래스명** (현행과 동일하게 유지):
`--color-accent`, `--color-focus-ring`, `--text-dice`, `--text-dice-sm`, `--text-sum` /
`.roll-button`, `.dice-box`, `.dice`, `.dice-count__btn`, `.history-row`, `.stat-row__value--sum`

---

## 7. mockup 참조

- 파일: [`docs/design/mockups/dice-spa-BF-849.html`](mockups/dice-spa-BF-849.html)
- 포함 프레임:
  1. **데스크톱 (다크, 2개 주사위)** — 기본 레이아웃
  2. **모바일 375px (다크, 5개 주사위 wrap)** — 잘림 없음 시각 확인 (`flex-wrap` 줄바꿈)
  3. **키보드 포커스 상태 갤러리** — 굴리기 버튼/개수 버튼/히스토리 row 의 `:focus-visible` 아웃라인 강제 표시
  4. **버튼 상태 갤러리** — default / hover / active / disabled(굴림 중)
  5. **라이트 테마** — 토큰 대비 확인
- placeholder 데이터(합계 8, 히스토리 샘플)로 UX 의도 전달. 실제 값은 `main.js` 산출.

---

## 8. Self-critique (PR commit 직전 자기 점검)

| # | 체크 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** | Jira AC-1(토큰·공용 버튼) → §2·§5·§6-1·2 / AC-1(반응형 잘림) → §4.3·§6-4 / AC-1(포커스 시각) → §5 각 컴포넌트 ★·§6-3 / AC-2(mockup 숫자·버튼·포커스 시각 확인) → §7 프레임 2·3. **전부 매핑됨** ✅ |
| 2 | **dev 구현 가이드** | §6 에 7개 검증 항목 + 권장 변수/클래스명 명시. 현행 코드 1:1 대응 ✅ |
| 3 | **기존 요소 보존** | 신규 토큰/색상/컴포넌트 0건. §2 전량 기존 `styles.css` 문서화. 통계/히스토리/모달 로직 재설계 없음 ✅ |
| 4 | **컴포넌트 매핑** | §5 의 모든 컴포넌트가 실제 클래스명(`.roll-button`, `.dice-count__btn`, `.history-row` 등)·상태와 1:1 매핑 ✅ |
| 5 | **모호함 flag** | ⚠️ 본 명세는 "정제 모드"(기존 구현 = source of truth) 전제. 만약 운영자 의도가 **전면 재디자인**이면 범위 상이 → 별도 지시 필요. 그 외 모호함 없음 |

---

이 문서는 BF-849 designer 작업의 산출물입니다. 후속: reviewer 검증 → 머지 → dev 회귀 검증(잘림·포커스) → tester e2e 뷰포트 가드(BF-848 §9 gap).
