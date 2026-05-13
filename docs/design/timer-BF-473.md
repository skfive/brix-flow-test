# 타이머 SPA 디자인 명세 (BF-473)

> 관련 task: BF-474 (designer)
> mockup: [`docs/design/mockups/timer-BF-473.html`](mockups/timer-BF-473.html)
> 작성자: 이디자인
> 선행 명세: [`docs/design/timer-BF-467.md`](timer-BF-467.md) (dark-default 패턴 + 토큰 체계 확립)

---

## 1. 시안 개요

### 1.1 변경 범위 (BF-467 이후)

| 항목 | BF-467 (선행) | BF-473 (본 명세) |
|---|---|---|
| localStorage 타이머 키 | `timer:last` | **`bf-timer-last-config`** (bf- 접두어 통일) |
| 명세 커버리지 | dark-default 패턴 전환 집중 | 분/초 입력·카운트다운·버튼 4종·종료 알림 **전체 재정의** |
| AC 매핑 표 | 없음 | **의무 포함** (Epic 수용 기준 4건 1:1 매핑) |
| 토큰·레이아웃·타이포 | BF-467 §2~§4 정의 | **변경 없음** — 본 명세에서 재확인·참조 |

### 1.2 사용자 경험 목표

- **다크 우선 렌더**: 첫 방문 시 dark 배경에서 시작. localStorage `bf-theme` 로 영속. head 인라인 IIFE 로 flicker 없음.
- **한 눈에 남은 시간**: 128px monospace display 로 mm:ss 자릿수 흔들림 없이 표시.
- **즉시 시작·중단·재개**: primary 버튼 1개로 시작 → 일시정지 → 재개 토글. ghost 버튼으로 리셋.
- **분/초 입력 즉시 반영**: idle 상태에서 number input 2개 노출 → 입력 즉시 display 동기.
- **종료 시각 알림**: 배너(⏰) + display 펄스 + 종료 색상 강조로 dark/light 양쪽에서 명확한 신호 전달.
- **설정 영속**: 마지막 입력값을 `bf-timer-last-config` 로 저장, 재방문 시 복원.

### 1.3 비목표 (Out of Scope)

- 다중 타이머 동시 실행
- 사운드 / 진동 / Notification API
- 프리셋·히스토리 (quick chip)
- 카운트업 (스톱워치) 모드

---

## 2. 디자인 토큰 (BF-467 계승)

> 색상·공간·반경·그림자·타이포 토큰은 BF-467 §2~§3 에서 정의된 값을 그대로 사용.
> 본 명세에서는 dev 가 단일 파일로 참조할 수 있도록 전체 목록을 재수록.

### 2.1 색상 토큰 — Dark Default (`:root`)

