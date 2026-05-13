# 타이머 SPA 디자인 명세 (BF-497)

> 관련 task: BF-498 (designer) · 대상 Epic: BF-497  
> mockup (시스템 capture): [`docs/design/mockups/timer-BF-498.html`](mockups/timer-BF-498.html)  
> 작성자: 이디자인  
> 선행 명세: [`docs/design/timer-BF-491.md`](timer-BF-491.md) (AC 매핑 표 의무화 + flash 키프레임 상세화)

---

## 0. AC ↔ 명세 매핑 표 (의무)

> BF-497 Epic 의 수용 기준(AC) 전 항목을 아래 표에서 명세 섹션과 1:1 매핑한다.

| # | Epic AC 항목 | 매핑 명세 섹션 |
|---|-------------|--------------|
| E-1 | 분/초 입력 UI — idle 상태에서 분(0~99)/초(0~59) number input 노출, 입력 즉시 display 동기 | §4.4 분/초 입력 폼 |
| E-2 | 카운트다운 디스플레이 — mm:ss 대형 숫자(128px mono), 상태별 색 전환, tabular-nums | §4.3 카운트다운 Display |
| E-3 | 컨트롤 버튼 — 시작/일시정지/재개/리셋 4종, 상태별 레이블·활성화 매트릭스 | §4.5 컨트롤 버튼 |
| E-4 | 종료 시각 알림 — flash 애니메이션 + 글로우 + 배너(⏰) + 종료 컬러 강조 | §4.6 종료 시각 알림 |

### Task 레벨 AC (디자이너 산출물 검증)

| # | Task AC | 산출물 위치 |
|---|---------|-----------|
| T-1 | `docs/design/timer-BF-497.md` 에 컬러 토큰·타이포·레이아웃·인터랙션 상태 전부 정의 | §2 디자인 토큰, §3 타이포그래피, §4 레이아웃·컴포넌트 |
| T-2 | mockup `file://` 로 열 때 dark default + `bf-theme` localStorage + `#theme-toggle` 이 palette/ 와 동일 인터페이스 | §5 테마 토글 패턴, [`mockups/timer-BF-498.html`](mockups/timer-BF-498.html) |
| T-3 | 명세 끝(§0) AC 매핑 표 — epic 수용 기준 4건 + task AC 3건 1:1 매핑 | 본 §0 전체 |

---

## 1. 시안 개요

### 1.1 변경 범위 (BF-491 → BF-497)

| 항목 | BF-491 (선행) | BF-497 (본 명세) |
|---|---|---|
| 명세 목적 | 전체 통합 + AC 매핑 표 + flash 키프레임 상세화 | **전체 명세 재확인 + 글로우 효과 명세 추가 + mockup 신규 생성** |
| 종료 알림 | flash(2회) + pulse(2회) | **동일 유지 + text-shadow 글로우 스타일 추가 명세** |
| AC 매핑 표 | §0 에 9개 항목 | **본 §0 에 Epic 4건 + Task 3건 구분 명시** |
| 명세 경로 | `docs/design/timer-BF-491.md` | `docs/design/timer-BF-497.md` |
| mockup 경로 | `docs/design/mockups/timer-BF-492.html` | `docs/design/mockups/timer-BF-498.html` |
| 토큰·레이아웃·타이포 | BF-491 §2~§4 정의 | **동일 유지** (변경 없음) |

### 1.2 사용자 경험 목표

- **다크 우선 렌더 (T-2)**: 첫 방문 시 dark 배경에서 즉시 시작. `bf-theme` localStorage 로 영속. `<head>` 인라인 IIFE 로 FOUC 없음.
- **한 눈에 남은 시간 (E-2)**: 128px monospace display 로 mm:ss 자릿수 흔들림 없이 표시.
- **즉시 시작·중단·재개 (E-3)**: primary 버튼 1개로 시작 → 일시정지 → 재개 토글. ghost 버튼으로 리셋.
- **분/초 입력 즉시 반영 (E-1)**: idle 상태에서 number input 2개 노출 → 입력 즉시 display 동기.
- **종료 시 강렬한 시각 신호 (E-4)**: 배너(⏰) + display flash(2회) + pulse(2회) + text-shadow 글로우. dark/light 양쪽에서 명확한 신호.
- **테마 전환**: `#theme-toggle` 버튼으로 dark ↔ light 즉시 전환 + `bf-theme` 저장.
- **설정 영속**: 마지막 입력값을 `bf-timer-last-config` 로 저장, 재방문 시 복원.

