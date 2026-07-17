# Pong 아케이드 게임 규칙·상태·수용 기준 명세 — BF-910

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-910 (Epic, File Ownership 원문 명시) · BF-911 (본 planner task)
> 대상 라우트: `/phase18-games/pong` (= `phase18-games/pong/`, 신규 디렉터리)
> 페이지 타이틀: "Pong 아케이드"
> tech-stack 태그: `vanilla-static` (외부 프레임워크·번들러 없음, 저장소 실질 스택과 일치)
> 신규 module: `pong` — 사용자 가치 `고전 Pong 경기`의 영문 표준 표기, 기존 module과 중복 없음(§0 가정 1)
> 단위 테스트(예정, 후속 task): `node --test tests/pong-*.test.js` (focused scope · module: `pong`)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 신규 라우트 그룹 `phase18-games/` 신설, 디렉터리 컨벤션은 기존 `phase18-validation/` 선례를 따름:** 저장소에는 실제 라우터가 없다(`package.json` `name: notepad-spa`, Next.js 등 라우팅 프레임워크 의존성 0건, `src/routes/api/`에는 `tetris/`만 존재). 기존 검증 스위트(status-card-1/counter-2/clock-3/dice-4)는 모두 저장소 최상위 `phase18-validation/<name>/`에 구현되었다(`docs/planning/dice-4-BF-897.md` §0 가정 1 실측 근거). 본 task의 라우트는 Epic 설명이 `/phase18-games/pong`으로 **이미 명시**했으므로, 동일한 저장소 관례(최상위 컨테이너 디렉터리 + 하위 항목 폴더)를 그대로 적용해 신규 경로를 **`phase18-games/pong/`**(저장소 최상위, `phase18-validation/`과 형제 디렉터리)로 확정한다. `src/app/phase18-games/pong/`은 지정하지 않는다(선례가 3회 연속 `src/app` 밖에 구현된 사실과 일치시킴).

**가정 2 — 이 문서는 전량 신규(forward) 설계다(재구현 대상 없음):** `tetris/`·`dice-4` 등 선행 문서는 이미 구현된 로직을 역-공식화했지만, 저장소 전체에 Pong 관련 코드·디자인 문서가 **0건**이므로 본 문서는 게임 규칙·물리·상태 모델을 **처음부터 정의**한다. 아래 상수·공식은 "이미 동작하는 코드의 재현"이 아니라 "이 문서가 최초로 확정하는 계약(SSOT)"이며, 후속 designer/dev는 이 값을 임의로 바꾸지 않고 구현해야 한다(변경이 필요하면 Jira 코멘트로 확인 후 본 문서 개정).

**가정 3 — 게임 모드 = 1인용(플레이어 vs CPU), 로컬 2인 동시 조작은 비범위:** Epic 설명은 "360px 터치 컨트롤 요구"를 명시한다. 360px 폭의 단일 화면에서 두 사람이 동시에 서로 다른 영역을 터치하며 대전하는 것은 실용적이지 않고(손가락 간섭·좁은 터치 존), 기존 Phase 18 계열 검증 페이지도 전부 단일 사용자 상호작용을 전제로 했다. 따라서 본 게임은 **플레이어(좌측 패들, 사용자 조작) vs CPU(우측 패들, 자동 AI)** 구도로 확정한다(§3, §5). 로컬 2인용/온라인 대전은 §11 비범위.

**가정 4 — 승리 조건 = 11점 선취, 2점차(deuce) 규칙 없음:** Epic·수용 기준 원문에 정확한 목표 점수가 없다. 오리지널 아케이드 Pong의 표준 승리 점수(11점)를 채택하되, 탁구식 "2점차 승리(deuce)" 규칙은 추가하지 않는다(Simplicity First — 요구되지 않은 규칙을 추측 확장하지 않음). §4에서 상수화(`WIN_SCORE = 11`).

**가정 5 — "브라우저 메모리 상태 모델" = 영속 저장 없음(세션 in-memory 전용):** Epic 설명의 "브라우저 메모리 상태 모델" 문구를 "게임 상태가 서버/DB가 아니라 브라우저 메모리(JS 변수)에만 존재한다"는 의미로 해석하고, 한 걸음 더 나아가 `localStorage`/`sessionStorage` 등 **영속 저장소도 사용하지 않는 것으로 확정**한다(§6). 이는 `dice-4`(§0 가정 3, "통계는 세션 in-memory 상태로만 존재")가 확립한 선례와 동일한 판단이며, 새로고침 시 최종 점수·승패 기록이 초기화되는 것은 결함이 아니라 의도된 동작이다. 최고 연속 승수·전적 등 영속 통계 기능은 Epic 원문에 없으므로 추가하지 않는다(§11).

**가정 6 — 파일 소유권:** 본 task(BF-911)의 담당 파일은 `docs/planning/pong-BF-910.md` 1개뿐이다(File Ownership 원문 명시 — `docs/planning/**`). `phase18-games/pong/*` 코드, `docs/design/*` 디자인 문서, `tests/pong-*.test.js`는 후속 designer/dev/tester task 담당 영역이며 본 task에서 생성·수정하지 않는다. `package.json`(테스트 스크립트 추가 등)도 본 문서 범위 밖이다.

**가정 7 — Jira 조회 도구 미연결(운영자 확인 권장):** 본 세션에는 Jira 코멘트/조회 MCP 도구가 연결되어 있지 않다. 산출물 위치·AC 요약은 본 문서 및 커밋 메시지로 대체 기록하며, 별도 Jira 코멘트 등록은 도구 연결 후 운영자 또는 시스템이 보완해야 한다(§13-1).

