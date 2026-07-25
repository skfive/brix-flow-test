# 상태 센터(Sync Status Center) UI 디자인 명세 · BF-1163

> 작성자: [이디자인] (designer) · 작성일 2026-07-25 · **rev2**(리뷰 BF-1163 conditional 반영: 4-state → planner 6-state 정렬)
> primary-module: `sync-status` — 저장소 동기화 현황 대시보드(요약·필터·저장소별 액션·전체 새로고침·오류 원인/재시도)
> 의존 Task: BF-1162(planner 기획 명세, branch `chore/BF-1162-kpi`) — **저장소 상태 모델(§2 6종: idle/up_to_date/behind/syncing/conflict/failed)·§11 접근성 대비 요건(배지 전경/배경 4.5:1)·KPI 2종**의 원천. 본 시안의 상태 라벨·배지 색·대비는 이 문서를 1:1 기준으로 삼는다.
> 참조(수정 금지): `docs/design/summary-board-BF-1086.md`(라이트 공용 토큰 셋·필터 세그먼트·빈 상태 2종), `docs/design/oncall-handoff-BF-1139.md`(색 비의존 3중 인코딩·좌측 rail·WCAG 대비 검증표·view-state 패턴)
> mockup 참조: `docs/design/mockups/sync-status-center-BF-1163.html`
>
> **rev2 변경 요약(리뷰 반영)**: 초안은 자체 4-state(synced/syncing/pending/error)로 정의해 planner BF-1162 §2 의 6-state(idle/up_to_date/behind/syncing/**conflict**/failed)와 라벨·개수가 불일치했다. 이로 인해 개발자가 `conflict` 배지에 미검증 `warning` 토큰(`#D97706`/`#FEF3E2` ≈ 2.9:1, §11 4.5:1 미달)을 자체 확장하는 근본 원인을 제공했다. rev2 는 (1) 상태 모델 전체를 planner 6-state 로 재정렬하고 (2) 신규 3개 상태(idle/behind/**conflict**)에 대비 검증된 semantic 토큰을 정의(§2.2)하며 (3) 6-state 전체 WCAG 대비 검증표를 §8.5 에 보강한다. 개발자는 `conflict` 배지에 `--color-warning` 대신 **`--color-conflict`(`#6D28D9`)/`--color-conflict-soft`(`#F3E8FF`)**(≈6.1:1)를 사용한다.

> **기술 스택 가정(명시)**: 요청 설명에는 `typescript-monorepo` 마커가 있으나 저장소 관측 규약(`base_sha` 기준)은 **vanilla-static**(npm, ESM, 정적 서빙 root `.`)이며 불일치한다(REPO_CONVENTION_CAPSULE `stack_mismatch:true`). 본 시안은 프레임워크를 규정하지 않고 **공용 중립 토큰 셋만** 사용해 컬러/타이포/레이아웃/컴포넌트를 정의한다. 신규 패키지·외부 CDN·외부 폰트 로드는 **0건**, 모든 토큰은 mockup `:root` 에서 직접 정의한다. typescript-monorepo 로 구현될 경우 §2.4 매핑 표로 `design-tokens.json` semantic 토큰에 1:1 대응시킨다(design-tokens 파일 직접 수정은 운영자 승인 전까지 하지 않음).

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 · 반응형](#4-레이아웃--반응형)
5. [동기화 상태 시각 규칙(6-state)](#5-동기화-상태-시각-규칙6-state)
6. [컴포넌트 명세](#6-컴포넌트-명세)
7. [오류 원인 · 재시도 안내 UI](#7-오류-원인--재시도-안내-ui)
8. [접근성 규격(키보드·포커스·aria-live·reduced-motion)](#8-접근성-규격키보드포커스aria-livereduced-motion)
9. [dev 구현 가이드](#9-dev-구현-가이드)
10. [AC ↔ UI 매핑 표](#10-ac--ui-매핑-표)
11. [mockup 참조](#11-mockup-참조)
12. [Self-critique](#12-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

여러 저장소(repository)의 동기화 상태를 한 화면에서 조망·조작하는 **상태 센터 단일 화면**의 시안을 정의한다. 아래 6개 UI 영역을 다룬다.

| 영역 | 역할 | AC 근거 |
|---|---|---|
| 요약 카드 바 | 전체 저장소 수 · 상태별 분포(미확인/최신/지연/동기화중/충돌/실패) · 충돌·실패 강조 · 마지막 전체 동기화 시각 | AC-1(상태별 시각 구분) |
| 전체 새로고침 액션 | 헤더의 `전체 새로고침` 버튼 → 모든 저장소 상태 재조회, 진행/결과를 aria-live 로 안내 | AC-2(aria-live), AC-3(새로고침) |
| 필터 바 | 상태별 세그먼트(전체/미확인/최신/지연/동기화중/충돌/실패) 단일 축 필터 | AC-3(필터) |
| 저장소 목록 | 저장소별 행 — 이름 · 상태 배지 · 마지막 동기화 시각 · `지금 확인`/`재시도` 액션 버튼 | AC-1, AC-3(동기화) |
| 오류/충돌 원인·재시도 | `failed`·`conflict` 행의 확장 영역 — 원인 문구 + `재시도` 버튼 + 안내 | AC-3(오류 UI) |
| 빈 상태 | 저장소 0건 / 필터 결과 0건 | AC-3(필터 0건) |

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| **실패·충돌을 가장 먼저 포착** | 요약 바의 "실패"(danger)·"충돌"(violet) 타일을 강조 + 목록 기본 정렬 `실패 → 충돌 → 지연 → 동기화중 → 최신 → 미확인` 으로 스캔 첫 행이 급한 것 |
| **상태를 색 없이도 구분** | 6-state 를 **색 + 한글 라벨 + glyph + 좌측 rail 두께** 로 인코딩(§5). 색상만으로 구분되는 정보 0건 |
| **개별 vs 전체 액션 혼동 방지** | 전체 새로고침은 헤더(전역), 저장소별 `지금 확인`/`재시도`는 각 행(지역)으로 위치·레벨을 분리 |
| **실패·충돌에서 다음 행동이 명확** | `failed`·`conflict` 행은 원인 문구 + `재시도` 버튼을 카드 안에 인라인 노출 — 무엇이 왜 막혔고 무엇을 누르면 되는지 한 카드에서 완결 |
| **진행 상태를 조용히 안내** | `동기화 중`은 회전 인디케이터로 표현하되, 상태 전이(시작/성공/실패)는 화면 밖 SR 사용자를 위해 aria-live 로 문장 안내. `prefers-reduced-motion` 시 애니메이션 정지·정적 대체 |

### 1.3 시각 톤

톤은 "개발자 운영 콘솔의 차분한 상태판". 라이트 surface 기반(장시간 응시보다 주간 대시보드 사용 맥락). 장식은 0, 강조는 컬러 배지·좌측 rail·1px 경계선·여백으로만.

---

## 2. 컬러 팔레트

기존 brix-flow-test 라이트 공용 중립 토큰 셋(`summary-board-BF-1086` 과 동일 기반)을 사용하되, planner 6-state 표현을 위해 `idle`(slate)·`behind`(amber)·`conflict`(violet) 3개 semantic 토큰을 §11 대비 요건에 맞춰 추가 정의한다. 모두 mockup `:root` 에 직접 정의(외부 의존성 0건).

### 2.1 기본 팔레트

| 역할 | 토큰 변수 | HEX | 용도 |
|---|---|---|---|
| primary | `--color-primary` | `#2563EB` | 주요 버튼(전체 새로고침·재시도), 강조 수치, 포커스 링 |
| primary hover | `--color-primary-hover` | `#1D4ED8` | 주요 버튼 hover |
| primary soft | `--color-primary-soft` | `#EAF1FE` | primary 소프트 배경 |
| background | `--color-bg` | `#F7F8FA` | 페이지 배경 |
| surface | `--color-surface` | `#FFFFFF` | 카드·바·행 표면 |
| surface raised | `--color-surface-raised` | `#FBFCFE` | 오류 확장 영역 배경(한 단계 구분) |
| border | `--color-border` | `#E2E5EA` | 구분선·입력/버튼 테두리·트랙 |
| text | `--color-text` | `#1F2430` | 본문 텍스트 |
| text muted | `--color-text-muted` | `#6B7280` | 보조 텍스트·캡션·타임스탬프 |

### 2.2 동기화 상태 semantic 토큰 (planner 6-state 축)

**planner BF-1162 §2 의 6-state 를 1:1 로 매핑한다**(상태 ID·한글 라벨은 planner 원문 그대로). 각 상태 = `텍스트/보더 토큰` + `배경 soft 토큰` 1세트. 라벨·glyph 와 함께 §5 에서 시각 인코딩되고, 모든 배지 조합의 전경/배경 대비는 §11(4.5:1) 충족을 §8.5 에서 계산·검증했다.

| planner 상태 ID | 한글 라벨(표시) | semantic | 텍스트/보더 토큰 | 배경 soft 토큰 | HEX(text / soft) | 배지 대비(§8.5) |
|---|---|---|---|---|---|---|
| `idle` | 미확인 | neutral | `--color-idle` | `--color-idle-soft` | `#334155` / `#F1F5F9` | **9.4:1** ✅ |
| `up_to_date` | 최신 | success | `--color-success` | `--color-success-soft` | `#15803D` / `#ECFDF3` | **4.9:1** ✅ |
| `behind` | 지연 | caution | `--color-behind` | `--color-behind-soft` | `#9A3412` / `#FEF3E2` | **6.7:1** ✅ |
| `syncing` | 동기화중 | info | `--color-info` | `--color-info-soft` | `#0E7490` / `#E0F2FE` | **4.9:1** ✅ |
| `conflict` | 충돌 | conflict(violet) | `--color-conflict` | `--color-conflict-soft` | `#6D28D9` / `#F3E8FF` | **6.1:1** ✅ |
| `failed` | 실패 | danger | `--color-danger` | `--color-danger-soft` | `#DC2626` / `#FEE2E2` | **4.6:1** ✅ |

> **`conflict` 는 전용 violet 토큰(`--color-conflict`)으로 정의한다** — 초안이 `conflict` 토큰을 누락해 개발자가 `--color-warning`(`#D97706`/`#FEF3E2` ≈ 2.9:1, §11 미달)을 자체 확장한 리뷰 지적(rev2)을 해소. violet 은 danger(red)·behind(amber)와 색상(hue)까지 구분되어 색약 환경에서도 실패↔충돌을 혼동하지 않는다.
> `behind` 는 amber-warm(`#9A3412`, orange-800)으로 "동기화 권장(주의)" 톤을 전달하되 §11 대비를 위해 어두운 톤을 채택(밝은 `#D97706` 는 4.5:1 미달이라 배지 텍스트로 부적합).
> `up_to_date`(success) text 는 라이트 배경 대비 확보를 위해 `#15803D`(green-700)로 정의(`#16A34A`(3.9:1) 대비 상향).
> `--color-warning`(`#D97706`)은 **상태 배지 축에서 제외**한다(대비 미달). 비텍스트 강조(큰 수치·dot 등, ≥3:1 large-text 기준)에 한해 선택적으로만 사용 가능.

### 2.3 색 비의존 인코딩 원칙 (핵심)

상태는 **색 하나로 구분하지 않는다**. 아래 3중 인코딩을 항상 병기한다.

1. **색** — semantic text/soft(6-state 각 hue 구분: neutral/green/amber/cyan/violet/red)
2. **한글 라벨** — 배지 텍스트(`미확인`/`최신`/`지연`/`동기화중`/`충돌`/`실패`, planner §2 라벨)
3. **형태** — 배지 선행 glyph + 저장소 행 좌측 rail 두께(개입 필요한 `conflict`·`failed` 만 4px, 나머지 3px)

→ 색약·저조도 환경에서도 라벨·glyph·rail 두께로 상태 판별 가능(§8).

### 2.4 typescript-monorepo 구현 시 토큰 매핑 (참조)

관측 스택은 vanilla-static 이나, 요청 마커대로 typescript-monorepo(`design-tokens.json` + shadcn/ui)로 구현될 경우 아래로 대응한다. **본 PR 은 design-tokens.json 을 수정하지 않으며**, 아래는 dev 매핑 가이드일 뿐이다.

| 본 시안 토큰 | 상태 | design-tokens.json semantic(권장 매핑) | shadcn/ui 대응 |
|---|---|---|---|
| `--color-primary` | — | `colors.primary.DEFAULT` | `Button` default |
| `--color-idle` / `-soft` | idle 미확인 | `colors.muted.*`(slate) | `Badge` secondary variant |
| `--color-success` / `-soft` | up_to_date 최신 | `colors.success.*` | `Badge` success variant |
| `--color-behind` / `-soft` | behind 지연 | `colors.warning.*`(어두운 amber 변형) | `Badge` warning variant |
| `--color-info` / `-soft` | syncing 동기화중 | `colors.info.*` | `Badge` info variant |
| `--color-conflict` / `-soft` | conflict 충돌 | `colors.violet.*` 신규 semantic | `Badge` 커스텀 violet variant |
| `--color-danger` / `-soft` | failed 실패 | `colors.destructive.*` | `Badge`/`Alert` destructive variant |
| `--color-surface` / `--color-bg` | — | `colors.card` / `colors.background` | `Card` |

> hardcoded 색상 금지 규약(typescript-monorepo) 준수: 컴포넌트는 semantic 토큰만 참조하고 HEX 리터럴은 토큰 정의 지점에만 존재.

---

## 3. 타이포그래피

system font stack 만 사용(외부 폰트 로드 0건).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
--font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

- **mono 의 역할**: 저장소 식별자(`org/repo`)·타임스탬프(`14:02`, `datetime`)만 mono. 서술 텍스트는 sans. "이건 실제 값"임을 폰트로 전달.

| 역할 | font-size | line-height | weight | 색상 | 용도 |
|---|---|---|---|---|---|
| page title | 22px | 30px | 700 | text | "상태 센터" |
| section heading | 15px | 22px | 600 | text | 목록/필터 섹션 제목 |
| KPI value | 24px | 30px | 700 | text(강조 시 semantic) | 요약 타일 수치 |
| KPI label | 12px | 16px | 500 | text-muted | 요약 타일 라벨 |
| repo name | 15px | 22px | 600 | text | 저장소 식별자(mono 병용) |
| body | 14px | 20px | 400 | text | 오류 원인·안내 문구 |
| caption / meta | 12px | 16px | 400 | text-muted | 마지막 동기화 시각(mono) |
| badge | 12px | 16px | 600 | semantic | 상태 배지 라벨 |
| button | 14px | 20px | 500 | 문맥별 | 액션 버튼 |

---

## 4. 레이아웃 · 반응형

### 4.1 섹션 구조 (세로 흐름)

```
┌───────────────────────────────────────────────────────┐
│ 헤더: "상태 센터"(제목)  ·············  [↻ 전체 새로고침]  │
│  └ aria-live 안내 영역(sr 전용, 시각적으로도 상태 텍스트) │
├───────────────────────────────────────────────────────┤
│ 요약 카드 바 (전체+6-state = 7 stat 타일, 반응형 그리드)  │
│  전체 · 미확인 · 최신 · 지연 · 동기화중 · 충돌 · 실패(강조)│
├───────────────────────────────────────────────────────┤
│ 필터 바 (세그먼트: 전체/미확인/최신/지연/동기화중/충돌/실패)│
├───────────────────────────────────────────────────────┤
│ 저장소 목록  또는  빈 상태                                │
│  └ 행: [rail] 저장소명 · 상태배지 · 마지막동기화 · [동기화] │
│  └ 오류 행: 위 + 확장 영역(원인 문구 + [재시도])           │
└───────────────────────────────────────────────────────┘
```

### 4.2 컨테이너 · spacing · radius

- 최대 너비: `880px`, 중앙 정렬(`margin: 0 auto`), 좌우 패딩 `var(--space-4)`.

```css
--space-1: 4px; --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
--radius-card: 12px; --radius-item: 10px; --radius-btn: 8px; --radius-pill: 999px;
```

- 섹션 간 세로 간격 `var(--space-5)`, 카드 내부 패딩 `var(--space-4)`.
- 저장소 행 좌측 rail 폭: 3px(정상 계열) / 4px(오류) — 색 비의존 형태 신호.

### 4.3 breakpoint 별 동작

| 구간 | 요약 그리드 | 헤더 | 저장소 행 |
|---|---|---|---|
| ≥ 720px(기본) | `auto-fit minmax(116px,1fr)`(전체+6-state = 7 타일 자동 배치) | 제목(좌) ↔ 전체 새로고침(우) 가로 | `[rail] 이름 1fr · 배지 · 시각 · 버튼` 한 줄 |
| < 720px(모바일) | 2열(`repeat(2, 1fr)`), 충돌·실패 타일은 전체폭 우선 | 제목/버튼 세로 스택, 버튼 전체폭 | 행 내부 2줄 wrap: (이름+배지) / (시각+버튼). `conflict`·`failed` 확장 영역 세로 |

- 미디어쿼리 1개(`@media (max-width: 720px)`). 배지·버튼은 `flex-shrink:0`, 저장소명이 먼저 줄바꿈(`overflow-wrap:anywhere`).

---

## 5. 동기화 상태 시각 규칙(6-state)

> 본 표가 AC-1("상태별 시각 구분")의 **핵심 산출물**이다. planner BF-1162 §2 의 6-state 를 1:1 로 시각 인코딩하며, mockup 에 6상태 행을 나란히 렌더한다. 배지 색 대비는 전부 §8.5 에서 계산 검증(≥4.5:1).

| planner 상태 ID | 라벨(표시) | glyph(aria-hidden) | semantic | text/soft HEX | 좌측 rail | 액션 버튼(§planner §5) |
|---|---|---|---|---|---|---|
| `idle` | `미확인` | `○` | neutral | `#334155` / `#F1F5F9` | 3px slate | `지금 확인`(활성) |
| `up_to_date` | `최신` | `✓` | success | `#15803D` / `#ECFDF3` | 3px green | `지금 확인`(활성) |
| `behind` | `지연` | `↧` | caution amber | `#9A3412` / `#FEF3E2` | 3px amber | `지금 확인`(활성, 권장 강조) |
| `syncing` | `동기화중` | `◐`(회전) | info | `#0E7490` / `#E0F2FE` | 3px cyan | `확인 중…`(**비활성**, §planner §5) |
| `conflict` | `충돌` | `⇆` | conflict violet | `#6D28D9` / `#F3E8FF` | **4px** violet | `재시도`(활성) + 확장 원인 영역 |
| `failed` | `실패` | `⚠` | danger | `#DC2626` / `#FEE2E2` | **4px** red | `재시도`(활성) + 확장 원인 영역 |

- **배지 형태**: soft 배경 + semantic 텍스트 pill, 선행 glyph(`aria-hidden`) + 한글 라벨. `role="img"` + `aria-label="동기화 상태: {라벨}"`.
- **`conflict`·`failed` 만** rail 4px + 카드 하단 확장 영역(원인+재시도) → "가장 두꺼운 것 = 수동 개입 필요"를 형태로도 전달(oncall-handoff §2.3 패턴 승계). 두 상태는 색상 hue(violet↔red)와 glyph(`⇆`↔`⚠`)로도 구분.
- **버튼 라벨은 planner §5 화면 전이 표를 그대로 따른다**: `idle`/`up_to_date`/`behind` → `지금 확인`, `conflict`/`failed` → `재시도`, `syncing` → `확인 중…`(disabled). 개발자는 이 lookup 을 재해석하지 않는다.
- **정렬 기본값**: `실패 → 충돌 → 지연 → 동기화중 → 최신 → 미확인`(급한 것 위로). 필터 적용 시 해당 상태만(§9.3 severity).

### 5.1 상태 전이와 aria-live (AC-2)

전이 규칙은 planner §3.3(트리거→syncing→fixture outcome 4종)을 시각/안내 관점으로 표현한 것이다. 트리거는 `check`(지금 확인)·`retry`(재시도) 2종, 최종 상태는 `up_to_date`/`behind`/`conflict`/`failed` 중 하나.

| 전이 | 트리거 | aria-live 안내 문구(예시) | politeness |
|---|---|---|---|
| idle/up_to_date/behind → syncing | 행 `지금 확인` 클릭 또는 전체 새로고침 | "`{repo}` 동기화를 시작했습니다." | polite |
| conflict/failed → syncing | 행 `재시도` 클릭 | "`{repo}` 재시도를 시작했습니다." | polite |
| syncing → up_to_date | fixture `clean` | "`{repo}` 최신 상태입니다." | polite |
| syncing → behind | fixture `stale` | "`{repo}` 원격에 반영할 변경이 있습니다(지연)." | polite |
| syncing → conflict | fixture `conflict` | "`{repo}` 충돌이 발생했습니다. 수동 해결이 필요합니다." | **assertive** |
| syncing → failed | fixture `error` | "`{repo}` 동기화에 실패했습니다. 원인: {reason}" | **assertive** |
| 전체 새로고침 완료 | 모든 저장소 재조회 종료 | "전체 새로고침 완료 — 최신 {n}, 충돌 {c}, 실패 {m}." | polite |

- 수동 개입이 필요한 `conflict`·`failed` 도달만 `aria-live="assertive"`(즉시 안내), 나머지는 `polite`. planner §11 은 상태 변경 영역 `aria-live="polite"` 를 최소 요건으로 요구하며, 본 시안은 개입 필요 상태에 한해 assertive 로 강화한다.

---

## 6. 컴포넌트 명세

props 는 developer 가 렌더 함수 시그니처로 쓸 수 있도록 명시. 상태/인터랙션 포함.

### 6.1 헤더 + 전체 새로고침 (`.center-header`)

- **props**: `lastRefreshedAt`(표시용), `isRefreshing:boolean`.
- **구성**: 좌측 page title `상태 센터`, 우측 `전체 새로고침` primary 버튼(선행 `↻` glyph). 버튼 아래(또는 헤더 하단)에 `aria-live` 안내 영역.
- **상태**:
  - default: 버튼 활성.
  - refreshing: 버튼 `aria-busy="true"` + 라벨 `새로고침 중…` + `disabled`(중복 클릭 방지). 완료 시 원복.
- **인터랙션**: 클릭 → 전체 저장소 상태 재조회, 진행/결과를 §5.1 aria-live 로 안내. 개별 행 버튼과 위치/레벨 분리(전역 vs 지역).

### 6.2 요약 카드 바 (`.summary-bar`)

- **props**: `total`, `counts:{idle, up_to_date, behind, syncing, conflict, failed}`, `lastFullSyncAt`(표시용).
- **구성 타일**(전체 + 6-state = 7 타일, `auto-fit minmax(116px,1fr)` 반응형 그리드):
  1. 전체 저장소 — value=`total`, neutral.
  2. 미확인 — value=`counts.idle`, neutral(slate).
  3. 최신 — value=`counts.up_to_date`, success.
  4. 지연 — value=`counts.behind`, caution amber.
  5. 동기화중 — value=`counts.syncing`, info.
  6. 충돌 — value=`counts.conflict`, **violet 강조**.
  7. 실패 — value=`counts.failed`, **danger 강조**(가장 눈에 띄게).
- 각 타일: `KPI value`(24/700) + `KPI label`(12/500 muted) + 상태 dot(semantic, `aria-hidden`). 충돌·실패 타일은 값 semantic 색 + soft 배경 테두리. (타일 큰 수치 24px/700 은 large-text 3:1 기준으로 dot·값 색 모두 통과.)
- **BF-1162 연계**: 상태 분포 수치는 단순 `groupBy(repos, state)`이며 planner KPI-1(평균 확인 비용)·KPI-2(재시도 성공률)와는 별개 지표다. 두 KPI 를 함께 노출할 경우 `#kpi-summary`(planner §6.1) 영역을 재사용하고 중복 계산하지 않는다.
- **상태**: 데이터 0건 → 모든 값 `0`, 충돌·실패 타일 강조 해제(0은 강조 아님, neutral 톤). `lastFullSyncAt` 없으면 `—`.
- **인터랙션**: 정적 표시(요약 타일 클릭으로 필터 연동은 선택 — 기본은 비인터랙티브).

### 6.3 필터 바 (`.filter-bar`)

- **props**: `statusFilter`(`all`|`idle`|`up_to_date`|`behind`|`syncing`|`conflict`|`failed`, 기본 `all`).
- **구성**: 세그먼트 버튼 `전체`/`미확인`/`최신`/`지연`/`동기화중`/`충돌`/`실패`. 선택 항목 = 해당 semantic soft 채움 + border 강조, 비선택 = surface + border. 각 버튼에 상태별 건수 배지(선택) 표기 가능.
- **상태**: 단일 축 필터(상태 하나). 세션 UI 상태(영속화 안 함). 결과 0건 → `.empty-state--no-match`.
- **인터랙션**: 클릭 시 목록 즉시 재필터. `role="group"` + 각 버튼 `aria-pressed`(§8.1).

### 6.4 저장소 행 (`.repo-row`)

- **props**: `{ id, name(`org/repo`), status(planner 6-state), lastSyncedAt, error?:{reason, code?} }`. `status` 는 `data-state` 속성(planner §6.1: `data-state="idle|up_to_date|behind|syncing|conflict|failed"`)으로 DOM 에 반영.
- **레이아웃**: `<li>`, 좌측 rail(`::before`, §5 두께), 한 줄 그리드 = `저장소명(mono, 1fr)` · `상태 배지` · `마지막 동기화 시각(mono time, muted)` · `액션 버튼`.
- **액션 버튼(`.repo-row__sync`)**: `<button type="button">`, 라벨은 planner §5 lookup — `idle`/`up_to_date`/`behind` → `지금 확인`, `conflict`/`failed` → `재시도`, `syncing` → `확인 중…`(`aria-busy` + `disabled`).
- **상태**:
  - idle/up_to_date/behind: 기본 표시, `지금 확인` 버튼 활성.
  - syncing: 배지 회전 glyph + 버튼 busy/disabled(planner §5 비활성 규칙, AC-05).
  - conflict/failed: rail 4px + 하단 확장 영역(§6.5) 노출 + `재시도` 활성.
- **정렬**: §5 기본 정렬. 필터 시 해당 상태만.
- **인터랙션**: 행 자체는 클릭 대상 아님(버튼만 인터랙티브). 마지막 동기화 시각은 `<time datetime="ISO">`.

### 6.5 원인/재시도 확장 (`.repo-row__error`) — `conflict`·`failed` 조건부

- **props**: `status`(`conflict`|`failed`), `reason:{text, code?}`, `onRetry`.
- **형태**: 행 하단 raised 배경 확장 영역, 좌측 semantic 4px 연장 rail(`failed`=danger red, `conflict`=violet). 구성 = glyph(`failed`=`⚠` / `conflict`=`⇆`, aria-hidden) + **원인 문구**(예: "인증 토큰이 만료되었습니다 (401)" / "로컬·원격 변경이 충돌합니다") + `재시도` 버튼 + 보조 안내(muted, 예: "토큰 갱신 후 다시 시도하세요" / "충돌 해결 후 재시도하세요").
- **상태**: `conflict`·`failed` 일 때만 렌더(planner §5: 두 상태 모두 `retry` 트리거 허용). `재시도` 클릭 → 해당 저장소만 재동기화(syncing 전이, §5.1 aria-live). 재시도 중 버튼 busy/disabled.
- **접근성**: 확장 영역 `role="alert"`(등장 시 SR 안내) 또는 `aria-live="assertive"` 컨테이너와 연동. 원인 문구는 색이 아니라 **텍스트로** 전달(색 비의존) — `conflict`(violet)와 `failed`(red)를 glyph·문구로 구분.

### 6.6 빈 상태 (`.empty-state`)

- **props**: `variant`(`no-data`|`no-match`).

| variant | 조건 | 제목 | 보조 문구 |
|---|---|---|---|
| `no-data` | 등록 저장소 0건 | "표시할 저장소가 없습니다" | "저장소를 연결하면 동기화 상태가 여기에 표시됩니다." |
| `no-match` | 필터 결과 0건 | "조건에 맞는 저장소가 없습니다" | "필터를 변경하면 다른 결과를 볼 수 있어요." |

- **형태**: surface 카드 중앙 정렬, glyph + 제목 + 보조 문구(muted). 고정 문구(재해석 금지).

### 6.7 상태 배지 (`.status-badge`)

- **props**: `status`(planner 6-state). §5 매핑. soft 배경 pill + 선행 glyph + 한글 라벨. `role="img"` + `aria-label="동기화 상태: {라벨}"`. 색상 외 라벨·glyph 항상 병기(색 비의존, planner §11).

---

## 7. 원인 · 재시도 안내 UI — `failed`·`conflict` (AC-3 대응)

수동 개입이 필요한 두 상태(`failed` 실패, `conflict` 충돌)에서 "무엇이 왜 막혔고 다음에 무엇을 하면 되는지"를 한 카드에서 완결한다. planner §2 상 `conflict` 는 `failed`(오류)와 별개의 상태이므로 배지 색(violet↔red)·glyph·원인 문구로 구분한다.

### 7.1 원인 문구 패턴

| 상태 / 유형(예시) | 원인 문구(text, 색 비의존) | 보조 안내 |
|---|---|---|
| `failed` · 인증 실패 | "인증 토큰이 만료되었습니다 (401)" | "토큰 갱신 후 다시 시도하세요." |
| `failed` · 네트워크 | "원격 저장소에 연결할 수 없습니다 (timeout)" | "네트워크 상태 확인 후 재시도하세요." |
| `failed` · 권한 | "저장소 접근 권한이 없습니다 (403)" | "저장소 권한을 확인하세요." |
| `conflict` · 충돌 | "로컬 변경과 원격 변경이 충돌합니다" | "충돌 해결 후 다시 동기화하세요." |

- 원인 문구는 **항상 텍스트**로 표기(색만으로 오류를 알리지 않음). `code`(예: 401)는 mono 병기 권장.

### 7.2 재시도 규칙

- `재시도` 버튼 클릭 → 해당 저장소만 `syncing` 전이(§5.1), 성공 시 배지 `최신`(up_to_date)·확장 영역 닫힘, 재실패(`conflict`/`failed` 재도달) 시 원인 문구 갱신.
- 재시도 중 버튼 `aria-busy="true"` + `disabled` + 라벨 `재시도 중…`(중복 클릭 방지).
- 전체 새로고침(§6.1)과 독립 — 개별 재시도는 전체를 트리거하지 않는다.

---

## 8. 접근성 규격(키보드·포커스·aria-live·reduced-motion) (AC-2 대응)

### 8.1 키보드 탐색

| 요소 | 규격 |
|---|---|
| 인터랙티브 | 전부 네이티브 `<button type="button">`. 임의 양수 `tabindex` 금지 |
| Tab 순서 | DOM 순서 = 시각 순서: 전체 새로고침 → 필터 세그먼트(좌→우) → 저장소 행(위→아래, 각 행 `동기화`/`재시도`) |
| 필터 세그먼트 | `role="group"` `aria-label="상태 필터"`, 각 버튼 `aria-pressed="true|false"`. 화살표키 이동은 선택(기본 Tab 이동으로 충분) |
| 행 자체 | 클릭 대상 아님 — 버튼만 포커스 가능. 카드 전체를 링크/버튼으로 감싸지 않음 |

### 8.2 포커스 가시성

- 전 인터랙티브 `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`.
- 전역 `outline: none` 리셋 **금지**. 포커스 링은 배경 대비 3:1 이상(§8.5).

### 8.3 aria-live 안내

- 헤더 하단에 시각적 상태 텍스트 겸 `aria-live` 컨테이너 2종:
  - `aria-live="polite"` `aria-atomic="true"` — 시작/완료/전체 새로고침 결과(§5.1).
  - `aria-live="assertive"` — 동기화 실패(즉시 안내).
- 오류 확장 영역(§6.5)은 `role="alert"` 로 등장 시 안내.
- 버튼 busy 상태는 `aria-busy="true"` 로 SR 에 진행 전달.

### 8.4 reduced-motion

- `동기화 중` 회전 인디케이터(`◐` spin, 스켈레톤 펄스 포함)는 `@media (prefers-reduced-motion: reduce)` 에서 `animation: none`.
- 애니메이션 정지 시 정적 대체: glyph 는 정지 상태로 유지되고 **라벨 `동기화 중…` 텍스트**가 진행을 전달(모션 없이도 상태 인지 가능). 인위적 지연·자동 반복 금지.

### 8.5 WCAG 대비 검증표 (라이트 — 텍스트 4.5:1 / UI 경계 3:1) — 계산값

> **planner §11 요건**("배지 전경/배경 명도 대비 4.5:1 이상")을 **6-state 배지 전부**에 대해 sRGB 상대휘도(WCAG 2.1 정의: `L = 0.2126·R + 0.7152·G + 0.0722·B`, 채널 선형화 후, 대비 `= (L₁+0.05)/(L₂+0.05)`)로 계산했다. 6개 배지 조합 모두 4.5:1 이상.

**① 6-state 배지 (전경 text / 배경 soft) — 기준 4.5:1**

| planner 상태 | 전경 | 배경 | 대비비 | 판정 |
|---|---|---|---|---|
| `idle` 미확인 | `--color-idle` `#334155` | `--color-idle-soft` `#F1F5F9` | **9.4:1** | ✅ AAA |
| `up_to_date` 최신 | `--color-success` `#15803D` | `--color-success-soft` `#ECFDF3` | **4.9:1** | ✅ |
| `behind` 지연 | `--color-behind` `#9A3412` | `--color-behind-soft` `#FEF3E2` | **6.7:1** | ✅ AAA |
| `syncing` 동기화중 | `--color-info` `#0E7490` | `--color-info-soft` `#E0F2FE` | **4.9:1** | ✅ |
| `conflict` 충돌 | `--color-conflict` `#6D28D9` | `--color-conflict-soft` `#F3E8FF` | **6.1:1** | ✅ AAA |
| `failed` 실패 | `--color-danger` `#DC2626` | `--color-danger-soft` `#FEE2E2` | **4.6:1** | ✅ |

**② 본문·UI 경계 — 기준 4.5:1(텍스트) / 3:1(경계)**

| 전경 | 배경 | 대비비 | 기준 | 판정 |
|---|---|---|---|---|
| `--color-text` `#1F2430` | `--color-surface` `#FFFFFF` | **15.3:1** | 4.5 | ✅ AAA |
| `--color-text-muted` `#6B7280` | `--color-surface` `#FFFFFF` | **4.8:1** | 4.5 | ✅ (캡션/타임스탬프) |
| primary 버튼 텍스트 `#FFFFFF` | `--color-primary` `#2563EB` | **4.6:1** | 4.5 | ✅ |
| 포커스 링 `#2563EB` | `--color-surface` `#FFFFFF` | **4.6:1** | 3 | ✅ (UI 경계) |
| `--color-danger` rail `#DC2626` | `--color-surface` `#FFFFFF` | **4.5:1** | 3 | ✅ (UI 경계) |
| `--color-conflict` rail `#6D28D9` | `--color-surface` `#FFFFFF` | **6.7:1** | 3 | ✅ (UI 경계) |

> **리뷰 반영(rev2)**: 초안은 `conflict` 배지 토큰을 정의하지 않아 개발자가 `--color-warning`(`#D97706` on `#FEF3E2` ≈ **2.9:1**, 4.5:1 미달)을 자체 확장했다. rev2 는 `conflict` 를 전용 violet(`#6D28D9`/`#F3E8FF` = **6.1:1**)으로 정의해 요건을 충족한다. 개발자는 `.status-badge--conflict` 전경/배경을 `--color-warning` → `--color-conflict`/`--color-conflict-soft` 로 교체하면 된다.
> `up_to_date`(success) text 는 `#16A34A`(3.9:1, 미달) 대신 **`#15803D`(green-700, 4.9:1)** 로 정의. 비텍스트 강조(dot/rail, ≥3:1 large-target 기준)에만 밝은 green 사용 가능.

---

## 9. dev 구현 가이드

mockup(`docs/design/mockups/sync-status-center-BF-1163.html`)을 시각 참조로 사용(픽셀 일치 의무 없음). 아래 CSS 변수·클래스 네이밍을 권장한다.

### 9.1 CSS 변수 (`:root` 직접 정의 — 외부 의존성 0)

```css
:root {
  --color-primary: #2563EB; --color-primary-hover: #1D4ED8; --color-primary-soft: #EAF1FE;
  --color-bg: #F7F8FA; --color-surface: #FFFFFF; --color-surface-raised: #FBFCFE;
  --color-border: #E2E5EA; --color-text: #1F2430; --color-text-muted: #6B7280;
  /* planner 6-state 배지 토큰 (전부 §8.5 에서 4.5:1 이상 검증) */
  --color-idle: #334155;     --color-idle-soft: #F1F5F9;      /* idle 미확인   9.4:1 */
  --color-success: #15803D;  --color-success-soft: #ECFDF3;   /* up_to_date 최신 4.9:1 */
  --color-behind: #9A3412;   --color-behind-soft: #FEF3E2;    /* behind 지연   6.7:1 */
  --color-info: #0E7490;     --color-info-soft: #E0F2FE;      /* syncing 동기화중 4.9:1 */
  --color-conflict: #6D28D9; --color-conflict-soft: #F3E8FF;  /* conflict 충돌 6.1:1 */
  --color-danger: #DC2626;   --color-danger-soft: #FEE2E2;    /* failed 실패   4.6:1 */
  /* --color-warning 은 상태 배지 축에서 제외(대비 미달). 비텍스트 강조에만 선택 사용 */
  --color-warning: #D97706;  --color-warning-soft: #FEF3E2;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --radius-card: 12px; --radius-item: 10px; --radius-btn: 8px; --radius-pill: 999px;
}
```

- typescript-monorepo 구현 시: 위 HEX 대신 §2.4 매핑으로 `design-tokens.json` semantic 참조. **hardcoded 색상 금지**.

### 9.2 클래스 네이밍(BEM 권장)

| 컴포넌트 | 루트 클래스 | 주요 하위 |
|---|---|---|
| 헤더/전체 새로고침 | `.center-header` | `.center-header__title`, `.center-header__refresh`, `.center-header__live`(aria-live) |
| 요약 바 | `.summary-bar` | `.summary-tile`, `.summary-tile__value`, `.summary-tile__label`, `.summary-tile__dot`, `.summary-tile--conflict`, `.summary-tile--failed` |
| 필터 바 | `.filter-bar` | `.segmented`, `.segmented__btn`, `.segmented__btn--active` |
| 저장소 목록 | `.repo-list` | `.repo-row`, `.repo-row--{status}`(status = planner 6-state), `.repo-row__name`, `.repo-row__time`, `.repo-row__sync`, `.repo-row__error` |
| 상태 배지 | `.status-badge` | `.status-badge--idle/up_to_date/behind/syncing/conflict/failed`, `.status-badge__glyph` |

> 배지/행 modifier 는 planner §6.1 `data-state` 값(`idle`/`up_to_date`/`behind`/`syncing`/`conflict`/`failed`)과 동일 문자열을 사용해 CSS 선택자(`.status-badge--conflict` 등)와 1:1 매칭한다.
| 빈 상태 | `.empty-state` | `.empty-state--no-data`, `.empty-state--no-match` |

### 9.3 상태 파생 · 정렬(의사코드)

```
// 오름차순 정렬 = 급한 것(수동 개입 필요) 위로. planner 6-state.
statusSeverity: failed → 0, conflict → 1, behind → 2, syncing → 3, up_to_date → 4, idle → 5
counts = groupBy(repos, r => r.status)   // {idle,up_to_date,behind,syncing,conflict,failed} — 요약 바
filtered = statusFilter === 'all' ? repos : repos.filter(r => r.status === statusFilter)
filtered.length === 0 → .empty-state--no-match
repos.length === 0    → .empty-state--no-data
```

### 9.4 상태 전환 패턴(view-state)

```css
/* 상태 전환은 CSS, JS 는 data-state 속성만 변경 (planner §6.1 + oncall-handoff §6 패턴) */
.repo-row[data-state="syncing"] .repo-row__sync  { /* busy 스타일 */ }
.repo-row[data-state="conflict"] .repo-row__error,
.repo-row[data-state="failed"]   .repo-row__error { display: block; }  /* 개입 필요 2상태만 확장 */
@media (prefers-reduced-motion: reduce) {
  .status-badge__glyph--spin { animation: none; }
}
```

### 9.5 접근성 최소 요건(요약)

- 인터랙티브는 `<button>`, 필터 세그먼트 `aria-pressed`, 배지 `role="img"`+`aria-label`.
- aria-live: polite(시작/완료) + assertive(실패) 2종. 오류 확장 `role="alert"`.
- `:focus-visible` 유지, 전역 `outline:none` 금지.
- `prefers-reduced-motion` 시 spin/펄스 정지 + 텍스트로 진행 전달.
- 색상만으로 구분되는 정보 0건 — 라벨·glyph·rail 두께 병기.

---

## 10. AC ↔ UI 매핑 표

| 수용 기준 | 충족 UI / 명세 근거 |
|---|---|
| **AC-1** · docs/design 에 상태별 **시각 구분** · **토큰 매핑** · **mockup** 생성 | §5 **6-state**(planner §2) 시각 규칙(색+라벨+glyph+rail) · §2.2 semantic 토큰(6-state, 대비 검증) + §2.4 typescript-monorepo 매핑 표 · §11 mockup(6상태 나란히 렌더). 본 문서 + `sync-status-center-BF-1163.html` |
| **AC-2** · **키보드/포커스/aria-live/reduced-motion** 대응이 명세에 포함 | §8 접근성 규격 전체 — §8.1 키보드 Tab 순서·`aria-pressed`, §8.2 `:focus-visible`, §8.3 aria-live(polite/assertive)+`role="alert"`, §8.4 `prefers-reduced-motion` 정지+정적 대체, §8.5 **6-state 배지 WCAG 대비 검증표(전부 ≥4.5:1, planner §11 충족)** |
| **AC-3** · **요약·필터·동기화·오류 UI** 가 수용 기준에 1:1 매핑 | 요약=§6.2 `.summary-bar`(전체+6-state 7 타일) / 필터=§6.3 `.filter-bar`(6-state 세그먼트, 0건 시 no-match) / 동기화=§6.1 전체 새로고침 + §6.4 저장소별 `지금 확인`/`재시도`(planner §5 라벨) / 오류·충돌=§6.5·§7 원인 문구+재시도(`failed`·`conflict`). mockup 에 각 영역 렌더 |

---

## 11. mockup 참조

- **경로**: `docs/design/mockups/sync-status-center-BF-1163.html`
- 단일 self-contained HTML(외부 의존성 0건, system font, 인라인 `<style>`). `file://` 로 직접 열어 렌더 확인 가능.
- §2 팔레트·§3 타이포·§4 레이아웃·§5 6-state·§6 컴포넌트·§7 원인 UI 를 정적 시각화. `<section>` 구분으로:
  1. 헤더 + 전체 새로고침 + aria-live 안내 텍스트
  2. 요약 카드 바(전체+6-state 7 타일, 충돌·실패 강조)
  3. 필터 바(6-state 세그먼트)
  4. 저장소 목록 — **6상태 행(미확인/최신/지연/동기화중/충돌/실패) 나란히** + `conflict`·`failed` 행 확장(원인+재시도)
  5. 빈 상태 2종(no-data / no-match)
