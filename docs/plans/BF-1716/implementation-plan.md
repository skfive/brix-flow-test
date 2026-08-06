# BF-1716 · Phaser 엔드리스 러너 — 구현 설계 및 UI 계약 (Frozen Blueprint)

- **작성**: 박기획 (planner) · Task BF-1762
- **상태**: active (frozen blueprint 렌더링)
- **소비자**: designer(BF-1758), developer(BF-1760)
- **권위**: 이 문서는 frozen Execution Blueprint의 파일·소유자·상태·후조건을 **그대로 설명**한다. 새 파일·역할·요구사항을 추가하지 않으며, 파일 소유권/상태 계약은 frozen blueprint가 유일한 권위이다. 이 문서는 이를 재정의하지 않는다.

---

## 1. 목표와 범위

PM 분해를 designer/developer가 그대로 따를 수 있도록, Phaser 3 기반 엔드리스 러너 게임의 구현 설계와 exact UI 계약을 동결한다. 모든 작업은 **`phaser-endless-runner/` 디렉터리 내부에서만** 이루어진다.

### 환경 제약 (동결)

- **Phaser 3는 CDN 로드** — 번들러/npm 의존성 추가 없이 `<script>` CDN 태그로 로드한다.
- **정적 서버 실행** — `serve_root=.` 기준 root-relative 정적 서빙(`vanilla-static`, ESM)으로 동작한다. 별도 빌드 스텝 없음.
- **`phaser-endless-runner/` 외부 파일 불변경** — 이 디렉터리 밖의 어떤 파일도 생성·수정하지 않는다.
- **파일 소유권/상태 계약의 유일 권위는 frozen blueprint**이며, 본 문서는 이를 재정의하지 않는다.

---

## 2. 파일 구조 (동결 — additive)

frozen blueprint가 지정한 artifact 파일 집합. 각 파일 정책은 `additive`(기존 내용 삭제 없이 추가/구현). 파일 소유자는 blueprint 기준이다.

| 경로 | 소유자 | 설명 |
| --- | --- | --- |
| `phaser-endless-runner/README.md` | canonical work packet owner | 실행 방법(정적 서버), 조작법, 파일 구조 안내 |
| `phaser-endless-runner/design-tokens.html` | developer | 디자인 토큰 참조 시트(색상/타이포/스페이싱 시각화) |
| `phaser-endless-runner/design-mockup.html` | developer | 정적 UI 목업(4개 상태 오버레이 레이아웃) |
| `phaser-endless-runner/index.html` | developer | 진입점 — Phaser CDN 로드, DOM 컨테이너, 토큰 CSS |
| `phaser-endless-runner/src/game-logic.js` | developer | **순수 게임 로직**(렌더링 비의존, RNG 주입) |
| `phaser-endless-runner/src/main.js` | developer | Phaser scene·렌더링·입력 바인딩, game-logic 소비 |
| `phaser-endless-runner/tests/game-logic.test.js` | developer | 순수 로직 단위 테스트 |

> designer/developer는 위 selector·token·상태·파일 소유권을 **변경하거나 재정의하지 않는다**.

---

## 3. UI 계약 (동결 — exact 값)

### 3.1 DOM ID (정확히 이 id만 사용)

| ID | 용도 |
| --- | --- |
| `game-root` | Phaser 캔버스가 마운트되는 루트 컨테이너 |
| `hud-score` | 현재 점수 표시 |
| `hud-distance` | 진행 거리 표시 |
| `hud-highscore` | 최고 점수 표시 |
| `start-overlay` | 시작(start) 상태 오버레이 |
| `start-button` | 게임 시작 control |
| `pause-overlay` | 일시정지(paused) 상태 오버레이 |
| `resume-button` | 재개 control |
| `gameover-overlay` | 게임오버(gameover) 상태 오버레이 |
| `gameover-score` | 게임오버 시 최종 점수 표시 |
| `restart-button` | 재시작 control |

### 3.2 CSS class (정확히 이 class만 사용)

`runner`, `runner__hud`, `runner__overlay`, `runner__panel`, `runner__title`, `runner__button`

### 3.3 게임 상태 (정확히 4개)

`start` → `playing` → `paused` → `gameover`

- **start**: 초기/부트 상태. `start-overlay` 표시, `start-button`으로 `playing` 진입.
- **playing**: 러너 진행. 입력(점프/숙이기) 활성. `pause`로 `paused` 진입, 충돌 시 `gameover`.
- **paused**: 진행 정지, `pause-overlay` 표시. `resume-button`으로 `playing` 복귀.
- **gameover**: 충돌 종료. `gameover-overlay`(role=alert) 표시, `restart-button`으로 상태와 진행 표시를 **초기값으로 되돌려** `playing`(또는 start) 재개.

> **후조건 불변식**: 초기화·취소·실패 뒤에는 상태와 진행 표시(점수/거리)를 초기값으로 되돌리고, 주 실행 control(start/restart)을 다시 사용할 수 있어야 한다. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.4 디자인 토큰 (정확히 이 이름=값)

