# 별빛 수집가 실행 설계 및 UI 계약 — star-catcher-canary-0802 (BF-1483)

## 0. 문서 성격

본 문서는 상위 frozen Execution Blueprint의 `ui-contract@v1`
(sha256:cde05e387fa2a430a83dd4a4e2622ea280260d6d851a7d4f8bae41fb6c80bed0)이
정한 파일 목록·DOM ID/class·상태·디자인 토큰·접근성·반응형 요구사항을
**재정의 없이** 그대로 서술하고, 그 위에서 designer/developer가 병렬로 따를
게임 규칙과 순수 함수 실행 설계를 구체화한다. selector·상태·token 값은
frozen 목록 그대로이며, 본 문서는 신규 파일이나 신규 역할을 추가하지 않는다.

이 task(BF-1486)의 산출물 범위는 본 markdown 1개 파일
(`docs/plans/star-catcher-BF-1483.md`)이며, 런타임 HTML/CSS/JS와 테스트
(`demo/star-catcher-canary-0802/index.html`,
`demo/star-catcher-canary-0802/src/game.js`,
`demo/star-catcher-canary-0802/src/main.js`,
`demo/star-catcher-canary-0802/styles.css`,
`demo/star-catcher-canary-0802/tests/game.test.js`)는 developer(BF-1485)
소유로 frozen되어 있어 본 task에서 생성하지 않는다. 시각 명세
(`docs/design/star-catcher-BF-1483.md`)는 designer(BF-1484) 소유로 frozen되어
있어 본 task에서 생성하지 않는다.

## 1. 개요

- 대상 라우트: `/demo/star-catcher-canary-0802`
- 진입 파일(developer 소유, frozen): `demo/star-catcher-canary-0802/index.html`
- 성격: 서버 데이터 모델·API 없는 **클라이언트 전용 아케이드 캐너리**. 30초
  동안 떨어지는 별을 수집해 점수·콤보를 쌓고, 놓친 별 수를 함께 기록한다.
- 사용자 경험 목표: 시작/일시정지/재개/종료/다시 시작 흐름 전체가 언제나
  예측 가능하게 동작하고, 실패(놓침)나 중단(일시정지·다시 시작) 후에도 주
  실행 control(시작/재개 control)이 즉시 다시 사용 가능해야 한다.

## 2. Frozen 산출물 및 소유권

frozen Blueprint가 고정한 파일·소유자는 아래와 같으며, 본 문서는 이 목록을
그대로 서술할 뿐 추가·재배정하지 않는다.

| 파일 | 소유 역할 | 성격 |
| --- | --- | --- |
| `demo/star-catcher-canary-0802/index.html` | developer | 진입 파일 |
| `demo/star-catcher-canary-0802/src/game.js` | developer | 순수 게임 로직(§5) |
| `demo/star-catcher-canary-0802/src/main.js` | developer | DOM 바인딩/렌더링 |
| `demo/star-catcher-canary-0802/styles.css` | developer | 스타일 |
| `demo/star-catcher-canary-0802/tests/game.test.js` | developer | 단위 테스트 |
| `docs/design/star-catcher-BF-1483.md` | designer | 시각 명세 |
| `docs/plans/star-catcher-BF-1483.md` (본 문서) | planner | 실행 설계 |

모든 산출물 경로는 `demo/star-catcher-canary-0802/` 및 `docs/` 내부로
한정되며, 그 밖의 보존 영역은 침범하지 않는다(additive 정책).

## 3. UI 계약 (frozen, 재정의 금지)

### 3.1 DOM 구조

```
#game-root (.star-catcher)
├─ .star-catcher__hud
│   ├─ #score-value
│   ├─ #combo-value
│   ├─ #missed-value
│   ├─ #timer-value
│   └─ #game-status              ── aria-live="polite"
├─ #game-board (.star-catcher__board)
│   └─ .star-catcher__star × N   ── 낙하 중인 별(동적 생성/제거)
└─ (control 영역)
    ├─ #start-btn  (.star-catcher__control)
    ├─ #pause-btn  (.star-catcher__control)
    └─ #restart-btn (.star-catcher__control)
```

