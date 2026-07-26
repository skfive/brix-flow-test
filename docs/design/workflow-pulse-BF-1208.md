# 워크플로 펄스 디자인 명세 (BF-1208)

- 대상 모듈: `workflow-pulse` — brix-Flow 작업 파이프라인(요청→기획→구현→리뷰→테스트→완료) 시각화 데모 보드
- 기술 스택: **vanilla-static** (저장소 관측 규약 기준 — 외부 CDN·신규 패키지 0건, system font, CSS 변수 자체 정의)
  - 참고: 요청 설명에는 `bf:tech-stack:typescript-monorepo` 마커가 있으나 저장소 관측 규약(`base_sha aa50a1e`)은 `vanilla-static`이며 **불일치**한다. 본 시안은 **화면(UI) 표현**만 정의하며, 실제 파일 위치/모듈 시스템은 BF-1209(developer)가 저장소 규약(vanilla-static/npm/esm, serve root `.`)에 맞춰 결정한다. 따라서 본 문서는 `design-tokens.json`을 수정하지 않고 토큰을 mockup `:root`에서 직접 정의한다.
- 기획 근거: `docs/planning/workflow-pulse-BF-1207.md`
- 형제 Task: BF-1207(planner), BF-1209(developer, 구현), BF-1211(tester, 검증)
- mockup 참조: `docs/design/mockups/workflow-pulse-BF-1208.html`
- 본 문서는 **디자인 명세만** 다룬다. 실제 앱 코드는 BF-1209(developer)가 구현한다. 상태 코드·전이 규칙은 기획 §2를 재해석 없이 그대로 시각화한다.

---

## 1. 시안 개요

### 1.1 변경 범위

`workflow-pulse` 데모 보드 1개 화면의 시안을 정의한다. 기획 §2 상태 전이 모델(6단계)과 §5 시드 데이터(8개 항목)를 시각화하며, 상태 전이를 **색상 + 아이콘 + 텍스트 라벨 + 연결선** 네 가지 채널로 표현한다.

| 영역 | 역할 | 기획 근거 |
|---|---|---|
| 헤더 | 페이지명("워크플로 펄스") + 인메모리 고지 배너 | 기획 §3, §4 |
| 파이프라인 레일 | 6단계 상태를 좌→우로 잇는 연결선 + 단계 아이콘/라벨/카운트("펄스") | 기획 §2.2, §3 시나리오1 |
| 상태 컬럼(칸반) | 각 상태별 항목 카드 목록 + 상단 카운트 배지 | 기획 §3 시나리오1, §5 |
| 항목 카드 | title/assignee/상태 배지 + 상태별 액션 버튼 | 기획 §5, §6.1 |
| 반려 분기 표시 | `in_review → in_development` 되돌림 경로 시각화 | 기획 §2.2, §3 시나리오3 |
| 완료 터미널 표시 | `done` 카드의 "완료" 배지(액션 버튼 없음) | 기획 §3 시나리오4, §6.1 |

### 1.2 사용자 경험 목표

- **파이프라인을 한눈에**: 상단 파이프라인 레일이 6단계를 좌→우 연결선으로 이어, 항목이 어느 단계에 몰려 있는지("펄스" 카운트)를 스크롤 없이 인지한다.
- **색에만 의존하지 않는 상태 구분**: 각 상태는 색상만이 아니라 **아이콘 + 한글 텍스트 라벨**을 항상 병기한다(색각 이상·흑백 출력에서도 구분 가능, §9 접근성).
- **진행 신호는 절제된 펄스로**: "진행 중"(활성) 단계의 카운트 배지에만 은은한 pulse 애니메이션을 주어 살아있는 파이프라인 느낌을 전달하되, 과하지 않게 한다. `prefers-reduced-motion` 사용자에게는 애니메이션 대신 **정적 링 + "진행 중" 텍스트**로 동일 정보를 전달한다(기획 무관, 접근성 요구).
- **전이는 명확한 액션으로**: 카드마다 §6.1 버튼 라벨을 그대로 노출하고, `in_review`의 승인/반려는 시각적으로 구분(primary vs. danger-outline)한다.
- **의존성 0**: `file://`로 직접 열어도 외부 호출 없이 렌더링(vanilla-static).
- **초기화 전제 고지**: "새로고침하면 초기 시드로 복귀합니다"를 상단 배너로 상시 노출(기획 §4).

