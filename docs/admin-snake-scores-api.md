# 운영자용 스네이크 랭킹 조회 API (BF-1575)

운영자(CMS)가 스네이크 랭킹을 **모드·표시 개수**로 조회하는 backend 관리 API 문서입니다.
경로·query·응답 형태·에러 조건의 **유일 권위**는 `docs/plans/implementation-plan.md` §3 (동결 계약)이며, 본 문서는 그 사용법·설정법을 설명합니다.

- 구현: `snake/api/admin-scores.js` (빌드 없이 실행 가능한 plain JavaScript, ESM)
- 테스트: `snake/tests/admin-scores.test.js` (`node --test`)
- 기존 `GET /api/snake/scores` 와 점수 저장(POST) 경로의 동작·응답은 **변경하지 않습니다** (읽기 전용, additive).

---

## 1. 기능

- `GET /api/admin/snake/scores` — 운영자 인증이 필요한 랭킹 목록 조회 엔드포인트.
- `mode` 로 전체/단일/듀오 모드를 필터하고, `limit` 으로 표시 개수를 제한합니다.
- 응답은 **점수 내림차순**으로 정렬되어 `rank`(1부터 연속)가 부여되며, `total` 은 표시 개수와 무관한 필터 전체 수입니다.
- 잘못된 query 는 `400`, 권한 없는 요청은 `403` 으로 거부합니다.

---

## 2. 요청 (query 파라미터)

| param | 필수 | 타입 | 허용 값 | 기본값 |
| --- | --- | --- | --- | --- |
| `mode` | 아니오 | string | `all` \| `single` \| `duo` | `all` |
| `limit` | 아니오 | integer | `10` \| `25` \| `50` \| `100` | `25` |

- `mode=all` 은 모드 무관 전체 랭킹, `single`/`duo` 는 해당 모드만 필터합니다.
- `mode`/`limit` 값이 빈 문자열이면 미지정으로 간주해 기본값을 적용합니다.
- 허용 값 외의 `mode`/`limit`(정수가 아닌 값 포함)은 `400` 입니다.

---

## 3. 응답

### 3.1 성공 `200 OK`

`Content-Type: application/json; charset=utf-8`. 최상위는 **정확히 `{ total, items }`** 두 키만 갖습니다.

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
| `total` | integer ≥ 0 | 조건(`mode`)에 맞는 **전체** 기록 수 (표시 개수 `limit` 과 무관) |
| `items` | array | 점수 내림차순 정렬, 최대 `limit` 개 |
| `items[].rank` | integer ≥ 1 | 1부터 연속인 정렬 순위 |
| `items[].nickname` | string | 플레이어 닉네임 |
| `items[].score` | integer ≥ 0 | 점수 |
| `items[].mode` | `single` \| `duo` | 해당 기록의 모드 |
| `items[].playedAt` | string(ISO 8601 UTC) | 기록 시각 |

- 조건에 맞는 기록이 없으면 `200` + `total: 0` + `items: []` (빈 배열) 입니다.

> 참고: 응답의 시각 필드명은 동결 계약 §3.3 에 따라 `playedAt` 입니다.

### 3.2 에러

에러 본문은 항상 `{ error: { code, message } }` 형태입니다.

```json
{ "error": { "code": "invalid_limit", "message": "limit must be one of 10, 25, 50, 100" } }
```

| HTTP | `error.code` | 조건 |
| --- | --- | --- |
| `400` | `invalid_mode` | `mode` 가 허용 값 외 |
| `400` | `invalid_limit` | `limit` 가 허용 값 외 (정수 아님 포함) |
| `403` | `forbidden` | 운영자 권한 없는 요청 (권한 거부) |

---

## 4. 사용법 (호출 예시)

### 4.1 HTTP (curl)

운영자 토큰을 `Authorization: Bearer` 헤더로 전달합니다.

```bash
# 전체 모드 상위 25 (기본값)
curl -H "Authorization: Bearer $SNAKE_ADMIN_API_TOKEN" \
  "http://localhost:3000/api/admin/snake/scores"

# 듀오 모드 상위 10
curl -H "Authorization: Bearer $SNAKE_ADMIN_API_TOKEN" \
  "http://localhost:3000/api/admin/snake/scores?mode=duo&limit=10"

# 권한 거부 예시 (토큰 없음) → 403 forbidden
curl -i "http://localhost:3000/api/admin/snake/scores"
```

### 4.2 Node 서버에 route 연결

`adminScoresRoute(req, res, deps?)` 어댑터를 http 서버에 그대로 연결할 수 있습니다.

```js
import http from 'node:http';
import { adminScoresRoute } from './snake/api/admin-scores.js';

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/api/admin/snake/scores')) {
      // deps 미지정 시 SNAKE_ADMIN_API_TOKEN(인증)·SNAKE_SCORES_FILE(데이터)을 사용
      adminScoresRoute(req, res);
      return;
    }
    res.writeHead(404).end();
  })
  .listen(3000);
```

### 4.3 순수 핸들러 직접 호출 (테스트/커스텀 통합)

`handleAdminScores(request, deps?)` 는 HTTP 프레임워크에 의존하지 않는 순수 함수로, `{ status, headers, body }` 를 반환합니다. `deps.authorize`(인증)와 `deps.readScores`(데이터 소스)를 주입하면 단위 테스트에서 환경 변수 없이 검증할 수 있습니다.

```js
import { handleAdminScores } from './snake/api/admin-scores.js';

const result = await handleAdminScores(
  { method: 'GET', query: { mode: 'single', limit: 10 }, headers: {} },
  {
    authorize: () => true, // 인증 통과 주입
    readScores: () => [
      { nickname: 'A', score: 500, mode: 'single', playedAt: '2026-08-01T00:00:00.000Z' },
    ],
  },
);
// result.status === 200, result.body === { total: 1, items: [...] }
```

---

## 5. 설정법 (환경 변수)

| 환경 변수 | 필수 | 의미 |
| --- | --- | --- |
| `SNAKE_ADMIN_API_TOKEN` | 예(운영) | 운영자 인증 토큰. 요청의 `Authorization: Bearer <token>` 또는 `x-admin-token` 헤더 값과 일치해야 접근 허용. **미설정 시 모든 요청을 `403` 으로 거부**(secure by default). |
| `SNAKE_SCORES_FILE` | 아니오 | 기본 데이터 로더가 읽을 점수 JSON 파일 경로. JSON 배열(또는 `{ "items": [...] }`) 형식이며, 각 원소는 `{ nickname, score, mode, playedAt }`. 미설정/파싱 실패 시 빈 목록으로 안전하게 fallback. |

- 커스텀 데이터 소스(DB 등)를 쓰려면 `handleAdminScores`/`adminScoresRoute` 에 `deps.readScores` 를 주입하세요. 이 경우 `SNAKE_SCORES_FILE` 는 사용되지 않습니다.
- 인증 로직을 커스터마이즈하려면 `deps.authorize` 를 주입하세요.
- `SNAKE_SCORES_FILE` 은 **읽기 전용**이며, 기존 점수 저장(POST) 경로·스키마를 변경하지 않습니다.

> infra CMS 화면이 이 API 를 소비할 때 사용하는 `SNAKE_API_BASE_URL` 은 infra 저장소 소유 설정입니다(§5, `docs/plans/implementation-plan.md`). backend 는 이 변수를 정의하지 않습니다.

---

## 6. 검증

```bash
node --test snake/tests/admin-scores.test.js
```

성공/400(`invalid_mode`, `invalid_limit`)/권한 거부(`403 forbidden`)/빈 결과 및 HTTP 어댑터 통합 케이스를 포함합니다.
