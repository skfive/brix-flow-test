# Snake 게임오버·재시작 UX 디자인 명세 — BF-972

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-970(planner SSOT) · **BF-972(본 designer task)** · BF-973(developer) · BF-975(tester)
> 대상 모듈: `phase18-games/snake/`(기존 구현, BF-925) — **신규 화면 아님, 기존 시각 요소 정합화**
> 토큰 SSOT: `docs/design/snake-BF-922.md`(§2 팔레트·§3 타이포·§5 컴포넌트) — 본 문서는 그 토큰을 **변경 없이 재사용**한다.
> 로직 SSOT: `docs/plan/snake-boundary-restart-BF-970.md` — 게임오버 사유(`wall`/`self`/`board-full`)·재시작 상태 계약을 그대로 따른다.
> mockup 참조: `docs/design/mockups/snake-gameover-restart-BF-972.html`

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 본 문서는 "시각 정합화 명세"이지 신규 디자인이 아니다.** 게임오버 오버레이·재시작 버튼·포커스 링·조작 안내는 이미 `phase18-games/snake/`(index.html·main.js·styles.css)에 구현·렌더되고 있다. 본 문서는 그 **기존 시각 요소를 유지**하면서, 게임오버 표시·재시작 안내·포커스 표시·조작 안내가 **키보드/터치 두 입력 경로에서 일관되게 성립하는지**를 디자인 계약으로 명문화한다. dev(BF-973)는 회귀 가드 작성 시 본 문서의 시각 계약을 "무엇이 화면에서 참이어야 하는가"의 기준으로 참조한다.

**전제 2 — 게임 규칙은 변경하지 않는다.** 보드 크기(20×20)·틱 간격(150ms)·초기 뱀 길이(3)·점수 공식(먹이당 10점)·방향 전환 규칙·게임오버 판정(`isWallCollision`/`isSelfCollision`/board-full)은 planner §0 가정 5·§4 nonGoals 그대로 **불변**이다. 본 문서에는 게임 규칙을 바꾸는 어떤 시각 요구도 없다.

**전제 3 — 신규 디자인 토큰을 추가하지 않는다.** 게임오버·재시작·포커스·조작 안내에 필요한 모든 색/간격/타이포 토큰은 `styles.css :root`(snake-BF-922.md §2 승계)에 이미 존재한다. 본 문서는 그 토큰 이름만 인용하며, 새 토큰 정의·기존 토큰 값 변경을 요구하지 않는다(운영자 승인 없는 토큰 변경 금지 원칙 준수 — 단, 이 모듈은 `vanilla-static` stack 으로 `design-tokens.json` 미사용, `styles.css :root` 가 토큰 원본).

**전제 4 — 작업 범위는 `docs/design/snake-*.md`(+ 짝 mockup)로 제한한다.** 코드(`phase18-games/snake/**`) 변경은 dev(BF-973) 담당. 본 문서에서 인용하는 DOM id/클래스/문구는 **현재 구현 실측값**이며, dev 가 이를 유지·회귀 가드하도록 명문화한 것이지 변경 지시가 아니다.

---

## 1. 시안 개요

### 1.1 변경 범위

| 영역 | as-is (실측) | 본 명세의 정합화 목표 |
|---|---|---|
| 게임오버 표시 | 오버레이 `data-state="gameover"` + 아이콘 ✕ + 제목 "게임 오버" + 사유 문구 + 스탯. 사유 3종(`wall`/`self`/`board-full`) 문구는 `main.js` REASON_TEXT 에 존재 | 3종 사유 문구·색·아이콘이 **동일 레이아웃 안에서 사유만 교체**되며 교차 노출이 없음을 시각 계약으로 고정 |
| 재시작 안내 | 오버레이 "다시하기"(`#btn-again`) / 하단 "재시작"(`#btn-restart`) / "메뉴로"(`#btn-menu`) 3경로 존재 | 3개 재시작 진입점의 **노출 조건·시각 위계(primary/ghost)·문구**를 일관 정의. 키보드(Enter)와 터치(버튼)가 동일 결과 |
| 포커스 표시 | 오버레이 등장 시 `overlay-title` 로 포커스 이동, `:focus-visible` 링(accent + focus-ring) | 오버레이 포커스 이동·포커스 링 토큰·탭 순서를 유지하고 게임오버/재시작 전환 시 포커스 유실이 없음을 명시 |
| 조작 안내 | 하단 `.controls__hint` 1줄(방향키·WASD·P·Enter) | 안내 문구가 **키보드/터치 조작을 모두 포함**하고 게임오버 화면에서도 접근 가능함을 유지·정합 |

