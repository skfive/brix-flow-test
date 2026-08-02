# 네온 스네이크 랭킹 UI 시각 명세 (BF-1540)

> 본 문서는 designer(BF-1540) 산출물로, planner가 동결한 `ui-contract@v1`
> (`docs/plans/implementation-plan.md` §3)의 selector·상태·token·접근성·반응형 계약을
> **재정의하지 않고** 상태별 시각 스타일과 token 매핑만 구체화한다.
> selector·DOM ID·CSS class·상태명·design token 값은 frozen 계약이 유일 권위이며 본 문서는 이를 변경하지 않는다.

- Jira: BF-1540 (designer) · Epic 형제: BF-1543(planner) / BF-1542(developer)
- 대상 route: `/demo/neon-snake-fullscreen-0802`
- 소비 계약: `planning-contract@v1` / `ui-contract@v1` (frozen, blueprint-frozen)
- 대상 stack: `vanilla-static` (외부 의존성 0건, system font, CSS 변수 자체 정의)
- 구현 소유자: developer(BF-1542) — 본 명세는 구현 가이드이며 코드는 developer가 작성한다.

---

## 1. 시안 개요

### 변경 범위
기존 네온 스네이크 풀스크린 게임에 **공유 랭킹 보드**와 **닉네임 입력 → 점수 등록** UI를 추가한다.
게임 캔버스·HUD·기존 레이아웃은 침범하지 않으며(§4.4 보존), 랭킹 UI는 게임 종료 후 노출되는
사이드/하단 패널로 배치된다.

### 사용자 경험 목표
1. 게임 종료 시 플레이어가 닉네임을 입력하고 한 번의 동작(버튼 또는 Enter)으로 점수를 등록한다.
2. 등록 진행 상황(`idle → submitting → success`/`error`)이 **색상뿐 아니라 화면 텍스트**로 항상 드러난다.
3. 서버 오류가 나도 게임 진행과 로컬 최고 점수가 보존되며, 사용자는 즉시 재시도할 수 있다.
4. 스크린리더 사용자와 320px 좁은 화면 사용자 모두 순위 정보를 온전히 읽을 수 있다.

### 계약 준수 원칙 (재정의 금지)
- DOM ID: `snake-ranking-board` / `snake-nickname-input` / `snake-score-submit`
- CSS class: `ranking-board` / `ranking-board__row` / `score-submit`
- 상태: `idle` / `submitting` / `success` / `error`
- design token: `--color-rank-accent=#39ff14` / `--space-ranking-row-gap=8px`

위 값은 planner §3 frozen 계약 그대로다. 본 명세가 추가하는 보조 색상/타이포/spacing 값은
모두 **designer 제안(비동결)** 으로 표시하며, developer가 `index.html`에서 재량으로 조정할 수 있다.

---

## 2. 컬러 팔레트

frozen token은 **강조색과 행 간격 2개**뿐이다. 나머지는 네온 스네이크 기존 톤(어두운 배경 + 네온 강조)에
맞춘 **designer 제안값**으로, developer가 `:root`에 자체 CSS 변수로 정의한다(vanilla-static 규약).

| 역할 | 값 | 구분 |
| --- | --- | --- |
| 랭킹 강조 (상위 순위·강조 텍스트) | `--color-rank-accent: #39ff14` | **frozen** |
| 패널 배경 | `#0a0e12` | 제안 |
| 보드 행 배경 | `#121820` | 제안 |
| 보드 행 배경 (교차 zebra) | `#0e141b` | 제안 |
| 기본 본문 텍스트 | `#e6f2e6` | 제안 |
| 보조/캡션 텍스트 | `#8aa08a` | 제안 |
| 입력 배경 | `#0e141b` | 제안 |
| 입력 테두리 (idle) | `#2a3a2a` | 제안 |
| 입력 테두리 (focus) | `#39ff14` (accent) | 제안 |
| success 텍스트/아이콘 | `#39ff14` (accent) | 제안 |
| error 텍스트/테두리 | `#ff5c5c` | 제안 |
| submitting 진행 표시 | `#ffd23f` | 제안 |
| 비활성(disabled) 버튼 배경 | `#1c2620` | 제안 |
| 비활성(disabled) 버튼 텍스트 | `#5c6b5c` | 제안 |

