# 고객 피드백 우선순위 보드 — UI/UX 디자인 명세 (BF-1169)

> 작성자: [이디자인] (designer) · 작성일 2026-07-25
> 관련 티켓: BF-1169 (본 designer task) · 부모 Epic BF-1167 · 기획 BF-1168 · 개발 BF-1170 · 테스트 BF-1172
> 기획 근거: `docs/plan/feedback-board-BF-1167.md` (단일 기준 스펙) — 본 문서는 그 명세를 시각/토큰/반응형/접근성 관점으로 확정한다.
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환. 별도 `design-tokens.json` 은 존재하지 않으므로 §2 토큰 세트를 본 문서에서 단일 기준으로 확정하고, dev 는 하드코딩 색상 없이 이 CSS 변수만 재사용한다.
> mockup 참조: `docs/design/feedback-board-mockup/feedback-board-BF-1167.html` (§9)

---

## 1. 시안 개요

### 1.1 변경 범위

`feedback-board/` 신규 모듈의 단일 페이지 SPA 화면. 아래 4개 주요 영역으로 구성한다.

1. **KPI 요약 영역** — 전체 건수 / 상태별 건수 / 심각도별 분포 / 평균 리드타임 (기획 §5.4, 전체 fixture 기준)
2. **등록 폼** — 제목·설명·심각도·유입 채널 입력 후 제출 (기획 §5.2, §3.3)
3. **필터 바** — 검색어 + status/severity/channel 다중 선택 필터 + 초기화 (기획 §5.3)
4. **항목 목록** — 정렬된 피드백 카드 목록, 상태 전환 버튼, 빈 상태·로딩·오류/재시도 (기획 §5.1·§5.5~§5.7)

### 1.2 사용자 경험 목표

- **운영팀 1인 데스크톱 사용 우선** — 정보 밀도를 유지하되 스캔 가능한 카드/배지 구조로 심각도·상태를 한눈에 구분.
- **결정적 상태 시각화** — 심각도 4단계·상태 3단계를 색상 토큰으로 일관되게 매핑, 색상만이 아니라 텍스트 레이블을 병기해 색각 이상 사용자도 구분 가능(접근성).
- **키보드 완결성** — 마우스 없이 등록→필터→상태 전환 전 흐름 수행 가능, aria-live 로 비시각 피드백 제공.
- **오류에 관대한 흐름** — 저장 실패 시 데이터 손실 없이 "다시 시도" 로 복구.

### 1.3 비범위 (기획 §10 준수)

역방향 상태 전환 UI, 담당자/로그인, 영속 저장, 정렬 커스터마이징 UI, 부분집합 KPI, 수정/삭제 UI, bulk 전환 — 모두 화면에 노출하지 않는다. 신규 디자인 토큰은 §2 범위로 최소화하고 추가 팔레트를 도입하지 않는다.

---

## 2. 컬러 팔레트 (디자인 토큰)

모든 색상은 CSS 변수(`:root`)로만 정의하고, 컴포넌트는 이 변수만 참조한다(하드코딩 색상 금지). 배지 색상은 **연한 배경 + 진한 전경** 조합으로 WCAG AA(≥4.5:1) 대비를 만족하도록 설계했다.

### 2.1 기반(neutral / brand) 토큰

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-bg` | `#f4f6f9` | 페이지 배경 |
| `--color-surface` | `#ffffff` | 카드·폼·패널 표면 |
| `--color-surface-alt` | `#eef2f7` | 보조 표면(입력 배경, 스켈레톤) |
| `--color-border` | `#d3dbe4` | 경계선 |
| `--color-text` | `#1f2933` | 기본 텍스트(대비 12:1+) |
| `--color-text-muted` | `#556170` | 보조 텍스트/캡션 |
| `--color-primary` | `#2457d6` | 주요 액션(제출 버튼, 활성 링크) |
| `--color-primary-hover` | `#1c46ac` | primary hover/active |
| `--color-primary-contrast` | `#ffffff` | primary 위 전경 |
| `--color-focus` | `#1c46ac` | 키보드 포커스 outline |

