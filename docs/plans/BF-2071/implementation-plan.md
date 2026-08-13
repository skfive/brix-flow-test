# BF-2071 컬러 팔레트 생성기 — 구현 설계

- Jira: BF-2071 (구현 Epic 하위) / 본 문서는 BF-2074(planner) 산출물
- 관련 task: BF-2072(designer), BF-2073(developer)
- 작성자: 박기획 (planner)
- 상태: active

## 1. 개요

사용자가 HEX 색상 코드 1개를 입력하면, 회전(rotateHue) 규칙에 따라 5개의 파생 색상(스와치)을 계산해 화면에 표시하는 정적(vanilla JS) 웹 도구다. 각 스와치는 HEX 값, WCAG 대비 기준 권장 텍스트 색상, HEX 복사 버튼을 제공한다.

본 문서는 designer(BF-2072)·developer(BF-2073)가 그대로 따르는 실행 설계이며, 아래 UI 계약(2절 이후 표기된 DOM/토큰/접근성/반응형)은 frozen이므로 변경·재정의하지 않는다.

## 2. 색 변환 규칙 (Color Conversion Rules)

세 개의 순수 함수로 구성한다. 모두 부작용 없이 입력값으로부터 결정적 결과를 반환해야 한다.

### 2.1 `hexToRgb(hex: string): { r: number, g: number, b: number }`

- `#` 접두사 유무 모두 허용.
- 3자리 축약형(`#f00`)은 각 자리를 두 번 반복해 6자리로 확장 후 변환한다 (`f`→`ff`).
- 6자리 HEX를 2자리씩 잘라 16진수 → 10진수(0~255) 변환한다.
- 유효하지 않은 입력(길이가 3/6이 아니거나 16진수가 아닌 문자 포함)은 에러로 처리한다 (3.2절 참고).

### 2.2 `rotateHue(hex: string, degrees: number): string`

1. `hexToRgb`로 RGB를 얻는다.
2. RGB → HSL 변환 (표준 공식, `max`/`min` 채널 기반).
3. `h = (h + degrees) % 360`, 음수면 `+360`으로 보정해 `[0, 360)` 범위를 유지한다.
4. `s`, `l`은 원본 값을 유지한 채 HSL → RGB → HEX(대문자, `#RRGGBB`)로 되돌린다.

의미: **`degrees = 180`은 보색(complementary)**, **`degrees = ±30`은 유사색(analogous)**이다.

### 2.3 `contrastRatio(hex1: string, hex2: string): number`

WCAG 2.x 상대 명도 공식을 그대로 사용한다.

1. 각 채널 `c ∈ {r,g,b}/255`에 대해 선형화:
   `c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055) ** 2.4`
2. 상대 명도 `L = 0.2126*R + 0.7152*G + 0.0722*B`
3. 대비비 `ratio = (Lmax + 0.05) / (Lmin + 0.05)` (`Lmax`는 두 색 중 밝은 쪽)

### 2.4 팔레트 생성 규칙 (5 스와치, planner 결정 — frozen)

입력 HEX 1개로부터 아래 5개 회전각을 좌→우(≥768px 기준 5열) 순서로 적용해 스와치를 생성한다. 이 각도 집합과 순서는 AC의 일부이며 designer/developer는 임의로 변경하지 않는다.

| 순서 | 라벨 | rotateHue 각도 |
|---|---|---|
| 1 | 기준색 | 0° |
| 2 | 유사색(−30°) | −30° |
| 3 | 유사색(+30°) | +30° |
| 4 | 보색 | 180° |
| 5 | 보색의 유사색 | 150° |

각 스와치의 권장 텍스트 색상(`swatch__contrast-label`)은 `contrastRatio(스와치, #FFFFFF)`와 `contrastRatio(스와치, #000000)`를 비교해 더 높은 쪽을 채택한다(동률이면 흰색 우선).

### 2.5 결정적 테스트 케이스 (최소 8개 — 실제 11개 명세)

developer(BF-2073)는 `palette/palette.test.js`에 아래 케이스를 그대로 포함한다. 값은 표준 HSL 변환·WCAG 공식으로 직접 계산해 검증했다.

