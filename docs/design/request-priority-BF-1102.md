# 요청 우선순위 분류 페이지 UI 시안 (BF-1104)

## 0. 메타

| 항목 | 값 |
|---|---|
| Jira | BF-1104 (designer) |
| 작성자 | 이디자인 (designer) |
| 기획 기준 (single source of truth) | `docs/planning/request-priority-BF-1102.md` (BF-1103) |
| 라우트 | `/demo/request-priority-skill-canary` |
| 관련 형제 Task | BF-1103 (planner), BF-1105 (developer), BF-1107 (tester) |
| mockup 참조 | `docs/design/request-priority-mockup/request-priority-BF-1104.html` (§7) |
| tech-stack 마커 | `bf:tech-stack:typescript-monorepo` (요청) / **관측 규약: vanilla-static** (§8.1) |

> **본 시안의 원칙**: 기획 매트릭스(BF-1103 §3)의 P1~P4 매핑·등급 코드·"다음 조치" 텍스트를 **재해석 없이** 그대로 사용한다. 색상·타이포·레이아웃·컴포넌트는 **기존 demo 의 전역 토큰과 카드/폼/상태 배지 스타일을 재사용**하며 **신규 디자인 토큰을 추가하지 않는다**(AC 준수).

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 라우트 `/demo/request-priority-skill-canary` 단일 페이지 데모의 시각 명세.
- 사용자가 **영향도(Impact) × 긴급도(Urgency)** 두 축을 선택하면 클라이언트에서 즉시 **P1~P4 우선순위 + 다음 조치**를 표시(로컬 상태 전용, 네트워크 없음).
- 기존 데모 라우트/공용 컴포넌트는 변경하지 않는다(surgical addition).

### 1.2 사용자 경험 목표
1. 두 축 선택 → 결과를 **한 화면에서 즉시** 확인(스크롤/모달 없이).
2. 산출된 **우선순위 등급이 색상/배지로 한눈에** 구분된다(P1 가장 강한 경보 톤 → P4 가장 낮은 톤).
3. **"다음 조치" 영역이 결과 배지와 시각적으로 분리**되어, "무엇을 지금 해야 하는가"가 명확히 읽힌다.
4. 미선택/에러 상태에서 **임의 계산을 하지 않고** 안내 문구만 노출(기획 §4).

### 1.3 화면 상태(state) 요약
| 상태 | 조건 | 표시 |
|---|---|---|
| `empty` | 두 축 중 하나라도 미선택 | 결과 카드 비활성(placeholder) + "두 축을 모두 선택하세요" 안내 |
| `resolved` | 두 축 모두 선택(유효 등급) | 우선순위 배지 + 다음 조치 영역 + 목표 착수 시간 |
| `error` | 정의되지 않은 등급 코드 유입 | 에러 배지("정의되지 않은 등급") + 계산 거부 안내 |

---

## 2. 컬러 팔레트 (전역 토큰 재사용 — 신규 추가 없음)

기존 demo 의 `:root` 토큰을 그대로 사용한다. **아래는 신규 정의가 아니라 재사용 목록이다.**

| 역할 | 토큰 변수 | HEX |
|---|---|---|
| Primary | `--color-primary` | `#2563EB` |
| Primary hover | `--color-primary-hover` | `#1D4ED8` |
| Primary soft | `--color-primary-soft` | `#EAF1FE` |
| Background | `--color-bg` | `#F7F8FA` |
| Surface | `--color-surface` | `#FFFFFF` |
| Border | `--color-border` | `#E2E5EA` |
| Text | `--color-text` | `#1F2430` |
| Text muted | `--color-text-muted` | `#6B7280` |
| Warning | `--color-warning` | `#D97706` |
| Warning soft | `--color-warning-soft` | `#FEF3E2` |
| Success | `--color-success` | `#16A34A` |
| Success soft | `--color-success-soft` | `#ECFDF3` |
| Pending | `--color-pending` | `#9CA3AF` |
| Pending soft | `--color-pending-soft` | `#F3F4F6` |

### 2.1 우선순위 → 상태 배지 토큰 매핑 (핵심)

전역 팔레트에는 **전용 danger/critical red 토큰이 존재하지 않는다.** AC상 신규 토큰 추가가 금지되므로, P1 은 팔레트에서 **가장 강한 경보 톤인 warning(amber)** 을 재사용한다. 4개 우선순위에 기존 4개 시맨틱 토큰 쌍(soft 배경 + solid 텍스트)을 1:1 배정한다.

