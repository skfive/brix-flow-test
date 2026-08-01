# 전달 상태 배지 실행 설계 — BF-1440

## 0. 문서 정보
- Jira: BF-1440 (epic), 본 문서는 BF-1443 (planner) 산출물
- 작성자: 박기획 (planner)
- 대상 downstream: BF-1441 (designer), BF-1442 (developer), BF-1445 (tester)
- 성격: 아래 UI/API 계약은 **frozen** — designer/developer는 selector, token, 응답 형식을 재정의하지 않고 그대로 구현한다.

## 1. 목표
운영자가 대시보드에서 전달(delivery) 상태를 즉시 파악할 수 있도록 `normal / warning / failed` 3단계 상태를 배지로 노출한다. 배지는 색상과 한글 상태 텍스트를 함께 표시하고, 새로고침으로 최신 상태를 재조회할 수 있다.

## 2. 산출물 파일 및 소유자 (frozen)

| 경로 | 소유 역할 | 설명 |
| --- | --- | --- |
| `docs/design/delivery-status-BF-1440.md` | designer | 시각 명세 (색상/타이포/레이아웃 상세) |
| `docs/design/delivery-status-BF-1440-mockup.html` | designer | 정적 목업 |
| `delivery-status/index.html` | developer | 실행 가능한 엔트리 마크업 |
| `delivery-status/src/delivery-status.js` | developer | 상태 조회·렌더링·새로고침 로직 |
| `delivery-status/tests/delivery-status.test.js` | developer | 단위 테스트 |

본 문서(`docs/plans/delivery-status-BF-1440-plan.md`)는 planner 소유이며 위 파일 소유권을 재배정하지 않는다. 새 파일이나 새 역할을 추가하지 않는다.

## 3. UI 계약 (frozen — selector/token 변경 금지)

### 3.1 DOM ID
- `delivery-status-root`
- `delivery-status-badge`
- `delivery-status-label`
- `delivery-status-updated`
- `delivery-status-refresh`

### 3.2 CSS 클래스
- `delivery-status`
- `delivery-status__card`
- `delivery-status__badge`
- `delivery-status__badge--normal`
- `delivery-status__badge--warning`
- `delivery-status__badge--failed`
- `delivery-status__refresh`

### 3.3 상태 (state machine)
- `loading` — 최초 진입 또는 새로고침 요청 중
- `normal` — 정상 전달
- `warning` — 지연 등 경고
- `failed` — 전달 실패
- `error` — 상태 조회 자체가 실패한 경우 (네트워크/응답 오류)

전이: `loading → (normal | warning | failed | error)`. `delivery-status-refresh` 클릭 시 항상 `loading`으로 재진입한다.

**초기화·취소·실패 후 원복 원칙**: `error` 또는 `failed`로 귀결되더라도 `delivery-status-refresh` 컨트롤은 비활성화되지 않고 즉시 재사용 가능해야 하며, 재조회 시작 시 배지·라벨·갱신시각 표시는 이전 상태 잔상 없이 `loading` 초기값으로 리셋한다.

### 3.4 디자인 토큰
- `--color-status-normal: #16a34a`
- `--color-status-warning: #d97706`
- `--color-status-failed: #dc2626`
- `--color-status-error: #6b7280`
- `--space-card-gap: 16px`

### 3.5 접근성
- `delivery-status-refresh` 버튼은 `aria-label="전달 상태 새로고침"`을 가진다.
- `delivery-status-badge`는 `aria-live="polite"`로 상태 변경을 스크린리더에 알린다.
- 새로고침 컨트롤은 Tab 포커스 이동과 Enter/Space 키 작동을 지원한다.
- 모든 상태는 색상만으로 구분하지 않는다 — 배지 옆 `delivery-status-label`에 한글 상태 텍스트(예: "정상", "경고", "실패")를 화면 텍스트와 접근성 이름(accessible name) 모두에 노출한다.

### 3.6 반응형
- 320px 이상 폭에서 카드 콘텐츠가 넘치지 않는다 (overflow 없음).
- 480px 미만 폭에서는 카드 내부 요소(배지, 라벨, 갱신시각, 새로고침 버튼)가 단일 컬럼으로 세로 배치된다.

## 4. API 계약 (frozen)

`GET /api/phase21-validation/delivery-status`

- 응답 예시:
  ```json
  { "status": "normal", "updatedAt": "2026-08-01T09:00:00Z" }
  ```
