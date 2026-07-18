# 교대 인수인계 누락 점검 화면 디자인 명세 — BF-1050 (위험 요약 + 2-pane 점검 콘솔)

> 작성자: [이디자인] (designer) · 작성일 2026-07-18
> 관련 티켓: BF-1050 (본 designer task) · 부모 Epic: handoff-gap-canary · BF-1049 (planner)
> 기준 문서(s1): `docs/planning/handoff-gap-canary-BF-1049.md` (BF-1049, planner) — **단일 기준(single source of truth)**
> 형제 task: BF-1049 (planner) · BF-1051 (developer) · BF-1053 (tester)
> 대상 모듈: `demo/handoff-gap-canary/` (신규 · **관측 스택 `vanilla-static`** — s1 가정 1 채택, 아래 §0 참조)
> mockup 참조: `docs/design/mockups/handoff-gap-canary-BF-1050.html` (본 명세와 시각 동기화된 self-contained HTML)

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

본 문서는 s1 기획 명세(BF-1049)의 **데이터 모델·위험 판정 규칙·필터·상세 필드·로컬 보완 규칙을 화면으로 번역**한 UI/UX 디자인 명세다. s1 이 규정한 도메인 규칙(필수 값 4필드 = 담당자·기한·상태·후속 액션, 위험 등급 4단계, 후속 액션만 로컬 보완 가능·1~200자·최신 1건 덮어쓰기, `referenceNow` 고정 상수 판정 등)은 재해석하지 않고 **시각/인터랙션 계층만** 추가한다.

**designer 산출물 경계(절대 준수):**
- 본 task 담당 파일: `docs/design/handoff-gap-canary-BF-1050.md`(본 명세) + `docs/design/mockups/handoff-gap-canary-BF-1050.html`(mockup) 2개뿐.
- 실제 앱 코드(`demo/handoff-gap-canary/*`)는 developer(BF-1051) 담당 — 본 명세는 와이어프레임·토큰·컴포넌트 props·구현 가이드까지만 규정한다.

**tech-stack 및 토큰 SSOT 정책 (관측 스택 `vanilla-static` 채택):**
- Epic 설명 태그는 `typescript-monorepo` 이나, s1 §0·가정 1 이 REPO_CONVENTION_CAPSULE 관측값(`observed_stack=vanilla-static`, `route_mapping=root-relative-static`, `stack_mismatch=true`)을 **authority 로 채택**했다. 본 명세도 동일하게 vanilla-static 을 따른다 — **빌드 스텝·프레임워크 없는 순수 HTML/CSS/JS**, `design-tokens.json`·shadcn/ui 미도입.
- 따라서 실효 토큰 SSOT 는 `src/app/demo/*/styles.css`(status/clock 계열)의 `:root` 토큰 셸이다. 본 명세는 그 base 값(canvas `#fafaf9`·surface `#ffffff`·accent `#3563e9`·space/radius/shadow 스케일·시맨틱 success/warning/danger)을 **값 그대로 계승**하고 prefix 만 `--hgc-*`(handoff-gap-canary) 로 둔다 → 인접 데모 페이지와 색상·간격·타이포 정합.
- **색상 리터럴은 §2 토큰 정의 블록에만 존재**하고, 컴포넌트 규칙은 `var(--hgc-…)` 만 참조한다(demo 관례 = hardcoded 색상 금지 규약의 vanilla 대응).
- 신규 base 색 0건. 위험 등급 4단계 매핑용 fg/tint 쌍만 시맨틱 색(success/warning/danger)에서 파생한다(§2.2).
- **외부 의존성 0건**(CDN 폰트·아이콘 라이브러리·JS 프레임워크 금지). 폰트는 system stack, 아이콘은 유니코드 글리프/인라인 shape 만 사용 → s1 AC-3 "vanilla ESM 규약, 외부 프레임워크 의존 없이 구현 가능" 충족.

