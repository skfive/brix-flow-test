# Line Defense — 실행 설계 및 UI 계약 (BF-1737 / BF-1752)

> 본 문서는 **planner가 동결한 실행 설계 + UI handoff 계약**이다.
> designer(BF-1748)·developer(BF-1750)는 이 문서와 frozen blueprint를 유일 권위로 삼아
> 병렬로 구현한다. 아래 selector·token·상태·소유권은 **재정의 금지**이며,
> 문서가 blueprint와 충돌하면 blueprint가 우선한다. planner는 새 파일·새 역할을 추가하지 않는다.

- Jira epic: BF-1737 · Task: BF-1752 (planner)
- primary_repo: backend
- 산출물 module 루트: `canvas-tower-defense/` (**모든 산출물은 이 디렉터리 밖으로 나가지 않는다**)
- observed stack: vanilla-static · module type: ESM · serve_root: `.`

---

## 1. 파일 소유권 (frozen)

모든 파일은 `canvas-tower-defense/` 안에만 위치한다. 소유권은 frozen blueprint의 `file_owner`가 유일 권위다.

| 파일 | 소유자 | 역할 |
| --- | --- | --- |
| `canvas-tower-defense/README.md` | canonical work packet owner | 실행/서브 명령·게임 규칙 요약·selector·token 색인 |
| `canvas-tower-defense/design-tokens.html` | developer | 디자인 토큰 정의 문서(:root CSS 변수 표) |
| `canvas-tower-defense/design-mockup.html` | developer | 화면 상태별 정적 목업 |
| `canvas-tower-defense/index.html` | developer | 실제 실행 진입 화면(DOM 골격 + 토큰 로드) |
| `canvas-tower-defense/src/game.js` | developer | **순수 게임 로직**(상태·충돌·자원·점수·웨이브), 렌더/DOM 미참조 |
| `canvas-tower-defense/src/render.js` | developer | canvas 렌더 + DOM/HUD 갱신, game.js 결과만 소비 |
| `canvas-tower-defense/tests/game.test.js` | developer | game.js 순수 로직 단위 테스트 |

- **소유권 규칙**: designer/developer는 위 파일 집합·소유자·경로를 변경하거나 새 파일을 추가하지 않는다.
- `additive` 정책: 위 모든 아티팩트는 additive로만 확장(기존 selector/token/상태 계약을 제거·재정의하지 않음).

---

## 2. 아키텍처 — 게임 로직/렌더 분리 (frozen)

렌더링과 게임 로직을 완전히 분리한다. `game.js`는 **순수 함수 집합**이며 `window`·`document`·`canvas`·`Date.now`·`Math.random`을 참조하지 않는다.

```
[입력/타이머]  →  game.js (순수 상태 전이)  →  render.js (canvas + HUD/DOM 반영)
                        ↑ 주입: rng, dt
```

### 2.1 `src/game.js` 계약 (순수)

상태 객체(불변 갱신 지향)와 순수 전이 함수를 export 한다. 모든 무작위성은 **주입된 `rng` 함수**로만 발생한다.

- `createInitialState(config)` → `state` — 초기 상태 생성(자원/생명/점수/웨이브/엔티티 초기값).
- `step(state, dt, rng)` → `nextState` — 한 tick 진행. 적 이동·스폰·충돌·자원/생명/점수/웨이브 갱신을 모두 계산. `rng: () => number`(범위 `[0,1)`)를 인자로 받아 **결정적**으로 동작.
- `placeTower(state, cell)` → `nextState` — 자원 충분 시 타워 배치(자원 차감), 부족하면 상태 불변.
- `setPhase(state, phase)` → `nextState` — 화면 상태 전이(start/playing/paused/gameover).
- `reset(state | config)` → `nextState` — 초기값으로 되돌림(생명·자원·점수·웨이브·진행 표시 리셋, 주 control 재사용 가능 상태).

