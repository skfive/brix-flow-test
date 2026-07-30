# 전달 상태 보드 v3 시각 명세 / Delivery Status Board v3 — Design Spec

- Task: BF-1285 · 전달 상태 보드 시각 산출물 구현
- 소비 계약(frozen): `ui-contract@v1` sha256:359cf76cb46a9aceae7bfae3e90457f40ca75e44613156251442d4f0d92db6eb
- 실행 설계(frozen): `planning-contract@v1` sha256:5a7ad7faf67307fedc12d8871504fe218ee58cfffac7b681ed1f05e654c6fbc0
- Stack: vanilla-static (외부 의존성 0건 · system font · CSS 변수 자체 정의)
- mockup 참조: `docs/design/mockups/phase21-delivery-board-v3.html`

> ⚠️ 본 명세는 동결된 UiScreenContract를 **재정의 없이 그대로 시각화**한다.
> selector·상태 모델·design token은 planner가 동결한 값이 유일 권위이며 본 문서에서 변경하지 않는다.
> 실제 런타임 구현(`demo/phase21-delivery-board-v3/*`)은 developer 소유이며 본 문서는 시안 명세·mockup까지만 다룬다.

---

## 1. 시안 개요

### 변경 범위
- 운영자가 각 역할(role)의 전달 상태를 한 화면에서 확인·새로고침하는 **전달 상태 보드** 시안.
- 5개 화면 상태(`idle` → `loading` → `loaded` | `empty` | `error`)를 단일 보드 컴포넌트로 표현.
- 역할별 항목은 verified/pending/failed 배지와 함께 목록으로 노출, 현재 revision 값을 별도 영역에 표시.

### 사용자 경험 목표
- 운영자가 색맹·스크린리더 환경에서도 상태를 **색상 외 화면 텍스트 라벨**로 즉시 구분.
- 새로고침 control(`board-refresh`)이 모든 상태에서 키보드·마우스로 언제든 재실행 가능(초기화·실패 후 재활성화).
- 320px(모바일 세로 스택)~768px(다열 grid) 범위에서 overflow 없이 자연스럽게 재배치.

---

## 2. 컬러 팔레트

동결 design token(변경 금지)을 상태 배지 색으로 사용한다. 나머지 중립색은 vanilla-static 규약에 따라 자체 정의한다.

### 2.1 동결 토큰 (frozen — 변경 금지)
| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-status-verified` | `#16a34a` | 역할 배지: 검증됨(verified) |
| `--color-status-pending` | `#f59e0b` | 역할 배지: 대기 중(pending) |
| `--color-status-failed` | `#dc2626` | 역할 배지: 실패(failed) / `error` 상태 강조 |
| `--space-board-gap` | `16px` | 보드/목록 항목 간 간격 |
| `--font-board-label` | `14px` | 상태·라벨 텍스트 기본 크기 |

### 2.2 자체 정의 중립색 (vanilla-static — mockup에서 `:root`에 정의)
| 이름 | HEX | 용도 |
| --- | --- | --- |
| primary (텍스트) | `#111827` | 본문·제목 텍스트 |
| secondary (보조 텍스트) | `#6b7280` | 캡션·메타 텍스트 |
| background | `#f9fafb` | 페이지 배경 |
| surface | `#ffffff` | 보드/카드 표면 |
| border | `#e5e7eb` | 구분선·테두리 |
| accent (control) | `#2563eb` | `board-refresh` 버튼 |

> 대비: verified/pending/failed 배지는 흰 텍스트 대신 **짙은 텍스트 + 옅은 배경 tint** 조합으로 WCAG AA 대비를 확보하고, 배지 좌측에 상태명 텍스트를 함께 노출해 색상 단독 의존을 제거한다.

---

## 3. 타이포그래피

