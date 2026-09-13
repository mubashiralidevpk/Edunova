import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, CheckCircle2, XCircle, Clock, GraduationCap, Receipt, Download, FileText, Bell } from 'lucide-react';
import CyberLoader from '@/components/ui/CyberLoader';
import { generateReceiptPDF, generateReportCardPDF } from '@/lib/pdf';

interface ChildSummary {
  id: string;
  full_name: string;
  roll_number: string;
  class_name: string | null;
  level: number | null;
  attendance_pct: number;
  today_status: string;
  pending_fees: number;
  pending_count: number;
}

export default function ParentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: parent } = await supabase.from('parents').select('id, full_name').eq('user_id', user.id).maybeSingle();
      if (!parent) { setLoading(false); return; }
      setParentName(parent.full_name);

      const { data: links } = await supabase.from('parent_students').select('student_id').eq('parent_id', parent.id);
      const ids = (links || []).map(l => l.student_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data: students } = await supabase.from('students')
        .select('id, full_name, roll_number, class_id, classes(class_name, level)')
        .in('id', ids);

      const today = new Date().toISOString().slice(0, 10);
      const summaries: ChildSummary[] = [];
      for (const s of (students || [])) {
        const { data: att } = await supabase.from('attendance').select('status').eq('student_id', s.id).eq('date', today).maybeSingle();
        const since = new Date(); since.setDate(since.getDate() - 30);
        const { data: all30 } = await supabase.from('attendance').select('status').eq('student_id', s.id).gte('date', since.toISOString().slice(0, 10));
        const presentCount = (all30 || []).filter(a => a.status === 'present' || a.status === 'late').length;
        const pct = all30 && all30.length > 0 ? Math.round((presentCount / all30.length) * 100) : 0;
        const { data: invs } = await supabase.from('fee_invoices').select('amount, amount_paid, status').eq('student_id', s.id).in('status', ['pending', 'partial', 'overdue']);
        const pending = (invs || []).reduce((sum, i) => sum + (Number(i.amount) - Number(i.amount_paid)), 0);
        summaries.push({
          id: s.id, full_name: s.full_name, roll_number: s.roll_number,
          class_name: (s.classes as any)?.class_name || null, level: (s.classes as any)?.level || null,
          attendance_pct: pct, today_status: att?.status || 'not_marked',
          pending_fees: pending, pending_count: (invs || []).length,
        });
      }
      setChildren(summaries);
      if (summaries.length > 0) setSelectedChild(summaries[0].id);

      // notifications
      const { data: notifs } = await supabase.from('parent_notifications')
        .select('*').eq('parent_id', parent.id).order('sent_at', { ascending: false }).limit(20);
      setNotifications(notifs || []);

      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedChild) return;
    (async () => {
      const [invRes, payRes, resRes] = await Promise.all([
        supabase.from('fee_invoices').select('*').eq('student_id', selectedChild).order('due_date', { ascending: false }),
        supabase.from('fee_payments').select('*, fee_invoices!inner(student_id, invoice_number, description)').eq('fee_invoices.student_id', selectedChild).order('paid_on', { ascending: false }),
        supabase.from('student_exam_results').select('*').eq('student_id', selectedChild).eq('is_published', true).order('term_name'),
      ]);
      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setResults(resRes.data || []);
    })();
  }, [selectedChild]);

  if (loading) return <CyberLoader message="Loading parent portal" />;

  const child = children.find(c => c.id === selectedChild);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><GraduationCap className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="font-semibold text-sm">Parent Portal</p>
              <p className="text-xs text-muted-foreground">{parentName || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut().then(() => navigate('/auth/parent-login'))} className="gap-1"><LogOut className="h-3 w-3" /> Logout</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Welcome, {parentName.split(' ')[0] || 'Parent'} 👋</h1>
          <p className="text-sm text-muted-foreground">{children.length} {children.length === 1 ? 'child' : 'children'} linked</p>
        </motion.div>

        {children.length === 0 ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">No children linked yet</p>
              <p className="text-sm text-muted-foreground mt-1">Make sure the school has your mobile number on your child's record, then sign in again.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Child switcher */}
            {children.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {children.map(c => (
                  <Button key={c.id} size="sm" variant={selectedChild === c.id ? 'default' : 'outline'} onClick={() => setSelectedChild(c.id)}>
                    {c.full_name}
                  </Button>
                ))}
              </div>
            )}

            {child && (
              <Card className="glass-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{child.full_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">Roll #{child.roll_number}{child.class_name ? ` • ${child.class_name}` : ''}</p>
                    </div>
                    <TodayBadge status={child.today_status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Attendance (30d)</span>
                      <span className="font-mono font-bold text-primary">{child.attendance_pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${child.attendance_pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 text-xs">
                    <Receipt className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Fees module — Coming soon</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="invoices">
              <TabsList className="grid grid-cols-4 w-full max-w-xl">
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="notifications">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="mt-4">
                <Card className="glass-card border-primary/30">
                  <CardContent className="p-6 text-center space-y-2">
                    <p className="text-sm font-mono text-primary">FEES MODULE • COMING SOON</p>
                    <p className="text-xs text-muted-foreground">Online invoices and payments are being upgraded. You'll be able to view and pay fees here shortly.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <Card className="glass-card border-primary/30">
                  <CardContent className="p-6 text-center space-y-2">
                    <p className="text-sm font-mono text-primary">PAYMENT HISTORY • COMING SOON</p>
                    <p className="text-xs text-muted-foreground">Receipts and payment history will appear here once the new fees system goes live.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="space-y-2 mt-4">
                {results.length === 0 ? <Empty msg="No published results yet." /> : (
                  <>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => generateReportCardPDF({
                        studentName: child?.full_name || '', studentRoll: child?.roll_number || '',
                        className: child?.class_name || undefined, attendancePct: child?.attendance_pct,
                        results: results.map(r => ({ subject: r.subject, obtained_marks: r.obtained_marks, total_marks: r.total_marks, grade: r.grade, remarks: r.remarks })),
                      })}><FileText className="h-3 w-3" /> Download Report Card</Button>
                    </div>
                    {results.map(r => (
                      <Card key={r.id} className="glass-card border-border">
                        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2 text-sm">
                          <div><p className="font-medium">{r.subject}</p><p className="text-xs text-muted-foreground">{r.term_name}</p></div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{r.obtained_marks}/{r.total_marks}</Badge>
                            {r.grade && <Badge>{r.grade}</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="notifications" className="space-y-2 mt-4">
                {notifications.length === 0 ? <Empty msg="No notifications." /> : notifications.map(n => (
                  <Card key={n.id} className={`glass-card border-border ${n.is_read ? 'opacity-60' : ''}`}>
                    <CardContent className="p-3 flex items-start gap-2">
                      <Bell className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(n.sent_at).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function TodayBadge({ status }: { status: string }) {
  if (status === 'present') return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Present</Badge>;
  if (status === 'absent') return <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1"><XCircle className="h-3 w-3" />Absent</Badge>;
  if (status === 'late') return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" />Late</Badge>;
  return <Badge variant="outline" className="text-muted-foreground gap-1">Not marked</Badge>;
}

function Empty({ msg }: { msg: string }) {
  return <Card className="glass-card border-border"><CardContent className="p-6 text-center text-sm text-muted-foreground">{msg}</CardContent></Card>;
}

function statusColor(s: string) {
  if (s === 'paid') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (s === 'partial') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  if (s === 'overdue') return 'bg-destructive/20 text-destructive border-destructive/30';
  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
}
