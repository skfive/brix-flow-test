# 전달 상태 보드 시각 명세 — BF-1273

> 본 문서는 frozen `ui-contract@v1` 를 시각 설계 명세로 렌더링한 것입니다.
> selector·token·상태 텍스트 라벨의 유일한 권위는 frozen blueprint 이며, 본 문서는
> 그 값을 **재정의하지 않고 그대로 반영**합니다. 새 selector·상태·token 을 추가하지
> 않습니다.
>
> - 소비 계약: `ui-contract@v1` (blueprint-frozen), `planning-contract@v1` (runtime-artifact)
> - 파일 소유권: designer 는 `docs/design/**` 만 소유. 실제 런타임 HTML/CSS/JS
>   (`demo/delivery-board/**`) 는 developer(BF-1274) 가 구현하며, 본 명세는 런타임
>   코드를 생성하지 않습니다.

## 1. 시안 개요

- **변경 범위**: 전달(delivery) 진행 상황을 역할별 상태로 표시하는 정적 상태 보드의
  시각 명세. developer 가 구현할 `demo/delivery-board/**` 의 시각·접근성·반응형 계약을
  그림으로 확정한다.
- **사용자 경험 목표**:
  - 역할별 전달 상태(완료 / 진행 중 / 대기)를 색상 **그리고 텍스트 라벨**로 동시에
    전달해 색맹·저대비 환경에서도 구분 가능하게 한다.
  - 새로고침 control 로 상태를 갱신할 수 있고, 갱신 결과는 라이브 리전으로 스크린리더에
    전달된다.
  - 320px 좁은 뷰포트에서도 overflow 없이 읽히고, 480px 미만에서는 역할 항목이 세로로
    스택되어 한 줄씩 읽힌다.

## 2. 컬러 팔레트

frozen design token 을 유일 권위로 사용한다. 아래 값 외의 색상을 상태 표현에
추가하지 않는다.

| 용도 | token | HEX |
| --- | --- | --- |
| 상태: 완료 (done) | `--color-status-done` | `#16a34a` |
| 상태: 진행 중 (active) | `--color-status-active` | `#2563eb` |
| 상태: 대기 (pending) | `--color-status-pending` | `#94a3b8` |

보조 색상(배경/텍스트)은 상태 계약이 아닌 보드 셸(shell)의 시각 표현용이며, 상태 구분을
색상만으로 하지 않는 원칙을 지키기 위한 배경·전경 대비 목적에 한정한다. 상태 3종의 의미는
반드시 위 token + 텍스트 라벨로만 표현한다.

| 용도 | 참고 값(shell) |
| --- | --- |
| background (보드 배경) | `#ffffff` |
| surface (역할 항목 배경) | `#f8fafc` |
| text (본문) | `#0f172a` |
| text-muted (부가 텍스트) | `#475569` |
| border | `#e2e8f0` |

> shell 색상은 developer 가 `styles.css` 에서 확정하는 값이며, 상태 token 이 아니므로
> frozen 계약을 재정의하지 않는다. 본 명세는 대비 의도만 전달한다.

## 3. 타이포그래피

외부 폰트 의존성 없이 system font stack 을 사용한다(observed_stack: vanilla-static).

| 계층 | font-family | size | weight | line-height |
| --- | --- | --- | --- | --- |
| heading (보드 제목) | system-ui, sans-serif | 20px | 700 | 1.3 |
| revision (리비전 표시) | system-ui, sans-serif | 13px | 500 | 1.4 |
| role name (역할 이름) | system-ui, sans-serif | 15px | 600 | 1.4 |
| status label (상태 라벨) | system-ui, sans-serif | 13px | 600 | 1.2 |
| caption (부가 안내) | system-ui, sans-serif | 12px | 400 | 1.5 |

system font stack:
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

## 4. 레이아웃

### 4.1 섹션 구조

