-- Migration 0011: who decided a review item
--
-- 'human' (on /pruefen), 'ai-judge' (a second, careful AI check decided a
-- rules-vs-AI disagreement automatically) or 'auto-repeat' (a held price
-- jump turned up again on the next run, so it is a real price change).
-- Keeps the accuracy statistics honest: human decisions are the reference.

ALTER TABLE offer_reviews ADD COLUMN IF NOT EXISTS decided_by varchar(20);
