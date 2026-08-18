# 타자 연습기 UI 명세 (BF-2179 / epic: BF-2178)

> 본 문서는 `docs/plans/BF-2178/implementation-plan.md` §6의 **frozen `ui-contract@v1`** 을 재정의하지 않고 그대로 시각·구현 명세로 구체화한 것입니다. DOM id, CSS class, 디자인 토큰, 상태값, 접근성, 반응형 규칙은 planner가 동결한 값과 정확히 일치합니다.

## 1. 시안 개요

- **변경 범위**: 서버/네트워크 호출이 없는 클라이언트 전용 정적 타자 연습기 UI. 목표 문장(`prompt-text`)을 보고 입력창(`typed-input`)에 타이핑하면 글자별로 정오답이 실시간 색상으로 표시된다.
- **사용자 경험 목표**:
  - 연습자가 지금까지 입력한 각 글자가 맞았는지(`char--correct`) 틀렸는지(`char--incorrect`) 아직 입력하지 않았는지(`char--pending`)를 한눈에 구분하게 한다.
  - 상태(`idle`/`typing`/`done`)는 색상만이 아니라 화면 문구로도 노출해, 색각 이상 사용자도 현재 진행 단계를 알 수 있게 한다(계획 문서 §2 상태 전이표의 문구 그대로 사용).
  - `done` 상태에서 `stats-panel`에 결과를 보여주고, `restart-button`으로 언제든 `idle`로 되돌아가 재도전할 수 있다는 것을 시각적으로 명확히 한다.
  - Enter 무시·붙여넣기 차단은 사용자가 실수로 트리거해도 `paste-warning`이 `role="alert"`로 즉시 이유를 안내해 혼란을 줄인다.
- **비목표**: 다중 문장 세트/난이도 선택, 소리 효과, 랭킹/기록 저장 등은 계획 문서 범위 밖이며 본 시안에도 포함하지 않는다.

## 2. 컬러 팔레트

프로젝트 stack은 `vanilla-static` — 외부 의존성 0, CSS 변수는 frozen 토큰(implementation-plan.md §6)을 그대로 사용한다. 배경이 어두운 색(`--color-bg`)으로 동결되어 있어 다크 테마로 시안을 구성하고, 프레임/텍스트 등 나머지 색상은 이 배경과 대비가 확보되도록 designer가 보완했다.

| 토큰 | 값 | 용도 | 출처 |
|---|---|---|---|
| `--color-char-correct` | `#16a34a` | 정타 문자(`char--correct`) 색상 | frozen |
| `--color-char-error` | `#dc2626` | 오타 문자(`char--incorrect`) 색상 | frozen |
| `--color-char-pending` | `#6b7280` | 미입력 문자(`char--pending`) 색상 | frozen |
| `--color-bg` | `#0f172a` | 페이지 배경 | frozen |
| `--space-control-gap` | `12px` | control 간 여백 | frozen |
| `--color-surface` | `#1e293b` | 카드/입력/컨테이너 배경 | designer 보완 |
| `--color-text-primary` | `#f1f5f9` | 제목/본문 텍스트 | designer 보완 |
| `--color-text-muted` | `#94a3b8` | 보조 라벨(캡션, stats 라벨) | designer 보완 |
| `--color-border` | `#334155` | 카드/입력 테두리 | designer 보완 |
| `--color-action-primary` | `#3b82f6` | restart-button 배경, 포커스 링 | designer 보완 |
| `--color-action-primary-hover` | `#2563eb` | restart-button hover/active | designer 보완 |
| `--radius-control` | `8px` | 입력/카드/버튼 모서리 반경 | designer 보완 |

