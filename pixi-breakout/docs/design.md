# pixi-breakout · 디자인 시스템 및 시각 명세 (BF-1701)

> 본 문서는 frozen UI 계약(`docs/plans/BF-1700/implementation-plan.md` §5, ui-contract@v1)을 그대로 반영한 시각 명세입니다. 아래 selector(DOM ID/class), 상태명, design token 은 frozen blueprint 값을 **재정의하지 않고** 그대로 사용합니다. 본 문서는 문서 산출물이며 런타임 HTML/CSS/JS 를 포함하거나 생성하지 않습니다.

## 1. 시안 개요

- **변경 범위**: PixiJS 기반 벽돌깨기(breakout) 게임의 시각 디자인 시스템 전체(컬러/타이포/레이아웃/게임 오브젝트/모션/상태 화면/접근성)를 문서로 동결한다.
- **사용자 경험 목표**:
  - 어두운 배경 위에 채도 높은 브릭/공/패들 색상이 또렷하게 대비되어 시인성이 높다.
  - 상태 전이(start → playing → paused ⇄ playing → game-over | clear)가 색상뿐 아니라 텍스트로도 항상 명확히 드러난다.
  - 키보드만으로 전체 플레이가 가능하고, 포커스/조작 대상이 시각적으로 분명하다.
  - 360px 폭의 좁은 화면에서도 HUD와 보드가 겹치지 않고 종횡비가 유지된다.

## 2. 컬러 팔레트 (HEX — frozen design token 그대로)

| 역할 | Design token | HEX | 용도 |
|---|---|---|---|
| Background | `--color-bg` | `#0b1021` | 페이지/보드 배경, overlay backdrop 기준색 |
| Primary text | `--color-text-primary` | `#f8fafc` | 제목, 점수, 주요 라벨 |
| Secondary text | `--color-text-secondary` | `#94a3b8` | 보조 설명, caption, 비활성 라벨 |
| Ball (accent) | `--color-ball` | `#facc15` | 공, 포커스 outline, 강조 CTA |
| Paddle | `--color-paddle` | `#e2e8f0` | 패들, 버튼 배경(밝은 표면) |
| Brick tier 1 | `--color-brick-tier1` | `#38bdf8` | 내구도 1(최약) 벽돌 |
| Brick tier 2 | `--color-brick-tier2` | `#818cf8` | 내구도 2(중간) 벽돌 |
| Brick tier 3 | `--color-brick-tier3` | `#f472b6` | 내구도 3(최강) 벽돌 |

추가로 필요한 파생 색상은 새 token 을 만들지 않고 위 token 의 alpha 변형으로만 사용한다(재정의 아님, 합성 사용):

| 용도 | 값 | 비고 |
|---|---|---|
| overlay backdrop | `rgba(11, 16, 33, 0.86)` | `--color-bg` 의 86% 불투명 버전 |
| paddle/brick shadow | `rgba(11, 16, 33, 0.4)` | `--color-bg` 의 40% 불투명 버전 |
| focus ring glow | `rgba(250, 204, 21, 0.35)` | `--color-ball` 의 35% 불투명 버전 |

### 2.1 WCAG AA 대비 검증 (계산값)

