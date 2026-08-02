# 랭킹 등록/보드 시각 명세 (BF-1549)

> designer 산출물 (BF-1549). 이 문서는 planner 의 **frozen blueprint**
> (`ui-contract@v1`, `docs/plans/snake-ranking-plan-BF-1548.md` §6) 를 **재정의하지 않고**
> 시각 명세로 구체화한다. frozen selector·token·상태 텍스트·접근성·반응형 계약은 그대로
> 반영하며, 새 selector/token/상태/파일을 **추가·변경하지 않는다**.
> developer(BF-1550) 는 본 문서를 시각 handoff 계약으로 참조한다.

---

## 1. 시안 개요

- **변경 범위 (additive)**: 게임 **종료 화면(`game-over`) 오버레이**에, 기존 최고 기록
  보드(`#snake-highscore-board`, BF-1513) **아래**로 랭킹 등록/조회 보드를 **추가**한다.
  기존 오버레이·최고 기록 보드·게임 캔버스·selector 는 하나도 손대지 않는다.
- **사용자 경험 목표**
  1. 게임이 끝나면 상위 랭킹(상위 10)이 즉시 보드에 뜬다 (별도 조작 없이 조회).
  2. 닉네임 한 칸 + "랭킹 등록" 버튼 하나로 **최소 마찰** 등록 흐름을 제공한다.
  3. 등록 진행/성공/실패를 **색상이 아니라 화면 텍스트**로 분명히 알린다
     (`role="status"` / `aria-live="polite"`).
  4. 랭킹 서버가 죽어도 **게임은 계속** — 실패는 error 텍스트로만 노출하고 게임 흐름을
     막지 않는다.
