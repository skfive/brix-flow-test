# 타이핑 속도 테스트 UI 시안 (BF-2030 / BF-2029)

본 문서는 `docs/plans/BF-2029/implementation-plan.md`에 동결된 UI 계약(ui-contract@v1)을 시각 시안으로 옮긴 것이다. **DOM ID / class / 상태(state) / 디자인 토큰 / 접근성 / 반응형 규칙은 재정의하지 않는다** — 아래 표는 frozen 계약을 그대로 인용한다. 권위 있는 원본은 항상 implementation-plan.md 2장이다.

## 1. 시안 개요

- **변경 범위**: 신규 기능 BF-2029 "타이핑 속도 테스트"의 단일 페이지 UI. 문장 표시, 입력, 실시간 통계(WPM/정확도/타이머/오타 수), 결과 화면, 재시작을 한 화면에서 처리한다.
- **사용자 경험 목표**:
  - 사용자가 화면 상단의 목표 문장을 보고 그대로 입력하면, 글자 단위로 즉시 정오 피드백(대기/현재 위치/정확/오타)을 받는다.
  - 진행 중에는 WPM · 정확도 · 남은 시간 · 오타 수를 실시간으로 확인할 수 있다.
  - 60초가 지나거나 문장을 끝까지 정확한 길이로 입력하면 결과 화면이 나타나고, 언제든 재시작 버튼으로 새 문장을 받아 다시 시작할 수 있다.
  - 상태는 색상만으로 구분하지 않는다 — 화면 텍스트로 "대기 중 / 진행 중 / 완료"를 항상 노출한다.
- **범위 제한**: 본 문서와 `docs/design/typing-mockup-BF-2029.html`만 작성한다. 런타임 `typing/index.html`, `typing/style.css`, `typing/typing.js`, `typing/typing.test.js`는 developer(BF-2031) 소유이며 이 task에서 만들지 않는다.

## 2. 컬러 팔레트

### 2.1 Frozen 토큰 (변경 금지 — implementation-plan.md 2.4 그대로)

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#0f172a` | 페이지 배경 |
| `--color-surface` | `#1e293b` | 카드/패널 배경 |
| `--color-text` | `#e2e8f0` | 기본 텍스트 |
| `--color-char-current` | `#facc15` | 현재 입력 위치 글자 (`char-current`) |
| `--color-char-correct` | `#22c55e` | 정확히 입력된 글자 (`char-correct`) |
| `--color-char-incorrect` | `#ef4444` | 오타 글자 (`char-incorrect`) |

### 2.2 designer 보충 토큰 (non-frozen — dev 재량으로 조정 가능)

frozen 계약에 없는 값이며, 계약을 위반하지 않는 범위에서 dev가 자유롭게 조정 가능하다.

| 변수 | 값 | 용도 |
|---|---|---|
| `--color-char-pending` | `#64748b` | 아직 입력하지 않은 글자 (`char-pending`) — 저채도 회색으로 눈에 덜 띄게 |
| `--color-text-muted` | `#94a3b8` | 라벨, 캡션, 보조 텍스트 |
| `--color-border` | `#334155` | 카드/입력 테두리 |
| `--color-focus-ring` | `#93c5fd` | 포커스 아웃라인 |
| `--color-danger-bg` | `rgba(239, 68, 68, 0.12)` | 오타 수 강조 배경(결과 패널) |
| `--color-accent-bg` | `rgba(34, 197, 94, 0.12)` | 정확도 강조 배경(결과 패널) |

## 3. 타이포그래피

`--font-family-base`(`system-ui, -apple-system, 'Segoe UI', sans-serif`, frozen)를 전 요소에 일관 적용한다. 목표 문장에도 별도 monospace를 도입하지 않고 `letter-spacing`으로 가독성을 보완한다.

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`h1`, 페이지 제목) | var(--font-family-base) | 1.5rem(24px) | 700 | 1.3 |
| 상태 표시 (state indicator) | var(--font-family-base) | 0.75rem(12px), uppercase, letter-spacing 0.04em | 600 | 1.2 |
| `#target-sentence` | var(--font-family-base) | 1.375rem(22px), letter-spacing 0.01em | 500 | 1.7 |
| `#typed-input` | var(--font-family-base) | 1.125rem(18px) | 400 | 1.4 |
| stats 값 (`#wpm-value` 등) | var(--font-family-base), `font-variant-numeric: tabular-nums` | 1.5rem(24px) | 700 | 1.2 |
| stats 라벨 (caption) | var(--font-family-base) | 0.75rem(12px), uppercase, letter-spacing 0.04em | 600 | 1.2 |
| `#restart-button` | var(--font-family-base) | 1rem(16px) | 600 | 1.2 |
| `#result-panel` 항목 | var(--font-family-base) | 1.125rem(18px) 라벨 / 2rem(32px) 값 | 400 / 700 | 1.3 |

## 4. 레이아웃

### 4.1 구조 (상단 → 하단, 단일 컬럼)

