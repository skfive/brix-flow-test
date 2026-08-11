# 단위 변환 계산기 구현 설계 (BF-1951 / plan: BF-1954)

## 0. 개요

- 대상: 서버/네트워크 호출이 없는 **클라이언트 전용 정적 단위 변환 계산기**.
- 카테고리 3종: 길이(length) / 무게(weight) / 온도(temperature).
- 상태는 `idle`, `error` 두 가지만 존재한다 (frozen UI 계약 기준).
- 본 문서는 frozen Execution Blueprint의 `ui-contract@v1` 인터페이스를 그대로 서술하고, 이를 구현하기 위한 계수 테이블·온도 공식·에러 처리 규칙·상태 전이 규칙을 확정한다. 새로운 파일이나 역할을 추가하지 않는다.

## 1. UI 계약 (frozen — 변경/재정의 금지)

### 1.1 파일 및 소유자

| 경로 | 소유 역할 | 상태 |
|---|---|---|
| `docs/design/unit-converter-BF-1951-mockup.html` | designer | blueprint-frozen 계약을 반영해 신규 작성 (additive) |
| `docs/design/unit-converter-BF-1951.md` | designer | blueprint-frozen 계약을 반영해 신규 작성 (additive) |
| `unit-converter.html` | developer | blueprint-frozen 계약을 반영해 갱신 (additive) — §1.6 참고 |

> 파일 소유권과 상태 계약은 frozen blueprint가 유일한 권위이며, 본 문서는 이를 재정의하지 않는다.

### 1.2 DOM ID

`app-root`, `tab-length`, `tab-weight`, `tab-temperature`, `panel-length`, `panel-weight`, `panel-temperature`, `error-message`

### 1.3 CSS 클래스

`tabs`, `tab`, `tab--active`, `panel`, `panel--active`, `unit-row`, `unit-input`, `error-text`

- 각 카테고리 패널(`panel-length`/`panel-weight`/`panel-temperature`)은 해당 카테고리의 단위 개수만큼 `unit-row`를 가지며, 각 row는 라벨과 `unit-input` 입력 필드 1개를 포함한다.
- 한 번에 하나의 탭(`tab--active`)과 그 탭에 대응하는 패널(`panel--active`)만 활성화된다.

### 1.4 상태

- `idle`: 정상 대기/결과 표시 상태.
- `error`: 입력 검증 실패로 전이된 상태 (§4, §5 참고).
- `app-root`에 현재 상태를 나타내는 속성(예: `data-state`)을 두고, 상태명은 화면에 표시되는 텍스트와 접근성 이름으로도 노출한다 (색상만으로 구분 금지 — §1.5).

### 1.5 디자인 토큰 (변경/재정의 금지)

```
--color-bg-light:   #ffffff
--color-bg-dark:    #121212
--color-text-light: #1a1a1a
--color-text-dark:  #f5f5f5
--color-accent:     #2563eb
--color-error:      #dc2626
--space-control-gap: 12px
--radius-control:    8px
```

### 1.6 기존 저장소 상태에 대한 참고 (developer 안내)

저장소 루트에 이미 `unit-converter.html`이 존재하지만, 그 구조(`#unit-converter-app`, 카테고리 `<select>` + `input-unit`/`output-unit` 드롭다운 + `swap-button`, 상태값 `idle`/`result-updated`/`invalid-input`)는 이번 BF-1951 frozen UI 계약과 **일치하지 않는다** (다른 선행 작업의 산출물). developer(BF-1953)는 §1.2~§1.5의 frozen DOM id/클래스/토큰/상태(`idle`/`error`)를 기준으로 파일을 갱신해야 하며, `additive` 정책에 따라 파일 자체는 유지하되 내용을 frozen 계약에 맞게 재작성한다. 본 계획 문서는 이 재작성 필요성을 기록할 뿐, 직접 코드를 수정하지 않는다.

### 1.7 접근성

