# 고객 피드백 보드 디자인 명세 (BF-1074)

- 대상 라우트: `/demo/feedback-board` (entry: `demo/feedback-board/index.html`, developer 담당)
- 기술 스택: vanilla-static (외부 CDN·신규 패키지 0건, system font, CSS 변수 자체 정의)
- 기획 근거: `docs/planning/feedback-board-BF-1072.md`
- 형제 Task: BF-1073(planner), BF-1075(developer, 구현), BF-1077(tester, E2E)
- mockup 참조: `docs/design/mockup/feedback-board/feedback-board-BF-1074.html`
- 본 문서는 **디자인 명세만** 다룬다. 실제 앱 코드는 BF-1075(developer)가 구현한다.

---

## 1. 시안 개요

### 1.1 변경 범위

신규 화면 `/demo/feedback-board` 의 시안을 정의한다. 백엔드 없이 `localStorage` 기반으로 동작하는 단일 페이지 보드로, 아래 5개 UI 영역을 다룬다.

| 영역 | 역할 | 기획 근거 |
|---|---|---|
| KPI 요약 바 | 전체/상태별 건수·완료율·평균 처리 시간·미처리 건수 표시 | 기획 §8 |
| 등록 폼 | 제목·내용·카테고리 입력 후 피드백 신규 등록 | 기획 §2-1, AC-1/AC-2 |
| 필터 바 | 상태·카테고리 2축 필터(AND) + 내보내기 액션 | 기획 §5, §7 |
| 목록 카드 | 피드백 레코드 카드 + 상태 뱃지 + 전이 액션 | 기획 §2-2, AC-3/AC-4 |
| 빈 상태 / 손상 복구 알림 | 필터 결과 0건·데이터 0건·손상 복구 안내 | 기획 §5.2, §6.2, AC-5/AC-7 |

### 1.2 사용자 경험 목표

- **한 화면에서 파악**: KPI → 등록 → 필터 → 목록의 세로 흐름으로, 스크롤 없이 상단에서 상태 요약을 즉시 인지.
- **상태를 색으로 구분**: `open`/`planned`/`done` 3상태를 색상 뱃지로 즉시 구분. 역행 전이는 버튼 자체를 미노출(기획 §4.3).
- **안전한 실패**: 필터 0건·데이터 0건·손상 복구 상황에서도 화면이 비어 보이지 않고 명확한 안내를 제공.
- **의존성 0**: file:// 로 직접 열어도 외부 호출 없이 렌더링(AC 검증 조건).

---

## 2. 컬러 팔레트

기존 brix-flow-test 공용 중립 토큰만 사용한다(직전 산출물 `customer-onboarding-canary/onboarding-checklist-BF-1068.html` 와 동일 토큰셋). **신규 색상 토큰 도입 없음.**

### 2.1 기본 팔레트

| 역할 | 토큰 변수 | HEX | 용도 |
|---|---|---|---|
| primary | `--color-primary` | `#2563EB` | 주요 버튼, `planned` 뱃지, 강조 수치 |
| primary hover | `--color-primary-hover` | `#1D4ED8` | 주요 버튼 hover |
| background | `--color-bg` | `#F7F8FA` | 페이지 배경 |
| surface | `--color-surface` | `#FFFFFF` | 카드·폼·바 표면 |
| border | `--color-border` | `#E2E5EA` | 구분선·입력 테두리·트랙 |
| text | `--color-text` | `#1F2430` | 본문 텍스트 |
| text muted | `--color-text-muted` | `#6B7280` | 보조 텍스트·캡션·라벨 |

### 2.2 상태 색상 (open / planned / done)

3상태를 기존 semantic 토큰에 매핑한다. 신규 색상 없이 warning/primary/success 재사용.

| 상태 | 의미 | 텍스트/보더 토큰 | 배경 토큰 | HEX(텍스트 / 배경) |
|---|---|---|---|---|
| `open` | 신규 접수·미처리 (조치 필요) | `--color-warning` | `--color-warning-soft` | `#D97706` / `#FEF3E2` |
| `planned` | 검토 완료·계획됨 | `--color-primary` | `--color-primary-soft` | `#2563EB` / `#EAF1FE` |
| `done` | 작업 완료 | `--color-success` | `--color-success-soft` | `#16A34A` / `#ECFDF3` |

> `--color-primary-soft`(`#EAF1FE`)만 기존 토큰셋에 없어 mockup `:root` 에서 primary 계열 soft 배경으로 신규 **정의**한다. vanilla-static 규약상 토큰은 mockup 안에서 직접 정의 가능하며, 별도 design-tokens 파일 수정은 없음.

### 2.3 카테고리 표기

