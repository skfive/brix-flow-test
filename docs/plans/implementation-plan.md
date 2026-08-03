# CMS 스네이크 랭킹 — 두 저장소 구현 설계 및 API/UI 계약 동결 (BF-1577)

> 본 문서는 planner가 먼저 작성하고 **backend developer(`develop-backend`) / infra developer(`develop-infra`) / reviewer / tester** 가
> 그대로 따르는 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **경로·query·응답 형태·에러 조건·selector·상태 텍스트·token·저장소 연결 설정은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1577 (planner)
- executionProfile: `implementation-strict`
- 기획 보증 수준(profile): `standard`
- 대상 저장소: **backend**(primary, 본 worktree) + **infra**(reference, `refs/infra/` read-only)
- 소비 packet: `develop-backend`, `develop-infra`
- 동결 인터페이스: `planning-contract@v1`, `ui-contract@v1`

---

## 1. Problem Statement

### 현재 상황
스네이크 랭킹 데이터는 backend 저장소에 존재하나, **운영자(CMS)가 관리 화면에서 랭킹을 모드·표시 개수로 조회**하는
backend API 계약과 그 데이터를 표시하는 infra CMS 화면 UI 계약이 동결되어 있지 않다. backend developer와 infra
developer가 병렬로 구현하는데, **API 경로·query·응답 형태·에러 조건**과 **화면 파일·selector·상태·token**, 그리고
**두 저장소 연결(API base URL)** 이 동결되지 않으면 서로 다른 계약으로 구현해 handoff 충돌이 발생한다.

### 목표
- backend admin 랭킹 조회 API를 **경로·query·응답 형태·에러 조건** exact 값으로 동결한다 (§3).
- infra CMS 랭킹 화면을 **파일·DOM ID/class·상태·token·접근성·반응형** exact 값으로 동결한다 (§4).
- **infra가 backend API를 소비하기 위한 base URL 환경 변수와 두 저장소 연결 설정**을 동결한다 (§5).
- **관측 실행 모델**(backend=plain JS + `node --test`, infra=nodejs-backend)을 기준 명령·파일 확장자로 명시한다 (§6).

### 비즈니스 임팩트
동결된 API/UI/연결 계약은 두 저장소 병렬 producer의 재작업·머지 충돌을 제거하고, 명시된 저장소 경계·소유권은 보존
영역 침범과 소유권 혼선을 방지한다.

---

## 2. 저장소 경계 · 파일 소유권 · 보존 영역 (frozen — 재정의 금지)

이 작업은 **두 저장소**에 걸친다. 각 저장소는 아래 파일 영역만 소유하며 **상대 저장소 파일을 수정하지 않는다.**
아래 소유권·상태 계약의 유일 권위는 frozen blueprint(`ui-contract@v1`)이며 본 planner 문서는 이를 재정의하지 않는다.
모든 파일 정책은 `additive` — 계약된 항목을 **추가·구현**하되 기존 파일·공유 utility·전역 상태를 변경·삭제·재정의하지 않는다.

### 2.1 backend 저장소 (primary — 본 worktree, `develop-backend`)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `snake/api/admin-scores.js` | developer | additive | `GET /api/admin/snake/scores` 핸들러 — query 검증·`{ total, items }` 응답·에러 |
| `snake/tests/admin-scores.test.js` | developer | additive | API 계약 검증 테스트 (`node --test`) |
| `docs/admin-snake-scores-api.md` | canonical work packet owner | additive | backend API 사용 문서 |
| `docs/plans/implementation-plan.md` | planner (본 문서) | — | 실행 설계 + API/UI/연결 계약 + RTM |

### 2.2 infra 저장소 (reference — `refs/infra/`, 본 worktree에서는 read-only, `develop-infra`)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `src/routes/admin-snake-ranking.js` | developer | additive | CMS 랭킹 화면 route(정적 화면 서빙, nodejs-backend) |
| `test/admin-snake-ranking.test.js` | developer | additive | route·화면 계약 검증 테스트 (`node --test`) |
| `public/admin/snake-ranking/index.html` | developer | additive | 랭킹 화면 DOM + token 정의 |
| `public/admin/snake-ranking/ranking.css` | developer | additive | 상태별 시각 스타일(token 사용) |
| `public/admin/snake-ranking/ranking.js` | developer | additive | backend API 호출·상태 전이·렌더 로직 |
| `docs/snake-ranking-admin.md` | canonical work packet owner | additive | CMS 화면 사용 문서 |

