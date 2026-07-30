# 전달 상태 배지 — 구현 실행 설계 (BF-1306)

> 본 문서는 planner가 먼저 작성하고 **designer(BF-1304) / developer(BF-1305) / reviewer / tester(BF-1308)** 가 그대로 따르는
> 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **selector·상태 텍스트·token은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1306 (planner)
- Epic 형제 Task: BF-1304(designer) · BF-1305(developer) · BF-1308(tester)
- Frozen Execution Blueprint v2 RoleWorkPacket(5): `plan/planner` · `design/designer` · `develop/developer` · `review/reviewer` · `test/tester` (packetKey/assigneeRole/dependencies/ownedPaths/acceptanceCriteria/testSpecRefs를 Blueprint와 1:1 복제)
- reviewer 패킷 선행 의존성 = `design`(designer) + `develop`(developer) producer 패킷만 참조하며, tester를 선행 의존성으로 넣지 않는다.
- executionProfile: `implementation-strict`
- 대상 저장소: backend (vanilla-static / esm / serve_root=`.`)

---

## 1. Problem Statement

### 현재 상황
사용자는 전달(delivery) 요청 이후 그 처리 상태를 UI에서 즉시 확인할 방법이 없다. 상태 조회가 화면 텍스트로
노출되지 않아 진행/완료/실패를 구분하기 어렵고, 색상만으로 상태를 표현할 경우 접근성 요구를 충족하지 못한다.

### 사용자 페인 포인트
- 전달 상태가 진행 중인지, 완료됐는지, 실패했는지 한눈에 알 수 없다.
- 새로고침 수단이 없어 최신 상태를 재조회할 수 없다.
- 색상 의존 표현은 스크린리더/색각 이상 사용자에게 상태를 전달하지 못한다.

### 비즈니스 임팩트
전달 상태 가시성 부재는 문의(support) 유입과 재요청을 늘린다. 명시적 상태 배지는 상태 확인에 드는 인지 비용을
낮추고, 접근성 기준을 충족해 사용 가능한 사용자 범위를 넓힌다.

---

## 2. Proposed Solution (Overview)

전달 상태를 텍스트 라벨 + 접근성 이름으로 노출하고, 명시적 새로고침 control을 제공하는 **전달 상태 배지**를 구현한다.
배지는 `idle → loading → delivered | failed` 4개 상태를 가지며, 각 상태는 화면 텍스트와 접근성 이름 양쪽으로
상태명을 노출한다(색상만으로 구분 금지). 새로고침 control은 명시적 aria-label을 가진다.

### 파일 소유권 (frozen — 재정의 금지)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `apps/delivery-status-badge/index.html` | developer (BF-1305) | additive | 배지 DOM 구조 + token 정의 |
| `apps/delivery-status-badge/src/badge.js` | developer (BF-1305) | additive | 상태 전이·렌더링 로직 (ESM) |
| `docs/design/delivery-status-badge-BF-1303.md` | designer (BF-1304) | additive | 시각 설계·상태별 스타일 명세 |
| `apps/delivery-status-badge/tests/badge.test.js` | tester (BF-1308) | (read-only for planner) | 상태·접근성·반응형 검증 |
| (파일 산출물 없음 — review_verdict Decision 경로) | reviewer | — | 계약 준수·산출물 리뷰 판정 (선행: design·develop) |
| `docs/plans/implementation-plan.md` | planner (BF-1306, 본 문서) | — | 실행 설계 + RTM |

> 위 소유권과 상태 계약의 유일한 권위는 frozen blueprint이며 본 planner 문서는 이를 재정의하지 않는다.
> `additive` 정책: 후속 페르소나는 아래 계약된 selector/token/상태 텍스트를 **추가·구현**하되 변경·삭제·재정의하지 않는다.

---

## 3. Exact UI Contract (frozen — 유일 권위)

### 3.1 파일

- `apps/delivery-status-badge/index.html`
- `apps/delivery-status-badge/src/badge.js`
- `docs/design/delivery-status-badge-BF-1303.md`

### 3.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 배지 root 컨테이너 | `delivery-badge-root` |
| 상태 텍스트 노출 영역 | `delivery-badge-status` |
| 상태 새로고침 control | `delivery-badge-refresh` |

### 3.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 배지 블록 | `delivery-badge` |
| 상태 텍스트 element | `delivery-badge__status` |
| 새로고침 control element | `delivery-badge__refresh` |

