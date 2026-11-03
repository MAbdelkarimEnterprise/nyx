-- ── ACCESS REVIEW ───────────────────────────────────────────────────────────
-- The site's access review now sends the full five-step intake plus the option
-- the visitor chose (Design / Agents / Full System / Private Access). Every
-- submission is kept as its own row, so a returning visitor's new inquiry is
-- no longer dropped by the one-row-per-email index.

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS role      TEXT,
  ADD COLUMN IF NOT EXISTS goal      TEXT,
  ADD COLUMN IF NOT EXISTS challenge TEXT,
  ADD COLUMN IF NOT EXISTS outcome   TEXT,
  ADD COLUMN IF NOT EXISTS tier      TEXT;

DROP INDEX IF EXISTS public.waitlist_signups_email_key;
CREATE INDEX IF NOT EXISTS waitlist_signups_email_idx
  ON public.waitlist_signups (lower(email));