- **비주얼 톤**: 기존 네온-스네이크 오버레이(`.overlay__panel`, 네온 그린 글로우)와
  동일한 다크·네온 그린 무드. 랭킹 강조색은 기존 데모의 `--neon-primary`(#39ff14)와
  동일한 네온 그린으로, 최고 기록 보드와 시각적으로 한 계열을 이룬다.
- **frozen 계약 준수**: 아래 명세의 selector·상태 텍스트·design token·접근성 속성·반응형
  규칙은 planner frozen 값의 **그대로 반영**이다. designer 는 이를 **재정의하지 않는다**.

---

## 2. 컬러 팔레트

### 2.1 frozen design token (재정의 금지 — planner §6.3 exact 값)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--snake-rank-accent` | `#39ff14` | 랭킹 강조 (네온 그린) — 순위/점수/등록 버튼 강조, 성공 상태 텍스트 |
| `--snake-rank-bg` | `#0a0f0a` | 랭킹 보드 배경 |
| `--snake-rank-gap` | `8px` | 보드 항목(행/폼 요소) 간격 |
| `--snake-rank-radius` | `6px` | 보드·행·입력·버튼 모서리 반경 |

> 위 4개 토큰은 frozen 이다. developer 는 값·이름을 바꾸지 않고 그대로 `:root` 에 선언한다.

### 2.2 보조 렌더 색상 (비 frozen — 시각 표현용 참고값, 기존 데모 계승)

frozen 토큰만으로 부족한 텍스트/상태/보더 색은 아래 **참고값**을 권장한다. 이는 frozen
계약이 아니라 기존 `styles.css` 팔레트와의 시각 일관성을 위한 렌더 제안이며, developer 가
동등한 시각 결과 안에서 조정할 수 있다. (색상은 상태 구분의 **유일한 수단이 아니다** — §6.)

| 역할 | 참고값 | 근거 |
| --- | --- | --- |
| 기본 본문 텍스트 | `#eef2ff` | 기존 `body` color |
| 보조/약한 텍스트(닉네임 placeholder, caption) | `rgba(238, 242, 255, 0.7)` | 기존 `.overlay__hint` |
| 보드/행 보더 | `rgba(57, 255, 20, 0.3)` | 기존 `.overlay__panel` 그린 보더 |
| 성공 상태 텍스트 | `--snake-rank-accent` (#39ff14) | 성공 강조 |
| error 상태 텍스트 | `#ff6b6b` | 색약 대비 확보용 경고 톤 (텍스트 병기 필수) |
| 비활성(submitting) 버튼 | `opacity: 0.5` | 기존 `.overlay__button:disabled` |

---

## 3. 타이포그래피

폰트 패밀리는 기존 데모의 system stack 을 그대로 계승한다(외부 폰트 의존 0건):
`"Segoe UI", system-ui, -apple-system, sans-serif`.

| 요소 | font-size | font-weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 보드 제목("랭킹") | `clamp(1.1rem, 4vw, 1.4rem)` | 700 | 1.2 | 네온 그린, 오버레이 톤 |
| 순위 행(`.snake-rank__row`) | `0.95rem` | 500 | 1.4 | 숫자는 `tabular-nums` |
| 순위 번호 · 점수 | `0.95rem` | 700 | 1.4 | `--snake-rank-accent` 강조 |
| 닉네임 입력(`#snake-rank-nickname`) | `1rem` | 400 | 1.4 | 16px 이상(모바일 확대 방지) |
| 등록 버튼(`.snake-rank__submit`) | `1rem` | 700 | 1 | 대문자 변형 없음 |
| 상태 텍스트(`#snake-rank-status`) | `0.9rem` | 600 | 1.3 | `role="status"` 영역 |

- 점수·순위 숫자는 `font-variant-numeric: tabular-nums` 로 자릿수 정렬(기존 `.hud__item` 계승).
- 상태 텍스트는 폰트 크기·굵기로 시선을 끌되, **의미 전달은 텍스트 내용**이 담당한다.

---

## 4. 레이아웃

### 4.1 배치 (섹션 구조)

종료 화면 오버레이 패널 내부, 최고 기록 보드 **아래**에 랭킹 보드를 세로로 쌓는다.

```
[ .overlay__panel  (기존) ]
  ├─ .overlay__text        "게임 종료"            (기존)
  ├─ #snake-highscore-board  이번 점수 / 최고 기록  (기존, BF-1513)
  ├─ .overlay__button        재시작                (기존)
  └─ #snake-rank-board (.snake-rank)  ◀── 이번 작업(additive)
       ├─ 제목            "랭킹"
       ├─ 순위 목록        .snake-rank__row × 최대 10
       │     └─ [순위]  [닉네임]  [점수]
       ├─ .snake-rank__form   등록 폼 (가로 배치)
       │     ├─ #snake-rank-nickname (input, .snake-rank__form 내부)
       │     └─ #snake-rank-submit (.snake-rank__submit)  "랭킹 등록"
       └─ #snake-rank-status   상태 텍스트 (role=status)
```

### 4.2 spacing

- 보드 컨테이너(`.snake-rank`): `background: var(--snake-rank-bg)`,
  `border-radius: var(--snake-rank-radius)`, `padding: 12px`,
  내부 세로 간격 `gap: var(--snake-rank-gap)` (flex column).
- 순위 목록: 각 행(`.snake-rank__row`) 사이 간격 `var(--snake-rank-gap)`,
  행 모서리 `var(--snake-rank-radius)`.
- 등록 폼(`.snake-rank__form`): 가로 flex, 입력과 버튼 사이 간격 `var(--snake-rank-gap)`.
- 상태 텍스트(`#snake-rank-status`): 폼 아래 `var(--snake-rank-gap)` 간격.

### 4.3 순위 행 내부 구조

각 `.snake-rank__row` 는 `[순위] [닉네임] [점수]` 3열. 닉네임은 `flex: 1` 로 늘어나고,
순위·점수는 고정 폭. 닉네임이 길면 `text-overflow: ellipsis` 로 말줄임(가로 overflow 방지).

```
| 1 | goat            | 320 |
| 2 | ace             | 210 |
| 3 | 플레이어1        | 120 |   ← 내 등록 행(성공 시 강조 가능, §5.4)
```

### 4.4 breakpoint 별 동작 (frozen §6.5 반영)

- **≥320px**: 보드 content overflow 없음. 오버레이 패널 폭
  `max-width: min(90vw, 420px)`(기존) 안에서 보드가 잘리지 않는다. 닉네임 말줄임 +
  `min-width: 0` 으로 flex 자식 overflow 를 방지한다.
- **좁은/낮은 화면**: 순위 목록 영역에 `max-height` + `overflow-y: auto` 를 적용해
  **세로 스크롤로 상위 10개를 모두** 노출한다. 폼·상태 텍스트는 스크롤 밖에 고정.
- **등록 폼**: 좁은 폭에서 입력+버튼이 한 줄에 안 들어가면 `flex-wrap: wrap` 으로
  버튼이 아래 줄로 내려가되 가로 스크롤은 발생시키지 않는다.

---

## 5. 컴포넌트 명세

### 5.1 selector 계약 (frozen §6.1 — 재정의 금지)

| 컴포넌트 | selector | 역할 |
| --- | --- | --- |
| 랭킹 보드 컨테이너 | `#snake-rank-board` (`.snake-rank`) | 보드 루트. 순위 목록·폼·상태를 감싼다 |
| 순위 행 | `.snake-rank__row` | 순위 1건 (`순위·닉네임·점수`). 최대 10개 |
| 등록 폼 | `.snake-rank__form` | 닉네임 입력 + 등록 버튼 컨테이너 |
| 닉네임 입력 | `#snake-rank-nickname` | 텍스트 입력. `aria-label="닉네임 입력"` |
| 등록 버튼 | `#snake-rank-submit` (`.snake-rank__submit`) | "랭킹 등록" 제출 control. `aria-label="랭킹 등록"` |
| 상태 텍스트 | `#snake-rank-status` | 상태 표시. `role="status"` + `aria-live="polite"` |

### 5.2 상태 명세 (frozen §6.2 — 상태 텍스트 재정의 금지)

닉네임 입력·랭킹 등록·랭킹 보드의 4가지 상태와 각 상태의 **화면 텍스트**:

| 상태 | `#snake-rank-submit` | `#snake-rank-status` 텍스트 | 보드/기타 |
| --- | --- | --- | --- |
| **idle** | 활성(enabled) | `''` (비어 있음) | 조회된 상위 10개 표시. 닉네임 입력 가능 |
| **submitting** | 비활성(disabled) | `등록 중…` | 중복 등록 방지(버튼 비활성). 입력 잠금 |
| **success** | 다시 활성 | `등록 완료 · 내 순위 N위` | 보드를 최신 상위 10개로 갱신, 내 순위 N 반영 |
| **error** | 다시 활성 | `랭킹을 불러올 수 없습니다` | **게임은 그대로 진행**. 보드는 직전 값 유지 |

- `N` 은 POST 성공 응답의 `rank`(1-based). 상태 텍스트는 `statusText(state, rank)`
  (planner §3.2)가 생성하는 frozen 문자열이다.
- **빈 닉네임 방어**: 닉네임이 비었거나 공백만이면 등록을 시작하지 않고 **idle 유지**
  (요청 미발송). 별도 오류 텍스트 없이 버튼만 무반응(또는 입력 포커스 유지).

### 5.3 상태 전이 (인터랙션)

```
        [빈 닉네임 클릭 → 무시, idle 유지]
idle ──(유효 닉네임 + "랭킹 등록" 클릭)──▶ submitting
submitting ──(POST 2xx, rank 수신)──▶ success ──(보드 갱신)──▶ idle
submitting ──(네트워크 오류 / 비2xx)──▶ error
error / success ──(종료 화면 재진입 · 재시작)──▶ idle (초기값 복원)
```

- **후조건 복원(frozen invariant)**: 초기화·취소·실패 뒤에는 상태 텍스트를 비우고(idle),
  등록 버튼을 다시 활성화해 주 실행 control 을 재사용 가능하게 되돌린다.
- **GET 조회 실패**: 종료 화면 진입 시 보드 조회(GET)가 실패해도 error 텍스트만 노출하고
  게임 흐름은 유지한다(빈 보드 + error 상태).

### 5.4 컴포넌트별 props / 상호작용

| 컴포넌트 | props / 속성 | 상태별 인터랙션 |
| --- | --- | --- |
| `#snake-rank-nickname` | `type="text"`, `aria-label="닉네임 입력"`, `placeholder="닉네임"`, `maxlength` 권장(예: 12) | idle: 입력 가능 / submitting: 비활성 권장 / focus: 네온 그린 outline |
| `#snake-rank-submit` | `type="button"`, `aria-label="랭킹 등록"`, 라벨 텍스트 "랭킹 등록" | idle·success·error: enabled / submitting: `disabled` + `opacity:0.5` |
| `#snake-rank-status` | `role="status"`, `aria-live="polite"` | 텍스트 내용만 상태별로 교체(§5.2). 비었을 때 레이아웃 흔들림 없게 `min-height` 확보 |
| `.snake-rank__row` | (동적 생성) 순위·닉네임·점수 텍스트 | 정적 표시. 내 등록 행은 성공 시 `--snake-rank-accent` 로 강조(선택, 비 frozen) |

- **hover/focus (비 frozen 렌더)**: 등록 버튼 hover 시 `translateY(-1px)` + 글로우 강화
  (기존 `.overlay__button:hover` 계승). focus-visible 시 네온 그린 outline
  (`outline: 3px solid var(--snake-rank-accent)`). `prefers-reduced-motion` 시 전환·글로우 축소.

---

## 6. 접근성 명세 (frozen §6.4 — 재정의 금지)

| 대상 | 요구 속성 |
| --- | --- |
| 닉네임 입력 `#snake-rank-nickname` | `aria-label="닉네임 입력"` |
| 등록 control `#snake-rank-submit` | `aria-label="랭킹 등록"` |
| 상태 영역 `#snake-rank-status` | `role="status"` + `aria-live="polite"` |

- **색상 비의존**: 모든 상태(idle/submitting/success/error)는 **색상만으로 구분하지 않고**
  상태명을 **화면 텍스트와 접근성 이름**으로 노출한다. 예) error 는 붉은 톤 + "랭킹을
  불러올 수 없습니다" 텍스트를 함께 제공한다.
- **상태 알림**: 상태 텍스트 변경 시 `aria-live="polite"` 로 스크린리더가 새 상태를
  방해 없이 읽는다(submitting→success→idle 흐름).
- **키보드**: 닉네임 입력 → 등록 버튼 Tab 이동 가능, Enter/Space 로 등록 실행 가능,
  focus 링은 배경과 대비되는 네온 그린 outline 으로 항상 보인다.
- **contrast**: 네온 그린(#39ff14) / 붉은 error 톤 모두 `--snake-rank-bg`(#0a0f0a) 위에서
  충분한 대비를 확보한다. 약한 보조 텍스트는 본문 텍스트로 상태를 병기한다.

---

## 7. 반응형 명세 (frozen §6.5 — 재정의 금지)

- **320px 이상 overflow 0**: 랭킹 보드 content 가 가로로 넘치지 않는다. 닉네임 셀은
  `min-width: 0` + `text-overflow: ellipsis` 로 긴 닉네임을 말줄임 처리한다.
- **좁은 화면 세로 스크롤**: 순위 목록은 세로 스크롤(`overflow-y: auto`)로 **상위 10개를
  모두** 노출한다. 등록 폼·상태 텍스트는 스크롤 영역 밖에 고정해 항상 접근 가능하다.
- **캔버스 비가림**: 랭킹 보드는 종료 화면 오버레이 패널 내부에만 렌더되어 플레이 중
  게임 캔버스를 가리지 않는다(playing 상태에서는 숨김/비활성 — planner §7 hook).

---

## 8. dev 구현 가이드 (developer BF-1550 handoff)

> 아래는 시각 재현을 돕는 **권장 CSS 변수명·클래스명·마크업**이다. frozen selector·token·
> 상태 텍스트는 **그대로** 사용하고, 픽셀 단위 일치 의무는 없다. runtime 코드
> (`index.html`/`ranking.js`/`scores-api.js`)는 developer 소유이며, 본 문서는 시각 계약만 제공한다.

### 8.1 마크업 골격 (종료 화면 오버레이 패널 내부, 최고 기록 보드 아래에 additive)

```html
<!-- frozen ui-contract §6: 랭킹 등록/조회 보드 (additive) -->
<section id="snake-rank-board" class="snake-rank" hidden>
  <h3 class="snake-rank__title">랭킹</h3>

  <!-- 순위 목록: .snake-rank__row 를 동적 렌더(상위 10). 스크롤 컨테이너로 감싼다 -->
  <ol class="snake-rank__list">
    <li class="snake-rank__row">
      <span class="snake-rank__pos">1</span>
      <span class="snake-rank__name">goat</span>
      <span class="snake-rank__score">320</span>
    </li>
    <!-- … 최대 10행 -->
  </ol>

  <!-- 등록 폼: 닉네임 입력 + 등록 버튼 -->
  <div class="snake-rank__form">
    <input
      id="snake-rank-nickname"
      type="text"
      aria-label="닉네임 입력"
      placeholder="닉네임"
      maxlength="12"
    />
    <button
      id="snake-rank-submit"
      class="snake-rank__submit"
      type="button"
      aria-label="랭킹 등록"
    >랭킹 등록</button>
  </div>

  <!-- 상태 텍스트: role=status + aria-live=polite. idle 시 비어 있음 -->
  <p id="snake-rank-status" role="status" aria-live="polite"></p>
</section>
```

> `.snake-rank__list` / `.snake-rank__title` / `.snake-rank__pos` 등 BEM element 는 시각
> 편의용 **권장** 클래스다. frozen 계약 클래스(`snake-rank`, `snake-rank__row`,
> `snake-rank__form`, `snake-rank__submit`)와 DOM id 4종은 **반드시** 그대로 사용한다.

### 8.2 CSS 뼈대 (frozen token 선언 + 반응형)

```css
:root {
  /* frozen ui-contract §6.3 (exact — 재정의 금지) */
  --snake-rank-accent: #39ff14;
  --snake-rank-bg: #0a0f0a;
  --snake-rank-gap: 8px;
  --snake-rank-radius: 6px;
}

.snake-rank {
  display: flex;
  flex-direction: column;
  gap: var(--snake-rank-gap);
  margin-top: 16px;
  padding: 12px;
  background: var(--snake-rank-bg);
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: var(--snake-rank-radius);
  text-align: left;
}

.snake-rank__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--snake-rank-gap);
  max-height: 40vh;          /* 좁은 화면: 세로 스크롤로 상위 10 모두 노출 */
  overflow-y: auto;
}

.snake-rank__row {
  display: flex;
  align-items: center;
  gap: var(--snake-rank-gap);
  padding: 6px 10px;
  border-radius: var(--snake-rank-radius);
  background: rgba(57, 255, 20, 0.06);
  font-variant-numeric: tabular-nums;
}

.snake-rank__pos { width: 2ch; color: var(--snake-rank-accent); font-weight: 700; }
.snake-rank__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.snake-rank__score { color: var(--snake-rank-accent); font-weight: 700; }

.snake-rank__form { display: flex; flex-wrap: wrap; gap: var(--snake-rank-gap); }

#snake-rank-nickname {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  font-size: 1rem;              /* 16px 이상: 모바일 확대 방지 */
  color: #eef2ff;
  background: rgba(5, 5, 16, 0.6);
  border: 1px solid rgba(57, 255, 20, 0.3);
  border-radius: var(--snake-rank-radius);
}
#snake-rank-nickname:focus-visible { outline: 3px solid var(--snake-rank-accent); outline-offset: 2px; }

.snake-rank__submit {
  padding: 8px 16px;
  font-weight: 700;
  color: var(--snake-rank-bg);
  background: var(--snake-rank-accent);
  border: none;
  border-radius: var(--snake-rank-radius);
  cursor: pointer;
}
.snake-rank__submit:disabled { opacity: 0.5; cursor: default; }   /* submitting */

#snake-rank-status {
  margin: 0;
  min-height: 1.3em;            /* 빈(idle) 상태에서도 레이아웃 흔들림 방지 */
  font-size: 0.9rem;
  font-weight: 600;
}
#snake-rank-status[data-state="success"] { color: var(--snake-rank-accent); }
#snake-rank-status[data-state="error"] { color: #ff6b6b; }   /* 색상은 보조 — 텍스트로도 구분 */

@media (prefers-reduced-motion: reduce) {
  .snake-rank__submit { transition: none; }
}
```

> `[data-state="…"]` 는 색상 보조용 **권장** 훅이다. 상태의 **의미 전달은 §5.2 화면
> 텍스트**가 담당하며, 색상은 부가 신호일 뿐이다(frozen 접근성 §6).

### 8.3 상태별 렌더 규칙 (planner §3.2 `statusText` 준수)

- `statusText('idle')` → `''`, 버튼 enabled
- `statusText('submitting')` → `'등록 중…'`, 버튼 `disabled`
- `statusText('success', N)` → `` `등록 완료 · 내 순위 ${N}위` ``, 버튼 enabled, 보드 갱신
- `statusText('error')` → `'랭킹을 불러올 수 없습니다'`, 버튼 enabled, 게임 유지
- 순위 목록은 `topEntries(entries, 10)`(planner §3.2)로 상위 10개만 렌더한다.

### 8.4 배선 지점 (planner §7 hook — 참조)

- `handleGameOver()`: 보드 노출 + GET 조회 → `topEntries` 렌더, 상태 idle, 확정 점수·모드 바인딩.
- `#snake-rank-submit` 클릭: `isValidNickname` 통과 시 submitting → POST → success/error.
- `restartToMenu()` / `goModeSelection()`: 보드를 idle 초기값으로, 상태 텍스트 비움.
- `startLocal()` / `startCpu()`: 보드 숨김/비활성(플레이 중 미노출).

### 8.5 기존 요소 보존 (additive 불변)

- 기존 최고 기록 보드(`#snake-highscore-board`), 오버레이(`.overlay__panel`), 게임 캔버스,
  기존 selector/token 은 **삭제·의미 변경 금지**. 랭킹 보드는 그 아래 **추가**만 한다.
- 게임 규칙·tick 루프·충돌 판정·localStorage 최고 기록(`highscore.js`) 로직은 **불변**.

---

## 9. mockup 참조

- **mockup HTML**: `docs/design/mockups/snake-ranking-BF-1548.html`
- 위 mockup 은 랭킹 보드의 **idle / submitting / success / error 4개 상태**를 한 페이지에
  나란히 렌더한 self-contained 시각 시뮬레이션이다(외부 의존성 0건, frozen token/selector/
  상태 텍스트 그대로 사용). 색상뿐 아니라 상태 텍스트로 구분되는지, 320px 폭에서 overflow 가
  없는지, 좁은 화면 세로 스크롤이 동작하는지를 시각으로 확인할 수 있다.
- **이는 dev 의 실제 산출물이 아니다** — 시안 시각화용이며, developer 는 참조 가이드로만
  사용하고 픽셀 단위 일치 의무는 없다.

---

## 10. Self-critique

PR commit 직전 자기 점검 (dev 가 받기 전 명세 누락/모호함 검증):

1. **AC 매핑**: ✅ frozen selector(§5.1)·token(§2.1)·상태 텍스트(§5.2)·접근성(§6)·반응형(§7)을
   planner §6 exact 값 그대로 반영. idle/submitting/success/error 4상태의 화면 텍스트를 모두 명세.
2. **dev 구현 가이드**: ✅ §8 에 마크업 골격·CSS 뼈대·상태 렌더 규칙·배선 지점·보존 규칙을
   단계별로 제공. 권장(비 frozen) 클래스와 frozen 계약 selector 를 명확히 구분.
3. **기존 요소 보존**: ✅ §1·§8.5 에서 additive 범위(최고 기록 보드 아래 추가), 기존
   오버레이·selector·게임 로직 불변을 명시.
4. **컴포넌트 매핑**: ✅ §5 에서 각 컴포넌트를 frozen selector·props·상태 인터랙션으로 매핑.
   상태 전이 다이어그램(§5.3)과 후조건 복원 포함.
5. **모호함 flag**: ⚠️ `N`(내 순위)의 구체 소스 매핑과 "내 등록 행 강조", `[data-state]` 색상
   훅은 **비 frozen 권장** 사항으로 표기 — developer 가 frozen 스키마(§5 API)·상태 텍스트를
   만족하는 범위에서 결정한다. frozen 계약(selector/token/상태 텍스트/접근성/반응형)에는
   모호함이 없다.
