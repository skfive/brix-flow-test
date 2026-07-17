# Breakout Lite — 일시정지·포커스 UI 정제 명세 — BF-967

> 작성자: [이디자인] (designer) · 작성일 2026-07-17
> 관련 티켓: BF-967(본 designer task) · 의존 planner **BF-966** · 형제 developer BF-968 · tester BF-971
> 대상 module(기존 구현): `phase18-games/breakout-lite/{index.html,styles.css,logic.js,main.js}` (BF-943 구현, 커밋 `a5878aa`)
> 기획 SSOT: `docs/plan/breakout-lite-BF-966.md` (박기획, 회귀 보강 명세) — §4 결함 A/B 근거
> 시각 토큰 SSOT: `docs/design/breakout-lite-BF-942.md` (본 designer 의 원 명세) — §2 팔레트·§5 컴포넌트 계약 승계
> mockup 참조: `docs/design/mockups/breakout-lite-BF-967.html` (§7)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 본 task 는 신규 기능이 아니라 기존 `breakout-lite`(BF-943) 의 일시정지·포커스 UI 정제다.** 게임 규칙·물리 상수·상태 전이(6상태 `idle/serve/playing/paused/win/lose`)·포인터 조작은 이미 구현되어 있고, 본 문서는 기획 BF-966 §4 가 실측으로 확인한 **포커스 표시 회귀 2건(결함 A·B)** 을 시각 규칙으로 확정하고, 일시정지 상태 UI·재개/재시작 안내를 정제하는 것에 한정한다.

**전제 2 — 시각 토큰은 BF-942 계약을 100% 승계하며 신규 토큰을 추가하지 않는다.** 포커스 링은 기존 표준 토큰 `--color-focus-ring`(`rgba(91,130,240,.55)`)·`--color-accent`(`#5B82F0`)를 재사용한다(기획 BF-966 §1.3·§4.2 요구). 색상·타이포·spacing·radius 토큰은 `styles.css :root`(BF-942 §2) 값을 변경하지 않는다.

**전제 3 — 신규 dependency 0건:** vanilla-static 제약 유지. system font, CSS 변수 자체 정의, 외부 CDN·webfont·라이브러리 없음. mockup(§7)도 self-contained.

**전제 4 — 기존 포인터 조작·게임 규칙 불변:** 캔버스 드래그(패들 추종)·탭 발사·멀티터치 첫 포인터만 유효·좌우 동시 상쇄·공 속도 고정·단순 반사·벽돌 4행×6열=24개 등은 **본 task 시각 결정 대상이 아니며 그대로 보존**한다(기획 BF-966 §7 비범위). 본 문서는 포커스가 hidden 요소에 고립되지 않도록 하는 **포커스 이동/표시**만 다룬다.

