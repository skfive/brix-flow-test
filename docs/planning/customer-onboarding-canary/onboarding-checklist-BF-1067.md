# 고객 온보딩 체크리스트 — 기획 명세 (BF-1067)

- Jira: BF-1067
- 모듈: `customer-onboarding-canary`
- 작성자: 박기획 (planner)
- 목적: 고객 온보딩 체크리스트의 사용자 흐름·체크 항목·상태 판정 규칙을 정의하고, 외부 API 없이 결정적으로 검증 가능한 로컬 fixture 데이터 스키마를 확정한다.

> 범위 안내: 본 문서는 기획 명세만 다룬다. 실제 fixture JSON 파일, UI 컴포넌트, 라우트 구현은 후속 task(BF-1068 designer, BF-1069 developer)의 산출물이며 이 문서에서 정의한 스키마·규칙을 따른다.

---

## 1. 사용자 흐름 (User Flow)

1. 고객(customer)이 온보딩 체크리스트 페이지(`/demo/customer-onboarding-canary`)에 접속한다.
2. 화면은 로컬 fixture에서 현재 로그인된(또는 데모 선택된) 고객 1명의 체크리스트 상태를 로드한다. 외부 API 호출은 없다 — 모든 데이터는 정적 JSON fixture에서 결정적으로 로드된다.
3. 체크리스트 항목 목록이 각 항목의 완료 상태(`complete` / `incomplete` / `blocked`)와 함께 표시된다.
4. 고객은 미완료 항목 중 하나를 "완료 처리"할 수 있다 (데모 상호작용 — 실제 백엔드 반영 없이 로컬 상태만 갱신).
5. 화면 상단에는 고객의 종합 준비 상태(readiness status)와 진행률(완료 항목 수 / 필수 항목 수)이 표시된다.
6. 화면 하단에는 "다음 액션"(next action) 추천이 규칙에 따라 1개 표시된다 — 필수 미완료 항목 중 우선순위가 가장 높은 항목으로 안내한다.
7. 모든 필수 항목이 완료되면 준비 상태는 `ready`로 전환되고, 다음 액션은 "온보딩 완료" 안내로 대체된다.

### 실패/예외 케이스
- 고객 데이터가 fixture에 없는 경우(`customerId` 불일치): 화면은 "고객 정보를 찾을 수 없음" 상태를 표시하고 체크리스트를 렌더링하지 않는다.
- 체크리스트 항목 중 `blocked` 상태가 존재하는 경우: 해당 항목은 완료 처리 액션이 비활성화되고, 차단 사유(`blockedReason`)가 노출된다.
- 필수 항목이 하나도 정의되지 않은 edge case(fixture 오류): 종합 상태는 `not_started`로 처리하고 다음 액션은 "체크리스트 준비 중"으로 표시한다(방어적 fallback).

---

## 2. 체크리스트 항목 정의 (Checklist Items)

각 항목은 고정된 카탈로그(`checklistCatalog`)에서 정의되며, 고객별 진행 데이터(`customerChecklistStatus`)와 결합되어 화면에 표시된다.

| itemId | 라벨 | required | 우선순위(priority, 낮을수록 우선) | 설명 |
|---|---|---|---|---|
| `email_verification` | 이메일 인증 | true | 1 | 가입 이메일 인증 완료 여부 |
| `profile_setup` | 프로필 정보 입력 | true | 2 | 회사명·담당자 정보 등록 여부 |
| `payment_method` | 결제 수단 등록 | true | 3 | 청구를 위한 결제 수단 등록 여부 |
| `team_invite` | 팀원 초대 | false | 4 | 최소 1명 이상 팀원 초대 여부 (선택 항목) |
| `first_project_created` | 첫 프로젝트 생성 | true | 5 | 데모/실 프로젝트 1개 이상 생성 여부 |
| `security_2fa` | 2단계 인증 설정 | false | 6 | 계정 보안 2FA 활성화 여부 (선택 항목) |

- `required=true` 항목만 종합 준비 상태(readiness) 판정에 사용된다.
- `required=false` 항목은 진행률 표시에는 포함되지만 `ready` 판정 조건에는 영향을 주지 않는다.
- 우선순위(`priority`)는 "다음 액션" 추천 시 미완료 필수 항목을 정렬하는 기준이다(숫자가 작을수록 먼저 안내).

---

## 3. 상태 판정 규칙 (Status Determination Rules)

### 3.1 항목 상태(item status)
각 `(customerId, itemId)` 조합은 다음 중 하나의 상태를 가진다.

- `complete`: 완료됨 (`completedAt` 타임스탬프 존재)
- `incomplete`: 미완료, 차단 없음
- `blocked`: 미완료이며 선행 조건 미충족 또는 운영 사유로 진행 불가 (`blockedReason` 필수)

### 3.2 고객 종합 준비 상태(customer readiness status)
`requiredItems = checklistCatalog.filter(item => item.required)` 기준으로 판정한다.