### 2.3 보존 영역 · 경계 규칙 (필수)

- **backend developer**는 `snake/api/admin-scores.js`, `snake/tests/admin-scores.test.js`, `docs/admin-snake-scores-api.md` 만 수정한다. infra 파일은 건드리지 않는다.
- **infra developer**는 `src/routes/admin-snake-ranking.js`, `test/admin-snake-ranking.test.js`, `public/admin/snake-ranking/**`, `docs/snake-ranking-admin.md` 만 수정한다. backend 파일은 건드리지 않는다.
- developer는 §4의 selector와 token을 변경하거나 재정의하지 않는다.
- 두 저장소의 **기존 파일·공유 utility·전역 상태는 보존**한다(모든 정책 `additive`).

---

## 3. Backend API 계약 (frozen — 유일 권위)

### 3.1 Endpoint

```
GET /api/admin/snake/scores
```

- 구현 파일: `snake/api/admin-scores.js` (backend 저장소).
- 응답 `Content-Type: application/json; charset=utf-8`.
- 운영자(CMS) 인증이 필요한 관리 API이며, 권한 없는 요청은 §3.4 권한 거부로 응답한다.

### 3.2 Query 파라미터 (exact)

| param | 필수 | 타입 | 허용 값 | 기본값 |
| --- | --- | --- | --- | --- |
| `mode` | 아니오 | string | `all` \| `single` \| `duo` | `all` |
| `limit` | 아니오 | integer | `10` \| `25` \| `50` \| `100` | `25` |

- `mode=all` 은 모드 무관 전체 랭킹, `single`/`duo` 는 해당 모드만 필터한다.
- `limit` 은 반환 행 최대 개수이며 허용 값 외에는 §3.4 `400`.
- **가정(명시):** `single`/`duo` 는 각각 1인·2인 스네이크 모드를 의미한다. 데이터 소스에 다른 모드 식별자가 있어도 API 노출 값은 위 3종으로 고정한다.

### 3.3 성공 응답 `200 OK` — `{ total, items }`

```json
{
  "total": 2,
  "items": [
    { "rank": 1, "nickname": "PLAYER_ONE", "score": 1200, "mode": "duo",    "playedAt": "2026-08-01T12:00:00.000Z" },
    { "rank": 2, "nickname": "PLAYER_TWO", "score": 900,  "mode": "single", "playedAt": "2026-07-31T09:30:00.000Z" }
  ]
}
```

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `total` | integer ≥ 0 | 조건(`mode`)에 맞는 **전체** 기록 수(표시 개수 `limit` 과 무관) |
| `items` | array | 점수 내림차순 정렬, 최대 `limit` 개 반환 |
| `items[].rank` | integer ≥ 1 | 1부터 연속, 정렬 순위 |
| `items[].nickname` | string | 플레이어 닉네임 |
| `items[].score` | integer ≥ 0 | 점수 |
| `items[].mode` | string(`single`\|`duo`) | 해당 기록의 모드 |
| `items[].playedAt` | string(ISO 8601 UTC) | 기록 시각 |

- 응답 최상위는 **정확히 `{ total, items }`** 두 키만 갖는다.
- 조건에 맞는 기록이 없으면 `200` + `total: 0` + `items: []`(빈 배열) — 화면은 `empty` 상태(§4.4)로 렌더한다.

### 3.4 에러 응답 (exact)

에러 본문은 항상 아래 형태이며 화면은 `error` 상태(§4.4)로 렌더한다.

```json
{ "error": { "code": "invalid_limit", "message": "limit must be one of 10, 25, 50, 100" } }
```

| HTTP | `error.code` | 조건 |
| --- | --- | --- |
| `400` | `invalid_mode` | `mode` 가 허용 값 외 |
| `400` | `invalid_limit` | `limit` 가 허용 값 외(정수 아님 포함) |
| `403` | `forbidden` | **권한 거부** — 운영자 권한 없는 요청 |

- `400` 은 잘못된 query, `403` 은 권한 거부를 나타낸다. 두 에러 모두 위 `{ error: { code, message } }` 형태를 따른다.

---

## 4. Infra CMS 화면 UI 계약 (frozen — 유일 권위)

### 4.1 파일 (infra 저장소)
- `public/admin/snake-ranking/index.html`
- `public/admin/snake-ranking/ranking.css`
- `public/admin/snake-ranking/ranking.js`
- `src/routes/admin-snake-ranking.js`
- `test/admin-snake-ranking.test.js`
- `docs/snake-ranking-admin.md`

