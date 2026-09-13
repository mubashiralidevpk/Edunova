import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Flag, Loader2, Plus, Save, Trash2,
  CheckCircle2, XCircle, Pencil, RefreshCw, Award, History, UserCheck, Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStaffRoles } from '@/hooks/useStaffRoles';
import { getErrorMessage, invokeFn } from '@/lib/errors';
import { usePaperCheck, useCheckingMode, checkTotals, effectiveMarks, type CheckQuestion, type QuestionType } from '@/hooks/useExamChecking';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the blank' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'short', label: 'Short answer' },
  { value: 'structured', label: 'Structured' },
  { value: 'subjective', label: 'Subjective' },
  { value: 'math', label: 'Mathematics' },
];

function useSignedImages(paths: unknown) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const list = Array.isArray(paths) ? (paths as string[]) : [];
    if (!list.length) { setUrls([]); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.storage.from('exam-papers').createSignedUrls(list, 3600);
      if (alive) setUrls((data || []).map((d) => d.signedUrl).filter(Boolean) as string[]);
    })();
    return () => { alive = false; };
  }, [JSON.stringify(paths)]);
  return urls;
}

function ImageStack({ urls, empty }: { urls: string[]; empty: string }) {
  if (!urls.length) return <p className="p-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="max-h-[62vh] overflow-auto space-y-3 p-3">
      {urls.map((u, i) => (
        <img key={u} src={u} alt={`Page ${i + 1}`} loading="lazy" className="w-full rounded-xl border border-border" />
      ))}
    </div>
  );
}

