# 전달 상태 배지 — 구현 설계 및 UI 계약 (BF-1355)

> 본 문서는 PM 분해(BF-1355)를 designer(BF-1353)·developer(BF-1354)·tester(BF-1357)가
> 그대로 따르는 실행 설계이자 **동결(frozen)된 UI 계약**입니다.
> 아래 파일 소유권·상태 계약·selector·token 은 frozen Execution Blueprint 가 유일한 권위이며,
> 본 문서는 이를 **재정의 없이 렌더링**합니다. 후속 페르소나는 selector 와 token 을 변경/재정의하지 않습니다.
> 새 파일·새 역할·계약 밖 요구사항을 추가하지 않습니다.

---

## 1. Problem Statement (문제 정의)

- **현재 상황**: 전달(delivery) 동작의 진행/결과가 화면에 명시적으로 표시되지 않아, 사용자가 전달이
  진행 중인지, 완료되었는지, 실패했는지 알 수 없다.
- **사용자 페인 포인트**: 상태 피드백 부재 → 중복 전달 시도, 실패 인지 지연, 스크린리더 사용자의 상태 인지 불가.
- **비즈니스 임팩트**: 전달 신뢰성에 대한 사용자 확신 저하, 지원 문의 증가.

## 2. Proposed Solution (제안 해법)

`idle → sending → delivered / failed` 4가지 상태를 하나의 **전달 상태 배지**로 표현한다.
배지는 상태 텍스트와 새로고침 control 을 제공하며, 색상뿐 아니라 화면 텍스트·접근성 이름으로 상태를 노출한다.

### User Stories
- 사용자로서, 전달이 진행 중임을 배지에서 즉시 확인하고 싶다.
- 사용자로서, 전달 실패 시 실패 상태를 명확히 보고 새로고침으로 상태를 재확인하고 싶다.
- 스크린리더 사용자로서, 상태 변경을 음성으로 안내받고 키보드만으로 새로고침을 조작하고 싶다.

---

## 3. 동결된 UI 계약 (Frozen UI Contract) — ui-contract@v1

> **불변식**: designer 와 developer 는 아래 selector 와 token 을 **변경하거나 재정의하지 않는다.**
> 아래 4개 파일 외 새 파일을 만들지 않으며, 소유자를 재배정하지 않는다.

### 3.1 파일 소유권 (File Ownership) — additive 정책

| 파일 경로 | 소유자 | 정책 |
|---|---|---|
| `apps/delivery-badge/index.html` | developer | additive |
| `apps/delivery-badge/src/badge.js` | developer | additive |
| `docs/design/delivery-badge-contract.md` | designer | additive |
| `docs/design/delivery-badge-mockup.html` | designer | additive |

### 3.2 DOM 구조 — ID / class (exact)

- **DOM ID**: `badge-root`, `badge-status`, `badge-refresh`
- **CSS class**:
  - 컨테이너/요소: `badge`, `badge__status`, `badge__refresh`
  - 상태 modifier: `badge--sending`, `badge--delivered`, `badge--failed`

권장 마크업 골격(변경 금지 selector 기준):

```html
<div id="badge-root" class="badge">
  <span id="badge-status" class="badge__status" aria-live="polite">전달 준비됨</span>
  <button id="badge-refresh" class="badge__refresh" type="button" aria-label="전달 상태 새로고침">
    ↻
  </button>
</div>
```

> `idle` 은 modifier class 없이 `badge` 기본 상태로 표현한다.
> `sending / delivered / failed` 상태는 `badge` 요소(`badge-root`)에 각각
> `badge--sending / badge--delivered / badge--failed` 를 부여한다.

### 3.3 상태(States)와 각 상태의 화면 텍스트 (exact)

| 상태 | 적용 modifier class | 화면 텍스트(`badge-status`) | 접근성 이름 |
|---|---|---|---|
| `idle` | (없음) | `전달 준비됨` | `전달 준비됨` |
| `sending` | `badge--sending` | `전달 중…` | `전달 중…` |
| `delivered` | `badge--delivered` | `전달 완료` | `전달 완료` |
| `failed` | `badge--failed` | `전달 실패` | `전달 실패` |

> 상태명은 색상만으로 구분하지 않고 **화면 텍스트와 접근성 이름 모두**에 노출한다.

### 3.4 Design Token / CSS 변수 (exact 값)

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-status-delivered` | `#16a34a` | delivered 상태 색 |
| `--color-status-failed` | `#dc2626` | failed 상태 색 |
| `--color-status-sending` | `#f59e0b` | sending 상태 색 |
| `--space-badge-gap` | `8px` | 배지 아이콘–상태 텍스트 간격 |

> `idle` 은 위 상태 색을 사용하지 않는 중립 표현이며, developer/designer 는 위 4개 변수 값을 재정의하지 않는다.

### 3.5 접근성 (Accessibility)

