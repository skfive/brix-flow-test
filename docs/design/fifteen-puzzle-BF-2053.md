# 15퍼즐 디자인 명세 (BF-2054 / BF-2053)

이 문서는 `docs/plans/BF-2053/implementation-plan.md`에 동결(frozen)된 UI 계약을 시각 명세로 구현한 것이다.
선택자(selector), 상태명, 디자인 토큰, 접근성 규칙은 계약값을 그대로 사용하며 재정의하지 않는다.

## 1. 시안 개요

- 변경 범위: 4x4 숫자 슬라이딩 퍼즐(15퍼즐)의 보드/컨트롤 UI 시각 명세.
- 사용자 경험 목표: 사용자가 "섞기" 버튼으로 퍼즐을 시작하고, 마우스 클릭 또는 방향키로 빈 칸에 인접한 타일을 이동시켜 1~15가 순서대로 정렬된 목표 상태를 완성한다. 진행 중 이동 횟수와 경과 시간을 항상 확인할 수 있고, 완성 시 축하 메시지로 명확히 알린다.
- 참조 계약: `docs/plans/BF-2053/implementation-plan.md` §4 UI 계약(동결).

## 2. 컬러 팔레트

동결 디자인 토큰(재정의 금지):

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-tile-bg` | `#2563eb` | 숫자 타일 배경색 |
| `--color-tile-text` | `#ffffff` | 숫자 타일 텍스트 색 |
| `--color-board-bg` | `#0f172a` | 보드 컨테이너 배경색(빈 칸 포함) |
| `--space-tile-gap` | `6px` | 타일 사이 간격 |

보조 팔레트(계약 외 자유 지정 — 컨트롤/텍스트 영역용):

| 역할 | 값 | 용도 |
| --- | --- | --- |
| secondary (버튼 기본) | `#1e293b` | `puzzle-shuffle-button` 기본 배경 |
| accent (버튼 hover/포커스) | `#3b82f6` | 버튼 hover/focus 강조, `puzzle-tile--movable` 아웃라인 |
| background (페이지) | `#f8fafc` | 페이지 전체 배경 |
| text-primary | `#0f172a` | 본문 텍스트 |
| text-secondary | `#475569` | 보조 텍스트(이동 횟수/타이머 라벨) |
| success | `#16a34a` | `puzzle-success-message` 강조 |

## 3. 타이포그래피

시스템 폰트 스택(vanilla-static 규약 준수, 외부 폰트 의존성 없음):

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

| 용도 | size | weight | line-height |
| --- | --- | --- | --- |
| heading (페이지 타이틀) | 1.75rem (28px) | 700 | 1.3 |
| body (설명/라벨 텍스트) | 1rem (16px) | 400 | 1.5 |
| 타일 숫자 | 1.5rem (24px, 320px 뷰포트 기준 축소 가능) | 700 | 1 |
| caption (이동 횟수/타이머/상태 표시) | 0.875rem (14px) | 600 | 1.4 |
| `puzzle-success-message` | 1.25rem (20px) | 700 | 1.4 |

## 4. 레이아웃

### 4.1 섹션 구조

1. 페이지 타이틀 영역 — "15퍼즐"
2. 상태 표시줄 — 현재 상태명(idle/shuffling/playing/solved) 텍스트 노출
3. 정보 바 — `puzzle-move-count`(이동 횟수), `puzzle-timer`(경과 시간)
4. 보드 영역 — `puzzle-board` (4x4 그리드, 16개 셀: 타일 15개 + 빈 칸 1개)
5. 컨트롤 영역 — `puzzle-shuffle-button` ("섞기" 버튼)
6. 완료 메시지 영역 — `puzzle-success-message` (solved 상태에서만 표시)

### 4.2 spacing

- 페이지 컨테이너 최대 너비: 480px, 좌우 중앙 정렬, 상하 padding 24px.
- 섹션 간 간격: 16px.
- 보드 내부 타일 간격: `var(--space-tile-gap)` (6px), 보드 외곽 padding: 6px(타일 간격과 동일하게 시각적 통일감 유지).

### 4.3 보드 그리드

- `puzzle-board`는 `display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr);` 4x4 정사각 그리드.
- 보드 컨테이너는 `aspect-ratio: 1 / 1`로 정사각 비율을 유지한다.
- 보드 배경은 `var(--color-board-bg)`.

### 4.4 breakpoint 별 동작

- 최소 지원 뷰포트: 320px.
- 320px~479px: 보드 너비 = 뷰포트 너비 - 32px(좌우 margin 16px씩), 정사각 비율 유지, overflow 없음. 타일 숫자 폰트는 1.125rem로 축소.
- 480px 이상: 보드 최대 너비 360px로 고정, 페이지 컨테이너 중앙 정렬.
- 모든 구간에서 `puzzle-board`는 `max-width: 100%`로 부모 컨테이너를 넘지 않는다.

