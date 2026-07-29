# 전달 상태 배지 시각 명세 (BF-1253 / Phase 21)

> 본 문서는 planner가 동결한 **ui-contract@v1** 을 그대로 반영한 **designer 시각 명세**입니다.
> selector·CSS class·design token·상태 enum·접근성·반응형 규칙은 frozen blueprint 및
> `docs/plans/phase21-delivery-status-BF-1252.md`가 유일한 권위이며, 본 문서는 이를 **재정의하지 않고 시각화만** 합니다.
> **범위 제약**: 본 산출물은 시각 명세 문서 1개(`docs/design/phase21-delivery-status-BF-1252.md`)로 한정하며,
> **런타임 HTML/CSS/JS 파일을 생성하지 않습니다.** 아래 mockup은 문서 내 참조 다이어그램/비런타임 마크업 예시입니다.

---

## 1. 시안 개요

- **변경 범위**: 전달 상태 배지(`delivery-status-badge`) — 상태 조회 결과를 색상 + 화면 텍스트로 안내하고, 재조회 control(`delivery-status-refresh`)로 갱신하는 단일 컴포넌트.
- **사용자 경험 목표**
  1. 현재 전달 상태를 **색상만이 아니라 상태명 텍스트**로 즉시 인지한다.
  2. `delivery-status-refresh`로 언제든 재조회하고, 진행 중에는 중복 요청이 막힌다.
  3. 실패해도 재시도로 복구할 수 있고, 성공 시 갱신 시각(`delivery-status-updated-at`)이 다시 표시된다.
  4. 스크린리더/키보드 사용자도 상태 변경과 조작을 동등하게 인지·수행한다.
- **보존 영역(침범 금지)**: 인증·Jira·GitHub webhook·credential·배포 설정. 본 명세는 이들을 변경하지 않는다.

---

## 2. 컬러 팔레트

frozen design token은 **값 변경 금지**입니다. 배경/텍스트/뉴트럴 계열은 상태 대비를 위한 designer 보조 팔레트이며, token 이름을 재정의하지 않습니다.

| 역할 | 토큰 / 참조명 | HEX | 비고 |
| --- | --- | --- | --- |
| success 강조 | `--color-status-success` (frozen) | `#16a34a` | success 상태 label·테두리·아이콘 |
| error 강조 | `--color-status-error` (frozen) | `#dc2626` | error 상태 label·테두리·아이콘 |
| primary(재조회 control) | 보조 `--color-action` | `#2563eb` | refresh 버튼 기본색 (frozen token 아님, 참고용) |
| background(배지 면) | 보조 `--color-surface` | `#ffffff` | 배지 내부 면 |
| background(loading 진행 pill) | 보조 `--color-surface-muted` | `#f1f5f9` | loading 상태 중립 배경 |
| text(본문) | 보조 `--color-text` | `#0f172a` | label 기본 텍스트 |
| text(보조/timestamp) | 보조 `--color-text-muted` | `#64748b` | 갱신 시각 텍스트 |
| border(중립) | 보조 `--color-border` | `#cbd5e1` | idle 상태 테두리 |

- **접근성 대비**: success `#16a34a`·error `#dc2626`는 `#ffffff` 면 위에서 상태명 텍스트와 함께 사용해 **색상 단독 구분을 금지**한다(§6).

---

## 3. 타이포그래피

vanilla-static stack이므로 외부 폰트 의존 없이 **system font stack**을 사용합니다.