- `badge-status` 는 `aria-live="polite"` 로 상태 변경을 스크린리더에 알린다.
- `badge-refresh` control 은 명시적 `aria-label`(`전달 상태 새로고침`)을 가진다.
- 키보드 `Tab`/`Enter` 로 `badge-refresh` control 을 조작할 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (Responsive)

- `320px` 이상 viewport 에서 badge content overflow 가 발생하지 않는다.
- 배지 아이콘과 상태 텍스트는 `320px` 폭에서 한 줄로 정렬된다.

---

## 4. Acceptance Criteria (Given/When/Then)

### AC-1 초기 상태(idle)
- **Given** 배지 앱(`apps/delivery-badge/index.html`)이 로드되고
- **When** 아직 어떤 전달도 시작되지 않았을 때
- **Then** `badge-root` 에는 상태 modifier class 가 없고, `badge-status` 텍스트는 `전달 준비됨` 이다.

### AC-2 전달 중(sending)
- **Given** idle 상태에서
- **When** 전달이 시작되면
- **Then** `badge-root` 에 `badge--sending` 이 부여되고 `badge-status` 텍스트는 `전달 중…` 이며,
  `aria-live` 로 변경이 안내된다.

### AC-3 전달 완료(delivered)
- **Given** sending 상태에서
- **When** 전달이 성공하면
- **Then** `badge-root` 에 `badge--delivered` 가 부여되고 `badge-status` 텍스트는 `전달 완료`,
  색은 `--color-status-delivered(#16a34a)` 를 따른다.

### AC-4 전달 실패(failed)
- **Given** sending 상태에서
- **When** 전달이 실패하면
- **Then** `badge-root` 에 `badge--failed` 가 부여되고 `badge-status` 텍스트는 `전달 실패`,
  색은 `--color-status-failed(#dc2626)` 를 따른다.

### AC-5 새로고침 후 초기값 복귀
- **Given** delivered 또는 failed 상태에서
- **When** 사용자가 `badge-refresh` 를 클릭/Enter 로 조작하면
- **Then** 상태와 진행 표시는 초기값(`idle` / `전달 준비됨`)으로 되돌아가고,
  주 실행 control(`badge-refresh`)은 다시 사용할 수 있어야 한다.

> **불변식(초기화·취소·실패 후조건)**: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고
> 주 실행 control 을 다시 사용할 수 있어야 한다.

### AC-6 접근성/반응형
- **Given** 스크린리더/키보드 사용자가
- **When** 상태가 변할 때 / `Tab`+`Enter` 로 새로고침을 조작할 때
- **Then** `aria-live="polite"` 로 상태가 안내되고, `badge-refresh` 는 키보드로 조작 가능하며,
  `320px` 폭에서 아이콘·상태 텍스트가 overflow 없이 한 줄로 정렬된다.

---

## 5. Edge / 실패 케이스

- **연속 새로고침**: `badge-refresh` 연타 시에도 마지막 상태가 idle 로 안정 수렴한다(중복 modifier 미적용).
- **미지정 상태 값 유입**: 4개 상태(`idle/sending/delivered/failed`) 외 값은 idle 로 취급한다.
- **좁은 폭(320px)**: 텍스트 말줄임 없이 한 줄 정렬, overflow 금지.
- **색 인지 불가 사용자**: 색 외 화면 텍스트로 상태 식별 가능해야 한다(색상 단독 구분 금지).

---

## 6. Implementation Notes (역할별 후속 작업)

- **designer (BF-1353)** — `docs/design/delivery-badge-contract.md`, `docs/design/delivery-badge-mockup.html`
  (additive): 위 selector/token/상태 텍스트를 재정의 없이 mockup·contract 문서로 시각화.
- **developer (BF-1354)** — `apps/delivery-badge/index.html`, `apps/delivery-badge/src/badge.js`
  (additive): 위 DOM ID/class 와 CSS 변수로 배지 렌더링·상태 전환·새로고침 초기화 구현.
- **reviewer (BF-1356 흐름)** — selector/token 불변 준수, additive 정책 위반 여부 검토.
- **tester (BF-1357)** — `apps/delivery-badge/tests/**`: 4개 상태 전환·새로고침 초기값 복귀·접근성/반응형 검증.

### Dependencies / Timeline / Risks
- **Dependencies**: 본 planner 문서(plan) 동결 → designer/developer 병렬 착수 → review → test.
- **Timeline(예상)**: design/develop 각 1일, review 0.5일, test 0.5일.
- **Risks & Mitigations**:
  - selector/token 임의 변경 → *Mitigation*: 본 문서를 유일 권위로 고정, reviewer 가 불변 검증.
  - 색상 단독 상태 표현 → *Mitigation*: 화면 텍스트·접근성 이름 필수화(AC-6).

---

## 7. Success Metrics
- 4개 상태 전환이 명세대로 100% 재현(tester 검증).
- 스크린리더에서 상태 변경 안내 성공(수동 검증).
- `320px` 폭 overflow 0건.
