# 릴리스 변경 승인 큐 (`/release-approval-canary`) 기획 명세

- Jira: BF-1061 (본 명세) · 관련 Epic 형제 task: BF-1062(designer) · BF-1063(developer) · BF-1065(tester)
- 작성: 박기획 (planner)
- 상태: Draft v1 — 후속 designer/developer 작업의 입력 문서

## 1. 배경 및 목표

운영자가 위험도가 높은 배포(릴리스) 후보를 한 화면(`/release-approval-canary`)에서 검토하고
**승인(approve)** 또는 **보류(hold)** 로 결정한다. 이 결정은 화면을 벗어나거나 새로고침해도
추적할 수 있도록 상태 전이 기록(decision history)으로 남아야 하며, 어떤 경로로도 결정이 유실되어서는
안 된다.

### 1.1 범위 전제 (반드시 지킬 것)

- **외부 네트워크 호출 없음**: 실제 배포 API, 서버, 원격 저장소를 호출하지 않는다.
- **신규 DB 없음**: 서버 측 영속 저장소를 신설하지 않는다.
- **브라우저 로컬 상태 전이만 사용**: 화면의 릴리스 후보 목록·상태·결정 이력은 모두 브라우저 런타임
  메모리(및 필요 시 `localStorage` 같은 브라우저 내장 저장소) 상의 상태 전이로만 구현한다.
- **결정적(deterministic) fixture**: 후보 데이터는 고정된 정적 fixture에서 로드한다. `Date.now()`,
  `Math.random()`, `new Date()`(인자 없이) 등 실행마다 값이 달라지는 API를 fixture 생성/정렬 로직에
  사용하지 않는다 — 동일 입력에 항상 동일 출력(정렬 순서 포함)이 나와야 테스트가 재현 가능하다.

이 전제는 designer(BF-1062)·developer(BF-1063)·tester(BF-1065) 모두에 적용된다.

## 2. 사용자 시나리오

### 시나리오 A — 정상 승인 흐름

1. 운영자가 `/release-approval-canary` 화면에 진입한다.
2. 화면은 결정적 fixture에서 로드한 릴리스 후보 목록을 **우선순위 정렬 규칙**(3장)에 따라 큐 형태로
   보여준다. 각 후보는 이름/버전/위험도/대상 환경/제출자/현재 상태를 노출한다.
3. 운영자가 미결(`pending_review`) 후보 하나를 선택해 상세를 확인한다.
4. 운영자가 "승인" 버튼을 클릭한다.
5. 해당 후보의 상태가 `approved` 로 전이되고, 결정 이력에 `{전이 전 상태, 전이 후 상태, 액션, 시각}`
   레코드가 추가된다.
6. 큐 목록이 갱신되어 승인된 후보는 더 이상 "결정 대기" 그룹에 노출되지 않는다(단, 이력/필터를 통해
   조회는 가능).

### 시나리오 B — 보류 흐름과 재검토

1. 운영자가 위험도가 높거나 정보가 불충분한 후보에 대해 "보류" 버튼을 클릭한다.
2. 상태가 `held` 로 전이되고 결정 이력에 기록된다.
3. 이후 운영자(또는 다른 운영자)가 같은 후보를 다시 검토하여 "승인" 하면 `held → approved` 로
   전이되고 이력이 누적된다.
4. 운영자가 보류를 철회하고 다시 미결 큐로 되돌리고 싶다면 "재검토 요청"을 클릭해 `held → pending_review`
   로 전이할 수 있다. 이 전이도 이력에 남는다.

### 시나리오 C — 새로고침/재방문 후 이력 확인

1. 운영자가 결정을 내린 뒤 브라우저를 새로고침하거나 화면을 재방문한다.
2. 로컬 상태(예: `localStorage`)에 저장된 상태·이력이 복원되어, 승인/보류 결정이 유실되지 않고
   그대로 유지된다.
3. 아직 로컬 저장 상태가 없는 최초 진입 시에는 결정적 fixture의 초기값(전원 `pending_review`)으로
   시작한다.

## 3. 상태 전이 (State Machine)

### 3.1 상태 정의

