import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarDays, Plus, Trash2, Loader2, ShieldAlert, FileText, ScanLine,
  Upload, CheckCircle2, Award, Layers,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStaffRoles } from '@/hooks/useStaffRoles';
import { invokeFn, getErrorMessage } from '@/lib/errors';
import { CheckingModeCard } from '@/components/exams/CheckingModeCard';
import { useCheckingMode } from '@/hooks/useExamChecking';
import { useNavigate } from 'react-router-dom';

const TERM_TYPES = [
  { value: 'monthly_test', label: 'Monthly Test' },
  { value: 'normal_test', label: 'Normal Test' },
  { value: 'first_term', label: 'First Term' },
  { value: 'mid_term', label: 'Mid Term' },
  { value: 'final_term', label: 'Final Term' },
];

const DEFAULT_SUBJECTS = ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiat', 'Pakistan Studies', 'Computer', 'Arabic'];
const DEFAULT_LEVELS = [1, 2, 3, 4, 5];

interface Term {
  id: string; name: string; term_type: string; academic_year: string;
  start_date: string; end_date: string; pass_percentage: number;
  is_active: boolean; is_closed: boolean; school_id: string | null;
}
interface Datesheet {
  id: string; term_id: string; class_level: number; title: string | null; is_published: boolean;
}
interface Entry {
  id: string; datesheet_id: string; subject: string; exam_date: string | null;
  start_time: string | null; end_time: string | null; room: string | null;
  is_off_day: boolean; sort_order: number;
}

