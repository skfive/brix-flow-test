# 타임라인 카드 구현 설계 — execution-timeline-canary (BF-1468)

## 1. 목적 및 범위

정적 fixture 데이터를 읽어 렌더링하는 **읽기 전용** 타임라인 카드 캔러리(canary) 구현을 위한 실행 설계 문서다.
본 문서는 상위 frozen Execution Blueprint(`ui-contract@v1`, sha256:4aac10680a5ebc89b5d2e23b00f8fbfa3f3e24807d56cb8115d0906d4b89c1f8)의 계약을 그대로 서술하며, 새로운 파일·역할·경로를 추가하지 않는다.

- 대상 라우트: `/demo/execution-timeline-canary-0802`
- 진입 파일: `demo/execution-timeline-canary-0802/index.html`
- 데이터 소스: 정적 fixture (네트워크 호출 없음, 클라이언트 내 고정 데이터)
- 쓰기/수정 동작 없음 — 카드는 fixture를 읽어 표시만 한다. 유일한 상호작용은 `timeline-refresh` 컨트롤을 통한 재조회(re-render) 트리거뿐이다.

## 2. 파일 소유권 (frozen — 변경 금지)

Blueprint가 유일한 권위이며 본 문서는 이를 재서술만 한다.

| 경로 | 소유 역할 | 상태 |
|---|---|---|
| `demo/execution-timeline-canary-0802/index.html` | developer | additive |
| `demo/execution-timeline-canary-0802/src/feature.js` | developer | additive |
| `docs/design/execution-timeline-canary-contract.md` | designer | additive |
| `docs/plans/execution-timeline-canary-plan.md` (본 문서) | planner | — |

designer/developer는 위 소유 파일 외 경로를 생성하거나 selector·token을 재정의하지 않는다.

## 3. UI 계약 (exact — designer/developer는 그대로 구현)

### 3.1 DOM ID / CSS class

- DOM ID: `timeline-root`, `timeline-refresh`, `timeline-status`
- CSS class: `timeline`, `timeline__card`, `timeline__refresh`, `timeline__status`

### 3.2 컴포넌트 상태 (loading / ready / empty / error)

카드 컨테이너(`#timeline-root`)는 아래 4개 상태 중 정확히 하나를 가진다.

| 상태 | 트리거 | 화면 표현 |
|---|---|---|
| `loading` | 최초 진입, 또는 `timeline-refresh` 활성화 직후 | `#timeline-status`에 로딩 텍스트, 단계 카드 비표시 |
| `ready` | fixture 로드 성공, 단계 1개 이상 | `.timeline__card` 목록 렌더링 |
| `empty` | fixture 로드 성공, 단계 0개 | `#timeline-status`에 빈 상태 안내 텍스트 |
| `error` | fixture 로드 실패 | `#timeline-status`에 오류 안내 텍스트, `timeline-refresh`로 재시도 가능 |

초기화·취소·실패 이후에는 상태와 진행 표시가 초기값(`loading` 진입 전 대기 가능 상태 또는 최근 `ready`/`empty`/`error` 중 하나)으로 되돌아가고, `timeline-refresh` 컨트롤은 다시 사용 가능해야 한다.

### 3.3 디자인 토큰 (frozen — 추가/재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-action-primary` | `#2563eb` | `timeline-refresh` 등 주요 액션 강조 |
| `--space-control-gap` | `12px` | 컨트롤 사이 간격 |
| `--color-status-done` | `#16a34a` | 단계 상태 "완료" 표시 |
| `--color-status-waiting` | `#f59e0b` | 단계 상태 "대기" 표시 |

단계 상태 라벨은 완료/진행/대기 3종이며, "진행" 표시에 대응하는 색상 토큰은 frozen 목록에 별도로 없으므로 `--color-action-primary`를 재사용한다(신규 토큰 추가 금지 제약에 따름). designer/developer는 이 매핑을 변경하지 않는다.

### 3.4 접근성 (frozen)

- `timeline-refresh` 컨트롤은 `aria-label="타임라인 새로고침"`을 가진다.
- 각 단계 상태는 색상 외에 명시적 텍스트 라벨(완료/진행/대기)로도 표시한다.
- `timeline-refresh`는 키보드 Enter/Space로 활성화 가능하다.
- 모든 상태(loading/ready/empty/error 및 단계별 완료/진행/대기)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름(accessible name)으로 노출한다.

### 3.5 반응형 (frozen)

