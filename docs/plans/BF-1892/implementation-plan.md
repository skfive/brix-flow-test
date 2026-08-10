# BF-1898 · 벽돌깨기 게임(games/breakout.html) 구현 설계

- Jira: BF-1898 (Epic BF-1892)
- 담당 파일: `games/breakout.html` (developer 소유, 단일 파일 신규 생성)
- 본 문서 소유: `docs/plans/BF-1892/implementation-plan.md` (planner 소유)
- frozen blueprint 실행 순서: `plan(현재) → develop → review → test` — 새 파일/역할 추가 없음 (designer 단계 없음)

> 본 문서는 frozen Execution Blueprint의 UI 계약(`ui-contract@v1`)을 그대로 서술한다. developer는 아래 DOM id/class/상태/토큰/접근성/반응형 계약을 재정의하지 않고 그대로 구현한다.

## 1. 개요

벽돌깨기(Breakout) 게임을 `games/breakout.html` 단일 파일(HTML+CSS+JS 인라인)로 구현한다. 외부 라이브러리·빌드 도구 없이 정적 파일로 서빙된다 (`observed_stack=vanilla-static`, `serve_root=.`, route `/games/breakout.html`).

## 2. UI 계약 (frozen — 변경 금지)

### 2.1 DOM 구조

```html
<div class="game-container">
  <div class="hud">
    <span>점수: <span id="score-value" aria-live="polite">0</span></span>
    <p id="status-message" aria-live="polite">스페이스바 또는 아래 버튼을 눌러 시작하세요.</p>
  </div>
  <canvas id="game-canvas" role="img" aria-label="벽돌깨기 게임 화면" width="480" height="600"></canvas>
  <div class="overlay overlay--visible">
    <button id="restart-button" aria-label="게임 다시 시작">시작</button>
  </div>
</div>
```

- `game-canvas`, `score-value`, `status-message`, `restart-button` 4개 id는 정확히 이 이름으로 존재해야 한다.
- `game-container`, `hud`, `overlay`, `overlay--visible` 4개 class는 정확히 이 이름으로 존재해야 한다.
- `overlay--visible`은 상태가 `idle | win | gameover`일 때 `overlay` 요소에 부여되고, `playing`일 때는 제거된다(오버레이 숨김).
- `restart-button`은 idle/win/gameover 어느 상태에서 눌러도 동일하게 동작하는 단일 재사용 control이다(아래 3장 상태 머신 참조). 버튼을 새로 만들거나 상태별로 분기하지 않는다.

### 2.2 상태 (state)

`idle | playing | win | gameover` 4가지. 상태는 색상만으로 구분하지 않고 `status-message` 텍스트와 접근성 이름으로도 노출한다.

| 상태 | `status-message` 텍스트(예시) | overlay | 조작 가능 |
|---|---|---|---|
| idle | "스페이스바 또는 아래 버튼을 눌러 시작하세요." | 표시 | restart-button만 |
| playing | "게임 진행 중" 또는 빈 문자열 | 숨김 | 패들 이동 |
| win | "승리했습니다! 다시 시작하려면 버튼을 누르세요." | 표시 | restart-button만 |
| gameover | "게임 오버. 다시 시작하려면 버튼을 누르세요." | 표시 | restart-button만 |

### 2.3 CSS 변수 (design tokens)

```css
:root {
  --color-bg: #111827;
  --color-paddle: #38bdf8;
  --color-ball: #f8fafc;
  --color-brick: #f97316;
  --color-text: #e5e7eb;
  --space-hud-gap: 12px;
}
```

- `--color-bg`: 캔버스/컨테이너 배경
- `--color-paddle`: 패들 렌더링 색
- `--color-ball`: 공 렌더링 색
- `--color-brick`: 벽돌 렌더링 색(활성 벽돌)
- `--color-text`: HUD·상태 텍스트 색
- `--space-hud-gap`: `hud` 내부 요소 간 간격(예: `gap: var(--space-hud-gap)`)

### 2.4 접근성

