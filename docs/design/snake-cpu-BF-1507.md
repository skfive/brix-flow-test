# 네온 스네이크 · 모드 선택·난이도·승패 배너 시각 명세 (BF-1507)

- Jira(designer): BF-1508 · 대상 파일: `docs/design/snake-cpu-BF-1507.md`
- 선행(참조·불변): planner 실행 설계 `docs/plans/snake-cpu-BF-1507-plan.md` (planning-contract@v1 / ui-contract@v1)
- 후속(구현): developer BF-1509 · `demo/neon-snake-fullscreen-0802/**`
- mockup 참조: `docs/design/mockups/snake-cpu-BF-1507.html`

> 본 문서는 planner 가 **동결(frozen)** 한 UI 계약(ui-contract@v1)을 **시각으로 렌더**한다.
> selector·token·상태·접근성·반응형 계약을 **재정의하지 않으며**, 새 파일/역할/selector 를 추가하지 않는다.
> designer 는 승인된 실행 설계를 따르고, 런타임 HTML/CSS/JS 는 생성하지 않는다(시각 mockup 은 시안 시뮬레이션이며 dev 산출물이 아니다).

---

## 1. 시안 개요

기존 2인 로컬 스네이크(`demo/neon-snake-fullscreen-0802/`)에 **1인 vs CPU 대전 모드**가 additive 로 붙는다.
본 시안은 그 **진입 UI(모드 선택 → 난이도 선택)** 와 **종료 UI(승패 배너)** 의 시각 명세만 다룬다.
게임 규칙·엔진·색상 계약(2인 로컬)은 planner 동결 계약 그대로 보존한다.

### 1.1 변경 범위

- **추가**: 모드 선택 메뉴(`#mode-select`), 난이도 선택 메뉴(`#difficulty-select`), 승패 배너(`#winner-banner`).
- **추가 token 4종**: `--color-player1`, `--color-cpu`, `--color-menu-focus`, `--space-menu-gap` (index.html `:root` 에 additive, developer 소유).
- **보존**: 기존 2인 로컬 DOM/selector/색상(`--color-p1`/`--color-p2`/`--color-food`/`--color-bg`), HUD, 상태 배너, 결과 오버레이, 캔버스 리사이즈 로직.

### 1.2 사용자 경험 목표

- **명확한 진입 분기**: 데모를 열면 곧바로 "무엇을 할지"(2인 로컬 vs 1인 CPU)를 텍스트·색·포커스 링 3중 채널로 인지한다.
- **저부담 난이도 선택**: CPU 선택 시 쉬움/보통/어려움을 방향키+Enter 로 즉시 고른다. 현재 선택 항목이 시각적으로 분명하다.
- **결과의 접근성 있는 전달**: 승/패/무승부를 색이 아니라 **화면 텍스트("당신 승리"/"CPU 승리"/"무승부")** 로 먼저 전달하고, `aria-live` 로 스크린리더가 읽어준다.
- **되돌릴 수 있는 흐름**: game-over·취소 후 언제나 `mode-selection` 초기 화면으로 복귀하고 메뉴 컨트롤을 다시 키보드로 쓸 수 있다.

### 1.3 시각이 지켜야 하는 동결 불변식

- INV-A: frozen selector 와 token 을 변경·재정의하지 않는다.
- INV-B: 파일 소유권·상태 계약은 frozen blueprint 가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.
- INV-C: 모든 상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로** 노출한다.
- INV-D: 초기화·취소·실패 뒤에는 상태·진행 표시를 초기값으로 되돌리고 주 실행 control 을 다시 사용할 수 있다.

---

## 2. 컬러 팔레트

### 2.1 신규 additive token (frozen — exact 값, 변경 금지)

| token | HEX | 역할 |
| --- | --- | --- |
| `--color-player1` | `#39ff14` | 1P(사람) 뱀 색 — CPU 대전에서 사람 플레이어 식별 |
| `--color-cpu` | `#ff2bd6` | CPU(2P) 뱀 색 — 사람과 시각적으로 구분 |
| `--color-menu-focus` | `#00e5ff` | 모드/난이도 메뉴 포커스 링 색 |
| `--space-menu-gap` | `16px` | 모드/난이도 메뉴 항목 간격(스페이싱 token) |

