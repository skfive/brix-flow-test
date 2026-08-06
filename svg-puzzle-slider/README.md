# SVG 슬라이딩 퍼즐 — 시각 명세 (Visual Spec)

> **문서 성격**: 이 문서는 designer(BF-1746)의 산출물로, planner가 동결한 UI 계약(`docs/plans/BF-1738/implementation-plan.md` §3, `ui-contract@v1`)을 **눈으로 확인 가능한 시각 명세**로 정리합니다.
> 파일·selector·상태·token·접근성·반응형 계약을 **재정의하지 않고 그대로** 서술합니다. 새 파일·새 selector·새 token을 추가하지 않으며, 계약값의 유일한 권위는 frozen blueprint입니다.
> designer는 `design-tokens.html`·`design-mockup.html`·`index.html` 등 developer 소유 파일을 직접 작성하지 않습니다. 본 문서는 그 파일들이 표현해야 할 **시각 기준**을 제시합니다.

---

## 1. 시안 개요 (Overview)

- **범위**: 3×3(8-퍼즐) SVG 슬라이딩 퍼즐의 시각 계약 명세. vanilla static(HTML/CSS/ESM) 스택.
- **사용자 경험 목표**:
  - 페이지를 열면 셔플된 solvable 보드가 즉시 조작 가능한 상태로 보인다.
  - 이동/경과 시간이 HUD에 상시 노출돼 진행 상황을 즉시 인지한다.
  - 색상뿐 아니라 **상태 텍스트**로 현재 상태(start/playing/paused/cleared)를 알 수 있어 접근성이 보장된다.
  - 320px 이상 좁은 화면에서도 보드가 축소되고 HUD가 세로로 재배치되어 overflow 없이 사용 가능하다.
- **시각 산출물 매핑** (developer 소유 — 본 명세를 시각 기준으로 구현):
  - `svg-puzzle-slider/design-tokens.html` — 토큰 시각 카탈로그(§2·§3의 견본).
  - `svg-puzzle-slider/design-mockup.html` — start/playing/paused/cleared 네 상태 정적 시안(§5).
  - `svg-puzzle-slider/index.html` — 실제 진입 페이지.

---

## 2. 컬러 팔레트 (Color Palette)

frozen 디자인 토큰(`:root` CSS custom property)을 유일 출처로 사용합니다. **하드코딩 금지** — 색상 견본·컴포넌트는 아래 변수를 실제로 참조해야 합니다.

| 역할 | 토큰 변수 | HEX | 용도 |
| --- | --- | --- | --- |
| Background | `--color-bg` | `#0f172a` | 페이지 배경(짙은 slate) |
| Surface | `--color-surface` | `#1e293b` | 보드/HUD/클리어 화면 표면 |
| Tile | `--color-tile` | `#f8fafc` | 타일 배경(밝은 표면) |
| Tile text | `--color-tile-text` | `#0f172a` | 타일 숫자 텍스트 |
| Accent | `--color-accent` | `#2563eb` | 주 실행 control·강조(restart, focus) |

- **대비**: 타일(`#f8fafc`) 위 타일 텍스트(`#0f172a`)는 고대비로 숫자 가독성을 확보한다.
- **empty 타일**: `puzzle__tile--empty`는 배경(`--color-surface`)에 녹아드는 빈 칸으로, 채워진 타일과 명도로 구분한다(색상 단독 의존 금지 — 숫자 부재로도 구분).

---

## 3. 타이포그래피 (Typography)

vanilla-static 규약에 따라 **system font stack**을 사용하고 외부 폰트 의존을 두지 않습니다.