| 우선순위 | 라벨(기획 §3.1) | 배경 토큰 | 텍스트/보더 토큰 | 시각 의도 |
|---|---|---|---|---|
| **P1** | 긴급(Critical) | `--color-warning-soft` `#FEF3E2` | `--color-warning` `#D97706` | 최고 경보(amber) — 즉시 대응 |
| **P2** | 높음(High) | `--color-primary-soft` `#EAF1FE` | `--color-primary` `#2563EB` | 주요(blue) — 당일 착수 |
| **P3** | 보통(Medium) | `--color-success-soft` `#ECFDF3` | `--color-success` `#16A34A` | 안정(green) — 익영업일 |
| **P4** | 낮음(Low) | `--color-pending-soft` `#F3F4F6` | `--color-text-muted` `#6B7280` | 대기(gray) — 백로그 |

> P4 텍스트는 대비(a11y) 확보를 위해 `--color-pending`(`#9CA3AF`) 대신 `--color-text-muted`(`#6B7280`)를 사용한다. 배경은 `--color-pending-soft`.
> **모호함 flag**: "P1 = red" 를 기대할 수 있으나 팔레트에 red 토큰이 없고 AC가 신규 토큰을 금지한다. developer 는 임의로 red HEX 를 추가하지 말 것. red 토큰이 필요하다는 판단이면 별도 Task(토큰 확장, 운영자 승인)로 분리한다.

---

## 3. 타이포그래피 (전역 토큰 재사용)

font-family 는 기존 데모의 시스템 폰트 스택을 그대로 사용한다.

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | line-height | font-weight | 용도 |
|---|---|---|---|---|
| Page title | 22px | 30px | 700 | 페이지 제목("요청 우선순위 분류") |
| Page subtitle | 14px | 20px | 400 | 부제(muted) |
| Section heading | 15px | 22px | 600 | 섹션 제목("입력", "결과") |
| Field label | 12px | 16px | 500 | 폼 라벨(muted) |
| Body | 14px | 20px | 400 | 본문/옵션 텍스트 |
| Priority badge (large) | 24px | 30px | 700 | 결과 카드의 P1~P4 대형 배지 숫자 |
| Badge (pill) | 12px | 16px | 600 | 매트릭스 셀·인라인 배지 |
| Caption | 12px | 16px | 500 | 목표 착수 시간 등 보조 텍스트(muted) |

---

## 4. 레이아웃

### 4.1 섹션 구조 (단일 페이지, 위→아래)
```
┌────────────────────────────────────────┐
│ header  (title + subtitle)             │
├────────────────────────────────────────┤
│ [입력 카드 .panel]                      │
│   · 영향도(Impact)  4-옵션 라디오 그룹  │
│   · 긴급도(Urgency) 4-옵션 라디오 그룹  │
├────────────────────────────────────────┤
│ [결과 카드 .panel]                      │
│   · 우선순위 배지(P1~P4, 대형)          │
│   · 다음 조치 영역(accent border-left)  │
│   · 목표 착수 시간(caption)             │
│   · (empty/error 상태 대체 콘텐츠)      │
├────────────────────────────────────────┤
│ [참조: 우선순위 매트릭스 4×4 표]        │
└────────────────────────────────────────┘
```
- 컨테이너: `max-width: 760px; margin: 0 auto; padding: 32px 16px;` (기존 demo `.board` 와 동일 규격).
- 카드 간 세로 간격: `--space-5`(24px). 카드 내부 padding: `--space-4`(16px).

### 4.2 spacing / radius (전역 토큰 재사용)
- spacing: `--space-1:4 / -2:8 / -3:12 / -4:16 / -5:24 / -6:32`
- radius: `--radius-card:12 / --radius-item:10 / --radius-btn:8 / --radius-pill:999`

### 4.3 breakpoint 별 동작
| 폭 | 입력 옵션 그룹 | 결과 카드 |
|---|---|---|
| ≥ 640px (desktop/tablet) | 영향도·긴급도 각 그룹의 4옵션을 `grid-template-columns: repeat(2, 1fr)` 2열(또는 4열 inline) | 배지·다음 조치 가로 여백 유지 |
| < 640px (mobile) | 옵션 1열 세로 스택(`repeat(1, 1fr)`), 컨테이너 padding 유지 | 배지 상단 / 다음 조치 하단 세로 스택 |

