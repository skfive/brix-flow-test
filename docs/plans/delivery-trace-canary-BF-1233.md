# 납품 추적 상태 보드 — 실행 설계 동결 (BF-1233 / dispatch BF-1236)

> 이 문서는 **frozen blueprint**(`planning-contract@v1`, `ui-contract@v1`)를 실행 설계로 렌더링한 것이다.
> planner는 파일·소유자·상태 계약을 **재정의하지 않으며**, 새 파일·역할·요구사항을 추가하지 않는다.
> designer(BF-1234)와 developer(BF-1235)는 아래 동결값을 그대로 소비한다.

---

## 1. 목적 (Objective)

Requirement→Design→Implementation→Review→Test 5단계 납품 추적을 하나의 상태 보드로
가시화하여, PM이 분해한 산출물의 **추적 연결 상태**와 **누락 evidence**를 결정론적으로 보여준다.
designer/developer가 재정의 없이 병렬 소비할 수 있도록 selector·상태 텍스트·토큰·접근성·반응형을 exact 계약으로 동결한다.

---

## 2. 사용자 시나리오 (User Scenarios)

- **S1. 추적 현황 조회**: 운영자가 보드를 열면 5개 단계 카드가 세로/2단으로 표시되고, 각 단계의 완료·대기·누락 상태를 색상과 텍스트로 동시에 확인한다.
- **S2. 단계 상세 확인**: 운영자가 특정 단계 카드를 선택하면 상세 패널에 해당 단계의 evidence 링크와 상태 텍스트가 표시된다.
- **S3. 누락 경고 인지**: evidence가 없는 단계가 하나라도 있으면 경고 배너가 나타나 어떤 단계가 누락인지 알린다.
- **S4. 빈 데이터**: 추적 항목이 없으면 빈 상태 안내가 표시되고, 필터·상세 패널은 조작 가능한 초기값으로 유지된다.

---

## 3. 요구사항 추적표 (Requirement → Design → Implementation → Review → Test)

| # | Requirement | Design | Implementation | Review | Test |
|---|-------------|--------|----------------|--------|------|
| R1 | 5단계 추적 카드 렌더 | 카드 레이아웃·토큰 (BF-1234) | `DeliveryTraceBoard.tsx` 카드 목록 | selector·토큰 준수 확인 | `delivery-trace-canary.spec.ts` 카드 렌더 |
| R2 | 단계 선택·상세 패널 | 상세 패널 UI (BF-1234) | `trace-detail-panel` 렌더 | aria-current·키보드 경로 | 선택 시 상세 노출 검증 |
| R3 | 누락 evidence 경고 | 경고 배너 UI (BF-1234) | `evidence-warning-banner` role=alert | 경고 규칙 준수 | 누락 시 배너 노출 검증 |
| R4 | 상태 필터 | 필터 컨트롤 UI (BF-1234) | `trace-stage-filter` | 키보드 탐색 | 필터 동작 검증 |
| R5 | 결정론적 fixture | — | `fixtures.ts` 스키마 준수 | 스키마 준수 확인 | fixture 기반 스냅샷 |

**추적 연결 규칙**: 각 Requirement 행은 5개 열이 모두 채워져야 "추적 완료". 어느 열이든
evidence가 비면 해당 행은 `evidence-missing`으로 표시하고 §6 경고 규칙을 발동한다.

**누락 evidence 경고 규칙**:
- 한 단계라도 evidence가 없으면 `evidence-warning-banner`(role=alert)를 노출한다.
- 배너 텍스트는 누락 단계명을 한국어 상태 텍스트(§7)로 나열한다.
- 모든 단계에 evidence가 있으면 배너는 렌더하지 않는다(DOM에서 제거).

---

## 4. 상태 모델 (State Model) — 동결

| state | 의미 | 진입 조건 | 후조건 |
|-------|------|-----------|--------|
| `ready` | 초기·정상 표시 | 추적 데이터 로드, 선택 없음 | 필터·카드 조작 가능 |
| `stage-selected` | 단계 선택됨 | 카드 클릭/Enter | 상세 패널에 선택 단계 노출, `aria-current=step` |
| `evidence-missing` | 누락 evidence 존재 | 하나 이상 단계 evidence 없음 | 경고 배너 노출 |
| `empty` | 추적 항목 없음 | fixture 항목 0건 | 빈 상태 안내, 필터/패널은 초기값 유지 |

**초기화·취소·실패 후조건 (invariant)**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(`ready`)으로
되돌리고, 주 실행 control(필터·카드 선택)을 다시 사용할 수 있어야 한다.

---

## 5. 결정론적 fixture 스키마 (`fixtures.ts`, developer 소유)