export default function ExamManagement() {
  const { profile, user } = useAuth();
  const { isExamManager, loading: rolesLoading } = useStaffRoles();
  const { toast } = useToast();
  const schoolId = profile?.school_id || null;

  const [terms, setTerms] = useState<Term[]>([]);
  const [datesheets, setDatesheets] = useState<Datesheet[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTermId, setActiveTermId] = useState('');
  const [busy, setBusy] = useState(false);

  const year = new Date().getFullYear();
  const [termDraft, setTermDraft] = useState({
    name: '', term_type: 'first_term', academic_year: `${year}-${year + 1}`,
    start_date: '', end_date: '', pass_percentage: '40',
  });

  const load = async () => {
    if (!schoolId) return;
    const { data: t } = await supabase.from('exam_terms').select('*').eq('school_id', schoolId).order('start_date', { ascending: false });
    const list = (t as Term[]) || [];
    setTerms(list);
    setActiveTermId((cur) => cur || list[0]?.id || '');
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [schoolId]);

  useEffect(() => {
    if (!activeTermId) { setDatesheets([]); setEntries([]); return; }
    (async () => {
      const { data: ds } = await supabase.from('exam_datesheets').select('*').eq('term_id', activeTermId).order('class_level');
      const sheets = (ds as Datesheet[]) || [];
      setDatesheets(sheets);
      if (sheets.length) {
        const { data: en } = await supabase.from('exam_datesheet_entries').select('*')
          .in('datesheet_id', sheets.map((s) => s.id)).order('sort_order');
        setEntries((en as Entry[]) || []);
      } else setEntries([]);
    })();
  }, [activeTermId]);

  const createTerm = async () => {
    if (!schoolId) return;
    if (!termDraft.name.trim() || !termDraft.start_date || !termDraft.end_date) {
      toast({ title: 'Name, start and end dates are required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('exam_terms').insert({
      school_id: schoolId,
      name: termDraft.name.trim(),
      term_type: termDraft.term_type,
      academic_year: termDraft.academic_year,
      start_date: termDraft.start_date,
      end_date: termDraft.end_date,
      pass_percentage: Number(termDraft.pass_percentage) || 40,
    });
    setBusy(false);
    if (error) { toast({ title: 'Could not create term', description: getErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: 'Exam term created' });
    setTermDraft({ ...termDraft, name: '', start_date: '', end_date: '' });
    load();
  };

  const deleteTerm = async (id: string) => {
    if (!confirm('Delete this term and its date sheets?')) return;
    const { error } = await supabase.from('exam_terms').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setTerms((p) => p.filter((t) => t.id !== id));
    if (activeTermId === id) setActiveTermId('');
  };

  const seedDatesheets = async () => {
    if (!schoolId || !activeTermId || !user) return;
    setBusy(true);
    try {
      const missing = DEFAULT_LEVELS.filter((l) => !datesheets.some((d) => d.class_level === l));
      if (missing.length) {
        const { data: created, error } = await supabase.from('exam_datesheets').insert(
          missing.map((l) => ({ school_id: schoolId, term_id: activeTermId, class_level: l, created_by: user.id })),
        ).select();
        if (error) throw error;
        const rows: any[] = [];
        (created || []).forEach((d: any) => {
          DEFAULT_SUBJECTS.forEach((s, i) => rows.push({ datesheet_id: d.id, subject: s, sort_order: i }));
        });
        if (rows.length) {
          const { error: e2 } = await supabase.from('exam_datesheet_entries').insert(rows);
          if (e2) throw e2;
        }
      }
      toast({ title: 'Date sheets ready — 5 classes × 8 subjects' });
      setActiveTermId(activeTermId);
      const { data: ds } = await supabase.from('exam_datesheets').select('*').eq('term_id', activeTermId).order('class_level');
      const sheets = (ds as Datesheet[]) || [];
      setDatesheets(sheets);
      const { data: en } = await supabase.from('exam_datesheet_entries').select('*')
        .in('datesheet_id', sheets.map((s) => s.id)).order('sort_order');
      setEntries((en as Entry[]) || []);
    } catch (e) {
      toast({ title: 'Could not build date sheets', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const addClassSheet = async () => {
    if (!schoolId || !activeTermId || !user) return;
    const nextLevel = Math.max(0, ...datesheets.map((d) => d.class_level)) + 1;
    const { data, error } = await supabase.from('exam_datesheets')
      .insert({ school_id: schoolId, term_id: activeTermId, class_level: nextLevel, created_by: user.id })
      .select().single();
    if (error) { toast({ title: 'Could not add class', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setDatesheets((p) => [...p, data as Datesheet]);
  };

  const removeSheet = async (id: string) => {
    if (!confirm('Remove this class date sheet?')) return;
    await supabase.from('exam_datesheets').delete().eq('id', id);
    setDatesheets((p) => p.filter((d) => d.id !== id));
    setEntries((p) => p.filter((e) => e.datesheet_id !== id));
  };

  const addSubject = async (sheetId: string) => {
    const count = entries.filter((e) => e.datesheet_id === sheetId).length;
    const { data, error } = await supabase.from('exam_datesheet_entries')
      .insert({ datesheet_id: sheetId, subject: 'New Subject', sort_order: count }).select().single();
    if (error) { toast({ title: 'Could not add subject', description: getErrorMessage(error), variant: 'destructive' }); return; }
    setEntries((p) => [...p, data as Entry]);
  };

  const patchEntry = async (e: Entry, changes: Partial<Entry>) => {
    setEntries((p) => p.map((x) => (x.id === e.id ? { ...x, ...changes } : x)));
    await supabase.from('exam_datesheet_entries').update(changes as any).eq('id', e.id);
  };

  const removeEntry = async (id: string) => {
    await supabase.from('exam_datesheet_entries').delete().eq('id', id);
    setEntries((p) => p.filter((x) => x.id !== id));
  };

  const publishSheet = async (d: Datesheet) => {
    await supabase.from('exam_datesheets').update({ is_published: !d.is_published }).eq('id', d.id);
    setDatesheets((p) => p.map((x) => (x.id === d.id ? { ...x, is_published: !d.is_published } : x)));
  };

  if (rolesLoading) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">Checking your permissions…</p></DashboardLayout>;
  }

  if (!isExamManager) {
    return (
      <DashboardLayout>
        <Card className="glass-card border-border">
          <CardContent className="p-8 text-center space-y-2">
            <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-medium">Exam Manager access required</p>
            <p className="text-sm text-muted-foreground">
              Ask your admin to assign you the Exam Manager, Principal or Vice Principal role.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" /> Exam Management
          </h1>
          <p className="text-muted-foreground">Terms, date sheets, question papers and AI-assisted paper checking.</p>
        </div>

        <Tabs defaultValue="terms">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="terms" className="gap-1"><Award className="h-3.5 w-3.5" /> Terms</TabsTrigger>
            <TabsTrigger value="datesheet" className="gap-1"><CalendarDays className="h-3.5 w-3.5" /> Date Sheets</TabsTrigger>
            <TabsTrigger value="checking" className="gap-1"><ScanLine className="h-3.5 w-3.5" /> Paper Checking</TabsTrigger>
          </TabsList>

          {/* TERMS */}
          <TabsContent value="terms" className="space-y-4 mt-4">
            <Card className="glass-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Create exam term</CardTitle>
                <CardDescription>Choose the kind of exam this is — it drives promotion rules.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Term name *</Label>
                  <Input value={termDraft.name} onChange={(e) => setTermDraft({ ...termDraft, name: e.target.value })} placeholder="First Term 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Exam type</Label>
                  <Select value={termDraft.term_type} onValueChange={(v) => setTermDraft({ ...termDraft, term_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TERM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic year</Label>
                  <Input value={termDraft.academic_year} onChange={(e) => setTermDraft({ ...termDraft, academic_year: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Start date *</Label>
                  <Input type="date" value={termDraft.start_date} onChange={(e) => setTermDraft({ ...termDraft, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End date *</Label>
                  <Input type="date" value={termDraft.end_date} onChange={(e) => setTermDraft({ ...termDraft, end_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pass percentage</Label>
                  <Input type="number" value={termDraft.pass_percentage} onChange={(e) => setTermDraft({ ...termDraft, pass_percentage: e.target.value })} />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button onClick={createTerm} disabled={busy} className="gap-2 whitespace-nowrap">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create term
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-border">
              <CardHeader><CardTitle className="text-lg">All terms</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exam terms yet.</p>
                ) : terms.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.start_date} → {t.end_date} · pass {t.pass_percentage}%
                      </p>
                    </div>
                    <Badge variant="outline">{TERM_TYPES.find((x) => x.value === t.term_type)?.label || t.term_type}</Badge>
                    {t.is_closed && <Badge variant="secondary">Closed</Badge>}
                    <Button size="sm" variant={activeTermId === t.id ? 'default' : 'outline'} className="whitespace-nowrap" onClick={() => setActiveTermId(t.id)}>
                      {activeTermId === t.id ? 'Selected' : 'Select'}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTerm(t.id)} aria-label="Delete term">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATE SHEETS */}
          <TabsContent value="datesheet" className="space-y-4 mt-4">
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Date sheet builder</CardTitle>
                  <CardDescription>
                    {activeTermId ? terms.find((t) => t.id === activeTermId)?.name : 'Select a term on the Terms tab first'}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={seedDatesheets} disabled={!activeTermId || busy}>
                    <Layers className="h-3.5 w-3.5" /> Build default (5 classes × 8 subjects)
                  </Button>
                  <Button size="sm" className="gap-1 whitespace-nowrap" onClick={addClassSheet} disabled={!activeTermId}>
                    <Plus className="h-3.5 w-3.5" /> Add class
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {datesheets.map((d) => (
              <Card key={d.id} className="glass-card border-border">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base">Class {d.class_level}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={d.is_published} onCheckedChange={() => publishSheet(d)} />
                      <span className="text-xs text-muted-foreground">{d.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => addSubject(d.id)}>
                      <Plus className="h-3.5 w-3.5" /> Subject
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeSheet(d.id)} aria-label="Remove class">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {entries.filter((e) => e.datesheet_id === d.id).map((e) => (
                    <div key={e.id} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto_auto] items-center rounded-lg border border-border bg-muted/20 p-2">
                      <Input value={e.subject} onChange={(ev) => patchEntry(e, { subject: ev.target.value })} className="h-9" />
                      <Input type="date" value={e.exam_date || ''} onChange={(ev) => patchEntry(e, { exam_date: ev.target.value })} className="h-9" disabled={e.is_off_day} />
                      <Input type="time" value={e.start_time || ''} onChange={(ev) => patchEntry(e, { start_time: ev.target.value })} className="h-9" disabled={e.is_off_day} />
                      <Input type="time" value={e.end_time || ''} onChange={(ev) => patchEntry(e, { end_time: ev.target.value })} className="h-9" disabled={e.is_off_day} />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                        <Switch checked={e.is_off_day} onCheckedChange={(v) => patchEntry(e, { is_off_day: v })} /> Off day
                      </label>
                      <Button size="icon" variant="ghost" onClick={() => removeEntry(e.id)} aria-label="Delete subject">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {entries.filter((e) => e.datesheet_id === d.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No subjects yet.</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {activeTermId && datesheets.length === 0 && (
              <p className="text-sm text-muted-foreground">No date sheets for this term yet — use the default builder above.</p>
            )}
          </TabsContent>

          {/* AI CHECKING */}
          <TabsContent value="checking" className="mt-4 space-y-4">
            <CheckingModeCard />
            <PaperChecking schoolId={schoolId} terms={terms} activeTermId={activeTermId} setActiveTermId={setActiveTermId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ---------------- AI Paper Checking ---------------- */

interface StudentLite { id: string; full_name: string; roll_number: string; class_id: string | null }

function PaperChecking({
  schoolId, terms, activeTermId, setActiveTermId,
}: { schoolId: string | null; terms: Term[]; activeTermId: string; setActiveTermId: (v: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [classId, setClassId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [qpFiles, setQpFiles] = useState<FileList | null>(null);
  const [ansFiles, setAnsFiles] = useState<FileList | null>(null);
  const [answerKey, setAnswerKey] = useState('');
  const [checks, setChecks] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { mode } = useCheckingMode();
  const [teachers, setTeachers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [assignTeacher, setAssignTeacher] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('classes').select('id, class_name, level, section').eq('school_id', schoolId).order('level'),
        supabase.from('exam_question_papers').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      ]);
      setClasses(c || []);
      setPapers(p || []);
      const { data: t } = await supabase.from('profiles')
        .select('user_id, full_name')
        .eq('school_id', schoolId)
        .order('full_name');
      setTeachers((t as any[])?.filter((x) => x.user_id) as any || []);
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    supabase.from('students').select('id, full_name, roll_number, class_id').eq('class_id', classId)
      .order('roll_number').then(({ data }) => setStudents((data as StudentLite[]) || []));
  }, [classId]);

  const loadChecks = async () => {
    if (!schoolId || !activeTermId) { setChecks([]); return; }
    const { data } = await supabase.from('exam_paper_checks')
      .select('*, students:student_id(full_name, roll_number)')
      .eq('school_id', schoolId).eq('term_id', activeTermId)
      .order('created_at', { ascending: false }).limit(50);
    setChecks(data || []);
  };
  useEffect(() => { loadChecks(); /* eslint-disable-next-line */ }, [schoolId, activeTermId]);

  const level = useMemo(() => classes.find((c) => c.id === classId)?.level ?? null, [classes, classId]);

  const filteredStudents = students.filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return s.full_name.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q);
  });

  const uploadAll = async (files: FileList, folder: string) => {
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const ext = f.name.split('.').pop() || 'jpg';
      const path = `${schoolId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('exam-papers').upload(path, f);
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  };

  const saveQuestionPaper = async () => {
    if (!schoolId || !user || !activeTermId || level === null || !subject || !qpFiles?.length) {
      toast({ title: 'Pick term, class, subject and question paper images', variant: 'destructive' });
      return;
    }
    setBusy('qp');
    try {
      const urls = await uploadAll(qpFiles, 'question-papers');
      const { error } = await supabase.from('exam_question_papers').upsert({
        school_id: schoolId, term_id: activeTermId, class_level: level, subject,
        total_marks: Number(totalMarks) || 100, image_urls: urls,
        answer_key: answerKey.trim() || null, created_by: user.id,
      }, { onConflict: 'term_id,class_level,subject' });
      if (error) throw error;
      toast({ title: 'Question paper saved for this term & class' });
      setQpFiles(null);
      const { data: p } = await supabase.from('exam_question_papers').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
      setPapers(p || []);
    } catch (e) {
      toast({ title: 'Upload failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const checkPaper = async () => {
    if (!schoolId || !user || !activeTermId || !studentId || !subject || !ansFiles?.length) {
      toast({ title: 'Pick term, student, subject and answer sheet images', variant: 'destructive' });
      return;
    }
    const manual = mode === 'manual';
    if (manual && !assignTeacher) {
      toast({ title: 'Choose the teacher who will check this paper', variant: 'destructive' });
      return;
    }
    setBusy('check');
    try {
      const urls = await uploadAll(ansFiles, 'answer-sheets');
      const paper = papers.find((p) => p.term_id === activeTermId && p.class_level === level && p.subject === subject);
      const { data: row, error } = await supabase.from('exam_paper_checks').insert({
        school_id: schoolId, term_id: activeTermId, student_id: studentId, class_id: classId || null,
        question_paper_id: paper?.id || null, subject, answer_image_urls: urls,
        total_marks: paper?.total_marks || Number(totalMarks) || 100,
        status: manual ? 'assigned' : 'pending', created_by: user.id,
        ...(manual ? {
          assigned_to: assignTeacher, assigned_by: user.id, assigned_at: new Date().toISOString(),
        } : {}),
      } as any).select().single();
      if (error) throw error;
      setAnsFiles(null);
      if (manual) {
        const name = teachers.find((t) => t.user_id === assignTeacher)?.full_name || 'the teacher';
        toast({ title: `Sent to ${name} for checking`, description: 'It now appears in their exam checking portal.' });
        loadChecks();
        return;
      }
      toast({ title: 'Answer sheet uploaded — AI checking started…' });
      const { error: fnErr } = await invokeFn('check-exam-paper', { body: { check_id: row.id } });
      if (fnErr) throw fnErr;
      toast({ title: 'AI checking complete' });
      loadChecks();
    } catch (e) {
      toast({ title: 'Checking failed', description: getErrorMessage(e), variant: 'destructive' });
      loadChecks();
    } finally { setBusy(null); }
  };

  const reassign = async (c: any, teacherId: string) => {
    const { error } = await (supabase as any).from('exam_paper_checks').update({
      assigned_to: teacherId, assigned_by: user?.id ?? null, assigned_at: new Date().toISOString(),
      status: 'assigned', teacher_submitted_at: null,
    }).eq('id', c.id);
    if (error) { toast({ title: 'Could not send it out', description: getErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: 'Sent back to the teacher for re-checking' });
    loadChecks();
  };

  const verify = async (c: any) => {
    await supabase.from('exam_paper_checks')
      .update({ status: 'verified', needs_review: false, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', c.id);
    loadChecks();
  };

  const publish = async (c: any) => {
    if (!user) return;
    const term = terms.find((t) => t.id === c.term_id);
    const { error } = await supabase.from('student_exam_results').insert({
      student_id: c.student_id, class_id: c.class_id, teacher_id: user.id,
      term_name: term?.name || 'Exam', subject: c.subject,
      total_marks: c.total_marks || 100, obtained_marks: c.obtained_marks || 0,
      is_published: true,
    });
    if (error) { toast({ title: 'Publish failed', description: getErrorMessage(error), variant: 'destructive' }); return; }
    await supabase.from('exam_paper_checks').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', c.id);
    toast({ title: 'Result published — visible to the student' });
    loadChecks();
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border">
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Term</Label>
            <Select value={activeTermId} onValueChange={setActiveTermId}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>{terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name || `Class ${c.level}-${c.section}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" />
          </div>
          <div>
            <Label className="text-xs">Total marks</Label>
            <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Question paper (once per term & class)</CardTitle>
            <CardDescription>The AI grades answers against this paper.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="file" accept="image/*" multiple onChange={(e) => setQpFiles(e.target.files)} />
            <div className="space-y-1">
              <Label className="text-xs">Answer key / marking scheme (optional)</Label>
              <Input value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="Q1: b, Q2: 42, Q3: photosynthesis…" />
            </div>
            <Button onClick={saveQuestionPaper} disabled={busy === 'qp'} className="gap-2 whitespace-nowrap">
              {busy === 'qp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Save question paper
            </Button>
            <div className="text-xs text-muted-foreground">
              {papers.filter((p) => p.term_id === activeTermId).length} paper(s) stored for this term.
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              {mode === 'manual' ? "Send a paper to a teacher" : "Check a student's paper"}
            </CardTitle>
            <CardDescription>
              {mode === 'manual'
                ? 'Upload the answer sheets and choose the teacher who will mark them.'
                : 'Search by name or roll number, upload the answer sheets.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search student by name or roll no…" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} />
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder={classId ? 'Select student' : 'Pick a class first'} /></SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>#{s.roll_number} — {s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="file" accept="image/*" multiple onChange={(e) => setAnsFiles(e.target.files)} />
            {mode === 'manual' && (
              <div className="space-y-1">
                <Label className="text-xs">Teacher who will check it</Label>
                <Select value={assignTeacher} onValueChange={setAssignTeacher}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={checkPaper} disabled={busy === 'check'} className="gap-2 whitespace-nowrap">
              {busy === 'check' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {mode === 'manual' ? 'Send to teacher for checking' : 'Start AI checking'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Papers in this term</CardTitle>
          <CardDescription>
            {mode === 'manual'
              ? 'Teachers mark their assigned papers and send them back here for verification and publishing.'
              : 'Papers are graded by AI, then verified here before publishing.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing checked for this term yet.</p>
          ) : checks.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex-1 min-w-[180px]">
                <p className="font-medium">{c.students?.full_name || 'Student'} <span className="text-xs text-muted-foreground">#{c.students?.roll_number}</span></p>
                <p className="text-xs text-muted-foreground">
                  {c.subject}
                  {c.assigned_to && ` · with ${teachers.find((t) => t.user_id === c.assigned_to)?.full_name || 'teacher'}`}
                  {c.teacher_submitted_at && ` · returned ${new Date(c.teacher_submitted_at).toLocaleDateString()}`}
                  {c.teacher_note ? ` · "${c.teacher_note.slice(0, 60)}"` : ''}
                </p>
              </div>
              <Badge variant="outline" className="font-mono">{c.obtained_marks ?? '—'}/{c.total_marks ?? '—'}</Badge>
              {mode !== 'manual' && (
                <Badge variant="outline">agreement {c.agreement != null ? `${Math.round(Number(c.agreement) * 100)}%` : '—'}</Badge>
              )}
              <Badge variant={c.status === 'published' ? 'default' : 'secondary'}>
                {c.status === 'assigned' ? 'with teacher' : c.status === 'submitted' ? 'returned for review' : c.status}
              </Badge>
              <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => navigate(`/exams/check/${c.id}`)}>
                <ScanLine className="h-3.5 w-3.5" /> Open checking
              </Button>
              {c.assigned_to && ['submitted', 'checked', 'verified'].includes(c.status) && (
                <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => reassign(c, c.assigned_to)}>
                  <ScanLine className="h-3.5 w-3.5" /> Send back to teacher
                </Button>
              )}
              {(c.status === 'checked' || c.status === 'submitted') && (
                <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => verify(c)}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                </Button>
              )}
              {c.status === 'verified' && (
                <Button size="sm" className="gap-1 whitespace-nowrap" onClick={() => publish(c)}>
                  <Award className="h-3.5 w-3.5" /> Publish result
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