- 320px 이상에서 content overflow가 발생하지 않는다.
- 480px 미만에서 `.timeline__card`가 세로로 스택된다.

## 4. Fixture 데이터 스키마

정적 fixture는 `demo/execution-timeline-canary-0802/src/feature.js` 소유 범위 내에서 developer가 정의·내장한다. 본 절은 스키마 계약만 고정한다.

```json
{
  "steps": [
    {
      "id": "string (고유 식별자)",
      "label": "string (단계명)",
      "status": "done | in-progress | waiting",
      "timestamp": "ISO 8601 문자열 | null (미도달 단계는 null)"
    }
  ],
  "updatedAt": "ISO 8601 문자열"
}
```

- `steps`가 빈 배열이면 컴포넌트는 `empty` 상태로 전이한다.
- fixture 파싱/조회 자체가 실패(예: 형식 오류)하면 `error` 상태로 전이한다.
- `status` 값과 화면 라벨 매핑: `done` → "완료", `in-progress` → "진행", `waiting` → "대기".

## 5. Acceptance Criteria (Given/When/Then)

**AC-1. 최초 로딩 → 정상 렌더링**
- Given 사용자가 `/demo/execution-timeline-canary-0802`에 진입하고 fixture에 단계 1개 이상이 있을 때
- When 페이지가 로드되면
- Then `#timeline-root`는 잠시 `loading` 상태를 거쳐 `ready` 상태로 전이하고, 각 단계가 `.timeline__card`로 렌더링되며 상태 라벨(완료/진행/대기)이 텍스트로 노출된다.

**AC-2. 빈 fixture**
- Given fixture의 `steps`가 빈 배열일 때
- When 페이지가 로드되면
- Then `empty` 상태로 전이하고 `#timeline-status`에 빈 상태 안내 텍스트가 표시된다.

**AC-3. 조회 실패**
- Given fixture 파싱/조회가 실패할 때
- When 로딩이 시도되면
- Then `error` 상태로 전이하고 `#timeline-status`에 오류 안내 텍스트가 표시되며 `timeline-refresh`는 계속 활성 상태로 재시도를 허용한다.

**AC-4. 새로고침 재시도**
- Given 카드가 `ready`, `empty`, `error` 중 어느 상태에 있든
- When 사용자가 `timeline-refresh`를 마우스 클릭 또는 키보드 Enter/Space로 활성화하면
- Then 카드는 `loading` 상태로 전이한 뒤 fixture를 재조회하여 `ready`/`empty`/`error` 중 하나로 다시 전이하고, 재시도 후에도 컨트롤은 다시 사용 가능한 상태로 남는다.

**AC-5. 접근성 — 색상 비의존**
- Given 임의의 컴포넌트 상태 또는 단계 상태
- When 스크린리더 또는 텍스트 전용 렌더링으로 확인하면
- Then 상태명이 색상 없이도 텍스트/접근성 이름으로 식별 가능하다.

## 6. Edge Case / 실패 케이스

- fixture 단계가 0개 → `empty` (AC-2).
- fixture 조회/파싱 실패 → `error`, 재시도 가능 (AC-3).
- `timeline-refresh` 연타(loading 도중 재활성화) → 진행 중인 로딩을 취소하고 새 로딩으로 대체하거나, 진행 중에는 컨트롤을 일시 비활성화한다. 어느 방식이든 재시도/취소 후에는 상태가 초기값으로 복귀하고 컨트롤이 재사용 가능해야 한다(§3.2 불변식).
- 480px 미만 초소형 뷰포트 → `.timeline__card` 세로 스택, 320px 이상에서 overflow 없음(§3.5).
- 단계 `status` 값이 스키마 외 값일 경우 별도 fallback 상태를 새로 정의하지 않는다 — 이는 developer 구현 범위이며 본 계획은 스키마(§4)를 고정하는 것으로 범위를 한정한다.

## 7. 산출물 및 검증

- 산출물 경로(frozen, 추가 금지): `demo/execution-timeline-canary-0802/index.html`, `demo/execution-timeline-canary-0802/src/feature.js`, `docs/design/execution-timeline-canary-contract.md`.
- 저장소 권위 검증 명령: `node --test demo/execution-timeline-canary-0802/tests/*.test.js`
- 본 계획 문서는 코드나 신규 파일을 추가하지 않으며, designer(BF-1466)와 developer(BF-1467)는 본 문서와 상위 frozen `ui-contract@v1`를 그대로 따른다.
