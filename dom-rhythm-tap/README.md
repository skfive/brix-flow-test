# Beat Tap — 디자이너 시각 명세 (BF-1756)

> 본 문서는 designer(BF-1756)가 작성한 **시각 명세(visual specification)**입니다.
> planner가 동결한 `ui-contract@v1`(`docs/plans/BF-1739/implementation-plan.md`)의 selector·상태·디자인 토큰·접근성·반응형 계약을 **재정의하지 않고 그대로 렌더링**하며, developer(BF-1757)가 `design-tokens.html`·`design-mockup.html`·`index.html`를 구현할 때 따를 **시각 방향·상태별 와이어프레임·구현 가이드**를 제공합니다.
>
> - 본 task의 소유 파일은 `dom-rhythm-tap/README.md` **하나**입니다. HTML/CSS/JS 런타임 산출물은 생성하지 않습니다(developer 소유).
> - frozen 계약의 selector/token/상태/접근성/반응형 값을 **변경·재정의하지 않습니다**. 아래에 등장하는 모든 토큰·selector 값은 frozen 계약의 exact 값입니다.
> - 모든 파일 정책은 `additive`입니다.

---

## 1. 시안 개요 · UX 목표

Beat Tap은 4개 레인(D·F·J·K)으로 낙하하는 노트를 판정선에 맞춰 눌러 점수를 얻는 **순수 DOM 리듬 게임**입니다. 시각 아이덴티티는 **딥 인디고 밤하늘 위의 네온 아케이드**입니다: 짙은 배경(`--color-bg #0f1020`)에서 시안 노트(`--color-note #38bdf8`)가 발광하며 낙하하고, 판정 순간 초록/노랑/빨강 네온으로 피드백합니다.

**사용자 경험 목표**

- **한눈에 읽히는 낙하 축** — 4개 레인이 세로로 곧게 정렬되고 판정선이 화면 하단 고정 기준선으로 항상 같은 위치에 보인다. 리듬 게임의 핵심은 "언제 누르는가"이므로 판정선은 흔들리지 않는다.
- **즉각적 판정 피드백** — 노트를 누른 순간 Perfect/Good/Miss가 색 + 텍스트로 동시에 나타나 색각 이상 사용자도 등급을 읽는다.
- **상태를 텍스트로 말한다** — start/playing/paused/gameover 4개 상태는 색만이 아니라 화면 텍스트 라벨과 접근성 이름으로 노출한다.
- **손 없이도 조작 가능** — D·F·J·K 키가 1급 입력이며 각 레인은 키 라벨을 화면에 크게 표시한다.

**변경 범위**: 신규 게임. 기존 UI 요소 보존 대상 없음(dom-rhythm-tap 신규 모듈). 본 문서는 시각 명세만 정의하고 구현은 developer가 수행한다.

---

## 2. 컬러 팔레트 (frozen — exact 값)

아래 값은 frozen 계약 §3.5의 exact 토큰입니다. **디자이너가 색을 새로 만들지 않습니다.** developer는 `design-tokens.html`의 `:root`에 아래 CSS custom property를 그대로 선언하고, 모든 색 견본이 이 변수를 실제로 참조하도록 합니다(하드코딩 금지).

| 토큰 | 값 | 역할 (시각 의미) |
|---|---|---|
| `--color-bg` | `#0f1020` | 무대 배경 — 딥 인디고 밤하늘. 전체 캔버스·화면 바탕 |
| `--color-lane` | `#1b1d3a` | 레인 트랙 — 배경보다 한 톤 밝은 세로 통로 4개 |
| `--color-note` | `#38bdf8` | 낙하 노트 — 발광하는 시안 블록(주역) |
| `--color-judge-perfect` | `#22c55e` | Perfect 판정 — 네온 그린 |
| `--color-judge-good` | `#eab308` | Good 판정 — 앰버 |
| `--color-judge-miss` | `#ef4444` | Miss 판정 — 레드 |
| `--color-text-primary` | `#f8fafc` | 본문·HUD·라벨 텍스트 — 오프화이트 |
| `--space-lane-gap` | `8px` | 레인 사이 간격 |
| `--radius-note` | `6px` | 노트·버튼 모서리 반경 |
| `--shadow-note` | `0 2px 6px rgba(0,0,0,0.4)` | 노트 그림자(입체감) |
| `--font-size-hud` | `20px` | HUD 수치(점수/콤보/정확도) 글자 크기 |