| 토큰명 | Dark HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0f1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#171a21` | 카드 표면 |
| `--color-bg-subtle` | `#1e222b` | 버튼 hover / 입력 배경 |
| `--color-border-default` | `#262b36` | 표면 구분선 · topbar border |
| `--color-border-strong` | `#3a4150` | input · button outline |
| `--color-text-primary` | `#e8e8e4` | 본문 · display (idle-value / running / paused) |
| `--color-text-secondary` | `#9a9a93` | label "분/초" · 리셋 버튼 기본색 |
| `--color-text-muted` | `#6b6b66` | placeholder · idle 0:00 display · hint |
| `--color-accent` | `#5b82f0` | 시작/일시정지/재개 버튼 · focus ring base |
| `--color-accent-hover` | `#7596f3` | accent hover/active |
| `--color-danger` | `#e55858` | 리셋 hover · 종료 강조 |
| `--color-danger-hover` | `#ec7676` | danger hover |
| `--color-focus-ring` | `rgba(91, 130, 240, 0.55)` | 키보드 focus outline (2px) |
| `--color-timer-running` | `#3aae7a` | running 상태 display 보조 색 (초록) |
| `--color-timer-paused` | `#d4a23a` | paused 상태 display 보조 색 (앰버) |
| `--color-timer-ended-bg` | `#3a1f22` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#7a3a3f` | 종료 배너 border |
| `--color-timer-ended-text` | `#fcb7b7` | 종료 배너 텍스트 · ended display 색 |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.32)` | 카드 그림자 |

### 2.2 색상 토큰 — Light 오버라이드 (`[data-theme="light"]`)

| 토큰명 | Light HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| `--color-bg-surface` | `#ffffff` | 카드 표면 |
| `--color-bg-subtle` | `#f1f1ef` | 버튼 hover |
| `--color-border-default` | `#e5e5e2` | 구분선 |
| `--color-border-strong` | `#d0d0cc` | input · button outline |
| `--color-text-primary` | `#1a1a19` | 본문 · display |
| `--color-text-secondary` | `#6b6b66` | label |
| `--color-text-muted` | `#9a9a93` | placeholder |
| `--color-accent` | `#3563e9` | primary action |
| `--color-accent-hover` | `#2a4fc0` | accent hover |
| `--color-danger` | `#d14343` | destructive |
| `--color-danger-hover` | `#a83333` | danger hover |
| `--color-focus-ring` | `rgba(53, 99, 233, 0.45)` | focus outline |
| `--color-timer-running` | `#1f8a5c` | running 색 |
| `--color-timer-paused` | `#b7791f` | paused 색 |
| `--color-timer-ended-bg` | `#fff1f1` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#f4b5b5` | 종료 배너 border |
| `--color-timer-ended-text` | `#9a2a2a` | 종료 배너 텍스트 |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` | 카드 그림자 (light) |

### 2.3 공간 토큰

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace
```

| role | 토큰명 | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 페이지 제목 | `--text-h1` | `20px` | `600` | `1.3` | topbar "타이머" |
| **display (≥960px)** | `--text-display` | **`128px`** | `300` | `1` | mm:ss 카운트다운 |
| **display (640–959px)** | `--text-display-md` | **`96px`** | `300` | `1` | 반응형 축소 |
| **display (<640px)** | `--text-display-sm` | **`72px`** | `300` | `1` | 반응형 축소 |
| input 숫자 | — | `28px` | `600` | `1` | `--font-mono`, `text-align: center` |
| label "분/초" | `--text-caption` | `12px` | `400` | `1.4` | input 하단 micro-label |
| hint | `--text-caption` | `12px` | `400` | `1.4` | "분과 초를 입력하세요" |
| button-lg | `--text-button-lg` | `16px` | `600` | `1` | 시작/일시정지/재개 |
| button | `--text-button` | `14px` | `500` | `1` | ghost 버튼, topbar 버튼 |
| body | `--text-body` | `15px` | `400` | `1.65` | 일반 텍스트 |
| kbd-hint | `--text-caption` | `12px` | `400` | `1.4` | `Space`·`Esc` 안내 |

display 폰트: `--font-mono` + `font-variant-numeric: tabular-nums` — mm:ss 자릿수 변동 시 가로폭 흔들림 방지.

---

## 4. 레이아웃

### 4.1 전체 구조 (desktop ≥960px)

```
┌──────────────────────────────────────────────────────────┐
│ topbar: "타이머"                          [☀ / 🌙 토글] │  h=56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│         ┌───────────────────────────────────────┐        │
│         │ ┌───────────────────────────────────┐ │ ← 종료 │
│         │ │ ⏰  시간이 다 됐어요         [닫기] │ │  배너  │
│         │ └───────────────────────────────────┘ │        │
│         │                                       │        │
│         │           12 : 34                     │ 128px  │
│         │                                       │ mono   │
│         │     ┌──────┐   :   ┌──────┐           │        │
│         │     │  12  │       │  00  │           │ ← idle │
│         │     └──────┘       └──────┘           │        │
│         │        분                초            │        │
│         │                                       │        │
│         │     분과 초를 입력하세요               │ ← hint │
│         │                                       │        │
│         │  [▶ 시작 / ⏸ 일시정지 / ▶ 재개]  [⟲ 리셋]  │        │
│         │                                       │        │
│         │  Space 시작/정지 · Esc 리셋            │        │
│         └───────────────────────────────────────┘        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- page 컨테이너: `flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: var(--space-7) var(--space-5)`
- timer card: `width: 100%; max-width: 720px; background: --color-bg-surface; border-radius: --radius-lg; box-shadow: --shadow-card; padding: var(--space-7) var(--space-6)`
- card 내부: `display: flex; flex-direction: column; align-items: center; gap: var(--space-6)`

### 4.2 Topbar

- 높이 `56px`, `padding: 0 var(--space-5)`
- `background: --color-bg-surface`, `border-bottom: 1px solid --color-border-default`
- 좌측: "타이머" (`--text-h1`)
- 우측: `#theme-toggle` ghost button — 다크 = `☀`, 라이트 = `🌙`

