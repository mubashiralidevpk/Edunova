CREATE OR REPLACE FUNCTION public.list_school_class_levels(_school_id uuid)
RETURNS integer[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT c.level
    FROM public.classes c
    WHERE c.school_id = _school_id AND c.level IS NOT NULL
    ORDER BY c.level
  ), '{}'::integer[]);
$$;

REVOKE ALL ON FUNCTION public.list_school_class_levels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_school_class_levels(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_school_programs_public(_school_id uuid)
RETURNS TABLE(
  institution_program_id uuid,
  program_name text,
  board_name text,
  seats integer,
  admission_status text,
  opens_on date,
  closes_on date,
  eligibility text,
  fee_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ip.id,
         p.name,
         b.name,
         ip.seats,
         ip.admission_status,
         ip.opens_on,
         ip.closes_on,
         ip.eligibility,
         ip.fee_amount
  FROM public.institution_programs ip
  JOIN public.admission_programs p ON p.id = ip.program_id
  LEFT JOIN public.admission_boards b ON b.id = p.board_id
  WHERE ip.school_id = _school_id
    AND COALESCE(ip.public_visible, true) = true
    AND COALESCE(ip.is_active, true) = true
    AND ip.admission_status = 'open'
  ORDER BY p.sort_order NULLS LAST, p.name;
$$;

REVOKE ALL ON FUNCTION public.list_school_programs_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_school_programs_public(uuid) TO anon, authenticated, service_role;