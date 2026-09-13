import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, FileText, TrendingUp, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Row {
  id: string; term_name: string; subject: string;
  total_marks: number; obtained_marks: number;
  grade: string | null; remarks: string | null; created_at: string;
}

export default function StudentResults() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: stu } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!stu) { setLoading(false); return; }
      const { data } = await supabase
        .from('student_exam_results')
        .select('id, term_name, subject, total_marks, obtained_marks, grade, remarks, created_at')
        .eq('student_id', stu.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const totalObtained = rows.reduce((a, r) => a + r.obtained_marks, 0);
  const totalMax = rows.reduce((a, r) => a + r.total_marks, 0);
  const pct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '—';
  const subjects = new Set(rows.map(r => r.subject)).size;

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.term_name] ||= []).push(r); return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Result Portal</h1>
          <p className="text-muted-foreground text-sm">Your published exam results</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Overall Score" value={`${totalObtained} / ${totalMax || '—'}`} icon={FileText} />
          <StatCard label="Percentage" value={`${pct}${pct !== '—' ? '%' : ''}`} icon={TrendingUp} />
          <StatCard label="Subjects" value={String(subjects)} icon={Award} />
        </div>

        {loading ? (
          <Card className="glass-card border-border"><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : rows.length === 0 ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center space-y-2">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No results published yet.</p>
              <p className="text-xs text-muted-foreground">Your teacher will publish results here once exams are graded.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([term, list]) => {
            const o = list.reduce((a, r) => a + r.obtained_marks, 0);
            const t = list.reduce((a, r) => a + r.total_marks, 0);
            return (
              <Card key={term} className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center text-lg">
                    {term}
                    <Badge variant="outline" className="font-mono">{o}/{t} • {((o/t)*100).toFixed(1)}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded border border-border overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-muted/40 text-xs">
                        <tr><th className="text-left p-2">Subject</th><th className="text-right p-2">Marks</th><th className="text-center p-2">Grade</th><th className="text-left p-2">Remarks</th></tr>
                      </thead>
                      <tbody>
                        {list.map(r => (
                          <tr key={r.id} className="border-t border-border">
                            <td className="p-2">{r.subject}</td>
                            <td className="p-2 text-right font-mono">{r.obtained_marks}/{r.total_marks}</td>
                            <td className="p-2 text-center"><Badge variant="outline">{r.grade || '—'}</Badge></td>
                            <td className="p-2 text-xs text-muted-foreground">{r.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold font-mono text-primary">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
