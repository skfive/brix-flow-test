# SLA 위반 대응 큐 — 기획 명세 (BF-1055)

- 페이지: `/sla-breach-triage-canary`
- 관련 Task: BF-1055 (planner, 본 문서) · BF-1056 (designer) · BF-1057 (developer) · BF-1059 (tester)
- 범위: 외부 네트워크 호출 / 신규 DB 없음. 정적 fixture 데이터 + 브라우저 로컬 상태 전이(in-memory)만으로 동작.

## 1. 목적

SLA(서비스 수준 협약)를 위반했거나 위반 임박한 요청을 한 화면에서 확인하고,
운영자가 **우선순위 확인 → 담당 지정 → 해결 처리** 순서로 대응할 수 있도록 하는 정적 트리아지(triage) 큐 페이지를 기획한다.
백엔드/실시간 연동은 이번 범위에 포함하지 않으며, 페이지 로드시 주입되는 고정 fixture 데이터를 화면 상태(state)로만 다룬다.

## 2. 사용자 시나리오

1. **우선순위 확인**: 운영자가 `/sla-breach-triage-canary` 페이지에 진입하면, 미해결(대기/담당지정) 요청이 위험도·SLA 초과 시간 기준으로 정렬된 큐를 본다.
2. **담당 지정**: 운영자가 대기 중인 항목을 선택해 담당자를 지정하면, 해당 항목은 "담당지정" 상태로 전환되고 큐 상단 근처(위험도 순서 유지)에서 담당자 이름과 함께 표시된다.
3. **해결 처리**: 운영자가 담당지정 상태인 항목에 해결 메모를 입력하고 해결 처리하면, 해당 항목은 "해결" 상태로 전환되어 별도의 "해결됨" 섹션으로 이동한다.

## 3. 데이터 모델 (정적 fixture 스키마)

fixture 는 프론트엔드 로컬 상태의 초기값으로만 사용되며, 아래 스키마를 따르는 고정 배열(JSON 또는 TS 상수)이다.

```ts
type SlaSeverity = "critical" | "high" | "medium" | "low";
type SlaStatus = "pending" | "assigned" | "resolved";

interface SlaBreachRequest {
  id: string;                 // 고유 ID, 예: "SLA-1001"
  title: string;               // 요청 요약 (예: "결제 API 응답 지연")
  customer: string;             // 고객/조직명
  severity: SlaSeverity;        // 위험도
  breachedAt: string;            // ISO 8601, SLA 위반(또는 위반 임박) 발생 시각
  slaMinutesOverdue: number;      // SLA 기준 초과 경과 분. 아직 위반 전(임박)이면 0 이하 허용하지 않고 0으로 표기
  status: SlaStatus;              // 현재 상태. fixture 초기값은 "pending" 또는 "assigned"만 허용(해결 건은 실 데이터 검증용 예시 1건 정도는 "resolved"로 시드 가능)
  assignee: string | null;         // 담당자 이름. pending 이면 반드시 null
  assignedAt: string | null;        // ISO 8601, 담당 지정 시각. pending 이면 null
  resolutionNote: string | null;     // 해결 메모. resolved 가 아니면 null
  resolvedAt: string | null;          // ISO 8601, 해결 처리 시각. resolved 가 아니면 null
}
```

**fixture 무결성 규칙 (로드 시 가정)**
- 배열의 모든 `id` 는 유일해야 한다.
- `status === "pending"` → `assignee`, `assignedAt`, `resolutionNote`, `resolvedAt` 모두 `null`.
- `status === "assigned"` → `assignee`, `assignedAt` 은 non-null, `resolutionNote`/`resolvedAt` 은 `null`.
- `status === "resolved"` → 4개 필드(`assignee`, `assignedAt`, `resolutionNote`, `resolvedAt`) 모두 non-null.
- 위 불변식을 어기는 fixture 항목은 화면에 렌더링하지 않고 개발 콘솔에 경고만 남긴다(런타임 크래시 금지, 이번 범위는 방어적 스킵으로 충분).

## 4. 상태 전이 규칙

```
[대기 pending] --담당 지정(assignee 필수)--> [담당지정 assigned]
[담당지정 assigned] --해결 처리(resolutionNote 필수)--> [해결 resolved]
[담당지정 assigned] --담당 해제--> [대기 pending]   (edge case, 아래 4.3 참고)
[해결 resolved] --> (전이 없음, 종단 상태)
```

