// markdown-preview/markdown.test.js
// node --test 로 실행하는 renderMarkdown(text) 순수 함수 회귀 테스트.
// 근거: docs/plans/BF-2011/implementation-plan.md §7 테스트 케이스 목록
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './markdown.js';

test('빈 문자열 입력 시 빈 문자열을 반환한다', () => {
  assert.strictEqual(renderMarkdown(''), '');
});

test('공백뿐인 입력도 빈 문자열을 반환한다', () => {
  assert.strictEqual(renderMarkdown('   \n  '), '');
});

test('# 헤딩1을 <h1>로 변환한다', () => {
  assert.strictEqual(renderMarkdown('# 제목'), '<h1>제목</h1>');
});

test('## / ### 헤딩을 <h2>/<h3>로 변환한다', () => {
  assert.strictEqual(renderMarkdown('## 제목'), '<h2>제목</h2>');
  assert.strictEqual(renderMarkdown('### 제목'), '<h3>제목</h3>');
});

test('**굵게**를 <strong>으로 변환한다', () => {
  assert.strictEqual(renderMarkdown('**굵게**'), '<p><strong>굵게</strong></p>');
});

test('*기울임*을 <em>으로 변환한다', () => {
  assert.strictEqual(renderMarkdown('*기울임*'), '<p><em>기울임</em></p>');
});

test('인라인 코드(`code`)를 <code>로 변환한다', () => {
  assert.strictEqual(renderMarkdown('`code`'), '<p><code>code</code></p>');
});

test('코드 블록(```)을 <pre><code>로 변환하고 내부는 인라인 문법을 해석하지 않는다', () => {
  const input = '```\n**not bold**\n```';
  assert.strictEqual(renderMarkdown(input), '<pre><code>**not bold**</code></pre>');
});

test('연속된 - 목록 항목을 하나의 <ul>로 묶는다', () => {
  const input = '- 항목1\n- 항목2';
  assert.strictEqual(renderMarkdown(input), '<ul><li>항목1</li><li>항목2</li></ul>');
});

test('[텍스트](https://example.com) 링크를 안전한 <a href rel="noopener noreferrer">로 변환한다', () => {
  const input = '[텍스트](https://example.com)';
  assert.strictEqual(
    renderMarkdown(input),
    '<p><a href="https://example.com" rel="noopener noreferrer">텍스트</a></p>'
  );
});

test('<script>alert(1)</script> 같은 원본 HTML을 이스케이프해 스크립트가 실행되지 않게 한다', () => {
  const result = renderMarkdown('<script>alert(1)</script>');
  assert.doesNotMatch(result, /<script>/);
  assert.match(result, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('javascript: 스킴 링크는 href를 제거하고 텍스트만 렌더한다', () => {
  const input = '[클릭](javascript:alert(1))';
  const result = renderMarkdown(input);
  assert.doesNotMatch(result, /href=/);
  assert.match(result, /클릭/);
});

test('코드 블록 내부의 HTML 특수문자(<, >, &)도 이스케이프한다', () => {
  const input = '```\n<div>&amp;</div>\n```';
  assert.strictEqual(
    renderMarkdown(input),
    '<pre><code>&lt;div&gt;&amp;amp;&lt;/div&gt;</code></pre>'
  );
});

test('종료 fence가 없는 코드 블록은 문서 끝까지를 코드 블록으로 간주한다', () => {
  const input = '```\nline1\nline2';
  assert.strictEqual(renderMarkdown(input), '<pre><code>line1\nline2</code></pre>');
});

test('짝이 맞지 않는 * 는 원문 문자를 이스케이프된 텍스트로 그대로 출력한다', () => {
  const input = '*짝없음';
  assert.strictEqual(renderMarkdown(input), '<p>*짝없음</p>');
});

test('일반 텍스트는 <p>로 감싼다', () => {
  assert.strictEqual(renderMarkdown('그냥 문장'), '<p>그냥 문장</p>');
});
