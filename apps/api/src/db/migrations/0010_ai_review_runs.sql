-- Migration 0010: a record of every AI review run, to study its accuracy
--
-- Agreement with the hand-checked catalog rules per run, plus token usage.
-- Real precision comes from people's decisions on /pruefen (offer_reviews
-- whose reason starts with "KI"); this table adds the per-run trend.

CREATE TABLE IF NOT EXISTS ai_review_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  model          varchar(50) NOT NULL,
  names          integer NOT NULL,
  agree          integer NOT NULL,
  both_none      integer NOT NULL,
  ai_only        integer NOT NULL,
  rules_only     integer NOT NULL,
  unsure         integer NOT NULL,
  input_tokens   integer NOT NULL DEFAULT 0,
  cached_tokens  integer NOT NULL DEFAULT 0,
  output_tokens  integer NOT NULL DEFAULT 0
);
