# 텍스트 통계 분석기 시각 명세 (BF-1946)

> 이 문서는 `docs/plans/BF-1945/implementation-plan.md`(planner, BF-1948)가 동결한 UI 계약(DOM id·CSS class·상태·design token·접근성·반응형)을 **그대로** 따르는 시각 명세입니다. 동결 계약은 재정의하지 않으며, 여기서는 레이아웃·타이포그래피·컴포넌트 세부 표현만 구체화합니다.

## 1. 시안 개요

- **변경 범위**: 신규 단일 페이지 `text-stats.html`(developer, BF-1947 산출물)의 시각 시안. 텍스트 입력 → 실시간 통계(문자수/단어수/문장수/문단수/읽기시간) + 상위 5단어 표시 + 지우기 기능.
- **사용자 경험 목표**:
  - 입력 즉시 통계가 갱신되는 반응성을 시각적으로 명확히 전달한다.
  - `stats-grid`의 각 카드는 값(value)과 이름(label)이 한 눈에, 그리고 스크린리더로도 짝지어 인식되도록 배치한다.
  - `empty`/`populated` 상태를 색상에만 의존하지 않고 텍스트 상태 라벨로 항상 노출한다.
  - 320px 폭(저사양/좁은 뷰포트)에서도 카드가 겹치거나 잘리지 않고 자연스럽게 줄바꿈된다.
- **비목표**: 실제 계산 로직 구현(개발자 담당, 계획 문서 2절 규칙 참조), `text-stats.html` 생성/수정.

## 2. 컬러 팔레트

### 2.1 동결 토큰 (planner 동결 — 변경/재정의 금지)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary` | `#2563eb` | 포커스 링, 입력 상태 강조, 통계 값(`.stats-card__value`) 텍스트, 상위 단어 순위 배지 |
| `--color-surface-card` | `#f8fafc` | `.stats-card` 배경 |

(`--space-card-gap`, `--font-size-stat-value`는 3절/5절 참조.)

### 2.2 제안 확장 토큰 (dev 재량 — 동결 아님, 이름/값 조정 가능)

| 토큰(제안명) | 값 | 용도 |
| --- | --- | --- |
| `--color-action-primary-hover` | `#1d4ed8` | 지우기 버튼/포커스 인터랙션 hover |
| `--color-app-background` | `#eef2f6` | 페이지(앱 바깥) 배경 |
| `--color-border` | `#e2e8f0` | 카드/입력 테두리 |
| `--color-text-primary` | `#0f172a` | 제목, 본문 텍스트 |
| `--color-text-secondary` | `#64748b` | `.stats-card__label`, 상위 단어 부가 텍스트, 상태 라벨 |
| `--color-text-placeholder` | `#94a3b8` | textarea placeholder |

> primary/secondary/accent 색상은 동결 토큰(`--color-action-primary`)을 기준으로 파생했으며 별도 accent 색상은 도입하지 않는다(불필요한 추가 색은 상태 구분의 시각적 노이즈가 되므로 배제).

## 3. 타이포그래피

- **font-family**: `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif` (vanilla-static 규약 — 외부 폰트 CDN 의존 없음, 시스템 폰트만 사용).

| 요소 | size | weight | line-height | 비고 |
| --- | --- | --- | --- | --- |
| 앱 타이틀 (h1) | 22px | 700 | 1.3 | "텍스트 통계 분석기" |
| 섹션 헤딩 (h2) | 16px | 600 | 1.4 | "통계", "자주 쓰인 단어" |
| `.stats-card__value` | **28px**(`--font-size-stat-value`, 동결) | 700 | 1.2 | 숫자/시간 표기. 긴 문자열("1분 미만")은 카드 폭 내 줄바꿈 허용, 폰트 크기는 축소하지 않는다 |
| `.stats-card__label` | 13px | 500 | 1.3 | letter-spacing 0.02em, `--color-text-secondary` |
| `#text-input` 본문 | 15px | 400 | 1.6 | |
| 상태 라벨(`role="status"`) | 13px | 600 | 1.3 | "상태: 비어 있음" / "상태: 입력됨" |
| `.top-words__item` | 14px | 500 | 1.5 | 단어, 빈도수는 13px/400/`--color-text-secondary` |

## 4. 레이아웃

### 4.1 구조 (문서 순서 = 스크린리더 읽기 순서)

```
.text-stats-app (max-width 640px, margin 0 auto)
├─ header
│   ├─ h1 "텍스트 통계 분석기"
│   └─ p[role="status"][aria-live="polite"] 상태 라벨
├─ section (입력 영역)
│   ├─ label[for=text-input] "분석할 텍스트"
│   ├─ textarea#text-input (aria-label="분석할 텍스트 입력")
│   └─ button#clear-button (aria-label="입력 지우기")
├─ section (통계 영역)
│   ├─ h2 "통계"
│   └─ div#stats-grid.stats-grid
│       └─ div.stats-card (× 6: chars-with-spaces / chars-without-spaces / words / sentences / paragraphs / reading-time)
│           ├─ span.stats-card__value
│           └─ span.stats-card__label
└─ section (상위 단어 영역)
    ├─ h2 "자주 쓰인 단어"
    ├─ p (empty 상태에서만 노출되는 안내 텍스트, 목록 바깥에 위치 — #top-words-list 자체는 empty에서 빈 목록 유지)
    └─ ol#top-words-list
        └─ li.top-words__item (× 최대 5)
```

