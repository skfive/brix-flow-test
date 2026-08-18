# 종료 준비 상태 안내 영역 — 시각 명세 (BF-1329)

> 상태: **frozen UI 계약 구현본** · Designer packet: `design` (BF-1329)
> 소비 계약: `planning-contract@v1`, `ui-contract@v1` (producer: planner / BF-1331)
> 실행 설계 권위: `docs/plans/implementation-plan-BF-1328.md` (§3 UI 계약 동결값)
> 본 문서는 planner가 **동결한** selector·상태·token·접근성·반응형 계약을 **시각 산출물로 구현**한다.
> selector/token/상태/파일 소유권을 **재정의하지 않으며**, additive 시각 명세만 추가한다.

---

## 1. 시안 개요

Planning 화면에 **종료 준비 상태 안내 영역**을 추가한다. 운영자가 Planning을 종료해도 되는지를 한눈에
확인할 수 있도록 **상태 배지 · blocker 수 · 조치 링크**를 노출한다.

### 1.1 변경 범위 (additive)
- 신규 시각 영역: 상태 배지(`planning-closure__badge`) + blocker 수(`planning-closure__count`) + 조치 링크(`planning-closure__action`).
- 기존 Planning 화면 DOM/스크립트/문서는 **삭제·재작성하지 않는다**. 상태 영역 노드만 추가 마운트한다.
- 데이터는 기존 Planning Dossier GET 응답을 **읽기 전용(additive)** 으로 소비 (신규 schema/endpoint 없음).

### 1.2 사용자 경험 목표
1. 운영자가 화면을 열면 **상태 확인 중(loading)** → 조회 완료 시 결과 상태로 자동 전이.
2. 상태는 **색상만으로 구분하지 않고** 배지 안 화면 텍스트 + 접근성 이름으로 상태명을 항상 노출.
3. `blocked`일 때 남은 blocker 수를 즉시 확인하고, 필요한 경우 **조치 링크**로 후속 조치 이동.
4. 실패/초기화 후에는 초기값(loading→재조회)으로 복귀하고 조치 control을 다시 사용할 수 있다.

---

## 2. 컬러 팔레트 (frozen token — 재정의 금지)

planner가 §3.4에서 동결한 값만 사용한다. **신규 색상 정의·HEX 재정의 금지.**

| 토큰 | HEX | 용도 | 적용 상태 |
| --- | --- | --- | --- |
| `--color-status-ready` | `#16a34a` | 종료 가능(성공) 배지 강조 | `ready` |
| `--color-status-blocked` | `#dc2626` | 종료 불가/조치 필요/실패 배지 강조 | `blocked`, `needs-operator-action`, `error` |
| `--color-status-neutral` | `#64748b` | 중립(조회 중/데이터 없음) 배지 강조 | `loading`, `empty` |

- 배지 텍스트 대비: 상태 색상은 배지 좌측 상태 점(dot)과 텍스트 강조에 사용하고, 본문 텍스트는
  기본 텍스트색(아래 §3)을 유지해 **색맹 사용자도 텍스트로 상태를 읽을 수 있게** 한다.
- 상태 색상은 배경 fill이 아닌 **점 + 좌측 보더 강조**로 적용해 저대비 배경 위 가독성을 확보한다.

> ⚠️ 위 3개 토큰 외 상태 색상을 추가하지 않는다. `needs-operator-action`/`error`는
> `blocked`와 동일하게 `--color-status-blocked`를 공유하되 **화면 텍스트로 구분**한다.

---

## 3. 타이포그래피

vanilla-static 규약에 따라 **system font stack** 사용 (외부 폰트 의존성 0건).

```
--font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              "Helvetica Neue", Arial, "Apple SD Gothic Neo",
              "Noto Sans KR", sans-serif;
```

| 역할 | font-size | font-weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 상태 배지(badge) | 15px | 600 | 1.3 | 상태명 화면 텍스트 |
| blocker 수(count) | 13px | 500 | 1.4 | 예: "blocker 3건" |
| 조치 링크(action) | 14px | 600 | 1.4 | 밑줄 + 포커스 링 |
| 보조 설명(caption) | 12px | 400 | 1.5 | 상태 부연(선택) |