### 2.2 심각도(severity) 토큰 — 배지/정렬/KPI 공용 (기획 §3.1)

| severity | 전경 `--sev-*-fg` | 배경 `--sev-*-bg` | 표시 레이블 |
|---|---|---|---|
| `critical` | `#a01722` | `#fde5e7` | 치명적 |
| `high` | `#9a4a06` | `#fceadb` | 높음 |
| `medium` | `#8a6100` | `#fbf1d3` | 보통 |
| `low` | `#1f6f45` | `#dff2e6` | 낮음 |

정렬 랭크(critical=4 > high=3 > medium=2 > low=1)는 색상 온도(적→황→녹)로도 직관 전달.

### 2.3 상태(status) 토큰 — 배지 공용 (기획 §4)

| status | 전경 `--status-*-fg` | 배경 `--status-*-bg` | 표시 레이블 |
|---|---|---|---|
| `pending_review` | `#455060` | `#e4e9f0` | 검토 대기 |
| `planned` | `#1c46ac` | `#dde6fb` | 계획됨 |
| `done` | `#1f6f45` | `#dbf0e4` | 처리 완료 |

### 2.4 피드백 상태(feedback semantic) 토큰

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-error-fg` | `#a01722` | 오류 메시지/인라인 유효성 오류 텍스트 |
| `--color-error-bg` | `#fdeef0` | 오류 배너 배경 |
| `--color-error-border` | `#eab6bc` | 오류 배너 경계 |
| `--color-success-fg` | `#1f6f45` | 성공 안내 텍스트 |

> **신규 토큰 최소화 근거**: 기반 10 + 심각도 8 + 상태 6 + semantic 4 = 28개. 심각도/상태는 기획이 요구한 enum 개수(4·3)와 1:1 대응이라 축소 불가하며, 그 외 추가 팔레트(그라디언트·보조 강조색 등)는 도입하지 않았다.

---

## 3. 타이포그래피

`vanilla-static` 원칙에 따라 **system font stack** 만 사용(웹폰트 CDN·다운로드 0건).

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
--font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
```

| 역할 | 토큰 | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| Heading L | `--fs-h1` | 1.5rem (24px) | 700 | 1.3 | 페이지 타이틀 |
| Heading M | `--fs-h2` | 1.125rem (18px) | 600 | 1.35 | 섹션 제목(등록/필터/목록) |
| Heading S | `--fs-h3` | 1rem (16px) | 600 | 1.4 | 카드 제목(피드백 title) |
| Body | `--fs-body` | 0.9375rem (15px) | 400 | 1.55 | 본문/설명 |
| Label | `--fs-label` | 0.875rem (14px) | 600 | 1.4 | 폼 라벨 |
| Caption | `--fs-caption` | 0.8125rem (13px) | 400 | 1.45 | 메타(시각/채널)·배지·도움말 |
| KPI 수치 | `--fs-kpi` | 1.75rem (28px) | 700 | 1.1 | KPI 카드 대표 숫자 |
| Mono | (id 표기) | 0.8125rem | 500 | 1.4 | `FB-####` 식별자 |

- 최소 본문 13px 이상 유지, 라인 길이 과다 방지 위해 설명 텍스트 컨테이너 max-width 확보.

---

## 4. 레이아웃

### 4.1 섹션 구조 (DOM/시각 순서)

```
┌───────────────────────────────────────────────────────────┐
│ Header  (h1 "고객 피드백 우선순위 보드" + 부제)              │
├───────────────────────────────────────────────────────────┤
│ KPI 요약  [전체][상태별][심각도 분포][평균 리드타임]         │
├──────────────────┬────────────────────────────────────────┤
│ 등록 폼 (aside)   │  필터 바 (검색 + status/sev/channel)     │
│  · 제목           │ ────────────────────────────────────── │
│  · 설명           │  결과 안내 (aria-live "N건 표시")        │
│  · 심각도 select  │  항목 목록 (피드백 카드[])               │
│  · 채널 select    │    · 빈 상태 / 로딩 / 오류 배너 대체표시  │
│  · 제출 버튼      │                                          │
└──────────────────┴────────────────────────────────────────┘
```

