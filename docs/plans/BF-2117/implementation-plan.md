# BF-2117 · 저장소 문서 구조 개편 실행 계획

> 이 문서는 BF-2119(저장소 인벤토리 조사 및 문서 구조 설계) 산출물입니다.
> developer(BF-2118)는 이 문서의 목차 구조를 **재정의하지 않고 그대로** 따라 `README.md`,
> `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md` 3종을 작성합니다.

## 0. 조사 방법 및 한계

- `git ls-tree --name-only HEAD`, `git log --oneline -30`, `git branch -a`, `git show HEAD:<path>` 로 저장소
  실제 상태(base `bdbe04a`)를 조사했습니다.
- 앱 디렉터리 85개 중 실행/테스트 방식이 README.md에 실제로 기술된 것은 `pomodoro`, `weather` 2개뿐이며,
  나머지는 디렉터리 명명 규칙과 root `package.json` 스크립트 패턴으로부터 **추정**한 것입니다.
  developer는 §1.2의 "확인 필요" 표시 항목을 실제로 열어 스팟체크한 뒤 README 인벤토리 표를 채워야 합니다.
- widening budget(호출 3회) 제약으로 개별 앱 디렉터리 내부(예: 각 `index.html`, 각 `tests/*.test.js`)는
  열람하지 않았습니다. 카테고리 분류는 디렉터리명·git 브랜치 이력·기존 문서 패턴 기반 근거입니다.

---

## 1. 저장소 인벤토리

### 1.1 최상위 디렉터리 전체 목록 (git ls-tree, base `bdbe04a`)

```
a11y-counter, addiction-mini, api, apps, baseball, booking-approval-phase18,
calculator, canvas-tower-defense, cascade-check-0808, clicker, color-switch,
contrast-checker, delivery-exceptions-canary, delivery-status, demo, dice,
docs, dom-rhythm-tap, duration-converter, e2e, feedback-board, fifteen-puzzle,
game-2048, games, guess-number, habit-tracker, incident-command,
incident-triage, inspection-checklist-canary, isolation-check-color-guess,
iteration-check, iteration-check2, iteration-check3, kanban-board, kanban,
local-iso-number-baseball, markdown-preview, memory, minesweeper, notepad,
number-guess, oncall-handoff, palette, password-strength, phase18-games,
phase18-validation, phase21-validation, phaser-brick-blitz,
phaser-endless-runner, phaser-memory-match, phaser-space-defender,
phaser-star-collector, pixi-breakout, pixi-shooter, planning, pomodoro,
prisma, provider-readiness, quiz-card, refs, release-approval-canary,
return-approvals-canary, review-head-timeline, rps, skill-canary,
sla-breach-triage-canary, snake-game, snake, src, status-card, stopwatch,
supermario, support-inbox-canary, support-inbox-phase18,
svg-puzzle-slider, team-reservation-canary, tests, tetris, tictactoe,
timer, typing, unit-converter, weather, webaudio-memory-tone, word-guess
```

단일 `.html` 파일(디렉터리 아님): `color-palette.html`, `password-strength.html`,
`text-stats.html`, `typing-test.html`, `unit-converter.html`, `phase11-dogfood.md`

### 1.2 카테고리 분류 및 실행/테스트 방법

#### (A) 게임·유틸리티 vanilla-static 앱 — 확인된 대표 패턴 (README §pomodoro/§weather 근거)

`a11y-counter`, `addiction-mini`, `baseball`, `calculator`, `canvas-tower-defense`,
`cascade-check-0808`, `clicker`, `color-switch`, `contrast-checker`, `dice`,
`dom-rhythm-tap`, `duration-converter`, `fifteen-puzzle`, `game-2048`, `guess-number`,
`habit-tracker`, `isolation-check-color-guess`, `iteration-check`, `iteration-check2`,
`iteration-check3`, `kanban`, `local-iso-number-baseball`, `markdown-preview`, `memory`,
`minesweeper`, `notepad`, `number-guess`, `palette`, `password-strength`,
`phaser-brick-blitz`, `phaser-endless-runner`, `phaser-memory-match`,
`phaser-space-defender`, `phaser-star-collector`, `pixi-breakout`, `pixi-shooter`,
`pomodoro`, `quiz-card`, `rps`, `snake`, `snake-game`, `stopwatch`, `supermario`,
`svg-puzzle-slider`, `tetris`, `tictactoe`, `timer`, `typing`, `unit-converter`,
`weather`, `webaudio-memory-tone`, `word-guess`