## 5. 컴포넌트 명세

### 5.1 `puzzle-board` (보드 컨테이너)

- role: 4x4 타일 그리드 컨테이너.
- 자식 요소: 16개 셀 — 15개는 `puzzle-tile`, 1개는 `puzzle-tile puzzle-tile--blank`.
- 상태별 렌더링:
  - `idle`: 목표 정렬 상태([1..15, blank]) 그대로 표시하거나 안내 placeholder 표시.
  - `shuffling`: 섞는 중임을 알리는 상태 텍스트와 함께 보드는 비활성(타일 클릭 무시) 상태로 표시.
  - `playing`: 섞인 배치로 타일 표시, 빈 칸에 인접한 타일은 `puzzle-tile--movable` 클래스로 시각 구분.
  - `solved`: 정렬 완료 배치, 모든 타일에서 `puzzle-tile--movable` 제거(더 이상 의미 없음).

### 5.2 `puzzle-tile` (숫자 타일)

- props(데이터): `value: number(1~15)`, `index: number(0~15)`, `movable: boolean`.
- 시각: 정사각형, 배경 `var(--color-tile-bg)`, 텍스트 `var(--color-tile-text)`, 모서리 radius 8px, 중앙 정렬.
- 상태:
  - 기본: 위 배경/텍스트 색.
  - `puzzle-tile--movable` 추가 시: `outline: 3px solid #3b82f6` + `cursor: pointer`로 이동 가능함을 시각 강조(색상 단독 구분 금지 원칙에 따라 outline 형태 변화를 병行).
  - hover(마우스 오버, movable인 경우만): 배경색을 살짝 밝게(`filter: brightness(1.1)`).
  - focus(키보드 포커스 대상 타일, 있는 경우): `outline-offset: 2px` 추가.
- 접근성: `aria-label="타일 N"` (N = 타일 값). `role="button"` 부여하여 클릭 가능한 요소임을 알린다.

### 5.3 `puzzle-tile--blank` (빈 칸)

- 시각: 보드 배경(`var(--color-board-bg)`)과 동일하게 렌더링되어 "구멍"처럼 보이도록 함. 테두리/그림자 없음.
- 접근성: `aria-hidden="true"`.

### 5.4 `puzzle-shuffle-button` (섞기 버튼)

- props(데이터): 없음(단일 액션 버튼). label 텍스트는 상태에 따라 변경.
- 상태별 텍스트/동작:
  - `idle`: 텍스트 "섞기" — 클릭 시 `shuffling` 상태로 전환.
  - `shuffling`: 텍스트 "섞는 중…" — `disabled` 처리(중복 클릭 방지).
  - `playing`: 텍스트 "다시 섞기" — 클릭 시 이동 횟수/타이머를 초기값으로 되돌리고 재섞기 진행.
  - `solved`: 텍스트 "다시 섞기" — 클릭 시 `puzzle-success-message`를 숨기고 진행 표시를 초기화한 뒤 재섞기 진행(주 실행 control 재사용 가능 요구사항 반영).
- 시각: 배경 `#1e293b`(secondary), 텍스트 `#ffffff`, padding `10px 20px`, radius 6px. hover/focus 시 배경 `#3b82f6`(accent). `disabled` 시 배경 `#94a3b8`, `cursor: not-allowed`.

### 5.5 `puzzle-move-count` (이동 횟수)

- 표시 형식: "이동 횟수: N회" (N = 정수, 0부터 시작).
- 상태별: `idle`/`shuffling`에서는 "이동 횟수: 0회"로 초기화, `playing`에서 타일 이동마다 증가, `solved`에서 최종 값 고정 표시.

### 5.6 `puzzle-timer` (타이머)

- 표시 형식: "시간: MM:SS".
- 상태별: `idle`에서 "시간: 00:00", `shuffling` 종료와 동시에(=`playing` 진입 시) 타이머 시작, `solved` 도달 시 타이머 정지 및 최종 값 고정.

### 5.7 `puzzle-success-message` (완료 메시지)

- 표시 조건: `solved` 상태에서만 노출(그 외 상태에서는 DOM에 존재하되 숨김 또는 빈 텍스트).
- 텍스트: "🎉 완성했습니다! N회, MM:SS 만에 성공했어요." (N = 최종 이동 횟수, MM:SS = 최종 경과 시간)
- 시각: 텍스트 색 `#16a34a`(success), font-weight 700, 상단 여백 12px.

### 5.8 상태 표시 텍스트 (접근성 — 색상 단독 구분 금지)