---

## 2. 컬러 팔레트

기존 brix-flow-test 공용 중립 토큰 계열(형제 데모 `review-evidence-heatmap`, `feedback-pulse`와 동일 계열)을 기반으로 하고, 6개 상태에 대응하는 **상태 semantic 토큰**을 추가 정의한다. 토큰은 mockup `:root`에서 `--wp-` 접두사로 직접 정의하며 별도 `design-tokens.json`은 수정하지 않는다(§0 스택 불일치 처리).

### 2.1 기본(중립) 팔레트

| 역할 | 토큰 변수 | HEX | 용도 |
|---|---|---|---|
| primary | `--wp-primary` | `#2563EB` | 주요 액션 버튼("다음 단계로") |
| primary hover | `--wp-primary-hover` | `#1D4ED8` | 주요 버튼 hover |
| background | `--wp-bg` | `#F7F8FA` | 페이지 배경 |
| surface | `--wp-surface` | `#FFFFFF` | 카드·컬럼·배너 표면 |
| surface muted | `--wp-surface-muted` | `#F1F5F9` | 컬럼 헤더·트랙 배경 |
| border | `--wp-border` | `#E2E5EA` | 구분선·카드 테두리·연결선 |
| text | `--wp-text` | `#1F2430` | 본문 텍스트 (대비 12:1+) |
| text muted | `--wp-text-muted` | `#5B6472` | 보조 텍스트·assignee (대비 약 6.1:1, AA 충족) |
| danger | `--wp-danger` | `#B91C1C` | "반려" 버튼 테두리/텍스트 |
| danger soft | `--wp-danger-soft` | `#FEE2E2` | "반려" hover 배경 |

### 2.2 상태(state) semantic 토큰

각 상태는 `-fg`(강조/아이콘/테두리)와 `-bg`(배지·카드 좌측 accent 배경) 쌍으로 정의한다. `-bg` 위 `-fg` 텍스트 대비는 모두 WCAG AA(4.5:1) 이상.

| 상태 코드 | 한글 라벨 | 아이콘 | `-fg` 토큰 | HEX | `-bg` 토큰 | HEX |
|---|---|---|---|---|---|---|
| `requested` | 요청 | ⬚ (📥 inbox) | `--wp-st-requested-fg` | `#475569` | `--wp-st-requested-bg` | `#E2E8F0` |
| `planning` | 기획 | ✎ (📝 note) | `--wp-st-planning-fg` | `#6D28D9` | `--wp-st-planning-bg` | `#EDE9FE` |
| `in_development` | 구현 | ⌨ (</>) | `--wp-st-dev-fg` | `#1D4ED8` | `--wp-st-dev-bg` | `#DBEAFE` |
| `in_review` | 리뷰 | ⌕ (🔍 search) | `--wp-st-review-fg` | `#B45309` | `--wp-st-review-bg` | `#FEF3C7` |
| `testing` | 테스트 | ✔ (🧪 flask) | `--wp-st-testing-fg` | `#0F766E` | `--wp-st-testing-bg` | `#CCFBF1` |
| `done` | 완료 | ● (✅ check) | `--wp-st-done-fg` | `#166534` | `--wp-st-done-bg` | `#DCFCE7` |

> 색상 순서(slate→violet→blue→amber→teal→green)는 파이프라인 진행에 따라 "접수(중립)→작업(한색)→검증(난색 경고)→완료(녹색)"의 자연스러운 의미 흐름을 준다. 색상은 **보조 채널**이며 아이콘·텍스트가 1차 식별 채널이다.

### 2.3 "진행 중"(활성) 정의

- **활성(진행 중) 상태**: `planning`, `in_development`, `in_review`, `testing` — 해당 컬럼에 항목이 1개 이상 있으면 카운트 배지에 pulse를 적용한다.
- **비활성**: `requested`(대기 큐 성격), `done`(터미널) — pulse 없음. `done`은 항상 정적 완료 표현.
- pulse는 **카운트 배지 1곳**에만 적용해 시각 소음을 최소화한다(카드 전체를 깜빡이지 않음).

---

## 3. 타이포그래피