**색 사용 규칙**

- 판정 3색(perfect/good/miss)은 **오직 판정 표현에만** 쓴다. 버튼·상태 라벨의 주 색으로 전용(轉用)하지 않는다.
- 판정선(`judgment-line`)은 `--color-note`의 얇은 발광 라인으로 그려 "여기서 눌러라"를 암시한다.
- 대비: `--color-text-primary(#f8fafc)` on `--color-bg(#0f1020)`는 명도 대비 약 17:1로 WCAG AAA를 만족한다. 판정 텍스트도 이 오프화이트로 쓰고 색은 배지/글로우로 보조한다(색각 이상 대응).

### 견본(swatch) 구현 지침 — `design-tokens.html`

- 색 토큰마다 `background: var(--color-*)` 견본 박스 + 토큰명 + HEX 값 + 역할 라벨을 나란히 표시한다.
- 간격 토큰(`--space-lane-gap`)은 `var(--space-lane-gap)` 폭의 막대로, 반경(`--radius-note`)은 `border-radius: var(--radius-note)` 박스로, 그림자(`--shadow-note`)는 `box-shadow: var(--shadow-note)` 박스로 **변수를 실제 참조하여** 시각화한다.
- 타이포 견본은 §3의 스케일을 `--font-size-hud` 등 변수로 표시한다.

---

## 3. 타이포그래피

vanilla-static 스택 규약에 따라 **외부 폰트 의존성 0건**, system font stack을 사용합니다.

```
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

| 역할 | 크기 | weight | line-height | 비고 |
|---|---|---|---|---|
| HUD 수치 (score/combo/accuracy) | `var(--font-size-hud)` = **20px (frozen)** | 700 | 1.2 | frozen 토큰 사용 |
| 화면 상태 타이틀 (start/paused/gameover) | 28px | 700 | 1.25 | 시각 가이드(비frozen) |
| 판정 피드백 텍스트 (PERFECT/GOOD/MISS) | 24px | 800 | 1.1 | 대문자, 자간 넓게 |
| 레인 키 라벨 (D·F·J·K) | 22px | 700 | 1 | 각 레인 하단 고정 |
| 본문·버튼 라벨 | 16px | 600 | 1.4 | 시각 가이드(비frozen) |
| caption·부가 설명 | 13px | 400 | 1.4 | 시각 가이드(비frozen) |

> **주의**: frozen 토큰은 `--font-size-hud`(20px) **하나**입니다. 위 표의 다른 크기는 디자이너 시각 가이드이며 새 frozen 토큰이 아닙니다. developer는 HUD 수치에 반드시 `var(--font-size-hud)`를 참조하고, 나머지는 위 스케일을 참고해 구현합니다.

- 숫자(점수/콤보/정확도)는 `font-variant-numeric: tabular-nums`로 자릿수 흔들림을 막는다.
- 상태 타이틀·판정 텍스트는 대문자 + `letter-spacing: 0.08em`으로 아케이드 인상을 준다.

---

## 4. 레이아웃

### 4.1 전체 구조

세로 방향 낙하 무대. 상단 HUD 바 → 중앙 게임 보드(4레인 + 판정선) → 화면 상태 오버레이. 판정선은 보드 하단 근처에 **고정**된다.

```
┌──────────────── #game-root (.game) ────────────────┐
│  ┌───────────────── HUD (.hud) ─────────────────┐  │
│  │ SCORE 01200   COMBO ×12   ACC 98%            │  │  ← #hud-score / #hud-combo(.combo-counter) / #hud-accuracy
│  └──────────────────────────────────────────────┘  │     각 수치 span.hud__value
│  ┌──────── #lane-container (4 × .game__lane) ────┐  │
│  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐               │  │
│  │  │    │  │ ▓▓ │  │    │  │    │  ← .game__note │  │  ▓▓ = 낙하 중 노트(.game__note)
│  │  │ ▓▓ │  │    │  │    │  │ ▓▓ │               │  │
│  │  │    │  │    │  │ ▓▓ │  │    │               │  │
│  │ ─┼────┼──┼────┼──┼────┼──┼────┼─ #judgment-line│  │  ← 판정선(고정), 네온 시안 가로 라인
│  │  │ D  │  │ F  │  │ J  │  │ K  │  ← 키 라벨 텍스트│  │
│  │  └────┘  └────┘  └────┘  └────┘               │  │
│  └───────────────────────────────────────────────┘  │
│        #judgment-feedback (aria-live) ↑ 판정 순간 표시 │
│  ┌──────── 상태 오버레이(.screen) ───────────────┐  │
│  │  start / paused / gameover 시 중앙 카드 표시   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- **HUD 바**: 상단 고정. 좌→우로 score / combo / accuracy. 각 수치는 `.hud__value`, 콤보는 `.combo-counter`(aria-live).
- **레인 컨테이너(`#lane-container`)**: 4개 `.game__lane`을 가로로 균등 배치, 레인 사이 간격은 `var(--space-lane-gap)`(8px). 각 레인 배경은 `--color-lane`.
- **판정선(`#judgment-line`)**: 레인을 가로지르는 얇은 발광 라인. 화면 크기가 바뀌어도 **레인 하단 대비 같은 상대 위치를 유지**한다(반응형 §8).
- **키 라벨**: 각 레인 하단에 D·F·J·K 텍스트 고정 표시(접근성 §7).
- **판정 피드백(`#judgment-feedback`)**: 판정선 부근 중앙에 순간 표시(PERFECT/GOOD/MISS), `aria-live="polite"`.
- **상태 오버레이(`.screen`)**: start/paused/gameover는 보드 위 중앙 카드로 덮는다. playing은 오버레이 없이 보드만 보인다.

