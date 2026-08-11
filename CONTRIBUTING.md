# 기여 가이드

이 문서는 이 저장소에 기여하는 방법, 브랜치 규칙, 커밋 메시지 규칙을 안내합니다.

## 기여 방법

이 저장소의 모든 변경은 Jira 티켓(`BF-XXXX`)을 기준으로 관리됩니다. 기여 절차는 다음과 같습니다.

1. 관련 Jira 티켓(`BF-XXXX`)을 확인하거나 없으면 새로 등록합니다.
2. 로컬에서 `npm install`로 의존성을 설치합니다.
3. Jira 키를 포함한 브랜치를 생성합니다 (아래 [브랜치 규칙](#브랜치-규칙) 참고).
4. 변경 작업을 진행합니다.
5. `npm test`로 관련 테스트를 확인합니다.
6. 변경 사항을 커밋한 뒤 PR을 생성합니다. PR 제목 또는 본문에 관련 Jira 키를 포함해야 합니다.

## 브랜치 규칙

브랜치명은 `<type>/<JIRA-KEY>-<짧은-설명>` 형식을 따릅니다. `<type>`에는 `feature`, `fix`, `chore`, `docs`, `refactor` 등을 사용합니다. 예: `feature/BF-1930-contributing-doc`, `fix/BF-1204-login-bug`, `chore/BF-557-hud-layout`. `main`에는 직접 push하지 않고 항상 PR을 통해서만 병합합니다.

## 커밋 메시지

커밋 메시지는 Conventional Commits 스타일인 `<type>(<JIRA-KEY>): <설명>` 형식을 권장합니다. `<type>`에는 `feat`, `fix`, `docs`, `chore`, `refactor`, `test` 등을 사용합니다. 예: `docs(BF-1930): CONTRIBUTING.md 추가`. 커밋 메시지에 Jira 키를 포함해 변경 이력을 추적할 수 있도록 합니다.
