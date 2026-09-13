import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RecordRow } from '@/components/dashboard/QuickRecords';

const today = () => new Date().toISOString().split('T')[0];

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

const statusTone = (s: string): RecordRow['tone'] => {
  const v = (s || '').toLowerCase();
  if (['present', 'admitted', 'passed', 'published', 'finalized', 'approved'].includes(v)) return 'success';
  if (['absent', 'rejected', 'failed'].includes(v)) return 'danger';
  if (['late', 'pending', 'needs_review', 'checked', 'leave'].includes(v)) return 'warning';
  return 'default';
};

export interface AdminRecords {
  pendingAdmissions: RecordRow[];
  pendingAdmissionsCount: number;
  recentApplications: RecordRow[];
  attendanceToday: RecordRow[];
  attendanceSummary: string;
  absentLate: RecordRow[];
  upcomingExams: RecordRow[];
  pendingChecking: RecordRow[];
  pendingCheckingCount: number;
  recentPayments: RecordRow[];
  checkins: RecordRow[];
  notifications: RecordRow[];
  activity: RecordRow[];
}

export function useAdminRecords() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminRecords | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const d = today();
      try {
        const [applicants, classesRes, exams, checks, payments, checkinsRes, notifs] = await Promise.all([
          supabase.from('admission_applicants').select('id, full_name, status, desired_class_level, created_at').order('created_at', { ascending: false }).limit(30),
          supabase.from('classes').select('id, class_name'),
          supabase.from('exam_terms').select('id, name, start_date, is_closed').gte('end_date', d).order('start_date').limit(6),
          supabase.from('exam_paper_checks').select('id, subject, status, identified_student_name, needs_review, created_at').neq('status', 'published').order('created_at', { ascending: false }).limit(20),
          supabase.from('fee_payments').select('id, amount, paid_on, receipt_number, payment_method').is('voided_at', null).order('paid_on', { ascending: false }).limit(6),
          supabase.from('teacher_checkins').select('id, status, arrival_status, checkin_time, teacher_id').eq('date', d).order('checkin_time', { ascending: false }).limit(20),
          supabase.from('system_notifications').select('id, title, message, is_read, created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(10),
        ]);

        const classIds = (classesRes.data || []).map((c) => c.id);
        const classNames = new Map((classesRes.data || []).map((c) => [c.id, c.class_name]));
        let attendance: { id: string; status: string; class_id: string; student_id: string; period: number | null }[] = [];
        if (classIds.length) {
          const { data: att } = await supabase
            .from('attendance')
            .select('id, status, class_id, student_id, period')
            .eq('date', d)
            .in('class_id', classIds);
          attendance = att || [];
        }

        const teacherIds = (checkinsRes.data || []).map((c) => c.teacher_id);
        let teacherNames = new Map<string, string>();
        if (teacherIds.length) {
          const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', teacherIds);
          teacherNames = new Map((profs || []).map((p) => [p.user_id, p.full_name]));
        }

        const apps = applicants.data || [];
        const pending = apps.filter((a) => !['admitted', 'rejected'].includes((a.status || '').toLowerCase()));
        const present = attendance.filter((a) => a.status === 'present').length;
        const absent = attendance.filter((a) => a.status === 'absent');
        const late = attendance.filter((a) => a.status === 'late');

        const result: AdminRecords = {
          pendingAdmissionsCount: pending.length,
          pendingAdmissions: pending.slice(0, 4).map((a) => ({
            id: a.id, primary: a.full_name, secondary: `Class ${a.desired_class_level}`, badge: a.status, tone: statusTone(a.status), to: '/admin/admissions',
          })),
          recentApplications: apps.slice(0, 4).map((a) => ({
            id: `r-${a.id}`, primary: a.full_name, secondary: `Applied ${fmtDate(a.created_at)}`, badge: a.status, tone: statusTone(a.status), to: '/admin/admissions',
          })),
          attendanceSummary: attendance.length ? `${present}/${attendance.length} present` : 'No records',
          attendanceToday: attendance.length
            ? [
                { id: 'p', primary: 'Present', secondary: 'Marked today', badge: String(present), tone: 'success' },
                { id: 'a', primary: 'Absent', secondary: 'Marked today', badge: String(absent.length), tone: 'danger' },
                { id: 'l', primary: 'Late', secondary: 'Marked today', badge: String(late.length), tone: 'warning' },
              ]
            : [],
          absentLate: [...absent, ...late].slice(0, 4).map((a) => ({
            id: a.id, primary: classNames.get(a.class_id) || 'Class', secondary: a.period ? `Period ${a.period}` : 'Full day', badge: a.status, tone: statusTone(a.status),
          })),
          upcomingExams: (exams.data || []).slice(0, 4).map((e) => ({
            id: e.id, primary: e.name, secondary: `Starts ${fmtDate(e.start_date)}`, badge: e.is_closed ? 'closed' : 'open', tone: e.is_closed ? 'default' : 'success', to: '/admin/exam-terms',
          })),
          pendingCheckingCount: (checks.data || []).length,
          pendingChecking: (checks.data || []).slice(0, 4).map((c) => ({
            id: c.id, primary: c.identified_student_name || 'Unidentified paper', secondary: c.subject, badge: c.needs_review ? 'review' : c.status, tone: c.needs_review ? 'warning' : statusTone(c.status), to: '/admin/exam-terms',
          })),
          recentPayments: (payments.data || []).map((p) => ({
            id: p.id, primary: `Rs ${Number(p.amount).toLocaleString()}`, secondary: `${p.receipt_number} • ${fmtDate(p.paid_on)}`, badge: p.payment_method, to: '/admin/financials',
          })),
          checkins: (checkinsRes.data || []).slice(0, 4).map((c) => ({
            id: c.id, primary: teacherNames.get(c.teacher_id) || 'Teacher', secondary: new Date(c.checkin_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), badge: c.arrival_status || c.status, tone: statusTone(c.arrival_status || c.status), to: '/admin/checkin',
          })),
          notifications: (notifs.data || []).slice(0, 4).map((n) => ({
            id: n.id, primary: n.title, secondary: n.message, badge: n.is_read ? undefined : 'new', tone: 'warning',
          })),
          activity: apps.slice(0, 4).map((a) => ({
            id: `act-${a.id}`, primary: `Application • ${a.full_name}`, secondary: fmtDate(a.created_at),
          })),
        };
        if (!cancelled) setData(result);
      } catch (e) {
        console.error('Quick records failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  return { loading, records: data };
}

export interface TeacherRecords {
  todayClasses: RecordRow[];
  attendanceAction: RecordRow[];
  papersWaiting: RecordRow[];
  papersWaitingCount: number;
  pendingGrading: RecordRow[];
  upcomingExams: RecordRow[];
  recentPerformance: RecordRow[];
  announcements: RecordRow[];
  checkinStatus: RecordRow[];
  notifications: RecordRow[];
}

export function useTeacherRecords(classIds: string[], ready: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeacherRecords | null>(null);

  useEffect(() => {
    if (!user || !ready) return;
    let cancelled = false;

    (async () => {
      const d = today();
      const dow = new Date().getDay();
      try {
        const [schedules, classesRes, checks, exams, announce, checkin, notifs] = await Promise.all([
          supabase.from('teacher_schedules').select('id, class_id, subject, period, start_time, day_of_week').eq('teacher_id', user.id).eq('day_of_week', dow).order('period'),
          classIds.length ? supabase.from('classes').select('id, class_name').in('id', classIds) : Promise.resolve({ data: [] as any[] }),
          supabase.from('exam_paper_checks').select('id, subject, status, identified_student_name, needs_review, created_at').neq('status', 'published').order('created_at', { ascending: false }).limit(20),
          supabase.from('exam_terms').select('id, name, start_date, is_closed').gte('end_date', d).order('start_date').limit(5),
          supabase.from('announcements').select('id, title, content, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('teacher_checkins').select('id, status, arrival_status, checkin_time').eq('teacher_id', user.id).eq('date', d).maybeSingle(),
          supabase.from('system_notifications').select('id, title, message, is_read, created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(6),
        ]);

        const classNames = new Map(((classesRes.data as any[]) || []).map((c) => [c.id, c.class_name]));

        let attendanceMarked = new Set<string>();
        let results: any[] = [];
        let grading: any[] = [];
        if (classIds.length) {
          const [attRes, resRes, assignRes] = await Promise.all([
            supabase.from('attendance').select('class_id').eq('date', d).in('class_id', classIds),
            supabase.from('student_exam_results').select('id, subject, obtained_marks, total_marks, grade, created_at, student_id').in('class_id', classIds).order('created_at', { ascending: false }).limit(6),
            supabase.from('assignments').select('id, title, due_date, class_id').in('class_id', classIds).eq('teacher_id', user.id).order('due_date', { ascending: false }).limit(10),
          ]);
          attendanceMarked = new Set(((attRes.data as any[]) || []).map((a) => a.class_id));
          results = (resRes.data as any[]) || [];
          const assignments = (assignRes.data as any[]) || [];
          if (assignments.length) {
            const { data: grades } = await supabase
              .from('student_grades')
              .select('id, assignment_id, score')
              .in('assignment_id', assignments.map((a) => a.id))
              .is('score', null);
            const byAssignment = new Map<string, number>();
            ((grades as any[]) || []).forEach((g) => byAssignment.set(g.assignment_id, (byAssignment.get(g.assignment_id) || 0) + 1));
            grading = assignments
              .filter((a) => byAssignment.get(a.id))
              .map((a) => ({ ...a, pending: byAssignment.get(a.id) }));
          }
        }

        const result: TeacherRecords = {
          todayClasses: ((schedules.data as any[]) || []).slice(0, 4).map((s) => ({
            id: s.id, primary: classNames.get(s.class_id) || 'Class', secondary: `${s.subject || 'Lesson'} • ${String(s.start_time).slice(0, 5)}`, badge: `P${s.period}`, to: '/teacher/classes',
          })),
          attendanceAction: classIds.filter((id) => !attendanceMarked.has(id)).slice(0, 4).map((id) => ({
            id, primary: classNames.get(id) || 'Class', secondary: 'Attendance not marked today', badge: 'pending', tone: 'warning', to: '/teacher/attendance',
          })),
          papersWaitingCount: ((checks.data as any[]) || []).length,
          papersWaiting: ((checks.data as any[]) || []).slice(0, 4).map((c) => ({
            id: c.id, primary: c.identified_student_name || 'Unidentified paper', secondary: c.subject, badge: c.needs_review ? 'review' : c.status, tone: c.needs_review ? 'warning' : statusTone(c.status), to: '/teacher/exams',
          })),
          pendingGrading: grading.slice(0, 4).map((a) => ({
            id: a.id, primary: a.title, secondary: classNames.get(a.class_id) || 'Class', badge: `${a.pending} to grade`, tone: 'warning', to: '/teacher/results',
          })),
          upcomingExams: ((exams.data as any[]) || []).slice(0, 4).map((e) => ({
            id: e.id, primary: e.name, secondary: `Starts ${fmtDate(e.start_date)}`, badge: e.is_closed ? 'closed' : 'open', tone: e.is_closed ? 'default' : 'success', to: '/teacher/exams',
          })),
          recentPerformance: results.slice(0, 4).map((r) => ({
            id: r.id, primary: `${r.subject}`, secondary: `${r.obtained_marks}/${r.total_marks}`, badge: r.grade || undefined, to: '/teacher/results',
          })),
          announcements: ((announce.data as any[]) || []).slice(0, 4).map((a) => ({
            id: a.id, primary: a.title, secondary: a.content,
          })),
          checkinStatus: checkin.data
            ? [{
                id: 'ci', primary: 'Checked in',
                secondary: new Date((checkin.data as any).checkin_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
                badge: (checkin.data as any).arrival_status || (checkin.data as any).status,
                tone: statusTone((checkin.data as any).arrival_status || (checkin.data as any).status),
                to: '/teacher/checkin',
              }]
            : [],
          notifications: ((notifs.data as any[]) || []).slice(0, 4).map((n) => ({
            id: n.id, primary: n.title, secondary: n.message, badge: n.is_read ? undefined : 'new', tone: 'warning',
          })),
        };
        if (!cancelled) setData(result);
      } catch (e) {
        console.error('Quick records failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, ready, classIds.join(',')]);

  return { loading, records: data };
}

export interface StudentRecords {
  timetable: RecordRow[];
  assignments: RecordRow[];
  assignmentsCount: number;
  results: RecordRow[];
  attendance: RecordRow[];
  attendanceRate: string;
  announcements: RecordRow[];
  upcomingExams: RecordRow[];
  learning: RecordRow[];
  notifications: RecordRow[];
}

export function useStudentRecords(studentId?: string | null, classId?: string | null) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentRecords | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const d = today();
      const dow = new Date().getDay();
      try {
        const [schedules, assignments, results, attendance, announce, exams, activity, notifs] = await Promise.all([
          classId ? supabase.from('teacher_schedules').select('id, subject, period, start_time, room_number').eq('class_id', classId).eq('day_of_week', dow).order('period') : Promise.resolve({ data: [] as any[] }),
          classId ? supabase.from('assignments').select('id, title, due_date, max_score').eq('class_id', classId).eq('is_published', true).order('due_date', { ascending: true }).limit(10) : Promise.resolve({ data: [] as any[] }),
          studentId ? supabase.from('student_exam_results').select('id, subject, obtained_marks, total_marks, grade, term_name, created_at').eq('student_id', studentId).eq('is_published', true).order('created_at', { ascending: false }).limit(6) : Promise.resolve({ data: [] as any[] }),
          studentId ? supabase.from('attendance').select('id, status, date, period').eq('student_id', studentId).order('date', { ascending: false }).limit(40) : Promise.resolve({ data: [] as any[] }),
          classId ? supabase.from('announcements').select('id, title, content, created_at').eq('class_id', classId).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] as any[] }),
          supabase.from('exam_terms').select('id, name, start_date, is_closed').gte('end_date', d).order('start_date').limit(5),
          studentId ? supabase.from('student_activity').select('id, activity_type, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(5) : Promise.resolve({ data: [] as any[] }),
          supabase.from('system_notifications').select('id, title, message, is_read, created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(6),
        ]);

        const att = (attendance.data as any[]) || [];
        const present = att.filter((a) => a.status === 'present').length;
        const rate = att.length ? Math.round((present / att.length) * 100) : 0;

        let gradedIds = new Set<string>();
        const assignmentList = (assignments.data as any[]) || [];
        if (studentId && assignmentList.length) {
          const { data: grades } = await supabase
            .from('student_grades')
            .select('assignment_id, submitted_at')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentList.map((a) => a.id));
          gradedIds = new Set(((grades as any[]) || []).filter((g) => g.submitted_at).map((g) => g.assignment_id));
        }
        const pendingAssignments = assignmentList.filter((a) => !gradedIds.has(a.id));

        const result: StudentRecords = {
          timetable: ((schedules.data as any[]) || []).slice(0, 4).map((s) => ({
            id: s.id, primary: s.subject || 'Lesson', secondary: `${String(s.start_time).slice(0, 5)}${s.room_number ? ` • Room ${s.room_number}` : ''}`, badge: `P${s.period}`, to: '/student/classes',
          })),
          assignmentsCount: pendingAssignments.length,
          assignments: pendingAssignments.slice(0, 4).map((a) => ({
            id: a.id, primary: a.title, secondary: a.due_date ? `Due ${fmtDate(a.due_date)}` : 'No due date', badge: `${a.max_score} marks`, tone: 'warning', to: '/student/classes',
          })),
          results: ((results.data as any[]) || []).slice(0, 4).map((r) => ({
            id: r.id, primary: r.subject, secondary: `${r.term_name} • ${r.obtained_marks}/${r.total_marks}`, badge: r.grade || undefined, tone: 'success', to: '/student/results',
          })),
          attendanceRate: att.length ? `${rate}%` : 'No data',
          attendance: att.slice(0, 4).map((a) => ({
            id: a.id, primary: fmtDate(a.date), secondary: a.period ? `Period ${a.period}` : 'Full day', badge: a.status, tone: statusTone(a.status), to: '/student/attendance',
          })),
          announcements: ((announce.data as any[]) || []).slice(0, 4).map((a) => ({
            id: a.id, primary: a.title, secondary: a.content, to: '/student/announcements',
          })),
          upcomingExams: ((exams.data as any[]) || []).slice(0, 4).map((e) => ({
            id: e.id, primary: e.name, secondary: `Starts ${fmtDate(e.start_date)}`, badge: e.is_closed ? 'closed' : 'open', tone: e.is_closed ? 'default' : 'success',
          })),
          learning: ((activity.data as any[]) || []).slice(0, 4).map((a) => ({
            id: a.id, primary: String(a.activity_type).replace(/_/g, ' '), secondary: fmtDate(a.created_at), to: '/student/learning',
          })),
          notifications: ((notifs.data as any[]) || []).slice(0, 4).map((n) => ({
            id: n.id, primary: n.title, secondary: n.message, badge: n.is_read ? undefined : 'new', tone: 'warning',
          })),
        };
        if (!cancelled) setData(result);
      } catch (e) {
        console.error('Quick records failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, studentId, classId]);

  return { loading, records: data };
}
