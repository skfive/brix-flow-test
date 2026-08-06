# Line Defense — 시각 명세 (Design Spec) · BF-1748

> 본 문서는 **designer가 작성한 UI 시각 명세**다. planner가 `docs/plans/BF-1737/implementation-plan.md`
> 및 frozen blueprint(`ui-contract@v1`)에서 동결한 **token·selector·상태·접근성·반응형 계약을
> 눈으로 확인 가능한 형태로 서술**한다. 아래 값·selector·상태는 **재정의 금지**이며 그대로 구현한다.
>
> - designer 소유 산출물: **이 문서(`canvas-tower-defense/README.md`)만** 작성한다.
> - `design-tokens.html`·`design-mockup.html`·`index.html`·`src/*`·`tests/*`는 **developer 소유**다.
>   developer는 본 문서 §2~§6의 시각 명세를 유일 권위로 두 시각 산출물을 구현한다.
> - 문서가 blueprint와 충돌하면 blueprint가 우선한다.

- Jira epic: BF-1737 · Task: BF-1748 (designer) · dependency: BF-1752
- module 루트: `canvas-tower-defense/` (모든 산출물은 이 디렉터리 밖으로 나가지 않는다)
- stack: vanilla-static · 외부 의존성 0건 · CSS 변수 자체 정의 · system font

---

## 1. 시안 개요

- **변경 범위**: 타워 디펜스 게임 화면의 시각 계약을 정적으로 확정한다. `design-tokens.html`(토큰
  견본 문서)과 `design-mockup.html`(4개 화면 상태 목업) 두 시각 산출물의 구현 명세를 제공한다.
- **사용자 경험 목표**: 어두운 slate 배경 위에서 canvas 게임 무대와 HUD(자원·생명·점수·웨이브)가
  한눈에 읽히고, `start → playing → paused → gameover` 전 상태 전이가 오버레이 텍스트와 control로
  명확히 드러나며, 색상만이 아니라 **상태명 텍스트 + 접근성 이름**으로도 구분되게 한다.
- **디자인 방향**: 다크 UI. 게임 무대는 저채도 slate(`--color-bg`/`--color-surface`/`--color-path`),
  플레이 요소는 고채도 accent(타워=cyan, 적=rose)로 대비. 액션은 green(진행)·red(위험)으로 신호.

---

## 2. 컬러 팔레트 (frozen · exact HEX)

`design-tokens.html`의 `:root`에 아래 값을 **CSS custom property로 그대로 선언**하고, 색상 견본은
반드시 이 변수를 참조한다(하드코딩 금지). `design-mockup.html`도 **동일 변수만** 사용한다.

| 토큰 | 값(HEX) | 역할 | 배치 |
| --- | --- | --- | --- |
| `--color-bg` | `#0f172a` | primary 배경 | 페이지/스테이지 바닥 |
| `--color-surface` | `#1e293b` | surface | HUD 패널·오버레이 카드 |
| `--color-path` | `#475569` | 경로 | 적 이동 경로(무대 내) |
| `--color-tower` | `#38bdf8` | accent(타워) | 타워 마커·강조 |
| `--color-enemy` | `#f43f5e` | accent(적) | 적 마커 |
| `--color-action-primary` | `#22c55e` | primary 액션 | 시작/재개 primary 버튼 |
| `--color-danger` | `#ef4444` | 위험 | 게임오버·생명 경고 |
| `--color-text` | `#e2e8f0` | text | 본문·HUD·제목 텍스트 |

**색상 견본(swatch) 요구**: `design-tokens.html`은 위 8개 색 각각에 대해 견본 블록을 두고,
견본 배경을 `background: var(--color-*)`로 채우며 토큰명·HEX 값을 라벨로 표기한다. 접근성상
색만으로 구분하지 않도록 각 견본에 토큰명 텍스트를 함께 노출한다.

---

## 3. 타이포그래피 (frozen 토큰 기반)

font-family는 vanilla-static 규약대로 **system font stack**을 자체 정의한다.
`--font-family-base` 같은 신규 토큰은 추가하지 않고, frozen 크기 토큰만 사용한다.