| 토큰 | 값 |
| --- | --- |
| `--color-bg-top` | `#0b1120` |
| `--color-bg-bottom` | `#1e293b` |
| `--color-ground` | `#334155` |
| `--color-player` | `#38bdf8` |
| `--color-obstacle-ground` | `#f43f5e` |
| `--color-obstacle-air` | `#a855f7` |
| `--color-accent` | `#fbbf24` |
| `--color-text` | `#f8fafc` |
| `--font-size-title` | `48px` |
| `--font-size-hud` | `20px` |
| `--font-weight-bold` | `700` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--radius-panel` | `12px` |

### 3.5 접근성 (동결)

- `start-button`·`resume-button`·`restart-button`은 **명시적 `aria-label`**을 가진다.
- 점프는 `Space`와 `ArrowUp`, 숙이기는 `ArrowDown` 키로 동작한다.
- `gameover-overlay`는 `role="alert"`로 최종 점수와 최고 점수를 안내한다.
- 모든 상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로 노출**한다.

### 3.6 반응형 (동결)

- **320px 이상**에서 캔버스와 HUD가 뷰포트 밖으로 overflow하지 않는다.
- 게임 캔버스는 **고정 종횡비를 유지**하며 뷰포트 폭에 맞춰 축소된다(Phaser `Scale.FIT` 계열 사용).

---

## 4. 순수 게임 로직 설계 (`src/game-logic.js`)

렌더링(Phaser)과 **완전히 분리**된 순수 함수/모듈. Phaser·DOM·전역 시간·전역 난수에 의존하지 않는다. 테스트는 이 모듈만 대상으로 한다(`tests/game-logic.test.js`).

### 4.1 주입 가능한 RNG

- 로직은 난수 생성기를 **인자로 주입**받는다(예: `createGame({ rng })`). `rng()`는 `[0, 1)` 실수를 반환하는 함수.
- 기본값 없이 명시적으로 주입해 테스트에서 결정론적(seeded/스텁) RNG를 넣을 수 있게 한다. 이로써 장애물 생성 같은 확률적 동작을 재현 가능하게 검증한다.

### 4.2 상태 모델 (순수)

로직이 관리하는 상태 형태(예):

```
GameState {
  status: 'start' | 'playing' | 'paused' | 'gameover',
  score: number,          // 초기 0
  distance: number,       // 초기 0
  highScore: number,      // 세션 내 최고
  speed: number,          // 시간/거리에 따라 증가
  player: { lane/y, action: 'run'|'jump'|'duck' },
  obstacles: Array<{ kind: 'ground'|'air', x, ... }>,
}
```

### 4.3 순수 함수 인터페이스 (렌더링 비의존)

| 관심사 | 책임 | 비고 |
| --- | --- | --- |
| **상태 전이** | `start→playing→paused→gameover` 및 재시작 초기화. 유효하지 않은 전이는 무시/거부. | 초기화 시 score·distance·speed를 초기값으로 복원 |
| **충돌** | 플레이어 액션(run/jump/duck)과 장애물(kind=ground/air) 겹침 판정 | ground 장애물은 점프로, air 장애물은 숙이기로 회피 |
| **점수** | 거리·생존 시간에 비례해 증가, 종료 시 highScore 갱신 | |
| **속도 증가** | 진행에 따라 `speed` 단조 증가(난이도 상승) | RNG와 무관한 결정론적 증가 |
| **장애물 생성** | 주입된 `rng()`로 다음 장애물 kind/간격 결정 | 결정론적 테스트 가능 |

- `main.js`는 매 프레임(Phaser update) 델타 시간을 로직 `step(state, dt, input)`에 전달하고, 반환된 상태로 캔버스/HUD를 렌더링만 한다. **판정 로직은 game-logic에만** 존재한다.

---

## 5. 렌더링/입력 계층 (`src/main.js`)

- Phaser 3 scene에서 `game-logic`을 소비. update 루프에서 입력 수집 → `step()` 호출 → 상태로 캔버스/HUD/오버레이 갱신.
- 입력 바인딩: `Space`/`ArrowUp`=점프, `ArrowDown`=숙이기. 버튼(start/resume/restart)은 클릭 + `aria-label`.
- 상태별 오버레이(`start-overlay`/`pause-overlay`/`gameover-overlay`) 토글, HUD(`hud-score`/`hud-distance`/`hud-highscore`) 갱신.
- 스케일: 고정 종횡비 유지 + 뷰포트 폭 축소. HUD/오버레이는 320px 이상 overflow 금지.

---

## 6. 테스트 대상 (`tests/game-logic.test.js`)

- **대상은 순수 로직만** (`test_scope=focused`, `focused_test_command`은 미제공 — 신규 route라 full authority 승격 부적합).
- 검증 항목:
  1. 상태 전이: start→playing→paused→playing→gameover, 재시작 시 score/distance/speed 초기화.
  2. 충돌: ground 장애물 vs 점프/미점프, air 장애물 vs 숙이기/미숙이기.
  3. 점수: 진행에 따른 증가 및 highScore 갱신.
  4. 속도 증가: 진행에 따른 단조 증가.
  5. 장애물 생성: **스텁 RNG 주입** 시 결정론적 결과 재현.
- 실행: 저장소 표시 명령 `npm test`(표시용). 신규 파일/직접 관련 테스트만 실행하며 타 모듈 회귀는 이번 작업에서 실행하지 않는다.

---

## 7. Handoff 계약 요약

| 소비자 | 따라야 할 것 |
| --- | --- |
| **designer** (BF-1758) | §3 UI 계약(DOM id/class/토큰/상태/접근성/반응형)을 `design-tokens.html`·`design-mockup.html`에 exact 값으로 반영. selector/token 변경·재정의 금지. `phaser-endless-runner/` 밖 파일 생성·수정 금지. |
| **developer** (BF-1760) | §2 파일 구조 + §3 UI 계약 + §4 순수 로직(RNG 주입)/§5 렌더링 분리/§6 테스트를 구현. CDN 로드·정적 서버·외부 파일 불변경 제약 준수. |

**불변식 (frozen)**: designer와 developer는 승인된 실행 설계를 따르며 `phaser-endless-runner/` 밖의 파일을 만들거나 수정하지 않는다. selector와 token을 변경/재정의하지 않는다. 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며 이 문서는 이를 재정의하지 않는다.
