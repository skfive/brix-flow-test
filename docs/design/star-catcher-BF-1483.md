# 별빛 수집가 시각 명세 (BF-1483 / designer: BF-1484)

## 0. 문서 성격

본 문서는 frozen `ui-contract@v1`
(sha256:cde05e387fa2a430a83dd4a4e2622ea280260d6d851a7d4f8bae41fb6c80bed0)과
planner 실행 설계(`docs/plans/star-catcher-BF-1483.md`)가 고정한 DOM
ID/class, 상태 4종(`idle/running/paused/ended`), 디자인 토큰 값, 접근성·반응형
요구사항을 **재정의하지 않고** 그대로 전제한 뒤, 그 위에 독립적인 시각
언어를 부여한다. 외부 디자인이나 기존 프로젝트 UI를 참조하지 않았으며,
아래 컨셉·팔레트·타이포·컴포넌트 표현은 본 폴더 안에서 이 task를 위해
새로 정의한 것이다. 런타임 HTML/CSS/JS는 생성하지 않으며, 이 문서와
`docs/design/mockups/star-catcher-BF-1483.html`(정적 시각 mockup)만
산출한다.

## 1. 시안 개요

- **컨셉**: "초승달이 밤하늘에서 떨어지는 별빛을 그러모은다." 채집자를
  초승달 모양으로, 낙하하는 별을 4각 반짝임(다이아몬드 스파클) 모양으로
  표현해 게임명 "별빛 수집가"를 시각적으로 직역한다. 이것이 이 화면의
  signature 요소다.
- **변경 범위**: 신규 canary 데모 1개 화면(`/demo/star-catcher-canary-0802`)의
  시각 명세. 기존 화면 스타일 변경 없음.
- **UX 목표**: 시작(`idle`) → 진행(`running`) → 일시정지(`paused`) ↔ 진행 →
  종료(`ended`) → 다시 시작 흐름 전체에서, 사용자가 지금 상태를 색상 없이도
  텍스트·아이콘 모양만으로 즉시 알 수 있어야 한다. 실패(놓침)·중단
  이후에도 주 실행 control이 시각적으로 항상 "다시 누를 수 있는" 상태로
  보여야 한다(§3.4 §6.6 frozen 불변식 지원).
- **비목표**: 게임 수치 규칙(§4 planner)·순수 함수 시그니처(§5
  planner)·frozen selector/token 값 변경 — 모두 재정의하지 않는다.

## 2. 컬러 팔레트

### 2.1 Frozen 토큰 (값 변경 금지, 원문 그대로 사용)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--sc-color-bg` | `#0b1026` | `game-root` / `game-board` 배경(깊은 밤하늘) |
| `--sc-color-star` | `#ffd54a` | `star-catcher__star` 색상(별빛 골드) |
| `--sc-color-action-primary` | `#5b8cff` | `start-btn` 등 1차 action 강조색 |

### 2.2 Designer 확장 토큰 (신규 정의 — frozen 이름과 충돌 없음, 자유 배정 가능)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--sc-color-bg-elevated` | `#141b3d` | HUD 패널/카드 배경(밤하늘보다 한 단계 밝은 navy) |
| `--sc-color-surface-border` | `#2a3363` | 카드·버튼 기본 테두리 |
| `--sc-color-text-primary` | `#f5f3ff` | 기본 텍스트(라벤더 톤 화이트) |
| `--sc-color-text-muted` | `#9aa3c7` | 캡션/보조 텍스트 |
| `--sc-color-status-idle` | `#9aa3c7` | idle 상태 강조(중립 라벤더그레이) |
| `--sc-color-status-running` | `#5be0a0` | running 상태 강조(민트) |
| `--sc-color-status-paused` | `#f5c945` | paused 상태 강조(호박색) |
| `--sc-color-status-ended` | `#8f9bff` | ended 상태 강조(라벤더) |
| `--sc-color-status-missed` | `#ff7a90` | `missed-value` 강조(로즈 — 경고이되 알람톤 아님) |
| `--sc-color-focus-ring` | `#ffd54a` | 키보드 포커스 outline(`--sc-color-star` 재사용, 남색 배경 대비 4.7:1 이상) |
| `--sc-color-catch-line` | `#ffd54a` (opacity 0.35) | catch zone(y≥85%) 안내선 |