- 배경 `#0f172a` 위 `--color-text-primary`(`#f1f5f9`) 대비 ≈ 17.7:1 → WCAG AAA.
- 배경 `#0f172a` 위 `--color-char-correct`(`#16a34a`) 대비 ≈ 5.4:1 → 일반 텍스트 AA 통과.
- 배경 `#0f172a` 위 `--color-char-error`(`#dc2626`), `--color-char-pending`(`#6b7280`) 대비 각각 ≈ 3.7:1 → WCAG AA **large-text**(18px 이상 또는 14px bold 이상) 기준은 통과, 일반 텍스트 기준(4.5:1)은 미달. 이 두 토큰은 frozen 값이라 변경할 수 없으므로, §3에서 `prompt-text` 문자 크기를 1.25rem(20px)으로 지정해 large-text 기준을 충족시키는 방식으로 대응한다. 또한 상태는 색상에만 의존하지 않고 §5.2 문구로도 노출되므로 색각 이상 사용자도 진행 상황을 텍스트로 확인할 수 있다.
- 다크모드가 유일한 팔레트다(계획 문서에 라이트 모드 정의 없음 — 배경 토큰 자체가 다크 값으로 동결됨).

## 3. 타이포그래피

vanilla-static 규약에 따라 system font stack만 사용한다(외부 폰트 요청 금지). 목표 문장/입력창은 글자 폭을 맞춰 정오답 대조가 쉽도록 system monospace stack을 사용한다.

```
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-family-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
```

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| heading (`h1`, 앱 타이틀) | base | 1.5rem (24px) | 700 | 1.3 |
| 상태 문구 (state live 텍스트) | base | 0.9375rem (15px) | 600 | 1.4 |
| `prompt-text` 문자 | mono | 1.25rem (20px) | 500 | 1.6 |
| `typed-input` | mono | 1.25rem (20px) | 400 | 1.6 |
| `stats-panel` 값 | base | 0.9375rem (15px) | 600 | 1.4 |
| `stats-panel` 라벨 / caption | base | 0.8125rem (13px) | 500 | 1.4 |
| `paste-warning` | base | 0.8125rem (13px) | 600 | 1.4 |
| `restart-button` | base | 0.9375rem (15px) | 600 | 1 |

## 4. 레이아웃

### 4.1 섹션 구조

```
#typing-root.typing-app
├─ h1 (타이틀: "타자 연습기")
├─ p.typing-app__state-live (aria-live="polite") — 상태 문구(§5.2 표 그대로: "대기 중 — 입력을 시작하세요" / "입력 중" / "완료되었습니다")
├─ p#prompt-text — 목표 문장, 문자 단위로 <span class="char--correct|char--incorrect|char--pending">
├─ textarea#typed-input (aria-label="타이핑 연습 입력", rows=2)
├─ p#paste-warning (role="alert") — 기본 숨김(`typing-app__paste-warning--hidden`), 붙여넣기 시도 시에만 노출
├─ div#stats-panel — 진행률 / 정확도 / 경과 시간
└─ button#restart-button.btn-restart (aria-label="다시 시작")
```

- `#paste-warning`은 DOM에 항상 존재하되 기본 상태에서는 `typing-app__paste-warning--hidden`(비-frozen 보조 클래스)으로 시각적으로 숨겨진다. 계획 문서 §4 "paste-warning 노출 규칙"에 따라 붙여넣기 시도 시점에만 노출되며 상태 전이는 일으키지 않는다.
- `#typed-input`은 `done` 상태에서 `disabled`(비활성)이 되며, `restart-button`으로 포커스가 이동한다(계획 문서 §2 상태 전이표).

### 4.2 Spacing

- `#typing-root` 내부 자식 요소(제목-상태문구-prompt-text-입력창-경고-stats-restart 사이) 기준 간격은 전부 `--space-control-gap`(12px) 사용.
- 컨테이너(`#typing-root`) 내부 padding: 24px. 바깥 여백: 최소 16px, 최대 폭 640px, 중앙 정렬.
- `prompt-text` 문자 간 자간(letter-spacing): 0.02em — 문자 단위 정오답 색상을 구분하기 쉽게 함.

### 4.3 Breakpoint 별 동작

| Breakpoint | 동작 |
|---|---|
| 320px ~ 479px | `prompt-text`와 `stats-panel`은 세로로 줄바꿈(`white-space: normal; word-break: break-word`)되며 가로 스크롤이 발생하지 않는다. `stats-panel` 항목(진행률/정확도/경과 시간)은 1열 스택. `restart-button`은 `typed-input`과 동일한 폭으로 늘어난다(`width: 100%`). |
| 480px 이상 | `stats-panel` 항목이 가로 배치(`display:flex; flex-wrap: wrap; gap: var(--space-control-gap)`)로 전환되고, `restart-button`은 콘텐츠 폭에 맞춰 축소된다. |

