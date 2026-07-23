# 릴리스 노트 요약 보드 UI 디자인 명세 (BF-1086)

- 대상 모듈: `release-notes` — 릴리스 요약 카드 생성/검증 폼 + 요약 보드(목록·필터·KPI) 조회 화면 시안
- 기획 근거: `docs/planning/release-notes-BF-1085.md`
- 형제 Task: BF-1085(planner, 기획), BF-1087(developer, 구현), BF-1089(tester, 검증)
- mockup 참조: `docs/design/mockups/summary-board-BF-1086.html`
- 본 문서는 **디자인 명세만** 다룬다. 실제 앱 코드/라우팅은 BF-1087(developer)이 저장소 실제 규약에 맞춰 구현한다.

> **기술 스택 가정(명시)**: 요청 설명에는 `typescript-monorepo` 마커가 있으나 저장소 관측 규약(`base_sha` 기준)은 **vanilla-static**(npm, ESM, 정적 서빙 root `.`)이며 불일치한다. 본 시안은 프레임워크를 규정하지 않고 **기존 공용 중립 토큰 셋만** 사용해 컬러/타이포/레이아웃/컴포넌트를 정의한다. 신규 패키지·외부 CDN·외부 폰트 로드는 **0건**이며, 모든 토큰은 mockup `:root` 에서 직접 정의한다(vanilla-static 규약, 별도 design-tokens 파일 수정 없음).

---

## 1. 시안 개요

### 1.1 변경 범위

릴리스 담당자/운영자가 사용하는 **요약 보드 단일 화면**의 시안을 정의한다. 아래 6개 UI 영역을 다룬다.

| 영역 | 역할 | 기획 근거 |
|---|---|---|
| KPI 요약 바 | 총 건수·중요도 분포·영향도 분포·breaking 비율·긴급 대응 건수·최근 24h 추이 | 기획 §6, AC-5 |
| 등록/검증 폼 | 제목·변경 항목·중요도·사용자 영향도 입력 → 생성 또는 사전 검증 | 기획 §2-1·§2-3, AC-1/AC-2/AC-3 |
| 필터 바 | 중요도 × 사용자 영향도 2축 필터(AND) | 기획 §5.3, AC-5 |
| 요약 카드 | 요약 카드 레코드 + 중요도/영향도 시각 구분 | 기획 §3, AC-4 |
| 폼 에러/검증 안내 상태 | 빈 입력·잘못된 중요도·검증 전용 결과 안내 | 기획 §4·§7, AC-2/AC-3 |
| 빈 상태 | 데이터 0건 / 필터 결과 0건 | 기획 §7, AC-5 |

### 1.2 사용자 경험 목표

- **두 축을 한눈에 구분**: `importance`(내부 우선순위)와 `userImpact`(사용자 체감)는 서로 독립적인 축이므로(기획 §3.2), **서로 다른 시각 언어**(형태·위치)로 인코딩해 색이 겹쳐도 혼동하지 않게 한다.
- **긴급도 즉시 인지**: 카드 좌측 accent 보더로 중요도를, 메타 행 아웃라인 칩으로 영향도를 표시해 스캔 시 우선순위 신호를 먼저 포착.
- **안전한 실패**: 빈 입력·잘못된 enum·필터 0건·데이터 0건에서도 화면이 비어 보이지 않고 어떤 필드가 왜 실패했는지 명확히 안내(기획 §4는 실패 필드를 한 번에 모두 반환).
- **부작용 없는 사전 점검**: 검증 전용 흐름(§5.2)을 폼에서 별도 액션으로 노출하되, 저장 흐름과 시각적으로 구분.
- **의존성 0**: 외부 CDN/폰트/패키지 없이 file:// 로 열어도 렌더.

---

## 2. 컬러 팔레트

기존 brix-flow-test 공용 중립 토큰 셋만 사용한다(직전 board 산출물 `feedback-board-BF-1072` 와 동일 기반). **신규 색상 팔레트 도입 없음** — 4단계 severity 표현을 위해 기존 semantic 토큰(pending/primary/warning/danger/info)을 그대로 매핑한다.

### 2.1 기본 팔레트

