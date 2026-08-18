# 랭킹 보드 · 시각 명세 (BF-1531)

> designer 산출물 (BF-1531). 이 문서는 planner 가 동결한 **frozen blueprint**
> (`ui-contract@v1`) 를 **시각 명세**로 구체화한다. selector·token·상태·접근성·반응형을
> **재정의하지 않고** 그대로 시각화하며, 런타임 HTML/CSS/JS 는 생성하지 않는다.
> 실행 설계·소유권의 유일한 권위는 frozen blueprint 와
> `docs/plans/snake-ranking-BF-1534.md` (planner) 다.
>
> - **소비 계약**: `ui-contract@v1`
>   (`sha256:9720307c8b46b8a264c96c2ad418c09398b0617a0c28383531e2de7651a4a1cb`)
> - **대상 데모**: `demo/neon-snake-fullscreen-0802/` (vanilla ESM, 정적 서빙)
> - **구현 소유자**: developer(BF-1533) — `ranking.js` / `ranking.css` / `index.html` /
>   `tests/ranking.test.js`, API 는 `src/routes/snakeScores.js` (모두 additive). 본 문서는
>   시각 명세만 제공한다.
> - **mockup 참조**: `docs/design/snake-ranking-mockup-BF-1530.html`
> - **선행 시각 명세**: 최고 기록 보드(`docs/design/snake-highscore-BF-1513.md`)와 공존한다.
>   랭킹 보드는 서버 기반 상위 10위이며, localStorage 최고 기록 보드와 독립적으로 표시된다.

---

## 1. 시안 개요

### 변경 범위 (additive)

시작(모드 선택) 화면과 게임 종료 화면에 **서버 기반 랭킹 보드**를 시각적으로 추가한다.
플레이어는 닉네임을 입력해 이번 점수를 서버에 등록하고, 모드별 상위 10위를 조회해 확인한다.
기존 HUD·상태 배너·승패 배너·모드/난이도 메뉴·게임 캔버스·localStorage 최고 기록 보드는
**그대로 보존**한다. 랭킹 보드는 이들 위에 얹히는 신규 오버레이 컴포넌트다.

- **추가되는 것**: `#ranking-board` 컨테이너와 그 하위 상위 10위 목록(`.rank-board__row`),
  닉네임 입력(`#nickname-input`), 랭킹 등록 control(`#rank-submit`), 상태 텍스트/오류 메시지.
- **보존되는 것**: `.hud-bar`, `#status-banner`, `#winner-banner`, `.mode-menu` /
  `.difficulty-menu`, `#snake-board` 캔버스, `#snake-highscore-board`(최고 기록 보드).
  랭킹 보드는 이들의 위치·동작을 바꾸지 않는다.

### 사용자 경험 목표

- 게임이 끝나면 **모드별 상위 10위**를 한눈에 보고 자신의 순위를 즉시 가늠한다.
- **닉네임을 입력해 이번 점수를 등록**하고, 등록 직후 갱신된 순위에서 자신의 위치를 확인한다.
- 조회 중(`loading`)·등록 중(`submitting`) 상태를 **색이 아닌 화면 텍스트**로 명확히 인지한다.
- 등록에 실패(잘못된 닉네임·네트워크 오류)해도 **오류 메시지가 스크린리더에 즉시 announce**
  되고, 입력·등록 control 을 다시 사용해 재시도할 수 있다.
- 오프라인/서버 오류가 나도 **게임 흐름과 localStorage 최고 기록은 영향받지 않는다**.
- 색맹·스크린리더 사용자도 **색이 아닌 화면 텍스트와 접근성 이름**으로 모든 상태를 구분한다.

---

## 2. 컬러 팔레트

랭킹 보드 전용 컬러는 frozen `ui-contract@v1` §5.3 의 exact 값이며 **재정의하지 않는다**.
배경·기본 텍스트는 기존 데모(`index.html` `:root`)의 값을 그대로 상속한다.

| 역할 | 토큰 | HEX | 용도 |
| --- | --- | --- | --- |
| accent (랭킹 강조) | `--color-rank-accent` | `#39ff14` | 상위 순위 숫자·내 등록 행 강조 네온 그린 |
| error (오류 상태) | `--color-rank-error` | `#ff4d4d` | `error` 상태 메시지·경계 네온 레드 |
| background (상속) | `--color-bg` | `#0a0a12` | 데모 전역 배경 (기존) |
| text (상속) | — | `#f4f4ff` | 보드 기본 텍스트(순위·닉네임·점수 라벨) |
| text-muted (상속) | — | `rgba(244,244,255,0.72)` | 보조 라벨·상태 안내 텍스트(기존 controls-hint 톤과 일치) |

