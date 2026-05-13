# 타이머 SPA 디자인 명세 (BF-485)

> 대상 feature: BF-485 · 작성 task: BF-486 (designer)
> mockup (시스템 capture): [`docs/design/mockups/timer-BF-486.html`](mockups/timer-BF-486.html)
> mockup (AC 명시 경로): [`timer/mockup.html`](../../timer/mockup.html)
> 작성자: 이디자인
> 선행 명세: [`docs/design/timer-BF-479.md`](timer-BF-479.md) (bf-timer-last-config 키 통일 · 전체 토큰 체계 확립)
> 상세 명세: [`docs/design/timer-BF-486.md`](timer-BF-486.md) (본 명세의 extended 버전)

---

## 1. 시안 개요

### 1.1 변경 범위 (BF-479 이후)

| 항목 | BF-479 (선행) | BF-485/486 (본 명세) |
|---|---|---|
| 명세 목적 | 정합성 재확인 + localStorage 키 통일 | **전체 명세 재확인 + palette/ 패턴 정렬 명시** |
| mockup 경로 | `timer/mockup.html` | `docs/design/mockups/timer-BF-486.html` (시스템 캡처) + `timer/mockup.html` (AC) |
| palette/ 정렬 | 미언급 | **명시**: dark default + bf-theme + #theme-toggle 패턴이 palette/ 와 동일함을 확인 |
| 토큰·레이아웃·타이포 | BF-479 §2~§4 정의 | **동일** — 본 명세에서 재수록 |

### 1.2 사용자 경험 목표

- **다크 우선 렌더**: 첫 방문 시 dark 배경에서 시작. `bf-theme` localStorage 로 영속. head 인라인 IIFE 로 flicker 없음.
- **한 눈에 남은 시간**: 128px monospace display 로 mm:ss 자릿수 흔들림 없이 표시.
- **즉시 시작·중단·재개**: primary 버튼 1개로 시작 → 일시정지 → 재개 토글. ghost 버튼으로 리셋.
- **분/초 입력 즉시 반영**: idle 상태에서 number input 2개 노출 → 입력 즉시 display 동기.
- **종료 시각 알림**: 배너(⏰) + display 펄스 + 종료 색상 강조로 dark/light 양쪽에서 명확한 신호.
- **설정 영속**: 마지막 입력값을 `bf-timer-last-config` 로 저장, 재방문 시 복원.

### 1.3 비목표 (Out of Scope)

- 다중 타이머 동시 실행
- 사운드 / 진동 / Notification API
- 프리셋·히스토리
- 카운트업 (스톱워치) 모드

---

## 2. 디자인 토큰

### 2.1 색상 토큰 — Dark Default (`:root`)

| 토큰명 | Dark HEX | 용도 |
|---|---|---|
| `--color-bg-canvas` | `#0f1115` | 페이지 전체 배경 |
| `--color-bg-surface` | `#171a21` | 카드 표면 · topbar 배경 |
| `--color-bg-subtle` | `#1e222b` | 버튼 hover / 입력 배경 |
| `--color-border-default` | `#262b36` | topbar border · kbd 테두리 |
| `--color-border-strong` | `#3a4150` | input · ghost button outline |
| `--color-text-primary` | `#e8e8e4` | 본문 · display (idle값>0 / running / paused) |
| `--color-text-secondary` | `#9a9a93` | label "분/초" · 리셋 버튼 기본색 |
| `--color-text-muted` | `#6b6b66` | placeholder · idle 0:00 display · hint · kbd-hint |
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
| `--color-timer-running` | `#1f8a5c` | running 색 (light) |
| `--color-timer-paused` | `#b7791f` | paused 색 (light) |
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
| `--shadow-card` | dark: `0 4px 16px rgba(0,0,0,0.32)` |
| `--shadow-popover` | `0 4px 12px rgba(0,0,0,0.10)` |

### 2.5 palette/ 정렬 확인 표

