# 뽀모도로 타이머 디자인 명세 (BF-2006 / Epic BF-2005)

> 이 문서는 `docs/plans/BF-2005/implementation-plan.md`가 옮긴 frozen `ui-contract@v1`을
> 시각 명세로 구체화한 것이다. §2~§5의 selector·토큰·상태·접근성·반응형 값은 frozen 계약을
> 그대로 사용하며 새로 정의하거나 이름을 바꾸지 않는다. 참조 mockup:
> `docs/design/pomodoro-BF-2005-mockup.html`.

## 1. 시안 개요

- **변경 범위**: `pomodoro/` 앱의 새 타이머 UI(§7 frozen 계약 기준)를 위한 레이아웃·컬러·타이포·
  상태별 시각 표현을 정의한다. 기존 `pomodoro/` 레거시(BF-430/432, `main.js` / `storage.js` /
  `styles.css` / `timer.js`)와는 별개이며, developer(BF-2007)가 frozen 계약대로 `pomodoro/index.html`
  등 6개 파일을 새로 소유·구현한다.
- **사용자 경험 목표**:
  - 집중(focus) / 휴식(break) 상태를 배경색만으로도 즉시 구분할 수 있게 하되, 색맹·저시력
    사용자를 위해 상태 텍스트(`status-label`)로도 항상 동일 정보를 노출한다(§7.6).
  - 큰 숫자(`timer-display`)와 원형 진행 표시(`progress-ring`)로 "지금 얼마나 남았는지"를
    한눈에 파악하게 한다.
  - 시작 / 일시정지 / 리셋 3개 컨트롤은 항상 손쉽게 탭 가능한 크기(최소 44px)를 유지해
    모바일에서도 오조작이 없게 한다.
  - 설정값 오류(범위 밖 입력)는 입력을 막지 않되 명확한 인라인 오류로 알리고, 이전 유효
    값으로 계속 타이머를 사용할 수 있게 한다(§AC-9).

## 2. 컬러 팔레트 (frozen 토큰 그대로 — 재정의 금지)

| 역할 | CSS 변수 | HEX | 사용처 |
|---|---|---|---|
| Focus 배경 | `--color-focus-bg` | `#1f2937` | `.pomodoro-app--focus` 배경 |
| Break 배경 | `--color-break-bg` | `#065f46` | `.pomodoro-app--break` 배경 |
| 강조(Accent) | `--color-accent` | `#f97316` | `progress-ring` 진행 arc, `control-button--primary` 배경, 포커스 링 |
| 오류 | `--color-error` | `#dc2626` | `settings-error--visible` 텍스트/아이콘 |
| 본문 텍스트 | `--color-text` | `#f9fafb` | 카드 내부 모든 텍스트 기본색 |

**보조 토큰 (frozen 목록에 없음 — additive, 재정의 아님)**

frozen 계약은 idle 상태 배경과 트랙/보조 텍스트 색을 지정하지 않는다. 계약을 침범하지
않는 범위에서 아래 보조 토큰을 추가로 정의해 idle 기본 표면과 `progress-ring` 미진행
트랙을 표현한다.

| 역할 | CSS 변수 | 값 | 사용처 |
|---|---|---|---|
| Idle 배경 | `--color-idle-bg` | `#111827` | `.pomodoro-app`(modifier 없음, idle) 배경 |
| 진행 트랙 | `--color-track` | `rgba(249,250,251,.14)` | `progress-ring`의 미진행 트랙 원 |
| 보조 텍스트 | `--color-muted-text` | `rgba(249,250,251,.64)` | 캡션, 힌트, 라벨 보조 텍스트 |
| 카드 테두리 | `--color-border` | `rgba(249,250,251,.10)` | 카드/입력 테두리 |

## 3. 타이포그래피

frozen 계약은 폰트를 지정하지 않는다. system font 스택으로 외부 의존성 없이 구현한다
(`vanilla-static` 규약과 무관하게 이 리포는 CDN 폰트 로드 없이 시스템 폰트를 사용).

| 용도 | font-family | size | weight | line-height | 대상 |
|---|---|---|---|---|---|
| Heading (타이머 숫자) | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` (tabular numerals) | `clamp(40px, 12vw, 64px)` | 700 | 1.0 | `#timer-display` |
| Body | `-apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif` | 16px | 500(버튼) / 400(본문) | 1.4 | 버튼 라벨, `status-label`, 입력 라벨 |
| Caption | 동일 sans stack | 13px | 400 | 1.3 | `session-count` 보조 문구, 힌트, `settings-error` |

