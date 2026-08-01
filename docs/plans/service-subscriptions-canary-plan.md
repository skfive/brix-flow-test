# 구독 관리 SPA 구현 설계 및 UI 계약 (BF-1462)

## 개요
구독 관리(service subscriptions) canary SPA의 구현 설계와 handoff 계약을 동결한다. 본 문서는 designer(BF-1460)와 developer(BF-1461)가 그대로 따라야 할 frozen UI 계약(selector·상태 텍스트·token·접근성·반응형)과 상태 전이를 명시하며, tester(BF-1464)가 회귀 가드를 작성할 때 참조하는 시나리오를 포함한다.

이 문서는 frozen Execution Blueprint가 정한 파일 소유권과 산출물 경로를 그대로 설명하며, 새로운 파일이나 역할을 추가하지 않는다.

## 파일 소유권 (frozen — 재정의 금지)
| 경로 | 소유 역할 | 비고 |
|---|---|---|
| `demo/service-subscriptions-canary/index.html` | developer | 정적 마크업 |
| `demo/service-subscriptions-canary/src/feature.js` | developer | 상태 머신·localStorage 로직 |
| `docs/design/service-subscriptions-canary-contract.md` | designer | 시각 명세·mockup |
| `docs/plans/service-subscriptions-canary-plan.md` | planner (본 문서) | 구현 설계·상태 전이 문서 |
| `demo/service-subscriptions-canary/tests/feature.test.js` | tester | focused 회귀 가드 (read-only 참조) |

## UI 계약 (frozen — selector/token 변경 금지)

### DOM ID
`subscription-root`, `subscription-add-form`, `subscription-service-select`, `subscription-add-submit`, `subscription-filter-status`, `subscription-list`, `subscription-empty`

### CSS class
`subscription`, `subscription__list`, `subscription__item`, `subscription__submit`, `subscription__filter`

### Design token / CSS 변수
- `--color-action-primary: #2563eb`
- `--color-status-active: #16a34a`
- `--space-control-gap: 12px`

### 상태별 노출 텍스트
| 상태 | 화면 텍스트 |
|---|---|
| idle | 구독 목록과 '구독 추가' 버튼이 표시된다 |
| adding | 제출 버튼이 비활성화되고 '추가 중…' 텍스트를 표시한다 |
| subscribed | 새 구독 항목이 목록에 추가되고 '구독이 추가되었습니다' 안내 텍스트를 표시한다 |
| removed | 항목 해제 후 '구독이 해제되었습니다' 텍스트를 표시한다 |
| empty | 구독이 없을 때 '표시할 구독이 없습니다' 텍스트를 표시한다 |
| error | 저장 실패 시 '구독을 저장하지 못했습니다' 텍스트를 표시하고 제출 버튼을 재활성화한다 |

### 접근성
- `subscription-add-submit` control은 `aria-label='구독 추가'`를 가진다.
- `subscription-filter-status`는 연결된 label 텍스트 '상태 필터'를 가진다.
- 키보드 Tab으로 폼·필터·목록 항목에 순차 포커스가 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 반응형
- 320px 이상에서 content overflow가 발생하지 않는다.
- 구독 목록 항목은 좁은 폭에서 세로로 stack된다.

## 데이터 모델 (client-only, localStorage)
서버 API 없음 — 전 상태는 브라우저 localStorage 단일 계층에 영속화된다.

- storage key: `service-subscriptions-canary:v1`
- 값: 아래 레코드 배열의 JSON 직렬화

```
SubscriptionRecord {
  id: string            // crypto.randomUUID 우선, 미지원 환경은 폴백 생성기
  serviceId: string
  serviceName: string
  status: 'active' | 'inactive'
  subscribedAt: string  // ISO 8601
}
```

`subscription-filter-status`는 `전체 | 활성 | 비활성` 3가지 옵션으로 `status` 필드를 필터링한다. 필터 선택 자체는 localStorage에 영속화하지 않는다(세션 한정).

## 상태 전이 (Given/When/Then)

### 1) 구독 추가
- Given `subscription-root`가 idle 상태이고 `subscription-service-select`에 유효한 서비스가 선택되어 있을 때
- When 사용자가 `subscription-add-submit`을 클릭하면
- Then 상태가 adding으로 전이되어 제출 버튼이 비활성화되고 '추가 중…' 텍스트가 표시된다
- And 저장이 성공하면 상태가 subscribed로 전이되어 신규 항목이 `subscription-list`에 추가되고 '구독이 추가되었습니다' 텍스트가 표시되며 localStorage가 갱신된다
- And 저장이 실패하면 상태가 error로 전이되어 '구독을 저장하지 못했습니다' 텍스트가 표시되고 `subscription-add-submit`이 재활성화되어 재시도 가능하다

### 2) 구독 해제
- Given `subscription-list`에 항목이 1개 이상 있을 때
- When 사용자가 특정 항목의 해제 control을 클릭하면
- Then 해당 항목이 목록에서 제거되고 '구독이 해제되었습니다' 텍스트가 표시되며 localStorage가 갱신된다
- And 마지막 남은 항목을 해제하면 empty 상태로 전이되어 '표시할 구독이 없습니다' 텍스트가 표시된다

### 3) 상태 필터
- Given `subscription-filter-status`에 '전체' 외의 값이 선택되어 있을 때
- When `subscription-list`가 렌더링되면
- Then 선택된 status와 일치하는 항목만 표시된다
- And 필터 결과가 0건이면 empty 상태와 동일한 '표시할 구독이 없습니다' 텍스트가 표시된다
- And 필터 적용 중 새 항목이 추가되어도 현재 필터 조건과 맞지 않으면 화면에 나타나지 않는다(필터 유지)

### 4) 새로고침 후 localStorage 복원
- Given 이전 세션에서 저장된 구독 목록이 localStorage에 존재할 때
- When 페이지가 새로고침되면
- Then `subscription-root`가 idle 상태로 초기화되고 저장된 항목이 `subscription-list`에 복원된다
- And localStorage 데이터가 없거나 파싱에 실패하면 예외를 throw하지 않고 빈 배열로 취급되어 empty 상태가 표시된다

## Edge case / 실패 케이스
- `subscription-service-select`에 값이 없는 상태로 제출 시도 → 클라이언트 유효성 검사로 제출 자체를 차단한다(adding 상태에 진입하지 않는다).
- 이미 구독 중인 서비스를 다시 제출 → 중복 레코드를 추가하지 않고 기존 항목을 유지한다.
- localStorage 값이 손상된 JSON(파싱 실패) → 빈 배열로 폴백하며 화면은 empty 상태로 렌더링한다(에러 throw 금지).
- 저장 실패(예: localStorage 쓰기 실패) 이후에도 `subscription-add-submit`은 다시 사용 가능해야 한다(주 실행 control 재사용 invariant).
- 320px 폭에서 목록 항목이 세로 stack되어도 텍스트/버튼 overflow가 발생하지 않아야 한다.

## API 스펙
해당 없음 — client-only canary이며 서버 API를 추가하지 않는다.

## 검증 명령
- `node --test demo/service-subscriptions-canary/tests/*.test.js`
