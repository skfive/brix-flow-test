# 서비스 요청 분류 보드 UI 시안 (BF-1122)

## 0. 메타

| 항목 | 값 |
|---|---|
| Jira | BF-1122 (designer) |
| 작성자 | 이디자인 (designer) |
| 기획 기준 (single source of truth) | `docs/planning/service-request-triage-BF-1121.md` (BF-1121) |
| 라우트 | `/demo/service-request-triage` (기획 §5) |
| 관련 형제 Task | BF-1121 (planner), BF-1123 (developer), BF-1125 (tester) |
| mockup 참조 | `docs/design/mockups/service-request-triage-BF-1122.html` (§7) |
| tech-stack 마커 | `bf:tech-stack:typescript-monorepo` (요청) / **관측 규약: vanilla-static** (§8.1) |
| 디자인 일관성 앵커 | `docs/design/request-priority-BF-1102.md` (BF-1104, 동일 도메인·동일 전역 토큰) |

> **본 시안의 원칙**: 기획 매트릭스(BF-1121 §3)의 P1~P4 매핑·유형/영향도 코드·"다음 조치" 텍스트를 **재해석 없이** 그대로 사용한다. 색상·타이포·레이아웃·컴포넌트는 **기존 demo 의 전역 토큰과 카드/폼/상태 배지 스타일을 재사용**하며 **신규 디자인 토큰을 추가하지 않는다**(AC3 준수). 우선순위 색상 매핑은 동일 도메인 선례(BF-1104)와 1:1 동일하게 유지한다.

## 0.1 배정 Skill 호출 및 적용 근거 (AC2)

본 Task 실행 초기, RUN_CAPABILITY_MANIFEST 에 명시된 필수 Skill(`frontend-design`, invocation_ref `imported-3f96152fa715c07e`)을 아래와 같이 명시 호출을 시도했다.

| 시도 | 호출 방식 | 결과 |
|---|---|---|
| 1 | `Skill({ skill: "imported-3f96152fa715c07e" })` (manifest 지정 exact invocation_ref) | `Unknown skill` 오류 |
| 2 | `Skill({ skill: "frontend-design" })` (manifest 상 skill 이름) | `Unknown skill` 오류 |
| 3 | manifest 지정 exact SKILL.md 경로 직접 Read | `context scope: context-widening-reason-required` → widening 사유 기록 후 재시도도 scope guard 차단 |
| 4 | `mcp__brix-control__search_installed_skills` (`frontend-design`, `design` 2개 쿼리) | 두 쿼리 모두 `skills: []` (설치된 항목 없음) |

**결론**: manifest 는 해당 Skill 이 assigned 상태라고 선언하지만, 실제 Skill 도구 registry·SKILL.md 경로·MCP 조회 어디에도 노출되어 있지 않다 — provisioning 불일치로 판단한다. `request_skill_activation` 에 전달할 유효 `skillId` 조차 확보할 수 없었다. 자체 설치/우회 접근을 시도하지 않고(CAPABILITY_BOUNDARY 준수), 이 사실을 fail-honest 하게 기록한다. 동일 Run 계보의 planner(BF-1121 §0.1)도 `prd-writer` Skill 에 대해 동일한 provisioning 불일치를 기록했다.

**대체 근거**: Skill 본문 지침을 반영하지 못한 대신, 이하 시안은 **동일 저장소·동일 도메인의 확정 선례(BF-1104 `request-priority` 시안)의 전역 토큰·컴포넌트 관례**를 형식적 기준으로 삼아 표준 UI 명세 방식으로 진행한다. 운영자는 `frontend-design` provisioning 을 재확인해야 한다.

---

## 1. 시안 개요

### 1.1 변경 범위
- 신규 라우트 `/demo/service-request-triage` 단일 페이지 데모의 시각 명세.
- 요청 카드마다 **유형(Type, 5종 범주형) × 영향도(Impact, 4단계 서열)** 를 선택하면 클라이언트에서 즉시 **P1~P4 우선순위**를 계산하고, 카드가 **우선순위 기준 5개 컬럼(P1·P2·P3·P4·미분류)** 중 해당 컬럼으로 그룹핑되는 **분류 보드**(triage board)를 시각화한다.
- 로컬 상태 전용(네트워크/영속화 없음). 기존 데모 라우트/공용 컴포넌트/전역 토큰 정의는 변경하지 않는다(surgical addition).

