# CMS 스네이크 랭킹 — 구현 설계 및 API/UI 계약 동결 (BF-1569)

> 본 문서는 planner가 먼저 작성하고 **backend developer(develop-backend) / infra developer(develop-infra) / reviewer / tester** 가
> 그대로 따르는 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **경로·query·응답 형태·에러코드·selector·상태 텍스트·token 은 아래 값이 유일한 권위**이며 후속 페르소나는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint 의 파일·소유자·상태·후조건을 설명할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1569 (planner)
- executionProfile: `implementation-strict`
- 기획 보증 수준(profile): `standard`
- 대상 저장소: **backend**(primary) + **infra**(reference, read-only)
- 저장소 규약: vanilla-static / esm / `serve_root=.` / route_mapping = root-relative-static
- 소비 packet: `develop-backend`, `develop-infra`

---

## 1. Problem Statement

### 현재 상황
스네이크 랭킹 데이터는 존재하나, **운영자(CMS)가 관리 화면에서 랭킹을 모드·표시 개수로 조회**하는 백엔드 API 계약과
그 데이터를 표시하는 infra CMS 화면 UI 계약이 동결되어 있지 않다. backend developer 와 infra developer 가 병렬로
구현하는데, **API 경로·query·응답 형태·에러코드**와 **화면 selector·상태·token** 이 동결되지 않으면 두 저장소가 서로
다른 계약으로 구현해 handoff 충돌이 발생한다.

### 목표
- backend admin 랭킹 조회 API 를 **경로·query·응답 형태·에러코드** exact 값으로 동결한다.
- infra CMS 랭킹 화면을 **파일·DOM ID/class·상태·token·접근성·반응형** exact 값으로 동결한다.
- **backend / infra 저장소 경계, 보존 영역, 저장소별 문서 요구**를 명시한다.
- 화면의 상태(`idle/loading/loaded/empty/error`) 전이와 초기화·실패 후조건을 확정한다.

### 비즈니스 임팩트
동결된 API/UI 계약은 두 저장소 병렬 producer 의 재작업·머지 충돌을 제거하고, 명시된 저장소 경계는 소유권 혼선과
보존 영역 침범을 방지한다.

---

## 2. 저장소 경계 · 파일 소유권 · 보존 영역 (frozen — 재정의 금지)

이 작업은 **두 저장소**에 걸친다. 각 저장소는 아래 파일 영역만 소유하며 **상대 저장소 파일을 수정하지 않는다.**

### 2.1 backend 저장소 (primary — 본 worktree)

| 파일 | 소유 packet | 정책 | 역할 |
| --- | --- | --- | --- |
| `api/admin/snake-scores.js` | develop-backend (developer) | additive | GET 랭킹 조회 핸들러 — query 검증·JSON/에러 응답 |
| `api/admin/snake-scores.test.js` | develop-backend (developer) | additive | API 계약 검증 테스트 |
| `docs/admin-snake-scores.md` | develop-backend (canonical work packet owner) | additive | backend API 사용 문서 |
| `docs/plans/implementation-plan.md` | plan (planner, 본 문서) | — | 실행 설계 + API/UI 계약 + RTM |

### 2.2 infra 저장소 (reference — `refs/infra/`, 본 worktree 에서는 read-only)

| 파일 | 소유 packet | 정책 | 역할 |
| --- | --- | --- | --- |
| `public/admin/snake-ranking/index.html` | develop-infra (developer) | additive | 랭킹 화면 DOM + token 정의 |
| `public/admin/snake-ranking/snake-ranking.css` | develop-infra (developer) | additive | 상태별 시각 스타일(token 사용) |
| `public/admin/snake-ranking/snake-ranking.js` | develop-infra (developer) | additive | API 호출·상태 전이·렌더 로직(ESM) |
| `test/snake-ranking.test.js` | develop-infra (developer) | additive | 화면 상태·selector·접근성 검증 |
| `docs/snake-ranking.md` | develop-infra (canonical work packet owner) | additive | CMS 화면 사용 문서 |

### 2.3 보존 영역 · 경계 규칙 (필수)

- **backend developer 는 `api/admin/**` 와 `docs/admin-snake-scores.md` 만** 수정한다. infra 파일(`public/admin/snake-ranking/**`, `test/snake-ranking.test.js`, `docs/snake-ranking.md`)은 건드리지 않는다.
- **infra developer 는 `public/admin/snake-ranking/**`, `test/snake-ranking.test.js`, `docs/snake-ranking.md` 만** 수정한다. backend 파일(`api/admin/**`)은 건드리지 않는다.
- 두 저장소의 **기존 파일·공유 utility·전역 상태는 보존**한다. 모든 정책은 `additive` — 계약된 항목을 **추가·구현**하되 변경·삭제·재정의하지 않는다.
- 위 소유권·상태 계약의 유일 권위는 frozen blueprint 이며 본 planner 문서는 이를 재정의하지 않는다.

