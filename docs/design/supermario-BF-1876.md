# 슈퍼마리오 1-1 시각 명세 (BF-1876)

> 작성: 이디자인 (designer) · Task: BF-1877
> 근거: frozen `ui-contract@v1` + planner 실행 설계 `docs/plans/BF-1876/implementation-plan.md`
> 이 문서는 frozen blueprint 의 selector·상태·token·접근성·반응형 계약을 **시각 결과로 구현**한다.
> selector/token 을 **변경하거나 재정의하지 않으며**, 새 파일·역할·runtime 코드를 추가하지 않는다.
> 산출물 범위: 본 markdown + 시각 mockup `docs/design/mockups/supermario-BF-1876.html`. `supermario/` 하위 runtime HTML/CSS/JS 는 developer 소유이며 생성하지 않는다.

---

## 1. 시안 개요

- **변경 범위**: HTML5 `<canvas>` 기반 슈퍼마리오 1-1 게임 화면의 시각 표현 — 캔버스 게임 화면 구성, HUD 레이아웃, 팔레트/스프라이트 표현, 5개 상태(`ready`/`playing`/`paused`/`gameover`/`cleared`)별 화면 텍스트.
- **사용자 경험 목표**:
  - 8-bit 레트로 무드(제한 팔레트 · 픽셀 스프라이트 · 대문자 상태 텍스트)로 원작 1-1의 첫인상을 즉시 전달한다.
  - HUD(SCORE + 시작 버튼)는 항상 캔버스 상단에 고정되어 게임 진행 정보와 주 실행 control 을 한눈에 노출한다.
  - **상태는 색상만이 아니라 화면 텍스트 + 접근성 이름으로 이중 표기**해, 색각/스크린리더 사용자도 상태를 구분할 수 있다.
  - 320px 좁은 화면에서도 캔버스가 폭에 맞춰 축소되고 HUD 요소가 겹치지 않는다.
- **비목표**: 물리/입력/레벨 데이터/렌더 알고리즘의 재정의(planner 설계가 권위) · runtime 파일 구현(developer 소유).

---

## 2. 컬러 팔레트

### 2.1 계약 토큰 (frozen — `index.html` `:root`에 developer가 정의, 값·이름 변경 금지)

| 토큰 | 값 (HEX) | 역할 | 표현 위치 |
| --- | --- | --- | --- |
| `--color-sky` | `#5c94fc` | 배경 하늘 | canvas 배경 전면 |
| `--color-ground` | `#c84c0c` | 지면 블록 | 하단 지면(`ground`) 타일 |
| `--color-brick` | `#e45c10` | 벽돌 블록 | 공중 벽돌(`brick`)·물음표 블록(`block`) |
| `--color-mario` | `#d82800` | 마리오 | 플레이어 스프라이트 |

> canvas 렌더 시에도 위 색상 값을 그대로 사용한다. 하드코딩 헥사 재정의 금지 — CSS 변수 또는 동일 값 상수 1곳에서 참조(planner §2.5).

### 2.2 mockup 표현 보조값 (계약 토큰 아님 — 시각화 전용, developer 재량)

계약 토큰만으로는 텍스트 대비·오버레이 등 표현이 부족해 mockup 에서만 쓰는 보조값이다. **design-token 계약이 아니며** developer 가 픽셀 단위로 맞출 의무는 없다.

| 용도 | 권장값 | 비고 |
| --- | --- | --- |
| HUD 배경 | `#000000` | 레트로 상단 바(불투명 검정) |
| HUD 텍스트/SCORE | `#ffffff` | 검정 바 위 흰 글자, 대비 충분 |
| 상태 오버레이 반투명 막 | `rgba(0,0,0,0.55)` | `playing` 외 상태에서 캔버스 위 덮개 |
| 상태 텍스트 | `#ffffff` | 오버레이 위 대문자 텍스트 |
| `gameover` 강조 | `--color-mario`(`#d82800`) 재사용 | 새 색 도입 대신 계약 색 재사용 |
| `cleared` 강조 | `#f8d800`(레트로 옐로) | 깃대 클리어 강조(보조값) |

---

## 3. 타이포그래피

vanilla-static 규약: 외부 폰트 의존 최소화. 레트로 픽셀 무드는 **system monospace stack** 으로 표현한다(외부 호출 0건).

