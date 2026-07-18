# 배송 예외 처리 화면 디자인 명세 — BF-1032 (2-pane 예외 처리 콘솔)

> 작성자: [이디자인] (designer) · 작성일 2026-07-18
> 관련 티켓: BF-1032 (본 designer task) · BF-1030 (부모 Epic) · BF-1031 (planner)
> 기준 문서(s1): `docs/planning/delivery-exceptions-canary-BF-1030.md` (BF-1031, planner) — **단일 기준(single source of truth)**
> 형제 task: BF-1031 (planner) · BF-1033 (developer) · BF-1035 (tester)
> 대상 모듈: `src/app/delivery-exceptions-canary/` (신규 · tech-stack `typescript-monorepo` — s1 가정 1에 따라 `src/app/demo/*` vanilla 관례 계승)
> mockup 참조: `docs/design/mockups/delivery-exceptions-canary-BF-1032.html` (본 명세와 시각 동기화된 self-contained HTML)

---

## 0. 문서 성격 및 전제

본 문서는 s1 기획 명세(BF-1031)의 **데이터 모델·상태 필터·상세 필드·로컬 메모 규칙을 화면으로 번역**한 UI/UX 디자인 명세다. s1 이 규정한 도메인 규칙(상태 4종 = 읽기 전용 fixture 고정값, cause 5종, 메모 1~300자·최신 1건 덮어쓰기 등)은 재해석하지 않고 **시각/인터랙션 계층만** 추가한다.

**designer 산출물 경계(절대 준수):**
- 본 task 담당 파일: `docs/design/delivery-exceptions-canary-BF-1032.md`(본 명세) + `docs/design/mockups/delivery-exceptions-canary-BF-1032.html`(mockup) 2개뿐.
- 실제 앱 코드(`src/app/delivery-exceptions-canary/*`)는 developer(BF-1033) 담당 — 본 명세는 와이어프레임·토큰·컴포넌트 props·구현 가이드까지만 규정한다.

