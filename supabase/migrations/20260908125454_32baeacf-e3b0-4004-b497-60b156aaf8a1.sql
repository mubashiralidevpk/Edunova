-- ============ Catalogue ============
CREATE TABLE public.admission_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admission_countries TO anon, authenticated;
GRANT ALL ON public.admission_countries TO service_role;
ALTER TABLE public.admission_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries readable" ON public.admission_countries FOR SELECT USING (is_active);

CREATE TABLE public.admission_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.admission_countries(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  short_name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, code)
);
GRANT SELECT ON public.admission_boards TO anon, authenticated;
GRANT ALL ON public.admission_boards TO service_role;
ALTER TABLE public.admission_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boards readable" ON public.admission_boards FOR SELECT USING (is_active);

CREATE TABLE public.admission_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.admission_boards(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'intermediate',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, code)
);
GRANT SELECT ON public.admission_programs TO anon, authenticated;
GRANT ALL ON public.admission_programs TO service_role;
ALTER TABLE public.admission_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs readable" ON public.admission_programs FOR SELECT USING (is_active);

-- ============ Institution programs ============
CREATE TABLE public.institution_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  country_id uuid NOT NULL REFERENCES public.admission_countries(id),
  board_id uuid NOT NULL REFERENCES public.admission_boards(id),
  program_id uuid NOT NULL REFERENCES public.admission_programs(id),
  seats integer,
  admission_status text NOT NULL DEFAULT 'closed',
  opens_on date,
  closes_on date,
  eligibility text,
  fee_amount numeric,
  fee_note text,
  merit_note text,
  require_test boolean NOT NULL DEFAULT false,
  require_interview boolean NOT NULL DEFAULT false,
  require_verification boolean NOT NULL DEFAULT true,
  public_visible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, program_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_programs TO authenticated;
GRANT SELECT ON public.institution_programs TO anon;
GRANT ALL ON public.institution_programs TO service_role;
ALTER TABLE public.institution_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institution programs public read" ON public.institution_programs
  FOR SELECT USING (public_visible AND is_active);
CREATE POLICY "institution programs staff read" ON public.institution_programs
  FOR SELECT TO authenticated USING (school_id = public.get_user_school(auth.uid()));
CREATE POLICY "institution programs staff write" ON public.institution_programs
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())))
  WITH CHECK (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())));

-- ============ Requirements ============
CREATE TABLE public.admission_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  institution_program_id uuid NOT NULL REFERENCES public.institution_programs(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'information',
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_requirements TO authenticated;
GRANT SELECT ON public.admission_requirements TO anon;
GRANT ALL ON public.admission_requirements TO service_role;
ALTER TABLE public.admission_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requirements public read" ON public.admission_requirements
  FOR SELECT USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.institution_programs ip
      WHERE ip.id = institution_program_id AND ip.public_visible AND ip.is_active
    ));
CREATE POLICY "requirements staff read" ON public.admission_requirements
  FOR SELECT TO authenticated USING (school_id = public.get_user_school(auth.uid()));
CREATE POLICY "requirements staff write" ON public.admission_requirements
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())))
  WITH CHECK (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())));

-- ============ Form versions ============
CREATE TABLE public.admission_form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  institution_program_id uuid REFERENCES public.institution_programs(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_form_versions TO authenticated;
GRANT SELECT ON public.admission_form_versions TO anon;
GRANT ALL ON public.admission_form_versions TO service_role;
ALTER TABLE public.admission_form_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form versions public read" ON public.admission_form_versions
  FOR SELECT USING (is_active);
CREATE POLICY "form versions staff write" ON public.admission_form_versions
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())))
  WITH CHECK (school_id = public.get_user_school(auth.uid())
         AND (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())));

ALTER TABLE public.admission_form_fields ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES public.admission_form_versions(id) ON DELETE CASCADE;
ALTER TABLE public.admission_applicants ADD COLUMN IF NOT EXISTS institution_program_id uuid REFERENCES public.institution_programs(id);
ALTER TABLE public.admission_applicants ADD COLUMN IF NOT EXISTS form_version_id uuid REFERENCES public.admission_form_versions(id);

-- ============ Ranking weights (adjustable later) ============
CREATE TABLE public.admission_ranking_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  w_pass_rate numeric NOT NULL DEFAULT 0.40,
  w_attendance numeric NOT NULL DEFAULT 0.25,
  w_admission_success numeric NOT NULL DEFAULT 0.20,
  w_scale numeric NOT NULL DEFAULT 0.15,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admission_ranking_weights TO anon, authenticated;