- 320px 미만 대응은 frozen 계약 범위 밖(비목표) — 320px를 최소 지원 폭으로 간주한다.

## 5. 컴포넌트 명세

### 5.1 App Root (`#typing-root.typing-app`)

- **역할**: 전체 앱 컨테이너.
- **DOM**: `<div id="typing-root" class="typing-app">`.
- **배경**: `--color-bg`. 내부 컨테이너 카드 배경은 `--color-surface`, 테두리 `--color-border`, 모서리 `--radius-control`.

### 5.2 상태 문구 (`.typing-app__state-live`, non-frozen 보조 요소)

- **역할**: `idle`/`typing`/`done` 상태를 색상과 무관하게 텍스트로 노출(스크린리더 포함).
- **DOM**: `<p class="typing-app__state-live" aria-live="polite"><span>{상태 문구}</span></p>`.
- **상태별 문구** (계획 문서 §2 상태 전이표 그대로, 재정의 금지):

| 상태 | 문구 |
|---|---|
| `idle` | "대기 중 — 입력을 시작하세요" |
| `typing` | "입력 중" |
| `done` | "완료되었습니다" |

### 5.3 목표 문장 (`#prompt-text`)

- **역할**: 연습자가 따라 입력할 목표 문장을 문자 단위로 표시하고, 입력 진행에 따라 각 문자에 정오답 클래스를 부여.
- **DOM**: `<p id="prompt-text"><span class="char--pending">첫</span><span class="char--pending">문</span>...</p>` — 최초 렌더 시 전체 문자에 `char--pending`.
- **문자별 상태**:
  - `char--pending`(`--color-char-pending`) — 아직 입력하지 않은 문자(밑줄 없음, 기본 텍스트).
  - `char--correct`(`--color-char-correct`) — 해당 위치에 정확히 일치하는 문자를 입력함.
  - `char--incorrect`(`--color-char-error`) — 해당 위치에 다른 문자를 입력함. 시각 구분을 색상에만 의존하지 않도록 밑줄(`text-decoration: underline wavy`)을 추가로 부여한다(비-frozen 보강 — 저시력/색각이상 사용자 보조).
- **space 문자 표시**: 목표 문장에 공백이 포함되면 `char--pending`/`char--correct`/`char--incorrect` 상태에서도 공백 자체는 그대로 렌더링하되(줄바꿈 대상), 오타 시 식별을 돕기 위해 `char--incorrect` 상태의 공백에는 배경색(`rgba(220,38,38,0.25)`)을 얹어 빈 칸이 아님을 표시한다(비-frozen 보강).

### 5.4 입력 (`#typed-input`)

- **역할**: 연습자의 타이핑 입력을 받는 control.
- **DOM**: `<textarea id="typed-input" aria-label="타이핑 연습 입력" rows="2"></textarea>`.
- **상태**:
  - `idle`/`typing`: 활성(편집 가능), placeholder 없음(빈 값 자체가 idle의 시각 신호).
  - `done`: `disabled` 속성 부여, 배경을 `--color-surface`보다 어둡게(`filter: brightness(0.9)`) 처리해 비활성임을 시각적으로도 표시.
- **인터랙션**: `input` 이벤트마다 `prompt-text` 문자별 클래스를 재평가. Enter keydown은 `preventDefault()`로 무시(값·상태 불변, 계획 문서 §4). `paste` 이벤트는 `preventDefault()`로 차단하고 `paste-warning` 노출(계획 문서 §4). `:focus-visible` 시 `--color-action-primary` 2px outline.

### 5.5 붙여넣기 경고 (`#paste-warning`)

- **역할**: 붙여넣기 시도를 즉시 공지.
- **DOM**: `<p id="paste-warning" role="alert" class="typing-app__paste-warning--hidden">붙여넣기는 사용할 수 없습니다. 직접 입력해 주세요.</p>` — 기본 숨김.
- **노출 규칙**: `paste` 이벤트 발생 시 `typing-app__paste-warning--hidden` 제거(노출), 상태는 시도 시점의 상태(`idle` 또는 `typing`)를 유지한다(상태 전이 없음, 계획 문서 §4). 재노출 트리거(다음 입력/재붙여넣기 등)는 dev 구현 재량이나, 최소한 `restart-button` 클릭 시에는 반드시 숨김으로 복귀한다(계획 문서 §3 재시작 규칙 5번).
- **색상**: `--color-char-error` 텍스트, 좌측 4px 보더(`--color-char-error`) 강조.

