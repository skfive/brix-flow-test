# 요청 우선순위 분류 규칙 명세 (BF-1103)

## 0. 메타

| 항목 | 값 |
|---|---|
| Jira | BF-1103 |
| 작성자 | 박기획 (planner) |
| 상태 | 확정 (designer/developer 참조 기준) |
| 관련 형제 Task | BF-1104 (designer), BF-1105 (developer), BF-1107 (tester) |
| 산출물 경로 | `docs/planning/request-priority-BF-1102.md` |

## 1. 목적

고객 요청(티켓/문의)의 **영향도(impact)** 와 **긴급도(urgency)** 두 축을 조합하여 **P1~P4 우선순위**와 **다음 조치(next action)** 를 결정론적으로 도출하는 분류 규칙을 정의한다. 이 문서는 designer(레이아웃/시안)와 developer(구현) 가 공유하는 단일 기준(single source of truth)이며, 매트릭스 셀 값을 임의로 재해석하지 않는다.

이번 스코프는 **분류 규칙 자체**이며, 백엔드 저장/알림 발송/에스컬레이션 자동화는 포함하지 않는다. 화면은 사용자가 두 축을 선택하면 클라이언트에서 즉시 우선순위를 계산해 보여주는 **로컬 상태 전용 데모**로 한정한다.

## 2. 입력 축 정의

### 2.1 영향도 (Impact)

"이 요청이 비즈니스/사용자에게 미치는 파급 범위"를 나타낸다.

| 등급 | 코드 | 정의 | 예시 |
|---|---|---|---|
| Critical | `critical` | 전사 서비스 또는 다수 고객(조직 전체)에 영향, 핵심 비즈니스 기능 마비 | 전체 서비스 다운, 결제 불가, 데이터 유실 |
| High | `high` | 단일 주요 고객 또는 핵심 기능 일부가 영향받음 | 주요 고객사의 핵심 워크플로 차단, 특정 대형 기능 오류 |
| Medium | `medium` | 일부 기능 또는 소수 고객에 국한된 영향 | 부가 기능 오류, 특정 조건에서만 재현되는 버그 |
| Low | `low` | 개별 사용자 또는 경미한 불편, 우회 방법 존재 | UI 오타, 사소한 표시 오류 |

### 2.2 긴급도 (Urgency)

"지금 당장 처리하지 않으면 상황이 얼마나 빨리 악화되는가"를 나타낸다.

| 등급 | 코드 | 정의 | 예시 |
|---|---|---|---|
| Immediate | `immediate` | 서비스 중단/데이터 손실이 진행 중이거나 확산 중, 즉시 대응 필요 | 장애 진행 중, 보안 사고 |
| High | `high` | 단기간(당일) 내 상황이 악화되거나 SLA 위반이 임박 | SLA 임박, 확산 가능성 있는 결함 |
| Medium | `medium` | 예정된 일정(스프린트/주간) 내 처리하면 되는 수준 | 일반 개선 요청, 계획된 일정 내 처리 가능 |
| Low | `low` | 시간 여유가 충분함, 즉각적 악화 요인 없음 | 백로그성 요청, 장기 개선 아이디어 |

두 축 모두 4단계 고정 enum이며, 두 축을 곱한 4×4 = 16개 조합이 전체 입력 공간이다. 신규 등급 추가는 이 문서 개정 없이는 금지한다(designer/developer 임의 확장 금지).

## 3. 우선순위 매트릭스 (Impact × Urgency → P1~P4)

아래 표가 16개 조합의 **1:1 확정 매핑**이다. 행/열 어느 쪽도 임의로 반올림하거나 인접 셀 값을 재사용하지 않는다.

| Impact \ Urgency | Immediate | High | Medium | Low |
|---|---|---|---|---|
| **Critical** | P1 | P1 | P2 | P2 |
| **High** | P1 | P2 | P2 | P3 |
| **Medium** | P2 | P3 | P3 | P4 |
| **Low** | P3 | P4 | P4 | P4 |

### 3.1 우선순위별 다음 조치(Next Action)