| 역할 | 크기 토큰 | 값 | weight | 용도 |
| --- | --- | --- | --- | --- |
| title(제목) | `--font-size-title` | `32px` | 700 | 오버레이 제목(게임 시작 / 게임 오버) |
| hud/body | `--font-size-hud` | `16px` | 400–600 | HUD stat·본문·버튼 라벨 |
| caption | (파생) | `--font-size-hud` 기준 축소 표현 | 400 | 보조 라벨(상태명·값 단위) |

- 권장 system stack(구현 시 그대로 사용):
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- line-height: 제목 1.2, 본문/HUD 1.4. 텍스트 색은 `var(--color-text)`.
- caption은 별도 크기 토큰이 없으므로 `--font-size-hud` 기반으로 표현(신규 토큰 금지).

---

## 4. 레이아웃 · 반응형 (frozen)

### 4.1 구조

```
page (background: --color-bg)
└─ app container (max-width 중앙 정렬)
   ├─ .td-hud            ← HUD 바 (surface, radius-panel, shadow-panel)
   │   ├─ .td-hud__stat  #hud-resource  (자원)
   │   ├─ .td-hud__stat  #hud-lives     (생명)
   │   ├─ .td-hud__stat  #hud-score     (점수)
   │   └─ .td-hud__stat  #hud-wave      (웨이브)
   ├─ .td-stage          ← canvas 컨테이너(비율 유지 축소)
   │   ├─ <canvas id="game-canvas">     실제 비율 자리표시자
   │   ├─ #overlay-start   .td-overlay  (start 상태에서 표시)
   │   └─ #overlay-gameover .td-overlay (gameover 상태에서 표시)
   └─ controls
       ├─ #btn-pause    .td-button
       └─ #btn-restart  .td-button
```

### 4.2 spacing · 형태 토큰

| 토큰 | 값 | 적용 |
| --- | --- | --- |
| `--space-hud-gap` | `12px` | `.td-hud` 내 stat 간 gap, control 간 간격 |
| `--radius-panel` | `8px` | `.td-hud`·`.td-overlay` 카드·`.td-button` 모서리 |
| `--shadow-panel` | `0 4px 12px rgba(0,0,0,0.4)` | `.td-hud`·`.td-overlay` 그림자 |

`design-tokens.html`은 간격·반경·그림자도 각각 견본을 두어 `gap: var(--space-hud-gap)`,
`border-radius: var(--radius-panel)`, `box-shadow: var(--shadow-panel)`을 실제로 참조해 보여준다.

### 4.3 반응형 계약 (frozen)

- **320px 이상** 뷰포트에서 content overflow가 발생하지 않는다.
- `.td-stage`는 컨테이너 폭에 맞춰 **canvas 비율(예: 16:9 또는 4:3)을 유지하며 축소**한다.
  구현 권장: `aspect-ratio` + `width: 100%; max-width` 로 비율 고정, canvas는 무대에 100% 채움.
- `.td-hud`는 좁은 화면에서 **`flex-wrap: wrap`으로 줄바꿈**되어 stat 텍스트가 잘리지 않는다.
- 목업의 canvas 자리표시자는 실제 렌더 무대 비율을 대표하도록 `.td-stage` 안에 배치하고,
  경로(`--color-path`)·타워(`--color-tower`)·적(`--color-enemy`) 예시 마커를 정적으로 그려
  플레이 무대를 시각적으로 대표한다(값 하드코딩 없이 토큰 변수 사용).

---

## 5. 화면 상태 명세 — `design-mockup.html` (frozen)

`design-mockup.html`은 **`start`·`playing`·`paused`·`gameover` 네 상태를 모두** 담는다. 하나의
self-contained HTML에서 각 상태를 `<section>`으로 구분해 나란히 보여준다(정적 시각화). 각 상태는
**화면 텍스트로 상태명을 노출**하고, `design-tokens.html`과 **같은 CSS 변수만** 사용하며 값을
하드코딩하지 않는다.

| 상태 | HUD 표시 | 오버레이/화면 텍스트 | control 상태 |
| --- | --- | --- | --- |
| `start` | 자원 100 · 생명 20 · 점수 0 · 웨이브 1 (초기값) | `#overlay-start` 표시 — 제목 **"게임 시작"** + primary 시작 버튼(`.td-button--primary`, "시작") | 시작 버튼 활성 |
| `playing` | 자원/생명/점수/웨이브 **진행 중 HUD** 값 노출 | 오버레이 숨김, canvas 무대에 경로·타워·적 마커 | `#btn-pause`="일시정지", `#btn-restart` 활성 |
| `paused` | 진행 값 유지 표시 | 화면에 **"일시정지"** 텍스트(오버레이/배지) | `#btn-pause`="재개" |
| `gameover` | 최종 값 표시 | `#overlay-gameover` 표시 — 제목 **"게임 오버"** + **최종 점수** 텍스트 + **재시작** 버튼(`#btn-restart`) | `#btn-restart`로 재시작 |

