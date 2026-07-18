# 반품 승인 워크벤치 기획 명세 (BF-1037)

- 대상 route: `/return-approvals-canary`
- 범위: 정적 fixture + 로컬 상태 전이만 (외부 API·신규 DB schema 없음)
- 관련 형제 Task: BF-1038(designer), BF-1039(developer), BF-1041(tester)

## 1. 개요 및 목적

운영자가 접수된 반품 요청 목록을 확인하고, 각 요청을 **승인(approved)** 또는 **보류(held)** 처리할 수 있는 워크벤치 화면을 기획한다. 데이터는 정적 fixture(JSON)로 제공되며, 상태 변경은 클라이언트 로컬 상태(+ localStorage 영속화)로만 처리한다. 서버 API 호출, 신규 DB 테이블/스키마 변경은 이번 범위에 포함하지 않는다.

## 2. 사용자 시나리오

1. 운영자가 `/return-approvals-canary`에 진입하면 반품 요청 목록이 상태(대기/승인/보류)와 함께 표시된다.
2. 운영자는 목록에서 특정 반품 요청을 선택해 상세 정보(상품, 사유, 환불 예정 금액 등)를 확인한다.
3. 운영자는 상세 화면에서 "승인" 또는 "보류" 액션을 수행한다. 보류 시에는 보류 사유를 필수로 입력한다.
4. 처리된 요청은 상태가 즉시 갱신되고 목록에 반영되며, 새로고침 후에도 처리 결과가 유지된다.
5. 운영자는 상태별 필터(전체/대기/승인/보류)로 목록을 좁혀볼 수 있다.

## 3. Fixture 스키마 — 반품 요청 목록 (`ReturnRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | Y | 반품 요청 고유 ID (예: `"RTN-1001"`) |
| `orderId` | string | Y | 연결된 주문 ID (예: `"ORD-88231"`) |
| `customerName` | string | Y | 고객명 |
| `productName` | string | Y | 반품 대상 상품명 |
| `sku` | string | Y | 상품 SKU 코드 |
| `quantity` | number | Y | 반품 수량 (1 이상 정수) |
| `reason` | enum | Y | 반품 사유. `"DEFECTIVE" \| "CHANGE_OF_MIND" \| "WRONG_ITEM" \| "DAMAGED_IN_TRANSIT" \| "OTHER"` |
| `reasonDetail` | string \| null | N | 반품 사유 상세 텍스트 |
| `requestedAt` | string (ISO 8601) | Y | 반품 요청 접수 시각 |
| `status` | enum | Y | `"pending" \| "approved" \| "held"` (초기값 `"pending"`) |
| `holdReason` | string \| null | N | 보류 처리 시 필수 입력되는 보류 사유. `status !== "held"`이면 `null` |
| `approvedAt` | string (ISO 8601) \| null | N | 승인 처리 시각. 승인 전에는 `null` |
| `approvedBy` | string \| null | N | 승인 처리한 운영자 식별자(mock 값). 승인 전에는 `null` |
| `refundAmount` | number | Y | 환불 예정 금액 (원, 0 이상) |
| `notes` | string \| null | N | 운영자 메모(자유 텍스트) |

- fixture 파일은 정적 JSON으로 최초 10~15건 내외의 샘플 데이터를 포함한다 (모든 `reason` enum 값 및 `pending` 상태를 최소 1건 이상 커버).
- 상태 변경 결과는 fixture 원본을 직접 수정하지 않고, 클라이언트 로컬 상태(런타임 state + `localStorage`)에 오버레이하여 반영한다.

## 4. 상태 전이 규칙 (승인/보류)

| 현재 상태 | 액션 | 전이 후 상태 | 가드(guard) 조건 | 부수 효과 |
|---|---|---|---|---|
| `pending` | 승인 | `approved` | 없음 (버튼 활성) | `approvedAt`, `approvedBy` 기록 |
| `pending` | 보류 | `held` | `holdReason`(공백 제외 1자 이상) 필수 입력 | `holdReason` 저장 |
| `held` | 승인 (재검토) | `approved` | 없음 | `approvedAt`, `approvedBy` 기록, `holdReason` 유지(이력용) |
| `held` | 보류 해제 | `pending` | 없음 | `holdReason` → `null` |
| `approved` | — | 전이 없음 (terminal) | 승인 후 역방향 전이는 이번 범위에서 미제공 | 승인/보류 액션 버튼 비활성화 |

- `approved`는 종결 상태로, 재보류·재대기 전이는 범위 밖(Non-goal)이다.
- 모든 전이는 로컬 상태에서만 수행되며 새로고침 후에도 `localStorage`에 저장된 오버레이를 통해 유지된다.
- 동일 요청에 대한 중복 액션(더블 클릭 등)은 첫 번째 전이만 반영하고 이후 클릭은 무시한다(버튼은 전이 직후 비활성화된 상태로 재렌더링).

## 5. 화면 흐름 (`/return-approvals-canary`)

