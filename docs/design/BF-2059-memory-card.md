# BF-2059 · 메모리 카드 게임 UI 시안

> 상위 티켓: BF-2059 (메모리 카드 게임) · 실행 설계: BF-2062 (`docs/plans/BF-2059/implementation-plan.md`)
> 본 문서는 BF-2062에서 동결한 상태 전이표·DOM 계약·디자인 토큰을 **그대로** 사용하는 시각 시안이다. selector(ID/class)와 토큰 값은 재정의하지 않는다.

## 1. 시안 개요

- **변경 범위**: 4x4 짝맞추기(메모리 매칭) 게임 단일 화면. 카드 보드, 시도 횟수, 타이머, 재시작 버튼, 승리 결과 패널로 구성.
- **사용자 경험 목표**:
  - 카드를 두 장씩 뒤집어 짝을 맞추는 흐름이 한눈에 파악되어야 한다.
  - 뒤집힘(flipped)·맞춤(matched) 상태가 색상뿐 아니라 형태(테두리, 배지)로도 구분되어야 한다(접근성).
  - 360px 폭에서도 가로 스크롤 없이 4x4 보드가 온전히 보여야 한다.
  - 승리 시 결과가 명확하게 강조되어야 한다.
- **비목표**: 실제 상태 전이 로직·판정 타이밍·순수함수 구현은 developer(BF-2061) 담당. 본 문서는 시각 표현만 다룬다.

## 2. 컬러 팔레트

BF-2062 §4.3에서 동결한 토큰을 그대로 사용한다(값 재정의 금지).

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-bg` | `#0f172a` | 전체 배경(다크) |
| `--color-card-back` | `#334155` | 카드 뒷면(hidden 상태) 배경 |
| `--color-card-face` | `#f8fafc` | 카드 앞면(flipped/matched 상태) 배경 |
| `--color-accent` | `#22c55e` | 강조(맞춤 카드 테두리, 재시작 버튼, 승리 결과) |
| `--font-family-base` | `system-ui, -apple-system, sans-serif` | 전체 폰트 |
| `--space-grid-gap` | `12px` | 보드 카드 간격 |

frozen 토큰 외에 배경 위 텍스트 대비를 위한 보조 컬러(신규 정의 아님, 순수 표현용 파생값)는 다음과 같다. 이 값들은 selector/token 계약 대상이 아니므로 developer가 자유롭게 조정 가능:

| 용도 | 값 | 비고 |
| --- | --- | --- |
| 기본 텍스트(다크 배경 위) | `#f1f5f9` | HUD 라벨, 제목 |
| 보조 텍스트(다크 배경 위, muted) | `#94a3b8` | 캡션, 상태 legend |
| 카드 앞면 위 텍스트 | `#0f172a` | `--color-card-face` 위 심볼/텍스트 |
| 재시작 버튼 텍스트 | `#0f172a` | `--color-accent` 배경 위 대비 확보 |

## 3. 타이포그래피

전부 `--font-family-base` (`system-ui, -apple-system, sans-serif`) 사용.

| 레벨 | 용도 | size | weight | line-height |
| --- | --- | --- | --- | --- |
| Heading | 게임 제목("메모리 카드") | 1.75rem (28px) | 700 | 1.2 |
| Body | HUD 수치(`#memory-attempts`, `#memory-timer`), 재시작 버튼, 결과 문구 | 1rem (16px) | 600 | 1.4 |
| Caption | 카드 상태 legend, 보조 안내문 | 0.8125rem (13px) | 400 | 1.4 |
| Card symbol | 카드 앞면 심볼(이모지) | 1.75rem (28px) | 400 | 1 |

## 4. 레이아웃

### 4.1 전체 구조

```
.memory-app (max-width 480px, 중앙 정렬, padding 16px)
├─ header .memory-header
│   ├─ h1 (게임 제목)
│   └─ .memory-hud
│       ├─ #memory-attempts
│       ├─ #memory-timer
│       └─ #memory-restart (button)
├─ #memory-board (4x4 grid)
│   └─ .memory-card × 16 (button)
└─ #memory-result (기본 숨김 → won 시 .memory-result--visible)
```

### 4.2 spacing & breakpoint