카테고리(`bug`/`feature`/`improvement`/`other`)는 색상 대신 **중립 회색 태그**(`--color-text-muted` 텍스트 + `--color-pending-soft` `#F3F4F6` 배경)로 표기해 상태 색상과 시각적으로 충돌하지 않게 한다. 카테고리는 분류 정보이지 우선순위 신호가 아니므로 무채색으로 처리.

---

## 3. 타이포그래피

system font stack 만 사용(외부 폰트 로드 없음).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
```

| 역할 | font-size | line-height | weight | 색상 | 용도 |
|---|---|---|---|---|---|
| page title | 22px | 30px | 700 | text | 화면 제목 "피드백 보드" |
| section heading | 15px | 22px | 600 | text | 폼/목록 섹션 제목 |
| KPI value | 24px | 30px | 700 | text (강조 시 primary) | KPI 수치 |
| KPI label | 12px | 16px | 500 | text-muted | KPI 라벨 |
| card title | 15px | 22px | 600 | text | 피드백 제목 |
| body | 14px | 20px | 400 | text | 피드백 내용·폼 입력 |
| caption / meta | 12px | 16px | 400 | text-muted | 작성일·카테고리·건수 |
| badge | 12px | 16px | 600 | 상태색 | 상태 뱃지 라벨 |
| button | 14px | 20px | 500 | 문맥별 | 액션 버튼 |

---

## 4. 레이아웃

### 4.1 섹션 구조 (세로 흐름)

```
┌───────────────────────────────────────┐
│ 헤더 (제목 + 설명)                       │
├───────────────────────────────────────┤
│ KPI 요약 바 (6개 stat 타일, 반응형 그리드) │
├───────────────────────────────────────┤
│ [손상 복구 알림 배너]  (조건부 노출)        │
├───────────────────────────────────────┤
│ 등록 폼 (제목 / 내용 / 카테고리 / 등록 버튼) │
├───────────────────────────────────────┤
│ 필터 바 (상태 필터 · 카테고리 필터 · 내보내기)│
├───────────────────────────────────────┤
│ 목록 (카드 나열)  또는  빈 상태            │
└───────────────────────────────────────┘
```

### 4.2 컨테이너 & spacing

- 최대 너비: `760px`, 중앙 정렬(`margin: 0 auto`), 좌우 패딩 `var(--space-4)`.
- spacing scale(기존 토큰 재사용):

```css
--space-1: 4px; --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
```

- 섹션 간 세로 간격: `var(--space-5)`.
- 카드 내부 패딩: `var(--space-4)`.
- radius: `--radius-card: 12px`, `--radius-item: 10px`, `--radius-btn: 8px`, `--radius-pill: 999px`.

### 4.3 breakpoint 별 동작

| 구간 | KPI 그리드 | 등록 폼 | 필터 바 |
|---|---|---|---|
| ≥ 640px (desktop/tablet) | 3열 × 2행 (`repeat(3, 1fr)`) | 제목·카테고리 한 행, 내용 전체폭 | 필터들 가로 배치, 내보내기 우측 정렬 |
| < 640px (mobile) | 2열 (`repeat(2, 1fr)`) | 모든 필드 세로 stack | 필터들 세로 stack, 내보내기 전체폭 |

- 미디어쿼리 1개(`@media (max-width: 640px)`)로 처리. CSS Grid `auto-fit`/`minmax` 로 유연 대응.

---

## 5. 컴포넌트 명세

각 컴포넌트의 props(데이터 입력)·상태(state)·인터랙션을 정의한다. props 는 developer 가 렌더 함수 시그니처로 사용할 수 있도록 명시.

### 5.1 KPI 요약 바 (`.kpi-bar`)

- **props**: `total`, `countByStatus: {open, planned, done}`, `completionRate`(문자열, 예 `"37.5%"`), `avgLeadTime`(문자열, 예 `"2일 4시간"` 또는 `"데이터 없음"`), `openBacklog`.
- **구성 타일**(기획 §8, 6종): 전체 건수 / open / planned / done / 완료율 / 평균 처리 시간. 미처리 적체는 open 타일과 동일 값이므로 open 타일 캡션에 "미처리 적체" 병기.
- 각 타일: `KPI value`(24px/700) + `KPI label`(12px/500 muted). done 타일 값은 `--color-success`, open 값은 `--color-warning` 로 강조.
- **상태**: 데이터 0건 → 완료율 `0%`, 평균 처리 시간 `데이터 없음`(기획 §8, AC-9, 0-division 방지).
- **인터랙션**: 정적 표시(클릭 없음). 데이터 변경 시 developer 가 재계산·리렌더.

### 5.2 등록 폼 (`.feedback-form`)

- **props(입력 필드)**:
  | 필드 | 타입 | 제약 | placeholder |
  |---|---|---|---|
  | `title` | text input | 1~100자, 필수 | "피드백 제목을 입력하세요" |
  | `content` | textarea (3행) | 1~2000자, 필수 | "상세 내용을 입력하세요" |
  | `category` | select | `bug`/`feature`/`improvement`/`other`, 필수 | "카테고리 선택" (placeholder option, value 없음) |
- **버튼**: "등록"(primary, 우하단 정렬).
- **상태**:
  - default: 입력 대기.
  - error(AC-2): 제목/내용 공백만 입력 또는 카테고리 미선택 시, 해당 필드 하단에 `--color-warning` 텍스트로 인라인 에러(예 "제목을 입력하세요"). 입력 테두리 `--color-warning`. 저장소 미반영.
  - success: 등록 후 폼 초기화, 목록 최상단에 신규 카드 추가.
- **인터랙션**: 등록 버튼 클릭 또는 폼 submit → 검증 → 통과 시 저장·리렌더, 실패 시 에러 표시(포커스 이동은 developer 재량).

### 5.3 목록 카드 (`.fb-card`)

- **props**: `id`, `title`, `content`, `category`, `status`, `createdAt`(표시용 포맷 `YYYY-MM-DD HH:mm`).
- **레이아웃**: 상단 행 = `card title` + 우측 `상태 뱃지`. 중간 = `body` 내용(2~3행 후 말줄임 권장, `-webkit-line-clamp`). 하단 메타 행 = `카테고리 태그` + `작성일`(우측) + `전이 액션 버튼`.
- **정렬**: `createdAt` 내림차순 고정(기획 §5.2). 필터는 정렬에 영향 없음.
- **전이 액션(기획 §4.2, AC-3/AC-4)** — 현재 상태 기준 허용 전이만 버튼 노출:
  | 현재 상태 | 노출 버튼 |
  |---|---|
  | `open` | `→ 계획됨`(planned), `→ 완료`(done) |
  | `planned` | `→ 완료`(done) |
  | `done` | (없음 — 종료 상태) |
  - 역행 전이 버튼은 **미노출**(비활성화 아님). done 카드는 전이 버튼 영역 자체가 없음.
- **인터랙션**: 전이 버튼 클릭 → status·updatedAt·statusHistory 갱신 후 리렌더(developer). 버튼 hover 시 배경 톤 변화.

### 5.4 상태 뱃지 (`.badge`)

- **props**: `status` (`open`/`planned`/`done`).
- **형태**: pill(`--radius-pill`), padding `2px 10px`, `badge` 타이포(12px/600), 텍스트=상태색, 배경=상태 soft색, 좌측 `●` 6px 점 dot(상태색).
- **매핑**(§2.2):
  | status | 라벨 | dot/text | 배경 |
  |---|---|---|---|
  | `open` | 접수 | `#D97706` | `#FEF3E2` |
  | `planned` | 계획됨 | `#2563EB` | `#EAF1FE` |
  | `done` | 완료 | `#16A34A` | `#ECFDF3` |
