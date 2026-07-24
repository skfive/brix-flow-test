// 릴리스 준비도 순수 로직 단위 테스트 (BF-1146)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isComplete,
  isBlocking,
  completionRate,
  deriveAreaSummary,
  deriveReadiness,
} from '../../../src/features/release-readiness-canary/readiness.js';
import { RELEASE_READINESS_FIXTURE } from '../../../src/features/release-readiness-canary/fixture.js';

test('isComplete: status done 만 완료로 판정', () => {
  assert.equal(isComplete({ status: 'done' }), true);
  assert.equal(isComplete({ status: 'pending' }), false);
  assert.equal(isComplete({ status: 'failed' }), false);
});

test('isBlocking: blocking 필수 항목이 미완료일 때만 차단', () => {
  assert.equal(isBlocking({ status: 'failed', blocking: true }), true);
  assert.equal(isBlocking({ status: 'pending', blocking: true }), true);
  assert.equal(isBlocking({ status: 'done', blocking: true }), false); // 완료된 필수 항목은 차단 아님
  assert.equal(isBlocking({ status: 'failed', blocking: false }), false); // 비필수 실패는 차단 아님
});

test('completionRate: 반올림 정수 백분율, total 0 은 0', () => {
  assert.equal(completionRate(0, 0), 0);
  assert.equal(completionRate(1, 2), 50);
  assert.equal(completionRate(1, 3), 33); // 33.33 반올림
  assert.equal(completionRate(2, 3), 67); // 66.67 반올림
  assert.equal(completionRate(4, 4), 100);
});

test('completionRate: .5 경계는 올림, 음수 total 방어', () => {
  assert.equal(completionRate(1, 8), 13); // 12.5 → Math.round 올림
  assert.equal(completionRate(3, 8), 38); // 37.5 → 올림
  assert.equal(completionRate(5, -1), 0); // 음수 total 도 0 방어
});

test('deriveAreaSummary: 영역별 완료수/완료율/차단수 집계', () => {
  const area = {
    id: 'a',
    name: '영역 A',
    items: [
      { id: 'i1', label: 'x', status: 'done', blocking: true },
      { id: 'i2', label: 'y', status: 'failed', blocking: true },
      { id: 'i3', label: 'z', status: 'pending', blocking: false },
    ],
  };
  const s = deriveAreaSummary(area);
  assert.equal(s.total, 3);
  assert.equal(s.done, 1);
  assert.equal(s.completionRate, 33);
  assert.equal(s.blockingCount, 1);
  assert.equal(s.items[0].complete, true);
  assert.equal(s.items[1].blocks, true);
  assert.equal(s.items[2].blocks, false);
});

test('deriveReadiness: 전체 완료율·차단 항목 목록·릴리스 가능 여부 파생', () => {
  const r = deriveReadiness(RELEASE_READINESS_FIXTURE);

  // fixture 총 11 항목 중 done 6 → round(6/11*100)=55%
  assert.equal(r.totalItems, 11);
  assert.equal(r.doneItems, 6);
  assert.equal(r.completionRate, 55);

  // 차단 항목: testing/e2e (failed, blocking) 만 미완료 blocking → 1건
  assert.equal(r.blockingItems.length, 1);
  assert.equal(r.blockingItems[0].id, 'e2e');
  assert.equal(r.blockingItems[0].areaId, 'testing');
  assert.equal(r.releaseReady, false);
});

test('deriveReadiness: 모든 blocking 완료 시 releaseReady true', () => {
  const areas = [
    {
      id: 'a',
      name: 'A',
      items: [
        { id: 'i1', label: 'x', status: 'done', blocking: true },
        { id: 'i2', label: 'y', status: 'pending', blocking: false },
      ],
    },
  ];
  const r = deriveReadiness(areas);
  assert.equal(r.blockingItems.length, 0);
  assert.equal(r.releaseReady, true);
  assert.equal(r.completionRate, 50);
});

test('deriveReadiness: 빈 입력은 0% + releaseReady true', () => {
  const r = deriveReadiness([]);
  assert.equal(r.totalItems, 0);
  assert.equal(r.completionRate, 0);
  assert.equal(r.releaseReady, true);
  assert.deepEqual(r.blockingItems, []);
});

test('deriveReadiness: 여러 영역의 차단 항목을 영역 귀속과 함께 순서대로 집계', () => {
  const areas = [
    {
      id: 'build',
      name: '빌드',
      items: [{ id: 'ci', label: 'CI 통과', status: 'failed', blocking: true }],
    },
    {
      id: 'docs',
      name: '문서',
      items: [
        { id: 'changelog', label: '체인지로그', status: 'done', blocking: true },
        { id: 'runbook', label: '런북', status: 'pending', blocking: true },
      ],
    },
  ];
  const r = deriveReadiness(areas);
  assert.equal(r.blockingItems.length, 2);
  // 영역 순서(build → docs)대로, 완료된 blocking(changelog)은 제외
  assert.deepEqual(
    r.blockingItems.map((b) => `${b.areaId}/${b.id}`),
    ['build/ci', 'docs/runbook'],
  );
  assert.equal(r.blockingItems[0].areaName, '빌드');
  assert.equal(r.releaseReady, false);
});

test('deriveReadiness: 항목 없는 빈 영역은 완료율 0, 전체 집계에 0 기여', () => {
  const areas = [
    { id: 'empty', name: '빈 영역', items: [] },
    {
      id: 'a',
      name: 'A',
      items: [{ id: 'i1', label: 'x', status: 'done', blocking: false }],
    },
  ];
  const r = deriveReadiness(areas);
  const emptyArea = r.areas.find((a) => a.id === 'empty');
  assert.equal(emptyArea.total, 0);
  assert.equal(emptyArea.completionRate, 0);
  assert.equal(emptyArea.blockingCount, 0);
  assert.equal(r.totalItems, 1);
  assert.equal(r.doneItems, 1);
  assert.equal(r.completionRate, 100);
  assert.equal(r.releaseReady, true);
});

test('fixture: 모든 항목이 유효한 status/blocking 필드를 가진다', () => {
  const valid = new Set(['done', 'pending', 'failed']);
  for (const area of RELEASE_READINESS_FIXTURE) {
    assert.ok(area.id && area.name);
    for (const item of area.items) {
      assert.ok(item.id && item.label);
      assert.ok(valid.has(item.status), `잘못된 status: ${item.status}`);
      assert.equal(typeof item.blocking, 'boolean');
    }
  }
});