| 역할 | font-family | size | weight | line-height | letter-spacing | 용도 |
| --- | --- | --- | --- | --- | --- | --- |
| HUD SCORE | `ui-monospace, "SFMono-Regular", "Consolas", monospace` | 16px | 700 | 1.0 | 0.08em | `game-score` (`SCORE 000000`) |
| 시작 버튼 | 동일 monospace | 14px | 700 | 1.0 | 0.06em | `game-start` 라벨(`시작`) |
| 상태 오버레이 텍스트 | 동일 monospace | 32px(모바일 24px) | 700 | 1.1 | 0.12em | `READY`/`PAUSED`/`GAME OVER`/`CLEARED` |
| 상태 보조 안내 | 동일 monospace | 13px | 400 | 1.3 | 0.02em | 오버레이 하단 조작 안내(예: "시작을 누르세요") |

- 대문자 상태 텍스트는 8-bit 무드의 핵심. 실제 렌더는 canvas `fillText` 또는 DOM 오버레이 어느 쪽이든 developer 재량(계약 아님).
- 픽셀 폰트 CDN(예: "Press Start 2P")은 **mockup 한정 선택**이며 runtime 강제 아님. 본 mockup 은 외부 의존 0건 원칙에 따라 system monospace 로 표현한다.

---

## 4. 레이아웃

### 4.1 DOM 구조 (frozen — planner §2.3, exact)

```html
<div id="game-root" class="game">
  <div id="game-hud" class="game__hud">
    <span id="game-score" class="game__score">SCORE 000000</span>
    <button id="game-start" class="game__start" aria-label="게임 시작">시작</button>
  </div>
  <canvas id="game-canvas" class="game__canvas"
          aria-label="슈퍼마리오 1-1 게임 화면"></canvas>
</div>
```

- DOM ID: `game-root`, `game-canvas`, `game-hud`, `game-score`, `game-start`
- CSS class: `game`, `game__canvas`, `game__hud`, `game__score`, `game__start`
- **위 selector 는 변경/추가/재정의 금지.** mockup 도 동일 selector 를 사용한다.

### 4.2 섹션 구조 · spacing

