# 고객 피드백 보드 기획 명세 (BF-1073)

- 대상 라우트: `/demo/feedback-board` (entry: `demo/feedback-board/index.html`, developer 담당)
- 기술 스택: vanilla-static (서버 없음, `localStorage` 기반 클라이언트 저장)
- 관련 형제 Task: BF-1074(designer, 시안), BF-1075(developer, 구현), BF-1077(tester, E2E 검증)
- 본 문서는 **기획 명세만** 다룬다. 코드/시안은 포함하지 않는다.

---

## 1. 개요

고객이 제출한 피드백(버그 리포트, 기능 제안 등)을 목록으로 보고, 상태별로 관리·필터링할 수 있는 보드 화면. 백엔드가 없으므로 모든 데이터는 브라우저 `localStorage`에 저장된다. 데이터는 JSON 파일로 내보낼 수 있어야 하며, 운영 지표(KPI)를 화면에서 바로 확인할 수 있어야 한다.

---

## 2. 사용자 시나리오

1. **피드백 등록**: 사용자가 제목·내용·카테고리를 입력해 피드백을 새로 등록한다. 등록 즉시 상태는 `open`이다.
2. **상태 변경**: 운영자가 피드백을 검토 후 `planned`(계획됨)으로 옮기고, 작업 완료 시 `done`으로 옮긴다.
3. **필터링**: 사용자가 상태(`open`/`planned`/`done`) 또는 카테고리로 목록을 좁혀 본다.
4. **내보내기**: 운영자가 현재 저장된 전체 피드백 데이터를 JSON 파일로 내보내 백업하거나 외부로 공유한다.
5. **손상 복구**: `localStorage` 데이터가 손상(파싱 실패, 스키마 불일치)된 경우, 앱은 크래시 없이 안전하게 복구하고 사용자에게 알린다.
6. **KPI 확인**: 운영자가 보드 상단에서 전체 건수, 상태별 건수, 평균 처리 시간(open→done) 등의 KPI를 확인한다.

---

## 3. 데이터 스키마

### 3.1 Feedback 레코드

```json
{
  "id": "string (uuid v4)",
  "title": "string, 1~100자, 필수",
  "content": "string, 1~2000자, 필수",
  "category": "string, enum: bug | feature | improvement | other, 필수",
  "status": "string, enum: open | planned | done, 기본값 open",
  "createdAt": "string, ISO 8601 UTC 타임스탬프, 필수, 생성 시 고정",
  "updatedAt": "string, ISO 8601 UTC 타임스탬프, 필수, 상태·내용 변경 시마다 갱신",
  "statusHistory": [
    {
      "status": "open | planned | done",
      "at": "string, ISO 8601 UTC 타임스탬프"
    }
  ]
}
```

필드 규칙:

| 필드 | 타입 | 필수 | 규칙 |
|---|---|---|---|
| `id` | string | Y | UUID v4, 클라이언트 생성, 불변 |
| `title` | string | Y | 공백 제거 후 1~100자. 빈 문자열이면 등록 거부 |
| `content` | string | Y | 공백 제거 후 1~2000자. 빈 문자열이면 등록 거부 |
| `category` | enum | Y | `bug`, `feature`, `improvement`, `other` 중 하나. 그 외 값은 등록 거부 |
| `status` | enum | Y | `open`, `planned`, `done`. 등록 시 항상 `open`으로 강제 (클라이언트가 다른 값 전달해도 무시) |
| `createdAt` | ISO8601 | Y | 등록 시 1회 설정, 이후 변경 불가 |
| `updatedAt` | ISO8601 | Y | 레코드 필드 변경 시(상태 전이 포함) 매번 갱신 |
| `statusHistory` | array | Y | 상태 전이 시마다 append. 등록 시 `open` 진입 이력 1건으로 시작 |

### 3.2 저장 컨테이너 (localStorage 최상위 구조)

```json
{
  "schemaVersion": 1,
  "items": [ /* Feedback 레코드 배열 */ ]
}
```

- `localStorage` key: `feedback-board:v1` (버전 정책은 §5 참조)
- 값은 위 컨테이너 객체를 `JSON.stringify` 한 문자열.

---

## 4. 상태 전이 (State Machine)

### 4.1 상태 정의

- `open`: 신규 접수, 미검토/대기
- `planned`: 검토 완료, 작업 계획됨
- `done`: 작업 완료

