# 스톱워치 UI 시안 (BF-2042 · 상위 BF-2041)

> 본 문서는 상위 frozen 계약(`docs/plans/BF-2041/implementation-plan.md` §4 UI 계약)을
> **재정의 없이** 시각 명세 형태로 서술한다. selector(ID/class)·상태·토큰 값은 frozen 그대로이며,
> 본 문서는 신규 selector·상태·토큰 값을 추가하지 않는다(단, frozen 계약이 다루지 않는
> 배경·표면·보조 텍스트 색상 등은 §2.2에 **보조 토큰**으로만 추가한다).
>
> mockup: [`docs/design/mockup/stopwatch.html`](mockup/stopwatch.html)
> 작성자: 이디자인

---

## 1. 시안 개요

### 1.1 변경 범위

- 단일 스톱워치 컴포넌트(`#stopwatch-root`) — display + 4개 컨트롤 버튼 + 랩 리스트.
- 상태는 `idle → running ⇄ paused → (reset) idle` 3-state 전이(§1 상태 전이표, implementation-plan.md 참조).
- 다크 테마 고정(`--color-bg-app: #0f172a`) — 라이트 테마는 본 범위 밖.

### 1.2 사용자 경험 목표

- **디스플레이 중심**: `MM:SS.CC` 대형 텍스트(`#stopwatch-display`)가 화면의 시각적 anchor.
- **상태를 텍스트로도 노출**: 색상만으로 idle/running/paused를 구분하지 않고, 상태명을 화면 텍스트로 항상 표시(frozen 접근성 기준).
- **컨트롤 가용성 = 상태의 함수**: 4개 버튼(`btn-start`/`btn-pause`/`btn-reset`/`btn-lap`)은 매 상태마다 정확히 활성/비활성이 갈려 오조작을 원천 차단.
- **랩 비교가 한눈에**: 최고/최저 랩을 색상 강조 + 텍스트 배지("최고 랩"/"최저 랩") 이중으로 표시.
- **375px 협소 화면 대응**: 컨트롤 4개·랩 리스트가 가로 스크롤 없이 표시.

### 1.3 비목표 (Out of Scope)

- 라이트 테마, 다중 스톱워치 인스턴스, 랩 export, 사운드/진동 — 본 티켓 범위 밖.
- 실제 타이머 동작·JS 상태 관리·랩 계산 로직 — developer(BF-2043) 구현 범위(`stopwatch/stopwatch.js`).
- selector·상태·frozen 토큰 값 재정의 — 금지(§4.6 불변식).

---

## 2. 컬러 팔레트

### 2.1 frozen 토큰 (변경 금지 — implementation-plan.md §4.3)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg-app` | `#0f172a` | 페이지/`stopwatch-root` 배경 |
| `--color-display-text` | `#f8fafc` | `stopwatch-display` 텍스트 |
| `--color-btn-start` | `#22c55e` | `btn-start` 배경(초록 — 시작/재개) |
| `--color-btn-pause` | `#f59e0b` | `btn-pause` 배경(주황 — 일시정지) |
| `--color-btn-reset` | `#ef4444` | `btn-reset` 배경(빨강 — 리셋) |
| `--color-lap-best` | `#16a34a` | `lap-list__item--best` 강조색 |
| `--color-lap-worst` | `#dc2626` | `lap-list__item--worst` 강조색 |

### 2.2 보조 토큰 (신규 상태/의미 추가 아님 — §2.1과 충돌 없음)

