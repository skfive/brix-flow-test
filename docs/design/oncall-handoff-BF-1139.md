# 온콜 인수인계 현황 SPA — 디자인 명세 · BF-1139

> 작성자: [이디자인] (designer) · 작성일 2026-07-24
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환
> primary-module: `oncall-handoff` (신규 · 완전 독립 경로)
> 참조(수정 금지): `docs/design/status-card-BF-879.md`(상태 3색·pill 배지·`role="img"` 패턴), `docs/design/incident-command-BF-821.md`(severity rail·색 비의존 3중 인코딩·상태별 view-state·WCAG 대비표)
> mockup 참조: `docs/design/mockups/oncall-handoff-BF-1139.html`

---

## 목차

1. [시안 개요](#1-시안-개요)
2. [컬러 팔레트](#2-컬러-팔레트)
3. [타이포그래피](#3-타이포그래피)
4. [레이아웃 · 반응형](#4-레이아웃--반응형)
5. [컴포넌트 명세](#5-컴포넌트-명세)
6. [상태별 시각 규칙 (정상/저하/장애/빈 + error)](#6-상태별-시각-규칙-정상저하장애빈--error)
7. [접근성 · WCAG 대비 검증](#7-접근성--wcag-대비-검증)
8. [dev 구현 가이드](#8-dev-구현-가이드)
9. [AC ↔ UI 매핑 표](#9-ac--ui-매핑-표)
10. [mockup 참조](#10-mockup-참조)
11. [Self-critique](#11-self-critique)

---

## 1. 시안 개요

### 1.1 변경 범위

신규 모듈 `oncall-handoff/` 의 시각 시안. **온콜(당직) 교대 순간**, 나가는 담당자와 들어오는 담당자가 같은 화면 하나를 보고 "지금 세상의 상태"와 "다음에 뭘 해야 하는지"를 즉시 합의하는 **인수인계 스냅샷**을 정의한다.

- 대상 신규 파일(후속 dev 담당): `oncall-handoff/index.html`, `oncall-handoff/style.css`, `oncall-handoff/fixtures.js`, `oncall-handoff/handoff.js`, `oncall-handoff/package.json`
- 기존 모듈 CSS/토큰 공유: **없음** — 완전 독립. CSS 변수 프리픽스 `--oh-*` (기존 `--ic-*`(incident-command)·status-card 토큰과 충돌 없음)
- 기존 파일 수정: **0건**. status-card·incident-command 의 토큰·접근성 **패턴만 참조**하고 값·구조는 본 모듈에 독립 정의(task 지시 "새 경로에 독립 구현")
- 본 designer PR 이 건드리는 파일: `docs/design/**` 뿐 (코드 미구현 — 구현은 dev-1 담당)

### 1.2 사용자 경험 목표

| 목표 | 시각 전략 |
|------|-----------|
| **교대 30초 안에 "전체 상태 + 급한 것"을 합의** | 상단 릴레이 헤더에 전체 근무 상태(posture) 배너를 고정. 아래 목록은 severity 높은 순으로 정렬, 좌측 rail 이 스캔 첫 픽셀 |
| **"누가 → 누구에게" 인계가 화면의 주제임을 명시** | (시그니처) 릴레이 트랙: `나가는 당직 → 다음 당직` 을 명시적 화살표로 연결. 트랙 색 = 전체 근무 상태색 |
| **인계 5요소를 카드 1장에서 빠짐없이** | 각 인시던트 카드가 심각도 · 영향 서비스 · 마지막 조치 · 다음 담당자 · 즉시 실행 액션 5요소를 정의 리스트로 고정 배치 |
| **색맹·저조도 온콜에서도 오판 없음** | posture/severity 는 **색 + 한글 라벨 + 형태**(glyph/rail 두께) 3중 인코딩. 색상만으로 구분되는 정보 0건 |
| **눈이 덜 피로한 야간 대응** | dark 표면. 배경은 순검정 대신 warm graphite `#14171C`, 텍스트는 순백 대신 `#E9EDF5` 로 대비를 낮춰 장시간 응시 부담 완화 |

### 1.3 시각 톤 · 시그니처

톤은 "관제실의 아드레날린"이 아니라 **"교대 순간의 침착한 인계 로그(handoff log)"**. 장식은 0, 강조는 컬러 배지·여백·1px 경계선·좌측 rail 로만.

> **시그니처 = 릴레이 헤더(relay header).** `나가는 당직 → 다음 당직` 을 방향 화살표(baton)로 연결하고, 그 트랙 색을 전체 근무 상태색과 일치시킨다. 이 화면이 "상태 대시보드"가 아니라 **"바통 넘김(baton pass)"**임을 한 번에 각인시키는 유일한 기억 요소. 나머지는 전부 조용하게 유지한다.

---

## 2. 컬러 팔레트

모두 `oncall-handoff/style.css` 의 `:root` 에 직접 정의(외부 토큰 파일 import 없음 — vanilla-static). 프리픽스 `--oh-*`.

### 2.1 기반 (Base / Surface / Text)

| 토큰 | HEX | 용도 |
|------|-----|------|
| `--oh-bg` | `#14171C` | 페이지 최상위 배경 (warm graphite) |
| `--oh-surface` | `#1C2027` | 프레임/패널 배경 |
| `--oh-surface-raised` | `#242A33` | 한 단계 뜬 면 (인시던트 카드, 근무 블록) |
| `--oh-border` | `#2E343F` | **장식용** 구분선 (패널 경계) — 대비 요건 비적용 |
| `--oh-border-interactive` | `#7C8CA6` | **인터랙티브** 경계 (버튼, 들어오는 근무 블록) — WCAG 3:1 충족(§7.2) |
| `--oh-text` | `#E9EDF3` | 본문/제목 기본 텍스트 |
| `--oh-text-secondary` | `#A6B2C4` | 보조 텍스트 (담당자 핸들, note 본문) |
| `--oh-text-muted` | `#7C8A9C` | 최약 텍스트 (타임스탬프·캡션 12px 전용) |
| `--oh-accent` | `#66B2FF` | 포커스 링, 링크, primary 버튼 |
| `--oh-accent-fg` | `#08121F` | primary 버튼 위 텍스트 (accent 배경 대비 8.4:1, §7.2) |

### 2.2 전체 근무 상태 posture (핵심 4-state 축: 정상/저하/장애/빈)

posture 배너 1세트 = `배경(bg) + 텍스트(fg) + 좌측 4px 컬러 바(border-left)`. **posture 는 화면 전체의 상태이며, §2.3 severity(인시던트 개별 심각도)와 다른 축**이다.

| posture | 한글 라벨 | glyph(형태) | `--oh-*-fg` | `--oh-*-bg` | `--oh-*-border` |
|---------|-----------|-------------|-------------|-------------|------------------|
| 정상 healthy | `정상` | `✓` 체크 | `#56D364` | `#10241A` | `#1D5A32` |
| 저하 degraded | `저하` | `▲` 삼각 | `#E3B341` | `#2E2410` | `#6B5220` |
| 장애 outage | `장애` | `●` 채운 원 | `#FF7B72` | `#33161A` | `#7A2E33` |
| 빈 empty | `인계 데이터 없음` | `—` 대시 | `#9AA7B8` | `#232830` | `#3A4250` |

> **정상 ≠ 빈 구분**: `정상` = 인계는 존재하되 활성 장애 0건(클린 인계 카드 + 주의 노트). `빈` = 교대 스케줄에 담당자 자체가 없음(인계할 데이터 없음). 두 상태는 문구·glyph·후속 액션이 모두 다르다(§6).

### 2.3 인시던트 심각도 severity (SEV1~SEV3)

각 배지 = `배경(bg) + 텍스트(fg) + 1px 테두리(border)` 1세트. 라벨은 항상 `코드 · 한글` 병기. 카드 좌측 rail 색과 연동.

| severity | 라벨 | `--oh-sev{n}-fg` | `--oh-sev{n}-bg` | `--oh-sev{n}-border` | 형태 보조 (색 비의존) |
|----------|------|------------------|-------------------|------------------------|------------------------|
| SEV1 | `치명` | `#FF9492` | `#3A181B` | `#7A3036` | 카드 좌측 rail **6px** + 배지 테두리 **2px** (유일) |
| SEV2 | `높음` | `#F0B84D` | `#33270F` | `#6E561F` | 카드 좌측 rail 4px |
| SEV3 | `보통` | `#79B8FF` | `#142A40` | `#2C5480` | 카드 좌측 rail 4px |

> SEV1 만 rail 6px + 배지 테두리 2px — 색을 못 보는 사용자도 "가장 두꺼운 것 = 가장 급함"을 형태로 인지(incident-command §2.2 패턴 승계).

### 2.4 영향 서비스 칩 · 인계 확인 배지

| 토큰/요소 | 값 | 용도 |
|-----------|-----|------|
| `--oh-chip-bg` / `--oh-chip-border` / `--oh-chip-fg` | `#232A34` / `#39424F` / `#C6D0DE` | 영향 서비스 칩 (선행 dot 색으로 서비스 상태 보조 표기: 장애=outage-fg / 저하=degr-fg / 정상=ok-fg) |
| 인계 확인 `--pending` | `--oh-degr-*` 세트 | 다음 담당자 미확인(`인계 확인 대기`) |
| 인계 확인 `--done` | `--oh-ok-*` 세트 | 다음 담당자 확인 완료(`인계 확인됨`) |

---

## 3. 타이포그래피

system font stack 기반 — 외부 폰트/CDN 0건(vanilla-static 준수).

### 3.1 폰트 패밀리

```css
--oh-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
  Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
--oh-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
```

- **mono 의 역할이 곧 정보 위계**: 사람이 손대는 식별자(담당자 `@handle`)·기계 시간(`08:12`, `datetime`)만 mono. 서술 텍스트는 sans. 이 대비가 "이건 실제 값이다"를 폰트만으로 전달.

### 3.2 텍스트 스케일

| 역할 | 정의 (weight size/line-height) | 적용 요소 |
|------|-------------------------------|-----------|
| topbar 타이틀 | `650 18px/1.3` | `.oh-topbar__title` (=`<h1>`) |
| 카드 제목 | `600 16px/1.35` | `.oh-card__title` (=`<h3>`), `.oh-clear__title` |
| posture 라벨 | `650 15px/1.3` | `.oh-posture__label` |
| 필드 라벨(eyebrow) | `650 12px/1.4` · `letter-spacing 0.04em` · uppercase | `.oh-field__k`, `.oh-watch__role` |
| 본문 | `400 15px/1.6` | 필드 값, note |
| 캡션/타임스탬프 | `400 12px/1.4` | `time`(mono), `.oh-topbar__meta` |

- 카드 제목은 `overflow-wrap: anywhere`(긴 서비스 식별자 대비). note·값은 한글 어절 자연 줄바꿈.

---

## 4. 레이아웃 · 반응형

### 4.1 페이지 골격

```
<body> (bg=canvas)
 ├─ <header class="oh-topbar">                 온콜 인수인계 현황 · 교대 시각(mono)
 └─ <main id="oncall-handoff" data-view-state="…">  상태 1개만 렌더(§6)
      └─ <section class="oh-frame">            교대 스냅샷 한 화면
           ├─ <div class="oh-relay">           ◀ 시그니처
           │    ├─ .oh-relay__track            나가는 근무 → [baton →] → 다음 근무
           │    └─ .oh-posture--{state}        전체 근무 상태 배너(role="status")
           └─ <ul class="oh-list">             인시던트 인계 카드 목록(severity 내림차순)
                └─ <li class="oh-card oh-card--sev{n}"> × N
                     ├─ .oh-card__head          제목 ↔ severity 배지
                     ├─ <dl class="oh-fields">   영향서비스 / 마지막조치 / 다음담당자
                     └─ .oh-actions              즉시 실행 버튼들
```

### 4.2 spacing / radius / shadow

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--oh-s1`~`--oh-s6` | `4 / 8 / 12 / 16 / 24 / 32 px` | 아래 매핑 |
| `--oh-radius` / `--oh-radius-sm` / `--oh-pill` | `12 / 8 / 999 px` | 프레임·카드 / 버튼·근무블록 / 배지·칩 |
| `--oh-shadow` | `0 6px 20px rgba(0,0,0,0.35)` | 프레임 그림자 |

- `.oh-relay` 패딩 `--oh-s5`(24), 내부 gap `--oh-s4`(16)
- `.oh-list` 패딩 `--oh-s5`, 카드 간 gap `--oh-s4`
- `.oh-card` 패딩 `--oh-s5`(좌측만 rail 폭 +4px), `.oh-fields` gap `--oh-s3`(12)
- `.oh-field` 그리드 `104px 1fr` (라벨 열 고정 → 값 정렬)

### 4.3 breakpoint 별 동작

| 화면폭 | 동작 |
|--------|------|
| `≥641px` (기본) | 릴레이 트랙 `1fr auto 1fr` 가로 3열(나가는→baton→다음), 필드 `104px 1fr` 2열 |
| `≤640px` (모바일) | 릴레이 트랙 1열 세로 스택 + baton 90° 회전(아래 방향 화살표), 필드 라벨/값 1열 세로, 카드 헤드 `column-reverse`(배지 → 제목 순 노출) |

- severity 배지·칩은 `flex-shrink: 0` 계열로 온전 표시, 제목이 먼저 줄바꿈.

---

## 5. 컴포넌트 명세

> 모든 컴포넌트는 정적 표시 우선. 클릭 액션은 버튼만(카드 자체는 링크 아님).

### 5.1 릴레이 헤더 `.oh-relay` (시그니처)

| 항목 | 명세 |
|------|------|
| 역할 | 교대 주체(나가는/다음 당직)와 전체 근무 상태를 한 블록에 결합 |
| props | `outgoing: {name, handle}`, `incoming: {name, handle}`, `posture: "healthy"｜"degraded"｜"outage"｜"empty"` |
| 트랙 | `.oh-relay__track` — `나가는 근무 블록 → .oh-baton(방향 화살표) → 다음 근무 블록`. 트랙/baton 색 = `--oh-posture`(posture fg 상속) |
| 근무 블록 | `.oh-watch` = 역할(eyebrow) + 이름 + `@handle`(mono). 다음 당직은 `.oh-watch--incoming`(interactive border 로 "받는 쪽" 강조) |
| posture 배너 | `.oh-posture--{state}` = glyph(aria-hidden) + 한글 라벨 + 요약 서브라벨. `role="status"` + `aria-label="전체 근무 상태: {라벨}"` |
| 상태(state) | 정적 — baton 은 장식(`aria-hidden`), hover/포커스 없음 |
| 빈 상태 | posture 만 렌더, 트랙(나가는/다음)은 숨김(담당자 없음 — §6.4) |

### 5.2 인시던트 인계 카드 `.oh-card` (인계 5요소 컨테이너)

| 항목 | 명세 |
|------|------|
| 컨테이너 | `<li>`, `id="handoff-{incident.id}"`, raised 배경 + 12px 라운드 + 좌측 severity rail(`::before`) |
| props | `{ id, title, severity, affectedServices[], lastAction:{at, text}, nextOwner:{name, handle, ack}, actions[] }` |
| 5요소 배치 | ①심각도=`.oh-sev` 배지+rail · ②영향서비스=`.oh-chips` · ③마지막조치=`time`+텍스트 · ④다음담당자=`.oh-owner` · ⑤즉시실행=`.oh-actions` |
| DOM 순서 | 제목 → 배지 → (영향서비스 → 마지막조치 → 다음담당자) `<dl>` → 액션 (읽기 순서 = 시각 순서) |
| 정렬 | 목록은 severity 내림차순(SEV1 최상단). rail 두께가 스캔 첫 신호 |
| 상태(state) | 카드 정적. 내부 버튼만 인터랙티브 |

#### 5.2.1 severity 배지 `.oh-sev`
- pill, `코드(mono) · 한글`. `role="img"` + `aria-label="심각도 SEV{n} {한글}"`. SEV1 만 테두리 2px.

#### 5.2.2 영향 서비스 칩 `.oh-chip`
- pill, 선행 dot(`aria-hidden`) + 서비스명. dot 색으로 서비스 개별 상태 보조(장애/저하/정상). 저하/정상 서비스는 라벨에도 `(저하)` 등 병기 권장(색 비의존).

#### 5.2.3 마지막 조치 `.oh-action-log`
- `<time datetime="ISO">HH:MM</time>`(mono, muted) + 조치 서술. 가장 최근 1건만 표시(전체 이력 아님 — 인계 스냅샷).

#### 5.2.4 다음 담당자 `.oh-owner`
- 이름 + `@handle`(mono) + 인계 확인 배지(`--pending` 대기 / `--done` 확인됨). ack 배지도 색+한글 병기.

#### 5.2.5 즉시 실행 액션 `.oh-actions` / `.oh-btn`
- `<button type="button">`. variant: `--primary`(런북/인계확인 등 주행동, accent 배경) · 기본(상태페이지/대시보드) · `--danger`(에스컬레이션, outage 톤 테두리). glyph 는 `aria-hidden`, 텍스트 라벨이 접근성 이름.

### 5.3 클린 인계 카드 `.oh-clear` (정상 상태 전용)
- 활성 장애 0건일 때 인시던트 카드 대신 표시. `✓` 제목 + 주의 노트 `<ul>` + `인계 확인`/`전체 상태 페이지` 액션. 좌측 4px ok 컬러 바.

### 5.4 빈 상태 `.oh-empty` / error 배너 `.oh-error`
- §6.4 / §6.5 참조.

---

## 6. 상태별 시각 규칙 (정상/저하/장애/빈 + error)

`<main id="oncall-handoff" data-view-state="…">` 값에 따라 CSS 로 배타 전환(incident-command §7 패턴 승계). JS 는 속성 1개만 바꾼다.

```css
/* dev 구현 패턴 — 상태 전환은 CSS 담당, JS 는 data-view-state 만 변경 */
[data-view-state="loading"] .oh-ready-only,
[data-view-state="empty"]   .oh-ready-only,
[data-view-state="error"]   .oh-ready-only { display: none; }
[data-view-state="ready"]   .oh-skeleton,
[data-view-state="ready"]   .oh-empty,
[data-view-state="ready"]   .oh-error { display: none; }
```

> **주의**: 정상/저하/장애는 모두 `data-view-state="ready"` 내부의 **posture 분기**(데이터가 결정)다. `빈`·`error`·`loading` 만 별도 view-state. posture 값은 `data-posture="healthy|degraded|outage"` 속성으로 프레임에 반영.

| 상태 | 트리거(fixture 기준) | 시각 |
|------|----------------------|------|
| **장애 outage** | 활성 SEV1 또는 SEV2 인시던트 ≥1 | posture `장애`(적) + rail 색 트랙. 인시던트 카드 목록(severity 내림차순). 미확인 인계 수 서브라벨 노출 |
| **저하 degraded** | 활성 인시던트는 SEV3(모니터링)만 | posture `저하`(황) + 트랙. SEV3 카드만. "즉시 조치 불필요" 서브라벨 |
| **정상 healthy** | 활성 인시던트 0건, 인계는 존재 | posture `정상`(녹) + 트랙. `.oh-clear` 카드(활성 장애 없음) + 주의 노트. `인계 확인` primary |
| **빈 empty** | 교대 스케줄에 담당자 미배정 | posture `인계 데이터 없음`(중립), **트랙 숨김**. `.oh-empty` 중앙 블록(점선 원 + `—`) + `표시할 인수인계가 없습니다` + `온콜 스케줄 열기` |
| (참조) **error** | 데이터 fetch 실패 | `.oh-error` `role="alert"` 배너 고정 문구 `인수인계 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.` + 선행 `⚠`(aria-hidden). 재시도 버튼 없음 |
| (참조) **loading** | 초기 진입 | 정적 스켈레톤 블록(펄스 1.2s). `prefers-reduced-motion` 시 애니메이션 정지. 인위적 지연 금지 |

- **고정 문구**(재해석 금지): 빈=`표시할 인수인계가 없습니다`, error=`인수인계 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.`
- 4개 핵심 상태(정상/저하/장애/빈)는 mockup 에 4개 `<section>` 으로 나란히 렌더되어 시각 비교 가능(§10).

---

## 7. 접근성 · WCAG 대비 검증

### 7.1 요구

| 항목 | 충족 방법 |
|------|-----------|
| 색 비의존 | posture/severity/서비스 상태 전부 **색 + 한글 라벨 + 형태**(glyph/rail 두께/ack 라벨) 병기. 색만으로 구분되는 정보 0건 |
| 키보드 | 인터랙티브는 네이티브 `<button type="button">` 만. Tab 순서 = DOM 순서(카드 내 액션 좌→우). 임의 양수 `tabindex` 금지. 카드 자체는 클릭 대상 아님(버튼만) |
| 포커스 가시성 | 전 인터랙티브 `:focus-visible { outline: 2px solid var(--oh-accent); outline-offset: 2px; }`. 전역 `outline: none` 리셋 **금지** |
| SR 안내 | posture 배너 `role="status"` + `aria-label`, severity 배지 `role="img"` + `aria-label`, error 배너 `role="alert"`, 장식 glyph/baton/dot 전부 `aria-hidden="true"` |
| 모션 | `@media (prefers-reduced-motion: reduce)` → 스켈레톤 펄스 등 `animation:none; transition:none;` |
| 시맨틱 | 인계 5요소 중 3요소는 `<dl>/<dt>/<dd>`(라벨-값 관계 SR 전달), 카드 목록 `<ul>/<li>`, 조치 시각 `<time datetime>` |

### 7.2 대비비 검증표 (WCAG 2.1 — 텍스트 4.5:1 / UI 경계 3:1) — 계산값

| 전경 | 배경 | 대비비 | 기준 | 판정 |
|------|------|--------|------|------|
| `--oh-text` `#E9EDF3` | `--oh-surface` `#1C2027` | **13.9:1** | 4.5 | ✅ AAA |
| `--oh-text` `#E9EDF3` | `--oh-surface-raised` `#242A33` | **12.3:1** | 4.5 | ✅ AAA |
| `--oh-text-secondary` `#A6B2C4` | `--oh-surface` `#1C2027` | **7.6:1** | 4.5 | ✅ AAA |
| `--oh-text-muted` `#7C8A9C` | `--oh-surface` `#1C2027` | **4.65:1** | 4.5 | ✅ (12px 캡션/타임스탬프 전용 — 본문·라벨 사용 금지) |
| primary 텍스트 `--oh-accent-fg` `#08121F` | `--oh-accent` `#66B2FF` | **8.4:1** | 4.5 | ✅ AAA |
| 포커스 링 `#66B2FF` | `--oh-bg` `#14171C` | **8.0:1** | 3 | ✅ |
| `--oh-border-interactive` `#7C8CA6` | `--oh-surface` `#1C2027` | **4.8:1** | 3 | ✅ (UI 경계) |
| `--oh-border-interactive` `#7C8CA6` | `--oh-surface-raised` `#242A33` | **4.2:1** | 3 | ✅ (UI 경계) |
| posture 정상 `#56D364` | `#10241A` | **8.5:1** | 4.5 | ✅ AAA |
| posture 저하 `#E3B341` | `#2E2410` | **7.8:1** | 4.5 | ✅ AAA |
| posture 장애 `#FF7B72` | `#33161A` | **6.6:1** | 4.5 | ✅ AAA |
| posture 빈 `#9AA7B8` | `#232830` | **6.1:1** | 4.5 | ✅ AAA |
| SEV1 `#FF9492` | `#3A181B` | **7.5:1** | 4.5 | ✅ AAA |
| SEV2 `#F0B84D` | `#33270F` | **8.1:1** | 4.5 | ✅ AAA |
| SEV3 `#79B8FF` | `#142A40` | **7.1:1** | 4.5 | ✅ AAA |
| 서비스 칩 텍스트 `#C6D0DE` | `#232A34` | **9.3:1** | 4.5 | ✅ AAA |

> **dev 주의**: `--oh-border`(장식, ~1.6:1)와 `--oh-border-interactive`(≥4:1)는 **용도가 다른 토큰**이다. 버튼·인터랙티브 경계에 `--oh-border` 를 쓰면 WCAG 3:1 위반. 계산은 `docs/design/mockups/oncall-handoff-BF-1139.html` 에 반영된 값과 동일.

---

## 8. dev 구현 가이드

> 대상 파일: `oncall-handoff/` (후속 dev task 신규 생성). 본 명세는 계약이며 파일 분할 세부는 dev 재량.

### 8.1 재사용 원칙 (Simplicity First)

1. **CSS**: `oncall-handoff/style.css` `:root` 에 §2 토큰 전부 `--oh-*` 프리픽스로 직접 정의. 색상 리터럴(HEX)은 이 정의 블록에만 존재, 컴포넌트 규칙은 `var(--oh-…)` 만 참조. status-card·incident-command 파일을 import 하지 말 것(패턴 참조만, 값은 독립).
2. **JS**: `fixtures.js` 에 교대/인시던트 정적 fixture. `handoff.js` 는 `computePosture(incidents)`(활성 severity 로 posture 파생) → `renderRelay()` → `renderList()` 순으로 로드 시 1회 렌더. `setInterval`/`fetch`/외부 URL 금지(vanilla-static).
3. **마크업**: §4.1 골격을 §5 클래스명으로 재현. `data-view-state`/`data-posture` 속성으로 상태 전환.

### 8.2 단계별 지침

1. `oncall-handoff/index.html` — `<main id="oncall-handoff" data-view-state="loading">` 골격 + 정적 스켈레톤 + `<noscript>` 폴백. topbar `<h1>온콜 인수인계 현황</h1>`.
2. `style.css` — §2 토큰 → §5 컴포넌트 규칙. 클래스명(`oh-topbar`/`oh-frame`/`oh-relay`/`oh-relay__track`/`oh-watch`(+`--incoming`)/`oh-baton`/`oh-posture`(+`--ok|degr|out|empty`)/`oh-list`/`oh-card`(+`--sev1|sev2|sev3`)/`oh-sev`(+`--1|2|3`)/`oh-fields`/`oh-field`(+`__k|__v`)/`oh-chips`/`oh-chip`/`oh-action-log`/`oh-owner`(+`__ack--pending|done`)/`oh-actions`/`oh-btn`(+`--primary|danger`)/`oh-clear`/`oh-empty`/`oh-error`) 유지 권장.
3. `handoff.js` — posture 파생 규칙(§6 표): 활성 SEV1|SEV2 → `outage` / SEV3 만 → `degraded` / 0건이나 인계 존재 → `healthy` / 담당자 미배정 → `empty`. severity 내림차순 정렬. `data-view-state`·`data-posture` 세팅.
4. 정적 검사: `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|setInterval|https?://" oncall-handoff/*` → 매치 0건(자체 상대경로 리소스 제외).

### 8.3 색상 하드코딩 규칙
- 색상 리터럴은 `style.css` 토큰 정의 블록(`:root`)에만. 컴포넌트 규칙은 `var(--oh-…)` 만 참조. 하드코딩 색 발견 시 리뷰 반려 대상.

### 8.4 mockup 픽셀 일치 의무 없음
- `docs/design/mockups/oncall-handoff-BF-1139.html` 는 시각 시뮬레이션(4상태 나란히). dev 는 실제 SPA 에서 데이터에 따라 **한 상태만** 렌더한다. mockup 은 참조 가이드이며 픽셀 단위 일치 의무 없음.

---

## 9. AC ↔ UI 매핑 표

| 수용 기준 | 충족 UI / 명세 근거 |
|-----------|---------------------|
| AC-1 · 디자인 명세에 **AC 매핑 표**와 **4개 상태(정상/저하/장애/빈)** 시각 표현 포함 | 본 §9 표 + §6 상태별 시각 규칙 표 + §2.2 posture 4-state 토큰. mockup(§10) 에 4개 상태 `<section>` 실제 렌더 |
| AC-1 · 인계 5요소(심각도·영향서비스·마지막조치·다음담당자·즉시실행) 한 화면 배치 | §5.2 인시던트 카드가 5요소를 `<dl>`+액션으로 고정 배치. mockup 장애/저하 카드에 5요소 전부 렌더 |
| AC-2 · vanilla-static 제약, `file://` 외부 의존성 없이 렌더 | §2 토큰 `:root` 직접 정의, system font, CDN/외부 link·script 0건. mockup 단일 self-contained HTML |
| AC-2 · 접근성(대비/aria) 패턴 반영 | §7 대비 검증표(전 항목 통과) + `role="status|img|alert"`·`aria-label`·`aria-hidden`·`:focus-visible`·`prefers-reduced-motion`. mockup 에 동일 속성 구현 |

---

## 10. mockup 참조

- **경로**: `docs/design/mockups/oncall-handoff-BF-1139.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`). §2 팔레트·§3 타이포·§4 레이아웃·§5 컴포넌트 그대로 시각화.
- **4개 핵심 상태(장애/저하/정상/빈)를 4개 `<section>` 으로 나란히** 렌더 + 참조로 error 배너 1개. reviewer/운영자/dev 가 PR 스크린샷만으로 상태별 시각 비교 가능.
- fixture 는 플레이스홀더(결제 API/이미지 CDN/검색 등 예시 인시던트, 김온콜→이당직 교대). UX 의도 전달이 목적이며 실데이터 아님.
- dark 1종 렌더(야간 온콜 톤). dev 산출물과 픽셀 일치 의무 없음(§8.4).

---

## 11. Self-critique

PR commit 직전 자기 점검 (dev·reviewer 가 받기 전 명세 누락/모호함 검증):

1. **AC 매핑** — AC-1(AC 매핑 표 + 4상태 시각) → §9 표 + §6 + §2.2 + mockup 4-section 으로 충족. AC-1(5요소 한 화면) → §5.2 카드가 5요소 고정 배치. AC-2(file:// 무의존/접근성) → §2/§7 + mockup self-contained 로 충족. ✅
2. **dev 구현 가이드** — §8 에 토큰 정의 위치·posture 파생 규칙·클래스명 목록·정적 검사 grep·하드코딩 규칙까지 명시. dev 가 단계대로 따라갈 수 있음. ✅
3. **기존 요소 보존** — status-card·incident-command 는 **패턴만 참조, 파일 수정 0건**(§1.1). 신규 프리픽스 `--oh-*` 로 기존 `--ic-*` 및 status-card 토큰과 충돌 없음. 회귀 위험 없음. ✅
4. **컴포넌트 매핑** — §5 각 컴포넌트가 mockup 클래스명과 1:1(oh-relay/oh-watch/oh-baton/oh-posture/oh-card/oh-sev/oh-fields/oh-chip/oh-owner/oh-actions/oh-clear/oh-empty/oh-error). 인계 5요소 ↔ 카드 내 요소 매핑 §5.2 에 번호로 명시. ✅
5. **모호함 flag** — (a) posture 파생 임계값(SEV2 를 outage 로 볼지 degraded 로 볼지)은 §6 표에 "SEV1|SEV2 → outage, SEV3 만 → degraded" 로 기본값 제시했으나 운영 정책에 따라 조정 가능 — dev/planner 재량. (b) `정상` 상태에서 인계 확인 후 화면 전이(다음 근무의 시작 화면)는 본 인계 스냅샷 범위 밖. (c) loading 스켈레톤은 §6 에 규칙만 명시(mockup 미렌더) — 4개 핵심 상태 시각화가 우선이라 판단. (d) dark 1종만 제공(light 테마 미정의) — 야간 온콜 톤이 주 사용 맥락.

---

<!-- bf:pr-summary -->
## 시안 요약 — 온콜 인수인계 현황 SPA (BF-1139)

교대 순간, 나가는 당직과 다음 당직이 화면 하나로 "전체 상태 + 급한 것 + 다음 액션"을 합의하는 **인수인계 스냅샷**. 신규 독립 모듈 `oncall-handoff/`, 프리픽스 `--oh-*` (status-card·incident-command 토큰 **미수정**, 패턴만 참조).

**시그니처 — 릴레이 헤더**: `나가는 당직 → 다음 당직` 을 방향 화살표(baton)로 연결, 트랙 색 = 전체 근무 상태색. "상태 대시보드"가 아니라 "바통 넘김"임을 각인.

**4-state posture (색+한글+형태 3중 인코딩):**

| posture | 라벨 | glyph | fg | bg |
|---|---|---|---|---|
| 정상 | 정상 | ✓ | `#56D364` | `#10241A` |
| 저하 | 저하 | ▲ | `#E3B341` | `#2E2410` |
| 장애 | 장애 | ● | `#FF7B72` | `#33161A` |
| 빈 | 인계 데이터 없음 | — | `#9AA7B8` | `#232830` |

**인계 5요소 한 화면**: 인시던트 카드 1장 = 심각도(SEV1~3 배지+좌측 rail) · 영향 서비스(칩) · 마지막 조치(mono time) · 다음 담당자(@handle + 인계확인 배지) · 즉시 실행(런북/상태페이지/에스컬레이션 버튼).

**접근성**: 전 대비비 WCAG 통과(본문 ≥4.65:1 / UI 경계 ≥4.2:1), `role="status|img|alert"`, `aria-label/hidden`, `:focus-visible`, `prefers-reduced-motion`. 색상만으로 구분되는 정보 0건.

**산출물**: `docs/design/oncall-handoff-BF-1139.md`(명세) + `docs/design/mockups/oncall-handoff-BF-1139.html`(4상태 나란히 렌더 mockup, self-contained). dev 는 `--oh-*` 토큰 정의 + posture 파생 규칙(§6)으로 구현.
<!-- /bf:pr-summary -->