---

## 목차

1. [개요](#1-개요)
2. [용어 정의](#2-용어-정의)
3. [게임 규칙 — 코트·패들·공 물리](#3-게임-규칙--코트패들공-물리)
4. [점수·승리 조건](#4-점수승리-조건)
5. [입력 모델 — 키보드 + 360px 터치 컨트롤](#5-입력-모델--키보드--360px-터치-컨트롤)
6. [상태 모델 — 브라우저 메모리, 상태 전이](#6-상태-모델--브라우저-메모리-상태-전이)
7. [화면 구성 요구사항 (반응형 360px)](#7-화면-구성-요구사항-반응형-360px)
8. [외부 의존성 배제 확인](#8-외부-의존성-배제-확인)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 및 실패 케이스 목록](#10-edge-case-및-실패-케이스-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [파일 구조 및 기술 제약](#12-파일-구조-및-기술-제약)
13. [산출물 위치 및 참조 표 / 남은 모호함](#13-산출물-위치-및-참조-표--남은-모호함)

---

## 1. 개요

### 1.1 목적

`/phase18-games/pong`은 신규 module `pong`의 최초 항목으로, 고전 Pong 경기(플레이어 vs CPU)를 결정론적 물리 규칙과 명확한 상태 전이로 구현 가능하게 하는 기획 SSOT다. 게임 루프(패들·공·점수), 승리 조건, 브라우저 메모리 상태 모델, 360px 뷰포트에서의 터치 조작을 후속 designer(mockup)·dev(구현)·tester(E2E)가 동일한 기준으로 다룰 수 있도록 문서화한다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-games/pong/`(`index.html`/`styles.css`/`logic.js`/`main.js`) — §0 가정 1, §12 |
| 게임 모드 | 1인용, 플레이어(좌측) vs CPU(우측) — §0 가정 3 |
| 물리·규칙 | §3 — 코트·패들·공 이동/충돌/반사, 전량 신규 정의 |
| 점수·승리 | §4 — 11점 선취(deuce 없음) |
| 입력 | §5 — 키보드(데스크톱) + Pointer Events 기반 터치/마우스 드래그(360px 필수 지원) |
| 상태 영속화 | 없음 — 브라우저 메모리(JS 변수)에만 존재, 새로고침 시 초기화(§0 가정 5, §6) |
| 외부 의존성 | 없음 — 네트워크 요청·외부 라이브러리·서버 API·DB 0건(§8) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전, Pointer Events 지원) 또는 Node.js(`node --test`)로 순수 함수(물리·점수·AI 계산 로직) 단위 테스트
- `phase18-games/`, `phase18-games/pong/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 렌더링은 `<canvas>` 2D context 사용을 전제로 물리 좌표계를 설계한다(§3.1) — 다만 렌더링 기술(canvas vs DOM 요소) 자체는 dev 재량으로 열어둘 수 있으나, 좌표계·상수(§3, §4)는 렌더링 방식과 무관하게 그대로 지켜야 한다.

---

## 2. 용어 정의

| 용어 | 정의 |
|---|---|
| 코트(Court) | 게임이 벌어지는 논리적 직사각형 영역. 크기 `800 × 400`(px, 논리 좌표) 고정 |
| 패들(Paddle) | 플레이어/CPU가 조작하는 세로 막대. 좌측=플레이어, 우측=CPU |
| 공(Ball) | 원형 물체. 좌우로 이동하며 상하 벽·패들에 반사 |
| 서브(Serve) | 득점 직후 공이 코트 중앙에서 다시 발사되는 것 |
| 랠리(Rally) | 서브 이후 어느 한쪽이 공을 놓칠 때까지의 진행 구간 |
| 득점(Score) | 공이 상대 패들을 지나 코트 좌/우 경계를 완전히 벗어난 것 |
| 반사각 보정(Bounce Angle) | 패들의 맞은 위치에 따라 공의 튕겨 나가는 수직 속도가 달라지는 규칙(§3.4) |
| CPU AI | 우측 패들을 자동으로 제어하는 결정론적 추적 알고리즘(§3.5) |

---

## 3. 게임 규칙 — 코트·패들·공 물리

### 3.1 좌표계 및 상수

논리 좌표계는 렌더링 크기(CSS 픽셀)와 분리된 고정 해상도를 사용한다. 화면 표시 시 CSS로 반응형 스케일링하되(§7), 물리 계산은 항상 아래 논리 좌표 기준으로 수행한다.

| 상수 | 값 | 설명 |
|---|---|---|
| `COURT_WIDTH (W)` | `800` | 코트 논리 폭(px) |
| `COURT_HEIGHT (H)` | `400` | 코트 논리 높이(px) |
| `PADDLE_WIDTH` | `12` | 패들 폭 |
| `PADDLE_HEIGHT` | `80` | 패들 높이 |
| `PADDLE_MARGIN_X` | `24` | 코트 좌/우 경계로부터 패들까지 거리 |
| `PADDLE_SPEED_KEYBOARD` | `480` px/s | 키보드 입력 시 패들 이동 속도 |
| `CPU_SPEED` | `360` px/s | CPU 패들이 공을 추적하는 최대 속도(플레이어보다 느리게 설정 — 이길 수 있는 난이도) |
| `CPU_RETURN_SPEED` | `180` px/s | 공이 CPU에서 멀어질 때 중앙으로 복귀하는 속도 |
| `BALL_RADIUS` | `8` | 공 반지름 |
| `BALL_SPEED_INIT` | `300` px/s | 서브 시 초기 속력(벡터 크기) |
| `BALL_SPEED_INCREMENT` | `×1.05` | 패들 반사 1회당 속력 배수(누적) |
| `BALL_SPEED_MAX` | `600` px/s | 속력 상한(캡) |
| `SERVE_ANGLE_RANGE` | `10° ~ 45°` (부호 무작위) | 서브 각도 범위 — 0°에 근접한 완전 수평 서브는 배제(§10.1) |
| `WIN_SCORE` | `11` | 선취 시 즉시 승리(§4) |
| `POINT_PAUSE_MS` | `800` | 득점 후 다음 서브까지 자동 대기 시간 |

> `BALL_SPEED_MAX(600px/s)` 및 60fps 기준 프레임당 최대 이동거리(≈10px)가 `PADDLE_WIDTH(12)`보다 작도록 상수를 설계했다 — 공이 한 프레임에 패들을 그대로 통과(터널링)하는 상황이 이 상수 조합에서는 발생하지 않는다(§10.6 근거).

### 3.2 패들 위치 및 이동

- 플레이어 패들: `x = PADDLE_MARGIN_X(24)`, `y`는 입력에 따라 변경, 범위 `[0, H - PADDLE_HEIGHT] = [0, 320]`으로 클램프
- CPU 패들: `x = W - PADDLE_MARGIN_X - PADDLE_WIDTH = 764`, `y`는 §3.5 AI 규칙으로 자동 갱신, 동일 범위로 클램프
- 두 패들 모두 Y축으로만 이동(X 고정) — 좌우 이동 없음

### 3.3 공 이동 및 벽 반사

- 매 프레임: `ball.x += ball.vx * dt`, `ball.y += ball.vy * dt` (`dt`는 초 단위 델타타임, §10.5에서 상한 클램프)
- 상/하 벽 반사: `ball.y <= BALL_RADIUS` 또는 `ball.y >= H - BALL_RADIUS`이면 `ball.vy = -ball.vy`(위치도 경계값으로 보정하여 벽 안쪽에 머물게 함) — 좌우 벽은 반사하지 않고 득점 판정(§4.1)으로 처리

### 3.4 패들 충돌 및 반사각 보정

공의 X 범위가 패들의 X 범위와 겹치고, 동시에 공의 Y가 패들 Y 범위(`paddle.y ~ paddle.y + PADDLE_HEIGHT`) 안에 있으면 충돌로 판정한다.

```
relativeIntersectY = (ball.y - (paddle.y + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2)   // -1 ~ 1
speed = min(sqrt(vx^2 + vy^2) * BALL_SPEED_INCREMENT, BALL_SPEED_MAX)
newVx = sign(-vx) * speed * max(cos(relativeIntersectY * MAX_BOUNCE_ANGLE), MIN_VX_RATIO)
newVy = speed * sin(relativeIntersectY * MAX_BOUNCE_ANGLE)
```

| 상수 | 값 | 설명 |
|---|---|---|
| `MAX_BOUNCE_ANGLE` | `60°` (라디안 환산 후 사용) | 패들 끝단(`relativeIntersectY = ±1`)에 맞았을 때 최대 반사각 |
| `MIN_VX_RATIO` | `0.4` | 반사 후 `vx` 성분이 전체 속력의 40% 이상은 항상 유지되도록 하한 보장 — 거의 수직으로 튕겨 랠리가 좌우로 진행되지 않는 퇴화 상태 방지(§10.2) |

- 반사 직후 공은 패들 바깥쪽으로 위치 보정(`ball.x`를 패들 표면 밖으로 밀어냄)하여 같은 프레임에 다시 충돌 판정되는 것을 막는다.
- 패들 정중앙(`relativeIntersectY ≈ 0`)에 맞으면 거의 수평으로 반사되고(반사각 0에 근접), 끝단에 맞을수록 각도가 커진다 — 고전 Pong의 "패들 컨트롤" 체감을 재현한다.

### 3.5 CPU AI (결정론적 추적)

```
if (ball.vx > 0) {                    // 공이 CPU 쪽으로 이동 중
  targetY = ball.y - PADDLE_HEIGHT/2
  cpu.y = moveTowards(cpu.y, targetY, CPU_SPEED * dt)
} else {                              // 공이 플레이어 쪽으로 이동 중 — 중앙 복귀
  centerY = H/2 - PADDLE_HEIGHT/2
  cpu.y = moveTowards(cpu.y, centerY, CPU_RETURN_SPEED * dt)
}
cpu.y = clamp(cpu.y, 0, H - PADDLE_HEIGHT)
```

- `moveTowards(current, target, maxDelta)`: `target`과의 차이가 `maxDelta`보다 크면 `maxDelta`만큼만 이동, 아니면 즉시 `target`으로 스냅 — 순수 함수, 동일 입력에 항상 동일 출력(결정론).
- CPU는 완벽하지 않다(`CPU_SPEED(360) < PADDLE_SPEED_KEYBOARD(480)`) — 플레이어가 빠른 반응으로 이길 수 있는 난이도로 의도적으로 설계(§0 가정 3 연장).

---

## 4. 점수·승리 조건

### 4.1 득점 판정

```
if (ball.x < 0)          score.cpu    += 1   // 공이 좌측 경계를 완전히 벗어남 = 플레이어가 놓침
if (ball.x > W)          score.player += 1   // 공이 우측 경계를 완전히 벗어남 = CPU가 놓침
```

득점 발생 시:
1. 공을 코트 중앙(`x=W/2, y=H/2`)으로 즉시 리셋
2. `status`를 `point-paused`로 전환(§6), `POINT_PAUSE_MS(800ms)` 경과 후 자동으로 새 서브 발사
3. 서브 방향: 좌/우 무작위 50/50(`Math.random() < 0.5`), 각도는 `SERVE_ANGLE_RANGE`(§3.1) 내 무작위 — 득점자와 무관하게 매 서브 독립 시행(§10.1 결정론 한계 참고)

### 4.2 승리 조건

```
if (score.player >= WIN_SCORE) winner = 'player'
if (score.cpu    >= WIN_SCORE) winner = 'cpu'
```

- `WIN_SCORE = 11` 선취 즉시 게임 종료, 2점차(deuce) 규칙 없음(§0 가정 4) — 예: `11:9`도 즉시 승리 확정.
- 승리 판정은 득점 직후(§4.1 처리 완료 시점)에만 검사하며, 랠리 도중에는 검사하지 않는다(중간 스코어로 승패가 확정되는 경우는 없음).

---

## 5. 입력 모델 — 키보드 + 360px 터치 컨트롤

### 5.1 통합 조작 원칙

플레이어 패들의 Y 위치는 **키보드**와 **포인터(마우스/터치 통합, Pointer Events)** 두 경로로 갱신될 수 있으며, 마지막으로 발생한 입력이 우선한다(둘을 동시에 사용해도 서로 덮어쓰지 않고 최신 이벤트가 반영됨 — 별도 잠금 불필요).

### 5.2 키보드 조작 (데스크톱/접근성)

| 키 | 동작 |
|---|---|
| `ArrowUp` / `W` (누르고 있는 동안) | `player.y -= PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowDown` / `S` (누르고 있는 동안) | `player.y += PADDLE_SPEED_KEYBOARD * dt` |
| `ArrowUp`+`ArrowDown` 동시 눌림 | 상쇄 — 순이동 `0`(둘 중 하나만 우선시키지 않고 결정론적으로 정지, §10.4) |
| `P` / `Escape` | `playing ⇄ paused` 토글(§6.2) |
| `Enter` / `Space` | `start → playing` 시작, `gameover → playing` 재시작(§6.2) |
| `R` | 즉시 재시작(`playing`/`paused`/`gameover`에서 전체 초기화, §6.2) |

### 5.3 360px 터치 컨트롤 (필수 요구, Epic 명시 항목)

- **입력 방식**: Pointer Events(`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) — 터치와 마우스 드래그를 동일 코드 경로로 처리한다. 캔버스 요소에 `touch-action: none`을 지정해 드래그 중 페이지 스크롤/줌이 발생하지 않도록 한다.
- **좌표 변환**: `pointerdown`/`pointermove` 발생 시 `logicalY = (event.clientY - canvasRect.top) / canvasRect.height * COURT_HEIGHT`로 화면 좌표를 논리 좌표로 변환하고, `player.y = clamp(logicalY - PADDLE_HEIGHT/2, 0, H - PADDLE_HEIGHT)`로 패들 중심을 포인터 Y에 즉시 맞춘다(속도 제한 없이 손가락 위치를 직접 추종 — 터치 반응성 최우선).
- **드래그 영역**: 캔버스 전체 표시 영역(패들이 그려진 좁은 띠가 아니라 캔버스 전체)이 드래그 감지 대상이다 — 360px 폭 화면에서도 충분히 넓은 터치 히트 영역을 확보한다(별도의 작은 버튼 UI 불필요).
- **포인터 캡처**: `pointerdown` 시 `canvas.setPointerCapture(event.pointerId)`를 호출해, 드래그 중 손가락/커서가 캔버스 경계 밖으로 나가도 `pointermove` 이벤트가 계속 전달되도록 한다(§10.7).
- **X 좌표는 무시**: 터치 지점의 X 위치는 패들 이동에 영향을 주지 않는다(패들은 Y축으로만 이동, §3.2) — 캔버스의 어느 X 지점을 터치해도 동작 동일.
- **뷰포트 지원 하한**: 360px CSS 너비(예: 소형 모바일 기기)에서 좌우 여백(§7 레이아웃 패딩) 이후 남는 캔버스 표시 폭에서도 위 매핑 공식이 동일하게 성립해야 한다(디자인/구현 검증 시 360px 프레임에서 실측 확인 필요, §13-2).
- **멀티터치**: 두 손가락 이상 동시 터치는 지원하지 않는다(단일 포인터만 처리, 두 번째 `pointerdown`은 무시) — 로컬 2인용이 비범위이므로(§0 가정 3) 멀티터치 대전 UI도 비범위(§11).

---

## 6. 상태 모델 — 브라우저 메모리, 상태 전이

### 6.1 상태 데이터 형태 (in-memory 전용, §0 가정 5)

```js
state = {
  status: 'start' | 'playing' | 'point-paused' | 'paused' | 'gameover',
  score: { player: 0, cpu: 0 },
  ball: { x: 400, y: 200, vx: 0, vy: 0 },
  paddles: { player: { y: 160 }, cpu: { y: 160 } },
  winner: null,               // 'player' | 'cpu' | null
  pointPausedAt: null,        // point-paused 진입 시각(ms) — POINT_PAUSE_MS 경과 판정용
}
```

이 객체는 순수 JS 런타임 변수로만 존재하며, `localStorage`/`sessionStorage`/서버 세션 어디에도 기록되지 않는다. 페이지를 새로고침하거나 닫으면 완전히 소실된다(§0 가정 5) — 이는 결함이 아니라 "브라우저 메모리 상태 모델"의 명시적 정의다.

### 6.2 상태 전이표

| From | To | 트리거 | 부수 효과 |
|---|---|---|---|
| `start` | `playing` | "시작" 버튼 클릭 또는 `Enter`/`Space`(status=start일 때만) | `score={player:0,cpu:0}`, 패들 중앙 배치(`y=(H-PADDLE_HEIGHT)/2=160`), 첫 서브 발사(§4.1-3), 게임 루프 시작 |
| `playing` | `point-paused` | 득점 발생(§4.1)했으나 `WIN_SCORE` 미도달 | 공 중앙 리셋, 점수 갱신, `pointPausedAt`=현재 시각 기록, 패들 위치는 그대로 유지 |
| `point-paused` | `playing` | 자동(`POINT_PAUSE_MS` 경과) | 새 서브 발사(§4.1-3), `pointPausedAt=null` |
| `playing` | `gameover` | 득점으로 `score.player` 또는 `score.cpu`가 `WIN_SCORE` 도달 | `winner` 확정, 게임 루프 정지, 결과 화면 표시 |
| `playing` | `paused` | `P`/`Escape`(status=playing일 때만) | 게임 루프 정지(공/패들 위치·속도 그대로 보존) |
| `paused` | `playing` | `P`/`Escape` 또는 "계속하기" 버튼 | 게임 루프 재개, 정지 동안 경과 시간은 물리에 영향 없음(재개 시 `dt` 타이머 재설정, §10.5) |
| `paused` | `start` | "메뉴로" 버튼 | 진행 중이던 점수/상태 폐기, 시작 화면 복귀 |
| `gameover` | `playing` | `R` 또는 "다시 하기" 버튼 | `start→playing`과 동일한 전체 초기화 |
| `gameover` | `start` | "메뉴로" 버튼 | 시작 화면 복귀 |

> 정의되지 않은 전이(예: `start`에서 `P` 입력, `gameover`에서 패들 이동 입력, `point-paused` 중 사용자 일시정지 시도)는 **무시**된다 — 모든 핸들러가 상태별 조건 가드(`if (state.status !== 'playing') return`)로 no-op 처리하며 예외를 던지지 않는다.

### 6.3 상태별 수용 기준 (Given/When/Then)

**AC-STATE-01 (start → playing)**
> **Given** 사용자가 시작 화면(`status=start`)에 있다
> **When** "시작" 버튼을 클릭하거나 `Enter`/`Space`를 누르면
> **Then** `status`가 `playing`으로 전이되고 `score={player:0,cpu:0}`, 패들이 중앙에 배치된 채 첫 서브가 발사되며 게임 루프가 시작된다.

**AC-STATE-02 (playing → point-paused → playing, 득점 처리)**
> **Given** 랠리가 진행 중(`status=playing`)이다
> **When** 공이 좌/우 경계를 완전히 벗어나 득점이 발생하면(승리 점수 미도달)
> **Then** 해당 팀 점수가 1 증가하고 `status`가 `point-paused`로 전이되며, `800ms` 후 자동으로 `playing`으로 복귀해 새 서브가 발사된다.

**AC-STATE-03 (playing → gameover)**
> **Given** 한쪽 점수가 `10`점이고 랠리가 진행 중이다
> **When** 그 팀이 득점해 점수가 `11`이 되면
> **Then** `status`가 즉시 `gameover`로 전이되고 `winner`가 확정되며, 게임 루프가 정지하고 승자 화면이 표시된다.

**AC-STATE-04 (playing ⇄ paused)**
> **Given** 사용자가 랠리 진행 중(`status=playing`)이다
> **When** `P` 또는 `Escape`를 누르면
> **Then** `status`가 `paused`로 전이되어 공/패들이 그 위치에서 정지하고, 다시 `P`/`Escape`를 누르면 `playing`으로 복귀해 정지 시점 그대로 재개된다(경과 시간이 물리에 영향 없음).

**AC-STATE-05 (gameover → playing, 재시작)**
> **Given** 사용자가 게임오버 상태(`status=gameover`)이다
> **When** `R` 또는 "다시 하기" 버튼을 누르면
> **Then** `score={player:0,cpu:0}`로 완전히 새로운 게임이 시작된다(직전 결과는 저장되지 않고 소실 — §0 가정 5).

**AC-STATE-06 (paused/gameover → start)**
> **Given** 사용자가 일시정지 또는 게임오버 상태이다
> **When** "메뉴로" 버튼을 누르면
> **Then** `status=start`로 전이되고 시작 화면이 표시되며, 진행 중이던 점수/공 상태는 폐기된다.

---

## 7. 화면 구성 요구사항 (반응형 360px)

### 7.1 페이지 구조

```
<body>
 ├─ <header class="topbar">     ← "Pong 아케이드" 타이틀
 └─ <main class="page">
     ├─ <div class="scoreboard">  ← "플레이어 {score.player} : {score.cpu} CPU"
     ├─ <canvas id="court" width="800" height="400">  ← §3.1 논리 해상도, CSS로 반응형 스케일
     └─ <div class="controls-hint">  ← "↑/↓ 또는 화면을 드래그해 패들을 움직이세요" 안내문 + 시작/일시정지/재시작 버튼
```

### 7.2 반응형 규칙 (360px 필수 지원)

- 캔버스 CSS: `width: 100%; max-width: 800px; height: auto; aspect-ratio: 2 / 1;` — 논리 해상도(`800×400`)는 불변, 표시 크기만 뷰포트에 맞춰 축소된다.
- 360px 뷰포트 기준(페이지 좌우 패딩 적용 후) 캔버스 표시 폭이 최소 약 320px 이상 확보되도록 페이지 패딩을 제한한다(과도한 여백으로 캔버스가 지나치게 작아지지 않도록).
- 스코어보드·조작 안내·버튼은 캔버스 위/아래로 세로 스택 배치되어 360px 폭에서 가로 스크롤 없이 전부 표시된다.
- 리사이즈/화면 회전 시 캔버스 CSS 크기만 바뀌고 논리 좌표계는 그대로이므로, 포인터 좌표 변환식(§5.3)이 매 이벤트마다 `canvasRect`를 다시 읽어 자동으로 대응한다(별도 리사이즈 핸들러 불필요).

### 7.3 `prefers-reduced-motion` 처리 방침

공의 이동 자체가 게임의 핵심 동작이므로 `prefers-reduced-motion: reduce`에서도 공/패들의 물리적 이동은 동일하게 유지한다(모션이 곧 게임 콘텐츠 — tetris §5의 "낙하"와 동일한 성격). 별도의 부가 연출(파티클·화면 흔들림 등)은 v1 범위에 포함하지 않으므로(§11) reduced-motion 관련 추가 분기가 필요 없다.

### 7.4 `<noscript>` 폴백

JS가 비활성화된 경우 "이 게임은 JavaScript가 필요합니다" 안내 문구를 표시한다(저장소 내 기존 모듈들과 동일 패턴).

---

## 8. 외부 의존성 배제 확인

vanilla-static 제약(Epic 명시)에 따라 다음을 명시적으로 배제한다.

| 확인 항목 | 값 |
|---|---|
| `fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 호출 | 0건 |
| 외부 URL 리터럴(`https?://`) | 0건(상대경로 리소스만 사용) |
| 신규 npm 패키지/외부 CDN 스크립트 | 0건 — `package.json`에 신규 dependency 추가하지 않음(§0 가정 6) |
| 서버 API 라우트 신규 생성(`/api/pong*` 등) | 없음 |
| DB 스키마(Prisma 등) | 없음 |
| `localStorage`/`sessionStorage` 등 영속 저장 | 없음(§0 가정 5) — 상태는 전량 세션 in-memory |
| 인증/세션/로그인 | 불필요 — 공개 정적 페이지(저장소 전체에 인증 로직 0건, `dice-4-BF-897.md` §0 가정 5와 동일 근거) |

검증 방법(후속 dev/tester가 구현 후 실행): `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://|localStorage|sessionStorage" phase18-games/pong/*` → 매치 0건이어야 통과.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-911 수용 기준 원문 매핑

**AC-1 (게임 규칙·상태·터치 컨트롤·수용 기준의 검증 가능한 정의)**
> **Given** Epic BF-910 요구
> **When** 기획 명세(`docs/planning/pong-BF-910.md`)를 작성하면
> **Then** 게임 루프(§3 패들·공·점수), 승리 조건(§4), 브라우저 메모리 상태 모델(§6), 360px 터치 컨트롤 요구(§5.3)가 검증 가능한 형태(구체적 상수·공식·전이표·GWT)로 정의된다.

충족 근거: §3(패들·공 물리 상수·공식) · §4(득점·승리 판정식) · §5.3(터치 좌표 변환 공식·드래그 영역·포인터 캡처) · §6(상태 데이터 형태·전이표·AC-STATE-01~06) · §9.2(파생 AC).

**AC-2 (vanilla-static — 외부 의존성/네트워크 배제 명시)**
> **Given** vanilla-static 제약
> **When** 명세를 확정하면
> **Then** 외부 의존성/네트워크 사용이 명시적으로 배제된다.

충족 근거: §8 표(7개 확인 항목 전부 "0건"/"없음"/"불필요") + 검증용 `grep` 명령.

### 9.2 파생 AC — 게임 규칙·물리

**AC-RULE-01 (벽 반사)**
> **Given** 공이 상/하 벽 경계(`y ≤ BALL_RADIUS` 또는 `y ≥ H - BALL_RADIUS`)에 도달했다
> **When** 다음 프레임이 갱신되면
> **Then** `vy`의 부호가 반전되고 공은 벽 안쪽에 머문다(§3.3).

**AC-RULE-02 (패들 반사각 보정)**
> **Given** 공이 패들에 충돌했고 충돌 지점이 패들 중심에서 `relativeIntersectY`만큼 벗어나 있다
> **When** 반사가 계산되면
> **Then** `vx` 부호가 반전되고 속력이 `×1.05`(상한 `BALL_SPEED_MAX` 이내) 증가하며, `vy`는 `relativeIntersectY`에 비례해 최대 `MAX_BOUNCE_ANGLE(60°)`까지 조정된다(§3.4).

**AC-RULE-03 (득점 판정)**
> **Given** 공이 `x < 0` 또는 `x > W`로 완전히 벗어났다
> **When** 프레임이 갱신되면
> **Then** 해당 상대 팀 점수가 1 증가하고 공이 중앙으로 리셋되며 `point-paused` 상태로 전이된다(§4.1, AC-STATE-02).

**AC-RULE-04 (승리 판정)**
> **Given** 득점 처리 직후 어느 한쪽 점수가 `WIN_SCORE(11)`에 도달했다
> **When** 승리 판정이 실행되면
> **Then** 즉시 `gameover`로 전이되고 `winner`가 확정된다(2점차 규칙 없음, §4.2, AC-STATE-03).

**AC-RULE-05 (CPU AI 결정론)**
> **Given** 고정된 `(cpu.y, ball.y, ball.vx, dt)` 입력
> **When** `moveTowards` 기반 CPU 갱신 함수를 호출하면
> **Then** 항상 동일한 `cpu.y` 출력이 산출된다(§3.5 순수 함수, 랜덤 요소 없음).

### 9.3 파생 AC — 터치·상태

**AC-TOUCH-01 (360px 터치 드래그)**
> **Given** 360px 폭 뷰포트에서 페이지가 렌더링되었다
> **When** 사용자가 캔버스 영역을 손가락으로 눌러 위/아래로 드래그하면
> **Then** 플레이어 패들이 손가락의 논리 Y좌표를 즉시 추종하며(§5.3 좌표 변환식), 드래그 중 페이지 스크롤/줌이 발생하지 않는다.

**AC-TOUCH-02 (포인터 캡처 유지)**
> **Given** 사용자가 캔버스 위에서 드래그를 시작했다(`pointerdown`)
> **When** 손가락/커서가 캔버스 경계 밖으로 이동하면
> **Then** `setPointerCapture`에 의해 `pointermove` 이벤트가 계속 전달되어 패들 추종이 끊기지 않는다(§5.3, §10.7).

각 §6.3 AC-STATE-01~06은 §9의 파생 AC로 포함한다(상태 전이 전체 커버).

### 9.4 매핑 요약표

| BF-911 수용 기준 | 충족 근거 |
|---|---|
| Given Epic BF-910 요구, When 기획 명세 작성, Then 게임 규칙·상태 모델·터치 컨트롤 요구·수용 기준이 검증 가능하게 정의된다 | §3~§6(규칙/상태 전체) + §9.2~9.3(파생 GWT 8개 + 상태 AC 6개) |
| Given vanilla-static 제약, When 명세 확정, Then 외부 의존성/네트워크 사용이 명시적으로 배제된다 | §8 표 + grep 검증 명령 |

---

## 10. Edge Case 및 실패 케이스 목록

### 10.1 서브 각도·방향의 비결정적 무작위성

§4.1-3에서 서브 방향(좌/우)과 각도는 `Math.random()` 기반이라 동일한 득점 상황이라도 다음 서브의 궤적은 매번 달라진다(테트리스 §9.1과 동일한 유형의 의도된 비결정성). 단위 테스트는 방향/각도의 "범위"만 검증하고 특정 값의 재현을 요구하지 않는다(§12 테스트 방침).

### 10.2 패들 끝단 충돌 시 수직에 가까운 반사(퇴화 방지)

`relativeIntersectY = ±1`(패들 정끝단)일 때 `MIN_VX_RATIO(0.4)` 하한이 없다면 공이 거의 수직으로 튕겨 좌우로 전혀 진행하지 않는 상태가 반복될 수 있다. §3.4에서 `vx` 성분이 항상 전체 속력의 40% 이상을 유지하도록 강제해 이 퇴화 상태를 방지한다.

### 10.3 공 속력 무한 누적 방지

패들 반사마다 `×1.05` 배수가 누적되면 이론상 속력이 무한히 증가할 수 있으므로 `BALL_SPEED_MAX(600px/s)` 캡을 반드시 적용한다(§3.4 공식에 `min(...)` 포함).

### 10.4 키보드 상하 동시 입력

`ArrowUp`과 `ArrowDown`(또는 `W`/`S`)이 동시에 눌린 경우, 어느 하나를 임의로 우선시키지 않고 상쇄하여 순이동을 `0`으로 고정한다(§5.2) — 두 키의 `keydown`/`keyup` 순서에 의존하지 않는 결정론적 규칙.

### 10.5 탭 백그라운드 전환 후 델타타임 급증(물리 폭주 방지)

브라우저 탭이 백그라운드로 전환되면 `requestAnimationFrame`이 지연되어 복귀 시 `dt`가 비정상적으로 커질 수 있다. 이 경우 공이 한 프레임에 코트를 가로질러 순간이동하거나 충돌 판정을 건너뛸 수 있으므로, 매 프레임 `dt = min(rawDt, 1/30)`으로 상한을 클램프한다(§3.3, §3.5 모든 이동 계산에 공통 적용).

### 10.6 고속 구간에서의 터널링 미발생 근거

§3.1 각주에서 명시한 대로 `BALL_SPEED_MAX(600px/s)` 기준 60fps 프레임당 최대 이동거리(≈10px)가 `PADDLE_WIDTH(12px)`보다 작다 — 설계 상수 조합상 공이 패들을 그대로 통과하는 터널링은 발생하지 않는다. 만약 향후 속력 상한을 올리는 개정이 있다면 이 부등식을 반드시 재검증해야 한다.

### 10.7 터치 드래그 중 포인터 이탈

손가락이 캔버스 경계 밖으로 나가면 일반적으로 `pointermove` 이벤트가 더 이상 캔버스로 전달되지 않아 패들 추종이 끊긴다. `setPointerCapture(event.pointerId)`로 이를 방지한다(§5.3) — 이 처리가 없으면 사용자가 캔버스 가장자리 근처에서 빠르게 드래그할 때 패들이 멈추는 체감 버그가 발생한다.

### 10.8 정의되지 않은 상태에서의 입력

`start`/`gameover` 상태에서 패들 이동 입력(키보드/터치)이 들어오는 경우, 또는 `point-paused` 중 사용자가 일시정지를 시도하는 경우는 모두 무시(no-op)된다(§6.2) — 예외를 던지지 않고 조용히 무시하는 것이 정상 동작이다.

### 10.9 동시 다중 포인터(멀티터치) 입력

두 번째 손가락으로 추가 `pointerdown`이 발생해도 이미 캡처된 첫 포인터만 유효하며 두 번째 포인터는 무시한다(§5.3) — 멀티터치 동시 조작은 지원 대상이 아니다.

---

## 11. 비범위 (Out of Scope)

- 로컬 2인용(플레이어 vs 플레이어) 동시 조작 — §0 가정 3
- 온라인 대전/매치메이킹 — 네트워크 의존성 자체가 배제 대상(§8)
- 난이도 선택 UI(CPU 속도 조절 등) — `CPU_SPEED`는 고정 상수(§3.1)
- 최고 기록/전적/연승 등 영속 통계 — §0 가정 5, 영속 저장 자체가 비범위
- 사운드 효과 — Epic 원문에 언급 없음, 추측 확장하지 않음
- 파티클/화면 흔들림 등 부가 연출 — §7.3
- 온스크린 방향 버튼(▲/▼) UI — 캔버스 전체 드래그로 충분(§5.3), 필요 시 dev 재량으로 추가 가능하나 필수 아님
- 디자인 mockup 산출물 — designer 담당 영역, 본 문서는 규칙/물리/상태/입력 계약만 정의

---

## 12. 파일 구조 및 기술 제약

| 파일(제안, 최종 분할은 dev 재량) | 역할 |
|---|---|
| `phase18-games/pong/index.html` | 마크업(§7.1), `<canvas id="court" width="800" height="400">` |
| `phase18-games/pong/styles.css` | 반응형 레이아웃(§7.2), 저장소 공통 디자인 토큰 재사용 권장(신규 색상 발명 최소화) |
| `phase18-games/pong/logic.js` | 순수 함수: 공/패들 이동, 벽·패들 충돌 반사(§3.3~§3.4), CPU AI(§3.5), 득점·승리 판정(§4) — UMD/IIFE, `node --test` 대상 |
| `phase18-games/pong/main.js` | DOM 바인딩: 게임 루프(`requestAnimationFrame`), 키보드(§5.2)·Pointer Events(§5.3) 입력 처리, 캔버스 렌더링, 상태 전이(§6) 실행 |

- 논리 좌표계(`800×400`)와 상수(§3.1)는 렌더링 방식(canvas 2D 권장)과 무관하게 고정 계약이다.
- 비-module(IIFE/UMD) 패턴 권장 — `file://` 프로토콜 직접 실행 호환(저장소 기존 모듈들의 공통 관례).
- 테스트(후속 tester task 대상): `node --test tests/pong-*.test.js` — ① 벽/패들 반사 공식(§3.3~§3.4) 고정 입력값 검증, ② CPU AI `moveTowards` 결정론 검증(§3.5), ③ 득점/승리 판정식(§4) 경계값(예: `score=10→11`) 검증, ④ §8 정적 검사(외부 의존성 0건), ⑤ 서브 각도가 `SERVE_ANGLE_RANGE` 범위 내인지 대량 반복 검증(정확한 값이 아닌 범위 검증, §10.1).

---

## 13. 산출물 위치 및 참조 표 / 남은 모호함

### 13.1 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/planning/pong-BF-910.md`(본 문서, File Ownership 원문 명시) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-games/pong/index.html`, `styles.css`, `logic.js`, `main.js` — 미정, 본 문서 §3~§7이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/pong-*.test.js` — 미정, 본 문서 §9~§10이 검증 기준 |
| 참조한 기존 선례 | `docs/planning/tetris-BF-833.md`(신규 규칙 SSOT 작성 형식, 상태 전이표 패턴) · `docs/planning/dice-4-BF-897.md`(라우트 디렉터리 컨벤션 실측 근거, §0 가정 1) |

### 13.2 남은 모호함 (운영자 확인 권장)

1. **Jira 코멘트 미등록**: §0 가정 7 — 본 세션에 Jira 조회/댓글 도구가 연결되어 있지 않아 산출물 위치·AC 요약을 Jira에 직접 등록하지 못했다. 도구 연결 후 보완이 필요하다.
2. **승리 점수(`WIN_SCORE=11`) 확정 여부**: §0 가정 4 — Epic 원문에 정확한 목표 점수가 없어 아케이드 표준값(11점, deuce 없음)으로 확정했다. 운영자가 다른 값(예: 5점, 21점, 2점차 규칙)을 원한다면 본 문서 §3.1·§4.2 개정이 필요하다.
3. **1인용(vs CPU) 확정 여부**: §0 가정 3 — 360px 터치 요구를 근거로 로컬 2인용을 배제했다. 만약 Epic이 실제로 2인 로컬 대전을 의도했다면 입력 모델(§5)·화면 레이아웃(§7) 전면 재설계가 필요하다.
4. **`phase18-games/` 신규 라우트 그룹 명명**: §0 가정 1 — 기존 `phase18-validation/`과 병렬로 `phase18-games/`를 신설하는 것으로 확정했다. 이 컨테이너 디렉터리 이름 자체가 운영자 의도와 다르면(예: 기존 컨테이너 재사용 등) 경로 조정이 필요하다.
5. **온스크린 방향 버튼 포함 여부**: §11, §5.3 — 캔버스 전체 드래그만으로 충분하다고 판단했으나, 운영자가 명시적 ▲/▼ 버튼 UI를 요구하면 §7.1 레이아웃 개정이 필요하다.

---

*문서 종료 — [박기획] · BF-911*
