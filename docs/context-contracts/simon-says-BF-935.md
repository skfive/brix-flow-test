# Simon Says — Task Context Contract v1 확정 — BF-935

> 작성자: [박기획] (planner) · 작성일 2026-07-17
> 관련 티켓: BF-935(본 task, File Ownership 원문 `docs/context-contracts/**`) · Epic BF-934(Simon Says)
> 대상 라우트(예정): `/phase18-games/simon-says` (신규 module `simon-says`, 코드 미작성 — 본 task 비대상)
> tech-stack 태그: `vanilla-static` (저장소 실질 스택과 일치, 프레임워크·번들러 없음)
> 산출물 성격: **컨텍스트 계약(JSON)** 확정 — 게임 규칙/디자인/구현 자체는 후속 task 담당

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 본 task 는 "계약 승인" 이지 "게임 명세 작성" 이 아니다:** task 설명·File Ownership 이 명시적으로 `docs/context-contracts/**` 만 담당 범위로 고정한다. 게임 규칙(입력 시퀀스, 라운드 진행, 상태 전이, 점수 규칙 등)의 상세 설계는 이 task 의 산출물이 아니며, 후속 planner task(Epic BF-934 의 다음 스토리)가 별도로 `docs/plan/simon-says-*.md` 를 작성할 때 다룬다. 본 문서는 그 후속 작업이 "어디를 보고 어디는 안 봐도 되는지" 를 미리 고정하는 스코프 계약이다.

**가정 2 — 경로 컨벤션, `phase18-games/` 최근 선례 그대로 적용:** task 설명이 라우트를 `/phase18-games/simon-says`로 이미 명시했다. 저장소 최상위에는 실제 라우터가 없고(`package.json` `name: notepad-spa`), 동일 컨테이너 아래 `phase18-games/pong/`(BF-910~915)·`phase18-games/memory-match/`(BF-916~919)·`phase18-games/breakout/`(BF-928~933)·`phase18-games/snake/`(BF-922~927) 4개 게임이 이미 동일 관례(`index.html`/`styles.css`/`logic.js`/`main.js` 4파일 형제 디렉터리)로 구현되어 있다(`git log --oneline` 확인: `398247c`/`099ca20`/`94eb6cc`/`c268bad`/`b8edecf`). Simon Says 도 이 관례를 그대로 따를 것으로 candidateFiles 를 고정한다.

**가정 3 — module명 `simon-says` 충돌 없음 실측 (context-widening):** `docs/context-contracts/**` 만으로는 실제 신규 module 이 기존 코드와 이름이 겹치는지, 어떤 파일 패턴을 따라야 하는지 알 수 없어 repo-wide 로 확대 확인했다 — `context-widening: candidateFiles/nonGoals 근거 확보를 위해 phase18-games/ 형제 구조, tests/ 명명 규칙, "simon" 문자열 전역 매치 여부를 확인해야 했음(Level 0/1 만으로는 신규 module 경로·테스트 패턴을 확정할 근거 부족)`. 결과: `grep -ril "simon" .` 0건, `grep -ril "BF-934" .` 0건(Jira 상 Epic 은 존재하나 저장소 내 선행 코드/문서 없음) — 완전 신규 module 이며 네이밍 충돌이 없다.

**가정 4 — 테스트 명명 규칙은 2개 선례가 혼재하므로 둘 다 candidateFiles 에 포함:** 저장소는 두 가지 테스트 배치 패턴을 혼용한다 — ① 단위 테스트는 repo 루트 `tests/<module>-BF<key>.test.js` (예: `tests/breakout-BF931.test.js`, `tests/pong-BF913.test.js`), ② e2e 는 `tests/<module>/BF-<key>-e2e.test.js`(breakout 선례) 또는 `tests/e2e/<module>/*.test.js`(pong·memory-match·phase18-snake 선례) 두 하위 패턴이 공존한다. 본 계약은 후속 tester task 가 어느 쪽을 택하든 범위 안에 들도록 두 패턴을 모두 `tests` 배열에 열거한다(선택은 후속 task 판단).

