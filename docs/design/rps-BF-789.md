# 가위바위보 UI 시안 명세 — BF-789

> 작성자: [이디자인] (designer) · 작성일 2026-06-02
> 관련 티켓: BF-791 (designer task), BF-790 (planner), BF-789 (부모 스토리)
> 대상 모듈: `rps/` · tech-stack: `vanilla-static`
> mockup 참조: `rps/mockup.html` (file:// 로 직접 열어 확인)
> 기반 명세: `docs/planning/rps-BF-789.md` (§13 디자이너 위임 시각 요소)

---

## 1. 시안 개요

### 1.1 변경 범위
플레이어가 가위·바위·보를 선택하면 CPU 가 무작위로 응수하고, 승패 판정 결과를
즉시 시각 피드백(카드 글로우 + 결과 배너)으로 표시하며 누적 전적을 점수판에 보여주는
단일 SPA 의 **시각 디자인**을 정의한다. 코드 구현은 dev-1 담당이며, 본 문서는
레이아웃·컬러·타이포·컴포넌트 상태·인터랙션 톤을 명세한다.

### 1.2 사용자 경험 목표
- **즉각성**: 선택 → 판정까지 흐름이 한 화면에서 끊김 없이 보인다 (스크롤 불필요).
- **결과 가독성**: WIN / LOSE / DRAW 가 색·이모지·텍스트 3중 신호로 즉시 구분된다 (색맹 고려).
- **긴장감**: CPU "생각 중" 0.5초 딜레이로 결과 공개의 기대감을 연출한다.
- **무서버 실행**: 외부 의존성 0건, system font 만 사용 — `file://` 더블클릭으로 즉시 동작.

### 1.3 화면 골격 (위→아래)
```
┌──────────────────────────────────────┐
│ Header: ✊✌️🖐 가위바위보      [🌙]  │  56px sticky
├──────────────────────────────────────┤
│        점수판  [승 | 무 | 패]          │
│                                        │
│   [나 카드]   VS   [컴퓨터 카드]       │  battle-area
│                                        │
│        ┌── 결과 배너 (조건부) ──┐      │
│                                        │
│     [✌️가위] [✊바위] [🖐보]          │  choice-panel
│                                        │
│            점수 초기화                  │
│   단축키: R 바위  P 보  S 가위         │
└──────────────────────────────────────┘
```

---

## 2. 컬러 팔레트

다크 테마를 기본(`<body data-theme="dark">`)으로 하고 라이트 테마를 오버라이드로 제공한다.
모든 색은 `rps/styles.css` 의 `:root` CSS 변수로 정의한다 (vanilla-static — 토큰 파일 없음).

### 2.1 베이스 토큰 (다크 = 기본)

| 역할 | 변수명 | HEX | 용도 |
|------|--------|-----|------|
| 배경(캔버스) | `--color-bg-canvas` | `#0F1115` | body 전체 바탕 |
| 배경(표면) | `--color-bg-surface` | `#171A21` | header / 점수판 / 버튼 |
| 배경(은은) | `--color-bg-subtle` | `#1E222B` | 카드 / VS 원형 |
| 테두리(기본) | `--color-border-default` | `#262B36` | 구분선 / 카드 테두리 |
| 테두리(강조) | `--color-border-strong` | `#3A4150` | 선택 버튼 테두리 |
| 텍스트(주) | `--color-text-primary` | `#E8E8E4` | 제목 / 카드 이름 |
| 텍스트(보조) | `--color-text-secondary` | `#9A9A93` | 라벨 / 캡션 |
| 텍스트(흐림) | `--color-text-muted` | `#6B6B66` | 키보드 힌트 |
| 강조(accent) | `--color-accent` | `#5B82F0` | 포커스 outline |
| 위험(danger) | `--color-danger` | `#E55858` | 초기화 hover |

### 2.2 결과 컬러 (win / lose / draw)

색맹 사용자도 구분되도록 **색 + 이모지 + 텍스트** 3중 신호를 함께 쓴다.

| 결과 | 텍스트색 | 배경 | 글로우 | 이모지 | 톤 |
|------|----------|------|--------|--------|----|
| WIN (승) | `--rps-win` `#28C840` | `--rps-win-bg` `#0A1F0E` | `--rps-win-glow` `rgba(40,200,64,.30)` | 🎉 | 밝은 초록 |
| LOSE (패) | `--rps-lose` `#E82828` | `--rps-lose-bg` `#1F0A0A` | `--rps-lose-glow` `rgba(232,40,40,.30)` | 😢 | 선명한 빨강 |
| DRAW (무) | `--rps-draw` `#F5C400` | `--rps-draw-bg` `#1F1900` | `--rps-draw-glow` `rgba(245,196,0,.25)` | 🤝 | 노랑 |

### 2.3 선택지 컬러 (hover 시 카드/버튼 강조)

| 선택지 | 변수 | HEX | hover 배경 |
|--------|------|-----|-----------|
| 가위 scissors | `--rps-scissors` | `#F5C400` | `--rps-scissors-bg` `#1F1900` |
| 바위 rock | `--rps-rock` | `#9A9A93` | `--rps-rock-bg` `#1A1C22` |
| 보 paper | `--rps-paper` | `#5B82F0` | `--rps-paper-bg` `#0A1020` |

### 2.4 라이트 테마 오버라이드 (`[data-theme="light"]`)

| 변수 | 라이트 값 |
|------|-----------|
| `--color-bg-canvas` | `#FAFAF9` |
| `--color-bg-surface` | `#FFFFFF` |
| `--color-bg-subtle` | `#F1F1EF` |
| `--color-text-primary` | `#1A1A19` |
| `--color-accent` | `#3563E9` |
| `--rps-win-bg` | `#E8F9EC` |
| `--rps-lose-bg` | `#FDE8E8` |
| `--rps-draw-bg` | `#FDF8E1` |

> 결과 텍스트색(win/lose/draw)·선택지색은 두 테마 공통 — 명도가 충분해 양쪽에서 가독.

---

## 3. 타이포그래피

system font 만 사용 (CDN·웹폰트 금지). 숫자 점수는 mono 폰트로 정렬감 부여.

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
--font-mono: ui-monospace, Menlo, Consolas, monospace;
```

| 요소 | font-family | size | weight | letter-spacing | line-height |
|------|-------------|------|--------|----------------|-------------|
| 앱 제목 (h1) | sans | 20px | 800 | 2px | 1.2 |
| 점수 숫자 | **mono** | 28px | 700 | 0 | 1 |
| 점수 라벨 (승/무/패) | sans | 11px | 600 | 1.5px (대문자) | 1.2 |
| 카드 이모지 | — | 64px (모바일 52px) | — | — | 1 |
| 카드 이름 (가위 등) | sans | 14px | 700 | 0 | 1.4 |
| 카드 라벨 (나/컴퓨터) | sans | 12px | 600 | 1px (대문자) | 1.2 |
| 결과 배너 텍스트 | sans | 26px | 800 | 3px | 1.2 |
| 선택 버튼 이름 | sans | 14px | 700 | 0 | 1.4 |
| 키보드 힌트 | sans | 12px | 400 | 0 | 1.4 |

---

## 4. 레이아웃

### 4.1 컨테이너
- `.game` : `max-width: 600px`, 가운데 정렬, 세로 flex, 요소 간 `gap: 24px`, 패딩 `32px 16px`.
- Header 는 `position: sticky; top: 0`, 높이 56px.

### 4.2 spacing 토큰
`--space-1:4 / -2:8 / -3:12 / -4:16 / -5:24 / -6:32 / -7:48` (px).
radius: `--radius-sm:4 / -md:8 / -lg:12`.

### 4.3 데스크탑 (≥ 640px)
- **배틀 영역**: `[나 카드] — VS 원형 — [컴퓨터 카드]` 가로 1행. 카드 160×180px, gap 24px.
- **점수판**: 가로 3분할 `승 | 무 | 패`, max-width 420px, 세로 구분선.
- **선택 버튼**: 가로 3개 나란히 (130×96px), gap 16px.

### 4.4 모바일 (≤ 639px) — breakpoint `@media (max-width: 639px)`
- **배틀 영역**: `flex-direction: column` 으로 카드가 세로로 쌓임 (나 위 / VS / 컴퓨터 아래), 카드 130×150px.
- VS 원형 56→44px 축소.
- 선택 버튼 130→100px 폭 축소, 이모지 30→24px.
- 점수판 max-width 100% 로 가로 확장.
- 카드 이모지 64→52px.

> planner §12 "반응형은 designer 재량 · 기본 작동" → 데스크탑/모바일 2단계로 한정.

---

## 5. 컴포넌트 명세

### 5.1 선택지 카드 `.choice-card`
플레이어/CPU 각 1개. `data-owner="player|cpu"`, `data-state`, `data-choice` 속성으로 상태 표현.

| 상태 | 시각 |
|------|------|
| idle | 이모지 ❓, 점선 아닌 실선 테두리, 글로우 없음 |
| thinking (CPU) | 점 3개 펄스 애니메이션(`.thinking-dots`), 테두리 dashed |
| 공개 | 선택 이모지 + `flipIn` 애니(rotateY 90°→0°, 0.3s) |
| 승리 강조 | 게임 상태 `result-win` 시 player 카드 테두리 초록 + 글로우 |
| 패배 강조 | `result-lose` 시 cpu 카드 테두리 빨강 + 글로우 |
| 무승부 강조 | `result-draw` 시 양쪽 카드 노랑 글로우 |

### 5.2 점수판 `.scoreboard`
승/무/패 3개 `.score-item`, 각 `data-type` 으로 숫자 색상 구분(win 초록/draw 노랑/lose 빨강).
점수 갱신 시 `.score-pop` 클래스로 scale 1→1.3→1 팝 애니(0.25s).

### 5.3 결과 배너 `.result-banner`
`data-result="none|win|lose|draw"`. 기본 `visibility: hidden`. 판정 시 `.visible` 추가 →
`slideUp`(translateY 8px→0, 0.25s) 등장. 결과별 배경·테두리·텍스트색 적용.
구성: `이모지 + 텍스트`(예: `🎉 WIN`, `😢 LOSE`, `🤝 DRAW`).
접근성: `role="status" aria-live="polite"` — 스크린리더가 결과를 읽음.

#### 결과 메시지 톤 (AC 요구 항목)
| 결과 | 배너 | 보조 카피(선택) | 톤 |
|------|------|----------------|----|
| WIN | `🎉 WIN` | "이겼어요!" | 축하·고양 |
| LOSE | `😢 LOSE` | "아쉬워요, 다시!" | 위로·재도전 유도 (좌절 X) |
| DRAW | `🤝 DRAW` | "비겼어요" | 중립·담백 |

> 카피는 한국어, 짧고 긍정적. LOSE 도 비난 없이 재도전을 권유하는 톤 유지.

### 5.4 선택 버튼 `.choice-btn`
3개(가위/바위/보). `data-choice` 속성. 이모지 + 이름 세로 배치. 130×96px.

| 상태 | 시각 |
|------|------|
| default | surface 배경, strong 테두리 |
| hover | `translateY(-2px)` 떠오름 + 선택지별 컬러 테두리·배경 (예: 가위→노랑) |
| active | `scale(0.95)` 눌림 |
| disabled (thinking 중) | `opacity: 0.45`, `pointer-events: none`, 커서 not-allowed |
| focus-visible | accent 2px outline (키보드 탐색) |

### 5.5 테마 토글 `.theme-toggle`
header 우측 🌙/☀️ 버튼. 클릭 시 `data-theme` 전환 + `localStorage['rps:theme']` 저장.

### 5.6 초기화 버튼 `.reset-btn`
하단 텍스트 버튼. hover 시 danger 색 테두리·텍스트로 경고 톤. 클릭 시 점수 0/0/0 + 카드 idle 리셋.

### 5.7 게임 상태 컨테이너 `<main id="game" data-game-state="...">`
planner §13 고정 규칙. 값: `idle | thinking | result-win | result-lose | result-draw`.
CSS 가 이 속성에 따라 카드 글로우·버튼 비활성을 일괄 제어한다.

---

## 6. dev 구현 가이드 (dev-1 단계별 지침)

> dev-1 은 아래 클래스/속성/변수명을 그대로 쓰면 mockup 과 동일한 시각을 재현할 수 있다.
> mockup 은 시각 참조 — 픽셀 단위 일치 의무는 없다.

1. **토큰 정의**: `rps/styles.css` `:root` 에 §2 컬러·§4.2 spacing·§3 폰트 변수 전부 정의. `[data-theme="light"]` 오버라이드 §2.4.
2. **레이아웃 골조**: `.game`(max-width 600, 세로 flex, gap 24) → header / scoreboard / battle-area / result-banner / choice-panel / reset-btn / keyboard-hint 순서.
3. **카드 상태**: `.choice-card[data-state]` + `.game[data-game-state="..."] .choice-card[data-owner]` 선택자로 글로우 제어 (§5.1 표).
4. **애니메이션 키프레임**: `flipIn`(0.3s) / `scorePop`(0.25s) / `slideUp`(0.25s) / `dotPulse`(1.2s 무한). 모두 CSS only.
5. **버튼 상태**: `.choice-btn:hover:not(:disabled)` 에 선택지별 컬러, `.game[data-game-state="thinking"] .choice-btn` 에 비활성.
6. **결과 배너**: `data-result` 별 색 + `.visible` 토글로 등장. 이모지+텍스트는 main.js 가 채움.
7. **키보드 단축키**: planner §8 — `R`=바위, `P`=보, `S`=가위. 힌트 문구 `단축키: R 바위 · P 보 · S 가위 · Esc 초기화`. (기존 1/2/3 매핑은 R/P/S 로 교체 — planner §8.3.)
8. **반응형**: `@media (max-width: 639px)` 블록에서 §4.4 적용.
9. **접근성**: 선택 버튼 `aria-label="가위 선택 (S키)"` 형식, 결과 배너 `aria-live="polite"`.

### 권장 CSS 변수·클래스명 요약
- 컬러: `--color-*`, `--rps-{win,lose,draw}`, `--rps-{scissors,rock,paper}`
- 컴포넌트: `.app-header` · `.scoreboard`/`.score-item` · `.battle-area` · `.choice-card` · `.vs-divider` · `.result-banner` · `.choice-panel`/`.choice-btn` · `.reset-btn` · `.keyboard-hint`
- 애니 클래스: `.flip-in` · `.score-pop` · `.visible` · `.thinking-dots`

---

## 7. AC ↔ 디자인 요소 매핑 (1:1)

planner 명세(`docs/planning/rps-BF-789.md` §10)의 AC 각 항목을 디자인 영역/컴포넌트와 매핑한다.

| Epic AC | 요구 내용 | 매핑 디자인 요소 (영역 / 컴포넌트) | 명세 위치 |
|---------|-----------|-----------------------------------|-----------|
| AC-01 | 요구사항 문서화 | 본 명세 문서 전체 (§1~§7) | 전체 |
| AC-02 | 단일 SPA·외부 의존성 0 | system font + 인라인 CSS 변수, CDN 금지 | §1.2, §3 |
| AC-03 | judge 9케이스 판정 | 결과 배너 `data-result` win/lose/draw 3종 + 카드 글로우 | §5.1, §5.3 |
| AC-04 | R/P/S 키보드 단축키 | 키보드 힌트 `.keyboard-hint` + 버튼 `aria-label` 힌트 | §6-7, §5.4 |
| AC-05 | thinking 중 입력 차단 | `.choice-btn` disabled 상태(opacity .45, pointer-events none) | §5.4 |
| AC-06 | 누적 전적 영속화 | 점수판 `.scoreboard` 숫자 표시 (win/draw/lose 색 구분) | §5.2 |
| AC-07 | 전적 초기화 | 초기화 버튼 `.reset-btn` (hover danger 톤) | §5.6 |
| AC-08 | CPU 생각 딜레이 | CPU 카드 `.thinking-dots` 점 3개 펄스 + dashed 테두리 | §5.1 |
| AC-09 | 결과 배너 표시 | 결과 배너 이모지+텍스트+글로우 (`slideUp` 등장) | §5.3 |

---

## 8. mockup 참조

- 파일: **`rps/mockup.html`** (이 디렉터리 기준 `../../rps/mockup.html`)
- 단일 self-contained HTML — 외부 의존성 0건, system font, 인라인 `<style>`.
- 본 명세의 컬러·타이포·레이아웃을 그대로 시각화. 5가지 게임 상태(idle / thinking /
  result-win / result-lose / result-draw)와 버튼 상태(default/hover/active/disabled),
  모바일 레이아웃을 `<section>` 으로 나란히 보여준다 (정적 — 인터랙션 없이 의도 전달).
- `file://` 더블클릭으로 열어 시안을 한눈에 확인 가능.

---

## 9. Self-critique

PR commit 직전 자기 점검 (`.claude/skills/designer-spec-self-critique.md` 5항목):

1. **AC 매핑**: planner AC-01~09 전부 §7 표에 1:1 매핑 완료. 누락 없음.
2. **dev 구현 가이드**: §6 에 9단계 + 권장 변수/클래스명 명시 — dev-1 이 바로 착수 가능.
3. **기존 요소 보존**: 기존 `rps/styles.css`(BF-648) 토큰 체계·DOM 구조(`data-game-state`)와 정합. 키보드 매핑만 planner 지시대로 1/2/3 → R/P/S 변경 (의도된 변경, §6-7 에 명시).
4. **컴포넌트 매핑**: 모든 컴포넌트(카드/점수판/배너/버튼/토글/초기화)가 §5 에 props/상태/인터랙션과 함께 정의됨.
5. **모호함 flag**: ⚠️ 키보드 단축키가 기존 구현(1/2/3+R초기화)과 다름 — dev-1 은 planner §8.3 기준 R/P/S 로 **재할당**하고 초기화는 `Esc` 또는 버튼 클릭 전용으로 이동할 것. 결과 배너 보조 카피(§5.3)는 권장이며 필수 아님.

---

*문서 종료 — [이디자인] · BF-791*