| 우선순위 | 라벨 | 다음 조치 | 목표 착수 시간 |
|---|---|---|---|
| P1 | 긴급(Critical) | 즉시 담당자 배정 + 실시간 모니터링 채널 개설, 필요 시 경영진/책임자 에스컬레이션 | 15분 이내 |
| P2 | 높음(High) | 당일 내 담당자 배정 및 착수, 2시간 주기 진행 상황 업데이트 | 4시간 이내 |
| P3 | 보통(Medium) | 익영업일 이내 착수, 정기(일 단위) 업데이트 | 1영업일 이내 |
| P4 | 낮음(Low) | 백로그에 등록, 다음 스프린트 계획 시 우선순위 재검토 | 스프린트 계획 반영 |

### 3.2 Given/When/Then (AC 매핑, 발췌 — 전체는 §3의 매트릭스가 원본)

- Given 영향도=`critical`, 긴급도=`immediate`, When 두 축을 조합하면, Then 우선순위=`P1`, 다음 조치=`즉시 담당자 배정 + 실시간 모니터링`.
- Given 영향도=`critical`, 긴급도=`medium`, When 두 축을 조합하면, Then 우선순위=`P2`, 다음 조치=`당일 내 착수`.
- Given 영향도=`medium`, 긴급도=`low`, When 두 축을 조합하면, Then 우선순위=`P4`, 다음 조치=`백로그 등록`.
- Given 영향도=`low`, 긴급도=`immediate`, When 두 축을 조합하면, Then 우선순위=`P3`, 다음 조치=`익영업일 이내 착수`.
  - (긴급도가 즉시라도 영향도가 낮으면 P1/P2로 격상하지 않는다 — "확산 범위가 없는 긴급함"은 보통 수준으로 처리한다는 설계 판단.)
- 나머지 12개 조합은 §3 매트릭스 표를 그대로 따른다(표가 authoritative source, 텍스트 나열은 예시일 뿐).

## 4. 엣지 케이스 및 실패 케이스

| 케이스 | 처리 규칙 |
|---|---|
| 영향도 또는 긴급도 미선택(둘 다 필수) | 우선순위 계산 버튼/결과를 비활성화하고 "두 축을 모두 선택하세요" 안내만 표시. 기본값으로 임의 조합을 가정해 계산하지 않는다. |
| 두 축 모두 미선택 상태에서 재조합 시도 | 위와 동일 — 계산 자체를 수행하지 않음(부분 매핑 금지). |
| 정의되지 않은 등급 값(오타/확장 시도) | 매트릭스에 없는 코드가 들어오면 계산을 거부하고 에러 상태로 표시("정의되지 않은 등급"). 4×4 외 값으로 폴백 추정하지 않는다. |
| 등급 변경(사용자가 선택을 바꿈) | 매번 §3 매트릭스 순수 함수로 재계산. 이전 결과나 히스토리를 유지하거나 평균 내지 않는다(무상태 재계산). |
| VIP/특별 고객 등 매트릭스 외 요인으로 우선순위를 올리고 싶은 경우 | 이번 스코프에서는 **override 미지원**. 매트릭스 산출값만 표시한다(override는 별도 Task로 분리 — 이 문서의 non-goal). |
| 매트릭스 셀 값과 UI 표시 색상/라벨 매핑 | 색상·시각 표현은 designer(BF-1104) 소관. 본 문서는 등급 코드와 P1~P4 라벨/다음 조치 텍스트만 확정한다. |

## 5. 라우트 / 페이지 / 데이터 의존성 / 보존 영역

- **라우트**: `/demo/request-priority-skill-canary` (Epic에서 요청된 경로를 그대로 따른다).
- **페이지명**: "요청 우선순위 분류" (영향도×긴급도 선택 → P1~P4 + 다음 조치 표시).
- **데이터 의존성**: 로컬 상태(local state)만 사용한다. 백엔드 API 호출, 영속 저장, 외부 데이터 소스 의존 없음. §3 매트릭스는 클라이언트에 내장된 순수 함수 룩업 테이블로 구현한다(네트워크 요청 불필요).
- **보존 영역**: 기존 다른 데모 라우트/페이지(`docs/planning`, `docs/design` 하위 기존 canary들 포함)는 변경하지 않는다. 신규 라우트 추가만 허용되며 기존 공용 컴포넌트/유틸의 동작을 변경해서는 안 된다(BF-1105 구현 시 surgical addition 원칙 적용).