### 4.2 허용 전이

```
open → planned
planned → done
open → done   (긴급/단순 처리 시 계획 단계 skip 허용)
```

### 4.3 금지 전이 (역행 없음)

- `planned → open` 금지
- `done → planned` 금지
- `done → open` 금지
- **정책**: 상태는 앞으로만 진행한다(역행 불가). 되돌림이 필요하면 신규 피드백으로 재등록한다. UI는 금지된 전이 버튼/옵션 자체를 노출하지 않는다(비활성화가 아니라 미노출).

### 4.4 전이 시 처리

- 전이가 발생하면 `status` 갱신, `updatedAt` 갱신, `statusHistory`에 `{status, at}` 항목 append.
- 동일 상태로의 "전이"(예: `open → open`)는 무동작(no-op) — 이력 추가하지 않음.

---

## 5. 필터

### 5.1 필터 축

- **상태 필터**: `all`(기본값) | `open` | `planned` | `done` — 단일 선택
- **카테고리 필터**: `all`(기본값) | `bug` | `feature` | `improvement` | `other` — 단일 선택

### 5.2 결합 규칙

- 두 필터는 AND 조건으로 결합된다. 예: 상태=`open` + 카테고리=`bug` → open 상태이면서 bug 카테고리인 항목만 표시.
- 필터 결과가 0건이면 "조건에 맞는 피드백이 없습니다" 형태의 empty state를 표시한다(구현 문구는 developer/designer 재량).
- 필터는 정렬에 영향을 주지 않는다. 기본 정렬은 `createdAt` 내림차순(최신 등록 순)으로 고정.
- 필터 상태는 새로고침 시 유지할 필요 없음(세션 내 UI 상태로 충분, 영속화 대상 아님).

---

## 6. localStorage 버전 정책 및 손상 복구

### 6.1 버전 관리

- 현재 스키마 버전: `1` (`schemaVersion: 1`)
- key 네이밍에 버전을 포함(`feedback-board:v1`)해 향후 breaking change 시 `feedback-board:v2`로 key 자체를 분리한다.
- **마이그레이션 원칙**: 향후 `schemaVersion` 이 올라가는 경우, 이전 버전 데이터를 읽어 새 스키마로 변환 후 저장하고, 변환이 불가능한 필드는 안전한 기본값으로 채운다. 마이그레이션 무결성 조건:
  - 마이그레이션 전 `items` 배열의 레코드 수와 마이그레이션 후 레코드 수가 동일해야 한다(레코드 유실 금지).
  - 마이그레이션 실패 시 원본 데이터는 그대로 보존하고(덮어쓰지 않음), 빈 목록으로 폴백하지 않는다.

### 6.2 손상 복구 정책

읽기 시점에 아래 순서로 검증한다:

1. **파싱 실패** (`JSON.parse` throw): 손상으로 간주.
2. **구조 불일치**: `schemaVersion`이 숫자가 아님 / `items`가 배열이 아님 → 손상으로 간주.
3. **레코드 단위 검증**: `items` 순회 중 개별 레코드가 §3.1 필수 필드·enum 규칙을 만족하지 않으면 **해당 레코드만 제외**하고 나머지는 유지한다(전체 폐기 금지, 부분 복구 우선).

복구 동작:

- 위 1·2번(컨테이너 자체가 손상)인 경우: 손상된 원본 값을 `feedback-board:v1:corrupted:<ISO타임스탬프>` key로 백업 저장 후, `feedback-board:v1`은 빈 컨테이너(`{schemaVersion: 1, items: []}`)로 재초기화한다. 사용자에게 "저장된 데이터를 복구할 수 없어 초기화되었습니다" 알림을 노출한다.
- 3번(일부 레코드만 손상)인 경우: 유효한 레코드만 유지해 정상 렌더링하고, 제외된 레코드 수를 콘솔 경고로 남긴다(사용자 알림은 선택).
- **손상 복구는 원본 파괴적 삭제가 아니라 백업 후 재초기화**를 원칙으로 한다(§6.1 마이그레이션 실패 시 원본 보존 원칙과 동일 맥락).

### 6.3 저장 실패 처리 (쓰기 시점)

