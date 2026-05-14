# 지렁이게임 HUD/모달/통계 시각 디자인 명세 — BF-558

> 작성자: [이디자인] · 작성일 2026-05-14  
> 관련 티켓: BF-558 (designer task), BF-556 (부모 스토리), BF-557 (planner 명세)  
> 기반 모듈: `snake/` (game.js / logic.js / styles.css / index.html)  
> 의존 명세: `docs/design/snake-hud-BF-556.md` (layout/IA), `docs/design/snake-items-BF-538.md` (아이템 토큰), `docs/design/snake-effects-BF-536.md` (이팩트 팔레트)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃·Spacing](#4-레이아웃spacing)
5. [컴포넌트 명세](#5-컴포넌트-명세)
   - 5-1. 우상단 HUD 상태 패널
   - 5-2. 일시정지 모달 버튼
   - 5-3. 게임 오버 통계 화면
6. [전환 애니메이션](#6-전환-애니메이션)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [mockup 참조](#8-mockup-참조)
9. [Self-critique · AC 매핑 표](#9-self-critique--ac-매핑-표)

---

## 1. 시안 개요

### 1-1. 변경 범위

플래너 명세(BF-556 §1-2)가 정의한 3개 화면 레이어에 **색상 토큰·타이포·spacing·전환 애니메이션**을 부여한다.  
기존 게임 보드·HUD(점수 패널)·이팩트·아이템 HUD 의 시각 언어와 충돌 없이 정합성을 유지한다.

### 1-2. 사용자 경험 목표

| 목표 | 설명 |
|------|------|
| 상태 즉시 인지 | HUD 패널에서 뱀 길이·속도를 시선 이동 없이 파악 |
| 조작 힌트 직관화 | 일시정지 모달 버튼에 단축키 배지가 함께 표시돼 학습 부담 제거 |
| 달성감 강화 | 신기록 시 골드 글로우 + 배지로 감정 피드백 명확화 |
| 게임 톤 통일 | 다크 배경·네온 계열 팔레트 일관 — 기존 이팩트·아이템 시각과 동일 계열 |

---

## 2. 컬러 팔레트

### 2-1. 기존 토큰 (변경 금지 — 참조만)

| 토큰명 | HEX | 용도 |
|--------|-----|------|
| `--bg-primary` | `#0d0d0d` | 게임 배경 |
| `--player-body` | `#4cff80` | 플레이어 몸통 |
| `--player-head` | `#00cc44` | 플레이어 헤드 |
| `--cpu-body` | `#ff6b4c` | CPU 몸통 |
| `--cpu-head` | `#cc2200` | CPU 헤드 |
| `--item-speed-primary` | `#ffaa00` | SPEED_UP 주색 |
| `--item-slow-primary` | `#00ddcc` | SLOW_DOWN 주색 |
| `--item-burst-primary` | `#ff6600` | LENGTH_BURST 주색 |
| `--item-shield-primary` | `#4488ff` | SHIELD 주색 |
| `--item-reverse-primary` | `#22ffaa` | REVERSE 주색 |

### 2-2. 신규 토큰 — HUD 상태 패널

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--hud-panel-bg` | `rgba(0,0,0,0.45)` | 우상단 상태 패널 배경 (기존 `#multiplier-stats` 동일) |
| `--hud-panel-border` | `rgba(76,255,128,0.22)` | 패널 테두리 (플레이어 그린 저채도) |
| `--hud-panel-text` | `#e0e0e0` | 값 텍스트 (기존 HUD 동일) |
| `--hud-panel-label` | `rgba(255,255,255,0.50)` | 라벨 텍스트 (뮤트) |
| `--speed-slow-color` | `#00ddcc` | 속도 SLOW 표시 (`--item-slow-primary` 재사용) |
| `--speed-normal-color` | `#aaaaaa` | 속도 NORMAL 표시 (중립 회색) |
| `--speed-fast-color` | `#ffaa00` | 속도 FAST 표시 (`--item-speed-primary` 재사용) |

### 2-3. 신규 토큰 — 일시정지 모달

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--btn-resume-color` | `#4cff80` | [계속하기] 텍스트·테두리 (`--player-body`) |
| `--btn-resume-bg` | `rgba(76,255,128,0.10)` | [계속하기] 배경 |
| `--btn-resume-hover-bg` | `rgba(76,255,128,0.20)` | [계속하기] hover 배경 |
| `--btn-restart-color` | `#00cfff` | [재시작] 텍스트·테두리 (2× 배수 시안 활용) |
| `--btn-restart-bg` | `rgba(0,207,255,0.08)` | [재시작] 배경 |
| `--btn-restart-hover-bg` | `rgba(0,207,255,0.18)` | [재시작] hover 배경 |
| `--btn-quit-color` | `#ff6b4c` | [종료] 텍스트·테두리 (`--cpu-body`) |
| `--btn-quit-bg` | `rgba(255,107,76,0.08)` | [종료] 배경 |
| `--btn-quit-hover-bg` | `rgba(255,107,76,0.18)` | [종료] hover 배경 |
| `--btn-kbd-bg` | `rgba(255,255,255,0.12)` | `<kbd>` 배지 배경 |
| `--btn-kbd-border` | `rgba(255,255,255,0.25)` | `<kbd>` 배지 테두리 |

### 2-4. 신규 토큰 — 게임 오버 통계

| CSS 변수명 | HEX / rgba | 용도 |
|-----------|-----------|------|
| `--go-new-record-color` | `#ffcc00` | 신기록 배지·강조 점수 (1× 배수 골드 재활용) |
| `--go-new-record-glow` | `rgba(255,204,0,0.80)` | 신기록 펄스 glow |
| `--go-muted-text` | `rgba(255,255,255,0.40)` | 이전 기록·부가 텍스트 |
| `--go-section-divider` | `rgba(255,255,255,0.10)` | 섹션 구분선 |
| `--go-item-zero-opacity` | `0.35` | 아이템 ×0 행 불투명도 (획득 없음 강조 감소) |
| `--go-play-time-color` | `#e0e0e0` | 플레이 시간 텍스트 |

---

## 3. 타이포그래피

모든 텍스트는 **`'Courier New', Courier, monospace`** — 기존 게임 폰트 통일.

### 3-1. HUD 상태 패널

| 요소 | font-size | font-weight | letter-spacing | color 토큰 |
|------|-----------|-------------|----------------|-----------|
| 라벨 ("길이", "속도") | `11px` | `400` | `1px` | `--hud-panel-label` |
| 값 (숫자·도트) | `14px` | `700` | `0` | `--hud-panel-text` |
| 속도 상태 도트 (`●○`) | `14px` | `400` | `2px` | 속도 레벨별 color 토큰 |

### 3-2. 일시정지 모달

| 요소 | font-size | font-weight | letter-spacing |
|------|-----------|-------------|----------------|
| 타이틀 "일시정지" | `2.2rem` | `700` | `3px` |
| 버튼 레이블 | `14px` | `700` | `1.5px` |
| `<kbd>` 배지 | `11px` | `600` | `0.5px` |

### 3-3. 게임 오버 통계

| 요소 | font-size | font-weight | letter-spacing |
|------|-----------|-------------|----------------|
| 결과 헤더 (YOU WIN / GAME OVER) | `2.4rem` | `700` | `2px` |
| 최종 점수 | `1.8rem` | `700` | `0` |
| 신기록 배지 `★ 신기록!` | `1rem` | `700` | `1px` |
| 최고 기록 행 | `1.1rem` | `400` | `0` |
| 플레이 시간 | `1rem` | `400` | `0` |
| 섹션 제목 ("아이템 획득 현황") | `11px` | `400` | `2px` |
| 아이템 행 라벨 | `13px` | `400` | `0.5px` |
| 아이템 행 카운트 (`×N`) | `13px` | `700` | `0` |
| 하단 힌트 | `0.9rem` | `400` | `1px` |

---

## 4. 레이아웃·Spacing

### 4-1. 우상단 HUD 상태 패널

```
position: fixed
right: 20px       ← 기존 #hud 와 동일 수평 기준선
top: 60px         ← #hud 최대 높이(44px) + 기준(16px) = 60px

※ 대안: JS 에서 #hud 의 getBoundingClientRect().bottom + 6px 로 동적 계산
  두 방법 모두 허용 — dev 선택
```

| 속성 | 값 |
|------|-----|
| `padding` | `6px 10px` |
| `border-radius` | `6px` |
| `gap` (길이·속도 행 사이) | `4px` |
| `min-width` | `110px` |
| `text-align` | `right` |
| `border` | `1px solid var(--hud-panel-border)` |
| `background` | `var(--hud-panel-bg)` |

### 4-2. 일시정지 모달 버튼

| 속성 | 값 |
|------|-----|
| 버튼 `width` | `200px` |
| 버튼 `padding` | `12px 20px` |
| 버튼 `border-radius` | `8px` |
| 버튼 간 `gap` | `10px` |
| 모달 박스 `padding` | `40px 56px` |
| 타이틀 하단 `margin-bottom` | `24px` |
| 버튼 컨테이너 `display` | `flex; flex-direction: column; align-items: center` |

### 4-3. 게임 오버 통계

| 속성 | 값 |
|------|-----|
| 박스 `padding` | `36px 52px` (기존 `.gameover-box` 유지) |
| `min-width` | `340px` |
| 결과 헤더 `margin-bottom` | `8px` |
| 점수 블록 `margin-bottom` | `16px` |
| 섹션 구분선 `margin` | `14px 0` |
| 아이템 행 `padding` | `4px 0` |
| 아이템 리스트 `gap` | `2px` |
| 하단 힌트 `margin-top` | `16px` |
| `text-align` | `center` |

---

## 5. 컴포넌트 명세

### 5-1. 우상단 HUD 상태 패널 (`#hud-status-panel`)

#### 상태별 시각

| 상태 | 표시 텍스트 | color 토큰 | 비고 |
|------|-----------|-----------|------|
| 길이 기본 | `길이 N` | `--hud-panel-text` | N은 정수, 최솟값 3 |
| 속도 SLOW | `속도 ●○○` | `--speed-slow-color` (`#00ddcc`) | 청록 |
| 속도 NORMAL | `속도 ○●○` | `--speed-normal-color` (`#aaaaaa`) | 회색 |
| 속도 FAST | `속도 ○○●` | `--speed-fast-color` (`#ffaa00`) | 주황 |

#### 속도 도트 아이콘 규칙

| 레벨 | 도트 표시 | 의미 |
|------|----------|------|
| SLOW | `●○○` | 첫 번째 활성 (느림) |
| NORMAL | `○●○` | 두 번째 활성 (보통) |
| FAST | `○○●` | 세 번째 활성 (빠름) |

- 활성 도트: `●` (U+25CF), 비활성 도트: `○` (U+25CB)
- 활성 도트 색상 = 레벨별 color 토큰
- 비활성 도트 색상 = `rgba(255,255,255,0.20)`

#### 속도 변경 전환

속도 레벨 변경 시 `#hud-speed-level` 에 `speed-change-flash` 클래스를 0.30s 적용.  
→ §6-4 `@keyframes hud-speed-flash` 참조.

#### props / 인터랙션

| prop | 타입 | 설명 |
|------|------|------|
| `data-speed` | `"SLOW" \| "NORMAL" \| "FAST"` | CSS 선택자 기반 색상 전환 |
| `aria-live` | `"polite"` | 스크린 리더 갱신 |
| `pointer-events` | `none` | 게임 조작 방해 금지 |
| `role` | `"status"` | WAI-ARIA 상태 영역 |

---

### 5-2. 일시정지 모달 버튼 (`#paused-overlay`)

#### 버튼 3종 시각 명세

| 버튼 id | 텍스트 색 | 기본 배경 | 테두리 | hover 배경 | focus outline |
|---------|----------|----------|--------|-----------|--------------|
| `#paused-btn-resume` | `#4cff80` | `--btn-resume-bg` | `rgba(76,255,128,0.30)` | `--btn-resume-hover-bg` | `2px solid #4cff80` |
| `#paused-btn-restart` | `#00cfff` | `--btn-restart-bg` | `rgba(0,207,255,0.30)` | `--btn-restart-hover-bg` | `2px solid #00cfff` |
| `#paused-btn-quit` | `#ff6b4c` | `--btn-quit-bg` | `rgba(255,107,76,0.30)` | `--btn-quit-hover-bg` | `2px solid #ff6b4c` |

#### `<kbd>` 배지 시각

```css
.paused-btn kbd {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  background: var(--btn-kbd-bg);        /* rgba(255,255,255,0.12) */
  border: 1px solid var(--btn-kbd-border); /* rgba(255,255,255,0.25) */
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-left: 8px;
  vertical-align: middle;
}
```

#### 상태 정의

| 상태 | 시각 |
|------|------|
| rest | 색상 토큰 기본값, 테두리 투명도 30% |
| hover | 배경 hover 토큰, `cursor: pointer` |
| focus | `outline: 2px solid <버튼색>; outline-offset: 2px` |
| active | `transform: scale(0.97); transition: 0.10s ease` |

#### 모달 등장 애니메이션

박스 등장: `@keyframes modal-enter` (§6-1) — `0.20s ease-out`  
오버레이 배경: `background: rgba(0,0,0,0.65)` (기존 유지)

---

### 5-3. 게임 오버 통계 화면 (`#gameover-overlay`)

#### 결과 헤더 색상

| `state.result` | 헤더 색상 |
|---------------|----------|
| `"player_win"` | `#00cc44` (`--player-head`) |
| `"cpu_win"` | `#cc2200` (`--cpu-head`) |
| `"draw"` | `#aaaaaa` |
| `null` (솔로) | `#cc2200` (`--cpu-head`) |

#### 신기록 시 시각

| 요소 | 시각 변화 |
|------|----------|
| `#go-score` | `color: #ffcc00; font-weight: 700` |
| `#go-new-record` | `hidden` 해제 + `@keyframes new-record-pulse` 무한 반복 |
| `#go-prev-high-score` | `hidden` 해제 + `color: var(--go-muted-text)` |

#### 신기록 아닐 때

| 요소 | 시각 상태 |
|------|----------|
| `#go-score` | 기본 색 `#e0e0e0` |
| `#go-new-record` | `hidden` 유지 |
| `#go-prev-high-score` | `hidden` 유지 |

#### 아이템 통계 행 색상

| 아이템 | 아이콘 | `go-item-count` 색상 | ×0 시 행 투명도 |
|--------|--------|---------------------|--------------|
| SPEED_UP | `⚡` | `#ffaa00` | `0.35` |
| SLOW_DOWN | `⏱` | `#00ddcc` | `0.35` |
| LENGTH_BURST | `★` | `#ff6600` | `0.35` |
| SHIELD | `🛡` | `#4488ff` | `0.35` |
| REVERSE | `↺` | `#22ffaa` | `0.35` |

- `×0` 행 전체에 `opacity: 0.35` 적용 (섹션 자체는 숨기지 않음 — BF-556 §10 E-6 준수)

#### 플레이 시간 포맷

| 범위 | 표시 형식 | 색상 |
|------|----------|------|
| < 60초 | `N초` | `--go-play-time-color` (`#e0e0e0`) |
| 1분 ~ 59분 59초 | `N분 M초` | 동일 |
| ≥ 60분 | `N시간 M분` | 동일 |

#### 통계 화면 등장

박스 등장: `@keyframes gameover-enter` (§6-2) — `0.25s ease-out`

---

## 6. 전환 애니메이션

### 6-1. 일시정지 모달 등장 (`@keyframes modal-enter`)

```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.paused-box {
  animation: modal-enter 0.20s ease-out forwards;
  transform-origin: center center;
}
```

| 속성 | 값 |
|------|-----|
| duration | `0.20s` |
| easing | `ease-out` |
| scale 시작 | `0.92` |
| opacity 시작 | `0` |

### 6-2. 게임 오버 통계 등장 (`@keyframes gameover-enter`)

```css
@keyframes gameover-enter {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gameover-box {
  animation: gameover-enter 0.25s ease-out forwards;
}
```

| 속성 | 값 |
|------|-----|
| duration | `0.25s` |
| easing | `ease-out` |
| translateY 시작 | `-10px` |
| opacity 시작 | `0` |

### 6-3. 신기록 배지 펄스 (`@keyframes new-record-pulse`)

```css
@keyframes new-record-pulse {
  0%, 100% {
    text-shadow: 0 0 6px rgba(255, 204, 0, 0.70);
    color: #ffcc00;
  }
  50% {
    text-shadow: 0 0 18px rgba(255, 204, 0, 1),
                 0 0 36px rgba(255, 204, 0, 0.40);
    color: #ffe566;
  }
}

#go-new-record {
  animation: new-record-pulse 1.4s ease-in-out infinite;
}
```

| 속성 | 값 |
|------|-----|
| duration | `1.4s` |
| easing | `ease-in-out` |
| iteration | `infinite` |
| 효과 | text-shadow glow 확장·축소 반복 |

### 6-4. 속도 변경 플래시 (`@keyframes hud-speed-flash`)

```css
@keyframes hud-speed-flash {
  0%   { opacity: 0.4; }
  40%  { opacity: 1.0; }
  100% { opacity: 1.0; }
}

#hud-speed-level.speed-change-flash {
  animation: hud-speed-flash 0.30s ease-out forwards;
}
```

| 속성 | 값 |
|------|-----|
| duration | `0.30s` |
| trigger | 속도 레벨 변경 시 JS 클래스 토글 |
| 효과 | 투명도 깜박임 — 변경 인지 |

### 6-5. 버튼 호버 전환

```css
.paused-btn {
  transition: background 0.15s ease,
              border-color 0.15s ease,
              transform 0.10s ease;
}

.paused-btn:active {
  transform: scale(0.97);
}
```

---

## 7. dev 구현 가이드

### 7-1. CSS 변수 추가 — `snake/styles.css` `:root` 블록에 append

```css
/* ─── HUD 상태 패널 — BF-558 ─────────────────────────────── */
--hud-panel-bg:           rgba(0, 0, 0, 0.45);
--hud-panel-border:       rgba(76, 255, 128, 0.22);
--hud-panel-text:         #e0e0e0;
--hud-panel-label:        rgba(255, 255, 255, 0.50);
--speed-slow-color:       #00ddcc;
--speed-normal-color:     #aaaaaa;
--speed-fast-color:       #ffaa00;

/* ─── 일시정지 모달 버튼 — BF-558 ───────────────────────── */
--btn-resume-color:       #4cff80;
--btn-resume-bg:          rgba(76, 255, 128, 0.10);
--btn-resume-hover-bg:    rgba(76, 255, 128, 0.20);
--btn-restart-color:      #00cfff;
--btn-restart-bg:         rgba(0, 207, 255, 0.08);
--btn-restart-hover-bg:   rgba(0, 207, 255, 0.18);
--btn-quit-color:         #ff6b4c;
--btn-quit-bg:            rgba(255, 107, 76, 0.08);
--btn-quit-hover-bg:      rgba(255, 107, 76, 0.18);
--btn-kbd-bg:             rgba(255, 255, 255, 0.12);
--btn-kbd-border:         rgba(255, 255, 255, 0.25);

/* ─── 게임 오버 통계 — BF-558 ────────────────────────────── */
--go-new-record-color:    #ffcc00;
--go-new-record-glow:     rgba(255, 204, 0, 0.80);
--go-muted-text:          rgba(255, 255, 255, 0.40);
--go-section-divider:     rgba(255, 255, 255, 0.10);
--go-item-zero-opacity:   0.35;
--go-play-time-color:     #e0e0e0;
```

> **주의**: 기존 `--fx-*` / `--item-*` / `--hud-slot-*` 변수는 삭제·수정 금지.

### 7-2. 신규 DOM id / 클래스 목록

| 선택자 | 역할 |
|--------|------|
| `#hud-status-panel` | 우상단 HUD 상태 패널 컨테이너 |
| `#hud-snake-length` | 뱀 길이 텍스트 |
| `#hud-speed-level` | 속도 레벨 텍스트 + 도트 |
| `#hud-speed-level[data-speed="SLOW"]` | 청록 색상 적용 |
| `#hud-speed-level[data-speed="NORMAL"]` | 회색 색상 적용 |
| `#hud-speed-level[data-speed="FAST"]` | 주황 색상 적용 |
| `#hud-speed-level.speed-change-flash` | 속도 변경 플래시 클래스 |
| `.paused-btn` | 공통 버튼 스타일 |
| `#paused-btn-resume` | 계속하기 버튼 |
| `#paused-btn-restart` | 재시작 버튼 |
| `#paused-btn-quit` | 종료 버튼 |
| `.paused-btn kbd` | 단축키 배지 |
| `#go-new-record` | 신기록 배지 (`hidden` 기본) |
| `#go-prev-high-score` | 이전 최고 점수 (`hidden` 기본) |
| `#go-play-time` | 플레이 시간 |
| `#go-item-stats` | 아이템 획득 현황 섹션 |
| `.go-item-list li[data-item-count="0"]` | ×0 행 투명도 처리 |

### 7-3. 속도 레벨 CSS 패턴

```css
/* 기본 NORMAL */
#hud-speed-level { color: var(--speed-normal-color); }

/* data 속성 기반 전환 */
#hud-speed-level[data-speed="SLOW"] { color: var(--speed-slow-color); }
#hud-speed-level[data-speed="FAST"] { color: var(--speed-fast-color); }
```

### 7-4. 아이템 ×0 행 처리 패턴

```css
/* JS 에서 count=0 시 data-item-count="0" 부여 */
.go-item-list li[data-item-count="0"] {
  opacity: var(--go-item-zero-opacity, 0.35);
}
```

### 7-5. 속도 플래시 클래스 토글 (JS 패턴)

```js
// game.js renderHUD() 내 속도 변경 감지 시
const el = document.getElementById('hud-speed-level');
el.setAttribute('data-speed', newLevel); // 'SLOW'|'NORMAL'|'FAST'
el.classList.remove('speed-change-flash');
void el.offsetWidth;                     // reflow — 애니메이션 재시작 트리거
el.classList.add('speed-change-flash');
```

### 7-6. 기존 코드 충돌 방지 체크리스트

| 체크 항목 | 확인 사항 |
|----------|----------|
| `#hud` 기존 스타일 | `right: 20px; top: 16px` 변경 금지 — `#hud-status-panel` 은 `top: 60px` 으로 분리 |
| `.gameover-box` padding | 기존 `36px 52px` 유지, `min-width: 340px` 만 추가 |
| `.paused-box` padding | 기존 `36px 52px` → `40px 56px` 확장 (버튼 3종 수용을 위해) |
| `:root` 변수 | 기존 `--fx-*` / `--item-*` 변수 삭제·중복 없이 append |
| `#go-result`, `#go-score`, `#go-hint` | DOM id 변경 금지 (회귀 가드 — BF-556 부록 A) |
| `#paused-overlay`, `#gameover-overlay` | 컨테이너 id 변경 금지 |

---

## 8. mockup 참조

시각 시뮬레이션 파일: **`docs/design/mockups/snake-hud-BF-558.html`**

- 3개 상태(HUD 플레이 중 / 일시정지 모달 / 게임 오버 통계)를 단일 HTML 내 `<section>` 으로 구분
- `file://` 단독 렌더링 가능 (외부 의존 없음)
- 본 명세의 색상 토큰·타이포·spacing 을 그대로 `:root` CSS 변수로 정의

---

## 9. Self-critique · AC 매핑 표

### 9-1. Self-critique

| 체크 항목 | 결과 | 비고 |
|----------|------|------|
| **AC 매핑** | ✅ | AC-1: 색상 토큰(§2)·타이포(§3)·spacing(§4)·애니메이션(§6) 모두 정의. AC-2: 신기록 시각 강조(§5-3). AC-3: 기존 토큰 충돌 체크(§7-6) |
| **dev 구현 가이드** | ✅ | CSS 변수 스니펫(§7-1), DOM 표(§7-2), JS 패턴(§7-5), 충돌 방지 체크리스트(§7-6) 제공 |
| **기존 요소 보존** | ✅ | `#hud`, `.gameover-box`, `.paused-box`, 기존 CSS 변수 변경 금지 명시 |
| **컴포넌트 매핑** | ✅ | HUD 패널(§5-1 — props/상태/인터랙션), 모달 버튼(§5-2 — 3종 시각·상태), 통계 화면(§5-3 — 결과 헤더·신기록·아이템 행) |
| **모호함 flag** | 없음 | `#hud-status-panel` top 위치: `60px` 고정 vs JS 동적 계산 두 방법 모두 §4-1 에 기재 |

### 9-2. AC 매핑 표

| AC 번호 | Given | When | Then | 본 명세 근거 |
|---------|-------|------|------|------------|
| **AC-1** | planner 명세 | 시각 디자인 작성 | 색상 토큰·타이포·spacing·전환 애니메이션 정의됨 | §2 (컬러 팔레트), §3 (타이포), §4 (spacing), §6 (애니메이션) |
| **AC-2** | 시안 작성 | mockup 렌더링 | HUD/모달/통계 3개 상태 시각화됨 (`file://` 단독) | §8 → `docs/design/mockups/snake-hud-BF-558.html` |
| **AC-3** | 기존 snake module | 디자인 토큰 적용 | 기존 색상·폰트와 충돌 없음 | §2-1 (기존 토큰 변경 금지), §7-6 (충돌 방지 체크리스트) |
