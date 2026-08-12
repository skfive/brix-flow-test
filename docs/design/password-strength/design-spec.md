# 비밀번호 강도 검사기 — UI 시안 (BF-1994)

> 이 문서는 BF-1993 epic 산하 `docs/plans/BF-1993/implementation-plan.md`(BF-1996)에서
> planner가 동결한 UI 계약을 그대로 재서술한 시안이다. DOM id/class, 상태, 토큰,
> 접근성, 반응형 계약은 **frozen** — 여기서 재정의하지 않는다. dev-1(BF-1995)은 이 문서와
> `mockup.html`을 참조 가이드로 삼아 `password-strength/` 하위 실제 코드를 구현한다.

## 1. 시안 개요

- **변경 범위**: 단일 페이지 `password-strength/index.html`. 비밀번호 입력 필드, 표시
  토글 버튼, 강도 진행바(progressbar), 강도 라벨 텍스트, 5개 규칙 체크리스트로 구성된
  실시간 강도 검사기 UI.
- **사용자 경험 목표**: 사용자가 타이핑하는 즉시 강도 상태(6단계)를 색상 + 텍스트로
  동시에 인지할 수 있어야 한다. 색맹/저시력 사용자도 텍스트 라벨만으로 상태를 완전히
  파악할 수 있어야 한다(색상 단독 구분 금지 — 접근성 원칙). 초기 상태·초기화 후 상태는
  항상 동일한 "미입력" 화면으로 되돌아온다.

## 2. 컬러 팔레트 (frozen 토큰 — exact)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-strength-very-weak` | `#dc2626` | `strength-bar__fill` 배경 (state=very-weak) |
| `--color-strength-weak` | `#f97316` | `strength-bar__fill` 배경 (state=weak) |
| `--color-strength-medium` | `#eab308` | `strength-bar__fill` 배경 (state=medium) |
| `--color-strength-strong` | `#84cc16` | `strength-bar__fill` 배경 (state=strong) |
| `--color-strength-very-strong` | `#16a34a` | `strength-bar__fill` 배경 (state=very-strong) |
| `--color-bar-track` | `#e5e7eb` | `strength-bar` 트랙 배경 |

보조 색상(비-토큰, mockup 표현용 — dev 재량):

| 용도 | 값 |
|---|---|
| 본문 텍스트 | `#1f2937` |
| 보조/설명 텍스트 | `#6b7280` |
| 카드 배경 | `#ffffff` |
| 페이지 배경 | `#f9fafb` |
| 테두리 | `#d1d5db` |
| `rule--met` 텍스트 강조 | `#16a34a` |
| `rule--unmet` 텍스트 강조 | `#6b7280` |

> `empty` 상태는 별도 토큰이 없다 — `strength-bar__fill`은 폭 0%(또는 미표시)로 두고
> `--color-bar-track`만 노출한다(3.3 참조).

## 3. 타이포그래피

- **font-family**: `--font-family-base: system-ui, -apple-system, sans-serif` (frozen 토큰,
  전체 페이지 공통 적용)
- **heading**(페이지 제목, 있는 경우): 20px / weight 700 / line-height 1.4
- **body**(입력 라벨, 규칙 텍스트): 15px / weight 400 / line-height 1.5
- **strength-label**: 16px / weight 600 / line-height 1.4 — 상태 색상과 무관하게 본문
  텍스트 색(`#1f2937`) 사용(색상만으로 상태 구분 금지 원칙, 색상은 bar에만 적용)
- **caption**(규칙 리스트 보조 텍스트, placeholder 안내): 13px / weight 400 / line-height 1.4

## 4. 레이아웃

### 4.1 섹션 구조 (top → bottom)

1. 페이지 제목 영역 (`<h1>` 비밀번호 강도 검사기) — placeholder 성격, 계약 대상 아님
2. 입력 영역: `password-input`(텍스트/패스워드 입력) + `toggle-visibility`(표시 토글 버튼)
   — 같은 행에 나란히 배치(가로 폭 320px 이상), 320px 미만에서도 줄바꿈 없이 유지되도록
   input에 `flex: 1` 부여
3. 강도 표시 영역: `strength-meter`(progressbar, `strength-bar` 클래스의 트랙 + 내부
   `strength-bar__fill`) + `strength-label`(현재 상태 텍스트) — bar 위/아래에 label 배치
4. 규칙 체크리스트 영역: `rules-list` — 5개 `rule` 항목을 세로로 나열

