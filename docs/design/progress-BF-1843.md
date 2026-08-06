# 진행 막대 시각 명세 (BF-1844)

- **Jira**: BF-1844 (designer task) / Epic BF-1843 / plan BF-1846
- **작성자 역할**: designer (이디자인)
- **문서 성격**: planner가 동결한 UI 계약(ui-contract@v1)을 재정의 없이 시각 명세로 옮긴 산출물
- **상태**: active
- **mockup 참조**: [`docs/design/progress-mockup.html`](./progress-mockup.html)

> 본 문서는 [`docs/plans/BF-1843/implementation-plan.md`](../plans/BF-1843/implementation-plan.md)의
> 동결 UI 계약을 시각 명세로 렌더링한 것입니다. selector·CSS class·design token·상태·접근성·반응형
> 계약은 **frozen blueprint가 유일한 권위**이며 본 문서는 이를 **변경·재정의하지 않습니다**.
> developer(BF-1845)는 이 명세를 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없고, 동결
> selector/token/상태만 그대로 구현합니다.

---

## 1. 시안 개요

### 변경 범위
버튼으로 진행률을 증가시키고 초기화할 수 있는 **진행 막대(progress bar) 데모** 페이지의 시각 시안.
단일 컴포넌트(진행 막대 + 2개 control)로 구성되며 백엔드·데이터·인증이 없는 vanilla static 데모다.

### 사용자 경험 목표
- 현재 진행률(0~100%)을 **막대 채움 폭**과 **숫자 텍스트** 두 채널로 동시에 인지한다.
- 상태(`idle` / `progressing` / `complete`)를 **색상만이 아니라 화면 텍스트**로 구분한다 —
  색각 이상 사용자도 상태명을 읽고 판단할 수 있어야 한다.
- 키보드·스크린 리더 사용자가 진행 증가·초기화를 동등하게 조작하고 현재 상태를 인지한다.
- 320px 이상 어떤 폭에서도 가로 overflow 없이 컨테이너 폭에 맞춰 막대가 늘어난다.

---

## 2. 컬러 팔레트

> 아래 진행 막대 관련 4개 토큰은 **동결값**이다(ui-contract@v1 §4.5). 값 수정 금지.

| 역할 | CSS 변수 | HEX | 용도 |
|------|----------|-----|------|
| progress fill | `--color-progress-fill` | `#2563eb` | 진행 막대 채움(파랑) |
| progress track | `--color-progress-track` | `#e5e7eb` | 진행 막대 트랙(배경 회색) |

**mockup 보조 색상**(동결 계약 아님 — 시각화 편의용, dev 구현 강제 아님):

| 역할 | HEX | 용도 |
|------|-----|------|
| page background | `#f8fafc` | 페이지 배경 |
| surface | `#ffffff` | 카드 표면 |
| text primary | `#0f172a` | 본문/라벨 텍스트 |
| text muted | `#475569` | 보조 설명 텍스트 |
| complete accent | `#16a34a` | 완료 상태 강조(텍스트/배지, 색상 단독 의존 금지) |
| control bg | `#2563eb` | primary control 배경 |
| control text | `#ffffff` | control 라벨 |

> 상태 구분은 색상에 **의존하지 않는다**. `complete`의 녹색은 보조 신호일 뿐이며, 상태명
> 텍스트("완료")가 항상 함께 노출된다(§6 접근성).

---

## 3. 타이포그래피

외부 의존성 0건 — system font stack만 사용한다.

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Apple SD Gothic Neo",
             "Noto Sans KR", sans-serif;
```

| 역할 | size | weight | line-height | 비고 |
|------|------|--------|-------------|------|
| 페이지 heading | 24px | 700 | 1.3 | 데모 제목 |
| 진행률 라벨(`progress__label`) | 16px | 600 | 1.4 | "60% · 진행 중" 형태 |
| control 라벨 | 15px | 600 | 1.2 | 버튼 텍스트 |
| 보조 설명(caption) | 13px | 400 | 1.5 | muted 안내 문구 |

---

## 4. 레이아웃

### 섹션 구조
```
#progress-root (.progress 컨테이너 카드)
├─ 제목 + 보조 설명
├─ #progress-bar (.progress__track, role="progressbar")
│   └─ #progress-fill (.progress__fill)
├─ #progress-label (.progress__label) — "0% · 대기" 등
└─ control 행
    ├─ #progress-increment (.progress__control)
    └─ #progress-reset (.progress__control)
