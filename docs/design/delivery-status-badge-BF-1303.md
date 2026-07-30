# 전달 상태 배지 — 시각 명세 (BF-1304 / ui-contract BF-1303)

> 본 문서는 planner가 동결한 `ui-contract@v1`(참조: `docs/plans/implementation-plan.md` 3장)의
> **시각 스타일 렌더링본**입니다.
> selector·상태 텍스트·design token 값은 frozen 계약이 **유일 권위**이며, 본 문서는 이를
> **재정의하지 않고 그대로 시각화**합니다. (파일 정책: `additive`)
>
> - Task: BF-1304 (designer)
> - 형제 Task: BF-1306(planner) · BF-1305(developer) · BF-1308(tester)
> - 대상 저장소: backend (vanilla-static / esm / serve_root=`.`)
> - 관련 런타임 파일(**developer 소유 — 본 designer 산출물은 구현하지 않음**):
>   `apps/delivery-status-badge/index.html`, `apps/delivery-status-badge/src/badge.js`

---

## 1. 시안 개요

### 변경 범위
전달(delivery) 요청 이후의 처리 상태를 **텍스트 라벨 + 접근성 이름**으로 노출하고, 명시적
새로고침 control을 제공하는 **전달 상태 배지** 단일 컴포넌트의 시각 명세.

### 사용자 경험 목표
- 전달 상태(대기/조회 중/완료/실패)를 **한눈에** 식별한다.
- 색상만이 아니라 **화면 텍스트**로 상태를 노출해 색각 이상·스크린리더 사용자도 동일하게 인지한다.
- 명시적 새로고침 control로 최신 상태를 재조회한다.
- 320px 좁은 뷰포트에서도 overflow 없이 온전히 표시된다.

### frozen 계약 준수 선언
아래 selector / 상태 텍스트 / token 은 planner frozen 계약값 그대로이며 designer가 변경하지 않았다.

| 항목 | frozen 값 (변경 금지) |
| --- | --- |
| DOM ID | `delivery-badge-root`, `delivery-badge-status`, `delivery-badge-refresh` |
| CSS class | `delivery-badge`, `delivery-badge__status`, `delivery-badge__refresh` |
| 상태 텍스트 | `대기 중` / `조회 중…` / `전달 완료` / `전달 실패` |
| design token | `--color-status-delivered=#16a34a`, `--color-status-failed=#dc2626`, `--space-badge-gap=8px` |
| 접근성 | status `aria-live="polite"`, refresh `aria-label="상태 새로고침"`, 색상 비의존 |
| 반응형 | 320px 이상 overflow 없음 |

---

## 2. 컬러 팔레트

### 2.1 frozen 상태 강조색 (계약 token — 변경 금지)

| token | HEX | 용도 | 대비(흰 배경 텍스트 기준) |
| --- | --- | --- | --- |
| `--color-status-delivered` | `#16a34a` | `delivered`(전달 완료) 강조 | AA 충족 (흰 텍스트 대비 3.4:1 이상, 24px 이상 라벨) |
| `--color-status-failed` | `#dc2626` | `failed`(전달 실패) 강조 | AA 충족 (흰 텍스트 대비 4.5:1 이상) |

### 2.2 보조 색상 (designer 제안 — **frozen 아님, 계약 token 미침범**)

frozen 계약은 `idle` / `loading` 강조색을 규정하지 않는다. 아래는 designer가 제안하는 **중립 보조색**이며
frozen token 이름을 사용하지 않는다. developer는 아래 값 대신 자체 중립색을 써도 계약 위반이 아니다.

| 제안 변수(비-frozen) | HEX | 용도 |
| --- | --- | --- |
| `--color-status-idle` | `#6b7280` | `idle`(대기 중) 중립 강조 |
| `--color-status-loading` | `#2563eb` | `loading`(조회 중…) 진행 강조 |
| `--color-badge-bg` | `#ffffff` | 배지 배경 |
| `--color-badge-border` | `#e5e7eb` | 배지 외곽선 |
| `--color-badge-text` | `#111827` | 기본 텍스트 |

> 색상은 상태 텍스트를 **보조**할 뿐이다. 색상을 제거해도 상태명이 화면 텍스트로 유지되어 식별 가능해야 한다(E-4).

---

## 3. 타이포그래피

vanilla-static 규약: 외부 폰트 의존 없이 **system font stack** 사용.

| 역할 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| 상태 라벨 (`delivery-badge__status`) | system-ui, -apple-system, "Segoe UI", Roboto, sans-serif | 15px | 600 | 1.4 |
| 새로고침 control (`delivery-badge__refresh`) | 위와 동일 | 14px | 500 | 1.2 |
| 상태 점(dot) 보조 아이콘 | — (CSS 원형, 텍스트 아님) | 8px 지름 | — | — |