| 역할 | 토큰 변수 | HEX | 용도 |
|---|---|---|---|
| primary | `--color-primary` | `#2563EB` | 주요 버튼(생성), 강조 수치, medium 신호 |
| primary hover | `--color-primary-hover` | `#1D4ED8` | 주요 버튼 hover |
| primary soft | `--color-primary-soft` | `#EAF1FE` | medium 배지 배경 |
| background | `--color-bg` | `#F7F8FA` | 페이지 배경 |
| surface | `--color-surface` | `#FFFFFF` | 카드·폼·바 표면 |
| border | `--color-border` | `#E2E5EA` | 구분선·입력 테두리·트랙 |
| text | `--color-text` | `#1F2430` | 본문 텍스트 |
| text muted | `--color-text-muted` | `#6B7280` | 보조 텍스트·캡션·라벨 |

### 2.2 severity semantic 토큰 (중요도·영향도 공유)

두 축은 각각 4단계이며, 아래 5개 semantic 토큰을 severity 사다리에 매핑해 사용한다. 모두 mockup `:root` 에 직접 정의(외부 의존성 없음).

| semantic | 텍스트/보더 토큰 | 배경 soft 토큰 | HEX(text / soft) |
|---|---|---|---|
| neutral | `--color-pending` | `--color-pending-soft` | `#6B7280` / `#F3F4F6` |
| info | `--color-info` | `--color-info-soft` | `#0E7490` / `#E0F2FE` |
| brand | `--color-primary` | `--color-primary-soft` | `#2563EB` / `#EAF1FE` |
| warning | `--color-warning` | `--color-warning-soft` | `#D97706` / `#FEF3E2` |
| danger | `--color-danger` | `--color-danger-soft` | `#DC2626` / `#FEE2E2` |

> `--color-info`(`#0E7490`) / `--color-info-soft`(`#E0F2FE`) / `--color-danger`(`#DC2626`) / `--color-danger-soft`(`#FEE2E2`) 는 feedback-board 토큰셋 대비 신규 **정의**이나, 별도 패키지·CDN이 아니라 mockup `:root` CSS 변수로 직접 선언한다(vanilla-static 규약, AC-3의 "신규 패키지·외부 의존성 없음" 충족). design-tokens 파일 직접 수정은 하지 않는다.

### 2.3 두 축의 시각 인코딩 원칙 (핵심)

`importance` 와 `userImpact` 는 독립 축(기획 §3.2)이므로 **색만으로 구분하지 않고 형태·위치를 달리한다**.

| 축 | 시각 언어 | 위치 | 형태 |
|---|---|---|---|
| `importance` (중요도) | **카드 좌측 accent 보더(4px)** + **채움(solid) 배지** | 카드 좌측 edge + 카드 헤더 우측 | 채워진 pill, 좌측 dot |
| `userImpact` (사용자 영향도) | **아웃라인 칩 + 선행 glyph** | 카드 메타 행 | 배경 soft + border 실선, 라벨 앞 기호 |

- 색이 같은 단계(예: `importance=critical` 와 `userImpact=breaking` 둘 다 danger 계열)라도 **채움 배지 vs 아웃라인 칩** + **좌측 보더 vs 메타 칩** 위치 차이로 즉시 구분된다.
- 색약 대응: 각 배지/칩은 색상 외 **텍스트 라벨과 단계 기호**를 항상 병기(§7.4).

---

## 3. 타이포그래피

system font stack 만 사용(외부 폰트 로드 없음).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | line-height | weight | 색상 | 용도 |
|---|---|---|---|---|---|
| page title | 22px | 30px | 700 | text | 화면 제목 "릴리스 요약 보드" |
| section heading | 15px | 22px | 600 | text | 폼/목록/필터 섹션 제목 |
| KPI value | 24px | 30px | 700 | text (강조 시 semantic) | KPI 수치 |
| KPI label | 12px | 16px | 500 | text-muted | KPI 라벨 |
| card title | 15px | 22px | 600 | text | 릴리스 제목 |
| body | 14px | 20px | 400 | text | 변경 항목·폼 입력 |
| caption / meta | 12px | 16px | 400 | text-muted | 생성일·건수 |
| badge / chip | 12px | 16px | 600 | semantic | 중요도 배지·영향도 칩 라벨 |
| button | 14px | 20px | 500 | 문맥별 | 액션 버튼 |
| error text | 12px | 16px | 500 | danger | 인라인 필드 에러 |

---

## 4. 레이아웃

### 4.1 섹션 구조 (세로 흐름)

