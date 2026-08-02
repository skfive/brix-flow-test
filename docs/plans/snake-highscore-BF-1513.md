# 최고 기록 보드 · 구현 설계 (BF-1513)

> planner 산출물 (BF-1516). 이 문서는 **frozen blueprint** (`planning-contract@v1`,
> `ui-contract@v1`) 를 실행 가능한 구현 계획으로 렌더링한다. 새 파일·역할·요구사항을
> **추가하지 않으며**, frozen 계약의 파일·소유자·상태·후조건을 그대로 설명한다.
> designer(BF-1514) 와 developer(BF-1515) 는 본 문서를 handoff 계약으로 참조한다.

---

## 0. 범위와 대상

- **대상 데모**: `demo/neon-snake-fullscreen-0802/` (vanilla ESM, 정적 서빙)
- **통합 런타임**: `index.html` 의 `<script type="module">` 이 `src/game.js` 의 순수 규칙과
  `cpu.js` 의 CPU 의사결정을 조합해 구동한다. UI 상태 어휘는
  `mode-selection` → `difficulty-selection` → `playing` → `paused` → `game-over` 이며
  모드는 `local`(2인 로컬) / `cpu`(1인 vs CPU) 두 가지다.
- **이번 작업**: 시작 화면과 종료 화면에 **모드별 최고 기록 보드**를 추가한다. 저장/조회는
  순수 함수 모듈로 분리하고, 손상값은 빈 기록(0) 으로 안전하게 fallback 한다.

### 산출 계약 파일과 소유자 (frozen — 재정의 금지)

| 파일 | 소유자 | 상태(정책) |
| --- | --- | --- |
| `demo/neon-snake-fullscreen-0802/highscore.js` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/index.html` | **developer** | additive |
| `demo/neon-snake-fullscreen-0802/tests/highscore.test.js` | **developer** | additive |
| `docs/design/snake-highscore-BF-1513.md` | **designer** | additive |
| `docs/plans/snake-highscore-BF-1513.md` (본 문서) | **planner** | — |

- 파일 소유권·상태 계약의 유일한 권위는 frozen blueprint 다. 본 문서는 이를 **재정의하지
  않고** 그대로 설명한다.
- 위 4개 계약 파일은 모두 **additive** 정책이다. 기존 selector/token/함수 export 를 삭제하거나
  의미를 바꾸지 않고 **추가**만 한다.

---

## 1. 사용자 시나리오 (UseCase)

- **행위자**: 플레이어(사람)
- **선행조건**: 데모 페이지 로드 완료, localStorage 접근 가능/불가능 둘 다 허용
- **주 흐름**
  1. 플레이어가 시작(모드 선택) 화면에 진입한다.
  2. 화면에 현재 강조된 모드의 **"최고 기록 {n}"** 텍스트가 표시된다(기록 없음/손상이면 0).
  3. 플레이어가 게임을 진행한다(기존 조작·규칙 그대로).
  4. 게임이 종료되면 종료 화면에 **"이번 점수 {n}"** 과 **"최고 기록 {n}"** 이 함께 표시된다.
  5. 이번 점수가 저장된 최고 기록보다 크면 **"신기록!"** 배지가 활성화되고 최고 기록이 갱신·저장된다.
- **대안 흐름**
  - A1. 저장값이 없거나 손상됨 → 최고 기록 0 으로 정상 시작(empty-record).
  - A2. localStorage 접근 실패(예: 프라이빗 모드) → 저장은 조용히 무시, 조회는 0 반환, 게임은 정상 동작.
- **후조건**: 종료·재시작·취소 이후 상태와 진행 표시는 초기값으로 되돌아가고, 주 실행 control
  (`btn-start`/`btn-restart`) 을 다시 사용할 수 있다.

---

## 2. 요구사항 & Acceptance Criteria (Given/When/Then)

### REQ-PERSIST — 모드별 최고 기록 저장/조회 + 손상값 fallback
- **G** 모드 `m` 의 저장 키에 유효한 최고 기록이 없거나 손상됨
  **W** `loadBest(storage, m)` 를 호출
  **T** `0` 을 반환한다(음수·NaN·비정수·null 문자열 포함 모두 0).
- **G** 이번 점수 `s` 가 유효한 비음수 정수이고 저장된 최고 기록보다 큼
  **W** `saveBest(storage, m, s)` 를 호출
  **T** `s` 를 저장하고 `s` 를 반환한다.
- **G** 이번 점수 `s` 가 저장된 최고 기록 이하이거나 유효하지 않음
  **W** `saveBest(storage, m, s)` 를 호출
  **T** 저장값을 **낮추지 않고**(no-downgrade) 기존 최고 기록을 반환한다.
- **G** localStorage 접근이 예외를 던짐
  **W** `loadBest`/`saveBest` 호출
  **T** 예외를 삼키고 각각 `0` 반환 / no-op 한다(게임 흐름 중단 없음).

### REQ-NEWRECORD — 신기록 판정
- **G** 이번 점수 `s` 가 저장된 최고 기록보다 **엄격히 큼**
  **W** `isNewRecord(storage, m, s)` 호출
  **T** `true` 를 반환한다.
- **G** 이번 점수 `s` 가 최고 기록과 **같음**(동점)
  **W** `isNewRecord(storage, m, s)` 호출
  **T** `false` 를 반환한다(동점은 신기록이 아니다 — 기존 `game.js` 판정과 일치).
- **G** 종료 시 신기록으로 판정됨
  **W** 종료 화면 렌더
  **T** `#snake-newrecord-badge` 가 활성화(`scoreboard__badge--active`)되고 `#snake-best-score`
  가 이번 점수로 갱신되며, 최고 기록이 해당 모드 키에 저장된다.

