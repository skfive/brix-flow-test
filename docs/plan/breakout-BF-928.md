# 벽돌깨기(Breakout) 게임 규칙·상태·수용 기준 명세 — BF-928

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-929(본 planner task, File Ownership 원문 `docs/plan/**`) · BF-928(수용 기준 원문이 파일명에 직접 지정한 번호)
> 대상 라우트: `/phase18-games/breakout` (= `phase18-games/breakout/`, 신규 디렉터리)
> 페이지 타이틀: "벽돌깨기"
> tech-stack 태그: `vanilla-static`(외부 프레임워크·번들러 없음, 저장소 실질 스택과 일치)
> 신규 module: `breakout` — 저장소 내 기존 module명과 충돌 없음(사전 확인 완료, §0 가정 9)
> 단위 테스트(예정, 후속 task): `node --test tests/breakout-*.test.js` (focused scope · module: `breakout`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 경로 컨벤션, `phase18-games/` 최근 선례 그대로 적용:** task 설명이 라우트를 `/phase18-games/breakout`으로 이미 명시했다(수용 기준 2번째 항목). 저장소 최상위에는 실제 라우터가 없고(`package.json` `name: notepad-spa`), 동일 컨테이너 아래 `phase18-games/pong/`(BF-910~915)·`phase18-games/memory-match/`(BF-916~919)·`phase18-games/snake/`(BF-923~927)가 이미 3연속 같은 관례로 구현되어 있다(`git log` 커밋 `489a80e`/`959f5d5`/`b8edecf` 확인). 본 게임도 동일 관례로 **`phase18-games/breakout/`**(저장소 최상위, 3개 게임과 형제 디렉터리)에 신설한다.

**가정 2 — 산출물 경로는 `docs/plan/breakout-BF-928.md`(task 지시 원문 그대로, 재해석 없음):** 본 task의 수용 기준 원문이 **명시적으로 `docs/plan/breakout-BF-928.md`**를 지정하고, File Ownership 범위도 `docs/plan/**`로 고정되어 있다. 파일명 번호가 본 planner task 번호(BF-929)가 아니라 `BF-928`인 것은 `memory-match-BF-916.md`(planner task는 BF-917, 파일명은 상위 스토리로 추정되는 BF-916) 선례와 동일한 패턴이다. 이번 세션은 `dependency: jira=미제공`이라 `BF-928`이 정확히 Epic인지 상위 스토리인지 확인할 수 없으나, 선례와 마찬가지로 **task 지시(파일명)를 그대로 따르고 추측으로 재해석하지 않는다**(§13-2에 모호함으로 별도 기록).

**가정 3 — 이 문서는 전량 신규(forward) 설계다:** 저장소 전체에 Breakout 관련 코드·디자인 문서가 **0건**이다(`grep -ril "breakout"`, `find -iname "*breakout*"` 사전 확인 완료 — 매치 0건). 아래 상수·공식은 기존 코드의 재현이 아니라 본 문서가 최초로 확정하는 계약(SSOT)이며, 후속 designer/dev는 이 값을 임의로 바꾸지 않고 구현해야 한다(변경 필요 시 Jira 코멘트로 확인 후 본 문서 개정).

**가정 4 — 물리 모델 = 연속 물리(dt 기반), 스네이크의 이산 틱이 아니라 퐁의 연속 좌표계를 채택:** Epic 원문은 "결정론적 게임 루프 흐름"을 요구하지만 "이산 격자" 이동을 요구하지 않는다. 공·패들의 움직임은 본질적으로 연속적인 물리 장르(퐁과 동일 계열)이며, 저장소에는 이미 `pong-BF-910.md`가 연속 물리 + 결정론적 처리 순서 선례(`dt` 클램프, 프레임별 처리 순서 고정)를 확립해 두었다. 본 문서는 이 선례의 처리 순서 원칙을 벽돌깨기에 맞게 확장한다(§3.7).

**가정 5 — 생명(Lives)·벽돌 점수·벽돌 격자 규모는 임의 고정 상수로 확정:** Epic 원문에 정확한 값이 없다. `LIVES_INITIAL=3`(아케이드 표준), `SCORE_PER_BRICK=10`(고정, 스네이크 §0 가정 6과 동일 판단 근거 — 벽돌별 차등 점수 같은 추측성 확장을 하지 않음), `BRICK_ROWS×BRICK_COLS = 5×8 = 40`개 고정 격자를 채택한다(§3.1, §4). 운영자가 다른 값을 원하면 본 문서 개정 필요(§13-2).

**가정 6 — "서버 API 없이 브라우저 메모리로만 상태 관리" = 세션 in-memory 전용, `localStorage` 미사용:** Epic 원문이 이미 명시적으로 이 전제를 요구했다(task 설명 마지막 문장). `dice-4-BF-897.md`(§0 가정 3)·`pong-BF-910.md`(§0 가정 5)·`phase18-snake-BF-923.md`(§0 가정 4)가 확립한 동일 해석을 그대로 적용한다 — 점수·생명·벽돌 상태는 순수 JS 변수로만 존재하고 새로고침 시 완전히 초기화된다(§6).

**가정 7 — 360px 뷰포트 지원은 Epic이 강제한 수치가 아니라 제품군 일관성을 위한 권장 사항으로 명시:** `pong`/`snake` Epic 원문은 "360px 방향 컨트롤"/"360px 터치 컨트롤"을 **명시적으로** 요구했지만, 본 task 설명은 "키보드·터치 입력 규칙"만 요구하고 구체적 픽셀 수치를 언급하지 않는다. 따라서 360px 지원을 필수 AC로 격상하지 않되, 같은 `phase18-games/` 제품군의 모바일 우선 관례(스네이크·퐁·메모리 매치 전부 360px 하한 지원)와의 일관성을 위해 반응형 레이아웃을 권장 사항으로 설계한다(§7.2) — 이는 task 지시의 추측성 확장이 아니라 저장소 기존 관례와의 정합성 판단이며, 필수 AC(§9)와는 별도로 명시한다.

**가정 8 — 터치 조작 방식 = 캔버스 드래그로 패들 X좌표 직접 추종(온스크린 방향 버튼 미채택):** 벽돌깨기는 좌우 1자유도 연속 이동만 필요하므로, 퐁의 Y축 포인터 추종 패턴(`pong-BF-910.md` §5.3)을 X축으로 대칭 적용한다. 스네이크의 D-pad(이산 격자 이동 전용 UI)는 연속 물리 게임에 부적합하므로 채택하지 않는다. Epic 원문도 방향 버튼 UI를 요구하지 않는다.

**가정 9 — module명 `breakout` 확정(충돌 없음 실측):** `find . -iname "*breakout*"`, `grep -ril "breakout"` 결과 0건이므로 스네이크(§0 가정 2, `snake` 충돌 회피)와 달리 별도 네임스페이스 분리가 불필요하다. module명을 그대로 `breakout`으로 확정한다.

**가정 10 — 파일 소유권 및 Jira 도구 미할당:** 본 task(BF-929)의 담당 파일은 `docs/plan/breakout-BF-928.md` 1개뿐이다(RUN_CONTEXT `owned_paths: docs/plan/**` 명시). `phase18-games/breakout/*` 코드, `docs/design/*` 디자인 문서, `tests/breakout-*.test.js`는 후속 designer/dev/tester task 담당 영역이며 본 task에서 생성·수정하지 않는다. RUN_CAPABILITY_MANIFEST에 `assigned_mcp_servers: (none)`으로 명시되어 있어 Jira 코멘트·PR 생성/머지는 `worker_brokered_lifecycle_writes`로 시스템이 본 문서 커밋과 이 세션의 최종 메시지를 근거로 멱등적으로 처리한다.

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 보드·패들·공·벽돌 물리](#3-게임-규칙--보드패들공벽돌-물리)
4. [점수·생명·종료 조건](#4-점수생명종료-조건)
5. [입력 모델 — 키보드 + 터치](#5-입력-모델--키보드--터치)
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

`/phase18-games/breakout`은 신규 module `breakout`의 최초 항목으로, 클래식 벽돌깨기(단일 패들 vs 벽돌 40개)를 결정론적 물리 규칙과 명확한 상태 전이로 구현 가능하게 하는 기획 SSOT다. 게임 상태(공·패들·벽돌·점수·생명·종료), 키보드·터치 입력 규칙, 결정론적 게임 루프 처리 순서, 화면 구성 요소를 후속 designer(mockup)·dev(구현)·tester(E2E)가 동일한 기준으로 다룰 수 있도록 문서화하고, 서버 API 없이 브라우저 메모리로만 상태를 관리하는 전제를 명시한다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-games/breakout/`(`index.html`/`styles.css`/`logic.js`/`main.js`) — §0 가정 1, §12 |
| 게임 모드 | 1인용, 패들로 공을 튕겨 벽돌 40개를 모두 파괴 — §3 |
| 보드 | 논리 해상도 `360×480`(세로형, 모바일 우선) — §3.1 |
| 게임 루프 | §3.7 — 패들 이동·공 이동·벽 반사·벽돌 충돌·패들 충돌·생명 판정·승리 판정, 프레임(`dt`) 기반 연속 물리 |
| 점수·생명·종료 | §4 — 벽돌 1개당 10점, 생명 3회, 벽돌 전량 파괴=승리 / 생명 소진=게임오버 |
| 입력 | §5 — 키보드(방향키/AD) + 캔버스 드래그(Pointer Events) 패들 조작, Enter/Space/탭으로 발사 |
| 상태 영속화 | 없음 — 브라우저 메모리(JS 변수)에만 존재, 새로고침 시 초기화(§0 가정 6, §6) |
| 외부 의존성 | 없음 — 네트워크 요청·외부 라이브러리·서버 API·DB 0건(§8) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전, Pointer Events 지원) 또는 Node.js(`node --test`)로 순수 함수(물리·충돌·점수·상태 전이 로직) 단위 테스트
- `phase18-games/breakout/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 렌더링은 `<canvas>` 2D context 사용을 전제로 논리 좌표계를 설계한다(§3.1) — 렌더링 기술 자체(canvas vs DOM) 선택은 dev 재량으로 열어둘 수 있으나, 좌표계·상수(§3, §4)는 렌더링 방식과 무관하게 그대로 지켜야 한다.
- `file://` 프로토콜(로컬 파일 직접 열기)로도 정상 동작해야 한다(저장소 vanilla-static 전제, §8).

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 보드(Board) | 게임이 벌어지는 논리적 직사각형 영역. 크기 `360 × 480`(px, 논리 좌표) 고정 |
| 패들(Paddle) | 사용자가 좌우로 조작하는 가로 막대. 보드 하단에 위치, Y 고정·X만 이동 |
| 공(Ball) | 원형 물체. 벽·패들·벽돌에 부딪혀 반사되며 이동 |
| 벽돌(Brick) | 5행×8열 격자에 배치된 40개의 고정 사각형. 공에 맞으면 즉시 파괴(내구도 1, §0 가정 5) |
| 생명(Life) | 공을 패들로 받아내지 못해 하단으로 완전히 벗어날 때마다 1씩 소모되는 자원. 초기값 3(§0 가정 5) |
| 발사(Launch) | `serve` 상태에서 패들에 붙어 있던 공을 실제로 쏘아 올리는 것(§3.6, §5) |
| 라운드(Round) | 발사 1회부터 그 공을 잃거나(생명 소모) 벽돌이 전량 파괴될 때까지의 구간 |
| 프레임(Frame)/`dt` | 게임 루프가 갱신되는 단위. 매 프레임 경과 시간(초)을 `dt`로 받아 위치를 갱신(§3.7) — 스네이크의 고정 틱과 달리 가변 프레임 기반 연속 물리(§0 가정 4) |

---

## 3. 게임 규칙 — 보드·패들·공·벽돌 물리

### 3.1 좌표계 및 상수

논리 좌표계는 렌더링 크기(CSS 픽셀)와 분리된 고정 해상도를 사용한다. 화면 표시 시 CSS로 반응형 스케일링하되(§7), 물리 계산은 항상 아래 논리 좌표 기준으로 수행한다. 원점 `(0,0)`은 보드 좌상단, `x`는 우측으로, `y`는 하단으로 증가한다(canvas 2D 표준 좌표계).

| 상수 | 값 | 설명 |
|---|---|---|
| `BOARD_WIDTH` | `360` | 보드 논리 폭(px) |
| `BOARD_HEIGHT` | `480` | 보드 논리 높이(px, 세로형) |
| `BRICK_ROWS` | `5` | 벽돌 행 수 |
| `BRICK_COLS` | `8` | 벽돌 열 수(총 40개, §0 가정 5) |
| `BRICK_WIDTH` | `40` | 벽돌 폭 — `(BOARD_WIDTH - 2×BRICK_SIDE_MARGIN - (BRICK_COLS-1)×BRICK_GAP) / BRICK_COLS = 40` |
| `BRICK_HEIGHT` | `16` | 벽돌 높이 |
| `BRICK_GAP` | `4` | 벽돌 사이 가로/세로 간격 |
| `BRICK_SIDE_MARGIN` | `6` | 보드 좌/우 경계로부터 첫/끝 벽돌까지 여백 |
| `BRICK_TOP_MARGIN` | `40` | 보드 상단으로부터 첫 벽돌 행까지 여백 |
| `PADDLE_WIDTH` | `64` | 패들 폭 |
| `PADDLE_HEIGHT` | `10` | 패들 높이 |
| `PADDLE_Y` | `440` | 패들 상단 Y(고정) — `BOARD_HEIGHT - PADDLE_Y - PADDLE_HEIGHT = 30`px 여백이 하단에 남음(공이 패들을 놓치고 이탈할 여유 구간) |
| `PADDLE_SPEED_KEYBOARD` | `300` px/s | 키보드 입력 시 패들 이동 속도 |
| `BALL_RADIUS` | `6` | 공 반지름 |
| `BALL_SPEED` | `240` px/s | 공 속력(항상 이 크기로 고정 — 증속 없음, §0 가정 4 연장) |
| `LAUNCH_ANGLE_MIN_DEG` / `MAX_DEG` | `60° / 80°`(수평 기준) | 발사 각도 범위 — 값이 클수록 수직에 가까움(§3.6) |
| `MAX_PADDLE_BOUNCE_ANGLE_DEG` | `60°`(수직 기준) | 패들 끝단에 맞았을 때 최대 반사각(§3.5) |
| `LIVES_INITIAL` | `3` | 초기 생명 수(§0 가정 5) |
| `SCORE_PER_BRICK` | `10` | 벽돌 1개 파괴당 점수(§0 가정 5) |
| `MAX_DT` | `1/30`초 | 프레임 델타타임 상한(백그라운드 복귀 시 물리 폭주 방지, §10.5, 퐁 §10.5와 동일 근거) |

> `BALL_SPEED(240px/s)` × `MAX_DT(1/30초)` = 프레임당 최대 이동거리 `8px`. 이는 `PADDLE_HEIGHT(10px)`·`BRICK_HEIGHT(16px)` 모두보다 작다 — 이 상수 조합에서 공이 패들/벽돌을 한 프레임에 그대로 통과(터널링)하는 상황은 발생하지 않는다(퐁 §3.1 각주와 동일한 안전성 근거, §10.6).

### 3.2 벽돌 배치

```
brick(row, col).x = BRICK_SIDE_MARGIN + col × (BRICK_WIDTH + BRICK_GAP)
brick(row, col).y = BRICK_TOP_MARGIN + row × (BRICK_HEIGHT + BRICK_GAP)
// row: 0~4, col: 0~7 — 총 40개, 초기 상태 전부 alive=true
```

각 벽돌은 `{ row, col, x, y, width: BRICK_WIDTH, height: BRICK_HEIGHT, alive: true }` 형태의 고정 사각형이다. 내구도는 항상 1(공에 한 번 맞으면 즉시 파괴, §0 가정 5) — 다단계 내구도 벽돌은 비범위(§11).

### 3.3 패들 초기 위치 및 이동

- 초기 위치: `paddle.x = (BOARD_WIDTH - PADDLE_WIDTH) / 2 = 148`
- 이동: X축으로만 이동(`PADDLE_Y` 고정), 매 프레임 `paddle.x = clamp(paddle.x + inputVX × dt, 0, BOARD_WIDTH - PADDLE_WIDTH)` — `inputVX`는 §5 입력 모델이 결정
- 패들 이동은 `status`가 `serve`/`playing`일 때만 반영된다(§6.2) — `paused`/`gameover`/`win`/`start`에서는 입력이 있어도 패들이 움직이지 않는다(§10.8).

### 3.4 공 이동 및 벽 반사

```
ball.x += ball.vx * dt
ball.y += ball.vy * dt

// 좌/우 벽
if (ball.x - BALL_RADIUS <= 0)            { ball.x = BALL_RADIUS;              ball.vx = Math.abs(ball.vx) }
else if (ball.x + BALL_RADIUS >= BOARD_WIDTH) { ball.x = BOARD_WIDTH - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) }

// 상단 벽
if (ball.y - BALL_RADIUS <= 0)            { ball.y = BALL_RADIUS;              ball.vy = Math.abs(ball.vy) }

// 하단은 반사하지 않는다 — §3.8 생명 손실 판정 대상
```

### 3.5 패들 충돌 및 반사각 보정

패들과 공이 겹치고(AABB: `ball.x+r ≥ paddle.x`, `ball.x-r ≤ paddle.x+PADDLE_WIDTH`, `ball.y+r ≥ PADDLE_Y`, `ball.y-r ≤ PADDLE_Y+PADDLE_HEIGHT`) **동시에 공이 하강 중(`ball.vy > 0`)**일 때만 충돌로 처리한다(§10.2 — 상승 중인 공과의 오탐 방지).

```
relativeIntersectX = clamp((ball.x - (paddle.x + PADDLE_WIDTH/2)) / (PADDLE_WIDTH/2), -1, 1)   // -1~1
bounceAngle = relativeIntersectX * degToRad(MAX_PADDLE_BOUNCE_ANGLE_DEG)                        // -60°~60°(수직 기준)
ball.vx = BALL_SPEED * Math.sin(bounceAngle)
ball.vy = -BALL_SPEED * Math.cos(bounceAngle)   // 항상 위쪽(음수)
ball.y  = PADDLE_Y - BALL_RADIUS                // 패들 표면 바로 위로 위치 보정(같은 프레임 재충돌 방지)
```

- 패들 정중앙(`relativeIntersectX≈0`)에 맞으면 거의 수직으로 반사되고, 끝단에 맞을수록 각도가 커진다 — 속력은 항상 `BALL_SPEED`로 고정(증속 없음, §0 가정 4).
- 패들 반사는 항상 `vy < 0`(위쪽) 결과를 낳으므로, 반사 직후 같은 프레임에 다시 패들과 충돌 판정되지 않는다.

### 3.6 벽돌 충돌 및 발사(Launch)

**충돌 판정(원-사각형 최근접점 방식, 결정론적 축 선택):**

```
function resolveBrickHit(ball, brick) {
  var closestX = clamp(ball.x, brick.x, brick.x + brick.width)
  var closestY = clamp(ball.y, brick.y, brick.y + brick.height)
  var dx = ball.x - closestX
  var dy = ball.y - closestY
  var overlapX = BALL_RADIUS - Math.abs(dx)
  var overlapY = BALL_RADIUS - Math.abs(dy)
  if (overlapX <= 0 || overlapY <= 0) return null   // 실제 겹침 없음
  if (overlapX < overlapY) { ball.vx = -ball.vx }    // 좌/우 면에 맞음
  else                     { ball.vy = -ball.vy }    // 상/하 면에 맞음
  return { hit: true }
}
```

매 프레임 벽돌을 **행 우선(row-major, row 0→4 × col 0→7) 순서로 스캔**해 `alive===true`이고 위 함수가 겹침을 반환하는 **첫 번째 벽돌 1개만** 처리한다(§10.1 — 동일 프레임 다중 벽돌 충돌은 스캔 순서로 결정론적 처리).

```
brick.alive = false
score += SCORE_PER_BRICK
resolveBrickHit(ball, brick)   // vx 또는 vy 반전
bricksAlive -= 1
if (bricksAlive === 0) status = 'win'   // §3.8, §6.2 — 같은 프레임에서 즉시 판정, 이후 단계(패들 충돌 등) 생략
```

**발사(Launch, `serve → playing` 전이 시 1회 계산):**

```
function launchVector(rand) {
  var r = typeof rand === 'function' ? rand : Math.random
  var dirX = r() < 0.5 ? -1 : 1                                              // 좌/우 50:50
  var angleDeg = LAUNCH_ANGLE_MIN_DEG + r() * (LAUNCH_ANGLE_MAX_DEG - LAUNCH_ANGLE_MIN_DEG)  // 60°~80°(수평 기준)
  var angle = degToRad(angleDeg)
  return { vx: dirX * BALL_SPEED * Math.cos(angle), vy: -BALL_SPEED * Math.sin(angle) }       // 항상 위쪽
}
```

`rand`를 주입 가능하게 해(기본 `Math.random`) 단위 테스트에서 결정적 함수로 발사 각도 재현 가능(퐁 `makeServe(rand)`와 동일 컨벤션, §10.1).

### 3.7 게임 루프(프레임) — 처리 순서 (결정론적 흐름)

매 프레임(`requestAnimationFrame` 권장, `dt`=초 단위 델타타임, §10.5에서 상한 클램프), 순수 함수 `update(state, dt, inputVX, rand) → newState`로 다음을 **이 순서 그대로** 수행한다:

```
1. status가 'paused' | 'start' | 'gameover' | 'win' 이면 → 아무 갱신 없이 그대로 반환(패들도 정지, §6.2)

2. paddle.x = clamp(paddle.x + inputVX(state) * dt, 0, BOARD_WIDTH - PADDLE_WIDTH)   // §3.3 — serve/playing 공통

3. status === 'serve' 이면:
     ball.x = paddle.x + PADDLE_WIDTH/2
     ball.y = PADDLE_Y - BALL_RADIUS
     → 반환(공은 패들을 그대로 추종, 물리 없음)   // §3.6 발사 전

4. (status === 'playing') 공 이동 + 벽 반사   // §3.4

5. 벽돌 충돌 스캔·처리(§3.6) — 벽돌 파괴 시 score 갱신
     → bricksAlive === 0 이면 status='win' 확정 후 즉시 반환(§3.8, 이하 6~7 생략)

6. 패들 충돌 판정·반사(§3.5, ball.vy > 0 일 때만)

7. 하단 이탈 판정: ball.y - BALL_RADIUS > BOARD_HEIGHT
     → lives -= 1
        lives > 0  → status='serve' (공을 패들에 재부착, 패들 위치는 유지)
        lives === 0 → status='gameover', gameoverReason='out-of-lives'

8. 새 상태 반환 { paddle, ball, bricks, score, lives, status, gameoverReason }
```

이 순서(패들→공 이동→벽 반사→벽돌→승리 확인→패들 충돌→생명 판정)는 매 프레임 동일하게 고정되며, 동일한 `(state, dt, inputVX)` 입력에 대해 항상 동일한 `newState`를 산출한다(무작위 요소는 §3.6 발사 시점의 `rand` 호출 1곳뿐이며, `rand` 주입 시 완전히 결정론적이다).

### 3.8 승리·생명 소진 우선순위

한 프레임 안에서 "마지막 벽돌 파괴(승리)"와 "공 하단 이탈(생명 손실)"이 동시에 발생할 수 없다 — §3.7 순서상 벽돌 충돌 판정(5번)이 하단 이탈 판정(7번)보다 항상 먼저 실행되고, 벽돌 충돌로 `status='win'`이 확정되면 즉시 반환해 하단 이탈 판정 자체가 실행되지 않기 때문이다(§10.4).

---

## 4. 점수·생명·종료 조건

### 4.1 점수

- 벽돌 1개 파괴마다 `score += SCORE_PER_BRICK(10)`(§3.6).
- 최대 가능 점수 = `40 × 10 = 400`(전체 벽돌 파괴 시, §3.1).
- 점수는 정수이며 감소하지 않는다(패널티 없음 — Epic 원문에 감점 요구 없음, §11).
- 재시작(`gameover`/`win` → `serve`) 시 `score`는 `0`으로 리셋된다.

### 4.2 생명(Lives)

- 초기값 `LIVES_INITIAL(3)`.
- 공이 하단으로 완전히 벗어날 때(§3.7 step 7)마다 `lives -= 1`.
- `lives > 0`이면 `status='serve'`로 전이해 새 공을 패들에 재부착(패들 위치·현재 `score`·`bricks` 상태는 그대로 유지) — 같은 라운드의 벽돌 진행 상황은 보존된다(§0 가정 5 연장, 스테이지 재시작 아님).
- `lives === 0`이면 `status='gameover'`(§4.3).

### 4.3 종료 조건

| 조건 | 결과 |
|---|---|
| `bricksAlive === 0`(40개 전부 파괴) | `status='win'` — 승리, 최종 점수 표시(§3.8 우선순위 적용) |
| `lives === 0`(생명 소진) | `status='gameover'`, `gameoverReason='out-of-lives'` — 최종 점수 표시 |

두 종료 조건 모두 게임 루프가 정지하고(§3.7 step 1에서 이후 프레임은 no-op), 재시작 입력(§5.2, §6.2)으로만 새 라운드를 시작할 수 있다.

---

## 5. 입력 모델 — 키보드 + 터치

### 5.1 통합 조작 원칙

패들 X 위치는 **키보드**와 **포인터(마우스/터치 통합, Pointer Events)** 두 경로로 갱신될 수 있으며, 마지막으로 발생한 입력이 우선한다(둘을 동시에 사용해도 서로 덮어쓰지 않고 최신 이벤트가 반영됨 — 별도 잠금 불필요, 퐁 §5.1과 동일 원칙). 발사(공을 쏘아 올리는 동작)도 키보드·터치 양쪽에서 동일하게 트리거된다(§5.2, §5.3).

### 5.2 키보드 조작 (데스크톱/접근성)

| 키 | 동작 |
|---|---|
| `ArrowLeft` / `A` (누르고 있는 동안) | `paddle.x -= PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowRight` / `D` (누르고 있는 동안) | `paddle.x += PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowLeft`+`ArrowRight` 동시 눌림 | 상쇄 — 순이동 `0`(둘 중 하나만 우선시키지 않고 결정론적으로 정지, 퐁 §10.4와 동일 규칙) |
| `Enter` / `Space` | `start → serve` 시작 / `serve → playing` 발사(§3.6 `launchVector`) / `gameover`·`win` → `serve` 재시작(§6.2) |
| `P` / `Escape` | `playing ⇄ paused` 토글(§6.2) — `serve` 중에는 동작하지 않음(§10.9) |

### 5.3 터치·마우스 드래그 조작

- **입력 방식**: Pointer Events(`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) — 터치와 마우스 드래그를 동일 코드 경로로 처리한다. 캔버스 요소에 `touch-action: none`을 지정해 드래그 중 페이지 스크롤/줌이 발생하지 않도록 한다.
- **좌표 변환**: `pointerdown`/`pointermove` 발생 시 `logicalX = (event.clientX - canvasRect.left) / canvasRect.width * BOARD_WIDTH`로 화면 좌표를 논리 좌표로 변환하고, `paddle.x = clamp(logicalX - PADDLE_WIDTH/2, 0, BOARD_WIDTH - PADDLE_WIDTH)`로 패들 중심을 포인터 X에 즉시 맞춘다(속도 제한 없이 손가락 위치를 직접 추종 — 퐁 §5.3의 Y축 추종 패턴을 X축으로 대칭 적용, §0 가정 8).
- **드래그 영역**: 캔버스 전체 표시 영역이 드래그 감지 대상이다(패들이 그려진 좁은 띠가 아님) — 좁은 화면에서도 충분히 넓은 터치 히트 영역을 확보한다.
- **포인터 캡처**: `pointerdown` 시 `canvas.setPointerCapture(event.pointerId)`를 호출해, 드래그 중 손가락/커서가 캔버스 경계 밖으로 나가도 `pointermove` 이벤트가 계속 전달되도록 한다(§10.10).
- **Y 좌표는 무시**: 터치 지점의 Y 위치는 패들 이동에 영향을 주지 않는다(패들은 X축으로만 이동, §3.3) — 캔버스의 어느 Y 지점을 터치해도 동작 동일.
- **발사 트리거**: `status==='start'`일 때 캔버스(또는 시작 버튼) `pointerdown` → `serve` 전이. `status==='serve'`일 때 `pointerdown` → 발사(§3.6, `playing` 전이) — 해당 `pointerdown` 이벤트는 동시에 패들 드래그 추적도 시작한다(발사와 드래그 시작이 한 동작으로 통합, 별도 두 번 탭 불필요).
- **멀티터치**: 두 손가락 이상 동시 터치는 지원하지 않는다(단일 포인터만 처리, 캡처된 포인터가 있는 동안 추가 `pointerdown`은 무시, §10.11).

---

## 6. 상태 모델 — 브라우저 메모리, 상태 전이

### 6.1 상태 데이터 형태 (in-memory 전용, §0 가정 6)

```js
state = {
  status: 'start' | 'serve' | 'playing' | 'paused' | 'gameover' | 'win',
  score: 0,
  lives: 3,
  paddle: { x: 148 },                              // y는 PADDLE_Y 고정이라 상태에 미포함(상수 참조)
  ball: { x: 180, y: 434, vx: 0, vy: 0 },           // serve 중엔 paddle을 추종(§3.7 step 3)
  bricks: [ { row: 0, col: 0, x: 6, y: 40, width: 40, height: 16, alive: true }, /* ...40개 */ ],
  bricksAlive: 40,
  gameoverReason: null,                              // 'out-of-lives' | null
}
```

이 객체는 순수 JS 런타임 변수로만 존재하며, `localStorage`/`sessionStorage`/서버 세션 어디에도 기록되지 않는다(§0 가정 6). 페이지를 새로고침하거나 닫으면 완전히 소실된다 — 결함이 아니라 "브라우저 메모리 상태 모델"의 명시적 정의다.

### 6.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `start` | `serve` | "시작" 버튼 클릭, `Enter`/`Space`, 또는 캔버스 탭(status=start일 때만) | `score=0`, `lives=3`, `bricks` 전체 `alive=true`(40개), `bricksAlive=40`, 패들 중앙 배치(`x=148`), 공을 패들에 부착 |
| `serve` | `playing` | `Enter`/`Space` 또는 캔버스 탭(발사 입력, §5.2·§5.3) | `launchVector()`로 `ball.vx`/`vy` 계산(§3.6), 게임 루프 물리 시작 |
| `playing` | `serve` | 공이 하단 이탈(§3.7 step 7) & `lives > 0` | `lives -= 1`, 공을 패들 현재 위치에 재부착, `score`/`bricks` 유지 |
| `playing` | `gameover` | 공이 하단 이탈 & 소모 후 `lives === 0` | `gameoverReason='out-of-lives'` 확정, 게임 루프 정지, 결과 화면 표시 |
| `playing` | `win` | `bricksAlive === 0`(§3.6, §3.8) | 게임 루프 정지, 승리 결과 화면 표시(최종 `score`) |
| `playing` | `paused` | `P`/`Escape`(status=playing일 때만) | 게임 루프 정지(공/패들/벽돌 상태 그대로 보존) |
| `paused` | `playing` | `P`/`Escape` 또는 "계속하기" 버튼 | 게임 루프 재개, 정지 동안의 경과 시간은 물리에 영향 없음(재개 시 `dt` 타이머 재설정, §10.5) |
| `paused` | `start` | "메뉴로" 버튼 | 진행 중이던 점수/공/벽돌 상태 폐기, 시작 화면 복귀 |
| `gameover` | `serve` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `start → serve`와 동일한 전체 초기화(새 라운드) |
| `gameover` | `start` | "메뉴로" 버튼 | 시작 화면 복귀 |
| `win` | `serve` | `Enter`/`Space` 또는 "다시 하기" 버튼 | `start → serve`와 동일한 전체 초기화(새 라운드로 재도전) |
| `win` | `start` | "메뉴로" 버튼 | 시작 화면 복귀 |

> 정의되지 않은 전이(예: `start`/`gameover`/`win` 상태에서 패들 이동 입력, `serve` 중 `P`/`Escape`, `paused` 중 패들 이동)는 **무시**된다 — 모든 핸들러가 상태별 조건 가드(`if (['playing','serve'].indexOf(state.status) === -1) return`류)로 no-op 처리하며 예외를 던지지 않는다(§10.8, §10.9).

### 6.3 상태별 수용 기준 (Given/When/Then)

**AC-STATE-01 (start → serve)**
> **Given** 사용자가 시작 화면(`status=start`)에 있다
> **When** "시작" 버튼을 클릭하거나 `Enter`/`Space`/캔버스 탭을 하면
> **Then** `status`가 `serve`로 전이되고 `score=0`, `lives=3`, 벽돌 40개가 전부 `alive`로 배치되며, 공이 패들 중앙 위에 부착된다.

**AC-STATE-02 (serve → playing, 발사)**
> **Given** 공이 패들에 부착된 상태(`status=serve`)이다
> **When** `Enter`/`Space`를 누르거나 캔버스를 탭하면
> **Then** `status`가 `playing`으로 전이되고 §3.6 `launchVector()`로 계산된 속도 벡터로 공이 발사된다(수평 기준 60°~80° 범위, 좌/우 방향은 50:50 무작위).

**AC-STATE-03 (playing에서 벽돌 파괴 — 상태 유지, 부수효과만 발생)**
> **Given** 게임이 진행 중(`status=playing`)이고 벽돌이 1개 이상 살아있다
> **When** 공이 살아있는 벽돌 중 하나와 충돌하면
> **Then** `status`는 `playing`을 유지한 채 해당 벽돌이 `alive=false`로 전환되고 `score`가 `10` 증가하며, 공은 §3.6 규칙대로 반사된다.

**AC-STATE-04 (playing → serve, 생명 손실)**
> **Given** 게임이 진행 중이고 `lives >= 2`이다
> **When** 공이 패들 아래 보드 하단을 완전히 벗어나면
> **Then** `lives`가 1 감소하고 `status`가 `serve`로 전이되어 새 공이 패들에 부착된다(`score`·`bricks` 진행 상황은 그대로 유지).

**AC-STATE-05 (playing → gameover, 생명 소진)**
> **Given** 게임이 진행 중이고 `lives === 1`이다
> **When** 공이 보드 하단을 완전히 벗어나면
> **Then** `lives`가 `0`이 되고 `status`가 `gameover`로 전이되며 `gameoverReason='out-of-lives'`가 설정되고 게임 루프가 정지한다.

**AC-STATE-06 (playing → win)**
> **Given** 게임이 진행 중이고 `bricksAlive === 1`이다
> **When** 마지막 벽돌이 파괴되면
> **Then** `bricksAlive`가 `0`이 되고 `status`가 즉시 `win`으로 전이되며 게임 루프가 정지한다(같은 프레임의 하단 이탈 판정은 실행되지 않음, §3.8).

**AC-STATE-07 (playing ⇄ paused)**
> **Given** 게임이 진행 중이다
> **When** `P` 또는 `Escape`를 누르면
> **Then** `status`가 `paused`로 전이되어 공/패들/벽돌이 그 위치·상태에서 정지하고, 다시 누르면 `playing`으로 복귀해 정지 시점 그대로 재개된다.

**AC-STATE-08 (gameover/win → serve, 재시작)**
> **Given** 사용자가 게임오버 또는 승리 상태이다
> **When** `Enter`/`Space` 또는 "다시 하기" 버튼을 누르면
> **Then** `score=0`, `lives=3`, 벽돌 40개 전부 복구된 새 라운드가 `serve` 상태로 시작된다.

**AC-STATE-09 (paused/gameover/win → start)**
> **Given** 사용자가 일시정지·게임오버·승리 상태 중 하나이다
> **When** "메뉴로" 버튼을 누르면
> **Then** `status=start`로 전이되고 시작 화면이 표시되며, 진행 중이던 점수/생명/벽돌 상태는 폐기된다.

---

## 7. 화면 구성 요구사항

### 7.1 페이지 구조

```
<body>
 ├─ <header class="topbar">     ← "벽돌깨기" 타이틀
 └─ <main class="page">
     ├─ <div class="hud">          ← "점수 {score}   생명 {lives}"
     ├─ <canvas id="board" width="360" height="480">  ← §3.1 논리 해상도, CSS로 반응형 스케일
     └─ <div class="controls-hint">   ← "←/→ 또는 화면을 드래그해 패들을 움직이고, Enter/탭으로 발사하세요" 안내문 + 시작/일시정지/재시작 버튼
```

### 7.2 반응형 규칙 (권장, §0 가정 7)

- 캔버스 CSS: `width: 100%; max-width: 360px; height: auto; aspect-ratio: 3 / 4;` — 논리 해상도(`360×480`)는 불변, 표시 크기만 뷰포트에 맞춰 축소된다.
- HUD·조작 안내·버튼은 캔버스 위/아래로 세로 스택 배치되어 좁은 뷰포트에서도 가로 스크롤 없이 전부 표시된다.
- 리사이즈/화면 회전 시 캔버스 CSS 크기만 바뀌고 논리 좌표계는 그대로이므로, 포인터 좌표 변환식(§5.3)이 매 이벤트마다 `canvasRect`를 다시 읽어 자동으로 대응한다(별도 리사이즈 핸들러 불필요).
- 이는 Epic이 강제한 필수 AC가 아니라 제품군 일관성을 위한 권장 사항이다(§0 가정 7) — 필수 검증 대상은 §9의 GWT로 한정한다.

### 7.3 HUD 표시 요구 (수용 기준 2번째 항목 대응)

> 본 절은 task 수용 기준 2번째 항목("페이지 진입/렌더/점수·생명 표시 요구가 수용 기준에 매핑된다")에 직접 대응한다.

| 요소 | 표시 규칙 |
|---|---|
| 점수 | "점수 {score}" 형식, `score` 값과 실시간 동기화(§4.1, §6.3 AC-STATE-03) |
| 생명 | "생명 {lives}" 형식(최소 계약은 정수 카운트) — 하트 아이콘 등 시각 표현은 designer 재량으로 위임(§13-2 유사 스네이크/메모리 매치 위임 패턴) |
| 페이지 진입 | 페이지 로드 시 `status=start` 화면이 즉시 렌더링되고, 캔버스에 빈 보드(또는 벽돌 40개 미리보기) + "시작" 버튼이 표시된다(§6.2 AC-STATE-01 대응) |
| 종료 화면 | `gameover`/`win` 상태에서 최종 `score`가 강조 표시되고 "다시 하기"/"메뉴로" 버튼이 노출된다(§6.3 AC-STATE-08, AC-STATE-09) |

### 7.4 `prefers-reduced-motion` 처리 방침

공의 이동 자체가 게임의 핵심 동작이므로 `prefers-reduced-motion: reduce`에서도 공/패들의 물리적 이동은 동일하게 유지한다(모션이 곧 게임 콘텐츠 — `pong-BF-910.md` §7.3·`phase18-snake-BF-923.md` §8.3과 동일한 성격). 파티클·화면 흔들림 등 부가 연출은 v1 범위에 포함하지 않는다(§11).

### 7.5 `<noscript>` 폴백

JS가 비활성화된 경우 "이 게임은 JavaScript가 필요합니다" 안내 문구를 표시한다(저장소 내 기존 모듈들과 동일 패턴).

---

## 8. 외부 의존성 배제 확인

vanilla-static 제약(Epic 명시) 및 "서버 API 없이 브라우저 메모리로만 상태 관리" 전제(Epic 원문)에 따라 다음을 명시적으로 배제하며, `file://` 프로토콜 직접 실행 호환을 전제로 한다.

| 확인 항목 | 값 |
|---|---|
| `fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 호출 | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건(상대경로 리소스만 사용) |
| 신규 npm 패키지/외부 CDN 스크립트 | 0건 — `package.json`에 신규 dependency 추가하지 않음 |
| 서버 API 라우트 신규 생성(`/api/breakout*` 등) | 없음 |
| DB 스키마(Prisma 등) | 없음 |
| `localStorage`/`sessionStorage` 등 영속 저장 | 없음(§0 가정 6) — 상태는 전량 세션 in-memory |
| 인증/세션/로그인 | 불필요 — 공개 정적 페이지(저장소 전체에 인증 로직 0건, `dice-4-BF-897.md` §0 가정 5와 동일 근거) |
| `file://` 프로토콜 호환 | 비-module(IIFE/UMD) 패턴 필수(§12) — `<script type="module">`/상대경로 fetch 등 `file://`에서 깨지는 패턴 금지 |

검증 방법(후속 dev/tester가 구현 후 실행): `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://|localStorage|sessionStorage" phase18-games/breakout/*` → 매치 0건이어야 통과.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-929 수용 기준 원문 매핑

**AC-1 (게임 상태·입력·종료 조건의 검증 가능한 정의)**
> **Given** Epic 요구
> **When** 기획 명세(`docs/plan/breakout-BF-928.md`)를 작성하면
> **Then** `docs/plan`에 게임 상태(공/패들/벽돌/점수/생명/종료, §3~§4, §6), 키보드·터치 입력 규칙(§5), 결정론적 게임 루프 흐름(§3.7), 화면 구성 요소(§7)가 검증 가능한 형태로 정리된다.

충족 근거: §3(좌표계·상수·물리 공식·프레임 처리 순서) · §4(점수/생명/종료 조건) · §5(키보드·터치 입력 규칙) · §6(상태 데이터 형태·전이표·AC-STATE-01~09) · §7(화면 구성) · §8(vanilla-static/브라우저 메모리 전제).

**AC-2 (라우트 `/phase18-games/breakout` — 페이지 진입/렌더/점수·생명 표시 매핑)**
> **Given** 라우트 `/phase18-games/breakout`
> **When** 명세를 확인하면
> **Then** 페이지 진입/렌더/점수·생명 표시 요구가 수용 기준에 매핑된다.

충족 근거: §7.1(페이지 구조) · §7.3(HUD 점수/생명 표시 규칙, 페이지 진입 시 렌더 규칙) · §6.3 AC-STATE-01(진입 시 `start` 렌더) · §9.3 AC-PAGE-01~02(파생 GWT).

### 9.2 파생 AC — 게임 규칙·물리

**AC-RULE-01 (공 이동·벽 반사)**
> **Given** `status=playing`이고 공이 유효한 `(vx, vy)`를 갖는다
> **When** 프레임이 갱신되면
> **Then** 공이 `dt`에 비례해 이동하고, 좌/우/상단 경계에 닿으면 해당 축 속도 부호가 반전된다(§3.4).

**AC-RULE-02 (패들 반사각 보정)**
> **Given** 공이 하강 중(`vy>0`)이고 패들과 충돌했다
> **When** 반사가 계산되면
> **Then** 충돌 지점이 패들 중심에서 벗어난 비율(`relativeIntersectX`)에 비례해 반사각이 최대 `60°`(수직 기준)까지 조정되고, 속력은 항상 `BALL_SPEED(240)`로 고정된 채 항상 위쪽으로 반사된다(§3.5).

**AC-RULE-03 (벽돌 파괴·점수)**
> **Given** 살아있는 벽돌과 공이 겹친다
> **When** 프레임이 갱신되면
> **Then** 스캔 순서상 첫 번째로 겹친 벽돌이 `alive=false`로 전환되고 `score`가 `10` 증가하며, 공은 겹침 축(좌우/상하)에 따라 결정론적으로 반사된다(§3.6).

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
> **Then** 항상 동일한 `(vx, vy)`가 산출되며, 그 값은 수평 기준 `60°~80°` 범위·속력 `240`을 만족한다(§3.6, 순수 함수·랜덤 요소 격리).

### 9.3 파생 AC — 입력·화면

**AC-INPUT-01 (키보드 이동)**
> **Given** `status`가 `serve` 또는 `playing`이다
> **When** `ArrowLeft`/`A` 또는 `ArrowRight`/`D`를 누르고 있으면
> **Then** 패들이 `PADDLE_SPEED_KEYBOARD(300px/s)`로 해당 방향으로 이동하고 보드 경계에서 클램프된다(§5.2, §3.3).

**AC-INPUT-02 (터치/드래그 이동)**
> **Given** 사용자가 캔버스를 손가락/마우스로 누른 채 좌우로 이동한다
> **When** `pointermove` 이벤트가 발생하면
> **Then** 패들 중심이 포인터의 논리 X좌표를 즉시 추종하며(§5.3 좌표 변환식), 드래그 중 페이지 스크롤/줌이 발생하지 않는다.

**AC-INPUT-03 (발사 입력 동등성)**
> **Given** `status=serve`이다
> **When** `Enter`/`Space` 키 입력 또는 캔버스 탭(`pointerdown`) 중 어느 쪽이 발생해도
> **Then** 동일하게 `launchVector()`가 호출되어 `playing`으로 전이된다(§5.1, §5.2, §5.3).

**AC-PAGE-01 (페이지 진입 렌더)**
> **Given** 사용자가 `/phase18-games/breakout`에 처음 접근한다
> **When** 페이지가 로드되면
> **Then** `status=start` 화면이 즉시 렌더링되고 점수 `0`·생명 `3`이 HUD에 표시되며 벽돌 40개가 시각적으로 배치된다(§7.1, §7.3, AC-STATE-01).

**AC-PAGE-02 (점수·생명 실시간 갱신)**
> **Given** 게임이 진행 중이다
> **When** 벽돌이 파괴되거나 생명이 소모되면
> **Then** HUD의 점수·생명 표시가 각 사건 직후 프레임에 즉시 갱신된다(§7.3, AC-STATE-03·04·05).

각 §6.3 AC-STATE-01~09는 §9의 파생 AC로 포함한다(상태 전이 전체 커버).

### 9.4 매핑 요약표

| BF-929 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 요구, When 기획 명세 작성, Then docs/plan/breakout-BF-928.md 에 게임 상태·입력·종료 조건이 검증 가능한 형태로 정리된다 | §3~§6(규칙/입력/상태 전체) + §9.2~9.3(파생 GWT 6개 + 입력 GWT 3개 + 상태 AC 9개) |
| Given 라우트 /phase18-games/breakout, When 명세 확인, Then 페이지 진입/렌더/점수·생명 표시 요구가 수용 기준에 매핑된다 | §7(화면 구성 전체) + §9.3 AC-PAGE-01~02 |

---

## 10. Edge Case 및 실패 케이스 목록

### 10.1 발사 각도·방향의 비결정적 무작위성(주입 가능)

§3.6 `launchVector`는 기본적으로 `Math.random()`을 사용하므로 동일한 재시작이라도 매번 발사 궤적이 달라진다(퐁 §10.1과 동일 유형의 의도된 비결정성). 단위 테스트는 `rand`를 결정적 함수로 주입해 특정 값을 재현하거나, 미주입 시 각도/방향의 "범위"만 검증한다(§12 테스트 방침).

### 10.2 상승 중인 공과 패들의 오탐 방지

`ball.vy <= 0`(상승 중)일 때는 패들과 겹쳐도 충돌로 처리하지 않는다(§3.5) — 이 가드가 없으면 패들 바로 위에서 반사된 공이 같은 프레임/다음 프레임에 다시 패들과 겹쳐 이중 반사되는 오류가 발생할 수 있다.

### 10.3 동일 프레임 다중 벽돌 겹침

공이 두 벽돌의 경계(모서리)에 정확히 겹치는 극히 드문 경우, §3.6의 행 우선 스캔 순서상 먼저 발견된 벽돌 1개만 파괴·반사 처리된다 — 같은 프레임에 여러 벽돌이 동시에 파괴되는 경우는 없다(결정론적 처리, 매 프레임 재스캔되므로 나머지 벽돌은 다음 프레임에 다시 판정된다).

### 10.4 승리와 생명 손실의 동시 발생 불가

§3.8에서 명시한 대로, 벽돌 충돌 판정(§3.7 step 5)이 하단 이탈 판정(step 7)보다 항상 먼저 실행되고 승리 확정 시 즉시 반환하므로, "마지막 벽돌을 파괴한 바로 그 프레임에 공이 동시에 하단으로 빠지는" 모순적 상황은 로직상 발생하지 않는다.

### 10.5 탭 백그라운드 전환 후 델타타임 급증(물리 폭주 방지)

브라우저 탭이 백그라운드로 전환되면 `requestAnimationFrame`이 지연되어 복귀 시 `dt`가 비정상적으로 커질 수 있다. 이 경우 공이 한 프레임에 보드를 가로질러 순간이동하거나 충돌 판정을 건너뛸 수 있으므로, 매 프레임 `dt = min(rawDt, MAX_DT(1/30))`으로 상한을 클램프한다(퐁 §10.5와 동일 근거, §3.7 모든 이동 계산에 공통 적용).

### 10.6 고속 구간에서의 터널링 미발생 근거

§3.1 각주에서 명시한 대로 `BALL_SPEED(240px/s)` × `MAX_DT(1/30초)` = 프레임당 최대 이동거리 `8px`가 `PADDLE_HEIGHT(10px)`·`BRICK_HEIGHT(16px)` 모두보다 작다 — 이 상수 조합상 공이 패들/벽돌을 그대로 통과하는 터널링은 발생하지 않는다. 향후 속력 상한을 올리는 개정이 있다면 이 부등식을 반드시 재검증해야 한다.

### 10.7 생명 손실 후 패들 위치 유지

§4.2·§6.2에서 명시한 대로, 생명이 소모되어 `serve`로 돌아갈 때 패들 X 위치는 리셋되지 않고 직전 위치를 그대로 유지한다 — 사용자가 준비한 위치에서 바로 다음 발사를 이어갈 수 있도록 하기 위함이며(플레이어 입력 존중), 벽돌 진행 상황(`bricks`/`score`)도 동일하게 보존된다(스테이지 전체 재시작이 아님).

### 10.8 정의되지 않은 상태에서의 패들 이동 입력

`start`/`gameover`/`win`/`paused` 상태에서 키보드/터치로 패들 이동을 시도해도 무시된다(§6.2, §3.7 step 1·2) — `serve`/`playing`에서만 패들이 실제로 움직인다. 예외를 던지지 않는 것이 정상 동작이다.

### 10.9 `serve` 상태에서의 일시정지 시도

`serve`(공이 패들에 붙어 발사 대기 중) 상태에서 `P`/`Escape`를 눌러도 정의된 전이가 없으므로 무시된다(§6.2) — 일시정지는 `playing` 상태에서만 유효하다. `serve`에서 진행을 멈추고 싶다면 "메뉴로" 버튼을 사용해야 하나, 이는 §6.2에 `serve→start` 전이가 명시적으로 정의되지 않았으므로 후속 dev 재량으로 UI 노출 여부를 결정할 수 있다(§13-2).

### 10.10 터치 드래그 중 포인터 이탈

손가락이 캔버스 경계 밖으로 나가면 일반적으로 `pointermove` 이벤트가 더 이상 캔버스로 전달되지 않아 패들 추종이 끊긴다. `setPointerCapture(event.pointerId)`로 이를 방지한다(§5.3) — 이 처리가 없으면 사용자가 캔버스 가장자리 근처에서 빠르게 드래그할 때 패들이 멈추는 체감 버그가 발생한다.

### 10.11 동시 다중 포인터(멀티터치) 입력

두 번째 손가락으로 추가 `pointerdown`이 발생해도 이미 캡처된 첫 포인터만 유효하며 두 번째 포인터는 무시한다(§5.3) — 멀티터치 동시 조작은 지원 대상이 아니다.

### 10.12 좌우 동시 키 입력

`ArrowLeft`와 `ArrowRight`(또는 `A`/`D`)가 동시에 눌린 경우, 어느 하나를 임의로 우선시키지 않고 상쇄하여 순이동을 `0`으로 고정한다(§5.2) — 두 키의 `keydown`/`keyup` 순서에 의존하지 않는 결정론적 규칙(퐁 §10.4와 동일 패턴).

---

## 11. 비범위 (Out of Scope)

- 멀티볼(공 2개 이상 동시 진행) 파워업 — Epic 원문에 언급 없음
- 벽돌 다단계 내구도(여러 번 맞아야 파괴되는 벽돌) — §0 가정 5, 전 벽돌 내구도 1로 고정
- 패들 확장/축소, 공 감속 등 파워업/아이템 — Epic 원문에 언급 없음
- 레벨/스테이지 진행(2번째 벽돌 배치 등) — 단일 스테이지(40개 고정 격자)만 지원
- 벽돌별 차등 점수(행별 점수 차등 등) — §0 가정 5, 고정 10점으로 단순화
- 사운드 효과 — Epic 원문에 언급 없음, 추측 확장하지 않음
- 파티클/화면 흔들림 등 부가 연출 — §7.4
- 온스크린 방향 버튼(◀/▶) UI — 캔버스 드래그로 충분(§5.3, §0 가정 8), 필요 시 dev 재량으로 추가 가능하나 필수 아님
- 최고 점수 등 영속 통계/리더보드 — §0 가정 6, 영속 저장 자체가 비범위
- 온라인 대전/멀티플레이어 — 네트워크 의존성 자체가 배제 대상(§8)
- 디자인 mockup 산출물 — designer 담당 영역, 본 문서는 규칙/물리/상태/입력 계약만 정의

---

## 12. 파일 구조 및 기술 제약

| 파일(제안, 최종 분할은 dev 재량) | 역할 |
|---|---|
| `phase18-games/breakout/index.html` | 마크업(§7.1), `<canvas id="board" width="360" height="480">` |
| `phase18-games/breakout/styles.css` | 반응형 레이아웃(§7.2), 저장소 공통 디자인 토큰 재사용 권장(신규 색상 발명 최소화) |
| `phase18-games/breakout/logic.js` | 순수 함수: `update`(§3.7), 벽 반사(§3.4), 패들 반사(§3.5), 벽돌 충돌(§3.6 `resolveBrickHit`), 발사(§3.6 `launchVector`), 초기 상태 생성 — UMD/IIFE, `node --test` 대상, module명 `breakout` |
| `phase18-games/breakout/main.js` | DOM 바인딩: `requestAnimationFrame` 루프, 키보드(§5.2)·포인터(§5.3) 입력 처리, 캔버스 렌더링, 상태 전이(§6) 실행 |

- 논리 좌표계(`360×480`)와 상수(§3.1)는 렌더링 방식(canvas 2D 권장)과 무관하게 고정 계약이다.
- 비-module(IIFE/UMD) 패턴 필수 — `file://` 프로토콜 직접 실행 호환(저장소 기존 모듈들의 공통 관례, §8), 퐁 `phase18-games/pong/logic.js`와 동일 컨벤션.
- 게임 루프는 `requestAnimationFrame` + `dt` 클램프 기반을 권장한다(스네이크의 `setInterval` 고정 틱과 달리, 연속 물리이므로 프레임 기반이 자연스럽다, §0 가정 4).
- 테스트(후속 tester task 대상): `node --test tests/breakout-*.test.js` — ① 공 이동/벽 반사(§3.4) 고정 입력값 검증, ② 패들 반사각 보정(§3.5, `vy>0` 가드 포함) 검증, ③ 벽돌 충돌 판정·스캔 순서·점수 갱신(§3.6) 검증, ④ 발사 벡터 범위(§3.6 `launchVector`, `rand` 주입) 검증, ⑤ 생명 손실/게임오버/승리 전이(§3.7 step 7, §3.8) 경계값 검증, ⑥ 동시 키 입력 상쇄(§10.12) 검증, ⑦ §8 정적 검사(외부 의존성 0건).

---

## 13. 산출물 위치 및 참조 표 / 남은 모호함

### 13.1 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/plan/breakout-BF-928.md`(본 문서, `owned_paths: docs/plan/**` 명시, 수용 기준 원문 파일명 그대로) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-games/breakout/index.html`, `styles.css`, `logic.js`, `main.js` — 미정, 본 문서 §3~§7이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/breakout-*.test.js` — 미정, 본 문서 §9~§10이 검증 기준 |
| 참조한 기존 선례 | `docs/planning/pong-BF-910.md`(연속 물리·`dt` 처리 순서·포인터 좌표 변환 패턴), `docs/planning/phase18-snake-BF-923.md`(상태 전이표·보존 영역·산출물 위치 표 형식), `docs/plan/memory-match-BF-916.md`(`docs/plan/` 경로 컨벤션 및 파일명 번호 판단 근거) |
| 참조한 기존 코드(수정 없이 실측만) | `phase18-games/pong/logic.js`(UMD 패턴, `dt` 클램프, 반사각 보정 공식 구조 확인) |

### 13.2 남은 모호함 (운영자 확인 권장)

1. **파일명 번호 `BF-928`의 정확한 성격**: §0 가정 2 — 본 세션에 상위 Epic/부모 스토리 번호가 명시적으로 제공되지 않아(`dependency: jira=미제공`), `BF-928`이 Epic인지 별도 상위 스토리인지 확인할 수 없다. `memory-match-BF-916.md` 선례와 동일하게 수용 기준 원문의 파일명 지시를 그대로 따랐다. 운영자가 실제 Jira 계층 구조를 확인해 필요 시 문서 상단 메타데이터를 보완할 수 있다.
2. **벽돌 점수(`SCORE_PER_BRICK=10`) 및 생명 수(`LIVES_INITIAL=3`) 확정 여부**: §0 가정 5 — Epic 원문에 정확한 값이 없어 임의 상수로 확정했다. 운영자가 다른 값(예: 행별 차등 점수, 생명 5회 등)을 원하면 §3.1·§4 개정이 필요하다.
3. **360px 반응형 지원의 필수 여부**: §0 가정 7 — Epic 원문에 명시적 수치가 없어 권장 사항으로만 다뤘다(§7.2). 운영자가 스네이크/퐁과 동일하게 필수 AC로 격상하길 원하면 §9에 `AC-RESPONSIVE-01` 형태로 추가하고 캔버스 크기 재검토가 필요하다.
4. **`serve` 상태에서 "메뉴로" 버튼 노출 여부**: §10.9 — `serve→start` 전이를 정의하지 않았다. 발사 대기 화면에서도 메뉴 복귀가 필요하면 §6.2 전이표에 행을 추가해야 한다.
5. **Jira 코멘트 등록**: §0 가정 10 — 본 세션에 Jira MCP가 할당되어 있지 않아 직접 코멘트를 등록하지 못했다. `worker_brokered_lifecycle_writes`에 따라 시스템이 본 문서 커밋과 이 세션의 최종 메시지를 근거로 Jira 코멘트를 등록할 것으로 예상하나, 등록 결과 확인은 운영자 몫이다.

---

*문서 종료 — [박기획] · BF-929*
