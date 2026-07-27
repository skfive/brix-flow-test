# 우선순위 매트릭스(아이젠하워 4분면) — UI/UX 디자인 명세 (BF-1212)

> 작성자: [이디자인] (designer) · 작성일 2026-07-27
> 관련 티켓: BF-1213 (본 designer task) · ui-contract 기준 키 BF-1212
> tech-stack: `vanilla-static` — 외부 의존성 0건, system font, CSS 변수 자체 정의, `file://` 직접 실행 호환. 별도 `design-tokens.json` 은 존재하지 않으므로 §2 토큰 세트를 본 문서에서 단일 기준으로 확정하고, dev 는 하드코딩 색상 없이 이 CSS 변수만 재사용한다.
> mockup 참조: `docs/design/priority-matrix-BF-1212-mockup.html` (§10)
> 계약 근거: 본 문서는 `ui-contract@v1 (sha256:85c18768…)` 의 불변식을 시각/토큰/반응형/접근성 관점에서 확정한다. 불변식과 충돌하는 어떤 시각 결정도 두지 않는다.

---

## 0. ui-contract 불변식 고정 (구현 前 계약)

본 명세가 시각적으로 고정하는 불변식(구현·테스터가 그대로 준수):

| # | 불변식 | 본 문서 반영 |
|---|---|---|
| INV-1 | 라우트는 **정확히 `/demo/priority-matrix`** 이며 진입 시 페이지가 오류 없이 렌더된다 | §4.1 (엔트리 `demo/priority-matrix/index.html`) |
| INV-2 | localStorage 키는 **`brix.priority-matrix.v1` 단일 키**, 값은 task 배열의 JSON 직렬화 | §7 (영속) |
| INV-3 | task 스키마는 `{ id:string, title:string, description:string, urgency:'high'\|'low', importance:'high'\|'low', done:boolean, createdAt:number }` **필드만** 갖는다 | §6.2 (데이터 모델) |
| INV-4 | 4분면 배치는 `(urgency, importance)` 조합으로 결정: `high/high`, `low/high`, `high/low`, `low/low` | §5 (4분면 매핑) |
| INV-5 | 완료 처리·삭제·상태 필터(전체/진행/완료) 동작 제공, 새로고침 후 localStorage 에서 상태 복원 | §6.3~§6.5, §7 |
| INV-6 | 데스크톱·모바일 반응형, 키보드 조작 가능, 명확한 빈 상태 문구, 기존 brix-flow-test 디자인 토큰·접근성 패턴 준수 | §4.3, §8, §9 |

> ⚠️ 위 6개 불변식은 designer 재량으로 변경 불가. 시각 표현만 확정한다.

---

## 1. 시안 개요

### 1.1 변경 범위

`demo/priority-matrix/` 신규 모듈의 단일 페이지 SPA(`/demo/priority-matrix`). 아래 4개 주요 영역으로 구성한다.

1. **헤더 + 요약** — 타이틀 + 전체/진행/완료 건수 요약(카운트만, 부분집합 KPI 아님)
2. **등록 폼** — 제목·설명·긴급도(urgency)·중요도(importance) 입력 후 task 추가
3. **필터 바** — 상태 필터(전체 / 진행 / 완료) 3택1(segmented control)
4. **4분면 매트릭스** — 아이젠하워 2×2 그리드. 각 분면에 해당 task 카드 목록 + 빈 상태 문구

### 1.2 사용자 경험 목표

- **결정 지원** — task 를 긴급×중요 2축으로 즉시 분류해 "무엇부터 할지"를 시각적으로 명확화.
- **위치가 곧 의미** — 카드가 놓인 분면이 곧 행동 지침(지금/계획/위임/정리). 색상+분면 제목+축 레이블 3중 인코딩으로 색각 이상 사용자도 구분 가능.
- **키보드 완결성** — 마우스 없이 등록 → 필터 → 완료 토글 → 삭제 전 흐름 수행 가능, `aria-live` 로 비시각 피드백 제공.
- **영속성** — 새로고침해도 localStorage 에서 상태 복원(INV-2, INV-5).

