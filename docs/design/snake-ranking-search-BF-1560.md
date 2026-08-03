# 닉네임 검색 UI 시각 명세 (snake ranking search)

- Jira Epic: BF-1560 (닉네임 검색)
- designer task: BF-1561
- 상태: 실행 설계(frozen blueprint)의 **시각 명세** — selector·상태·token·접근성·반응형을 시각으로 렌더링
- 대상: `demo/neon-snake-fullscreen-0802` 네온 스네이크 랭킹 영역에 additive 삽입되는 닉네임 검색 UI
- 선행 계약: `docs/plans/snake-ranking-search-BF-1560.md` (planner, frozen)

> 이 문서는 frozen UI 계약(selector·상태·token·접근성·반응형)을 **시각으로 표현**한다.
> 파일 소유권/상태/selector/token 의 유일한 권위는 frozen blueprint 이며 본 문서는 이를
> **재정의하지 않는다**. developer 는 §6 구현 가이드와 §7 mockup 을 참조하되 selector·token·
> 상태 텍스트는 frozen 값 그대로 사용한다.

---

## 1. 시안 개요

### 변경 범위 (additive only)

기존 네온 스네이크 랭킹 보드(BF-1548) 인접에 **닉네임 검색 UI** 를 추가한다. 사용자가 자신의
닉네임을 입력하고 "내 순위 찾기" 를 누르면, 해당 닉네임의 순위·점수·기록 시각을 한 줄로 본다.

- 검색 UI 는 **추가 컴포넌트** 다. 기존 랭킹 목록·기간 토글·점수 저장·게임 루프·localStorage
  최고 기록 DOM/이벤트를 재정의하지 않는다 (planner §2 보존 규칙).
- 신규 selector/상태/token 만 정의하며, 기존 `snake-rank` 랭킹 보드 selector 와 **분리**된다.

### 사용자 경험 목표

- **즉시 조회**: 닉네임 입력 → 버튼 1회 → 한 줄 결과. 페이지 이동·게임 방해 없음.
- **명확한 상태 피드백**: idle/searching/found/not-found/error 5개 상태를 색상뿐 아니라
  **화면 텍스트**로 구분해 스크린리더·색각 이상 사용자도 상태를 안다.
- **좁은 화면 대응**: 320px 폭에서도 입력창·버튼이 가로 overflow 없이 배치되고, 결과 한 줄이
  넘치지 않게 줄바꿈/축약된다.

---

## 2. 컬러 팔레트

frozen design token 3종은 **값·의미를 변경하지 않는다** (planner §4.4). 나머지는 기존
neon-snake 테마를 계승한 **비 frozen 보조 색상** 으로, 시각 톤 일치용이다.

| 역할 | 토큰 / 변수 | HEX | frozen | 용도 |
| --- | --- | --- | --- | --- |
| primary (action) | `--color-action-primary` | `#22d3ee` | ✅ | "내 순위 찾기" submit 주 액션 색 / found 강조 |
| error (feedback) | `--color-feedback-error` | `#f87171` | ✅ | not-found·error 피드백 색 |
| background (page) | `--page-bg` | `#050510` | — | 페이지 배경(기존 neon-snake 계승) |
| surface (검색 패널) | `--search-surface` | `#0a0f14` | — | 검색 컨테이너 배경 |
| text | `--text` | `#eef2ff` | — | 기본 본문 텍스트 |
| text-dim | `--text-dim` | `rgba(238,242,255,0.7)` | — | placeholder·부가 정보 |
| border | `--search-border` | `rgba(34,211,238,0.3)` | — | 입력창·컨테이너 테두리(primary 파생) |

- **색상 단독 의미 전달 금지**: not-found·error 는 `--color-feedback-error` 색과 **화면 텍스트**
  ("해당 닉네임의 기록이 없습니다", "검색 중 오류가 발생했습니다") 를 **병기**한다.
- found 는 `--color-action-primary` 로 순위·점수를 강조하되, 상태 자체는 텍스트("내 순위")로 노출.

---

## 3. 타이포그래피

외부 폰트 의존 없이 system font stack 사용(기존 neon-snake 계승, `vanilla-static` 규약).

| 요소 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 섹션 제목("내 순위 검색") | `"Segoe UI", system-ui, -apple-system, sans-serif` | 1.1rem | 700 | 1.3 |
| 입력창 텍스트 / placeholder | 동일 | 1rem (≥16px, 모바일 확대 방지) | 400 | 1.4 |
| submit 버튼 라벨 | 동일 | 1rem | 700 | 1.2 |
| 결과 한 줄 | 동일 | 0.95rem | 600 (순위·점수 700) | 1.4 |
| 상태/안내 텍스트 | 동일 | 0.9rem | 600 | 1.3 |

- 결과의 순위·점수는 `font-variant-numeric: tabular-nums` 로 자릿수 정렬.

---

## 4. 레이아웃

### 4.1 섹션 구조