### 4.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 화면 루트 컨테이너 | `snake-ranking-root` |
| 모드 필터 select | `snake-ranking-mode-filter` |
| 표시 개수 select | `snake-ranking-limit-select` |
| 랭킹 표 | `snake-ranking-table` |
| 에러 표시 영역 | `snake-ranking-error` |

### 4.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 화면 루트 | `snake-ranking` |
| 필터 행 영역 | `snake-ranking__filters` |
| 랭킹 표 | `snake-ranking__table` |
| 표의 데이터 행 | `snake-ranking__row` |
| 에러 표시 | `snake-ranking__error` |

### 4.4 상태(state) 및 화면 노출 (변경 금지)

| state | 의미 | 화면/접근성 노출 |
| --- | --- | --- |
| `idle` | 초기(조회 전) | 상태명을 화면 텍스트·접근성 이름으로 노출 |
| `loading` | API 조회 진행 중 | 진행 표시 + 상태명 노출 |
| `success` | `200` + `total > 0` | 표에 `snake-ranking__row` 로 랭킹 행 렌더 |
| `empty` | `200` + `total == 0` | "결과 없음" 등 빈 상태 텍스트를 화면·접근성 이름으로 노출 |
| `error` | 비-200 또는 네트워크 실패 | `snake-ranking-error` 에 에러 상태명·메시지 노출 |

- 모든 상태는 **색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름 양쪽으로** 노출한다.

### 4.5 조작(actions) — API query 매핑

| 조작 | 대상 | 결과 |
| --- | --- | --- |
| 최초 로드 | `snake-ranking-root` | `idle → loading` 후 `GET {base}/api/admin/snake/scores?mode=all&limit=25` 호출 |
| 모드 필터 변경 | `snake-ranking-mode-filter` | 선택 값을 `mode` query 로 재조회 |
| 표시 개수 변경 | `snake-ranking-limit-select` | 선택 값을 `limit` query 로 재조회 |

- select 옵션은 §3.2 허용 값과 일치한다(mode: `all`/`single`/`duo`, limit: `10`/`25`/`50`/`100`).
- `{base}` 는 §5 의 API base URL 환경 변수로 결정한다.

### 4.6 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-surface` | `#ffffff` | 화면·표 배경 |
| `--color-text-primary` | `#1f2937` | 주 텍스트 색 |
| `--color-border` | `#e5e7eb` | 표·control 경계선 |
| `--color-error` | `#dc2626` | `error` 상태 텍스트/강조 색 |
| `--space-cell-padding` | `8px` | 표 셀 padding |

### 4.7 접근성 (필수)

1. `snake-ranking-mode-filter` 와 `snake-ranking-limit-select` 는 명시적 `<label for>` 또는 `aria-label` 을 가진다.
2. `snake-ranking-table` 은 `<caption>` 또는 `aria-label` 로 **'스네이크 랭킹 목록'** 목적을 안내한다.
3. 오류 안내(`snake-ranking-error`)는 `role="alert"` 로 노출한다.
4. 모든 상태(§4.4)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.8 반응형 (필수)

- `320px` 이상 뷰포트에서 표가 **가로 overflow 없이 스크롤 컨테이너**로 처리된다.
- `768px` 이상 뷰포트에서 **필터 행(`snake-ranking__filters`)과 표가 정렬된 레이아웃**으로 표시된다.

### 4.9 상태 후조건 / 복구 (필수)

- 초기화·취소·실패(`error`) 뒤에는 상태와 진행 표시를 **초기값**으로 되돌리고, 주 실행 control(모드/개수 select 를 통한 재조회)을 다시 사용할 수 있어야 한다.

---

## 5. 두 저장소 연결 (handoff — API base URL, frozen)

infra CMS 화면(`public/admin/snake-ranking/ranking.js`, `src/routes/admin-snake-ranking.js`)은 backend의
`GET /api/admin/snake/scores`(§3) 를 소비한다. 두 저장소 연결은 아래 base URL 환경 변수로만 설정한다.

| 항목 | 값 / 규칙 |
| --- | --- |
| 환경 변수명 | `SNAKE_API_BASE_URL` |
| 의미 | backend API의 base origin (예: `https://backend.example` 또는 `http://localhost:3000`) |
| 요청 URL 조합 | `${SNAKE_API_BASE_URL}` + `/api/admin/snake/scores` + query(§3.2) |
| 미설정 시 기본 | 동일 origin(빈 base) — 화면과 backend가 같은 origin 이면 `/api/admin/snake/scores` 로 상대 요청 |
| 소유 | infra 저장소가 `SNAKE_API_BASE_URL` 를 read 하여 fetch URL 구성. backend는 API 경로만 제공하며 이 변수를 정의하지 않는다 |

