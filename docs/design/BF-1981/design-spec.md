# 인터벌 타이머 디자인 명세 (BF-1982)

- 관련: BF-1981(epic) / BF-1984(planner, frozen 계약) / BF-1983(developer 구현)
- 작성: designer(이디자인)
- 상태: 본 문서는 `docs/plans/BF-1981/implementation-plan.md`의 frozen UI 계약(§2, §4)을 그대로 따르며 DOM ID / CSS class / token / 상태 / 접근성 / 반응형 규칙을 재정의하지 않는다. 여기서 정의하는 값(배경·텍스트 색, 폰트, spacing, 컴포넌트 스타일)은 frozen 계약이 명시하지 않은 시각 디테일을 채우는 designer 재량 영역이다.

## 1. 시안 개요

인터벌 타이머는 work(작업)/rest(휴식) 구간을 자동으로 반복하며, 사용자는 시작/일시정지/리셋 3가지 조작만으로 전체 세션을 통제한다. 시각 목표는 다음과 같다.

- 현재 남은 시간(mm:ss)을 화면에서 가장 크게, 가장 먼저 인지되도록 배치한다.
- 현재 구간(work/rest/paused/idle)을 **색상 + 텍스트 라벨** 두 가지로 동시에 표현해 색맹/저시력 사용자도 구분 가능하게 한다(§4.5 접근성 frozen 규칙 반영).
- 320px 폭의 좁은 화면에서도 컨트롤 버튼이 줄바꿈되며 잘리거나 넘치지 않는다.
- 키보드만으로 조작 가능한 사용자를 고려해 버튼에 명확한 포커스 스타일을 둔다.

## 2. 컬러 팔레트

### 2.1 frozen phase 토큰 (변경 금지, `docs/plans/BF-1981/implementation-plan.md` §4.4 그대로)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-phase-work` | `#2563eb` | work 상태 강조색 (라벨 텍스트/배경 tint/상단 accent bar) |
| `--color-phase-rest` | `#16a34a` | rest 상태 강조색 |
| `--color-phase-idle` | `#6b7280` | idle 상태 강조색 |

`paused` 상태는 별도 토큰이 없다(frozen). 진입 직전 phase의 토큰(work면 `--color-phase-work`, rest면 `--color-phase-rest`)을 그대로 유지한 채 라벨 텍스트만 "일시정지"로 바뀐다.

### 2.2 designer 재량 색상 (frozen 계약 밖, 새 토큰 아님 — 컴포넌트 내부 CSS 값)

| 이름 | 값 | 용도 |
|---|---|---|
| surface (카드 배경) | `#ffffff` | `.timer` 카드 배경 |
| page 배경 | `#f8fafc` | 페이지 전체 배경(카드 대비용) |
| text primary | `#0f172a` | `#timer-display` 시간 텍스트 |
| text secondary | `#475569` | `#timer-round-count` |
| border/구분선 | `#e2e8f0` | 카드 테두리, 버튼 outline |
| 버튼 primary 배경 | `#0f172a` | `#timer-start-pause` 배경(hover `#1e293b`) |
| 버튼 primary 텍스트 | `#ffffff` | `#timer-start-pause` 텍스트 |
| 버튼 secondary 텍스트/테두리 | `#334155` / `#cbd5e1` | `#timer-reset` |
| focus outline | `#2563eb` (work 토큰 재사용) | 키보드 포커스 링 |

> 버튼 색은 phase 토큰과 분리한다 — phase 토큰은 "지금 어떤 구간인지"만 표현하고, 버튼은 항상 동일한 중립 스타일을 유지해 조작 요소로서의 일관성을 준다.

## 3. 타이포그래피

시스템 폰트만 사용(vanilla-static, 외부 의존성 0건).

| 요소 | font-family | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| `#timer-display` | `ui-monospace, "SF Mono", "Consolas", "Menlo", monospace` | `clamp(2.75rem, 9vw, 4.5rem)` | 800 | 1 | `font-variant-numeric: tabular-nums;`로 숫자 폭 고정(카운트다운 시 흔들림 방지) |
| `#timer-phase-label` | `-apple-system, "Segoe UI", system-ui, sans-serif` | `0.95rem` | 700 | 1.2 | `letter-spacing: .04em; text-transform: uppercase;` |
| `#timer-round-count` | 위와 동일 sans-serif | `0.85rem` | 500 | 1.4 | color: text secondary |
| 버튼 텍스트(`.timer__control` 내부) | 위와 동일 sans-serif | `1rem` | 600 | 1 | |

## 4. 레이아웃

### 4.1 구조 (frozen ID/class를 실제 DOM 계층에 배치)

