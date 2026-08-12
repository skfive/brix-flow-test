# 구현 설계 — 색상 대비 검사기 정적 페이지 (BF-1975)

- Jira: BF-1975 (epic) / 본 문서 작성 task: BF-1978
- 작성: 박기획 (planner)
- 상태: frozen blueprint 를 그대로 서술하는 구현 설계 문서. 본 문서는 파일·소유자·상태를 새로 정의하지 않으며, `ui-contract@v1` (sha256:89f06511f1952bab57858775d9331c210afb9dbd87e31dcdd84962bc7b5f2ec5) 을 유일한 권위로 인용한다.

## 1. 목적

WCAG 2.x 색상 대비 검사기 정적 페이지를 구현하기 위해 designer 와 developer 가 병렬로 따를 파일 구조, DOM/상태 계약, 계산 알고리즘, 판정 기준을 확정한다. 본 문서는 frozen blueprint 의 파일 소유권과 후조건을 그대로 설명하며 새 파일이나 역할을 추가하지 않는다.

## 2. 파일 구조 및 소유권 (frozen — 변경 금지)

| 경로 | 소유자 | 설명 |
|---|---|---|
| `contrast-checker/index.html` | developer | 페이지 마크업, DOM 요소, 초기 idle 상태 |
| `contrast-checker/style.css` | developer | design token 정의 및 상태별 스타일 |
| `contrast-checker/contrast.js` | developer | 상대 휘도·대비비 계산, 상태 전이, DOM 갱신 로직 |
| `contrast-checker/tests/contrast.test.js` | developer | 계산 로직 및 판정 기준 단위 테스트 |
| `docs/design/contrast-checker-BF-1975.md` | designer | 화면 설계 문서 (레이아웃, 인터랙션 명세) |
| `docs/design/contrast-checker-BF-1975-mockup.html` | designer | 정적 목업 (본 계약의 DOM/token 을 반영한 프로토타입) |

designer/developer 는 이 표의 소유자 매핑과 파일 목록을 변경하거나 재정의하지 않는다. 두 역할은 `blockedByPacketKeys=[plan]` 로 본 packet(plan) 완료 후 병렬로 착수한다.

## 3. DOM 계약

- 컨테이너 클래스: `contrast-checker`
- 입력 클래스: `contrast-checker__input`
- 결과 카드 클래스: `contrast-checker__result-card`
- 미리보기 클래스: `contrast-checker__preview`
- 에러 클래스: `contrast-checker__error`

| DOM ID | 역할 | 접근성 속성 |
|---|---|---|
| `#contrast-foreground-input` | 전경색 hex 입력 | `aria-label="전경색 (hex)"` |
| `#contrast-background-input` | 배경색 hex 입력 | `aria-label="배경색 (hex)"` |
| `#contrast-ratio-value` | 계산된 대비비 숫자 표시 | — |
| `#contrast-aa-result` | AA(4.5:1) 통과 여부 표시 | 상태명 텍스트 노출 |
| `#contrast-aaa-result` | AAA(7:1) 통과 여부 표시 | 상태명 텍스트 노출 |
| `#contrast-aa-large-result` | 큰 텍스트 AA(3:1) 통과 여부 표시 | 상태명 텍스트 노출 |
| `#contrast-preview` | 전경/배경 색상 실제 적용 미리보기 | — |
| `#contrast-error` | 입력 오류 메시지 | `role="alert"` (즉시 통지) |

## 4. 상태 모델

세 가지 상태만 존재하며, 상태 전이는 두 입력 값의 유효성에 의해 결정된다.

- **idle**: 초기 로드 또는 두 입력 모두 미입력. 결과 카드는 placeholder, `#contrast-error` 는 비어있고 화면에 표시되지 않는다.
- **valid**: 두 입력이 모두 유효한 hex 색상값(`#RGB` 또는 `#RRGGBB`, `#` 생략 허용). 대비비 계산 결과와 AA/AAA/큰 텍스트 AA 판정을 `#contrast-ratio-value`, `#contrast-aa-result`, `#contrast-aaa-result`, `#contrast-aa-large-result`, `#contrast-preview` 에 갱신한다. `#contrast-error` 는 비운다.
- **error**: 하나 이상의 입력이 유효하지 않은 hex 형식. `#contrast-error` 에 오류 메시지를 채우고 `role="alert"` 로 스크린리더에 즉시 통지한다. 이전 valid 결과는 유지하지 않고 결과 영역은 idle 과 동일하게 비운다.

### 후조건 (frozen invariant)

