DROP FUNCTION IF EXISTS public.ensure_my_account();

CREATE FUNCTION public.ensure_my_account()
 RETURNS TABLE(account_user_id uuid, account_school_id uuid, account_role app_role)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT ur.role INTO v_role FROM public.user_roles ur WHERE ur.user_id = uid LIMIT 1;
  IF v_role IS NULL THEN
    IF meta_role IN ('student', 'teacher', 'admin') THEN
      v_role := meta_role::public.app_role;
    ELSE
      v_role := 'admin'::public.app_role;
    END IF;
    INSERT INTO public.user_roles AS ur (user_id, role) VALUES (uid, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT p.school_id INTO v_school FROM public.profiles p WHERE p.user_id = uid;
  IF v_school IS NULL THEN
    v_school := meta_school;
  END IF;
  IF v_school IS NULL THEN
    SELECT s.id INTO v_school FROM public.schools s WHERE s.owner_admin_id = uid LIMIT 1;
  END IF;
  IF v_school IS NULL AND v_role = 'admin'::public.app_role THEN
    INSERT INTO public.schools (name, owner_admin_id)
    VALUES (COALESCE(meta_school_name, meta_name || '''s School'), uid)
    RETURNING id INTO v_school;
  END IF;

  INSERT INTO public.profiles AS p (user_id, full_name, email, school_id)
  VALUES (uid, meta_name, v_email, v_school)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id = COALESCE(p.school_id, EXCLUDED.school_id),
        full_name = COALESCE(NULLIF(p.full_name, ''), EXCLUDED.full_name),
        email = COALESCE(NULLIF(p.email, ''), EXCLUDED.email);

  account_user_id := uid;
  account_school_id := v_school;
  account_role := v_role;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_account() TO authenticated, service_role;