```
#timer-root.timer
├── #timer-phase-label  (배지 형태, phase 색상 tint 배경)
├── #timer-display.timer__display   (aria-live="polite")
├── #timer-round-count
└── .timer__control
    ├── #timer-start-pause
    └── #timer-reset
```

### 4.2 spacing / 카드

- `.timer` 카드: `max-width: 400px; width: 100%; margin: 0 auto; padding: 40px 32px; border-radius: 20px; box-shadow: 0 10px 30px rgba(15,23,42,.08); display:flex; flex-direction:column; align-items:center; gap:20px;`
- 카드 상단에 4px accent bar(`border-top: 4px solid <현재 phase 토큰>`)를 두어 색상 신호를 하나 더 준다(텍스트 라벨과 병행 — 색상 단독 구분 금지 규칙 보강).
- `.timer__control` 버튼 간격은 frozen 토큰 `--space-control-gap: 12px`를 그대로 사용: `.timer__control { display:flex; flex-wrap:wrap; justify-content:center; gap: var(--space-control-gap); width:100%; }`

### 4.3 반응형 (frozen §4.6 구현)

- 기준 뷰포트: 320px 이상.
- `.timer__control`은 `flex-wrap: wrap`으로, 버튼 두 개가 한 줄에 들어가지 않을 만큼 좁아지면 자동으로 줄바꿈되어 overflow가 발생하지 않는다.
- 버튼은 `flex: 1 1 130px; min-width: 120px;`로 지정해 320px 폭에서도 버튼 하나가 카드 padding(좌우 32px→320px에서는 24px로 축소 권장)을 넘지 않는다.
- `#timer-display` 폰트 크기는 `clamp()`로 좁은 화면에서 자동 축소되어 잘리지 않는다.
- 320px 대응 시 카드 padding을 `24px 20px`로 줄이는 media query 권장: `@media (max-width: 360px) { .timer { padding: 24px 20px; } }`

## 5. 상태별 화면 문구 · 색상 매핑 (frozen §2/§3/§4 기반)

| 상태 | `#timer-phase-label` 텍스트 | phase 강조색(token) | `.timer__phase--*` class | `#timer-display` 예시 | `#timer-round-count` 예시 | `#timer-start-pause` 텍스트/`aria-label` | `#timer-reset` |
|---|---|---|---|---|---|---|---|
| `idle` (최초/리셋/세션완료 직후) | "대기" | `--color-phase-idle` (`#6b7280`) | 없음(기본) | `25:00` (work 초기값) | `1 / 4 라운드` | "시작" | "리셋" (항상 노출) |
| `work` | "작업" | `--color-phase-work` (`#2563eb`) | `.timer__phase--work` | `18:42` (카운트다운 중) | `2 / 4 라운드` | "일시정지" | "리셋" |
| `rest` | "휴식" | `--color-phase-rest` (`#16a34a`) | `.timer__phase--rest` | `04:12` | `2 / 4 라운드` | "일시정지" | "리셋" |
| `paused` (work 중 정지) | "일시정지" | `--color-phase-work` 유지 | `.timer__phase--work` 유지 | 정지 시점 값 그대로, 예: `12:07` | 변경 없음 | "시작" | "리셋" |
| `paused` (rest 중 정지) | "일시정지" | `--color-phase-rest` 유지 | `.timer__phase--rest` 유지 | 정지 시점 값 그대로, 예: `02:30` | 변경 없음 | "시작" | "리셋" |

세션 완료(마지막 rest 종료, AC4): 위 `idle` 행과 동일한 화면으로 돌아가되, `#timer-display`의 `aria-live="polite"` 영역에 "모든 라운드를 완료했습니다" 문구가 1회 announce된다. 이 문구는 스크린리더 announce가 핵심이며, 시각적으로는 `#timer-display` 근방에 1.5~2초간 fade-out되는 작은 캡션으로 보조 노출하는 것을 권장한다(신규 DOM ID/class 추가 없이 `#timer-display` 내부 텍스트 노드 또는 `.timer__display`의 `::after`/보조 `<span>`으로 구현 — 이 span은 frozen class 목록 밖이므로 별도 selector 계약 없이 developer가 자유롭게 구성).

## 6. 컴포넌트 명세

### `#timer-root.timer`
- container. 별도 role 불필요(시각적 카드 컨테이너).

### `#timer-phase-label`
- 배지(pill) 스타일: `padding: 4px 12px; border-radius: 999px; background: color-mix(in srgb, <phase색> 12%, white);` (또는 동일 효과의 고정 tint hex) `color: <phase색>;`
- 상태(work/rest/paused/idle)에 따라 §5 텍스트로 교체. 색상만으로 구분하지 않기 위해 텍스트 교체가 필수(frozen 접근성 규칙).

