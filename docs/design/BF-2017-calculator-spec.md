# 계산기 UI 시안 — BF-2017 (BF-2018 designer 산출물)

- Jira: BF-2018 (BF-2017 epic 하위 designer task)
- 근거 문서: `docs/plans/BF-2017/implementation-plan.md` (BF-2020 planner, frozen UI 계약)
- 대상: 사칙연산 계산기, client-only vanilla HTML/CSS/JS (`vanilla-static` 스택 — 외부 의존성 0건, system font)

> 본 문서는 planner 가 이미 동결한 DOM ID / CSS class / design token / 상태 / 접근성 / 반응형 계약을 **재정의하지 않고** 그대로 시각화한다. 아래 4장의 값은 모두 frozen 값이며 변경 대상이 아니다. 5장부터는 frozen 계약을 해치지 않는 범위에서 designer 가 보충한 시각 디테일(비-frozen)이다.

## 1. 시안 개요

- **변경 범위**: 신규 계산기 화면 1개 (라우트/페이지 단일). 숫자 0-9, 소수점, 사칙연산자(+ - × ÷), 등호(=), 전체 지우기(AC), 백스페이스(←) 버튼 그리드 + 결과 디스플레이.
- **사용자 경험 목표**:
  - 버튼 배치는 표준 계산기 관습(숫자 3×4 + 우측 연산자 열 + 하단 등호)을 따라 학습 비용을 없앤다.
  - 디스플레이는 항상 큰 고정폭 숫자로 결과를 즉시 인지 가능하게 하고, `aria-live="polite"` 로 스크린리더에도 즉시 반영한다.
  - idle / entering / result / error 4개 상태를 색상뿐 아니라 텍스트로도 구분해(색맹/저시력 사용자 포함) 오해 없이 인지시킨다.
  - 320px 이상 어떤 뷰포트에서도 버튼이 잘리거나 넘치지 않는다.

## 1.1 Frozen UI 계약 요약 (planner 원본 그대로 — 검증용)

| 구분 | 값 |
|---|---|
| DOM ID | `calculator-root`, `calculator-display`, `btn-clear`, `btn-backspace`, `btn-equals` |
| CSS class | `calculator`, `calculator__display`, `calculator__button`, `calculator__button--operator` |
| 상태 | `idle`, `entering`, `result`, `error` |
| Design token | `--color-display-bg: #1e293b`, `--color-display-text: #f8fafc`, `--color-button-bg: #e2e8f0`, `--color-button-operator-bg: #2563eb`, `--space-button-gap: 8px` |

## 2. 컬러 팔레트 (frozen token 그대로)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-display-bg` | `#1e293b` | 디스플레이 배경 |
| `--color-display-text` | `#f8fafc` | 디스플레이 텍스트(결과/입력값/오류 메시지) |
| `--color-button-bg` | `#e2e8f0` | 일반 버튼(숫자/소수점/AC/←/=) 배경 |
| `--color-button-operator-bg` | `#2563eb` | 연산자 버튼(+ - × ÷) 배경 |
| `--space-button-gap` | `8px` | 버튼 grid 간격 |

### 2.1 보충 컬러 (designer 추가 — non-frozen, `calculator/style.css` 자체 정의 대상)

frozen 목록에 없는 부가 색상은 아래처럼 dev 가 자유롭게 값을 조정해도 되는 **제안**이다. 단, 위 5개 frozen 토큰과 이름이 겹치거나 값이 달라지면 안 된다.

| 토큰(제안) | 값(제안) | 용도 |
|---|---|---|
| `--color-page-bg` | `#0f172a` | 페이지 배경(계산기 카드 바깥) |
| `--color-surface` | `#ffffff` | 계산기 카드 배경 |
| `--color-border` | `#cbd5e1` | 카드/버튼 경계선 |
| `--color-text-primary` | `#1e293b` | 일반 버튼 텍스트(밝은 배경 위) |
| `--color-text-inverse` | `#f8fafc` | 연산자 버튼 텍스트(어두운 파란 배경 위) |
| `--color-focus-ring` | `#93c5fd` | 키보드 포커스 아웃라인 |
| `--color-button-hover-bg` | `#cbd5e1` | 일반 버튼 hover |
| `--color-button-operator-hover-bg` | `#1d4ed8` | 연산자 버튼 hover |

## 3. 타이포그래피

vanilla-static 원칙에 따라 외부 폰트(CDN) 미사용, system font stack 사용.

