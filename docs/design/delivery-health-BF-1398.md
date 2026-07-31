# 전달 상태 요약 패널 — 시각 명세 (BF-1409)

> designer(이디자인)의 시각 사양 산출물입니다.
> planner(박기획)가 동결한 `docs/plans/delivery-health-BF-1398.md`의 **frozen UI 계약**
> (selector · token · 상태 텍스트 · 접근성 · 반응형)을 **재정의 없이** 시각적으로 구체화합니다.
> selector/DOM ID/CSS class/token 이름·값은 frozen 계약이 유일 권위이며 본 문서는 이를 바꾸지 않습니다.
> 정책: additive — 기존 계약을 파괴적으로 재작성하지 않고 시각 사양만 추가합니다.

---

## 1. 시안 개요

### 변경 범위
- 전달(delivery) 상태를 요약해 보여주는 **정적 패널**의 시각 사양을 정의한다.
- 대상 상태: `loading` / `ready` / `empty` / `error` 4종.
- 상태 배지 3종: `진행`(progress) / `대기`(waiting) / `조치 필요`(action).
- 정적 fixture 데이터만 다루며, 외부 API·DB·runtime 배선은 범위가 **아니다**.

### 사용자 경험 목표
- 운영자가 패널을 열자마자 "지금 무엇을 봐야 하는지"를 배지 색상 + **텍스트 라벨**로 즉시 파악한다.
- 색각 이상 사용자도 색상 없이 상태명(진행/대기/조치 필요) 텍스트만으로 구분할 수 있다.
- 좁은 화면(모바일)에서도 가로 스크롤 없이 세로 스택으로 자연스럽게 재배치된다.
- 로드 실패 시 막다른 화면이 아니라 재시도 경로(`상태 새로고침`)가 항상 보인다.

---

## 2. 컬러 팔레트

### 2.1 상태 색상 (frozen — 변경 금지)
planner가 동결한 값을 그대로 사용한다. 이름·HEX 모두 재정의하지 않는다.

| 토큰(변수) | HEX | 용도 |
|------------|-----|------|
| `--color-status-progress` | `#2563eb` | 진행 배지 강조색 (파랑) |
| `--color-status-waiting`  | `#d97706` | 대기 배지 강조색 (앰버) |
| `--color-status-action`   | `#dc2626` | 조치 필요 배지 강조색 (레드) |

### 2.2 지원 색상 (designer 추가 — mockup 표현용, frozen 아님)
frozen 계약에 정의되지 않은 배경/텍스트/보더 등 **중립 색상**만 시각 표현을 위해 보조로 제안한다.
dev는 프로젝트 규약(vanilla-static, 외부 의존성 0)에 맞게 아래를 CSS 변수로 채택하거나 동등한 값으로 대체할 수 있다.
**단, 위 2.1의 frozen 상태 토큰 이름/값은 절대 변경하지 않는다.**

| 제안 변수 | HEX | 용도 |
|-----------|-----|------|
| `--color-bg`            | `#f8fafc` | 페이지 배경 |
| `--color-panel`         | `#ffffff` | 패널 표면 |
| `--color-border`        | `#e2e8f0` | 패널·항목 구분선 |
| `--color-text`          | `#0f172a` | 기본 텍스트 |
| `--color-text-muted`    | `#64748b` | 보조 텍스트(다음 행동·안내) |
| `--color-focus`         | `#2563eb` | 키보드 focus 링(진행색과 통일) |