vanilla-static 규약에 따라 웹폰트 없이 system font stack을 사용한다.

| 역할 | font-family | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| page title (h1) | system-ui sans | 24px | 700 | 1.25 | "워크플로 펄스" |
| section/컬럼 헤더 | system-ui sans | 14px | 700 | 1.3 | 상태 라벨 |
| card title | system-ui sans | 14px | 600 | 1.4 | 항목 title |
| body / assignee | system-ui sans | 13px | 400 | 1.5 | 담당자·본문 |
| badge / caption | system-ui sans | 12px | 600 | 1.4 | 카운트·상태 배지 |
| button | system-ui sans | 13px | 600 | 1 | 액션 버튼 |

- sans stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (토큰 `--wp-font-sans`).
- 숫자 카운트는 `font-variant-numeric: tabular-nums`로 정렬 안정화.

---

## 4. 레이아웃

### 4.1 전체 구조 (세로 흐름)

```
[헤더: 제목 + 인메모리 고지 배너]
[파이프라인 레일: ⬚요청 —— ✎기획 —— ⌨구현 —— ⌕리뷰 —— ✔테스트 —— ●완료]
                                     └────── 반려(REJECT) 되돌림 곡선 ──────┘
[6-컬럼 칸반 보드: 각 컬럼 = 헤더(아이콘+라벨+카운트배지) + 카드 목록]
```

- 최대 폭 `--wp-maxw: 1240px`, 중앙 정렬, 좌우 패딩 24px.
- 파이프라인 레일과 칸반 보드의 컬럼은 **동일한 6분할 그리드**를 공유해 세로로 정렬된다(레일의 단계와 아래 컬럼이 1:1 시각 대응).

### 4.2 spacing 스케일

토큰: `--wp-space-1:4px / -2:8px / -3:12px / -4:16px / -5:24px / -6:32px`. radius `--wp-radius:12px`(카드), 배지 `999px`(pill).

### 4.3 breakpoint 별 동작

| breakpoint | 파이프라인 레일 | 칸반 보드 | 연결선 |
|---|---|---|---|
| **desktop ≥ 960px** | 6단계 가로 1행, 단계 사이 가로 연결선 | 6컬럼 가로 grid (`repeat(6, 1fr)`) | 레일: 가로 실선. 반려: 리뷰→구현 위로 곡선 back-arrow |
| **tablet 640–959px** | 6단계 가로 스크롤(가로 유지) 또는 3+3 wrap | 3컬럼 grid 2행 wrap | 가로 연결선 유지 |
| **mobile < 640px** | 6단계 **세로 1열**, 단계 사이 세로 연결선(↓) | 6개 컬럼 세로 스택(1열) | 세로 연결선(↓). 반려는 "⤴ 리뷰에서 반려 시 구현으로" 텍스트 캡션으로 대체 |

- 데스크톱 연결선은 컬럼 헤더 아이콘 중심을 잇는 `position:absolute` 실선(`--wp-border`), 진행 방향으로 옅은 화살촉(▸).
- 모바일에서는 가로 연결선을 세로(↓)로 회전, 반려 곡선은 공간 제약상 텍스트 힌트로 degrade(정보 손실 없음).

---

## 5. 컴포넌트 명세

### 5.1 파이프라인 레일 스텝 `PipelineStep`

파이프라인 상단 레일의 단계 1개.

| props | 타입 | 설명 |
|---|---|---|
| `state` | WorkflowState | 6개 상태 코드 중 하나 |
| `label` | string | 한글 라벨(요청/기획/…) |
| `icon` | string | 상태 아이콘(§2.2) |
| `count` | number | 해당 상태 항목 수(펄스 카운트) |
| `active` | boolean | §2.3 활성 여부(true면 카운트 배지 pulse) |

- 상태: 기본 / hover(툴팁으로 상태 설명) / active(pulse). `done`은 `active=false` 고정.
- 인터랙션: 정적 데모에서는 클릭 없음(레일은 요약 표시 전용). 카드 액션이 카운트를 바꾸면 레일 카운트도 동기 갱신(구현은 developer 소관).

### 5.2 상태 컬럼 `StateColumn`