### 5.1 저장소 규약 불일치 플래그 (developer 전달 필요)

이번 Run에서 확인한 저장소 실행 규약(base_sha `c0f5a11`)은 다음을 보고한다:
- `observed_stack: vanilla-static` vs `requested_stack: typescript-monorepo` — **불일치**. 실제 구현 시 requested 마커가 아니라 저장소에 관측된 실행 규약(vanilla-static, npm, esm, static serve root `.`)을 따라야 한다.
- `expected_entry_path: demo/request-priority-skill-canary/index.html` 은 본 planner task의 owned_paths(`docs/planning/request-priority-BF-1102.md`)에 포함되지 않는다. 따라서 본 문서는 **엔트리 파일을 직접 생성하지 않는다.** 라우트 경로/파일 위치는 §5 명세대로 developer(BF-1105)가 실제 저장소 규약에 맞게 구현해야 한다.
- 검증 명령 후보 `node --test demo/request-priority-skill-canary/tests/*.test.js` 는 해당 엔트리가 구현된 이후에만 유효하다. planner 단계 산출물(본 문서)은 마크다운 명세이며 이 명령의 실행 대상 코드가 없으므로, 본 Task에서는 문서 리뷰(AC 2)로 검증을 갈음한다.

## 6. API 스펙 (developer 참고용 계약)

클라이언트 전용 순수 함수로 구현할 것을 권고한다. 실제 파일 위치/모듈 시스템은 §5.1의 저장소 규약(esm)을 따른다.

```ts
type Impact = "critical" | "high" | "medium" | "low";
type Urgency = "immediate" | "high" | "medium" | "low";
type Priority = "P1" | "P2" | "P3" | "P4";

interface PriorityResult {
  priority: Priority;
  nextAction: string; // §3.1 표의 "다음 조치" 텍스트
}

// 순수 함수, 부수효과 없음, 네트워크/영속화 없음
function classifyRequestPriority(impact: Impact, urgency: Urgency): PriorityResult;
```

- `impact` 또는 `urgency` 가 위 union 밖의 값이면 예외를 던지거나(타입 시스템이 이를 컴파일 타임에 막는 것이 이상적) §4의 "정의되지 않은 등급" 에러 상태로 처리한다.
- 매핑 테이블은 §3의 표를 그대로 상수로 옮겨 하드코딩한다(계산식으로 근사하지 말 것 — 예: "가중치 합산" 같은 근사 로직은 셀 값과 어긋날 수 있으므로 금지).

## 7. 데이터 모델

영속 데이터 모델은 없음(로컬 상태만). UI 상태 모델만 정의한다:

```ts
interface RequestPriorityUiState {
  selectedImpact: Impact | null;
  selectedUrgency: Urgency | null;
  result: PriorityResult | null; // 두 축이 모두 선택된 경우에만 non-null
}
```

## 8. Non-Goals (이번 Task 범위 제외)

- 우선순위 override/수동 조정 기능
- 알림/에스컬레이션 자동 발송
- 우선순위 변경 이력 저장
- 매트릭스 외 축(예: 고객 등급, SLA 계약) 반영

## 9. 다음 페르소나 전달 사항

- designer(BF-1104): §3, §3.1 라벨/색상 표현 시안 작성 시 P1~P4 텍스트와 등급 코드(§2)를 그대로 사용할 것. 매트릭스 셀 값 재해석 금지.
- developer(BF-1105): §5.1 저장소 규약 불일치 플래그 확인 — `requested_stack` 마커가 아닌 관측된 vanilla-static/npm/esm 규약을 따를 것. 엔트리 파일은 본 문서에 없으므로 §5 라우트/페이지 명세 기준으로 신규 생성.
- tester(BF-1107): §3 매트릭스 16개 조합 전체를 회귀 테스트 케이스로 커버할 것(§3.2는 발췌이며 전수 대상은 §3 표).
