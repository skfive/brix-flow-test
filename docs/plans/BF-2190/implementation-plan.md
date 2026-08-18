# BF-2190 · 다이제스트 파싱/조립 실행 설계

> 이 문서는 BF-2190 에픽의 designer(BF-2191)·developer(BF-2192)가 동일하게 참조하는 단일 실행 설계입니다.
> 아래 매핑 규칙과 엣지 케이스 분류는 재정의하지 않고 그대로 따릅니다.

## 1. 개요

`release-notes-digest` 모듈은 `git log` 형식의 커밋 라인 목록을 입력받아, 커밋 타입별 섹션으로 분류·정렬한 뒤 마크다운 릴리즈 노트(다이제스트)를 조립합니다.

핵심 함수 두 개로 구성됩니다.

- `parseCommitLine(line)` — 커밋 라인 1개를 파싱해 구조화된 객체로 변환
- `buildDigest(commits, options)` — 파싱된 커밋 배열을 섹션별로 그룹핑·정렬해 마크다운 문자열로 조립

## 2. 커밋 라인 형식

본 저장소의 실제 커밋 로그는 다음 컨벤션을 따릅니다 (`git log --oneline` 발췌).

```
ea5e1c6 feat(bf-2186): renderBadge + HTTP 핸들러 TDD 구현
a38f7bf docs(bf-2185): 배지 3종 시각 명세
db1f09f feat(bf-2180): 타자 연습기 구현
```

파싱 대상 형식: `<type>[(<scope>)]: <subject>` (앞의 short SHA는 별도로 분리해 다룸).

`parseCommitLine`는 커밋 메시지 부분(SHA 제외)에 대해 아래 정규식으로 매칭합니다.

```
/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/
```

- group 1 → `type` (소문자로 정규화: `Feat` → `feat`)
- group 2 → `scope` (없으면 `null`)
- group 3 → `subject`

매칭 성공 시 반환값:

```js
{ type: string, scope: string | null, subject: string, raw: string, recognized: boolean }
```

`recognized`는 `type`이 3장의 매핑 표에 존재하는지 여부입니다 (표에 없으면 `false`, buildDigest에서 `other` 섹션으로 귀속).

매칭 실패 시 반환값 (5.3절 참고):

```js
{ malformed: true, raw: string }
```

## 3. type → 섹션 매핑 표

| 순서 | type | 섹션 제목 |
|---|---|---|
| 1 | `feat` | ✨ 새로운 기능 |
| 2 | `fix` | 🐛 버그 수정 |
| 3 | `docs` | 📝 문서 |
| 4 | `refactor` | ♻️ 리팩터링 |
| 5 | `test` | ✅ 테스트 |
| 6 | `chore` | 🔧 기타 작업 |
| 7 | `perf` | ⚡ 성능 개선 |
| 8 | `ci` | 👷 CI/CD |
| 9 | `other` | 📦 기타 변경 (비인정 type 전용, 4절 참고) |

## 4. 정렬 규칙

1. **섹션 순서는 위 표의 1~9 순서로 고정 출력**한다. 커밋 개수 내림차순, 알파벳순 등 다른 기준으로 재정렬하지 않는다.
2. 커밋이 0개인 섹션은 출력에서 생략한다 (빈 헤더를 남기지 않는다).
3. **섹션 내부는 입력 배열의 원래 순서를 보존하는 안정 정렬(stable sort)만 적용**한다. `buildDigest`는 type 기준으로 그룹핑만 수행하며, 그룹 내부에서 시간순 재계산·알파벳 정렬 등 추가 재정렬을 하지 않는다.

## 5. 엣지 케이스 분류 규칙

### 5.1 scope 유무

- **scope 있음**: `type(scope): subject` → 항목을 `**[{scope}]** {subject}` 형태로 표시.
  - 예: `feat(bf-2186): renderBadge + HTTP 핸들러 TDD 구현` → `type=feat, scope=bf-2186` → `**[bf-2186]** renderBadge + HTTP 핸들러 TDD 구현`
