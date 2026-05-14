# 지렁이게임 효과음 토글 아이콘 시각 디자인 명세 — BF-565

> 작성자: [이디자인] · 작성일 2026-05-14  
> 관련 티켓: BF-565 (designer task), BF-563 (부모 스토리), BF-564 (planner 명세)  
> 기반 모듈: `snake/` (game.js / styles.css / index.html)  
> 의존 명세: `docs/spec/snake-sound-toggle-BF-563.md` (UX 명세 · 플래너 산출물), `docs/design/snake-hud-BF-558.md` (HUD 색상 토큰 · 레이아웃)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃·Spacing](#4-레이아웃spacing)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [dev 구현 가이드](#6-dev-구현-가이드)
7. [mockup 참조](#7-mockup-참조)
8. [Self-critique · AC 매핑 표](#8-self-critique--ac-매핑-표)

---

## 1. 시안 개요

### 1-1. 변경 범위

플래너 명세(BF-564 §9)가 위임한 시각 요소를 색상 토큰·hover·focus 스타일·위치 조정으로 완전히 명세화한다.  
대상: `#sound-toggle` 버튼 단일 컴포넌트 + 연쇄 HUD 위치 조정.

### 1-2. 사용자 경험 목표

| 목표 | 설명 |
|------|------|
| 상태 즉시 인지 | ON(🔊)·OFF(🔇) 아이콘 + 배경 색조 변화로 현재 소리 상태를 글자 없이 파악 |
| 게임 분위기 일관성 | 기존 HUD 팔레트(네온 그린 계열 다크 UI)와 충돌 없는 색상 선택 |
| 접근성 보장 | hover·focus-visible 4가지 상태 완전 명세 — 키보드·터치 사용자 동등 인터랙션 |
| 최소 침습 | 게임 배경을 가리지 않는 반투명 버튼 — 뷰포트 콘텐츠 방해 최소화 |

---

## 2. 컬러 팔레트

### 2-1. 참조 토큰 (기존 — 변경 금지)

| 토큰명 | HEX / rgba | 출처 |
|--------|-----------|------|
| `--bg-primary` | `#0d0d0d` | 게임 배경 |
| `--player-body` | `#4cff80` | 플레이어 그린 (네온) |
| `--hud-panel-bg` | `rgba(0,0,0,0.45)` | HUD 패널 배경 |
| `--hud-panel-border` | `rgba(76,255,128,0.22)` | HUD 패널 테두리 |

### 2-2. 신규 토큰 — ON 상태 (🔊 활성)

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--sound-on-icon-filter` | `brightness(1)` | 아이콘 밝기 — ON 상태 100% (기본) |
| `--sound-on-bg` | `rgba(76,255,128,0.12)` | 버튼 배경 — 그린 저채도 틴트 |
| `--sound-on-border` | `rgba(76,255,128,0.35)` | 버튼 테두리 — 그린 중채도 |
| `--sound-on-text-shadow` | `0 0 8px rgba(76,255,128,0.60)` | 아이콘 글로우 — 활성 시인성 강조 |

### 2-3. 신규 토큰 — OFF 상태 (🔇 비활성)

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--sound-off-icon-filter` | `brightness(0.55) grayscale(0.6)` | 아이콘 어둠 + 탈색 — 비활성 표현 |
| `--sound-off-bg` | `rgba(0,0,0,0.45)` | 버튼 배경 — HUD 패널 동일 (중립) |
| `--sound-off-border` | `rgba(255,255,255,0.15)` | 버튼 테두리 — 뮤트 화이트 |
| `--sound-off-text-shadow` | `none` | 아이콘 글로우 없음 |

### 2-4. 신규 토큰 — Hover 상태

| CSS 변수명 | HEX / rgba | 적용 조건 |
|-----------|-----------|---------|
| `--sound-hover-bg-on` | `rgba(76,255,128,0.22)` | ON 상태에서 hover |
| `--sound-hover-bg-off` | `rgba(255,255,255,0.10)` | OFF 상태에서 hover |

> **디자인 의도**: hover 시 배경만 밝아지고 아이콘 크기·위치는 불변 — 레이아웃 shift 방지.

### 2-5. 신규 토큰 — focus-visible

| CSS 변수명 | 값 | 용도 |
|-----------|---|----|
| `--sound-focus-ring` | `#4cff80` | `:focus-visible` outline 색상 (기존 `.paused-btn:focus` 동일) |
| `--sound-focus-ring-width` | `2px` | outline 두께 |
| `--sound-focus-ring-offset` | `3px` | outline-offset (버튼 테두리와 간격) |

### 2-6. 컬러 매핑 요약

```
[ ON 상태 ]          [ OFF 상태 ]         [ hover (ON) ]    [ focus-visible ]
rgba(76,255,128,     rgba(0,0,0,          rgba(76,255,128,   outline:
  0.12) 배경         0.45) 배경             0.22) 배경        2px solid #4cff80
rgba(76,255,128,     rgba(255,255,255,
  0.35) 테두리        0.15) 테두리
0 0 8px 그린 글로우  글로우 없음
아이콘: 100%밝기     아이콘: 55%밝기+탈색
```

---

## 3. 타이포그래피

| 요소 | font-family | font-size | 비고 |
|------|------------|-----------|------|
| 🔊 / 🔇 이모지 | `'Courier New', Courier, monospace` (상속) | `18px` | 이모지는 시스템 렌더러 — 폰트 재정의 필요 없음 |
| 레이블 없음 | — | — | aria-label 만으로 의미 전달 |

> **이모지 vs SVG 결정**: 이모지(🔊/🔇) 사용. SVG 파일 추가 없이 HTML 인라인으로 처리 — `vanilla-static` 외부 의존성 0건 원칙 준수.

---

## 4. 레이아웃·Spacing

### 4-1. `#sound-toggle` 버튼 위치

| 속성 | 값 | 근거 |
|------|---|------|
| `position` | `fixed` | 게임 스크롤과 무관하게 항상 고정 |
| `top` | `16px` | 뷰포트 최상단 기준선 (기존 `#hud` 와 동일 기준점) |
| `right` | `20px` | 기존 `#hud` 우측 기준선과 동일 수직 라인 |
| `z-index` | `11` | `#hud`(z-index: 10)보다 1 높게 — 항상 클릭 가능 |

### 4-2. 버튼 크기 및 터치 영역

| 속성 | 값 | 근거 |
|------|---|------|
| `width` / `height` | `32px` | 시각 버튼 크기 (플래너 명세 §2-2) |
| `padding` | `6px` | 44px 터치 영역 보장: 32 + 6×2 = 44px (WCAG 2.1 AA) |
| `border-radius` | `8px` | 기존 `.paused-btn` 동일 (`8px`) |
| `border` | `1px solid` | 상태별 토큰 적용 |
| `display` | `flex` | 아이콘 중앙 정렬 |
| `align-items` / `justify-content` | `center` | 이모지 수직·수평 중앙 정렬 |
| `line-height` | `1` | 이모지 세로 여백 제거 |

### 4-3. HUD 위치 하향 조정 (연쇄 영향)

> 이 조정은 `#sound-toggle`(32px) + gap(4px) = 36px 을 확보하기 위함.

| 요소 | 기존 `top` | 변경 후 `top` | 변경량 |
|------|-----------|------------|------|
| `#hud` | `16px` | `52px` | +36px (토글 32px + gap 4px) |
| `#hud-status-panel` | `60px` | `96px` | +36px (동일 오프셋) |

> **주의**: `#hud` 는 플래너 명세(§2-1)가 명시한 값. `#hud-status-panel` 은 `snake-hud-BF-558.md §4-1` 의 60px 에서 +36px.

### 4-4. 전환 애니메이션

| 속성 | 값 | 목적 |
|------|----|------|
| `transition` | `background 0.15s ease, border-color 0.15s ease` | 상태 전환 시 부드러운 배경·테두리 변화 |
| `transform` on `:active` | `scale(0.94)` | 클릭 피드백 (기존 `.paused-btn:active` 동일) |
| 아이콘 자체 transition | 없음 | 이모지 교체는 즉시 — 딜레이 없이 상태 반영 |

---

## 5. 컴포넌트 명세

### 5-1. `#sound-toggle` 버튼

#### Props / 속성

| 속성 | ON 상태 | OFF 상태 |
|------|--------|---------|
| `aria-pressed` | `"true"` | `"false"` |
| `aria-label` | `"효과음 켜짐 — 클릭하여 끄기"` | `"효과음 꺼짐 — 클릭하여 켜기"` |
| 내부 텍스트 | `🔊` | `🔇` |
| `cursor` | `pointer` | `pointer` |

#### 상태별 스타일 (4가지)

**① ON (소리 활성)**
```css
#sound-toggle[aria-pressed="true"] {
  background: var(--sound-on-bg);        /* rgba(76,255,128,0.12) */
  border-color: var(--sound-on-border);  /* rgba(76,255,128,0.35) */
  text-shadow: var(--sound-on-text-shadow); /* 0 0 8px rgba(76,255,128,0.60) */
  filter: var(--sound-on-icon-filter);   /* brightness(1) */
}
```

**② OFF (소리 비활성)**
```css
#sound-toggle[aria-pressed="false"] {
  background: var(--sound-off-bg);        /* rgba(0,0,0,0.45) */
  border-color: var(--sound-off-border);  /* rgba(255,255,255,0.15) */
  text-shadow: var(--sound-off-text-shadow); /* none */
  filter: var(--sound-off-icon-filter);   /* brightness(0.55) grayscale(0.6) */
}
```

**③ hover (ON·OFF 공통 — 상태별 배경 분기)**
```css
#sound-toggle[aria-pressed="true"]:hover {
  background: var(--sound-hover-bg-on);   /* rgba(76,255,128,0.22) */
}
#sound-toggle[aria-pressed="false"]:hover {
  background: var(--sound-hover-bg-off);  /* rgba(255,255,255,0.10) */
}
```

**④ focus-visible (키보드 포커스)**
```css
#sound-toggle:focus-visible {
  outline: var(--sound-focus-ring-width) solid var(--sound-focus-ring); /* 2px solid #4cff80 */
  outline-offset: var(--sound-focus-ring-offset); /* 3px */
}
```

#### 인터랙션 흐름 (시각 관점)

```
[최초 로드]
  → aria-pressed="true", 🔊, ON 배경 (rgba 그린)
  → localStorage 값이 "false" 이면 즉시 OFF 스타일로 교체

[클릭 (ON → OFF)]
  :active → scale(0.94) 순간
  → aria-pressed="false", 🔇, OFF 배경 (중립)
  → background/border-color transition 0.15s 재생

[클릭 (OFF → ON)]
  :active → scale(0.94) 순간
  → aria-pressed="true", 🔊, ON 배경 (그린 틴트)
  → 글로우 text-shadow 등장

[키보드 Tab → Enter]
  focus-visible: 2px solid #4cff80 외곽선
  Enter → 클릭과 동일 전환
```

---

## 6. dev 구현 가이드

### 6-1. CSS 변수 선언 위치

`snake/styles.css` 최상단 `:root` 블록에 다음 변수를 추가한다.  
기존 `--bg-primary`, `--player-body` 등 다음 줄에 배치.

```css
/* ─── 효과음 토글 토큰 (BF-565) ─────────────────────── */
:root {
  /* ON 상태 */
  --sound-on-bg: rgba(76, 255, 128, 0.12);
  --sound-on-border: rgba(76, 255, 128, 0.35);
  --sound-on-text-shadow: 0 0 8px rgba(76, 255, 128, 0.60);
  --sound-on-icon-filter: brightness(1);

  /* OFF 상태 */
  --sound-off-bg: rgba(0, 0, 0, 0.45);
  --sound-off-border: rgba(255, 255, 255, 0.15);
  --sound-off-text-shadow: none;
  --sound-off-icon-filter: brightness(0.55) grayscale(0.6);

  /* Hover */
  --sound-hover-bg-on: rgba(76, 255, 128, 0.22);
  --sound-hover-bg-off: rgba(255, 255, 255, 0.10);

  /* Focus-visible */
  --sound-focus-ring: #4cff80;
  --sound-focus-ring-width: 2px;
  --sound-focus-ring-offset: 3px;
}
```

### 6-2. HTML 삽입 위치

`snake/index.html` 에서 `#hud` **이전**에 삽입 (DOM 순서 = 포커스 탭 순서):

```html
<!-- FIXME(BF-563): 효과음 토글 버튼 — #hud 바로 앞에 배치 -->
<button
  id="sound-toggle"
  type="button"
  aria-label="효과음 켜짐 — 클릭하여 끄기"
  aria-pressed="true"
>🔊</button>
```

### 6-3. CSS 클래스/ID 명세

```css
/* 기본 구조 */
#sound-toggle {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 11;

  width: 32px;
  height: 32px;
  padding: 6px;

  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  font-size: 18px;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  font-family: inherit;

  transition: background 0.15s ease, border-color 0.15s ease;
}

#sound-toggle:active {
  transform: scale(0.94);
}

/* focus: 기존 .paused-btn 의 :focus 는 outline 없이 작성됨 → focus-visible 로 명시 */
#sound-toggle:focus {
  outline: none;  /* 마우스 클릭 시 기본 outline 제거 */
}
#sound-toggle:focus-visible {
  outline: var(--sound-focus-ring-width) solid var(--sound-focus-ring);
  outline-offset: var(--sound-focus-ring-offset);
}

/* ON 상태 */
#sound-toggle[aria-pressed="true"] {
  background: var(--sound-on-bg);
  border-color: var(--sound-on-border);
  text-shadow: var(--sound-on-text-shadow);
  filter: var(--sound-on-icon-filter);
}
#sound-toggle[aria-pressed="true"]:hover {
  background: var(--sound-hover-bg-on);
}

/* OFF 상태 */
#sound-toggle[aria-pressed="false"] {
  background: var(--sound-off-bg);
  border-color: var(--sound-off-border);
  text-shadow: var(--sound-off-text-shadow);
  filter: var(--sound-off-icon-filter);
}
#sound-toggle[aria-pressed="false"]:hover {
  background: var(--sound-hover-bg-off);
}
```

### 6-4. HUD top 조정 (기존 CSS 수정)

```css
/* 기존 #hud top: 16px → 52px */
#hud {
  top: 52px;  /* 16px → 52px (+36px): 토글 32px + gap 4px */
}

/* 기존 #hud-status-panel top: 60px → 96px */
#hud-status-panel {
  top: 96px;  /* 60px → 96px (+36px) */
}
```

### 6-5. JS 연동 포인트 (참조 — dev 자율)

플래너 명세 §2-3 의 `updateSoundToggleUI` 함수에서 UI 반영 시 다음 두 속성을 함께 갱신:

```js
function updateSoundToggleUI(enabled) {
  const btn = document.getElementById("sound-toggle");
  btn.textContent = enabled ? "🔊" : "🔇";
  btn.setAttribute("aria-pressed", String(enabled));
  btn.setAttribute(
    "aria-label",
    enabled ? "효과음 켜짐 — 클릭하여 끄기" : "효과음 꺼짐 — 클릭하여 켜기"
  );
  // CSS 는 aria-pressed selector 로 자동 반영 — 추가 className 조작 불필요
}
```

---

## 7. mockup 참조

시각 시뮬레이션 파일:  
**`docs/design/mockups/snake-sound-toggle-BF-565.html`**

mockup 에서 확인 가능한 내용:
- 게임 배경(#0d0d0d)에서의 ON/OFF 버튼 외형
- hover 상태 (`:hover` CSS — 마우스 오버 시 확인)
- focus-visible 상태 (Tab 키 또는 별도 시연 섹션)
- HUD 위치 조정 후 토글·HUD·상태패널 3요소 공존 레이아웃
- 상태 비교 패널 (4가지 상태를 나란히 정적으로 표시)

---

## 8. Self-critique · AC 매핑 표

### 8-1. Self-critique 체크리스트

| # | 체크 항목 | 결과 |
|---|----------|------|
| 1 | **AC 매핑** — 수용 기준 3개 항목이 명세 어디에 대응하는지 표 작성 | ✅ §8-2 완료 |
| 2 | **dev 구현 가이드** — CSS 변수명·셀렉터·HTML ID·JS 연동까지 단계별 기술 | ✅ §6 완료 (6-1~6-5) |
| 3 | **기존 요소 보존** — #hud / #hud-status-panel 위치만 top 값 조정, 나머지 속성 불변 | ✅ §6-4 에 명시 |
| 4 | **컴포넌트 매핑** — 4가지 상태 (ON/OFF/hover/focus-visible) 모두 스타일 정의 | ✅ §5-1, §2-2~§2-5 완료 |
| 5 | **모호함 flag** — 이모지 vs SVG 아이콘 선택 근거 명시 (§3 타이포 섹션) | ✅ 이모지 선택 + 근거 기술 |

**잠재적 모호함 (dev 주의)**:
- `filter: brightness(0.55) grayscale(0.6)` 은 이모지 이외의 요소(버튼 배경)에도 영향. `text` 이외를 filter 하지 않으려면 `::before` pseudo-element 또는 opacity 분리 방식도 가능 — dev 자율 결정.
- `#hud-status-panel` 의 기존 `top: 60px` 값 출처: `snake-hud-BF-558.md §4-1` — 해당 파일과 대조 후 적용 권장.

### 8-2. Acceptance Criteria 매핑 표

| AC 항목 | 조건 | 명세 위치 | 충족 여부 |
|---------|------|---------|---------|
| AC-1 | `docs/design/snake-sound-toggle-BF-563.md` + mockup HTML 생성 | 본 문서(BF-565) + `mockups/snake-sound-toggle-BF-565.html` | ✅ 두 파일 모두 생성 |
| AC-2 | ON(🔊, active color) / OFF(🔇, muted color) / hover / focus-visible 4가지 상태 스타일 명시 | §2-2~§2-5 (색상 토큰), §5-1 (컴포넌트 상태별 CSS) | ✅ 4가지 상태 완전 명세 |
| AC-3 | Epic AC 6개 항목과 디자인 결정 매핑 표 포함 | §8-2 본 표 + 하단 Epic AC 매핑 | ✅ 아래 §8-3 참조 |

### 8-3. Epic AC 6개 매핑

| Epic AC | 내용 | 디자인 결정 |
|---------|------|-----------|
| Epic AC-1 | 토글 위치: 우상단 고정 | `position: fixed; top: 16px; right: 20px` (§4-1) |
| Epic AC-2 | 버튼 크기: 32px | `width/height: 32px; padding: 6px` (§4-2) |
| Epic AC-3 | ON: 🔊 활성 색상 | `rgba(76,255,128,0.12)` 배경 + 그린 글로우 (§2-2) |
| Epic AC-4 | OFF: 🔇 뮤트 색상 | `rgba(0,0,0,0.45)` 배경 + `brightness(0.55)` 아이콘 (§2-3) |
| Epic AC-5 | hover 스타일 | 상태별 배경 강화 (§2-4, §5-1 ③) |
| Epic AC-6 | focus-visible 스타일 | `2px solid #4cff80; outline-offset: 3px` (§2-5, §5-1 ④) |