```
┌─────────────────────────────────────────────┐
│ 헤더 (제목 + 설명)                             │
├─────────────────────────────────────────────┤
│ KPI 요약 바 (6개 stat 타일, 반응형 그리드)       │
├─────────────────────────────────────────────┤
│ 등록/검증 폼                                   │
│  제목 / 변경 항목(가변 리스트) / 중요도 / 영향도  │
│  [사전 검증]  [요약 카드 생성]                   │
│  └ 검증 결과 안내 영역(조건부)                   │
├─────────────────────────────────────────────┤
│ 필터 바 (중요도 세그먼트 · 영향도 세그먼트)       │
├─────────────────────────────────────────────┤
│ 요약 카드 목록  또는  빈 상태                    │
└─────────────────────────────────────────────┘
```

### 4.2 컨테이너 & spacing

- 최대 너비: `820px`, 중앙 정렬(`margin: 0 auto`), 좌우 패딩 `var(--space-4)`.
- spacing scale(기존 토큰 재사용):

```css
--space-1: 4px; --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
```

- 섹션 간 세로 간격: `var(--space-5)`. 카드 내부 패딩: `var(--space-4)`.
- radius: `--radius-card: 12px`, `--radius-item: 10px`, `--radius-btn: 8px`, `--radius-pill: 999px`.

### 4.3 breakpoint 별 동작

| 구간 | KPI 그리드 | 폼 | 필터 세그먼트 |
|---|---|---|---|
| ≥ 640px | 3열 × 2행 (`repeat(3, 1fr)`) | 중요도·영향도 select 2열, 제목·변경 항목 전체폭 | 두 세그먼트 가로 배치 |
| < 640px | 2열 (`repeat(2, 1fr)`) | 모든 필드 세로 stack | 세그먼트 세로 stack, 가로 스크롤 허용 |

- 미디어쿼리 1개(`@media (max-width: 640px)`)로 처리. CSS Grid `auto-fit`/`minmax` 로 유연 대응.

---

## 5. 중요도 · 사용자 영향도 시각 구분 규칙 (AC 매핑 표)

> 기획 §3.2 — 두 필드는 **독립 축**이며 한쪽이 다른 쪽을 함의하지 않는다. 아래 표가 본 시안의 **핵심 산출물**(AC-1 대응)이다.

### 5.1 `importance` (중요도) — 카드 좌측 accent 보더 + 채움 배지

| enum 값 | 라벨(표시) | 단계 기호 | semantic 토큰 | text/border HEX | 배경 soft HEX | 좌측 보더 |
|---|---|---|---|---|---|---|
| `low` | 낮음 | ▁ | neutral | `#6B7280` | `#F3F4F6` | `#6B7280` 4px |
| `medium` | 보통 | ▃ | brand | `#2563EB` | `#EAF1FE` | `#2563EB` 4px |
| `high` | 높음 | ▅ | warning | `#D97706` | `#FEF3E2` | `#D97706` 4px |
| `critical` | 긴급 | ▇ | danger | `#DC2626` | `#FEE2E2` | `#DC2626` 4px |

- 배지 형태: **채움 pill** — 배경 = soft, 텍스트 = semantic text, 좌측 `●` 6px dot(semantic). 카드 헤더 우측 상단 배치.
- 카드 좌측 4px accent 보더 색 = 해당 중요도 semantic text 색. → 목록 스캔 시 긴급도 즉시 포착.
- `high`/`critical` 은 기획 §6 "긴급 대응 필요"(KPI) 대상 → 배지에 warning/danger 강조.

### 5.2 `userImpact` (사용자 영향도) — 메타 행 아웃라인 칩 + 선행 glyph

| enum 값 | 라벨(표시) | 선행 glyph | semantic 토큰 | text/border HEX | 배경 soft HEX |
|---|---|---|---|---|---|
| `none` | 영향 없음 | `○` | neutral | `#6B7280` | `#F3F4F6` |
| `minor` | 경미 | `◔` | info | `#0E7490` | `#E0F2FE` |
| `major` | 상당 | `◑` | warning | `#D97706` | `#FEF3E2` |
| `breaking` | 호환성 깨짐 | `⚠` | danger | `#DC2626` | `#FEE2E2` |

- 칩 형태: **아웃라인 칩** — 배경 = soft, `1px` semantic border 실선, 텍스트 = semantic text, 선행 glyph. 카드 메타 행(생성일 옆) 배치.
- `breaking` 은 기획 §6 "Breaking 영향 비율" KPI 대상 → `⚠` glyph + danger 로 최상위 경보 표현.

