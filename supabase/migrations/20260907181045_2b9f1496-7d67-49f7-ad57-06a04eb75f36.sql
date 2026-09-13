-- helper: the student row of the signed-in user
CREATE OR REPLACE FUNCTION public.current_student()
RETURNS TABLE(student_id uuid, class_id uuid, school_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.class_id, s.school_id FROM public.students s WHERE s.user_id = auth.uid() LIMIT 1
$$;

CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject text NOT NULL,
  section text,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  due_time time,
  max_marks integer,
  instructions text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_student_ids uuid[],
  allow_resubmission boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'published',
  topic text,
  concept text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  text_response text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  is_late boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'submitted',
  marks numeric,
  teacher_remark text,
  private_note text,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id, version)
);

CREATE TABLE public.homework_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reason text,
  note text,
  extended_due_date date,
  extended_due_time time,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (homework_id, student_id)
);

CREATE TABLE public.homework_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  homework_id uuid NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_homework_class ON public.homework(class_id, due_date DESC);
CREATE INDEX idx_homework_school ON public.homework(school_id, due_date DESC);
CREATE INDEX idx_hw_sub_homework ON public.homework_submissions(homework_id, student_id, version DESC);
CREATE INDEX idx_hw_sub_student ON public.homework_submissions(student_id, submitted_at DESC);
CREATE INDEX idx_hw_events_homework ON public.homework_events(homework_id, created_at DESC);

-- default school_id from the acting user
CREATE OR REPLACE FUNCTION public.homework_set_school()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.get_user_school(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_homework_school BEFORE INSERT ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.homework_set_school();
CREATE TRIGGER trg_homework_exc_school BEFORE INSERT ON public.homework_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.homework_set_school();
CREATE TRIGGER trg_homework_evt_school BEFORE INSERT ON public.homework_events
  FOR EACH ROW EXECUTE FUNCTION public.homework_set_school();

-- submissions inherit the homework's school
CREATE OR REPLACE FUNCTION public.homework_submission_set_school()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT h.school_id INTO NEW.school_id FROM public.homework h WHERE h.id = NEW.homework_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hw_sub_school BEFORE INSERT ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.homework_submission_set_school();

CREATE TRIGGER trg_homework_updated BEFORE UPDATE ON public.homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hw_sub_updated BEFORE UPDATE ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_exceptions TO authenticated;
GRANT SELECT, INSERT ON public.homework_events TO authenticated;
GRANT ALL ON public.homework TO service_role;
GRANT ALL ON public.homework_submissions TO service_role;
GRANT ALL ON public.homework_exceptions TO service_role;
GRANT ALL ON public.homework_events TO service_role;

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_events ENABLE ROW LEVEL SECURITY;

-- homework: staff manage own school, students read what is assigned to them
CREATE POLICY "Staff manage school homework" ON public.homework FOR ALL TO authenticated
USING (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
)
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Students read their homework" ON public.homework FOR SELECT TO authenticated
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM public.current_student() cs
    WHERE cs.class_id = homework.class_id
      AND (homework.target_student_ids IS NULL OR cs.student_id = ANY (homework.target_student_ids))
  )
);

-- submissions
CREATE POLICY "Staff manage school submissions" ON public.homework_submissions FOR ALL TO authenticated
USING (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
)
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Students read own submissions" ON public.homework_submissions FOR SELECT TO authenticated
USING (student_id IN (SELECT student_id FROM public.current_student()));

CREATE POLICY "Students create own submissions" ON public.homework_submissions FOR INSERT TO authenticated
WITH CHECK (
  student_id IN (SELECT student_id FROM public.current_student())
  AND checked_by IS NULL AND marks IS NULL AND teacher_remark IS NULL AND private_note IS NULL
);

CREATE POLICY "Students update own unchecked submissions" ON public.homework_submissions FOR UPDATE TO authenticated
USING (
  student_id IN (SELECT student_id FROM public.current_student())
  AND checked_at IS NULL
)
WITH CHECK (
  student_id IN (SELECT student_id FROM public.current_student())
  AND checked_by IS NULL AND marks IS NULL AND private_note IS NULL
);

-- exceptions
CREATE POLICY "Staff manage school exceptions" ON public.homework_exceptions FOR ALL TO authenticated
USING (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
)
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Students read own exceptions" ON public.homework_exceptions FOR SELECT TO authenticated
USING (student_id IN (SELECT student_id FROM public.current_student()));

-- events
CREATE POLICY "Staff read school homework events" ON public.homework_events FOR SELECT TO authenticated
USING (
  school_id = public.get_user_school(auth.uid())
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Members log homework events" ON public.homework_events FOR INSERT TO authenticated
WITH CHECK (
  (school_id = public.get_user_school(auth.uid())
   AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
  OR student_id IN (SELECT student_id FROM public.current_student())
);

CREATE POLICY "Students read own homework events" ON public.homework_events FOR SELECT TO authenticated
USING (student_id IN (SELECT student_id FROM public.current_student()));

-- storage policies for the private homework bucket
CREATE POLICY "Staff read school homework files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Staff upload homework files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-files'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);

CREATE POLICY "Owners manage their homework files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'homework-files' AND owner = auth.uid())
WITH CHECK (bucket_id = 'homework-files' AND owner = auth.uid());

CREATE POLICY "Owners delete their homework files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'homework-files' AND owner = auth.uid());

CREATE POLICY "Students upload own homework files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Students read own homework files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Students read teacher homework files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework-files'
  AND (storage.foldername(name))[1] = 'assignments'
);