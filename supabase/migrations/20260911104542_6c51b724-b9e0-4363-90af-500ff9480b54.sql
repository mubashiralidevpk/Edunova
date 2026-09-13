-- 1. Standard program catalogue per board
UPDATE public.admission_programs SET is_active = false
WHERE school_id IS NULL AND code IN ('SECONDARY','HSSC-I','HSSC-II','BS-DEGREE');

WITH std(code, name, sort_order) AS (
  VALUES
    ('PRIMARY',    'Primary (Prep – 5)', 1),
    ('ELEMENTARY', 'Elementary (6 – 8)', 2),
    ('SSC',        'Matric (SSC) (9 – 10)', 3),
    ('SSC-TECH',   'Matric Tech (SSC-TECH) (9 – 10)', 4),
    ('HSSC',       'Inter (HSSC) (11 – 12)', 5),
    ('HSSC-TECH',  'Inter Tech (HSSC-TECH) (11 – 12)', 6),
    ('ADP',        'Associate Degree Program (ADP)', 7),
    ('PG',         'Post Graduate (PG College)', 8),
    ('BS',         '4 Year Program (BS)', 9)
)
INSERT INTO public.admission_programs (board_id, code, name, sort_order, is_active)
SELECT b.id, s.code, s.name, s.sort_order, true
FROM public.admission_boards b CROSS JOIN std s
ON CONFLICT (board_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      is_active = true;

-- 2. Subject combinations (electives) under a school's program
CREATE TABLE public.admission_program_combinations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  institution_program_id uuid NOT NULL REFERENCES public.institution_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  subjects text[] NOT NULL DEFAULT '{}',
  seats integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_program_combinations TO authenticated;
GRANT ALL ON public.admission_program_combinations TO service_role;

ALTER TABLE public.admission_program_combinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff read combinations"
ON public.admission_program_combinations FOR SELECT TO authenticated
USING (school_id = public.get_user_school(auth.uid()));

CREATE POLICY "Admission staff manage combinations"
ON public.admission_program_combinations FOR ALL TO authenticated
USING (school_id = public.get_user_school(auth.uid())
       AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())))
WITH CHECK (school_id = public.get_user_school(auth.uid())
       AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())));

CREATE INDEX idx_apc_program ON public.admission_program_combinations(institution_program_id);

CREATE TRIGGER trg_apc_updated_at
BEFORE UPDATE ON public.admission_program_combinations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public listing for applicants
CREATE OR REPLACE FUNCTION public.list_program_combinations_public(_institution_program_id uuid)
RETURNS TABLE (id uuid, name text, code text, subjects text[], seats integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.code, c.subjects, c.seats
  FROM public.admission_program_combinations c
  JOIN public.institution_programs ip ON ip.id = c.institution_program_id
  WHERE c.institution_program_id = _institution_program_id
    AND c.is_active = true
    AND ip.is_active = true
  ORDER BY c.sort_order, c.name
$$;

GRANT EXECUTE ON FUNCTION public.list_program_combinations_public(uuid) TO anon, authenticated;