| 조건 (Given) | 판정 (Then) |
|---|---|
| `requiredItems`가 비어있음 (fixture 오류) | `not_started` |
| `requiredItems` 중 완료된 항목이 0개 | `not_started` |
| `requiredItems` 중 하나 이상 `blocked` 상태 존재 (완료 항목이 0개 초과이든 아니든 무관하게 blocked가 최우선 판정) | `blocked` |
| `requiredItems` 중 일부만 완료 (0 < 완료 수 < 전체 수), `blocked` 없음 | `in_progress` |
| `requiredItems` 전체가 `complete` | `ready` |

판정 우선순위: `blocked` > `not_started`(완료 0개) > `in_progress` > `ready`. 즉 `blocked` 항목이 하나라도 있으면 다른 조건보다 우선하여 `blocked`로 판정한다.

### 3.3 진행률(progress) 계산
```
progress.requiredCompleted = requiredItems 중 status === 'complete' 개수
progress.requiredTotal     = requiredItems.length
progress.optionalCompleted = optionalItems 중 status === 'complete' 개수
progress.optionalTotal     = optionalItems.length
```
화면 표시 문구: `${requiredCompleted}/${requiredTotal} 필수 항목 완료`.

### 3.4 다음 액션(next action) 판정 규칙
1. 종합 상태가 `ready`인 경우 → 다음 액션 = `{"type": "completed", "message": "온보딩이 완료되었습니다"}`.
2. 종합 상태가 `blocked`인 경우 → `blocked` 상태인 필수 항목 중 `priority`가 가장 낮은(우선순위 가장 높은) 항목을 안내: `{"type": "resolve_block", "itemId": <해당 itemId>, "message": "<blockedReason>"}`.
3. 그 외(`not_started` 또는 `in_progress`) → `incomplete` 상태인 필수 항목 중 `priority`가 가장 낮은 항목을 안내: `{"type": "complete_item", "itemId": <해당 itemId>, "message": "<항목 라벨>을(를) 완료해주세요"}`.
4. `requiredItems`가 비어있어 위 규칙이 모두 해당 없는 경우(fixture 오류 fallback) → `{"type": "not_ready", "message": "체크리스트 준비 중입니다"}`.

---

## 4. 데이터 모델 / Fixture 스키마

외부 API 호출 없이 결정적 검증이 가능하도록, 모든 데이터는 정적 로컬 fixture(JSON)로 정의한다. 실제 파일 배치는 developer(BF-1069) 담당이며, 아래는 스키마 확정 명세다.

### 4.1 `checklistCatalog` (체크리스트 항목 카탈로그 — 전역 고정 데이터)
```json
{
  "checklistCatalog": [
    { "itemId": "email_verification", "label": "이메일 인증", "required": true, "priority": 1 },
    { "itemId": "profile_setup", "label": "프로필 정보 입력", "required": true, "priority": 2 },
    { "itemId": "payment_method", "label": "결제 수단 등록", "required": true, "priority": 3 },
    { "itemId": "team_invite", "label": "팀원 초대", "required": false, "priority": 4 },
    { "itemId": "first_project_created", "label": "첫 프로젝트 생성", "required": true, "priority": 5 },
    { "itemId": "security_2fa", "label": "2단계 인증 설정", "required": false, "priority": 6 }
  ]
}
```

### 4.2 `customers` (고객별 체크리스트 진행 데이터)
```json
{
  "customers": [
    {
      "customerId": "cust-001",
      "displayName": "그린테크 주식회사",
      "checklist": [
        { "itemId": "email_verification", "status": "complete", "completedAt": "2026-06-01T09:00:00Z" },
        { "itemId": "profile_setup", "status": "complete", "completedAt": "2026-06-01T09:10:00Z" },
        { "itemId": "payment_method", "status": "incomplete" },
        { "itemId": "team_invite", "status": "incomplete" },
        { "itemId": "first_project_created", "status": "incomplete" },
        { "itemId": "security_2fa", "status": "incomplete" }
      ]
    },
    {
      "customerId": "cust-002",
      "displayName": "블루오션 상사",
      "checklist": [
        { "itemId": "email_verification", "status": "complete", "completedAt": "2026-05-20T01:00:00Z" },
        { "itemId": "profile_setup", "status": "complete", "completedAt": "2026-05-20T01:05:00Z" },
        { "itemId": "payment_method", "status": "blocked", "blockedReason": "카드 인증 실패 — 고객센터 확인 필요" },
        { "itemId": "team_invite", "status": "incomplete" },
        { "itemId": "first_project_created", "status": "incomplete" },
        { "itemId": "security_2fa", "status": "incomplete" }
      ]
    },
    {
      "customerId": "cust-003",
      "displayName": "always-ready 데모 고객",
      "checklist": [
        { "itemId": "email_verification", "status": "complete", "completedAt": "2026-04-01T00:00:00Z" },
        { "itemId": "profile_setup", "status": "complete", "completedAt": "2026-04-01T00:05:00Z" },
        { "itemId": "payment_method", "status": "complete", "completedAt": "2026-04-01T00:10:00Z" },
        { "itemId": "team_invite", "status": "complete", "completedAt": "2026-04-01T00:15:00Z" },
        { "itemId": "first_project_created", "status": "complete", "completedAt": "2026-04-01T00:20:00Z" },
        { "itemId": "security_2fa", "status": "incomplete" }
      ]
    },
    {
      "customerId": "cust-004",
      "displayName": "not-started 데모 고객",
      "checklist": [
        { "itemId": "email_verification", "status": "incomplete" },
        { "itemId": "profile_setup", "status": "incomplete" },
        { "itemId": "payment_method", "status": "incomplete" },
        { "itemId": "team_invite", "status": "incomplete" },
        { "itemId": "first_project_created", "status": "incomplete" },
        { "itemId": "security_2fa", "status": "incomplete" }
      ]
    }
  ]
}
```

