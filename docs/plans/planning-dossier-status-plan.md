# BF-1343 · Planning 근거 상태 배지 실행 설계 동결

- 상태: **frozen** (본 문서는 downstream producer가 참조하는 동결 실행 설계)
- 작성 역할: planner (박기획)
- 대상 저장소: backend (`notepad-spa`, vanilla-static / ESM)
- 서빙 규약: `serve_root=.`, root-relative-static → `planning/index.html`은 route `/planning/`에서 서빙
- 목적: designer와 developer가 **동일 frozen revision**을 재정의 없이 병렬 소비하도록 요구/route/UI 계약/RTM/역할별 Work Packet/rollback을 확정한다.

> **권위 원칙**: 파일 소유권과 상태 계약은 frozen Execution Blueprint가 유일한 권위이며, 본 planner 문서는 이를 재정의하지 않고 그대로 렌더링한다. designer/developer는 selector와 token을 변경하거나 재정의하지 않는다.

---

## 1. 요구사항 (Requirement)

Planning Dossier 화면(`/planning/`)에서 사용자가 현재 대시보드의 **근거(evidence) 충족 상태**를 색상과 무관하게 텍스트로 즉시 인지할 수 있어야 한다.

- **priority**: high
- **rationale**: 근거 충족 여부를 색상 배지만으로 표현하면 색각 이상 사용자가 상태를 구분하지 못하고, 상태 전이(loading/error) 중 진행 상황을 알 수 없다. 상태명을 화면 텍스트와 접근성 이름으로 노출해 접근성과 관측성을 동시에 확보한다.
- **수용 기준(요약)**: 아래 §2 상태 모델과 §3 UI 계약을 정확히 만족하고, 기존 Planning Dossier GET 계약·데이터 구조를 변경하지 않는 additive 구현일 것.

### 1.1 무변경·롤백 불변식 (invariant)

- 기존 Planning Dossier **GET 계약과 데이터 구조를 변경하지 않는 additive 구현**만 허용한다. 신규 상태 배지는 기존 응답 데이터를 읽어 파생 표시만 수행한다.
- 배지 컴포넌트 전체를 제거해도(`planning/src/dossier-status-badge.js` 미로드 + `#dossier-status-badge` 노드 제거) 기존 Planning Dossier 화면이 원래 빈 상태/기존 동작으로 되돌아가야 한다(**rollback 가능**).
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값(loading 이전 상태)으로 되돌리고, 주 실행 control(상세 보기 링크·재시도)을 다시 사용할 수 있어야 한다.

---

## 2. 상태 모델 (State Model)

배지는 정확히 5개 상태를 가지며, 각 상태는 색상만으로 구분하지 않고 **상태명을 화면 텍스트와 접근성 이름으로** 노출한다.

| 상태 | 화면 텍스트 | 진행/링크 표시 | aria-label |
| --- | --- | --- | --- |
| `loading` | `근거 상태 확인 중` | 진행 표시(progress indicator) 노출 | `근거 상태 확인 중` |
| `sufficient` | `근거 충족` | 텍스트 배지만 노출 | `근거 충족` |
| `insufficient` | `근거 부족` | 텍스트 배지 + **상세 보기 링크 활성** | `근거 부족` |
| `empty` | (배지 숨김) | 배지 숨김, 기존 빈 상태 유지 | — |
| `error` | `상태를 불러오지 못했습니다` | 재시도 가능 | `상태를 불러오지 못했습니다` |

### 2.1 상태 전이 (ProcessFlow)

- 시작 → `loading`
- `loading` → 데이터 있고 근거 충족 → `sufficient`
- `loading` → 데이터 있고 근거 부족 → `insufficient`
- `loading` → 데이터 없음 → `empty` (배지 숨김, 기존 빈 상태 유지)
- `loading` → 조회 실패 → `error`
- `error` → 재시도 → `loading` (초기값 복구 후 재진입)
- 취소/초기화 → 초기값(`loading` 이전)으로 복귀, 진행 표시 제거, 주 control 재사용 가능

---

## 3. UI 계약 (frozen ui-contract@v1) — 재정의 금지

designer와 developer는 아래 selector·token·텍스트를 **변경하거나 재정의하지 않는다.**

### 3.1 파일 소유권 (artifact-policy: 모두 additive)

| 파일 | 소유자 | 정책 |
| --- | --- | --- |
| `docs/design/dossier-status-badge.md` | **designer** | additive |
| `planning/index.html` | **developer** | additive |
| `planning/src/dossier-status-badge.js` | **developer** | additive |

### 3.2 DOM ID (정확히 이 값 사용)

- `dossier-status-badge` — 배지 컨테이너 루트
- `dossier-status-label` — 상태 텍스트 라벨
- `dossier-status-detail-link` — 상세 보기 링크

