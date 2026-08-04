# 숫자 맞히기 게임 — UI 시각 명세 (BF-1594)

> designer: 이디자인 · task: BF-1595 · frozen contract: `ui-contract@v1`, `planning-contract@v1`
> 실행 설계 원본: [`docs/plans/number-guess-plan-BF-1594.md`](../plans/number-guess-plan-BF-1594.md)
> mockup: [`docs/design/number-guess-mockup.html`](./number-guess-mockup.html)
>
> 본 문서는 planner가 **동결**한 selector·token·상태·접근성·반응형 계약을
> 시각 명세로 그대로 렌더링합니다. **selector·token 값을 변경하거나 재정의하지 않습니다.**
> 추가로 정의하는 중립(neutral) 색/타이포 값은 frozen 5개 토큰을 침범하지 않는 **additive** 보조 값입니다.

---

## 1. 시안 개요

### 변경 범위
1~100 비밀 숫자 맞히기 게임의 단일 화면(single-page) 시안입니다. 하나의 게임 카드 안에
입력·제출·피드백·메타(시도 횟수·best score)·새 게임 컨트롤이 모두 담깁니다. 신규 UI이며
기존 요소를 대체·삭제하지 않습니다.

### 사용자 경험 목표
- **한눈에 이해**: 카드 상단에서 아래로 "제목 → 입력·제출 → 피드백 → 메타 → 새 게임"의 자연스러운 세로 흐름.
- **상태를 색이 아니라 글자로**: 매 추측의 결과(`더 큼`/`더 작음`/`정답`)를 **화면 텍스트**로 먼저 전달하고,
  색상은 이를 보조하는 이중 채널로만 사용합니다. 색을 인지하지 못해도 상태를 읽을 수 있어야 합니다.
- **반응형 안정감**: 320px 좁은 화면에서도 overflow 없이, 컨트롤이 세로로 쌓여 손가락 조작이 편합니다.
- **접근성 기본 내장**: 피드백은 스크린리더에 자동 낭독(`aria-live`), 제출은 `aria-label`, 입력은 `label`+Enter 제출.

---

## 2. 컬러 팔레트

### 2.1 frozen design token (재정의 금지 — 값 고정)

| 토큰 | 값 | 용도 | 미리보기 |
| --- | --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 실행 컨트롤(제출 버튼) 배경 | 🟦 파랑 |
| `--color-feedback-correct` | `#16a34a` | 정답(win) 피드백 텍스트/강조 | 🟩 초록 |
| `--color-feedback-hint` | `#b45309` | too-high/too-low 힌트 텍스트/강조 | 🟧 앰버 |
| `--space-control-gap` | `12px` | 컨트롤(입력·버튼·메타) 사이 세로/가로 간격 | — |
| `--font-size-feedback` | `1.125rem` | `guess-feedback` 텍스트 크기 | — |

> 위 5개 값은 `apps/number-guess/style.css`에서 `:root`에 **같은 이름·같은 값**으로 선언됩니다.
> developer는 색을 하드코딩하지 말고 반드시 이 토큰을 참조합니다.

### 2.2 보조 중립 토큰 (additive — frozen 값 미침범)

frozen 토큰만으로는 표면/배경/본문 색이 정의되지 않으므로, 시각 완성도를 위해 아래 중립 값을 **추가**합니다.
이 값들은 frozen 5개 토큰을 덮어쓰지 않으며 developer가 동일 이름으로 채택하기를 권장합니다.

| 토큰(권장) | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#f1f5f9` | 페이지 배경 (slate-100) |
| `--color-surface` | `#ffffff` | 게임 카드 표면 |
| `--color-text` | `#0f172a` | 기본 본문/제목 텍스트 (slate-900) |
| `--color-text-muted` | `#475569` | 메타·caption 보조 텍스트 (slate-600) |
| `--color-border` | `#cbd5e1` | 입력 테두리·구분선 (slate-300) |
| `--color-action-primary-hover` | `#1d4ed8` | 제출 버튼 hover (primary의 진한 톤, blue-700) |

- **대비(contrast) 확인**: 흰 표면 위 `#b45309`(hint)·`#16a34a`(correct)·`#0f172a`(text) 모두 본문 크기 기준 WCAG AA 이상.
  제출 버튼은 `#2563eb` 배경 + 흰색 글자로 AA 충족.
- **색 단독 의존 금지**: hint/correct 색은 항상 상태 텍스트(`더 큼`/`더 작음`/`정답`)와 **동반**됩니다(§5.3).

---

## 3. 타이포그래피

vanilla-static stack — **외부 폰트 의존 0건**, system font stack만 사용합니다.

