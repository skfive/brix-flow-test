# 전달 상태 배지 계약 위반 수정 — 실행 설계 (BF-1377 / 수정 설계 BF-1381)

> 상태: active(작성) · executionProfile: implementation-strict
> 소유 파일(planner): `docs/plans/delivery-status-badge-BF-1377.md`
> 대상 수정 파일(developer): `apps/delivery-status-badge/src/badge.js`
> 회귀/재현 테스트(tester): `apps/delivery-status-badge/tests/badge.regression.test.js`

## 1. 배경 · 근본 원인

`createBadgeController(refs, options)` 의 `refreshStatus()` 는 `fetchStatus()` 성공 응답을 렌더 상태로 변환한다.
현재 코드(`apps/delivery-status-badge/src/badge.js` line 101):

```js
const resolved = isValidState(result) && result !== 'loading' ? result : 'delivered';
return render(resolved);
```

- `fetchStatus()` 가 **계약 외 status**(예: `'unknown'`, `'cancel'`, 임의 문자열, `null`, `undefined`)를 반환하면
  fallback 이 `'delivered'` 로 치환되어 화면에 **`전달 완료`** 가 표시된다.
- 즉 조회 결과를 알 수 없는 상황에서 **성공(전달 완료)으로 오인**시키는 상태 계약 위반이다.
- 근본 원인은 fallback 기본값이 성공 terminal 상태(`'delivered'`)로 설정된 점 하나이며, `render()` 자체는
  이미 계약 외 값을 idle 로 강등하고(line 58) refresh control 을 재활성화(line 73)하도록 올바르게 구현되어 있다.

## 2. 상태 계약 (수정 후 확정)

### 2.1 유효 status 집합과 계약 외 값 처리 (AC-1, AC-2)

| fetchStatus 결과 | 처리 | 화면 텍스트 | data-state | refresh control |
| --- | --- | --- | --- | --- |
| `'delivered'` | 성공(전달 완료) | `전달 완료` | `delivered` | 활성 |
| `'failed'` (또는 reject/throw) | 실패 | `전달 실패` | `failed` | 활성 |
| `'cancel'` / 취소 조작(`cancel()`/`reset()`) | idle 안전 복귀 | `대기 중` | `idle` | 활성 |
| 그 외 계약 외 값(`'unknown'` 등, `null`, `undefined`, `'loading'`) | **성공으로 간주하지 않고** idle 안전 복귀 | `대기 중` | `idle` | 활성 |

- **유효 성공 terminal status 집합 = `{ delivered, failed }`.**
- `'cancel'` 은 delivery 도메인상 취소를 의미하며 배지에서는 별도 렌더 상태가 없으므로 **idle(대기 중) 안전 복귀**로
  귀결한다(사용자 취소 조작 `cancel()`/`reset()` 와 동일 목적지). 이로써 AC 의 "delivered/failed/cancel 흐름 보존"을 만족한다.
- 위 표의 마지막 행이 이번 수정의 핵심: 계약 외 값은 절대 `delivered` 로 승격하지 않고 idle 로 복귀한다.

### 2.2 idle 복귀 후조건 (AC-2)

계약 외 응답 처리 후 배지는 반드시 다음 상태여야 한다.

1. `status.textContent === '대기 중'` (STATE_LABELS.idle)
2. `root` 의 `data-state === 'idle'`
3. `status` 의 `aria-busy === 'false'`
4. **`refresh` control `disabled === false`** (다시 새로고침 가능)
5. `controller.getState() === 'idle'`

이 후조건은 기존 `render(INITIAL_STATE)` 경로가 이미 보장하므로, 수정은 fallback 목적지만 `idle` 로 바꾸면 충족된다.

## 3. 최소 수정 범위 (AC-4)

- **수정 대상: `apps/delivery-status-badge/src/badge.js` 단 한 곳** — `refreshStatus()` 의 fallback 목적지.
- 브라우저 UI(DOM 구조·selector·`mountFromDocument`·이벤트 바인딩) 변경 없음. **E2E 변경 없음.**
- `STATE_LABELS`, `INITIAL_STATE`, `isValidState`, `render`, `reset`, `cancel` 시그니처 변경 없음.

### 3.1 권장 패치 (surgical, 1-token 교체)

```js
// AS-IS (line 101)
const resolved = isValidState(result) && result !== 'loading' ? result : 'delivered';
// TO-BE
const resolved = isValidState(result) && result !== 'loading' ? result : INITIAL_STATE;
```

- `INITIAL_STATE` 는 이미 이 모듈에 정의(`'idle'`)되어 있어 신규 import/상수 불필요.
- `result !== 'loading'` 가드는 유지한다(응답으로 `'loading'` 이 오면 loading 상태로 오인하고 control 을 비활성화하는
  것을 막기 위함 — 이 값 역시 계약 외이므로 idle 로 복귀).
