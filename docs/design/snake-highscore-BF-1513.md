# 최고 기록 보드 · 시각 명세 (BF-1514)

> designer 산출물 (BF-1514). 이 문서는 planner 가 동결한 **frozen blueprint**
> (`ui-contract@v1`) 를 **시각 명세**로 구체화한다. selector·token·상태·접근성·반응형을
> **재정의하지 않고** 그대로 시각화하며, 런타임 HTML/CSS/JS 는 생성하지 않는다.
> 실행 설계·소유권의 유일한 권위는 frozen blueprint 와
> `docs/plans/snake-highscore-BF-1513.md` (planner) 다.
>
> - **소비 계약**: `ui-contract@v1`
>   (`sha256:eac7d29a48f8d28caf2ef3fb871c90a66b3705787adf631f01410e6a0ae7472a`)
> - **대상 데모**: `demo/neon-snake-fullscreen-0802/` (vanilla ESM, 정적 서빙)
> - **구현 소유자**: developer(BF-1515) — `highscore.js` / `index.html` /
>   `tests/highscore.test.js` (모두 additive). 본 문서는 시각 명세만 제공한다.
> - **mockup 참조**: `docs/design/mockups/snake-highscore-BF-1513.html`

---

## 1. 시안 개요

### 변경 범위 (additive)

시작(모드 선택) 화면과 게임 종료 화면에 **모드별 최고 기록 보드**를 시각적으로 추가한다.
기존 HUD(1P/2P 실시간 점수), 상태 배너, 모드/난이도 메뉴, 승패 배너, 게임 캔버스는
**그대로 보존**한다. 기록 보드는 이들 위에 얹히는 신규 오버레이 컴포넌트다.

- **추가되는 것**: `#snake-highscore-board` 컨테이너와 그 하위 "이번 점수" / "최고 기록"
  텍스트, "신기록!" 배지.
- **보존되는 것**: `.hud-bar`(실시간 점수), `#status-banner`, `#winner-banner`,
  `.mode-menu` / `.difficulty-menu`, `#snake-board` 캔버스. 기록 보드는 이들의 위치·동작을
  바꾸지 않는다.

### 사용자 경험 목표

- 플레이어가 **게임을 시작하기 전** 현재 강조 모드의 최고 기록을 한눈에 확인한다.
- 게임이 끝나면 **이번 점수와 최고 기록을 나란히** 보고 자신의 성과를 즉시 비교한다.
- 최고 기록을 경신하면 **"신기록!" 배지가 네온 핑크로 플래시**하여 성취감을 즉각 전달한다.
- 기록이 없거나 손상돼도 "최고 기록 0" 으로 **매끄럽게 시작**되어 빈 상태가 오류처럼
  보이지 않는다.
- 색맹·스크린리더 사용자도 **색이 아닌 화면 텍스트와 접근성 이름**으로 모든 상태를 구분한다.

---

## 2. 컬러 팔레트

기록 보드 전용 컬러는 frozen `ui-contract@v1` §5.3 의 exact 값이며 **재정의하지 않는다**.
배경·기본 텍스트는 기존 데모(`index.html` `:root`)의 값을 그대로 상속한다.

| 역할 | 토큰 | HEX | 용도 |
| --- | --- | --- | --- |
| accent (최고 기록 강조) | `--color-scoreboard-accent` | `#39ff14` | "최고 기록 {n}" 숫자·강조 네온 그린 |
| new-record flash (신기록 배지) | `--color-newrecord-flash` | `#ff2e97` | "신기록!" 배지 활성 시 네온 핑크 플래시 |
| background (상속) | `--color-bg` | `#0a0a12` | 데모 전역 배경 (기존) |
| text (상속) | — | `#f4f4ff` | 보드 기본 텍스트 ("이번 점수", "최고 기록" 라벨) |
| text-muted (상속) | — | `rgba(244,244,255,0.72)` | 보조 라벨(선택적, 기존 controls-hint 톤과 일치) |

- **accent(`#39ff14`) 주의**: 이 값은 통합 런타임에서 CPU 모드 **1P(사람) 뱀 색(`--color-player1`)**
  과 동일한 네온 그린이다. 의도된 일관성으로, "내 최고 기록"을 사람 플레이어 색과 시각적으로
  연결한다. developer 는 이 토큰을 **새로 정의하지 말고** frozen 값을 그대로 사용한다.
