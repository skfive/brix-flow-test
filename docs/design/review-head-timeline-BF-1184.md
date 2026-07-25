# 리뷰 head 전환 타임라인 — 디자인 명세 (BF-1184)

> owned artifact key: `review-head-timeline-BF-1184`
> route: `/demo/review-head-timeline`
> primary-module: `review-head-timeline`
> mockup 참조: `docs/design/mockups/review-head-timeline-BF-1184.html`
> 시각 언어 계승: `review-head-timeline-BF-1178`(동일 module 선행 명세) · `review-generation-inspector-BF-1173`(자매 화면)

## ⚠️ 스택·경로 정정 (fail-honest)

- **스택 규약 정정**: 요청 marker는 미제공이나, **실제 저장소 관측 규약은 `vanilla-static`**(base_sha `0203080f`, evidence `package.json@1e806db4d756`, `stack_mismatch:false`)입니다. 본 명세·mockup은 관측 규약을 authority로 따릅니다: **외부 의존성 0건, system font stack, CSS 변수 자체 정의**.
- **route/entry-path ownership 정정**: 요청 route `/demo/review-head-timeline`의 예상 entry는 `demo/review-head-timeline/index.html`이나, 이는 designer owned_paths(`docs/design/**`) 밖이며 `repo convention capsule`이 "expected_entry_path가 현재 owned_paths에 포함되지 않음 — ownership 교정 필요"를 명시했습니다. designer는 SPA 코드를 구현하지 않으므로 산출물 충돌은 없으며, **dev-1이 해당 route/entry-path의 ownership을 교정·확인한 뒤 구현**합니다. (self-critique §5 flag 참조)
- **선행 명세와의 관계**: 동일 module의 선행 명세 `BF-1178`이 이미 다세대(G0→G3) 타임라인의 기본 시각 문법을 확립했습니다. 본 BF-1184는 그 시각 시스템(`--rht-*` 토큰·타이포·간격)을 **그대로 계승**하되, 본 task가 명시한 **"이전 head → 새 head 전환을 *단계별로* 보여주는"** 요구에 초점을 맞춰 **전환 단계 트랙(Transition Track)** 과 **단계별 전환 이펙트**를 추가로 규정합니다. 파일은 지침에 따라 BF-1184 신규 파일로 생성합니다(선행 파일 재사용 금지).
- **결정론(determinism)**: 외부 API 호출 없이 로컬 고정 상태(세대 목록·SHA·타임스탬프·전환 단계 목록)만으로 렌더합니다. 상대 시각은 기준 시각과의 차로 결정론적 계산하되 mockup에서는 고정 placeholder를 씁니다.

---

## 1. 시안 개요

### 변경 범위
`/demo/review-head-timeline` SPA 신규 화면. 리뷰 대상 커밋이 **이전 head → 새 head**로 전환되는 과정을 두 축으로 시각화한다.

1. **세대 타임라인(Generation Timeline)** — 세대(G0…Gn)를 시간순으로 잇는 spine. 각 노드 = 하나의 head 세대.
2. **전환 단계 트랙(Transition Track)** — 선택된 세대 전환 하나(예: G2 → G3)가 **어떤 단계를 거쳐 완료되었는지**를 감지 → diff 계산 → 세대 판정 → 반영의 순서로 **단계별**로 펼쳐 보인다. (본 task의 "단계별로 보여주는" 요구 대응)

두 축은 **상태 배지 · 비교 카드 · 전환 이펙트**로 보강되며, 선행/자매 화면과 동일한 상태 토큰·타이포·간격을 공유해 하나의 시각 시스템으로 읽힌다.