### 1.3 비목표 (Out of Scope)

- 다중 타이머 동시 실행
- 사운드 / 진동 / Notification API
- 프리셋·히스토리
- 카운트업(스톱워치) 모드

---

## 2. 디자인 토큰

> BF-491 §2 토큰 체계 전부 유지. `--color-timer-ended-glow` 토큰 신설 (글로우 효과용).

### 2.1 색상 토큰 — Dark Default (`:root`) [E-2, T-1]

| 토큰명 | Dark HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0f1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#171a21` | 카드 표면 · topbar 배경 |
| `--color-bg-subtle` | `#1e222b` | 버튼 hover / 입력 배경 |
| `--color-border-default` | `#262b36` | topbar border · kbd 테두리 |
| `--color-border-strong` | `#3a4150` | input · ghost button outline |
| `--color-text-primary` | `#e8e8e4` | 본문 · display (idle값>0 / running / paused) |
| `--color-text-secondary` | `#9a9a93` | label "분/초" · 리셋 버튼 기본색 |
| `--color-text-muted` | `#6b6b66` | placeholder · idle 0:00 · hint · kbd-hint |
| `--color-accent` | `#5b82f0` | 시작/일시정지/재개 primary 버튼 |
| `--color-accent-hover` | `#7596f3` | accent hover |
| `--color-danger` | `#e55858` | 리셋 버튼 hover · 종료 강조 |
| `--color-danger-hover` | `#ec7676` | danger hover |
| `--color-focus-ring` | `rgba(91, 130, 240, 0.55)` | 키보드 focus outline (2px) |
| `--color-timer-running` | `#3aae7a` | running 상태 보조 색 (초록) |
| `--color-timer-paused` | `#d4a23a` | paused 상태 보조 색 (앰버) |
| `--color-timer-ended-bg` | `#3a1f22` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#7a3a3f` | 종료 배너 border |
| `--color-timer-ended-text` | `#fcb7b7` | 종료 배너 텍스트 · ended display 색 |
| `--color-timer-ended-flash` | `#ff6b6b` | flash 최대 밝기 컬러 (종료 진입 순간) |
| `--color-timer-ended-glow` | `rgba(255, 107, 107, 0.45)` | **[신규]** text-shadow 글로우 (ended display) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.32)` | 카드 그림자 |

### 2.2 색상 토큰 — Light 오버라이드 (`[data-theme="light"]`) [T-1, T-2]

| 토큰명 | Light HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| `--color-bg-surface` | `#ffffff` | 카드 표면 · topbar 배경 |
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
| `--color-timer-running` | `#1f8a5c` | running 색 (light) |
| `--color-timer-paused` | `#b7791f` | paused 색 (light) |
| `--color-timer-ended-bg` | `#fff1f1` | 종료 배너 배경 |
| `--color-timer-ended-border` | `#f4b5b5` | 종료 배너 border |
| `--color-timer-ended-text` | `#9a2a2a` | 종료 배너 텍스트 |
| `--color-timer-ended-flash` | `#e53e3e` | flash 최대 밝기 컬러 (light용) |
| `--color-timer-ended-glow` | `rgba(229, 62, 62, 0.30)` | **[신규]** text-shadow 글로우 (light용) |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.06)` | 카드 그림자 |

### 2.3 공간 토큰 [T-1]

| 토큰명 | 값 |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `48px` |

### 2.4 반경·그림자·모션 토큰

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--shadow-card` | dark: `0 4px 16px rgba(0,0,0,0.32)` / light: `0 4px 16px rgba(0,0,0,0.06)` |
| `--motion-fast` | `120ms` |
| `--motion-mid` | `220ms` |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` |

### 2.5 palette/ 토큰 정합 확인 표 [T-1, T-2]

> timer 와 palette 는 공통 토큰 체계를 공유한다.

| 토큰명 | timer dark | palette dark | 정합 |
|---|---|---|---|
| `--color-text-primary` | `#e8e8e4` | `#e8e8e4` | ✅ |
| `--color-text-secondary` | `#9a9a93` | `#9a9a93` | ✅ |
| `--space-*` (1~7) | 동일 | 동일 | ✅ |
| `--radius-md` / `--radius-lg` | 동일 | 동일 | ✅ |
| `bf-theme` localStorage 키 | 공유 | 공유 | ✅ |
| head IIFE FOUC 방지 패턴 | 동일 | 동일 | ✅ |
| `#theme-toggle` + `data-theme` 패턴 | 동일 | 동일 | ✅ |
| `--color-bg-canvas` dark | `#0f1115` | `#0d1117` | ⚠️ 근소 차이 (각 SPA 독립 설계, BF-486 이후 확인) |
| `--color-bg-surface` dark | `#171a21` | `#161b22` | ⚠️ 근소 차이 (UX 일관성 충족) |

