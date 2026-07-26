# 워크플로 펄스 대시보드 명세 (BF-1207)

## 0. 메타

| 항목 | 값 |
|---|---|
| Jira | BF-1207 |
| 작성자 | 박기획 (planner) |
| 상태 | 확정 (designer/developer/tester 참조 기준) |
| 관련 형제 Task | BF-1208 (designer), BF-1209 (developer), BF-1211 (tester) |
| 산출물 경로 | `docs/planning/workflow-pulse-BF-1207.md` |

## 1. 목적

brix-Flow 자체의 작업 파이프라인(요청 → 기획 → 구현 → 리뷰 → 테스트 → 완료)을 시각화하는 데모 대시보드 "워크플로 펄스"를 정의한다. 실제 백엔드 API 없이, **결정론적 로컬 시드 데이터**와 **버튼 클릭**만으로 상태 전이를 재현한다. 새로고침 시 모든 조작 이력은 사라지고 항상 동일한 초기 시드로 복귀한다 — 이는 버그가 아니라 "영속 저장소 없음"을 보여주는 의도된 데모 동작이다.

이번 스코프는 **상태 전이 모델 + 로컬 시나리오 데이터 구조**이며, 실제 서버 저장/실시간 동기화/다중 사용자 협업은 포함하지 않는다.

## 2. 상태 전이 모델

### 2.1 상태 enum (6단계 고정)

| 순서 | 상태 코드 | 한글 라벨 |
|---|---|---|
| 1 | `requested` | 요청 |
| 2 | `planning` | 기획 |
| 3 | `in_development` | 구현 |
| 4 | `in_review` | 리뷰 |
| 5 | `testing` | 테스트 |
| 6 | `done` | 완료 |

신규 상태 추가는 이 문서 개정 없이는 금지한다(designer/developer 임의 확장 금지).

### 2.2 상태 전이 그래프

```
requested --(ADVANCE)--> planning --(ADVANCE)--> in_development --(ADVANCE)--> in_review
                                                                                    |
                                                                    (ADVANCE) 승인  |  (REJECT) 반려
                                                                                    v
                                                            testing <---- in_review
                                                                                    |
                                                                     in_development <-- (REJECT)
testing --(ADVANCE)--> done
done: 전이 없음 (터미널 상태)
```

텍스트 표기(§2.3 전이 테이블이 authoritative source, 위 그래프는 시각적 요약일 뿐):

| 현재 상태 | 액션 | 다음 상태 |
|---|---|---|
| `requested` | `ADVANCE` | `planning` |
| `planning` | `ADVANCE` | `in_development` |
| `in_development` | `ADVANCE` | `in_review` |
| `in_review` | `ADVANCE` | `testing` |
| `in_review` | `REJECT` | `in_development` |
| `testing` | `ADVANCE` | `done` |
| `done` | (없음) | 전이 불가 (터미널) |

위 표에 없는 (상태, 액션) 조합은 **no-op**이다 — 정의되지 않은 전이는 실행하지 않고 item을 그대로 반환한다(임의 스킵/역행 금지, 예: `requested`에서 바로 `testing`으로 이동 불가).

## 3. 사용자 시나리오

1. 운영자가 `/demo/workflow-pulse` 페이지를 열면, §5 시드 데이터의 항목들이 각자의 현재 상태에 해당하는 컬럼(칸반 형태)에 분산되어 보인다. 각 컬럼 상단에는 해당 상태의 항목 개수("펄스" 카운트)가 표시된다.
2. 운영자가 특정 항목 카드의 "다음 단계로" 버튼을 클릭하면, 해당 항목만 다음 상태로 이동하고 두 컬럼(이전/다음)의 카운트가 즉시 갱신된다. 다른 항목은 영향받지 않는다.
3. 운영자가 `in_review` 상태 카드의 "반려" 버튼을 클릭하면, 해당 항목이 `in_development` 컬럼으로 되돌아간다(§2.2 반려 분기).
4. `done` 상태에 도달한 카드는 조작 버튼이 더 이상 노출되지 않고 "완료" 배지만 표시된다(터미널 상태 시각화).
5. 운영자가 여러 항목의 상태를 자유롭게 조작한 뒤 브라우저를 새로고침하면, 모든 조작 이력이 사라지고 §5 초기 시드 데이터 상태로 정확히 복귀한다.

## 4. 새로고침 시 초기화 규칙

- 상태는 **오직 in-memory(JS 모듈 변수 / DOM 렌더 상태)** 에만 보관한다. `localStorage`/`sessionStorage`/쿠키/서버 저장을 사용하지 않는다.
- 페이지 새로고침(F5, URL 재진입, 새 탭)은 항상 §5의 시드 데이터 배열로 전체 재초기화된다.
- 새로고침 없이 같은 세션 내에서는 버튼 클릭으로 인한 상태 변경이 정상적으로 유지된다(재렌더만으로 초기화되지 않음).
- 시드 데이터 자체는 결정론적 상수로 하드코딩한다 — `Date.now()`, `Math.random()`, 실행 시각 기반 값을 시드에 사용하지 않는다(매 로드마다 동일한 초기 화면 보장).

