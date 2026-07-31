# 전달 상태 요약 패널 — 구현 설계 및 UI 계약 (BF-1398 / BF-1411)

> 본 문서는 planner(박기획)가 동결한 **실행 설계 + frozen UI 계약**입니다.
> designer(BF-1409)와 developer(BF-1410)는 이 문서의 selector·token·상태·접근성·반응형 값을
> **재정의 없이 그대로** 구현합니다. tester(BF-1413)는 이 계약 기준으로 검증합니다.
> 파일 소유권·상태 계약의 유일 권위는 frozen Execution Blueprint이며, 본 문서는 이를 설명·렌더링할 뿐
> 새 파일·새 역할·범위 밖 요구사항을 추가하지 않습니다.

---

## 1. 목적 (Objective)

화면·상태·selector·token·접근성·반응형을 추측 없이 확정하여, designer와 developer가
병렬로 작업하면서도 서로 재정의 없이 동일한 UI 계약 위에서 구현하도록 한다.

- 전달(delivery) 상태를 요약해 보여주는 **정적 패널**을 구현한다.
- **정적 fixture 데이터만** 사용한다. 외부 API 호출·DB 변경·runtime 배선은 이번 범위가 **아니다**.

---

## 2. 범위 제약 (Scope / Non-Goals)

### ✅ 이번 범위
- 정적 fixture를 기반으로 한 상태 요약 패널의 마크업·스타일·상태 렌더링 로직.
- loading / ready / empty / error 4개 상태의 화면 표현.
- 접근성(색상 외 텍스트 라벨, aria-label, 키보드 순회) 및 반응형 동작.

### ❌ 이번 범위 아님 (명시적 못박음)
- 외부 API 연동, 네트워크 fetch 실제 배선.
- 데이터베이스 스키마 변경 / 마이그레이션.
- 인증·권한·billing·tenant 관련 runtime 로직.
- 위 owned/contract 경로 밖 파일 신규 생성 또는 소유자 재배정.

---

## 3. 파일 소유권 (File Ownership — frozen)

frozen blueprint의 소유권을 그대로 옮긴다. 아래 소유자·정책을 변경하지 않는다.

| 파일 | 소유자 | 정책 |
|------|--------|------|
| `demo/delivery-health/index.html` | developer (BF-1410) | additive |
| `demo/delivery-health/src/feature.js` | developer (BF-1410) | additive |
| `docs/design/delivery-health-BF-1398.md` | designer (BF-1409) | additive |
| `docs/plans/delivery-health-BF-1398.md` | planner (BF-1411, 본 문서) | — |
| `demo/delivery-health/tests/feature.test.js` | tester (BF-1413) | read-only(본 계약 검증) |

- **additive**: 기존 내용을 파괴적으로 재작성하지 않고 계약을 추가·구현하는 방식으로만 편집.

---

## 4. 사용자 시나리오 (User Scenarios)

1. 운영자가 전달 상태 요약 패널이 포함된 화면(`/demo/delivery-health`)을 연다.
2. 패널은 먼저 **loading** 상태로 "상태를 불러오는 중" 진행 표시를 보여준다.
3. fixture 로드가 끝나면:
   - 항목이 있으면 **ready** — 각 항목의 상태 배지(진행/대기/조치 필요)와 다음 행동 텍스트를 보여준다.
   - 항목이 없으면 **empty** — "표시할 전달 상태가 없습니다" 안내를 보여준다.
4. 로드에 실패하면 **error** — "상태를 불러오지 못했습니다" 오류 안내와 재시도 안내를 보여준다.
5. 운영자가 **상태 새로고침** control을 누르면 상태를 다시 loading부터 조회한다.

---

## 5. Acceptance Criteria (Given / When / Then)

### AC-1 (loading)
- **Given** 패널이 처음 마운트되어 fixture가 아직 준비되지 않은 상태에서
- **When** `#delivery-health-root`가 렌더링되면
- **Then** "상태를 불러오는 중" 문구와 진행 표시가 노출된다.

### AC-2 (ready)
- **Given** fixture에 1개 이상의 전달 상태 항목이 있을 때
- **When** 로드가 완료되면
- **Then** `#status-summary-list` 안에 항목별 `.status-badge`(진행/대기/조치 필요)와 다음 행동 텍스트가 노출된다.

### AC-3 (empty)
- **Given** fixture 항목이 0개일 때
- **When** 로드가 완료되면
- **Then** `.empty-state`로 "표시할 전달 상태가 없습니다" 안내가 노출된다.

### AC-4 (error)
- **Given** fixture 로드가 실패로 처리될 때
- **When** 로드가 종료되면
- **Then** "상태를 불러오지 못했습니다" 오류 안내와 재시도 안내가 노출된다.

### AC-5 (초기화 / 재시도 후조건)
- **Given** 초기화·취소·실패가 발생한 뒤
- **When** 상태가 정리되면
- **Then** 상태 표시와 진행 표시는 초기값으로 되돌아가고, `#status-refresh` 주 실행 control을 다시 사용할 수 있다.

### AC-6 (접근성)
- **Given** 어떤 상태에서든
- **When** 상태 배지가 노출되면
- **Then** 색상만으로 구분하지 않고 상태명(진행/대기/조치 필요)이 화면 텍스트와 접근성 이름으로 함께 노출된다.

### AC-7 (반응형)
- **Given** 뷰포트 폭이 320px 이상일 때 content overflow가 없고,
- **When** 폭이 480px 미만이면
- **Then** 패널이 세로 스택으로 재배치된다.

---

## 6. Frozen UI 계약 (변경·재정의 금지)

### 6.1 대상 파일
- `demo/delivery-health/index.html`
- `demo/delivery-health/src/feature.js`
- `docs/design/delivery-health-BF-1398.md`