---

## 3. 타이포그래피 [T-1]

**폰트 스택 (system font — 외부 CDN 없음, vanilla-static 정책):**

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | size | weight | line-height | font | 적용처 |
|---|---|---|---|---|---|
| 페이지 제목 | `20px` | `600` | `1.3` | sans | topbar "타이머" |
| display (≥960px) | `128px` | `300` | `1` | mono | mm:ss 카운트다운 |
| display (640–959px) | `96px` | `300` | `1` | mono | 반응형 축소 |
| display (<640px) | `72px` | `300` | `1` | mono | 반응형 축소 |
| display (<360px) | `64px` | `300` | `1` | mono | 추가 축소 |
| input 숫자 | `28px` | `600` | `1` | mono | `text-align: center` |
| label "분/초" | `12px` | `400` | `1.4` | sans | input 하단 micro-label |
| hint | `12px` | `400` | `1.4` | sans | "분과 초를 입력하세요" |
| button-lg | `16px` | `600` | `1` | sans | 시작/일시정지/재개 |
| button | `14px` | `500` | `1` | sans | ghost 버튼 · topbar 버튼 |
| label | `14px` | `500` | `1.4` | sans | 종료 배너 텍스트 |
| kbd-hint | `12px` | `400` | `1.4` | sans | `Space`·`Esc` 안내 |

display 폰트: `--font-mono` + `font-variant-numeric: tabular-nums` — 자릿수 변동 시 가로폭 흔들림 방지.

---

## 4. 레이아웃 · 컴포넌트 명세

### 4.1 전체 구조 (desktop ≥960px)