### 2.4 저장소별 문서 요구 (필수)

- backend: `docs/admin-snake-scores.md` 에 §3 API 계약(경로·query·응답·에러코드) 사용법을 기록한다.
- infra: `docs/snake-ranking.md` 에 §4 화면 계약(상태·selector·조작·§3 API 소비 방식)을 기록한다.

---

## 3. Backend API 계약 (frozen — 유일 권위)

### 3.1 Endpoint

```
GET /api/admin/snake-scores
```

- 구현 파일: `api/admin/snake-scores.js` (route_mapping = root-relative-static → 파일 경로가 곧 route).
- **GET 만 허용**. 그 외 method 는 `405`(§3.4).
- 응답 `Content-Type: application/json; charset=utf-8`.

### 3.2 Query 파라미터 (exact)

| param | 필수 | 타입 | 허용 값 | 기본값 |
| --- | --- | --- | --- | --- |
| `mode` | 아니오 | string | `all` \| `single` \| `duo` | `all` |
| `limit` | 아니오 | integer | `10` \| `25` \| `50` \| `100` | `25` |

- `mode=all` 은 모드 무관 전체 랭킹, `single`/`duo` 는 해당 모드만 필터한다.
- `limit` 은 반환 행 최대 개수이며 허용 값 외에는 `400`(§3.4).
- **가정(명시):** `single`/`duo` 는 각각 1인·2인 스네이크 모드를 의미한다. 데이터 소스에 다른 모드 식별자가 있어도 API 노출 값은 위 3종으로 고정한다.

### 3.3 성공 응답 `200 OK`

```json
{
  "mode": "all",
  "limit": 25,
  "count": 2,
  "scores": [
    { "rank": 1, "nickname": "PLAYER_ONE", "score": 1200, "mode": "duo",    "playedAt": "2026-08-01T12:00:00.000Z" },
    { "rank": 2, "nickname": "PLAYER_TWO", "score": 900,  "mode": "single", "playedAt": "2026-07-31T09:30:00.000Z" }
  ]
}
```

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `mode` | string | 요청에 적용된 mode(기본 `all`) |
| `limit` | integer | 요청에 적용된 limit(기본 `25`) |
| `count` | integer ≥ 0 | `scores` 의 실제 길이 |
| `scores` | array | 점수 내림차순 정렬, 최대 `limit` 개 |
| `scores[].rank` | integer ≥ 1 | 1부터 연속, 정렬 순위 |
| `scores[].nickname` | string | 플레이어 닉네임 |
| `scores[].score` | integer ≥ 0 | 점수 |
| `scores[].mode` | string(`single`\|`duo`) | 해당 기록의 모드 |
| `scores[].playedAt` | string(ISO 8601 UTC) | 기록 시각 |

- 조건에 맞는 기록이 없으면 `200` + `count: 0` + `scores: []`(빈 배열) — 화면은 `empty` 상태(§4.4)로 렌더.

### 3.4 에러 응답 (exact)

에러 본문은 항상 아래 형태이며 화면은 `error` 상태(§4.4)로 렌더한다.

```json
{ "error": { "code": "invalid_limit", "message": "limit must be one of 10, 25, 50, 100" } }
```

| HTTP | `error.code` | 조건 |
| --- | --- | --- |
| `400` | `invalid_mode` | `mode` 가 허용 값 외 |
| `400` | `invalid_limit` | `limit` 가 허용 값 외(정수 아님 포함) |
| `405` | `method_not_allowed` | GET 이외 method |
| `500` | `internal_error` | 조회/직렬화 실패 |

---

## 4. Infra CMS 화면 UI 계약 (frozen — 유일 권위)

### 4.1 파일
- `public/admin/snake-ranking/index.html`
- `public/admin/snake-ranking/snake-ranking.css`
- `public/admin/snake-ranking/snake-ranking.js`
- `test/snake-ranking.test.js`
- `docs/snake-ranking.md`

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
| control(필터/개수) 영역 | `snake-ranking__controls` |
| 랭킹 표 | `snake-ranking__table` |
| 에러 표시 | `snake-ranking__error` |

### 4.4 상태(state) 및 화면 노출 (변경 금지)

