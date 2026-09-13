-- 1. Trigger-only functions: not callable via API
REVOKE EXECUTE ON FUNCTION public.enforce_open_admission_class() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_teacher_checkin_security() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_final_term_close() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.homework_set_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.homework_submission_set_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nexus_set_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_alert_log_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_class_impact_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_result_upload_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_teacher_checkin_school() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_ai_conversation() FROM anon, authenticated;

-- 2. Staff-only RPCs: never callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.admit_applicant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_insert_students(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_dummy_students(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_teacher_to_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_promotion(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_admission_class_levels(integer[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_admission_process(boolean, boolean, integer, integer, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_exam_checking_mode(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_staff_roles(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_teacher_staff_role(uuid, text) FROM anon;

-- 3. Admission form fields: public access only through the definer RPC
DROP POLICY IF EXISTS "Anyone can read active admission fields" ON public.admission_form_fields;
REVOKE ALL ON public.admission_form_fields FROM anon;

-- 4. Parent OTP codes: server-side only
REVOKE ALL ON public.parent_otp_codes FROM anon, authenticated;
GRANT ALL ON public.parent_otp_codes TO service_role;

-- 5. Homework storage policies
DROP POLICY IF EXISTS "Owners manage their homework files" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete their homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students read teacher homework files" ON storage.objects;
DROP POLICY IF EXISTS "Staff read school homework files" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload homework files" ON storage.objects;

CREATE POLICY "Students manage own homework submission files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'homework-files'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Students delete own homework submission files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework-files'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Staff manage school homework files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role))
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.homework h, jsonb_array_elements(COALESCE(h.attachments, '[]'::jsonb)) a
      WHERE h.school_id = public.get_user_school(auth.uid())
        AND a->>'path' = storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.homework_submissions s, jsonb_array_elements(COALESCE(s.files, '[]'::jsonb)) f
      WHERE s.school_id = public.get_user_school(auth.uid())
        AND f->>'path' = storage.objects.name
    )
  )
)
WITH CHECK (
  bucket_id = 'homework-files'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role))
  AND owner = auth.uid()
);

CREATE POLICY "Students read own class homework files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
  AND EXISTS (
    SELECT 1
    FROM public.homework h,
         public.current_student() cs,
         jsonb_array_elements(COALESCE(h.attachments, '[]'::jsonb)) a
    WHERE h.status = 'published'
      AND h.class_id = cs.class_id
      AND h.school_id = cs.school_id
      AND (h.target_student_ids IS NULL OR cs.student_id = ANY (h.target_student_ids))
      AND a->>'path' = storage.objects.name
  )
);

-- 6. Result uploads: admins limited to their own school
DROP POLICY IF EXISTS "Result uploads admin read" ON storage.objects;
DROP POLICY IF EXISTS "Result uploads update by owner or admin" ON storage.objects;
DROP POLICY IF EXISTS "Result uploads delete by owner or admin" ON storage.objects;

CREATE POLICY "Result uploads same school admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'result-uploads'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id::text = (storage.foldername(storage.objects.name))[1]
      AND p.school_id = public.get_user_school(auth.uid())
  )
);

CREATE POLICY "Result uploads update by owner or same school admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'result-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id::text = (storage.foldername(storage.objects.name))[1]
          AND p.school_id = public.get_user_school(auth.uid())
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'result-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id::text = (storage.foldername(storage.objects.name))[1]
          AND p.school_id = public.get_user_school(auth.uid())
      )
    )
  )
);

CREATE POLICY "Result uploads delete by owner or same school admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'result-uploads'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id::text = (storage.foldername(storage.objects.name))[1]
          AND p.school_id = public.get_user_school(auth.uid())
      )
    )
  )
);