- `localStorage.setItem` 이 quota 초과 등으로 실패(`QuotaExceededError`)하면 마지막 성공 상태를 유지하고 사용자에게 "저장에 실패했습니다. 데이터 양을 줄여주세요" 등의 오류를 노출한다. 실패 시 메모리 상의 상태를 롤백해 UI와 저장소 불일치를 만들지 않는다.

---

## 7. JSON 내보내기

- 트리거: 보드 화면의 "내보내기" 액션(버튼 등, UI 상세는 designer/developer 재량).
- 내보내기 대상: 현재 저장된 **전체** `items` (필터 적용 여부와 무관하게 전체 데이터 기준). 필터링된 부분만 내보내는 기능은 본 범위 밖(non-goal).
- 파일 포맷: `.json`, UTF-8, 아래 구조:

```json
{
  "exportedAt": "ISO 8601 UTC 타임스탬프 (내보내기 실행 시각)",
  "schemaVersion": 1,
  "items": [ /* Feedback 레코드 배열, §3.1과 동일 */ ]
}
```

- 파일명 규칙(권장): `feedback-board-export-<YYYYMMDD-HHmmss>.json`.
- 내보내기는 읽기 전용 동작이며 저장소 상태를 변경하지 않는다.
- `items`가 빈 배열이어도 내보내기는 허용한다(빈 백업도 유효).

---

## 8. KPI 측정 항목

보드 화면에 아래 KPI를 표시한다. 모든 KPI는 현재 `localStorage`에 저장된 전체 데이터(필터 미적용) 기준으로 계산한다.

| KPI | 정의 | 계산 방법 |
|---|---|---|
| 전체 피드백 건수 | 등록된 전체 레코드 수 | `items.length` |
| 상태별 건수 | 상태별 분포 | `items`를 `status`로 그룹핑한 개수 (`open`/`planned`/`done` 각각) |
| 카테고리별 건수 | 카테고리별 분포 | `items`를 `category`로 그룹핑한 개수 |
| 완료율 | 전체 대비 `done` 비율 | `done 건수 / 전체 건수 * 100` (%, 소수점 1자리). 전체 건수 0이면 `0%`로 표시(0으로 나누기 방지) |
| 평균 처리 시간 | `open` 진입 → `done` 진입까지 평균 소요 시간 | `done` 상태인 레코드만 대상. 각 레코드의 `statusHistory`에서 최초 `open` 진입 시각과 최초 `done` 진입 시각의 차이를 구해 평균. `done` 레코드가 0건이면 "데이터 없음"으로 표시 |
| 미처리 적체(open) 건수 | 장기 미처리 파악용 | `status === 'open'`인 건수 |

KPI 재계산 시점: 데이터 등록/상태 전이/삭제(향후 확장 시) 직후, 그리고 필터와 무관하게 화면 진입 시 1회.

---

## 9. Acceptance Criteria (Given/When/Then)

### AC-1. 데이터 등록

- Given 사용자가 보드 화면에 있을 때
- When 제목·내용·카테고리를 채워 등록을 실행하면
- Then 새 레코드가 `status: open`, `createdAt`/`updatedAt` 현재시각, `statusHistory: [{status: open, at: ...}]` 로 저장되고 목록에 나타난다.

### AC-2. 필수값 누락 등록 거부 (실패 케이스)

- Given 제목 또는 내용이 빈 문자열(공백만 포함)이거나 카테고리가 enum 값이 아닐 때
- When 등록을 시도하면
- Then 저장소에 반영되지 않고 사용자에게 입력 오류가 안내된다.

### AC-3. 정상 상태 전이

- Given `open` 상태의 레코드가 있을 때
- When 운영자가 `planned` 또는 `done`으로 전이를 실행하면
- Then `status`가 갱신되고 `updatedAt`이 갱신되며 `statusHistory`에 신규 항목이 append 된다.

### AC-4. 금지된 역행 전이 (실패 케이스)

- Given `planned` 또는 `done` 상태의 레코드가 있을 때
- When `open`으로(또는 `done`에서 `planned`으로) 되돌리는 동작을 시도하면
- Then UI에 해당 옵션이 노출되지 않아 전이가 발생하지 않는다(§4.3).

### AC-5. 필터 결합

- Given 상태와 카테고리 필터가 모두 `all`이 아닌 값으로 설정됐을 때
- When 목록을 조회하면
- Then 두 조건을 모두 만족하는 레코드만 AND 조건으로 표시되고, 없으면 empty state가 표시된다.

