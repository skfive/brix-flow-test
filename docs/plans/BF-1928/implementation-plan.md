# BF-1928 실행 계획 — CONTRIBUTING.md 작성 설계 (BF-1930)

## 목적
저장소 루트에 `CONTRIBUTING.md` 신규 파일 1건을 추가한다. developer(BF-1929)는 아래 섹션 구성과 문구 방향을 그대로 따라 파일을 작성한다.

## 범위 제약 (developer 필독)
- 신규 생성 파일은 `CONTRIBUTING.md` **1건뿐**이다.
- 기존 파일(README.md, package.json 등)은 어떤 것도 수정하지 않는다.
- 저장소 루트(`serve_root: .`)에 위치시킨다.

## 저장소 관찰 사실 (REPO_CONVENTION_CAPSULE 근거)
- 스택: vanilla-static (정적 파일 다수 + 소규모 Node 유틸리티 구성, base_sha `eb8889e30a5`)
- 패키지 매니저: npm (`package.json` 존재, `package-lock.json` 커밋됨)
- 모듈 타입: esm
- 테스트 명령: `npm test` (표시용 — 프로젝트 전역 강제 게이트로 문서화하지 않음)
- 이슈 트래커: Jira, 키 포맷 `BF-<번호>` (본 문서의 `BF-1928/BF-1929/BF-1930` 등)

## CONTRIBUTING.md 섹션 구성

### 1. `## 기여 방법`
문구 방향:
- 이 저장소는 Jira 티켓(BF-XXXX) 단위로 작업이 진행됨을 명시.
- 기여 절차를 순서대로 나열: (1) 관련 Jira 티켓 확인/생성 → (2) 로컬에서 `npm install`로 의존성 설치 → (3) 브랜치 생성 → (4) 변경 작업 → (5) `npm test`로 관련 테스트 확인 → (6) PR 생성.
- PR은 관련 Jira 키를 제목 또는 본문에 포함해야 함을 명시.
- 예시 문구:
  > 이 저장소의 모든 변경은 Jira 티켓(`BF-XXXX`)을 기준으로 관리됩니다. 작업 전 관련 티켓을 확인하고, 로컬에서 `npm install` 후 변경 사항을 검증하세요.

### 2. `## 브랜치 규칙`
문구 방향:
- 브랜치명 포맷: `<type>/<JIRA-KEY>-<짧은-설명>` (예: `feature/BF-1930-contributing-doc`, `fix/BF-1204-login-bug`, `chore/BF-557-hud-layout`).
- `<type>` 허용 값 예시: `feature`, `fix`, `chore`, `docs`, `refactor`.
- `main` 브랜치에 직접 커밋/푸시 금지, 항상 PR을 통해 병합.
- 예시 문구:
  > 브랜치명은 `<type>/<JIRA-KEY>-<짧은-설명>` 형식을 따릅니다. 예: `feature/BF-1930-contributing-doc`. `main`에는 직접 push하지 않고 PR을 통해서만 병합합니다.

### 3. `## 커밋 메시지`
문구 방향:
- Conventional Commits 스타일 권장: `<type>(<JIRA-KEY>): <설명>` (예: `docs(BF-1930): CONTRIBUTING.md 추가`).
- `<type>` 예시: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
- 커밋 메시지 본문에 Jira 키를 포함해 추적 가능하게 함.
- 예시 문구:
  > 커밋 메시지는 `<type>(<JIRA-KEY>): <설명>` 형식을 권장합니다. 예: `docs(BF-1930): CONTRIBUTING.md 추가`.

## 산출물 매핑
| 섹션 | 근거 |
|---|---|
| 기여 방법 | package_manager=npm, package_test_command=npm test |
| 브랜치 규칙 | Jira 기반 워크플로우(BF-XXXX 키), 기존 브랜치 명명 관례(`chore/BF-557-hud-layout` 등 관측 사례) |
| 커밋 메시지 | Jira 키 추적 필요성, Conventional Commits 관례 |

## Acceptance Criteria (Given/When/Then)

**AC1 — 3개 섹션 구성**
- Given: developer가 `CONTRIBUTING.md`를 작성할 때
- When: 문서에 `## 기여 방법`, `## 브랜치 규칙`, `## 커밋 메시지` 3개 섹션을 순서대로 포함하면
- Then: 각 섹션에는 위 "문구 방향"에 정의된 핵심 내용(절차/포맷/예시)이 반영되어야 한다.

**AC2 — 파일 범위 제약**
- Given: developer가 이 설계를 구현할 때
- When: 커밋 diff를 확인하면
- Then: 신규 파일은 `CONTRIBUTING.md` 1건만 추가되어야 하며, 기존 파일에 대한 수정은 없어야 한다.

## Edge Case / 실패 케이스
- 브랜치명에 Jira 키가 없는 경우: 문서에 "Jira 키가 없는 변경(예: 긴급 hotfix)은 팀 합의 후 예외 허용"과 같은 예외 문구를 넣지 않는다 — 본 설계 범위에서는 표준 포맷만 명시하고 예외 규정은 다루지 않는다(범위 밖, 필요 시 별도 티켓).
- `CONTRIBUTING.md`가 이미 존재하는 경우: 본 설계 기준 base(`eb8889e30a5`)에는 파일이 없음을 확인함. developer가 구현 시점에 파일이 이미 존재하면 신규 생성이 아니라 충돌 상황이므로 작업을 중단하고 보고해야 한다.
- 테스트 명령 관련: `npm test`는 표시용 참고이며 CONTRIBUTING.md에 "모든 PR은 `npm test` 통과 필수"처럼 강제 게이트로 단정하지 않는다(REPO_CONVENTION_CAPSULE의 `full_verify_command: 미제공` 근거).