### 4.3 카운트다운 Display (mm:ss) [Epic AC2]

```
  12 : 34
```

- 구조: `<div class="display" id="display" role="timer" aria-live="off" aria-label="남은 시간">`
  - `<span class="display__minutes" id="disp-m">12</span>`
  - `<span class="display__colon" aria-hidden="true">:</span>`
  - `<span class="display__seconds" id="disp-s">34</span>`
- `font: var(--text-display)` + `font-variant-numeric: tabular-nums`
- `user-select: none`

**상태별 색상:**

| state | class | display 색 | 비고 |
|---|---|---|---|
| `idle` (0:00) | `.is-empty` | `--color-text-muted` | 빈 상태 |
| `idle` (값>0) | — | `--color-text-primary` | 시작 대기 |
| `running` | — | `--color-text-primary` | 카운트다운 중 |
| `paused` | — | `--color-text-primary` | 일시정지 |
| `ended` | `.is-ended` | `--color-timer-ended-text` | weight `400`, 펄스 2회 |

**펄스 animation (ended 진입 시):**
```css
@keyframes timer-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
.display.is-ended {
  color: var(--color-timer-ended-text);
  font-weight: 400;
  animation: timer-pulse 1s ease-in-out 2;
}
@media (prefers-reduced-motion: reduce) {
  .display.is-ended { animation: none; }
}
```

### 4.4 분/초 입력 폼 (idle 상태 전용) [Epic AC1]

```
   ┌──────┐     ┌──────┐
   │  25  │  :  │  00  │
   └──────┘     └──────┘
      분             초
```

- 노출 조건: `state === "idle"` — running/paused/ended 에서는 `hidden`
- 구조:
  ```html
  <div class="input-pair" id="input-pair">
    <div class="input-pair__field">
      <input type="number" id="input-m" min="0" max="99" value="0"
             inputmode="numeric" pattern="\d*" aria-label="분" />
      <span class="input-pair__label">분</span>
    </div>
    <span class="input-pair__colon" aria-hidden="true">:</span>
    <div class="input-pair__field">
      <input type="number" id="input-s" min="0" max="59" value="0"
             inputmode="numeric" pattern="\d*" aria-label="초" />
      <span class="input-pair__label">초</span>
    </div>
  </div>
  ```
- input 치수: `width: 72px; height: 56px; font: 600 28px/1 var(--font-mono); text-align: center`
- input border: `1px solid --color-border-strong; border-radius: --radius-md; background: --color-bg-canvas; color: --color-text-primary`
- focus-visible: `outline: 2px solid --color-focus-ring; outline-offset: 2px; border-color: --color-accent`
- spinner 숨김: `appearance: none; -moz-appearance: textfield`
- 사이 구분자 `:`: `font: 300 28px/1 var(--font-mono); color: --color-text-muted`
- micro-label "분/초": `--text-caption; color: --color-text-secondary`
- 입력 즉시 display 동기. onBlur 에서 range clamp (분 [0,99], 초 [0,59]).

### 4.5 컨트롤 버튼 (4종) [Epic AC3]

