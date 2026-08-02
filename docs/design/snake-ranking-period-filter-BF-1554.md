# 랭킹 기간 토글 시각 명세 (BF-1554)

- 상태: active (designer 시각 명세 — planner frozen UI 계약을 렌더)
- 작성: designer(이디자인) · BF-1555
- 소비: developer(BF-1556), reviewer, tester
- 근거 계약(read-only):
  - `docs/plans/snake-ranking-period-filter-BF-1554.md` §4 (frozen ui-contract@v1)
  - `demo/neon-snake-fullscreen-0802/src/ranking.js` (기존 보드 컨트롤러·`statusText` 계층)
  - `demo/neon-snake-fullscreen-0802/src/scores-api.js` (기존 조회/저장 계층)
- 원칙: 이 문서는 planner가 **동결한 selector·token·상태·접근성·반응형 계약을 그대로 렌더**한다. selector/token/상태 모델을 **재정의·추가하지 않는다**. 이번 변경은 기존 랭킹 보드에 **additive**로만 얹힌다.

> **범위 결정(scope note)**: 본 task의 acceptance criteria는 *"시각 명세 범위는 `docs/design/snake-ranking-period-filter-BF-1554.md`이며 런타임 HTML/CSS/JS를 생성하지 않는다"* 로 못박혀 있고, frozen deliverable도 이 단일 markdown 하나다. 따라서 상태별 mockup은 **이 문서 안의 인라인 ASCII 와이어프레임**으로 렌더하며, 별도 `.html` mockup 파일은 생성하지 않는다(런타임/시뮬레이션 코드 생성 금지 계약 준수). §11 참조.

---

## 1. 시안 개요

### 1.1 변경 범위
게임 종료 랭킹 보드 상단에 **기간 필터 토글**(`전체` / `최근 7일`) control을 **additive**로 추가한다. 토글 선택에 따라 랭킹 보드 리스트(`ranking-board-list`)가 해당 기간의 상위 10위로 다시 렌더된다.

- **추가되는 것**: 기간 토글 control 1개(옵션 2개), 토글–보드 사이 상태 표현(idle/loading/success/error).
- **보존되는 것**: 기존 닉네임 입력·"랭킹 등록" 버튼·순위 행(`snake-rank__row`) 렌더·게임 로직·POST 저장·`localStorage` 최고 기록. 기존 selector·design token은 재정의하지 않는다.

### 1.2 사용자 경험 목표
1. 플레이어는 게임을 마친 뒤 **한 번의 탭/클릭**으로 랭킹 기준 기간을 바꿔 볼 수 있다.
2. 조회 중(loading)·실패(error)가 **색상만이 아니라 화면 텍스트로도** 분명히 드러난다.
3. 실패 후에도 토글은 **다시 선택 가능**하며, 상태·진행 표시는 초기값으로 되돌아간다.
4. `320px` 폭의 좁은 화면에서도 **가로 스크롤 없이** 토글과 보드를 사용할 수 있다.

---

## 2. 컬러 팔레트

### 2.1 이번 시안이 정의하는 토큰 (frozen — 값 변경 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-ranking-toggle-active` | `#39ff14` | 선택된 토글 옵션의 강조색(네온 그린) — 텍스트/보더/underline |
| `--color-ranking-toggle-idle` | `#94a3b8` | 비선택 토글 옵션의 기본색(중립 회색) |
| `--space-ranking-toggle-gap` | `8px` | 토글 옵션 간 간격 |

### 2.2 상태 표현에 재사용하는 색 (기존 보드 팔레트 — 재정의 금지)

토글 자체 토큰 외 배경/본문 텍스트/에러 강조색은 **기존 네온 스네이크 보드의 팔레트를 그대로 상속**한다. 이번 시안은 이 값들을 새로 정의하지 않는다.

| 역할 | 참조 | 비고 |
| --- | --- | --- |
| 배경 | 기존 종료 화면/보드 배경(어두운 네온 테마) | 재정의 금지 |
| 본문 텍스트 | 기존 보드 텍스트 색 | 순위 행·상태 텍스트에 사용 |
| error 강조 | 기존 보드의 경고/실패 표현 색 | **색만으로 구분 금지** — 반드시 텍스트 동반(§6.4) |

> 색 대비: `--color-ranking-toggle-active(#39ff14)`와 `--color-ranking-toggle-idle(#94a3b8)`는 어두운 배경 위에서 명도차가 크므로 선택/비선택 구분이 색약 환경에서도 유지된다. 단, 접근성 계약(§7)에 따라 선택 상태는 색 외에 `aria-pressed`와 활성 클래스로도 노출한다.