```
┌─────────────────────────────── #game-root (.game) ───────────────────────────────┐
│  ┌───────────────────── #game-hud (.game__hud) ─────────────────────┐            │
│  │  [ #game-score  SCORE 000000 ]        ←gap→        [ #game-start 시작 ] │  (검정 바)│
│  └──────────────────────────────────────────────────────────────────┘            │
│  ┌───────────────────── #game-canvas (.game__canvas) ─────────────────┐          │
│  │  하늘(--color-sky)                                                    │          │
│  │      [브릭][?블록]        (공중 --color-brick)                         │          │
│  │   ▮마리오(--color-mario)                                              │          │
│  │  ██████████████  구멍  ████████████  (지면 --color-ground)            │  ⚑깃대   │
│  └────────────────────────────────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- `game-root`: 세로 스택(HUD 위, canvas 아래). 화면 중앙 정렬, 최대 폭은 canvas 논리 폭 기준.
- `game-hud`: **flex, `justify-content: space-between`, `align-items: center`, `gap: var(--space-hud-gap)`(=12px)**. 좌측 SCORE, 우측 시작 버튼.
- `game-canvas`: HUD 바로 아래. 논리 백버퍼 `256×240`(planner §6), CSS 폭만 축소.
- HUD 안쪽 padding: 상하 6px / 좌우 10px 권장(보조값).

### 4.3 상태별 HUD 레이아웃

HUD 골격(SCORE 좌 · 시작 버튼 우)은 **모든 상태에서 동일**하며, 상태에 따라 값·활성/텍스트만 달라진다.

| 상태 | `game-score` 표기 | `game-start` 표기/활성 | 캔버스 오버레이 |
| --- | --- | --- | --- |
| `ready` | `SCORE 000000` | `시작` · 활성(주 control) | `READY` + "시작을 누르세요" |
| `playing` | `SCORE 001250`(진행값 갱신) | `시작` · 비활성 또는 무시(중복 시작 방지) | 없음(게임 화면 노출) |
| `paused` | 마지막 SCORE 유지 | `시작` · (재개는 별도 키, 계약 아님) | `PAUSED` + "일시정지" |
| `gameover` | 마지막 SCORE 유지 | `시작` · 활성(재시작 = 초기화 진입) | `GAME OVER`(강조) + "다시 시작" |
| `cleared` | 최종 SCORE | `시작` · 활성(재시작 = 초기화 진입) | `CLEARED`(강조) + "축하합니다" |

- **초기화·취소·실패 뒤 복구**: `ready`/`gameover`/`cleared` 에서 `game-start` 를 조작하면 상태는 `ready→playing` 으로 초기화 진입하고 SCORE 는 `000000` 으로 되돌아간다. 주 실행 control(`game-start`)은 항상 재사용 가능해야 한다(planner §2.4·AC-5).

### 4.4 breakpoint 별 동작 (반응형)

| breakpoint | 동작 |
| --- | --- |
| ≥ 480px | canvas 논리 폭 기준으로 표시(예: `256px` 백버퍼를 CSS `width` 로 2배 확대 등 developer 재량), HUD 한 줄. |
| 320px ~ 479px | **canvas `max-width:100%` 로 viewport 폭에 맞춰 축소**, 논리 해상도는 고정. content overflow 없음. |
| 320px(최소) | HUD 는 flex 유지, `gap: 12px` 로 SCORE 와 시작 버튼이 **겹치지 않는다**. 폭 부족 시 SCORE 는 `SCORE 000000` 축약 표기 유지(줄바꿈 대신). |

- 계약(planner §2.7): 320px 이상에서 canvas 가 폭에 맞춰 축소되고 overflow 발생 금지 · `game-hud` 와 `game-score` 겹침 금지.

---

## 5. 컴포넌트 명세

### 5.1 `game-root` (`.game`)

| 항목 | 값 |
| --- | --- |
| 역할 | 게임 전체 컨테이너(HUD + canvas 세로 스택) |
| 상태 반영 | 현재 게임 상태를 하위로 전파(오버레이 렌더 트리거) |
| 인터랙션 | 없음(레이아웃 컨테이너) |

### 5.2 `game-hud` (`.game__hud`)

| 항목 | 값 |
| --- | --- |
| 역할 | 상단 정보 바(SCORE + 시작 control) |
| 레이아웃 | flex · `justify-content: space-between` · `gap: var(--space-hud-gap)` |
| 상태 | 모든 상태에서 표시(골격 불변) |
| 인터랙션 | 자식 `game-start` 위임 |

### 5.3 `game-score` (`.game__score`)

| 항목 | 값 |
| --- | --- |
| 역할 | 현재 점수 표시 |
| 초기값 | `SCORE 000000` (6자리 zero-pad) |
| 상태 | `playing` 중 갱신, 초기화 시 `000000` 복귀 |
| 접근성 | 텍스트 자체가 값 노출(스크린리더 판독 가능). 갱신 시 `aria-live="polite"` 권장(보조) |

### 5.4 `game-start` (`.game__start`)

| 항목 | 값 |
| --- | --- |
| 역할 | 주 실행 control(시작/재시작 진입) |
| 라벨 | 화면 텍스트 `시작` · `aria-label="게임 시작"`(frozen) |
| 상태 | `ready`/`gameover`/`cleared`: 활성(초기화 진입) · `playing`: 중복 시작 무시 |
| 인터랙션 | 클릭 / `Enter` / `Space`(포커스 시) → `playing` 초기화 진입(planner §4) |
| 상태 표현 | 활성/비활성은 색상만이 아니라 `disabled` 속성·텍스트로도 구분 |

### 5.5 `game-canvas` (`.game__canvas`)

| 항목 | 값 |
| --- | --- |
| 역할 | 게임 화면 렌더 표면(하늘·타일·깃대·마리오·상태 오버레이) |
| 논리 해상도 | `256×240`(planner §6), CSS 폭만 축소(`max-width:100%`) |
| 접근성 | `aria-label="슈퍼마리오 1-1 게임 화면"`(frozen) |
| 인터랙션 | 방향키(←→) 이동 · `Space`/`↑` 점프. 방향키·Space 는 `preventDefault`(스크롤 방지) |
| 상태 표현 | `playing` 외 상태는 반투명 오버레이 + 대문자 상태 텍스트 |

### 5.6 상태 오버레이 (표현 컴포넌트 — canvas 내부 또는 DOM, developer 재량)

| 상태 | 화면 텍스트 | 접근성 이름(aria) | 강조 색 |
| --- | --- | --- | --- |
| `ready` | `READY` | "준비 상태" | 흰색 |
| `playing` | (오버레이 없음, HUD SCORE 갱신) | "진행 중" | — |
| `paused` | `PAUSED` | "일시정지" | 흰색 |
| `gameover` | `GAME OVER` | "게임 오버" | `--color-mario`(`#d82800`) |
| `cleared` | `CLEARED` | "클리어" | `#f8d800`(보조) |