### 1.2 사용자 경험 목표
1. **두 축(유형·영향도)이 서로 다른 축임이 시각적으로 구분**된다 — 유형은 범주형(아이콘 태그), 영향도는 서열형(4단계 강도 표시)으로 인코딩이 달라 한눈에 성격 차이를 읽는다(AC1).
2. 두 축 선택 → 카드의 **우선순위 등급(P1~P4)이 색상 배지 + 컬럼 위치**로 이중 표현되어 즉시 파악된다(P1 가장 강한 경보 톤 → P4 가장 낮은 톤).
3. **미선택 카드는 임의 계산 없이 "미분류" 컬럼**에 모여, "아직 분류가 필요한 건"이 한 영역에 집계된다(기획 §4, §7.2).
4. 정의되지 않은 코드 유입 시 **폴백 추정 없이 에러 상태**만 노출한다.

### 1.3 카드 상태(state) 요약
| 상태 | 조건 | 배치 컬럼 | 표시 |
|---|---|---|---|
| `unclassified` | 유형 또는 영향도 중 하나라도 미선택 | **미분류** | 유형/영향도 선택 컨트롤 활성 + "두 축을 모두 선택하세요" 안내, 우선순위 배지 없음 |
| `resolved` | 두 축 모두 유효 선택 | `result.priority` 컬럼(P1~P4) | 유형 태그 + 영향도 강도 표시 + 우선순위 배지 + 다음 조치 요약 |
| `error` | 정의되지 않은 유형/영향도 코드 유입 | **미분류**(계산 거부) | 에러 배지("정의되지 않은 유형/등급") + 계산 거부 안내 |

---

## 2. 컬러 팔레트 (전역 토큰 재사용 — 신규 추가 없음)

기존 demo 의 `:root` 토큰을 그대로 사용한다. **아래는 신규 정의가 아니라 재사용 목록이며, BF-1104 §2 와 동일하다.**

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

### 2.1 우선순위 → 상태 배지/컬럼 토큰 매핑 (핵심 — BF-1104 와 1:1 동일)

전역 팔레트에는 **전용 danger/critical red 토큰이 존재하지 않는다.** AC상 신규 토큰 추가가 금지되므로, P1 은 팔레트에서 **가장 강한 경보 톤인 warning(amber)** 을 재사용한다. 4개 우선순위 + 미분류에 기존 시맨틱 토큰 쌍(soft 배경 + solid 텍스트)을 1:1 배정한다.

| 우선순위 | 라벨(기획 §3.1) | 배경 토큰 | 텍스트/보더 토큰 | 시각 의도 |
|---|---|---|---|---|
| **P1** | 긴급(Critical) | `--color-warning-soft` `#FEF3E2` | `--color-warning` `#D97706` | 최고 경보(amber) — 즉시 대응 |
| **P2** | 높음(High) | `--color-primary-soft` `#EAF1FE` | `--color-primary` `#2563EB` | 주요(blue) — 당일 착수 |
| **P3** | 보통(Medium) | `--color-success-soft` `#ECFDF3` | `--color-success` `#16A34A` | 안정(green) — 익영업일 |
| **P4** | 낮음(Low) | `--color-pending-soft` `#F3F4F6` | `--color-text-muted` `#6B7280` | 대기(gray) — 백로그 |
| **미분류** | 미분류 | `--color-bg` `#F7F8FA` | `--color-text-muted` `#6B7280` | 중립 — 분류 대기 (dashed 보더로 구분) |

> P4/미분류 텍스트는 대비(a11y) 확보를 위해 `--color-pending`(`#9CA3AF`) 대신 `--color-text-muted`(`#6B7280`)를 사용한다.
> **모호함 flag**: "P1 = red" 를 기대할 수 있으나 팔레트에 red 토큰이 없고 AC 가 신규 토큰을 금지한다. developer 는 임의 red HEX 를 추가하지 말 것 — red 토큰이 필요하다는 판단이면 별도 Task(토큰 확장, 운영자 승인)로 분리한다.