### 1.3 비범위

로그인/담당자, 서버 영속, 마감일/태그, 드래그 앤 드롭으로 분면 이동, task 수정 UI, 정렬 커스터마이징 — 화면에 노출하지 않는다(스키마 INV-3 필드만 사용, 신규 팔레트 도입 금지).

---

## 2. 컬러 팔레트 (디자인 토큰)

모든 색상은 CSS 변수(`:root`)로만 정의하고, 컴포넌트는 이 변수만 참조한다(하드코딩 색상 금지). 배지·분면 헤더 색상은 **연한 배경 + 진한 전경** 조합으로 WCAG AA(≥4.5:1) 대비를 만족하도록 설계했다.

### 2.1 기반(neutral / brand) 토큰

| 토큰 | HEX | 용도 |
|---|---|---|
| `--color-bg` | `#f4f6f9` | 페이지 배경 |
| `--color-surface` | `#ffffff` | 카드·폼·패널 표면 |
| `--color-surface-alt` | `#eef2f7` | 보조 표면(입력 배경, 빈 상태) |
| `--color-border` | `#d3dbe4` | 경계선 |
| `--color-text` | `#1f2933` | 기본 텍스트(대비 12:1+) |
| `--color-text-muted` | `#556170` | 보조 텍스트/캡션 |
| `--color-primary` | `#2457d6` | 주요 액션(등록 버튼, 활성 필터) |
| `--color-primary-hover` | `#1c46ac` | primary hover/active |
| `--color-primary-contrast` | `#ffffff` | primary 위 전경 |
| `--color-focus` | `#1c46ac` | 키보드 포커스 outline |
| `--color-danger` | `#a01722` | 삭제 액션 텍스트 |

### 2.2 4분면(quadrant) 토큰 — (urgency, importance) 매핑 (INV-4)

각 분면은 고유 색으로 구분하되, **색상만이 아니라 분면 제목·축 레이블을 병기**한다(색각 접근성). 색상 온도는 우선순위 강도(빨강=즉시 → 회색=정리)를 직관 전달.

| 분면 | (urgency, importance) | 전경 `--q*-fg` | 배경 `--q*-bg` | 강조선 `--q*-accent` | 분면 제목 |
|---|---|---|---|---|---|
| Q1 | `high` / `high` | `#a01722` | `#fde5e7` | `#e0616c` | **지금 하기** (긴급·중요) |
| Q2 | `low` / `high` | `#1c46ac` | `#dde6fb` | `#6f97e8` | **계획하기** (중요·비긴급) |
| Q3 | `high` / `low` | `#9a4a06` | `#fceadb` | `#e0a066` | **위임 검토** (긴급·비중요) |
| Q4 | `low` / `low` | `#455060` | `#e9edf2` | `#9aa6b4` | **정리 대상** (비긴급·비중요) |

> 4분면 색상은 INV-4 조합과 1:1 대응이라 축소 불가. 그 외 추가 팔레트(그라디언트·보조 강조색 등)는 도입하지 않는다.

### 2.3 상태/축 배지 토큰

| 토큰 | HEX | 용도 |
|---|---|---|
| `--badge-urgent-fg` / `--badge-urgent-bg` | `#a01722` / `#fde5e7` | 긴급도 high 배지("긴급") |
| `--badge-normal-fg` / `--badge-normal-bg` | `#455060` / `#e4e9f0` | 긴급도/중요도 low 배지("보통"/"낮음") |
| `--badge-important-fg` / `--badge-important-bg` | `#1c46ac` / `#dde6fb` | 중요도 high 배지("중요") |
| `--color-done-fg` / `--color-done-bg` | `#1f6f45` / `#dbf0e4` | 완료 상태 표기 |

---

## 3. 타이포그래피

`vanilla-static` 원칙에 따라 **system font stack** 만 사용(웹폰트 CDN·다운로드 0건).

```
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
```