```
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

| 역할 | 대상 | font-size | font-weight | line-height |
| --- | --- | --- | --- | --- |
| 상태명 label | `.delivery-badge__label` | 15px | 600 | 1.3 |
| 갱신 시각 | `.delivery-badge__timestamp` | 13px | 400 | 1.4 |
| 재조회 control | `.delivery-badge__refresh` | 14px | 500 | 1.2 |

- 상태명 label은 **weight 600**으로 강조해 색상 외 위계도 부여한다.
- timestamp는 muted 색 + 작은 크기로 label과 시각적으로 분리한다.

---

## 4. 레이아웃

### 4.1 구조 (DOM selector 계약 그대로 반영)

```
#delivery-status-badge  (.delivery-badge, role=status, aria-live="polite")
├─ .delivery-badge__label            → 상태명 텍스트 (모든 상태에서 노출)
├─ #delivery-status-updated-at (.delivery-badge__timestamp) → 갱신 시각 (success 시 표시)
└─ #delivery-status-refresh (.delivery-badge__refresh)      → 재조회 버튼 (aria-label 필수)
```

- DOM ID 3종(`delivery-status-badge`, `delivery-status-refresh`, `delivery-status-updated-at`)과
  CSS class 4종(`delivery-badge`, `delivery-badge__label`, `delivery-badge__timestamp`, `delivery-badge__refresh`)은 **frozen — 이름 변경 금지**.

### 4.2 spacing

- 배지 내부 요소 간격: **`--space-badge-gap` = `8px`** (frozen token, 값 변경 금지).
- 배지 내부 padding: 상하 `8px`, 좌우 `12px` (보조 값, frozen 아님).

### 4.3 breakpoint 별 동작 (frozen 반응형 규칙 반영)

| viewport | 배치 | 규칙 |
| --- | --- | --- |
| **≥ 480px** | label · timestamp · refresh 가 **가로 1행**, 요소 간 `--space-badge-gap`(8px) | 320px 이상 전 구간에서 **content overflow 없음** |
| **< 480px** | `.delivery-badge__label`과 `.delivery-badge__timestamp`가 **세로 stack**(flex-direction: column), refresh는 하단 full-width 또는 우측 유지 | label→timestamp 순서로 세로 정렬 |
| **≥ 320px 공통** | 긴 label/timestamp는 줄바꿈/stack으로 처리해 **가로 overflow 금지** | AC-5 준수 |

---

## 5. 상태별 시각 명세 & mockup

상태 enum(frozen): **`idle` → `loading` → `success` | `error`**.
**모든 상태는 색상만이 아니라 화면 텍스트(상태명)와 접근성 이름으로 구분**합니다(§6-3).

### 5.0 상태 ↔ 화면 텍스트 매핑 (색상 외 구분의 근거)

| 상태 | `.delivery-badge__label` 화면 텍스트 | 접근성 이름(aria) | 강조색 | timestamp | refresh |
| --- | --- | --- | --- | --- | --- |
| `idle` | `전달 상태 대기 중` | "전달 상태 대기 중" | 중립 border `#cbd5e1` | 비움(또는 마지막 값) | 사용 가능 |
| `loading` | `불러오는 중…` | "전달 상태 불러오는 중" | 중립 muted `#f1f5f9` + 진행 표시 | 비움 | **비활성**(중복 방지) |
| `success` | `갱신 완료` (API `label`="전달 완료" 병기 가능) | "전달 상태 갱신 완료" | `--color-status-success` `#16a34a` | ISO 8601 → 표시 포맷 | 사용 가능 |
| `error` | `갱신 실패` (권한 거부 시 `권한 없음`) | "전달 상태 갱신 실패" | `--color-status-error` `#dc2626` | 마지막 성공값 유지 또는 비움 | **사용 가능(재시도)** |

> 참고: 화면 텍스트는 상태 구분이 목적이며, `loading`의 진행 표시(스피너/pill)와 `success`의 `updatedAt`는 상태 판별을 색상에 의존하지 않게 한다.

---

### 5.1 idle (최초 렌더 / 초기화·취소·실패 복귀)

박스 다이어그램 (≥480px):

```
┌────────────────────────────────────────────────────────┐
│  ○ 전달 상태 대기 중                        [ ⟳ 새로고침 ] │   ← border #cbd5e1 (중립)
└────────────────────────────────────────────────────────┘
   └ .delivery-badge__label            └ .delivery-badge__refresh (활성)
   (#delivery-status-updated-at 비움)
```

- 진입 조건: 최초 렌더, 또는 취소·실패·초기화 복귀.
- refresh 사용 가능. timestamp는 비우거나 마지막 성공값을 잔존 표시.

---

### 5.2 loading (refresh 실행 → 응답 대기)

```
┌────────────────────────────────────────────────────────┐
│  ◐ 불러오는 중…                          [ ⟳ 새로고침 ]✗ │   ← muted #f1f5f9 + 진행 표시
└────────────────────────────────────────────────────────┘
   └ 진행 스피너 + label            └ .delivery-badge__refresh (aria-disabled, 비활성)
```

