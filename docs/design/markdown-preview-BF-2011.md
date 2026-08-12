# 마크다운 미리보기 — UI 시안 명세 (BF-2012 / BF-2011)

- 근거 문서: `docs/plans/BF-2011/implementation-plan.md` (planner, frozen blueprint)
- 본 문서는 planner가 동결한 UI 계약(DOM id/class, 상태, design token, 접근성, 반응형)을 **재정의하지 않고** 그대로 시각화한다.
- mockup 참조: `docs/design/markdown-preview-BF-2011-mockup.html`

## 1. 시안 개요

- **변경 범위**: 사용자가 텍스트영역(`#markdown-input`)에 마크다운을 입력하면, 같은 화면의 미리보기 영역(`#markdown-preview-output`)에 변환된 HTML이 실시간으로 표시되는 정적 2-pane 레이아웃(편집 pane + 미리보기 pane).
- **사용자 경험 목표**:
  - 입력과 결과를 한 화면에서 동시에 확인할 수 있는 즉시성(instant feedback).
  - 빈 입력 상태에서도 무엇을 해야 하는지 명확히 안내(색상에만 의존하지 않는 상태 표시).
  - 스크린리더 사용자도 렌더 결과 변경을 인지할 수 있도록 `aria-live="polite"` 적용.
  - 320px 이상 모든 뷰포트에서 두 pane이 겹치지 않고, 콘텐츠가 넘치지 않음.

## 2. 컬러 팔레트

frozen UI 계약(4.3절)의 design token을 그대로 사용한다. 값 재정의 없음.

| 역할 | 토큰 | 값 | 적용 위치 |
|---|---|---|---|
| Background | `--color-bg` | `#ffffff` | `.app-shell` 배경 |
| Text | `--color-text` | `#1f2937` | `.app-shell` 기본 텍스트 색상 |
| Border | `--color-border` | `#d1d5db` | `.editor-pane`, `.preview-pane` 경계선 |

- primary/secondary/accent 색상은 이번 범위에 없다 — frozen 계약이 정의한 3개 토큰(bg/text/border)만 사용하며 새 색상을 발명하지 않는다.
- 상태(`empty-placeholder`/`live-preview`) 구분은 색상이 아닌 텍스트 문구와 `data-state` 속성으로 이루어진다(접근성 요구사항, 4.4절 참조).

## 3. 타이포그래피

| 용도 | font-family | size | weight | line-height |
|---|---|---|---|---|
| 전체 base (heading/body 공통) | `--font-family-base`: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | body 16px | normal(400) | 1.5 |
| 미리보기 `<h1>` | 동일 base | 1.75rem(28px) | 600 | 1.3 |
| 미리보기 `<h2>` | 동일 base | 1.375rem(22px) | 600 | 1.3 |
| 미리보기 `<h3>` | 동일 base | 1.125rem(18px) | 600 | 1.3 |
| 미리보기 `<code>`/`<pre><code>` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | 0.9em | normal | 1.5 |
| caption(안내 문구 등) | 동일 base | 0.875rem(14px) | normal | 1.5 |

- frozen 계약은 `--font-family-base` 1개 토큰만 정의하므로, 별도 heading/caption 전용 폰트 토큰을 새로 만들지 않고 size/weight만 CSS 규칙으로 구분한다.

## 4. 레이아웃

### 4.1 섹션 구조

```
#markdown-app.app-shell
├─ .editor-pane
│   ├─ <label for="markdown-input">마크다운 입력</label>
│   └─ <textarea id="markdown-input" aria-label="마크다운 소스 입력">
└─ .preview-pane
    └─ <div id="markdown-preview-output" aria-live="polite" data-state="...">
```

- id는 `markdown-app`, `markdown-input`, `markdown-preview-output` 정확히 3개만 사용.
- class는 `app-shell`, `editor-pane`, `preview-pane` 정확히 3개만 사용 — 새 class 발명 금지.

### 4.2 Spacing

- `.editor-pane`과 `.preview-pane` 사이 간격: `--space-pane-gap: 16px`.
- pane 내부 padding: 16px(권장, frozen 토큰 아님 — dev 재량이나 본 mockup 기준값).
- `.app-shell` 외곽 padding: 16px.

