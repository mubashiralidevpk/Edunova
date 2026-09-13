import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssignedCheck {
  id: string; subject: string; status: string; total_marks: number | null;
  obtained_marks: number | null; assigned_at: string | null; teacher_submitted_at: string | null;
  teacher_note: string | null;
  students?: { full_name: string; roll_number: string } | null;
}

const LABELS: Record<string, string> = {
  assigned: 'To check',
  submitted: 'Sent to exam office',
  verified: 'Verified by exam office',
  published: 'Result published',
};

export default function TeacherExamChecking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AssignedCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('exam_paper_checks')
        .select('id, subject, status, total_marks, obtained_marks, assigned_at, teacher_submitted_at, teacher_note, students:student_id(full_name, roll_number)')
        .eq('assigned_to', user.id)
        .order('assigned_at', { ascending: false })
        .limit(100);
      setRows((data as unknown as AssignedCheck[]) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const pending = rows.filter((r) => r.status === 'assigned');
  const done = rows.filter((r) => r.status !== 'assigned');

  const Row = ({ r }: { r: AssignedCheck }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex-1 min-w-[180px]">
        <p className="font-medium">
          {r.students?.full_name || 'Student'}{' '}
          <span className="text-xs text-muted-foreground">#{r.students?.roll_number}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {r.subject}
          {r.assigned_at && ` · given ${new Date(r.assigned_at).toLocaleDateString()}`}
          {r.teacher_note ? ` · your note: "${r.teacher_note.slice(0, 50)}"` : ''}
        </p>
      </div>
      <Badge variant="outline" className="font-mono">{r.obtained_marks ?? '—'}/{r.total_marks ?? '—'}</Badge>
      <Badge variant={r.status === 'assigned' ? 'secondary' : 'default'}>{LABELS[r.status] || r.status}</Badge>
      <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => navigate(`/exams/check/${r.id}`)}>
        <ScanLine className="h-3.5 w-3.5" /> {r.status === 'assigned' ? 'Start checking' : 'View'}
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Exam Checking Portal</h1>
          <p className="text-sm text-muted-foreground">
            Papers the exam office has sent you. Mark them, then send them back for verification.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your papers…
          </p>
        ) : (
          <>
            <Card className="glass-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" /> Waiting for you ({pending.length})
                </CardTitle>
                <CardDescription>Open a paper to see the question paper and answer sheet side by side.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pending.length === 0
                  ? <p className="text-sm text-muted-foreground">Nothing to check right now.</p>
                  : pending.map((r) => <Row key={r.id} r={r} />)}
              </CardContent>
            </Card>

            <Card className="glass-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Already sent back ({done.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {done.length === 0
                  ? <p className="text-sm text-muted-foreground">You have not sent any paper back yet.</p>
                  : done.map((r) => <Row key={r.id} r={r} />)}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
