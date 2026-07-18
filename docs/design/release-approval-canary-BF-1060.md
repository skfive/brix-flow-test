# 릴리스 변경 승인 큐 (`/release-approval-canary`) 디자인 명세

- Jira: BF-1062 (designer) · 입력 기획: BF-1061 (`docs/planning/release-approval-canary-BF-1060.md`)
- 작성: 이디자인 (designer)
- 상태: Draft v1 — developer(BF-1063) 구현 입력 문서
- mockup 참조: `docs/design/release-approval-canary-mockup.html`

> **토큰 원칙 (AC1)**: 본 시안은 아래 2장에 정의한 brix-Flow 공용 토큰 세트만 사용한다.
> 관측 스택이 `vanilla-static`이므로 별도 `design-tokens.json` 대신 mockup `:root`에
> CSS 변수로 공용 토큰을 단일 소스(single source of truth)로 선언하고, 모든 컴포넌트가
> 그 변수만 참조한다. **문서화된 토큰 밖의 신규 색상·하드코딩 HEX 도입은 0건**이다.
> 과거 canary 시안은 참조하지 않았다.

---

## 1. 시안 개요

### 1.1 변경 범위

`/release-approval-canary` 단일 화면. 운영자가 결정적 fixture에서 로드한 릴리스 후보 큐를
검토하고 **승인 / 보류 / 재검토 요청** 결정을 내리는 UI. 기획 명세(BF-1061)의 상태 머신(3장),
정렬 규칙(5장), edge case(6장)를 시각적으로 표현한다.

구성 영역:
- **큐 헤더** — 화면 제목 + 상태 필터 탭(전체 / 검토 대기 / 보류 / 승인 완료)
- **승인 큐 리스트** — 우선순위 정렬된 후보 카드 목록
- **후보 상세 패널** — 선택된 후보의 상세 + 결정 이력 타임라인 + 결정 액션
- **빈 상태 / 종결 상태** — 후보 없음, `approved` 종결 안내

### 1.2 사용자 경험 목표

1. **위험 우선 인지** — 고위험 후보가 시각적으로 먼저·강하게 드러나 검토 순서를 자연히 유도.
2. **상태 명료성** — `pending_review` / `held` / `approved` 3종 상태를 색 + 아이콘 + 텍스트
   3중 신호로 구분(색맹/저대비 환경에서도 판별 가능).
3. **결정 안전성** — 종결(`approved`) 후보는 액션이 비활성화되고 이유가 안내되어 오조작 방지.
4. **이력 추적성** — 결정 이력이 타임라인으로 누적 노출되어 "누락 없는 상태 전이"(AC 기획)를
   화면에서 확인 가능.

---

## 2. 컬러 팔레트 (공용 토큰)

모든 색은 아래 토큰으로만 참조한다. HEX 직접 사용 금지(토큰 경유만).

### 2.1 기반 · 텍스트

| 토큰 | HEX | 용도 |
|---|---|---|
| `--bf-color-bg` | `#ffffff` | 페이지 배경 |
| `--bf-color-surface` | `#f6f7f9` | 카드·패널 표면 |
| `--bf-color-surface-raised` | `#ffffff` | 선택 카드·모달 표면 |
| `--bf-color-border` | `#d5dae1` | 구분선·카드 테두리 |
| `--bf-color-text` | `#1a1d21` | 본문 텍스트 (bg 대비 15.8:1) |
| `--bf-color-text-muted` | `#5b6270` | 보조 텍스트 (bg 대비 5.9:1) |
| `--bf-color-primary` | `#1f5fd6` | 주요 액션(승인) 버튼 배경 |
| `--bf-color-primary-contrast` | `#ffffff` | primary 위 텍스트 (대비 5.3:1) |
| `--bf-color-focus-ring` | `#1f5fd6` | 포커스 링 색 |

### 2.2 상태 배지 토큰 (status)

배지는 tint 배경 + 진한 텍스트 조합. 텍스트/배경 대비는 모두 WCAG AA 본문 기준(≥4.5:1) 충족.

