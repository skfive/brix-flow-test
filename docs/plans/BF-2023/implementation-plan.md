# BF-2023 색상 팔레트 생성기 — 구현 설계

## 1. 개요

기준 hex 색상 하나를 입력받아 보색·유사색·명도 변형으로 구성된 5색 팔레트를 생성하고,
각 색상을 클릭해 hex 코드를 복사할 수 있는 정적 페이지 기능이다.
본 문서는 designer/developer가 병렬로 작업할 수 있도록 UI 계약과 색 변환 규칙을 동결한다.

## 2. 산출물 (frozen blueprint 그대로)

| 경로 | 소유자 | 상태 |
|---|---|---|
| `docs/design/BF-2023-palette-mockup.html` | designer | additive |
| `docs/design/BF-2023-palette.md` | designer | additive |
| `palette/index.html` | developer | replace |
| `palette/style.css` | developer | replace |
| `palette/palette.js` | developer | replace |
| `palette/palette.test.js` | developer | replace |

이 문서는 위 파일 목록 · 소유자 · 상태를 재정의하지 않으며, 새 파일이나 새 역할을 추가하지 않는다.

## 3. UI 계약 (동결 — selector/token 재정의 금지)

### 3.1 DOM 구조

- `#palette-root` — 전체 컨테이너, class `palette`
  - `.palette__input-group` — 입력 영역
    - `#hex-input` — 텍스트 입력, `aria-label="기준 색상 hex 코드"`
    - `#color-picker` — `<input type="color">` (hex-input과 동기화)
    - `#random-btn` — 랜덤 기준색 생성 버튼
  - `#palette-swatches` — 생성된 5개 swatch 컨테이너
    - `.palette__swatch` (버튼, 5개 반복) — `aria-label="{hex} 복사"` (동적, hex는 대문자 `#RRGGBB`)
      - `.palette__swatch-hex` — swatch 내 hex 코드 텍스트
      - `.palette__copied-badge` — copied 상태에서만 노출되는 "복사됨" 배지
  - `#error-message` — 에러 문구, `role="alert"`, 기본 숨김(`hidden` 또는 빈 텍스트)

### 3.2 상태 모델

| 상태 | 진입 조건 | 화면 표현 |
|---|---|---|
| `idle` | 초기 로드 또는 유효한 hex 입력/랜덤 생성 완료 후 | `#error-message` 비움/숨김, `#palette-swatches`에 5개 swatch 표시, `#random-btn` 활성 |
| `generating` | `#random-btn` 클릭 직후 ~ 팔레트 계산 완료 전 | `#random-btn`에 `aria-busy="true"` 및 `disabled`, 완료 즉시 `idle`로 복귀 (동기 계산이므로 UI에 노출되는 짧은 과도 상태) |
| `error` | `#hex-input` 값이 `/^#?[0-9a-fA-F]{6}$/`에 불일치 | `#error-message`에 `"올바른 hex 코드를 입력하세요 (예: #3B82F6)"` 표시, `#palette-swatches`는 직전 유효 상태 유지, `#random-btn`은 계속 사용 가능 |
| `copied` | `.palette__swatch` 클릭(hex 클립보드 복사 성공) | 해당 swatch 안 `.palette__copied-badge`에 `"복사됨"` 텍스트 노출, 1500ms 후 자동으로 `idle` 표현으로 복귀 |

- 실패(잘못된 hex) 또는 `copied` 표현 종료 후에는 `#hex-input`, `#random-btn`, `.palette__swatch` 모두 즉시 재사용 가능해야 한다(진행 표시가 남아있지 않아야 한다).
- 상태는 색상만으로 구분하지 않고 위 화면 텍스트(에러 문구, "복사됨") 및 `aria-label`/`role="alert"`로 함께 노출한다.

### 3.3 디자인 토큰

| 토큰 | 값 |
|---|---|
| `--font-family-base` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `--color-error-text` | `#dc2626` |
| `--color-swatch-border` | `#e2e8f0` |
| `--space-swatch-gap` | `12px` |

### 3.4 접근성

- `#hex-input`은 `aria-label="기준 색상 hex 코드"`를 가진다.
- 각 `.palette__swatch` 버튼은 `aria-label="{hex} 복사"` 형식의 동적 `aria-label`을 가진다.
- `#error-message`는 `role="alert"`로 스크린리더에 즉시 공지된다.
- `#random-btn`과 `.palette__swatch`는 키보드 Enter/Space로 활성화 가능하다(네이티브 `<button>` 사용으로 충족).
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다(3.2 참고).

### 3.5 반응형

- 320px 이상에서 `#palette-swatches`가 줄바꿈되어 overflow가 발생하지 않는다(`flex-wrap: wrap` 또는 `grid` + `minmax`).
- 480px 미만에서는 swatch가 세로로 쌓이고, 480px 이상에서는 가로 5열로 배치된다.

## 4. 색 변환 순수 함수 규칙표

`palette/palette.js`는 아래 3개 순수 함수를 export한다. 부수효과(DOM 접근, clipboard 등)는 이 함수들에 포함하지 않는다.

### 4.1 `hexToHsl(hex)`

| 항목 | 규칙 |
|---|---|
| 입력 | 문자열. `#` 접두 유무 모두 허용, 대소문자 무관, 6자리 RGB(`#RRGGBB`)만 지원 |
| 출력 | `{ h: number, s: number, l: number }` — `h`는 0~360(정수, 0과 360은 동일 색상이므로 0으로 정규화), `s`/`l`은 0~100(정수, 반올림) |
| 오류 | 입력이 `/^#?[0-9a-fA-F]{6}$/`에 불일치하면 `Error`를 throw |

### 4.2 `hslToHex({ h, s, l })`