### 1.2 사용자 경험 목표

- **게임오버가 즉시·명확하게 인지된다** — 보드 위 붉은 틴트 + 스크림 + ✕ 아이콘 + 사유 문구 3중 신호로, 왜 끝났는지(벽/몸/클리어)를 즉시 이해한다.
- **재시작이 한 동작으로 가능하다** — 게임오버 순간 포커스가 오버레이 카드로 이동해 있어, 키보드 사용자는 Enter, 터치 사용자는 "다시하기" 버튼 한 번으로 즉시 재시작한다.
- **입력 경로에 관계없이 동일하게 동작한다** — 키보드/D-pad(터치) 어느 쪽으로 플레이했든 게임오버 표시와 재시작 흐름이 같다(별도 모바일/데스크톱 분기 없음).
- **기존 플레이 감성을 해치지 않는다** — 신규 연출·색·모션 추가 없이, 이미 검증된 시각 언어를 그대로 유지한다.

---

## 2. 컬러 팔레트 (기존 토큰 재사용 — 신규 정의 없음)

모든 값은 `styles.css :root`(snake-BF-922.md §2) 원본. **본 문서는 값을 변경하지 않는다.**

| 역할 | 토큰 | HEX / 값 | 게임오버·재시작·포커스에서의 쓰임 |
|---|---|---|---|
| primary(accent) | `--color-accent` | `#5b82f0` | "시작/계속하기/다시하기" primary 버튼 배경, D-pad active |
| primary hover | `--color-accent-hover` | `#6e90f5` | primary 버튼 hover |
| accent 대비 전경 | `--color-accent-on` | `#0b0f17` | primary 버튼 글자색 |
| secondary 표면 | `--color-bg-subtle` | `#1c2431` | "일시정지" secondary 버튼·D-pad 기본 배경 |
| background(캔버스) | `--color-bg-canvas` | `#0b0f17` | 페이지 배경 |
| background(표면) | `--color-bg-surface` | `#141b26` | 스코어보드·noscript 패널 |
| text primary | `--color-text-primary` | `#e8edf4` | 오버레이 제목·스탯·사유 문구 |
| text secondary | `--color-text-secondary` | `#9aa7b8` | 오버레이 설명·"메뉴로" ghost 글자 |
| text muted | `--color-text-muted` | `#63708a` | 조작 안내(`.controls__hint`) |
| danger(게임오버) | `--color-danger` | `#e55858` | ✕ 아이콘·게임오버 제목·noscript 경계 |
| success(최고점) | `--color-success` | `#4ade80` | 최고 점수 갱신 순간 강조(`data-highlight`) |
| 오버레이 스크림 | `--overlay-scrim` | `rgba(5,7,12,0.74)` | start/gameover 오버레이 배경 |
| 게임오버 틴트 | `--gameover-tint` | `rgba(229,88,88,0.14)` | 게임오버 시 보드 위 붉은 오버레이(캔버스 + 오버레이 inset) |
| 포커스 링 | `--color-focus-ring` | `rgba(91,130,240,0.55)` | 모든 버튼·D-pad `:focus-visible` 외곽 글로우 |
| focus outline | `--color-accent` | `#5b82f0` | `:focus-visible` 2px outline |

**대비 확인(정합 유지 근거):** 게임오버 제목 `--color-danger #e55858` on 스크림 위(≈`#0b0f17` 기반) 대비 ≈ 4.8:1(제목 22–30px large text, WCAG AA large 3:1 충족). 사유 문구는 `--color-text-primary #e8edf4` 사용으로 대비 충분. 신규 색 도입이 없으므로 기존 대비 특성 그대로 유지된다.

---

## 3. 타이포그래피 (기존 토큰 재사용)

폰트 스택 원본: `--font-sans` = `system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`, `--font-mono` = `ui-monospace, Menlo, Consolas, "Courier New", monospace`. `vanilla-static` — 외부 webfont 0건.