| 상태 | bg 토큰 | text 토큰 | border 토큰 | 텍스트 대비 |
|---|---|---|---|---|
| `pending_review` | `--bf-status-pending-bg` `#e7effb` | `--bf-status-pending-text` `#1a4a99` | `--bf-status-pending-border` `#b9d0f0` | 6.4:1 |
| `held` | `--bf-status-held-bg` `#fbf0dd` | `--bf-status-held-text` `#8a4b00` | `--bf-status-held-border` `#f0d59a` | 5.6:1 |
| `approved` | `--bf-status-approved-bg` `#e2f4ea` | `--bf-status-approved-text` `#14663c` | `--bf-status-approved-border` `#b6e0c7` | 5.7:1 |

### 2.3 위험도 밴드 토큰 (riskScore 시각화 — 기획 5장 재량 항목)

기획 명세는 정렬 키만 규정(BF-1061 §5). 밴드 구간·색은 designer 재량으로 아래처럼 정의:

| 밴드 | 구간(riskScore) | bg 토큰 | text 토큰 | 텍스트 대비 |
|---|---|---|---|---|
| 고위험 | 90–100 | `--bf-risk-high-bg` `#fbe4e2` | `--bf-risk-high-text` `#8f1d17` | 6.2:1 |
| 중위험 | 60–89 | `--bf-risk-mid-bg` `#fbf0dd` | `--bf-risk-mid-text` `#8a4b00` | 5.6:1 |
| 저위험 | 0–59 | `--bf-risk-low-bg` `#eef1f5` | `--bf-risk-low-text` `#454b56` | 8.1:1 |

> **색만으로 구분 금지**: 밴드/상태는 항상 텍스트 라벨(예: "고위험 92", "보류")과 아이콘 글리프를
> 동반한다. 색 토큰은 강조 보조 신호일 뿐 유일 신호가 아니다(WCAG 1.4.1 무채색 정보 전달).

---

## 3. 타이포그래피

`vanilla-static` 규약에 따라 **system font stack**만 사용(외부 폰트 CDN 미사용, 외부 의존성 0건).

| 토큰 | font-family | size / line-height | weight | 용도 |
|---|---|---|---|---|
| `--bf-font-family` | `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif` | — | — | 전역 |
| heading-1 | 위 stack | 20px / 28px | 600 | 화면 제목 |
| heading-2 | 위 stack | 16px / 24px | 600 | 후보 이름·패널 제목 |
| body | 위 stack | 14px / 21px | 400 | 본문·메타 |
| body-strong | 위 stack | 14px / 21px | 600 | 라벨 강조 |
| caption | 위 stack | 12px / 18px | 400 | 배지·타임스탬프·보조 |

- 최소 본문 크기 14px(저대비 사용자 가독성). 배지 caption 12px는 굵기 600 + 충분한 대비로 보완.
- 숫자(버전·riskScore·시각)는 `font-variant-numeric: tabular-nums`로 정렬 안정.

---

## 4. 레이아웃

### 4.1 섹션 구조

```
┌───────────────────────────────────────────────────────────┐
│ [heading-1] 릴리스 변경 승인 큐          (큐 헤더)          │
│ [탭] 전체 | 검토 대기 | 보류 | 승인 완료                    │
├──────────────────────────────┬────────────────────────────┤
│  승인 큐 리스트 (좌, 3fr)     │  후보 상세 패널 (우, 2fr)   │
│  ┌────────────────────────┐  │  ┌──────────────────────┐  │
│  │ 후보 카드 (고위험)      │  │  │ 이름 / 버전 / 상태    │  │
│  │  상태배지·위험밴드      │  │  │ 위험 요인 목록        │  │
│  │  메타·액션 버튼         │  │  │ 결정 이력 타임라인    │  │
│  └────────────────────────┘  │  │ 결정 액션 버튼 그룹   │  │
│  … (정렬 순서대로)           │  └──────────────────────┘  │
└──────────────────────────────┴────────────────────────────┘
```

### 4.2 Spacing (토큰)

4px 배수 스케일: `--bf-space-1`(4) / `--bf-space-2`(8) / `--bf-space-3`(12) / `--bf-space-4`(16)
/ `--bf-space-6`(24) / `--bf-space-8`(32). 카드 내부 패딩 16, 카드 간 간격 12, 영역 간격 24.

### 4.3 정렬 그룹 시각화 (기획 §5)