frozen 계약은 버튼 4종 중 `btn-lap`의 강조색과 카드 표면·보조 텍스트·테두리·포커스링
색상을 정의하지 않는다. 다크 테마 톤에 맞춰 아래 보조 토큰을 권장한다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-btn-lap` | `#3b82f6` | `btn-lap` 배경(파랑 — 시작/일시정지/리셋과 구분되는 4번째 색) |
| `--color-surface-card` | `#1e293b` | `stopwatch` 카드 표면(앱 배경보다 한 단계 밝은 패널) |
| `--color-border-subtle` | `rgba(248, 250, 252, 0.12)` | 카드/버튼/랩 항목 경계선 |
| `--color-text-secondary` | `#94a3b8` | 상태 라벨, 랩 누적 시간(totalMs) 등 2차 텍스트 |
| `--color-btn-disabled-bg` | `#334155` | 비활성 버튼 배경 |
| `--color-btn-disabled-text` | `#64748b` | 비활성 버튼 텍스트 |
| `--color-focus-ring` | `#38bdf8` | 키보드 포커스 outline(다크 배경 대비 확보) |
| `--color-badge-best-bg` | `rgba(22, 163, 74, 0.16)` | "최고 랩" 텍스트 배지 배경 |
| `--color-badge-worst-bg` | `rgba(220, 38, 38, 0.16)` | "최저 랩" 텍스트 배지 배경 |

### 2.3 상태 색상 매핑

| 상태 | 상태 텍스트 | 강조 방식 |
| --- | --- | --- |
| idle | "대기 중" | `btn-start`만 활성색, 나머지 비활성색 |
| running | "실행 중" | `btn-pause`/`btn-lap` 활성색, `btn-start`/`btn-reset` 비활성색 |
| paused | "일시정지됨" | `btn-start`/`btn-reset` 활성색, `btn-pause`/`btn-lap` 비활성색 |

---

## 3. 타이포그래피

frozen 계약의 `--font-family-base`(`system-ui, -apple-system, sans-serif`)를 전 요소에 사용한다.
별도 heading/caption 폰트 토큰은 frozen 목록에 없으므로 아래 권장값을 사용한다.

| 용도 | font-family | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- | --- |
| display (`stopwatch-display`) | `var(--font-family-base)` | 56px (모바일 44px) | 700 | 1.1 | `font-variant-numeric: tabular-nums`로 자릿수 흔들림 방지 |
| 상태 라벨 | `var(--font-family-base)` | 14px | 600 | 1.4 | `text-transform: uppercase`, `letter-spacing: 0.04em` |
| 버튼(`stopwatch__btn`) | `var(--font-family-base)` | 15px | 600 | 1.2 | |
| 랩 항목 본문 | `var(--font-family-base)` | 14px | 500 | 1.4 | `lapMs` 강조, `totalMs`는 `--color-text-secondary` |
| 랩 배지("최고 랩"/"최저 랩") | `var(--font-family-base)` | 11px | 700 | 1.2 | `text-transform: uppercase` |

---

## 4. 레이아웃

### 4.1 구조 (frozen selector는 굵게 표기)

```
**#stopwatch-root** (.**stopwatch**)                         ── --color-bg-app 배경, 중앙 정렬 카드
├─ 상태 라벨 (비-frozen, 텍스트로 idle/running/paused 노출)
├─ **#stopwatch-display** (.**stopwatch__display**)          ── "MM:SS.CC"
├─ .**stopwatch__controls**                                  ── gap: --space-control-gap(12px)
│   ├─ **#btn-start** (.**stopwatch__btn**)  aria-label="시작"
│   ├─ **#btn-pause** (.**stopwatch__btn**)  aria-label="일시정지"
│   ├─ **#btn-reset** (.**stopwatch__btn**)  aria-label="리셋"
│   └─ **#btn-lap**   (.**stopwatch__btn**)  aria-label="랩 기록"
└─ **#lap-list** (ordered/unordered list)
    └─ .**lap-list__item** [.**lap-list__item--best**|.**lap-list__item--worst**] × N
        ├─ 랩 번호(id) + lapMs(구간) + totalMs(누적)
        └─ (best/worst인 경우) 텍스트 배지 "최고 랩" / "최저 랩"
```

`stopwatch-root`/`stopwatch-display`/`btn-start`/`btn-pause`/`btn-reset`/`btn-lap`/`lap-list`(ID)와
`stopwatch`/`stopwatch__display`/`stopwatch__controls`/`stopwatch__btn`/`lap-list__item`/
`lap-list__item--best`/`lap-list__item--worst`(class)만 frozen이다. 상태 라벨 엘리먼트,
랩 항목 내부의 번호/시간 wrapper 마크업은 developer 재량이며 본 문서의 명칭은 구현 편의를
위한 권장 표현일 뿐 frozen selector가 아니다.