| 역할 | 토큰 | size | weight | line-height | 용도 |
|---|---|---|---|---|---|
| Heading L | `--fs-h1` | 1.5rem (24px) | 700 | 1.3 | 페이지 타이틀 |
| Heading M | `--fs-h2` | 1.0625rem (17px) | 700 | 1.35 | 분면 제목 |
| Heading S | `--fs-h3` | 0.9375rem (15px) | 600 | 1.4 | task 카드 제목 |
| Body | `--fs-body` | 0.9375rem (15px) | 400 | 1.55 | 본문/설명 |
| Label | `--fs-label` | 0.875rem (14px) | 600 | 1.4 | 폼 라벨 |
| Caption | `--fs-caption` | 0.8125rem (13px) | 400 | 1.45 | 메타·배지·도움말·빈 상태 |
| Count | `--fs-count` | 1.375rem (22px) | 700 | 1.1 | 요약 카운트 숫자 |

- 최소 본문 13px 이상 유지, task 설명은 카드 내 2~3줄로 `-webkit-line-clamp` 대신 자연 줄바꿈(정보 손실 방지) 허용.

---

## 4. 레이아웃

### 4.1 라우트 · 엔트리 (INV-1)

- 라우트: **정확히 `/demo/priority-matrix`**. 정적 서빙 규약(root-relative-static)상 엔트리 파일은 `demo/priority-matrix/index.html`.
- 진입 즉시 오류 없이 렌더: localStorage 파싱 실패 시에도 빈 배열로 폴백해 4분면 골격을 그린다(§7.3).

> ℹ️ **ownership 교정 필요(fail-honest)**: 본 designer task 의 owned_paths 는 `docs/design/**` 이며, 실제 SPA 엔트리 `demo/priority-matrix/index.html` 는 본 task 범위 밖(dev 담당)이다. 본 문서는 그 엔트리의 시각/구조 계약만 기술하고 코드는 생성하지 않는다. dev task 에 `demo/priority-matrix/**` ownership 이 배정되어야 한다.

### 4.2 섹션 구조 (DOM/시각 순서)

```
┌───────────────────────────────────────────────────────────┐
│ Header  (h1 "우선순위 매트릭스" + 요약 [전체 N][진행 N][완료 N])│
├───────────────────────────────────────────────────────────┤
│ 등록 폼 (제목·설명·긴급도·중요도·추가 버튼) — 가로 1행       │
├───────────────────────────────────────────────────────────┤
│ 필터 바 (segmented: 전체 / 진행 / 완료)                      │
├──────────────────────────┬────────────────────────────────┤
│ Q1 지금 하기 (urgent·imp) │ Q2 계획하기 (imp·not urgent)     │
│  [task 카드…] / 빈 상태   │  [task 카드…] / 빈 상태          │
├──────────────────────────┼────────────────────────────────┤
│ Q3 위임 검토 (urgent·low) │ Q4 정리 대상 (not urgent·low)    │
│  [task 카드…] / 빈 상태   │  [task 카드…] / 빈 상태          │
└──────────────────────────┴────────────────────────────────┘
     ↑ 좌상=Q1  우상=Q2 / 좌하=Q3  우하=Q4  (축 레이블: 상단=긴급도, 좌측=중요도)
```

축 안내: 매트릭스 상단에 "→ 긴급함 / 긴급하지 않음", 좌측에 "↑ 중요함 / 중요하지 않음" 방향 레이블을 배치해 분면 의미를 명시.

### 4.3 반응형 브레이크포인트 (INV-6)

| 브레이크포인트 | 조건 | 매트릭스 | 등록 폼 | 필터 |
|---|---|---|---|---|
| **데스크톱** | `≥768px` | 2×2 그리드 (`grid-template-columns: 1fr 1fr`), 축 레이블 표시 | 필드 가로 1행(제목 flex-grow) | segmented 가로 3버튼 |
| **모바일** | `<768px` | 1열 세로 스택 (Q1→Q2→Q3→Q4 순, 각 분면 제목이 축 의미 대체), 방향 축 레이블 숨김 | 필드 세로 스택(전체폭) | segmented 전체폭 3등분 유지 |