- **accent(`#39ff14`) 주의**: 이 값은 통합 런타임의 CPU 모드 **1P(사람) 뱀 색(`--color-player1`)**,
  그리고 최고 기록 보드 accent(`--color-scoreboard-accent`)와 동일한 네온 그린이다. 의도된
  일관성으로 "내 성과"를 사람 플레이어 색과 시각적으로 연결한다. developer 는 이 토큰을 **새로
  정의하지 말고** frozen 값을 그대로 사용한다.
- **대비**: `#39ff14`·`#ff4d4d` 모두 `#0a0a12` 배경 위에서 굵은 텍스트 기준 충분한 대비를
  확보한다. 색은 **강조 수단**일 뿐이며 상태 구분은 항상 화면 텍스트가 담당한다(§7).

---

## 3. 타이포그래피

폰트 패밀리는 기존 데모의 system stack 을 **상속**한다(외부 의존성 0건, vanilla-static 규약).

```
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
```

| 요소 | selector | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 보드 제목 | `.rank-board` 헤더 | 16px | 700 | 1.3 | "랭킹 (1인 vs CPU)" 등 모드 라벨 포함 |
| 순위 행 | `.rank-board__row` | 15px | 600 | 1.4 | 순위·닉네임·점수 3열 |
| 순위 숫자 | 행 내 순위 | 15px (상속) | 800 | 1.4 | 1~3위 강조 색 권장, `tabular-nums` |
| 점수 값 | 행 내 점수 | 15px (상속) | 700 | 1.4 | `font-variant-numeric: tabular-nums`(자릿수 흔들림 방지) |
| 상태 텍스트 | 상태 라인 | 13px | 600 | 1.3 | "불러오는 중"·"등록 중"·"등록 완료" 등 |
| 오류 메시지 | `role="alert"` 라인 | 13px | 700 | 1.3 | `--color-rank-error` |
| 닉네임 입력 | `#nickname-input` | 15px | 600 | 1.3 | placeholder "닉네임 (1~12자)" |
| 등록 버튼 | `#rank-submit` | 15px | 700 | 1 | "랭킹 등록" |

- 순위·점수 숫자는 `tabular-nums` 로 자릿수 변화 시 폭이 흔들리지 않게 한다.
- 반응형에서 축소가 필요하면 §5 참조(토큰 값 자체는 변경하지 않고 미디어쿼리로 조정 여지만 명시).

---

## 4. 레이아웃

### 4.1 배치 위치

랭킹 보드는 게임 캔버스 위에 얹히는 **오버레이**다. 시작 화면과 종료 화면에서 노출되고,
플레이 중에는 비활성(`aria-hidden`)이다.

- **시작(mode-selection) 화면**: 모드 메뉴(`.mode-menu`, 화면 중앙)를 **가리지 않도록**
  화면 측면(우측 또는 하단)에 상위 10위 조회 결과를 표시한다(선택적, `idle`). mockup 은
  독립 카드로 상위 10위를 제시한다.
- **종료(game-over) 화면**: 승패 배너(`#winner-banner`)·최고 기록 보드(`#snake-highscore-board`)
  와 겹치지 않도록, 상위 10위 목록과 닉네임 입력·등록 control 을 세로로 쌓아 배치한다.
- **z-index**: 모드 메뉴(z-index 5)·승패 배너(z-index 6)·최고 기록 보드(z-index 7)와
  충돌하지 않는 값으로 두되, HUD·캔버스 위에는 보이도록 한다. 구체 z-index 는 developer 가
  기존 stacking(§ index.html)과 충돌하지 않게 결정한다. 랭킹 보드는 입력·클릭을 받아야 하므로
  최고 기록 보드와 달리 `pointer-events` 를 활성화한다.

### 4.2 내부 구조 (컨테이너 → 항목)

```
#ranking-board .rank-board                        (랭킹 보드 컨테이너)
├── .rank-board__header                            "랭킹 (1인 vs CPU)" 모드 라벨 (권장, 클래스 자유)
├── .rank-board__list                              상위 10위 목록 컨테이너 (세로 스크롤 영역)
│   └── .rank-board__row  × 최대 10                순위 · 닉네임 · 점수 (한 행)
│         └─ 내 등록 행: .rank-board__row--me (권장, 강조)
├── .rank-board__status                            상태 텍스트 라인 ("불러오는 중"/"등록 중"/"등록 완료")
├── (입력 영역)
│   ├── #nickname-input                            닉네임 입력 (aria-label="닉네임 입력")
│   └── #rank-submit .rank-submit                  랭킹 등록 (aria-label="랭킹 등록")
└── .rank-board__error  role="alert"               error 상태에서만 메시지 노출
```

