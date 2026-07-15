# /demo/tetris 반응형·상태별 UI·키보드/터치·접근성 디자인 명세 — BF-833

> 작성자: [이디자인] (designer) · 작성일 2026-07-15
> 관련 티켓: BF-835 (본 designer task) · BF-833 (부모 Epic/Story) · BF-834 (planner 기획 명세 — 의존)
> tech-stack: `typescript-monorepo` (신규 `/demo/tetris` 백엔드 영역) — **단, 기존 `tetris/` 프론트엔드는 `vanilla-static` 유지** (planner BF-834 §0 가정 2 준수)
> 산출물: 본 명세 markdown + `docs/design/mockups/tetris-BF-833.html`

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**전제 1 — 기존 게임 UI 는 이미 구현·배포되어 있다.** 보드(10×20)·HUD(점수/레벨/라인)·NEXT/HOLD 미리보기·시작/일시정지/게임오버 오버레이·반응형·다크/라이트 테마는 `docs/design/tetris-BF-639.md` 명세와 `tetris/index.html` + `tetris/styles.css`(BF-642 구현)에 **이미 존재**한다. 본 문서는 이를 **재발명하지 않고**(Simplicity First·Surgical Changes) 재확인·참조하며, BF-835 가 추가하는 **신규 UI 표면만** 설계한다.

**전제 2 — BF-835 신규 범위는 "리더보드 연동 UI" 다.** planner BF-834 는 `/demo/tetris` 의 leaderboard/scores **API/DB 계약**(§6~§7)만 정의했고, 그 계약을 소비하는 **화면**은 미설계 상태다. 본 문서가 최초로 설계하는 신규 표면은 다음 4가지다:
  1. **점수 제출 흐름의 상태별 UI** — 게임오버 → 닉네임 입력 → **저장중(saving)** → 성공 / **저장실패-재시도(save-failed-retry)**
  2. **리더보드 표시** — `GET /demo/tetris/api/leaderboard` 응답 렌더링(순위/이름/점수/레벨/라인)
  3. **모바일 터치 컨트롤** — 온스크린 D-pad·액션 버튼(기존 키보드 안내는 있으나 터치 입력 수단은 부재)
  4. **접근성 강화** — 상태 변화 aria-live 안내, 색상 단독 의존 제거, reduced-motion, 포커스 가시성 규칙 통합

**전제 3 — 디자인 토큰 SSOT 는 `tetris/styles.css` `:root` 다.** 이 저장소에는 `design-tokens.json` 이 존재하지 않으며(검색 0건), `tetris/` 모듈의 SSOT 는 `tetris/styles.css` 최상단 `:root` 토큰 세트(BF-639 §2 에서 정의)다. 본 문서의 모든 신규 UI 는 **기존 토큰만 재사용**하며 **신규 토큰을 추가하지 않는다**(§2 참고 — AC-3 충족). shadcn/ui 는 `vanilla-static` 프론트엔드에 적용 대상이 아니므로 사용하지 않는다(planner BF-834 §0 가정 2).

