# Simon Says 게임 UI 디자인 명세 — BF-936

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-936(본 designer task) · Epic BF-934(Simon Says) · 계약 BF-935(`docs/context-contracts/simon-says-BF-935.md`)
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 mockup 내 직접 정의
> 대상 라우트(예정): `/phase18-games/simon-says` (신규 module, 코드 미작성 — dev task 담당)
> 산출물: 본 명세 markdown + mockup HTML(`docs/design/mockups/simon-says-BF-936.html`)

---

## 0. 문서 성격 및 전제 (필독)

- **본 task 범위:** 계약(BF-935) `nonGoals` 를 준수하여 **디자인 시스템 리팩터링 없이 `simon-says` module 내부에 국한**된 UI/UX 명세와 정적 mockup 만 산출한다. 공용 토큰(`palette/**`, `docs/design/palette-BF-461.md`)·기존 게임 코드는 손대지 않는다.
- **색 토큰 정의 위치:** vanilla-static stack 이므로 design-tokens.json 이 없다. 모든 색·타이포·간격 토큰은 mockup 및 dev 의 `styles.css` `:root` 에 **직접 정의**한다(외부 웹폰트·CDN 금지).
- **다크 테마 표준 토큰 승계:** 배경/텍스트/보더/포커스링 등 중립 토큰은 기존 phase18 게임 계열(pong·memory-match·breakout·snake)과 **동일 값**을 승계하여 시각 일관성을 유지한다. 4색 패드 토큰만 Simon 전용 신규 정의다.
- **dev 산출물 아님:** mockup 은 시안 시각화 전용이다. dev 는 참조 가이드로만 사용하며 픽셀 단위 일치 의무는 없다.

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 module `simon-says` 의 단일 화면 SPA 시안.
- 구성: **4색 패드(2×2 그리드)** + **중앙 상태/라운드 표시** + **컨트롤(시작/다시하기)** + **조작 안내**.
- 게임 규칙 자체(시퀀스 생성·판정 로직)는 dev/planner 후속 담당. 본 명세는 **화면·상태·접근성**만 정의한다.

### 1.2 사용자 경험 목표
1. **한눈에 상태 파악** — "지금 컴퓨터가 보여주는 중인지 / 내가 눌러야 하는지"를 중앙 status 텍스트와 패드 활성 하이라이트로 즉시 전달.
2. **라운드 진척감** — 라운드 카운터로 현재 도달 단계를 명확히 표시(성공 시 증가 애니메이션).
3. **색맹·저시력 접근성** — 색에만 의존하지 않고 각 패드에 **위치(모서리) + 텍스트 라벨 + 아이콘(선택)** 을 병행. 활성 시 밝기·스케일 변화로 이중 신호.
4. **키보드 완전 조작** — 마우스 없이 숫자키/방향/Tab+Enter 로 4패드 + 컨트롤 전부 조작 가능.

---

## 2. 컬러 팔레트

### 2.1 표준 토큰 (다크 테마 — 기존 phase18 게임 계열 승계, 값 불변)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0B0F17` | 페이지 배경 |
| `--color-bg-surface` | `#141B26` | 카드·패널 표면 |
| `--color-bg-subtle` | `#1C2431` | 보조 표면(라운드 배지 등) |
| `--color-border-default` | `#273140` | 기본 보더 |
| `--color-border-strong` | `#3A4657` | 강조 보더 |
| `--color-text-primary` | `#E8EDF4` | 본문·제목 텍스트 |
| `--color-text-secondary` | `#9AA7B8` | 보조 텍스트 |
| `--color-text-muted` | `#63708A` | 캡션·비활성 |
| `--color-accent` | `#5B82F0` | 액션 강조(시작 버튼) |
| `--color-accent-hover` | `#6E90F5` | 액션 hover |
| `--color-accent-on` | `#0B0F17` | accent 위 텍스트 |
| `--color-focus-ring` | `rgba(91,130,240,.55)` | 키보드 포커스 링 |
| `--color-success` | `#4ADE80` | 성공 상태 |
| `--color-danger` | `#E55858` | 실패 상태 |