### 4.2 간격·정렬

- 보드는 가용 폭에서 중앙 정렬, 최대 폭 480px 권장(모바일 세로 화면 기준의 아케이드 비율).
- 레인 폭 = `(보드폭 − 3 × var(--space-lane-gap)) / 4`.
- 노트 모서리 `var(--radius-note)`(6px), 그림자 `var(--shadow-note)`.

### 4.3 브레이크포인트

| 뷰포트 | 동작 |
|---|---|
| ≥ 480px | 보드 최대 폭 480px, 중앙 정렬 |
| 320px ~ 480px | 보드가 뷰포트 폭에 맞춰 **유동 축소**. 4레인·HUD 가로 overflow 없음 |
| < 320px | 대상 외(계약 하한 320px) |

---

## 5. 화면 상태별 시각 명세 (4개 — start / playing / paused / gameover)

frozen 상태 4개를 모두 그립니다. developer는 `design-mockup.html`에 4개 상태를 **모두** 포함하고(정적으로 나란히 `<section>` 분리 가능), `design-tokens.html`과 **같은 CSS 변수**를 참조하며 값을 하드코딩하지 않습니다. 각 상태는 색 외에 **화면 텍스트 라벨**과 접근성 이름을 포함합니다.

### 5.1 `start` — `.screen.screen--start` / `#start-screen`

```
┌───────────────────────────┐
│                           │
│        BEAT TAP           │  ← 타이틀
│   4레인 리듬 · D F J K      │  ← 안내 캡션
│                           │
│      ┌───────────────┐    │
│      │  게임 시작       │    │  ← #start-button (aria-label="게임 시작")
│      └───────────────┘    │
│                           │
│   상태: 시작 대기          │  ← 상태 텍스트 라벨(색 외 노출)
└───────────────────────────┘
```

- 중앙 카드, 배경 `--color-bg`, 텍스트 `--color-text-primary`.
- 주 실행 control은 `#start-button`. 버튼 배경은 `--color-note`, 라벨은 진한 텍스트로 대비 확보, 모서리 `var(--radius-note)`.
- 상태 라벨 텍스트 "시작 대기"를 명시.

### 5.2 `playing` — HUD 활성 (오버레이 없음)

```
┌───────────────────────────┐
│ SCORE 01200  COMBO ×12  ACC 98% │  ← HUD 활성
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐      │
│  │  │ │▓▓│ │  │ │  │      │  ← 낙하 노트
│  │▓▓│ │  │ │  │ │▓▓│      │
│ ─┼──┼─┼──┼─┼──┼─┼──┼─ 판정선 │
│  │D │ │F │ │J │ │K │      │
│  └──┘ └──┘ └──┘ └──┘      │
│         PERFECT           │  ← #judgment-feedback (aria-live)
│   상태: 진행 중            │  ← 상태 텍스트 라벨
└───────────────────────────┘
```