> 스키마는 planner가 동결한다. developer는 아래 형태로 **결정론적**(고정 순서·고정 값, 랜덤/시간 의존 금지) 데이터를 제공한다.

```ts
// 개념 스키마 (동결) — 실제 타입 정의·export는 developer가 fixtures.ts에 구현
type TraceStage = 'requirement' | 'design' | 'implementation' | 'review' | 'test';

interface StageCell {
  stage: TraceStage;
  status: 'complete' | 'pending' | 'missing'; // 토큰 매핑: §7
  evidenceLabel: string;   // 예: "BF-1234 카드 레이아웃"
  evidenceHref: string | null; // null 이면 missing 후보
}

interface TraceRow {
  id: string;              // 결정론적 고정 id, 예: "R1"
  requirement: string;     // 요구사항 한 줄
  stages: StageCell[];     // 길이 5, 순서 고정: requirement→design→implementation→review→test
}

interface TraceFixture {
  rows: TraceRow[];        // 빈 배열이면 상태 = empty
}
```

- `rows` 순서·각 `stages` 순서는 **고정**한다(정렬 비결정성 금지).
- `status='missing'` 또는 `evidenceHref===null`인 셀이 하나라도 있으면 §6 경고 규칙 발동.

---

## 6. Exact UI 계약 (동결 — designer/developer 변경 금지)

### 6.1 파일 소유권 (frozen blueprint 권위)

| 파일 | 소유자 | 정책 |
|------|--------|------|
| `apps/web/src/demo/delivery-trace-canary/DeliveryTraceBoard.tsx` | developer | additive |
| `apps/web/src/demo/delivery-trace-canary/fixtures.ts` | developer | additive |
| `apps/web/src/demo/delivery-trace-canary/index.ts` | developer | additive |
| `apps/web/src/demo/delivery-trace-canary/styles.css` | developer | additive |
| `docs/design/delivery-trace-canary-BF-1233.md` | designer | additive |

> planner 문서는 위 소유권·상태 계약을 재정의하지 않으며, frozen blueprint가 유일한 권위이다.

### 6.2 DOM ID (동결)

| domId | 용도 |
|-------|------|
| `delivery-trace-board` | 보드 루트 컨테이너 |
| `trace-stage-filter` | 상태 필터 컨트롤 |
| `trace-detail-panel` | 선택 단계 상세 패널 |
| `evidence-warning-banner` | 누락 evidence 경고 배너 (role=alert) |

### 6.3 CSS class (동결)

| cssClass | 용도 |
|----------|------|
| `delivery-trace` | 보드 스타일 루트 |
| `delivery-trace__stage` | 단계 카드 |
| `delivery-trace__stage--complete` | 완료 단계 카드 modifier |
| `delivery-trace__stage--missing` | 누락 단계 카드 modifier |
| `delivery-trace__detail` | 상세 패널 내부 |

### 6.4 디자인 토큰 (동결 값)

| 토큰 | 값 | 매핑 |
|------|-----|------|
| `--color-trace-complete` | `#15803d` | status=complete |
| `--color-trace-missing` | `#b91c1c` | status=missing |
| `--color-trace-pending` | `#a16207` | status=pending |
| `--space-trace-gap` | `16px` | 카드·패널 간격 |

### 6.5 접근성 (동결)

- 상태 필터(`trace-stage-filter`)와 상세 패널(`trace-detail-panel`)은 키보드(Tab/Enter/화살표)만으로 탐색 가능하다.
- 누락 evidence 경고 배너(`evidence-warning-banner`)는 `role=alert`와 명시적 `aria-label`을 가진다.
- 선택된 단계 카드는 `aria-current=step`으로 선택 상태를 노출한다.
- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다(§7).

### 6.6 반응형 (동결)

- **320px 이상**: 상태 보드가 가로 overflow 없이 세로 스택으로 재배치된다.
- **768px 이상**: 단계 카드 목록과 상세 패널이 2단 레이아웃으로 표시된다.

---

## 7. 상태 텍스트 & 한국어/영문 용어 표기 규칙 (동결)

각 상태는 **색상 + 화면 텍스트 + 접근성 이름**을 함께 노출한다.

| status/state | 화면 텍스트 (한국어 primary) | 접근성 이름 (aria-label) | 영문 병기 규칙 |
|--------------|------------------------------|--------------------------|----------------|
| `complete` | 완료 | "완료(Complete)" | 상태명 한국어 우선, 괄호 안 영문 병기 |
| `pending` | 진행 중 | "진행 중(Pending)" | 동일 |
| `missing` | 누락 | "누락(Missing)" | 동일 |
| state=`ready` | 준비됨 | "준비됨(Ready)" | 동일 |
| state=`stage-selected` | 선택됨 | "선택됨(Selected)" | 동일 |
| state=`empty` | 추적 항목 없음 | "추적 항목 없음(Empty)" | 동일 |
| 경고 배너 | "누락 evidence: {단계명 나열}" | "누락 evidence 경고" | 단계명은 한국어(요구사항/설계/구현/검토/테스트) |

