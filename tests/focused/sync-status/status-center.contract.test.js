/**
 * tests/focused/sync-status/status-center.contract.test.js — 상태 센터 회귀 가드 (BF-1166)
 *
 * dev(BF-1164) 는 status.js 의 순수 함수(startSync/resolveSync/nextOutcome/recordCheckCost/
 * recordRetryOutcome/summarize/sortBySeverity/...)를 src/features/sync-status/status.test.js 에서
 * 이미 자체 검증했다. 본 파일은 그 중복을 피하고 tester 고유 영역만 다룬다:
 *
 * - UI 마크업 contract: 핵심 id/class 가 존재하는지 (silent break 가드)
 * - CORS 안전(file:// 호환): <script type="module"> 미사용 · fetch() 미사용
 * - fixtures.js(정적 데이터) ↔ status.js(순수 로직) 사이의 cross-file 정합성
 *   (dev 의 단위 테스트는 리터럴 입력만 검증하며, 실제 fixture 데이터가 그 계약을
 *   satisfy 하는지는 아무도 검증하지 않았다 — 이 부분이 tester 고유 회귀 위험 지점)
 *
 * 실행: node --test tests/focused/sync-status/status-center.contract.test.js
 * (Node 내장 assert/fs 만 사용 — 결정론적, 네트워크/타이머 의존 없음)
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

const HTML_PATH = path.join(ROOT, 'src/routes/sync-status/index.html');
const CSS_PATH = path.join(ROOT, 'src/routes/sync-status/style.css');
const STATUS_JS_PATH = path.join(ROOT, 'src/features/sync-status/status.js');
const FIXTURES_JS_PATH = path.join(ROOT, 'src/features/sync-status/fixtures.js');

const html = fs.readFileSync(HTML_PATH, 'utf-8');
const css = fs.readFileSync(CSS_PATH, 'utf-8');
const statusSrc = fs.readFileSync(STATUS_JS_PATH, 'utf-8');
const fixturesSrc = fs.readFileSync(FIXTURES_JS_PATH, 'utf-8');

test('마크업 contract — 핵심 id 존재 (silent break 가드)', () => {
  [
    'id="refresh-all"',
    'id="live-polite"',
    'id="live-assertive"',
    'id="summary-bar"',
    'id="kpi-summary"',
    'id="filter-bar"',
    'id="repo-list"',
    'id="empty-state"',
    'id="last-full-sync"',
  ].forEach((needle) => {
    assert.ok(html.includes(needle), `누락된 id 마크업: ${needle}`);
  });
});

test('마크업 contract — aria-live 컨테이너 2종(polite/assertive) 유지', () => {
  assert.ok(html.includes('aria-live="polite"'), 'aria-live="polite" 누락');
  assert.ok(html.includes('aria-live="assertive"'), 'aria-live="assertive" 누락');
});

test('CORS 안전(file:// 호환) — index.html 에 <script type="module"> 미사용', () => {
  assert.ok(!/<script[^>]*type\s*=\s*["']module["']/.test(html), 'ESM <script type="module"> 은 file:// 에서 CORS 로 차단됨');
});

test('CORS 안전(file:// 호환) — status.js/fixtures.js 에 fetch() 네트워크 호출 없음', () => {
  assert.ok(!/\bfetch\s*\(/.test(statusSrc), 'status.js 는 정적 fixture 전용이어야 하며 fetch 를 쓰면 안 됨');
  assert.ok(!/\bfetch\s*\(/.test(fixturesSrc), 'fixtures.js 는 정적 데이터 전용이어야 하며 fetch 를 쓰면 안 됨');
});

test('디자인 토큰 contract — 6-state 배지/필터 CSS 선택자 존재', () => {
  [
    '.status-badge--idle',
    '.status-badge--up_to_date',
    '.status-badge--behind',
    '.status-badge--syncing',
    '.status-badge--conflict',
    '.status-badge--failed',
    '.repo-row__error',
    '.segmented__btn',
    '.summary-tile--zero',
  ].forEach((sel) => {
    assert.ok(css.includes(sel), `CSS 선택자 누락: ${sel}`);
  });
});

test('cross-file 정합성 — fixtures.js 의 모든 outcome 이 status.js resolveSync 에서 허용됨', () => {
  const { SYNC_FIXTURES } = require(FIXTURES_JS_PATH);
  const S = require(STATUS_JS_PATH);
  assert.ok(Array.isArray(SYNC_FIXTURES.repos) && SYNC_FIXTURES.repos.length > 0, 'fixtures.repos 비어있음');
  SYNC_FIXTURES.repos.forEach((repo) => {
    assert.ok(Array.isArray(repo.outcomes) && repo.outcomes.length > 0, `${repo.id} 의 outcomes 큐가 비어있음`);
    repo.outcomes.forEach((outcome) => {
      assert.doesNotThrow(
        () => S.resolveSync(outcome),
        `${repo.id} 의 outcome '${outcome}' 이 resolveSync 에서 거부됨 — fixture/로직 정합성 깨짐`
      );
    });
  });
});

test('cross-file 정합성 — fixtures.js 저장소 id 중복 없음', () => {
  const { SYNC_FIXTURES } = require(FIXTURES_JS_PATH);
  const ids = SYNC_FIXTURES.repos.map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length, '저장소 id 중복 발견 — DOM data-repo-id 충돌 위험');
});

test('cross-file 정합성 — SYNC_REASONS 가 conflict/failed 2종 모두 커버', () => {
  const { SYNC_REASONS } = require(FIXTURES_JS_PATH);
  assert.ok(SYNC_REASONS.conflict && SYNC_REASONS.conflict.text && SYNC_REASONS.conflict.hint, 'conflict 사유 문구 누락');
  assert.ok(SYNC_REASONS.failed && SYNC_REASONS.failed.text && SYNC_REASONS.failed.hint, 'failed 사유 문구 누락');
});