### 5.3 독립성 시각 검증 (기획 §3.2 예시 → 시안 표현)

| 조합 예시 | 카드 표현 | 검증 포인트 |
|---|---|---|
| `importance=critical`, `userImpact=none` | 좌측 red 보더 + "긴급" 채움 배지 + `○ 영향 없음` 회색 아웃라인 칩 | 내부 긴급하나 사용자 무영향이 시각적으로 모순 없이 공존 |
| `importance=low`, `userImpact=breaking` | 좌측 gray 보더 + "낮음" 회색 배지 + `⚠ 호환성 깨짐` red 아웃라인 칩 | 우선순위 낮아도 사용자 영향 최상위가 각각 독립 표현 |

- 두 축이 서로 다른 형태(채움 배지 vs 아웃라인 칩)·위치(헤더 vs 메타)를 쓰므로, **색이 겹쳐도** 어느 축인지 혼동 없음.

---

## 6. 컴포넌트 명세

props 는 developer 가 렌더 함수 시그니처로 사용할 수 있도록 명시. 상태/인터랙션 포함.

### 6.1 KPI 요약 바 (`.kpi-bar`)

- **props**: `total`, `importanceDist:{low,medium,high,critical}`(각 `{count, ratio}`), `userImpactDist:{none,minor,major,breaking}`, `breakingRatio`(문자열 예 `"12.5%"`), `urgentCount`(high+critical 건수), `recent24hCount`.
- **구성 타일(6종, 기획 §6)**: ① 총 카드 건수 ② 긴급 대응 필요(high+critical) ③ Breaking 비율 ④ 중요도 분포(미니 4구간 막대) ⑤ 영향도 분포(미니 4구간 막대) ⑥ 최근 24h 등록.
- 각 타일: `KPI value`(24px/700) + `KPI label`(12px/500 muted). ② 값은 `--color-warning`, ③ 값은 `--color-danger` 로 강조. 분포 타일(④⑤)은 값 대신 4구간 stacked bar(각 구간 semantic 색) + 건수 캡션.
- **상태**: 데이터 0건 → 총 건수 `0`, 모든 비율 `0%`, 분포 막대 빈 트랙, 최근 24h `0`(기획 §6 0-division 방지, AC-5).
- **인터랙션**: 정적 표시(클릭 없음). 데이터 변경 시 developer 재계산·리렌더.

### 6.2 등록/검증 폼 (`.summary-form`)

- **props(입력 필드)**:

  | 필드 | 타입 | 제약(기획 §3.1·§4) | placeholder |
  |---|---|---|---|
  | `title` | text input | trim 후 1~200자, 필수 | "릴리스 제목을 입력하세요" |
  | `changes` | 가변 리스트(text input 행 + 추가/삭제) | 1~50개, 각 trim 후 1~300자, 필수 | "변경 항목을 입력하세요" |
  | `importance` | select | `low`/`medium`/`high`/`critical`, 필수 | "중요도 선택"(placeholder option, value 없음) |
  | `userImpact` | select | `none`/`minor`/`major`/`breaking`, 필수 | "사용자 영향도 선택"(placeholder option, value 없음) |

- **버튼 2종**:
  - `사전 검증`(secondary, 아웃라인) → `POST /release-notes/validate` 호출, **저장 없음**(기획 §5.2). 결과를 폼 하단 검증 안내 영역에 표시.
  - `요약 카드 생성`(primary) → `POST /release-notes` 호출, 성공 시 카드 추가.
- **changes 가변 리스트(`.changes-list`)**: 각 행 = text input + `삭제`(×) 버튼. 하단 `+ 항목 추가` 버튼. 최소 1행 유지(마지막 1행은 삭제 버튼 비활성 또는 미노출). 50개 도달 시 추가 버튼 비활성.
- **상태**:
  - default: 입력 대기.
  - **error(AC-2, 기획 §4)**: 실패한 **모든 필드를 한 번에** 표기(첫 오류만 보여주고 감추지 않음). 각 필드 하단 `error text`(danger) 인라인 메시지 + 입력 테두리 danger. §7 참조. 저장소 미반영.
  - **validate 결과(AC-3)**: 폼 하단 검증 안내 영역에 `valid:true` → success 배너("검증 통과, 저장되지 않았습니다") / `valid:false` → danger 리스트(필드별 사유). **어느 경우도 카드·KPI 불변**(기획 §5.2·§9).
  - success(생성): 폼 초기화(changes 1행으로), 목록 갱신, KPI 재계산.