```
#board-root .board
├─ header
│   ├─ h1 (보드 제목)
│   ├─ #board-revision .board__revision (현재 리비전)
│   └─ #board-refresh .board__refresh  (새로고침 control)
└─ #board-role-list .board__list        (aria-live="polite")
    └─ .board__role  × N
        ├─ 역할 이름
        └─ .board__status (상태 라벨 텍스트 + 색상 dot)
```

### 4.2 spacing

- 역할 항목 간 간격 / 보드 내부 gap: `--space-board-gap` = `16px` (frozen token).
- 보드 컨테이너 padding: `16px` (좁은 뷰포트에서도 overflow 방지 위해 border-box).

### 4.3 breakpoint 별 동작 (frozen responsive 계약)

| 뷰포트 | 동작 |
| --- | --- |
| ≥ 480px | 각 `board__role` 은 [역할 이름 — 상태 라벨] 을 가로 정렬(space-between). |
| < 480px | 각 `board__role` 내부가 **세로로 스택**(역할 이름 위, 상태 라벨 아래). |
| ≥ 320px | 어떤 뷰포트에서도 content overflow 가 발생하지 않는다. 긴 텍스트는 wrap. |

- 구현 권장: 컨테이너에 `max-width: 100%`, `box-sizing: border-box`, 텍스트에
  `overflow-wrap: anywhere` 를 두어 320px 에서 가로 스크롤이 생기지 않도록 한다.
- 세로 스택은 `@media (max-width: 479.98px)` 에서 `board__role { flex-direction: column; align-items: flex-start; }` 로 전환.

## 5. 컴포넌트 명세

### 5.1 보드 루트 — `#board-root` `.board`

- 역할: 보드 최상위 컨테이너.
- 상태(state): `idle` → `loading` → `ready` / `error`. (보드 화면 자체의 데이터 상태)
  - 구현은 `data-state` 속성으로 표현 권장(예: `<div id="board-root" class="board" data-state="ready">`).

### 5.2 리비전 표시 — `#board-revision` `.board__revision`

- 역할: 현재 리비전/버전 표시.
- 콘텐츠: `rev N` 형태의 짧은 텍스트(placeholder 예: `rev 1`).

### 5.3 새로고침 control — `#board-refresh` `.board__refresh`

- 역할: 상태 새로고침 트리거(`<button>` 시맨틱).
- **접근성**: 명시적 `aria-label="전달 상태 새로고침"` 을 가진다.
- 인터랙션 / 상태:
  | 상태 | 표현 |
  | --- | --- |
  | 기본(idle/ready) | 사용 가능, 클릭 시 `loading` 진입 |
  | hover | 배경 대비 강조(`:hover`) |
  | loading | 비활성(disabled) + "갱신 중…" 표기 가능 |
  | 초기화·취소·실패 후 | **다시 사용 가능 상태로 복귀**(주 실행 control 재사용 가능) |

### 5.4 역할 상태 목록 — `#board-role-list` `.board__list`

- 역할: 역할별 상태 항목 컨테이너.
- **접근성**: `aria-live="polite"` 로 상태 갱신을 스크린리더에 전달.

### 5.5 역할 항목 — `.board__role`

- 역할: 개별 역할의 이름 + 상태.
- 구조: 역할 이름 + `.board__status`.
- 반응형: 480px 미만에서 세로 스택(§4.3).

### 5.6 상태 배지 — `.board__status`

- 역할: 상태를 **색상 dot + 텍스트 라벨**로 표현.
- 상태별 매핑(frozen):
  | 상태 | 텍스트 라벨(화면 + 접근성 이름) | 색상 token |
  | --- | --- | --- |
  | done | 완료 | `--color-status-done` (`#16a34a`) |
  | active | 진행 중 | `--color-status-active` (`#2563eb`) |
  | pending | 대기 | `--color-status-pending` (`#94a3b8`) |