**단계명 표기 (TraceStage → 화면 텍스트)**:
`requirement`=요구사항, `design`=설계, `implementation`=구현, `review`=검토, `test`=테스트.

**표기 원칙**: 화면 텍스트는 한국어를 primary로 노출하고, 접근성 이름에 `한국어(English)` 형식으로 영문을 병기한다.
기술 식별자(domId, cssClass, 토큰, status 값)는 원문(영문) 그대로 유지한다.

---

## 8. Edge case · 실패 케이스

- **EC1. fixture 0건** → state=`empty`, 빈 안내 노출, 필터/패널은 초기값 유지(조작 가능).
- **EC2. 전 단계 evidence 존재** → 경고 배너 미렌더(DOM 제거), state는 `ready`.
- **EC3. 일부 단계 누락** → state=`evidence-missing`, 배너 role=alert 노출, 누락 단계명 나열.
- **EC4. 선택 후 재초기화/취소** → state를 `ready`로 되돌리고 상세 패널을 초기값으로 복귀(§4 후조건).
- **EC5. 320px 미만 미보장** → 계약은 320px 이상만 보장; 그 미만은 세로 스택 best-effort.
- **EC6. evidenceHref=null** → 해당 셀 status=`missing`으로 취급, 링크 대신 상태 텍스트만 노출.

---

## 9. Acceptance Criteria (Given/When/Then)

- **AC1 (추적표·상태 모델)**
  - Given 5개 요구사항 행 fixture가 로드되면
  - When 보드를 렌더하면
  - Then Requirement→Design→Implementation→Review→Test 추적 연결과 각 단계 status가 §4 상태 모델대로 표시된다.
- **AC2 (누락 경고)**
  - Given 한 단계라도 evidence가 없으면
  - When 보드를 렌더하면
  - Then `evidence-warning-banner`(role=alert, aria-label)가 누락 단계명을 한국어로 나열한다.
- **AC3 (단계 선택)**
  - Given ready 상태에서
  - When 단계 카드를 Enter/클릭으로 선택하면
  - Then `trace-detail-panel`에 상세가 노출되고 카드에 `aria-current=step`이 부여된다.
- **AC4 (접근성)**
  - Given 마우스를 쓰지 않을 때
  - When Tab/Enter/화살표만으로 조작하면
  - Then 필터·카드·상세 패널을 모두 탐색·선택할 수 있고, 상태는 색상+텍스트로 동시에 구분된다.
- **AC5 (반응형)**
  - Given 뷰포트 폭이 320px/768px일 때
  - When 보드를 렌더하면
  - Then 320px에서 가로 overflow 없이 세로 스택, 768px에서 카드+상세 2단 레이아웃으로 배치된다.
- **AC6 (결정론)**
  - Given 동일 fixture로
  - When 보드를 두 번 렌더하면
  - Then rows·stages 순서와 표시가 동일하다(랜덤/시간 의존 없음).
- **AC7 (빈 상태)**
  - Given fixture 항목이 0건이면
  - When 보드를 렌더하면
  - Then state=`empty` 안내가 표시되고 필터·패널은 초기값으로 조작 가능하다.

---

## 10. 역할별 Work Packet 소비 안내

- **designer (BF-1234)** — `docs/design/delivery-trace-canary-BF-1233.md`에 §6 UI 계약(selector·토큰·접근성·반응형)을 그대로 시안화한다. domId/cssClass/토큰/상태 텍스트를 변경·재정의하지 않는다.
- **developer (BF-1235)** — `DeliveryTraceBoard.tsx`/`fixtures.ts`/`index.ts`/`styles.css`를 §5 fixture 스키마와 §6 계약대로 additive 구현한다.
- **tester (BF-1238)** — `apps/web/tests/demo/delivery-trace-canary.spec.ts`로 AC1~AC7을 검증한다.

> 검증 권위 명령: `node --test demo/delivery-trace-canary/tests/*.test.js`

---

## 11. Ownership 교정 주의 (fail-honest)

repo convention capsule에 따르면 요청 route(`/demo/delivery-trace-canary`)의 expected_entry_path
(`demo/delivery-trace-canary/index.html`)는 현재 planner owned_paths에 포함되지 않는다.
planner는 owned 문서(`docs/plans/...`)만 작성했으며, **entry/구현 파일 소유권은 frozen blueprint의 file_owner
(developer/designer)** 를 따른다. planner가 구현 경로를 만들지 않는다.