| props | 타입 | 설명 |
|---|---|---|
| `state` | WorkflowState | 컬럼 상태 |
| `label` | string | 컬럼 헤더 라벨 |
| `items` | WorkflowItem[] | 이 상태의 항목 배열 |
| `active` | boolean | 카운트 배지 pulse 여부(§2.3) |

- 헤더: 좌측 아이콘+라벨, 우측 카운트 배지(활성이면 pulse). 헤더 배경 `--wp-surface-muted`, 좌측 상태색 4px accent 바.
- 빈 컬럼: "항목 없음" placeholder(점선 박스). (기획 §5는 최초 6상태 모두 ≥1개 보장이나 조작 후 0이 될 수 있음 → 빈 상태 필요.)

### 5.3 항목 카드 `WorkflowCard`

| props | 타입 | 설명 |
|---|---|---|
| `id` | string | `wf-1`…`wf-8` |
| `title` | string | 항목 제목(기획 §5 텍스트 그대로) |
| `assignee` | string | 담당자 |
| `state` | WorkflowState | 현재 상태(좌측 accent 색 결정) |

- 구조: 좌측 상태색 4px accent 바 + 상태 배지(아이콘+라벨) + title + `👤 assignee` + 액션 버튼 영역.
- **액션 버튼(기획 §6.1 그대로)**:

  | 상태 | 버튼 | 스타일 |
  |---|---|---|
  | `requested` | "기획 시작" | primary |
  | `planning` | "구현 시작" | primary |
  | `in_development` | "리뷰 요청" | primary |
  | `in_review` | "승인(다음 단계로)" + "반려" | primary + danger-outline |
  | `testing` | "테스트 완료" | primary |
  | `done` | (버튼 없음) "✓ 완료" 배지 | done-badge |

- 상태: 기본 / hover(그림자 상승 `--wp-shadow-lg`) / 버튼 hover(색 진하게) / 버튼 focus-visible(2px focus ring).
- 인터랙션: 버튼 클릭 → 카드가 다음 상태 컬럼으로 이동(구현 시 developer). 시안에서는 정적 배치로 각 상태 예시를 보여준다.

### 5.4 상태 배지 `StateBadge`

- pill 형태: `[아이콘] 라벨`. 배경 `--wp-st-*-bg`, 텍스트 `--wp-st-*-fg`. 색 + 아이콘 + 텍스트 3중 채널(§9).

### 5.5 인메모리 고지 배너 `MemoryNotice`

- 상단 폭 전체 배너: "ℹ 이 보드는 인메모리 데모입니다. 새로고침하면 초기 시드 상태로 복귀합니다." 중립 정보 톤(`--wp-surface-muted` 배경, `--wp-text-muted` 텍스트).

---

## 6. dev 구현 가이드 (BF-1209 참조)

> 실제 파일 위치/라우트/모듈 시스템은 기획 §8·§8.1 + 저장소 관측 규약(vanilla-static, serve root `.`, 라우트 `/demo/workflow-pulse`)을 따른다. 아래는 **시각 표현** 가이드다.

1. **토큰 정의**: mockup `:root`의 `--wp-*` 변수를 그대로 CSS 최상단에 복사한다(색상 하드코딩 금지, 항상 변수 참조).
2. **레이아웃 그리드**: 파이프라인 레일과 칸반 보드에 동일한 `display:grid; grid-template-columns:repeat(6,1fr); gap:var(--wp-space-4)`를 사용해 세로 정렬을 맞춘다. `@media (max-width:639px)`에서 `grid-template-columns:1fr`로 세로 스택.
3. **상태→토큰 매핑**: 상태 코드로 클래스를 생성한다 — `.wp-col--requested`, `.wp-col--planning`, `.wp-col--in_development`, `.wp-col--in_review`, `.wp-col--testing`, `.wp-col--done`. 각 클래스가 `--wp-accent` 로컬 변수에 해당 상태색을 대입하고, accent 바·배지가 이를 참조하도록 한다.
4. **아이콘**: 외부 아이콘 라이브러리 금지. 유니코드 글리프(§2.2 아이콘 열) 또는 인라인 SVG로 처리. 아이콘은 항상 텍스트 라벨과 함께(`aria-hidden="true"` 아이콘 + 텍스트).
5. **카운트 배지 클래스**: `.wp-count`. 활성 컬럼은 `.wp-count--active`를 추가해 pulse 적용.
6. **pulse 애니메이션**: 아래 §7 정확한 keyframe/미디어쿼리를 그대로 사용한다.
7. **버튼**: `.wp-btn`(primary), `.wp-btn--reject`(danger-outline). 상태별 노출은 기획 §6.1 표를 그대로 따른다(`done`은 버튼 미렌더 + `.wp-done-badge`).
8. **접근성**: 상태 배지에 `aria-label` 로 상태 한글명 제공, 카운트 pulse는 순수 장식이므로 `aria-hidden` 불필요하되 스크린리더에는 숫자만 읽히게. focus-visible ring 필수.
9. **인메모리 고지 배너**를 보드 상단에 상시 렌더.

