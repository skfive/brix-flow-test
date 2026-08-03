# 운영자 스네이크 랭킹 조회 API (`GET /api/admin/snake-scores`)

운영자(CMS)가 스네이크 랭킹을 **모드·표시 개수**로 조회하는 backend API 다.
경로·query·응답 형태·에러코드는 `docs/plans/implementation-plan.md` §3(frozen 계약)의
값을 유일 권위로 구현했다. 기존 점수 데이터를 read-only 로 읽어 직렬화하며, 기존
점수 저장(POST)·조회(`GET /api/snake/scores`) 경로는 변경하지 않는다.

- 구현: `api/admin/snake-scores.js` (순수 ESM, build step 없음)
- 테스트: `api/admin/snake-scores.test.js` (`node --test`)

## 1. 기능

- 스네이크 점수 랭킹을 **score 내림차순**으로 정렬해 반환한다(동점은 먼저 달성한 기록이 상위).
- `mode` 로 모드별 필터(`all`/`single`/`duo`), `limit` 으로 반환 개수를 제어한다.
- 조건에 맞는 기록이 없으면 `200` + 빈 배열, 잘못된 query 는 `400` 을 반환한다.

## 2. 사용법 (API 호출 예시)

### 2.1 Endpoint

```
GET /api/admin/snake-scores
```

- **GET 만 허용**. 그 외 method 는 `405`.
- 응답 `Content-Type: application/json; charset=utf-8`.

### 2.2 Query 파라미터

| param | 필수 | 허용 값 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `mode` | 아니오 | `all` \| `single` \| `duo` | `all` | `all` = 모드 무관 전체, `single`/`duo` = 해당 모드만 |
| `limit` | 아니오 | `10` \| `25` \| `50` \| `100` | `25` | 반환 행 최대 개수 |

> 데이터 소스는 모드를 `single`/`versus` 로 저장하지만, API 노출 값은 `single`/`duo` 로
> 고정한다(§3.2 가정). 즉 데이터 `versus` 는 응답에서 `duo` 로 매핑된다.

### 2.3 요청 예시

```bash
# 전체 랭킹 상위 25개(기본값)
curl 'http://localhost:3000/api/admin/snake-scores'

# 2인(duo) 모드 상위 50개
curl 'http://localhost:3000/api/admin/snake-scores?mode=duo&limit=50'

# 1인(single) 모드 상위 10개
curl 'http://localhost:3000/api/admin/snake-scores?mode=single&limit=10'
```

### 2.4 성공 응답 `200 OK`

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
| `scores[].rank` | integer ≥ 1 | 1부터 연속 |
| `scores[].nickname` | string | 플레이어 닉네임 |
| `scores[].score` | integer ≥ 0 | 점수 |
| `scores[].mode` | `single` \| `duo` | 해당 기록의 모드(데이터 `versus` → `duo`) |
| `scores[].playedAt` | string(ISO 8601 UTC) | 기록 시각 |

- 조건에 맞는 기록이 없으면 `200` + `count: 0` + `scores: []`.

### 2.5 에러 응답

에러 본문은 항상 아래 형태다.

```json
{ "error": { "code": "invalid_limit", "message": "limit must be one of 10, 25, 50, 100" } }
```

| HTTP | `error.code` | 조건 |
| --- | --- | --- |
| `400` | `invalid_mode` | `mode` 가 허용 값 외 |
| `400` | `invalid_limit` | `limit` 가 허용 값 외(정수 아님 포함) |
| `405` | `method_not_allowed` | GET 이외 method |
| `500` | `internal_error` | 조회/직렬화 실패 |

## 3. 설정법 (환경 변수 / wiring)

이 모듈은 순수 ESM 로, 외부 서버 프레임워크나 필수 환경 변수 없이 동작한다.
호출 측은 점수 데이터 소스를 주입해 fetch-like 핸들러를 만든다.

```js
import {
  createAdminScoresFetch,
  createAdminScoresStore,
} from './api/admin/snake-scores.js';

// 점수 소스: 배열 / { list() } / () => rows 를 모두 허용.
// 레코드 스키마는 기존 점수와 동일: { nickname, score, mode(single|versus), recordedAt }
const store = createAdminScoresStore([
  { nickname: 'PLAYER_ONE', score: 1200, mode: 'versus', recordedAt: '2026-08-01T12:00:00.000Z' },
]);

const adminScoresFetch = createAdminScoresFetch(store);
const res = await adminScoresFetch('/api/admin/snake-scores?mode=duo&limit=50');
// res => { status, headers, body }
```

| 설정 항목 | 값 | 설명 |
| --- | --- | --- |
| 데이터 소스 | 함수 / `{ list() }` / 배열 | `createAdminScoresFetch(source)` 에 주입. 미지정 시 빈 목록 |
| 환경 변수 | 없음 | 별도 환경 변수·시크릿 불필요 |
| 라우트 매핑 | root-relative-static | 파일 경로 `api/admin/snake-scores.js` 가 곧 route |

- admin 조회는 소스를 **읽기만** 하며 변경하지 않는다(POST 저장 경로 불변 보장).

## 4. 검증

```bash
node --test api/admin/snake-scores.test.js
```

- 단위: `normalizeMode`/`normalizeLimit` query 검증, `rankScores` 정렬·필터·매핑·limit.
- 통합: 성공 응답 형태(§2.4), 빈 결과, 에러 4종(`invalid_mode`/`invalid_limit`/`method_not_allowed`/`internal_error`), read-only 보장.
