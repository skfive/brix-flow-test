# 구현 실행 설계 — Planning 종료 상태 안내 (BF-1328)

> 상태: **frozen blueprint** · Planner packet: `plan` (BF-1331) · Producer: planner
> Consumer: designer(BF-1329), developer(BF-1330), tester(BF-1333)
> 본 문서는 downstream(designer/developer/tester)이 그대로 소비하는 실행 설계·RTM·handoff 계약이다.
> 여기 명시된 파일·소유자·상태·토큰·selector는 **동결값**이며 후속 페르소나가 재정의하지 않는다.

---

## 1. 배경 · 목적

Planning 화면에 **종료 준비 상태 안내 영역**을 추가한다. 운영자가 Planning을 종료해도
되는지(ready), blocker가 남았는지(blocked), 조치가 필요한지(needs-operator-action)를
한눈에 알 수 있게 상태 배지·blocker 수·조치 링크를 노출한다.

- 데이터는 **기존 Planning Dossier GET 계약**을 그대로(additive) 소비한다. 새 schema·엔드포인트·
  외부 의존성을 추가하지 않는다.
- UI 컴포넌트는 순수 vanilla-static(ESM) 방식으로 `planning/` 아래에 추가한다.
- 실패·취소·초기화 후에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.

### 1.1 Non-goals (범위 밖)

- Planning Dossier GET 응답 schema 변경 / 신규 endpoint 추가 — **금지**.
- 종료(closure) 실제 트랜잭션 수행 로직 — 본 영역은 **상태 안내 + 조치 링크**까지만 담당.
- 디자인 토큰 값 재정의 / 신규 파일·역할 추가.

---

## 2. 파일 소유권 · handoff 계약 (frozen)

| 파일 | 소유자 | artifact-policy | 비고 |
| --- | --- | --- | --- |
| `docs/design/planning-closure-status-BF-1328.md` | designer | additive | UI 시안·상태별 목업·토큰 적용 문서 |
| `planning/index.html` | developer | additive | 상태 안내 영역 DOM 마운트 |
| `planning/closure-status.js` | developer | additive | 상태 모델·렌더링·Dossier GET 소비 |
| `planning/tests/closure-status.test.js` | tester | (read-only for dev) | 상태 전이·접근성·반응형 검증 |
| `docs/plans/implementation-plan-BF-1328.md` | planner | additive | 본 문서 (실행 설계 권위) |

> 각 파일은 **해당 소유자만** 생성/수정한다. 소유자가 아닌 페르소나는 건드리지 않는다.
> 세 산출물(`.md`/`.html`/`.js`) 모두 **additive** — 기존 코드/DOM/문서를 삭제·재작성하지 않고 추가만 한다.

---

## 3. UI 계약 (frozen · ui-contract@v1)

designer/developer는 아래 selector와 token을 **변경·재정의하지 않고 그대로** 구현한다.

### 3.1 DOM ID (정확값)

- `planning-closure-status` — 상태 영역 루트 (라이브 리전)
- `planning-closure-blocker-count` — blocker 개수 표시 요소
- `planning-closure-action` — 운영자 조치 control (링크/버튼)

### 3.2 CSS class (정확값, BEM)

- `planning-closure` — 컨테이너
- `planning-closure__badge` — 상태 배지
- `planning-closure__count` — blocker 수
- `planning-closure__action` — 조치 링크

### 3.3 상태 모델 (정확값 · 6개)

| state | 의미 | 배지 텍스트(예) | 색상 토큰 |
| --- | --- | --- | --- |
| `loading` | Dossier 조회 중 | "상태 확인 중" | `--color-status-neutral` |
| `ready` | 종료 가능 | "종료 준비 완료" | `--color-status-ready` |
| `blocked` | blocker 존재 | "종료 불가 — blocker N건" | `--color-status-blocked` |
| `needs-operator-action` | 운영자 조치 필요 | "운영자 조치 필요" | `--color-status-blocked` |
| `empty` | 대상 데이터 없음 | "표시할 항목 없음" | `--color-status-neutral` |
| `error` | 조회 실패 | "상태를 불러오지 못함" | `--color-status-blocked` |

- 상태는 **색상만으로 구분하지 않는다** — 각 상태는 화면 텍스트와 접근성 이름에 상태명을 노출한다.
- `blocked`일 때 `planning-closure-blocker-count`에 blocker 수를 표시한다. blocker가 0이면 `ready`/`empty`로 전이한다.
- 초기값은 `loading`. 조회 완료 시 응답에 따라 `ready`/`blocked`/`needs-operator-action`/`empty`로,
  조회 실패 시 `error`로 전이한다.

### 3.4 디자인 토큰 (정확값 — 재정의 금지)

```
--color-status-ready:   #16a34a;
--color-status-blocked: #dc2626;
--color-status-neutral: #64748b;
--space-panel-gap:      12px;
```

### 3.5 접근성 요구 (정확값)