- 그리드 전환은 CSS `@media (max-width: 767px)` 단일 분기.
- 모바일에서도 분면 순서는 우선순위 순(Q1→Q4)을 유지해 스크롤 상단이 곧 최우선.
- 컨테이너 max-width 1100px 중앙 정렬.

### 4.4 spacing / radius / elevation 토큰

| 토큰 | 값 | 토큰 | 값 |
|---|---|---|---|
| `--space-1` | 4px | `--radius-sm` | 6px |
| `--space-2` | 8px | `--radius-md` | 10px |
| `--space-3` | 12px | `--radius-lg` | 14px |
| `--space-4` | 16px | `--shadow-card` | `0 1px 2px rgba(31,41,51,.06), 0 1px 3px rgba(31,41,51,.08)` |
| `--space-5` | 24px | `--focus-ring` | `0 0 0 3px rgba(28,70,172,.35)` |

---

## 5. 4분면 매핑 (INV-4 — 절대 고정)

task 는 `(urgency, importance)` 조합으로 **정확히 하나의** 분면에 배치된다. 조합 순서는 계약과 동일(`high/high`, `low/high`, `high/low`, `low/low`).

| urgency | importance | 분면 | 시각 위치(데스크톱) | 행동 지침 문구 |
|---|---|---|---|---|
| `high` | `high` | **Q1 지금 하기** | 좌상 | "즉시 처리하세요" |
| `low` | `high` | **Q2 계획하기** | 우상 | "일정을 잡으세요" |
| `high` | `low` | **Q3 위임 검토** | 좌하 | "위임하거나 빠르게 처리" |
| `low` | `low` | **Q4 정리 대상** | 우하 | "제거를 검토하세요" |

- 완료(`done:true`) task 도 원래 분면에 남되 시각적으로 완료 처리(§6.4). 필터 '진행'에서는 숨김.
- 각 분면 헤더에 분면 제목 + 해당 분면 task 개수 배지 표시.

---

## 6. 컴포넌트 명세

각 컴포넌트는 **props(입력) / 상태(state) / 인터랙션**을 기술한다. dev 는 순수 렌더 함수 + 이벤트 핸들러로 구현(구현 형태는 dev 재량).

### 6.1 요약 헤더 (SummaryHeader)

| 항목 | 내용 |
|---|---|
| props | `counts:{ total:number, active:number, done:number }` |
| 상태 | 정적(현재 task 배열에서 파생). 필터와 무관하게 전체 기준 |
| 인터랙션 | 없음(표시 전용) |
| 구성 | h1 타이틀 + 3개 카운트 칩(전체/진행/완료). `--fs-count` 숫자 + caption 라벨 |

### 6.2 등록 폼 (TaskForm) — 데이터 모델 INV-3

| 항목 | 내용 |
|---|---|
| props | `onSubmit(payload)`, `error?:string` |
| 필드 | 제목(text, 필수) · 설명(textarea, 선택) · 긴급도(select: 긴급함=high / 보통=low, 기본 high) · 중요도(select: 중요함=high / 낮음=low, 기본 high) |
| 생성 스키마 | 제출 시 `{ id, title, description, urgency, importance, done:false, createdAt }` 생성. **INV-3 필드만** — 추가 필드 금지. `id` 는 dev 재량 유일값(예: `crypto.randomUUID()` 또는 timestamp+seq), `createdAt` 은 `Date.now()` |
| 상태 | `idle` / `invalid`(title 빈 값 → 인라인 오류 `aria-invalid` + `aria-describedby`) / `error`(저장 실패 배너) |
| 유효성 | title trim 후 1자 이상 필수. description 은 선택(빈 문자열 허용). urgency/importance 는 select 라 항상 유효 |
| 인터랙션 | 제출 → 해당 분면에 카드 추가 + 폼 리셋 + `aria-live` assertive "할 일이 추가되었습니다". title 미입력 시 제출 차단 + 첫 오류 필드로 포커스 |

### 6.3 필터 바 (StatusFilter) — INV-5

