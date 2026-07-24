// 릴리스 준비도 렌더 헬퍼 단위 테스트 (BF-1146)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  escapeHtml,
  renderSummary,
  renderBlockingList,
  renderReadinessView,
} from '../../../src/features/release-readiness-canary/render.js';
import { deriveReadiness } from '../../../src/features/release-readiness-canary/readiness.js';
import { RELEASE_READINESS_FIXTURE } from '../../../src/features/release-readiness-canary/fixture.js';

test('escapeHtml: HTML 특수문자 escape', () => {
  assert.equal(escapeHtml('<b>&"\'</b>'), '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
});

test('renderSummary: 완료율/차단 개수/릴리스 상태 마크업', () => {
  const r = deriveReadiness(RELEASE_READINESS_FIXTURE);
  const html = renderSummary(r);
  assert.match(html, /data-completion-rate="55"/);
  assert.match(html, /55%/);
  assert.match(html, /data-blocking-count="1"/);
  assert.match(html, /data-release-ready="false"/);
  assert.match(html, /릴리스 차단됨/);
});

test('renderBlockingList: 차단 항목 있을 때 목록 렌더', () => {
  const r = deriveReadiness(RELEASE_READINESS_FIXTURE);
  const html = renderBlockingList(r);
  assert.match(html, /data-blocking-id="e2e"/);
  assert.match(html, /E2E 스모크 통과/);
});

test('renderBlockingList: 차단 항목 없으면 빈 상태 안내', () => {
  const r = deriveReadiness([
    { id: 'a', name: 'A', items: [{ id: 'i', label: 'x', status: 'done', blocking: true }] },
  ]);
  const html = renderBlockingList(r);
  assert.match(html, /data-blocking-empty="true"/);
});

test('renderReadinessView: 영역별 섹션 + 요약 + 차단 섹션 포함', () => {
  const r = deriveReadiness(RELEASE_READINESS_FIXTURE);
  const html = renderReadinessView(r);
  assert.match(html, /data-area-id="quality"/);
  assert.match(html, /data-area-id="testing"/);
  assert.match(html, /영역별 체크리스트/);
  assert.match(html, /data-completion-rate="55"/);
});