1. `planning-closure-status` 영역은 `aria-live="polite"`로 상태 변경을 알린다.
2. `planning-closure-action`(조치 control)은 **명시적 `aria-label`**을 가지며, 키보드 포커스가
   가능하고 **Enter**로 활성화된다.
3. 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트 + 접근성 이름으로 노출한다.

### 3.6 반응형 요구 (정확값)

- **320px 이상**에서 상태 배지·blocker 수·조치 링크가 **content overflow 없이** 표시된다.
- 컨테이너 내부 간격은 `--space-panel-gap`(12px)을 사용한다.

---

## 4. 기존 Planning Dossier GET 소비 계약 (additive)

- `closure-status.js`는 **기존 Planning Dossier GET** 응답을 **읽기 전용**으로 소비한다.
- 응답 schema를 확장하거나 새 필드를 서버에 요구하지 않는다. 상태 판정은 **클라이언트에서**
  기존 필드(blocker 목록/카운트, 운영자 조치 플래그 등)를 조합해 도출한다.
- Dossier 필드가 없거나 비어 있으면 `empty`, 조회 자체가 실패(HTTP 오류/네트워크)하면 `error`로 처리한다.
- 신규 외부 의존성(패키지)·신규 endpoint·신규 schema를 **추가하지 않는다**.

### 4.1 상태 도출 규칙 (클라이언트)

```
if (fetch 실패)                    -> error
else if (dossier 없음/필드 비어있음) -> empty
else if (operator-action 필요)      -> needs-operator-action
else if (blocker 수 > 0)            -> blocked (count = blocker 수)
else                               -> ready
```

---

## 5. Rollback · Recovery 전략

- 세 산출물은 모두 **additive** 이므로 rollback은 **추가분만 제거**하면 되며, 기존 Planning
  화면/Dossier 동작에는 영향이 없다.
- `planning/index.html`에서 상태 영역 마운트 노드와 `closure-status.js` 로드 구문을 제거하면
  기능이 완전히 제거되고 기존 화면이 그대로 복원된다(기존 DOM/스크립트 미변경).
- 런타임 recovery: 초기화·취소·조회 실패 후에는 상태 배지·blocker 수·진행 표시를 초기값
  (`loading` → 재조회)으로 되돌리고 주 실행 control(`planning-closure-action`)을 다시 사용할 수 있어야 한다.

---

## 6. 요구사항 추적표 (RTM)

| REQ | 요구사항 | 실현(design/dev) | 검증(test) |
| --- | --- | --- | --- |
| REQ-1 | 6개 상태(loading/ready/blocked/needs-operator-action/empty/error) 노출 | `closure-status.js` 상태 모델 + 시안 | 상태 전이 단위 테스트 |
| REQ-2 | frozen selector/token 그대로 구현 | `index.html` DOM ID/class, `.js` 토큰 적용 | selector/token 존재 검증 |
| REQ-3 | 접근성(aria-live, aria-label, 키보드 Enter, 색상 비의존) | `.js`/`.html` 접근성 속성 | 접근성 속성 테스트 |
| REQ-4 | 320px overflow 없음 | `.md` 반응형 시안, `.css`/inline 스타일 | 반응형 렌더 검증 |
| REQ-5 | 기존 Dossier GET additive 소비, 신규 schema 없음 | `.js` 소비 로직 | 소비/실패 경로 테스트 |
| REQ-6 | 초기화·취소·실패 후 초기값 복귀 + control 재사용 | `.js` recovery 로직 | recovery 테스트 |

---

## 7. 역할별 Work Packet (요약 — 상세 계약은 shadow dossier 참조)

### 7.1 designer (BF-1329)
- 산출물: `docs/design/planning-closure-status-BF-1328.md`
- §3 UI 계약(selector/state/token/접근성/반응형)을 시안·상태별 목업으로 구체화. selector/token 변경 금지.

### 7.2 developer (BF-1330)
- 산출물: `planning/index.html`, `planning/closure-status.js`
- §3 selector/token, §4 Dossier 소비, §5 recovery를 그대로 구현. 기존 Dossier GET additive 소비, 신규 schema/의존성 금지.

### 7.3 tester (BF-1333)
- 산출물: `planning/tests/closure-status.test.js`
- REQ-1~6을 상태 전이·접근성·반응형·Dossier 소비/실패·recovery 관점으로 검증(test_result evidence).

### 7.4 reviewer (review)
- PR diff가 frozen 계약(selector/token/파일 소유권/additive)을 위반하지 않는지 검토(review_verdict).

---

## 8. 후조건 (Post-conditions)

1. 세 산출물이 각 소유자에 의해 additive로 생성된다.
2. §3 selector/state/token/접근성/반응형 계약이 코드·문서에 그대로 반영된다.
3. 기존 Planning Dossier GET 계약·데이터가 변경되지 않는다.
4. tester 테스트가 REQ-1~6을 검증한다.
