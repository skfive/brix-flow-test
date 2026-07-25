# 리뷰 세대 전환 인스펙터 — 디자인 명세 (BF-1174)

> owned artifact key: `review-generation-inspector-BF-1173`
> route: `/demo/review-generation-inspector`
> primary-module: `review-generation-inspector`
> mockup 참조: `docs/design/mockups/review-generation-inspector/review-generation-inspector-BF-1173.html`

## ⚠️ 스택 규약 정정 (fail-honest)

- 요청 marker: `bf:tech-stack:typescript-monorepo` (shadcn/ui·design-tokens.json 준수 기대)
- **실제 저장소 관측 규약: `vanilla-static`** (base_sha `5082b94`, evidence `package.json@1e806db4d756`)
- 본 명세와 mockup은 **관측 규약(vanilla-static)** 을 authority로 따른다: 외부 의존성 0건, system font stack, CSS 변수 자체 정의.
- 아래 토큰은 `design-tokens.json` 이 존재할 경우 dev가 그 파일로 매핑하되, 현재 규약상으로는 SPA 로컬 `:root` CSS 변수로 정의한다.
- **route/entry-path 정정 요청**: 요청 route `/demo/review-generation-inspector` 의 예상 entry는 `demo/review-generation-inspector/index.html` 이나, 이는 designer owned_paths 밖이다. designer는 SPA 코드를 구현하지 않으므로 충돌은 없으며, dev-1 이 해당 경로 ownership을 확인한 뒤 구현한다.

---

## 1. 시안 개요

### 변경 범위
`/demo/review-generation-inspector` SPA 신규 화면. 이전 head SHA와 현재 head SHA를 비교해 리뷰 **세대(generation)** 상태를 판정하고, 그 결과를 **타임라인 · 상태 배지 · 비교 카드 · 전환 이펙트** 로 시각화한다.

### 사용자 경험 목표
- 사용자가 한눈에 "지금 보고 있는 리뷰가 최신 head 기준으로 유효한가"를 판단할 수 있게 한다.
- 세대 상태 3종(**동일 세대 · 새 세대 · 검토 필요**)을 색·아이콘·문구 3중 코드로 명확히 구분한다 (색맹 접근성 보장).
- SHA 변경 흐름을 타임라인으로 시간순 제시하고, 이전↔현재 비교 카드를 나란히 보여준다.
- 데스크톱/모바일 모두 조작 가능하며 키보드만으로 전체 흐름을 탐색할 수 있다.

### 세대 상태 판정 규칙 (state semantics)
| 상태 | 판정 조건 | 의미 |
|------|-----------|------|
| **동일 세대** (`same`) | `prevHeadSha === currHeadSha` | 리뷰 대상 콘텐츠가 이전과 동일 — 재검토 불필요 |
| **새 세대** (`new`) | `prevHeadSha !== currHeadSha` 이고 충돌/미해결 없음 | 새 head로 갱신됨 — 새 리뷰 세대 시작 |
| **검토 필요** (`review`) | SHA 변경 + 미해결 스레드/충돌/stale 존재 | 이전 리뷰 결과가 무효화될 수 있어 사람 확인 필요 |

---

## 2. 컬러 팔레트

### 기본(neutral) 토큰
| 역할 | 토큰명 | HEX |
|------|--------|-----|
| 배경 | `--rgi-bg` | `#F8FAFC` |
| 표면/카드 | `--rgi-surface` | `#FFFFFF` |
| 표면(강조) | `--rgi-surface-muted` | `#F1F5F9` |
| 경계선 | `--rgi-border` | `#E2E8F0` |
| 본문 텍스트 | `--rgi-text` | `#0F172A` |
| 보조 텍스트 | `--rgi-text-secondary` | `#475569` |
| 흐린 텍스트 | `--rgi-text-muted` | `#94A3B8` |

### 브랜드/액센트 토큰
| 역할 | 토큰명 | HEX |
|------|--------|-----|
| primary | `--rgi-primary` | `#4F46E5` |
| primary hover | `--rgi-primary-hover` | `#4338CA` |
| accent(포커스 링) | `--rgi-focus-ring` | `#6366F1` |

