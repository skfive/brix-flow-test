# multi-repo 실행 설계 및 필드명 계약 동결 (BF-1635)

> 본 문서는 planner가 두 저장소(**infra** = `brix-cms`, **backend** = `brix-flow-test`)의 현재 코드를 실제로 읽고 작성한
> 실행 설계(`planning-contract@v1`)이자 동결 UI 계약(`ui-contract@v1`)의 렌더링본입니다.
> **필드 이름·타입·selector·상태·token(값 포함)·접근성·반응형·산출물 경로는 아래 값이 유일한 권위**이며,
> 후속 designer/developer/reviewer/tester는 이를 변경·재정의하지 않습니다.
> 본 문서는 frozen blueprint의 파일·소유자·상태·후조건을 **그대로 설명**할 뿐, 새 파일이나 새 역할을 추가하지 않습니다.

- Jira: BF-1635 (planner)
- executionProfile: `implementation-strict`
- 기획 보증 수준(profile): `standard`
- 대상 저장소: **backend**(primary, 본 worktree) + **infra**(reference, `refs/infra/` read-only)
- 소비 packet: `design`, `develop-backend`, `develop-infra`
- 동결 인터페이스: `planning-contract@v1`, `ui-contract@v1`

---

## 1. Problem Statement

### 현재 상황
- **infra(`brix-cms`)** 는 health 엔드포인트 `GET /`(`src/app.controller.ts` → `src/app.service.ts`)에서 현재 `status`
  필드만 반환한다. 운영 상태 카드가 서비스의 **가동 시간(uptime)** 과 **배포 버전(version)** 을 알 수 없다.
- **backend(`brix-flow-test`)** 의 `apps/status-card/**` 는 vanilla-static(빌드 도구 없음) 상태 카드로, 현재
  새로고침 상태 머신(idle/loading/success/error)만 있고 uptime·version 표시 영역이 없다.
- 두 저장소가 병렬로 확장되는데 **응답 필드 이름·타입이 동결되지 않으면** infra가 내보내는 필드명과 backend가
  소비하는 필드명이 어긋나 handoff가 깨진다. 또한 **공유 타입 파일 없이** 계약을 맞춰야 하므로(두 repo가 서로의
  소스를 import 하지 않음) JSON 필드 이름·타입만이 유일한 계약 매개다.

### 목표
- infra health 응답을 **`status`(불변) + `uptimeSec`(정수 ≥0) + `version`(package.json version) 3필드**로 확장하는
  규칙을 동결한다 (§3, §4).
- backend `apps/status-card` 가 **`uptimeSec`·`version` 두 필드를 소비**해 표시하고, 필드가 없는 **구버전 infra 응답과
  호환(legacy 상태)** 되도록, uptime 표시는 **순수 함수**로 포맷하도록 동결한다 (§5).
- status-card UI 계약을 **파일·DOM ID/class·상태·token(값 포함)·접근성·반응형·산출물 경로** exact 값으로 동결한다 (§5).
- 두 repo 공유 계약을 **공유 타입 파일 없이 JSON 필드 이름·타입으로만** 표현하고, backend 산출물에 **`.ts` 경로를 넣지
  않음**을 명시한다 (§2, §6).

### 비즈니스 임팩트
동결된 필드명·타입·UI 계약은 두 저장소 병렬 producer의 재작업·머지 충돌을 제거한다. 기존 테스트 보존·구버전 호환
규칙은 infra 배포 순서와 무관하게(신 backend + 구 infra 조합에서도) 카드가 깨지지 않도록 보장한다.

---

## 2. 저장소 경계 · 파일 소유권 · 보존 영역 (frozen — 재정의 금지)

이 작업은 **두 저장소**에 걸친다. 각 저장소는 아래 파일 영역만 소유하며 **상대 저장소 파일을 수정하지 않는다.**
아래 소유권·상태 계약의 유일 권위는 frozen blueprint(`ui-contract@v1`)이며 본 planner 문서는 이를 재정의하지 않는다.
모든 파일 정책은 `additive` — 계약된 항목을 **추가·구현**하되 기존 파일·공유 utility·전역 상태를 변경·삭제·재정의하지 않는다.