frozen ID: `game-root`, `game-board`, `score-value`, `combo-value`,
`missed-value`, `timer-value`, `game-status`, `start-btn`, `pause-btn`,
`restart-btn`. frozen class: `star-catcher`, `star-catcher__board`,
`star-catcher__hud`, `star-catcher__control`, `star-catcher__star`.
`star-catcher__control`은 컨테이너가 아니라 `start-btn`/`pause-btn`/
`restart-btn` 각 버튼 요소에 공통으로 부여하는 class이다(§0의 정확한
selector 집합 재정의 금지 원칙에 따름). HUD 항목의 wrapper 요소를 별도로 둘지,
board 내부에 별 요소를 어떤 컨테이너 구조로 둘지는 frozen selector 범위
밖이므로 developer 재량이다.

### 3.2 상태 모델 (frozen)

`idle | running | paused | ended` 4가지이며, 이 문서 §5~§6이 전이 규칙을
구체화한다.

### 3.3 디자인 토큰 (frozen, 값 변경 금지)

| 토큰 | 값 | 권장 용도 |
| --- | --- | --- |
| `--sc-color-bg` | `#0b1026` | `game-root`/`game-board` 배경 |
| `--sc-color-star` | `#ffd54a` | `star-catcher__star` 색상 |
| `--sc-color-action-primary` | `#5b8cff` | `start-btn` 등 1차 action 강조색 |
| `--sc-space-hud-gap` | `16px` | `star-catcher__hud` 내부 항목 간격 |
| `--sc-radius-control` | `8px` | control 버튼 border-radius |

### 3.4 접근성 (frozen)

1. `start-btn`, `pause-btn`, `restart-btn` 각 control은 명시적
   `aria-label`을 가진다.
2. 방향키로 이동하고 Space 또는 Enter로 별을 수집하는 키보드 조작을
   제공한다(상세: §7).
3. `game-status`는 `aria-live="polite"`로 상태 변화를 화면 텍스트로
   안내한다.
4. 포커스된 control은 뚜렷한 outline 표시를 가진다.
5. `prefers-reduced-motion` 활성 시 별 애니메이션을 정지 또는 축소한다.
6. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성
   이름으로 노출한다.

### 3.5 반응형 (frozen)

1. 320px 이상 뷰포트에서 content overflow가 발생하지 않는다.
2. 모바일 세로 레이아웃에서 HUD(`star-catcher__hud`)와
   board(`star-catcher__board`)가 세로로 재배치된다.

구체적 breakpoint 값과 시각 표현은 designer 문서
(`docs/design/star-catcher-BF-1483.md`) 소관이며, 본 문서는 위 두 불변식만
frozen으로 서술한다.

## 4. 게임 규칙 설계 (본 task의 실행 설계 — developer 구현 기준)

frozen Blueprint는 selector·상태·token만 고정하며 점수·콤보·놓침·타이머의
구체적 수치 규칙은 정의하지 않는다. 아래는 developer(BF-1485)가 §5 순수
함수로 구현해야 하는 이번 task의 게임 규칙 설계이며, §9 테스트가 이 값을
검증 기준으로 삼는다.

| 상수 | 값 | 설명 |
| --- | --- | --- |
| `GAME_DURATION_SECONDS` | `30` | `timer-value` 초기값이자 종료 기준(30초 타이머) |
| `BOARD_COLUMNS` | `7` (index 0~6) | catcher/별이 위치하는 열 개수 |
| `CATCHER_INITIAL_COLUMN` | `3` | 중앙 열, `idle`/`restart` 시 초기값 |
| `CATCH_ZONE_MIN_PERCENT` | `85` | board 높이 기준 y ≥ 85(%)이면 수집 판정 구간 |
| `STAR_FALL_SPEED_PERCENT_PER_SEC` | `20` | 별 낙하 속도(초당 board 높이 % 이동) |
| `STAR_SPAWN_INTERVAL_MS` | `900` | 별 생성 간격 |
| `SCORE_PER_CATCH` | `10` | 별 1개 수집 시 기본 점수 |
| `COMBO_SCORE_BONUS_PER_COMBO` | `2` | 수집 시점의 현재 콤보 수 × 이 값이 보너스로 가산 |

규칙 서술:

- **점수**: 별 수집 성공 시 `score += SCORE_PER_CATCH + combo * COMBO_SCORE_BONUS_PER_COMBO`
  (보너스 계산에는 이번 수집으로 증가하기 *이전*의 콤보 값을 사용). 예:
  콤보 0에서 수집 시 `+10`, 콤보 1에서 다음 수집 시 `+12`.
- **콤보**: 별을 수집할 때마다 `combo += 1`. 별을 놓치면(§ 아래) `combo = 0`
  으로 즉시 초기화된다.