### 대비(Contrast) 검증
- 본문 `#e6f2e6` on `#0a0e12` ≈ 15:1 (WCAG AAA 통과)
- accent `#39ff14` on `#0a0e12` ≈ 14:1 (대형 텍스트/강조 충분)
- error `#ff5c5c` on `#0a0e12` ≈ 5.4:1 (WCAG AA 통과)
- **색상만으로 상태를 구분하지 않으므로**(§5·§6) 색약 사용자도 텍스트로 상태 인지 가능.

---

## 3. 타이포그래피

vanilla-static 규약에 따라 **system font stack** 사용(외부 폰트 CDN 없음).

```
--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
           "Noto Sans KR", "Malgun Gothic", sans-serif;
```

| 역할 | font-size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 랭킹 패널 제목 (heading) | `20px` | 700 | 1.3 | "랭킹 보드" |
| 순위 숫자 (rank) | `16px` | 700 | 1.2 | 상위 1~3위는 accent 색 |
| 닉네임 (본문) | `15px` | 500 | 1.4 | 12자 초과 없음(계약상 1–12자) |
| 점수 (본문, 숫자) | `15px` | 600 | 1.4 | 우측 정렬, tabular-nums 권장 |
| 상태 텍스트 (status) | `14px` | 600 | 1.4 | idle/submitting/success/error 공통 |
| 캡션/안내 (caption) | `12px` | 400 | 1.4 | 입력 힌트·오류 사유 |

- 숫자 컬럼은 `font-variant-numeric: tabular-nums` 권장(순위/점수 정렬 흔들림 방지).
- 한글 닉네임 대비 라틴/숫자 혼용을 고려해 `Noto Sans KR`/`Malgun Gothic`을 fallback에 포함.

---

## 4. 레이아웃

