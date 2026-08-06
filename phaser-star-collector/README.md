# Star Collector — UI 계약 시각 명세 (BF-1713)

플래너가 동결한 Star Collector 게임 화면 UI 계약의 **시각 명세**입니다.
이 문서는 계약을 **렌더링**만 하며 selector·token·상태·경로를 변경하거나 재정의하지 않습니다(additive).
권위의 유일한 출처는 frozen Execution Blueprint이며, 상세 근거는
[`docs/plans/BF-1713/implementation-plan.md`](../docs/plans/BF-1713/implementation-plan.md) 입니다.

## 시각 산출물

| 파일 | 내용 |
| --- | --- |
| [`docs/design/BF-1713/design-tokens.html`](../docs/design/BF-1713/design-tokens.html) | CSS custom property로 선언한 디자인 토큰 카탈로그 |
| [`docs/design/BF-1713/design-mockup.html`](../docs/design/BF-1713/design-mockup.html) | start · playing · paused · gameover 네 상태의 정적 게임 화면 시안 |

> 정적 서버(`serve_root=.`, root-relative-static)로 열면 두 HTML은 그 자체로 렌더링됩니다.

## DOM ID (frozen — exact)

| id | 역할 | 접근성 |
| --- | --- | --- |
| `game-root` | 게임 전체 컨테이너 | — |
| `game-canvas` | Phaser 캔버스 마운트 대상 | — |
| `hud-score` | 점수 표시 | `aria-live="polite"` |
| `game-overlay` | 상태 오버레이 | `role="status"` |
| `overlay-title` | 상태명 텍스트 | 상태명 노출 |
| `restart-button` | 재시작 버튼 | `aria-label="게임 다시 시작"` |

## CSS class (frozen — exact)

- `hud`, `hud__score`
- `overlay`, `overlay--start`, `overlay--paused`, `overlay--gameover`
- `button`, `button--primary`

## 게임 상태 (frozen — exact)

`start` · `playing` · `paused` · `gameover`

전이 요약:

- `start → playing` (게임 시작)
- `playing → paused` (일시정지) / `paused → playing` (재개)
- `playing → gameover` (위험 충돌)
- `gameover → start` (재시작: 상태·점수·진행 표시 초기값 초기화)

각 상태의 화면 텍스트(색상 외 텍스트)는 시안에서 다음과 같이 노출됩니다.

| 상태 | 오버레이 class | 화면 텍스트(overlay-title) |
| --- | --- | --- |
| start | `overlay--start` | `게임 시작` |
| playing | — (오버레이 숨김, HUD 활성) | `점수: 0` (HUD) |
| paused | `overlay--paused` | `일시정지` |
| gameover | `overlay--gameover` | `게임 오버` |

## 디자인 토큰 (frozen — CSS 변수, exact)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#0f172a` | 배경 |
| `--color-player` | `#38bdf8` | 플레이어 |
| `--color-star` | `#fbbf24` | 별(star) |
| `--color-hazard` | `#ef4444` | 위험(hazard) |
| `--color-hud-text` | `#f8fafc` | HUD 텍스트 |
| `--font-hud-size` | `20px` | HUD 글자 크기 |
| `--font-title-size` | `40px` | 상태명 제목 크기 |
| `--space-hud-gap` | `12px` | HUD/레이아웃 간격 |
| `--radius-panel` | `12px` | 패널 모서리 반경 |

> 시각 명세용 additive 토큰(`--shadow-panel`, `--color-panel` 등)은 프레젠테이션 전용이며
> 위 frozen 토큰을 재정의하지 않습니다.

## 접근성 계약 (frozen)

- `#hud-score`는 `aria-live="polite"`로 점수 변경을 스크린리더에 알린다.
- `#restart-button`은 `aria-label="게임 다시 시작"`을 가진다.
- `#game-overlay`는 `role="status"`로 현재 게임 상태 텍스트를 전달한다.
- 방향키·스페이스(점프)·Enter(재시작)만으로 전체 플레이가 키보드로 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 반응형 계약 (frozen)

- 320px 이상 뷰포트에서 게임 캔버스와 HUD가 가로 overflow 없이 표시된다.
- 게임 캔버스는 4:3 종횡비를 유지하며 컨테이너 폭에 맞춰 축소된다.

## developer 핸드오프

- 이 명세의 selector·token·상태·접근성·반응형 계약을 그대로 `phaser-star-collector/` 런타임에 구현합니다.
- 시안(`design-mockup.html`)은 참조 가이드이며 픽셀 단위 일치 의무는 없습니다. 계약(selector·token·상태·접근성)은 그대로 따릅니다.
- 런타임 파일(`index.html`, `src/game.js`, `src/logic.js`, `tests/logic.test.js`)은 developer 소유입니다.