> 위 4개는 신규 additive 이며 값을 그대로 사용한다. index.html `:root` 에 추가하며 정의·소유는 developer.

### 2.2 보존되는 기존 2인 로컬 token (재정의 금지)

| token | HEX | 역할 |
| --- | --- | --- |
| `--color-p1` | `#00e5ff` | 2인 로컬 1P 뱀(보존) |
| `--color-p2` | `#ff2fb9` | 2인 로컬 2P 뱀(보존) |
| `--color-food` | `#ffd400` | 먹이(보존) |
| `--color-bg` | `#0a0a12` | 배경(보존) |

### 2.3 승패 배너 결과 색 매핑 (색은 보조 채널 — 텍스트가 1차)

| 결과(엔진 상태) | 화면 텍스트 | 강조색(token 재사용) |
| --- | --- | --- |
| 사람 승리(`p1-win`) | **당신 승리** | `--color-player1` `#39ff14` |
| CPU 승리(`p2-win`) | **CPU 승리** | `--color-cpu` `#ff2bd6` |
| 무승부(`draw`) | **무승부** | 중립 텍스트색(`#f4f4ff`) |

> 색은 결과를 **강조**할 뿐 유일한 단서가 아니다. 색맹 사용자·흑백 화면·스크린리더 모두 텍스트로 결과를 안다(INV-C, AC-7).

### 2.4 표현용 보조 값 (mockup 시각화 전용 — frozen token 아님, 덮어쓰지 않음)

`--menu-scrim: rgba(10,10,18,0.72)` · `--menu-border: rgba(255,255,255,0.16)` · `--text-primary: #f4f4ff` · `--text-secondary: rgba(244,244,255,0.72)`. 이 값들은 시각 표현을 위한 권고이며 dev 가 동일 픽셀로 맞출 의무는 없다.

---

## 3. 타이포그래피

폰트는 vanilla-static 규약대로 **system font stack** 을 사용한다(외부 폰트 의존 0건).
`font-family: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;`

| 계층 | 용도 | size | weight | line-height |
| --- | --- | --- | --- | --- |
| heading | 메뉴 제목("모드 선택"/"난이도 선택") | `clamp(20px, 5vw, 28px)` | 700 | 1.2 |
| option | 메뉴 항목 라벨("2인 로컬"/"쉬움" 등) | `clamp(16px, 3.5vw, 20px)` | 700 | 1.3 |
| option-hint | 항목 보조 설명(작은 글씨) | `13px` | 500 | 1.4 |
| banner | 승패 배너 결과 텍스트 | `clamp(28px, 8vw, 56px)` | 800 | 1.15 |
| banner-sub | 배너 보조 안내("다시 시작하려면…") | `14px` | 500 | 1.5 |

- 점수 등 숫자는 기존 HUD 규약을 따른다(`font-variant-numeric: tabular-nums`).

---

## 4. 레이아웃

### 4.1 상태 모델 (frozen §6.4 — 재정의 없음)

```
mode-selection → difficulty-selection → playing ⇄ paused → game-over
                                                              │
              └──────────── restart / 취소 (mode-selection 복귀) ┘
```

| UI 상태 | 화면 | 엔진 상태 매핑 |
| --- | --- | --- |
| `mode-selection` | 모드 선택 메뉴 노출, 캔버스 뒤/비활성 | (엔진 시작 전) |
| `difficulty-selection` | 난이도 선택 메뉴 노출(CPU 모드 한정) | (엔진 시작 전) |
| `playing` | 대전 진행, 메뉴 숨김 | 엔진 `running` |
| `paused` | 일시정지 표시, 보드 상태 보존 | 엔진 `paused` |
| `game-over` | `#winner-banner` 결과 노출 | 엔진 `p1-win`/`p2-win`/`draw` |

- 로컬 모드는 난이도 단계를 생략: `mode-selection → playing`.

### 4.2 스테이지·메뉴 배치

