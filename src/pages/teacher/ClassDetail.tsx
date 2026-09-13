import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, CalendarCheck, Bell, FileText, Plus, Settings2, TrendingUp, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Class, Student, Attendance, Announcement, ClassNote } from '@/types/database';
import { TakeAttendanceDialog } from '@/components/teacher/TakeAttendanceDialog';
import { CreateAnnouncementDialog } from '@/components/teacher/CreateAnnouncementDialog';
import { ManageRolesDialog } from '@/components/teacher/ManageRolesDialog';
import { StudentRoleBadges } from '@/components/shared/StudentRoleBadges';
import { useStudentRoles } from '@/hooks/useStudentRoles';
import { useClassAttendanceStats } from '@/hooks/useClassAttendanceStats';
import type { StudentRole } from '@/types/learning';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const { getStudentRoles, assignRole, removeRole } = useStudentRoles(id);
  const { todayStats, weeklyStats, monthlyStats, totalStats, studentStats } = useClassAttendanceStats(id);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  const fetchData = async () => {
    if (!id) return;

    try {
      // Fetch class
      const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      setClassData(cls as Class);

      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', id)
        .order('roll_number');

      setStudents((studentsData as Student[]) || []);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', id)
        .eq('date', today);

      setAttendance((attendanceData as Attendance[]) || []);

      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('class_id', id)
        .order('created_at', { ascending: false });

      setAnnouncements((announcementsData as Announcement[]) || []);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('class_notes')
        .select('*')
        .eq('class_id', id)
        .order('created_at', { ascending: false });

      setNotes((notesData as ClassNote[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = students.length > 0 && attendance.length > 0
    ? Math.round((presentCount / attendance.length) * 100)
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

  if (!classData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Class not found.</p>
          <Link to="/teacher/classes">
            <Button variant="outline" className="mt-4">Back to Classes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/teacher/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{classData.class_name}</h1>
            <p className="text-muted-foreground">{classData.subject}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          <StatCard
            title="Total Students"
            value={students.length}
            icon={Users}
          />
          <StatCard
            title="Today's Attendance"
            value={`${todayStats?.percentage || 0}%`}
            description={todayStats ? `${todayStats.present}/${todayStats.total} present` : 'No data'}
            icon={CalendarCheck}
          />
          <StatCard
            title="Weekly Attendance"
            value={`${weeklyStats?.percentage || 0}%`}
            description={weeklyStats ? `${weeklyStats.present} present this week` : 'No data'}
            icon={TrendingUp}
          />
          <StatCard
            title="Monthly Attendance"
            value={`${monthlyStats?.percentage || 0}%`}
            description={monthlyStats ? `${monthlyStats.present} present this month` : 'No data'}
            icon={TrendingUp}
          />
          <StatCard
            title="Total Attendance"
            value={`${totalStats?.percentage || 0}%`}
            description={totalStats ? `${totalStats.present}/${totalStats.total} all-time` : 'No data'}
            icon={Bell}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/teacher/admissions" className="block">
                    <Button className="w-full justify-start gap-2" variant="outline">
                      <GraduationCap className="h-4 w-4" /> Open Admissions
                    </Button>
                  </Link>
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={() => setAttendanceOpen(true)}>
                    <CalendarCheck className="h-4 w-4" /> Take Attendance
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={() => setAnnouncementOpen(true)}>
                    <Bell className="h-4 w-4" /> Post Announcement
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Class Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level</span>
                    <span className="font-medium">{classData.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section</span>
                    <span className="font-medium">{classData.section}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject</span>
                    <span className="font-medium">{classData.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{new Date(classData.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students">
            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students yet"
                description="Students join through Admissions only. Process applicants there to assign them to this class."
                action={
                  <Link to="/teacher/admissions">
                    <Button className="gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Open Admissions
                    </Button>
                  </Link>
                }
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Students ({students.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {students.map((student) => {
                      const roles = getStudentRoles(student.id);
                      return (
                        <div key={student.id} className="py-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link to={`/teacher/students/${student.id}`} className="font-medium hover:text-primary transition-colors">
                                {student.full_name}
                              </Link>
                              <StudentRoleBadges roles={roles} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Roll: {student.roll_number} | ID: {student.student_id}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setRolesOpen(true);
                            }}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            Roles
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {students.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No students to track"
                description="Students join through Admissions. Once admitted, they'll appear here for attendance."
                action={
                  <Link to="/teacher/admissions">
                    <Button className="gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Open Admissions
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Today's Attendance</h3>
                  <Button onClick={() => setAttendanceOpen(true)}>
                    <CalendarCheck className="h-4 w-4 mr-2" /> Take Attendance
                  </Button>
                </div>
                {attendance.length === 0 ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="No attendance recorded today"
                    description="Take attendance for today's class."
                    action={
                      <Button className="gap-2" onClick={() => setAttendanceOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Take Attendance
                      </Button>
                    }
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="divide-y">
                        {students.map((student) => {
                          const record = attendance.find(a => a.student_id === student.id);
                          return (
                            <div key={student.id} className="py-3 flex items-center justify-between">
                              <span>{student.full_name}</span>
                              <span className={`px-2 py-1 rounded text-sm ${
                                record?.status === 'present' ? 'bg-green-100 text-green-800' :
                                record?.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                record?.status === 'absent' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {record?.status || 'Not marked'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="announcements">
            {announcements.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No announcements"
                description="Post announcements to keep students informed about important updates."
                action={
                  <Button className="gap-2" onClick={() => setAnnouncementOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Post Announcement
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setAnnouncementOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Announcement
                  </Button>
                </div>
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        {announcement.is_pinned && (
                          <span className="text-xs bg-aksms-gold/20 text-aksms-gold px-2 py-1 rounded">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes">
            {notes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No notes"
                description="Create notes and study materials for your students."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground line-clamp-3">{note.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <TakeAttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        classId={id!}
        students={students}
        existingAttendance={attendance}
        onSuccess={fetchData}
      />
      <CreateAnnouncementDialog
        open={announcementOpen}
        onOpenChange={setAnnouncementOpen}
        classId={id!}
        onSuccess={fetchData}
      />
      {selectedStudent && (
        <ManageRolesDialog
          open={rolesOpen}
          onOpenChange={setRolesOpen}
          studentName={selectedStudent.full_name}
          studentId={selectedStudent.id}
          currentRoles={getStudentRoles(selectedStudent.id)}
          onAssignRole={assignRole}
          onRemoveRole={removeRole}
        />
      )}
    </DashboardLayout>
  );
}
