import { useState, useEffect } from 'react';
import { Clock, Calendar, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Schedule {
  id: string;
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  class_id: string;
  room_number: string | null;
  subject: string | null;
  class_name?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherScheduleSetup() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('teacher_schedules')
        .select('*, classes:class_id(class_name)')
        .eq('teacher_id', user?.id)
        .order('day_of_week')
        .order('period');

      setSchedules(
        (data || []).map((s: any) => ({ ...s, class_name: s.classes?.class_name })) as Schedule[]
      );
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
          <h1 className="text-3xl font-bold text-foreground">My Timetable</h1>
          <p className="text-muted-foreground">
            Your timetable is managed by the school administrator.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Weekly schedule
            </CardTitle>
            <CardDescription>Read-only. Contact your admin to make changes.</CardDescription>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No periods assigned yet</p>
                <p className="text-sm mt-2">Your administrator will set up your schedule.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {DAYS.map((day, dayIndex) => {
                  const daySchedules = schedules.filter((s) => s.day_of_week === dayIndex);
                  if (daySchedules.length === 0) return null;
                  return (
                    <div key={day}>
                      <h4 className="font-medium mb-2 text-primary">{day}</h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {daySchedules.map((s) => (
                          <div key={s.id} className="p-3 glass-card rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-primary border-primary/30">
                                Period {s.period}
                              </Badge>
                              <span className="text-sm font-mono">
                                {s.start_time} - {s.end_time}
                              </span>
                            </div>
                            <p className="font-medium mt-1">{s.class_name}</p>
                            {s.subject && <p className="text-xs text-muted-foreground">{s.subject}</p>}
                            {s.room_number && (
                              <p className="text-xs text-muted-foreground">Room {s.room_number}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