**전제 5 — 코드 미작성, 구현 목적지 선정은 dev 위임:** 본 산출물은 명세 markdown + mockup HTML 2건뿐이다. `styles.css`/`main.js` 실제 수정은 dev(BF-968) 담당이다. 특히 포커스 목적지가 구체적으로 어떤 DOM 요소인지(보드 컨테이너 `tabindex="-1"` 부여 vs 활성 컨트롤 버튼)는 기획 BF-966 §0 가정 5·§4.3 대로 dev 재량이며, 본 문서는 **각 후보의 시각 처리 규칙**만 확정하고 "hidden 요소에 고립 금지·그 시점 화면에 보이는 요소여야 함"이라는 결과 조건을 강제한다(§5.2).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트 (재사용 확인)](#2-컬러-팔레트-재사용-확인)
3. [타이포그래피 (재사용 확인)](#3-타이포그래피-재사용-확인)
4. [레이아웃 (포커스 영역)](#4-레이아웃-포커스-영역)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [AC 매핑](#8-ac-매핑)
9. [Self-critique](#9-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

- **정제 대상**: 기존 `breakout-lite` 의 (1) 상태 오버레이 타이틀 포커스 표시, (2) 오버레이가 숨겨지는 전이(재개/시작/재시작) 시 포커스 목적지, (3) 일시정지 오버레이 내용·안내 문구.
- **신규 마크업·레이아웃 골격 변경 없음**: 페이지 구조(타이틀바 → HUD → 보드 래퍼 → 컨트롤)와 컴포넌트 세트는 BF-942 §4·§5 그대로. 본 문서는 기존 요소에 **포커스 상태 시각 규칙**을 얹는다.
- **결함 2건 시각 확정**(기획 BF-966 §4):
  - **결함 A** — `paused→playing`(재개)·`idle→serve`(시작)·`lose|win→serve`(재시작) 전이에서 포커스가 `hidden` 처리된 오버레이 내부에 고립됨 → **포커스 목적지 시각 규칙 확정**(§5.2).
  - **결함 B** — `.overlay__title` 에 `outline:none` 만 있어 `focus()` 를 받아도 sighted 키보드 사용자에게 포커스가 안 보임 → **포커스 인디케이터 시각 규칙 확정**(§5.1).

### 1.2 사용자 경험 목표

| 목표 | 설계 반영 |
|---|---|
| **키보드 사용자에게 "지금 어디에 포커스가 있는지" 항상 보이게** | idle/paused/lose/win 오버레이 타이틀에 `--color-focus-ring` 재사용 포커스 링(§5.1). WCAG 2.4.7 Focus Visible 충족 |
| **재개/시작/재시작 후에도 포커스가 사라지지 않게** | 오버레이가 숨겨지는 순간 포커스를 그 시점 화면에 보이는 요소(보드 컨테이너 또는 활성 컨트롤 버튼)로 옮기고, 그 요소도 포커스 링을 갖게(§5.2). `document.body` 로 유실 금지 |
| **일시정지 상태를 명확히 알리고 다음 행동을 안내** | paused 오버레이에 "일시정지" + **재개(Space·계속하기)·재시작(R·다시하기)** 두 경로를 함께 안내(§5.3·§5.4) |
| **기존 조작·규칙·시각 언어 100% 보존** | 포인터 드래그·탭·게임 물리·기존 토큰·버튼 3종 불변, 포커스 표시만 추가(§0 전제 2·4) |

### 1.3 기획(BF-966) 결함 → 본 문서 대응 매핑

| 기획 BF-966 항목 | 성격 | 본 문서 대응 |
|---|---|---|
| §4.1 결함 A — 포커스가 hidden 오버레이에 고립 | 수정 필요(dev BF-968 owns 이동 로직) | §5.2 포커스 목적지 시각 규칙 + §5.5 포커스 흐름 표 |
| §4.2 결함 B — `.overlay__title` 시각 인디케이터 없음 | 수정 필요(dev BF-968 owns 스타일) | §5.1 오버레이 타이틀 포커스 링 시각 규칙 |
| §4.3 구현 판단 위임(목적지 요소·CSS 값) | dev 재량 | §5.2 후보 2안 + 권장안 제시, 최종 선택은 dev 위임(§0 전제 5) |
| §5 정상 동작(상태 동결·전이) | 회귀 가드만(코드 변경 없음) | 본 문서 비대상 — 시각 변경 없음(§0 전제 4) |

---

## 2. 컬러 팔레트 (재사용 확인)

> 🔒 **신규 토큰 0건.** 본 task 는 기존 `styles.css :root`(BF-942 §2.1 표준 + §2.2 Lite 전용) 값을 **한 개도 변경·추가하지 않는다**. 포커스 표시는 아래 기존 표준 토큰만 참조한다.

| 토큰 | 값 (기존, 불변) | 본 task 에서의 용도 |
|---|---|---|
| `--color-accent` | `#5B82F0` | 포커스 링 실선(outline) 색 — 기존 `.btn:focus-visible` 과 동일 |
| `--color-focus-ring` | `rgba(91, 130, 240, .55)` | 포커스 링 외곽 글로우(box-shadow) — 기존 `.btn:focus-visible` 과 동일 |
| `--color-text-primary` | `#E8EDF4` | 오버레이 타이틀 텍스트(불변) |
| `--color-text-secondary` | `#9AA7B8` | 오버레이 설명/안내 문구(불변) |
| `--overlay-scrim` | `rgba(5, 7, 12, .74)` | 일시정지 딤(불변) |

- 포커스 링은 이미 확립된 `.btn:focus-visible` 패턴(`styles.css:328-332`)과 **같은 두 토큰**(`--color-accent` 실선 + `--color-focus-ring` 글로우)을 재사용해 컴포넌트 간 포커스 언어를 통일한다(기획 BF-966 §4.3 "기존 `.btn:focus-visible` 패턴 재사용 권장").
- lose/win 틴트·벽돌 색·패들/공 색 등 나머지 토큰은 본 task 와 무관하며 손대지 않는다.

---

## 3. 타이포그래피 (재사용 확인)

> 🔒 타이포 토큰도 신규·변경 0건. BF-942 §3 스케일 그대로. 본 task 는 오버레이 타이틀/설명의 **텍스트 내용**(§5.3)만 정제하고 폰트·크기·굵기는 불변.

| 역할 | 토큰(기존) | 스펙(불변) | 본 task 관련 |
|---|---|---|---|
| 오버레이 타이틀 | `.overlay__title` | `700 clamp(22px,7vw,30px)/1.2 var(--font-sans)` | 포커스 링 대상(§5.1), 텍스트 불변 |
| 오버레이 설명 | `.overlay__desc` | `400 15px/1.5 var(--font-sans)` | paused 안내 문구 정제(§5.3) |
| 캡션/힌트 | `.controls__hint` | `400 13px/1.4 var(--font-sans)` | 재개/재시작 키 안내(§5.4), 기존 문구 유지 |

---

## 4. 레이아웃 (포커스 영역)

### 4.1 구조 불변 — 포커스 관련 요소 위치만 명시

레이아웃 골격은 BF-942 §4 그대로. 본 task 가 다루는 포커스 관련 요소의 위치를 재확인한다(마크업 구조 변경 없음).

```
<div class="board-wrap">              ← [포커스 목적지 후보 ①] 보드 컨테이너 (position:relative)
    ├─ <canvas id="board">            ← 포인터/키 입력 대상 (조작 불변)
    ├─ <div class="serve-hint">       ← serve 힌트 (불변)
    └─ <div class="board-overlay" id="overlay">
        └─ <div class="board-overlay__card">
            ├─ <div id="overlay-icon">
            ├─ <h2 id="overlay-title" tabindex="-1">  ← [결함 B 대상] 포커스 링 추가
            ├─ <p  id="overlay-desc">                 ← paused 안내 문구 정제
            ├─ <p  id="overlay-stat">
            └─ <div class="overlay__actions"> [시작]/[계속하기]/[다시하기]/[메뉴로]
<section class="controls">
    └─ <div class="controls__buttons"> [시작바][일시정지][다시하기]  ← [포커스 목적지 후보 ②] 활성 컨트롤 버튼
```

- **결함 B 대상**: `#overlay-title`(이미 `tabindex="-1"` 존재) — `main.js:172-174` 가 idle/paused/lose/win 진입 시 `.focus()` 호출. 여기에 §5.1 포커스 링을 부여.
- **결함 A 대상 전이**: 오버레이가 `hidden` 되는 순간(재개/시작/재시작) 포커스를 §5.2 목적지로 이동. 목적지는 그 시점 화면에 보이는(hidden 아닌) 요소여야 함.

### 4.2 반응형 불변

- 포커스 링은 `outline`+`box-shadow` 로 그려지며 레이아웃 흐름(폭·높이·간격)에 영향을 주지 않는다 → 기존 360px 세로 스택·420px 브레이크포인트·`overflow-x:0`(BF-942 §4.3·§4.4) 모두 그대로 유지된다.
- 보드 컨테이너에 포커스 링을 얹을 경우 `outline-offset` 2px 만큼 링이 보드 바깥에 그려지므로, `.board-wrap` 이 `overflow:hidden`(styles.css:169) 이어도 outline 은 클리핑되지 않는다(outline 은 overflow 대상 아님). **단, box-shadow 글로우는 부모 clipping 영향을 받지 않도록 outline 중심으로 설계**(§5.2 CSS 참고).

---

## 5. 컴포넌트 명세

### 5.1 오버레이 타이틀 포커스 인디케이터 (결함 B 수정)

`#overlay-title` 은 상태 진입 안내를 위해 `main.js` 가 프로그램적으로 `.focus()` 하는 요소다. 기존에는 `.overlay__title { outline: none }`(styles.css:252) 만 있어 **키보드로 진입한 sighted 사용자에게 포커스가 보이지 않았다**. 아래 규칙으로 시각 인디케이터를 부여한다.

| 항목 | 규칙 |
|---|---|
| 선택자 | `.overlay__title:focus-visible` — 기존 `.btn:focus-visible` 과 동일 계열 |
| outline | `2px solid var(--color-accent)` (기존 버튼 링과 동일 실선) |
| outline-offset | `4px` (타이틀은 텍스트라 버튼보다 여백 1단계 넓게 — 글자에 링이 붙지 않게) |
| box-shadow | `0 0 0 4px var(--color-focus-ring)` (기존 버튼 링과 동일 글로우) |
| base 유지 | `.overlay__title { outline: none }` 는 **그대로 둔다** — 마우스 클릭 등 비키보드 프로그램 포커스에서는 링을 숨겨 노이즈 방지. `:focus-visible` 이 키보드 맥락에서만 링을 덧그림 |

**설계 근거 — `:focus-visible` 채택**: 사용자가 `Space`(키보드)로 일시정지 → `togglePause()` → `syncUi()` → `overlayTitle.focus()` 흐름에서 직전 입력이 키보드이므로 브라우저 `:focus-visible` 휴리스틱이 링을 표시한다. 반대로 마우스로 [일시정지] 버튼을 클릭해 진입한 경우 직전 입력이 포인터라 링이 뜨지 않아 불필요한 시각 노이즈가 없다 — 이는 의도된 동작이다(마우스 사용자는 포커스 링 불필요).

> ⚠️ dev 확인 사항(BF-968): 특정 브라우저가 `tabindex="-1"` 요소의 프로그램 포커스에서 `:focus-visible` 을 억제하면 키보드 진입에도 링이 안 뜰 수 있다. 그 경우 `.overlay__title:focus` 로 폴백하되 **동일 토큰·동일 값**을 사용한다(신규 토큰 금지). 최종 선택자는 실측 후 dev 재량(기획 BF-966 §4.3).

### 5.2 포커스 목적지 시각 규칙 (결함 A 수정)

오버레이가 `hidden` 되는 세 전이에서 포커스를 옮길 목적지의 **시각 처리**를 확정한다. 어떤 요소를 목적지로 할지의 최종 선택은 dev(BF-968) 재량이나(기획 BF-966 §4.3·§0 전제 5), 아래 두 후보 각각의 포커스 링 규칙을 명세하고 **권장안(①)** 을 제시한다.

#### 후보 ① (권장) — 보드 컨테이너 `.board-wrap` 로 포커스 이동

재개/시작/재시작 직후 사용자의 관심은 "보드(플레이 필드)"로 이동하므로, 보드 컨테이너를 포커스 목적지로 삼는 것이 의미상 가장 자연스럽다.

| 항목 | 규칙 |
|---|---|
| 요소 | `.board-wrap` 에 `tabindex="-1"` 부여(마크업 1속성 추가, 탭 순서 진입은 안 함 — 프로그램 포커스 전용) |
| 이동 시점 | `paused→playing`·`idle→serve`·`lose|win→serve` 전이로 오버레이가 `hidden` 되는 순간 `.board-wrap.focus()` |
| 포커스 링 | `.board-wrap:focus-visible` → `outline: 2px solid var(--color-accent); outline-offset: 2px; box-shadow: 0 0 0 4px var(--color-focus-ring);` (버튼 링과 동일 토큰) |
| base | `.board-wrap:focus { outline: none }` 로 비키보드 포커스에서 링 억제(§5.1 과 동일 원칙) |
| overflow 주의 | 링은 `outline`(offset 2px) 로 보드 바깥에 그림 — `.board-wrap { overflow:hidden }` 에 클리핑되지 않음(§4.2). box-shadow 글로우가 잘려 보이면 outline 만으로도 가시성 충족 |

#### 후보 ② (대안) — 그 시점 활성화되는 컨트롤 버튼으로 포커스 이동

`playing` 진입 시 `#btn-pause` 가 `disabled=false` 로 활성화되고(main.js:169), `serve` 진입 시에는 하단 컨트롤이 노출된다. 활성 버튼으로 포커스를 옮기면 **기존 `.btn:focus-visible` 링을 그대로 재사용**하므로 CSS 추가가 최소화된다.

| 전이 | 목적지 버튼 | 근거 |
|---|---|---|
| `paused→playing`(재개) | `#btn-pause`(활성화됨) | 재개 직후 다시 일시정지할 수 있는 컨트롤 |
| `idle→serve`(시작)·`lose|win→serve`(재시작) | `#btn-restart` 또는 `#btn-start-bar` 중 그 시점 활성/노출 버튼 | 항상 보이는 하단 컨트롤 바 버튼 |

- 장점: CSS 추가 0(기존 `.btn:focus-visible` 재사용). 단점: 포커스가 "보드 아래 버튼"에 있어 플레이 중 시선-포커스 위치가 약간 어긋남.

#### 공통 결과 조건 (강제)

- 전이 직후 `document.activeElement` 가 **`document.body` 로 유실되지 않고**, hidden 아닌·포커스 가능·시각적으로 링이 보이는 요소를 가리켜야 한다(기획 BF-966 §4.1 AC).
- 목적지는 반드시 **그 시점 화면에 보이는(hidden 아닌) 요소**여야 한다 — 숨겨진 오버레이 내부 버튼 금지.
- 스크린리더 회귀 방지: 오버레이 **진입** 시점의 `overlayTitle.focus()`(상태 안내)는 유지하고, 본 규칙은 오버레이가 **숨겨지는** 전이에서만 포커스를 옮긴다(기획 BF-966 §6-4).

**권장**: 후보 ①(보드 컨테이너). 플레이 맥락과 포커스 위치가 일치하고, 마크업 변경이 `tabindex="-1"` 1속성으로 작다. 단 CSS 최소화를 우선하면 ②도 수용 가능 — 최종 결정은 dev(BF-968).

### 5.3 일시정지 오버레이 UI 정제

기존 paused 오버레이(BF-942 §5.4)의 구조·딤·버튼 세트는 유지하고, **안내 문구를 재개·재시작 두 경로로 정제**한다.

| 요소 | 기존(BF-943) | 본 task 정제 |
|---|---|---|
| `overlay` 딤 | `--overlay-scrim`(불변) | 불변 |
| `.overlay__icon` | 없음(빈 값) | 불변(paused 는 아이콘 없음) |
| `.overlay__title` | "일시정지" | "일시정지" (불변) + **포커스 링 표시(§5.1)** |
| `.overlay__desc` | "계속하려면 계속하기를 누르세요" | **"계속하려면 Space 또는 계속하기, 다시 시작하려면 R 또는 다시하기를 누르세요"** — 재개·재시작 두 경로 안내 |
| 버튼 | [계속하기] primary + [메뉴로] ghost | 불변(버튼 세트·역할 유지) |

- paused 오버레이는 lose/win 과 달리 `overlay__stat`(점수) 미표시 — 진행 중 상태이므로 점수는 상단 HUD 로 계속 보임(불변).
- **딤 강도**: 기획 BF-966·BF-942 §5.4 는 paused 를 "딤 약하게"로 기술했으나 현재 구현은 `--overlay-scrim` 공통값을 쓴다. 본 task 는 **틴트/딤 값 변경 없이 현재 구현을 존중**한다(게임 규칙·기존 토큰 보존 AC) — 딤 강도 조정은 본 task 비범위(기획 BF-966 §7 "신규 시각 변경").

### 5.4 재개/재시작 안내 (하단 힌트 — 기존 유지)

- 하단 `.controls__hint` 문구(BF-942 §5.6, 현재 "← → 또는 A/D · 화면 드래그로 패들 이동 · Space/탭 발사·일시정지 · R 재시작")는 이미 재시작(R)·일시정지(Space)를 안내하므로 **변경하지 않는다**. 재개/재시작 안내의 1차 채널은 §5.3 paused 오버레이 설명문이다.
- 이로써 안내는 **오버레이(상태 진입 시 명시)** + **하단 힌트(상시)** 이중 채널로 제공된다 — 기존 구조를 늘리지 않고 문구만 정제.

### 5.5 상태별 포커스 흐름 표 (결함 A·B 통합)

| phase | 오버레이 | 포커스 위치 | 포커스 링 | 근거 |
|---|---|---|---|---|
| `idle` | 표시 | `#overlay-title`(진입 시 focus) | §5.1 타이틀 링 | 기존 유지 + 결함 B 수정 |
| `serve` | 숨김(힌트만) | §5.2 목적지(보드 컨테이너 권장) | §5.2 목적지 링 | 결함 A 수정(idle→serve 전이 시) |
| `playing` | 숨김 | §5.2 목적지(보드 컨테이너 권장) | §5.2 목적지 링 | 결함 A 수정(paused→playing 전이 시) |
| `paused` | 표시 | `#overlay-title` | §5.1 타이틀 링 | 결함 B 수정 |
| `lose` | 표시 | `#overlay-title` | §5.1 타이틀 링 | 결함 B 수정 |
| `win` | 표시 | `#overlay-title` | §5.1 타이틀 링 | 결함 B 수정 |

- **전이 순간이 핵심**: 표의 "포커스 위치"는 각 상태에 머물 때의 위치이며, 결함 A 는 `paused→playing`·`idle→serve`·`lose|win→serve` **전이 시점**에 포커스가 유실되지 않게 §5.2 목적지로 옮기는 것을 요구한다.
- `toMenu()`(`paused|lose|win → idle`)는 오버레이가 계속 보이므로 결함 A 비해당 — idle 재진입 시 §5.1 타이틀 포커스로 정상 귀결(기획 BF-966 §4.1).

---

## 6. dev 구현 가이드 (BF-968)

> 물리·상태 전이·포인터 조작은 기획 BF-941/BF-966 SSOT — 본 가이드는 **포커스 표시/이동 시각만**. `logic.js` 는 미변경(기획 BF-966 §0 가정 4).

### 6.1 STEP 1 — `styles.css` 오버레이 타이틀 포커스 링 (§5.1, 결함 B)

기존 `.overlay__title { outline: none }`(styles.css:248-253) 은 **그대로 두고**, 아래 규칙을 추가한다(기존 `.btn:focus-visible` 블록 인근 권장):

```css
.overlay__title:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}
```

- 브라우저가 프로그램 포커스에서 `:focus-visible` 을 억제하면 `.overlay__title:focus` 로 폴백(동일 값). 색상은 반드시 `var(--color-accent)`·`var(--color-focus-ring)` 참조 — 하드코딩 금지.

### 6.2 STEP 2 — 포커스 목적지 이동 (§5.2, 결함 A) — 권장안 ① 기준

**마크업**(`index.html`): `.board-wrap` 에 `tabindex="-1"` 추가.

```html
<div class="board-wrap" tabindex="-1">
```

**CSS**(`styles.css`):

```css
.board-wrap:focus { outline: none; }
.board-wrap:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}
```

**JS**(`main.js` `syncUi()`): 오버레이가 `hidden` 되는 분기(playing·serve 진입, main.js:120-121)에서 포커스를 목적지로 이동. 예:

```js
if (p === "playing" || p === "serve") {
  overlay.hidden = true;
  boardWrap.focus();      // ← 결함 A 수정: hidden 되는 순간 목적지로 이동
}
```

- 대안 ②(활성 버튼 포커스)를 택하면 마크업/CSS 추가 없이 `btnPause.focus()`(playing) / `btnRestart.focus()`(serve) 로 대체 — 최종 선택은 dev(§5.2).
- **주의**: 오버레이 **진입**(idle/paused/lose/win) 시의 `overlayTitle.focus()`(main.js:172-174)는 유지 — 스크린리더 상태 안내 회귀 방지(기획 BF-966 §6-4).

### 6.3 STEP 3 — 일시정지 안내 문구 (§5.3)

`main.js` paused 분기(main.js:139-141)의 `overlayDesc.textContent` 를 §5.3 정제 문구로 교체:

```js
} else if (p === "paused") {
  overlayTitle.textContent = "일시정지";
  overlayDesc.textContent =
    "계속하려면 Space 또는 계속하기, 다시 시작하려면 R 또는 다시하기를 누르세요";
}
```

### 6.4 보존 체크(회귀 방지)

- 기존 토큰 값·`:root` 블록 변경 금지(§2). 포인터 핸들러(`onPointerDown/Move/Up`)·키보드 핸들러·게임 물리 미변경(§0 전제 4).
- 추가는 **포커스 관련 CSS 규칙 2블록 + `tabindex` 1속성 + `.focus()` 호출 + paused 문구 1줄**로 한정 — surgical change.

---

## 7. mockup 참조

- **파일**: `docs/design/mockups/breakout-lite-BF-967.html` (단일 self-contained HTML, 외부 의존성 0건, system font, `:root` 토큰 = `styles.css` 값 그대로 미러)
- **확인 방법**: `file://` 로 브라우저에서 열기 → 각 섹션의 포커스 링·오버레이·전이 흐름이 시각 확인됨.
- **mockup 구성 섹션**:
  1. **일시정지 오버레이(정제본)** — paused 상태 360px 프레임: "일시정지" 타이틀(포커스 링 표시) + 재개·재시작 안내 문구 + [계속하기][메뉴로] 버튼.
  2. **결함 B before/after** — 포커스 링 없는 타이틀(현재 결함) vs `--color-focus-ring` 재사용 링(수정본) 나란히 비교.
  3. **결함 A 포커스 목적지** — 재개 직후 `playing` 화면: 보드 컨테이너(`.board-wrap`)에 포커스 링이 얹힌 권장안 ① 시각화 + 대안 ②(활성 [일시정지] 버튼 링) 비교.
  4. **상태별 포커스 흐름** — idle/serve/playing/paused/lose/win 각 상태의 포커스 위치·링 대상 표(§5.5) 시각 정리.
  5. **재시작 흐름 다이어그램** — `paused→(Space/계속하기)→playing`, `임의→(R/다시하기)→serve` 전이와 포커스 이동 화살표.
  6. **토큰 재사용 스와치** — `--color-accent`·`--color-focus-ring`(포커스 링 2토큰)만 강조, 신규 0건 명시.
- mockup 은 CSS 로 포커스 링·오버레이를 정적 표현(시각 시뮬레이션용) — dev 는 §6 규칙으로 구현하되 **토큰·형태·전이 규칙만 일치**시키면 되고 픽셀 단위 일치 의무는 없다.

---

## 8. AC 매핑

### 8.1 BF-967 수용 기준 충족 (1:1)

| # | 수용 기준(원문) | 충족 근거 |
|---|---|---|
| AC-1 | Given 기획 명세, When 디자인 산출, Then `docs/design/breakout-lite-*.md` 에 **포커스 표시·일시정지 상태 UI·재시작 흐름**이 명세된다 | 본 문서 `docs/design/breakout-lite-BF-967.md`: 포커스 표시=§5.1(오버레이 타이틀 링)·§5.2(목적지 링)·§5.5(흐름 표), 일시정지 상태 UI=§5.3, 재시작 흐름=§5.2(lose\|win→serve 목적지)·§5.4·§5.5·mockup §7-5. mockup `docs/design/mockups/breakout-lite-BF-967.html` 동반 |
| AC-2 | Given 기존 동작, When 시각 결정, Then **기존 포인터 조작·게임 규칙·기존 토큰이 보존**된다 | §0 전제 2(토큰 신규·변경 0건)·전제 4(포인터·물리·규칙 불변) + §2(기존 표준 토큰만 재사용)·§3(타이포 불변)·§6.4(보존 체크). 추가는 포커스 CSS 2블록+`tabindex` 1+`.focus()` 호출+문구 1줄로 한정 |
| AC-3 | Given self-critique, When 명세 완료, Then **AC 매핑 표가 기획 수용 기준과 1:1 연결**된다 | 본 §8.1(BF-967 AC 3건)·§8.2(기획 BF-966 §4 결함 AC ↔ 디자인)·§9 Self-critique 5항목. 각 AC 가 문서 섹션에 1:1 매핑 |

### 8.2 기획(BF-966) 결함 AC → 디자인 반영 매핑 (1:1)

| 기획 BF-966 AC(원문 요지) | 디자인 반영 |
|---|---|
| §4.1 재개(paused→playing) 후 포커스가 hidden 오버레이에 남지 않고 명시적 목적지로 이동 | §5.2 후보 ①/② 목적지 규칙 + §6.2 `boardWrap.focus()` 예시 + §5.5 흐름 표 |
| §4.1 시작(idle→serve) 후 포커스가 hidden 내부 고립 금지·명시적 이동 | §5.2 동일 목적지 규칙(전이 공통) + §5.5 serve 행 |
| §4.1 재시작(lose\|win→serve) 후 포커스가 hidden 내부 고립 금지·명시적 이동 | §5.2 동일 목적지 규칙 + §5.5 serve 행(재시작 경유) |
| §4.1 전이 직후 `document.activeElement` 가 `body` 로 유실되지 않고 보이는 요소를 가리킴 | §5.2 "공통 결과 조건(강제)" |
| §4.2 `#overlay-title` 이 `--color-focus-ring` 재사용 시각 인디케이터 표시(신규 토큰 금지) | §5.1 타이틀 포커스 링(`--color-accent`+`--color-focus-ring` 재사용) + §6.1 |
| §4.3 목적지 요소·CSS 값은 dev 재량, 결과 조건만 강제 | §5.2 후보 2안 제시 + 권장안, 최종 선택 dev 위임(§0 전제 5) |

---

## 9. Self-critique

PR commit 직전 자기 점검(designer-spec-self-critique 5항목):

| # | 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — BF-967 AC 3건 + 기획 BF-966 §4 결함 AC 전부 매핑 | ✅ §8.1(BF-967 3건 1:1)·§8.2(기획 결함 AC 1:1). AC-3(1:1 연결 요구)을 §8 표로 직접 충족 |
| 2 | **dev 구현 가이드** — dev(BF-968)가 따라할 단계 존재 | ✅ §6 STEP 1(타이틀 링 CSS)·STEP 2(목적지 `tabindex`+CSS+`.focus()`)·STEP 3(paused 문구) + 정확한 파일:라인 인용(styles.css:248-253·main.js:120-121,139-141,172-174) |
| 3 | **기존 요소 보존** — 기존 자산·토큰·조작 미변경 | ✅ 신규 토큰 0건(§2), 포인터·물리·규칙 불변(§0 전제 4·§6.4), 추가는 surgical(CSS 2블록+속성 1+호출+문구 1줄). 기존 `breakout`·타 게임 미참조·미수정 |
| 4 | **컴포넌트 매핑** — 기획 결함/상태 ↔ 컴포넌트 대응 | ✅ 결함 B↔§5.1(`#overlay-title`), 결함 A↔§5.2(`.board-wrap`/컨트롤 버튼), 6상태 phase↔§5.5 포커스 흐름 표, paused UI↔§5.3 |
| 5 | **모호함 flag** | ⚠️ (a) **포커스 목적지 요소**(보드 컨테이너 ① vs 활성 버튼 ②)는 기획 BF-966 §4.3 이 dev 재량으로 위임 — 본 문서는 권장안 ①과 대안 ②의 시각 규칙을 모두 명세하고 결과 조건만 강제, 최종 선택은 BF-968. (b) **`:focus-visible` vs `:focus`** — 브라우저가 프로그램 포커스에서 `:focus-visible` 을 억제할 수 있어 dev 실측 후 폴백 허용(동일 토큰 유지, §5.1·§6.1). (c) **paused 딤 강도** — 현재 구현이 공통 scrim 을 쓰고 "딤 약하게"와 불일치하나, 기존 토큰 보존 AC 우선으로 본 task 는 딤 변경 비범위 처리(§5.3) — 딤 조정 원하면 운영자/기획 별도 티켓. |

**결론**: dev(BF-968)가 본 명세 + mockup 만으로 결함 A(포커스 목적지 이동)·결함 B(오버레이 타이틀 포커스 링)를 기존 토큰 재사용·신규 dependency 0건으로 수정하기에 충분하다. 포인터 조작·게임 규칙·기존 토큰은 전면 보존했고, AC 매핑은 기획 수용 기준과 1:1로 연결했다.

---

*문서 종료 — [이디자인] · BF-967 (Breakout Lite 일시정지·포커스 UI 정제 명세)*