### 4.2 spacing / breakpoint

- 버튼 사이 간격: `--space-control-gap`(`12px`, frozen).
- **375px 이상** 뷰포트에서 `stopwatch__controls`의 버튼 4개와 `lap-list` 항목 모두 가로
  스크롤 없이 표시된다(frozen AC-10).
- **480px 미만**: `stopwatch__controls`는 2×2 grid(`grid-template-columns: 1fr 1fr`)로 배치.
  랩 항목은 세로 스택(번호/시간 위, 배지 아래 줄바꿈 허용).
- **480px 이상**: `stopwatch__controls`는 4열 grid(`grid-template-columns: repeat(4, 1fr)`)로
  한 줄 배치. 랩 항목은 가로 1행(번호·시간·배지 나란히).
- 카드(`stopwatch`) 최대 너비 400px, 좌우 여백 16px, 뷰포트 중앙 정렬.

### 4.3 랩 리스트 정렬

- 최신 랩이 `lap-list` 최상단(역순 정렬) — AC-5("lap-list 최상단에 추가").
- 최대 노출 개수는 frozen 범위 밖(비-frozen) — developer 재량. 본 mockup은 5개 예시만 표기.

---

## 5. 컴포넌트 명세

### 5.1 `#stopwatch-root` (.stopwatch) — 컨테이너

| 상태 | 상태 텍스트(화면+접근성 이름) | btn-start | btn-pause | btn-reset | btn-lap |
| --- | --- | --- | --- | --- | --- |
| idle | "대기 중" | 활성 (시작) | 비활성 | 비활성 | 비활성 |
| running | "실행 중" | 비활성 | 활성 (일시정지) | 비활성 | 활성 (랩 기록) |
| paused | "일시정지됨" | 활성 (재개) | 비활성 | 활성 (리셋) | 비활성 |

- 상태 라벨은 `aria-live="polite"`로 상태 전이 시 스크린리더에 즉시 안내되도록 권장(비-frozen, developer 재량).
- 비활성 버튼은 네이티브 `disabled` 속성 사용(포커스·클릭 원천 차단, frozen AC-6과 일치).

### 5.2 `#stopwatch-display` (.stopwatch__display)

- `formatElapsed(elapsed)` 출력(`"MM:SS.CC"`)을 그대로 렌더링(순수함수 계약은 implementation-plan.md §3.1).
- idle 초기값: `"00:00.00"`.
- 색상: `--color-display-text`. `font-variant-numeric: tabular-nums`로 숫자 폭 고정(신규 토큰 아님, CSS 속성).

### 5.3 `.stopwatch__btn` (btn-start / btn-pause / btn-reset / btn-lap)

| 속성 | 명세 |
| --- | --- |
| 태그 | 네이티브 `<button type="button">` (Enter/Space 기본 지원 — frozen AC-9) |
| `aria-label` | 고정: "시작"(`btn-start`) / "일시정지"(`btn-pause`) / "리셋"(`btn-reset`) / "랩 기록"(`btn-lap`) — 상태와 무관하게 동일 문자열(frozen) |
| 가시 라벨 텍스트 | `btn-start`는 상태에 따라 "시작"(idle)/"재개"(paused)로 시각적 문구만 달라질 수 있음(비-frozen, aria-label은 불변) |
| 활성 배경색 | 각각 `--color-btn-start`/`--color-btn-pause`/`--color-btn-reset`/`--color-btn-lap` |
| 비활성 배경색 | `--color-btn-disabled-bg`, 텍스트 `--color-btn-disabled-text`, `cursor: not-allowed` |
| 포커스 | `outline: 2px solid var(--color-focus-ring); outline-offset: 2px` |
| 크기 | `min-height: 44px`(터치 타깃), `padding: 10px 16px`, `border-radius: 8px` |

### 5.4 `#lap-list` / `.lap-list__item`