```
font-family: system-ui, -apple-system, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | 요소 | font-size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| heading | 게임 제목 (`<h1>`) | `1.5rem` (24px) | 700 | 1.3 | 카드 최상단 |
| body | 입력·버튼·안내 문구 | `1rem` (16px) | 400 | 1.6 | 기본 |
| **feedback** | `guess-feedback` | `var(--font-size-feedback)` = `1.125rem` (18px) | 600 | 1.5 | frozen 토큰 참조 |
| meta | `attempt-count` / `best-score` | `0.875rem` (14px) | 500 | 1.4 | `--color-text-muted` |
| submit | `guess-submit` 라벨 | `1rem` (16px) | 600 | 1 | 흰색 |

- 숫자 입력은 폭이 좁아도 읽히도록 `inputmode="numeric"` 권장(모바일 숫자 키패드).
- 피드백 텍스트는 상태 전환 시 길이가 바뀌므로 최소 높이를 확보해 레이아웃 점프를 막습니다(§4).

---

## 4. 레이아웃

### 4.1 섹션 구조 (카드 내부, 위→아래)

```
┌─────────────────────────────── .game (max-width: 480px, 중앙 정렬) ──┐
│  h1  숫자 맞히기                                                       │
│  p   1~100 사이 숫자를 맞혀보세요 (안내)                              │
│                                                                       │
│  .game__field                                                         │
│    label[for=guess-input]  추측 숫자                                  │
│    input#guess-input        [        ]                                │
│    button#guess-submit .game__submit  제출                            │
│                                                                       │
│  .game__feedback  #guess-feedback (aria-live=polite)                  │
│    └ 상태 텍스트: 더 큼 / 더 작음 / 정답 / 안내                        │
│                                                                       │
│  .game__meta                                                          │
│    시도 횟수: #attempt-count 0    ·    최고 기록: #best-score 기록 없음│
│                                                                       │
│  .game__new                                                           │
│    button#new-game  새 게임                                           │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 spacing

- 카드 내부 세로 리듬은 **`--space-control-gap`(12px)** 단위로 통일 (섹션 간 간격 = gap 또는 gap×2).
- 카드 padding: `24px`(넓은 화면), `16px`(≤360px) — 좁은 화면 좌우 여백 절약.
- `.game__field` 내부 요소 간 간격도 `--space-control-gap` 사용.

### 4.3 breakpoint 별 동작

| 뷰포트 | `.game` 카드 | `.game__field` (입력+제출) | padding |
| --- | --- | --- | --- |
| ≥ 481px | `max-width: 480px`, 중앙 정렬, 좌우 여백 | 입력과 제출을 **가로 배치**(입력 flex-grow, 버튼 고정폭) | 24px |
| 360px ~ 480px | `width: 100%`(좌우 margin 16px) | 가로 배치 유지(줄바꿈 허용) | 24px |
| ≤ 360px (320px 포함) | `width: 100%` | **세로 스택** — 입력·버튼 각각 full-width | 16px |

- **불변식**: 320px 이상 모든 폭에서 가로 스크롤/overflow **없음**. `box-sizing: border-box` + `width: 100%` + `min-width: 0`으로 보장.
- 컨트롤 세로 스택은 `@media (max-width: 360px)`에서 `.game__field { flex-direction: column }`으로 구현.

---

## 5. 컴포넌트 명세

각 컴포넌트의 selector는 **frozen** 값입니다. developer는 아래 id/class를 그대로 사용합니다.

### 5.1 입력 필드 — `#guess-input` (`.game__field` 내부)

| 항목 | 값 |
| --- | --- |
| 태그 | `<input type="number" id="guess-input" min="1" max="100" inputmode="numeric">` |
| label | `<label for="guess-input">추측 숫자</label>` — **연결된 label 필수** |
| 상태 | 기본 / focus(테두리 `--color-action-primary`) / disabled(win 이후, 새 게임 전) |
| 인터랙션 | **Enter 키 제출** 지원(form submit 또는 keydown) |
| 접근성 | label 연결로 이름 노출. `min`/`max`로 범위 힌트 |

### 5.2 제출 버튼 — `#guess-submit` (`.game__submit`)

| 항목 | 값 |
| --- | --- |
| 태그 | `<button type="submit" id="guess-submit" class="game__submit" aria-label="추측 제출">제출</button>` |
| 색 | 배경 `--color-action-primary` / 글자 흰색 / hover `--color-action-primary-hover` |
| 상태 | 기본 / hover / active / focus-visible(외곽선) / disabled(win 이후) |
| 접근성 | **`aria-label="추측 제출"` 필수** (frozen) |

### 5.3 피드백 — `#guess-feedback` (`.game__feedback`)

| 항목 | 값 |
| --- | --- |
| 태그 | `<p id="guess-feedback" class="game__feedback" aria-live="polite" data-state="idle">…</p>` |
| 크기 | `--font-size-feedback` (1.125rem), weight 600 |
| 접근성 | **`aria-live="polite"` 필수** — 텍스트 변경을 스크린리더가 낭독 |
| 상태별 텍스트/색 | 아래 표 (상태는 **텍스트로 먼저**, 색은 보조) |

| 상태 (`data-state`) | 화면 텍스트(예시) | 색 |
| --- | --- | --- |
| `idle` | `숫자를 입력하고 제출하세요` | `--color-text-muted` (중립) |
| `too-low` | `더 큼 — 정답은 더 큰 숫자예요` | `--color-feedback-hint` |
| `too-high` | `더 작음 — 정답은 더 작은 숫자예요` | `--color-feedback-hint` |
| `win` | `정답! 축하합니다 🎉` | `--color-feedback-correct` |