- 기본 텍스트색: `#0f172a` (slate-900 계열), 보조 텍스트색: `#475569`.
- 최소 폰트 15px(배지)로 320px 화면에서도 축소 없이 읽히게 한다.

---

## 4. 레이아웃

### 4.1 섹션 구조

```
#planning-closure-status  (aria-live="polite")   ← 상태 영역 루트(라이브 리전)
└─ .planning-closure                              ← 컨테이너 (flex, gap = --space-panel-gap)
   ├─ .planning-closure__badge                    ← [● 상태점] 상태명 텍스트
   ├─ #planning-closure-blocker-count .planning-closure__count  ← blocker 수 (blocked 시 노출)
   └─ #planning-closure-action .planning-closure__action        ← 조치 링크/버튼
```

- DOM ID: `planning-closure-status`, `planning-closure-blocker-count`, `planning-closure-action` (frozen 정확값).
- CSS class(BEM): `planning-closure`, `planning-closure__badge`, `planning-closure__count`, `planning-closure__action` (frozen 정확값).

### 4.2 spacing
- 컨테이너 내부 요소 간격: `--space-panel-gap: 12px` (frozen). flex `gap: var(--space-panel-gap)`.
- 컨테이너 내부 패딩: 12px 14px. 좌측 상태 보더 3px(상태 색상).

### 4.3 breakpoint 별 동작
| 뷰포트 | 레이아웃 | 비고 |
| --- | --- | --- |
| **≥ 320px** (기준 하한) | 배지·blocker 수·조치 링크를 세로 흐름 또는 wrap flex로 배치, **content overflow 없음** | `flex-wrap: wrap` + `min-width: 0` |
| ≥ 480px | 가로 한 줄 배치(배지 → 수 → 링크) | 여백 확대 |

- 320px에서 텍스트가 넘칠 경우 줄바꿈(wrap)으로 흡수하며 **가로 스크롤/절단이 발생하지 않도록** 한다.
- 조치 링크는 최소 터치 타깃 높이 32px 이상 확보.

---

## 5. 컴포넌트 명세 (상태 모델 · frozen 6개)

상태는 planner §3.3에서 동결한 **6개 정확값**만 사용한다. 각 상태는 **화면 텍스트 + 접근성 이름**으로 상태명을 노출한다.

| state | 배지 화면 텍스트 | 색상 토큰 | count 노출 | action 노출/aria-label |
| --- | --- | --- | --- | --- |
| `loading` | 상태 확인 중 | `--color-status-neutral` | 숨김 | 비활성(조회 중) |
| `ready` | 종료 준비 완료 | `--color-status-ready` | 숨김 | "Planning 종료 진행" |
| `blocked` | 종료 불가 — blocker N건 | `--color-status-blocked` | **표시** (blocker N건) | "blocker 목록으로 이동" |
| `needs-operator-action` | 운영자 조치 필요 | `--color-status-blocked` | 숨김 | "운영자 조치 화면으로 이동" |
| `empty` | 표시할 항목 없음 | `--color-status-neutral` | 숨김 | 비활성/숨김 |
| `error` | 상태를 불러오지 못함 | `--color-status-blocked` | 숨김 | "상태 다시 불러오기" |

### 5.1 props / 데이터 모델 (설계 관점 — 구현은 developer)
- `state`: 위 6개 enum 중 하나. 초기값 `loading`.
- `blockerCount`: 정수. `blocked` 상태에서만 count 요소에 반영 (예: "blocker 3건").
- `actionLabel` / `actionHref` (또는 핸들러): 상태별 조치 control의 접근성 이름·목적.