- 각 상태 section 상단에 상태명 라벨(예: "상태: playing")을 텍스트로 명시해 목업 열람자가
  구분하게 한다. **색상만으로 상태를 구분하지 않는다.**
- HUD stat은 각각 `.td-hud__stat`이며 `#hud-resource`/`#hud-lives`/`#hud-score`/`#hud-wave`
  ID를 사용한다(재정의 금지). 레이블 + 값 형태로 예: "자원 100", "생명 20", "점수 0", "웨이브 1".
- 초기화 후조건(frozen): `gameover`의 재시작 또는 `reset` 후에는 HUD가 **초기값(자원 100·생명
  20·점수 0·웨이브 1)** 으로 되돌아가고, 주 실행 control(시작/재시작 primary)이 다시 사용 가능함을
  목업에서 `start` 상태로 대표한다.
- canvas 자리표시자: 각 상태의 `.td-stage`에 실제 비율의 canvas 자리표시자를 배치한다.
  `playing`/`paused`는 무대에 경로·타워·적 예시 마커를, `start`/`gameover`는 오버레이가 무대를
  덮는 형태로 표현한다.

---

## 6. 컴포넌트 명세 (props / 상태 / 인터랙션)

frozen selector를 그대로 사용한다. 아래는 각 컴포넌트의 시각 상태·인터랙션 정의다.

### 6.1 `.td-hud` / `.td-hud__stat`
- **구성**: 4개 stat(`#hud-resource`·`#hud-lives`·`#hud-score`·`#hud-wave`), 각 stat은 라벨+값.
- **시각**: 배경 `var(--color-surface)`, 모서리 `var(--radius-panel)`, 그림자 `var(--shadow-panel)`,
  텍스트 `var(--color-text)`, 크기 `var(--font-size-hud)`, 항목 간 gap `var(--space-hud-gap)`.
- **상태 반영**: 생명이 위험 수준일 때 `#hud-lives` 강조색으로 `var(--color-danger)` 사용 가능(텍스트
  라벨 "생명"은 유지 — 색만으로 구분 금지).
- **반응형**: `flex-wrap: wrap`으로 좁은 화면에서 줄바꿈, 텍스트 미절단.

### 6.2 `.td-stage` + `#game-canvas`
- **props**: 컨테이너 폭에 맞춘 비율 유지 축소, 배경 `var(--color-bg)`, 경로 `var(--color-path)`.
- **접근성**: `#game-canvas`는 게임 상황을 설명하는 `aria-label`을 가진다
  (예: `aria-label="타워 디펜스 게임 무대. 자원 100, 생명 20, 점수 0, 웨이브 1"`).

### 6.3 `.td-overlay` (`#overlay-start` / `#overlay-gameover`)
- **props**: `.td-stage` 위에 겹쳐 무대를 덮는 카드. 배경 `var(--color-surface)`,
  모서리 `var(--radius-panel)`, 그림자 `var(--shadow-panel)`.
- **콘텐츠**: `#overlay-start` = 제목 "게임 시작" + primary 버튼. `#overlay-gameover` = 제목
  "게임 오버" + 최종 점수 + 재시작 버튼. 제목은 `var(--font-size-title)`, 700.
- **접근성**: `overlay-start`·`overlay-gameover`는 상태 변화를 `aria-live="polite"`로 알린다.

### 6.4 `.td-button` / `.td-button--primary`
- **variant**: 기본(`.td-button`)과 primary(`.td-button--primary`). primary 배경
  `var(--color-action-primary)`, 텍스트 대비 확보. 기본 버튼은 surface 계열.
- **인스턴스**: `#btn-pause`(playing="일시정지" / paused="재개"), `#btn-restart`(재시작).
- **인터랙션**: `:hover`/`:focus-visible`에서 명도 변화 + 가시적 focus ring. Tab 포커스 + Enter
  실행 가능. `:hover`는 CSS로 직접 표현, 상태별 라벨 변화는 §5 표 기준.
