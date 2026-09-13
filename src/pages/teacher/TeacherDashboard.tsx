import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, CalendarCheck, TrendingUp, ClipboardList, ClipboardCheck, FileText,
  StickyNote, Megaphone, Calendar, Sparkles, Clock, Bell, AlertTriangle, GraduationCap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaffRoles } from '@/hooks/useStaffRoles';
import { QuickAccess, type QuickAccessItem } from '@/components/dashboard/QuickAccess';
import { QuickRecords, type RecordGroup } from '@/components/dashboard/QuickRecords';
import { useTeacherRecords } from '@/hooks/useDashboardRecords';
import { Student, Attendance } from '@/types/database';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses();
  const { roles: staffRoles, isAdmissionManager } = useStaffRoles();
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    if (!user || classesLoading) return;
    fetchExtra();
  }, [user, classesLoading, classes]);

  const fetchExtra = async () => {
    setExtraLoading(true);
    try {
      const classIds = classes.map((c) => c.id);
      if (classIds.length === 0) {
        setStudents([]);
        setTodayAttendance([]);
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const [stuRes, attRes] = await Promise.all([
        supabase.from('students').select('*').in('class_id', classIds),
        supabase.from('attendance').select('*').in('class_id', classIds).eq('date', today),
      ]);
      setStudents((stuRes.data as Student[]) || []);
      setTodayAttendance((attRes.data as Attendance[]) || []);
    } catch (error) {
      console.error('Error fetching dashboard extras:', error);
    } finally {
      setExtraLoading(false);
    }
  };

  const classIds = classes.map((c) => c.id);
  const { loading: recordsLoading, records } = useTeacherRecords(classIds, !classesLoading);

  const quickAccessItems: QuickAccessItem[] = useMemo(() => {
    const items: QuickAccessItem[] = [
      { label: 'My Classes', to: '/teacher/classes', icon: BookOpen },
      { label: 'Homework', to: '/teacher/homework', icon: FileText },
      { label: 'Attendance', to: '/teacher/attendance', icon: ClipboardList },
      { label: 'Exam Management', to: '/teacher/exams', icon: ClipboardCheck },
      { label: 'Results', to: '/teacher/results', icon: FileText },
    ];
    if (isAdmissionManager) {
      items.push({ label: 'Admissions', to: '/teacher/admissions', icon: GraduationCap });
    }
    items.push(
      { label: 'Notes', to: '/teacher/classes', icon: StickyNote },
      { label: 'Announcements', to: '/teacher/classes', icon: Megaphone },
      
      { label: 'Check-in', to: '/teacher/checkin', icon: Clock },
    );
    return items;
  }, [isAdmissionManager]);

  const teacherGroups: RecordGroup[] = useMemo(() => [
    { key: 'today', title: "Today's classes", icon: Calendar, to: '/teacher/classes', rows: records?.todayClasses || [], emptyText: 'No periods scheduled today' },
    { key: 'att', title: 'Attendance requiring action', icon: ClipboardList, to: '/teacher/attendance', rows: records?.attendanceAction || [], emptyText: 'All classes marked' },
    { key: 'papers', title: 'Papers waiting for checking', icon: ClipboardCheck, to: '/teacher/exams', count: records?.papersWaitingCount ?? 0, rows: records?.papersWaiting || [], emptyText: 'No papers waiting' },
    { key: 'grading', title: 'Pending grading', icon: FileText, to: '/teacher/results', rows: records?.pendingGrading || [], emptyText: 'Nothing to grade' },
    { key: 'exams', title: 'Upcoming examinations', icon: CalendarCheck, to: '/teacher/exams', rows: records?.upcomingExams || [], emptyText: 'No upcoming terms' },
    { key: 'perf', title: 'Recent student performance', icon: TrendingUp, to: '/teacher/results', rows: records?.recentPerformance || [], emptyText: 'No results yet' },
    { key: 'ann', title: 'Announcements', icon: Megaphone, rows: records?.announcements || [], emptyText: 'No announcements' },
    { key: 'ci', title: 'Check-in status', icon: Clock, to: '/teacher/checkin', rows: records?.checkinStatus || [], emptyText: 'Not checked in today' },
    { key: 'notifs', title: 'Important tasks', icon: Bell, rows: records?.notifications || [], emptyText: 'Nothing pending' },
  ], [records]);

  const loading = classesLoading || extraLoading;

  const totalStudents = students.length;
  const presentToday = todayAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalStudents > 0 && todayAttendance.length > 0
    ? Math.round((presentToday / todayAttendance.length) * 100)
    : 0;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's an overview of your classes.
            </p>
            {staffRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {staffRoles.map((r) => (
                  <Badge key={r} variant="outline" className="border-primary/30 text-primary">{r}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bento-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Classes"
            value={classes.length}
            icon={BookOpen}
            description="Classes you manage"
          />
          <StatCard
            title="Total Students"
            value={totalStudents}
            icon={Users}
            description="Across all classes"
          />
          <StatCard
            title="Present Today"
            value={presentToday}
            icon={CalendarCheck}
            description="Students marked present"
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            icon={TrendingUp}
            description="Today's attendance"
          />
        </div>

        <QuickAccess items={quickAccessItems} description="Your most-used teaching tools" />

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground font-mono">Quick records</h2>
          <QuickRecords loading={recordsLoading} groups={teacherGroups} />
        </div>



        {/* Classes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Your Classes</h2>
            {classes.length > 0 && (
              <Link to="/teacher/classes">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            )}
          </div>

          {classes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No classes assigned"
              description="Your administrator hasn't assigned any classes to you yet. Once a class is assigned, it will appear here."
            />
          ) : (
            <div className="bento-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.slice(0, 6).map((cls, index) => {
                const classStudents = students.filter(s => s.class_id === cls.id);
                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link to={`/teacher/classes/${cls.id}`}>
                      <Card className="hover:shadow-aksms-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{cls.class_name}</CardTitle>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{cls.subject}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {classStudents.length} students
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="bento-grid grid gap-4 md:grid-cols-2">
            <Link to="/teacher/students">
              <Card className="hover:shadow-aksms-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-aksms-info/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-aksms-info" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Add Students</h3>
                    <p className="text-sm text-muted-foreground">Enroll new students</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/teacher/attendance">
              <Card className="hover:shadow-aksms-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-aksms-gold/10 flex items-center justify-center">
                    <CalendarCheck className="h-6 w-6 text-aksms-gold" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Take Attendance</h3>
                    <p className="text-sm text-muted-foreground">Mark today's attendance</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
