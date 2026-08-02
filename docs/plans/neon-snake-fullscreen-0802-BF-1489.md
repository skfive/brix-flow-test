# 네온 스네이크 전체화면 실행 설계 및 UI 계약 — neon-snake-fullscreen-0802 (BF-1489)

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint의 `ui-contract@v1`
(sha256:a253bef00b56013f2ca578b7d057f940e02e9782a140d042ed34005316450072)이
정한 파일 목록·DOM ID/class·상태·디자인 토큰·접근성·반응형 요구사항을
**재정의 없이** 그대로 서술하고, 그 위에서 designer/developer가 병렬로 따를
게임 규칙과 순수 함수 실행 설계를 구체화한다. selector·상태·token 값은
frozen 목록 그대로이며, 본 문서는 신규 파일이나 신규 역할을 추가하지 않는다.

이 task(BF-1492)의 산출물 범위는 본 markdown 1개 파일
(`docs/plans/neon-snake-fullscreen-0802-BF-1489.md`)이며, 런타임 HTML/CSS/JS와
테스트(`demo/neon-snake-fullscreen-0802/index.html`,
`demo/neon-snake-fullscreen-0802/src/game.js`,
`demo/neon-snake-fullscreen-0802/src/main.js`,
`demo/neon-snake-fullscreen-0802/styles.css`,
`demo/neon-snake-fullscreen-0802/tests/game.test.js`)는 developer(BF-1491)
소유로 frozen되어 있어 본 task에서 생성하지 않는다. 시각 명세
(`docs/design/neon-snake-fullscreen-0802-BF-1489.md`)는 designer(BF-1490)
소유로 frozen되어 있어 본 task에서 생성하지 않는다.

frozen 불변식: 기존 코드 검색·복사·import·재사용, 패키지 추가, API/DB/외부
네트워크 사용을 금지한다. 본 데모는 서버 데이터 모델·네트워크 호출이 없는
**클라이언트 전용** 아케이드이며, 유일한 영속 저장소는 브라우저
`localStorage`(최고 점수)뿐이다.

## 1. 개요

- 대상 라우트: `/demo/neon-snake-fullscreen-0802`
- 진입 파일(developer 소유, frozen): `demo/neon-snake-fullscreen-0802/index.html`
- 성격: viewport 전체(`100vw × 100dvh`)를 채우는 네온 테마 스네이크. 방향키
  또는 WASD로 뱀을 조종해 먹이를 먹으며 성장하고, 먹은 개수에 따라 속도가
  점진적으로 빨라진다. 벽 또는 자기 몸에 충돌하면 게임이 끝나며 최고 점수는
  `localStorage`에 유지된다.
- 사용자 경험 목표: 시작/일시정지/재개/게임오버/다시 시작 흐름 전체가 언제나
  예측 가능하게 동작하고, 실패(충돌)나 중단(일시정지·다시 시작) 후에도 주
  실행 control(시작/재시작 control)이 즉시 다시 사용 가능해야 한다(frozen
  불변식: 초기화·취소·실패 뒤 상태·진행 표시를 초기값으로 되돌리고 주 실행
  control을 다시 사용할 수 있어야 한다).

## 2. Frozen 산출물 및 소유권

frozen Blueprint가 고정한 파일·소유자는 아래와 같으며, 본 문서는 이 목록을
그대로 서술할 뿐 추가·재배정하지 않는다(모든 파일 additive 정책).

