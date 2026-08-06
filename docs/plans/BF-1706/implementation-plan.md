# BF-1706 구현 설계 — pixi-shooter (frozen)

- 관련 planner task: BF-1709
- 후속 병렬 착수: BF-1707 (designer), BF-1708 (developer)
- 이 문서는 frozen Execution Blueprint(`planning-contract@v1`, `ui-contract@v1`)의 값을 그대로 설명한다. 새 파일·새 역할을 추가하지 않는다.

## 1. 개요

pixi-shooter는 PixiJS 기반 고정형 슈팅 게임이다. 게임 로직과 렌더링을 분리된 모듈로 구현하고, 별도 빌드 파이프라인 없이 정적 서버 + CDN PixiJS로 실행한다.

## 2. 모듈 경계 (게임 로직 vs PixiJS 렌더링)

| 계층 | 파일 | 책임 |
|---|---|---|
| 순수 게임 로직 | `pixi-shooter/src/logic/gameLogic.js` | 이동, 발사, 스폰, 충돌, 점수, 상태전이(ready/playing/paused/gameover)를 PixiJS·DOM에 의존하지 않는 순수 함수/상태 객체로 구현. 단위 테스트 대상. |
| 렌더링 | `pixi-shooter/src/render/renderer.js` | PixiJS Application/Container/Graphics로 gameLogic의 상태를 시각화. 게임 규칙을 직접 판단하지 않고 상태를 읽어 그리기만 수행. |
| 엔트리 포인트 | `pixi-shooter/src/main.js` | DOM(`#game-root`, `#game-canvas`) 초기화, 방향키/Space 입력 바인딩, gameLogic·renderer 연결, 게임 루프 구동. |
| 정적 엔트리 | `pixi-shooter/index.html` | 게임 셸(`.game-shell`, `.game-shell__canvas-wrap`) 마크업과 ESM 스크립트 로드. |
| 테스트 | `pixi-shooter/tests/gameLogic.test.js` | gameLogic 순수 함수 단위 테스트. renderer/PixiJS는 테스트 대상이 아니다. |
| 문서 | `pixi-shooter/README.md`, `pixi-shooter/docs/design.md` | 프로젝트 개요/실행 방법, 디자인 계약 구체화 문서. |

경계 원칙: renderer.js와 main.js는 gameLogic.js의 상태를 소비만 하고, gameLogic.js는 PixiJS/DOM을 import하지 않는다. 이로써 게임 규칙은 PixiJS 없이도 단위 테스트가 가능하다.

## 3. 파일 배치 및 소유자 (frozen blueprint 값 그대로)

| 경로 | 소유자(frozen 값) | 상태 | 정책 |
|---|---|---|---|
| `pixi-shooter/README.md` | canonical work packet owner | active (frozen) | additive |
| `pixi-shooter/docs/design.md` | canonical work packet owner | active (frozen) | additive |
| `pixi-shooter/index.html` | developer | active (frozen) | additive |
| `pixi-shooter/src/logic/gameLogic.js` | developer | active (frozen) | additive |
| `pixi-shooter/src/main.js` | developer | active (frozen) | additive |
| `pixi-shooter/src/render/renderer.js` | developer | active (frozen) | additive |
| `pixi-shooter/tests/gameLogic.test.js` | developer | active (frozen) | additive |

모든 항목은 신규 생성(additive)이며, 이 목록 밖의 새 파일이나 역할을 추가하지 않는다. 소유자·상태 표기는 frozen blueprint 값을 그대로 옮긴 것이며 본 문서가 재정의하지 않는다.

## 4. 정적 서버 실행 방식

- 모듈 시스템: ESM(`<script type="module">`)만 사용한다.
- PixiJS 로드: 별도 번들러/빌드 파이프라인을 도입하지 않고 CDN에서 PixiJS를 로드한다.
- 서버: 저장소를 정적 파일 서버로 서빙(`serve_root=.`, `route_mapping=root-relative-static`)하며 `pixi-shooter/index.html`이 엔트리다.
- 제약: `pixi-shooter/` 외부 파일(예: `pixi-breakout/` 등 기존 파일)은 수정하지 않는다.

## 5. UI 계약 (frozen, exact 값)

### 5.1 컬러 팔레트 (HEX)

```
--color-bg-space: #05070f
--color-player: #4fd1ff
--color-enemy-linear: #ff5470
--color-enemy-zigzag: #ffb84f
--color-bullet-player: #e8fff3
--color-bullet-enemy: #ff8080
--color-explosion: #ffd23f
--color-hud-text: #f5f7ff
```

### 5.2 타이포그래피

```
--font-family-hud: 'Segoe UI', system-ui, sans-serif
--font-size-score: 20px
--font-size-message: 32px
```

### 5.3 레이아웃

```
--layout-hud-height: 64px
--layout-play-area-ratio: 9:16
```

- DOM id: `game-root`, `game-canvas`
- CSS class: `game-shell`, `game-shell__canvas-wrap`

### 5.4 게임 오브젝트 시각 명세

