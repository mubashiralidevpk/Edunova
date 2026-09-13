import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Brain, Bot, User, CheckCircle2, XCircle, Loader2, UserPlus, BookOpen, Users, Megaphone, CalendarDays, Trash, Edit3, Sparkles, Plus, MessageSquare, Trash2, PanelLeft, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/hooks/use-toast';
import { useAIChats, type AIMessageRow } from '@/hooks/useAIChats';

interface PlanStep { id: number; type: string; label: string; params: Record<string, unknown>; }
interface Plan { summary: string; steps: PlanStep[]; }
type StepStatus = 'pending' | 'running' | 'success' | 'error';
interface StepProgress { id: number; label: string; status: StepStatus; result?: unknown; error?: string; }

interface UIMessage extends Omit<AIMessageRow, 'metadata'> {
  plan?: Plan;
  progress?: StepProgress[];
  executed?: boolean;
  awaitingConfirm?: boolean;
}

const DESTRUCTIVE_TYPES = new Set([
  'delete_class','delete_teacher','delete_all_dummy_students','delete_announcement','delete_exam_term'
]);

function extractPlan(text: string): Plan | null {
  // Try fenced ```json block first
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const candidates: string[] = [];
  if (match) candidates.push(match[1].trim());
  // Fallback: last {...} that contains "steps"
  const braceIdx = text.lastIndexOf('"steps"');
  if (braceIdx !== -1) {
    const start = text.lastIndexOf('{', braceIdx);
    if (start !== -1) candidates.push(text.slice(start));
  }
  for (const raw of candidates) {
    try {
      // Trim trailing junk after final }
      const lastBrace = raw.lastIndexOf('}');
      const sliced = lastBrace !== -1 ? raw.slice(0, lastBrace + 1) : raw;
      const obj = JSON.parse(sliced);
      if (Array.isArray(obj.steps)) return obj as Plan;
    } catch { /* try next */ }
  }
  return null;
}
function stripJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

const STEP_ICONS: Record<string, typeof Brain> = {
  create_teacher: UserPlus, create_class: BookOpen, generate_dummy_students: Users,
  create_announcement: Megaphone, create_exam_term: CalendarDays,
  delete_class: Trash, delete_teacher: Trash, delete_all_dummy_students: Trash,
  delete_announcement: Trash, delete_exam_term: Trash,
  rename_class: Edit3, update_teacher_role: Edit3,
  bulk_full_schedule: CalendarDays, bulk_create_classes: BookOpen, bulk_create_teachers: UserPlus,
};
const STEP_LABELS: Record<string, string> = {
  create_teacher: 'New Teacher', create_class: 'New Class', generate_dummy_students: 'Seed Students',
  create_announcement: 'Announcement', create_exam_term: 'Exam Term',
  delete_class: 'Delete Class', delete_teacher: 'Delete Teacher',
  delete_all_dummy_students: 'Purge Students', delete_announcement: 'Delete Post',
  delete_exam_term: 'Delete Term', rename_class: 'Rename Class', update_teacher_role: 'Update Role',
  bulk_full_schedule: 'Bulk Schedule', bulk_create_classes: 'Bulk Classes', bulk_create_teachers: 'Bulk Teachers',
};