- 타이머 숫자는 반드시 등폭(tabular numerals)을 사용해 초 단위 갱신 시 자릿수 흔들림이
  없게 한다.
- 모든 텍스트 색은 `--color-text` 또는 `--color-muted-text` 중 하나만 사용한다.

## 4. 레이아웃

### 4.1 구조 (mockup 1:1 반영)

```
.pomodoro-app (#pomodoro-app)
├─ .progress-ring (#progress-ring)         // SVG 원형 진행 표시, 중앙에 timer-display 오버레이
│    └─ .timer-display (#timer-display)    // "MM:SS"
├─ .status-label (#status-label)           // 상태 텍스트, aria-live="polite"
├─ 세션 카운트 문구 (#session-count 포함)
├─ .controls
│    ├─ .control-button.control-button--primary (#start-button)
│    ├─ .control-button (#pause-button)
│    └─ .control-button (#reset-button)
└─ .settings
     ├─ label + input (#focus-duration-input)
     ├─ label + input (#break-duration-input)
     └─ .settings-error (#settings-error)  // 기본 숨김, 오류 시 --visible 추가
```

- 카드 최대 너비: `min(420px, 100% - 32px)`, 카드 내부 padding `24px`(≥480px) / `16px`(<480px).
- 세로 stack, 요소 간 기본 gap `20px`. `.controls` 내부 버튼 간격은 frozen 토큰
  `--space-control-gap: 16px`을 그대로 사용한다.
- `progress-ring`은 정사각형 SVG(기본 220px, 좁은 화면에서 `clamp(160px, 55vw, 220px)`)이며
  `timer-display`를 절대 위치로 중앙 오버레이한다.

### 4.2 Breakpoint 동작 (frozen §7.7 그대로)

| 조건 | 동작 |
|---|---|
| ≥480px | `.controls`는 가로 배치(`flex-direction: row`), 버튼 3개가 한 줄 |
| <480px | `.controls`는 세로 stack(`flex-direction: column`), 각 `.control-button`은 `width: 100%`, `min-height: 44px` 유지 |
| ≥320px 전 구간 | 카드/버튼/입력 어디서도 가로 overflow가 발생하지 않는다(`box-sizing: border-box`, 텍스트 `clamp()` 사용) |

## 5. 컴포넌트 명세

### 5.1 `#pomodoro-app` (`.pomodoro-app`)

- **props 없음** (단일 인스턴스, 최상위 컨테이너).
- **상태 modifier**: 클래스로만 표현, 별도 `paused` 전용 modifier는 없음(frozen 계약).
  | 상태 | 적용 클래스 | 배경 |
  |---|---|---|
  | idle | modifier 없음 | `--color-idle-bg` |
  | focus | `.pomodoro-app--focus` | `--color-focus-bg` |
  | break | `.pomodoro-app--break` | `--color-break-bg` |
  | paused (focus 중 정지) | `.pomodoro-app--focus` 유지 | `--color-focus-bg` |
  | paused (break 중 정지) | `.pomodoro-app--break` 유지 | `--color-break-bg` |
- **인터랙션**: 없음(컨테이너). 상태 변경은 자식 요소 텍스트/클래스로만 반영.

### 5.2 `#timer-display` (`.timer-display`)

- **내용**: `formatTime(remainingSeconds)` 결과(`MM:SS`), 순수 텍스트.
- **상태**: 값 변경만 있을 뿐 자체 modifier 없음. `paused`에서는 갱신이 멈추고 마지막 값 유지.
- **접근성**: 상위 `role="timer"`, `aria-live="off"`(초 단위 갱신은 스크린리더에 매초 알리지
  않음 — 상태 전환 알림은 `status-label`이 전담).

### 5.3 `#progress-ring` (`.progress-ring`)

- **props**: `percent`(0~100, 현재 모드 duration 대비 진행률 = `1 - remainingSeconds / (mode분*60)`).
- **시각**: SVG `<circle>` 2개(트랙 `--color-track`, 진행 arc `--color-accent`), `stroke-dasharray`/
  `stroke-dashoffset`로 진행률 표현. 원 중심에 `#timer-display` 오버레이.
- **상태**: idle/reset 직후 `percent = 0`(트랙만 보임). focus/break 진행 중 실시간 증가.
  paused는 정지 시점 percent 고정.