- HUD 3수치 실시간 갱신, `--font-size-hud`(20px).
- 노트 상태별 class 매핑: 판정 순간 `.game__note`에 `note--perfect`/`note--good`/`note--miss`를 부여해 글로우 색을 바꾼다(각각 perfect/good/miss 토큰).
- `#judgment-feedback`은 판정 직후 등급 텍스트를 표시하고 잠시 후 비운다. 색은 판정 토큰, 텍스트는 오프화이트로 가독 유지.
- 하단 `#pause-button`(aria-label="일시정지") 노출.

### 5.3 `paused` — `.screen.screen--pause` / `#pause-screen`

```
┌───────────────────────────┐
│  (뒤 보드 어둡게 딤 처리)    │
│      ┌───────────────┐    │
│      │   일시정지       │    │  ← 상태 타이틀
│      │                │    │
│      │  ┌──────────┐  │    │
│      │  │  계속하기   │  │    │  ← #resume-button (aria-label="계속하기")
│      │  └──────────┘  │    │
│      └───────────────┘    │
│   상태: 일시정지           │  ← 상태 텍스트 라벨
└───────────────────────────┘
```

- 보드 위 반투명 딤(`rgba(0,0,0,0.4)` 계열) + 중앙 카드.
- 주 재개 control은 `#resume-button` → `playing` 복귀.
- 상태 텍스트 "일시정지"를 카드 타이틀과 상태 라벨 양쪽에 노출.

### 5.4 `gameover` — `.screen.screen--gameover` / `#result-panel`

```
┌───────────────────────────┐
│      ┌───────────────┐    │
│      │   결과          │    │  ← 상태 타이틀
│      │  점수 01200     │    │  ← 최종 score
│      │  최대 콤보 ×24   │    │
│      │  정확도 98%      │    │  ← 최종 accuracy
│      │  ┌──────────┐  │    │
│      │  │  다시 하기  │  │    │  ← #result-restart-button (aria-label="다시 하기")
│      │  └──────────┘  │    │
│      └───────────────┘    │
│   상태: 종료              │  ← 상태 텍스트 라벨
└───────────────────────────┘
```

- 최종 점수·정확도 요약 카드.
- `#result-restart-button` → `start`로 복귀하며 **진행 표시·상태를 초기값으로 리셋**하고 `#start-button`을 다시 사용할 수 있게 한다(frozen 불변식).

---

## 6. 컴포넌트 명세 (selector ↔ 시각 · 상태 · 인터랙션)

frozen 계약 §3.2/§3.3의 exact selector를 그대로 매핑합니다. **새 selector를 만들지 않습니다.**

| 컴포넌트 | selector (exact) | 시각 | 상태/인터랙션 |
|---|---|---|---|
| 루트 무대 | `#game-root` `.game` | 배경 `--color-bg` 전체 무대 | 4개 화면 상태의 컨테이너 |
| 시작 화면 | `#start-screen` `.screen.screen--start` | 중앙 카드 | `start`에서만 표시 |
| 시작 버튼 | `#start-button` | `--color-note` 배경, 반경 `var(--radius-note)` | click/Enter → `playing`. aria-label="게임 시작". `:hover` 밝기↑, `:focus-visible` 외곽선 |
| 레인 컨테이너 | `#lane-container` | 4 × `.game__lane` 균등 배치 | 낙하 노트 렌더 영역 |
| 레인 | `.game__lane` | 배경 `--color-lane`, 간격 `var(--space-lane-gap)` | 하단 키 라벨(D/F/J/K) 텍스트 |
| 노트 | `.game__note` (+ `note--perfect`/`note--good`/`note--miss`) | `--color-note` 블록, 반경 `var(--radius-note)`, 그림자 `var(--shadow-note)` | 판정 시 등급 modifier class 부여 → 글로우 색 변경 |
| 판정선 | `#judgment-line` | `--color-note` 발광 가로 라인 | 위치 고정(반응형에도 유지) |
| HUD 바 | `.hud` | 상단 바, 텍스트 `--color-text-primary` | 3수치 컨테이너 |
| 점수 값 | `#hud-score` `.hud__value` | `--font-size-hud`, tabular-nums | 실시간 갱신 |
| 콤보 값 | `#hud-combo` `.hud__value.combo-counter` | `--font-size-hud` | `aria-live="polite"`. 콤보 변화 안내 |
| 정확도 값 | `#hud-accuracy` `.hud__value` | `--font-size-hud`, `%` 표기 | 실시간 갱신 |
| 판정 피드백 | `#judgment-feedback` | 판정 텍스트(PERFECT/GOOD/MISS) | `aria-live="polite"`. 판정 직후 표시 후 비움 |
| 일시정지 버튼 | `#pause-button` | 보조 버튼 | click → `paused`. aria-label="일시정지" |
| 일시정지 화면 | `#pause-screen` `.screen.screen--pause` | 딤 + 중앙 카드 | `paused`에서만 표시 |
| 계속 버튼 | `#resume-button` | 주 버튼 | click → `playing`. aria-label="계속하기" |
| 결과 패널 | `#result-panel` `.screen.screen--gameover` | 중앙 결과 카드 | `gameover`에서만 표시 |
| 다시하기 버튼 | `#result-restart-button` | 주 버튼 | click → `start`(초기값 리셋). aria-label="다시 하기" |

