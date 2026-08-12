# BF-2011 마크다운 미리보기 — 구현 설계 (BF-2014)

- 관련 Task: BF-2011(Epic/Story), BF-2012(designer), BF-2013(developer)
- 상태: frozen blueprint 기준 설계 확정본 — designer/developer는 본 문서와 `docs/design/markdown-preview-BF-2011.md`(designer 산출물)의 exact UI 계약을 재정의하지 않고 그대로 구현한다.

## 1. 개요 / 목표

사용자가 텍스트영역에 마크다운을 입력하면, 같은 화면의 미리보기 영역에 변환된 HTML이 실시간으로 표시되는 정적 클라이언트 기능을 구현한다. 서버 API/데이터 모델 변경은 없다(순수 클라이언트 렌더링).

## 2. 파일 구조 및 소유권 (frozen — 추가/변경 금지)

| 경로 | 소유 페르소나 | 설명 |
|---|---|---|
| `docs/design/markdown-preview-BF-2011-mockup.html` | designer | 정적 목업 HTML |
| `docs/design/markdown-preview-BF-2011.md` | designer | 디자인 산출물 문서 |
| `markdown-preview/index.html` | developer | 실제 동작 페이지 |
| `markdown-preview/markdown.js` | developer | `renderMarkdown(text)` 순수 함수 구현 |
| `markdown-preview/markdown.test.js` | developer | `node --test` 단위 테스트 |
| `markdown-preview/style.css` | developer | 스타일 (design token 적용) |

새 파일이나 새 역할을 추가하지 않는다. 본 문서(`docs/plans/BF-2011/implementation-plan.md`)는 planner 소유이며 이번 작업의 유일한 변경 대상이다.

## 3. Acceptance Criteria (Given/When/Then)

**AC1 — 초기 상태**
- Given: 사용자가 `markdown-preview/index.html`을 처음 로드했다
- When: `#markdown-input`에 아무 입력도 없다
- Then: `#markdown-preview-output`은 `empty-placeholder` 상태이며, 안내 텍스트("마크다운을 입력하면 미리보기가 표시됩니다" 등)가 화면에 보이는 텍스트로 노출된다(색상만으로 구분하지 않음).

