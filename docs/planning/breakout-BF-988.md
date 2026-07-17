# 벽돌깨기(Breakout) 게임 규칙·상태·수용 기준 명세 — BF-988

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-988 (Epic) · BF-990 (본 planner task)
> 대상 모듈: `breakout` (기존 `phase18-games/breakout/` — 아래 §0 가정 1 참조)
> tech-stack 태그: `vanilla-static` (외부 프레임워크·번들러·CDN 없음)
> 상태 영속화: 없음 — 서버 API 미사용, 브라우저 메모리(JS 변수)에만 상태 보관
> 단위 테스트: `node --test tests/breakout-*.test.js` (focused scope · module: `breakout`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 기존 검증된 구현·SSOT 승계, 재창작 아님:** 저장소에는 이미 `phase18-games/breakout/`(`index.html`/`styles.css`/`logic.js`/`main.js`)가 존재하고, 관련 기획·디자인 문서(`docs/plan/breakout-BF-928.md`, `docs/design/breakout-BF-928.md`)와 단위/E2E 테스트(`tests/breakout-BF931.test.js`, `tests/breakout/BF-933-e2e.test.js`)까지 확인됐다(사전 실측: `git log`, `find`, `logic.js` 직접 열람). 즉 본 Epic(BF-988)이 요구하는 "게임 규칙·상태 모델·조작 방식·수용 기준" 은 **이미 한 차례 확정되고 구현·테스트까지 완료된 계약**이다. 본 문서는 이를 임의로 재창작하지 않고, 검증된 상수·물리 공식·상태 전이를 **그대로 승계**하여 Epic BF-988 관점(신규 산출물 경로 `docs/planning/`, 접근성 요구 명시)으로 재정리하는 SSOT 갱신본이다. 상수·물리·상태 전이를 바꾸는 재설계가 필요하면 운영자 확인 후 개정한다(§13-2 모호함 1).

**가정 2 — 산출물 경로는 task 지시 원문 그대로 `docs/planning/breakout-BF-988.md`:** 본 task의 File Ownership·수용 기준 원문이 이 경로를 직접 지정했다. 동일 프로젝트의 최신 기획 문서들(`pong-BF-910.md`, `tetris-BF-833.md`, `phase18-snake-BF-923.md` 등)이 이미 `docs/planning/` 컨벤션을 사용 중이므로, 구버전 컨벤션(`docs/plan/`)을 사용했던 BF-928 시절 문서 대신 이 경로로 신규 작성한다. 두 문서는 공존하며, 본 문서가 이후 SSOT 갱신본이다.

**가정 3 — 라우트·module명 불변:** 대상 라우트는 기존과 동일한 `/phase18-games/breakout`(= `phase18-games/breakout/`), module명 `breakout` 그대로 유지한다. 새 라우트·새 디렉터리를 신설하지 않는다(추측성 확장 금지, Simplicity First).

**가정 4 — 물리 모델 = 연속 물리(`dt` 기반):** 공·패들의 이동은 프레임 경과 시간(`dt`)에 비례하는 연속 물리로 계산한다(스네이크의 이산 틱과 구분, 퐁과 동일 계열). 증속 없음 — 공 속력은 항상 `BALL_SPEED` 고정.

**가정 5 — 핵심 상수는 기존 값 그대로 확정 유지:** `LIVES_INITIAL=3`, `SCORE_PER_BRICK=10`, 벽돌 격자 `5행×8열=40개`(내구도 1, 다단계 없음) — 이미 구현·테스트가 이 값을 전제로 존재하므로 변경 시 회귀 위험이 크다. 값 변경이 필요하면 운영자가 별도 개정을 요청해야 한다(§13-2 모호함 2).

**가정 6 — "서버 API 없이 브라우저 메모리로만 상태 관리" = 세션 in-memory 전용:** `localStorage`/`sessionStorage` 등 영속 저장을 사용하지 않는다. 점수·생명·벽돌 상태는 순수 JS 변수로만 존재하고 새로고침 시 완전히 초기화된다(§6).

**가정 7 — 접근성(키보드 + 포인터) 두 경로 모두 필수:** 본 Epic 수용 기준이 "키보드 조작과 포인터 조작 두 경로가 모두 문서화된다"를 명시적으로 요구한다. §5에서 두 경로를 대등한 1급 입력으로 정의하고, 마지막으로 발생한 입력이 우선하는 원칙(둘 중 하나를 비활성화하지 않음)을 유지한다.

**가정 8 — 파일 소유권:** 본 task(BF-990)의 담당 파일은 `docs/planning/breakout-BF-988.md` 1개뿐이다. `phase18-games/breakout/*`(dev, BF-994), `docs/design/*`(designer, BF-992), `tests/breakout*`(tester, BF-999)는 후속 task 담당 영역이며 본 task에서 생성·수정하지 않는다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 보드·패들·공·벽돌 물리](#3-게임-규칙--보드패들공벽돌-물리)
4. [점수·생명·종료 조건](#4-점수생명종료-조건)
5. [입력 모델 — 키보드 + 포인터(접근성 2경로)](#5-입력-모델--키보드--포인터접근성-2경로)
6. [상태 모델 — 브라우저 메모리, 상태 전이](#6-상태-모델--브라우저-메모리-상태-전이)
7. [화면 구성 요구사항](#7-화면-구성-요구사항)
8. [외부 의존성 배제 확인](#8-외부-의존성-배제-확인)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 및 실패 케이스 목록](#10-edge-case-및-실패-케이스-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [파일 구조 및 기술 제약](#12-파일-구조-및-기술-제약)
13. [산출물 위치 및 참조 표 / 남은 모호함](#13-산출물-위치-및-참조-표--남은-모호함)

---

## 1. 개요

### 1.1 목적

`/phase18-games/breakout`의 게임 상태(공·패들·벽돌·점수·생명·종료), 키보드·포인터 입력 규칙, 결정론적 게임 루프 처리 순서, 화면 구성 요소를 검증 가능한 형태로 확정한다. 서버 API 없이 브라우저 메모리로만 상태를 관리하는 전제, 키보드·포인터 두 조작 경로의 동등성, 점수·생명·승패 조건을 이 문서 하나로 재현 가능하게 만든다(§0 가정 1 — 기존 검증 계약 승계).

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 대상 경로 | `phase18-games/breakout/`(`index.html`/`styles.css`/`logic.js`/`main.js`) |
| 게임 모드 | 1인용, 패들로 공을 튕겨 벽돌 40개를 모두 파괴 |
| 보드 | 논리 해상도 `360×480`(세로형, 모바일 우선) — §3.1 |
| 게임 루프 | §3.7 — 패들 이동 → 공 이동 → 벽 반사 → 벽돌 충돌 → 패들 충돌 → 생명 판정 → 승리 판정, `dt` 기반 연속 물리 |
| 점수·생명·종료 | §4 — 벽돌 1개당 10점, 생명 3회, 벽돌 전량 파괴=승리 / 생명 소진=게임오버 |
| 입력 | §5 — 키보드(방향키/AD) + 포인터(드래그) 패들 조작, Enter/Space/탭으로 발사 — 접근성 2경로 |
| 상태 영속화 | 없음 — 브라우저 메모리에만 존재, 새로고침 시 초기화 |
| 외부 의존성 | 없음 — 네트워크 요청·외부 라이브러리·서버 API·DB 0건(§8) |

### 1.3 전제 조건

- 브라우저 환경(Pointer Events 지원) 및 Node.js(`node --test`)로 순수 함수(물리·충돌·점수·상태 전이) 단위 테스트 가능
- 렌더링은 `<canvas>` 2D context 사용을 전제로 논리 좌표계를 설계한다 — 좌표계·상수(§3, §4)는 렌더링 방식과 무관하게 고정 계약
- `file://` 프로토콜(로컬 파일 직접 열기)로도 정상 동작해야 한다

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 보드(Board) | 게임이 벌어지는 논리적 직사각형 영역. 크기 `360 × 480`(px, 논리 좌표) 고정 |
| 패들(Paddle) | 사용자가 좌우로 조작하는 가로 막대. 보드 하단에 위치, Y 고정·X만 이동 |
| 공(Ball) | 원형 물체. 벽·패들·벽돌에 부딪혀 반사되며 이동 |
| 벽돌(Brick) | 5행×8열 격자에 배치된 40개의 고정 사각형. 공에 맞으면 즉시 파괴(내구도 1) |
| 생명(Life) | 공을 패들로 받아내지 못해 하단으로 완전히 벗어날 때마다 1씩 소모되는 자원. 초기값 3 |
| 발사(Launch) | `serve` 상태에서 패들에 붙어 있던 공을 실제로 쏘아 올리는 것(§3.6, §5) |
| 프레임(Frame)/`dt` | 게임 루프 갱신 단위. 매 프레임 경과 시간(초)을 `dt`로 받아 위치를 갱신(§3.7) |

---

## 3. 게임 규칙 — 보드·패들·공·벽돌 물리

### 3.1 좌표계 및 상수

원점 `(0,0)`은 보드 좌상단, `x`는 우측으로, `y`는 하단으로 증가(canvas 2D 표준 좌표계).

| 상수 | 값 | 설명 |
|---|---|---|
| `BOARD_WIDTH` | `360` | 보드 논리 폭(px) |
| `BOARD_HEIGHT` | `480` | 보드 논리 높이(px, 세로형) |
| `BRICK_ROWS` | `5` | 벽돌 행 수 |
| `BRICK_COLS` | `8` | 벽돌 열 수(총 40개) |
| `BRICK_WIDTH` | `40` | 벽돌 폭 |
| `BRICK_HEIGHT` | `16` | 벽돌 높이 |
| `BRICK_GAP` | `4` | 벽돌 사이 가로/세로 간격 |
| `BRICK_SIDE_MARGIN` | `6` | 보드 좌/우 경계로부터 벽돌까지 여백 |
| `BRICK_TOP_MARGIN` | `40` | 보드 상단으로부터 첫 벽돌 행까지 여백 |
| `PADDLE_WIDTH` | `64` | 패들 폭 |
| `PADDLE_HEIGHT` | `10` | 패들 높이 |
| `PADDLE_Y` | `440` | 패들 상단 Y(고정) |
| `PADDLE_SPEED_KEYBOARD` | `300` px/s | 키보드 입력 시 패들 이동 속도 |
| `BALL_RADIUS` | `6` | 공 반지름 |
| `BALL_SPEED` | `240` px/s | 공 속력(고정, 증속 없음) |
| `LAUNCH_ANGLE_MIN_DEG` / `MAX_DEG` | `60° / 80°`(수평 기준) | 발사 각도 범위 |
| `MAX_PADDLE_BOUNCE_ANGLE_DEG` | `60°`(수직 기준) | 패들 끝단 반사 최대각 |
| `LIVES_INITIAL` | `3` | 초기 생명 수 |
| `SCORE_PER_BRICK` | `10` | 벽돌 1개 파괴당 점수 |
| `MAX_DT` | `1/30`초 | 프레임 델타타임 상한(백그라운드 복귀 시 물리 폭주 방지) |

> `BALL_SPEED(240)` × `MAX_DT(1/30)` = 프레임당 최대 이동 `8px` — `PADDLE_HEIGHT(10px)`·`BRICK_HEIGHT(16px)`보다 작아 한 프레임에 통과(터널링)하는 상황이 발생하지 않는다.

### 3.2 벽돌 배치

```
brick(row, col).x = BRICK_SIDE_MARGIN + col × (BRICK_WIDTH + BRICK_GAP)
brick(row, col).y = BRICK_TOP_MARGIN + row × (BRICK_HEIGHT + BRICK_GAP)
// row: 0~4, col: 0~7 — 총 40개, 초기 상태 전부 alive=true
```

내구도는 항상 1(공에 한 번 맞으면 즉시 파괴) — 다단계 내구도 벽돌은 비범위(§11).

### 3.3 패들 초기 위치 및 이동

- 초기 위치: `paddle.x = (BOARD_WIDTH - PADDLE_WIDTH) / 2 = 148`
- 매 프레임: `paddle.x = clamp(paddle.x + inputVX × dt, 0, BOARD_WIDTH - PADDLE_WIDTH)`
- 패들 이동은 `status`가 `serve`/`playing`일 때만 반영된다(`paused`/`gameover`/`win`/`start`에서는 무시).

### 3.4 공 이동 및 벽 반사

```
ball.x += ball.vx * dt
ball.y += ball.vy * dt

// 좌/우 벽
if (ball.x - BALL_RADIUS <= 0)                { ball.x = BALL_RADIUS;              ball.vx = Math.abs(ball.vx) }
else if (ball.x + BALL_RADIUS >= BOARD_WIDTH) { ball.x = BOARD_WIDTH - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) }

// 상단 벽
if (ball.y - BALL_RADIUS <= 0)                { ball.y = BALL_RADIUS;              ball.vy = Math.abs(ball.vy) }

// 하단은 반사하지 않는다 — §3.8 생명 손실 판정 대상
```

### 3.5 패들 충돌 및 반사각 보정

패들·공이 AABB로 겹치고 **공이 하강 중(`ball.vy > 0`)일 때만** 충돌로 처리한다(상승 중 오탐 방지).

```
relativeIntersectX = clamp((ball.x - (paddle.x + PADDLE_WIDTH/2)) / (PADDLE_WIDTH/2), -1, 1)
bounceAngle = relativeIntersectX * degToRad(MAX_PADDLE_BOUNCE_ANGLE_DEG)
ball.vx = BALL_SPEED * Math.sin(bounceAngle)
ball.vy = -BALL_SPEED * Math.cos(bounceAngle)   // 항상 위쪽(음수)
ball.y  = PADDLE_Y - BALL_RADIUS                // 같은 프레임 재충돌 방지
```

속력은 항상 `BALL_SPEED`로 고정(증속 없음). 패들 중앙에 맞으면 거의 수직, 끝단일수록 각도가 커진다.

### 3.6 벽돌 충돌 및 발사(Launch)

**충돌 판정(원-사각형 최근접점, 결정론적 축 선택):**

```
function resolveBrickHit(ball, brick) {
  var closestX = clamp(ball.x, brick.x, brick.x + brick.width)
  var closestY = clamp(ball.y, brick.y, brick.y + brick.height)
  var dx = ball.x - closestX, dy = ball.y - closestY
  var overlapX = BALL_RADIUS - Math.abs(dx)
  var overlapY = BALL_RADIUS - Math.abs(dy)
  if (overlapX <= 0 || overlapY <= 0) return null
  if (overlapX < overlapY) { ball.vx = -ball.vx } else { ball.vy = -ball.vy }
  return { hit: true }
}
```

매 프레임 벽돌을 **행 우선(row-major) 순서**로 스캔해 `alive===true`이고 겹치는 **첫 벽돌 1개만** 처리한다.

```
brick.alive = false
score += SCORE_PER_BRICK
bricksAlive -= 1
if (bricksAlive === 0) status = 'win'   // 같은 프레임에서 즉시 확정, 이후 단계 생략(§3.8)
```

**발사(Launch, `serve → playing` 전이 시 1회 계산):**

```
function launchVector(rand) {
  var r = typeof rand === 'function' ? rand : Math.random
  var dirX = r() < 0.5 ? -1 : 1                                                              // 좌/우 50:50
  var angleDeg = LAUNCH_ANGLE_MIN_DEG + r() * (LAUNCH_ANGLE_MAX_DEG - LAUNCH_ANGLE_MIN_DEG)   // 60°~80°
  var angle = degToRad(angleDeg)
  return { vx: dirX * BALL_SPEED * Math.cos(angle), vy: -BALL_SPEED * Math.sin(angle) }       // 항상 위쪽
}
```

`rand` 주입 가능(기본 `Math.random`) — 단위 테스트에서 결정적 값 재현 가능.

### 3.7 게임 루프(프레임) — 처리 순서 (결정론적 흐름)

순수 함수 `update(state, dt, inputVX, rand) → newState`가 매 프레임 다음을 **이 순서 그대로** 수행한다:

```
1. status가 'paused'|'start'|'gameover'|'win' 이면 → 그대로 반환(패들도 정지)
2. paddle.x = clamp(paddle.x + inputVX(state) * dt, 0, BOARD_WIDTH - PADDLE_WIDTH)   // serve/playing 공통
3. status === 'serve' 이면: ball이 paddle을 추종(물리 없음) → 반환
4. (playing) 공 이동 + 벽 반사(§3.4)
5. 벽돌 충돌 스캔·처리(§3.6) → bricksAlive===0 이면 status='win' 즉시 반환(6~7 생략)
6. 패들 충돌 판정·반사(§3.5, ball.vy > 0 일 때만)
7. 하단 이탈 판정: ball.y - BALL_RADIUS > BOARD_HEIGHT
     → lives -= 1; lives>0 → status='serve'(재부착) / lives===0 → status='gameover', gameoverReason='out-of-lives'
8. 새 상태 반환
```

동일한 `(state, dt, inputVX)` 입력에 대해 항상 동일한 `newState`를 산출한다(무작위 요소는 §3.6 발사 시점의 `rand` 호출 1곳뿐).

### 3.8 승리·생명 소진 우선순위

벽돌 충돌 판정(5번)이 하단 이탈 판정(7번)보다 항상 먼저 실행되고, 벽돌 충돌로 `status='win'`이 확정되면 즉시 반환하므로 "마지막 벽돌 파괴"와 "공 하단 이탈"이 동일 프레임에서 동시에 발생할 수 없다.

---

## 4. 점수·생명·종료 조건

### 4.1 점수

- 벽돌 1개 파괴마다 `score += SCORE_PER_BRICK(10)`.
- 최대 가능 점수 = `40 × 10 = 400`.
- 점수는 정수이며 감소하지 않는다(패널티 없음).
- 재시작(`gameover`/`win` → `serve`) 시 `score`는 `0`으로 리셋된다.

### 4.2 생명(Lives)

- 초기값 `LIVES_INITIAL(3)`.
- 공이 하단으로 완전히 벗어날 때마다 `lives -= 1`.
- `lives > 0`이면 `status='serve'`로 전이해 새 공을 패들에 재부착(패들 위치·`score`·`bricks` 상태는 유지).
- `lives === 0`이면 `status='gameover'`(§4.3).

### 4.3 종료 조건

| 조건 | 결과 |
|---|---|
| `bricksAlive === 0`(40개 전부 파괴) | `status='win'` — 승리, 최종 점수 표시 |
| `lives === 0`(생명 소진) | `status='gameover'`, `gameoverReason='out-of-lives'` — 최종 점수 표시 |

두 종료 조건 모두 게임 루프가 정지하고, 재시작 입력(§5.2·§5.3, §6.2)으로만 새 라운드를 시작할 수 있다.

---

## 5. 입력 모델 — 키보드 + 포인터(접근성 2경로)

### 5.1 통합 조작 원칙

패들 X 위치는 **키보드**와 **포인터(마우스/터치 통합, Pointer Events)** 두 경로로 갱신될 수 있으며, 두 경로는 대등한 1급 입력이다 — 어느 한쪽만 지원하고 다른 쪽을 비활성화하지 않는다(접근성 요구, §0 가정 7). 마지막으로 발생한 입력이 우선하고 서로 덮어쓰지 않는다. 발사(공을 쏘아 올리는 동작)도 키보드·포인터 양쪽에서 동일하게 트리거된다(§5.2, §5.3).

### 5.2 키보드 조작 (데스크톱 · 접근성 경로 1)

| 키 | 동작 |
|---|---|
| `ArrowLeft` / `A` (누르고 있는 동안) | `paddle.x -= PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowRight` / `D` (누르고 있는 동안) | `paddle.x += PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowLeft`+`ArrowRight` 동시 눌림 | 상쇄 — 순이동 `0`(결정론적 정지) |
| `Enter` / `Space` | `start → serve` 시작 / `serve → playing` 발사(§3.6) / `gameover`·`win` → `serve` 재시작(§6.2) |
| `P` / `Escape` | `playing ⇄ paused` 토글(§6.2) — `serve` 중에는 동작하지 않음 |

- 모든 인터랙션 요소(버튼)는 `Tab`으로 포커스 가능해야 하고 `focus-visible` 포커스 링을 노출한다(designer 계약, 본 문서는 최소 요구만 명시).

### 5.3 포인터(터치·마우스 드래그) 조작 (접근성 경로 2)

- **입력 방식**: Pointer Events(`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) — 터치와 마우스 드래그를 동일 코드 경로로 처리한다. 캔버스에 `touch-action: none`을 지정해 드래그 중 페이지 스크롤/줌을 방지한다.
- **좌표 변환**: `logicalX = (event.clientX - canvasRect.left) / canvasRect.width * BOARD_WIDTH`, `paddle.x = clamp(logicalX - PADDLE_WIDTH/2, 0, BOARD_WIDTH - PADDLE_WIDTH)` — 속도 제한 없이 포인터 위치를 즉시 추종.
- **드래그 영역**: 캔버스 전체 표시 영역이 드래그 감지 대상이다.
- **포인터 캡처**: `pointerdown` 시 `canvas.setPointerCapture(event.pointerId)` — 드래그 중 포인터가 캔버스 경계 밖으로 나가도 `pointermove`가 계속 전달되도록 한다.
- **Y 좌표는 무시**: 터치 지점의 Y 위치는 패들 이동에 영향을 주지 않는다(패들은 X축으로만 이동).
- **발사 트리거**: `status==='start'`일 때 캔버스 `pointerdown` → `serve` 전이. `status==='serve'`일 때 `pointerdown` → 발사(§3.6, `playing` 전이) — 드래그 시작과 발사가 한 동작으로 통합.
- **멀티터치**: 두 손가락 이상 동시 터치는 지원하지 않는다(캡처된 포인터가 있는 동안 추가 `pointerdown`은 무시).

### 5.4 접근성 요구 (본 Epic 수용 기준 대응)

| 항목 | 요구 |
|---|---|
| 키보드만으로 완결 | 시작 → 발사 → 패들 이동 → 일시정지 → 재시작 → 메뉴 이동까지 전 과정을 키보드(§5.2)만으로 완결할 수 있어야 한다 |
| 포인터만으로 완결 | 동일한 전 과정을 포인터(§5.3)만으로도 완결할 수 있어야 한다 |
| 두 경로 동시 지원 | 한 세션 안에서 키보드/포인터를 섞어 사용해도 오류 없이 마지막 입력이 반영된다(§5.1) |
| 상태 안내 | 점수·생명·게임오버/승리 결과는 시각 요소뿐 아니라 텍스트로도 표시되어 스크린리더가 낭독 가능해야 한다(`aria-live` 등 구체 구현은 designer/dev 재량) |
| 포커스 가시성 | 버튼 등 조작 요소는 키보드 포커스 시 시각적으로 식별 가능해야 한다(`focus-visible`) |

---

## 6. 상태 모델 — 브라우저 메모리, 상태 전이

### 6.1 상태 데이터 형태 (in-memory 전용)

```js
state = {
  status: 'start' | 'serve' | 'playing' | 'paused' | 'gameover' | 'win',
  score: 0,
  lives: 3,
  paddle: { x: 148 },                              // y는 PADDLE_Y 고정
  ball: { x: 180, y: 434, vx: 0, vy: 0 },           // serve 중엔 paddle을 추종
  bricks: [ { row: 0, col: 0, x: 6, y: 40, width: 40, height: 16, alive: true }, /* ...40개 */ ],
  bricksAlive: 40,
  gameoverReason: null,                              // 'out-of-lives' | null
}
```

이 객체는 순수 JS 런타임 변수로만 존재하며, `localStorage`/`sessionStorage`/서버 세션 어디에도 기록되지 않는다. 페이지를 새로고침하거나 닫으면 완전히 소실된다(§0 가정 6).

### 6.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `start` | `serve` | "시작" 버튼, `Enter`/`Space`, 또는 캔버스 탭(status=start) | `score=0`, `lives=3`, 벽돌 40개 전부 `alive=true`, 패들 중앙 배치(`x=148`), 공을 패들에 부착 |
| `serve` | `playing` | `Enter`/`Space` 또는 캔버스 탭(발사, §5.2·§5.3) | `launchVector()`로 속도 벡터 계산, 게임 루프 물리 시작 |
| `playing` | `serve` | 공 하단 이탈 & `lives > 0` | `lives -= 1`, 공을 패들 현재 위치에 재부착, `score`/`bricks` 유지 |
| `playing` | `gameover` | 공 하단 이탈 & 소모 후 `lives === 0` | `gameoverReason='out-of-lives'` 확정, 루프 정지 |
| `playing` | `win` | `bricksAlive === 0` | 루프 정지, 승리 결과 화면(최종 `score`) |
| `playing` | `paused` | `P`/`Escape`(status=playing) | 루프 정지(공/패들/벽돌 그대로 보존) |
| `paused` | `playing` | `P`/`Escape` 또는 "계속하기" 버튼 | 루프 재개 |
| `paused` | `start` | "메뉴로" 버튼 | 진행 중 점수/공/벽돌 상태 폐기, 시작 화면 복귀 |
| `gameover` | `serve` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `start → serve`와 동일한 전체 초기화(새 라운드) |
| `gameover` | `start` | "메뉴로" 버튼 | 시작 화면 복귀 |
| `win` | `serve` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `start → serve`와 동일한 전체 초기화(재도전) |
| `win` | `start` | "메뉴로" 버튼 | 시작 화면 복귀 |

> 정의되지 않은 전이(예: `start`/`gameover`/`win`/`paused`에서 패들 이동, `serve` 중 `P`/`Escape`)는 **무시**된다 — 예외를 던지지 않는다.

### 6.3 상태별 수용 기준 (Given/When/Then)

**AC-STATE-01 (start → serve)**
> **Given** 사용자가 시작 화면(`status=start`)에 있다
> **When** "시작" 버튼 클릭, `Enter`/`Space`, 또는 캔버스 탭(키보드·포인터 어느 경로든)을 하면
> **Then** `status`가 `serve`로 전이되고 `score=0`, `lives=3`, 벽돌 40개가 배치되며 공이 패들 중앙에 부착된다.

**AC-STATE-02 (serve → playing, 발사)**
> **Given** 공이 패들에 부착된 상태(`status=serve`)이다
> **When** `Enter`/`Space` 또는 캔버스 탭을 하면
> **Then** `status`가 `playing`으로 전이되고 §3.6 `launchVector()`로 계산된 속도로 공이 발사된다(수평 기준 60°~80°, 좌/우 50:50).

**AC-STATE-03 (playing에서 벽돌 파괴)**
> **Given** 게임이 진행 중이고 벽돌이 1개 이상 살아있다
> **When** 공이 살아있는 벽돌과 충돌하면
> **Then** `status`는 `playing` 유지, 해당 벽돌 `alive=false`, `score` +10, 공은 §3.6 규칙대로 반사된다.

**AC-STATE-04 (playing → serve, 생명 손실)**
> **Given** 게임이 진행 중이고 `lives >= 2`이다
> **When** 공이 보드 하단을 완전히 벗어나면
> **Then** `lives`가 1 감소하고 `status`가 `serve`로 전이되어 새 공이 부착된다(`score`·`bricks` 유지).

**AC-STATE-05 (playing → gameover, 생명 소진)**
> **Given** 게임이 진행 중이고 `lives === 1`이다
> **When** 공이 보드 하단을 완전히 벗어나면
> **Then** `lives`가 `0`이 되고 `status='gameover'`, `gameoverReason='out-of-lives'`가 설정되며 루프가 정지한다.

**AC-STATE-06 (playing → win)**
> **Given** 게임이 진행 중이고 `bricksAlive === 1`이다
> **When** 마지막 벽돌이 파괴되면
> **Then** `bricksAlive=0`, `status`가 즉시 `win`으로 전이되고 루프가 정지한다(같은 프레임의 하단 이탈 판정은 실행되지 않음).

**AC-STATE-07 (playing ⇄ paused)**
> **Given** 게임이 진행 중이다
> **When** `P` 또는 `Escape`를 누르면
> **Then** `status`가 `paused`로 전이되어 공/패들/벽돌이 그 상태로 정지하고, 다시 누르면 `playing`으로 복귀해 정지 시점 그대로 재개된다.

**AC-STATE-08 (gameover/win → serve, 재시작)**
> **Given** 사용자가 게임오버 또는 승리 상태이다
> **When** `Enter`/`Space` 또는 "다시 하기" 버튼(키보드·포인터 어느 경로든)을 누르면
> **Then** `score=0`, `lives=3`, 벽돌 40개 전부 복구된 새 라운드가 `serve` 상태로 시작된다.

**AC-STATE-09 (paused/gameover/win → start)**
> **Given** 사용자가 일시정지·게임오버·승리 상태 중 하나이다
> **When** "메뉴로" 버튼을 누르면
> **Then** `status=start`로 전이되고 진행 중이던 점수/생명/벽돌 상태는 폐기된다.

---

## 7. 화면 구성 요구사항

### 7.1 페이지 구조

```
<body>
 ├─ <header class="topbar">     ← "벽돌깨기" 타이틀
 └─ <main class="page">
     ├─ <div class="hud">          ← "점수 {score}   생명 {lives}"
     ├─ <canvas id="board" width="360" height="480">
     └─ <div class="controls-hint">   ← "←/→ 또는 화면을 드래그해 패들을 움직이고, Enter/탭으로 발사하세요" + 시작/일시정지/재시작 버튼
```

### 7.2 반응형 규칙 (권장)

- 캔버스 CSS: `width:100%; max-width:360px; height:auto; aspect-ratio:3/4;` — 논리 해상도는 불변, 표시 크기만 축소.
- HUD·조작 안내·버튼은 캔버스 위/아래로 세로 스택 배치되어 좁은 뷰포트에서도 가로 스크롤 없이 전부 표시된다.
- 포인터 좌표 변환식(§5.3)이 매 이벤트마다 `canvasRect`를 다시 읽어 리사이즈/회전에 자동 대응한다.

### 7.3 HUD 표시 요구

| 요소 | 표시 규칙 |
|---|---|
| 점수 | "점수 {score}" 형식, `score` 값과 실시간 동기화 |
| 생명 | "생명 {lives}" 형식(최소 계약은 정수 카운트, 시각 표현은 designer 재량) |
| 페이지 진입 | 로드 시 `status=start` 화면이 즉시 렌더링되고, 빈 보드(또는 벽돌 40개 미리보기) + "시작" 버튼이 표시된다 |
| 종료 화면 | `gameover`/`win` 상태에서 최종 `score`가 강조 표시되고 "다시 하기"/"메뉴로" 버튼이 노출된다 |

### 7.4 `prefers-reduced-motion` 처리 방침

공의 이동 자체가 게임의 핵심 동작이므로 `prefers-reduced-motion: reduce`에서도 공/패들의 물리적 이동은 동일하게 유지한다. 파티클·화면 흔들림 등 부가 연출은 v1 범위에 포함하지 않는다(§11).

### 7.5 `<noscript>` 폴백

JS가 비활성화된 경우 "이 게임은 JavaScript가 필요합니다" 안내 문구를 표시한다.

---

## 8. 외부 의존성 배제 확인

| 확인 항목 | 값 |
|---|---|
| `fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 호출 | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건 |
| 신규 npm 패키지/외부 CDN 스크립트 | 0건 |
| 서버 API 라우트 신규 생성 | 없음 |
| `localStorage`/`sessionStorage` 등 영속 저장 | 없음(§0 가정 6) |
| `file://` 프로토콜 호환 | 비-module(IIFE/UMD) 패턴 필수 |

검증 방법: `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://|localStorage|sessionStorage" phase18-games/breakout/*` → 매치 0건이어야 통과.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-990 수용 기준 원문 매핑

**AC-1 (게임 규칙·상태·조작·승패 조건의 검증 가능한 정의)**
> **Given** Epic BF-988의 사용자 가치
> **When** 기획 명세를 작성하면
> **Then** `docs/planning/breakout-BF-988.md`에 게임 규칙·상태·조작·승패 조건이 검증 가능하게 정의된다.

충족 근거: §3(좌표계·상수·물리 공식·프레임 처리 순서) · §4(점수/생명/종료 조건) · §5(키보드·포인터 입력 규칙) · §6(상태 데이터 형태·전이표·AC-STATE-01~09) · §7(화면 구성) · §8(vanilla-static/브라우저 메모리 전제).

**AC-2 (접근성 — 키보드·포인터 두 경로 모두 문서화)**
> **Given** 접근성 요구
> **When** 명세를 완성하면
> **Then** 키보드 조작(§5.2)과 포인터 조작(§5.3) 두 경로가 모두 문서화된다.

충족 근거: §5.1(통합 조작 원칙, 두 경로 대등) · §5.2(키보드 표) · §5.3(포인터 좌표 변환·캡처·발사 트리거) · §5.4(접근성 요구 표 — 키보드만/포인터만으로 완결 가능 명시).

### 9.2 파생 AC — 게임 규칙·물리

**AC-RULE-01 (공 이동·벽 반사)**
> **Given** `status=playing`이고 공이 유효한 `(vx, vy)`를 갖는다
> **When** 프레임이 갱신되면
> **Then** 공이 `dt`에 비례해 이동하고, 좌/우/상단 경계에 닿으면 해당 축 속도 부호가 반전된다(§3.4).

**AC-RULE-02 (패들 반사각 보정)**
> **Given** 공이 하강 중(`vy>0`)이고 패들과 충돌했다
> **When** 반사가 계산되면
> **Then** 충돌 지점 비율에 비례해 반사각이 최대 `60°`까지 조정되고, 속력은 항상 `BALL_SPEED(240)`로 고정된 채 항상 위쪽으로 반사된다(§3.5).

**AC-RULE-03 (벽돌 파괴·점수)**
> **Given** 살아있는 벽돌과 공이 겹친다
> **When** 프레임이 갱신되면
> **Then** 스캔 순서상 첫 번째로 겹친 벽돌이 `alive=false`로 전환되고 `score`가 `10` 증가하며, 공은 겹침 축에 따라 결정론적으로 반사된다(§3.6).

**AC-RULE-04 (생명 손실)**
> **Given** `status=playing`이고 공이 패들 아래로 떨어지고 있다
> **When** 공의 Y좌표가 `BOARD_HEIGHT`를 완전히 벗어나면
> **Then** `lives`가 1 감소하고, 남은 생명이 있으면 `serve`로, 없으면 `gameover`로 전이된다(§3.7 step 7, AC-STATE-04·05).

**AC-RULE-05 (승리)**
> **Given** `bricksAlive === 1`이고 마지막 벽돌이 파괴 대상이다
> **When** 공이 그 벽돌과 충돌하면
> **Then** `bricksAlive=0`이 되고 같은 프레임 안에서 즉시 `status='win'`으로 전이되며, 하단 이탈 판정은 실행되지 않는다(§3.8, AC-STATE-06).

**AC-RULE-06 (발사 각도 결정론적 범위)**
> **Given** 고정된 `rand` 함수가 주입되었다(테스트 환경)
> **When** `launchVector(rand)`를 호출하면
> **Then** 항상 동일한 `(vx, vy)`가 산출되며, 수평 기준 `60°~80°` 범위·속력 `240`을 만족한다(§3.6).

### 9.3 파생 AC — 입력·접근성·화면

**AC-INPUT-01 (키보드 이동)**
> **Given** `status`가 `serve` 또는 `playing`이다
> **When** `ArrowLeft`/`A` 또는 `ArrowRight`/`D`를 누르고 있으면
> **Then** 패들이 `PADDLE_SPEED_KEYBOARD(300px/s)`로 해당 방향으로 이동하고 보드 경계에서 클램프된다(§5.2, §3.3).

**AC-INPUT-02 (포인터 드래그 이동)**
> **Given** 사용자가 캔버스를 손가락/마우스로 누른 채 좌우로 이동한다
> **When** `pointermove` 이벤트가 발생하면
> **Then** 패들 중심이 포인터의 논리 X좌표를 즉시 추종하며(§5.3), 드래그 중 페이지 스크롤/줌이 발생하지 않는다.

**AC-INPUT-03 (발사 입력 동등성)**
> **Given** `status=serve`이다
> **When** `Enter`/`Space` 키 입력 또는 캔버스 탭(`pointerdown`) 중 어느 쪽이 발생해도
> **Then** 동일하게 `launchVector()`가 호출되어 `playing`으로 전이된다(§5.1, §5.2, §5.3).

**AC-A11Y-01 (키보드만으로 전 과정 완결)**
> **Given** 포인터 입력 장치가 없다(키보드 전용)
> **When** 사용자가 §5.2 키만으로 시작→발사→이동→일시정지→재시작→메뉴 이동을 시도하면
> **Then** 모든 전이가 키보드만으로 완결되고 포인터 의존 동작은 없다(§5.4).

**AC-A11Y-02 (포인터만으로 전 과정 완결)**
> **Given** 키보드 입력이 없다(터치/마우스 전용)
> **When** 사용자가 §5.3 포인터 동작만으로 동일 전 과정을 시도하면
> **Then** 모든 전이가 포인터만으로 완결된다(§5.4).

**AC-PAGE-01 (페이지 진입 렌더)**
> **Given** 사용자가 `/phase18-games/breakout`에 처음 접근한다
> **When** 페이지가 로드되면
> **Then** `status=start` 화면이 즉시 렌더링되고 점수 `0`·생명 `3`이 HUD에 표시되며 벽돌 40개가 시각적으로 배치된다(§7.1, §7.3, AC-STATE-01).

**AC-PAGE-02 (점수·생명 실시간 갱신)**
> **Given** 게임이 진행 중이다
> **When** 벽돌이 파괴되거나 생명이 소모되면
> **Then** HUD의 점수·생명 표시가 각 사건 직후 프레임에 즉시 갱신된다(§7.3, AC-STATE-03·04·05).

### 9.4 매핑 요약표

| BF-990 수용 기준 | 충족 근거 |
|---|---|
| Given Epic BF-988의 사용자 가치, When 기획 명세 작성, Then docs/planning/breakout-BF-988.md 에 게임 규칙·상태·조작·승패 조건이 검증 가능하게 정의된다 | §3~§6(규칙/상태/입력 전체) + §9.2~9.3(파생 GWT 6개 + 입력/접근성 GWT 5개 + 상태 AC 9개) |
| Given 접근성 요구, When 명세 완성, Then 키보드 조작과 포인터 조작 두 경로가 모두 문서화된다 | §5(입력 모델 전체) + §9.3 AC-INPUT-01~03, AC-A11Y-01~02 |

---

## 10. Edge Case 및 실패 케이스 목록

1. **발사 각도·방향의 비결정적 무작위성**: §3.6 `launchVector`는 기본 `Math.random()` 사용 — 동일 재시작이라도 매번 궤적이 다르다. 단위 테스트는 `rand`를 결정적 함수로 주입해 재현하거나 범위만 검증한다.
2. **상승 중인 공과 패들의 오탐 방지**: `ball.vy <= 0`일 때는 패들과 겹쳐도 충돌로 처리하지 않는다(§3.5) — 이중 반사 방지.
3. **동일 프레임 다중 벽돌 겹침**: 행 우선 스캔 순서상 먼저 발견된 벽돌 1개만 처리된다(§3.6) — 동시 다중 파괴 없음.
4. **승리와 생명 손실의 동시 발생 불가**: §3.8 — 벽돌 충돌 판정이 하단 이탈 판정보다 항상 먼저 실행된다.
5. **탭 백그라운드 전환 후 델타타임 급증**: `dt = min(rawDt, MAX_DT(1/30))`으로 상한 클램프해 물리 폭주를 방지한다(§3.7).
6. **고속 구간 터널링 미발생**: §3.1 각주 부등식(`BALL_SPEED × MAX_DT < PADDLE_HEIGHT, BRICK_HEIGHT`)이 유지되는 한 터널링이 발생하지 않는다 — 속력 상한을 올리는 개정 시 반드시 재검증해야 한다.
7. **생명 손실 후 패들 위치 유지**: `serve`로 복귀할 때 패들 X는 리셋되지 않고 직전 위치를 유지한다(§4.2).
8. **정의되지 않은 상태에서의 입력**: `start`/`gameover`/`win`/`paused`에서 패들 이동 시도는 무시되고 예외를 던지지 않는다(§6.2).
9. **`serve` 상태에서의 일시정지 시도**: 정의된 전이가 없어 무시된다 — 일시정지는 `playing`에서만 유효하다(§6.2).
10. **포인터 드래그 중 캔버스 경계 이탈**: `setPointerCapture`로 방지하지 않으면 패들 추종이 끊긴다(§5.3).
11. **동시 다중 포인터(멀티터치) 입력**: 캡처된 첫 포인터만 유효, 두 번째 포인터는 무시한다(§5.3).
12. **좌우 동시 키 입력**: 상쇄하여 순이동을 `0`으로 고정한다(§5.2, 결정론적).

---

## 11. 비범위 (Out of Scope)

- 멀티볼(공 2개 이상 동시 진행) 파워업
- 벽돌 다단계 내구도(여러 번 맞아야 파괴되는 벽돌) — 전 벽돌 내구도 1 고정
- 패들 확장/축소, 공 감속 등 파워업/아이템
- 레벨/스테이지 진행(2번째 벽돌 배치 등) — 단일 스테이지(40개 고정 격자)만 지원
- 벽돌별 차등 점수 — 고정 10점으로 단순화
- 사운드 효과
- 파티클/화면 흔들림 등 부가 연출(§7.4)
- 온스크린 방향 버튼(◀/▶) UI — 포인터 드래그로 충분(§5.3), 필요 시 dev 재량으로 추가 가능하나 필수 아님
- 최고 점수 등 영속 통계/리더보드 — 영속 저장 자체가 비범위(§0 가정 6)
- 온라인 대전/멀티플레이어
- 디자인 mockup 산출물 — designer(BF-992) 담당 영역, 본 문서는 규칙/물리/상태/입력 계약만 정의

---

## 12. 파일 구조 및 기술 제약

| 파일 | 역할 |
|---|---|
| `phase18-games/breakout/index.html` | 마크업(§7.1), `<canvas id="board" width="360" height="480">` |
| `phase18-games/breakout/styles.css` | 반응형 레이아웃(§7.2), 저장소 공통 디자인 토큰 재사용 |
| `phase18-games/breakout/logic.js` | 순수 함수: `update`(§3.7), 벽 반사(§3.4), 패들 반사(§3.5), 벽돌 충돌·발사(§3.6), 초기 상태 생성 — UMD/IIFE, `node --test` 대상 |
| `phase18-games/breakout/main.js` | DOM 바인딩: `requestAnimationFrame` 루프, 키보드(§5.2)·포인터(§5.3) 입력 처리, 캔버스 렌더링, 상태 전이(§6) 실행 |

- 논리 좌표계(`360×480`)와 상수(§3.1)는 렌더링 방식과 무관하게 고정 계약이다.
- 비-module(IIFE/UMD) 패턴 필수 — `file://` 프로토콜 직접 실행 호환.
- 게임 루프는 `requestAnimationFrame` + `dt` 클램프 기반을 권장한다.
- 테스트(tester, BF-999): `node --test tests/breakout-*.test.js` — ① 공 이동/벽 반사 검증, ② 패들 반사각 보정(`vy>0` 가드 포함) 검증, ③ 벽돌 충돌 판정·스캔 순서·점수 갱신 검증, ④ 발사 벡터 범위(`rand` 주입) 검증, ⑤ 생명 손실/게임오버/승리 전이 경계값 검증, ⑥ 동시 키 입력 상쇄 검증, ⑦ 키보드·포인터 접근성 경로 각각의 전이 검증(AC-A11Y-01·02), ⑧ §8 정적 검사(외부 의존성 0건).

---

## 13. 산출물 위치 및 참조 표 / 남은 모호함

### 13.1 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/breakout-BF-988.md`(본 문서, task 지시 원문 그대로) |
| 기존 검증 SSOT(승계 대상) | `docs/plan/breakout-BF-928.md`(BF-928/929, 게임 규칙·물리·상태 전이 최초 확정본) |
| 기존 검증 구현(변경 없음, 참고만) | `phase18-games/breakout/{index.html,styles.css,logic.js,main.js}`(BF-930/931) |
| 기존 디자인 문서(참고만) | `docs/design/breakout-BF-928.md`(BF-930, designer) |
| 기존 테스트(참고만) | `tests/breakout-BF931.test.js`, `tests/breakout/BF-933-e2e.test.js` |
| 신규 산출물 대상(후속 task) | designer(BF-992): 디자인 명세/mockup · dev(BF-994): 구현 변경분(있다면) · tester(BF-999): 테스트 보강(있다면) |

### 13.2 남은 모호함 (운영자 확인 권장)

1. **Epic BF-988의 정확한 목적 — 재정리 vs 신규 재구축**: 본 세션에 `dependency: jira=미제공`이라 BF-988 Epic 원문(변경 배경, 이전 Epic BF-927/928과의 관계)을 직접 확인할 수 없었다. 본 문서는 이미 검증된 `phase18-games/breakout` 구현·기획을 그대로 승계하는 "SSOT 재정리 + 접근성 요구 명문화"로 해석했다(§0 가정 1). 만약 Epic BF-988이 실제로는 기존 구현과 무관한 별도 신규 게임(다른 경로·다른 규칙)을 의도했다면, 운영자가 이 가정을 정정해야 한다.
2. **핵심 상수 변경 필요 여부**: `LIVES_INITIAL=3`, `SCORE_PER_BRICK=10`, 벽돌 5×8=40개 등은 기존 값을 그대로 유지했다(§0 가정 5). 운영자가 다른 값을 원하면 §3.1·§4 개정이 필요하며, 기존 구현·테스트도 함께 갱신해야 한다.
3. **`serve` 상태에서 "메뉴로" 버튼 노출 여부**: §10-9 — `serve→start` 전이가 정의되지 않았다. 발사 대기 화면에서도 메뉴 복귀가 필요하면 §6.2에 행을 추가해야 한다(기존 문서와 동일한 미결정 사항).
4. **Jira 코멘트 등록**: 본 세션에 Jira MCP가 할당되어 있지 않아 직접 코멘트를 등록하지 못했다. `worker_brokered_lifecycle_writes`에 따라 시스템이 본 문서 커밋과 이 세션의 최종 메시지를 근거로 Jira 코멘트를 등록할 것으로 예상한다.

---

*문서 종료 — [박기획] · BF-990 (벽돌깨기 기획 명세 정리, Epic BF-988)*
