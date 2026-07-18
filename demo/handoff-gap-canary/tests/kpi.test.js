import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HANDOFF_FIXTURE } from '../fixtures.js';
import { computeItems } from '../domain.js';
import { computeHandoffKpis, createKpiTracker } from '../kpi.js';

test('computeHandoffKpis — fixture 전체 결정론적 KPI', () => {
  const kpis = computeHandoffKpis(computeItems(HANDOFF_FIXTURE));
  assert.equal(kpis.total, 8);
  assert.deepEqual(kpis.riskCounts, { normal: 2, data_gap: 3, deadline_exceeded: 1, critical: 2 });
  assert.equal(kpis.atRiskCount, 6); // 8 - normal 2
  assert.equal(kpis.atRiskRate, 6 / 8);
  assert.equal(kpis.dataGapCount, 3);
  assert.equal(kpis.deadlineExceededCount, 1);
  assert.equal(kpis.criticalCount, 2);
  // HO-2007 만 유일 후속액션 누락 & 기한초과 없음 → 로컬 보완으로 해소 가능
  assert.equal(kpis.locallyResolvableCount, 1);
});

test('computeHandoffKpis — 실행마다 동일(결정론)', () => {
  const a = computeHandoffKpis(computeItems(HANDOFF_FIXTURE));
  const b = computeHandoffKpis(computeItems(HANDOFF_FIXTURE));
  assert.deepEqual(a, b);
});

test('computeHandoffKpis — HO-2007 보완 후 atRisk 감소', () => {
  const overrides = { 'HO-2007': { followUpAction: '보완 완료', savedAt: '2026-07-18T10:00:00+09:00' } };
  const kpis = computeHandoffKpis(computeItems(HANDOFF_FIXTURE, overrides));
  assert.equal(kpis.riskCounts.normal, 3);
  assert.equal(kpis.riskCounts.data_gap, 2);
  assert.equal(kpis.atRiskCount, 5);
  assert.equal(kpis.locallyResolvableCount, 0);
});

test('createKpiTracker — 이벤트 계수', () => {
  const tracker = createKpiTracker();
  assert.deepEqual(tracker.snapshot(), {
    itemSelect: 0,
    filterChange: 0,
    followUpSave: 0,
    followUpRemove: 0,
    validationError: 0,
    recompute: 0,
  });
  tracker.track('itemSelect');
  tracker.track('itemSelect');
  tracker.track('filterChange');
  tracker.track('unknown-event'); // 무시
  const snap = tracker.snapshot();
  assert.equal(snap.itemSelect, 2);
  assert.equal(snap.filterChange, 1);
});

test('createKpiTracker — reset', () => {
  const tracker = createKpiTracker();
  tracker.track('followUpSave');
  tracker.reset();
  assert.equal(tracker.snapshot().followUpSave, 0);
});