**task 제목 용어 ↔ s1 범위 정합(모호함 해소):**
- 본 task 제목의 "인수인계 등록/수정/필터 폼" 중 **"등록"(신규 항목 생성)·항목 삭제·담당자 재배정·기한 변경·상태 전이 UI 는 s1 §12 비범위**다. fixture 는 정적 배열이며 런타임 CRUD 대상이 아니다.
- "수정"은 **후속 액션(followUpAction) 로컬 보완 1개 필드**로만 한정된다(s1 가정 3). "필터"는 **위험 유형 단일 선택 필터**(§6)다.
- 즉 본 화면의 유일한 쓰기(write) 서피스는 상세 패널의 후속 액션 편집기(§5.4)이며, 나머지는 모두 읽기 전용이다. 이 경계를 시각으로 명확히 구분하는 것이 디자인 목표 중 하나다.

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 — 위험 요약 + 2-pane 구조 · spacing · breakpoint](#4-레이아웃--위험-요약--2-pane-구조--spacing--breakpoint)
5. [컴포넌트 명세 — props · 상태 · 인터랙션](#5-컴포넌트-명세--props--상태--인터랙션)
6. [위험 배지 · 상태 라벨 · 시각 인코딩 규칙](#6-위험-배지--상태-라벨--시각-인코딩-규칙)
7. [접근성 기준 (키보드 · 대비 · ARIA)](#7-접근성-기준-키보드--대비--aria)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ 디자인 요소 매핑](#9-ac--디자인-요소-매핑)
10. [Self-critique](#10-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

교대 근무자가 인계받은 인수인계 항목(담당자·기한·상태·후속 액션)을 **한 화면에서** 조회하고, 필수 값 누락·기한 초과 항목을 위험으로 즉시 식별하는 **위험 요약 + 2-pane 점검 콘솔**. 상단 헤더에 제목·기준 시각·**위험 요약 패널(4등급 집계)**·위험 유형 필터 탭이 있고, 좌측 목록에서 항목 1건을 선택하면 우측 상세 패널에 s1 §9.4 전체 필드(D1~D8) + 후속 액션 보완 입력 UI 가 표시된다. s1 §8.2 fixture 8건(HO-2001~2008, 위험 등급 4종 전부 커버)을 그대로 시각화한다.

### 1.2 사용자 경험 목표

| 목표 | 실현 방법 |
|---|---|
| **위험 규모 한눈 파악** | 헤더 하단 위험 요약 패널 = 4등급 stat 카드(정상/데이터 누락/기한 초과/복합 위험) + 총 건수. 필터와 무관하게 항상 **전체 기준**(s1 §5.4) → "전체 위험 규모"와 "현재 보는 부분집합" 혼동 방지 |
| **빠른 위험 스캔** | 위험 유형 필터 탭(전체/정상/데이터 누락/기한 초과/복합 위험) + 각 탭 건수 뱃지, 목록 각 행에 위험 배지(색+글리프+라벨 3중 인코딩) |
| **컨텍스트 유지** | 목록·상세를 2-pane 으로 동시 노출(데스크톱) → 화면 전환 없이 연속 점검. 필터를 바꿔도 선택 상태 유지(s1 §6.2 / EC-03) |
| **읽기/쓰기 경계 명확화** | fixture 원본 필드(D1~D5)·파생 값(D7·D8)은 읽기 전용 스타일, 편집 가능한 유일 영역인 후속 액션(D6)만 입력 서피스로 시각 구분 |
| **저장 안전** | 명시적 저장 버튼(자동 저장 없음, s1 §7.2) · 200자 카운터 · 검증 오류 인라인 표시(EC-05) · 공백 저장=보완 삭제 안내(EC-08) |
| **저장소 일관성** | `src/app/demo/*` 토큰·카드·뱃지 스타일 계승 → 학습 비용 0, 신규 base 색 0건 |

### 1.3 화면 상태 (s1 §9.3 반영)

- s1 §9.3 에 따라 로드는 동기적(localStorage 동기 API) → **loading 화면 없음**. 항상 "ready" 상태로 시작한다.
- s1 §9.3-6 에 따라 fixture 최소 1건 보장(8건 고정) → **true empty state(0건) 없음**. 단 아래 2가지 "부분 빈 상태"는 존재하므로 placeholder 를 정의한다:
  - **상세 패널 초기(미선택)**: "항목을 선택하세요" placeholder(§5.6, EC-01)
  - **필터 결과 0건**(현재 fixture 로는 실제 미발생, 방어적 정의 · s1 EC-02): "해당 위험 등급의 항목 없음" 목록 빈 상태(§5.7)
- 기준 시각(`referenceNow = 2026-07-18T09:00:00+09:00`, s1 §8.1)은 헤더에 항상 표기해 "무엇을 기준으로 기한 초과를 판정했는지"를 명시한다 → 결정론적 판정임을 사용자에게 투명하게 전달.

---

## 2. 컬러 팔레트

> prefix `--hgc-*`. `src/app/demo/*`(status/clock) `:root` base 값 **그대로 계승**(신규 base 색 0건). 위험 등급 4종 fg/tint 쌍만 시맨틱 색에서 파생하며 대비 검증 완료(§7.2) — 임의 변경 금지.

### 2.1 Base (demo 셸 계승 — 값 복제)

| 토큰 | HEX | 용도 | 계승 출처(demo) |
|---|---|---|---|
| `--hgc-color-bg` | `#fafaf9` | 앱 배경(pane 사이 gutter) | `--color-bg-canvas` |
| `--hgc-color-surface` | `#ffffff` | pane·카드·상세 패널 표면 | `--color-bg-surface` |
| `--hgc-color-surface-muted` | `#f1f1ef` | 선택 행·헤더·읽기전용 필드 배경 | `--color-bg-subtle` |
| `--hgc-color-border` | `#e5e5e2` | 기본 구분선 | `--color-border-default` |
| `--hgc-color-border-strong` | `#d0d0cc` | 강조 구분선·입력 테두리 | `--color-border-strong` |
| `--hgc-color-text` | `#1a1a19` | 본문 텍스트 | `--color-text-primary` |
| `--hgc-color-text-secondary` | `#6b6b66` | 보조 텍스트(메타) | `--color-text-secondary` |
| `--hgc-color-text-muted` | `#9a9a93` | placeholder·비활성 텍스트 | `--color-text-muted` |
| `--hgc-color-accent` | `#3563e9` | primary 액션·선택 표시·활성 탭 | `--color-accent` |
| `--hgc-color-accent-hover` | `#2a4fc0` | accent hover/active | `--color-accent-hover` |
| `--hgc-color-focus-ring` | `rgba(53,99,233,.45)` | focus-visible 링 | `--color-focus-ring` |

### 2.2 Risk (위험 등급 4종 · 배지 fg + tint bg 쌍)

s1 §5.3 위험 등급 4단계 ↔ 색 매핑. `fg`(텍스트/글리프) + `tint`(배지 배경) 쌍으로 사용하며, base 는 demo 시맨틱 색(`--color-success #1a7f37`·`--color-warning #9a6700`·`--color-danger #cf222e`)에서 파생. 등급은 severity gradient(정상→데이터 누락→기한 초과→복합 위험)를 **초록→앰버→러스트→레드** 색상 진행으로 표현하되, **색만으로 구분하지 않고** 글리프+한글 라벨을 함께 쓴다(§6.1 3중 인코딩). 대비는 §7.2 참조.

| 위험 등급(s1) | 라벨 | 글리프 | 토큰 fg | HEX | 토큰 tint | HEX | 파생 근거 |
|---|---|---|---|---|---|---|---|
| `normal` | 정상 | ● | `--hgc-color-normal` | `#1a7f37` | `--hgc-color-normal-tint` | `#e4f4e9` | demo success(그린) — 이상 없음 |
| `data_gap` | 데이터 누락 | ▲ | `--hgc-color-gap` | `#8a5a00` | `--hgc-color-gap-tint` | `#fbf3d9` | demo warning(앰버) — 필수값 누락 |
| `deadline_exceeded` | 기한 초과 | ◷ | `--hgc-color-overdue` | `#a5471d` | `--hgc-color-overdue-tint` | `#fbeae0` | 러스트 오렌지 — 기한 경과 |
| `critical` | 복합 위험 | ◆ | `--hgc-color-critical` | `#b3261e` | `--hgc-color-critical-tint` | `#fdecec` | demo danger(레드, 강조) — 누락+기한초과 동시 |

- `deadline_exceeded` 의 러스트 오렌지(`#a5471d`)는 앰버(`data_gap`)와 레드(`critical`) 사이의 **명확히 구분되는 제3 색상**으로 선택했다. 인접 색상 간 혼동 우려는 글리프(●▲◷◆)+라벨 이중 채널로 방어한다(§7.2).

### 2.3 Semantic 보조

| 토큰 | HEX | 용도 | 계승 출처 |
|---|---|---|---|
| `--hgc-color-danger` | `#cf222e` | 후속 액션 200자 초과 검증 오류·오류 테두리 | demo `--color-danger` |
| `--hgc-color-danger-tint` | `#fdecec` | 검증 오류 메시지 배경 | (danger 파생) |
| `--hgc-color-success-strong` | `#1a7f37` | 저장 완료 확인 문구 | demo `--color-success` |

---

## 3. 타이포그래피

> **system font stack only**(CDN 금지 — demo 관례 · s1 AC-3 외부 의존 0건). `--hgc-font-sans` 는 demo `--font-sans` 값 그대로 계승. ID(`HO-####`)·기한 ISO 값은 mono 로 표기해 스캔 용이성 확보.

```css
--hgc-font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
                 Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--hgc-font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

| 역할 | font | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| `heading-lg` | sans | 20px | 700 | 1.3 | 앱 헤더 제목 |
| `heading-md` | sans | 16px | 600 | 1.35 | pane/섹션 제목·상세 업무명 |
| `body` | sans | 14px | 400 | 1.55 | 본문·상세 필드값·목록 부제 |
| `body-strong` | sans | 14px | 600 | 1.5 | 필드 라벨·강조 |
| `caption` | sans | 12px | 500 | 1.4 | 메타(시각)·뱃지 텍스트·필터 건수 |
| `stat-num` | sans | 24px | 700 | 1.1 | 위험 요약 카드 숫자 |
| `mono` | mono | 13px | 500 | 1.4 | `HO-####` ID·ISO 기한 값 |

- 최소 본문 14px · 최소 caption 12px. 12px 미만 금지(가독성).

---

## 4. 레이아웃 — 위험 요약 + 2-pane 구조 · spacing · breakpoint

### 4.1 spacing / radius 스케일 (demo 셸 계승)

```css
--hgc-space-1: 4px;  --hgc-space-2: 8px;  --hgc-space-3: 12px;
--hgc-space-4: 16px; --hgc-space-5: 24px; --hgc-space-6: 32px; --hgc-space-7: 48px;
--hgc-radius-sm: 4px; --hgc-radius-md: 8px; --hgc-radius-lg: 12px; --hgc-radius-pill: 999px;
--hgc-shadow-card: 0 4px 16px rgba(0,0,0,.06);
```

### 4.2 전체 골격

```
┌───────────────────────────────────────────────────────────────────────────┐
│  App Header · "교대 인수인계 누락 점검"  ·  기준 시각 2026-07-18 09:00 (KST)   │  ← <header> banner
│  ┌ 위험 요약 패널 (전체 기준 · 필터 무관) ────────────────────────────────┐   │
│  │ [● 정상 2] [▲ 데이터 누락 3] [◷ 기한 초과 1] [◆ 복합 위험 2]   총 8건  │   │  ← role="group"
│  └───────────────────────────────────────────────────────────────────────┘   │
│  ┌ 위험 유형 필터 탭 ──────────────────────────────────────────────────────┐  │
│  │ [전체 8] [정상 2] [데이터 누락 3] [기한 초과 1] [복합 위험 2]            │  │  ← role="tablist"
│  └───────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────┬────────────────────────────────────────────┤
│ Pane 1: 인수인계 목록          │ Pane 2: 상세 패널                           │
│ (list · role=listbox)        │ (detail · <main> aria-live 앵커)            │
│                              │                                            │
│ · 항목 행 ×N(필터 적용)        │ · 헤더: 업무명 · 위험 배지(D7)               │
│   - HO-#### (mono)           │ · 필드 그리드(D1~D5, 읽기 전용)             │
│   - 업무명 · 담당자            │   id/업무명/담당자/기한/상태                 │
│   - 위험 배지                 │ · 누락 필드 안내(D8, hasDataGap 상세)       │
│ · 선택 강조(accent 바)         ├────────────────────────────────────────────┤
│                              │ · 후속 액션 보완(D6, 편집 가능)             │
│                              │   textarea + 카운터 + [저장] · 검증영역     │
├──────────────────────────────┴────────────────────────────────────────────┤
│ (미선택 시 Pane2 = "항목을 선택하세요" placeholder §5.6)                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.3 그리드 폭 (데스크톱 ≥1024px)

| Pane | 폭 | 근거 |
|---|---|---|
| Pane 1 목록 | `340px` 고정(min 300 / max 400) | HO-ID + 업무명 + 담당자 + 위험 배지 수용 |
| Pane 2 상세 | `1fr`(가변, `min-width: 420px`) | 필드 그리드 + 후속 액션 입력이 주 작업 영역 |

- `display: grid; grid-template-columns: 340px minmax(420px, 1fr); gap: 0;` pane 경계는 `--hgc-color-border` 1px.
- 앱 전체 높이 `100vh`, 헤더(제목+위험 요약+필터 탭) 고정, 각 pane 내부는 독립 스크롤(`overflow-y: auto`).
- pane 내부 패딩 `--hgc-space-5`(24px), 카드/행 간 간격 `--hgc-space-2`(8px).
- 위험 요약 패널: 데스크톱 4카드 가로 배치(`grid-template-columns: repeat(4, 1fr)` + 총계 우측), gap `--hgc-space-3`.

### 4.4 Breakpoint 별 동작 (모바일 반응형 — s1 task AC "모바일·키보드 시나리오")

| Breakpoint | 레이아웃 | 위험 요약 | 상세 패널 처리 |
|---|---|---|---|
| **≥1024px (desktop)** | 2-pane 동시 노출(§4.3) | 4카드 1행 + 총계 | 우측 상시 노출 |
| **768–1023px (tablet)** | 2-pane 유지, 목록 `300px` + 상세 `1fr` | 4카드 1행(카드 폭 축소) | 우측 상시 노출 |
| **<768px (mobile)** | **1-pane 스택**. 목록 ↔ 상세 뷰 전환. 상세 상단 "← 목록" 버튼으로 복귀 | **2×2 카드 그리드**(`repeat(2, 1fr)`) | 선택 시 상세 전체 화면, 필터 탭은 가로 스크롤 |

- mobile 목록→상세 전환 시 상세 헤더(업무명, `tabindex="-1"`)로 포커스 이동(§7.1) — 스크린리더 컨텍스트 유지. 상세→목록 복귀 시 직전 선택 행으로 포커스 반환.
- 위험 유형 필터 탭은 mobile 에서 `overflow-x: auto` 가로 스크롤(탭 라벨 줄바꿈 금지).
- 위험 요약 카드는 mobile 에서 2×2 로 접혀도 4등급 모두 노출 유지(스크롤로 감추지 않음) — 위험 규모 파악이 핵심 목표이기 때문.
- 각 breakpoint 는 CSS `@media` 로만 처리(JS 레이아웃 계산 금지 — 단순성 · vanilla).

---

## 5. 컴포넌트 명세 — props · 상태 · 인터랙션

> props 는 developer 가 렌더 함수 시그니처로 삼을 **논리 계약**(vanilla 이므로 실제 프레임워크 props 아님 — 데이터→DOM 매핑 기준).

### 5.1 `RiskSummaryPanel` (헤더 · 위험 요약 — s1 §5.4)

전체 fixture(+로컬 보완 반영) 기준 4등급 집계. **필터와 무관하게 항상 전체 기준**(s1 §5.4) — 필터 변경 시에도 수치 불변.

| prop | 타입 | 설명 |
|---|---|---|
| `counts` | `{normal,data_gap,deadline_exceeded,critical}` | 각 등급 건수(전체 fixture 기준) |
| `total` | number | 총 건수(= 4등급 합, fixture 8건) |

- 카드 4개 각각 = 위험 배지 글리프+라벨 + 큰 숫자(`stat-num`) + 등급 tint 좌측 4px 바. 우측에 "총 8건" 요약.
- **읽기 전용 정보 패널** — 클릭 불가(필터 탭과 역할 분리). 단, 접근성상 각 카드는 `aria-label="정상 2건"` 형태로 읽힌다.
- 로컬 보완으로 등급이 재계산되면(s1 §7.4) 이 패널 수치도 즉시 갱신된다(예: AC-U5 저장 시 data_gap −1 / normal +1). `aria-live="polite"` 로 변경 통지.
- **필터 탭과의 시각 구분**: 요약 패널은 `surface-muted` 배경 카드(비클릭), 필터 탭은 `surface` 배경 인터랙티브 탭 → 두 영역 혼동 방지.

### 5.2 `RiskFilterTabs` (헤더 · 위험 유형 필터 — s1 §6.1)

s1 §6.1 필터 F0~F4 = 5개 옵션. 단일 선택.

| prop | 타입 | 설명 |
|---|---|---|
| `options` | `{value,label,count}[]` | `all`/`normal`/`data_gap`/`deadline_exceeded`/`critical`. count = 해당 등급 fixture 건수 |
| `selected` | enum(5) | 현재 활성 필터. 기본 `all`(s1 §6.1 F0) |

- 각 탭 = 라벨 + 건수 뱃지(caption, `surface-muted` pill). 활성 탭: `--hgc-color-accent` 텍스트 + 하단 2px accent 언더라인 + accent tint 배경.
- **상태**: default / hover(`surface-muted`) / active(accent 언더라인) / focus-visible(2px accent outline).
- **인터랙션**: 클릭 또는 ←/→ 방향키 이동 + Enter/Space 선택. `role="tablist"`, 각 탭 `role="tab"` `aria-selected`.
- 필터 변경은 **목록 표시에만** 영향(s1 §6.1·§6.2) — 위험 요약 수치·이미 선택된 상세 패널은 불변(EC-03). 필터는 재계산을 트리거하지 않음(s1 §7.4-2).
- 목록 표시 순서는 fixture 정의 순서 고정(s1 §3.3) — 필터 변경 후에도 유지.

### 5.3 `HandoffListItem` (Pane 1 행)

| prop | 타입 | 설명 |
|---|---|---|
| `id` | string | `HO-####` — mono, caption-muted 색, 행 상단 |
| `taskName` | string | body-strong, 행 제목 |
| `assignee` | string \| null | caption-secondary. 누락 시 "미배정"(muted) + 누락 표식(§6.3) |
| `riskLevel` | enum(4) | §6.1 위험 배지(행 우측) |
| `selected` | boolean | 선택 시 좌측 3px `--hgc-color-accent` 바 + `surface-muted` 배경 |

- 행 구조(2줄): 1줄 `HO-#### · 업무명` / 2줄 `담당자` + 우측 정렬 위험 배지.
- **상태**: default / hover(`surface-muted`) / selected(`aria-selected="true"`, accent 바 + muted 배경) / focus-visible(2px accent outline, offset 2px).
- **인터랙션**: 클릭 또는 Enter/Space → 해당 항목을 Pane2 에 로드. 목록 `role="listbox"`, 행 `role="option"`(§7.1).
- 담당자 누락(HO-2002/HO-2008 등) 행은 담당자 자리에 "미배정" muted + 작은 누락 도트(§6.3)로 필드 누락을 목록에서도 힌트.

### 5.4 `FollowUpEditor` (Pane 2 · D6 — 편집 가능한 유일 영역, s1 §7)

s1 §7 로컬 보완 규칙 반영. **fixture 필드와 시각적으로 확실히 구분**(입력 서피스 스타일). 담당자/기한/상태는 편집하지 않고 **오직 후속 액션만** 보완한다(s1 가정 3).

| prop | 타입 | 설명 |
|---|---|---|
| `value` | string | 현재 후속 액션 텍스트(병합값 = fixture 원본 또는 localStorage 오버라이드) |
| `savedAt` | string \| null | 마지막 보완 저장 시각(ISO8601). null → "로컬 보완 없음(원본값)" |
| `charCount` | number | `value.trim()` 길이 실시간 |
| `error` | string \| null | 200자 초과 등 검증 오류 문구 |
| `isOverridden` | boolean | localStorage 오버라이드 적용 여부 → "로컬 보완됨" 배지 표시 |

- **구성**: 섹션 제목 "후속 액션 보완" + `<textarea>`(min-height 88px, `surface` 배경 + `border-strong` 테두리 + focus 시 accent 링) + 하단 바(좌: `n/200` 카운터 · 우: `[저장]` 버튼) + 저장 시각 caption + 검증 오류 영역.
- **원본/보완 출처 표시**: 오버라이드가 적용된 항목은 라벨 옆에 "로컬 보완됨" caption 배지(accent tint). 없으면 "원본값" muted.
- **카운터 색**: 1~200 → `text-muted`; 200 초과 → `--hgc-color-danger` + textarea 테두리 danger.
- **저장 버튼**: primary(accent 배경 + 흰 텍스트). hover→accent-hover. 입력값이 저장값과 동일하면 `disabled`(변경 없음).
- **검증 오류(EC-05)**: 200자 초과 저장 시도 → textarea 하단에 `danger-tint` 배경 + danger 텍스트 "후속 액션은 200자 이하여야 합니다 (현재 N자)". **입력값 유지**(자르지 않음).
- **공백/빈 저장(EC-08)**: 공백만 저장 시 → 오버라이드 삭제로 처리(오류 아님) → fixture 원본값 복귀. 원본이 애초 누락(HO-2007)이었다면 다시 "데이터 누락" 위험으로 복귀함을 사전 안내: 카운터 옆 muted 힌트 "빈 값 저장 시 로컬 보완이 삭제되고 원본값으로 되돌아갑니다".
- **자동 저장 없음(s1 §7.2)**: 입력만으로 저장 안 됨 → 미저장 변경 시 저장 버튼 활성 + "저장되지 않은 변경" caption 힌트.
- **인터랙션**: 저장 버튼 클릭 시에만 localStorage 기록(단일 envelope `handoff-gap-canary:overrides`, s1 §7.1). `Ctrl/Cmd+Enter` 저장 단축키(선택 구현 권장). localStorage 실패 시 in-memory 폴백(s1 §7.5 R3) — 사용자에게는 "이 세션에서만 유지됩니다" muted 힌트로 안내(크래시 금지).

### 5.5 `DetailFieldGrid` (Pane 2 읽기 전용 필드 D1~D5 + D8)

s1 §9.4 D1~D5 를 라벨-값 페어로, D8(누락 필드 목록)을 상단 안내로 표시.

| prop | 타입 | 설명 |
|---|---|---|
| `id` (D1) | string | mono. 항목 ID |
| `taskName` (D2) | string | 상세 헤더에 heading-md 로 별도 표시 |
| `assignee` (D3) | string \| null | 누락 시 "미배정" placeholder + 누락 표식 |
| `dueAt` (D4) | string \| null | datetime 포맷. 누락/파싱불가 시 "기한 미정" + 누락 표식 |
| `status` (D5) | enum \| null | 한글 라벨(§6.2). 누락/비유효 시 "상태 미지정" + 누락 표식 |
| `missingFields` (D8) | string[] | 누락 필드 한글 라벨 배열(예: `["담당자","후속 액션"]`) |

- 읽기 전용임을 시각화: 값 영역은 `surface-muted` 배경 + 좌측 2px `border` 라인(입력 필드와 구분). 편집 커서/포커스 링 없음.
- **datetime 표시 포맷**: `2026-07-18 08:00 (KST)` — ISO8601(`+09:00`)에서 `YYYY-MM-DD HH:mm (KST)` 로 변환(값 원본 불변, 변환은 developer). 기한 초과 항목은 값 옆에 ◷ 러스트색 "기한 초과" 인라인 태그.
- **누락 필드 안내(D8)**: `missingFields` 가 비어있지 않으면 상세 헤더 아래에 `gap-tint` 배경 안내 바 "누락된 필수 값: 담당자, 후속 액션" 표시(어떤 필드가 왜 위험인지 즉시 설명). 각 누락 필드 값 자리에도 §6.3 누락 표식.
- 필드 그리드: 데스크톱 2열(`grid-template-columns: 1fr 1fr`), mobile 전부 1열.

### 5.6 `EmptyDetailPlaceholder` (Pane 2 초기 · EC-01)

- 아무 항목도 선택 안 한 초기 상태. 중앙 정렬: 옅은 인라인 SVG placeholder(외부 아이콘 금지) + "항목을 선택하세요" heading-md muted + "왼쪽 목록에서 인수인계 항목을 선택하면 상세 정보와 후속 액션 보완을 볼 수 있습니다" body-muted.
- 필드/입력 UI 렌더하지 않음(placeholder 전용).

### 5.7 `EmptyListState` (Pane 1 필터 0건 · EC-02)

- 필터 결과 0건(현재 fixture 로는 미발생, 방어적). 목록 영역 중앙: "해당 위험 등급의 항목 없음" body muted + "다른 위험 유형 탭을 선택해 보세요" caption.
- 크래시 금지 · 목록 컨테이너/탭·위험 요약은 유지.

---

## 6. 위험 배지 · 상태 라벨 · 시각 인코딩 규칙

### 6.1 `RiskBadge` (위험 등급 4종)

| prop | 타입 | 설명 |
|---|---|---|
| `riskLevel` | `normal`\|`data_gap`\|`deadline_exceeded`\|`critical` | §2.2 fg+tint+글리프 매핑 |

- pill(`--hgc-radius-pill`), caption weight 500, 좌측 등급 글리프(●▲◷◆) + 한글 라벨. 배경 = 등급 tint, 텍스트/글리프 = 등급 fg.
- **3중 인코딩(색맹 안전 · §7.2)**: 색상 + 글리프(●▲◷◆) + 한글 라벨(정상/데이터 누락/기한 초과/복합 위험) → 색 인지 불가 시에도 글리프·라벨로 구분.
- 위험 등급은 **파생 읽기 전용 값**(s1 §5.3) — 배지는 클릭 불가·전이 버튼 없음. 커서 default.
- `aria-label="위험 등급: 복합 위험"` 로 스크린리더 통지.

### 6.2 `StatusLabel` (status enum → 한글 라벨 · s1 §3.2)

s1 §3.2 3종 고정 매핑. 위험 배지와 시각 충돌 방지를 위해 **색 인코딩하지 않는 중립 텍스트**(caption-secondary):

| 값 | 한글 라벨 | 의미 |
|---|---|---|
| `pending` | 대기 | 조치 시작 전 |
| `in_progress` | 진행중 | 조치 진행 중 |
| `done` | 완료 | 처리 완료(기한 초과 판정 제외) |

- 3종에 속하지 않는 값(오타/누락)은 "상태 미지정" muted + §6.3 누락 표식(s1 §4.1 V-status · EC-11). status 는 fixture 고정 읽기 전용 — 전이 버튼 없음(s1 §12).

### 6.3 누락 표식 (Missing-value marker)

- 필수 값 누락 필드(담당자/기한/상태/후속 액션)의 값 자리에는 **placeholder 문구(미배정/기한 미정/상태 미지정/빈 입력창) + `data_gap` 색 작은 도트(▲ 축소형)**를 붙여 "이 값이 왜 비어 위험인지"를 필드 단위로 표시한다.
- 목록 행에서도 담당자 누락 시 동일 도트를 소형으로 노출(§5.3) → 상세 진입 전에도 힌트.
- 색만으로 표시하지 않고 placeholder 문구가 항상 동반된다(색맹 안전).

### 6.4 위험 요약 카드 시각 규칙

- 4개 카드 각각 = 등급 글리프+라벨(caption) + 큰 숫자(stat-num, `--hgc-color-text`) + 등급 tint 배경(옅게) + 좌측 4px 등급 fg 바.
- 0건 카드도 숨기지 않고 "0" 으로 표시(s1 EC-12 — 특정 등급 0건도 정상 표기). 총계는 우측 별도 셀 "총 N건".

---

## 7. 접근성 기준 (키보드 · 대비 · ARIA)

> s1 task AC "모바일·키보드 시나리오 → 반응형 레이아웃과 키보드 포커스 흐름이 mockup 에 반영" 대응. 아래 키보드 흐름은 mockup HTML 의 접근성 데모 `<section>` 에도 시각 표기한다.

### 7.1 키보드 · 포커스 흐름

| 영역 | 키 | 동작 |
|---|---|---|
| 필터 탭 | ←/→ · Home/End | 탭 간 이동, Enter/Space 로 필터 적용(`role="tablist"` roving tabindex) |
| 목록 | ↑/↓ · Home/End | 행 간 이동, Enter/Space 로 선택(`role="listbox"`/`option`) |
| 상세 진입 | (mobile) 선택 시 | 상세 헤더(업무명, `tabindex="-1"`)로 포커스 이동. "← 목록" 복귀 시 직전 선택 행으로 포커스 반환 |
| 후속 액션 | Tab | textarea → 저장 버튼 순서. `Ctrl/Cmd+Enter` 저장 |

- **Tab 순서(데스크톱)**: 필터 탭(roving = 활성 탭 1개만 tab stop) → 목록(roving = 선택 행 1개 tab stop) → 상세 후속 액션 textarea → 저장 버튼. 위험 요약 패널은 읽기 전용이라 tab stop 아님(스크린리더로는 읽힘).
- 모든 인터랙티브 요소 `:focus-visible` 2px `--hgc-color-accent` outline(offset 2px). 마우스 클릭 시엔 표시 안 됨(`:focus-visible` 만).
- 상세 패널 컨테이너 `aria-live="polite"` → 선택 변경·재계산 시 스크린리더에 상세 갱신 통지.

### 7.2 색 대비 (WCAG AA · 4.5:1 본문 기준)

| 조합 | fg | bg | 대비(근사) | 판정 |
|---|---|---|---|---|
| 정상 배지 | `#1a7f37` | `#e4f4e9` | ~4.7:1 | AA ✅ |
| 데이터 누락 배지 | `#8a5a00` | `#fbf3d9` | ~5.6:1 | AA ✅ |
| 기한 초과 배지 | `#a5471d` | `#fbeae0` | ~5.1:1 | AA ✅ |
| 복합 위험 배지 | `#b3261e` | `#fdecec` | ~5.9:1 | AA ✅ |
| 본문 텍스트 | `#1a1a19` | `#ffffff` | ~16:1 | AAA ✅ |
| 보조 텍스트 | `#6b6b66` | `#ffffff` | ~5.3:1 | AA ✅ |
| 검증 오류 | `#cf222e` | `#fdecec` | ~4.9:1 | AA ✅ |

- 위험 등급은 **색만으로 구분하지 않음** — 글리프(●▲◷◆) + 한글 라벨 3중 인코딩(§6.1). 누락 필드도 placeholder 문구 동반(§6.3).

### 7.3 ARIA 랜드마크

- `<header>` banner(제목·기준 시각·위험 요약·필터 탭) / `<nav aria-label="인수인계 목록">`(Pane1) / `<main aria-label="인수인계 상세">`(Pane2).
- 위험 요약 패널: `role="group" aria-label="위험 요약"`, 각 카드 `aria-label="정상 2건"`. `aria-live="polite"` 로 재계산 시 갱신 통지.
- 위험 배지: `aria-label="위험 등급: 복합 위험"`. 후속 액션 카운터: `aria-live="polite"` 로 초과 시 오류 통지.

---

## 8. dev 구현 가이드

> developer(BF-1051)가 `demo/handoff-gap-canary/{index.html,styles.css,main.js,fixtures.js,overrides-storage.js}` 구현 시 따라할 지침. mockup(`docs/design/mockups/handoff-gap-canary-BF-1050.html`)은 **시각 참조 가이드**이며 픽셀 단위 일치 의무 없음.

### 8.0 경로·스택 재확인 (s1 가정 1 — 반드시 준수)

- **물리 경로**: 저장소 루트 `demo/handoff-gap-canary/index.html` (serve_root `.`, root-relative-static). Epic 태그(`typescript-monorepo`)를 따라 `src/app/**` 에 두지 말 것 — 라우트(`/demo/handoff-gap-canary`)가 서빙되지 않는다(s1 §9.1).
- **빌드 스텝 없음**: 순수 HTML/CSS/JS(ESM). 번들러·프레임워크·CDN 의존 0건.

### 8.1 토큰 정의 (styles.css `:root`)

- §2·§3·§4.1 토큰을 `:root` 에 **그대로 선언**(색상 리터럴은 여기에만). demo `src/app/demo/status/styles.css` 토큰 블록 형식을 따르되 prefix `--hgc-*`.
- 컴포넌트 규칙은 `var(--hgc-…)` 만 참조 — hardcoded HEX 금지(§0 정책).

### 8.2 권장 클래스/구조

```
.hgc-app              (grid: header + 2-pane 컨테이너)
.hgc-header           (banner: 제목 + 기준시각 + 위험 요약 + 필터탭)
  .hgc-summary        (role=group)  / .hgc-summary__card[data-risk] / .hgc-summary__num / .hgc-summary__total
  .hgc-filter-tabs    / .hgc-filter-tab[aria-selected] / .hgc-filter-tab__count
.hgc-list             (nav[role=listbox])
  .hgc-list-item[aria-selected] / .hgc-list-item__id(.mono) / .hgc-list-item__name / .hgc-list-item__assignee
.hgc-detail           (main[aria-live])
  .hgc-detail__header / .hgc-detail__name / .hgc-gap-notice           (D8 누락 안내 바)
  .hgc-field-grid / .hgc-field / .hgc-field__label / .hgc-field__value[data-missing]
  .hgc-followup / .hgc-followup__textarea / .hgc-followup__counter / .hgc-followup__save / .hgc-followup__error / .hgc-followup__saved-at
.hgc-badge[data-risk]        (등급별 fg/tint/글리프 = [data-risk="normal|data_gap|deadline_exceeded|critical"] 로 분기)
.hgc-empty-detail / .hgc-empty-list
```

### 8.3 위험 등급→토큰 매핑 (data-attribute 방식 권장)

```css
.hgc-badge[data-risk="normal"]            { color: var(--hgc-color-normal);   background: var(--hgc-color-normal-tint); }
.hgc-badge[data-risk="data_gap"]          { color: var(--hgc-color-gap);      background: var(--hgc-color-gap-tint); }
.hgc-badge[data-risk="deadline_exceeded"] { color: var(--hgc-color-overdue);  background: var(--hgc-color-overdue-tint); }
.hgc-badge[data-risk="critical"]          { color: var(--hgc-color-critical); background: var(--hgc-color-critical-tint); }
```

- 글리프는 배지 내 `::before` 또는 별도 `<span aria-hidden="true">` 로 삽입(●▲◷◆). 라벨 텍스트는 항상 동반(a11y).

### 8.4 구현 시 주의 (s1 규칙 준수)

- **읽기 전용 필드 절대 편집 UI 금지**: 담당자/기한/상태 전이·재배정 버튼 만들지 말 것(s1 가정 3·§12). 유일한 write 서피스는 후속 액션 textarea 뿐.
- **위험 판정은 순수 함수**: `hasDataGap`/`hasDeadlineExceeded`/`riskLevel` 은 fixture 원본+오버라이드 병합으로 매 재계산 시점마다 새로 도출(캐시 금지, s1 §5.3·§7.4). `referenceNow` 는 fixture 상수(`2026-07-18T09:00:00+09:00`)만 사용 — `Date.now()`/`Math.random()` 판정 로직 사용 금지(s1 §8.1).
- **위험 요약은 필터 무관 전체 기준**: 필터는 목록 표시만 좁힌다(s1 §5.4·§6.1). 필터 변경은 재계산 트리거 안 함(s1 §7.4-2).
- **후속 액션 저장은 명시적 버튼만**(자동 저장 금지, s1 §7.2). 저장 시 `handoff-gap-canary:overrides` 단일 envelope(s1 §7.1)로 원자적 write. 200자 초과 거부+입력값 유지(자르지 말 것, EC-05). 공백=오버라이드 삭제→원본 복귀(EC-08). localStorage 실패 시 in-memory 폴백(s1 §7.5 R3).
- **필터 변경 시 선택 해제 금지**(s1 §6.2 / EC-03).
- **datetime 포맷**: `YYYY-MM-DD HH:mm (KST)` 권장(값 원본 불변, 표시 변환만).

### 8.5 향후 TS/React 전환 시 매핑 참고 (이번 task 범위 아님 · 기록용)

현재는 vanilla-static 이라 미적용. 추후 전환 시 컴포넌트 대응: 필터 탭→`Tabs`, 위험 요약 카드→`Card`+`Badge`, 목록 행→`button`+`Card`, 위험 배지→`Badge`(variant 4종), 후속 액션→`Textarea`+`Button`, 카운터/오류→`FormMessage`. 토큰은 `design-tokens.json` 도입 시 §2 값으로 seed.

---

## 9. AC ↔ 디자인 요소 매핑

### 9.1 본 task 수용 기준 매핑

| task AC | Given/When/Then 요지 | 충족 디자인 요소 |
|---|---|---|
| **AC-1** | 기획 명세 AC 표 → 각 화면 요소가 AC 와 매핑되고 위험 상태별 디자인 토큰 정의 | §9.2 s1 AC 매핑 표 · §2.2 위험 등급 4종 fg/tint/글리프 토큰(`--hgc-color-normal/gap/overdue/critical`) 정의 |
| **AC-2** | 모바일·키보드 시나리오 → 반응형 레이아웃·키보드 포커스 흐름이 mockup 에 반영 | §4.4 breakpoint 3단(desktop/tablet/mobile 1-pane 스택) · §7.1 키보드 포커스 흐름(roving tabindex·mobile 포커스 이동) + mockup HTML 모바일 뷰·접근성 데모 `<section>` |
| **AC-3** | vanilla ESM 규약 → 외부 프레임워크 의존 없이 구현 가능한 마크업/스타일 명세 | §0 vanilla-static 정책(외부 의존 0건·system font·`:root` CSS 변수) · §8 순수 HTML/CSS/JS 구현 가이드 · mockup self-contained(CDN 0건) |

### 9.2 s1 planner AC ↔ 디자인 요소 매핑

| s1 AC | 요지 | 충족 디자인 요소 |
|---|---|---|
| s1 AC-U1 (normal) | 모든 필수값 유효 → `normal` 표시·요약 포함 | §6.1 정상 배지(●) · §5.1 요약 정상 카운트. fixture HO-2005/2006 시각화 |
| s1 AC-U2 (data_gap) | 필수값 누락 → `data_gap`(단독) / `critical`(기한초과 겹침) | §6.3 누락 표식 · §5.5 D8 누락 필드 안내 바 · §6.1 데이터 누락(▲)/복합 위험(◆) 배지 |
| s1 AC-U3 (deadline) | 과거 기한+미완료 → `deadline_exceeded`, done 과거기한 제외 | §5.5 기한값 옆 ◷ "기한 초과" 인라인 태그 · 헤더 기준 시각 표기(결정론 투명화) · §6.1 기한 초과 배지 |
| s1 AC-U4 (filter) | 필터 선택 → 해당 등급만·순서 유지, 요약 불변 | §5.2 RiskFilterTabs(단일 선택·순서 유지) · §5.1 요약 필터 무관 전체 기준 · §5.7 필터 0건 빈 상태 |
| s1 AC-U5 (local override) | 후속 액션 저장 → 재계산·요약 델타 | §5.4 FollowUpEditor(저장 버튼·카운터·오버라이드 배지) · §5.1 요약 `aria-live` 재계산 갱신(data_gap −1/normal +1). fixture HO-2007 대상 |
| s1 §5.1~5.3 (위험 전환 규칙) | 데이터 누락/기한 초과 각 전환·우선순위 → **위험 상태별 토큰** | §2.2 4등급 fg/tint/글리프 토큰 + §6.1 배지 3중 인코딩 → 각 위험 상태를 고유 디자인 토큰으로 표현 |
| s1 §9.4 (D1~D8) | 상세 필드 전체 표시 | §5.5 DetailFieldGrid(D1~D5,D8) + §5.4 후속 액션(D6) + §6.1 위험 배지(D7) |
| s1 §12 (보존 영역) | 기존 auth/대시보드/게임데모/공용 라우트/Docker 미변경 | 본 명세는 신규 `demo/handoff-gap-canary` 화면만 정의, 기존 영역 참조·변경 없음. 담당 파일 `docs/design/**` 만 |

---

## 10. Self-critique

> PR commit 직전 자기 점검(designer-spec-self-critique 5개 항목). dev 가 받기 전 명세 누락/모호함 검증.

| # | 체크 항목 | 결과 |
|---|---|---|
| 1 | **AC 매핑** — 모든 AC 가 디자인 요소로 매핑되는가 | ✅ §9.1(task AC-1~3) · §9.2(s1 AC-U1~U5 + §5·§9.4·§12). 위험 상태별 토큰(§2.2 4등급) 정의 완료 |
| 2 | **dev 구현 가이드** — dev 가 추측 없이 구현 가능한가 | ✅ §8 경로 재확인(루트 `demo/`)·클래스명·data-attribute 위험 매핑·datetime 포맷·envelope 키·재계산 순수함수·referenceNow 상수 명시 |
| 3 | **기존 요소 보존** — 기존 페이지/토큰 훼손 없는가 | ✅ 신규 base 색 0건, demo `:root` 값 계승(prefix 만 `--hgc-*`). s1 §12 보존 영역(auth/대시보드/게임/Docker) 참조·변경 없음. 담당 파일 `docs/design/**` 만 |
| 4 | **컴포넌트 매핑** — s1 데이터 모델 필드가 빠짐없이 UI 에 대응되는가 | ✅ D1~D5→DetailFieldGrid, D6→FollowUpEditor, D7→RiskBadge, D8→누락 안내 바. status 3종→StatusLabel, 위험 4종→배지+필터+요약. fixture 8건 전부 시각화 |
| 5 | **모호함 flag** — dev 재량/미확정 지점을 명시했는가 | ⚠️ 아래 flag |

**남은 모호함(dev 재량 · flag):**
- **위험 등급 글리프**(●▲◷◆)는 유니코드 예시 — 인라인 SVG 로 교체 가능(외부 아이콘 의존 금지 전제 유지). 색+라벨 이중 채널은 필수, 글리프는 보강.
- **datetime 표시 포맷** `YYYY-MM-DD HH:mm (KST)` 권장 — 값 원본 불변 하에 dev 최종 확정 가능.
- **filter UI 형태**를 탭(tablist)으로 확정했으나 s1 §6.1 은 "드롭다운/탭" 양자 허용 → 데스크톱 건수 노출 이점으로 탭 채택. 협소 공간 시 dev 가 select 폴백 가능(단 §7.1 키보드 계약 유지).
- **위험 요약 카드↔필터 탭 시각 구분**은 배경(muted vs surface)·비클릭 여부로 확정했으나, 두 영역을 하나로 합치는 대안은 채택하지 않음(혼동 방지, s1 §5.4 의도).
- 위 4건 모두 **UX 의도 불변 + s1 도메인 규칙(값/판정/범위) 불변** 범위의 표현 재량이다.
- **tech-stack 태그 불일치 잔여 리스크(dev 필독)**: Epic 태그 `typescript-monorepo` vs 관측 `vanilla-static`. 본 명세는 s1 가정 1 을 따라 vanilla-static·루트 `demo/` 경로를 채택했다. dev 는 이 경로 교정을 반드시 반영해야 라우트가 서빙된다(§8.0).

---

## mockup 참조

- **경로**: `docs/design/mockups/handoff-gap-canary-BF-1050.html` (single self-contained HTML · 외부 의존성 0건)
- 본 명세 §2 컬러 · §3 타이포 · §4 레이아웃 · §5 컴포넌트를 시각 동기화. 위험 요약 패널 · 위험 유형 필터 탭 · 2-pane 목록/상세 · 후속 액션 보완 입력 + 주요 상태 변형(미선택 placeholder · 필터 0건 · 검증 오류 · 로컬 보완됨 · **모바일 1-pane 뷰** · **키보드 포커스 흐름 데모**)을 `<section>` 으로 함께 표현.
- **시안 시각화 전용** — dev 실제 산출물 아님. dev 는 참조 가이드로 사용(픽셀 일치 의무 없음).

<!-- bf:pr-summary -->
### BF-1050 · 교대 인수인계 누락 점검 화면 디자인 시안 요약

교대 근무자용 **위험 요약 + 2-pane 점검 콘솔**(위험 요약 패널 + 위험 유형 필터 탭 + 인수인계 목록 + 상세 패널 + 후속 액션 로컬 보완) 디자인 명세 + self-contained mockup HTML. 관측 스택 **vanilla-static**(외부 의존 0건·system font·`:root` CSS 변수) 채택.

**산출물**
| 파일 | 내용 |
|---|---|
| `docs/design/handoff-gap-canary-BF-1050.md` | 명세(컬러/타이포/레이아웃/컴포넌트/a11y/dev 가이드/AC 매핑/self-critique) |
| `docs/design/mockups/handoff-gap-canary-BF-1050.html` | 시각 mockup(위험 요약 + 2-pane + 필터 + 후속 액션 + 모바일·키보드 데모) |

**위험 상태별 디자인 토큰 (신규 base 색 0건 — `src/app/demo/*` `:root` 계승, prefix `--hgc-*`)**
| 위험 등급 | `--hgc-*` 토큰(fg / tint) | HEX | 글리프 | 대비 |
|---|---|---|---|---|
| 정상 `normal` | `--hgc-color-normal` / `-tint` | `#1a7f37` / `#e4f4e9` | ● | ~4.7:1 AA |
| 데이터 누락 `data_gap` | `--hgc-color-gap` / `-tint` | `#8a5a00` / `#fbf3d9` | ▲ | ~5.6:1 AA |
| 기한 초과 `deadline_exceeded` | `--hgc-color-overdue` / `-tint` | `#a5471d` / `#fbeae0` | ◷ | ~5.1:1 AA |
| 복합 위험 `critical` | `--hgc-color-critical` / `-tint` | `#b3261e` / `#fdecec` | ◆ | ~5.9:1 AA |

**AC 충족**: AC-1(화면요소↔AC 매핑 + 위험 상태별 토큰 정의) · AC-2(모바일 반응형 3단 + 키보드 포커스 흐름 mockup 반영) · AC-3(vanilla ESM·외부 의존 0건). 위험 등급 4종·status 3종·fixture 8건 전부 시각화. 위험 3중 인코딩(색+글리프+라벨) 색맹 안전.

**Self-critique**: 5개 항목 통과. 잔여 모호함은 UX 의도·도메인 규칙 불변 범위의 dev 표현 재량(글리프 SVG 교체 / datetime 포맷 / 필터 탭 vs select)으로 flag. tech-stack 태그 불일치는 vanilla-static·루트 `demo/` 경로 채택으로 해소(§8.0, dev 필독).
<!-- /bf:pr-summary -->