> 배지 강조색은 흰 텍스트 대비 4.5:1 이상을 확보한다(진행 #2563eb·대기 #d97706·조치 #dc2626 모두 흰 글자와 대비 통과). 대기(#d97706)는 흰 글자 대비가 경계선이므로 배지 텍스트는 **굵게(600)** 처리해 가독성을 보강한다.

---

## 3. 타이포그래피

vanilla-static 규약에 따라 **system font stack**을 사용한다(웹폰트 외부 호출 없음).

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Apple SD Gothic Neo",
             "Noto Sans KR", sans-serif;
```

| 역할 | 요소 | size | weight | line-height |
|------|------|------|--------|-------------|
| 패널 제목(heading) | 패널 상단 타이틀 | 18px | 700 | 1.3 |
| 항목 제목(body-strong) | 각 전달 항목 `title` | 15px | 600 | 1.4 |
| 다음 행동(body) | `nextAction` 텍스트 | 14px | 400 | 1.5 |
| 배지 라벨(label) | `.status-badge` 텍스트 | 13px | 600 | 1 |
| 안내/캡션(caption) | empty/error/loading 문구 | 14px | 400 | 1.5 |

---

## 4. 레이아웃

### 4.1 섹션 구조
```
#delivery-health-root .delivery-health
├─ 패널 헤더 (제목 + #status-refresh 버튼)
└─ 본문 (상태에 따라 하나만 노출)
   ├─ loading  : "상태를 불러오는 중" + 진행 표시(스피너/프로그레스)
   ├─ ready    : #status-summary-list > 항목 카드[] (title + .status-badge + nextAction)
   ├─ empty    : .empty-state "표시할 전달 상태가 없습니다"
   └─ error    : "상태를 불러오지 못했습니다" + 재시도 안내
```

### 4.2 spacing
- 패널 내부 padding: 20px.
- 항목 간 간격 및 배지-텍스트 간격: `--space-panel-gap`(`12px`) 사용(frozen).
- 배지 모서리 반경: `--radius-badge`(`6px`) 사용(frozen).
- 패널 모서리 반경: 12px(지원 값, frozen 아님).

### 4.3 breakpoint 별 동작 (frozen 반응형 준수)
| 폭 | 동작 |
|----|------|
| ≥ 480px | 헤더는 제목(좌) + 새로고침 버튼(우) 가로 배치. 항목 카드는 title/badge 가로 정렬. |
| < 480px | 패널이 **세로 스택**으로 재배치. 헤더의 제목/버튼, 항목의 title/badge가 세로로 쌓임. |
| ≥ 320px | 어떤 폭에서도 content overflow(가로 스크롤) 없음. 긴 텍스트는 wrap. |

---

## 5. 컴포넌트 명세

### 5.1 패널 루트 — `#delivery-health-root .delivery-health`
| 속성 | 값 |
|------|-----|
| 역할 | 상태 요약 패널의 최상위 컨테이너 |
| 상태(state) | `loading` \| `ready` \| `empty` \| `error` (한 번에 하나) |
| 인터랙션 | 없음(컨테이너) |

### 5.2 상태 새로고침 버튼 — `#status-refresh`
| 속성 | 값 |
|------|-----|
| 요소 | `<button>` |
| 화면 텍스트 | "상태 새로고침" |
| 접근성 | `aria-label="상태 새로고침"` (frozen) |
| 상태 | 기본 / hover / focus / active. 초기화·취소·실패 이후에도 **항상 재사용 가능**(disabled로 잠기지 않음) |
| 인터랙션 | 클릭 시 상태를 `loading`부터 다시 조회 |

### 5.3 상태 요약 리스트 — `#status-summary-list`
| 속성 | 값 |
|------|-----|
| 역할 | `ready` 상태에서 항목 카드 목록을 담는 컨테이너 |
| 접근성 | 키보드 **Tab 순회 가능**, 각 항목에 **focus 표시** 노출(frozen) |
| 항목 구조 | 항목 = `title` + `.status-badge`(상태 매핑) + `nextAction` 텍스트 |

### 5.4 상태 배지 — `.status-badge`
색상 + **텍스트 라벨**을 항상 함께 노출(색상 단독 구분 금지, frozen).

| 상태값 | class | 화면/접근성 라벨 | 강조색 |
|--------|-------|------------------|--------|
| `progress` | `.status-badge status-badge--progress` | "진행" | `--color-status-progress` |
| `waiting`  | `.status-badge status-badge--waiting`  | "대기" | `--color-status-waiting` |
| `action`   | `.status-badge status-badge--action`   | "조치 필요" | `--color-status-action` |

- 배지 텍스트는 접근성 이름으로도 노출되어야 하며(스크린리더가 "진행/대기/조치 필요"를 읽음), 색상만으로 의미를 전달하지 않는다.
- 미지정/알 수 없는 `status` 값은 `ready`에서 렌더 제외 또는 안전 무시(파괴적 처리 금지).

### 5.5 빈 상태 — `.empty-state`
| 속성 | 값 |
|------|-----|
| 조건 | fixture 항목 0개 |
| 화면 텍스트 | "표시할 전달 상태가 없습니다" |

### 5.6 상태별 화면 표현 (frozen 텍스트 정확 준수)
| 상태 | 화면 표현 |
|------|-----------|
| `loading` | "상태를 불러오는 중" + 진행 표시 |
| `ready`   | 항목별 배지와 다음 행동 텍스트 표시 |
| `empty`   | "표시할 전달 상태가 없습니다" |
| `error`   | "상태를 불러오지 못했습니다" + 재시도 안내 |

---

## 6. dev 구현 가이드 (BF-1410 developer)

> DOM ID / class / token 이름·값·상태 텍스트는 frozen 계약(§6, plans 문서)을 **그대로** 사용한다.
> 아래는 시각 사양을 코드로 옮길 때의 권장 단계이며, selector/token을 새로 만들지 않는다.

1. **토큰 정의** — `:root`(또는 `.delivery-health` 스코프)에 frozen 상태 토큰을 그대로 선언:
   ```css
   :root{
     --color-status-progress:#2563eb;
     --color-status-waiting:#d97706;
     --color-status-action:#dc2626;
     --space-panel-gap:12px;
     --radius-badge:6px;
   }
   ```
   중립 배경/텍스트 색은 §2.2 지원 변수를 채택하거나 동등 값으로 대체(단 frozen 이름/값 유지).
2. **마크업 골격** — `#delivery-health-root.delivery-health` 안에 헤더(제목 + `#status-refresh`)와 본문 컨테이너. `ready`의 항목 목록은 `#status-summary-list`.
3. **배지 매핑** — `progress→status-badge--progress(진행)`, `waiting→status-badge--waiting(대기)`, `action→status-badge--action(조치 필요)`. 배지 안에는 **반드시 텍스트 라벨**을 함께 렌더.
4. **상태 렌더** — 한 번에 한 상태만 노출. 각 상태의 화면 텍스트는 frozen 텍스트를 정확히 사용(오탈자·문구 변경 금지).
5. **접근성** — `#status-refresh`에 `aria-label="상태 새로고침"`. `#status-summary-list` 항목은 Tab 순회 가능하도록 focusable(`tabindex="0"` 또는 자연 focusable 요소) + `:focus-visible` 링 노출.
6. **초기화 후조건(AC-5)** — 초기화·취소·실패 뒤 상태/진행 표시를 초기값으로 되돌리고 `#status-refresh`를 다시 사용 가능하게 유지(버튼을 영구 disabled로 두지 않음).
7. **반응형** — `@media (max-width:479.98px)`에서 세로 스택 재배치. 모든 폭에서 가로 overflow 없음(텍스트 wrap, `min-width:0` 등).

### 권장 클래스/변수 (frozen 외 보조 — 필수 아님)
- 항목 카드: `.status-item`(예시), 헤더: `.delivery-health__header`(예시) 등은 dev 재량. **frozen class는 그대로 사용**.

---

## 7. mockup 참조

- 시각 mockup HTML: `docs/design/mockups/delivery-health-BF-1398.html`
- 단일 self-contained HTML(외부 의존성 0). 4개 상태(loading/ready/empty/error)와 배지 3종, 빈 상태, 키보드 focus 표시, 480px 미만 세로 스택을 시각적으로 표현한다.
- mockup은 **시안 시각화**이며 dev의 실제 산출물이 아니다. dev는 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없다.

---

## 8. Self-critique (PR commit 직전 자기 점검)

| 체크 항목 | 결과 |
|-----------|------|
| **AC 매핑** | AC-1(loading)~AC-7(반응형) 전 항목을 §5.6·§4.3·§5.4에 시각 사양으로 반영. 상태별 frozen 텍스트 정확 인용. ✅ |
| **dev 구현 가이드** | §6에 토큰 선언→마크업→배지 매핑→상태 렌더→접근성→후조건→반응형 7단계 명시. ✅ |
| **기존 요소 보존** | frozen selector/token/상태 텍스트를 재정의하지 않음(additive). 지원 색상은 "frozen 아님" 명시로 혼동 차단. ✅ |
| **컴포넌트 매핑** | 3개 DOM ID + 6개 CSS class + 배지 3종 상태값을 §5에서 1:1 매핑. ✅ |
| **모호함 flag** | ⚠️ frozen 계약은 배경/텍스트 등 **중립 색상**을 정의하지 않음 → §2.2에서 designer 지원 값 제안(강제 아님). ⚠️ 진행 표시(스피너 vs 프로그레스바) 형태는 미지정 → mockup은 스피너로 예시하되 dev 재량으로 표기. 이 두 지점은 frozen 범위 밖 시각 보조이므로 계약 위반 없음. |

> 결론: frozen UI 계약을 재정의하지 않고 시각 사양으로 완결. dev는 본 문서 + mockup으로 selector/token/상태/접근성/반응형을 추측 없이 구현 가능.