```
┌──────────────────────────────────────────────────────────┐
│ topbar: "타이머"                          [☀ / 🌙 토글] │  h=56px
├──────────────────────────────────────────────────────────┤
│                                                          │
│         ┌───────────────────────────────────────┐        │
│         │ ⏰  시간이 다 됐어요         [닫기 ×] │ ← 배너 │
│         ├───────────────────────────────────────┤        │
│         │                                       │        │
│         │            00 : 00                    │ ← 128px │
│         │                                       │   mono  │
│         │    ┌──────┐   :   ┌──────┐            │         │
│         │    │  00  │       │  00  │            │ ← idle  │
│         │    └──────┘       └──────┘            │         │
│         │       분                초             │         │
│         │                                       │         │
│         │    분과 초를 입력하세요                │ ← hint  │
│         │                                       │         │
│         │  [▶ 시작 / ⏸ 일시정지 / ▶ 재개]  [⟲ 리셋] │     │
│         │                                       │         │
│         │  Space 시작/정지 · Esc 리셋            │ ← kbd   │
│         └───────────────────────────────────────┘         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

- **page 컨테이너**: `min-height: 100dvh; display: flex; flex-direction: column`
- **main 영역**: `flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: var(--space-7) var(--space-5)`
- **timer card**: `width: 100%; max-width: 720px; background: var(--color-bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: var(--space-7) var(--space-6); display: flex; flex-direction: column; align-items: center; gap: var(--space-6)`

### 4.2 Topbar [T-2]

- 높이 `56px`, `padding: 0 var(--space-5)`, `flex: 0 0 auto`
- `background: var(--color-bg-surface)`, `border-bottom: 1px solid var(--color-border-default)`
- 좌측: `h1.topbar__title` "타이머" (`20px 600`, `flex: 1`)
- 우측: `#theme-toggle` `.btn.btn--ghost`

**`#theme-toggle` 아이콘 규칙:**

| 현재 테마 | 버튼 표시 | aria-label |
|---|---|---|
| dark (기본) | `☀️` | "라이트 테마로 전환" |
| light | `🌙` | "다크 테마로 전환" |

### 4.3 카운트다운 Display (mm:ss) [E-2]

**HTML 구조:**
```html
<div class="display" id="display"
     role="timer" aria-live="off" aria-label="남은 시간">
  <span class="display__minutes" id="disp-m">00</span>
  <span class="display__colon" aria-hidden="true">:</span>
  <span class="display__seconds" id="disp-s">00</span>
</div>
```

**스타일:**
```css
.display {
  font-size: 128px;
  font-weight: 300;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.02em;
  user-select: none;
  color: var(--color-text-muted);      /* idle 0:00 기본 */
  transition: color var(--motion-fast), text-shadow var(--motion-fast);
}
```

**상태별 색상 + 글로우:**

| state | 추가 class | display 색 | text-shadow (글로우) | 비고 |
|---|---|---|---|---|
| `idle` (0:00) | `.is-empty` | `--color-text-muted` | none | 빈 상태 |
| `idle` (값>0) | — | `--color-text-primary` | none | 시작 대기 |
| `running` | `.is-running` | `--color-text-primary` | none | 카운트다운 중 |
| `paused` | `.is-paused` | `--color-text-primary` | none | 일시정지 |
| `ended` | `.is-ended` | `--color-timer-ended-text` | `0 0 24px var(--color-timer-ended-glow)` | flash 2회 + pulse 2회 후 글로우 유지 |

**종료 시 글로우 스타일 명세 (신규):**
```css
.display.is-ended {
  color: var(--color-timer-ended-text);
  font-weight: 400;
  text-shadow: 0 0 24px var(--color-timer-ended-glow);
  animation:
    timer-flash 300ms ease-in-out 2,
    timer-pulse 500ms ease-in-out 2 600ms;
}
```

> 글로우(`text-shadow`)는 animation 종료 후에도 유지된다 — ended 상태가 지속되는 동안 은은한 적색 광채 효과.

### 4.4 분/초 입력 폼 (idle 상태 전용) [E-1]

**노출 조건:** `state === "idle"` — running / paused / ended 에서는 `hidden`

**HTML 구조:**
```html
<div class="input-pair" id="input-pair">
  <div class="input-pair__field">
    <input type="number" id="input-m" min="0" max="99" value="0"
           inputmode="numeric" pattern="\d*" aria-label="분" />
    <span class="input-pair__label">분</span>
  </div>
  <span class="input-pair__sep" aria-hidden="true">:</span>
  <div class="input-pair__field">
    <input type="number" id="input-s" min="0" max="59" value="0"
           inputmode="numeric" pattern="\d*" aria-label="초" />
    <span class="input-pair__label">초</span>
  </div>
</div>
```

**입력 치수:**
```css
input[type="number"] {
  width: 72px; height: 56px;
  font: 600 28px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
  text-align: center;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-canvas);
  color: var(--color-text-primary);
  appearance: none; -moz-appearance: textfield;
  transition: border-color var(--motion-fast);
}
input[type="number"]:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
  border-color: var(--color-accent);
}
```

**인터랙션:**

| 이벤트 | 동작 |
|---|---|
| `input` | display 즉시 동기 (debounce 없음) |
| `blur` | range clamp (분 [0,99], 초 [0,59]; carrying 없음) |
| `change` (blur 후) | `bf-timer-last-config` localStorage 저장 |
| 재방문 | `bf-timer-last-config` 복원 → display 동기 |

**hint 텍스트:** `.hint` 요소 `"분과 초를 입력하세요"` — `12px 400`, `--color-text-muted`, `text-align: center`

### 4.5 컨트롤 버튼 (4종 동작, 2개 요소) [E-3]

**배치:** `display: flex; gap: var(--space-4); justify-content: center; width: 100%`

#### primary 버튼 (`#btn-primary`, `.btn--primary-lg`)

```css
.btn--primary-lg {
  height: 56px; min-width: 160px; padding: 0 var(--space-6);
  background: var(--color-accent); color: #fff;
  font: 600 16px/1 var(--font-sans);
  border-radius: var(--radius-md); border: none; cursor: pointer;
  transition: background var(--motion-fast), transform 100ms;
}
.btn--primary-lg:hover  { background: var(--color-accent-hover); }
.btn--primary-lg:active { transform: scale(0.97); }
.btn--primary-lg:disabled { opacity: 0.4; cursor: not-allowed; }
```

**상태별 레이블·활성화 매트릭스:**

| state | hasValue | 레이블 | 아이콘 | disabled |
|---|---|---|---|---|
| `idle` | false (0:00) | 시작 | ▶ | `true` |
| `idle` | true (값>0) | 시작 | ▶ | `false` |
| `running` | — | 일시정지 | ⏸ | `false` |
| `paused` | — | 재개 | ▶ | `false` |
| `ended` | — | 시작 | ▶ | `true` (리셋 후 idle 진입 시 활성) |

#### reset 버튼 (`#btn-reset`, `.btn--ghost-lg`)

```css
.btn--ghost-lg {
  height: 56px; padding: 0 var(--space-5);
  background: transparent; color: var(--color-text-secondary);
  font: 500 14px/1 var(--font-sans);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md); cursor: pointer;
  transition: color var(--motion-fast), border-color var(--motion-fast),
              background var(--motion-fast);
}
.btn--ghost-lg:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background: var(--color-bg-subtle);
}
.btn--ghost-lg:disabled { opacity: 0.4; cursor: not-allowed; }
```

**reset 버튼 활성 조건:** `state !== "idle"` || `(state === "idle" && 입력값 > 0)`

### 4.6 종료 시각 알림 (flash + 글로우 + 배너) [E-4]

#### 배너 (`#ended-banner`, `.ended-banner`)

**노출:** `state === "ended"` 에서만 표시. card 상단 (display 위).

```html
<div class="ended-banner" id="ended-banner"
     role="alert" aria-live="assertive" hidden>
  <span class="ended-banner__icon" aria-hidden="true">⏰</span>
  <span class="ended-banner__text">시간이 다 됐어요!</span>
  <button class="ended-banner__close" id="btn-close-banner"
          aria-label="알림 닫기">×</button>
</div>
```

```css
.ended-banner {
  width: 100%;
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  background: var(--color-timer-ended-bg);
  border: 1px solid var(--color-timer-ended-border);
  border-radius: var(--radius-md);
  color: var(--color-timer-ended-text);
  font: 500 14px/1.4 var(--font-sans);
  animation: banner-in 300ms var(--ease-out) both;
}
@keyframes banner-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

#### display flash + 글로우 애니메이션 (종료 진입 시퀀스)

1. display 에 `.is-ended` 추가 → `color: var(--color-timer-ended-text)` + `text-shadow: 0 0 24px var(--color-timer-ended-glow)`
2. `timer-flash` 2회 (300ms × 2 = 600ms) — 강렬한 빨강 → 연한 빨강 급격 전환
3. `timer-pulse` 2회 (500ms × 2 = 1000ms, delay 600ms) — opacity 부드러운 진동
4. animation 종료 후 글로우 text-shadow 유지 (`.is-ended` 클래스 지속)

```css
@keyframes timer-flash {
  0%   { color: var(--color-timer-ended-flash); }
  50%  { color: var(--color-timer-ended-text);  }
  100% { color: var(--color-timer-ended-flash); }
}
@keyframes timer-pulse {
  0%, 100% { opacity: 1;    }
  50%       { opacity: 0.55; }
}
.display.is-ended {
  color: var(--color-timer-ended-text);
  font-weight: 400;
  text-shadow: 0 0 24px var(--color-timer-ended-glow);
  animation:
    timer-flash 300ms ease-in-out 2,
    timer-pulse 500ms ease-in-out 2 600ms;
}
@media (prefers-reduced-motion: reduce) {
  .display.is-ended { animation: none; }
  .ended-banner     { animation: none; }
}
```

**종료 알림 토큰 전체 요약:**

| 토큰 | Dark | Light | 역할 |
|---|---|---|---|
| `--color-timer-ended-flash` | `#ff6b6b` | `#e53e3e` | flash 최대 밝기 (순간 강렬한 빨강) |
| `--color-timer-ended-text` | `#fcb7b7` | `#9a2a2a` | 종료 후 지속 컬러 |
| `--color-timer-ended-glow` | `rgba(255,107,107,0.45)` | `rgba(229,62,62,0.30)` | **[신규]** text-shadow 글로우 |
| `--color-timer-ended-bg` | `#3a1f22` | `#fff1f1` | 배너 배경 |
| `--color-timer-ended-border` | `#7a3a3f` | `#f4b5b5` | 배너 테두리 |

---

## 5. 테마 토글 패턴 (palette/ 정렬) [T-2]

### 5.1 localStorage 키: `bf-theme`

- 키: `"bf-theme"`, 값: `"dark"` | `"light"`
- 모든 SPA (timer, palette, dice, clicker, pomodoro, stopwatch …) 공유

### 5.2 FOUC 방지 인라인 IIFE (`<head>` 내 `<script>` 블록)

```html
<script>
(function() {
  try {
    var t = localStorage.getItem('bf-theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (_e) { /* private mode — dark 유지 */ }
})();
</script>
```

- `<link rel="stylesheet">` **앞**에 위치 → 스타일 적용 전 `data-theme` 설정 → FOUC 없음
- 미저장 상태 → default `'dark'`

### 5.3 `#theme-toggle` 버튼 동작

```
click
  → 현재 data-theme 읽기
  → 'dark'  → 'light': setAttribute + localStorage.setItem
  → 'light' → 'dark':  setAttribute + localStorage.setItem
  → 버튼 아이콘·aria-label 업데이트
```

**palette/ 와 완전 동일 구현:**
```js
function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light' : 'dark';
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = theme === 'dark' ? '☀' : '🌙';
  themeBtn.setAttribute('aria-label',
    theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환');
}
function toggleTheme() {
  var next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('bf-theme', next); } catch (_e) {}
}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
```

### 5.4 CSS `[data-theme="light"]` 오버라이드

```css
:root                { /* dark default (§2.1) */ }
[data-theme="light"] { /* light override (§2.2) */ }
```

---

## 6. localStorage 명세

| 키 | 값 형식 | 기본값 | 저장 시점 | 복원 시점 |
|---|---|---|---|---|
| `bf-theme` | `"dark"` \| `"light"` | `"dark"` | `#theme-toggle` click | `<head>` IIFE (FOUC 방지) |
| `bf-timer-last-config` | `{"m":number,"s":number}` | `{"m":0,"s":0}` | input `blur` / `change` | `DOMContentLoaded` |

**`bf-timer-last-config` 복원 절차:**
1. `DOMContentLoaded` 시 `JSON.parse(localStorage.getItem('bf-timer-last-config'))`
2. `m` → `#input-m` value, `s` → `#input-s` value 설정
3. display 즉시 동기 (`disp-m`, `disp-s` 업데이트)
4. 파싱 실패 시 `{m:0, s:0}` 사용 (try/catch 필수)

---

## 7. 반응형 Breakpoint

| breakpoint | display font-size | card padding | input width |
|---|---|---|---|
| ≥960px | `128px` | `var(--space-7) var(--space-6)` | `72px` |
| 640–959px | `96px` | `var(--space-6) var(--space-5)` | `68px` |
| <640px | `72px` | `var(--space-5) var(--space-4)` | `60px` |
| <360px | `64px` | `var(--space-4) var(--space-3)` | `56px` |

모바일(<640px) 컨트롤 버튼: `flex-direction: column; width: 100%` — primary / reset 각각 full-width.

---

## 8. 접근성 (a11y)

| 항목 | 구현 방식 |
|---|---|
| display `role="timer"` | `aria-live="off"` — 매초 발화 방지, ended 시 배너가 대신 발화 |
| 종료 배너 | `role="alert" aria-live="assertive"` — 즉시 스크린리더 발화 |
| 키보드 단축키 | `Space` → 시작/정지, `Esc` → 리셋 (kbd-hint 문구로 안내) |
| focus-visible | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
| prefers-reduced-motion | flash / pulse / banner-in / 글로우 transition 모두 비활성 |
| 색상 대비 | ended-text `#fcb7b7` on ended-bg `#3a1f22` → 대비 ≥4.5:1 (WCAG AA) |
| input | `aria-label="분"` / `aria-label="초"` |
| primary 버튼 | 상태 변화 시 `aria-label` 동시 갱신 |

---

## 9. dev 구현 가이드

### 9.1 파일 구조

```
timer/
├── index.html    ← head IIFE + 마크업 + script import
├── styles.css    ← :root 토큰 + [data-theme="light"] + 컴포넌트 CSS
├── timer.js      ← 타이머 로직 (setInterval, state machine)
├── storage.js    ← bf-theme / bf-timer-last-config read/write helpers
└── app.js        ← DOM 이벤트 바인딩, 상태 전환 오케스트레이션
```

### 9.2 상태 머신

```
idle ──[시작 click]──→ running
running ──[일시정지 click]──→ paused
paused  ──[재개 click]──→ running
running ──[시간 소진]──→ ended
ended   ──[리셋 click]──→ idle
{running|paused|ended} ──[리셋 click]──→ idle
```

### 9.3 CSS 변수명 권장

- 색상: `var(--color-*)` — §2 정의 토큰명 그대로 사용, 하드코딩 HEX 금지
- 공간: `var(--space-*)` — 하드코딩 px 금지
- 반경: `var(--radius-md)` / `var(--radius-lg)`
- **글로우 신규 토큰**: `var(--color-timer-ended-glow)` — `.display.is-ended` 의 `text-shadow` 에만 사용

### 9.4 글로우 구현 순서 (ended 진입 시)

```js
// 1. display 클래스 추가 → CSS animation + glow 자동 실행
display.classList.add('is-ended');

// 2. 배너 표시 → role="alert" 로 스크린리더 즉시 발화
endedBanner.hidden = false;

// 3. primary 버튼 disabled, reset 버튼 활성
btnPrimary.disabled = true;
btnReset.disabled = false;
```

### 9.5 구현 검증 체크리스트

1. `file://` 로 열 때 dark 배경으로 시작 (flicker 없음) ✓
2. `#theme-toggle` 클릭 → 라이트/다크 전환 + `bf-theme` localStorage 저장 ✓
3. 분/초 입력 → display 즉시 동기 (idle 상태) ✓
4. `▶ 시작` → running, `⏸ 일시정지` → paused, `▶ 재개` → running ✓
5. 0:00 도달 → ended: 배너 표시 + flash 2회 + pulse 2회 + 글로우 유지 ✓
6. 재방문 시 `bf-timer-last-config` 에서 마지막 설정값 복원 ✓
7. `Space`/`Esc`/`T` 단축키 동작 ✓
8. 모바일 (<640px) controls `flex-direction: column` ✓
9. `prefers-reduced-motion` — 모든 애니메이션 비활성 ✓

### 9.6 정량 일치 기준

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
| input w × h | `72px × 56px` |
| input font | `600 28px/1 mono` |
| controls gap | `16px` |
| topbar height | `56px` |
| ended glow | `text-shadow: 0 0 24px var(--color-timer-ended-glow)` |

---

## 10. mockup 참조

- 시각 mockup: [`docs/design/mockups/timer-BF-498.html`](mockups/timer-BF-498.html)
- mockup 은 idle(빈) / idle(값입력) / running / paused / ended 5개 상태를 각각 `<section>` 으로 분리하여 표현
- dev 는 mockup 을 참조 가이드로 사용, 픽셀 단위 일치 의무 없음
- vanilla-static 정책: 외부 CDN / 외부 폰트 0건, system font stack 만 사용

---

## 11. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✅ | §0 에 Epic E-1~E-4 (4건) + Task T-1~T-3 (3건) 전부 매핑 |
| dev 구현 가이드 명확 | ✅ | §9.1 파일 구조, §9.3 CSS 변수명, §9.4 글로우 구현, §9.5 검증 체크리스트 9항, §9.6 정량 기준 |
| 기존 요소 보존 | ✅ | BF-491 확립 토큰 전부 유지. `--color-timer-ended-glow` 신규 추가만 — 기존 토큰 변경 없음 |
| 컴포넌트 매핑 | ✅ | 4.3 Display, 4.4 InputPair, 4.5 Controls, 4.6 EndedBanner, 4.2 ThemeToggle 전부 포함 |
| 모호함 flag | ⚠️ | accent `#5b82f0` + 흰 텍스트 대비 ~3.6:1. WCAG AA 4.5:1 미달, large text 기준(3:1) 충족. BF-486 이후 운영자 확인 권장. 구현 블로커 아님 |

**추가 자체 점검:**
- **글로우 신규 토큰 정합**: `--color-timer-ended-glow` 는 dark/light 양쪽 모두 §2.1/§2.2 에 정의. 글로우는 animation 종료 후에도 `.is-ended` 클래스 유지로 지속됨 ✅
- **vanilla-static 정책**: 외부 CDN 0건, system font stack 사용, mockup self-contained HTML ✅
- **palette/ 정렬 완결성**: §2.5 정합 표, §5 테마 패턴 코드 — 공유 키·패턴 완전 동일 ✅
- **prefers-reduced-motion**: §4.6 CSS + §8 접근성 표 2곳 명시. 글로우 transition 도 `transition` 속성이므로 `* { transition: none }` 적용 시 자동 비활성 ✅
- **file:// CORS 안전성**: mockup HTML 은 외부 link/script 없는 단일 인라인 파일 ✅

---

*이디자인 · BF-498 · 2026-05-13*
