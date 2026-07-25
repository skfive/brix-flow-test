# 리뷰 head 전환 타임라인 — 디자인 명세 (BF-1178)

> owned artifact key: `review-head-timeline-BF-1178`
> route: `/demo/review-head-timeline`
> primary-module: `review-head-timeline`
> mockup 참조: `docs/design/mockups/review-head-timeline-BF-1178.html`
> 자매 작업: `review-generation-inspector-BF-1173`(시각 언어·상태 토큰 계승)

## ⚠️ 스택·키·경로 정정 (fail-honest)

- **JIRA 키 오프셋**: 본 dispatch task key는 `BF-1179`이나 AC가 명시한 산출물 경로는 `docs/design/review-head-timeline-BF-1178.md`입니다. 자매 작업도 task=BF-1174 / artifact-key=BF-1173의 −1 오프셋을 따랐습니다. 본 산출물은 **AC가 명시한 `BF-1178` 키**를 authority로 markdown·mockup 파일명을 일치시켰습니다. (self-critique §5 flag 참조)
- **스택 규약 정정**: 요청 marker는 미제공/`typescript-monorepo` 기대일 수 있으나, **실제 저장소 관측 규약은 `vanilla-static`**(base_sha `f0f5d5d0`, evidence `package.json@1e806db4d756`)입니다. 본 명세·mockup은 관측 규약을 authority로 따릅니다: **외부 의존성 0건, system font stack, CSS 변수 자체 정의**.
- **route/entry-path ownership 정정**: 요청 route `/demo/review-head-timeline`의 예상 entry는 `demo/review-head-timeline/index.html`이나 이는 designer owned_paths(`docs/design/**`) 밖입니다. designer는 SPA 코드를 구현하지 않으므로 충돌은 없으며, dev-1이 해당 경로 ownership을 교정·확인한 뒤 구현합니다.
- **결정론(determinism)**: 외부 API 호출 없이 로컬 상태(고정된 세대 목록·SHA·타임스탬프)만으로 동작하는 것을 전제로 설계합니다. 시간 표기는 상대 문구(예: "2일 전")를 로컬 계산으로 도출하되 mockup에서는 고정 placeholder를 씁니다.

---

## 1. 시안 개요

### 변경 범위
`/demo/review-head-timeline` SPA 신규 화면. 리뷰 대상 커밋이 **이전 head → 새 head**로 전환되는 과정을, **세대(generation)별 타임라인**을 핵심 축으로 하여 시각화한다. 타임라인의 각 노드는 하나의 head 세대이며, 세대 간 전환은 **상태 배지 · 비교 카드 · 전환 이펙트**로 보강한다.

자매 화면 `review-generation-inspector`가 "현재 리뷰가 유효한가"라는 **단일 판정**에 초점을 뒀다면, 본 화면은 **여러 세대에 걸친 head 전환 이력 자체**를 타임라인으로 펼쳐 보이는 데 초점을 둔다. 두 화면은 동일한 상태 토큰·타이포·간격을 공유해 하나의 시각 시스템으로 읽힌다.

### 사용자 경험 목표
- 사용자가 **세대 변화가 한눈에 보이는 타임라인**으로 head가 어떻게 이어져 왔는지 시간순으로 파악한다.
- 세대를 선택하면 그 세대와 직전 세대를 **비교 카드**로 나란히 보고, **전환 이펙트**로 "무엇이 바뀌었나"를 즉시 감지한다.
- 세대 상태 3종(**동일 세대 · 새 세대 · 검토 필요**)을 색·아이콘·문구 3중 코드로 구분(색맹 접근성 보장).
- 데스크톱/모바일 모두 조작 가능하며 **키보드만으로** 세대 이동·선택·상세 열람·닫기가 가능하다.