### 4.2 spacing / radius / elevation 토큰

| 토큰 | 값 | 토큰 | 값 |
|---|---|---|---|
| `--space-1` | 4px | `--radius-sm` | 6px |
| `--space-2` | 8px | `--radius-md` | 10px |
| `--space-3` | 12px | `--radius-lg` | 14px |
| `--space-4` | 16px | `--shadow-card` | `0 1px 2px rgba(31,41,51,.06), 0 1px 3px rgba(31,41,51,.08)` |
| `--space-5` | 24px | `--focus-ring` | `0 0 0 3px rgba(28,70,172,.35)` |
| `--space-6` | 32px | 컨테이너 max-width | 1200px (중앙 정렬) |

### 4.3 반응형 브레이크포인트 (데스크톱·태블릿 2단계)

| 브레이크포인트 | 조건 | KPI | 등록 폼 ↔ 목록 | 필터 바 |
|---|---|---|---|---|
| **데스크톱** | `≥1024px` | 4열 1행 | 2열 그리드 — `aside 340px` 고정 + `1fr` 목록 | 검색+3필터 그룹 가로 1행 |
| **태블릿** | `640px ~ 1023px` | 2×2 | 1열 세로 스택 — 등록 폼이 목록 위로 이동 | 검색 전체폭 1행, 필터 그룹 wrap(가로 스크롤 없음) |

- 640px 미만(모바일)은 본 task 비범위(기획/AC 는 데스크톱·태블릿만 요구). 태블릿 레이아웃이 그 이하에서도 깨지지 않게 `min-width:0`/`flex-wrap` 방어만 적용.
- 그리드 전환은 CSS `@media (max-width: 1023px)` 로 단일 분기.

---

## 5. 컴포넌트 명세

각 컴포넌트는 **props(입력) / 상태(state) / 인터랙션**을 기술한다. dev 는 이를 순수 렌더 함수 + 이벤트 핸들러로 구현한다(구현 형태는 dev 재량, 기획 §11).

### 5.1 KpiCard

| 항목 | 내용 |
|---|---|
| props | `label:string`, `value:string\|number`, `detail?:string`(보조 라인, 예 분포 %), `variant?:'default'`  |
| 상태 | 정적(전체 fixture 기준 계산값). 리드타임 `done` 0건 시 value=`"데이터 없음"`(기획 EC-10) |
| 인터랙션 | 없음(표시 전용). 클릭으로 필터 연동하지 않음(부분집합 KPI 비범위 §10) |
| 구성 | 상단 `label`(caption) · 대표 `value`(--fs-kpi) · 하단 `detail`. 심각도 분포 카드는 4개 미니 배지+건수로 표현 |

4개 카드: ① 전체 피드백 건수 ② 상태별 건수(검토 대기/계획됨/처리 완료 3분할) ③ 심각도별 분포(critical/high/medium/low 건수+%) ④ 평균 처리 리드타임(일).

### 5.2 RegisterForm (등록 폼)

| 항목 | 내용 |
|---|---|
| props | `onSubmit(payload)`, `saving:boolean`, `errors:{field:message}`, `submitError?:string` |
| 필드 | 제목(text) · 설명(textarea) · 심각도(select, 기본값 없음 "선택하세요") · 채널(select, 기본값 없음) — 기획 §3.3 |
| 상태 | `idle` / `invalid`(필드 인라인 오류) / `saving`(제출 버튼 비활성+"저장 중...") / `error`(저장 실패 배너+"다시 시도") / `success`(폼 초기화) |
| 유효성 | 제출 시 검증. title 1~100자·trim 후 비어있지 않음, description 1~1000자, severity/channel 필수 선택. 위반 필드는 `aria-invalid="true"` + 인라인 오류 텍스트(§5.5 매핑) |
| 인터랙션 | 제출 → `saving` 진입(버튼 disabled) → 성공 시 폼 리셋+aria-live assertive "피드백이 등록되었습니다"(기획 §5.8) / 실패 시 §5.6 오류 UI. 첫 오류 필드로 포커스 이동(기획 EC-07) |