### 5.2 상태 전이 규칙 (planner §3.3 / §4.1 요약 — 판정 로직은 developer 소유)
```
초기값: loading
fetch 실패                     -> error
dossier 없음 / 필드 비어있음     -> empty
operator-action 필요            -> needs-operator-action
blocker 수 > 0                  -> blocked (count = blocker 수)
그 외                          -> ready
```
- `blocked`에서 blocker가 0이 되면 `ready`/`empty`로 전이 (count 요소 숨김).
- 초기화·취소·조회 실패 후에는 **초기값(loading→재조회)** 으로 되돌리고 조치 control을 다시 사용할 수 있어야 한다.

### 5.3 상태 · 인터랙션
- **상태 영역(`planning-closure-status`)**: `aria-live="polite"` — 상태 변경 시 스크린리더가 알림.
- **조치 control(`planning-closure-action`)**:
  - 명시적 `aria-label`(상태별, §5 표) 보유.
  - 키보드 **포커스 가능** + **Enter**로 활성화. 포커스 시 가시적 포커스 링(2px outline).
  - `hover`/`active`/`focus-visible` 상태를 시각적으로 구분.
- **색상 비의존**: 모든 상태는 배지 화면 텍스트로 상태명을 노출하며, 상태 점(dot)에는 형태(●/⚠/✕/…) 힌트를 함께 둔다.

---

## 6. dev 구현 가이드 (developer / BF-1330 참조용)

> developer는 `planning/index.html` · `planning/closure-status.js`를 **additive**로 구현한다.
> 아래는 frozen 계약을 코드로 옮길 때의 권장 매핑이다. selector/token은 **정확값 그대로** 사용.

### 6.1 CSS 변수 정의 (frozen 값 그대로)
```css
:root {
  --color-status-ready:   #16a34a;
  --color-status-blocked: #dc2626;
  --color-status-neutral: #64748b;
  --space-panel-gap:      12px;
}
```

### 6.2 DOM 골격 (권장 — ID/class 정확값)
```html
<div id="planning-closure-status" class="planning-closure" aria-live="polite">
  <span class="planning-closure__badge" data-state="loading">
    <span class="planning-closure__dot" aria-hidden="true"></span>
    <span class="planning-closure__label">상태 확인 중</span>
  </span>
  <span id="planning-closure-blocker-count" class="planning-closure__count" hidden></span>
  <a id="planning-closure-action" class="planning-closure__action"
     href="#" aria-label="Planning 종료 진행" tabindex="0">조치</a>
</div>
```
- 상태 전환은 `data-state` 속성 + 각 요소 텍스트/`hidden` 토글로 표현 (배지 텍스트가 상태명 권위).
- `planning-closure-blocker-count`는 `blocked`에서만 `hidden` 해제하고 "blocker N건" 텍스트를 채운다.
- `action`의 `aria-label`은 상태별(§5 표)로 갱신한다.

### 6.3 단계별 지침
1. `:root`에 §6.1 토큰 4개 정의 (기존 토큰과 충돌 없이 additive).
2. `planning/index.html`에 §6.2 DOM 골격을 상태 영역 마운트 노드로 **추가**하고 `closure-status.js`를 로드.
3. `closure-status.js`에서 기존 Dossier GET 응답을 읽어 §5.2 규칙으로 `state`/`blockerCount` 도출.
4. 상태별로 `data-state`, 배지 라벨 텍스트, count `hidden`/텍스트, action `aria-label`/활성화 갱신.
5. 조회 실패/초기화/취소 시 `loading`으로 복귀시키고 조치 control을 재사용 가능하게 복원.
6. 접근성: `aria-live="polite"` 유지, action은 포커스 가능 + Enter 활성화, 색상 외 텍스트로 상태 노출.

### 6.4 권장 class/변수명 요약
| 용도 | 권장 이름 | 출처 |
| --- | --- | --- |
| 상태 영역 루트 ID | `planning-closure-status` | frozen |
| blocker 수 ID | `planning-closure-blocker-count` | frozen |
| 조치 control ID | `planning-closure-action` | frozen |
| 컨테이너 class | `planning-closure` | frozen |
| 배지 class | `planning-closure__badge` | frozen |
| 수 class | `planning-closure__count` | frozen |
| 조치 class | `planning-closure__action` | frozen |
| 상태 점(보조) | `planning-closure__dot` | 시각 보조(권장, 선택) |
| 배지 라벨(보조) | `planning-closure__label` | 시각 보조(권장, 선택) |