- **놓친 횟수**: 별이 catcher에 의해 수집되지 못한 채 y가 100(%) 이상에
  도달하면 `missed += 1`, `combo = 0`, 해당 별은 제거된다. `missed`는
  기록용 카운터이며 그 자체로 게임을 종료시키지 않는다(게임 종료 조건은
  타이머뿐이다 — 가정 명시).
- **타이머**: `running` 상태에서만 매 tick 감소하며, `timeRemaining <= 0`이
  되는 순간 자동으로 `ended`로 전이한다(§6 시나리오 5).

시각적 표현(별 모양, 애니메이션, 색 그라디언트 등)은 designer 문서 소관이며
본 절은 layout 골격과 game 상태 계약만 정의한다.

## 5. 순수 함수 계약 (`src/game.js`, DOM 비의존)

`src/game.js`는 DOM에 접근하지 않는 순수 reducer 함수 집합으로 구현하여
`node --test`로 브라우저 없이 검증 가능해야 한다. `src/main.js`가 DOM
이벤트를 이 함수들에 위임하고 반환된 state로 렌더링한다.

| 함수 | 입력 | 동작 |
| --- | --- | --- |
| `createInitialState()` | - | `{status:'idle', score:0, combo:0, missed:0, timeRemaining:30, catcherColumn:3, stars:[]}` 반환 |
| `startGame(state)` | state | `idle → running`. `idle`이 아니면 no-op(state 그대로 반환) |
| `pauseGame(state)` | state | `running → paused`. `running`이 아니면 no-op |
| `resumeGame(state)` | state | `paused → running`. `paused`가 아니면 no-op |
| `restartGame(state)` | state | 모든 status에서 `idle`로 전이, `createInitialState()`와 동일한 값으로 전체 리셋 |
| `tick(state, deltaMs)` | state, 경과 ms | `running`에서만 동작: 타이머 감소, 별 생성/낙하 진행, catch-zone 통과 실패 별을 missed 처리, `timeRemaining<=0`이면 `ended`로 자동 전이 |
| `moveCatcher(state, direction)` | state, `'left'\|'right'` | `running`에서만 동작: `catcherColumn`을 `0..BOARD_COLUMNS-1` 범위로 clamp 이동 |
| `collectStar(state)` | state | `running`에서만 동작: catch zone(§4) 내 `catcherColumn`과 일치하는 별이 있으면 수집 처리(§4 점수/콤보), 없으면 no-op |

모든 함수는 인자로 받은 state를 변경하지 않고 새 state를 반환한다(불변성).
`running`이 아닌 상태에서 `moveCatcher`/`collectStar`/`tick`이 호출되면
예외를 던지지 않고 입력 state를 그대로 반환한다.

## 6. 상태 전이 시나리오 (Given/When/Then)

### 6.1 게임 시작

- Given `status === 'idle'`(초기값: score 0, combo 0, missed 0, timeRemaining 30)
- When `startGame(state)` 호출(`start-btn` 클릭 또는 Enter/Space)
- Then `status`가 `'running'`으로 전이되고, `game-status` 텍스트가 진행 중
  상태를 나타낸다.

### 6.2 별 수집 성공

- Given `status === 'running'`, `catcherColumn`과 동일한 열에 catch zone
  (y ≥ 85%) 안의 별이 존재
- When `collectStar(state)` 호출
- Then 해당 별 제거, `score += 10 + combo*2`, `combo += 1`

### 6.3 별 놓침

- Given `status === 'running'`, 특정 별이 수집되지 않은 채 y ≥ 100(%)에 도달
- When `tick(state, deltaMs)`이 낙하를 진행시켜 이를 감지
- Then `missed += 1`, `combo = 0`, 해당 별 제거(게임은 종료되지 않음)

### 6.4 일시정지 → 재개

- Given `status === 'running'`
- When `pauseGame(state)` 호출(`pause-btn`)
- Then `status = 'paused'`, 타이머·별 낙하 진행이 멈추고 `game-status`가
  일시정지 상태를 안내한다.
- Given `status === 'paused'`
- When `resumeGame(state)` 호출(동일 `pause-btn` 재클릭 — 라벨/aria-label을
  재개 의미로 전환하는 것은 developer 재량)
- Then `status = 'running'`으로 복귀하며, 정지 시점의 `timeRemaining`·별
  위치·score·combo·missed가 그대로 이어진다(손실 없음).

### 6.5 타이머 종료

- Given `status === 'running'`, `timeRemaining`이 tick으로 0 이하 도달
- When `tick(state, deltaMs)`이 이를 감지
- Then `status = 'ended'`로 자동 전이되고, 이후 `moveCatcher`/`collectStar`
  호출은 no-op이다. `game-status`는 게임 종료와 최종 점수를 함께 안내한다.