```
  [ ▶ 시작 ]   [ ⟲ 리셋 ]
```

- 배치: `display: flex; gap: var(--space-4); justify-content: center; width: 100%`

**primary 버튼 (`#btn-primary`, `.btn--primary-lg`):**
- `height: 56px; min-width: 160px; padding: 0 var(--space-6)`
- `background: --color-accent; color: #fff; font: --text-button-lg; border-radius: --radius-md`
- hover: `background: --color-accent-hover`
- disabled: `opacity: 0.4; cursor: not-allowed`

**reset 버튼 (`#btn-reset`, `.btn--ghost-lg`):**
- `height: 56px; min-width: 120px; padding: 0 var(--space-5)`
- `background: transparent; color: --color-text-secondary; font: --text-button-lg; border-radius: --radius-md`
- hover: `background: --color-bg-subtle; color: --color-danger`
- disabled: `opacity: 0.4; cursor: not-allowed`

**상태별 라벨·활성:**

| state | hasValue | primary 라벨 | primary 활성 | reset 라벨 | reset 활성 |
|---|---|---|---|---|---|
| `idle` | false | `▶ 시작` | disabled | `⟲ 리셋` | disabled |
| `idle` | true | `▶ 시작` | **enabled** | `⟲ 리셋` | **enabled** |
| `running` | — | `⏸ 일시정지` | **enabled** | `⟲ 리셋` | **enabled** |
| `paused` | — | `▶ 재개` | **enabled** | `⟲ 리셋` | **enabled** |
| `ended` | — | `▶ 시작` | disabled | `⟲ 새 타이머` | **enabled** |

### 4.6 종료 알림 배너 [Epic AC4]

```
┌─────────────────────────────────────────────────────────┐
│ ⏰  시간이 다 됐어요                              [닫기] │
└─────────────────────────────────────────────────────────┘
```

- 위치: card 상단 내부 (card 의 첫 번째 자식), display 위
- 구조:
  ```html
  <div class="banner banner--ended" id="ended-banner"
       role="status" aria-live="polite" hidden>
    <span class="banner__icon" aria-hidden="true">⏰</span>
    <span class="banner__text">시간이 다 됐어요</span>
    <button type="button" class="banner__close" id="btn-banner-close"
            aria-label="알림 닫기">닫기</button>
  </div>
  ```
- 폭: card 내부 100%
- 배경: `--color-timer-ended-bg`, `border: 1px solid --color-timer-ended-border`, `border-radius: --radius-md`
- padding: `var(--space-3) var(--space-4)`
- 아이콘 `⏰`: `font-size: 24px`
- 텍스트: `--text-label; color: --color-timer-ended-text`
- `[닫기]` 버튼: `--text-caption; color: --color-timer-ended-text; border: none; background: transparent`
- ended 아닐 때: `hidden` attribute
- 종료 진입 시 배너 fade-in 200ms:
  ```css
  @keyframes banner-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .banner:not([hidden]) {
    animation: banner-in 200ms ease-out;
  }
  ```

### 4.7 빈 상태 Hint

- 노출 조건: `state === "idle"` && 분=0 && 초=0
- 텍스트: "분과 초를 입력하세요"
- 스타일: `--text-caption; color: --color-text-muted; text-align: center; margin: 0`
- 구조: `<p class="hint" id="hint">분과 초를 입력하세요</p>` — 그 외 상태: `hidden`

### 4.8 키보드 힌트

- 텍스트: `` `Space` 시작/정지 · `Esc` 리셋 ``
- 스타일: `--text-caption; color: --color-text-muted; text-align: center`
- `<kbd>` 요소: `font-family: --font-mono; font-size: 11px; padding: 1px 6px; border: 1px solid --color-border-default; border-radius: --radius-sm; background: --color-bg-subtle; color: --color-text-secondary`

### 4.9 반응형 Breakpoint