export default function AdminAI() {
  const chats = useAIChats('admin');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Local view of messages augmented with plan/progress (persisted plan via metadata)
  const [uiMessages, setUiMessages] = useState<UIMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync persisted -> ui state, reattaching plan from metadata.
  // CRITICAL: keep awaitingConfirm true for any assistant message with a plan
  // that has not been executed yet — otherwise the Confirm button vanishes
  // after refresh / realtime sync and nothing ever runs.
  useEffect(() => {
    setUiMessages(
      chats.messages.map((m) => {
        const plan = m.metadata && typeof m.metadata === 'object' && 'plan' in m.metadata
          ? (m.metadata as { plan?: Plan }).plan
          : extractPlan(m.content) ?? undefined;
        const progress = m.metadata && typeof m.metadata === 'object' && 'progress' in m.metadata
          ? (m.metadata as { progress?: StepProgress[] }).progress
          : undefined;
        const executed = !!progress;
        const awaitingConfirm = m.role === 'assistant' && !!plan && plan.steps.length > 0 && !executed;
        return { ...m, plan, progress, executed, awaitingConfirm };
      })
    );
  }, [chats.messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [uiMessages]);

  const ensureConversation = useCallback(async (firstUserMsg?: string) => {
    if (chats.activeId) return chats.activeId;
    const title = firstUserMsg ? firstUserMsg.slice(0, 60) : 'New chat';
    return await chats.createConversation(title);
  }, [chats]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isExecuting) return;
    const convId = await ensureConversation(text);
    if (!convId) { toast({ title: 'Could not start conversation', variant: 'destructive' }); return; }

    setIsLoading(true);
    // Persist user message + auto-rename if default title
    await chats.appendMessage(convId, 'user', text);
    chats.autoRenameIfDefault(convId, text);

    // Optimistic streaming assistant placeholder
    const placeholderId = `tmp-${Date.now()}`;
    setUiMessages((prev) => [...prev, {
      id: placeholderId, conversation_id: convId, role: 'assistant',
      content: '', created_at: new Date().toISOString(),
    }]);

    let assistantContent = '';
    try {
      const history = [...chats.messages, { role: 'user' as const, content: text }]
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-orchestrator`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: history }),
        }
      );
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Request failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantContent += c;
              setUiMessages((prev) => prev.map((m) => m.id === placeholderId ? { ...m, content: assistantContent } : m));
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
      const plan = extractPlan(assistantContent);
      // Persist assistant message with plan in metadata; it shows as "awaiting confirm"
      const persisted = await chats.appendMessage(convId, 'assistant', assistantContent, plan ? { plan } : undefined);
      if (persisted) {
        setUiMessages((prev) => prev.map((m) => m.id === placeholderId
          ? { ...persisted, plan, awaitingConfirm: !!plan && plan.steps.length > 0 }
          : m));
      }
    } catch (e) {
      toast({ title: 'AI error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
      setUiMessages((prev) => prev.filter((m) => m.id !== placeholderId));
    } finally {
      setIsLoading(false);
    }
  };

  const executePlan = async (msgId: string) => {
    const target = uiMessages.find((m) => m.id === msgId);
    if (!target?.plan || isExecuting) return;
    setIsExecuting(true);

    const initial: StepProgress[] = target.plan.steps.map((s) => ({ id: s.id, label: s.label, status: 'pending' }));
    setUiMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, progress: initial, executed: true, awaitingConfirm: false } : m));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-execute`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ steps: target.plan.steps }) }
      );
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Execution failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let finalProgress: StepProgress[] = initial;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line === '') { currentEvent = ''; continue; }
          if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); continue; }
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'step_start') {
              setUiMessages((prev) => prev.map((m) => {
                if (m.id !== msgId || !m.progress) return m;
                const np = m.progress.map((p) => p.id === data.id ? { ...p, status: 'running' as StepStatus } : p);
                finalProgress = np;
                return { ...m, progress: np };
              }));
            } else if (currentEvent === 'step_done') {
              setUiMessages((prev) => prev.map((m) => {
                if (m.id !== msgId || !m.progress) return m;
                const np = m.progress.map((p) => p.id === data.id
                  ? { ...p, status: data.status as StepStatus, result: data.result, error: data.error }
                  : p);
                finalProgress = np;
                return { ...m, progress: np };
              }));
            } else if (currentEvent === 'complete') {
              toast({ title: 'Execution complete', description: `${data.totalSucceeded} ok, ${data.totalFailed} failed` });
            }
          } catch { /* ignore */ }
        }
      }
      // Persist final progress to message metadata
      await supabase.from('ai_messages').update({
        metadata: { plan: target.plan, progress: finalProgress } as never,
      }).eq('id', msgId);
    } catch (e) {
      toast({ title: 'Execution error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelPlan = (msgId: string) => {
    setUiMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, awaitingConfirm: false, plan: undefined } : m));
    toast({ title: 'Plan cancelled' });
  };

  const handleSend = () => { if (input.trim()) { sendMessage(input); setInput(''); } };

  const quickPrompts = [
    "Create 3 teachers and assign them to classes 9-A, 10-A, 11-A (Math, Physics, Chemistry)",
    "Generate 15 dummy students for class 10-A for testing",
    "Post a pinned announcement to class 10-A: 'Parent meeting Friday 2 PM'",
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-5rem)] flex gap-3 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "transition-all duration-300 flex-shrink-0 hidden md:flex flex-col bg-card border border-border rounded-lg overflow-hidden",
          sidebarOpen ? "w-64" : "w-12"
        )}>
          <div className="flex items-center justify-between p-2 border-b border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen((s) => !s)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
            {sidebarOpen && (
              <Button size="sm" variant="outline" onClick={() => chats.createConversation()} className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            )}
          </div>
          {sidebarOpen && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {chats.conversations.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No chats yet</p>
                )}
                {chats.conversations.map((c) => (
                  <div key={c.id} className={cn(
                    "group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm",
                    chats.activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                  )} onClick={() => chats.setActiveId(c.id)}>
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); chats.deleteConversation(c.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </aside>

        {/* Main */}
        <Card className="flex-1 flex flex-col overflow-hidden glass-card border-border">
          <div className="flex flex-row items-center justify-between border-b border-border py-3 px-4">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-primary">AdminCore</span>
              <span className="text-muted-foreground font-normal text-sm hidden sm:inline">// Operations AI</span>
              <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-600 bg-amber-500/10 text-[10px]">
                Plan → Confirm
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen((s) => !s)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
              {uiMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 neon-border flex items-center justify-center mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">AdminCore</h3>
                  <p className="text-muted-foreground mb-6 max-w-md text-sm">
                    Tell me what to do. I'll show a plan first — you confirm before I touch your data.
                  </p>
                  <div className="flex flex-col gap-2 max-w-2xl w-full">
                    {quickPrompts.map((p) => (
                      <Button key={p} variant="outline" className="justify-start text-left h-auto py-2 text-xs"
                        onClick={() => sendMessage(p)}>
                        <Brain className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        <span className="truncate">{p}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {uiMessages.map((m) => (
                    <div key={m.id} className={cn("flex gap-2 sm:gap-3", m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div className={cn("max-w-[88%] sm:max-w-[85%] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 space-y-3",
                        m.role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border')}>
                        {m.role === 'assistant' ? (
                          (() => {
                            const display = stripJsonBlock(m.content);
                            return display ? (
                              <div className="prose prose-sm max-w-none text-foreground leading-relaxed [&_p]:my-1.5 [&_strong]:text-primary [&_code]:text-accent [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-destructive/50 [&_blockquote]:bg-destructive/5 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_blockquote]:rounded">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
                              </div>
                            ) : !m.plan ? (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                              </div>
                            ) : null;
                          })()
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
                        )}

                        {m.plan && m.plan.steps.length > 0 && (
                          <div className={cn("border rounded-lg p-3 space-y-2.5",
                            m.awaitingConfirm ? "border-amber-500/40 bg-amber-500/5" :
                            m.executed ? "border-border bg-background/30" : "border-primary/30 bg-primary/5"
                          )}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                {m.plan.steps.length} step{m.plan.steps.length !== 1 ? 's' : ''}
                              </span>
                              {m.plan.steps.some((s) => DESTRUCTIVE_TYPES.has(s.type)) && (
                                <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5 text-[10px]">
                                  ⚠️ Destructive
                                </Badge>
                              )}
                            </div>
                            <ol className="space-y-1.5">
                              {m.plan.steps.map((s) => {
                                const Icon = STEP_ICONS[s.type] ?? Brain;
                                const prog = m.progress?.find((p) => p.id === s.id);
                                return (
                                  <li key={s.id} className={cn(
                                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 border text-xs",
                                    prog?.status === 'success' ? 'bg-primary/5 border-primary/20' :
                                    prog?.status === 'error' ? 'bg-destructive/5 border-destructive/30' :
                                    prog?.status === 'running' ? 'bg-primary/5 border-primary/30' :
                                    'bg-background/40 border-border/50'
                                  )}>
                                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.id}</span>
                                    {prog?.status === 'running' ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                      : prog?.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                      : prog?.status === 'error' ? <XCircle className="h-3.5 w-3.5 text-destructive" />
                                      : <Icon className="h-3.5 w-3.5 text-primary" />}
                                    <span className="flex-1 truncate text-foreground">{s.label}</span>
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary bg-primary/5">
                                      {STEP_LABELS[s.type] ?? s.type}
                                    </Badge>
                                  </li>
                                );
                              })}
                            </ol>
                            {m.awaitingConfirm && (
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" onClick={() => executePlan(m.id)} disabled={isExecuting} className="flex-1">
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Confirm & Execute
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => cancelPlan(m.id)} disabled={isExecuting}>
                                  Cancel
                                </Button>
                              </div>
                            )}
                            {m.progress && (
                              <div className="text-[10px] text-muted-foreground font-mono pt-1">
                                {m.progress.filter((p) => p.status === 'success').length}/{m.progress.length} done
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {m.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Tell AdminCore what to do…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  rows={1}
                  disabled={isLoading || isExecuting}
                  className="resize-none min-h-[40px] bg-muted/50"
                />
                <Button onClick={handleSend} disabled={isLoading || isExecuting || !input.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
