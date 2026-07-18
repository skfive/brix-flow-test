// BF-1039 반품 승인 워크벤치 — CSS 가시성 회귀 가드 (node --test)
// 배경: .empty-state/.load-error 는 display:flex 를 가져 native `hidden` 속성이 무력화됨.
//       app.js 가 el.hidden 을 토글해도 [hidden] 오버라이드가 없으면 화면에 계속 표시되는
//       회귀(리뷰 CHANGES_REQUESTED)가 발생. 이 가드는 오버라이드 존재를 강제한다.
// 실행: node --test return-approvals-canary/tests/return-approvals-canary-BF1039-css.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8');

// CSS 주석 제거 후 selector 별 display:none 여부를 파싱하는 헬퍼
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** selector 를 포함하는 rule 블록이 `display: none` 을 선언하는지 */
function hasDisplayNone(selectorAtom) {
  // selectorAtom (예: '.empty-state[hidden]') 이 등장하는 각 rule 블록을 스캔
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const selectors = m[1];
    const body = m[2];
    if (selectors.includes(selectorAtom) && /display\s*:\s*none/.test(body)) return true;
  }
  return false;
}

test('회귀 가드: .empty-state 는 [hidden] 시 display:none 으로 숨겨져야 함', () => {
  assert.ok(
    hasDisplayNone('.empty-state[hidden]'),
    '.empty-state[hidden] { display: none } 오버라이드 누락 — hidden 토글이 화면에 반영되지 않음',
  );
});

test('회귀 가드: .load-error 는 [hidden] 시 display:none 으로 숨겨져야 함', () => {
  assert.ok(
    hasDisplayNone('.load-error[hidden]'),
    '.load-error[hidden] { display: none } 오버라이드 누락 — hidden 토글이 화면에 반영되지 않음',
  );
});

test('회귀 가드: display:flex 를 쓰는 hidden-토글 요소는 [hidden] 오버라이드를 동반한다', () => {
  // .empty-state / .load-error 는 기본 display:flex 이므로 native hidden 이 반드시 오버라이드돼야 한다
  for (const atom of ['.empty-state[hidden]', '.load-error[hidden]']) {
    assert.ok(hasDisplayNone(atom), `${atom} 오버라이드 필요`);
  }
});