---

## 3. 타이포그래피

vanilla-static stack 규약(외부 의존성 0건·system font)에 따라 **system font stack**을 사용한다. 새 웹폰트를 도입하지 않는다.

| 역할 | font-family | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 토글 옵션 라벨 | system-ui, -apple-system, Segoe UI, Roboto, sans-serif | 14px | 600(선택) / 500(비선택) | 1.2 | 선택 시 굵기 상향으로 색 외 구분 보강 |
| 보드 순위 행 | 위와 동일 | 15px | 500 | 1.4 | 기존 `snake-rank__row` 텍스트 규칙 유지 |
| 상태 텍스트(loading/error) | 위와 동일 | 13px | 500 | 1.4 | idle에서는 표시 안 함 |

- 라벨 텍스트: `전체` / `최근 7일`(옵션 라벨은 한국어 그대로).
- 숫자·기간 표기는 본문 폰트를 그대로 사용(별도 monospace 미도입).

---

## 4. 레이아웃

### 4.1 섹션 구조 (위 → 아래)

```
[ 랭킹 기간 토글  #ranking-period-toggle ]   ← 신규(additive)
[ 상태 텍스트 영역 (loading/error 시)     ]   ← 신규(additive)
[ 랭킹 보드 리스트  #ranking-board-list   ]   ← 기존 보드(순위 행 컨테이너)
[ 닉네임 입력 + "랭킹 등록" 버튼          ]   ← 기존(보존, 변경 없음)
```

- 토글은 보드 리스트 **위**에 놓아, 기간을 먼저 고르고 결과를 아래에서 확인하는 자연스러운 시선 흐름을 만든다.
- 상태 텍스트는 토글과 보드 **사이**에 위치해, 어떤 조회가 진행/실패 중인지 즉시 인지된다.

### 4.2 spacing

| 구간 | 값 | 토큰 |
| --- | --- | --- |
| 토글 옵션 간 간격 | `8px` | `--space-ranking-toggle-gap` |
| 토글 ↔ 상태 텍스트 | 8px | (기존 보드 spacing 스케일 상속) |
| 상태 텍스트 ↔ 보드 리스트 | 8px | (동일) |

### 4.3 breakpoint 별 동작

| 폭 | 토글 레이아웃 | 보드 |
| --- | --- | --- |
| ≥ 480px | 옵션 2개 가로 1행 배치, 좌측 정렬 | 기존 리스트 레이아웃 유지 |
| 320px ~ 479px | 폭 부족 시 옵션 **줄바꿈 허용**(2행 가능), `--space-ranking-toggle-gap` 유지 | 리스트 레이아웃 유지, **가로 overflow 없음** |

- 토글 컨테이너는 `flex-wrap`을 허용해 좁은 폭에서 옵션이 줄바꿈되어도 보드 레이아웃이 흐트러지지 않는다(§8 반응형 계약).

---

## 5. 컴포넌트 명세

### 5.1 기간 토글 컨테이너 — `#ranking-period-toggle`

| 항목 | 값 |
| --- | --- |
| DOM ID | `ranking-period-toggle` |
| CSS class | `ranking-toggle` |
| role | `radiogroup` |
| aria-label | `랭킹 기간 선택` |
| 자식 | 옵션 2개(`#ranking-period-all`, `#ranking-period-7d`) |
| 키보드 | 좌/우 화살표로 옵션 간 이동(§7) |

### 5.2 토글 옵션 (2개)

| 항목 | 전체 | 최근 7일 |
| --- | --- | --- |
| DOM ID | `ranking-period-all` | `ranking-period-7d` |
| CSS class | `ranking-toggle__option` (+선택 시 `ranking-toggle__option--active`) | 동일 |
| 라벨 텍스트 | `전체` | `최근 7일` |
| period 값 | `all` | `7d` |
| aria-pressed | `true`(선택) / `false`(비선택) | 동일 |
| 초기 선택 | ✅ 기본 선택(active) | 비선택 |

**props / 상태 모델 (컴포넌트 관점 — frozen 상태 계약 §6과 매핑)**

| prop / 상태 | 타입 | 설명 |
| --- | --- | --- |
| `selectedPeriod` | `'all' \| '7d'` | 현재 선택된 기간. 초기값 `'all'`. |
| `boardState` | `'idle' \| 'loading' \| 'success' \| 'error'` | 보드 조회 상태(§6). |
| 선택 표시 | class + aria | 선택 옵션에 `ranking-toggle__option--active` **및** `aria-pressed="true"`. |

