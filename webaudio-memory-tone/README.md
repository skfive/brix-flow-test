# Tone Recall — 시각 명세 (Visual Specification)

> 본 문서는 designer(이디자인 / BF-1741)가 작성한 **시각 명세**입니다.
> planner(박기획)가 동결한 UI 계약(`docs/plans/BF-1740/implementation-plan.md`)의
> selector·상태·token·접근성·반응형 규칙을 **재정의하지 않고 그대로** 시각적으로
> 풀어 씁니다. 이 문서는 런타임 HTML/CSS/JS 를 생성하지 않으며, developer(BF-1742)가
> `design-tokens.html`·`design-mockup.html` 및 실제 앱을 구현할 때 따라올
> **시각 참조 가이드**입니다.
>
> 파일 소유권·selector·token 의 유일한 권위는 frozen Execution Blueprint 입니다.
> 본 명세와 frozen 계약이 충돌하면 **frozen 계약을 따릅니다.**

---

## 1. 시안 개요

Tone Recall 은 Web Audio 기반 색-톤 기억력 게임(Simon 계열)입니다. 어두운
배경 위에 채도 높은 4색 pad 를 2×2 로 배치해, 시퀀스가 빛(`pad--active`)과
소리로 재생될 때 시선이 각 pad 로 자연스럽게 이동하도록 합니다.

- **사용자 경험 목표**
  - 어두운 무채색 배경으로 컬러 pad 의 점멸을 또렷하게 대비시킨다.
  - 상태(재생 중/입력 대기/일시정지/게임 오버)를 **색뿐 아니라 텍스트**로도
    항상 노출해, 색각 이상 사용자·스크린리더 사용자가 동일하게 인지한다.
  - board 는 어떤 뷰포트(≥320px)에서도 정사각 2×2 비율을 유지해 "누를 곳"이
    직관적으로 보인다.
- **변경 범위**: 본 task 는 시각 명세(`README.md`)만 산출한다. HTML/CSS/JS 는
  developer 가 이 명세와 frozen 계약을 근거로 구현한다.

---

## 2. 컬러 팔레트

모든 색은 frozen design token 을 **그대로** 사용합니다. designer 는 새 색을
추가하거나 HEX 를 변경하지 않습니다. `design-tokens.html`·`design-mockup.html`
및 앱 CSS 는 아래 값을 하드코딩하지 말고 **CSS custom property 로 참조**해야
합니다.

| 역할 | token | HEX | 용도 |
| --- | --- | --- | --- |
| Pad — Green | `--color-pad-green` | `#22c55e` | 좌상단 pad, 톤 재생 시 점등 |
| Pad — Red | `--color-pad-red` | `#ef4444` | 우상단 pad |
| Pad — Yellow | `--color-pad-yellow` | `#eab308` | 좌하단 pad |
| Pad — Blue | `--color-pad-blue` | `#3b82f6` | 우하단 pad |
| Background | `--color-bg` | `#0f172a` | 페이지·board 뒤 무채색 배경 |
| Text | `--color-text` | `#f8fafc` | 라운드 표시·상태 텍스트·버튼 라벨 |

- **팔레트 의도**: 배경 `#0f172a`(slate-900) 은 4색 pad 를 모두 높은 명도
  대비로 받쳐 준다. 텍스트 `#f8fafc`(near-white) 는 배경 위 본문·HUD 에 사용.
- **상태 표현 색은 별도 추가 금지**: 재생/입력/게임오버 등의 상태 강조는
  기존 pad 색의 밝기 변화(`pad--active`)와 **텍스트**로만 표현하며, 새로운
  강조색 token 을 도입하지 않는다(색상 단독 의존 금지 — §6 참조).

---

## 3. 타이포그래피

frozen token 은 폰트 크기 중 `--font-size-round` 하나만 고정합니다. 나머지
크기는 아래 권장 스케일을 따르되, **frozen token 을 재정의하지 않습니다.**
관측 스택이 `vanilla-static` 이므로 외부 웹폰트 의존 없이 **system font stack**
을 사용합니다.