| 항목 | 규칙 |
|---|---|
| 입력 | `{ h: number, s: number, l: number }`. `h`는 계산 전 `((h % 360) + 360) % 360`으로 정규화, `s`/`l`은 0~100으로 clamp 후 사용 |
| 출력 | 소문자 6자리 `#rrggbb` 문자열 |
| 오류 | 없음(입력은 항상 clamp/정규화로 유효 범위에 수렴시켜 처리) |

### 4.3 `buildPalette(hex)`

| 항목 | 규칙 |
|---|---|
| 입력 | `hexToHsl`이 허용하는 형식의 hex 문자열(기준색) |
| 출력 | 길이 5의 배열, 각 원소 `{ hex: string, role: string }`. `hex`는 `hslToHex` 출력 형식(소문자 `#rrggbb`) |
| 오류 | 기준색이 유효하지 않으면 `hexToHsl`이 던진 `Error`를 그대로 전파 |

## 5. 5색 파생 규칙 (보색 1 · 유사색 2 · 명도 변형 2)

기준색을 `hexToHsl`로 `{h, s, l}`을 구한 뒤, 아래 규칙으로 5개 색을 파생하고 `hslToHex`로 되돌려 `buildPalette`의 반환 배열을 구성한다. 배열 순서는 아래 표 순서를 따른다.

| 순번 | role | 계산식 | 비고 |
|---|---|---|---|
| 1 | `complementary` | `h' = (h + 180) % 360`, `s' = s`, `l' = l` | 보색 1종 |
| 2 | `analogous-30` | `h' = (h - 30 + 360) % 360`, `s' = s`, `l' = l` | 유사색 2종 중 첫 번째 |
| 3 | `analogous+30` | `h' = (h + 30) % 360`, `s' = s`, `l' = l` | 유사색 2종 중 두 번째 |
| 4 | `lighter` | `h' = h`, `s' = s`, `l' = min(l + 20, 95)` | 명도 변형(밝게), 상한 95 |
| 5 | `darker` | `h' = h`, `s' = s`, `l' = max(l - 20, 5)` | 명도 변형(어둡게), 하한 5 |

예시(기준색 `#3B82F6`, `h≈217 s≈91 l≈60`):

| role | 결과 h/s/l(근사) |
|---|---|
| complementary | h≈37, s≈91, l≈60 |
| analogous-30 | h≈187, s≈91, l≈60 |
| analogous+30 | h≈247, s≈91, l≈60 |
| lighter | h≈217, s≈91, l=80 |
| darker | h≈217, s≈91, l=40 |

## 6. `node --test` 최소 케이스 (palette/palette.test.js)

1. `hexToHsl('#ff0000')` → `{h:0, s:100, l:50}` (기본 변환)
2. `hexToHsl('3b82f6')` — `#` 없이도 정상 파싱됨(대소문자·접두 무관 처리)
3. `hexToHsl('#zzzzzz')` — 잘못된 hex 입력 시 `Error` throw
4. `hslToHex({h:0, s:100, l:50})` → `'#ff0000'` (기본 변환)
5. `hslToHex({h:360, s:100, l:50})` → `'#ff0000'` (h 정규화 확인, 0과 360 동일 처리)
6. 왕복 변환: 임의 hex(`#3b82f6` 등)에 대해 `hslToHex(hexToHsl(hex))`가 원본과 동일한 소문자 hex를 반환
7. `buildPalette('#3b82f6')` — 길이 5의 배열을 반환하고 각 원소가 유효한 `#rrggbb` 형식임을 확인
8. `buildPalette` — `complementary` 원소의 hue가 기준색 hue와 180도 차이임을 `hexToHsl`로 재검증
9. `buildPalette` — `lighter`/`darker` 원소의 lightness가 각각 상한 95 / 하한 5로 clamp됨(극단값 기준색 입력 시)
10. `buildPalette('invalid')` — 잘못된 기준색 입력 시 `Error` throw(4.3 오류 전파 규칙)

## 7. 구현 순서 (developer)

1. `palette/palette.js`에 `hexToHsl` → `hslToHex` → `buildPalette` 순서로 순수 함수 구현, `palette/palette.test.js`에 6절 케이스를 먼저 작성해 TDD로 진행(`node --test`)
2. `palette/index.html`에 3.1 DOM 구조를 3.4 접근성 속성과 함께 정적으로 배치
3. `palette/style.css`에 3.3 토큰과 3.5 반응형 규칙 적용
4. `#hex-input`/`#color-picker`/`#random-btn`/`.palette__swatch` 이벤트를 `palette.js`의 순수 함수와 연결해 3.2 상태 전이(idle/error/generating/copied) 구현

## 8. Edge case / 실패 케이스

- **Given** `#hex-input`에 5자리 또는 8자리 문자열을 입력 **When** 값이 변경되면 **Then** `error` 상태로 전이하고 직전 유효 swatch는 유지된다.
- **Given** `#hex-input`이 비어 있는 상태 **When** 포커스를 벗어나면 **Then** `error` 상태로 전이한다(빈 문자열은 유효한 hex가 아님).
- **Given** `idle` 상태에서 `.palette__swatch`를 클릭했으나 클립보드 API가 실패 **When** 복사 실패 **Then** `copied` 상태로 전이하지 않고 기존 `idle` 표현을 유지한다(에러 상태로 격상하지 않음).
- **Given** `generating` 상태 진행 중 **When** 계산이 완료되면 **Then** 자동으로 `idle`로 복귀하며 사용자의 추가 조작 없이 `#random-btn`이 다시 활성화된다.
- **Given** `copied` 상태 표시 중 **When** 사용자가 같은 swatch를 다시 클릭하면 **Then** 1500ms 타이머가 재시작되고 배지 텍스트는 `"복사됨"`을 유지한다.