### REQ-BOARD-UI — 시작/종료 화면 기록 보드
- **G** 시작(모드 선택) 화면
  **W** 렌더
  **T** `#snake-highscore-board` 에 **"최고 기록 {n}"** 텍스트가 표시되고 신기록 배지는 숨겨진다.
- **G** 플레이 중
  **W** 렌더
  **T** 기록 보드는 비활성(`aria-hidden`)이고 게임 캔버스만 노출된다.
- **G** 일반 종료(신기록 아님)
  **W** 렌더
  **T** **"이번 점수 {n}"** 과 **"최고 기록 {n}"** 이 동시 표시되고 배지는 숨겨진다.
- **G** 320px 이상 / 세로(portrait) 뷰포트
  **W** 렌더
  **T** 기록 보드가 게임 캔버스를 가리지 않고 overflow·잘림 없이 표시된다.

---

## 3. 순수 함수 시그니처 (`highscore.js` — planning-contract@v1)

`highscore.js` 는 **DOM/window/시간/난수에 의존하지 않는** 순수 모듈이다. 저장소는 인자로
주입하여(`storage` 어댑터 = `{ getItem, setItem }`) 시드/상태 고정 시 **결정론적으로 테스트**
가능하게 한다. 브라우저에서는 `window.localStorage` 를, 테스트에서는 페이크 저장소를 주입한다.

```js
// 저장 키 네임스페이스 (기존 game.js 상수 컨벤션 계승)
export const HIGH_SCORE_NAMESPACE = 'neon-snake-fullscreen-0802:highscore';

// 모드별 저장 키 파생 (내부/공개 헬퍼)
export function storageKeyFor(mode);          // -> `${HIGH_SCORE_NAMESPACE}:${mode}`

// 조회: 없거나 손상/음수/비정수/NaN 이면 0
export function loadBest(storage, mode);       // -> number (>= 0)

// 저장: 유효한 비음수 정수이고 기존 최고보다 클 때만 기록. 반환값은 저장 후 최고 기록.
export function saveBest(storage, mode, score); // -> number (resulting best, no-downgrade)

// 신기록 판정: score 가 저장된 최고보다 엄격히 큰가 (동점=false)
export function isNewRecord(storage, mode, score); // -> boolean
```

### 함수별 계약 상세

- **`storageKeyFor(mode)`**: `` `${HIGH_SCORE_NAMESPACE}:${mode}` `` 를 반환한다. 모드 문자열을
  키에 그대로 결합해 **모드별로 기록을 격리**한다.
- **`loadBest(storage, mode)`**: `storage.getItem(storageKeyFor(mode))` 를 `Number.parseInt(raw, 10)`
  으로 파싱한다. `Number.isFinite(n) && n >= 0` 이면 `n`, 아니면 `0`. 접근 예외는
  `try/catch` 로 삼키고 `0` 반환. (기존 `game.js` §`loadHighScore` 정책과 동일한 fallback.)
- **`saveBest(storage, mode, score)`**: `score` 가 `Number.isFinite && >= 0 && Number.isInteger`
  이고 `score > loadBest(storage, mode)` 일 때만 `storage.setItem(key, String(score))`. 그 외에는
  저장하지 않고(no-downgrade) 기존 최고를 반환. 접근 예외는 삼킨다(no-op).
- **`isNewRecord(storage, mode, score)`**: `score` 가 유효한 비음수 정수이고
  `score > loadBest(storage, mode)` 이면 `true`, 아니면 `false`.

---

## 4. 모드별 저장 키 스키마 (DataModel)

localStorage 는 `키(string) → 값(string)` 저장소다. 최고 기록은 **모드별 단일 엔트리**로 저장한다.