### 4.2 Spacing

- 섹션 간 세로 간격: 24px.
- `#stats-grid`의 카드 간 간격: **16px**(`--space-card-gap`, 동결) — grid `gap` 값으로 사용.
- `.text-stats-app` 패딩: 24px (데스크톱), ≤480px에서 16px.
- 입력 textarea와 `#clear-button` 사이 간격: 12px (버튼은 textarea 아래 우측 정렬).

### 4.3 `#stats-grid` 반응형 규칙

```css
#stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-card-gap); /* 16px, 동결 */
}
```

- `auto-fill` + `minmax(130px, 1fr)` 조합으로 뷰포트 폭에 따라 열 수가 자동 감소한다.
- **320px 검증**: 앱 패딩 16px×2 제외 시 가용 폭 288px. 카드 2열 = `130px×2 + gap 16px = 276px` → 288px 이내로 겹침·잘림 없이 배치되고, 3열(`130px×3 + gap 32px = 422px`)은 폭 초과로 자동 줄바꿈되어 2열로 떨어진다. (mockup 6절 "320px 반응형 미리보기" 참조)
- 카드 자체는 `min-width: 0`으로 내부 텍스트 overflow를 방지하고 `.stats-card__value`는 `overflow-wrap: break-word`로 줄바꿈한다.

### 4.4 Breakpoint 요약

| 폭 | 열 수(자동) | 비고 |
| --- | --- | --- |
| ≥600px | 4열 내외 | `.text-stats-app` 패딩 24px |
| 480–599px | 3열 내외 | 패딩 24px→16px 전환 |
| 320–479px | 2열 | 패딩 16px, 본 spec의 필수 검증 폭 |

## 5. 컴포넌트 명세

### 5.1 `.stats-card` (`#stats-grid` 내부, 6개 인스턴스)

| 항목 | 내용 |
| --- | --- |
| DOM id (동결) | `stat-chars-with-spaces`, `stat-chars-without-spaces`, `stat-words`, `stat-sentences`, `stat-paragraphs`, `stat-reading-time` |
| class (동결) | `.stats-card` (컨테이너), `.stats-card__value`, `.stats-card__label` |
| props | `value: string`, `label: string` |
| 상태 | `empty` → value는 규칙상 초기값(문자/단어/문장/문단=`0`, 읽기시간=`"0분"`) / `populated` → 계산된 값 |
| 인터랙션 | 정적 표시 전용, 클릭/hover 없음 |
| 배경/테두리 | 배경 `--color-surface-card`(동결), 테두리 1px `--color-border`, radius 10px |
| 접근성 | `.stats-card__value`와 `.stats-card__label`을 같은 카드 안에 세로로 인접 배치(value 위, label 아래)하여 DOM 순서상 스크린리더가 "값 → 이름"으로 연결해 읽는다. 카드에 별도 `aria-*` 랩핑은 두지 않고 시각적 인접 배치 + DOM 순서로 연결을 보장한다 |

라벨 매핑(placeholder 한국어 문구, dev가 그대로 사용 권장):

| id | 라벨 텍스트 |
| --- | --- |
| `stat-chars-with-spaces` | 공백 포함 문자수 |
| `stat-chars-without-spaces` | 공백 제외 문자수 |
| `stat-words` | 단어수 |
| `stat-sentences` | 문장수 |
| `stat-paragraphs` | 문단수 |
| `stat-reading-time` | 예상 읽기 시간 |

### 5.2 `#text-input`

| 항목 | 내용 |
| --- | --- |
| 타입 | `<textarea>` |
| aria-label (동결) | `"분석할 텍스트 입력"` |
| 상태 | `empty`(빈 문자열) / `populated`(1자 이상) — 계획 문서 3.3절 규칙 그대로 |
| 시각 | min-height 120px, 테두리 1px `--color-border`, radius 8px, 포커스 시 `outline: 2px solid var(--color-action-primary)` |
| placeholder | "분석할 텍스트를 입력하세요" (`--color-text-placeholder`) |

### 5.3 `#clear-button`

| 항목 | 내용 |
| --- | --- |
| aria-label (동결) | `"입력 지우기"` |
| 스타일 | 보조(secondary/outline) 버튼 — 배경 투명, 테두리 1px `--color-border`, 텍스트 `--color-text-primary`. hover 시 배경 `--color-app-background`, 텍스트 `--color-action-primary-hover`로 강조(파괴적 강조색 미사용 — 취소가 아닌 "초기화" 성격) |
| 상태 | 항상 활성(disabled 금지) — `empty` 상태에서 클릭해도 오류 없이 `empty` 유지(계획 문서 6절) |
| 배치 | 입력 영역 하단 우측 정렬 |
| 클릭 시 결과(정적 명세) | 텍스트 입력값 초기화 + 모든 `.stats-card__value` 초기값 복귀 + 상태 라벨 "상태: 비어 있음"으로 전환 + `#top-words-list` 빈 목록화. mockup에서는 두 상태(3.5절/6절 참고 스케치)로 결과를 시각화 |