- **인터랙션**: 버튼별 해당 라우트 호출 → 검증 → 결과 표시. 포커스 이동은 developer 재량.

### 6.3 요약 카드 (`.summary-card`)

- **props**: `id`, `title`, `changes:string[]`, `importance`, `userImpact`, `createdAt`(표시용 `YYYY-MM-DD HH:mm`).
- **레이아웃**:
  - 좌측 4px accent 보더 = `importance` semantic 색(§5.1).
  - 헤더 행 = `card title`(좌) + `importance 채움 배지`(우).
  - 본문 = `changes` 리스트(최대 3개 표시 후 "+N개 더" 캡션 권장, `<ul>`).
  - 메타 행 = `userImpact 아웃라인 칩`(좌) + `생성일`(우, muted).
- **정렬**: 기획 §5.3 — 목록은 생성 순서(오래된 순) 배열. (KPI/필터는 정렬에 영향 없음.)
- **상태**: 조회 전용(수정/삭제 없음, 기획 §12 Non-goals). 정적.
- **인터랙션**: 비인터랙티브(hover 시 카드 그림자 미세 상승 정도만, 선택).

### 6.4 중요도 배지 (`.imp-badge`) / 영향도 칩 (`.impact-chip`)

- **imp-badge props**: `importance`. §5.1 매핑. 채움 pill + 좌측 dot + 라벨 + 단계 기호.
- **impact-chip props**: `userImpact`. §5.2 매핑. 아웃라인 칩 + 선행 glyph + 라벨.
- 둘 다 색상 외 **텍스트 라벨 항상 표기**(색약 대응, §7.4).

### 6.5 필터 바 (`.filter-bar`)

- **props**: `importanceFilter`(`all`/enum4, 기본 `all`), `userImpactFilter`(`all`/enum4, 기본 `all`).
- **구성**: 중요도 세그먼트(`전체`/`낮음`/`보통`/`높음`/`긴급`) + 영향도 세그먼트(`전체`/`영향 없음`/`경미`/`상당`/`호환성 깨짐`). 선택 항목 = 해당 semantic soft 채움 + border 강조, 비선택 = surface + border.
- **상태**: 두 필터 AND 결합(기획 §5.3). 세션 UI 상태(영속화 안 함).
- **인터랙션**: 변경 시 목록 즉시 재필터. 결과 0건이면 `.empty-state--no-match`.

### 6.6 빈 상태 (`.empty-state`)

- **props**: `variant`(`no-data` | `no-match`).
- **형태**: surface 카드 안 중앙 정렬, 이모지/아이콘 + 제목 + 보조 문구(muted).

  | variant | 조건 | 제목 | 보조 문구 |
  |---|---|---|---|
  | `no-data` | 등록 카드 0건(기획 §7·§10 초기 상태) | "아직 생성된 요약 카드가 없습니다" | "위 폼에서 첫 릴리스 요약을 생성해 보세요." |
  | `no-match` | 필터 결과 0건(AC-5, 기획 §5.3) | "조건에 맞는 요약 카드가 없습니다" | "필터를 변경하면 다른 결과를 볼 수 있어요." |

### 6.7 폼 검증 안내 영역 (`.validate-result`) — 조건부

- **props**: `mode`(`create-error` | `validate-pass` | `validate-fail`), `errors:[{field, reason}]`.
- **형태**:
  - `validate-pass`: success 계열 배너(`--color-success-soft` 배경 + 좌측 4px `--color-success` 보더 + ✓) "검증 통과 — 저장되지 않았습니다(사전 점검)".
  - `validate-fail` / `create-error`: danger 계열 배너(`--color-danger-soft` + 좌측 4px `--color-danger` + ⚠) + 실패 필드 목록 `<ul>`(필드명 + 사유). 기획 §4 "모든 실패 필드 한 번에".
- **인터랙션**: 폼 재제출 시 갱신. validate 결과는 저장/KPI에 영향 없음(기획 §9).

---

## 7. 에러 / 안내 UI 상태 시각화 (AC-2 대응)

기획 §4·§7 의 검증 실패를 화면에서 어떻게 안내하는지 정의한다. mockup 에 정적 시각화한다.

### 7.1 빈 입력 안내