- 스테이지 래퍼는 기존 `.snake-stage`(100dvw × 100dvh, overflow hidden)를 그대로 재사용한다.
- 모드/난이도 메뉴는 스테이지 **중앙에 세로 스택**으로 오버레이한다. 반투명 스크림 위 카드 형태.
- 메뉴 카드 내부: 제목 → 항목들. **항목 간 세로 간격 = `--space-menu-gap`(16px)**, 카드-스테이지 여백도 최소 16px.
- 승패 배너(`#winner-banner`)는 스테이지 중앙 오버레이. 결과 텍스트 + 보조 안내 + 재시작 안내.

### 4.3 spacing

- 메뉴 항목 간격: `gap: var(--space-menu-gap)` (16px, frozen).
- 카드 내부 패딩: 24px(desktop) / 20px(≤480px).
- 배너 텍스트-보조 간격: 12px.

### 4.4 breakpoint 별 동작 (반응형 — frozen §6.6)

- **≥ 320px 전 구간**: 풀스크린 캔버스가 overflow 없이 리사이즈(`computeBoardMetrics` 재사용). 논리 grid 고정, 픽셀만 재계산 → 뱀 좌표·점수·먹이 보존.
- **세로(portrait) 화면**: 모드/난이도 메뉴가 **잘리지 않고** 세로 스택으로 흐르며 `--space-menu-gap`(16px) 간격을 유지한다. 메뉴 카드는 `max-width: min(92vw, 420px)`, 필요 시 내부 스크롤 대신 항목이 세로로 쌓인다.
- **≤ 480px**: heading/option size 는 `clamp()` 하한으로 축소, 버튼 최소 히트 영역 44px 유지.

---

## 5. 컴포넌트 명세

### 5.1 모드 선택 메뉴 — `#mode-select` (`.mode-menu`)

- **DOM**: `#mode-select.mode-menu` 컨테이너 안에 2개 버튼(각 `.mode-menu__option`).
  - `#btn-mode-local.mode-menu__option` — 라벨 "2인 로컬", `aria-label="2인 로컬 대전 시작"`
  - `#btn-mode-cpu.mode-menu__option` — 라벨 "1인 vs CPU", `aria-label="1인 CPU 대전 시작"`
- **props/속성(시각 계약)**:

