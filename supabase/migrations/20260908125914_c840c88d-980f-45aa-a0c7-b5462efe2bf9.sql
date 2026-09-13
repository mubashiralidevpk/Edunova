CREATE OR REPLACE FUNCTION public.submit_program_application(
  _school_id uuid,
  _institution_program_id uuid,
  _full_name text,
  _date_of_birth date,
  _b_form_number text,
  _desired_class_level integer,
  _parent_father_name text,
  _parent_mother_name text,
  _parent_father_mobile text,
  _parent_mother_mobile text,
  _parent_email text,
  _notes text,
  _custom_fields jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _applicant_id uuid;
  _version_id uuid;
BEGIN
  _applicant_id := public.submit_admission_application(
    _school_id, _full_name, _date_of_birth, _b_form_number, _desired_class_level,
    _parent_father_name, _parent_mother_name, _parent_father_mobile,
    _parent_mother_mobile, _parent_email, _notes, _custom_fields
  );

  IF _institution_program_id IS NOT NULL THEN
    SELECT id INTO _version_id
    FROM public.admission_form_versions
    WHERE institution_program_id = _institution_program_id
      AND is_active = true
    ORDER BY version DESC
    LIMIT 1;

    UPDATE public.admission_applicants
       SET institution_program_id = _institution_program_id,
           form_version_id = COALESCE(form_version_id, _version_id)
     WHERE id = _applicant_id
       AND EXISTS (
         SELECT 1 FROM public.institution_programs ip
         WHERE ip.id = _institution_program_id
           AND ip.school_id = _school_id
       );
  END IF;

  RETURN _applicant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_program_application(uuid, uuid, text, date, text, integer, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_program_application(uuid, uuid, text, date, text, integer, text, text, text, text, text, text, jsonb) TO anon, authenticated;