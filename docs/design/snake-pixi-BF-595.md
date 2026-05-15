# pixi.js 기반 지렁이게임 화면 시안 — BF-595

> 작성자: [이디자인] · 작성일 2026-05-15  
> 관련 티켓: BF-597 (designer task), BF-595 (부모 epic), BF-596 (planner 명세)  
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)  
> 의존 명세: `docs/spec/snake-pixi-BF-595.md` (planner 아키텍처·매핑 명세)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트 (pixi 변환 포함)](#2-컬러-팔레트-pixi-변환-포함)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 캔버스·격자·씬 구조](#4-레이아웃--캔버스격자씬-구조)
5. [컴포넌트 명세](#5-컴포넌트-명세)
   - 5-1. 배경 / 격자 (Background Layer)
   - 5-2. 플레이어 지렁이 (Player Snake Container)
   - 5-3. CPU 지렁이 (CPU Snake Container)
   - 5-4. 먹이 (Food Node)
   - 5-5. 아이템 (Item Node)
   - 5-6. DOM HUD 오버레이 (불변)
   - 5-7. 게임오버 / 일시정지 오버레이 (불변)
6. [pixi.js 색상 변환 규약](#6-pixijs-색상-변환-규약)
7. [안티앨리어싱 차이 허용 범위](#7-안티앨리어싱-차이-허용-범위)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [mockup 참조](#9-mockup-참조)
10. [Self-critique · AC 매핑 표](#10-self-critique--ac-매핑-표)

---

## 1. 시안 개요

### 1-1. 변경 범위

pixi.js(WebGL 기반 retained-mode scene graph)로 렌더 계층을 교체했을 때 **게임 화면이 어떻게 보여야 하는지** 를 정의한다.

- **캔버스 레이아웃**: 기존 `<canvas id="game-canvas">` (100vw × 100vh) 그대로 유지. pixi `Application`이 이 요소에 WebGL context를 획득.
- **색상·디자인 토큰**: 기존 Canvas2D 렌더가 사용하던 모든 색상을 pixi `Graphics.fill({ color })` 형식으로 1:1 변환.
- **게임 요소 스타일**: 배경·격자·플레이어·CPU·먹이·아이템의 pixi 렌더 기준 시각 규격 정의.
- **DOM HUD·오버레이**: 캔버스 위 DOM 레이어(점수·상태·게임오버·일시정지·설정)는 **변경 없음** — 시각 동등성 보장.

### 1-2. 사용자 경험 목표

| 목표 | 설명 |
|------|------|
| 시각 연속성 | pixi 전환 후 사용자가 렌더 엔진 교체를 인지하지 못해야 한다 |
| 색상 충실도 | WebGL 렌더 시 hex 색상이 Canvas2D 대비 육안으로 동등해야 한다 |
| 기존 UX 보존 | 격자 밀도·지렁이 크기·먹이 글로우·아이템 아이콘 등 기존 시각 언어 100% 유지 |
| 부드러운 렌더 | pixi retained scene graph로 매 프레임 clear 비용 절감 → 동등 이상 FPS |

---

## 2. 컬러 팔레트 (pixi 변환 포함)

### 2-1. 배경·격자

| 토큰명 | Canvas2D 값 | pixi 변환값 | 용도 |
|--------|-------------|-------------|------|
| `--bg-primary` | `#0d0d0d` | `0x0d0d0d` | 게임 배경 전체 fill |
| `--grid-line` | `rgba(255,255,255,0.04)` | `{ color: 0xffffff, alpha: 0.04 }` | 격자 라인 (20px 간격) |

### 2-2. 플레이어 지렁이

| 토큰명 | Canvas2D 값 | pixi 변환값 | 용도 |
|--------|-------------|-------------|------|
| `--player-head` | `#00cc44` | `0x00cc44` | 머리 세그먼트 fill |
| `--player-body` | `rgba(60,210,100,α)` | `{ color: 0x3cd264, alpha }` | 몸통 세그먼트 fill, α = `0.85 - (i/len) * 0.4` |
| `--player-eye` | `#ffffff` | `0xffffff` | 눈 사각형 (4px × 4px) |
| `--player-head-border` | `rgba(255,255,255,0.5)` | `{ color: 0xffffff, alpha: 0.5 }` | 머리 테두리 stroke |
| `--player-shield-glow` | `rgba(68,136,255,α)` | `{ color: 0x4488ff, alpha }` | SHIELD 활성 시 pulse stroke, α = `0.4 + 0.3 * |sin(t/750)|` |
| `--player-burst-fill` | `rgba(255,255,255,0.90)` | `{ color: 0xffffff, alpha: 0.9 }` | LENGTH_BURST 깜빡임 fill (blinkOn 시) |

### 2-3. CPU 지렁이

| 토큰명 | Canvas2D 값 | pixi 변환값 | 용도 |
|--------|-------------|-------------|------|
| `--cpu-head` | `#cc2200` | `0xcc2200` | CPU 머리 세그먼트 fill |
| `--cpu-body` | `rgba(210,60,60,α)` | `{ color: 0xd23c3c, alpha }` | CPU 몸통 세그먼트 fill, 동일 α 공식 |
| `--cpu-head-border` | `rgba(255,255,255,0.5)` | `{ color: 0xffffff, alpha: 0.5 }` | CPU 머리 테두리 stroke |

### 2-4. 먹이 (MULTIPLIER_COLORS)

| 배수 | fill 색 | pixi fill | glow 색 | pixi glow | 가중치 |
|------|---------|-----------|---------|-----------|--------|
| 1× | `#ffcc00` | `0xffcc00` | `rgba(255,200,0,0.3)` | `{ color: 0xffc800, alpha: 0.3 }` | 55% |
| 2× | `#00cfff` | `0x00cfff` | `rgba(0,200,255,0.4)` | `{ color: 0x00c8ff, alpha: 0.4 }` | 28% |
| 4× | `#cc44ff` | `0xcc44ff` | `rgba(180,60,255,0.5)` | `{ color: 0xb43cff, alpha: 0.5 }` | 13% |
| 8× | `#ff4444` | `0xff4444` | `rgba(255,50,50,0.6)` | `{ color: 0xff3232, alpha: 0.6 }` | 4% |

- 먹이 원의 중심에 `${multiplier}×` 텍스트를 흰색 굵은 폰트로 표시 (11px bold Courier New, 원 중앙 정렬)

### 2-5. 아이템 (ITEM_COLORS)

| 아이템 타입 | primary 색 | pixi primary | glow 색 | pixi glow |
|-------------|-----------|--------------|---------|-----------|
| SPEED_UP | `#ffaa00` | `0xffaa00` | `rgba(255,170,0,0.40)` | `{ color: 0xffaa00, alpha: 0.40 }` |
| SLOW_DOWN | `#00ddcc` | `0x00ddcc` | `rgba(0,221,204,0.40)` | `{ color: 0x00ddcc, alpha: 0.40 }` |
| LENGTH_BURST | `#ff6600` | `0xff6600` | `rgba(255,102,0,0.45)` | `{ color: 0xff6600, alpha: 0.45 }` |
| SHIELD | `#4488ff` | `0x4488ff` | `rgba(68,136,255,0.45)` | `{ color: 0x4488ff, alpha: 0.45 }` |
| REVERSE | `#22ffaa` | `0x22ffaa` | `rgba(34,255,170,0.40)` | `{ color: 0x22ffaa, alpha: 0.40 }` |

---

## 3. 타이포그래피

### 3-1. DOM HUD 오버레이 (변경 없음)

| 요소 | font-family | size | weight | color |
|------|-------------|------|--------|-------|
| 점수 (PLAYER/CPU) | `'Courier New', Courier, monospace` | 22px | bold | `#4cff80` / `#ff6b4c` |
| 최고 점수 (Best:) | 동일 | 13px | normal | `#aaa` |
| HUD 상태 라벨 (길이/속도) | 동일 | 11px | normal | `rgba(255,255,255,0.50)` |
| HUD 상태 값 | 동일 | 14px | normal | `#e0e0e0` |
| 일시정지 타이틀 | 동일 | — | bold | — |
| 게임오버 결과 | 동일 | h2 | bold | — |

### 3-2. 캔버스 내 텍스트 (pixi `Text` 또는 `Graphics`)

| 요소 | font | size | color | 위치 |
|------|------|------|-------|------|
| 먹이 배수 레이블 `${m}×` | bold 'Courier New' | `CELL * 0.55 = 11px` | `#ffffff` | 먹이 원 중앙 |
| 아이템 아이콘 | Graphics 도형 (텍스트 아님) | CELL 내 | item primary 색 | 아이템 원 중앙 |

> 캔버스 내 텍스트 렌더는 pixi `PIXI.Text` 객체 사용 권장 (Canvas2D `ctx.fillText` 동등).  
> 폰트 크기는 `CELL` 기준 동일 공식 적용.

---

## 4. 레이아웃 — 캔버스·격자·씬 구조

### 4-1. 캔버스 크기 규약

```
canvas.width  = window.innerWidth   (풀스크린, 100vw)
canvas.height = window.innerHeight  (풀스크린, 100vh)
cols = Math.floor(canvas.width  / CELL)   // CELL = 20
rows = Math.floor(canvas.height / CELL)
```

- CSS: `#game-canvas { display: block; width: 100vw; height: 100vh; }` 유지
- pixi `Application({ width: canvas.width, height: canvas.height, view: canvasEl })`
- resize 시 pixi `renderer.resize(w, h)` + 격자 `Graphics` 재생성

### 4-2. 격자 구조 (CELL = 20px)

```
격자 라인 간격: 20px
수직선: x = 0, 20, 40, ... , cols*20  (총 cols+1개)
수평선: y = 0, 20, 40, ... , rows*20  (총 rows+1개)
라인 색: rgba(255,255,255,0.04) → pixi lineStyle(1, 0xffffff, 0.04)
```

- 배경 및 격자는 **정적 Graphics** — 초기화 시 1회 생성, resize 때만 재생성
- 매 프레임 clear/redraw 금지 (성능 핵심)

### 4-3. pixi.js Scene Graph Z-Order

```
stage (PIXI.Application.stage)
  ├── [0] backgroundContainer    ← Graphics: 배경 rect + 격자 라인  (정적)
  ├── [1] foodContainer          ← Graphics/Container: 먹이 원 + 글로우 + 텍스트
  ├── [2] itemContainer          ← Container: 아이템 원 + 아이콘 + 만료 페이드
  ├── [3] extraCpuContainer      ← Container: extraCpu 지렁이들 (0~5마리)
  ├── [4] cpuContainer           ← Container: CPU 지렁이
  └── [5] playerContainer        ← Container: 플레이어 지렁이 (최상위)

DOM 오버레이 (canvas 위, z-index 기반)
  ├── #effect-layer              ← 파티클 이펙트 (불변)
  ├── #hud                       ← 점수 HUD (불변)
  ├── #hud-status-panel          ← 길이·속도 패널 (불변)
  ├── #item-slot-hud             ← 아이템 슬롯 (불변)
  ├── #buff-bar                  ← 버프 바 (불변)
  ├── #gameover-overlay          ← 게임오버 모달 (불변)
  ├── #paused-overlay            ← 일시정지 모달 (불변)
  └── #settings-modal            ← 설정 모달 (불변)
```

> 기존 Canvas2D의 `drawBackground → drawFood → drawItem → drawSnake → drawCpuSnake → drawExtraCpus` 순서를 z-order로 그대로 매핑.

### 4-4. 세그먼트 좌표 규약

```
픽셀 좌표: px = cell.x * CELL,  py = cell.y * CELL
세그먼트 실제 rect: (px+1, py+1, CELL-2, CELL-2) with borderRadius 4
// 1px inset으로 격자 라인과 세그먼트 간 미세 틈 생성 → 개별 세그먼트 인식
```

---

## 5. 컴포넌트 명세

### 5-1. 배경 / 격자 (Background Layer)

| 속성 | 값 |
|------|----|
| 배경 rect | `(0, 0, canvas.width, canvas.height)` fill `#0d0d0d` |
| 격자 라인 | lineStyle(1, 0xffffff, 0.04) — 수직·수평 각 (cols+1)+(rows+1)개 |
| 생성 시점 | `SnakeRenderer.init()` 1회 + `resize()` 시 재생성 |
| 매 프레임 동작 | **없음** (정적 Graphics — `backgroundContainer` 고정) |

### 5-2. 플레이어 지렁이 (Player Snake Container)

| 상태 | 시각 |
|------|------|
| **기본 몸통** | 각 세그먼트: `roundRect(px+1, py+1, 18, 18, radius=4)` fill `rgba(60,210,100, 0.85 - (i/len)*0.4)` |
| **머리 (i=0)** | fill `#00cc44` + 흰 테두리 stroke(1px, rgba 0.5) |
| **머리 눈** | 흰 사각형 4×4px × 2개, 방향에 따라 위치 변경 |
| **SHIELD 활성** | 머리 세그먼트에 파란 stroke, lineWidth=3, alpha=`0.4+0.3*|sin(t/750)|` |
| **LENGTH_BURST** | blinkOn 시 모든 세그먼트 fill `rgba(255,255,255,0.9)` |
| **머리 눈 위치 (방향별)** | RIGHT: e1(px+14, py+4), e2(px+14, py+12) / LEFT: e1(px+3, py+4), e2(px+3, py+12) / UP: e1(px+4, py+3), e2(px+16, py+3) / DOWN: e1(px+4, py+14), e2(px+16, py+14) |

> `playerContainer` 내부: 매 프레임 `renderFrame(state)` 시 세그먼트 Graphics를 clear 후 재draw 또는 풀링 방식 선택 — dev 결정. 시각 결과는 동일.

**Props (renderFrame 입력)**:

```ts
interface PlayerRenderData {
  snake: Array<{ x: number; y: number }>;  // snake[0] = 머리
  dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  shieldActive: boolean;
  lengthBurstActive: boolean;
}
```

### 5-3. CPU 지렁이 (CPU Snake Container)

| 속성 | 값 |
|------|----|
| 머리 (i=0) | fill `#cc2200` + 흰 테두리 동일 |
| 몸통 | fill `rgba(210,60,60, 0.85 - (i/len)*0.4)` |
| 눈 | 플레이어와 동일 4×4px × 2개 방향별 위치 |
| extraCpuContainer | extraCpus 배열 각 항목을 동일 방식으로 렌더 |
| 빈 배열 | 컨테이너를 비움 (visible=false or removeChildren) |

**Props**:

```ts
interface CpuRenderData {
  cpu: Array<{ x: number; y: number }>;
  cpuDir: string;
  extraCpus: Array<{ snake: Array<{x:number;y:number}>; dir: string }>;
}
```

### 5-4. 먹이 (Food Node)

| 속성 | 값 |
|------|----|
| 반지름 | `CELL/2 - 3 = 7px` |
| 중심 | `(food.x * CELL + CELL/2, food.y * CELL + CELL/2)` |
| fill | 방사형 그라데이션: center `#ffffff` → 0.4 정지점 `fillColor` → 1.0 정지점 `fillColor` |
| glow ring | stroke r+2=9px, lineWidth=2, 색 = glowColor, alpha = glow.alpha |
| 배수 텍스트 | `${multiplier}×` 흰색 bold 11px Courier New, 원 중앙 정렬 |
| null 상태 | `foodContainer` visible=false 또는 노드 제거 |

> pixi 방사형 그라데이션: `PIXI.Graphics.fill( new PIXI.FillGradient(...) )` 또는 `PIXI.RenderTexture` 방식. 단순 구현은 center 70% `#fff` + outer 30% fillColor 원 두 개 겹침으로 대체 가능 (시각 동등 허용 범위 §7 참조).

### 5-5. 아이템 (Item Node)

| 속성 | 값 |
|------|----|
| 원 반지름 | 8px |
| 중심 | `(item.x * CELL + CELL/2, item.y * CELL + CELL/2)` |
| fill | `itemColors[item.type].primary` |
| glow stroke | `itemColors[item.type].glow` (lineWidth=2) |
| 아이콘 | Graphics로 타입별 도형 (기존 `drawItemIcon` 도형 좌표 동일) |
| 만료 페이드 | `itemContainer.alpha = 남은 시간 비율` (기존 `ctx.globalAlpha` 동등) |
| null 상태 | `itemContainer` visible=false |

**아이템 아이콘 도형 요약**:

| 타입 | 아이콘 형태 | 색 |
|------|------------|-----|
| SPEED_UP | 오른쪽 화살표 ▶ (삼각형) | `#ffaa00` |
| SLOW_DOWN | 원 테두리 (선만) | `#00ddcc` |
| LENGTH_BURST | 별 ★ (5각 폴리곤 근사) | `#ff6600` |
| SHIELD | 육각형 방패 (헥사곤) | `#4488ff` |
| REVERSE | 반시계 화살표 ↺ | `#22ffaa` |

> 기존 `drawItemIcon(ctx, cx, cy, type)` 함수의 Graphics 경로 좌표를 pixi `Graphics` API로 1:1 이식. 좌표 기준점 동일(cx, cy = 셀 중심).

### 5-6. DOM HUD 오버레이 (불변)

캔버스 위에 고정(`position: fixed`)되어 pixi 렌더와 무관하게 기존 그대로 동작.

| 요소 | id | 위치 | 변경 여부 |
|------|----|------|-----------|
| 점수 HUD | `#hud` | 우측 상단 (top: 52px, right: 20px) | **불변** |
| 상태 패널 | `#hud-status-panel` | 우측 | **불변** |
| 아이템 슬롯 | `#item-slot-hud` | DOM 고정 | **불변** |
| 버프 바 | `#buff-bar` | DOM | **불변** |
| 배수 통계 | `#multiplier-stats` | 좌측 상단 | **불변** |
| 범례 | `#competition-legend` | 좌하단 | **불변** |
| 효과음 토글 | `#sound-toggle` | DOM | **불변** |
| 이펙트 레이어 | `#effect-layer` | 캔버스 위 DOM | **불변** |

### 5-7. 게임오버 / 일시정지 오버레이 (불변)

| 요소 | id | 변경 여부 |
|------|----|-----------|
| 게임오버 | `#gameover-overlay` | **불변** |
| 일시정지 | `#paused-overlay` | **불변** |
| 설정 모달 | `#settings-modal` | **불변** |

---

## 6. pixi.js 색상 변환 규약

### 6-1. hex 문자열 → pixi 0x 리터럴

```js
// "#rrggbb" → 0xRRGGBB (hex 그대로)
"#00cc44"  →  0x00cc44
"#ffcc00"  →  0xffcc00
```

### 6-2. rgba 문자열 → pixi { color, alpha } 분리

```js
// "rgba(60,210,100,α)"  →  { color: 0x3cd264, alpha: α }
// r=60=0x3c, g=210=0xd2, b=100=0x64  →  0x3cd264

// 주의: 동적 α 는 매 프레임 PIXI DisplayObject.alpha 로 적용
```

### 6-3. 알파 그라데이션 공식

```js
// 세그먼트 i (0=머리, len-1=꼬리)
const alpha = (i === 0) ? 1.0 : Math.max(0.45, 0.85 - (i / snake.length) * 0.4);
```

### 6-4. SHIELD pulse alpha 공식

```js
const glowAlpha = 0.4 + 0.3 * Math.abs(Math.sin(performance.now() / 750));
// pixi Graphics stroke alpha = glowAlpha (매 프레임 갱신)
```

### 6-5. pixi 색상 적용 API (v8 기준)

```js
// fill
graphics.fill({ color: 0x00cc44 });
graphics.fill({ color: 0x3cd264, alpha: 0.65 });

// stroke
graphics.stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
graphics.stroke({ color: 0x4488ff, alpha: glowAlpha, width: 3 });
```

---

## 7. 안티앨리어싱 차이 허용 범위

| 항목 | 허용 여부 | 기준 |
|------|-----------|------|
| 세그먼트 가장자리 미세 흐림 (WebGL MSAA) | ✅ 허용 | 셀 위치·색 계열 동등이면 충분 |
| 색상 ±5% 밝기 차이 | ✅ 허용 | sRGB 감마 차이 허용 |
| 픽셀 단위 완전 일치 | ❌ 요구 안 함 | |
| 먹이 방사형 그라데이션 단순화 | ✅ 허용 | 흰 중심 + 색상 외곽 시각 인상 동등이면 |
| 지렁이 눈 1~2px 위치 오차 | ✅ 허용 | 눈이 머리 안에 있고 방향이 올바르면 |
| 색 계열 완전 다름 (예: 초록 → 파란) | ❌ 불허 | 토큰 표 §2 기준 준수 |
| 게임 요소 누락 (지렁이 미표시 등) | ❌ 불허 | |

---

## 8. dev 구현 가이드

### 8-1. 색상 변환 체크리스트

- [ ] `#0d0d0d` → `0x0d0d0d` (배경)
- [ ] `rgba(255,255,255,0.04)` → `{ color: 0xffffff, alpha: 0.04 }` (격자)
- [ ] `#00cc44` → `0x00cc44` (플레이어 헤드)
- [ ] `rgba(60,210,100,α)` → `{ color: 0x3cd264, alpha }` (플레이어 몸통)
- [ ] `#cc2200` → `0xcc2200` (CPU 헤드)
- [ ] `rgba(210,60,60,α)` → `{ color: 0xd23c3c, alpha }` (CPU 몸통)
- [ ] 배수별 `MULTIPLIER_COLORS` 표 §2-4 참조
- [ ] 아이템별 `ITEM_COLORS` 표 §2-5 참조

### 8-2. 씬 구조 구현 순서 (planner §3-4 S-단계 대응)

```
S2: backgroundContainer 초기화
    → Graphics: fillRect(0,0,w,h, 0x0d0d0d)
    → Graphics: 격자 라인 (cols+1 + rows+1개)
    → resize 시만 재생성

S3-a: foodContainer
    → renderFrame 시 state.food 기준 원 + 글로우 + 텍스트 갱신

S3-b: itemContainer
    → state.item 기준 원 + 아이콘 + alpha 페이드

S3-c: cpuContainer / extraCpuContainer
    → state.cpu / state.extraCpus 기준 세그먼트 Graphics

S3-d: playerContainer
    → state.snake / state.dir 기준 세그먼트 Graphics + 눈 + 특수 효과
```

### 8-3. CSS 변수명 권장 (기존 styles.css 준수)

기존 CSS 파일은 변경하지 않는다. pixi 렌더는 JS 상수로 색상을 관리:

```js
// game.js 상단 pixi 색상 상수
const PX_BG          = 0x0d0d0d;
const PX_GRID        = { color: 0xffffff, alpha: 0.04 };
const PX_PLAYER_HEAD = 0x00cc44;
const PX_PLAYER_BODY = 0x3cd264;   // rgba(60,210,100,α)의 rgb 부분
const PX_CPU_HEAD    = 0xcc2200;
const PX_CPU_BODY    = 0xd23c3c;   // rgba(210,60,60,α)의 rgb 부분
const PX_EYE         = 0xffffff;
const PX_SHIELD      = 0x4488ff;
```

### 8-4. 주의사항

1. **pixi ticker 비활성**: `new PIXI.Application({ autoStart: false })` + `app.ticker.stop()` 필수. RAF `loop(ts)` 만이 렌더를 구동.
2. **배경 재생성 금지**: `backgroundContainer` 는 init 시 1회만 생성. `resize()` 콜백에서만 재생성.
3. **`fetch()` 금지**: pixi 로딩은 `snake/vendor/pixi.min.js` 상대경로 `<script>` 로만. `game.js` 내 `fetch(` 없어야 함 (정적 가드).
4. **`#game-canvas` 유지**: pixi `Application({ view: document.querySelector('#game-canvas') })`. 요소 교체/삭제 금지.
5. **아이템 만료 페이드**: `itemContainer.alpha` 를 매 프레임 갱신 (기존 `ctx.globalAlpha` 동등).
6. **먹이 null 처리**: `state.food === null` 시 `foodContainer.visible = false`.
7. **extraCpus 0개**: `extraCpuContainer.removeChildren()` 또는 `visible = false`.

---

## 9. mockup 참조

시각 mockup (시안 시뮬레이션 전용):

```
docs/design/mockups/snake-pixi-BF-597.html
```

mockup은 pixi.js 실제 렌더가 아닌 HTML/CSS로 시각 인상을 재현한 단일 파일이다.  
dev는 mockup을 **참조 가이드**로 사용하되 픽셀 단위 일치 의무 없음.

---

## 10. Self-critique · AC 매핑 표

### AC 매핑

| AC | 본 명세 충족 여부 | 충족 섹션 |
|----|-----------------|-----------|
| AC1: pixi.js 렌더링 기준 게임 화면 시안 작성, 캔버스 레이아웃·색상·게임 요소 스타일 정의 | ✅ | §4(캔버스·씬), §2(컬러), §5(컴포넌트) |
| AC1: `docs/design/snake-pixi-BF-595.md` + mockup HTML 생성 | ✅ | 본 파일 + §9 mockup 참조 |
| AC2: 기존 게임플레이 UX와의 일관성 명시적 반영 | ✅ | §1-2, §5-6, §5-7, §7 |

### Self-critique 점검 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| AC 매핑 완전성 | ✅ | 2개 AC 모두 매핑 완료 |
| dev 구현 가이드 | ✅ | §8에 색상 변환 체크리스트·씬 구조 구현 순서·CSS 변수명·주의사항 포함 |
| 기존 요소 보존 | ✅ | DOM HUD·오버레이 모두 "불변" 명시 (§5-6, §5-7) |
| 컴포넌트 매핑 | ✅ | Canvas2D draw* 6함수 → pixi 컨테이너 1:1 매핑 (§5, §4-3) |
| 모호함 flag | ⚠️ | 먹이 방사형 그라데이션: pixi v8 FillGradient API vs. 2-원 레이어 대안 모두 허용으로 명시 (§5-4, §7) — dev 선택 |