| 토큰명 | timer dark | palette dark | 일치 |
|---|---|---|---|
| `--color-text-primary` | `#e8e8e4` | `#e8e8e4` | ✅ |
| `--color-text-secondary` | `#9a9a93` | `#9a9a93` | ✅ |
| `--space-*` | 동일 | 동일 | ✅ |
| `--radius-*` | 동일 | 동일 | ✅ |
| `bf-theme` localStorage 키 | 공유 | 공유 | ✅ |
| head IIFE flicker 방지 패턴 | 동일 | 동일 | ✅ |
| `#theme-toggle` + `data-theme` | 동일 | 동일 | ✅ |
| `--color-bg-canvas` | `#0f1115` | `#0d1117` | ⚠️ 근소 차이 — 운영자 결정 위임 |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
             "Pretendard", "Apple SD Gothic Neo", sans-serif
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace
```

| role | 토큰명 | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 페이지 제목 | `--text-h1` | `20px` | `600` | `1.3` | topbar "타이머" |
| **display (≥960px)** | `--text-display` | **`128px`** | `300` | `1` | mm:ss 카운트다운 |
| **display (640–959px)** | `--text-display-md` | **`96px`** | `300` | `1` | 반응형 축소 |
| **display (<640px)** | `--text-display-sm` | **`72px`** | `300` | `1` | 반응형 축소 |
| display (<360px) | — | `64px` | `300` | `1` | 추가 축소 |
| input 숫자 | — | `28px` | `600` | `1` | mono, text-align center |
| label "분/초" | `--text-caption` | `12px` | `400` | `1.4` | micro-label |
| button-lg | `--text-button-lg` | `16px` | `600` | `1` | 시작/일시정지/재개 |
| button | `--text-button` | `14px` | `500` | `1` | ghost 버튼 |
| label | `--text-label` | `14px` | `500` | `1.4` | 배너 텍스트 |

---

## 4. 레이아웃

### 4.1 전체 구조 (desktop ≥960px)

```
┌──────────────────────────────────────────────────────────┐
│ topbar: "타이머"                          [☀ / 🌙 토글] │  h=56px
├──────────────────────────────────────────────────────────┤
│         ┌───────────────────────────────────────┐        │
│         │ ⏰  시간이 다 됐어요           [닫기] │ ← 배너 │
│         │           0 : 00                      │ 128px  │
│         │     [  00 ] : [  00 ]                 │ ← idle │
│         │        분         초                  │        │
│         │     분과 초를 입력하세요               │ ← hint │
│         │  [▶ 시작]  [⟲ 리셋]                  │        │
│         │  Space 시작/정지 · Esc 리셋            │        │
│         └───────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

- **page 컨테이너**: `flex: 1 1 auto; display: flex; justify-content: center; align-items: flex-start; padding: var(--space-7) var(--space-5)`
- **timer card**: `width: 100%; max-width: 720px; background: --color-bg-surface; border-radius: --radius-lg; box-shadow: --shadow-card; padding: var(--space-7) var(--space-6)`

### 4.2 반응형 Breakpoint

| breakpoint | 변경 항목 |
|---|---|
| `≥ 960px` | display `128px` / card `max-width: 720px; padding: --space-7 --space-6` |
| `640–959px` | display `96px` / card `max-width: 560px` / input `64px × 52px` |
| `< 640px` | display `72px` / card `max-width: 100%` / controls `flex-direction: column` |
| `< 360px` | display `font-size: 64px` |

---

## 5. 컴포넌트 명세

### 5.1 `<TimerDisplay>` — [E1: 카운트다운 표시]

- `class="display"`, `role="timer"`, `aria-live="off"`, `aria-label="남은 시간"`
- 폰트: `--font-mono` + `font-variant-numeric: tabular-nums`
- 상태별: `is-empty` (muted), 기본 (primary), `is-ended` (ended-text + 펄스 2회)

### 5.2 `<TimeInputPair>` — [E2: 분/초 입력 폼]

- `id="input-pair"`, idle 상태에서만 노출 (`hidden` attribute 사용)
- `#input-m` (분 0–99) · `#input-s` (초 0–59) — `type="number"`, `inputmode="numeric"`
- `input` 이벤트 → display 즉시 동기 / `blur` → range clamp

### 5.3 `<ControlButtons>` — [E3: 컨트롤 버튼 4종]

- `#btn-primary` (`.btn--primary-lg`) — 시작/일시정지/재개 토글
- `#btn-reset` (`.btn--ghost-lg`) — 리셋/새 타이머

| state | hasValue | primary | reset |
|---|---|---|---|
| idle | false | ▶ 시작 (disabled) | ⟲ 리셋 (disabled) |
| idle | true | ▶ 시작 (enabled) | ⟲ 리셋 (enabled) |
| running | — | ⏸ 일시정지 (enabled) | ⟲ 리셋 (enabled) |
| paused | — | ▶ 재개 (enabled) | ⟲ 리셋 (enabled) |
| ended | — | ▶ 시작 (disabled) | ⟲ 새 타이머 (enabled) |

### 5.4 `<EndedBanner>` — [E4: 종료 시각적 알림]

- `id="ended-banner"`, `role="status"`, `aria-live="polite"`, `hidden` (기본)
- 종료 시: `hidden` 제거 → fade-in 200ms
- `--color-timer-ended-bg` 배경 + `--color-timer-ended-text` 텍스트

### 5.5 `#theme-toggle` — dark/light 토글 (palette/ 동일 패턴)

- dark 활성: `textContent="☀"`, `aria-label="라이트 테마로 전환"`
- light 활성: `textContent="🌙"`, `aria-label="다크 테마로 전환"`
- head IIFE + `localStorage["bf-theme"]` + `data-theme` attribute

---

## 6. localStorage 명세

| 키 | 타입 | SPA 공유 | 기본값 |
|---|---|---|---|
| `bf-theme` | `"dark" \| "light"` | **전 SPA 공유** (palette/ 포함) | `"dark"` |
| `bf-timer-last-config` | `JSON { minutes, seconds }` | timer 전용 | — (없으면 0:00) |

