# 납품 추적 상태 보드 시각 명세 (BF-1241)

> designer(이디자인) 산출물. planner의 frozen 실행 계약
> (`docs/plans/delivery-trace-canary-BF-1240.md`, `planning-contract@v1`, `ui-contract@v1`)를
> **재정의 없이 그대로** 시안으로 표현한다. selector·상태 텍스트·token·접근성·반응형 계약은
> frozen blueprint가 유일한 권위이며, 본 명세는 이를 렌더링할 뿐 새로 추가·재정의하지 않는다.
>
> - 대상 route: `/demo/delivery-trace-canary` (root-relative static)
> - primary_repo: backend / stack: vanilla-static (외부 의존성 0건, CSS 변수 자체 정의)
> - mockup 참조: `docs/design/delivery-trace-canary-mockup.html`
> - 권위 검증 명령: `node --test demo/delivery-trace-canary/tests/*.test.js`

## 1. 시안 개요

### 변경 범위
납품 추적 상태 보드는 **읽기 전용** 화면으로, 요구사항(Requirement)이 Design → Implementation
→ Review → Test 5단계를 거쳐 어떻게 추적·연결되는지 한눈에 보여준다. 각 요구사항 행마다
5단계 상태(완료/진행 중/누락)를 카드로 표시하고, 상태 필터로 특정 상태 단계만 강조하며,
단계를 선택하면 상세 evidence를 패널로 보여준다. evidence가 누락된 단계는 경고로 노출한다.

### 사용자 경험 목표
- **추적 가시성**: 요구사항 → 5단계 연결을 색·텍스트로 즉시 파악 (색상만 의존 금지)
- **누락 조기 발견**: 비어 있는 evidence 단계를 경고 텍스트 + 보완 대상 목록으로 알림
- **선택적 심층 탐색**: 필터로 상태 범위를 좁히고, 단계 선택으로 상세 evidence 확인
- **접근성 우선**: 키보드 탐색·aria 이름·스크린리더 알림을 화면 텍스트와 동등하게 제공
- **모든 상태 안내**: 로딩·오류도 화면 텍스트로 명확히 안내

## 2. 컬러 팔레트

frozen design token(§2.3, exact 값 — 변경 금지)을 그대로 사용한다.

| 역할 | CSS 변수 | HEX | 용도 |
| --- | --- | --- | --- |
| 단계 완료 | `--color-stage-complete` | `#16a34a` | 완료(Complete) 단계 카드 강조 (녹색) |
| 단계 진행/대기 | `--color-stage-pending` | `#9ca3af` | 진행 중(Pending) 단계 카드 (회색) |
| evidence 누락 | `--color-evidence-missing` | `#dc2626` | 누락(Missing) 단계·경고 강조 (적색) |

### 시안 보조 색 (frozen 토큰 아님 — mockup 표현용 로컬 변수)
frozen 팔레트는 상태 3색만 정의하므로, 배경·텍스트·테두리 등 시안 뼈대는 mockup 로컬
변수로 보조 표현한다. **dev는 frozen 3색만 계약으로 지키면 되고, 아래 보조색은 참고 값이다.**

| 역할 | 로컬 변수(mockup) | HEX | 비고 |
| --- | --- | --- | --- |
| 배경 | `--color-bg` | `#f9fafb` | 보드 캔버스 |
| 표면 | `--color-surface` | `#ffffff` | 카드·패널 표면 |
| 본문 텍스트 | `--color-text` | `#111827` | 기본 텍스트 |
| 보조 텍스트 | `--color-text-muted` | `#6b7280` | 캡션·비강조 |
| 테두리 | `--color-border` | `#e5e7eb` | 카드·패널 경계 |