| 전경 | 배경 | 대비율 | 기준 | 결과 |
|---|---|---|---|---|
| `--color-text-primary` (#f8fafc) | `--color-bg` (#0b1021) | 18.1 : 1 | 4.5:1 (AA, 일반 텍스트) | 통과 |
| `--color-text-secondary` (#94a3b8) | `--color-bg` (#0b1021) | 7.4 : 1 | 4.5:1 (AA, 일반 텍스트) | 통과 |
| `--color-bg` (#0b1021) 텍스트 | `--color-paddle` (#e2e8f0) 버튼 배경 | 15.3 : 1 | 4.5:1 (AA, 일반 텍스트) | 통과 |

버튼(`pause-button`, `restart-button`)은 배경 `--color-paddle`, 글자색 `--color-bg` 조합을 기본값으로 사용해 15.3:1 대비를 확보한다.

## 3. 타이포그래피

폰트는 frozen token `--font-family-ui`(`-apple-system, 'Segoe UI', Roboto, sans-serif`) 하나만 사용한다(외부 웹폰트 로드 없음 — vanilla-static 계약 준수).

| 레벨 | 용도 | font-size | font-weight | line-height | 색상 |
|---|---|---|---|---|---|
| Heading (H1) | overlay 상태 타이틀("시작하기", "일시정지", "게임 오버", "클리어!") | 32px (모바일 24px) | 700 | 1.2 | `--color-text-primary` |
| Heading (H2) | overlay 부제(최종 점수/안내 문구) | 18px | 600 | 1.4 | `--color-text-primary` |
| Body | HUD 라벨/값(`hud__score`, `hud__lives`), 버튼 텍스트 | 16px | 500 | 1.3 | `--color-text-primary` |
| Body (value 강조) | 점수/best-score 숫자 값 | 20px | 700 | 1.2 | `--color-text-primary` |
| Caption | 조작 안내("←/→ 이동, Space 일시정지" 등), 상태 배지 보조문구 | 13px | 400 | 1.4 | `--color-text-secondary` |

- 모든 텍스트는 `--font-family-ui` 상속, 별도 font-face 선언 없음.
- 숫자 값(score/lives/best-score)은 `font-variant-numeric: tabular-nums` 권장 — 갱신 시 자릿수 흔들림 방지.

## 4. 레이아웃 그리드

### 4.1 전체 구조

```
┌─────────────────────────────────────┐
│ #game-hud  (.hud)                    │  height: 56px (≥600px) / 44px (<600px)
│  ┌───────────────┐   ┌─────────────┐ │
│  │ .hud__score    │   │ .hud__lives │ │  + best-score 값은 .hud__score 그룹 내 보조 표기
│  └───────────────┘   └─────────────┘ │
├─────────────────────────────────────┤
│ #game-root (canvas 마운트)            │  aspect-ratio: 4 / 3 고정, 폭에 맞춰 스케일
│   ┌─────────────────────────────┐    │
│   │  #game-overlay (.overlay)   │    │  position: absolute, inset: 0, #game-root 위에 겹침
│   │  (state 에 따라 표시/숨김)    │    │
│   └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

- `#game-hud` 는 `#game-root` **위쪽**에 별도 행으로 배치(겹치지 않음). `#game-overlay` 만 `#game-root` 위에 절대 위치로 겹친다.
- 컨테이너 최대 폭: 960px, 페이지 중앙 정렬(`margin: 0 auto`).
- 기준 캔버스 해상도: 800×600(4:3). `#game-root` 는 `aspect-ratio: 4 / 3`, `width: min(100%, 960px)` 로 스케일하고 PixiJS renderer 해상도를 컨테이너 크기에 맞춰 조정한다.

### 4.2 Spacing 스케일 (4px 기준 그리드)

`4px, 8px, 12px, 16px, 24px, 32px` — HUD 내부 padding 16px, HUD 그룹 간 간격 24px, overlay 내부 요소 간 간격 16px, 버튼 padding 8px 12px 을 이 스케일에서만 사용한다.

### 4.3 Breakpoint

| Breakpoint | 폭 범위 | 동작 |
|---|---|---|
| Base(모바일) | 360px ~ 599px | HUD height 44px, heading 24px, `#game-hud` 내부 padding 8px 16px, 버튼 세로 padding 축소 |
| Tablet | 600px ~ 959px | HUD height 56px, 기본 타이포 크기 적용 |
| Desktop | 960px 이상 | 컨테이너 폭 960px 고정, 좌우 여백은 페이지 중앙 정렬로 확보 |

- 360px 미만은 지원 범위 밖(계약상 "360px 이상" 이 하한선).
- `#game-root` 는 항상 4:3 종횡비를 유지하며 `overflow: hidden` 없이 컨테이너 폭에 맞춰 축소/확대된다.

## 5. 게임 오브젝트 시각 명세

### 5.1 벽돌(Brick)

- 그리드: 8열 × 5행, 벽돌 1개 크기 88×28px(기준 800px 폭 기준), 벽돌 간 간격 4px.
- Tier(내구도)와 시각 구분(색상 + spot 패턴 — 접근성 요구사항):

| Tier | 색상 token | 초기 내구도(hit) | Spot 개수(내구도와 동일) | 파괴 시 점수 |
|---|---|---|---|---|
| 1 | `--color-brick-tier1` `#38bdf8` | 1 | 1개(중앙) | 10점 |
| 2 | `--color-brick-tier2` `#818cf8` | 2 | 2개(좌우 대칭 배치) | 20점 |
| 3 | `--color-brick-tier3` `#f472b6` | 3 | 3개(삼각 배치) | 30점 |

- spot 은 벽돌 표면에 그려지는 원형 마커(지름 6px, 색상 `rgba(11, 16, 33, 0.5)` — `--color-bg` alpha 변형)이며, 피격 시 spot 개수가 남은 내구도만큼 1개씩 줄어든다(색상만으로 내구도를 구분하지 않기 위한 접근성 장치).
- 벽돌 모서리 radius 2px, 그림자 없음(단순 flat shape).

### 5.2 공(Ball)

- 형태: 정원, 반지름 8px(기준 800px 폭), 색상 `--color-ball` `#facc15`.
- 이동은 물리 시뮬레이션 기반이며 CSS transition/애니메이션을 사용하지 않는다(§6 모션 명세 참고).

### 5.3 패들(Paddle)

- 형태: 모서리 radius 4px 사각형, 크기 96×14px(기준 800px 폭), 색상 `--color-paddle` `#e2e8f0`.
- 좌우 방향키(←/→)로만 조작 가능(접근성 요구사항 — 전체 플레이 키보드 지원).
- `focus` 시 outline: `2px solid var(--color-ball)` + `box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.35)`(포커스 글로우, §2 focus ring glow token 사용).

## 6. 모션 명세 (지속시간 · 이징)

| 대상 | 트리거 | 지속시간 | 이징 | 효과 |
|---|---|---|---|---|
| `#game-overlay` 표시/숨김 | 상태 전이(overlay class 변경) | 200ms | `ease-out` | opacity 0→1 + `translateY(8px)→0` |
| 벽돌 파괴 | 내구도 0 도달 | 150ms | `ease-in` | opacity 1→0 + `scale(1→0.85)` 후 DOM/스프라이트 제거 |
| score/lives 값 갱신 | `#score-value`/`#lives-value` 텍스트 변경 | 120ms | `ease-out` | `scale(1→1.15→1)` pulse |
| `pause-button`/`restart-button` hover | 마우스 hover | 100ms | `ease-in-out` | 배경색 소폭 어둡게(brightness 0.94) |
| `pause-button`/`restart-button` active | 클릭/press | 80ms | `ease-in` | `scale(1→0.96)` |
| focus outline 진입/이탈 | 키보드 focus 이동 | 100ms | `ease-out` | outline opacity 0↔1 |
| 패들 이동 | 방향키 입력 | 없음(0ms, transition 미사용) | - | 입력 반응성을 위해 매 프레임 즉시 위치 반영(requestAnimationFrame 기반) |
| 공 이동 | 물리 루프 | 없음(0ms, transition 미사용) | - | 매 프레임 위치를 물리 계산으로 직접 갱신 |

- `prefers-reduced-motion: reduce` 환경에서는 위 표의 opacity/scale 애니메이션을 즉시 상태 전환(duration 0ms)으로 대체한다. 패들/공의 위치 갱신(게임플레이 자체)은 모션 감소 대상이 아니다(장식적 트랜지션만 축소).

## 7. 상태별 화면

frozen 상태값 `start`, `playing`, `paused`, `game-over`, `clear` 와 overlay 클래스 `overlay--start`, `overlay--paused`, `overlay--gameover`, `overlay--clear` 를 그대로 사용한다. `playing` 상태는 대응하는 modifier 클래스가 없다 — overlay 를 숨긴다.

| 상태 | overlay class | 화면 텍스트(예시) | HUD/컨트롤 상태 |
|---|---|---|---|
| 시작 전(`start`) | `overlay overlay--start` | H1 "브레이크아웃", H2 "방향키로 패들을 움직여 시작하세요", caption "←/→ 이동 · Space 시작" | score/lives/best-score 초기값(0/3/저장된 최고점) 표시, `restart-button` 은 시각적으로 있지만 재시작할 대상이 없으므로 비활성 스타일 권장 |
| 진행 중(`playing`) | `overlay`(modifier 없음, 숨김 처리) | 없음(overlay 비표시) | score/lives 실시간 갱신, `pause-button` 활성 |
| 일시정지(`paused`) | `overlay overlay--paused` | H1 "일시정지", caption "Space 또는 pause 버튼으로 재개" | 게임 루프 정지, score/lives 값 고정 표시, `pause-button` 라벨을 "재개"로 전환 |
| 게임 오버(`game-over`) | `overlay overlay--gameover` | H1 "게임 오버", H2 "최종 점수: {score}", caption "최고 점수: {best-score}" | `restart-button` 강조(주 CTA 스타일 — 배경 `--color-ball`, 텍스트 `--color-bg`) |
| 클리어(`clear`) | `overlay overlay--clear` | H1 "클리어!", H2 "최종 점수: {score}", caption "모든 벽돌을 파괴했습니다" | `restart-button` 강조(게임 오버와 동일 CTA 스타일) |

- `restart` 또는 초기화/취소/실패 이후에는 score/lives/overlay 가 초기값으로 되돌아가고 `pause-button`/`restart-button` 이 다시 정상 동작해야 한다(후조건 — §5.7 implementation-plan 과 동일).

## 8. 접근성

- **색 외 구분**: 벽돌 내구도는 색상(tier1/2/3) + 표면 spot 개수(1/2/3개)로 이중 구분한다(§5.1). 상태 화면도 overlay 색상뿐 아니라 상태명 텍스트(예: "일시정지", "게임 오버")를 항상 함께 노출한다(§7).
- **WCAG AA**: 본 문서에 등장하는 모든 UI 텍스트/배경 조합은 4.5:1 이상을 만족한다(§2.1 계산값 — 최소 7.4:1).
- **키보드 전체 플레이**: 패들은 ←/→ 방향키만으로 전체 플레이가 가능하다. `pause-button`/`restart-button` 은 Tab 으로 포커스 이동 가능하고 Enter/Space 로 활성화된다. 패들 focus 시 §5.3 의 outline 스타일이 적용된다.
- **`aria-label`**: `pause-button` = `"게임 일시정지"`(재개 상태일 때는 `"게임 재개"`로 갱신), `restart-button` = `"게임 다시 시작"`.
- **상태의 접근성 이름 노출**: `#game-overlay` 에 상태 전이 시 `role="status"` 와 상태 텍스트(§7 표의 H1 문구)를 함께 노출해 스크린리더 사용자도 상태 변경을 인지할 수 있게 한다.
- **모션 감소**: §6 의 `prefers-reduced-motion` 대응을 따른다.

## 9. dev 구현 가이드

1. **CSS 변수 선언 위치**: `index.html` 의 최상위(`:root` 또는 `#game-root`)에 §2 의 8개 design token 을 그대로 선언한다. 이름/값 변경 금지(frozen).
2. **DOM 구조**: `#game-root` → 내부에 canvas 마운트 지점 + `#game-hud`(`.hud` 클래스, 내부 `.hud__score`/`.hud__lives`) + `#game-overlay`(`.overlay` 클래스, 상태에 따라 `overlay--start`/`overlay--paused`/`overlay--gameover`/`overlay--clear` modifier 추가/제거). `playing` 상태에서는 modifier 없이 숨김 처리.
3. **레이아웃**: §4.1 구조대로 `#game-hud` 는 `#game-root` 위쪽 별도 블록, `#game-overlay` 만 `#game-root` 위에 `position: absolute` 로 겹친다. §4.3 breakpoint 는 media query 로 구현한다.
4. **게임 오브젝트 렌더링**: `renderer.js` 가 §5 의 크기/색상/spot 패턴을 PixiJS Graphics/Sprite 로 그린다. 벽돌 spot 은 별도 작은 Graphics 원으로 브릭 위에 겹쳐 그린다.
5. **모션 구현**: 브릭 파괴/overlay 전환/값 pulse 는 §6 의 duration·easing 값으로 PixiJS ticker 기반 tween 혹은 CSS transition(DOM 요소인 HUD/overlay 한정) 으로 구현한다. 공/패들은 트랜지션 없이 매 프레임 직접 좌표 갱신.
6. **접근성 구현**: `aria-label` 문자열은 §8 의 정확한 문구를 사용한다. `#game-overlay` 에 `role="status"` 부여, 상태 전환 시 텍스트 갱신.
7. **네이밍 권장**: BEM 계열 클래스는 frozen 값(`hud`, `hud__score`, `hud__lives`, `overlay`, `overlay--*`) 을 그대로 사용하고, 문서에 없는 보조 요소(버튼 내부 span 등)에 한해서만 `hud__best-score`, `overlay__title`, `overlay__subtitle`, `overlay__hint` 처럼 동일 BEM 규칙을 확장 적용할 수 있다(신규 규칙 추가가 아닌 기존 규칙의 자연 확장).

## 10. mockup 참조

본 task(BF-1701)의 frozen 산출물 범위는 `pixi-breakout/docs/design.md`, `pixi-breakout/README.md` 두 문서로 한정되며, "시각 명세 범위는 design.md/README.md 이며 런타임 HTML/CSS/JS 를 생성하지 않는다"는 수용 기준에 따라 별도 시각 mockup HTML 은 작성하지 않았다. 시각 구현은 developer(BF-1702)가 `index.html`/`src/renderer.js` 에서 본 문서를 참조해 직접 구현한다.
