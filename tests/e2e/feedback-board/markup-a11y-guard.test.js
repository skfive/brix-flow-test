// BF-1077 — 피드백 보드 UI 마크업 / 접근성 contract 정적 가드.
// dev(BF-1075) 가 이미 단위 로직(demo/feedback-board/tests/feedback-board.test.js) 을
// 검증했으므로, 여기서는 app.js 가 참조하는 HTML id·ARIA 속성이 silent break 되지
// 않도록 존재만 확인한다 (위치/순서 무관 — includes 기반).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
const _BRIX_MY_MODULE = 'feedback-board';
const _brixOutOfScope =
  process.env.BRIX_TEST_SCOPE === 'focused' &&
  !!process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const INDEX_PATH = path.join('demo', 'feedback-board', 'index.html');
const APP_PATH = path.join('demo', 'feedback-board', 'app.js');

const html = fs.readFileSync(INDEX_PATH, 'utf-8');
const appJs = fs.readFileSync(APP_PATH, 'utf-8');

// app.js 의 el(id) 호출이 참조하는 DOM id — 하나라도 사라지면 런타임 TypeError.
const REQUIRED_IDS = [
  'fb-recovery',
  'fb-recovery-close',
  'kpi-total',
  'kpi-open',
  'kpi-planned',
  'kpi-done',
  'kpi-rate',
  'kpi-avg',
  'fb-form',
  'fb-title',
  'fb-category',
  'fb-content',
  'fb-status-filter',
  'fb-category-filter',
  'fb-export',
  'fb-list',
  'fb-empty',
  'fb-toast',
];

test('BF-1077 마크업 가드 — app.js 가 참조하는 필수 DOM id 가 index.html 에 존재', { skip: _brixOutOfScope }, () => {
  REQUIRED_IDS.forEach((id) => {
    assert.ok(
      html.includes(`id="${id}"`),
      `#${id} 가 index.html 에 없음 (app.js 의 el('${id}') 가 깨짐)`
    );
  });
});

test('BF-1077 접근성 가드 — 손상 복구 배너 / 토스트 / 필터 그룹의 ARIA 계약 유지', { skip: _brixOutOfScope }, () => {
  // 손상 복구 배너 — role=status (AC-7 스크린리더 고지)
  assert.ok(html.includes('id="fb-recovery" class="recovery-banner" role="status"'));
  assert.ok(html.includes('aria-label="알림 닫기"'));
  // 저장 실패 토스트 — role=alert (§6.3)
  assert.ok(html.includes('id="fb-toast" class="toast" role="alert"'));
  // 상태 필터 세그먼트 — role=group + aria-label + 각 버튼 aria-pressed
  assert.ok(html.includes('id="fb-status-filter"') && html.includes('role="group" aria-label="상태 필터"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('aria-pressed="false"'));
  // 카테고리 필터 select — 스크린리더용 aria-label
  assert.ok(html.includes('id="fb-category-filter"') && html.includes('aria-label="카테고리 필터"'));
});

test('BF-1077 CORS 안전 가드 (file:// 호환) — <script type="module"> · fetch() 미사용', { skip: _brixOutOfScope }, () => {
  assert.ok(!/<script[^>]*type=["']module["']/.test(html), 'index.html 에 <script type="module"> 사용 금지 (file:// 호환 깨짐)');
  assert.ok(!/\bfetch\s*\(/.test(appJs), 'app.js 에 fetch() 사용 금지 (vanilla-static CORS 규약)');
});
