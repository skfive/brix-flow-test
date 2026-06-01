# 헬스체크 엔드포인트 명세 (`/healthz`)

> 대상: infra 팀 — Kubernetes/로드밸런서의 readiness/liveness probe 구성용 계약(contract)
> 관련 작업: BF-734

backend 서버는 운영 모니터링 및 오케스트레이터 probe 를 위해 `/healthz` 엔드포인트를 제공한다.
이 문서는 infra 팀이 probe 를 구성할 때 필요한 **요청·응답 계약**을 정의한다.

---

## 1. 엔드포인트 요약

| 항목 | 값 |
| --- | --- |
| Path | `/healthz` |
| Method | `GET` |
| 인증 | 없음 (네트워크 내부 probe 전용) |
| Content-Type | `application/json; charset=utf-8` |

---

## 2. 응답 명세

### 2.1 정상 — `200 OK`

모든 의존 서비스(DB, 캐시 등)가 정상일 때:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{ "status": "ok" }
```

### 2.2 비정상 — `503 Service Unavailable`

의존 서비스 중 하나라도 비정상일 때. `checks` 객체에 의존별 실패 사유(`reason`)를 포함한다.

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "checks": {
    "db": { "status": "error", "reason": "connection refused" }
  }
}
```

| 상태 코드 | 의미 | probe 판정 |
| --- | --- | --- |
| `200` | 서버 + 모든 의존 정상 | healthy (트래픽 라우팅 가능) |
| `503` | 의존 서비스 비정상 | unhealthy (트래픽 차단 / 재기동 후보) |

---

## 3. Probe 구성 권장값

### 3.1 timeout

- **요청 timeout 권장값: `2s` (2000ms)**
  - 헬스체크 핸들러는 의존 체크를 병렬·짧게 수행하도록 설계되어 정상 응답은 수십 ms 내 반환된다.
  - probe 의 `timeoutSeconds` 가 너무 짧으면(예: 1s 미만) 일시적 지연을 비정상으로 오판할 수 있다.

### 3.2 readiness probe (트래픽 수용 가능 여부)

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: <service-port>
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 2
  successThreshold: 1
  failureThreshold: 3
```

### 3.3 liveness probe (프로세스 생존 여부)

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: <service-port>
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 2
  failureThreshold: 3
```

> liveness 가 `503` 으로 `failureThreshold` 회 연속 실패하면 오케스트레이터가 컨테이너를 재기동한다.
> 의존 장애(예: DB 다운)로 인한 일시적 `503` 에 대한 재기동을 피하려면, liveness 는 프로세스 자체 생존만 검사하는 별도 경로를 두는 것을 추후 검토할 수 있다. (현재는 단일 `/healthz` 로 통합 제공)

---

## 4. 구현 참고

- 핸들러: `src/routes/health/healthz.js` (`handleHealthz`, `createHealthzServer`)
- 의존 체크 집계 코어: `src/health/check.js` (`runHealthChecks`)
- 의존 체크는 주입 가능(`{ name, check }`)하여 DB·캐시 등 실제 의존을 연결한다.
- 회귀 가드: `tests/health/healthz.test.js`