| 모드 ID | 저장 키 | 의미 |
| --- | --- | --- |
| `local` | `neon-snake-fullscreen-0802:highscore:local` | 2인 로컬 대전 최고 기록 |
| `cpu` | `neon-snake-fullscreen-0802:highscore:cpu` | 1인 vs CPU 최고 기록 |

- **값 형식**: 비음수 정수의 10진 문자열(예: `"120"`).
- **손상값 처리**: 값이 없음/비수치/음수/비정수/`NaN` 이면 조회 시 **0** 으로 취급하고 게임은
  정상 시작한다(empty-record 상태). 저장 시에는 유효한 상향 값만 기록한다(no-downgrade).
- **모드 격리 불변식**: 한 모드의 키를 읽고 쓸 때 다른 모드 키에는 영향을 주지 않는다.
- **레거시 보존 불변식(마이그레이션 제약)**: 기존 단일 플레이 런타임(`src/game.js`
  `initSnakeGame`) 이 사용하는 `neon-snake-fullscreen-0802:highscore`(모드 suffix 없음) 키의
  읽기/쓰기 동작은 이번 작업에서 **변경하지 않는다**. 신규 보드는 `:{mode}` suffix 키만 사용한다.
  (별도 마이그레이션 없이 additive 로 공존한다.)

> 모드 ID 는 통합 런타임의 실제 모드(`local`/`cpu`)에 한정한다. 본 계약은 새 모드를 만들지
> 않으며, 향후 모드 추가 시 `storageKeyFor(mode)` 로 동일 스키마를 재사용한다.

---

## 5. UI 계약 (ui-contract@v1 — frozen, 변경 금지)

designer 와 developer 는 아래 selector·token·상태·접근성·반응형을 **변경하거나 재정의하지
않는다**. 아래 값은 frozen blueprint 의 exact 값을 그대로 옮긴 것이다.

### 5.1 DOM selector (frozen)

| 종류 | 값 |
| --- | --- |
| DOM id | `snake-highscore-board`, `snake-current-score`, `snake-best-score`, `snake-newrecord-badge` |
| CSS class | `scoreboard`, `scoreboard__current`, `scoreboard__best`, `scoreboard__badge`, `scoreboard__badge--active` |

- `#snake-highscore-board` (`.scoreboard`): 보드 컨테이너
- `#snake-current-score` (`.scoreboard__current`): "이번 점수 {n}" 텍스트
- `#snake-best-score` (`.scoreboard__best`): "최고 기록 {n}" 텍스트
- `#snake-newrecord-badge` (`.scoreboard__badge`, 활성 시 `.scoreboard__badge--active`): "신기록!" 배지

### 5.2 상태(frozen)

| 상태 | 표현 |
| --- | --- |
| `start-idle` | 시작 화면에 "최고 기록 {n}" 텍스트 표시, 신기록 배지 숨김 |
| `playing` | 기록 보드 비활성(`aria-hidden`), 게임 캔버스만 노출 |
| `gameover-normal` | "이번 점수 {n}" 과 "최고 기록 {n}" 텍스트 동시 표시, 신기록 배지 숨김 |
| `gameover-newrecord` | "신기록!" 배지 활성 + "최고 기록 {n}" 갱신 텍스트 표시 |
| `empty-record` | 저장값 없음/손상 시 "최고 기록 0" 텍스트로 정상 시작 |

### 5.3 design token (frozen, exact 값)

```css
:root {
  --color-scoreboard-accent: #39ff14;  /* 최고 기록 강조 (네온 그린) */
  --color-newrecord-flash: #ff2e97;    /* 신기록 배지 플래시 (네온 핑크) */
  --space-scoreboard-gap: 12px;        /* 보드 내부 항목 간격 */
  --font-scoreboard-size: 18px;        /* 보드 텍스트 크기 */
}
```

### 5.4 접근성(frozen)

- 최고 기록 영역은 `aria-label="최고 기록"` 을 가진다.
- 신기록 배지는 `aria-live="polite"` 로 "신기록" 텍스트를 스크린리더에 알린다.
- 기록 보드는 색상뿐 아니라 화면 텍스트("이번 점수", "최고 기록", "신기록")로 상태를 구분한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.5 반응형(frozen)

- 320px 이상에서 기록 보드가 게임 캔버스를 가리지 않고 overflow 없이 표시된다.
- 세로(portrait) 화면에서도 시작/종료 화면 기록 보드가 잘리지 않는다.

---

## 6. 게임 lifecycle hook 지점 (index.html 통합 런타임)

boards 는 통합 런타임의 **뷰 동기화·상태 전이** 지점에 배선한다. 아래는 developer 를 위한
**추가(additive) hook 지점**이며 기존 함수의 시그니처·동작은 바꾸지 않는다.