### 2.2 Simon 전용 토큰 (신규 — 4색 패드)

각 패드는 **평상시(dim) / 활성(lit)** 2단계 색을 가진다. 평상시는 채도를 낮춰 "꺼진 램프", 활성은 밝게 빛나는 "켜진 램프" 로 표현한다.

| 패드 | 위치 | dim(평상시) | lit(활성/점등) | 텍스트 라벨 | 숫자키 |
|---|---|---|---|---|---|
| Green | 좌상(↖) | `--pad-green-dim` `#1B6E3C` | `--pad-green-lit` `#38F58A` | "초록" | `1` |
| Red | 우상(↗) | `--pad-red-dim` `#8E2B2B` | `--pad-red-lit` `#FF6B6B` | "빨강" | `2` |
| Yellow | 좌하(↙) | `--pad-yellow-dim` `#8A6A16` | `--pad-yellow-lit` `#FFDA47` | "노랑" | `3` |
| Blue | 우하(↘) | `--pad-blue-dim` `#1E4E8E` | `--pad-blue-lit` `#4DA6FF` | "파랑" | `4` |

보조 토큰:

| 토큰 | 값 | 용도 |
|---|---|---|
| `--pad-lit-glow` | `rgba(255,255,255,.35)` | 활성 패드 외곽 글로우 |
| `--pad-gap` | `14px` | 패드 사이 간격(중앙 코어 노출) |
| `--pad-core-bg` | `#0A0D14` | 그리드 중앙 코어(status/라운드 표시 배경) |
| `--status-info` | `#9AA7B8` | 일반 안내 상태 텍스트 |
| `--status-watch` | `#4DA6FF` | "잘 보세요" 시퀀스 재생 중 |
| `--status-your-turn` | `#38F58A` | "당신 차례" 입력 대기 |
| `--status-fail-tint` | `rgba(229,88,88,.14)` | 실패 시 화면 tint |

### 2.3 색맹·명도 안전성 근거
- 4색은 **위치(2×2 사분면 고정) + 텍스트 라벨 + 숫자키** 로 삼중 식별되므로, 적록/청황 색각 이상에서도 색 구분에 의존하지 않는다.
- lit 값은 dim 대비 명도(luminance)를 크게 올려(예: green `#1B6E3C`→`#38F58A`) 점등을 **밝기 변화만으로도** 감지 가능하게 했다.
- 활성 패드는 색 외에 `transform: scale(1.04)` + 글로우로 **모션 신호**를 추가한다(단, `prefers-reduced-motion` 시 스케일 대신 보더 강조로 대체 — §5.7).

---

## 3. 타이포그래피

system font stack 만 사용(외부 웹폰트 금지).

