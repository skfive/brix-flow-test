# 전달 상태 배지 구현 설계 (BF-1252 / Phase 21)

> 본 문서는 planner가 동결한 **실행 설계(planning-contract@v1)** 이자 **UI handoff 계약(ui-contract@v1)** 의 렌더링본입니다.
> designer(BF-1253) / developer(BF-1254) / tester(BF-1257)는 이 문서와 frozen blueprint를 유일한 권위로 삼아 병렬 구현합니다.
> **selector·token·상태·파일 소유권을 변경하거나 재정의하지 마세요.** frozen blueprint가 유일한 권위이며 본 문서는 이를 재정의하지 않습니다.

## 0. 범위와 보존 영역

- **목표**: `GET /api/phase21-validation/delivery-status` API와 전달 상태 배지 UI를 designer/developer가 병렬 구현할 수 있도록 실행 설계와 handoff 계약을 동결한다.
- **제공 방식**: DB 변경 없이 **결정적(deterministic) read-only 응답**으로 제공한다. 마이그레이션·스키마 변경·쓰기 경로를 추가하지 않는다.
- **보존 영역(침범 금지)**: 인증(auth), Jira, GitHub webhook, credential/secret, 배포 설정. 이 영역의 파일·동작을 어떤 방식으로도 변경하지 않는다.
- **파일 정책**: 아래 파일 목록·소유자·상태 계약은 frozen blueprint가 유일한 권위이다. 본 계획 문서는 **새 파일·새 역할·계약 외 요구사항을 추가하지 않는다**. 모든 대상 파일 변경은 `additive`(기존 계약 확장, 기존 selector/token 재정의 금지)로만 수행한다.

## 1. 파일·소유권 계약 (frozen)

| 경로 | 소유자 | 상태 정책 |
| --- | --- | --- |
| `docs/design/phase21-delivery-status-BF-1252.md` | designer | additive |
| `src/api/phase21-validation/delivery-status.ts` | developer | additive |
| `src/ui/delivery-status-badge.d.ts` | developer | additive |
| `src/ui/delivery-status-badge.test.ts` | developer | additive |
| `src/ui/delivery-status-badge.ts` | developer | additive |

- 소유자가 아닌 페르소나는 위 파일을 수정하지 않는다. 변경이 필요하면 직접 고치지 말고 PR/Jira 코멘트로 담당 페르소나에게 요청한다.
- **후조건 불변식**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(idle)으로 되돌리고, 주 실행 control(`delivery-status-refresh`)을 다시 사용할 수 있어야 한다.

## 2. API 응답 계약 (frozen)

- **엔드포인트**: `GET /api/phase21-validation/delivery-status`
- **성격**: read-only, 결정적 응답. 요청 파라미터에 의존하지 않으며 DB 변경을 유발하지 않는다.
- **갱신 시각 필드**: `updatedAt` — **ISO 8601** 문자열(예: `2026-07-29T12:34:56Z`). UI의 `delivery-status-updated-at`에 표시된다.

### 2.1 성공 응답 (HTTP 200)

```json
{
  "status": "success",
  "state": "success",
  "updatedAt": "2026-07-29T12:34:56Z",
  "label": "전달 완료"
}
```

- `state`는 UI 상태 모델과 동일한 enum(`idle | loading | success | error`) 중 하나를 반환한다. 정상 조회 결과는 `success`.

### 2.2 실패 응답 (HTTP 5xx)

```json
{
  "status": "error",
  "state": "error",
  "updatedAt": "2026-07-29T12:34:56Z",
  "error": {
    "code": "delivery_status_unavailable",
    "message": "전달 상태를 조회할 수 없습니다."
  }
}
```

- 내부 조회 실패 시 UI는 `error` 상태로 전이하고 상태명을 화면 텍스트/접근성 이름으로 노출한다.

### 2.3 권한 거부 응답 (HTTP 403)

```json
{
  "status": "error",
  "state": "error",
  "error": {
    "code": "delivery_status_forbidden",
    "message": "전달 상태 조회 권한이 없습니다."
  }
}
```

- 권한 거부는 보존 영역(인증)의 기존 동작을 변경하지 않고 기존 인가 계층의 결과를 그대로 전달만 한다.

## 3. UI 상태 모델 (frozen)

상태 enum: **`idle` → `loading` → `success` | `error`**

| 상태 | 진입 조건 | 표시 | control |
| --- | --- | --- | --- |
| `idle` | 최초 렌더 / 초기화·취소·실패 복귀 | 초기 label, timestamp 비움 또는 마지막 값 | refresh 사용 가능 |
| `loading` | refresh 실행 → 응답 대기 | 진행 표시, label "조회 중" | refresh 비활성(중복 요청 방지) |
| `success` | 200 응답 수신 | success 색상, label + `updatedAt` 표시 | refresh 사용 가능 |
| `error` | 5xx/403 응답 또는 네트워크 실패 | error 색상, 오류 상태명 텍스트 | refresh 사용 가능(재시도) |

- **취소/실패 복귀 불변식**: `loading` 중단 또는 `error` 처리 후 반드시 control을 다시 활성화하고 상태를 결정적으로 정리한다.

