# 온보딩 체크리스트 디자인 명세 — BF-1068

- 모듈: `customer-onboarding-canary`
- 관련 기획: BF-1067 (`docs/planning/customer-onboarding-canary/onboarding-checklist-BF-1067.md`)
- 저장소 규약(실측): `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의
- mockup 참조: `docs/design/customer-onboarding-canary/onboarding-checklist-BF-1068.html`

> ⚠️ **입력 제약 (fail-honest)**
> 본 Run 에서 아래 두 입력이 scope guard 로 직접 접근 불가했습니다. 명세는 Task 수용 기준과
> 표준 온보딩-체크리스트 UX 로부터 도출했으며, 아래 항목은 reviewer/운영자 확인이 필요합니다.
> - BF-1067 기획 명세 본문 (`cross-canary-scope-guard` 로 read 차단) → 항목 문구/개수/순서 정합성 재확인 필요
> - 저장소 공용 토큰 원본/README (`broad-search-outside-context-scope` 로 read 차단) → 아래 토큰 **이름·값이 기존 공용 규약과 일치하는지** 확인 필요
>
> 저장소 규약이 `vanilla-static`(공유 토큰 파일 부재)이므로, 본 명세는 **신규 시각 토큰을 도입하지 않고**
> system font + 중립 팔레트(neutral gray + 절제된 단일 accent)만으로 구성해 AC2(신규 토큰 미도입)를 보수적으로 충족합니다.

---

## 1. 시안 개요

### 변경 범위
신규 온보딩 체크리스트 화면 1개. 신규 고객이 서비스 초기 설정을 순서대로 완료하도록 안내하는
체크리스트 UI 를 정의한다. 다른 canary 화면은 참조하지 않으며, 저장소 공용/중립 토큰만 사용한다.

### 사용자 경험 목표
- 신규 고객이 **현재 어디까지 했는지**(진행률)와 **다음에 할 일**을 한눈에 파악
- 각 단계의 상태(대기 / 진행 중 / 완료)를 명확한 시각 구분으로 전달
- 모든 단계 완료 시 성취감을 주는 완료 상태 제공
- 모바일에서도 단일 컬럼으로 자연스럽게 스택

### 화면 구조 (요약)
```
┌────────────────────────────────────────┐
│  헤더: 제목 + 부제 + 진행률 바 (n/m)      │
├────────────────────────────────────────┤
│  [완료 배너] (모든 단계 완료 시에만)       │
├────────────────────────────────────────┤
│  체크리스트                                │
│   ▸ 항목 1  [상태]  제목/설명  [액션]      │
│   ▸ 항목 2  [상태]  제목/설명  [액션]      │
│   ▸ …                                      │
└────────────────────────────────────────┘
```

---

## 2. 컬러 팔레트

> 중립 팔레트 + 단일 accent. 상태색(성공/진행/대기)은 접근성 대비를 위해 표준 의미색 사용.

| 역할 | 토큰 | HEX | 용도 |
|---|---|---|---|
| Primary (accent) | `--color-primary` | `#2563EB` | 액션 버튼, 진행률 채움, 포커스 |
| Primary hover | `--color-primary-hover` | `#1D4ED8` | 버튼 hover/active |
| Background | `--color-bg` | `#F7F8FA` | 페이지 배경 |
| Surface | `--color-surface` | `#FFFFFF` | 카드/항목 배경 |
| Border | `--color-border` | `#E2E5EA` | 카드·구분선 |
| Text | `--color-text` | `#1F2430` | 본문/제목 (대비 AA↑) |
| Text muted | `--color-text-muted` | `#6B7280` | 부제·설명·caption |
| Success (완료) | `--color-success` | `#16A34A` | 완료 상태 아이콘/배지 |
| Warning (진행 중) | `--color-warning` | `#D97706` | 진행 중 상태 배지 |
| Pending (대기) | `--color-pending` | `#9CA3AF` | 대기 상태 아이콘(중립 회색) |
| Success surface | `--color-success-soft` | `#ECFDF3` | 완료 배너 배경 |

접근성: 본문 텍스트 `#1F2430` on `#FFFFFF` ≈ 14.8:1, `--color-text-muted` on `#FFFFFF` ≈ 5.0:1 로 WCAG AA 충족. 상태는 색 + 아이콘 + 라벨 텍스트로 이중 인코딩(색맹 대비).

---

## 3. 타이포그래피