- **색상만으로 상태를 구분하지 않는다.** 텍스트 라벨(완료/진행 중/대기)이 화면 텍스트와
  접근성 이름으로 항상 노출되어야 한다.

## 6. dev 구현 가이드 (developer / BF-1274)

> developer 는 `demo/delivery-board/**` 를 소유하며 아래 selector·token 을 **그대로**
> 사용한다(변경·재정의 금지). 픽셀 단위 mockup 일치 의무는 없으나 계약값은 일치해야 한다.

1. **DOM 골격** (`index.html`):
   - `<div id="board-root" class="board" data-state="idle">` 최상위.
   - header 안에 `<span id="board-revision" class="board__revision">`,
     `<button id="board-refresh" class="board__refresh" aria-label="전달 상태 새로고침">`.
   - `<ul id="board-role-list" class="board__list" aria-live="polite">`.
   - 각 항목 `<li class="board__role"> 역할명 <span class="board__status">…</span></li>`.
2. **CSS 변수** (`styles.css`) — `:root` 에 frozen token 정의:
   ```css
   :root {
     --color-status-done: #16a34a;
     --color-status-active: #2563eb;
     --color-status-pending: #94a3b8;
     --space-board-gap: 16px;
   }
   ```
   - 상태별 색상은 `.board__status[data-status="done|active|pending"]` 로 매핑 권장.
3. **상태 라벨 텍스트**: `완료` / `진행 중` / `대기` 문자열을 화면 텍스트로 렌더하고,
   색상 dot 은 보조 표현으로만 사용.
4. **접근성**:
   - `#board-refresh` 에 `aria-label="전달 상태 새로고침"`.
   - `#board-role-list` 에 `aria-live="polite"`.
5. **상태 전이 / 후조건** (`board.js`, ESM):
   - `idle` → 새로고침 → `loading` → 성공 `ready` / 실패 `error`.
   - 초기화·취소·실패 뒤 상태와 진행 표시를 초기값으로 되돌리고 `#board-refresh` 재사용 가능.
6. **반응형**:
   - 320px 이상 overflow 방지(`box-sizing: border-box`, `overflow-wrap: anywhere`).
   - `@media (max-width: 479.98px)` 에서 `.board__role` 세로 스택.
7. **serve root**: 저장소 root(`.`), root-relative 정적 경로.

## 7. mockup 참조

- 시각 mockup: [`docs/design/delivery-board-mockup.html`](./delivery-board-mockup.html)
- 위 selector·token·상태 라벨·반응형 계약을 그대로 시각화한 self-contained HTML(외부
  의존성 0건). developer 는 참조 가이드로 사용하되 픽셀 단위 일치 의무는 없다.

## Self-critique

- **AC 매핑**: (1) contract.md + mockup 이 frozen selector(`board-root`/`board-revision`/
  `board-role-list`/`board-refresh`, `board`/`board__role`/`board__status`/`board__refresh`)·
  token(4종)·상태 텍스트(완료/진행 중/대기)를 그대로 반영 → §2·§5·§6 및 mockup 반영.
  (2) 320px overflow 없음 + 480px 미만 세로 스택 → §4.3 명세 + mockup 의 `@media` 로 반영.
  (3) 런타임 HTML/CSS/JS 미생성, `docs/design/**` 만 산출 → 준수.
- **dev 구현 가이드**: §6 에 selector·CSS 변수·상태 라벨·접근성·상태 전이·반응형 단계 명시.
- **기존 요소 보존**: additive 신규 파일 2건만 생성. 기존 파일·타 소유 경로 미변경.
- **컴포넌트 매핑**: frozen DOM ID / class / state / token 을 §5 컴포넌트별로 1:1 매핑.
- **모호함 flag**: shell 배경/텍스트 색상은 frozen 상태 token 이 아니므로 참고값으로만
  제시했고, 상태 3종 의미는 frozen token + 텍스트 라벨로만 표현하도록 명시(재정의 아님).