```
#typing-app (카드, max-width 640px, 중앙 정렬)
├─ h1 "타이핑 속도 테스트"
├─ 상태 표시 텍스트 (예: "상태: 대기 중")
├─ #target-sentence (문장, 글자별 span)
├─ #typed-input (텍스트 입력)
├─ .stats-bar (4개 통계 항목: WPM · 정확도 · 타이머 · 오타 수)
├─ #restart-button
└─ #result-panel (finished 상태에서만 result-panel--visible로 표시)
```

### 4.2 spacing

- 카드 padding: 32px (모바일 320px 근접 시 20px로 축소)
- 카드 내부 세로 간격: 24px
- `.stats-bar` 항목 간 간격: `--space-control-gap`(12px, frozen) 그대로 사용
- `#target-sentence` 글자 간 word-spacing은 원문 공백을 그대로 유지, 줄바꿈은 `overflow-wrap: break-word`

### 4.3 breakpoint 동작 (320px 이상)

- **≥480px**: `.stats-bar`는 4개 항목을 가로 1행(flex-wrap)으로 배치.
- **<480px**: `.stats-bar` 항목이 2열로 줄바꿈(flex-wrap: wrap), 카드 padding 축소.
- **모든 폭**: `#target-sentence`는 `overflow-wrap: break-word`로 줄바꿈, 가로 스크롤 없음. `#typed-input`은 `width: 100%`, `max-width: 100%`로 뷰포트 밖으로 넘치지 않음.

## 5. 컴포넌트 명세

### 5.1 `#typing-app` (컨테이너, frozen id)

- 카드형 컨테이너. `background: var(--color-surface)`, `border-radius: 16px`, `padding: 32px`.
- 모든 하위 frozen 요소를 이 안에 포함한다.

### 5.2 상태 표시 (state indicator, non-frozen 보조 요소)

- frozen dom_ids 목록에는 없는 순수 텍스트 요소(`<p class="state-indicator">` 등, 새 id 부여하지 않음). 접근성 요구사항("모든 상태는 색상만으로 구분하지 않는다") 충족을 위한 보충 요소다.
- 상태별 텍스트: `idle` → "상태: 대기 중", `running` → "상태: 진행 중", `finished` → "상태: 완료".
- dev는 이 요소를 별도 id 없이 구현해도 되고, `#typing-app`의 `aria-label`을 상태에 맞춰 갱신하는 방식으로 대체해도 계약 위반이 아니다(상태명이 텍스트/접근성 이름으로 노출되기만 하면 됨).

### 5.3 `#target-sentence` (frozen id)

- props/상태: 5문장 pool 중 현재 문장, 각 글자를 `<span>`으로 감싸 4개 class 중 하나를 부여.
  - `char-pending`: 아직 입력 안 한 글자. 색상 `var(--color-char-pending)`.
  - `char-current`: 다음에 입력할 글자(커서 위치). 색상 `var(--color-char-current)`, 밑줄 또는 배경으로 추가 강조.
  - `char-correct`: 정확히 입력된 글자. 색상 `var(--color-char-correct)`.
  - `char-incorrect`: 오타로 입력된 글자. 색상 `var(--color-char-incorrect)`, 취소선(`text-decoration: line-through`)으로 색맹 사용자도 구분 가능하게 보강.
- 인터랙션: 정적 표시 전용(직접 클릭/편집 불가). 값은 `typed-input`의 입력에 따라 JS가 class를 갱신(구현은 dev 담당).

### 5.4 `#typed-input` (frozen id)

- 단일 라인 텍스트 입력. `aria-label="타이핑 입력"`(frozen 접근성 요구).
- 상태별 동작:
  - `idle`: placeholder "여기에 입력을 시작하세요", 비어있음, 포커스만으로는 타이머 시작 안 함.
  - `running`: 사용자 입력 값 표시, 첫 keydown에서 타이머 시작.
  - `finished`: `disabled` 처리(회색 배경, `cursor: not-allowed`), 마지막 입력값 유지.
- 스타일: `background: var(--color-bg)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`, `padding: 12px 16px`, 포커스 시 `outline: 2px solid var(--color-focus-ring)`.

### 5.5 `.stats-bar` (frozen class)

4개 통계 항목을 담는 컨테이너. `display: flex`, `gap: var(--space-control-gap)`, `flex-wrap: wrap`.

각 항목은 라벨(caption) + 값(frozen id, `aria-live="polite"`) 쌍:

| 항목 | 값 요소 id (frozen) | 라벨 | 표시 형식 |
|---|---|---|---|
| WPM | `#wpm-value` | "WPM" | 정수 (예: `0`, `50`) |
| 정확도 | `#accuracy-value` | "정확도" | 정수 + `%` (예: `100%`) |
| 남은 시간 | `#timer-value` | "남은 시간" | 초 단위 (예: `60s`, `0s`) |
| 오타 수 | `#typo-count-value` | "오타 수" | 정수 (예: `0`) |