**인터랙션 공통(정적 표현 지침)**: `design-mockup.html`은 정적 파일이므로 `:hover`/`:focus-visible` CSS를 직접 걸어 상호작용 상태를 표현하거나, 별도 "상태 갤러리" 섹션에 hover/focus 예시를 나란히 그려둔다. 실제 상태 전이 로직은 developer의 `main.js` 소관.

---

## 7. 접근성 시각 명세 (frozen §3.6 준수)

- **명시적 aria-label**: `#start-button`("게임 시작"), `#pause-button`("일시정지"), `#resume-button`("계속하기"), `#result-restart-button`("다시 하기").
- **레인 키 라벨**: D·F·J·K를 각 `.game__lane` 하단에 **화면 텍스트로** 크게 표시(22px/700). 키 입력과 화면 라벨이 1:1 대응.
- **aria-live**: `#judgment-feedback`와 `#hud-combo`(`.combo-counter`)에 `aria-live="polite"`. 판정/콤보 변화를 스크린리더가 읽는다.
- **상태 텍스트 라벨**: start/playing/paused/gameover 각 상태는 색 외에 "시작 대기/진행 중/일시정지/종료" 텍스트 라벨을 노출(§5).
- **색 비의존**: 판정은 색(글로우)뿐 아니라 텍스트(PERFECT/GOOD/MISS)로도 전달. 상태 구분도 텍스트 라벨 병기.
- **포커스 가시성**: 모든 버튼에 `:focus-visible` 외곽선(예: `outline: 2px solid var(--color-note)`)으로 키보드 포커스를 명확히.
- **명도 대비**: 텍스트 `--color-text-primary` on `--color-bg` ≈ 17:1 (AAA). 버튼 라벨은 배경과 4.5:1 이상 확보.

---

## 8. 반응형 시각 명세 (frozen §3.7 준수)

- **320px 이상 가로 overflow 0**: 4개 레인 + HUD가 320px 폭에서 가로 스크롤 없이 들어간다. 보드 폭은 `min(100vw − 여백, 480px)`, 레인 폭은 `(보드폭 − 3×var(--space-lane-gap))/4`로 계산해 유동 축소.
- **레인/노트 축소, 판정선 위치 유지**: 뷰포트가 좁아지면 레인 폭과 노트 크기는 비례 축소되지만, **판정선(`#judgment-line`)의 레인 하단 대비 상대 위치는 유지**된다(리듬 기준선 불변).
- HUD 3수치는 좁은 폭에서 줄바꿈 대신 축약 표기(예: `ACC 98%`)로 한 줄 유지. 필요 시 `flex-wrap` 없이 `gap` 축소로 대응.
- 터치 타깃: 버튼·레인 탭 영역은 최소 44×44px 확보.

---

## 9. dev 구현 가이드 (design-tokens.html · design-mockup.html)

> 아래 두 파일은 **developer 소유** 산출물입니다. 본 문서는 그 시각 방향과 계약 준수 항목을 정의합니다. developer는 이 명세를 따르되 픽셀 단위 일치 의무는 없습니다.

### 9.1 `dom-rhythm-tap/design/design-tokens.html`