### 6.1 권장 클래스/변수명 요약

```
:root { --wp-primary, --wp-bg, --wp-surface, --wp-surface-muted, --wp-border,
        --wp-text, --wp-text-muted, --wp-danger, --wp-danger-soft,
        --wp-st-requested-fg/-bg, --wp-st-planning-fg/-bg, --wp-st-dev-fg/-bg,
        --wp-st-review-fg/-bg, --wp-st-testing-fg/-bg, --wp-st-done-fg/-bg,
        --wp-space-1..6, --wp-radius, --wp-shadow, --wp-shadow-lg, --wp-font-sans }

.wp-rail / .wp-step / .wp-step__icon / .wp-step__count
.wp-board / .wp-col / .wp-col--<state> / .wp-col__head / .wp-count / .wp-count--active
.wp-card / .wp-card__accent / .wp-badge / .wp-card__title / .wp-card__assignee
.wp-btn / .wp-btn--reject / .wp-done-badge / .wp-notice / .wp-empty
```

---

## 7. pulse 애니메이션 + prefers-reduced-motion (정확 명세)

진행 중 카운트 배지의 pulse는 **아래 CSS를 그대로** 사용한다(과한 움직임 금지 — opacity/box-shadow만 완만하게).

```css
/* 활성 카운트 배지: 은은한 링 확산 (2s, 무한, ease-out) */
@keyframes wp-pulse {
  0%   { box-shadow: 0 0 0 0 var(--wp-accent-ring, rgba(37,99,235,.45)); }
  70%  { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
  100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
}
.wp-count--active {
  animation: wp-pulse 2s ease-out infinite;
}

/* 접근성: 모션 최소화 사용자 → 애니메이션 제거, 정적 링 + "진행 중" 텍스트로 대체 */
@media (prefers-reduced-motion: reduce) {
  .wp-count--active {
    animation: none;
    box-shadow: 0 0 0 2px var(--wp-accent-ring, rgba(37,99,235,.45)); /* 정적 링 유지 */
  }
  .wp-count--active::after {
    content: "진행 중";
    /* 시각적으로 배지 옆 작은 캡션, 또는 .visually-hidden 로 SR 전달 */
  }
}
```

- 각 활성 컬럼은 로컬 `--wp-accent-ring`을 상태색 45% alpha로 대입한다(예: 구현=blue, 리뷰=amber…).
- 모션 감소 시: **정보 손실 없음** — pulse가 전하던 "이 단계 진행 중" 신호를 정적 링 + 텍스트로 동등 전달(AC2).
- 카드 이동 전이(선택적): `transition: transform .2s, box-shadow .2s`. reduced-motion에서는 `transition:none`.

---

## 8. mockup 참조

- 파일: `docs/design/mockups/workflow-pulse-BF-1208.html`
- 단일 self-contained HTML(외부 의존성 0). 포함 시연:
  1. 헤더 + 인메모리 고지 배너
  2. 6단계 파이프라인 레일 + 가로 연결선 + 반려 되돌림 곡선
  3. 6-컬럼 칸반 보드(§5 시드 8개 항목 배치) + 상태별 액션 버튼
  4. 활성 컬럼 카운트 배지 pulse (기본) — 실제 애니메이션 동작
  5. **reduced-motion 시연 패널**: `prefers-reduced-motion` 시 나타나는 정적 링 + "진행 중" 대체 표현을 나란히 예시(시스템 설정과 무관하게 시각 비교 가능하도록 별도 섹션에 강제 렌더)
  6. hover/focus 상태 예시
  7. 반응형: 브라우저 폭을 줄이면 세로 스택으로 전환(모바일 레이아웃)