```

### spacing
- 카드 padding: 24px
- 카드 max-width: 480px, 중앙 정렬
- 진행 막대 ↔ 라벨 간격: 12px
- 라벨 ↔ control 행 간격: 20px
- control 간 gap: 12px

### 진행 막대 치수(동결 토큰)
| 변수 | 값 | 의미 |
|------|----|------|
| `--progress-height` | `24px` | 트랙/채움 높이 |
| `--progress-radius` | `12px` | 트랙/채움 모서리 반경(pill 형태) |

- 트랙 폭: `width: 100%` — 컨테이너 폭에 맞춰 늘어난다.
- 채움 폭: `width`를 진행률 %로 설정(`0% ~ 100%`), 트랙 내부에서 좌→우로 채워진다.

### breakpoint 별 동작
- **≥ 480px**: 카드 max-width 480px, control 행은 가로 배치.
- **320px ~ 479px**: 카드가 뷰포트 폭(- 좌우 여백)에 맞게 축소. 진행 막대는 100% 유지.
  control 행은 필요 시 줄바꿈(`flex-wrap: wrap`)되어 가로 overflow가 발생하지 않는다.
- **공통**: `box-sizing: border-box`, `max-width: 100%`로 320px에서 content overflow 없음(AC-6).

---

## 5. 컴포넌트 명세

> DOM ID / CSS class는 **동결값**(ui-contract@v1 §4.2~4.3). 그대로 사용한다.

### 5.1 진행 막대 루트 — `#progress-root` / `.progress`
- 데모 전체를 감싸는 카드 컨테이너.
- 상태를 나타내는 hook을 둘 수 있으나(예: `data-status`) 계약상 필수는 아니다. 상태의
  **정본은 화면 텍스트 + `aria-valuenow`** 이다.

### 5.2 진행 막대 — `#progress-bar` / `.progress__track`
| 항목 | 값 |
|------|----|
| role | `progressbar` (동결) |
| aria-valuemin | `0` (동결) |
| aria-valuemax | `100` (동결) |
| aria-valuenow | 현재 진행률(0~100 정수) — **실시간 갱신**(동결) |
| 배경색 | `var(--color-progress-track)` |
| 높이 | `var(--progress-height)` |
| 모서리 | `var(--progress-radius)` |

### 5.3 채움 — `#progress-fill` / `.progress__fill`
| 항목 | 값 |
|------|----|
| 배경색 | `var(--color-progress-fill)` |
| width | 진행률 %(예: `60%`) — value 변경 시 갱신 |
| 높이 | 트랙과 동일(`var(--progress-height)`) |
| 모서리 | `var(--progress-radius)` |

### 5.4 라벨 — `#progress-label` / `.progress__label`
- 진행률 숫자 + 상태명을 **함께** 노출한다. 상태별 화면 텍스트(§7):
  - idle → `0% · 대기`
  - progressing → `<value>% · 진행 중`
  - complete → `100% · 완료`
- 이 텍스트는 색상과 **독립적으로** 상태를 구분한다(AC-5).

### 5.5 진행 증가 control — `#progress-increment` / `.progress__control`
| 상태 | 인터랙션 |
|------|----------|
| 기본 | 클릭/Enter/Space 시 진행률을 일정 단계 증가(정본 단계 값은 developer 결정, plan §5 clamp 규칙 준수) |
| hover | 배경 약간 어둡게(시각 피드백) |
| focus | 뚜렷한 focus ring(키보드 가시성) |
| complete 도달 후 | 계속 눌러도 100 초과 금지(clamp), 상태 `complete` 유지 |

- 접근성: 명시적 `aria-label`(예: `"진행률 증가"`), 키보드 조작 가능(동결).

### 5.6 초기화 control — `#progress-reset` / `.progress__control`
| 상태 | 인터랙션 |
|------|----------|
| 기본 | 클릭/Enter/Space 시 진행률 0, 상태 `idle`로 복귀 |
| hover | 배경/테두리 강조 |
| focus | 뚜렷한 focus ring |
| idle에서 누름 | idle/0 유지, 오류 없이 idempotent(plan E2) |

- 접근성: 명시적 `aria-label`(예: `"진행률 초기화"`), 키보드 조작 가능(동결).
- 시각 위계: secondary 스타일(outline) 권장 — increment(primary)와 구분. 단, 이는 권장이며
  동결 계약 아님.

---

## 6. 접근성 (동결 — ui-contract@v1 §4.6)

- `#progress-bar`는 `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`,
  실시간 `aria-valuenow`를 갖는다.
- `#progress-increment` / `#progress-reset`는 명시적 `aria-label`을 가지며 키보드로 조작 가능하다.
- **모든 상태는 색상만으로 구분하지 않는다** — 상태명("대기"/"진행 중"/"완료")을
  화면 텍스트와 접근성 이름으로 노출한다.
- `aria-valuenow`와 화면 텍스트 숫자는 항상 동기화된다(plan E6).
- focus 표시는 마우스·키보드 모두에서 시인 가능(focus ring, `:focus-visible` 권장).

---

## 7. 상태별 화면 표현 (동결 상태 — ui-contract@v1 §4.4)

