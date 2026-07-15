/**
 * TetrisScore 저장소 포트 + 인메모리 어댑터 — BF-836 (AC2)
 *
 * planner 계약: docs/planning/tetris-BF-833.md §6~§7
 * 핸들러(scores/leaderboard)는 이 포트에만 의존하므로 실제 DB(Prisma/Postgres)
 * 어댑터로 손쉽게 교체할 수 있다. 정렬 규칙(score DESC, createdAt ASC)은
 * 저장소 구현이 책임진다(DB 인덱스 idx_tetris_score_leaderboard 와 동일 순서).
 */

/** 저장된 점수 레코드(§7 테이블 컬럼과 1:1). */
export interface TetrisScoreRecord {
  readonly id: string;
  readonly playerName: string;
  readonly score: number;
  readonly level: number;
  readonly lines: number;
  readonly durationMs: number | null;
  /** ISO 8601 문자열(서버 시각 기준). */
  readonly createdAt: string;
}

/** 신규 저장 입력(검증 완료 후 값). id/createdAt 은 저장소가 채운다. */
export interface TetrisScoreInput {
  readonly playerName: string;
  readonly score: number;
  readonly level: number;
  readonly lines: number;
  readonly durationMs: number | null;
}

/** 저장소 포트. Prisma 어댑터도 이 인터페이스를 구현하면 교체 가능하다. */
export interface TetrisScoreRepository {
  insert(input: TetrisScoreInput): Promise<TetrisScoreRecord>;
  /** score DESC, createdAt ASC 정렬에서 limit/offset 구간을 반환한다. */
  list(limit: number, offset: number): Promise<readonly TetrisScoreRecord[]>;
  /** 전체 레코드 수. */
  count(): Promise<number>;
  /** 해당 레코드의 1-base 순위(score DESC, createdAt ASC). */
  rankOf(record: TetrisScoreRecord): Promise<number>;
}

/**
 * score DESC, createdAt ASC 비교자. 동점이면 먼저 달성한(작은 createdAt) 기록이 상위.
 * createdAt 이 동일하면 id 로 안정 정렬하여 완전 결정론을 보장한다.
 */
function compareLeaderboard(a: TetrisScoreRecord, b: TetrisScoreRecord): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** ISO 시각 문자열을 생성하는 함수 타입(테스트에서 주입 가능). */
export type Clock = () => string;

/** UUID 를 생성하는 함수 타입(테스트에서 주입 가능). */
export type IdFactory = () => string;

/**
 * 테스트/데모용 인메모리 저장소. 정렬 규칙과 순위 계산을 계약대로 구현한다.
 */
export class InMemoryTetrisScoreRepository implements TetrisScoreRepository {
  readonly #records: TetrisScoreRecord[] = [];

  readonly #now: Clock;

  readonly #newId: IdFactory;

  /**
   * @param options.now 서버 시각(ISO 문자열) 생성기. 기본 실제 시각.
   * @param options.newId UUID 생성기. 기본 crypto.randomUUID.
   */
  constructor(options: { now?: Clock; newId?: IdFactory } = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#newId = options.newId ?? (() => crypto.randomUUID());
  }

  insert(input: TetrisScoreInput): Promise<TetrisScoreRecord> {
    const record: TetrisScoreRecord = {
      id: this.#newId(),
      playerName: input.playerName,
      score: input.score,
      level: input.level,
      lines: input.lines,
      durationMs: input.durationMs,
      createdAt: this.#now(),
    };
    this.#records.push(record);
    return Promise.resolve(record);
  }

  #sorted(): TetrisScoreRecord[] {
    return [...this.#records].sort(compareLeaderboard);
  }

  list(limit: number, offset: number): Promise<readonly TetrisScoreRecord[]> {
    return Promise.resolve(this.#sorted().slice(offset, offset + limit));
  }

  count(): Promise<number> {
    return Promise.resolve(this.#records.length);
  }

  rankOf(record: TetrisScoreRecord): Promise<number> {
    const idx = this.#sorted().findIndex((r) => r.id === record.id);
    return Promise.resolve(idx < 0 ? this.#records.length : idx + 1);
  }
}