---

## 9. 접근성

- **색 + 아이콘 + 텍스트 3중 채널**: 모든 상태를 색상만으로 구분하지 않고 아이콘·한글 라벨 병기(색각 이상/흑백 대응).
- **대비**: 상태 `-fg`/`-bg` 쌍 및 본문/배경 대비 모두 WCAG AA(4.5:1) 이상. muted 텍스트 `#5B6472`(약 6.1:1).
- **모션**: `prefers-reduced-motion: reduce`에서 pulse 제거 + 정적 링/텍스트 대체(§7). 카드 전이 transition도 비활성.
- **키보드**: 모든 액션 버튼 focus-visible 2px ring, tab 순서 = 카드 시각 순서.
- **스크린리더**: 상태 배지 `aria-label`(한글 상태명), 카운트는 숫자로 읽힘, 장식 아이콘은 `aria-hidden`.

---

## 10. AC 매핑 (검증 가능 항목)

| Acceptance Criteria | 매핑 근거 |
|---|---|
| Given 기획 명세, When 디자인 명세를 작성하면, Then 공용 디자인 토큰 재사용과 상태별 시각 표현(색/아이콘/텍스트/연결선)이 정의된다 | §2(공용 중립 토큰 재사용 + 6개 상태 semantic 토큰: 색), §2.2(상태별 **아이콘·텍스트 라벨**), §4.3·§5.1(파이프라인 **연결선** + 반려 곡선), §5(컴포넌트) |
| Given 접근성 요구, When mockup 을 만들면, Then pulse 효과와 prefers-reduced-motion 대체 동작이 시연된다 | §7(pulse keyframe + `prefers-reduced-motion` 정적 링/텍스트 대체 정확 명세), §8-4·§8-5(mockup에서 pulse 실동작 + reduced-motion 대체 표현 강제 시연), §9(모션 접근성) |
| Given 반응형 요구, When 명세를 완료하면, Then 데스크톱/모바일 레이아웃과 AC 매핑 표가 포함된다 | §4.3(desktop/tablet/mobile breakpoint별 레일·보드·연결선 동작), §8-7(mockup 반응형 세로 스택), 본 §10 표 자체 |

---

## 11. Self-critique

PR commit 직전 자기 점검 5개 항목:

1. **AC 매핑**: 3개 AC 모두 §10 표에서 명세 섹션과 1:1 매핑됨. 색/아이콘/텍스트/연결선(AC1), pulse+reduced-motion(AC2), 반응형+AC표(AC3) 각각 근거 섹션 존재. ✅
2. **dev 구현 가이드**: §6에 토큰 복사·그리드·상태→클래스 매핑·pulse CSS·버튼 노출 규칙까지 단계별 지침 + §6.1 클래스/변수명 요약 제공. ✅
3. **기존 요소 보존**: 신규 파일 2개(`docs/design/…md`, `docs/design/mockups/…html`)만 추가. 기존 데모/canary·`design-tokens.json` 미변경(스택 불일치로 토큰은 mockup `:root` 자체 정의). 기획 §8 보존 영역 준수. ✅
4. **컴포넌트 매핑**: 기획 §5 시드 8개 항목·§6.1 버튼 라벨·§2 상태 6단계를 §5 컴포넌트(PipelineStep/StateColumn/WorkflowCard/StateBadge)에 재해석 없이 매핑. 상태 코드·전이 규칙 임의 확장 없음. ✅
5. **모호함 flag**:
   - 스택 마커 불일치(`typescript-monorepo` 요청 vs `vanilla-static` 관측) → §0에서 관측 규약 우선 + `design-tokens.json` 미수정으로 명시. developer는 저장소 규약 기준으로 구현.
   - 아이콘은 유니코드 글리프로 명세(외부 아이콘 라이브러리 금지) — dev가 인라인 SVG로 교체해도 무방(§6-4). 픽셀 단위 일치 의무 없음(시안은 UX 의도 전달).
   - 반려 곡선의 모바일 degrade(텍스트 힌트)는 정보 손실 없이 의도적 — dev 재현 시 캡션으로 충분.
