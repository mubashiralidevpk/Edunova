import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign, Receipt, FileText, Banknote, Plus, Ban, Download, Sparkles } from 'lucide-react';
import CyberLoader from '@/components/ui/CyberLoader';
import { generateReceiptPDF, generateInvoicePDF } from '@/lib/pdf';
import { ComingSoonOverlay } from '@/components/ui/coming-soon-overlay';

const FINANCIALS_COMING_SOON = true;

type FeeStructure = { id: string; name: string; class_level: number | null; fee_type: string; amount: number; frequency: string; is_active: boolean };
type Invoice = { id: string; invoice_number: string; description: string; amount: number; amount_paid: number; due_date: string; status: string; period_label: string | null; student_id: string };
type Payment = { id: string; receipt_number: string; amount: number; payment_method: string; paid_on: string; voided_at: string | null; invoice_id: string };
type Payroll = { id: string; teacher_id: string; period_month: number; period_year: number; gross_salary: number; deductions: number; bonuses: number; net_salary: number; status: string };

export default function AdminFinancials() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<(Invoice & { student_name?: string })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payrolls, setPayrolls] = useState<(Payroll & { teacher_name?: string })[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string; roll_number: string }[]>([]);
  const [teachers, setTeachers] = useState<{ user_id: string; full_name: string }[]>([]);

  const loadAll = async () => {
    if (!profile?.school_id) return;
    setLoading(true);
    const [s, inv, p, pr, st, t] = await Promise.all([
      supabase.from('fee_structures').select('*').eq('school_id', profile.school_id).order('created_at', { ascending: false }),
      supabase.from('fee_invoices').select('*').eq('school_id', profile.school_id).order('due_date', { ascending: false }).limit(200),
      supabase.from('fee_payments').select('*').eq('school_id', profile.school_id).order('created_at', { ascending: false }).limit(200),
      supabase.from('payroll_records').select('*').eq('school_id', profile.school_id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(200),
      supabase.from('students').select('id, full_name, roll_number').eq('school_id', profile.school_id),
      supabase.from('profiles').select('user_id, full_name').eq('school_id', profile.school_id),
    ]);
    setStructures(s.data || []);
    const studentMap = Object.fromEntries((st.data || []).map(x => [x.id, x.full_name]));
    setInvoices((inv.data || []).map(i => ({ ...i, student_name: studentMap[i.student_id] || 'Unknown' })));
    setPayments(p.data || []);
    const teacherMap = Object.fromEntries((t.data || []).map(x => [x.user_id, x.full_name]));
    setPayrolls((pr.data || []).map(r => ({ ...r, teacher_name: teacherMap[r.teacher_id] || 'Unknown' })));
    setStudents(st.data || []);
    setTeachers(t.data || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [profile?.school_id]);

  const totalCollected = payments.filter(p => !p.voided_at).reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = invoices.filter(i => i.status === 'pending' || i.status === 'partial' || i.status === 'overdue').reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0);
  const totalPayroll = payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_salary), 0);

  if (loading) return <DashboardLayout><CyberLoader message="Loading financials" /></DashboardLayout>;

  if (FINANCIALS_COMING_SOON) {
    return (
      <DashboardLayout>
        <ComingSoonOverlay
          title="Financial Management — Coming Soon"
          description="Fee structures, invoices, payments and payroll are being upgraded with online payments and automated billing. Available very soon."
          backHref="/admin/dashboard"
          backLabel="Back to Dashboard"
        >
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign className="h-7 w-7 text-primary" /> Financial Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Card key={i} className="glass-card border-border h-28" />)}
            </div>
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded bg-muted/40" />)}</div>
          </div>
        </ComingSoonOverlay>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign className="h-7 w-7 text-primary" /> Financial Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Fee structures, invoices, payments and payroll — admin-only.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Receipt} label="Total Collected" value={`Rs. ${totalCollected.toLocaleString()}`} color="text-emerald-400" />
          <StatCard icon={FileText} label="Pending Dues" value={`Rs. ${totalPending.toLocaleString()}`} color="text-yellow-400" />
          <StatCard icon={Banknote} label="Payroll Paid" value={`Rs. ${totalPayroll.toLocaleString()}`} color="text-cyan-400" />
        </div>

        <Tabs defaultValue="invoices">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="structures">Fee Plans</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-3 mt-4">
            <div className="flex justify-end gap-2">
              <BulkInvoiceDialog students={students} structures={structures} userId={user!.id} schoolId={profile!.school_id!} onCreated={loadAll} />
              <CreateInvoiceDialog students={students} structures={structures} userId={user!.id} schoolId={profile!.school_id!} onCreated={loadAll} />
            </div>
            {invoices.length === 0 ? <EmptyMsg msg="No invoices yet. Create one or generate from a fee plan." /> :
              <div className="grid gap-2">
                {invoices.map(i => (
                  <Card key={i.id} className="glass-card border-border">
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{i.invoice_number}</p>
                        <p className="font-medium">{i.student_name} — {i.description}</p>
                        <p className="text-xs text-muted-foreground">Due: {i.due_date}{i.period_label ? ` • ${i.period_label}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rs. {Number(i.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Paid: Rs. {Number(i.amount_paid).toLocaleString()}</p>
                      </div>
                      <Badge className={statusColor(i.status)}>{i.status}</Badge>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => generateInvoicePDF({
                        invoiceNumber: i.invoice_number, studentName: i.student_name || '', description: i.description,
                        amount: Number(i.amount), amountPaid: Number(i.amount_paid), dueDate: i.due_date, status: i.status, periodLabel: i.period_label,
                      })}><Download className="h-3 w-3" /> PDF</Button>
                      {i.status !== 'paid' && i.status !== 'voided' && (
                        <RecordPaymentDialog invoice={i} userId={user!.id} schoolId={profile!.school_id!} onPaid={loadAll} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          <TabsContent value="payments" className="space-y-3 mt-4">
            {payments.length === 0 ? <EmptyMsg msg="No payments recorded yet." /> :
              <div className="grid gap-2">
                {payments.map(p => (
                  <Card key={p.id} className={`glass-card border-border ${p.voided_at ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{p.receipt_number}</p>
                        <p className="font-medium">Rs. {Number(p.amount).toLocaleString()} <span className="text-xs text-muted-foreground">via {p.payment_method}</span></p>
                        <p className="text-xs text-muted-foreground">Paid on {p.paid_on}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => {
                        const inv = invoices.find(i => i.id === p.invoice_id);
                        generateReceiptPDF({
                          receiptNumber: p.receipt_number, studentName: inv?.student_name || '',
                          invoiceNumber: inv?.invoice_number || '', description: inv?.description || '',
                          amount: Number(p.amount), method: p.payment_method, paidOn: p.paid_on,
                          reference: (p as any).reference_number, voided: !!p.voided_at,
                        });
                      }}><Download className="h-3 w-3" /> Receipt</Button>
                      {p.voided_at ? <Badge variant="destructive">VOIDED</Badge> :
                        <VoidPaymentDialog payment={p} userId={user!.id} schoolId={profile!.school_id!} onVoided={loadAll} />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          <TabsContent value="structures" className="space-y-3 mt-4">
            <div className="flex justify-end"><CreateStructureDialog userId={user!.id} schoolId={profile!.school_id!} onCreated={loadAll} /></div>
            {structures.length === 0 ? <EmptyMsg msg="No fee plans yet. Create monthly tuition, transport or one-time fees." /> :
              <div className="grid gap-2 md:grid-cols-2">
                {structures.map(s => (
                  <Card key={s.id} className="glass-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.fee_type} • {s.frequency}{s.class_level ? ` • Level ${s.class_level}` : ''}</p>
                        </div>
                        <p className="font-bold text-primary">Rs. {Number(s.amount).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          <TabsContent value="payroll" className="space-y-3 mt-4">
            <div className="flex justify-end"><CreatePayrollDialog teachers={teachers} userId={user!.id} schoolId={profile!.school_id!} onCreated={loadAll} /></div>
            {payrolls.length === 0 ? <EmptyMsg msg="No payroll records yet." /> :
              <div className="grid gap-2">
                {payrolls.map(p => (
                  <Card key={p.id} className="glass-card border-border">
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium">{p.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{monthName(p.period_month)} {p.period_year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rs. {Number(p.net_salary).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Gross {Number(p.gross_salary).toLocaleString()} − Ded {Number(p.deductions).toLocaleString()} + Bon {Number(p.bonuses).toLocaleString()}</p>
                      </div>
                      <Badge className={statusColor(p.status)}>{p.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="glass-card border-border">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function EmptyMsg({ msg }: { msg: string }) {
  return <Card className="glass-card border-border"><CardContent className="p-8 text-center text-sm text-muted-foreground">{msg}</CardContent></Card>;
}

function statusColor(s: string) {
  if (s === 'paid') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (s === 'partial') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
  if (s === 'overdue') return 'bg-destructive/20 text-destructive border-destructive/30';
  if (s === 'voided') return 'bg-muted text-muted-foreground';
  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
}

function monthName(m: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
}

// ----- Dialogs -----

function CreateStructureDialog({ userId, schoolId, onCreated }: { userId: string; schoolId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', fee_type: 'tuition', amount: '', frequency: 'monthly', class_level: '' });
  const submit = async () => {
    if (!form.name || !form.amount) { toast.error('Name and amount required'); return; }
    const { error } = await supabase.from('fee_structures').insert({
      school_id: schoolId, created_by: userId, name: form.name, fee_type: form.fee_type,
      amount: parseFloat(form.amount), frequency: form.frequency,
      class_level: form.class_level ? parseInt(form.class_level) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Fee plan created'); setOpen(false); setForm({ name: '', fee_type: 'tuition', amount: '', frequency: 'monthly', class_level: '' }); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> New Fee Plan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Fee Plan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Monthly Tuition Class 5" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={form.fee_type} onValueChange={v => setForm({ ...form, fee_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tuition">Tuition</SelectItem><SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem><SelectItem value="admission">Admission</SelectItem><SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem><SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Amount (Rs.)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Class Level (optional)</Label><Input type="number" value={form.class_level} onChange={e => setForm({ ...form, class_level: e.target.value })} placeholder="1-12" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateInvoiceDialog({ students, structures, userId, schoolId, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', structure_id: '', description: '', amount: '', due_date: '', period_label: '' });
  const onPickStructure = (id: string) => {
    const s = structures.find((x: FeeStructure) => x.id === id);
    setForm(prev => ({ ...prev, structure_id: id, description: s?.name || '', amount: s ? String(s.amount) : '' }));
  };
  const submit = async () => {
    if (!form.student_id || !form.amount || !form.due_date || !form.description) { toast.error('Fill all required fields'); return; }
    const inv_no = 'INV-' + Date.now().toString(36).toUpperCase();
    const { error } = await supabase.from('fee_invoices').insert({
      school_id: schoolId, student_id: form.student_id, fee_structure_id: form.structure_id || null,
      invoice_number: inv_no, description: form.description, amount: parseFloat(form.amount),
      due_date: form.due_date, period_label: form.period_label || null, created_by: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Invoice created'); setOpen(false); onCreated();
    setForm({ student_id: '', structure_id: '', description: '', amount: '', due_date: '', period_label: '' });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> New Invoice</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Student</Label>
            <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} (#{s.roll_number})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {structures.length > 0 && (
            <div><Label>Apply Fee Plan (optional)</Label>
              <Select value={form.structure_id} onValueChange={onPickStructure}>
                <SelectTrigger><SelectValue placeholder="Pick a plan" /></SelectTrigger>
                <SelectContent>{structures.map((s: FeeStructure) => <SelectItem key={s.id} value={s.id}>{s.name} — Rs. {s.amount}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Amount (Rs.)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>Period Label (optional)</Label><Input value={form.period_label} onChange={e => setForm({ ...form, period_label: e.target.value })} placeholder="April 2026" /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ invoice, userId, schoolId, onPaid }: { invoice: Invoice; userId: string; schoolId: string; onPaid: () => void }) {
  const [open, setOpen] = useState(false);
  const remaining = Number(invoice.amount) - Number(invoice.amount_paid);
  const [form, setForm] = useState({ amount: String(remaining), payment_method: 'cash', reference_number: '', notes: '' });
  const submit = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error('Invalid amount'); return; }
    if (amt > remaining + 0.01) { toast.error(`Cannot exceed remaining Rs. ${remaining}`); return; }
    const receipt = 'RCP-' + Date.now().toString(36).toUpperCase();
    const { error } = await supabase.from('fee_payments').insert({
      school_id: schoolId, invoice_id: invoice.id, receipt_number: receipt, amount: amt,
      payment_method: form.payment_method, reference_number: form.reference_number || null,
      notes: form.notes || null, recorded_by: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment recorded — ${receipt}`); setOpen(false); onPaid();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Receipt className="h-3 w-3" /> Record Payment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment for {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Remaining: <span className="font-bold text-foreground">Rs. {remaining.toLocaleString()}</span></p>
          <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Method</Label>
            <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="online">Online</SelectItem><SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reference / Cheque #</Label><Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidPaymentDialog({ payment, userId, schoolId, onVoided }: { payment: Payment; userId: string; schoolId: string; onVoided: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (!reason.trim()) { toast.error('Reason required'); return; }
    const { error: e1 } = await supabase.from('fee_payments').update({
      voided_at: new Date().toISOString(), voided_by: userId, voided_reason: reason,
    }).eq('id', payment.id);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from('voided_records').insert({
      school_id: schoolId, record_type: 'payment', record_id: payment.id, reason, voided_by: userId,
    });
    toast.success('Payment voided'); setOpen(false); onVoided();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30"><Ban className="h-3 w-3" /> Void</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Void Payment</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Voiding is permanent and logged. Payments cannot be deleted to prevent fraud.</p>
        <Textarea placeholder="Reason for void (required)" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <DialogFooter><Button variant="destructive" onClick={submit}>Void Payment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePayrollDialog({ teachers, userId, schoolId, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({ teacher_id: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), gross: '', deductions: '0', bonuses: '0', status: 'pending' });
  const net = (parseFloat(form.gross || '0') - parseFloat(form.deductions || '0') + parseFloat(form.bonuses || '0')).toFixed(2);
  const submit = async () => {
    if (!form.teacher_id || !form.gross) { toast.error('Teacher and gross required'); return; }
    const { error } = await supabase.from('payroll_records').insert({
      school_id: schoolId, teacher_id: form.teacher_id,
      period_month: parseInt(form.month), period_year: parseInt(form.year),
      gross_salary: parseFloat(form.gross), deductions: parseFloat(form.deductions || '0'),
      bonuses: parseFloat(form.bonuses || '0'), net_salary: parseFloat(net),
      status: form.status, paid_on: form.status === 'paid' ? new Date().toISOString().slice(0, 10) : null,
      created_by: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Payroll record created'); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Payroll</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Payroll Record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Teacher</Label>
            <Select value={form.teacher_id} onValueChange={v => setForm({ ...form, teacher_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger>
              <SelectContent className="max-h-72">{teachers.map((t: any) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Gross</Label><Input type="number" value={form.gross} onChange={e => setForm({ ...form, gross: e.target.value })} /></div>
            <div><Label>Deductions</Label><Input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} /></div>
            <div><Label>Bonuses</Label><Input type="number" value={form.bonuses} onChange={e => setForm({ ...form, bonuses: e.target.value })} /></div>
          </div>
          <p className="text-sm">Net: <span className="font-bold text-primary">Rs. {Number(net).toLocaleString()}</span></p>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkInvoiceDialog({ students, structures, userId, schoolId, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const [structureId, setStructureId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [classLevel, setClassLevel] = useState('all');
  const [busy, setBusy] = useState(false);

  const eligible = students.filter((s: any) => {
    const struct = structures.find((x: FeeStructure) => x.id === structureId);
    if (!struct?.class_level || classLevel !== 'all') return true;
    return true; // simplified — server-side could do per-class filter via class_id join
  });

  const submit = async () => {
    if (!structureId || !dueDate) { toast.error('Fee plan and due date required'); return; }
    const struct = structures.find((x: FeeStructure) => x.id === structureId);
    if (!struct) return;
    setBusy(true);
    const rows = students.map((s: any) => ({
      school_id: schoolId, student_id: s.id, fee_structure_id: structureId,
      invoice_number: 'INV-' + Date.now().toString(36).toUpperCase() + '-' + s.id.slice(0, 4),
      description: struct.name, amount: Number(struct.amount),
      due_date: dueDate, period_label: periodLabel || null, created_by: userId,
    }));
    // Insert in chunks of 100
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from('fee_invoices').insert(chunk);
      if (error) { toast.error(`Batch ${i}: ${error.message}`); break; }
      inserted += chunk.length;
    }
    toast.success(`Generated ${inserted} invoices`);
    setBusy(false); setOpen(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> Bulk Generate</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk Generate Invoices</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Creates one invoice per student ({students.length} total) using the chosen fee plan.</p>
          <div><Label>Fee Plan</Label>
            <Select value={structureId} onValueChange={setStructureId}>
              <SelectTrigger><SelectValue placeholder="Pick a fee plan" /></SelectTrigger>
              <SelectContent>{structures.map((s: FeeStructure) => <SelectItem key={s.id} value={s.id}>{s.name} — Rs. {s.amount}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div><Label>Period Label</Label><Input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="May 2026" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? 'Generating...' : `Generate ${students.length} Invoices`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