외부 폰트 CDN을 쓰지 않고 system font stack만 사용한다(file:// 직접 렌더·의존성 0건 보장).

```
font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
```

| 스타일 | font-size | weight | line-height | 용도 |
| --- | --- | --- | --- | --- |
| heading (보드 제목) | 18px | 600 | 1.4 | 보드 헤더 타이틀 |
| body / label | `--font-board-label`(14px) | 400 | 1.5 | 역할명·상태 텍스트·본문 |
| label-strong | 14px | 600 | 1.5 | 배지 상태명·상태 알림 텍스트 |
| caption | 12px | 400 | 1.4 | revision 표시·보조 메타 |

---

## 4. 레이아웃

### 섹션 구조
```
#delivery-board-root .delivery-board
├─ header  ── 보드 제목 + #board-refresh (.delivery-board__refresh)
├─ #board-status (.delivery-board__status)   ← role="status" aria-live="polite"
├─ #board-role-list (.delivery-board__role-list)
│    └─ .delivery-board__role  (× N)
│         ├─ 역할명 (텍스트)
│         └─ .delivery-board__badge (상태명 텍스트 + 색)
└─ #board-revision   ← "revision: <값>" (caption)
```

### spacing
- 보드 외곽 padding: 24px, 내부 요소 세로 간격: `--space-board-gap`(16px).
- `board-role-list` 항목 간 gap: `--space-board-gap`(16px).
- 배지와 역할명 사이 gap: 8px.

### breakpoint 별 동작 (frozen responsive 불변식)
| breakpoint | `board-role-list` 동작 |
| --- | --- |
| ≥ 320px | **세로 스택**(1열, `flex-direction: column`), content overflow 없음. 긴 역할명은 `word-break`로 줄바꿈. |
| ≥ 768px | **다열 grid**(`display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`). |

---

## 5. 컴포넌트 명세

### 5.1 DeliveryBoard (루트) — `#delivery-board-root .delivery-board`
- **상태(state) props**: `idle | loading | loaded | empty | error` (frozen, 추가 금지).
- 상태별 화면 텍스트 라벨(색상 외 필수 노출):

  | state | 화면 텍스트 라벨 | 표시 내용 |
  | --- | --- | --- |
  | `idle` | **대기** | 초기 진입, `board-refresh` 활성, 목록 비어 있음 |
  | `loading` | **로딩 중** | 진행 표시(spinner/progress) 노출, 조회 진행 |
  | `loaded` | **불러옴** | `board-role-list`에 역할 항목 + 배지 렌더 |
  | `empty` | **데이터 없음** | 목록 0개, 빈 상태 안내 텍스트 |
  | `error` | **오류** | 실패 안내 + 상태명 텍스트/접근성 이름, `board-refresh`로 재시도 |

### 5.2 RefreshControl — `#board-refresh .delivery-board__refresh`
- element: `<button type="button">`.
- **props/상태**: `disabled`(loading 중 진행 표시와 함께 비활성 표현 가능하나, 실패·완료 후 반드시 재활성화).
- **인터랙션**: click / Enter / Space → `loading` 재전이 후 재조회.
- **접근성**: `aria-label="전달 상태 새로고침"`, Tab 순서에 포함, `:focus-visible` 링 노출.

### 5.3 StatusRegion — `#board-status .delivery-board__status`
- **역할**: 현재 보드 상태의 화면 텍스트 라벨을 표시하는 알림 영역.
- **접근성**: `role="status"`, `aria-live="polite"` — 상태 전이를 스크린리더에 polite 알림.
- 텍스트는 §5.1 라벨(대기/로딩 중/불러옴/데이터 없음/오류)을 그대로 노출.

### 5.4 RoleList / RoleItem — `#board-role-list .delivery-board__role-list` / `.delivery-board__role`
- **RoleItem props**: `roleName`(문자열), `deliveryStatus`(`verified | pending | failed`).
- **구성**: 역할명 텍스트 + `.delivery-board__badge`.
- `loaded`에서만 1개 이상 렌더, `empty`에서는 목록 대신 빈 상태 텍스트.

### 5.5 StatusBadge — `.delivery-board__badge`
- **props**: `status`(`verified | pending | failed`).
- 색상 + **상태명 텍스트**를 함께 노출(색상 단독 의존 금지):

  | status | 텍스트 라벨 | 색 토큰 |
  | --- | --- | --- |
  | `verified` | 검증됨 | `--color-status-verified` |
  | `pending` | 대기 중 | `--color-status-pending` |
  | `failed` | 실패 | `--color-status-failed` |

### 5.6 RevisionDisplay — `#board-revision`
- 현재 revision 값을 `revision: <값>` 형식 caption으로 노출.

### hover / focus / active 상태 (정적 표현)
- `board-refresh:hover` → 배경 명도 하강, `:active` → 살짝 눌림, `:focus-visible` → accent 2px outline.
- mockup의 별도 "상태별 미리보기" 섹션에서 5개 board 상태를 나란히 정적으로 렌더.

---

## 6. dev 구현 가이드 (developer 참조용 — 픽셀 일치 의무 없음)

> 아래 selector·token·라벨은 frozen 계약값이다. developer는 `demo/phase21-delivery-board-v3/{index.html,main.js,styles.css}`에서 그대로 구현한다.

1. **CSS 변수 정의**: `styles.css`의 `:root`에 동결 토큰 5개를 이름·값 그대로 선언.
   ```css
   :root {
     --color-status-verified: #16a34a;
     --color-status-pending: #f59e0b;
     --color-status-failed: #dc2626;
     --space-board-gap: 16px;
     --font-board-label: 14px;
   }
   ```
2. **DOM 골격**(id·class 고정): `#delivery-board-root` > `.delivery-board` > (header + `#board-refresh.delivery-board__refresh`) + `#board-status.delivery-board__status` + `#board-role-list` + `#board-revision`.
3. **상태 표현 권장**: 루트에 `data-state="idle|loading|loaded|empty|error"` 속성으로 CSS 분기(신규 상태 추가 금지).
4. **상태 텍스트 라벨**(색상 외 필수): `#board-status`에 대기/로딩 중/불러옴/데이터 없음/오류 텍스트를 상태별로 갱신.
5. **역할 항목**: `.delivery-board__role` 안에 역할명 + `.delivery-board__badge`(status별 텍스트 라벨 검증됨/대기 중/실패 + 색).
6. **접근성**: `#board-refresh`에 `aria-label="전달 상태 새로고침"`, `#board-status`에 `role="status" aria-live="polite"`. 키보드 Tab→Enter/Space 실행 보장.
7. **반응형**: `#board-role-list` 기본 세로 스택(320px overflow 없음), `@media (min-width: 768px)`에서 `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`.
8. **초기화·재활성화**: 실패·취소·초기화 후 `#board-refresh` 재활성화 + 진행 표시 제거(REQ-2 / frozen invariant 4).

권장 클래스(계약 외 보조, developer 재량): `.delivery-board__role-list`, `.delivery-board__spinner`, `.delivery-board__empty`, `.delivery-board__revision`. — 계약 고정 selector와 충돌하지 않는 선에서만 추가.

---

## 7. mockup 참조

- 파일: `docs/design/mockups/phase21-delivery-board-v3.html`
- 단일 self-contained HTML, 외부 의존성 0건, `file://`에서 직접 렌더 가능.
- 5개 board 상태(idle/loading/loaded/empty/error)를 정적 섹션으로 나란히 시각화하고, verified/pending/failed 배지·revision 표시·반응형 안내를 포함한다.
- 본 mockup은 시안 시각화 전용이며 dev의 실제 런타임 산출물이 아니다(픽셀 일치 의무 없음).

---

## 8. 추적성 (Traceability)

| 계약 항목 | 반영 위치 |
| --- | --- |
| frozen selectors (5 DOM id) | §4 레이아웃, §5 컴포넌트, §6 가이드, mockup |
| frozen css classes (5) | §4, §5, mockup |
| states (idle/loading/loaded/empty/error) | §5.1, mockup 상태별 미리보기 |
| 상태 텍스트 라벨(대기/로딩 중/불러옴/데이터 없음/오류) | §5.1, §5.3, §6-4 |
| design tokens (5) | §2.1, §6-1, mockup `:root` |
| accessibility (aria-label / role=status,aria-live / 키보드 / 색상 외 라벨) | §5.2·5.3, §6-6 |
| responsive (320px 스택 / 768px grid) | §4, §6-7, mockup |
| REQ-2 초기화·재활성화 | §5.2, §6-8 |