- `restart-button`은 `aria-label="게임 다시 시작"`을 가진다(idle/win/gameover 공통, 버튼 표시 텍스트는 자유이나 aria-label은 고정).
- `status-message`, `score-value`는 `aria-live="polite"` 영역으로, 상태·점수 변경 시 스크린리더에 자동 통지된다.
- `game-canvas`는 `role="img"`와 `aria-label`로 캔버스 렌더링 내용을 텍스트로 대체 설명한다(캔버스 내부 그래픽은 스크린리더가 읽지 못하므로 상태 정보는 반드시 `status-message`/`score-value` DOM 텍스트로도 노출되어야 한다).
- 모든 상태 전환은 `status-message` 텍스트 갱신을 동반해야 하며, 색상 변경만으로 상태를 구분하지 않는다.

### 2.5 반응형

- 320px 이상 뷰포트에서 `game-canvas`와 `hud`가 폭에 맞춰 축소되며 콘텐츠 overflow가 발생하지 않는다.
- 구현 방식: `game-canvas`의 내부 렌더링 해상도(width/height 속성, 예 480×600)는 고정하고, CSS로 `max-width: 100%; height: auto;`를 적용해 컨테이너 폭에 맞게 시각적으로 축소한다. `game-container`에는 `max-width`와 `width: 100%`, 좌우 여백 없는 `box-sizing: border-box`를 적용해 320px 뷰포트에서도 가로 스크롤이 생기지 않게 한다.

## 3. 상태 머신

```
        [restart-button click]
   ┌───────────────────────────────┐
   │                                 │
   ▼                                 │
 idle ──(restart-button click)──▶ playing
                                    │  │
                     (벽돌 잔여 0) │  │ (공이 패들 아래로 낙하)
                                    ▼  ▼
                                  win  gameover
                                    │  │
                                    └──┴──(restart-button click)──▶ playing
```

- `idle → playing`: `restart-button` 클릭. 진입 시 점수 0, 패들 중앙 위치, 공 초기 위치/속도, 벽돌 전체 생성, overlay 숨김.
- `playing → win`: 활성 벽돌 개수가 0이 되는 순간 판정. overlay 표시, `status-message` 승리 텍스트.
- `playing → gameover`: 공의 y좌표가 캔버스 하단(패들 라인)을 벗어나는 순간 판정(라이프 시스템 없이 1회 낙하 = 게임오버). overlay 표시, `status-message` 게임오버 텍스트.
- `win → playing`, `gameover → playing`: 동일한 `restart-button` 클릭으로 재진입. 진입 절차는 `idle → playing`과 동일(점수/공/패들/벽돌 전체 초기화, overlay 숨김, 주 실행 control인 `restart-button`은 즉시 재사용 가능 상태 유지).
- `playing` 상태에서만 패들 입력과 공 물리 갱신이 동작한다. 다른 상태에서는 게임 루프의 위치 갱신을 정지한다.

## 4. 게임 로직 흐름

### 4.1 패들 이동

- 입력: 키보드 좌/우 화살표 또는 `A`/`D` (keydown/keyup으로 방향 플래그 관리, 매 프레임 `paddle.x += paddle.speed * direction`).
- `playing` 상태에서만 입력을 반영한다.
- 패들은 `game-canvas` 좌우 경계를 벗어나지 않도록 `x`를 `[0, canvasWidth - paddleWidth]` 범위로 clamp한다.

### 4.2 공-벽돌/벽/패들 충돌

- 매 프레임(`requestAnimationFrame`): 공 좌표를 `dx, dy`만큼 이동 → 벽(좌/우/상단) 충돌 시 해당 축 속도 반전 → 패들 AABB 충돌 시 `dy` 반전(+ 패들 위 충돌 지점에 따라 `dx` 조정 가능) → 활성 벽돌들과 AABB 충돌 검사.
- 벽돌과 충돌 시: 해당 벽돌 `active = false` 처리, 공의 `dy`(또는 충돌 축) 반전, `score += 1` (또는 벽돌당 고정 점수), `score-value` DOM 텍스트 갱신.
- 한 프레임에서 여러 벽돌과 동시 충돌이 감지되어도 프레임당 처리한 벽돌 수만큼만 점수를 증가시킨다(중복 가산 금지).
- 공이 패들보다 아래(캔버스 하단)로 내려가면 벽돌/패들 충돌 검사 없이 즉시 `gameover` 전환.