| 요소 | font | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 오버레이 제목(`.overlay__title`) | sans | `clamp(22px, 7vw, 30px)` | 700 | 1.2 | 게임오버 시 색만 danger 로 전환 |
| 오버레이 설명(`.overlay__desc`) | sans | 15px | 400 | 1.5 | start/paused 에서만 노출(gameover 시 hidden) |
| 게임오버 사유(`.overlay__reason`) | sans | 15px | 400 | 1.5 | gameover 에서만 노출, 색 `--color-text-primary` |
| 게임오버 스탯(`.overlay__stat`) | mono | `clamp(16px, 5vw, 20px)` | 700 | 1.3 | "점수 N · 최고 M" |
| ✕ 아이콘(`.overlay__icon`) | sans | 28px | — | 1 | 색 danger, `:empty` 시 미표시 |
| 스코어 값(`.scoreboard__value`) | mono | `clamp(24px, 7vw, 32px)` | 700 | 1 | 갱신 시 success 색 |
| 버튼(`.btn`) | sans | 14px | 600 | 1 | primary/secondary/ghost 공통 |
| 조작 안내(`.controls__hint`) | sans | 13px | 400 | 1.4 | muted 색, 중앙 정렬 |

---

## 4. 레이아웃

기존 단일 컬럼 세로 스택(`.snake-app`, max-width 420px)을 유지한다. 게임오버/재시작 관련 요소의 배치는 아래와 같으며 **변경 없음**.

```
┌─ .snake-app (max-width 420px, 세로 스택, gap 16px) ─┐
│  [.snake-topbar]  Snake 아케이드                      │
│  [.scoreboard]    점수 N   |   최고 M   (aria-live)   │
│  [.board-wrap]  ← 정사각(aspect 1:1), max 320px       │
│     └ <canvas #board>  (게임오버 시 붉은 틴트)         │
│     └ [.board-overlay #overlay]  ← 게임오버/재시작 카드│
│          ✕ (danger)                                   │
│          게임 오버        ← .overlay__title (danger)   │
│          벽에 부딪혔어요   ← .overlay__reason (사유별)  │
│          점수 30 · 최고 90 ← .overlay__stat (mono)     │
│          [ 다시하기 ]     ← btn--primary               │
│          [ 메뉴로 ]       ← btn--ghost                 │
│  [.dpad]   ▲ ◀ ▶ ▼   ← 52px 터치 타깃                 │
│  [.controls]                                          │
│     └ .controls__hint  방향키·WASD·P·Enter 안내        │
│     └ [ 일시정지 ] [ 재시작 ]  ← 하단 컨트롤 바        │
└───────────────────────────────────────────────────────┘
```

### 4.1 spacing / radius (기존 토큰)

- 스택 gap: `--space-4`(16px), 오버레이 카드 내부 gap: `--space-3`(12px), 버튼 세로 gap: `--space-2`(8px)
- 오버레이 카드 radius: 상위 `.board-overlay` 는 `--radius-lg`(14px), 버튼 `--radius-md`(10px)
- 오버레이 카드 max-width 280px, 중앙 정렬(`align-items:center`, `text-align:center`)

### 4.2 오버레이 = 보드 위 절대 배치(정합 핵심)

`.board-overlay` 는 `.board-wrap` 기준 `position:absolute; inset:0` 로 **보드를 정확히 덮는다**. 게임오버 시:
- 캔버스 렌더러가 보드 전체에 `--gameover-tint` 를 1회 덧칠(`main.js render()` ⑥),
- 오버레이가 추가로 `box-shadow: inset 0 0 0 1000px var(--gameover-tint)` 로 스크림 위에 붉은 기운을 더한다(styles.css `.board-overlay[data-state="gameover"]`).
- → **이 이중 틴트는 기존 동작이며 유지한다.** dev 는 캔버스 틴트와 오버레이 틴트 둘 다 그대로 둔다.

### 4.3 breakpoint 별 동작

별도 미디어 쿼리 분기 없음(단일 반응형 컬럼). 보드·스코어보드·컨트롤은 `max-width` + `clamp()` 로 좁은 화면에서 축소된다. `@media (hover:hover)` 에서만 hover 스타일, `@media (prefers-reduced-motion:reduce)` 에서 버튼/스코어 transition 및 active transform 제거 — **모두 기존 규칙 유지**.

---

## 5. 컴포넌트 명세

### 5.1 게임오버 오버레이 (`#overlay[data-state="gameover"]`)

**목적:** 게임 종료를 즉시 알리고 사유를 설명하며 재시작 진입점을 제공.

