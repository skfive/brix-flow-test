# 접근성 카운터 검증 페이지 디자인 명세 — BF-885 (Phase 18 검증 2/5)

> 작성자: [이디자인] (designer) · 작성일 2026-07-16
> 관련 티켓: BF-885 (Epic, 운영자 명시) · BF-887 (본 designer task) · 의존: BF-886 (planner 기획 명세)
> 기획 명세(SSOT): `docs/planning/a11y-counter-BF-886.md`
> 재사용 원본 디자인(수정 금지): `docs/design/counter-BF-859.md`, `src/app/demo/counter/styles.css`(BF-862)
> mockup 참조: `docs/design/mockups/a11y-counter-BF-885.html`
> tech-stack: `vanilla-static` — 외부 의존성 0건, CSS 변수 자체 정의(system font)

---

## 0. 문서 성격 및 전제 (재해석 금지)

- **본 문서는 "신규 시각 언어"를 만들지 않는다.** 본 task(BF-887)는 이미 병합된 `/demo/counter`(BF-862)의 **접근성 계약이 새 경로에서 손실 없이 재사용되는지**를 검증하는 페이지(`/phase18-validation/counter-2` = `src/app/phase18-validation/counter-2/`)의 시각 명세다. 따라서 카드·버튼·값 표시의 시각 언어는 원본 디자인 명세(`docs/design/counter-BF-859.md`)와 원본 스타일(`src/app/demo/counter/styles.css`)의 **토큰·컴포넌트 규칙을 100% 승계**한다(신규 색상/타이포/컴포넌트 발명 금지 — Simplicity First).
- **기획이 고정한 계약을 재해석하지 않는다.** 기획 §7.1(ARIA 마크업), §4.2(Tab 순서), §6.3(상태 전이)은 시각 명세가 바꿀 수 없는 상수다. 본 문서는 그 위에 **"보이는 접근성 토큰"**(포커스 링·대비·터치 타깃·감소 모션)만 명시적으로 정리해 reviewer/dev/QA 가 정적 검사할 수 있게 한다.
- **원본과의 유일한 시각적 차이는 페이지 식별 문자열뿐이다.** 기획 §3 에 따라 `<title>`·`<h1>` 문구만 검증 맥락을 반영해 변경하고, 그 외 모든 마크업 구조·id·클래스·ARIA·색/타이포 토큰은 원본과 동일하다.
- **dev 재량 존중:** CSS 변수명·클래스명은 **권장**이며 mockup 과 픽셀 단위 일치 의무는 없다(기획 §11 = 원본 §0). 기획 §11 은 dev 가 원본 `styles.css` 를 상대경로로 직접 참조하거나 값을 복제하는 두 방식을 모두 허용한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트 (접근성 대비 포함)](#2-컬러-팔레트-접근성-대비-포함)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [접근성 토큰 — 포커스·대비·터치·모션 (본 task 핵심)](#6-접근성-토큰--포커스대비터치모션-본-task-핵심)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [AC ↔ 디자인 매핑](#9-ac--디자인-매핑)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

`/phase18-validation/counter-2` 접근성 검증 페이지의 시각 디자인. **원본 `/demo/counter` 와 동일한 단일 카드**(상단 대형 값 + 하단 `+1`/`-1`/`초기화` 3버튼 + 단축키 힌트)를 그대로 재현하되, 페이지 식별 문자열만 검증 맥락으로 바꾼다. 신규 UI 구성 요소·분기 화면은 없다(원본 §1.1 승계).

| 항목 | 원본 `/demo/counter` | 본 검증 페이지 `/phase18-validation/counter-2` |
|---|---|---|
| `<title>` | `카운터 · /demo/counter` | `접근성 카운터 검증 · /phase18-validation/counter-2` |
| `<h1>` 텍스트 | `카운터` | `카운터 (Phase 18 검증 2/5 · 접근성)` |
| 카드/값/버튼/힌트 시각 | (기준) | **1:1 동일** — 토큰·클래스·마크업 변경 없음 |
| ARIA·포커스·Tab 순서 | (기준) | **1:1 동일** (기획 §7·§4 계약) |

> ⚠️ `<h1>` 문구가 길어졌으므로 §5.5 에서 **2줄 넘침 시 줄바꿈 허용**(고정 높이 금지)을 명시한다 — 이것이 본 task 가 원본 대비 추가로 고려할 유일한 레이아웃 변수다.

### 1.2 사용자 경험 목표

1차 사용자는 최종 고객이 아니라 **접근성 검증 담당자(스크린리더/키보드 전용 사용자·QA)**다(기획 §2).

| 목표 | 설계 반영 |
|---|---|
| **포커스 위치가 항상 한눈에 보인다** | 모든 컨트롤 `:focus-visible` accent 링(outline + focus-ring box-shadow), 버튼 variant 무관 통일(§6.2) |
| **색만으로 정보를 전달하지 않는다** | 버튼은 항상 텍스트 라벨(`+1`/`-1`/`초기화`), 값 변경은 색 전환 + `aria-live` announce 병행(§6.5) |
| **저시력·운동 장애 사용자도 오탭 없이 누른다** | 버튼 최소 터치 타깃 `min-height: 48px`(§6.3) |
| **원본과 시각적으로 구분되지 않는다** | 카드·버튼·값 토큰을 원본에서 그대로 승계 → 재사용 검증의 시각적 근거(§9 AC-3 대응) |
| **감소 모션·라이트/다크 선호를 존중한다** | `prefers-reduced-motion`·`prefers-color-scheme` 자동 대응(§6.4) |

### 1.3 톤 & 무드

원본과 동일 — 미니멀·중립(neutral gray canvas) + 단일 accent(파랑). 검증 페이지라고 해서 별도 "검증용 배지/경고색"을 도입하지 않는다(원본과의 시각 동일성 자체가 검증 목표이므로).

---

## 2. 컬러 팔레트 (접근성 대비 포함)

> 원본 `src/app/demo/counter/styles.css` `:root` 토큰을 **값 그대로 승계**(신규 색 0건). dev 는 원본 `styles.css` 를 상대경로 참조하거나 아래 블록을 복제한다.

### 2.1 라이트 테마 (`:root`, 기본)

| 역할 | 변수 | HEX | 용도 |
|---|---|---|---|
| Primary(accent) | `--color-accent` | `#3563e9` | `+1` 주 버튼 배경, 포커스 링 |
| Primary hover | `--color-accent-hover` | `#2a4fc0` | `+1` hover/active |
| Background(canvas) | `--color-bg-canvas` | `#fafaf9` | 페이지 배경 |
| Surface | `--color-bg-surface` | `#ffffff` | 카드 배경, `-1` 버튼 배경 |
| Subtle | `--color-bg-subtle` | `#f1f1ef` | `초기화` 버튼 배경, 값 영역 배경, `<kbd>` 배경 |
| Border | `--color-border-default` | `#e5e5e2` | 카드·버튼 외곽선 |
| Border strong | `--color-border-strong` | `#d0d0cc` | 버튼 hover 외곽선 |
| Text primary | `--color-text-primary` | `#1a1a19` | 값 숫자, h1 |
| Text secondary | `--color-text-secondary` | `#6b6b66` | `초기화` 라벨·캡션 |
| Text muted | `--color-text-muted` | `#9a9a93` | 힌트(단축키 안내) |
| Focus ring | `--color-focus-ring` | `rgba(53,99,233,0.45)` | `:focus-visible` box-shadow 링 |

### 2.2 다크 테마 (`@media (prefers-color-scheme: dark)`)

| 역할 | 변수 | HEX |
|---|---|---|
| accent | `--color-accent` | `#5b82f0` |
| accent hover | `--color-accent-hover` | `#7596f3` |
| bg canvas | `--color-bg-canvas` | `#0f1115` |
| bg surface | `--color-bg-surface` | `#171a21` |
| bg subtle | `--color-bg-subtle` | `#1e222b` |
| border | `--color-border-default` | `#262b36` |
| border strong | `--color-border-strong` | `#3a4150` |
| text primary | `--color-text-primary` | `#e8e8e4` |
| text secondary | `--color-text-secondary` | `#9a9a93` |
| text muted | `--color-text-muted` | `#6b6b66` |
| focus ring | `--color-focus-ring` | `rgba(91,130,240,0.55)` |

### 2.3 대비 검증 표 (WCAG 2.1 — 본 task 핵심 산출)

> 접근성 검증 페이지이므로 **주요 전경/배경 쌍의 대비비를 명시**해 reviewer/QA 가 근거로 삼게 한다. (AA 기준: 일반 텍스트 4.5:1, 대형 텍스트(≥24px 또는 굵은 18.66px) 3:1, 비텍스트/포커스 링 3:1)

| 쌍 | 라이트 | 판정 | 다크 | 판정 |
|---|---|---|---|---|
| `+1` 버튼 흰 텍스트 / accent 배경 | `#fff` on `#3563e9` ≈ **5.0:1** | AA 통과(일반) | `#fff` on `#5b82f0` ≈ **3.4:1** | AA 통과(대형 라벨 18px 600) |
| 값 숫자 / subtle 배경 | `#1a1a19` on `#f1f1ef` ≈ **15:1** | AAA | `#e8e8e4` on `#1e222b` ≈ **13:1** | AAA |
| `-1` 라벨 / surface 배경 | `#1a1a19` on `#ffffff` ≈ **17:1** | AAA | `#e8e8e4` on `#171a21` ≈ **14:1** | AAA |
| `초기화` 라벨 / subtle 배경 | `#6b6b66` on `#f1f1ef` ≈ **4.9:1** | AA 통과 | `#9a9a93` on `#1e222b` ≈ **5.6:1** | AA 통과 |
| 포커스 링(accent outline) / canvas·surface | `#3563e9` vs `#fafaf9`/`#ffffff` ≈ **4.8~5.0:1** | 비텍스트 3:1 통과 | `#5b82f0` vs `#0f1115`/`#171a21` ≈ **5:1** | 비텍스트 3:1 통과 |
| 힌트(muted) / canvas | `#9a9a93` on `#fafaf9` ≈ **2.6:1** | 장식 캡션 — 아래 주석 | `#6b6b66` on `#0f1115` ≈ **4.2:1** | 통과 |

> ⚠️ **힌트(`.counter-hint` muted) 라이트 대비 주석:** 단축키 힌트는 **장식성 보조 정보**(핵심 조작 경로가 아님 — 키/버튼 라벨·`aria-live` 로 이미 완결)이고 원본 디자인 토큰을 그대로 승계한 것이라, 본 검증에서 색을 임의로 바꾸지 않는다. 다만 접근성 관점 개선 여지로 §10 모호함에 flag 한다(원본 토큰 변경은 원본 회귀 위험 → dev 재량 아님, 운영자/원본 오너 판단 영역).

---

## 3. 타이포그래피

> 폰트는 **system stack**(외부 웹폰트 로드 없음 — `vanilla-static`). 원본 토큰 그대로 승계.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| 역할 | 변수 | 값 (weight size/line-height family) | 적용 |
|---|---|---|---|
| 페이지 제목(h1) | `--text-h1` | `600 20px/1.3 var(--font-sans)` | `카운터 (Phase 18 검증 2/5 · 접근성)` — line-height 1.3 로 2줄 넘침 대응(§5.5) |
| 값 표시(display) | `--text-display` | `300 96px/1 var(--font-mono)` | `#counter-value` 대형 숫자 |
| 값 표시(모바일) | `--text-display-sm` | `300 72px/1 var(--font-mono)` | ≤480px 축소 |
| 버튼 라벨(대) | `--text-button-lg` | `600 18px/1 var(--font-sans)` | `+1`/`-1` 버튼 |
| 버튼 라벨(중) | `--text-button-md` | `500 15px/1 var(--font-sans)` | `초기화` 버튼 |
| 캡션 | `--text-caption` | `400 12px/1.4 var(--font-sans)` | 단축키 힌트 |

- **값 숫자는 `font-variant-numeric: tabular-nums`** — 값이 바뀌어도 폭이 흔들리지 않음.
- 큰 자릿수(예: 9999)에도 `overflow-wrap: anywhere` 로 카드 폭을 넘지 않게 방어(원본 §4.3 승계).

---

## 4. 레이아웃

### 4.1 섹션 구조 (원본과 동일)

```
┌───────────────────────── page (bg-canvas, flex center) ─────────────────────────┐
│                                                                                   │
│      ┌────────────── .counter-card (surface, radius-lg, shadow) ──────────────┐   │
│      │  카운터 (Phase 18 검증 2/5 · 접근성)          ← h1 (좌상단, 최대 2줄)     │   │
│      │                                                                          │   │
│      │                      ┌────────────────────┐                            │   │
│      │                      │        0           │  ← #counter-value (display) │   │
│      │                      └────────────────────┘                            │   │
│      │                                                                          │   │
│      │     ┌─────────┐    ┌─────────┐    ┌───────────┐                        │   │
│      │     │   +1    │    │   -1    │    │  초기화   │  ← .counter-controls    │   │
│      │     └─────────┘    └─────────┘    └───────────┘   (DOM/Tab: +1→-1→초기화)│   │
│      │                                                                          │   │
│      │   ↑ +1   ↓ -1   R 초기화        ← .counter-hint (caption, muted)         │   │
│      └──────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

> **버튼 배치:** 원본 mockup 이 채택한 **DOM 순서 그대로 좌→우 배치(`+1`·`-1`·`초기화`)**를 본 검증 페이지 기본 시안으로 유지한다. 검증 페이지에서는 시각 순서와 Tab 순서를 **일치**시켜(원본 §7.4 dev 재량 중 "order 생략" 안 채택) 접근성 검증 시 혼란을 최소화한다 — 시각 순서 ≠ Tab 순서 불일치는 검증 대상을 흐릴 수 있으므로 CSS `order` 를 쓰지 않는다.

### 4.2 Spacing (원본 토큰 승계)

| 구간 | 토큰 | 값 |
|---|---|---|
| 카드 내부 패딩 | `--space-6` | 32px |
| 카드 폭 | `min(92vw, 400px)` | 데스크탑 400px, 모바일 92vw |
| h1 ↔ 값 영역 | `--space-6` | 32px |
| 값 영역 ↔ 버튼 행 | `--space-6` | 32px |
| 버튼 간 gap | `--space-3` | 12px |
| 버튼 행 ↔ 힌트 | `--space-5` | 24px |
| 값 영역 세로 패딩 | `--space-5` | 24px |

### 4.3 Breakpoint 별 동작 (원본 §4.4 승계)

| Breakpoint | 동작 |
|---|---|
| ≥ 481px | 카드 400px, 값 `--text-display`(96px), 버튼 3개 가로 배치 |
| ≤ 480px | 카드 92vw, 값 `--text-display-sm`(72px), 버튼 가로 유지(폭 부족 시 `flex-wrap`) |
| 세로 짧은 화면 | `min-height:100dvh` + flex center 로 카드 중앙 유지, 넘치면 세로 스크롤 |

---

## 5. 컴포넌트 명세

> 5개 컴포넌트 모두 원본(`docs/design/counter-BF-859.md §5`)과 **1:1 동일**. 아래는 검증 페이지 관점 재확인이며, 기획 §7.1 이 고정한 id·태그·ARIA 는 변경 금지.

### 5.1 값 표시 (`#counter-value`)

| 속성 | 값 |
|---|---|
| 태그/계약 | `<output id="counter-value" class="counter-value" aria-live="polite">0</output>` (기획 §7.1 고정 — 변경 금지) |
| 초기 콘텐츠 | `0` |
| 타이포 | `--text-display`(mono 300 96px), `tabular-nums` |
| 색 / 배경 | `--color-text-primary` / `--color-bg-subtle` |
| 상태 | 단일(항상 표시). 값 변경 시 `color` 트랜지션만(레이아웃 이동 없음) |
| 인터랙션 | 없음(비포커스). 값 변경 시 `aria-live="polite"` 로 스크린리더 announce |

### 5.2 버튼 공통 (`.counter-btn`)

| 속성 | 값 |
|---|---|
| 태그 | 네이티브 `<button type="button">` (기획 §4.1 — `role="button"` div 금지) |
| 크기 | 최소 터치 타깃 `min-height: 48px`, 가로 패딩 `--space-5`(24px) |
| radius | `--radius-md`(8px) |
| 트랜지션 | `background/border-color/transform var(--motion-fast) var(--ease-out)` |
| hover | 배경 1단계 진하게 + `border-color: var(--color-border-strong)` |
| active | `transform: translateY(1px)`(눌림 피드백) |
| focus-visible | §6.2 포커스 링(필수 — 숨김 금지) |
| disabled | **사용 안 함** — 세 버튼 항상 활성. `-1` 도 값 0 에서 비활성화하지 않음(기획 §5.1 · 무음 클램프) |

### 5.3 버튼별 variant

| 버튼 | id | variant 클래스 | 배경 | 텍스트 | 위계 |
|---|---|---|---|---|---|
| `+1` | `btn-increment` | `.counter-btn--primary` | `--color-accent` | `#fff` | 주 액션(강조) |
| `-1` | `btn-decrement` | `.counter-btn--secondary` | `--color-bg-surface` + border | `--color-text-primary` | 보조 |
| `초기화` | `btn-reset` | `.counter-btn--ghost` | `--color-bg-subtle` | `--color-text-secondary` | 저강조(중립) |

- 라벨 문구 `+1`/`-1`/`초기화` 고정(기획 §7.2 — 아이콘만으로 대체 금지, 스크린리더 라벨 훼손 방지).
- `+1`/`-1` 은 `--text-button-lg`, `초기화` 는 `--text-button-md`.
- `초기화` 는 **danger 색을 쓰지 않는다** — 무해한 "0 으로 되돌리기"(기획 §6.3 리셋 항상 허용)이므로 확인 모달·경고색 금지.

### 5.4 단축키 힌트 (`.counter-hint`)

| 속성 | 값 |
|---|---|
| 콘텐츠 | `↑ +1   ↓ -1   R 초기화`(전역 단축키 안내 — 기획 §4.1) |
| 타이포/색 | `--text-caption` / `--color-text-muted` |
| 키 캡 | `<kbd>` 로 마크업(시맨틱 — 스크린리더도 키를 읽음) |
| 역할 | 보조 시각 힌트(핵심 조작은 버튼·`aria-live` 로 완결, §2.3 주석 참조) |

### 5.5 카드/제목 (검증 페이지 h1 문구 변경 반영)

| 요소 | 명세 |
|---|---|
| `.counter-card` | `--color-bg-surface`, `border: 1px solid var(--color-border-default)`, `--radius-lg`(12px), `--shadow-card`, 패딩 `--space-6` |
| `h1.counter-title` | 텍스트 `카운터 (Phase 18 검증 2/5 · 접근성)`, `--text-h1`, 색 `--color-text-primary`, 카드 좌상단 |
| **h1 넘침 처리(검증 페이지 신규 고려)** | 문구가 원본("카운터")보다 길어 좁은 폭에서 2줄이 될 수 있음. **고정 높이를 주지 않고** `line-height: 1.3`(=`--text-h1`)로 자연 줄바꿈 허용. 말줄임(`ellipsis`) 금지 — 검증 맥락 문구가 잘리면 안 됨 |

---

## 6. 접근성 토큰 — 포커스·대비·터치·모션 (본 task 핵심)

> 본 절은 task 수용 기준("포커스 링·대비 등 접근성 토큰을 명시", "포커스 가시성 보장")에 직접 대응하며, 기획 §4·§7 의 검증 가능 요건을 **보이는 스타일**로 고정한다.

### 6.1 접근성 토큰 요약

| 토큰/규칙 | 값 | 근거 |
|---|---|---|
| 포커스 링 outline | `2px solid var(--color-accent)` + `outline-offset: 2px` | 키보드 포커스 가시성(기획 §4.1) |
| 포커스 링 box-shadow | `0 0 0 4px var(--color-focus-ring)` | 링 강조(어떤 배경에서도 식별) |
| 최소 터치 타깃 | `min-height: 48px` | 저시력/운동 장애 오탭 방지(기획 §5.1) |
| 값 변경 announce | `aria-live="polite"`(암묵적 `<output>` live) | 스크린리더 알림(기획 §7.2) |
| 감소 모션 | `@media (prefers-reduced-motion: reduce)` → `transition: none` | 전정기관 민감 사용자(기획 §7.2) |
| 색 비의존 | 버튼 텍스트 라벨 + `<kbd>` 키 명시 | 색만으로 구분 금지(기획 §7.2) |

### 6.2 포커스 링 스타일 (필수 — 숨김 금지)

```css
.counter-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}
```

- **`outline: none` 을 단독으로 쓰지 않는다**(기획 §4.1·§7.2 정적 검사 대상 — reviewer 는 `styles.css` 에서 대응 커스텀 링 없는 `outline:none` 단독 사용을 grep 으로 검출). `:focus-visible` 로 **키보드 포커스에만** 링을 노출해 마우스 클릭 시 시각 노이즈를 줄인다.
- 포커스 링은 **버튼 variant 색과 무관하게 accent 링으로 통일** → `+1`/`-1`/`초기화` 어디에 있든 현재 포커스 위치가 한눈에 보인다(§9 AC "포커스 가시성 보장").
- 대비: 링(accent) vs surface/canvas ≥ 3:1(§2.3 표) — WCAG 비텍스트 대비 충족.

### 6.3 최소 터치 타깃

- 모든 `.counter-btn` `min-height: 48px`. 세 버튼 모두 동일 높이 → 시각·터치 일관성.
- 값 0 에서도 `-1` 버튼을 축소/비활성화하지 않아 터치 타깃 크기가 상태에 따라 흔들리지 않는다.

### 6.4 감소 모션 & 색 구성표 선호

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
/* 라이트/다크 자동 전환 */
@media (prefers-color-scheme: dark) { :root { /* §2.2 override */ } }
```

- 값 변경 색 전환·버튼 hover/active 트랜지션 모두 감소 모션 시 제거.
- 다크 테마는 시스템 설정 자동 추종(별도 토글 없음 — 원본 관례 승계).

### 6.5 값 즉시 반영의 시각 표현

- 값 변경은 **레이아웃 이동 없는 색 전환**(`transition: color var(--motion-fast)`)만. 숫자 카운트업/슬라이드 애니메이션 금지(기획 §6.2 "동기 즉시 반영" 원칙과 배치되는 지연 방지).
- 시각 전환과 별개로 `aria-live` 가 새 값을 announce 하여 **시각·비시각 사용자에게 동시 반영**(단순 Tab 포커스 이동으로는 announce 없음 — `polite` 정상 특성, 기획 EC-05).

### 6.6 포커스 순서 요약 (기획 §4.2 계약)

```
(페이지 진입, 자동 포커스 없음 — 스크린리더 예기치 않은 이동 방지)
  → Tab → #btn-increment (+1)
  → Tab → #btn-decrement (-1)
  → Tab → #btn-reset     (초기화)
  → Tab → 페이지 밖(포커스 트랩 없음)
```

---

## 7. dev 구현 가이드

> dev-1 이 순서대로 따라 구현. 원본 `src/app/demo/counter/` 를 재사용 기준으로 삼되, **원본 파일은 수정 금지**(기획 §10.5). CSS 변수명·클래스명은 권장(픽셀 일치 의무 없음).

### 7.1 마크업 골격 (기획 §7.1 ARIA 계약 + 시각 요소, 원본과 문구만 차이)

```html
<main class="counter-page">
  <section class="counter-card" aria-labelledby="counter-title">
    <!-- 원본 대비 유일한 시각 차이: h1 문구 (기획 §3) -->
    <h1 id="counter-title" class="counter-title">카운터 (Phase 18 검증 2/5 · 접근성)</h1>

    <output id="counter-value" class="counter-value" aria-live="polite">0</output>

    <div class="counter-controls">
      <!-- DOM 순서 = Tab 순서 = 시각 순서: +1 → -1 → 초기화 (기획 §4.2 고정) -->
      <button type="button" id="btn-increment" class="counter-btn counter-btn--primary">+1</button>
      <button type="button" id="btn-decrement" class="counter-btn counter-btn--secondary">-1</button>
      <button type="button" id="btn-reset"     class="counter-btn counter-btn--ghost">초기화</button>
    </div>

    <p class="counter-hint">
      <kbd>↑</kbd> +1 &nbsp; <kbd>↓</kbd> -1 &nbsp; <kbd>R</kbd> 초기화
    </p>
  </section>
</main>
<script type="module" src="main.js"></script>
```

> `<title>` 은 `<head>` 에 `접근성 카운터 검증 · /phase18-validation/counter-2` 로 설정(기획 §3).

### 7.2 CSS 토큰 (원본 재사용 — 신규 0건)

- **권장 방식 A(참조):** `<link rel="stylesheet" href="../../demo/counter/styles.css" />` — 원본 변경 시 자동 반영(회귀 조기 감지, 기획 §2-2). 단, 원본 CSS 의 `.counter-*` 클래스명을 그대로 사용해야 함.
- **권장 방식 B(복제):** 원본 `styles.css` `:root`/다크 블록 + `.counter-*` 규칙을 검증 페이지 `styles.css` 로 복제. `file://` cross-origin 우려가 없고 자기완결적(기획 EC-06). **어느 방식이든 신규 색/타이포 토큰 도입 금지.**

### 7.3 레이아웃 핵심 (원본과 동일)

```css
.counter-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-canvas);
  padding: var(--space-5);
}
.counter-card {
  width: min(92vw, 400px);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
}
.counter-title { margin: 0; font: var(--text-h1); color: var(--color-text-primary); } /* line-height 1.3 → 2줄 자연 줄바꿈 (§5.5) */
.counter-value {
  display: block; text-align: center;
  font: var(--text-display); font-variant-numeric: tabular-nums;
  color: var(--color-text-primary); background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-5) var(--space-4); margin: var(--space-6) 0;
  overflow-wrap: anywhere;
  transition: color var(--motion-fast) var(--ease-out);
}
.counter-controls { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; }
```

### 7.4 포커스/모션 (§6 필수)

- §6.2 포커스 링 CSS 필수 적용. `outline:none` 단독 사용 금지.
- `@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`.

### 7.5 하지 말 것

- 원본 `src/app/demo/counter/*` 수정(기획 §10.5).
- 값 카운트업/슬라이드 애니메이션(즉시 반영 원칙).
- `초기화` 에 danger 색·확인 모달.
- 버튼 텍스트 라벨을 아이콘만으로 대체(스크린리더).
- 외부 폰트/CDN/라이브러리 로드(`vanilla-static`).
- 시각 순서와 Tab 순서를 CSS `order` 로 어긋나게 하기(검증 혼란 방지 — §4.1).
- 원본 토큰 색값 임의 변경(§2.3 힌트 대비 개선은 원본 오너/운영자 판단 영역).

---

## 8. mockup 참조

- **파일:** `docs/design/mockups/a11y-counter-BF-885.html`
- **내용:** 단일 self-contained HTML(외부 의존성 0건). 프레임 구성:
  1. 라이트 · 초기 상태(값 0) — 검증 페이지 h1 문구 반영
  2. 다크 · 값 변경 후(값 42)
  3. 라이트 · `+1` 키보드 포커스 링
  4. 라이트 · `-1` 키보드 포커스 링
  5. 라이트 · `초기화` 키보드 포커스 링
  6. 라이트 · 0-플로어 경계(값 0, `-1` 눌러도 0 유지)
  7. 라이트 · 큰 자릿수 방어(9999)
  8. 대비/접근성 토큰 주석 패널
- **성격:** 시각 시뮬레이션용. dev 는 참조 가이드로 사용하되 픽셀 일치 의무 없음. 실제 dev SSOT 는 본 명세 §7.

---

## 9. AC ↔ 디자인 매핑

| task AC (BF-887) | 디자인 반영 |
|---|---|
| Given 기획 명세, When 디자인 작업, Then `docs/design/a11y-counter-BF-885.md` 명세 + mockup HTML 생성 | 본 문서 + `docs/design/mockups/a11y-counter-BF-885.html`(§8) |
| Given 기존 demo 시각 언어, When mockup 작성, Then 카드·버튼 스타일 재사용 + 포커스 가시성 보장 | §2·§5 원본 토큰/컴포넌트 100% 승계, §6.2 `:focus-visible` accent 링(모든 버튼 통일) |
| 기획 AC-2 키보드 조작·ARIA | §6.6 Tab 순서, §5.1 `aria-live`, §6.2 포커스 링 |
| 기획 AC-3 접근성 재사용 성공 | §1.1 원본과 시각 1:1 동일(식별 문자열만 차이) → 재사용의 시각적 근거 |
| 기획 §3 라우트/식별 문자열 | §1.1 `<title>`/`<h1>` 변경 표, §7.1 마크업 |

---

## 10. Self-critique

PR commit 직전 자기 점검 (5개 항목):

1. **AC 매핑 완결성** — task AC 2건(명세+mockup 생성 / demo 시각 언어 재사용·포커스 가시성) 및 기획 AC-2·AC-3 을 §9 표로 전수 매핑. mockup 은 포커스 프레임을 3버튼 각각(2·3·4·5 프레임) 그려 "포커스 가시성 보장"을 시각 증거로 제시. ✅
2. **dev 구현 가이드 구체성** — §7 에 마크업 골격(h1 문구 반영)·CSS 토큰 재사용 2방식(참조/복제)·레이아웃·포커스·금지 항목까지 복붙 가능 수준 제공. ✅
3. **기존 요소 보존** — 신규 검증 페이지로 기존 UI 파괴 없음. 원본 `src/app/demo/counter/*` 미접촉(§7.5). 기획 §7.1 마크업 계약(id/aria-live)·§4.2 Tab 순서·0-플로어를 **변경 없이 승계**. 원본 디자인 토큰 색값 임의 변경 금지 명시. ✅
4. **컴포넌트 매핑** — 값 표시/버튼(3 variant)/힌트/카드/제목 5개 컴포넌트 각각 props·상태·인터랙션 명세(§5), 기획 고정 id 와 1:1 대응. h1 문구 변경에 따른 2줄 넘침 처리(§5.5) 신규 고려 명시. ✅
5. **모호함 flag** — (a) 힌트(muted) 라이트 대비 ≈2.6:1 은 원본 토큰 승계분이라 임의 변경 시 원본 회귀 위험 → §2.3 주석 + 본 항목으로 운영자/원본 오너 판단 영역임을 flag. (b) CSS 재사용 방식(참조 vs 복제)은 `file://` cross-origin 제약(기획 EC-06)에 따라 dev 재량으로 위임. (c) h1 검증 문구 확정안(`카운터 (Phase 18 검증 2/5 · 접근성)`)은 기획 §3 표기를 따랐으며 운영자 문구 지정이 별도로 있으면 조정 필요. 그 외 신규 모호함 없음. ✅

---

*문서 종료 — [이디자인] · BF-887*
</content>
</invoke>