GRANT ALL ON public.admission_ranking_weights TO service_role;
ALTER TABLE public.admission_ranking_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weights readable" ON public.admission_ranking_weights FOR SELECT USING (true);
INSERT INTO public.admission_ranking_weights DEFAULT VALUES;

CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.institution_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_req_updated BEFORE UPDATE ON public.admission_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fv_updated BEFORE UPDATE ON public.admission_form_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Seed Pakistan ============
INSERT INTO public.admission_countries (code, name, sort_order) VALUES ('PK', 'Pakistan', 1);

INSERT INTO public.admission_boards (country_id, code, name, short_name, sort_order)
SELECT c.id, v.code, v.name, v.short_name, v.so
FROM public.admission_countries c,
(VALUES
  ('FBISE', 'Federal Board of Intermediate & Secondary Education (FDE / Islamabad Model Colleges)', 'FBISE / FDE', 1),
  ('BISE-LHR', 'Board of Intermediate & Secondary Education, Lahore', 'BISE Lahore', 2),
  ('BSEK', 'Board of Secondary Education, Karachi', 'BSEK Karachi', 3),
  ('BISE-PSH', 'Board of Intermediate & Secondary Education, Peshawar', 'BISE Peshawar', 4),
  ('BISE-QTA', 'Board of Intermediate & Secondary Education, Quetta', 'BISE Quetta', 5),
  ('AKUEB', 'Aga Khan University Examination Board', 'AKU-EB', 6)
) AS v(code, name, short_name, so)
WHERE c.code = 'PK';

INSERT INTO public.admission_programs (board_id, code, name, stage, sort_order)
SELECT b.id, v.code, v.name, v.stage, v.so
FROM public.admission_boards b,
(VALUES
  ('HSSC-I', 'HSSC-I (1st Year)', 'intermediate', 1),
  ('HSSC-II', 'HSSC-II (2nd Year)', 'intermediate', 2),
  ('BS', 'BS (4 Year Degree)', 'degree', 3),
  ('ADP', 'ADP (Associate Degree)', 'degree', 4)
) AS v(code, name, stage, so)
WHERE b.code IN ('FBISE', 'BISE-LHR', 'BSEK', 'BISE-PSH', 'BISE-QTA', 'AKUEB');