| 슬롯 | 요소 | gameover 상태값 | 비고 |
|---|---|---|---|
| 아이콘 | `.overlay__icon #overlay-icon` | 텍스트 `"✕"`, 색 danger | `:empty` 면 미표시. start/paused 에서는 빈 문자열 |
| 제목 | `.overlay__title #overlay-title` | `"게임 오버"`, 색 danger, `tabindex="-1"` | 오버레이 등장 시 포커스 대상(§5.4) |
| 설명 | `.overlay__desc #overlay-desc` | `hidden` | gameover 에서는 숨김(사유가 설명을 대체) |
| **사유** | `.overlay__reason #overlay-reason` | 사유별 문구(아래 표) | gameover 에서만 노출 |
| 스탯 | `.overlay__stat #overlay-stat` | `"점수 {score} · 최고 {highScore}"` | mono, gameover 에서만 노출 |
| 액션 | `.overlay__actions` | "다시하기"(primary) + "메뉴로"(ghost) | §5.2 |

**게임오버 사유 → 문구 매핑(정합 계약, `main.js` REASON_TEXT):**

| `gameoverReason` | `.overlay__reason` 문구 | 의미 | 아이콘/색 |
|---|---|---|---|
| `"wall"` | `벽에 부딪혔어요` | 4방향(좌/우/상/하) 벽 충돌 공통 | ✕ / danger |
| `"self"` | `몸에 부딪혔어요` | 자기 몸 충돌 | ✕ / danger |
| `"board-full"` | `보드를 가득 채웠어요! 🎉` | 퍼펙트 클리어(성취) | ✕ / danger (문구 이모지로 긍정 톤 보강) |
| (그 외/누락) | `게임이 종료되었어요` | 방어 기본값 | ✕ / danger |

**사유 표시 시각 계약(정합화 핵심 — 교차 노출 금지):**
- 한 게임오버 화면에는 **정확히 1개 사유 문구만** 노출한다(레이아웃은 사유와 무관하게 동일, 텍스트만 교체).
- `wall` 사유일 때 "몸" 문구가, `self` 사유일 때 "벽" 문구가 노출되면 **결함**이다(AC-SELF-4 대응).
- 4방향 벽 충돌(좌/우/상/하)은 **모두 동일한 `wall` 문구**를 쓴다 — 방향별로 다른 문구를 만들지 않는다(AC-WALL-1~5 정합).
- `board-full` 은 유일하게 긍정 성취이므로 문구 이모지(🎉)로 톤을 구분하되, 아이콘/색/레이아웃은 다른 사유와 동일하게 유지한다(신규 성취 전용 스타일을 만들지 않는다 — Simplicity First).

**보드 시각(게임오버 순간):** 캔버스는 충돌 직전 뱀 좌표를 그대로 유지한 채(planner AC-WALL-5: `snake` 보존) 붉은 틴트가 덧입혀진다. 틱 루프는 정지하므로 뱀은 더 이상 움직이지 않는다(정지 = 게임오버의 부가 시각 신호).

### 5.2 재시작 진입점 3종 (노출 조건·위계·문구)

재시작/이탈 버튼은 상태(`status`)에 따라 노출된다. **문구·위계·노출 조건을 아래로 고정**(main.js `syncUi()` 실측 = 유지 대상).

| 버튼 | id | 문구 | 위계(class) | 노출 조건 | 동작 |
|---|---|---|---|---|---|
| 시작 | `#btn-start` | `시작` | `btn--primary` | `status==="start"` | 새 게임 시작 |
| 계속하기 | `#btn-resume` | `계속하기` | `btn--primary` | `status==="paused"` | 일시정지 해제 |
| **다시하기** | `#btn-again` | `다시하기` | `btn--primary` | `status==="gameover"` | **게임오버 후 재시작** |
| 메뉴로 | `#btn-menu` | `메뉴로` | `btn--ghost` | `paused` 또는 `gameover` | 메뉴로(최고점 승계) |
| 일시정지 | `#btn-pause` | `일시정지` | `btn--secondary` | 항상 노출, `playing` 아니면 `disabled` | 일시정지 |
| **재시작** | `#btn-restart` | `재시작` | `btn--ghost` | 하단 컨트롤 바, 항상 노출 | `status!=="start"` 이면 재시작 |