- `status`: enum `normal | warning | failed` — 위 3개 값 외 다른 값을 만들지 않는다.
- `updatedAt`: ISO 8601 문자열.
- 이 엔드포인트는 **결정적(deterministic)**이고 **읽기 전용**이다 — 외부 네트워크 호출이나 DB 쓰기를 하지 않는다.
- 프런트엔드는 `delivery-status-refresh` 클릭 시 이 엔드포인트를 재호출해 배지를 갱신한다.

## 5. 보존 영역 (변경 금지)

본 작업 범위는 전달 상태 배지 UI/API 뿐이며 아래 영역은 이번 변경으로 손대지 않는다:
- 인증(auth) 로직
- Jira 연동
- GitHub webhook 처리
- credential 저장/취급
- DB schema
- Docker 설정

## 6. Downstream 작업 범위 안내

- **BF-1441 (designer)**: `docs/design/delivery-status-BF-1440.md`, `docs/design/delivery-status-BF-1440-mockup.html` 작성. 위 §3 selector/token/state/접근성/반응형 계약을 그대로 반영한다.
- **BF-1442 (developer)**: `delivery-status/index.html`, `delivery-status/src/delivery-status.js`, `delivery-status/tests/delivery-status.test.js` 구현. §3 UI 계약과 §4 API 계약을 그대로 구현하며 selector/응답 형식을 재정의하지 않는다.
- **BF-1445 (tester)**: `delivery-status/tests/delivery-status.e2e.test.js` 기준으로 normal/warning/failed 렌더링, 새로고침 재조회, 접근성(aria-live, aria-label, 키보드 조작) 회귀를 검증한다.

## 7. Acceptance Criteria (Given/When/Then)

1. **정상 상태 표시**
   - Given: `GET /api/phase21-validation/delivery-status`가 `{status:"normal", updatedAt:...}`을 반환할 때
   - When: `delivery-status-root`가 로드되면
   - Then: `delivery-status-badge`에 `delivery-status__badge--normal` 클래스가 적용되고 `delivery-status-label`에 "정상"이 표시되며 `delivery-status-updated`에 갱신 시각이 노출된다.

2. **경고/실패 상태 표시**
   - Given: 응답 `status`가 `warning` 또는 `failed`일 때
   - When: 렌더링되면
   - Then: 대응하는 `delivery-status__badge--warning` / `delivery-status__badge--failed` 클래스와 한글 라벨("경고"/"실패")이 표시된다.

3. **새로고침 동작**
   - Given: 어떤 상태로든 배지가 표시된 상태에서
   - When: 사용자가 `delivery-status-refresh`를 클릭(또는 포커스 후 Enter/Space)하면
   - Then: 상태가 `loading`으로 전환된 후 API 재호출 결과로 배지가 갱신되고, 실패해도 새로고침 버튼은 다시 사용 가능하다.

4. **조회 실패(error) 처리**
   - Given: API 호출이 네트워크 오류 등으로 실패할 때
   - When: 응답을 받지 못하면
   - Then: 상태는 `error`로 전환되고 색상뿐 아니라 텍스트로도 오류임을 알리며, `delivery-status-refresh`로 재시도할 수 있다.

5. **접근성**
   - Given: 스크린리더 사용자가 배지를 관찰 중일 때
   - When: 상태가 변경되면
   - Then: `aria-live="polite"` 영역을 통해 변경이 통지되고, 새로고침 버튼은 `aria-label="전달 상태 새로고침"`으로 식별 가능하다.

6. **반응형**
   - Given: 뷰포트 폭이 320px~479px일 때
   - When: 카드가 렌더링되면
   - Then: 내부 요소가 단일 컬럼으로 세로 배치되고 콘텐츠 overflow가 발생하지 않는다.

## 8. Edge Case / 실패 케이스

- API가 정의되지 않은 `status` 값을 반환하는 경우: 프런트엔드는 이를 `error` 상태로 취급한다 (계약 외 값에 대한 방어적 처리).
- 네트워크 타임아웃: `error` 상태로 전환하고 새로고침으로 재시도 가능해야 한다.
- 연속 새로고침 클릭: 진행 중인 요청이 있으면 중복 요청을 쌓지 않고 최신 응답만 반영한다 (구현 세부는 developer 재량이나 최종 사용자에게는 최신 상태만 노출되어야 한다).
