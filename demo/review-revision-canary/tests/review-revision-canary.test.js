// BF-1195: 리뷰 재작업 자동수렴 상태 패널 — 단위 테스트 (node --test, ESM)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  escapeHtml,
  renderStagePanel,
  renderStatusPanel,
} from '../../../src/demo/review-revision-canary/render.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const dataDir = join(repoRoot, 'src/demo/review-revision-canary/data');

async function loadJson(name) {
  return JSON.parse(await readFile(join(dataDir, name), 'utf8'));
}

async function loadAll() {
  return {
    stage: await loadJson('stage.json'),
    revision: await loadJson('revision.json'),
    review: await loadJson('review.json'),
  };
}

test('AC1: 정적 카나리 데이터 JSON 3종이 모두 유효하게 파싱된다', async () => {
  const { stage, revision, review } = await loadAll();
  assert.ok(Array.isArray(stage.stages) && stage.stages.length > 0);
  assert.equal(typeof stage.activeIndex, 'number');
  assert.ok(stage.activeIndex >= 0 && stage.activeIndex < stage.stages.length);
  assert.equal(typeof revision.latest, 'number');
  assert.ok('requestedChanges' in revision);
  assert.equal(typeof review.reviewer, 'string');
  assert.ok('verdict' in review);
});

test('AC1: 상태 패널이 정적 데이터로 정상 렌더된다 (검증 단계·revision·검토 결과)', async () => {
  const data = await loadAll();
  const html = renderStatusPanel(data);
  assert.match(html, /현재 검증 단계/);
  assert.match(html, /최신 revision/);
  assert.match(html, /검토 결과/);
  assert.match(html, new RegExp(data.review.reviewer));
  assert.match(html, new RegExp(String(data.revision.latest)));
});

test('AC1: 렌더된 검증 단계 목록이 activeIndex 를 active 로 표시한다', async () => {
  const { stage } = await loadAll();
  const html = renderStagePanel(stage);
  const activeName = stage.stages[stage.activeIndex];
  assert.match(html, new RegExp(`data-state="active"[^>]*>${activeName}`));
});

test('AC3: revision 단계에서 상태 변경 영역의 pending 표식이 완전히 제거된다', async () => {
  const html = renderStatusPanel(await loadAll());
  assert.match(html, /data-region="review-status"/);
  assert.doesNotMatch(html, /data-review-cycle/);
  assert.doesNotMatch(html, /pending/);
});

test('AC3: revision 단계 상태 변경 영역에 aria-live="polite" 가 추가된다', async () => {
  const html = renderStatusPanel(await loadAll());
  const region = html.match(/<div class="status-region"[^>]*>/);
  assert.ok(region, 'status-region 엘리먼트가 존재해야 한다');
  assert.match(region[0], /aria-live="polite"/);
});

test('index.html 엔트리에 앱 마운트 지점·aria-live·모듈 스크립트가 있고 pending 표식이 없다', async () => {
  const html = await readFile(join(repoRoot, 'demo/review-revision-canary/index.html'), 'utf8');
  assert.match(html, /id="app"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /data-review-cycle/);
  assert.match(html, /main\.js/);
});

test('escapeHtml 이 특수문자를 이스케이프한다', () => {
  assert.equal(escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
});