- placeholder 콘텐츠(예시 저장소 `acme/web-app`, 401 오류 등). UX 의도 전달이 목적이며 실데이터 아님. reduced-motion 대체는 주석/보조 섹션으로 표기.
- dev 산출물과 픽셀 일치 의무 없음(참조 가이드).

---

## 12. Self-critique (dev 인계 전 자체 점검)

PR commit 직전 자기 점검 5항목:

1. **AC 매핑** — AC-1(상태별 시각 구분+토큰 매핑+mockup) → §5(6-state)+§2.2+§11, AC-2(키보드/포커스/aria-live/reduced-motion) → §8 전체(+§8.5 6-state 대비 검증), AC-3(요약·필터·동기화·오류 1:1) → §10 표로 각 컴포넌트 매핑. ✅
2. **dev 구현 가이드** — §9 에 CSS 변수 정의(6-state 토큰)·BEM 클래스(`data-state` 1:1)·상태 파생/정렬 의사코드·view-state 패턴·a11y 최소 요건 제공. typescript-monorepo 대비 §2.4 토큰 매핑까지. ✅
3. **기존 요소 보존** — 신규 additive 화면만 정의. 공용 라이트 토큰 셋 재사용(summary-board 기반), `design-tokens.json`·기존 라우트·데이터 미변경. 참조 문서(summary-board/oncall-handoff)는 패턴만 참조·수정 0건. 본 PR 은 `docs/design/**` 만 변경. ✅
4. **컴포넌트 매핑** — 요약 바·필터·저장소 행·상태 배지·원인 확장·빈 상태를 §6 props/상태/인터랙션으로 정의하고 §9.2 클래스명(planner `data-state` 6-state)과 1:1. mockup 클래스명과 동일 네이밍. ✅
5. **리뷰 반영(rev2) 및 모호함 flag**
   - (rev2-1) **6-state 정렬**: 초안 4-state(synced/syncing/pending/error)를 planner BF-1162 §2 6-state(idle/up_to_date/behind/syncing/**conflict**/failed)로 재정렬. 라벨·`data-state`·배지 modifier 를 planner 원문에 1:1 정합. ✅
   - (rev2-2) **`conflict` 대비 결함 근본 해소**: `conflict` 전용 토큰 `--color-conflict`(`#6D28D9`/`#F3E8FF` = 6.1:1) 정의 → 개발자가 쓰던 미검증 `--color-warning`(2.9:1) 대체. §8.5 에 6-state 전체 대비 계산 검증 보강(planner §11 4.5:1). ✅
   - (a) **스택 불일치**: 관측 vanilla-static vs 요청 typescript-monorepo → 프레임워크 미규정, 공용 토큰 + §2.4 매핑 표 병행. dev/planner 가 실제 구현 스택 확정 필요.
   - (b) **요약 바 vs KPI**: 요약 바 상태 분포는 `groupBy(state)`(§6.2)이며 planner KPI-1/KPI-2 와 별개 지표 — 두 KPI 노출 시 `#kpi-summary` 재사용, 중복 계산 금지.
   - (c) **"전부 최신" vs 데이터 0건 구분**: no-data 빈 상태(§6.6)와 "전부 up_to_date"는 다른 화면 — 혼동 방지 문구 §6.6 고정.
   - (d) **요약 타일 → 필터 연동**: 기본 비인터랙티브로 정의(§6.2). 타일 클릭 필터는 향후 확장 여지(현 범위 밖).
   - (e) 원인 문구(§7.1)는 대표 예시이며 실제 error code→문구 매핑 사전은 dev/서버 계약 기준. `conflict` 는 planner fixture `conflict` outcome 도달 상태.