`cust-001`~`cust-004`는 아래 4개의 판정 케이스를 결정적으로 커버하도록 설계된 fixture 예시다:

| customerId | 종합 상태 기대값 | 근거 |
|---|---|---|
| `cust-001` | `in_progress` | 필수 5개 중 2개 완료, blocked 없음 |
| `cust-002` | `blocked` | 필수 항목 중 `payment_method`가 `blocked` |
| `cust-003` | `ready` | 필수 5개 전부 `complete` (선택 항목 `security_2fa`는 미완료라도 무관) |
| `cust-004` | `not_started` | 필수 항목 전부 미완료(완료 0개) |

### 4.3 필드 제약 요약
- `itemId`: string, `checklistCatalog`에 존재하는 값과 1:1 매칭 필수.
- `status`: enum `["complete", "incomplete", "blocked"]`.
- `completedAt`: `status === "complete"`일 때 필수, ISO-8601 문자열. 그 외 상태에는 존재하지 않아야 한다.
- `blockedReason`: `status === "blocked"`일 때 필수, 비어있지 않은 string. 그 외 상태에는 존재하지 않아야 한다.
- fixture는 외부 네트워크·시간(예: `Date.now()`) 의존 없이 완전히 정적이어야 결정적 테스트가 가능하다 — `completedAt` 값은 고정 문자열을 사용한다(테스트에서 현재 시각과 비교하지 않는다).

---

## 5. API 스펙 (초안 — 로컬 fixture 기반, 외부 호출 없음)

실제 백엔드 API가 아니라, 로컬 fixture를 읽어 파생 상태를 계산하는 순수 함수 인터페이스로 정의한다(외부 API 금지 정책 준수).

```
getCustomerChecklistView(customerId: string, catalog: ChecklistCatalog, customers: Customer[]): ChecklistView | null

ChecklistView = {
  customerId: string,
  displayName: string,
  items: Array<{ itemId, label, required, priority, status, completedAt?, blockedReason? }>,
  readinessStatus: "not_started" | "in_progress" | "blocked" | "ready",
  progress: { requiredCompleted, requiredTotal, optionalCompleted, optionalTotal },
  nextAction: { type: "completed" | "resolve_block" | "complete_item" | "not_ready", itemId?, message }
}
```
- `customerId`가 `customers`에 없으면 `null` 반환 → 화면은 "고객 정보를 찾을 수 없음" 상태 렌더링(§1 실패 케이스).

---

## 6. 수용 기준(AC) 매핑

| AC | 매핑 근거 |
|---|---|
| AC1: 체크리스트 항목·고객별 준비 상태·다음 액션 판정 규칙이 문서로 정의된다 | §2 체크리스트 항목 카탈로그, §3.2 준비 상태 판정 규칙, §3.4 다음 액션 판정 규칙에서 Given/When/Then 형태로 정의 |
| AC2: 외부 API 금지 정책 하에 결정적 로컬 fixture 스키마와 예시 데이터가 명세에 포함된다 | §4 fixture 스키마(`checklistCatalog`, `customers`) 및 4개 고객 예시 데이터, §4.3 정적성 제약(고정 timestamp, 네트워크/시간 의존 배제) |
| AC3: 수용 기준 4항목이 각각 검증 가능한 형태로 매핑된다 | 본 §6 테이블 자체가 매핑 결과이며, §4.2 표는 fixture 예시별 기대 판정값을 명시해 `node --test`로 결정적 검증 가능하도록 설계 |

---

## 7. 후속 페르소나를 위한 참고 사항

- designer(BF-1068): §1 사용자 흐름, §2 항목 라벨, §3.2/§3.4 상태·액션 문구를 기반으로 화면 시안 작성 가능.
- developer(BF-1069): §4의 스키마를 그대로 fixture JSON 파일로 구현하고, §5 함수 시그니처를 참고해 `getCustomerChecklistView`류 로직 구현 권장. 실제 파일 경로는 developer 담당 영역(`src/demo/customer-onboarding-canary/**`, `demo/customer-onboarding-canary/**`)에 배치.
- tester(BF-1071): §4.2 표의 4개 고객(cust-001~004) 기대 판정값을 결정적 단위 테스트 케이스로 그대로 사용 가능.