### 6.1 bf-theme 패턴 (head IIFE)

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem("bf-theme");
      var theme = saved === "light" || saved === "dark" ? saved : "dark";
      document.documentElement.setAttribute("data-theme", theme);
    } catch (_e) {}
  })();
</script>
```

---

## 7. dev 구현 가이드

### 7.1 정량 일치 기준

| 항목 | 값 |
|---|---|
| card max-width (desktop) | `720px` |
| card padding (desktop) | `48px 32px` |
| display font-size (≥960px) | `128px` |
| display font-size (640–959px) | `96px` |
| display font-size (<640px) | `72px` |
| primary-lg height / min-width | `56px / 160px` |
| ghost-lg height / min-width | `56px / 120px` |
| input w × h | `72px × 56px` |
| input font | `600 28px/1 mono` |
| controls gap | `16px` |
| banner padding | `12px 16px` |
| focus-ring | `2px solid; offset: 2px` |

### 7.2 구현 검증 체크리스트

1. `file://` 로 열 때 dark 배경 시작 (flicker 없음) ✓
2. `#theme-toggle` 클릭 → 라이트/다크 전환 + `bf-theme` localStorage 저장 ✓
3. 분/초 입력 → display 즉시 동기 (idle 상태) ✓
4. `▶ 시작` → running, `⏸ 일시정지` → paused, `▶ 재개` → running ✓
5. 0:00 도달 → ended: 배너 표시 + display 펄스 + 버튼 상태 변경 ✓
6. 재방문 시 `bf-timer-last-config` 에서 마지막 설정값 복원 ✓
7. `Space`/`Esc`/`T` 단축키 동작 ✓

---

## 8. mockup 참조

- **시스템 캡처 (필수)**: [`docs/design/mockups/timer-BF-486.html`](mockups/timer-BF-486.html)
- **AC 명시 경로**: [`timer/mockup.html`](../../timer/mockup.html)
- 단일 self-contained HTML (외부 의존성 0건 · system font · 인라인 style/script)
- 5가지 상태 패널: ① idle(0:00) ② idle(25:00) ③ running(08:42) ④ paused(04:15) ⑤ ended(0:00)

---

## 9. AC 매핑 표

### 9.1 Epic 수용 기준 → UI 요소 1:1 매핑

| # | Epic 수용 기준 | UI 요소 | 명세 섹션 |
|---|---|---|---|
| **E1** | 카운트다운 mm:ss large display + 상태별 색상 + monospace | `<TimerDisplay>` — `.display` | §5.1 |
| **E2** | 분/초 입력 폼 — idle 상태 + 입력 즉시 display 동기 | `<TimeInputPair>` — `.input-pair` | §5.2 |
| **E3** | 시작/일시정지/재개/리셋 버튼 — 상태별 라벨·활성화 | `<ControlButtons>` — `#btn-primary` + `#btn-reset` | §5.3 |
| **E4** | 종료 시각적 알림 — 배너 + display 펄스 + 색상 강조 | `<EndedBanner>` + `.display.is-ended` | §5.4 |

### 9.2 Designer Task AC (BF-486) → 산출물 매핑

| # | Designer Task AC | 산출물 | 확인 위치 |
|---|---|---|---|
| **D1** | `docs/design/timer-BF-485.md` 명세 파일 (AC 매핑 표 포함) | 본 파일 | 본 §9 |
| **D2** | dark default + bf-theme + #theme-toggle이 palette/ 와 동일 | §2.5 (정렬 표), §5.5, §6.1 | §2.5 |
| **D3** | mockup `file://` 외부 CDN 0건 + dark default | `timer-BF-486.html` + `timer/mockup.html` | §8 |
| **D4** | 분/초 입력·카운트다운·버튼 4종·종료 알림 명세 포함 | §5.1~§5.4 | §4, §5 |

---

## 10. Self-critique

| 체크 항목 | 결과 | 비고 |
|---|---|---|
| AC 매핑 완료 | ✅ | §9.1 E1~E4 전부 매핑, §9.2 D1~D4 전부 매핑 |
| dev 구현 가이드 명확 | ✅ | §7.1 정량 기준, §7.2 체크리스트 7항 |
| 기존 요소 보존 | ✅ | 기존 `timer/` 구현 변경 없음. 명세 재확인 용도 |
| 컴포넌트 매핑 | ✅ | §5.1~5.5 전부 (Display·InputPair·Controls·Banner·ThemeToggle) |
| 모호함 flag | ⚠️ | accent `#5b82f0` + 흰 텍스트 대비 ~3.6:1. large text AA(3:1) 충족. 운영자 확인 권장 |
| palette/ 정렬 | ✅ | §2.5 비교 표 — bf-theme 공유 키·head IIFE·data-theme 패턴 완전 동일. bg-canvas 근소 차이 flag |
| mockup 이중 경로 | ✅ | `docs/design/mockups/timer-BF-486.html` + `timer/mockup.html` 모두 생성 |
| 외부 의존성 | ✅ | mockup HTML 인라인 style+script만 사용, 외부 CDN/link 0건 |