> 색상 대비: 완료(#16a34a)/누락(#dc2626) 위 흰색 텍스트, 본문 #111827 on #ffffff 모두
> WCAG AA 이상. 상태는 색 + 상태명 텍스트 + aria 이름으로 3중 노출한다(§2.4 계약).

## 3. 타이포그래피

vanilla-static stack 규약에 따라 **system font stack**만 사용한다(외부 폰트 CDN 미사용).

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

| 역할 | 요소 | font-size | weight | line-height |
| --- | --- | --- | --- | --- |
| 페이지 heading | `h1` | 1.5rem (24px) | 700 | 1.3 |
| 요구사항 라벨 | `.trace-board__stage` 행 제목 | 1rem (16px) | 600 | 1.4 |
| 단계 카드 이름 | 단계명(요구사항/설계/…) | 0.875rem (14px) | 600 | 1.4 |
| 단계 카드 상태 | 완료/진행 중/누락 | 0.75rem (12px) | 500 | 1.4 |
| 본문/상세 | 패널·안내 텍스트 | 0.875rem (14px) | 400 | 1.6 |
| 캡션 | 보조 안내 | 0.75rem (12px) | 400 | 1.5 |

## 4. 레이아웃

### 섹션 구조 (frozen DOM ID/class 기준 — §2.1)
```
#delivery-trace-board .trace-board                (보드 루트)
├─ header
│  ├─ h1 "납품 추적 상태 보드"
│  ├─ #trace-stage-filter .trace-board__filter     (상태 필터: 전체/완료/진행 중/누락)
│  └─ #trace-evidence-warning .trace-board__warning (누락 evidence 경고, aria-live=polite)
├─ 요구사항 행 목록
│  └─ 각 행: 요구사항 라벨 + 5단계 카드
│     └─ .trace-board__stage × 5 (Requirement→Design→Implementation→Review→Test)
└─ #trace-detail-panel .trace-board__detail        (선택 단계 상세, role=region)
```

### spacing
- 보드 내부 요소 간격: `--space-board-gap` = **`16px`** (frozen token, §2.3)
- 카드 내부 padding: 12px / 패널 padding: 16px
- 단계 카드 행: 가로 flex, gap = `--space-board-gap`

### breakpoint 별 동작 (frozen 반응형 계약 — §2.5)
| 폭 | 동작 |
| --- | --- |
| ≥ 480px | 단계 카드 5개를 가로 배치(flex row, wrap 허용) |
| < 480px | 단계 카드를 **세로 스택**으로 재배치 (flex-direction: column) |
| ≥ 320px | 어떤 폭에서도 보드 content **overflow 없음** (min-width 0, wrap/스택으로 흡수) |

## 5. 상태 모델 (frozen 상태 계약 — §2.2, 6개 상태)

boards는 `#delivery-trace-board`의 `data-state` 속성으로 상태를 표현한다.
각 상태의 화면 텍스트는 frozen 계약 문구를 **그대로** 사용한다.

| 상태 (`data-state`) | 화면 동작·텍스트 (frozen exact) |
| --- | --- |
| `loading` | `추적 데이터를 불러오는 중` 안내 텍스트 표시 |
| `ready` | Requirement→Design→Implementation→Review→Test 5단계 연결과 단계별 완료 상태를 한국어/영문 용어로 표시 |
| `filtered` | 선택된 상태 필터에 해당하는 단계만 강조, 나머지는 흐리게(dim) 표시 |
| `missing-evidence` | `누락된 evidence — 보완 대상` 경고 텍스트와 보완 대상 목록 표시 |
| `detail-open` | 상세 패널에 선택 단계의 evidence 상세를 텍스트로 표시 |
| `error` | `추적 데이터를 표시할 수 없습니다` 오류 텍스트와 재시도 안내 표시 |

### 단계 상태 표기 (한국어/영문 병기)
| 단계 상태 | 화면 텍스트 | 색 토큰 | aria 이름 예 |
| --- | --- | --- | --- |
| 완료 | `완료` | `--color-stage-complete` (#16a34a) | `설계 완료(Complete)` |
| 진행 중 | `진행 중` | `--color-stage-pending` (#9ca3af) | `검토 진행 중(Pending)` |
| 누락 | `누락` | `--color-evidence-missing` (#dc2626) | `테스트 누락(Missing)` |

### 5단계 용어 (한국어/영문)
`요구사항(Requirement)` → `설계(Design)` → `구현(Implementation)` → `검토(Review)` → `테스트(Test)`

### 초기화·후조건 불변식 (§2.2 하단)
초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값**으로 되돌리고, 주 실행 control
(상태 필터)을 다시 사용할 수 있어야 한다. 상세 패널은 비어 있는 초기 안내로 복귀한다.

## 6. 컴포넌트 명세

### 6.1 보드 루트 — `#delivery-trace-board.trace-board`
| 항목 | 값 |
| --- | --- |
| props/속성 | `data-state`: loading \| ready \| filtered \| missing-evidence \| detail-open \| error |
| 상태 | 6개 상태를 `data-state`로 전환 (§5) |
| 인터랙션 | 하위 필터/카드 이벤트를 받아 상태 전환 |

### 6.2 상태 필터 — `#trace-stage-filter.trace-board__filter`
| 항목 | 값 |
| --- | --- |
| props | 옵션: `전체` / `완료` / `진행 중` / `누락` |
| 상태 | 선택 값에 따라 보드를 `filtered` 상태로 전환, `전체` 선택 시 강조 해제 |
| 인터랙션 | **키보드 Tab/Enter 탐색 가능** + 명시적 `aria-label`(§2.4) |
| 접근성 | `aria-label="단계 상태 필터"` |

### 6.3 단계 카드 — `.trace-board__stage`
| 항목 | 값 |
| --- | --- |
| props | `data-stage`(requirement\|design\|implementation\|review\|test), `data-status`(complete\|pending\|missing) |
| 내용 | 단계명(한국어) + 상태 텍스트(완료/진행 중/누락) |
| 상태 | complete → 완료색, pending → 진행색, missing → 누락색 (+ 텍스트/aria 병행) |
| 인터랙션 | 선택 시 해당 단계 evidence를 상세 패널에 표시 → 보드 `detail-open` |
| 접근성 | `<button>` 시맨틱 + `aria-label="<단계명> <상태>(English)"` |

### 6.4 상세 패널 — `#trace-detail-panel.trace-board__detail`
| 항목 | 값 |
| --- | --- |
| props | 선택 단계의 evidence 상세 텍스트 |
| 상태 | 초기: 빈 안내("단계를 선택하면 상세 evidence가 표시됩니다"), 선택 시: 상세 표시 |
| 인터랙션 | 단계 카드 선택 시 채워지고 **열릴 때 포커스를 받는다**(§2.4) |
| 접근성 | `role="region"` + `aria-label`(예: `단계 상세`) |

### 6.5 누락 evidence 경고 — `#trace-evidence-warning.trace-board__warning`
| 항목 | 값 |
| --- | --- |
| props | 보완 대상 단계 목록 |
| 내용 | `누락된 evidence — 보완 대상` 텍스트 + 보완 대상 목록 |
| 상태 | 누락 단계 존재 시 노출, 없으면 숨김 |
| 접근성 | `aria-live="polite"`로 스크린리더에 전달(§2.4) |

## 7. dev 구현 가이드 (developer / BF-1242)

> ⚠ developer는 `board.css`, `board.ts`, `fixtures.ts`, `index.d.ts`(모두 additive)를 소유한다.
> 아래는 frozen 계약을 CSS/DOM으로 옮길 때의 권장 지침이며, **selector·token은 재정의 금지**.

### 7.1 CSS 변수 정의 (`board.css` `:root` 또는 보드 스코프)
```css
:root {
  --color-stage-complete: #16a34a;   /* frozen */
  --color-stage-pending:  #9ca3af;   /* frozen */
  --color-evidence-missing: #dc2626; /* frozen */
  --space-board-gap: 16px;           /* frozen */
}
```
frozen 4개 토큰은 **exact 값**으로 선언한다. 하드코딩된 상태색 대신 위 변수 참조.

### 7.2 DOM 골격 (frozen ID/class 그대로)
```
#delivery-trace-board.trace-board
  .trace-board__filter#trace-stage-filter        (select 또는 버튼 그룹)
  .trace-board__warning#trace-evidence-warning   (aria-live=polite)
  .trace-board__stage × N                        (button, data-stage/data-status)
  .trace-board__detail#trace-detail-panel        (role=region, tabindex=-1)
```

### 7.3 상태 전환
- 보드 `data-state`로 6개 상태 표현. CSS는 `[data-state="filtered"]` 등 attribute selector로 스타일 분기.
- `filtered`: 비강조 카드에 `opacity` 낮춤(dim) — 색뿐 아니라 텍스트 상태명은 유지.
- `detail-open`: 상세 패널을 채우고 `.trace-board__detail`에 `focus()` 부여.

### 7.4 접근성 구현
- 필터: 키보드 Tab/Enter 탐색 + `aria-label`.
- 상세 패널: `role="region"` + `aria-label`, 열릴 때 포커스.
- 경고: `aria-live="polite"`.
- 모든 상태: 색 + 상태명 텍스트 + 접근성 이름 3중 노출.

### 7.5 반응형 구현
```css
.trace-board__stage-list { display: flex; gap: var(--space-board-gap); flex-wrap: wrap; min-width: 0; }
@media (max-width: 479px) {
  .trace-board__stage-list { flex-direction: column; } /* 세로 스택 */
}
```
320px 이상에서 overflow 없도록 `min-width: 0` + wrap/스택으로 흡수.

### 7.6 fixture 연동 (§3 참조 — developer 소유)
- `fixtures.ts`는 6개 상태(loading/ready/filtered/missing-evidence/detail-open/error) 결정론적 데이터 노출.
- `ready`는 5단계 evidence 완결, `missing-evidence`는 최소 1단계 누락 포함.
- 타입은 `index.d.ts`에 선언.

## 8. mockup 참조

- 시각 mockup: **`docs/design/delivery-trace-canary-mockup.html`** (frozen 계약 지정 경로)
- 단일 self-contained HTML, 외부 의존성 0건. frozen ID/class/token/상태 텍스트를 그대로 표현.
- 6개 상태를 `<section>`으로 구분하여 정적 시뮬레이션(loading/ready/filtered/missing-evidence/detail-open/error).
- placeholder 콘텐츠로 UX 의도 전달. dev는 참조 가이드로 사용하되 픽셀 단위 일치 의무 없음.

## 9. AC 매핑

| Acceptance Criteria | 반영 위치 |
| --- | --- |
| ui-contract의 domIds/cssClasses/states/designTokens를 재정의 없이 그대로 반영 | §2, §4, §5, §6 (frozen 그대로) + mockup |
| 5단계 추적 상태·누락 evidence 경고·한국어/영문 용어를 mockup에 시각 표현 | §5, §6.5, mockup의 ready/missing-evidence 섹션 |
| 시각 명세 범위는 md + mockup.html이며 런타임 HTML/CSS/JS 미생성 | 본 2개 파일만 산출, 코드/entry HTML 미작성 |