- **접근성**: `#btn-pause`·`#btn-restart`는 명시적 `aria-label`을 가진다
  (예: `btn-pause` → `aria-label="게임 일시정지"`, `btn-restart` → `aria-label="게임 재시작"`).

---

## 7. 접근성 요약 (frozen · 목업/토큰에 반영)

- `#game-canvas`는 게임 상황을 설명하는 `aria-label`을 가진다.
- `#btn-pause`·`#btn-restart`는 명시적 `aria-label`을 가진다.
- `#overlay-start`·`#overlay-gameover`의 상태 변화는 `aria-live="polite"`로 알린다.
- `#btn-pause`·`#btn-restart`는 Tab 포커스와 Enter 실행이 가능하다.
- 모든 상태는 **색상만이 아니라** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

---

## 8. dev 구현 가이드 (developer: BF-1750 / 두 HTML 산출물)

developer는 본 명세로 `design-tokens.html`·`design-mockup.html`을 구현한다(픽셀 일치 의무는
없으나 토큰·selector·상태·접근성·반응형 계약은 그대로 지킨다).

1. **`design-tokens.html`**
   - `<meta charset="UTF-8">` + `<title>` 필수.
   - `:root`에 §2·§4.2의 **13개 토큰을 CSS custom property로 선언**.
   - 색상 8종 견본은 `background: var(--color-*)`로, 타이포는 `font-size: var(--font-size-*)`로,
     간격/반경/그림자 견본은 각각 `var(--space-hud-gap)`/`var(--radius-panel)`/`var(--shadow-panel)`을
     **실제 참조**해 시각화(값 하드코딩 금지). 각 견본에 토큰명·값 라벨 표기.
2. **`design-mockup.html`**
   - `<meta charset="UTF-8">` + `<title>` 필수. `<style>` 인라인, `:root`에 `design-tokens.html`과
     **동일한 CSS 변수** 선언 후 그 변수만 사용(하드코딩 금지).
   - §5의 **4개 상태(start/playing/paused/gameover)** 를 각각 `<section>`으로 모두 포함하고, 각 상태의
     화면 텍스트(게임 시작 / 자원·생명·점수·웨이브 HUD / 일시정지 / 게임 오버·최종 점수·재시작) 노출.
   - frozen DOM ID·CSS class(§ 아래 색인)를 그대로 사용. canvas 영역을 **실제 비율의 자리표시자**로
     `.td-stage` 안에 배치.
   - §7 접근성(`aria-label`·`aria-live`)과 §4.3 반응형(320px overflow 금지, `.td-stage` 비율 축소,
     `.td-hud` wrap)을 반영.
3. **정적 렌더**: 두 파일은 정적 서버(`serve_root: .`)로 열었을 때 **그 자체로 렌더링**된다
   (외부 의존성 0건, 인라인 `<style>`).

### selector 색인 (frozen · 재정의 금지)

- **DOM IDs**: `game-canvas`, `hud-resource`, `hud-lives`, `hud-score`, `hud-wave`,
  `btn-pause`, `btn-restart`, `overlay-start`, `overlay-gameover`
- **CSS classes**: `td-stage`, `td-hud`, `td-hud__stat`, `td-overlay`, `td-button`,
  `td-button--primary`

---

## 9. Self-critique (designer)

1. **AC 매핑** — §2/§8=토큰 :root 선언·견본 참조, §5=4개 상태·화면 텍스트, §5/§8=동일 CSS 변수·
   canvas 자리표시자, §8-3=정적 렌더, 문서 전체=시각 명세 범위(런타임 HTML/CSS/JS 미생성). 5개 AC 대응.
2. **dev 구현 가이드** — §8에 두 HTML의 파일별 단계·선언 위치·참조 방식 명시.
3. **기존 요소 보존** — planner frozen token/selector/상태를 재정의·추가 없이 그대로 인용(additive).
4. **컴포넌트 매핑** — §6에서 frozen selector별 props/상태/인터랙션/접근성 정의.
5. **모호함 flag** — canvas 비율은 계약에 고정값이 없어 "비율 유지"만 요구, 구체 비율(16:9/4:3)은
   developer 재량으로 명시. HUD 위험 강조색은 선택 사항으로 표기.