> **매핑 근거**: `too-low`(추측 < 정답) → 정답이 더 큼 → `더 큼`. `too-high`(추측 > 정답) → `더 작음`.
> AC의 예시 화면 텍스트 `더 큼`/`더 작음`/`정답`과 plan §3.4의 상태명이 1:1 대응합니다.
> **색만으로 상태를 구분하지 않으며**, 위 텍스트가 항상 함께 노출됩니다.
> 잘못된 입력(빈 값·정수 아님·범위 밖)은 `idle` 계열 안내 텍스트로 되돌리고 시도 횟수를 올리지 않습니다.

### 5.4 메타 — `#attempt-count` / `#best-score` (`.game__meta`)

| 요소 | 텍스트 형식 | 초기값 |
| --- | --- | --- |
| `#attempt-count` | `시도 횟수: N` | `0` |
| `#best-score` | `최고 기록: N` | 저장값 없으면 `기록 없음` (빈 값 노출 금지) |

- 색: `--color-text-muted`, 크기 0.875rem. 좁은 화면에서는 두 항목이 세로로 쌓입니다.

### 5.5 새 게임 — `#new-game` (`.game__new`)

| 항목 | 값 |
| --- | --- |
| 태그 | `<button type="button" id="new-game" class="game__new">새 게임</button>` |
| 스타일 | 보조(secondary) 버튼 — 투명/외곽선, 텍스트 `--color-action-primary` |
| 동작 | 진행 상태 초기화(상태 `idle`, 시도 0, 피드백 초기화), **best score는 유지**, 입력·제출 재활성화 |

---

## 6. dev 구현 가이드 (BF-1596 developer용)

> selector·token·상태는 planner frozen 계약입니다. 아래는 **시각 구현** 권장 단계이며, 계약 값은 변경 금지입니다.

1. **토큰 선언** — `apps/number-guess/style.css`의 `:root`에 frozen 5개 토큰(§2.1)을 **같은 이름·같은 값**으로 선언하고,
   보조 중립 토큰(§2.2)도 함께 선언합니다. 색은 전부 `var(--…)` 참조, 하드코딩 금지.
2. **마크업 골격** — `apps/number-guess/index.html`에 카드 골격을 세웁니다. 루트에 `class="game"`,
   입력 래퍼 `game__field`, 제출 `game__submit`, 피드백 `game__feedback`, 메타 `game__meta`, 새 게임 `game__new`.
   frozen DOM id(`guess-input`/`guess-submit`/`guess-feedback`/`attempt-count`/`best-score`/`new-game`)를 그대로 부여합니다.
   입력·제출은 `<form>`으로 감싸 Enter 제출을 자연스럽게 지원(제출 핸들러에서 `preventDefault`).
3. **레이아웃** — `.game`은 `max-width:480px; margin-inline:auto; box-sizing:border-box`.
   `.game__field`는 `display:flex; gap:var(--space-control-gap)`; `#guess-input`에 `flex:1; min-width:0`으로 overflow 방지.
   `@media (max-width:360px) { .game__field { flex-direction:column } }`로 세로 스택.
4. **피드백 상태** — `#guess-feedback`에 `aria-live="polite"`와 `data-state` 속성을 두고,
   상태에 따라 텍스트와 `data-state`를 갱신합니다. CSS는 `[data-state="win"]`·`[data-state="too-high"]`·`[data-state="too-low"]`
   선택자로 색만 바꾸고, **텍스트는 JS가 §5.3 문구로 세팅**합니다.
5. **접근성** — `guess-submit`에 `aria-label="추측 제출"`, `guess-input`에 연결 `label`, Enter 제출 확인.
6. **초기값·후조건** — 로드/새 게임 시 상태 `idle`, `attempt-count` `0`, `best-score`는 저장값(없으면 `기록 없음`).

### 권장 CSS 변수/클래스 요약

| 종류 | 이름 |
| --- | --- |
| frozen 색 토큰 | `--color-action-primary` `--color-feedback-correct` `--color-feedback-hint` |
| frozen 치수 토큰 | `--space-control-gap` `--font-size-feedback` |
| 보조 토큰(권장) | `--color-bg` `--color-surface` `--color-text` `--color-text-muted` `--color-border` `--color-action-primary-hover` |
| frozen class | `game` `game__field` `game__submit` `game__feedback` `game__meta` `game__new` |

---

## 7. mockup 참조

- 시각 mockup HTML: [`docs/design/number-guess-mockup.html`](./number-guess-mockup.html)
- mockup은 본 명세의 컬러·타이포·레이아웃을 그대로 표현하며, **4개 상태(idle / too-high / too-low / win)**를
  화면 텍스트(`더 큼`/`더 작음`/`정답`)와 함께 정적으로 나열해 보여줍니다.
- mockup은 시각 시뮬레이션 전용입니다. developer의 실제 산출물이 아니며 픽셀 단위 일치 의무는 없습니다 — UX 의도와 상태 표현을 참조 가이드로 사용하세요.