- **인터랙션**: 정적(비인터랙티브).

### 5.5 필터 바 (`.filter-bar`)

- **props**: `statusFilter`(`all`/`open`/`planned`/`done`, 기본 `all`), `categoryFilter`(`all`/`bug`/`feature`/`improvement`/`other`, 기본 `all`).
- **구성**:
  - 상태 필터: segmented control(pill 버튼 그룹) — `전체`/`접수`/`계획됨`/`완료`. 선택된 항목 = primary 채움, 비선택 = surface + border.
  - 카테고리 필터: select 드롭다운(`전체`/`버그`/`기능`/`개선`/`기타`).
  - 내보내기: 우측 secondary 버튼 "JSON 내보내기"(기획 §7). 아웃라인 스타일(surface 배경 + border + text).
- **상태**: 선택 값 하이라이트. 두 필터 AND 결합(기획 §5.2).
- **인터랙션**: 필터 변경 → 목록 즉시 재필터. 필터는 세션 UI 상태(영속화 안 함, 기획 §5.2). 내보내기 클릭 → 전체 데이터 JSON 다운로드(저장소 불변).

### 5.6 빈 상태 (`.empty-state`)

- **props**: `variant` (`no-data` | `no-match`).
- **형태**: 중앙 정렬, 아이콘/이모지 + 제목 + 보조 문구. surface 카드 안, muted 텍스트.
- **variant 문구**:
  | variant | 조건 | 제목 | 보조 문구 |
  |---|---|---|---|
  | `no-data` | 등록된 데이터 0건 | "아직 등록된 피드백이 없습니다" | "위 폼에서 첫 피드백을 등록해 보세요." |
  | `no-match` | 필터 결과 0건(AC-5) | "조건에 맞는 피드백이 없습니다" | "필터를 변경하면 다른 결과를 볼 수 있어요." |