### 2.2 축 인코딩 규칙 — 유형/영향도가 "서로 다른 축"임을 시각적으로 정의 (AC1 핵심)

우선순위(P)에만 시맨틱 컬러를 배정하고, **유형/영향도는 컬러 토큰을 새로 만들지 않는다.** 두 축은 컬러가 아닌 **형태(form)** 로 구분한다.

| 축 | 성격 | 시각 인코딩 | 사용 토큰 |
|---|---|---|---|
| **유형(Type)** | 범주형(5종, 서열 아님) | **아이콘 + 라벨 outline 태그**(`.type-tag`) — 색으로 서열을 암시하지 않도록 중립 보더/텍스트. 유형 구분은 아이콘 글리프 + 텍스트로 | `--color-border`, `--color-text`, `--color-surface` |
| **영향도(Impact)** | 서열형(4단계) | **4-세그먼트 강도 미터**(`.impact-meter`) — 채워진 칸 수로 서열 표현(Critical=4칸 … Low=1칸) + 라벨 | 채움 `--color-text` / 빈칸 `--color-border` |
| **우선순위(Priority)** | 파생 결과 | 색상 배지(`.priority-badge`) + 컬럼 위치 | §2.1 매핑 |

유형 아이콘 글리프(범주 식별용, 색상 의미 없음):

| 유형 | 코드 | 글리프 | 라벨 |
|---|---|---|---|
| 장애 | `incident` | ⛔ | 장애 |
| 보안 | `security` | 🔒 | 보안 |
| 버그 | `bug` | 🐛 | 버그 |
| 변경요청 | `change_request` | ⚙ | 변경요청 |
| 문의 | `inquiry` | ❓ | 문의 |

> **모호함 flag**: 글리프는 mockup 의 범주 식별 보조 표현이다. developer 는 이모지 대신 접근성 확보된 텍스트 라벨을 필수로 유지해야 하며(스크린리더는 라벨 읽음), 이모지는 선택적 시각 보조로만 쓴다. 이모지 렌더가 어려운 환경이면 라벨만으로도 유형 구분이 성립하도록 설계했다.

---

## 3. 타이포그래피 (전역 토큰 재사용)

font-family 는 기존 데모의 시스템 폰트 스택을 그대로 사용한다(신규 웹폰트 없음).

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | line-height | font-weight | 용도 |
|---|---|---|---|---|
| Page title | 22px | 30px | 700 | 페이지 제목("서비스 요청 분류 보드") |
| Page subtitle | 14px | 20px | 400 | 부제(muted) |
| Column heading | 14px | 20px | 700 | 컬럼 제목(P1~P4·미분류) |
| Column count | 12px | 16px | 600 | 컬럼별 카드 수 배지 |
| Card title | 14px | 20px | 600 | 요청 카드 제목 |
| Field label | 12px | 16px | 500 | 카드 내 폼 라벨(유형/영향도, muted) |
| Body | 13px | 18px | 400 | 다음 조치 요약 등 본문 |
| Type tag | 12px | 16px | 500 | 유형 태그 |
| Impact label | 12px | 16px | 500 | 영향도 라벨 |
| Priority badge | 13px | 16px | 700 | 카드 우선순위 배지(P1~P4) |
| Badge (pill) | 12px | 16px | 600 | 매트릭스 셀 pill |
| Caption | 12px | 16px | 500 | 목표 착수 시간 등 보조(muted) |

---

## 4. 레이아웃