- 데모는 로컬 상태 전용이라 별도 미디어쿼리 최소화. 옵션 그룹만 `@media (max-width: 640px)` 로 1열 전환.

---

## 5. 컴포넌트 명세

기존 demo 의 클래스/스타일을 재사용한다. 신규 컴포넌트는 **기존 패턴의 합성**으로만 정의한다.

### 5.1 입력 카드 — 축 선택 그룹 (`.axis-group`)
- 컨테이너: 기존 `.panel`(surface + border + radius-card + padding-16) 재사용.
- 각 축은 `.feedback-form__field` 패턴(label + 컨트롤). label 텍스트: "영향도(Impact)", "긴급도(Urgency)".
- 옵션은 **라디오형 선택 카드**(`.axis-option`) — 기존 `.segmented__btn` pill 스타일을 확장한 토글 버튼.

| 항목 | 내용 |
|---|---|
| props | `axis`("impact" \| "urgency"), `value`(등급 코드), `label`(표시명), `selected`(bool), `onSelect(code)` |
| 상태 | 기본 / `--selected`(active) / `:hover` / `:focus-visible` |
| 기본 | `border:1px var(--color-border)`, `background:var(--color-surface)`, `color:var(--color-text-muted)`, `border-radius:var(--radius-pill)`, padding `--space-1 --space-3` |
| selected | `background:var(--color-primary)`, `color:#fff` (기존 `.segmented__btn--active` 규칙 재사용) |
| hover | `background:var(--color-bg)` (미선택 시) |
| focus | `outline:none; box-shadow:0 0 0 3px var(--color-primary-soft)` (기존 폼 focus 규칙 재사용) |

- 영향도 옵션(기획 §2.1): `Critical / High / Medium / Low` → 코드 `critical / high / medium / low`.
- 긴급도 옵션(기획 §2.2): `Immediate / High / Medium / Low` → 코드 `immediate / high / medium / low`.
- **접근성**: 각 축 그룹은 `role="radiogroup"` + `aria-label`, 옵션은 `role="radio"` + `aria-checked`. 키보드 좌우 화살표 이동.

### 5.2 결과 카드 (`.result-panel`)
- 컨테이너: `.panel` 재사용.
- 우선순위 배지(`.priority-badge`): §2.1 토큰 매핑에 따라 P1~P4 별로 배경/텍스트 색이 달라진다.

| 항목 | 내용 |
|---|---|
| props | `priority`("P1"~"P4" \| null), `label`(긴급/높음/보통/낮음), `state`("empty"\|"resolved"\|"error") |
| resolved | 대형 배지(24px/700) + `.priority-badge--p1..p4` 색상 클래스. 배지 좌측에 등급 코드 요약(예: "Critical × Immediate") caption |
| empty | 배지 자리에 dashed placeholder + 안내 문구 "두 축을 모두 선택하세요" (muted) |
| error | `.priority-badge--error`(warning 톤) + "정의되지 않은 등급" 문구, 다음 조치 영역 숨김 |

- `.priority-badge` 기본형: `display:inline-flex; align-items:center; gap:8px; border-radius:var(--radius-pill); padding:var(--space-2) var(--space-4); font-weight:700;`
- 색상 클래스(§2.1):
  - `.priority-badge--p1 { background:var(--color-warning-soft); color:var(--color-warning); }`
  - `.priority-badge--p2 { background:var(--color-primary-soft); color:var(--color-primary); }`
  - `.priority-badge--p3 { background:var(--color-success-soft); color:var(--color-success); }`
  - `.priority-badge--p4 { background:var(--color-pending-soft); color:var(--color-text-muted); }`
  - `.priority-badge--error { background:var(--color-warning-soft); color:var(--color-warning); }`

### 5.3 다음 조치 영역 (`.next-action`) — AC2 핵심(시각적 분리)
- 결과 배지와 **명확히 분리**되도록 기존 `.recovery-banner` 의 **left accent border(4px)** 패턴을 재사용한다.
- accent 색은 현재 우선순위 색과 동일(P1=warning … P4=pending)하여 배지와 색으로 연결되되, **박스 배경 + border-left** 로 배지와 영역이 구분된다.

| 항목 | 내용 |
|---|---|
| props | `nextAction`(기획 §3.1 "다음 조치" 텍스트), `targetTime`(목표 착수 시간), `priority` |
| 구조 | `.next-action { border-left:4px solid <priority-color>; background:<priority-soft>; border-radius:var(--radius-card); padding:var(--space-4); }` |
| 내용 | 소제목 "다음 조치" + 조치 본문(14px) + 목표 착수 시간 caption(muted) |
| empty/error | 렌더링하지 않음(숨김) |