### 4.2 Spacing

- 카드 컨테이너 padding: 24px (모바일 480px 이하에서는 16px)
- 섹션 간 여백(margin-bottom): 20px
- `rules-list` 항목 간 여백: 8px
- 입력 필드와 토글 버튼 사이 간격: 8px

### 4.3 Breakpoint 별 동작

| 뷰포트 | 동작 |
|---|---|
| ≥481px (desktop/tablet) | 카드 최대 폭 420px, 화면 중앙 정렬. 입력행/강도행/규칙행 모두 세로 스택, 카드 내부는 여유 있는 padding(24px) |
| 320px~480px (모바일) | 카드 폭 100%(좌우 여백 16px), padding 16px로 축소. `strength-bar`와 `rules-list`는 계속 세로 정렬 유지(가로 스크롤 없음). 폰트 크기 유지, 버튼/입력 필드는 터치 타깃 44px 이상 높이 유지 |
| <320px | 계약 범위 밖(비목표) — 320px 이상만 overflow 없음을 보장 |

## 5. 컴포넌트 명세

### 5.1 `password-input` (input)

- 태그: `<input type="password" id="password-input">`
- 속성: `aria-label="비밀번호"` (frozen 접근성 계약)
- placeholder: "비밀번호를 입력하세요" (시각 안내용, `aria-label`과 별개)
- 상태: 기본(password 숨김) / 표시 중(`type=text`, `toggle-visibility` 클릭 시 전환)
- 스타일: 테두리 1px `#d1d5db`, radius 6px, padding 10px 12px, font-size 15px, height 44px

### 5.2 `toggle-visibility` (button)

- 태그: `<button type="button" id="toggle-visibility">`
- 속성(frozen, 클릭마다 갱신):

  | 상태 | `aria-pressed` | `aria-label` | 버튼 표시 텍스트(placeholder) |
  |---|---|---|---|
  | 숨김(기본) | `false` | 비밀번호 표시 | 표시 |
  | 표시 중 | `true` | 비밀번호 숨김 | 숨김 |

- 인터랙션: 클릭 시 `password-input`의 `type`을 `password`⇄`text`로 토글하고 위 표의
  `aria-pressed`/`aria-label`/버튼 텍스트를 함께 갱신한다.
- 스타일: 보조 버튼(outline), height 44px, 최소 너비 64px, hover 시 배경 `#f3f4f6`

### 5.3 `strength-meter` (progressbar 컨테이너)

- 태그: `<div id="strength-meter" role="progressbar" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">`
- 내부 구조: `<div class="strength-bar"><div class="strength-bar__fill"></div></div>`
- `strength-bar`: 트랙, 배경 `--color-bar-track`, height 8px, radius 4px, width 100%
- `strength-bar__fill`: 현재 state에 대응하는 `--color-strength-*` 배경색, height 100%,
  radius 4px, width는 점수 비례(0/4, 1/4, 2/4, 3/4, 4/4 → 0%/25%/50%/75%/100%),
  `empty` 상태는 width 0%
- 상태-값 매핑(frozen):

  | state | aria-valuenow | fill width | fill 색상 토큰 |
  |---|---|---|---|
  | empty | 0 | 0% | (미표시) |
  | very-weak | 0 | 25% | `--color-strength-very-weak` |
  | weak | 1 | 50% | `--color-strength-weak` |
  | medium | 2 | 75% | `--color-strength-medium` |
  | strong | 3 | 90% | `--color-strength-strong` |
  | very-strong | 4 | 100% | `--color-strength-very-strong` |

  > 비고: `aria-valuenow`는 `scorePassword`의 `score`(0~4) 그대로 사용한다(plan 3.2 매핑).
  > `very-weak`도 score=0이므로 `aria-valuenow=0`이며 `empty`와 값은 같지만 시각적으로는
  > fill width(25% vs 0%)와 `strength-label` 텍스트로 구분된다.

### 5.4 `strength-label` (텍스트)

- 태그: `<p id="strength-label">` 또는 `<span id="strength-label">`
- 표시 텍스트(frozen — 화면 텍스트 = 접근성 이름):

  | state | 텍스트 |
  |---|---|
  | empty | 비밀번호를 입력하세요 |
  | very-weak | 매우 약함 |
  | weak | 약함 |
  | medium | 보통 |
  | strong | 강함 |
  | very-strong | 매우 강함 |

