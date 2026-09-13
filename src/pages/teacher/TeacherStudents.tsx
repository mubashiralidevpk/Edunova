import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Search, BookOpen, ChevronRight, GraduationCap, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Class, Student } from '@/types/database';
import ExpandedAddStudentDialog from '@/components/students/ExpandedAddStudentDialog';

export default function TeacherStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { classes, loading: classesLoading } = useTeacherClasses();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!user || classesLoading) return;
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, classesLoading, classes]);

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
        .order('full_name');
      setStudents((data as Student[]) || []);
    } catch (e) {
      console.error('Error fetching students:', e);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loading = classesLoading || studentsLoading;

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClassName = (classId: string | null) => {
    if (!classId) return 'Unassigned';
    const cls = classes.find((c) => c.id === classId);
    return cls ? `${cls.class_name} - ${cls.subject}` : 'Unknown';
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground mt-1">
              Students join through Admissions only. Review applicants on the Admissions page.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAddOpen(true)} disabled={classes.length === 0} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
            <Link to="/teacher/admissions">
              <Button variant="outline" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Open Admissions
              </Button>
            </Link>
          </div>
        </div>

        <ExpandedAddStudentDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          classes={classes as any}
          onCreated={fetchStudents}
        />

        {students.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {classes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Create a class first. Students appear here after they're admitted via Admissions."
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Students join the school through Admissions. Process applicants there to add them to your class."
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
            <CardHeader>
              <CardTitle>All Students ({filteredStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students match your search.</p>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/teacher/students/${student.id}`)}>
                        <p className="font-medium text-foreground">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Roll: {student.roll_number} | ID: {student.student_id}
                        </p>
                        <p className="text-sm text-muted-foreground">Class: {getClassName(student.class_id)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/students/${student.id}`)}>
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