### 4.1 섹션 구조 (단일 페이지, 위→아래)
```
┌───────────────────────────────────────────────────────────┐
│ header (title + subtitle)                                  │
├───────────────────────────────────────────────────────────┤
│ [보드 .board — 5 컬럼 가로 배치]                            │
│  ┌────────┬────────┬────────┬────────┬──────────┐          │
│  │  P1    │  P2    │  P3    │  P4    │  미분류   │          │
│  │ (count)│ (count)│ (count)│ (count)│ (count)  │          │
│  ├────────┼────────┼────────┼────────┼──────────┤          │
│  │ card   │ card   │ card   │ card   │ card     │          │
│  │ card   │        │ card   │        │ (dashed) │          │
│  └────────┴────────┴────────┴────────┴──────────┘          │
├───────────────────────────────────────────────────────────┤
│ [요청 카드 상태 상세 — resolved/unclassified/error 시뮬]   │
├───────────────────────────────────────────────────────────┤
│ [참조: 우선순위 매트릭스 5×4 표]                            │
└───────────────────────────────────────────────────────────┘
```
- 페이지 컨테이너: `max-width: 1100px; margin: 0 auto; padding: 32px 16px;` (보드는 다컬럼이라 BF-1104 의 760px 보다 넓힘 — 전역 규격 위반이 아니라 페이지별 max-width 조정).
- 보드: `display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-3);`
- 컬럼 내부 카드 세로 간격: `--space-3`(12px). 컬럼 내부 padding: `--space-3`.

### 4.2 spacing / radius (전역 토큰 재사용)
- spacing: `--space-1:4 / -2:8 / -3:12 / -4:16 / -5:24 / -6:32`
- radius: `--radius-card:12 / --radius-item:10 / --radius-btn:8 / --radius-pill:999`

### 4.3 breakpoint 별 동작
| 폭 | 보드 컬럼 | 카드 내 축 컨트롤 |
|---|---|---|
| ≥ 960px (desktop) | 5 컬럼 가로 배치(`repeat(5, 1fr)`) | 유형/영향도 컨트롤 가로 정렬 |
| 640–959px (tablet) | 2~3 컬럼으로 wrap(`repeat(auto-fill, minmax(260px, 1fr))`), 컬럼 제목에 우선순위 표기 유지 | 세로 스택 |
| < 640px (mobile) | 1 컬럼 세로 스택, 컬럼을 아코디언처럼 순차 표시 | 세로 스택, 컨트롤 full-width |

- 보드가 좁아져도 각 컬럼 제목의 **우선순위 라벨·색상**은 유지되어 카드가 어느 우선순위인지 컬럼 헤더로 계속 식별된다(모바일에서 컬럼 위치 단서가 약해지므로 카드 자체 배지가 보조 단서).

---

## 5. 컴포넌트 명세

기존 demo 의 클래스/스타일을 재사용한다. 신규 컴포넌트는 **기존 패턴의 합성**으로만 정의한다.

### 5.1 보드 컬럼 (`.column`)
- 컨테이너: 기존 `.panel`(surface + border + radius-card) 패턴을 컬럼 규격으로 사용.
- 컬럼 헤더(`.column__head`): 우선순위 라벨 + 카드 수 배지. 헤더 좌측에 §2.1 색상의 **4px accent 바(top border 또는 left border)** 로 우선순위 색을 표시.

| 항목 | 내용 |
|---|---|
| props | `priority`("P1"~"P4" \| "unclassified"), `label`, `cards`(카드 배열) |
| 헤더 | 우선순위 라벨(14px/700) + `.column__count` pill(카드 수) |
| accent | `.column--p1..p4` 는 §2.1 색상 top-accent, `.column--unclassified` 는 dashed 보더 + 중립 톤 |
| 빈 컬럼 | "이 우선순위의 요청 없음" placeholder(muted, dashed) |

### 5.2 요청 카드 (`.request-card`)
- 컨테이너: `.panel` 축소판(padding `--space-3`, radius `--radius-item`).
- 구성(위→아래): 유형 태그 + 카드 제목 → 축 선택 컨트롤(유형/영향도) → (resolved 시) 우선순위 배지 + 영향도 미터 + 다음 조치 요약.

