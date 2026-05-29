# 숫자 야구(Bulls and Cows) 게임 UI/UX 디자인 명세 — BF-651

> 작성자: [이디자인] · 작성일 2026-05-29  
> 관련 티켓: BF-652 (designer task), BF-651 (부모 스토리)  
> 신규 모듈: `baseball/`  
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의  
> mockup: [`docs/design/mockups/baseball-BF-652.html`](mockups/baseball-BF-652.html)

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태 전이 다이어그램](#6-상태-전이-다이어그램)
7. [인터랙션 규칙](#7-인터랙션-규칙)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [Acceptance Criteria 매핑 표](#9-acceptance-criteria-매핑-표)
10. [Self-critique](#10-self-critique)
11. [mockup 참조](#11-mockup-참조)

---

## 1. 시안 개요

### 1.1 변경 범위

- 신규 SPA 모듈 `baseball/index.html` (단일 페이지 게임)
- 숫자 야구(Bulls and Cows) — 4자리 비밀번호를 추리하는 수 추리 게임
- 4자리 숫자 입력 영역 (각 자리 개별 input × 4 또는 단일 number input)
- 시도 기록 테이블 (시도 횟수 · 입력 숫자 · 스트라이크 수 · 볼 수)
- 스트라이크/볼 인디케이터 (⚾ 아이콘 시각화)
- 결과 패널 (정답 / 최대 시도 초과)
- 재시작 버튼
- 반응형 레이아웃 (desktop / mobile 2단계)

### 1.2 사용자 경험 목표

| 목표 | 세부 내용 |
|---|---|
| **야구 테마 몰입감** | ⚾ 아이콘·amber/gold 컬러 팔레트·다크 배경으로 경기장 야경 분위기 |
| **입력 편의성** | 4개 자리 입력칸이 명확히 구분 — 자동 포커스 이동(다음 칸), 백스페이스 이전 칸 이동 |
| **즉각적인 판정 피드백** | 제출 즉시 S/B 수치 + ⚾ 도트 시각화 — 숫자 변화 없이 직관적 파악 |
| **시도 기록 추적** | 최신 시도가 위로 정렬된 compact 테이블 — 이전 시도와의 패턴 비교 용이 |
| **명확한 게임 종료** | 정답(전광판 스타일 WIN 연출) / 실패(게임 오버 배너) 확실히 구분 |
| **접근성** | Tab/Enter 키보드 조작 완결 + 결과 `aria-live` 스크린리더 지원 |

### 1.3 게임 규칙 (디자인 참조용)

- 컴퓨터가 **중복 없는 4자리 숫자** (0 허용, 단 첫 자리 제외)를 무작위 생성
- 플레이어가 4자리 숫자를 추리하여 입력
- **스트라이크(S)**: 숫자·위치 모두 일치
- **볼(B)**: 숫자는 있으나 위치 불일치
- **아웃(O)**: 해당 자리에 맞는 숫자가 없음 (UI에서는 회색 도트)
- **4 Strike** = 정답 (WIN)
- 기본 최대 시도: **9회** (야구 이닝 수 컨셉)

### 1.4 비목표 (Out of Scope)

- 자리수 설정 변경 (v1은 4자리 고정)
- 멀티플레이어·온라인 대전
- 효과음 (별도 Epic)
- localStorage 점수 영속화 (v1은 in-memory 단발)

---

## 2. 컬러 팔레트

### 2.1 베이스 토큰 (다크 우선)

`baseball/styles.css` `:root` 에서 자체 정의.

| 토큰명 | Dark HEX | Light HEX | 용도 |
|---|---|---|---|
| `--color-bg-canvas` | `#0A0C10` | `#F5F5F0` | 페이지 배경 (야경 느낌 짙은 다크) |
| `--color-bg-surface` | `#141820` | `#FFFFFF` | 카드·패널 표면 |
| `--color-bg-subtle` | `#1C2230` | `#EEEEE8` | 호버·보조 영역 |
| `--color-border-default` | `#252D3A` | `#D8D8D0` | 구분선·테두리 |
| `--color-border-strong` | `#38465A` | `#B0B0A8` | 강조 테두리·입력칸 |
| `--color-text-primary` | `#EAE8E0` | `#1A1A16` | 주요 텍스트·숫자 |
| `--color-text-secondary` | `#9098A4` | `#606068` | 서브 레이블·헤더 |
| `--color-text-muted` | `#565E6A` | `#9A9A93` | placeholder·empty state |
| `--color-focus-ring` | `rgba(245,166,35,0.55)` | `rgba(200,120,10,0.50)` | 키보드 focus outline |

### 2.2 게임 전용 토큰 (신규)

#### 2.2.1 스트라이크 / 볼 / 아웃 상태 컬러

| 토큰명 | HEX | 용도 |
|---|---|---|
| `--bs-strike` | `#F5A623` | **스트라이크** — amber/gold (야구공 색) |
| `--bs-strike-bg` | `#241800` | 스트라이크 도트 배경 |
| `--bs-strike-glow` | `rgba(245,166,35,0.45)` | 스트라이크 도트 글로우 |
| `--bs-ball` | `#3DBE6C` | **볼** — 잔디 그린 |
| `--bs-ball-bg` | `#041408` | 볼 도트 배경 |
| `--bs-ball-glow` | `rgba(61,190,108,0.35)` | 볼 도트 글로우 |
| `--bs-out` | `#4A5568` | **아웃** — 중성 회색 (활성화되지 않은 도트) |
| `--bs-out-bg` | `#141820` | 아웃 도트 배경 (surface 와 동일) |

#### 2.2.2 결과 상태 컬러

| 토큰명 | HEX | 용도 |
|---|---|---|
| `--bs-win` | `#F5A623` | WIN 배너 텍스트·테두리 (amber) |
| `--bs-win-bg` | `#201200` | WIN 배너 배경 |
| `--bs-win-glow` | `rgba(245,166,35,0.40)` | WIN 카드 글로우 |
| `--bs-lose` | `#E85858` | LOSE 배너 텍스트·테두리 |
| `--bs-lose-bg` | `#1F0808` | LOSE 배너 배경 |
| `--bs-lose-glow` | `rgba(232,88,88,0.35)` | LOSE 글로우 |

#### 2.2.3 입력칸 상태 컬러

| 상태 | 배경 | 테두리 | 텍스트 |
|---|---|---|---|
| **idle (빈 칸)** | `--color-bg-subtle` | `--color-border-strong` | `--color-text-muted` |
| **focused** | `#1A2235` | `--bs-strike` (amber) | `--color-text-primary` |
| **filled (숫자 입력됨)** | `--color-bg-surface` | `--bs-strike` | `--color-text-primary` (amber도 ok — 선택) |
| **error (중복 숫자 등)** | `rgba(232,88,88,0.10)` | `--bs-lose` | `--bs-lose` |

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
| `--space-8` | `64px` |

### 2.4 반경·그림자

| 토큰명 | 값 |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-input` | `10px` (입력칸 — 다소 둥글게) |
| `--radius-dot` | `50%` (S/B 도트 원형) |
| `--shadow-card` | `0 4px 20px rgba(0, 0, 0, 0.40)` (dark) / `0 4px 16px rgba(0, 0, 0, 0.08)` (light) |
| `--shadow-input-focus` | `0 0 0 3px var(--color-focus-ring)` |
| `--shadow-strike-dot` | `0 0 8px var(--bs-strike-glow)` |
| `--shadow-ball-dot` | `0 0 6px var(--bs-ball-glow)` |

### 2.5 모션 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `--motion-fast` | `120ms` | 입력칸 hover/focus 전환 |
| `--motion-mid` | `220ms` | 도트 등장, 배너 fade |
| `--motion-result` | `350ms` | 결과 패널 슬라이드-인 |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | 모든 전환에 적용 |

---

## 3. 타이포그래피

```
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| role | font | size | weight | line-height | 비고 |
|---|---|---|---|---|---|
| 게임 타이틀 | `--font-sans` | `20px` | `700` | `1.2` | "숫자 야구", letter-spacing 1px |
| 서브타이틀 | `--font-sans` | `13px` | `400` | `1.5` | "4자리 숫자를 맞혀보세요" |
| **입력 숫자** | `--font-mono` | `2rem` (32px) | `700` | `1` | 각 자리 입력칸, tabular-nums |
| **입력 숫자 (mobile)** | `--font-mono` | `1.75rem` (28px) | `700` | `1` | < 480px 뷰포트 |
| 제출 버튼 | `--font-sans` | `15px` | `700` | `1` | letter-spacing 1px |
| 시도 기록 — 숫자 | `--font-mono` | `15px` | `600` | `1.4` | tabular-nums, 고정폭 |
| 시도 기록 — S/B 값 | `--font-mono` | `14px` | `700` | `1` | "3S 1B" 형식 |
| 시도 횟수 배지 | `--font-mono` | `12px` | `500` | `1` | "#1" ~ "#9" |
| 결과 배너 | `--font-sans` | `26px` | `800` | `1.2` | "🎉 정답!" / "💀 실패", letter-spacing 2px |
| 결과 부제 | `--font-sans` | `13px` | `400` | `1.6` | "X번째 시도만에 맞혔습니다" |
| hint / caption | `--font-sans` | `12px` | `400` | `1.4` | 색상 `--color-text-muted` |

---

## 4. 레이아웃

### 4.1 전체 구조 개요

```
┌──────────────────────────────────────────────────┐
│  ⚾ 숫자 야구                        [🌙 테마]  │  header 56px
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──── 게임 정보 바 ─────────────────────────┐   │
│  │  남은 기회: ████████░  9/9        시도: 0  │   │  info bar
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──── 입력 영역 ────────────────────────────┐   │
│  │                                          │   │
│  │   ┌───┐  ┌───┐  ┌───┐  ┌───┐           │   │  input area
│  │   │ _ │  │ _ │  │ _ │  │ _ │           │   │
│  │   └───┘  └───┘  └───┘  └───┘           │   │
│  │                                          │   │
│  │            [ ⚾ 던지기! ]                 │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──── 시도 기록 ────────────────────────────┐   │
│  │  #  │  추리  │  결과  │  ●●●●            │   │  history
│  │ ─── │ ────── │ ────── │ ────────────      │   │
│  │ #3  │  4 7 2 1  │ 2S 1B  │ ●●○◉         │   │
│  │ #2  │  3 5 8 0  │ 1S 2B  │ ●◉◉○         │   │
│  │ #1  │  1 2 3 4  │ 0S 1B  │ ○◉○○         │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  (결과 패널 — 게임 종료 시만 표시)                 │
│  ┌──────────────────────────────────────────┐   │
│  │   🎉 정답!                               │   │  result
│  │   4번째 시도만에 맞혔습니다                │   │  panel
│  │            [ 🔄 새 게임 ]               │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

> **Desktop (≥ 560px)**: 최대 폭 `520px`, 가운데 정렬, 세로 스택  
> **Mobile (< 560px)**: 폭 100%, `margin: 0 var(--space-4)`, 입력칸 축소

### 4.2 Header

- 높이: `56px`, `padding: 0 var(--space-5)`
- 좌측: ⚾ + "숫자 야구" (타이틀)
- 우측: 테마 토글 버튼 (`🌙` / `☀`)
- 배경: `var(--color-bg-surface)`, 하단 `1px solid var(--color-border-default)`

### 4.3 게임 정보 바 (InfoBar)

```
┌───────────────────────────────────────────────────┐
│  남은 기회  ████████░  [9 채워진 칸 / 회색 칸]  시도: 0  │
└───────────────────────────────────────────────────┘
```

- 높이: `48px`, `padding: 0 var(--space-5)`, 배경 `--color-bg-surface`
- 하단 `1px solid var(--color-border-default)`
- 좌측: "남은 기회" 레이블 + **이닝 표시 바** (9칸 — 남은 기회 시각화)
  - 이닝 칸: `12px × 12px`, `border-radius: 3px`
  - 남은 기회: `--bs-strike` (amber) 채움
  - 소진된 기회: `--bs-out` (회색) 채움
  - 간격: `gap: 4px`
- 우측: "시도: N" (`--font-mono`, 14px, `--color-text-secondary`)

### 4.4 입력 영역 (InputArea)

```
   ┌──────────────────────────────────────────────┐
   │                                              │
   │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
   │   │      │  │      │  │      │  │      │   │  각 칸: 64×72px (desktop)
   │   │  _   │  │  _   │  │  _   │  │  _   │   │        54×64px (mobile)
   │   │      │  │      │  │      │  │      │   │  숫자: 2rem mono
   │   └──────┘  └──────┘  └──────┘  └──────┘   │
   │                                              │
   │              ╭──────────────────╮            │
   │              │   ⚾  던지기!     │            │  높이 52px
   │              ╰──────────────────╯            │
   │                                              │
   └──────────────────────────────────────────────┘
```

- 컨테이너: 카드 스타일 (bg-surface, radius-lg, shadow-card), `padding: var(--space-6)`
- 4개 입력칸 배치: `display: flex; gap: var(--space-3); justify-content: center`
- 각 입력칸 (`.digit-input`):
  - Desktop: `width: 64px; height: 72px`
  - Mobile (< 480px): `width: 54px; height: 64px`
  - `border-radius: var(--radius-input)` (10px)
  - `border: 2px solid var(--color-border-strong)`
  - `text-align: center; font: var(--font-mono); font-size: 2rem; font-weight: 700`
  - `background: var(--color-bg-subtle)`
  - transition: border-color, background, box-shadow `var(--motion-fast)`
- 제출 버튼 (`.submit-btn`): `margin-top: var(--space-5)`, 중앙 배치
  - 높이 `52px`, `min-width: 180px`, `border-radius: var(--radius-md)`
  - 배경: `--bs-strike` (amber), 텍스트: `#0A0C10` (어두운 — 대비 확보)
  - hover: `transform: translateY(-1px)`, `filter: brightness(1.1)`
  - active: `transform: scale(0.97)`
  - disabled: `opacity: 0.45; cursor: not-allowed`

### 4.5 시도 기록 (HistoryTable)

```
   ┌──────────────────────────────────────────────────────────┐
   │ 시도 기록                                      (최신순 ↑) │
   │ ──────────────────────────────────────────────────────── │
   │  #3    4721    2S 1B    ●● ● ○                           │  S:gold, B:green, O:gray
   │  #2    3580    1S 2B    ●  ○ ● ●                          │
   │  #1    1234    0S 1B    ○  ○ ○ ●                          │
   └──────────────────────────────────────────────────────────┘
```

- 컨테이너: 카드 (bg-surface, radius-lg, shadow-card), `padding: var(--space-5) var(--space-5)`
- 헤더 행 (`.history-header`): `display: flex; justify-content: space-between`, 레이블 텍스트
- 각 행 (`.history-row`): `display: grid; grid-template-columns: 36px 80px 60px 1fr; align-items: center; gap: var(--space-3)`
  - Desktop: 4-column grid
  - Mobile (< 480px): `grid-template-columns: 28px 1fr 52px 1fr` (축소)
  - 높이: `44px`, `border-radius: var(--radius-sm)`, hover: `background: var(--color-bg-subtle)`
  - **최신 행**: `border-left: 3px solid var(--bs-strike)` + `background: rgba(245,166,35,0.05)`
- **회차 배지** (`.history-row__index`): `#N` 형식, `--font-mono`, `--color-text-secondary`
- **추리 숫자** (`.history-row__guess`): `N N N N` 자간 spaced, `--font-mono 15px 600`, `--color-text-primary`
- **S/B 텍스트** (`.history-row__score`): `2S 1B`, `--font-mono 14px 700`
  - S 값: `color: var(--bs-strike)`
  - B 값: `color: var(--bs-ball)`
  - 0S 0B (아웃): `color: var(--color-text-muted)`
- **도트 인디케이터** (`.history-row__dots`): 4개 도트 원형 `8px × 8px`, `gap: 4px`
  - 스트라이크 도트: `background: var(--bs-strike); box-shadow: var(--shadow-strike-dot)`
  - 볼 도트: `background: var(--bs-ball); box-shadow: var(--shadow-ball-dot)`
  - 아웃 도트: `background: var(--bs-out)`
  - 순서: 스트라이크 → 볼 → 아웃 (S개 amber, B개 green, 나머지 gray)
- 빈 상태: "아직 시도 기록 없음" placeholder (`--color-text-muted`, 가운데 정렬, `padding: var(--space-7)`)

### 4.6 결과 패널 (ResultPanel)

```
   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │        🎉 정답!                                 │  WIN 상태
   │        4번째 시도만에 맞혔습니다                 │
   │        정답: 7 4 2 9                            │
   │                                                 │
   │             ╭──────────────────╮                │
   │             │   🔄 새 게임     │                │
   │             ╰──────────────────╯                │
   │                                                 │
   └─────────────────────────────────────────────────┘
```

- 게임 진행 중: `display: none` (공간 차지 X)
- 게임 종료 시: 슬라이드-인 + 페이드-인 (`var(--motion-result)`)
- WIN 상태: 배경 `--bs-win-bg`, 테두리 `2px solid var(--bs-win)`, `box-shadow: 0 0 24px var(--bs-win-glow)`
- LOSE 상태: 배경 `--bs-lose-bg`, 테두리 `2px solid var(--bs-lose)`, `box-shadow: 0 0 24px var(--bs-lose-glow)`
- 결과 이모지: `48px` (시스템 emoji)
- 결과 타이틀: `26px / 800 / letter-spacing 2px`
  - WIN: `color: var(--bs-win)`
  - LOSE: `color: var(--bs-lose)`
- 부제: 13px, `--color-text-secondary`
- 정답 숫자 표시: `--font-mono 18px 700`, `color: var(--bs-strike)` (항상 표시 — WIN시 확인, LOSE 시 공개)
- 새 게임 버튼 (`.new-game-btn`): 높이 `44px`, `min-width: 140px`, `border-radius: var(--radius-md)`
  - WIN: amber 배경
  - LOSE: 표면 배경 + amber 테두리 ghost

### 4.7 반응형 Breakpoint

| breakpoint | 입력칸 크기 | card padding | 기록 grid | 컨테이너 |
|---|---|---|---|---|
| **≥ 560px** | `64 × 72px` | `var(--space-6)` | `36/80/60/1fr` | max-width `520px`, 가운데 |
| **< 560px** | `56 × 68px` | `var(--space-5)` | `28/1fr/52/1fr` | 100%, `margin: 0 var(--space-4)` |
| **< 400px** | `48 × 60px` | `var(--space-4)` | `24/1fr/48/1fr` | 동일 (여백 최소화) |

---

## 5. 컴포넌트 명세

### 5.1 입력칸 (`DigitInput` × 4)

**구조**:
```html
<div class="digit-inputs" role="group" aria-label="4자리 숫자 입력">
  <input class="digit-input" type="text" inputmode="numeric"
         maxlength="1" pattern="[0-9]"
         aria-label="첫 번째 자리" autocomplete="off" />
  <!-- × 4 -->
</div>
```

| 상태 | 스타일 |
|---|---|
| `idle` | bg: `--color-bg-subtle`; border: `--color-border-strong` (2px) |
| `focus` | bg: `#1A2235`; border: `--bs-strike` (2px); box-shadow: `--shadow-input-focus` |
| `filled` | bg: `--color-bg-surface`; border: `--bs-strike` (1.5px); 숫자 색: `--color-text-primary` |
| `error` | bg: `rgba(232,88,88,0.10)`; border: `--bs-lose` (2px) |

**인터랙션**:
- 숫자 입력 → 자동으로 다음 칸 focus
- Backspace (빈 칸) → 이전 칸 focus + 해당 칸 값 삭제
- 4자리 모두 채워지면 제출 버튼 활성화
- `inputmode="numeric"` — 모바일 숫자 키패드 자동 노출
- paste: 4자리 숫자 문자열 감지 시 각 칸에 자동 분배

**유효성 검사**:
- 0~9 숫자만 허용
- 4자리 모두 다른 숫자 (중복 없음) — 중복 시 해당 칸 error 상태 + 힌트 "중복된 숫자가 있습니다"
- 첫 자리에 0 입력 — 허용 여부 (v1: 허용, 게임 로직에서 처리)

### 5.2 제출 버튼 (`SubmitButton`)

```html
<button class="submit-btn" type="button" aria-label="숫자 던지기 — 추리 제출">
  <span aria-hidden="true">⚾</span> 던지기!
</button>
```

| 상태 | 스타일 |
|---|---|
| `enabled` | bg: `--bs-strike`; color: `#0A0C10`; cursor: pointer |
| `hover` | `filter: brightness(1.12)`; `transform: translateY(-1px)` |
| `active` | `transform: scale(0.97)` |
| `disabled` (4칸 미완성 또는 게임 종료) | `opacity: 0.45`; `cursor: not-allowed` |
| `focus-visible` | `outline: 2px solid var(--color-focus-ring)`; `outline-offset: 3px` |

### 5.3 시도 기록 행 (`HistoryRow`)

**구조**:
```html
<li class="history-row" data-latest="true|false">
  <span class="history-row__index">#3</span>
  <span class="history-row__guess">4 7 2 1</span>
  <span class="history-row__score">
    <span class="score-s">2S</span>
    <span class="score-b">1B</span>
  </span>
  <div class="history-row__dots" aria-label="스트라이크 2, 볼 1, 아웃 1">
    <span class="dot dot--strike"></span>
    <span class="dot dot--strike"></span>
    <span class="dot dot--ball"></span>
    <span class="dot dot--out"></span>
  </div>
</li>
```

- 도트 등장: `--motion-mid` (220ms) stagger — 각 도트 `40ms` delay 간격으로 fade-in
- `data-latest="true"` 행: amber 좌측 보더 + 미세 배경

### 5.4 결과 패널 (`ResultPanel`)

```html
<section class="result-panel" 
         data-result="none|win|lose"
         role="dialog"
         aria-labelledby="result-title"
         aria-live="polite">
  <span class="result-panel__emoji" aria-hidden="true">🎉</span>
  <h2 class="result-panel__title" id="result-title">정답!</h2>
  <p class="result-panel__desc">4번째 시도만에 맞혔습니다</p>
  <p class="result-panel__answer">
    정답: <strong class="answer-digits">7 4 2 9</strong>
  </p>
  <button class="new-game-btn" type="button">🔄 새 게임</button>
</section>
```

| `data-result` | 이모지 | 타이틀 | 테두리 | 배경 |
|---|---|---|---|---|
| `none` | — | — | — | — (display: none) |
| `win` | 🎉 | "정답!" | `--bs-win` | `--bs-win-bg` |
| `lose` | 💀 | "실패!" | `--bs-lose` | `--bs-lose-bg` |

### 5.5 이닝 표시 바 (`InningBar`)

```html
<div class="inning-bar" aria-label="남은 기회 9 중 0 소진">
  <span class="inning-bar__label">남은 기회</span>
  <div class="inning-bar__dots" role="progressbar" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0">
    <span class="inning-dot inning-dot--active"></span>
    <!-- × 9 -->
  </div>
  <span class="inning-bar__count" id="try-count">시도: 0</span>
</div>
```

- 채워진 칸 (`--active`): `background: var(--bs-strike)` (amber)
- 소진된 칸: `background: var(--bs-out)` (회색)
- 마지막 1칸 남을 때: `background: var(--bs-lose)` (빨간색 — 긴장감)

### 5.6 테마 토글 (`ThemeToggle`)

- ghost button, topbar 우측
- 다크 기본: `🌙`, 라이트: `☀`
- 클릭 → `<html data-theme="dark|light">` 토글
- `localStorage["bf-theme"]` 키로 영속화 (다른 SPA 모듈과 공유)
- 첫 로드: head 인라인 `<script>` 로 즉시 적용 (FOUC 방지)

---

## 6. 상태 전이 다이어그램

```
              [페이지 로드]
                   │
                   ▼
        ┌─────────────────────┐
        │        IDLE          │  (입력칸 빈 상태, 버튼 disabled)
        └─────────────────────┘
                   │ [4자리 입력 완료]
                   ▼
        ┌─────────────────────┐
        │       READY          │  (버튼 활성화, 입력칸 filled)
        └─────────────────────┘
                   │ [던지기 클릭 or Enter]
                   ▼
        ┌─────────────────────┐
        │      JUDGING         │  (버튼 잠깐 비활성, 결과 계산)
        └─────────────────────┘
                   │ (즉시)
                   ▼
        ┌──────────────────────────────────┐
        │            RESULT                │
        │  [record 추가, S/B 표시, 입력 초기화]│
        └──────────────────────────────────┘
             │                  │
    [4S — 정답]          [시도 소진]
             │                  │
             ▼                  ▼
      ┌───────────┐       ┌───────────┐
      │    WIN    │       │   LOSE    │
      └───────────┘       └───────────┘
             │                  │
             └────────┬─────────┘
                      │ [새 게임 클릭]
                      ▼
              [IDLE — 초기화]
```

**게임 상태 (`data-game-state` — `<main>` 에 적용)**:

| 상태 | DOM 마커 | UI 동작 |
|---|---|---|
| `idle` | `[data-game-state="idle"]` | 입력칸 빈 상태, 버튼 disabled |
| `playing` | `[data-game-state="playing"]` | 시도 기록 있음, 계속 진행 중 |
| `win` | `[data-game-state="win"]` | WIN 패널 표시, 입력 disabled |
| `lose` | `[data-game-state="lose"]` | LOSE 패널 표시, 입력 disabled |

---

## 7. 인터랙션 규칙

### 7.1 게임 흐름

| 단계 | 트리거 | 동작 |
|---|---|---|
| 1. 숫자 입력 | 각 칸에 1자리 입력 | 자동 다음 칸 포커스 이동 |
| 2. 제출 | 버튼 클릭 / Enter | 유효성 검사 → 결과 계산 → history 추가 |
| 3. 판정 표시 | 즉시 | S/B 도트 stagger 등장 (220ms) |
| 4. 입력 초기화 | 판정 직후 | 4칸 내용 지우기 + 첫 번째 칸 focus |
| 5. 게임 종료 | 4S 또는 9회 소진 | 결과 패널 슬라이드-인 (350ms) |
| 6. 새 게임 | 새 게임 버튼 클릭 | 전체 state 초기화, 새 비밀번호 생성 |

### 7.2 키보드 인터랙션

| 키 | 동작 |
|---|---|
| `Tab` / `Shift+Tab` | 포커스 순환 (입력칸 1~4 → 제출 버튼 → 새 게임 버튼) |
| `0`~`9` | 포커스된 칸에 숫자 입력 |
| `Backspace` | 현재 칸 삭제 (빈 칸이면 이전 칸 focus + 삭제) |
| `Enter` | 4칸 완성 시 제출 |
| `ArrowLeft` / `ArrowRight` | 입력칸 간 포커스 이동 |
| `T` / `t` | 다크/라이트 테마 토글 |

### 7.3 접근성

- 입력칸: `aria-label="N번째 자리 숫자"`, `aria-required="true"`
- 이닝 바: `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="9"`, `aria-valuenow="N"`
- 결과 패널: `aria-live="polite"` — 스크린리더가 결과 읽음
- 시도 기록: `<ol>` (최신순 li) — SR이 "3번째 시도 4721 — 스트라이크 2, 볼 1" 읽음
- 게임 종료 시: `aria-disabled="true"` + `disabled` 입력칸에 적용

### 7.4 유효성 검사 규칙

- 4자리 모두 0~9 숫자 → 통과
- 중복 숫자 존재 → error 상태 + `<p role="alert">중복된 숫자가 있습니다</p>` (muted 텍스트)
- 빈 칸 존재 → 제출 버튼 disabled 유지
- 게임 종료 상태 → 모든 입력 disabled

---

## 8. dev 구현 가이드

### 8.1 파일 구조

```
/
├── baseball/
│   ├── index.html    # 숫자 야구 SPA entry
│   ├── styles.css    # 토큰 + 레이아웃 + 컴포넌트 스타일
│   └── main.js       # 게임 로직 + 인터랙션 (non-module, IIFE 또는 전역)
├── docs/design/
│   ├── baseball-BF-651.md           (본 문서)
│   └── mockups/baseball-BF-652.html (시각 mockup)
```

### 8.2 HTML 골격

```html
<!doctype html>
<html lang="ko" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>숫자 야구</title>
    <link rel="stylesheet" href="./styles.css" />
    <script>
      /* FOUC 방지 — 다크 default */
      (function () {
        try {
          var saved = localStorage.getItem("bf-theme");
          var theme = (saved === "light" || saved === "dark") ? saved : "dark";
          document.documentElement.setAttribute("data-theme", theme);
        } catch (_e) {}
      })();
    </script>
  </head>
  <body>
    <!-- 헤더 -->
    <header class="app-header">
      <div class="app-header__logo">
        <span aria-hidden="true">⚾</span>
        <h1 class="app-header__title">숫자 야구</h1>
      </div>
      <button class="theme-toggle" type="button" aria-label="테마 변경">🌙</button>
    </header>

    <!-- 게임 정보 바 -->
    <div class="info-bar">
      <div class="inning-bar" aria-label="남은 기회">
        <span class="inning-bar__label">남은 기회</span>
        <div class="inning-bar__dots" id="inning-dots"
             role="progressbar" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0">
          <!-- JS로 9개 span.inning-dot 생성 -->
        </div>
      </div>
      <span class="info-bar__count" id="try-count">시도: 0</span>
    </div>

    <!-- 메인 게임 -->
    <main class="game" data-game-state="idle">

      <!-- 입력 영역 -->
      <section class="card input-area" aria-label="숫자 입력">
        <div class="digit-inputs" id="digit-inputs"
             role="group" aria-label="4자리 숫자 입력">
          <input class="digit-input" type="text" inputmode="numeric"
                 maxlength="1" pattern="[0-9]"
                 aria-label="첫 번째 자리" autocomplete="off" />
          <input class="digit-input" type="text" inputmode="numeric"
                 maxlength="1" pattern="[0-9]"
                 aria-label="두 번째 자리" autocomplete="off" />
          <input class="digit-input" type="text" inputmode="numeric"
                 maxlength="1" pattern="[0-9]"
                 aria-label="세 번째 자리" autocomplete="off" />
          <input class="digit-input" type="text" inputmode="numeric"
                 maxlength="1" pattern="[0-9]"
                 aria-label="네 번째 자리" autocomplete="off" />
        </div>
        <p class="input-error" id="input-error" role="alert" aria-live="assertive"></p>
        <button class="submit-btn" type="button" id="submit-btn"
                aria-label="숫자 던지기 — 추리 제출" disabled>
          <span aria-hidden="true">⚾</span> 던지기!
        </button>
      </section>

      <!-- 시도 기록 -->
      <section class="card history-card" aria-label="시도 기록">
        <div class="history-header">
          <span>시도 기록</span>
          <span class="history-header__note">최신순 ↑</span>
        </div>
        <ol class="history-list" id="history-list" reversed>
          <li class="history-empty" id="history-empty">아직 시도 기록 없음</li>
        </ol>
      </section>

      <!-- 결과 패널 (초기 hidden) -->
      <section class="result-panel" id="result-panel"
               data-result="none"
               role="status" aria-live="polite" aria-labelledby="result-title">
        <span class="result-panel__emoji" id="result-emoji" aria-hidden="true"></span>
        <h2 class="result-panel__title" id="result-title"></h2>
        <p class="result-panel__desc" id="result-desc"></p>
        <p class="result-panel__answer">
          정답: <strong class="answer-digits" id="answer-digits"></strong>
        </p>
        <button class="new-game-btn" type="button" id="new-game-btn">🔄 새 게임</button>
      </section>

    </main>
  </body>
</html>
```

### 8.3 CSS 변수 정의 (`:root`)

```css
:root {
  /* 폰트 */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;

  /* 다크 default */
  --color-bg-canvas:       #0A0C10;
  --color-bg-surface:      #141820;
  --color-bg-subtle:       #1C2230;
  --color-border-default:  #252D3A;
  --color-border-strong:   #38465A;
  --color-text-primary:    #EAE8E0;
  --color-text-secondary:  #9098A4;
  --color-text-muted:      #565E6A;
  --color-focus-ring:      rgba(245, 166, 35, 0.55);

  /* 게임 토큰 */
  --bs-strike:       #F5A623;
  --bs-strike-bg:    #241800;
  --bs-strike-glow:  rgba(245, 166, 35, 0.45);
  --bs-ball:         #3DBE6C;
  --bs-ball-bg:      #041408;
  --bs-ball-glow:    rgba(61, 190, 108, 0.35);
  --bs-out:          #4A5568;

  --bs-win:          #F5A623;
  --bs-win-bg:       #201200;
  --bs-win-glow:     rgba(245, 166, 35, 0.40);
  --bs-lose:         #E85858;
  --bs-lose-bg:      #1F0808;
  --bs-lose-glow:    rgba(232, 88, 88, 0.35);

  /* 공간 */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 24px;  --space-6: 32px;
  --space-7: 48px;  --space-8: 64px;

  /* 반경 */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --radius-input: 10px; --radius-dot: 50%;

  /* 그림자 */
  --shadow-card:          0 4px 20px rgba(0, 0, 0, 0.40);
  --shadow-input-focus:   0 0 0 3px var(--color-focus-ring);
  --shadow-strike-dot:    0 0 8px var(--bs-strike-glow);
  --shadow-ball-dot:      0 0 6px var(--bs-ball-glow);

  /* 모션 */
  --motion-fast:   120ms;
  --motion-mid:    220ms;
  --motion-result: 350ms;
  --ease-out:      cubic-bezier(0.2, 0, 0, 1);
}

[data-theme="light"] {
  --color-bg-canvas:       #F5F5F0;
  --color-bg-surface:      #FFFFFF;
  --color-bg-subtle:       #EEEEE8;
  --color-border-default:  #D8D8D0;
  --color-border-strong:   #B0B0A8;
  --color-text-primary:    #1A1A16;
  --color-text-secondary:  #606068;
  --color-text-muted:      #9A9A93;
  --color-focus-ring:      rgba(200, 120, 10, 0.50);
  --shadow-card:           0 4px 16px rgba(0, 0, 0, 0.08);
}
```

### 8.4 핵심 컴포넌트 CSS

```css
/* 입력칸 */
.digit-input {
  width: 64px; height: 72px;
  border-radius: var(--radius-input);
  border: 2px solid var(--color-border-strong);
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  transition: border-color var(--motion-fast) var(--ease-out),
              background var(--motion-fast) var(--ease-out),
              box-shadow var(--motion-fast) var(--ease-out);
}
.digit-input:focus {
  border-color: var(--bs-strike);
  background: #1A2235;
  box-shadow: var(--shadow-input-focus);
}
.digit-input.filled {
  border-color: var(--bs-strike);
  background: var(--color-bg-surface);
}
.digit-input.error {
  border-color: var(--bs-lose);
  background: rgba(232, 88, 88, 0.10);
}

/* 제출 버튼 */
.submit-btn {
  height: 52px; min-width: 180px;
  border-radius: var(--radius-md);
  background: var(--bs-strike);
  color: #0A0C10;
  font-family: var(--font-sans);
  font-size: 15px; font-weight: 700;
  letter-spacing: 1px;
  border: none; cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-out),
              filter var(--motion-fast) var(--ease-out);
}
.submit-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.submit-btn:active:not(:disabled) { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.submit-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 3px;
}

/* 도트 */
.dot {
  width: 8px; height: 8px;
  border-radius: var(--radius-dot);
  display: inline-block;
}
.dot--strike { background: var(--bs-strike); box-shadow: var(--shadow-strike-dot); }
.dot--ball   { background: var(--bs-ball);   box-shadow: var(--shadow-ball-dot); }
.dot--out    { background: var(--bs-out); }

/* 결과 패널 */
.result-panel[data-result="none"] { display: none; }
.result-panel {
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  animation: slideUp var(--motion-result) var(--ease-out) both;
}
.result-panel[data-result="win"] {
  background: var(--bs-win-bg);
  border: 2px solid var(--bs-win);
  box-shadow: 0 0 24px var(--bs-win-glow);
}
.result-panel[data-result="lose"] {
  background: var(--bs-lose-bg);
  border: 2px solid var(--bs-lose);
  box-shadow: 0 0 24px var(--bs-lose-glow);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 히스토리 최신 행 강조 */
.history-row[data-latest="true"] {
  border-left: 3px solid var(--bs-strike);
  background: rgba(245, 166, 35, 0.05);
  border-radius: var(--radius-sm);
}

/* attribute selector 활용 — 게임 상태별 UI */
[data-game-state="win"]  .digit-input,
[data-game-state="lose"] .digit-input { pointer-events: none; opacity: 0.5; }
[data-game-state="win"]  .submit-btn,
[data-game-state="lose"] .submit-btn  { display: none; }
```

### 8.5 JavaScript 핵심 로직

```javascript
/* 비밀번호 생성 (4자리, 중복 없음) */
function generateSecret() {
  var digits = [];
  while (digits.length < 4) {
    var d = Math.floor(Math.random() * 10);
    if (digits.indexOf(d) === -1) digits.push(d);
  }
  return digits;
}

/* 판정 */
function judge(secret, guess) {
  var s = 0, b = 0;
  for (var i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      s++;
    } else if (secret.indexOf(guess[i]) !== -1) {
      b++;
    }
  }
  return { strike: s, ball: b };
}

/* 입력칸 자동 포커스 이동 */
inputs.forEach(function (input, idx) {
  input.addEventListener('input', function () {
    if (this.value.length === 1 && idx < 3) {
      inputs[idx + 1].focus();
    }
    validateInputs();
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && this.value === '' && idx > 0) {
      inputs[idx - 1].focus();
      inputs[idx - 1].value = '';
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
    if (e.key === 'ArrowRight' && idx < 3) inputs[idx + 1].focus();
  });
});
```

### 8.6 CSS 클래스명 규약

```
.app-header             — 상단 헤더
.app-header__logo       — 로고 영역 (아이콘 + 타이틀)
.app-header__title      — "숫자 야구" h1
.theme-toggle           — 테마 토글 버튼

.info-bar               — 게임 정보 바 (이닝 + 시도수)
.inning-bar             — 남은 기회 이닝 표시 바
.inning-bar__label      — "남은 기회" 레이블
.inning-bar__dots       — 9개 dot 컨테이너
.inning-dot             — 개별 이닝 dot
.inning-dot--active     — amber (남은 기회)
.inning-dot--used       — gray (소진)
.inning-dot--last       — red (마지막 기회)

.game                   — 메인 컨테이너 (data-game-state 보유)
.card                   — 공통 카드 스타일

.input-area             — 입력 영역 카드
.digit-inputs           — 4개 칸 wrapper
.digit-input            — 개별 입력칸 (filled / error 클래스)
.input-error            — 유효성 오류 메시지
.submit-btn             — 던지기 제출 버튼

.history-card           — 시도 기록 카드
.history-header         — 기록 섹션 헤더 행
.history-list           — <ol> 시도 목록
.history-row            — 개별 시도 행 (data-latest 보유)
.history-row__index     — #N 회차 배지
.history-row__guess     — 추리 숫자 (공백 구분)
.history-row__score     — S/B 텍스트 (.score-s, .score-b)
.history-row__dots      — 4개 판정 도트
.dot                    — 도트 기본
.dot--strike            — amber 도트
.dot--ball              — green 도트
.dot--out               — gray 도트
.history-empty          — 빈 상태 placeholder

.result-panel           — 결과 패널 (data-result 보유)
.result-panel__emoji    — 결과 이모지
.result-panel__title    — WIN/LOSE 타이틀
.result-panel__desc     — 부제 설명
.result-panel__answer   — 정답 숫자 표시
.answer-digits          — 정답 숫자 강조
.new-game-btn           — 새 게임 버튼
```

---

## 9. Acceptance Criteria 매핑 표

| AC | 명세 섹션 | 충족 방법 |
|---|---|---|
| `docs/design/baseball-BF-651.md` 에 화면 구성 기록 | §1, §4 | 입력 영역·시도 기록·S/B 표시·결과 패널 레이아웃 정의 (와이어프레임 포함) |
| 디자인 토큰 정의됨 | §2, §8.3 | 스트라이크(amber)·볼(green)·아웃(gray) + WIN/LOSE 상태 컬러 + 공간/반경/모션 토큰 완전 정의 |
| 반응형 규칙 정의됨 | §4.7 | ≥560px / <560px / <400px 3단계 breakpoint + 입력칸 크기·card padding·grid 변화 명세 |
| mockup HTML 이 게임스러운 비주얼로 렌더링 | §11 | `docs/design/mockups/baseball-BF-652.html` — amber/dark 야구 테마 컬러, ⚾ 아이콘, 도트 인디케이터 시각화 |
| 각 UI 요소가 1:1 기능 매핑됨 | §5, 본 표 | DigitInput(입력) / SubmitButton(제출) / HistoryRow(기록) / ResultPanel(결과) / InningBar(기회) |
| AC 매핑 표 포함됨 | §9 (본 절) | 각 AC와 명세 섹션 1:1 추적 |
| dev 구현 가이드 포함됨 | §8 | 파일 구조·HTML 골격·CSS 변수·핵심 JS 로직·클래스명 규약 완전 정의 |
| mockup 참조 섹션 포함됨 | §11 | mockup HTML 경로 + 포함 내용 명시 |

---

## 10. Self-critique

| 항목 | 검증 | 결과 |
|---|---|---|
| **AC 매핑** | AC 3개 모두 §9 표에서 명세 섹션과 1:1 연결됨 | ✅ |
| **dev 구현 가이드** | §8에 HTML 골격·CSS 변수·JS 핵심 로직·클래스명 규약 전부 포함 | ✅ |
| **기존 요소 보존** | `docs/design/**` 범위만 수정 — 타 module 파일 미수정 | ✅ |
| **컴포넌트 매핑** | DigitInput / SubmitButton / HistoryRow / ResultPanel / InningBar 5개 컴포넌트 명세 완전 정의 | ✅ |
| **모호함 flag** | 첫 자리 0 허용 여부 → v1 허용(게임 로직에서 처리)으로 명시. 최대 시도 9회는 야구 이닝 컨셉으로 정의. 추가 질문 없음 | ✅ |

**잠재적 모호함 (dev 에게 사전 공지)**:
- 입력 방식: 4개 분리 `<input>` (본 명세 채택) vs 단일 `<input>` — 분리 방식이 자동 포커스·모바일 경험 우수
- 판정 도트 순서: `S S B O` 형식(본 명세) — 위치별 매핑은 구현하지 않음(S/B 수만 표시)
- 첫 자리 0: 게임 요구사항에 따라 dev 가 결정 (이 명세에서는 허용)

---

## 11. mockup 참조

- **위치**: `docs/design/mockups/baseball-BF-652.html`
- **내용**: 숫자 야구 게임 전체 화면 — 헤더, 이닝 표시 바, 입력 영역(4칸), 시도 기록 테이블, 결과 패널
- **특이사항**: 실제 게임 로직이 내장되어 있어 직접 플레이 가능 (랜덤 비밀번호 생성, 판정, 기록 누적)
- **시뮬레이션**: idle → playing → win/lose 전환 + 스트라이크/볼 도트 시각화 확인 가능
