# 전달 증거 상태판 구현 설계 (BF-1293)

> 본 문서는 **frozen blueprint(ui-contract@v1 / planning-contract@v1)** 를 실행 가능한 형태로
> 렌더링한 것입니다. 파일 소유권·상태 계약의 유일한 권위는 frozen blueprint이며,
> 본 문서는 이를 재정의하지 않고 그대로 설명합니다. 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

## 1. 목적 / 범위

- **목적**: 전달 증거 상태판(Delivery Evidence Status Board) UI를 designer와 developer가
  동일한 계약(파일명·selector·상태·token·접근성·반응형) 위에서 병렬 구현할 수 있도록 설계를 동결한다.
- **실행 프로필**: `implementation-strict`
- **후속 producer**: BF-1291(designer), BF-1292(developer), BF-1295(tester)

## 2. 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `demo/phase21-delivery-evidence/index.html` | developer | additive |
| `demo/phase21-delivery-evidence/src/feature.js` | developer | additive |
| `docs/design/contract.md` | designer | additive |

> **주의(ownership 교정)**: 저장소 규약 capsule의 `expected_entry_path`
> (`demo/phase21-delivery-evidence/index.html`)는 planner의 owned_paths가 아니라 **developer 소유**입니다.
> planner는 `docs/plans/implementation-plan.md`만 작성하며, 실제 demo 파일은 developer/designer가
> 각자 owned_paths에서 생성합니다. planner가 해당 경로에 구현하지 않습니다.

## 3. UI 계약 (exact — selector/token 변경·재정의 금지)

### 3.1 DOM ID (exact)

| DOM ID | 역할 |
| --- | --- |
| `evidence-board-root` | 상태판 루트 컨테이너 |
| `evidence-filter-role` | 역할 필터 control |
| `evidence-list` | 증거 카드 목록 컨테이너 |
| `evidence-empty` | 빈 상태(필터 결과 없음) 메시지 영역 |

### 3.2 CSS class (exact)

| CSS class | 역할 |
| --- | --- |
| `evidence-board` | 상태판 레이아웃 wrapper |
| `evidence-card` | 개별 증거 카드 |
| `evidence-badge` | 증거 상태 배지(pass/fail) |
| `evidence-empty__message` | 빈 상태 안내 문구 |

### 3.3 상태 (states, exact)

| 상태 | 의미 | 화면/접근성 표현 |
| --- | --- | --- |
| `loading` | fixture 로딩 중 | 진행 표시 노출, 주 control 비활성 |
| `ready` | 증거 카드 정상 렌더 | 카드 목록 표시 |
| `filtered-empty` | 필터 결과 0건 | `evidence-empty`에 `role=status` 메시지 |
| `error` | 로딩/렌더 실패 | 오류 상태명을 화면 텍스트로 노출 |

> **초기화/취소/실패 후조건**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고,
> 주 실행 control(역할 필터)을 다시 사용할 수 있어야 한다.

### 3.4 Design token / CSS 변수 (exact)

| 토큰 | 값 |
| --- | --- |
| `--color-surface-card` | `#1e293b` |
| `--color-badge-pass` | `#22c55e` |
| `--color-badge-fail` | `#ef4444` |
| `--space-card-gap` | `16px` |

### 3.5 접근성 (accessibility, exact)

1. 역할 필터 control(`evidence-filter-role`)은 명시적인 `aria-label`을 가진다.
2. 빈 상태 메시지(`evidence-empty`)는 `role=status`로 스크린리더에 안내된다.
3. 카드 목록(`evidence-list`)은 키보드 탭 순서로 접근 가능하다.
4. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive, exact)

1. 320px 이상에서 카드 목록에 가로 overflow가 발생하지 않는다.
2. 640px 미만에서 카드가 단일 열(single column)로 재배치된다.

## 4. 정적 fixture 데이터 형태 (고정)

`feature.js`가 소비할 정적 fixture는 아래 형태로 고정한다. (네트워크 호출 없음, in-source 상수)

```js
// 각 항목 = 하나의 전달 증거 레코드
{
  requirement: string,   // 요구사항 식별/설명 (예: "REQ-1 상태판 렌더")
  role:        string,   // 역할 (예: "designer" | "developer" | "tester")
  state:       string,   // "pass" | "fail" — evidence-badge 색상/상태명 매핑
  evidenceType:string     // 증거 유형 (예: "build_result" | "test_result" | "review_verdict")
}
```

