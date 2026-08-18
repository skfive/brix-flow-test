# P1 충돌 검증 실행 설계 (BF-1865)

> 작성: planner (박기획) · Task BF-1868
> 이 문서는 designer(BF-1866)와 developer(BF-1867)가 **병렬**로 따를 실행 설계이며,
> frozen blueprint의 파일·소유자·상태·후조건을 그대로 설명한다.
> 새 파일·새 역할·새 요구사항을 추가하지 않는다. selector·token은 재정의하지 않는다.

## 1. 목적

P1 충돌 검증(P1 Conflict Check)의 목적은 두 가지다.

1. **UI 계약 실증**: 단일 페이지(제목 1개 + 상태 배지 1개)를 병렬 producer가 각자 브랜치에서 동일 계약대로 구현한다.
2. **add/add 충돌 실증**: designer와 developer가 **각자 브랜치에서 `p1-conflict-check/NOTES.md`를 새 파일로 생성**하여, 통합 시점에 의도된 add/add 병합 충돌을 재현한다. 이 충돌은 검증 목적의 산출물이므로 **제거·사전 병합·우회하지 않는다.**

## 2. 병렬 실행 구성

| packet | role | 산출물 | blocked_by |
| --- | --- | --- | --- |
| plan | planner | `docs/plans/BF-1865/implementation-plan.md` | (없음) |
| design | designer | `p1-conflict-check/design.md`, `p1-conflict-check/NOTES.md` | plan |
| develop | developer | `p1-conflict-check/index.html`, `p1-conflict-check/NOTES.md` | plan |
| review | reviewer | (검토) | design, develop |
| test | tester | (검증) | review |

- designer와 developer는 **상호 의존 없이 병렬**로 실행한다. 서로의 산출물을 기다리지 않는다.
- 두 packet 모두 이 실행 설계(승인된 blueprint)를 따른다.
- designer/developer는 selector와 token을 **변경·재정의하지 않는다.**

## 3. Exact UI 계약 (frozen — 그대로 구현)

단일 페이지: **제목(h1) 1개 + 상태 배지 1개**.

### 3.1 파일 및 소유자

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `p1-conflict-check/NOTES.md` | canonical work packet owner (designer·developer 양쪽이 각자 브랜치에서 생성) | additive (add/add 충돌 실증 대상) |
| `p1-conflict-check/design.md` | canonical work packet owner (designer) | additive |
| `p1-conflict-check/index.html` | developer | additive |

- 위 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.

### 3.2 DOM ID / class

- DOM ID: `p1-conflict-root`, `p1-status-badge`
- CSS class: `p1-conflict`, `p1-conflict__badge`

### 3.3 상태 (states)

- `ready` — 유일한 상태. 상태 배지에 상태명을 화면 텍스트로 노출한다.

### 3.4 상태 텍스트

- 제목(h1): `P1 Conflict Check`
- 상태 배지: `ready` 상태를 화면 텍스트로 노출하고 동일 의미를 `aria-label`로도 제공한다.

### 3.5 Design token / CSS 변수

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-ready` | `#16a34a` | ready 상태 배지 색상 |
| `--space-page-pad` | `16px` | 페이지 여백 |

- 위 token은 그대로 사용하며 값·이름을 변경하거나 재정의하지 않는다.

### 3.6 접근성 (accessibility)

- 페이지는 단일 `h1` 제목 `P1 Conflict Check`를 가진다.
- 상태 배지는 **색상 외에 상태 텍스트를 화면에 노출**하고 `aria-label`로도 제공한다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

### 3.7 반응형 (responsive)

- **320px 이상 viewport에서 콘텐츠 overflow가 발생하지 않는다.**

### 3.8 후조건 (postcondition)

- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(`ready`)으로 되돌리고, 주 실행 control을 다시 사용할 수 있어야 한다.

## 4. NOTES.md 중복 생성(add/add) 요구

- designer와 developer는 **각자 브랜치에서 `p1-conflict-check/NOTES.md`를 새 파일로 생성**한다.
- 통합 시 두 브랜치가 동일 경로에 서로 다른 내용을 추가하여 **add/add 병합 충돌**이 발생하는 것이 이 검증의 실증 목표다.
- 이 파일은 additive 정책이다. 어느 쪽도 상대의 파일을 제거·병합·사전 조정하지 않는다.
- 충돌 해소는 통합/검증 단계에서 다루며, 본 병렬 구현 단계에서는 각자 생성만 한다.

## 5. Acceptance Criteria (Given/When/Then)

### AC-1: 단일 페이지 렌더링
- **Given** producer가 계약대로 `p1-conflict-check/index.html`을 구현하고
- **When** 페이지를 연다
- **Then** 단일 `h1` `P1 Conflict Check`와 `p1-status-badge` 상태 배지 1개가 렌더링된다.

### AC-2: exact selector / token 준수
- **Given** frozen UI 계약
- **When** DOM을 검사한다
- **Then** `#p1-conflict-root`, `#p1-status-badge`, `.p1-conflict`, `.p1-conflict__badge`가 존재하고, `--color-status-ready=#16a34a`·`--space-page-pad=16px`가 정의되어 있다.

### AC-3: 접근성
- **Given** 렌더링된 페이지
- **When** 접근성 트리를 확인한다
- **Then** 상태 배지는 색상 외 `ready` 텍스트와 `aria-label`을 노출하고, 단일 `h1`이 존재한다.

### AC-4: 반응형
- **Given** viewport 폭 ≥ 320px
- **When** 페이지를 렌더링한다
- **Then** 콘텐츠 overflow가 발생하지 않는다.

### AC-5: 후조건 복원
- **Given** 초기화·취소·실패가 발생한 뒤
- **When** 상태를 확인한다
- **Then** 상태·진행 표시가 초기값(`ready`)으로 복원되고 주 실행 control을 다시 사용할 수 있다.

### AC-6: add/add 충돌 실증
- **Given** designer·developer가 각자 브랜치에서 `p1-conflict-check/NOTES.md`를 새 파일로 생성하고
- **When** 두 브랜치를 통합한다
- **Then** `p1-conflict-check/NOTES.md`에서 add/add 충돌이 관측된다(제거·사전 병합 금지).

## 6. Edge case · 실패 케이스

- **selector·token 변경**: 금지. 변경 시 계약 위반으로 review에서 반려.
- **NOTES.md 사전 병합/제거**: 금지. add/add 충돌 실증 목적을 무효화한다.
- **h1 다중/누락**: 단일 `h1`만 허용.
- **색상만으로 상태 구분**: 금지. 상태명을 텍스트+접근성 이름으로 노출해야 한다.
- **320px 미만 대응**: 계약 범위 밖. 계약은 320px 이상만 overflow 무발생을 보장한다.
- **파일 소유권 재정의**: 금지. frozen blueprint가 유일한 권위다.
