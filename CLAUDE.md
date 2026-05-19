# CLAUDE.md — brix-flow-test

> 모든 페르소나(dev/reviewer/tester/designer)가 task 시작 시 자동으로 읽는 프로젝트 컨텍스트.
> base 템플릿: `vanilla-web`. 본 문서는 main 실제 코드 분석으로 작성·갱신.
> 최초 작성 BF-603 → 본 갱신 BF-607 (Phase 10 재검증: `snake` pixi.js 렌더 백엔드 + npm scripts + 로컬 실행 가이드 반영).

## 시스템 개요

빌드 도구·번들러가 없는 순수 Vanilla HTML/CSS/JS SPA 모음 (flat-modules 구조).
각 기능은 top-level 디렉토리 1개 = SPA 1개로 독립 동작한다. 상태는 전부 localStorage 직접 사용.
현재 module: `notepad` · `timer` · `stopwatch` · `kanban` · `pomodoro` ·
`weather` · `clicker` · `dice` · `palette` · `snake`.

- 대부분 module 은 외부 의존성 0건 (CDN·npm 0). 단 **`snake` 는 예외**:
  `snake/vendor/pixi.min.js` (pixi.js v7, ~456KB) 를 **vendoring** 해 상대경로 `<script>` 로 로드한다
  (CDN 호출 X — `file://` 호환 유지). canvas2d ↔ pixi 렌더 백엔드 전환 가능 (아래 참조).
- root `package.json` 은 정적 서버 실행·테스트 스크립트 제공 (npm 의존은 정적 서버 + dev tool 한정).

## 핵심 entry / flow

- 진입점은 각 module 의 `<module>/index.html` (예: `snake/index.html`).
  공통 진입 라우터·로그인·서버 없음 — HTML 을 직접 연다.
