# 서비스 요청 분류 보드 기획 명세 (BF-1121)

## 0. 메타

| 항목 | 값 |
|---|---|
| Jira | BF-1121 |
| 작성자 | 박기획 (planner) |
| 상태 | 확정 (designer/developer 참조 기준) |
| 관련 형제 Task | BF-1122 (designer), BF-1123 (developer), BF-1125 (tester) |
| 산출물 경로 | `docs/planning/service-request-triage-BF-1121.md` |

## 0.1 배정 Skill 호출 및 적용 근거

본 Task 실행 초기, RUN_CAPABILITY_MANIFEST 에 명시된 필수 Skill(`prd-writer`, invocation_ref `imported-3bf29e93d91a0647`)을 아래와 같이 명시 호출을 시도했다.

| 시도 | 호출 방식 | 결과 |
|---|---|---|
| 1 | `Skill({ skill: "imported-3bf29e93d91a0647" })` (manifest 지정 exact invocation_ref) | `Unknown skill` 오류 |
| 2 | `Skill({ skill: "<manifest 지정 exact worktree-relative SKILL.md 경로>" })` | `Unknown skill` 오류 |
| 3 | `Skill({ skill: "prd-writer" })` (manifest 상 skill 이름) | `Unknown skill` 오류 |

추가로 `mcp__brix-control__search_installed_skills` 를 `prd-writer` / `imported` / `PRD` / `triage` 4개 쿼리로 조회했으나 모두 `skills: []` (설치된 항목 없음)로 확인되어, `request_skill_activation` 에 전달할 유효 `skillId` 조차 확보할 수 없었다.

**결론**: manifest 는 해당 Skill 이 assigned 상태라고 선언하지만, 실제 Skill 도구 registry 와 MCP 조회 결과에는 노출되어 있지 않다 — provisioning 불일치로 판단한다. 자체 설치/우회 접근을 시도하지 않고(CAPABILITY_BOUNDARY 준수), 이 사실을 fail-honest 하게 본 섹션에 기록한 뒤, 이하 명세는 저장소 내 기존 planner 산출물 관례(`docs/planning/request-priority-BF-1102.md` — 동일 도메인의 최근 우선순위 분류 명세, 1건만 참조)를 형식적 선례로 삼아 표준 PRD/AC 작성 방식으로 진행한다. Skill 지침 자체를 반영하지 못했으므로, 운영자가 provisioning 을 재확인해야 할 필요가 있다.

## 1. 목적 및 범위

서비스 요청(내부/외부에서 접수되는 처리 요청 티켓)을 **유형(Type)** 과 **영향도(Impact)** 두 축으로 분류하고, 이 조합으로부터 **P1~P4 우선순위**와 **다음 조치(next action)** 를 결정론적으로 산출하는 분류 규칙을 정의한다. 분류된 요청은 우선순위 기준 컬럼으로 그룹화된 **분류 보드(triage board)** 에 표시된다.

이 문서는 designer(BF-1122, 보드 레이아웃/시안)와 developer(BF-1123, 구현)가 공유하는 단일 기준(single source of truth)이며, 매트릭스 셀 값을 임의로 재해석하지 않는다.

이번 스코프는 **분류 로직 + 보드 그룹핑 규칙**이며, 백엔드 저장/알림 발송/에스컬레이션 자동화·워크플로 상태(진행중/완료 등) 관리는 포함하지 않는다. 화면은 사용자가 요청별로 유형·영향도를 선택하면 클라이언트에서 즉시 우선순위를 계산해 해당 우선순위 컬럼에 카드로 보여주는 **로컬 상태 전용 데모**로 한정한다.

## 2. 입력 축 정의

### 2.1 유형 (Request Type)

"이 요청이 어떤 성격의 작업인가"를 나타내는 범주형(카테고리) 축이다. 서열이 아니라 종류 구분이므로 등급 간 대소 비교를 하지 않는다.

| 유형 | 코드 | 정의 | 예시 |
|---|---|---|---|
| 장애 | `incident` | 서비스가 이미 중단되었거나 핵심 기능이 마비된 상태 | 전체/부분 서비스 다운, 결제 불가 |
| 보안 | `security` | 보안 취약점 또는 보안 사고 관련 요청 | 취약점 신고, 무단 접근 정황 |
| 버그 | `bug` | 정상 동작하지 않는 결함의 수정 요청 (서비스 중단은 아님) | 특정 조건에서 재현되는 오류 |
| 변경요청 | `change_request` | 기존 기능/설정/정책의 변경을 요청 | 권한 변경, 설정값 조정 |
| 문의 | `inquiry` | 결함이 아닌 정보 제공/사용법 안내 요청 | 사용 방법 질문, 데이터 조회 요청 |