- **font-family (권장, 앱·mockup 공통)**
  `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

| 역할 | 크기 | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 라운드 표시(`round-indicator`) | `var(--font-size-round)` = `24px` | 700 | 1.2 | **frozen token 사용 (하드코딩 금지)** |
| 게임 제목(h1) | `28–32px` | 700 | 1.2 | 시작 화면 헤더 |
| 상태 메시지(`status-message`) | `16px` | 500 | 1.4 | `aria-live=polite` 텍스트 |
| 버튼 라벨(`start-button`) | `16px` | 600 | 1 | |
| 게임 오버 패널 제목 | `20px` | 700 | 1.3 | `game-over-panel` 내부 |
| 캡션·보조 안내 | `13px` | 400 | 1.4 | pad 라벨 보조 등 |

- 라운드 표시는 반드시 `--font-size-round` 변수를 참조한다. `24px` 를 직접
  쓰지 않는다.
- 숫자(라운드)는 `font-variant-numeric: tabular-nums` 권장(자릿수 변화 시 흔들림 방지).

---

## 4. 레이아웃

### 4.1 전체 구조

세로 중앙 정렬된 단일 컬럼. 위에서 아래로 HUD → board → 컨트롤 순으로 쌓입니다.

```
┌──────────────────────────────────────┐  ← 페이지 배경 var(--color-bg)
│                                      │
│            Tone Recall  (h1)         │
│                                      │
│  ┌───────── .hud ─────────────────┐   │
│  │  Round: 3   |  #round-indicator │   │  ← --font-size-round
│  │  준비 완료 · 순서를 입력하세요   │   │  ← #status-message (aria-live)
│  └──────────────────────────────┘   │
│                                      │
│         ┌──────────────────┐         │
│         │  #board (.board)  │         │  ← 정사각 2×2, 캔버스 자리표시자
│         │  ┌──────┐┌──────┐ │         │
│         │  │green ││ red  │ │         │
│         │  └──────┘└──────┘ │         │
│         │  ┌──────┐┌──────┐ │         │
│         │  │yellow││ blue │ │         │
│         │  └──────┘└──────┘ │         │
│         └──────────────────┘         │
│                                      │
│           [  게임 시작  ]             │  ← #start-button
│                                      │
└──────────────────────────────────────┘
```

### 4.2 board 기하 (frozen 반응형 계약 반영)

- `#board`(`.board`)는 **2×2 정사각 그리드**. `aspect-ratio: 1 / 1` 로 항상
  정사각 비율을 유지한다(AC-7).
- pad 간 간격은 **`--space-pad-gap` = `16px`** 를 그대로 사용(하드코딩 금지).
- 각 pad 모서리 반경은 **`--radius-pad` = `12px`** 를 사용.
- board 폭은 뷰포트에 맞춰 축소되며, **320px 뷰포트에서도 overflow 하지 않는다**
  (AC-7). 권장: `width: min(90vw, 360px)` 형태의 반응형 상한 + `aspect-ratio: 1`.
- pad 배치 순서(그리드): 좌상단 green → 우상단 red → 좌하단 yellow → 우하단 blue.

### 4.3 캔버스/board 자리표시자 (mockup 요구)

`design-mockup.html` 은 실제 렌더링 캔버스가 없더라도 **board 영역을 실제 비율의
자리표시자**로 배치해야 한다. 즉 2×2 정사각 그리드 안에 4개의 pad 사각형을
`--space-pad-gap` 간격, `--radius-pad` 반경으로 그려 실제 게임 board 비율을
시각적으로 시뮬레이션한다(placeholder 콘텐츠·색상 견본 허용).

### 4.4 spacing (권장 스케일)

| 항목 | 값 |
| --- | --- |
| 섹션 세로 간격(HUD↔board↔버튼) | `24px` |
| pad 간 간격 | `var(--space-pad-gap)` = `16px` (frozen) |
| HUD 내부 행 간격 | `8px` |
| 버튼 내부 padding | `12px 24px` |
| 페이지 좌우 안전 여백 | `16px` (320px 대응) |

### 4.5 breakpoint

- **≥320px (필수)**: board overflow 금지, 2×2 정사각 유지. 단일 컬럼.
- **≥600px (권장)**: board 폭 상한을 넉넉히(≈360px) 두어 pad 를 크게 표시.
- multi-route 없음(단일 화면 게임). mockup 은 상태별 `<section>` 으로 구분.

---

## 5. 컴포넌트 명세

selector 는 frozen 계약을 그대로 사용합니다. 아래 표의 상태/인터랙션은 시각
표현 지침이며 selector·token 을 재정의하지 않습니다.

### 5.1 Pad (`.pad`, `#pad-green|red|yellow|blue`)

- **역할**: 색-톤 입력 버튼. `<button>` 시맨틱 마크업.
- **기본 상태**: 해당 pad 색 token 을 배경으로, 평상시 약간 낮은 밝기
  (예: `filter: brightness(0.85)` 권장)로 "대기" 느낌.
- **`pad--active`**: 시퀀스 재생 또는 입력 눌림 시 **밝게 점등**
  (예: `filter: brightness(1.15)` + 옅은 outline glow). 색상 변화가 아니라
  **밝기 변화**로 표현하여 색각 이상 사용자도 점멸을 인지 가능.
