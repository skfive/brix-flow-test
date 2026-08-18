# BF-2187 · 배지 어휘·색상·엔드포인트 실행 설계

- Epic: BF-2184 (status-badge 위젯)
- 관련 Task: BF-2185 (designer), BF-2186 (developer)
- 작성: planner (박기획)
- 목적: designer/developer가 병렬 착수할 수 있도록 상태 어휘·색상·폭 계산·엔드포인트 계약을 exact 값으로 동결한다.

## 1. 개요

`status-badge/` 위젯은 서비스별 상태를 shields.io 스타일 SVG 배지로 렌더링하고, `GET /badge/:service` 로 배지 SVG를,
`GET /healthz` 로 전체 상태를 JSON으로 제공한다. 아래 계약은 [ROLE_WORK_PACKET_V2].frozen_interfaces 의
`ui-contract@v1` 을 그대로 옮긴 것이며, 이 문서에서 새로 재정의하지 않는다. 엔드포인트 요청/응답 계약(§8)과
데이터 모델(§9)은 frozen 계약에 값이 없던 부분을 본 planner task 범위 안에서 확정한 것이다.

## 2. 상태 어휘 (State Vocabulary)

| 상태 문자열 | 의미 | 발생 조건 |
|---|---|---|
| `up` | 정상 | status.json 에 기록된 서비스 상태가 `up` |
| `degraded` | 저하 | status.json 에 기록된 서비스 상태가 `degraded` |
| `down` | 장애 | status.json 에 기록된 서비스 상태가 `down` |
| `invalid` | 조회 불가 | `:service` 가 status.json 에 없는 키 (§8.1 404 케이스 전용, status.json 에는 절대 저장되지 않는 파생 상태) |

## 3. 색상 · 크기 디자인 토큰 (Frozen)

| 토큰 | 값 |
|---|---|
| `--badge-color-up` | `#4c1` |
| `--badge-color-degraded` | `#dfb317` |
| `--badge-color-down` | `#e05d44` |
| `--badge-text-color` | `#ffffff` |
| `--badge-height` | `20` (px) |
| `--badge-font-family` | `Verdana, Geneva, DejaVu Sans, sans-serif` |
| `--badge-font-size` | `11` (px) |
| `--badge-char-width` | `6` (px, 문자당 폭 근사치) |
| `--badge-padding-x` | `6` (px, 세그먼트 좌우 여백) |

`invalid` 상태 전용 색상 토큰은 존재하지 않는다. **결정: `invalid` 는 `--badge-color-down` 과 `badge--down` 클래스를
재사용**하고, 텍스트만 `"invalid"` 로 표기해 상태명을 통해 구분한다 (down과 동일 색상이지만 텍스트로 오류 종류를 구분 가능,
§6 접근성 규칙과 일치).

## 4. 폭(width) 계산 규칙 (Frozen invariant 구체화)

SVG는 `height=20px` 고정, `width` 는 label/status 두 세그먼트 폭의 합으로 자동 계산한다.

```
segmentWidth(text) = (padding-x * 2) + (char-width * text.length)
                    = 12 + 6 * text.length

labelSegmentWidth  = segmentWidth(label)
statusSegmentWidth = segmentWidth(status)
totalSvgWidth       = labelSegmentWidth + statusSegmentWidth
svgHeight            = 20  (고정)
```

- `label` = `:service` 경로 파라미터 원문 (변형 없이 echo)
- `status` = 상태 문자열 (`up` | `degraded` | `down` | `invalid`)
- 이 규칙으로 320px 이상 컨테이너에서 잘림·overflow 없이 렌더된다 (frozen responsive invariant).
- 텍스트는 각 세그먼트 내 수평 중앙 정렬한다.

예시: `label="auth-api"`(8자), `status="degraded"`(8자)
→ labelSegmentWidth = 12+48 = 60, statusSegmentWidth = 12+48 = 60, totalSvgWidth = 120, height = 20.

## 5. DOM 구조 · CSS 클래스 (Frozen)

- `files`: `docs/design/status-badge-contract-BF-2184.md`, `status-badge/lib/handlers.js`, `status-badge/lib/renderBadge.js`, `status-badge/server.js`, `status-badge/status.json`, `status-badge/test/handlers.test.js`, `status-badge/test/renderBadge.test.js`
- `domIds`: `badge-svg-root`, `badge-label-text`, `badge-status-text`
- `cssClasses`: `badge`, `badge__label`, `badge__status`, `badge--up`, `badge--degraded`, `badge--down`
- `states`: `up`, `degraded`, `down`, `invalid`
- 구조: `#badge-svg-root`(class=`badge badge--{state}`) > `<title>` + label 세그먼트(`.badge__label` > `#badge-label-text`) + status 세그먼트(`.badge__status` > `#badge-status-text`)
- `invalid` 상태는 `badge--down` 클래스를 적용한다 (§3).

## 6. 접근성 (Frozen)

- SVG root 요소는 `role="img"` 와 `aria-label="{label}: {status}"` 속성을 가진다.
- SVG root 하위 `<title>` 요소에 `"{label}: {status}"` 텍스트를 포함해 스크린리더가 상태를 읽을 수 있다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

## 7. 반응형 (Frozen)

- SVG는 고정 `height=20px` 를 유지하고, `width` 는 §4 규칙으로 label/status 텍스트 길이에 따라 자동 계산되어
  320px 이상 컨테이너에서 잘림·overflow 없이 렌더된다.

## 8. API 계약