### AC-6. localStorage 스키마 마이그레이션 무결

- Given 이전 스키마 버전의 데이터가 저장되어 있고 이번 버전에서 마이그레이션 로직이 실행될 때
- When 앱이 데이터를 로드하면
- Then 마이그레이션 전후 레코드 수가 동일하게 유지되고, 변환 불가 필드는 안전한 기본값으로 대체된다(§6.1).

### AC-7. localStorage 손상 시 롤백(복구)

- Given `localStorage`의 `feedback-board:v1` 값이 파싱 불가능하거나 구조가 손상되어 있을 때
- When 앱이 데이터를 로드하면
- Then 손상된 원본은 `...:corrupted:<timestamp>` key로 백업되고, 현재 key는 빈 컨테이너로 안전하게 재초기화되며, 앱은 크래시하지 않고 사용자에게 초기화 사실이 안내된다(§6.2).

### AC-8. JSON 내보내기

- Given 저장된 피드백 데이터가 0건 이상 존재할 때
- When 사용자가 내보내기를 실행하면
- Then §7 구조를 만족하는 JSON 파일이 생성되고 저장소 상태는 변경되지 않는다.

### AC-9. KPI 측정

- Given 저장된 피드백 데이터가 존재할 때
- When 보드 화면에 진입하면
- Then §8에 정의된 전체 건수·상태별 건수·카테고리별 건수·완료율·평균 처리 시간·미처리 건수가 정확히 계산되어 표시되고, `done` 레코드가 0건이면 평균 처리 시간은 "데이터 없음"으로, 전체 건수가 0건이면 완료율은 `0%`로 표시된다(0-division 방지, §8).

---

## 10. Edge Case / 실패 케이스 요약

| 케이스 | 처리 방침 |
|---|---|
| 제목/내용 공백만 입력 | 등록 거부 (AC-2) |
| category 미지정 또는 알 수 없는 값 | 등록 거부 (AC-2) |
| 역행 상태 전이 시도 | UI 미노출로 원천 차단 (AC-4) |
| 동일 상태로 재전이 | no-op, 이력 미추가 (§4.4) |
| localStorage 파싱 실패 | 백업 후 재초기화, 사용자 안내 (AC-7) |
| localStorage 일부 레코드만 스키마 불일치 | 해당 레코드만 제외, 나머지 유지 (§6.2-3) |
| 마이그레이션 중 일부 필드 변환 불가 | 안전 기본값 대체, 레코드 수 불변 (AC-6) |
| 마이그레이션 자체 실패 | 원본 보존, 빈 목록 폴백 금지 (§6.1) |
| localStorage 쓰기 quota 초과 | 마지막 성공 상태 유지 + 오류 안내, 메모리 상태 롤백 (§6.3) |
| 필터 결과 0건 | empty state 표시 (AC-5) |
| 데이터 0건 상태에서 내보내기 | 빈 `items` 배열로 내보내기 허용 (§7) |
| 전체 0건일 때 KPI 완료율/평균 처리 시간 | 각각 `0%` / "데이터 없음" (0-division 방지, AC-9) |

---

## 11. 수용 기준 ↔ 문서 항목 매핑 (Traceability)

| Epic 수용 기준 | 대응 문서 항목 |
|---|---|
| 데이터 스키마 확정 | §3 (3.1, 3.2) |
| 상태 전이 확정 | §4, AC-3, AC-4 |
| 필터 확정 | §5, AC-5 |
| localStorage 버전/복구 정책 확정 | §6 (6.1~6.3), AC-6, AC-7 |
| JSON 내보내기 확정 | §7, AC-8 |
| KPI 측정 항목 확정 | §8, AC-9 |
| 시나리오 | §2, AC-1~AC-9 |
| 마이그레이션 무결 | §6.1, AC-6 |
| 롤백(손상 복구) | §6.2, AC-7 |
| KPI | §8, AC-9 |

---

## 12. Non-goals (본 범위 밖)

- 서버/DB 연동, 다중 사용자 동시 편집, 인증/권한.
- 필터링된 부분집합만 내보내는 기능(§7 참조, 전체 내보내기만 지원).
- 상태 역행/되돌리기 기능.
- 시안(비주얼 디자인)은 BF-1074(designer) 담당, 실제 구현은 BF-1075(developer) 담당.