### 3.3 CSS class (정확히 이 값 사용)

- `dossier-status` — 최상위 wrapper
- `dossier-status__badge` — 배지 요소
- `dossier-status__label` — 상태 라벨 텍스트
- `dossier-status__detail` — 상세 보기 링크

### 3.4 Design token / CSS 변수 (정확히 이 값)

| 변수 | 값 | 용도 |
| --- | --- | --- |
| `--color-evidence-sufficient` | `#16a34a` | `sufficient` 상태 표시 색 |
| `--color-evidence-insufficient` | `#dc2626` | `insufficient` 상태 표시 색 |
| `--space-badge-gap` | `8px` | 배지·상세 링크 간격 |

### 3.5 접근성 (accessibility)

- 배지는 색상과 무관하게 **현재 상태 텍스트를 담은 `aria-label`**을 가진다(§2 표의 aria-label 열).
- 상세 보기 링크(`#dossier-status-detail-link`)는 명시적 `aria-label='근거 상세 보기'`를 가지며 키보드 focus가 가능하다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 3.6 반응형 (responsive)

- **320px 이상** 뷰포트에서 배지와 상세 링크에 content overflow가 발생하지 않는다(줄바꿈/축소 허용, 잘림 금지).

### 3.7 route

- 배지가 렌더링되는 화면 route: **`/planning/`** (static, `planning/index.html`).

---

## 4. 요구사항 추적 매트릭스 (RTM)

| 요구/불변식 | 실현 artifact | 검증 |
| --- | --- | --- |
| §1 상태 텍스트 노출 | `docs/design/dossier-status-badge.md`, `planning/index.html`, `planning/src/dossier-status-badge.js` | `planning/tests/dossier-status-badge.test.js` |
| §2 5개 상태 모델·전이 | `planning/src/dossier-status-badge.js` | 상태별 DOM/텍스트 단위 테스트 |
| §3.2–3.4 selector·token 고정 | `planning/index.html`, `docs/design/dossier-status-badge.md` | selector/token 존재 검증 |
| §3.5 접근성 이름·키보드 | `planning/index.html`, `planning/src/dossier-status-badge.js` | aria-label·focus 검증 |
| §3.6 320px overflow 없음 | `docs/design/dossier-status-badge.md`, `planning/index.html` | 반응형 계약 검증 |
| §1.1 additive·rollback | 전체 | 배지 제거 시 기존 빈 상태 복구 검증 |

---

## 5. 역할별 Work Packet (frozen coverage)

| packetKey | role | blockedBy | ownedPaths | deliverables |
| --- | --- | --- | --- | --- |
| `plan` | planner | — | `docs/plans/planning-dossier-status-plan.md` | 본 문서 |
| `design` | designer | `plan` | `docs/design/dossier-status-badge.md` | 상태 배지 UI 명세(selector·token·상태·접근성·반응형을 §3 그대로 문서화) |
| `develop` | developer | `plan` | `planning/index.html`, `planning/src/dossier-status-badge.js` | 배지 마크업 + 상태 렌더 모듈(§2·§3 계약 구현, additive) |
| `review` | reviewer | `design`, `develop` | (review_verdict) | selector·token·접근성·additive·rollback 검토 |
| `test` | tester | `review` | `planning/tests/dossier-status-badge.test.js` | 5개 상태·접근성·rollback actual-result 검증 |

- designer와 developer는 **`plan`에만 의존**하며 서로 독립적으로 동일 frozen revision을 병렬 소비한다.
- reviewer/tester는 별도 packet으로 유지되며 생략하지 않는다.

---

## 6. KPI 측정 지점

- **접근성 완전성**: 5개 상태 중 화면 텍스트+aria-label을 모두 노출하는 상태 비율 = 100%(`empty` 제외 4개, `empty`는 의도적 숨김).
- **additive 안전성**: 배지 도입 전후 기존 Planning Dossier GET 응답 스키마 diff = 0.
- **rollback 성공률**: 배지 컴포넌트 제거 시 기존 빈 상태 복구 성공 = 100%.
- **반응형**: 320px 뷰포트에서 overflow 발생 = 0건.

---

## 7. 후조건 (postcondition)

- designer는 §3 계약을 재정의 없이 `docs/design/dossier-status-badge.md`에 문서화한다.
- developer는 §2·§3 계약을 `planning/index.html`·`planning/src/dossier-status-badge.js`에 additive로 구현한다.
- 초기화·취소·실패 후 상태·진행 표시가 초기값으로 복귀하고 주 control이 재사용 가능하다.
- 기존 Planning Dossier GET 계약·데이터 구조는 변경되지 않는다.
