CREATE OR REPLACE FUNCTION public.ensure_my_account()
RETURNS TABLE(user_id uuid, school_id uuid, role public.app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  meta jsonb;
  meta_role text;
  meta_school uuid;
  meta_name text;
  meta_school_name text;
  v_email text;
  v_school uuid;
  v_role public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT COALESCE(u.raw_user_meta_data, '{}'::jsonb), COALESCE(u.email, '')
    INTO meta, v_email
  FROM auth.users u WHERE u.id = uid;

  meta_role := NULLIF(meta->>'role', '');
  meta_school := NULLIF(meta->>'school_id', '')::uuid;
  meta_name := COALESCE(NULLIF(meta->>'full_name', ''), split_part(v_email, '@', 1));
  meta_school_name := NULLIF(meta->>'school_name', '');

  -- Resolve the role: an existing role wins, then metadata, else the person owns a school (admin).
  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = uid LIMIT 1;
  IF v_role IS NULL THEN
    IF meta_role IN ('student', 'teacher', 'admin') THEN
      v_role := meta_role::public.app_role;
    ELSE
      v_role := 'admin'::public.app_role;
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Resolve the school: existing profile, metadata, an owned school, or create one for an admin.
  SELECT p.school_id INTO v_school FROM public.profiles p WHERE p.user_id = uid;
  IF v_school IS NULL THEN
    v_school := meta_school;
  END IF;
  IF v_school IS NULL THEN
    SELECT s.id INTO v_school FROM public.schools s WHERE s.owner_admin_id = uid LIMIT 1;
  END IF;
  IF v_school IS NULL AND v_role = 'admin' THEN
    INSERT INTO public.schools (name, owner_admin_id)
    VALUES (COALESCE(meta_school_name, meta_name || '''s School'), uid)
    RETURNING id INTO v_school;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, school_id)
  VALUES (uid, meta_name, v_email, v_school)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id = COALESCE(public.profiles.school_id, EXCLUDED.school_id),
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
        email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email);

  RETURN QUERY SELECT uid, v_school, v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_my_account() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_my_account() TO authenticated;