import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, Printer, CheckCircle2, XCircle, UserCheck, Calendar, Search, Phone, Mail, ShieldCheck, CalendarClock, Layers, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AdmissionChat } from '@/components/admissions/AdmissionChat';
import { invokeFn, getErrorMessage } from '@/lib/errors';
import {
  ALL_CLASS_LEVELS, SELECTABLE_STATUSES, statusMeta, toneClass,
  NEEDS_TEST_DATE, NEEDS_INTERVIEW_DATE, CLOSED_STATUSES,
} from '@/lib/admissionStatus';

interface Applicant {
  id: string;
  full_name: string;
  date_of_birth: string;
  b_form_number: string;
  desired_class_level: number;
  status: string;
  status_note: string | null;
  status_updated_at: string | null;
  interview_scheduled_at: string | null;
  interview_venue: string | null;
  test_total_marks: number | null;
  test_obtained_marks: number | null;
  test_completed_at: string | null;
  gender: string | null;
  parent_father_name: string | null;
  parent_mother_name: string | null;
  parent_father_nic: string | null;
  parent_mother_nic: string | null;
  parent_father_mobile: string | null;
  parent_mother_mobile: string | null;
  parent_email: string | null;
  address: string | null;
  emergency_contact: string | null;
  notes: string | null;
  school_id: string;
  created_at: string;
  assigned_class_id: string | null;
  admitted_student_id: string | null;
}

interface Schedule { id: string; applicant_id: string; test_date: string; test_time: string; venue: string | null; notes: string | null; }

const blankNew = {
  full_name: '', date_of_birth: '', b_form_number: '', desired_class_level: 1,
};

