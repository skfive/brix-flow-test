# Addiction Mini 시각 명세 (BF-1855)

> 본 문서는 **designer 산출물(BF-1855)** 이며 planner 의 frozen UI 계약(`docs/plans/BF-1854/implementation-plan.md` §3)을
> **시각 명세로 구현**합니다. selector·상태·token·접근성·반응형 계약을 **변경·재정의하지 않고**, 이미지 근거의
> 화면을 그 계약값 그대로 시각화합니다. 실제 앱 코드(`iteration-check3/`)는 developer(BF-1856) 산출물이며 본 문서 범위 밖입니다.
>
> 근거: 운영자 첨부 이미지 `01-addiction-mini.png` (청록 보드 패널·남색 HUD·앵커 회색 카드·빈 칸 청록 실루엣·하단 3버튼)
> 및 frozen UI 계약(§3 DOM ID / class / states / design tokens / 접근성 / 반응형).

---

## 1. 시안 개요

- **변경 범위**: Addiction(중독) 미니 카드 퍼즐의 단일 화면. 4×7(28칸) 보드 + 상단 HUD + 하단 컨트롤.
- **사용자 경험 목표**
  - 한눈에 "각 행을 한 무늬 A→6 오름차순으로 정렬" 이라는 목표가 읽히도록, 올바른 접두(정렬된 앞부분)와 미정렬 카드가 시각적으로 구분된다.
  - **빈 칸이 다음에 요구하는 카드**를 회색 앵커 실루엣(`card--anchor`)으로 암시해 "어디로 무엇을 옮길지" 힌트를 제공한다.
  - 이동 불가한 **dead gap**(왼쪽이 빈 칸이거나 rank 6) 빈 칸은 앵커 없이 청록 실루엣만 보여 "여긴 못 놓음" 을 구분한다.
  - 상태(`playing`/`selected`/`won`/`shuffle-disabled`)는 **색상만이 아니라 화면 텍스트 + 접근성 이름**으로도 노출된다.
- **비목표(non-goal)**: 로직/애니메이션/실앱 마크업. 본 시안은 정적 시각 시뮬레이션이다.

---

## 2. 컬러 팔레트 (frozen tokens — exact, 재정의 금지)

planner frozen `design_tokens` 를 그대로 사용한다. HEX 값·토큰명 변경 금지.

| 토큰 | HEX | 용도 |
| --- | --- | --- |
| `--color-bg` | `#1b1030` | 페이지 배경(딥 퍼플) — `game-root` 바깥 캔버스 |
| `--color-board-panel` | `#1a8a89` | 보드 패널 배경(청록) — `board` 컨테이너 |
| `--color-hud-bg` | `#12203a` | HUD 배경(남색) — `hud` 바 |
| `--color-hud-text` | `#e8f0f0` | HUD 텍스트(밝은 회백) — `hud__stat` |
| `--color-card-face` | `#ffffff` | 카드 앞면(흰색) — `card` |
| `--color-card-anchor` | `#c9c9c9` | 앵커/빈 칸 힌트 카드(회색) — `card--anchor` |
| `--color-suit-red` | `#d81e2c` | ♥ ♦ 무늬·랭크 색(적색) — `card--red` |
| `--color-suit-black` | `#1a1a1a` | ♣ ♠ 무늬·랭크 색(흑색) — `card--black` |
| `--color-empty-cell` | `#0f5c5c` | 빈 칸 실루엣(어두운 청록) — `cell--empty` |
| `--space-card-gap` | `8px` | 카드 간 간격 — `board` grid gap |

### 2.1 파생/보조 색 (mockup 시각화 전용 — 계약 아님)
아래는 mockup 가독성을 위한 **파생 표현값**이며 frozen token 이 아니다. developer 는 frozen token 만 CSS 변수로 정의하고,
아래는 rgba 투명도/보더 등 시각 처리 수준으로만 참고한다.

| 표현 | 값(예시) | 근거 |
| --- | --- | --- |
| 보드 패널 보더/인셋 | `rgba(0,0,0,.25)` | `--color-board-panel` 위 셀 경계 대비 |
| 카드 그림자 | `rgba(0,0,0,.28)` | 흰 카드의 부양감 |
| 앵커 카드 랭크 텍스트 | `--color-suit-*` 를 `opacity:.55` | 회색 앵커 위 "요구 카드" 흐리게 |
| 승리 오버레이 배경 | `rgba(27,16,48,.86)` | `--color-bg` 반투명 |

---

## 3. 타이포그래피

외부 의존성 0건 — **system font stack** 사용(`vanilla-static` 규약).