### 4.1 담당 지정 (pending → assigned)
- 트리거: 운영자가 대기 항목에서 담당자를 선택/입력하고 "담당 지정" 실행.
- 사전조건: 현재 상태가 `pending`, `assignee` 입력값이 공백이 아님.
- 처리: `status = "assigned"`, `assignee = 입력값`, `assignedAt = 현재 시각(ISO)`.
- 실패조건: `assignee` 공백 → 상태 변경 없이 인라인 에러 메시지 표시("담당자를 입력하세요").
- 실패조건: 이미 `assigned`/`resolved` 상태인 항목에 담당 지정 재실행 시도 → 버튼 비활성화로 원천 차단(불변식 위반 방지).

### 4.2 해결 처리 (assigned → resolved)
- 트리거: 운영자가 담당지정 항목에서 해결 메모를 입력하고 "해결 처리" 실행.
- 사전조건: 현재 상태가 `assigned`, `resolutionNote` 입력값이 공백이 아님.
- 처리: `status = "resolved"`, `resolutionNote = 입력값`, `resolvedAt = 현재 시각(ISO)`.
- 실패조건: `resolutionNote` 공백 → 상태 변경 없이 인라인 에러("해결 메모를 입력하세요").
- 실패조건: `pending` 상태에서 해결 처리 직접 실행 불가(담당 지정을 반드시 거쳐야 함) → UI 상 해결 버튼 자체를 노출하지 않음.

### 4.3 담당 해제 (assigned → pending, edge case)
- 트리거: 운영자가 담당지정 항목에서 "담당 해제" 실행(오지정 취소 용도).
- 처리: `status = "pending"`, `assignee = null`, `assignedAt = null`.
- `resolved` 상태에는 담당 해제 액션이 노출되지 않는다(종단 상태 보존).

### 4.4 종단 상태 보호
- `resolved` 항목은 읽기 전용으로 표시하며 담당 지정/해제/해결 처리 액션이 모두 비활성화·비노출된다.

## 5. 큐 정렬(우선순위) 로직

**대상 분리**: 화면은 두 섹션으로 나뉜다.
1. **대응 대기열**(미해결): `status`가 `pending` 또는 `assigned`인 항목.
2. **해결됨**: `status`가 `resolved`인 항목.

**대응 대기열 정렬 comparator (우선순위 내림차순)**, 아래 순서로 비교하며 앞 기준이 같을 때만 다음 기준으로 넘어간다(결정적 tie-break, 누락 방지):
1. `severity` 랭크: `critical(0) > high(1) > medium(2) > low(3)` — 랭크 숫자가 작을수록 먼저.
2. `slaMinutesOverdue` 내림차순 — 초과 시간이 클수록 먼저.
3. `breachedAt` 오름차순 — 더 오래된 위반이 먼저(같은 위험도·초과시간일 때 최종 tie-break).
4. 위 3개 기준이 모두 동일하면 `id` 오름차순(문자열 비교)으로 고정 순서 보장.

**해결됨 섹션 정렬**: `resolvedAt` 내림차순(최근 해결 건이 위).

**누락 방지 검증 규칙 (검증 가능한 형태)**
- 렌더링된 "대응 대기열" 건수 + "해결됨" 건수 == fixture 전체 유효 항목 수(4장 무결성 규칙을 통과한 항목 기준). 즉 모든 항목은 정확히 한 섹션에만 나타나야 하며, 어느 섹션에서도 누락되면 안 된다.
- 정렬 함수는 순수 함수(입력 배열을 변경하지 않고 새 배열 반환)여야 하며, 동일 입력에 대해 항상 동일 순서를 반환해야 한다(안정 정렬 + 완전한 tie-break 체인으로 비결정성 제거).
- 테스트(단위)에서: severity가 섞이고 slaMinutesOverdue/breachedAt이 동률인 fixture 셋을 넣었을 때 위 4단계 tie-break 순서가 그대로 나오는지 검증 가능해야 한다.

## 6. 로컬 상태 전이 범위 (결정 사항 — 타 페르소나 공지)

- 상태는 **페이지 in-memory 상태(예: 컴포넌트 state)** 로만 관리한다. `localStorage`/`sessionStorage`/서버 저장 없음.
- 새로고침 시 fixture 초기값으로 리셋되는 것은 **의도된 동작**이다(Simplicity First — 영속화는 이번 범위 밖).
- 외부 API/네트워크 호출 없음. "담당 지정"/"해결 처리"/"담당 해제"는 로컬 상태를 갱신하는 순수 함수 호출로 구현한다(아래 6.1 인터페이스).

### 6.1 로컬 액션 인터페이스 (실제 백엔드 API 아님 — 프론트 내부 함수 스펙)