- 컨테이너: `max-width: 480px`, 좌우 padding `16px`, 세로 요소 간 간격 `16px`.
- 보드: `display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-grid-gap)`.
- 카드: `aspect-ratio: 1 / 1`, 최소 탭 영역 `40px × 40px` 보장(360px 뷰포트 기준 계산: `(360 - padding 32 - gap 36) / 4 ≈ 73px` > 40px).
- 360px 미만은 지원 범위 밖(AC-10 기준 360px 이상만 보장).
- 480px 이상 뷰포트에서는 컨테이너가 더 커지지 않고 중앙 정렬 유지(카드가 과도하게 커지는 것 방지).

### 4.3 HUD 레이아웃

- `.memory-hud`는 `display: flex; justify-content: space-between; align-items: center; gap: 12px`.
- 좁은 화면에서 `#memory-attempts`, `#memory-timer`, `#memory-restart` 3요소가 한 줄에 들어가지 않으면 `flex-wrap: wrap`으로 줄바꿈(레이아웃 자유, 텍스트 잘림 금지).

## 5. 컴포넌트 명세

### 5.1 카드 (`.memory-card`, button)

| 상태 | 시각 표현 | class | 접근성 |
| --- | --- | --- | --- |
| hidden | `--color-card-back` 배경, 심볼 미노출(물음표 아이콘 등 placeholder) | (기본, 추가 class 없음) | `aria-label="카드 N, 가려짐"` |
| flipped | `--color-card-face` 배경, 심볼(이모지) 노출, 얇은 테두리로 "진행 중" 표시 | `memory-card--flipped` | `aria-label="카드 N, 뒤집힘"` |
| matched | `--color-card-face` 배경, 심볼 노출, `--color-accent` 테두리 + 우측 상단 체크 배지, `opacity: 0.85`로 "확정" 느낌 | `memory-card--matched` | `aria-label="카드 N, 맞춤"` |

- 카드는 정사각형 button. hover/focus 시 `outline: 2px solid var(--color-accent)`로 키보드 포커스 시각화(마우스 hover도 동일 처리, 색상 외 형태 변화 없음 — 화면비 유지).
- matched 카드는 `pointer-events`를 막을 필요는 디자인 책임 아님(구현 로직), 시각적으로는 클릭 불가로 "가라앉은" 느낌(테두리 강조 + 살짝 낮은 opacity)만 표현.
- 심볼은 이모지 8종 예시(placeholder): 🍎 🍋 🍇 🍓 🍒 🥝 🍑 🍉 (dev는 실제 symbols 배열 자유 결정).

### 5.2 HUD — 시도 횟수 (`#memory-attempts`)

- 텍스트 포맷 예시: `시도: 0` (숫자만 diff, 라벨 텍스트는 developer 재량).
- Body 타이포, 기본 텍스트 컬러.

### 5.3 HUD — 타이머 (`#memory-timer`)

- 포맷: `MM:SS` (BF-2062 §3.4 `formatTime` 계약과 동일 표현, 초기값 `00:00`).
- Body 타이포, 기본 텍스트 컬러. 진행 중임을 나타내는 별도 아이콘은 optional.

### 5.4 재시작 버튼 (`#memory-restart`)

- `--color-accent` 배경, `#0f172a` 텍스트, `border-radius: 8px`, padding `8px 16px`.
- `aria-label="다시 시작"` 필수(버튼 표시 텍스트는 "다시 시작" 또는 아이콘 + 텍스트 조합 가능).
- hover/focus: 배경을 약간 어둡게(`filter: brightness(0.9)`) + `outline: 2px solid var(--color-accent)`.
- 항상 클릭 가능(§1.3 무효 전이 규칙 — 어떤 상태에서도 유효).

### 5.5 결과 패널 (`#memory-result`)

- 기본 상태: 숨김(`display: none` 또는 `visibility: hidden` — 구현 자유, 시각적으로 보이지 않으면 됨).
- `.memory-result--visible` 부여 시: 카드 그리드 아래(또는 오버레이) 배너 형태로 노출. `--color-accent` 테두리 또는 배경 tint, 승리 문구("축하합니다! N번 만에 완료했어요" 등 placeholder) + 최종 시도 횟수/시간 요약 표시 가능.
- `aria-live="polite"`로 스크린리더에 결과 변화 전달 권장(발표 텍스트가 상태명을 포함해야 함 — §4.4 접근성 기준).

## 6. AC 매핑표