## 5. 로컬 시나리오 데이터 스펙 (시드 상수)

최초 로드 시 6개 상태 모두 최소 1개 항목이 존재해야 한다(전체 파이프라인을 한눈에 보여주기 위함). 아래 8개 항목을 시드 상수로 확정한다.

| id | title | assignee | 초기 state |
|---|---|---|---|
| `wf-1` | 로그인 실패 알림 문구 개선 요청 | 박기획 | `requested` |
| `wf-2` | 다크모드 색상 대비 조정 | 박기획 | `requested` |
| `wf-3` | 알림 배지 카운트 API 연동 기획 | 김디자 | `planning` |
| `wf-4` | 검색 필터 UI 개편 | 이개발 | `in_development` |
| `wf-5` | 결제 실패 재시도 로직 구현 | 이개발 | `in_development` |
| `wf-6` | 프로필 이미지 업로드 개선 | 최리뷰 | `in_review` |
| `wf-7` | 대시보드 위젯 정렬 저장 기능 | 정테스터 | `testing` |
| `wf-8` | 알림 이메일 발송 템플릿 정리 | 정테스터 | `done` |

각 항목은 최초 로드 시 `history` 배열을 `[초기 state]` 하나만 가진 상태로 시작한다(§6 데이터 모델 참고).

## 6. 데이터 모델 및 API 스펙 (developer 참고용 계약)

클라이언트 전용 순수 함수로 구현할 것을 권고한다. 실제 파일 위치/모듈 시스템은 §8.1의 저장소 규약(esm)을 따른다.

```ts
type WorkflowState =
  | "requested"
  | "planning"
  | "in_development"
  | "in_review"
  | "testing"
  | "done";

type WorkflowAction = "ADVANCE" | "REJECT";

interface WorkflowItem {
  id: string;
  title: string;
  assignee: string;
  state: WorkflowState;
  history: WorkflowState[]; // 지나온 상태를 순서대로 append, 최초 상태 포함
}

// 순수 함수 — 부수효과 없음, 네트워크/영속화 없음
// 표(§2.3)에 없는 (state, action) 조합은 item을 변경 없이 그대로 반환한다(no-op).
function transitionWorkflowItem(
  item: WorkflowItem,
  action: WorkflowAction
): WorkflowItem;

// §5 시드 데이터를 그대로 상수로 옮긴 초기 배열을 반환한다(매 호출 동일 결과).
function createInitialWorkflowItems(): WorkflowItem[];
```

- 전이 매핑 테이블(§2.3)은 상수로 하드코딩한다(가중치 계산/근사 로직 금지).
- `state`가 §2.1 union 밖의 값이면 정의되지 않은 상태로 간주하고 전이를 거부한다(폴백 추정 금지).

### 6.1 버튼 노출 규칙 (상태별)

| 현재 상태 | 노출 버튼 |
|---|---|
| `requested` | "기획 시작" (`ADVANCE`) |
| `planning` | "구현 시작" (`ADVANCE`) |
| `in_development` | "리뷰 요청" (`ADVANCE`) |
| `in_review` | "승인(다음 단계로)" (`ADVANCE`), "반려" (`REJECT`) |
| `testing` | "테스트 완료" (`ADVANCE`) |
| `done` | 없음 — "완료" 배지만 표시 |

## 7. 엣지 케이스 및 실패 케이스

| 케이스 | 처리 규칙 |
|---|---|
| `done` 상태 카드에서 액션 호출 시도 | 버튼 자체가 렌더링되지 않음. 방어적으로 어떤 경로로 액션이 호출되더라도 §2.3 표에 없으므로 no-op(상태 변경 없음). |
| `in_review` 이외 상태에서 `REJECT` 호출 | §2.3 표에 정의되지 않은 조합 → no-op. 에러 없이 무시한다(폴백 추정 금지). |
| 존재하지 않는 item id로 전이 시도 | 대상 없음 → 전체 목록 상태 변경 없음(no-op). |
| 버튼 연타(빠른 다중 클릭) | `transitionWorkflowItem`은 순수 함수이므로 매 클릭마다 "현재 상태" 기준으로 유효 전이만 재검증한다. 연타해도 한 번에 한 단계만 전진하며 표에 없는 결과로 건너뛰지 않는다. |
| 새로고침 타이밍(전이 애니메이션 도중 등) | 새로고침은 항상 §5 시드로 즉시 재초기화 — 진행 중 애니메이션 상태를 보존하려 하지 않는다. |
| 시드 데이터 커버리지 누락 | §5는 6개 상태 모두 최소 1개 항목을 포함하도록 고정되어 있으며, developer가 임의로 항목을 추가/삭제해 이 커버리지를 깨서는 안 된다(§8 보존 영역). |

