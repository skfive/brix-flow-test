# 지렁이게임 배수 아이템 이팩트 시각 디자인 명세 — BF-536

> 작성자: [이디자인] · 작성일 2026-05-14  
> 관련 티켓: BF-536 (이팩트 디자인), BF-534 (planner 명세), BF-533 (배수 아이템 구현)  
> 기반 모듈: `snake/` (game.js / logic.js / styles.css)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세 — 배수별 이팩트](#5-컴포넌트-명세--배수별-이팩트)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑 표](#8-ac-매핑-표)

---

## 1. 시안 개요

### 변경 범위
플레이어(또는 CPU)가 배수 먹이를 수집하는 순간, 해당 먹이 위치에서 **파티클 이팩트**를 폭발적으로 출력한다.  
이팩트는 먹이 배수(1×/2×/4×/8×)에 따라 **강도·파티클 수·duration·색상**이 단계적으로 차별화된다.

### 사용자 경험 목표
| 목표 | 설명 |
|------|------|
| 즉각적 보상 피드백 | 먹이 수집 0ms 이내에 시각 반응 → 게임감 강화 |
| 배수 가치 인지 | 1×는 소박, 8×는 MEGA 연출로 희귀도·가치 직관적 전달 |
| 게임 흐름 방해 최소화 | 이팩트 지속 시간은 최장 840ms — 게임 흐름 차단 없음 |
| 몰입감 유지 | 다크 배경 팔레트와 어울리는 형광·네온 계열 컬러 사용 |

---

## 2. 컬러 팔레트

### 2-1. 게임 기존 컬러 (참조용, 변경 금지)

| 토큰명 | HEX | 용도 |
|--------|-----|------|
| `--bg-primary` | `#0d0d0d` | 게임 배경 |
| `--grid-line` | `rgba(255,255,255,0.04)` | 격자 선 |
| `--player-body` | `#4cff80` | 플레이어 지렁이 몸통 |
| `--player-head` | `#00cc44` | 플레이어 지렁이 헤드 |
| `--cpu-body` | `#ff6b4c` | CPU 지렁이 몸통 |
| `--cpu-head` | `#cc2200` | CPU 지렁이 헤드 |

### 2-2. 배수 아이템 기본 컬러 (logic.js `MULTIPLIER_COLORS` 기준)

| 배수 | 주색 (`fill`) | 광채 (`glow`) |
|------|-------------|-------------|
| 1× | `#ffcc00` | `rgba(255,200,0,0.3)` |
| 2× | `#00cfff` | `rgba(0,200,255,0.4)` |
| 4× | `#cc44ff` | `rgba(180,60,255,0.5)` |
| 8× | `#ff4444` | `rgba(255,50,50,0.6)` |

### 2-3. 이팩트 전용 컬러 토큰

| 토큰명 | HEX | 용도 |
|--------|-----|------|
| `--fx-1x-primary` | `#ffcc00` | 1× 파티클 주색 |
| `--fx-1x-light` | `#fff3a0` | 1× 파티클 밝은 변형 |
| `--fx-2x-primary` | `#00cfff` | 2× 파티클 주색 |
| `--fx-2x-light` | `#80e8ff` | 2× 파티클 밝은 변형 |
| `--fx-4x-primary` | `#cc44ff` | 4× 파티클 주색 |
| `--fx-4x-mid` | `#e080ff` | 4× 중간 밝기 |
| `--fx-4x-light` | `#ffaaff` | 4× 밝은 변형 |
| `--fx-8x-primary` | `#ff4444` | 8× 파티클 주색 |
| `--fx-8x-orange` | `#ff8800` | 8× 불꽃 중간색 |
| `--fx-8x-gold` | `#ffcc00` | 8× 불꽃 끝색 |
| `--fx-flash-4x` | `rgba(180,60,255,0.15)` | 4× 스크린 플래시 |
| `--fx-flash-8x` | `rgba(255,68,68,0.25)` | 8× 스크린 플래시 |
| `--fx-core-white` | `#ffffff` | 공통 폭발 중심 |

---

## 3. 타이포그래피

이팩트 레이어에는 별도 텍스트 요소가 없음.  
(점수 변화는 기존 HUD에서 처리 — `#hud-player-score`, `#hud-cpu-score`)

점수 팝업 텍스트 (선택적 확장):
| 요소 | font-family | size | weight | color |
|------|-------------|------|--------|-------|
| 점수 팝업 (예: "+80") | `'Courier New', monospace` | `14px` | `bold` | 배수 주색 |

---

## 4. 레이아웃

### 4-1. 이팩트 레이어 구조

```
┌─────────────────────────────────────────┐
│  z-20  gameover-overlay / paused-overlay │
│  z-15  #effect-layer  ← 이팩트 파티클     │
│  z-10  #hud / #multiplier-stats / legend  │
│  z-0   <canvas> (게임 요소 전체)           │
└─────────────────────────────────────────┘
```

### 4-2. `#effect-layer` CSS

```css
#effect-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  overflow: hidden;
}
```

### 4-3. 파티클 좌표 기준점

| 항목 | 값 |
|------|----|
| 이팩트 원점 | `(food.x * CELL + CELL/2)` px, `(food.y * CELL + CELL/2)` px |
| CELL 크기 | `20px` (logic.js 상수) |
| 좌표계 | 뷰포트 기준 `position: fixed` |

### 4-4. breakpoint 별 동작

| 환경 | 동작 |
|------|------|
| 모든 해상도 | 풀스크린 캔버스 — `vw/vh` 기반이므로 고정 픽셀 이팩트 그대로 동작 |
| 모바일 (< 600px) | 동일. 파티클 travel distance 는 px 단위 고정 → 셀 크기 대비 상대 거리 유지 |

---

## 5. 컴포넌트 명세 — 배수별 이팩트

> **공통 원칙**
> - 이팩트는 `#effect-layer` 내부에 JS로 생성 후 `animationend`시 자동 제거
> - 플레이어·CPU 양쪽 수집 모두 동일 이팩트 트리거
> - 모든 파티클: `position: absolute`, 이팩트 원점 기준

---

### 5-1. 1× 이팩트 — "골든 스파클" (Sparkle)

**배경**: 등장 확률 55% — 과도한 연출은 피로감 유발. 경쾌하고 간결하게.

| 항목 | 값 |
|------|----|
| 파티클 수 | **6개** |
| 파티클 형태 | 원(circle) — `border-radius: 50%` |
| 파티클 크기 | `6×6 px` |
| 컬러 분포 | 홀수 인덱스: `#ffcc00`, 짝수: `#fff3a0` |
| 배치 패턴 | 방사형 6방향, 60° 간격 |
| Travel distance | `28px` (균일) |
| Duration | **380ms** |
| Easing | `cubic-bezier(0.2, 0.6, 0.4, 1)` |
| Opacity | `1 → 0` (전 구간 선형 페이드) |
| Scale | `1 → 0.4` |
| 회전 | 없음 |
| 중심 플래시 | `#ffcc00` 원 `8px`, `0 → 16px`, `opacity 1→0`, `120ms` |
| 스크린 플래시 | **없음** |
| 화면 흔들림 | **없음** |
| z-index | 15 |

**CSS 애니메이션 키프레임 (참고):**
```css
@keyframes fx-sparkle-particle {
  0%   { transform: translate(0,0) scale(1);   opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0.4); opacity: 0; }
}
@keyframes fx-sparkle-center {
  0%   { width: 8px; height: 8px; opacity: 1; }
  100% { width: 16px; height: 16px; opacity: 0; }
}
```

---

### 5-2. 2× 이팩트 — "사이언 다이아몬드" (Pop)

**배경**: 등장 확률 28% — 플레이어가 인지할 만큼 눈에 띄어야 함. 세련된 팝.

| 항목 | 값 |
|------|----|
| 파티클 수 | **8개** |
| 파티클 형태 | 정사각형 45° 회전 (다이아몬드) — `transform: rotate(45deg)` |
| 파티클 크기 | `7×7 px` |
| 컬러 분포 | 4개: `#00cfff`, 4개: `#80e8ff` (교대) |
| 배치 패턴 | 방사형 8방향, 45° 간격 |
| Travel distance | `44px` (균일) |
| Duration | **480ms** |
| Easing | `cubic-bezier(0.1, 0.7, 0.3, 1)` |
| Opacity | `1 → 0` (80ms 지점에서 시작 페이드) |
| Scale | `1 → 0` |
| 파티클 자체 회전 | 각 파티클 +60° 회전 (animation 통해) |
| 중심 플래시 | `#ffffff` 원 `10px`, `0 → 20px`, `opacity 1→0`, `150ms` |
| 스크린 플래시 | **없음** |
| 화면 흔들림 | **없음** |
| z-index | 15 |

**CSS 애니메이션 키프레임 (참고):**
```css
@keyframes fx-pop-particle {
  0%   { transform: translate(0,0) rotate(45deg) scale(1); opacity: 1; }
  15%  { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(105deg) scale(0); opacity: 0; }
}
```

---

### 5-3. 4× 이팩트 — "퍼플 버스트" (Burst)

**배경**: 등장 확률 13% — 드문 발생. 흥분감 고조. 링 확장 + 스크린 플래시.

| 항목 | 값 |
|------|----|
| 파티클 수 | **16개** (내부 링 6 + 외부 링 6 + 위성 원 4) |
| 파티클 형태 | 내·외부 링: 5각 별 CSS clip-path / 위성: 원 |
| 파티클 크기 | 별: `10×10 px` / 원: `8×8 px` |
| 컬러 분포 | 내부 링: `#cc44ff`, 외부 링: `#e080ff`, 위성: `#ffaaff` |
| 배치 패턴 | 내부 링 — 60° 간격, travel `30px` / 외부 링 — 30° 오프셋, travel `62px` / 위성 — 90° 간격, travel `42px` |
| Duration | **620ms** (외부 링 파티클 50ms 딜레이) |
| Easing | `cubic-bezier(0.05, 0.7, 0.25, 1)` |
| Opacity | `1 → 0` (200ms 지연 후 페이드 시작) |
| Scale | `1.2 → 0` (시작 시 살짝 크게) |
| 중심 링 확장 | `border: 2px solid #cc44ff`, 반지름 `0 → 44px`, `opacity 1→0`, `350ms` |
| 스크린 플래시 | `rgba(180,60,255,0.15)` 전체 오버레이, **60ms** 후 `opacity 0` |
| 화면 흔들림 | **없음** |
| z-index | 15 |

**별 모양 clip-path:**
```css
clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
```

**CSS 애니메이션 키프레임 (참고):**
```css
@keyframes fx-burst-inner {
  0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
  30%  { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
@keyframes fx-burst-ring {
  0%   { width: 0; height: 0; opacity: 1; }
  100% { width: 88px; height: 88px; opacity: 0; }
}
@keyframes fx-screen-flash {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
```

---

### 5-4. 8× 이팩트 — "메가 블라스트" (Mega Blast)

**배경**: 등장 확률 4% — 극히 드문 최고 티어. EXTREME 연출로 기억에 남아야 함.

| 항목 | 값 |
|------|----|
| 파티클 수 | **24개** (내부 8 + 외부 8 + 드리프트 4 + 쇼크웨이브 링 2 + 스파크 4) |
| 파티클 형태 | 내부: 불꽃 물방울(`border-radius: 80% 20% 80% 20%`) / 외부: 원 / 드리프트: 별 / 스파크: 직선 |
| 파티클 크기 | 불꽃: `10×14 px` / 원: `8×8 px` / 별: `12×12 px` / 스파크: `2×16 px` |
| 컬러 분포 | 내부 불꽃: `#ff4444`→`#ff8800` 그라데이션 / 외부 원: `#ff8800` / 드리프트 별: `#ffcc00` / 스파크: `#ffffff` |
| 배치 패턴 | 내부 8방향 45°간격 travel `52px` / 외부 8방향 22.5°오프셋 travel `96px` / 드리프트 4개 위쪽 방향 travel `80px` / 스파크 4방향 travel `36px` |
| Duration | **840ms** (드리프트 파티클 별도 `1100ms`) |
| Easing | 주 파티클: `cubic-bezier(0, 0.9, 0.2, 1)` / 드리프트: `linear` |
| Opacity | 주: `1 → 0` (300ms 후 페이드) / 드리프트: `1 → 0` (500ms 지점부터 페이드) |
| Scale | 주: `1.5 → 0` / 드리프트: `1 → 0.3` |
| 쇼크웨이브 링 1 | `border: 2px solid #ff4444`, 반지름 `0 → 60px`, `opacity 1→0`, `400ms` |
| 쇼크웨이브 링 2 | `border: 2px solid rgba(255,136,0,0.6)`, 반지름 `0 → 90px`, `opacity 1→0`, `600ms` (100ms 딜레이) |
| 스크린 플래시 | `rgba(255,68,68,0.25)` 전체 오버레이, **100ms** 후 `opacity 0` |
| 화면 흔들림 | `±4px`, **200ms**, 4회 진동 (`transform: translate` keyframe) |
| z-index | 15 |

**화면 흔들림 keyframe:**
```css
@keyframes fx-screen-shake {
  0%,100% { transform: translate(0,0); }
  20%     { transform: translate(-4px, 2px); }
  40%     { transform: translate(4px, -2px); }
  60%     { transform: translate(-3px, 3px); }
  80%     { transform: translate(3px, -3px); }
}
```

> ⚠️ 화면 흔들림 구현 시 `#effect-layer` 가 아닌 `document.body` 또는 `#game-canvas` wrapper에 적용.  
> canvas 자체를 흔들면 좌표 계산 오류가 없도록 주의.

---

### 5-5. 배수별 이팩트 요약 표

| 배수 | 파티클 수 | Duration | 주색 | 스크린 플래시 | 화면 흔들림 | 강도 |
|------|---------|----------|------|------------|-----------|------|
| 1× | 6 | 380ms | `#ffcc00` | ✗ | ✗ | LOW |
| 2× | 8 | 480ms | `#00cfff` | ✗ | ✗ | MEDIUM |
| 4× | 16 | 620ms | `#cc44ff` | 60ms / `rgba(180,60,255,0.15)` | ✗ | HIGH |
| 8× | 24 | 840ms | `#ff4444` | 100ms / `rgba(255,68,68,0.25)` | ±4px / 200ms | EXTREME |

---

## 6. dev 구현 가이드

### 6-1. HTML 구조 추가

`snake/index.html` — `<canvas>` 바로 뒤에 삽입:

```html
<!-- 이팩트 레이어 — BF-536 -->
<div id="effect-layer" aria-hidden="true"></div>
```

### 6-2. CSS 추가 (`snake/styles.css` 말미에 append)

```css
/* ─── 이팩트 레이어 — BF-536 ─────────────────────────── */
#effect-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  overflow: hidden;
}

:root {
  --fx-1x-primary: #ffcc00;
  --fx-1x-light:   #fff3a0;
  --fx-2x-primary: #00cfff;
  --fx-2x-light:   #80e8ff;
  --fx-4x-primary: #cc44ff;
  --fx-4x-mid:     #e080ff;
  --fx-4x-light:   #ffaaff;
  --fx-8x-primary: #ff4444;
  --fx-8x-orange:  #ff8800;
  --fx-8x-gold:    #ffcc00;
  --fx-core-white: #ffffff;
}
```

### 6-3. JS 이팩트 함수 (`snake/game.js` 에 추가)

```js
// ─────────────────────────────────────────────────────────────
// 이팩트 렌더링 — BF-536
// ─────────────────────────────────────────────────────────────
const effectLayer = document.getElementById("effect-layer");

/**
 * 파티클 이팩트 트리거
 * @param {number} cx  이팩트 원점 X (px, 뷰포트 기준)
 * @param {number} cy  이팩트 원점 Y (px, 뷰포트 기준)
 * @param {1|2|4|8} multiplier
 */
function triggerEffect(cx, cy, multiplier) {
  // 명세 §5 참고해 각 배수별 분기
  switch (multiplier) {
    case 1: triggerSparkle(cx, cy); break;
    case 2: triggerPop(cx, cy);     break;
    case 4: triggerBurst(cx, cy);   break;
    case 8: triggerMegaBlast(cx, cy); break;
  }
}
```

### 6-4. 이팩트 트리거 호출 시점

`game.js` 의 `loop()` 함수 내부, `state = tickFull(state)` 직후:

```js
// 명세 §5: 먹이 수집 감지 → 이팩트 트리거
if (prevState.food !== null && state.food !== prevState.food) {
  // food 변경 = 수집 발생
  const { x, y, multiplier } = prevState.food;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  triggerEffect(cx, cy, multiplier);
}
```

> `prevState` 를 저장해 두거나, `tick` 내부에서 `ateFood` 결과를 반환하는 방식으로 구현.

### 6-5. 파티클 생성 공통 헬퍼

```js
function createParticle({ cx, cy, color, size, tx, ty, duration, easing, shape = "circle", delay = 0 }) {
  const el = document.createElement("div");
  el.style.cssText = `
    position: absolute;
    left: ${cx - size / 2}px;
    top:  ${cy - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    border-radius: ${shape === "circle" ? "50%" : shape === "diamond" ? "0" : "50%"};
    --tx: ${tx}px; --ty: ${ty}px;
    animation: fx-particle ${duration}ms ${easing} ${delay}ms forwards;
    pointer-events: none;
  `;
  if (shape === "diamond") el.style.transform = "rotate(45deg)";
  if (shape === "star") el.style.clipPath = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
  effectLayer.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
  return el;
}
```

### 6-6. 스크린 플래시 헬퍼

```js
function triggerScreenFlash(color, durationMs) {
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed; inset: 0;
    background: ${color};
    pointer-events: none;
    z-index: 16;
    animation: fx-screen-flash ${durationMs}ms ease-out forwards;
  `;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}
```

### 6-7. 화면 흔들림 (8× 전용)

```js
function triggerScreenShake() {
  document.body.style.animation = "fx-screen-shake 200ms ease-in-out";
  setTimeout(() => { document.body.style.animation = ""; }, 200);
}
```

### 6-8. CSS 변수명 컨벤션

| 패턴 | 의미 |
|------|------|
| `--fx-{배수}x-primary` | 해당 배수의 주 파티클 색상 |
| `--fx-{배수}x-light` | 밝은 변형 색상 |
| `--fx-flash-{배수}x` | 스크린 플래시 오버레이 색 |
| `--fx-core-white` | 폭발 중심 공통 흰색 |

### 6-9. 클래스명 컨벤션

| 클래스명 | 역할 |
|----------|------|
| `.fx-particle` | 파티클 공통 클래스 |
| `.fx-ring` | 링 확장 애니메이션 요소 |
| `.fx-flash` | 스크린 플래시 요소 |
| `.fx-1x`, `.fx-2x`, `.fx-4x`, `.fx-8x` | 배수별 파티클 구분 클래스 |

---

## 7. mockup 참조

시각 mockup 파일: **`docs/design/mockups/snake-effects-BF-536.html`**

- 4개 버튼으로 각 배수 이팩트 직접 트리거 가능
- 다크 게임 배경 + 격자 재현
- `file://` 오픈 시 외부 의존성 0건으로 완전 동작

---

## 8. AC 매핑 표

| AC 항목 | 조건 | 디자인 결정 |
|---------|------|-----------|
| **AC-1** Given planner 명세의 배수 아이템 N종 / When 디자인 작업 / Then 각 종류별 이팩트의 컬러·파티클 수·duration·easing 이 표로 정의된 명세 markdown 이 존재한다 | 4종 (1×/2×/4×/8×) 전부 | §5-5 요약 표에 파티클 수·duration·주색·easing 4항목 모두 명시. 각 §5-1~5-4 에서 세부 정의 |
| **AC-2** Given 디자인 토큰 정합성 / When mockup HTML 작성 / Then file:// 로 열어도 모든 이팩트가 자체 재현되고 (외부 의존성 0건), 각 이팩트 트리거 버튼이 있다 | mockup 완전 자립성 | mockup은 인라인 CSS + 순수 JS — CDN/외부 폰트 미사용. 4개 트리거 버튼 명시 |
| **AC-3** Given AC 매핑 의무 / When self-critique / Then 명세 끝에 본 Epic 수용 기준 4항목 → 디자인 결정 매핑 표가 있다 | 매핑 표 존재 | 본 §8 표 (현재 섹션) |
| **AC-4** (암묵적) z-index 계층 정의 | 이팩트가 HUD 아래, 게임 오버 위에 위치해야 함 | §4-1 z-index 계층도: 이팩트 레이어 `z-15`, HUD `z-10`, 오버레이 `z-20` |