**가정 5 — 비대상(nonGoals) 은 task 설명이 명시한 5개 카테고리를 그대로 고정:** task 설명 원문이 "기존 게임·공용 런타임·배포/CI·DB·인증·디자인 시스템"을 비대상으로 명시했다. 저장소 실측으로 각 카테고리를 구체 경로에 매핑했다 — 기존 게임(phase18-games 내 3형제 + 최상위 개별 게임 디렉터리 전부), 공용 런타임(`src/**`, `package.json`, `package-lock.json`), 배포/CI(저장소에 `.github/**` 워크플로 확인 안 됨 — 존재 시에도 비대상으로 사전 고정), DB(`prisma/**`), 인증(저장소에 인증 모듈 자체가 확인되지 않음 — 향후 추가되어도 비대상), 디자인 시스템(`docs/design/mockups/**`, `palette/**`, `docs/design/palette-BF-461.md` 등 공용 토큰 문서).

**가정 6 — 본 task 자체의 산출물(`docs/plan/simon-says-*.md`, `docs/design/simon-says-*.md`, 실제 구현 코드)은 candidateFiles 에 "후속 task 를 위한 예정 경로"로만 기재하고, 본 task 는 생성하지 않는다:** File Ownership 이 `docs/context-contracts/**` 로 고정되어 있어 이 문서 1건 외에는 생성·수정하지 않는다.

---

## 1. TASK_CONTEXT_CONTRACT_V1 (승인본)