### 5.3 FilterBar (필터 · 검색)

| 항목 | 내용 |
|---|---|
| props | `query:string`, `selected:{status[],severity[],channel[]}`, `onQueryChange`, `onToggle(cat,val)`, `onReset` |
| 컨트롤 | 검색 input(1개) + 3개 필터 그룹(status 3·severity 4·channel 4 체크박스) + "필터 초기화" 버튼 |
| 결합 규칙 | 카테고리 내 OR, 카테고리 간 AND, 검색 substring(대소문자 무관) AND (기획 §5.3) — UI 는 각 그룹을 `<fieldset><legend>` 로 묶어 그룹 의미 전달 |
| 상태 | 미선택 카테고리는 전체 통과. 활성 필터 개수 배지 표시(선택 사항). 결과 0건 → 목록 영역이 EmptyState 로 대체 |
| 인터랙션 | 체크박스 토글·검색 입력 시 즉시 재필터, 결과 개수 aria-live polite "N건 표시"(기획 §5.8-1). 초기화 → 전체 해제+검색어 제거 |

### 5.4 FeedbackList / FeedbackItem

| 항목 | 내용 |
|---|---|
| props(Item) | `feedback:{id,title,severity,channel,status,updatedAt}`, `onTransition(id,to)`, `transitioning:boolean` |
| 표시 필드 | id(mono) · title(h3) · SeverityBadge · ChannelText · StatusBadge · updatedAt(caption) — 기획 §5.1 |
| 정렬 | severity 내림차순 → createdAt 오름차순 → id 오름차순(기획 §5.1, 렌더 순서만, dev 계산) |
| 상태 전환 버튼 | 다음 허용 전이만 노출(기획 §4.1): `pending_review`→"계획됨으로" / `planned`→"처리 완료로" / `done`→버튼 없음(전환 완료 표기). 역방향/단계 생략 버튼은 렌더하지 않음(가드 G1·G2 를 UI 에서 원천 차단) |
| 상태 | 전환 진행 중 해당 항목 버튼만 비활성+"저장 중..."(기획 §5.7), 실패 시 항목 인라인 오류+"다시 시도"(기획 §5.5) |
| 인터랙션 | 전환 성공 → 목록 재정렬 + aria-live assertive "상태가 변경되었습니다"(기획 §5.8-2) |

### 5.5 SeverityBadge / StatusBadge / ChannelText

- **SeverityBadge**: props `severity`. §2.2 토큰으로 배경/전경, 레이블 텍스트 병기(치명적/높음/보통/낮음). 색상+텍스트 이중 인코딩(색각 접근성).
- **StatusBadge**: props `status`. §2.3 토큰, 레이블(검토 대기/계획됨/처리 완료).
- **ChannelText**: props `channel`. 배지 아닌 caption 텍스트로 표기(앱 내 문의/웹 문의 폼/이메일/SNS) — 배지 남용 방지(정보 위계 관리).

### 5.6 상태 대체 컴포넌트 (Empty / Loading / Error)

| 컴포넌트 | props | 표시 | 근거 |
|---|---|---|---|
| **EmptyStateFiltered** | `onReset` | "조건에 맞는 피드백이 없습니다" + "필터 초기화" 버튼 | 기획 §5.6 (필터/검색 0건) |
| **EmptyStateNoData** | — | "등록된 피드백이 없습니다" + 등록 폼 이동 안내 | 기획 §5.6 (fixture 0건, 방어적) |
| **ListLoading** | — | "불러오는 중..." 스켈레톤 3행 + aria-live polite | 기획 §5.7 (최초 로드) |
| **SaveErrorBanner** | `message`, `onRetry` | 인라인 오류 배너(§2.4 error 토큰) + "다시 시도" 버튼 | 기획 §5.5·EC-08 |