### 5.4 `#status-label` (`.status-label`)

- **내용**(상태별 고정 문구, 색상에 의존하지 않고 텍스트로 상태 전달 — §7.6):
  | 상태 | 텍스트 |
  |---|---|
  | idle | "대기 중" |
  | focus | "집중 중" |
  | break | "휴식 중" |
  | paused(focus) | "일시정지됨 · 집중" |
  | paused(break) | "일시정지됨 · 휴식" |
- **접근성**: `aria-live="polite"` — 상태 전환마다 스크린리더가 텍스트 변경을 읽는다.

### 5.5 `#session-count`

- **내용**: 완료한 focus 세션 수(정수, `0` 이상). "세션 완료: N" 형태 문구의 일부로 렌더링.
- **상태**: `focus → break` 전이에서만 +1(§AC-6). reset 시 0으로 복귀(§AC-5).

### 5.6 컨트롤 버튼 3종 (`.control-button`)

| id | 클래스 | 라벨(텍스트) | `aria-label` | idle | focus/break | paused |
|---|---|---|---|---|---|---|
| `#start-button` | `.control-button.control-button--primary` | "시작" | "시작" | 활성 | 비활성(disabled) | 활성("재개"와 동일 동작) |
| `#pause-button` | `.control-button` | "일시정지" | "일시정지" | 비활성 | 활성 | 비활성 |
| `#reset-button` | `.control-button` | "리셋" | "리셋" | 활성(no-op이어도 항상 사용 가능) | 활성 | 활성 |

- **시각**: `--color-accent` 배경(primary) / 투명+테두리(secondary), `border-radius: var(--radius-button)`,
  `min-height: 44px`, `padding: 12px 20px`.
- **인터랙션**: 마우스 클릭 + Tab 포커스 + Enter/Space 키 활성화(§7.6). `:focus-visible`에
  `--color-accent` 2px outline.
- **disabled 시각**: `opacity: .4`, `cursor: not-allowed`, 텍스트 대비 유지(색만으로 구분하지
  않도록 버튼 텍스트 자체는 그대로 노출).

### 5.7 설정 입력 2종 (`#focus-duration-input`, `#break-duration-input`)

- **props**: `value`(1~60 정수), `disabled`(idle이 아니면 `true`).
- **연결 라벨**: 각각 `<label for="focus-duration-input">집중 시간(분)</label>` /
  `<label for="break-duration-input">휴식 시간(분)</label>`.
- **오류 연결**: 두 입력 모두 `aria-describedby="settings-error"` 고정 참조(§AC-9).
- **잠금 상태**(§AC-10): `focus`/`break`/`paused`에서 `disabled` 속성 부여, 시각적으로도
  `opacity: .5`.

### 5.8 `#settings-error` (`.settings-error`)

- **기본**: 클래스 `.settings-error`만 있고 `display: none`(숨김).
- **오류 시**: `.settings-error--visible` 추가 → `display: block`, `color: var(--color-error)`,
  좌측 4px 오류 컬러 accent bar. 텍스트 예: "1~60 사이의 정수를 입력해 주세요."
- **역할**: `role="alert"`로 스크린리더에 즉시 통지.

## 6. dev 구현 가이드 (developer BF-2007용)

1. `pomodoro/style.css`에 §2 표의 CSS 변수를 `:root`에 그대로 선언한다. **frozen 7개 토큰
   이름/값은 변경 금지**, 보조 토큰(idle/track/muted/border)은 이름 그대로 가져다 써도 되고
   다른 이름으로 대체해도 무방하다(비-frozen).
2. `pomodoro/index.html`은 본 mockup의 §"기본 구조" 섹션(`#pomodoro-app` 이하)과 **동일한
   DOM 트리 및 id/class**를 사용한다. 순서・중첩 구조를 바꾸지 않는다.
3. `pomodoro/pomodoro.js`에서 `tick(state)` / `formatTime(seconds)` 순수 함수(계획서 §5)로
   상태를 갱신하고, 별도의 렌더 함수가:
   - `#timer-display.textContent = formatTime(state.remainingSeconds)`
   - `#progress-ring`의 진행 원 `stroke-dashoffset` 갱신
   - `#status-label.textContent`를 §5.4 표대로 갱신
   - `#pomodoro-app`의 `pomodoro-app--focus` / `pomodoro-app--break` 클래스 토글(§7.3 규칙 그대로)
   - `#session-count` 텍스트 갱신
   을 담당한다(관심사 분리 — 순수 함수는 DOM을 모른다).