### 2.1 infra 저장소 (`brix-cms`, reference — `refs/infra/`, 본 worktree에서는 read-only, `develop-infra`)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `src/app.controller.ts` | developer | additive | health 엔드포인트 `GET /` — service 결과를 `{ status, uptimeSec, version }` 로 반환 |
| `src/app.service.ts` | developer | additive | `status`(불변) 유지 + `uptimeSec`(정수 ≥0)·`version`(package.json version) 산출 |
| `src/app.controller.spec.ts` | developer | additive | 기존 `status` 검증 보존 + `uptimeSec`·`version` 검증 추가(§7 갱신 규칙) |

- infra 작업은 **`src/**/*.ts` 만** 다룬다.

### 2.2 backend 저장소 (`brix-flow-test`, primary — 본 worktree)

| 파일 | 소유자 | 정책 | 역할 |
| --- | --- | --- | --- |
| `apps/status-card/index.html` | developer (`develop-backend`) | additive | 기존 카드 레이아웃 유지 + uptime·version 표시 영역 DOM 추가 |
| `apps/status-card/src/refresh.js` | developer (`develop-backend`) | additive | `uptimeSec`·`version` 소비·렌더, 구버전(legacy) 호환, uptime 포맷 순수 함수 |
| `apps/status-card/tests/uptime.test.js` | developer (`develop-backend`) | additive | uptime 포맷 순수 함수·필드 소비·legacy 호환 검증(`node --test`) |
| `docs/design/status-card-BF-1631.md` | designer (`design`) | additive | status-card 화면 시안·UI 계약 설명 문서 |
| `docs/design/status-card-mockup.html` | designer (`design`) | additive | status-card mockup(정적 시안) |
| `docs/plans/implementation-plan.md` | planner (본 문서) | — | 실행 설계 + 필드명 계약 + UI 계약 + RTM |

- backend 작업은 **`apps/status-card/**` 의 `.js`/`.html`/`.css` 와 `docs/**` 만** 다루며 **`.ts` 경로를 넣지 않는다.**
  (backend는 vanilla-static — 브라우저가 `.ts` 를 실행하지 못하므로 산출·실행 파일은 `.js`/`.html`/`.css` 다.)

### 2.3 보존 영역 · 경계 규칙 (필수)

- **infra developer**는 `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts` 만 수정한다. backend 파일은 건드리지 않는다.
- **backend developer**는 `apps/status-card/index.html`, `apps/status-card/src/refresh.js`, `apps/status-card/tests/uptime.test.js` 만 수정한다. infra 파일은 건드리지 않는다.
- **backend designer**는 `docs/design/status-card-BF-1631.md`, `docs/design/status-card-mockup.html` 만 작성한다.
- designer와 developer는 §5의 selector와 token을 **변경하거나 재정의하지 않는다.**
- 두 저장소의 **기존 파일·공유 utility·전역 상태·기존 상태 머신(idle/loading/success/error)은 보존**한다(모든 정책 `additive`).

---

## 3. 두 repo 공유 필드명 계약 (frozen — 공유 타입 파일 없음)

두 저장소는 서로의 소스를 import 하지 않는다. 유일한 계약 매개는 infra health 응답의 **JSON 필드 이름과 타입**이다.
**공유 `.ts`/타입 파일을 만들지 않으며**, backend는 이 계약을 **JSON 필드 이름·타입으로만** 소비한다(§2.2 — backend에 `.ts` 경로 없음).

| 필드 | 타입 | 소유(producer) | 소비(consumer) | 규칙 |
| --- | --- | --- | --- | --- |
| `status` | string | infra (`src/app.service.ts`) | backend `refresh.js` | **불변** — 기존 값·의미를 유지한다(예: `"ok"`). 이번 작업으로 변경하지 않는다. |
| `uptimeSec` | integer ≥ 0 | infra (`src/app.service.ts`) | backend `refresh.js` | 프로세스 가동 시간(**초 단위 정수**). 음수·소수 없음. |
| `version` | string | infra (`src/app.service.ts`) | backend `refresh.js` | infra `package.json` 의 `version` 값(예: `"1.4.0"`). |

- **필드 이름은 정확히 `uptimeSec`·`version`** 이며 대소문자·표기(`uptime_sec`, `uptimeSeconds`, `ver` 등 금지)를 바꾸지 않는다.
- infra는 위 3필드를 반환하고, backend는 위 이름·타입 그대로 읽는다. **필드명 불일치가 handoff 실패의 유일한 원인**이므로 양측이 이 표를 유일 권위로 삼는다.