| 상태 | 조건 | 화면 텍스트(`#progress-label`) | aria-valuenow | 채움 폭 | 보조 시각 |
|------|------|-------------------------------|---------------|---------|-----------|
| `idle` | value = 0 | `0% · 대기` | 0 | 0% | 트랙만 표시 |
| `progressing` | 0 < value < 100 | `<value>% · 진행 중` | value | value% | 파랑 채움 |
| `complete` | value = 100 | `100% · 완료` | 100 | 100% | 파랑 채움 + 완료 배지(녹색, 텍스트 동반) |

> 색상(파랑 채움 / 녹색 완료)은 **보조 신호**다. 상태 판단의 정본은 **상태명 텍스트**이며,
> 색을 제거해도 "대기/진행 중/완료"를 읽어 상태를 알 수 있어야 한다.

---

## 8. dev 구현 가이드 (developer BF-1845 참조)

> developer는 `iteration-check2/progress.html` + `iteration-check2/tests/progress.test.js`를
> 구현한다(파일 소유자: developer). 아래는 참조 가이드이며 동결 계약 값은 그대로 사용한다.

1. **CSS 변수 정의**: `:root`에 동결 토큰 4개를 그대로 선언한다.
   ```css
   :root {
     --color-progress-fill: #2563eb;
     --color-progress-track: #e5e7eb;
     --progress-height: 24px;
     --progress-radius: 12px;
   }
   ```
2. **마크업**: §4 섹션 구조대로 동결 DOM ID + CSS class를 붙인다.
   `#progress-bar`에 `role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"`.
3. **상태 파생**: 클라이언트 상태 `{ value, status }`. `value`는 0~100 clamp,
   `status`는 value에서 파생(`0→idle`, `0<v<100→progressing`, `100→complete`) — plan §5.
4. **갱신 함수**: value 변경 시 (a) `#progress-fill`의 `width`를 `value%`로, (b) `#progress-bar`의
   `aria-valuenow`를 value로, (c) `#progress-label` 텍스트를 §7 표대로 동기화한다(plan E6).
5. **control 핸들러**: increment는 단계 증가 후 clamp, reset은 0/idle 복귀. 둘 다 클릭과
   키보드(Enter/Space)에서 동일 동작(plan E4). `aria-label` 부여.
6. **반응형**: 컨테이너 `box-sizing: border-box; max-width: 100%`, 진행 막대 `width: 100%`,
   control 행 `flex-wrap: wrap`. 320px에서 가로 overflow 없음 검증(AC-6).
7. **테스트(AC-1~AC-6)**: 초기 aria-valuenow=0/idle, increment 시 값·폭·상태 갱신,
   100 clamp·complete, reset 복귀, aria 속성/label 존재, 320px overflow 없음.

> 권장 클래스/변수명은 위 동결값이 전부다. 추가 클래스는 dev 재량이나 동결 selector는
> 변경하지 않는다.

---

## 9. mockup 참조

- 파일: [`docs/design/progress-mockup.html`](./progress-mockup.html)
- 내용: 동결 토큰·selector로 구성한 정적 mockup. 상단에 동결 DOM ID를 그대로 쓴
  **canonical 진행 막대**(progressing 예시)를, 하단 "상태 갤러리"에 `idle` / `progressing` /
  `complete` 세 상태를 각 상태명 텍스트와 함께 시각화한다.
- 정적 mockup이므로 JS 상호작용은 없다(런타임 HTML/CSS/JS는 developer 산출물).
  hover/focus는 CSS로 표현하고, 상태 전이는 갤러리 세 카드로 시각 비교한다.

---

## Self-critique

PR 직전 자기 점검(designer-spec-self-critique 5항목):

1. **AC 매핑**: AC-1(idle 0%/대기) §7, AC-2(progressing 폭·aria 갱신) §5.3/§8-4,
   AC-3(complete 100 clamp·완료 텍스트) §5.5/§7, AC-4(reset idle 복귀) §5.6,
   AC-5(role/aria/label/색 비의존) §6, AC-6(320px overflow 없음) §4/§8-6 — 6개 모두 매핑됨. ✅
2. **dev 구현 가이드**: §8에 CSS 변수·마크업·상태 파생·갱신·핸들러·반응형·테스트 7단계 명시. ✅
3. **기존 요소 보존**: 신규 데모로 기존 페이지/토큰 재배정 없음. additive 정책 준수, 동결
   selector/token 변경 없음. ✅
4. **컴포넌트 매핑**: 동결 DOM ID 6개(root/bar/fill/label/increment/reset)·CSS class 5개·
   상태 3개 모두 §5/§7에 1:1 매핑. ✅
5. **모호함 flag**: increment **단계 값**은 계약에 미지정 → developer가 clamp 규칙(plan §5)
   내에서 결정하도록 명시(§5.5). complete 녹색·보조 배경 등 mockup 보조 색상은 동결 계약이
   아님을 §2에 명시하여 dev 강제 오인 방지. 그 외 selector/token/상태는 동결값 그대로. ✅
