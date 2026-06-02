# 숫자 맞추기 게임 UI 시안 명세 — BF-785

> 작성자: [이디자인] (designer) · 작성일 2026-06-02
> 관련 티켓: BF-785 (designer task) · BF-784 (planner) · BF-783 (부모 스토리)
> 기획 문서: `docs/plan/number-guess-BF-783.md`
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
> mockup 참조: `docs/design/mockups/number-guess-BF-783.html`

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [상태 전이 명세](#5-상태-전이-명세)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [dev 구현 가이드](#7-dev-구현-가이드)
8. [AC ↔ UI 매핑 표](#8-ac--ui-매핑-표)
9. [mockup 참조](#9-mockup-참조)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 모듈 `number-guess/` 의 시각 시안. 단일 페이지 정적 게임 UI 로, 1~100 숫자 추리 게임의 모든 상호작용 상태를 시각적으로 정의한다. 기존 모듈과 공유하는 CSS/토큰 없음 — 완전 독립.

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| 한눈에 "무엇을 할지" 인지 | 단일 컬럼 중앙 정렬 카드 — 입력 필드가 시각적 초점 |
| 힌트 방향(↑/↓)을 즉각 이해 | too-low/too-high 별 색상 + 방향 아이콘(⬆/⬇) 차별화 |
| 진행 상황 인식 | 카드 상단 고정 위치에 시도 횟수 카운터 상시 표시 |
| 정답의 성취감 | won 상태에서 카드 강조(테두리/배경 전환) + 축하 메시지 + 재시작 CTA |
| 실수에 대한 부드러운 피드백 | error 상태는 빨간 계열이되 위협적이지 않게 — 입력 내용 유지 |

### 1.3 디자인 톤

- 다크 그라데이션 배경 위 밝은 카드 → 숫자 게임 특유의 "집중" 무드
- 둥근 모서리(border-radius) + 부드러운 그림자로 친근함
- 상태별 색상 코딩으로 텍스트를 읽지 않아도 결과 방향을 색으로 인지

---

## 2. 컬러 팔레트

모든 색상은 `number-guess/style.css` 의 `:root` 에 신규 CSS 변수로 정의한다. 다른 모듈과 공유하지 않는다.

| 역할 | CSS 변수 | HEX | 용도 |
|------|----------|-----|------|
| primary | `--ng-color-primary` | `#4f46e5` | 제출 버튼, 입력 포커스 링, 강조 |
| primary-hover | `--ng-color-primary-hover` | `#4338ca` | 제출 버튼 hover |
| secondary (too-low) | `--ng-color-low` | `#0ea5e9` | "더 큰 숫자" 힌트 (위 방향, cyan/blue) |
| accent (too-high) | `--ng-color-high` | `#f59e0b` | "더 작은 숫자" 힌트 (아래 방향, amber) |
| success (won) | `--ng-color-success` | `#10b981` | 정답 축하, 재시작 버튼 |
| error | `--ng-color-error` | `#ef4444` | 잘못된 입력 에러 메시지 |
| background | `--ng-color-bg` | `#0f172a` | 페이지 배경 (그라데이션 기준색) |
| background-2 | `--ng-color-bg-2` | `#1e293b` | 배경 그라데이션 보조색 |
| surface | `--ng-color-surface` | `#ffffff` | 카드 표면 |
| surface-muted | `--ng-color-surface-muted` | `#f1f5f9` | 입력 필드 배경, 카운터 칩 |
| text | `--ng-color-text` | `#0f172a` | 카드 내 본문 텍스트 |
| text-muted | `--ng-color-text-muted` | `#64748b` | 보조 텍스트, placeholder |
| border | `--ng-color-border` | `#cbd5e1` | 입력 필드/구분선 테두리 |

### 2.1 상태별 강조색 매핑

| data-state | 카드 강조 테두리 | 메시지 색상 |
|------------|-----------------|-------------|
| `idle` | `--ng-color-border` (중립) | `--ng-color-text-muted` |
| `playing` (too-low) | `--ng-color-low` | `--ng-color-low` |
| `playing` (too-high) | `--ng-color-high` | `--ng-color-high` |
| `error` | `--ng-color-error` | `--ng-color-error` |
| `won` | `--ng-color-success` | `--ng-color-success` |

---

## 3. 타이포그래피

system font stack 만 사용한다. 외부 폰트 CDN 금지.

```css
--ng-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--ng-font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
```

| 요소 | font-family | size | weight | line-height | 비고 |
|------|-------------|------|--------|-------------|------|
| 게임 제목 (h1) | sans | `clamp(1.6rem, 4vw, 2.2rem)` | 700 | 1.2 | 카드 상단 |
| 부제/안내 | sans | `0.95rem` | 400 | 1.5 | 제목 하단 1줄 |
| 힌트/상태 메시지 | sans | `1.15rem` | 600 | 1.4 | 상태별 색상 적용 |
| 입력 필드 텍스트 | mono | `1.5rem` | 600 | 1 | 숫자 가독성 위해 mono |
| 시도 횟수 카운터 | sans | `0.9rem` | 600 | 1 | 칩 형태, 라벨+숫자 |
| 버튼 라벨 | sans | `1rem` | 600 | 1 | 제출/재시작 |
| 축하 메시지 (won) | sans | `1.3rem` | 700 | 1.3 | 이모지 포함 가능 |

---

## 4. 레이아웃

### 4.1 전체 구조

```
┌─────────────────────────────────────┐  ← body: 다크 그라데이션 배경, flex 중앙 정렬
│                                       │
│        ┌───────────────────────┐      │
│        │   [시도 횟수: 0회] 칩   │      │  ← 카드 상단 우측 정렬 카운터
│        │                       │      │
│        │   숫자 맞추기 (h1)     │      │
│        │   1~100 사이 안내      │      │
│        │                       │      │
│        │   [ 힌트/상태 메시지 ]  │      │  ← #message · 상태별 색상
│        │                       │      │
│        │   [  입력 필드 (mono) ] │      │  ← #guess-input
│        │   [   제출 버튼     ]   │      │  ← #submit-btn (전체 너비)
│        │   [   재시작 버튼   ]   │      │  ← #restart-btn (won 일 때만 노출)
│        └───────────────────────┘      │
│                                       │
└─────────────────────────────────────┘
```

### 4.2 spacing 토큰

| 변수 | 값 | 용도 |
|------|-----|------|
| `--ng-space-xs` | `8px` | 인접 요소 간 최소 간격 |
| `--ng-space-sm` | `12px` | 메시지/카운터 내부 패딩 |
| `--ng-space-md` | `20px` | 카드 내 섹션 간 간격 |
| `--ng-space-lg` | `28px` | 카드 패딩 |
| `--ng-radius` | `16px` | 카드 모서리 |
| `--ng-radius-sm` | `10px` | 버튼/입력/칩 모서리 |

### 4.3 카드 규격

- `max-width: 420px`, `width: 100%`, 좌우 `padding: var(--ng-space-lg)`
- 카드 그림자: `box-shadow: 0 20px 50px -12px rgba(0,0,0,0.45)`
- 카드 상단 강조 테두리: `border-top: 4px solid <상태별 강조색>` — 상태 전이 시 색만 교체

### 4.4 breakpoint 동작

단일 컬럼이라 복잡한 반응형 불필요. 모바일 안전성만 보장:

| breakpoint | 동작 |
|------------|------|
| `>= 480px` | 카드 `max-width: 420px` 중앙 고정 |
| `< 480px` | 카드 `width: 100%`, body `padding: 16px` 로 화면 가장자리 여백 확보 |

> planner 9절: 반응형/모바일 최적화는 비범위 — 위 최소 안전 처리까지만 요구.

---

## 5. 상태 전이 명세

게임 컨테이너 `<div id="game" data-state="...">` 의 `data-state` 속성으로 시각 상태를 전환한다. (planner 10절에서 구조 고정)

### 5.1 상태 정의 (5개 시각 상태)

| 상태 | data-state | 입력 필드 | 제출 버튼 | 재시작 버튼 | 메시지 | 강조색 |
|------|------------|-----------|-----------|-------------|--------|--------|
| idle (시작 대기) | `idle` | 활성 + 포커스 | 활성 | 숨김 | 안내 문구 (회색) | border |
| guessing — too-low | `playing` + 메시지 `더 큰 숫자입니다 ⬆` | 활성 | 활성 | 숨김 | low 색상 | low (cyan) |
| guessing — too-high | `playing` + 메시지 `더 작은 숫자입니다 ⬇` | 활성 | 활성 | 숨김 | high 색상 | high (amber) |
| error (잘못된 입력) | `error` | 활성 (내용 유지) | 활성 | 숨김 | error 색상 | error (red) |
| won (정답) | `won` | 비활성 | 비활성 | **노출 + 활성 + 포커스** | success 색상 | success (green) |

> too-low / too-high 는 둘 다 `data-state="playing"` 이며, 힌트 메시지 텍스트·색상으로 방향을 구분한다. CSS 는 메시지 요소에 별도 modifier 클래스(`is-low` / `is-high`)를 부여해 색을 다르게 한다.

### 5.2 상태 전이 다이어그램

```
            ┌──────────── 재시작 ────────────┐
            │                                 │
            ▼                                 │
  ┌──────┐  유효 입력 + guess≠secret   ┌───────────┐
  │ idle │ ───────────────────────────▶│  playing  │◀─┐
  └──────┘                              │ (low/high)│  │ 유효 입력
     │                                  └───────────┘  │ guess≠secret
     │ 잘못된 입력                            │         │
     ▼                                       │ 유효 입력└──┘
  ┌───────┐  유효 입력                        │ guess===secret
  │ error │ ──────────▶ (playing/won 으로)    ▼
  └───────┘                              ┌───────┐
     ▲                                   │  won  │
     └────────── 잘못된 입력 ─────────────┘ (재시작 버튼 노출)
```

- `idle → playing`: 첫 유효 추리(오답)
- `idle/playing → error`: 빈/소수/문자/범위 밖 입력 (시도 횟수 증가 없음)
- `error → playing/won`: 다음 유효 입력 시 정상 복귀
- `playing/idle → won`: `guess === secret`
- `won → idle`: 재시작 버튼 클릭 또는 Enter (새 비밀 숫자, 카운터 0)

### 5.3 인터랙션 시각 피드백

| 인터랙션 | 시각 처리 |
|----------|-----------|
| 입력 필드 focus | `--ng-color-primary` 2px 포커스 링 (box-shadow) |
| 제출 버튼 hover | 배경 `--ng-color-primary-hover` 로 전환 + 살짝 어두워짐 |
| 제출 버튼 active | `transform: translateY(1px)` 눌림 효과 |
| 버튼 disabled (won 시 제출) | `opacity: 0.5`, `cursor: not-allowed` |
| 상태 전이 | 카드 `border-top` 색상 `transition: border-color 0.2s` 부드럽게 |
| won 진입 | 카드 배경에 success 틴트 + 축하 메시지 fade-in (CSS `@keyframes` 정적 허용) |

---

## 6. 컴포넌트 명세

planner 4.2 의 마크업 ID 구조를 그대로 따른다. 아래는 각 컴포넌트의 표시 규칙·상태·인터랙션이다.

### 6.1 게임 컨테이너 `#game`

| 속성 | 값 |
|------|-----|
| 마크업 | `<div id="game" data-state="idle">` |
| 상태 | `data-state`: `idle` \| `playing` \| `error` \| `won` |
| 역할 | 모든 하위 요소를 감싸는 카드. `data-state` 에 따라 강조 테두리/배경 전환 |

### 6.2 시도 횟수 카운터 `#attempt-count`

| 속성 | 값 |
|------|-----|
| 마크업 | `시도 횟수: <span id="attempt-count">0</span>회` |
| 위치 | 카드 상단 우측, 칩(chip) 형태 배경 `--ng-color-surface-muted` |
| 상태 | 매 유효 제출마다 +1. error 시 변동 없음. 재시작 시 0 |
| 인터랙션 | 없음 (표시 전용) |

### 6.3 힌트/상태 메시지 `#message`

| 속성 | 값 |
|------|-----|
| 마크업 | `<p id="message" class="message">...</p>` |
| modifier | `is-low` (cyan) / `is-high` (amber) / `is-error` (red) / `is-won` (green) |
| 문구 | too-low: `더 큰 숫자입니다 ⬆` / too-high: `더 작은 숫자입니다 ⬇` / error: `1~100 사이의 정수를 입력하세요` / won: `🎉 정답입니다! N번 만에 맞혔어요` |
| idle | 안내 문구 `1부터 100 사이의 숫자를 입력하세요` (회색) |
| 상태 | 빈 메시지 시에도 레이아웃 흔들림 방지 위해 `min-height` 고정 |

### 6.4 입력 필드 `#guess-input`

| 속성 | 값 |
|------|-----|
| 마크업 | `<input id="guess-input" type="number" min="1" max="100" inputmode="numeric">` |
| placeholder | `1 ~ 100` |
| 폰트 | mono, 중앙 정렬, `1.5rem` |
| 상태 | idle/playing/error: 활성 · won: `disabled` |
| 인터랙션 | focus 시 primary 포커스 링 · Enter 키로 제출(dev 가 JS 바인딩) |

### 6.5 제출 버튼 `#submit-btn`

| 속성 | 값 |
|------|-----|
| 마크업 | `<button id="submit-btn" type="button">추측하기</button>` |
| 스타일 | 전체 너비, `--ng-color-primary` 배경, 흰 텍스트 |
| 상태 | idle/playing/error: 활성 · won: `disabled` (opacity 0.5) |
| 인터랙션 | hover/active 피드백 (5.3 참조) |

### 6.6 재시작 버튼 `#restart-btn`

| 속성 | 값 |
|------|-----|
| 마크업 | `<button id="restart-btn" type="button">다시 하기</button>` |
| 스타일 | 전체 너비, `--ng-color-success` 배경, 흰 텍스트 |
| 표시 | 기본 `display: none` → `data-state="won"` 일 때만 노출 (`#game[data-state="won"] #restart-btn { display: block }`) |
| 상태 | won 일 때 활성 + 포커스 (Enter 재시작 지원) |
| 인터랙션 | 클릭 시 새 게임 초기화 (dev 가 JS 바인딩) |

---

## 7. dev 구현 가이드

dev-1(developer) 가 `number-guess/style.css` 작성 시 따라할 단계별 지침. 클래스/변수명은 권장값이며, 마크업 ID 는 planner 4.2 고정.

### 7.1 CSS 변수 선언 (`:root`)

2절·3절·4.2 의 모든 토큰을 `:root` 에 선언한다. 예:

```css
:root {
  --ng-color-primary: #4f46e5;
  --ng-color-primary-hover: #4338ca;
  --ng-color-low: #0ea5e9;
  --ng-color-high: #f59e0b;
  --ng-color-success: #10b981;
  --ng-color-error: #ef4444;
  --ng-color-bg: #0f172a;
  --ng-color-bg-2: #1e293b;
  --ng-color-surface: #ffffff;
  --ng-color-surface-muted: #f1f5f9;
  --ng-color-text: #0f172a;
  --ng-color-text-muted: #64748b;
  --ng-color-border: #cbd5e1;
  --ng-font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --ng-font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --ng-space-xs: 8px; --ng-space-sm: 12px; --ng-space-md: 20px;
  --ng-space-lg: 28px; --ng-radius: 16px; --ng-radius-sm: 10px;
}
```

### 7.2 단계별 구현 순서

1. **body**: 다크 그라데이션 배경(`linear-gradient(160deg, var(--ng-color-bg), var(--ng-color-bg-2))`), `min-height: 100vh`, `display:flex; align-items:center; justify-content:center`, `font-family: var(--ng-font-sans)`.
2. **#game 카드**: 흰 배경, `max-width:420px`, `border-radius`, `box-shadow`, `border-top:4px solid var(--ng-color-border)`, `transition: border-color .2s, background .2s`.
3. **카운터 칩**: 카드 상단 우측 정렬, `--ng-color-surface-muted` 배경, `border-radius: var(--ng-radius-sm)`.
4. **메시지** `.message`: `min-height: 1.6em` 고정, 중앙 정렬, modifier 클래스별 색상.
5. **입력 필드**: mono 폰트, 중앙 정렬, `:focus` 포커스 링.
6. **버튼들**: 전체 너비, `--ng-radius-sm`, hover/active/disabled.
7. **상태별 셀렉터** (아래 7.3) 로 data-state 전환 처리.

### 7.3 상태 전환 셀렉터 (권장)

```css
/* 카드 강조 테두리 */
#game[data-state="error"] { border-top-color: var(--ng-color-error); }
#game[data-state="won"]   { border-top-color: var(--ng-color-success); background: #f0fdf4; }
/* playing 시 테두리는 메시지 modifier 와 함께 JS 가 결정하거나 중립 유지 */

/* 메시지 색상 (JS 가 modifier 부여) */
.message.is-low   { color: var(--ng-color-low); }
.message.is-high  { color: var(--ng-color-high); }
.message.is-error { color: var(--ng-color-error); }
.message.is-won   { color: var(--ng-color-success); font-weight: 700; }

/* 재시작 버튼: won 일 때만 */
#restart-btn { display: none; }
#game[data-state="won"] #restart-btn { display: block; }

/* won 시 입력/제출 비활성 시각 */
#game[data-state="won"] #guess-input,
#game[data-state="won"] #submit-btn { opacity: .5; }
```

> **JS 동작 책임은 game.js(dev)**: data-state 전환, message 텍스트/modifier 부여, attempt-count 갱신, disabled 토글, 포커스 이동, Enter 키 바인딩은 모두 game.js 가 처리. CSS 는 위 셀렉터로 시각만 반영.

### 7.4 mockup 과의 관계

`docs/design/mockups/number-guess-BF-783.html` 는 5개 상태를 한 화면에 나란히 배치한 **시각 시뮬레이션**이다. 실제 게임은 단일 카드가 상태를 전환하므로, dev 는 mockup 의 단일 카드 스타일을 가져오되 상태 전환은 7.3 셀렉터로 구현한다. **픽셀 단위 일치 의무는 없다** — 색/타이포/레이아웃 의도 전달이 핵심.

---

## 8. AC ↔ UI 매핑 표

planner 7절의 AC-01~AC-08 각 항목과 본 시안의 UI 표현을 1:1 매핑한다.

| AC | planner 요구 | 본 시안 UI 표현 | 관련 상태/컴포넌트 |
|----|--------------|----------------|--------------------|
| **AC-01** | 로드 시 비밀숫자 생성·입력 포커스·시도 0 표시 | `idle` 상태: 입력 필드 포커스 링, 카운터 칩 `0회`, 안내 메시지(회색) | §5.1 idle · §6.2 · §6.4 |
| **AC-02** | `30` 입력 → "더 큰 숫자입니다" + 카운터 +1 | `playing` + `.message.is-low` cyan `더 큰 숫자입니다 ⬆`, 카운터 증가 | §5.1 too-low · §6.3 |
| **AC-03** | `70` 입력 → "더 작은 숫자입니다" + 카운터 +1 | `playing` + `.message.is-high` amber `더 작은 숫자입니다 ⬇`, 카운터 증가 | §5.1 too-high · §6.3 |
| **AC-04** | 정답 → 축하+최종 횟수, 입력/제출 비활성, 재시작 활성 | `won` 상태: success 카드 강조, `🎉 정답...N번`, 입력/제출 opacity 0.5 disabled, 재시작 버튼 노출+포커스 | §5.1 won · §6.6 · §7.3 |
| **AC-05** | Enter 제출 = 버튼 클릭 | 입력 필드 §6.4 에 Enter 바인딩 명시(dev), 시각 결과는 AC-02/03/04 와 동일 | §6.4 인터랙션 |
| **AC-06** | 범위 밖 입력 → 에러, 카운터 불변, 입력 활성 유지 | `error` 상태: red 강조 테두리, `.message.is-error` `1~100 사이의 정수를 입력하세요`, 카운터 불변, 입력 내용 유지 | §5.1 error · §6.3 |
| **AC-07** | 재시작 → 새 숫자·카운터 0·메시지 초기화·입력 포커스 | 재시작 버튼 클릭 → `idle` 복귀(§5.2 전이), 카운터 `0회`, 안내 메시지, 입력 포커스 | §5.2 · §6.6 |
| **AC-08** | evaluateGuess 단위 테스트 | UI 비해당 — 순수 함수 로직(dev/test 책임). 시안 영향 없음 | — (로직 전용) |

> AC-08 은 순수 함수 단위 테스트로 UI 표현이 없으나, AC-02/03/04 의 힌트·정답 결과 표시가 evaluateGuess 반환값(`too-low`/`too-high`/`correct`)에 1:1 대응한다.

### 8.1 Edge Case 시각 처리 (planner 8절)

| Edge Case | 시각 처리 |
|-----------|-----------|
| EC-01 첫 추리 정답 | `won` 즉시 진입, 메시지 `1번 만에` |
| EC-02~06 빈/소수/문자/0/101 | 모두 `error` 상태 동일 처리, 카운터 불변 |
| EC-07 정답 후 Enter | 재시작 버튼이 won 시 포커스 → Enter 로 재시작 (§6.6) |
| EC-10 연속 동일 입력 | 동일 힌트 메시지 반복, 카운터 매번 증가 (시각 변화 없음 정상) |

---

## 9. mockup 참조

- **파일**: `docs/design/mockups/number-guess-BF-783.html`
- **내용**: 본 명세의 컬러/타이포/레이아웃을 그대로 반영한 단일 self-contained HTML. 5개 시각 상태(idle / too-low / too-high / error / won)를 카드로 나란히 배치하여 dev·reviewer 가 한 화면에서 상태 전이를 확인 가능.
- **의존성**: 0건 (인라인 `<style>`, system font). `file://` 직접 열기 호환.
- **사용법**: dev 는 단일 카드 스타일을 참조 가이드로 사용. 실제 구현은 단일 카드 + `data-state` 전환(§7.3).

---

*문서 종료 — [이디자인] · BF-785*