- refresh는 **비활성**(`disabled` + `aria-disabled="true"`)으로 중복 요청을 방지.
- 진행 표시(스피너/pill)로 로딩을 색상 외 시각 신호로 제공.
- `aria-live="polite"`로 "전달 상태 불러오는 중" 안내.

---

### 5.3 success (HTTP 200 수신)

```
┌────────────────────────────────────────────────────────┐
│  ● 갱신 완료   ·  2026-07-29 12:34            [ ⟳ 새로고침 ] │   ← 강조 #16a34a
└────────────────────────────────────────────────────────┘
   └ label (#16a34a)  └ #delivery-status-updated-at   └ refresh (활성)
```

- 강조색 `--color-status-success` `#16a34a`.
- `#delivery-status-updated-at`에 API `updatedAt`(ISO 8601 `2026-07-29T12:34:56Z`)을 사람이 읽는 포맷으로 표시.
- `updatedAt` 누락/비 ISO 8601 방어: timestamp 표시만 비우고 상태명은 유지(§Edge, 계약상 성공 응답은 항상 ISO 8601 포함).

---

### 5.4 error (5xx/403/네트워크 실패)

```
┌────────────────────────────────────────────────────────┐
│  ▲ 갱신 실패 — 전달 상태를 조회할 수 없습니다   [ ⟳ 다시 시도 ] │   ← 강조 #dc2626
└────────────────────────────────────────────────────────┘
   └ label (#dc2626) + 오류 메시지            └ refresh (활성, 재시도)
```

- 강조색 `--color-status-error` `#dc2626`.
- 오류 메시지 분기(상태는 공통 `error`):
  - 5xx `delivery_status_unavailable` → "전달 상태를 조회할 수 없습니다."
  - 403 `delivery_status_forbidden` → "전달 상태 조회 권한이 없습니다." (label `권한 없음`)
- refresh는 **다시 활성**되어 재시도 가능(후조건 불변식).

---

### 5.5 실패 → 재시도 → 성공 복원 흐름 (AC-2 / AC-6 핵심)

```
[error: 갱신 실패 #dc2626, refresh 활성]
        │  사용자가 [⟳ 다시 시도] 클릭 (keyboard Enter 포함)
        ▼
[loading: 불러오는 중…, refresh 비활성, timestamp 비움]
        │  API 200 수신
        ▼
[success: 갱신 완료 #16a34a, #delivery-status-updated-at 갱신 시각 복원, refresh 재활성]
```

- **복원 불변식**: 실패 후 재시도로 성공하면 → ① 상태명 텍스트가 `갱신 완료`로 복원, ② `delivery-status-updated-at`에 새 갱신 시각 표시 복원, ③ `delivery-status-refresh` control 재활성화.
- **취소/실패 복귀 불변식**: `loading` 중단 또는 `error` 처리 후에는 상태·진행 표시를 결정적으로 정리하고 주 실행 control을 다시 사용 가능하게 한다.

---

## 6. 접근성 (frozen 반영)

1. `#delivery-status-badge`는 `aria-live="polite"`(+ `role="status"`)로 상태 변경을 스크린리더에 안내한다.
2. `#delivery-status-refresh`는 명시적 `aria-label`(예: `"전달 상태 새로고침"`)을 가지며, 키보드 **focus 가능 + Enter/Space로 실행** 가능하다. `loading` 중에는 `aria-disabled="true"`.
3. 모든 상태는 **색상만으로 구분하지 않는다** — 상태명(`불러오는 중`/`갱신 완료`/`갱신 실패`/`대기 중`)을 **화면 텍스트와 접근성 이름 양쪽**에 노출한다(§5.0 매핑).
4. focus ring은 시스템 기본 outline을 제거하지 않거나 `2px` 이상 가시 outline을 유지한다(보조 권고).

---

## 7. 반응형 (frozen 반영)

1. **≥ 320px** 전 구간에서 badge content overflow가 발생하지 않는다(긴 label/timestamp는 줄바꿈·stack 처리).
2. **< 480px**에서 `.delivery-badge__label`과 `.delivery-badge__timestamp`가 **세로로 stack**된다.

< 480px stack 다이어그램:

```
┌──────────────────────────────┐
│ ● 갱신 완료                    │  ← .delivery-badge__label
│ · 2026-07-29 12:34            │  ← .delivery-badge__timestamp (세로 stack)
│ [ ⟳ 새로고침 ]                 │  ← .delivery-badge__refresh
└──────────────────────────────┘
```