| hook 지점(기존 함수) | 추가 동작(additive) |
| --- | --- |
| `goModeSelection()` / `syncView()` (`uiState === 'mode-selection'`) | 현재 강조 모드의 `loadBest` 값으로 `#snake-best-score` 를 "최고 기록 {n}" 으로 렌더, 배지 숨김, 보드 노출(start-idle) |
| 모드 강조 변경(`moveMenu` / 모드 버튼 클릭) | 강조된 모드의 `loadBest` 로 "최고 기록 {n}" 갱신 |
| `startLocal()` / `startCpu()` (`uiState → 'playing'`) | 보드를 `aria-hidden` 비활성으로 전환(playing) |
| `handleGameOver()` (`uiState → 'game-over'`) | `isNewRecord(mode, score)` 판정 → 신기록이면 `saveBest` 후 배지 활성(gameover-newrecord), 아니면 배지 숨김(gameover-normal). `#snake-current-score` = "이번 점수 {n}", `#snake-best-score` = "최고 기록 {n}" |
| `restartToMenu()` (종료→모드 선택 복귀) | 보드를 start-idle 로 되돌리고 배지 초기화 |

- **현재 점수 출처**: CPU 모드의 사람 점수는 `state.p1.score`, 2인 로컬은 각 플레이어 점수.
  보드가 표시하는 "이번 점수"의 구체 매핑은 designer 시각 명세와 developer 구현이 frozen
  상태 텍스트("이번 점수 {n}")를 만족하는 범위에서 결정한다(본 계약은 텍스트·selector 를 고정).
- **저장 시점**: 신기록 저장은 `handleGameOver()` 진입 시 1회만 수행한다(중복 저장 금지).

---

## 7. 불변 보장 (기존 동작 변경 금지 — ArchitectureModel constraints)

이번 작업은 **additive** 이며 아래 기존 동작을 **변경하지 않는다**. developer 는 focused
회귀 테스트(`tests/game.test.js`, `tests/cpu.test.js`, `tests/viewport.test.js`)로 이를 확인한다.

- **tick 루프**: `MP_TICK_MS` 고정 tick 누적 루프(`loop`)의 타이밍·누적 로직 불변.
- **충돌 판정**: `stepMultiplayer`/`step` 의 벽·자기·상호 충돌 및 head-to-head 판정 불변.
- **pause/resume**: `pauseMultiplayer`/`resumeMultiplayer` 및 Space 토글 동작 불변.
- **restart**: `restartMultiplayer`/`restartToMenu` 의 ready 초기화 동작 불변(기록 보드는
  start-idle 로 복귀하되 게임 상태 초기화 로직은 그대로).
- **resize/orientation**: `computeBoardMetrics`/`applyMetrics` 의 뷰포트 재계산·상태 보존 불변.
- **순수성**: `highscore.js` 는 순수 함수 + 주입 저장소로만 구성해, 시드/저장소 고정 시
  결정론적으로 테스트 가능해야 한다.
- **selector/token 재정의 금지**: designer·developer 는 §5 의 selector 와 token 을 변경하거나
  재정의하지 않는다.
- **후조건 복원**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행
  control 을 다시 사용할 수 있어야 한다.

---

## 8. 테스트 계획 (focused)

| TestSpec | 레벨 | 대상 |
| --- | --- | --- |
| TS-PERSIST | unit | `loadBest`/`saveBest` — 정상 저장·조회, 손상값(음수/NaN/비정수/null)→0, no-downgrade, 접근 예외 삼킴, 모드 격리 |
| TS-NEWRECORD | unit | `isNewRecord` — 엄격 초과=true, 동점=false, 손상 기준값=0 대비 판정 |
| TS-BOARD-UI | integration | 보드 상태(start-idle/gameover-normal/gameover-newrecord/empty-record) DOM 렌더, selector·aria 노출 |

- 신규 테스트는 `demo/neon-snake-fullscreen-0802/tests/highscore.test.js`(developer 소유)에 둔다.
- 저장소는 페이크(`{ store: Map, getItem, setItem }`)를 주입해 결정론적으로 검증한다.
- 실행 범위는 **focused**: 신규/영향 테스트만 실행하되, 공통 런타임(`src/game.js`) 회귀 가드는
  기존 test 파일로 함께 확인한다.

---

## 9. handoff 요약

- **designer(BF-1514 → `docs/design/snake-highscore-BF-1513.md`)**: §5 UI 계약을 시각 명세로
  구체화. selector·token·상태·접근성·반응형을 **재정의하지 말고** 준수. 새 파일/역할 추가 금지.
- **developer(BF-1515 → `highscore.js`/`index.html`/`tests/highscore.test.js`)**: §3 순수 함수
  구현 + §6 hook 배선 + §8 테스트. 4개 계약 파일 모두 **additive**. §7 불변 보장 준수.