| breakpoint | 변경 항목 |
|---|---|
| `≥ 960px` | display `128px` / card `max-width: 720px; padding: --space-7 --space-6` |
| `640–959px` | display `96px` / card `max-width: 560px; padding: --space-6 --space-5` / input `64px × 52px / font 24px` |
| `< 640px` | display `72px` / card `max-width: 100%; padding: --space-5 --space-4` / controls `flex-direction: column; width: 100%` |
| `< 360px` | display `font-size: 64px` (추가 축소) |

---

## 5. 컴포넌트 명세

### 5.1 `<TimerDisplay>` (카운트다운 mm:ss)

**props:**
| prop | 타입 | 설명 |
|---|---|---|
| `minutes` | `number` (0–99) | 표시할 분 |
| `seconds` | `number` (0–59) | 표시할 초 |
| `state` | `"idle"\|"running"\|"paused"\|"ended"` | 현재 타이머 상태 |

**상태·인터랙션:** §4.3 참조.
**접근성:** `role="timer"` + `aria-live="off"` (매초 SR 읽기 방지) + `aria-label="남은 시간"`.

### 5.2 `<TimeInputPair>` (분/초 number input)

**props:**
| prop | 타입 | 설명 |
|---|---|---|
| `minutes` | `number` | 분 초기값 |
| `seconds` | `number` | 초 초기값 |
| `onChange` | `({minutes, seconds}) => void` | 입력 변경 콜백 |
| `visible` | `boolean` | state === "idle" 일 때만 true |

**인터랙션:**
- `input` 이벤트 → onChange 즉시 호출 (debounce 없음)
- `blur` 이벤트 → range clamp (분 [0,99], 초 [0,59]; 초 overflow 시 분으로 carrying 안 함)
- `inputmode="numeric"` + `pattern="\d*"` — 모바일 숫자 키패드

**접근성:** 각 input 에 `aria-label="분"` / `aria-label="초"`.

### 5.3 `<ControlButtons>` (시작/일시정지/재개/리셋)

**props:**
| prop | 타입 | 설명 |
|---|---|---|
| `state` | `"idle"\|"running"\|"paused"\|"ended"` | 타이머 상태 |
| `hasValue` | `boolean` | 분+초 > 0 |
| `onPrimary` | `() => void` | 시작/일시정지/재개 클릭 |
| `onReset` | `() => void` | 리셋/새 타이머 클릭 |

**상태별 라벨·활성:** §4.5 표 참조.
**접근성:** primary 버튼 상태 변화 시 `aria-label` 동시 갱신 ("타이머 시작" / "타이머 일시정지" / "타이머 재개").

### 5.4 `<EndedBanner>` (종료 알림)

**props:**
| prop | 타입 | 설명 |
|---|---|---|
| `visible` | `boolean` | ended 상태일 때만 true |
| `onDismiss` | `() => void` | [닫기] 클릭 / Esc 키 |

**레이아웃·스타일:** §4.6 참조.
**접근성:** `role="status"` + `aria-live="polite"` (intrusive 하지 않은 SR 알림).
**애니메이션:** 진입 시 fade-in 200ms. `prefers-reduced-motion` 시 skip.

### 5.5 `#theme-toggle` 버튼 (테마 토글)

| 속성 | 다크 모드 | 라이트 모드 |
|---|---|---|
| `id` | `theme-toggle` | `theme-toggle` |
| `textContent` | `☀` | `🌙` |
| `aria-label` | `"라이트 테마로 전환"` | `"다크 테마로 전환"` |
| 클래스 | `btn btn--ghost` | `btn btn--ghost` |
| 키보드 | `T` 키 토글 (input focus 중 제외) | 동일 |

---

## 6. 상태·인터랙션 명세

### 6.1 상태 머신

```
 idle (0:00) ──입력──► idle (값>0) ──[▶ 시작]──► running
                                                   │    ▲
                                             [⏸ 정지]  [▶ 재개]
                                                   │    │
                                                paused ◄─┘
                                                   │
                                           잔여시간 0:00 도달
                                                   ▼
                                                ended
                               [닫기]/Esc/[⟲ 새 타이머] ──► idle (마지막 설정값 복원)
```

