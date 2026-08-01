# 실시간 활동 스트림 카나리 — 실행 설계 (BF-1433)

> 이 문서는 designer(BF-1434)·developer(BF-1435)가 그대로 따라야 하는 실행 계약이다.
> 아래 UI 계약(파일 경로, DOM ID/class, 상태 텍스트, 토큰, 접근성, 반응형)은 **frozen** — 변경·재정의 금지.

## 1. 목표

`demo/live-activity-canary` 아래에 "실시간 활동 스트림" vanilla-static 카나리를 구현한다. 에이전트가 tool을 실행하는 동안의 활동 로그(activity list)와 진행률(token progress)을 idle → streaming → complete/error 상태로 화면에 보여주고, 실패 시 재시도로 idle/streaming을 다시 사용할 수 있어야 한다.

## 2. 범위

**포함**
- `demo/live-activity-canary/index.html`, `demo/live-activity-canary/src/feature.js` (developer 소유)
- `docs/design/live-activity-canary-BF-1433.md` 시각 명세 (designer 소유)
- 위 UI 계약에 정의된 4개 상태(idle/streaming/complete/error) 렌더링과 재시도 흐름

**미포함 (non-goals)**
- 실제 백엔드/네트워크 스트리밍 연동 — 카나리이므로 클라이언트 로컬 시뮬레이션으로 충분
- 디자인 시안 제작(그 자체는 designer 담당, 이 문서는 계약만 고정)
- 신규 파일·역할 추가 — frozen blueprint에 없는 산출물을 만들지 않는다

## 3. 실행 모델 (vanilla-static)

- 빌드 도구 없는 순수 vanilla-static: `index.html` + ESM `src/feature.js`, 외부 프레임워크 의존 없음
- 라우트: `/demo/live-activity-canary` → `serve_root=.` 기준 root-relative static, entry는 `demo/live-activity-canary/index.html`
- 검증: `node --test demo/live-activity-canary/tests/*.test.js` (module_type=esm, package_manager=npm)
- 이 focused 명령이 이 카나리의 authority test 명령이다. 더 넓은 `npm test`/root `node --test`를 이 작업의 검증 기준으로 추가하지 않는다.

## 4. 파일 소유권 (frozen — 재정의 금지)

| 경로 | 소유자 |
|---|---|
| `demo/live-activity-canary/index.html` | developer |
| `demo/live-activity-canary/src/feature.js` | developer |
| `docs/design/live-activity-canary-BF-1433.md` | designer |

세 파일 모두 policy=`additive` — 기존 파일을 재작성하지 말고 새로 추가한다.

## 5. UI 계약 (exact — frozen)

### 5.1 DOM ID
- `activity-stream-root`
- `activity-list`
- `token-progress`
- `activity-status`
- `activity-retry`

### 5.2 CSS class
- `activity-stream`
- `activity-stream__item`
- `token-progress`
- `token-progress__bar`
- `activity-status--error`

### 5.3 상태 (idle / streaming / complete / error)

| 상태 | 화면 텍스트 | `token-progress` | `activity-retry` |
|---|---|---|---|
| idle | "대기 중" | 0% | — |
| streaming | "실행 중 — tool 활동 수신" | 실시간 갱신 | — |
| complete | "완료" | 100% | — |
| error | "실패 — 다시 시도" | (직전 값 유지) | 활성화 |

- 상태 텍스트는 `activity-status` 요소에 표시한다. `activity-status--error`는 error 상태에서만 적용되는 시각 modifier이며, 상태 판별을 색상에만 의존해서는 안 된다(5.4 참고).
- 초기화·취소·실패 이후에는 상태와 진행 표시가 idle 초기값으로 되돌아가고, 스트림을 다시 시작하는 주 실행 control을 즉시 다시 사용할 수 있어야 한다.

### 5.4 디자인 토큰
- `--color-activity-accent: #2563eb`
- `--color-activity-error: #dc2626`
- `--space-activity-gap: 12px`

### 5.5 접근성
- `activity-stream-root`는 `aria-live="polite"` — 새 tool 활동이 추가될 때 스크린리더에 알린다.
- `token-progress`는 `role="progressbar"`와 `aria-valuenow`를 가진다(진행률 갱신마다 값 동기화).
- `activity-retry`는 명시적인 `aria-label`을 가진다.
- 4개 상태 모두 색상만으로 구분하지 않는다 — 상태명을 화면 텍스트(`activity-status`)와 접근성 이름(`aria-label`/텍스트 콘텐츠)으로 함께 노출한다.

### 5.6 반응형
- 320px 이상 뷰포트에서 `activity-stream` 콘텐츠가 overflow를 일으키지 않는다.
- 480px 미만에서는 `token-progress`와 `activity-list`가 세로 스택으로 배치된다.