### 4.3 승리 판정

- 벽돌 배열의 `active === true` 개수를 매 프레임(또는 벽돌 파괴 시점마다) 확인. 0이면 `win` 전환 및 게임 루프의 이동 갱신 정지.

### 4.4 게임오버 판정

- 공의 `y + radius > canvasHeight`이면 `gameover` 전환 및 게임 루프의 이동 갱신 정지.

### 4.5 점수 갱신

- 점수는 음수가 될 수 없으며 벽돌 파괴 시에만 증가한다.
- `score-value.textContent`를 갱신하면 `aria-live="polite"`에 의해 스크린리더에 자동 통지되므로 별도 알림 로직은 불필요하다.

### 4.6 재시작 로직

- `restart-button` 클릭 핸들러는 상태와 무관하게 항상 동일 로직을 실행한다: `score = 0` → 벽돌 배열 재생성(전체 `active = true`) → 공/패들 위치·속도 초기값 재설정 → `overlay--visible` 제거 → `status-message` 초기화 → 상태를 `playing`으로 전환 → 게임 루프 재시작.
- 이 절차는 idle에서의 최초 시작과 win/gameover에서의 재시작에 동일하게 적용되어, 실패(게임오버) 이후에도 동일한 주 control로 즉시 재진입할 수 있다.

## 5. 데이터 모델 (런타임 상태, DB 없음)

| 엔티티 | 필드 |
|---|---|
| GameState | `state: 'idle'\|'playing'\|'win'\|'gameover'`, `score: number` |
| Paddle | `x, width, height, speed: number` |
| Ball | `x, y, dx, dy, radius: number` |
| Brick | `x, y, width, height: number`, `active: boolean` |

- 모든 상태는 브라우저 메모리(JS 변수)에만 존재하며 영속 저장소·마이그레이션 대상이 아니다.
- `state`가 `playing`일 때만 `Paddle`/`Ball` 좌표가 갱신된다.
- 재시작 시 `GameState`, `Paddle`, `Ball`, `Brick[]`는 모두 초기값으로 재설정된다.

## 6. 아키텍처 (단일 파일 내부 구성)

| 구성요소 | 책임 |
|---|---|
| render | Canvas 2D context에 패들·공·벽돌·배경을 매 프레임 그린다 |
| game-loop | `requestAnimationFrame` 기반 루프로 물리 갱신과 렌더링을 오케스트레이션한다 |
| input | 키보드 입력을 수신해 패들 목표 속도를 갱신한다 |
| collision | 공-벽/패들/벽돌 충돌을 판정하고 반사·벽돌 제거·점수 이벤트를 계산한다 |
| state | idle/playing/win/gameover 상태 머신과 전환 규칙을 관리한다 |
| hud | `score-value`, `status-message`, `overlay` DOM을 상태 변화에 맞춰 갱신한다 |

제약:
- 단일 파일(`games/breakout.html`) 안에 HTML/CSS/JS를 모두 포함하며 외부 런타임 의존성을 추가하지 않는다.
- 2장의 DOM id/class/상태/토큰/접근성/반응형 계약은 재정의하지 않고 그대로 따른다.
- frozen blueprint 구성(`plan/develop/review/test`) 밖의 새 파일이나 역할을 추가하지 않는다.

## 7. Edge case / 실패 케이스

