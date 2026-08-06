# Phaser Brick Blitz — 시각 명세 (Visual Specification)

> BF-1721 · designer 산출물. 본 문서는 planner가 **동결한 UI 계약(frozen blueprint)** 을
> developer가 재정의 없이 그대로 구현하도록 시각적으로 명세한다.
> selector·DOM ID·상태·디자인 토큰은 frozen blueprint가 유일한 권위이며, 본 문서는 그 값을
> **변경하지 않고 exact하게 시각화**한다.
>
> - designer(본 문서): `phaser-brick-blitz/README.md` — 시각 명세만 소유
> - developer: `design/design-tokens.html`, `design/design-mockup.html`, `index.html`,
>   `src/game.js`, `src/logic.js`, `tests/logic.test.js` — 런타임·시안 HTML·테스트 소유
>
> 본 명세의 대상 정적 산출물은 아래 두 파일이다(developer가 본 명세대로 구현).
> - `design/design-tokens.html` — 토큰 팔레트/견본
> - `design/design-mockup.html` — 5개 화면 상태 시안
>
> 두 파일은 **정적 서버(`python3 -m http.server` 등)로 그대로 렌더링**되어야 하며,
> 동일한 CSS 변수(`:root`)를 참조하고 값을 하드코딩하지 않는다.

---

## 1. 시안 개요

- **변경 범위**: `phaser-brick-blitz/` 신규 벽돌깨기 게임의 UI 시각 계약. 토큰 팔레트 견본
  1종과 화면 상태 시안 1종(5개 상태 포함)을 정적 HTML로 명세한다.
- **사용자 경험 목표**
  1. 어두운 네온 톤의 아케이드 감성 — 저조도 배경 위에서 패들/공/벽돌 색이 선명하게 대비된다.
  2. 현재 화면 상태(대기/플레이/일시정지/게임오버/클리어)를 **색상만이 아니라 화면 텍스트와
     접근성 이름**으로 항상 명확히 노출한다.
  3. 320px 이상 어떤 뷰포트에서도 가로 스크롤/텍스트 절단 없이 캔버스 비율을 유지한다.

---

## 2. 컬러 팔레트 (Design Tokens — exact, 변경 금지)

CSS 변수는 `:root`에 아래 **정확한 이름·값**으로 선언한다. 견본(swatch)은 하드코딩된 HEX가
아니라 `var(--토큰)` 을 실제로 참조해 칠한다.

| 토큰 | 값(HEX) | 역할 |
|---|---|---|
| `--color-bg` | `#0f1424` | 페이지/게임 배경 (가장 어두운 네이비) |
| `--color-surface` | `#1b2138` | HUD·오버레이 패널 표면 |
| `--color-paddle` | `#4cc9f0` | 패들 (시안 네온) |
| `--color-ball` | `#f8f9fa` | 공 (오프화이트) |
| `--color-brick-r1` | `#ef476f` | 벽돌 1행 (핑크레드) |
| `--color-brick-r2` | `#ffd166` | 벽돌 2행 (앰버) |
| `--color-brick-r3` | `#06d6a0` | 벽돌 3행 (민트그린) |
| `--color-text` | `#e9ecef` | 본문/HUD 텍스트 |

### 2.1 간격·반경 토큰

| 토큰 | 값 | 역할 |
|---|---|---|
| `--space-hud-gap` | `16px` | HUD 내 점수↔목숨 간격 |
| `--radius-brick` | `4px` | 벽돌 모서리 반경 |

### 2.2 타이포 크기 토큰

| 토큰 | 값 | 역할 |
|---|---|---|
| `--font-size-hud` | `20px` | HUD(점수·목숨) 텍스트 크기 |
| `--font-size-title` | `40px` | 오버레이 제목 크기 |

> ⚠️ 위 13개 토큰은 frozen 계약값이다. 이름/값을 추가·변경·재정의하지 않는다.
> `design-tokens.html`은 이 값들을 **exact**하게 팔레트로 시각화하고, `index.html`(런타임)의
> CSS는 동일 이름·동일 값의 변수를 선언한다.

### 2.3 대비/접근성 참고

- 텍스트(`--color-text #e9ecef`)는 배경(`--color-bg #0f1424`)/표면(`--color-surface #1b2138`)
  위에서 충분한 명도 대비를 확보한다. 상태 구분은 색만이 아니라 텍스트 라벨을 병행한다(§5·§6).

---

## 3. 타이포그래피

외부 웹폰트 의존 없이 **system font stack** 을 사용한다(정적 서버 단독 렌더 보장).