### 5.7 AriaLiveRegion (3개소, 기획 §5.8)

| 영역 | politeness | 갱신 내용 |
|---|---|---|
| 목록 결과 안내 | `polite` | 필터/검색 시 "N건 표시" |
| 저장 결과 안내 | `assertive` | 성공("피드백이 등록되었습니다"/"상태가 변경되었습니다") 또는 실패("저장에 실패했습니다. 다시 시도해 주세요") |
| 로딩 안내 | `polite` | "저장 중입니다" / "불러오는 중입니다" |

세 영역 모두 시각적으로는 존재하되(sr 전용 클래스 또는 실제 텍스트) 화면 리더가 읽도록 상시 DOM 에 유지.

---

## 6. 접근성 명세 (키보드 포커스 순서 · aria)

### 6.1 Tab 포커스 순서 (기획 §5.8)

DOM 순서를 시각 순서와 일치시키고 `tabindex` 양수 사용 금지(자연 순서 유지).

1. 검색 input
2. status 필터 체크박스(검토 대기 → 계획됨 → 처리 완료)
3. severity 필터 체크박스(치명적 → 높음 → 보통 → 낮음)
4. channel 필터 체크박스(앱 내 문의 → 웹 문의 폼 → 이메일 → SNS)
5. "필터 초기화" 버튼
6. 등록 폼: 제목 → 설명 → 심각도 select → 채널 select → 제출 버튼
7. 목록: 각 카드의 상태 전환 버튼(목록 렌더 순서대로)

> 시각 배치는 데스크톱에서 등록 폼(좌)·필터/목록(우) 2열이나, **키보드 흐름은 "필터→등록→목록" 논리 순서**를 우선한다(운영 시나리오: 먼저 조회, 없으면 등록). dev 는 DOM 순서를 이 목록 기준으로 배치하고, 시각 위치는 CSS grid `order`/배치로 조정.

### 6.2 포커스 가시성 · 활성화

- 모든 인터랙티브 요소는 포커스 시 `--focus-ring`(3px, `--color-focus`) outline 유지 — `outline:none` 로 제거 금지.
- 버튼/체크박스/select 는 `Enter`/`Space` 로 활성화(네이티브 시맨틱 요소 사용으로 기본 확보).
- 모든 폼 입력은 `<label for>` 명시 연결(기획 §5.8). select 는 placeholder 옵션 `disabled` 로 "선택하세요" 제공.
- 배지는 색상 + 텍스트 이중 인코딩으로 색각 이상 대응. `aria-invalid`, `aria-describedby`(인라인 오류 연결) 적용.

---

## 7. dev 구현 가이드 (BF-1170)

CSS 변수·클래스 네이밍은 **권장(가이드)** 이며 dev 재량으로 조정 가능(픽셀/클래스명 일치 의무 없음). 단 색상은 §2 토큰 변수만 사용(하드코딩 금지).

### 7.1 단계별 지침

1. `feedback-board/style.css` 최상단 `:root` 에 §2·§3·§4.2 토큰을 CSS 변수로 그대로 선언.
2. 마크업 골격: `<header>` → `<section class="kpi-summary">` → `<main class="board-grid">` 내부에 `<aside class="register-panel">` + `<section class="list-panel">`(필터 바 + 목록). DOM 순서는 §6.1 Tab 순서를 우선(필터→등록→목록), 데스크톱 시각 배치는 `.board-grid` grid + `order` 로 조정.
3. 배지: `.badge--sev-{severity}` / `.badge--status-{status}` 클래스가 §2.2·§2.3 변수를 참조하도록 매핑.
4. 상태 전환 버튼: 현재 status 기준 허용 전이만 렌더(§5.4). 라벨 문구는 §5.4 표대로.
5. 상태 대체(§5.6)는 목록 컨테이너를 조건부 치환(로딩→목록/빈 상태, 저장 오류는 배너로 상단 삽입).
6. aria-live 3영역(§5.7)을 `<div class="sr-live" aria-live="...">` 로 상시 배치, 이벤트 후 textContent 갱신.
7. 반응형: `@media (max-width:1023px)` 단일 분기로 `.board-grid` 1열, `.kpi-summary` 2×2, 필터 그룹 `flex-wrap`.