| 항목 | 내용 |
|---|---|
| props | `value:'all'\|'active'\|'done'`, `onChange(value)` |
| 컨트롤 | segmented control 3버튼: **전체** / **진행**(done=false) / **완료**(done=true). `role="radiogroup"`, 각 버튼 `role="radio"` + `aria-checked` |
| 결합 규칙 | 필터는 4분면 전체에 동시 적용. '진행'=미완료만, '완료'=완료만, '전체'=모두 |
| 상태 | 활성 버튼 `--color-primary` 배경 + `--color-primary-contrast` 전경. 필터 변경 시 각 분면 목록 즉시 재렌더 |
| 인터랙션 | 클릭/Enter/Space + 좌우 화살표로 라디오 이동. 변경 시 `aria-live` polite "N개 항목 표시" |

### 6.4 task 카드 (TaskCard)

| 항목 | 내용 |
|---|---|
| props | `task:{id,title,description,urgency,importance,done,createdAt}`, `onToggleDone(id)`, `onDelete(id)` |
| 표시 | 완료 체크박스 + title(h3) + description(있으면 caption) + 긴급/중요 배지 2개 + 삭제 버튼 |
| 완료 상태 | `done:true` 시 title `text-decoration:line-through` + `--color-text-muted` + 카드 좌측에 `--color-done-*` 완료 표시(색상+취소선 이중 인코딩) |
| 인터랙션 | 완료 체크박스 토글 → `onToggleDone` → `aria-live` polite "완료로 표시/진행으로 표시". 삭제 버튼(`aria-label="삭제: {title}"`) → `onDelete` → 카드 제거 + `aria-live` "삭제되었습니다" |
| 접근성 | 체크박스 네이티브 `<input type="checkbox">` + `<label>`. 삭제는 `<button>`, 텍스트 아이콘(×)만이 아니라 `aria-label` 로 대상 명시 |

### 6.5 분면 컨테이너 (QuadrantPanel)

| 항목 | 내용 |
|---|---|
| props | `quadrant:'q1'\|'q2'\|'q3'\|'q4'`, `title`, `hint`, `tasks:Task[]`, 카드 핸들러 전달 |
| 헤더 | 분면 제목(h2) + 행동 지침 힌트(caption) + task 개수 배지. §2.2 분면 토큰으로 헤더 배경/전경/강조선 |
| 목록 | 필터 통과 task 카드 목록(createdAt 오름차순 렌더 권장). 0건 시 EmptyState |
| 빈 상태(INV-6) | 필터별 명확한 문구: 전체/진행에서 0건 → "이 분면에 할 일이 없습니다", 완료 필터 0건 → "완료된 항목이 없습니다" |

### 6.6 AriaLiveRegion

| 영역 | politeness | 갱신 내용 |
|---|---|---|
| 액션 결과 | `assertive` | 추가/삭제 "할 일이 추가되었습니다" / "삭제되었습니다" |
| 상태/필터 | `polite` | 완료 토글, 필터 변경 시 "N개 항목 표시" |

시각적으로 숨긴 `.sr-live` (`position:absolute;clip-path`) 로 상시 DOM 유지.

---

## 7. 영속 (localStorage) — INV-2 / INV-5

- 저장 키: **`brix.priority-matrix.v1`** (단일 키). 값은 task 배열 전체의 `JSON.stringify`.
- 쓰기 시점: 추가·완료 토글·삭제 등 배열 변경 직후 전체 재직렬화 저장.
- 읽기 시점: 페이지 로드 시 1회. `JSON.parse` 후 화면 렌더.
- **복원 폴백(§4.1 무오류 렌더)**: 키 부재 / `JSON.parse` 실패 / 배열 아님 → 빈 배열 `[]` 로 시작. 개별 task 가 INV-3 스키마에서 벗어나면(예: 알 수 없는 필드·`urgency` 값 이상) dev 는 방어적으로 건너뛰되 앱은 크래시하지 않는다.
- 새로고침 시 필터 값은 기본 '전체'로 초기화(필터는 세션 상태, 영속 대상 아님 — 스키마 필드 아님).

---

## 8. 접근성 명세 (키보드 포커스 순서 · aria) — INV-6