```
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 역할 | font-family | size | weight | line-height | 색 |
| --- | --- | --- | --- | --- | --- |
| HUD 값(SCORE/TIME/MOVES 숫자) | var(--font-sans) | 22px | 700 | 1.1 | `--color-hud-text` |
| HUD 라벨(`SCORE`/`TIME`/`MOVES`) | var(--font-sans) | 11px | 600 | 1.2 | `--color-hud-text` (letter-spacing .08em, 대문자) |
| 카드 랭크(A,2~6) | var(--font-sans) | 20px(코너 12px) | 700 | 1 | 무늬색 |
| 카드 무늬(♥♦♣♠) | var(--font-sans) | 22px | 700 | 1 | 무늬색 |
| 앵커 힌트 텍스트(요구 카드) | var(--font-sans) | 16px | 700 | 1 | 무늬색 `opacity:.55` |
| 컨트롤 버튼 라벨 | var(--font-sans) | 13px | 600 | 1.2 | `--color-hud-text` |
| 승리 배너 제목 | var(--font-sans) | 26px | 800 | 1.2 | `--color-hud-text` |
| 상태 텍스트(배지) | var(--font-sans) | 12px | 700 | 1.2 | 상태별(아래 §5.5) |

> 랭크 표기: `1` 은 `A` 로 표시(Ace). `2~6` 은 숫자 그대로. 무늬 심볼은 유니코드 `♥ ♦ ♣ ♠`.

---

## 4. 레이아웃

### 4.1 섹션 구조 (세로 스택, `game-root` 내부)
```
game-root (max-width 560px, 중앙 정렬, padding 16px)
├─ hud  ............... 상단 바 (남색 #12203a)
│   ├─ hud__stat  SCORE  → #hud-score
│   ├─ hud__stat  TIME   → #hud-time
│   └─ hud__stat  MOVES  → #hud-moves
├─ board (#game-board)  청록 패널 #1a8a89, 7열 그리드
│   └─ cell × 28  (card | card--anchor | cell--empty)
├─ controls  하단 3버튼
│   ├─ controls__btn  #btn-settings   aria-label='설정'
│   ├─ controls__btn  #btn-shuffle    aria-label='카드 섞기'
│   └─ controls__btn  #btn-restart    aria-label='재시작'
└─ win-overlay (#win-overlay)  기본 hidden, won 시 노출 → .win-banner
```

### 4.2 보드 그리드 (핵심)
- `display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-card-gap);` — **7열 × 4행 = 28칸**.
- 각 셀 `aspect-ratio: 5 / 7`(카드 비율) 유지 → 컨테이너 폭에 따라 카드 크기만 축소, 비율 불변.
- 행 우선(row-major) 순서: `index = row*7 + col` (0~27). 화면상 좌→우, 위→아래로 채운다.
- `--space-card-gap = 8px` 를 grid gap 과 셀 내부 여백 기준으로 사용.

### 4.3 spacing
| 위치 | 값 |
| --- | --- |
| `game-root` padding | 16px |
| `hud` ↔ `board` 간격 | 12px |
| `board` ↔ `controls` 간격 | 14px |
| `board` 패널 내부 padding | 12px |
| 카드 간 gap | `--space-card-gap`(8px) |
| 컨트롤 버튼 간 gap | 10px |

### 4.4 breakpoint 별 동작 (반응형 — frozen §3.6)
| 뷰포트 | 동작 |
| --- | --- |
| ≥ 560px | `game-root` 최대폭 560px 고정, 카드 큼. |
| 320px ~ 559px | `game-root` 폭 = 뷰포트 - 32px. 보드 7열 유지, 카드가 `1fr`+`aspect-ratio` 로 **비율 유지한 채 축소**. |
| **= 320px** | 4×7 보드가 **가로 overflow 없이** 표시(AC9). 최소 셀 폭에서도 랭크/무늬 판독 가능하도록 코너 인덱스는 유지, 중앙 심볼만 축소. |
- 가로 스크롤 금지: `board` 는 `width:100%`, 셀은 `min-width:0` 로 grid 축소 허용.

---

## 5. 컴포넌트 명세

### 5.1 HUD (`hud`, `hud__stat`)
- 3개 `hud__stat` 를 가로 균등 배치(`display:flex; justify-content:space-between`).
- 각 stat = 라벨(위, 작은 대문자) + 값(아래, 큰 볼드). 라벨은 화면 텍스트로 항상 노출(색 의존 X).
- 매핑: `#hud-score`←SCORE(올바르게 놓인 카드 수), `#hud-time`←TIME(mm:ss), `#hud-moves`←MOVES(이동 횟수).
- 초기값: SCORE `0`, TIME `0:00`, MOVES `0`. (재시작 시 이 값으로 복원 — AC7)

### 5.2 셀 3종 (`cell` 기반)
| 종류 | class | 시각 |
| --- | --- | --- |
| 카드 | `cell card card--red` / `card--black` | 흰 배경, 좌상단 코너 랭크+무늬(작게), 중앙 큰 무늬, 무늬색 적용 |
| 앵커(빈 칸이 요구하는 카드 힌트) | `cell card--anchor` | 회색(`#c9c9c9`) 배경, 요구 카드 랭크+무늬를 흐리게(`opacity .55`) 표시 → "여기에 이 카드" |
| 빈 칸(실루엣) | `cell cell--empty` | 어두운 청록(`#0f5c5c`) 인셋 사각, 콘텐츠 없음(dead gap 포함) |

> 앵커 vs 빈 칸 구분: 이동 가능한 빈 칸은 `card--anchor` 로 **요구 카드를 미리보기**, dead gap(왼쪽 빈칸/rank6)은 앵커 없이 `cell--empty` 실루엣만.
> 이 구분은 색뿐 아니라 **앵커의 랭크/무늬 텍스트 유무**로 판별 가능(색 비의존).

### 5.3 카드 앵커(`card--anchor`) 상세
- 이미지의 "다음 필요 rank" 표현. 회색 카드 위에 요구되는 `{왼쪽.suit, 왼쪽.rank+1}` 를 흐린 무늬색 텍스트로.
- 1열(col 0) 빈 칸의 앵커는 **A(임의 무늬)** 를 요구하므로 무늬 없이 `A` + "임의 무늬" 표기(예: `A ✷`) 또는 회색 `A`.
- 앵커는 힌트일 뿐 실제 카드가 아니며, 클릭 대상은 이동시킬 카드(다른 셀)이다.

### 5.4 컨트롤 (`controls`, `controls__btn`)
| 버튼 | id | aria-label | 시각 |
| --- | --- | --- | --- |
| 설정 | `#btn-settings` | `설정` | 톱니(⚙) 아이콘 + "설정" 텍스트 |
| 카드 섞기 | `#btn-shuffle` | `카드 섞기` | 셔플(⤮) 아이콘 + "셔플" 텍스트 |
| 재시작 | `#btn-restart` | `재시작` | 재시작(⟲) 아이콘 + "재시작" 텍스트 |
- 버튼 = 남색 계열 pill, `--color-hud-text` 라벨. 아이콘은 유니코드 글리프(외부 아이콘 의존 0).
- 키보드 포커스 링 노출(`:focus-visible` outline). 최소 터치 타깃 44×44px 이상.

### 5.5 상태(states) 시각 — **색 비의존, 텍스트로도 노출**
frozen states: `playing` / `selected` / `won` / `shuffle-disabled`.

| 상태 | 트리거 | 시각 | 텍스트/접근성(색 비의존) |
| --- | --- | --- | --- |
| `playing` | 기본 진행 | 보드 활성, HUD 갱신 | 상태 배지 "진행 중" (있을 경우) |
| `selected` | 카드 키보드 포커스/선택 | 해당 `card` 에 강조 outline(굵은 테두리)+살짝 확대 | 카드 접근성 이름에 "선택됨" 포함 + 화면상 outline. 색만이 아닌 **테두리 두께/체크(✓)** 로도 구분 |
| `won` | `checkWin` true | `#win-overlay` 노출(반투명 딥퍼플), 중앙 `.win-banner`, 보드 잠금(비활성 톤) | 배너 텍스트 "승리! 🎉 모든 무늬 정렬 완료" — **텍스트로 명시**. 오버레이 `role` 로 알림 |
| `shuffle-disabled` | 셔플 1회 사용 후 | `#btn-shuffle` 흐림(감소된 대비)+비활성 커서 | `aria-disabled='true'` + 버튼 라벨을 "셔플(사용함)" 로 변경 → **색만이 아닌 텍스트로 비활성 명시**(AC6) |

> **AC(색상 외 텍스트) 준수 핵심**:
> - `won`: 승리 배너에 "승리!" 텍스트 + 정렬 완료 문구를 반드시 화면 텍스트로 표기(색·이모지 단독 금지).
> - `shuffle-disabled`: 버튼에 "사용함"/"비활성" 텍스트 + `aria-disabled='true'` 를 함께 노출(흐림 색상 단독 금지).

---

## 6. dev 구현 가이드 (BF-1856 developer 참조)

> 아래는 frozen §3 계약을 시각으로 옮길 때의 **권장 CSS 변수명/클래스 매핑**이다. selector·token 은 §2/§3 frozen 값 그대로 사용하고,
> 아래 시각 수치(그림자·outline 등)는 파생 표현이므로 픽셀 일치 의무는 없다.

1. **토큰 선언** — `styles.css :root` 에 §2 표의 10개 frozen token 을 **exact HEX/값**으로 선언. 하드코딩 색상 금지, 반드시 `var(--...)` 참조.
2. **레이아웃 골격**(`index.html`, developer 소유) — frozen §3.1 ID 로 `game-root > hud(hud-score/time/moves) > game-board > controls(btn-settings/shuffle/restart) > win-overlay` 구성.
3. **보드 그리드** — `#game-board.board { display:grid; grid-template-columns:repeat(7,1fr); gap:var(--space-card-gap); }`, 셀 `aspect-ratio:5/7; min-width:0;`.
4. **셀 렌더** — 카드=`cell card card--red|card--black`, 앵커=`cell card--anchor`, 빈 칸=`cell cell--empty`. 랭크 1→`A` 매핑.
5. **HUD** — `.hud{background:var(--color-hud-bg);color:var(--color-hud-text)}`, `.hud__stat` 라벨+값 세로 스택. 값 노드에 `#hud-score/#hud-time/#hud-moves`.
6. **컨트롤 접근성** — 각 버튼에 `aria-label` (`설정`/`카드 섞기`/`재시작`). 셔플 사용 후 `#btn-shuffle[aria-disabled="true"]` + 라벨 텍스트 갱신.
7. **selected** — `.card.selected{outline:3px solid; ...}` + 카드 접근성 이름에 "선택됨". Enter/Space 로 이동 실행(카드/빈 칸 `tabindex="0"`).
8. **won** — `#win-overlay` 기본 `hidden`, `won` 시 표시. `.win-banner` 에 "승리!" 문구를 텍스트로. 보드는 상호작용 잠금.
9. **반응형** — `#game-root{max-width:560px;width:100%}`, 320px 에서 가로 overflow 0. 셀은 `1fr`+`aspect-ratio` 로 비율 유지 축소.
10. **접근성 일반** — 모든 상태를 색 외 텍스트/`aria-*` 로 노출(§5.5). 포커스 링(`:focus-visible`) 유지.

> mockup(`docs/design/addiction-mini-mockup.html`)은 **시각 참조 가이드**이며 dev 산출물이 아니다. 픽셀 단위 일치 의무 없음 — 계약값(색/ID/class/접근성)만 준수.

---

## 7. mockup 참조

- 시각 mockup: **`docs/design/addiction-mini-mockup.html`** (본 명세와 동일 저장소 경로, frozen deliverable).
- mockup 은 §2~§5 의 컬러/타이포/레이아웃/상태를 정적으로 표현한다:
  - 메인 `playing` 보드(4×7, 앵커 3종·dead gap 실루엣 포함, HUD SCORE/TIME/MOVES, 3버튼).
  - `상태 변형` 섹션: `selected` 카드, `won` 승리 배너, `shuffle-disabled` 버튼을 각각 별도 `<section>` 으로 시연.
- 이 mockup 은 시안 시각화 전용이며 `iteration-check3/` 실앱과 별개다.

---

## 8. Self-critique (PR 직전 자기 점검)

- **AC 매핑**: 계약 AC(§UI contract)의 4×7 보드·HUD 3종·앵커 회색 카드·빈 칸 실루엣·3버튼·won 배너·shuffle-disabled 를 §2~§5 및 mockup 에 모두 매핑함. ✅
- **dev 구현 가이드**: §6 에 CSS 변수/클래스/ID 매핑 10단계 제공, frozen token exact 준수 명시. ✅
- **기존 요소 보존**: 신규 파일 2건만 추가(additive). frozen selector·token·상태 이름을 **변경/재정의하지 않음**. ✅
- **컴포넌트 매핑**: frozen DOM ID 9개·class 12개·state 4개를 §4~§5 표에 1:1 매핑. ✅
- **모호함 flag**:
  - (F1) **파일 경로**: frozen deliverable 은 `docs/design/addiction-mini-mockup.html`(JIRA-key 접미사 없음)로 명시되어, generic 페르소나 관례(`mockups/<topic>-<KEY>.html`)와 다르다. **frozen 계약 경로를 우선** 적용함. 저장소 선례(`counter-mockup.html`, `delivery-board-mockup.html`)와 일치.
  - (F2) **JIRA 키 표기**: task 는 BF-1855 이나 frozen deliverable 파일명은 `addiction-mini-BF-1854.md`. **frozen deliverable 명명을 그대로 준수**(BF-1854 = epic/blueprint 키).
  - (F3) **첨부 이미지 픽셀**: 실행 환경 scope 가드가 `01-addiction-mini.png` Read 를 차단하여 픽셀 직접 확인 불가. 대신 packet 의 이미지 시각 서술 + frozen token/§3 계약을 근거로 시각화함(색/레이아웃은 frozen 값이 authority 이므로 결과 동등).
  - (F4) 앵커 A(1열) 무늬는 "임의 무늬" 라 mockup 에서 회색 `A` + 중립 심볼로 표기 — developer 는 실제 규칙(`canMove` 1열=임의 Ace)에 맞게 렌더.