export default function TeacherAdmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({});
  const [admissionContacts, setAdmissionContacts] = useState<Array<{ full_name: string; staff_role: string | null; email: string; role: string }>>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pending');
  const [authorized, setAuthorized] = useState(false);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Applicant | null>(null);
  const [marksFor, setMarksFor] = useState<Applicant | null>(null);
  const [parentFor, setParentFor] = useState<Applicant | null>(null);
  const [detailFor, setDetailFor] = useState<Applicant | null>(null);
  const [classScheduleOpen, setClassScheduleOpen] = useState(false);
  const [classScheduleForm, setClassScheduleForm] = useState({
    desired_class_level: 1,
    test_date: '',
    test_time: '09:00',
    venue: 'School Hall',
    notes: '',
    overwrite: true,
  });

  const [statusFor, setStatusFor] = useState<Applicant | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: 'under_review', note: '',
    test_date: '', test_time: '09:00', test_venue: 'School Hall',
    interview_date: '', interview_time: '10:00', interview_venue: 'Principal Office',
  });

  const [newForm, setNewForm] = useState(blankNew);
  const [scheduleForm, setScheduleForm] = useState({ test_date: '', test_time: '09:00', venue: 'School Hall', notes: '' });
  const [marksForm, setMarksForm] = useState({ total: 100, obtained: 0 });
  const [parentForm, setParentForm] = useState({
    gender: '', parent_father_name: '', parent_father_nic: '', parent_father_mobile: '',
    parent_mother_name: '', parent_mother_nic: '', parent_mother_mobile: '',
    parent_email: '', address: '', emergency_contact: '', notes: '',
  });

  useEffect(() => { (async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('staff_role, school_id').eq('user_id', user.id).maybeSingle();
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleRow || []).some((r: any) => r.role === 'admin');
    setAuthorized(isAdmin || prof?.staff_role === 'Admission Manager');
    if (prof?.school_id) {
      const { data: contacts } = await supabase.rpc('get_admission_contacts', { _school_id: prof.school_id });
      setAdmissionContacts((contacts as any[]) || []);
    }
    await load();
  })(); }, [user]);

  const load = async () => {
    setLoading(true);
    const { data: appData } = await supabase.from('admission_applicants').select('*').order('created_at', { ascending: false });
    const { data: schedData } = await supabase.from('admission_test_schedules').select('*');
    const map: Record<string, Schedule> = {};
    (schedData || []).forEach((s: any) => { map[s.applicant_id] = s as Schedule; });
    setSchedules(map);
    setApplicants((appData as Applicant[]) || []);
    setLoading(false);
  };

  const create = async () => {
    if (!user) return;
    if (!newForm.full_name || !newForm.date_of_birth || !newForm.b_form_number) {
      toast({ title: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    const { data: prof } = await supabase.from('profiles').select('school_id').eq('user_id', user.id).maybeSingle();
    if (!prof?.school_id) { toast({ title: 'No school assigned', variant: 'destructive' }); return; }

    const { error } = await supabase.from('admission_applicants').insert({
      school_id: prof.school_id,
      created_by: user.id,
      full_name: newForm.full_name.trim(),
      date_of_birth: newForm.date_of_birth,
      b_form_number: newForm.b_form_number.trim(),
      desired_class_level: Number(newForm.desired_class_level),
      status: 'pending',
    });
    if (error) return toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' });
    toast({ title: 'Applicant added' });
    setCreateOpen(false);
    setNewForm(blankNew);
    load();
  };

  const saveSchedule = async () => {
    if (!scheduleFor || !user) return;
    if (!scheduleForm.test_date) { toast({ title: 'Pick a date', variant: 'destructive' }); return; }

    const existing = schedules[scheduleFor.id];
    if (existing) {
      await supabase.from('admission_test_schedules').update({
        test_date: scheduleForm.test_date, test_time: scheduleForm.test_time,
        venue: scheduleForm.venue, notes: scheduleForm.notes,
      }).eq('id', existing.id);
    } else {
      await supabase.from('admission_test_schedules').insert({
        applicant_id: scheduleFor.id, created_by: user.id,
        test_date: scheduleForm.test_date, test_time: scheduleForm.test_time,
        venue: scheduleForm.venue, notes: scheduleForm.notes,
      });
    }
    await supabase.from('admission_applicants').update({ status: 'test_scheduled' }).eq('id', scheduleFor.id);
    toast({ title: 'Schedule saved' });
    setScheduleFor(null);
    load();
  };

  const saveClassSchedule = async () => {
    if (!user) return;
    if (!classScheduleForm.test_date) {
      toast({ title: 'Pick a date', variant: 'destructive' });
      return;
    }
    const targets = applicants.filter(
      (a) =>
        a.desired_class_level === Number(classScheduleForm.desired_class_level) &&
        (a.status === 'pending' || a.status === 'test_scheduled')
    );
    if (targets.length === 0) {
      toast({ title: 'No applicants', description: `No pending/scheduled applicants for Class ${classScheduleForm.desired_class_level}.`, variant: 'destructive' });
      return;
    }

    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const app of targets) {
      const existing = schedules[app.id];
      const payload = {
        test_date: classScheduleForm.test_date,
        test_time: classScheduleForm.test_time,
        venue: classScheduleForm.venue,
        notes: classScheduleForm.notes,
      };

      if (existing) {
        if (!classScheduleForm.overwrite) { skipped++; continue; }
        const { error } = await supabase.from('admission_test_schedules').update(payload).eq('id', existing.id);
        if (!error) updated++;
      } else {
        const { error } = await supabase.from('admission_test_schedules').insert({
          ...payload,
          applicant_id: app.id,
          created_by: user.id,
        });
        if (!error) created++;
      }
      await supabase.from('admission_applicants').update({ status: 'test_scheduled' }).eq('id', app.id);
    }

    toast({
      title: `Class ${classScheduleForm.desired_class_level} test scheduled`,
      description: `${created} new • ${updated} updated${skipped ? ` • ${skipped} skipped` : ''}`,
    });
    setClassScheduleOpen(false);
    load();
  };

  const printSlip = (app: Applicant) => {
    const s = schedules[app.id];
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`
      <html><head><title>Test Slip - ${app.full_name}</title>
      <style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto}
      .hdr{text-align:center;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:24px}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ccc}
      .lbl{color:#666;font-size:12px;text-transform:uppercase}
      .val{font-weight:600}</style></head><body>
      <div class="hdr"><h1>ADMISSION TEST SLIP</h1><p>Edunova</p></div>
      <div class="row"><span class="lbl">Applicant</span><span class="val">${app.full_name}</span></div>
      <div class="row"><span class="lbl">B-Form</span><span class="val">${app.b_form_number}</span></div>
      <div class="row"><span class="lbl">Date of Birth</span><span class="val">${app.date_of_birth}</span></div>
      <div class="row"><span class="lbl">Class Applying</span><span class="val">Class ${app.desired_class_level}</span></div>
      <div class="row"><span class="lbl">Test Date</span><span class="val">${s?.test_date || 'TBD'}</span></div>
      <div class="row"><span class="lbl">Test Time</span><span class="val">${s?.test_time || 'TBD'}</span></div>
      <div class="row"><span class="lbl">Venue</span><span class="val">${s?.venue || 'School Hall'}</span></div>
      <div class="row"><span class="lbl">Notes</span><span class="val">${s?.notes || '-'}</span></div>
      <p style="margin-top:32px;text-align:center;color:#666;font-size:11px">Bring this slip + B-Form copy on the test day.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const saveMarks = async () => {
    if (!marksFor) return;
    const pct = (marksForm.obtained / Math.max(1, marksForm.total)) * 100;
    const newStatus = pct >= 40 ? 'passed' : 'failed';
    const { error } = await supabase.from('admission_applicants').update({
      test_total_marks: marksForm.total,
      test_obtained_marks: marksForm.obtained,
      test_completed_at: new Date().toISOString(),
      status: newStatus,
    }).eq('id', marksFor.id);
    if (error) return toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' });
    toast({ title: `Marked ${newStatus.toUpperCase()}`, description: `${pct.toFixed(1)}%` });
    setMarksFor(null);
    load();
  };

  const saveParents = async () => {
    if (!parentFor) return;
    const { error } = await supabase.from('admission_applicants').update(parentForm).eq('id', parentFor.id);
    if (error) return toast({ title: 'Failed', description: getErrorMessage(error), variant: 'destructive' });
    toast({ title: 'Parent details saved' });
    setParentFor(null);
    load();
  };

  const admit = async (app: Applicant) => {
    if (!confirm(`Admit ${app.full_name} into a Class ${app.desired_class_level} section (auto-assigned, max 50/section)? A unique student email will be generated automatically.`)) return;
    const { data, error } = await invokeFn('admit-applicant', {
      body: { applicant_id: app.id },
    });
    if (error) return toast({ title: 'Admission failed', description: getErrorMessage(error), variant: 'destructive' });
    if ((data as any)?.error) return toast({ title: 'Admission failed', description: (data as any).error, variant: 'destructive' });
    const creds = (data as any)?.credentials;
    toast({
      title: 'Admitted ✓',
      description: creds
        ? `Login: ${creds.email} • Password: ${creds.password}`
        : 'Student record created successfully.',
    });
    load();
  };

  const openStudentDetail = async (app: Applicant) => {
    if (!app.admitted_student_id) {
      setDetailFor(app);
      return;
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user?.id || '');
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin');
    navigate(isAdmin ? `/admin/students/${app.admitted_student_id}` : `/teacher/students/${app.admitted_student_id}`);
  };

  const printList = (status: 'passed' | 'failed') => {
    const list = applicants.filter(a => a.status === status);
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>${status.toUpperCase()} List</title>
      <style>body{font-family:system-ui;padding:30px}h1{text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f4f4f4}</style></head><body>
      <h1>${status === 'passed' ? '✅ PASSED' : '❌ FAILED'} APPLICANTS</h1>
      <p style="text-align:center;color:#666">${new Date().toLocaleDateString()} • Total: ${list.length}</p>
      <table><thead><tr><th>#</th><th>Name</th><th>B-Form</th><th>Class</th><th>Marks</th><th>%</th></tr></thead><tbody>
      ${list.map((a, i) => {
        const pct = a.test_obtained_marks && a.test_total_marks ? ((a.test_obtained_marks / a.test_total_marks) * 100).toFixed(1) : '-';
        return `<tr><td>${i+1}</td><td>${a.full_name}</td><td>${a.b_form_number}</td><td>${a.desired_class_level}</td><td>${a.test_obtained_marks ?? '-'}/${a.test_total_marks ?? '-'}</td><td>${pct}%</td></tr>`;
      }).join('')}
      </tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const openParentDialog = (a: Applicant) => {
    setParentForm({
      gender: a.gender || '',
      parent_father_name: a.parent_father_name || '',
      parent_father_nic: a.parent_father_nic || '',
      parent_father_mobile: a.parent_father_mobile || '',
      parent_mother_name: a.parent_mother_name || '',
      parent_mother_nic: a.parent_mother_nic || '',
      parent_mother_mobile: a.parent_mother_mobile || '',
      parent_email: a.parent_email || '',
      address: a.address || '',
      emergency_contact: a.emergency_contact || '',
      notes: a.notes || '',
    });
    setParentFor(a);
  };

  const openScheduleDialog = (a: Applicant) => {
    const s = schedules[a.id];
    setScheduleForm({
      test_date: s?.test_date || '',
      test_time: s?.test_time || '09:00',
      venue: s?.venue || 'School Hall',
      notes: s?.notes || '',
    });
    setScheduleFor(a);
  };

  const openStatusDialog = (a: Applicant) => {
    const s = schedules[a.id];
    const iv = a.interview_scheduled_at ? new Date(a.interview_scheduled_at) : null;
    setStatusForm({
      status: a.status === 'pending' ? 'under_review' : a.status,
      note: a.status_note || '',
      test_date: s?.test_date || '',
      test_time: s?.test_time?.slice(0, 5) || '09:00',
      test_venue: s?.venue || 'School Hall',
      interview_date: iv ? iv.toISOString().slice(0, 10) : '',
      interview_time: iv ? iv.toISOString().slice(11, 16) : '10:00',
      interview_venue: a.interview_venue || 'Principal Office',
    });
    setStatusFor(a);
  };

  const saveStatus = async () => {
    if (!statusFor) return;
    const st = statusForm.status;
    if (NEEDS_TEST_DATE.includes(st) && !statusForm.test_date) {
      toast({ title: 'Pick the test date first', variant: 'destructive' });
      return;
    }
    if (NEEDS_INTERVIEW_DATE.includes(st) && !statusForm.interview_date) {
      toast({ title: 'Pick the interview date first', variant: 'destructive' });
      return;
    }

    const patch: Record<string, any> = {
      status: st,
      status_note: statusForm.note.trim() || null,
      status_updated_at: new Date().toISOString(),
    };
    if (NEEDS_INTERVIEW_DATE.includes(st)) {
      patch.interview_scheduled_at = new Date(`${statusForm.interview_date}T${statusForm.interview_time}`).toISOString();
      patch.interview_venue = statusForm.interview_venue.trim() || null;
    }
    const { error } = await (supabase as any)
      .from('admission_applicants')
      .update(patch)
      .eq('id', statusFor.id);

    if (!error && NEEDS_TEST_DATE.includes(st)) {
      await (supabase as any).from('admission_test_schedules').upsert({
        applicant_id: statusFor.id,
        test_date: statusForm.test_date,
        test_time: statusForm.test_time,
        venue: statusForm.test_venue,
      }, { onConflict: 'applicant_id' });
    }

    if (error) {
      toast({ title: 'Could not update status', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: `Status set to ${statusMeta(st).label}`, description: 'The family can now see this on the tracker.' });
    setStatusFor(null);
    load();
  };

  const filtered = applicants.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()) || a.b_form_number.includes(search));
  const TEST_STAGE = ['test_required', 'test_assigned', 'test_scheduled', 'test_completed'];
  const buckets: Record<string, Applicant[]> = {
    pending: filtered.filter(a => !TEST_STAGE.includes(a.status) && !CLOSED_STATUSES.includes(a.status) && !['passed', 'failed'].includes(a.status)),
    test_scheduled: filtered.filter(a => TEST_STAGE.includes(a.status)),
    passed: filtered.filter(a => a.status === 'passed'),
    failed: filtered.filter(a => a.status === 'failed'),
    admitted: filtered.filter(a => CLOSED_STATUSES.includes(a.status)),
  };

  if (!authorized) {
    return (
      <DashboardLayout>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Admissions</CardTitle>
            <CardDescription>You need the "Admission Manager" staff role (or admin) to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admissions</h1>
            <p className="text-muted-foreground">Intake → Test → Pass/Fail → Parent Details → Section Assignment</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setClassScheduleOpen(true)} className="gap-2">
              <CalendarClock className="h-4 w-4" />Class Test Schedule
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Applicant</Button>
          </div>
        </div>

        {admissionContacts.length > 0 && (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-mono uppercase text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Admission Team
              </div>
              {admissionContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 border border-border">
                  <span className="font-medium text-foreground">{c.full_name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.role === 'admin' ? 'Admin' : c.staff_role || 'Manager'}
                  </Badge>
                  <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />{c.email}
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 bg-muted/50" placeholder="Search name or B-Form..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="pending">Pending ({buckets.pending.length})</TabsTrigger>
            <TabsTrigger value="test_scheduled">Scheduled ({buckets.test_scheduled.length})</TabsTrigger>
            <TabsTrigger value="passed">Passed ({buckets.passed.length})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({buckets.failed.length})</TabsTrigger>
            <TabsTrigger value="admitted">Admitted ({buckets.admitted.length})</TabsTrigger>
          </TabsList>

          {(['pending','test_scheduled','passed','failed','admitted'] as const).map(key => (
            <TabsContent key={key} value={key} className="space-y-2 mt-4">
              {(key === 'passed' || key === 'failed') && buckets[key].length > 0 && (
                <Button variant="outline" size="sm" onClick={() => printList(key)} className="gap-2">
                  <Printer className="h-4 w-4" /> Print {key} list
                </Button>
              )}
              {loading ? <p className="text-sm text-muted-foreground">Loading...</p> :
                buckets[key].length === 0 ? <p className="text-sm text-muted-foreground p-6 text-center">No applicants here.</p> :
                buckets[key].map(a => (
                  <Card key={a.id} className="glass-card">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <button className="text-left flex-1 min-w-0" onClick={() => openStudentDetail(a)}>
                        <p className="font-semibold hover:text-primary transition-colors">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">B-Form: {a.b_form_number} • Class {a.desired_class_level} • DOB {a.date_of_birth}</p>
                        {(a.parent_father_mobile || a.parent_mother_mobile || a.parent_email) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs">
                            {a.parent_father_mobile && (
                              <span className="inline-flex items-center gap-1 text-accent">
                                <Phone className="h-3 w-3" />Father: {a.parent_father_mobile}
                              </span>
                            )}
                            {a.parent_mother_mobile && (
                              <span className="inline-flex items-center gap-1 text-accent">
                                <Phone className="h-3 w-3" />Mother: {a.parent_mother_mobile}
                              </span>
                            )}
                            {a.parent_email && (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />{a.parent_email}
                              </span>
                            )}
                          </div>
                        )}
                        {a.test_obtained_marks !== null && (
                          <Badge variant="outline" className="mt-1">{a.test_obtained_marks}/{a.test_total_marks} ({((a.test_obtained_marks/(a.test_total_marks||1))*100).toFixed(1)}%)</Badge>
                        )}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`whitespace-nowrap ${toneClass[statusMeta(a.status).tone]}`}>
                          {statusMeta(a.status).label}
                        </Badge>
                        <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={() => openStatusDialog(a)}>
                          Update Status
                        </Button>
                        {key === 'pending' && <Button size="sm" variant="outline" onClick={() => openScheduleDialog(a)}><Calendar className="h-3 w-3 mr-1" />Schedule Test</Button>}
                        {key === 'test_scheduled' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => printSlip(a)}><Printer className="h-3 w-3 mr-1" />Slip</Button>
                            <Button size="sm" onClick={() => { setMarksForm({ total: 100, obtained: 0 }); setMarksFor(a); }}>Enter Marks</Button>
                          </>
                        )}
                        {key === 'passed' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openParentDialog(a)}>Parent Details</Button>
                            <Button size="sm" onClick={() => admit(a)} className="gap-1"><UserCheck className="h-3 w-3" />Admit</Button>
                          </>
                        )}
                        {key === 'failed' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
                        {key === 'admitted' && <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />Admitted</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              }
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Update status */}
      <Dialog open={!!statusFor} onOpenChange={(o) => !o && setStatusFor(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />Update Application Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{statusFor?.full_name} • Class {statusFor?.desired_class_level}</p>
            <div>
              <Label>Status</Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm({ ...statusForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {SELECTABLE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{statusMeta(statusForm.status).description}</p>
            </div>
            {NEEDS_TEST_DATE.includes(statusForm.status) && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Test date</Label><Input type="date" value={statusForm.test_date} onChange={e => setStatusForm({ ...statusForm, test_date: e.target.value })} /></div>
                <div><Label>Time</Label><Input type="time" value={statusForm.test_time} onChange={e => setStatusForm({ ...statusForm, test_time: e.target.value })} /></div>
                <div><Label>Venue</Label><Input value={statusForm.test_venue} onChange={e => setStatusForm({ ...statusForm, test_venue: e.target.value })} /></div>
              </div>
            )}
            {NEEDS_INTERVIEW_DATE.includes(statusForm.status) && (
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Interview date</Label><Input type="date" value={statusForm.interview_date} onChange={e => setStatusForm({ ...statusForm, interview_date: e.target.value })} /></div>
                <div><Label>Time</Label><Input type="time" value={statusForm.interview_time} onChange={e => setStatusForm({ ...statusForm, interview_time: e.target.value })} /></div>
                <div><Label>Venue</Label><Input value={statusForm.interview_venue} onChange={e => setStatusForm({ ...statusForm, interview_venue: e.target.value })} /></div>
              </div>
            )}
            <div>
              <Label>Message for the family (optional)</Label>
              <Textarea rows={3} maxLength={500} value={statusForm.note} onChange={e => setStatusForm({ ...statusForm, note: e.target.value })}
                placeholder="e.g. Please bring the original B-Form on test day." />
            </div>
            <Button className="w-full" onClick={saveStatus}>Save status</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New applicant */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />New Applicant</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={newForm.full_name} onChange={e => setNewForm({ ...newForm, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth *</Label><Input type="date" value={newForm.date_of_birth} onChange={e => setNewForm({ ...newForm, date_of_birth: e.target.value })} /></div>
              <div><Label>Desired Class *</Label>
                <Select value={String(newForm.desired_class_level)} onValueChange={v => setNewForm({ ...newForm, desired_class_level: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_CLASS_LEVELS.map(n => <SelectItem key={n} value={String(n)}>Class {n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>B-Form Number *</Label><Input value={newForm.b_form_number} onChange={e => setNewForm({ ...newForm, b_form_number: e.target.value })} placeholder="xxxxx-xxxxxxx-x" /></div>
            <p className="text-xs text-muted-foreground">After saving, schedule the test from the Pending tab.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule */}
      <Dialog open={!!scheduleFor} onOpenChange={o => !o && setScheduleFor(null)}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Schedule Admission Test</DialogTitle><CardDescription>{scheduleFor?.full_name}</CardDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" value={scheduleForm.test_date} onChange={e => setScheduleForm({ ...scheduleForm, test_date: e.target.value })} /></div>
              <div><Label>Time *</Label><Input type="time" value={scheduleForm.test_time} onChange={e => setScheduleForm({ ...scheduleForm, test_time: e.target.value })} /></div>
            </div>
            <div><Label>Venue</Label><Input value={scheduleForm.venue} onChange={e => setScheduleForm({ ...scheduleForm, venue: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setScheduleFor(null)}>Cancel</Button><Button onClick={saveSchedule}>Save & Print Slip Later</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marks */}
      <Dialog open={!!marksFor} onOpenChange={o => !o && setMarksFor(null)}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Enter Test Marks</DialogTitle><CardDescription>{marksFor?.full_name} • Pass mark: 40%</CardDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total Marks</Label><Input type="number" value={marksForm.total} onChange={e => setMarksForm({ ...marksForm, total: Number(e.target.value) })} /></div>
            <div><Label>Obtained Marks</Label><Input type="number" value={marksForm.obtained} onChange={e => setMarksForm({ ...marksForm, obtained: Number(e.target.value) })} /></div>
          </div>
          <p className="text-sm">Result: <strong>{((marksForm.obtained / Math.max(1, marksForm.total)) * 100).toFixed(1)}%</strong> → <Badge variant={marksForm.obtained / Math.max(1, marksForm.total) >= 0.4 ? 'default' : 'destructive'}>{marksForm.obtained / Math.max(1, marksForm.total) >= 0.4 ? 'PASS' : 'FAIL'}</Badge></p>
          <DialogFooter><Button variant="outline" onClick={() => setMarksFor(null)}>Cancel</Button><Button onClick={saveMarks}>Save Result</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent details */}
      <Dialog open={!!parentFor} onOpenChange={o => !o && setParentFor(null)}>
        <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>After-Test Form: Parent Details</DialogTitle><CardDescription>{parentFor?.full_name}</CardDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Gender</Label>
                <Select value={parentForm.gender} onValueChange={v => setParentForm({ ...parentForm, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Parent Email</Label><Input type="email" value={parentForm.parent_email} onChange={e => setParentForm({ ...parentForm, parent_email: e.target.value })} /></div>
            </div>
            <div className="border rounded-lg p-3 space-y-2"><p className="text-sm font-semibold">Father</p>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Name" value={parentForm.parent_father_name} onChange={e => setParentForm({ ...parentForm, parent_father_name: e.target.value })} />
                <Input placeholder="NIC" value={parentForm.parent_father_nic} onChange={e => setParentForm({ ...parentForm, parent_father_nic: e.target.value })} />
                <Input placeholder="Mobile" value={parentForm.parent_father_mobile} onChange={e => setParentForm({ ...parentForm, parent_father_mobile: e.target.value })} />
              </div>
            </div>
            <div className="border rounded-lg p-3 space-y-2"><p className="text-sm font-semibold">Mother</p>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Name" value={parentForm.parent_mother_name} onChange={e => setParentForm({ ...parentForm, parent_mother_name: e.target.value })} />
                <Input placeholder="NIC" value={parentForm.parent_mother_nic} onChange={e => setParentForm({ ...parentForm, parent_mother_nic: e.target.value })} />
                <Input placeholder="Mobile" value={parentForm.parent_mother_mobile} onChange={e => setParentForm({ ...parentForm, parent_mother_mobile: e.target.value })} />
              </div>
            </div>
            <div><Label>Address</Label><Textarea rows={2} value={parentForm.address} onChange={e => setParentForm({ ...parentForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Emergency Contact</Label><Input value={parentForm.emergency_contact} onChange={e => setParentForm({ ...parentForm, emergency_contact: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={parentForm.notes} onChange={e => setParentForm({ ...parentForm, notes: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setParentFor(null)}>Cancel</Button><Button onClick={saveParents}>Save Details</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class-wide test schedule */}
      <Dialog open={classScheduleOpen} onOpenChange={setClassScheduleOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />Schedule Test by Class
            </DialogTitle>
            <CardDescription>
              Pick a class — the same date, time and venue will be applied to every pending/scheduled applicant for that class. No need to schedule per student.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Desired Class *</Label>
              <Select
                value={String(classScheduleForm.desired_class_level)}
                onValueChange={(v) => setClassScheduleForm({ ...classScheduleForm, desired_class_level: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_CLASS_LEVELS.map((n) => {
                    const count = applicants.filter(
                      (a) => a.desired_class_level === n && (a.status === 'pending' || a.status === 'test_scheduled')
                    ).length;
                    return (
                      <SelectItem key={n} value={String(n)}>
                        Class {n} {count > 0 && `• ${count} applicant${count > 1 ? 's' : ''}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Test Date *</Label>
                <Input type="date" value={classScheduleForm.test_date}
                  onChange={(e) => setClassScheduleForm({ ...classScheduleForm, test_date: e.target.value })} />
              </div>
              <div>
                <Label>Test Time *</Label>
                <Input type="time" value={classScheduleForm.test_time}
                  onChange={(e) => setClassScheduleForm({ ...classScheduleForm, test_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Venue</Label>
              <Input value={classScheduleForm.venue}
                onChange={(e) => setClassScheduleForm({ ...classScheduleForm, venue: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={classScheduleForm.notes}
                onChange={(e) => setClassScheduleForm({ ...classScheduleForm, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={classScheduleForm.overwrite}
                onChange={(e) => setClassScheduleForm({ ...classScheduleForm, overwrite: e.target.checked })} />
              Overwrite existing schedules for this class
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassScheduleOpen(false)}>Cancel</Button>
            <Button onClick={saveClassSchedule}>Apply to all applicants</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail view */}
      <Dialog open={!!detailFor} onOpenChange={o => !o && setDetailFor(null)}>
        <DialogContent className="glass-card max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailFor?.full_name}</DialogTitle>
            <CardDescription>Full applicant record + chat</CardDescription>
          </DialogHeader>
          {detailFor && (
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="chat" className="gap-1">
                  <MessageSquare className="h-3 w-3" /> Chat with parent
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="flex-1 overflow-y-auto space-y-2 text-sm mt-2">
                {Object.entries({
                  'B-Form': detailFor.b_form_number,
                  'DOB': detailFor.date_of_birth,
                  'Gender': detailFor.gender,
                  'Desired Class': `Class ${detailFor.desired_class_level}`,
                  'Status': detailFor.status,
                  'Marks': detailFor.test_obtained_marks !== null ? `${detailFor.test_obtained_marks}/${detailFor.test_total_marks}` : '-',
                  'Father': detailFor.parent_father_name,
                  'Father NIC': detailFor.parent_father_nic,
                  'Father Mobile': detailFor.parent_father_mobile,
                  'Mother': detailFor.parent_mother_name,
                  'Mother NIC': detailFor.parent_mother_nic,
                  'Mother Mobile': detailFor.parent_mother_mobile,
                  'Email': detailFor.parent_email,
                  'Address': detailFor.address,
                  'Emergency': detailFor.emergency_contact,
                  'Notes': detailFor.notes,
                }).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/50 py-1.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right">{v || '-'}</span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="chat" className="flex-1 min-h-0 mt-2 h-[55vh]">
                <AdmissionChat asSender="school" applicantId={detailFor.id} className="h-full" />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
