import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Plus, Paperclip, Loader2, Users, CheckCircle2, Clock, AlertTriangle,
  ShieldQuestion, RefreshCw, X, FileText, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { uploadHomeworkFiles, openHomeworkFile, type HomeworkFile } from '@/hooks/useHomeworkFiles';
import {
  computeHomeworkVerdict, statusBadgeClass, NON_SUBMISSION_REASONS,
  type HomeworkRecord, type SubmissionRecord, type ExceptionRecord, type HomeworkVerdict,
} from '@/lib/homeworkIntelligence';

interface StudentRow { id: string; full_name: string; roll_number: string; }

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function TeacherHomework() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useTeacherClasses();

  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // create form
  const [form, setForm] = useState({
    title: '', description: '', subject: '', classId: '', priority: 'normal',
    assignedDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: '20:00', maxMarks: '', instructions: '', topic: '', allowResubmission: true,
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [targetStudents, setTargetStudents] = useState<string[]>([]);
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);

  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);

  useEffect(() => {
    if (classesLoading) return;
    void loadHomework();
  }, [classesLoading, classIds.join(',')]);

  const loadHomework = async () => {
    setLoading(true);
    if (classIds.length === 0) { setHomework([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .in('class_id', classIds)
      .order('due_date', { ascending: false });
    if (error) toast({ title: 'Could not load homework', description: error.message, variant: 'destructive' });
    setHomework(((data as any[]) || []) as HomeworkRecord[]);
    setLoading(false);
  };

  // load students of the class chosen in the create form (for individual targeting)
  useEffect(() => {
    if (!form.classId) { setClassStudents([]); return; }
    void (async () => {
      const { data } = await supabase.from('students').select('id, full_name, roll_number').eq('class_id', form.classId).order('roll_number');
      setClassStudents(((data as any[]) || []) as StudentRow[]);
    })();
  }, [form.classId]);

  const selectedClass = classes.find((c) => c.id === form.classId);

  const resetForm = () => {
    setForm({
      title: '', description: '', subject: '', classId: '', priority: 'normal',
      assignedDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'),
      dueTime: '20:00', maxMarks: '', instructions: '', topic: '', allowResubmission: true,
    });
    setPendingFiles([]);
    setTargetStudents([]);
  };

  const publish = async () => {
    if (!form.title.trim() || !form.classId || !form.subject.trim() || !form.dueDate) {
      toast({ title: 'Missing details', description: 'Title, class, subject and due date are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let attachments: HomeworkFile[] = [];
      if (pendingFiles.length) {
        attachments = await uploadHomeworkFiles(pendingFiles, `assignments/${user?.id}`);
      }
      const { data, error } = await supabase.from('homework').insert({
        class_id: form.classId,
        subject: form.subject.trim(),
        section: selectedClass?.section ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        priority: form.priority,
        assigned_date: form.assignedDate,
        due_date: form.dueDate,
        due_time: form.dueTime ? `${form.dueTime}:00` : null,
        max_marks: form.maxMarks ? Number(form.maxMarks) : null,
        topic: form.topic.trim() || null,
        allow_resubmission: form.allowResubmission,
        attachments: attachments as any,
        target_student_ids: targetStudents.length ? targetStudents : null,
      } as any).select('id').single();
      if (error) throw new Error(error.message);
      await supabase.from('homework_events').insert({ homework_id: (data as any).id, action: 'homework_created', detail: { title: form.title } as any } as any);
      toast({ title: 'Homework published', description: 'Your students can see it now.' });
      setCreateOpen(false);
      resetForm();
      await loadHomework();
    } catch (e: any) {
      toast({ title: 'Could not publish homework', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const classLabel = (id: string) => {
    const c = classes.find((x) => x.id === id);
    return c ? `${c.class_name || `Class ${c.level}`}${c.section ? `-${c.section}` : ''}` : 'Class';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Homework</h1>
            <p className="text-muted-foreground mt-1">Assign work, collect submissions and check them in one place.</p>
          </div>
          <Button className="gap-2 whitespace-nowrap" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create homework
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="glass-card h-40 animate-pulse" />)}
          </div>
        ) : homework.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
              <p className="font-medium">No homework yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">Create your first homework and your students will see it on their dashboard right away.</p>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create homework</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homework.map((hw) => (
              <Card key={hw.id} className="glass-card flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{hw.title}</CardTitle>
                    <Badge variant="outline" className="shrink-0 whitespace-nowrap text-[11px]">{hw.subject}</Badge>
                  </div>
                  <CardDescription className="font-mono text-[11px]">
                    {classLabel(hw.class_id)} • due {format(new Date(hw.due_date), 'd MMM')}{hw.due_time ? ` • ${hw.due_time.slice(0, 5)}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {hw.status === 'withdrawn' && <Badge variant="outline" className="text-[11px]">Withdrawn</Badge>}
                  <p className="line-clamp-2 text-xs text-muted-foreground">{(hw as any).description || 'No instructions added.'}</p>
                  <div className="flex flex-wrap gap-2">
                    {((hw as any).attachments || []).length > 0 && (
                      <Badge variant="outline" className="gap-1 text-[11px]"><Paperclip className="h-3 w-3" />{((hw as any).attachments || []).length} file(s)</Badge>
                    )}
                    {hw.target_student_ids?.length ? (
                      <Badge variant="outline" className="gap-1 text-[11px]"><Users className="h-3 w-3" />{hw.target_student_ids.length} selected students</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[11px]"><Users className="h-3 w-3" />Whole class</Badge>
                    )}
                    {hw.max_marks ? <Badge variant="outline" className="text-[11px]">{hw.max_marks} marks</Badge> : null}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedId(hw.id)}>
                    Open checking panel
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create homework</DialogTitle>
            <DialogDescription>Only the class and students you choose here will receive it.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mathematics — Exercise 3.2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Class &amp; section</Label>
                <Select value={form.classId} onValueChange={(v) => { setForm({ ...form, classId: v }); setTargetStudents([]); }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {(c.class_name || `Class ${c.level}`)}{c.section ? `-${c.section}` : ''} • {c.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Instructions</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Solve questions 1–10." />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="grid gap-2">
                <Label>Assigned</Label>
                <Input type="date" value={form.assignedDate} onChange={(e) => setForm({ ...form, assignedDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Due date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Due time</Label>
                <Input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Marks</Label>
                <Input type="number" min={0} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} placeholder="10" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Topic / concept (optional)</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Fractions" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Attachments</Label>
              <Input
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
              />
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((f) => (
                    <Badge key={f.name} variant="outline" className="gap-1 text-[11px]">
                      <Paperclip className="h-3 w-3" />{f.name}
                      <button type="button" onClick={() => setPendingFiles(pendingFiles.filter((x) => x !== f))}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {classStudents.length > 0 && (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Who receives it</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setTargetStudents([])}>Whole class</Button>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {targetStudents.length === 0 ? 'Every student in this class will receive it.' : `${targetStudents.length} student(s) selected.`}
                </p>
                <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
                  {classStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-muted/40">
                      <Checkbox
                        checked={targetStudents.includes(s.id)}
                        onCheckedChange={(v) => setTargetStudents(v ? [...targetStudents, s.id] : targetStudents.filter((x) => x !== s.id))}
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">{s.roll_number}</span>
                      <span className="truncate">{s.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.allowResubmission} onCheckedChange={(v) => setForm({ ...form, allowResubmission: Boolean(v) })} />
              Allow students to replace their submission before the deadline
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={publish} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish homework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedId && (
        <HomeworkCheckingPanel
          homework={homework.find((h) => h.id === selectedId)!}
          classLabel={classLabel(selectedId ? homework.find((h) => h.id === selectedId)!.class_id : '')}
          onClose={() => setSelectedId(null)}
          onChanged={loadHomework}
        />
      )}
    </DashboardLayout>
  );
}

/* ---------------------------------------------------------------- */

function HomeworkCheckingPanel({ homework, classLabel, onClose, onChanged }: {
  homework: HomeworkRecord;
  classLabel: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [classNotHeld, setClassNotHeld] = useState<{ notHeld: boolean; note?: string }>({ notHeld: false });
  const [activeStudent, setActiveStudent] = useState<StudentRow | null>(null);

  useEffect(() => { void load(); }, [homework.id]);

  const load = async () => {
    setLoading(true);
    const [stuRes, subRes, excRes, attRes, ciRes] = await Promise.all([
      supabase.from('students').select('id, full_name, roll_number').eq('class_id', homework.class_id).order('roll_number'),
      supabase.from('homework_submissions').select('*').eq('homework_id', homework.id).order('version', { ascending: false }),
      supabase.from('homework_exceptions').select('*').eq('homework_id', homework.id),
      supabase.from('attendance').select('student_id, status').eq('class_id', homework.class_id).eq('date', homework.assigned_date),
      supabase.from('teacher_checkins').select('status, arrival_status').eq('date', homework.assigned_date),
    ]);
    setStudents(((stuRes.data as any[]) || []) as StudentRow[]);
    setSubmissions(((subRes.data as any[]) || []) as SubmissionRecord[]);
    setExceptions(((excRes.data as any[]) || []) as ExceptionRecord[]);
    setAbsentIds(((attRes.data as any[]) || []).filter((a) => a.status === 'absent').map((a) => a.student_id));
    const attendanceTaken = ((attRes.data as any[]) || []).length > 0;
    const anyCheckin = ((ciRes.data as any[]) || []).length > 0;
    setClassNotHeld(
      !attendanceTaken && !anyCheckin
        ? { notHeld: true, note: 'No attendance and no staff check-in was recorded on the day this homework was assigned, so the class may not have been held.' }
        : { notHeld: false },
    );
    setLoading(false);
  };

  const latestFor = (studentId: string) =>
    submissions.filter((s) => s.student_id === studentId).sort((a, b) => b.version - a.version)[0] || null;

  const targeted = students.filter((s) => !homework.target_student_ids?.length || homework.target_student_ids.includes(s.id));

  const rows = targeted.map((s) => {
    const verdict = computeHomeworkVerdict({
      homework,
      studentId: s.id,
      submission: latestFor(s.id),
      exception: exceptions.find((e) => e.student_id === s.id) || null,
      context: {
        studentAbsentOnAssignedDate: absentIds.includes(s.id),
        classNotHeld: classNotHeld.notHeld,
        contextNote: classNotHeld.note,
      },
    });
    return { student: s, verdict, submission: latestFor(s.id) };
  });

  const count = (fn: (v: HomeworkVerdict) => boolean) => rows.filter((r) => fn(r.verdict)).length;
  const needsAttention = rows.filter((r) => r.verdict.expected && r.verdict.status !== 'pending');

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{homework.subject} — {classLabel}</DialogTitle>
          <DialogDescription>
            {homework.title} • due {format(new Date(homework.due_date), 'd MMM yyyy')}{homework.due_time ? ` at ${homework.due_time.slice(0, 5)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Assigned', value: rows.length, icon: Users },
                { label: 'Submitted', value: count((v) => ['submitted', 'checked'].includes(v.status)), icon: CheckCircle2 },
                { label: 'Pending', value: count((v) => v.status === 'pending'), icon: Clock },
                { label: 'Late', value: count((v) => v.status === 'submitted_late'), icon: AlertTriangle },
                { label: 'Excused', value: count((v) => ['excused', 'not_required', 'not_expected', 'withdrawn'].includes(v.status)), icon: ShieldQuestion },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            {classNotHeld.notHeld && (
              <div className="rounded-xl border border-[hsl(45,100%,55%)]/30 bg-[hsl(45,100%,55%)]/10 p-3 text-xs">
                <p className="font-medium">No action required — the assignment condition changed.</p>
                <p className="text-muted-foreground">{classNotHeld.note}</p>
              </div>
            )}

            {needsAttention.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium">⚠️ {needsAttention.length} student(s) genuinely need follow-up</p>
                <p className="text-xs text-muted-foreground">Absent, excused and cancelled cases are already excluded from this list.</p>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Roll no.</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Marks</th>
                    <th className="px-3 py-2">Remark</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student, verdict, submission }) => (
                    <tr key={student.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs">{student.roll_number}</td>
                      <td className="px-3 py-2">{student.full_name}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass[verdict.tone]}`}>
                          {verdict.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {submission?.marks != null ? `${submission.marks}${homework.max_marks ? `/${homework.max_marks}` : ''}` : '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted-foreground">{submission?.teacher_remark || verdict.reason}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="sm" className="h-7 whitespace-nowrap px-2 text-xs" onClick={() => setActiveStudent(student)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeStudent && (
          <StudentReviewDialog
            homework={homework}
            student={activeStudent}
            versions={submissions.filter((s) => s.student_id === activeStudent.id).sort((a, b) => b.version - a.version)}
            exception={exceptions.find((e) => e.student_id === activeStudent.id) || null}
            onClose={() => setActiveStudent(null)}
            onSaved={async () => { setActiveStudent(null); await load(); onChanged(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */

function StudentReviewDialog({ homework, student, versions, exception, onClose, onSaved }: {
  homework: HomeworkRecord;
  student: StudentRow;
  versions: SubmissionRecord[];
  exception: ExceptionRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const latest = versions[0] || null;
  const [marks, setMarks] = useState(latest?.marks != null ? String(latest.marks) : '');
  const [remark, setRemark] = useState(latest?.teacher_remark || '');
  const [privateNote, setPrivateNote] = useState('');
  const [reason, setReason] = useState(exception?.reason || '');
  const [reasonNote, setReasonNote] = useState(exception?.note || '');
  const [extendDate, setExtendDate] = useState('');
  const [busy, setBusy] = useState(false);

  const log = (action: string, detail: Record<string, unknown> = {}) =>
    supabase.from('homework_events').insert({ homework_id: homework.id, student_id: student.id, action, detail: detail as any } as any);

  const saveCheck = async (status: 'checked' | 'returned' | 'resubmission_required') => {
    if (!latest) { toast({ title: 'Nothing submitted yet', description: 'This student has not submitted any work.', variant: 'destructive' }); return; }
    setBusy(true);
    const { error } = await supabase.from('homework_submissions').update({
      marks: marks === '' ? null : Number(marks),
      teacher_remark: remark || null,
      private_note: privateNote || null,
      status,
      checked_by: (await supabase.auth.getUser()).data.user?.id,
      checked_at: new Date().toISOString(),
    } as any).eq('id', latest.id);
    setBusy(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    await log(status === 'resubmission_required' ? 'resubmission_requested' : 'submission_checked', { marks, remark });
    toast({ title: status === 'resubmission_required' ? 'Resubmission requested' : 'Saved' });
    onSaved();
  };

  const saveException = async (kind: 'excused' | 'not_required' | 'extension') => {
    setBusy(true);
    const { error } = await supabase.from('homework_exceptions').upsert({
      homework_id: homework.id,
      student_id: student.id,
      kind,
      reason: reason || null,
      note: reasonNote || null,
      extended_due_date: kind === 'extension' ? (extendDate || null) : null,
    } as any, { onConflict: 'homework_id,student_id' });
    setBusy(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    await log(kind === 'extension' ? 'deadline_extended' : 'student_excused', { reason, note: reasonNote });
    toast({ title: kind === 'extension' ? 'Deadline extended' : 'Recorded' });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student.full_name}</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">{student.roll_number} • {homework.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Submission history</Label>
            {versions.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">Nothing submitted yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">Submission #{v.version}</p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {format(new Date(v.submitted_at), 'd MMM h:mm a')}{v.is_late ? ' • late' : ''}
                      </span>
                    </div>
                    {(v as any).text_response && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{(v as any).text_response}</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(((v as any).files as HomeworkFile[]) || []).map((f) => (
                        <Button key={f.path} variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => openHomeworkFile(f.path)}>
                          <Paperclip className="h-3 w-3" /> {f.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Marks{homework.max_marks ? ` (out of ${homework.max_marks})` : ''}</Label>
              <Input type="number" min={0} max={homework.max_marks ?? undefined} value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Feedback the student sees</Label>
              <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Good work. Correct question 7." />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Private teacher note</Label>
            <Textarea rows={2} value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} placeholder="Not shown to the student." />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 whitespace-nowrap" disabled={busy} onClick={() => saveCheck('checked')}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save &amp; mark checked
            </Button>
            <Button variant="outline" className="whitespace-nowrap" disabled={busy} onClick={() => saveCheck('returned')}>Return with feedback</Button>
            <Button variant="outline" className="gap-2 whitespace-nowrap" disabled={busy} onClick={() => saveCheck('resubmission_required')}>
              <RefreshCw className="h-4 w-4" /> Request resubmission
            </Button>
          </div>

          <div className="rounded-xl border border-border p-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Not completed — record the reason</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>{NON_SUBMISSION_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} placeholder="Extra detail (optional)" />
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Button variant="outline" size="sm" className="whitespace-nowrap" disabled={busy} onClick={() => saveException('excused')}>Mark excused</Button>
              <Button variant="outline" size="sm" className="whitespace-nowrap" disabled={busy} onClick={() => saveException('not_required')}>Not required</Button>
              <div className="flex items-end gap-2">
                <Input type="date" className="h-9 w-[150px]" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} />
                <Button variant="outline" size="sm" className="whitespace-nowrap" disabled={busy || !extendDate} onClick={() => saveException('extension')}>Extend deadline</Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