| # | 함수 | 입력 | 기대 결과 |
|---|---|---|---|
| 1 | `hexToRgb` | `'#FFFFFF'` | `{ r:255, g:255, b:255 }` |
| 2 | `hexToRgb` | `'#000000'` | `{ r:0, g:0, b:0 }` |
| 3 | `hexToRgb` | `'#2563EB'` | `{ r:37, g:99, b:235 }` |
| 4 | `hexToRgb` | `'#f00'` (3자리 축약) | `{ r:255, g:0, b:0 }` |
| 5 | `rotateHue` | `('#FF0000', 180)` | `'#00FFFF'` (보색) |
| 6 | `rotateHue` | `('#FF0000', 30)` | `'#FF8000'` (유사색 +30°) |
| 7 | `rotateHue` | `('#FF0000', -30)` | `'#FF0080'` (유사색 −30°) |
| 8 | `rotateHue` | `('#2563EB', 180)` | `'#EBAD25'` (±1 RGB 단위 반올림 오차 허용) |
| 9 | `contrastRatio` | `('#FFFFFF', '#000000')` | `21` (최대 대비) |
| 10 | `contrastRatio` | `('#000000', '#000000')` | `1` (최소 대비) |
| 11 | `contrastRatio` | `('#2563EB', '#FFFFFF')` | `≈5.17` (허용 오차 ±0.01) → 흰 텍스트 권장 (4.06보다 큼) |

케이스 11의 `('#2563EB', '#000000')` 값(`≈4.06`)과 비교해 흰색이 권장됨을 `swatch__contrast-label` 로직 테스트에도 함께 사용한다.

## 3. Acceptance Criteria (Given/When/Then)

### AC-1 팔레트 생성 (정상)
- Given `palette-app`이 `idle` 상태이고 `hex-input`이 비어 있다
- When 사용자가 유효한 HEX(`#2563EB` 등)를 입력하고 `generate-btn`을 클릭(또는 Enter)한다
- Then 상태가 `generating`을 거쳐 `success`로 전환되고, `swatch-list`에 2.4절 규칙대로 5개 스와치가 렌더링되며 각 스와치는 `swatch__hex`, `swatch__contrast-label`, `swatch__copy-btn`을 갖는다

### AC-2 유효하지 않은 입력
- Given `hex-input`에 유효하지 않은 값(길이 오류, 비16진수 문자, 빈 문자열 등)이 있다
- When 사용자가 `generate-btn`을 클릭한다
- Then 상태가 `error`로 전환되고 `status-message`(role="status")에 에러 문구가 노출되며, 기존 `swatch-list`는 보존된다. `generate-btn`은 즉시 재사용 가능하다

### AC-3 HEX ↔ 컬러피커 동기화
- Given `hex-input`과 `color-picker`가 같은 색을 반영하고 있다
- When 둘 중 하나의 값이 바뀐다
- Then 다른 하나도 동일한 색으로 갱신된다

### AC-4 HEX 복사
- Given `success` 상태로 스와치가 렌더링돼 있다
- When 사용자가 특정 스와치의 `swatch__copy-btn`을 클릭(또는 포커스 후 Enter/Space)한다
- Then 해당 스와치의 HEX 값이 클립보드에 복사되고 `swatch__copy-feedback`에 복사 완료 텍스트가 일시적으로 노출된다(`copied` 상태는 해당 스와치 단위이며 전체 앱 상태를 바꾸지 않는다)

### AC-5 초기화
- Given 임의의 상태(`success`/`error`)이다
- When 사용자가 `reset-btn`을 클릭한다
- Then `hex-input`, `color-picker`, `swatch-list`, `status-message`가 모두 초기값으로 복귀하고 상태는 `idle`이 되며 `generate-btn`/`hex-input`은 즉시 재사용 가능하다

### AC-6 반응형
- Given 뷰포트 너비가 320px 이상이다
- When 너비가 320px~767px 범위이다
- Then `swatch-list`는 세로 스택으로 표시되고 어떤 콘텐츠도 overflow되지 않는다
- When 너비가 768px 이상이다
- Then `swatch-list`는 가로 5열 그리드로 표시된다

### AC-7 접근성
- Given 스크린리더 또는 키보드만 사용하는 사용자다
- When `palette-app`을 순회한다
- Then `hex-input`은 `aria-label='HEX 색상 코드 입력'`, `generate-btn`은 `aria-label='팔레트 생성'`(Enter로 활성화), 각 `swatch__copy-btn`은 `aria-label='HEX {value} 복사'`(Enter/Space로 트리거)를 가지며, 모든 상태 전환은 색상뿐 아니라 텍스트로도 인지 가능하다