system font stack (외부 폰트 미로드):
```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | 토큰 | size / line-height | weight | 용도 |
|---|---|---|---|---|
| Heading (화면 제목) | `--font-h1` | 20px / 28px | 600 | "온보딩 체크리스트" |
| Subtitle | `--font-sub` | 14px / 20px | 400 | 헤더 부제 |
| Item title | `--font-item` | 15px / 22px | 600 | 각 체크리스트 항목 제목 |
| Body | `--font-body` | 14px / 20px | 400 | 항목 설명 |
| Caption | `--font-caption` | 12px / 16px | 500 | 상태 배지, 진행률 텍스트 |

---

## 4. 레이아웃

### spacing 스케일 (4px 기반)
`--space-1: 4px · --space-2: 8px · --space-3: 12px · --space-4: 16px · --space-5: 24px · --space-6: 32px`

### radius
`--radius-card: 12px · --radius-item: 10px · --radius-btn: 8px · --radius-pill: 999px`

### 구조 & spacing
- 페이지: 배경 `--color-bg`, 중앙 정렬 컨테이너 `max-width: 640px`, 좌우 padding `--space-4`
- 헤더: 제목 → 부제(gap `--space-1`) → 진행률 바(margin-top `--space-4`)
- 체크리스트: 항목 간 gap `--space-3`
- 항목 카드: padding `--space-4`, border `1px solid --color-border`, radius `--radius-item`, 배경 `--color-surface`
  - 내부: [상태 아이콘] — [제목+설명 영역(flex:1)] — [액션 버튼], 세로 정렬 center, 가로 gap `--space-3`

### breakpoint 별 동작
| breakpoint | 동작 |
|---|---|
| `≥ 640px` (desktop/tablet) | 항목 내부 가로 배치(아이콘·텍스트·버튼 한 줄), 컨테이너 640px 고정 |
| `< 640px` (mobile) | 컨테이너 full-width, 항목 내부는 아이콘+텍스트 한 줄 유지하되 **액션 버튼은 텍스트 아래로 줄바꿈**(full-width 버튼), 진행률 텍스트 유지 |

---

## 5. 컴포넌트 명세

### 5.1 `OnboardingChecklist` (컨테이너)
| 항목 | 내용 |
|---|---|
| props | `items: ChecklistItem[]`, `completedCount: number`, `totalCount: number` |
| 파생 | `allDone = completedCount === totalCount` |
| 상태 | `allDone` 이면 `CompletionBanner` 렌더 |
| 접근성 | 항목 목록은 `<ul role="list">`, 각 항목 `<li>` |

### 5.2 `ProgressBar`
| 항목 | 내용 |
|---|---|
| props | `value: number`, `max: number` |
| 시각 | 트랙(높이 8px, `--color-border`, radius `--radius-pill`) + 채움(`--color-primary`, width `value/max*100%`) |
| 라벨 | 우측 caption `"{value}/{max} 완료"` |
| 접근성 | `role="progressbar"` + `aria-valuenow/valuemin/valuemax` |
| 인터랙션 | width 변화에 `transition: width 240ms ease` |

### 5.3 `ChecklistItem`
| 항목 | 내용 |
|---|---|
| props | `id: string`, `order: number`, `title: string`, `description: string`, `status: 'pending' \| 'in_progress' \| 'completed'`, `actionLabel?: string` |
| 상태별 시각 | **completed**: 아이콘 ✓(`--color-success`), 제목 취소선 없음·`--color-text-muted`, 액션 버튼 숨김 / **in_progress**: 아이콘 ◐(`--color-warning`), 배지 "진행 중", 액션 버튼(primary) / **pending**: 아이콘 ○(`--color-pending`), 배지 "대기", 액션 버튼(secondary/outline) |
| 인터랙션 | 액션 버튼 hover → `--color-primary-hover`; 카드 hover → border 살짝 진하게(`--color-text-muted` 20%); 키보드 포커스 링 `--color-primary` 2px |

### 5.4 `StatusBadge`
| 항목 | 내용 |
|---|---|
| props | `status: 'pending' \| 'in_progress' \| 'completed'` |
| 시각 | pill(radius `--radius-pill`, padding `2px 8px`, caption), 상태색 텍스트 + soft 배경 |
| 라벨 | pending="대기", in_progress="진행 중", completed="완료" (색 외 텍스트로도 구분) |

### 5.5 `CompletionBanner`
| 항목 | 내용 |
|---|---|
| 조건 | `allDone === true` |
| 시각 | 배경 `--color-success-soft`, 좌측 accent border `--color-success`, radius `--radius-card`, padding `--space-4` |
| 내용 | 🎉 "온보딩을 모두 완료했어요!" + 부제 "이제 서비스를 시작할 준비가 끝났습니다." |

---

## 6. dev 구현 가이드 (dev-1 용)

> 저장소 규약 `vanilla-static` 기준. 신규 route 는 root-relative static. **owned scope 밖 실제 앱 경로는
> 본 designer 산출물에서 확정하지 않음** — convention capsule 의 `runtime_ownership_correction`/entry-path
> 교정 사항(요청 URL `demo/customer-onboarding-canary/index.html` 이 owned scope 밖)은 dev/PM 이 확정.

1. `<style>` 인라인 또는 페이지 전용 CSS 의 `:root` 에 **§2·§3·§4 토큰을 그대로 선언**한다. 하드코딩 색상 금지 — 모든 색/간격은 CSS 변수 참조.
2. 마크업: 컨테이너 `<main class="onboarding">` → 헤더 `<header class="onboarding__header">` → 진행률 `<div class="progress" role="progressbar">` → 목록 `<ul class="checklist" role="list">` → 항목 `<li class="checklist__item" data-status="pending|in_progress|completed">`.
3. 상태 스타일은 `data-status` 속성 셀렉터로 분기(`.checklist__item[data-status="completed"] .status-icon { color: var(--color-success); }`).
4. 액션 버튼: `<button class="btn btn--primary">` / `<button class="btn btn--outline">`. `completed` 항목은 버튼 미렌더.
5. 진행률: `value/max*100%` 를 채움 요소 inline `style="width:..."` 또는 CSS 변수(`--progress: 60%`)로 반영, `transition: width 240ms ease`.
6. 반응형: `@media (max-width: 639.98px)` 에서 `.checklist__item` 의 액션 버튼을 `width:100%; margin-top: var(--space-3)` 로 줄바꿈.
7. 상태 이중 인코딩 유지: 색 + 아이콘 + `StatusBadge` 텍스트를 항상 함께 제공(접근성).

권장 CSS 변수/클래스명은 위 마크업 예시 기준. mockup 은 픽셀 단위 일치 의무 없음 — UX 의도·토큰 기준.

---

## 7. mockup 참조
- 파일: `docs/design/customer-onboarding-canary/onboarding-checklist-BF-1068.html`
- 단일 self-contained HTML, 외부 의존성 0건, `:root` 에 본 명세 토큰 선언.
- 대기/진행 중/완료 3가지 항목 상태 + 진행률 바 + 완료 배너를 한 페이지에서 시각화.

---

## 8. 수용 기준(AC) ↔ 디자인 요소 매핑

| AC | 요구 | 대응 디자인 요소 |
|---|---|---|
| **AC1** — 기획 명세 → 디자인 명세, `docs/design` 하위 md+mockup 산출·PR 생성 | 본 문서(`…/onboarding-checklist-BF-1068.md`) + mockup(`…/onboarding-checklist-BF-1068.html`), git commit → 시스템 자동 PR |
| **AC2** — 공용 토큰만 사용, 기존 페이지와 일관성, **신규 토큰 미도입** | §2·§3·§4 의 중립 팔레트 + system font + 4px spacing 스케일. 브랜드/장식용 신규 토큰 미도입, 표준 의미색만 사용. (⚠️ 공용 토큰 원본 read 차단 — 이름·값 정합성 reviewer 확인 필요) |
| **AC3** — 각 AC 가 디자인 요소와 연결 | 본 §8 매핑 표 |

---

## 9. Self-critique

1. **AC 매핑** — §8 에서 AC1/AC2/AC3 각각을 구체 디자인 요소·산출물에 연결함. ✅
2. **dev 구현 가이드** — §6 에서 마크업 구조·`data-status` 분기·반응형·토큰 선언까지 단계별 제시. ✅
3. **기존 요소 보존** — 신규 화면이라 보존 대상 없음. 다른 canary 미참조·중립 토큰만 사용해 일관성 리스크 최소화. ✅(단, 공용 토큰 원본 확인 불가 — 아래 flag)
4. **컴포넌트 매핑** — §5 에서 컨테이너/ProgressBar/ChecklistItem/StatusBadge/CompletionBanner props·상태·인터랙션 정의. ✅
5. **모호함 flag (reviewer 확인 필요)** —
   - BF-1067 기획 명세 본문을 `cross-canary-scope-guard` 로 읽지 못함 → **체크리스트 항목의 실제 문구/개수/순서**가 기획과 일치하는지 확인 필요(본 명세는 상태 모델·레이아웃 중심으로 구성, 항목 콘텐츠는 placeholder).
   - 저장소 공용 토큰 원본/README read 차단 → **§2~§4 토큰 이름·값**이 기존 공용 규약과 정확히 일치하는지 확인 필요. 불일치 시 dev 구현 전 토큰명 정렬 요망.