**AC2 — 실시간 변환**
- Given: `#markdown-input`에 지원 문법(#, ##, ###, **, *, 인라인 코드, 코드 블록, 목록, 링크)이 입력되었다
- When: `input` 이벤트가 발생한다
- Then: `#markdown-preview-output`은 `live-preview` 상태로 전환되고, `renderMarkdown(text)`의 반환 HTML로 내용이 교체되며, `aria-live="polite"`로 변경이 스크린리더에 알려진다.

**AC3 — 초기화 후 상태 복귀**
- Given: `live-preview` 상태에서 사용자가 `#markdown-input`의 내용을 모두 지웠다
- When: 입력값이 빈 문자열이 된다
- Then: `#markdown-preview-output`은 `empty-placeholder` 상태와 안내 텍스트로 되돌아가고, `#markdown-input`은 계속 입력 가능한 상태를 유지한다(주 실행 control 재사용 가능 — frozen invariant 준수).

**AC4 — XSS 방지**
- Given: `#markdown-input`에 `<script>`, `<img onerror=...>` 등 원본 HTML/스크립트가 입력되었다
- When: 미리보기가 렌더링된다
- Then: 태그가 실행되지 않고 이스케이프된 텍스트로만 표시된다.

**AC5 — 반응형**
- Given: 뷰포트 폭이 320px 이상이다
- When: 뷰포트 폭이 변한다
- Then: `.editor-pane`과 `.preview-pane`이 서로 겹치지 않고 세로 스택 또는 가로 배치로 전환되며 콘텐츠 overflow가 발생하지 않는다.

**실패/엣지 케이스**
- 닫히지 않은 코드 블록(``` 시작 후 종료 ``` 없음): 문서 끝까지를 코드 블록으로 간주해 렌더링한다(파싱 예외를 던지지 않는다).
- 짝이 맞지 않는 `**`/`*`: 마크다운으로 해석하지 않고 원문 문자를 이스케이프된 텍스트로 그대로 출력한다.
- `javascript:`, `data:` 등 위험 스킴의 링크: `href` 속성을 제거하고 링크 텍스트만 표시한다(AC4와 동일 원칙의 링크 버전).
- 매우 긴 입력: `renderMarkdown`은 동기 순수 함수로, 입력 길이에만 비례해 처리하고 별도 캐시/디바운스는 이번 범위에 포함하지 않는다(Non-goals 참조).

## 4. UI 계약 (exact — designer/developer 동일 적용, selector·token 재정의 금지)

### 4.1 DOM 구조

```html
<div id="markdown-app" class="app-shell">
  <div class="editor-pane">
    <label for="markdown-input">마크다운 입력</label>
    <textarea id="markdown-input" aria-label="마크다운 소스 입력"></textarea>
  </div>
  <div class="preview-pane">
    <div id="markdown-preview-output" aria-live="polite" data-state="empty-placeholder">
      마크다운을 입력하면 미리보기가 표시됩니다
    </div>
  </div>
</div>
```

- id: `markdown-app`(루트), `markdown-input`(textarea), `markdown-preview-output`(결과 영역) — 정확히 이 3개만 사용.
- class: `app-shell`, `editor-pane`, `preview-pane` — 정확히 이 3개만 사용. 새 class를 추가로 발명하지 않는다.
- `data-state` 속성(`empty-placeholder` | `live-preview`)은 상태 전환을 스타일 훅/테스트 훅으로 노출하기 위한 것으로 새 class 발명 없이 상태를 표현한다.

### 4.2 상태

| 상태 | 트리거 | `#markdown-preview-output` 내용 | `data-state` |
|---|---|---|---|
| `empty-placeholder` | 초기 로드 또는 입력값이 빈 문자열/공백뿐 | 안내 텍스트(화면에 보이는 문구, 색상 의존 없음) | `empty-placeholder` |
| `live-preview` | 입력값이 1자 이상 존재 | `renderMarkdown(text)`의 반환 HTML | `live-preview` |

상태 구분은 텍스트 내용 자체(안내 문구 vs 렌더 결과)와 `data-state` 속성으로 이루어지며 색상에만 의존하지 않는다(접근성 요구사항 충족).

### 4.3 Design Tokens

| 토큰 | 값 | 적용 위치 |
|---|---|---|
| `--color-bg` | `#ffffff` | `.app-shell` 배경 |
| `--color-text` | `#1f2937` | `.app-shell` 기본 텍스트 색상 |
| `--color-border` | `#d1d5db` | `.editor-pane`, `.preview-pane` 경계선 |
| `--font-family-base` | `-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif` | `.app-shell` 폰트 |
| `--space-pane-gap` | `16px` | `.editor-pane`과 `.preview-pane` 사이 간격 |

토큰 이름과 값은 `style.css`에서 `:root` 또는 `#markdown-app`에 정의하고 그대로 사용한다. 값 재정의 금지.

### 4.4 접근성

- `#markdown-input` textarea는 `aria-label="마크다운 소스 입력"`을 갖는다.
- `#markdown-preview-output`은 `aria-live="polite"`로 렌더 결과 변경을 스크린리더에 알린다.
- 모든 상태(`empty-placeholder`/`live-preview`)는 색상만으로 구분하지 않고, 상태명에 대응하는 문구가 화면 텍스트/접근성 이름으로 노출된다(4.2 참조).

### 4.5 반응형

- 320px 이상 모든 뷰포트에서 `.editor-pane`과 `.preview-pane`이 겹치지 않는다.
- 640px 미만: 세로 스택(`flex-direction: column`), 640px 이상: 가로 배치(`flex-direction: row`, `gap: var(--space-pane-gap)`).
- 두 pane 모두 `overflow: auto` 또는 동등 처리로 콘텐츠가 넘칠 때 컨테이너 밖으로 흘러나오지 않게 한다.

## 5. 마크다운 문법 변환 규칙표

인라인 변환 적용 순서(중요, 코드 블록 내부에는 인라인 변환을 적용하지 않음): **① 코드 블록/인라인 코드 → ② 굵게(`**`) → ③ 기울임(`*`) → ④ 링크**. 코드가 먼저 처리되어야 코드 안의 `**`, `*`가 오작동하지 않는다. 코드 블록/인라인 코드가 아닌 모든 텍스트는 변환 전에 HTML 특수문자(`& < > " '`)를 이스케이프한다.

| # | 문법 | 입력 예시 | 출력 HTML |
|---|---|---|---|
| 1 | 헤딩1 | `# 제목` | `<h1>제목</h1>` |
| 2 | 헤딩2 | `## 제목` | `<h2>제목</h2>` |
| 3 | 헤딩3 | `### 제목` | `<h3>제목</h3>` |
| 4 | 굵게 | `**굵게**` | `<strong>굵게</strong>` |
| 5 | 기울임 | `*기울임*` | `<em>기울임</em>` |
| 6 | 인라인 코드 | `` `code` `` | `<code>code</code>` |
| 7 | 코드 블록 | ` ```\ncode\n``` ` | `<pre><code>code</code></pre>` (내부 텍스트는 이스케이프만 하고 인라인 문법 미해석) |
| 8 | 목록 | `- 항목1\n- 항목2` (연속 줄) | `<ul><li>항목1</li><li>항목2</li></ul>` (연속된 `-` 줄은 하나의 `<ul>`로 묶음) |
| 9 | 링크 | `[텍스트](https://example.com)` | `<a href="https://example.com" rel="noopener noreferrer">텍스트</a>` (`http`/`https`/`mailto` 스킴만 허용, 그 외는 `href` 생략 후 텍스트만 렌더) |
| 10 | 일반 텍스트 | `그냥 문장` | `<p>그냥 문장</p>` (위 규칙에 해당하지 않는 줄은 문단으로 감싼다) |

## 6. `renderMarkdown(text)` 함수 명세

### 6.1 시그니처

```js
// markdown-preview/markdown.js (ESM)
/**
 * 마크다운 소스 문자열을 sanitized HTML 문자열로 변환하는 순수 함수.
 * DOM 접근/부수효과 없음. 동일 입력 → 항상 동일 출력.
 * @param {string} text - 원본 마크다운 소스 (예: #markdown-input.value)
 * @returns {string} - 렌더링 가능한 HTML 문자열 (XSS 안전)
 */
export function renderMarkdown(text) { /* ... */ }
```

### 6.2 처리 순서

1. `text`가 빈 문자열이거나 공백뿐이면 `''`을 반환한다(호출부가 이를 보고 `empty-placeholder` 상태를 표시).
2. 줄 단위로 분리하고 코드 블록(```` ``` ````로 시작/종료)을 우선 식별한다. 종료 fence가 없으면 문서 끝까지를 코드 블록으로 간주한다.
3. 코드 블록이 아닌 구간에서 블록 요소(헤딩, 목록, 문단)를 식별한다. 연속된 `- ` 줄은 하나의 `<ul>`로 묶는다.
4. 코드 블록이 아닌 모든 텍스트 조각은 먼저 HTML 이스케이프한다.
5. 이스케이프된 텍스트에 인라인 변환을 순서대로 적용한다: 인라인 코드 → 굵게 → 기울임 → 링크.
6. 링크의 `href`는 허용 스킴(`http:`, `https:`, `mailto:`)만 통과시키고, 그 외(`javascript:` 등)는 `href` 속성 없이 텍스트만 렌더한다.
7. 완성된 HTML 문자열을 반환한다.

## 7. 테스트 케이스 목록 (`markdown-preview/markdown.test.js`, `node --test`)

developer는 아래 최소 8개(실제 12개 제시) 케이스를 구현한다. 프레임워크: Node 내장 `node:test` + `node:assert/strict`.

1. `'빈 문자열 입력 시 빈 문자열을 반환한다'` — `renderMarkdown('')` === `''`
2. `'# 헤딩1을 <h1>로 변환한다'`
3. `'## / ### 헤딩을 <h2>/<h3>로 변환한다'`
4. `'**굵게**를 <strong>으로 변환한다'`
5. `'*기울임*을 <em>으로 변환한다'`
6. `'인라인 코드(`code`)를 <code>로 변환한다'`
7. `'코드 블록(```)을 <pre><code>로 변환하고 내부는 인라인 문법을 해석하지 않는다'` — 예: 코드 블록 안의 `**not bold**`가 그대로 텍스트로 남는지 검증
8. `'연속된 - 목록 항목을 하나의 <ul>로 묶는다'`
9. `'[텍스트](https://example.com) 링크를 안전한 <a href rel="noopener noreferrer">로 변환한다'`
10. `'<script>alert(1)</script> 같은 원본 HTML을 이스케이프해 스크립트가 실행되지 않게 한다'` (XSS)
11. `'javascript: 스킴 링크는 href를 제거하고 텍스트만 렌더한다'` (XSS)
12. `'코드 블록 내부의 HTML 특수문자(<, >, &)도 이스케이프한다'` (XSS)

각 테스트는 `renderMarkdown`을 호출한 뒤 `assert.strictEqual` 또는 `assert.match`로 기대 HTML 문자열/패턴을 검증한다.

## 8. Non-goals (이번 범위 제외)

- GFM 확장 문법(표, 취소선, 작업 목록, 인용문 등)
- 구문 강조(syntax highlighting)
- 입력 디바운스/스로틀, 렌더 결과 캐싱
- 마크다운 저장/공유/서버 전송 (서버 API·데이터 모델 변경 없음)
- 4단계 이상 헤딩(`####` 이상) — 지원 문법은 `#`/`##`/`###`로 한정
