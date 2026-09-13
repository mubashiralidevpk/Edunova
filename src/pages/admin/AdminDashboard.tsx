import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, GraduationCap, Shield, Plus, Clock,
  AlertTriangle, CheckCircle, Calendar, Zap, Bell,
  UserPlus, FileText, ClipboardCheck, Settings, Wallet, BarChart3, Sparkles, ClipboardList,
  Inbox, Receipt, Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuickAccess, type QuickAccessItem } from '@/components/dashboard/QuickAccess';
import { QuickRecords, type RecordGroup } from '@/components/dashboard/QuickRecords';
import { useAdminRecords } from '@/hooks/useDashboardRecords';
import { Profile, Class, Student, UserRole } from '@/types/database';
import { useCheckinSystem } from '@/hooks/useCheckinSystem';

const adminQuickAccess: QuickAccessItem[] = [
  { label: 'Add Student', to: '/admin/students', icon: UserPlus },
  { label: 'Teacher Management', to: '/admin/teacher-management', icon: GraduationCap },
  { label: 'Create Class', to: '/admin/classes/new', icon: BookOpen },
  { label: 'Admissions', to: '/admin/admissions', icon: FileText },
  { label: 'Exam Management', to: '/admin/exam-terms', icon: ClipboardCheck },
  { label: 'Attendance', to: '/admin/checkin', icon: ClipboardList },
  { label: 'Schedule', to: '/admin/schedule', icon: Calendar },
  { label: 'School Settings', to: '/admin/settings', icon: Settings },
  { label: 'Financials', to: '/admin/financials', icon: Wallet },
  { label: 'Reports', to: '/admin/students', icon: BarChart3 },
  { label: 'AI', to: '/admin/ai', icon: Sparkles },
];