- **대비**: `#39ff14`·`#ff2e97` 모두 `#0a0a12` 배경 위에서 큰 글자(18px 이상, bold) 기준
  충분한 대비를 확보한다. 색은 **강조 수단**일 뿐이며 상태 구분은 항상 텍스트가 담당한다(§7).

---

## 3. 타이포그래피

폰트 패밀리는 기존 데모의 system stack 을 **상속**한다(외부 의존성 0건, vanilla-static 규약).

```
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

| 요소 | selector | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 보드 텍스트 (이번 점수/최고 기록) | `.scoreboard__current`, `.scoreboard__best` | `--font-scoreboard-size` = **18px** | 700 | 1.3 | frozen 토큰 값 |
| 숫자(점수 값) | 위 요소 내 숫자 | 18px (상속) | 700 | 1.3 | `font-variant-numeric: tabular-nums` 권장(자릿수 흔들림 방지) |
| 신기록 배지 | `.scoreboard__badge` | 18px (`--font-scoreboard-size` 상속) | 800 | 1 | 활성 시에만 표시, letter-spacing 0.04em |

- 보드 텍스트 크기는 **frozen `--font-scoreboard-size`(18px)** 를 그대로 쓴다. 반응형에서
  축소가 필요하면 §5 참조(토큰 값 자체는 변경하지 않고 미디어쿼리로 조정 여지만 명시).
- 숫자는 `tabular-nums` 로 자릿수 변화 시 폭이 흔들리지 않게 한다(예: 0 → 120 갱신).

---

## 4. 레이아웃

### 4.1 배치 위치

기록 보드는 게임 캔버스 위에 얹히는 **오버레이**다. 시작 화면과 종료 화면에서만 노출되고,
플레이 중에는 비활성(`aria-hidden`)이다.

- **시작(mode-selection) 화면**: 모드 메뉴(`.mode-menu`, 화면 중앙)를 **가리지 않도록**
  화면 상단 중앙(HUD 아래) 또는 모드 메뉴 하단에 배치한다. mockup 은 상단 중앙 배치를 채택.
- **종료(game-over) 화면**: 승패 배너(`#winner-banner`, 화면 중앙)와 겹치지 않도록
  배너 하단에 "이번 점수" / "최고 기록" / "신기록!" 을 세로로 쌓는다.
- **z-index**: 모드 메뉴(z-index 5)·승패 배너(z-index 6)를 덮지 않는 값으로 두되, HUD·캔버스
  위에는 보이도록 한다. 구체 z-index 는 developer 가 기존 stacking(§ index.html)과 충돌하지
  않게 결정한다.

### 4.2 내부 구조 (컨테이너 → 항목)

```
#snake-highscore-board .scoreboard                (컬럼 컨테이너, aria-label="최고 기록")
├── #snake-current-score .scoreboard__current     "이번 점수 {n}"   (종료 화면에서만 표시)
├── #snake-best-score    .scoreboard__best         "최고 기록 {n}"   (시작·종료 화면 표시)
└── #snake-newrecord-badge .scoreboard__badge      "신기록!"         (신기록 시 --active)
        └─ 활성 시 .scoreboard__badge--active
```

### 4.3 spacing

- 컨테이너 내부 항목 간 세로 간격: **`--space-scoreboard-gap` = 12px** (frozen 토큰).
- 컨테이너 외곽 padding: 12px 16px 권장(HUD `.hud-bar` padding 과 시각 통일, 토큰 아님).
- 컨테이너는 `display: flex; flex-direction: column; align-items: center; gap: var(--space-scoreboard-gap);`
  로 항목을 세로 정렬한다(권장 — developer 구현 자유도 있음, selector·gap 토큰은 고정).

### 4.4 breakpoint 별 동작

| 뷰포트 | 동작 |
| --- | --- |
| ≥ 480px (기본) | 상단 중앙 오버레이, 18px 텍스트, 항목 12px 간격 |
| 320–479px | 좌우 padding 축소, `max-width: calc(100dvw - 24px)` 로 overflow 방지. 텍스트 줄바꿈 허용(라벨과 숫자가 한 줄에 안 들어가면 wrap). 토큰 값은 유지 |
| portrait(세로) | 상단 배치 유지 시 모드 메뉴/승패 배너와 세로로 충분한 간격 확보. 보드가 화면 밖으로 잘리지 않도록 `top` 여백을 HUD 높이만큼 확보 |

