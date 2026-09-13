ALTER TABLE public.exam_paper_checks
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS teacher_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS teacher_note text;

CREATE INDEX IF NOT EXISTS exam_paper_checks_assigned_to_idx
  ON public.exam_paper_checks (assigned_to, status);