## 6. 상태 전이 흐름

```
idle --(시작)--> streaming --(정상 종료)--> complete
streaming --(실패)--> error --(재시도: activity-retry)--> streaming
error --(재시도)--> idle 초기값으로 리셋 후 streaming 재개
complete --(재시작 가능 시)--> idle
```

- streaming 중 activity 항목은 `activity-list` 안에 `activity-stream__item`으로 추가되며, 추가될 때마다 `aria-live` 영역이 갱신을 알린다.
- `token-progress__bar`의 폭/값은 `token-progress`의 `aria-valuenow`와 항상 동기화한다.

## 7. Acceptance Criteria (Given/When/Then)

**AC1 — 초기 idle 렌더**
- Given: 카나리 페이지를 처음 로드했을 때
- When: 별도 조작 없이 초기 렌더가 끝나면
- Then: `activity-status`에 "대기 중"이 표시되고 `token-progress`는 0%(`aria-valuenow="0"`)이다.

**AC2 — streaming 진행**
- Given: idle 상태에서 실행을 시작하면
- When: tool 활동이 순차적으로 수신되는 동안
- Then: `activity-status`는 "실행 중 — tool 활동 수신"을 표시하고, 활동이 추가될 때마다 `activity-list`에 `activity-stream__item`이 늘어나며 `token-progress`가 실시간으로 갱신된다.

**AC3 — 정상 완료**
- Given: streaming이 끝까지 성공적으로 진행되면
- When: 마지막 활동까지 처리가 끝나면
- Then: `activity-status`는 "완료"를 표시하고 `token-progress`는 100%(`aria-valuenow="100"`)가 된다.

**AC4 — 실패 및 재시도 노출**
- Given: streaming 도중 실패가 발생하면
- When: 오류가 감지되면
- Then: `activity-status`는 "실패 — 다시 시도"를 표시하고(`activity-status--error` 적용), `activity-retry` control이 활성화되어 노출된다.

**AC5 — 재시도 후 초기화**
- Given: error 상태에서 `activity-retry`를 조작하면
- When: 재시도가 실행되면
- Then: 상태와 `token-progress`가 idle 초기값으로 리셋된 뒤 streaming이 재개되고, 주 실행 control은 다시 정상 사용 가능한 상태다.

**AC6 — 접근성**
- Given: 4개 상태 중 어느 것이든
- Then: 상태 구분이 색상에만 의존하지 않고 화면 텍스트와 접근성 이름으로 함께 노출되며, `activity-stream-root`(aria-live), `token-progress`(role=progressbar/aria-valuenow), `activity-retry`(aria-label)가 각각 계약대로 존재한다.

**AC7 — 반응형**
- Given: 뷰포트 폭이 320px일 때
- Then: `activity-stream` 콘텐츠에 overflow가 없다.
- Given: 뷰포트 폭이 480px 미만일 때
- Then: `token-progress`와 `activity-list`가 세로 스택으로 배치된다.

## 8. Edge Case / 실패 케이스

- streaming 도중 재시도 컨트롤이 아직 비활성 상태에서 사용자가 조작해도 상태가 깨지지 않아야 한다(error 상태에서만 활성화).
- 연속 실패(재시도 후 다시 error) 시에도 상태 텍스트·progress·retry 활성화가 매번 계약대로 초기화·재노출되어야 한다.
- 활동 목록이 길어져도 `activity-stream` 320px 폭에서 overflow가 발생하면 안 된다(가로 스크롤/줄바꿈 처리 필요).
- `token-progress`의 `aria-valuenow`는 시각적 `token-progress__bar` 폭과 항상 같은 값을 가리켜야 한다(둘이 어긋나는 상태로 렌더되면 안 됨).

## 9. 테스트 계획

- 저장소 authority 명령: `node --test demo/live-activity-canary/tests/*.test.js`
- 검증 대상: 상태 전이(idle/streaming/complete/error), 재시도 후 리셋, DOM ID/class 존재, `token-progress`의 `aria-valuenow` 동기화, `activity-retry` 활성화 조건.

## 10. 후속 페르소나 안내

- designer(BF-1434): 5장 UI 계약을 그대로 시각화하여 `docs/design/live-activity-canary-BF-1433.md`에 작성한다. DOM/class/token/상태 텍스트를 재정의하지 않는다.
- developer(BF-1435): 5~7장을 근거로 `demo/live-activity-canary/index.html`, `src/feature.js`를 구현한다. 상태 전이는 6장 다이어그램을, 접근성/반응형은 5.5~5.6을 그대로 따른다.
- tester(BF-1438): 7장 AC를 근거로 `node --test demo/live-activity-canary/tests/*.test.js` 결과를 실제 검증 증거로 남긴다.