### 세대 상태 판정 규칙 (state semantics)
| 상태 | 판정 조건 | 의미 | 상태 문구(고정) |
|------|-----------|------|-----------------|
| **동일 세대** (`same`) | `prevHeadSha === currHeadSha` | 리뷰 대상 콘텐츠가 직전 세대와 동일 — 재검토 불필요 | "직전 세대와 동일 — 재검토 불필요" |
| **새 세대** (`new`) | `prevHeadSha !== currHeadSha` 이고 미해결/충돌 없음 | 새 head로 갱신 — 새 리뷰 세대 시작 | "새 head로 전환됨 — 새 세대 시작" |
| **검토 필요** (`review`) | SHA 변경 + 미해결 스레드/충돌/stale 존재 | 이전 리뷰 결과가 무효화될 수 있어 사람 확인 필요 | "head 전환 + 미해결 존재 — 사람 확인 필요" |

> 상태 문구는 배지·비교 카드·상세 패널·`aria-live` 안내에서 동일 문안을 재사용해 일관성을 확보한다.

---

## 2. 컬러 팔레트

자매 화면과 **동일 값**을 사용하되 prefix만 `--rht-*`로 격리(타 demo 스타일 비침입).

### 기본(neutral) 토큰
| 역할 | 토큰명 | HEX |
|------|--------|-----|
| 배경 | `--rht-bg` | `#F8FAFC` |
| 표면/카드 | `--rht-surface` | `#FFFFFF` |
| 표면(강조) | `--rht-surface-muted` | `#F1F5F9` |
| 경계선 | `--rht-border` | `#E2E8F0` |
| 본문 텍스트 | `--rht-text` | `#0F172A` |
| 보조 텍스트 | `--rht-text-secondary` | `#475569` |
| 흐린 텍스트 | `--rht-text-muted` | `#94A3B8` |

### 브랜드/액센트 토큰
| 역할 | 토큰명 | HEX |
|------|--------|-----|
| primary | `--rht-primary` | `#4F46E5` |
| primary hover | `--rht-primary-hover` | `#4338CA` |
| accent(포커스 링) | `--rht-focus-ring` | `#6366F1` |

### 상태(semantic) 토큰 — 세대 상태 3종
| 상태 | 강조색 토큰 | 강조 HEX | 배경 토큰 | 배경 HEX | 텍스트 토큰 | 텍스트 HEX |
|------|-------------|----------|-----------|----------|-------------|------------|
| 동일 세대 | `--rht-same` | `#16A34A` | `--rht-same-bg` | `#DCFCE7` | `--rht-same-fg` | `#166534` |
| 새 세대 | `--rht-new` | `#2563EB` | `--rht-new-bg` | `#DBEAFE` | `--rht-new-fg` | `#1E40AF` |
| 검토 필요 | `--rht-review` | `#D97706` | `--rht-review-bg` | `#FEF3C7` | `--rht-review-fg` | `#92400E` |

> 색 대비: 각 상태 `*-fg` on `*-bg` 조합은 WCAG AA(4.5:1) 이상. 색 외에 **아이콘 + 라벨 텍스트**를 항상 병기해 색맹 사용자도 구분 가능(same=`✓`, new=`↑`, review=`⚠`).

---

## 3. 타이포그래피

