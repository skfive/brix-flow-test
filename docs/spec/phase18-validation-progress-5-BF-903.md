# 진행률(Progress) 체크리스트 검증 페이지 기획 명세 — BF-903 (Phase 18 검증 5/5)

> 작성자: [박기획] (planner) · 작성일 2026-07-16
> 관련 티켓: BF-903 (Epic) · BF-904 (본 planner task)
> 검증 대상 라우트: `/phase18-validation/progress-5`
> tech-stack: 저장소 실질 스택은 `vanilla-static` (Next.js 등 라우터 부재)
> 재사용 원본(수정 금지): `incident-command/`(BF-821/822/823/824) — `command.js`의 `calculateChecklistProgress`/`toggleChecklistItem` + `.ic-progress`/`.ic-check` 체크리스트 진행률 컴포넌트
> 단위 테스트: `node --test tests/phase18-validation-*.test.js` (focused scope · module: `phase18-validation`, TEST_SCOPE_POLICY 원문 기준)
> 참여 repo: `backend`(본 repo, brix-Flow-Test) · `infra`(brix-cms, `refs/infra/` read-only 참조) — §0 가정 6, §3.6

---

## 0. 문서 성격 및 전제 (필독 — 재해석 금지)

**가정 1 — 라우트 → 디렉터리 경로 매핑 (선례 그대로 적용):** task 설명은 검증 대상을 `/phase18-validation/progress-5`로 표기한다. 저장소에는 실제 라우터가 없다(`package.json` `name: notepad-spa`, Next.js 의존성 0건). Phase 18 검증 스위트의 선행 4건(`status-card-1`→`status-card/`, `counter-2`→`a11y-counter/`, `clock-3`→`phase18-validation/clock-3/`, `dice-4`→`phase18-validation/dice-4/`)은 실측 결과 전부 저장소 최상위 `phase18-validation/` 컨테이너 하위(3~4번째 항목) 또는 최상위 독립 디렉터리(1~2번째 항목)로 수렴했으며, 가장 최근 2건(clock-3/dice-4)이 확립한 관례는 `phase18-validation/<name>/`다. 본 문서는 이 실측 관례를 그대로 따라 신규 경로를 **`phase18-validation/progress-5/`**(저장소 최상위, `clock-3`/`dice-4`와 형제 디렉터리)로 확정한다. `src/app/phase18-validation/progress-5/`는 지정하지 않는다 — 과거 3연속 미준수 지시를 반복하는 것은 Surgical/Simplicity 원칙에 반한다(`docs/planning/dice-4-BF-897.md` §0 가정1과 동일 판단).

**가정 2 — 재사용 대상 = `incident-command/`(BF-824)의 체크리스트 진행률 기능, `release-readiness`(BF-815/816/817)는 재사용 후보에서 제외:** 저장소에서 "진행률(progress) + 체크리스트"라는 조합을 이미 구현·병합한 유일한 모듈은 `incident-command/`다(`command.js`의 `calculateChecklistProgress(checklist)` → `{total, done, percent}`, `toggleChecklistItem(checklist, itemId, nowIso)`, DOM 컴포넌트 `#checklist-progress`(`role="progressbar"`)· `.ic-check`(checkbox+label+완료시각), 고정 포맷 `"N/M 완료 (P%)"` — `progressText()` 확인 완료). 이름상 가장 먼저 떠오르는 후보인 `release-readiness/`(BF-815 Epic, "진행률 바 + 체크리스트 항목" 개념이 `docs/plan/release-readiness-BF-815.md`/`docs/design/release-readiness-BF-815.md`에 상세히 존재)는 **실제로 구현된 적이 없다** — 저장소 전체에 `release-readiness/` 코드 디렉터리·`tests/release-readiness-*.test.js`가 0건이며, git 이력상 BF-816(기획)·BF-817(디자인) 커밋만 존재하고 dev 커밋(BF-818 등)은 없다. 대신 그 직후 Epic `incident-command-BF-821`이 동일 계열의 "복구 체크리스트 진행률" 개념을 실제로 구현·병합했다(BF-822/823/824, `git log` 확인). 따라서 본 문서는 **실제로 존재하는 코드**를 재사용 원본으로 확정한다 — `release-readiness`는 §11 비범위에 명시적으로 배제 사유와 함께 기록한다.

**가정 3 — 재사용 범위 축소(Simplicity First) — 장애 목록·심각도 필터·타임라인·상세 패널은 본 검증 페이지 범위 밖:** task 설명·수용 기준 원문 어디에도 장애(incident) 목록이나 타임라인을 요구하는 문구가 없다("렌더·데이터 fetch·인증 가드·디자인 일관성"만 명시). `incident-command/`의 장애 선택·심각도 필터·타임라인·상세 헤더는 "장애 대응 관제"라는 원본의 목적에 속하며, 본 task의 검증 초점(체크리스트 진행률 재사용성)과 직접 관련이 없다. 이는 dice-4(§0 가정3, 히스토리·모달 드롭)·clock-3(정지/재개 드롭)가 확립한 "검증 페이지는 핵심 검증 대상만 남기고 부가 기능은 드롭한다"는 선례와 동일한 판단이다. 본 문서는 **단일 체크리스트(항목 다건) + 진행률 바 + 체크박스 토글만** 재현하고, 장애 목록·심각도 필터·타임라인·상세 헤더·다중 장애 전환은 비범위로 확정한다(§4, §11).

**가정 4 — 데이터 의존성(Epic 빈 슬롯) = 없음(외부 fetch/서버/DB 미사용):** `calculateChecklistProgress`/`toggleChecklistItem`은 순수 함수이며 입력(`checklist` 배열)은 `incident-command/fixtures.js`처럼 코드에 하드코딩된 정적 배열에서 온다. 저장소 전체에 체크리스트/진행률 관련 서버 API·DB 스키마는 존재하지 않는다(`src/routes/api/`에는 `tetris/`만 존재, `prisma/schema.prisma`는 tetris 리더보드 전용). 진행률(`percent`)은 이 정적 배열에 대한 순수 산술 파생이므로, 데이터 의존성은 "없음"이 유일하게 정합한 답이다(§3).

**가정 5 — 인증 가드(Epic 빈 슬롯) = 불필요:** 본 저장소는 정적 파일 서버로 서빙되는 `vanilla-static` 사이트이며 로그인/세션 미들웨어가 존재하지 않는다. Phase 18 검증 스위트 1~4/5 모두 인증 가드 없이 공개 정적 페이지로 구현됐다. `refs/infra`(brix-cms)에 JWT 인증이 존재하지만(§3.6) 이는 그 repo 자신의 API 보호용이며 본 검증 페이지와 무관하다. 본 검증 페이지도 공개(비로그인) 정적 페이지이며 인증 가드가 불필요하다(§3.5).

