# 고객 피드백 펄스 서비스 디자인 명세 (BF-1080)

- 대상 모듈: `feedback-pulse` — 피드백 제출 폼(고객용) + 운영자 펄스 보드(조회/KPI)
- 기술 스택: vanilla-static (관측 규약 기준 — 외부 CDN·신규 패키지 0건, system font, CSS 변수 자체 정의)
  - 참고: 요청 설명에는 `nodejs-backend` 마커가 있으나 저장소 관측 규약(`base_sha`)은 `vanilla-static`이며 불일치한다. 본 시안은 **화면(UI) 표현**만 정의하며 백엔드 프레임워크는 규정하지 않는다. 실제 구현 형태는 BF-1081(developer)이 저장소 규약에 맞춰 결정한다.
- 기획 근거: `docs/planning/feedback-pulse-BF-1079.md`
- 형제 Task: BF-1079(planner), BF-1081(developer, 구현), BF-1083(tester, 검증)
- mockup 참조: `docs/design/mockups/feedback-pulse-BF-1080.html`
- 본 문서는 **디자인 명세만** 다룬다. 실제 앱 코드는 BF-1081(developer)이 구현한다.

---

## 1. 시안 개요

### 1.1 변경 범위

`feedback-pulse` 서비스의 두 화면 시안을 정의한다. 별도 DB 없이 프로세스 인메모리로 동작하는 경량 서비스(기획 §4)로, 아래 화면/영역을 다룬다.

| 화면 | 영역 | 역할 | 기획 근거 |
|---|---|---|---|
| 제출 폼 | 감정·긴급도·의견 입력 | 고객이 피드백 접수 | 기획 §2 시나리오1, §5.1, AC-1/AC-2 |
| 펄스 보드 | KPI 요약 바 | 총 건수·부정 비율·긴급 대응·펄스율 표시 | 기획 §6, §5.3, AC-4 |
| 펄스 보드 | 감정 분포 | positive/neutral/negative 건수·비율 | 기획 §6 |
| 펄스 보드 | 긴급도 분포 | low/medium/high/critical 건수·비율 | 기획 §6 |
| 펄스 보드 | 긴급 피드백 | high/critical 우선 대응 목록 | 기획 §6(긴급 대응 필요 건수) |
| 펄스 보드 | 최근 흐름 + 필터 바 | 접수 목록(감정·긴급도 AND 필터) | 기획 §2 시나리오2, §5.2, AC-3/AC-6 |
| 공통 | 인메모리 고지 배너 | "재시작 시 데이터 초기화" 상시 안내 | 기획 §4, AC-5 |
| 공통 | 빈/에러 상태 | 재시작 직후·데이터 0건·필터 0건·폼 유효성 에러 | 기획 §7, AC-2/AC-3/AC-5 |

### 1.2 사용자 경험 목표

- **접수는 빠르고 명확하게**: 감정/긴급도는 라디오형 선택(segmented)으로 한 번에 인지, 의견은 실시간 글자 수 카운터로 1~1000자 제약을 미리 안내(기획 §3.1).
- **보드는 한눈에 파악**: 상단 KPI → 감정/긴급도 분포 → 긴급 피드백 → 최근 흐름의 세로 흐름으로, 부정 감정·긴급 대응 신호를 스크롤 없이 즉시 인지.
- **색으로 신호 구분, 색에만 의존하지 않음**: 감정/긴급도를 색으로 구분하되 항상 텍스트 라벨을 병기하고, 색상 대비는 WCAG AA(4.5:1)를 충족(§9 접근성).
- **안전한 실패·빈 상태**: 재시작 직후(전부 0)·필터 0건·폼 유효성 실패에서도 화면이 비어 보이지 않고 무엇을 해야 하는지 안내.
- **초기화 전제 고지**: "이 데이터는 서버 재시작 시 초기화됩니다"를 보드 상단 배너로 상시 노출(기획 §4).
- **의존성 0**: file:// 로 직접 열어도 외부 호출 없이 렌더링.

---

## 2. 컬러 팔레트

기존 brix-flow-test 공용 중립 토큰(형제 `feedback-board-BF-1074.html`와 동일 계열)을 기반으로 하고, 본 브리프에 필요한 **부정(danger) 계열**과 **감정/긴급도 semantic 토큰**을 추가 정의한다. vanilla-static 규약상 토큰은 mockup `:root`에서 직접 정의하며 별도 design-tokens 파일은 수정하지 않는다.