**리셋 동작:** running/paused/ended 어디서든 `[⟲ 리셋]` 클릭 → idle 전이 + input 마지막 설정값 복원 (확인 modal 없음).

### 6.2 키보드 단축키

| 키 | 동작 | 조건 |
|---|---|---|
| `Space` | primary 버튼 토글 (시작 ↔ 일시정지) | input focus 외 |
| `Esc` | 리셋 / ended 시 배너 닫기 + idle 복귀 | 전역 |
| `T` | 테마 토글 | input focus 외 |
| `↑`/`↓` | 값 ±1 (number input 기본) | input focus |

`focus-visible`: 모든 interactive 요소에 `outline: 2px solid --color-focus-ring; outline-offset: 2px`.

### 6.3 카운트다운 tick

- `requestAnimationFrame` + `performance.now()` drift-correction
- 매 프레임: `dispMEl.textContent` / `dispSEl.textContent` 갱신 (full render 없이 최소 DOM 조작)
- 0:00 도달 → 즉시 `ended` 전이 → 배너 표시 → display 펄스 2회

### 6.4 종료 인터랙션 흐름

1. 0:00 도달 → phase = `"ended"`
2. `bannerEl.hidden = false` → banner-in fade 200ms
3. `.display.is-ended` → ended 색 + 펄스 2회 (`prefers-reduced-motion` 시 skip)
4. 사용자 액션:
   - `[닫기]` 클릭 → `phase = "idle"` (input 마지막 설정값 복원)
   - `Esc` 키 → 동일
   - `[⟲ 새 타이머]` 클릭 → 동일

---

## 7. localStorage 명세

| 키 | 타입 | 용도 | SPA 공유 | 기본값 |
|---|---|---|---|---|
| `bf-theme` | `"dark" \| "light"` | 테마 설정 (dark default) | **전 SPA 공유** | `"dark"` |
| `bf-timer-last-config` | `JSON { minutes: number, seconds: number }` | 마지막 타이머 설정값 | timer 전용 | — (없으면 0:00) |

### 7.1 bf-theme 저장·복원 패턴

```html
<!-- head 인라인 IIFE — flicker 방지 (CSS paint 전 실행) -->
<script>
  (function () {
    try {
      var saved = localStorage.getItem("bf-theme");
      var theme = saved === "light" || saved === "dark" ? saved : "dark";
      document.documentElement.setAttribute("data-theme", theme);
    } catch (_e) {
      // private mode — dark 유지
    }
  })();
</script>
```

### 7.2 bf-timer-last-config 저장·복원 패턴

```js
const LAST_KEY = "bf-timer-last-config";

// 저장
function saveLast(minutes, seconds) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ minutes, seconds }));
  } catch (_e) {}
}

// 복원
function loadLast() {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.minutes !== "number" || typeof parsed.seconds !== "number") return null;
    return { minutes: parsed.minutes, seconds: parsed.seconds };
  } catch (_e) {
    return null;
  }
}
```

---

## 8. 접근성

| 항목 | 요구사항 |
|---|---|
| 색 대비 | accent `#5b82f0` 위 흰 텍스트 약 3.6:1 — 버튼 16px bold (대형 텍스트 AA 기준 3:1 충족). 운영자 확인 권장 |
| display | `role="timer" aria-live="off"` — 매초 SR 읽기 방지 |
| 종료 배너 | `role="status" aria-live="polite"` — 비침습적 SR 알림 |
| input | `aria-label="분"` / `aria-label="초"` |
| primary 버튼 | 상태 변화 시 `aria-label` 동시 갱신 |
| 테마 토글 | `aria-label` 현재 동작 명시 |
| focus-visible | 모든 interactive 요소: `outline: 2px solid --color-focus-ring; outline-offset: 2px` (`:focus-visible` 한정) |
| reduced-motion | `@media (prefers-reduced-motion: reduce)` — display 펄스·배너 fade 비활성 |
| Tab 순서 | topbar 토글 → 분 input → 초 input → primary → reset → banner close |

