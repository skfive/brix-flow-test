# 디지털 시계 — 시각 명세 및 mockup (BF-1807)

> designer 산출물 · packet=`design` · task BF-1808 · 대상 Epic BF-1807
> 본 문서는 frozen Execution Blueprint(`ui-contract@v1`)와 planner 실행 설계(`docs/plans/BF-1807/implementation-plan.md`)를
> **재정의하지 않고** 시각 명세로 표현한다.
> **selector·상태·token은 동결값이며 designer는 새 selector·token을 도입하지 않는다.**
> 본 문서는 런타임 HTML/CSS/JS를 생성하지 않는다 — 아래 코드 블록은 dev 참조용 시각 명세일 뿐 실행 산출물이 아니다.
> 런타임 파일(`iteration-check/clock.html`·`clock.js`·`format-time.js`)은 developer 소유이다.

---

## 1. 시안 개요

- **변경 범위**: 브라우저에서 현재 시각을 1초 간격으로 표시하는 순수 정적(vanilla-static) 디지털 시계 단일 화면.
- **사용자 경험 목표**:
  - 페이지 진입 즉시 현재 시각이 보이고 1초마다 자연스럽게 갱신된다.
  - 12시간제 ↔ 24시간제를 한 번의 토글로 전환하며, 버튼 라벨이 "다음에 전환될 형식"을 안내해 다음 동작을 예측할 수 있다.
  - 어두운 표면 위 고대비 mono 텍스트로 시각을 한눈에 읽고, 스크린리더 사용자는 갱신·토글 목적을 접근성 이름으로 인지한다.
- **화면 구성**: 어두운 표면(`--color-surface`) 중앙에 대형 mono 시각 텍스트와 그 아래 형식 토글 버튼 1개.

---

## 2. 컬러 팔레트

> 모든 색상은 `iteration-check/tokens.css`의 CSS 변수를 `var()`로만 소비한다. 아래 HEX는 동결된 토큰 값(참조용)이며 스타일에 직접 기입하지 않는다.

| 역할 | 토큰(변수) | 값(HEX) | 적용 요소 |
| --- | --- | --- | --- |
| 배경 표면 | `--color-surface` | `#0f172a` | 페이지/시계 루트 배경 |
| 시각 텍스트 | `--color-text-primary` | `#f8fafc` | `#clock-time` 텍스트, 토글 라벨 텍스트 |
| 강조 | `--color-accent` | `#38bdf8` | `#clock-toggle` 테두리/포커스 링/hover 강조 |

- **명도 대비**: `--color-text-primary`(`#f8fafc`) on `--color-surface`(`#0f172a`)는 고대비로 대형 시각 텍스트 가독성을 보장한다.
- 신규 색상 토큰을 추가하지 않는다. 위 3개 색상 토큰만 사용한다.

---

## 3. 타이포그래피

| 계층 | 요소 | font-family | size(권장) | weight | line-height | 비고 |
| --- | --- | --- | --- | --- | --- |
| 시각 표시 | `#clock-time` | `var(--font-family-mono)` (`monospace`) | `clamp` 반응형(§5 참조) | 700 | 1.1 | 자리 이동 없는 mono, 초 단위 갱신 시 흔들림 방지 |
| 토글 라벨 | `#clock-toggle` | `var(--font-family-mono)` (`monospace`) | 1rem | 500 | 1.2 | 상태명("24시간제로"/"12시간제로") 노출 |

- **mono 고정폭의 이유**: `hh:mm:ss` 각 자리 폭이 일정해 1초 갱신 시 숫자 폭 변화로 인한 좌우 흔들림이 없다.
- 폰트 값은 `var(--font-family-mono)`로만 소비하고 `monospace`를 직접 기입하지 않는다.
- 신규 폰트/웹폰트 CDN을 도입하지 않는다(vanilla-static, 외부 의존성 0건).

---

## 4. 레이아웃

### 4.1 구조 (동결 selector)