| state | 의미 | 화면/접근성 노출 |
| --- | --- | --- |
| `idle` | 초기(조회 전) | 상태명을 화면 텍스트·접근성 이름으로 노출 |
| `loading` | API 조회 진행 중 | 진행 표시 + 상태명 노출 |
| `loaded` | `200` + `count > 0` | 표에 랭킹 행 렌더 |
| `empty` | `200` + `count == 0` | "결과 없음" 등 빈 상태 텍스트 노출 |
| `error` | 비-200 또는 네트워크 실패 | `snake-ranking-error` 에 에러 상태명·메시지 노출 |

- 모든 상태는 **색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름 양쪽으로** 노출한다.

### 4.5 조작(actions) — API query 매핑

| 조작 | 대상 | 결과 |
| --- | --- | --- |
| 최초 로드 | `snake-ranking-root` | `idle → loading` 후 `GET /api/admin/snake-scores?mode=all&limit=25` 호출 |
| 모드 필터 변경 | `snake-ranking-mode-filter` | 선택 값을 `mode` query 로 재조회 |
| 표시 개수 변경 | `snake-ranking-limit-select` | 선택 값을 `limit` query 로 재조회 |

- select 옵션은 §3.2 허용 값과 일치한다(mode: `all/single/duo`, limit: `10/25/50/100`).

### 4.6 Design token / CSS 변수 (변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 주 control(필터/개수) 강조색 |
| `--color-error-text` | `#b91c1c` | `error` 상태 텍스트 색 |
| `--space-control-gap` | `12px` | control 요소 간격 |

### 4.7 접근성 (필수)

1. `snake-ranking-mode-filter` 와 `snake-ranking-limit-select` 는 명시적 `aria-label` 을 가진다.
2. `snake-ranking-table` 은 `caption` 또는 `aria-label` 로 목적을 설명한다.
3. 모든 상태(§4.4)는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 4.8 반응형 (필수)

- `320px` 이상 뷰포트에서 표 내용이 overflow 없이 표시되거나 **가로 스크롤 컨테이너**로 감싼다.

### 4.9 상태 후조건 / 복구 (필수)

- 초기화·취소·실패(`error`) 뒤에는 상태와 진행 표시를 **초기값**으로 되돌리고, 주 실행 control(모드/개수 select 를 통한 재조회)을 다시 사용할 수 있어야 한다.

---

## 5. 데이터 모델 (API 응답 표현)

서버 스키마 마이그레이션 없이 **기존 스네이크 점수 데이터를 읽어** §3.3 응답 형태로 직렬화한다.

| 필드 | 타입 | 허용 값 / 비고 |
| --- | --- | --- |
| `rank` | integer | ≥ 1, 정렬 순위 |
| `nickname` | string | 플레이어 닉네임 |
| `score` | integer | ≥ 0 |
| `mode` | enum | `single` \| `duo` |
| `playedAt` | string | ISO 8601 UTC |

불변식: `scores` 는 `score` 내림차순, `rank` 는 1부터 연속, 길이 ≤ `limit`. `mode`/`limit` query 는 §3.2 허용 값만 유효하며 그 외는 §3.4 에러.

---

## 6. User Stories & Scenarios (Given/When/Then)

### US-1. 최초 랭킹 조회
- **Given** 운영자가 CMS 랭킹 화면(`snake-ranking-root`)을 연다
- **When** 화면이 로드된다
- **Then** `idle → loading` 후 `GET /api/admin/snake-scores?mode=all&limit=25` 를 호출하고, `count > 0` 이면 `loaded` 로 표에 랭킹을 렌더한다

### US-2. 모드 필터
- **Given** 화면이 `loaded` 이다
- **When** `snake-ranking-mode-filter` 에서 `duo` 를 선택한다
- **Then** `mode=duo` 로 재조회하고 결과 모드가 `duo` 인 행만 표시한다

### US-3. 표시 개수 변경
- **Given** 화면이 `loaded` 이다
- **When** `snake-ranking-limit-select` 에서 `50` 을 선택한다
- **Then** `limit=50` 로 재조회하고 최대 50행을 표시한다

### US-4. 빈 결과
- **Given** 조건에 맞는 기록이 없다
- **When** API 가 `200` + `count: 0` 을 반환한다
- **Then** 화면은 `empty` 상태로 빈 상태 텍스트를 화면·접근성 이름으로 노출한다

### US-5. 에러
- **Given** API 가 `400`/`405`/`500` 또는 네트워크 실패로 응답한다
- **When** 응답이 처리된다
- **Then** 화면은 `error` 상태로 `snake-ranking-error` 에 에러 상태명·메시지를 노출하고, 재조회 control 을 다시 사용할 수 있다(§4.9)