### 사용자 경험 목표
- 사용자가 **세대 변화가 한눈에 보이는 타임라인**으로 head가 어떻게 이어져 왔는지 시간순으로 파악한다.
- 세대를 선택하면 그 세대 전환이 **어떤 단계를 밟아 이뤄졌는지**를 전환 단계 트랙으로 순서대로 확인한다("단계별").
- 선택 세대와 직전 세대를 **비교 카드**로 나란히 보고, **전환 이펙트**로 "무엇이 바뀌었나"를 즉시 감지한다.
- 세대 상태 3종(**동일 세대 · 새 세대 · 검토 필요**)을 색·아이콘·문구 3중 코드로 구분(색맹 접근성 보장).
- 데스크톱/모바일 모두 조작 가능하며 **키보드만으로** 세대 이동·선택·상세 열람·닫기가 가능하다.

### 세대 상태 판정 규칙 (state semantics)
| 상태 | 판정 조건 | 의미 | 상태 문구(고정) |
|------|-----------|------|-----------------|
| **동일 세대** (`same`) | `prevHeadSha === currHeadSha` | 리뷰 대상 콘텐츠가 직전 세대와 동일 — 재검토 불필요 | "직전 세대와 동일 — 재검토 불필요" |
| **새 세대** (`new`) | `prevHeadSha !== currHeadSha` 이고 미해결/충돌 없음 | 새 head로 갱신 — 새 리뷰 세대 시작 | "새 head로 전환됨 — 새 세대 시작" |
| **검토 필요** (`review`) | SHA 변경 + 미해결 스레드/충돌/stale 존재 | 이전 리뷰 결과가 무효화될 수 있어 사람 확인 필요 | "head 전환 + 미해결 존재 — 사람 확인 필요" |

> 상태 문구는 배지·비교 카드·상세 패널·`aria-live` 안내에서 동일 문안을 재사용해 일관성을 확보한다.

### 전환 단계 정의 (transition steps — "단계별"의 정의)
하나의 head 전환은 다음 4단계를 순서대로 거친다. 각 단계는 트랙에서 순번·라벨·완료 상태로 표기한다.

| # | 단계 키 | 라벨 | 의미 | 완료 상태 표기 |
|---|---------|------|------|----------------|
| 1 | `detected` | head 감지 | 새 head SHA가 감지됨(`prevHeadSha` → `currHeadSha`) | `done` |
| 2 | `diffed` | 변경 계산 | 두 head 간 diff(+/−·파일수) 계산 완료 | `done` |
| 3 | `judged` | 세대 판정 | §1 규칙으로 상태 3종 판정 | `done` |
| 4 | `applied` | 세대 반영 | 새 세대로 타임라인·비교에 반영(검토 필요 시 `blocked`) | `done` \| `blocked` |

> `blocked`은 "검토 필요" 상태에서 4단계가 사람 확인 대기로 멈춘 경우를 뜻한다. 단계 표기는 색+아이콘+문구 3중 코드를 따른다(done=`✓`, current=`●`, blocked=`⚠`, pending=`○`).

---

## 2. 컬러 팔레트

선행/자매 화면과 **동일 값**을 사용하되 prefix만 `--rht-*`로 격리(타 demo 스타일 비침입).

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

### 전환 단계 트랙 색 매핑 (재사용 토큰 — 신규 색 없음)
| 단계 완료 상태 | 점/링 색 | 라벨 색 | 비고 |
|----------------|----------|---------|------|
| `done` | `--rht-same` | `--rht-text` | 완료된 단계 |
| `current` | `--rht-primary` | `--rht-text` | 진행 중(선택 세대의 마지막 완료 단계 다음) |
| `blocked` | `--rht-review` | `--rht-review-fg` | 검토 필요로 멈춤 |
| `pending` | `--rht-text-muted` | `--rht-text-muted` | 아직 도달 전 |

> 트랙은 신규 색을 도입하지 않고 §2의 기존 토큰만 재사용한다(팔레트 확장 없음 — Simplicity First).

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
| Section heading (h2) | sans | 18px | 600 | 1.33 | "세대 타임라인", "전환 단계", "세대 비교" |
| Card title (h3) | sans | 15px | 600 | 1.4 | 비교 카드 헤더 |
| Body | sans | 14px | 400 | 1.5 | 본문/설명 |
| Caption | sans | 12px | 500 | 1.4 | 타임스탬프·메타·세대 라벨·단계 라벨 |
| Badge label | sans | 12px | 600 | 1 | 상태 배지 텍스트(한글, uppercase 금지) |
| Step label | sans | 12px | 600 | 1.3 | 전환 단계 라벨 |
| SHA / code | mono | 13px | 500 | 1.4 | `a1b2c3d` 축약 SHA(7자) |