## 8. 라우트 / 데이터 의존성 / 보존 영역

- **라우트**: `/demo/workflow-pulse` (Epic에서 요청된 경로를 그대로 따른다).
- **페이지명**: "워크플로 펄스" (6단계 칸반 컬럼 + 항목별 상태 전이 버튼 + 상태별 카운트).
- **데이터 의존성**: 로컬 상태(in-memory)만 사용한다. 백엔드 API 호출, 영속 저장(`localStorage` 포함), 외부 데이터 소스 의존 없음. §5 시드 데이터는 클라이언트에 내장된 상수 배열이다.
- **보존 영역**: 기존 다른 데모 라우트/페이지(`docs/planning`, `docs/design` 하위 기존 canary 포함)는 변경하지 않는다. 신규 라우트 추가만 허용되며 기존 공용 컴포넌트/유틸의 동작을 변경해서는 안 된다(BF-1209 구현 시 surgical addition 원칙 적용).

### 8.1 저장소 규약 불일치 플래그 (developer 전달 필요)

이번 Run에서 확인한 저장소 실행 규약(base_sha `6157a23`)은 다음을 보고한다:

- `observed_stack: vanilla-static` vs `requested_stack: typescript-monorepo` — **불일치**. 실제 구현 시 requested 마커가 아니라 저장소에 관측된 실행 규약(vanilla-static, npm, esm, 정적 serve root `.`)을 따라야 한다.
- `expected_entry_path: demo/workflow-pulse/index.html` 은 본 planner task의 owned_paths(`docs/planning/**`)에 포함되지 않는다. 따라서 본 문서는 **엔트리 파일을 직접 생성하지 않는다.** 라우트 경로/파일 위치는 §8 명세대로 developer(BF-1209)가 실제 저장소 규약에 맞게 구현해야 한다.
- 검증 명령 후보 `node --test demo/workflow-pulse/tests/*.test.js` 는 해당 엔트리와 테스트가 구현된 이후에만 유효하다. planner 단계 산출물(본 문서)은 마크다운 명세이며 이 명령의 실행 대상 코드가 아직 없으므로, 본 Task에서는 문서 리뷰(AC 검증)로 검증을 갈음한다.

## 9. Non-Goals (이번 Task 범위 제외)

- 실제 백엔드 API/영속 저장소 연동
- 다중 사용자 동시 편집/실시간 동기화(WebSocket 등)
- 상태 전이에 대한 권한/역할 기반 접근 제어
- 실시간 타임스탬프 기반 SLA/경과시간 계산
- `localStorage` 등을 이용한 새로고침 후 상태 보존(§4에서 명시적으로 배제)

## 10. AC 매핑 (검증 가능 항목)

| Acceptance Criteria | 매핑 근거 |
|---|---|
| Given Epic 요구사항, When 기획 문서를 작성하면, Then 상태 전이 그래프와 로컬 시나리오 데이터 구조가 명세된다 | §2(상태 전이 그래프·전이 테이블) + §5(시드 데이터 8개 항목) + §6(WorkflowItem/전이 함수 타입) |
| Given 데이터 의존성 요구, When 명세를 검토하면, Then 새로고침 후 초기 상태 복귀 규칙과 버튼 재현 흐름이 정의된다 | §4(새로고침 초기화 규칙, in-memory 전용·localStorage 금지) + §6.1(상태별 버튼 노출 규칙) + §3(사용자 시나리오 5번) |
| Given 수용 기준, When 문서를 완료하면, Then 각 AC가 검증 가능한 항목으로 매핑된다 | 본 §10 표 자체 + §7(엣지 케이스가 tester 회귀 케이스로 1:1 대응 가능하도록 명시) |

## 11. 다음 페르소나 전달 사항

- **designer(BF-1208)**: §2(상태 그래프/6단계 컬럼), §5(시드 데이터 8개 항목의 title/assignee 텍스트), §6.1(상태별 버튼 라벨)을 그대로 시안화할 것. 색상/배지/레이아웃 표현은 designer 소관이며 상태 코드·전이 규칙 재해석은 금지.
- **developer(BF-1209)**: §8.1 저장소 규약 불일치 플래그 확인 — `requested_stack` 마커가 아니라 관측된 vanilla-static/npm/esm 규약을 따를 것. 엔트리 파일은 본 문서에 없으므로 §8 라우트/페이지 명세 기준으로 신규 생성. §6 전이 함수·§5 시드 데이터는 하드코딩 상수로 그대로 구현. §4(새로고침 초기화 규칙, `localStorage` 등 영속화 금지) 준수 필수.
- **tester(BF-1211)**: §2.3 전이 테이블 7개 규칙(6개 유효 전이 + 반려 분기) 전체를 회귀 테스트로 커버할 것. §7 엣지 케이스(터미널 상태 no-op, 정의되지 않은 전이 no-op, 새로고침 후 §5 시드 복귀)를 실패 케이스 테스트로 포함할 것.
