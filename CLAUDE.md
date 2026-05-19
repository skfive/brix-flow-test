# CLAUDE.md — brix-flow-test

> 모든 페르소나(dev/reviewer/tester/designer)가 task 시작 시 자동으로 읽는 프로젝트 컨텍스트.
> base 템플릿: `vanilla-web`. 본 문서는 main 실제 코드 분석으로 작성 (BF-603, Phase 10).
> 최종 갱신: BF-617 (2026-05-19) — snake 모듈 + 사운드 시스템 정보 추가.

## 시스템 개요

빌드 도구·번들러·패키지 의존성이 **0건**인 순수 Vanilla HTML/CSS/JS SPA 모음.
각 기능은 top-level 디렉토리 1개 = SPA 1개로 독립 동작한다 (flat-modules 구조).

**현재 module 목록**:
- `notepad` — 메모장 (CRUD, localStorage 영속)
- `timer` — mm:ss 카운트다운 (BF-470~502 시리즈)
- `stopwatch` — lap 스톱워치
- `kanban` — 보드 (drag&drop)
- `pomodoro` — 25/5/15 사이클 타이머 (BF-432, UMD 패턴)
- `snake` — 스네이크 게임 (Pixi.js v7 vendored, Web Audio API 사운드 시스템)
- `clicker` — 클리커 게임 (storage.js + main.js 분리)
- `dice` — 주사위 (storage.js + main.js 분리)
- `palette` — 팔레트 (app.js + storage.js)
- `weather` — 날씨 위젯 (main.js + storage.js)

상태는 전부 localStorage 직접 사용.

## 핵심 entry / flow

- 진입점은 각 module 의 `<module>/index.html` (예: `snake/index.html`).
  공통 진입 라우터·로그인·서버 없음 — HTML 을 직접 연다.
- 실행: `file://` 직접 열기 **또는** `python3 -m http.server` 정적 서버.
  외부 CDN·ES module 동적 import·`fetch()` self-load 0건 → `file://` 에서 CORS 에러 0건이어야 한다.
  **예외**: `snake` 는 `vendor/pixi.min.js` 로컬 UMD 번들 사용 (CDN 아님 — CORS 문제 없음).
- script 로드 순서 = 상대경로(`./`) 기준 `storage.js → (logic/timer).js → main.js`.
  순서/경로가 깨지면 module 전체가 죽는다.
- **snake 전용**: `vendor/pixi.min.js` → `game.js` 순서로만 로드. `logic.js` 없음.

## 자동 트리거 / side effect

- **테마 강제**: `pomodoro` 는 첫 방문 시(`localStorage["bf-theme"]` 미저장) **다크 강제**
  — flicker 방지를 위해 `<head>` 인라인 스크립트가 `data-theme` 를 즉시 세팅한다.
- **테마 키 공유**: `bf-theme`("dark"/"light") 는 module prefix 밖의 **전역 공유 키**.
  한 SPA 에서 토글하면 다른 모든 SPA 에 전파된다 — 회귀 시 cross-module 영향 주의.
- `pomodoro` 는 0:00 도달 시 다음 모드 자동 진입 + in-app toast(3.5s). 사운드/시스템 알림 없음.
- **snake 설정 모달 자동 오픈 (CRITICAL)**: `game.js` 최하단에서 `openSettingsModal("entry")` 가
  **무조건(첫 방문 여부 관계 없이) 매 페이지 로드마다** 설정 모달을 연다.
  e2e 에서 `localStorage.clear()+reload()` 직후 즉시 게임 셀렉터 접근 시 모달이 전면 차단 → timeout.
  **반드시** `waitForFunction(() => !modal.hasAttribute('hidden'))` 으로 모달 열림 확인 후 조작해야 함.
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

### snake module localStorage 키 목록 (사운드 시스템)

| 키 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `bf-snake-sound-enabled` | `"true"/"false"` | `"true"` | BF-567 HUD 토글 (레거시) |
| `snake.settings.soundEnabled` | `"true"/"false"` | `"true"` | 설정 모달 효과음 토글 |
| `snake.settings.soundVolume` | `"0"~"100"` | `"50"` | 효과음 음량 (BF-604) |
| `snake.settings.soundPitch` | `"0.5"~"2.0"` | `"1.0"` | 효과음 피치 배수 (BF-614) |
| `snake.settings.soundPan` | `"-1.0"~"1.0"` | `"0.0"` | 사운드 패닝 — -1=왼쪽, 0=가운데, 1=오른쪽 (BF-617, 구현 예정) |

## 테스트

- 러너: `node --test tests/*.test.js` (npm `test`). module 별 `tests/<module>-*.test.js`.
- 스코프 env: `BRIX_TEST_MODULE` / `BRIX_TEST_SCOPE`(focused/related/full) — `*-e2e-worker-host`
  테스트는 `BRIX_TEST_MODULE` 불일치 시 module 전체 `t.skip()` (focused 격리).
- e2e 는 `BRIX_PERSONA_HOST` 우선 — `localhost`/`host.docker.internal` 금지(e2e-runner 별 컨테이너).
  도달 불가/`BRIX_E2E_SKIP=1` 시 `t.skip()` (CI 결정성, hookFail 패턴 금지).
- `pomodoro/` 는 비-module(UMD) 패턴 — `createRequire(import.meta.url)` 로 로드.
- **snake 테스트 파일 명명**: `tests/snake-BF<번호>.test.js` (단위) / `tests/snake-BF<번호>-e2e.test.js` (E2E).

## 흔한 함정 (Pitfalls)

1. **엔트리 자동 모달/테마** — `clear()`+`reload()` 직후 즉시 셀렉터 검사 금지.
   자동 모달은 닫고, `pomodoro` 다크 강제처럼 인라인 초기화 타이밍을 고려할 것.
2. **`bf-theme` 전역 공유** — 한 module 변경이 타 module 회귀를 유발할 수 있다.
3. **module localStorage prefix** — 신규 키는 기존 prefix 컨벤션과 충돌/혼선 없게.
4. **file:// CORS 가드** — 외부 CDN·동적 import·self `fetch()` 추가 금지. console.error 0건 유지.
5. **비동기/로드 순서** — vendor·`load` 이벤트 후 초기화 시 `waitForLoadState('networkidle')`.
6. **Web Audio** — `AudioContext` 는 사용자 인터랙션 후 생성, `suspended` 시 `resume()` 필요.
7. **snake 설정 모달 무조건 자동 오픈** — snake `game.js` 는 `openSettingsModal("entry")` 를
   페이지 로드 시 **항상** 호출한다. E2E 시나리오 시작 시 모달 열림 대기 필수.
8. **snake Web Audio 노드 체인** — BF-604(volume): `OscillatorNode → GainNode → destination`,
   BF-614(pitch): `osc.frequency × _soundPitch`, BF-617(pan): `StereoPannerNode` 삽입 위치는
   `GainNode → StereoPannerNode → destination` 패턴 (WebAudio graph 중간 삽입).
   `StereoPannerNode` 미지원 브라우저 폴백: `pan === 0.0` 이면 노드 생략 가능.
9. **snake 슬라이더 `handleSliderInput`** — 음량/피치/패닝 슬라이더는 동일 `handleSliderInput` 함수로
   `data-key` 분기 처리. 신규 슬라이더 추가 시 반드시 이 함수에 분기 추가할 것.
10. **snake 설정 저장/열기 연동** — `openSettingsModal`: draft 복원, `saveSettingsModal`: 저장,
    `reflectDraftToControls`: 슬라이더 UI 갱신. 3곳 모두 신규 설정 키 연동 필요.