- id(`ranking-board`, `nickname-input`, `rank-submit`)와 class(`rank-board`, `rank-board__row`,
  `rank-submit`)는 **frozen 이며 변경 금지**. 그 외 하위 클래스(`__header`/`__list`/`__status`/
  `__error`/`__row--me`)는 developer 구현 자유도가 있는 **권장 명명**이다.

### 4.3 spacing

- 상위 10위 행 간 세로 간격: **`--space-rank-row-gap` = 8px** (frozen 토큰).
- 컨테이너 외곽 padding: 12px 16px 권장(HUD `.hud-bar` padding 과 시각 통일, 토큰 아님).
- 목록(`.rank-board__list`)은 `display: flex; flex-direction: column;
  gap: var(--space-rank-row-gap);` 로 행을 세로 정렬한다(권장 — selector·gap 토큰은 고정).
- 각 행(`.rank-board__row`)은 `순위 / 닉네임 / 점수` 3열을 `display: flex; justify-content:
  space-between;` 또는 grid 로 정렬한다(권장). 닉네임이 길면 `text-overflow: ellipsis` 로
  잘라 overflow 를 방지한다.

### 4.4 breakpoint 별 동작

| 뷰포트 | 동작 |
| --- | --- |
| ≥ 480px (기본) | 측면/하단 오버레이 카드, 15px 행 텍스트, 행 8px 간격, 목록 최대 높이 내 세로 스크롤 |
| 320–479px | 좌우 padding 축소, `max-width: calc(100dvw - 24px)` 로 overflow 방지. 닉네임 입력·등록 버튼을 세로로 쌓음(가로 폭 부족 시). 토큰 값은 유지 |
| portrait(세로) | 상위 10위 목록에 `max-height` + `overflow-y: auto` 적용해 화면 밖 잘림 없이 세로 스크롤로 접근. 승패 배너·모드 메뉴와 세로 간격 확보 |

- **frozen 반응형 계약(§5.5)**: 320px 이상에서 보드 content overflow 가 없고, 상위 10개
  항목은 세로 스크롤로 접근 가능하다. 위 표는 이를 만족하는 시각 가이드이며 계약을 **넘어서는
  새 breakpoint 를 추가하지 않는다**.

---

## 5. 컴포넌트 명세

각 컴포넌트의 selector·상태·접근성은 frozen 이며 **변경 금지**. 아래는 상태별 표현을 명세한다.

### 5.1 랭킹 보드 컨테이너 — `#ranking-board` (`.rank-board`)

| 속성 | 값 |
| --- | --- |
| 역할 | 상위 10위 목록 + 상태 라인 + 닉네임 입력·등록 control + 오류 메시지를 담는 컨테이너 |
| 노출 상태 | idle / loading / submitting / success / error 에서 노출(시작·종료 화면) |
| 비활성 상태 | playing 에서 `aria-hidden="true"` + 시각적으로 숨김 |
| 상태 표기 | 현재 상태를 `.rank-board__status` 화면 텍스트로도 노출(색만으로 구분하지 않음) |

### 5.2 상위 10위 행 — `.rank-board__row`

| 속성 | 값 |
| --- | --- |
| 구성 | 순위(1-based) · 닉네임 · 점수 3열 |
| 개수 | 최대 10행 (`GET /api/snake-scores` 결과, `score DESC, created_at ASC`) |
| 강조 | 방금 등록한 내 행은 `.rank-board__row--me`(권장)로 accent(`#39ff14`) 강조 |
| 색 | 라벨/닉네임 `#f4f4ff`, 순위 숫자 상위(1~3위) accent 권장, 점수 `tabular-nums` |
| 이스케이프 | 닉네임 렌더 시 HTML 이스케이프는 클라이언트(`ranking.js`) 책임(planner §4.2) |
| 빈 목록 | 해당 모드 기록 없음 → "아직 등록된 기록이 없습니다" 안내 행(빈 상태, 오류 아님) |

### 5.3 닉네임 입력 — `#nickname-input`

| 속성 | 값 |
| --- | --- |
| 요소 | `<input type="text">` |
| 접근성 | `aria-label="닉네임 입력"` (frozen §5.4) |
| placeholder | "닉네임 (1~12자)" (권장 — 검증 규칙 planner §4.2: trim 후 1~12자, 제어문자 금지) |
| 상태 | loading/submitting 중에는 비활성 가능(권장), error 후에는 다시 사용 가능(후조건) |

### 5.4 랭킹 등록 control — `#rank-submit` (`.rank-submit`)