**재시작 흐름 정합 원칙:**
1. **주 진입점은 오버레이 "다시하기"**(primary, 게임오버 시 시각·포커스 우선순위 1위). 하단 "재시작"은 게임오버 화면에서도 항상 접근 가능한 보조 경로.
2. **키보드/터치 동일 결과:** 게임오버 상태에서 `Enter`/`Space`(`onKeyDown` → `startGame()`) = "다시하기" 클릭 = 하단 "재시작" 클릭 → 세 경로 모두 `createPlayState` 로 동일 초기화(planner §5.1 계약). 어느 경로든 점수·뱀·먹이·방향·대기입력이 완전 리셋된다.
3. **"메뉴로"는 이탈 경로**로 ghost 위계(덜 강조). 최고 점수만 승계(`toMenu()`), start 화면으로 복귀.
4. 재시작 후 오버레이는 `hidden` 되고(playing) 하단 "일시정지"가 `disabled` 해제된다 — 시각적으로 "게임 재개됨"이 즉시 드러난다.

### 5.3 버튼 인터랙션 상태 (기존 유지)

| 상태 | 시각 | 토큰 |
|---|---|---|
| default(primary) | accent 배경 + accent-on 글자 | `--color-accent` / `--color-accent-on` |
| hover(primary) | accent-hover 배경 (`@media hover:hover` 아님, `:not(:disabled):hover`) | `--color-accent-hover` |
| active | `transform: scale(0.97)` | (reduced-motion 시 없음) |
| focus-visible | 2px accent outline + 4px focus-ring 글로우 | `--color-accent` / `--color-focus-ring` |
| disabled | `opacity: 0.45`, `cursor:not-allowed` | — |

D-pad 버튼은 min 52px 터치 타깃, active 시 accent 배경 + `scale(0.94)`, focus-visible 동일 링. **모두 유지.**

### 5.4 포커스 표시 (정합 핵심 — 접근성)

**포커스 이동 계약:**
- 오버레이가 등장하는 모든 상태(`start`/`paused`/`gameover`)에서 `overlay-title`(`tabindex="-1"`)로 프로그램적 포커스 이동(`main.js syncUi()` → `overlayTitle.focus()`). → 게임오버 순간 스크린리더가 "게임 오버" 제목을 읽고, 키보드 사용자의 다음 Tab 이 오버레이 액션 버튼("다시하기")으로 자연 진입한다.
- 제목은 `outline: none`(포커스 시 제목 자체엔 링 미표시 — 제목은 조작 대상이 아닌 안내 텍스트). **버튼·D-pad 만 `:focus-visible` 링 노출**.

**포커스 표시 시각:**
- 모든 인터랙티브 요소(`.btn`, `.dpad__btn`)는 `:focus-visible` 시 `outline: 2px solid var(--color-accent)` + `outline-offset: 2px` + `box-shadow: 0 0 0 4px var(--color-focus-ring)`. 키보드 포커스만 링을 노출(마우스 클릭 시 미표시) — 기존 규칙 유지.

**포커스 유실 방지(재시작/게임오버 전환):**
- 게임오버 → "다시하기" 클릭 → `startGame()` → `syncUi()`: 오버레이가 `hidden` 되므로 포커스가 있던 "다시하기" 버튼이 DOM 에서 사라진다. 이때 포커스는 `<body>` 로 돌아가지만, 게임은 키보드 방향키를 `document` 레벨에서 수신하므로(`onKeyDown` 이 `document` 바인딩) **플레이에 지장 없다**(planner E6 참조).
- 재시작 후 다시 게임오버가 되면 오버레이가 재등장하며 다시 `overlay-title` 로 포커스가 이동한다 → **재시작 사이클마다 포커스가 오버레이로 복귀**하는 것이 계약이다.

### 5.5 조작 안내 (`.controls__hint`)

**목적:** 키보드/터치 조작 방법을 항상(게임오버 화면 포함) 화면 하단에 노출.

- 문구(유지): `방향키(↑↓←→) · WASD 또는 아래 버튼으로 이동 · P 일시정지 · Enter 시작/재시작`
- 이 문구는 **키보드(방향키·WASD·P·Enter)와 터치(아래 버튼=D-pad)를 모두 포함**한다 → 별도 모바일 안내를 만들지 않는다.
- muted 색(`--color-text-muted`)·13px·중앙 정렬로 시각 위계상 가장 낮음(방해 없는 상시 참조).
- 게임오버 오버레이는 보드 영역만 덮으므로 하단 `.controls__hint` 는 **게임오버 중에도 그대로 보인다** → "Enter 시작/재시작" 안내가 게임오버 순간에도 유효(키보드 재시작 발견성 보장).
- D-pad 버튼의 `aria-label`(위로/왼쪽/오른쪽/아래로)과 스코어보드 `aria-live="polite"` 는 유지 — 스크린리더 사용자에게 점수 변화·조작 라벨 제공.

