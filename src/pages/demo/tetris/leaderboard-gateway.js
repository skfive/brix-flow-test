/**
 * 리더보드 게이트웨이 — BF-836 (AC4)
 *
 * UI 는 게이트웨이 인터페이스({ submitScore, fetchLeaderboard })에만 의존한다.
 * - HttpLeaderboardGateway: planner §6 계약 엔드포인트로 실제 fetch.
 * - LocalLeaderboardGateway: localStorage 백엔드(백엔드 미기동 데모/오프라인용).
 *
 * 이 저장소에는 실행 중인 백엔드가 없으므로 데모 기본값은 Local 이며,
 * 백엔드가 준비되면 game.js 에서 Http 로 교체만 하면 된다(§9.1).
 *
 * @typedef {Object} ScorePayload
 * @property {string} playerName
 * @property {number} score
 * @property {number} level
 * @property {number} lines
 * @property {number|null} [durationMs]
 *
 * @typedef {Object} SubmitResult
 * @property {string} id
 * @property {number} rank
 * @property {string} playerName
 * @property {number} score
 * @property {number} level
 * @property {number} lines
 * @property {string} createdAt
 *
 * @typedef {Object} LeaderboardEntry
 * @property {number} rank
 * @property {string} playerName
 * @property {number} score
 * @property {number} level
 * @property {number} lines
 * @property {string} createdAt
 *
 * @typedef {Object} LeaderboardPage
 * @property {LeaderboardEntry[]} items
 * @property {number} total
 * @property {number} limit
 * @property {number} offset
 */

const API_BASE = '/demo/tetris/api';

/** planner §6 계약 엔드포인트로 실제 요청하는 게이트웨이. */
export class HttpLeaderboardGateway {
  /**
   * @param {ScorePayload} payload
   * @returns {Promise<SubmitResult>}
   */
  async submitScore(payload) {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = new Error(`점수 저장 실패: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  /**
   * @param {number} [limit]
   * @param {number} [offset]
   * @returns {Promise<LeaderboardPage>}
   */
  async fetchLeaderboard(limit = 10, offset = 0) {
    const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error(`리더보드 조회 실패: ${res.status}`);
    return res.json();
  }
}

/**
 * localStorage 백엔드 게이트웨이. 계약과 동일한 정렬(score DESC, createdAt ASC)과
 * 순위 계산을 브라우저에서 재현하여 백엔드 없이도 데모가 동작하게 한다.
 */
export class LocalLeaderboardGateway {
  /** @param {string} [storageKey] */
  constructor(storageKey = 'tetris:leaderboard') {
    /** @private */
    this._key = storageKey;
  }

  /** @private @returns {SubmitResult[]} */
  _read() {
    try {
      const raw = localStorage.getItem(this._key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** @private @param {SubmitResult[]} rows */
  _write(rows) {
    localStorage.setItem(this._key, JSON.stringify(rows));
  }

  /** @private score DESC, createdAt ASC, id tie-break. */
  _sorted() {
    return this._read().sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  /**
   * @param {ScorePayload} payload
   * @returns {Promise<SubmitResult>}
   */
  submitScore(payload) {
    const rows = this._read();
    const record = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `local-${rows.length}-${Date.now()}`,
      playerName: payload.playerName,
      score: payload.score,
      level: payload.level,
      lines: payload.lines,
      durationMs: payload.durationMs ?? null,
      createdAt: new Date().toISOString(),
    };
    rows.push(record);
    this._write(rows);
    const rank = this._sorted().findIndex((r) => r.id === record.id) + 1;
    return Promise.resolve({ ...record, rank });
  }

  /**
   * @param {number} [limit]
   * @param {number} [offset]
   * @returns {Promise<LeaderboardPage>}
   */
  fetchLeaderboard(limit = 10, offset = 0) {
    const sorted = this._sorted();
    const items = sorted.slice(offset, offset + limit).map((r, i) => ({
      rank: offset + i + 1,
      playerName: r.playerName,
      score: r.score,
      level: r.level,
      lines: r.lines,
      createdAt: r.createdAt,
    }));
    return Promise.resolve({ items, total: sorted.length, limit, offset });
  }
}