system font stack 사용(외부 폰트 로드 없음):
```
--rht-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--rht-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | font-family | size | weight | line-height | 용도 |
|------|-------------|------|--------|-------------|------|
| Page title (h1) | sans | 24px | 700 | 1.25 | 화면 제목 "리뷰 head 전환 타임라인" |
| Section heading (h2) | sans | 18px | 600 | 1.33 | "세대 타임라인", "세대 비교" 등 |
| Card title (h3) | sans | 15px | 600 | 1.4 | 비교 카드 헤더 |
| Body | sans | 14px | 400 | 1.5 | 본문/설명 |
| Caption | sans | 12px | 500 | 1.4 | 타임스탬프·메타·세대 라벨 |
| Badge label | sans | 12px | 600 | 1 | 상태 배지 텍스트(한글, uppercase 금지) |
| SHA / code | mono | 13px | 500 | 1.4 | `a1b2c3d` 축약 SHA(7자) |

---

## 4. 레이아웃

### 섹션 구조 (위→아래)
1. **헤더 바** — 화면 타이틀 + 현재(최신 head) 세대 상태 배지 + "최신 head로 이동" 버튼.
2. **세대 타임라인(핵심)** — 세대(G0…Gn)를 시간순으로 잇는 spine. 각 노드 = 하나의 head 세대(상태 점 + 세대 라벨 `G2` + 축약 SHA + 상대 시각). 선택된 노드가 `active`, 최신 head가 `is-head`.
3. **세대 비교 영역** — 좌: 직전 세대 head 카드 / 우: 선택 세대 head 카드. 선택이 바뀌면 전환 이펙트 발생.
4. **상세 패널** — 선택 비교의 diff 요약(+/−), 미해결 스레드 수, 판정 근거 문구.

### spacing 스케일 (4px 기반)
`--rht-space-1:4px · -2:8px · -3:12px · -4:16px · -5:24px · -6:32px · -8:48px`
- 카드 내부 패딩: `--rht-space-5`(24px)
- 섹션 간 간격: `--rht-space-6`(32px), 큰 블록 사이 `--rht-space-8`(48px)
- 컨테이너 최대 폭: `1120px`, 좌우 gutter `--rht-space-5`
- radius: 카드 `--rht-radius:12px`, 배지 `999px`(pill), 버튼/노드 `8px`
- 그림자: 카드 `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)`

### 타임라인 시각 문법
- **spine 라인**: 노드들을 잇는 2px 라인(`--rht-border`). 데스크톱은 수평, 모바일은 수직.
- **세대 진행 표시**: 노드 간 연결선 중 "새 세대/검토 필요"로 전환된 구간은 해당 상태 강조색으로 채워 **어디서 세대가 바뀌었는지** 한눈에 보이게 한다(`.rht-timeline__seg--changed`).
- **세대 라벨**: 각 노드 상단에 `G0…Gn` 뱃지(mono, 흐린 텍스트). 최신 head 노드는 "현재 head" 캡션.

### breakpoint 별 동작
| breakpoint | 폭 | 타임라인 | 비교 카드 | 헤더 |
|------------|-----|----------|-----------|------|
| desktop | `≥1024px` | 가로 spine(수평), 노드 균등 배치 | 좌/우 2열 grid | 타이틀·배지·버튼 한 줄 |
| tablet | `640–1023px` | 가로 spine + 가로 스크롤 허용 | 2열 유지, gap 축소 | 한 줄 유지 |
| mobile | `<640px` | 세로 spine(수직), 노드 좌측 정렬 | 1열 stack(이전→선택) | 타이틀 줄바꿈, 배지 다음 줄 |

---

## 5. 컴포넌트 명세

### 5.1 `StatusBadge` (상태 배지)
- **props**: `state: 'same' | 'new' | 'review'`, `size?: 'sm' | 'md'`
- **표현**: pill. `아이콘 + 라벨`(same=`✓` 동일 세대 / new=`↑` 새 세대 / review=`⚠` 검토 필요). 색은 상태 토큰.
- **스타일**: `background: var(--rht-{state}-bg)`, `color: var(--rht-{state}-fg)`, `border:1px solid`(상태 강조색 25% alpha).
- **인터랙션**: 비대화형(정보 표시). `role="status"`.

### 5.2 `GenerationNode` (세대 타임라인 노드) — 핵심 컴포넌트
- **props**: `gen: number`(세대 인덱스 G0…), `sha: string(full)`, `shortSha: string(7)`, `timestamp: ISO`, `state`, `active: boolean`, `isHead: boolean`
- **표현**: 세대 라벨(`G2`) + 상태 점(dot) + 축약 SHA(mono) + 상대 시각 caption. `isHead`면 SHA 굵게 + "현재 head" 캡션, `active`면 primary 링.
- **상태**: `default` / `hover`(배경 `--rht-surface-muted`) / `active`(primary 링) / `focus`(`--rht-focus-ring` 2px, offset 2px).
- **인터랙션**: 클릭/Enter/Space → 해당 세대를 "선택"으로 지정 → 비교 영역 갱신 + 전환 이펙트. 좌우(←/→, 세로 레이아웃 ↑/↓) 화살표로 세대 이동(roving tabindex). `Home`/`End`로 최초/최신 세대 점프(권장).
- **DOM**: `<button>`(키보드 조작 필수), `aria-current="true"`(active), `aria-label`에 full SHA + 세대 + 상태 문구.

### 5.3 `TimelineSegment` (세대 연결 구간)
- **props**: `fromGen`, `toGen`, `changed: boolean`, `changeState: 'new' | 'review'`
- **표현**: 두 노드 사이 라인. `changed`면 `changeState` 강조색으로 채움 → head 전환 지점 강조.
- **비대화형**: `aria-hidden="true"`(장식). 전환 정보는 노드 `aria-label`과 상세 패널이 텍스트로 전달.

### 5.4 `ComparisonCard` (세대 비교 카드)
- **props**: `role: 'prev' | 'curr'`, `gen`, `shortSha`, `timestamp`, `author?`, `filesChanged?: number`, `state`(curr 카드에만 상태 하이라이트)
- **표현**: 카드 헤더(role 라벨 "직전 세대 head"/"선택 세대 head" + 세대 라벨 + 축약 SHA) + 메타(작성자·시각·변경 파일수) + 하단 상태 스트립.
- **상태 하이라이트**: `curr` 카드 좌측 4px 컬러 바 = 상태 강조색. `prev` 카드는 neutral.
- **인터랙션**: hover 시 elevation 상승. 클릭/Enter → 상세 패널 확장(`aria-expanded` 토글).

### 5.5 `DiffDetailPanel` (상세 패널)
- **props**: `open: boolean`, `state`, `summary: { additions, deletions, unresolvedThreads }`, `reason: string`
- **표현**: 판정 근거 문구(§1 상태 문구 재사용) + 통계 칩(+additions / −deletions / 미해결 N) + 상태별 안내.
- **상태**: `collapsed`(높이 0, `aria-hidden`) / `expanded`(auto height).
- **인터랙션**: Esc로 닫고 포커스를 트리거 카드로 복귀. 열릴 때 첫 포커스 가능한 요소로 focus 이동.

### 5.6 전환 이펙트 (`HeadTransition`)
세대 선택이 바뀔 때 비교 영역에 적용:
- **fade + slide-up**: 선택 세대 head 카드 `opacity 0→1`, `translateY(8px→0)`, `duration 220ms`, `ease: cubic-bezier(.2,.8,.2,1)`.
- **상태 컬러 바 전환**: 좌측 4px 바 `background` `160ms` 전환.
- **타임라인 active 링 이동**: `120ms`.
- **세그먼트 채움**: 전환 지점 세그먼트가 강조색으로 `160ms` 채워짐(선택 세대까지).
- **`prefers-reduced-motion: reduce`** 시 모든 transition/animation 제거(즉시 전환) — **필수**.

---

## 6. dev 구현 가이드 (dev-1 용)

> 관측 규약 vanilla-static 기준 SPA 로컬 `:root` CSS 변수. `design-tokens.json`이 존재하면 동일 의미 토큰으로 매핑하되, 운영자 승인 없이 그 파일을 수정하지 않는다.

### 6.1 CSS 변수 (권장 이름 — mockup과 1:1 일치)
- 팔레트: §2 표의 `--rht-*` 토큰을 그대로 `:root`에 선언.
- 타이포/스페이싱: §3, §4의 `--rht-font-*`, `--rht-space-*`, `--rht-radius` 사용.

### 6.2 권장 클래스/컴포넌트 매핑
| 컴포넌트 | 권장 class (BEM 유사) | DOM 힌트 |
|----------|----------------------|----------|
| StatusBadge | `.rht-badge` `.rht-badge--{state}` | `<span role="status">` |
| GenerationNode | `.rht-timeline__node` `.is-active` `.is-head` `[data-state]` | `<button>` |
| TimelineSegment | `.rht-timeline__seg` `.rht-timeline__seg--changed` `[data-change]` | `<span aria-hidden>` |
| ComparisonCard | `.rht-compare-card` `.rht-compare-card--{prev\|curr}` | `<article>` + 헤더 `<h3>` |
| DiffDetailPanel | `.rht-detail` `.is-open` | `<section aria-hidden>` |
| Timeline 컨테이너 | `.rht-timeline` `[role="group"]` | roving tabindex 관리 |

### 6.3 상태 판정 로직 배치
- 판정 함수는 UI가 아니라 데이터 계층에 두고, UI는 `state` 값만 받아 렌더(§1 판정 규칙 표 참조).
- SHA는 항상 7자 축약 표시하되 `title`/`aria-label`에 full SHA 노출.
- 세대 목록·SHA·타임스탬프는 로컬 고정 데이터(외부 API 금지). 상대 시각은 기준 시각과의 차로 결정론적으로 계산.

### 6.4 키보드 조작 가이드 (AC 필수)
| 키 | 동작 |
|----|------|
| `Tab` / `Shift+Tab` | 헤더 → 타임라인(컨테이너 1 tab-stop) → 비교 카드 → 상세 순환(논리적 DOM 순서) |
| `←` `→` (desktop) / `↑` `↓` (mobile) | 타임라인 세대 노드 간 이동 (roving tabindex) |
| `Home` / `End` | 최초(G0) / 최신 head 세대로 점프 |
| `Enter` / `Space` | 포커스된 노드/카드 활성화(세대 선택 또는 상세 열기) |
| `Esc` | 열린 상세 패널 닫고 포커스를 트리거 카드로 복귀 |
- **포커스 링**: 모든 대화형 요소 `:focus-visible` 시 `--rht-focus-ring` 2px + offset 2px. `outline:none` 단독 사용 금지.
- **roving tabindex**: 타임라인은 컨테이너 내 활성 노드 1개만 `tabindex=0`, 나머지 `-1`. 화살표로 이동 시 tabindex·focus 갱신.

### 6.5 반응형 구현
- mobile-first: 기본 세로 spine·1열 비교. `@media (min-width:1024px)`에서 수평 spine·2열 비교로 승격.
- `@media (max-width:639px)`에서 타임라인 `flex-direction:column`, 노드 좌측 정렬, 세그먼트 라인 수직.
- 컨테이너 `max-width:1120px; margin:0 auto`.

### 6.6 접근성
- 상태는 색+아이콘+텍스트 3중 표기. 배지 `role="status"`.
- 세대 선택이 바뀌면 `aria-live="polite"` 영역으로 "G2 새 head로 전환됨 — 새 세대 시작" 형태의 상태 문구를 안내.
- 타임라인 컨테이너 `role="group"` + `aria-label="세대 타임라인"`, 각 노드 `aria-current`로 선택 상태 노출.
- `prefers-reduced-motion` 존중(§5.6).

---

## 7. mockup 참조
- 파일: `docs/design/mockups/review-head-timeline-BF-1178.html`
- 단일 self-contained HTML(외부 의존성 0건). 다세대(G0→G3) head 전환 타임라인을 핵심으로, 상태 3종(동일/새/검토 필요) 배지·세대 노드·전환 세그먼트·비교 카드·상세 패널·전환 이펙트를 동시에 시각화. 데스크톱/모바일 프레임과 hover/focus 상태 예시 포함.

---

## AC 매핑 표

| # | Acceptance Criterion | 충족 명세 항목 | mockup 반영 |
|---|----------------------|----------------|-------------|
| AC-1 | 디자인 명세 작성 시 `docs/design/review-head-timeline-BF-1178.md`에 타임라인/상태배지/비교카드/전환이펙트 명세와 AC 매핑 표 포함 | §4 타임라인 시각 문법, §5.1~5.6, 본 매핑 표 | 파일 생성됨 |
| AC-1a | 타임라인 명세 | §4 섹션2·타임라인 시각 문법, §5.2 GenerationNode, §5.3 TimelineSegment | 다세대 spine + 세그먼트 강조 |
| AC-1b | 상태 배지 명세 | §2 상태 토큰, §5.1 StatusBadge | 3종 배지 표시 |
| AC-1c | 비교 카드 명세 | §5.4 ComparisonCard, §5.5 DiffDetailPanel | 이전/선택 세대 2열 카드 + 상세 |
| AC-1d | 전환 이펙트 명세 | §5.6 HeadTransition | fade+slide, 세그먼트 채움, 링 이동 |
| AC-2 | 기존 demo 시각 언어로, 공용 스타일 변경 없이 신규 페이지 mockup만으로 일관성 확인 | §2/§3/§4 자매 토큰 계승(prefix `--rht-*` 격리), §스택 정정 | 신규 HTML 1파일, `:root` 로컬 토큰 |
| AC-3 | 반응형/키보드 요구 — 데스크톱/모바일 레이아웃 + 키보드 조작·상태 문구 명시 | §4 breakpoint 표, §6.4 키보드 표, §6.5 반응형, §1 상태 문구, §6.6 aria-live | 데스크톱·모바일 프레임 + 포커스 링 예시 |

---

## Self-critique

1. **AC 매핑**: AC-1(타임라인/배지/비교카드/전환이펙트 + 매핑 표), AC-2(공용 스타일 무변경·신규 mockup 일관성), AC-3(반응형+키보드+상태 문구) 모두 명세 항목과 1:1 매핑 완료. ✅
2. **dev 구현 가이드**: §6에 CSS 변수명(`--rht-*`), 권장 class 매핑 표, 키보드 조작 표(Home/End 포함), roving tabindex, 반응형 media query 기준, aria-live 상태 문구를 단계별로 명시. dev가 추가 추론 없이 착수 가능. ✅
3. **기존 요소 보존**: 신규 route(`/demo/review-head-timeline`) 화면으로 기존 demo 페이지·공용 스타일 수정 없음. 토큰은 SPA 로컬 `:root` `--rht-*` prefix로 격리해 타 demo(자매 `--rgi-*` 포함)와 충돌 없음. ✅
4. **컴포넌트 매핑**: StatusBadge/GenerationNode/TimelineSegment/ComparisonCard/DiffDetailPanel + HeadTransition 각각 props·상태·인터랙션·권장 class 정의. mockup 요소와 명칭 일치. ✅
5. **모호함 flag**:
   - ⚠️ **JIRA 키 오프셋**: dispatch key=BF-1179이나 AC 지정 파일명=BF-1178. 자매 작업 동일 −1 오프셋 선례에 근거해 AC 지정 키(BF-1178)를 authority로 채택, markdown·mockup 파일명 일치. reviewer/운영자 확인 요망.
   - ⚠️ **스택 불일치**: 관측 규약(vanilla-static)을 authority로 채택. dev는 `design-tokens.json` 존재 여부 확인 후 매핑 결정(운영자 승인 없이 토큰 파일 수정 금지).
   - ⚠️ **entry-path ownership**: `demo/review-head-timeline/index.html`이 designer owned_paths 밖 → dev-1이 경로 ownership 교정·확인 후 구현.
   - ⚠️ **세대 개수/데이터 소스**: mockup은 G0~G3 4세대 placeholder를 씀. 실제 세대 개수·SHA·타임스탬프는 데이터 계층 정책에 위임하며, 본 명세는 시각 문법과 상태 판정 결과만 규정.
   - ⚠️ **"검토 필요" 세부 트리거**(미해결 스레드 vs 충돌 vs stale) 우선순위는 데이터 계층에 위임.