-- ============ Default requirement templates ============
CREATE OR REPLACE FUNCTION public.seed_default_requirements(_institution_program_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_code text;
  v_n integer := 0;
BEGIN
  SELECT ip.school_id, p.code INTO v_school, v_code
  FROM public.institution_programs ip
  JOIN public.admission_programs p ON p.id = ip.program_id
  WHERE ip.id = _institution_program_id;
  IF v_school IS NULL THEN RETURN 0; END IF;
  IF v_school <> public.get_user_school(auth.uid())
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised for this institution';
  END IF;

  IF v_code IN ('BS', 'ADP') THEN
    INSERT INTO public.admission_requirements (school_id, institution_program_id, label, kind, is_required, is_default, sort_order)
    SELECT v_school, _institution_program_id, x.label, x.kind, true, true, x.so
    FROM (VALUES
      ('CNIC / B-Form', 'document', 1),
      ('Father''s / Mother''s CNIC', 'document', 2),
      ('Passport-size Photographs', 'document', 3),
      ('SSC / Matric Certificate or Result Card', 'document', 4),
      ('HSSC / Intermediate Certificate or Result Card', 'document', 5),
      ('HSSC Marks Sheet', 'document', 6),
      ('Roll Number', 'information', 7),
      ('Registration Number', 'information', 8),
      ('Domicile / Residence Information', 'information', 9),
      ('Character Certificate', 'document', 10),
      ('Migration / NOC (where applicable)', 'document', 11),
      ('Subject Combination / Eligibility Evidence', 'information', 12),
      ('Application / Fee Challan', 'document', 13),
      ('Original Documents for Verification', 'document', 14)
    ) AS x(label, kind, so);
  ELSE
    INSERT INTO public.admission_requirements (school_id, institution_program_id, label, kind, is_required, is_default, sort_order)
    SELECT v_school, _institution_program_id, x.label, x.kind, true, true, x.so
    FROM (VALUES
      ('Full Name', 'information', 1),
      ('Father''s / Guardian''s Name', 'information', 2),
      ('Date of Birth', 'information', 3),
      ('B-Form / CNIC Number', 'information', 4),
      ('Father''s / Guardian''s CNIC', 'information', 5),
      ('Permanent Address', 'information', 6),
      ('Current Address', 'information', 7),
      ('Mobile / WhatsApp Number', 'information', 8),
      ('Email Address', 'information', 9),
      ('Previous School / College', 'information', 10),
      ('Previous Board', 'information', 11),
      ('SSC / Matric Roll Number', 'information', 12),
      ('Registration Number', 'information', 13),
      ('Marks / Grades', 'information', 14),
      ('Subjects / Group Being Applied For', 'information', 15),
      ('Matric / SSC Result Card or Marks Sheet', 'document', 16),
      ('Matric Certificate (when available)', 'document', 17),
      ('School Leaving Certificate', 'document', 18),
      ('Character Certificate', 'document', 19),
      ('B-Form / CNIC Copy', 'document', 20),
      ('Father''s / Mother''s CNIC Copy', 'document', 21),
      ('Recent Photographs', 'document', 22),
      ('Domicile / Residence Document', 'document', 23),
      ('Migration / NOC (where applicable)', 'document', 24),
      ('Admission / Fee Challan or Proof of Payment', 'document', 25)
    ) AS x(label, kind, so);
  END IF;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_default_requirements(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_default_requirements(uuid) TO authenticated;

-- ============ Form version helper ============
CREATE OR REPLACE FUNCTION public.create_admission_form_version(_name text, _institution_program_id uuid DEFAULT NULL, _copy_from uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid := public.get_user_school(auth.uid());
  v_version integer;
  v_id uuid;
BEGIN
  IF v_school IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.is_admission_manager(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to manage admission forms';
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.admission_form_versions
  WHERE school_id = v_school
    AND ((_institution_program_id IS NULL AND institution_program_id IS NULL)
      OR institution_program_id = _institution_program_id);

  INSERT INTO public.admission_form_versions (school_id, institution_program_id, version, name, created_by, published_at)
  VALUES (v_school, _institution_program_id, v_version, _name, auth.uid(), now())
  RETURNING id INTO v_id;

  INSERT INTO public.admission_form_fields
    (school_id, field_key, label, help_text, field_type, options, is_required, is_active, sort_order, created_by, version_id)
  SELECT school_id, field_key, label, help_text, field_type, options, is_required, is_active, sort_order, auth.uid(), v_id
  FROM public.admission_form_fields
  WHERE school_id = v_school
    AND (_copy_from IS NULL AND version_id IS NULL OR version_id = _copy_from);

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_admission_form_version(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_admission_form_version(text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admission_form_fields_version(_version_id uuid)
RETURNS SETOF public.admission_form_fields
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.* FROM public.admission_form_fields f
  WHERE f.version_id = _version_id AND f.is_active
  ORDER BY f.sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.list_admission_form_fields_version(uuid) TO anon, authenticated;

-- ============ Public discovery + ranking ============
CREATE OR REPLACE FUNCTION public.discover_institutions(_program_id uuid, _year integer DEFAULT NULL)
RETURNS TABLE (
  institution_program_id uuid,
  school_id uuid,
  school_name text,
  board_name text,
  program_name text,
  seats integer,
  admission_status text,
  opens_on date,
  closes_on date,
  eligibility text,
  fee_amount numeric,
  merit_note text,
  require_test boolean,
  require_interview boolean,
  students_total integer,
  attendance_rate numeric,
  pass_rate numeric,
  applications_total integer,
  admissions_total integer,
  admission_success_rate numeric,
  applications_per_seat numeric,
  score numeric,
  has_data boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH w AS (SELECT * FROM public.admission_ranking_weights LIMIT 1),
  yr AS (SELECT COALESCE(_year, EXTRACT(YEAR FROM now())::int) AS y),
  base AS (
    SELECT ip.id, ip.school_id, s.name AS school_name, b.name AS board_name, p.name AS program_name,
           ip.seats, ip.admission_status, ip.opens_on, ip.closes_on, ip.eligibility,
           ip.fee_amount, ip.merit_note, ip.require_test, ip.require_interview
    FROM public.institution_programs ip
    JOIN public.schools s ON s.id = ip.school_id
    JOIN public.admission_boards b ON b.id = ip.board_id
    JOIN public.admission_programs p ON p.id = ip.program_id
    WHERE ip.program_id = _program_id
      AND ip.is_active AND ip.public_visible
      AND ip.admission_status = 'open'
  ),
  st AS (
    SELECT school_id, COUNT(*)::int AS students_total
    FROM public.students GROUP BY school_id
  ),
  att AS (
    SELECT stu.school_id,
           ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS attendance_rate
    FROM public.attendance a
    JOIN public.students stu ON stu.id = a.student_id
    WHERE a.date >= (now() - interval '365 days')::date
    GROUP BY stu.school_id
  ),
  res AS (
    SELECT stu.school_id,
           ROUND(100.0 * SUM(CASE WHEN r.percentage >= 33 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS pass_rate
    FROM public.student_results r
    JOIN public.students stu ON stu.id = r.student_id
    WHERE r.is_published AND r.created_at >= (now() - interval '730 days')
    GROUP BY stu.school_id
  ),
  app AS (
    SELECT a.school_id,
           COUNT(*)::int AS applications_total,
           SUM(CASE WHEN a.status IN ('admitted', 'approved') THEN 1 ELSE 0 END)::int AS admissions_total
    FROM public.admission_applicants a, yr
    WHERE EXTRACT(YEAR FROM a.created_at)::int = yr.y
    GROUP BY a.school_id
  ),
  joined AS (
    SELECT base.*, COALESCE(st.students_total, 0) AS students_total,
           att.attendance_rate, res.pass_rate,
           COALESCE(app.applications_total, 0) AS applications_total,
           COALESCE(app.admissions_total, 0) AS admissions_total
    FROM base
    LEFT JOIN st ON st.school_id = base.school_id
    LEFT JOIN att ON att.school_id = base.school_id
    LEFT JOIN res ON res.school_id = base.school_id
    LEFT JOIN app ON app.school_id = base.school_id
  ),
  scaled AS (
    SELECT j.*,
      CASE WHEN j.applications_total > 0
        THEN ROUND(100.0 * j.admissions_total / j.applications_total, 1) END AS admission_success_rate,
      CASE WHEN COALESCE(j.seats, 0) > 0
        THEN ROUND(j.applications_total::numeric / j.seats, 2) END AS applications_per_seat,
      100.0 * j.students_total / NULLIF((SELECT MAX(students_total) FROM joined), 0) AS scale_pct
    FROM joined j
  )
  SELECT sc.id, sc.school_id, sc.school_name, sc.board_name, sc.program_name, sc.seats,
         sc.admission_status, sc.opens_on, sc.closes_on, sc.eligibility, sc.fee_amount,
         sc.merit_note, sc.require_test, sc.require_interview,
         sc.students_total, sc.attendance_rate, sc.pass_rate,
         sc.applications_total, sc.admissions_total, sc.admission_success_rate, sc.applications_per_seat,
         ROUND(
           COALESCE(sc.pass_rate, 0) * w.w_pass_rate
           + COALESCE(sc.attendance_rate, 0) * w.w_attendance
           + COALESCE(sc.admission_success_rate, 0) * w.w_admission_success
           + COALESCE(sc.scale_pct, 0) * w.w_scale, 1) AS score,
         (sc.pass_rate IS NOT NULL OR sc.attendance_rate IS NOT NULL) AS has_data
  FROM scaled sc, w
  ORDER BY has_data DESC, score DESC, sc.school_name;
$$;
GRANT EXECUTE ON FUNCTION public.discover_institutions(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_institution_program_public(_institution_program_id uuid)
RETURNS TABLE (
  id uuid, school_id uuid, school_name text, country_name text, board_name text, program_name text,
  seats integer, admission_status text, opens_on date, closes_on date, eligibility text,
  fee_amount numeric, fee_note text, merit_note text, require_test boolean, require_interview boolean,
  require_verification boolean, form_version_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ip.id, ip.school_id, s.name, c.name, b.name, p.name, ip.seats, ip.admission_status,
         ip.opens_on, ip.closes_on, ip.eligibility, ip.fee_amount, ip.fee_note, ip.merit_note,
         ip.require_test, ip.require_interview, ip.require_verification,
         (SELECT v.id FROM public.admission_form_versions v
          WHERE v.institution_program_id = ip.id AND v.is_active
          ORDER BY v.version DESC LIMIT 1)
  FROM public.institution_programs ip
  JOIN public.schools s ON s.id = ip.school_id
  JOIN public.admission_countries c ON c.id = ip.country_id
  JOIN public.admission_boards b ON b.id = ip.board_id
  JOIN public.admission_programs p ON p.id = ip.program_id
  WHERE ip.id = _institution_program_id AND ip.is_active AND ip.public_visible;
$$;
GRANT EXECUTE ON FUNCTION public.get_institution_program_public(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_program_requirements(_institution_program_id uuid)
RETURNS TABLE (id uuid, label text, description text, kind text, is_required boolean, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.label, r.description, r.kind, r.is_required, r.sort_order
  FROM public.admission_requirements r
  JOIN public.institution_programs ip ON ip.id = r.institution_program_id
  WHERE r.institution_program_id = _institution_program_id
    AND r.is_active AND ip.is_active AND ip.public_visible
  ORDER BY r.sort_order;
$$;
GRANT EXECUTE ON FUNCTION public.list_program_requirements(uuid) TO anon, authenticated;