---

## 9. dev 구현 가이드

### 9.1 localStorage 키 마이그레이션 (핵심 변경)

| 파일 | 변경 내용 |
|---|---|
| `timer/storage.js` | `TIMER_PREFIX = "timer:"` + `TIMER_LAST_KEY = "timer:last"` → `TIMER_LAST_KEY = "bf-timer-last-config"` (TIMER_PREFIX 제거 가능) |

```js
// 변경 전
export const TIMER_PREFIX = "timer:";
export const TIMER_LAST_KEY = TIMER_PREFIX + "last";  // "timer:last"

// 변경 후
export const TIMER_LAST_KEY = "bf-timer-last-config";
```

> 기존 `timer:last` 값이 localStorage 에 남아있는 사용자는 자동 마이그레이션 없이 초기화됨.
> 운영자 판단에 따라 one-time migration 로직 추가 가능 (구현 블로커 X).

### 9.2 변경 파일 요약

| 파일 | 변경 범위 | 비고 |
|---|---|---|
| `timer/storage.js` | `TIMER_LAST_KEY` 값 변경 (1행) | TIMER_PREFIX 상수 제거 가능 |
| `timer/main.js` | `store.saveLast()` / `store.loadLast()` 호출부는 변경 없음 — storage 내부 키만 변경됨 | |
| `timer/index.html` | 변경 없음 (BF-467 에서 완료) | |
| `timer/styles.css` | 변경 없음 (BF-467 에서 완료) | |

### 9.3 구현 검증 체크리스트

1. `file://` 로 열 때 dark 배경으로 시작 (flicker 없음) ✓
2. `#theme-toggle` 클릭 → 라이트/다크 전환 + `bf-theme` localStorage 저장 ✓
3. 분/초 입력 → display 즉시 동기 (idle 상태) ✓
4. `▶ 시작` → running, `⏸ 일시정지` → paused, `▶ 재개` → running ✓
5. 0:00 도달 → ended: 배너 표시 + display 펄스 + 버튼 상태 변경 ✓
6. 재방문 시 `bf-timer-last-config` 에서 마지막 설정값 복원 ✓
7. `Space`/`Esc`/`T` 단축키 동작 ✓

### 9.4 정량 일치 기준

| 항목 | 값 |
|---|---|
| card max-width (desktop) | `720px` |
| card padding (desktop) | `48px 32px` |
| display font-size (≥960px) | `128px` |
| display font-size (640–959px) | `96px` |
| display font-size (<640px) | `72px` |
| primary-lg height | `56px` |
| primary-lg min-width | `160px` |
| ghost-lg height | `56px` |
| ghost-lg min-width | `120px` |
| input w × h | `72px × 56px` |
| input font | `600 28px/1 mono` |
| controls gap | `16px` |
| banner padding | `12px 16px` |
| focus-ring | `2px solid; offset: 2px` |

---

## 10. mockup 참조

[`docs/design/mockups/timer-BF-473.html`](mockups/timer-BF-473.html)

- 단일 self-contained HTML (외부 의존성 0건, 인라인 `<style>`, system font)
- **dark default** 렌더 (첫 로드 시 dark)
- `#theme-toggle` 버튼 클릭 → 라이트/다크 전환 + `bf-theme` localStorage 저장
- **5가지 상태 패널 동시 표시:**

| 패널 | state | 설명 |
|---|---|---|
| ① | `idle (0:00)` | 빈 상태, hint 표시, 버튼 disabled |
| ② | `idle (25:00)` | 값 입력 후, 버튼 enabled |
| ③ | `running (08:42)` | 카운트다운 중, input 숨김 |
| ④ | `paused (04:15)` | 일시정지 |
| ⑤ | `ended (0:00)` | 종료 배너 표시, display ended 색 |

---

## 11. AC 매핑 표

### 11.1 Epic 수용 기준 4건 → UI 요소 1:1 매핑

