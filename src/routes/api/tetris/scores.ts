/**
 * POST /demo/tetris/api/scores — 점수 제출 핸들러 — BF-836 (AC2)
 * planner 계약: docs/planning/tetris-BF-833.md §6.2
 *
 * 성공 201, 필드별 검증 오류 400, 저장소 오류 500.
 * 프레임워크 비의존: 파싱된 body(unknown)와 저장소를 받아 { status, body } 를 반환한다.
 */
import { calcLevel } from '../../../features/tetris/rules.js';
import type { TetrisScoreRepository, TetrisScoreInput } from './repository.ts';
import {
  type ApiResponse,
  ValidationError,
  errorResponse,
  isRecord,
  parsePlayerName,
  parseInteger,
} from './validation.ts';

/**
 * 점수 제출을 검증·저장하고 순위를 포함한 201 응답을 만든다.
 * @param rawBody 파싱된 요청 바디(JSON.parse 결과 등).
 * @param repo 저장소 포트.
 */
export async function handlePostScore(
  rawBody: unknown,
  repo: TetrisScoreRepository,
): Promise<ApiResponse> {
  let input: TetrisScoreInput;
  try {
    input = parseBody(rawBody);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(400, 'VALIDATION_ERROR', err.message, err.field);
    }
    throw err;
  }

  try {
    const record = await repo.insert(input);
    const rank = await repo.rankOf(record);
    return {
      status: 201,
      body: {
        id: record.id,
        rank,
        playerName: record.playerName,
        score: record.score,
        level: record.level,
        lines: record.lines,
        createdAt: record.createdAt,
      },
    };
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '점수를 저장하지 못했습니다');
  }
}

/**
 * 요청 바디를 검증된 저장 입력으로 변환한다.
 * @throws {ValidationError} 필드별 검증 실패.
 */
function parseBody(rawBody: unknown): TetrisScoreInput {
  if (!isRecord(rawBody)) {
    throw new ValidationError('body', '요청 바디가 올바른 JSON 객체가 아닙니다');
  }
  const playerName = parsePlayerName(rawBody.playerName);
  const score = parseInteger('score', rawBody.score, { min: 0 });
  const lines = parseInteger('lines', rawBody.lines, { min: 0 });
  const level = parseInteger('level', rawBody.level, { min: 1 });

  // level 은 lines 에서 결정론적으로 파생되므로 서버가 완전 재검증한다(§6.2).
  const expectedLevel = calcLevel(lines);
  if (level !== expectedLevel) {
    throw new ValidationError(
      'level',
      `level 이 lines 와 일치하지 않습니다(기대값 ${expectedLevel})`,
    );
  }

  const durationMs =
    rawBody.durationMs === undefined || rawBody.durationMs === null
      ? null
      : parseInteger('durationMs', rawBody.durationMs, { min: 0 });

  return { playerName, score, level, lines, durationMs };
}