- **font-family (공통)**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif`
- **디스플레이 (결과/입력값)**: 2.25rem(36px) / 700 / line-height 1.2 / `font-variant-numeric: tabular-nums` (자릿수 흔들림 방지)
- **디스플레이 오류 메시지**: 1.25rem(20px) / 600 / line-height 1.3 (긴 문장이므로 본문보다 축소)
- **상태 캡션** (`idle`/`entering`/`result`/`error` 텍스트 노출용): 0.75rem(12px) / 600 / letter-spacing 0.04em / uppercase
- **버튼 라벨**: 1.25rem(20px) / 600 / line-height 1
- **연산자 버튼 라벨(× ÷ + -)**: 1.375rem(22px) / 700 (숫자 버튼보다 살짝 강조)

## 4. 레이아웃

### 4.1 구조

```
calculator-root (.calculator)
├─ 상태 캡션 (텍스트로 idle/entering/result/error 노출)
├─ calculator-display (.calculator__display, aria-live="polite")
└─ 버튼 grid (.calculator__button / .calculator__button--operator)
```

### 4.2 페이지 레이아웃

- 페이지 전체: `--color-page-bg` 배경, flex 중앙 정렬(수직/수평)로 계산기 카드를 뷰포트 중앙에 배치.
- 계산기 카드(`#calculator-root`): 최대 너비 360px, `--color-surface` 배경, radius 16px, padding 20px, `--color-border` 1px 테두리, box-shadow 은은하게.

### 4.3 디스플레이 (`#calculator-display`)

- 너비 100%, padding 20px 16px, radius 12px, 배경 `--color-display-bg`, 텍스트 `--color-display-text`.
- 텍스트 정렬: 우측 정렬(숫자 입력 관습).
- `overflow-wrap`/`word-break` 로 오류 메시지(`0으로 나눌 수 없습니다`) 도 줄바꿈 없이 또는 자연 줄바꿈으로 카드 폭 안에 유지.
- 상단에 상태 캡션(`idle`→"대기", `entering`→"입력 중", `result`→"결과", `error`→"오류") 배치 — 색상과 무관하게 텍스트로 상태 인지 가능.

### 4.4 버튼 grid

- `display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-button-gap);`
- 5행 구성, 각 버튼 최소 높이 56px(터치 타겟 44px 이상 충족), radius 12px.
- 배치(좌→우, 상→하):

| 열1 | 열2 | 열3 | 열4 |
|---|---|---|---|
| AC (`#btn-clear`) | ← (`#btn-backspace`) | *(빈 칸)* | ÷ |
| 7 | 8 | 9 | × |
| 4 | 5 | 6 | − |
| 1 | 2 | 3 | + |
| 0 (2열 병합) | . | = (`#btn-equals`) |

- `0` 버튼은 `grid-column: span 2` 로 1~2열을 차지(표준 계산기 관습).
- 3행×4열 구간의 빈 칸(1행 3열)은 시각적 여백으로 비워둔다 — 새 기능 버튼 추가 금지(frozen 범위 밖).

### 4.5 반응형 (320px 이상)

- 320px: 카드 padding 16px, 버튼 grid gap 은 frozen 값(8px) 유지, 버튼 최소 높이 48px 로 축소해도 44px 터치 기준 충족.
- 480px 이상: 카드 padding 20px, 버튼 최소 높이 56px, 카드 최대 너비 360px 유지(더 커지지 않음 — 계산기는 좁은 고정폭 UI가 관습).
- 버튼 폰트 크기는 `clamp(1.0625rem, 4vw, 1.25rem)` 로 초소형 뷰포트에서도 줄바꿈 없이 유지.
- 세로/가로 방향 모두 `grid-template-columns: repeat(4, 1fr)` 고정 — 열 수 변경 없음(overflow 방지의 핵심).

## 5. 컴포넌트 명세

### 5.1 `.calculator` (`#calculator-root`)

- **역할**: 계산기 전체 컨테이너.
- **props/attributes**: 없음(정적 컨테이너). `role="group"`, `aria-label="계산기"` 권장(non-frozen 보충, 접근성 강화용).
- **상태**: 자식 요소(`#calculator-display`)의 상태를 통해 idle/entering/result/error 표현. 컨테이너 자체는 상태별 스타일 변경 없음.

### 5.2 `.calculator__display` (`#calculator-display`)

- **역할**: 현재 입력값/계산 결과/오류 메시지 표시.
- **속성(frozen)**: `aria-live="polite"` — 값 변경 시 스크린리더 즉시 안내.
- **상태별 표시값**:

| 상태 | 표시 텍스트(예시) | 상태 캡션 텍스트 |
|---|---|---|
| `idle` | `0` | 대기 |
| `entering` | `3 + 5` 또는 진행 중 입력값 | 입력 중 |
| `result` | `8` | 결과 |
| `error` | `0으로 나눌 수 없습니다` | 오류 |

- **인터랙션**: 입력 전용 아님(read-only 표시 영역), 클릭 인터랙션 없음.

### 5.3 `.calculator__button` (기본 버튼: 숫자 0-9, `.`, `#btn-clear`, `#btn-backspace`, `#btn-equals`)

