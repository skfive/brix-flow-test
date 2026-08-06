# 팔레트 페이지 구현 설계 (BF-1819)

> 작성: planner (박기획) · Task BF-1822
> 본 문서는 **frozen blueprint**(`ui-contract@v1`, `planning-contract@v1`)를 실행 가능한 형태로 렌더링한 것입니다.
> 이 문서는 blueprint를 재정의하지 않으며, 파일·소유자·상태 계약의 유일한 권위는 frozen blueprint입니다.
> designer/developer는 아래 selector·token·상태 계약을 **변경하거나 재정의하지 않고** 그대로 구현합니다.

---

## 1. 목표 (Objective)

브랜드 색상 4종을 카드 그리드로 제시하고, 각 색상의 hex 값을 클립보드로 복사할 수 있는 정적(vanilla-static) 팔레트 페이지를 구현한다.
복사 성공/실패 상태를 접근성 있게 안내하며, 320px 이상 화면에서 overflow 없이 반응형으로 재배치된다.

- observed stack: `vanilla-static` (npm, ESM, serve_root=`.`, root-relative-static route)
- 신규 파일이나 역할을 추가하지 않는다 (producer policy: render-only).

---

## 2. 파일·소유권 계약 (Frozen)

| 파일 | 소유자 | 정책 | 설명 |
| --- | --- | --- | --- |
| `docs/design/palette-BF-1819.md` | designer | additive | 시각 명세 / mockup |
| `iteration-check2/palette.html` | developer | additive | 페이지 마크업 |
| `iteration-check2/palette.js` | developer | additive | 복사 상호작용 로직 (ESM) |
| `iteration-check2/palette.test.js` | developer | additive | 단위 테스트 |

- 각 파일은 **additive** 정책이다: 신규 생성만 하며 기존 파일 구조를 재정의하지 않는다.
- 위 4개 파일 외 새 파일을 만들지 않는다.
- 소유권은 frozen blueprint가 유일 권위이며 본 문서가 재할당하지 않는다.

---

## 3. 고정 UI 계약 (Frozen UI Contract)

### 3.1 DOM ID (exact)

| ID | 역할 |
| --- | --- |
| `palette-root` | 페이지 루트 컨테이너 |
| `palette-grid` | 색상 카드 그리드 컨테이너 |
| `palette-status` | 복사 피드백 라이브 영역 (`aria-live=polite`) |

### 3.2 CSS class (exact)

| class | 역할 |
| --- | --- |
| `palette` | 루트 블록 |
| `palette__card` | 개별 색상 카드 |
| `palette__swatch` | 색상 견본(스와치) |
| `palette__value` | hex 값 텍스트 |
| `palette__copy` | 복사 실행 control (button) |

### 3.3 상태 (States, exact)

| 상태 | 화면 텍스트(예) | 접근성 이름 노출 | 진입 조건 |
| --- | --- | --- | --- |
| `idle` | "복사" | 상태명을 aria로 노출 | 초기 상태 / 복사 후 초기화 / 취소·실패 복구 후 |
| `copied` | "복사됨" | `#palette-status`에 상태명 텍스트 | 클립보드 복사 성공 |
| `error` | "복사 실패" | `#palette-status`에 상태명 텍스트 | 클립보드 복사 실패 |

- 모든 상태는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 `idle` 초기값으로 되돌리고, 주 실행 control(`.palette__copy`)을 다시 사용할 수 있어야 한다.

### 3.4 Design token (exact 값)

CSS 변수는 아래 exact 값으로 고정한다.

```css
:root {
  --brand-primary: #2563eb;
  --brand-secondary: #7c3aed;
  --brand-accent: #f59e0b;
  --brand-neutral: #111827;
  --palette-card-gap: 16px;
}
```

- 카드 그리드 간격은 `--palette-card-gap` (16px)를 사용한다.

### 3.5 브랜드 색상 4종 (exact hex + 색상 이름 텍스트, Frozen)

카드는 아래 4개 색상을 이 순서로 정확히 렌더링한다. `hex 값`과 `색상 이름 텍스트`는 고정이다.

| 순서 | 색상 이름 텍스트 | hex 값 | 대응 token |
| --- | --- | --- | --- |
| 1 | Primary | `#2563EB` | `--brand-primary` |
| 2 | Secondary | `#7C3AED` | `--brand-secondary` |
| 3 | Accent | `#F59E0B` | `--brand-accent` |
| 4 | Neutral | `#111827` | `--brand-neutral` |

- `.palette__swatch` 배경은 각 색상의 token을 사용한다.
- `.palette__value`에 표시·복사되는 값은 위 hex 문자열(`#2563EB` 등, 대문자 6자리)이다.
- `.palette__card` 안에는 색상 이름 텍스트가 항상 시각적으로 노출된다 (스와치 색상에만 의존하지 않음).

---

## 4. 접근성 계약 (Accessibility, Frozen)

1. 각 복사 control(`.palette__copy`)은 **색상 이름을 포함한 명시적 `aria-label`** 을 가진다.
   - 예: `aria-label="Primary #2563EB 복사"`.
2. 복사 피드백은 `aria-live="polite"` 영역인 `#palette-status`로 안내된다.
3. 각 카드(`.palette__card`)와 복사 control(`.palette__copy`)은 **키보드 포커스가 가능**하다.
   - `.palette__copy`는 `<button>`으로 구현하여 기본 포커스·엔터/스페이스 활성화를 보장한다.
4. 모든 상태(idle/copied/error)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

---

## 5. 반응형 계약 (Responsive, Frozen)

- 320px 이상 화면에서 카드 그리드가 **content overflow 없이 1~4열**로 재배치된다.
- CSS Grid `repeat(auto-fit, minmax(...))` 또는 동등 기법으로, 좁은 뷰포트(≈320px)에서 1열, 넓은 뷰포트에서 최대 4열까지 배치한다.
- 열 간격은 `--palette-card-gap`(16px)을 사용한다.