| 항목 | 내용 |
|---|---|
| props | `id`, `title`, `selectedType`(RequestType\|null), `selectedImpact`(Impact\|null), `result`(PriorityResult\|null), `state`("resolved"\|"unclassified"\|"error") |
| resolved | 상단에 `.type-tag`(글리프+라벨) + `.impact-meter`(4세그) + `.priority-badge--p*` + `.next-action-mini` 요약 |
| unclassified | 축 선택 컨트롤 노출 + `.hint` "두 축을 모두 선택하세요"; 우선순위 배지 미표시; dashed 보더 |
| error | `.priority-badge--error` + `.hint--warn`; 다음 조치 숨김; 미분류 컬럼에 잔류 |

### 5.3 유형 선택 + 태그 (`.type-select` / `.type-tag`)
- 입력: 카드 내 `<select class="type-select">`(5 옵션: 장애/보안/버그/변경요청/문의) — 컴팩트 폼 컨트롤(semantic).
- 표시: 선택 결과를 `.type-tag`(outline 태그)로 카드 상단에 렌더. 글리프(§2.2) + 라벨.

| 항목 | 내용 |
|---|---|
| props | `value`(유형 코드), `onChange(code)` |
| 태그 스타일 | `border:1px var(--color-border); background:var(--color-surface); color:var(--color-text); border-radius:var(--radius-pill); padding:2px var(--space-3); font-size:12px;` |
| 상태 | 기본 / `:hover`(select) / `:focus-visible`(box-shadow primary-soft) |
| 접근성 | `<select>` 에 `aria-label="유형"`; 태그는 장식이 아니라 텍스트 라벨 포함 |

### 5.4 영향도 선택 + 강도 미터 (`.impact-select` / `.impact-meter`)
- 입력: 카드 내 `<select class="impact-select">`(4 옵션: Critical/High/Medium/Low) — 서열 순으로 정렬.
- 표시: 선택 결과를 `.impact-meter`(4-세그먼트 바)로 렌더. 채워진 칸 수 = 서열(Critical 4 / High 3 / Medium 2 / Low 1) + 라벨.

| 항목 | 내용 |
|---|---|
| props | `value`(영향도 코드), `onChange(code)` |
| 미터 구조 | `.impact-meter { display:inline-flex; gap:2px; }` 안에 4개 `.impact-seg`; 채움 `.impact-seg--on { background:var(--color-text); }`, 빈칸 `background:var(--color-border);` |
| 매핑 | `critical`→4칸, `high`→3칸, `medium`→2칸, `low`→1칸 |
| 접근성 | `<select>` 에 `aria-label="영향도"`; 미터는 `aria-hidden` + 옆에 텍스트 라벨(예: "High") 병기 |

### 5.5 우선순위 배지 (`.priority-badge`) — BF-1104 재사용
- §2.1 토큰 매핑에 따라 P1~P4 별 배경/텍스트 색 상이. 카드에서는 컴팩트 크기(13px/700).

```
.priority-badge { display:inline-flex; align-items:center; gap:var(--space-1);
  border-radius:var(--radius-pill); padding:2px var(--space-3); font-size:13px; font-weight:700; }
.priority-badge--p1 { background:var(--color-warning-soft); color:var(--color-warning); }
.priority-badge--p2 { background:var(--color-primary-soft); color:var(--color-primary); }
.priority-badge--p3 { background:var(--color-success-soft); color:var(--color-success); }
.priority-badge--p4 { background:var(--color-pending-soft); color:var(--color-text-muted); }
.priority-badge--error { background:var(--color-warning-soft); color:var(--color-warning); }
```

### 5.6 다음 조치 요약 (`.next-action-mini`)
- 보드 카드는 공간이 좁으므로 BF-1104 의 `.next-action`(border-left accent) 를 **1~2줄 요약형**으로 축약. 우선순위 색 border-left(4px) 로 배지와 연결.

| 항목 | 내용 |
|---|---|
| props | `nextAction`(기획 §3.1 텍스트, 재해석 금지), `targetTime`, `priority` |
| 구조 | `border-left:4px solid <priority-color>; background:<priority-soft>; padding:var(--space-2) var(--space-3); border-radius:var(--radius-btn);` |
| 내용 | 다음 조치 본문(13px, 요약) + 목표 착수 시간 caption(muted) |
| 다음 조치 텍스트(기획 §3.1, 재해석 금지) | P1: "즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 책임자 에스컬레이션" / 15분 이내 · P2: "당일 내 담당자 배정 및 착수, 2시간 주기 업데이트" / 4시간 이내 · P3: "익영업일 이내 착수, 정기 업데이트" / 1영업일 이내 · P4: "백로그 등록, 다음 스프린트 재검토" / 스프린트 계획 반영 |