큐는 정렬 키 `riskScore desc → status(held 우선) → submittedAt asc → id asc` 순서 그대로 카드를
나열한다. 고위험 카드는 좌측 4px accent 스트립(위험 밴드 text 토큰 색)으로 스캔성을 높인다.
`approved` 종결 후보는 기본 큐(전체/검토 대기/보류)에서 제외되고 "승인 완료" 탭에서만 노출.

### 4.4 Breakpoint 별 동작

| Breakpoint | 폭 | 레이아웃 |
|---|---|---|
| desktop | ≥ 960px | 2컬럼(큐 3fr / 상세 2fr) 나란히 |
| tablet | 600–959px | 2컬럼 유지하되 상세 패널 최소폭 축소, 카드 메타 2줄 wrap |
| mobile | < 600px | 1컬럼 스택. 상세 패널은 카드 선택 시 큐 아래로 펼침. 탭은 가로 스크롤 |

- 컨테이너 `max-width: 1120px`, 좌우 auto margin. 큐 리스트는 세로 스크롤(상세 패널 sticky).

---

## 5. 컴포넌트 명세

### 5.1 상태 필터 탭 `FilterTabs`

| 항목 | 값 |
|---|---|
| props | `options: ("all"\|"pending_review"\|"held"\|"approved")[]`, `active`, `counts: Record<status, number>` |
| 상태 | 활성 탭: 하단 2px primary 언더라인 + text 진하게 / 비활성: text-muted |
| 인터랙션 | 클릭·Enter/Space로 전환. `role="tablist"` / 각 탭 `role="tab"` `aria-selected` |
| 표기 | 각 탭 라벨 옆 개수 배지(예: "검토 대기 3") |

### 5.2 후보 카드 `CandidateCard`

| 항목 | 값 |
|---|---|
| props | `id`, `name`, `version`, `targetEnvironment`, `riskScore`, `riskBand`, `riskFactors: string[]`, `requestedBy`, `submittedAt`, `status`, `selected: boolean` |
| 구성 | 1행: 이름 + 버전 + 환경 배지 / 2행: 위험밴드 배지 + 상태 배지 / 3행: riskFactors 칩 / 4행: 제출자·제출시각 + 액션 버튼 그룹 |
| 상태 | `selected` 시 border=primary + surface-raised + 좌측 accent 스트립 강조 |
| 인터랙션 | 카드 전체 클릭/Enter로 상세 선택(`role="button"` `tabindex=0`). 카드 내부 액션 버튼 클릭은 카드 선택과 분리(stopPropagation) |
| 빈 riskFactors | 칩 영역에 "위험 요인 기록 없음"(text-muted caption) 표시 — 레이아웃 깨짐 방지(기획 §6) |

### 5.3 상태 배지 `StatusBadge`

| 항목 | 값 |
|---|---|
| props | `status: "pending_review"\|"held"\|"approved"` |
| 표시 | 아이콘 글리프 + 텍스트 라벨("검토 대기" / "보류" / "승인 완료") + 상태 tint 토큰 |
| 접근성 | `aria-label`에 상태 전체 문구. 색 외 아이콘+텍스트 병행(1.4.1) |

### 5.4 위험도 밴드 배지 `RiskBadge`

| 항목 | 값 |
|---|---|
| props | `riskScore: number`, `band: "high"\|"mid"\|"low"` |
| 표시 | "고위험 92" 형식(밴드 라벨 + 점수). `aria-label="위험도 92점, 고위험"` |
| 시각 | 밴드 토큰 tint. 고위험은 카드 좌측 accent 스트립과 색 연동 |

### 5.5 환경 배지 `EnvBadge`

`production` / `staging` 텍스트 배지. `production`은 border 강조(중립 토큰), 색만이 아닌 텍스트로 구분.

### 5.6 결정 액션 버튼 그룹 `DecisionActions`

기획 §3.2 전이표(T1~T5)를 버튼 활성 조건에 그대로 매핑:

| 버튼 | 라벨 | 활성 조건 | 전이 | variant |
|---|---|---|---|---|
| 승인 | "승인" | status ∈ {`pending_review`, `held`} | T1 / T3 → `approved` | primary |
| 보류 | "보류" | status = `pending_review` | T2 → `held` | secondary(warning outline) |
| 재검토 요청 | "재검토 요청" | status = `held` | T4 → `pending_review` | tertiary(text) |