- 경로·query·응답·에러 형태의 유일 권위는 §3 이며, infra는 이를 재정의하지 않고 `SNAKE_API_BASE_URL` 로 origin 만 주입한다.

---

## 6. 관측 실행 모델 (기준 명령 · 파일 확장자, frozen)

| 저장소 | 실행 모델 | 파일 확장자 | 기준 명령 |
| --- | --- | --- | --- |
| backend (`develop-backend`) | plain JS + `node --test` | `.js` | `node --test snake/tests/admin-scores.test.js` |
| infra (`develop-infra`) | nodejs-backend | `.js` | `node --test test/admin-snake-ranking.test.js` |

- backend 테스트 범위는 focused(api 모듈) — 신규 API 모듈만 검증하며 다른 모듈 회귀는 CI가 별도 검증한다.
- infra route/화면은 nodejs-backend 실행 모델로 서빙되며, 계약 검증 테스트도 `node --test` 로 실행한다.

---

## 7. 데이터 모델 (API 응답 표현)

서버 스키마 마이그레이션 없이 **기존 스네이크 점수 데이터를 읽어** §3.3 응답(`{ total, items }`)으로 직렬화한다.

| 필드 | 타입 | 허용 값 / 비고 |
| --- | --- | --- |
| `rank` | integer | ≥ 1, 정렬 순위 |
| `nickname` | string | 플레이어 닉네임 |
| `score` | integer | ≥ 0 |
| `mode` | enum | `single` \| `duo` |
| `playedAt` | string | ISO 8601 UTC |

불변식: `items` 는 `score` 내림차순, `rank` 는 1부터 연속, 길이 ≤ `limit`, `total` 은 필터 전체 수. `mode`/`limit` query 는 §3.2 허용 값만 유효하며 그 외는 §3.4 `400`.

---

## 8. User Stories & Scenarios (Given/When/Then)

### US-1. 최초 랭킹 조회
- **Given** 운영자가 CMS 랭킹 화면(`snake-ranking-root`)을 연다
- **When** 화면이 로드된다
- **Then** `idle → loading` 후 `GET {base}/api/admin/snake/scores?mode=all&limit=25` 를 호출하고, `total > 0` 이면 `success` 로 표에 `snake-ranking__row` 를 렌더한다

### US-2. 모드 필터
- **Given** 화면이 `success` 이다
- **When** `snake-ranking-mode-filter` 에서 `duo` 를 선택한다
- **Then** `mode=duo` 로 재조회하고 결과 모드가 `duo` 인 행만 표시한다

### US-3. 표시 개수 변경
- **Given** 화면이 `success` 이다
- **When** `snake-ranking-limit-select` 에서 `50` 을 선택한다
- **Then** `limit=50` 로 재조회하고 최대 50행을 표시한다

### US-4. 빈 결과
- **Given** 조건에 맞는 기록이 없다
- **When** API 가 `200` + `total: 0` 을 반환한다
- **Then** 화면은 `empty` 상태로 빈 상태 텍스트를 화면·접근성 이름으로 노출한다

### US-5. 에러 · 권한 거부
- **Given** API 가 `400`(잘못된 query) 또는 `403`(권한 거부) 또는 네트워크 실패로 응답한다
- **When** 응답이 처리된다
- **Then** 화면은 `error` 상태로 `snake-ranking-error`(`role="alert"`)에 에러 상태명·메시지를 노출하고, 재조회 control 을 다시 사용할 수 있다(§4.9)

### US-6. 접근성 · 반응형
- **Given** 스크린리더 사용자가 좁은(320px) 또는 넓은(768px) 뷰포트에서 화면을 연다
- **When** 상태가 전이되거나 창 크기가 바뀐다
- **Then** 각 상태명이 화면 텍스트·접근성 이름으로 노출되고, 320px에서 표는 가로 스크롤 컨테이너로, 768px에서 필터 행·표가 정렬 레이아웃으로 표시된다

---

