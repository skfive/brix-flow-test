# BF-1939 비밀번호 강도 판정기 — 구현 설계 (BF-1942)

> 본 문서는 BF-1939 Epic 산하 designer(BF-1940)·developer(BF-1941) 가 그대로 따를 실행 설계입니다.
> 아래 UI 계약(파일·DOM/class·상태·token·접근성·반응형)은 frozen blueprint 값을 그대로 옮긴 것이며,
> 본 문서는 새로운 파일이나 새로운 역할을 추가하지 않습니다.

## 1. 판정 기준 (강도 계산 로직)

### 1.1 판정 항목 (4개, 각 항목은 boolean 충족 여부)

| 항목 | 조건 |
|---|---|
| 길이 | 비밀번호 길이가 8자 이상이다 (`length >= 8`) |
| 대문자 포함 | `A-Z` 범위의 문자를 1개 이상 포함한다 |
| 숫자 포함 | `0-9` 범위의 문자를 1개 이상 포함한다 |
| 특수문자 포함 | 영숫자·공백이 아닌 문자(예: `!@#$%^&*()_+-=[]{}` 등)를 1개 이상 포함한다 |

- 4개 항목은 서로 독립적으로 판정하며, 하나의 입력 변경마다 4개 항목 전부를 재평가한다.
- 판정은 클라이언트 사이드에서 입력 이벤트(`input`)마다 즉시 재계산한다.

### 1.2 강도 등급 임계값 (충족 항목 개수 기반 3단계)

| 충족 개수 | 등급 | 상태명(state) |
|---|---|---|
| 0 ~ 1개 | 약함 | `weak` |
| 2 ~ 3개 | 보통 | `medium` |
| 4개 | 강함 | `strong` |

- 입력값이 빈 문자열(`""`)인 경우는 위 3단계와 별개로 `empty` 상태로 취급하며, 판정 항목 계산을 수행하지 않는다(모두 미충족으로 표시하지 않고 초기 상태로 표시).
- 등급 판정은 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(accessible name)으로 항상 함께 노출한다(1:1 색맹 접근성 요구사항).

## 2. 상태 모델

상태는 `empty | weak | medium | strong` 4가지이며, 전이는 아래와 같다.

```
[empty] --(입력 시작)--> [weak|medium|strong] (충족 개수에 따라 즉시 분기)
[weak|medium|strong] --(입력 변경)--> [weak|medium|strong|empty] (재계산 결과에 따라 재분기)
[weak|medium|strong] --(입력 전체 삭제/취소/실패)--> [empty] (초기값 복귀)
```

- 초기화·취소·실패 이후에는 상태와 진행 표시(체크리스트, 강도 미터)가 반드시 초기값(`empty`, 체크리스트 전항목 미충족)으로 되돌아가야 하며, `pw-input`/`pw-toggle` 등 주 실행 control은 다시 사용할 수 있는 상태여야 한다.
- `pw-toggle`(비밀번호 표시/숨김)은 강도 상태와 독립적인 별도 토글이며, 강도 상태 전이에 영향을 주지 않는다.

## 3. UI 계약 (exact — frozen blueprint 그대로)

### 3.1 파일 및 소유자

| 파일 | 소유자 | 정책 |
|---|---|---|
| `docs/design/BF-1939-password-strength.md` | designer (BF-1940) | additive (재정의 금지) |
| `password-strength.html` | developer (BF-1941) | additive (재정의 금지) |

- 파일 소유권과 상태 계약은 본 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.

### 3.2 DOM ID

`password-strength-root`, `pw-input`, `pw-toggle`, `pw-strength-label`, `pw-strength-meter`,
`pw-check-length`, `pw-check-uppercase`, `pw-check-number`, `pw-check-special`

### 3.3 CSS class

`password-strength`, `password-strength__input`, `password-strength__toggle`, `password-strength__meter`,
`strength-weak`, `strength-medium`, `strength-strong`,
`password-strength__checklist`, `checklist-item`, `checklist-item--met`

### 3.4 상태(state)

`empty`, `weak`, `medium`, `strong` — §2 상태 모델을 따른다.

### 3.5 색상 token

| token | 값 |
|---|---|
| `--color-strength-weak` | `#dc2626` |
| `--color-strength-medium` | `#f59e0b` |
| `--color-strength-strong` | `#16a34a` |
| `--space-control-gap` | `12px` |

### 3.6 접근성

- `pw-toggle` 버튼은 클릭(토글)할 때마다 `aria-pressed` 상태와 `aria-label`(`'비밀번호 표시'` / `'비밀번호 숨기기'`)을 갱신한다.
- `pw-strength-label` 영역은 `aria-live="polite"`로 지정하여, 강도 텍스트가 실시간으로 바뀔 때 스크린리더에 알린다.
- 모든 상태(`empty|weak|medium|strong`)는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름으로 함께 노출한다.

### 3.7 반응형

- 320px 이상 뷰포트에서 입력창(`pw-input`)과 체크리스트(`password-strength__checklist`)가 줄바꿈되어도 가로 overflow 없이 표시되어야 한다.

### 3.8 산출물 경로

- `docs/design/BF-1939-password-strength.md` (designer, UI 명세)
- `password-strength.html` (developer, 구현)

## 4. 완료 기준 (Definition of Done)

- [ ] §1의 4개 판정 항목과 §1.2 임계값(0-1=약함, 2-3=보통, 4=강함)이 정확히 구현된다.
- [ ] §3의 DOM ID/class/상태/색상 token/접근성/반응형이 정확히 일치한다(추가·변경·재정의 금지).
- [ ] **기존 파일은 일절 수정하지 않는다.** `docs/design/BF-1939-password-strength.md`, `password-strength.html`은 신규 additive 산출물이다.
- [ ] **CDN, 외부 라이브러리(프레임워크·아이콘·폰트 CDN 등)를 사용하지 않는다.** 순수 HTML/CSS/vanilla JS로만 구현한다.
- [ ] `password-strength.html`은 **200줄 이하**로 작성한다.
- [ ] 초기화·취소·실패 이후 상태·진행 표시가 초기값으로 복귀하고 `pw-input`/`pw-toggle`을 다시 사용할 수 있다(§2).
- [ ] 본 계약에 명시된 파일·소유자·상태 외의 새 파일이나 새 역할을 추가하지 않는다.

## 5. Edge case / 실패 케이스

| 케이스 | 기대 동작 |
|---|---|
| 입력값이 빈 문자열 | 상태 `empty`, 체크리스트 전항목 미충족 표시, 강도 라벨은 초기 안내 텍스트 |
| 공백 문자만 입력 | 길이 조건은 문자 수 기준으로 판정(트리밍하지 않음), 나머지 항목 판정은 정상 수행 |
| 한글 등 비-ASCII 문자 포함 | 대문자/숫자/특수문자 판정은 ASCII 규칙(A-Z, 0-9, 특수문자 집합) 기준으로만 판정하며 한글 자체는 대문자/숫자/특수문자 어느 항목도 충족시키지 않음 |
| 붙여넣기(paste)로 입력 | `input` 이벤트로 처리되어 타이핑과 동일하게 즉시 재계산 |
| 전체 삭제 후 재입력 | `empty` → 재판정 흐름으로 정상 복귀, control 재사용 가능 |
| `pw-toggle` 연속 클릭 | 매 클릭마다 `aria-pressed`/`aria-label`이 토글되며 강도 상태에는 영향 없음 |
| 4항목 모두 충족했다가 일부 삭제 | 재계산된 충족 개수에 따라 즉시 등급 하향(`strong→medium` 등) |