### 5.6 진행 지표 (`#stats-panel`)

- **역할**: 진행률/정확도/경과 시간 등 진행 결과를 표시.
- **DOM**:
  ```html
  <div id="stats-panel">
    <div class="typing-app__stat"><span class="typing-app__stat-label">진행</span><span class="typing-app__stat-value">0 / 32</span></div>
    <div class="typing-app__stat"><span class="typing-app__stat-label">정확도</span><span class="typing-app__stat-value">100%</span></div>
    <div class="typing-app__stat"><span class="typing-app__stat-label">경과 시간</span><span class="typing-app__stat-value">0.0초</span></div>
  </div>
  ```
  - `typing-app__stat*` 클래스는 frozen 목록 밖 보조 클래스로, `#stats-panel` id만 정확히 유지하면 내부 구조는 자유롭게 구성할 수 있다.
- **상태**:
  - `idle`: 진행 0 / 전체 길이, 정확도 100%(또는 "—"), 경과 시간 0.0초 — 계획 문서 §3 재시작 규칙 3번의 "초기값(0 또는 빈 상태)"을 그대로 따른다.
  - `typing`: 각 값이 입력에 따라 실시간 갱신.
  - `done`: 최종 값 고정 표시.

### 5.7 다시 시작 버튼 (`#restart-button.btn-restart`)

- **역할**: 모든 상태에서 클릭 시 `idle`로 원자적 초기화(계획 문서 §3).
- **DOM**: `<button type="button" id="restart-button" class="btn-restart" aria-label="다시 시작">다시 시작</button>`.
- **상태**: 모든 상태(`idle`/`typing`/`done`)에서 항상 활성(계획 문서 §2 상태 전이표 — `restart-button`은 매 행에서 "활성").
- **스타일**: 배경 `--color-action-primary`, hover/active `--color-action-primary-hover`, 텍스트 `--color-text-primary`, 모서리 `--radius-control`.
- **인터랙션**: 클릭 또는 Tab 이동 후 Enter(네이티브 버튼 동작)로 재시작 수행. `:focus-visible` 시 `--color-action-primary` 2px outline(오프셋 2px로 배경과 구분).

## 6. dev 구현 가이드

1. **CSS 변수 선언**: `:root`에 §2 표의 12개 토큰(frozen 5개 + designer 보완 7개)과 §3의 `--font-family-base`/`--font-family-mono`를 선언한다. frozen 5개(`--color-char-correct`, `--color-char-error`, `--color-char-pending`, `--color-bg`, `--space-control-gap`) 값은 절대 변경하지 않는다.
2. **DOM id**: `typing-root`, `prompt-text`, `typed-input`, `stats-panel`, `restart-button`, `paste-warning` 6개를 정확히 그대로 사용한다(계획 문서 §6 frozen 목록).
3. **CSS 클래스**: `typing-app`, `char--correct`, `char--incorrect`, `char--pending`, `btn-restart` 5개를 정확히 그대로 사용한다. `typing-app__*` 접두 보조 클래스(상태 문구, stats 항목, paste-warning 숨김 등)는 새로 추가할 수 있으나 위 5개를 대체/재정의하지 않는다.
4. **상태 전이 로직** (계획 문서 §2 상태 전이표를 코드로 그대로 옮긴다):
   - `idle` → 최초 렌더 또는 입력이 모두 삭제된 상태. `typed-input` 값 빈 문자열, `prompt-text`의 모든 문자 `char--pending`, `stats-panel` 초기값, 상태 문구 "대기 중 — 입력을 시작하세요".
   - `typing` → 첫 글자 입력부터 완료 전까지. 입력값 길이만큼 `prompt-text` 문자에 `char--correct`/`char--incorrect`를 순서대로 부여하고 나머지는 `char--pending` 유지. 상태 문구 "입력 중".
   - `done` → 입력 길이가 `prompt-text` 길이에 도달. `typed-input`에 `disabled` 부여, `restart-button`으로 포커스 이동, `stats-panel` 최종값 표시, 상태 문구 "완료되었습니다".