**인터랙션**

1. 옵션 클릭/탭 또는 화살표 이동 후 선택 → `selectedPeriod` 갱신 → 해당 `period`로 조회 시작(`loading`).
2. 선택 옵션에 `ranking-toggle__option--active` 부여, 다른 옵션에서는 제거(동시에 한 옵션만 active).
3. 조회 성공 시 `ranking-board-list`를 해당 기간 상위 10위로 재렌더(`success`).
4. 조회 실패 시 `error` 텍스트 표시, 토글은 **재선택 가능 상태 유지**.

### 5.3 랭킹 보드 리스트 — `#ranking-board-list`

| 항목 | 값 |
| --- | --- |
| DOM ID | `ranking-board-list` |
| 내용 | 상위 10위 순위 행(기존 `snake-rank__row` 렌더 규칙 상속) |
| success·항목 0건 | 빈 리스트(행 0개) + `success` (에러 아님) |

---

## 6. 상태별 시각 명세 (idle → loading → success / error)

상태 전이: `idle → loading → success` 또는 `idle → loading → error`. 초기화·취소·실패 뒤에는 **idle 초기값으로 복원**되고 토글을 다시 사용할 수 있다(frozen §4.2).

> 아래 ASCII 와이어프레임은 시각 시뮬레이션이다. `[전체]`처럼 대괄호로 감싼 옵션이 선택(active)된 상태이며, 실제 강조는 `--color-ranking-toggle-active(#39ff14)` + 굵기 상향 + `ranking-toggle__option--active`로 표현한다.

### 6.1 idle (초기값)
초기 진입. 진행 표시 없음. 기본 선택은 `전체`.

```
┌───────────────────────────────────────────┐
│  랭킹 기간 선택                              │  ← role=radiogroup, aria-label
│  ┌────────┐   ┌────────────┐               │
│  │ [전체] │   │  최근 7일   │               │  [전체]=active(#39ff14), 최근 7일=idle(#94a3b8)
│  └────────┘   └────────────┘               │  gap = 8px
│                                             │  (상태 텍스트 없음)
│  1위 · PLAYER1 · 980                        │  #ranking-board-list
│  2위 · PLAYER2 · 940                        │
│  3위 · PLAYER3 · 900                        │
│  …                                          │
└───────────────────────────────────────────┘
```
- aria: `#ranking-period-all` `aria-pressed="true"`, `#ranking-period-7d` `aria-pressed="false"`.

### 6.2 loading (조회 중)
토글에서 기간을 선택하면 해당 period 조회가 시작된다. 진행을 **텍스트로** 노출한다.

```
┌───────────────────────────────────────────┐
│  랭킹 기간 선택                              │
│  ┌────────┐   ┌──────────────┐             │
│  │  전체  │   │ [최근 7일]    │             │  [최근 7일]=active 로 전환
│  └────────┘   └──────────────┘             │
│                                             │
│  ⏳ 랭킹을 불러오는 중…                       │  ← 상태 텍스트(색 외 텍스트로 진행 노출)
│                                             │
│  (직전 보드 유지 또는 자리표시 — 깜빡임 최소) │
└───────────────────────────────────────────┘
```
- loading 중 토글은 **비활성화하지 않아도 되나**, 진행 상태가 명확해야 한다(상태명을 텍스트로 노출).
- 상태 텍스트 예: `랭킹을 불러오는 중…` (스크린리더에도 동일 텍스트 노출).

### 6.3 success (성공)
선택 기간의 상위 10위가 렌더된다. `7d`에서 7일 이내 기록이 0건이면 **빈 보드 + success**(에러 아님).

```
┌───────────────────────────────────────────┐
│  랭킹 기간 선택                              │
│  ┌────────┐   ┌──────────────┐             │
│  │  전체  │   │ [최근 7일]    │             │
│  └────────┘   └──────────────┘             │
│                                             │  (상태 텍스트 없음 → idle 표시로 복귀)
│  1위 · WEEKHERO · 720                       │  #ranking-board-list (7일 이내 상위 10)
│  2위 · FRESH · 610                          │
│  …                                          │
└───────────────────────────────────────────┘

  ── 7d 결과 0건인 경우 ──
│  최근 7일 기록이 없습니다                    │  ← 빈 상태 텍스트(선택), 상태는 success
```