4. 버튼 활성/비활성은 §5.6 표를 그대로 따르되, **`#reset-button`은 모든 상태에서 항상
   활성화**(frozen invariant, §AC-5) — 이 규칙만은 예외 없이 지킨다.
5. 입력 검증은 §6(계획서) 표를 그대로 구현: 유효하지 않으면 `state`에 반영하지 않고
   `#settings-error`에 `settings-error--visible` 클래스만 토글한다.
6. 반응형은 `max-width: 480px` 미디어쿼리 하나로 `.controls`를 `flex-direction: column`
   전환하면 충분하다(§4.2).
7. 색으로만 상태를 구분하지 말 것 — `status-label` 텍스트 갱신을 배경색 전환과 **항상 같은
   시점에** 수행한다(§AC-11).

## 7. mockup 참조

시각 mockup: [`docs/design/pomodoro-BF-2005-mockup.html`](./pomodoro-BF-2005-mockup.html)

mockup은 아래 5개 패널로 구성된다.

1. **기본 구조 (idle)** — frozen id 전체를 실제로 부여한 단일 인스턴스. `pomodoro/index.html`이
   그대로 참조할 정본(canonical) DOM.
2. **상태 갤러리** — focus / break / paused(focus) 3개 시각 스냅샷. 갤러리 항목은 HTML
   유효성(id 유일성)을 지키기 위해 id에 `-focus` / `-break` / `-paused` 접미사를 붙인
   **복제본**이며, 클래스명은 접미사 없이 frozen 이름 그대로 사용한다.
3. **설정 오류 상태** — `settings-error--visible` 적용 예시.

패널 구획, 안내 텍스트, 접미사가 붙은 갤러리 id는 mockup 전용 장치이며 frozen 계약이 아니다
(developer가 그대로 옮길 대상이 아님). §"기본 구조" 패널만 `pomodoro/index.html`의 구현
기준이다.

## 8. AC 매핑 표

| AC | 요약 | mockup 반영 |
|---|---|---|
| AC-1 | idle 기본 상태(25:00, session 0) | "기본 구조" 패널 — `#timer-display`="25:00", `#session-count`="0", `#status-label`="대기 중" |
| AC-2 | idle → focus 전이 시 `pomodoro-app--focus` + 카운트다운 | "상태 갤러리 · focus" 패널 — `.pomodoro-app--focus` 배경, 진행 중 시각(progress-ring arc) |
| AC-3 | focus/break → paused, 배경 유지 | "상태 갤러리 · paused" 패널 — `.pomodoro-app--focus` 유지 + `status-label`="일시정지됨 · 집중" |
| AC-4 | paused → 이전 모드로 재개 | §5.6 표에 `start-button`이 paused에서도 활성(재개 동작)임을 명시 |
| AC-5 | 리셋 시 idle 복귀, 카운트/진행 초기화, start-button 재사용 가능 | §5.6/§5.3에 리셋 후 percent=0, `#session-count`=0 규칙 명시, `#reset-button` 항상 활성 |
| AC-6 | focus 완료 → break, session +1 | "상태 갤러리 · break" 패널 — `#session-count`="1"로 표기해 증가 반영 시각화 |
| AC-7 | break 완료 → focus, session 불변 | §5.5 규칙 텍스트로 명시("focus→break 전이에서만 +1") |
| AC-8 | 유효 입력(1~60) 즉시 반영, 오류 숨김 | "기본 구조" 패널의 입력 필드 기본 상태(`settings-error` 숨김) |
| AC-9 | 범위 밖/비정상 입력 → 오류 표시, 이전 값 유지 | "설정 오류 상태" 패널 — `settings-error--visible` + 오류 문구 |
| AC-10 | 실행 중 입력 비활성화 | "상태 갤러리" 각 패널에서 입력 `disabled` + `opacity:.5` 시각 적용 |
| AC-11 | 상태 텍스트로 전환 노출(색 의존 금지) | §5.4 상태별 `status-label` 문구 표, 모든 패널에 텍스트 동반 |
| AC-12 | 480px 미만 세로 stack, 44px 탭 영역, 320px 이상 overflow 없음 | §4.2 표 + mockup CSS 미디어쿼리(`max-width:480px`) |
