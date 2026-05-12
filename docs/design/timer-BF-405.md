# 타이머 SPA 디자인 명세 (BF-405)

> 관련 task: BF-406 (designer · 본 문서) → BF-407 (developer · `/timer` 구현) → BF-408 (reviewer)
> 후속 dev 산출물 예정 경로: `timer/index.html`, `timer/styles.css`, `timer/main.js`, `timer/storage.js`
> 작성자: 개발자-알파 (designer 위임 단독 실행)
> 참조 패턴: `docs/design/notepad-BF-400.md` (동일 프로젝트의 선행 SPA 명세)

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 SPA 페이지 `/timer` — `timer/index.html` 단일 페이지
- 단일 카운트다운 타이머 (mm:ss). 시간 입력 → 시작 → 일시정지/재개 → 리셋 → 종료 알림
- vanilla HTML/CSS/JS 기반 — 외부 UI 프레임워크 없음 (notepad 와 동일 스택)
- localStorage `timer:` prefix 로 마지막 입력값과 상태 영속화 (BF-407 가 구현)

### 1.2 사용자 경험 목표
- **단순함**: 한 화면에서 입력·실행·제어가 모두 보임. 모드 전환 없음
- **시각적 인지성**: 진행 중에는 큰 숫자 (mm:ss) 가 화면의 시선 중심을 차지
- **상태 명료성**: running / paused / ended / 빈상태(0:00) 의 시각 톤이 즉시 구분 가능
- **키보드 우선**: 마우스 없이 Space/Esc 만으로 시작·일시정지·리셋 일관 조작

### 1.3 비범위 (Out of Scope · BF-405)
다음 항목은 **본 spec 및 BF-407 구현에서 명시적으로 제외**. 후속 Epic 에서 별도 spec 필요.

| 비범위 항목 | 사유 |
|---|---|
| 다중 타이머 (병렬 다개) | 단일 인스턴스 v1 — 멀티 인스턴스는 list/route 설계 변경이 필요 |
| 사운드/오디오 알림 | autoplay 정책·볼륨 UI 가 필요. v1 은 시각 + 문서 타이틀 표시로 한정 |
| `Notification` Web API | 권한 요청 UX + service-worker 가 별도 spec 필요 |
| 시간 프리셋 (5분/10분/뽀모도로 25분) | 입력 UX 가 별도. v1 은 자유 입력 only |
| 카운트업 (스톱워치) 모드 | 별도 메인 인터랙션. v1 은 카운트다운 only |
| 진행률 ring/progress bar 시각화 | 보조 표현일 뿐 큰 숫자가 1순위. v2 에서 검토 |
| 다중 사용자/동기화 | localStorage local-only (notepad 와 동일 정책) |

---

## 2. 디자인 토큰

> notepad-BF-400 의 토큰을 **그대로 재사용** (color/space/radius/typography). timer 전용 토큰만 §2.2 에서 추가 정의. 토큰 충돌 없음 — 모두 새 키.

### 2.1 재사용 토큰 (notepad-BF-400 §2.1 / §2.2 / §2.3 참조)
- 색상: `--color-bg-canvas`, `--color-bg-surface`, `--color-bg-subtle`, `--color-border-default`, `--color-border-strong`, `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-accent`, `--color-accent-hover`, `--color-danger`, `--color-danger-hover`, `--color-focus-ring`
- 간격: `--space-1` ~ `--space-7` (4px scale)
- 반경: `--radius-sm` `4px`, `--radius-md` `8px`, `--radius-lg` `12px`
- 타이포: `--text-h1`, `--text-h2`, `--text-body`, `--text-caption`, `--text-button`, `--font-sans`, `--font-mono`

### 2.2 timer 전용 추가 토큰 (신규)

| 토큰명 | Light | Dark | 용도 |
|---|---|---|---|
| `--color-timer-running` | `#3563E9` | `#5B82F0` | running 상태의 large display 텍스트 색 (accent 와 동일 hue, 명확한 진행 표시) |
| `--color-timer-paused` | `#B58A1A` | `#D9AD3C` | paused 상태의 large display 텍스트 색 (amber — "주의·정지" 의미) |
| `--color-timer-ended-bg` | `#FDECEC` | `#3A1F1F` | 종료 알림 배너 배경 (danger 의 약한 톤) |
| `--color-timer-ended-border` | `#F3B7B7` | `#7A3A3A` | 종료 알림 배너 좌측 띠 (4px solid) |
| `--color-timer-ended-text` | `#7A1F1F` | `#F5C7C7` | 종료 알림 본문 텍스트 색 |

> 5개 토큰 모두 light/dark 쌍 정의. dev 구현 시 `:root` 와 `[data-theme="dark"]` selector 양쪽에 등록.

### 2.3 timer display 전용 타이포

mm:ss 큰 숫자 표시용. 등폭 (tabular) 숫자로 자릿수 흔들림 방지.