- **frozen 반응형 계약(§5.5)**: 320px 이상에서 보드가 캔버스를 가리지 않고 overflow 없이
  표시되며, portrait 에서도 시작/종료 화면 보드가 잘리지 않는다. 위 표는 이를 만족하는 시각
  가이드이며 계약을 **넘어서는 새 breakpoint 를 추가하지 않는다**.

---

## 5. 컴포넌트 명세

각 컴포넌트의 selector·상태·텍스트는 frozen 이며 **변경 금지**. 아래는 상태별 표현을 명세한다.

### 5.1 기록 보드 컨테이너 — `#snake-highscore-board` (`.scoreboard`)

| 속성 | 값 |
| --- | --- |
| 역할 | 최고 기록/이번 점수/신기록 배지를 담는 컬럼 컨테이너 |
| 접근성 | `aria-label="최고 기록"` (frozen §5.4) |
| 노출 상태 | start-idle / gameover-normal / gameover-newrecord / empty-record 에서 노출 |
| 비활성 상태 | playing 에서 `aria-hidden="true"` + 시각적으로 숨김 |

### 5.2 이번 점수 — `#snake-current-score` (`.scoreboard__current`)

| 속성 | 값 |
| --- | --- |
| 텍스트 | `이번 점수 {n}` |
| 표시 | **종료 화면(gameover-normal / gameover-newrecord)에서만** 표시 |
| 숨김 | 시작 화면(start-idle / empty-record)·playing 에서 숨김 |
| 색 | 기본 텍스트 `#f4f4ff` |

### 5.3 최고 기록 — `#snake-best-score` (`.scoreboard__best`)