**가정 6 — "백엔드/인프라 2개 repo" 수용 기준 = repo 담당 영역 명시, 신규 API 개발 요구 아님 (본 Epic 고유 수용 기준, 선행 4건에 없던 항목):** BF-904 수용 기준 2번째 항목은 "Given 백엔드/인프라 2개 repo, When 범위 구분, Then 각 repo 담당 영역이 명세에 명시된다"이다. 본 세션 워크스페이스에는 실제로 2개 repo가 별도 경로로 존재한다 — `/worktrees/bf/repos/backend`(본 repo, git remote `skfive/brix-flow-test`, 워크스페이스 내부 별칭이 우연히 "backend"일 뿐 실질은 이 vanilla-static 사이트)와 `/worktrees/bf/repos/infra`(brix-cms, NestJS/Prisma 블로그 CMS 백엔드, `refs/infra/`로 read-only 마운트). 이는 Phase 18 검증 스위트가 "이 저장소 하나"의 맥락을 넘어 "브릭스 프로젝트 전체 워크스페이스"의 맥락으로 확장되는 첫 사례로 판단한다 — 이전 4건(BF-879~897)은 이 2-repo 구조를 언급한 바 없다. 본 문서는 이 수용 기준을 "신규 API를 `infra`에 만들라"는 지시가 아니라 — task 설명·수용 기준 원문 어디에도 API 개발을 요구하는 문구가 없고, §3.2에서 실측한 대로 `infra`에는 체크리스트/진행률 관련 도메인이 전혀 없다 — **"이 검증 페이지의 구현 작업이 두 repo 중 어디에 속하는지, 그리고 반대편 repo는 왜 관여하지 않는지를 명시적으로 문서화하라"는 요구로 해석한다(§3.6, §7.7). 이는 dice-4가 "인증 가드 불필요"를 증거 기반으로 확정한 것과 동일한 유형의 판단이다(§0 가정5). Epic 원문에 실제 API 연동 지시가 별도로 있다면 본 판단은 재검토가 필요하다(§13-1 — 본 세션에는 Jira 조회 도구가 연결되어 있지 않아 Epic 원문을 직접 대조하지 못했다).

**가정 7 — 파일 소유권:** 본 task의 담당 파일은 `docs/spec/phase18-validation-progress-5-BF-903.md` 1개뿐이다(File Ownership 원문 명시). `phase18-validation/progress-5/*` 코드, `docs/design/*` 문서는 후속 designer/dev task 담당 영역이며 본 task에서 생성·수정하지 않는다. `refs/infra/`는 read-only 참조이며 어떤 파일도 수정하지 않는다.

**가정 8 — 파일명이 본 task 티켓(BF-904)이 아닌 BF-903인 이유:** File Ownership 원문이 산출물 경로를 `docs/spec/phase18-validation-progress-5-BF-903.md`로 명시적으로 지정했다. BF-903은 상위 Epic이며(status-card/counter/clock-3/dice-4와 동일한 "Epic 번호 + 1 = planner task 번호" 패턴 — BF-897→898, 본 task도 BF-903→904로 동일 패턴 확인, `chore/BF-904-progress-5` 브랜치명으로도 재확인), 본 문서는 그 지시를 재해석하지 않고 그대로 따른다. 단, 선례(status-card-1/counter-2/clock-3/dice-4)가 산출물을 `docs/planning/`에 배치한 것과 달리 본 task는 `docs/spec/`을 지정했다는 점이 다르다 — 이 역시 File Ownership 원문을 그대로 따른 것이며 재해석하지 않는다(§13-2). 본문에서 "본 task"를 지칭할 때는 실제 작업 티켓 BF-904를 사용한다.

실제 Epic(BF-903)에 위 가정과 다른 명시적 지침이 있다면 대조 확인이 필요하다(§13 — 본 세션에는 Jira 조회 도구가 연결되어 있지 않아 Epic 원문을 직접 대조하지 못했다).

---

## 목차

