-- DROP REQUESTS TABLE
-- Rationale: User requested zero history retention for HIPAA compliance.
-- This effectively removes the ability to store or retrieve past generations.

DROP TABLE IF EXISTS "public"."requests";
