# 네온 스네이크 · 1인 vs CPU 모드 실행 설계 (BF-1507)

- Jira(planner): BF-1510 · 대상 파일: `docs/plans/snake-cpu-BF-1507-plan.md`
- 후속 페르소나: designer(BF-1508 · `docs/design/snake-cpu-BF-1507.md`), developer(BF-1509 · `demo/neon-snake-fullscreen-0802/**`)
- 대상 데모: `demo/neon-snake-fullscreen-0802/`
- 선행 산출물(참조·불변): `demo/neon-snake-fullscreen-0802/src/game.js` §BF-1503 2인 로컬 멀티플레이 순수 규칙

> 본 문서는 frozen Execution Blueprint(planning-contract@v1 / ui-contract@v1)을 **그대로 렌더**한다.
> 파일·소유자·상태·토큰·selector 를 재정의하거나 새 파일·새 역할을 추가하지 않는다.
> designer 와 developer 는 승인된 본 실행 설계를 따른다.

---

## 1. 목표와 범위

기존 2인 로컬 스네이크(`demo/neon-snake-fullscreen-0802/`)에 **1인 vs CPU 대전 모드**를 additive 로 붙인다.
사람은 플레이어1(1P), CPU 는 **기존 플레이어2(2P) 입력 경로를 대체**하는 방식으로만 참여한다.
게임 규칙 코드(`stepMultiplayer` 등)는 분기시키지 않으며, 2인 로컬 회귀는 0 을 목표로 한다.

### 1.1 반드시 지키는 불변식 (frozen invariant 렌더)

- INV-1: CPU 는 기존 2P 입력 경로(`setPlayerDirection(state, 'p2', dir)`)를 **대체**하는 방식으로만 붙인다. 게임 규칙 코드를 분기시키지 않는다.
- INV-2: CPU 의사결정은 **시드 고정 시 동일 입력에 동일 방향을 반환하는 순수 함수**로 분리한다(DOM/시간/전역 난수 비의존).
- INV-3: designer/developer 는 frozen selector 와 token 을 **변경·재정의하지 않는다**.
- INV-4: 파일 소유권·상태 계약은 frozen blueprint 가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.
- INV-5: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control 을 다시 사용할 수 있어야 한다.
- INV-6: 풀스크린 캔버스가 320px 이상 모든 viewport 에서 overflow 없이 리사이즈된다.

---

## 2. Frozen 파일·소유자·상태·후조건 (렌더 전용, 재정의 금지)

| 파일 | 소유자 | 정책 | 상태/후조건 계약 |
| --- | --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/cpu.js` | developer | additive | 순수 CPU 의사결정 + 시드 RNG export. DOM/window/시간 비의존. §5 API 준수. |
| `demo/neon-snake-fullscreen-0802/index.html` | developer | additive | §6 메뉴 DOM(`mode-select`/`difficulty-select`/`winner-banner`) + §6.3 token 추가. 기존 2P DOM/셀렉터 보존. |
| `demo/neon-snake-fullscreen-0802/tests/cpu.test.js` | developer | additive | §7 CPU 결정론·안전성·난이도·회귀 테스트. `node --test` 로 실행. |
| `docs/design/snake-cpu-BF-1507.md` | designer | additive | §6 UI 계약의 시각 명세(mockup·exact token/selector). selector/token 변경 금지. |

- 소유자 밖 파일은 수정하지 않는다. `src/game.js` 는 참조 전용(불변) 이며 신규 규칙은 `cpu.js` 로만 추가한다.
- 상태 후조건(INV-5): game-over/취소 후 `winner-banner` 를 비우고 UI 를 `mode-selection` 초기값으로 되돌리며 주 실행 control(메뉴 버튼)을 다시 키보드로 사용할 수 있어야 한다.

---

## 3. 사용자 시나리오

- S-1 (모드 선택): 사용자가 데모를 열면 모드 선택 메뉴(`mode-selection`)가 보인다. `2인 로컬` 또는 `1인 vs CPU` 를 선택한다.
- S-2 (난이도 선택): `1인 vs CPU` 선택 시 난이도 메뉴(`difficulty-selection`)로 이동해 `쉬움/보통/어려움` 중 하나를 고른다.
- S-3 (플레이): 난이도 확정 후 `playing` 상태로 대전을 시작한다. 1P 는 WASD 로 조작하고 2P(CPU)는 매 tick 자동으로 방향을 결정한다.
- S-4 (일시정지/재개): 진행 중 Space 로 `paused`↔`playing` 전환. 일시정지 동안 CPU 는 결정을 내리지 않는다.
- S-5 (승패): 한쪽이 죽으면 `game-over` 로 전이하고 `winner-banner` 가 승/패/무승부를 텍스트로 알린다.
- S-6 (재시작): game-over 에서 주 실행 control 로 `mode-selection` 초기값으로 되돌아가 모드·난이도를 다시 고를 수 있다.
- S-7 (2인 로컬 회귀): `2인 로컬` 선택 시 기존 BF-1503 흐름(1P WASD / 2P 방향키)이 그대로 동작한다. CPU 코드는 개입하지 않는다.

---

## 4. Acceptance Criteria (Given/When/Then)

- AC-1 (모드 선택 노출)
  - Given 데모를 처음 로드하면
  - When 아직 아무 모드도 고르지 않았을 때
  - Then UI 상태는 `mode-selection` 이고 `#mode-select` 안에 `#btn-mode-local`·`#btn-mode-cpu` 가 각각 명시적 `aria-label` 과 함께 노출된다.