### 2.1 기본 팔레트

| 역할 | 토큰 변수 | HEX | 용도 |
|---|---|---|---|
| primary | `--color-primary` | `#2563EB` | 주요 버튼, 강조 수치, 펄스율 |
| primary hover | `--color-primary-hover` | `#1D4ED8` | 주요 버튼 hover |
| primary soft | `--color-primary-soft` | `#EAF1FE` | 선택 배경·medium 긴급도 배경 |
| background | `--color-bg` | `#F7F8FA` | 페이지 배경 |
| surface | `--color-surface` | `#FFFFFF` | 카드·폼·바 표면 |
| border | `--color-border` | `#E2E5EA` | 구분선·입력 테두리·차트 트랙 |
| text | `--color-text` | `#1F2430` | 본문 텍스트 |
| text muted | `--color-text-muted` | `#5B6472` | 보조 텍스트·라벨(대비 강화, §9) |

> 형제 시안의 muted `#6B7280`(대비 4.83:1)보다 한 단계 어두운 `#5B6472`(대비 약 6.1:1)를 사용해 캡션/라벨의 접근성 여유를 확보한다.

### 2.2 감정(sentiment) semantic 토큰

색상만으로 의미를 전달하지 않도록 라벨을 항상 병기하며, **텍스트/보더는 -700 계열**을 사용해 soft 배경 위에서 WCAG AA(4.5:1)를 만족시킨다. dot/그래프 채움은 -600 계열(base)을 쓴다.

| sentiment | 라벨 | 텍스트/보더 토큰 | base(dot·bar) | soft 배경 | HEX(text / base / bg) | text-on-bg 대비 |
|---|---|---|---|---|---|---|
| `positive` | 긍정 | `--sent-pos-text` | `--sent-pos` | `--sent-pos-soft` | `#15803D` / `#16A34A` / `#ECFDF3` | 약 5.4:1 (AA) |
| `neutral` | 중립 | `--sent-neu-text` | `--sent-neu` | `--sent-neu-soft` | `#4B5563` / `#6B7280` / `#F3F4F6` | 약 7.0:1 (AAA) |
| `negative` | 부정 | `--sent-neg-text` | `--sent-neg` | `--sent-neg-soft` | `#B91C1C` / `#DC2626` / `#FEE2E2` | 약 5.9:1 (AA) |

### 2.3 긴급도(urgency) semantic 토큰

긴급도는 낮음→긴급으로 갈수록 채도/경고성이 올라가는 4단계. `critical`은 색 + 좌측 보더 강조로 시각적 우선순위를 이중 신호한다.

| urgency | 라벨 | 텍스트/보더 토큰 | base | soft 배경 | HEX(text / base / bg) | text-on-bg 대비 |
|---|---|---|---|---|---|---|
| `low` | 낮음 | `--urg-low-text` | `--urg-low` | `--urg-low-soft` | `#4B5563` / `#9CA3AF` / `#F3F4F6` | 약 7.0:1 (AAA) |
| `medium` | 보통 | `--urg-med-text` | `--urg-med` | `--urg-med-soft` | `#1D4ED8` / `#2563EB` / `#EAF1FE` | 약 6.0:1 (AA) |
| `high` | 높음 | `--urg-high-text` | `--urg-high` | `--urg-high-soft` | `#B45309` / `#D97706` / `#FEF3E2` | 약 5.9:1 (AA) |
| `critical` | 긴급 | `--urg-crit-text` | `--urg-crit` | `--urg-crit-soft` | `#B91C1C` / `#DC2626` / `#FEE2E2` | 약 5.9:1 (AA) |

> `high`/`critical`의 base 색(`#D97706`, `#DC2626`)은 white 위 대비가 각각 약 3.4:1, 4.0:1로 **본문 텍스트에는 부적합**하다. 따라서 텍스트에는 반드시 -700 토큰(`#B45309`, `#B91C1C`)을 사용하고, base 색은 dot·bar 채움·보더 등 **비텍스트 요소에만** 쓴다(§9 접근성 규칙).

### 2.4 상태/알림 색상

| 역할 | 토큰 | HEX | 용도 |
|---|---|---|---|
| notice(고지) | `--color-notice` / `--color-notice-soft` | `#B45309` / `#FEF3E2` | 인메모리 초기화 고지 배너 |
| focus ring | `--color-focus` | `#2563EB` | 키보드 포커스 아웃라인(3px, 대비 확보) |

---

