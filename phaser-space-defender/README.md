# Space Defender — UI 계약 시각 명세 (BF-1714)

> 이 문서는 **planner(BF-1719)가 동결한 UI 계약의 시각 명세**입니다.
> designer(BF-1717)가 작성하며, developer(BF-1718)는 이 계약과 시안을 그대로 구현합니다.
> **selector·token·상태 텍스트를 변경하거나 재정의하지 마세요.** 모든 산출물은 additive 로만 추가합니다.
> 파일 소유권·상태 계약의 유일한 권위는 frozen blueprint 이며, 이 문서는 이를 재정의하지 않고 시각화합니다.

세로형 슈팅 게임. 함선이 좌우 이동하며 스페이스로 발사, 낙하하는 적을 요격합니다.

---

## 산출물 (designer)

| 파일 | 역할 |
| --- | --- |
| [`docs/design/BF-1714/design-tokens.html`](../docs/design/BF-1714/design-tokens.html) | 9개 frozen 토큰을 `:root` CSS custom property 로 선언하고 견본이 실제로 참조 |
| [`docs/design/BF-1714/design-mockup.html`](../docs/design/BF-1714/design-mockup.html) | start·playing·paused·gameover 4개 상태 정적 시안, 동일 CSS 변수 참조 |
| `phaser-space-defender/README.md` | 본 문서 — UI 계약 시각 명세 |

두 HTML 은 정적 서버로 열면 그 자체로 렌더링됩니다. 런타임 HTML/CSS/JS 는 생성하지 않습니다.

---

## 1. 디자인 토큰 (frozen · 변경 금지)

`:root` CSS custom property 로 선언하며, developer 는 `index.html` 에서 동일 값을 참조합니다.

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-bg-space` | `#0b0e1a` | 우주 배경 |
| `--color-panel` | `#151a2e` | 패널 / 오버레이 배경 |
| `--color-accent-primary` | `#00e5ff` | 강조 (주 실행 / 함선) |
| `--color-danger` | `#ff3b6b` | 위험 / 게임 오버 |
| `--color-text-primary` | `#e8ecf8` | 기본 텍스트 |
| `--space-hud-gap` | `12px` | HUD 지표 간격 |
| `--radius-panel` | `8px` | 패널 모서리 반경 |
| `--font-size-score` | `24px` | 점수 폰트 크기 |
| `--font-size-title` | `40px` | 타이틀 폰트 크기 |

- `--shadow-panel` 은 위 frozen 색상에서 파생한 **additive** 토큰이며 frozen 값을 재정의하지 않습니다.

---

## 2. DOM ID 계약 (11개 · frozen)

| ID | 용도 | 시안 위치 |
| --- | --- | --- |
| `game-root` | 게임 전체 루트 컨테이너 | 전 상태 |
| `game-canvas` | Phaser 렌더 캔버스 (2:3 세로 비율) | playing |
| `hud-score` | 현재 점수 텍스트 | HUD |
| `hud-lives` | 남은 목숨 텍스트 | HUD |
| `hud-highscore` | 최고 점수 텍스트 | HUD |
| `start-screen` | 시작 화면 오버레이 | start |
| `start-button` | 게임 시작 버튼 | start |
| `pause-overlay` | 일시정지 오버레이 | paused |
| `gameover-screen` | 게임 오버 화면 | gameover |
| `final-score` | 최종 점수 텍스트 | gameover |
| `restart-button` | 다시 시작 버튼 | gameover |

> 시안(`design-mockup.html`)은 각 ID 의 유일성을 위해 상태별 보드에 1회씩 배치했습니다.
> 런타임 구현에서는 단일 `#game-root` 안에 HUD·캔버스·3개 오버레이가 모두 포함되고, 상태에 따라 오버레이 표시가 토글됩니다.

## 3. CSS class 계약 (9개 · frozen)

| class | 용도 |
| --- | --- |
| `hud` | HUD 컨테이너 (`--space-hud-gap` 로 지표 간격) |
| `hud__stat` | HUD 개별 지표 (점수 / 목숨 / 최고점수) |
| `screen` | 오버레이 화면 공통 |
| `screen--start` | 시작 화면 변형 |
| `screen--pause` | 일시정지 화면 변형 |
| `screen--gameover` | 게임 오버 화면 변형 |
| `btn` | 버튼 공통 |
| `btn--primary` | 주 실행 버튼 변형 |
| `canvas-frame` | 캔버스 프레임 |

---

## 4. 상태 계약 (frozen)

각 상태는 색상만이 아니라 **상태명을 화면 텍스트와 접근성 이름으로 노출**합니다.

| 상태 | 표시 오버레이 | 화면 텍스트 | HUD |
| --- | --- | --- | --- |
| `start` | `#start-screen` (`.screen--start`) | 타이틀 + "게임 시작" `#start-button` | 초기값 (점수 0 / 목숨 초기 / 최고점수) |
| `playing` | 없음 (캔버스 활성) | — | 점수·목숨·최고점수 실시간 갱신 |
| `paused` | `#pause-overlay` (`.screen--pause`) | "일시정지" 텍스트 | 정지 시점 값 유지 |
| `gameover` | `#gameover-screen` (`.screen--gameover`) | "게임 오버" + `#final-score` + "다시 시작" `#restart-button` | 최종 점수 반영 |

- **후조건**: gameover 이후 `#restart-button` → start 초기값(점수 0 / 목숨 초기)으로 복귀, 주 실행 control 재사용 가능.
- `paused` ↔ `playing` 은 `P` 키 토글로 전환하며 진행 상태(점수·목숨·위치)를 보존합니다.

---

## 5. 접근성 계약 (frozen)

1. `#start-button` / `#restart-button` 은 명시적 `aria-label`("게임 시작" / "다시 시작")을 가집니다.
2. 키보드: **← →** 함선 이동 · **Space** 발사 · **P** 일시정지 토글.
3. 점수·목숨·최고점수는 `.hud__stat` 텍스트로 노출 — 색상만으로 정보를 전달하지 않습니다.
4. 4개 상태 모두 상태명을 화면 텍스트와 접근성 이름(오버레이 `aria-label`)으로 노출합니다.

## 6. 반응형 계약 (frozen)

1. **320px 이상**에서 HUD·오버레이 텍스트에 overflow 가 발생하지 않습니다 (HUD `flex-wrap`, 유동 폭).
2. 게임 캔버스는 **세로형(2:3) 비율을 유지**하며 뷰포트 높이에 맞춰 축소됩니다 (`aspect-ratio` + `max-height`, 구현 시 `Phaser.Scale.FIT`).

---

## 7. developer 구현 가이드

1. `index.html` `:root` 에 §1 의 9개 토큰을 **동일 값**으로 선언 — 하드코딩 색상 금지, 모두 변수 참조.
2. §2 DOM ID · §3 class 를 그대로 마크업. 단일 `#game-root` 안에 HUD·`.canvas-frame > #game-canvas`·3개 오버레이 배치.
3. 상태 전환은 오버레이 표시 토글로 처리 (Phaser 씬은 단일 `GameScene`).
4. §5 접근성(aria-label·키보드·텍스트 노출)·§6 반응형 준수.
5. 시안(`design-mockup.html`)은 **참조 가이드** — 픽셀 단위 일치 의무는 없고 selector·token·상태 텍스트 계약 준수가 우선입니다.
