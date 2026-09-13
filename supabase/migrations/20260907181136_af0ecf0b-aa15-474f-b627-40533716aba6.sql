REVOKE ALL ON FUNCTION public.homework_set_school() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.homework_submission_set_school() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_student() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_student() TO authenticated;