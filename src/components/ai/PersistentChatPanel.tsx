import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Plus, MessageSquare, Trash2, PanelLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAIChats, type AssistantType } from '@/hooks/useAIChats';
import { toast } from '@/hooks/use-toast';

interface Props {
  assistantType: AssistantType;
  title: string;
  subtitle?: string;
  accent?: 'primary' | 'accent';
  context?: Record<string, unknown>;
  quickPrompts?: string[];
  emptyHeading?: string;
  emptyBody?: string;
  placeholder?: string;
}

/** Reusable persistent AI chat with sidebar, used by Student & Teacher pages. */
export function PersistentChatPanel({
  assistantType,
  title,
  subtitle,
  accent = 'primary',
  context,
  quickPrompts = [],
  emptyHeading = 'Hello!',
  emptyBody = 'Ask me anything to get started.',
  placeholder = 'Type your message…',
}: Props) {
  const chats = useAIChats(assistantType);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleMessages = [...chats.messages, ...localMessages];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats.messages, localMessages, streamingContent]);

  const accentClasses = accent === 'accent'
    ? { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', btn: 'bg-accent text-accent-foreground hover:bg-accent/90' }
    : { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', btn: 'bg-primary text-primary-foreground hover:bg-primary/90' };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    let convId = chats.activeId;
    if (!convId) convId = await chats.createConversation(text.slice(0, 60));

    setIsLoading(true);
    if (convId) {
      await chats.appendMessage(convId, 'user', text);
      chats.autoRenameIfDefault(convId, text);
    } else {
      // Chat history could not be saved — keep the conversation going in this tab.
      setLocalMessages((prev) => [...prev, { id: `local-u-${Date.now()}`, role: 'user', content: text }]);
    }

    const tempId = `tmp-${Date.now()}`;
    setStreamingId(tempId);
    setStreamingContent('');

    try {
      const history = [...visibleMessages, { role: 'user' as const, content: text }]
        .map((m) => ({ role: m.role, content: m.content }));
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edu-ai-assistant`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: history, assistantType, context }),
        }
      );
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
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
            if (c) { assistantContent += c; setStreamingContent(assistantContent); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
      if (convId) {
        await chats.appendMessage(convId, 'assistant', assistantContent || '…');
      } else {
        setLocalMessages((prev) => [...prev, { id: `local-a-${Date.now()}`, role: 'assistant', content: assistantContent || '…' }]);
      }
    } catch (e) {
      toast({ title: 'Chat unavailable', description: e instanceof Error ? e.message : 'Please try again in a moment.', variant: 'destructive' });
    } finally {
      setStreamingId(null);
      setStreamingContent('');
      setIsLoading(false);
    }
  };

  const handleSend = () => { if (input.trim()) { sendMessage(input); setInput(''); } };

  return (
    <div className="h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-5rem)] flex gap-3 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "transition-all duration-300 flex-shrink-0 hidden md:flex flex-col bg-card border border-border rounded-lg overflow-hidden",
        sidebarOpen ? "w-60" : "w-12"
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
                  chats.activeId === c.id ? cn(accentClasses.bg, accentClasses.text) : "hover:bg-muted/60 text-foreground"
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
            <Bot className={cn("h-5 w-5", accentClasses.text)} />
            <span className={accentClasses.text}>{title}</span>
            {subtitle && <span className="text-muted-foreground font-normal text-sm hidden sm:inline">// {subtitle}</span>}
          </div>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSidebarOpen((s) => !s)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
            {visibleMessages.length === 0 && !streamingId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center mb-4", accentClasses.bg, accentClasses.border)}>
                  <Bot className={cn("h-8 w-8", accentClasses.text)} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{emptyHeading}</h3>
                <p className="text-muted-foreground mb-6 max-w-md text-sm">{emptyBody}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                  {quickPrompts.map((p) => (
                    <Button key={p} variant="outline" className="text-left h-auto py-2 text-xs justify-start"
                      onClick={() => sendMessage(p)}>
                      <span className="truncate">{p}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMessages.map((m) => (
                  <ChatBubble key={m.id} role={m.role} content={m.content} accent={accentClasses} />
                ))}
                {streamingId && (
                  <ChatBubble role="assistant" content={streamingContent || '…'} accent={accentClasses} streaming />
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                rows={1}
                disabled={isLoading}
                className="resize-none min-h-[40px] bg-muted/50"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()} className={accentClasses.btn}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatBubble({ role, content, accent, streaming }: {
  role: 'user' | 'assistant';
  content: string;
  accent: { text: string; bg: string; border: string; btn: string };
  streaming?: boolean;
}) {
  return (
    <div className={cn("flex gap-2 sm:gap-3", role === 'user' ? 'justify-end' : 'justify-start')}>
      {role === 'assistant' && (
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0", accent.bg, accent.border)}>
          <Bot className={cn("h-3.5 w-3.5", accent.text, streaming && 'animate-pulse')} />
        </div>
      )}
      <div className={cn("max-w-[88%] sm:max-w-[85%] rounded-xl px-3 sm:px-4 py-2.5",
        role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border')}>
        {role === 'assistant' ? (
          <div className="prose prose-sm max-w-none text-foreground [&_p]:my-1.5 [&_strong]:text-primary [&_code]:text-accent [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
        )}
      </div>
      {role === 'user' && (
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