5. **재시작 로직** (계획 문서 §3, 원자적 처리): `restart-button` 클릭 시 ①`typed-input` 값 초기화 + `disabled` 해제 + focus 이동, ②모든 문자 클래스를 `char--pending`으로 리셋, ③`stats-panel`을 초기값으로 리셋, ④상태를 `idle`로 전환 + 문구 갱신, ⑤`paste-warning`이 노출 중이었다면 숨김 처리. 5단계를 한 함수 안에서 순서대로 실행해 중간 상태가 노출되지 않게 한다.
6. **입력 규칙 배선**: `typed-input`의 `keydown`에서 `event.key === "Enter"`이면 `event.preventDefault()`만 하고 아무 것도 갱신하지 않는다. `paste` 이벤트에서 `event.preventDefault()` 후 `paste-warning`의 숨김 클래스만 제거한다(상태 전이 호출 금지).
7. **접근성 배선**: `typed-input`에 `aria-label="타이핑 연습 입력"`, `restart-button`에 `aria-label="다시 시작"`(네이티브 `<button>`이라 Tab/Enter는 기본 지원), `paste-warning`에 `role="alert"`, 상태 문구 컨테이너에 `aria-live="polite"`.
8. **반응형 CSS**: 기본(모바일) 스타일을 320px 기준 1열 스택으로 작성 후 `@media (min-width: 480px)`에서 `#stats-panel`에 `display:flex; flex-wrap: wrap; gap: var(--space-control-gap);` 적용(§4.3).
9. **금지 사항**: frozen 계약에 없는 새 DOM id/class/토큰/상태를 추가하지 않는다. `restart-button`을 어떤 상태에서도 `disabled` 처리하지 않는다(계획 문서 §2 표 — 모든 행에서 활성). `typed-input`은 `done` 상태에서만 `disabled` 처리한다.

## 7. 접근성 (요약 — planner frozen 규칙 그대로)

- `#typed-input`은 `aria-label="타이핑 연습 입력"`을 갖는다.
- `#restart-button`은 `aria-label="다시 시작"`을 갖고 키보드 Tab/Enter로 조작 가능하다(네이티브 `<button>` 사용으로 자동 충족).
- `#paste-warning`은 `role="alert"`로 스크린리더에 즉시 announce된다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트(§5.2)와 접근성 이름으로 노출한다.

## 8. 반응형 (요약 — planner frozen 규칙 그대로)

- 320px 이상: `prompt-text`와 `stats-panel`이 줄바꿈되며 가로 overflow가 발생하지 않는다.

## 9. AC 매핑표 (계획 문서 §5 Acceptance Criteria ↔ UI 요소)

| AC | 요구사항 요약 | 대응 UI 요소 |
|---|---|---|
| AC-1 (상태 전이) | 최초 로드 → idle, 첫 입력 → typing, 완료 → done, 백스페이스 전체 삭제 → idle | `.typing-app__state-live` 문구(§5.2 표) + `#typed-input` 값/‌`disabled` 여부 + `#prompt-text` 문자 클래스 + `#stats-panel` 값 |
| AC-2 (재시작 초기화) | `restart-button` 클릭 → `typed-input` 비워지고 재활성화, `stats-panel`/문자 진행 초기화, idle 전환 | `#restart-button` 클릭 핸들러(§6-5) → `#typed-input`, `#prompt-text` 문자 전체 `char--pending`, `#stats-panel` 초기값, `.typing-app__state-live` |
| AC-3 (Enter 무시) | idle/typing에서 Enter 입력 시 값·상태·기본 동작 불변 | `#typed-input` `keydown` 핸들러의 `event.key === "Enter"` → `preventDefault()`만 수행(§5.4, §6-6) |
| AC-4 (붙여넣기 차단) | idle/typing에서 붙여넣기 시도 시 값 미반영 + `paste-warning` 노출 + 상태 유지 | `#typed-input` `paste` 핸들러 → `preventDefault()` + `#paste-warning`(`role="alert"`) 노출, 상태 전이 없음(§5.5, §6-6) |
| 엣지: done 상태 추가 입력 무시 | `typed-input`이 `disabled`라 입력 자체가 불가 | §5.4 `done` 상태의 `disabled` 속성 |
| 엣지: `prompt-text` 빈 문자열 없음 | 항상 비어 있지 않은 목표 문장이 주어짐을 전제 | §5.3 최초 렌더 시 전체 문자 `char--pending`으로 채워짐(빈 문장 케이스는 시안 범위 밖) |