---

## 4. infra health 응답 확장 (frozen — 유일 권위)

### 4.1 Endpoint

```
GET /
```

- 구현 파일: `src/app.controller.ts`(핸들러) → `src/app.service.ts`(값 산출) (infra 저장소).
- 응답 `Content-Type: application/json`.

### 4.2 성공 응답 `200 OK` — `{ status, uptimeSec, version }`

```json
{
  "status": "ok",
  "uptimeSec": 3720,
  "version": "1.4.0"
}
```

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `status` | string | **불변** — 기존 응답의 `status` 값·의미를 그대로 유지(§3). |
| `uptimeSec` | integer ≥ 0 | 프로세스 가동 시간(초). |
| `version` | string | infra `package.json` 의 `version`. |

- 기존 응답에 있던 `status` 는 **키 이름·값 규칙을 바꾸지 않고 보존**하며, `uptimeSec`·`version` 두 키를 **추가(additive)** 한다.

### 4.3 산출 규칙 (infra `src/app.service.ts`)

- `uptimeSec`: 프로세스 가동 시간을 **정수 초**로 계산한다(소수부 버림, 0 이상). runtime의 가동 시간 소스를 초 단위 정수로 환산해 노출한다.
- `version`: infra 저장소의 `package.json` 의 `version` 문자열을 읽어 그대로 노출한다(별도 하드코딩·중복 상수 금지).
- `status`: 기존 산출 로직을 **변경하지 않는다.**

---

## 5. backend status-card UI 계약 (frozen — 유일 권위)

기존 카드 레이아웃과 상태 머신을 유지하며, `uptimeSec`·`version` 표시 영역을 **additive** 로 추가한다.
아래 파일·selector·상태·token·접근성·반응형은 frozen blueprint(`ui-contract@v1`)의 값이며 designer/developer는 재정의하지 않는다.

### 5.1 파일 (frozen)

| 경로 | 소유자 | 정책 |
| --- | --- | --- |
| `apps/status-card/index.html` | developer | additive |
| `apps/status-card/src/refresh.js` | developer | additive |
| `apps/status-card/tests/uptime.test.js` | developer | additive |
| `docs/design/status-card-BF-1631.md` | designer | additive |
| `docs/design/status-card-mockup.html` | designer | additive |
| `src/app.controller.spec.ts` | developer | additive *(infra 저장소 — §2.1)* |
| `src/app.controller.ts` | developer | additive *(infra 저장소 — §2.1)* |
| `src/app.service.ts` | developer | additive *(infra 저장소 — §2.1)* |

### 5.2 DOM ID (변경 금지)

| 역할 | DOM ID |
| --- | --- |
| 카드 루트 컨테이너 | `status-card-root` |
| 상태 텍스트 영역 | `status-card-status` |
| uptime 표시 영역 | `status-card-uptime` |
| version 표시 영역 | `status-card-version` |
| 새로고침 버튼 | `status-card-refresh` |

### 5.3 CSS class (변경 금지)

| 역할 | class |
| --- | --- |
| 카드 루트 | `status-card` |
| 상태 텍스트 | `status-card__status` |
| uptime 표시 | `status-card__uptime` |
| version 표시 | `status-card__version` |
| 새로고침 버튼 | `status-card__refresh` |

### 5.4 상태(state) 및 화면 노출 (변경 금지)

| state | 의미 | 화면/접근성 노출 |
| --- | --- | --- |
| `idle` | 초기(조회 전) | 상태명을 화면 텍스트·접근성 이름으로 노출 |
| `loading` | health 조회 진행 중 | 진행 표시 + 상태명 노출, 새로고침 control 비활성 |
| `success` | 응답에 `uptimeSec`·`version` 존재 | `status-card-uptime`·`status-card-version` 에 값 렌더 + 상태명 노출 |
| `error` | 비-200 또는 네트워크 실패 | 상태명·오류 메시지 노출, 재조회 control 재사용 가능 |
| `legacy` | 응답에 `uptimeSec`/`version` 없음(구버전 infra) | 카드를 깨뜨리지 않고 `status` 만 표시, uptime/version 은 "정보 없음" 등 대체 텍스트로 상태명 노출 |

- 모든 상태는 **색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름 양쪽으로** 노출한다.
- 초기화·취소·실패(`error`) 뒤에는 상태와 진행 표시를 **초기값으로 되돌리고** 주 실행 control(`status-card-refresh`)을 다시 사용할 수 있어야 한다.