### 7.2 권장 CSS 변수 · 클래스명

| 대상 | 권장 이름 |
|---|---|
| 페이지 그리드 | `.board-grid` (desktop `grid-template-columns: 340px 1fr`) |
| KPI 카드 | `.kpi-card`, 수치 `.kpi-card__value`, 라벨 `.kpi-card__label` |
| 등록 폼 | `.register-form`, 필드 `.form-field`, 오류 `.form-error`(`--color-error-fg`) |
| 필터 그룹 | `.filter-group`(`<fieldset>`), 검색 `.filter-search` |
| 목록/항목 | `.feedback-list`, `.feedback-item`, 메타 `.feedback-item__meta` |
| 배지 | `.badge`, `.badge--sev-critical` … `.badge--status-done` |
| 상태 대체 | `.state-empty`, `.state-loading`, `.state-error` |
| aria-live | `.sr-live` (시각 숨김: `position:absolute;clip-path` 등) |

### 7.3 기존 요소 보존

- 신규 모듈이므로 보존 대상 기존 UI 없음. 단 `feedback-board/` 외부(다른 모듈·루트 설정·`package.json`) 미수정 — 기획 §0 additive 전제.
- fixture 값(§6 기획)·리드타임 검증값 10.0일·정렬 규칙은 디자인이 변경하지 않는다(dev/tester 계약).

---

## 8. AC 매핑 표 (본 designer task 기준)

| # | Given | When | Then | 충족 섹션 |
|---|---|---|---|---|
| AC-D1 | 기획 명세(BF-1167) | 디자인 명세 작성 | `docs/design/feedback-board-BF-1167.md` 에 컴포넌트·토큰·반응형·접근성 명세 + AC 매핑 표 포함 | §2(토큰)·§3(타이포)·§4(반응형)·§5(컴포넌트)·§6(접근성)·본 §8 |
| AC-D2 | mockup | 브라우저 열람 | 데스크톱·태블릿 레이아웃과 상태 배지가 §2 토큰으로 렌더 | §9 mockup + §2·§4.3 |
| ↳ 기획 AC-1 | Epic 요구 | 등록/상태/필터/KPI/접근성/fixture 문서화 | 등록 폼(§5.2)·상태 전환 버튼(§5.4)·필터(§5.3)·KPI(§5.1)·접근성(§6)이 시각 명세로 매핑 | §5·§6 |
| ↳ 기획 AC-1-부속 | 〃 | 오류/재시도·빈 상태·로딩 요건 | 상태 대체 컴포넌트(§5.6)·저장 오류 배너 | §5.6 |
| ↳ 기획 AC-2-부속2 | KPI 측정 | 4개 KPI 시각화 | KpiCard 4종(전체/상태별/심각도 분포/리드타임)·리드타임 데이터 없음 처리 | §5.1 |

---

## 9. mockup 참조

- **경로**: `docs/design/feedback-board-mockup/feedback-board-BF-1167.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, system font).
- `:root` 에 §2 컬러 토큰 변수 선언, 데스크톱 기본 렌더 + 태블릿 레이아웃을 별도 `<section>` 프리뷰로 병기(같은 토큰 사용).
- 포함 상태: 기본 목록(정렬 순) · 심각도/상태 배지 4종·3종 · 필터 바 · 등록 폼(오류 상태 예시) · KPI 4카드 · 빈 상태 · 로딩 스켈레톤 · 저장 오류 배너. placeholder 콘텐츠는 기획 §6 fixture 를 참고한 샘플.
- **dev 는 mockup 을 참조 가이드로 사용하되 픽셀 일치 의무 없음** — §2 토큰과 §5 컴포넌트 명세가 우선.