```
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | font | 용도 |
|---|---|---|
| 페이지 제목(h1) | `600 20px/1.3 sans` | "Simon Says" 타이틀 |
| 라운드 값 | `700 clamp(28px,9vw,44px)/1 mono` | 라운드 카운터 숫자 |
| 라운드 라벨 | `600 12px/1.2 sans`, letter-spacing .06em, uppercase | "ROUND" 캡션 |
| 상태 텍스트 | `600 clamp(15px,4.5vw,18px)/1.35 sans` | "잘 보세요" / "당신 차례" 등 |
| 패드 라벨 | `600 14px/1 sans` | 각 패드 "초록/빨강/…" |
| 버튼 | `600 14px/1 sans` | 시작/다시하기 |
| 본문·안내 | `400 15px/1.5 sans` | 조작 안내 |
| 캡션 | `400 13px/1.4 sans` | 부가 설명 |

---

## 4. 레이아웃

### 4.1 페이지 구조
```
┌───────────────────────────────────┐
│  header: "Simon Says"  (h1)       │
├───────────────────────────────────┤
│         status 텍스트 (live)       │  ← aria-live=polite
│                                   │
│      ┌─────────┬─────────┐        │
│      │ Green ↖ │  Red ↗  │        │
│      ├─────────┼─────────┤        │  ← 2×2 pad grid
│      │Yellow ↙ │ Blue ↘  │        │     중앙 코어에 ROUND 배지
│      └─────────┴─────────┘        │
│                                   │
│   [ 시작 ]   [ 다시하기 ]          │  ← controls
│                                   │
│   조작 안내: 1·2·3·4 / 방향키 / … │  ← hint
└───────────────────────────────────┘
```

### 4.2 spacing 스케일
```
--space-1:4px --space-2:8px --space-3:12px --space-4:16px
--space-5:24px --space-6:32px --space-7:48px
--radius-sm:8px --radius-md:12px --radius-lg:18px --radius-pill:999px
```

### 4.3 pad grid 치수
- 그리드 컨테이너: 정사각(`aspect-ratio:1/1`), `width: min(88vw, 420px)`, 중앙 정렬.
- `display:grid; grid-template-columns:1fr 1fr; gap:var(--pad-gap);`
- 각 패드: 정사각 셀, `border-radius:var(--radius-lg)`(바깥 모서리는 크게, 안쪽 모서리는 작게 — 램프 느낌).
- **중앙 코어(ROUND 배지):** grid 위에 절대배치된 원형(`--pad-core-bg`), 지름 `36%`, 그리드 정중앙. 4패드가 코어를 둘러싸는 클래식 Simon 형태.

### 4.4 반응형 (권장)
| breakpoint | 동작 |
|---|---|
| ≤ 480px (모바일) | pad grid `width:88vw`, 상태 텍스트 clamp 하한, 버튼 full-width 세로 스택 |
| 481–768px (태블릿) | pad grid 최대 420px 고정, 버튼 가로 배치 |
| ≥ 769px (데스크톱) | 콘텐츠 max-width 480px 중앙, 여백 확대 |

---

## 5. 컴포넌트 명세

### 5.1 패드 버튼 (`.pad`, ×4)
- 시맨틱: `<button type="button" class="pad pad--green" data-pad="green">`.
- **접근 가능 이름:** 각 버튼에 `aria-label="초록 패드 (숫자 1)"` 형식으로 명시(패드 색 + 숫자키 안내). 시각 라벨은 `.pad__label` 텍스트로도 병행 노출.
- props / data 속성 (dev 참조):

| 속성 | 값 | 의미 |
|---|---|---|
| `data-pad` | `green` \| `red` \| `yellow` \| `blue` | 패드 식별 |
| `data-key` | `1`~`4` | 대응 숫자키 |
| `aria-label` | "초록 패드 (숫자 1)" 등 | 스크린리더 이름 |
| `aria-disabled` | `true` when 시퀀스 재생 중 | 입력 불가 안내 |

- 상태(state) 5종:

| 상태 | 클래스 | 시각 |
|---|---|---|
| idle/dim | (기본) | dim 색, 평면 |
| lit(점등) | `.is-lit` | lit 색 + `scale(1.04)` + 글로우 (시퀀스 재생 & 입력 피드백 공용) |
| hover | `:hover` (입력 대기 중만) | 밝기 +8%, 커서 pointer |
| focus | `:focus-visible` | `--color-focus-ring` 3px 아웃라인(색과 무관하게 항상 표시) |
| disabled | `[aria-disabled="true"]` | 커서 not-allowed, hover 무효, 밝기 불변 |

### 5.2 상태 표시 (`.status`)
- 위치: pad grid 위. `<p class="status" role="status" aria-live="polite">`.
- 게임 진행 상태를 **텍스트 + 색**으로 표시. `aria-live="polite"` 로 스크린리더가 상태 변화를 읽음.

| 게임 상태 | 텍스트(예시) | 색 토큰 |
|---|---|---|
| 대기(시작 전) | "시작을 눌러 주세요" | `--status-info` |
| 시퀀스 재생 중 | "잘 보세요…" | `--status-watch` |
| 플레이어 입력 대기 | "당신 차례입니다" | `--status-your-turn` |
| 정답 진행 | "좋아요! 계속" | `--color-success` |
| 실패 | "틀렸습니다 — 다시 도전!" | `--color-danger` |

- 실패 시 화면 전체에 `--status-fail-tint` 를 짧게 오버레이(§5.7).

### 5.3 라운드 카운터 (`.round-badge`)
- 위치: pad grid 중앙 코어. `<div class="round-badge" role="img" aria-label="현재 라운드 N">`.
- 구성: 상단 라벨 "ROUND"(caption) + 하단 큰 숫자(mono). 초기값 `0` 또는 `1`(dev 규칙).
- 성공으로 라운드 증가 시 숫자에 `scale` pop 애니메이션(§5.7). `aria-label` 도 갱신되어 스크린리더가 새 라운드를 읽음.

### 5.4 컨트롤 버튼 (`.btn`)
| 버튼 | 클래스 | type | 라벨 | 상태 |
|---|---|---|---|---|
| 시작 | `.btn .btn--primary` | button | "시작" | 게임 진행 중 `disabled` |
| 다시하기 | `.btn .btn--secondary` | button | "다시하기" | 게임오버/진행 중 활성, 대기 중 `disabled` 가능 |

- 모든 버튼 `:focus-visible` 포커스 링 필수. `disabled` 시 `--color-text-muted`.

### 5.5 조작 안내 (`.hint`)
- `<p class="hint">` 정적 텍스트: "패드 클릭 · 숫자키 1234 · 방향키 · Enter/Space 로 선택".
- 색맹 사용자를 위해 "각 패드는 색·위치·숫자로 구분됩니다" 문구 포함.

### 5.6 키보드 조작 · 포커스 순서 (접근성 핵심)

**Tab 포커스 순서(문서 순서와 일치):**
```
1. 시작 버튼
2. 다시하기 버튼
3. Green 패드 (숫자 1)
4. Red 패드   (숫자 2)
5. Yellow 패드(숫자 3)
6. Blue 패드  (숫자 4)
```
> 컨트롤 → 패드 순으로 배치하여, 키보드 사용자가 먼저 게임을 시작한 뒤 자연스럽게 패드로 이동하게 한다. 패드 그리드 내부는 좌상→우상→좌하→우하(읽기 순서)로 Tab 이동.

**키 매핑:**

| 키 | 동작 |
|---|---|
| `Tab` / `Shift+Tab` | 위 순서로 포커스 이동 |
| `Enter` / `Space` | 포커스된 패드·버튼 활성(누름) |
| `1` `2` `3` `4` | 각각 Green·Red·Yellow·Blue 패드 직접 입력(포커스 무관, 전역) |
| 방향키 `←↑→↓` | (선택 확장) 방향↔패드 매핑: ↑=Green, →=Red, ↓=Yellow… 은 dev 판단. 최소 요구는 숫자키 |

- 시퀀스 재생 중에는 패드가 `aria-disabled=true` 이며 키 입력을 무시(오입력 방지). 상태 텍스트가 "잘 보세요…" 로 안내.
- **포커스는 절대 색 링만으로 표현하지 않는다** — `outline` 은 색과 독립적으로 3px 두께로 항상 보이게.

### 5.7 인터랙션 · 모션 요약
| 이벤트 | 반응 |
|---|---|
| 시퀀스 재생 | 각 패드 순차 `.is-lit` 점등(예: 500ms on / 200ms off) + 상태 "잘 보세요…" |
| 플레이어가 올바른 패드 누름 | 해당 패드 짧게 `.is-lit`, 상태 "좋아요! 계속" |
| 라운드 성공 | round-badge 숫자 pop, 라운드 +1 |
| 실패(오입력) | 화면 `--status-fail-tint` flash + 상태 "틀렸습니다", 시작/다시하기 활성화 |
| `prefers-reduced-motion: reduce` | 점등 시 `scale`·글로우 애니메이션 제거, 대신 `--pad-lit` 색 + 3px 밝은 보더로 정적 표현. 라운드 pop 도 즉시 값만 변경 |

---

## 6. dev 구현 가이드

### 6.1 파일별 역할 (계약 BF-935 candidateFiles 승계)
| 파일 | 역할 |
|---|---|
| `phase18-games/simon-says/index.html` | 마크업 골격 — header / status / pad-grid(+round-badge) / controls / hint |
| `phase18-games/simon-says/styles.css` | `:root` 토큰(§2) + 레이아웃(§4) + 패드 상태(§5.1) |
| `phase18-games/simon-says/logic.js` | 시퀀스 생성·판정(본 명세 비대상, 규칙은 planner) |
| `phase18-games/simon-says/main.js` | DOM 바인딩·이벤트·상태 클래스 토글 |

### 6.2 STEP 1 — `:root` 토큰 복제
mockup `<style>` `:root` 블록(§2.1 표준 + §2.2 Simon 전용)을 `styles.css` 에 **그대로 복제**. 하드코딩 색 금지, 전부 변수 참조.

### 6.3 STEP 2 — 레이아웃 골격 (§4)
- `.simon-app`(max-width 480px 중앙) > `.status` > `.pad-grid`(2×2, `aspect-ratio:1/1`, 중앙 `.round-badge` 절대배치) > `.controls` > `.hint`.

### 6.4 STEP 3 — 패드 4개 (§5.1)
- `<button class="pad pad--green" data-pad="green" data-key="1" aria-label="초록 패드 (숫자 1)">` × 4.
- 상태 토글은 `.is-lit` 클래스 + `aria-disabled` 속성으로만. dim/lit 색은 CSS 변수로.

### 6.5 STEP 4 — 상태·라운드 (§5.2·§5.3)
- `.status[role=status][aria-live=polite]` 텍스트·색을 상태별로 갱신.
- `.round-badge[role=img]` 의 `aria-label` 을 라운드 변경 시 함께 갱신.

### 6.6 STEP 5 — 접근성 (§5.6)
- Tab 순서 = DOM 순서. 컨트롤→패드 순으로 마크업 배치.
- 전역 `keydown` 리스너로 `1~4` 매핑, `Enter/Space` 는 버튼 기본 동작 활용.
- `:focus-visible` 3px `--color-focus-ring` 아웃라인 전역 적용.
- `@media (prefers-reduced-motion: reduce)` 분기(§5.7).

### 6.7 권장 클래스명 요약 (mockup 과 일치)
```
.simon-app  .app__title
.status  .status--watch  .status--your-turn  .status--success  .status--fail
.pad-grid  .pad  .pad--green|red|yellow|blue  .pad__label  .is-lit
.round-badge  .round-badge__label  .round-badge__value
.controls  .btn  .btn--primary  .btn--secondary
.hint
```

---

## 7. mockup 참조

- **경로:** `docs/design/mockups/simon-says-BF-936.html`
- 단일 self-contained HTML(외부 의존성 0). §2 토큰·§4 레이아웃·§5 컴포넌트를 시각화.
- 정적 파일이라 애니메이션 시퀀스는 재현 불가 → **상태별 스냅샷 섹션**(대기 / 시퀀스 재생 중=Green 점등 / 당신 차례 / 실패)으로 각 상태를 나란히 그려 dev·reviewer 가 상태 전이를 한눈에 비교하도록 구성.
- `:hover`·`:focus-visible` 는 CSS 로 직접 구현하여 실제 인터랙션 확인 가능.

---

## 8. AC 매핑

| 수용 기준 | 충족 근거 |
|---|---|
| Given 계약 nonGoals, When 시안 작성, Then 디자인 시스템 리팩터링 없이 module 내부 국한 명세 | §0 전제 + §2.1 은 기존 토큰 **값 불변 승계**, 신규는 §2.2 Simon 전용 토큰만. 공용 `palette/**`·`docs/design/palette-BF-461.md` 미변경. 산출물은 `docs/design/**` 2파일뿐 |
| Given 접근성 요구, When mockup 열면, Then 각 패드 버튼에 접근 가능한 이름 + 키보드 포커스 순서 정의 | §5.1 각 패드 `aria-label` + §5.6 Tab 포커스 순서 6단계 + 숫자키/Enter/Space 매핑. mockup 에 실제 `<button aria-label>` 마크업 + focus-visible CSS 반영 |