1. **목록 화면**: fixture + 로컬 오버레이를 병합한 반품 요청 목록을 표 형태로 렌더링. 컬럼: 상태 뱃지, 주문ID, 고객명, 상품명, 반품 사유, 요청일시.
   - 상태 필터(전체/대기/승인/보류) 제공, 필터 변경 시 목록만 재필터링(fixture 재조회 없음).
2. **상세 패널**: 목록에서 행 선택 시 상세 정보(상품/사유/환불 예정 금액/메모) 및 액션 버튼(승인/보류) 노출.
   - `status === "pending"`: 승인/보류 버튼 모두 활성.
   - `status === "held"`: "승인" 버튼 + "보류 해제" 버튼 노출, 기존 `holdReason` 표시.
   - `status === "approved"`: 액션 버튼 비활성, 승인 시각/처리자만 표시.
3. **보류 액션 흐름**: "보류" 클릭 → 보류 사유 입력 폼 노출 → 확인 시 유효성 검증(공백 불가) → 통과 시 상태 전이 → 실패 시 인라인 에러 메시지 표시(전이 미수행).
4. **승인 액션 흐름**: "승인" 클릭 → 확인 다이얼로그 → 확정 시 즉시 전이 및 목록/상세 갱신.
5. **처리 후**: 목록 자동 갱신 + 처리 결과 토스트(또는 인라인 피드백) 노출, 상세 패널은 갱신된 상태로 유지.
6. **새로고침**: 페이지 재진입 시 `localStorage` 오버레이를 fixture와 병합해 직전 처리 결과를 그대로 복원.
7. **빈 상태**: 필터 결과가 0건이면 "표시할 반품 요청이 없습니다" 안내 메시지 표시.

## 6. Acceptance Criteria 매핑 (4개)

| # | Given | When | Then | 검증 방법 |
|---|---|---|---|---|
| AC1 | 운영자 반품 승인 유스케이스 | 기획 명세 작성 시 | fixture 필드·상태 전이(pending→approved/held) 규칙이 표로 정의된다 | 본 문서 §3(Fixture 스키마), §4(상태 전이 규칙) 표 존재 여부 확인 |
| AC2 | 수용 기준 4개 | 명세 작성 시 | 각 AC가 검증 가능한 항목으로 매핑된다 | 본 §6 표에 4개 AC와 각 검증 방법이 1:1로 명시됨 |
| AC3 | `/return-approvals-canary` 화면 흐름 | 명세 작성 시 | 목록→상세→승인/보류 액션의 화면 전이가 단계별로 명시된다 | 본 문서 §5(화면 흐름) 1~7단계 존재 여부 확인 |
| AC4 | 보존 영역 | 명세 작성 시 | 인증·공용 레이아웃·타 route·schema·Docker 미변경 원칙이 명시된다 | 본 문서 §8(보존 영역) 목록 존재 여부 확인 |

## 7. Edge Case / 실패 케이스

- 보류 사유를 공백으로 제출 → 전이 차단, 인라인 검증 에러 표시.
- `approved` 상태 요청에 승인/보류 버튼 클릭 시도 → 버튼 비활성 상태이므로 액션 자체가 발생하지 않음.
- 동일 요청에 대해 승인 처리 중 빠르게 재클릭 → 첫 전이만 반영, 이후 클릭 무시(버튼 비활성화로 방지).
- fixture 로드 실패(파일 누락 등) → 목록 영역에 로드 실패 안내 표시, 액션 버튼 비노출.
- 필터 결과 0건 → §5-7의 빈 상태 안내 노출.
- `localStorage` 접근 불가(사생활 보호 모드 등) → 오버레이 저장 실패 시에도 화면은 fixture 기본값으로 정상 렌더링(전이 자체는 세션 내 메모리 상태로 동작, 새로고침 유지만 되지 않음).

## 8. 보존 영역 (범위 밖 — 변경 금지)

- **인증(Auth)**: 로그인/권한 로직 변경 없음. 기존 인증 흐름 그대로 사용.
- **공용 레이아웃**: 전역 헤더/사이드바/네비게이션 등 공용 레이아웃 컴포넌트 변경 없음.
- **타 route**: `/return-approvals-canary` 외 다른 route/module 변경 없음.
- **DB schema**: 신규 테이블/컬럼 등 스키마 변경 없음. 데이터는 정적 fixture로만 제공.
- **Docker/인프라 설정**: `Dockerfile`, `docker-compose` 등 인프라 구성 변경 없음.
- **외부 API**: 서버 API 신규 연동 없음. 모든 상태 전이는 클라이언트 로컬 상태(+`localStorage`)로만 처리.

## 9. API / 데이터 모델 변경 사항

- **API 스펙**: 없음. 외부 API 호출 없이 클라이언트 로컬 함수(예: `approveReturnRequest(id)`, `holdReturnRequest(id, reason)`, `releaseHold(id)`)로 상태 전이를 처리한다.
- **데이터 모델 변경**: 없음. §3에 정의된 `ReturnRequest` fixture 스키마가 이번 범위의 유일한 데이터 모델이며, 서버 측 스키마 변경은 발생하지 않는다.