- `idle` 상태 초기값: WPM `0`, 정확도 `100%`(3.2 산식의 입력 없음 가드), 남은 시간 `60s`, 오타 수 `0`.
- `running`/`finished`에서는 실시간(또는 확정) 계산값을 표시(3.1/3.2 산식은 implementation-plan.md 3장 참조, 이 문서에서 재정의하지 않음).

### 5.6 `#restart-button` (frozen id)

- 텍스트: "다시 시작". `idle`/`running`/`finished` 모든 상태에서 활성화 상태 유지(비활성화 없음).
- 키보드 포커스 가능, Enter/Space로 활성화(frozen 접근성 요구 — 시맨틱 `<button>` 사용으로 기본 충족).
- 스타일: `background: var(--color-char-correct)` 계열 강조 버튼, `color: var(--color-bg)`, `border-radius: 8px`, `padding: 12px 20px`, `font-weight: 600`.
- 클릭 시 동작(구현 참고, dev 담당): 상태 `idle`로 전환, 통계/입력값/오타 카운트 초기화, `#target-sentence`를 pool의 다음 문장으로 교체, `#typed-input` 재사용 가능.

### 5.7 `#result-panel` (frozen id)

- 기본 상태(`idle`/`running`)에서는 `result-panel--visible` class 없이 화면에 표시하지 않음(`display: none`).
- `finished` 상태 진입 시 `result-panel--visible` class 추가 → `display: flex`로 전환, WPM/정확도/오타 수 3개 값을 큰 글씨로 재노출(스탯바 값과 동일 소스, 결과 강조용 별도 표시).
- 스타일: `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 12px`, `padding: 24px`, 정확도 항목은 `--color-accent-bg` 배경, 오타 수 항목은 `--color-danger-bg` 배경으로 시각 강조.

## 6. dev 구현 가이드

developer(BF-2031)는 `typing/index.html`, `typing/style.css`, `typing/typing.js`, `typing/typing.test.js`를 작성할 때 아래 순서를 참고한다. **DOM ID/class/토큰/상태/접근성/반응형은 이 문서와 implementation-plan.md 2장을 그대로 따르며 재정의하지 않는다.**

1. **HTML 골격**: `#typing-app` → 상태 표시 텍스트 → `#target-sentence`(글자별 span, 초기 전부 `char-pending`, 첫 글자만 `char-current`) → `#typed-input`(`aria-label="타이핑 입력"`) → `.stats-bar`(`#wpm-value`, `#accuracy-value`, `#timer-value`, `#typo-count-value`, 각 `aria-live="polite"`) → `#restart-button` → `#result-panel`(`result-panel--visible` 없이 시작).
2. **CSS 변수**: `:root`에 2장의 frozen 토큰 6개 + 보충 토큰을 선언. 색상은 반드시 변수 참조로만 사용(하드코딩 금지).
3. **상태 전이 트리거** (implementation-plan.md 4장 규칙 그대로):
   - `idle → running`: `#typed-input`의 첫 `keydown`/`input` 이벤트에서 타이머 시작.
   - `running → finished`: 60초 경과 **또는** `typed.length === target.length` 도달 시 즉시 전환(둘 다 동시 발생해도 전이는 1회만).
   - `finished` 진입 시: `#typed-input`에 `disabled` 부여, `#result-panel`에 `result-panel--visible` 추가, `#wpm-value`/`#accuracy-value`/`#typo-count-value` 확정값 반영.
   - `#restart-button` 클릭 시 (모든 상태에서 동작): 상태 `idle`로 되돌리고 `#typed-input`의 `disabled` 제거·값 초기화, 통계 초기값 재표시, `#target-sentence`를 pool 다음 문장(`nextIndex = (currentIndex + 1) % 5`)으로 교체, `result-panel--visible` 제거.
4. **글자별 class 갱신 로직**: 입력할 때마다 `typed`와 `target`을 인덱스 비교(3.2 산식)해 `char-correct`/`char-incorrect`를 부여하고, 다음 미입력 글자에 `char-current`를 부여, 나머지는 `char-pending` 유지.
5. **계산 로직**: `calcWpm`, `calcAccuracy`는 implementation-plan.md 3장 산식·경계값 표를 그대로 구현(이 문서에서 재정의하지 않음).
6. **테스트**: `typing/typing.test.js`에서 `calcWpm`/`calcAccuracy` 경계값 표(3.1/3.2)와 상태 전이(4장), 재시작 후조건(1장 산출물 표)을 검증.

## 7. mockup 참조

시안의 시각 시뮬레이션은 `docs/design/typing-mockup-BF-2029.html`에 idle / running / finished 3개 상태 스냅샷으로 구현했다. mockup은 dev의 실제 산출물이 아니며 픽셀 단위 일치 의무가 없다 — DOM ID/class/토큰/상태/접근성 계약의 권위 있는 원본은 항상 `docs/plans/BF-2029/implementation-plan.md`다.