---

## 6. dev 구현 가이드 (BF-973 참조)

본 task 는 **디자인 명세이며 코드 변경은 dev 담당**이다. 아래는 dev 가 회귀 가드/구현 시 "화면에서 참이어야 하는 것"의 체크리스트다. **기존 CSS 클래스·DOM id·토큰 이름을 그대로 사용**하고 신규 토큰/클래스를 만들지 말 것.

### 6.1 게임오버 표시 — 유지·검증 포인트
- `#overlay` 에 `data-state="gameover"` 설정 시: `.overlay__icon`=`"✕"`, `.overlay__title`=`"게임 오버"`(색 `--color-danger`), `.overlay__desc` `hidden`, `.overlay__reason` 노출, `.overlay__stat` 노출.
- `.overlay__reason` 텍스트는 `REASON_TEXT[state.gameoverReason]` 로만 결정 — **사유별 분기 스타일 추가 금지**(레이아웃 동일, 텍스트만 교체).
- 캔버스 게임오버 틴트(`render()` ⑥, `--gameover-tint`)와 오버레이 `box-shadow` 틴트 **둘 다 유지**.
- 클래스/토큰: `.board-overlay[data-state="gameover"]`, `--gameover-tint`, `--overlay-scrim`, `--color-danger` — 신규 정의 없이 재사용.

### 6.2 재시작 안내 — 유지·검증 포인트
- 노출 조건 매트릭스(§5.2)를 `syncUi()` 로 유지: `btn-again`(gameover), `btn-menu`(paused|gameover), `btn-restart`(항상), `btn-pause`(playing 외 disabled).
- 키보드 `Enter`/`Space`(gameover/start 시 `startGame()`)와 버튼 클릭이 **동일 함수(`startGame`→`createPlayState`)** 를 호출하도록 유지 → 재시작 결과가 입력 경로와 무관하게 동일(planner AC-RESTART-3/4).
- 재시작 후 `.overlay` `hidden`, 스코어보드 `[data-role="score"]` 텍스트 `"0"`, `#btn-pause` `disabled` 해제 — 시각 동기화(`syncUi()`+`updateScoreboard()`).

### 6.3 포커스 표시 — 유지·검증 포인트
- 오버레이 등장(`start`/`paused`/`gameover`) 시 `overlayTitle.focus()` 유지(`tabindex="-1"`).
- `.btn` / `.dpad__btn` 의 `:focus-visible` 링(`--color-accent` outline + `--color-focus-ring` glow) 유지.
- 제목 `.overlay__title` 는 `outline:none` 유지(제목 자체엔 링 미표시).

### 6.4 조작 안내 — 유지·검증 포인트
- `.controls__hint` 문구·muted 색·상시 노출(게임오버 중 포함) 유지.
- D-pad `aria-label`·스코어보드 `aria-live` 유지.

### 6.5 접근성·모션
- `@media (prefers-reduced-motion:reduce)` 에서 transition/active transform 제거 규칙 유지.
- 버튼 최소 타깃 44px(`.btn min-height`), D-pad 52px 유지(터치 접근성).

---

## 7. mockup 참조

- 파일: `docs/design/mockups/snake-gameover-restart-BF-972.html`
- 단일 self-contained HTML(외부 의존성 0건, `styles.css` 토큰을 인라인 `:root` 로 복제).
- 표현 내용:
  1. 게임오버 오버레이 3종 사유(`wall`/`self`/`board-full`)를 나란히 시각화 — 사유 문구만 교체·레이아웃 동일함을 확인.
  2. 재시작 흐름 상태(start / playing / paused / gameover) 오버레이 4종.
  3. 포커스 링 표시(버튼·D-pad `:focus-visible` 시뮬레이션 섹션).
  4. 조작 안내 + 하단 컨트롤 바.
- **dev 산출물 아님** — 시안 시각 확인용. dev 는 실제 `phase18-games/snake/` 를 유지·정합화한다.

---