### 5.5 uptime 포맷 순수 함수 (frozen)

`apps/status-card/src/refresh.js` 는 uptime 표시를 **순수 함수**로 포맷한다. 이 함수는 `apps/status-card/tests/uptime.test.js` 로 검증한다.

| 항목 | 계약 |
| --- | --- |
| 입력 | `uptimeSec` — **0 이상 정수(초)** |
| 출력 | 사람이 읽는 표시 문자열(일/시간/분/초 단위, 값이 0인 상위 단위는 생략, 최소 `초` 단위는 항상 표기) |
| 순수성 | **결정적·부작용 없음** — 시계(`Date.now`/`new Date`)·전역 상태·DOM 접근 금지. 같은 입력 → 같은 출력 |
| 경계 | `0` → `"0초"`. 음수·소수 입력은 계약 위반(§3 에서 infra가 정수 ≥0 만 반환) |

- 예: `3720` → `"1시간 2분 0초"` 유형(정확한 표기 문구는 additive 구현·mockup 에서 확정하되, 위 단위 규칙·순수성·경계는 변경하지 않는다).

### 5.6 필드 소비 · 구버전 호환 (frozen)

- `success`: 응답에서 `uptimeSec`(정수)·`version`(문자열)을 읽어 `status-card-uptime` 에는 §5.5 순수 함수 결과를, `status-card-version` 에는 `version` 문자열을 렌더한다.
- `legacy`: 응답에 `uptimeSec` 또는 `version` 이 없으면(구버전 infra) 카드를 깨뜨리지 않고 `status` 만 표시하며, uptime/version 영역은 대체 텍스트("정보 없음" 등)로 상태명을 노출한다. **신 backend + 구 infra 조합에서도 예외 없이 동작한다.**
- `status` 값은 infra 계약(§3)을 그대로 신뢰해 표시하며 재해석하지 않는다.

### 5.7 Design token / CSS 변수 (값 포함 — 변경 금지)

| token | 값 | 용도 |
| --- | --- | --- |
| `--color-status-ok` | `#16a34a` | 정상(`success`) 상태 색 |
| `--color-status-error` | `#dc2626` | `error` 상태 색 |
| `--space-card-gap` | `12px` | 카드 내부 요소 간격 |
| `--font-size-status-label` | `14px` | 상태 라벨 글자 크기 |

### 5.8 접근성 (필수)

1. `status-card-status` 는 `aria-live="polite"` 로 상태 변화를 알린다.
2. `status-card-refresh` 버튼은 명시적 `aria-label="상태 새로고침"` 을 가진다.
3. 모든 상태(§5.4)는 **색상만으로 구분하지 않고** 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 5.9 반응형 (필수)

- `320px` 이상 폭에서 `status`/`uptime`/`version` 텍스트가 **content overflow 없이** 표시된다.

---

## 6. 관측 실행 모델 (기준 명령 · 파일 확장자, frozen)

| 저장소 | 실행 모델 | 파일 확장자 | 기준 검증 명령 |
| --- | --- | --- | --- |
| infra (`develop-infra`) | nodejs-backend (TypeScript) | `.ts` | infra 저장소의 `src/app.controller.spec.ts` (해당 저장소 test runner) |
| backend (`develop-backend`) | vanilla-static + `node --test` | `.js`/`.html`/`.css` | `node --test tests/status-card-*.test.js` (focused, status-card module) |

- backend 테스트 범위는 focused(status-card module) — uptime 포맷 순수 함수·필드 소비·legacy 호환만 검증하며 다른 module 회귀는 CI가 별도 검증한다.
- **공유 타입 파일 없음** — 두 repo는 §3 JSON 필드 이름·타입만으로 계약을 맞춘다. backend 산출물에 `.ts` 경로를 넣지 않는다.

---

## 7. 기존 테스트 갱신 규칙 (frozen)

### 7.1 infra `src/app.controller.spec.ts` (additive 갱신)

- **기존 `status` 검증(assertion)을 보존**한다 — 삭제·약화 금지.
- 응답에 `uptimeSec`(정수 ≥0)·`version`(문자열, package.json version)이 존재함을 검증하는 assertion 을 **추가**한다.
- `status` 값·의미가 바뀌지 않았음을 함께 확인한다(불변 회귀 가드).

