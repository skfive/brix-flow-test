# 토큰 견본 구현 설계 (BF-1802 / planner BF-1804)

> 본 문서는 developer가 그대로 따라야 할 **frozen 실행 설계**입니다. 아래 파일·소유자·상태·후조건은 frozen blueprint(ui-contract@v1)를 그대로 렌더링한 것이며, 새 파일·역할·요구사항을 추가하지 않습니다. selector와 CSS 변수 이름·값을 재정의하지 마세요.

## 1. 목적

iteration-check 스타일의 토큰 견본 페이지를 vanilla-static(HTML/CSS/JS, ESM)으로 구현한다.
디자인 토큰(색상·간격·타이포)을 화면에 견본(swatch)으로 나열하고, light/dark 테마 전환을 제공한다.

## 2. 산출물 파일 (소유자: developer)

developer 산출물은 **`iteration-check/` 디렉터리 안에만** 위치한다. 이 경로 밖 파일을 생성·수정하지 않는다.

| 파일 | 정책 | 설명 |
| --- | --- | --- |
| `iteration-check/tokens.html` | additive | 토큰 견본 페이지 마크업 |
| `iteration-check/tokens.css` | additive | 디자인 토큰 정의 및 견본 레이아웃 스타일 |
| `iteration-check/tokens.js` | additive | 테마 전환 로직 (ESM) |
| `iteration-check/tokens.test.js` | additive | 단위 테스트 (`npm test`, focused) |

- serve_root: `.` / route_mapping: root-relative-static → 페이지 경로는 `/iteration-check/tokens.html`.
- module_type: esm → `tokens.js`는 `type="module"`로 로드하고, `tokens.test.js`도 ESM으로 작성한다.

## 3. 동결 UI 계약 (ui-contract@v1 — 재정의 금지)

### 3.1 DOM 구조

| 요소 | 식별자 | 역할 |
| --- | --- | --- |
| 견본 컨테이너 (루트) | `id="token-showcase"` | 페이지 최상위 토큰 견본 영역 |
| 테마 전환 버튼 | `id="theme-toggle"` | light ↔ dark 전환 |

CSS 클래스:

| 클래스 | 용도 |
| --- | --- |
| `token-grid` | 견본들을 담는 그리드 컨테이너(wrap) |
| `swatch` | 개별 토큰 견본 셀 |
| `swatch__label` | 견본의 토큰 이름·값 텍스트 |

권장 마크업 골격 (selector·이름은 위 값을 그대로 사용):

```html
<main id="token-showcase">
  <button id="theme-toggle" type="button" aria-label="테마 전환" aria-pressed="false">
    라이트 모드
  </button>
  <div class="token-grid">
    <div class="swatch">
      <span class="swatch__label">--color-accent · #2563eb</span>
    </div>
    <!-- 각 토큰마다 swatch + swatch__label 반복 -->
  </div>
</main>
```

### 3.2 CSS 변수 토큰 (이름·값 고정)

`:root`(light 기본)에 아래 토큰을 정의한다. 이름과 값을 재정의하지 않는다.

| 토큰 | 값 |
| --- | --- |
| `--color-bg` | `#ffffff` |
| `--color-fg` | `#1a1a1a` |
| `--color-accent` | `#2563eb` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--font-family-base` | `system-ui, sans-serif` |
| `--font-size-base` | `16px` |
| `--font-size-lg` | `20px` |

### 3.3 상태 (light / dark)

- 상태값은 **`light`, `dark`** 두 가지.
- dark 상태는 색상 토큰(`--color-bg`, `--color-fg`)을 재정의하는 것이 아니라, **테마 스코프에서 값을 오버라이드**한다(예: `[data-theme="dark"]` 또는 `.dark` 스코프에서 `--color-bg`/`--color-fg` 재지정). 토큰 **이름**은 그대로 유지한다.
- 초기 상태는 `light`.

#### 상태 전이 후조건 (필수)

- 초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값(light)** 으로 되돌리고, 주 실행 control(`#theme-toggle`)을 다시 사용할 수 있어야 한다.
- 즉, 전환 로직이 어떤 이유로 실패해도 `#theme-toggle`은 disabled로 남지 않으며 현재 상태 표기가 실제 상태와 일치해야 한다.

### 3.4 접근성

- `#theme-toggle`은 `aria-label="테마 전환"` 을 가진다.
- `#theme-toggle`은 현재 상태를 `aria-pressed`로 반영한다 (`light`일 때 `false`, `dark`일 때 `true` — 구현 시 한 방향을 택하되 상태와 일관되게 유지).
- 모든 상태는 **색상만으로 구분하지 않는다.** 현재 상태명(예: "라이트 모드"/"다크 모드")을 화면 텍스트와 접근성 이름(버튼 텍스트 또는 `aria` 노출)으로 함께 드러낸다.
- 각 `swatch`의 `swatch__label`은 토큰 이름과 값을 텍스트로 노출한다(색상 견본을 색만으로 식별하지 않도록).

### 3.5 반응형

- **320px 이상**에서 `token-grid`가 wrap되어 content overflow가 발생하지 않는다.
- 구현 힌트: `token-grid`에 `display: flex; flex-wrap: wrap;` 또는 `display: grid; grid-template-columns: repeat(auto-fill, minmax(...));`. 간격은 `--space-*` 토큰 사용.

## 4. 동작 로직 (tokens.js)

1. 페이지 로드 시 초기 상태 `light`로 설정 — 테마 스코프 미적용, `#theme-toggle` `aria-pressed="false"`, 버튼 텍스트는 라이트 상태명.
2. `#theme-toggle` 클릭 시 `light ↔ dark` 토글:
   - 테마 스코프 속성/클래스 적용·해제,
   - `aria-pressed` 갱신,
   - 버튼 텍스트(상태명) 갱신.
3. 상태를 계산하는 순수 함수(예: `nextTheme(current)`)를 export하여 테스트가 DOM 없이 검증할 수 있게 한다.

## 5. 테스트 (tokens.test.js, focused)

- 실행: `npm test` (focused — 본 파일과 owned 산출물만 대상).
- 최소 커버리지:
  - `nextTheme('light') === 'dark'`, `nextTheme('dark') === 'light'` (토글 순수 로직).
  - 초기 상태가 `light`이며 초기화 후 상태·진행 표시가 초기값으로 복귀함(후조건).
  - `#theme-toggle`의 `aria-pressed`가 상태와 일치함.

## 6. 경계·edge case

- 알 수 없는/누락 상태 입력 시 `light`로 폴백한다(후조건 4.3 준수).
- 반복 클릭·빠른 연속 전환에도 `aria-pressed`와 버튼 텍스트가 실제 상태와 어긋나지 않는다.
- JS 미로딩(비활성) 시에도 마크업은 light 기본 토큰으로 정상 렌더된다(그레이스풀 디그레이드).

## 7. 소유권·범위 불변식 (요약)

- 파일 소유권·상태 계약의 **유일한 권위는 frozen blueprint**이며, 본 문서는 이를 재정의하지 않는다.
- developer는 승인된 본 실행 설계를 따르며 `iteration-check/` **밖 파일을 생성·수정하지 않는다.**
- selector(`#token-showcase`, `#theme-toggle`, `.token-grid`, `.swatch`, `.swatch__label`)와 CSS 변수 이름·값을 재정의하지 않는다.