1. [개요](#1-개요)
2. [사용자 가치](#2-사용자-가치)
3. [데이터 모델 및 의존성](#3-데이터-모델-및-의존성)
4. [화면 구성 요구사항](#4-화면-구성-요구사항)
5. [기존 체크리스트 진행률 재사용 범위 확정](#5-기존-체크리스트-진행률-재사용-범위-확정)
6. [진입 시나리오 및 렌더 조건](#6-진입-시나리오-및-렌더-조건)
7. [제외 범위 — 필수 명세](#7-제외-범위--필수-명세)
8. [파일 구조 및 기술 제약](#8-파일-구조-및-기술-제약)
9. [Acceptance Criteria 매핑 (Given/When/Then)](#9-acceptance-criteria-매핑-givenwhenthen)
10. [Edge Case 목록](#10-edge-case-목록)
11. [비범위 (Out of Scope)](#11-비범위-out-of-scope)
12. [산출물 위치 및 참조 표](#12-산출물-위치-및-참조-표)
13. [남은 모호함 (운영자 확인 권장)](#13-남은-모호함-운영자-확인-권장)

---

## 1. 개요

### 1.1 목적

`/phase18-validation/progress-5`(= `phase18-validation/progress-5/`)는 Phase 18 검증 스위트의 다섯 번째이자 마지막 항목으로, 이미 병합된 `incident-command/`(BF-821~824)의 **체크리스트 진행률 계산·표시 계약(`{total, done, percent}`, 고정 포맷 "N/M 완료 (P%)", 체크박스 토글)이 새 경로/컨텍스트에서도 손실 없이 재사용 가능한지**, 그리고 **워크스페이스의 두 repo(`backend`/`infra`) 중 어디가 이 작업을 담당하는지**를 함께 확인하는 정적 검증 페이지다. status-card-1(시각 언어 재사용)·counter-2(접근성 계약 재사용)·clock-3(계산 로직 확장 재사용)·dice-4(외부 의존성 없는 파생 데이터 재사용)에 이어, progress-5는 "**진행률이라는 파생 데이터가 다중 repo 워크스페이스에서도 특정 repo 하나로 완결되는가**"를 검증하는 항목이다.

### 1.2 적용 범위

| 항목 | 내용 |
|---|---|
| 신규 경로 | `phase18-validation/progress-5/`(`index.html`/`styles.css`/`fixtures.js`/`progress.js`/`main.js`) — §0 가정 1 |
| 기존 코드 영향 | 없음 — `incident-command/`는 수정하지 않는다(§5, §7.5) |
| 데이터 원천 | `fixtures.js`에 하드코딩된 정적 체크리스트 배열 + 순수 산술(`percent`)뿐 — 서버·외부 API·DB 없음(§3) |
| 담당 repo | `backend`(본 repo) 100% — `infra`(brix-cms) 0%, 관여 없음(§3.6) |
| 외부 라이브러리 | 없음 — 신규 npm 패키지 설치 없음 |
| 영속 저장 | 없음 — 세션 in-memory 상태만(§3.4) — `localStorage` 체크 상태 저장은 비범위 |
| 인증 | 불필요 — 공개 정적 페이지(§0 가정 5, §3.5) |

### 1.3 전제 조건

- 브라우저 환경(Chrome/Edge/Firefox 최신 버전) 또는 Node.js(`node --test`)로 순수 함수(진행률 계산·토글 로직) 단위 테스트
- `phase18-validation/progress-5/` 디렉터리는 아직 존재하지 않으며, 본 task 이후 별도 designer/dev task에서 신규 생성됨
- 원본 `incident-command/command.js`의 `calculateChecklistProgress`/`toggleChecklistItem`은 UMD 패턴으로 `module.exports`에 노출되어 있어 Node 테스트에서는 `require` 가능하지만, **브라우저 런타임에서 직접 import 하는 것은 부적절**하다 — `command.js`는 로드 시 `document.readyState`를 확인해 자동으로 `init()`을 실행하며, 이 `init()`은 `incident-command/index.html`의 전용 DOM(`incident-list`/`incident-detail`/`ic-live` 등)을 전제로 한다. `progress-5/`에 이 DOM이 없으므로 그대로 로드하면 원본이 오동작한다(§5.2). 따라서 dice-4·clock-3과 동일하게 신규 `progress.js`에서 동일 산식으로 **재구현**해야 한다.

---

## 2. 사용자 가치 (Epic 빈 슬롯 ①)

1차 사용자는 최종 고객이 아니라 **내부 검증 담당자(QA/운영자)**다. 목표:

1. **진행률 계산·표시 재사용 가능성의 가시적 증거** — `incident-command/`가 이미 확정한 "체크리스트 완료 건수 기반 진행률" 계약(`percent = Math.round(done/total*100)`, 고정 포맷 "N/M 완료 (P%)", `role="progressbar"`)이 새 경로에서도 신규 코드 발명 없이 동일하게 재현됨을, 별도 코드 리딩 없이 화면 진입 + 체크박스 토글 1회만으로 확인한다.
2. **다중 repo 워크스페이스에서의 담당 범위 명확화** — 이 워크스페이스에 `backend`/`infra` 2개 repo가 존재한다는 사실이 새로운 혼란(예: "체크리스트 데이터를 `infra` API에서 가져와야 하나?")을 만들지 않도록, 본 검증 페이지가 순수하게 `backend` repo 하나로 완결됨을 실증한다(§3.6). 이는 향후 유사한 소규모 위젯을 구현할 때 "다중 repo 존재 = 반드시 여러 repo에 걸친 작업"이 아님을 보여주는 선례가 된다.
3. **회귀 조기 발견** — 향후 `incident-command/`의 진행률 산식(`calculateChecklistProgress`)이나 표시 포맷이 변경될 때, 본 검증 페이지가 별도로 깨진다면 "재사용 계약이 깨졌다"는 신호가 된다(§5.4 재사용 성공 판정 기준, §10 edge case).
4. **네트워크 독립성 증명** — 오프라인 상태에서도 진행률·체크리스트가 완전히 동일하게 계산·표시됨을 확인해, "진행률 = 서버 집계"라는 일반적 오해를 반증한다(§6.2 렌더 조건 2).

최종 고객 관점의 신규 가치(실사용 체크리스트 앱 확장 기능)는 부차적이다 — 본 task는 검증/증명 목적임을 명확히 한다(§11).

---

## 3. 데이터 모델 및 의존성 (Epic 빈 슬롯 ②)

### 3.1 진행률 산출 공식 (재사용, `incident-command/command.js` `calculateChecklistProgress` 승계)

```js
// phase18-validation/progress-5/progress.js (신규 — command.js 의 동일 산식을 독립 재구현, §1.3 전제)
function calculateProgress(checklist) {
  if (!Array.isArray(checklist)) {
    return { total: 0, done: 0, percent: 0 };
  }
  var total = checklist.length;
  var done = checklist.filter(function (item) {
    return Boolean(item) && item.done === true;
  }).length;
  var percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total: total, done: done, percent: percent };
}
```

- `checklist`: 체크리스트 항목 배열(`{ id, text, done, completedAt }[]`, 원본 스키마 그대로 승계).
- `percent`: 반올림 정수(원본과 동일, `.toFixed()` 등 소수 표시 없음).
- 배열이 아니거나 빈 배열이면 `{total:0, done:0, percent:0}` — throw 하지 않는다(원본과 동일 방어적 처리, §10 EC 참고).

### 3.2 토글 함수 (재사용, `toggleChecklistItem` 승계)

```js
function toggleItem(checklist, itemId, nowIso) {
  if (!Array.isArray(checklist)) {
    throw new TypeError("checklist 는 배열이어야 합니다.");
  }
  var found = checklist.some(function (item) {
    return Boolean(item) && item.id === itemId;
  });
  if (!found) {
    throw new TypeError("체크리스트에 존재하지 않는 itemId 입니다: " + String(itemId));
  }
  return checklist.map(function (item) {
    if (item.id !== itemId) return item;
    var nextDone = !item.done;
    return { id: item.id, text: item.text, done: nextDone, completedAt: nextDone ? nowIso : null };
  });
}
```

- 원본과 동일하게 **새 배열을 반환**(원본 `checklist` mutate 없음).
- `done: true` 전환 시 `completedAt`에 호출 시점 ISO 문자열을 기록, `false` 전환 시 `null`로 되돌린다(원본 규칙 그대로 승계).

### 3.3 데이터 원천 — 외부 API/서버/DB 없음

본 페이지의 유일한 데이터 원천은 다음 둘뿐이다:

1. `fixtures.js`에 하드코딩된 정적 체크리스트 배열(최소 5건 권장 — done/미done 혼합 상태를 모두 보여줄 수 있도록, §6 샘플과 동일한 취지).
2. §3.1 `calculateProgress()` — 위 배열에 대한 순수 산술 파생.

`fetch`/`XMLHttpRequest`/`WebSocket`/외부 통계 API·서버 집계·DB 조회는 **일체 사용하지 않는다**(§0 가정 4, §7.2). 저장소 전체(`refs/infra` 포함)에 체크리스트/진행률과 연동된 서버 API·DB 스키마가 없음을 확인했다(§3.6).

### 3.4 영속 저장 — 없음 (세션 in-memory)

원본 `incident-command/`는 `state.checklistState`를 세션 in-memory로만 유지하고 `localStorage` 영속화를 하지 않는다(원본 자체가 이미 비영속). 본 검증 페이지도 동일하게 체크 상태를 세션 in-memory로만 유지하며, 새로고침 시 `fixtures.js`의 초기 상태로 되돌아간다. 공유 `bf-theme` 키(테마 설정)만 예외적으로 다른 모듈과 동일하게 유지한다(§4.4 — 통계 데이터와 무관한 UI 설정).

### 3.5 인증 가드 필요 여부 — 불필요 (Epic 빈 슬롯의 핵심 확정 항목)

| 근거 | 내용 |
|---|---|
| 페이지 성격 | 공개 정적 검증 페이지 — 로그인/세션 개념이 `backend` repo 전체에 존재하지 않음(§0 가정 5) |
| 데이터 민감도 | 체크리스트는 fixture 텍스트이며 사용자 식별 정보·개인정보를 포함하지 않음 |
| 서버 연동 | 없음(§3.3) — 인증이 보호할 대상(사용자별 서버 자원)이 애초에 존재하지 않음 |
| `infra`의 JWT 인증과의 관계 | `refs/infra`(brix-cms)는 자체 API(`/posts`, `/pages` 등, §3.6) 보호용 JWT 인증을 갖지만, 본 검증 페이지는 그 API를 호출하지 않으므로 무관하다 |
| 선례 | Phase 18 검증 1~4/5 모두 인증 가드 없이 공개 정적 페이지로 구현됨 |

결론: `phase18-validation/progress-5/`는 인증 가드·로그인 리다이렉트·세션 체크 로직을 **포함하지 않는다**(§7.3).

### 3.6 "백엔드/인프라 2개 repo" 담당 영역 구분 (Epic 빈 슬롯 — 본 Epic 고유 수용 기준, §0 가정 6)

| repo | 워크스페이스 경로 | 실질 | 본 검증 페이지 담당 영역 | 근거 |
|---|---|---|---|---|
| **`backend`** | `/worktrees/bf/repos/backend`(본 repo) | `notepad-spa` — vanilla-static SPA 모음집(git remote `skfive/brix-flow-test`) | **100%** — `phase18-validation/progress-5/*` 전체 구현(마크업·스타일·진행률 로직·체크리스트 fixture·테스트) | Phase 18 검증 스위트 1~4/5가 모두 이 repo 안에서 완결됨(선례) + `incident-command/`(재사용 원본)도 이 repo 소속 |
| **`infra`** | `/worktrees/bf/repos/infra`(`refs/infra/`, read-only) | `brix-cms` — NestJS/Prisma 블로그 CMS 백엔드(User/Post/Page/Comment 도메인) | **0% — 관여 없음** | ① `grep -rniE "progress\|checklist" refs/infra --include="*.ts"` 결과 매치 0건 ② `prisma/schema.prisma`에 체크리스트/진행률 관련 모델 없음(User/Post/Page/Comment/HealthLog뿐) ③ README §5 API 엔드포인트 개요(`/health`,`/auth/*`,`/posts/*`,`/pages/*`,comments)에 체크리스트/진행률 관련 라우트 없음 ④ 본 검증 페이지의 데이터 의존성이 §3.3에서 이미 "없음"으로 확정됨 — 애초에 어떤 백엔드 API도 필요하지 않으므로 `infra`가 신규 API를 제공할 이유가 없음 |

**결론**: 본 검증 task의 산출물은 전량 `backend` repo(`phase18-validation/progress-5/*`) 안에서 완결되며, `infra` repo는 코드·스키마·문서 어느 것도 변경하지 않는다. "2개 repo 담당 영역 구분"이라는 수용 기준은 **"영역을 나눠 각각 작업하라"가 아니라 "왜 한쪽만 작업하는지를 근거와 함께 명시하라"는 요구로 충족한다**(§0 가정 6). 만약 운영자 의도가 `infra`에 실제 체크리스트 API를 신규 구축하는 것이었다면, 이는 본 task의 수용 기준 원문("렌더·데이터 fetch·인증 가드·디자인 일관성")을 벗어나는 훨씬 큰 범위이며 별도 Epic/API 설계 문서가 필요하다(§13-3).

---

## 4. 화면 구성 요구사항

### 4.1 페이지 구조 (`incident-command/` 체크리스트 섹션만 축소 재현)

```
<body>
 ├─ <header class="topbar">        ← "진행률 체크리스트 검증" 타이틀 + 테마 전환 버튼
 └─ <main class="page">
     └─ <section class="card checklist-card" aria-labelledby="checklist-title">
         ├─ <h2 id="checklist-title">복구 체크리스트</h2>
         ├─ <div id="progress-bar" role="progressbar" aria-valuenow aria-valuemin="0" aria-valuemax="100">  ← 검증 핵심
         │    └─ 진행률 fill + 라벨 "N/M 완료 (P%)"
         └─ <ul id="checklist" class="checklist">
             └─ (체크박스 + label + 완료 시각) × N건
```

장애 목록(`ic-list-pane`)·심각도 필터 칩·상세 헤더·타임라인은 포함하지 않는다(§0 가정 3).

### 4.2 진행률 바 표시 규칙 (원본과 동일)

| 상태 | `aria-valuenow` | 라벨 텍스트 |
|---|---|---|
| 초기 렌더(fixture 그대로) | `Math.round(done/total*100)` | `"{done}/{total} 완료 ({percent}%)"` |
| 체크박스 토글 후 | 즉시 재계산된 값 | 즉시 갱신된 텍스트 |

### 4.3 체크리스트 항목 및 토글 (통계 산출을 위한 최소 지원, 원본 재사용)

- 각 항목은 checkbox(`input[type=checkbox]`) + `label`(항목 텍스트) + `done===true`일 때 완료 시각(`<time>`, mono).
- 체크박스 클릭 → `toggleItem()` 호출 → 새 checklist 배열로 상태 교체 → `calculateProgress()` 재계산 → 진행률 바/항목 리렌더(원본 `command.js`의 `changeEvent → toggle → recalc → render` 흐름 승계).
- `checklist.length === 0`인 경우(방어적 edge, §10 EC) 진행률 바 대신 원본과 동일한 고정 문구 **"해당 장애에 등록된 복구 체크리스트가 없습니다."**를 그대로 승계하되, 본 페이지 맥락에 맞게 "등록된 체크리스트 항목이 없습니다."로 표현을 조정할 수 있다(dev/designer 재량, §13-4).

### 4.4 테마 토글 (공용 셸 재사용, 데이터 의존성과 무관)

Phase 18 검증 스위트 공통 관례대로 `bf-theme` 공유 키 기반 라이트/다크 토글을 포함한다(§3.4 예외). 다크/라이트 default 선택은 designer 재량(clock-3은 라이트, dice-4는 다크를 원본 승계 default로 채택한 선례가 있다 — 원본 `incident-command/`가 다크 전용(관제 화면 톤)이므로 dice-4와 동일하게 원본 default를 승계하는 편을 권장한다, §13-5).

---

## 5. 기존 체크리스트 진행률 재사용 범위 확정

본 섹션은 BF-904의 핵심 수용 기준("렌더·데이터 fetch·인증 가드·디자인 일관성 요구가 문서화된다")을 직접 충족한다.

### 5.1 재사용 대상 (그대로 가져오는 것)

| 구분 | 원본 출처 | 재사용 방식 |
|---|---|---|
| CSS 디자인 토큰(`--ic-progress-*`, 진행률/체크 관련) | `incident-command/style.css` | 값 그대로 복제 — 신규 색상 발명 금지 |
| 진행률 바 마크업(`role="progressbar"`, `aria-valuenow/min/max`, fill div) | `incident-command/command.js` `buildProgressBar()` | 동일 구조 복제 |
| 진행률 텍스트 고정 포맷(`"N/M 완료 (P%)"`) | 상동 `progressText()` | 문구 재작성 금지, 그대로 승계 |
| 체크리스트 항목 마크업(`<li>` + checkbox + label + 완료시각 `<time>`) | 상동 `buildChecklistItem()` | 그대로 복제 |
| 진행률 산식(`calculateChecklistProgress`) | 상동 | 동일 산식으로 `progress.js`에서 재구현(§5.2) |
| 토글 산식(`toggleChecklistItem`, `completedAt` 갱신 규칙) | 상동 | 동일 산식 재구현(§5.2) |
| 빈 체크리스트 안내 문구 원칙 | 상동 | 문구 취지 승계(표현 미세 조정은 §13-4 재량) |

### 5.2 재사용 방식의 제약 — 로직은 "복제 재구현", 직접 import 불가

원본 `incident-command/command.js`는 UMD 패턴으로 `calculateChecklistProgress`/`toggleChecklistItem`을 `module.exports`에 노출하므로 **Node 테스트 환경에서는** `require`가 가능하다. 그러나 **브라우저 런타임에서 `<script src="../incident-command/command.js">`로 직접 로드하는 것은 불가능하다** — 이 스크립트는 로드 즉시 `document.readyState`를 검사해 자동으로 `init()`을 실행하고, `init()`은 `incident-command/index.html` 전용 DOM ID(`incident-list`/`incident-detail`/`ic-live`/`incident-count` 등)를 조회한다. `progress-5/index.html`에는 이 DOM이 존재하지 않으므로 원본을 그대로 로드하면 `init()` 내부에서 `null` 참조 오류가 발생하거나(§16 관련 element 부재), 최소한 불필요한 전체 앱 부트스트랩이 실행된다. 따라서 dice-4(§5.2, `rollOne`/`computeStats` 재구현)·clock-3(`regions.js` 독립 재구현)과 동일한 유형의 제약이 적용된다 — "계산·표시 계약은 재사용하되, 코드 자체는 신규 `progress.js`에 복제 재작성"한다.

### 5.3 재사용하지 않는 것 (의도적 축소, §0 가정 3)

| 구분 | 원본의 상태 | 본 문서의 처리 |
|---|---|---|
| 장애 목록/선택(`ic-list-pane`, `incident-list`) | `command.js`의 `renderList`/`buildIncidentRow` | 미제공 |
| 심각도 필터 칩(P1~P4) | 상동 `filterIncidentsBySeverity` | 미제공 |
| 상세 헤더(제목/배지/owner/타임스탬프) | 상동 `buildDetailHeader` | 미제공 |
| 타임라인 | 상동 `buildTimeline`류 | 미제공 |
| `validateIncidentRecord`(장애 레코드 검증) | 상동 | 미제공 — 체크리스트 항목 자체의 스키마 검증은 fixture 정합성 테스트로 대체(§8) |
| 다중 장애 간 체크리스트 전환(`checklistState[incidentId]`) | 상동 | 미제공 — 단일 체크리스트만 존재 |

### 5.4 재사용 성공 판정 기준

designer/dev가 본 검증 페이지를 구현했을 때, 원본(`incident-command/`)과 비교해 다음이 모두 참이면 "재사용 성공"으로 판정한다(§9 AC-재사용):

1. `styles.css`에 신규 색상 리터럴이 0건이다(진행률 바/체크 관련 토큰 값이 원본과 일치).
2. 진행률 바(`role="progressbar"` + `aria-valuenow/min/max`)와 텍스트 라벨(`"N/M 완료 (P%)"`)이 원본과 동일한 계약을 갖는다.
3. `incident-command/*` 원본 파일이 diff 상 변경 0건이다(§7.5).
4. 진행률 산식(`calculateProgress`)과 토글 산식(`toggleItem`)이 원본과 동일한 산출값(같은 입력에 같은 출력)을 내되, 코드는 `progress.js`에 독립 재구현되어 있다(§5.2).

---

## 6. 진입 시나리오 및 렌더 조건

### 6.1 진입 시나리오

| 시나리오 | 진입 경로 | 기대 동작 |
|---|---|---|
| S1. 정적 서버 경유 | `pnpm start`(`http-server . -p 8888`) 후 `http://localhost:8888/phase18-validation/progress-5/` 접속 | 네트워크 요청 없이 즉시 렌더(§6.2) |
| S2. `file://` 직접 열기 | `index.html`을 브라우저로 직접 오픈 | 상대경로 리소스만으로 S1과 동일 렌더(비-module 스크립트, 원본과 동일 안전 패턴 승계) |
| S3. 원본 모듈 변경 후 재검증 | `incident-command/style.css`나 `calculateChecklistProgress` 산식이 향후 수정된 경우 | 본 페이지가 토큰을 동일 값으로 복제했다면 시각적 diff가, 산식이 달라졌다면 진행률 값 diff가 드러나 재검증 필요성이 신호로 나타난다(§5.4) |

### 6.2 렌더 조건 (필수)

1. **로드 즉시 1회 렌더** — fixture 체크리스트 전체, 초기 진행률 바(값은 fixture의 done 비율)가 지연 없이 나타난다(§4.2).
2. **오프라인 동작** — 네트워크 연결이 없어도 완전히 동일하게 렌더되고 체크박스 토글이 동작한다(외부 API 호출 0건, §3.3).
3. **토글 즉시 갱신** — 체크박스 클릭 → 해당 항목의 완료 시각 표시/제거와 **동일한 렌더 사이클**에서 진행률 바(`aria-valuenow`)·라벨 텍스트가 함께 갱신된다(원본 `render()` 원칙 승계 — 항목 상태와 진행률 값이 서로 다른 시점에서 파생되어 불일치하는 경우가 없다).
4. **새로고침 시 초기화** — 체크 상태는 영속화되지 않으므로(§3.4) 새로고침하면 항상 fixture의 초기 done/미done 상태로 되돌아간다. 이는 결함이 아니라 §3.4의 의도된 축소다.
5. **JS 비활성 시 폴백** — `<noscript>` 안내 문구를 표시한다(Phase 18 검증 스위트 공통 패턴 승계).

---

## 7. 제외 범위 — 필수 명세

### 7.1 실제 진행률/데이터 API 호출 금지

`fetch()`/`XMLHttpRequest`/`WebSocket`/`EventSource` 등 어떤 형태로도 외부 API·서버 집계 엔드포인트를 호출하지 않는다. `/api/progress*`, `/api/checklist*` 등 신규 API 라우트를 만들지 않는다(§3.3, §3.6).

### 7.2 인증/세션 로직 금지

로그인 폼·세션 토큰 체크·인증 리다이렉트를 도입하지 않는다(§3.5). 페이지는 항상 공개 접근 가능해야 한다.

### 7.3 장애 목록/필터/타임라인 신규 도입 금지

§0 가정 3·§5.3에서 확정한 대로, 장애 목록·심각도 필터·상세 헤더·타임라인·다중 체크리스트 전환을 신규로 도입하지 않는다. `bf-theme` 공유 키(§4.4)만 예외로 허용한다.

### 7.4 신규 패키지 설치 금지

`package.json`에 신규 dependency를 추가하지 않는다. 외부 CDN 스크립트/스타일도 포함하지 않는다.

### 7.5 원본 모듈(`incident-command/`) 수정 금지

본 검증 task는 원본을 "재사용"하는 것이지 "변경"하는 것이 아니다. `incident-command/*` 파일을 수정하면 이미 병합된 BF-824 기능에 회귀를 유발할 수 있으므로 절대 수정하지 않는다(§5).

### 7.6 `infra`(`refs/infra/`) 변경 금지

`refs/infra/`는 read-only 참조다. 본 검증 페이지 구현 어디에서도 `infra` repo의 파일을 수정·커밋하지 않으며, 신규 API 엔드포인트도 추가하지 않는다(§3.6).

### 7.7 검증 방법

| 방법 | 절차 | 통과 조건 |
|---|---|---|
| 정적 코드 검사(fetch) | `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|EventSource|https?://" phase18-validation/progress-5/*` | 매치 0건(자체 상대경로 리소스 제외) |
| 정적 코드 검사(인증) | `grep -rniE "login|session|auth|redirect.*sign" phase18-validation/progress-5/*` | 매치 0건(인증 관련 코드 없음) |
| 진행률 산식 재현 확인 | 단위 테스트: 고정 checklist(예: done 2건/total 4건)를 `calculateProgress`에 전달했을 때 `{total:4, done:2, percent:50}` 산출 확인 | §9 AC-3, §3.1 |
| 원본 미변경 확인 | PR diff에서 `incident-command/**` 변경 여부 확인 | 변경 0건 |
| `infra` 미변경 확인 | PR diff/repo 상태 확인 | `infra` repo 변경 0건(§3.6, §7.6) |
| `package.json` diff 확인 | PR diff 확인 | 변경 0건(루트 및 `incident-command/package.json` 모두) |

---

## 8. 파일 구조 및 기술 제약

| 파일 | 역할(제안 — 최종 파일 분할은 dev 재량) |
|---|---|
| `phase18-validation/progress-5/index.html` | 마크업(§4, `<title>`은 "진행률 체크리스트 검증"류 문구로 검증 맥락 반영) |
| `phase18-validation/progress-5/styles.css` | `incident-command/style.css`의 `--ic-progress-*`/체크 관련 토큰·컴포넌트 규칙 복제(§5.1) — 신규 배치 규칙은 최소화(단일 카드면 충분) |
| `phase18-validation/progress-5/fixtures.js` | 정적 체크리스트 배열(최소 5건 권장, done/미done 혼합) — UMD, `node --test` 대상 |
| `phase18-validation/progress-5/progress.js` | 순수 로직: `calculateProgress`(§3.1)·`toggleItem`(§3.2) — UMD 패턴, `incident-command/command.js`의 `module.exports` 패턴 참고 |
| `phase18-validation/progress-5/main.js` | DOM 바인딩, 체크박스 이벤트·진행률 렌더(§4) — `progress.js`/`fixtures.js` 사용, 원본 `incident-command/command.js`는 import하지 않음(§5.2) |

- `file://` 프로토콜 직접 실행 호환 목표(§6.1 S2), 외부 의존성 0건.
- 비-module(IIFE/UMD) 패턴 유지 — 원본 `incident-command/`가 `type=module`이 아닌 이유(file:// CORS 안전)와 동일한 제약을 승계한다.
- 테스트: `node --test tests/phase18-validation-*.test.js`(TEST_SCOPE_POLICY 원문 glob, module: `phase18-validation`) — ① `calculateProgress`가 §3.1 산식과 일치하는지, ② `toggleItem`이 §3.2 규칙(새 배열 반환, `completedAt` 갱신)을 만족하는지, ③ §7.7 정적 검사(fetch/인증 코드 0건), ④ 원본 `incident-command/**`·`refs/infra` 미변경 확인을 순수 함수/정적 검사로 검증. 신규 테스트 파일명은 TEST_SCOPE_POLICY glob에 맞춰 `tests/phase18-validation-progress-5-BF9XX.test.js`(플랫 배치) 권장 — 단, dice-4/clock-3의 실제 E2E 산출물은 `tests/phase18-validation/<name>/BF9XX-e2e.test.js`(중첩 디렉터리)에 위치한 선례가 있어(§13-6) 최종 배치는 tester 재량으로 열어둔다.

---

## 9. Acceptance Criteria 매핑 (Given/When/Then)

### 9.1 BF-904 수용 기준 원문 매핑

**AC-1 (Epic 빈 슬롯 충족 — 렌더·데이터 fetch·인증 가드·디자인 일관성 요구 명문화)**
> **Given** Epic(BF-903)의 설명이 있을 때
> **When** 본 기획 문서(`docs/spec/phase18-validation-progress-5-BF-903.md`)를 작성하면
> **Then** `/phase18-validation/progress-5`의 렌더 요건(§6.2)·데이터 fetch 대상(§3.3, 0건)·인증 가드 필요 여부(§3.5, 불필요)·디자인 일관성 요구(§5.1, 원본 토큰/컴포넌트 그대로 재사용)가 문서화된다.

**AC-2 (백엔드/인프라 2개 repo 범위 구분)**
> **Given** `backend`(본 repo)·`infra`(brix-cms, `refs/infra/`) 2개 repo가 워크스페이스에 존재할 때
> **When** 본 문서 §3.6이 범위를 구분하면
> **Then** `backend` repo가 본 검증 페이지 구현을 100% 담당하고 `infra` repo는 관여하지 않는다는 결론이, 실측 근거(§3.6 표의 4가지 근거)와 함께 명세에 명시된다.

### 9.2 화면·데이터 관련 파생 AC (§3~§7 근거)

**AC-사용자가치**
> **Given** Phase 18 검증 스위트에서 "진행률 체크리스트"의 재사용 가능성이 미검증 상태일 때
> **When** `/phase18-validation/progress-5`가 구현되어 체크박스 토글 1회를 실행하면
> **Then** §2의 4개 사용자 가치(재사용 가시적 증거·다중 repo 담당 범위 명확화·회귀 조기 발견·네트워크 독립성 증명)가 화면 진입 + 토글 1회만으로 확인 가능하다.

**AC-데이터의존성**
> **Given** "데이터 의존성" 개념
> **When** 본 문서 §3이 데이터 모델을 정의하면
> **Then** 유일한 데이터 원천이 `fixtures.js`의 정적 체크리스트 배열과 그에 대한 순수 산술 파생(`percent`)뿐이며, 외부 API·서버·DB·세션 의존성이 0건임이 명시된다.

**AC-렌더**
> **Given** 페이지가 로드된 상태
> **When** 사용자가 진입하거나 체크박스를 토글하면
> **Then** §6.2의 5개 렌더 조건(즉시 렌더·오프라인 동작·토글 즉시 갱신·새로고침 초기화·noscript 폴백)이 모두 충족된다.

**AC-재사용**
> **Given** `phase18-validation/progress-5/*` 구현물
> **When** 원본 `incident-command/*`와 비교하면
> **Then** §5.4 재사용 성공 판정 기준 4항목(신규 색상 0건, 진행률 바 계약 동일, 원본 미변경, 산식 동일값 재구현)을 모두 만족한다.

**AC-3 (진행률 산식 정확성)**
> **Given** 고정된 체크리스트(예: done 2건/total 4건)
> **When** `calculateProgress()`에 전달하면
> **Then** `{total:4, done:2, percent:50}`이 산출되며 원본 `incident-command/command.js`의 동일 입력 결과와 일치한다(§3.1, §7.7).

**AC-NETWORK (외부 네트워크·인증 미사용 원칙)**
> **Given** `progress-5/` 모듈 소스 전체(HTML/CSS/JS)
> **When** §7.7의 정적 코드 검사를 실행하면
> **Then** `fetch`/`XMLHttpRequest`/`WebSocket`/`EventSource`/외부 URL·로그인/세션/인증 관련 코드가 0건이다.

### 9.3 매핑 요약표

| BF-904 수용 기준 | 충족 근거 |
|---|---|
| Given Epic 설명, When 명세 정리, Then `/phase18-validation/progress-5`의 렌더·데이터 fetch·인증 가드·디자인 일관성 요구가 문서화된다 | §2(사용자가치)·§3(데이터의존성·fetch·인증)·§5(재사용/디자인 일관성)·§6(렌더요건) 전체 |
| Given 백엔드/인프라 2개 repo, When 범위 구분, Then 각 repo 담당 영역이 명세에 명시된다 | §3.6 (담당 영역 표 + 4가지 실측 근거) |

---

## 10. Edge Case 목록

### 10.1 체크리스트가 빈 배열일 때

`checklist.length === 0`이면 `calculateProgress`는 `{total:0, done:0, percent:0}`을 반환하며, 화면에는 진행률 바 대신 안내 문구를 표시한다(§4.3). 이는 원본 `incident-command/`의 `TEXT.noChecklist` 처리를 승계한 것으로, v1 정상 fixture 구성에서는 실제로 발생하지 않는다(방어적 edge).

### 10.2 나눗셈-0 불가능 (원본 방어 로직 그대로 승계)

`total === 0`일 때 `percent`를 `0`으로 고정 처리하므로(§3.1) `NaN`이 발생할 여지가 없다. 별도 방어 로직을 추가하지 않아도 된다 — 원본 산식 자체가 이미 방어적이다.

### 10.3 전 항목 완료(100%) 시 표시

모든 항목이 `done:true`이면 `percent:100`이 산출되며, 진행률 바는 가득 찬 상태로 표시된다. 별도의 "완료 축하" 배너 등은 원본에 없으므로 신규로 추가하지 않는다(§11).

### 10.4 새로고침 시 체크 상태 초기화가 재사용 실패로 오인될 위험

§3.4·§6.2-4에서 명시한 대로 새로고침 후 체크 상태가 fixture 초기값으로 돌아가는 것은 **의도된 동작**이지 회귀가 아니다. tester가 "원본은 세션 중 유지되는데 progress-5는 안 되네"로 오인하지 않도록(원본도 사실은 세션 in-memory일 뿐 새로고침 시 동일하게 초기화됨, §3.4), 본 문서를 검증 기준선으로 명시적으로 참조해야 한다.

### 10.5 체크박스 연타

체크박스는 브라우저 네이티브 change 이벤트만 사용하므로 "연타 방지" 로직이 원본에도 없다 — 매 클릭이 즉시 `toggleItem` → `calculateProgress` 재계산으로 이어지며 경합 상태(race condition)가 발생하지 않는다(단일 스레드 동기 처리).

### 10.6 `infra` repo 관여 요구가 향후 뒤집힐 가능성

§3.6에서 "infra 0% 관여"로 결론 내렸으나, 만약 운영자가 실제로 체크리스트 데이터를 `infra`(brix-cms) 신규 API로 서빙하길 원한다면 본 문서의 §3.3(데이터 의존성 없음)·§3.6(repo 담당 영역)·§7.1/§7.6(API 호출·infra 변경 금지) 전체가 재작성 대상이 된다. 이는 Phase 18 검증 스위트의 근본 전제("vanilla-static, 외부 의존성 0건")를 깨는 큰 변경이므로 운영자 확인이 선행되어야 한다(§13-1).

---

## 11. 비범위 (Out of Scope)

- 장애 목록/선택·심각도 필터·상세 헤더·타임라인 — §0 가정 3, §5.3
- 다중 체크리스트 간 전환 — §5.3
- `localStorage` 기반 체크 상태 영속화 — §3.4(테마 공유 키만 예외)
- 실제 진행률/체크리스트 API 연동, 서버 집계, DB 조회 — §3.3, §7.1에서 명시적으로 배제
- `infra`(brix-cms) repo에 신규 엔드포인트·스키마 추가 — §3.6, §7.6에서 명시적으로 배제(§13-1 확인 전까지)
- 인증/로그인/세션 가드 — §3.5, §7.2에서 명시적으로 배제
- `release-readiness/` 재사용 — §0 가정 2에서 후보 제외(실제 구현 없음)
- `incident-command/*` 원본 코드의 수정·리팩터링 — §7.5
- Phase 18 검증 스위트의 1~4/5 항목 — 본 문서는 5/5만 다룬다
- 디자인 산출물(정확한 mockup 등) — designer 담당 영역, 원본 디자인 명세(`docs/design/incident-command-BF-827.md`)의 토큰을 그대로 참조하면 충분하다고 판단(§13-5)

---

## 12. 산출물 위치 및 참조 표

| 산출물 | 경로 |
|---|---|
| 본 기획 명세 | `docs/spec/phase18-validation-progress-5-BF-903.md`(본 문서, File Ownership 원문 명시) |
| 신규 구현 대상(후속 designer/dev task) | `phase18-validation/progress-5/index.html`, `styles.css`, `fixtures.js`, `progress.js`, `main.js` — 미정, 본 문서 §3~§8이 계약(contract) |
| 신규 테스트 대상(후속 tester task) | `tests/phase18-validation-progress-5-*.test.js`(TEST_SCOPE_POLICY glob 기준, §8) — 미정, 본 문서 §7.7·§9가 검증 기준 |
| 재사용 원본(수정 금지) | `incident-command/index.html`, `style.css`, `command.js`, `fixtures.js`(BF-822/823/824) |
| 참조한 기존 선례 | `docs/planning/dice-4-BF-897.md`(Phase 18 검증 4/5, 재사용 제약·repo 실측 방법론의 직접 선례)·`docs/planning/clock-3-BF-891.md`(검증 3/5)·`docs/plan/incident-command-BF-821.md`/`docs/design/incident-command-BF-827.md`(재사용 원본 명세)·`docs/plan/release-readiness-BF-815.md`(재사용 후보에서 제외된 문서, §0 가정 2 근거) |
| 참조한 read-only repo | `refs/infra/`(brix-cms, §3.6 담당 영역 실측 근거) |

---

## 13. 남은 모호함 (운영자 확인 권장)

1. **"백엔드/인프라 2개 repo" 수용 기준의 정확한 의도**: §0 가정 6, §3.6 — 본 문서는 이를 "실제 API 연동을 요구하는 지시"가 아니라 "repo 담당 영역을 근거와 함께 명시하라는 문서화 요구"로 해석했다. 만약 운영자 의도가 `infra`(brix-cms)에 실제 체크리스트 API를 신규 구축하는 것이었다면, §3.3(데이터 의존성 없음)·§3.6·§7.1/§7.6 전체가 재작성 대상이며 이는 본 task의 수용 기준 원문 범위를 크게 벗어나는 별도 Epic 규모의 작업이다.
2. **산출물 디렉터리가 `docs/planning/`이 아닌 `docs/spec/`인 이유**: §0 가정 8 — File Ownership 원문이 `docs/spec/phase18-validation-progress-5-BF-903.md`를 리터럴로 지정했다. 선례 4건은 모두 `docs/planning/`을 사용했으므로, 이 디렉터리 전환이 의도적인지(향후 phase18 스위트가 `docs/spec/`으로 이관되는지) 확인이 필요하다.
3. **`release-readiness/`를 뒤늦게 구현할지 여부**: §0 가정 2 — `release-readiness/`(BF-815 Epic)는 기획·디자인만 완료되고 실제 구현 없이 방치되어 있다. 본 task는 이를 무시하고 `incident-command/`를 재사용 원본으로 선택했으나, 운영자가 `release-readiness/`를 별도로 완결 짓고 싶다면 그것은 본 Epic(BF-903)과 무관한 별도 티켓이 필요하다.
4. **빈 체크리스트 안내 문구를 원본 그대로 쓸지 여부**: §4.3, §13-4 — 원본 문구("해당 장애에 등록된 복구 체크리스트가 없습니다")는 "장애" 맥락이 남아 있어 progress-5에는 부적합할 수 있다. dev/designer 재량으로 문구만 조정 가능하도록 열어두었다.
5. **테마 default(다크/라이트)**: §4.4, §13-5 — 원본 `incident-command/`는 다크 전용(관제 화면 톤)이다. dice-4처럼 원본 default를 승계할지, clock-3처럼 라이트로 전환할지는 designer 재량으로 열어두었다.
6. **테스트 파일 배치 — 플랫 vs 중첩 디렉터리**: §8, §13-6 — TEST_SCOPE_POLICY는 `tests/phase18-validation-*.test.js`(플랫) glob을 지정하지만, 선행 항목(clock-3/dice-4)의 실제 E2E 테스트는 `tests/phase18-validation/<name>/*.test.js`(중첩)에 위치한다. 두 관례가 공존하므로 tester가 최종 배치를 정하되, 최소한 단위 테스트(순수 함수)는 정책 glob에 맞는 플랫 경로를 권장한다.
7. **Epic(BF-903) 원문 미대조**: 본 세션에 Jira 조회 도구가 연결되어 있지 않아 BF-903 Epic 원문을 직접 대조하지 못했다. 본 문서는 BF-904 task 설명·수용 기준 원문 및 status-card/a11y-counter/clock-3/dice-4 선례, `refs/infra` 실측 결과만으로 작성했다.

---

*문서 종료 — [박기획] · BF-904*