> 상태 점(dot)은 **장식 보조**이며 상태 식별을 담당하지 않는다. 상태 식별의 유일 근거는 화면 텍스트다.

---

## 4. 레이아웃

### 4.1 섹션 구조
```
delivery-badge-root  (컨테이너)
└─ .delivery-badge   (가로 배치 배지 블록: inline-flex, align-items:center)
   ├─ [상태 점 dot]                 ← 장식(비필수)
   ├─ #delivery-badge-status .delivery-badge__status   ← 상태 텍스트 (aria-live=polite)
   └─ #delivery-badge-refresh .delivery-badge__refresh  ← 새로고침 control (aria-label)
```

### 4.2 Spacing
- 상태 텍스트 ↔ 새로고침 control 간격: **`--space-badge-gap` (8px)** — frozen token 사용.
- 배지 내부 패딩(designer 제안): 세로 6px / 가로 12px.
- 상태 점 ↔ 상태 텍스트 간격: 6px.

### 4.3 Breakpoint 별 동작
| 뷰포트 | 동작 |
| --- | --- |
| ≥ 480px | 배지 한 줄 가로 배치, 여유 패딩 |
| 320px ~ 479px | 한 줄 유지, 텍스트 `white-space:nowrap` + 배지 폭 `max-width:100%`, **overflow 없음** (US-5 / E-5) |
| < 320px | 계약 대상 아님(320px가 하한). 다만 `flex-wrap` 허용으로 붕괴 방지 권장 |

> **필수**: 320px 이상에서 content overflow 0건. 라벨이 가장 긴 `전달 완료`/`전달 실패`(각 5자) + control 이
> 320px 폭에 여유롭게 들어가므로, 배지 컨테이너에 `max-width:100%`와 `box-sizing:border-box`만 지키면 충족.

---

## 5. 컴포넌트 명세

### 5.1 DeliveryStatusBadge (root)

| 항목 | 값 |
| --- | --- |
| DOM ID | `delivery-badge-root` |
| 역할 | 배지 상태 컨테이너, 현재 state를 하위에 반영 |
| state prop | `idle` \| `loading` \| `delivered` \| `failed` (기본값 `idle`) |
| 미지 값 처리 | 계약 4개 외 값은 렌더하지 않고 `idle` 유지 (E-6) |

**상태별 시각 매핑 (frozen 텍스트 + 강조색):**

