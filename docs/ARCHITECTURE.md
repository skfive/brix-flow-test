# 아키텍처

## 1. 개요

이 문서는 저장소의 디렉터리 구조, 앱 실행 패턴, 테스트 아키텍처, 상태 저장 공유 규약을
정리해 신규 합류자가 코드를 손대기 전 전체 그림을 파악할 수 있게 하는 것을 목적으로 합니다.

> 이 문서는 [BF-2119](plans/BF-2117/implementation-plan.md) 저장소 인벤토리 조사를 근거로
> 작성되었습니다. 조사 방법과 한계는 해당 문서 §0을 참고하세요.

## 2. 디렉터리 구조

저장소 최상위에는 게임·유틸리티 SPA 앱 디렉터리가 대부분을 차지하며, 성격이 다른 몇 개의
그룹으로 나눌 수 있습니다.

### 2.1 게임/유틸리티 앱

`node --test` + vanilla HTML/CSS/JS로 만들어진 사용자 대상 앱입니다. 전체 목록과 1줄 설명은
루트 [`README.md`](../README.md#앱-인벤토리)의 앱 인벤토리 표를 참고하세요.

### 2.2 brix-Flow 자체 검증용 canary/phase 모듈

`booking-approval-phase18`, `delivery-exceptions-canary`, `delivery-status`, `feedback-board`,
`incident-command`, `incident-triage`, `inspection-checklist-canary`, `oncall-handoff`,
`provider-readiness`, `release-approval-canary`, `return-approvals-canary`,
`review-head-timeline`, `skill-canary`, `sla-breach-triage-canary`, `status-card`,
`support-inbox-canary`, `support-inbox-phase18`, `team-reservation-canary`

git 브랜치 이력(`feat/BF-1006-team-reservation-canary`,
`feat/BF-1027-inspection-checklist-canary-module`,
`chore/BF-801-incident-severity-triage-severity-matrix` 등)상 이 그룹은 게임/유틸리티가 아니라
brix-Flow 멀티 에이전트 워크플로 자체를 검증하기 위한 dogfooding/canary 픽스처로 추정됩니다.
사용자 대상 앱 인벤토리와는 별도로 관리합니다.

> **미확정 사항**: 이 그룹을 README 앱 인벤토리에 포함할지, 완전히 별도 문서로 분리할지는
> PM 판단이 필요합니다 (§7 참고).

### 2.3 특이 스택 앱: kanban-board (Vite, React, Vitest)

- `kanban-board/`는 root `package.json`과 무관한 **자체 `package.json`**을 가진 Vite + React 18 +
  Vitest 프로젝트입니다.
- 실행: `cd kanban-board && npm install && npm run dev` (Vite dev server)
- 빌드: `npm run build`
- 테스트: `npm test` (= `vitest run`), 커버리지: `npm run coverage`
- 커밋 근거: `b6198fd feat(bf-2103): 칸반 보드 Vite+React SPA 구현`,
  `bdbe04a feat(bf-2113): kanban-board 테스트 보강`
- 기존 vanilla `kanban/`(§2.1 카테고리)과는 별개 디렉터리입니다. 두 디렉터리가 병행 유지되는지
  후자로 대체될 예정인지는 미확인 상태입니다 (§7 참고).

### 2.4 디자인 mockup 잔존 `.html` 파일

`color-palette.html`, `password-strength.html`, `text-stats.html`, `typing-test.html`,
`unit-converter.html`

git 브랜치 이력에 `docs/BF-1746-html`, `feat/BF-1965-html` 형태의 mockup 전용 브랜치가 다수
존재하여, 이후 정식 디렉터리(`password-strength/`, `typing/`, `unit-converter/`)로 구현이
이관된 뒤 남은 산출물로 추정됩니다. 정식 디렉터리로 대체되어 삭제 가능한지는 미확인입니다
(§7 참고).

### 2.5 공용 인프라 디렉터리

| 디렉터리 | 역할 | 비고 |
|---|---|---|
| `src/`, `tests/`, `e2e/` | 공용 소스 · 단위 테스트 · E2E 테스트 루트 | 루트 `package.json`의 `test` 스크립트가 `tests/`를 참조 |
| `docs/` | 문서 루트 | 하위 디렉터리 목적은 §6 참고 |
| `api/`, `prisma/` | 백엔드 API · DB 스키마로 추정 | `observed_stack=vanilla-static`과 배치되며 실사용 여부 미확인 (§7 참고) |
| `apps/`, `demo/`, `games/` | 앱 묶음/데모 디렉터리로 추정 | 내부 구성 미조사 (§7 참고) |
| `phase18-games/`, `phase18-validation/`, `phase21-validation/`, `planning/`, `refs/` | 단계(phase)별 검증 픽스처로 추정 | §2.2 canary 그룹과 연관 가능, 미조사 (§7 참고) |

## 3. 앱 실행 아키텍처 패턴

### 패턴 A — vanilla `index.html` (게임/유틸리티 앱 대부분)

- `<script>` 태그는 `type="module"`을 사용하지 않는 일반 스크립트입니다. `fetch()` 자체 로드나
  외부 CDN import도 사용하지 않습니다 — `file://`로 직접 열어도 CORS 오류 없이 동작하도록 하기
  위한 의도적 제약입니다 (BF-522).
- 정적 서버(`http-server`, `python3 -m http.server`)로 서빙해도 동일하게 동작합니다.
- 상태는 `localStorage`에 저장하며, 앱별 키 prefix로 격리합니다 (§5 참고).

### 패턴 B — 번들러 기반 (Vite)

- `kanban-board/`만 해당 (§2.3). 자체 `package.json`, `npm install` 필요, ESM/`import`/`export`
  사용 가능.

## 4. 테스트 아키텍처

- **패턴 A 앱**: 루트 `tests/` 디렉터리에 `node --test` 기반 테스트를 앱별 파일 prefix 규칙
  (`tests/<app>-*.test.js`)으로 둡니다. `BRIX_TEST_SCOPE=focused BRIX_TEST_MODULE=<app>`
  환경변수로 focused 범위 실행이 가능합니다.
- **`kanban-board/`**: 자체 Vitest 러너 (`npm test` = `vitest run`, `npm run coverage`).
- **`e2e/`**: 통합/E2E 테스트 자산 루트. 내부 구성은 이 문서에서 상세 조사하지 않았습니다.

## 5. 상태 저장 공유 규약

- 각 SPA는 `localStorage`에 앱 전용 prefix로 상태를 저장합니다 (예: `pomodoro:state`,
  `pomodoro:stats`, `weather:<ulid>`, `weather:__sort__`).
- `bf-theme` 키(`"dark"` / `"light"`)는 **prefix 밖의 공유 키**로, `notepad`/`timer`/`stopwatch`/
  `kanban`/`pomodoro`/`weather` 등 여러 SPA가 동일한 다크/라이트 테마 상태를 공유합니다.
- 신규 앱을 추가할 때도 이 공유 키를 그대로 읽고 쓰도록 구현해 테마 일관성을 유지합니다.

## 6. 문서 체계

`docs/` 하위 디렉터리는 다음과 같이 확인되었습니다.

| 하위 디렉터리 | 목적 | 확인 상태 |
|---|---|---|
| `design/` | 앱별 UI/인터랙션 디자인 명세 (`design/<topic>-<JIRA-KEY>.md`) | 확인됨 — README의 pomodoro/weather 절이 `docs/design/pomodoro-BF-430.md`, `docs/design/weather-BF-435.md`를 실제로 참조 |
| `plans/` | 저장소 구조 개편 등 실행 계획 (`plans/<JIRA-KEY>/implementation-plan.md`) | 확인됨 — 본 문서가 근거로 사용한 `plans/BF-2117/implementation-plan.md` |
| `plan/`, `planning/`, `spec/`, `operator/`, `context-contracts/`, `hotfix-validation/`, `verification/` | 이름 기반 추정(계획/명세/운영/검증 관련 문서로 추정) | **미확인** — 상세 조사 필요 (§7) |

## 7. 알려진 제약 · 미해결 항목

- `api/`, `prisma/`가 실제로 사용 중인 백엔드인지, 미사용 잔존물인지 미확인.
- 카테고리 D(`.html` 단일 프로토타입 파일)를 삭제할지 유지할지 미확인.
- `kanban/`(vanilla)과 `kanban-board/`(Vite+React)의 관계 — 병행 유지인지 후자로 대체 예정인지
  미확인.
- `docs/` 하위 `plan/`, `planning/`, `spec/`, `operator/`, `context-contracts/`,
  `hotfix-validation/`, `verification/`의 목적 구분은 후속 조사가 필요.
- brix-Flow 자체 검증용 canary/phase 모듈(§2.2)을 사용자 대상 README 인벤토리에 포함할지,
  완전히 별도 문서로 분리할지 PM 판단 필요.
- `apps/`, `demo/`, `games/`, `phase18-games/`, `phase18-validation/`, `phase21-validation/`,
  `refs/`의 내부 구성은 미조사.
