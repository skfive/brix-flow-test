# 숫자 맞히기 게임 UI 시안 (BF-1601)

> designer: 이디자인 · task: BF-1601 · frozen contract: `ui-contract@v1`, `planning-contract@v1`
>
> 본 문서는 planner가 동결한 **UI 계약**(`docs/plans/number-guessing-BF-1600.md` §3)을
> 시각 명세(레이아웃·컬러·타이포)로 옮긴 시안입니다. selector·design token·상태 텍스트는
> frozen blueprint가 유일한 권위이며, 본 문서는 이를 **재정의하지 않고 그대로 시각화**합니다.
> developer(BF-1602)는 아래 시안을 참조 가이드로 사용하되, 계약 selector·token·상태 텍스트는
> 반드시 원문 그대로 구현합니다.

---

## 1. 시안 개요

- **변경 범위**: 단일 카드형 숫자 맞히기 게임 화면 1개 (`apps/number-guessing/index.html`)
- **사용자 경험 목표**
  - 입력 → 제출 → 피드백의 반복 루프를 한 화면에서 시선 이동 최소로 수행
  - 5개 상태(idle / higher / lower / win / invalid)를 **색상 + 상태 텍스트** 이중 채널로 구분해
    색각 이상 사용자도 오해 없이 인지
  - 시도 횟수·best score 통계를 항상 노출해 진행 맥락을 유지
  - 모바일(320px)부터 데스크톱까지 overflow 없이 동작하고, 480px 미만에서 입력·제출이 세로로 stack
- **stack 규약**: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
- **placeholder 정책**: mockup은 UX 의도 전달용 정적 시뮬레이션이며, 정답·난수·시도 횟수 등 동적 값은
  샘플 값으로 표현합니다.

---

## 2. 컬러 팔레트

### 2.1 frozen design token (재정의 금지 — 계약 §3.3 그대로)

| 토큰 | 값 (HEX) | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 컨트롤(제출 버튼) 배경 |
| `--color-feedback-higher` | `#f59e0b` | `higher`(더 큼) 피드백 텍스트 |
| `--color-feedback-lower` | `#3b82f6` | `lower`(더 작음) 피드백 텍스트 |
| `--color-feedback-win` | `#16a34a` | `win`(정답) 피드백 텍스트 |
| `--color-feedback-error` | `#dc2626` | `invalid`(오류) 피드백 텍스트 |
| `--space-control-gap` | `12px` | 컨트롤(입력·제출) 간 간격 |

### 2.2 지원 팔레트 (시안 보조용 — 계약 외 자체 정의, 이름 충돌 없음)

> vanilla-static 규약상 배경·표면·중립 텍스트는 자체 CSS 변수로 정의합니다.
> frozen 토큰 이름은 재사용·변경하지 않으며, 아래는 별도 네임스페이스입니다.

| 토큰 | 값 (HEX) | 용도 |
| --- | --- | --- |
| `--color-bg` | `#f1f5f9` | 페이지 배경 |
| `--color-surface` | `#ffffff` | 게임 카드 표면 |
| `--color-border` | `#cbd5e1` | 입력 필드·구분선 테두리 |
| `--color-text` | `#0f172a` | 본문 기본 텍스트 |
| `--color-text-muted` | `#64748b` | 통계 레이블·보조 텍스트 |
| `--color-action-primary-hover` | `#1d4ed8` | 제출 버튼 hover (primary 어둡게) |
| `--color-action-disabled` | `#94a3b8` | 제출 버튼 비활성(win 상태) |