- 공이 패들 모서리에 충돌: 패들 폭 대비 충돌 지점 비율로 `dx`를 조정해 동일 각도로 무한 반사되지 않게 한다(단순 반전만으로도 AC 충족 가능하나, 각도 조정을 권장).
- 여러 벽돌과 동시 충돌: 프레임당 실제 파괴된 벽돌 수만큼만 점수 가산(4.2 참조).
- `playing` 도중 브라우저 탭 비활성화 등으로 `requestAnimationFrame`이 지연되어도 상태 판정 로직은 다음 프레임에 정상 복귀한다(별도 타이머 보정 불필요, 단순 정지 후 재개).
- 320px 폭 뷰포트: `game-canvas`가 `max-width:100%`로 축소되어도 클릭/키보드 입력 좌표 매핑에는 영향 없음(패들은 키보드 전용 입력이므로 좌표 스케일링 이슈 없음).
- gameover/win 상태에서 키보드 입력: `playing`이 아니므로 패들 이동 입력은 무시된다.

## 8. Acceptance Criteria (Given/When/Then)

**AC-1 (UI 계약)**
- Given `games/breakout.html`이 로드된 상태
- When DOM을 검사하면
- Then `game-canvas`, `score-value`, `status-message`, `restart-button` id와 `game-container`, `hud`, `overlay` class, 4개 CSS 변수, `idle/playing/win/gameover` 상태 표현이 모두 2장 계약과 정확히 일치한다.

**AC-2 (접근성)**
- Given 상태가 전환되는 시점
- When 스크린리더 사용자가 페이지를 탐색하면
- Then `restart-button`은 `aria-label="게임 다시 시작"`을 갖고, `status-message`/`score-value`는 `aria-live="polite"`로 변경 내용을 텍스트로 전달한다.

**AC-3 (반응형)**
- Given 뷰포트 폭이 320px
- When 페이지를 렌더링하면
- Then `game-canvas`와 `hud`가 폭에 맞춰 축소되고 가로 overflow가 발생하지 않는다.

**AC-4 (게임 진행)**
- Given 상태가 `idle`
- When `restart-button`을 클릭하면
- Then 상태가 `playing`으로 전환되고 패들이 좌/우 키 입력에 따라 캔버스 경계 안에서 이동하며, 공이 벽/패들/벽돌과 충돌해 반사된다.

**AC-5 (점수)**
- Given 상태가 `playing`이고 공이 활성 벽돌과 충돌
- When 충돌이 감지되면
- Then 해당 벽돌이 비활성화되고 `score-value`가 정확히 1회 증가한다.

**AC-6 (승리)**
- Given 상태가 `playing`이고 활성 벽돌이 1개 남음
- When 마지막 벽돌이 파괴되면
- Then 상태가 `win`으로 전환되고 overlay가 표시되며 `status-message`가 승리를 텍스트로 알린다.

**AC-7 (게임오버)**
- Given 상태가 `playing`
- When 공이 패들 아래로 낙하하면
- Then 상태가 `gameover`로 전환되고 overlay가 표시되며 `status-message`가 게임오버를 텍스트로 알린다.

**AC-8 (재시작)**
- Given 상태가 `win` 또는 `gameover`
- When `restart-button`을 클릭하면
- Then `score`가 0으로, 벽돌이 전체 활성 상태로, 공/패들이 초기 위치로 재설정되고 상태가 `playing`으로 전환되며 overlay가 숨겨진다.

## 9. 검증 계획 (수동 QA — 자동 테스트 도구 미구성)

- `focused_test_authority=unavailable`, `e2e=unavailable`이므로 자동화 테스트 러너는 구성하지 않는다.
- tester는 브라우저에서 `games/breakout.html`을 직접 열어 8장의 AC-1~AC-8을 수동으로 순서대로 검증하고, 뷰포트를 320px로 줄여 AC-3을 재확인한다.

## 10. Traceability 요약

각 Requirement → TestSpecification(검증) → developer/tester RoleWorkPacket(구현·검증 할당) 매핑은 본 작업의 Planning Dossier(`[PLANNING_DOSSIER_DRAFT_V1]`)에 `TraceLink` 아티팩트로 기록한다. frozen Execution Blueprint 커버리지는 `plan → develop → review → test` 4개 RoleWorkPacket이며 새 packet을 추가하지 않는다.