| # | Epic 수용 기준 | UI 요소 | 컴포넌트 | 명세 섹션 |
|---|---|---|---|---|
| **E1** | 분/초 입력 폼 — idle 상태에서 분(0–99)/초(0–59) 입력, 입력 즉시 display 동기 | `<TimeInputPair>` — 분/초 number input 2개, `.input-pair` | §5.2 | §4.4 |
| **E2** | 카운트다운 표시 — mm:ss large display, 상태별 색상, monospace tabular-nums | `<TimerDisplay>` — 128px mono display `.display`, 상태별 `.is-empty`/`.is-ended` | §5.1 | §4.3 |
| **E3** | 4개 컨트롤 버튼 — 시작/일시정지/재개 (primary) + 리셋 (ghost), 상태별 라벨·활성 | `<ControlButtons>` — `#btn-primary`(`.btn--primary-lg`) + `#btn-reset`(`.btn--ghost-lg`) | §5.3 | §4.5 |
| **E4** | 종료 시각적 알림 — overlay/색상 강조, 배너 + display 펄스 | `<EndedBanner>` + `.display.is-ended` 펄스 + `--color-timer-ended-*` 토큰 | §5.4 | §4.6 |

### 11.2 Designer Task AC → 산출물 매핑

| # | Designer Task AC | 산출물 | 확인 위치 |
|---|---|---|---|
| **D1** | `timer-BF-473.md` 에 분/초 입력·카운트다운·4개 버튼·종료 알림·테마 토글·localStorage 키 정의 | 본 명세 §4.3~§4.6 (컴포넌트), §7 (localStorage), §5.5 (theme-toggle) | §4, §5, §7 |
| **D2** | mockup HTML을 `file://` 로 열면 외부 CDN 0건 + dark default 테마 | `timer-BF-473.html` — 외부 `<link>`/`<script>` 없음, `:root`=dark, head IIFE | §10 |
| **D3** | AC 매핑 표에 Epic 수용 기준 4건 1:1 매핑 | §11.1 표 (E1~E4 전부 매핑) | §11.1 |

---

## 12. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✅ | §11.1 E1~E4 전부 매핑, §11.2 D1~D3 designer task AC 매핑 |
| dev 구현 가이드 명확 | ✅ | §9.1 localStorage 키 변경 (코드 전후 비교), §9.2 파일별 변경 범위, §9.3 검증 체크리스트, §9.4 정량 일치 기준 |
| 기존 요소 보존 | ✅ | §9.2: `timer/index.html`·`timer/styles.css`·`timer/main.js` 주 로직 변경 없음. 타 SPA 무관 |
| 컴포넌트 매핑 | ✅ | §5.1~5.5 전부 포함 (Display·InputPair·Controls·Banner·ThemeToggle) |
| 모호함 flag | ⚠️ | accent `#5b82f0` + 흰 텍스트 대비 ~3.6:1 (§8, §11.2). WCAG AA 4.5:1 미달이나 large text 기준 충족. 운영자 확인 권장 — 구현 블로커 X |

**추가 자체 점검:**
- **localStorage 키 변경 완결성**: §7 명세 + §9.1 코드 블록 + §9.3 검증 항목 6번 — 3곳에서 일관되게 `bf-timer-last-config` 명시 ✅
- **dark-default 완결성**: head IIFE (§7.1) + `data-theme="dark"` 초기값 + `:root`=dark + `[data-theme="light"]`=light 오버라이드 4단계 BF-467 계승. mockup HTML 동일 패턴 적용 ✅
- **file:// CORS 안전성**: mockup HTML 은 외부 CDN·ESM import 없는 단일 파일 (inline `<style>` + inline `<script>`) ✅
- **종료 알림 이중 강조**: 배너(role=status) + display 색(`--color-timer-ended-text`) + 펄스 animation — Epic AC4 overlay/색상 강조 요건 충족 ✅
- **prefers-reduced-motion**: §4.3 (펄스), §4.6 (배너 fade), §8 (접근성) 3곳 명시 ✅
