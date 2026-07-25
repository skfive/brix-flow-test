// 리뷰 증거 히트맵 focused 테스트 (BF-1190)
// 권위 명령: node --test demo/review-evidence-heatmap/tests/*.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { FILES, RISK_META, VERIFY_META, RISK_ORDER, VERIFY_ORDER } from '../data.js';
import { filterFiles, computeStats, cellAriaLabel, countLabel } from '../filters.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// ---- 데이터 결정론 / 분포 (AC: 결정론적 예시 데이터) ----
test('FILES 는 20개 고정 레코드', () => {
  assert.equal(FILES.length, 20);
});

test('위험도 분포는 명세대로 critical3/high5/medium7/low5', () => {
  const by = (r) => FILES.filter((f) => f.risk === r).length;
  assert.equal(by('critical'), 3);
  assert.equal(by('high'), 5);
  assert.equal(by('medium'), 7);
  assert.equal(by('low'), 5);
});

test('모든 레코드가 필수 스키마 필드를 가진다', () => {
  for (const f of FILES) {
    assert.ok(typeof f.id === 'string' && f.id, `id: ${f.path}`);
    assert.ok(typeof f.path === 'string' && f.path);
    assert.ok(RISK_ORDER.includes(f.risk), `risk enum: ${f.risk}`);
    assert.ok(VERIFY_ORDER.includes(f.verify), `verify enum: ${f.verify}`);
    assert.equal(typeof f.changedLines, 'number');
    assert.equal(typeof f.findings, 'number');
    assert.equal(f.findings, f.issues.length, `findings 수 = issues 길이: ${f.path}`);
    assert.ok(Array.isArray(f.verifyLog) && f.verifyLog.length > 0);
  }
});

test('id 는 유일하다', () => {
  assert.equal(new Set(FILES.map((f) => f.id)).size, FILES.length);
});

// ---- 필터 (AC: 필터 적용 시 위험도/검증상태 기준 필터링) ----
test('필터 미지정 시 전체 반환', () => {
  assert.equal(filterFiles(FILES, {}).length, 20);
  assert.equal(filterFiles(FILES, { risks: new Set(), verify: new Set() }).length, 20);
});

test('위험도 단일 필터', () => {
  const r = filterFiles(FILES, { risks: ['critical'] });
  assert.equal(r.length, 3);
  assert.ok(r.every((f) => f.risk === 'critical'));
});

test('위험도 다중 필터(OR)', () => {
  const r = filterFiles(FILES, { risks: ['critical', 'high'] });
  assert.equal(r.length, 8);
});

test('검증상태 필터', () => {
  const verifiedCount = FILES.filter((f) => f.verify === 'verified').length;
  const r = filterFiles(FILES, { verify: ['verified'] });
  assert.equal(r.length, verifiedCount);
  assert.ok(r.every((f) => f.verify === 'verified'));
});

test('위험도 + 검증상태 교차 필터', () => {
  const r = filterFiles(FILES, { risks: ['critical'], verify: ['failed'] });
  assert.ok(r.length >= 1);
  assert.ok(r.every((f) => f.risk === 'critical' && f.verify === 'failed'));
});

test('필터는 원본 배열을 변형하지 않는다', () => {
  const before = FILES.length;
  filterFiles(FILES, { risks: ['low'] });
  assert.equal(FILES.length, before);
});

// ---- 통계 ----
test('computeStats 는 총계/심각/높음/미검증을 집계', () => {
  const s = computeStats(FILES);
  assert.equal(s.total, 20);
  assert.equal(s.critical, 3);
  assert.equal(s.high, 5);
  assert.equal(s.unverified, FILES.filter((f) => f.verify !== 'verified').length);
});

// ---- aria-label (AC: 색상 외 상태 표현) ----
test('cellAriaLabel 은 경로/위험도/검증/이슈수를 포함(명세 §5.2)', () => {
  const f = FILES.find((x) => x.id === 'f01');
  assert.equal(
    cellAriaLabel(f),
    'src/auth/session.js, 위험도 심각, 검증실패, 이슈 3건',
  );
});

test('countLabel 형식', () => {
  assert.equal(countLabel(12, 20), '표시 중 12 / 20 파일');
});

// ---- 색상 외 표현 메타 무결성 ----
test('모든 위험도/검증 상태에 아이콘+라벨이 정의됨', () => {
  for (const r of RISK_ORDER) {
    assert.ok(RISK_META[r].icon && RISK_META[r].label, `risk meta: ${r}`);
  }
  for (const v of VERIFY_ORDER) {
    assert.ok(VERIFY_META[v].icon && VERIFY_META[v].label, `verify meta: ${v}`);
  }
});

// ---- index.html 정적 가드 (AC: 히트맵/범례/필터/상세 렌더 골격) ----
test('index.html 이 핵심 골격과 접근성 훅을 포함', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  // 주요 컨테이너
  for (const cls of ['reh-header', 'reh-stats', 'reh-controls', 'reh-legend', 'reh-filter', 'reh-count', 'reh-grid', 'reh-detail']) {
    assert.ok(html.includes(cls), `클래스 누락: ${cls}`);
  }
  // 접근성 훅
  assert.ok(html.includes('aria-live="polite"'), 'aria-live 누락');
  assert.ok(html.includes('lang="ko"'), 'lang 속성 누락');
  assert.ok(html.includes('name="viewport"'), 'viewport 누락');
  // 모듈 로딩
  assert.ok(/<script[^>]*type="module"[^>]*src="\.\/app\.js"/.test(html), 'app.js module script 누락');
  // 위험도 필터 pill (전체 + 4단계)
  assert.ok(html.includes('data-filter-risk'), '위험도 필터 훅 누락');
  assert.ok(html.includes('data-filter-verify'), '검증 필터 훅 누락');
});

test('index.html 은 CSS 토큰을 하드코딩 없이 --reh-* 로 선언', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  for (const token of ['--reh-risk-critical', '--reh-focus-ring', '--reh-font-sans']) {
    assert.ok(html.includes(token), `토큰 누락: ${token}`);
  }
});
