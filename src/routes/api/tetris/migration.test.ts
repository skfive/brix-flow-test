/**
 * Prisma schema/migration 산출물 가드 — BF-836 (AC3)
 *
 * 이 저장소에는 실행 중인 Postgres 가 없으므로(§0), migration 이
 * (a) TetrisScore 테이블과 (b) score DESC + createdAt ASC 복합 인덱스를
 * (c) 멱등적으로 정의하는지 SQL/스키마 텍스트 수준에서 정적 검증한다.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const migrationsDir = `${root}prisma/migrations`;
const schemaPath = `${root}prisma/schema.prisma`;

function readMigrationSql(): string {
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.includes('add_tetris_score'));
  assert.equal(dirs.length, 1, 'add_tetris_score migration 디렉토리는 정확히 1개여야 합니다');
  return readFileSync(`${migrationsDir}/${dirs[0].name}/migration.sql`, 'utf8');
}

describe('TetrisScore migration', () => {
  const sql = readMigrationSql();

  it('TetrisScore 테이블을 멱등적으로 생성한다', () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "TetrisScore"/);
  });

  it('필수 컬럼을 모두 정의한다', () => {
    for (const col of ['playerName', 'score', 'level', 'lines', 'durationMs', 'createdAt']) {
      assert.match(sql, new RegExp(`"${col}"`), `${col} 컬럼 누락`);
    }
  });

  it('score DESC, createdAt ASC 복합 인덱스를 멱등적으로 생성한다', () => {
    assert.match(sql, /CREATE INDEX IF NOT EXISTS "idx_tetris_score_leaderboard"/);
    assert.match(sql, /"score"\s+DESC,\s*"createdAt"\s+ASC/);
  });

  it('CHECK 제약으로 값 범위를 방어한다', () => {
    assert.match(sql, /"score" >= 0/);
    assert.match(sql, /"level" >= 1/);
    assert.match(sql, /"lines" >= 0/);
  });
});

describe('prisma schema', () => {
  const schema = readFileSync(schemaPath, 'utf8');

  it('TetrisScore 모델과 복합 인덱스를 선언한다', () => {
    assert.match(schema, /model TetrisScore/);
    assert.match(schema, /score\(sort:\s*Desc\)/);
    assert.match(schema, /createdAt\(sort:\s*Asc\)/);
    assert.match(schema, /idx_tetris_score_leaderboard/);
  });
});
