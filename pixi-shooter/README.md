# pixi-shooter

PixiJS 기반 고정형(9:16) 세로 슈팅 게임. 별도 빌드 파이프라인 없이 정적 파일 서버와 CDN PixiJS(ESM)만으로 실행한다.

이 문서는 planner가 동결한 `ui-contract@v1`의 시각 명세를 요약한다. 상세 내용(모션, 화면 문구, 오브젝트 형태, 접근성, dev 구현 가이드)은 [`docs/design.md`](./docs/design.md)를 참조한다.

## 실행 방법

1. 저장소 루트를 정적 파일 서버로 서빙한다(`serve_root=.`, `route_mapping=root-relative-static`). 별도 빌드/번들 단계는 없다.
2. `pixi-shooter/index.html`을 엔트리로 브라우저에서 연다.
3. PixiJS는 CDN에서 ESM(`<script type="module">`)으로 로드한다. 로컬 의존성 설치는 필요하지 않다.

> `pixi-shooter/` 외부 파일(`pixi-breakout/` 등 기존 프로젝트)은 이 저장소와 무관하며 수정 대상이 아니다.

## 모듈 구조

| 파일 | 책임 |
|---|---|
| `index.html` | 게임 셸(`.game-shell`, `.game-shell__canvas-wrap`) 마크업과 ESM 스크립트 로드 |
| `src/logic/gameLogic.js` | 이동/발사/스폰/충돌/점수/상태전이(ready·playing·paused·gameover)를 PixiJS·DOM 의존 없이 구현한 순수 로직 |
| `src/render/renderer.js` | gameLogic 상태를 PixiJS로 시각화(그리기 전용, 규칙 판단 없음) |
| `src/main.js` | DOM(`#game-root`, `#game-canvas`) 초기화, 입력 바인딩, 게임 루프 구동 |
| `tests/gameLogic.test.js` | gameLogic 순수 함수 단위 테스트 |

## UI 계약 요약 (frozen — 값은 `docs/design.md` §2~§4 참조)

- 컬러: `--color-bg-space #05070f`, `--color-player #4fd1ff`, `--color-enemy-linear #ff5470`, `--color-enemy-zigzag #ffb84f`, `--color-bullet-player #e8fff3`, `--color-bullet-enemy #ff8080`, `--color-explosion #ffd23f`, `--color-hud-text #f5f7ff`
- 타이포: `--font-family-hud: 'Segoe UI', system-ui, sans-serif`, `--font-size-score: 20px`, `--font-size-message: 32px`
- 레이아웃: `--layout-hud-height: 64px`, `--layout-play-area-ratio: 9:16`
- DOM id: `game-root`, `game-canvas` · CSS class: `game-shell`, `game-shell__canvas-wrap`

## 조작 방법

- 방향키 좌/우: 플레이어 함선 이동
- Space: 시작(ready) / 발사(playing) / 재개(paused → playing) / 재시작(gameover → ready)
- 일시정지(playing → paused)는 별도 키가 아닌 창 포커스 상실/탭 비활성 시 자동 전이된다(상세: `docs/design.md` §7.2).

## 접근성

- 적 종류는 색상뿐 아니라 형태로도 구분된다(직진형=삼각형, 지그재그형=마름모).
- HUD/메시지 텍스트는 배경 대비 약 18.8:1로 WCAG AA(4.5:1) 기준을 충족한다.
- 방향키+Space만으로 시작-플레이-일시정지-재개-재시작 전체 플로우 조작이 가능하다.
- 모든 상태는 화면 텍스트와 접근성 이름(`role="status"`, `aria-live="polite"`)으로 상태명을 동일하게 노출한다.

## 반응형

360px 이상 뷰포트에서 HUD(`--layout-hud-height` 고정)와 플레이 영역(`--layout-play-area-ratio` 9:16 유지)이 잘리거나 overflow 없이 표시된다.

## 문서

- [`docs/design.md`](./docs/design.md) — 디자인 시스템, 게임 오브젝트 시각 명세, 모션 명세, 상태별 화면, 접근성 (BF-1707)
- [`../docs/plans/BF-1706/implementation-plan.md`](../docs/plans/BF-1706/implementation-plan.md) — 모듈 경계, 파일 소유, 실행 설계 (BF-1706, frozen)