## 4. UI 계약 (Frozen — designer/developer는 변경·재정의 금지)

### 4.1 산출물 파일 및 소유자

| 파일 | 소유자 | 정책 |
|---|---|---|
| `docs/design/mockup-palette-BF-2071.html` | designer (BF-2072) | additive |
| `docs/design/palette-BF-2071.md` | designer (BF-2072) | additive |
| `palette/index.html` | developer (BF-2073) | additive |
| `palette/palette.js` | developer (BF-2073) | additive |
| `palette/palette.test.js` | developer (BF-2073) | additive |
| `palette/style.css` | developer (BF-2073) | additive |
| `docs/plans/BF-2071/implementation-plan.md` | planner (본 문서, BF-2074) | additive |

### 4.2 DOM ID

`palette-app`, `hex-input`, `color-picker`, `generate-btn`, `reset-btn`, `swatch-list`, `status-message`

### 4.3 CSS class

`swatch`, `swatch__copy-btn`, `swatch__hex`, `swatch__contrast-label`, `swatch__copy-feedback`

### 4.4 상태 (States)

`idle` → (`generate-btn` 클릭/Enter) → `generating` → `success` | `error`
`error`에서도 `generate-btn` 재사용 가능(원 상태 보존).
`copied`는 스와치 단위 일시 상태(전체 앱 상태 전이 아님).
`reset-btn`은 모든 상태에서 `idle`로 복귀시킨다.

### 4.5 디자인 토큰 / CSS 변수

```
--color-accent: #2563eb
--color-error: #dc2626
--color-success: #16a34a
--color-swatch-border: #e2e8f0
--space-swatch-gap: 12px
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### 4.6 접근성

- `hex-input`: `aria-label='HEX 색상 코드 입력'`
- `generate-btn`: `aria-label='팔레트 생성'`, Enter로 활성화
- 각 `swatch__copy-btn`: `aria-label='HEX {value} 복사'`, Enter/Space로 복사 트리거
- `swatch__contrast-label`: 스와치별 권장 텍스트 색상(흰색/검정)을 텍스트로 노출
- `status-message`: `role='status'`로 에러/성공 메시지를 스크린리더에 전달
- 모든 상태는 색상만이 아니라 상태명을 화면 텍스트/접근성 이름으로도 노출

### 4.7 반응형

- 320px 이상에서 content overflow 없음
- `swatch-list`: 320px~767px 세로 스택 / 768px 이상 가로 5열

### 4.8 후조건 (Postconditions)

- 초기화·취소(에러)·실패 뒤에는 상태와 진행 표시(`generating` 등)가 초기값으로 되돌아가고, `hex-input`/`generate-btn` 등 주 실행 control이 다시 사용 가능해야 한다
- designer/developer는 위 selector(DOM id/class)와 토큰을 변경하거나 재정의하지 않는다
- 각 산출물 파일의 정책은 `additive`이며, 파일 소유권·상태 계약은 본 frozen blueprint가 유일한 권위다

## 5. Edge Case / 실패 케이스

- 빈 문자열, 3/6자리가 아닌 길이, 16진수가 아닌 문자 포함 → `error` 상태, "유효한 HEX 색상 코드를 입력해주세요" 류 메시지
- `#` 없이 6자리만 입력된 경우 → 정상 입력으로 허용 (2.1절)
- 대소문자 혼용 HEX(`#2563eb`) → 정상 처리, 표시는 대문자로 정규화
- 클립보드 API(`navigator.clipboard`) 미지원 브라우저 → 복사 실패 시 `swatch__copy-feedback`에 실패를 알리되 전체 앱 상태는 `success`를 유지한다(치명적 오류로 취급하지 않음)
- 동일 입력으로 연속 `generate-btn` 클릭 → 이전 팔레트를 새 결과로 교체(누적하지 않음)

## 6. 비목표 (Non-goals)

- 팔레트 저장/히스토리, 다중 색상 입력, 색맹 시뮬레이션 등은 본 스코프 밖이다 (frozen 파일 목록 외 신규 파일·역할을 추가하지 않는다)