### 4.1 섹션 구조
```
┌─ 랭킹 패널 (#snake-ranking-board 컨테이너) ────────────┐
│  [제목] 랭킹 보드                                       │
│  ┌─ 랭킹 보드 (.ranking-board, role=table/list) ─────┐ │
│  │  순위 | 닉네임            | 점수                    │ │
│  │  1    | 네온왕            | 1,500   ← accent 강조   │ │  ← .ranking-board__row
│  │  2    | 초록뱀            | 1,320                   │ │
│  │  3    | 사과킬러          | 1,180                   │ │
│  │  …                                                  │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌─ 등록 영역 ────────────────────────────────────────┐ │
│  │ [닉네임 입력 #snake-nickname-input] [등록 .score-submit]│
│  │ [상태 텍스트: 대기 중 / 등록 중… / 등록 완료 / 등록 실패]│
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 spacing
- 랭킹 보드 **행 간격**: `--space-ranking-row-gap: 8px` (**frozen**) — 행과 행 사이 세로 간격.
- 패널 내부 padding: `16px` (제안), 등록 영역 상단 간격: `12px` (제안).
- 행 내부 컬럼 정렬: `순위(고정폭) | 닉네임(가변, flex:1) | 점수(우측 정렬)`.

### 4.3 breakpoint 별 동작
| 뷰포트 | 랭킹 보드 동작 |
| --- | --- |
| `≥ 320px` (필수) | **가로 overflow 없음.** 3컬럼(순위/닉네임/점수) 유지, 닉네임 길면 `text-overflow: ellipsis`로 말줄임. |
| `≥ 480px` | 동일 3컬럼, 폰트/여백 그대로. 등록 영역 입력+버튼 한 줄 유지. |
| 좁은 화면 | 입력+버튼이 한 줄에 안 들어가면 버튼이 입력 아래로 wrap(제안). 보드 자체는 항상 3컬럼 유지. |

- 보드는 **`overflow-x` 미발생**을 위해 고정폭 대신 비율 기반 컬럼(`순위 auto / 닉네임 1fr / 점수 auto`) 사용 권장.
- 가로 스크롤 대신 닉네임 말줄임으로 처리(순위·점수는 항상 완전 노출).

### 4.4 기존 게임 캔버스 보존 (필수)
- 랭킹 UI는 기존 게임 캔버스 레이아웃과 breakpoint를 **침범·재정의하지 않는다**.
- 랭킹 패널 추가로 캔버스 크기/위치/기존 HUD가 변하지 않아야 한다(planner §3.7-2).

---

## 5. 컴포넌트 명세 (상태별 시각 계약)

4개 상태(`idle`/`submitting`/`success`/`error`)는 **색상만으로 구분하지 않고**, 상태명을
**화면 텍스트 + 접근성 이름** 양쪽으로 노출한다(planner §3.4·§3.6-5). 아래 표의 "색상 외 표시"가
색약/스크린리더 사용자를 위한 비색상 단서다.

### 5.1 상태 매트릭스

| state | 화면 텍스트(frozen) | 색상 | 색상 외 표시 (비활성/로딩/안내) | `#snake-score-submit` | `#snake-nickname-input` |
| --- | --- | --- | --- | --- | --- |
| `idle` | `대기 중` | 보조 텍스트 `#8aa08a` | 상태 텍스트 "대기 중" 상시 노출. 입력 placeholder "닉네임 입력" 안내. | **활성** (기본 라벨 "랭킹 등록") | 활성·편집 가능, 커서 입력 대기 |
| `submitting` | `등록 중…` | 진행색 `#ffd23f` | 버튼 라벨 옆 **로딩 스피너(●●● 점 애니메이션 또는 회전 인디케이터)** + 텍스트 "등록 중…". 스피너는 `prefers-reduced-motion` 시 정적 "…"로 대체. | **비활성**(disabled) — 배경 `#1c2620`, 텍스트 `#5c6b5c`, `cursor:not-allowed` | 비활성(readonly/disabled) — 중복 편집 방지 |
| `success` | `등록 완료` | accent `#39ff14` | 상태 텍스트 "등록 완료" + **체크 아이콘(✓)** 텍스트 병기. 등록된 행이 보드에 하이라이트로 삽입. | **재활성** — 다시 등록 가능 상태로 복귀 | 재활성(다음 등록 대비, 값 유지 또는 초기화는 developer 재량) |
| `error` | `등록 실패 — 다시 시도` | error `#ff5c5c` | 상태 텍스트 "등록 실패 — 다시 시도" + **경고 아이콘(⚠)** 텍스트 병기 + 실패 사유 캡션(예: 검증 메시지). | **재활성** — 즉시 재시도 가능(§5.4) | 재활성·편집 가능, 입력값 보존 |

> 화면 텍스트 4종(`대기 중`/`등록 중…`/`등록 완료`/`등록 실패 — 다시 시도`)은 planner §3.4 frozen 값 그대로이며 변경 금지.
> 아이콘/스피너/색상은 텍스트를 **보완**할 뿐 대체하지 않는다(텍스트 제거 금지).

### 5.2 랭킹 보드 (`#snake-ranking-board` / `.ranking-board`)
- **시맨틱**: 목록/표 시맨틱으로 순위 정보를 스크린리더에 노출(planner §3.6-4).
  권장: `<table>` + `<caption>`(예: "스네이크 랭킹") + `<th scope="col">순위/닉네임/점수`,
  또는 `role="list"` + 각 행 `role="listitem"`에 순위 텍스트 명시.