### 3.4 상태 (state) — 화면 텍스트 (변경 금지)

| state | 화면 텍스트 | 의미 | 진입 조건 |
| --- | --- | --- | --- |
| `idle` | `대기 중` | 초기/미조회 상태 | 초기 렌더, 취소·초기화 후 |
| `loading` | `조회 중…` | 상태 조회 진행 중 | 새로고침 control 실행 시 |
| `delivered` | `전달 완료` | 전달 성공 | 조회 성공(성공 응답) |
| `failed` | `전달 실패` | 전달 실패 | 조회 실패(실패 응답) |

`delivery-badge-status` 텍스트는 항상 위 표의 화면 텍스트와 동일해야 한다.

### 3.5 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-status-delivered` | `#16a34a` | `delivered` 상태 강조색 |
| `--color-status-failed` | `#dc2626` | `failed` 상태 강조색 |
| `--space-badge-gap` | `8px` | 상태 텍스트–새로고침 control 간격 |

> 색상 token은 상태명을 화면 텍스트로 노출하는 것을 **보조**할 뿐, 색상만으로 상태를 구분하지 않는다.

### 3.6 접근성 (Accessibility — 필수)

1. `delivery-badge-status` 는 `aria-live="polite"` 를 가진다 (상태 전이를 스크린리더에 폴라이트하게 알림).
2. `delivery-badge-refresh` 는 명시적 `aria-label="상태 새로고침"` 을 가진다.
3. 모든 상태는 색상만으로 구분하지 않고 상태명을 **화면 텍스트와 접근성 이름** 양쪽으로 노출한다.

### 3.7 반응형 (Responsive — 필수)

- **320px 이상** 뷰포트에서 배지 content overflow가 발생하지 않는다.

### 3.8 상태 후조건 / 복구 (필수)

- 초기화·취소·실패 뒤에는 상태와 진행 표시를 **초기값(`idle` / `대기 중`)** 으로 되돌리고,
  주 실행 control(`delivery-badge-refresh`)을 다시 사용할 수 있어야 한다.

---

## 4. User Stories & Scenarios (Given/When/Then)

### US-1. 초기 상태 확인
- **Given** 사용자가 전달 상태 배지가 있는 화면을 처음 연다
- **When** 배지가 렌더링된다
- **Then** `delivery-badge-status` 에 `대기 중`(`idle`)이 표시되고 `delivery-badge-refresh` 가 사용 가능하다

