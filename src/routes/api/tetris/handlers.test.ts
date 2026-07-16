/**
 * API 핸들러 계약 테스트 — BF-836 (AC2)
 * planner 계약: docs/planning/tetris-BF-833.md §6
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryTetrisScoreRepository } from './repository.ts';
import { handlePostScore } from './scores.ts';
import { handleGetLeaderboard } from './leaderboard.ts';
import type { TetrisScoreRepository, TetrisScoreRecord, TetrisScoreInput } from './repository.ts';

/** createdAt 을 결정론적으로 증가시키는 저장소(정렬 검증용). */
function seededRepo(): InMemoryTetrisScoreRepository {
  let tick = 0;
  let seq = 0;
  return new InMemoryTetrisScoreRepository({
    now: () => `2026-07-15T00:00:${String(tick++).padStart(2, '0')}.000Z`,
    newId: () => `id-${String(seq++).padStart(3, '0')}`,
  });
}

const validBody = {
  playerName: '박기획',
  score: 4500,
  level: 3, // floor(24/10)+1 = 3
  lines: 24,
  durationMs: 60000,
};

describe('POST /scores — 성공', () => {
  it('유효 입력은 201 + rank 반환', async () => {
    const repo = seededRepo();
    const res = await handlePostScore(validBody, repo);
    assert.equal(res.status, 201);
    const body = res.body as Record<string, unknown>;
    assert.equal(body.rank, 1);
    assert.equal(body.playerName, '박기획');
    assert.equal(body.score, 4500);
    assert.ok(typeof body.id === 'string');
    assert.ok(typeof body.createdAt === 'string');
  });

  it('durationMs 생략 시 허용(null 저장)', async () => {
    const repo = seededRepo();
    const { durationMs, ...noDuration } = validBody;
    void durationMs;
    const res = await handlePostScore(noDuration, repo);
    assert.equal(res.status, 201);
  });
});

describe('POST /scores — 필드별 검증 400', () => {
  const repo = seededRepo();
  const cases: Array<[string, unknown, string]> = [
    ['playerName 누락', { ...validBody, playerName: undefined }, 'playerName'],
    ['playerName 빈값', { ...validBody, playerName: '   ' }, 'playerName'],
    ['playerName 21자', { ...validBody, playerName: 'a'.repeat(21) }, 'playerName'],
    ['playerName 특수문자', { ...validBody, playerName: '<script>' }, 'playerName'],
    ['score 음수', { ...validBody, score: -1 }, 'score'],
    ['score 소수', { ...validBody, score: 1.5 }, 'score'],
    ['lines 음수', { ...validBody, lines: -1 }, 'lines'],
    ['level 0', { ...validBody, level: 0, lines: 0 }, 'level'],
    ['level↔lines 불일치', { ...validBody, level: 5, lines: 24 }, 'level'],
    ['durationMs 음수', { ...validBody, durationMs: -5 }, 'durationMs'],
    ['바디가 객체 아님', 42, 'body'],
  ];
  for (const [name, body, field] of cases) {
    it(name, async () => {
      const res = await handlePostScore(body, repo);
      assert.equal(res.status, 400);
      const b = res.body as { error: { code: string; field?: string } };
      assert.equal(b.error.code, 'VALIDATION_ERROR');
      assert.equal(b.error.field, field);
    });
  }
});

describe('POST /scores — 저장소 오류 500', () => {
  it('insert 예외 시 500 INTERNAL_ERROR', async () => {
    const failing: TetrisScoreRepository = {
      insert: () => Promise.reject(new Error('db down')),
      list: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
      rankOf: () => Promise.resolve(1),
    };
    const res = await handlePostScore(validBody, failing);
    assert.equal(res.status, 500);
    const b = res.body as { error: { code: string } };
    assert.equal(b.error.code, 'INTERNAL_ERROR');
  });
});

describe('GET /leaderboard — 정렬/순위', () => {
  it('score DESC, 동점 시 createdAt ASC 로 정렬', async () => {
    const repo = seededRepo();
    // 제출 순서: A(1000), B(3000), C(3000) — B 가 C 보다 먼저(작은 createdAt)
    await handlePostScore({ playerName: 'A', score: 1000, level: 1, lines: 0 }, repo);
    await handlePostScore({ playerName: 'B', score: 3000, level: 1, lines: 0 }, repo);
    await handlePostScore({ playerName: 'C', score: 3000, level: 1, lines: 0 }, repo);
    const res = await handleGetLeaderboard({}, repo);
    assert.equal(res.status, 200);
    const body = res.body as {
      items: Array<{ rank: number; playerName: string }>;
      total: number;
    };
    assert.deepEqual(
      body.items.map((i) => i.playerName),
      ['B', 'C', 'A'],
    );
    assert.deepEqual(
      body.items.map((i) => i.rank),
      [1, 2, 3],
    );
    assert.equal(body.total, 3);
  });

  it('limit/offset 페이지네이션', async () => {
    const repo = seededRepo();
    for (let i = 0; i < 5; i += 1) {
      await handlePostScore(
        { playerName: `P${i}`, score: 1000 - i * 10, level: 1, lines: 0 },
        repo,
      );
    }
    const res = await handleGetLeaderboard({ limit: 2, offset: 2 }, repo);
    const body = res.body as { items: Array<{ rank: number }>; limit: number; offset: number };
    assert.equal(body.items.length, 2);
    assert.deepEqual(
      body.items.map((i) => i.rank),
      [3, 4],
    );
    assert.equal(body.limit, 2);
    assert.equal(body.offset, 2);
  });

  it('빈 리더보드는 items 빈 배열 + total 0', async () => {
    const res = await handleGetLeaderboard({}, seededRepo());
    const body = res.body as { items: unknown[]; total: number };
    assert.equal(body.items.length, 0);
    assert.equal(body.total, 0);
  });
});

describe('GET /leaderboard — 범위 검증 400', () => {
  const repo = seededRepo();
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['limit 0', { limit: 0 }, 'limit'],
    ['limit 101', { limit: 101 }, 'limit'],
    ['limit 비정수 문자열', { limit: 'abc' }, 'limit'],
    ['offset 음수', { offset: -1 }, 'offset'],
  ];
  for (const [name, query, field] of cases) {
    it(name, async () => {
      const res = await handleGetLeaderboard(query, repo);
      assert.equal(res.status, 400);
      const b = res.body as { error: { field?: string } };
      assert.equal(b.error.field, field);
    });
  }

  it('문자열 숫자 limit 은 허용', async () => {
    const res = await handleGetLeaderboard({ limit: '5', offset: '0' }, repo);
    assert.equal(res.status, 200);
  });
});

// 타입 사용처 표시(미사용 import 경고 방지용 no-op).
const _typeProbe: TetrisScoreInput | TetrisScoreRecord | null = null;
void _typeProbe;