1. `:root`에 §2의 CSS custom property **11개를 exact 값으로 선언**한다.
2. 각 색 토큰을 견본 박스로 시각화하되 **반드시 `var(--color-*)`를 참조**한다(하드코딩된 HEX를 견본 배경에 직접 쓰지 않는다 — 견본이 변수를 실제 참조해야 한다).
3. 간격/반경/그림자/타이포 토큰도 각각 `var(--space-lane-gap)`·`var(--radius-note)`·`var(--shadow-note)`·`var(--font-size-hud)`를 참조하는 견본으로 시각화한다.
4. 단일 self-contained HTML(인라인 `<style>`), 외부 의존성 0건, system font. `<meta charset="UTF-8">` + `<title>` 필수.
5. 정적 서버로 열면 그 자체로 렌더링되어야 한다.

### 9.2 `dom-rhythm-tap/design/design-mockup.html`

1. `start`·`playing`(HUD)·`paused`·`gameover` **4개 상태를 모두 포함**한다(정적 `<section>`으로 나란히 배치 가능).
2. `design-tokens.html`과 **동일한 CSS 변수**를 `:root`에 선언/참조하고 값을 하드코딩하지 않는다.
3. §3.2/§3.3의 exact `id`/class를 시맨틱 마크업(`<button>` 등)으로 사용한다. selector를 새로 만들지 않는다.
4. **게임 캔버스(레인 영역)는 실제 비율·배치의 자리표시자**로 둔다(placeholder 노트 몇 개 배치). placeholder 콘텐츠(샘플 점수/텍스트) 허용 — UX 의도 전달이 핵심.
5. 접근성(§7): aria-label·aria-live·키 라벨 텍스트·상태 텍스트 라벨을 마크업에 반영.
6. 반응형(§8): 320px에서 overflow 없이, 판정선 위치 유지.
7. 단일 self-contained HTML, 외부 의존성 0건, system font, `<meta charset="UTF-8">` + `<title>` 필수. 정적 서버로 열면 그 자체로 렌더링.

### 9.3 준수 체크리스트 (developer용)

- [ ] `:root`에 frozen 토큰 11개 exact 값 선언
- [ ] 모든 견본/컴포넌트가 `var(--*)`를 참조(하드코딩 색 금지)
- [ ] 4개 상태 모두 구현 + 각 상태 텍스트 라벨 노출
- [ ] exact id/class만 사용(재정의·신규 selector 금지)
- [ ] aria-label 4버튼 / aria-live 2요소 / D·F·J·K 화면 라벨
- [ ] 320px 가로 overflow 0, 판정선 위치 유지
- [ ] 두 HTML 모두 self-contained·외부 의존성 0·정적 렌더 가능

---

## 10. Self-critique

frozen 계약 대비 본 시각 명세의 자기 점검:

1. **AC 매핑** — `design-tokens.html`(`:root` 토큰·견본 참조), `design-mockup.html`(4개 상태·변수 공유·비하드코딩), 캔버스 자리표시자·정적 렌더, frozen 계약 비재정의, README.md 범위(런타임 코드 미생성) — 5개 acceptance criteria 모두 §2·§5·§9에 반영. ✅
2. **dev 구현 가이드** — §9에 파일별 단계 지침 + CSS 변수명·selector·체크리스트 제공. developer가 그대로 따라 구현 가능. ✅
3. **기존 요소 보존** — dom-rhythm-tap 신규 모듈로 보존 대상 없음. 명시함. ✅
4. **컴포넌트 매핑** — §6에서 frozen 14개 DOM id + 13개 class를 시각·상태·인터랙션에 1:1 매핑. 누락 없음. ✅
5. **모호함 flag** — frozen 토큰은 `--font-size-hud`(20px) 하나뿐이라, heading/body 등 비frozen 크기는 §3에서 "시각 가이드(비frozen), 새 토큰 아님"으로 명시하여 developer가 새 토큰으로 오인하지 않게 flag함. 판정 피드백 지속 시간 등 타이밍 값은 frozen 계약(§5 fallDuration 등, developer의 engine/main 소관)에 위임. ⚠️→해소.

**미해소 모호함 없음.** developer는 §9 체크리스트로 계약 준수를 검증하며 진행하면 됩니다.

---

## 11. 참조

- planner frozen 계약: `docs/plans/BF-1739/implementation-plan.md` (`ui-contract@v1`, `planning-contract@v1`)
- developer 산출물(본 명세 대상): `dom-rhythm-tap/design/design-tokens.html`, `dom-rhythm-tap/design/design-mockup.html`, `dom-rhythm-tap/index.html`, `dom-rhythm-tap/src/*`, `dom-rhythm-tap/tests/*`