### `#timer-display.timer__display`
- `aria-live="polite"` 필수(frozen). 시간 텍스트 변경 및 구간 전환 시 스크린리더가 자동 announce.
- mm:ss 포맷 고정 폭 표기(`tabular-nums`)로 숫자 자릿수 변경 시 레이아웃 흔들림 방지.

### `#timer-round-count`
- "N / 총라운드 라운드" 형식의 텍스트. rest→work 자동전환 시에만 N 증가(§2.2 frozen 규칙, 시각적으로는 텍스트 갱신만 하면 됨).

### `.timer__control` > `#timer-start-pause`
- 상태: `기본(시작 대기/일시정지됨)` → 텍스트/aria-label "시작", `실행 중` → "일시정지". 두 값만 사용(frozen).
- 스타일: primary 버튼(§2.2 색상), `border-radius: 12px; padding: 14px 20px;`
- `:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }`
- `:hover { background:#1e293b; }`

### `.timer__control` > `#timer-reset`
- 텍스트: "리셋" (고정, 모든 상태에서 항상 클릭 가능 — idle 포함, R키는 idle에서 no-op이지만 버튼 자체는 항상 렌더).
- 스타일: secondary(outline) 버튼, `border: 1px solid #cbd5e1; background:#fff; color:#334155;`
- `:focus-visible`는 primary와 동일 규칙.

## 7. dev 구현 가이드 (developer, BF-1983 대상)

1. `apps/interval-timer/style.css`에 아래 CSS 변수를 최상위(`:root` 또는 `.timer`)에 선언한다. 이름 변경 금지(frozen):
   ```css
   :root {
     --color-phase-work: #2563eb;
     --color-phase-rest: #16a34a;
     --color-phase-idle: #6b7280;
     --space-control-gap: 12px;
   }
   ```
2. `.timer__phase--work` / `.timer__phase--rest`는 §6 배지·accent bar 색상을 각각 `--color-phase-work` / `--color-phase-rest`로 지정하는 modifier class로 구현한다. `idle`은 modifier class 없이 기본값(`--color-phase-idle`)을 사용한다(frozen §4.2).
3. `paused` 상태는 신규 class를 추가하지 않는다 — JS에서 직전 phase class(`timer__phase--work`/`timer__phase--rest`)를 제거하지 않고 유지한 채 `#timer-phase-label`의 textContent만 "일시정지"로 바꾼다(frozen §2.2, §4.2).
4. `#timer-display`에 `aria-live="polite"`를 정적 속성으로 부여한다(항상 존재, JS로 토글하지 않음).
5. `#timer-start-pause`의 `aria-label`은 JS에서 상태 전이마다 "시작"/"일시정지" 두 값만 갱신한다(§5 표 참조). 버튼의 가시 텍스트도 동일 값으로 동기화하면 라벨-텍스트 불일치를 피할 수 있다.
6. mm:ss 포맷 함수는 developer 구현 세부(계약 밖)이지만, 표시는 항상 2자리:2자리(`0` 패딩)로 고정한다(§5 예시 참조).
7. 반응형은 `.timer__control { display:flex; flex-wrap:wrap; gap:var(--space-control-gap); }` + 버튼 `flex:1 1 130px; min-width:120px;` 조합으로 320px 뷰포트에서도 overflow 없이 줄바꿈되도록 구현한다(§4.3, frozen §4.6 AC10).
8. 키보드 조작(Space=토글, R=리셋)은 `timer.js` 로직이며, 시각적으로는 버튼 `:focus-visible` 스타일(§6)만 준비하면 된다.

## 8. mockup 참조

같이 작성한 시각 mockup: `docs/design/BF-1981/mockup.html`

- idle / work / rest / paused(work 중, rest 중 2종) 5개 상태 패널과, 세션 완료 announce 보조 표기 1개 패널을 정적으로 나열한다.
- mockup은 frozen DOM ID(`timer-root`, `timer-display`, `timer-phase-label`, `timer-round-count`, `timer-start-pause`, `timer-reset`)와 CSS class(`timer`, `timer__display`, `timer__control`, `timer__phase--work`, `timer__phase--rest`)를 실제 마크업에 그대로 사용한다. 여러 상태 패널이 같은 페이지에 나열되므로 ID가 패널마다 반복되지만(정적 상태 갤러리 목적, JS 없음), 실제 앱(`apps/interval-timer/index.html`)에서는 `#timer-root` 등 각 ID가 문서 전체에서 1회만 존재해야 한다(developer 구현 시 유의).