**결정적 난수 주입 인터페이스**: 호출자는 `rng` 함수를 주입한다. 테스트는 seed 기반 PRNG(예: mulberry32)를 주입해 재현성을 확보하고, 런타임(render 루프)은 시드 초기화된 동일 PRNG를 주입한다. `game.js`는 rng를 **생성하지 않고 소비만** 한다.

- `state.phase ∈ { 'start', 'playing', 'paused', 'gameover' }`
- `state`는 직렬화 가능한 순수 데이터(함수·DOM 핸들 미포함).

### 2.2 `src/render.js` 계약

- `game.js`의 `state`를 입력받아 `#game-canvas`에 렌더하고 HUD DOM(`#hud-*`)·오버레이(`#overlay-*`)를 갱신.
- requestAnimationFrame 루프·타이머·입력 이벤트·rng 시드 주입을 소유. **게임 규칙 계산은 하지 않고** `game.js` 함수 호출 결과만 반영.
- 상태 전이(일시정지/재시작/게임오버) 시 §5 상태 계약대로 DOM/aria를 갱신.

---

## 3. 게임 규칙 (planner 정의, 결정적·테스트 가능)

아래 수치는 planner가 동결한 기본 규칙이다. developer는 이 값을 `createInitialState`의 config 기본값으로 구현하고, 테스트는 이 규칙으로 검증한다.

### 3.1 생명(lives)
- 시작 생명: **20**.
- 적 1기가 경로 끝(base)에 도달하면 생명 **-1**.
- `lives <= 0` 이 되는 tick에서 phase → `gameover`.

### 3.2 자원(resource)
- 시작 자원: **100**.
- 적 처치 시 처치 보상 **+10**.
- 타워 1기 배치 비용 **50**. `resource < 50`이면 배치 거부(상태 불변).

### 3.3 점수(score)
- 적 처치당 **+100**.
- 웨이브 전멸 클리어 보너스 **+500**.
- 점수는 단조 증가(감소 없음).

### 3.4 웨이브(wave)
- 웨이브 번호 `wave`는 1부터 시작.
- 웨이브 N의 적 수 = `5 + (N-1) * 3` (N=1 → 5, N=2 → 8 …).
- 스폰 간격·적 등장 지점 변동은 주입된 `rng`로 결정(예: `rng()`로 스폰 지연 지터 산출).
- 현재 웨이브 적을 모두 처치/소멸시키면 다음 웨이브로 전이하며 클리어 보너스 부여.

### 3.5 충돌·이동
- 적은 고정 경로를 따라 이동(경로는 상태 데이터). 타워는 사거리 내 가장 앞선 적을 대상으로 데미지.
- 적 체력 `<= 0` → 처치(보상·점수 반영). 적이 base 도달 → 생명 차감 후 제거.

> 위 수치는 config로 노출되어 조정 가능하되, 기본값은 본 문서 값을 유지한다.

---

## 4. UI 계약 — DOM selector (frozen, 재정의 금지)

### 4.1 DOM IDs
| ID | 용도 |
| --- | --- |
| `game-canvas` | 게임 렌더 canvas |
| `hud-resource` | 현재 자원 표시 |
| `hud-lives` | 현재 생명 표시 |
| `hud-score` | 현재 점수 표시 |
| `hud-wave` | 현재 웨이브 표시 |
| `btn-pause` | 일시정지/재개 control |
| `btn-restart` | 재시작 control |
| `overlay-start` | 시작(start) 오버레이 |
| `overlay-gameover` | 게임오버 오버레이 |

### 4.2 CSS classes
| class | 용도 |
| --- | --- |
| `td-stage` | canvas 컨테이너(비율 유지 반응형 축소) |
| `td-hud` | HUD 컨테이너(좁은 화면 wrap) |
| `td-hud__stat` | 개별 stat 표시 요소 |
| `td-overlay` | 오버레이 공통 |
| `td-button` | 버튼 기본 |
| `td-button--primary` | 주 실행 버튼(primary 액션) |

- designer/developer는 위 selector·class를 변경·재정의·추가 금지(additive 확장은 계약 범위 내에서만).

---

## 5. 화면 상태 계약 (frozen)