### US-2. 상태 조회(성공)
- **Given** 배지가 `idle` 상태이다
- **When** 사용자가 `delivery-badge-refresh` 를 실행한다
- **Then** 배지는 `조회 중…`(`loading`)을 거쳐, 성공 응답 시 `전달 완료`(`delivered`)를 표시하고 `--color-status-delivered`(#16a34a)로 강조한다

### US-3. 상태 조회(실패)
- **Given** 배지가 `idle` 또는 `loading` 상태이다
- **When** 조회가 실패한다
- **Then** 배지는 `전달 실패`(`failed`)를 표시하고 `--color-status-failed`(#dc2626)로 강조하며, `delivery-badge-refresh` 로 재조회할 수 있다

### US-4. 접근성 노출
- **Given** 스크린리더 사용자가 배지를 사용한다
- **When** 상태가 전이된다
- **Then** `aria-live="polite"` 영역이 상태명을 읽어주고, 새로고침 control은 `상태 새로고침` 으로 안내된다

### US-5. 반응형
- **Given** 뷰포트 폭이 320px이다
- **When** 배지가 렌더링된다
- **Then** content overflow 없이 배지가 온전히 표시된다

---

## 5. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | 조회 실패(성공 응답 아님) | `failed`(`전달 실패`) + 재조회 가능 |
| E-2 | 조회 중 재실행/취소 | 진행 표시를 정리하고, 취소 시 `idle`(`대기 중`)로 복귀 |
| E-3 | 초기화/재진입 | 상태·진행 표시를 초기값(`idle`)으로 되돌리고 control 재사용 가능 |
| E-4 | 색상 미지원 환경(색각 이상/고대비) | 상태명이 화면 텍스트로 유지되어 상태 식별 가능 |
| E-5 | 좁은 뷰포트(320px) | overflow 없음 |
| E-6 | 미지의/알 수 없는 상태 값 | 계약된 4개 state 외 값은 렌더하지 않고 `idle` 초기값을 유지 |

---

## 6. 데이터 모델 (상태 표현)

배지는 서버 스키마 변경 없이 **UI 상태 값**만 다룬다. 상태 값 집합은 계약된 4개로 한정한다.

| 필드 | 타입 | 허용 값 | 비고 |
| --- | --- | --- | --- |
| `state` | enum(string) | `idle` \| `loading` \| `delivered` \| `failed` | 유일 허용 집합, 기본값 `idle` |
| `label` | string | 3.4 표의 화면 텍스트 | `state` 에 1:1 대응 |

불변식: `state` 는 위 4개 값만 가지며, `label` 은 `state` 에 대응하는 화면 텍스트와 항상 일치한다.

---

## 7. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence |
| --- | --- | --- | --- | --- |
| REQ-CONTRACT | 파일·DOM ID/class·상태 텍스트·token·접근성·반응형·산출물 경로가 exact UI 계약에 명시 | US-1~US-5 | TS-BADGE-STATES, TS-BADGE-A11Y, TS-BADGE-RESPONSIVE | build_result, test_result |
| REQ-STATES | 4개 상태 텍스트·전이·후조건(초기화/취소/실패 → idle 복귀) | US-1,2,3 / E-1,E-2,E-3,E-6 | TS-BADGE-STATES | build_result, test_result |
| REQ-A11Y | aria-live=polite, 새로고침 aria-label, 색상 비의존 | US-4 / E-4 | TS-BADGE-A11Y | build_result, test_result |
| REQ-RESPONSIVE | 320px 이상 overflow 없음 | US-5 / E-5 | TS-BADGE-RESPONSIVE | build_result, test_result |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 변경 없음(UI 상태 표현만 추가). 기존 저장소 규약(vanilla-static/esm) 유지.
- 파일 정책은 모두 `additive` — 기존 파일 구조를 파괴하지 않는다.

### 롤백
- 신규 추가 파일(`apps/delivery-status-badge/**`) 제거로 무손상 롤백 가능. 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- 상태 식별 가능성: 4개 상태 모두 화면 텍스트로 노출(색상 비의존) = 100%.
- 접근성: `aria-live` 상태 알림 + 새로고침 `aria-label` 노출 = 100%.
- 반응형: 320px에서 overflow 0건.
- 상태 문의 유입 감소(정성적 목표): 상태 배지 도입 후 전달 상태 관련 재문의 감소.

---

## 8. Handoff 지시 (후속 페르소나)

- **designer (BF-1304)** — `docs/design/delivery-status-badge-BF-1303.md` 에 3장의 상태별 시각 스타일(token 매핑 포함)을
  명세한다. selector/상태 텍스트/token 값은 3장을 그대로 사용하고 변경하지 않는다.
- **developer (BF-1305)** — `apps/delivery-status-badge/index.html`(DOM+token) 과 `apps/delivery-status-badge/src/badge.js`(상태 전이 로직, ESM)를
  구현한다. 3장의 DOM ID/class/상태 텍스트/token/접근성/반응형/후조건을 그대로 구현한다.
- **tester (BF-1308)** — `apps/delivery-status-badge/tests/badge.test.js` 로 상태 전이(4상태), 접근성(aria-live/aria-label/색상 비의존),
  반응형(320px), 후조건 복귀(E-2/E-3)를 검증한다.
- **reviewer** — designer/developer 산출물이 3장 exact UI 계약과 RTM(7장)을 준수하는지 리뷰하고 `review_verdict` Decision
  경로로 판정한다. **선행 의존성은 `design`(designer)·`develop`(developer) producer 패킷뿐이며 tester를 선행 의존성으로 두지 않는다.**
  별도 파일 산출물은 생성하지 않고 selector·token·상태 텍스트를 재정의하지 않는다.

> 네 페르소나 모두 본 문서 3장의 계약값을 유일 권위로 삼으며 selector·token·상태 텍스트를 재정의하지 않는다.
> reviewer는 `review_verdict` Decision 경로를 사용하지만, frozen Execution Blueprint v2 커버리지를 위해 `review/reviewer`
> RoleWorkPacket을 dossier에 반드시 포함하며 dependencies는 `design`+`develop` producer 패킷을 정확히 참조한다.