---

## 4. 레이아웃

### 섹션 구조 (위→아래)
1. **헤더 바** — 화면 타이틀 + 현재(최신 head) 세대 상태 배지 + "최신 head로 이동" 버튼.
2. **세대 타임라인(핵심 1)** — 세대(G0…Gn)를 시간순으로 잇는 spine. 각 노드 = 하나의 head 세대(상태 점 + 세대 라벨 `G2` + 축약 SHA + 상대 시각). 선택 노드 `active`, 최신 head `is-head`.
3. **전환 단계 트랙(핵심 2 · "단계별")** — 선택된 세대 전환(예: G2 → G3)의 4단계(감지 → 계산 → 판정 → 반영)를 순서대로 표기. 각 단계는 순번 · 라벨 · 완료 상태 점.
4. **세대 비교 영역** — 좌: 직전 세대 head 카드 / 우: 선택 세대 head 카드. 선택이 바뀌면 전환 이펙트 발생.
5. **상세 패널** — 선택 비교의 diff 요약(+/−), 미해결 스레드 수, 판정 근거 문구.

### spacing 스케일 (4px 기반)
`--rht-space-1:4px · -2:8px · -3:12px · -4:16px · -5:24px · -6:32px · -8:48px`
- 카드 내부 패딩: `--rht-space-5`(24px)
- 섹션 간 간격: `--rht-space-6`(32px), 큰 블록 사이 `--rht-space-8`(48px)
- 컨테이너 최대 폭: `1120px`, 좌우 gutter `--rht-space-5`
- radius: 카드 `--rht-radius:12px`, 배지 `999px`(pill), 버튼/노드/단계 `8px`
- 그림자: 카드 `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.10)`

### 타임라인 시각 문법
- **spine 라인**: 노드들을 잇는 2px 라인(`--rht-border`). 데스크톱은 수평, 모바일은 수직.
- **세대 진행 표시**: 노드 간 연결선 중 "새 세대/검토 필요"로 전환된 구간은 해당 상태 강조색으로 채워 **어디서 세대가 바뀌었는지** 한눈에 보이게 한다(`.rht-timeline__seg--changed`).
- **세대 라벨**: 각 노드 상단에 `G0…Gn` 뱃지(mono, 흐린 텍스트). 최신 head 노드는 "현재 head" 캡션.