- 로컬 실행 두 방법:
  - **방법 A (정적 서버 — 권장)**: `npm install && npm start` → 정적 서버 기동 →
    `http://localhost:8080/snake/` 접근. pixi vendor 등 대용량 asset 도 안정 로드.
  - **방법 B (file:// 직접 열기)**: `snake/index.html` 등을 브라우저로 직접 open.
    외부 CDN·ES module 동적 import·`fetch()` self-load 0건이므로 CORS 에러 없이 동작해야 한다.
    단, `<script type="module">` 사용 금지(file:// 에서 모듈 CORS 차단) — 일반 `<script>` 만.
- npm scripts (root `package.json`):
  - `npm start` — 로컬 정적 서버 (`http-server`/`serve`/`python3 -m http.server` 등) 기동, port 8080.
  - `npm test` — `node --test tests/*.test.js` 정적/단위 테스트.
  - `npm run test:e2e` — e2e (도달 불가/`BRIX_E2E_SKIP=1` 시 `t.skip()`).
- script 로드 순서 = 상대경로(`./`) 기준. `snake` 는 `vendor/pixi.min.js → game.js`,
  타 module 은 `storage.js → logic.js → main.js` 류. 순서/경로가 깨지면 module 전체가 죽는다.

## 자동 트리거 / side effect

- **테마 강제·공유**: `pomodoro` 등은 첫 방문 시(`localStorage["bf-theme"]` 미저장) 다크 강제
  (`<head>` 인라인 스크립트가 `data-theme` 즉시 세팅). `bf-theme`("dark"/"light") 는
  module prefix 밖의 **전역 공유 키** — 한 SPA 토글이 모든 SPA 에 전파(cross-module 회귀 주의).
- **`snake` 설정 모달 자동 오픈**: 게임 진입 시 설정 모달(`#settings-modal`)이 조건부 자동 노출
  (BF-592). e2e 는 `localStorage.clear()`+`reload()` 후 **모달이 본 셀렉터를 가린 채
  timeout** 나는 함정을 반드시 우회(모달 닫기 또는 통과)할 것.
- **`snake` 렌더 백엔드 분기**: `snake/game.js` 가 시작 시 백엔드를 결정한다.
  현재 우선순위: `localStorage["bf-snake-render-backend"]`(`"pixi"`|`"canvas2d"`) 오버라이드
  > `PIXI` 전역 존재 여부 > `canvas2d` 폴백. (BF-607 이후 `?backend=pixi` URL 파라미터 +
  기본값 정책이 보강될 수 있으니, 작업 전 `game.js` 의 `RENDER_BACKEND` 결정부를 먼저 확인.)
  pixi 로드 실패 시 `console.warn` 후 canvas2d 폴백 — 두 백엔드 모두 기능 동치여야 한다.
- `pomodoro` 0:00 도달 시 다음 모드 자동 진입 + in-app toast(3.5s, 사운드/시스템 알림 없음).

## 핵심 셀렉터 / localStorage 키

- localStorage 네임스페이스는 module 별 prefix 로 격리. **prefix 컨벤션이 module 마다 다름**:
  - colon 형: `pomodoro:state` / `pomodoro:stats`, `notepad.*`
  - hyphen 형: `snake` 는 `bf-snake-*` (`bf-snake-high-score`, `bf-snake-render-backend`,
    `bf-snake-settings`, `bf-snake-sound-enabled`, `bf-snake-*-kpi`/`*-stats` 등).
  - 신규 키는 그 module 의 기존 prefix 컨벤션을 먼저 확인 후 따른다.
- 전역 공유: `bf-theme`.
- 안정 식별자는 `id` 중심. `snake` 주요 셀렉터:
  `#game-canvas`(전체화면 캔버스), `#settings-trigger`, `#settings-modal`,
  `#hud-status-panel`, `#hud-snake-length`, `#hud-speed-level`,
  `#buff-bar`, `#item-slot-hud`, `#effect-layer`, `#toast-container`.
  타 module 공통: `#theme-toggle`, `#btn-primary` 등. 새 UI 는 e2e 가 잡을 안정 `id`/`aria` 부여 필수.
- 키보드: 다수 module 이 `document` keydown 사용(`snake`: 방향키/Space/`Z`(아이템)/Esc 등).

## 테스트

- 러너: `node --test tests/*.test.js` (npm `test`). module 별 `tests/<module>-*.test.js`
  (`snake` 은 `tests/snake-BFxxx.test.js` 다수 — KPI/회귀 가드 누적).
- 스코프 env: `BRIX_TEST_MODULE` / `BRIX_TEST_SCOPE`(focused/related/full) —
  `*-e2e-worker-host` 테스트는 `BRIX_TEST_MODULE` 불일치 시 module 전체 `t.skip()`.
- e2e 는 `BRIX_PERSONA_HOST` 우선 — `localhost`/`host.docker.internal` 금지(별도 컨테이너).
  도달 불가/`BRIX_E2E_SKIP=1` 시 `t.skip()` (CI 결정성, hookFail 패턴 금지).
  **단 skip 만 출력하고 pass 처리 금지** — e2e-runner 실제 호출 후 screenshot/stdout artifact 남길 것.
- `pomodoro/` 는 비-module(UMD) 패턴 — `createRequire(import.meta.url)` 로 로드.

## 흔한 함정 (Pitfalls)

1. **엔트리 자동 모달/테마** — `clear()`+`reload()` 직후 즉시 셀렉터 검사 금지.
   `snake` 설정 모달 자동 오픈·`pomodoro` 다크 강제 등 인라인 초기화 타이밍 고려.
2. **`bf-theme` 전역 공유** — 한 module 변경이 타 module 회귀를 유발할 수 있다.
3. **module localStorage prefix 불일치** — colon(`pomodoro:`) vs hyphen(`bf-snake-`).
   신규 키는 기존 컨벤션과 충돌/혼선 없게.
4. **file:// CORS 가드** — 외부 CDN·동적 import·self `fetch()`·`<script type="module">` 추가 금지.
   `snake` 의 pixi 도 **vendoring 만** (`snake/vendor/pixi.min.js` 상대경로). console.error 0건 유지.
5. **pixi 렌더 백엔드 동치성** — canvas2d ↔ pixi 전환 시 격자·뱀·먹이·아이템·게임 오버가
   양쪽 모두 렌더되어야. 한쪽만 수정 시 회귀. pixi 미로드 폴백 경로도 깨지지 않게.
6. **로컬 실행 안내 정합성** — README "로컬 실행" 섹션과 `package.json` scripts 가 어긋나면
   신규 dev 가 따라할 수 없다. scripts 변경 시 README 동기화.
7. **비동기/로드 순서** — vendor·`load` 이벤트 후 초기화 시 `waitForLoadState('networkidle')`.
   `snake` 는 ~456KB pixi vendor 로드 완료 후 game.js 초기화 — 충분한 wait 필요.
8. **Web Audio** — `AudioContext` 는 사용자 인터랙션 후 생성, `suspended` 시 `resume()`.

<!-- bf:claude-md-refreshed:chore/claude-md-refresh-BF-607 -->