### 4.3 Breakpoint 별 동작

| 뷰포트 | `.app-shell` 배치 | 비고 |
|---|---|---|
| 320px ~ 639px | `flex-direction: column` (세로 스택) | `.editor-pane`, `.preview-pane` 각각 폭 100% |
| 640px 이상 | `flex-direction: row`, `gap: var(--space-pane-gap)` | 두 pane 각각 50% 폭(1:1 분할) |

- 모든 구간에서 `.editor-pane`/`.preview-pane`은 `overflow: auto`(또는 동등 처리)로 내부 콘텐츠가 컨테이너 밖으로 흘러나오지 않게 한다.
- 320px 미만은 지원 범위 밖(frozen 계약 기준).

## 5. 컴포넌트 명세

### 5.1 `#markdown-app` (`.app-shell`)

- 역할: 루트 컨테이너. flex 레이아웃으로 두 pane을 감싼다.
- props/상태 없음(정적 컨테이너).
- 스타일: `background: var(--color-bg)`, `color: var(--color-text)`, `font-family: var(--font-family-base)`.

### 5.2 `.editor-pane`

- 하위 요소: `<label for="markdown-input">`, `<textarea id="markdown-input">`.
- 상태: 항상 활성(disabled 없음) — AC3(초기화 후에도 계속 입력 가능)을 만족하기 위해 어떤 상태에서도 textarea는 재사용 가능해야 한다.
- 인터랙션: `input` 이벤트 발생 시 `#markdown-preview-output` 갱신(로직은 developer 구현, 본 mockup은 정적 시각화).
- 스타일: `border: 1px solid var(--color-border)`, 내부 textarea는 `width: 100%; height: 100%; resize: vertical`.

### 5.3 `.preview-pane` / `#markdown-preview-output`

- props: `data-state`(`empty-placeholder` | `live-preview`), `aria-live="polite"`.
- 상태별 표현:

| 상태 | 트리거 | 내용 | `data-state` |
|---|---|---|---|
| `empty-placeholder` | 초기 로드, 또는 입력값이 빈 문자열/공백뿐 | 안내 텍스트("마크다운을 입력하면 미리보기가 표시됩니다") | `empty-placeholder` |
| `live-preview` | 입력값 1자 이상 | `renderMarkdown(text)` 반환 HTML | `live-preview` |

- 색상만으로 상태를 구분하지 않는다 — 두 상태 모두 화면에 보이는 문구/콘텐츠 자체가 다르며, `data-state`가 스타일 훅/테스트 훅 역할을 한다.
- 스타일: `border: 1px solid var(--color-border)`.

## 6. AC 매핑표 — 지원 문법 → 화면 표현

implementation-plan.md 5절(마크다운 문법 변환 규칙표)을 시각 표현 기준으로 매핑한다. 변환 로직 자체는 developer 소유(`markdown.js`)이며, 본 표는 화면에 어떻게 보여야 하는지만 규정한다.

| # | 문법(AC2 지원 범위) | 입력 예시 | 미리보기 화면 표현 |
|---|---|---|---|
| 1 | 헤딩1 | `# 제목` | 굵은 대제목(28px, weight 600)으로 표시 |
| 2 | 헤딩2 | `## 제목` | 굵은 중제목(22px, weight 600)으로 표시 |
| 3 | 헤딩3 | `### 제목` | 굵은 소제목(18px, weight 600)으로 표시 |
| 4 | 굵게 | `**굵게**` | 인라인 굵은 글씨(`<strong>`) |
| 5 | 기울임 | `*기울임*` | 인라인 기울임 글씨(`<em>`) |
| 6 | 인라인 코드 | `` `code` `` | 모노스페이스 폰트 + 옅은 배경 박스로 구분되는 인라인 코드 |
| 7 | 코드 블록 | ` ```\ncode\n``` ` | 모노스페이스 폰트, 박스형 배경(`<pre><code>`), 내부는 인라인 문법(굵게/기울임 등) 미해석 — 원문 그대로 표시 |
| 8 | 목록 | `- 항목1\n- 항목2` | 불릿 목록(`<ul><li>`)으로 세로 나열, 연속된 `-` 줄은 하나의 목록으로 묶임 |
| 9 | 링크 | `[텍스트](https://example.com)` | 밑줄/강조 색의 클릭 가능한 링크 텍스트(`<a>`), 허용 스킴(`http`/`https`/`mailto`) 외에는 링크가 아닌 일반 텍스트로 표시 |
| 10 | 일반 텍스트 | `그냥 문장` | 문단(`<p>`)으로 표시 |
| 11 | 빈 입력(AC1) | (없음) | `empty-placeholder` 안내 문구가 미리보기 영역 전체에 표시 |
| 12 | 초기화 후 복귀(AC3) | 입력 전체 삭제 | `empty-placeholder` 상태로 복귀, textarea는 계속 입력 가능 |
| 13 | 위험 HTML/스크립트(AC4) | `<script>alert(1)</script>` | 태그가 실행되지 않고 이스케이프된 원문 텍스트(`&lt;script&gt;...`)로 표시 |
| 14 | 위험 스킴 링크(AC4 연장) | `[클릭](javascript:alert(1))` | 링크가 아닌 일반 텍스트로 표시(밑줄/색 없음) |