### 전환 단계 트랙 시각 문법 ("단계별")
- 선택된 전환 1건의 4단계를 **가로 순서 트랙**(데스크톱)/**세로 순서 트랙**(모바일)으로 배치.
- 각 단계: `순번 원(①②③④) + 라벨 + 완료 상태 점/아이콘`. 단계 사이 연결선은 완료 구간까지 `--rht-same`(done)로 채우고, 이후는 `--rht-border`.
- `blocked` 단계는 `--rht-review` 강조 + `⚠` 아이콘 + "사람 확인 대기" 캡션.
- 트랙 상단에 "G2 → G3 전환 단계" 캡션으로 어떤 전환을 펼치는지 명시.

### breakpoint 별 동작
| breakpoint | 폭 | 타임라인 | 전환 단계 트랙 | 비교 카드 | 헤더 |
|------------|-----|----------|----------------|-----------|------|
| desktop | `≥1024px` | 가로 spine(수평), 노드 균등 배치 | 가로 4단계 순서 | 좌/우 2열 grid | 타이틀·배지·버튼 한 줄 |
| tablet | `640–1023px` | 가로 spine + 가로 스크롤 허용 | 가로 유지, gap 축소 | 2열 유지, gap 축소 | 한 줄 유지 |
| mobile | `<640px` | 세로 spine(수직), 노드 좌측 정렬 | 세로 4단계 순서 | 1열 stack(이전→선택) | 타이틀 줄바꿈, 배지 다음 줄 |

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
- **인터랙션**: 클릭/Enter/Space → 해당 세대를 "선택"으로 지정 → 전환 단계 트랙 + 비교 영역 갱신 + 전환 이펙트. 좌우(←/→, 세로 레이아웃 ↑/↓) 화살표로 세대 이동(roving tabindex). `Home`/`End`로 최초/최신 세대 점프.
- **DOM**: `<button>`(키보드 조작 필수), `aria-current="true"`(active), `aria-label`에 full SHA + 세대 + 상태 문구.

### 5.3 `TimelineSegment` (세대 연결 구간)
- **props**: `fromGen`, `toGen`, `changed: boolean`, `changeState: 'new' | 'review'`
- **표현**: 두 노드 사이 라인. `changed`면 `changeState` 강조색으로 채움 → head 전환 지점 강조.
- **비대화형**: `aria-hidden="true"`(장식). 전환 정보는 노드 `aria-label`과 상세 패널이 텍스트로 전달.

### 5.4 `TransitionStep` (전환 단계 항목) — 본 task 신규 컴포넌트
- **props**: `index: 1|2|3|4`, `stepKey: 'detected'|'diffed'|'judged'|'applied'`, `label: string`, `status: 'done'|'current'|'blocked'|'pending'`, `detail?: string`
- **표현**: 순번 원(`①…④` 또는 숫자) + 라벨 + 완료 상태 점/아이콘(done=`✓`, current=`●`, blocked=`⚠`, pending=`○`) + 선택적 detail caption(예: "+312 / −201", "미해결 4").
- **상태**: `done`(--rht-same) / `current`(--rht-primary) / `blocked`(--rht-review) / `pending`(--rht-text-muted). 색 + 아이콘 + 라벨 3중 코드.
- **인터랙션**: 기본 비대화형 정보(`role="listitem"`). 단계 목록 컨테이너는 `<ol role="list">`로 순서 의미를 시맨틱하게 노출. (선택적으로 단계 클릭 시 해당 단계 detail을 상세 패널로 안내 가능 — dev 재량, AC 필수 아님)
- **접근성**: 각 단계 `aria-label`에 "1단계 head 감지, 완료" 형태로 순번 + 라벨 + 상태를 텍스트로 노출. `blocked` 단계는 "사람 확인 대기"를 문구로 병기.

### 5.5 `TransitionTrack` (전환 단계 트랙) — 본 task 신규 컴포넌트
- **props**: `fromGen`, `toGen`, `steps: TransitionStep[]`, `state`(전환 결과 상태 3종)
- **표현**: 상단 캡션("G2 → G3 전환 단계") + 4개 `TransitionStep`을 순서대로 배치 + 단계 사이 연결선(done 구간 `--rht-same`, 이후 `--rht-border`).
- **레이아웃**: 데스크톱 가로 순서, 모바일 세로 순서(§4 breakpoint 표).
- **DOM**: `<ol class="rht-steps" role="list" aria-label="G2에서 G3로의 전환 단계">`.
- **인터랙션**: 세대 선택이 바뀌면 트랙 전체가 새 전환으로 교체 + 단계 연결선 채움 이펙트(§5.7).

### 5.6 `ComparisonCard` (세대 비교 카드)
- **props**: `role: 'prev' | 'curr'`, `gen`, `shortSha`, `timestamp`, `author?`, `filesChanged?: number`, `state`(curr 카드에만 상태 하이라이트)
- **표현**: 카드 헤더(role 라벨 "직전 세대 head"/"선택 세대 head" + 세대 라벨 + 축약 SHA) + 메타(작성자·시각·변경 파일수) + 하단 상태 스트립.
- **상태 하이라이트**: `curr` 카드 좌측 4px 컬러 바 = 상태 강조색. `prev` 카드는 neutral.
- **인터랙션**: hover 시 elevation 상승. 클릭/Enter → 상세 패널 확장(`aria-expanded` 토글).

### 5.7 `DiffDetailPanel` (상세 패널)
- **props**: `open: boolean`, `state`, `summary: { additions, deletions, unresolvedThreads }`, `reason: string`
- **표현**: 판정 근거 문구(§1 상태 문구 재사용) + 통계 칩(+additions / −deletions / 미해결 N) + 상태별 안내.
- **상태**: `collapsed`(높이 0, `aria-hidden`) / `expanded`(auto height).
- **인터랙션**: Esc로 닫고 포커스를 트리거 카드로 복귀. 열릴 때 첫 포커스 가능한 요소로 focus 이동.

### 5.8 전환 이펙트 (`HeadTransition`)
세대 선택이 바뀔 때 적용:
- **fade + slide-up**: 선택 세대 head 카드 `opacity 0→1`, `translateY(8px→0)`, `duration 220ms`, `ease: cubic-bezier(.2,.8,.2,1)`.
- **상태 컬러 바 전환**: 좌측 4px 바 `background` `160ms` 전환.
- **타임라인 active 링 이동**: `120ms`.
- **세그먼트 채움**: 전환 지점 세그먼트가 강조색으로 `160ms` 채워짐(선택 세대까지).
- **전환 단계 트랙 채움(신규)**: 단계 연결선이 done 구간까지 `left→right`(모바일 `top→bottom`)로 `staggered` 채워짐(각 단계 `80ms` 간격, 총 `≤320ms`). 각 단계 점은 `scale(.8→1)` `120ms`.
- **`prefers-reduced-motion: reduce`** 시 모든 transition/animation 제거(즉시 전환) — **필수**.

---

## 6. dev 구현 가이드 (dev-1 용)

> 관측 규약 vanilla-static 기준 SPA 로컬 `:root` CSS 변수. `design-tokens.json`이 존재하면 동일 의미 토큰으로 매핑하되, 운영자 승인 없이 그 파일을 수정하지 않는다.

### 6.1 CSS 변수 (권장 이름 — mockup과 1:1 일치)
- 팔레트: §2 표의 `--rht-*` 토큰을 그대로 `:root`에 선언. 전환 단계 트랙은 신규 색 없이 §2 토큰 재사용.
- 타이포/스페이싱: §3, §4의 `--rht-font-*`, `--rht-space-*`, `--rht-radius` 사용.

### 6.2 권장 클래스/컴포넌트 매핑
| 컴포넌트 | 권장 class (BEM 유사) | DOM 힌트 |
|----------|----------------------|----------|
| StatusBadge | `.rht-badge` `.rht-badge--{state}` | `<span role="status">` |
| GenerationNode | `.rht-timeline__node` `.is-active` `.is-head` `[data-state]` | `<button>` |
| TimelineSegment | `.rht-timeline__seg` `.rht-timeline__seg--changed` `[data-change]` | `<span aria-hidden>` |
| TransitionStep | `.rht-step` `[data-status]` | `<li role="listitem">` |
| TransitionTrack | `.rht-steps` | `<ol role="list">` |
| ComparisonCard | `.rht-compare-card` `.rht-compare-card--{prev\|curr}` | `<article>` + 헤더 `<h3>` |
| DiffDetailPanel | `.rht-detail` `.is-open` | `<section aria-hidden>` |
| Timeline 컨테이너 | `.rht-timeline` `[role="group"]` | roving tabindex 관리 |

### 6.3 상태·단계 판정 로직 배치
- 판정 함수는 UI가 아니라 데이터 계층에 두고, UI는 `state`·`steps` 값만 받아 렌더(§1 판정 규칙·전환 단계 정의 참조).
- 전환 단계는 `[{stepKey, status}]` 배열로 데이터 계층이 제공. "검토 필요" 판정 시 마지막 `applied` 단계를 `blocked`으로 설정.
- SHA는 항상 7자 축약 표시하되 `title`/`aria-label`에 full SHA 노출.
- 세대 목록·SHA·타임스탬프·전환 단계는 로컬 고정 데이터(외부 API 금지). 상대 시각은 기준 시각과의 차로 결정론적으로 계산.

### 6.4 키보드 조작 가이드 (AC 필수)
| 키 | 동작 |
|----|------|
| `Tab` / `Shift+Tab` | 헤더 → 타임라인(컨테이너 1 tab-stop) → 비교 카드 → 상세 순환(논리적 DOM 순서). 전환 단계 트랙은 비대화형이므로 tab-stop 아님(스크린리더는 `<ol>` 순서로 읽음) |
| `←` `→` (desktop) / `↑` `↓` (mobile) | 타임라인 세대 노드 간 이동 (roving tabindex) |
| `Home` / `End` | 최초(G0) / 최신 head 세대로 점프 |
| `Enter` / `Space` | 포커스된 노드/카드 활성화(세대 선택 또는 상세 열기) |
| `Esc` | 열린 상세 패널 닫고 포커스를 트리거 카드로 복귀 |
- **포커스 링**: 모든 대화형 요소 `:focus-visible` 시 `--rht-focus-ring` 2px + offset 2px. `outline:none` 단독 사용 금지.
- **roving tabindex**: 타임라인은 컨테이너 내 활성 노드 1개만 `tabindex=0`, 나머지 `-1`. 화살표로 이동 시 tabindex·focus 갱신.

### 6.5 반응형 구현
- mobile-first: 기본 세로 spine·세로 단계 트랙·1열 비교. `@media (min-width:1024px)`에서 수평 spine·가로 단계 트랙·2열 비교로 승격.
- `@media (max-width:639px)`에서 타임라인·단계 트랙 `flex-direction:column`, 노드 좌측 정렬.
- 컨테이너 `max-width:1120px; margin:0 auto`.

### 6.6 접근성
- 상태·단계는 색+아이콘+텍스트 3중 표기. 배지 `role="status"`, 단계 목록 `<ol role="list">`.
- 세대 선택이 바뀌면 `aria-live="polite"` 영역으로 "G3 · head 전환 + 미해결 존재 — 사람 확인 필요" 형태의 상태 문구를 안내.
- 타임라인 컨테이너 `role="group"` + `aria-label="세대 타임라인"`, 각 노드 `aria-current`로 선택 상태 노출.
- 전환 단계 트랙에 `aria-label="G2에서 G3로의 전환 단계"`, `blocked` 단계는 "사람 확인 대기" 문구 병기.
- `prefers-reduced-motion` 존중(§5.8).

---

## 7. mockup 참조
- 파일: `docs/design/mockups/review-head-timeline-BF-1184.html`
- 단일 self-contained HTML(외부 의존성 0건, 로컬 상태만으로 렌더). 다세대(G0→G3) head 전환 타임라인 + **전환 단계 트랙(감지→계산→판정→반영)** 을 핵심으로, 상태 3종(동일/새/검토 필요) 배지·세대 노드·전환 세그먼트·비교 카드·상세 패널·단계별 전환 이펙트를 동시에 시각화. 데스크톱/모바일 프레임과 hover/focus 상태 예시 포함.

---

## AC 매핑 표

| # | Acceptance Criterion | 충족 명세 항목 | mockup 반영 |
|---|----------------------|----------------|-------------|
| AC-1 | 운영자가 명세 파일을 열었을 때, 타임라인/상태배지/비교카드/전환이펙트 컴포넌트 스펙과 AC 매핑 표가 있으면 명세 완결 | §4 타임라인·단계 트랙 시각 문법, §5.1~5.8, 본 매핑 표 | 파일 생성됨 |
| AC-1a | 타임라인 스펙 | §4 섹션2·타임라인 시각 문법, §5.2 GenerationNode, §5.3 TimelineSegment | 다세대 spine + 세그먼트 강조 |
| AC-1b | 상태 배지 스펙 | §2 상태 토큰, §5.1 StatusBadge | 3종 배지 표시 |
| AC-1c | 비교 카드 스펙 | §5.6 ComparisonCard, §5.7 DiffDetailPanel | 이전/선택 세대 2열 카드 + 상세 |
| AC-1d | 전환 이펙트 스펙 | §5.8 HeadTransition (단계 트랙 채움 포함) | fade+slide, 세그먼트·단계 채움, 링 이동 |
| AC-1e | ("단계별") 전환 단계 스펙 | §1 전환 단계 정의, §5.4 TransitionStep, §5.5 TransitionTrack | 감지→계산→판정→반영 4단계 트랙 |
| AC-2 | mockup HTML을 브라우저로 열면 외부 의존성 없이 로컬 상태만으로 렌더 → 시각 시안 검증 가능 | §스택 정정, §1 결정론, §7 | 신규 HTML 1파일, `:root` 로컬 토큰, JS 없이 정적 렌더 |
| AC-3 | 기존 demo 라우트/공용 스타일을 mockup이 변경하지 않으면 보존 영역 지켜짐 | §2/§3/§4 토큰 prefix `--rht-*` 격리, §스택/경로 정정 | 신규 파일만 추가, 공용 CSS·기존 route 무변경 |

---

## Self-critique

1. **AC 매핑**: AC-1(타임라인/배지/비교카드/전환이펙트 스펙 + 매핑 표), AC-2(외부 의존성 없이 로컬 상태 렌더), AC-3(기존 라우트·공용 스타일 무변경) 모두 명세 항목과 1:1 매핑 완료. 본 task가 강조한 "단계별"을 AC-1e로 명시 분해. ✅
2. **dev 구현 가이드**: §6에 CSS 변수명(`--rht-*`), 권장 class 매핑 표(TransitionStep/Track 포함), 키보드 조작 표(Home/End·roving tabindex), 반응형 media query 기준, aria-live·단계 트랙 접근성을 단계별로 명시. dev가 추가 추론 없이 착수 가능. ✅
3. **기존 요소 보존**: 신규 route(`/demo/review-head-timeline`) 화면으로 기존 demo 페이지·공용 스타일 수정 없음. 토큰은 SPA 로컬 `:root` `--rht-*` prefix로 격리(자매 `--rgi-*`, 선행 BF-1178 동일 prefix와도 값 일치). 전환 단계 트랙은 신규 색 없이 기존 토큰만 재사용. ✅
4. **컴포넌트 매핑**: StatusBadge/GenerationNode/TimelineSegment/TransitionStep/TransitionTrack/ComparisonCard/DiffDetailPanel + HeadTransition 각각 props·상태·인터랙션·권장 class 정의. mockup 요소와 명칭 일치. ✅
5. **모호함 flag**:
   - ⚠️ **선행 BF-1178과 중복 범위**: 동일 module에 선행 명세가 존재. 본 BF-1184는 지침(신규 JIRA-KEY 새 파일 필수)에 따라 신규 파일로 생성하며, 시각 시스템은 계승하되 본 task 문구의 "단계별" 요구를 **전환 단계 트랙**으로 구체화해 차별점을 부여. reviewer는 두 명세가 상충하지 않고 계승 관계임을 확인 요망.
   - ⚠️ **스택 규약**: 관측 규약(vanilla-static)을 authority로 채택. dev는 `design-tokens.json` 존재 여부 확인 후 매핑 결정(운영자 승인 없이 토큰 파일 수정 금지).
   - ⚠️ **entry-path ownership**: `demo/review-head-timeline/index.html`이 designer owned_paths 밖 + capsule이 ownership 교정 필요 명시 → dev-1이 경로 ownership 교정·확인 후 구현.
   - ⚠️ **전환 단계 데이터 소스**: mockup은 4단계 고정 placeholder를 씀. 실제 단계 목록·완료 상태는 데이터 계층 정책에 위임하며, 본 명세는 시각 문법과 단계 정의(4단계)만 규정.
   - ⚠️ **"검토 필요" 세부 트리거**(미해결 스레드 vs 충돌 vs stale) 우선순위는 데이터 계층에 위임.