## 9. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | `mode` 허용 값 외 | `400 invalid_mode` → 화면 `error` |
| E-2 | `limit` 허용 값 외(정수 아님 포함) | `400 invalid_limit` → 화면 `error` |
| E-3 | 권한 거부 | `403 forbidden` → 화면 `error` |
| E-4 | 조건에 맞는 기록 없음 | `200 total:0 items:[]` → 화면 `empty` |
| E-5 | 네트워크 실패(응답 없음) | 화면 `error`, 재조회 control 재사용 가능 |
| E-6 | 320px 좁은 뷰포트 | 표가 가로 스크롤 컨테이너로 overflow 없이 표시 |
| E-7 | 768px 이상 뷰포트 | 필터 행·표가 정렬된 레이아웃으로 표시 |
| E-8 | 에러 후 재조회 | `error → loading` 후 정상 상태로 복귀(§4.9) |

---

## 10. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence | 담당 packet |
| --- | --- | --- | --- | --- | --- |
| REQ-1 | `GET /api/admin/snake/scores` — mode/limit query 검증, §3.3 `{ total, items }` 응답·§3.4 `400`/권한거부 에러 exact | US-1~US-5 / E-1~E-4 | TS-BACKEND | build_result, test_result | develop-backend, test-backend |
| REQ-2 | CMS 화면 — §4 파일·DOM ID/class·상태 5종·token·접근성·반응형·후조건 exact 준수, §5 base URL 로 §3 API 소비 | US-1~US-6 / E-4~E-8 | TS-INFRA | build_result, test_result | develop-infra, test-infra |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 마이그레이션 없음(기존 점수를 읽어 노출). 저장소 규약 유지.
- 모든 파일 정책 `additive` — 기존 구조를 파괴하지 않는다.

### 롤백
- backend: `snake/api/admin-scores.js`, `snake/tests/admin-scores.test.js`, `docs/admin-snake-scores-api.md` 제거로 무손상 롤백.
- infra: `src/routes/admin-snake-ranking.js`, `test/admin-snake-ranking.test.js`, `public/admin/snake-ranking/**`, `docs/snake-ranking-admin.md` 제거로 무손상 롤백. `SNAKE_API_BASE_URL` 미설정 시 동일 origin 기본으로 회귀.
- 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- 계약 일치: §3 경로·query·`{ total, items }`·에러 및 §4 selector·token exact 준수 100%.
- 접근성: 상태 5종 모두 화면 텍스트+접근성 이름 노출, select `label`/`aria-label`·표 caption/aria-label·오류 `role="alert"` 100%.
- 반응형: 320px overflow 0건(가로 스크롤 컨테이너), 768px 정렬 레이아웃.

---

## 11. Handoff 지시 (후속 페르소나)

- **develop-backend (backend developer)** — `snake/api/admin-scores.js`(§3 핸들러), `snake/tests/admin-scores.test.js`(§3 계약 검증), `docs/admin-snake-scores-api.md`(API 사용 문서)를 구현한다. §3 경로·query·`{ total, items }`·에러(`400`/`403`)를 그대로 구현하고 infra 파일은 건드리지 않는다. 검증: `node --test snake/tests/admin-scores.test.js`.
- **develop-infra (infra developer)** — `public/admin/snake-ranking/index.html`(§4.2 DOM+§4.6 token), `ranking.css`(상태 스타일), `ranking.js`(§4.4 상태·§4.5 조작·§5 base URL 로 §3 API 소비), `src/routes/admin-snake-ranking.js`(화면 route), `test/admin-snake-ranking.test.js`(§4 계약 검증), `docs/snake-ranking-admin.md`(화면 문서)를 구현한다. §4 selector/token/상태를 그대로 구현하고 backend 파일은 건드리지 않는다. 검증: `node --test test/admin-snake-ranking.test.js`.
- **reviewer (review-backend / review-infra)** — 각 저장소에서 §3/§4 계약값이 selector·token·경로·에러 변경 없이 그대로 구현됐는지, §4.9 후조건(초기화/실패 → 재조회 control 재사용)이 지켜지는지, §5 연결 설정과 저장소 경계·보존 영역이 지켜졌는지 검토한다.
- **tester (test-backend / test-infra)** — backend 는 §3 query 검증·`{ total, items }` 응답·에러(E-1~E-3)와 빈 결과(E-4)를, infra 는 §4 상태 5종·selector·접근성·반응형(§4.7~§4.9)과 §5 API 소비를 검증한다.

> 모든 후속 페르소나는 본 문서 §2~§6 계약값을 유일 권위로 삼으며 경로·query·에러·selector·token·상태 텍스트·base URL 변수를 재정의하지 않는다.