export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const { checkins, impacts, notifications, unreadCount, calculateImpact } = useCheckinSystem();
  const { loading: recordsLoading, records } = useAdminRecords();

  const adminGroups: RecordGroup[] = useMemo(() => [
    { key: 'pending-adm', title: 'Pending admissions', icon: Inbox, to: '/admin/admissions', count: records?.pendingAdmissionsCount ?? 0, rows: records?.pendingAdmissions || [], emptyText: 'No pending applications' },
    { key: 'recent-apps', title: 'Recent applications', icon: FileText, to: '/admin/admissions', rows: records?.recentApplications || [], emptyText: 'No applications yet' },
    { key: 'attendance', title: "Today's attendance", icon: ClipboardList, to: '/admin/checkin', count: records?.attendanceSummary, rows: records?.attendanceToday || [], emptyText: 'Attendance not marked yet' },
    { key: 'absent-late', title: 'Absent / late overview', icon: AlertTriangle, to: '/admin/checkin', rows: records?.absentLate || [], emptyText: 'Nobody absent or late' },
    { key: 'exams', title: 'Upcoming examinations', icon: Calendar, to: '/admin/exam-terms', rows: records?.upcomingExams || [], emptyText: 'No upcoming terms' },
    { key: 'checking', title: 'Pending grading / checking', icon: ClipboardCheck, to: '/admin/exam-terms', count: records?.pendingCheckingCount ?? 0, rows: records?.pendingChecking || [], emptyText: 'No papers waiting' },
    { key: 'payments', title: 'Recent payments', icon: Receipt, to: '/admin/financials', rows: records?.recentPayments || [], emptyText: 'No payments recorded' },
    { key: 'checkins', title: 'Teacher check-in status', icon: Clock, to: '/admin/checkin', rows: records?.checkins || [], emptyText: 'No check-ins today' },
    { key: 'notifs', title: 'Important alerts', icon: Bell, rows: records?.notifications || [], emptyText: 'No alerts' },
    { key: 'activity', title: 'Recent school activity', icon: Activity, rows: records?.activity || [], emptyText: 'No recent activity' },
  ], [records]);


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes, classesRes, studentsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('classes').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*').order('created_at', { ascending: false }),
      ]);

      setProfiles((profilesRes.data as Profile[]) || []);
      setUserRoles((rolesRes.data as UserRole[]) || []);
      setClasses((classesRes.data as Class[]) || []);
      setStudents((studentsRes.data as Student[]) || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const teacherCount = userRoles.filter(r => r.role === 'teacher').length;
  const presentCount = checkins.filter(c => c.status === 'present').length;
  const lateCount = checkins.filter(c => c.status === 'late').length;
  const impactedCount = impacts.filter(i => i.status === 'impacted' || i.status === 'volunteer_pending').length;

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
      <div className="dash-bento space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground font-mono text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={calculateImpact} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" /> Run Impact Check
            </Button>
            <Link to="/admin/teacher-management">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Teacher</Button>
            </Link>
          </div>
        </div>

        {/* Main Stats */}
        <div className="bento-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Teachers" value={teacherCount} icon={GraduationCap} description={`${presentCount} present today`} />
          <StatCard title="Students" value={students.length} icon={Users} description="Total enrolled" />
          <StatCard title="Classes" value={classes.length} icon={BookOpen} description="Active classes" />
          <StatCard title="Impacted" value={impactedCount} icon={AlertTriangle} description="Classes need coverage" />
        </div>

        <QuickAccess items={adminQuickAccess} description="Jump straight into the work you do most" />

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground font-mono">Quick records</h2>
          <QuickRecords loading={recordsLoading} groups={adminGroups} />
        </div>



        {/* Today's Check-in Status + Recent Alerts */}
        <div className="bento-grid grid gap-6 lg:grid-cols-2">
          {/* Check-in Summary */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-primary" /> Today's Check-ins
                </CardTitle>
                <Link to="/admin/checkin">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <p className="text-2xl font-bold text-accent">{presentCount}</p>
                  <p className="text-xs text-muted-foreground">On Time</p>
                </div>
                <div className="text-center p-3 bg-[hsl(45,100%,55%)]/10 rounded-lg">
                  <p className="text-2xl font-bold text-[hsl(45,100%,55%)]">{lateCount}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
                <div className="text-center p-3 bg-destructive/10 rounded-lg">
                  <p className="text-2xl font-bold text-destructive-foreground">{Math.max(0, teacherCount - checkins.length)}</p>
                  <p className="text-xs text-muted-foreground">Not Arrived</p>
                </div>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {checkins.slice(0, 8).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <span>{c.teacher_profile?.full_name || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{format(new Date(c.checkin_time), 'h:mm a')}</span>
                        <Badge variant={c.status === 'present' ? 'default' : 'destructive'} className="text-xs">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Class Impacts */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive-foreground" /> Class Impacts
                </CardTitle>
                <Link to="/admin/checkin">
                  <Button variant="ghost" size="sm">Manage</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[260px]">
                {impacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-accent opacity-50" />
                    <p className="text-sm">No impacts today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {impacts.map(impact => (
                      <div key={impact.id} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{impact.classes?.class_name}</p>
                            <p className="text-xs text-muted-foreground">
                              P{impact.period} • {impact.teacher_profile?.full_name}
                            </p>
                          </div>
                          <Badge
                            variant={impact.status === 'impacted' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {impact.status === 'replacement_approved' ? '✓ Resolved' : impact.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        {unreadCount > 0 && (
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" /> Recent Alerts
                <Badge className="bg-primary text-primary-foreground">{unreadCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.filter(n => !n.is_read).slice(0, 5).map(n => (
                  <div key={n.id} className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="bento-grid grid gap-4 md:grid-cols-3">
          <Link to="/admin/teacher-management">
            <Card className="glass-card hover:neon-border transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Manage Teachers</h3>
                  <p className="text-sm text-muted-foreground">Create accounts & timetables</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/checkin">
            <Card className="glass-card hover:neon-border transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Attendance Register</h3>
                  <p className="text-sm text-muted-foreground">Review & override check-ins</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/classes">
            <Card className="glass-card hover:neon-border transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">All Classes</h3>
                  <p className="text-sm text-muted-foreground">View & manage classes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
