import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEMO_SESSION,
  BOARD_DATA_URL,
  requireAuth,
  loadBoardData,
} from '../board-data.js';

/** 성공 응답을 흉내내는 fetch 스텁. 호출된 URL 을 기록한다. */
function makeFetchStub(payload, calls) {
  return async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
}

test('requireAuth: 유효 세션은 사용자/권한 반환(AC3 인증 가드)', () => {
  const auth = requireAuth(DEMO_SESSION);
  assert.equal(auth.user, '데모 운영자');
  assert.ok(auth.roles.includes('handoff.viewer'));
});

test('requireAuth: 세션 없음/토큰 없음은 UNAUTHENTICATED 로 차단', () => {
  assert.throws(() => requireAuth(null), (e) => e.code === 'UNAUTHENTICATED');
  assert.throws(() => requireAuth({ user: 'x' }), (e) => e.code === 'UNAUTHENTICATED');
  assert.throws(() => requireAuth({ token: '' }), (e) => e.code === 'UNAUTHENTICATED');
});

test('loadBoardData: 인증 통과 후 fetch 가 성공하면 보드 반환(AC3)', async () => {
  const calls = [];
  const payload = {
    items: [
      { id: 's1', title: '배포 인수', status: 'waiting', assignee: '김지훈' },
      { id: 's2', title: '장애 이관', status: 'in_progress' },
    ],
  };
  const board = await loadBoardData({ fetch: makeFetchStub(payload, calls) });

  assert.equal(calls.length, 1);
  assert.equal(calls[0], BOARD_DATA_URL);
  assert.equal(board.items.length, 2);
  assert.equal(board.items[0].status, 'waiting');
});

test('loadBoardData: 커스텀 url 을 그대로 fetch 한다', async () => {
  const calls = [];
  const url = 'https://example.test/board.json';
  await loadBoardData({ fetch: makeFetchStub({ items: [] }, calls), url });
  assert.equal(calls[0], url);
});

test('loadBoardData: 인증 실패 시 fetch 를 호출하지 않는다', async () => {
  const calls = [];
  await assert.rejects(
    () => loadBoardData({ fetch: makeFetchStub({ items: [] }, calls), session: null }),
    (e) => e.code === 'UNAUTHENTICATED',
  );
  assert.equal(calls.length, 0);
});

test('loadBoardData: 응답 실패(ok=false)는 오류로 전파', async () => {
  const failingFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(() => loadBoardData({ fetch: failingFetch }), /데이터 요청 실패: 503/);
});

test('loadBoardData: fetch 미주입 시 명확히 실패', async () => {
  await assert.rejects(() => loadBoardData({}), /fetch 구현이 필요합니다/);
});

test('loadBoardData: 잘못된 페이로드 형식은 items 없이 빈 보드 처리', async () => {
  const calls = [];
  const board = await loadBoardData({ fetch: makeFetchStub({ nope: true }, calls) });
  assert.deepEqual(board.items, []);
});