검색 UI 는 단일 컨테이너(`.rank-search`) 안에 **검색 폼(입력창 + 버튼)** 과 **결과 영역**
2블록으로 구성된다. 기존 랭킹 보드 인접(위 또는 아래)에 additive 로 배치된다.

```
.rank-search  (컨테이너)
├─ 제목 "내 순위 검색"
├─ 검색 폼 (가로 배치, --space-control-gap=12px)
│   ├─ #rank-search-input   (닉네임 입력창, flex:1)
│   └─ #rank-search-submit  (.rank-search__submit "내 순위 찾기")
└─ #rank-search-result (.rank-search__result)  ← 상태별 텍스트 렌더 영역
```

### 4.2 spacing

- 입력창–버튼 간격: `--space-control-gap` = **12px** (frozen).
- 폼–결과 영역 간격: 12px.
- 컨테이너 내부 padding: 12px.

### 4.3 breakpoint 별 동작

| 폭 | 폼 배치 | 결과 한 줄 |
| --- | --- | --- |
| ≥ 480px | 입력창 + 버튼 한 줄(가로), 입력창 `flex:1` | 순위·닉네임·점수·시각 한 줄 유지 |
| 320px ~ 479px | `flex-wrap` — 버튼이 다음 줄로 내려갈 수 있으나 가로 overflow 없음 | 세그먼트가 `flex-wrap` 으로 줄바꿈, 닉네임 `ellipsis` 축약 |
| < 320px | (지원 하한 320px) 동일 규칙, 최소 폭에서도 overflow 없음 | 동일 |

- 입력창은 `min-width:0` 으로 flex 컨테이너 안에서 축소 가능 → 가로 overflow 방지.
- 버튼은 `white-space:nowrap` + `flex-shrink:0` 으로 라벨 유지.

---

## 5. 컴포넌트 명세

### 5.1 검색 컨테이너 — `.rank-search`

| 항목 | 값 |
| --- | --- |
| DOM | `<section class="rank-search" aria-label="닉네임 검색 영역">` |
| 상태 | 없음(레이아웃 컨테이너). 내부 결과 영역이 상태를 표현 |
| 인터랙션 | 없음 |

### 5.2 닉네임 입력창 — `#rank-search-input`

| 항목 | 값 |
| --- | --- |
| DOM | `<input id="rank-search-input" type="text" aria-label="닉네임 검색" placeholder="닉네임" maxlength="12">` |
| props | `aria-label="닉네임 검색"` (frozen), `placeholder`, `maxlength="12"` (계약 2~12자 상한) |
| 상태 | 기본 / focus(`:focus-visible` outline) / disabled(`searching` 중) |
| 인터랙션 | Enter 키로 submit 트리거(선택) · 입력값이 submit 요청의 `nickname` 파라미터 |

### 5.3 "내 순위 찾기" submit — `#rank-search-submit` / `.rank-search__submit`