| 요소 | DOM ID | class | 역할 |
| --- | --- | --- | --- |
| 루트 컨테이너 | `clock-root` | `clock` | 세로 중앙 정렬 flex 컨테이너, 배경 표면 |
| 시각 표시 | `clock-time` | `clock__time` | 대형 mono 시각 텍스트, `aria-live` 영역 |
| 형식 토글 버튼 | `clock-toggle` | `clock__toggle` | 12/24 형식 전환 `<button>` |

### 4.2 배치 (와이어프레임)

```
┌──────────────────────────────────────────┐  ← #clock-root (.clock)
│                                          │     배경: var(--color-surface)
│                                          │     세로/가로 중앙 정렬
│            09:05:03 PM                   │  ← #clock-time (.clock__time)
│                                          │     색: var(--color-text-primary)
│                                          │     폰트: var(--font-family-mono)
│           [   24시간제로   ]              │  ← #clock-toggle (.clock__toggle)
│                                          │     간격(위): var(--space-md)
│                                          │
└──────────────────────────────────────────┘
```

### 4.3 spacing

- 시각 표시와 토글 버튼 사이 수직 간격: `var(--space-md)`(`16px`).
- 토글 버튼 내부 패딩: `var(--space-md)` 기반(예: `var(--space-md)` 세로·좌우). 신규 간격 토큰을 추가하지 않는다.
- 루트 컨테이너 여백: `var(--space-md)`로 표면 가장자리와 콘텐츠 사이 최소 여백 확보(320px에서 overflow 방지).

### 4.4 breakpoint 별 동작

| 뷰포트 폭 | 동작 |
| --- | --- |
| `≥ 320px` (기준 하한) | 시각 표시 + 토글이 세로 스택으로 overflow 없이 배치. 시각 텍스트는 축소된 폰트로 한 줄 유지. |
| 넓은 화면 | 시각 텍스트 폰트가 상한까지 확대되어 시인성 강화. 레이아웃 스택 구조는 동일. |

- 반응형 폰트는 `clamp()`로 하한·상한을 두어 폭이 줄어도 텍스트가 잘리지 않는다(§5.1 `--clock-time` 스타일 참조).

---

## 5. 컴포넌트 명세

### 5.1 `#clock-time` (`.clock__time`) — 시각 표시

- **역할**: 현재 시각을 선택된 형식으로 표시. 1초 간격 갱신.
- **상태 ↔ 텍스트(동결)**:

| 상태 | 표시 텍스트 | 예시 | 갱신 주기 |
| --- | --- | --- | --- |
| 12시간제(초기) | `hh:mm:ss AM/PM` | `09:05:03 PM` | 1초 |
| 24시간제 | `HH:mm:ss` | `21:05:03` | 1초 |

- **접근성**: 이 영역은 `aria-live="polite"`로 갱신을 스크린리더에 통지한다.
- **스타일 예시(참조용 — var()만 소비, 하드코딩 없음)**:

```css
/* dev 참조용 — 실제 구현은 developer 소유 iteration-check/ 에서 tokens.css 를 link 후 사용 */
.clock__time {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-weight: 700;
  line-height: 1.1;
  /* 폭이 줄어도 잘리지 않도록 하한/상한을 둔 반응형 크기 */
  font-size: clamp(2rem, 12vw, 5rem);
}
```

### 5.2 `#clock-toggle` (`.clock__toggle`) — 형식 토글 버튼

- **역할**: 클릭 시 12시간제 ↔ 24시간제 전환. 시맨틱 `<button>`.
- **라벨 ↔ 상태(동결)**: 라벨은 "다음에 전환될 형식"을 안내한다.

| 현재 상태 | 버튼 라벨(화면 텍스트) | 클릭 후 전환 |
| --- | --- | --- |
| 12시간제 | `24시간제로` | → 24시간제 |
| 24시간제 | `12시간제로` | → 12시간제 |

- **props/속성**:
  - `type="button"` (form submit 방지)
  - `aria-label="시간 형식 전환"` (동결 — 버튼 목적을 접근성 이름으로 노출)
- **상태(인터랙션)**:

| 상태 | 시각 표현 |
| --- | --- |
| 기본(rest) | `--color-accent` 테두리 + `--color-text-primary` 텍스트 |
| hover | `--color-accent` 배경 채움 강조(대비 유지) |
| focus-visible | `--color-accent` 포커스 링(키보드 접근성) |
| active(눌림) | 살짝 축소/눌림 피드백(정적 표현) |

- **스타일 예시(참조용 — var()만 소비)**:

```css
.clock__toggle {
  margin-top: var(--space-md);
  padding: var(--space-md);
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  background: transparent;
  border: 1px solid var(--color-accent);
}
.clock__toggle:hover {
  background: var(--color-accent);
  color: var(--color-surface);
}
.clock__toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### 5.3 상태 전환 다이어그램

```
        [초기 로드]
             │
             ▼
   ┌─────────────────────┐   클릭 #clock-toggle
   │ 12시간제 (is24=false)│ ───────────────────►┐
   │ time: hh:mm:ss AM/PM │                     │
   │ label: 24시간제로     │ ◄───────────────────┘
   └─────────────────────┘   클릭 #clock-toggle
             ▲                        │
             └────────────────────────┘
                                      ▼
                       ┌─────────────────────┐
                       │ 24시간제 (is24=true) │
                       │ time: HH:mm:ss       │
                       │ label: 12시간제로     │
                       └─────────────────────┘
```

- 토글 직후 다음 tick을 기다리지 않고 현재 형식으로 **즉시 재렌더**(1초간 이전 형식 잔존 방지 — plan §6).
- 초기화·취소·실패 후에는 표시 상태를 초기값(12시간제)으로 되돌리고 `#clock-toggle`을 다시 사용할 수 있어야 한다(plan §6 후조건).

---

## 6. dev 구현 가이드

> selector·class·token은 **동결값**이다. 아래는 그 동결값을 그대로 따르는 지침이며 새 이름을 만들지 않는다.

1. **마크업 골격** (`iteration-check/clock.html`, developer 소유):
   - 루트: `<div id="clock-root" class="clock">`
   - 시각: `<div id="clock-time" class="clock__time" aria-live="polite">…</div>`
   - 토글: `<button id="clock-toggle" class="clock__toggle" type="button" aria-label="시간 형식 전환">24시간제로</button>`
   - `<head>`에서 `iteration-check/tokens.css`를 `<link>`로 연결하고, `clock.js`를 ESM(`type="module"`)으로 로드.
2. **스타일**: 위 §2·§5 스타일 예시처럼 모든 색상·간격·폰트를 `var(--토큰명)`으로만 소비한다. HEX/px/`monospace`를 직접 기입하지 않는다(plan AC-7).
3. **폰트 크기**: `.clock__time`은 `clamp()`로 하한·상한을 둬 320px에서도 한 줄로 잘리지 않게 한다(plan AC-6).
4. **상태 텍스트**: §5.1·§5.2 표의 라벨·형식 문자열을 그대로 사용한다(초기값 12시간제, 라벨 `24시간제로`).
5. **접근성**: `#clock-time`에 `aria-live="polite"`, `#clock-toggle`에 `aria-label="시간 형식 전환"`. 현재 형식은 색상만이 아니라 토글 라벨 텍스트로도 구분되게 한다(plan AC-5).
6. **로직 분리**(참고): `format-time.js`(순수 함수, 형식 문자열 생성) ↔ `clock.js`(DOM 바인딩·1초 타이머·토글 상태). 자정/정오 경계(`00:00:00`→`12:00:00 AM`, `12:00:00`→`12:00:00 PM`)·zero-pad는 순수 함수 단위 테스트로 고정(plan §5·§6).

> ⚠️ 위 CSS 클래스/HTML 예시는 **참조 가이드**이며 dev의 픽셀 단위 일치 의무는 없다. selector·token·상태 텍스트만 동결값을 지킨다.

---

## 7. mockup 참조