- AC-2 (CPU → 난이도 선택)
  - Given `mode-selection`
  - When `#btn-mode-cpu` 를 선택하면
  - Then UI 상태는 `difficulty-selection` 으로 전이하고 `#difficulty-select` 의 3개 `.difficulty-menu__option` 이 노출되며 현재 선택 항목만 `.difficulty-menu__option--active` 를 가진다.

- AC-3 (CPU 결정론 · 순수 함수)
  - Given 동일한 게임 state·난이도·**동일 시드로 만든 RNG**
  - When `chooseCpuDirection(state, options)` 를 호출하면
  - Then 항상 동일한 방향 문자열(`'up'|'down'|'left'|'right'`)을 반환하고, 입력 state 를 변경하지 않으며 DOM/`Math.random`/시간에 의존하지 않는다.

- AC-4 (즉사 방지 · 입력 경로 대체)
  - Given `playing` 상태에서 CPU(2P)의 커밋된 방향이 `dir`
  - When CPU 가 방향을 결정하면
  - Then 반환값은 `OPPOSITE[dir]`(정반대)가 아니며, 이 값은 `setPlayerDirection(state, 'p2', ...)` 로만 주입되어 기존 규칙 함수를 분기 없이 통과한다.

- AC-5 (2인 로컬 회귀 0)
  - Given `#btn-mode-local` 로 시작한 대전
  - When 1P(WASD)/2P(방향키)로 조작하면
  - Then BF-1503 의 tick·충돌·승패·pause/resume/restart/resize 동작이 회귀 없이 그대로 유지되고 CPU 코드는 실행되지 않는다.

- AC-6 (안정성 회귀)
  - Given CPU 모드에서 pause/resume/restart/resize 를 수행하면
  - When 각 조작 후
  - Then 논리 grid·점수·뱀 좌표가 `computeBoardMetrics` 기준으로 보존되고, restart/취소 후에는 `mode-selection` 초기값으로 복귀하며 메뉴 control 을 다시 사용할 수 있다(INV-5).

- AC-7 (승패 배너 접근성)
  - Given `game-over` 로 전이하면
  - When 승/패/무승부가 확정되면
  - Then `#winner-banner`(`aria-live="polite"`)가 결과 텍스트를 노출하여 스크린리더가 읽어준다. 결과는 색상만으로 구분하지 않는다.

- AC-8 (exact UI 계약)
  - Given index.html 과 design 명세
  - When 렌더되면
  - Then §6 의 파일·DOM ID/class·상태·token(exact 값)·접근성·반응형·산출물 경로가 그대로 구현되고 새 파일/역할/selector 를 추가하지 않는다.

---

## 5. CPU 순수 함수 API 스펙 (`cpu.js`, developer 소유)

`cpu.js` 는 **순수 규칙 모듈**이다. DOM/window/시간/전역 난수에 의존하지 않고 입력 state 를 변경하지 않는다.
기존 `src/game.js` 의 `DIRECTION_VECTORS`·`OPPOSITE`·multiplayer state 형태를 참조만 하며 규칙을 분기하지 않는다.

### 5.1 export 시그니처