### 상태(semantic) 토큰 — 세대 상태 3종
| 상태 | 강조색 토큰 | 강조 HEX | 배경 토큰 | 배경 HEX | 텍스트 토큰 | 텍스트 HEX |
|------|-------------|----------|-----------|----------|-------------|------------|
| 동일 세대 | `--rgi-same` | `#16A34A` | `--rgi-same-bg` | `#DCFCE7` | `--rgi-same-fg` | `#166534` |
| 새 세대 | `--rgi-new` | `#2563EB` | `--rgi-new-bg` | `#DBEAFE` | `--rgi-new-fg` | `#1E40AF` |
| 검토 필요 | `--rgi-review` | `#D97706` | `--rgi-review-bg` | `#FEF3C7` | `--rgi-review-fg` | `#92400E` |

> 색 대비: 각 상태 `*-fg` on `*-bg` 조합은 WCAG AA(4.5:1) 이상. 색 외에 **아이콘 + 라벨 텍스트**를 항상 병기해 색맹 사용자도 구분 가능.

---

## 3. 타이포그래피

system font stack 사용 (외부 폰트 로드 없음):
```
--rgi-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--rgi-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
```

| 역할 | font-family | size | weight | line-height | 용도 |
|------|-------------|------|--------|-------------|------|
| Page title (h1) | sans | 24px / 1.5rem | 700 | 1.25 | 화면 제목 "리뷰 세대 인스펙터" |
| Section heading (h2) | sans | 18px | 600 | 1.33 | "타임라인", "비교" 등 |
| Card title (h3) | sans | 15px | 600 | 1.4 | 비교 카드 헤더 |
| Body | sans | 14px | 400 | 1.5 | 본문/설명 |
| Caption | sans | 12px | 500 | 1.4 | 타임스탬프·메타 |
| Badge label | sans | 12px | 600 | 1 | 상태 배지 텍스트 (uppercase 금지, 한글) |
| SHA / code | mono | 13px | 500 | 1.4 | `a1b2c3d` 축약 SHA (7자) |

---

## 4. 레이아웃

### 섹션 구조 (위→아래)
1. **헤더 바** — 화면 타이틀 + 현재 세대 상태 배지(요약) + 새로고침 버튼
2. **타임라인** — SHA 이벤트를 시간순으로. 각 노드 = 하나의 head SHA (동그란 상태 점 + 축약 SHA + 타임스탬프)
3. **비교 영역** — 좌: 이전 head 카드 / 우: 현재 head 카드 (세대 상태에 따라 하이라이트)
4. **상세 패널** — 선택된 비교의 diff 요약, 미해결 스레드 수, 판정 근거

### spacing 스케일 (4px 기반)
`--rgi-space-1:4px · -2:8px · -3:12px · -4:16px · -5:24px · -6:32px · -8:48px`
- 카드 내부 패딩: `--rgi-space-5` (24px)
- 섹션 간 간격: `--rgi-space-6` (32px)
- 컨테이너 최대 폭: `1120px`, 좌우 gutter `--rgi-space-5`

### breakpoint 별 동작
| breakpoint | 폭 | 타임라인 | 비교 카드 | 헤더 |
|------------|-----|----------|-----------|------|
| desktop | `≥1024px` | 가로 배치(수평 라인) | 좌/우 2열 grid | 타이틀·배지·버튼 한 줄 |
| tablet | `640–1023px` | 가로(가로 스크롤 허용) | 2열 유지, gap 축소 | 한 줄 유지 |
| mobile | `<640px` | 세로 배치(수직 라인) | 1열 stack (이전→현재) | 타이틀 줄바꿈, 배지 다음 줄 |

- radius: 카드 `--rgi-radius:12px`, 배지 `999px`(pill), 버튼 `8px`
- 그림자: 카드 `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)`

---

## 5. 컴포넌트 명세

### 5.1 `StatusBadge` (상태 배지)
- **props**: `state: 'same' | 'new' | 'review'`, `size?: 'sm' | 'md'`
- **표현**: pill 형태. `아이콘 + 라벨`. 색은 상태 토큰. 라벨: 동일 세대 / 새 세대 / 검토 필요
- **아이콘(정적 SVG/유니코드)**: same=`✓`, new=`↑`, review=`⚠`
- **상태(state)별 스타일**: `background: var(--rgi-{state}-bg)`, `color: var(--rgi-{state}-fg)`, `border: 1px solid` (상태 강조색 20% alpha)
- **인터랙션**: 비대화형(정보 표시). 단, 헤더 요약 배지는 클릭 시 해당 비교로 스크롤(선택).