| 속성 | 명세 |
| --- | --- |
| 마크업 | `<ul id="lap-list">` + `<li class="lap-list__item">` × N |
| 항목 표시 | 랩 번호(`id`) · 구간 시간(`lapMs`, `formatElapsed` 포맷) · 누적 시간(`totalMs`, `formatElapsed` 포맷) |
| best 강조 | `.lap-list__item--best` 추가 → 텍스트 색상/좌측 보더 `--color-lap-best` + 텍스트 배지 "최고 랩"(`--color-lap-best` 글자, `--color-badge-best-bg` 배경) |
| worst 강조 | `.lap-list__item--worst` 추가 → 텍스트 색상/좌측 보더 `--color-lap-worst` + 텍스트 배지 "최저 랩"(`--color-lap-worst` 글자, `--color-badge-worst-bg` 배경) |
| 동률/단일 랩 | `lapStats`가 `{bestId:null, worstId:null}`을 반환하면 어떤 항목에도 best/worst 클래스·배지를 부여하지 않음(implementation-plan.md §3.2) |
| 빈 상태 | 랩이 0개면 `lap-list`는 빈 리스트 — placeholder 텍스트("아직 기록된 랩이 없습니다") 표시 권장(비-frozen) |

---

## 6. dev 구현 가이드 (BF-2043 대상)

1. **selector·토큰 그대로 사용**: §4.1의 굵게 표기된 ID/class, §2.1의 frozen 토큰 값을 변경 없이 `stopwatch/index.html`·`stopwatch/style.css`에 그대로 반영한다.
2. **보조 토큰은 선택 적용**: §2.2 보조 토큰(`--color-btn-lap` 등)은 frozen이 아니므로 값을 조정해도 무방하나, 조정 시에도 §2.3 상태별 대비(활성/비활성 구분)는 유지한다.
3. **상태 → DOM 반영**: 상태 전이표(implementation-plan.md §1.1)를 그대로 `disabled` 토글 로직에 매핑한다. 상태 라벨 텍스트("대기 중"/"실행 중"/"일시정지됨")는 §5.1 표를 그대로 사용한다.
4. **버튼 라벨 이중 문구**: `btn-start`의 화면 텍스트는 idle="시작", paused="재개"로 바뀌어도 되지만 `aria-label`은 항상 "시작"으로 고정한다(§5.3).
5. **랩 렌더링 순서**: 신규 랩은 `lap-list` 최상단에 prepend한다(§4.3).
6. **best/worst 재계산**: 랩 추가마다 `lapStats(laps)`(implementation-plan.md §3.2)를 재실행해 클래스·배지를 갱신하고, `{bestId:null}`/`{worstId:null}`이면 해당 클래스를 제거한다.
7. **반응형 breakpoint**: §4.2의 480px 기준 grid 전환을 CSS `@media`로 구현한다. 375px에서 가로 스크롤이 생기지 않는지 반드시 확인(frozen AC-10).
8. **포커스 스타일**: 기본 브라우저 outline을 제거하지 말고 최소 §5.3의 `--color-focus-ring` 스타일을 보장한다(frozen AC-9, 키보드 접근성).
9. **class명 재사용 금지**: `stopwatch__btn` 등 frozen class 뒤에 상태별 modifier class를 새로 만들지 말고, `disabled` 속성과 CSS `:disabled` selector로 상태를 표현한다(불필요한 selector 증식 방지).

---

## 7. mockup 참조

- 정적 mockup: [`docs/design/mockup/stopwatch.html`](mockup/stopwatch.html)
- mockup은 idle / running / paused 3개 상태를 별도 섹션에 나란히 스냅샷으로 표시한다(단일 페이지 내 3개 인스턴스 — 첫 번째 idle 섹션만 frozen ID를 실제로 사용하고, running/paused 섹션은 frozen class만 재사용하며 고유 ID 충돌을 피하기 위해 ID 없이 렌더링한다. 실제 앱은 상태가 1개 DOM에서 전이되므로 이는 시각 비교용 mockup 한정 구성이다).
- 실제 타이머 카운트업·랩 기록 로직은 정적 HTML에 없음(placeholder 값 사용) — developer 구현(BF-2043) 시 순수함수 계약(§3, implementation-plan.md)을 적용한다.