- 탭 버튼(`tab-length`/`tab-weight`/`tab-temperature`)은 `role="tab"`과 `aria-selected` 속성을 가진다.
- `error-message`는 `role="alert"`로 스크린리더에 즉시 공지된다.
- 모든 `unit-input` 필드는 명시적 `<label>` 또는 `aria-label`을 가진다.
- 모든 상태(`idle`/`error`)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름(예: `aria-live` 영역 텍스트)으로 노출한다.

### 1.8 반응형

- 320px 이상: 가로 스크롤 없이 탭과 단위 입력 필드가 세로로 재배치된다.
- 768px 이상: 카테고리별 단위 입력이 그리드로 배치된다.

## 2. 변환 계수 테이블 (길이/무게 — 기준 단위 경유)

계산식: `기준값 = 입력값 × factor[입력단위]`, `결과값 = 기준값 ÷ factor[출력단위]`.
같은 패널 안의 한 `unit-input`에 값을 입력하면, 그 값을 기준 단위로 환산한 뒤 같은 패널의 나머지 모든 `unit-input`을 즉시 재계산해 채운다.

### 2.1 길이 (기준 단위: m)

| 단위 | factor (m 기준) |
|---|---|
| m (미터) | 1 |
| km (킬로미터) | 1000 |
| cm (센티미터) | 0.01 |
| mm (밀리미터) | 0.001 |
| inch (인치) | 0.0254 |
| feet (피트) | 0.3048 |

### 2.2 무게 (기준 단위: g)

| 단위 | factor (g 기준) |
|---|---|
| g (그램) | 1 |
| kg (킬로그램) | 1000 |
| mg (밀리그램) | 0.001 |
| lb (파운드) | 453.59237 |
| oz (온스) | 28.349523125 |

### 2.3 길이/무게 유효값 규칙

- 음수 입력은 허용하지 않는다 (물리적으로 음의 길이/무게는 존재하지 않음). 음수 입력 시 §4 에러 규칙에 따라 `error` 상태로 전이한다.

## 3. 온도 변환 공식 (C ↔ F ↔ K, 오프셋 포함)

섭씨(C)를 중간 기준으로 변환한다: `celsius = toCelsius(입력값, 입력단위)` → `결과값 = fromCelsius(celsius, 출력단위)`.

```
toCelsius(value, unit):
  C 인 경우: celsius = value
  F 인 경우: celsius = (value - 32) × 5/9
  K 인 경우: celsius = value - 273.15

fromCelsius(celsius, unit):
  C 인 경우: value = celsius
  F 인 경우: value = celsius × 9/5 + 32
  K 인 경우: value = celsius + 273.15
```

절대영도: `-273.15°C` = `0K` = `-459.67°F`.

## 4. 에러 처리 규칙

에러 판정은 값이 변경될 때마다(입력 중 실시간) 수행하며, 아래 두 조건 중 하나라도 해당하면 `error` 상태로 전이한다.

### 4.1 숫자가 아닌 입력

- 입력 문자열이 공백뿐이거나, 비어 있거나, `Number(trim된 문자열)`이 유한수(finite number)가 아니면(`NaN`, `Infinity` 포함) 무효로 판정한다.
- 에러 메시지 예: "숫자를 입력해주세요."

### 4.2 절대영도 미만 (온도 카테고리, K < 0 포함)

- 온도 카테고리에서 입력값을 §3 공식으로 섭씨로 환산한 값이 `-273.15°C`보다 낮으면(부동소수 오차 보정을 위해 `epsilon = 1e-9` 허용) 무효로 판정한다.
- 이 규칙은 입력 단위가 K일 때 값이 0보다 작은 경우를 포함해, F/C 단위로 입력했더라도 환산 결과가 절대영도 미만이면 동일하게 적용한다.
- 에러 메시지 예: "절대영도(-273.15°C) 미만은 입력할 수 없습니다."

### 4.3 길이/무게 음수 입력

- 길이/무게 카테고리에서 입력값이 0보다 작으면 무효로 판정한다 (§2.3).
- 에러 메시지 예: "음수는 입력할 수 없습니다."

## 5. 상태 전이 (idle/error) 및 입력 재활성화 조건