| 속성 | 값 |
| --- | --- |
| 텍스트 | `최고 기록 {n}` (기록 없음/손상 시 `최고 기록 0`) |
| 표시 | 시작·종료 화면 모두 표시 |
| 색 | 라벨 `#f4f4ff`, 숫자 강조 `--color-scoreboard-accent`(#39ff14) 권장 |
| 갱신 | gameover-newrecord 에서 이번 점수 값으로 갱신된 `{n}` 표시 |

### 5.4 신기록 배지 — `#snake-newrecord-badge` (`.scoreboard__badge`)

| 속성 | 값 |
| --- | --- |
| 텍스트 | `신기록!` |
| 기본 상태 | 숨김 (start-idle / gameover-normal / empty-record / playing) |
| 활성 상태 | `.scoreboard__badge--active` 추가 시 표시 + `--color-newrecord-flash`(#ff2e97) 플래시 |
| 접근성 | `aria-live="polite"` — 활성 시 "신기록" 을 스크린리더에 알림 (frozen §5.4) |

### 5.5 상태 매트릭스 (frozen §5.2 — 5개 상태)

| 상태 | `#snake-best-score` | `#snake-current-score` | `#snake-newrecord-badge` | 보드 노출 |
| --- | --- | --- | --- | --- |
| **start-idle** | `최고 기록 {n}` 표시 | 숨김 | 숨김 | 노출 |
| **playing** | (비활성) | (비활성) | (비활성) | `aria-hidden`, 캔버스만 |
| **gameover-normal** | `최고 기록 {n}` 표시 | `이번 점수 {n}` 표시 | 숨김 | 노출 |
| **gameover-newrecord** | `최고 기록 {n}`(갱신값) | `이번 점수 {n}` 표시 | **`신기록!` 활성** | 노출 |
| **empty-record** | `최고 기록 0` 표시 | 숨김 | 숨김 | 노출(정상 시작) |

### 5.6 인터랙션 / 상태 전이 시각 규칙

- **모드 강조 변경(시작 화면)**: 강조된 모드(`local` / `cpu`)의 최고 기록으로
  `#snake-best-score` 텍스트를 즉시 갱신한다. 배지는 항상 숨김 상태를 유지한다.
- **신기록 배지 플래시**: gameover-newrecord 진입 시 `.scoreboard__badge--active` 가
  붙으며 네온 핑크로 강조된다. 정적 mockup 에서는 활성/비활성 두 모습을 §5.5·mockup 의 별도
  카드로 함께 제시한다(애니메이션 필수 아님 — 색·텍스트로 충분히 구분).
- **종료→시작 복귀(restartToMenu)**: 보드를 start-idle 로 되돌리고 배지·이번 점수를
  초기화한다(후조건 복원).

---

## 6. dev 구현 가이드 (developer / BF-1515)

> developer 는 `index.html`(마크업·CSS)과 `highscore.js`(순수 함수)를 **additive** 로 구현한다.
> 아래는 시각 명세를 코드로 옮길 때의 권장 지침이며, **selector·token·상태 텍스트는 고정**이다.

1. **토큰 정의**: `index.html` `:root` 에 frozen 4개 토큰을 **그대로** 추가한다(재정의 금지).
   ```css
   :root {
     --color-scoreboard-accent: #39ff14;
     --color-newrecord-flash: #ff2e97;
     --space-scoreboard-gap: 12px;
     --font-scoreboard-size: 18px;
   }
   ```
2. **마크업**: `.snake-stage` 안에 아래 골격을 추가한다(위치·클래스명 권장, id 는 frozen).
   ```html
   <div id="snake-highscore-board" class="scoreboard" aria-label="최고 기록">
     <span id="snake-current-score" class="scoreboard__current">이번 점수 0</span>
     <span id="snake-best-score" class="scoreboard__best">최고 기록 0</span>
     <span id="snake-newrecord-badge" class="scoreboard__badge" aria-live="polite">신기록!</span>
   </div>
   ```
3. **CSS 클래스**: `.scoreboard`(flex column, gap `var(--space-scoreboard-gap)`),
   `.scoreboard__current` / `.scoreboard__best`(font-size `var(--font-scoreboard-size)`,
   weight 700), `.scoreboard__badge`(기본 숨김), `.scoreboard__badge--active`(표시 +
   `color: var(--color-newrecord-flash)`).
4. **hook 배선(planner §6)**: `syncView()` / `goModeSelection()` 에서 강조 모드의
   `loadBest` 로 최고 기록 렌더, `handleGameOver()` 에서 `isNewRecord` 판정 → 신기록이면
   `saveBest` 후 배지 `--active`, `#snake-current-score` = "이번 점수 {n}",
   `#snake-best-score` = "최고 기록 {n}".
5. **상태별 노출 토글**: playing 진입 시 보드 `aria-hidden="true"` + 시각 숨김,
   시작/종료 진입 시 노출. current-score 는 종료 화면에서만, badge 는 신기록 시에만 표시.
6. **접근성**: 컨테이너 `aria-label="최고 기록"`, 배지 `aria-live="polite"` 는 마크업에
   고정한다. 상태는 색이 아닌 화면 텍스트("이번 점수", "최고 기록", "신기록")로 구분한다.
7. **반응형**: 320–479px 에서 `max-width: calc(100dvw - 24px)` + 줄바꿈 허용,
   portrait 에서 상단 여백 확보로 잘림 방지(§4.4). 토큰 값 자체는 미디어쿼리에서 바꾸지 않는다.

> **픽셀 일치 의무 없음**: mockup 은 시안 시각화이며 dev 산출물이 아니다. developer 는
> selector·token·상태 텍스트·접근성·반응형 계약을 만족하는 범위에서 구현 자유도를 갖는다.

---

## 7. 접근성 명세 (frozen §5.4 준수)

- `#snake-highscore-board` 는 `aria-label="최고 기록"` 을 가진다.
- `#snake-newrecord-badge` 는 `aria-live="polite"` 로 활성화 시 "신기록" 을 스크린리더에 알린다.
- 모든 상태는 **색상만으로 구분하지 않는다**. "이번 점수" / "최고 기록" / "신기록" 화면
  텍스트와 접근성 이름으로 각 상태를 노출한다.
- 신기록 여부는 배지 색(핑크)뿐 아니라 "신기록!" 텍스트 존재로 구분된다.
- 최고 기록 강조 색(그린)은 강조 수단이며, 값 자체는 항상 "최고 기록 {n}" 텍스트로 읽힌다.

---

## 8. mockup 참조

- **파일**: `docs/design/mockups/snake-highscore-BF-1513.html`
- **내용**: frozen 컬러/타이포/레이아웃을 그대로 반영한 self-contained HTML(외부 의존성 0건).
  5개 상태(start-idle / playing / gameover-normal / gameover-newrecord / empty-record)를
  `<section>` 카드로 나란히 제시하고, 320px·portrait 반응형 표현을 별도 프레임으로 시각화한다.
- **성격**: 시안 시각화 전용. dev 의 실제 산출물이 아니며 픽셀 단위 일치 의무는 없다.
</content>
</invoke>