### 5.4 `#top-words-list`

| 항목 | 내용 |
| --- | --- |
| 태그 | `<ol>` (순위 의미 전달 — 시맨틱 순서 목록) |
| item class (동결) | `.top-words__item` |
| 표시 개수 | 최대 5개(계획 문서 2.2절 규칙, 5개 미만이면 있는 만큼만) |
| item 구성 | 순번(`::marker` 또는 `<ol>` 기본 번호) + 단어 텍스트 + 빈도("N회") — 빈도는 `.top-words__item` 내부 보조 span, `--color-text-secondary` |
| empty 상태 | `#top-words-list`는 자식 없이 완전히 빈 상태 유지(계획 문서 3.3절). "표시할 단어가 없습니다" 같은 안내 문구는 **목록 바깥의 별도 `<p>`**에 두고 상태 라벨과 함께 `empty`일 때만 보이도록 처리 |

### 5.5 상태 라벨(`role="status"`, 동결 아님이나 3.3/3.5 요구사항 구현체)

| 항목 | 내용 |
| --- | --- |
| 위치 | 헤더 영역, `<h1>` 바로 아래 |
| 마크업 | `<p role="status" aria-live="polite" class="app-status">상태: 비어 있음</p>` (populated일 때 "상태: 입력됨") |
| 목적 | 계획 문서 3.3/3.5절 — 상태 전환을 색상만이 아닌 텍스트+접근성 이름으로 노출 |
| 시각 | 텍스트 앞에 작은 상태 점(dot, 8px) 병기 가능하나 **점 색상만으로 상태를 구분하지 않음** — 텍스트가 항상 주 정보원 |

## 6. dev 구현 가이드 (developer, BF-1947 대상)

1. `text-stats.html` 한 파일에 HTML/CSS/JS를 모두 인라인으로 작성한다. 외부 CDN/라이브러리 금지(계획 문서 0절).
2. `:root`에 동결 토큰 4개를 **정확한 이름 그대로** 선언한다:
   ```css
   :root {
     --color-action-primary: #2563eb;
     --color-surface-card: #f8fafc;
     --space-card-gap: 16px;
     --font-size-stat-value: 28px;
   }
   ```
   본 문서 2.2절의 확장 토큰은 이름/값을 자유롭게 조정 가능(동결 아님).
3. DOM id 10개, class 5개는 본 문서 3–5절과 계획 문서 3.1/3.2절에 명시된 철자 그대로 사용한다(오타·재명명 금지).
4. `#stats-grid`는 4.3절의 `grid-template-columns: repeat(auto-fill, minmax(130px, 1fr))` + `gap: var(--space-card-gap)` 패턴을 그대로 적용하면 320px 검증 계산이 성립한다. 다른 패턴(flex-wrap)을 쓰더라도 320px에서 카드 겹침/잘림이 없어야 한다(계획 문서 3.6절 필수 요건, grid 방식이 아니어도 무방).
5. `.stats-card` 내부 DOM 순서는 `.stats-card__value` → `.stats-card__label` 순으로 작성한다(5.1절 접근성 근거).
6. `#top-words-list`는 `empty` 상태에서 자식 `<li>`가 하나도 없어야 한다. 안내 문구가 필요하면 목록 바깥 별도 요소에 작성한다.
7. 상태 전환 시 `role="status"`/`aria-live="polite"` 텍스트(5.5절)를 함께 갱신한다. `#clear-button`/`#text-input`은 어떤 상태에서도 `disabled` 처리하지 않는다(계획 문서 3.7절).
8. `#clear-button`, `#text-input`에 각각 동결 `aria-label`을 정확히 부여한다.
9. 계산 로직(문장/단어/문단/읽기시간/상위 5단어)은 본 문서가 아닌 `docs/plans/BF-1945/implementation-plan.md` 2절을 유일한 근거로 구현한다 — 본 문서의 예시 수치(mockup 포함)는 레이아웃 참고용 placeholder이며 계산 규칙의 출처가 아니다.

## 7. mockup 참조

- 파일: `docs/design/text-stats-BF-1945-mockup.html`
- 구성: (1) `populated` 상태 실사용 예시 — 동결 id/class를 실제로 부여한 단일 인스턴스, (2) `empty` 상태 참고 스케치, (3) 320px 폭 반응형 미리보기 프레임. (2)·(3)은 HTML `id` 유일성 제약 때문에 동결 id를 재부여하지 않고 동결 class만 재사용한 참고용 스케치이며 실제 DOM 구조를 그대로 복제한 것은 아니다.
- mockup 내 통계 수치는 6절 참고 데이터(placeholder)이며 실제 산출값은 개발자가 계획 문서 2절 규칙으로 계산한다.
