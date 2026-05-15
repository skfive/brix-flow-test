# 지렁이게임 pixi.js 마이그레이션 명세 — BF-595

> 작성자: [박기획] · 작성일 2026-05-15
> 관련 티켓: BF-596 (planner 작업), BF-595 (부모 스토리)
> 기반 모듈: `snake/` (game.js / logic.js / index.html / styles.css)
> 의존 명세: `docs/spec/snake-game-settings-BF-579.md`, `docs/spec/snake-items-BF-538.md`, `docs/spec/snake-sound-toggle-BF-563.md`
> 산출물 경로 근거: AC 가 `docs/spec/snake-pixi-BF-595.md` 를 명시 → 부모 스토리 키(BF-595) 기준 파일명 유지. 후속 designer/dev 가 동일 위치에서 참조.

---

## 목차

1. [개요](#1-개요)
2. [현행 아키텍처 분석](#2-현행-아키텍처-분석)
3. [마이그레이션 전략](#3-마이그레이션-전략)
4. [게임 로직·렌더 매핑](#4-게임-로직렌더-매핑)
5. [pixi.js 도입·로딩 정책 (file:// 제약)](#5-pixijs-도입로딩-정책-file-제약)
6. [입력·상태·루프 흐름 보존 규약](#6-입력상태루프-흐름-보존-규약)
7. [KPI 측정 항목](#7-kpi-측정-항목)
8. [롤백 절차](#8-롤백-절차)
9. [사용자 시나리오 (Given/When/Then)](#9-사용자-시나리오-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [디자이너 위임 시각 요소](#11-디자이너-위임-시각-요소)
12. [Epic 수용 기준 검증 체크리스트](#12-epic-수용-기준-검증-체크리스트)
13. [Acceptance Criteria 매핑](#13-acceptance-criteria-매핑)
14. [부록 A. 다른 페르소나가 알아야 할 핵심 결정](#부록-a-다른-페르소나가-알아야-할-핵심-결정)

---

## 1. 개요

### 1-1. 도입 목적

현재 지렁이게임은 Canvas 2D Context(`canvas.getContext("2d")`) 로 매 프레임 즉시 모드(immediate-mode) 렌더링을 수행한다. 격자·지렁이·CPU·먹이·아이템을 매 프레임 `ctx.fillRect` / `ctx.roundRect` / `ctx.arc` 로 다시 그린다. 본 명세는 **렌더 계층만** pixi.js(WebGL 기반 retained-mode scene graph)로 교체하는 마이그레이션 전략을 정의한다.

핵심 원칙: **게임 로직·상태·입력·DOM HUD·효과음·DOM 파티클 이펙트는 변경하지 않는다.** 사용자 체감 동작·기존 테스트 결과는 0 변화여야 한다(Epic 수용 기준 §12-2).

### 1-2. 적용 범위

| 항목 | 변경 여부 | 비고 |
|------|-----------|------|
| Canvas 2D 렌더 함수 (`drawBackground/drawSnake/drawCpuSnake/drawExtraCpus/drawFood/drawItem`) | **변경** | pixi.js scene graph 로 교체 |
| 게임 로직 (`logic.js` + index.html 인라인 IIFE) | **불변** | 단위 테스트 호환 절대 보장 |
| 입력 핸들러 (`keydown` / 방향 전환 / pause / Z 키) | **불변** | §6 |
| 게임 루프 (`loop(ts)` / `startLoop()` / RAF + tick accumulator) | **구조 불변, 호출부만 교체** | §6-3 |
| DOM HUD (`updateHUD/updateHUDStatus/updateBuffBar/...`) | **불변** | canvas 밖 DOM |
| DOM 파티클·토스트·화면흔들림 이펙트 (`document.createElement` 기반) | **불변** | canvas 밖 DOM 오버레이 |
| 효과음 (Web Audio) | **불변** | |
| `<canvas id="game-canvas">` DOM 요소 | **유지** | pixi 가 이 캔버스에 렌더 (§3-3) |

### 1-3. 비범위 (Out of Scope)

- 게임 규칙·난이도·아이템·CPU AI 로직 변경 — 본 마이그레이션은 시각 출력 방식만 교체
- 신규 그래픽 에셋(스프라이트 텍스처) 도입 — 1차 마이그레이션은 기존 도형(사각형·원) 을 pixi `Graphics` 로 1:1 재현. 스프라이트화는 별도 스토리
- DOM 기반 파티클 이펙트의 pixi 이전 — 별도 스토리(시각 영향 없으므로 후순위)
- 번들러/npm 빌드 파이프라인 도입 — `file://` 제약 유지(§5)

---

## 2. 현행 아키텍처 분석

### 2-1. 파일·역할 맵

| 파일 | 라인 | 역할 | 마이그레이션 영향 |
|------|------|------|-------------------|
| `snake/logic.js` | ~1593 | 순수 게임 로직 (DOM 무관). ES module `export`. `node:test` 단위 테스트가 직접 `import` | **불변** |
| `snake/index.html` | ~1240 | `<canvas id="game-canvas">` + 인라인 IIFE(logic.js 미러 복사본 → `globalThis` 주입) + `<script src="./game.js">` | canvas 유지, pixi `<script>` 추가 |
| `snake/game.js` | ~2673 | `globalThis` 에서 로직 구조분해 + Canvas 2D 렌더 + 입력 + 루프 + DOM HUD | 렌더 함수만 교체 |
| `snake/styles.css` | ~1432 | HUD·모달·이펙트 CSS | **불변** |

### 2-2. 이중 소스 로직 구조 (중요)

```
logic.js (ESM export)  ──import──►  tests/snake-*.test.js (node:test 단위 테스트)
       │
       │ (수기 미러 — 동일 알고리즘 복제)
       ▼
index.html 인라인 IIFE  ──Object.assign(globalThis, {...})──►  game.js (구조분해 참조)
```

- `logic.js` 와 index.html 인라인 IIFE 는 **같은 로직의 두 복사본**이다. (`file://` 에서 ESM CORS 차단 회피 — BF-522)
- 단위 테스트는 `logic.js` 만 검증, 런타임은 IIFE 복사본만 사용.
- **마이그레이션 시사점**: 렌더만 교체하면 두 로직 소스 모두 손대지 않으므로 단위 테스트 26개 중 logic 계열은 무영향.

### 2-3. 현행 렌더 파이프라인 (`game.js`)

```
loop(ts)  [RAF]
  ├─ elapsed accumulator → movePlayer / moveCpu 판정
  ├─ (timeout 검사 / 아이템 스폰 타이머)
  ├─ state = tickWithItems(state, nowMs, movePlayer, moveCpu)   ← 로직 (불변)
  ├─ tickExtraCpus()                                            ← 로직 (불변)
  ├─ (먹이/아이템 획득 감지 → DOM 이펙트·효과음)                ← 불변
  └─ render()
        ├─ drawBackground()   ctx.fillRect + 격자 stroke
        ├─ drawFood()         ctx.arc + glow
        ├─ drawItem()         ctx.arc + drawItemIcon(ctx,...)
        ├─ drawSnake()        ctx.roundRect ×N + 눈 + shield glow
        ├─ drawCpuSnake()     ctx.roundRect ×N
        ├─ drawExtraCpus()    ctx.roundRect ×N
        ├─ updateHUD*()       DOM 텍스트 갱신 (canvas 무관, 불변)
        └─ updateBuffBar/ItemSlotHUD (DOM, 불변)
```

`render()` 의 `draw*` 6개 함수만이 Canvas 2D 의존이다. `updateHUD*` 계열은 DOM 조작이므로 마이그레이션 무관.

### 2-4. 정적 가드 / e2e 테스트 제약 (마이그레이션 위험 지점)

| 테스트 부류 | 검증 방식 | 마이그레이션 제약 |
|-------------|-----------|-------------------|
| logic 단위 (`snake-BF572.test.js` 등) | `logic.js` 함수 `import` 후 호출 | logic.js 불변 → 무영향 |
| 정적 소스 가드 (`snake-BF586-e2e.test.js` 등) | `readFileSync(game.js)` 후 문자열/정규식 매칭 | 아래 함수명·패턴 **반드시 보존** |
| Puppeteer e2e (`snake-BF516-e2e.test.js`, `snake-BF520-file-e2e.test.js`) | 실제 브라우저: `#game-canvas` 셀렉트, `canvas.width === window.innerWidth` | 캔버스 요소·크기 규약 보존 |
| focused scope / `BRIX_E2E_SKIP=1` 가드 | snake 모듈 아니면 skip | 본 작업은 snake 모듈 → 정상 실행 |

**보존 필수 정적 가드 대상 (game.js 내 존재해야 하는 식별자/패턴):**

- `function render(` / `function loop(` / `function startLoop(` (루프 구조)
- `function initGame(` / `function doRestart(` (BF-590-e2e §2)
- `function openSettingsModal` / `function closeSettingsModal` / `function saveSettingsModal` / `function reflectDraftToControls` (BF-586-e2e)
- `!gameJs.includes("fetch(")` — **네트워크 호출 금지** (pixi 를 CDN fetch 로 로드하면 위반 → §5 vendored 로딩 필수)
- `index.html` 내 `id="game-canvas"` 문자열 (≥9개 테스트가 존재 단언)

> dev 는 마이그레이션 후 `node --test tests/snake-*.test.js` 전체 green 을 종료 조건으로 한다(§12-1).

---

## 3. 마이그레이션 전략

### 3-1. 전략 요약: "렌더 어댑터 교체 (Strangler)"

게임 로직·루프·입력은 그대로 두고, `render()` 가 호출하는 `draw*` 6개 함수의 **내부 구현만** Canvas 2D → pixi.js 로 치환한다. 함수 시그니처·호출 위치·호출 순서는 유지하여 정적 가드와 루프 구조를 보존한다.

### 3-2. 렌더 추상화 경계

dev 는 `game.js` 내에 **렌더러 모듈 경계**를 둔다(파일 분리 또는 IIFE 내 네임스페이스). 인터페이스(개념적):

```
SnakeRenderer = {
  init(canvasEl, cols, rows)   // pixi.Application 생성, canvasEl 을 view 로 사용
  resize(width, height)        // window resize 시 호출
  renderFrame(state)           // 매 프레임 — state 스냅샷으로 scene graph 갱신
  destroy()                    // 롤백/언마운트 시 pixi 자원 해제
}
```

- `render()` 는 내부적으로 `SnakeRenderer.renderFrame(state)` 1회 호출 + 기존 `updateHUD*()` DOM 호출 유지.
- 이렇게 하면 §8 롤백 시 `SnakeRenderer` 구현체만 Canvas2D 버전으로 되돌리면 됨.

### 3-3. 캔버스 요소 재사용 정책

기존 `<canvas id="game-canvas">` 요소를 **삭제하지 않고** pixi `Application({ view: canvasEl })` 로 그대로 사용한다.

| 항목 | 정책 |
|------|------|
| canvas DOM | 기존 `#game-canvas` 그대로 (테스트 가드 §2-4) |
| 렌더 컨텍스트 | pixi 가 WebGL context 획득. WebGL 미지원 환경 → §10 EC-1 폴백 |
| 캔버스 크기 | 기존 규약 유지: `canvas.width = window.innerWidth`, `canvas.height = window.innerHeight` (Puppeteer 가드 호환) |
| 좌표계 | 기존 그대로 — 셀 `(x,y)` → 픽셀 `(x*CELL, y*CELL)`, `CELL=20` |
| z-order | pixi stage 컨테이너 순서로 기존 그리기 순서(배경→먹이→아이템→player→cpu→extraCpu) 재현 |

### 3-4. 단계적 적용 (dev 권장 순서)

1. **S1 — 인프라**: vendored pixi.js `<script>` 추가(§5), `SnakeRenderer.init/destroy` 골격, 기존 Canvas2D 경로는 feature flag 뒤에 보존
2. **S2 — 정적 요소**: `drawBackground`(격자) pixi `Graphics` 이전
3. **S3 — 엔티티**: `drawSnake/drawCpuSnake/drawExtraCpus/drawFood/drawItem` 이전
4. **S4 — 검증**: 전체 테스트 green + 시각 회귀 확인 + KPI 계측 삽입(§7)
5. **S5 — 정리**: feature flag 기본값을 pixi 로, Canvas2D 경로는 롤백용으로 §8 정책에 따라 유지

> 각 단계는 독립 PR 가능. 단계마다 `node --test tests/snake-*.test.js` green 유지가 종료 조건.

### 3-5. Feature Flag (롤백 안전장치)

| 항목 | 값 |
|------|----|
| 플래그 위치 | game.js 상단 상수 `const RENDER_BACKEND = "pixi";` (`"pixi"` \| `"canvas2d"`) |
| 런타임 오버라이드 | `localStorage["bf-snake-render-backend"]` 존재 시 우선 (운영자 디버그/롤백용) |
| 기본값 | S5 완료 후 `"pixi"`, 그 전까지 `"canvas2d"` |
| 폴백 | pixi 초기화 실패(WebGL 불가 등) → 자동 `"canvas2d"` + KPI `render.fallback` 기록(§7) |

---

## 4. 게임 로직·렌더 매핑

### 4-1. Canvas 2D → pixi.js 1:1 매핑 표

| 현행 (Canvas 2D) | pixi.js 대응 | 비고 |
|------------------|--------------|------|
| `drawBackground()`: `ctx.fillRect` 배경 + 격자 `stroke` | `Graphics` 1개 (배경 rect) + `Graphics` 격자 라인. **정적이므로 1회 생성 후 캐시**, resize 시만 재생성 | 매 프레임 격자 재생성 금지 (성능) |
| `drawFood()`: `ctx.arc` + glow + 배수 색 | `Graphics`(원) 또는 `Container`(원+glow). 색상은 기존 `MULTIPLIER_COLORS` 그대로 | 배수별 색/글로우 동일 |
| `drawItem()` + `drawItemIcon()` | `Container`(원 배경 + 아이콘 `Graphics`). 만료 페이드(`globalAlpha`) → pixi `alpha` | 아이콘 도형 좌표 동일 |
| `drawSnake()`: `roundRect` ×N + 머리 테두리 + 눈 + shield glow | player `Container`. 세그먼트별 `Graphics` 또는 pool 재사용. 알파 그라데이션 동일 공식 | LENGTH_BURST 깜박임·SHIELD pulse 는 `performance.now()` 기반 동일 공식 |
| `drawCpuSnake()` / `drawExtraCpus()` | CPU `Container` ×(1+extra). 색상 `#cc2200` 등 동일 | 빈 배열이면 컨테이너 비움 |
| `ctx.globalAlpha` | pixi `DisplayObject.alpha` | |
| `ctx.fillStyle` 색 문자열 | pixi `Graphics.fill({ color })` (hex → 0xRRGGBB 변환) | rgba → `{color, alpha}` 분리 |
| 매 프레임 전체 clear+redraw | pixi retained scene graph: 변경 필드만 갱신 권장(성능). 단순 구현은 매 프레임 `clear()`+재draw 도 허용(정확성 우선) | §7 FPS KPI 로 성능 확인 |

### 4-2. 상태 → 렌더 데이터 흐름 (불변 보장)

```
state (logic.js / IIFE 산출)  ── 읽기 전용 ──►  SnakeRenderer.renderFrame(state)
```

- 렌더러는 `state` 를 **읽기만** 한다. `state.snake`, `state.cpu`, `state.extraCpus`, `state.food`, `state.item`, `state.shieldActive`, `state.lengthBurstActive`, `state.cols/rows`, `state.dir` 등.
- 렌더러는 `state` 를 수정하지 않는다 → 로직·테스트와 결합도 0.
- 좌표 변환 공식 불변: `px = cell.x * CELL`, `py = cell.y * CELL`, `CELL = 20`.

### 4-3. 시각 동등성 기준 (회귀 판정)

dev/tester 는 다음을 "사용자 영향 0" 판정 기준으로 사용한다.

| 시각 요소 | 동등성 기준 |
|-----------|-------------|
| 격자 | 셀 크기 20px, 라인 색 `rgba(255,255,255,0.04)` 동일 |
| player 지렁이 | 머리 `#00cc44`, 몸통 알파 그라데이션 공식 `0.85 - (i/len)*0.4` 동일, 눈 위치 방향별 동일 |
| CPU 지렁이 | 머리 `#cc2200`, 몸통 `rgba(210,60,60,α)` 동일 |
| 먹이 | 배수별 `MULTIPLIER_COLORS` 색/글로우 동일 |
| 아이템 | 아이콘 도형·만료 페이드 동일 |
| 이펙트(파티클·토스트·흔들림) | DOM 기반 — **변경 없음**(동일 그대로) |
| 효과음 | **변경 없음** |
| 프레임 타이밍 | tick 간격(`TICK_MS`)·속도효과 배율 동일 (루프 불변) |

> 픽셀 단위 완전 일치는 요구하지 않는다(WebGL 안티앨리어싱 차이 허용). "셀 위치·색 계열·동작 타이밍·UI 레이아웃" 동등이 기준.

---

## 5. pixi.js 도입·로딩 정책 (file:// 제약)

### 5-1. 제약 배경

- 본 SPA 는 번들러·npm 런타임 의존 없음. `package.json` 에 빌드 스크립트 없음.
- BF-522 결정: `file://` 프로토콜에서 ES module / dynamic import / `fetch` CORS 차단 → 인라인 IIFE + 일반 `<script>` 로만 동작.
- 정적 가드: `!gameJs.includes("fetch(")` — 네트워크 로딩 금지.

### 5-2. 로딩 정책 (MUST)

| 항목 | 정책 |
|------|------|
| 배포 형태 | pixi.js **UMD/IIFE 빌드를 리포지토리에 vendoring** — 예: `snake/vendor/pixi.min.js` |
| 로드 방식 | `index.html` 에 일반 `<script src="./vendor/pixi.min.js"></script>` (game.js `<script>` 보다 앞) — `type="module"` 금지 |
| 전역 노출 | pixi UMD 는 `window.PIXI` 전역 제공 → game.js 가 `globalThis.PIXI` 로 참조 (기존 logic 주입 패턴과 일관) |
| CDN | **금지** (fetch/네트워크 가드 + 오프라인 `file://` 동작 요구) |
| 버전 고정 | vendored 파일은 버전 주석 포함(예: `// pixi.js vX.Y.Z`). 업그레이드는 별도 스토리 |
| 라이선스 | pixi.js MIT — vendored 파일 상단 라이선스 주석 보존 |

> dev 는 pixi 버전 선택 시 "UMD 빌드 제공 + WebGL/canvas 폴백 지원" 을 확인한다. 구체 버전은 dev 가 결정하되 본 명세 §5-2 정책 위반 금지.

### 5-3. 로드 실패 처리

- `window.PIXI` 미정의(스크립트 로드 실패) → game.js 가 자동으로 `RENDER_BACKEND="canvas2d"` 폴백(§3-5) + `console.warn("[BF-595] pixi 로드 실패 — canvas2d 폴백")` + KPI `render.fallback` 기록.
- 즉, **pixi 로드 실패 시에도 게임은 기존 Canvas2D 로 정상 동작**(사용자 영향 0 보장).

---

## 6. 입력·상태·루프 흐름 보존 규약

### 6-1. 입력 흐름 (불변)

| 입력 | 핸들러 | 마이그레이션 |
|------|--------|--------------|
| 방향키/WASD | `window.addEventListener("keydown")` → `changeDirection(state, dir)` | **불변** — 렌더러는 입력 미관여 |
| Space (시작/재개) | keydown 분기 | **불변** |
| Esc (pause 토글) | `togglePause()` | **불변** |
| `S` (설정 모달) | `openSettingsModal` | **불변** |
| `Z` (아이템 사용) | `useHeldItem(state)` | **불변** |
| 마우스 클릭 (설정/재시작 버튼) | DOM 버튼 이벤트 | **불변** — DOM 밖 HUD |

pixi 의 자체 인터랙션(`eventMode`/`interactive`) 은 **사용하지 않는다**. 입력은 전적으로 기존 DOM/window 리스너 유지 → 입력 정적 가드·e2e 흐름 보존.

### 6-2. 상태 흐름 (불변)

- `state` 생성·전이는 전부 `createInitialState / tickWithItems / tickFull / restartGame / changeDirection / useHeldItem` (logic) 가 담당.
- 렌더러는 `state` 의 소비자(consumer)일 뿐. 상태 머신(`playing/paused/gameover`) 무관.
- pause 시 기존 동작 유지: `togglePause()` 가 `render()` 1회 호출하여 현재 프레임 고정 → pixi `renderFrame(state)` 도 동일하게 정지 화면 유지(pixi ticker 자동 루프 **사용 금지**, 기존 RAF `loop` 가 단일 구동원).

### 6-3. 루프 흐름 (구조 불변, 호출부 1줄 교체)

```
loop(ts)  ── 기존 그대로 ──
   ...
   render();                          // ← 내부만 변경
        SnakeRenderer.renderFrame(state)  // pixi 갱신
        updateHUD(); updateHUDStatus(); ...  // DOM (불변)
```

- pixi `Application` 의 내장 `ticker` 는 **비활성화**(`autoStart:false`, `ticker.stop()`). 렌더 구동은 오직 기존 `requestAnimationFrame(loop)`.
- 이유: 이중 루프 시 tick accumulator·속도효과·timeout 계산과 desync → 게임 동작 변동(사용자 영향 발생). 단일 구동원 유지가 "사용자 영향 0" 의 핵심.
- `function render(` / `function loop(` / `function startLoop(` 식별자 보존(정적 가드 §2-4).

---

## 7. KPI 측정 항목

### 7-1. 측정 목적

마이그레이션이 "사용자 영향 0 + 성능 비열화" 임을 **코드로 계측**하여 운영자가 정량 판단(Epic 수용 기준 §12-4).

### 7-2. KPI 이벤트 정의

| 이벤트 키 | 트리거 | 페이로드 |
|-----------|--------|---------|
| `render.backend` | 게임 시작(첫 `initGame`) | `{ backend: "pixi"\|"canvas2d", pixiVersion: string\|null }` |
| `render.fallback` | pixi 초기화 실패 → canvas2d 폴백 | `{ reason: "no_pixi"\|"no_webgl"\|"init_error", errorMsg }` |
| `render.fps` | 게임 종료 시 1회 집계 | `{ backend, avgFps, minFps, p95FrameMs, sampleCount }` |
| `render.longFrame` | 단일 프레임 > 50ms 발생 시(샘플링, 게임당 최대 N회) | `{ backend, frameMs, snakeLen, cpuCount }` |
| `render.initMs` | 렌더러 init 소요 | `{ backend, initMs }` |

### 7-3. 측정 방식

- 프레임 시간: `loop(ts)` 의 `elapsed` 를 이용(별도 계측 코드 최소화). avg/min/p95 는 ring buffer(최근 N=300 프레임) 로 집계.
- 게임 종료(`showGameOver` 또는 timeout 분기) 시 `render.fps` 1줄 console 출력 + localStorage 기록.

| 저장 키 | 내용 |
|---------|------|
| `bf-snake-render-kpi` | 최근 N개 세션 ring buffer (JSON array). 기존 `bf-snake-*-kpi` 컨벤션 일치 |
| console | `console.log("[BF-595 KPI] backend=pixi avgFps=58.7 p95FrameMs=18.2 ...")` (기존 `[BF-560 KPI]` 패턴 따름) |

### 7-4. 비교 분석 기준 (운영자용)

| 질문 | 사용 KPI |
|------|---------|
| pixi 전환 후 평균 FPS 가 canvas2d 대비 저하되지 않았는가 | `render.fps.avgFps` (backend 별 비교, 기준: pixi ≥ canvas2d × 0.9) |
| 저사양/WebGL 미지원 환경 폴백 비율 | `render.fallback` 발생률 |
| 긴 프레임(끊김) 빈도 변화 | `render.longFrame` 빈도 (backend 별) |
| 초기화 비용 | `render.initMs` 분포 |

> 합격 기준(수치)은 dev/tester 가 측정 후 운영자와 확정. 본 명세는 "무엇을 어떤 키로 측정하는지" 를 고정한다.

---

## 8. 롤백 절차

### 8-1. 롤백 트리거 조건

| 조건 | 판단 주체 |
|------|-----------|
| 마이그레이션 후 snake 테스트 1개 이상 fail | dev (머지 전 차단) |
| `render.fps.avgFps` 가 canvas2d 대비 90% 미만 | tester / 운영자 |
| `render.fallback` 비율 비정상 상승 | 운영자 (배포 후 모니터링) |
| 시각 회귀(§4-3 동등성 위반) 보고 | tester |

### 8-2. 롤백 레벨 (경량 → 중량)

| 레벨 | 절차 | 소요 | 사용 시점 |
|------|------|------|-----------|
| **L1 — 런타임 플래그** | `localStorage["bf-snake-render-backend"]="canvas2d"` 설정(운영자/사용자) | 즉시, 코드 변경 0 | 개별 환경 임시 회피 |
| **L2 — 기본값 플래그** | game.js `RENDER_BACKEND` 기본값을 `"canvas2d"` 로 1줄 변경 후 배포 | 1 커밋 | 전역 일시 롤백 (pixi 코드는 유지) |
| **L3 — 코드 되돌림** | 마이그레이션 PR(들) revert | PR revert | pixi 경로 자체 결함 |

### 8-3. 롤백 가능성 보장 설계 (MUST)

- **Canvas2D 렌더 경로를 S5 까지 삭제하지 않는다.** `SnakeRenderer` 의 canvas2d 구현체를 feature flag 뒤에 유지(§3-5).
- 따라서 L1/L2 는 **코드 revert 없이** 즉시 정상 동작 복구 가능 — 이것이 Epic "롤백 가능" 수용 기준의 핵심.
- L3(revert) 가능성을 위해 마이그레이션은 **단계별 독립 커밋/PR**(§3-4) 로 진행하고, 로직·HUD 파일을 건드리지 않아 revert 충돌 면적을 최소화한다.

### 8-4. 롤백 검증 체크리스트

- [ ] L1 적용 후 새로고침 → `render.backend=canvas2d` KPI 확인, 게임 정상
- [ ] L2 적용(기본값 변경) 후 `node --test tests/snake-*.test.js` 전체 green
- [ ] L3(revert) 후 git tree 가 마이그레이션 이전과 동등 (로직/HUD 무변경이므로 충돌 없음)

---

## 9. 사용자 시나리오 (Given/When/Then)

### 9-1. 정상 — pixi 백엔드로 동작

```
Given 브라우저가 WebGL 을 지원하고 vendored pixi.js 가 정상 로드된다
When 사용자가 /snake 에 진입한다
Then #game-canvas 위에 pixi 가 격자·지렁이·먹이를 렌더한다
 And 화면 출력(색·위치·레이아웃)이 기존 Canvas2D 와 시각적으로 동등하다(§4-3)
 And render.backend KPI 가 backend="pixi" 로 기록된다
```

### 9-2. 게임 진행 동작 동등성

```
Given pixi 백엔드로 게임이 시작되었다
When 사용자가 방향키로 지렁이를 조작하고 먹이를 먹는다
Then 이동 속도·점수·충돌·CPU 동작·아이템 효과가 기존과 동일하다(로직 불변)
 And 먹이 획득 시 기존 DOM 파티클 이펙트·효과음이 그대로 발생한다
 And 게임 종료 시 render.fps KPI 가 기록된다
```

### 9-3. pixi 로드 실패 → 자동 폴백

```
Given vendored pixi.js 파일이 없거나 로드 실패했다 (window.PIXI 미정의)
When 사용자가 /snake 에 진입한다
Then game.js 가 자동으로 canvas2d 백엔드로 폴백한다
 And 게임이 기존과 동일하게 정상 동작한다 (사용자는 차이를 느끼지 못함)
 And render.fallback KPI 가 reason="no_pixi" 로 기록된다
 And console.warn 으로 폴백 사실이 1회 기록된다
```

### 9-4. WebGL 미지원 환경

```
Given 브라우저가 WebGL context 를 제공하지 못한다
When pixi Application 초기화가 실패한다
Then game.js 가 canvas2d 백엔드로 폴백한다
 And render.fallback KPI 가 reason="no_webgl" 로 기록된다
 And 게임은 정상 동작한다
```

### 9-5. 런타임 롤백 (L1)

```
Given pixi 백엔드로 동작 중이다
When 운영자가 localStorage["bf-snake-render-backend"]="canvas2d" 설정 후 새로고침한다
Then 게임이 canvas2d 백엔드로 렌더된다 (코드 변경 0)
 And render.backend KPI 가 backend="canvas2d" 로 기록된다
 And 게임 동작·시각이 정상이다
```

### 9-6. pause 중 화면 고정

```
Given pixi 백엔드로 게임이 playing 상태이다
When 사용자가 Esc 로 일시정지한다
Then 현재 프레임이 고정되어 표시된다 (pixi ticker 미사용 — RAF 단일 구동)
 And 재개 시 지렁이·먹이·점수가 보존된 채 이어진다
```

### 9-7. 테스트 회귀 0

```
Given 마이그레이션이 완료되었다
When `node --test tests/snake-*.test.js` 를 실행한다
Then 26개 snake 테스트가 모두 green 이다 (logic 단위·정적 가드·e2e)
 And game.js 의 보존 필수 식별자(render/loop/initGame/doRestart/openSettingsModal 등)가 존재한다
 And game.js 에 fetch( 호출이 없다 (네트워크 가드)
```

---

## 10. Edge Case 목록

| ID | 케이스 | 동작 |
|----|--------|------|
| EC-1 | WebGL 미지원 / context 손실 | canvas2d 자동 폴백 + `render.fallback` KPI. 게임 정상 |
| EC-2 | vendored pixi 파일 누락/손상 | `window.PIXI` 미정의 감지 → canvas2d 폴백 |
| EC-3 | window resize 중 격자 재생성 | `SnakeRenderer.resize()` 에서 격자 `Graphics` 1회 재생성. 매 프레임 재생성 금지(성능) |
| EC-4 | 격자 크기 변동(`cols/rows` 변경) | resize 시 scene graph 재구성. 좌표 공식(`x*CELL`) 불변 |
| EC-5 | `state.cpu` 빈 배열(솔로 모드) | CPU 컨테이너 비움 (기존 `drawCpuSnake` early-return 동등) |
| EC-6 | `state.extraCpus` 0개 | extraCpu 컨테이너 비움 |
| EC-7 | `state.food === null`(만점) | 먹이 노드 비표시 (기존 `drawFood` null 가드 동등) |
| EC-8 | `state.item === null` | 아이템 노드 비표시 |
| EC-9 | LENGTH_BURST 깜박임 / SHIELD pulse | `performance.now()` 기반 동일 공식으로 pixi `alpha`/색 갱신 — 시각 동등 |
| EC-10 | pixi ticker 가 의도치 않게 auto-start | `autoStart:false` + `ticker.stop()` 강제. 이중 루프 시 게임 속도 변동(사용자 영향) → 금지 |
| EC-11 | pause 상태에서 새 프레임 그려짐 | `loop()` 가 `state.status!=="playing"` 시 return — 기존 동작 유지, 렌더러는 추가 그리기 안 함 |
| EC-12 | pixi 초기화 비동기성 | pixi Application init 이 비동기면, 완료 전 첫 `loop` 가 canvas2d 또는 no-op 로 안전 처리 (깜빡임 1프레임 허용, 게임 로직 무영향) |
| EC-13 | 메모리 누수(세그먼트 노드 무한 생성) | 세그먼트 노드 풀링 또는 매 프레임 `clear()` 후 재구성 — dev 가 `render.longFrame`/메모리로 검증 |
| EC-14 | 파티클 DOM 이펙트와 z-order 충돌 | DOM 이펙트는 canvas 위 별도 레이어 — 기존과 동일(변경 없음). pixi 는 canvas 내부만 담당 |
| EC-15 | `file://` 직접 열람 | vendored `<script>` 상대경로 `./vendor/pixi.min.js` 로 로드 (fetch/CDN 금지) |

---

## 11. 디자이너 위임 시각 요소

본 마이그레이션은 **시각 동등성 유지가 목표**이므로 신규 디자인 결정은 최소다. 다만 다음은 designer 확인 항목:

| 항목 | 명세 |
|------|------|
| 안티앨리어싱 차이 허용 범위 | WebGL 렌더 시 도형 가장자리 미세 차이 — "셀 위치·색 계열 동등"이면 허용(§4-3). 시각 회귀 판정 시 designer 가 기준 확정 |
| 색 변환 정확도 | hex `#rrggbb` → pixi `0xrrggbb`, rgba 알파 분리. 디자이너가 기존 팔레트와 대조 확인 |
| (선택) 향후 스프라이트화 | 본 스토리 비범위. 별도 스토리에서 designer 가 에셋 정의 |

> 본 명세 §4-1 매핑은 "기존 도형 1:1 재현" 이 목표이며 새 비주얼 디자인이 아니다.

---

## 12. Epic 수용 기준 검증 체크리스트

Epic 수용 기준 4항목을 **검증 가능한 체크리스트**로 구체화한다(AC2 충족).

### 12-1. 시나리오 동작 (Epic AC 1)

- [ ] /snake 진입 시 pixi 백엔드로 격자·player·CPU·먹이·아이템이 렌더된다
- [ ] 방향키 조작 → 지렁이 이동·방향 전환이 기존과 동일하다
- [ ] 먹이/배수/아이템 획득·CPU 충돌·timeout 동작이 기존과 동일하다
- [ ] pause/resume/restart 흐름이 기존과 동일하다
- [ ] `node --test tests/snake-*.test.js` 전체(26개) green
- [ ] game.js 내 `render(` `loop(` `startLoop(` `initGame(` `doRestart(` `openSettingsModal` `closeSettingsModal` `saveSettingsModal` `reflectDraftToControls` 식별자 존재
- [ ] `index.html` 에 `id="game-canvas"` 존재, 캔버스 크기 = window 크기

### 12-2. 사용자 영향 0 (Epic AC 2)

- [ ] `logic.js` 무변경 (git diff 0) → logic 단위 테스트 무영향
- [ ] index.html 인라인 IIFE 로직 무변경
- [ ] DOM HUD(`updateHUD*`)·효과음·DOM 파티클 이펙트 무변경
- [ ] §4-3 시각 동등성 표 전 항목 충족(tester 육안/스크린샷 비교)
- [ ] 게임 속도·tick 타이밍 불변 (RAF 단일 구동, pixi ticker 비활성)
- [ ] game.js 에 `fetch(` 없음 (네트워크 가드)

### 12-3. 롤백 가능 (Epic AC 3)

- [ ] feature flag `RENDER_BACKEND` 존재 + `localStorage` 오버라이드 동작 (L1)
- [ ] 기본값 1줄 변경으로 canvas2d 전역 복귀 가능 (L2), 변경 후 테스트 green
- [ ] canvas2d 렌더 경로가 S5 까지 코드에 보존됨 (revert 없이 복구 가능)
- [ ] 마이그레이션이 단계별 독립 커밋/PR — L3 revert 충돌 면적 최소
- [ ] §8-4 롤백 검증 체크리스트 통과

### 12-4. KPI 코드 (Epic AC 4)

- [ ] `render.backend` 이벤트가 게임 시작 시 기록됨
- [ ] `render.fallback` 이벤트가 폴백 시 reason 과 함께 기록됨
- [ ] `render.fps`(avg/min/p95) 가 게임 종료 시 `bf-snake-render-kpi` + console 에 기록됨
- [ ] `render.longFrame` / `render.initMs` 계측 코드 존재
- [ ] console KPI 출력이 `[BF-595 KPI] ...` 형식(기존 패턴 일치)
- [ ] backend 별 FPS 비교가 가능한 페이로드 구조(§7-4)

---

## 13. Acceptance Criteria 매핑

본 명세가 task BF-596 의 AC 를 어떻게 충족하는지 매핑한다.

| AC | 충족 섹션 |
|----|----------|
| **AC1** — 기존 로직·상태·입력 흐름 분석 + 마이그레이션 전략·게임 로직 매핑·KPI·롤백 문서화 (`docs/spec/snake-pixi-BF-595.md`) | §2(현행 분석), §3(전략), §4(로직·렌더 매핑), §6(입력·상태·루프 보존), §7(KPI), §8(롤백) |
| **AC2** — Epic 수용 기준 4항목(시나리오 동작·사용자 영향 0·롤백 가능·KPI 코드)이 검증 가능한 체크리스트로 구체화 | §12-1 ~ §12-4 (체크박스), §9(Given/When/Then), §10(Edge Case) |

추가 산출:
- §5 — `file://`/네트워크 제약 하 pixi 로딩 정책 (dev 가 가장 막히기 쉬운 지점 사전 해소)
- §2-4 — 정적 가드/e2e 테스트 제약 목록 (dev 가 회귀 없이 작업하도록)
- §11 — designer 위임 경계 (역할 분리)

---

## 부록 A. 다른 페르소나가 알아야 할 핵심 결정

| 결정 | 사유 | 영향 페르소나 |
|------|------|--------------|
| **렌더 계층만 교체, 로직·입력·HUD·이펙트·효과음 불변** | "사용자 영향 0" + 단위 테스트 26개 무영향 | dev (draw* 6함수만 교체), tester (시각 동등성만 검증) |
| pixi.js 는 **vendored UMD `<script>`** 로 로드 (CDN/ESM/fetch 금지) | `file://` 제약(BF-522) + 네트워크 가드 `!gameJs.includes("fetch(")` | dev (vendor 파일 추가), reviewer (네트워크 가드 확인) |
| pixi 내장 ticker **비활성**, 기존 RAF `loop` 단일 구동 | 이중 루프 시 게임 속도 desync = 사용자 영향 발생 | dev (`autoStart:false`, `ticker.stop()`) |
| feature flag + canvas2d 경로 **S5 까지 유지** | 코드 revert 없이 즉시 롤백(Epic AC 3 핵심) | dev (플래그 분기 유지), 운영자 (L1/L2 롤백 수단) |
| `#game-canvas` 요소 **삭제 금지**, pixi 가 이 캔버스에 렌더 | ≥9개 테스트가 존재 단언 + Puppeteer e2e 크기 가드 | dev, tester |
| 보존 필수 식별자(render/loop/initGame/doRestart/설정 모달 함수) 시그니처 유지 | 정적 소스 가드 테스트 통과 | dev, reviewer |
| 단계별 독립 커밋/PR (S1~S5) | revert 충돌 면적 최소화 = 롤백 가능성 보장 | dev (PR 분할), reviewer |
| KPI 키 `bf-snake-render-kpi` + console `[BF-595 KPI]` | 기존 KPI 컨벤션(`bf-snake-*-kpi`, `[BF-560 KPI]`) 일치 | dev, 운영자 (분석) |