### 5.2 `TimelineNode` (타임라인 노드)
- **props**: `sha: string(full)`, `shortSha: string(7)`, `timestamp: ISO`, `state`, `active: boolean`, `isHead: boolean`
- **표현**: 상태 점(dot) + 축약 SHA(mono) + relative time caption. `isHead`면 굵은 링, `active`면 primary 테두리.
- **상태**: `default` / `hover`(배경 `--rgi-surface-muted`) / `active`(primary 링) / `focus`(포커스 링)
- **인터랙션**: 클릭/Enter → 해당 노드를 "현재"로 선택, 비교 영역 갱신 + 전환 이펙트 트리거. 좌우(←/→, 세로 레이아웃 ↑/↓) 화살표로 노드 이동.

### 5.3 `ComparisonCard` (비교 카드)
- **props**: `role: 'prev' | 'curr'`, `shortSha`, `timestamp`, `author?`, `filesChanged?: number`, `state`(curr 카드에만 상태 하이라이트 적용)
- **표현**: 카드 헤더(role 라벨 "이전 head"/"현재 head" + 축약 SHA) + 메타(작성자·시각·변경 파일수) + 하단 상태 스트립.
- **상태 하이라이트**: `curr` 카드 좌측 4px 컬러 바 = 상태 강조색. `prev` 카드는 neutral.
- **인터랙션**: hover 시 elevation 상승, 클릭/Enter → 상세 패널 확장. `aria-expanded` 토글.

### 5.4 `DiffDetailPanel` (상세 패널)
- **props**: `open: boolean`, `state`, `summary: { additions, deletions, unresolvedThreads }`, `reason: string`
- **표현**: 판정 근거 문구 + 통계 칩(+additions / −deletions / 미해결 N) + 상태별 안내 메시지
- **상태**: `collapsed`(높이 0, `aria-hidden`) / `expanded`(auto height)
- **인터랙션**: Esc로 닫기. 열릴 때 첫 포커스 가능한 요소로 focus 이동.

### 5.5 전환 이펙트 (`GenerationTransition`)
- 세대 선택이 바뀔 때 비교 영역에 적용:
  - **fade + slide-up**: 현재 head 카드가 `opacity 0→1`, `translateY(8px→0)`, `duration 220ms`, `ease: cubic-bezier(.2,.8,.2,1)`
  - 상태 색이 바뀌면 좌측 컬러 바가 `background` `160ms` 전환
  - 타임라인 active 링은 `120ms` 이동
- **`prefers-reduced-motion: reduce`** 시 모든 transition/animation 제거(즉시 전환) — 필수.

---

## 6. dev 구현 가이드 (dev-1 용)

> 관측 규약이 vanilla-static이므로, 아래는 SPA 로컬 `:root` CSS 변수 기준. `design-tokens.json` 이 이미 존재하면 동일 의미 토큰으로 매핑.

### 6.1 CSS 변수 (권장 이름 — mockup과 1:1 일치)
- 팔레트: §2 표의 `--rgi-*` 토큰 그대로 `:root`에 선언.
- 타이포/스페이싱: §3, §4의 `--rgi-font-*`, `--rgi-space-*`, `--rgi-radius` 사용.

### 6.2 권장 클래스/컴포넌트 매핑
| 컴포넌트 | 권장 class (BEM 유사) | DOM 힌트 |
|----------|----------------------|----------|
| StatusBadge | `.rgi-badge` `.rgi-badge--{state}` | `<span role="status">` |
| TimelineNode | `.rgi-timeline__node` `.is-active` | `<button>` (키보드 조작 위해 button) |
| ComparisonCard | `.rgi-compare-card` `.rgi-compare-card--{prev|curr}` | `<article>` + 헤더 `<h3>` |
| DiffDetailPanel | `.rgi-detail` `.is-open` | `<section aria-hidden>` |

### 6.3 상태 판정 로직 배치
- 판정 함수는 UI가 아니라 데이터 계층에 두고, UI는 `state` 값만 받아 렌더(§1 판정 규칙 표 참조).
- SHA는 항상 7자 축약 표시하되 `title`/`aria-label`에 full SHA 노출.

