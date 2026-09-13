import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type CheckingMode = 'manual' | 'automatic' | 'hybrid';
export type QuestionDecision = 'pending' | 'accepted' | 'modified' | 'rejected' | 'recheck';
export type QuestionType =
  | 'mcq' | 'true_false' | 'fill_blank' | 'numerical' | 'short' | 'structured' | 'subjective' | 'math';

export interface CheckQuestion {
  id: string;
  check_id: string;
  school_id: string;
  order_index: number;
  question_no: string;
  question_text: string | null;
  question_type: QuestionType;
  max_marks: number;
  student_answer: string | null;
  ai_suggested_marks: number | null;
  ai_confidence: number | null;
  ai_rationale: string | null;
  ai_steps: unknown;
  teacher_marks: number | null;
  teacher_comment: string | null;
  decision: QuestionDecision;
  is_flagged: boolean;
  needs_review: boolean;
  decided_by: string | null;
  decided_at: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

const anyDb = supabase as any;

/** Shared across every mounted component so a change applies without a reload. */
const modeListeners = new Set<(m: CheckingMode) => void>();
let sharedMode: CheckingMode = 'manual';
const broadcastMode = (m: CheckingMode) => {
  sharedMode = m;
  modeListeners.forEach((fn) => fn(m));
};

/** School-wide examination checking mode. */
export function useCheckingMode() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id || null;
  const [mode, setMode] = useState<CheckingMode>(sharedMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const listener = (m: CheckingMode) => setMode(m);
    modeListeners.add(listener);
    return () => { modeListeners.delete(listener); };
  }, []);

  const load = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    const { data } = await anyDb
      .from('school_settings')
      .select('exam_checking_mode')
      .eq('school_id', schoolId)
      .maybeSingle();
    broadcastMode((data?.exam_checking_mode as CheckingMode) || 'manual');
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: CheckingMode) => {
    setSaving(true);
    const { error } = await anyDb.rpc('set_exam_checking_mode', { _mode: next });
    setSaving(false);
    if (!error) broadcastMode(next);
    return error;
  }, []);

  return { mode, setMode, save, loading, saving };
}


/** Per-question checking sheet + immutable audit trail for one paper. */
export function usePaperCheck(checkId: string | null) {
  const { user, profile } = useAuth();
  const schoolId = profile?.school_id || null;
  const [check, setCheck] = useState<any>(null);
  const [questions, setQuestions] = useState<CheckQuestion[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!checkId) { setCheck(null); setQuestions([]); setAudit([]); return; }
    setLoading(true);
    const [{ data: c }, { data: q }, { data: a }] = await Promise.all([
      anyDb.from('exam_paper_checks').select('*, students:student_id(full_name, roll_number)').eq('id', checkId).maybeSingle(),
      anyDb.from('exam_check_questions').select('*').eq('check_id', checkId).order('order_index'),
      anyDb.from('exam_check_audit').select('*').eq('check_id', checkId).order('created_at', { ascending: false }).limit(200),
    ]);
    setCheck(c || null);
    setQuestions((q as CheckQuestion[]) || []);
    setAudit((a as AuditEntry[]) || []);
    setLoading(false);
  }, [checkId]);

  useEffect(() => { load(); }, [load]);

  const logAction = useCallback(async (action: string, details: Record<string, unknown> = {}, questionId?: string) => {
    if (!checkId || !schoolId || !user) return;
    await anyDb.from('exam_check_audit').insert({
      check_id: checkId, question_id: questionId ?? null, school_id: schoolId,
      actor_id: user.id, action, details,
    });
  }, [checkId, schoolId, user]);

  const patchQuestion = useCallback(async (id: string, changes: Partial<CheckQuestion>, action?: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));
    const payload: Record<string, unknown> = { ...changes };
    if (action) { payload.decided_by = user?.id ?? null; payload.decided_at = new Date().toISOString(); }
    await anyDb.from('exam_check_questions').update(payload).eq('id', id);
    if (action) await logAction(action, changes as Record<string, unknown>, id);
  }, [logAction, user]);

  const addQuestion = useCallback(async (partial: Partial<CheckQuestion>) => {
    if (!checkId || !schoolId) return;
    const order = questions.length;
    const { data } = await anyDb.from('exam_check_questions').insert({
      check_id: checkId, school_id: schoolId, order_index: order,
      question_no: partial.question_no || String(order + 1),
      question_type: partial.question_type || 'subjective',
      max_marks: partial.max_marks ?? 0,
      question_text: partial.question_text ?? null,
    }).select().single();
    if (data) setQuestions((p) => [...p, data as CheckQuestion]);
    await logAction('question_added', { question_no: partial.question_no });
  }, [checkId, schoolId, questions.length, logAction]);

  const removeQuestion = useCallback(async (id: string) => {
    await anyDb.from('exam_check_questions').delete().eq('id', id);
    setQuestions((p) => p.filter((q) => q.id !== id));
    await logAction('question_removed', { id });
  }, [logAction]);

  const patchCheck = useCallback(async (changes: Record<string, unknown>, action?: string) => {
    if (!checkId) return;
    setCheck((prev: any) => (prev ? { ...prev, ...changes } : prev));
    await anyDb.from('exam_paper_checks').update(changes).eq('id', checkId);
    if (action) await logAction(action, changes);
  }, [checkId, logAction]);

  return { check, questions, audit, loading, reload: load, patchQuestion, addQuestion, removeQuestion, patchCheck, logAction };
}

/** Final mark a question carries, whatever the mode. */
export function effectiveMarks(q: CheckQuestion): number {
  if (q.teacher_marks != null) return Number(q.teacher_marks);
  if (q.decision === 'accepted' && q.ai_suggested_marks != null) return Number(q.ai_suggested_marks);
  return 0;
}

export function checkTotals(questions: CheckQuestion[]) {
  const max = questions.reduce((s, q) => s + Number(q.max_marks || 0), 0);
  const obtained = questions.reduce((s, q) => s + effectiveMarks(q), 0);
  const decided = questions.filter((q) => q.decision !== 'pending' || q.teacher_marks != null).length;
  const flagged = questions.filter((q) => q.is_flagged || q.needs_review).length;
  return { max, obtained, decided, flagged, total: questions.length };
}