## 10. mockup 참조

- 시각 mockup: [`docs/design/mockups/BF-2178-typing.html`](../mockups/BF-2178-typing.html)
- mockup은 `idle`/`typing`/`done` 3개 상태와 `char--correct`/`char--incorrect`/`char--pending` 3가지 문자 하이라이트, `paste-warning` 노출 상태, 320px/480px 반응형 줄바꿈을 정적으로 시각화한다(placeholder 목표 문장·통계 값 포함, 실제 입력 이벤트/타이머 로직 없음). 상태 전환은 mockup 전용 데모 섹션(3개 상태를 나란히 정적 스냅샷으로 배치)으로 시연하며, 실제 앱 코드가 아니고 dev의 픽셀 단위 구현 의무는 없다.

## 11. Self-critique (PR commit 직전 점검)

1. **AC 매핑** — §9에서 계획 문서 AC-1~AC-4 및 엣지 케이스 2건 전부 UI 요소로 매핑 완료.
2. **dev 구현 가이드** — §6에 상태 전이 로직·재시작 5단계·입력 규칙 배선·id/class 목록·반응형 breakpoint·금지 사항을 단계별로 명시.
3. **기존 요소 보존** — 본 topic은 신규 module(`typing`)이며 기존 산출물을 대체하지 않음(additive). 계획 문서(§6 UI 계약)의 DOM id/class/토큰/상태/접근성/반응형 규칙을 값 그대로 옮겼으며 재정의하지 않음.
4. **컴포넌트 매핑** — §5에서 App Root / 상태 문구 / 목표 문장 / 입력 / 붙여넣기 경고 / 진행 지표 / 다시 시작 버튼 7개 컴포넌트 각각의 DOM·상태·인터랙션·접근성을 명시.
5. **모호함 flag** — 아래 3건은 계획 문서에 명시되지 않아 designer가 판단해 보완한 사항:
   - **`char--error`/`char--pending` 색상 대비**: frozen 토큰 `--color-char-error`(`#dc2626`)와 `--color-char-pending`(`#6b7280`)은 frozen 배경(`#0f172a`)과의 대비가 약 3.7:1로 일반 텍스트 AA(4.5:1) 기준에는 못 미친다. 토큰 값은 변경할 수 없으므로, `prompt-text` 문자 크기를 20px(large-text 기준 3:1 통과)로 지정하고 `char--incorrect`에 밑줄을 추가하는 방식으로 보완했다(§2, §5.3). dev/reviewer는 이 해석이 의도와 다르면 PR 코멘트로 정정 요청 바란다.
   - **`stats-panel` 세부 지표**: 계획 문서는 "정확도, 소요 시간 등"으로 예시만 제시하고 정확한 지표 목록을 동결하지 않았다. designer는 진행률(`n/전체`), 정확도(%), 경과 시간(초) 3개 지표로 구체화했다(§5.6). dev가 다른 지표를 추가/대체해도 frozen 계약 위반은 아니다(`#stats-panel` id만 유지하면 됨).
   - **`typed-input` 엘리먼트 종류**: 계획 문서는 DOM id만 동결하고 `<input>` vs `<textarea>` 태그를 지정하지 않았다. designer는 목표 문장이 여러 줄로 줄바꿈될 수 있는 §4.3 반응형 요구를 고려해 `<textarea rows="2">`를 제안했다(§5.4). dev가 `<input type="text">`로 구현해도 frozen 계약(id/aria-label) 위반은 아니며, 그 경우 §4.3 줄바꿈 요구는 `typed-input`이 아닌 `prompt-text`에만 적용됨을 유의한다.