### 6.4 키보드 조작 가이드 (AC 필수)
| 키 | 동작 |
|----|------|
| `Tab` / `Shift+Tab` | 헤더 → 타임라인 → 비교 카드 → 상세 순환 (논리적 DOM 순서) |
| `←` `→` (desktop) / `↑` `↓` (mobile) | 타임라인 노드 간 이동 (roving tabindex) |
| `Enter` / `Space` | 포커스된 노드/카드 활성화 |
| `Esc` | 열린 상세 패널 닫고 포커스를 트리거 카드로 복귀 |
- **포커스 링**: 모든 대화형 요소 `:focus-visible` 시 `--rgi-focus-ring` 2px + offset 2px. 절대 `outline:none` 단독 사용 금지.
- **roving tabindex**: 타임라인은 컨테이너 1개만 tab-stop, 내부 이동은 화살표.

### 6.5 반응형 구현
- `@media (min-width:1024px)` 데스크톱 2열·수평 타임라인 / 기본은 mobile-first 세로.
- 컨테이너 `max-width:1120px; margin:0 auto`.

### 6.6 접근성
- 상태는 색+아이콘+텍스트 3중 표기. 배지 `role="status"`, 상태 변경 시 `aria-live="polite"` 영역으로 안내.
- `prefers-reduced-motion` 존중.

---

## 7. mockup 참조
- 파일: `docs/design/mockups/review-generation-inspector/review-generation-inspector-BF-1173.html`
- 단일 self-contained HTML(외부 의존성 0건). 3종 상태(동일/새/검토 필요)를 배지·타임라인·비교 카드로 동시에 시각화하고, 데스크톱/모바일 레이아웃 및 hover/focus 상태를 포함한다.

---

## AC 매핑 표

| # | Acceptance Criterion | 충족 명세 항목 | mockup 반영 |
|---|----------------------|----------------|-------------|
| AC-1 | 명세 markdown + mockup HTML 이 docs/design 에 생성, 각 AC(렌더/상태 판정/디자인 일관성)가 명세 항목과 매핑 | 본 문서 전체 + §7 + 본 매핑 표 | 파일 생성됨 |
| AC-1a | 렌더 | §4 레이아웃, §5 컴포넌트 명세 | 헤더/타임라인/비교/상세 전 영역 렌더 |
| AC-1b | 상태 판정 | §1 판정 규칙 표, §6.3 로직 배치 | 3종 상태 카드 각각 판정 근거 표시 |
| AC-1c | 디자인 일관성 | §2 토큰, §3 타이포, §4 spacing (`--rgi-*`) | `:root` 토큰으로 통일 |
| AC-2 | 세대 상태 3종이 배지/타임라인/비교 카드로 시각 구분 | §2 상태 토큰, §5.1/5.2/5.3 | 동일/새/검토 필요 3섹션 병렬 표시 |
| AC-3 | 데스크톱/모바일 레이아웃 + 포커스 이동 규칙 명세 포함 | §4 breakpoint 표, §6.4 키보드, §6.5 반응형 | 데스크톱·모바일 프레임 + 포커스 링 예시 |

---

## Self-critique

1. **AC 매핑**: 위 AC 매핑 표에서 AC-1(렌더/판정/일관성)·AC-2(상태 3종 시각 구분)·AC-3(반응형+키보드) 모두 명세 항목과 1:1 매핑 완료. ✅
2. **dev 구현 가이드**: §6에 CSS 변수명(`--rgi-*`), 권장 class 매핑 표, 키보드 조작 표, 반응형 media query 기준, 접근성 요구를 단계별로 명시. dev가 추가 추론 없이 착수 가능. ✅
3. **기존 요소 보존**: 신규 route(`/demo/review-generation-inspector`) 화면으로 기존 demo 페이지 수정 없음. 토큰은 SPA 로컬 `:root`로 격리해 타 demo 스타일에 영향 없음. ✅
4. **컴포넌트 매핑**: StatusBadge/TimelineNode/ComparisonCard/DiffDetailPanel + GenerationTransition 각각 props·상태·인터랙션·권장 class 정의. mockup 요소와 명칭 일치. ✅
5. **모호함 flag**:
   - ⚠️ **스택 불일치**: 요청 marker(typescript-monorepo)와 실제 규약(vanilla-static) 상이 → 관측 규약을 authority로 채택, §스택 정정에 명시. dev는 `design-tokens.json` 존재 여부 확인 후 매핑 결정.
   - ⚠️ **entry-path ownership**: `demo/review-generation-inspector/index.html` 이 designer owned_paths 밖 → dev-1 이 경로 ownership 확인 후 구현.
   - ⚠️ **"검토 필요" 세부 트리거**(미해결 스레드 vs 충돌 vs stale)의 정확한 우선순위는 데이터 계층 정책에 위임 — 본 명세는 시각 판정 결과만 규정.