### 7.2 backend `apps/status-card/tests/uptime.test.js` (신규 additive)

- §5.5 uptime 포맷 순수 함수: `0 → "0초"`, 값이 0인 상위 단위 생략, 결정성(같은 입력 → 같은 출력), 부작용 없음(시계 미접근)을 검증한다.
- §5.6 필드 소비: `uptimeSec`·`version` 이 있는 응답에서 `success` 로 uptime/version 이 렌더됨을 검증한다.
- §5.6 legacy 호환: `uptimeSec`/`version` 이 없는 응답에서 `legacy` 로 카드가 깨지지 않고 `status` 만 표시됨을 검증한다.
- 기존 상태 머신(idle/loading/success/error) 동작은 보존(회귀 없음).

---

## 8. 데이터 모델 (health 응답 표현)

서버 스키마·저장 마이그레이션 없이 runtime 값을 §4.2 응답으로 직렬화한다.

| 필드 | 타입 | 허용 값 / 비고 |
| --- | --- | --- |
| `status` | string | 기존 값 유지(불변) |
| `uptimeSec` | integer | ≥ 0, 초 단위 정수 |
| `version` | string | infra `package.json` 의 `version` |

불변식: `uptimeSec` 은 음수·소수 없음; `version` 은 package.json version 과 동일; `status` 는 이번 작업으로 변경되지 않음. 공유 타입 파일 없이 이 필드 이름·타입이 두 repo 계약의 유일 권위다.

---

## 9. User Stories & Scenarios (Given/When/Then)

### US-1. uptime·version 표시 (success)
- **Given** infra 가 `{ status, uptimeSec, version }` 를 반환한다
- **When** 운영자가 `status-card-refresh` 로 카드를 새로고침한다
- **Then** `loading → success` 후 `status-card-uptime` 에 §5.5 포맷 결과가, `status-card-version` 에 `version` 이 렌더되고 상태명이 화면·접근성 이름으로 노출된다

### US-2. 구버전 infra 호환 (legacy)
- **Given** 구버전 infra 가 `uptimeSec`/`version` 없이 `{ status }` 만 반환한다
- **When** 카드를 새로고침한다
- **Then** 카드는 `legacy` 상태로 깨지지 않고 `status` 를 표시하며, uptime/version 영역은 대체 텍스트로 상태명을 노출한다

### US-3. uptime 포맷 순수 함수
- **Given** `uptimeSec` 정수(예: `0`, `59`, `3720`)
- **When** 포맷 함수를 호출한다
- **Then** 시계 접근 없이 결정적으로 단위 규칙(§5.5)에 맞는 문자열을 반환한다

### US-4. 에러 · 복구
- **Given** health 조회가 비-200 또는 네트워크 실패로 응답한다
- **When** 응답이 처리된다
- **Then** 카드는 `error` 상태로 상태명·오류 메시지를 노출하고, 초기값 복구 후 `status-card-refresh` 를 다시 사용할 수 있다(§5.4)

### US-5. 접근성 · 반응형
- **Given** 스크린리더 사용자가 320px 폭에서 카드를 연다
- **When** 상태가 전이된다
- **Then** `status-card-status`(`aria-live="polite"`)가 상태 변화를 알리고, `status`/`uptime`/`version` 텍스트가 320px 에서 overflow 없이 표시된다

### US-6. status 불변
- **Given** 이번 작업 전후 infra `status` 산출 로직
- **When** health 를 조회한다
- **Then** `status` 키 이름·값·의미가 동일하고, `uptimeSec`·`version` 만 additive 로 추가된다

---

## 10. Edge / 실패 케이스

| # | 케이스 | 기대 동작 |
| --- | --- | --- |
| E-1 | `uptimeSec = 0` | 포맷 함수 `"0초"`, 카드 `success` |
| E-2 | 응답에 `version` 없음 | 카드 `legacy`, uptime/version 대체 텍스트 |
| E-3 | 응답에 `uptimeSec` 없음 | 카드 `legacy`, `status` 만 표시 |
| E-4 | 비-200 응답 | 카드 `error`, 재조회 control 재사용 가능 |
| E-5 | 네트워크 실패(응답 없음) | 카드 `error`, 초기값 복구 후 재조회 가능 |
| E-6 | 320px 좁은 폭 | status/uptime/version 텍스트 overflow 없이 표시 |
| E-7 | 포맷 함수에 큰 `uptimeSec`(예: 100000) | 결정적으로 일/시간/분/초 단위 문자열 반환 |
| E-8 | infra `status` 로직 변경 시도 | 계약 위반(§3 불변) — 검토·테스트가 회귀 가드 |

