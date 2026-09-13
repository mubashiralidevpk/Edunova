import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Users, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Student, Attendance } from '@/types/database';
import { TakeAttendanceDialog } from '@/components/teacher/TakeAttendanceDialog';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [period, setPeriod] = useState<number>(0);

  useEffect(() => {
    if (!user || classesLoading) return;
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
    fetchStudents();
  }, [user, classesLoading, classes]);

  useEffect(() => {
    if (selectedClassId) fetchAttendance();
  }, [selectedClassId, period]);

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const classIds = classes.map((c) => c.id);
      if (classIds.length === 0) {
        setStudents([]);
        return;
      }
      const { data } = await supabase
        .from('students')
        .select('*')
        .in('class_id', classIds)
        .order('roll_number');
      setStudents((data as Student[]) || []);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loading = classesLoading || studentsLoading;

  const fetchAttendance = async () => {
    if (!selectedClassId) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', selectedClassId)
      .eq('date', today)
      .eq('period', period);

    setAttendance((attendanceData as Attendance[]) || []);
  };

  const classStudents = students.filter(s => s.class_id === selectedClassId);
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage student attendance
            </p>
          </div>
          {classes.length > 0 && classStudents.length > 0 && (
            <Button className="gap-2" onClick={() => setAttendanceOpen(true)}>
              <CalendarCheck className="h-4 w-4" />
              Take Attendance
            </Button>
          )}
        </div>

        {classes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Create a class first to start taking attendance."
            action={
              <Link to="/teacher/classes">
                <Button className="gap-2">Create Class First</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Class + period selectors */}
            <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-64">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Full day</SelectItem>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((p) => (
                    <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>

            {/* Today's Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-foreground">{classStudents.length}</div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                  <p className="text-sm text-muted-foreground">Present</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                  <p className="text-sm text-muted-foreground">Late</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance List */}
            {classStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students in this class"
                description="Add students to this class first, then you can take attendance."
                action={
                  <Link to={`/teacher/classes/${selectedClassId}`}>
                    <Button>Go to Class</Button>
                  </Link>
                }
              />
            ) : attendance.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title={period === 0 ? 'No attendance recorded today' : `No attendance recorded for period ${period}`}
                description="Take attendance for today's class."
                action={
                  <Button className="gap-2" onClick={() => setAttendanceOpen(true)}>
                    <CalendarCheck className="h-4 w-4" />
                    Take Attendance
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{period === 0 ? "Today's Attendance" : `Today's Attendance — Period ${period}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {classStudents.map((student) => {
                      const record = attendance.find(a => a.student_id === student.id);
                      return (
                        <div key={student.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-sm text-muted-foreground">Roll: {student.roll_number}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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
          </>
        )}
      </div>

      {/* Take Attendance Dialog */}
      {selectedClassId && (
        <TakeAttendanceDialog
          open={attendanceOpen}
          onOpenChange={setAttendanceOpen}
          classId={selectedClassId}
          students={classStudents}
          existingAttendance={attendance}
          period={period}
          onSuccess={fetchAttendance}
        />
      )}
    </DashboardLayout>
  );
}