## 8. Self-critique (PR 직전 자기 점검)

| # | 체크 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 수용 기준이 명세에 반영됐는가 | ✅ AC-1(키보드·터치 게임오버 표시·재시작 흐름 일관): §5.1(사유 3종 동일 레이아웃)·§5.2(재시작 3경로 + 키보드/터치 동일 결과). AC-2(포커스·조작 안내 유지 + 게임 규칙 불변): §5.4·§5.5 + §0 전제 2. |
| 2 | **dev 구현 가이드** — dev 가 그대로 따를 수 있는가 | ✅ §6 을 실측 DOM id/클래스/토큰 이름으로 명시, "유지·검증 포인트" 체크리스트 제공. 신규 토큰 금지 명문화. |
| 3 | **기존 요소 보존** — 기존 시각 요소를 유지하는가 | ✅ §0 전제 1·3, §2·§3 토큰 재사용(값 변경 0), §4.2/§4.3 기존 레이아웃·미디어쿼리 유지. 신규 색/클래스/모션 도입 없음. |
| 4 | **컴포넌트 매핑** — 명세 컴포넌트가 실제 DOM 에 대응하는가 | ✅ 모든 컴포넌트를 실측 id(`#overlay`, `#btn-again`, `#btn-restart`, `#overlay-reason` 등)·클래스로 지목. mockup 이 동일 구조 재현. |
| 5 | **모호함 flag** — 해석 여지 있는 지점 | ⚠️ (a) 게임오버 순간 포커스가 "다시하기" 클릭 후 `<body>` 로 복귀하는 것은 기존 동작이며 플레이 무지장(§5.4)이나, dev 가 재시작 후 명시적 포커스 이동을 추가하고 싶다면 **본 명세 범위 밖**(planner E6 = 현행 유지) → 추가 금지. (b) `board-full` 성취 톤은 문구 이모지로만 구분(전용 색/애니메이션 신설 금지, Simplicity First) — 향후 축소·연출은 별도 티켓. |

**결론:** 게임 규칙·기존 토큰·기존 레이아웃을 전혀 변경하지 않고, 게임오버 표시·재시작 안내·포커스·조작 안내의 **시각 계약을 키보드/터치 일관성 기준으로 명문화**했다. dev(BF-973)는 본 문서를 회귀 가드의 "화면 기준"으로 참조한다.

<!-- bf:pr-summary -->
## 시안 요약 — BF-972 Snake 게임오버·재시작 UX

**성격:** 기존 시각 요소 **정합화 명세**(신규 디자인·토큰·게임 규칙 변경 0건). 게임오버 표시·재시작 안내·포커스·조작 안내를 키보드/터치 일관성 기준으로 명문화.

**산출물**
- 명세: `docs/design/snake-gameover-restart-BF-972.md`
- mockup: `docs/design/mockups/snake-gameover-restart-BF-972.html`

**핵심 시각 계약**
- 게임오버 사유 3종(`wall`/`self`/`board-full`)은 **동일 레이아웃·텍스트만 교체**, 교차 노출 금지. 4방향 벽 충돌은 모두 동일 `wall` 문구.
- 재시작 3경로(다시하기/재시작/메뉴로) — 키보드 Enter = 터치 버튼 **동일 결과**(`createPlayState` 완전 리셋).
- 오버레이 등장 시 `overlay-title` 포커스 이동, `:focus-visible` 링 유지. 조작 안내는 게임오버 중에도 상시 노출.

**토큰 매핑(기존 재사용 — 값 변경 없음)**

| 역할 | 토큰 | 값 |
|---|---|---|
| 게임오버 강조 | `--color-danger` | `#e55858` |
| 게임오버 틴트 | `--gameover-tint` | `rgba(229,88,88,0.14)` |
| 오버레이 스크림 | `--overlay-scrim` | `rgba(5,7,12,0.74)` |
| primary(다시하기) | `--color-accent` | `#5b82f0` |
| 포커스 링 | `--color-focus-ring` | `rgba(91,130,240,0.55)` |
| 조작 안내 | `--color-text-muted` | `#63708a` |

**Self-critique:** AC 매핑·dev 가이드·기존 요소 보존·컴포넌트 매핑 ✅ / 모호함 2건(재시작 후 포커스 복귀 = 현행 유지, board-full 전용 연출 금지)은 범위 밖으로 flag.
<!-- /bf:pr-summary -->
