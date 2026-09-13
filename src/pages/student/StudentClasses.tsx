import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Class, Student } from '@/types/database';

export default function StudentClasses() {
  const { user } = useAuth();
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledStudent, setEnrolledStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true });

      setAllClasses((classesData as Class[]) || []);

      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setEnrolledStudent(studentData as Student | null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Classes</h1>
          <p className="text-muted-foreground mt-1">
            View all available classes and your enrollment status.
          </p>
        </div>

        {allClasses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No classes available"
            description="There are no classes in the system yet. Please check back later."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                      <p className="text-xs text-muted-foreground mb-4">Level {cls.level} | Section {cls.section}</p>
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
    </DashboardLayout>
  );
}