| 토큰명 | 값 |
|---|---|
| `--text-timer-display` | `700 144px/1.0 var(--font-mono)` (desktop ≥ 960px) |
| `--text-timer-display-md` | `700 112px/1.0 var(--font-mono)` (640–959px) |
| `--text-timer-display-sm` | `700 84px/1.0 var(--font-mono)` (< 640px) |
| `--text-timer-label` | `500 13px/1.2 var(--font-sans)` (display 상단의 상태 라벨) |
| `--text-input-time` | `600 40px/1.2 var(--font-mono)` (시간 입력 필드 자체 폰트) |

`font-variant-numeric: tabular-nums` 를 display·input 양쪽에 적용 — 1·8·0 자릿수 폭 차이로 인한 점프 방지.

---

## 3. 정보 구조 / 화면 구성

```
┌───────────────────────────────────────────────────────────┐
│ Topbar  · "타이머"  · [🌙 토글]                              │  56px
├───────────────────────────────────────────────────────────┤
│                                                           │
│           [상태 라벨 — "준비됨" / "진행 중" / …]              │
│                                                           │
│                    ┌─────────────┐                        │
│                    │   25:00     │  ← large display       │
│                    └─────────────┘     (144px mono)       │
│                                                           │
│         ┌─ 시간 입력 (mm/ss split) ─┐                       │
│         │  [ 25 ] : [ 00 ]         │                       │
│         └───────────────────────────┘                      │
│                                                           │
│    [ ▶ 시작 ]   [ ⏸ 일시정지 ]   [ ↺ 리셋 ]                │
│                                                           │
│  (ended 시 본 위치에 종료 배너 표시)                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

- 단일 column · 가운데 정렬
- 최대 컨테이너 폭 `560px`, `margin: 0 auto`, 상하 `padding: var(--space-7) var(--space-5)`
- 큰 숫자가 시선의 중심 (수직 중앙 부근)

---

## 4. 와이어 5종 (필수 상태별)

각 와이어는 **동일 컨테이너 내부에서 상태에 따라 토글되는 단일 페이지** 표현. JS 가 `data-state` 속성으로 전환.

### 4.1 와이어 ① — 빈 상태 (`data-state="idle-empty"`)

조건: localStorage 에 직전 값 없음. 첫 방문이거나 reset 직후.

```
┌──────────────────────────────────────┐
│            준비됨                       │  ← text-timer-label, muted
│                                      │
│           00:00                      │  ← text-timer-display, muted (#9A9A93)
│                                      │
│     [ 00 ] : [ 00 ]                   │  ← input, placeholder "MM" / "SS"
│                                      │
│   [▶ 시작]ᵈⁱˢᵃᵇˡᵉᵈ  [⏸ 일시정지]ᵈⁱˢᵃᵇˡᵉᵈ  [↺ 리셋]ᵈⁱˢᵃᵇˡᵉᵈ │
└──────────────────────────────────────┘
```

- display 색: `--color-text-muted` (실행 가능한 시간 없음을 약하게 표현)
- 모든 control 버튼 `disabled` (입력값 0:00 이므로 시작할 게 없음)
- 입력값을 > 0 으로 바꾸는 순간 `data-state="idle-ready"` 로 전이

### 4.2 와이어 ② — 시작 (running, `data-state="running"`)

조건: 시작 버튼 클릭 또는 Space (idle/paused 상태에서)

```
┌──────────────────────────────────────┐
│            진행 중                      │  ← label, color: --color-timer-running
│                                      │
│           24:58                      │  ← display, color: --color-timer-running
│                                      │
│     [ 25 ]ᵈⁱˢᵃᵇˡᵉᵈ : [ 00 ]ᵈⁱˢᵃᵇˡᵉᵈ      │  ← 입력 잠금 (회색 톤)
│                                      │
│   [▶ 시작]ᵈⁱˢᵃᵇˡᵉᵈ  [⏸ 일시정지]  [↺ 리셋]   │
└──────────────────────────────────────┘
```

- display·label 색: `--color-timer-running`
- 시간 입력 `disabled` + `--color-text-muted` 처리
- 시작 버튼 disabled, 일시정지·리셋 활성
- 매 1초 tick — display 텍스트만 갱신 (다른 DOM 흔들림 없음, `font-variant-numeric: tabular-nums` 로 폭 고정)
- 페이지 `<title>` 을 `"24:58 · 타이머"` 형태로 동기 갱신 (브라우저 탭 알림 대용)

### 4.3 와이어 ③ — 일시정지 (paused, `data-state="paused"`)

조건: running 중 일시정지 버튼 또는 Space

```
┌──────────────────────────────────────┐
│           일시정지                      │  ← label, color: --color-timer-paused
│                                      │
│           17:32                      │  ← display, color: --color-timer-paused
│                                      │
│     [ 25 ]ᵈⁱˢᵃᵇˡᵉᵈ : [ 00 ]ᵈⁱˢᵃᵇˡᵉᵈ      │  ← 잠금 유지
│                                      │
│   [▶ 시작]ᵃᶜᵗⁱᵛᵉ  [⏸ 일시정지]ᵈⁱˢᵃᵇˡᵉᵈ  [↺ 리셋]│
└──────────────────────────────────────┘
```

- display·label 색: `--color-timer-paused` (amber)
- 시작 버튼이 재개 (resume) 역할 — 라벨은 동일하게 "▶ 시작" 유지 (모드 단순화)
- tick 정지 — `<title>` 도 같이 멈춤 (현재 값 유지)

### 4.4 와이어 ④ — 리셋 (reset → idle, `data-state="idle-ready"`)

조건: 리셋 버튼 또는 Esc

리셋 후 화면은 §4.1 의 빈 상태와 거의 동일하나, **입력값이 비어있지 않음** (직전 값 유지) 인 경우 `idle-ready` 로 분기:

```
┌──────────────────────────────────────┐
│            준비됨                       │  ← label, muted
│                                      │
│           25:00                      │  ← display, --color-text-primary (선명)
│                                      │
│     [ 25 ] : [ 00 ]                   │  ← 입력 활성·focusable
│                                      │
│   [▶ 시작]   [⏸ 일시정지]ᵈⁱˢᵃᵇˡᵉᵈ  [↺ 리셋]ᵈⁱˢᵃᵇˡᵉᵈ│
└──────────────────────────────────────┘
```

- display 색: 일반 `--color-text-primary` (실행 가능 표시)
- 시작 버튼 활성, 일시정지·리셋 disabled (아직 진행 중이 아님)
- 입력값 0:00 으로 다시 비우면 §4.1 와이어 ① 로 전환

### 4.5 와이어 ⑤ — 종료 알림 (ended, `data-state="ended"`)

조건: running 중 display 가 00:00 도달

```
┌──────────────────────────────────────┐
│            종료됨                       │  ← label, color: --color-timer-ended-text
│                                      │
│           00:00                      │  ← display, color: --color-timer-ended-text
│                                      │
│  ┌──────────────────────────────────┐│
│  ┃ ⏰ 타이머가 끝났습니다.              ││  ← 알림 배너
│  ┃    설정한 25:00 이 모두 경과했어요.   ││
│  └──────────────────────────────────┘│
│                                      │
│     [ 25 ] : [ 00 ]                   │  ← 입력 활성 (이전 값 표시)
│                                      │
│   [▶ 시작]   [⏸ 일시정지]ᵈⁱˢᵃᵇˡᵉᵈ  [↺ 리셋]   │
└──────────────────────────────────────┘
```

- display·label 색: `--color-timer-ended-text`
- 종료 배너: `background: --color-timer-ended-bg`, `border-left: 4px solid --color-timer-ended-border`, `padding: var(--space-3) var(--space-4)`, `border-radius: --radius-md`, `role="alert"`, `aria-live="assertive"`
- 페이지 `<title>` 을 `"⏰ 종료 · 타이머"` 로 변경
- 리셋 또는 시작 누르면 배너 사라짐 (`data-state` 전환)
- `document.visibilityState === "hidden"` 인 동안 종료가 발생하면 다음 visible 전환 시점에도 배너 유지 (사용자가 놓치지 않도록)

---

## 5. 컴포넌트 명세

### 5.1 `<TimerDisplay>` (큰 숫자)

```html
<div class="display" role="timer" aria-live="off" aria-atomic="true">
  <span class="display__label" id="display-label">준비됨</span>
  <output class="display__time" id="display-time">00:00</output>
</div>
```

| state | display 텍스트 색 | label 색 | label 텍스트 |
|---|---|---|---|
| idle-empty | `--color-text-muted` | `--color-text-muted` | "준비됨" |
| idle-ready | `--color-text-primary` | `--color-text-secondary` | "준비됨" |
| running | `--color-timer-running` | `--color-timer-running` | "진행 중" |
| paused | `--color-timer-paused` | `--color-timer-paused` | "일시정지" |
| ended | `--color-timer-ended-text` | `--color-timer-ended-text` | "종료됨" |

- 폰트: `--text-timer-display` (desktop) / `-md` / `-sm` 미디어쿼리 분기
- `aria-live="off"` (1초마다 읽지 않음). 상태 전환 시점에만 별도 `<div aria-live="polite">` 로 "타이머 시작" / "일시정지" / "리셋" / "타이머 종료" 안내

### 5.2 `<TimeInput>` (mm/ss split)

```html
<div class="time-input" role="group" aria-label="시간 설정">
  <input id="input-mm" type="number" min="0" max="59" inputmode="numeric"
         class="time-input__field" placeholder="MM" aria-label="분" />
  <span class="time-input__sep" aria-hidden="true">:</span>
  <input id="input-ss" type="number" min="0" max="59" inputmode="numeric"
         class="time-input__field" placeholder="SS" aria-label="초" />
</div>
```

- 각 입력 width `120px`, height `64px`, padding `var(--space-3)`
- 폰트 `--text-input-time` (`600 40px/1.2 mono`, tabular-nums)
- 텍스트 정렬 center, `border: 2px solid var(--color-border-strong)`, `border-radius: --radius-md`
- focus: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`
- running / paused 상태에서 `disabled` (CSS `[disabled]` selector 로 톤 다운: `opacity: 0.55`, `cursor: not-allowed`)
- 0~59 범위 외 입력 시 onBlur 에 자동 clamp (e.g. 75 → 59). 음수·문자는 input type=number 가 자체 차단
- 두 자릿수 미만 입력은 표시상 zero-padding 없이 보이되 storage 직렬화 시점에 정규화 (디스플레이는 mm:ss 항상 zero-pad)

### 5.3 `<TimerControls>` (3개 버튼)

```html
<div class="controls" role="group" aria-label="타이머 컨트롤">
  <button id="btn-start" class="btn btn--primary">▶ 시작</button>
  <button id="btn-pause" class="btn btn--ghost">⏸ 일시정지</button>
  <button id="btn-reset" class="btn btn--danger-ghost">↺ 리셋</button>
</div>
```

| state | start | pause | reset |
|---|---|---|---|
| idle-empty | disabled | disabled | disabled |
| idle-ready | enabled | disabled | disabled |
| running | disabled | enabled | enabled |
| paused | enabled (resume) | disabled | enabled |
| ended | enabled (재시작) | disabled | enabled |

- 버튼 공통: notepad §5.1 의 `<Button>` 토큰 재사용 — height `44px` (timer 는 조금 더 큰 hit area), padding `0 var(--space-5)`, border-radius `--radius-md`, font `--text-button`
- 컨트롤 row 의 버튼 간 gap `var(--space-3)`
- 모든 버튼에 `aria-keyshortcuts` 명시 (start/pause = "Space", reset = "Escape")
- disabled 상태에서도 layout 폭 유지 (CSS `visibility` 가 아닌 `disabled` 속성 + opacity)

### 5.4 `<EndedBanner>` (종료 알림)

```html
<div class="banner banner--ended" role="alert" aria-live="assertive" hidden>
  <div class="banner__icon" aria-hidden="true">⏰</div>
  <div class="banner__text">
    <strong>타이머가 끝났습니다.</strong>
    <span id="banner-detail">설정한 25:00 이 모두 경과했어요.</span>
  </div>
</div>
```

- bg `--color-timer-ended-bg`, 좌측 4px solid `--color-timer-ended-border`, text `--color-timer-ended-text`
- padding `var(--space-3) var(--space-4)`, radius `--radius-md`
- icon 폭 `32px`, text `--text-body`
- ended → idle 전환 시 `hidden` 토글로 제거
- 진입 시 200ms `opacity` fade-in (prefers-reduced-motion 시 즉시)

---

## 6. 키보드 접근성

### 6.1 포커스 표시 (일관 정책)

- 모든 focusable 요소 (input, button) 에 `:focus-visible` 만 outline 노출 — 마우스 클릭 시 outline X
- outline: `2px solid var(--color-focus-ring)`, `outline-offset: 2px`, `border-radius` 는 요소의 radius 와 동일
- input 의 focus 는 outline 외에 `border-color: --color-accent` 추가 (텍스트 입력 가시성 강화)

### 6.2 단축키 표

| 키 | 컨텍스트 | 동작 | 비고 |
|---|---|---|---|
| `Space` | body / 컨트롤 버튼 focus | idle-ready → running, running → paused, paused → running 토글 | input focus 시 양보 (아래 참고) |
| `Esc` | 어디서나 | reset (running/paused/ended → idle-ready) | input focus 시에도 reset 동작 (단, 입력 중인 값은 보존) |
| `Tab` / `Shift+Tab` | 전역 | topbar 토글 → input-mm → input-ss → 시작 → 일시정지 → 리셋 순환 | DOM 순서대로 |
| `Enter` | input-mm focus 시 | input-ss 로 이동 | 자동 진행 편의 |
| `Enter` | input-ss focus 시 | 시작 버튼 클릭 (값 > 0 일 때) | 빠른 시작 |
| `↑` / `↓` | input-mm 또는 input-ss focus 시 | 값 +1 / -1 (input type=number 기본 동작) | 0~59 clamp |

#### Space 양보 규칙 (필수)

input (mm/ss) 이 focus 인 상태에서 `Space` 키는 **타이머 토글에 사용하지 않는다**. 이유:
1. 숫자 input 에서 Space 는 브라우저별 동작이 모호 (Chrome 무시 / Safari 무시 / 일부 환경 caret 이동)
2. 사용자가 Space 를 "공백 입력 시도" 로 오인할 수 있음 — 토글이 트리거되면 혼란

구현 규약 (BF-407 에 위임):
- 전역 `keydown` 리스너에서 `event.target` 이 `INPUT` 이고 `event.code === "Space"` 인 경우 `return` (preventDefault X, 자체 토글 X)
- Space 토글은 body 또는 컨트롤 버튼 focus 일 때만 동작

### 6.3 ARIA / 라이브 영역

| 요소 | role | aria-live | aria-keyshortcuts |
|---|---|---|---|
| `<output id="display-time">` | timer | `off` (1초마다 읽기 차단) | — |
| 상태 전환 announcer (별도 `<div class="sr-only">`) | status | `polite` | — |
| 종료 배너 | alert | `assertive` | — |
| 시작 버튼 | button | — | `Space` |
| 일시정지 버튼 | button | — | `Space` |
| 리셋 버튼 | button | — | `Escape` |
| input-mm | — (native) | — | — (aria-label="분") |
| input-ss | — (native) | — | — (aria-label="초") |

- `.sr-only` 헬퍼 클래스: `position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;` (이미 notepad 와 공유 가능, dev 가 styles 에 정의)

---

## 7. 레이아웃 / 반응형

### 7.1 컨테이너

- root layout: `min-height: 100vh`, flex column. topbar 56px, 본문 flex:1
- 본문 wrapper: `max-width: 560px`, `margin: 0 auto`, `padding: var(--space-7) var(--space-5)`
- 내부 vertical stack — `display: flex; flex-direction: column; align-items: center; gap: var(--space-5);`

### 7.2 Breakpoint

| breakpoint | display 폰트 | input 폭 | controls gap | 비고 |
|---|---|---|---|---|
| `≥ 960px` (desktop) | `--text-timer-display` (144px) | 각 `120px` × 2 | `var(--space-3)` (12px) | default |
| `640–959px` (tablet) | `--text-timer-display-md` (112px) | 각 `104px` × 2 | `var(--space-3)` (12px) | 본문 padding 좌우 축소 (`var(--space-4)`) |
| `< 640px` (mobile) | `--text-timer-display-sm` (84px) | 각 `88px` × 2 | `var(--space-2)` (8px) | 컨트롤 row 가 화면을 꽉 채우면 자동 wrap (flex-wrap: wrap) |

- 미디어쿼리 break point: `@media (max-width: 959px)` / `@media (max-width: 639px)` — notepad 와 동일 기준

### 7.3 Topbar

- 높이 `56px`, padding `0 var(--space-5)`, 하단 `1px solid --color-border-default`
- 좌측: 제목 "타이머" (`--text-h1`)
- 우측: `[🌙 토글]` ghost button (notepad 와 동일 패턴 — `id="btn-theme"`)
- mobile 에서도 동일 (back 버튼 없음, 단일 페이지이므로)

---

## 8. 정량 일치 표 (dev 구현 정량 기준)

dev (BF-407) 가 본 spec 만 보고 구현 정량 일치를 확보할 수 있도록, **breakpoint × 핵심 치수 16개** 를 단일 표로 제공.

| # | 항목 | desktop (≥960) | tablet (640–959) | mobile (<640) | 토큰 키 |
|---|---|---|---|---|---|
| 1 | display 폰트 size | `144px` | `112px` | `84px` | `--text-timer-display` / `-md` / `-sm` |
| 2 | display 폰트 weight | `700` | `700` | `700` | 동상 |
| 3 | display line-height | `1.0` | `1.0` | `1.0` | 동상 |
| 4 | display font-family | `var(--font-mono)` | 동상 | 동상 | `--font-mono` |
| 5 | label 폰트 (위) | `13px / 500` | `13px / 500` | `12px / 500` | `--text-timer-label` (sm 은 인라인 override) |
| 6 | display 와 label 사이 gap | `var(--space-2)` (8px) | 동상 | `var(--space-1)` (4px) | `--space-2` / `--space-1` |
| 7 | display 와 input 사이 gap | `var(--space-6)` (32px) | `var(--space-5)` (24px) | `var(--space-5)` (24px) | `--space-6` / `--space-5` |
| 8 | input 폭 (each) | `120px` | `104px` | `88px` | (정량 — 토큰 없음) |
| 9 | input 높이 | `64px` | `56px` | `48px` | (정량) |
| 10 | input 폰트 size | `40px` | `36px` | `32px` | `--text-input-time` (md/sm 인라인 override) |
| 11 | input 사이 ":" 폭 | `24px` | `20px` | `16px` | (정량) |
| 12 | controls 버튼 높이 | `44px` | `44px` | `44px` | (정량 — touch target 동일) |
| 13 | controls 버튼 padding 좌우 | `var(--space-5)` (24px) | `var(--space-4)` (16px) | `var(--space-4)` (16px) | `--space-5` / `--space-4` |
| 14 | controls gap | `var(--space-3)` (12px) | `var(--space-3)` (12px) | `var(--space-2)` (8px) | `--space-3` / `--space-2` |
| 15 | 컨테이너 max-width | `560px` | `560px` (auto wrap 시 100%) | `100%` | (정량) |
| 16 | 본문 padding 상하/좌우 | `var(--space-7) var(--space-5)` | `var(--space-6) var(--space-4)` | `var(--space-5) var(--space-4)` | space 토큰 |

> 본 표가 BF-408 reviewer 의 "명세 ↔ 구현 정량 일치" 검증의 채점표. dev 는 본 표의 16개 항목 모두를 CSS 로 반영.

---

## 9. 기존 요소 보존 / 복제 정책 (BF-197 회귀 정책 반영)

### 9.1 회귀 사례 요약

BF-197 에서 기존 페이지 (notepad `index.html`) 의 head/footer 공통 요소를 새 페이지에 복제하지 않아 다크 모드 토글이 사라지는 회귀가 발생. 본 timer 페이지도 동일 정책 적용.

### 9.2 보존·복제 대상 매트릭스

| 요소 | 출처 (notepad/index.html) | 본 timer 페이지 처리 | 사유 |
|---|---|---|---|
| `<meta charset="UTF-8">` | line 3 | **그대로 복제 (필수)** | 한글 인코딩 |
| `<meta name="viewport" …>` | line 4 | **그대로 복제 (필수)** | 반응형 동작 |
| `<link rel="stylesheet" href="styles.css">` | line 6 | **timer 전용 경로로 변경** (`timer/styles.css`) | 페이지별 분리 — timer 토큰·미디어쿼리만 포함 |
| `<title>메모장</title>` | line 5 | **`<title>타이머</title>`** + JS 가 running 중 `"MM:SS · 타이머"` 동적 갱신 | 페이지 컨텍스트 |
| `<html lang="ko" data-theme="light">` | line 2 | **그대로 복제 + 첫 로드 시 `bf-theme` localStorage 동기화 스크립트** | 다크 모드 일관성 |
| 다크 토글 버튼 (`<header>` 내부) | line 22~25 영역 (notepad 는 + 새 메모 / + theme 위치 패턴) | **`[🌙 토글] (id="btn-theme")` 복제** + 동일 핸들러 | BF-197 회귀 방지 — 페이지별 누락 금지 |
| theme init 스크립트 | notepad/main.js 의 초기화 블록 (참고) | **timer/main.js 에서 동일 패턴 복제** — `localStorage.getItem("bf-theme")` → `document.documentElement.dataset.theme` 동기화 후 토글 핸들러 부착 | 동상 |
| 메모 list / editor DOM | notepad 전용 | **복제 X** | timer 의 기능과 무관 |
| delete modal | notepad 전용 | **복제 X** | timer 는 modal 미사용 |

### 9.3 명세 충실성 (dev 절대 준수)

- 본 §9.2 의 "그대로 복제 (필수)" 행은 **마크업 변경 없이 복붙**. dev 가 자체 마크업 작성 X
- `id="btn-theme"` 식별자 유지 — notepad 와 동일 (theme handler 가 page-local 이라 동일 ID 충돌 위험 없음)
- `data-theme` 속성 + `localStorage["bf-theme"]` 키 조합 유지 — notepad 와 같은 키 공유로 페이지 간 다크 모드 일관

---

## 10. dev (BF-407) 구현 가이드

> dev-1 이 추가 질문 없이 따라할 수 있도록 단계 작성. 클래스명·CSS 변수명은 권장. **§5 의 HTML 스니펫과 §9.2 의 복제 대상은 그대로 복붙** (자의적 재구성 금지 — BF-197 회귀 정책).

### 10.1 파일 구조

```
/
├── timer/
│   ├── index.html       # SPA entry (단일 페이지, 본 spec 의 §3 / §5 / §9.2 그대로)
│   ├── styles.css       # 본 spec 의 토큰 + 레이아웃 + 미디어쿼리
│   ├── main.js          # 상태 머신·tick·이벤트·키보드 핸들러
│   └── storage.js       # localStorage `timer:` prefix utility
├── tests/
│   └── timer-*.test.js  # 단위 테스트 (BF-407 의 acceptance 가드)
└── docs/design/
    └── timer-BF-405.md  (본 문서)
```

### 10.2 HTML 골격 (그대로 복붙 권장)

```html
<!doctype html>
<html lang="ko" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>타이머</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body data-state="idle-empty">
    <header class="topbar">
      <h1 class="topbar__title">타이머</h1>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" id="btn-theme"
                aria-label="테마 전환">🌙</button>
      </div>
    </header>

    <main class="timer">
      <div class="display" role="timer" aria-live="off" aria-atomic="true">
        <span class="display__label" id="display-label">준비됨</span>
        <output class="display__time" id="display-time">00:00</output>
      </div>

      <div class="time-input" role="group" aria-label="시간 설정">
        <input id="input-mm" type="number" min="0" max="59" inputmode="numeric"
               class="time-input__field" placeholder="MM" aria-label="분" />
        <span class="time-input__sep" aria-hidden="true">:</span>
        <input id="input-ss" type="number" min="0" max="59" inputmode="numeric"
               class="time-input__field" placeholder="SS" aria-label="초" />
      </div>

      <div class="controls" role="group" aria-label="타이머 컨트롤">
        <button id="btn-start" class="btn btn--primary"
                aria-keyshortcuts="Space" disabled>▶ 시작</button>
        <button id="btn-pause" class="btn btn--ghost"
                aria-keyshortcuts="Space" disabled>⏸ 일시정지</button>
        <button id="btn-reset" class="btn btn--danger-ghost"
                aria-keyshortcuts="Escape" disabled>↺ 리셋</button>
      </div>

      <div class="banner banner--ended" id="banner-ended"
           role="alert" aria-live="assertive" hidden>
        <div class="banner__icon" aria-hidden="true">⏰</div>
        <div class="banner__text">
          <strong>타이머가 끝났습니다.</strong>
          <span id="banner-detail"></span>
        </div>
      </div>

      <div class="sr-only" id="state-announcer" role="status" aria-live="polite"></div>
    </main>

    <script type="module" src="main.js"></script>
  </body>
</html>
```

### 10.3 CSS 변수 정의 위치

`timer/styles.css` 상단:

```css
:root {
  /* 색·간격·반경·타이포 토큰은 notepad-BF-400 §2.1~2.3 표 그대로 복제 */
  --color-bg-canvas: #FAFAF9;
  --color-bg-surface: #FFFFFF;
  /* … 생략 (notepad spec 참조) … */

  /* timer 전용 (본 spec §2.2) */
  --color-timer-running: #3563E9;
  --color-timer-paused: #B58A1A;
  --color-timer-ended-bg: #FDECEC;
  --color-timer-ended-border: #F3B7B7;
  --color-timer-ended-text: #7A1F1F;

  /* timer display 타이포 (본 spec §2.3) */
  --text-timer-display: 700 144px/1.0 var(--font-mono);
  --text-timer-display-md: 700 112px/1.0 var(--font-mono);
  --text-timer-display-sm: 700 84px/1.0 var(--font-mono);
  --text-timer-label: 500 13px/1.2 var(--font-sans);
  --text-input-time: 600 40px/1.2 var(--font-mono);
}
[data-theme="dark"] {
  --color-timer-running: #5B82F0;
  --color-timer-paused: #D9AD3C;
  --color-timer-ended-bg: #3A1F1F;
  --color-timer-ended-border: #7A3A3A;
  --color-timer-ended-text: #F5C7C7;
  /* 기타 dark 토큰 — notepad spec dark 컬럼 그대로 */
}

.display__time,
.time-input__field {
  font-variant-numeric: tabular-nums;
}
```

### 10.4 상태 머신

`data-state` 를 `<body>` 에 부여하고 CSS attribute selector 로 시각 톤 분기.

```
states: idle-empty | idle-ready | running | paused | ended

transitions:
  idle-empty  --(입력 > 0)--> idle-ready
  idle-ready  --(input → 0)-> idle-empty
  idle-ready  --(start/Space)--> running
  running     --(pause/Space)-> paused
  running     --(tick 00:00)--> ended
  paused      --(start/Space)-> running
  paused      --(reset/Esc)---> idle-ready
  running     --(reset/Esc)---> idle-ready
  ended       --(reset/Esc)---> idle-ready
  ended       --(start)------> running  (직전 입력값으로 재시작)
```

### 10.5 단계별 구현 순서

1. **10.2 HTML 골격** 복붙 + 빈 `styles.css` / `main.js`
2. **CSS 변수 + reset** (notepad reset 복제: `*{box-sizing:border-box}`, `body{margin:0;font:var(--text-body);background:var(--color-bg-canvas);color:var(--color-text-primary)}`)
3. **§9.2 topbar / theme 토글** — notepad 의 init 패턴 복제 (BF-197 회귀 방지)
4. **레이아웃 (display + input + controls 가운데 정렬)** — flex column
5. **§8 정량 일치 표 16개 항목 CSS 작성** + 미디어쿼리 2단
6. **상태 머신** (`data-state` + setter 함수) — `setState(next)` 가 DOM·title·button-disabled·label 텍스트 일괄 갱신
7. **input change 핸들러** — mm/ss 합산 → idle-empty/idle-ready 자동 전이
8. **tick 로직** — `setInterval(_, 1000)` 또는 `setTimeout` recursive. 정확도 위해 시작 시각 + Date.now() 기반 계산 권장 (drift 방지)
9. **종료 처리** — 00:00 도달 시 `data-state="ended"`, 배너 표시, `<title>` 변경, state-announcer 갱신
10. **키보드 핸들러** — 전역 `keydown` + §6.2 의 Space 양보 규칙 구현
11. **localStorage `timer:` prefix** — last_mm, last_ss, last_state 저장 (running 상태도 복원할지 v1 결정: 보수적으로 idle-ready 로만 복원 — running 상태 영속화는 v2)
12. **단위 테스트 작성** — `tests/timer-*.test.js`:
    - storage prefix 키 분리
    - 상태 전환 함수 (각 transition 매핑)
    - 00:00 도달 시 ended 진입
    - Space 양보 (input focus 시 무동작)

### 10.6 a11y 체크

- `role="timer"` 부여한 display 의 `aria-live="off"` — 1초마다 화면 리더가 읽지 않도록
- 상태 전환 (start/pause/reset/ended) 만 별도 `.sr-only [role="status"]` 에 짧은 메시지 ("타이머 시작" / "일시정지" / "리셋" / "타이머 종료")
- 종료 배너는 `role="alert" aria-live="assertive"` 로 즉시 안내
- 모든 button 에 `aria-keyshortcuts` 정확히 (Space/Escape)
- focus-visible 만 outline 표시 (`:focus-visible` selector)

---

## 11. AC (수용 기준) 매핑

| AC 항목 (Jira BF-406) | 본 명세 섹션 | 충족 여부 |
|---|---|---|
| 와이어 5종 (시작·일시정지·리셋·종료·빈 상태) | §4.1 / §4.2 / §4.3 / §4.4 / §4.5 | ✓ |
| 디자인 토큰 매핑 표 (색·여백·타이포) | §2.1 (재사용) / §2.2 (timer 전용) / §2.3 (display 타이포) / §8 (정량 일치) | ✓ |
| 반응형 breakpoint | §7.2 (3단), §8 (각 breakpoint 별 정량) | ✓ |
| 키보드 포커스 가이드 (Space/Esc) | §6.1 (포커스 표시) / §6.2 (단축키 + Space 양보) / §6.3 (ARIA) | ✓ |
| 정량값 (px/rem + 토큰 키) 구현 정량 일치 | §8 의 16행 표 — desktop/tablet/mobile × 토큰 키 모두 명시 | ✓ |
| 비범위 명시 (다중 타이머·사운드·Notification API) | §1.3 (+ 프리셋·카운트업·진행률·다중 사용자까지 확장) | ✓ |
| 기존 요소 보존 (BF-197 회귀 정책) | §9.2 보존·복제 매트릭스 | ✓ |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✓ | §11 표에 모든 AC 가 명세 섹션과 cross-reference |
| dev 구현 가이드 명확 | ✓ | §10 에 파일 구조·HTML 골격 복붙·CSS 변수·12단계 구현 순서·a11y 체크 |
| 정량 일치 표 | ✓ | §8 의 16행 × 3 breakpoint 완전 명시 |
| 비범위 explicit | ✓ | §1.3 표 형식, AC 항목 3개 + 확장 4개 |
| BF-197 회귀 방지 | ✓ | §9.2 매트릭스로 복제 대상 명시, §10.2 HTML 골격 그대로 복붙 권장 |
| Space 양보 규칙 | ✓ | §6.2 — input focus 시 토글 차단 (UX 안전성) |
| 모호함 self-flag | ⚠️ | §13 운영자 결정 필요 항목 2건 |

---

## 13. 운영자 결정 필요 (default 적용 가능)

다음 항목은 designer 단독 판단보다 운영자 컨펌 권장. **default 명세로 dev 진행 가능** — 변경 시 본 spec 의 명시 섹션만 수정.

1. **종료 시 페이지 `<title>` "⏰" 이모지 사용 여부** — 일부 사내 브라우저/툴에서 이모지가 빈 사각형으로 렌더될 가능성. 대안: 텍스트 "[종료] · 타이머". default 채택: 이모지 유지 (§4.5).
2. **running 상태 새로고침 시 복원 정책** — v1 은 보수적으로 `idle-ready` 로만 복원 (남은 시간 = 마지막 입력값, 자동 시작 X). 사용자가 "running 도 자동 복원되길" 원하면 추가 spec 필요 (tab 닫혔다가 재오픈 시 흐른 시간 차감 로직). default: idle-ready 복원 (§10.5 단계 11).

---

## 14. 참고 / 출처

- 선행 SPA 명세: [`docs/design/notepad-BF-400.md`](notepad-BF-400.md) — 토큰·반응형·a11y 패턴 재사용
- BF-197 회귀 사례 (CLAUDE.md 명세 충실성 정책의 근거)
- WCAG 2.1 SC 2.4.7 (Focus Visible), 4.1.3 (Status Messages) — §6.1, §6.3 의 근거
