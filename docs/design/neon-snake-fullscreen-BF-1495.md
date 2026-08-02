# 반응형 전체화면 스테이지 시각 명세 — neon-snake-fullscreen-0802 (BF-1495)

> 작성자: [이디자인] (designer) · 작성일 2026-08-02
> 관련 티켓: BF-1495 (Epic/blueprint 키) · BF-1496 (본 designer task) · BF-1498 (planner) · BF-1497 (dev)
> tech-stack: `vanilla-static` — 외부 프레임워크·번들러·CDN·webfont 0건, system font 만 사용
> 실행 설계 SSOT(권위): `docs/plans/neon-snake-fullscreen-BF-1495-plan.md` (planner, BF-1498)
> 시각 언어 계승 참조: `docs/design/neon-snake-fullscreen-0802-BF-1489.md` (BF-1489 네온 야간 테마)
> 대상 라우트: `/demo/neon-snake-fullscreen-0802`
> 진입 파일(developer 소유, frozen): `demo/neon-snake-fullscreen-0802/index.html`
> mockup: `docs/design/mockups/neon-snake-fullscreen-BF-1495.html`

---

## 0. 문서 성격 및 전제 (필독)

**전제 1 — frozen UI 계약을 재정의하지 않는다:** 상위 Execution Blueprint의
`ui-contract@v1`(sha256:0f5995a979f335357238e854f041dd5b400f2a157935ff58d19041055ba0a43e)과
planner 실행 설계(`docs/plans/neon-snake-fullscreen-BF-1495-plan.md`,
`planning-contract@v1` sha256:82f6fb08bcb0007ccfb1de0f6fc20ae154d93b3a9770e970b957c19b2f193047)가
파일 목록·DOM ID/class·상태·디자인 토큰·접근성·반응형을 이미 **frozen** 했다.
본 문서는 그 계약을 **그대로 서술**하고 그 위에 네온 야간 테마의 시각 표현만
구체화한다. selector·상태명·토큰 이름/값을 **변경하거나 재정의하지 않는다**(frozen 불변식).

**전제 2 — designer 산출물 경계:** 본 문서는 디자인 명세(컬러·타이포·레이아웃·
컴포넌트 계약·상태별 시각 표현)와 시각 mockup HTML 까지다. 실제 런타임
코드(`index.html`/`src/game.js`/`tests/viewport.test.js`)는 developer(BF-1497)
소유이며 본 task 에서 생성·수정하지 않는다(non-goal). 아래 mockup HTML은
`docs/design/mockups/` 의 **시각 시뮬레이션**으로, 런타임 산출물이 아니다.

**전제 3 — BF-1489 대비 이번 계약의 차이(전체화면 반응형 전환):**
BF-1489 는 중앙 레터박스 정사각 카드 기준이었다. 본 계약(BF-1495)은 **고정 정사각형
카드 제한을 제거**하고 스테이지가 `100dvw × 100dvh` 가용 영역을 **꽉 채우는**
반응형 전체화면으로 전환한다. selector·토큰·상태 집합도 이번 blueprint 기준으로
갱신되었다(§2.1·§4.1). BF-1489 문서에서는 **네온 시각 언어(색감·글로우·야간 깊이)만**
계승하고, 파일·selector·토큰·상태는 이번 frozen 계약을 유일 권위로 사용한다.

**전제 4 — 정적(`file://`) 열람:** mockup HTML 은 외부 의존성 0건 self-contained
단일 파일로 `file://` 로 바로 열람 가능해야 한다.