```
--font-stack: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | font-family | size | weight | line-height |
|---|---|---|---|---|
| 오버레이 제목(title) | `var(--font-stack)` | `var(--font-size-title)` (40px) | 700 | 1.2 |
| HUD 라벨/값 | `var(--font-stack)` | `var(--font-size-hud)` (20px) | 600 | 1.3 |
| 버튼 라벨 | `var(--font-stack)` | 18px | 600 | 1.2 |
| 보조 설명(caption) | `var(--font-stack)` | 14px | 400 | 1.5 |

- 숫자(점수·목숨)는 자릿수 변동 시 흔들림을 줄이기 위해 `font-variant-numeric: tabular-nums`
  적용을 권장한다.

---

## 4. 레이아웃

### 4.1 구조 (DOM ID / CSS class — exact, 변경 금지)

```
#game-root .game
├── .game__hud
│   ├── #hud-score        (점수 표시)
│   └── #hud-lives        (목숨 표시)
├── #game-canvas          (Phaser 캔버스 마운트 — 실제 비율 자리표시자)
├── #overlay-start   .game__overlay   (ready)
├── #overlay-pause   .game__overlay   (paused)
├── #overlay-gameover .game__overlay  (gameover)
└── #overlay-clear   .game__overlay   (cleared)
```

- 벽돌 요소는 `.game__brick` 클래스를 사용한다(행별 색은 `--color-brick-r1/r2/r3`).
- 상태 전이 버튼(시작/재개 등)은 `.game__button` 클래스를 사용한다.

### 4.2 배치 / 간격

- **세로 스택**: `.game__hud`(상단) → `#game-canvas`(중앙, 주 영역) → 오버레이는 캔버스 위에
  겹쳐(overlay) 중앙 정렬로 표시한다.
- `.game__hud`는 `display:flex; justify-content:space-between; gap: var(--space-hud-gap)`.
  좌측 `#hud-score`, 우측 `#hud-lives`.
- `#game-root`/`.game`는 `background: var(--color-bg)`, 오버레이·HUD 패널은
  `background: var(--color-surface)`.
- 오버레이 내부: 제목(title) → 상태 안내 텍스트 → 주 control 버튼 순의 세로 중앙 정렬.

### 4.3 캔버스 비율 자리표시자

- `#game-canvas`는 **가로:세로 = 4:3** 비율을 유지하는 자리표시자로 그린다
  (`aspect-ratio: 4 / 3` 권장). mockup에서는 벽돌 3행 + 패들 + 공 위치를 그려 실제 비율을 보인다.
- 컨테이너 폭에 맞춰 축소되며 비율을 유지한다(`width:100%; max-width` 지정, height는 비율로 결정).

### 4.4 반응형 (Responsive) — frozen 후조건

- **≥ 320px**: `#game-root`에 **가로 overflow 금지**. `.game`는 `max-width` + `width:100%`,
  좌우 여백은 padding으로 흡수.
- `#game-canvas`는 컨테이너 폭에 맞춰 **비율 유지 축소**(§4.3).
- `#hud-score`/`#hud-lives` 텍스트는 좁은 화면에서도 **잘리지 않는다**
  (라벨 축약 없이 wrap 허용 또는 `min-width:0` + `white-space` 조정, 절단 금지).

**breakpoint 별 동작**

| 뷰포트 | HUD | 캔버스 | 오버레이 |
|---|---|---|---|
| 320–479px | 점수/목숨 상하 또는 좌우 유지, 절단 금지 | 폭 100%·4:3 축소 | 폭 90%·중앙 |
| 480–767px | 좌우 배치 | 폭 100%·4:3 | 폭 min(90%, 420px) |
| ≥ 768px | 좌우 배치 | max-width 640px 중앙 | 폭 420px·중앙 |

---

## 5. 컴포넌트 명세 (상태 / props / 인터랙션)

### 5.1 게임 상태 (States) — exact

`ready`, `playing`, `paused`, `gameover`, `cleared` — 각 상태는 overlay와 1:1 대응한다.
`playing`에서는 **어떤 overlay도 표시되지 않는다**.

| 상태 | 표시 overlay | 화면 텍스트(예시) | 접근성 |
|---|---|---|---|
| `ready` | `#overlay-start` | 제목 "벽돌깨기", "Space를 눌러 시작" | `role="dialog"`, 상태명 노출 |
| `playing` | (없음) | HUD만 표시 | overlay 없음 |
| `paused` | `#overlay-pause` | "일시정지됨", "Space로 재개" | `role="dialog"`, 상태명 노출 |
| `gameover` | `#overlay-gameover` | "게임 오버", 최종 점수, "다시 시작" | `role="dialog"`, 상태명 노출 |
| `cleared` | `#overlay-clear` | "클리어!", 최종 점수, "다시 시작" | `role="dialog"`, 상태명 노출 |