각 상태는 화면에 노출되는 상태 텍스트로 구분한다(별도 상태 표시 요소, 계약에 없는 새 id 추가 없이 페이지 텍스트로 표현):

| 상태 | 상태 표시 텍스트 |
| --- | --- |
| `idle` | "대기 중 — 섞기 버튼을 눌러 시작하세요" |
| `shuffling` | "섞는 중…" |
| `playing` | "게임 진행 중" |
| `solved` | "완성!" |

## 6. dev 구현 가이드

1. CSS 변수는 `fifteen-puzzle/style.css`의 `:root`에 계약 토큰 4종(`--color-tile-bg`, `--color-tile-text`, `--color-board-bg`, `--space-tile-gap`)을 그대로 선언하고, 본 문서 §2의 보조 팔레트는 별도 변수(예: `--color-button-bg`, `--color-button-accent`, `--color-page-bg`, `--color-text-primary`, `--color-text-secondary`, `--color-success`)로 추가 선언해 사용 권장.
2. `puzzle-board`는 CSS Grid(`grid-template-columns: repeat(4, 1fr)`)로 4x4 배치, `aspect-ratio: 1 / 1` 적용.
3. 타일 요소는 `button` 또는 `role="button"`을 가진 요소로 구현하고 `aria-label="타일 N"` 부여, 빈 칸 요소는 `aria-hidden="true"`.
4. 이동 가능한 타일에 `puzzle-tile--movable` 클래스를 동적으로 토글(빈 칸 인접 여부에 따라 매 렌더마다 재계산).
5. 키보드 이동: 문서 전역 또는 보드 포커스 시 `ArrowUp/Down/Left/Right` keydown 리스너로 빈 칸과 교환 가능한 타일을 계산해 이동 처리.
6. 상태 전이 `idle → shuffling → playing → solved`는 body 또는 보드 컨테이너에 `data-state="idle|shuffling|playing|solved"` 속성으로 노출 권장(CSS 훅 및 상태 텍스트 렌더링 조건 분기에 사용). 취소/실패 시 `idle`로 복귀하고 `puzzle-move-count`/`puzzle-timer`를 초기값으로 리셋, `puzzle-shuffle-button`을 다시 활성화한다.
7. `puzzle-success-message`는 `solved` 상태 진입 시에만 텍스트를 채우고, 그 외 상태에서는 빈 문자열 또는 `hidden` 처리.
8. 반응형은 미디어쿼리 `@media (max-width: 479px)`에서 보드/타일 폰트 크기를 축소하고, 보드 컨테이너에 `max-width: 100%`를 항상 유지해 320px에서도 overflow가 없도록 한다.

## 7. AC 매핑 표 (self-critique)

| frozen 계약 항목 | 값 | 본 문서/화면 요소 대응 |
| --- | --- | --- |
| domIds | `puzzle-board` | §5.1, mockup 보드 컨테이너 |
| domIds | `puzzle-shuffle-button` | §5.4, mockup 버튼 |
| domIds | `puzzle-move-count` | §5.5, mockup 정보 바 |
| domIds | `puzzle-timer` | §5.6, mockup 정보 바 |
| domIds | `puzzle-success-message` | §5.7, mockup solved 섹션 |
| cssClasses | `puzzle-tile` | §5.2, mockup 타일 15개 |
| cssClasses | `puzzle-tile--blank` | §5.3, mockup 빈 칸 1개 |
| cssClasses | `puzzle-tile--movable` | §5.2, mockup playing 예시의 인접 타일 outline |
| states | `idle`/`shuffling`/`playing`/`solved` | §5.8 상태 텍스트 표, mockup idle/playing(참고)/solved 섹션 |
| designTokens | `--color-tile-bg`, `--color-tile-text`, `--color-board-bg`, `--space-tile-gap` | §2, mockup `:root` |
| accessibility | `aria-label="타일 N"` | §5.2 |
| accessibility | 빈 칸 `aria-hidden="true"` | §5.3 |
| accessibility | 방향키 이동 | §6-5 |
| accessibility | 색상 단독 구분 금지(상태 텍스트 노출) | §5.8 |
| responsive | 320px 이상 overflow 없는 정사각 보드 | §4.4 |

## 8. mockup 참조

시각 mockup: `docs/design/fifteen-puzzle-BF-2053-mockup.html` — idle/playing/solved 3개 상태를 각각 별도 iframe 섹션으로 정적 시각화. AC 필수 요구 상태는 idle과 solved(축하 메시지 포함)이며, playing 섹션은 `puzzle-tile--movable` 강조와 진행 중 정보 바 표시를 보여주기 위한 참고용 추가 시각화다(mockup 내 "playing (참고)" 라벨 참조).