```css
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

| 요소 | 크기 | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 타일 숫자 | `var(--font-size-tile)` = `28px` | 700 | 1 | frozen token 참조. SVG `<text>` 중앙 정렬 |
| 화면 제목/상태 텍스트 | 20px | 600 | 1.3 | 상태명 노출(접근성 이름과 동일 텍스트) |
| HUD 라벨/값(`move-count`·`elapsed-time`) | 16px | 500 | 1.4 | 숫자는 등폭 정렬 권장(`font-variant-numeric: tabular-nums`) |
| 캡션/보조 | 13px | 400 | 1.4 | 부가 안내 |

---

## 4. 레이아웃 (Layout)

### 4.1 구조

```
.puzzle (최상위 래퍼)
├─ .puzzle__hud            ← #move-count, #elapsed-time
├─ #puzzle-board (SVG 루트)
│  └─ #puzzle-tiles        ← .puzzle__tile × 8, .puzzle__tile--empty × 1
├─ #restart-button         ← 주 실행 control
└─ #clear-screen (.puzzle__clear, role="status")  ← cleared 상태에서 노출
```

### 4.2 간격·형태 토큰

| 항목 | 토큰 | 값 |
| --- | --- | --- |
| 타일 간격 | `--space-tile-gap` | `8px` |
| 타일 반경 | `--radius-tile` | `12px` |
| 타일 그림자 | `--shadow-tile` | `0 2px 6px rgba(0,0,0,0.3)` |

- 보드는 3×3 정사각 그리드. 타일 간격은 `--space-tile-gap`, 모서리는 `--radius-tile`, 입체감은 `--shadow-tile`을 사용한다.
- **게임 캔버스(보드) 자리표시자**: 실제 SVG 렌더 전에는 3×3 비율(1:1 aspect-ratio)을 유지하는 자리표시자로 배치를 보여준다. `design-mockup.html`은 이 실제 비율·배치를 렌더링해야 한다.

### 4.3 breakpoint 별 동작

| 화면 폭 | 보드 | HUD |
| --- | --- | --- |
| ≥ 480px | 고정/여유 폭, 중앙 정렬 | 가로 배치(이동·시간 나란히) |
| 320px ~ 479px | 뷰포트에 맞춰 축소(`min(전체폭, 정사각)`), content overflow 없음 | **세로로 재배치** |

- 보드는 `width: min(100%, ...)` 기반으로 뷰포트에 맞춰 축소하며 320px 이상에서 가로 스크롤/overflow가 없어야 한다.

---

## 5. 컴포넌트·상태 명세 (Component & State Spec)

### 5.1 DOM 계약 (변경 금지)

| DOM ID | 컴포넌트 | 상태 | 인터랙션 |
| --- | --- | --- | --- |
| `puzzle-board` | 퍼즐 보드(SVG 루트) | 정적 컨테이너 | 타일 컨테이너 |
| `puzzle-tiles` | 타일 그룹(부모) | 타일이 붙는 곳 | 이동 시 SVG transform 슬라이딩 |
| `move-count` | 이동 횟수 표시 | 0 → n | 이동마다 +1 |
| `elapsed-time` | 경과 시간 표시 | 0 → 진행 | `playing` 진행·`paused` 정지·리셋 초기화 |
| `restart-button` | 재시작 control(주 실행) | 항상 사용 가능 | 클릭 → 리셋 후 새 `playing` |
| `clear-screen` | 클리어 화면 | `cleared`에서만 노출 | `role="status"` 상태 텍스트 |

| CSS class | 대상 |
| --- | --- |
| `puzzle` | 최상위 래퍼 |
| `puzzle__tile` | 개별 타일(숫자 1..8) |
| `puzzle__tile--empty` | 빈 칸 타일(숫자 없음) |
| `puzzle__hud` | HUD(이동 횟수·경과 시간) |
| `puzzle__clear` | 클리어 화면 스타일 |

### 5.2 상태별 화면 (start / playing / paused / cleared)

`design-mockup.html`은 아래 **네 상태를 모두** 렌더링합니다.

| 상태 | 시각 표현 | 상태 텍스트(화면+접근성 이름) |
| --- | --- | --- |
| `start` | 보드 준비(셔플 전), HUD 초기값(이동 0·시간 0), `restart-button` 활성 | "시작 준비" |
| `playing` | 셔플된 solvable 보드, 타일 조작 가능, 타이머 진행 | "진행 중" |
| `paused` | 보드 위 흐림/잠금 오버레이, 타이머 정지, 조작 잠금(재개 시 `playing`) | "일시 중지" |
| `cleared` | 보드 정렬(1..8, 마지막 빈 칸), `clear-screen`(role=status) 노출, 조작 종료 | "클리어!" |

- **색상 단독 의존 금지**: 각 상태는 위 상태 텍스트를 화면과 접근성 이름 양쪽에 노출한다.

### 5.3 인터랙션 상태(정적 표현)

| 요소 | default | hover | focus | active/disabled |
| --- | --- | --- | --- | --- |
| `puzzle__tile`(이동 가능) | `--color-tile` 배경 + `--shadow-tile` | 살짝 밝게/살짝 상승 | `--color-accent` 2px outline | 눌림 시 그림자 축소 |
| `puzzle__tile--empty` | 빈 칸(surface 톤) | 변화 없음 | 포커스 불가 | — |
| `restart-button` | `--color-accent` 배경 + 흰 텍스트 | 명도 소폭 상승 | `--color-accent` outline(대비 확보) | — |

- **후조건 불변식**: 초기화·취소·실패 뒤 상태와 진행 표시(`move-count`·`elapsed-time`)는 초기값으로 되돌아가고, 주 실행 control(`restart-button`)은 다시 사용 가능해야 한다.

---

## 6. 접근성 (Accessibility)

- 각 타일은 `aria-label`로 숫자를 노출하고 키보드(**Tab/Enter**)로 이동 가능하다.
- `restart-button`은 명시적 `aria-label`("게임 재시작")을 가진다.
- 클리어 화면(`clear-screen`)은 `role="status"`로 스크린리더에 상태 텍스트를 알린다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- focus 표시는 `--color-accent` outline으로 배경 대비 명확히 보이게 한다(포커스 소거 금지).

---

## 7. 반응형 (Responsive)

- **320px 이상**에서 퍼즐 보드가 뷰포트에 맞춰 축소되며 content overflow가 발생하지 않는다.
- HUD(이동 횟수·경과 시간)는 좁은 화면에서 **세로로 재배치**된다.
- 타일 숫자 크기(`--font-size-tile`)는 축소 화면에서도 가독성을 유지한다(필요 시 상대 단위로 스케일).

---

## 8. dev 구현 가이드 (Developer Guide)

developer(BF-1747)는 아래 순서로 frozen 계약을 그대로 구현합니다. selector·token 재정의 금지.

1. **토큰 선언**: `styles.css`와 `design-tokens.html`의 `:root`에 §2·§4.2의 9개 CSS 변수를 그대로 선언한다.
   - `design-tokens.html`의 색상 견본·타이포·간격·반경·그림자 카탈로그는 **하드코딩 없이** 위 변수를 `var(...)`로 참조한다.
2. **정적 서버 렌더**: `design-tokens.html`·`design-mockup.html`은 `python3 -m http.server` 등으로 열었을 때 **그 자체로 렌더링**돼야 한다(빌드·번들 불필요, 외부 의존 0건).
3. **마크업**: §5.1의 DOM ID·class를 그대로 사용한다. 타일은 시맨틱하게 포커스 가능(`Tab`/`Enter`)하게 만든다.
4. **상태 화면**: `design-mockup.html`에 §5.2의 start/playing/paused/cleared 네 화면을 `<section>`으로 모두 렌더한다. 각 화면은 §2·§3의 동일한 CSS 변수를 사용한다.
5. **자리표시자**: 게임 캔버스(보드)는 실제 3×3 비율·배치를 보여주는 자리표시자로 둔다(런타임 로직은 §5·§6 계약대로 `src/*`에서 구현).
6. **접근성·반응형**: §6·§7을 그대로 구현한다.

> ⚠️ 본 문서(designer 산출물)는 **런타임 HTML/CSS/JS를 생성하지 않는다**. 실제 파일 작성은 developer 소유(`design-tokens.html`·`design-mockup.html`·`index.html`·`src/*`·`styles.css`·`tests/*`).

---

## 9. mockup 참조 (Reference)

- 실행 설계: `docs/plans/BF-1738/implementation-plan.md` (frozen `ui-contract@v1` / `planning-contract@v1`).
- 토큰 시각 카탈로그: `svg-puzzle-slider/design-tokens.html` (developer 소유).
- 상태 시안: `svg-puzzle-slider/design-mockup.html` (developer 소유).
- 진입 페이지: `svg-puzzle-slider/index.html` (developer 소유).