**전제 4 — 파일 소유권.** 본 designer task(BF-835)의 담당 파일은 `docs/design/tetris-BF-833.md`(본 문서) 와 `docs/design/mockups/tetris-BF-833.html` **2개뿐**이다. `tetris/*` 코드, `docs/design/tetris-BF-639.md`, `docs/planning/tetris-BF-833.md` 는 **읽기 전용 참조**만 했다. 실제 CSS/HTML/JS 구현은 후속 dev task 가 담당한다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃](#4-레이아웃)
5. [상태별 UI 명세](#5-상태별-ui-명세)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [키보드·터치 컨트롤 명세](#7-키보드터치-컨트롤-명세)
8. [접근성 명세](#8-접근성-명세)
9. [dev 구현 가이드](#9-dev-구현-가이드)
10. [Acceptance Criteria 매핑](#10-acceptance-criteria-매핑)
11. [mockup 참조](#11-mockup-참조)
12. [남은 모호함 (운영자/후속 확인 권장)](#12-남은-모호함-운영자후속-확인-권장)

---

## 1. 시안 개요

### 1.1 변경 범위

| 구분 | 항목 | 상태 |
|---|---|---|
| 재확인(기존) | 10×20 보드, 점수/레벨/라인 HUD, NEXT/HOLD 미리보기 | 기존 유지 — BF-639 명세 참조 |
| 재확인(기존) | 시작 / 플레이 / 일시정지 / 게임오버 오버레이 | 기존 유지 — 게임오버만 §5.4 에서 확장 |
| **신규** | 게임오버 후 **점수 제출 폼**(닉네임 입력) | 본 문서 §5.4 |
| **신규** | **저장중(saving)** 상태 UI | 본 문서 §5.5 |
| **신규** | **저장실패-재시도(save-failed-retry)** 상태 UI | 본 문서 §5.6 |
| **신규** | **리더보드** 패널·화면 | 본 문서 §5.7, §6.7 |
| **신규** | **모바일 터치 컨트롤** | 본 문서 §6.8, §7.2 |
| **신규** | 접근성 규칙 통합(aria-live/not-color-only/reduced-motion/포커스) | 본 문서 §8 |

### 1.2 사용자 경험 목표

- **연속성**: 게임오버 → 점수 제출 → 리더보드 확인이 오버레이 내 단일 흐름으로 끊김 없이 이어진다.
- **신뢰 가능한 피드백**: 저장중/성공/실패가 스피너·아이콘·텍스트·색상의 **다중 채널**로 명확히 전달되고, 실패 시 재시도 경로가 항상 열려 있다(데이터 소실 없음).
- **모바일 플레이 가능성**: 키보드 없이도 터치만으로 이동/회전/드롭/홀드/일시정지가 가능하다.
- **접근성 기본값**: 키보드 사용자·스크린리더 사용자·모션 민감 사용자·저시력 사용자 모두 핵심 정보를 손실 없이 받는다.

### 1.3 비목표 (Out of Scope)

- 게임 로직/규칙·점수 공식·상태 전이 자체(planner BF-834 §3~§5 SSOT) — UI 만 다룸
- API/DB 구현(planner BF-834 §6~§7 계약) — 본 문서는 그 계약을 **소비하는 화면**만 설계
- 점수 위변조 방지·인증(planner BF-834 §9.3, §10)
- 게임오버 시 자동제출 vs 수동제출의 최종 정책 결정 → §12 에서 flag (본 문서는 **수동 제출** 기준으로 설계, 자동제출로 전환 가능하도록 컴포넌트 분리)

---

## 2. 컬러 팔레트

> **신규 토큰 0건.** 아래는 전부 `tetris/styles.css` `:root`(SSOT) 에 이미 정의된 토큰이며, BF-835 신규 UI 는 이 토큰들의 **재사용 매핑**만으로 구성한다. AC-3(신규 토큰 남발 없음) 충족 근거는 §10.

### 2.1 신규 UI 에 재사용하는 기존 토큰

| 용도(BF-835 신규 UI) | 재사용 토큰 | HEX(다크) | 근거 |
|---|---|---|---|
| 리더보드/제출 폼 카드 배경 | `--color-bg-surface` | `#171A21` | 오버레이 모달과 동일 표면 |
| 입력 필드·행 구분 배경 | `--color-bg-subtle` | `#1E222B` | 기존 통계 카드 배경 재사용 |
| 내 순위 하이라이트 행 배경 | `--color-bg-selected` | `#1F2A3D` | 선택 상태 토큰 재사용 |
| 기본 테두리 | `--color-border-default` | `#262B36` | — |
| 입력 포커스·강조 테두리 | `--color-border-strong` | `#3A4150` | — |
| **저장중(pending) 강조** | `--color-accent` | `#5B82F0` | 스피너·진행 표시(파랑=진행 중) |
| **저장 성공 강조** | `--tetro-S`(그린) | `#28C840` | 성공=녹색, 단 색상 단독 금지(§8.3) |
| **저장 실패·재시도 강조** | `--color-danger` | `#E55858` | 실패=적색, 단 색상 단독 금지(§8.3) |
| 1·2·3위 메달 강조 | `--tetro-O`(골드) | `#F5C400` | 기존 신기록 배지와 동일 골드 |
| 순위·점수 수치 | `--color-text-primary` | `#E8E8E4` | — |
| 보조 라벨 | `--color-text-secondary` | `#9A9A93` | — |
| 터치 버튼 배경 | `--color-bg-subtle` | `#1E222B` | — |
| 터치 버튼 활성(active) | `--color-accent` | `#5B82F0` | — |

### 2.2 상태별 강조색 매핑 (색상 + 아이콘 + 텍스트 3중 인코딩)

| 상태 | 색상 토큰 | 아이콘(형태) | 텍스트 | 색상 단독 아님 근거 |
|---|---|---|---|---|
| 저장중 | `--color-accent`(파랑) | 회전 스피너 ◠ | "저장 중…" | 형태(회전)+텍스트 병행 |
| 저장 성공 | `--tetro-S`(녹색) | 체크 ✓ | "리더보드 12위 등록!" | 아이콘+순위 텍스트 병행 |
| 저장 실패 | `--color-danger`(적색) | 경고 ⚠ | "저장 실패 — 다시 시도" | 아이콘+텍스트+재시도 버튼 병행 |

> 라이트 테마: `tetris/styles.css` `[data-theme="light"]` 오버라이드가 이미 존재하며, 위 토큰들이 그대로 스위칭된다. 신규 UI 도 하드코딩 색상 없이 토큰만 쓰므로 테마 전환에 자동 대응한다.

---

## 3. 타이포그래피

> 기존 BF-639 §3 타이포 스케일을 그대로 계승한다(신규 없음). 신규 UI 에서 사용하는 조합만 발췌.

| 역할 | font-family | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| 오버레이 제목 | `--font-sans` | 30px | 800 | 1.2 | GAME OVER / 저장 결과 헤딩 |
| 섹션 헤딩 | `--font-sans` | 16px | 700 | 1.3 | "리더보드", "점수 등록" |
| 리더보드 순위/점수 | `--font-mono` | 15px | 700 | 1.3 | 숫자 정렬 가독성(고정폭) |
| 리더보드 플레이어명 | `--font-sans` | 14px | 500 | 1.3 | 이름 |
| 입력 필드 텍스트 | `--font-sans` | 15px | 500 | 1.4 | 닉네임 입력 |
| 상태 메시지 | `--font-sans` | 13px | 600 | 1.4 | "저장 중…", "저장 실패" |
| 캡션/도움말 | `--font-sans` | 11px | 500 | 1.4 | "1~20자, 한글/영문/숫자" |
| 터치 버튼 라벨 | `--font-mono` | 11px | 700 | 1 | ↺ ↻ ⤓ 등 |

- 숫자(순위·점수·레벨·라인)는 반드시 `--font-mono`(고정폭)로 세로 정렬 흐트러짐 방지.

---

## 4. 레이아웃

### 4.1 전체 구조 (기존 유지 + 신규 삽입 지점)

```
┌─ Topbar (기존) ────────────────────────────── 🌙 테마 │ 🏆 리더보드(신규 버튼) ─┐
│                                                                                  │
│  ┌ hud--left ┐   ┌──── board-wrapper ────┐   ┌ hud--right ┐                       │
│  │ SCORE/BEST │   │  board 10×20          │   │ NEXT        │                       │
│  │ LEVEL      │   │  (+ overlay 겹침)      │   │ SCORE/LEVEL │  (기존 그대로)          │
│  │ LINES      │   │   ├ start             │   │ LINES       │                       │
│  │ HOLD       │   │   ├ pause             │   └─────────────┘                       │
│  │ CONTROLS   │   │   ├ gameover(+제출폼)  │◀── §5.4~§5.6 신규 확장                    │
│  └────────────┘   │   ├ saving  (신규)     │                                          │
│                   │   └ save-failed(신규)  │                                          │
│                   └───────────────────────┘                                          │
│                                                                                       │
│  ┌ 모바일 전용: touch-controls (신규, < 640px) ────────────────────────────────────┐  │
│  │   [◀] [▶]   [↺회전] [⤓하드]   [⏸]                                                │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│  ┌ 리더보드 패널/오버레이 (신규) ─── 순위·이름·점수·레벨·라인 목록 ─────────────────────┐ │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 반응형 브레이크포인트 (기존 계승 + 신규 규칙)

| Breakpoint | 보드 셀 | HUD | 신규 규칙(BF-835) |
|---|---|---|---|
| **Desktop ≥ 960px** | 32px | 좌/우 HUD 모두 표시 | 터치 컨트롤 **숨김**. 리더보드는 오버레이(모달) 또는 우측 확장 패널 |
| **Tablet 640–959px** | 28px | 좌측 HUD 숨김, 우측만 | 터치 컨트롤 숨김(포인터 정밀도 fine 가정). 리더보드 오버레이 |
| **Mobile < 640px** | 22px | 좌/우 HUD 숨김, 상단 `mobile-hud`(점수/레벨/라인) 표시 | **터치 컨트롤 표시**(보드 하단 고정 영역). 리더보드 전체 화면 오버레이 |

- 터치 컨트롤 노출 조건은 **뷰포트 폭 + 포인터 타입** 병행 판정 권장: `@media (max-width: 639px), (pointer: coarse)`. 폭만으로 판단하면 터치 태블릿에서 컨트롤이 누락됨 → §9.3.
- 보드 종횡비는 항상 `1:2`(10:20) 고정. 셀 크기만 스텝 변경하며 grid 비율은 유지(기존 `tetris/styles.css` 반응형 규칙 계승).

### 4.3 신규 요소 spacing

| 요소 | 값(토큰) |
|---|---|
| 제출 폼 입력 필드 높이 | 44px(터치 타겟 최소치, `--space` 기반) |
| 터치 버튼 최소 크기 | 56×56px (WCAG 2.5.5 Target Size 권장 44px 초과) |
| 터치 버튼 간 간격 | `--space-3`(12px) |
| 리더보드 행 높이 | 40px, 세로 패딩 `--space-2` |
| 리더보드 행 간 구분 | `1px solid var(--color-border-default)` |

---

## 5. 상태별 UI 명세

> 화면 상태는 기존 `body[data-status]`(start/playing/paused/gameover) 를 계승하고, BF-835 는 게임오버 **하위 제출 서브상태**를 추가한다. 제출 서브상태는 게임오버 오버레이 내부에서 전환되며 별도 top-level status 를 만들지 않는다(상태 폭발 방지 — Simplicity First).

```
게임오버 오버레이 내부 서브상태 머신 (data-submit 속성)
  idle ──[닉네임 입력 후 '등록' 클릭]──▶ saving
  saving ──[201 성공]──▶ success (리더보드 순위 표시)
  saving ──[네트워크/5xx 실패]──▶ error
  error  ──['다시 시도' 클릭]──▶ saving
  error  ──['나중에' 클릭]──▶ idle (제출 없이 종료 가능)
```

### 5.1 상태 ①: 시작 (start) — 기존 유지

- 기존 `#overlay-start` 그대로. 변경점: 하단에 **"🏆 리더보드 보기"** 보조 버튼 1개 추가(게임 시작 없이도 리더보드 열람 가능). 나머지 동일.

### 5.2 상태 ②: 플레이 (playing) — 기존 유지 + 모바일 터치 컨트롤

- 보드/HUD/미리보기 기존 유지. 모바일(< 640px)에서만 보드 하단에 **터치 컨트롤**(§6.8) 노출.

### 5.3 상태 ③: 일시정지 (paused) — 기존 유지

- 기존 `#overlay-pause` 그대로(계속하기/다시 시작/메뉴로). 변경 없음.

### 5.4 상태 ④: 게임오버 (gameover) — 제출 폼 확장

기존 게임오버 오버레이(점수/베스트/레벨/라인 통계 + 신기록 배지)를 유지하되, **점수 제출 폼**을 통계 카드와 액션 버튼 사이에 삽입한다.

**구성(위→아래):**
1. 아이콘 💀 + "GAME OVER" 제목 (기존)
2. 통계 카드: SCORE / BEST / LEVEL / LINES (기존)
3. 신기록 배지 🏆(해당 시) (기존)
4. **[신규] 점수 제출 폼** (서브상태 = `idle`):
   - 라벨: "리더보드에 점수 등록"
   - 닉네임 `<input>` (placeholder "닉네임 (1~20자)", `maxlength=20`)
   - 도움말 캡션: "한글/영문/숫자·공백·`_`·`-` 만 사용" (planner §6.2 패턴과 일치)
   - 인라인 검증 메시지 영역(빈 값/패턴 위반 시)
   - 버튼: **"등록"**(primary) / **"나중에"**(secondary — 제출 없이 접기)
5. 액션 버튼: "▶ 새 게임" / "↩ 메뉴로" (기존)

**검증 규칙(클라이언트 1차, planner §6.2 계약과 일치):**
- trim 후 1~20자, 패턴 `/^[\p{L}\p{N} _-]{1,20}$/u`
- 위반 시 `등록` 비활성 + 입력 하단 적색 메시지("닉네임을 1~20자로 입력하세요") + `aria-invalid="true"`

### 5.5 상태 ⑤: 저장중 (saving) — 신규

- 제출 폼 영역이 **저장중 카드**로 치환(폼 필드 숨김, 오버레이 자체는 유지):
  - 회전 스피너(아이콘, `--color-accent`) + "저장 중…" 텍스트
  - 입력값(닉네임) 읽기전용 요약 표시
  - "등록"/"나중에" 버튼 비활성(중복 제출 방지, `disabled` + `aria-busy="true"`)
- `aria-live="polite"` 영역에 "점수를 저장하고 있습니다" 안내(§8.2).
- 스피너 애니메이션은 reduced-motion 시 정지형 대체(§8.4).

### 5.6 상태 ⑥: 저장실패-재시도 (save-failed-retry) — 신규

- 저장중 카드가 **실패 카드**로 전환:
  - 경고 아이콘 ⚠(`--color-danger`) + "저장 실패" 헤딩
  - 원인 문구(사용자 친화): "네트워크 문제로 점수를 저장하지 못했어요. 점수는 사라지지 않았습니다." → **데이터 소실 없음 보장** 명시(planner §9.5 리스크 완화)
  - 버튼: **"다시 시도"**(primary, `--color-danger` 계열 아님 → 재시도는 accent 유지로 진행 액션 성격 표현) / **"나중에"**(secondary)
  - `role="alert"` + `aria-live="assertive"` 로 즉시 안내(§8.2)
- "다시 시도" → 서브상태 `saving` 으로 복귀. 실패 반복해도 항상 재시도 가능(무한 재시도 허용, 지수 백오프는 dev 재량 — §9.4).

### 5.7 리더보드 표시 — 신규

- **진입점**: Topbar 🏆 버튼 / 시작 오버레이 "리더보드 보기" / 저장 성공 후 "리더보드 보기".
- **형태**: Desktop/Tablet = 중앙 모달 오버레이, Mobile = 전체 화면 오버레이.
- **구성**:
  - 헤딩 "🏆 리더보드" + 닫기 버튼(✕, `aria-label="리더보드 닫기"`)
  - 컬럼 헤더: 순위 / 플레이어 / 점수 / 레벨 / 라인 (planner §6.3 응답 필드)
  - 행 목록: 상위 10개(기본 `limit=10`), 1·2·3위는 골드/실버/브론즈 메달 아이콘 + 색상(색상 단독 아님 — 순위 숫자 병기)
  - **내 순위 하이라이트**: 방금 제출한 레코드 행에 `--color-bg-selected` 배경 + "나" 배지(§8.3 색상 단독 금지 → 배지 텍스트 병행)
  - 빈 상태: "아직 기록이 없습니다. 첫 기록의 주인공이 되어보세요!" (empty state)
  - 로딩 상태: 스켈레톤 행 3개(reduced-motion 시 정적)
  - 에러 상태: "리더보드를 불러오지 못했습니다" + "다시 시도"
  - 페이지네이션: "더 보기"(offset 증가, planner §6.3 `limit`/`offset` 계약) — 선택 구현

---

## 6. 컴포넌트 명세

> props 는 vanilla-static 이므로 "DOM 속성/데이터 속성 + 상태 클래스" 형태로 표기(React props 아님). dev 는 이를 DOM 조작 기준으로 사용.

### 6.1 GameOverOverlay (확장)

| 항목 | 명세 |
|---|---|
| 루트 | `#overlay-gameover` (기존) |
| 서브상태 속성 | `data-submit="idle｜saving｜success｜error"` (신규) |
| 자식(신규) | `.score-submit`(폼), `.save-status`(저장중/성공/실패 카드) |
| 인터랙션 | 등록 클릭 → `saving`; 성공 → `success`; 실패 → `error` |

### 6.2 ScoreSubmitForm (신규)

| props(data/attr) | 상태 | 인터랙션 |
|---|---|---|
| `#nickname-input`(input, maxlength=20, aria-label="닉네임") | 유효/무효(`aria-invalid`) | 입력 시 실시간 검증, Enter=등록 |
| `#btn-submit-score`(등록, primary) | enabled/disabled | 클릭 → saving |
| `#btn-submit-later`(나중에, secondary) | — | 클릭 → 폼 접기(idle 종료) |
| `.field-error`(검증 메시지) | 표시/숨김 | `role="alert"` |

### 6.3 SaveStatusCard (신규)

| 서브상태 | 아이콘 | 색상 토큰 | 텍스트 | 버튼 |
|---|---|---|---|---|
| saving | 스피너 ◠ | `--color-accent` | "저장 중…" | (없음, 취소 불가) |
| success | ✓ | `--tetro-S` | "리더보드 N위 등록!" | "리더보드 보기" / "새 게임" |
| error | ⚠ | `--color-danger` | "저장 실패 — 점수는 유지됨" | "다시 시도" / "나중에" |

- 상태 전이는 `data-submit` 값에 따라 표시 카드 스위칭(하나만 노출).
- `aria-live`: saving/success=`polite`, error=`assertive`(§8.2).

### 6.4 LeaderboardPanel (신규)

| 항목 | 명세 |
|---|---|
| 루트 | `#overlay-leaderboard`, `role="dialog"`, `aria-modal="true"`, `aria-label="리더보드"` |
| 상태 속성 | `data-lb-state="loading｜loaded｜empty｜error"` |
| 행 | `.lb-row`, 내 기록은 `.lb-row--me` + "나" 배지 |
| 메달 | `.lb-rank[data-medal="gold｜silver｜bronze"]` + 순위 숫자 병기 |
| 닫기 | `#btn-lb-close`, `aria-label="리더보드 닫기"`, Esc 로도 닫힘 |

### 6.5 LeaderboardRow (신규)

| 컬럼 | 소스(planner §6.3) | 스타일 |
|---|---|---|
| 순위 | `rank` | mono, 메달 시 골드/실버/브론즈 + 아이콘 |
| 플레이어 | `playerName` | sans, ellipsis(넘침 시 …) |
| 점수 | `score` | mono, 우측 정렬 |
| 레벨 | `level` | mono, 보조색 |
| 라인 | `lines` | mono, 보조색 |

### 6.6 TopbarLeaderboardButton (신규)

- `#btn-open-leaderboard`, `.btn-icon`(기존 아이콘 버튼 스타일 재사용), `aria-label="리더보드 열기"`, 아이콘 🏆.

### 6.7 리더보드 데이터 매핑 (계약 준수)

| UI 요소 | API 필드(planner §6.3) |
|---|---|
| 순위 컬럼 | `items[].rank` |
| 플레이어 컬럼 | `items[].playerName` |
| 점수 컬럼 | `items[].score` |
| 레벨 컬럼 | `items[].level` |
| 라인 컬럼 | `items[].lines` |
| "더 보기" | `total`, `limit`, `offset` |
| 제출 후 내 순위 | `POST` 응답 `rank`(planner §6.2) |

### 6.8 TouchControls (신규)

| 버튼 | 아이콘 | 매핑 동작 | 대응 키(§7.1) | aria-label |
|---|---|---|---|---|
| 좌 이동 | ◀ | `movePiece(-1)` | ← | "왼쪽으로 이동" |
| 우 이동 | ▶ | `movePiece(+1)` | → | "오른쪽으로 이동" |
| 소프트 드롭 | ▼ | `softDrop` | ↓/S | "소프트 드롭" |
| 회전(CW) | ↻ | `tryRotate(cw)` | ↑/W | "시계방향 회전" |
| 하드 드롭 | ⤓ | `hardDrop` | Space | "하드 드롭" |
| 홀드 | ⇄ | `hold` | C | "홀드" |
| 일시정지 | ⏸ | pause 토글 | P/Esc | "일시정지" |

- 배치: 보드 하단 고정 영역. 좌측=방향(◀▶▼), 우측=액션(↻ ⤓ ⇄), 별도 ⏸.
- 좌/우 이동은 **press-and-hold 반복** 지원 권장(auto-repeat, dev §9.4). 회전/하드드롭/홀드는 단발 tap.
- 최소 타겟 56×56px, 활성(active) 시 `--color-accent` 배경 + `transform: scale(0.95)`.
- `touch-action: manipulation` 으로 더블탭 줌 방지, `user-select: none`.

---

## 7. 키보드·터치 컨트롤 명세

### 7.1 키보드 매핑 (기존 계승 — planner §5.2 트리거와 정합)

| 키 | 동작 | 활성 상태 |
|---|---|---|
| ← / → | 좌/우 이동 | playing |
| ↓ / S | 소프트 드롭(+1점/성공 시) | playing |
| ↑ / W | 시계방향 회전 | playing |
| Z | 반시계 회전 | playing |
| Space | 하드 드롭(cellsDropped×2점) / 시작화면에서 게임 시작 | playing / start |
| C | 홀드 | playing |
| P / Esc | 일시정지 ↔ 재개 | playing ↔ paused |
| R | 재시작 | paused / gameover |
| Enter | 게임 시작 / 제출 폼에서 등록 | start / gameover(폼 포커스 시) |
| Esc | 리더보드/오버레이 닫기 | 리더보드 열림 시 |

- 게임오버 제출 폼에 포커스가 있을 때는 게임 단축키(R 등)가 입력 필드 타이핑을 가로채지 않도록 **입력 필드 내에서는 게임 키 핸들러 무시**(§9.4 — `e.target` 이 input 이면 return).

### 7.2 터치 컨트롤 (신규 — §6.8 컴포넌트의 인터랙션 규칙)

- 노출: `@media (max-width: 639px), (pointer: coarse)`.
- 제스처(선택, dev 재량): 보드 스와이프 좌/우=이동, 아래 스와이프=하드드롭, 탭=회전. **단 온스크린 버튼이 1차 수단**이며 제스처는 보조(제스처만으로는 발견성 낮음).
- 모든 터치 버튼은 키보드 동작과 **1:1 동일 함수 호출** — 입력 수단 간 로직 분기 없음(단일 command 디스패처 권장, §9.4).

---

## 8. 접근성 명세

### 8.1 포커스 가시성

- 모든 상호작용 요소(`button`, `input`, 닫기)는 `:focus-visible` 시 `outline: 2px solid var(--color-accent); outline-offset: 2px`(기존 `.btn:focus-visible` 규칙을 신규 요소에도 적용).
- 오버레이(게임오버 제출 폼 / 리더보드) 열림 시 **포커스 트랩**: Tab 이 오버레이 내부에서 순환, 첫 포커스는 논리적 시작(제출 폼=닉네임 입력, 리더보드=닫기 버튼).
- 오버레이 닫힘 시 포커스를 **트리거 요소로 복귀**(예: 🏆 버튼).

### 8.2 스크린리더 · aria-live

| 이벤트 | 라이브 영역 | politeness |
|---|---|---|
| 저장 중 진입 | `.save-status` | `aria-live="polite"` + `aria-busy="true"` |
| 저장 성공(순위) | `.save-status` | `aria-live="polite"` ("리더보드 12위 등록") |
| 저장 실패 | `.save-status` | `role="alert"` / `aria-live="assertive"` |
| 게임오버 진입 | 오버레이 | `role="dialog"` + 제목 연결(`aria-labelledby`) |
| 레벨업/라인클리어(기존) | HUD 보조 라이브 영역(선택) | `aria-live="polite"` |

- 리더보드 목록은 `role="table"` 또는 시맨틱 `<table>` 권장(순위/이름/점수 컬럼 헤더 `<th scope="col">`).
- 보드는 기존대로 `role="img" aria-label="테트리스 게임 보드"`(셀 단위 낭독은 과다 → 요약 라벨 유지).

### 8.3 색상 단독 의존 금지 (WCAG 1.4.1)

| 정보 | 색상 | 병행 채널(필수) |
|---|---|---|
| 저장중/성공/실패 | 파랑/녹색/적색 | 아이콘(스피너/✓/⚠) + 텍스트 |
| 리더보드 1·2·3위 | 골드/실버/브론즈 | 메달 아이콘 + 순위 숫자 |
| 내 순위 행 | `--color-bg-selected` | "나" 텍스트 배지 |
| 검증 오류 | 적색 테두리 | `aria-invalid` + 텍스트 메시지 |
| 속도 인디케이터(기존) | 녹/황/적 | 레벨 숫자 병기(기존 유지) |
| 테트로미노 7색(기존) | 7색 | 형태(shape)로도 구분 가능(기존 유지) |

### 8.4 모션 감소 (prefers-reduced-motion)

```css
@media (prefers-reduced-motion: reduce) {
  /* 스피너 회전 정지 → 정적 "저장 중…" 텍스트 + 점 애니메이션 없이 */
  .spinner { animation: none; }
  /* 점수 팝업/셀 플래시/스케일 범프 최소화 (기존 애니메이션 무력화) */
  .score-popup, .board-cell[data-state="flash"], .hud-value.score-bump,
  .new-record-badge, .overlay { animation: none !important; transition: none !important; }
}
```

- 라인 클리어 플래시(180ms)·점수 팝업·오버레이 페이드는 reduced-motion 시 즉시 전환(정보는 유지, 모션만 제거).
- 저장중 스피너는 **정적 아이콘 + 텍스트**로 대체하여 진행 상태를 모션 없이 전달.

### 8.5 터치 타겟

- 모든 터치 버튼 ≥ 56×56px(WCAG 2.5.5 AAA 초과), 인접 버튼 간 간격 ≥ 8px.
- 제출 폼 입력·버튼 높이 ≥ 44px.

---

## 9. dev 구현 가이드

> dev-1 이 따라할 단계별 지침. **픽셀 단위 mockup 일치 의무 없음** — 토큰/구조/접근성 규칙 준수가 핵심.

### 9.1 파일 영향 범위 (기존 모듈 확장)

| 파일 | 변경 성격 |
|---|---|
| `tetris/index.html` | 게임오버 오버레이에 제출 폼/상태 카드 마크업 추가, 리더보드 오버레이 신규, 터치 컨트롤 신규, Topbar 🏆 버튼 추가 |
| `tetris/styles.css` | 신규 컴포넌트 클래스 추가(**기존 `:root` 토큰만 사용**, 신규 토큰 정의 금지), reduced-motion 미디어쿼리 확장 |
| `tetris/main.js` | 제출 서브상태 머신, fetch(`POST /scores`,`GET /leaderboard`), 터치 command 디스패처, 포커스 트랩 |
| (신규, 선택) `tetris/leaderboard.js` | 리더보드 fetch/렌더 분리 모듈 |

- 백엔드 `/demo/tetris/api/*` 는 planner BF-834 §6~§7 계약을 별도 dev task 가 구현. 프론트는 그 계약대로 호출만 한다.

### 9.2 CSS 클래스/변수 권장

- 신규 클래스(BEM 유사, 기존 컨벤션 계승): `.score-submit`, `.score-submit__input`, `.field-error`, `.save-status`, `.save-status--saving/--success/--error`, `.spinner`, `.leaderboard`, `.lb-row`, `.lb-row--me`, `.lb-rank[data-medal]`, `.touch-controls`, `.touch-btn`.
- **금지**: `#RRGGBB` 하드코딩 색상. 반드시 `var(--color-*)` / `var(--tetro-*)`.
- 상태 스위칭은 클래스 토글 대신 `data-submit` / `data-lb-state` 속성 + CSS 속성 선택자 권장(기존 `data-status`/`data-piece` 패턴 계승).

### 9.3 반응형/터치 노출

- 터치 컨트롤: `@media (max-width: 639px), (pointer: coarse) { .touch-controls { display: grid; } }` — 폭 단독 판정 금지(터치 태블릿 누락 방지).
- 데스크톱(`pointer: fine`, ≥640px)에서는 `display: none`.

### 9.4 상태/입력 처리

1. **단일 command 디스패처**: `dispatch('moveLeft'|'rotateCW'|'hardDrop'|...)` 하나를 키보드 핸들러·터치 핸들러가 공유 호출(로직 분기 없음).
2. **입력 필드 가드**: `keydown` 핸들러 최상단에서 `if (e.target.matches('input')) return` — 닉네임 타이핑이 게임 단축키로 새지 않도록.
3. **저장 흐름**: `POST /scores` → 성공(201)이면 응답 `rank` 로 성공 카드, 실패(네트워크/4xx/5xx)면 error 카드. 4xx(검증)는 필드 에러로 폼 복귀, 5xx/네트워크는 재시도 카드.
4. **재시도**: error → "다시 시도" → 동일 payload 재전송. 백오프는 선택(즉시 재시도로 충분).
5. **중복 제출 방지**: saving 중 버튼 `disabled`.
6. **포커스 트랩/복귀**: 오버레이 open 시 첫 요소 포커스, close 시 트리거로 복귀.
7. **터치 auto-repeat**: 좌/우 이동은 `pointerdown` 후 setInterval, `pointerup/leave` 에서 clear.

### 9.5 기존 요소 보존 (Surgical Changes)

- 기존 보드/HUD/미리보기/시작·일시정지 오버레이/테마 토글/키보드 안내 패널의 **마크업·클래스·id 를 변경하지 않는다**. BF-835 는 **추가**만 한다.
- 기존 `localStorage["tetris:highScore"]`(BEST) 로직 유지 — 서버 리더보드와 별개(planner §4.5, §10).

---

## 10. Acceptance Criteria 매핑

| BF-835 AC | 충족 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세를 작성하면, Then 데스크톱/모바일 반응형 화면과 5개 상태별 UI 가 mockup 으로 시각화된다 | §4.2 반응형(Desktop/Tablet/Mobile) + §5 상태(시작/플레이/일시정지/게임오버/**저장중**/**저장실패-재시도**) + mockup HTML §11 이 각 상태를 `<section>` 으로 시각화 |
| Given 접근성 요구, When 인터랙션을 명세하면, Then 키보드(이동/회전/드롭/일시정지)·모바일 터치 컨트롤·aria-label·포커스·reduced-motion 규칙이 명시된다 | §7.1 키보드 매핑 + §7.2·§6.8 터치 컨트롤 + §8.1 포커스 + §8.2 aria-label/live + §8.4 reduced-motion + §8.3 색상 단독 금지 |
| Given 기존 디자인 토큰 SSOT, When 스타일을 정의하면, Then 신규 토큰 남발 없이 공용 규칙을 준수함이 명세에 표기된다 | §0 전제 3 + §2 "신규 토큰 0건" 명시(전부 `tetris/styles.css` `:root` 재사용) + §9.2 하드코딩 색상 금지 |

---

## 11. mockup 참조

- **파일**: `docs/design/mockups/tetris-BF-833.html`
- **내용**: 단일 self-contained HTML. `<section>` 으로 구분하여 다음을 시각화:
  1. 데스크톱 레이아웃(보드 + 좌/우 HUD)
  2. 게임오버 + 점수 제출 폼(idle)
  3. 저장중(saving) 카드
  4. 저장실패-재시도(error) 카드 + 저장성공(success) 카드
  5. 리더보드 오버레이(메달·내 순위 하이라이트·빈/에러 상태)
  6. 모바일 레이아웃 + 터치 컨트롤
  7. 접근성 참고(포커스 링·색상+아이콘 이중 인코딩 데모)
- 명세 §2 토큰을 `:root` 에 그대로 복제(시각 동기화). dev 실제 산출물 아님 — 시안 시각화 전용.

---

## 12. 남은 모호함 (운영자/후속 확인 권장)

1. **제출 트리거 정책(자동 vs 수동)**: planner §12.2 에서 미결. 본 명세는 **수동 제출(닉네임 입력 후 '등록')** 기준으로 설계했다. 자동 제출(게임오버 즉시 백그라운드 전송)로 정하면 §5.4 폼을 "결과 표시 + 재전송" 형태로 축소하면 되며, 컴포넌트(SaveStatusCard)는 그대로 재사용 가능하도록 분리해 두었다.
2. **닉네임 기억**: 재플레이 시 직전 닉네임을 `localStorage` 에 기억해 프리필할지 여부(UX 편의) — 미결. 기본은 매번 재입력.
3. **리더보드 진입 형태**: Desktop 에서 모달 vs 상시 우측 확장 패널 — 본 명세는 모달 기준. 상시 패널을 원하면 §4.1 우측 영역 확장.
4. **오프라인/저장 보류 큐**: 저장 실패가 반복될 때 로컬 큐에 보관 후 재접속 시 자동 전송할지 — 데모 범위상 즉시 재시도만 설계. 필요 시 후속 확장.

<!-- bf:pr-summary -->
## 시안 요약 (BF-835)

기존 `tetris/`(vanilla-static) 게임 UI 위에 **`/demo/tetris` 리더보드 연동 UI** 를 추가 설계했습니다. 게임 로직/기존 화면은 재발명하지 않고(BF-639 계승), 신규 표면만 명세했습니다.

**신규 설계 표면**
- 게임오버 → 닉네임 **점수 제출 폼** → **저장중** → **성공 / 저장실패-재시도** 서브상태 머신
- **리더보드** 표시(순위/이름/점수/레벨/라인, 메달, 내 순위 하이라이트, 빈/로딩/에러 상태)
- **모바일 터치 컨트롤**(이동/회전/드롭/홀드/일시정지, 56×56 타겟)
- **접근성**: 포커스 트랩·가시성, aria-live(polite/assertive), 색상 단독 금지(아이콘+텍스트 병행), reduced-motion

**토큰 매핑 (신규 토큰 0건 — 전부 `tetris/styles.css` `:root` SSOT 재사용)**

| 신규 UI 용도 | 재사용 토큰 |
|---|---|
| 저장중(진행) | `--color-accent` |
| 저장 성공 | `--tetro-S` |
| 저장 실패/재시도 | `--color-danger` |
| 메달 1위 | `--tetro-O` |
| 내 순위 행 | `--color-bg-selected` |
| 카드/입력 배경 | `--color-bg-surface` / `--color-bg-subtle` |

**AC 충족**: 반응형+6상태 mockup 시각화 / 키보드·터치·aria·포커스·reduced-motion 명시 / 신규 토큰 남발 없음 표기.

산출물: `docs/design/tetris-BF-833.md`, `docs/design/mockups/tetris-BF-833.html`

## Self-critique
- **AC 매핑**: 3개 AC 전부 §10 표에서 근거 매핑 완료(반응형·6상태·접근성·토큰 SSOT).
- **dev 구현 가이드**: §9 에 파일 영향 범위·클래스/변수명·단일 command 디스패처·저장 흐름·포커스 트랩·터치 노출 조건까지 단계별 제공.
- **기존 요소 보존**: §9.5 에서 기존 마크업/클래스/id/localStorage 불변 + 추가만 명시(Surgical Changes). 기존 BF-639 컴포넌트 재확인.
- **컴포넌트 매핑**: §6 에서 신규 컴포넌트별 DOM 속성·서브상태·인터랙션, §6.7 에서 리더보드↔API 필드(planner §6.3) 1:1 매핑.
- **모호함 flag**: §12 에 제출 트리거(자동/수동)·닉네임 기억·리더보드 진입 형태·오프라인 큐 4건 flag. 수동 제출 기준 설계 + 자동 전환 가능하도록 컴포넌트 분리.
- **잔여 리스크**: 백엔드 API(`/demo/tetris/api/*`)는 미구현 계약이라 프론트는 mock 응답으로 상태 UI 검증 필요(§9.1). dev 착수 시 API dev task 완료 여부 확인 권장.
<!-- /bf:pr-summary -->