- **역할**: 숫자/소수점/기능(AC, ←, =) 입력.
- **배경/텍스트**: `--color-button-bg` / `--color-text-primary`.
- **props(권장, non-frozen)**: `aria-label` 필수(아래 5.5 표), `type="button"`.
- **상태**: `:hover`(배경 `--color-button-hover-bg`), `:active`(scale 0.97 또는 배경 한 단계 진하게), `:focus-visible`(outline 2px `--color-focus-ring`), `:disabled`(error 상태에서 AC 제외 전 버튼 — opacity 0.5, cursor not-allowed).

### 5.4 `.calculator__button--operator` (연산자 버튼: + − × ÷)

- **역할**: 사칙연산자 입력. `.calculator__button` 위에 추가되는 modifier class(frozen) — base class 는 유지한 채 배경/텍스트만 override.
- **배경/텍스트**: `--color-button-operator-bg` / `--color-text-inverse`.
- **상태**: `:hover`(`--color-button-operator-hover-bg`), `:active`, `:focus-visible`(동일 focus ring), `:disabled`(error 상태 시 opacity 0.5).
- **선택된(대기 중) 연산자 표시(non-frozen 보충)**: 현재 대기 중인 연산자 버튼에 얇은 흰색 inset 테두리(2px)로 "선택됨"을 표시 — 새 class 를 추가하지 않고 `aria-pressed="true"` 속성 + 기존 modifier class 조합으로 표현 권장.

### 5.5 버튼별 라벨 / `aria-label` (frozen 접근성 요구사항 구체화)

| 라벨 | class | id(frozen, 있는 경우) | `aria-label`(권장 문구) |
|---|---|---|---|
| 0-9 | `.calculator__button` | 없음(class로만 식별) | `숫자 0` ~ `숫자 9` |
| `.` | `.calculator__button` | 없음 | `소수점` |
| `+` | `.calculator__button--operator` | 없음 | `더하기` |
| `−` | `.calculator__button--operator` | 없음 | `빼기` |
| `×` | `.calculator__button--operator` | 없음 | `곱하기` |
| `÷` | `.calculator__button--operator` | 없음 | `나누기` |
| `=` | `.calculator__button` | `#btn-equals` | `결과 계산` (frozen 예시값) |
| `AC` | `.calculator__button` | `#btn-clear` | `전체 지우기` |
| `←` | `.calculator__button` | `#btn-backspace` | `한 글자 지우기` |

> 숫자 0-9 / 연산자 4종 / 소수점에는 개별 DOM ID 가 frozen 되어 있지 않다(계약상 class 로만 식별). dev 구현 시 `data-*` 속성(예: `data-digit="7"`, `data-operator="+"`)으로 값 식별을 권장하나, 이는 designer 제안이며 frozen 계약이 아니므로 dev 재량으로 변경 가능.

## 6. dev 구현 가이드

1. **frozen 값 그대로 사용**: DOM ID(`calculator-root`, `calculator-display`, `btn-clear`, `btn-backspace`, `btn-equals`), class(`calculator`, `calculator__display`, `calculator__button`, `calculator__button--operator`), token 5종(2장) 을 이름/값 변경 없이 `calculator/style.css` 에 그대로 선언한다.
2. **보충 토큰**은 2.1 표를 참고해 `calculator/style.css` `:root` 에 자체 추가(외부 라이브러리 불필요, 값은 필요 시 조정 가능 — frozen 아님).
3. **레이아웃**: 4장의 grid 배치(4열×5행, `0` 버튼 2열 병합)를 `calculator/index.html` 마크업 순서 및 `calculator/style.css` grid 로 구현.
4. **상태 표현**: `calculator/calc.js` 가 `#calculator-root` 또는 `#calculator-display` 에 상태 클래스나 `data-state="idle|entering|result|error"` 속성을 토글하는 방식을 권장(비-frozen, 자유 선택). 색상 변경과 별개로 상태 캡션 텍스트(5.2 표)를 항상 DOM 텍스트로 노출해야 접근성 요건(4.6)을 만족한다.
5. **접근성**: 모든 버튼에 5.5 표의 `aria-label` 적용, `#calculator-display` 에 `aria-live="polite"` 고정, `:focus-visible` 스타일 누락 금지(키보드 전용 사용자 대응).
6. **반응형**: 미디어쿼리 없이도 4.5 절의 `clamp()`/`fr` 기반 fluid 값으로 320px~480px+ 모두 대응 가능 — 최소 320px 뷰포트에서 overflow 여부를 반드시 수동 확인.
7. **mockup 은 참고용**: 아래 7장 mockup HTML 은 시각 참고 자료이며, dev 는 frozen 계약(DOM ID/class/token/상태/접근성/반응형)만 그대로 지키면 픽셀 단위 일치 의무는 없다.

## 7. mockup 참조

- 파일: `docs/design/BF-2017-calculator-mockup.html`
- idle / entering / result / error 4개 상태를 각각 별도 섹션으로 정적 시각화했다(실제 인터랙션 없음, placeholder 값 사용).