### 6.2 Route
- `/demo/delivery-health` (root-relative static, entry: `demo/delivery-health/index.html`)

### 6.3 DOM ID (exact)
| ID | 용도 |
|----|------|
| `delivery-health-root` | 패널 루트 컨테이너 |
| `status-summary-list` | 항목별 상태 요약 리스트 |
| `status-refresh` | 상태 새로고침 주 실행 control |

### 6.4 CSS class (exact)
| class | 용도 |
|-------|------|
| `delivery-health` | 패널 스코프 클래스 |
| `status-badge` | 상태 배지 공통 |
| `status-badge--progress` | 진행 상태 배지 |
| `status-badge--waiting` | 대기 상태 배지 |
| `status-badge--action` | 조치 필요 상태 배지 |
| `empty-state` | 빈 상태 안내 |

### 6.5 상태(States) — 화면 텍스트 포함 (exact)
| 상태 | 화면 표현 |
|------|-----------|
| `loading` | "상태를 불러오는 중" + 진행 표시 |
| `ready` | 항목별 배지와 다음 행동 텍스트 표시 |
| `empty` | "표시할 전달 상태가 없습니다" 빈 상태 안내 |
| `error` | "상태를 불러오지 못했습니다" 오류 안내 + 재시도 안내 |

### 6.6 Design token / CSS 변수 (exact 값)
| 변수 | 값 |
|------|-----|
| `--color-status-progress` | `#2563eb` |
| `--color-status-waiting` | `#d97706` |
| `--color-status-action` | `#dc2626` |
| `--space-panel-gap` | `12px` |
| `--radius-badge` | `6px` |

### 6.7 접근성 (Accessibility) — exact 요구
- `#status-refresh` control은 `aria-label="상태 새로고침"`을 가진다.
- 각 `.status-badge`는 색상 외 텍스트 라벨(진행/대기/조치 필요)을 함께 노출한다.
- `#status-summary-list`는 키보드 Tab 순회가 가능하고 focus 표시가 보인다.
- 모든 상태는 색상만으로 구분하지 않고 상태명을 화면 텍스트와 접근성 이름으로 노출한다.

### 6.8 반응형 (Responsive) — exact 동작
- 320px 이상에서 content overflow가 발생하지 않는다.
- 480px 미만에서 패널이 세로 스택으로 재배치된다.

### 6.9 불변식 (Invariants)
- designer와 developer는 위 selector와 token을 **변경하거나 재정의하지 않는다.**
- 초기화·취소·실패 뒤에는 상태와 진행 표시를 초기값으로 되돌리고 주 실행 control(`#status-refresh`)을 다시 사용할 수 있어야 한다.
- 파일 소유권과 상태 계약의 유일 권위는 frozen blueprint이며 본 문서는 이를 재정의하지 않는다.

---

## 7. 데이터 모델 (정적 fixture — 읽기 전용)

외부 API·DB 없이 정적 fixture만 사용한다. 각 항목은 다음 형태를 가진다(구현 참고용):

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 항목 식별자 |
| `title` | string | 전달 항목 제목 |
| `status` | `progress` \| `waiting` \| `action` | 상태 구분 → 배지 매핑 |
| `nextAction` | string | 다음 행동 텍스트(ready 상태에서 노출) |

상태값 → 배지 클래스 매핑:
- `progress` → `.status-badge status-badge--progress` (라벨 "진행")
- `waiting` → `.status-badge status-badge--waiting` (라벨 "대기")
- `action` → `.status-badge status-badge--action` (라벨 "조치 필요")

> 이 fixture는 클라이언트 정적 데이터로만 존재하며 서버/DB 변경을 유발하지 않는다.

---

## 8. Edge / 실패 케이스

| 케이스 | 기대 동작 |
|--------|-----------|
| fixture 항목 0개 | `empty` 상태, "표시할 전달 상태가 없습니다" |
| 로드 실패 | `error` 상태, "상태를 불러오지 못했습니다" + 재시도 안내 |
| 로드 중 재시도(새로고침) | `loading`으로 되돌아가고 control 재사용 가능 |
| 취소/초기화 | 상태·진행 표시 초기값 복원, `#status-refresh` 재사용 가능 |
| 폭 320px 경계 | content overflow 없음 |
| 폭 480px 미만 | 세로 스택 재배치 |
| 미지정 status 값 | ready에서 렌더 제외 또는 안전 무시(파괴적 처리 금지) |

---

## 9. Handoff (병렬 producer 실행 계약)

- **designer (BF-1409)** → `docs/design/delivery-health-BF-1398.md`
  - 위 token·상태·접근성·반응형 값을 시각 사양으로 구체화하되 selector/token을 **변경하지 않는다.**
- **developer (BF-1410)** → `demo/delivery-health/index.html`, `demo/delivery-health/src/feature.js`
  - 위 DOM ID/class·상태·token·접근성·반응형을 그대로 구현. 정적 fixture만 사용.
- **reviewer (BF-1412 계열)** → design·develop 완료 후 계약 준수 검토.
- **tester (BF-1413)** → `demo/delivery-health/tests/feature.test.js`로 계약 검증.
  - 검증 명령: `node --test demo/delivery-health/tests/*.test.js`

---

## 10. 산출물 경로

| 경로 | 산출물 |
|------|--------|
| `docs/plans/delivery-health-BF-1398.md` | (본 문서) 실행 설계 + frozen UI 계약 |
| `docs/design/delivery-health-BF-1398.md` | designer 시각 사양 |
| `demo/delivery-health/index.html` | developer 마크업 |
| `demo/delivery-health/src/feature.js` | developer 상태 렌더링 로직 |
| `demo/delivery-health/tests/feature.test.js` | tester 계약 검증 테스트 |