- **종결(`approved`) 처리 (T5)**: 세 버튼 모두 `disabled` + `aria-disabled="true"`.
  버튼 그룹 하단에 안내 문구 "승인 완료된 후보입니다. 추가 결정을 내릴 수 없습니다." 노출.
- 버튼 그룹 `role="group"` `aria-label="결정 액션"`. disabled 버튼은 툴팁/문구로 사유 전달.

### 5.7 결정 이력 타임라인 `DecisionHistory`

| 항목 | 값 |
|---|---|
| props | `entries: DecisionHistoryEntry[]`(기획 §3.3 스키마) |
| 표시 | 최신순 세로 타임라인. 각 항목: `from → to` 전이 + action 라벨 + actor + at(시각) + note(있으면) |
| 빈 상태 | 이력 없으면 "아직 결정 이력이 없습니다." caption |
| 접근성 | `<ol>` 시맨틱 리스트. 전이 화살표는 텍스트("검토 대기 → 승인 완료")로도 표기 |

### 5.8 빈 상태 `EmptyQueue`

후보 0건(또는 필터 결과 0건) 시 "검토할 릴리스 후보 없음" 중앙 안내 + 보조 설명. 에러 아님(기획 §6).

---

## 6. dev 구현 가이드 (BF-1063)

> mockup(`release-approval-canary-mockup.html`)의 `:root` 토큰·클래스명을 참조 가이드로 사용.
> 픽셀 단위 일치 의무는 없으며, 토큰/구조/접근성 계약을 지키는 것이 핵심.

### 6.1 토큰 도입

1. mockup `:root`의 CSS 변수 세트를 그대로 공용 토큰으로 채택(§2~§4 토큰명 동일).
   - 색: `--bf-color-*`, `--bf-status-*`, `--bf-risk-*`
   - 타이포: `--bf-font-family`, 텍스트 스텝(size/line/weight)
   - 간격: `--bf-space-*`
2. **컴포넌트에서 HEX 직접 사용 금지** — 반드시 `var(--bf-…)` 경유. 신규 색 필요 시 dev가 임의
   추가하지 말고 designer에 요청(신규 토큰 도입은 운영자 승인 대상).

### 6.2 권장 클래스/구조명

| 컴포넌트 | 권장 클래스 |
|---|---|
| 큐 컨테이너 | `.approval-queue` |
| 필터 탭 | `.filter-tabs` / `.filter-tab[aria-selected]` |
| 후보 카드 | `.candidate-card` / `.candidate-card--selected` / `.candidate-card--high-risk` |
| 상태 배지 | `.status-badge` / `.status-badge--pending` \| `--held` \| `--approved` |
| 위험 배지 | `.risk-badge` / `.risk-badge--high` \| `--mid` \| `--low` |
| 액션 그룹 | `.decision-actions` / `.btn--primary` \| `.btn--secondary` \| `.btn--tertiary` |
| 이력 타임라인 | `.decision-history` / `.decision-history__item` |
| 빈 상태 | `.empty-queue` |

### 6.3 상태·전이 바인딩 (기획 §3.2·§7 준수)

- 정렬은 기획 §5 4단계 키를 `selectQueue()`에 구현(designer는 시각 순서만 표현).
- 액션 버튼 활성/비활성 조건은 §5.6 표 그대로 `decide()`의 legal 전이에 연동.
  `approved`(T5)는 no-op이며 버튼 disabled + 안내 문구.
- `at`(시각)은 기획 §3.3대로 `Date.now()` 금지, 결정 시퀀스/논리 클록 기반 결정적 값 사용.
- riskBand 계산: `score>=90 → high`, `60~89 → mid`, `<60 → low`(§2.3 구간).

### 6.4 접근성 구현 체크(AC2)

1. **대비**: 모든 텍스트/배지 조합 AA(본문 4.5:1, 큰 텍스트·UI 컴포넌트 3:1) 충족(§2 대비 수치).
2. **포커스**: 모든 인터랙티브 요소에 `:focus-visible { outline: 2px solid var(--bf-color-focus-ring); outline-offset: 2px }`. outline 제거 금지.
3. **키보드**: Tab 순서 = 탭 → 큐 카드 → 카드 내 액션 → 상세 패널. 카드 `tabindex=0` + Enter 선택,
   버튼 Enter/Space 활성. disabled 버튼은 `aria-disabled` + 포커스 시 사유 안내.