### 5.7 손상 복구 알림 배너 (`.recovery-banner`) — 조건부

- **props**: `visible`(boolean), `message`.
- **조건**(기획 §6.2, AC-7): `localStorage` 컨테이너 파싱 실패/구조 손상으로 백업 후 재초기화된 경우에만 노출.
- **형태**: warning 계열 배너 — `--color-warning-soft` 배경 + 좌측 `4px` `--color-warning` 보더 + ⚠ 아이콘. 제목 "저장된 데이터를 복구할 수 없어 초기화되었습니다" + 보조 "손상된 원본은 백업되었습니다." + 우측 닫기(×) 버튼.
- **인터랙션**: 닫기 클릭 시 배너 dismiss(세션 한정). 부분 레코드 손상(기획 §6.2-3)은 콘솔 경고만이므로 이 배너 대상 아님.

---

## 6. dev 구현 가이드 (BF-1075 developer)

mockup(`docs/design/mockup/feedback-board/feedback-board-BF-1074.html`)을 시각 참조로 사용하되 픽셀 일치 의무는 없음. 아래 CSS 변수·클래스 네이밍을 권장한다.

### 6.1 CSS 변수 (`:root` 에 그대로 정의)

```css
:root {
  --color-primary: #2563EB; --color-primary-hover: #1D4ED8;
  --color-primary-soft: #EAF1FE;
  --color-bg: #F7F8FA; --color-surface: #FFFFFF; --color-border: #E2E5EA;
  --color-text: #1F2430; --color-text-muted: #6B7280;
  --color-warning: #D97706; --color-warning-soft: #FEF3E2;
  --color-success: #16A34A; --color-success-soft: #ECFDF3;
  --color-pending: #9CA3AF; --color-pending-soft: #F3F4F6;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, "Noto Sans KR", sans-serif;
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --radius-card: 12px; --radius-item: 10px; --radius-btn: 8px; --radius-pill: 999px;
}
```

### 6.2 클래스 네이밍(BEM 권장)

| 컴포넌트 | 루트 클래스 | 주요 하위 |
|---|---|---|
| KPI 바 | `.kpi-bar` | `.kpi-tile`, `.kpi-tile__value`, `.kpi-tile__label` |
| 등록 폼 | `.feedback-form` | `.feedback-form__field`, `.feedback-form__error`, `.feedback-form__submit` |
| 필터 바 | `.filter-bar` | `.filter-bar__status`, `.filter-bar__category`, `.filter-bar__export` |
| 세그먼트 | `.segmented` | `.segmented__btn`, `.segmented__btn--active` |
| 카드 | `.fb-card` | `.fb-card__title`, `.fb-card__body`, `.fb-card__meta`, `.fb-card__actions` |
| 상태 뱃지 | `.badge` | `.badge--open`, `.badge--planned`, `.badge--done`, `.badge__dot` |
| 카테고리 태그 | `.tag` | — |
| 빈 상태 | `.empty-state` | `.empty-state--no-data`, `.empty-state--no-match` |
| 복구 배너 | `.recovery-banner` | `.recovery-banner__close` |

### 6.3 상태 전이 버튼 렌더 규칙 (의사코드)

```
transitionsFor(status):
  open    → ["planned", "done"]
  planned → ["done"]
  done    → []            // 버튼 영역 미렌더 (기획 §4.3 역행 미노출)
```

- 버튼 라벨: `planned → "계획됨으로"`, `done → "완료로"`.
- 클릭 핸들러는 기획 §4.4(status/updatedAt/statusHistory 갱신, 동일 상태 no-op) 준수.

### 6.4 접근성 최소 요건

- 폼 각 필드에 `<label>` 연결(`for`/`id`).
- 상태 뱃지 색상에만 의존하지 않도록 텍스트 라벨("접수"/"계획됨"/"완료") 항상 표기.
- 전이/내보내기 버튼은 `<button>` 시맨틱 요소.
- 필터 세그먼트는 `aria-pressed` 로 선택 상태 표현 권장.

---

## 7. mockup 참조

- 파일: `docs/design/mockup/feedback-board/feedback-board-BF-1074.html`
- 단일 self-contained HTML(외부 의존성 0건, system font, 인라인 `<style>`). file:// 로 직접 열어 렌더 확인 가능(AC 검증 조건 충족).
- mockup 은 본 명세의 컬러/타이포/레이아웃/상태 뱃지/빈 상태/복구 배너를 정적으로 시각화한 것으로, 3상태 카드·2축 필터·6종 KPI·빈 상태 2종·복구 배너를 한 페이지 `<section>` 구분으로 모두 포함한다. placeholder 콘텐츠 사용.