---

<!-- bf:pr-summary -->
## 시안 요약 — 상태 센터(Sync Status Center) · BF-1163 · **rev2(리뷰 conditional 반영)**

여러 저장소의 동기화 상태를 한 화면에서 조망·조작하는 **상태 센터**. 요약 카드 바 · 상태 필터 · 저장소별 확인/재시도 액션 · 전체 새로고침 · 원인/재시도를 라이트 공용 토큰으로 정의. 프레임워크 미규정(관측 vanilla-static ↔ 요청 typescript-monorepo, §2.4 매핑 병행), `design-tokens.json` 미수정, 변경은 `docs/design/**` 뿐.

### 🔧 리뷰 반영 (최리뷰 conditional · designer MINOR)
초안이 자체 **4-state**(synced/syncing/pending/error)로 정의해 planner BF-1162 §2 **6-state**(idle/up_to_date/behind/syncing/**conflict**/failed)와 라벨·개수가 불일치 → 개발자가 `conflict` 배지에 미검증 `--color-warning`(≈**2.9:1**, §11 4.5:1 미달)을 자체 확장한 근본 원인. **rev2 해소**: (1) 상태 모델 전체를 planner 6-state 로 재정렬(라벨·`data-state`·배지 modifier 1:1), (2) **`conflict` 전용 violet 토큰 `--color-conflict`(`#6D28D9`/`#F3E8FF` = 6.1:1) 정의**, (3) §8.5 에 6-state 배지 WCAG 대비 계산 검증표 보강. → 개발자는 `.status-badge--conflict` 를 `--color-warning` → `--color-conflict`/`--color-conflict-soft` 로 교체.

