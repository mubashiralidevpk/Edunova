import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Users, Search, MoreVertical, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Class, Student } from '@/types/database';

export default function TeacherClasses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [{ data: ownedClasses, error: ownedClassesError }, { data: assignedClasses, error: assignedClassesError }] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('class_teachers')
          .select('class_id, invitation_status')
          .eq('teacher_id', user.id)
          .eq('invitation_status', 'accepted'),
      ]);

      if (ownedClassesError) throw ownedClassesError;
      if (assignedClassesError) throw assignedClassesError;

      const assignedClassIds = [...new Set((assignedClasses || []).map((assignment) => assignment.class_id))];

      const { data: enrolledClasses, error: enrolledClassesError } = assignedClassIds.length > 0
        ? await supabase
            .from('classes')
            .select('*')
            .in('id', assignedClassIds)
        : { data: [], error: null };

      if (enrolledClassesError) throw enrolledClassesError;

      const mergedClasses = [...(ownedClasses || []), ...((enrolledClasses as Class[] | null) || [])]
        .reduce<Class[]>((acc, current) => {
          if (!acc.some((item) => item.id === current.id)) {
            acc.push(current as Class);
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setClasses(mergedClasses);

      const classIds = mergedClasses.map((c) => c.id);
      if (classIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .in('class_id', classIds);

        setStudents((studentsData as Student[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!classToDelete) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classToDelete.id);

      if (error) throw error;

      toast({
        title: 'Class deleted',
        description: `${classToDelete.class_name} has been deleted successfully.`,
      });

      setClasses(classes.filter(c => c.id !== classToDelete.id));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the class.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
            <p className="text-muted-foreground mt-1">
              Classes assigned to you in your school
            </p>
          </div>
        </div>

        {/* Search */}
        {classes.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes yet"
            description="Your school administrator hasn't assigned any classes to you yet. Once a class is created and assigned, it will appear here."
          />
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No classes match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls, index) => {
              const classStudents = students.filter(s => s.class_id === cls.id);
              return (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-aksms-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Link to={`/teacher/classes/${cls.id}`}>
                          <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer">
                            {cls.class_name}
                          </CardTitle>
                        </Link>
                        {cls.teacher_id === user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/teacher/classes/${cls.id}`} className="flex items-center gap-2">
                                  <Edit className="h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setClassToDelete(cls);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{cls.subject}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {classStudents.length} students
                        </span>
                      </div>
                      <Link to={`/teacher/classes/${cls.id}`}>
                        <Button variant="outline" className="w-full mt-4">
                          View Class
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {classToDelete?.class_name}? This action cannot be undone.
              All students, attendance records, and announcements for this class will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