- 다음 조치 텍스트(기획 §3.1, 재해석 금지):
  - P1: "즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 경영진/책임자 에스컬레이션" / 목표: 15분 이내
  - P2: "당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트" / 목표: 4시간 이내
  - P3: "익영업일 이내 착수, 정기(일 단위) 업데이트" / 목표: 1영업일 이내
  - P4: "백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토" / 목표: 스프린트 계획 반영

### 5.4 참조 매트릭스 표 (`.matrix`)
- 기획 §3 의 4×4 매트릭스를 읽기 전용 표로 표시(사용자 이해 보조).
- 셀 값(P1~P4)은 `.priority-badge` pill(12px/600) 소형 버전으로 표기하여 색상 일관성 유지.
- 현재 선택된 조합의 셀은 `outline:2px solid var(--color-primary)` 로 하이라이트(선택 위치 피드백).

### 5.5 상태별 안내(`.hint`)
- empty/error 안내 문구는 `.feedback-form__error` 패턴(warning 톤, muted) 재사용.

---

## 6. dev 구현 가이드 (BF-1105 developer)

> **저장소 규약 우선(§8.1)**: 요청 마커는 `typescript-monorepo` 이나 실제 관측 규약은 **vanilla-static / npm / esm / static serve root `.`** 이다. developer 는 관측 규약을 따른다(단일 `index.html` + 인라인 `<style>` + esm `<script type="module">`). shadcn/design-tokens.json 은 이 저장소에 적용되지 않는다.

1. 엔트리: `demo/request-priority-skill-canary/index.html` 신규 생성(planner §5, 저장소 route-mapping = root-relative-static).
2. `:root` 에 §2 전역 토큰을 **그대로 복사**(기존 demo 와 동일 변수명·HEX). 신규 토큰/HEX 하드코딩 금지.
3. 순수 함수 `classifyRequestPriority(impact, urgency)` 는 기획 §6 계약을 그대로 구현(4×4 상수 룩업, 근사 로직 금지).
4. UI 상태 모델은 기획 §7 `RequestPriorityUiState`(selectedImpact/selectedUrgency/result) 그대로.
5. 권장 클래스명(mockup 과 일치): `.panel`, `.axis-group`, `.axis-option`(+`--selected`), `.result-panel`, `.priority-badge`(+`--p1..p4`,`--error`), `.next-action`, `.matrix`, `.hint`.
6. 두 축 미선택 시 결과 계산 금지 + "두 축을 모두 선택하세요" 노출(기획 §4). 등급 변경 시 매번 순수 재계산(무상태).
7. 정의되지 않은 등급 유입 시 `.priority-badge--error` + 계산 거부(폴백 추정 금지).
8. mockup 은 픽셀 단위 일치 의무 없음 — 토큰·클래스·상태 구조를 참조 가이드로 사용.
9. 검증: `node --test demo/request-priority-skill-canary/tests/*.test.js` (엔트리 구현 이후 유효). 매트릭스 16조합은 tester(BF-1107) 전수 커버.

---

## 7. mockup 참조

- 경로: `docs/design/request-priority-mockup/request-priority-BF-1104.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`).
- §2 토큰·§4 레이아웃·§5 컴포넌트·상태(empty/resolved/error)를 정적으로 시각화. 인터랙션 상태(hover/selected/focus)는 별도 섹션에 정적 렌더.

---

## 8. 부록

### 8.1 저장소 규약 불일치 플래그 (developer 전달)
- `requested_stack: typescript-monorepo` vs `observed_stack: vanilla-static` — **불일치**. 명령/구현은 관측 규약 우선.
- `expected_entry_path: demo/request-priority-skill-canary/index.html` 는 본 designer task owned_paths 밖 → 본 시안은 엔트리 파일을 생성하지 않는다(명세 + mockup 만). developer 가 신규 생성.
- 검증 명령 `node --test demo/request-priority-skill-canary/tests/*.test.js` 는 엔트리 구현 이후에만 유효.

### 8.2 보존 영역
- 기존 demo 라우트/공용 컴포넌트/전역 토큰 정의를 변경하지 않는다. 본 라우트는 전역 토큰을 **참조(복사 사용)** 만 한다.
</content>
</invoke>