### 2.2 영향도 (Impact)

"이 요청이 비즈니스/사용자에게 미치는 파급 범위"를 나타내는 4단계 서열 축이다.

| 등급 | 코드 | 정의 | 예시 |
|---|---|---|---|
| Critical | `critical` | 전사 서비스 또는 다수 고객(조직 전체)에 영향, 핵심 비즈니스 기능 마비 | 전체 서비스 다운, 데이터 유실 |
| High | `high` | 단일 주요 고객 또는 핵심 기능 일부가 영향받음 | 주요 고객사의 핵심 워크플로 차단 |
| Medium | `medium` | 일부 기능 또는 소수 사용자에 국한된 영향 | 부가 기능 오류 |
| Low | `low` | 개별 사용자 또는 경미한 불편, 우회 방법 존재 | UI 오타, 사소한 표시 오류 |

유형은 5종 고정 enum, 영향도는 4단계 고정 enum이며, 두 축을 곱한 5×4 = 20개 조합이 전체 입력 공간이다. 신규 유형/등급 추가는 이 문서 개정 없이는 금지한다(designer/developer 임의 확장 금지).

## 3. 우선순위 매트릭스 (Type × Impact → P1~P4)

아래 표가 20개 조합의 **1:1 확정 매핑**이다. 행/열 어느 쪽도 임의로 반올림하거나 인접 셀 값을 재사용하지 않는다. 유형별로 기본 긴급성 기준이 다르므로(장애/보안은 구조적으로 더 긴급, 문의는 구조적으로 덜 긴급) 같은 영향도라도 유형에 따라 우선순위가 달라진다.

| Type \ Impact | Critical | High | Medium | Low |
|---|---|---|---|---|
| **장애 (incident)** | P1 | P1 | P2 | P3 |
| **보안 (security)** | P1 | P1 | P2 | P3 |
| **버그 (bug)** | P1 | P2 | P3 | P4 |
| **변경요청 (change_request)** | P2 | P2 | P3 | P4 |
| **문의 (inquiry)** | P2 | P3 | P4 | P4 |

### 3.1 우선순위별 다음 조치(Next Action)

| 우선순위 | 라벨 | 다음 조치 | 목표 착수 시간 |
|---|---|---|---|
| P1 | 긴급(Critical) | 즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 책임자 에스컬레이션 | 15분 이내 |
| P2 | 높음(High) | 당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트 | 4시간 이내 |
| P3 | 보통(Medium) | 익영업일 이내 착수, 정기(일 단위) 업데이트 | 1영업일 이내 |
| P4 | 낮음(Low) | 백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토 | 스프린트 계획 반영 |

### 3.2 Given/When/Then (AC 매핑, 발췌 — 전체는 §3의 매트릭스가 원본)

- Given 유형=`incident`, 영향도=`critical`, When 두 축을 조합하면, Then 우선순위=`P1`, 다음 조치=`즉시 담당자 배정 + 실시간 모니터링`.
- Given 유형=`incident`, 영향도=`low`, When 두 축을 조합하면, Then 우선순위=`P3`, 다음 조치=`익영업일 이내 착수`.
  - (유형이 `incident`/`security`라도 영향도가 낮으면 자동으로 P1/P2로 격상하지 않는다 — "이미 장애/보안 성격이지만 파급 범위가 작은 건"은 매트릭스 산출값을 그대로 따른다는 설계 판단.)
- Given 유형=`inquiry`, 영향도=`critical`, When 두 축을 조합하면, Then 우선순위=`P2`, 다음 조치=`당일 내 착수`.
  - (문의는 구조적으로 즉시 대응 성격이 아니므로 영향도가 critical이어도 P1에는 도달하지 않는다.)
- Given 유형=`bug`, 영향도=`medium`, When 두 축을 조합하면, Then 우선순위=`P3`, 다음 조치=`익영업일 이내 착수`.
- 나머지 16개 조합은 §3 매트릭스 표를 그대로 따른다(표가 authoritative source, 텍스트 나열은 예시일 뿐).

## 4. 엣지 케이스 및 실패 케이스