- **초기화·취소·실패 후조건**: `gameover`/`cleared` → `Reset` 시 상태와 진행 표시(점수·목숨)를
  **초기값으로 되돌리고** 주 실행 control(시작 버튼)을 다시 사용할 수 있게 한다.

### 5.2 컴포넌트별 계약

**`.game__hud` (HUD)**
- 자식: `#hud-score`(점수), `#hud-lives`(목숨).
- props(런타임 상태): `score:number`, `lives:number`. 초기값 `score=0`, `lives=3`.
- 텍스트 형식 권장: `점수 0`, `목숨 ♥♥♥`(또는 `목숨 3`). 좁은 화면에서 절단 금지.

**`#game-canvas`**
- props: 없음(Phaser 마운트 지점). 4:3 비율 자리표시자(§4.3).

**`.game__overlay` (공통)**
- props: `state`(위 5개 중), `visible:boolean`. `visible=true`일 때만 표시(playing은 전부 false).
- 접근성: `role="dialog"` + 현재 상태를 알리는 텍스트를 포함한다.
- 구조: title(`--font-size-title`) → 상태 안내 caption → `.game__button`.

**`.game__button` (상태 전이 control)**
- props: `label:string`(예: "시작", "재개", "다시 시작"), `action`.
- 상태: default / `:hover` / `:focus-visible` / `:active`.
  - default: `background: var(--color-paddle)`, `color: var(--color-bg)`.
  - `:hover`: 명도 소폭 상승(예: `filter: brightness(1.1)`).
  - `:focus-visible`: 2px outline(예: `--color-ball`) — 키보드 포커스 가시화.
  - `:active`: `filter: brightness(0.95)`.

**`.game__brick` (벽돌)**
- props: `row: 1|2|3` → 배경 `var(--color-brick-r1|r2|r3)`.
- 모서리 반경 `var(--radius-brick)` (4px).

### 5.3 접근성 (Accessibility) — frozen

- **일시정지 control**은 `aria-label="일시정지"`를 가진다.
- 각 overlay(`#overlay-*`)는 `role="dialog"`와 **현재 화면 상태를 알리는 텍스트**를 가진다.
- 키보드만으로 **시작(Space)·일시정지·재개·패들 좌우 이동(←/→)** 이 가능하다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.4 인터랙션(정적 시안 표현)

- mockup HTML은 정적이므로 `:hover`/`:focus-visible`/`:active` 버튼 상태는 CSS로 직접 표현하거나
  별도 "버튼 상태" 견본 섹션에 나란히 그려 UX 의도를 전달한다.
- 5개 상태 시안은 각각 `<section>`으로 구분해 한 페이지에서 스크롤로 모두 확인 가능하게 한다.

---

## 6. dev 구현 가이드 (developer가 따라할 단계)

> 대상 파일: `design/design-tokens.html`, `design/design-mockup.html`
> (런타임 `index.html`/`src/**`도 동일 토큰 이름·값을 재사용한다.)

### 6.1 공통 — 토큰 선언 (두 파일 동일)

```html
<style>
  :root {
    /* colors */
    --color-bg: #0f1424;
    --color-surface: #1b2138;
    --color-paddle: #4cc9f0;
    --color-ball: #f8f9fa;
    --color-brick-r1: #ef476f;
    --color-brick-r2: #ffd166;
    --color-brick-r3: #06d6a0;
    --color-text: #e9ecef;
    /* spacing / radius */
    --space-hud-gap: 16px;
    --radius-brick: 4px;
    /* typography */
    --font-size-hud: 20px;
    --font-size-title: 40px;
    --font-stack: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
  }
</style>
```

- ⚠️ **하드코딩 금지**: 견본/시안 요소의 색·간격·크기는 위 `var(--토큰)` 을 참조한다
  (예: `background: var(--color-brick-r1)`, `gap: var(--space-hud-gap)`).
- 두 파일이 **동일한 CSS 변수 집합**을 사용해야 한다(값 중복 하드코딩 금지).

### 6.2 `design/design-tokens.html` (토큰 견본)