- 스타일: font-weight 600, 색상 `#1f2937`(상태 색상과 무관, 색상은 bar에만 적용해
  색맹 사용자도 텍스트로 상태를 읽도록 함)

### 5.5 `rules-list` (ul)

- 태그: `<ul id="rules-list">`, 각 항목 `<li class="rule rule--met">` 또는
  `<li class="rule rule--unmet">`
- 5개 항목 순서(plan 3.1 고정):

  | 규칙 키 | 표시 텍스트(충족 시) | 표시 텍스트(미충족 시) |
  |---|---|---|
  | length | 8자 이상 (충족) | 8자 이상 (미충족) |
  | uppercase | 대문자 포함 (충족) | 대문자 포함 (미충족) |
  | lowercase | 소문자 포함 (충족) | 소문자 포함 (미충족) |
  | number | 숫자 포함 (충족) | 숫자 포함 (미충족) |
  | special | 특수문자 포함 (충족) | 특수문자 포함 (미충족) |

- 인터랙션: 규칙 텍스트에 `(충족)`/`(미충족)`을 항상 병기하여 색상 없이도 상태 판별
  가능(frozen 접근성 원칙). 초기 로드/`empty` 상태에서는 5개 항목 모두 `rule--unmet`.
- 스타일: `rule--met`은 좌측에 체크 마커(`✓`, 색상 `#16a34a`), `rule--unmet`은 좌측에
  마커(`—` 또는 빈 원, 색상 `#9ca3af`). 텍스트 자체 색상은 `rule--met` `#16a34a` /
  `rule--unmet` `#6b7280`.

## 6. dev 구현 가이드 (dev-1 대상)

1. `password-strength/index.html`에 위 5개 DOM id(`password-input`, `toggle-visibility`,
   `strength-meter`, `strength-label`, `rules-list`)와 4개 class(`strength-bar`,
   `strength-bar__fill`, `rule`, `rule--met`/`rule--unmet`)를 **정확히** 그대로 사용한다.
   추가 id/class를 신설해도 무방하나 위 목록은 절대 이름을 바꾸지 않는다.
2. `password-strength/style.css` `:root`에 6절 토큰(`--color-strength-*`,
   `--color-bar-track`, `--font-family-base`)을 그대로 선언하고, `strength-bar__fill`
   배경색은 JS에서 현재 state에 대응하는 토큰으로 인라인 스타일 또는 클래스 전환으로
   설정한다(5.3 표 참조).
3. `password-strength/strength.js`의 `scorePassword`/`checkRules`는
   `docs/plans/BF-1993/implementation-plan.md` 3.1~3.3의 exact 로직을 그대로 구현하고,
   결과 `state`를 단일 출처로 `strength-meter`(aria-valuenow), `strength-bar__fill`(색상),
   `strength-label`(텍스트), `rules-list`(개별 항목 met/unmet)에 반영한다.
4. `toggle-visibility` 클릭 핸들러는 5.2 표의 `aria-pressed`/`aria-label` 매핑을 그대로
   갱신하고 `password-input`의 `type` 속성을 전환한다.
5. 입력이 빈 문자열이 되면(초기화) `strength-meter`/`strength-bar__fill`/`strength-label`/
   `rules-list`를 모두 최초 로드 시점 값으로 되돌린다(plan 3.4). `password-input`과
   `toggle-visibility`는 초기화 후에도 계속 사용 가능해야 한다.
6. 반응형은 `password-strength/style.css`에 `@media (max-width: 480px)` 브레이크포인트로
   카드 padding/폭을 축소하되, `strength-bar`/`rules-list`의 세로 정렬 구조 자체는
   breakpoint와 무관하게 유지한다(4.3 참조). 320px 미만 대응은 범위 밖이다.
7. 색상 하드코딩 대신 6절 CSS 변수를 참조한다. 신규 CSS 변수 추가는 자유이나 6절 변수명은
   변경하지 않는다.

## 7. mockup 참조

시각 mockup: `docs/design/password-strength/mockup.html` (frozen blueprint 지정 경로)

mockup은 6개 상태(`empty`, `very-weak`, `weak`, `medium`, `strong`, `very-strong`)를
각각 별도 카드로 나열한 정적 스냅샷이며, 실제 인터랙션(입력 시 실시간 갱신, 토글 클릭
동작)은 dev 구현 시 JS로 처리한다. mockup은 각 상태에서 화면이 어떻게 보여야 하는지의
시각 기준선(색상/타이포/레이아웃/텍스트 라벨)을 제공하는 참고 자료다.