| 케이스 | 처리 규칙 |
|---|---|
| 유형 또는 영향도 미선택(둘 다 필수) | 우선순위 계산 결과를 비활성화하고 "두 축을 모두 선택하세요" 안내만 표시. 기본값으로 임의 조합을 가정해 계산하지 않는다. |
| 유형·영향도 모두 미선택 상태의 요청 | 보드에서 별도 **"미분류" 컬럼**에 표시한다(§7.2). P1~P4 컬럼에 임의 배치하지 않는다. |
| 정의되지 않은 유형/영향도 값(오타/확장 시도) | 매트릭스에 없는 코드가 들어오면 계산을 거부하고 에러 상태로 표시("정의되지 않은 유형/등급"). 20개 조합 외 값으로 폴백 추정하지 않는다. |
| 유형 또는 영향도 변경(사용자가 선택을 바꿈) | 매번 §3 매트릭스 순수 함수로 재계산. 이전 결과나 히스토리를 유지하거나 평균 내지 않는다(무상태 재계산). |
| 여러 요청이 동일 우선순위인 경우 | 같은 컬럼 내 정렬 기준은 이번 스코프에서 규정하지 않는다(추가 정렬 로직은 non-goal, §8). 등록 순서 등 안정적 기본 순서만 유지하면 된다. |
| VIP/특별 고객 등 매트릭스 외 요인으로 우선순위를 올리고 싶은 경우 | 이번 스코프에서는 **override 미지원**. 매트릭스 산출값만 표시한다(override는 별도 Task로 분리 — 이 문서의 non-goal). |
| 매트릭스 셀 값과 보드 UI 색상/라벨 매핑 | 색상·시각 표현은 designer(BF-1122) 소관. 본 문서는 유형/영향도 코드와 P1~P4 라벨/다음 조치 텍스트만 확정한다. |

## 5. 라우트 / 페이지 / 데이터 의존성 / 보존 영역

- **라우트**: `/demo/service-request-triage` (Epic에서 요청된 경로를 그대로 따른다).
- **페이지명**: "서비스 요청 분류 보드" (요청 카드별 유형×영향도 선택 → P1~P4 우선순위 컬럼에 배치, 미분류 컬럼 포함).
- **데이터 의존성**: 로컬 상태(local state)만 사용한다. 백엔드 API 호출, 영속 저장, 외부 데이터 소스 의존 없음. §3 매트릭스는 클라이언트에 내장된 순수 함수 룩업 테이블로 구현한다(네트워크 요청 불필요).
- **보존 영역**: 기존 다른 데모 라우트/페이지(`docs/planning`, `docs/design` 하위 기존 canary 포함)는 변경하지 않는다. 신규 라우트 추가만 허용되며 기존 공용 컴포넌트/유틸의 동작을 변경해서는 안 된다(BF-1123 구현 시 surgical addition 원칙 적용).

### 5.1 저장소 규약 불일치 플래그 (developer 전달 필요)

이번 Run에서 확인한 저장소 실행 규약(base_sha `a50e8197`)은 다음을 보고한다:
- `observed_stack: vanilla-static` vs `requested_stack: typescript-monorepo` — **불일치**. 실제 구현 시 requested 마커가 아니라 저장소에 관측된 실행 규약(vanilla-static, npm, esm, static serve root `.`, route_mapping `root-relative-static`)을 따라야 한다.
- `expected_entry_path: demo/service-request-triage/index.html` 은 본 planner task의 owned_paths(`docs/planning/**`)에 포함되지 않는다. 따라서 본 문서는 **엔트리 파일을 직접 생성하지 않는다.** 라우트 경로/파일 위치는 본 §5 명세대로 developer(BF-1123)가 실제 저장소 규약에 맞게 구현해야 한다.
- 검증 명령 후보 `node --test demo/service-request-triage/tests/*.test.js` 는 해당 엔트리와 테스트 파일이 구현된 이후에만 유효하다. planner 단계 산출물(본 문서)은 마크다운 명세이며 이 명령의 실행 대상 코드가 없으므로, 본 Task에서는 문서 리뷰(AC 충족 여부 확인)로 검증을 갈음한다. `full_verify_command` 는 저장소에 신규 route 전체를 아우르는 authority 명령이 없어 미제공 상태이며, developer/tester 는 focused 명령만 authority로 사용한다.
- `e2e: unavailable` — 배정된 e2e Skill이 없으므로 tester(BF-1125)는 단위/통합 수준(§3 20개 조합 + §4 엣지 케이스)의 결정론적 검증에 집중한다.

