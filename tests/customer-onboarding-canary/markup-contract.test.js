// BF-1071 — 온보딩 체크리스트 정적 마크업 contract 가드 (tester 고유 영역)
// 목적: e2e 시나리오가 의존하는 HTML id/class/root 마운트가 향후 리팩터링으로
// silent break 되지 않도록 fact 를 박제한다. dev 의 단위 로직(checklist.js)은
// demo/customer-onboarding-canary/tests/checklist.test.js 에서 이미 검증되어
// 여기서는 재검증하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'customer-onboarding-canary';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const html = fs.readFileSync('demo/customer-onboarding-canary/index.html', 'utf-8');
const appJs = fs.readFileSync('src/demo/customer-onboarding-canary/app.js', 'utf-8');

test('AC1 — root 마운트(#app)와 app.js module 진입점이 존재한다', { skip: _brixOutOfScope }, () => {
  assert.ok(html.includes('id="app"'), '#app 루트 컨테이너가 있어야 e2e 가 렌더 결과를 조회할 수 있다');
  assert.ok(
    html.includes('<script type="module" src="/src/demo/customer-onboarding-canary/app.js">'),
    'app.js 가 module 진입점으로 로드되어야 fixture fetch·렌더가 동작한다',
  );
});

test('AC1/AC2 — 정적 HTML 이 선언하는 CSS class 셀렉터 마커가 존재한다', { skip: _brixOutOfScope }, () => {
  const requiredStaticMarkers = [
    'onboarding-summary',
    'onboarding-customer-picker',
    'onboarding-readiness',
    'onboarding-progress',
    'onboarding-checklist',
    'checklist-item',
    'item-complete-btn',
    'onboarding-next-action',
    'onboarding-empty',
  ];
  for (const marker of requiredStaticMarkers) {
    assert.ok(html.includes(marker), `index.html 의 style 선언에 필수 class 마커 누락: ${marker}`);
  }
});

test('AC1/AC2 — 렌더 진입점(app.js)이 e2e 가 조회할 동적 id/data 마커를 생성한다', { skip: _brixOutOfScope }, () => {
  const requiredDynamicMarkers = [
    "id: 'customer-select'",
    "id: 'checklist'",
    "id: 'next-action-message'",
    "dataset: { status: view.readinessStatus }",
    "dataset: { type: view.nextAction.type }",
    "dataset: { itemId: item.itemId, status: item.status }",
  ];
  for (const marker of requiredDynamicMarkers) {
    assert.ok(appJs.includes(marker), `app.js 의 필수 렌더 마커 누락: ${marker}`);
  }
});