`state ∈ { start, playing, paused, gameover }`.

| 상태 | 화면 | 오버레이 | control |
| --- | --- | --- | --- |
| `start` | canvas 대기 | `overlay-start` 표시 | 시작 버튼(`td-button--primary`) 활성 |
| `playing` | 게임 진행 | 오버레이 숨김 | `btn-pause`=일시정지, `btn-restart` 활성 |
| `paused` | 진행 정지 | (선택) 일시정지 표시 | `btn-pause`=재개 |
| `gameover` | 게임 종료 | `overlay-gameover` 표시(최종 점수) | `btn-restart`로 재시작 |

**초기화·취소·실패 후조건(frozen invariant)**: `reset`/재시작/`gameover` 후에는 생명·자원·점수·웨이브 진행 표시(`hud-*`)를 **초기값으로 되돌리고**, 주 실행 control(`btn-restart`, start 오버레이의 primary 버튼)을 **다시 사용 가능**해야 한다.

- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

---

## 6. 디자인 토큰 (frozen, exact 값 — 재정의 금지)

`design-tokens.html`의 `:root`에 아래 값 그대로 정의한다.

| 토큰 | 값 |
| --- | --- |
| `--color-bg` | `#0f172a` |
| `--color-surface` | `#1e293b` |
| `--color-path` | `#475569` |
| `--color-tower` | `#38bdf8` |
| `--color-enemy` | `#f43f5e` |
| `--color-action-primary` | `#22c55e` |
| `--color-danger` | `#ef4444` |
| `--color-text` | `#e2e8f0` |
| `--font-size-hud` | `16px` |
| `--font-size-title` | `32px` |
| `--space-hud-gap` | `12px` |
| `--radius-panel` | `8px` |
| `--shadow-panel` | `0 4px 12px rgba(0,0,0,0.4)` |

---

## 7. 접근성 (frozen)

- `game-canvas`는 게임 상황을 설명하는 `aria-label`을 가진다.
- `btn-pause`·`btn-restart`는 명시적 `aria-label`을 가진다.
- `overlay-start`·`overlay-gameover`의 상태 변화는 `aria-live="polite"`로 알린다.
- `btn-pause`·`btn-restart`는 Tab 포커스와 Enter 실행이 가능하다.
- 모든 상태는 색상만이 아니라 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 8. 반응형 (frozen)

- 320px 이상 뷰포트에서 content overflow가 발생하지 않는다.
- `td-stage`는 컨테이너 폭에 맞춰 canvas 비율을 유지하며 축소된다.
- `td-hud`는 좁은 화면에서 wrap되어 stat 텍스트가 잘리지 않는다.

---

## 9. Handoff 계약 요약 (designer / developer)

- **designer(BF-1748)**: §4~§8을 유일 권위로 목업/토큰 화면을 구성. selector·token·상태·접근성·반응형을 그대로 구현하며 새 selector/token/파일 추가 금지.
- **developer(BF-1750)**: §2~§3의 로직/렌더 분리·게임 규칙·결정적 rng 주입을 구현. `game.js`는 순수 함수(무작위성은 주입만), `render.js`는 반영만. `tests/game.test.js`는 seed 주입으로 규칙(생명/자원/점수/웨이브/충돌)과 §5 후조건을 검증.
- **공통 invariant**: 모든 산출물은 `canvas-tower-defense/` 안에만 위치. selector/token 재정의 금지. game 로직은 렌더와 분리된 순수 함수, 무작위 요소는 주입 가능.

## 10. 검증(수용 후조건)

- `game.js` 단위 테스트: 동일 seed rng 주입 시 `step` 결과가 결정적으로 재현된다.
- 생명 0 → `gameover` 전이, `reset` 후 HUD·control 초기값 복귀가 테스트로 확인된다.
- 자원 부족 시 타워 배치 거부, 처치 시 자원·점수 반영이 확인된다.
- test scope: focused(신규/수정 테스트와 `canvas-tower-defense/` 직접 관련 테스트만).
