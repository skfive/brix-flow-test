# status-badge 배지 3종 시각 명세 (BF-2185 / Epic BF-2184)

- Epic: BF-2184 (status-badge 위젯)
- 선행 작업: BF-2187 — planner(박기획) `docs/plans/BF-2184/implementation-plan.md` (색상 token·폭 계산·상태 어휘·엔드포인트 계약 동결)
- 작성: designer(이디자인)
- 범위: `up` / `degraded` / `down` 배지 3종 + `invalid`(404 파생 상태) 표시 정책의 시각 명세. **런타임 HTML/CSS/JS(mockup 포함)는 이 작업 범위 밖이며 생성하지 않는다.**

> 본 문서는 planner가 동결한 `ui-contract@v1`(색상 token, 폭 계산 규칙, DOM 구조, 접근성, 상태 모델)을 재정의하지 않고 그대로 인용한다. 출처: `docs/plans/BF-2184/implementation-plan.md` §2~§9.

## 1. 시안 개요

- 변경 범위: `GET /badge/:service` 가 반환하는 SVG 배지의 시각 표현 3종(`up`/`degraded`/`down`) + 조회 실패 시 파생되는 `invalid` 표시 정책.
- 사용자 경험 목표: 상태를 **색상만으로 구분하지 않고**, `label`(서비스명)과 `status`(상태명) 텍스트를 항상 함께 노출해 색맹/스크린리더 사용자도 상태를 식별할 수 있게 한다.
- 배지는 두 세그먼트(label / status)로 구성된 shields.io 스타일이며, 폭은 고정값이 아니라 텍스트 길이에 따라 자동 계산된다(§4).

## 2. 컬러 팔레트 (Frozen — planner 동결, 재정의 금지)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--badge-color-up` | `#4c1` | `badge--up` 배경 |
| `--badge-color-degraded` | `#dfb317` | `badge--degraded` 배경 |
| `--badge-color-down` | `#e05d44` | `badge--down` 배경, **`invalid` 도 이 색상 재사용** |
| `--badge-text-color` | `#ffffff` | label/status 텍스트 색상 (모든 상태 공통) |

`invalid` 전용 색상 token은 존재하지 않는다. **결정(planner 동결): `invalid` 는 `--badge-color-down` 과 `badge--down` 클래스를 재사용**하고, `status` 텍스트만 `"invalid"` 로 표기해 상태를 구분한다.

## 3. 타이포그래피 (Frozen)

| 속성 | 값 |
|---|---|
| font-family | `Verdana, Geneva, DejaVu Sans, sans-serif` |
| font-size | `11px` |
| font-weight | 표준(400, 별도 지정 없음) |
| 텍스트 색상 | `--badge-text-color` (`#ffffff`) 고정, 모든 상태 공통 |
| 정렬 | 각 세그먼트 내부 수평·수직 중앙 정렬 |

## 4. 레이아웃 · 폭 계산 규칙 (Frozen)

- `height` = `--badge-height` = `20px` 고정.
- `width` = label 세그먼트 폭 + status 세그먼트 폭 (자동 계산, 고정폭 아님).

```
segmentWidth(text) = (--badge-padding-x * 2) + (--badge-char-width * text.length)
                    = 12 + 6 * text.length

labelSegmentWidth  = segmentWidth(label)
statusSegmentWidth = segmentWidth(status)
totalSvgWidth       = labelSegmentWidth + statusSegmentWidth
svgHeight            = 20  (고정)
```

- `label` = `:service` 경로 파라미터 원문(변형 없이 echo).
- `status` = `up` | `degraded` | `down` | `invalid`.
- 이 공식으로 320px 이상 컨테이너에서 잘림·overflow 없이 렌더된다(frozen responsive invariant). 라벨이 아무리 길어도 폭이 늘어날 뿐 truncation 하지 않는다.

## 5. 배지 3종 시안 (SVG 명세)

DOM 구조(Frozen, §7 준수): `#badge-svg-root`(`class="badge badge--{state}"`) > `<title>` + label 세그먼트(`.badge__label` > `#badge-label-text`) + status 세그먼트(`.badge__status` > `#badge-status-text`).

시안 데이터는 `status-badge/status.json` 시드값(`auth-api: up`, `worker: degraded`, `database: down`)을 기준으로 예시를 작성한다.

### 5.1 `up` — 정상

- 데이터: `label="auth-api"`(8자), `status="up"`(2자)
- 폭 계산: `labelSegmentWidth = 12 + 6*8 = 60`, `statusSegmentWidth = 12 + 6*2 = 24`, `totalSvgWidth = 84`, `height = 20`
- 배경색: `--badge-color-up` (`#4c1`)