| state | 화면 텍스트(frozen) | 강조색 | 상태 점 색 | 진입 조건 |
| --- | --- | --- | --- | --- |
| `idle` | `대기 중` | `--color-status-idle`(#6b7280, 비-frozen) | 회색 | 초기 렌더 / 취소·초기화 후 (E-2/E-3) |
| `loading` | `조회 중…` | `--color-status-loading`(#2563eb, 비-frozen) | 파랑(선택적 펄스) | 새로고침 실행 시 |
| `delivered` | `전달 완료` | **`--color-status-delivered`(#16a34a, frozen)** | 초록 | 조회 성공 응답 (US-2) |
| `failed` | `전달 실패` | **`--color-status-failed`(#dc2626, frozen)** | 빨강 | 조회 실패 응답 (US-3 / E-1) |

### 5.2 StatusText

| 항목 | 값 |
| --- | --- |
| DOM ID | `delivery-badge-status` |
| class | `delivery-badge__status` |
| 접근성 | **`aria-live="polite"`** (상태 전이를 스크린리더에 폴라이트 알림) |
| 텍스트 | 항상 5.1 표의 화면 텍스트와 **정확히 일치** |
| 상태 | 정적 텍스트 노출(입력 없음) |

### 5.3 RefreshControl

| 항목 | 값 |
| --- | --- |
| DOM ID | `delivery-badge-refresh` |
| class | `delivery-badge__refresh` |
| 마크업 | `<button type="button">` (시맨틱 버튼) |
| 접근성 | **`aria-label="상태 새로고침"`** (명시) |
| 인터랙션 | 실행 시 `loading` 진입 → 성공 `delivered` / 실패 `failed` |
| 상태(states) | default / `:hover`(배경 톤 다운) / `:focus-visible`(2px outline) / `:active` / `:disabled`(loading 중 선택적) |
| 후조건 | 취소·초기화·실패 후 항상 **재사용 가능**해야 함 (E-2/E-3, §3.8) |

### 5.4 인터랙션 흐름 (상태 전이)
```
idle ──(refresh 실행)──▶ loading ──(성공)──▶ delivered
                            │
                            ├──(실패)──▶ failed ──(refresh 재실행)──▶ loading …
                            │
                            └──(취소/초기화)──▶ idle   ← 진행 표시 정리 + control 재사용 가능
delivered / failed ──(refresh 재실행)──▶ loading
```
> 초기화·취소·실패 후에는 상태·진행 표시를 **초기값(`idle`/`대기 중`)** 으로 되돌리고 control을 다시 쓸 수 있어야 한다(§3.8).

---

## 6. dev 구현 가이드 (developer BF-1305 참조용)

> developer는 `apps/delivery-status-badge/index.html` + `src/badge.js`를 구현한다.
> 아래 CSS 변수명/클래스명은 **권장**이며, frozen selector·token·상태 텍스트는 **필수 준수**다.

1. **token 정의** — `index.html`의 `<style> :root`(또는 `.delivery-badge`)에 frozen token을 그대로 선언:
   ```css
   :root{
     --color-status-delivered:#16a34a;  /* frozen */
     --color-status-failed:#dc2626;     /* frozen */
     --space-badge-gap:8px;             /* frozen */
   }
   ```
   idle/loading 보조색은 §2.2 제안값 또는 자체 중립색 사용(비-frozen).

2. **DOM 구조** — §4.1 구조로 `delivery-badge-root > .delivery-badge > [dot] + #delivery-badge-status + #delivery-badge-refresh` 구성.
   - status element: `id="delivery-badge-status" class="delivery-badge__status" aria-live="polite"`, 초기 텍스트 `대기 중`.
   - refresh element: `<button type="button" id="delivery-badge-refresh" class="delivery-badge__refresh" aria-label="상태 새로고침">`.

3. **상태 텍스트 매핑** — `badge.js`(ESM)에서 state→label 매핑을 §5.1 표 그대로:
   `{ idle:'대기 중', loading:'조회 중…', delivered:'전달 완료', failed:'전달 실패' }`.
   계약 외 state 값이 들어오면 렌더하지 말고 `idle` 유지(E-6).

4. **강조색 적용** — state에 따라 `.delivery-badge`(또는 status)에 상태 class/데이터 속성을 붙여
   `delivered`→`--color-status-delivered`, `failed`→`--color-status-failed` 적용. 색상은 텍스트의 보조.

5. **간격** — status ↔ refresh 간격은 `gap: var(--space-badge-gap)` 로.

6. **접근성** — status의 `aria-live="polite"` 유지, refresh의 `aria-label="상태 새로고침"` 유지.
   색상 제거 시에도 상태 텍스트로 식별 가능한지 확인(E-4).

7. **반응형** — `.delivery-badge`에 `max-width:100%; box-sizing:border-box`. 320px에서 overflow 0건 확인(US-5/E-5).

8. **후조건** — 취소/초기화/실패 후 `idle`/`대기 중` 복귀 + refresh 재사용 가능(§3.8, E-2/E-3).

---

## 7. mockup 참조

시각 시뮬레이션(4개 상태 + 인터랙션 상태 + 320px 반응형)은 함께 작성한 self-contained mockup HTML 참조:

- **mockup 파일**: `docs/design/mockups/delivery-status-badge-BF-1303.html`

> mockup은 시안 시각화 전용이며 developer의 실제 산출물이 아니다. developer는 픽셀 단위 일치 의무 없이
> frozen 계약값(selector/텍스트/token/접근성/반응형)만 준수하면 된다.

---

## 8. Self-critique (PR commit 직전 자기 점검)

| # | 체크 항목 | 결과 |
| --- | --- | --- |
| 1 | **AC 매핑** | AC1(선택자/텍스트/token/접근성/반응형 일치)=§1.3표·§2~§5; AC2(4개 상태 화면 텍스트 mockup 표현)=§7 mockup + §5.1; AC3(런타임 HTML/CSS/JS 미생성)=본 산출물은 명세 md + 시각 mockup만, 앱 런타임 파일(index.html/badge.js) 미작성 ✅ |
| 2 | **dev 구현 가이드** | §6에 token 선언·DOM 구조·state 매핑·접근성·반응형·후조건 단계별 명시 ✅ |
| 3 | **기존 요소 보존** | 신규 파일만 추가(additive), 기존 `docs/design/**` 파일·developer 소유 런타임 파일 미변경 ✅ |
| 4 | **컴포넌트 매핑** | root/StatusText/RefreshControl 3개 → frozen DOM ID·class·상태 1:1 매핑(§5) ✅ |
| 5 | **모호함 flag** | idle/loading 강조색은 frozen 미규정 → §2.2에서 "비-frozen 제안"으로 명시 표기, developer 재정의 허용 명시. 그 외 계약값은 전부 frozen 그대로 ⚠️→해소 |