- 역할 필터(`evidence-filter-role`)는 `role` 값으로 카드를 필터링한다.
- 필터 결과가 0건이면 상태를 `filtered-empty`로 전환하고 `evidence-empty`를 노출한다.
- `state=pass` → `--color-badge-pass`, `state=fail` → `--color-badge-fail`.
  단, 색상만으로 구분하지 않고 상태명 텍스트를 배지에 함께 노출한다(§3.5-4).

## 5. Acceptance Criteria (Given/When/Then)

### AC-1 초기 렌더 (ready)
- **Given** 정적 fixture에 하나 이상의 증거 레코드가 있고
- **When** `#evidence-board-root`가 마운트되면
- **Then** 상태는 `ready`가 되고 각 레코드가 `.evidence-card`로 `#evidence-list`에 렌더되며,
  각 카드는 `state`에 맞는 `.evidence-badge`(pass/fail 색상 + 상태명 텍스트)를 포함한다.

### AC-2 역할 필터 (ready → ready)
- **Given** `ready` 상태에서
- **When** 사용자가 `#evidence-filter-role`로 특정 역할을 선택하면
- **Then** 해당 `role`의 카드만 남고 나머지는 목록에서 제거된다.

### AC-3 빈 결과 (filtered-empty)
- **Given** `ready` 상태에서
- **When** 선택한 역할에 해당하는 레코드가 0건이면
- **Then** 상태는 `filtered-empty`가 되고 `#evidence-empty`(`role=status`)에
  `.evidence-empty__message`가 스크린리더로 안내되며 `#evidence-list`는 비워진다.

### AC-4 로딩/초기화 (loading → ready)
- **Given** fixture 로딩 중이면 상태는 `loading`이고 진행 표시가 노출되며 주 control은 비활성이다.
- **When** 로딩이 끝나면
- **Then** 상태는 `ready`가 되고 진행 표시는 사라지며 역할 필터를 다시 사용할 수 있다.

### AC-5 실패 및 복구 (error → 초기값)
- **Given** 로딩/렌더 중 오류가 발생하면
- **When** 상태가 `error`로 전환되면
- **Then** 오류 상태명이 화면 텍스트로 노출되고, 초기화/취소 시 상태와 진행 표시가
  초기값으로 되돌아가며 역할 필터가 다시 사용 가능해진다.

## 6. Edge case / 실패 케이스

- **fixture 0건**: 초기부터 `filtered-empty`가 아니라 빈 `ready`로 두고, 필터 미적용 시에는
  전체 목록이 비어 있음을 `evidence-empty`로 안내한다(색상 아닌 텍스트로 상태명 노출).
- **알 수 없는 role 필터 값**: 매칭 0건과 동일하게 `filtered-empty`로 처리한다.
- **알 수 없는 state 값**: `pass`/`fail` 외 값은 fail 계열로 취급하지 않고 상태명 텍스트를 그대로
  노출하며 색상 토큰을 임의로 신설하지 않는다(토큰은 §3.4 4종만 사용).
- **연속 필터 전환**: 매 전환마다 목록을 재계산하며 이전 상태 잔여 카드가 남지 않는다.
- **320px 최소 폭**: 가로 overflow 금지(§3.6-1). 640px 미만은 단일 열(§3.6-2).

## 7. 검증 (권위 명령)

- 저장소 focused 검증 권위 명령:
  `node --test demo/phase21-delivery-evidence/tests/*.test.js`
- test는 `demo/phase21-delivery-evidence/tests/**`(read-only, tester 소유 흐름)가 담당하며,
  planner는 계약 정의까지만 수행한다.

## 8. 산출물 경로

| 산출물 | 경로 | 소유자 |
| --- | --- | --- |
| 실행 설계(본 문서) | `docs/plans/implementation-plan.md` | planner (BF-1293) |
| UI 계약 상세 | `docs/design/contract.md` | designer (BF-1291) |
| 마크업 | `demo/phase21-delivery-evidence/index.html` | developer (BF-1292) |
| 동작 로직 | `demo/phase21-delivery-evidence/src/feature.js` | developer (BF-1292) |
| 테스트 | `demo/phase21-delivery-evidence/tests/**` | tester (BF-1295) |

## 9. Producer 준수 규칙 (frozen invariant)

- designer와 developer는 §3의 selector와 token을 **변경하거나 재정의하지 않는다**.
- 위 3개 계약 파일에 대한 변경은 **additive**만 허용한다.
- 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며 본 문서는 이를 재정의하지 않는다.