| 항목 | 값 |
| --- | --- |
| DOM | `<button id="rank-search-submit" class="rank-search__submit" type="button" aria-label="내 순위 찾기">내 순위 찾기</button>` |
| props | `aria-label="내 순위 찾기"` (frozen: 명시적 aria-label), 라벨 텍스트 "내 순위 찾기" |
| 상태 | 활성(idle/found/not-found/error) / 비활성 `disabled`(searching 중 — 중복 submit 방지) |
| 색 | 배경 `--color-action-primary` (#22d3ee), 글자 `--page-bg` |
| 인터랙션 | 클릭 → `GET /api/snake/scores/search?nickname=&mode=single` 호출 → 상태 전이 |

### 5.4 결과 영역 — `#rank-search-result` / `.rank-search__result`

상태별로 아래 화면 텍스트를 렌더한다. `role="status"` + `aria-live="polite"` 로 상태 변화를
스크린리더에 안내. `min-height` 를 두어 idle(빈 텍스트) 에서도 레이아웃 흔들림 방지.

| 상태 | 트리거 | 화면 텍스트 | 색 / 표현 |
| --- | --- | --- | --- |
| `idle` | 초기 / 입력 대기 | (비어 있음, 또는 "닉네임을 입력하고 내 순위를 찾아보세요" 안내) | text-dim, submit 활성 |
| `searching` | submit 클릭 후 응답 대기 | "검색 중…" (진행 표시) | text-dim, submit `disabled` · 중복 submit 무시 |
| `found` | 200 응답 | "**1위** · 박기획 · **1234점** · 2026-08-03 12:00" (순위·닉네임·점수·기록 시각 한 줄) | 순위·점수 `--color-action-primary` 강조 |
| `not-found` | 404 응답 | "해당 닉네임의 기록이 없습니다" | `--color-feedback-error` + 텍스트 병기 |
| `error` | 400 / 네트워크 오류 | "검색 중 오류가 발생했습니다" | `--color-feedback-error` + 텍스트 병기 |

- **found 한 줄 구성**: 순위(`N위`) · 닉네임 · 점수(`N점`) · 기록 시각. 닉네임은 좁은 화면에서
  `text-overflow:ellipsis` 로 축약, 나머지 세그먼트는 `flex-wrap` 으로 줄바꿈되어 overflow 방지.
- **복구**: 초기화/취소/실패(`not-found`·`error`) 후 상태·진행 표시를 `idle` 로 되돌리고 submit
  을 다시 사용할 수 있어야 한다(planner §4.3 후조건, AC-5).

### 5.5 상태 전이 다이어그램

```
        submit 클릭
 idle ───────────────► searching
  ▲                       │
  │                       ├─ 200 ─► found      ─┐
  │                       ├─ 404 ─► not-found  ─┤
  │                       └─ 400/네트워크 ─► error ┤
  │                                               │
  └──── 재입력 / 재submit(idle 복귀 후 재검색) ◄────┘
      (searching 중 추가 submit 은 무시 — 중복 요청 방지)
```

---

## 6. dev 구현 가이드 (developer 참조 — frozen 값 그대로)

> selector·상태 텍스트·token 은 **frozen 값 그대로** 사용한다. 아래는 시각 명세를 코드로
> 옮길 때의 권장 구조이며, 픽셀 단위 일치 의무는 없다(mockup 은 시각 시뮬레이션).

1. **컨테이너 마크업** — 기존 랭킹 보드 인접에 additive 삽입:
   ```html
   <section class="rank-search" aria-label="닉네임 검색 영역">
     <h3>내 순위 검색</h3>
     <div class="rank-search__form">   <!-- 폼 래퍼(선택), gap: --space-control-gap -->
       <input id="rank-search-input" type="text" aria-label="닉네임 검색"
              placeholder="닉네임" maxlength="12" />
       <button id="rank-search-submit" class="rank-search__submit" type="button"
               aria-label="내 순위 찾기">내 순위 찾기</button>
     </div>
     <p id="rank-search-result" class="rank-search__result"
        role="status" aria-live="polite"></p>
   </section>
   ```
2. **CSS 변수 정의** (기존 `:root` 에 additive, 값 변경 금지):
   ```css
   :root {
     --color-action-primary: #22d3ee;
     --color-feedback-error: #f87171;
     --space-control-gap: 12px;
   }
   .rank-search__form { display: flex; flex-wrap: wrap; gap: var(--space-control-gap); }
   #rank-search-input { flex: 1; min-width: 0; font-size: 1rem; }  /* ≥16px, min-width:0 = overflow 방지 */
   .rank-search__submit {
     flex-shrink: 0; white-space: nowrap;
     background: var(--color-action-primary); color: var(--page-bg);
   }
   .rank-search__result { min-height: 1.3em; }   /* idle 빈 텍스트에서도 흔들림 방지 */
   .rank-search__result--found  { /* 순위·점수 강조: color: var(--color-action-primary) */ }
   .rank-search__result--error  { color: var(--color-feedback-error); }  /* 색은 보조 — 텍스트 병기 */
   ```
3. **상태 렌더** — 5개 상태의 화면 텍스트를 `#rank-search-result` 에 세팅:
   - `idle`: 빈 텍스트(또는 안내), submit `disabled=false`
   - `searching`: "검색 중…", submit `disabled=true` (중복 submit 무시)
   - `found`: "N위 · 닉네임 · N점 · 기록시각" 한 줄, submit 활성 복귀
   - `not-found`: "해당 닉네임의 기록이 없습니다" (frozen 텍스트)
   - `error`: "검색 중 오류가 발생했습니다" (frozen 텍스트)
4. **접근성**: 입력창 `aria-label="닉네임 검색"`, 버튼 `aria-label="내 순위 찾기"`, 결과 영역
   `role="status"` + `aria-live="polite"`. 상태는 색상 단독이 아닌 **화면 텍스트+접근성 이름**으로 노출.
5. **반응형**: 320px 폭에서 입력창(`flex:1; min-width:0`)+버튼(`flex-shrink:0; nowrap`)이 가로
   overflow 없이 배치. 결과 세그먼트는 `flex-wrap`, 닉네임은 `ellipsis` 축약.
6. **보존**: 기존 `snake-rank*` 랭킹 보드 selector·이벤트, `GET /api/snake/scores`, POST 저장,
   게임 루프, localStorage 최고 기록을 수정하지 않는다(planner §2, AC-6).

---

## 7. mockup 참조

시각 시뮬레이션(실제 dev 산출물 아님):

- **경로**: `docs/design/mockups/snake-ranking-search-BF-1560.html`
- 5개 상태(idle/searching/found/not-found/error)를 갤러리로 나란히 비교.
- frozen selector·token·상태 텍스트·접근성·반응형(320px)을 그대로 표현.
- 상태는 색상만이 아니라 화면 텍스트로 구분됨을 시각으로 확인 가능.
