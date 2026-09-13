import { useState } from 'react';
import { Send, Bot, CheckCircle2, XCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

interface PlanStep { id: number; type: string; label: string; params: Record<string, unknown>; }
interface Plan { summary: string; steps: PlanStep[]; }
type StepStatus = 'pending' | 'running' | 'success' | 'error';
interface StepProgress { id: number; label: string; status: StepStatus; result?: unknown; error?: string; }
interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: Plan;
  progress?: StepProgress[];
  awaitingConfirm?: boolean;
}

function extractPlan(text: string): Plan | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const candidates: string[] = [];
  if (match) candidates.push(match[1].trim());
  const idx = text.lastIndexOf('"steps"');
  if (idx !== -1) {
    const start = text.lastIndexOf('{', idx);
    if (start !== -1) candidates.push(text.slice(start));
  }
  for (const raw of candidates) {
    try {
      const last = raw.lastIndexOf('}');
      const obj = JSON.parse(last !== -1 ? raw.slice(0, last + 1) : raw);
      if (Array.isArray(obj.steps)) return obj as Plan;
    } catch { /* next */ }
  }
  return null;
}
const stripJson = (t: string) => t.replace(/```json[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();

interface Props {
  role: 'teacher' | 'admin';
  quickPrompts?: string[];
  context?: Record<string, unknown>;
}

export function OpsActionPanel({ role, quickPrompts = [], context }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading || executing) return;
    setLoading(true);
    const history = [...turns.map((t) => ({ role: t.role, content: t.content })), { role: 'user' as const, content: text }];
    const userTurn: Turn = { id: `u-${Date.now()}`, role: 'user', content: text };
    const botId = `a-${Date.now()}`;
    setTurns((prev) => [...prev, userTurn, { id: botId, role: 'assistant', content: '' }]);

    let content = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history, role, context }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const c = JSON.parse(j).choices?.[0]?.delta?.content;
            if (c) {
              content += c;
              setTurns((prev) => prev.map((t) => (t.id === botId ? { ...t, content } : t)));
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
      const plan = extractPlan(content);
      setTurns((prev) => prev.map((t) => (t.id === botId
        ? { ...t, content, plan: plan ?? undefined, awaitingConfirm: !!plan && plan.steps.length > 0 }
        : t)));
    } catch (e) {
      toast({ title: 'Assistant error', description: getErrorMessage(e), variant: 'destructive' });
      setTurns((prev) => prev.filter((t) => t.id !== botId));
    } finally {
      setLoading(false);
    }
  };

  const execute = async (turnId: string) => {
    const target = turns.find((t) => t.id === turnId);
    if (!target?.plan || executing) return;
    setExecuting(true);
    const initial: StepProgress[] = target.plan.steps.map((s) => ({ id: s.id, label: s.label, status: 'pending' }));
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, progress: initial, awaitingConfirm: false } : t)));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again');
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ steps: target.plan.steps }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Execution failed' }));
        throw new Error(err.error || 'Execution failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let event = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line === '') { event = ''; continue; }
          if (line.startsWith('event: ')) { event = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (event === 'step_start' || event === 'step_done') {
              setTurns((prev) => prev.map((t) => {
                if (t.id !== turnId || !t.progress) return t;
                return {
                  ...t,
                  progress: t.progress.map((p) => (p.id === data.id
                    ? event === 'step_start'
                      ? { ...p, status: 'running' as StepStatus }
                      : { ...p, status: data.status as StepStatus, result: data.result, error: data.error }
                    : p)),
                };
              }));
            } else if (event === 'complete') {
              toast({ title: 'Done', description: `${data.totalSucceeded} completed, ${data.totalFailed} failed` });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast({ title: 'Could not finish', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="glass-card border-border flex flex-col h-full min-h-[28rem]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-primary">Do it for me</span>
        <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
          Plan → Confirm
        </Badge>
      </div>
      <CardContent className="flex-1 flex flex-col gap-3 p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-3 sm:p-4">
          {turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me to create a class, add students with logins, post an announcement or build your timetable.
                I always show a plan first — nothing happens until you confirm.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xl">
                {quickPrompts.map((q) => (
                  <Button key={q} variant="outline" className="justify-start text-left h-auto py-2 text-xs whitespace-normal"
                    onClick={() => send(q)}>
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {turns.map((t) => (
                <div key={t.id} className={cn('flex', t.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[90%] rounded-xl px-3 py-2.5 space-y-3 text-sm',
                    t.role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/40 border border-border')}>
                    {t.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {stripJson(t.content) || (loading ? 'Thinking…' : '')}
                        </ReactMarkdown>
                      </div>
                    ) : t.content}

                    {t.plan && t.plan.steps.length > 0 && (
                      <div className="rounded-lg border border-border bg-background/60 p-2 space-y-1">
                        {t.plan.steps.map((s) => {
                          const prog = t.progress?.find((p) => p.id === s.id);
                          return (
                            <div key={s.id} className="flex items-center gap-2 text-xs">
                              {prog?.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                              {prog?.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              {prog?.status === 'error' && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                              {(!prog || prog.status === 'pending') && <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="flex-1">{s.label}</span>
                              {prog?.error && <span className="text-destructive truncate max-w-[10rem]">{prog.error}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {t.awaitingConfirm && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => execute(t.id)} disabled={executing} className="gap-2">
                          {executing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Confirm & run
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => setTurns((prev) => prev.map((x) => (x.id === t.id ? { ...x, awaitingConfirm: false, plan: undefined } : x)))}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); setInput(''); } }}
            placeholder="e.g. Create class 9-B for Maths and add 20 students with logins"
            rows={2}
            className="resize-none"
          />
          <Button onClick={() => { send(input); setInput(''); }} disabled={loading || executing || !input.trim()} className="self-end">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