**전제 5 — 토큰 권위:** §2.1 의 5개 토큰은 frozen 이며 **값·이름 고정**이다. §2.2 의
표현용(presentational) 값은 frozen 5토큰 위에 얹는 designer 권고이며 frozen 토큰을
**덮어쓰지 않는다**. developer 는 §2.2 를 참고로 텍스트/글로우/스크림/보조색을
표현하되 5 frozen 토큰의 값은 그대로 사용한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 시각 표현 (ready/playing/paused/gameover)](#6-상태별-시각-표현)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조 / 남은 모호함](#8-mockup-참조--남은-모호함)

---

## 1. 시안 개요

### 1.1 변경 범위

`/demo/neon-snake-fullscreen-0802` 화면을 **고정 정사각 카드 없이 뷰포트 전체를
스테이지로 쓰는 반응형 전체화면**으로 시각 명세한다. `#game-stage` 가
`100dvw × 100dvh` 가용 영역을 채우고, 그 위에 HUD(점수·최고점수), 상태 overlay
(준비/일시정지/게임오버), 그리고 모바일 터치 컨트롤(`#touch-controls`)이 **플레이
영역을 잠식하지 않는 오버레이**로 겹쳐 배치된다. BF-1489 의 네온 야간 테마
(다크 배경·네온 글로우·절제된 깊이감)를 시각 언어로 계승한다.

### 1.2 사용자 경험 목표

| 목표 | 설명 |
|---|---|
| 몰입형 전체화면 | `--neon-bg`(#050510) 다크 배경이 화면 끝까지 차고, 스테이지가 뷰포트 전체를 채움. 고정 415px·정사각 제한 없음. body 스크롤/바운스 없음 |
| 상태·크기 보존 | resize/orientationchange/fullscreenchange 시 게임이 재시작되지 않고 뱀·먹이·점수·상태가 유지된 채 새 크기로 리렌더(planner AC-2). 시각적으로도 "리셋된 느낌"을 주지 않도록 overlay 는 상태에 종속 |
| 네온 심미(계승) | 뱀·먹이가 다크 배경 위에서 발광. 글로우는 가독성을 해치지 않는 절제된 강도. BF-1489 색감 계승 |
| 상태 명료성 | ready/playing/paused/gameover 를 **색 + 화면 텍스트 + 접근성 이름** 3중 채널로 구분. 색만으로 정보 전달 금지(WCAG 1.4.1) |
| 잘림/겹침 없음 | 320px~1920px+ 모든 뷰포트에서 HUD·overlay·터치 컨트롤이 잘리거나 서로 겹치지 않고 `safe-area-inset` 을 반영 |
| 접근성 우선 | `#game-overlay` `aria-live="polite"` 상태 안내 + `#restart-button` `aria-label`·키보드 도달 + `#game-canvas` `role`·`aria-label`·`prefers-reduced-motion` 존중 |

### 1.3 AC 매핑 (BF-1496 수용 기준 → 명세 근거)

| BF-1496 수용 기준 | 충족 근거 |
|---|---|
| BF-1489 네온 시각 언어 유지 + 고정 정사각 카드 없이 viewport 전체 스테이지로 HUD/overlay/터치 컨트롤 배치 명세 | §1.1·§2(네온 팔레트 계승) · §4.2~§4.5(전체화면 dvw/dvh·오버레이 배치·터치 컨트롤) · §5.1~§5.6 |
| 각 상태(ready/playing/paused/gameover)의 화면 텍스트·색상 외 시각 표시 + prefers-reduced-motion 대응 명시 | §6.1~§6.5(상태별 화면 텍스트·아이콘/형태·전환) · §6.6(reduced-motion) |
| 시각 명세 범위는 `docs/design/neon-snake-fullscreen-BF-1495.md` 이며 런타임 HTML/CSS/JS 를 생성하지 않는다 | 본 문서 + mockup(시각 시뮬레이션)만 산출. 런타임 파일(`index.html`/`game.js`/`viewport.test.js`)은 developer 소유 non-goal(§0 전제 2) |

---

## 2. 컬러 팔레트

### 2.1 Frozen 디자인 토큰 (값·이름 변경 금지 — planner §4.5)

아래 5개 토큰은 frozen 이다. developer 는 `:root` 에 이 이름·값 그대로 정의하고
하드코딩하지 않는다.

| 토큰 | 값 | 권장 용도 |
|---|---|---|
| `--neon-primary` | `#39ff14` | 뱀 몸통·주 강조·버튼 채움(네온 그린) |
| `--neon-bg` | `#050510` | `#game-stage`/`#game-canvas` 배경(네온 야간) |
| `--hud-gap` | `12px` | `.hud` 내부 `.hud__item` 간격 |
| `--overlay-bg` | `rgba(5,5,16,0.72)` | `#game-overlay` 반투명 스크림 배경 |
| `--safe-area-top` | `env(safe-area-inset-top)` | HUD 상단 safe-area inset 반영 |

> **BF-1489 대비:** 이번 계약의 frozen 색 토큰은 `--neon-primary` 와 `--neon-bg`
> 2색뿐이다(BF-1489 의 secondary/food 토큰은 이번 blueprint 에 없음). 뱀 머리 시안·
> 먹이 핑크 등 추가 색은 아래 §2.2 표현용 권고로 **frozen 위에 얹으며**, frozen
> 2색을 덮어쓰지 않는다.

### 2.2 표현용 권고 값 (frozen 위에 얹음 — frozen 토큰 덮어쓰지 않음)

색만으로 정보를 전달하지 않으므로 아래 색은 항상 텍스트와 함께 쓰인다.
developer 는 이 값을 보조 상수/변수로 사용하되 §2.1 5토큰의 값은 그대로 둔다.

| 역할 | 권고 이름(예) | 값 | 용도 |
|---|---|---|---|
| 본문/HUD 텍스트 | `--text-primary` | `#eafcff` | 점수·overlay 제목 등 주 텍스트(거의 흰색, 시안 틴트) |
| 보조 텍스트 | `--text-secondary` | `#8ea9bf` | HUD 레이블·overlay 보조 설명 |
| 뱀 머리 | `--neon-head` | `#00e5ff` | 뱀 머리 채움(시안) — 머리 식별(그래픽) |
| 먹이 | `--neon-food` | `#ff2d95` | 먹이 색(네온 핑크) — 항상 형태(원)와 병기 |
| 격자선 | `--grid-line` | `rgba(0,229,255,0.06)` | canvas 안 옅은 시안 격자(선택, 절제) |
| 배경 상단 광원 | `--bg-glow-top` | `rgba(0,229,255,0.10)` | 상단 은은한 시안 방사 그라데이션 |
| 배경 하단 광원 | `--bg-glow-bottom` | `rgba(57,255,20,0.06)` | 하단 은은한 그린 방사 그라데이션 |
| 뱀 머리 글로우 | (그림자) | `0 0 12px rgba(0,229,255,0.85)` | `--neon-head` 발광 |
| 뱀 몸통 글로우 | (그림자) | `0 0 8px rgba(57,255,20,0.7)` | `--neon-primary` 발광 |
| 먹이 글로우 | (그림자) | `0 0 14px rgba(255,45,149,0.85)` | `--neon-food` 발광(맥동) |
| gameover 색조 | `--gameover-tint` | `rgba(255,45,149,0.16)` | overlay 스크림에 핑크 색조(색+텍스트 이중) |
| 포커스 링 | `--focus-ring` | `rgba(0,229,255,0.6)` | `focus-visible` 링(시안) |
| HUD 패널 | `--hud-panel` | `rgba(5,5,16,0.55)` | HUD 항목 뒤 반투명 다크 패널(격자 위 가독성) |

> **배경 그라데이션 정의:** `--neon-bg`(#050510) 단색 위에 상단 시안·하단 그린
> 방사 광원(위 `--bg-glow-*`)을 아주 옅게 얹어 "야간 네온" 깊이를 만든다. 광원은
> 배경 장식일 뿐 게임 격자 가독성을 침범하지 않는다. frozen `--neon-bg` 값 자체는
> 변경하지 않는다.

### 2.3 대비(명도차) 확인 — `--neon-bg`(#050510) 기준

| 조합 | 용도 | 대비비(근사) | 판정 |
|---|---|---|---|
| `#eafcff` on `#050510` | 주 텍스트(점수·overlay 제목) | ≈ 19:1 | AAA |
| `#8ea9bf` on `#050510` | HUD 레이블·보조 설명 | ≈ 8.5:1 | AAA |
| `#39ff14` on `#050510` | 뱀 몸통·버튼 채움(그래픽) | ≈ 16:1 | AAA(그래픽 3:1 충분) |
| `#00e5ff` on `#050510` | 뱀 머리(그래픽) | ≈ 13:1 | AAA(그래픽) |
| `#ff2d95` on `#050510` | 먹이(그래픽) | ≈ 5.6:1 | 그래픽 3:1 통과 |
| `#050510` on `#39ff14` | primary 버튼 텍스트(어두운 글자/네온 배경) | ≈ 16:1 | AAA |

> 네온색은 게임 그래픽(비텍스트 UI)이라 WCAG 1.4.11 그래픽 대비 3:1 을 통과한다.
> 화면 **글자**(점수·상태명·버튼 라벨)는 `--text-*` 값으로 AA 이상을 확보하고,
> overlay 위 텍스트는 `--overlay-bg`(0.72 알파) 스크림이 배경을 눌러 대비를 추가
> 확보한다.

---

## 3. 타이포그래피

외부 webfont 없이 system font stack 만 사용(vanilla-static).

```
--font-sans: system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, "Courier New", monospace;
```

| 역할 | 요소 | font-family | size | weight | line-height | 비고 |
|---|---|---|---|---|---|---|
| overlay 제목 | `#game-overlay` 상태 제목(준비/일시정지/게임오버) | sans | `clamp(24px, 7vw, 40px)` | 700 | 1.15 | 상태명 화면 텍스트 |
| overlay 설명 | overlay 보조 안내문 | sans | `clamp(14px, 3.5vw, 17px)` | 400 | 1.5 | secondary 색, 줄바꿈 허용 |
| overlay 통계 | 게임오버 점수/최고점수 | **mono** | `clamp(16px, 4vw, 22px)` | 700 | 1.3 | `tabular-nums` |
| HUD 값 | `#hud-score`/`#hud-highscore` 값 | **mono** | `clamp(16px, 4.5vw, 24px)` | 700 | 1 | `tabular-nums` — 자릿수 흔들림 방지 |
| HUD 레이블 | `.hud__item` 레이블(점수/최고) | sans | 11px | 600 | 1.2 | uppercase 아님(한글), `letter-spacing 0.04em`, secondary 색 |
| 버튼 | `#restart-button` | sans | 15px | 700 | 1 | 대문자 아님 |
| 터치 컨트롤 | `.touch-pad` 방향 기호 | sans | `clamp(18px, 6vw, 24px)` | 700 | 1 | 방향 화살표 문자 |

> 숫자(점수·최고점수)는 **mono + `font-variant-numeric: tabular-nums`** 로 실시간
> 갱신 시 폭 흔들림을 방지한다. resize/orientationchange 로 화면이 커지거나 작아져도
> `clamp()` 상·하한 안에서 크기만 변하고 값·레이아웃은 유지된다.

---

## 4. 레이아웃

### 4.1 DOM 구조 (frozen — planner §4.2·§4.3 그대로)

```
#game-stage (.stage)                       ← 100dvw × 100dvh, position:relative, overflow:hidden
├─ <canvas> #game-canvas (.stage__canvas)  ← role + aria-label, 전체영역 렌더(오버레이 아래)
├─ .hud                                     ← 상단 겹침(absolute), gap: --hud-gap, safe-area-top
│   ├─ #hud-score      (.hud__item)         ← 점수
│   └─ #hud-highscore  (.hud__item)         ← 최고 점수
├─ #game-overlay (.overlay)                 ← aria-live="polite" 상태 텍스트, gameover 시 .overlay--gameover
│                                             ├─ 상태 제목 · 설명/통계
│                                             └─ #restart-button
└─ #touch-controls (.touch-pad ×4)          ← 하단 겹침(absolute), safe-area-bottom, 모바일 방향 입력
```

**frozen selector 집합(재정의·추가·삭제 금지):**
- DOM ID(7): `game-stage`, `game-canvas`, `hud-score`, `hud-highscore`, `game-overlay`,
  `restart-button`, `touch-controls`
- CSS class(7): `stage`, `stage__canvas`, `hud`, `hud__item`, `overlay`,
  `overlay--gameover`, `touch-pad`

> 위 집합 밖의 wrapper/장식 class 추가·HUD 내부 세부 배치는 frozen selector 범위 밖
> developer 재량이나, 위 ID/class 이름은 고정이다. `#restart-button` 은 계약상
> `#game-overlay` 내부에 위치하며(단일 overlay), BF-1489 처럼 상태별로 분리된 3개
> overlay 를 만들지 않는다.

### 4.2 전체화면 스테이지 (frozen 반응형 — planner §4.7)

- `#game-stage.stage` 는 `width: 100dvw; height: 100dvh` 로 가용 뷰포트 전체를 채운다.
  `position: relative; overflow: hidden`. **고정 415px·정사각 카드·max-width 제한 없음.**
- `body { margin: 0; overflow: hidden }` — 스크롤·바운스 없음(스테이지가 유일한 화면).
- `#game-canvas.stage__canvas` 는 스테이지의 실제 CSS 픽셀 크기를 그대로 따라가며
  (`position: absolute; inset: 0; width:100%; height:100%`), HUD/overlay/터치 컨트롤은
  그 **위 오버레이**로 얹혀 canvas 렌더 영역을 레이아웃 flow 에서 축소하지 않는다
  (frozen 반응형: HUD·overlay 는 stage 계산 크기를 줄이지 않음).

> **정사각 카드 제거의 시각 의미:** BF-1489 의 중앙 레터박스 정사각 격자와 달리,
> 이번 시안은 canvas 가 스테이지 전체(비정사각 포함)를 채운다. 논리 grid 는 뷰포트
> 종횡비에 맞춰 열/행 수가 파생되며(planner §7 `Grid{cols,rows,cellPx}`), 셀은 정사각
> 유지하되 화면을 꽉 채우도록 열·행 수를 재계산한다. 남는 가장자리 여백은 최소화한다.

### 4.3 DPR 리렌더 · 상태 보존의 시각 계약 (planner §5·§6)

- resize/orientationchange/fullscreenchange 시 canvas backing store 를
  `cssW × dpr`, `cssH × dpr` 로 재설정하고 컨텍스트를 dpr 스케일해 **선명도를 유지**한다.
- **시각적으로 게임이 재시작된 느낌을 주지 않는다:** 뱀·먹이·점수·overlay 상태는
  그대로 유지되고, 새 grid 로 좌표가 클램프될 때도 뱀/먹이가 화면 밖으로 튀지 않는다
  (planner AC-2·RG-3). overlay 는 상태(status)에만 종속되므로 크기 변경만으로
  나타나거나 사라지지 않는다.

### 4.4 HUD·overlay·터치 컨트롤 오버레이 배치 (frozen 반응형)

세 오버레이 레이어는 모두 `#game-stage` 안에서 `position: absolute` 로 겹쳐 배치되어
canvas 격자 렌더 영역을 flow 에서 축소하지 않는다.

```
┌─ #game-stage (100dvw × 100dvh, --neon-bg + 배경 광원) ───────────────┐
│  ┌─ .hud (top, safe-area-top 반영, gap: --hud-gap) ───────────────┐  │
│  │  [점수 0]        [최고 200]        ← 반투명 패널, 잘림/겹침 없음  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│        #game-canvas — 뱀·먹이가 스테이지 전체에 네온 렌더             │
│        · · · ●(먹이 핑크) · · · ▮▮▮(뱀: 머리 시안+몸통 그린) · ·     │
│                                                                        │
│   ┌─ #game-overlay (.overlay; 상태 종속) ─────────────────────────┐  │
│   │        [상태 제목]  [설명/통계]  [#restart-button]             │  │
│   └────────────────────────────────────────────────────────────────┘  │
│  ┌─ #touch-controls (bottom, safe-area-bottom, 모바일에서만) ─────┐  │
│  │            [▲]                                                  │  │
│  │        [◀] [▼] [▶]      ← .touch-pad ×4, 잘림/겹침 없음         │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **HUD**: 스테이지 상단. `padding-top` 에 `--safe-area-top`(그리고 좌우 inset) 을
  더해 노치/둥근 모서리·시스템 UI 에 가리지 않게 한다. 항목 간격은 frozen
  `--hud-gap`(12px). 각 `.hud__item` 은 반투명 다크 패널(`--hud-panel`) 위 2줄 스택
  (레이블 + 값 mono).
- **overlay**: 스테이지 중앙. `--overlay-bg`(0.72) 스크림이 전면을 덮어 텍스트 대비를
  확보. 상태 제목·설명/통계·(gameover 시) `#restart-button` 포함. `aria-live="polite"`.
- **터치 컨트롤**: 스테이지 하단. `padding-bottom` 에 `env(safe-area-inset-bottom)` 반영.
  포인터 없는(모바일) 환경에서 노출(§5.6). 방향 입력이 페이지 스크롤/줌을 유발하지
  않도록 `touch-action: none` 권장.

### 4.5 breakpoint 별 동작 (320px ~ 1920px+)

| 뷰포트 | 동작 |
|---|---|
| 기본(모든 크기) | 스테이지 전체화면, canvas 가 스테이지 전체 렌더. HUD/overlay/터치 오버레이. 스크롤 없음 |
| 320px(하한) | HUD 2항목이 좁아도 `--hud-gap` 유지·잘림/겹침 없음. HUD 값 size 하한(`clamp` 최소값). overlay 설명 줄바꿈 허용. 터치 컨트롤이 하단에서 HUD/overlay 와 겹치지 않게 배치 |
| 세로↔가로 회전 | `orientationchange` 시 §4.3 재계산으로 새 grid 렌더, 상태·좌표 보존 |
| ≥1024px 데스크톱 | 넓은 스테이지를 canvas 가 채우고, HUD/overlay 는 중앙·상단 정렬 유지. 터치 컨트롤은 포인터 환경에서 숨김(§5.6) |
| ≥1920px+ | 셀 크기(`cellPx`) 상한 내에서 grid 열·행 수 증가. HUD/overlay 크기는 `clamp` 상한. 여백 없이 스테이지 꽉 채움 |
| 노치/safe-area | HUD `--safe-area-top`, 터치 컨트롤 `safe-area-inset-bottom`, 좌우 inset 반영 — 시스템 UI 에 가리지 않음(planner E5) |

> 단일 레이아웃(전체화면 겹침) — 별도 데스크톱/모바일 페이지 분기 없이 `100dvw/100dvh`
> + 오버레이 배치로 모든 뷰포트를 커버한다. 터치 컨트롤 노출만 입력 방식에 따라 토글.

---

## 5. 컴포넌트 명세

각 컴포넌트의 시각 상태·인터랙션·접근성 계약. selector 는 frozen(§4.1) 그대로다.

### 5.1 stage `#game-stage` (.stage)

| 항목 | 계약 |
|---|---|
| 크기 | `100dvw × 100dvh`, `position: relative`, `overflow: hidden`. 고정 415px·정사각·max-width 없음 |
| 배경 | `--neon-bg`(#050510) + 상/하 은은한 방사 광원(§2.2 `--bg-glow-*`) |
| 파티클 | 절제된 배경 파티클(작은 시안/그린 점의 느린 부유). reduced-motion 시 정지·정적(§6.6) |
| 역할 | canvas·HUD·overlay·터치 컨트롤 4 레이어의 유일한 겹침 컨테이너 |

### 5.2 canvas `#game-canvas` (.stage__canvas)

| 항목 | 계약 |
|---|---|
| 크기 | `position:absolute; inset:0; width:100%; height:100%` — 스테이지 전체 채움. backing store 는 dpr 반영 재설정(§4.3) |
| 접근성 | `role`(예: `img`) + 명시적 `aria-label`(예: "네온 스네이크 게임 보드, 점수 N, 최고 점수 M"), 상태 반영 권장. `prefers-reduced-motion` 존중(frozen 접근성) |
| 배경 | `--neon-bg`. 선택적 옅은 격자선(`--grid-line`, 시안 6% alpha) — 절제, 없어도 무방 |
| 뱀 머리 | `--neon-head`(시안) 채움 + 글로우 `0 0 12px rgba(0,229,255,0.85)`. 진행 방향 쪽 살짝 둥근 모서리로 머리 식별 |
| 뱀 몸통 | `--neon-primary`(그린) 채움 + 글로우 `0 0 8px rgba(57,255,20,0.7)`. 라운드 사각(radius ≈ 셀 20%), 셀 간 1~2px 간격으로 마디 구분 |
| 먹이 | `--neon-food`(핑크) **원형**(형태로도 구분) + 글로우 `0 0 14px rgba(255,45,149,0.85)`. playing 중 은은한 맥동, reduced-motion 시 정적 |
| 렌더 요소 | 격자(선택) · 뱀(머리+몸통) · 먹이 1개. grid 열·행 수는 뷰포트/dpr 파생(planner §7) |

> 글로우는 canvas 2D `shadowBlur`/`shadowColor` 또는 다중 패스로 표현(developer 재량).
> 강도는 위 값을 상한 기준으로 하되 가독성을 해치지 않게 절제한다.

### 5.3 HUD `.hud` + `.hud__item`

| 항목 | 계약 |
|---|---|
| 컨테이너 | 스테이지 상단 겹침(`position:absolute; top:0`), `padding-top: --safe-area-top`(+좌우 inset), 항목 간격 `--hud-gap`(12px) |
| `#hud-score` (`.hud__item`) | 레이블 "점수" + 값(mono, `tabular-nums`). 값 변경 시 즉시 갱신 |
| `#hud-highscore` (`.hud__item`) | 레이블 "최고" + 값(mono). 최고 점수 유지(resize 무관) |
| 배경 | 각 항목 뒤 반투명 다크 패널(`--hud-panel`)로 격자 위에서도 값 가독성 확보 |
| 색 | 레이블 `--text-secondary`, 값 `--text-primary`. 색만으로 정보 전달 금지(레이블 텍스트 병기) |
| 비침습 | HUD 는 오버레이라 canvas 렌더 영역을 축소하지 않는다(frozen 반응형) |

### 5.4 overlay `#game-overlay` (.overlay / .overlay--gameover)

BF-1489 의 3-분리 overlay 와 달리 **단일 `#game-overlay`** 가 상태 텍스트를 바꿔 안내한다.

| 항목 | 계약 |
|---|---|
| 표시 조건 | `ready`·`paused`·`gameover` 에서 노출, `playing` 에서 숨김(플레이 방해 없음) |
| 접근성 | `aria-live="polite"` — 상태 텍스트(준비/일시정지/게임오버)를 스크린리더에 안내(frozen 접근성) |
| 스크림 | `--overlay-bg`(rgba(5,5,16,0.72)) 로 게임 화면을 눌러 텍스트 대비 확보 |
| 제목 | 상태명을 **화면 텍스트로** 노출(§6). `--text-primary`. overlay 제목 타이포(§3) |
| gameover 변형 | `gameover` 시 `overlay--gameover` 부여 → 스크림에 `--gameover-tint`(핑크) 색조 + 점수/최고 통계 표시(결과를 색+텍스트 이중) |
| 버튼 | `#restart-button` 을 overlay 내부에 포함(§5.5). ready/gameover 에서 주 control 로 사용 |
| 포커스 | 노출 시 `#restart-button` 또는 제목(`tabindex="-1"`)에 포커스 이동해 낭독(developer 재량) |

### 5.5 버튼 `#restart-button`

| 상태 | 표현 |
|---|---|
| 기본 | 네온 그린(`--neon-primary`) 채움 + 어두운 글자(`--neon-bg`), `min-height:44px`(터치 타깃 ≥44px, WCAG 2.5.5), radius ≈ 10px |
| hover | 밝기 소폭 상승 + 글로우 강화(색 변화 위주) |
| active | `transform: scale(0.97)` (reduced-motion 시 없음) |
| focus-visible | `outline: 2px solid --neon-head; outline-offset: 2px` + `box-shadow 0 0 0 4px --focus-ring`(시안 링) — 키보드 포커스로 도달·활성화(frozen 접근성) |
| 접근성 | 명시적 `aria-label`(예: "게임 다시 시작"). 네이티브 `<button>` 권장 — Enter/Space 네이티브 activation |
| 라벨/역할 | ready 진입 시 "시작", gameover 시 "다시 시작" 텍스트(단일 버튼, 상태별 라벨). 활성화 시 상태·점수·진행 표시를 초기값으로 되돌리고 주 control 재사용 가능(planner AC-5·RG-4) |

### 5.6 터치 컨트롤 `#touch-controls` (.touch-pad)

모바일 방향 입력용 신규 컴포넌트(BF-1489 엔 없음). 스테이지 하단 오버레이.

| 항목 | 계약 |
|---|---|
| 구성 | `.touch-pad` 4개(상/하/좌/우) 방향 버튼. 십자(D-pad) 배치. 각 버튼 방향 화살표 기호(▲▼◀▶) + `aria-label`(예: "위로") |
| 배치 | 스테이지 하단 겹침(`position:absolute; bottom:0`), `padding-bottom: env(safe-area-inset-bottom)`. HUD/overlay 와 겹치지 않음 |
| 노출 | 포인터 없는/coarse 입력(모바일)에서 노출 권장(`@media (pointer: coarse)` 또는 `hover: none`). 데스크톱 포인터 환경에서는 숨김(키보드 방향키 사용) — developer 재량 |
| 시각 | 반투명 다크 패널 + 네온 그린 테두리(1px), 눌림 시 `--neon-primary` 소폭 발광. `min-width/height:44px` 터치 타깃 |
| 입력 | `touch-action: none` 으로 스와이프/탭이 페이지 스크롤·줌을 유발하지 않게(입력 처리 로직은 developer) |
| 비침습 | 오버레이라 canvas 렌더 영역을 축소하지 않음 |

---

## 6. 상태별 시각 표현

frozen 상태 모델 4개(`ready | playing | paused | gameover`)를 시각으로 정의한다.
**모든 상태는 색 + 화면 텍스트 + 접근성 이름 3중 채널로 구분**한다(frozen 접근성).
아래 표의 **overlay 제목 화면 텍스트("준비"/"일시정지"/"게임오버")는 frozen 값**이며
변경하지 않는다. 설명·보조 문구는 designer 소관이다.

### 6.1 `ready` — 준비 (시작 대기)

| 요소 | 표현 |
|---|---|
| overlay | `#game-overlay` 노출(스크림) |
| overlay 제목(frozen) | **"준비"** |
| overlay 설명 | "시작을 눌러 플레이 · 방향키/WASD·화면 방향 버튼으로 이동" |
| 색상 외 시각 표시 | 중앙 제목 + `#restart-button`("시작") 존재 자체가 형태적 신호. overlay 카드 시안 테두리 |
| canvas | 중앙 3칸 뱀(머리 시안·몸통 그린) 정지, 먹이 없음(food null). 배경 광원 정적 |
| HUD | 점수 `0` · 최고 `저장값` |
| 접근성 이름 | `aria-live` → "준비. 시작을 눌러 플레이하세요." · 버튼 `aria-label`="게임 시작" |
| 시각 전환 | (진입) 페이드 인. reduced-motion 시 즉시 표시 |

### 6.2 `playing` — 진행 중

| 요소 | 표현 |
|---|---|
| overlay | 없음 — `#game-overlay` 숨김(방해 없는 플레이) |
| 화면 텍스트 | overlay 없음. 상태는 HUD 값 + canvas 뱀 이동으로 표현 |
| 색상 외 시각 표시 | 뱀이 실제로 **이동**(움직임=진행 신호), 먹이 원형 맥동, 점수 증가 |
| canvas | 뱀 이동(tick), 먹이 1개(핑크 원·맥동 글로우). 섭취 시 성장·새 먹이·점수 +N |
| HUD | 점수 즉시 갱신 · 최고 점수 유지 |
| 접근성 이름 | canvas `aria-label` 에 점수 반영(권장), 상태 전이 시 `aria-live` "게임 시작" |
| 시각 전환 | ready→playing: overlay 페이드 아웃 → 첫 먹이 등장. 섭취 시 짧은 파티클 버스트(절제, reduced-motion 시 생략) |

### 6.3 `paused` — 일시정지

| 요소 | 표현 |
|---|---|
| overlay | `#game-overlay` 노출(스크림) |
| overlay 제목(frozen) | **"일시정지"** |
| overlay 설명 | "Space 또는 P 로 재개" |
| 색상 외 시각 표시 | 중앙 "일시정지" 텍스트 + 뱀/먹이 **정지**(움직임 없음=정지 신호). 카드 그린 테두리 |
| canvas | 뱀·먹이가 정지 상태로 스크림 아래 보임(진행 위치 보존) |
| HUD | 정지 시점의 점수·최고 그대로 유지 |
| 접근성 이름 | `aria-live` → "일시정지" |
| 시각 전환 | playing→paused: 스크림 페이드 인, 파티클·먹이 맥동 정지. 재개 시 역전환, 뱀 위치·점수·먹이 그대로 이어짐(planner §6) |

### 6.4 `gameover` — 게임오버

| 요소 | 표현 |
|---|---|
| overlay | `#game-overlay` 노출 + `overlay--gameover` 부여(스크림 + `--gameover-tint` 핑크 색조) |
| overlay 제목(frozen) | **"게임오버"** — 핑크(`--neon-food`) 강조 |
| overlay 통계 | "점수 {score} · 최고 점수 {highScore}" (mono, `tabular-nums`) |
| overlay 설명 | "벽 또는 몸에 부딪혔어요" (충돌) |
| 색상 외 시각 표시 | 중앙 "게임오버" 텍스트 + 점수 통계 숫자 + 뱀 정지 + `#restart-button`("다시 시작"). 색(핑크 색조)은 텍스트와 항상 병기 |
| canvas | 충돌 지점의 뱀 정지 + 스크림·핑크 색조 |
| HUD | 최종 점수·최고 점수(갱신 반영) 유지 |
| 접근성 이름 | `aria-live` → "게임오버, 점수 {score}, 최고 점수 {highScore}" · 버튼 `aria-label`="게임 다시 시작" |
| 시각 전환 | playing→gameover: 짧은 충돌 플래시(가장자리 핑크 글로우 1회, reduced-motion 시 생략) → 스크림·overlay 페이드 인. `#restart-button` 즉시 사용 가능 |

### 6.5 상태 → overlay/버튼/색조 노출 매트릭스 (frozen 상태 계약)

| status | `#game-overlay` | `overlay--gameover` | 화면 제목(frozen) | `#restart-button` | 색상 외 신호 |
|---|---|---|---|---|---|
| ready | 노출 | 미부여 | "준비" | 노출("시작") | 제목 텍스트 + 버튼 형태 + 정지된 뱀 |
| playing | 숨김 | 미부여 | (없음) | 숨김 | 뱀 이동 + 점수 증가 + 먹이 맥동 |
| paused | 노출 | 미부여 | "일시정지" | 숨김 | 제목 텍스트 + 뱀 정지 |
| gameover | 노출 | **부여** | "게임오버" | 노출("다시 시작") | 제목+통계 텍스트 + 핑크 색조 + 뱀 정지 |

> overlay 노출/숨김·클래스 토글의 정확한 시점 로직은 developer(planner 상태 전이 우선).
> 위 표는 시각 의도 기준선이며 frozen 상태·selector 매핑과 일치한다. 초기화/취소/실패
> 후에는 상태·진행 표시가 초기값으로 복귀하고 주 control 을 다시 쓸 수 있다(planner AC-5).

### 6.6 모션 · `prefers-reduced-motion`

frozen 접근성: `#game-canvas` 는 `prefers-reduced-motion` 을 존중한다.
`@media (prefers-reduced-motion: reduce)` 에서 장식 연출을 비활성화하고 정적 렌더로 대체.

| 연출 | 기본(motion) | reduced-motion |
|---|---|---|
| 배경 파티클 | 느린 부유 | 정지(정적 점) 또는 미표시 |
| 먹이 맥동 | 은은한 scale/opacity 맥동 | 정적(고정 크기·불투명) |
| 뱀 글로우 | 정적 발광(애니메이션 아님) — 유지 | 정적 발광 유지(성능 시 blur 감소 가능) |
| 섭취 파티클 버스트 | 짧은 버스트 | 생략 |
| gameover 충돌 플래시 | 1회 플래시 | 생략(즉시 overlay) |
| overlay 페이드 | 120~180ms 페이드 | 즉시 표시(트랜지션 제거) |
| 버튼 hover/active·터치 눌림 | 트랜지션·transform | 색 변화만, transform 제거 |

> 게임 핵심 이동(뱀 tick)은 플레이 자체이므로 유지된다. reduced-motion 은 **장식
> 연출**(파티클·맥동·플래시·페이드·transform)만 끈다. resize/orientationchange 리렌더도
> 상태 변화가 아니므로 별도 트랜지션 없이 즉시 새 크기로 그린다.

---

## 7. dev 구현 가이드

developer(BF-1497)가 따라할 지침. **핵심: frozen selector·상태·5토큰을 그대로 사용하고
재정의하지 않는다.** 본 명세는 그 위의 시각 표현만 권고한다. 파일 소유·상태 계약은
frozen blueprint 가 유일 권위이며 본 문서는 이를 재정의하지 않는다.

### 7.1 CSS 변수 (frozen 5개 — 이름·값 고정)

`:root` 에 아래를 하드코딩 없이 정의:
```
--neon-primary: #39ff14;
--neon-bg: #050510;
--hud-gap: 12px;
--overlay-bg: rgba(5,5,16,0.72);
--safe-area-top: env(safe-area-inset-top);
```
표현용 보조 값(§2.2, 예: `--text-primary/secondary`, `--neon-head`, `--neon-food`,
`--grid-line`, `--focus-ring`, `--gameover-tint`, `--hud-panel`, `--bg-glow-*`)은 필요 시
추가로 정의하되 **위 5토큰의 값을 덮어쓰지 않는다**. canvas 안 네온색은
`getComputedStyle(root).getPropertyValue('--neon-primary')` 로 읽거나 동일 값 상수
미러링(developer 재량).

### 7.2 마크업/selector (frozen — 변경 금지)

- DOM ID(7): `game-stage`, `game-canvas`, `hud-score`, `hud-highscore`, `game-overlay`,
  `restart-button`, `touch-controls`
- class(7): `stage`, `stage__canvas`, `hud`, `hud__item`, `overlay`, `overlay--gameover`,
  `touch-pad`
- 위 집합 외 wrapper/장식 class 추가는 developer 재량이나, 위 이름은 고정.

### 7.3 구현 단계

1. **전체화면 스테이지** — `#game-stage.stage` 를 `100dvw × 100dvh`,
   `position:relative; overflow:hidden`. `body{margin:0; overflow:hidden}`. 고정 415px·정사각 제한 없음(§4.2).
2. **배경** — `--neon-bg` + 상/하 방사 광원(§2.2). 절제된 파티클은 선택.
3. **canvas** — `#game-canvas.stage__canvas` `inset:0; width/height:100%`, `role`·`aria-label`.
   `touch-action:none` 권장. dpr/resize/orientationchange/fullscreenchange 재계산(§4.3),
   뷰포트 종횡비 파생 grid — 셀 정사각 유지·좌표 클램프(planner RG-3).
4. **HUD** — `.hud`(absolute 겹침, `padding-top:--safe-area-top`, gap `--hud-gap`) 안에
   2 `.hud__item`(레이블 sans + 값 mono tabular-nums). 격자 영역 축소 금지(§4.4·§5.3).
5. **overlay** — 단일 `#game-overlay.overlay`(`aria-live="polite"`). status 별 노출/숨김,
   gameover 시 `overlay--gameover` + `--gameover-tint`. 스크림 `--overlay-bg`(§5.4·§6.5).
6. **버튼** — `#restart-button`(overlay 내부), `min-height:44px`, `aria-label`,
   `:focus-visible` 시안 링, 키보드 도달·활성화(§5.5). 활성화 시 상태·진행 초기화·재사용(AC-5).
7. **터치 컨트롤** — `#touch-controls` 안 `.touch-pad` 4방향, 하단 겹침
   `padding-bottom:env(safe-area-inset-bottom)`, coarse 포인터에서 노출, `touch-action:none`(§5.6).
8. **상태 보존 핸들러** — resize/orientationchange/fullscreenchange 는 **리렌더 함수만**
   호출하고 상태(뱀/먹이/점수/status)를 재생성하지 않는다(planner §5·RG-1·RG-2).
9. **reduced-motion** — `@media (prefers-reduced-motion: reduce)` 에서 파티클·맥동·플래시·
   페이드·transform 제거, 정적 렌더(§6.6). 게임 이동은 유지.

### 7.4 검증 포인트 (시안 대비)

- frozen 5토큰이 `:root` 에 이름·값 그대로 정의되고 색 하드코딩 0건인가?
- 7 ID·7 class 가 그대로 존재하고 추가 재정의가 없는가?
- `#game-stage` 가 `100dvw × 100dvh` 를 채우고 고정 415px·정사각 제한이 없는가?
- resize/orientationchange/fullscreenchange 후 뱀·먹이·점수·상태가 보존되고 재시작되지 않는가(RG-1·RG-2)?
- 새 grid 에서 모든 뱀/먹이 좌표가 유효 범위 안인가(RG-3)? 화면 밖 튐 없음?
- ready/playing/paused/gameover 4상태에서 `#game-overlay` 노출/숨김 + 제목("준비/일시정지/게임오버")이 §6.5 표와 일치하는가?
- 상태명이 화면 텍스트 + `aria-live` + (버튼) `aria-label` 로 노출되는가(색만 의존 금지)?
- HUD/overlay/터치 컨트롤이 canvas 렌더 영역을 축소하지 않고 겹치는가? 320px 에서도 잘림/겹침 없음?
- safe-area(HUD top·터치 bottom)가 반영되는가?
- `prefers-reduced-motion` 에서 장식 연출이 꺼지고 게임 이동은 유지되는가?
- 버튼·터치 타깃 ≥44px, focus-visible 링이 보이는가?
- `file://` 로 열어도 외부 요청 0건인가(system font, 외부 의존성 0)?

> **주의:** 본 mockup HTML 은 시각 시뮬레이션이며 dev 의 실제 산출물이 아니다.
> 픽셀 단위 일치 의무는 없고 frozen 토큰·selector·상태 시각 의도만 준수하면 된다.

---

## 8. mockup 참조 / 남은 모호함

### 8.1 mockup 참조

- 경로: **`docs/design/mockups/neon-snake-fullscreen-BF-1495.html`**
- 성격: 단일 self-contained HTML(외부 의존성 0건, system font). `file://` 로 바로 열람 가능.
- 내용: §2.1 frozen 토큰 스와치 + ready/playing/paused/gameover **4개 상태를
  `<section>` 으로 병렬 배치**해 상태별 시각 표현(단일 overlay·HUD·터치 컨트롤·네온 글로우)을
  한 화면에서 비교. canvas 대신 CSS 로 뱀·먹이·격자를 정적 렌더해 UX 의도 전달. 각 상태
  프레임은 고정 정사각이 아닌 **넓은 스테이지 비율**로 그려 전체화면 반응형 의도를 시각화.
- markdown 의 컬러/타이포/레이아웃과 동기화됨.

### 8.2 남은 모호함 (운영자/후속 task 확인 권장)

1. **표현용 보조 색(§2.2) 정식화 여부**: frozen 색 토큰은 `--neon-primary`·`--neon-bg`
   2개뿐이라 뱀 머리 시안·먹이 핑크·텍스트·격자선·색조는 designer 권고로 더했다. developer 가
   이를 CSS 변수로 정식 추가할지 상수로 둘지는 재량으로 남긴다(frozen 5토큰 불변). 다른 값이
   필요하면 운영자 확인 후 본 §2.2 개정.
2. **터치 컨트롤 노출 조건**: 본 시안은 `pointer: coarse`/`hover: none` 에서 노출을 기준선으로
   제시했으나, 하이브리드(터치+마우스) 기기에서 항상 노출할지 토글 UI 를 둘지는 frozen selector
   범위 밖 developer 재량이다. 어느 경우든 노출 시 canvas 영역을 축소하지 않고 safe-area 를 반영해야 한다.
3. **grid 종횡비 파생 규칙**: 전체화면에서 셀을 정사각 유지하며 열·행 수를 뷰포트 비율로 파생하는
   정확한 공식(`cellPx` 상·하한, 남는 여백 처리)은 planner §7 데이터 모델을 권위로 하며 developer 가
   구현한다. 본 시안은 "셀 정사각 유지·화면 꽉 채움·좌표 클램프" 의도만 규정한다.
4. **HUD 정렬(좌상단 vs 상단 중앙)**: 본 시안은 상단 가로 배치를 기준선으로 제시했으나 정확한 정렬은
   frozen selector 범위 밖 developer 재량이다. 어느 경우든 격자 영역을 축소하지 않아야 한다.
5. **파일명 키 표기**: 시각 명세 파일은 frozen 산출물명대로 `...BF-1495.md`, mockup 도 그 키와 짝을
   맞춰 `...BF-1495.html` 을 사용한다(본 designer task 는 BF-1496). 설계상 정상.

---

## Self-critique

PR commit 직전 자기 점검(5 항목):

1. **AC 매핑** — BF-1496 AC 3건(BF-1489 시각 언어 유지+정사각 카드 제거+HUD/overlay/터치
   컨트롤 배치 / 4상태 화면 텍스트·색상 외 표시·reduced-motion / 산출 범위=BF-1495.md)을 §1.3
   표에서 명세 섹션과 1:1 매핑. ✅
2. **dev 구현 가이드** — §7 에 frozen 5토큰·7 ID·7 class 를 그대로 쓰라는 명령 + 9단계 절차 +
   검증 포인트. resize 상태보존 핸들러·safe-area·터치 컨트롤·reduced-motion 포함. 하드코딩·재정의 금지 강조. ✅
3. **기존 요소 보존** — planner frozen UI 계약(selector·상태·5토큰·접근성·반응형)을 재정의 없이
   그대로 서술(§2.1·§4.1·§5·§6.5). BF-1489 대비 차이(정사각 제거·단일 overlay·2색 토큰·터치 컨트롤 신규)를
   §0 전제 3·§2.1 주석에서 명시. 표현용 보조 값은 frozen 위에 얹고 덮어쓰지 않음을 §0 전제 5·§7.1 에서 못박음. ✅
4. **컴포넌트 매핑** — stage·canvas·HUD(2 item)·단일 overlay(+gameover 변형)·restart-button·
   touch-controls(4 pad)를 planner 상태 모델·함수 계약과 매핑(§5·§6). 4 status 전부 시각 정의 +
   overlay/버튼/색조 노출 매트릭스(§6.5)가 frozen 상태 계약과 일치. ✅
5. **모호함 flag** — 표현용 보조 색 정식화·터치 컨트롤 노출 조건·grid 종횡비 파생·HUD 정렬·파일명 키를
   §8.2 에 명시적으로 flag. frozen 5토큰·7 selector·4 상태명은 불변으로 못박음. ✅

**남은 리스크:** 전체화면에서 셀 정사각을 유지하며 화면을 꽉 채우는 grid 파생 공식은 planner §7 을
권위로 남겼다(§8.2-3) — 시안은 시각 의도만 규정. canvas 네온색을 `getComputedStyle` 로 읽을지 상수
미러링할지는 재량(§7.1). 진입 파일(`index.html`) 등 런타임은 developer(BF-1497) 소유 후속 산출물이며
본 명세는 planner frozen 계약만을 권위로 작성했다.

---

*문서 종료 — [이디자인] · BF-1496 (반응형 전체화면 스테이지 시각 명세, blueprint BF-1495)*
