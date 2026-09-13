import TeacherAdmissions from '@/pages/teacher/TeacherAdmissions';

export default function AdminAdmissions() {
  // Same workflow — admins are also authorized via the role check inside TeacherAdmissions.
  return <TeacherAdmissions />;
}
