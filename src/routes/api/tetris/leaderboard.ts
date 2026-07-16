/**
 * GET /demo/tetris/api/leaderboard — 리더보드 조회 핸들러 — BF-836 (AC2)
 * planner 계약: docs/planning/tetris-BF-833.md §6.3
 *
 * 성공 200, limit/offset 범위 오류 400, 저장소 오류 500.
 * 정렬은 저장소가 score DESC, createdAt ASC 로 보장한다.
 */
import type { TetrisScoreRepository } from './repository.ts';
import {
  type ApiResponse,
  ValidationError,
  errorResponse,
  parseIntegerQuery,
} from './validation.ts';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * 리더보드 상위 구간을 순위 포함 200 응답으로 반환한다.
 * @param query 쿼리 파라미터(limit/offset). 문자열/숫자 모두 허용.
 * @param repo 저장소 포트.
 */
export async function handleGetLeaderboard(
  query: Record<string, unknown>,
  repo: TetrisScoreRepository,
): Promise<ApiResponse> {
  let limit: number;
  let offset: number;
  try {
    limit = parseIntegerQuery('limit', query.limit, DEFAULT_LIMIT, { min: 1, max: MAX_LIMIT });
    offset = parseIntegerQuery('offset', query.offset, 0, { min: 0 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(400, 'VALIDATION_ERROR', err.message, err.field);
    }
    throw err;
  }

  try {
    const [records, total] = await Promise.all([repo.list(limit, offset), repo.count()]);
    const items = records.map((r, i) => ({
      rank: offset + i + 1,
      playerName: r.playerName,
      score: r.score,
      level: r.level,
      lines: r.lines,
      createdAt: r.createdAt,
    }));
    return { status: 200, body: { items, total, limit, offset } };
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '리더보드를 불러오지 못했습니다');
  }
}