### 8.1 `GET /badge/:service`

**요청**
- Path parameter: `service` (string, 필수) — `status.json` 의 키와 정확히 일치해야 매칭.

**성공 응답 — 200 OK** (service가 status.json에 존재)
- `Content-Type: image/svg+xml; charset=utf-8`
- `Cache-Control: no-cache, max-age=0` (상태가 실시간으로 바뀌므로 캐시하지 않음)
- Body: §4/§5 규칙으로 렌더한 SVG. `label={service}`, `status={status.json[service]}`, class=`badge badge--{status}`.

**실패 응답 — 404 Not Found** (service가 status.json에 없음)
- `Content-Type: image/svg+xml; charset=utf-8`
- Body: §4/§5 규칙으로 렌더한 SVG. `label={service}`, `status="invalid"`, class=`badge badge--down` (§3 재사용 규칙).
- HTTP status code는 404이지만 body는 여전히 유효한 SVG 배지이다 (직접 `<img>` 임베드 시에도 상태를 시각적으로 노출하기 위함). 이 동작은 developer(BF-2186)가 `handlers.js` 에 그대로 구현해야 하는 exact 계약이다.

**Given/When/Then**
- Given `status.json = {"auth-api": "up"}`, When `GET /badge/auth-api`, Then 200 + label="auth-api" + status="up" + class="badge badge--up".
- Given `status.json = {"auth-api": "up"}`, When `GET /badge/unknown-svc`, Then 404 + label="unknown-svc" + status="invalid" + class="badge badge--down".

### 8.2 `GET /healthz`

**요청**
- Path parameter 없음. Query parameter 없음.

**성공 응답 — 200 OK** (유일한 응답 케이스, 파라미터가 없어 404 케이스가 존재하지 않음 — 이는 명시적 설계 결정이다)
- `Content-Type: application/json; charset=utf-8`
- Body:
  ```json
  {
    "status": "up",
    "services": {
      "auth-api": "up",
      "worker": "degraded"
    }
  }
  ```
- `status` (전체 롤업) 계산 규칙: `services` 값 중 하나라도 `down` 이면 `"down"`, 아니면 하나라도 `degraded` 이면
  `"degraded"`, 그 외에는 `"up"`. (`invalid` 는 status.json에 저장되지 않으므로 이 롤업에 나타나지 않는다.)

**Given/When/Then**
- Given `status.json = {"a":"up","b":"up"}`, When `GET /healthz`, Then 200 + `status="up"`.
- Given `status.json = {"a":"up","b":"degraded"}`, When `GET /healthz`, Then 200 + `status="degraded"`.
- Given `status.json = {"a":"down","b":"degraded"}`, When `GET /healthz`, Then 200 + `status="down"`.

## 9. 데이터 모델 — `status.json`

```json
{
  "<service-name>": "up" | "degraded" | "down"
}
```

- 평면(flat) 객체: 키는 서비스명(string), 값은 `up|degraded|down` 중 하나만 허용.
- `invalid` 는 §8.1 404 케이스에서만 파생되는 응답 전용 상태이며 이 파일에는 절대 저장하지 않는다.
- 예시:
  ```json
  {
    "auth-api": "up",
    "worker": "degraded",
    "database": "down"
  }
  ```

## 10. Edge Case / 실패 케이스

- `:service` 가 빈 문자열인 라우트(`/badge/`)는 라우팅 매칭 대상 밖 — 별도 처리 불필요(서버 라우터가 404 처리).
- `status.json` 값이 `up|degraded|down` 외의 문자열이면 handlers.js 는 이를 신뢰하지 않고 §8.1 404/invalid 경로와 동일하게 취급한다 (정의되지 않은 상태를 렌더하지 않기 위함).
- `status.json` 파일 자체가 비어있는 객체 `{}` 인 경우: `/healthz` 는 200 + `status="up"` (빈 services), `/badge/:service` 는 항상 404.
- label(`:service`) 이 매우 긴 문자열이어도 §4 공식이 그대로 적용되어 폭이 늘어날 뿐 잘리지 않는다(고정 폭이 아니므로 별도 truncation 로직 불필요).

## 11. Frozen Blueprint — 파일 소유권 & 상태 (재정의 없음)

이 표는 frozen `ui-contract@v1` 의 `file_owner` 값을 그대로 옮긴 것이며, 본 문서는 이를 재정의하지 않는다.

| 파일 | 소유자 |
|---|---|
| `docs/design/status-badge-contract-BF-2184.md` | designer |
| `status-badge/lib/handlers.js` | developer |
| `status-badge/lib/renderBadge.js` | developer |
| `status-badge/server.js` | developer |
| `status-badge/status.json` | canonical work packet owner |
| `status-badge/test/handlers.test.js` | developer |
| `status-badge/test/renderBadge.test.js` | developer |

- artifact-policy: 위 파일 전부 `additive` — 기존 selector/token 변경·재정의 금지.
- invariant: 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control을 다시 사용할 수 있어야 한다.

## 12. 후속 작업자 체크리스트

- designer(BF-2185): §2~§7 토큰·DOM·접근성·반응형 규칙을 mockup에 그대로 반영 (색상·클래스명 임의 변경 금지).
- developer(BF-2186): §8 요청/응답 계약(200/404, 헤더, body 스키마)과 §4 폭 계산 공식을 `handlers.js`/`renderBadge.js`/`server.js` 에 그대로 구현. §9 데이터 모델로 `status.json` 을 읽고, §10 edge case를 테스트로 커버.