| 실패 조건(기획 §4) | 인라인 메시지(필드 하단, danger) | 시각 |
|---|---|---|
| `title` 누락/공백만 | "릴리스 제목을 입력하세요." | title 입력 테두리 danger |
| `title` 200자 초과 | "제목은 200자 이하여야 합니다. (현재 N자)" | 동일 |
| `changes` 빈 배열/전 항목 공백 | "변경 항목을 1개 이상 입력하세요." | 리스트 영역 하단 danger |
| `changes` 특정 항목 공백/300자 초과 | "N번째 항목을 확인하세요.(공백 불가 · 300자 이하)" | 해당 행 테두리 danger |

### 7.2 잘못된 중요도/영향도 안내

| 실패 조건(기획 §4) | 인라인 메시지 | 시각 |
|---|---|---|
| `importance` 미선택 | "중요도를 선택하세요." | select 테두리 danger |
| `importance` 허용 enum 외 | "중요도는 낮음·보통·높음·긴급 중 하나여야 합니다." | select 테두리 danger + 허용값 병기 |
| `userImpact` 미선택 | "사용자 영향도를 선택하세요." | select 테두리 danger |
| `userImpact` 허용 enum 외 | "사용자 영향도는 영향 없음·경미·상당·호환성 깨짐 중 하나여야 합니다." | 동일 |

- **다중 실패 동시 표기**: 기획 §4 — 여러 필드가 동시에 실패하면 **모두 한 번에** 표시(첫 오류만 보이고 나머지를 감추지 않음). 폼 상단 `.validate-result` danger 배너에 실패 필드 요약 + 각 필드 인라인 메시지 병행.

### 7.3 검증 전용(사전 점검) 안내

- `사전 검증` 버튼 → 결과와 무관하게 **항상 안내 배너만** 표시하고 목록/KPI 불변(기획 §5.2·§9, AC-3).
- pass: success 배너 "검증 통과 — 저장되지 않았습니다".
- fail: danger 배너 + 필드별 사유 리스트(생성 에러와 동일 시각, 단 "저장되지 않았습니다" 문구로 무부작용 강조).

### 7.4 접근성(색약) 대응

- 배지/칩은 색상 외 **텍스트 라벨 + 단계 기호/glyph** 항상 병기(§5.1·§5.2).
- 에러 상태는 색만이 아니라 **인라인 텍스트 메시지 + ⚠ 기호**로 중복 신호.
- 필터 세그먼트는 `aria-pressed`, 폼 필드는 `<label for>`, 에러는 `aria-describedby` 권장.

---

## 8. dev 구현 가이드 (BF-1087 developer)

mockup(`docs/design/mockups/summary-board-BF-1086.html`)을 시각 참조로 사용하되 픽셀 일치 의무는 없음. 아래 CSS 변수·클래스 네이밍을 권장한다. 기획 §5의 요청/응답 계약·§4 검증 규칙을 UI와 연결할 것.

### 8.1 CSS 변수 (`:root` 에 그대로 정의 — 외부 의존성 0)

```css
:root {
  --color-primary: #2563EB; --color-primary-hover: #1D4ED8; --color-primary-soft: #EAF1FE;
  --color-bg: #F7F8FA; --color-surface: #FFFFFF; --color-border: #E2E5EA;
  --color-text: #1F2430; --color-text-muted: #6B7280;
  --color-pending: #6B7280; --color-pending-soft: #F3F4F6;
  --color-info: #0E7490;    --color-info-soft: #E0F2FE;
  --color-warning: #D97706; --color-warning-soft: #FEF3E2;
  --color-danger: #DC2626;  --color-danger-soft: #FEE2E2;
  --color-success: #16A34A; --color-success-soft: #ECFDF3;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --radius-card: 12px; --radius-item: 10px; --radius-btn: 8px; --radius-pill: 999px;
}
```

### 8.2 클래스 네이밍(BEM 권장)