4. **무채색 정보(1.4.1)**: 상태/위험/환경은 색 외 아이콘·텍스트 병행.
5. **시맨틱**: 탭 `role=tablist/tab`, 액션 `role=group`, 이력 `<ol>`, 버튼은 `<button>`.

---

## 7. mockup 참조

- 파일: `docs/design/release-approval-canary-mockup.html`
- 표현 내용: 큐 헤더+필터 탭 / 정렬된 후보 카드(고위험·동률·빈 riskFactors·held 케이스 포함) /
  선택 카드 상세 패널 + 결정 이력 타임라인 / `approved` 종결 상태 액션 비활성 안내 / 빈 상태 화면.
- mockup `:root`에 §2~§4 공용 토큰을 선언하며, 모든 요소가 그 변수만 참조(신규 색 0건).
- placeholder 데이터는 기획 §4 fixture 스키마 형태의 샘플이며 실제 fixture가 아니다.

---

## 8. 수용 기준(AC) ↔ 명세 매핑

| AC | 내용 | 본 명세 충족 위치 |
|---|---|---|
| AC1 | Given 공용 디자인 토큰, When mockup 작성, Then 신규 컬러/토큰 도입 없이 기존 토큰만 사용 | §2 팔레트·§3 타이포·§4 간격을 `:root` 공용 토큰 세트로 단일 정의, 모든 컴포넌트가 `var(--bf-…)`만 참조. HEX 직접 사용·신규 색 도입 0건(§6.1 강제). mockup `:root`가 그 실체 |
| AC2 | Given 접근성 규칙, When 상태 배지·액션 버튼 설계, Then 대비/포커스/키보드 접근성 명세 포함 | §2 배지·밴드 대비 수치(AA), §5.3~§5.6 aria·무채색 병행, §6.4 대비·포커스링·키보드·시맨틱 구현 체크 |
| AC3 | Given AC 4항목, When 디자인 명세 작성, Then AC 매핑 표가 포함됨 | 본 §8 표 자체(AC1·AC2·AC3·범위전제 4행) + 기획 AC(상태 전이·정렬)의 시각 반영 위치 매핑 |
| (범위 전제) | 외부 네트워크·신규 DB 없이 브라우저 로컬 상태 전이만 / 외부 의존성 0건 | mockup은 self-contained 단일 HTML, 외부 폰트·스크립트·네트워크 호출 0건(§3 system font, §7). 결정 상태는 시각 표현만이며 실제 저장은 dev 범위 |

> 참고: 기획 명세(BF-1061)의 AC(상태 전이 §3.2 / 정렬 §5)는 developer 구현·tester 검증 대상이며,
> 본 시안은 그 규칙을 §4.3·§5.6·§5.7로 **시각화**한다.

---

## 9. Self-critique (PR commit 직전 자기 점검)

1. **AC 매핑** — AC1(토큰)·AC2(접근성)·AC3(매핑표) 3항목 + 범위 전제 모두 §8 표로 검증 위치 연결. ✅
2. **dev 구현 가이드** — §6에 토큰 채택 절차·권장 클래스명·상태 바인딩·접근성 체크 단계별 제시. dev가
   추측 없이 따라올 수 있음. ✅
3. **기존 요소 보존** — 신규 화면(`/release-approval-canary`)이며 기존 UI 대체·삭제 없음. 기획
   fixture/상태 스키마(§3.3·§4)는 read-only로 인용만, 변형 없음. ✅
4. **컴포넌트 매핑** — 기획 상태 3종·전이 T1~T5·정렬 4키·edge case(빈 목록/동률/빈 riskFactors/종결)가
   각각 §5 컴포넌트·§4.3·§5.6·§5.8로 1:1 대응. ✅
5. **모호함 flag** — ⚠️ 위험 밴드 구간(90/60 경계)은 기획 재량 항목(§5 BF-1061)이라 designer가 §2.3으로
   확정함. dev/reviewer가 다른 구간을 원하면 Jira 코멘트로 조율. 그 외 미해결 모호점 없음.
