# CLAUDE.md — brix-flow-test

> 모든 페르소나(dev/reviewer/tester/designer)가 task 시작 시 자동으로 읽는 프로젝트 컨텍스트.
> base 템플릿: `vanilla-web`. 본 문서는 main 실제 코드 분석으로 작성 (BF-603, Phase 10).

## 시스템 개요

빌드 도구·번들러·패키지 의존성이 **0건**인 순수 Vanilla HTML/CSS/JS SPA 모음.
각 기능은 top-level 디렉토리 1개 = SPA 1개로 독립 동작한다 (flat-modules 구조).
현재 module: `notepad`(메모장) · `timer`(mm:ss 카운트다운) · `stopwatch`(lap) ·
`kanban`(보드) · `pomodoro`(BF-432, 25/5/15 사이클). 상태는 전부 localStorage 직접 사용.

## 핵심 entry / flow

- 진입점은 각 module 의 `<module>/index.html` (예: `pomodoro/index.html`).
  공통 진입 라우터·로그인·서버 없음 — HTML 을 직접 연다.
- 실행: `file://` 직접 열기 **또는** `python3 -m http.server` 정적 서버.
  외부 CDN·ES module 동적 import·`fetch()` self-load 0건 → `file://` 에서 CORS 에러 0건이어야 한다.
- script 로드 순서 = 상대경로(`./`) 기준 `storage.js → (logic/timer).js → main.js`.
  순서/경로가 깨지면 module 전체가 죽는다.

## 자동 트리거 / side effect

- **테마 강제**: `pomodoro` 는 첫 방문 시(`localStorage["bf-theme"]` 미저장) **다크 강제**
  — flicker 방지를 위해 `<head>` 인라인 스크립트가 `data-theme` 를 즉시 세팅한다.
- **테마 키 공유**: `bf-theme`("dark"/"light") 는 module prefix 밖의 **전역 공유 키**.
  한 SPA 에서 토글하면 다른 모든 SPA 에 전파된다 — 회귀 시 cross-module 영향 주의.
- `pomodoro` 는 0:00 도달 시 다음 모드 자동 진입 + in-app toast(3.5s). 사운드/시스템 알림 없음.
- 일부 module 은 모달(`role="dialog"`)을 진입/조건부로 자동 노출할 수 있다(예: notepad 삭제 확인,
  설정 모달 자동 오픈 패턴). e2e 는 `localStorage.clear()`+`reload()` 후 **모달이 본 셀렉터를
  가린 채 timeout** 나는 함정을 반드시 우회할 것.

## 핵심 셀렉터 / localStorage 키

- localStorage 네임스페이스는 **module 별 prefix** 로 격리:
  `pomodoro:state` / `pomodoro:stats` / `pomodoro:debug:speed`, `notepad.*`, 등.
  신규 키는 그 module 의 기존 prefix 컨벤션을 먼저 확인 후 따른다.
- 전역 공유: `bf-theme`.
- 안정 식별자는 `id` 중심(예: `#theme-toggle`, `#btn-primary`, `#settings-trigger`,
  `#settings-modal`, `#sound-toggle`). 새 UI 추가 시 e2e 가 잡을 안정 `id`/`aria` 부여 필수.
- 키보드: 다수 module 이 `document` keydown 리스너 사용(Space/R/S/T/Esc 등).

## 테스트

- 러너: `node --test tests/*.test.js` (npm `test`). module 별 `tests/<module>-*.test.js`.
- 스코프 env: `BRIX_TEST_MODULE` / `BRIX_TEST_SCOPE`(focused/related/full) — `*-e2e-worker-host`
  테스트는 `BRIX_TEST_MODULE` 불일치 시 module 전체 `t.skip()` (focused 격리).
- e2e 는 `BRIX_PERSONA_HOST` 우선 — `localhost`/`host.docker.internal` 금지(e2e-runner 별 컨테이너).
  도달 불가/`BRIX_E2E_SKIP=1` 시 `t.skip()` (CI 결정성, hookFail 패턴 금지).
- `pomodoro/` 는 비-module(UMD) 패턴 — `createRequire(import.meta.url)` 로 로드.

## 흔한 함정 (Pitfalls)

1. **엔트리 자동 모달/테마** — `clear()`+`reload()` 직후 즉시 셀렉터 검사 금지.
   자동 모달은 닫고, `pomodoro` 다크 강제처럼 인라인 초기화 타이밍을 고려할 것.
2. **`bf-theme` 전역 공유** — 한 module 변경이 타 module 회귀를 유발할 수 있다.
3. **module localStorage prefix** — 신규 키는 기존 prefix 컨벤션과 충돌/혼선 없게.
4. **file:// CORS 가드** — 외부 CDN·동적 import·self `fetch()` 추가 금지. console.error 0건 유지.
5. **비동기/로드 순서** — vendor·`load` 이벤트 후 초기화 시 `waitForLoadState('networkidle')`.
6. **Web Audio** — `AudioContext` 는 사용자 인터랙션 후 생성, `suspended` 시 `resume()` 필요.
