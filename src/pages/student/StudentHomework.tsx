import { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { Paperclip, Loader2, Upload, FileText, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { uploadHomeworkFiles, openHomeworkFile, type HomeworkFile } from '@/hooks/useHomeworkFiles';
import {
  computeHomeworkVerdict, statusBadgeClass,
  type HomeworkRecord, type SubmissionRecord, type ExceptionRecord,
} from '@/lib/homeworkIntelligence';

export default function StudentHomework() {
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [active, setActive] = useState<HomeworkRecord | null>(null);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: me } = await supabase.rpc('current_student' as any);
    const mine = Array.isArray(me) ? (me as any[])[0] : (me as any);
    const sid = mine?.student_id ?? null;
    setStudentId(sid);

    const [hwRes, subRes, excRes] = await Promise.all([
      supabase.from('homework').select('*').order('due_date', { ascending: true }),
      supabase.from('homework_submissions').select('*'),
      supabase.from('homework_exceptions').select('*'),
    ]);
    setHomework(((hwRes.data as any[]) || []) as HomeworkRecord[]);
    setSubmissions(((subRes.data as any[]) || []) as SubmissionRecord[]);
    setExceptions(((excRes.data as any[]) || []) as ExceptionRecord[]);
    setLoading(false);
  };

  const latestFor = (hwId: string) =>
    submissions.filter((s) => s.homework_id === hwId).sort((a, b) => b.version - a.version)[0] || null;

  const rows = useMemo(() => homework.map((hw) => ({
    hw,
    submission: latestFor(hw.id),
    verdict: computeHomeworkVerdict({
      homework: hw,
      studentId: studentId || '',
      submission: latestFor(hw.id),
      exception: exceptions.find((e) => e.homework_id === hw.id) || null,
    }),
  })), [homework, submissions, exceptions, studentId]);

  const today = rows.filter((r) => isToday(new Date(r.hw.due_date)));
  const upcoming = rows.filter((r) => new Date(r.hw.due_date) > new Date() && !isToday(new Date(r.hw.due_date)));
  const past = rows.filter((r) => new Date(r.hw.due_date) < new Date() && !isToday(new Date(r.hw.due_date)));

  const stats = [
    { label: 'To do', value: rows.filter((r) => r.verdict.expected).length, icon: Clock },
    { label: 'Submitted', value: rows.filter((r) => ['submitted', 'submitted_late', 'checked'].includes(r.verdict.status)).length, icon: CheckCircle2 },
    { label: 'Not submitted', value: rows.filter((r) => r.verdict.status === 'overdue').length, icon: AlertTriangle },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Homework</h1>
          <p className="mt-1 text-muted-foreground">Everything your teachers assigned, with what still needs doing.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="glass-card h-32 animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
              <p className="font-medium">No homework right now</p>
              <p className="text-sm text-muted-foreground">When your teacher assigns work it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {[{ title: 'Due today', list: today }, { title: 'Upcoming', list: upcoming }, { title: 'Earlier', list: past }]
              .filter((g) => g.list.length > 0)
              .map((g) => (
                <section key={g.title} className="space-y-3">
                  <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{g.title}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {g.list.map(({ hw, verdict, submission }) => (
                      <Card key={hw.id} className="glass-card">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">{hw.title}</CardTitle>
                            <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass[verdict.tone]}`}>
                              {verdict.label}
                            </span>
                          </div>
                          <CardDescription className="font-mono text-[11px]">
                            {hw.subject} • due {format(new Date(hw.due_date), 'd MMM')}{hw.due_time ? ` ${hw.due_time.slice(0, 5)}` : ''}
                            {hw.max_marks ? ` • ${hw.max_marks} marks` : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="line-clamp-2 text-xs text-muted-foreground">{(hw as any).description || 'No extra instructions.'}</p>
                          {(((hw as any).attachments as HomeworkFile[]) || []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(((hw as any).attachments as HomeworkFile[]) || []).map((f) => (
                                <Button key={f.path} variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => openHomeworkFile(f.path)}>
                                  <Paperclip className="h-3 w-3" /> {f.name}
                                </Button>
                              ))}
                            </div>
                          )}
                          {submission?.teacher_remark && (
                            <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 text-xs">
                              <span className="font-medium">Teacher feedback: </span>{submission.teacher_remark}
                              {submission.marks != null && <span className="font-mono"> ({submission.marks}{hw.max_marks ? `/${hw.max_marks}` : ''})</span>}
                            </div>
                          )}
                          <Button
                            variant={verdict.expected ? 'default' : 'outline'}
                            size="sm"
                            className="w-full whitespace-nowrap"
                            onClick={() => setActive(hw)}
                          >
                            {submission ? 'View / update submission' : 'Submit work'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>

      {active && studentId && (
        <SubmitDialog
          homework={active}
          studentId={studentId}
          versions={submissions.filter((s) => s.homework_id === active.id).sort((a, b) => b.version - a.version)}
          onClose={() => setActive(null)}
          onSubmitted={async () => { setActive(null); await load(); }}
        />
      )}
    </DashboardLayout>
  );
}

function SubmitDialog({ homework, studentId, versions, onClose, onSubmitted }: {
  homework: HomeworkRecord;
  studentId: string;
  versions: SubmissionRecord[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const latest = versions[0] || null;
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const locked = Boolean(latest?.checked_at) && latest?.status !== 'resubmission_required';

  const submit = async () => {
    if (!text.trim() && files.length === 0) {
      toast({ title: 'Nothing to submit', description: 'Write your answer or attach a photo / PDF.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uploaded = files.length ? await uploadHomeworkFiles(files, `submissions/${auth.user?.id}`) : [];
      const due = new Date(`${homework.due_date}T${homework.due_time || '23:59:00'}`);
      const { error } = await supabase.from('homework_submissions').insert({
        homework_id: homework.id,
        student_id: studentId,
        version: (latest?.version || 0) + 1,
        text_response: text.trim() || null,
        files: uploaded as any,
        is_late: new Date() > due,
        status: 'submitted',
      } as any);
      if (error) throw new Error(error.message);
      await supabase.from('homework_events').insert({
        homework_id: homework.id, student_id: studentId, action: 'submission_created',
        detail: { version: (latest?.version || 0) + 1 } as any,
      } as any);
      toast({ title: 'Homework submitted', description: 'Your teacher can see it now.' });
      onSubmitted();
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{homework.title}</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">
            {homework.subject} • due {format(new Date(homework.due_date), 'd MMM yyyy')}{homework.due_time ? ` ${homework.due_time.slice(0, 5)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {versions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your previous submissions</Label>
              {versions.map((v) => (
                <div key={v.id} className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">Attempt #{v.version}{v.is_late ? ' (late)' : ''}</p>
                    <span className="font-mono text-[11px] text-muted-foreground">{format(new Date(v.submitted_at), 'd MMM h:mm a')}</span>
                  </div>
                  {(v as any).text_response && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{(v as any).text_response}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(((v as any).files as HomeworkFile[]) || []).map((f) => (
                      <Button key={f.path} variant="outline" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => openHomeworkFile(f.path)}>
                        <Paperclip className="h-3 w-3" /> {f.name}
                      </Button>
                    ))}
                  </div>
                  {v.teacher_remark && <p className="mt-2 text-xs"><span className="font-medium">Feedback: </span>{v.teacher_remark}</p>}
                </div>
              ))}
            </div>
          )}

          {locked ? (
            <p className="rounded-xl border border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              This homework has already been checked, so no further submissions are accepted.
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Your answer</Label>
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer, or attach photos of your notebook." />
              </div>
              <div className="grid gap-2">
                <Label>Photos / PDF</Label>
                <Input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.txt" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <Badge key={f.name} variant="outline" className="gap-1 text-[11px]">
                        <Paperclip className="h-3 w-3" />{f.name}
                        <button type="button" onClick={() => setFiles(files.filter((x) => x !== f))}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!locked && (
            <Button onClick={submit} disabled={busy} className="gap-2 whitespace-nowrap">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Submit homework
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
