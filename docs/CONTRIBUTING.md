# 기여 가이드

## 1. 개요

이 문서는 이 저장소에 기여하는 방법, 브랜치 · 커밋 · PR 규칙, 테스트 실행 규칙, 신규 앱 추가
절차를 안내합니다. 실제 git 이력(`git log`, `git branch -a`) 조사를 근거로 하며, 문서화되지
않은 관례는 추정으로 표시합니다.

## 2. 사전 준비

```sh
npm install        # http-server devDependency 설치 (최초 1회)
```

`kanban-board/`처럼 자체 `package.json`을 가진 앱을 작업할 때는 해당 디렉터리에서 별도로
`npm install`이 필요합니다 (자세한 내용은 [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#23-특이-스택-앱-kanban-board-vite-react-vitest) 참고).

## 3. 브랜치 규칙

브랜치명은 `<type>/<JIRA-KEY>-<짧은-설명>` 형식을 따릅니다.

- `<type>`은 실제 사용 이력 기준 `feat`, `fix`, `chore`, `docs`, `test`(+ 필요 시 `backup`)를
  사용합니다. `feature/`는 문서에 과거 기재되어 있었으나 실사용 이력이 0건이므로 `feat/`을
  사용하세요.
- 예: `chore/BF-2119-task`, `feat/BF-2113-kanban-board`, `docs/BF-2102-ui`
- `main`에는 직접 push하지 않고 항상 PR을 통해서만 병합합니다.
- **`<원본브랜치>-revision-<ulid>` 형태의 브랜치**가 관측됩니다 (예:
  `feat/BF-2103-vitereact-spa-revision-01m03c4shfa10fxpaec9q5tgyc`). 이는 사람이 직접 만드는
  브랜치가 아니라, 리뷰 수정 요청(revision) 시 시스템이 자동 생성하는 재작업 브랜치입니다.

## 4. 커밋 메시지 규칙

커밋 메시지는 Conventional Commits 스타일 `<type>(<jira-key>): <설명>`을 따릅니다.

- `<type>`에는 `feat`, `fix`, `docs`, `chore`, `refactor`, `test` 등을 사용합니다.
- **`<jira-key>`는 소문자**로 표기합니다 (실제 로그 기준, 예: `feat(bf-2091): 퀴즈 카드 기능
  구현 (TDD)`, `docs(bf-2090): ...`).
- 커밋 설명은 **한국어**로 작성합니다 (실제 이력 전부 한국어).

## 5. PR 규칙

- PR 제목 또는 본문에 관련 Jira 키를 포함합니다.
- base 브랜치는 항상 `main`입니다.
- `main` 직접 push는 금지되며 PR을 통해서만 병합합니다.

## 6. 테스트 실행 규칙

```sh
node --test tests/<app>-*.test.js     # 특정 앱만 focused 실행 (권장)
```

- ⚠️ 루트 `package.json`의 `npm test`는 저장소 전체 테스트를 실행하지 않고 레거시 파일 하나
  (`tests/snake-BF608.test.js`)만 실행합니다. 앱을 검증할 때는 항상 위처럼
  `node --test tests/<app>-*.test.js` 형태로 범위를 좁히세요.
- `BRIX_TEST_SCOPE=focused BRIX_TEST_MODULE=<app>` 환경변수로 focused 범위를 지정할 수
  있습니다.
- `tests/` 디렉터리에는 여러 앱/사이클의 테스트 파일이 누적되어 있으므로, 본인이 작업한 앱과
  무관한 파일까지 광범위하게 실행하지 않도록 `tests/<app>-*.test.js` 형태로 대상을 좁히세요.
- `kanban-board/`는 별도 러너를 사용합니다: `cd kanban-board && npm test` (Vitest),
  커버리지는 `npm run coverage`.

## 7. 신규 앱 추가 절차

1. `<app-name>/index.html`을 새로 만듭니다. `<script>`는 `type="module"`을 사용하지 않는 일반
   스크립트로 작성하고, 외부 CDN·`fetch()` 자체 로드를 사용하지 않습니다 (`file://`로 직접
   열어도 동작해야 함 — BF-522).
2. 상태 저장이 필요하면 `localStorage`에 `<app-name>:` prefix로 키를 격리합니다. 테마 상태는
   공유 키 `bf-theme`을 그대로 읽고 씁니다 (자세한 내용은
   [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#5-상태-저장-공유-규약) 참고).
3. 디자인 명세가 있다면 `docs/design/<topic>-<JIRA-KEY>.md`에 먼저 작성합니다 (기존 사례:
   `docs/design/pomodoro-BF-430.md`, `docs/design/weather-BF-435.md`).
4. 테스트는 `tests/<app-name>-*.test.js`로 작성합니다. 관심사별로 파일을 분리하는 기존 사례를
   따르세요 (예: `pomodoro`는 `pomodoro-timer.test.js`(순수 로직) +
   `pomodoro-storage.test.js`(저장소) 2개 파일, `weather`는 `weather-storage.test.js` +
   `weather-integration.test.js` 2개 파일). 단위 테스트 커버리지 80%+ 를 목표로 합니다.
5. 루트 [`README.md`](../README.md#앱-인벤토리)의 앱 인벤토리 표에 새 앱을 추가합니다.

## 8. 문서 갱신 규약

앱을 추가하거나 기존 앱의 실행/테스트 방식을 변경하면, 다음 문서를 함께 갱신합니다.

- `README.md` — 앱 인벤토리 표
- `docs/ARCHITECTURE.md` — 새 카테고리/패턴을 도입한 경우 §2(디렉터리 구조), §3(실행 아키텍처
  패턴)