- **모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출**한다(frozen · planner §2.4).
- 상태 전이가 스크린리더에 전달되도록 상태 텍스트 영역에 `aria-live="assertive"`(오버레이) 적용 권장(보조).

---

## 6. dev 구현 가이드 (developer 참조 — 픽셀 일치 의무 없음)

> developer 소유 파일(`supermario/index.html`·`src/game.js`·`src/level-1-1.js`)에서 아래를 참조. selector·token 은 그대로 준수.

1. **`:root` 토큰 정의** (`index.html`):
   ```css
   :root{
     --color-sky:#5c94fc;
     --color-ground:#c84c0c;
     --color-brick:#e45c10;
     --color-mario:#d82800;
     --space-hud-gap:12px;
   }
   ```
   canvas 렌더 색상도 위 값을 상수 1곳에서 참조(하드코딩 재정의 금지).

2. **HUD 레이아웃** (`.game__hud`):
   ```css
   .game__hud{ display:flex; justify-content:space-between; align-items:center;
               gap:var(--space-hud-gap); }
   ```
   좁은 화면에서 `game-score` 와 `game-start` 겹침 금지.

3. **canvas 반응형** (`.game__canvas`):
   ```css
   .game__canvas{ display:block; max-width:100%; height:auto;
                  image-rendering:pixelated; } /* 논리 해상도 고정, CSS 폭만 축소 */
   ```

4. **상태 텍스트 노출**: 상태별 대문자 텍스트(`READY`/`PAUSED`/`GAME OVER`/`CLEARED`)를 canvas `fillText` 또는 DOM 오버레이로 렌더하고, 접근성 이름(§5.6)을 함께 노출(색상 단독 구분 금지).

5. **초기화 복구**: `game-start` 재조작 시 상태 `ready`·SCORE `000000` 복귀, control 재사용 가능(AC-5).

6. **키보드 조작**: ←→ 이동, `Space`/`↑` 점프. 방향키·Space `preventDefault`.

권장 CSS 변수명/클래스명은 위 frozen selector 를 그대로 사용한다. 새 selector·token 도입 금지.

---

## 7. mockup 참조

- **시각 mockup HTML**: `docs/design/mockups/supermario-BF-1876.html`
- 단일 self-contained HTML(외부 의존 0건, 인라인 `<style>`).
- frozen DOM 구조·selector 를 그대로 사용하고, 계약 토큰을 `:root` 에 정의해 팔레트/HUD/타이포/반응형을 시각화한다.
- 5개 상태(`ready`/`playing`/`paused`/`gameover`/`cleared`)를 `<section>` 으로 나란히 배치해 상태별 화면 텍스트·HUD·오버레이를 한 화면에서 비교할 수 있게 한다.
- **이 mockup 은 developer 의 runtime 산출물이 아니며 시안 시각화 전용**이다. developer 는 참조 가이드로만 사용하고 픽셀 단위 일치 의무는 없다.

---

## 8. Self-critique

1. **AC 매핑**: planner §7 AC-1~AC-7 과 §2 UI 계약을 §4(레이아웃)·§5(컴포넌트)·§6(dev 가이드)에 매핑. 5개 상태 화면 텍스트·HUD 레이아웃은 §4.3·§5.6 에 명시(수용 기준 충족).
2. **dev 구현 가이드**: §6 에 CSS 변수·클래스·반응형·상태 노출·초기화 복구를 단계별 지침으로 제공.
3. **기존 요소 보존**: frozen selector/token 을 변경·재정의하지 않고 그대로 반영. mockup 도 동일 selector 사용. 새 파일·runtime 코드 미생성.
4. **컴포넌트 매핑**: 5개 DOM ID / 5개 CSS class 를 §5 컴포넌트 명세에 1:1 매핑.
5. **모호함 flag**:
   - 상태 오버레이를 canvas `fillText` 로 그릴지 DOM 오버레이로 그릴지는 **developer 재량**(계약 아님)으로 명시. 접근성 이름 노출만 필수.
   - HUD 배경/텍스트 색·오버레이 막·`cleared` 옐로는 **계약 토큰이 아닌 mockup 보조값**임을 §2.2 에 분리 표기(토큰 재정의 아님).
   - `paused` 재개 키(`KeyP` 등)는 planner 가 developer 재량으로 남긴 부분 → 본 명세도 강제하지 않음.