### 8.1 Tab 포커스 순서

DOM 순서를 시각 순서와 일치시키고 `tabindex` 양수 사용 금지(자연 순서 유지).

1. 등록 폼: 제목 → 설명 → 긴급도 select → 중요도 select → 추가 버튼
2. 필터: segmented(radiogroup 진입 후 좌우 화살표로 전체/진행/완료 이동, Tab 은 그룹 단위)
3. 매트릭스: Q1 → Q2 → Q3 → Q4 순, 각 분면 내 카드의 [완료 체크박스 → 삭제 버튼] 순

> 시각 배치는 2×2 그리드지만 키보드 흐름은 "등록 → 필터 → Q1~Q4" 논리 순서. 모바일 1열에서는 DOM 순서 = 시각 순서로 자연 일치.

### 8.2 포커스 가시성 · 활성화

- 모든 인터랙티브 요소는 포커스 시 `--focus-ring`(3px, `--color-focus`) outline 유지 — `outline:none` 로 제거 금지.
- 버튼/체크박스/select 는 네이티브 시맨틱 요소 사용으로 `Enter`/`Space` 활성화 기본 확보.
- 모든 폼 입력은 `<label for>` 명시 연결. select 는 옵션 텍스트로 값 의미 전달.
- 배지·완료 상태·분면은 색상 + 텍스트/취소선 이중 인코딩(색각 접근성).
- 매트릭스 그리드는 `role="group"` + `aria-label="분면: 지금 하기"` 등으로 각 분면 의미 전달. 축 레이블은 `aria-hidden` 없이 실제 텍스트로 제공.

---

## 9. dev 구현 가이드 (후속 dev task)

CSS 변수·클래스 네이밍은 **권장(가이드)** 이며 dev 재량 조정 가능(픽셀/클래스명 일치 의무 없음). 단 색상은 §2 토큰 변수만 사용(하드코딩 금지), 그리고 §0 불변식은 반드시 준수.

### 9.1 단계별 지침

1. `demo/priority-matrix/index.html` + `style.css` + `app.js`(파일 분리는 dev 재량) 생성. `<head>` 에 `<meta charset="UTF-8">` + `<title>우선순위 매트릭스</title>`.
2. `style.css` 최상단 `:root` 에 §2·§3·§4.4 토큰을 CSS 변수로 그대로 선언.
3. 마크업 골격: `<header>`(요약) → `<form class="task-form">` → `<div class="status-filter" role="radiogroup">` → `<main class="matrix" role="group">` 내부 4개 `<section class="quadrant quadrant--q1…">`.
4. 4분면 배치 함수: `task => (task.urgency + '/' + task.importance)` 를 `high/high→q1, low/high→q2, high/low→q3, low/low→q4` 로 매핑(§5). 이 매핑 테이블을 단일 상수로 두어 INV-4 를 코드에 고정.
5. localStorage: 키 상수 `const STORAGE_KEY = 'brix.priority-matrix.v1'` (§7). load/save 헬퍼 2개, save 는 배열 변경마다 호출.
6. 필터: 상태값 `all|active|done` 로 관리, 렌더 시 각 분면 task 를 필터 후 매핑.
7. aria-live 2영역(§6.6)을 `<div class="sr-live" aria-live="…">` 로 상시 배치, 이벤트 후 textContent 갱신.
8. 반응형: `@media (max-width:767px)` 단일 분기로 `.matrix` 1열, 축 레이블 숨김, 폼 세로 스택.

### 9.2 권장 CSS 변수 · 클래스명

| 대상 | 권장 이름 |
|---|---|
| 매트릭스 그리드 | `.matrix` (desktop `grid-template-columns: 1fr 1fr`) |
| 분면 | `.quadrant`, `.quadrant--q1` … `.quadrant--q4`, 헤더 `.quadrant__header`, 개수 `.quadrant__count` |
| 등록 폼 | `.task-form`, 필드 `.form-field`, 오류 `.form-error`(`--color-danger`) |
| 필터 | `.status-filter`, 버튼 `.status-filter__btn`(활성 `.is-active`) |
| task 카드 | `.task-card`(완료 `.is-done`), 제목 `.task-card__title`, 배지 `.badge` |
| 배지 | `.badge--urgent`, `.badge--normal`, `.badge--important` |
| 빈 상태 | `.quadrant__empty` |
| aria-live | `.sr-live` (시각 숨김: `position:absolute;clip-path` 등) |

