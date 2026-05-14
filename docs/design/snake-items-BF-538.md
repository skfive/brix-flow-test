# 지렁이게임 아이템 시각 디자인 명세 — BF-538

> 작성자: [이디자인] · 작성일 2026-05-14  
> 관련 티켓: BF-544 (designer task), BF-538 (부모 스토리), BF-539 (planner 명세)  
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)  
> 의존 명세: `docs/spec/snake-items-BF-538.md` (기획), `docs/design/snake-effects-BF-536.md` (이팩트 레이어)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
   - 5-1. 보드 위 아이템 셀
   - 5-2. 즉시 발동형 버프 상태줄
   - 5-3. 보유 아이템 슬롯 (HUD)
   - 5-4. 사용키 안내 툴팁 / 오버레이
   - 5-5. 토스트 알림
   - 5-6. 발동 이팩트 모션 가이드 (INSTANT)
   - 5-7. 발동 이팩트 모션 가이드 (HOLDABLE)
   - 5-8. LENGTH_BURST 활성 중 뱀 시각
   - 5-9. SHIELD 활성 중 뱀 시각
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [Self-critique · AC 매핑 표](#8-self-critique--ac-매핑-표)

---

## 1. 시안 개요

### 1-1. 변경 범위

기획 명세(BF-539 §11)에서 디자이너 전담으로 위임된 5개 항목:
1. 보드 위 아이템 셀 아이콘 (5종 × 색·형태·SVG path)
2. 즉시 발동형 이팩트 모션 가이드 (SPEED_UP / SLOW_DOWN / LENGTH_BURST)
3. HUD 보유 아이템 인디케이터 (SHIELD / REVERSE) + 사용키 [Z] 안내
4. 토스트 알림 (획득/사용/소멸)
5. 즉시 발동형 버프 상태줄

### 1-2. 사용자 경험 목표

| 목표 | 설명 |
|------|------|
| 아이템 즉각 식별 | 보드 위 아이템 셀이 배수 먹이와 한눈에 구별됨 |
| 효과 상태 인지 | 버프 잔여 시간·만료 임박을 숫자 없이도 시각으로 파악 |
| Z 키 힌트 직관화 | 조작법을 처음 보는 플레이어도 HUD 만으로 [Z] 사용 파악 |
| 기존 연출 톤 유지 | 다크 배경·네온 계열 컬러 통일성 — BF-536 이팩트 팔레트와 조화 |

---

## 2. 컬러 팔레트

### 2-1. 기존 게임 토큰 (참조용, 변경 금지)

| 토큰명 | HEX | 용도 |
|--------|-----|------|
| `--bg-primary` | `#0d0d0d` | 게임 배경 |
| `--player-body` | `#4cff80` | 플레이어 몸통 |
| `--player-head` | `#00cc44` | 플레이어 헤드 |
| `--cpu-body` | `#ff6b4c` | CPU 몸통 |
| `--cpu-head` | `#cc2200` | CPU 헤드 |

### 2-2. 배수 먹이 컬러 (충돌 참조용)

| 배수 | HEX |
|------|-----|
| 1× | `#ffcc00` |
| 2× | `#00cfff` |
| 4× | `#cc44ff` |
| 8× | `#ff4444` |

### 2-3. 아이템 전용 컬러 토큰 (신규 정의)

| 토큰명 | HEX | 용도 | 배수 먹이 대비 차별화 포인트 |
|--------|-----|------|--------------------------|
| `--item-speed-primary` | `#ffaa00` | SPEED_UP 주색 | 1×(#ffcc00) 대비 채도↑ 온도↑ (주황 기조) |
| `--item-speed-glow` | `rgba(255,170,0,0.40)` | SPEED_UP 광채 | — |
| `--item-speed-trail` | `rgba(255,180,50,0.60)` | SPEED_UP 트레일 파티클 | — |
| `--item-slow-primary` | `#00ddcc` | SLOW_DOWN 주색 | 2×(#00cfff) 대비 채도↓ 그린 기조 |
| `--item-slow-glow` | `rgba(0,221,204,0.40)` | SLOW_DOWN 광채 | — |
| `--item-burst-primary` | `#ff6600` | LENGTH_BURST 주색 | 8×(#ff4444) 대비 주황↑, 4×(#cc44ff) 대비 계열 전혀 다름 |
| `--item-burst-glow` | `rgba(255,102,0,0.45)` | LENGTH_BURST 광채 | — |
| `--item-burst-flash` | `#ff9900` | LENGTH_BURST 깜박임 교대색 | — |
| `--item-shield-primary` | `#4488ff` | SHIELD 주색 | 기존 팔레트에 없는 순청색 계열 |
| `--item-shield-glow` | `rgba(68,136,255,0.45)` | SHIELD 광채 및 뱀 글로우 | — |
| `--item-shield-break` | `rgba(68,136,255,0.35)` | 방패 충돌 방어 시 플래시 | — |
| `--item-reverse-primary` | `#22ffaa` | REVERSE 주색 | 플레이어 green(#4cff80) 대비 청록 기조 분리 |
| `--item-reverse-glow` | `rgba(34,255,170,0.40)` | REVERSE 광채 | — |
| `--item-blink-white` | `rgba(255,255,255,0.90)` | LENGTH_BURST 활성 중 뱀 깜박임 교대색 | — |
| `--hud-slot-bg` | `rgba(0,0,0,0.65)` | 아이템 슬롯 배경 | — |
| `--hud-slot-border-empty` | `rgba(255,255,255,0.18)` | 빈 슬롯 점선 테두리 | — |
| `--toast-bg` | `rgba(13,13,13,0.88)` | 토스트 배경 | — |

---

## 3. 타이포그래피

| 요소 | font-family | size | weight | color |
|------|-------------|------|--------|-------|
| 아이템 셀 라벨 (없음 — 아이콘만) | — | — | — | — |
| 버프 상태줄 타이머 | `'Courier New', monospace` | `11px` | `bold` | 아이템 주색 |
| 슬롯 아이콘 텍스트 | `'Courier New', monospace` | `20px` | `normal` | `#ffffff` |
| 슬롯 [Z] 힌트 | `'Courier New', monospace` | `10px` | `bold` | 아이템 주색 (보유 시) / `rgba(255,255,255,0.25)` (빈 슬롯) |
| 슬롯 만료 카운트다운 | `'Courier New', monospace` | `10px` | `normal` | `#aaaaaa` |
| 토스트 텍스트 | `'Courier New', monospace` | `13px` | `bold` | 아이템 주색 |
| 버프 잔여 시간 라벨 | `'Courier New', monospace` | `11px` | `normal` | 아이템 주색 |

---

## 4. 레이아웃

### 4-1. 전체 HUD 레이어 구조

```
z-20  gameover / paused overlay
z-16  스크린 플래시 (fx-flash, BF-536)
z-15  #effect-layer (파티클, BF-536)
z-12  #toast-container           ← 신규 BF-544
z-10  #hud (점수판, 우상단)
z-10  #multiplier-stats (배수통계, 좌상단)
z-10  #buff-bar (버프 상태줄, 우측 중간)   ← 신규 BF-544
z-10  #item-slot-hud (보유 슬롯, 우하단)   ← 신규 BF-544
z-10  #competition-legend (범례, 좌하단)
z-0   <canvas> (게임 그래픽 전체)
```

### 4-2. 우측 HUD 수직 배치 (top→bottom)

```
┌──────────────────────┐  ← top: 16px, right: 20px
│ [이디자인]  200  [CPU 150]  │  ← #hud (기존 점수판)
│ HIGH  350            │
├──────────────────────┤  ← 구분선 없음, margin-top: 10px
│ ⚡ 3.2s ██████░░  │  ← #buff-bar (버프 아이템 상태줄)
│ 🔥 1.1s ██░░░░░░  │    (활성 버프 없으면 숨김)
├──────────────────────┤  ← margin-top: 12px
│  HOLD                │  ← #item-slot-hud (보유 슬롯 제목)
│ ┌──────────────────┐ │
│ │   🛡️           │ │  ← 슬롯 박스 44×44px
│ │   [Z]  24s      │ │
│ └──────────────────┘ │
└──────────────────────┘  ← bottom: 56px 이상 (범례 위)
```

### 4-3. CSS 좌표 규칙

| 요소 | position | top | right | bottom | left |
|------|----------|-----|-------|--------|------|
| `#buff-bar` | fixed | HUD 하단에 동적 배치 | 20px | — | — |
| `#item-slot-hud` | fixed | — | 20px | 60px | — |
| `#toast-container` | fixed | 64px | — | — | 50% (transform: translateX(-50%)) |

### 4-4. 아이템 셀 크기 (캔버스, CELL = 20px 기준)

| 항목 | 값 |
|------|----|
| 배경 원 반지름 | `CELL / 2 - 2` = **8px** |
| 외곽 글로우 링 반지름 | `CELL / 2 - 1` = **9px**, stroke 2px |
| 아이콘 렌더링 영역 | 중앙 `8×8px` (canvas path 기준) |
| 만료 임박 깜박임 주기 | `0.5s` (opacity 1 ↔ 0.3) |
| 깜박임 시작 기준 | 아이템 만료까지 **3,000ms** 미만 |

### 4-5. breakpoint 별 동작

| 환경 | 동작 |
|------|------|
| 모든 해상도 | vw/vh 기반 캔버스 — 픽셀 단위 HUD 요소 그대로 동작 |
| 모바일 (< 600px) | 슬롯 박스 44px 유지 (터치 영역 최소 보장). 버프 바 글자 크기 9px 축소 가능 |

---

## 5. 컴포넌트 명세

### 5-1. 보드 위 아이템 셀 (Canvas 렌더링)

> dev가 `drawItem(ctx, item)` 함수로 구현. 배수 먹이 `drawFood`와 동일 좌표계.

#### 공통 구조

```
셀 중심 = (item.x * CELL + CELL/2, item.y * CELL + CELL/2) ≡ (cx, cy)

[1] 배경 원 — fillStyle: 아이템 주색 75% opacity, arc(cx, cy, 8, 0, 2π)
[2] 외곽 광채 링 — strokeStyle: 아이템 글로우색, arc(cx, cy, 9, 0, 2π), lineWidth 2
[3] 아이콘 — 아래 개별 path 참조, fillStyle: #ffffff, 중앙 정렬
```

#### 아이템별 아이콘 Canvas Path 명세

---

**SPEED_UP** (⚡ 번개)

주색: `--item-speed-primary` = `#ffaa00`

```js
// 번개 폴리곤 — cx, cy 기준 오프셋
ctx.beginPath();
ctx.moveTo(cx + 2, cy - 5);   // 상단 오른쪽
ctx.lineTo(cx - 1, cy);        // 중앙 왼쪽
ctx.lineTo(cx + 1, cy);        // 중앙 오른쪽
ctx.lineTo(cx - 2, cy + 5);   // 하단 왼쪽
ctx.lineTo(cx + 1, cy + 1);   // 하단 오른쪽 인접
ctx.lineTo(cx + 0, cy + 1);   // 중하단 연결
ctx.closePath();
ctx.fillStyle = "#ffffff";
ctx.fill();
```

시각 특징: 날카로운 Z자 번개 형태, 흰색 실루엣. 배경 앰버 원 위에 선명하게 대비.

---

**SLOW_DOWN** (⌛ 모래시계)

주색: `--item-slow-primary` = `#00ddcc`

```js
// 모래시계 — 상하 삼각형 두 개
ctx.beginPath();
ctx.moveTo(cx - 4, cy - 5); ctx.lineTo(cx + 4, cy - 5);
ctx.lineTo(cx, cy);          // 상단 역삼각형
ctx.closePath();
ctx.fill();
ctx.beginPath();
ctx.moveTo(cx - 4, cy + 5); ctx.lineTo(cx + 4, cy + 5);
ctx.lineTo(cx, cy);          // 하단 정삼각형
ctx.closePath();
ctx.fillStyle = "#ffffff";
ctx.fill();
// 중앙 허리 수평선
ctx.fillRect(cx - 4, cy - 1, 8, 2);
```

시각 특징: 상하 대칭 모래시계. 청록 배경에 흰 형태 — 2× 먹이(cyan `#00cfff`) 와 배경색·형태 모두 다름.

---

**LENGTH_BURST** (✦ 폭발 별)

주색: `--item-burst-primary` = `#ff6600`

```js
// 8방향 돌출 스타 버스트
const arms = 8;
ctx.beginPath();
for (let i = 0; i < arms; i++) {
  const outerR = 5, innerR = 2;
  const outerA = (i / arms) * Math.PI * 2 - Math.PI / 2;
  const innerA = outerA + Math.PI / arms;
  if (i === 0) ctx.moveTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
  else         ctx.lineTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
  ctx.lineTo(cx + Math.cos(innerA) * innerR, cy + Math.sin(innerA) * innerR);
}
ctx.closePath();
ctx.fillStyle = "#ffffff";
ctx.fill();
```

시각 특징: 8개 뾰족 돌출 별 (폭발 표현). 주황-빨강 배경 — 8× 먹이(pure red `#ff4444`)와 형태 다름. 4× 먹이(purple)와 색 계열 전혀 다름.

---

**SHIELD** (◈ 방패)

주색: `--item-shield-primary` = `#4488ff`

```js
// 육각형 방패 실루엣
ctx.beginPath();
ctx.moveTo(cx, cy - 6);              // 상단 꼭짓점
ctx.lineTo(cx + 4, cy - 3);
ctx.lineTo(cx + 4, cy + 2);
ctx.lineTo(cx, cy + 5);              // 하단 뾰족 끝
ctx.lineTo(cx - 4, cy + 2);
ctx.lineTo(cx - 4, cy - 3);
ctx.closePath();
ctx.fillStyle = "#ffffff";
ctx.fill();
// 방패 중앙 십자 (detail)
ctx.fillStyle = "#4488ff";
ctx.fillRect(cx - 1, cy - 3, 2, 6);
ctx.fillRect(cx - 3, cy - 1, 6, 2);
```

시각 특징: 클래식 방패 육각형. 순청색 배경은 기존 팔레트에 없는 고유 색.

---

**REVERSE** (↩ 역방향 화살표)

주색: `--item-reverse-primary` = `#22ffaa`

```js
// 반원 위 역방향 화살표
// 상단 반원 호 (왼쪽으로 돌아오는 화살표)
ctx.beginPath();
ctx.arc(cx, cy, 4, Math.PI, 0, false); // 상단 반원
ctx.strokeStyle = "#ffffff";
ctx.lineWidth = 2;
ctx.stroke();
// 화살표 머리 (왼쪽 끝)
ctx.beginPath();
ctx.moveTo(cx - 4, cy);
ctx.lineTo(cx - 6, cy - 3);
ctx.lineTo(cx - 6, cy + 1);
ctx.closePath();
ctx.fillStyle = "#ffffff";
ctx.fill();
```

시각 특징: 반원 회귀 화살표. 민트-청록 배경 — 플레이어 그린(`#4cff80`)과 색조 분리 (더 청록).

---

#### 아이템 셀 요약 표

| 아이템 | 배경색 HEX | 아이콘 형태 | 배수 먹이 구별 포인트 |
|--------|-----------|-----------|---------------------|
| SPEED_UP | `#ffaa00` | 번개 Z | 원형 vs 먹이의 원형 — **형태** 동일하나 색(암버) + HUD 아이콘으로 구별 |
| SLOW_DOWN | `#00ddcc` | 모래시계 | 2× `#00cfff` 대비 그린 기조·모래시계 아이콘 |
| LENGTH_BURST | `#ff6600` | 8각 별 | 8× `#ff4444` 대비 주황·별 아이콘 |
| SHIELD | `#4488ff` | 방패 | 기존 팔레트에 없는 순청 |
| REVERSE | `#22ffaa` | 역방향 화살표 | 플레이어 그린 대비 청록 계열 분리 |

---

### 5-2. 즉시 발동형 버프 상태줄 (`#buff-bar`)

#### HTML 구조

```html
<!-- BF-544 신규 -->
<div id="buff-bar" aria-label="활성 버프 상태" hidden>
  <!-- JS로 동적 삽입 -->
  <!-- <div class="buff-item buff-speed" data-type="SPEED_UP">
         <span class="buff-icon">⚡</span>
         <span class="buff-label">SPEED</span>
         <div class="buff-progress-track">
           <div class="buff-progress-bar" style="width: 64%"></div>
         </div>
         <span class="buff-time">3.2s</span>
       </div> -->
</div>
```

#### CSS 토큰 정의

```css
#buff-bar {
  position: fixed;
  right: 20px;
  /* top: HUD 하단에서 동적 계산 (JS로 #hud getBoundingClientRect 기준) */
  display: flex;
  flex-direction: column;
  gap: 5px;
  pointer-events: none;
  z-index: 10;
  min-width: 130px;
}

.buff-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.55);
  border-radius: 4px;
  padding: 3px 8px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.buff-icon  { font-size: 13px; }
.buff-label { font-size: 10px; letter-spacing: 1px; opacity: 0.8; }
.buff-time  { font-size: 11px; font-weight: bold; min-width: 28px; text-align: right; }

.buff-progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  overflow: hidden;
}
.buff-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.12s linear;
}

/* 배수별 컬러 */
.buff-speed  .buff-time,
.buff-speed  .buff-label { color: var(--item-speed-primary, #ffaa00); }
.buff-speed  .buff-progress-bar { background: var(--item-speed-primary, #ffaa00); }

.buff-slow   .buff-time,
.buff-slow   .buff-label { color: var(--item-slow-primary, #00ddcc); }
.buff-slow   .buff-progress-bar { background: var(--item-slow-primary, #00ddcc); }

.buff-burst  .buff-time,
.buff-burst  .buff-label { color: var(--item-burst-primary, #ff6600); }
.buff-burst  .buff-progress-bar { background: var(--item-burst-primary, #ff6600); }
```

#### Props / 상태

| Props | 타입 | 설명 |
|-------|------|------|
| `type` | `"SPEED_UP"\|"SLOW_DOWN"\|"LENGTH_BURST"` | 버프 종류 |
| `timeRemainingMs` | `number` | 남은 ms. 매 rAF 갱신 |
| `totalMs` | `number` | 총 지속 ms (progress % 계산용) |

#### 인터랙션

- 버프 종료 직전 1,000ms: `.buff-item` 에 `opacity: 1 → 0.3` 깜박임 (0.3s 주기)
- 버프 만료 시: `.buff-item` fade-out 300ms 후 DOM 제거

---

### 5-3. 보유 아이템 슬롯 (`#item-slot-hud`)

#### HTML 구조

```html
<!-- BF-544 신규 -->
<div id="item-slot-hud" aria-label="보유 아이템">
  <div class="slot-label">HOLD</div>
  <div class="slot-box" data-state="empty">
    <span class="slot-icon" aria-hidden="true">—</span>
    <span class="slot-key-hint">[Z]</span>
    <span class="slot-expire"></span>
  </div>
</div>
```

#### 상태별 시각 명세

| 상태 | `.slot-box` 테두리 | 아이콘 | `[Z]` 힌트 | 만료 텍스트 |
|------|-------------------|--------|-----------|-----------|
| empty | `1px dashed rgba(255,255,255,0.18)` | `—` (흐림 `opacity: 0.25`) | `rgba(255,255,255,0.25)` | 없음 |
| held-shield | `2px solid #4488ff` + `box-shadow: 0 0 10px rgba(68,136,255,0.55)` | `🛡️` (20px) | `#4488ff` + bold | `"28s"` (카운트다운) |
| held-reverse | `2px solid #22ffaa` + `box-shadow: 0 0 10px rgba(34,255,170,0.50)` | `🌀` (20px) | `#22ffaa` + bold | `"22s"` |
| expiring (<5s) | 깜박임 (0.4s 주기, border opacity 1↔0.4) | 아이콘 깜박임 | — | 빨간 텍스트 |

#### CSS

```css
#item-slot-hud {
  position: fixed;
  right: 20px;
  bottom: 60px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  pointer-events: none;
  z-index: 10;
  font-family: 'Courier New', monospace;
}

.slot-label {
  font-size: 9px;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.4);
  text-align: right;
}

.slot-box {
  width: 48px;
  height: 48px;
  background: var(--hud-slot-bg, rgba(0,0,0,0.65));
  border: 1px dashed var(--hud-slot-border-empty, rgba(255,255,255,0.18));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  position: relative;
}

.slot-icon   { font-size: 20px; line-height: 1; }
.slot-key-hint {
  font-size: 10px; font-weight: bold;
  color: rgba(255,255,255,0.25);
}
.slot-expire { font-size: 9px; color: #aaa; position: absolute; bottom: 3px; right: 4px; }

/* 보유 상태 공통 */
.slot-box[data-state^="held"] .slot-key-hint {
  font-weight: bold;
}

@keyframes slot-expiring {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
.slot-box[data-expiring="true"] {
  animation: slot-expiring 0.4s ease-in-out infinite;
}
```

---

### 5-4. 사용키 안내 툴팁 / 오버레이

#### 첫 아이템 획득 시 오버레이 (1회만)

보유형 아이템을 **처음 획득**했을 때 캔버스 중앙 하단에 1.5초간 표시:

```
┌──────────────────────────────┐
│  [🛡️ 방패 획득!]              │
│  Z 키 로 사용할 수 있습니다    │
└──────────────────────────────┘
```

| 항목 | 값 |
|------|----|
| 위치 | `fixed`, bottom: `80px`, `left: 50%`, `transform: translateX(-50%)` |
| 배경 | `rgba(0,0,0,0.80)` |
| 테두리 | `1px solid` 아이템 주색 |
| 테두리 radius | `8px` |
| 패딩 | `10px 20px` |
| 표시 시간 | **1,500ms** → fade-out 300ms |
| 폰트 | `'Courier New'`, 13px, 아이템 주색 |
| [Z] 강조 | `background: 아이템 주색, color: #0d0d0d, padding: 1px 5px, border-radius: 3px` |
| z-index | 12 (토스트와 동일) |
| 반복 표시 | **1회만** — `localStorage` 플래그 `bf-snake-z-hint-shown` 로 관리 |

---

### 5-5. 토스트 알림 (`#toast-container`)

#### HTML 구조

```html
<div id="toast-container" aria-live="polite" aria-atomic="true"></div>
<!-- 토스트 예시 (JS 동적 삽입):
  <div class="toast toast-speed">⚡ 스피드업 획득!</div>
  <div class="toast toast-slow">🐢 슬로우다운!</div>
  <div class="toast toast-burst">🔥 길이폭발!</div>
  <div class="toast toast-shield">🛡️ 방패 획득!</div>
  <div class="toast toast-reverse">🌀 역전탄 사용!</div>
  <div class="toast toast-expire">🛡️ 방패 소멸</div>
-->
```

#### 토스트 텍스트 목록

| 이벤트 | 텍스트 | 주색 |
|--------|--------|------|
| SPEED_UP 획득 | `⚡ 스피드업 획득!` | `#ffaa00` |
| SLOW_DOWN 획득 | `🐢 슬로우다운!` | `#00ddcc` |
| LENGTH_BURST 획득 | `🔥 길이폭발!` | `#ff6600` |
| SHIELD 획득 | `🛡️ 방패 획득! [Z]로 사용` | `#4488ff` |
| REVERSE 획득 | `🌀 역전탄 획득! [Z]로 사용` | `#22ffaa` |
| SHIELD 사용 | `🛡️ 방패 발동!` | `#4488ff` |
| REVERSE 사용 | `🌀 역전탄 발동!` | `#22ffaa` |
| SHIELD 소멸 (30s 만료) | `🛡️ 방패 소멸` | `rgba(255,255,255,0.6)` |
| REVERSE 소멸 | `🌀 역전탄 소멸` | `rgba(255,255,255,0.6)` |
| CPU가 HOLDABLE 아이템 밟음 | `[CPU] 아이템 소멸` | `#ff6b4c` |

#### CSS

```css
#toast-container {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  z-index: 12;
}

.toast {
  background: var(--toast-bg, rgba(13,13,13,0.88));
  border-radius: 6px;
  padding: 7px 16px;
  max-width: 280px;
  white-space: nowrap;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 0.5px;
  animation: toast-in 0.25s ease-out forwards,
             toast-out 0.3s ease-in 1.5s forwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toast-out {
  from { opacity: 1; }
  to   { opacity: 0; transform: translateY(-4px); }
}

.toast-speed   { color: #ffaa00; border: 1px solid rgba(255,170,0,0.35); }
.toast-slow    { color: #00ddcc; border: 1px solid rgba(0,221,204,0.35); }
.toast-burst   { color: #ff6600; border: 1px solid rgba(255,102,0,0.35); }
.toast-shield  { color: #4488ff; border: 1px solid rgba(68,136,255,0.35); }
.toast-reverse { color: #22ffaa; border: 1px solid rgba(34,255,170,0.35); }
.toast-expire  { color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.15); }
```

---

### 5-6. 발동 이팩트 모션 가이드 — INSTANT 아이템

> 이팩트 레이어 `#effect-layer` (BF-536 `z-index: 15`) 재사용.
> 트리거 함수: `triggerItemEffect(cx, cy, type)` (game.js 신규)

---

#### SPEED_UP 발동 이팩트 프레임 가이드

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 화면 플래시 | `rgba(255,170,0,0.18)`, **80ms** ease-out (fx-screen-flash 재사용) |
| 0ms | 중심 번개 파티클 6개 | 방사형 60° 간격, travel `32px`, `#ffaa00` 원 `6×6px`, **300ms** |
| 0ms | 중심 플래시 원 | `#ffaa00` 원 `8→18px`, opacity `1→0`, **120ms** (fx-sparkle-center 재사용) |
| 0~5000ms | 트레일 파티클 | 매 **5 tick**(600ms)마다 플레이어 tail 위치에 `#ffb730` 원 `4×4px`, opacity `1→0`, **800ms** (산개 없이 자리에서 fade) |

**CSS 키프레임:**
```css
@keyframes fx-speed-trail {
  0%   { opacity: 0.7; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.3); }
}
```

---

#### SLOW_DOWN 발동 이팩트 프레임 가이드

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 냉기 링 확장 | `border: 2px solid #00ddcc`, 반지름 `0→50px`, opacity `1→0`, **400ms** (fx-burst-ring 유사) |
| 0ms | 얼음 결정 파티클 4개 | 90° 간격 방사형, travel `22px`, 다이아몬드 `6×6px`, `#00ddcc`, **350ms** |
| 0ms | 중심 청록 플래시 | `#00ddcc` 원 `8→20px`, opacity `1→0`, **150ms** |
| 0~5000ms | 획득자 뱀 투명도 | 플레이어 snake opacity `0.75` 유지 (canvas globalAlpha 0.75로 그리기) — "느림" 시각 표현 |

**CSS 키프레임:**
```css
@keyframes fx-slow-ring {
  0%   { width: 0; height: 0; opacity: 1; }
  100% { width: 100px; height: 100px; opacity: 0; }
}
```

---

#### LENGTH_BURST 발동 이팩트 프레임 가이드

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 화면 플래시 | `rgba(255,102,0,0.22)`, **100ms** |
| 0ms | 폭발 파티클 12개 | 방사형 30° 간격, travel `50px`, `#ff6600`/`#ff9900` 교대 원 `8×8px`, **550ms**, `cubic-bezier(0,0.9,0.2,1)` |
| 0ms | 폭발 링 | `border: 2px solid #ff6600`, 반지름 `0→70px`, opacity `1→0`, **500ms** |
| 0~5000ms | 뱀 몸통 깜박임 | 플레이어 snake fill색 `#4cff80` ↔ `rgba(255,255,255,0.90)` **0.5s** 주기 toggle (canvas render 내 조건 분기) |
| 복귀 시 | 축소 팝 이팩트 | 플레이어 tail 위치에서 4개 파티클 수축 방향 travel `-20px`, `#ff6600`, **250ms** |

**CSS 키프레임:**
```css
@keyframes fx-burst-orange {
  0%   { transform: translate(0,0) scale(1.3); opacity: 1; }
  30%  { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}
```

---

### 5-7. 발동 이팩트 모션 가이드 — HOLDABLE 아이템

---

#### SHIELD Z 키 발동 이팩트

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 방패 링 파동 | `border: 2px solid #4488ff`, 반지름 `0→44px`, opacity `1→0`, **350ms** (플레이어 헤드 위치 기준) |
| 0ms | 파란 파티클 8개 | 방사형 45° 간격, travel `26px`, `#4488ff` 다이아몬드 `5×5px`, **400ms** |
| 0ms~방패 해제 | 뱀 글로우 (캔버스) | 모든 세그먼트 외곽선 `strokeStyle: rgba(68,136,255,0.7)`, `lineWidth: 3`, pulse (opacity 0.7↔0.4 1.5s 주기) |

**방패 충돌 방어 발동 시 (KO 모면 이팩트):**

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 스크린 플래시 | `rgba(68,136,255,0.35)`, **120ms** |
| 0ms | 방패 파괴 파티클 | 플레이어 헤드 기준 12개, `#4488ff`/`#ffffff` 교대, 방사형 travel `40px`, **500ms** |
| 120ms | 방패 링 축소 | 반지름 `44px→0`, opacity `0.8→0`, **200ms** |

**CSS:**
```css
@keyframes shield-glow-pulse {
  0%, 100% { opacity: 0.7; }
  50%      { opacity: 0.35; }
}
```

---

#### REVERSE Z 키 발동 이팩트

(CPU 헤드 위치를 기준점으로 사용)

| 시간 | 요소 | 명세 |
|------|------|------|
| 0ms | 스크린 플래시 | `rgba(34,255,170,0.15)`, **80ms** |
| 0ms | 소용돌이 파티클 16개 | CPU 헤드 기준, circular swirl 패턴 (θ 0°~360° 균일 배치, travel `32px` 시계 방향 회전 +90° 오프셋), `#22ffaa` 원 `5×5px`, **600ms** |
| 0ms | 소용돌이 링 | `border: 2px solid #22ffaa`, 반지름 `0→36px`, opacity `1→0`, **400ms** |
| 0~3000ms | CPU 주변 잔류 링 | `border: 1px solid rgba(34,255,170,0.30)`, 반지름 `18px` 고정, pulse opacity `0.6↔0.15` **1s** 주기, CPU 헤드 따라 이동 |

**CSS:**
```css
@keyframes fx-swirl-particle {
  0%   { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(90deg) scale(0); opacity: 0; }
}
@keyframes fx-reverse-ring-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 0.15; }
}
```

---

### 5-8. LENGTH_BURST 활성 중 뱀 시각

기획 §11-5 참조: 뱀 몸통 색상 원래 색 ↔ 흰색 깜박임 (0.5초 주기)

**Canvas 구현 가이드:**
```js
// game.js drawSnake() 내 — BF-544 추가
const isLengthBurstActive = state.lengthBurstActive ?? false;
const blinkOn = isLengthBurstActive && (Math.floor(performance.now() / 500) % 2 === 0);

// 세그먼트 fill 색 결정
const segColor = blinkOn
  ? `rgba(255, 255, 255, 0.90)`   // 깜박임 ON
  : (i === 0 ? "#00cc44" : `rgba(60,210,100,${alpha})`); // 정상
```

복귀 시:
- 정상 색상으로 즉시 전환 후, 블렌딩 필요 없음 (단순 toggle)

---

### 5-9. SHIELD 활성 중 뱀 시각

기획 §4-2 참조: 뱀 전체 테두리에 파란 글로우

**Canvas 구현 가이드:**
```js
// game.js drawSnake() 내 — BF-544 추가
if (state.shieldActive) {
  const glowAlpha = 0.4 + 0.3 * Math.abs(Math.sin(performance.now() / 750)); // pulse
  ctx.strokeStyle = `rgba(68,136,255,${glowAlpha.toFixed(2)})`;
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.roundRect(seg.x * CELL, seg.y * CELL, CELL, CELL, 4);
  ctx.stroke();
}
```

---

## 6. dev 구현 가이드

### 6-1. 신규 CSS 변수 추가 (`snake/styles.css` `:root` 블록에 append)

```css
/* ─── 아이템 시스템 컬러 토큰 — BF-544 ───────────────── */
:root {
  --item-speed-primary:   #ffaa00;
  --item-speed-glow:      rgba(255,170,0,0.40);
  --item-speed-trail:     rgba(255,180,50,0.60);
  --item-slow-primary:    #00ddcc;
  --item-slow-glow:       rgba(0,221,204,0.40);
  --item-burst-primary:   #ff6600;
  --item-burst-glow:      rgba(255,102,0,0.45);
  --item-burst-flash:     #ff9900;
  --item-shield-primary:  #4488ff;
  --item-shield-glow:     rgba(68,136,255,0.45);
  --item-shield-break:    rgba(68,136,255,0.35);
  --item-reverse-primary: #22ffaa;
  --item-reverse-glow:    rgba(34,255,170,0.40);
  --item-blink-white:     rgba(255,255,255,0.90);
  --hud-slot-bg:          rgba(0,0,0,0.65);
  --hud-slot-border-empty: rgba(255,255,255,0.18);
  --toast-bg:             rgba(13,13,13,0.88);
}
```

### 6-2. HTML 구조 추가 (`snake/index.html` — `#effect-layer` 다음에 삽입)

```html
<!-- 아이템 시스템 HUD — BF-544 -->
<div id="buff-bar" aria-label="활성 버프 상태" hidden></div>
<div id="item-slot-hud" aria-label="보유 아이템">
  <div class="slot-label">HOLD</div>
  <div class="slot-box" data-state="empty">
    <span class="slot-icon" aria-hidden="true">—</span>
    <span class="slot-key-hint">[Z]</span>
    <span class="slot-expire"></span>
  </div>
</div>
<div id="toast-container" aria-live="polite" aria-atomic="true"></div>
```

### 6-3. Canvas 아이템 그리기 함수 (`snake/game.js`)

```js
// FIXME(BF-544): drawItem 함수 — §5-1 명세 참조
const ITEM_COLORS = {
  SPEED_UP:     { primary: "#ffaa00", glow: "rgba(255,170,0,0.40)" },
  SLOW_DOWN:    { primary: "#00ddcc", glow: "rgba(0,221,204,0.40)" },
  LENGTH_BURST: { primary: "#ff6600", glow: "rgba(255,102,0,0.45)" },
  SHIELD:       { primary: "#4488ff", glow: "rgba(68,136,255,0.45)" },
  REVERSE:      { primary: "#22ffaa", glow: "rgba(34,255,170,0.40)" },
};

function drawItem() {
  const item = state.item;
  if (!item) return;

  const cx = item.x * CELL + CELL / 2;
  const cy = item.y * CELL + CELL / 2;
  const { primary, glow } = ITEM_COLORS[item.type] || ITEM_COLORS.SPEED_UP;

  // [1] 배경 원 (75% opacity)
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = primary + "bf"; // bf ≈ 75% hex opacity
  ctx.fill();

  // [2] 광채 링
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.strokeStyle = glow;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // [3] 아이콘 (§5-1 개별 path)
  ctx.fillStyle = "#ffffff";
  drawItemIcon(ctx, item.type, cx, cy);

  // [4] 만료 임박 깜박임 (3초 미만)
  const msLeft = item.expiresAt - Date.now();
  if (msLeft < 3000) {
    const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
    if (!blinkOn) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#0d0d0d";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
```

### 6-4. CSS 변수명 컨벤션

| 패턴 | 의미 |
|------|------|
| `--item-{type}-primary` | 해당 아이템 주색 |
| `--item-{type}-glow` | 광채 (rgba 반투명) |
| `--item-{type}-flash` | 스크린 플래시 또는 깜박임 교대색 |
| `--hud-slot-*` | 보유 슬롯 UI 토큰 |
| `--toast-*` | 토스트 UI 토큰 |

### 6-5. 클래스명 컨벤션

| 클래스명 | 역할 |
|----------|------|
| `.buff-item` | 버프 상태줄 아이템 공통 |
| `.buff-speed / .buff-slow / .buff-burst` | 아이템별 버프 컬러 적용 |
| `.slot-box` | 보유 슬롯 박스 |
| `.slot-box[data-state="held-shield"]` | 방패 보유 상태 |
| `.slot-box[data-state="held-reverse"]` | 역전탄 보유 상태 |
| `.slot-box[data-expiring="true"]` | 만료 임박 깜박임 |
| `.toast-speed / .toast-slow / .toast-burst` | 토스트 색상 변형 |
| `.toast-shield / .toast-reverse / .toast-expire` | 토스트 색상 변형 |

### 6-6. 이팩트 트리거 진입점 (game.js 기존 `triggerEffect` 확장)

```js
// FIXME(BF-544): 아이템 이팩트 트리거 (§5-6, §5-7 참조)
function triggerItemEffect(cx, cy, type) {
  if (!EFFECTS_ENABLED) return;
  switch (type) {
    case "SPEED_UP":     triggerSpeedEffect(cx, cy);   break;
    case "SLOW_DOWN":    triggerSlowEffect(cx, cy);    break;
    case "LENGTH_BURST": triggerBurstEffect(cx, cy);   break;
    case "SHIELD":       triggerShieldEffect(cx, cy);  break;
    case "REVERSE":      triggerReverseEffect(cx, cy); break;
  }
}
```

### 6-7. Z 키 힌트 localStorage 플래그

```js
// FIXME(BF-544): 첫 보유형 아이템 획득 시 1회 힌트 오버레이
const Z_HINT_KEY = "bf-snake-z-hint-shown";

function maybeShowZHint(itemType) {
  try {
    if (localStorage.getItem(Z_HINT_KEY)) return;
    showZHintOverlay(itemType); // §5-4 참조
    localStorage.setItem(Z_HINT_KEY, "1");
  } catch (_) { /* private mode — 무시 */ }
}
```

---

## 7. mockup 참조

시각 mockup 파일: **`docs/design/mockups/snake-items-BF-544.html`**

- 5종 아이템 셀 인라인 SVG 시각화 (게임 그리드 위 표현)
- HUD 보유 슬롯 3가지 상태 (empty / held-shield / held-reverse)
- 즉시 발동형 버프 상태줄 데모
- 토스트 알림 라이브 데모 버튼
- 발동 이팩트 CSS 애니메이션 직접 재생 (SPEED_UP / LENGTH_BURST / SHIELD / REVERSE)
- `file://` 오픈 시 외부 의존성 0건으로 완전 동작

---

## 8. Self-critique · AC 매핑 표

### Self-critique 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| 1 | **s1 AC 매핑** — 기획 §2 아이템 목록 5종과 디자인 1:1 대응 | ✅ §5-1 아이템 셀 5종 전부 (SPEED_UP / SLOW_DOWN / LENGTH_BURST / SHIELD / REVERSE) 색·아이콘 SVG·Canvas path 정의 완료 |
| 2 | **dev 구현 가이드** — dev-1 이 따라할 단계별 지침 완전성 | ✅ §6-1 CSS 변수 추가 / §6-2 HTML 삽입 / §6-3 drawItem 함수 / §6-4 컨벤션 / §6-5 클래스명 / §6-6 트리거 진입점 / §6-7 localStorage 플래그 |
| 3 | **기존 요소 보존** — BF-536 이팩트 / BF-533 배수 통계 / BF-530 경쟁 HUD 와 충돌 없음 | ✅ z-index 계층도(§4-1) 확인: 신규 요소 z-10/12 — 이팩트 z-15, 오버레이 z-20 위계 유지. CSS 변수명 `--item-*` 네임스페이스 분리로 기존 `--fx-*` 충돌 없음 |
| 4 | **컴포넌트 매핑** — 기획 §11 4개 항목 전부 커버 | ✅ 11-1(셀 아이콘)→§5-1, 11-2(버프 표시줄)→§5-2, 11-3(보유 슬롯)→§5-3+§5-4, 11-4(토스트)→§5-5 |
| 5 | **모호함 flag** — 구현자가 결정해야 할 잔여 항목 | ⚠️ 아래 flag 목록 참조 |

### 모호함 Flag (dev-1 결정 필요)

| # | 항목 | 권장 |
|---|------|------|
| F-1 | SLOW_DOWN 활성 중 뱀 `globalAlpha 0.75` 적용 시 **CPU 지렁이도 포함인지** | 획득자(플레이어)만 적용 권장. CPU SLOW_DOWN 수집 시 CPU drawCpuSnake 동일 로직 |
| F-2 | 버프 상태줄 `#buff-bar` **top 좌표** — `#hud` getBoundingClientRect 기반 동적 계산 vs 고정값 | 동적 계산 권장 (HUD 높이 가변) |
| F-3 | REVERSE 잔류 링이 **CPU 헤드를 매 tick 따라가는 DOM 갱신** 방식 | effect-layer 단일 div left/top을 requestAnimationFrame 으로 업데이트 권장 |
| F-4 | LENGTH_BURST 복귀 시 `tail 축소 팝 이팩트` 위치 — 꼬리 중 어느 셀? | 복귀 직전 tail 세그먼트 좌표 (snake[snake.length-1]) 사용 권장 |

### AC 매핑 (기획 BF-539 §13 기준)

| 기획 AC | 요약 | 디자인 대응 섹션 | 충족 여부 |
|---------|------|-----------------|---------|
| AC-1-1 (아이템 목록 정의) | 5종 × 색·아이콘·지속 시각화 정의 | §5-1 아이템 셀 전체 표, §2-3 컬러 토큰 | ✅ |
| AC-1-2 (발동 흐름 시각) | INSTANT/HOLDABLE 발동 이팩트 가이드 | §5-6 (INSTANT), §5-7 (HOLDABLE) | ✅ |
| AC-1-3 (사용키 HUD) | [Z] 힌트, 슬롯 UI, 사용 안내 오버레이 | §5-3, §5-4 | ✅ |
| AC-1-4 (중첩 우선순위) | 디자인 관여 없음 (로직 전담) | — | N/A |
| AC-1-5 (KPI 시각) | 버프 진행 바(§5-2)로 duration 시각화 | §5-2 buff-progress-bar | ✅ |
| AC-2 (기존 토큰 충돌 없음) | `--item-*` 네임스페이스 분리 + file:// 렌더 | §2-3 컬러 표, §6-1 CSS 변수 추가 가이드 | ✅ |
| AC-3 (AC 매핑 표) | 본 §8 표 | 현재 섹션 | ✅ |

### BF-544 수용 기준 직접 매핑

| 수용 기준 | 디자인 결정 | 섹션 |
|-----------|-----------|------|
| (1) 각 아이템 색·아이콘 SVG 또는 캐릭터 표현 | 5종 아이콘 Canvas path + 컬러 토큰 전부 정의 | §5-1, §2-3 |
| (2) 발동 이팩트 (파티클·트레일·화면 효과) 프레임 가이드 | SPEED_UP·SLOW_DOWN·LENGTH_BURST·SHIELD·REVERSE 개별 프레임 표 작성 | §5-6, §5-7 |
| (3) HUD 보유 아이템 인디케이터 디자인 | 슬롯 3상태 + CSS 명세 | §5-3 |
| (4) 사용키 안내 툴팁/오버레이 시안 | [Z] 힌트 오버레이 + 슬롯 내 키 힌트 | §5-4 |
| 기존 컬러 토큰 충돌 없음 | `--item-*` 분리, 기존 `--fx-*` / `--bg-primary` / `--player-*` 변경 없음 | §2 |
| file:// 환경 정상 렌더 | mockup HTML 외부 의존성 0건 | §7 |
| s1 아이템 목록 1:1 매핑 표 | 본 §8 AC 매핑 표 | §8 |