```ts
type ActionResult =
  | { ok: true; data: SlaBreachRequest }
  | { ok: false; error: string };

function assignRequest(
  requests: SlaBreachRequest[],
  requestId: string,
  assignee: string,
  now: string // 호출 시점 ISO 시각 (테스트 용이성을 위해 외부 주입)
): ActionResult;

function resolveRequest(
  requests: SlaBreachRequest[],
  requestId: string,
  resolutionNote: string,
  now: string
): ActionResult;

function unassignRequest(
  requests: SlaBreachRequest[],
  requestId: string
): ActionResult;

function sortQueue(requests: SlaBreachRequest[]): {
  pendingQueue: SlaBreachRequest[]; // pending + assigned, 5장 comparator 적용
  resolvedQueue: SlaBreachRequest[]; // resolved, resolvedAt desc
};
```

- `now` 를 외부 주입 인자로 둔 이유: 브라우저 `Date.now()`에 직접 의존하면 단위 테스트에서 결정적 검증이 어려움. 개발자는 호출부에서 실제 시각을 넘기고, 테스트에서는 고정 문자열을 넘겨 검증한다.

## 7. Acceptance Criteria (Given/When/Then)

### AC-1 (Epic 원본)
- Given fixture 로 SLA 요청 목록이 로드되어 있을 때
- When 기획 명세를 기준으로 화면이 구현되면
- Then `SlaBreachRequest` 스키마(3장)와 `pending → assigned → resolved` 상태 전이 규칙(4장)이 문서·구현 양쪽에서 확인 가능하다.

### AC-2 (Epic 원본)
- Given 위험도(severity)와 SLA 초과 시간이 서로 다른 여러 요청이 대기열에 있을 때
- When 큐가 정렬되면
- Then 5장의 4단계 comparator 순서(위험도→초과시간→위반시각→id)로 정렬되고, "대응 대기열 + 해결됨 건수 == 전체 유효 항목 수" 검증으로 누락이 없음을 확인할 수 있다.

### AC-3
- Given 대기(pending) 항목에서 담당자 입력 없이 "담당 지정"을 누를 때
- When 유효성 검사가 실행되면
- Then 상태는 `pending`으로 유지되고 "담당자를 입력하세요" 에러가 표시된다.

### AC-4
- Given 담당지정(assigned) 항목에서 해결 메모 없이 "해결 처리"를 누를 때
- When 유효성 검사가 실행되면
- Then 상태는 `assigned`로 유지되고 "해결 메모를 입력하세요" 에러가 표시된다.

### AC-5
- Given 해결(resolved) 상태인 항목일 때
- When 사용자가 해당 항목을 조작하려고 하면
- Then 담당 지정/담당 해제/해결 처리 액션이 노출되지 않거나 비활성화되어 종단 상태가 보존된다.

### AC-6 (담당 해제 edge case)
- Given 담당지정(assigned) 항목에서 "담당 해제"를 누를 때
- When 처리가 실행되면
- Then 상태는 `pending`으로 되돌아가고 `assignee`/`assignedAt`은 `null`로 초기화된다.

### AC-7 (빈 큐 edge case)
- Given fixture 의 모든 항목이 이미 `resolved` 상태일 때
- When 대응 대기열 섹션을 렌더링하면
- Then "대응 대기열" 섹션은 빈 상태(empty state) 문구를 표시하고 크래시 없이 "해결됨" 섹션만 채워진다.

### AC-8 (fixture 무결성 위반 edge case)
- Given fixture 항목 중 3장 무결성 규칙을 위반하는 항목(예: `pending`인데 `assignee`가 채워진 경우)이 있을 때
- When 페이지가 로드되면
- Then 해당 항목은 렌더링에서 제외되고 나머지 유효 항목은 정상 렌더링되며 페이지는 크래시하지 않는다.

## 8. 비목표 (Non-goals)

- 실시간 서버 동기화, 웹소켓, 폴링 등 네트워크 연동.
- 다중 사용자 동시 편집/충돌 해결.
- 상태 영속화(localStorage, DB 저장, 새로고침 후 상태 유지).
- 담당자 목록 관리(계정 시스템) — 담당자는 자유 텍스트 입력으로 충분.

## 9. 다른 페르소나 공지 사항

- **designer(BF-1056)**: 화면은 "대응 대기열" / "해결됨" 2섹션 레이아웃, 항목별 위험도 배지·SLA 초과 시간·담당자 입력/표시, 인라인 에러 메시지 영역 필요.
- **developer(BF-1057)**: fixture는 정적 데이터(예: `src/app/sla-breach-triage-canary/fixtures` 하위)로 두고, 6.1 인터페이스대로 순수 함수로 상태 전이를 구현. `now` 외부 주입 패턴으로 테스트 용이성 확보.
- **tester(BF-1059)**: 7장 AC-1~AC-8을 단위/통합 테스트 대상으로 사용. 특히 AC-2(정렬 tie-break), AC-7(빈 큐), AC-8(무결성 위반 방어) 케이스 우선 검증 권장.