| AC | 요약 | 시안 반영 |
| --- | --- | --- |
| AC-1 | 첫 카드 뒤집기·타이머 시작 | `.memory-card--flipped` 시각(카드 앞면 노출), `#memory-timer`는 `00:00`에서 증가하는 Body 타이포 표현 |
| AC-2 | 두 번째 카드 뒤집기·판정 시작·시도 +1 | 두 번째 카드도 `.memory-card--flipped`, `#memory-attempts` 값 증가는 동일 컴포넌트 내 숫자만 갱신 |
| AC-3 | 일치 판정 → matched | `.memory-card--matched` 시각(accent 테두리 + 체크 배지 + opacity) |
| AC-4 | 불일치 판정 → hidden 복귀 | 카드가 hidden 기본 시각(카드 뒷면)으로 되돌아감, 별도 전환 애니메이션은 dev 재량 |
| AC-5 | input-locked 중 3번째 클릭 무시 | 시각 변화 없음 — 상태 legend에 "input-locked 동안 보드 전체가 판정 대기"를 캡션으로 안내(§5.1 참고) |
| AC-6 | matched/flipped 재클릭 무시 | matched 카드의 "가라앉은"(opacity 0.85 + accent 테두리) 표현이 "더 이상 조작 대상 아님"을 암시 |
| AC-7 | 승리 | `#memory-result`에 `.memory-result--visible` 부여 시 accent 강조 배너 노출(§5.5) |
| AC-8 | 재시작 | `#memory-restart` 클릭 시 보드 전체 hidden 초기화, `#memory-attempts`/`#memory-timer` 초기값, 결과 패널 숨김 — 시각적으로는 최초 렌더 상태와 동일 |
| AC-9 | 키보드 조작·상태 텍스트 노출 | 모든 카드/버튼이 native `<button>`, `aria-label`에 상태명("카드 3, 뒤집힘" 등) 포함(§5.1), focus outline 시각 처리 |
| AC-10 | 반응형(360px) | §4.2 spacing 계산으로 360px에서도 카드 40x40px 이상 유지, 그리드 overflow 없음 |

## 7. dev 구현 가이드

developer(BF-2061)는 아래 순서로 `memory/` 산출물을 구현하되, DOM id/class/토큰 값은 §2·§4.2(BF-2062) 계약을 그대로 사용한다(재정의 금지).

1. **`memory/style.css`**: `:root`에 §2 표의 5개 frozen 토큰(`--color-bg`, `--color-card-back`, `--color-card-face`, `--color-accent`, `--font-family-base`, `--space-grid-gap`)을 값 그대로 선언. 보조 컬러(§2 하단 표)는 자유롭게 CSS 변수로 추가 가능(예: `--color-text`, `--color-text-muted`).
2. **`memory/index.html`**: §4.1 구조대로 마크업. 카드 16개는 모두 `<button class="memory-card">`이며 개별 `id`는 부여하지 않음(보드 컨테이너만 `id="memory-board"`).
3. **상태 class 토글**: JS(`memory/memory.js`)에서 카드 상태 변경 시 `memory-card--flipped`/`memory-card--matched`를 add/remove. 두 class를 동시에 갖지 않음(matched는 flipped를 대체).
4. **`aria-label` 갱신**: 카드 상태가 바뀔 때마다 `aria-label`을 "카드 N, 가려짐/뒤집힘/맞춤" 형태로 갱신(§5.1, AC-9).
5. **결과 패널 토글**: `isWon(cards)`가 `true`가 되는 시점에 `#memory-result`에 `memory-result--visible` 추가, `#memory-restart` 클릭 시 제거.
6. **반응형**: 카드 크기는 고정 px가 아닌 grid의 `1fr` + `aspect-ratio: 1/1`로 처리해 뷰포트에 따라 자동 축소. `min-width`/`min-height` 등으로 40px 미만으로 줄어들지 않게 보정.
7. **테스트(`memory/tests/memory.test.js`)**: 시안 자체는 테스트 대상 아님. BF-2062 §3의 순수함수 경계값 테스트 케이스를 우선 커버.

## 8. mockup 참조

시각 mockup: [`docs/design/BF-2059-memory-card-mockup.html`](./BF-2059-memory-card-mockup.html)

- 메인 보드는 진행 중 게임(hidden/flipped/matched 혼재)을 보여준다.
- 하단 "상태 미리보기" 섹션에서 결과 패널의 승리(`memory-result--visible`) 상태와 카드 상태 legend를 별도로 확인할 수 있다(정적 예시, 실제 `#memory-result`/카드 id와 별개의 시각 참조용 마크업).