| 파일 | 소유 역할 | 성격 |
| --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/index.html` | developer | 진입 파일 |
| `demo/neon-snake-fullscreen-0802/src/game.js` | developer | 순수 게임 로직(§5) |
| `demo/neon-snake-fullscreen-0802/src/main.js` | developer | DOM/canvas 바인딩·렌더링·입력 |
| `demo/neon-snake-fullscreen-0802/styles.css` | developer | 스타일 |
| `demo/neon-snake-fullscreen-0802/tests/game.test.js` | developer | 단위 테스트 |
| `docs/design/neon-snake-fullscreen-0802-BF-1489.md` | designer | 시각 명세 |
| `docs/plans/neon-snake-fullscreen-0802-BF-1489.md` (본 문서) | planner | 실행 설계 |

파일 소유권·상태 계약의 유일한 권위는 frozen blueprint이며 본 planner 문서는
이를 재정의하지 않는다.

## 3. UI 계약 (frozen, 재정의 금지)

### 3.1 DOM 구조

```
#snake-stage (.stage)
├─ <canvas> #snake-canvas (.stage__canvas)   ── role="img" + aria-label
├─ .hud
│   ├─ #hud-score      (.hud__metric)
│   ├─ #hud-highscore  (.hud__metric)
│   └─ #hud-speed      (.hud__metric)
├─ #screen-start    (.overlay.overlay--start)     ── #action-start (.overlay__button)
├─ #screen-pause    (.overlay.overlay--pause)
├─ #screen-gameover (.overlay.overlay--gameover)  ── #action-restart (.overlay__button)
└─ #sr-status                                     ── aria-live="polite"
```

frozen DOM ID(11개): `snake-stage`, `snake-canvas`, `hud-score`,
`hud-highscore`, `hud-speed`, `screen-start`, `screen-pause`,
`screen-gameover`, `action-start`, `action-restart`, `sr-status`.

frozen class(10개): `stage`, `stage__canvas`, `hud`, `hud__metric`,
`overlay`, `overlay--start`, `overlay--pause`, `overlay--gameover`,
`overlay__button`, `is-hidden`.

- `is-hidden`은 현재 상태에서 비활성인 overlay를 감추는 공통 유틸 class이다.
  각 overlay는 자신이 활성인 상태에서만 노출되고 그 외에는 `is-hidden`을
  부여한다(§3.2 매핑).
- HUD 항목의 내부 wrapper 구조, canvas 밖 추가 장식 요소의 배치는 frozen
  selector 범위 밖이므로 developer 재량이나, 위 ID/class 집합은 변경·재정의할
  수 없다.

### 3.2 상태 모델 (frozen) 및 화면 매핑

상태는 `ready | running | paused | gameover` 4가지이며, 각 상태의 overlay
노출 규칙과 화면 텍스트는 아래와 같다. 모든 상태는 색상만으로 구분하지 않고
상태명을 화면 텍스트와 접근성 이름으로 노출한다(frozen 접근성 요건).

| 상태 | 노출 overlay | 감춤(`is-hidden`) | 화면 텍스트(예시, 문구는 designer 소관) |
| --- | --- | --- | --- |
| `ready` | `screen-start` | pause·gameover | "준비됨 — 시작을 눌러 플레이" + `action-start` |
| `running` | (없음) | start·pause·gameover | overlay 없음, HUD만 노출 |
| `paused` | `screen-pause` | start·gameover | "일시정지" |
| `gameover` | `screen-gameover` | start·pause | "게임 오버 · 점수/최고 점수" + `action-restart` |

`sr-status`(`aria-live="polite"`)는 상태 전이와 점수 변화를 텍스트로
안내한다(예: "게임 시작", "일시정지", "게임 오버, 점수 120, 최고 점수 200").

### 3.3 디자인 토큰 (frozen, 값 변경 금지)

| 토큰 | 값 | 권장 용도 |
| --- | --- | --- |
| `--neon-primary` | `#39ff14` | 뱀 몸통·주 강조(네온 그린) |
| `--neon-secondary` | `#00e5ff` | 뱀 머리·보조 강조(시안) |
| `--neon-food` | `#ff2d95` | 먹이 색상(네온 핑크) |
| `--bg-night` | `#050510` | `snake-stage`/`snake-canvas` 배경 |
| `--overlay-scrim` | `rgba(5,5,16,0.55)` | overlay 반투명 스크림 |
| `--hud-gap` | `16px` | `hud` 내부 항목 간격 |

토큰 값과 이름은 frozen이며 designer/developer가 재정의하지 않는다. 구체적
글로우 강도·그림자·타이포는 designer 문서 소관이나 위 토큰 값을 벗어나지
않는다.

### 3.4 접근성 (frozen)