## 3. 타이포그래피

system font stack만 사용(외부 폰트 로드 없음).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
--font-num: "SF Mono", ui-monospace, "Menlo", "Consolas", monospace; /* KPI 수치 정렬용 */
```

| 역할 | font-size | line-height | weight | 색상 | 용도 |
|---|---|---|---|---|---|
| page title | 22px | 30px | 700 | text | 화면 제목("피드백 남기기" / "펄스 보드") |
| section heading | 15px | 22px | 600 | text | 폼/분포/목록 섹션 제목 |
| KPI value | 26px | 32px | 700 | text(강조 시 semantic) | KPI 수치(`--font-num`) |
| KPI label | 12px | 16px | 500 | text-muted | KPI 라벨 |
| dist value | 14px | 20px | 600 | semantic text | 분포 건수·비율 |
| card title | 14px | 20px | 600 | text | 피드백 의견 요약 |
| body | 14px | 20px | 400 | text | 의견 본문·폼 입력 |
| caption / meta | 12px | 16px | 400 | text-muted | 접수 시각·상대 시간·글자 수 |
| badge | 12px | 16px | 600 | semantic text | 감정/긴급도 뱃지 라벨 |
| button | 14px | 20px | 500 | 문맥별 | 액션 버튼 |
| error | 12px | 16px | 500 | `--sent-neg-text` | 폼 인라인 에러 |

---

## 4. 레이아웃

### 4.1 화면 구조

두 화면은 독립적이다(고객용 폼 / 운영자용 보드). mockup에서는 하나의 페이지에 `<section>`으로 구분해 함께 시각화한다.

**A. 제출 폼 화면** (컨테이너 max-width `560px`, 중앙 정렬)

```
┌───────────────────────────────────┐
│ 헤더 (제목 "피드백 남기기" + 설명)     │
├───────────────────────────────────┤
│ 감정 선택 (segmented: 긍정/중립/부정) │
│ 긴급도 선택 (segmented: 낮음~긴급)    │
│ 의견 textarea + 글자 수 카운터(n/1000)│
│ [인라인 에러 영역]  (조건부)          │
│ 제출 버튼 (primary, 전체폭)          │
│ [성공 토스트]  (조건부)              │
└───────────────────────────────────┘
```

**B. 펄스 보드 화면** (컨테이너 max-width `960px`, 중앙 정렬)

```
┌─────────────────────────────────────────────┐
│ 헤더 (제목 "펄스 보드" + 설명)                  │
├─────────────────────────────────────────────┤
│ 인메모리 초기화 고지 배너 (상시)                 │
├─────────────────────────────────────────────┤
│ KPI 요약 바 (4 타일: 총 건수·부정 비율·긴급 대응·펄스율)│
├──────────────────────┬──────────────────────┤
│ 감정 분포 (3행 bar)    │ 긴급도 분포 (4행 bar)   │
├──────────────────────┴──────────────────────┤
│ 긴급 피드백 (high/critical 목록)               │
├─────────────────────────────────────────────┤
│ 필터 바 (감정 필터 · 긴급도 필터)               │
├─────────────────────────────────────────────┤
│ 최근 흐름 (접수 목록 카드)  또는  빈 상태        │
└─────────────────────────────────────────────┘
```

### 4.2 컨테이너 & spacing

```css
--space-1: 4px; --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
--radius-card: 12px; --radius-item: 10px; --radius-btn: 8px; --radius-pill: 999px;
```

- 좌우 패딩 `var(--space-4)`, 섹션 간 세로 간격 `var(--space-5)`, 카드 내부 패딩 `var(--space-4)`.

### 4.3 breakpoint 별 동작

| 구간 | 감정/긴급도 선택 | KPI 그리드 | 분포 2단 | 필터 바 |
|---|---|---|---|---|
| ≥ 720px (desktop/tablet) | segmented 가로 배치 | 4열 (`repeat(4, 1fr)`) | 2열 (`repeat(2, 1fr)`) | 필터 가로 배치 |
| < 720px (mobile) | segmented 가로 유지(줄바꿈 허용), 긴급도 4개는 2×2 wrap | 2열 (`repeat(2, 1fr)`) | 1열 stack | 필터 세로 stack |

- 미디어쿼리 1개(`@media (max-width: 720px)`)로 처리. 분포 차트는 `flex`/`grid` 로 유연 대응.

---

## 5. 컴포넌트 명세

각 컴포넌트의 props(데이터 입력)·상태(state)·인터랙션을 정의한다. props는 developer가 렌더 함수 시그니처로 사용할 수 있도록 명시한다. 제출 폼 필드 제약은 기획 §3.1을 그대로 따른다.

### 5.1 제출 폼 (`.pulse-form`)

- **props(입력 필드)**:
  | 필드 | 타입 | 제약(기획 §3.1) | UI |
  |---|---|---|---|
  | `sentiment` | segmented(radio) | `positive`/`neutral`/`negative`, 필수 | 3버튼 그룹, 미선택 기본 |
  | `urgency` | segmented(radio) | `low`/`medium`/`high`/`critical`, 필수 | 4버튼 그룹, 미선택 기본 |
  | `opinion` | textarea(3행) | 공백 제거 후 1~1000자, 필수 | placeholder "의견을 입력하세요" + 글자 수 카운터 |
- **글자 수 카운터**: `현재/1000` 표기. 0자 또는 1000자 초과 시 카운터를 `--sent-neg-text`로 강조.
- **버튼**: "제출"(primary, 전체폭). 제출 중 disabled 상태 표현.
- **상태**:
  - default: 입력 대기(감정/긴급도 미선택, 의견 빈 상태).
  - error(AC-2): 아래 케이스에서 해당 필드 하단 인라인 에러 + 입력/그룹 테두리 `--sent-neg`. 저장소 미반영.
    | 케이스 | 에러 문구(예) |
    |---|---|
    | 감정 미선택 | "감정을 선택하세요." |
    | 긴급도 미선택 | "긴급도를 선택하세요." |
    | 의견 공백/빈 값 | "의견을 입력하세요." |
    | 의견 1000자 초과 | "의견은 1000자 이하여야 합니다." |
  - success(AC-1): 폼 초기화 + 상단 성공 토스트("피드백이 접수되었습니다."). 보드가 같은 화면이면 최근 흐름 최상단에 신규 카드 반영.
- **인터랙션**: 제출 버튼 클릭/폼 submit → 클라이언트 1차 검증 → 통과 시 `POST /feedback-pulse` → 201이면 success, 400이면 서버 오류 메시지를 인라인 에러로 표시(포커스는 첫 오류 필드로 이동 권장).
- **접근성**: 각 필드 `<label>` 연결, segmented는 `role="radiogroup"` + 각 옵션 `role="radio"`/`aria-checked`, 에러는 `aria-describedby`로 필드와 연결(§9).

### 5.2 KPI 요약 바 (`.pulse-kpi`)

- **props**: `total`, `negativeRatio`(문자열 `"25.0%"`), `urgentCount`(high+critical 건수), `pulseRate`(최근 5분 건수), `pulseWindowLabel`(예 `"최근 5분"`).
- **구성 타일**(기획 §6, 4종):
  | 타일 | 값 | 강조색 | 캡션 |
  |---|---|---|---|
  | 총 접수 건수 | `total` | text | "누적 접수" |
  | 부정 감정 비율 | `negativeRatio` | 값 ≥ 임계 시 `--sent-neg-text` | "negative / 전체" |
  | 긴급 대응 필요 | `urgentCount` | 값 > 0 시 `--urg-high-text` | "높음 + 긴급" |
  | 펄스율 | `pulseRate` | `--color-primary` | `pulseWindowLabel`(예 "최근 5분 접수") |
- **상태(0-division 방지, AC-4/AC-5)**: 전체 0건이면 총 건수 `0`, 부정 비율 `0.0%`, 긴급 대응 `0`, 펄스율 `0`으로 표시하고 오류를 던지지 않는다. 강조색은 값 0이면 중립(text-muted)으로 표시.
- **인터랙션**: 정적 표시(클릭 없음). 데이터 변경 시 developer가 재계산·리렌더.

### 5.3 감정 분포 (`.dist-chart--sentiment`)

- **props**: `distribution: [{ key: 'positive'|'neutral'|'negative', count, percent }]`(기획 §6, 소수점 1자리).
- **레이아웃**: 3행. 각 행 = `라벨(감정 뱃지)` + `막대(가로 bar, 채움=base 색, 트랙=border)` + 우측 `건수·비율`(dist value). 막대 폭 = `percent%`.
- **상태**: 전체 0건이면 모든 막대 0%, 비율 `0.0%`, 카드 하단에 "아직 접수된 피드백이 없습니다." muted 안내(빈 상태 §5.8 no-data와 톤 일치).
- **접근성**: 각 막대 `role="img"` + `aria-label`(예 "긍정 12건, 60.0%"). 색상 외 라벨/수치로 정보 전달.

### 5.4 긴급도 분포 (`.dist-chart--urgency`)

- **props**: `distribution: [{ key: 'low'|'medium'|'high'|'critical', count, percent }]`.
- **레이아웃/상태/접근성**: §5.3과 동일 패턴, 4행. `critical` 행은 라벨 좌측에 `●` dot + 굵은 라벨로 시각 강조.

### 5.5 긴급 피드백 (`.urgent-list`)

- **props**: `items: FeedbackPulse[]`(urgency가 `high`/`critical`인 레코드, 접수 최신순 표시).
- **레이아웃**: 좌측 `4px` `--urg-crit`(critical) / `--urg-high`(high) 보더 강조 카드. 각 항목 = 긴급도 뱃지 + 감정 뱃지 + 의견 요약(1행 말줄임) + 상대 시간.
- **정렬**: critical 우선, 그다음 high, 각 그룹 내 최신순(구현 재량 — 최신순 단일 정렬도 허용, §10 모호함 flag).
- **상태**: 해당 건 0건이면 "현재 긴급 대응이 필요한 피드백이 없습니다." positive 톤 안내(문제 없음 신호).
- **인터랙션**: 정적 목록(본 범위에 상태 전이·조치 액션 없음 — 기획 §10 Non-goals).

### 5.6 필터 바 + 최근 흐름 (`.filter-bar`, `.recent-feed`)

- **필터 바 props**: `sentimentFilter`(`all`/`positive`/`neutral`/`negative`, 기본 `all`), `urgencyFilter`(`all`/`low`/`medium`/`high`/`critical`, 기본 `all`).
  - 감정 필터: segmented(pill 그룹) — `전체`/`긍정`/`중립`/`부정`.
  - 긴급도 필터: select 드롭다운 — `전체`/`낮음`/`보통`/`높음`/`긴급`.
  - 두 필터 AND 결합(기획 §5.2). `GET /feedback-pulse?sentiment=&urgency=` 매핑. 필터는 세션 UI 상태(영속화 안 함).
- **최근 흐름 props**: `items: FeedbackPulse[]`(필터 적용 결과). 화면 표시는 **최신순**(기획은 저장 FIFO=오래된 순 §3.2이나, "최근 흐름" UX상 최신 우선 노출 — developer가 표시 시 reverse. §10 모호함 flag).
- **카드(`.feed-card`)**: 상단 = 감정 뱃지 + 긴급도 뱃지. 본문 = 의견(2행 말줄임, `-webkit-line-clamp`). 하단 메타 = 접수 시각(`YYYY-MM-DD HH:mm`) + 상대 시간(예 "3분 전").
- **상태**: 필터 결과 0건 → 빈 상태 `no-match`(§5.8). 데이터 자체 0건(재시작 직후 포함) → 빈 상태 `no-data`.
- **인터랙션**: 필터 변경 → 목록 즉시 재조회/재필터. 카드 클릭 액션 없음(조회 전용).

### 5.7 감정/긴급도 뱃지 (`.badge`)

- **props**: `type`(`sentiment`|`urgency`), `key`(각 enum 값).
- **형태**: pill(`--radius-pill`), padding `2px 10px`, `badge` 타이포(12px/600), 텍스트=semantic -700 토큰, 배경=soft, 좌측 `●` 6px dot(base 색).
- **매핑**: §2.2(감정) / §2.3(긴급도)의 라벨·색을 그대로 사용. 라벨 텍스트는 색과 무관하게 항상 표기.
- **인터랙션**: 정적(비인터랙티브).

### 5.8 빈 상태 (`.empty-state`)

- **props**: `variant`(`no-data` | `no-match`).
- **형태**: 중앙 정렬, 아이콘(이모지) + 제목 + 보조 문구. surface 카드 안, muted 텍스트.
- **variant 문구**:
  | variant | 조건 | 제목 | 보조 문구 |
  |---|---|---|---|
  | `no-data` | 데이터 0건(재시작 직후 포함, AC-5) | "아직 접수된 피드백이 없습니다" | "첫 피드백이 접수되면 이곳에 실시간으로 표시됩니다." |
  | `no-match` | 필터 결과 0건(AC-3) | "조건에 맞는 피드백이 없습니다" | "필터를 변경하면 다른 결과를 볼 수 있어요." |

### 5.9 인메모리 초기화 고지 배너 (`.notice-banner`) — 상시

- **props**: `dismissible`(boolean, 기본 true), `message`.
- **조건**(기획 §4): 펄스 보드 상단에 **상시 노출**. 데이터가 인메모리 전용이며 재시작 시 초기화됨을 운영자에게 고지.
- **형태**: notice 계열 — `--color-notice-soft` 배경 + 좌측 `4px` `--color-notice` 보더 + ℹ 아이콘. 문구 "이 데이터는 서버 재시작 시 모두 초기화됩니다. 영속 저장은 지원하지 않습니다." + 우측 닫기(×) 버튼(세션 한정 dismiss).
- **인터랙션**: 닫기 클릭 시 세션 동안 숨김(다음 로드 시 재노출).

---

## 6. dev 구현 가이드 (BF-1081 developer)

mockup(`docs/design/mockups/feedback-pulse-BF-1080.html`)을 시각 참조로 사용하되 픽셀 일치 의무는 없다. 아래 CSS 변수·클래스 네이밍을 권장한다.

### 6.1 CSS 변수 (`:root`에 그대로 정의)

```css
:root {
  --color-primary:#2563EB; --color-primary-hover:#1D4ED8; --color-primary-soft:#EAF1FE;
  --color-bg:#F7F8FA; --color-surface:#FFFFFF; --color-border:#E2E5EA;
  --color-text:#1F2430; --color-text-muted:#5B6472;
  /* 감정 */
  --sent-pos:#16A34A; --sent-pos-text:#15803D; --sent-pos-soft:#ECFDF3;
  --sent-neu:#6B7280; --sent-neu-text:#4B5563; --sent-neu-soft:#F3F4F6;
  --sent-neg:#DC2626; --sent-neg-text:#B91C1C; --sent-neg-soft:#FEE2E2;
  /* 긴급도 */
  --urg-low:#9CA3AF;  --urg-low-text:#4B5563;  --urg-low-soft:#F3F4F6;
  --urg-med:#2563EB;  --urg-med-text:#1D4ED8;  --urg-med-soft:#EAF1FE;
  --urg-high:#D97706; --urg-high-text:#B45309; --urg-high-soft:#FEF3E2;
  --urg-crit:#DC2626; --urg-crit-text:#B91C1C; --urg-crit-soft:#FEE2E2;
  /* 고지/포커스 */
  --color-notice:#B45309; --color-notice-soft:#FEF3E2; --color-focus:#2563EB;
  --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans KR",sans-serif;
  --font-num:"SF Mono",ui-monospace,"Menlo","Consolas",monospace;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px; --space-6:32px;
  --radius-card:12px; --radius-item:10px; --radius-btn:8px; --radius-pill:999px;
}
```

### 6.2 클래스 네이밍(BEM 권장)

| 컴포넌트 | 루트 클래스 | 주요 하위 |
|---|---|---|
| 제출 폼 | `.pulse-form` | `.pulse-form__field`, `.pulse-form__counter`, `.pulse-form__error`, `.pulse-form__submit` |
| segmented 선택 | `.segmented` | `.segmented__btn`, `.segmented__btn--active` |
| KPI 바 | `.pulse-kpi` | `.kpi-tile`, `.kpi-tile__value`, `.kpi-tile__label` |
| 분포 차트 | `.dist-chart` | `.dist-row`, `.dist-row__label`, `.dist-row__bar`, `.dist-row__fill`, `.dist-row__value` |
| 긴급 목록 | `.urgent-list` | `.urgent-item`, `.urgent-item--critical`, `.urgent-item--high` |
| 필터 바 | `.filter-bar` | `.filter-bar__sentiment`, `.filter-bar__urgency` |
| 최근 흐름 | `.recent-feed` | `.feed-card`, `.feed-card__body`, `.feed-card__meta` |
| 뱃지 | `.badge` | `.badge--pos/neu/neg`, `.badge--low/med/high/crit`, `.badge__dot` |
| 빈 상태 | `.empty-state` | `.empty-state--no-data`, `.empty-state--no-match` |
| 고지 배너 | `.notice-banner` | `.notice-banner__close` |

### 6.3 KPI/분포 계산 규칙 (기획 §6 준수 — 의사코드)

```
total        = items.length
percent(n)   = total === 0 ? "0.0%" : (n / total * 100).toFixed(1) + "%"
negRatio     = percent(count(sentiment === 'negative'))
urgentCount  = count(urgency === 'high' || urgency === 'critical')
pulseRate    = count(now - submittedAt <= 5분)   // 5분은 기본값, 조정 가능(기획 §6)
sentDist     = ['positive','neutral','negative'].map(k => ({k, count:count(s===k), percent:percent(...)}))
urgDist      = ['low','medium','high','critical'].map(k => ({k, count:count(u===k), percent:percent(...)}))
```

- **0-division 방지**: `total === 0`이면 모든 비율은 `"0.0%"`. 절대 오류를 던지지 않는다(AC-4/AC-5).

### 6.4 접근성 최소 요건 (§9 상세)

- 폼 각 필드에 `<label for>` 연결, segmented는 `role="radiogroup"`/`role="radio"`/`aria-checked`.
- 인라인 에러는 `aria-describedby`로 필드에 연결하고 `role="alert"`로 즉시 안내.
- 감정/긴급도 뱃지는 색 + 텍스트 라벨 항상 병기(색 단독 금지).
- 분포 막대는 `aria-label`에 "라벨 n건, p%" 형태로 수치 제공.
- 모든 인터랙티브 요소(`<button>`, `<select>`, segmented)는 키보드 포커스 가능 + 가시 포커스 링(`:focus-visible` 3px `--color-focus`, 대비 확보).
- 고지/에러 문구는 색상 대비 4.5:1 이상(§9 표).

---

## 7. 수용 기준 ↔ 시안 요소 매핑 (Traceability)

Task BF-1080 수용 기준과 기획 AC를 시안 요소로 매핑한다.

| 수용 기준 / AC | 대응 시안 요소 |
|---|---|
| Task-AC1: 제출 폼·펄스 보드·빈/에러 상태 레이아웃 시각화 | §4.1 A/B, §5 전체, mockup 전 `<section>` |
| Task-AC2: 색상 대비·키보드 접근·에러 안내 검증 | §9 접근성 표(A11Y-1~A11Y-6) |
| 기획 AC-1 정상 접수 | §5.1 success 상태, §5.6 최근 흐름 반영 |
| 기획 AC-2 접수 유효성 실패 | §5.1 error 상태 표, §9 A11Y-3 |
| 기획 AC-3 필터 AND 조회/0건 | §5.6 필터 바, §5.8 no-match |
| 기획 AC-4 KPI 집계·0-division | §5.2 KPI, §5.3/§5.4 분포, §6.3 |
| 기획 AC-5 재시작 인메모리 초기화 | §5.2 전부 0, §5.8 no-data, §5.9 고지 배너 |
| 기획 AC-6 동시 접수 순서/고유 id | §5.6 최근 흐름 정렬(표시), 시안 영향 최소(백엔드 계약) |

---

## 8. mockup 참조

- 파일: `docs/design/mockups/feedback-pulse-BF-1080.html`
- 단일 self-contained HTML(외부 의존성 0건, system font, 인라인 `<style>`). file:// 로 직접 열어 렌더 확인 가능.
- 본 명세의 컬러/타이포/레이아웃/뱃지/빈·에러 상태를 정적으로 시각화한다. 한 페이지에 `<section>`으로 구분:
  1. 제출 폼 — 기본 상태
  2. 제출 폼 — 에러 상태(감정/긴급도 미선택·의견 공백)
  3. 제출 폼 — 성공 토스트
  4. 펄스 보드 — 데이터 있는 상태(고지 배너 + KPI + 감정/긴급도 분포 + 긴급 피드백 + 필터 + 최근 흐름)
  5. 펄스 보드 — 빈 상태(재시작 직후: KPI 전부 0 + no-data)
  6. 펄스 보드 — 필터 0건(no-match)
- placeholder 콘텐츠 사용(샘플 의견 텍스트). UX 의도 전달이 핵심이며 dev 산출물의 픽셀 일치 대상은 아니다.

---

## 9. 접근성 검증 (색상 대비 · 키보드 접근 · 에러 안내) — Task-AC2 매핑

| ID | 접근성 요구 | 시안 대응 | 검증 방법 / 기준 |
|---|---|---|---|
| A11Y-1 | 본문/라벨 색상 대비 | text `#1F2430`(대비 14+:1), muted `#5B6472`(약 6.1:1) on surface | WCAG AA 4.5:1 이상 충족 |
| A11Y-2 | 감정/긴급도 텍스트 대비 | 텍스트는 -700 토큰만 사용(§2.2/§2.3), soft 배경 위 5.4~7.0:1 | AA 4.5:1 이상. base 색은 비텍스트(dot/bar)에만 사용 |
| A11Y-3 | 에러 안내 명확성 | 인라인 에러 문구(무엇이 왜 틀렸고 어떻게 고치는지, §5.1), `role="alert"` + `aria-describedby` | 스크린리더 즉시 안내 + 시각 표기 |
| A11Y-4 | 색 단독 의존 금지 | 모든 감정/긴급도에 텍스트 라벨 병기, critical은 dot+보더 이중 신호 | 흑백/색맹 시에도 구분 가능 |
| A11Y-5 | 키보드 접근 | 폼·필터·버튼 모두 tab 이동, segmented `role="radio"`+화살표 이동, `:focus-visible` 3px 포커스 링 | 키보드만으로 접수·필터·닫기 전 과정 조작 가능 |
| A11Y-6 | 빈/재시작 상태 안내 | no-data/no-match 문구(§5.8) + 고지 배너(§5.9)로 빈 화면 방지 | 빈 화면에서도 다음 행동 안내 |