---

## 11. Requirements Traceability Matrix (RTM)

| Req | 수용 기준(요약) | 시나리오 | 검증(TestSpec) | Evidence | 담당 packet |
| --- | --- | --- | --- | --- | --- |
| REQ-1 | infra `GET /` 응답에 `status`(불변) + `uptimeSec`(정수 ≥0) + `version`(package.json) 3필드 반환, 기존 spec additive 갱신 | US-6 / E-8 | TS-INFRA | build_result, test_result | develop-infra, test-infra |
| REQ-2 | backend status-card 가 `uptimeSec`·`version` 소비·렌더, 구버전 legacy 호환, uptime 포맷 순수 함수, §5 selector/상태/token exact 준수 | US-1~US-5 / E-1~E-7 | TS-BACKEND | build_result, test_result | design, develop-backend, test-backend |

### 마이그레이션 무결
- 서버 데이터 저장 마이그레이션 없음(runtime 값·package.json 을 읽어 노출). 두 저장소 규약 유지.
- 모든 파일 정책 `additive` — 기존 구조·상태 머신·`status` 계약을 파괴하지 않는다.

### 롤백
- infra: `src/app.service.ts`·`src/app.controller.ts` 에 추가한 `uptimeSec`/`version` 산출 제거로 무손상 롤백(`status` 는 원래 그대로).
- backend: `apps/status-card/**` 의 uptime/version DOM·소비 로직·`tests/uptime.test.js` 제거로 무손상 롤백. 기존 상태 머신 유지.
- 공유 타입 파일 없음 — 계약 롤백은 각 repo 독립.

### KPI (Success Metrics)
- 필드명 일치: infra 산출 필드명과 backend 소비 필드명이 `uptimeSec`/`version` 로 100% 일치.
- 구버전 호환: `uptimeSec`/`version` 부재 응답에서 카드 crash 0건(legacy 정상 렌더).
- 접근성/반응형: 상태 전 종류 화면 텍스트+접근성 이름 노출, 320px overflow 0건.

---

## 12. Handoff 지시 (후속 페르소나)

- **design (backend designer)** — `docs/design/status-card-BF-1631.md`, `docs/design/status-card-mockup.html` 로 §5 UI 계약(레이아웃 유지 + uptime/version additive 표시 영역, 상태 5종, token 값)을 시각화한다. §5 selector·token 을 재정의하지 않는다.
- **develop-infra (infra developer)** — `src/app.service.ts`(uptimeSec·version 산출), `src/app.controller.ts`(`{ status, uptimeSec, version }` 반환), `src/app.controller.spec.ts`(§7.1 기존 status 보존 + 신규 필드 검증)를 구현한다. `status` 는 불변, `src/**/*.ts` 만 다룬다.
- **develop-backend (backend developer)** — `apps/status-card/index.html`(§5.2 DOM 추가), `apps/status-card/src/refresh.js`(§5.5 순수 함수·§5.6 소비·legacy), `apps/status-card/tests/uptime.test.js`(§7.2 검증)를 구현한다. `apps/status-card/**` 의 `.js`/`.html`/`.css` 만 다루며 `.ts` 경로를 넣지 않는다. 검증: `node --test tests/status-card-*.test.js`.
- **reviewer (review-backend / review-infra)** — 각 저장소에서 §3 필드명(`uptimeSec`/`version`)·§4 응답·§5 selector/상태/token 이 변경·재정의 없이 구현됐는지, `status` 불변·구버전 legacy 호환·기존 테스트 보존이 지켜졌는지 검토한다.
- **tester (test-backend / test-infra)** — infra 는 §7.1(status 불변 + 신규 필드), backend 는 §5.5 순수 함수·§5.6 소비·legacy 호환·접근성/반응형을 실제 검증한다.

> 모든 후속 페르소나는 본 문서 §2~§7 계약값을 유일 권위로 삼으며 필드 이름·타입·selector·상태 텍스트·token 을 재정의하지 않고, 공유 타입 파일을 만들지 않으며 backend 에 `.ts` 경로를 넣지 않는다.