배경(`#0b1026`) 대비 `--sc-color-text-primary`(#f5f3ff)는 명도 대비
약 15.8:1, `--sc-color-text-muted`(#9aa3c7)는 약 7.9:1로 WCAG AA 본문
기준(4.5:1)을 충분히 만족한다.

## 3. 타이포그래피

vanilla-static 규약에 따라 **외부 폰트 CDN을 사용하지 않고 OS 내장
시스템 폰트만** 사용한다.

```
--sc-font-family: "Apple SD Gothic Neo", "Malgun Gothic", -apple-system,
  BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

| 역할 | font-family | weight | size | 비고 |
| --- | --- | --- | --- | --- |
| Display (HUD 숫자: score/combo/missed/timer 값) | `--sc-font-family` | 700 | `clamp(1.5rem, 5vw, 2.5rem)` | `font-variant-numeric: tabular-nums;` `letter-spacing: 0.02em;` — 숫자 폭 고정으로 갱신 시 흔들림 방지 |
| Body (`game-status`, control 라벨) | `--sc-font-family` | 600 | `1rem` (모바일 `0.95rem`) | line-height 1.4 |
| Caption (HUD 라벨 "점수/콤보/놓침/시간", 범례 텍스트) | `--sc-font-family` | 600 | `0.7rem` | `text-transform: uppercase; letter-spacing: 0.08em;` color `--sc-color-text-muted` |

시스템 폰트만 쓰는 제약 안에서 개성은 서체 자체가 아니라 (1) HUD 숫자의
tabular-nums 고정폭 처리, (2) 캡션의 uppercase + wide letter-spacing,
(3) §5.3의 초승달/다이아몬드 signature 도형에서 만든다.

## 4. 레이아웃

### 4.1 Breakpoint (frozen §3.5 구체화)

| Breakpoint | 범위 | HUD ↔ board 배치 |
| --- | --- | --- |
| Base (mobile, 필수 하한) | `320px ~ 767px` | **세로 재배치**: HUD(가로 바, 380px 미만에서 2×2 wrap) → board → control 순 단일 컬럼 |
| Desktop/tablet | `≥768px` | 2열 grid: board(가변, 좌측) + HUD 사이드바(고정 240px, 우측, 항목 세로 나열) — control 영역은 두 컬럼 아래 전체 폭으로 가로 정렬 |

320px 이상에서 `game-root`/`game-board`/`star-catcher__hud` 모두
`overflow-x: hidden`이 필요 없도록 `box-sizing: border-box`와 `%`/`fr`
단위만 사용하고 고정 px 폭을 두지 않는다(frozen §3.5-1).

### 4.2 ASCII 와이어프레임

```
[Mobile ≥320px]                [Desktop ≥768px]
┌──────────────────┐           ┌───────────────────────────┐
│ ● 수집 중          │           │ ┌───────────┐ ┌─────────┐ │
├───────┬──────────┤           │ │            │ │ 점수 120 │ │
│ 점수120│ 콤보 x3   │           │ │   board    │ │ 콤보 x3  │ │
├───────┼──────────┤           │ │  (달+별)    │ │ 놓침 1   │ │
│ 놓침 1 │ 시간0:18  │           │ │            │ │ 시간0:18 │ │
├───────┴──────────┤           │ │            │ │● 수집중  │ │
│                   │           │ └───────────┘ └─────────┘ │
│   board (달+별)    │           ├───────────────────────────┤
│                   │           │  [시작] [일시정지] [다시시작]│
├───────────────────┤           └───────────────────────────┘
│ [시작][일시정지][다시시작]│
└──────────────────┘
```

### 4.3 간격/여백

- `star-catcher` 카드 padding: `clamp(12px, 3vw, 24px)`
- HUD 내부 항목 간격: `--sc-space-hud-gap`(frozen, 16px) — layout(모바일
  가로 바 / 데스크톱 세로 목록) 상태와 무관하게 항상 적용(frozen §8
  구체화 원칙 그대로).
- board 최소 높이: `clamp(280px, 60vh, 480px)`, `aspect-ratio: 3 / 4` 권장.
- control 버튼 간 간격: `12px`, 버튼 3개 모두 최소 `min-height: 44px`
  (터치 타겟 확보).

## 5. 컴포넌트 명세

### 5.1 `#game-root.star-catcher` (frozen id/class)

- 배경 `--sc-color-bg`, 텍스트 `--sc-color-text-primary`.
- 카드 radius: designer 자유값 `20px`(frozen 토큰 아님, 자유 배정).
- 장식 배경: `::before` pseudo-element로 은은한 별점 패턴(반경이
  다른 `radial-gradient` 점 3~4겹, opacity 0.15 이하) — **DOM 요소를
  추가하지 않고** CSS만으로 표현, `pointer-events: none`.
- 상태 파악용 훅으로 `data-status="idle|paused|running|ended"` 속성을
  root(or `.star-catcher` 최상위)에 두는 것을 권장한다(frozen class/id
  아님, CSS 상태 selector 편의를 위한 dev 재량 추가).

### 5.2 `.star-catcher__hud` + 4개 스탯 + `#game-status`

- 컨테이너: `display: flex`(모바일, `flex-wrap: wrap` 380px 미만에서 2열)
  또는 `display: flex; flex-direction: column`(데스크톱 사이드바), gap
  `--sc-space-hud-gap`.
- 스탯 4종 라벨(고정 한국어 caption, dev가 그대로 사용 권장):
  - `score-value` → 캡션 "점수"
  - `combo-value` → 캡션 "콤보", 값 앞에 `×` 접두(`×3`)
  - `missed-value` → 캡션 "놓침", 색상 `--sc-color-status-missed`
  - `timer-value` → 캡션 "시간", 표시형식 `분:초`(예: 30초 → `0:30`,
    0초 → `0:00`, `Math.floor` 기준 — 반올림으로 `0:30`을 넘기지 않음)
- 각 스탯 wrapper(frozen 아님, 자유 class 권장 `star-catcher__stat`):
  caption(§3 caption 스타일) 위 + display 숫자(§3 display 스타일) 아래,
  세로 배치.
- 콤보 강조(선택 사항): `combo-value`가 3 이상일 때 색상을
  `--sc-color-star`로 전환해 "연속 수집" 몰입감 강화 — 필수는 아니며 없어도
  §3 접근성/§4 게임 규칙에 영향 없음.
- `#game-status` (frozen, `aria-live="polite"`): HUD 안에서 별도 줄로
  전체 폭 차지. 상태 glyph(§5.4) + 상태 텍스트를 함께 표시.

### 5.3 `#game-board.star-catcher__board` + `.star-catcher__star` + 채집자(신규 signature)

**board**

- `position: relative`, 배경 `--sc-color-bg`(root와 동일 톤, 미세하게
  더 어둡게: `--sc-color-bg`에 `box-shadow: inset 0 0 40px rgba(0,0,0,.4)`),
  `overflow: hidden`.
- 내부에 7개 열(`BOARD_COLUMNS`=7, planner §4 frozen 수치) 참조용 안내를
  둘 필요는 없으나, 시각적으로 별/채집자의 `left` 값을 `column * (100% / 7)
  + (100%/14)`(열 중앙 정렬)로 계산해 배치한다.
- **catch line(권장, 신규)**: `y = 85%` 위치에 얇은 점선 가이드
  (`border-top: 1px dashed var(--sc-color-catch-line)`, 높이 0, 폭 100%,
  `pointer-events:none`, 장식용)를 두어 "여기 안에서 눌러야 수집된다"는
  포집 구간(planner §4 `CATCH_ZONE_MIN_PERCENT`)을 시각적으로 암시한다.
  게임 판정 로직에는 관여하지 않는 순수 시각 보조선이다.

**`.star-catcher__star` (frozen class, 개별 별 — 신규 signature 도형)**

- 원이 아닌 **4방향 다이아몬드 스파클**로 표현: `width/height: clamp(14px,
  4vw, 22px)`, `clip-path: polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%,
  50% 100%, 35% 65%, 0% 50%, 35% 35%)`(4방향 별 스파클), 색상
  `--sc-color-star`, 발광 `box-shadow: 0 0 8px var(--sc-color-star)`.
- 낙하 위치(top %)는 `tick()` 결과값으로 매 프레임 JS가 갱신하는 필수
  게임 메커니즘이며 이는 "장식 애니메이션"이 아니다 — reduced-motion과
  무관하게 항상 동작해야 게임이 성립한다(§5.6 참조).
- 장식적 반짝임(선택, CSS `@keyframes` opacity 0.85↔1 2.4s 무한)은
  reduced-motion에서 제거 대상.

**채집자(catcher) — 이 화면의 signature 요소, frozen DOM 목록 밖**

- planner 문서는 `catcherColumn` state는 정의하지만 채집자의 DOM
  표현은 frozen 목록에 없다(§3.1 "board 내부에... 어떤 컨테이너 구조로
  둘지는 frozen selector 범위 밖" 원칙). 따라서 아래는 **권장 시각
  표현**이며 정확한 태그/class명은 developer 재량이다(예:
  `star-catcher__catcher`처럼 `star-catcher__` 접두를 쓰되 frozen
  5종 class와 겹치지 않는 새 이름 권장).
- 모양: **초승달**. `border-radius: 50%`인 원 2개를 겹쳐
  `box-shadow`(내부로 어두운 원 하나를 오프셋 배치)로 초승달을 깎아내는
  방식, 또는 `clip-path`로 초승달 형태 직접 정의. 색상은
  `--sc-color-action-primary`(frozen, 5b8cff)를 재사용해 "1차 조작
  대상"이라는 의미를 색으로도 일관되게 전달.
- 위치: board 하단 `bottom: 6%`, `left`는 `catcherColumn` 기준 §5.3
  열 계산식과 동일. `moveCatcher` 호출 시 `left`가 `transition:
  left 120ms ease-out`으로 부드럽게 이동(장식 전환 — reduced-motion
  시 `transition: none`).
- 크기: 폭 `clamp(28px, 8vw, 40px)`, 별보다 뚜렷하게 커서 "받는
  주체"임을 형태로 구분(색상만으로 구분하지 않음).

### 5.4 상태 glyph — 색상 외 상태 구분(frozen 접근성 §6 구체화)

`#game-status` 텍스트 앞에 CSS로 그린 작은 도형(장식, `aria-hidden`
권장 — 상태명은 텍스트로 별도 노출되므로 glyph 자체는 보조 정보)을 둔다.
모양이 상태마다 달라 색상 인지 없이도 구분 가능하다.

| 상태 | glyph 모양 | 색상 | `game-status` 텍스트(고정 문구, dev 그대로 사용 권장) |
| --- | --- | --- | --- |
| `idle` | 속이 빈 원(`border: 2px solid`, 배경 투명) | `--sc-color-status-idle` | "대기 중 — 시작을 누르면 별빛 수집이 시작됩니다" |
| `running` | 속이 찬 원(장식 pulse, reduced-motion 시 정적) | `--sc-color-status-running` | "수집 중" |
| `paused` | 세로 막대 2개(pause 아이콘, CSS `::before`+`::after`) | `--sc-color-status-paused` | "일시정지 — 계속하기를 누르면 이어집니다" |
| `ended` | §5.3과 동일한 미니 다이아몬드 스파클(정적) | `--sc-color-status-ended` | "종료 — 최종 점수 {score}점" (`{score}`는 `score-value` 값 삽입) |

### 5.5 `.star-catcher__control` 3종(frozen class) — `start-btn` / `pause-btn` / `restart-btn`

공통: `border-radius: var(--sc-radius-control)`(frozen, 8px),
`min-height: 44px`, padding `10px 20px`, font는 §3 Body, `cursor: pointer`,
`transition: background-color 120ms, border-color 120ms, opacity 120ms`
(reduced-motion 시 `transition: none`).

| Control | 상태별 표현 | 라벨/aria-label |
| --- | --- | --- |
| `start-btn` | 배경 `--sc-color-action-primary` 채움(solid), 텍스트 흰색. `idle`에서만 시각적으로 "강조"(항상 클릭 가능 — planner에 `idle`만 유효 전이로 명시되어 있으므로 다른 상태에선 `aria-disabled="true"` + opacity 0.4 권장) | 텍스트 "시작", `aria-label="별빛 수집 시작"` |
| `pause-btn` | ghost 스타일: 배경 투명, `border: 1px solid var(--sc-color-action-primary)`, 텍스트 `--sc-color-action-primary`. `running`일 때 라벨/aria-label을 "일시정지"로, `paused`일 때 "계속하기"로 전환(§6.4 planner, 동일 버튼 재사용). `idle`/`ended`에서는 `aria-disabled="true"` + opacity 0.4 | `running`: 텍스트 "일시정지", `aria-label="게임 일시정지"` / `paused`: 텍스트 "계속하기", `aria-label="게임 계속하기"` |
| `restart-btn` | ghost 스타일: `border: 1px solid var(--sc-color-surface-border)`, 텍스트 `--sc-color-text-primary`. 모든 상태에서 활성(§6.7 planner — `idle`에서도 안전하게 no-op급 리셋) | 텍스트 "다시 시작", `aria-label="게임 다시 시작"` |

`aria-disabled`(네이티브 `disabled` 대신)를 권장하는 이유: 네이티브
`disabled`는 tab order에서 요소를 제거해 §7(planner) 키보드 포커스
이동 흐름을 끊을 수 있다 — 포커스는 유지하되 클릭·활성화 동작만
막는 편이 frozen 키보드 접근성 요구와 더 잘 맞는다는 판단(가정 명시,
최종 구현 방식은 developer 재량).

### 5.6 접근성 표현 정리(frozen §3.4 항목별 매핑)

1. control 3종 `aria-label` → §5.5 표 그대로.
2. 방향키/Space/Enter 조작 → 시각적으로는 board에 키보드 포커스가 있을 때
   `#game-board`에 §5.7 focus ring을 표시해 "지금 이 판이 키 입력을
   받는다"는 것을 시각으로 알림.
3. `game-status` `aria-live="polite"` → §5.4 문구가 상태 전이마다 교체됨.
4. 포커스 outline → §5.7.
5. `prefers-reduced-motion` → 대상은 **장식 애니메이션**(별 반짝임 pulse,
   상태 glyph pulse, 채집자 이동 transition, 카드 hover 전환)이며, `tick()`이
   갱신하는 별의 낙하 위치(top %) 자체는 게임 메커니즘이므로 유지한다(§5.3
   근거 명시 — 낙하를 멈추면 게임이 성립하지 않으므로 "정지 또는 축소"는
   장식 레이어에 적용하는 것으로 해석).
6. 색상만으로 상태 구분 금지 → §5.4 glyph 모양 + 고정 한국어 문구로 이중
   보장.

### 5.7 포커스 표시(frozen §3.4-4)

```css
:focus-visible {
  outline: 3px solid var(--sc-color-focus-ring);
  outline-offset: 2px;
}
```

`#game-board`/`#game-root`가 키보드 포커스를 받는 구현이라면 동일
outline을 적용하되 `outline-offset: -3px`(board 경계 안쪽)로 board 밖
레이아웃이 밀리지 않게 한다. `--sc-color-focus-ring`(#ffd54a)은
`--sc-color-bg`(#0b1026) 대비 매우 높은 대비를 가져 다크 배경에서도
뚜렷하다.

## 6. dev 구현 가이드

1. **CSS 변수 선언 위치**: `:root` 또는 `.star-catcher`에 §2의 frozen 3종 +
   확장 11종 변수를 모두 선언하고, 이후 색상은 하드코딩 없이 변수만
   참조한다.
2. **상태 훅**: `game-root`(또는 최상위 `.star-catcher`)에
   `data-status="idle|running|paused|ended"`를 두고, CSS는
   `[data-status="paused"] #game-status::before { ... }`처럼 상태별
   glyph/색상을 selector로 분기(§5.4).
3. **HUD 스탯 마크업**: frozen id 5종(`score-value` 등)은 값(숫자)만 담긴
   요소에 그대로 유지하고, 캡션 텍스트("점수" 등)는 별도 sibling
   요소(신규 class, 예 `star-catcher__stat-label`)로 감싸 §5.2 caption
   스타일 적용. `game-status` 앞에 glyph용 별도 `<span>`(신규 class,
   `aria-hidden="true"`) 추가 권장.
4. **채집자 요소 신규 추가**: frozen 목록 밖이므로 `board` 안에 새
   요소(예: `<div class="star-catcher__catcher">`)를 추가해 §5.3 초승달
   스타일 적용. `catcherColumn` 변경 시 `left` 값만 갱신.
5. **타이머 포맷 헬퍼**: `timeRemaining`(정수 초, planner §5) →
   `` `${Math.floor(timeRemaining/60)}:${String(timeRemaining%60).padStart(2,'0')}` ``
   로 `0:30`~`0:00` 표시.
6. **버튼 라벨/aria-label 전환**: `pause-btn`은 `status`가 `running`↔`paused`
   전환될 때마다 §5.5 표에 따라 텍스트 노드와 `aria-label`을 함께
   갱신(둘 중 하나만 갱신하면 스크린리더-화면 텍스트 불일치 발생).
7. **reduced-motion 분기**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     .star-catcher__star,
     .star-catcher__catcher,
     .star-catcher__control,
     #game-status [data-glyph] {
       animation: none !important;
       transition: none !important;
     }
   }
   ```
   별의 `top`(낙하 위치) 값 갱신 로직 자체는 이 분기와 무관하게 유지.
8. **반응형**: §4.1 breakpoint 값(768px)을 그대로 미디어쿼리 기준으로
   사용. 컨테이너 쿼리는 필요 없음(단일 화면, 뷰포트 기준으로 충분).
9. **focus-visible**: 네이티브 `<button>` 사용을 권장(§planner §7과 동일
   근거 — 기본 activation 동작 재사용). `:focus-visible`만 스타일링하고
   `:focus`(마우스 클릭 포함)에는 outline을 주지 않아 마우스 사용자에게
   불필요한 링이 보이지 않게 한다.

## 7. mockup 참조

시각 mockup: `docs/design/mockups/star-catcher-BF-1483.html`

- 단일 self-contained HTML, 외부 의존성 0건(vanilla CSS, 인라인
  `<style>`, 시스템 폰트).
- 구성: (1) 컬러 토큰 스와치, (2) 타이포그래피 스케일, (3) `idle` 상태를
  frozen id/class 그대로 사용한 "canonical" 예시 카드(desktop 2열
  레이아웃), (4) `running`/`paused`/`ended` 3개 상태 스냅샷 카드,
  (5) 상태 glyph 범례, (6) 포커스 outline 정적 예시, (7) 모바일 세로
  레이아웃 축소 데모(뷰포트 폭 375px 프레임).
- 실제 게임 로직(타이머 tick, 별 낙하 애니메이션 루프, 클릭 반응)은
  구현하지 않는다 — 각 상태는 정적 snapshot이며 dev의 실제 산출물이
  아닌 시안 시각화 참고 자료다. 픽셀 단위 일치 의무는 없다.
