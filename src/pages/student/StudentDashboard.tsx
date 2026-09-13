import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Lock, Unlock, CalendarCheck, Bell, Calendar, StickyNote, ClipboardList,
  FileText, GraduationCap, Sparkles, TrendingUp, Megaphone, Activity,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Class, Student, Attendance } from '@/types/database';
import { QuickAccess, type QuickAccessItem } from '@/components/dashboard/QuickAccess';
import { QuickRecords, type RecordGroup } from '@/components/dashboard/QuickRecords';
import { useStudentRecords } from '@/hooks/useDashboardRecords';
import { useSessionTracking } from '@/hooks/useSessionTracking';
import { FocusModeToggle } from '@/components/student/FocusModeToggle';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledStudent, setEnrolledStudent] = useState<Student | null>(null);
  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track student session time
  useSessionTracking();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all classes (students can see all classes)
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true });

      setAllClasses((classesData as Class[]) || []);

      // Fetch student's enrollment
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setEnrolledStudent(studentData as Student | null);

      // If enrolled, fetch attendance
      if (studentData) {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentData.id)
          .order('date', { ascending: false })
          .limit(30);

        setMyAttendance((attendanceData as Attendance[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const { loading: recordsLoading, records } = useStudentRecords(enrolledStudent?.id, enrolledStudent?.class_id);

  const studentQuickAccess: QuickAccessItem[] = [
    { label: "Today's Classes", to: '/student/classes', icon: Calendar },
    { label: 'Notes', to: '/student/notes', icon: StickyNote },
    { label: 'Homework', to: '/student/homework', icon: ClipboardList },
    { label: 'Results', to: '/student/results', icon: FileText },
    { label: 'Attendance', to: '/student/attendance', icon: CalendarCheck },
    { label: 'Learning', to: '/student/learning', icon: GraduationCap },
    { label: 'Study Buddy', to: '/student/ai', icon: Sparkles },
    { label: 'Announcements', to: '/student/announcements', icon: Megaphone },
  ];

  const studentGroups: RecordGroup[] = useMemo(() => [
    { key: 'tt', title: "Today's timetable", icon: Calendar, to: '/student/classes', rows: records?.timetable || [], emptyText: 'No periods today' },
    { key: 'assign', title: 'Pending assignments', icon: ClipboardList, count: records?.assignmentsCount ?? 0, rows: records?.assignments || [], emptyText: 'Nothing pending' },
    { key: 'results', title: 'Latest results', icon: FileText, to: '/student/results', rows: records?.results || [], emptyText: 'No published results' },
    { key: 'att', title: 'Attendance', icon: CalendarCheck, to: '/student/attendance', count: records?.attendanceRate, rows: records?.attendance || [], emptyText: 'No attendance records' },
    { key: 'ann', title: 'Recent announcements', icon: Megaphone, to: '/student/announcements', rows: records?.announcements || [], emptyText: 'No announcements' },
    { key: 'exams', title: 'Upcoming assessments', icon: TrendingUp, rows: records?.upcomingExams || [], emptyText: 'No upcoming exams' },
    { key: 'learn', title: 'Recent learning activity', icon: Activity, to: '/student/learning', rows: records?.learning || [], emptyText: 'No activity yet' },
    { key: 'notifs', title: 'Important notifications', icon: Bell, rows: records?.notifications || [], emptyText: 'Nothing new' },
  ], [records]);

  const presentDays = myAttendance.filter(a => a.status === 'present').length;
  const totalDays = myAttendance.length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dash-bento space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your classes and attendance.
            </p>
          </div>
          <FocusModeToggle />
        </div>

        {/* Stats */}
        <div className="bento-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Enrolled Class"
            value={enrolledStudent?.class_id ? '1' : '0'}
            icon={BookOpen}
            description={enrolledStudent ? 'Active enrollment' : 'Not enrolled yet'}
          />
          <StatCard
            title="Present Days"
            value={presentDays}
            icon={CalendarCheck}
            description="Last 30 days"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon={CalendarCheck}
            description="Overall attendance"
          />
          <StatCard
            title="Total Classes"
            value={allClasses.length}
            icon={BookOpen}
            description="Available classes"
          />
        </div>

        <QuickAccess items={studentQuickAccess} description="Everything you need, one tap away" />

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground font-mono">Quick records</h2>
          <QuickRecords loading={recordsLoading} groups={studentGroups} />
        </div>



        {/* Enrollment Status */}
        {!enrolledStudent && (
          <Card className="border-aksms-warning/30 bg-aksms-warning/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-aksms-warning/20 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-aksms-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Not Enrolled</h3>
                  <p className="text-sm text-muted-foreground">
                    You are not enrolled in any class yet. Please contact your teacher or administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Classes */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Classes</h2>
          {allClasses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classes available"
              description="There are no classes in the system yet. Please check back later."
            />
          ) : (
            <div className="bento-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allClasses.map((cls, index) => {
                const isEnrolled = enrolledStudent?.class_id === cls.id;
                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className={`${isEnrolled ? 'border-aksms-emerald ring-1 ring-aksms-emerald/20' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{cls.class_name}</CardTitle>
                          {isEnrolled ? (
                            <Badge className="bg-aksms-emerald text-white">
                              <Unlock className="h-3 w-3 mr-1" />
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{cls.subject}</p>
                        {isEnrolled ? (
                          <Link to={`/student/classes/${cls.id}`}>
                            <button className="w-full py-2 rounded-lg bg-aksms-emerald text-white font-medium hover:bg-aksms-emerald/90 transition-colors">
                              View Class
                            </button>
                          </Link>
                        ) : (
                          <button className="w-full py-2 rounded-lg bg-muted text-muted-foreground font-medium cursor-not-allowed">
                            Contact Teacher to Enroll
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        {enrolledStudent && myAttendance.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Attendance</h2>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  {myAttendance.slice(0, 14).map((record) => (
                    <div
                      key={record.id}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'late'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                      title={`${new Date(record.date).toLocaleDateString()} - ${record.status}`}
                    >
                      {record.status === 'present' ? 'P' : record.status === 'late' ? 'L' : 'A'}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