```
// 시드 고정 결정론 RNG 팩토리 (mulberry32류). 동일 seed → 동일 수열.
export function createSeededRng(seed): () => number   // [0, 1)

// CPU(2P) 한 tick 방향 결정 — 순수·결정론.
export function chooseCpuDirection(state, options): 'up' | 'down' | 'left' | 'right'
//   state   : createMultiplayerState 형태 { state, cols, rows, p1, p2, food } (p2 = CPU)
//   options : { difficulty: 'easy' | 'normal' | 'hard', rng: () => number }
//   반환    : p2 의 다음 방향 문자열. 절대 OPPOSITE[state.p2.dir] 를 반환하지 않는다.
```

- 결정론 계약(AC-3): `(state, difficulty, rng)` 가 동일하면 반환 방향이 항상 동일하다. `rng` 는 호출자가 주입하며, 테스트는 `createSeededRng(seed)` 로 고정한다.
- `rng` 는 easy 난이도의 탐험 선택과 동점(tie) 상황에서만 사용한다. rng 없이도 재현되도록 동점은 아래 고정 우선순위로 먼저 깬다.

### 5.2 의사결정 절차 (난이도 공통 골격)

1. 후보 방향 = 4방향 중 `OPPOSITE[p2.dir]` 를 제외한 집합(즉사 방지, `setPlayerDirection` 의 역방향 가드와 동일 규칙).
2. 각 후보의 다음 head = `head + DIRECTION_VECTORS[dir]`.
3. 1-step 안전 판정: 다음 head 가 (a) 격자 안(`0 ≤ x < cols`, `0 ≤ y < rows`)이고 (b) 자기 몸(꼬리 제외)과 겹치지 않고 (c) 상대(1P) 몸과 겹치지 않으면 `safe`.
4. 먹이 지향: `food != null` 이면 각 후보의 head 와 food 간 맨해튼 거리를 계산해 거리를 줄이는 후보를 선호한다.
5. 동점 처리: 점수가 같은 후보는 **고정 우선순위** `['up', 'left', 'down', 'right']` 로 먼저 정렬해 결정론을 보장하고, 그래도 남는 탐험 분기에서만 `rng` 로 선택한다.

### 5.3 난이도별 정책 (exact)

| difficulty | data-value | 라벨 | 정책 |
| --- | --- | --- | --- |
| easy | `easy` | 쉬움 | 확률 `p = rng() < 0.5` 이면 후보 전체에서 무작위(안전 무시) 선택, 아니면 먹이 지향 greedy. 자주 실수해 사람이 이기기 쉽다. |
| normal | `normal` | 보통 | `safe` 후보 중 먹이 지향 greedy 선택. `safe` 가 없으면 후보 첫 번째(고정 우선순위)로 fallback. |
| hard | `hard` | 어려움 | `safe` 후보 중 먹이 지향 + 갇힘 방지(다음 head 기준 경계 있는 flood-fill 도달 가능 빈칸 수가 큰 쪽 선호). 동점은 고정 우선순위→rng. |

- 세 난이도 모두 반환값은 항상 후보(비역방향) 집합에서 나온다(AC-4).
- 난이도는 `rng` 소비 방식만 다르고 게임 규칙은 공유한다(INV-1).

### 5.4 런타임 결합 (developer, index.html 부트스트랩)

- CPU 모드에서 매 tick, `stepMultiplayer` **직전에** `state = setPlayerDirection(state, 'p2', chooseCpuDirection(state, { difficulty, rng }))` 를 호출해 CPU 방향을 주입한다.
- 2P 키보드(방향키) 입력은 CPU 모드에서 비활성화한다(입력 경로 대체, INV-1). 로컬 모드에서는 기존대로 방향키가 2P 를 조작한다.
- `chooseCpuDirection` 은 `state.state === 'running'` 일 때만 호출한다(paused/game-over 에서는 미호출, S-4).

---

## 6. Exact UI 계약 (frozen ui-contract@v1 렌더 — 변경 금지)

### 6.1 파일 (산출물 경로)

- `demo/neon-snake-fullscreen-0802/cpu.js` (developer)
- `demo/neon-snake-fullscreen-0802/index.html` (developer, additive)
- `demo/neon-snake-fullscreen-0802/tests/cpu.test.js` (developer)
- `docs/design/snake-cpu-BF-1507.md` (designer)

### 6.2 DOM ID / class

