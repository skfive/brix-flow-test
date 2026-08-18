# 다이제스트 예시 출력 (BF-2191)

> [`layout-spec.md`](./layout-spec.md)의 레이아웃 규칙을 실제 커밋 목록에 적용한 예시. type→섹션 매핑·정렬·엣지 케이스 판정은 `docs/plans/BF-2190/implementation-plan.md`의 예시를 그대로 재사용해 규칙 간 일관성을 유지한다.

## 예시 1 — 정상 케이스 (9종 매핑 + 분류 보류 혼합)

### 입력 (`parseCommitLine` 대상 라인 배열, SHA 제외)

```
feat(bf-2186): renderBadge + HTTP 핸들러 TDD 구현
fix(bf-2201): 배지 렌더링 오프바이원 수정
fix: 인코딩 오류 수정
docs(bf-2185): 배지 3종 시각 명세
chore: 의존성 업데이트
style(bf-2200): 세미콜론 정리
build: 번들러 업그레이드
revert(bf-2150): 배지 렌더링 되돌림
Merge branch 'main' into feature/badge
그냥 한글 메시지만 있음
```

### `buildDigest(commits)` 출력 (title 미지정 → 기본 제목)

```
# 릴리즈 노트

## ✨ 새로운 기능
- **[bf-2186]** renderBadge + HTTP 핸들러 TDD 구현

## 🐛 버그 수정
- **[bf-2201]** 배지 렌더링 오프바이원 수정
- 인코딩 오류 수정

## 📝 문서
- **[bf-2185]** 배지 3종 시각 명세

## 🔧 기타 작업
- 의존성 업데이트

## 📦 기타 변경
- **[style/bf-2200]** 세미콜론 정리
- **[build]** 번들러 업그레이드
- **[revert/bf-2150]** 배지 렌더링 되돌림

## ⚠️ 분류 보류
- Merge branch 'main' into feature/badge
- 그냥 한글 메시지만 있음
```

**레이아웃 포인트**:
- `refactor`/`test`/`perf`/`ci` 커밋이 없어 해당 섹션은 출력에서 생략됨 (표 순서는 유지, 빈 헤더 없음).
- `fix` 섹션 내부는 scope 있는 항목(`bf-2201`)이 scope 없는 항목보다 먼저인데, 이는 입력 배열에서의 원래 순서를 보존한 것뿐 (별도 정렬 없음).
- `other` 섹션에는 `style`/`build`/`revert` 3개 비인정 type이 입력 순서대로 모임.
- `⚠️ 분류 보류`는 9개 정식 섹션 뒤 최하단에 위치.

## 예시 2 — `--title` 옵션 지정

실행: `node release-notes-digest/cli.js --title "v1.2.0 릴리즈"`

예시 1과 동일한 입력 기준, 최상단 H1만 교체되고 본문은 동일하다.

```
# v1.2.0 릴리즈

## ✨ 새로운 기능
- **[bf-2186]** renderBadge + HTTP 핸들러 TDD 구현

...(이하 예시 1과 동일)
```

## 예시 3 — 빈 입력

### 입력

```js
[]
```

### 출력

```
# 릴리즈 노트

변경 없음
```

## 예시 4 — 전부 malformed (유효 섹션 없음)

### 입력

```
Merge branch 'main' into feature/x
그냥 한글 메시지만 있음
```

### 출력

두 라인 모두 `{ malformed: true, raw: line }`으로 파싱되어 9개 정식 섹션에 들어갈 커밋이 하나도 없다. 이 경우 `⚠️ 분류 보류` 섹션을 별도로 만들지 않고, plan 6.2절 규칙에 따라 본문 전체가 "변경 없음"으로 대체된다 (누락된 raw 원문 표시 없음).

```
# 릴리즈 노트

변경 없음
```