- **scope 없음**: `type: subject` (괄호 없음) → 항목을 `{subject}` 그대로 표시 (접두 태그 없음).
  - 예: `chore: 의존성 업데이트` → `type=chore, scope=null` → `의존성 업데이트`

### 5.2 비인정 type

3장 표(9종)에 없는 type은 **`other` 섹션으로 귀속**하되, 원래 type 문자열을 보존해 태그로 표시한다.

- scope 없음: `**[{type}]** {subject}`
- scope 있음: `**[{type}/{scope}]** {subject}`

예시:

| 입력 라인 | 분류 결과 |
|---|---|
| `style(bf-2200): 세미콜론 정리` | `other` 섹션 · `**[style/bf-2200]** 세미콜론 정리` |
| `build: 번들러 업그레이드` | `other` 섹션 · `**[build]** 번들러 업그레이드` |
| `revert(bf-2150): 배지 렌더링 되돌림` | `other` 섹션 · `**[revert/bf-2150]** 배지 렌더링 되돌림` |

type 비교는 대소문자를 구분하지 않는다 (`Feat` → `feat`로 정규화 후 표와 비교하므로 `other`로 빠지지 않음).

### 5.3 형식 불일치

2장의 정규식에 매칭되지 않는 라인 (콜론 구분자 없음, 빈 라인, merge 커밋 메시지 등).

예시:

| 입력 라인 | 사유 |
|---|---|
| `Merge branch 'main' into feature/x` | `type: subject` 콜론 구분자 없음 |
| `그냥 한글 메시지만 있음` | 콜론 구분자 없음 |
| `` (빈 문자열) | 매칭 대상 없음 |

처리 규칙: `parseCommitLine`은 `{ malformed: true, raw: line }`을 반환한다. `buildDigest`는 이런 라인을 9개 정식 섹션 어디에도 넣지 않고, **문서 최하단에 "⚠️ 분류 보류" 섹션을 별도로 만들어 `raw` 원문을 그대로 나열**한다 (커밋 누락 방지 목적). 유효한 malformed 라인이 하나도 없으면 이 섹션 자체를 생략한다.

## 6. buildDigest 동작

시그니처: `buildDigest(commits: ParsedCommit[], options?: { title?: string }) => string`

### 6.1 정상 입력

1. `commits`를 4장 규칙에 따라 섹션별로 그룹핑·정렬.
2. 각 섹션을 `## {섹션 제목}` 헤더 + 5장 규칙에 따른 항목 리스트로 렌더링.
3. malformed 라인이 있으면 최하단에 "⚠️ 분류 보류" 섹션 추가 (5.3절).
4. 최상단에 7장 규칙에 따른 제목(H1) 추가.

### 6.2 빈 입력 처리

`commits`가 빈 배열이거나, 모든 라인이 malformed라서 유효 섹션이 하나도 만들어지지 않는 경우, 다이제스트 본문에 **정확히 "변경 없음"** 한 줄만 출력한다. 제목(H1)은 정상 케이스와 동일하게 출력하고 본문만 대체된다.

```
# 릴리즈 노트

변경 없음
```

## 7. CLI `--title` 옵션

실행: `node release-notes-digest/cli.js --title "<제목>"`

- `--title` 지정 시: 다이제스트 최상단 H1을 `# <제목>`으로 사용한다.
- `--title` 미지정 또는 빈 문자열(`""`) 전달 시: 기본 제목 `# 릴리즈 노트`를 사용한다.
- `--title`은 값 1개만 받는 단일 옵션이다. 여러 번 지정되면 마지막 값을 사용한다.

## 8. 함수 시그니처 요약 (developer 참고용)

```js
/**
 * @param {string} line - "<type>[(<scope>)]: <subject>" 형식의 커밋 메시지 (SHA 제외)
 * @returns {{type:string, scope:string|null, subject:string, raw:string, recognized:boolean}
 *          | {malformed:true, raw:string}}
 */
function parseCommitLine(line) {}

/**
 * @param {ReturnType<typeof parseCommitLine>[]} commits
 * @param {{title?: string}} [options]
 * @returns {string} 마크다운 다이제스트 문자열
 */
function buildDigest(commits, options) {}
```