| 속성 | 값 |
| --- | --- |
| `role` | 컨테이너 메뉴(그룹), 항목은 `<button type="button">` |
| `aria-label`(항목) | frozen §6.5 문구 그대로 |
| 항목 간격 | `--space-menu-gap` (16px) |
| 포커스 링 | `--color-menu-focus` (#00e5ff) `:focus-visible` outline |

- **상태**:
  - default — 반투명 카드, 항목 테두리 은은.
  - `:hover` / `:focus-visible` — `--color-menu-focus` 2px outline + offset, 배경 살짝 밝게.
  - keyboard focus 이동 — 현재 초점 항목만 포커스 링.
- **인터랙션**:
  - `↑`/`↓` — 항목 간 포커스 이동.
  - `Enter` — 초점 항목 선택. `#btn-mode-local` → `playing`, `#btn-mode-cpu` → `difficulty-selection`.
  - 마우스 클릭도 동일 동작.

### 5.2 난이도 선택 메뉴 — `#difficulty-select` (`.difficulty-menu`)

- **DOM**: `#difficulty-select.difficulty-menu` 안에 **3개** `.difficulty-menu__option`.
  - `data-value="easy"` — 라벨 "쉬움", `aria-label="쉬움 난이도 선택"`
  - `data-value="normal"` — 라벨 "보통", `aria-label="보통 난이도 선택"`
  - `data-value="hard"` — 라벨 "어려움", `aria-label="어려움 난이도 선택"`
- **선택 표시**: **현재 선택 항목만** `.difficulty-menu__option--active` 를 가진다(단일 활성). active 는 색 + 굵기/테두리로 이중 표기(색 단독 금지, INV-C).
- **props/속성**:

| 속성 | 값 |
| --- | --- |
| 활성 표시 | `.difficulty-menu__option--active` (단 하나) |
| `aria-pressed` 또는 `aria-current` | 활성 항목에 부여(선택 상태의 접근성 이름 노출) |
| 항목 간격 | `--space-menu-gap` (16px) |
| 포커스 링 | `--color-menu-focus` (#00e5ff) |

- **상태**: default / hover·focus(포커스 링) / active(선택됨 — `--active`).
- **인터랙션**:
  - `↑`/`↓`(또는 `←`/`→`) — 항목 이동, 이동 시 `--active` 가 초점 항목으로 이동.
  - `Enter` — 난이도 확정 후 `playing` 진입.
  - **취소**(`Esc` 또는 "뒤로" 항목) — `mode-selection` 으로 복귀, 모드 메뉴 컨트롤 재활성(INV-D).

### 5.3 승패 배너 — `#winner-banner` (`.winner-banner`)

- **DOM**: `#winner-banner.winner-banner`, `aria-live="polite"`, `role="status"`.
- **내용(3형태 — 색이 아니라 텍스트가 1차 채널)**:

| 결과 | 배너 결과 텍스트 | 보조 안내 |
| --- | --- | --- |
| 사람 승리 | **당신 승리** | "다시 시작하려면 재시작을 누르세요" |
| CPU 승리 | **CPU 승리** | "다시 시작하려면 재시작을 누르세요" |
| 무승부 | **무승부** | "다시 시작하려면 재시작을 누르세요" |

- **상태**:
  - `game-over` 진입 시에만 노출. playing/paused 에서는 숨김(`hidden`).
  - 결과별 강조색은 §2.3 매핑(색은 보조). 무승부는 중립색.
- **인터랙션·후조건(INV-D, frozen §2/§6)**:
  - 배너는 결과 텍스트를 `aria-live="polite"` 로 즉시 읽힌다.
  - **재시작 / 취소** 시 `#winner-banner` 를 비우고 UI 를 `mode-selection` **초기값**으로 되돌린다.
  - 이때 모드 선택 메뉴의 주 실행 control(버튼)을 **다시 키보드로 사용**할 수 있게 재활성한다.

### 5.4 대전 화면 뱀 색 구분 (playing/paused/game-over 렌더)

- 1P(사람) 뱀 = `--color-player1` (#39ff14), CPU(2P) 뱀 = `--color-cpu` (#ff2bd6). 두 색은 명도·색상 모두 뚜렷이 구분된다.
- HUD 는 색 외에 **"당신"/"CPU" 텍스트 라벨**로도 두 주체를 구분한다(색 단독 금지, INV-C).
- 로컬 모드 색상 계약(`--color-p1`/`--color-p2`)은 그대로 보존한다(모드에 따라 색 팔레트가 갈린다).

---

## 6. dev 구현 가이드 (developer BF-1509 가 따라할 지침)

> 아래는 **권장 CSS 변수명/클래스명/구조** 다. frozen selector·token·상태·접근성·반응형·파일 경로는 그대로 구현하고, 새 selector/역할/파일을 추가하지 않는다(AC-8).

1. **token 추가** — `index.html` `:root` 에 §2.1 의 4개 token 을 **additive** 로 추가. 기존 2인 로컬 token 은 건드리지 않는다.
   ```css
   :root {
     /* ...기존 --color-p1/--color-p2/--color-food/--color-bg 보존... */
     --color-player1: #39ff14;
     --color-cpu: #ff2bd6;
     --color-menu-focus: #00e5ff;
     --space-menu-gap: 16px;
   }
   ```
2. **모드 메뉴 마크업** — `.snake-stage` 안에 오버레이로 추가:
   ```html
   <div id="mode-select" class="mode-menu"> <!-- mode-selection 에서만 노출 -->
     <button id="btn-mode-local" class="mode-menu__option" type="button"
             aria-label="2인 로컬 대전 시작">2인 로컬</button>
     <button id="btn-mode-cpu" class="mode-menu__option" type="button"
             aria-label="1인 CPU 대전 시작">1인 vs CPU</button>
   </div>
   ```
3. **난이도 메뉴 마크업** — CPU 선택 시 노출, 3개 항목·단일 `--active`:
   ```html
   <div id="difficulty-select" class="difficulty-menu"> <!-- difficulty-selection 에서만 노출 -->
     <button class="difficulty-menu__option" data-value="easy"   type="button" aria-label="쉬움 난이도 선택">쉬움</button>
     <button class="difficulty-menu__option difficulty-menu__option--active" data-value="normal" type="button" aria-label="보통 난이도 선택" aria-current="true">보통</button>
     <button class="difficulty-menu__option" data-value="hard"   type="button" aria-label="어려움 난이도 선택">어려움</button>
   </div>
   ```
   - 선택 이동 시 `--active` 클래스·`aria-current` 를 **한 항목에만** 유지.
4. **승패 배너 마크업**:
   ```html
   <div id="winner-banner" class="winner-banner" role="status" aria-live="polite" hidden>
     <!-- game-over 시 '당신 승리' / 'CPU 승리' / '무승부' 텍스트 주입 -->
   </div>
   ```
   - 엔진 `p1-win → 당신 승리`, `p2-win → CPU 승리`, `draw → 무승부` 로 텍스트 매핑.
5. **간격·포커스 CSS** — 메뉴 항목 간 `gap: var(--space-menu-gap)`, `:focus-visible { outline: 2px solid var(--color-menu-focus); outline-offset: 2px; }`.
6. **키보드** — 메뉴에서 `↑`/`↓` 이동 + `Enter` 선택. 난이도에서 `Esc`(또는 뒤로) → `mode-selection` 복귀. CPU 모드에서 방향키(2P) 입력은 비활성(입력 경로를 `chooseCpuDirection` 이 대체, planner §5.4).
7. **후조건** — restart/취소 후 `#winner-banner` 비우고 `mode-selection` 초기값 복귀 + 메뉴 컨트롤 재활성(INV-D). 상태 전이·색 매핑은 planner 실행 설계 §6.4 를 그대로 따른다.
8. **반응형** — 세로 화면에서 메뉴가 잘리지 않도록 세로 스택 + `--space-menu-gap` 유지. 캔버스는 기존 `computeBoardMetrics` 리사이즈 로직 재사용(≥320px overflow 0).

> ⚠️ 픽셀 단위 일치 의무 없음: mockup 은 UX 의도 전달용. frozen selector/token/상태/접근성/반응형/경로만 정확히 지키면 된다.

---

## 7. mockup 참조

- 시각 mockup HTML: **`docs/design/mockups/snake-cpu-BF-1507.html`**
- 단일 self-contained 파일(외부 의존성 0건, 인라인 `<style>`, system font).
- 표현 상태: `mode-selection` / `difficulty-selection` / `playing`(1P vs CPU) / `paused` / `game-over`(당신 승리·CPU 승리·무승부 3형태) + token 스와치 + 접근성·반응형 legend.
- 본 markdown 의 컬러/타이포/레이아웃/컴포넌트 명세와 시각적으로 동기화되어 있다.

---

## 8. Acceptance Criteria 매핑

| AC(planner §4) | 본 시안에서의 충족 지점 |
| --- | --- |
| AC-1 모드 선택 노출 | §5.1 `#mode-select` + `#btn-mode-local`/`#btn-mode-cpu` + aria-label |
| AC-2 CPU→난이도 | §5.2 `#difficulty-select` 3항목, 단일 `--active` |
| AC-7 승패 배너 접근성 | §5.3 `#winner-banner` aria-live=polite, 3형태 화면 텍스트(색 단독 금지) |
| AC-6/INV-D 후조건 | §5.2 취소·§5.3 재시작 → `mode-selection` 복귀 + 컨트롤 재활성 |
| AC-8 exact UI 계약 | §2 token·§5 selector·§4 상태·§6 경로를 frozen 그대로, 신규 selector/역할/파일 없음 |
| 접근성(방향키+Enter) | §5.1/§5.2 키보드 인터랙션 |
| 반응형(≥320px·세로 gap) | §4.4 breakpoint 동작 |