| 상태 | 의미 | 종류 |
|---|---|---|
| `pending_review` | 초기 상태. 아직 결정되지 않은 검토 대기 후보 | 비종결(non-terminal) |
| `held` | 운영자가 보류를 결정한 후보. 재검토 가능 | 비종결 |
| `approved` | 운영자가 승인한 후보 | 종결(terminal) — 이후 상태 전이 없음 |

### 3.2 전이표 (Given/When/Then)

| # | Given (현재 상태) | When (액션) | Then (다음 상태 + 기록) |
|---|---|---|---|
| T1 | `pending_review` | 운영자가 "승인" 결정 | → `approved`. 이력에 `{from: pending_review, to: approved, action: approve, at, actor}` 추가 |
| T2 | `pending_review` | 운영자가 "보류" 결정 | → `held`. 이력에 `{from: pending_review, to: held, action: hold, at, actor}` 추가 |
| T3 | `held` | 운영자가 "승인" 결정 | → `approved`. 이력에 `{from: held, to: approved, action: approve, at, actor}` 추가 |
| T4 | `held` | 운영자가 "재검토 요청" | → `pending_review`. 이력에 `{from: held, to: pending_review, action: reopen, at, actor}` 추가 |
| T5 | `approved` | 임의 액션(승인/보류/재검토) 시도 | 전이 없음(no-op). UI는 종결 상태임을 안내하고 버튼을 비활성화. 이력에는 기록하지 않음(전이가 발생하지 않았으므로) |

> AC1 매핑: "운영자가 위험 배포 후보를 검토, 승인/보류 결정, 누락 없이 기록되는 상태 전이" —
> 위 T1~T4 각각이 이력 레코드를 **반드시 1건씩** 추가한다. T5는 전이 자체가 없으므로 이력 미기록이
> 정상이며, 이는 "누락"이 아니라 "전이 부재"임을 명세로 구분해 둔다.

### 3.3 이력(Decision History) 레코드 스키마

```ts
type DecisionAction = "approve" | "hold" | "reopen";

interface DecisionHistoryEntry {
  candidateId: string;       // 릴리스 후보 id
  from: "pending_review" | "held";
  to: "approved" | "held" | "pending_review";
  action: DecisionAction;
  actor: string;              // 운영자 식별자 (fixture 상 고정 문자열도 허용, 실 인증 없음)
  at: string;                 // ISO 8601 문자열. 실행 시점이 아니라 "결정 시퀀스 번호" 기반 결정적 값
                              // 또는 화면 이벤트에 결합된 논리 클록 값 사용 — Date.now() 직접 사용 금지
  note?: string;              // 선택: 보류/재검토 사유 메모
}
```

- 이력은 후보별 배열(`decisionHistory: DecisionHistoryEntry[]`)로 append-only 유지한다. 기존 레코드
  수정·삭제 금지(감사 추적성).
- `held → pending_review → held → approved` 처럼 여러 번 오가도 매 전이마다 레코드가 남아야 하며
  최종 상태만 남기고 중간 이력을 지우면 안 된다.

## 4. 결정적 릴리스 fixture 스키마

```ts
interface ReleaseCandidateFixture {
  id: string;                 // 안정적 고유 id, 예: "rc-2026-0001"
  name: string;                // 배포 대상 서비스/기능명
  version: string;             // 예: "2026.7.1"
  targetEnvironment: "production" | "staging";
  riskScore: number;            // 0~100, 정수. 값이 클수록 고위험
  riskFactors: string[];        // 예: ["미검증 마이그레이션", "롤백 스크립트 없음"]
  requestedBy: string;          // 제출자 식별자(고정 문자열)
  submittedAt: string;          // ISO 8601, fixture에 하드코딩된 고정 시각(빌드/런타임 시각 아님)
  status: "pending_review" | "held" | "approved"; // 초기 상태(대개 전원 pending_review)
  decisionHistory: DecisionHistoryEntry[]; // 초기값은 빈 배열 []
}

interface ReleaseApprovalFixtureFile {
  fixtureVersion: 1;           // 스키마 버전. 스키마 변경 시 증가
  candidates: ReleaseCandidateFixture[];
}
```

### 4.1 fixture 작성 규칙