---

## 10. 모호함 / 결정 필요 항목 (dev·운영자 확인 요망)

기획 명세에서 시안 확정에 필요한 판단이 열려 있는 항목을 flag한다. **가정으로 진행하되** 아래는 명시적 확인이 필요하다.

1. **최근 흐름 정렬 방향**: 기획 §3.2는 저장을 FIFO(오래된 순)로 규정하나, "최근 흐름" UX상 시안은 **표시 시 최신순(reverse)**을 가정했다. 저장 순서는 그대로 두고 표시만 뒤집는다. → 운영자 의도가 "접수 순 그대로"라면 developer가 표시 정렬만 조정.
2. **부정 감정 비율 경보 임계값**: KPI에서 부정 비율을 언제 `--sent-neg-text`로 강조할지 임계값(예 25%)은 기획에 없음. 시안은 시각 강조 규칙만 정의하고 **임계값은 developer/운영자 재량**으로 남긴다(기본: 값 > 0이면 강조하지 않고, 별도 임계 미지정 시 강조 생략 가능).
3. **펄스율 시간창(5분)**: 기획 §6에서 5분은 기본값·조정 가능으로 명시. KPI 캡션에 창 길이를 라벨(`pulseWindowLabel`)로 노출하도록 설계했으니, 값 변경 시 라벨도 함께 갱신.
4. **긴급 피드백 정렬**: critical→high 그룹 우선(§5.5) vs 단순 최신순 — 시안은 critical 우선을 권장하나 단일 최신순도 허용. 운영 우선순위에 맞춰 developer가 택1.
5. **감정/긴급도 미선택 기본값**: 시안은 폼에서 둘 다 **미선택 시작**(필수 선택 강제)으로 가정. 자동 기본값(예 neutral/medium) 선호 시 운영자 확인 필요.