> `__dot`/`__label`은 색상 비의존 시각 보조를 위한 **권장 요소**이며 frozen selector가 아니다.
> developer는 접근성 요건(색상 외 상태명 노출)을 충족하는 한 자유롭게 조정할 수 있다.

---

## 7. AC ↔ 명세 매핑 표

| Acceptance Criteria / REQ | 충족 위치(본 문서) |
| --- | --- |
| 6개 상태를 색상 외 화면 텍스트와 함께 시각 명세로 표현 | §5 상태 모델 표(배지 화면 텍스트), §2 색상 비의존 원칙 |
| AC 매핑 표 포함 | 본 §7 |
| 공용 디자인 토큰만 사용, selector/token 변경·신규 interface 없음 | §2 (frozen token), §6.4 (frozen selector), 재정의 금지 명시 |
| 시각 명세 범위 = `docs/design/planning-closure-status-BF-1328.md`, 런타임 HTML/CSS/JS 미생성 | 본 문서(명세) + §8 mockup은 `docs/design/mockups/` 시각 시뮬레이션 전용(runtime 아님) |
| REQ-1 6개 상태 노출 | §5 상태 모델 |
| REQ-2 frozen selector/token 그대로 | §2, §6.1~6.4 |
| REQ-3 접근성(aria-live/aria-label/Enter/색상 비의존) | §5.3, §6.3(6) |
| REQ-4 320px overflow 없음 | §4.3 반응형 |
| REQ-5 Dossier GET additive 소비 | §1.1, §5.2 (판정 로직은 dev 소유) |
| REQ-6 초기화·취소·실패 후 초기값 복귀 + control 재사용 | §5.2, §6.3(5) |

---

## 8. mockup 참조

- 시각 mockup HTML: `docs/design/mockups/planning-closure-status-BF-1328.html`
- 6개 상태(loading/ready/blocked/needs-operator-action/empty/error)를 `<section>`으로 나란히 표현.
- frozen token(§2)·타이포(§3)·레이아웃(§4)·상태 텍스트(§5)를 그대로 시각화.
- 320px 컨테이너 시뮬레이션 섹션 포함(overflow 없음 확인용). placeholder 텍스트 사용.
- **주의**: mockup은 시안 시각화 전용이며 developer의 실제 산출물(`planning/*`)이 아니다. 픽셀 단위 일치 의무 없음.

---

## 9. Self-critique

- **AC 매핑**: 6개 상태 × 색상 외 화면 텍스트를 §5 표로 1:1 명시, §7에 AC 매핑 표 포함 — 충족.
- **dev 구현 가이드**: §6에 CSS 토큰/DOM 골격/단계별 지침/이름 매핑 제공 — dev가 그대로 따라갈 수 있음.
- **기존 요소 보존**: 전 산출물 additive 명시(§1.1), 기존 DOM/스크립트 미변경 강조 — 충족.
- **컴포넌트 매핑**: frozen DOM ID 3개 / BEM class 4개 / 토큰 4개를 §6.4 표로 정확값 매핑 — 충족.
- **모호함 flag**:
  - `needs-operator-action`/`error`가 `blocked`와 색상 토큰(`--color-status-blocked`)을 공유하나, planner §3.3 동결값이므로 **텍스트로 구분**하도록 명시(재정의 아님).
  - `__dot`/`__label`은 frozen selector가 아닌 **시각 보조 권장 요소**임을 §6.4에 명시 — developer가 접근성 요건 충족 하에 조정 가능.
  - Dossier 응답의 정확한 필드명은 planner 문서에 미고정(기존 계약 소비) — 판정 로직/필드 매핑은 **developer 소유**로 위임(§5.2).