## 7. dev 구현 가이드

developer(`markdown-preview/index.html`, `markdown-preview/style.css`, `markdown-preview/markdown.js`)가 따라야 할 단계:

1. **DOM 구조**: implementation-plan.md 4.1절의 마크업을 그대로 사용한다(id 3개, class 3개 — 추가/변경 금지).
2. **CSS 변수 정의 위치**: `style.css`의 `:root` 또는 `#markdown-app`에 아래 5개 토큰을 정의한다.
   - `--color-bg: #ffffff;`
   - `--color-text: #1f2937;`
   - `--color-border: #d1d5db;`
   - `--font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`
   - `--space-pane-gap: 16px;`
3. **클래스명**: `.app-shell`(flex 컨테이너, `flex-direction`을 breakpoint에 따라 column/row 전환), `.editor-pane`, `.preview-pane`(각각 `border: 1px solid var(--color-border)`, `overflow: auto`).
4. **상태 전환 로직**: `#markdown-input`의 `input` 이벤트에서 `value.trim()`이 빈 문자열이면 `data-state="empty-placeholder"` + 안내 문구로 되돌리고, 아니면 `data-state="live-preview"` + `renderMarkdown(value)` 결과로 `innerHTML`을 교체한다.
5. **접근성**: `#markdown-input`에 `aria-label="마크다운 소스 입력"`, `#markdown-preview-output`에 `aria-live="polite"` 고정 — 상태 전환 시에도 속성 유지.
6. **반응형**: 미디어쿼리 `@media (min-width: 640px)`에서 `.app-shell { flex-direction: row; gap: var(--space-pane-gap); }`, 그 미만은 `flex-direction: column`(기본값).
7. **렌더 로직**: `renderMarkdown(text)`는 `markdown.js`에 순수 함수로 구현(부수효과 없음). 처리 순서·이스케이프·허용 링크 스킴은 implementation-plan.md 5~6절을 그대로 따른다. 본 문서는 화면 표현만 규정하며 파싱 로직을 재정의하지 않는다.
8. **XSS 방지 확인**: mockup은 위험 입력 예시를 정적 텍스트로만 보여준다(6절 13, 14번 행) — 실제 이스케이프/스킴 검증 로직은 `markdown.js`가 담당한다.

## 8. mockup 참조

- 파일: `docs/design/markdown-preview-BF-2011-mockup.html`
- 구성: 단일 HTML 파일 내에서 `empty-placeholder` 상태와 `live-preview` 상태를 각각 별도 섹션으로 정적 시뮬레이션(mockup은 정적이므로 두 상태를 나란히 비교 배치).
- `live-preview` 섹션은 6절의 지원 문법 예시(헤딩/굵게/기울임/인라인 코드/코드 블록/목록/링크/일반 텍스트/XSS 이스케이프 예시)를 모두 포함한 결과를 보여준다.
- 반응형 동작(320px~639px 세로 스택, 640px 이상 가로 배치)은 실제 CSS 미디어쿼리로 mockup에도 동일하게 구현되어 있어 브라우저 폭을 좁히면 확인 가능하다.