1. 위 `:root` 토큰을 선언한다.
2. **색상 견본**: 8개 색 토큰 각각을 `var(--토큰)` 으로 칠한 swatch 카드 + 토큰명/HEX 라벨.
3. **타이포 견본**: `--font-size-title`(40px), `--font-size-hud`(20px)를 실제 크기로 표시.
4. **간격 견본**: `--space-hud-gap`(16px)을 시각화한 바(gap 표현).
5. **반경 견본**: `--radius-brick`(4px)을 적용한 사각형.
6. **그림자 견본**: 표면 강조용 shadow 견본을 표기(값은 자유, 단 CSS 변수로 정의해 참조 권장:
   예 `--shadow-panel: 0 4px 16px rgba(0,0,0,.4)`). 견본은 그 변수를 실제로 참조한다.
7. `<head>`에 `<meta charset="UTF-8">` + `<title>` 필수. 정적 서버 단독 렌더 보장(외부 의존 0).

### 6.3 `design/design-mockup.html` (5개 상태 시안)

1. 위 `:root` 토큰을 선언한다(6.1과 동일 집합).
2. `#game-root.game` > `.game__hud`(`#hud-score`,`#hud-lives`) + `#game-canvas`(4:3 자리표시자,
   벽돌 3행/패들/공을 토큰 색으로 배치) 를 그린다.
3. **5개 상태를 모두 포함**한다 — 각 `<section>`으로 구분하고 해당 overlay와 화면 텍스트를 표기:
   - `#overlay-start` (ready) — "벽돌깨기" / "Space를 눌러 시작" + `.game__button`("시작")
   - `playing` — overlay 없이 HUD + 캔버스만
   - `#overlay-pause` (paused) — "일시정지됨" / "Space로 재개", 일시정지 control `aria-label="일시정지"`
   - `#overlay-gameover` (gameover) — "게임 오버" + 점수 + `.game__button`("다시 시작")
   - `#overlay-clear` (cleared) — "클리어!" + 점수 + `.game__button`("다시 시작")
4. 각 overlay에 `role="dialog"` + 상태명 텍스트를 넣는다(§5.3).
5. 반응형: `#game-root` 가로 overflow 금지, `#game-canvas` 비율 유지 축소, HUD 텍스트 절단 금지(§4.4).
6. `<head>`에 `<meta charset="UTF-8">` + `<title>` 필수. 외부 의존 0, 정적 서버 단독 렌더.

### 6.4 CSS 변수/클래스 네이밍 요약 (권장)

- 컨테이너: `#game-root.game` / HUD: `.game__hud` / 오버레이: `.game__overlay`
- 버튼: `.game__button` / 벽돌: `.game__brick`
- 상태 클래스는 런타임(`index.html`/`game.js`) 소관이나, mockup에서는 상태별 `<section>`으로 표현.

---

## 7. mockup 참조

본 시각 명세가 규정하는 정적 산출물(developer 소유):

- `phaser-brick-blitz/design/design-tokens.html` — §2·§6.2 토큰 견본
- `phaser-brick-blitz/design/design-mockup.html` — §4·§5·§6.3 5개 상태 시안

두 파일은 §6.1의 동일 `:root` 토큰을 참조하며 값 하드코딩 없이, 정적 서버
(`python3 -m http.server`)로 열었을 때 그 자체로 렌더링되어야 한다.

---

## 8. Self-critique

- **AC 매핑**: §2/§6.1 → 토큰 견본이 `var(--토큰)` 참조·하드코딩 금지 명시(AC1). §4/§5/§6.3 →
  5개 상태·화면 텍스트·4:3 캔버스 자리표시자 명세(AC2). §6.1/§7 → 두 파일 동일 CSS 변수·정적 서버
  단독 렌더(AC3). §1 상단·§7 → 시각 명세 범위는 본 README.md, 런타임 HTML/CSS/JS 미생성(AC4).
- **소유권 정합**: frozen blueprint 기준 designer는 `README.md`(시각 명세)만 작성. design/*.html·
  런타임·테스트는 developer 소유임을 §1·§6·§7에서 명시(planner 문서 §1/§5 표기와 상충 시 frozen
  invariant 우선).
- **토큰 exact 보존**: 13개 frozen 토큰의 이름·값을 변경·추가·재정의 없이 그대로 명세(§2).
- **컴포넌트 매핑**: DOM ID 8종·CSS class 5종을 §4.1/§5에서 전부 매핑.
- **모호함 flag**: (1) 캔버스 비율은 계약에 수치 미규정 → 4:3 **권장**으로 명시(developer 조정 가능).
  (2) 그림자 토큰은 frozen 목록에 없어 §6.2에서 CSS 변수 정의를 **권장**으로 표기(계약 토큰 아님).
  두 항목은 frozen 토큰이 아니므로 developer가 계약 위반 없이 조정 가능.
```
