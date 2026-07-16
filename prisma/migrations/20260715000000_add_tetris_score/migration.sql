-- BF-836 (AC3) · TetrisScore 신규 테이블 + 리더보드 복합 인덱스
-- planner 계약: docs/planning/tetris-BF-833.md §7
--
-- 멱등성(idempotent): CREATE TABLE / INDEX 모두 IF NOT EXISTS 로 가드하여
-- 재적용해도 안전하다. 기존 migration 은 수정하지 않고 본 migration 만 신규 추가한다.

-- CreateTable
CREATE TABLE IF NOT EXISTS "TetrisScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "playerName" VARCHAR(20) NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "lines" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "TetrisScore_pkey" PRIMARY KEY ("id"),
    -- DB 는 길이만 방어(패턴 검증은 API 레이어 §6.2 에서 수행)
    CONSTRAINT "TetrisScore_playerName_length_check"
        CHECK (char_length(btrim("playerName")) BETWEEN 1 AND 20),
    CONSTRAINT "TetrisScore_score_check"      CHECK ("score" >= 0),
    CONSTRAINT "TetrisScore_level_check"      CHECK ("level" >= 1),
    CONSTRAINT "TetrisScore_lines_check"      CHECK ("lines" >= 0),
    CONSTRAINT "TetrisScore_durationMs_check" CHECK ("durationMs" IS NULL OR "durationMs" >= 0)
);

-- CreateIndex (score DESC, createdAt ASC — 리더보드 정렬/페이지네이션)
CREATE INDEX IF NOT EXISTS "idx_tetris_score_leaderboard"
    ON "TetrisScore" ("score" DESC, "createdAt" ASC);