1. `snake-canvas`는 `role="img"`와 명시적 `aria-label`(예: "네온 스네이크
   게임 보드")을 가진다.
2. `sr-status`는 `aria-live="polite"`로 점수·상태 전환을 텍스트로 안내한다.
3. `action-start`와 `action-restart`는 각각 `aria-label`과 `focus-visible`
   포커스 표시를 가진다.
4. 방향키(`ArrowUp/Down/Left/Right`)와 WASD 이동, `Space` 또는 `P`
   일시정지/재개 키보드 조작을 모두 지원한다(§7).
5. `prefers-reduced-motion: reduce`일 때 글로우·파티클 애니메이션을
   비활성화한다(정적 렌더로 대체).
6. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성
   이름으로 노출한다.

### 3.5 반응형 (frozen)

1. `snake-stage`는 `100vw × 100dvh`를 채우고 body 스크롤이 발생하지 않는다
   (`overflow: hidden`, `margin: 0`).
2. `devicePixelRatio`와 `resize`에 대응해 `snake-canvas`의 backing store
   해상도를 재계산한다(§8).
3. 320px 이상 및 모바일 스와이프 환경에서 HUD/overlay가 게임 영역
   (`snake-canvas` 격자 렌더 영역)을 축소하지 않는다(HUD/overlay는 게임
   위에 겹쳐 표시, 레이아웃 flow에서 canvas 크기를 잠식하지 않음).

구체적 breakpoint·시각 표현은 designer 문서
(`docs/design/neon-snake-fullscreen-0802-BF-1489.md`) 소관이며, 본 문서는 위
불변식만 frozen으로 서술한다.

## 4. 게임 규칙 설계 (본 task의 실행 설계 — developer 구현 기준)

frozen Blueprint는 selector·상태·token만 고정하며 격자 크기·속도·점수의
구체적 수치 규칙은 정의하지 않는다. 아래는 developer(BF-1491)가 §5 순수
함수로 구현해야 하는 이번 task의 게임 규칙 설계이며, §9 테스트가 이 값을
검증 기준으로 삼는다.

| 상수 | 값 | 설명 |
| --- | --- | --- |
| `GRID_COLS` | `28` | 논리 격자 가로 칸 수(0..27) |
| `GRID_ROWS` | `28` | 논리 격자 세로 칸 수(0..27) |
| `INITIAL_SNAKE_LENGTH` | `3` | 시작 시 뱀 길이 |
| `INITIAL_DIRECTION` | `'right'` | 시작 진행 방향 |
| `INITIAL_STEP_MS` | `140` | 속도 레벨 0의 tick 간격(ms) |
| `SPEED_STEP_MS_DECREMENT` | `8` | 레벨 1당 tick 간격 감소량(ms) |
| `MIN_STEP_MS` | `60` | tick 간격 하한(속도 상한) |
| `SPEED_UP_EVERY_N_FOODS` | `3` | 먹이 N개마다 속도 레벨 +1 |
| `SCORE_PER_FOOD` | `10` | 먹이 1개 점수 |
| `HIGH_SCORE_STORAGE_KEY` | `'neon-snake-fullscreen-0802:highscore'` | `localStorage` 키 |

방향 벡터(격자 좌표계, x→오른쪽 증가, y→아래 증가):
`right=(+1,0)`, `left=(-1,0)`, `up=(0,-1)`, `down=(0,+1)`.
역방향 쌍: `left↔right`, `up↔down`.

규칙 서술:

- **역방향 입력 방지**: 현재 *커밋된* 진행 방향의 정반대 방향으로는 전환할 수
  없다. `setDirection`은 입력 방향이 커밋된 `direction`의 반대이면 무시하고,
  그렇지 않으면 `nextDirection`에만 기록한다. `step` 시점에 `nextDirection`을
  `direction`으로 커밋한다(한 tick 내 연속 입력으로 인한 180° 반전 즉사
  버그 방지 — 항상 *커밋된* 방향 기준으로 판정).
- **먹이 생성(뱀과 겹치지 않음)**: 새 먹이는 뱀이 점유하지 않은 빈 칸
  집합에서만 선택한다. 빈 칸 목록을 만든 뒤 주입된 난수(`rng`, 기본
  `Math.random`) 인덱스로 하나를 고른다. 빈 칸이 0이면(격자 만석) 게임을
  `gameover`로 종료한다(§6.7, 클리어성 종료).
- **점진적 속도 증가**: 먹이를 먹을 때마다 `foodsEaten += 1`. `foodsEaten`이
  `SPEED_UP_EVERY_N_FOODS`의 배수가 되면 `speedLevel += 1`, tick 간격을
  `stepMs = max(MIN_STEP_MS, INITIAL_STEP_MS - speedLevel * SPEED_STEP_MS_DECREMENT)`
  로 재계산한다. `stepMs`는 `MIN_STEP_MS` 미만으로 내려가지 않는다.
- **점수·성장**: 먹이를 먹으면 `score += SCORE_PER_FOOD`, 그 tick에는 꼬리를
  제거하지 않아 뱀이 1칸 성장한다. 먹지 않은 tick에는 머리를 추가하고 꼬리를
  제거해 길이를 유지한다.
- **최고 점수(localStorage)**: 게임이 `gameover`로 전이될 때 `score`가
  `highScore`보다 크면 `highScore = score`로 갱신한다. 순수 함수는 state의
  `highScore`만 갱신하며, 실제 `localStorage` 읽기/쓰기(`HIGH_SCORE_STORAGE_KEY`)는
  `main.js`가 side-effect로 수행한다(초기 로드 시 읽어 `createInitialState`에
  주입, `gameover` 시 기록).
- **충돌·종료**: 다음 머리 위치가 격자 밖(벽) 또는 자기 몸이면 `gameover`로
  전이한다(§5 자기충돌 판정 주의사항 포함). 게임 종료 조건은 충돌과 만석뿐
  이며 타이머는 없다.

시각적 표현(글로우, 파티클, 셀 모양, 그라디언트)은 designer 문서 소관이며 본
절은 격자 상태 계약과 수치 규칙만 정의한다.

## 5. 순수 함수 계약 (`src/game.js`, DOM 비의존)

`src/game.js`는 DOM/`window`/`localStorage`에 접근하지 않는 순수 함수 집합으로
구현하여 `node --test`로 브라우저 없이 검증 가능해야 한다. `src/main.js`가 DOM
이벤트·`localStorage`·`requestAnimationFrame`을 이 함수들에 위임하고 반환된
state로 canvas를 렌더링한다.

| 함수 | 입력 | 동작 |
| --- | --- | --- |
| `createInitialState(options?)` | `{highScore?, cols?, rows?}` | `status:'ready'`, 중앙 수평 3칸 뱀(머리가 배열 첫 요소), `direction/nextDirection:'right'`, `food:null`, `score:0`, `highScore:options.highScore ?? 0`, `foodsEaten:0`, `speedLevel:0`, `stepMs:INITIAL_STEP_MS` 반환 |
| `startGame(state, rng?)` | state, 난수 | `ready → running`. 첫 먹이를 `spawnFood`로 배치. `ready`가 아니면 no-op(state 그대로 반환) |
| `setDirection(state, dir)` | state, `'up'\|'down'\|'left'\|'right'` | `running`에서만: `dir`가 커밋된 `direction`의 반대가 아니면 `nextDirection = dir`. 반대이거나 `running`이 아니면 no-op |
| `step(state, rng?)` | state, 난수 | `running`에서만: `nextDirection` 커밋 → 이동 → 벽/자기충돌 시 `gameover`(+`highScore` 갱신), 먹이 섭취 시 성장·점수·속도·새 먹이, 아니면 꼬리 제거. 그 외 상태면 no-op |
| `pauseGame(state)` | state | `running → paused`. 그 외 no-op |
| `resumeGame(state)` | state | `paused → running`. 그 외 no-op |
| `restartGame(state)` | state | 모든 status에서 `ready`로 전이, `createInitialState({highScore: state.highScore})`와 동일 값으로 리셋(최고 점수는 보존) |
| `spawnFood(snake, rng?, cols?, rows?)` | 뱀 배열, 난수 | 뱀이 점유하지 않은 빈 칸 중 하나를 `rng`로 선택해 반환. 빈 칸이 없으면 `null` 반환 |

세부 계약:

- 모든 함수는 인자 state를 변경하지 않고 새 state를 반환한다(불변성).
- `step` 자기충돌 판정: `willEat`(다음 머리가 현재 먹이 좌표와 일치)이 아니면
  이번 tick에 꼬리가 비므로, 다음 머리가 **꼬리를 제외한** 몸과 겹칠 때만
  충돌로 본다. `willEat`이면 성장하므로 전체 몸과 비교한다.
- `rng`는 `[0,1)` 실수를 반환하는 함수이며 기본값은 `Math.random`. 테스트는
  결정론적 stub `rng`를 주입해 먹이 위치를 고정한다.
- `running`이 아닌 상태에서 `setDirection`/`step`이 호출되면 예외 없이 입력
  state를 그대로 반환한다.

## 6. 상태 전이 시나리오 (Given/When/Then)

### 6.1 게임 시작
- Given `status === 'ready'`(score 0, snake 3칸, food null)
- When `startGame(state, rng)` 호출(`action-start` 클릭 또는 Enter/Space)
- Then `status = 'running'`, 뱀과 겹치지 않는 첫 `food`가 배치되고,
  `sr-status`가 시작을 안내한다.

### 6.2 먹이 섭취 및 성장
- Given `status === 'running'`, 다음 머리 위치가 `food` 좌표와 일치
- When `step(state, rng)` 호출
- Then `score += 10`, 뱀 길이 +1(꼬리 유지), `foodsEaten += 1`, 뱀과 겹치지
  않는 새 `food` 배치.

### 6.3 속도 증가
- Given `status === 'running'`, `foodsEaten`이 이번 섭취로
  `SPEED_UP_EVERY_N_FOODS`(3)의 배수 도달
- When `step`이 섭취를 처리
- Then `speedLevel += 1`, `stepMs = max(60, 140 - speedLevel*8)`로 감소
  (예: 레벨 1 → 132ms, 레벨 2 → 124ms). `hud-speed`가 갱신된 속도 레벨을
  노출한다.

### 6.4 역방향 입력 방지
- Given `status === 'running'`, `direction === 'right'`
- When `setDirection(state, 'left')`(즉시 반대)
- Then `nextDirection` 변화 없음(입력 무시). 반대로 `setDirection(state,'up')`
  후 같은 tick에 `setDirection(state,'left')`를 호출해도 `left`는 커밋된
  `right`의 반대라 무시되어 180° 반전 즉사가 발생하지 않는다.

### 6.5 벽/자기 충돌 → 게임 오버
- Given `status === 'running'`, 다음 머리가 격자 밖 또는 자기 몸(꼬리 제외
  규칙 적용)과 충돌
- When `step` 호출
- Then `status = 'gameover'`, `score > highScore`이면 `highScore = score`.
  이후 `setDirection`/`step`은 no-op. `sr-status`가 게임 오버와 최종/최고
  점수를 안내하고 `screen-gameover`가 노출된다.

### 6.6 일시정지 → 재개
- Given `status === 'running'`
- When `pauseGame(state)`(`Space` 또는 `P`, `screen-pause` 노출)
- Then `status = 'paused'`, tick 진행이 멈춘다.
- Given `status === 'paused'`
- When `resumeGame(state)`(`Space` 또는 `P`)
- Then `status = 'running'` 복귀, 정지 시점의 뱀 위치·score·speedLevel·food가
  그대로 이어진다.

### 6.7 다시 시작 / edge case
- **다시 시작**: `status`가 `running`/`paused`/`gameover` 중 무엇이든
  `restartGame(state)` 호출 시 `ready`로 되돌아가고 snake/score/food/
  foodsEaten/speedLevel/stepMs가 초기값으로 리셋되며 `highScore`는 보존,
  `screen-start`와 `action-start`가 즉시 다시 사용 가능하다(frozen 불변식).
- `ready`/`paused`/`gameover`에서 `step` 또는 `setDirection` 호출 시 no-op.
- `running`이 아닐 때 `pauseGame`/`resumeGame` 호출 시 no-op.
- 격자 만석(빈 칸 0)에서 먹이를 먹으면 `spawnFood`가 `null`을 반환하며
  `status = 'gameover'`로 종료(클리어성 종료, 예외 없음).
- 커밋된 방향과 동일한 방향으로 `setDirection` 호출 시 상태 변화 없음(안전).

## 7. 키보드 상호작용 상세 (frozen §3.4-4 구체화)

- `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` 및 `W`/`A`/`S`/`D`(대소문자
  무관): 각각 up/down/left/right로 `setDirection` 트리거. 역방향은 §6.4 규칙에
  따라 무시된다.
- `Space` 또는 `P`(대소문자 무관): `running`이면 `pauseGame`,
  `paused`이면 `resumeGame`으로 토글. `ready`/`gameover`에서 `Space`/`Enter`는
  포커스된 주 control(`action-start`/`action-restart`)의 네이티브 activation을
  따른다(네이티브 `<button>` 권장).
- 게임 조작 키가 페이지 스크롤 등 기본 동작을 유발하지 않도록 `running`/
  `paused` 상태에서 방향/일시정지 키의 기본 동작을 막는 것은 developer 재량
  이며, 정확한 포커스 위임 구현도 developer 재량이다.

## 8. 반응형·canvas 렌더링 규칙 (frozen §3.5 구체화)

- `snake-stage`는 `100vw × 100dvh`를 채우고 `body`는 `margin:0; overflow:hidden`
  으로 스크롤이 발생하지 않는다.
- `snake-canvas` backing store 크기는 `resize`/`orientationchange` 및
  `devicePixelRatio` 변경 시 `canvas.width = cssWidth * dpr`,
  `canvas.height = cssHeight * dpr`로 재계산하고 컨텍스트를 dpr 스케일한다.
- 논리 격자(`28×28`)는 정사각 셀로 렌더한다: `cell = floor(min(cssW, cssH) / 28)`
  로 셀 크기를 정하고 격자를 stage 중앙에 배치(레터박스)하여 종횡비와
  무관하게 왜곡 없이 표시한다. 게임 로직(§5)은 뷰포트 크기와 독립적이다.
- HUD/overlay는 canvas 위에 겹쳐(absolute/overlay) 표시하며 게임 격자 영역을
  레이아웃 flow에서 잠식하지 않는다. HUD 항목 간격은 `--hud-gap`(16px)을
  일관 적용한다.

## 9. 테스트 전략

- 저장소 권위 검증 명령: `node --test demo/neon-snake-fullscreen-0802/tests/*.test.js`
- `tests/game.test.js`(developer 소유)는 `src/game.js`의 순수 함수만 대상으로
  하며 DOM/`localStorage`/브라우저 의존성이 없어야 한다. 결정론적 `rng` stub을
  주입해 먹이 위치를 고정한다.
- 최소 커버리지 대상(각각 최소 1개 이상의 `node:test` 케이스):
  1. `createInitialState`가 §5 초기값을 반환(status `ready`, 길이 3, food null).
  2. `startGame`이 `ready→running` 전이 및 뱀과 겹치지 않는 첫 먹이 배치(§6.1).
  3. `setDirection` 역방향 입력 무시 + 한 tick 내 이중 입력 180° 반전 방지(§6.4).
  4. `step` 먹이 섭취 시 점수 +10·성장·새 먹이가 뱀과 겹치지 않음(§6.2).
  5. `step` 먹이 3개 섭취 시 `speedLevel` 증가·`stepMs` 감소·`MIN_STEP_MS` 하한(§6.3).
  6. `step` 벽 충돌 → `gameover` 및 `highScore` 갱신(§6.5).
  7. `step` 자기 충돌 → `gameover`(꼬리 제외 규칙: 성장 없는 tick에서 꼬리
     자리로의 이동은 충돌 아님)(§6.5).
  8. `pauseGame`/`resumeGame` 왕복 후 진행 상태 보존(§6.6).
  9. `restartGame`이 `highScore` 보존·나머지 초기화(§6.7).
  10. edge: 비-running 상태 `step`/`setDirection` no-op, 만석 시 `gameover`,
      동일 방향 `setDirection` 무해(§6.7).
- `main.js`의 DOM/canvas 렌더·`localStorage` 연동은 본 focused test 범위 밖
  이며 수동 시각 확인은 designer/developer 협의 사항이다.

## 10. designer/developer 경계 요약

- designer(BF-1490, `docs/design/neon-snake-fullscreen-0802-BF-1489.md`): §3의
  frozen selector/token/상태/접근성/반응형 불변식을 그대로 시각 명세로
  구체화한다. §4~§9의 게임 규칙 수치나 함수 시그니처를 재정의하지 않는다.
- developer(BF-1491, `demo/neon-snake-fullscreen-0802/**`): §3 frozen UI 계약과
  §4~§9 게임 규칙·순수 함수 계약·테스트 전략을 그대로 구현한다. selector·
  token·상태명·§4 수치·§5 함수 계약을 임의 변경하지 않으며, 기존 코드
  재사용·패키지 추가·네트워크/API 사용을 하지 않는다.