- **접근성**: 각 pad 는 색 이름을 담은 `aria-label`(예: `aria-label="초록 pad"`).
- **인터랙션**: `:hover` 시 커서 pointer, 옅은 밝기 상승. `:focus-visible` 시
  텍스트 색(`--color-text`) 2px outline. `playback` 상태에서는 클릭 no-op.
- **props/상태 요약**

  | 상태 class/조건 | 시각 |
  | --- | --- |
  | 기본 | pad 색, brightness 0.85 |
  | `.pad--active` | pad 색, brightness 1.15 + glow |
  | `:hover` (input 시) | brightness 0.95, pointer |
  | `:focus-visible` | 2px outline (`--color-text`) |
  | disabled(재생 중) | 입력 무시, 커서 default |

### 5.2 board (`#board`, `.board`)

- 2×2 grid 컨테이너. §4.2 기하 규칙 준수. 4개 pad 를 자식으로 포함.

### 5.3 round-indicator (`#round-indicator`)

- 현재 라운드 숫자 표시. `--font-size-round`(24px), weight 700, tabular-nums.
- 예: "Round 3" / "라운드 3". 초기(idle)에는 "라운드 –" 또는 "라운드 1 준비".

### 5.4 status-message (`#status-message`, `.status`)

- 진행 안내 텍스트. **`aria-live="polite"`** 필수. 상태별 문구로 현재 국면을
  텍스트로 노출(§6 상태 매핑 참조).

### 5.5 start-button (`#start-button`)

- 주 실행 control. `<button>`, 명시적 `aria-label`(예: `aria-label="게임 시작"`).
- 키보드 포커스(Tab) 및 Enter 활성화 지원. background 는 pad 색이 아닌 중립 강조
  (예: `--color-text` 배경 + `--color-bg` 텍스트, 또는 반대) 로 pad 와 구분.
- `gameover` 이후 라벨은 "다시 시작"으로 바뀔 수 있으나 동일 selector 유지.

### 5.6 game-over-panel (`#game-over-panel`, `.overlay`)

- 게임 오버 시 board 위에 덮이는 overlay. `--color-bg` 반투명 배경 위
  `--color-text` 문구. 제목 "게임 오버" + 도달 라운드 + 재시작 안내.
- idle/playback/input 상태에서는 숨김(`hidden`/`display:none`).

---

## 6. 상태별 시각 + 텍스트 매핑 (색상 단독 의존 금지)

frozen states: `idle`, `playback`, `input`, `paused`, `gameover`.
모든 상태는 **화면 텍스트와 접근성 이름**으로 구분되어야 하며 색만으로 구분하지
않는다(AC-6).

| 상태 | board/pad 시각 | `status-message` 텍스트(예) | 주 control |
| --- | --- | --- | --- |
| `idle` | 모든 pad 기본 밝기, overlay 숨김 | "시작을 눌러 게임을 시작하세요" | `start-button` 활성 |
| `playback` | 시퀀스 pad 만 순서대로 `pad--active` 점등, 입력 잠금 | "순서를 재생 중입니다…" | 입력 불가 |
| `input` | pad 기본, 눌린 pad 만 순간 `pad--active` | "이제 순서를 입력하세요 (n/총)" | pad 입력 |
| `paused` | 현재 화면 딤 처리, 진행 정지 | "일시정지됨 — 재개를 기다립니다" | 재개 후 직전 상태 복귀 |
| `gameover` | `game-over-panel`(`overlay`) 표시 | "게임 오버 · 라운드 n 도달" | `start-button` 으로 재시작 |

- 재생 중(`playback`)에는 pad 클릭이 무시된다(no-op). 상태 텍스트로 재생 중임을
  안내한다.
- 오디오가 브라우저 정책으로 suspend 되어 소리가 없을 때도 `pad--active` 시각
  피드백과 상태 텍스트로 진행을 인지할 수 있어야 한다.
- 재시작/초기화 후: `round-indicator`·`status-message` 가 초기값으로 복귀하고
  `start-button` 을 다시 사용할 수 있다(AC-5).

---

## 7. dev 구현 가이드 (developer / BF-1742)

developer 가 `design-tokens.html`, `design-mockup.html`, 실제 앱을 만들 때 따를
단계별 지침. **frozen selector·token 을 변경·재정의하지 않는다.**

### 7.1 `design-tokens.html` (developer 소유)

1. `:root` 에 frozen design token **9개 전부**를 CSS custom property 로 선언:
   `--color-pad-green`, `--color-pad-red`, `--color-pad-yellow`,
   `--color-pad-blue`, `--color-bg`, `--color-text`, `--space-pad-gap`,
   `--radius-pad`, `--font-size-round` (값은 §2/§3 표와 동일).