- **명도 대비**: 각 피드백 색은 `--color-surface`(#ffffff) 위에서 WCAG AA 본문 기준(4.5:1)을 겨냥해
  선택되었습니다. `--color-feedback-higher`(#f59e0b)는 대비가 낮을 수 있어 mockup에서 **볼드 처리 +
  상태명 접두 텍스트**로 가독성을 보강합니다(색상 단독 의존 금지 원칙, 계약 §3.4).

---

## 3. 타이포그래피

외부 폰트 CDN을 쓰지 않고 **system font stack**만 사용합니다(계약 AC — system font 전용).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

| 역할 | font-family | size | weight | line-height | 적용 요소 |
| --- | --- | --- | --- | --- | --- |
| heading | `--font-sans` | 24px | 700 | 1.3 | 게임 제목 |
| feedback | `--font-sans` | 18px | 600 | 1.4 | `guess-feedback` 상태 텍스트 |
| body | `--font-sans` | 16px | 400 | 1.5 | 입력 필드·버튼 라벨 |
| stats | `--font-sans` | 15px | 500 | 1.4 | `attempts-count` / `best-score` 값 |
| caption | `--font-sans` | 13px | 400 | 1.4 | 통계 레이블·보조 안내 |

- **숫자 정렬**: 입력 필드와 통계 수치는 `font-variant-numeric: tabular-nums`로 자릿수 흔들림 방지.
- 모바일(<480px)에서 heading은 20px, feedback은 16px로 축소해 좁은 폭에서도 줄바꿈 최소화.

---

## 4. 레이아웃

### 4.1 섹션 구조 (단일 카드)

```
┌─────────────────────────────────────┐
│  숫자 맞히기 게임            (heading) │
│                                       │
│  [ guess-feedback ] (aria-live)       │  ← 상태 텍스트 배너
│                                       │
│  ┌──────────────┐ ┌──────────┐        │  ← guess-form (row, ≥480px)
│  │ guess-input  │ │guess-submit│      │
│  └──────────────┘ └──────────┘        │
│                                       │
│  ─────────── game__stats ───────────  │
│  시도  attempts-count │ 최고  best-score│
│                                       │
│              [ new-game ]             │  ← 새 게임 컨트롤
└─────────────────────────────────────┘
```

### 4.2 spacing

- 카드 padding: 24px (모바일 <480px: 16px)
- 카드 최대 폭: 420px, 페이지 중앙 정렬
- 세로 리듬: 섹션 간 20px, 컨트롤 간 간격은 frozen `--space-control-gap`(12px) 사용
- 카드 모서리: `border-radius: 16px`, `box-shadow`로 배경과 분리

### 4.3 breakpoint 별 동작 (계약 §3.6)

| breakpoint | guess-form 배치 | 비고 |
| --- | --- | --- |
| ≥ 480px | 입력·제출 **가로(row)**, `gap: var(--space-control-gap)` | 입력 필드 flex-grow, 버튼 고정 폭 |
| < 480px | 입력·제출 **세로(column) stack**, `gap: var(--space-control-gap)` | 버튼·입력 모두 `width: 100%` |
| ≥ 320px | content overflow 없음 | 카드 `width: 100%` + `max-width`, `box-sizing: border-box` |

---

## 5. 컴포넌트 명세

계약 §3.1 / §3.2의 DOM ID·CSS class를 **그대로** 사용합니다.

### 5.1 guess-feedback (상태 텍스트 배너)

- **선택자**: `#guess-feedback.game__feedback`
- **접근성**: `aria-live="polite"` — 상태 텍스트 변화를 스크린리더가 낭독(계약 §3.5)
- **상태별 표현** (색상 + 텍스트 이중 채널, 색상 단독 의존 금지):

| 상태 | 화면 텍스트 (그대로 노출) | 텍스트 색 | 배경(연한 톤) | 상태 접두 라벨 |
| --- | --- | --- | --- | --- |
| `idle` | `1~100 사이 숫자를 입력하세요` | `--color-text-muted` | 투명 | — |
| `higher` | `더 큼 — 더 큰 수를 입력하세요` | `--color-feedback-higher` | `#fffbeb` | "더 큼" |
| `lower` | `더 작음 — 더 작은 수를 입력하세요` | `--color-feedback-lower` | `#eff6ff` | "더 작음" |
| `win` | `정답! N번 만에 맞혔습니다` | `--color-feedback-win` | `#f0fdf4` | "정답" |
| `invalid` | `1~100 사이 정수를 입력하세요` | `--color-feedback-error` | `#fef2f2` | 오류 |

> `N`은 시도 횟수 치환값(계약 §3.4). mockup에는 샘플 값 `3`으로 표시.
> 상태명("더 큼"/"더 작음"/"정답")이 텍스트 자체에 포함되어 있어, 색상을 인지하지 못해도
> 상태를 구분할 수 있습니다(계약 §3.4 · AC7).

### 5.2 guess-form / guess-input / guess-submit

- **guess-form**: `#guess-form` — `novalidate` 속성으로 native 검증이 `invalid` 상태 제출을
  가로채지 않게 함(계약 §8 회귀 방지). Enter 키 제출 지원(계약 §3.5).
- **guess-input**: `#guess-input.game__input`
  - `type="number"`, `min="1" max="100" step="1"`, `inputmode="numeric"`
  - `aria-label="추측할 숫자 입력"` (계약 §3.5)
  - placeholder: `1~100`
- **guess-submit**: `#guess-submit.game__submit`
  - `aria-label="추측 제출"` (계약 §3.5)
  - 배경 `--color-action-primary`, hover 시 `--color-action-primary-hover`
  - **win 상태**: `disabled` → 배경 `--color-action-disabled`, cursor `not-allowed`

| 상태 | guess-submit | guess-input |
| --- | --- | --- |
| idle / higher / lower / invalid | 활성 | 활성 |
| win | **비활성(disabled)** | 활성 유지(재입력 대비 무해) |

### 5.3 game__stats (통계 영역)

- **선택자**: `.game__stats`
- 두 항목을 가로 배치(모바일에서도 유지 가능한 폭):
  - **시도 횟수**: 레이블 "시도" + `#attempts-count` (초기 `0`)
  - **best score**: 레이블 "최고 기록" + `#best-score`
    - 저장값 있으면 숫자, 없으면 `기록 없음` 대체 텍스트(계약 §5, 빈 값 노출 금지)

### 5.4 new-game (새 게임 컨트롤)

- **선택자**: `#new-game`
- 기본: 보조(secondary) 톤 — 테두리 버튼(outline)
- **win 상태 강조**(계약 §3.4): 채움(filled) + `--color-feedback-win` 톤으로 시선 유도

### 5.5 인터랙션 상태 (hover / focus / active)

| 요소 | hover | focus | active/disabled |
| --- | --- | --- | --- |
| guess-submit | 배경 → `--color-action-primary-hover` | `outline: 2px` focus ring | disabled(win) → `--color-action-disabled` |
| new-game(기본) | 테두리·텍스트 진하게 | focus ring | — |
| new-game(win 강조) | win 톤 어둡게 | focus ring | — |
| guess-input | 테두리 진하게 | 테두리 `--color-action-primary` + focus ring | — |

> 모든 focusable 요소는 가시적 focus ring을 유지(키보드 접근성). mockup의 §hover/상태 섹션에
> 정적으로 표현합니다.

---

## 6. dev 구현 가이드 (developer BF-1602 참조용)

> 아래는 시안을 구현으로 옮길 때의 **권장 CSS 변수명·클래스명**입니다. 계약 §3의
> selector·token·상태 텍스트는 원문 그대로 구현하고, 아래 보조 토큰만 추가로 정의하세요.

1. **토큰 정의**: `style.css`의 `:root`에 계약 §3.3 frozen 토큰 6개를 **정확한 값**으로 선언하고,
   §2.2 지원 팔레트·§3 `--font-sans`를 보조 토큰으로 추가.
2. **마크업 골격**(`index.html`):
   - 카드 루트: `<main class="game">` (또는 section) — `.game`
   - 피드백: `<p id="guess-feedback" class="game__feedback" aria-live="polite">1~100 사이 숫자를 입력하세요</p>`
   - form: `<form id="guess-form" novalidate>` 안에 `#guess-input.game__input` + `#guess-submit.game__submit`
   - 통계: `<div class="game__stats">` 안에 `#attempts-count`, `#best-score`
   - 새 게임: `<button id="new-game">새 게임</button>`
3. **상태 클래스 권장**: 피드백 색 전환은 상태 modifier 클래스로 관리 권장 —
   `game__feedback--higher/--lower/--win/--invalid` (idle은 modifier 없음). 각 modifier가
   해당 frozen 피드백 토큰을 `color`로 매핑.
4. **레이아웃**: `.game` → `max-width:420px; margin:auto`. `#guess-form` → `display:flex; gap:var(--space-control-gap)`,
   `@media (max-width:479.98px){ flex-direction:column; }` + 입력·버튼 `width:100%`.
5. **win 처리**: `#guess-submit[disabled]` 스타일 + `#new-game` 강조 modifier(예: `new-game--emphasis`).
6. **접근성**: `aria-label`·`aria-live`·`novalidate`는 계약 §3.5 그대로. Enter 제출은 form submit 핸들러로.
7. **overflow 가드**: 전역 `*{ box-sizing:border-box }`, 카드/입력 `width:100%`로 320px 대응.

> ⚠️ mockup HTML은 **시각 참조용**입니다. developer는 픽셀 단위 일치 의무 없이 계약 selector·token·
> 상태 텍스트만 정확히 지키면 됩니다.

---

## 7. mockup 참조

- **파일**: `docs/design/number-guessing-mockup.html` (본 시안과 동일 컬러·타이포·레이아웃)
- 단일 self-contained HTML — 외부 의존성 0건, system font, 인라인 `<style>`
- 구성:
  1. **라이브 카드** — 실제 게임 화면(idle 상태 기본)
  2. **상태 갤러리** — idle / higher / lower / win / invalid 5개 상태를 나란히 시각화
     (색상 외 상태 텍스트로도 구분됨을 확인용)
  3. **반응형 프리뷰** — 320px 폭 컨테이너로 stack 동작 시뮬레이션
  4. **인터랙션 상태** — hover / focus / disabled 표현