- 두 색상 입력 control 은 error 상태에서도 `disabled` 되지 않으며 키보드로 계속 편집 가능해야 한다.
- 모든 상태는 색상만으로 구분하지 않고, 상태명을 화면 텍스트와 접근성 이름(예: "통과"/"실패"/"미입력")으로 노출해야 한다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시가 idle 로 되돌아가고, 두 입력 control 은 즉시 재사용 가능해야 한다. 별도의 초기화/취소 버튼을 새로 만들지 않고, 입력값을 지우면 idle 로 복귀하는 것으로 이 후조건을 충족한다.

## 5. 계산 로직 — 상대 휘도 및 대비비 (WCAG 2.x)

`contrast-checker/contrast.js` 는 아래 알고리즘을 그대로 구현한다.

### 5.1 sRGB 채널 선형화

각 채널값 `C` (0~255)에 대해 `Cs = C / 255` 를 구한 뒤:

```
Clin = Cs <= 0.03928 ? Cs / 12.92 : ((Cs + 0.055) / 1.055) ^ 2.4
```

### 5.2 상대 휘도 (Relative Luminance)

```
L = 0.2126 * Rlin + 0.7152 * Glin + 0.0722 * Blin
```

### 5.3 대비비 (Contrast Ratio)

두 색상의 상대 휘도 `L1`(밝은 쪽), `L2`(어두운 쪽) 에 대해:

```
ratio = (L1 + 0.05) / (L2 + 0.05)   // L1 >= L2 가 되도록 두 값을 정렬
```

결과값은 1:1 ~ 21:1 범위이며, `#contrast-ratio-value` 에는 소수점 2자리로 반올림해 표시한다(예: `4.53:1`).

## 6. 판정 기준

| 검사 항목 | 임계값 | 대상 DOM |
|---|---|---|
| AA (일반 텍스트) | `ratio >= 4.5` | `#contrast-aa-result` |
| AAA (일반 텍스트) | `ratio >= 7` | `#contrast-aaa-result` |
| AA 큰 텍스트 | `ratio >= 3` | `#contrast-aa-large-result` |

각 결과는 통과/실패 텍스트와 함께 접근성 이름으로도 동일하게 노출한다.

## 7. Design Token (frozen — 변경 금지)

```
--color-text-primary: #1f2933;
--color-bg-page: #ffffff;
--color-border-input: #cbd5e1;
--color-error: #b91c1c;
--color-pass: #15803d;
--space-section-gap: 16px;
--font-family-base: system-ui, -apple-system, "Segoe UI", sans-serif;
```

## 8. 접근성 계약

- `#contrast-foreground-input` → `aria-label="전경색 (hex)"`
- `#contrast-background-input` → `aria-label="배경색 (hex)"`
- `#contrast-error` → `role="alert"` (스크린리더 즉시 통지)
- 두 색상 입력 control 은 error 상태에서도 disabled 되지 않고 키보드로 계속 편집 가능
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출

## 9. 반응형 계약

320px 이상 뷰포트에서 두 입력과 결과 카드가 가로 스크롤 없이 세로로 쌓인다(단일 컬럼 레이아웃).

## 10. 테스트 계약

`contrast-checker/tests/contrast.test.js` (developer 소유) 는 최소 다음을 검증한다:
- 상대 휘도 계산 함수의 알려진 색상값(예: `#FFFFFF`→1.0, `#000000`→0.0) 검증
- 대비비 계산 함수의 알려진 쌍(예: 검정/흰색 → 21:1) 검증
- AA(4.5:1) / AAA(7:1) / 큰 텍스트 AA(3:1) 판정 경계값(threshold 정확히 일치하는 경우 포함) 검증
- 유효하지 않은 hex 입력에 대한 error 상태 판정 로직 검증

## 11. designer / developer 실행 지침

- designer 는 `docs/design/contrast-checker-BF-1975.md` 와 `docs/design/contrast-checker-BF-1975-mockup.html` 을 본 문서 2~9절의 DOM ID/class/token/상태/접근성/반응형 계약과 정확히 일치시켜 작성한다.
- developer 는 `contrast-checker/index.html`, `contrast-checker/style.css`, `contrast-checker/contrast.js`, `contrast-checker/tests/contrast.test.js` 를 본 문서 2~10절과 정확히 일치시켜 구현한다.
- 두 역할 모두 selector(DOM ID/class)와 token 값을 변경·재정의하지 않는다. 변경이 필요하다고 판단되면 코드로 직접 반영하지 말고 PR 설명/Jira 코멘트로 planner 에게 재검토를 요청한다.