### 6.6 다시 시작

- Given `status`가 `'running'`, `'paused'`, `'ended'` 중 하나
- When `restartGame(state)` 호출(`restart-btn`)
- Then `status = 'idle'`로 되돌아가고 score/combo/missed/timeRemaining/
  catcherColumn/stars가 모두 초기값으로 리셋되며, `start-btn`이 즉시 다시
  사용 가능하다(§3.4의 frozen 불변식 충족).

### 6.7 edge case / 실패 케이스

- `idle` 또는 `ended` 상태에서 `moveCatcher`/`collectStar`/`pauseGame` 호출 시
  상태 변화 없이 no-op(예외 없음).
- `paused` 상태에서 `moveCatcher`/`collectStar` 호출 시 no-op(일시정지 중
  입력 무시).
- `catcherColumn`이 0 또는 `BOARD_COLUMNS-1`(경계)일 때 경계 밖 방향으로
  `moveCatcher` 호출 시 열 변화 없음(clamp).
- catch zone에 일치하는 별이 없는 상태에서 `collectStar` 호출 시 score/
  combo/missed 변화 없음(빈 수집 시도에 감점 없음).
- `idle` 상태에서 `restartGame` 호출 시에도 예외 없이 동일한 초기값을
  반환한다(이미 초기값이어도 안전).

## 7. 키보드 상호작용 상세 (frozen §3.4-2 구체화)

- `ArrowLeft` / `ArrowRight`: catcher를 좌/우 인접 열로 이동(`moveCatcher`).
  board가 좌우 1열 catcher 구조이므로 `ArrowUp`/`ArrowDown`은 게임 조작에
  사용하지 않는다(이 결정은 본 task의 설계 결정이며, 페이지 스크롤 등 기본
  브라우저 동작을 막지 않는다).
- `Space` 또는 `Enter`: `collectStar` 트리거. `start-btn`/`pause-btn`/
  `restart-btn`에 포커스가 있을 때는 해당 버튼의 기본 activation으로
  동작한다(네이티브 `<button>` 사용 권장).
- 이 세 키(`ArrowLeft`/`ArrowRight`/`Space`)는 `#game-board` 또는
  `#game-root`가 포커스를 가질 때 게임 조작으로 인식되어야 하며, 정확한
  포커스 위임 구현은 developer 재량이다.

## 8. 반응형 레이아웃 규칙 (frozen §3.5 구체화)

- 320px 이상에서 `game-root`/`game-board`/`star-catcher__hud` 모두 가로
  스크롤(overflow-x)이 발생하지 않아야 한다.
- 모바일 세로 레이아웃에서 `star-catcher__hud`가 `star-catcher__board` 위
  또는 아래로 세로 재배치된다(순서는 developer/designer 재량, 뷰포트 폭
  기준 구체적 breakpoint 픽셀 값과 시각 표현은 `docs/design/star-catcher-BF-1483.md`
  소관).
- HUD 항목 간 간격은 `--sc-space-hud-gap`(16px)을 layout 상태와 무관하게
  일관 적용한다.

## 9. 테스트 전략

- 저장소 권위 검증 명령: `node --test demo/star-catcher-canary-0802/tests/*.test.js`
- `tests/game.test.js`(developer 소유)는 `src/game.js`의 순수 함수만
  대상으로 하며 DOM/브라우저 의존성이 없어야 한다.
- 최소 커버리지 대상: §6.1~§6.7의 모든 시나리오(정상 흐름 5건 + edge case
  5건)를 각각 최소 1개 이상의 `node:test` 케이스로 검증한다.
- `main.js`의 DOM 바인딩/렌더링은 본 focused test 범위 밖이며, 수동 시각
  확인은 designer/developer 협의 사항이다.

## 10. designer/developer 경계 요약

- designer(BF-1484, `docs/design/star-catcher-BF-1483.md`): §3의 frozen
  selector/token/상태/접근성/반응형 불변식을 그대로 시각 명세로 구체화한다.
  본 문서 §4~§9의 게임 규칙 수치나 함수 시그니처를 재정의하지 않는다.
- developer(BF-1485, `demo/star-catcher-canary-0802/**`): §3 frozen UI
  계약과 §4~§9 게임 규칙·순수 함수 계약·테스트 전략을 그대로 구현한다.
  selector·token·상태명·§4 수치·§5 함수 계약을 임의 변경하지 않는다.