- 직진형 적: 삼각형, `--color-enemy-linear`(#ff5470)
- 지그재그형 적: 마름모, `--color-enemy-zigzag`(#ffb84f)
- 플레이어: `--color-player`(#4fd1ff)
- 플레이어 탄환: `--color-bullet-player`(#e8fff3), 적 탄환: `--color-bullet-enemy`(#ff8080)
- 폭발 이펙트: `--color-explosion`(#ffd23f)

색상뿐 아니라 형태(삼각형/마름모)로도 적 종류를 구분한다.

### 5.5 모션(전환 애니메이션)

frozen `ui-contract@v1`의 `design_tokens`에는 모션 지속시간(ms)/이징에 대한 별도 토큰이 포함되어 있지 않다. 본 문서는 packet에 주어진 exact 값만 기록하며 임의의 수치를 새로 만들어 동결하지 않는다. 상태전이(ready/playing/paused/gameover)는 별도 트랜지션 토큰이 확정되기 전까지 즉시 전환을 기본으로 하고, 필요 시 designer가 동일 `design_tokens` 네임스페이스에 `--motion-*` 토큰 추가를 이후 별도로 제안한다.

### 5.6 상태별 화면 구성

| 상태 | 구성 |
|---|---|
| `ready` | 시작 대기 화면 + 시작 안내 메시지(`--font-size-message`) |
| `playing` | HUD(점수, `--font-size-score`) + 플레이 영역(9:16) 렌더링 |
| `paused` | 일시정지 오버레이 + 재개 안내 |
| `gameover` | 결과 메시지 + 재시작 안내 |

모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름(aria)으로 함께 노출한다.

### 5.7 접근성 기준

- 적 종류는 색상뿐 아니라 형태로도 구분된다(직진형=삼각형, 지그재그형=마름모).
- HUD 텍스트(`--color-hud-text` #f5f7ff vs `--color-bg-space` #05070f)는 WCAG AA 4.5:1 이상 대비를 만족한다.
- 방향키(이동)와 Space(발사)만으로 시작-플레이-일시정지-재개-재시작 전체 플로우를 조작할 수 있다.
- 모든 상태는 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.8 반응형

게임 화면은 360px 이상 뷰포트에서 HUD와 플레이 영역이 잘리거나 overflow 없이 표시된다(`--layout-hud-height` 고정, `--layout-play-area-ratio` 9:16 유지).

## 6. Acceptance Criteria (Given/When/Then)

**AC1 — 모듈 경계**
- Given `pixi-shooter/src/logic/gameLogic.js`와 `pixi-shooter/src/render/renderer.js`가 구현되어 있을 때
- When gameLogic.js를 PixiJS 없이 단독 실행하면
- Then 이동/발사/스폰/충돌/점수/상태전이 로직이 오류 없이 동작한다(PixiJS/DOM 의존 없음).

**AC2 — UI 계약 exact 값**
- Given `pixi-shooter/docs/design.md`와 구현 파일이 작성되었을 때
- When 5.1~5.8의 토큰·상태·접근성 값을 대조하면
- Then 모든 값이 frozen 값과 정확히 일치한다(색상 HEX, 폰트, 레이아웃, 상태 구성, 접근성 기준).

**AC3 — 정적 서버 실행**
- Given 저장소를 정적 파일 서버로 서빙할 때
- When `pixi-shooter/index.html`을 로드하면
- Then 별도 빌드 없이 ESM + CDN PixiJS로 게임이 구동되고, `pixi-shooter/` 외부 파일은 변경되지 않은 상태로 유지된다.

**AC4 — 문서의 blueprint 충실성**
- Given 본 계획서가 커밋되었을 때
- When 후속 designer/developer가 파일·소유자·상태·후조건을 확인하면
- Then frozen blueprint에 없는 파일이나 역할이 추가되지 않았음을 확인한다.

## 7. Edge Case / 실패 케이스

- 방향키 좌+우 동시 입력: 마지막 입력 우선 또는 상쇄(구현 시 developer가 gameLogic 내부 규칙으로 결정, 문서 범위 밖의 세부 수치는 임의 동결하지 않음).
- Space 연타 시 발사 쿨다운으로 과도한 탄환 스폰을 방지해야 한다(구체 ms 값은 frozen 토큰에 없으므로 developer가 gameLogic 내부 상수로 관리하고 design.md에 노출하지 않는다).
- `paused` 상태에서 뷰포트 리사이즈: 레이아웃 비율(9:16)과 HUD 높이(64px)를 유지한 채 재배치되어야 한다.
- `gameover` 이후 재시작: 상태·점수·진행 표시·스폰 타이머가 초기값으로 복귀하고 주 실행 control(Space)을 다시 사용할 수 있어야 한다(취소/실패 후 재사용 가능 invariant).
- 360px 미만 초소형 뷰포트: frozen 접근성/반응형 기준의 범위 밖이며 본 작업에서 별도 처리하지 않는다.
- PixiJS CDN 로드 실패: frozen 계약에 fallback 명세가 없으므로 본 작업 범위 밖이다.

## 8. 비목표 (Non-goals)

- 새 파일/새 역할 추가 금지 (frozen blueprint 파일 목록이 유일한 권위)
- `pixi-shooter/` 외부 파일(예: `pixi-breakout/`) 수정 금지
- 디자인 시안 작성은 designer(BF-1707) 담당, 코드 구현은 developer(BF-1708) 담당 — 본 문서는 설계 경계만 정의한다.