## 4. DOM selector 계약 (frozen — 변경 금지)

### 4.1 DOM ID

| ID | 용도 |
| --- | --- |
| `delivery-status-badge` | 배지 루트 컨테이너. `aria-live="polite"` |
| `delivery-status-refresh` | 상태 재조회 주 실행 control(버튼) |
| `delivery-status-updated-at` | 마지막 갱신 시각(ISO 8601 → 표시 포맷) |

### 4.2 CSS class

| class | 용도 |
| --- | --- |
| `delivery-badge` | 배지 루트 레이아웃 |
| `delivery-badge__label` | 상태명 텍스트 |
| `delivery-badge__timestamp` | 갱신 시각 텍스트 |
| `delivery-badge__refresh` | 재조회 control 스타일 |

## 5. Design token (frozen — 값 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-success` | `#16a34a` | success 상태 강조색 |
| `--color-status-error` | `#dc2626` | error 상태 강조색 |
| `--space-badge-gap` | `8px` | 배지 내부 요소 간격 |

## 6. 접근성 (frozen)

1. `delivery-status-badge`는 `aria-live="polite"`로 상태 변경을 안내한다.
2. `delivery-status-refresh` control은 명시적인 `aria-label`을 가지며 키보드 focus/Enter로 조작 가능하다.
3. 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 7. 반응형 (frozen)

1. **320px 이상**에서 badge content overflow가 발생하지 않는다.
2. **480px 미만**에서 `delivery-badge__label`과 `delivery-badge__timestamp`가 **세로로 stack**된다.

## 8. Acceptance Criteria (Given/When/Then)

- **AC-1 성공 조회**
  - Given 사용자가 전달 상태 배지가 있는 화면을 연 상태에서
  - When `delivery-status-refresh`를 실행하고 API가 200을 반환하면
  - Then 배지는 `success` 상태로 전이하고 `--color-status-success`(#16a34a) 강조와 상태명 텍스트, `delivery-status-updated-at`에 ISO 8601 기반 갱신 시각을 표시한다.

- **AC-2 조회 실패**
  - Given 사용자가 배지 화면을 연 상태에서
  - When refresh 실행 후 API가 5xx(`delivery_status_unavailable`)를 반환하면
  - Then 배지는 `error` 상태로 전이하고 `--color-status-error`(#dc2626) 강조와 오류 상태명 텍스트를 노출하며, refresh control은 재시도 가능하도록 다시 활성화된다.

- **AC-3 권한 거부**
  - Given 권한이 없는 사용자가 배지 화면을 연 상태에서
  - When refresh 실행 후 API가 403(`delivery_status_forbidden`)을 반환하면
  - Then 배지는 `error` 상태로 전이하고 권한 오류 메시지를 상태명으로 노출하며, 인증/인가 계층의 기존 동작은 변경되지 않는다.

- **AC-4 접근성**
  - Given 스크린리더/키보드 사용자가
  - When 상태가 변하거나 refresh를 조작하면
  - Then `aria-live="polite"`로 변경이 안내되고, refresh는 `aria-label` + 키보드 focus/Enter로 조작 가능하며, 상태는 색상 외 텍스트로도 구분된다.

- **AC-5 반응형**
  - Given viewport 폭이 변할 때
  - When 320px 이상이면 overflow가 없고, 480px 미만이면
  - Then label과 timestamp가 세로로 stack된다.

- **AC-6 상태 복귀**
  - Given `loading` 중 취소되거나 요청이 실패한 뒤
  - When 처리가 끝나면
  - Then 상태와 진행 표시가 초기값으로 복귀하고 주 실행 control이 다시 사용 가능하다.

## 9. Edge case · 실패 케이스

- **네트워크 타임아웃/중단**: `loading`에서 벗어나 `error`로 전이하고 control 재활성화(AC-6 불변식 준수).
- **연속 클릭**: `loading` 중 refresh 비활성으로 중복 요청 방지.
- **`updatedAt` 누락/비 ISO 8601**: 성공이라도 방어적으로 timestamp 표시를 비우고 상태명은 유지(계약상 성공 응답은 항상 ISO 8601 `updatedAt` 포함).
- **좁은 폭(≤320px)에서 긴 label/timestamp**: overflow 금지 규칙 준수(줄바꿈/stack).
- **권한 거부와 서버 오류 구분**: `error.code`(`delivery_status_forbidden` vs `delivery_status_unavailable`)로 메시지 분기, 상태는 공통 `error`.

## 10. 후속 페르소나 handoff 요약

- **designer(BF-1253)**: `docs/design/phase21-delivery-status-BF-1252.md`에 위 selector/token/상태/접근성/반응형을 그대로 반영. selector·token 재정의 금지.
- **developer(BF-1254)**: `src/api/phase21-validation/delivery-status.ts`(read-only, DB 변경 없음) + `src/ui/delivery-status-badge.ts`/`.d.ts`/`.test.ts` 구현. §2 응답 계약, §4 DOM, §3 상태 모델 준수.
- **tester(BF-1257)**: `tests/phase21-delivery-status.test.ts`에서 AC-1~6 검증.