### 6.4 error (실패)
조회 실패(400/네트워크). **색상 외에 반드시 `'랭킹을 불러올 수 없습니다'` 텍스트를 화면에 표시**한다(frozen §4.4 · 기존 `statusText('error')` 반환값과 동일).

```
┌───────────────────────────────────────────┐
│  랭킹 기간 선택                              │
│  ┌────────┐   ┌──────────────┐             │
│  │  전체  │   │ [최근 7일]    │             │  토글은 재선택 가능 상태 유지
│  └────────┘   └──────────────┘             │
│                                             │
│  ⚠ 랭킹을 불러올 수 없습니다                 │  ← error 텍스트(필수 문구, 색만으로 구분 금지)
│                                             │
│  (보드 리스트는 비거나 직전 상태 유지)        │
└───────────────────────────────────────────┘
```
- **필수 문구**: `랭킹을 불러올 수 없습니다` (정확히 이 텍스트 — 기존 `ranking.js`의 `statusText` `case 'error'` 반환값과 일치).
- error 텍스트는 화면 텍스트 **및** 접근성 이름(스크린리더)으로 모두 노출한다.
- error 후 토글을 다시 누르면 `loading`으로 재시도 가능(상태·진행 표시 초기화).

### 6.5 상태 → 화면 표현 매핑 표

| 상태 | 화면 텍스트 | 색 표현 | 접근성 이름 | 토글 사용 |
| --- | --- | --- | --- | --- |
| idle | (없음) | 선택=active색, 비선택=idle색 | `aria-pressed` 반영 | 가능 |
| loading | `랭킹을 불러오는 중…` | 선택 강조 유지 | 진행 텍스트 노출 | 가능 |
| success | (없음, 7d 0건 시 안내 선택) | 순위 행 기본색 | 순위 행 텍스트 | 가능 |
| error | `랭킹을 불러올 수 없습니다` | 경고색 + **텍스트 필수** | 오류 텍스트 노출 | 가능(재선택) |

> **색만으로 구분 금지 계약**: 모든 상태는 상태명/안내를 화면 텍스트와 접근성 이름으로 노출한다. 색은 보조 신호일 뿐, 유일한 신호가 아니다.

---

## 7. 접근성 (frozen §4.4 그대로)

| 요구 | 구현 지침 |
| --- | --- |
| 토글 컨테이너 role | `#ranking-period-toggle`에 `role="radiogroup"` |
| 토글 컨테이너 이름 | `aria-label="랭킹 기간 선택"` |
| 옵션 선택 상태 | 각 옵션에 `aria-pressed="true|false"` (선택=true) |
| 키보드 이동 | **좌/우 화살표 키**로 옵션 간 포커스 이동, Enter/Space로 선택 확정 |
| error 텍스트 | 색상 외에 `랭킹을 불러올 수 없습니다` 텍스트를 화면에 표시 |
| 색 비의존 | 모든 상태를 색만으로 구분하지 않고 상태명을 화면 텍스트 + 접근성 이름으로 노출 |

- 선택된 옵션은 `aria-pressed="true"` **와** `ranking-toggle__option--active` 클래스를 **동시에** 갖는다(프로그램적·시각적 이중 노출).
- 화살표 이동으로 포커스가 옮겨간 옵션은 포커스 링이 보이도록 하고(기존 포커스 스타일 상속), 선택 확정 시 조회를 트리거한다.

---

## 8. 반응형 (frozen §4.5 그대로)

| 요구 | 지침 |
| --- | --- |
| 320px 이상 overflow 없음 | 토글·보드 리스트 모두 `320px` 폭에서 **가로 스크롤 발생 금지** |
| 좁은 폭 줄바꿈 | 토글 컨테이너 `flex-wrap` 허용 → 옵션이 2행으로 줄바꿈되어도 `--space-ranking-toggle-gap(8px)` 유지 |
| 보드 레이아웃 유지 | 토글이 줄바꿈되어도 `#ranking-board-list` 순위 행 레이아웃은 흐트러지지 않음 |

```
── 320px 폭 (옵션 줄바꿈 예시) ──
┌──────────────────────────┐
│ 랭킹 기간 선택            │
│ ┌────────┐               │
│ │ [전체] │               │  ← 폭 부족 시
│ └────────┘               │
│ ┌──────────────┐         │
│ │  최근 7일     │         │  ← 다음 행으로 줄바꿈(gap 8px 유지)
│ └──────────────┘         │
│                          │
│ 1위 · PLAYER1 · 980      │  ← 보드 레이아웃 유지, 가로 overflow 없음
│ 2위 · PLAYER2 · 940      │
└──────────────────────────┘
```