```json
{
  "contractVersion": "task-context-contract-v1",
  "candidateFiles": [
    "phase18-games/simon-says/index.html",
    "phase18-games/simon-says/styles.css",
    "phase18-games/simon-says/logic.js",
    "phase18-games/simon-says/main.js",
    "docs/plan/simon-says-*.md",
    "docs/design/simon-says-*.md",
    "tests/simon-says-*.test.js",
    "tests/simon-says/**",
    "tests/e2e/simon-says/**",
    "docs/context-contracts/simon-says-BF-935.md"
  ],
  "entryPoints": [
    "phase18-games/simon-says/index.html",
    "phase18-games/simon-says/main.js"
  ],
  "tests": [
    "tests/simon-says-*.test.js",
    "tests/simon-says/**",
    "tests/e2e/simon-says/**"
  ],
  "dependencyEvidence": [
    "git log --oneline: phase18-games/{pong,memory-match,breakout,snake} 4개 게임이 동일 4파일 구조(index.html/styles.css/logic.js/main.js)로 최근 연속 구현됨 (커밋 398247c/099ca20/94eb6cc/c268bad/b8edecf 등)",
    "find phase18-games -maxdepth 3: pong·memory-match·breakout·snake 4개 형제 디렉터리 확인, 각 4파일 동일 패턴",
    "grep -ril \"simon\" . → 0건 — 신규 module 네이밍 충돌 없음",
    "grep -ril \"BF-934\" . → 0건 — Epic 이 저장소 내 선행 코드/문서를 아직 갖지 않음(순수 신규 스코프)",
    "package.json: name=notepad-spa, 번들러/라우터 없는 vanilla static 구조 확인 (test 스크립트도 module별 node --test 직접 호출 패턴)",
    "tests/ 디렉터리 실측: breakout·pong·memory-match·phase18-snake 가 단위(tests/<module>-BF<key>.test.js)와 e2e(tests/<module>/ 또는 tests/e2e/<module>/) 두 하위 패턴을 혼용",
    "docs/design, docs/plan 디렉터리에 동일 topic-JIRAKEY 명명 규칙(예: breakout-BF-928.md)이 games 계열 전체에 일관 적용됨 — Simon Says 후속 문서도 동일 규칙 예상"
  ],
  "nonGoals": [
    "phase18-games/pong/**, phase18-games/memory-match/**, phase18-games/breakout/**, phase18-games/snake/** (기존 게임 코드 — 수정 금지)",
    "snake/**, dice/**, rps/**, tetris/**, game-2048/**, baseball/**, clicker/**, kanban/**, notepad/**, number-guess/**, palette/**, pomodoro/**, status-card/**, stopwatch/**, timer/**, weather/**, incident-command/**, incident-triage/**, a11y-counter/** (기존 최상위 게임/앱 모듈 전부 — 비대상)",
    "src/**, package.json, package-lock.json (공용 SPA 런타임/의존성 설정 — 신규 module 전용 스크립트 추가 여부는 후속 dev task 범위)",
    ".github/** 및 저장소 배포/CI 설정 전반 (배포/CI 파이프라인 비대상)",
    "prisma/** (DB 스키마/마이그레이션 비대상, 본 module 은 서버 API 없이 브라우저 메모리 상태만 사용 예정)",
    "인증 관련 코드/설정 전반 (저장소에 인증 모듈 자체 미확인 — 향후 추가되어도 본 Epic 비대상)",
    "docs/design/mockups/**, palette/**, docs/design/palette-BF-461.md 등 공용 디자인 시스템/토큰 자산 (디자인 시안 자체는 designer 영역, 본 계약은 스코프만 고정)",
    "docs/plan/simon-says-*.md, docs/design/simon-says-*.md, phase18-games/simon-says/* 실제 작성 (본 task 는 계약 확정만 — File Ownership: docs/context-contracts/**)"
  ],
  "knownFacts": [
    "phase18-games/ 하위에 pong·memory-match·breakout·snake 4개 게임이 동일 4파일(index.html/styles.css/logic.js/main.js) 구조로 이미 구현되어 있다.",
    "저장소에 라우터/번들러가 없다 — package.json name=notepad-spa, http-server 로 정적 서빙되는 vanilla 구조다.",
    "\"simon\" 문자열 전역 검색 결과 0건 — Simon Says 는 저장소 내 완전 신규 module 이며 네이밍 충돌이 없다.",
    "\"BF-934\" 전역 검색 결과 0건 — Epic 이 저장소 내 선행 산출물을 아직 갖지 않은 순수 신규 스코프다.",
    "테스트는 단위(tests/<module>-BF<key>.test.js, repo 루트)와 e2e(tests/<module>/ 또는 tests/e2e/<module>/) 두 하위 패턴이 게임 계열 내에서 혼용되고 있다.",
    "docs/plan, docs/design 산출물은 games 계열 전체에서 `<topic>-<JIRA-KEY>.md` 명명 규칙을 일관 적용한다(예: breakout-BF-928.md, memory-match-BF-916.md).",
    "docs/context-contracts/ 디렉터리는 저장소에 선례가 없다 — 본 task 가 최초로 생성하며, 명명 규칙은 task 지시(topic-JIRA-KEY)를 그대로 따른다.",
    "TEST_SCOPE_POLICY(focused, primary_module=simon-says) 는 node --test tests/simon-says-*.test.js 직접 호출을 가이드하며, package.json 에 simon-says 전용 스크립트를 아직 추가할 필요가 없다(후속 dev task 판단 영역)."
  ],
  "wideningBudget": {
    "maxCalls": 3,
    "maxAddedPaths": 10,
    "maxLevel": 2
  }
}
```

---

## 2. AC 매핑 (수용 기준 검증)

| AC | 근거 |
|---|---|
| Epic BF-934, 계약 작성 시 6항목(candidateFiles/entryPoints/tests/dependencyEvidence/nonGoals/knownFacts) 모두 채움 | §1 JSON 블록에 6개 키 전부 비어있지 않게 채움 |
| 신규 경로 `/phase18-games/simon-says` 범위 정의 시, 그 경로와 테스트·최소 문서 외 파일은 nonGoals 로 명시 | §1 `nonGoals` 에 기존 게임 전체·공용 런타임·배포/CI·DB·인증·디자인 시스템을 경로 단위로 명시 |

---

## 3. 후속 task 안내

- 다음 planner task(Epic BF-934 의 후속 스토리)는 본 계약의 `candidateFiles`/`nonGoals` 범위 안에서 `docs/plan/simon-says-*.md` 게임 규칙 명세를 작성한다.
- 본 계약은 v1 이며, 후속 task 진행 중 범위 재조정이 필요하면 Jira 코멘트로 근거를 남기고 본 문서를 개정한다(재해석 금지, 근거 기반 개정만 허용).