- **실행**: `open <app>/index.html` (file://, module script 미사용 — BF-522 근거) 또는
  정적 서버(`npm start` / `python3 -m http.server 8080`) 후 `http://localhost:<port>/<app>/`
- **테스트**: `node --test tests/<app>-*.test.js` (루트 `tests/` 디렉터리, 앱별 파일 prefix 규칙),
  `BRIX_TEST_SCOPE=focused BRIX_TEST_MODULE=<app>` 환경변수로 focused 범위 지정 가능
- ⚠️ **확인 필요(불일치 발견)**: README.md는 `npm start` 접속 주소를 `http://localhost:8080/`으로
  안내하지만, root `package.json`의 `start` 스크립트는 `http-server . -p 8888 --no-dotfiles`로
  **8888 포트**를 사용합니다. developer는 실제 동작 포트를 확인해 README를 정정해야 합니다.

#### (B) brix-Flow 자체 검증용 canary/phase 모듈 — 별도 성격, 일반 앱 인벤토리와 분리 권고

`booking-approval-phase18`, `delivery-exceptions-canary`, `delivery-status`,
`feedback-board`, `incident-command`, `incident-triage`, `inspection-checklist-canary`,
`oncall-handoff`, `provider-readiness`, `release-approval-canary`,
`return-approvals-canary`, `review-head-timeline`, `skill-canary`,
`sla-breach-triage-canary`, `status-card`, `support-inbox-canary`,
`support-inbox-phase18`, `team-reservation-canary`

- git 브랜치 이력(`feat/BF-1006-team-reservation-canary`, `feat/BF-1027-inspection-checklist-canary-module`,
  `feat/BF-1229-delivery-status-api-ui`, `chore/BF-801-incident-severity-triage-severity-matrix` 등)상
  이 그룹은 게임/유틸리티가 아니라 brix-Flow 멀티 에이전트 워크플로 자체를 검증하기 위한
  dogfooding/canary 픽스처로 추정됩니다.
- **확인 필요**: 이 그룹을 README 앱 인벤토리에 사용자 대상 앱과 함께 넣을지, 별도 섹션(예: "내부 검증용
  모듈")으로 분리할지는 PM 판단이 필요합니다. 본 설계(§3)는 분리를 전제로 목차를 제안합니다.

#### (C) 특이 스택 — 빌드 도구 사용 (observed_stack=vanilla-static과 다름)

- **`kanban-board/`**: Vite + React 18 + Vitest (root package.json과 무관한 자체 `package.json`)
  - 실행: `cd kanban-board && npm install && npm run dev` (Vite dev server)
  - 빌드: `npm run build`
  - 테스트: `npm test` (= `vitest run`), 커버리지: `npm run coverage`
  - 커밋 근거: `b6198fd feat(bf-2103): 칸반 보드 Vite+React SPA 구현`,
    `bdbe04a feat(bf-2113): kanban-board 테스트 보강`
  - 기존 vanilla `kanban/`(카테고리 A)과는 별개 디렉터리이며 관계(대체/병행) 정리는 developer 확인 필요.

#### (D) 단일 `.html` 프로토타입 파일 — 디자인 mockup 잔존물로 추정

`color-palette.html`, `password-strength.html`, `text-stats.html`, `typing-test.html`,
`unit-converter.html`

- git 브랜치 이력에 `docs/BF-*-html` 형태(예: `docs/BF-1746-html`, `feat/BF-1965-html`)의 mockup
  전용 브랜치가 다수 존재하여, 이후 정식 디렉터리(`password-strength/`, `typing/`, `unit-converter/`)로
  구현이 이관된 뒤 남은 산출물로 추정됩니다.
- **확인 필요**: 정식 디렉터리로 대체되어 삭제 가능한지, 여전히 참조되는 링크가 있는지 developer 확인.

#### (E) 비-앱 인프라 디렉터리

| 디렉터리 | 추정 역할 | 비고 |
|---|---|---|
| `src/`, `tests/`, `e2e/` | 공용 소스·단위 테스트·e2e 테스트 루트 | package.json test 스크립트가 `tests/`를 참조 |
| `docs/` | 문서 루트 | 하위: `design`, `plan`, `planning`, `plans`, `spec`, `operator`, `context-contracts`, `hotfix-validation`, `verification`, `admin-snake-scores*.md` 등 — 하위 디렉터리 목적 구분은 후속 조사 필요 |
| `api/`, `prisma/` | 백엔드 API·DB 스키마로 추정 (observed_stack=vanilla-static과 배치) | **확인 필요** — 실제 사용 여부 |
| `apps/`, `demo/`, `games/` | 앱 묶음/데모 디렉터리로 추정 | **확인 필요** — 내부 구성 미조사 |
| `phase18-games/`, `phase18-validation/`, `phase21-validation/`, `planning/`, `refs/` | 단계(phase)별 검증 픽스처로 추정 (카테고리 B와 연관 가능) | **확인 필요** |

### 1.3 developer(BF-2118)에게 전달하는 지침

1. 위 §1.2 "확인 필요" 항목은 README 작성 전 실제로 열어 스팟체크할 것.
2. 카테고리 A(게임/유틸리티)만 README 앱 인벱토리 표의 1차 대상으로 삼고, 카테고리 B/C/D/E는
   §3의 목차 설계에 따라 별도 절 또는 링크로 분리할 것.
3. `npm start` 포트 불일치(8080 vs 8888)는 README 작성 시 반드시 정정할 것.

---

## 2. CONTRIBUTING 설계 근거 — 실제 브랜치·커밋 이력 조사

### 2.1 기존 루트 `CONTRIBUTING.md` (현재 내용, `git show HEAD:CONTRIBUTING.md`)

- Jira 티켓(`BF-XXXX`) 기준 워크플로: 티켓 확인 → `npm install` → 브랜치 생성 → 작업 → `npm test` → 커밋 → PR.
- 문서상 브랜치 타입: `feature`, `fix`, `chore`, `docs`, `refactor`
- 문서상 커밋 형식: `<type>(<JIRA-KEY>): <설명>` (예: `docs(BF-1930): CONTRIBUTING.md 추가`)
- `main`에는 직접 push 금지, PR을 통해서만 병합.

### 2.2 실제 git 이력과의 대조 (`git log --oneline -30`, `git branch -a`)

| 항목 | 문서 기재값 | 실제 관측값 | 불일치 |
|---|---|---|---|
| 브랜치 타입 | `feature/`, `fix/`, `chore/`, `docs/`, `refactor/` | `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `backup/` | **`feature/`는 실사용 0건 — 실제는 `feat/`. `test/`는 문서에 없음(예: `test/BF-2116-task`, `test/BF-788-number-guess-e2e`)** |
| 브랜치 이름 | `<type>/<JIRA-KEY>-<설명>` | 동일 패턴 확인 (예: `chore/BF-2119-task`, `feat/BF-2113-kanban-board`, `docs/BF-2102-ui`) | 일치 |
| revision 브랜치 | 미기재 | `<원본브랜치>-revision-<ulid>` 패턴 다수 관측 (예: `feat/BF-2103-vitereact-spa-revision-01m03c4shfa10fxpaec9q5tgyc`) | **문서에 없는 패턴 — 자동 revision 브랜치로 추정, CONTRIBUTING에 설명 추가 권고** |
| 커밋 메시지 | `<type>(<JIRA-KEY>): <설명>` (JIRA-KEY 대문자 예시) | 실제 로그는 `feat(bf-2091): ...`, `docs(bf-2090): ...` 등 **JIRA 키가 소문자** | **소문자 표기가 실제 컨벤션 — 문서 예시(`BF-1930`)와 표기 불일치** |
| 커밋 설명 언어 | 미기재 | 실제 전부 한국어 (`feat(bf-2091): 퀴즈 카드 기능 구현 (TDD)`) | 문서에 명시 권고 |

### 2.3 CONTRIBUTING 설계 반영 사항 (developer 필수 반영)

- 브랜치 타입 목록을 `feat, fix, chore, docs, test` (+ 필요 시 `backup`)로 정정.
- 커밋 메시지의 `<JIRA-KEY>` 표기를 **소문자**로 정정 (`feat(bf-2119): ...`).
- 커밋 설명은 한국어로 작성한다는 규칙 명시.
- `-revision-<ulid>` 접미사 브랜치가 시스템이 자동 생성하는 재작업 브랜치임을 안내.

---

## 3. 문서 3종 목차 설계 (developer는 이 목차를 그대로 따름)

### 3.1 `README.md` (루트 유지, 재구성)

현재 README(210줄)는 `pomodoro`/`weather` 2개 앱만 상세 기술해 85개 앱 규모에 맞지 않으므로,
개요 + 인벤토리 표로 재구성하고 앱별 상세는 위임한다.

1. 프로젝트 소개 (1~2문장)
2. 빠른 시작 (Quick Start) — `npm install`, `npm start`, 접속 URL (포트 확정값 사용)
3. 앱 인벤토리 — 카테고리 A(게임/유틸리티) 표: 앱명 · 경로 · 1줄 설명 · 실행 명령
4. 저장소 구조 개요 — `docs/ARCHITECTURE.md` 링크로 위임
5. 기여하기 — `docs/CONTRIBUTING.md` 링크로 위임
6. 전체 테스트 실행 — `npm test`, `BRIX_TEST_SCOPE` 요약 (상세는 ARCHITECTURE/CONTRIBUTING 참고)

### 3.2 `docs/ARCHITECTURE.md` (신규)

1. 개요 — 목적과 문서 범위
2. 디렉터리 구조
   - 2.1 게임/유틸리티 앱 (카테고리 A)
   - 2.2 brix-Flow 자체 검증용 canary/phase 모듈 (카테고리 B)
   - 2.3 특이 스택 앱 — `kanban-board`(Vite+React+Vitest) (카테고리 C)
   - 2.4 디자인 mockup 잔존 `.html` 파일 (카테고리 D)
   - 2.5 공용 인프라 디렉터리 — `src/`, `tests/`, `e2e/`, `docs/`, `api/`, `prisma/`, `apps/`, `demo/`, `games/`, `planning/`, `refs/`, `phase18-*/`, `phase21-*/` (카테고리 E)
3. 앱 실행 아키텍처 패턴
   - 패턴 A: vanilla index.html (file:// 또는 http-server, module script 미사용 — BF-522)
   - 패턴 B: 번들러 기반 (Vite) — `kanban-board`
4. 테스트 아키텍처
   - `node --test` 기반 (루트 `tests/`, `BRIX_TEST_SCOPE`/`BRIX_TEST_MODULE`)
   - 앱별 독립 러너 (`kanban-board`: vitest)
   - `e2e/` 디렉터리 역할
5. 상태 저장 공유 규약 — `localStorage` 키 prefix 격리, `bf-theme` 공유 키
6. 문서 체계 — `docs/` 하위 디렉터리(`design`, `plan`, `planning`, `plans`, `spec`, `operator`,
   `context-contracts`, `hotfix-validation`, `verification`) 목적 정리 (§1.2 (E) "확인 필요" 반영)
7. 알려진 제약·미해결 항목 — `api/`·`prisma/` 실사용 여부, `.html` 프로토타입 정리 여부 등

### 3.3 `docs/CONTRIBUTING.md` (신규 — 루트 `CONTRIBUTING.md` 대체·이관)

1. 개요
2. 사전 준비 — `npm install`
3. 브랜치 규칙 — `<type>/<JIRA-KEY>-<설명>`, type ∈ `{feat, fix, chore, docs, test}` (§2.3 반영),
   `-revision-<ulid>` 자동 재작업 브랜치 설명
4. 커밋 메시지 규칙 — `<type>(<jira-key-소문자>): <한국어 설명>` (§2.3 반영)
5. PR 규칙 — PR 제목/본문에 Jira 키 포함, `main` 직접 push 금지, base=main
6. 테스트 실행 규칙 — `npm test`, `BRIX_TEST_SCOPE=focused` 등
7. 신규 앱 추가 규약 — 디렉터리 구조, `tests/<app>-*.test.js` 명명, README 인벤토리 표 갱신 의무
8. 문서 갱신 규약 — 앱 추가/변경 시 README/ARCHITECTURE 동기화 의무

> 이관 방식: 루트 `CONTRIBUTING.md` 내용을 `docs/CONTRIBUTING.md`로 옮기고, §2.3 정정 사항을
> 반영한 뒤 루트 파일은 삭제하거나 `docs/CONTRIBUTING.md`를 가리키는 1줄 안내로 대체한다
> (GitHub는 루트/`docs/` 양쪽의 `CONTRIBUTING.md`를 모두 인식하므로 기능상 문제 없음).

---

## 4. Open Questions (PM/developer 확인 필요)

1. 카테고리 B(canary/phase 모듈)를 사용자 대상 README 인벤토리에 포함할지, 완전히 별도 문서로 분리할지.
2. `api/`, `prisma/`가 실제로 사용 중인 백엔드인지, 아니면 미사용 잔존물인지.
3. 카테고리 D(`.html` 단일 파일)를 삭제할지 유지할지.
4. `kanban/`(vanilla)과 `kanban-board/`(Vite+React)의 관계 — 병행 유지인지 후자로 대체 예정인지.
