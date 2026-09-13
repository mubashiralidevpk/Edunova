import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Users, Trash2, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Student } from '@/types/database';
import ExpandedAddStudentDialog from '@/components/students/ExpandedAddStudentDialog';

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('full_name');
    setStudents((data as Student[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    supabase.from('classes').select('id, level, section, class_name, subject').order('level').then(({ data }) => {
      setClasses(data || []);
    });
  }, []);

  const handleDelete = async (student: Student) => {
    setDeletingId(student.id);
    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id);
      if (error) throw error;
      toast({ title: 'Student deleted', description: student.full_name });
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <Button onClick={() => setAddOpen(true)} disabled={classes.length === 0} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        </div>

        <ExpandedAddStudentDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          classes={classes}
          onCreated={fetchStudents}
        />

        {students.length === 0 ? (
          <EmptyState icon={Users} title="No students" description="Click 'Add Student' to enroll one." />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Students ({students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by name, roll number, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4"
              />
              <div className="divide-y">
                {filtered.map((student) => (
                  <div key={student.id} className="py-4 flex items-center justify-between gap-2 hover:bg-muted/30 px-2 -mx-2 rounded transition-colors">
                    <Link to={`/admin/students/${student.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Roll: {student.roll_number} | ID: {student.student_id}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 flex-shrink-0" disabled={deletingId === student.id}>
                          {deletingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete student?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{student.full_name}</strong> (Roll {student.roll_number}) along with their attendance, grades and other records. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(student)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No students match your search.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
