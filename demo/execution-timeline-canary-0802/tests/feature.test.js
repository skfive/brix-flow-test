import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_LABELS,
  getStatusLabel,
  getComponentStatusText,
  validateFixture,
  deriveComponentState,
  DEFAULT_FIXTURE,
  createFixtureLoader,
  createTimelineController,
} from '../src/feature.js';

test('getStatusLabel — 색상 없이 상태명을 텍스트로 노출한다 (AC-5)', () => {
  assert.equal(getStatusLabel('done'), '완료');
  assert.equal(getStatusLabel('in-progress'), '진행');
  assert.equal(getStatusLabel('waiting'), '대기');
  assert.throws(() => getStatusLabel('unknown'), /알 수 없는 status/);
});

test('getComponentStatusText — 컴포넌트 상태별 텍스트가 서로 다르다', () => {
  const texts = ['loading', 'empty', 'error'].map(getComponentStatusText);
  assert.ok(texts.every((text) => typeof text === 'string' && text.length > 0));
  assert.equal(new Set(texts).size, 3);
});

test('validateFixture — 스키마(§4)를 만족하는 fixture는 통과한다', () => {
  assert.deepEqual(validateFixture(DEFAULT_FIXTURE), DEFAULT_FIXTURE);
});

test('validateFixture — steps가 배열이 아니면 실패한다', () => {
  assert.throws(() => validateFixture({ steps: 'not-an-array' }), /steps 배열/);
  assert.throws(() => validateFixture(null), /steps 배열/);
});

test('validateFixture — step에 알 수 없는 status가 있으면 실패한다', () => {
  assert.throws(
    () => validateFixture({ steps: [{ id: 'a', label: 'A', status: 'unknown-status', timestamp: null }] }),
    /status 값이 올바르지 않습니다/,
  );
});

test('deriveComponentState — steps가 비어있으면 empty, 아니면 ready (AC-1, AC-2)', () => {
  assert.equal(deriveComponentState({ steps: [] }), 'empty');
  assert.equal(deriveComponentState(DEFAULT_FIXTURE), 'ready');
});

test('createFixtureLoader — 기본 fixture는 스키마를 통과한다', async () => {
  const load = createFixtureLoader();
  const fixture = await load();
  assert.deepEqual(fixture, DEFAULT_FIXTURE);
});

test('createTimelineController — 성공 시 loading -> ready 로 전이하고 컨트롤이 재활성화된다 (AC-1)', async () => {
  const states = [];
  const controller = createTimelineController({
    fetchFixture: () => Promise.resolve(DEFAULT_FIXTURE),
    onChange: (state) => states.push(state),
  });

  assert.equal(controller.getState().status, 'loading');
  assert.equal(controller.getState().controlEnabled, false);

  await controller.load();

  const finalState = controller.getState();
  assert.equal(finalState.status, 'ready');
  assert.equal(finalState.controlEnabled, true);
  assert.equal(finalState.fixture, DEFAULT_FIXTURE);
});

test('createTimelineController — steps가 비어있으면 empty 상태로 전이한다 (AC-2)', async () => {
  const controller = createTimelineController({
    fetchFixture: () => Promise.resolve({ steps: [], updatedAt: '2026-08-01T00:00:00Z' }),
  });

  await controller.load();

  const state = controller.getState();
  assert.equal(state.status, 'empty');
  assert.equal(state.controlEnabled, true);
});

test('createTimelineController — 조회 실패 시 error 상태로 전이하고 컨트롤은 재시도 가능하게 유지된다 (AC-3)', async () => {
  const controller = createTimelineController({
    fetchFixture: () => Promise.reject(new Error('네트워크 실패')),
  });

  await controller.load();

  const state = controller.getState();
  assert.equal(state.status, 'error');
  assert.equal(state.controlEnabled, true, 'error 이후에도 timeline-refresh는 재시도를 위해 활성 상태여야 한다');
});

test('createTimelineController — refresh 재시도 후 ready로 복귀하고 컨트롤이 재사용 가능하다 (AC-4)', async () => {
  let attempt = 0;
  const controller = createTimelineController({
    fetchFixture: () => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('첫 시도 실패')) : Promise.resolve(DEFAULT_FIXTURE);
    },
  });

  await controller.load();
  assert.equal(controller.getState().status, 'error');

  await controller.refresh();
  const state = controller.getState();
  assert.equal(state.status, 'ready');
  assert.equal(state.controlEnabled, true);
});

test('createTimelineController — loading 도중 재호출(연타)해도 진행 중인 요청만 반영된다', async () => {
  let resolveFetch;
  const fetchFixture = () =>
    new Promise((resolve) => {
      resolveFetch = resolve;
    });
  // 생성 시 최초 load()가 자동 트리거되어 fetchFixture 호출이 마이크로태스크로 큐잉된다.
  const controller = createTimelineController({ fetchFixture });

  const firstLoad = controller.load(); // 이미 진행 중인 요청과 동일한 promise를 반환해야 함(§6)
  const secondLoad = controller.load(); // loading 중 재호출 — 무시되어야 함(§6)

  assert.equal(controller.getState().status, 'loading');
  assert.equal(controller.getState().controlEnabled, false);

  await Promise.resolve(); // 큐잉된 fetchFixture 호출이 실행되어 resolveFetch가 대입될 때까지 대기
  resolveFetch(DEFAULT_FIXTURE);
  await Promise.all([firstLoad, secondLoad]);

  const state = controller.getState();
  assert.equal(state.status, 'ready');
  assert.equal(state.controlEnabled, true);
});

test('STATUS_LABELS — 계획 §3.3 매핑과 일치한다', () => {
  assert.deepEqual(STATUS_LABELS, { done: '완료', 'in-progress': '진행', waiting: '대기' });
});