| 속성 | 값 |
| --- | --- |
| 요소 | `<button type="button">` |
| 텍스트 | "랭킹 등록" |
| 접근성 | `aria-label="랭킹 등록"` (frozen §5.4) |
| 비활성 | loading·submitting 상태에서 `disabled`(중복 제출 방지) |
| 재사용 | success·error·취소 이후 `idle` 로 복원되어 다시 사용 가능(후조건 복원, planner §7) |

### 5.5 상태 라인 / 오류 메시지 — `.rank-board__status` / `.rank-board__error`

| 속성 | 값 |
| --- | --- |
| 상태 텍스트 | idle="" 또는 안내 / loading="불러오는 중" / submitting="등록 중" / success="등록 완료" |
| 오류 메시지 | error 상태에서 `.rank-board__error` 를 `role="alert"` 로 노출(예: "닉네임을 확인하세요", "등록에 실패했습니다. 다시 시도해 주세요") |
| 색 | 상태 텍스트 muted, 오류 메시지 `--color-rank-error`(#ff4d4d) |
| 접근성 | 오류는 `role="alert"` 로 스크린리더에 즉시 announce(frozen §5.4) |

### 5.6 상태 매트릭스 (frozen §5.2 — 5개 상태)

| 상태 | 상위 10위 목록 | `#nickname-input` | `#rank-submit` | 상태/오류 텍스트 |
| --- | --- | --- | --- | --- |
| **idle** | 표시(직전 조회 결과) | 사용 가능 | 사용 가능 | 안내 or 없음 |
| **loading** | (조회 중, 스켈레톤/이전 목록 유지) | 사용 가능 | **비활성** | "불러오는 중" 텍스트 |
| **submitting** | (직전 목록 유지) | **비활성**(권장) | **비활성** | "등록 중" 텍스트 |
| **success** | **갱신된 상위 10위**(내 행 강조) | 사용 가능(초기화) | 사용 가능 | "등록 완료" 텍스트 → idle 복원 |
| **error** | 직전 목록 유지 | **사용 가능**(재시도) | **사용 가능**(재시도) | `role="alert"` 오류 메시지 |

### 5.7 인터랙션 / 상태 전이 시각 규칙

- **종료 진입(game-over)**: 해당 모드 상위 10위를 조회한다(`loading` → 목록 표시 후 `idle`).
  닉네임 입력·등록 control 을 노출한다.
- **등록 클릭(`#rank-submit`)**: 입력값 1차 검증(공백/길이) 후 `submitting` 진입(버튼 비활성,
  "등록 중" 텍스트) → 성공 시 `success`(갱신 목록·내 행 강조, "등록 완료") 후 `idle` 복원 /
  실패 시 `error`(`role="alert"` 메시지, 입력·버튼 재사용).
- **오류 후 재시도**: `error` 에서 입력·등록 control 을 다시 사용할 수 있고, 재클릭 시
  `submitting` 으로 재진입한다.
- **취소/실패 이후 복원**: 상태·진행 표시를 `idle` 로 되돌리고 `#rank-submit` 을 재활성화한다
  (planner §7 후조건). 정적 mockup 에서는 5개 상태를 별도 카드로 나란히 제시한다(애니메이션
  필수 아님 — 색·텍스트로 충분히 구분).

---

## 6. dev 구현 가이드 (developer / BF-1533)

> developer 는 `index.html`(마크업)·`ranking.css`(스타일)·`ranking.js`(상태·fetch 배선)을
> **additive** 로 구현한다. 아래는 시각 명세를 코드로 옮길 때의 권장 지침이며, **selector·token·
> 상태·접근성 텍스트는 고정**이다.

1. **토큰 정의**: 랭킹 토큰은 이미 `index.html` `:root` 에 정의돼 있지 않다면 아래 frozen 3개
   토큰을 **그대로** 추가한다(재정의 금지). 정의 위치는 `index.html` `:root` 또는 `ranking.css`
   중 프로젝트 규약에 맞게(중복 정의 금지).
   ```css
   :root {
     --color-rank-accent: #39ff14; /* 랭킹 강조 (네온 그린) */
     --color-rank-error: #ff4d4d;  /* 오류 상태 (네온 레드) */
     --space-rank-row-gap: 8px;    /* 보드 행 간격 */
   }
   ```
2. **마크업**: `.snake-stage` 안에 아래 골격을 추가한다(위치·하위 클래스명 권장, id·frozen class 고정).
   ```html
   <section id="ranking-board" class="rank-board" role="group" aria-label="랭킹 보드" hidden>
     <header class="rank-board__header">랭킹</header>
     <ol class="rank-board__list">
       <li class="rank-board__row"><span>1</span><span>네온장인</span><span>320</span></li>
       <!-- … 최대 10행 … -->
     </ol>
     <p class="rank-board__status" role="status" aria-live="polite"></p>
     <input id="nickname-input" type="text" aria-label="닉네임 입력" placeholder="닉네임 (1~12자)" />
     <button id="rank-submit" class="rank-submit" type="button" aria-label="랭킹 등록">랭킹 등록</button>
     <p class="rank-board__error" role="alert" hidden></p>
   </section>
   ```
3. **CSS 클래스**: `.rank-board`(컨테이너, pointer-events 활성), `.rank-board__list`
   (flex column, gap `var(--space-rank-row-gap)`, `max-height` + `overflow-y: auto`),
   `.rank-board__row`(순위/닉네임/점수 정렬, 닉네임 ellipsis), `.rank-submit`(등록 버튼,
   `:disabled` 스타일), `.rank-board__error`(`color: var(--color-rank-error)`).
4. **상태 배선(planner §6 hook)**: `handleGameOver()` 종료 진입 시 `GET /api/snake-scores?mode=`
   로 상위 10위 조회(`loading`→`idle`). `#rank-submit` 클릭 시 클라이언트 1차 검증 후
   `POST /api/snake-scores`(`submitting`) → 응답 `entries` 로 목록 갱신(`success`) 또는 오류
   노출(`error`). API 계약은 planner §3 준수.
5. **상태별 노출 토글**: playing 진입 시 `aria-hidden="true"` + 시각 숨김. 상태 전이 시
   `.rank-board__status` 텍스트와 `#rank-submit` `disabled` 를 §5.6 매트릭스대로 갱신한다.
   상태는 색이 아닌 화면 텍스트("불러오는 중"/"등록 중"/"등록 완료"/오류 메시지)로 구분한다.
6. **접근성**: `#nickname-input` `aria-label="닉네임 입력"`, `#rank-submit`
   `aria-label="랭킹 등록"`, 오류 메시지 `role="alert"` 를 마크업에 고정한다. 상태명은 화면
   텍스트와 접근성 이름으로 함께 노출한다.
7. **반응형**: 320–479px 에서 `max-width: calc(100dvw - 24px)` + 입력/버튼 세로 스택,
   목록 `max-height` + `overflow-y: auto` 로 상위 10개 세로 스크롤 접근(§4.4). 토큰 값 자체는
   미디어쿼리에서 바꾸지 않는다.
8. **불변 보장(planner §7)**: 기존 게임 규칙·tick·충돌 판정·localStorage 최고 기록 로직을
   변경하지 않는다. 랭킹 실패(오프라인·5xx)는 게임 흐름에 영향을 주지 않는다.

> **픽셀 일치 의무 없음**: mockup 은 시안 시각화이며 dev 산출물이 아니다. developer 는
> selector·token·상태 텍스트·접근성·반응형 계약을 만족하는 범위에서 구현 자유도를 갖는다.

---

## 7. 접근성 명세 (frozen §5.4 준수)

- `#nickname-input` 은 `aria-label="닉네임 입력"` 을 가진다.
- `#rank-submit` control 은 `aria-label="랭킹 등록"` 을 가진다.
- `error` 상태 메시지는 `role="alert"` 로 스크린리더에 즉시 announce 된다.
- 모든 상태(idle/loading/submitting/success/error)는 **색상만으로 구분하지 않는다**.
  "불러오는 중" / "등록 중" / "등록 완료" / 오류 메시지 화면 텍스트와 접근성 이름으로 각 상태를
  노출한다.
- 등록 실패 여부는 오류 색(레드)뿐 아니라 `role="alert"` 오류 메시지 텍스트로 구분된다.
- 랭킹 강조 색(그린)은 강조 수단이며, 순위·점수 값은 항상 화면 텍스트로 읽힌다.
- 상태 라인은 `role="status"` `aria-live="polite"` 로 조회/등록 진행을 스크린리더에 알린다(권장).

---

## 8. mockup 참조

- **파일**: `docs/design/snake-ranking-mockup-BF-1530.html`
- **내용**: frozen 컬러/타이포/레이아웃을 그대로 반영한 self-contained HTML(외부 의존성 0건).
  5개 상태(idle / loading / submitting / success / error)를 `<section>` 카드로 나란히 제시하고,
  빈 목록·내 등록 행 강조·320px 반응형 표현을 별도 프레임으로 시각화한다.
- **성격**: 시안 시각화 전용. dev 의 실제 산출물이 아니며 픽셀 단위 일치 의무는 없다.
</content>
</invoke>
