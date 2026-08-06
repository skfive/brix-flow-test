// progress.html 진행 막대 데모 회귀 테스트 (BF-1845)
// node --test 전용. 브라우저/DOM 없이 HTML 구조·동결 계약·순수 로직(clamp/status)만 검증한다.
// 동결 UI 계약: docs/plans/BF-1843/implementation-plan.md §4 (ui-contract@v1)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(__dirname, '..', 'progress.html');
const html = readFileSync(HTML_PATH, 'utf8');

// 동결 DOM ID (§4.2)
const DOM_IDS = [
  'progress-root',
  'progress-bar',
  'progress-fill',
  'progress-label',
  'progress-increment',
  'progress-reset',
];

// 동결 CSS class (§4.3)
const CSS_CLASSES = [
  'progress',
  'progress__track',
  'progress__fill',
  'progress__label',
  'progress__control',
];

// 동결 design token (§4.5)
const DESIGN_TOKENS = {
  '--color-progress-fill': '#2563eb',
  '--color-progress-track': '#e5e7eb',
  '--progress-height': '24px',
  '--progress-radius': '12px',
};

test('동결 DOM ID 6종이 모두 존재한다', () => {
  for (const id of DOM_IDS) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `누락된 id: ${id}`);
  }
});

test('동결 CSS class 5종이 모두 존재한다', () => {
  for (const cls of CSS_CLASSES) {
    assert.ok(html.includes(cls), `누락된 class: ${cls}`);
  }
});

test('동결 design token 4종이 정확한 값으로 정의된다', () => {
  for (const [token, value] of Object.entries(DESIGN_TOKENS)) {
    assert.match(
      html,
      new RegExp(`${token}\\s*:\\s*${value}`, 'i'),
      `누락/불일치 token: ${token}=${value}`,
    );
  }
});

test('외부 의존성이 없다 (src/href로 외부 리소스 로드 금지, inline만 허용)', () => {
  // http(s) 외부 스크립트/스타일/링크 로드가 없어야 file://에서 렌더된다.
  assert.doesNotMatch(html, /<script[^>]+src=/i, '외부 script src 발견');
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i, '외부 link href 발견');
  assert.doesNotMatch(html, /<img[^>]+src=["']https?:/i, '외부 img src 발견');
});

test('progress-bar는 role="progressbar"와 aria-valuemin/max/now를 갖는다 (§4.6)', () => {
  const bar = html.match(/<[^>]*id=["']progress-bar["'][^>]*>/i);
  assert.ok(bar, 'progress-bar 요소를 찾지 못함');
  const tag = bar[0];
  assert.match(tag, /role=["']progressbar["']/i, 'role="progressbar" 누락');
  assert.match(tag, /aria-valuemin=["']0["']/i, 'aria-valuemin="0" 누락');
  assert.match(tag, /aria-valuemax=["']100["']/i, 'aria-valuemax="100" 누락');
  assert.match(tag, /aria-valuenow=["']0["']/i, '초기 aria-valuenow="0" 누락');
});

test('두 control은 명시적 aria-label을 갖는다 (§4.6)', () => {
  const inc = html.match(/<[^>]*id=["']progress-increment["'][^>]*>/i);
  const rst = html.match(/<[^>]*id=["']progress-reset["'][^>]*>/i);
  assert.ok(inc, 'progress-increment 요소를 찾지 못함');
  assert.ok(rst, 'progress-reset 요소를 찾지 못함');
  assert.match(inc[0], /aria-label=["'][^"']+["']/i, 'increment aria-label 누락');
  assert.match(rst[0], /aria-label=["'][^"']+["']/i, 'reset aria-label 누락');
});

test('세 상태명(idle/progressing/complete)이 화면 텍스트로 노출된다 (색상 외 구분)', () => {
  // 상태명이 스크립트 상수로 존재해 라벨/접근성 이름에 반영됨을 확인
  for (const state of ['idle', 'progressing', 'complete']) {
    assert.ok(html.includes(state), `상태명 누락: ${state}`);
  }
});

// --- 순수 로직 추출 검증: HTML inline script의 clampProgress/deriveStatus를 실제로 실행한다 ---
function extractPureLogic() {
  const start = '// --- pure logic (testable) ---';
  const end = '// --- end pure logic ---';
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  assert.ok(s !== -1 && e !== -1 && e > s, 'pure logic 블록을 찾지 못함');
  const block = html.slice(s + start.length, e);
  // eslint-disable-next-line no-new-func
  return new Function(`${block}; return { clampProgress, deriveStatus };`)();
}

test('clampProgress는 0~100 범위로 clamp한다 (E1/E3)', () => {
  const { clampProgress } = extractPureLogic();
  assert.equal(clampProgress(-5), 0, '음수는 0으로');
  assert.equal(clampProgress(0), 0);
  assert.equal(clampProgress(50), 50);
  assert.equal(clampProgress(100), 100);
  assert.equal(clampProgress(105), 100, '100 초과는 100으로');
});

test('deriveStatus는 value에서 상태를 파생한다 (§5)', () => {
  const { deriveStatus } = extractPureLogic();
  assert.equal(deriveStatus(0), 'idle');
  assert.equal(deriveStatus(1), 'progressing');
  assert.equal(deriveStatus(99), 'progressing');
  assert.equal(deriveStatus(100), 'complete');
});