- 유효 성공 값(`delivered`/`failed`)과 취소/무효화(stale token) 분기(line 100, 105)는 손대지 않는다.

## 4. 보존해야 할 기존 흐름 (AC-3, frozen invariant)

developer 는 다음 기존 동작을 반드시 보존한다.

- **delivered**: `fetchStatus()` → `'delivered'` → `render('delivered')` → 화면 `전달 완료`, control 활성.
- **failed**: `fetchStatus()` reject/throw → `.catch` → `render('failed')` → 화면 `전달 실패`, control 활성.
- **loading 중 control 비활성화**: `render('loading')` 시 `refresh.disabled === true`.
- **stale 응답 무시**: `refresh`/`cancel`/`reset` 로 `requestToken` 증가 후 도착한 이전 요청 응답은 상태를 바꾸지 않는다
  (line 100·105 의 `token !== requestToken` 가드).
- **중복 실행 방지**: `currentState === 'loading'` 이면 `refreshStatus()` 는 재실행하지 않는다(line 91).
- **cancel/reset → idle**: 진행 중 요청 무효화 후 `render(INITIAL_STATE)`.

## 5. 재현 · 회귀 테스트 전략 (AC-3)

러너: **node:test** (`node --test`), 범위 focused. 실행 명령(모듈 한정):

```
node --test apps/delivery-status-badge/tests/badge.regression.test.js
```

DOM 은 최소 fake element stub(`textContent`/`setAttribute`/`disabled` 를 가진 평범한 객체)로 구성한다.
`createBadgeController` 는 브라우저 없이 refs 를 주입받으므로 별도 DOM 라이브러리가 필요 없다.

### 5.1 재현(실패→수정→통과) 테스트 — 핵심 가드

- **RT-1 (계약 외 → idle 안전 복귀)**: `fetchStatus` 가 `'unknown'` 으로 resolve.
  - 기대: `getState() === 'idle'`, `status.textContent === '대기 중'`, `root data-state === 'idle'`,
    `refresh.disabled === false`.
  - 수정 전: `state === 'delivered'`, 텍스트 `전달 완료` → **실패**. 수정 후 통과.
- **RT-2 (null/undefined 응답 → idle)**: `fetchStatus` 가 `undefined`/`null` resolve → RT-1 과 동일 후조건.
- **RT-3 ('loading' 응답 → idle, control 재활성)**: `fetchStatus` 가 `'loading'` resolve →
  `getState() === 'idle'`, `refresh.disabled === false` (loading 오인·control 잠김 없음).

### 5.2 회귀 가드 — 기존 흐름 보존

- **RG-1 (delivered 보존)**: `fetchStatus` → `'delivered'` → 텍스트 `전달 완료`, `data-state='delivered'`, control 활성.
- **RG-2 (failed 보존)**: `fetchStatus` reject/throw → 텍스트 `전달 실패`, `data-state='failed'`, control 활성.
- **RG-3 (cancel/취소 흐름)**: 진행 중 `cancel()` 호출 후 지연 응답 도착 → 상태 idle 유지, 텍스트 `대기 중`.
- **RG-4 (loading control 비활성)**: `refresh()` 호출 직후(응답 전) `refresh.disabled === true`.

### 5.3 종료 조건

- RT-1~RT-3 이 수정 전 최소 1개(RT-1) 실패를 재현하고 수정 후 전부 통과.
- RG-1~RG-4 이 수정 전후 모두 통과(회귀 없음).
- 위 focused 명령이 exit 0.

## 6. 실행 패킷 요약 (Execution Blueprint)

| packet | role | blockedBy | 산출물 |
| --- | --- | --- | --- |
| plan | planner | — | 본 문서 |
| develop | developer | plan | `apps/delivery-status-badge/src/badge.js` 최소 수정 |
| review | reviewer | develop | 상태 계약·최소 범위 준수 검토(review_verdict) |
| test | tester | review | `apps/delivery-status-badge/tests/badge.regression.test.js` |

## 7. Edge / 실패 케이스 명세

- `fetchStatus` 가 Promise 가 아닌 동기 throw → `Promise.resolve().then(fetchStatus)` 체인이 `.catch` 로 흡수 → failed.
- 응답 도착 시점에 이미 `cancel()`/재-`refresh()` 로 token 무효화 → 상태 변경 없이 `currentState` 반환.
- 계약 외 값과 `'cancel'`, `'loading'` 은 모두 동일 목적지(idle)로 귀결 — 분기 폭발 없이 단일 fallback 으로 처리.
- refs 에 `root`/`status`/`refresh` 중 일부 누락 시 각 `if` 가드로 안전 무시(기존 동작 유지).