frozen 계약(AC-3)상 본 task 산출물은 이 단일 명세 문서이며 별도 런타임 HTML/CSS/JS 파일은 생성하지 않는다.
실행 가능한 mockup(`iteration-check/clock.html`)은 developer 소유이므로, 아래에 **문서 내 시각 mockup**을 self-contained HTML/CSS 스냅샷으로 임베드해 시안을 시각화한다(참조·검토용, 실행 산출물 아님).

### 7.1 12시간제(초기) 시각 mockup

```html
<!-- 시각 명세 스냅샷 (참조용) — 동결 selector/token 그대로 표현 -->
<style>
  /* mockup 한정: tokens.css 미링크 상태에서 시각화를 위해 :root 값을 미러링.
     실제 구현은 tokens.css 를 link 하고 var() 로만 소비한다(§6). */
  :root {
    --color-surface: #0f172a;
    --color-text-primary: #f8fafc;
    --color-accent: #38bdf8;
    --font-family-mono: monospace;
    --space-md: 16px;
  }
  .clock {
    min-height: 240px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: var(--space-md); padding: var(--space-md);
    background: var(--color-surface);
  }
  .clock__time {
    color: var(--color-text-primary);
    font-family: var(--font-family-mono);
    font-weight: 700; line-height: 1.1;
    font-size: clamp(2rem, 12vw, 5rem);
  }
  .clock__toggle {
    padding: var(--space-md);
    color: var(--color-text-primary);
    font-family: var(--font-family-mono);
    background: transparent;
    border: 1px solid var(--color-accent);
  }
  .clock__toggle:hover { background: var(--color-accent); color: var(--color-surface); }
  .clock__toggle:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
</style>

<div id="clock-root" class="clock">
  <div id="clock-time" class="clock__time" aria-live="polite">09:05:03 PM</div>
  <button id="clock-toggle" class="clock__toggle" type="button" aria-label="시간 형식 전환">24시간제로</button>
</div>
```

### 7.2 24시간제(토글 후) 시각 mockup

- 동일 마크업·스타일에서 텍스트/라벨만 상태에 따라 바뀐다:
  - `#clock-time` → `21:05:03`
  - `#clock-toggle` 라벨 → `12시간제로`

```
┌──────────────────────────────────────────┐
│                                          │
│            21:05:03                      │  ← #clock-time (24시간제)
│                                          │
│           [   12시간제로   ]              │  ← #clock-toggle 라벨 전환
│                                          │
└──────────────────────────────────────────┘
```

### 7.3 반응형(320px) 시각 mockup

```
320px ┌──────────────────────┐
      │                      │
      │   09:05:03 PM        │  ← clamp() 하한 폰트, 한 줄 유지·overflow 없음
      │                      │
      │  [  24시간제로  ]     │  ← 세로 스택, 버튼 좌우 여백 var(--space-md)
      │                      │
      └──────────────────────┘
```

---

## 8. Self-critique

PR 제출 직전 자기 점검 — dev가 받기 전 명세 누락/모호함 검증.

1. **AC 매핑**: plan AC-1~AC-7을 §5(상태·라벨), §4.4·§5.1(반응형), §2·§5(토큰 var() 소비), §5.2·§6(접근성)로 각각 커버. ✅
2. **dev 구현 가이드**: §6에 동결 selector·class·`type`·`aria-*`·`var()` 소비·`clamp()`·로직 분리까지 단계별 명시. ✅
3. **기존 요소 보존**: 신규 selector·token·색상·폰트 도입 없음. 계약의 3색상·1폰트·1간격 토큰만 사용. `iteration-check/` 밖 파일 및 developer 소유 파일 미생성. ✅
4. **컴포넌트 매핑**: 3개 요소(`clock-root`/`clock-time`/`clock-toggle`) ↔ 동결 DOM ID·class·상태 텍스트 1:1 매핑(§4.1·§5). ✅
5. **모호함 flag**: 폰트 `clamp()` 하한/상한, 버튼 hover/active 시각 강도는 **권장값**이며 dev 재량 허용(픽셀 일치 의무 없음). 색상 대비·selector·상태 텍스트·접근성 이름은 동결로 재량 없음. 남은 모호함 없음.