```svg
<svg id="badge-svg-root" class="badge badge--up" role="img" aria-label="auth-api: up"
     width="84" height="20" xmlns="http://www.w3.org/2000/svg">
  <title>auth-api: up</title>
  <g class="badge__label">
    <rect x="0" y="0" width="60" height="20" fill="#555"/>
    <text id="badge-label-text" x="30" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">auth-api</text>
  </g>
  <g class="badge__status">
    <rect x="60" y="0" width="24" height="20" fill="#4c1"/>
    <text id="badge-status-text" x="72" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">up</text>
  </g>
</svg>
```

### 5.2 `degraded` — 저하

- 데이터: `label="worker"`(6자), `status="degraded"`(8자)
- 폭 계산: `labelSegmentWidth = 12 + 6*6 = 48`, `statusSegmentWidth = 12 + 6*8 = 60`, `totalSvgWidth = 108`, `height = 20`
- 배경색: `--badge-color-degraded` (`#dfb317`)

```svg
<svg id="badge-svg-root" class="badge badge--degraded" role="img" aria-label="worker: degraded"
     width="108" height="20" xmlns="http://www.w3.org/2000/svg">
  <title>worker: degraded</title>
  <g class="badge__label">
    <rect x="0" y="0" width="48" height="20" fill="#555"/>
    <text id="badge-label-text" x="24" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">worker</text>
  </g>
  <g class="badge__status">
    <rect x="48" y="0" width="60" height="20" fill="#dfb317"/>
    <text id="badge-status-text" x="78" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">degraded</text>
  </g>
</svg>
```

### 5.3 `down` — 장애

- 데이터: `label="database"`(8자), `status="down"`(4자)
- 폭 계산: `labelSegmentWidth = 12 + 6*8 = 60`, `statusSegmentWidth = 12 + 6*4 = 36`, `totalSvgWidth = 96`, `height = 20`
- 배경색: `--badge-color-down` (`#e05d44`)

```svg
<svg id="badge-svg-root" class="badge badge--down" role="img" aria-label="database: down"
     width="96" height="20" xmlns="http://www.w3.org/2000/svg">
  <title>database: down</title>
  <g class="badge__label">
    <rect x="0" y="0" width="60" height="20" fill="#555"/>
    <text id="badge-label-text" x="30" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">database</text>
  </g>
  <g class="badge__status">
    <rect x="60" y="0" width="36" height="20" fill="#e05d44"/>
    <text id="badge-status-text" x="78" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">down</text>
  </g>
</svg>
```

label 세그먼트 배경(`#555`, 짙은 회색)은 shields.io 관례를 따르는 값으로, planner 동결 표에 없는 세부값이라 참고용이며 developer 구현 시 변경 가능하다(§3 색상 token은 status 세그먼트 색상만 frozen).

## 6. `invalid` 입력 표시 정책

- 발생 조건: `GET /badge/:service` 요청 시 `:service` 가 `status-badge/status.json` 에 없는 키인 경우, 또는 값이 `up|degraded|down` 이 아닌 신뢰할 수 없는 문자열인 경우(§10 edge case).
- HTTP 상태 코드는 `404`이지만 **body는 여전히 유효한 SVG 배지**다 (`<img>` 임베드 시에도 상태를 시각적으로 노출하기 위함).
- 색상: 별도 token 없이 `--badge-color-down`(`#e05d44`) 재사용, class는 `badge badge--down`.
- 텍스트: `label` = 요청받은 `:service` 원문(echo), `status` = `"invalid"` 고정 문자열.

예시: `label="unknown-svc"`(11자) → `labelSegmentWidth = 12+66 = 78`, `status="invalid"`(7자) → `statusSegmentWidth = 12+42 = 54`, `totalSvgWidth = 132`.

```svg
<svg id="badge-svg-root" class="badge badge--down" role="img" aria-label="unknown-svc: invalid"
     width="132" height="20" xmlns="http://www.w3.org/2000/svg">
  <title>unknown-svc: invalid</title>
  <g class="badge__label">
    <rect x="0" y="0" width="78" height="20" fill="#555"/>
    <text id="badge-label-text" x="39" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">unknown-svc</text>
  </g>
  <g class="badge__status">
    <rect x="78" y="0" width="54" height="20" fill="#e05d44"/>
    <text id="badge-status-text" x="105" y="14" text-anchor="middle"
          font-family="Verdana, Geneva, DejaVu Sans, sans-serif" font-size="11" fill="#ffffff">invalid</text>
  </g>
</svg>
```