export default function CheckingWorkspace() {
  const { checkId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isExamManager, loading: rolesLoading } = useStaffRoles();
  const { mode } = useCheckingMode();
  const { check, questions, audit, loading, reload, patchQuestion, addQuestion, removeQuestion, patchCheck, logAction } =
    usePaperCheck(checkId || null);

  const [paper, setPaper] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [idName, setIdName] = useState('');
  const [idRoll, setIdRoll] = useState('');
  const [teacherNote, setTeacherNote] = useState('');

  useEffect(() => {
    if (!check?.question_paper_id) { setPaper(null); return; }
    supabase.from('exam_question_papers').select('*').eq('id', check.question_paper_id).maybeSingle()
      .then(({ data }) => setPaper(data));
  }, [check?.question_paper_id]);

  useEffect(() => {
    if (!check) return;
    setIdName(check.identified_student_name || check.students?.full_name || '');
    setIdRoll(check.identified_roll_number || check.students?.roll_number || '');
  }, [check?.id]);

  const answerUrls = useSignedImages(check?.answer_image_urls);
  const paperUrls = useSignedImages(paper?.image_urls);

  const totals = useMemo(() => checkTotals(questions), [questions]);
  const current = questions[index] || null;

  if (rolesLoading || (loading && !check)) {
    return <DashboardLayout><p className="text-sm text-muted-foreground">Loading the checking workspace…</p></DashboardLayout>;
  }
  if (!check) {
    return (
      <DashboardLayout>
        <Card className="glass-card border-border"><CardContent className="p-8 text-center space-y-3">
          <p className="text-sm">This paper could not be found.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="whitespace-nowrap">Go back</Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const isAssignedTeacher = !!user && check.assigned_to === user.id;
  const aiEnabled = mode !== 'manual';

  if (!isExamManager && !isAssignedTeacher) {
    return (
      <DashboardLayout>
        <Card className="glass-card border-border"><CardContent className="p-8 text-center text-sm">
          This paper is not assigned to you. Only the exam office or the assigned teacher can check it.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  const confirmIdentity = async () => {
    await patchCheck(
      { identified_student_name: idName.trim() || null, identified_roll_number: idRoll.trim() || null, identity_confirmed: true },
      'identity_confirmed',
    );
    toast({ title: 'Student identity confirmed' });
  };

  const decide = async (q: CheckQuestion, decision: CheckQuestion['decision']) => {
    if (decision === 'accepted') {
      await patchQuestion(q.id, { decision, teacher_marks: q.ai_suggested_marks ?? 0, needs_review: false }, 'teacher_accepted_ai');
    } else if (decision === 'rejected') {
      await patchQuestion(q.id, { decision, teacher_marks: 0, needs_review: false }, 'teacher_rejected_ai');
    } else {
      await patchQuestion(q.id, { decision }, `teacher_${decision}`);
    }
  };

  const requestRecheck = async () => {
    setBusy('recheck');
    try {
      await logAction('recheck_requested', { question_no: current?.question_no ?? null }, current?.id);
      const { error } = await invokeFn('check-exam-paper', { body: { check_id: check.id, recheck: true } });
      if (error) throw error;
      toast({ title: 'Recheck complete — review the updated suggestions' });
      reload();
    } catch (e) {
      toast({ title: 'Recheck failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const finalize = async () => {
    setBusy('final');
    try {
      await patchCheck({
        obtained_marks: totals.obtained, total_marks: totals.max || check.total_marks,
        status: 'verified', needs_review: false,
        reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(),
        finalized_by: user?.id ?? null, finalized_at: new Date().toISOString(),
      }, 'final_marks_confirmed');
      toast({ title: 'Marks confirmed', description: `${totals.obtained}/${totals.max} recorded.` });
    } catch (e) {
      toast({ title: 'Could not confirm marks', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const submitToOffice = async () => {
    setBusy('submit');
    try {
      await patchCheck({
        obtained_marks: totals.obtained, total_marks: totals.max || check.total_marks,
        status: 'submitted', needs_review: totals.flagged > 0,
        teacher_submitted_at: new Date().toISOString(),
        teacher_note: teacherNote.trim() || null,
      } as any, 'submitted_to_exam_office');
      toast({ title: 'Sent to the exam office', description: `${totals.obtained}/${totals.max} submitted for review.` });
    } catch (e) {
      toast({ title: 'Could not send it', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const publish = async () => {
    if (!user) return;
    setBusy('publish');
    try {
      const { data: term } = await supabase.from('exam_terms').select('name').eq('id', check.term_id).maybeSingle();
      const { error } = await supabase.from('student_exam_results').insert({
        student_id: check.student_id, class_id: check.class_id, teacher_id: user.id,
        term_name: term?.name || 'Exam', subject: check.subject,
        total_marks: totals.max || check.total_marks || 100,
        obtained_marks: totals.obtained,
        is_published: true,
      });
      if (error) throw error;
      await patchCheck({ status: 'published', published_at: new Date().toISOString() }, 'results_published');
      toast({ title: 'Result published — the student can see it now' });
    } catch (e) {
      toast({ title: 'Publish failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1 whitespace-nowrap" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-bold">{check.students?.full_name || 'Student'}</h1>
            <p className="text-sm text-muted-foreground">
              Roll #{check.students?.roll_number || '—'} · {check.subject} · {mode} checking
            </p>
          </div>
          <Badge variant="outline" className="font-mono">{totals.obtained}/{totals.max || check.total_marks || '—'}</Badge>
          <Badge variant="outline">{totals.decided}/{totals.total} decided</Badge>
          {totals.flagged > 0 && <Badge variant="destructive">{totals.flagged} flagged</Badge>}
          <Badge variant={check.status === 'published' ? 'default' : 'secondary'}>{check.status}</Badge>
        </div>

        {/* Identity */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Student identity
              {check.identity_confirmed
                ? <Badge className="ml-1">Confirmed</Badge>
                : <Badge variant="secondary" className="ml-1">Needs confirmation</Badge>}
            </CardTitle>
            <CardDescription>
              Detected from the answer sheet. Correct it if the detection is wrong — the teacher decides.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
            <div className="space-y-1">
              <Label className="text-xs">Detected name</Label>
              <Input value={idName} onChange={(e) => setIdName(e.target.value)} placeholder="Student name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Detected roll number</Label>
              <Input value={idRoll} onChange={(e) => setIdRoll(e.target.value)} placeholder="Roll number" />
            </div>
            <Button onClick={confirmIdentity} className="gap-2 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" /> Confirm identity
            </Button>
          </CardContent>
        </Card>

        {/* Side-by-side */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="glass-card border-border overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-base">Question paper</CardTitle></CardHeader>
            <CardContent className="p-0"><ImageStack urls={paperUrls} empty="No question paper images uploaded for this subject." /></CardContent>
          </Card>
          <Card className="glass-card border-border overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-base">Student answer sheet</CardTitle></CardHeader>
            <CardContent className="p-0"><ImageStack urls={answerUrls} empty="No answer sheet images uploaded." /></CardContent>
          </Card>
        </div>

        {/* Checking sheet */}
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="glass-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Questions</CardTitle>
              <Button size="icon" variant="ghost" aria-label="Add question"
                onClick={() => addQuestion({ question_no: String(questions.length + 1), max_marks: 5 })}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="max-h-[50vh] overflow-auto space-y-1">
              {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet — add them to start checking.</p>}
              {questions.map((q, i) => {
                const done = q.teacher_marks != null || q.decision !== 'pending';
                return (
                  <button key={q.id} type="button" onClick={() => setIndex(i)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      i === index ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                    }`}>
                    <span className="truncate">Q{q.question_no}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {(q.is_flagged || q.needs_review) && <Flag className="h-3 w-3 text-destructive" />}
                      <span className="font-mono text-xs text-muted-foreground">
                        {done ? effectiveMarks(q) : '—'}/{q.max_marks}
                      </span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            {current ? (
              <>
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-base">Question {current.question_no}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" disabled={index === 0}
                      onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" disabled={index >= questions.length - 1}
                      onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={current.is_flagged ? 'destructive' : 'outline'} className="gap-1 whitespace-nowrap"
                      onClick={() => patchQuestion(current.id, { is_flagged: !current.is_flagged }, 'flag_toggled')}>
                      <Flag className="h-3.5 w-3.5" /> {current.is_flagged ? 'Flagged' : 'Flag'}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => removeQuestion(current.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Question number</Label>
                      <Input value={current.question_no}
                        onChange={(e) => patchQuestion(current.id, { question_no: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Question type</Label>
                      <Select value={current.question_type} onValueChange={(v) => patchQuestion(current.id, { question_type: v as QuestionType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Maximum marks</Label>
                      <Input type="number" value={current.max_marks}
                        onChange={(e) => patchQuestion(current.id, { max_marks: Number(e.target.value) || 0 })} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Question</Label>
                    <Textarea rows={2} value={current.question_text || ''}
                      onChange={(e) => patchQuestion(current.id, { question_text: e.target.value })} />
                  </div>

                  {(current.student_answer || current.ai_rationale) && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-sm">
                      {current.student_answer && (
                        <p><span className="text-muted-foreground">Student answer read: </span>{current.student_answer}</p>
                      )}
                      {current.ai_suggested_marks != null && (
                        <p className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono">Suggested {current.ai_suggested_marks}/{current.max_marks}</Badge>
                          {current.ai_confidence != null && (
                            <Badge variant="secondary">confidence {Math.round(Number(current.ai_confidence) * 100)}%</Badge>
                          )}
                        </p>
                      )}
                      {current.ai_rationale && <p className="text-muted-foreground">{current.ai_rationale}</p>}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                    <div className="space-y-1">
                      <Label className="text-xs">Awarded marks</Label>
                      <Input type="number" value={current.teacher_marks ?? ''}
                        onChange={(e) => patchQuestion(current.id, {
                          teacher_marks: e.target.value === '' ? null : Number(e.target.value),
                          decision: 'modified',
                        })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Comment</Label>
                      <Input value={current.teacher_comment || ''}
                        onChange={(e) => patchQuestion(current.id, { teacher_comment: e.target.value })}
                        placeholder="Method correct, minor calculation error…" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {aiEnabled && current.ai_suggested_marks != null && (
                      <>
                        <Button size="sm" className="gap-1 whitespace-nowrap" onClick={() => decide(current, 'accepted')}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept suggestion
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => decide(current, 'modified')}>
                          <Pencil className="h-3.5 w-3.5" /> Modify
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={() => decide(current, 'rejected')}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" disabled={busy === 'recheck'} onClick={requestRecheck}>
                          {busy === 'recheck' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Request recheck
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="secondary" className="gap-1 whitespace-nowrap"
                      onClick={() => patchQuestion(current.id, { needs_review: false }, 'marks_saved')}>
                      <Save className="h-3.5 w-3.5" /> Save progress
                    </Button>
                    <Badge variant="outline" className="self-center">{current.decision}</Badge>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Add a question on the left to begin checking.
              </CardContent>
            )}
          </Card>
        </div>

        {/* Finalize */}
        <Card className="glass-card border-border">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">Final marks: {totals.obtained}/{totals.max || check.total_marks || 0}</p>
              <p className="text-xs text-muted-foreground">
                {totals.decided} of {totals.total} questions decided
                {totals.flagged > 0 ? ` · ${totals.flagged} still flagged for review` : ''}
              </p>
            </div>
            {isExamManager ? (
              <>
                <Button variant="outline" className="gap-2 whitespace-nowrap" disabled={busy === 'final' || !questions.length} onClick={finalize}>
                  {busy === 'final' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm final marks
                </Button>
                <Button className="gap-2 whitespace-nowrap"
                  disabled={busy === 'publish' || check.status === 'published' || !check.identity_confirmed}
                  onClick={publish}>
                  {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                  {check.status === 'published' ? 'Published' : 'Publish result'}
                </Button>
              </>
            ) : (
              <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <Label className="text-xs">Note for the exam office (optional)</Label>
                  <Input value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)}
                    placeholder="Checked fully, question 6 needs a second look…" />
                </div>
                <Button className="gap-2 whitespace-nowrap"
                  disabled={busy === 'submit' || !questions.length || check.status === 'submitted'}
                  onClick={submitToOffice}>
                  {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {check.status === 'submitted' ? 'Sent to exam office' : 'Send to exam office'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit trail */}
        <Card className="glass-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Checking history</CardTitle>
            <CardDescription>Every examination action is recorded with who did it and when.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-64 overflow-auto space-y-1">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions recorded yet.</p>
            ) : audit.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
                <Badge variant="outline" className="font-mono">{a.action}</Badge>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
