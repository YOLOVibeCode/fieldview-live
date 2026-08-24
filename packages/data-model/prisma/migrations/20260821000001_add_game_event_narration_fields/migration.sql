-- Add narration detail fields to GameEvent for social play-by-play.
-- These are additive nullable columns; existing rows get NULL which is the
-- correct default (no detail = two-tap basic report).
--
-- NOTE: filmTimeSeconds is a position in the sliding HLS DVR window at report
-- time. It is stable within a single viewer session only. Making it durable
-- requires a stream-start anchor or EXT-X-PROGRAM-DATE-TIME parsing, which is
-- not implemented yet.

ALTER TABLE "GameEvent"
  ADD COLUMN "jerseyNumber"    INTEGER,
  ADD COLUMN "detail"          TEXT,
  ADD COLUMN "detailValue"     INTEGER,
  ADD COLUMN "note"            VARCHAR(80),
  ADD COLUMN "filmTimeSeconds" INTEGER;