- **idle**: 앱 최초 로드 시, 탭(카테고리) 전환 시, 또는 유효한 입력값에 대한 정상 변환 완료 시 진입한다. `error-message`는 비어 있고, 같은 패널의 모든 `unit-input`에 변환 결과가 채워져 있다.
- **error**: §4의 조건 중 하나라도 성립하면 즉시 진입한다. `error-message`(`role="alert"`)에 해당 사유 문구가 채워지고, 같은 패널의 나머지 `unit-input`은 값을 비운다 (결과가 없음을 명확히 함). 입력을 유발한 `unit-input` 자체는 값을 유지한다(사용자가 무엇을 고쳐야 하는지 알 수 있도록).
- **입력 재활성화 조건**: `error` 상태에서도 모든 `unit-input`은 계속 활성(enabled) 상태를 유지한다 — 별도 비활성화(disable) 처리를 하지 않는다. 사용자가 값을 교정하여 §4의 두 조건을 모두 벗어나면, 상태는 자동으로 `idle`로 복귀하고 같은 패널의 나머지 `unit-input`이 §2/§3 규칙에 따라 즉시 재계산되어 채워진다. `error-message`는 idle 복귀 시 비운다.
- **탭 전환 시**: 카테고리를 변경하면 새 패널로 전환하며 상태는 `idle`로 초기화하고, 모든 `unit-input` 값과 `error-message`를 초기화한다(주 실행 control인 `unit-input`은 곧바로 재사용 가능해야 한다).

## 6. 데이터/인터페이스 참고

- 이 작업은 정적 클라이언트 계산기로 백엔드 API·데이터 모델 변경이 없다. 신규 API 스펙은 정의하지 않는다.
- UI 인터페이스 계약은 §1의 frozen 값을 그대로 따른다 (design 인터페이스, `interfaceKind=design`).

## 7. 비목표 (Non-goals)

- 디자인 시안(목업) 작성은 designer(BF-1952) 담당이며 본 문서는 그 산출물의 내용을 지시하지 않고 frozen 계약만 전달한다.
- `docs/design/unit-converter-BF-1951-mockup.html`, `docs/design/unit-converter-BF-1951.md`, `unit-converter.html`의 실제 작성/수정은 본 packet(plan) 범위가 아니다 (각 파일 소유자 담당).
- frozen 계약에 없는 새로운 DOM id/CSS class/디자인 토큰/상태를 추가하지 않는다.

## 8. Acceptance Criteria 요약 (Given/When/Then)

1. **UI 계약 준수**
   - Given `unit-converter.html`이 로드된 상태
   - When DOM을 검사하면
   - Then §1.2 DOM id, §1.3 CSS class, §1.5 디자인 토큰이 정확히 존재하고 재정의되지 않는다.

2. **길이/무게 변환**
   - Given 길이 또는 무게 패널의 한 `unit-input`에 유효한 숫자를 입력했을 때
   - When 다른 `unit-input`을 확인하면
   - Then §2의 계수 테이블(기준 단위 m/g 경유)로 계산한 값과 일치한다.

3. **온도 변환**
   - Given 온도 패널의 한 `unit-input`(C/F/K)에 유효한 숫자를 입력했을 때
   - When 다른 두 단위를 확인하면
   - Then §3의 공식(오프셋 포함, 섭씨 경유)으로 계산한 값과 일치한다.

4. **비숫자 입력 에러**
   - Given 임의의 `unit-input`에 숫자가 아닌 값(빈 값 포함)을 입력했을 때
   - When 상태를 확인하면
   - Then `error` 상태로 전이하고 `error-message`(`role=alert`)에 안내 문구가 표시되며, 값을 교정하면 §5 규칙대로 `idle`로 복귀한다.

5. **절대영도 미만 에러**
   - Given 온도 패널에서 환산 섭씨 값이 `-273.15°C` 미만(K 입력 시 음수 포함)이 되는 값을 입력했을 때
   - When 상태를 확인하면
   - Then `error` 상태로 전이하고, 값을 교정하면 §5 규칙대로 `idle`로 복귀하며 입력 필드는 항상 재사용 가능하다.