---

## 6. 사용자 시나리오 (User Scenario)

- **Actor**: 브랜드 색상을 코드/디자인에 재사용하려는 사용자.
1. 사용자가 팔레트 페이지에 진입한다.
2. Primary/Secondary/Accent/Neutral 4개 색상 카드가 스와치·이름·hex 값과 함께 표시된다.
3. 원하는 색상 카드의 "복사" 버튼을 클릭(또는 키보드 활성화)한다.
4. hex 값이 클립보드에 복사되고, `#palette-status`가 "복사됨"으로 안내한다.
5. 잠시 후 버튼 상태는 `idle`로 되돌아가 다시 복사할 수 있다.

---

## 7. 수용 기준 (Acceptance Criteria, Given/When/Then)

### AC-1 · 팔레트 렌더링
- **Given** 사용자가 팔레트 페이지(`iteration-check2/palette.html`)를 연다
- **When** 페이지가 로드되면
- **Then** `#palette-root` 안 `#palette-grid`에 4개 `.palette__card`가 순서(Primary→Secondary→Accent→Neutral)대로 렌더링되고, 각 카드는 `.palette__swatch`(해당 token 배경), 색상 이름 텍스트, `.palette__value`(대응 hex 대문자), `.palette__copy` 버튼을 포함한다.

### AC-2 · 복사 성공 (copied)
- **Given** 팔레트가 렌더링된 상태
- **When** 사용자가 특정 카드의 `.palette__copy`를 활성화하고 클립보드 쓰기가 성공하면
- **Then** 해당 hex 값이 클립보드에 기록되고, 상태가 `copied`로 전환되며, `#palette-status`(`aria-live=polite`)에 상태명("복사됨")이 텍스트로 노출된다.

### AC-3 · 상태 초기화 (idle 복구)
- **Given** 어떤 카드가 `copied` 상태
- **When** 초기화 시점(타임아웃/후속 상호작용)이 지나면
- **Then** 상태와 진행 표시가 `idle` 초기값으로 되돌아가고, `.palette__copy`가 다시 사용 가능해진다.

### AC-4 · 복사 실패 (error)
- **Given** 클립보드 API가 없거나 쓰기가 거부되는 환경
- **When** 사용자가 `.palette__copy`를 활성화하면
- **Then** 상태가 `error`로 전환되고 `#palette-status`에 상태명("복사 실패")이 텍스트로 노출되며, 이후 `idle`로 복구되어 재시도가 가능하다.

### AC-5 · 접근성
- **Given** 팔레트가 렌더링된 상태
- **When** 보조기술/키보드로 탐색하면
- **Then** 각 `.palette__copy`는 색상 이름을 포함한 `aria-label`을 가지고, 카드와 복사 control이 키보드 포커스 가능하며, 상태는 색상만이 아닌 텍스트로 구분된다.

### AC-6 · 반응형
- **Given** 320px 이상 임의 뷰포트
- **When** 뷰포트 폭이 변하면
- **Then** 카드 그리드가 content overflow 없이 1~4열로 재배치된다.

---

## 8. 데이터 모델 (Palette Item)

API·서버 상태는 없다 (vanilla-static). 페이지 내 정적 색상 데이터만 정의한다.

`PaletteItem`:
| 필드 | 타입 | 값/제약 |
| --- | --- | --- |
| `name` | string | 색상 이름 텍스트 (Primary / Secondary / Accent / Neutral) |
| `hex` | string | 대문자 6자리 hex (`#2563EB` / `#7C3AED` / `#F59E0B` / `#111827`) |
| `token` | string | 대응 CSS 변수명 (`--brand-primary` 등) |

- 4개 항목은 §3.5 표의 순서·값으로 고정된다.

---

## 9. Edge case · 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E1 | `navigator.clipboard` 미지원 / `writeText` reject | `error` 상태 노출 후 `idle` 복구, 재시도 가능 (AC-4) |
| E2 | 비보안 컨텍스트(HTTP)에서 clipboard 접근 거부 | E1과 동일하게 `error`→`idle` 처리 |
| E3 | 연속 클릭(빠른 재복사) | 이전 상태 표시를 초기화 후 최신 복사 결과만 반영 |
| E4 | 320px 미만은 계약 범위 밖 | 320px 이상만 overflow-free 보장 (하한 미만은 요구하지 않음) |
| E5 | 색상 대비 인지 불가 사용자 | 상태·값이 텍스트로 노출되어 색상 의존 없이 구분 가능 (AC-5) |

---

## 10. 검증 (Test scope: focused)

- developer는 `iteration-check2/palette.test.js`에 focused 단위 테스트를 작성한다.
- 검증 포인트: 4개 카드 렌더링/순서·hex 값, 복사 성공 시 clipboard 호출과 `copied` 상태, 실패 시 `error`→`idle` 복구, `aria-label`에 색상 이름 포함, `#palette-status`의 상태 텍스트.
- 명령: `npm test` (표시용). focused scope — 신규/수정 테스트와 owned 경로 관련 테스트만 실행.

---

## 11. Handoff

- **designer (BF-1820)**: `docs/design/palette-BF-1819.md`에 위 계약을 시각 명세/mockup으로 구체화한다. selector·token·상태·hex·이름은 §3 값을 그대로 사용한다.
- **developer (BF-1821)**: `iteration-check2/palette.html|js|test.js`를 구현한다. DOM ID/class, token, 상태, hex, 접근성, 반응형 계약을 §3~§7 그대로 만족시킨다.
- selector·token은 변경·재정의하지 않는다 (frozen invariant).