### 5.7 참조 매트릭스 표 (`.matrix`) — BF-1104 재사용, 5×4 로 확장
- 기획 §3 의 5×4 매트릭스를 읽기 전용 표로 표시(사용자 이해 보조).
- 행: 유형 5종(장애/보안/버그/변경요청/문의), 열: 영향도 4단계(Critical/High/Medium/Low).
- 셀 값(P1~P4)은 `.badge-pill`(12px/600) 소형 배지로 표기하여 색상 일관성 유지.
- 현재 선택된 조합의 셀은 `outline:2px solid var(--color-primary)` 하이라이트.

### 5.8 상태별 안내 (`.hint`) — BF-1104 재사용
- unclassified: `.hint` "두 축을 모두 선택하세요." (muted)
- error: `.hint--warn` "정의되지 않은 유형/등급입니다. 계산을 수행하지 않습니다." (warning 톤)

---

## 6. dev 구현 가이드 (BF-1123 developer)

> **저장소 규약 우선(§8.1)**: 요청 마커는 `typescript-monorepo` 이나 실제 관측 규약은 **vanilla-static / npm / esm / static serve root `.`** 이다. developer 는 관측 규약을 따른다(단일 `index.html` + 인라인 `<style>` + esm `<script type="module">`). shadcn/design-tokens.json 은 이 저장소에 적용되지 않는다. requested_route 는 `/demo/service-request-triage`, expected_entry_path 는 `demo/service-request-triage/index.html`.

1. 엔트리: `demo/service-request-triage/index.html` 신규 생성(기획 §5, route-mapping = root-relative-static). 본 시안·mockup 은 엔트리 파일을 생성하지 않는다(§8.1 — designer owned_paths 밖).
2. `:root` 에 §2 전역 토큰을 **그대로 복사**(기존 demo·BF-1104 와 동일 변수명·HEX). 신규 토큰/HEX 하드코딩 금지.
3. 순수 함수 `classifyServiceRequestPriority(type, impact)` 는 기획 §6 계약을 그대로 구현(5×4 상수 룩업, 근사/가중치 합산 로직 금지 — 기획 §6 명시).
4. 보드 그룹핑은 기획 §7.2 파생 상태 규칙 그대로: `result` non-null → `result.priority` 컬럼, `selectedType`/`selectedImpact` 중 하나라도 null → `미분류` 컬럼. 드래그앤드롭·수동 이동 없음(기획 §8 non-goal).
5. 권장 클래스명(mockup 과 일치): `.board`, `.column`(+`--p1..p4`,`--unclassified`), `.column__head`, `.column__count`, `.request-card`, `.type-select`, `.type-tag`, `.impact-select`, `.impact-meter`(+`.impact-seg`,`--on`), `.priority-badge`(+`--p1..p4`,`--error`), `.next-action-mini`, `.matrix`, `.badge-pill`, `.hint`(+`--warn`).
6. 유형/영향도는 **서로 다른 축**으로 인코딩(§2.2): 유형=범주형 아이콘/라벨 태그(색으로 서열 암시 금지), 영향도=4세그 강도 미터(서열). 우선순위에만 시맨틱 컬러 배지.
7. 두 축 미선택 시 우선순위 계산 금지 + "두 축을 모두 선택하세요" + 미분류 컬럼 배치(기획 §4). 축 변경 시 매번 §6 순수 함수 재계산(무상태 — 이전 결과/히스토리 유지 금지, 기획 §4).
8. 정의되지 않은 유형/영향도 유입 시 `.priority-badge--error` + 계산 거부(폴백 추정 금지, 기획 §4). 미분류 컬럼에 잔류.
9. 접근성: `<select>` 에 `aria-label`; 강도 미터·글리프는 `aria-hidden` + 텍스트 라벨 병기(§5.3~5.4). 컬럼 카드 수는 스크린리더가 읽도록 텍스트.
10. mockup 은 픽셀 단위 일치 의무 없음 — 토큰·클래스·상태 구조·축 인코딩을 참조 가이드로 사용.
11. 검증: `node --test demo/service-request-triage/tests/*.test.js` (엔트리 구현 이후 유효, SUCCESS_CRITERIA 권위 명령). 매트릭스 20조합 + 엣지 케이스는 tester(BF-1125) 전수 커버.