### US-6. 접근성 · 반응형
- **Given** 스크린리더 사용자가 좁은(320px) 뷰포트에서 화면을 연다
- **When** 상태가 전이되거나 창 크기가 바뀐다
- **Then** 각 상태명이 화면 텍스트·접근성 이름으로 노출되고, 표는 overflow 없이(또는 가로 스크롤로) 표시된다

---

## 7. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | `mode` 허용 값 외 | `400 invalid_mode` → 화면 `error` |
| E-2 | `limit` 허용 값 외(정수 아님 포함) | `400 invalid_limit` → 화면 `error` |
| E-3 | GET 이외 method | `405 method_not_allowed` |
| E-4 | 조회/직렬화 실패 | `500 internal_error` → 화면 `error` |
| E-5 | 조건에 맞는 기록 없음 | `200 count:0` → 화면 `empty` |
| E-6 | 네트워크 실패(응답 없음) | 화면 `error`, 재조회 control 재사용 가능 |
| E-7 | 320px 좁은 뷰포트 | 표 overflow 없음 또는 가로 스크롤 컨테이너 |
| E-8 | 에러 후 재조회 | `error → loading` 후 정상 상태로 복귀(§4.9) |

---

## 8. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence | 담당 packet |
| --- | --- | --- | --- | --- | --- |
| REQ-1 | `GET /api/admin/snake-scores` — mode/limit query 검증, §3.3 응답·§3.4 에러코드 exact | US-1~US-5 / E-1~E-5 | TS-BACKEND | build_result, test_result | develop-backend, test-backend |
| REQ-2 | CMS 화면 — §4 파일·DOM ID/class·상태·token·접근성·반응형·후조건 exact 준수, §3 API 소비 | US-1~US-6 / E-5~E-8 | TS-INFRA | build_result, test_result | develop-infra, test-infra |

### 마이그레이션 무결
- 서버 데이터 모델·API 스키마 마이그레이션 없음(기존 점수를 읽어 노출). 저장소 규약(vanilla-static/esm) 유지.
- 모든 파일 정책 `additive` — 기존 구조를 파괴하지 않는다.

### 롤백
- backend: `api/admin/**`, `docs/admin-snake-scores.md` 제거로 무손상 롤백. infra: `public/admin/snake-ranking/**`, `test/snake-ranking.test.js`, `docs/snake-ranking.md` 제거로 무손상 롤백. 공유 utility·전역 상태 변경 없음.

### KPI (Success Metrics)
- 계약 일치: §3 경로·query·응답·에러코드 및 §4 selector·token exact 준수 100%.
- 접근성: 상태 5종 모두 화면 텍스트+접근성 이름 노출, select `aria-label`·표 caption/aria-label 100%.
- 반응형: 320px overflow 0건(또는 가로 스크롤).

---

## 9. Handoff 지시 (후속 페르소나)

- **develop-backend (backend developer)** — `api/admin/snake-scores.js`(§3 핸들러), `api/admin/snake-scores.test.js`(§3 계약 검증), `docs/admin-snake-scores.md`(API 사용 문서)를 구현한다. §3 경로·query·응답·에러코드를 그대로 구현하고 infra 파일은 건드리지 않는다. 검증: `node --test`(api 모듈 범위).
- **develop-infra (infra developer)** — `public/admin/snake-ranking/index.html`(§4.2 DOM+§4.6 token), `snake-ranking.css`(상태 스타일), `snake-ranking.js`(§4.4 상태·§4.5 조작·§3 API 소비, ESM), `test/snake-ranking.test.js`(§4 계약 검증), `docs/snake-ranking.md`(화면 문서)를 구현한다. §4 selector/token/상태를 그대로 구현하고 backend 파일은 건드리지 않는다.
- **reviewer (review-backend / review-infra)** — 각 저장소에서 §3/§4 계약값이 selector·token·경로·에러코드 변경 없이 그대로 구현됐는지, §4.9 후조건(초기화/실패 → 재조회 control 재사용)이 지켜지는지, 저장소 경계·보존 영역이 지켜졌는지 검토한다.
- **tester (test-backend / test-infra)** — backend 는 §3 query 검증·응답·에러코드 4종(E-1~E-5)을, infra 는 §4 상태 5종·selector·접근성·반응형(§4.7~§4.9)을 검증한다.

> 모든 후속 페르소나는 본 문서 §2~§4 계약값을 유일 권위로 삼으며 경로·query·에러코드·selector·token·상태 텍스트를 재정의하지 않는다.