## 6. API 스펙 (developer 참고용 계약)

클라이언트 전용 순수 함수로 구현할 것을 권고한다. 실제 파일 위치/모듈 시스템은 §5.1의 저장소 규약(esm)을 따른다.

```ts
type RequestType = "incident" | "security" | "bug" | "change_request" | "inquiry";
type Impact = "critical" | "high" | "medium" | "low";
type Priority = "P1" | "P2" | "P3" | "P4";

interface PriorityResult {
  priority: Priority;
  nextAction: string; // §3.1 표의 "다음 조치" 텍스트
}

// 순수 함수, 부수효과 없음, 네트워크/영속화 없음
function classifyServiceRequestPriority(type: RequestType, impact: Impact): PriorityResult;
```

- `type` 또는 `impact` 가 위 union 밖의 값이면 예외를 던지거나(타입 시스템이 이를 컴파일 타임에 막는 것이 이상적) §4의 "정의되지 않은 유형/등급" 에러 상태로 처리한다.
- 매핑 테이블은 §3의 표를 그대로 상수로 옮겨 하드코딩한다(계산식으로 근사하지 말 것 — 예: "유형별 가중치 + 영향도 가중치 합산" 같은 근사 로직은 셀 값과 어긋날 수 있으므로 금지).

## 7. 데이터 모델

영속 데이터 모델은 없음(로컬 상태만). UI 상태 모델과 보드 그룹핑 규칙만 정의한다.

### 7.1 요청 카드 상태

```ts
interface ServiceRequestCard {
  id: string;
  title: string;
  selectedType: RequestType | null;
  selectedImpact: Impact | null;
  result: PriorityResult | null; // 두 축이 모두 선택된 경우에만 non-null
}

interface ServiceRequestTriageBoardState {
  requests: ServiceRequestCard[];
}
```

### 7.2 보드 컬럼 그룹핑

보드 컬럼은 우선순위 기준으로 고정 5개다: `P1`, `P2`, `P3`, `P4`, `미분류`.

- 카드의 `result` 가 non-null 이면 `result.priority` 값의 컬럼에 배치.
- 카드의 `selectedType` 또는 `selectedImpact` 중 하나라도 null 이면 `미분류` 컬럼에 배치(§4).
- 컬럼 배치는 §3 매트릭스 산출값을 그대로 따르는 파생 상태이며, 별도의 수동 컬럼 이동(드래그앤드롭 등)은 이번 스코프에 포함하지 않는다(§8).

## 8. Non-Goals (이번 Task 범위 제외)

- 우선순위 override/수동 조정 기능
- 카드 드래그앤드롭 등 수동 컬럼 이동
- 컬럼 내 정렬 기준(등록시각 외 추가 정렬 로직)
- 알림/에스컬레이션 자동 발송
- 우선순위 변경 이력 저장
- 처리 상태(신규/진행중/완료) 워크플로 관리
- 매트릭스 외 축(예: 고객 등급, SLA 계약) 반영

## 9. 다음 페르소나 전달 사항

- designer(BF-1122): §3, §3.1, §7.2 보드 레이아웃(5컬럼: P1~P4 + 미분류) 시안 작성 시 유형/영향도 코드(§2)와 우선순위 라벨을 그대로 사용할 것. 매트릭스 셀 값 재해석 금지.
- developer(BF-1123): §5.1 저장소 규약 불일치 플래그 확인 — `requested_stack` 마커가 아닌 관측된 vanilla-static/npm/esm/root-relative-static 규약을 따를 것. 엔트리 파일은 본 문서에 없으므로 §5 라우트/페이지 명세 기준으로 신규 생성. §6 API 스펙의 순수 함수 시그니처를 그대로 구현할 것.
- tester(BF-1125): §3 매트릭스 20개 조합 전체를 회귀 테스트 케이스로 커버할 것(§3.2는 발췌이며 전수 대상은 §3 표). §4 엣지 케이스(미선택, 미분류 컬럼, 정의되지 않은 값, 재계산 무상태성)도 필수 커버. e2e는 unavailable 이므로 단위/통합 수준 검증에 집중(§5.1).
- 운영자: §0.1 에 기록된 배정 Skill(`prd-writer`) provisioning 불일치(assigned 로 선언되었으나 Skill 도구/MCP 조회 모두 미노출)를 확인 부탁드립니다.
