import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function AdminSchedule() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Master Timetable</h1>
          <p className="text-muted-foreground">Only admins build the school timetable. Teachers can no longer self-schedule.</p>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Per-Teacher Timetable</CardTitle>
            <CardDescription>Use Teacher Management → Schedule on each teacher card to assign their periods.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Open <a href="/admin/teacher-management" className="text-primary underline">Teacher Management</a> and click "Schedule" on any teacher to add periods, classes, and times.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