---

## 7. mockup 참조

- 경로: `docs/design/mockups/service-request-triage-BF-1122.html` (system 자동 screenshot capture 대상 경로)
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, 시스템 폰트).
- §2 토큰·§2.2 축 인코딩·§4 레이아웃(5컬럼 보드)·§5 컴포넌트·카드 상태(resolved/unclassified/error)를 정적으로 시각화. 인터랙션 상태(hover/selected/focus)는 별도 섹션에 정적 렌더.
- placeholder 콘텐츠(샘플 요청 제목)로 UX 의도 전달. dev 의 실제 산출물이 아니며 시안 시각화 전용.

---

## 8. 부록

### 8.1 저장소 규약 불일치 플래그 (developer 전달)
- `requested_stack: typescript-monorepo` vs `observed_stack: vanilla-static` — **불일치**. 명령/구현은 관측 규약 우선(npm/esm/root-relative-static, serve root `.`).
- `expected_entry_path: demo/service-request-triage/index.html` 는 본 designer task owned_paths(`docs/design/**`) 밖 → 본 시안은 엔트리 파일을 생성하지 않는다(명세 + mockup 만). developer(BF-1123)가 신규 생성.
- 검증 명령 `node --test demo/service-request-triage/tests/*.test.js` 는 엔트리·테스트 구현 이후에만 유효. `full_verify_command` 는 신규 route 전체 authority 명령이 저장소에 없어 미제공 — developer/tester 는 focused 명령만 authority 로 사용.
- `e2e: unavailable` — 배정 e2e Skill 없음. tester 는 단위/통합 수준(20조합 + 엣지)에 집중.

### 8.2 보존 영역
- 기존 demo 라우트/공용 컴포넌트/전역 토큰 정의를 변경하지 않는다. 본 라우트는 전역 토큰을 **참조(복사 사용)** 만 한다.
- 동일 도메인 선례 BF-1104(`request-priority`)의 우선순위 색상 매핑을 그대로 계승하여 두 데모 간 시각 일관성을 유지한다.

---

## 9. Self-critique (PR commit 직전 자기 점검)

| 체크 항목 | 결과 |
|---|---|
| **AC 매핑** | AC1(유형/영향도 축 + 우선순위 시각 정의) → §2.2 축 인코딩·§5.3~5.6·mockup 보드. AC2(배정 Skill 명시 호출 + 적용 근거) → §0.1 fail-honest 기록(4회 시도 + provisioning 불일치 결론). AC3(디자인 토큰 정합성) → §2 전역 토큰 재사용, 신규 토큰 0건, BF-1104 매핑 계승. |
| **dev 구현 가이드** | §6 에 엔트리 경로·클래스명·순수 함수·상태 전이·접근성·검증 명령 단계별 명시. |
| **기존 요소 보존** | §8.2 보존 영역 명시. 전역 토큰/공용 컴포넌트 변경 없음. 신규 라우트 addition 만. |
| **컴포넌트 매핑** | 기획 §7.1 `ServiceRequestCard`·§7.2 컬럼 그룹핑 → §5.1~5.2 컴포넌트 1:1 대응. 매트릭스 20조합 §5.7 표. |
| **모호함 flag** | (1) P1=red 기대 vs red 토큰 부재(§2.1) — dev 임의 추가 금지. (2) 유형 글리프는 시각 보조, 텍스트 라벨 필수(§2.2). (3) `frontend-design` Skill provisioning 불일치(§0.1) — 운영자 확인 필요. |