---

## 9. dev 구현 가이드 (developer BF-1556 대상)

> 아래는 developer가 `index.html`/`ranking.js`/`scores-api.js`에 **additive**로 구현할 때의 권장 지침이다. selector·token 이름은 frozen 값 그대로 사용하고 재정의하지 않는다.

### 9.1 마크업 (index.html — additive)
- 보드 리스트 위에 토글 컨테이너 추가:
  - `<div id="ranking-period-toggle" class="ranking-toggle" role="radiogroup" aria-label="랭킹 기간 선택">`
  - 옵션 2개(시맨틱 `<button>` 권장):
    - `<button id="ranking-period-all" class="ranking-toggle__option ranking-toggle__option--active" aria-pressed="true">전체</button>`
    - `<button id="ranking-period-7d" class="ranking-toggle__option" aria-pressed="false">최근 7일</button>`
- 순위 행 컨테이너에 `id="ranking-board-list"` 부여(기존 보드 요소에 additive로 id 연결, 기존 행 렌더 규칙 유지).

### 9.2 CSS 변수 (additive `:root`)
```css
:root {
  --color-ranking-toggle-active: #39ff14;
  --color-ranking-toggle-idle: #94a3b8;
  --space-ranking-toggle-gap: 8px;
}
.ranking-toggle { display: flex; flex-wrap: wrap; gap: var(--space-ranking-toggle-gap); }
.ranking-toggle__option { color: var(--color-ranking-toggle-idle); font-weight: 500; }
.ranking-toggle__option--active { color: var(--color-ranking-toggle-active); font-weight: 600; }
```
- 위 값은 **frozen 토큰 값 그대로**다. 값 변경 금지.

### 9.3 상태·조회 배선 (ranking.js — additive)
1. 옵션 선택 시 `selectedPeriod`(`'all'|'7d'`) 갱신 → `boardState='loading'` → 해당 period로 조회.
2. 조회는 기존 `fetchScores(fetchImpl, { mode, limit })`에 **`period`를 추가 전달**한다(기존 `mode`/`limit` 의미 불변, additive — plan §3).
3. 성공 → `renderEntries`로 `#ranking-board-list` 재렌더 → `boardState='success'`.
4. 실패 → `boardState='error'` → `statusText('error')`(`랭킹을 불러올 수 없습니다`) 표시. 토글 재선택 가능 유지.
5. 선택 옵션에 `ranking-toggle__option--active` + `aria-pressed="true"` 부여, 다른 옵션은 제거/`false`.
6. 좌/우 화살표 키 핸들러로 옵션 포커스 이동 + Enter/Space 선택.

### 9.4 보존 영역 (수정 금지 — plan §9)
- 게임 규칙·충돌·tick, POST 저장(`submitScore`/`post`)·멱등 upsert, `localStorage` 최고 기록.
- 기존 selector·design token, `statusText` 반환 문구.

---

## 10. AC 매핑

| 계약 AC(plan §6) | 본 시각 명세 반영 위치 |
| --- | --- |
| AC-5 토글 UI 상태(loading→success, active/aria-pressed) | §5.2, §6.1~6.3, §6.5 |
| AC-4 잘못된 값 → UI error | §6.4, §6.5 |
| AC-6 접근성(radiogroup/aria-label/aria-pressed/화살표) | §5.1, §7 |
| AC-6 반응형(320px overflow 없음/줄바꿈) | §4.3, §8 |
| AC-7 보존 영역 | §1.1, §9.4 |
| 색만으로 구분 금지 + error 텍스트 | §2.2, §6.4, §6.5, §7 |

---

## 11. mockup 참조

- 본 task의 acceptance criteria(*"런타임 HTML/CSS/JS를 생성하지 않는다"*)와 frozen deliverable(단일 markdown)에 따라, 상태별 mockup은 **이 문서 §6·§8의 인라인 ASCII 와이어프레임**으로 렌더했다.
- 별도 `docs/design/mockups/*.html` 파일은 생성하지 않는다(계약상 시뮬레이션 코드 산출 금지).
- developer는 §6 상태별 표현과 §9 구현 가이드를 참조 가이드로 사용하되, 픽셀 단위 일치 의무는 없다(frozen selector·token·상태·접근성·반응형 계약 준수가 기준).