| 컴포넌트 | 루트 클래스 | 주요 하위 |
|---|---|---|
| KPI 바 | `.kpi-bar` | `.kpi-tile`, `.kpi-tile__value`, `.kpi-tile__label`, `.kpi-tile__bar`, `.kpi-tile__seg--{sev}` |
| 등록/검증 폼 | `.summary-form` | `.summary-form__field`, `.summary-form__error`, `.changes-list`, `.changes-list__row`, `.summary-form__validate`, `.summary-form__submit` |
| 검증 안내 | `.validate-result` | `.validate-result--pass`, `.validate-result--fail`, `.validate-result__item` |
| 필터 바 | `.filter-bar` | `.segmented`, `.segmented__btn`, `.segmented__btn--active` |
| 요약 카드 | `.summary-card` | `.summary-card--{importance}`(좌측 보더), `.summary-card__title`, `.summary-card__changes`, `.summary-card__meta` |
| 중요도 배지 | `.imp-badge` | `.imp-badge--low/medium/high/critical`, `.imp-badge__dot` |
| 영향도 칩 | `.impact-chip` | `.impact-chip--none/minor/major/breaking`, `.impact-chip__glyph` |
| 빈 상태 | `.empty-state` | `.empty-state--no-data`, `.empty-state--no-match` |

### 8.3 중요도/영향도 → semantic 매핑(의사코드)

```
importanceSeverity: low→neutral, medium→brand, high→warning, critical→danger
userImpactSeverity: none→neutral, minor→info, major→warning, breaking→danger
// 배지=채움 pill(헤더), 칩=아웃라인(메타). 좌측 보더 색=importance semantic.
```

### 8.4 필터/검증 연결 규칙

- 필터: 두 세그먼트 값 AND. `all` 이면 미적용(기획 §5.3). 결과 0건 → `.empty-state--no-match`(에러 아님).
- 생성(`POST /release-notes`) 400 응답 → 실패 필드 배열을 §7 인라인 + `.validate-result--fail` 로 매핑.
- 사전 검증(`POST /release-notes/validate`) → 항상 200, `{valid, errors?}` 를 `.validate-result` 로만 반영(목록/KPI 불변, 기획 §9).
- KPI: 전체 데이터 기준 재계산, 0건 시 비율 `0%`(0-division 방지, 기획 §6).

### 8.5 접근성 최소 요건

- 폼 각 필드 `<label for>` 연결, changes 각 행에도 라벨.
- 배지/칩 색상에만 의존 금지 — 라벨/기호 항상 표기.
- 버튼은 `<button>` 시맨틱, 필터 세그먼트 `aria-pressed`, 에러 `aria-describedby`.

---

## 9. mockup 참조

- 파일: `docs/design/mockups/summary-board-BF-1086.html`
- 단일 self-contained HTML(외부 의존성 0건, system font, 인라인 `<style>`). file:// 로 직접 열어 렌더 확인 가능.
- mockup 은 본 명세의 컬러/타이포/레이아웃/중요도 배지/영향도 칩/에러·검증 안내/빈 상태를 정적으로 시각화한다. `<section>` 구분으로 ① KPI 바 ② 폼(정상) ③ 폼(에러 상태) ④ 검증 통과/실패 안내 ⑤ 필터 바 ⑥ 요약 카드(4중요도 × 대표 영향도 + 독립성 예시 2종) ⑦ 빈 상태 2종을 모두 포함한다. placeholder 콘텐츠 사용.

---

## 10. Self-critique (dev 인계 전 자체 점검)

| 점검 항목 | 결과 |
|---|---|
| **AC 매핑** | 기획 AC-1~AC-6 및 본 task AC(중요도/영향도 시각 구분 표=§5 / 에러 안내 시각화=§7 / 기존 토큰만=§2·§8.1)를 각 섹션에 매핑 완료. |
| **dev 구현 가이드** | §8에 CSS 변수·BEM 클래스·semantic 매핑 의사코드·필터/검증 연결·a11y 요건 제공. |
| **기존 요소 보존** | 기획 §10 무변경 원칙 반영 — 신규 additive 화면만 정의, 기존 라우트/데이터 미변경. 공용 토큰 셋 재사용, design-tokens 파일 미수정. |
| **컴포넌트 매핑** | 기획 §6 KPI 6종·§5 라우트(생성/검증/목록/KPI)·§4 검증 규칙을 §6 컴포넌트 props로 1:1 매핑. |
| **모호함 flag** | ①스택 불일치(vanilla-static 관측) → 프레임워크 미규정, 토큰만 정의(§상단). ②`--color-info/danger` 는 기존 셋에 없어 mockup `:root` 로컬 정의(외부 의존성 아님, §2.2). ③changes 표시 개수(3개+"+N") 는 권장이며 dev 재량. ④최근 24h 윈도는 기획 §6 기준 구현 재량. |