- 각 행 `.ranking-board__row`: `순위 · 닉네임 · 점수` 3요소. 행 간격 `--space-ranking-row-gap: 8px`.
- **상위 1~3위 강조**: 순위 숫자를 `--color-rank-accent`(#39ff14)로 강조(1위 가장 진하게).
  단, 색상 강조에만 의존하지 않도록 순위 숫자 텍스트("1", "2", "3")를 항상 노출.
- **빈 보드**: 저장 점수가 없으면(§API `GET`→`{ "scores": [] }`) 보드 자리에
  안내 텍스트 "**아직 등록된 점수가 없습니다**"를 표시(오류 아님, error 상태와 구분).

### 5.3 랭킹 로딩 실패 (board load error — 필수)
`GET /api/snake/scores` 조회가 서버 `5xx`/네트워크 오류로 실패하면 보드 영역에
**"랭킹을 불러올 수 없습니다"** 텍스트를 error 색(`#ff5c5c`) + 경고 아이콘(⚠)과 함께 표시한다.
- 이 로딩 실패도 `error` 상태 표현에 포함되며, **게임 진행과 localStorage 최고 점수는 보존**된다(§5.4).
- 복구: 실패 표시 후 상태·진행 표시를 **초기값 `idle`로 되돌리고**, `#snake-score-submit`(랭킹 등록 버튼)과
  Enter 제출을 **다시 사용할 수 있게** 재활성화한다(planner §3.8). 사용자는 재시도(재조회/재등록)할 수 있다.
- 등록(POST) 실패 텍스트(`등록 실패 — 다시 시도`)와 조회(GET) 실패 텍스트(`랭킹을 불러올 수 없습니다`)는
  **문맥이 다른 별개 메시지**로, 둘 다 노출한다(등록 상태줄 vs 보드 영역).

### 5.4 상태 후조건 / 보존 (필수)
- 초기화·취소·실패(`error`/board load error) 뒤에는 상태와 진행 표시를 **초기값 `idle`로 복원**하고,
  주 실행 control(`#snake-score-submit` / Enter 제출)을 **다시 사용할 수 있어야 한다**(planner §3.8).
- **보존 영역 제약**: 서버 오류(네트워크 실패/`5xx`) 시 게임 진행은 유지되고 클라이언트 localStorage
  최고 점수는 보존된다. 랭킹 제출/조회 실패가 게임 상태나 로컬 저장 점수를 손상·초기화하지 않는다.

### 5.5 닉네임 입력 (`#snake-nickname-input`)
- `aria-label="닉네임"`(frozen), placeholder "닉네임 입력"(제안).
- 클라이언트 검증은 **UX 보조**일 뿐 권위 아님(권위는 서버, planner §4.3). 시각적으로는 1–12자를
  넘는 입력에 대해 `maxlength=12` 힌트/캡션 안내 권장.
- **Enter 키 제출**: 입력 포커스 상태에서 Enter로 랭킹 등록 제출 가능(frozen §3.6-3).
- focus 시 테두리를 accent(`#39ff14`)로 강조 + `outline`으로 키보드 포커스 가시성 확보.

### 5.6 랭킹 등록 버튼 (`#snake-score-submit` / `.score-submit`)
- `aria-label="랭킹 등록"`(frozen). 기본 라벨 텍스트 "등록"(제안).
- 상태별 활성/비활성은 §5.1 표를 따른다: `submitting`에서만 비활성, 그 외(idle/success/error) 활성.
- disabled 시 `aria-disabled` 및 `disabled` 속성 반영, 시각적으로도 저채도 배경으로 비활성 인지.

---

## 6. dev 구현 가이드 (developer BF-1542 참조)

> developer는 `demo/neon-snake-fullscreen-0802/index.html`(DOM+token)과 `ranking.js`(상태 전이)에서
> 아래를 구현한다. **본 명세는 픽셀 단위 일치 의무가 없는 시각 가이드**이며, frozen selector/token/상태만 필수다.

### 6.1 CSS 변수 정의(`:root`, vanilla-static 자체 정의)
```css
:root {
  /* frozen — 변경 금지 */
  --color-rank-accent: #39ff14;
  --space-ranking-row-gap: 8px;

  /* designer 제안 — developer 재량 조정 가능 */
  --color-rank-bg: #0a0e12;
  --color-rank-row: #121820;
  --color-rank-text: #e6f2e6;
  --color-rank-muted: #8aa08a;
  --color-rank-error: #ff5c5c;
  --color-rank-progress: #ffd23f;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", sans-serif;
}
```

### 6.2 권장 클래스/구조
- 컨테이너: `<section id="snake-ranking-board" class="ranking-board" ...>` — 표/목록 시맨틱 포함.
- 행: `.ranking-board__row` — `row-gap: var(--space-ranking-row-gap)` 적용.
- 버튼: `<button id="snake-score-submit" class="score-submit" aria-label="랭킹 등록">등록</button>`.
- 입력: `<input id="snake-nickname-input" aria-label="닉네임" maxlength="12" placeholder="닉네임 입력">`.
- 상태 텍스트 영역: `aria-live="polite"`로 상태 전이 시 스크린리더에 상태명 자동 안내 권장.

### 6.3 상태 전이 매핑(§5.1 표 기준)
| 트리거 | 전이 | 화면 반영 |
| --- | --- | --- |
| 최초/초기화 | → `idle` | 상태 "대기 중", 버튼 활성, 입력 활성 |
| 버튼/Enter 제출 | `idle` → `submitting` | 상태 "등록 중…", 버튼 disabled+스피너, 입력 비활성 |
| `POST` 201 | `submitting` → `success` | 상태 "등록 완료"+✓, 보드에 등록 행 하이라이트, 버튼 재활성 |
| `POST` 4xx/5xx·네트워크 | `submitting` → `error` | 상태 "등록 실패 — 다시 시도"+⚠+사유, 버튼 재활성, 입력값 보존 |
| `GET` 실패 | 보드 영역 error | 보드 "랭킹을 불러올 수 없습니다"+⚠, 이후 `idle` 복원·재시도 가능 |

### 6.4 필수 준수 체크(구현 시)
- [ ] frozen DOM ID 3개 / CSS class 3개 / 상태명 4개 / token 2개 그대로 사용.
- [ ] 상태 4종 화면 텍스트 정확히 노출(색상만으로 구분 금지).
- [ ] `aria-label` 2개, Enter 제출, 보드 표/목록 시맨틱.
- [ ] 320px overflow 0건, 기존 캔버스 레이아웃 유지.
- [ ] 서버 오류 시 게임 진행·localStorage 보존, `idle` 복원 후 재시도 가능.

---

## 7. mockup 참조

본 task(BF-1540)는 frozen work packet의 acceptance criteria에 따라 **시각 명세 범위를
`docs/design/snake-ranking-BF-1539.md` 단일 문서로 한정**하며, **런타임 HTML/CSS/JS를 생성하지 않는다**.
따라서 별도 mockup HTML 파일은 산출하지 않는다.

- 실제 렌더링 산출물(`demo/neon-snake-fullscreen-0802/index.html`)은 developer(BF-1542) 소유이며,
  본 명세의 §4~§6 레이아웃/컴포넌트/상태 가이드를 참조해 구현한다.
- 시각 표현은 위 §4 ASCII 레이아웃과 §5 상태 매트릭스로 대체한다.

---

## 8. 수용 기준(AC) 매핑

| AC | 충족 위치 |
| --- | --- |
| frozen selector·token·상태 재정의 없이 시각 산출물 확정 | §1 계약 준수 원칙, §2·§5 frozen 표기, §6.1 CSS |
| idle/submitting/success/error 각 상태 텍스트 + 색상 외 표시(비활성/로딩/안내) 명세 | §5.1 상태 매트릭스, §6.3 전이 매핑 |
| error 상태에 '랭킹을 불러올 수 없습니다' + 랭킹 등록 버튼 재활성·idle 복원 | §5.3 랭킹 로딩 실패, §5.4 후조건 |
| 시각 명세 범위 `docs/design/snake-ranking-BF-1539.md`, 런타임 HTML/CSS/JS 미생성 | §7 mockup 참조(단일 md 한정) |