### 9.3 기존 요소 보존

- 신규 모듈이므로 보존 대상 기존 UI 없음. `demo/priority-matrix/` 외부(다른 모듈·루트 설정·`package.json`) 미수정.
- INV-1~INV-6 불변식·4분면 매핑·저장 키·스키마 필드는 designer/tester 계약이므로 dev 가 변경하지 않는다.

---

## 10. mockup 참조

- **경로**: `docs/design/priority-matrix-BF-1212-mockup.html`
- 단일 self-contained HTML(외부 의존성 0건, 인라인 `<style>`, system font).
- `:root` 에 §2 컬러 토큰 변수 선언. 데스크톱 2×2 매트릭스 기본 렌더 + 모바일 1열 레이아웃 프리뷰를 별도 `<section>` 으로 병기(같은 토큰 사용).
- 포함 상태: 4분면 각각의 task 카드(진행/완료 예시) · 긴급/중요 배지 · 등록 폼(오류 상태 포함) · 상태 필터 segmented · 빈 분면 상태 · 키보드 포커스 링 시각화 · 축 레이블.
- placeholder 콘텐츠는 샘플 할 일(예: "보안 패치 배포", "분기 로드맵 초안")로 UX 의도 전달.
- **dev 는 mockup 을 참조 가이드로 사용하되 픽셀 일치 의무 없음** — §0 불변식과 §2 토큰·§5·§6 명세가 우선.

---

## 11. AC 매핑 표 (본 designer task 기준)

| # | Given | When | Then | 충족 섹션 |
|---|---|---|---|---|
| AC-1 | ui-contract(BF-1212) | 명세 작성 | `docs/design/priority-matrix-BF-1212.md` 에 4분면 레이아웃·색/토큰·상태 전이·빈 상태·반응형 규칙 기술 | §2·§4·§5·§6.4·§6.5·§4.3 |
| AC-2 | mockup | 브라우저 열람 | 목업이 데스크톱/모바일 레이아웃 + 키보드 포커스 순서를 보여줌 | §10 + §4.3·§8.1 |
| AC-3 | ui-contract 불변식 | 명세 대조 | 저장소 키·task 스키마·필터가 불변식과 일치 | §0(INV 표)·§6.2·§6.3·§7 |

---

## 12. Self-critique

1. **AC 매핑** — AC-1/2/3 을 §11 표로 명시, 각 불변식(INV-1~6)을 §0 에 섹션 매핑. ✅
2. **dev 구현 가이드** — §9 단계별 지침 + 저장 키 상수/4분면 매핑 상수/클래스명 제공, dev 가 그대로 따라 구현 가능. ✅
3. **기존 요소 보존** — 신규 모듈, 외부 미수정 명시(§9.3). ✅
4. **컴포넌트 매핑** — 요약/폼/필터/카드/분면/aria-live 6컴포넌트를 props·상태·인터랙션으로 정의(§6). INV-3 스키마 필드만 사용 고정. ✅
5. **모호함 flag** —
   - ⚠️ **ownership 교정(§4.1)**: SPA 엔트리 `demo/priority-matrix/index.html` 는 본 designer task owned_paths(`docs/design/**`) 밖. 후속 dev task 에 `demo/priority-matrix/**` ownership 배정 필요 — 본 문서는 시각/구조 계약만 확정, 코드 미생성.
   - ℹ️ `id` 생성 방식·`createdAt` 정확 형식은 스키마상 `string`/`number` 만 고정, 구체 생성 로직은 dev 재량(§6.2).
   - ℹ️ 필터 값은 localStorage 영속 대상 아님(스키마 필드 아님) — 새로고침 시 '전체' 초기화(§7).