2. **색상 견본**: 6개 색 token 각각을 배경으로 하는 swatch. 배경을
   `background: var(--color-…)` 로 **변수 참조**(HEX 하드코딩 금지). 각 swatch 에
   token 명·HEX·용도 라벨.
3. **타이포 견본**: `--font-size-round` 를 `font-size: var(--font-size-round)` 로
   적용한 샘플 텍스트(예: "Round 3").
4. **간격 견본**: `--space-pad-gap` 을 `gap` 또는 `margin` 으로 참조한 두 블록
   간격 시각화.
5. **반경 견본**: `--radius-pad` 를 `border-radius: var(--radius-pad)` 로 적용한
   사각형 샘플.
6. 정적 서버로 열었을 때 그 자체로 렌더링되어야 하며, frozen token 값을 견본이
   실제로 변수로 참조해야 한다(AC-1 for tokens 파일).

### 7.2 `design-mockup.html` (developer 소유)

1. `design-tokens.html` 과 **동일한 CSS 변수**(`:root`)를 사용. 값 하드코딩 금지.
2. **4개 상태 섹션 전부** 포함(각각 `<section>`): 시작 화면(idle),
   플레이 중 HUD(playback/input), 일시정지(paused), 게임 오버(gameover).
3. board 영역을 §4.2 규칙(2×2 정사각, `--space-pad-gap`, `--radius-pad`)의
   **실제 비율 자리표시자**로 배치.
4. HUD 는 `round-indicator`(24px, 변수) + `status-message`(§6 텍스트) 표시.
5. `game-over-panel` 은 `overlay` 스타일로 board 위에 덮이는 형태.
6. 정적 서버로 열었을 때 렌더링되고 frozen selector/token 을 재정의하지 않는다.

### 7.3 실제 앱 (`index.html`, `styles.css`, `src/*.js`)

- frozen DOM ID/class 를 그대로 마크업에 사용(§5).
- `styles.css` 는 token 을 `:root` 변수로 두고 모든 색·간격·반경·라운드 폰트를
  **변수 참조**로 작성(하드코딩 금지).
- pad 점멸은 `.pad--active` 토글 + **밝기 변화**로 구현(색상 교체 아님).
- 접근성: pad `aria-label`(색 이름), `start-button` `aria-label`+키보드 포커스,
  `status-message` `aria-live="polite"`. 상태는 텍스트로도 노출.
- 반응형: `#board` `aspect-ratio: 1/1` + 폭 상한으로 320px overflow 방지.

### 7.4 권장 CSS 변수/클래스 (frozen 범위 내)

- 변수: §2/§3 의 9개 frozen token 만 사용. 추가 변수는 파생값(예:
  `--pad-gap`)이 아닌 frozen 명을 그대로 참조.
- 클래스: `.board`, `.pad`, `.pad--active`, `.hud`, `.status`, `.overlay`
  (frozen). 신규 class 는 frozen 계약을 대체하지 않는 보조 용도로만.

---

## 8. mockup 참조

- 본 시각 명세는 developer 가 소유·구현하는
  `webaudio-memory-tone/design-tokens.html` 및
  `webaudio-memory-tone/design-mockup.html` 의 **입력 사양**입니다.
- designer(BF-1741) 산출물은 본 `README.md`(시각 명세) 한 파일이며, 런타임
  HTML/CSS/JS 는 생성하지 않습니다(frozen AC).

---

## 9. Self-critique (PR 직전 자기 점검)

1. **AC 매핑**: 본 명세는 frozen AC-1~AC-7 과 token/mockup AC 를 §2~§7 에 모두
   매핑했는가? → 색상 견본·타이포·간격·반경(§2/§3/§4/§7.1), 4개 상태 mockup
   (§6/§7.2), 2×2 정사각·320px(§4.2/AC-7), 접근성(§5/§6/AC-6) 각각 커버.
2. **dev 구현 가이드**: developer 가 두 HTML + 앱을 만들 단계별 지침을
   §7 에 제공했는가? → §7.1~§7.4 단계별 제공.
3. **기존 요소 보존**: frozen selector·token·상태를 **재정의하지 않고 참조만**
   했는가? → 새 token/selector 도입 없음. 값은 plan 표와 동일.
4. **컴포넌트 매핑**: frozen DOM ID/class 각각을 컴포넌트 명세(§5)에 1:1
   매핑했는가? → board, 4 pad, round-indicator, status-message, start-button,
   game-over-panel + 6 class 매핑.
5. **모호함 flag**: `--font-size-round` 외 폰트 크기와 폰트 패밀리는 frozen
   token 이 아니므로 **권장값**으로 명시(§3). developer 는 frozen token 은 고정,
   권장 스케일은 조정 가능. 상태 강조색은 신규 token 없이 밝기·텍스트로만 표현
   (색상 단독 의존 금지)하도록 명시.