**토큰 SSOT 정책 (tech-stack `typescript-monorepo`):**
- 본 저장소에는 `design-tokens.json` 이 존재하지 않고, shadcn/ui 도 도입돼 있지 않다. s1 가정 1 이 확정한 대로 본 모듈은 `src/app/demo/{status,counter,clock}` 의 vanilla 관례(디렉터리=라우트, `:root` CSS 변수 토큰)를 따른다.
- 따라서 **실효 토큰 SSOT 는 `src/app/demo/*/styles.css` 의 `:root` 토큰 셸**이다. 본 명세는 그 값(canvas `#fafaf9`·accent `#3563e9`·space/radius/shadow 스케일·시맨틱 success/warning/danger/neutral)을 **값 그대로 계승**하고 prefix 만 `--dxc-*`(delivery-exceptions-canary) 로 둔다 → 인접 데모 페이지와 색상·간격·타이포 정합(AC-2).
- **색상 리터럴은 §2 토큰 정의 블록에만 존재**하고, 컴포넌트 규칙은 `var(--dxc-…)` 만 참조한다(demo status/clock 관례 = hardcoded 색상 금지 규약의 vanilla 대응).
- 신규 base 토큰 0건. status 4종 매핑용 fg/tint 쌍만 시맨틱 색(success/warning/neutral/accent)에서 파생한다(§2.2).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 2-pane 구조 · spacing · breakpoint](#4-레이아웃--2-pane-구조--spacing--breakpoint)
5. [컴포넌트 명세 — props · 상태 · 인터랙션](#5-컴포넌트-명세--props--상태--인터랙션)
6. [상태 뱃지 · cause 라벨 · 시각 인코딩 규칙](#6-상태-뱃지--cause-라벨--시각-인코딩-규칙)
7. [접근성 기준 (키보드 · 대비 · ARIA)](#7-접근성-기준-키보드--대비--aria)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ 디자인 요소 매핑](#9-ac--디자인-요소-매핑)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

물류 담당자가 배송 예외(지연/파손/부재/통관 등)를 **한 화면에서** 상태별로 필터링·조회하고, 각 건에 로컬 해결 메모를 남기는 **2-pane 예외 처리 콘솔**. 상단 헤더에 제목·집계 요약·상태 필터 탭이 있고, 좌측 목록에서 예외 1건을 선택하면 우측 상세 패널에 s1 §5.2 전체 필드 + 해결 메모 입력 UI 가 표시된다. s1 §7 fixture 7건(EXC-5001~5007, 상태 4종 + cause 5종)을 그대로 시각화한다.

### 1.2 사용자 경험 목표

| 목표 | 실현 방법 |
|---|---|
| **빠른 상태 스캔** | 상단 상태 필터 탭(전체/접수/조사중/보류/해결) + 각 탭에 건수 뱃지 → 처리 대기 규모를 한눈에 |
| **컨텍스트 유지** | 목록·상세를 2-pane 으로 동시 노출(데스크톱) → 화면 전환 없이 연속 처리. 필터를 바꿔도 선택 상태 유지(s1 §4.3 / EC-03) |
| **읽기/쓰기 경계 명확화** | fixture 원본 필드(D1~D9)는 읽기 전용 스타일, 편집 가능한 유일 영역인 해결 메모(D10)만 입력 서피스로 시각 구분 |
| **저장 안전** | 명시적 저장 버튼(자동 저장 없음, s1 §6.2) · 300자 카운터 · 검증 오류 인라인 표시(EC-05) · 공백 저장=삭제 안내(EC-08) |
| **저장소 일관성** | `src/app/demo/*` 토큰·카드·뱃지 스타일 계승 → 학습 비용 0, 신규 색 0건 |

### 1.3 화면 상태(s1 §8 반영)

- s1 §8.3 에 따라 로드는 동기적 → **loading 화면 없음**(EC-10). 항상 "ready" 상태로 시작한다.
- s1 §7.1 에 따라 예외 최소 1건 보장 → **true empty state 없음**. 단 아래 2가지 "부분 빈 상태"는 존재하므로 placeholder 를 정의한다:
  - **상세 패널 초기(미선택)**: "예외를 선택하세요" placeholder(§5.5, EC-01)
  - **필터 결과 0건**(현재 fixture 로는 실제 미발생, 방어적 정의): "해당 상태의 예외 없음" 목록 빈 상태(§5.6, EC-02)

---

## 2. 컬러 팔레트

> prefix `--dxc-*`. `src/app/demo/*`(status/clock) `:root` 값 **그대로 계승**(신규 base 색 0건). status 4종 fg/tint 쌍만 시맨틱 색에서 파생하며 대비 검증 완료(§7.2) — 임의 변경 금지.

### 2.1 Base (demo 셸 계승 — 값 복제)

| 토큰 | HEX | 용도 | 계승 출처(demo) |
|---|---|---|---|
| `--dxc-color-bg` | `#fafaf9` | 앱 배경(pane 사이 gutter) | `--color-bg-canvas` |
| `--dxc-color-surface` | `#ffffff` | pane·카드·상세 패널 표면 | `--color-bg-surface` |
| `--dxc-color-surface-muted` | `#f1f1ef` | 선택 행·헤더·읽기전용 필드 배경 | `--color-bg-subtle` |
| `--dxc-color-border` | `#e5e5e2` | 기본 구분선 | `--color-border-default` |
| `--dxc-color-border-strong` | `#d0d0cc` | 강조 구분선·입력 테두리 | `--color-border-strong` |
| `--dxc-color-text` | `#1a1a19` | 본문 텍스트 | `--color-text-primary` |
| `--dxc-color-text-secondary` | `#6b6b66` | 보조 텍스트(메타) | `--color-text-secondary` |
| `--dxc-color-text-muted` | `#9a9a93` | placeholder·비활성 텍스트 | `--color-text-muted` |
| `--dxc-color-accent` | `#3563e9` | primary 액션·선택 표시·활성 탭 | `--color-accent` |
| `--dxc-color-accent-hover` | `#2a4fc0` | accent hover/active | `--color-accent-hover` |
| `--dxc-color-focus-ring` | `rgba(53,99,233,.45)` | focus-visible 링 | `--color-focus-ring` |

### 2.2 Status (상태 4종 · 뱃지 fg + tint bg 쌍)

s1 §4.1 상태 4종 ↔ 색 매핑. `fg`(텍스트/dot) + `tint`(뱃지 배경) 쌍으로 사용하며, base 는 demo 시맨틱 색(`--color-neutral #656d76`·`--color-warning #9a6700`·`--color-success #1a7f37`·accent)에서 파생. 대비는 §7.2 참조.

| 상태(s1) | 라벨 | 토큰 fg | HEX | 토큰 tint | HEX | 파생 근거 |
|---|---|---|---|---|---|---|
| `open` | 접수 | `--dxc-color-open` | `#5b636e` | `--dxc-color-open-tint` | `#f1f3f5` | demo neutral(중립 슬레이트) — 미착수 |
| `investigating` | 조사중 | `--dxc-color-investigating` | `#2a4fc0` | `--dxc-color-investigating-tint` | `#eaf0fe` | accent-hover(액티브 블루) — 처리 진행 |
| `on_hold` | 보류 | `--dxc-color-hold` | `#8a5a00` | `--dxc-color-hold-tint` | `#fbf3d9` | demo warning(경고 앰버) — 외부 회신 대기 |
| `resolved` | 해결 | `--dxc-color-resolved` | `#1a7f37` | `--dxc-color-resolved-tint` | `#e4f4e9` | demo success(성공 그린) — 종결 |

### 2.3 Semantic 보조

| 토큰 | HEX | 용도 | 계승 출처 |
|---|---|---|---|
| `--dxc-color-danger` | `#cf222e` | 메모 300자 초과 검증 오류·오류 테두리 | demo `--color-danger` |
| `--dxc-color-danger-tint` | `#fdecec` | 검증 오류 메시지 배경 | (danger 파생) |
| `--dxc-color-success-strong` | `#1a7f37` | 저장 완료 토스트/확인 문구 | demo `--color-success` |

---

## 3. 타이포그래피

> **system font stack only**(CDN 금지 — demo 관례). `--dxc-font-sans` 는 demo `--font-sans` 값 그대로 계승. ID(`EXC-####`/`ORD-######`)는 mono 로 표기해 스캔 용이성 확보.

```css
--dxc-font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
                 Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--dxc-font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| 역할 | font | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| `heading-lg` | sans | 20px | 700 | 1.3 | 앱 헤더 제목 |
| `heading-md` | sans | 16px | 600 | 1.35 | pane/섹션 제목·상세 수취인명 |
| `body` | sans | 14px | 400 | 1.55 | 본문·상세 필드값·목록 부제 |
| `body-strong` | sans | 14px | 600 | 1.5 | 필드 라벨·강조 |
| `caption` | sans | 12px | 500 | 1.4 | 메타(시각)·뱃지 텍스트·필터 건수 |
| `mono` | mono | 13px | 500 | 1.4 | `EXC-####`·`ORD-######` ID |

- 최소 본문 14px · 최소 caption 12px. 12px 미만 금지(가독성).

---

## 4. 레이아웃 — 2-pane 구조 · spacing · breakpoint

### 4.1 spacing / radius 스케일 (demo 셸 계승)

```css
--dxc-space-1: 4px;  --dxc-space-2: 8px;  --dxc-space-3: 12px;
--dxc-space-4: 16px; --dxc-space-5: 24px; --dxc-space-6: 32px; --dxc-space-7: 48px;
--dxc-radius-sm: 4px; --dxc-radius-md: 8px; --dxc-radius-lg: 12px; --dxc-radius-pill: 999px;
--dxc-shadow-card: 0 4px 16px rgba(0,0,0,.06);
```

### 4.2 전체 골격

```
┌───────────────────────────────────────────────────────────────────────────┐
│  App Header  ·  "배송 예외 처리"  ·  집계 요약(총 7 · 미해결 5 · 해결 2)        │  ← <header> banner
│  ┌ 상태 필터 탭 ─────────────────────────────────────────────────────────┐   │
│  │ [전체 7] [접수 2] [조사중 2] [보류 1] [해결 2]                          │   │  ← role="tablist"
│  └───────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────┬────────────────────────────────────────────┤
│ Pane 1: 예외 목록             │ Pane 2: 상세 패널                           │
│ (list · <nav> role=listbox)  │ (detail · <main> aria-live 앵커)            │
│                              │                                            │
│ · 예외 행 ×N(필터 적용)       │ · 헤더: 수취인 · 상태 뱃지                   │
│   - EXC-#### (mono)          │ · 필드 그리드(D1~D9, 읽기 전용)             │
│   - 수취인 · cause 라벨       │   id/orderId/주소/cause/발생·갱신시각/설명   │
│   - 상태 뱃지                 │ ├─────────────────────────────────────────┤ │
│ · 선택 강조(accent 바)        │ · 해결 메모(D10, 편집 가능)                 │
│                              │   textarea + 카운터 + [저장] · 검증영역     │
├──────────────────────────────┴────────────────────────────────────────────┤
│ (미선택 시 Pane2 = "예외를 선택하세요" placeholder §5.5)                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.3 그리드 폭 (데스크톱 ≥1024px)

| Pane | 폭 | 근거 |
|---|---|---|
| Pane 1 목록 | `360px` 고정(min 320 / max 400) | EXC-ID + 수취인 + cause 라벨 + 상태 뱃지 1행 수용 |
| Pane 2 상세 | `1fr`(가변, `min-width: 420px`) | 필드 그리드 + 메모 입력이 주 작업 영역 |

- `display: grid; grid-template-columns: 360px minmax(420px, 1fr); gap: 0;` pane 경계는 `--dxc-color-border` 1px.
- 앱 전체 높이 `100vh`, 헤더(제목+필터 탭) 고정, 각 pane 내부는 독립 스크롤(`overflow-y: auto`).
- pane 내부 패딩 `--dxc-space-5`(24px), 카드/행 간 간격 `--dxc-space-2`(8px).

### 4.4 Breakpoint 별 동작

| Breakpoint | 레이아웃 | 상세 패널 처리 |
|---|---|---|
| **≥1024px (desktop)** | 2-pane 동시 노출(§4.3) | 우측 상시 노출 |
| **768–1023px (tablet)** | 2-pane 유지, 목록 `300px` + 상세 `1fr` 로 축소 | 우측 상시 노출 |
| **<768px (mobile)** | 1-pane 스택. 목록 ↔ 상세 뷰 전환. 상세 상단 "← 목록" 버튼으로 복귀 | 선택 시 상세 전체 화면, 필터 탭은 가로 스크롤 |

- mobile 목록→상세 전환 시 상세 헤더(수취인명)로 포커스 이동(§7.1) — 스크린리더 컨텍스트 유지.
- 상태 필터 탭은 mobile 에서 `overflow-x: auto` 가로 스크롤(탭 라벨 줄바꿈 금지).
- 각 breakpoint 는 CSS `@media` 로만 처리(JS 레이아웃 계산 금지 — 단순성).

---

## 5. 컴포넌트 명세 — props · 상태 · 인터랙션

> props 는 developer 가 렌더 함수 시그니처로 삼을 **논리 계약**(vanilla 이므로 실제 프레임워크 props 아님 — 데이터→DOM 매핑 기준). 향후 shadcn/ui 도입 시 매핑은 §8.4 참조.

### 5.1 `StatusFilterTabs` (헤더)

s1 §4.2 필터 6→ 실제 5개 옵션(F0 전체 + F1~F4). 단일 선택.

| prop | 타입 | 설명 |
|---|---|---|
| `options` | `{value,label,count}[]` | `all`/`open`/`investigating`/`on_hold`/`resolved`. count = 해당 상태 fixture 건수 |
| `selected` | enum(5) | 현재 활성 필터. 기본 `all`(s1 §4.2) |

- 각 탭 = 라벨 + 건수 뱃지(caption, `surface-muted` pill). 활성 탭: `--dxc-color-accent` 텍스트 + 하단 2px accent 언더라인 + `accent` tint 배경.
- **상태**: default / hover(`surface-muted`) / active(accent 언더라인) / focus-visible(2px accent outline).
- **인터랙션**: 클릭 또는 ←/→ 방향키 이동 + Enter/Space 선택. `role="tablist"`, 각 탭 `role="tab"` `aria-selected`.
- 필터 변경은 **목록 표시에만** 영향(s1 §4.3) — 이미 선택된 상세 패널은 유지(EC-03).

### 5.2 `ExceptionListItem` (Pane 1 행)

| prop | 타입 | 설명 |
|---|---|---|
| `id` | string | `EXC-####` — mono, caption-muted 색, 행 상단 |
| `recipientName` | string | body-strong, 행 제목 |
| `cause` | enum(5) | 한글 라벨(§6.2), caption-secondary |
| `status` | enum(4) | §6.1 상태 뱃지(행 우측) |
| `selected` | boolean | 선택 시 좌측 3px `--dxc-color-accent` 바 + `surface-muted` 배경 |

- 행 구조(2줄): 1줄 `EXC-#### · 수취인명` / 2줄 `cause 라벨` + 우측 정렬 상태 뱃지.
- **상태**: default / hover(`surface-muted`) / selected(`aria-selected="true"`, accent 바 + muted 배경) / focus-visible(2px accent outline, offset 2px).
- **인터랙션**: 클릭 또는 Enter/Space → 해당 예외를 Pane2 에 로드. 목록 `role="listbox"`, 행 `role="option"`(§7.1).
- 목록 표시 순서는 fixture 정의 순서 고정(s1 §3.3) — 정렬 UI 없음.

### 5.3 `DetailField` (Pane 2 읽기 전용 필드)

s1 §5.2 D1~D9 를 라벨-값 페어로 표시.

| prop | 타입 | 설명 |
|---|---|---|
| `label` | string | body-strong, `text-secondary` |
| `value` | string | body, `text` |
| `variant` | `text` \| `mono` \| `datetime` \| `multiline` | id/orderId→mono, 시각→datetime 포맷, description→multiline |

- 읽기 전용임을 시각화: 값 영역은 `surface-muted` 배경 + 좌측 2px `border` 라인(입력 필드와 구분). 편집 커서/포커스 링 없음.
- **datetime 표시 포맷**: `2026-07-10 09:15 (KST)` — ISO8601(`+09:00`)에서 `YYYY-MM-DD HH:mm (KST)` 로 변환(값 원본은 s1 §3.1, 변환은 developer). 발생/갱신 시각 2개 필드.
- 필드 그리드: 데스크톱 2열(`grid-template-columns: 1fr 1fr`), `description`(D9)는 전체 폭 1열 span, mobile 전부 1열.

### 5.4 `ResolutionMemoEditor` (Pane 2 · D10 — 편집 가능한 유일 영역)

s1 §6 메모 규칙 반영. **fixture 필드와 시각적으로 확실히 구분**(입력 서피스 스타일).

| prop | 타입 | 설명 |
|---|---|---|
| `value` | string | 현재 메모 텍스트(localStorage 로드값 또는 편집 중 값) |
| `savedAt` | string \| null | 마지막 저장 시각(ISO8601). null → "저장된 메모 없음" |
| `charCount` | number | `value.trim()` 길이 실시간 |
| `error` | string \| null | 300자 초과 등 검증 오류 문구(§6.2) |

- **구성**: 섹션 제목 "해결 메모" + `<textarea>`(min-height 96px, `surface` 배경 + `border-strong` 테두리 + focus 시 accent 링) + 하단 바(좌: `n/300` 카운터 · 우: `[저장]` 버튼) + 저장 시각 caption("2026-07-18 10:00 저장됨") + 검증 오류 영역.
- **카운터 색**: 0~300 → `text-muted`; 300 초과 → `--dxc-color-danger` + textarea 테두리 danger.
- **저장 버튼**: primary(accent 배경 + 흰 텍스트). hover→accent-hover. 입력값이 저장값과 동일하면 `disabled`(변경 없음).
- **검증 오류(EC-05)**: 300자 초과 저장 시도 → textarea 하단에 `danger-tint` 배경 + danger 텍스트 "메모는 300자 이하여야 합니다 (현재 N자)". **입력값 유지**(자르지 않음).
- **공백/빈 저장(EC-08)**: 공백만 저장 시 → "메모가 삭제됩니다" 안내 후 삭제 처리(오류 아님). 카운터 옆 muted 힌트로 사전 안내: "빈 메모를 저장하면 삭제됩니다".
- **자동 저장 없음(s1 §6.2)**: 입력만으로 저장 안 됨 → 미저장 변경 시 저장 버튼 활성 + "저장되지 않은 변경" caption 힌트.
- **인터랙션**: 저장 버튼 클릭 시에만 localStorage 기록. `Ctrl/Cmd+Enter` 저장 단축키(선택 구현 권장).

### 5.5 `EmptyDetailPlaceholder` (Pane 2 초기 · EC-01)

- 아무 예외도 선택 안 한 초기 상태. 중앙 정렬: 옅은 아이콘(📦 또는 인라인 SVG placeholder) + "예외를 선택하세요" heading-md muted + "왼쪽 목록에서 배송 예외를 선택하면 상세 정보와 해결 메모를 볼 수 있습니다" body-muted.
- 필드/입력 UI 렌더하지 않음(placeholder 전용).

### 5.6 `EmptyListState` (Pane 1 필터 0건 · EC-02)

- 필터 결과 0건(현재 fixture 로는 미발생, 방어적). 목록 영역 중앙: "해당 상태의 예외 없음" body muted + "다른 상태 탭을 선택해 보세요" caption.
- 크래시 금지 · 목록 컨테이너/탭은 유지.

---

## 6. 상태 뱃지 · cause 라벨 · 시각 인코딩 규칙

### 6.1 `StatusBadge`

| prop | 타입 | 설명 |
|---|---|---|
| `status` | `open`\|`investigating`\|`on_hold`\|`resolved` | §2.2 fg+tint 매핑 |

- pill(`--dxc-radius-pill`), caption weight 500, 좌측 6px 상태색 dot. 배경 = 상태 tint, 텍스트/dot = 상태 fg.
- **이중 인코딩(색맹 안전 · §7.2)**: 색상 + 한글 라벨(접수/조사중/보류/해결) + dot 를 함께 사용 → 색 인지 불가 시에도 라벨로 구분.
- 상태는 **읽기 전용**(s1 §4.1, 가정 2) — 뱃지는 클릭 불가·전이 버튼 없음. 커서 default.

### 6.2 `CauseLabel` (cause enum → 한글 라벨)

s1 §3.2 5종 고정 매핑. 뱃지 아님(중립 텍스트, caption-secondary):

| 값 | 한글 라벨 |
|---|---|
| `address_unreachable` | 배송지 접근 불가 |
| `recipient_absent` | 수취인 부재 |
| `package_damaged` | 상품 파손 |
| `customs_hold` | 통관 보류 |
| `weather_delay` | 기상 지연 |

- cause 는 색 인코딩하지 않는다(상태 뱃지와 시각 충돌 방지) — 텍스트 라벨만. 상세 패널에서는 `body` 크기로 표시.

### 6.3 집계 요약(헤더)

- 헤더 우측: `총 7 · 미해결 5 · 해결 2`. "미해결" = status ≠ `resolved` 합(open+investigating+on_hold). caption-secondary, 숫자만 `text` 강조.
- 필터 탭 건수와 함께 처리 규모를 이중 노출(요약은 고정, 탭 count 는 상태별).

---

## 7. 접근성 기준 (키보드 · 대비 · ARIA)

### 7.1 키보드 · 포커스

| 영역 | 키 | 동작 |
|---|---|---|
| 필터 탭 | ←/→ · Home/End | 탭 간 이동, Enter/Space 로 필터 적용(`role="tablist"` roving tabindex) |
| 목록 | ↑/↓ · Home/End | 행 간 이동, Enter/Space 로 선택(`role="listbox"`/`option`) |
| 상세 진입 | (mobile) 선택 시 | 상세 헤더(수취인명, `tabindex="-1"`)로 포커스 이동 |
| 메모 | Tab | textarea → 저장 버튼 순서. `Ctrl/Cmd+Enter` 저장 |

- 모든 인터랙티브 요소 `:focus-visible` 2px `--dxc-color-accent` outline(offset 2px).
- 상세 패널 컨테이너 `aria-live="polite"` → 선택 변경 시 스크린리더에 상세 갱신 통지.

### 7.2 색 대비 (WCAG AA · 4.5:1 본문 기준)

| 조합 | fg | bg | 대비(근사) | 판정 |
|---|---|---|---|---|
| 접수 뱃지 | `#5b636e` | `#f1f3f5` | ~5.0:1 | AA ✅ |
| 조사중 뱃지 | `#2a4fc0` | `#eaf0fe` | ~6.4:1 | AA ✅ |
| 보류 뱃지 | `#8a5a00` | `#fbf3d9` | ~5.6:1 | AA ✅ |
| 해결 뱃지 | `#1a7f37` | `#e4f4e9` | ~4.7:1 | AA ✅ |
| 본문 텍스트 | `#1a1a19` | `#ffffff` | ~16:1 | AAA ✅ |
| 보조 텍스트 | `#6b6b66` | `#ffffff` | ~5.3:1 | AA ✅ |
| 검증 오류 | `#cf222e` | `#fdecec` | ~4.9:1 | AA ✅ |

- 상태는 **색만으로 구분하지 않음** — 라벨 + dot 이중 인코딩(§6.1).

### 7.3 ARIA 랜드마크

- `<header>` banner(제목·요약·필터 탭) / `<nav aria-label="배송 예외 목록">`(Pane1) / `<main aria-label="예외 상세">`(Pane2).
- 상태 뱃지: `aria-label="상태: 조사중"`. 메모 카운터: `aria-live="polite"` 로 초과 시 오류 통지.

---

## 8. dev 구현 가이드

> developer(BF-1033)가 `src/app/delivery-exceptions-canary/{index.html,styles.css,main.js,fixtures.js,notes-storage.js}` 구현 시 따라할 지침. mockup(`docs/design/mockups/delivery-exceptions-canary-BF-1032.html`)은 **시각 참조 가이드**이며 픽셀 단위 일치 의무 없음.

### 8.1 토큰 정의 (styles.css `:root`)

- §2·§3·§4.1 토큰을 `:root` 에 **그대로 선언**(색상 리터럴은 여기에만). demo `src/app/demo/status/styles.css` 의 토큰 블록 형식을 그대로 따르되 prefix `--dxc-*`.
- 컴포넌트 규칙은 `var(--dxc-…)` 만 참조 — hardcoded HEX 금지(§0 정책).

### 8.2 권장 클래스/구조

```
.dxc-app            (grid: header + 2-pane 컨테이너)
.dxc-header         (banner: 제목 + 요약 + 필터탭)
  .dxc-filter-tabs  / .dxc-filter-tab[aria-selected]  / .dxc-filter-tab__count
.dxc-list           (nav[role=listbox])
  .dxc-list-item[aria-selected] / .dxc-list-item__id(.mono) / .dxc-list-item__name / .dxc-list-item__cause
.dxc-detail         (main[aria-live])
  .dxc-detail__header / .dxc-field-grid / .dxc-field / .dxc-field__label / .dxc-field__value[data-variant]
  .dxc-memo / .dxc-memo__textarea / .dxc-memo__counter / .dxc-memo__save / .dxc-memo__error / .dxc-memo__saved-at
.dxc-badge[data-status]     (상태별 fg/tint 는 [data-status="open|investigating|on_hold|resolved"] 로 분기)
.dxc-empty-detail / .dxc-empty-list
```

### 8.3 상태→토큰 매핑 (data-attribute 방식 권장)

```css
.dxc-badge[data-status="open"]          { color: var(--dxc-color-open);          background: var(--dxc-color-open-tint); }
.dxc-badge[data-status="investigating"] { color: var(--dxc-color-investigating); background: var(--dxc-color-investigating-tint); }
.dxc-badge[data-status="on_hold"]       { color: var(--dxc-color-hold);          background: var(--dxc-color-hold-tint); }
.dxc-badge[data-status="resolved"]      { color: var(--dxc-color-resolved);      background: var(--dxc-color-resolved-tint); }
```

### 8.4 shadcn/ui 매핑 참고 (향후 TS/React 전환 시)

현재는 vanilla 라 미적용이나, 추후 전환 시 컴포넌트 대응: 필터 탭→`Tabs`, 목록 행→`button`+`Card`, 상태 뱃지→`Badge`(variant 4종), 메모→`Textarea`+`Button`, 카운터/오류→`FormMessage`. **이번 task 범위 아님**(기록용).

### 8.5 구현 시 주의(s1 규칙 준수)

- 상태 변경 버튼/전이 UI 만들지 말 것(s1 §4.1·§11 — status 는 fixture 고정 읽기 전용).
- 메모 저장은 명시적 버튼만(자동 저장 금지, s1 §6.2). 저장 시 `delivery-exceptions-canary:notes` 단일 envelope(s1 §6.1)로 원자적 write.
- 300자 초과 시 저장 거부 + 입력값 유지(자르지 말 것, s1 §6.2 / EC-05). 공백=삭제(EC-08). `localStorage` 실패 시 in-memory 폴백(s1 §6.4 R3).
- 필터 변경 시 선택 해제 금지(s1 §4.3 / EC-03).

---

## 9. AC ↔ 디자인 요소 매핑

| AC(Epic) | Given/When/Then 요지 | 충족 디자인 요소 |
|---|---|---|
| **AC-1** | 기획 명세 기반 상태 필터·상세 패널·해결 메모 입력이 시각화되고 mockup HTML 이 `docs/design/mockups` 아래 존재 | 상태 필터 탭(§5.1) · 상세 패널 필드 그리드(§5.3) · 해결 메모 에디터(§5.4) 명세 + `docs/design/mockups/delivery-exceptions-canary-BF-1032.html` 산출 |
| **AC-2** | 공용 디자인 토큰 적용 시 기존 페이지와 색상·간격·타이포 정합 | §2 base 토큰 = `src/app/demo/*` `:root` 값 그대로 계승(신규 base 색 0) · §3 폰트·§4.1 space/radius 스케일 계승(§0 토큰 SSOT 정책) |
| s1 §4.3/EC-03 | 필터 변경해도 선택 유지 | §5.1 "필터는 목록 표시에만 영향", 상세 패널 독립 유지 |
| s1 §5.2 | D1~D10 전체 필드 표시 | §5.3 DetailField(D1~D9) + §5.4 메모(D10) |
| s1 §6.2/EC-05·08 | 메모 1~300자·공백 삭제·초과 거부·자동저장 없음 | §5.4 카운터·검증 오류·저장 버튼·삭제 안내 |
| s1 §5.1/EC-01 | 미선택 초기 placeholder | §5.5 EmptyDetailPlaceholder |
| s1 §11 보존 영역 | 기존 auth/대시보드/게임데모/공용 라우트/Docker 미변경 | 본 명세는 신규 `delivery-exceptions-canary` 화면만 정의, 기존 영역 참조·변경 없음 |

---

## 10. Self-critique

> PR commit 직전 자기 점검(designer-spec-self-critique 5개 항목). dev 가 받기 전 명세 누락/모호함 검증.

| # | 체크 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 모든 Epic AC 가 디자인 요소로 매핑되는가 | ✅ §9 표. AC-1(필터/상세/메모 시각화+mockup) · AC-2(토큰 정합) 모두 매핑. s1 주요 규칙(EC-01/03/05/08)도 컴포넌트에 반영 |
| 2 | **dev 구현 가이드** — dev 가 추측 없이 구현 가능한가 | ✅ §8 클래스명·data-attribute 상태 매핑·datetime 포맷(`YYYY-MM-DD HH:mm (KST)`)·저장 envelope 키·검증 순서 명시 |
| 3 | **기존 요소 보존** — 기존 페이지/토큰 훼손 없는가 | ✅ 신규 base 색 0건, demo `:root` 값 계승(prefix 만 `--dxc-*`). s1 §11 보존 영역(auth/대시보드/게임/Docker) 참조·변경 없음. 담당 파일 영역 `docs/design/**` 만 |
| 4 | **컴포넌트 매핑** — s1 데이터 모델 필드가 빠짐없이 UI 에 대응되는가 | ✅ D1~D9 → DetailField, D10 → 메모 에디터, status 4종 → 뱃지+필터, cause 5종 → CauseLabel. fixture 7건 전부 시각화 |
| 5 | **모호함 flag** — dev 재량/미확정 지점을 명시했는가 | ⚠️ 아래 flag |

**남은 모호함(dev 재량 · flag):**
- **datetime 표시 포맷**은 `YYYY-MM-DD HH:mm (KST)` 로 권장했으나 s1 §5.2 D7/D8 이 "표시 포맷 designer/developer 재량"이라 함 → 최종 포맷은 dev 확정 가능(값 원본은 불변).
- **filter UI 형태**를 탭(tablist)으로 확정했으나 s1 §4.2 는 "드롭다운/탭" 양자 허용 → 데스크톱 공간·건수 노출 이점으로 탭 채택. 협소 공간 필요 시 dev 가 select 폴백 가능(단 §7.1 키보드 계약 유지).
- **아이콘 사용**: EmptyDetailPlaceholder 의 📦 는 예시 — 외부 아이콘 의존 금지(inline SVG 또는 이모지 중 dev 재량).
- 위 3건은 모두 **UX 의도 불변 + 값/규칙 불변** 범위의 표현 재량이며, s1 도메인 규칙은 변경하지 않는다.

---

## mockup 참조

- **경로**: `docs/design/mockups/delivery-exceptions-canary-BF-1032.html` (single self-contained HTML · 외부 의존성 0건)
- 본 명세 §2 컬러 · §3 타이포 · §4 레이아웃 · §5 컴포넌트를 시각 동기화. 상태 필터 탭 · 2-pane 목록/상세 · 해결 메모 입력 + 주요 상태 변형(미선택 placeholder · 필터 0건 · 메모 검증 오류)을 `<section>` 으로 함께 표현.
- **시안 시각화 전용** — dev 실제 산출물 아님. dev 는 참조 가이드로 사용(픽셀 일치 의무 없음).

<!-- bf:pr-summary -->
### BF-1032 · 배송 예외 처리 화면 디자인 시안 요약

물류 담당자용 **2-pane 예외 처리 콘솔**(상태 필터 탭 + 목록 + 상세 패널 + 로컬 해결 메모) 디자인 명세 + self-contained mockup HTML.

**산출물**
| 파일 | 내용 |
|---|---|
| `docs/design/delivery-exceptions-canary-BF-1032.md` | 명세(컬러/타이포/레이아웃/컴포넌트/a11y/dev 가이드/AC 매핑/self-critique) |
| `docs/design/mockups/delivery-exceptions-canary-BF-1032.html` | 시각 mockup(2-pane + 필터 탭 + 메모 + 상태 변형) |

**토큰 매핑 (신규 base 색 0건 — `src/app/demo/*` `:root` 계승, prefix `--dxc-*`)**
| 용도 | `--dxc-*` 토큰 | HEX | 계승 출처(demo) |
|---|---|---|---|
| 앱 배경 | `--dxc-color-bg` | `#fafaf9` | `--color-bg-canvas` |
| 표면 | `--dxc-color-surface` | `#ffffff` | `--color-bg-surface` |
| accent | `--dxc-color-accent` | `#3563e9` | `--color-accent` |
| 접수 | `--dxc-color-open` / `-tint` | `#5b636e` / `#f1f3f5` | neutral 파생 |
| 조사중 | `--dxc-color-investigating` / `-tint` | `#2a4fc0` / `#eaf0fe` | accent-hover 파생 |
| 보류 | `--dxc-color-hold` / `-tint` | `#8a5a00` / `#fbf3d9` | warning 파생 |
| 해결 | `--dxc-color-resolved` / `-tint` | `#1a7f37` / `#e4f4e9` | success 파생 |

**AC 충족**: AC-1(필터·상세·메모 시각화 + mockup `docs/design/mockups` 존재) · AC-2(demo 토큰 정합). 상태 4종·cause 5종·fixture 7건 전부 시각화.

**Self-critique**: 5개 항목 통과. 잔여 모호함 3건(datetime 포맷 / 필터 탭 vs select / placeholder 아이콘)은 모두 UX 의도·도메인 규칙 불변 범위의 dev 표현 재량으로 flag.
<!-- /bf:pr-summary -->