- 모든 `submittedAt` 값은 fixture 파일 내에 리터럴 문자열로 고정한다(코드 실행 중 생성 금지).
- `id` 는 fixture 내에서 유일해야 하며, 정렬 안정성을 위한 최종 tie-breaker로도 쓰인다(3.2/5장 참고).
- 최소 1개 이상의 `riskScore` 동률 케이스와, 최소 1개 이상의 `riskFactors` 빈 배열 케이스를 포함해
  정렬 규칙과 UI 빈 상태 처리를 함께 검증할 수 있게 한다(6장 edge case 참고).
- fixture는 정적 파일(JS/JSON 모듈)로 두고 앱 로드시 import 하여 초기 상태를 구성한다. 이후 사용자
  조작에 따른 상태 변경은 브라우저 로컬 상태(메모리 또는 `localStorage`)에서만 이뤄지고 fixture 원본
  파일 자체는 수정하지 않는다(재현성 보장).

## 5. 우선순위 정렬 규칙

큐 화면은 아래 정렬 키를 **이 순서대로** 적용해 결정 대기(`pending_review`, `held`) 후보를 정렬한다.
`approved`(종결) 후보는 기본 큐 뷰에서 제외하고 별도 "결정 완료" 목록/필터에서만 노출한다.

| 우선순위 | 정렬 키 | 방향 | 목적 |
|---|---|---|---|
| 1 | `riskScore` | 내림차순(desc) | 위험도가 높은 후보를 먼저 검토 |
| 2 | `status` (`held` 우선) | `held` → `pending_review` | 이미 한 번 보류되어 재검토가 밀린 항목을 우선 노출 |
| 3 | `submittedAt` | 오름차순(asc) | 동일 조건이면 먼저 제출된 후보를 우선(선입선출) |
| 4 | `id` | 오름차순(asc) | 위 키가 모두 동률일 때 완전한 결정적 순서 보장(tie-breaker) |

- 위 4단계 키를 모두 적용하면 동일 fixture 입력에 대해 항상 동일한 정렬 결과가 나와야 한다(결정성
  요구사항). 정렬 함수는 안정 정렬(stable sort) 또는 4번째 키까지 명시 비교자를 사용해 순서 흔들림을
  방지한다.
- `riskScore` 구간 표기(예: "고위험 90+", "중위험 60~89")는 designer(BF-1062) 시각 표현 재량이며,
  본 명세는 정렬 키 자체만 규정한다.

## 6. Edge Case · 실패 케이스

| 상황 | 기대 동작 |
|---|---|
| `approved`(종결) 후보에 승인/보류/재검토 액션 시도 | no-op, 이력 미추가, UI에서 액션 버튼 비활성화 + 안내 문구(3.2 T5) |
| 후보 목록이 빈 배열(`candidates: []`) | 큐 목록에 "검토할 릴리스 후보 없음" 빈 상태 표시, 에러 아님 |
| `riskScore` 동률 후보 다수 | 5장 tie-breaker(제출 시각→id)로 항상 동일 순서 산출 |
| `riskFactors` 빈 배열인 후보 | 위험 요인 없이도 상세/큐 표시가 깨지지 않아야 함(빈 리스트 UI 처리) |
| 브라우저 저장소(`localStorage`)가 비어있는 최초 진입 | fixture 초기값으로 상태를 구성하고, 이후 결정을 저장소에 반영 |
| 저장된 로컬 상태의 `fixtureVersion` 이 코드가 기대하는 버전과 다름 | 저장된 상태를 무시하고 fixture 초기값으로 재시작(마이그레이션 로직 신설 금지 — 범위 밖) |
| 동일 브라우저의 두 탭에서 같은 후보를 동시에 결정 | 범위 밖(외부 동기화 없음 전제) — 마지막에 저장을 완료한 탭의 로컬 상태가 유효값. 실시간 탭 간 동기화는 비목표(non-goal) |
| `decisionHistory` 가 이미 존재하는 후보에 추가 전이 발생 | 기존 레코드를 유지한 채 새 레코드를 append(덮어쓰기 금지) |

## 7. 데이터 모델 요약 (API 스펙 대체)

외부 네트워크 호출이 없으므로 REST/GraphQL API 스펙 대신, 화면 내부에서 통용되는
**로컬 상태 인터페이스**를 API 스펙에 준하는 계약으로 정의한다.

