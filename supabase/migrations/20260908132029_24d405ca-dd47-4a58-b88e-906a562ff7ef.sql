-- 1. Status note + history
ALTER TABLE public.admission_applicants
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.admission_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.admission_applicants(id) ON DELETE CASCADE,
  school_id uuid NOT NULL,
  status text NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admission_status_events TO authenticated;
GRANT ALL ON public.admission_status_events TO service_role;
ALTER TABLE public.admission_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read admission events in their school" ON public.admission_status_events;
CREATE POLICY "Staff read admission events in their school"
ON public.admission_status_events FOR SELECT TO authenticated
USING (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid()))
);

DROP POLICY IF EXISTS "Staff add admission events in their school" ON public.admission_status_events;
CREATE POLICY "Staff add admission events in their school"
ON public.admission_status_events FOR INSERT TO authenticated
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid()))
);

CREATE INDEX IF NOT EXISTS admission_status_events_applicant_idx
  ON public.admission_status_events(applicant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admission_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admission_status_events (applicant_id, school_id, status, note, actor_id)
    VALUES (NEW.id, NEW.school_id, NEW.status, NEW.status_note, auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.status_note IS DISTINCT FROM OLD.status_note THEN
    NEW.status_updated_at := now();
    INSERT INTO public.admission_status_events (applicant_id, school_id, status, note, actor_id)
    VALUES (NEW.id, NEW.school_id, NEW.status, NEW.status_note, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admission_status_event_ins ON public.admission_applicants;
CREATE TRIGGER trg_admission_status_event_ins
AFTER INSERT ON public.admission_applicants
FOR EACH ROW EXECUTE FUNCTION public.log_admission_status_event();

DROP TRIGGER IF EXISTS trg_admission_status_event_upd ON public.admission_applicants;
CREATE TRIGGER trg_admission_status_event_upd
BEFORE UPDATE ON public.admission_applicants
FOR EACH ROW EXECUTE FUNCTION public.log_admission_status_event();

-- 2. Richer public status lookup
DROP FUNCTION IF EXISTS public.lookup_admission_history(text, date);
CREATE OR REPLACE FUNCTION public.lookup_admission_history(_b_form_number text, _date_of_birth date)
RETURNS TABLE(
  applicant_id uuid, reference text, school_name text, full_name text, desired_class_level integer,
  status text, status_note text, status_updated_at timestamptz,
  test_total_marks integer, test_obtained_marks integer, test_completed_at timestamptz,
  scheduled_date date, scheduled_time time without time zone, scheduled_venue text,
  interview_scheduled_at timestamptz, interview_venue text, interview_status text,
  applied_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id,
    upper(substring(replace(a.id::text, '-', ''), 1, 8)),
    s.name, a.full_name, a.desired_class_level,
    a.status, a.status_note, a.status_updated_at,
    a.test_total_marks, a.test_obtained_marks, a.test_completed_at,
    sch.test_date, sch.test_time, sch.venue,
    a.interview_scheduled_at, a.interview_venue, a.interview_status,
    a.created_at
  FROM public.admission_applicants a
  JOIN public.schools s ON s.id = a.school_id
  LEFT JOIN public.admission_test_schedules sch ON sch.applicant_id = a.id
  WHERE _b_form_number IS NOT NULL
    AND length(trim(_b_form_number)) > 0
    AND _date_of_birth IS NOT NULL
    AND lower(trim(a.b_form_number)) = lower(trim(_b_form_number))
    AND a.date_of_birth = _date_of_birth
  ORDER BY a.created_at DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.lookup_admission_timeline(_b_form_number text, _date_of_birth date)
RETURNS TABLE(applicant_id uuid, status text, note text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.applicant_id, e.status, e.note, e.created_at
  FROM public.admission_status_events e
  JOIN public.admission_applicants a ON a.id = e.applicant_id
  WHERE _b_form_number IS NOT NULL
    AND length(trim(_b_form_number)) > 0
    AND _date_of_birth IS NOT NULL
    AND lower(trim(a.b_form_number)) = lower(trim(_b_form_number))
    AND a.date_of_birth = _date_of_birth
  ORDER BY e.created_at ASC
  LIMIT 200;
$$;

-- 3. Class levels up to 16
CREATE OR REPLACE FUNCTION public.set_admission_class_levels(_levels integer[])
RETURNS integer[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _school uuid := public.get_user_school(auth.uid());
  _clean integer[];
BEGIN
  IF _school IS NULL THEN
    RAISE EXCEPTION 'No school associated with this account';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to change admission settings';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT lvl ORDER BY lvl), '{}'::integer[])
    INTO _clean
  FROM unnest(COALESCE(_levels, '{}'::integer[])) AS lvl
  WHERE lvl BETWEEN 1 AND 16;

  INSERT INTO public.school_settings (school_id, admission_class_levels)
  VALUES (_school, _clean)
  ON CONFLICT (school_id) DO UPDATE SET admission_class_levels = EXCLUDED.admission_class_levels, updated_at = now();

  UPDATE public.school_settings SET admission_class_levels = _clean, updated_at = now() WHERE school_id = _school;
  RETURN _clean;
END;
$$;

-- 4. Public submission: allow up to class 16 + extended standard details
CREATE OR REPLACE FUNCTION public.submit_admission_application(
  _school_id uuid, _full_name text, _date_of_birth date, _b_form_number text,
  _desired_class_level integer, _parent_father_name text, _parent_mother_name text,
  _parent_father_mobile text, _parent_mother_mobile text, _parent_email text,
  _notes text, _custom_fields jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _new_id uuid;
  _owner uuid;
  _f RECORD;
  _val text;
BEGIN
  IF _school_id IS NULL THEN RAISE EXCEPTION 'School is required'; END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN RAISE EXCEPTION 'Child name is required'; END IF;
  IF length(_full_name) > 100 THEN RAISE EXCEPTION 'Child name too long'; END IF;
  IF _date_of_birth IS NULL THEN RAISE EXCEPTION 'Date of birth is required'; END IF;
  IF _b_form_number IS NULL OR length(trim(_b_form_number)) = 0 THEN RAISE EXCEPTION 'B-Form number is required'; END IF;
  IF _desired_class_level IS NULL OR _desired_class_level < 1 OR _desired_class_level > 16 THEN
    RAISE EXCEPTION 'Class level must be between 1 and 16';
  END IF;
  IF length(coalesce(_notes,'')) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;
  IF _custom_fields IS NOT NULL AND length(_custom_fields::text) > 20000 THEN
    RAISE EXCEPTION 'Additional answers are too large';
  END IF;

  SELECT owner_admin_id INTO _owner FROM public.schools WHERE id = _school_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'School not found'; END IF;

  FOR _f IN SELECT * FROM public.admission_form_fields
            WHERE school_id = _school_id AND is_active = true AND is_required = true LOOP
    _val := COALESCE(_custom_fields,'{}'::jsonb) ->> _f.field_key;
    IF _val IS NULL OR length(trim(_val)) = 0 OR _val = '[]' THEN
      RAISE EXCEPTION '% is required', _f.label;
    END IF;
  END LOOP;

  INSERT INTO public.admission_applicants (
    school_id, created_by, full_name, date_of_birth, b_form_number,
    desired_class_level, parent_father_name, parent_mother_name,
    parent_father_mobile, parent_mother_mobile, parent_email,
    notes, status, custom_fields
  ) VALUES (
    _school_id, _owner, trim(_full_name), _date_of_birth, trim(_b_form_number),
    _desired_class_level, NULLIF(trim(coalesce(_parent_father_name,'')), ''),
    NULLIF(trim(coalesce(_parent_mother_name,'')), ''),
    NULLIF(trim(coalesce(_parent_father_mobile,'')), ''),
    NULLIF(trim(coalesce(_parent_mother_mobile,'')), ''),
    NULLIF(trim(coalesce(_parent_email,'')), ''), NULLIF(trim(coalesce(_notes,'')), ''),
    'submitted', COALESCE(_custom_fields,'{}'::jsonb)
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_program_application(
  _school_id uuid, _institution_program_id uuid, _full_name text, _date_of_birth date,
  _b_form_number text, _desired_class_level integer, _parent_father_name text,
  _parent_mother_name text, _parent_father_mobile text, _parent_mother_mobile text,
  _parent_email text, _notes text, _custom_fields jsonb DEFAULT '{}'::jsonb,
  _extra jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _applicant_id uuid;
  _version_id uuid;
  _e jsonb := COALESCE(_extra, '{}'::jsonb);
BEGIN
  _applicant_id := public.submit_admission_application(
    _school_id, _full_name, _date_of_birth, _b_form_number, _desired_class_level,
    _parent_father_name, _parent_mother_name, _parent_father_mobile,
    _parent_mother_mobile, _parent_email, _notes, _custom_fields
  );

  IF length(_e::text) > 8000 THEN RAISE EXCEPTION 'Extra details are too large'; END IF;

  UPDATE public.admission_applicants SET
    gender = COALESCE(NULLIF(trim(_e->>'gender'), ''), gender),
    place_of_birth = COALESCE(NULLIF(trim(_e->>'place_of_birth'), ''), place_of_birth),
    nationality = COALESCE(NULLIF(trim(_e->>'nationality'), ''), nationality),
    religion = COALESCE(NULLIF(trim(_e->>'religion'), ''), religion),
    blood_group = COALESCE(NULLIF(trim(_e->>'blood_group'), ''), blood_group),
    previous_school = COALESCE(NULLIF(trim(_e->>'previous_school'), ''), previous_school),
    parent_father_nic = COALESCE(NULLIF(trim(_e->>'parent_father_nic'), ''), parent_father_nic),
    parent_mother_nic = COALESCE(NULLIF(trim(_e->>'parent_mother_nic'), ''), parent_mother_nic),
    father_occupation = COALESCE(NULLIF(trim(_e->>'father_occupation'), ''), father_occupation),
    guardian_name = COALESCE(NULLIF(trim(_e->>'guardian_name'), ''), guardian_name),
    guardian_relationship = COALESCE(NULLIF(trim(_e->>'guardian_relationship'), ''), guardian_relationship),
    guardian_mobile = COALESCE(NULLIF(trim(_e->>'guardian_mobile'), ''), guardian_mobile),
    address = COALESCE(NULLIF(trim(_e->>'address'), ''), address),
    emergency_contact = COALESCE(NULLIF(trim(_e->>'emergency_contact'), ''), emergency_contact),
    elective_group = COALESCE(NULLIF(trim(_e->>'elective_group'), ''), elective_group)
  WHERE id = _applicant_id;

  IF _institution_program_id IS NOT NULL THEN
    SELECT id INTO _version_id
    FROM public.admission_form_versions
    WHERE institution_program_id = _institution_program_id AND is_active = true
    ORDER BY version DESC LIMIT 1;

    UPDATE public.admission_applicants
       SET institution_program_id = _institution_program_id,
           form_version_id = COALESCE(form_version_id, _version_id)
     WHERE id = _applicant_id
       AND EXISTS (
         SELECT 1 FROM public.institution_programs ip
         WHERE ip.id = _institution_program_id AND ip.school_id = _school_id
       );
  END IF;

  RETURN _applicant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admission_status_event() FROM anon, authenticated;

-- 5. Custom, school-owned programs + default program catalogue
ALTER TABLE public.admission_programs
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

GRANT INSERT, UPDATE, DELETE ON public.admission_programs TO authenticated;

DROP POLICY IF EXISTS "Staff manage their own custom programs" ON public.admission_programs;
CREATE POLICY "Staff manage their own custom programs"
ON public.admission_programs FOR ALL TO authenticated
USING (
  school_id IS NOT NULL
  AND school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid()))
)
WITH CHECK (
  school_id IS NOT NULL
  AND school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid()))
);

INSERT INTO public.admission_programs (board_id, code, name, stage, sort_order)
SELECT b.id, d.code, d.name, d.stage, d.sort_order
FROM public.admission_boards b
CROSS JOIN (VALUES
  ('PRIMARY', 'Primary (Prep – 5)', 'primary', 1),
  ('SECONDARY', 'Secondary (6 – 9)', 'secondary', 2),
  ('SSC', 'SSC (9 – 10)', 'secondary', 3),
  ('HSSC', 'HSSC (11 – 12)', 'intermediate', 4),
  ('BS-DEGREE', 'BS (Bachelor Degree)', 'degree', 5)
) AS d(code, name, stage, sort_order)
ON CONFLICT (board_id, code) DO NOTHING;