이 flag들은 시안 렌더에는 영향이 없으며(가정값으로 시각화됨), 구현 시 계약 확정용이다.

---

## 11. Self-critique (PR commit 직전 자기 점검)

| 점검 항목 | 결과 |
|---|---|
| 1. AC 매핑 완결성 | Task-AC1/AC2 + 기획 AC-1~AC-6 모두 §7 표에 시안 요소로 매핑. 누락 없음 |
| 2. dev 구현 가이드 충분성 | §6에 CSS 변수 전체·BEM 클래스·KPI/분포 계산 의사코드·접근성 요건 명시. developer가 추가 질의 없이 착수 가능 |
| 3. 기존 요소 보존 | 신규 화면이라 파괴 대상 없음. 단 하우스 중립 토큰셋과 형제(feedback-board) 계열 색/타이포/spacing을 재사용해 시스템 일관성 유지 |
| 4. 컴포넌트 ↔ 기획 매핑 | §5 각 컴포넌트가 기획 §2/§5/§6/§7 항목과 대응(§1.1 표). 폼 제약은 기획 §3.1 그대로 |
| 5. 모호함 flag | §10에 5개 결정 필요 항목 명시(정렬·임계값·시간창·긴급 정렬·기본값). 가정 명시 후 진행 |

접근성(색상 대비·키보드·에러 안내)은 §9 표로 별도 검증. base 색(#D97706/#DC2626)의 텍스트 대비 미달 위험을 -700 토큰 분리로 해소한 점이 본 시안의 핵심 접근성 결정이다.
</content>
</invoke>