---

## 8. 컴포넌트 명세 (props / 상태 / 인터랙션)

developer(BF-1254) 참고용 명세입니다. **selector·token·상태 enum은 그대로 사용**하고, 아래 props 이름은 구현 재량(계약 아님)입니다.

| prop | 타입 | 설명 |
| --- | --- | --- |
| `state` | `'idle' \| 'loading' \| 'success' \| 'error'` | 현재 상태(frozen enum) |
| `label` | `string` | 상태명 화면 텍스트(§5.0 매핑) |
| `updatedAt` | `string \| null` | ISO 8601 갱신 시각, success에서만 표시 |
| `errorCode` | `'delivery_status_unavailable' \| 'delivery_status_forbidden' \| null` | error 메시지 분기 |
| `onRefresh` | `() => void` | refresh control 실행 핸들러 |

**상태·인터랙션 규칙**

- `loading` 진입 시 refresh `disabled` + `aria-disabled="true"`, 그 외 상태에서 활성.
- 상태 전이는 `idle → loading → (success | error)`, error/취소 후 `refresh`로 재진입 가능.
- 상태 변경 시 `#delivery-status-badge`의 `aria-live` 영역 텍스트가 갱신되어 안내됨.

---

## 9. dev 구현 가이드 (BF-1254 handoff)

frozen selector/class/token을 그대로 사용하세요. (파일 소유권: developer)

1. **루트 컨테이너**: `#delivery-status-badge.delivery-badge` — `role="status" aria-live="polite"`.
2. **상태별 강조 색**은 CSS 변수로:
   ```
   :root{
     --color-status-success:#16a34a;  /* frozen, 값 변경 금지 */
     --color-status-error:#dc2626;    /* frozen, 값 변경 금지 */
     --space-badge-gap:8px;           /* frozen, 값 변경 금지 */
   }
   .delivery-badge{display:flex;align-items:center;gap:var(--space-badge-gap);padding:8px 12px}
   .delivery-badge[data-state="success"] .delivery-badge__label{color:var(--color-status-success)}
   .delivery-badge[data-state="error"]   .delivery-badge__label{color:var(--color-status-error)}
   ```
   > 위 CSS는 **문서 내 비런타임 참조 예시**이며, 실제 스타일 파일은 developer가 소유 경로에서 작성합니다.
3. **상태명 텍스트**를 `.delivery-badge__label`에 항상 렌더(색상 외 구분 필수).
4. **timestamp**: `#delivery-status-updated-at.delivery-badge__timestamp`에 `updatedAt`(ISO 8601)을 사람이 읽는 포맷으로. 누락/비 ISO면 표시만 비움.
5. **refresh**: `#delivery-status-refresh.delivery-badge__refresh` — `aria-label` 지정, `loading` 중 `disabled`, 완료 후 재활성. 키보드 Enter/Space 지원.
6. **반응형**: `@media (max-width:479.98px){ .delivery-badge{flex-direction:column;align-items:flex-start} }` 로 label/timestamp stack. 320px 이상 overflow 금지(`min-width:0` + `word-break` 고려).
7. **복원 흐름**(§5.5): error→retry→loading→success에서 상태명/timestamp/refresh 활성 복원을 보장.

---

## 10. mockup 참조

- 본 명세의 상태별 mockup은 **문서 내 §5 박스 다이어그램**으로 제공합니다.
- AC 제약에 따라 **별도 런타임 HTML/CSS/JS 파일을 생성하지 않습니다**(`docs/design/phase21-delivery-status-BF-1252.md` 단일 산출물).
- §9의 CSS/DOM 스니펫은 developer handoff용 **비런타임 참조 예시**이며 실행 파일이 아닙니다.

---

## AC 매핑 요약

| AC | 반영 위치 |
| --- | --- |
| frozen domId/class/token/상태 그대로 반영 | §4.1, §4.2, §5.0, §5.x, §9 |
| 상태별 색상 외 화면 텍스트 구분 | §5.0, §5.1~5.4, §6-3 |
| 실패→재시도→성공(텍스트·갱신시각·refresh 복원) | §5.4, §5.5, §9-7 |
| 320px overflow 없음 / 480px 미만 stack | §4.3, §7 |
| 런타임 HTML/CSS/JS 미생성, 단일 md 범위 | 문서 헤더, §10 |