| 종류 | 값 |
| --- | --- |
| DOM ID | `mode-select`, `btn-mode-cpu`, `btn-mode-local`, `difficulty-select`, `winner-banner` |
| CSS class | `mode-menu`, `mode-menu__option`, `difficulty-menu`, `difficulty-menu__option`, `difficulty-menu__option--active`, `winner-banner` |

- `#mode-select`(`.mode-menu`) 안에 `#btn-mode-local`·`#btn-mode-cpu`(각 `.mode-menu__option`).
- `#difficulty-select`(`.difficulty-menu`) 안에 3개 `.difficulty-menu__option`, 현재 선택만 `.difficulty-menu__option--active`.
- `#winner-banner`(`.winner-banner`)는 `game-over` 결과 텍스트 노출.

### 6.3 Design token (exact 값 — index.html `:root` 에 additive)

```
--color-player1: #39ff14;   /* 1P(사람) 뱀 색 */
--color-cpu:     #ff2bd6;   /* CPU(2P) 뱀 색 — 사람과 시각적으로 구분 */
--color-menu-focus: #00e5ff; /* 메뉴 포커스 링 */
--space-menu-gap: 16px;      /* 모드/난이도 메뉴 항목 간격 */
```

- 위 4개 token 은 신규 additive 이며 값은 그대로 사용한다. 기존 `--color-p1`/`--color-p2` 등 2인 로컬 token 은 보존한다.

### 6.4 상태 모델 (UI 오케스트레이션)

`mode-selection` → `difficulty-selection` → `playing` ⇄ `paused` → `game-over`

| UI 상태 | 의미 | 엔진 상태 매핑 |
| --- | --- | --- |
| `mode-selection` | 모드 선택 메뉴 | (엔진 시작 전) |
| `difficulty-selection` | 난이도 선택(CPU 모드 한정) | (엔진 시작 전) |
| `playing` | 대전 진행 | 엔진 `running` |
| `paused` | 일시정지 | 엔진 `paused` |
| `game-over` | 승/패/무승부 | 엔진 `p1-win`/`p2-win`/`draw` |

- 로컬 모드는 `mode-selection` → `playing`(난이도 단계 생략).
- 모든 상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로 노출**한다.

### 6.5 접근성

- 모드/난이도 버튼은 명시적 `aria-label` 을 가진다(예: `#btn-mode-cpu` → "1인 CPU 대전 시작", `#btn-mode-local` → "2인 로컬 대전 시작", 난이도 버튼 → "쉬움/보통/어려움 난이도 선택").
- 방향키(↑/↓/←/→)와 `Enter` 로 메뉴 항목을 이동·선택할 수 있다.
- `#winner-banner` 는 `aria-live="polite"` 로 승패 결과 텍스트를 읽어준다.
- 모든 상태는 상태명을 화면 텍스트와 접근성 이름으로 노출한다(색상 단독 구분 금지).

### 6.6 반응형

- 풀스크린 캔버스가 320px 이상 모든 viewport 에서 overflow 없이 리사이즈된다(`computeBoardMetrics` 재사용, INV-6).
- 모드/난이도 메뉴가 세로 화면에서도 잘리지 않고 `--space-menu-gap`(16px) 간격을 유지한다.

---

## 7. 데이터 모델

### 7.1 엔진 state (참조 전용 · 재정의 없음)

CPU 는 기존 `createMultiplayerState` 의 state 형태를 그대로 사용한다. **p2 = CPU**.

```
{
  state, cols, rows,
  p1: { body:[{x,y}...], dir, nextDir, score },   // 사람
  p2: { body:[{x,y}...], dir, nextDir, score },   // CPU
  food: {x,y} | null,
}
```

- 신규 엔진 필드/영속 저장 없음. CPU 의사결정은 상태를 읽기만 한다.

### 7.2 UI 뷰모델 (런타임 로컬, 엔진 state 밖)

```
{
  uiState: 'mode-selection' | 'difficulty-selection' | 'playing' | 'paused' | 'game-over',
  mode:    'local' | 'cpu',
  difficulty: 'easy' | 'normal' | 'hard',   // cpu 모드에서만 의미
}
```

- 뷰모델은 index.html 부트스트랩에서만 관리하며 순수 규칙 함수에는 넘기지 않는다.

---

## 8. 통합 지점 (2인 로컬 회귀 0)

재사용(불변)하는 기존 순수 규칙 export — **분기·수정 금지**:

- `createMultiplayerState`, `startMultiplayer`, `setPlayerDirection`, `pauseMultiplayer`, `resumeMultiplayer`, `restartMultiplayer`, `stepMultiplayer`, `computeBoardMetrics`, `bindingForKey`, `DIRECTION_VECTORS`, `OPPOSITE`, `MP_TICK_MS`.

결합 규칙:

- IP-1: CPU 방향 주입은 §5.4 대로 tick 직전 `setPlayerDirection(state,'p2',...)` 로만 한다. `stepMultiplayer` 는 로컬/CPU 공통으로 동일하게 실행된다.
- IP-2: 모드 분기는 **입력 경로**에서만 일어난다 — 로컬은 2P 방향키, CPU 는 `chooseCpuDirection`. 게임 규칙 코드는 분기하지 않는다.
- IP-3: pause/resume/restart/resize 는 기존 런타임 함수를 재사용한다. CPU 모드 restart 는 `restartMultiplayer` 후 UI 를 `mode-selection` 으로 되돌린다(INV-5).
- IP-4: 렌더에서 CPU(2P) 뱀은 `--color-cpu`, 사람(1P) 뱀은 `--color-player1` 로 구분한다(로컬 모드 색상 계약은 보존).

---

## 9. Edge case · 실패 케이스

- E-1 (CPU 무안전 경로): 안전 후보가 하나도 없으면 고정 우선순위의 첫 후보(비역방향)를 반환한다. `stepMultiplayer` 가 2P 사망으로 처리 → `p1-win`. 무한 no-op/크래시 없음.
- E-2 (food = null · 격자 만석): 먹이 지향 로직을 건너뛰고 안전(또는 easy 는 무작위) 후보를 고른다. 먹이 재배치는 기존 `spawnFood` null-safe(E-7 이전 위치 유지) 를 따른다.
- E-3 (head-to-head): CPU 는 특별 분기 없이 진행하며 두 head 충돌은 `stepMultiplayer` 가 양측 사망→점수 비교로 승패/무승부를 산출한다.
- E-4 (역방향 입력): `chooseCpuDirection` 은 `OPPOSITE[p2.dir]` 를 절대 반환하지 않으며, `setPlayerDirection` 도 역방향을 무시하므로 이중 안전.
- E-5 (일시정지 중 CPU): `state.state !== 'running'` 이면 CPU 결정을 호출하지 않는다. 재개 시 동일 시드 기준 결정론을 유지한다.
- E-6 (재시작/취소 후조건): game-over/취소 후 `winner-banner` 를 비우고 `mode-selection` 초기값으로 복귀, 메뉴 control 을 다시 키보드로 사용할 수 있다(INV-5).
- E-7 (resize 안정성): 논리 grid(cols/rows)를 고정하고 픽셀만 `computeBoardMetrics` 로 재계산해 뱀 좌표·점수·먹이를 보존한다. 메뉴는 세로 화면에서도 `--space-menu-gap` 을 유지하며 잘리지 않는다.
- E-8 (시드 결정론 회귀): 동일 시드·동일 tick 수열이면 CPU 방향과 게임 결과가 완전히 동일하다(테스트로 검증).

---

## 10. 검증 (테스트 사양, `tests/cpu.test.js` developer 소유)

`node --test` 로 실행하는 순수 함수 단위 테스트. 브라우저/DOM 비의존.

- T-1 결정론: 동일 `state`+`difficulty`+`createSeededRng(seed)` 로 `chooseCpuDirection` 반복 호출 시 동일 방향(AC-3, E-8).
- T-2 즉사 방지: 반환값이 절대 `OPPOSITE[p2.dir]` 가 아님(AC-4, E-4).
- T-3 안전성(normal/hard): 안전 후보가 존재하면 벽/자기몸/상대몸 즉사 후보를 고르지 않음(§5.2, E-1).
- T-4 먹이 지향: 안전 후보 중 맨해튼 거리를 줄이는 방향을 선호(§5.2).
- T-5 무안전 경로: 안전 후보가 없을 때 크래시 없이 고정 우선순위 후보 반환(E-1).
- T-6 순수성: 입력 state 가 변형되지 않음(호출 전후 deep-equal).
- T-7 로컬 회귀: `stepMultiplayer`/`setPlayerDirection`(2P) 경로가 CPU 도입 후에도 동일 결과(AC-5).

종료 조건: 위 T-1~T-7 이 통과하고, 2인 로컬 기존 테스트(`tests/game.test.js`)가 회귀 없이 통과한다.