**planner 6-state 색 비의존 3중 인코딩(색 + 한글 라벨 + glyph + rail 두께) — 배지 대비 전부 ≥4.5:1:**

| 상태(planner) | 라벨 | glyph | text / soft | 대비 | rail |
|---|---|---|---|---|---|
| `idle` | 미확인 | ○ | `#334155` / `#F1F5F9` | 9.4:1 | 3px |
| `up_to_date` | 최신 | ✓ | `#15803D` / `#ECFDF3` | 4.9:1 | 3px |
| `behind` | 지연 | ↧ | `#9A3412` / `#FEF3E2` | 6.7:1 | 3px |
| `syncing` | 동기화중 | ◐(회전) | `#0E7490` / `#E0F2FE` | 4.9:1 | 3px |
| `conflict` | 충돌 | ⇆ | `#6D28D9` / `#F3E8FF` | **6.1:1** | **4px** + 원인/재시도 확장 |
| `failed` | 실패 | ⚠ | `#DC2626` / `#FEE2E2` | 4.6:1 | **4px** + 원인/재시도 확장 |

**요약·필터·동기화·오류(AC-3 1:1)**: 요약 바 전체+6-state 7 타일(**충돌·실패 강조**) · 6-state 세그먼트 필터(0건 시 no-match) · 헤더 전체 새로고침 + 행별 `지금 확인`/`재시도`(planner §5 라벨) · `conflict`·`failed` 행 인라인 원인 문구+`재시도`.

**접근성(AC-2)**: 키보드 Tab 순서·`aria-pressed`, `:focus-visible`, aria-live(polite 시작/완료 + assertive 충돌·실패)·`role="alert"`, `prefers-reduced-motion` 시 spin 정지+텍스트 대체. §8.5 WCAG 대비 전 항목 통과(본문 15.3:1 / 6-state 배지 ≥4.5:1 / UI 경계 ≥3:1).

**산출물**: `docs/design/sync-status-center-BF-1163.md`(명세) + `docs/design/mockups/sync-status-center-BF-1163.html`(6상태 나란히 렌더 mockup, self-contained). dev 는 §9 토큰/클래스/상태 파생 규칙으로 구현(planner `data-state` 6-state 준수).
<!-- /bf:pr-summary -->