```ts
// 초기 로드: fixture → 로컬 상태로 hydrate
function loadInitialState(fixture: ReleaseApprovalFixtureFile): ReleaseCandidateFixture[];

// 정렬된 큐 조회 (5장 규칙 적용)
function selectQueue(
  candidates: ReleaseCandidateFixture[],
  filter?: "pending_review" | "held" | "approved" | "all"
): ReleaseCandidateFixture[];

// 상태 전이 (3.2 전이표 준수, 불법 전이는 no-op 반환)
function decide(
  candidates: ReleaseCandidateFixture[],
  candidateId: string,
  action: DecisionAction,
  actor: string
): ReleaseCandidateFixture[]; // 새 상태 배열(불변 업데이트) 반환
```

- `decide()` 는 순수 함수로 설계해 결정론적 테스트가 가능해야 한다(같은 입력 → 같은 출력).
- 실제 저장(`localStorage` 등) 및 렌더링 연결은 developer(BF-1063) 구현 범위.

## 8. 수용 기준 ↔ 검증 절차 매핑

| AC | 내용 | 검증 절차 |
|---|---|---|
| AC1 | Given 운영자가 위험 배포 후보를 검토, When 승인/보류 결정, Then 누락 없이 기록되는 상태 전이 표가 명세에 존재 | 본 문서 3.2 전이표(T1~T5) + 3.3 이력 스키마로 충족. developer 구현 후에는 `decide()` 를 T1~T4 각 케이스로 호출해 `decisionHistory` 길이가 매번 1씩 증가하는지 단위 테스트(tester BF-1065, `tests/release-approval-canary-*.test.js`)로 확인 |
| AC2 | Given 결정적 릴리스 fixture, When 우선순위 정렬, Then 정렬 기준(위험도 등)이 명세에 정의됨 | 본 문서 5장(riskScore desc → status(held 우선) → submittedAt asc → id asc) + 4장 fixture 스키마로 충족. 구현 후 동일 fixture로 `selectQueue()` 를 반복 호출해 항상 동일 순서가 나오는지 회귀 테스트로 확인 |
| AC3 | Given 수용 기준 4항목, When 기획 검토, Then 각 항목이 검증 가능한 확인 절차로 매핑됨 | 본 8장 표 자체가 매핑 산출물. 4항목(AC1~AC4, 본 표의 3행 + 본 항목) 모두 문서 내 구체 절차와 연결됨을 기획 검토자가 확인 |
| (범위 전제) | 외부 네트워크·신규 DB 없이 브라우저 로컬 상태 전이만 사용 | 본 문서 1.1 전제 + 7장 데이터 모델(순수 함수/로컬 hydrate)로 충족. 구현 리뷰(reviewer) 시 `fetch`/서버 API 호출 코드나 신규 스키마 마이그레이션 코드가 없는지 diff 확인으로 검증 |

> 참고: 원본 요구사항의 "수용 기준" 목록은 3항목으로 제시되었으나, 과제 설명에 명시된 "외부 네트워크·
> 신규 DB 없이 브라우저 로컬 상태 전이만" 전제도 검증 가능해야 하는 사실상의 4번째 기준이라고 판단해
> AC3의 "4항목" 표현에 맞춰 위 표에 포함했다. 이는 planner 해석이며, 이견이 있으면 PM/reviewer가
> Jira 코멘트로 조율한다.

## 9. 후속 페르소나를 위한 메모

- **designer(BF-1062)**: 3장 상태 3종(`pending_review`/`held`/`approved`) 배지, 5장 정렬 그룹(고위험
  우선) 시각화, 6장 빈 상태 화면을 목업에 반영 필요.
- **developer(BF-1063)**: 7장 순수 함수 인터페이스와 4장 fixture 스키마를 기준으로 구현. 네트워크
  호출·신규 서버 저장소 추가는 범위 밖.
- **tester(BF-1065)**: 8장 검증 절차 표를 기반으로 `tests/release-approval-canary-*.test.js` 케이스
  설계(전이 T1~T5, 정렬 tie-breaker, 빈 목록/동률/버전 없는 로컬 상태 edge case 포함).