## 7. 접근성 (Frozen)

- SVG root(`#badge-svg-root`)는 `role="img"` 와 `aria-label="{label}: {status}"` 속성을 가진다.
- SVG root 하위 `<title>` 요소에 `"{label}: {status}"` 텍스트를 포함해 스크린리더가 상태를 읽을 수 있다.
- 모든 상태(`up`/`degraded`/`down`/`invalid`)는 색상만으로 구분하지 않고, `status` 세그먼트 텍스트와 `aria-label`/`<title>` 을 통해 상태명을 항상 노출한다.

## 8. dev 구현 가이드 (BF-2186)

1. `renderBadge.js` 는 §4 폭 계산 공식을 그대로 구현한다: `segmentWidth(text) = 12 + 6 * text.length`. label/status 각각 계산 후 합산해 `totalSvgWidth` 를 결정하고, `height` 는 항상 `20` 으로 고정한다.
2. DOM은 §5 예시의 구조를 그대로 따른다 — `id="badge-svg-root"`, `class="badge badge--{state}"`, `<title>`, `.badge__label > #badge-label-text`, `.badge__status > #badge-status-text`. id/class 이름은 frozen이므로 임의 변경 금지.
3. 색상은 §2 token 값을 하드코딩하거나 상수로 매핑: `up → #4c1`, `degraded → #dfb317`, `down → #e05d44`, `invalid → #e05d44`(down과 동일, `badge--down` 클래스 재사용).
4. `handlers.js` 는 `status.json` 조회 결과에 따라 분기한다:
   - 키가 존재하고 값이 `up|degraded|down` 중 하나 → 200 + 해당 상태로 렌더.
   - 키가 없거나 값이 신뢰할 수 없는 문자열 → 404 + `status="invalid"` + `badge--down` 로 렌더 (§6, §10).
5. `GET /badge/:service` 응답 헤더: `Content-Type: image/svg+xml; charset=utf-8`, `Cache-Control: no-cache, max-age=0`.
6. `GET /healthz` 는 이 문서의 시각 명세와 별개로 JSON을 반환하며(§8.2, `docs/plans/BF-2184/implementation-plan.md` 참조), 배지 렌더링 로직과 공유하지 않는다.
7. `status-badge/status.json` 은 본 문서가 시드로 제공한 예시 데이터(`auth-api: up`, `worker: degraded`, `database: down`)를 그대로 사용해도 되고, 배포 환경에 맞게 developer가 값만 교체할 수 있다 — 단 키/값 스키마(§9, 평면 객체·`up|degraded|down` 값만 허용)는 변경 금지.

## 9. 참조

- 색상 token·폭 계산·DOM·접근성·API 계약의 원본(단일 출처): `docs/plans/BF-2184/implementation-plan.md` (planner, BF-2187)
- 시드 데이터: `status-badge/status.json` (본 작업에서 함께 작성)
- 본 작업 범위에는 시각 mockup HTML이 포함되지 않는다 — SVG 명세는 위 §5/§6 코드 블록으로 대체한다.

## Self-critique

- **AC 매핑**: (1) §2/§4 에 planner 동결 색상·폭 규칙을 그대로 인용하고 §5 에 up/degraded/down 3종 SVG 시안을 명시 — 충족. (2) §5/§6 모든 예시가 label·status 텍스트를 함께 표기 — 충족. (3) 산출물은 이 markdown과 `status-badge/status.json` 뿐이며 런타임 HTML/CSS/JS(mockup 포함)를 생성하지 않음 — 충족.
- **dev 구현 가이드**: §8 에 renderBadge.js/handlers.js 구현 순서를 단계별로 명시함.
- **기존 요소 보존**: 색상 token, DOM id/class, 접근성 속성, 폭 계산 공식을 재정의하지 않고 원문 그대로 인용함(§2~§4, §7).
- **컴포넌트 매핑**: `#badge-svg-root` → `.badge__label`/`.badge__status` → `#badge-label-text`/`#badge-status-text` 구조를 3개 상태 예시 모두에 동일하게 적용함.
- **모호함 flag**: label 세그먼트 배경색(`#555`)은 planner 동결 표에 없는 값으로, shields.io 관례를 참고용으로 제시했으며 §5 하단에 developer가 변경 가능함을 명시함. `status-badge/status.json` 시드 값(auth-api/worker/database)은 예시이며 실제 배포 서비스명과 다를 수 있음을 §8-7 에 명시함.
